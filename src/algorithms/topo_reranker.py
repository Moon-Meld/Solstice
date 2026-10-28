"""Topology-Aware Graph-Text Cross-Attention Reranker (TopoGraphReranker).

Fuses dense semantic embeddings (bge-m3 compatible) with 2-hop Knowledge Graph
structural encodings via Relational Graph Attention Network v2 (RGATv2) and
Asymmetric Hierarchical Entailment Loss with Order Embedding Cones.
"""

from __future__ import annotations

import hashlib
from typing import Any, Dict, List, Optional, Tuple, Union

import torch
import torch.nn as nn
import torch.nn.functional as F

EDGE_TYPE_MAP: Dict[str, int] = {
    "UTILIZES_TECH": 0,
    "REQUIRES_CONCEPT": 1,
    "BRIDGES_TO": 2,
    "ACHIEVED_OUTCOME": 3,
    "APPLIED_IN": 4,
    "REQUIRES_SKILL": 5,
    "TARGETS_ROLE": 6,
}


class RGATv2Layer(nn.Module):
    """Relational Graph Attention Network v2 layer.
    
    Computes dynamic edge-conditioned attention over directed heterogeneous relations:
        alpha_ij = softmax_j( a^T LeakyReLU( W_q h_j + W_k h_i + W_r r_e ) )
        h_j' = sum_{i in N(j)} alpha_ij * ( W_v h_i + W_r r_e )
    """

    def __init__(
        self,
        in_dim: int,
        out_dim: int,
        num_relations: int = 8,
        rel_dim: int = 32,
        num_heads: int = 4,
        dropout: float = 0.0,
        negative_slope: float = 0.2
    ):
        super().__init__()
        assert out_dim % num_heads == 0, "out_dim must be divisible by num_heads"
        self.in_dim = in_dim
        self.out_dim = out_dim
        self.num_heads = num_heads
        self.head_dim = out_dim // num_heads
        self.negative_slope = negative_slope

        self.rel_embedding = nn.Embedding(num_relations, rel_dim)

        self.lin_q = nn.Linear(in_dim, out_dim, bias=False)
        self.lin_k = nn.Linear(in_dim, out_dim, bias=False)
        self.lin_v = nn.Linear(in_dim, out_dim, bias=False)
        self.lin_r = nn.Linear(rel_dim, out_dim, bias=False)

        self.att = nn.Parameter(torch.empty(1, num_heads, self.head_dim))
        self.bias = nn.Parameter(torch.zeros(out_dim))
        self.dropout = nn.Dropout(dropout)
        self.layer_norm = nn.LayerNorm(out_dim)

        nn.init.xavier_uniform_(self.att)
        nn.init.xavier_uniform_(self.lin_q.weight)
        nn.init.xavier_uniform_(self.lin_k.weight)
        nn.init.xavier_uniform_(self.lin_v.weight)
        nn.init.xavier_uniform_(self.lin_r.weight)

    def forward(
        self,
        h: torch.Tensor,
        edge_index: torch.Tensor,
        edge_type: torch.Tensor
    ) -> torch.Tensor:
        """
        Args:
            h: Node representations (N, in_dim).
            edge_index: Graph adjacency (2, E) where edge_index[0]=source, edge_index[1]=target.
            edge_type: Edge relation indices (E,).
        Returns:
            Updated node representations (N, out_dim).
        """
        num_nodes = h.size(0)
        num_edges = edge_index.size(1) if edge_index.numel() > 0 else 0

        if num_edges == 0:
            # Isolated graph fallback
            out = self.lin_v(h)
            return self.layer_norm(h + F.relu(out + self.bias))

        src, dst = edge_index[0], edge_index[1]

        # Project features into multi-head shape (N, H, D_head)
        q = self.lin_q(h).view(num_nodes, self.num_heads, self.head_dim)
        k = self.lin_k(h).view(num_nodes, self.num_heads, self.head_dim)
        v = self.lin_v(h).view(num_nodes, self.num_heads, self.head_dim)

        # Relation projections (E, H, D_head)
        rel_emb = self.rel_embedding(edge_type)
        r = self.lin_r(rel_emb).view(num_edges, self.num_heads, self.head_dim)

        # Query for target, Key for source, plus relation
        q_dst = q[dst]  # (E, H, D_head)
        k_src = k[src]  # (E, H, D_head)
        v_src = v[src]  # (E, H, D_head)

        # GATv2 relational score
        pre_att = F.leaky_relu(q_dst + k_src + r, negative_slope=self.negative_slope)
        alpha = (pre_att * self.att).sum(dim=-1)  # (E, H)

        # Numerically stable segmented softmax per destination node
        # Compute max per target node for stability
        max_alpha = torch.zeros(num_nodes, self.num_heads, device=h.device, dtype=h.dtype)
        max_alpha.scatter_reduce_(0, dst.unsqueeze(1).expand(-1, self.num_heads), alpha, reduce="amax", include_self=False)
        alpha_exp = torch.exp(alpha - max_alpha[dst])

        sum_alpha = torch.zeros(num_nodes, self.num_heads, device=h.device, dtype=h.dtype)
        sum_alpha.scatter_add_(0, dst.unsqueeze(1).expand(-1, self.num_heads), alpha_exp)
        alpha_norm = alpha_exp / (sum_alpha[dst] + 1e-8)  # (E, H)
        alpha_norm = self.dropout(alpha_norm)

        # Message aggregation: alpha_norm * (v_src + r)
        messages = alpha_norm.unsqueeze(-1) * (v_src + r)  # (E, H, D_head)
        messages = messages.view(num_edges, self.out_dim)

        out = torch.zeros(num_nodes, self.out_dim, device=h.device, dtype=h.dtype)
        out.scatter_add_(0, dst.unsqueeze(1).expand(-1, self.out_dim), messages)

        out = out + self.bias
        # Residual + LayerNorm
        if h.size(-1) == self.out_dim:
            out = self.layer_norm(h + F.relu(out))
        else:
            out = self.layer_norm(F.relu(out))
        return out


class AsymmetricHierarchyLoss(nn.Module):
    """Asymmetric Hierarchical Entailment Cone Loss.
    
    Enforces that specific child skills (e.g. LangGraph) entail parent concepts
    (e.g. Deterministic State Machine), incurring zero cone penalty, while
    general parent concepts fail to entail specific child frameworks.
    
    Cone energy:
        E_cone(u, v) = || max(0, z_v - z_u) ||_2^2
    """

    def __init__(self, margin: float = 1.0, neg_weight: float = 1.0):
        super().__init__()
        self.margin = margin
        self.neg_weight = neg_weight

    def energy(self, z_u: torch.Tensor, z_v: torch.Tensor) -> torch.Tensor:
        """Compute cone energy. If u entails v, then z_u >= z_v coordinate-wise, so energy is 0."""
        violation = torch.clamp(z_v - z_u, min=0.0)
        return torch.sum(violation ** 2, dim=-1)

    def forward(
        self,
        z_child: torch.Tensor,
        z_parent: torch.Tensor,
        z_neg_u: Optional[torch.Tensor] = None,
        z_neg_v: Optional[torch.Tensor] = None
    ) -> torch.Tensor:
        """Compute asymmetric hierarchical loss.
        
        Args:
            z_child: Representations of child skills (u).
            z_parent: Representations of parent concepts (v).
            z_neg_u: Non-entailing or reversed candidate representations.
            z_neg_v: Non-entailing or reversed target representations.
        """
        # Positive pairs: child -> parent should have zero energy
        pos_energy = self.energy(z_child, z_parent)
        pos_loss = torch.mean(pos_energy)

        if z_neg_u is not None and z_neg_v is not None:
            neg_energy = self.energy(z_neg_u, z_neg_v)
            neg_loss = torch.mean(torch.clamp(self.margin - neg_energy, min=0.0))
            return pos_loss + self.neg_weight * neg_loss

        # Default self-contrastive: reversed pair parent -> child should incur margin penalty
        rev_energy = self.energy(z_parent, z_child)
        rev_loss = torch.mean(torch.clamp(self.margin - rev_energy, min=0.0))
        return pos_loss + self.neg_weight * rev_loss


class TopoGraphReranker(nn.Module):
    """Topology-Aware Graph-Text Cross-Attention Reranker.
    
    Combines:
    1. Text Semantic Projection (BGE-M3 / dense embedding space).
    2. 2-hop Relational GATv2 for Knowledge Graph structural representation.
    3. Multi-Head Cross-Attention (Query = text, Key/Value = graph nodes).
    4. Asymmetric Order Embedding Cone Penalty Head.
    """

    def __init__(
        self,
        d_text: int = 1024,
        d_node: int = 128,
        d_model: int = 128,
        d_cone: int = 64,
        num_relations: int = 8,
        num_heads: int = 4,
        dropout: float = 0.1,
        cone_gamma: float = 0.5
    ):
        super().__init__()
        self.d_text = d_text
        self.d_node = d_node
        self.d_model = d_model
        self.d_cone = d_cone
        self.cone_gamma = cone_gamma

        # Text projection
        self.text_proj = nn.Sequential(
            nn.Linear(d_text, d_model),
            nn.LayerNorm(d_model),
            nn.GELU()
        )

        # Graph node projection
        self.node_proj = nn.Sequential(
            nn.Linear(d_node, d_model),
            nn.LayerNorm(d_model)
        )

        # 2-layer RGATv2
        self.rgat1 = RGATv2Layer(d_model, d_model, num_relations=num_relations, num_heads=num_heads, dropout=dropout)
        self.rgat2 = RGATv2Layer(d_model, d_model, num_relations=num_relations, num_heads=num_heads, dropout=dropout)

        # Multi-Head Cross Attention: Query = Text, Key/Value = Graph
        self.cross_attn = nn.MultiheadAttention(embed_dim=d_model, num_heads=num_heads, batch_first=True)
        self.post_attn_norm = nn.LayerNorm(d_model)

        # Asymmetric Order Embedding Cone Projection
        # Coordinates must be non-negative in order cone space
        self.cone_proj = nn.Sequential(
            nn.Linear(d_model, d_cone),
            nn.ReLU()
        )

        # Final Alignment Scoring Head
        self.score_head = nn.Sequential(
            nn.Linear(d_model * 3, d_model),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(d_model, 1)
        )

    def encode_graph(
        self,
        node_feats: torch.Tensor,
        edge_index: torch.Tensor,
        edge_type: torch.Tensor
    ) -> torch.Tensor:
        """Encode graph structure using 2-layer RGATv2."""
        h = self.node_proj(node_feats)
        h = self.rgat1(h, edge_index, edge_type)
        h = self.rgat2(h, edge_index, edge_type)
        return h

    def compute_cone_energy(self, z_cand: torch.Tensor, z_jd: torch.Tensor) -> torch.Tensor:
        """Compute directional cone penalty: || max(0, z_jd - z_cand) ||_2^2."""
        violation = torch.clamp(z_jd - z_cand, min=0.0)
        return torch.sum(violation ** 2, dim=-1)

    def forward(
        self,
        h_cand_text: torch.Tensor,
        h_jd_text: torch.Tensor,
        node_feats: torch.Tensor,
        edge_index: torch.Tensor,
        edge_type: torch.Tensor
    ) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        """Forward pass computing fused alignment and cone penalties.
        
        Args:
            h_cand_text: Candidate text dense embedding (B, d_text).
            h_jd_text: Target JD text dense embedding (B, d_text).
            node_feats: Subgraph node feature matrix (N, d_node).
            edge_index: Adjacency (2, E).
            edge_type: Edge relation types (E,).
            
        Returns:
            final_score: Alignment score in [0.0, 1.0] tensor of shape (B,).
            base_score: Semantic cross-attention score in [0.0, 1.0] of shape (B,).
            cone_penalty: Directional hierarchy penalty tensor of shape (B,).
        """
        batch_size = h_cand_text.size(0)

        # 1. Project text representations: (B, 1, d_model)
        cand_t = self.text_proj(h_cand_text).unsqueeze(1)
        jd_t = self.text_proj(h_jd_text).unsqueeze(1)

        # 2. Encode 2-hop topological Knowledge Graph: (N, d_model)
        h_graph = self.encode_graph(node_feats, edge_index, edge_type)
        h_graph_batched = h_graph.unsqueeze(0).expand(batch_size, -1, -1)

        # 3. Cross-Attention: Query = Text, Key/Value = Graph
        cand_fused, _ = self.cross_attn(query=cand_t, key=h_graph_batched, value=h_graph_batched)
        cand_fused = self.post_attn_norm(cand_t + cand_fused).squeeze(1)  # (B, d_model)

        jd_fused, _ = self.cross_attn(query=jd_t, key=h_graph_batched, value=h_graph_batched)
        jd_fused = self.post_attn_norm(jd_t + jd_fused).squeeze(1)  # (B, d_model)

        # 4. Map into Asymmetric Order Cone Space
        z_cand = self.cone_proj(cand_fused)  # (B, d_cone)
        z_jd = self.cone_proj(jd_fused)      # (B, d_cone)

        # Cone energy: if candidate skill entails JD requirement, penalty is 0
        cone_penalty = self.compute_cone_energy(z_cand, z_jd)  # (B,)

        # 5. Base matching score via fused cross-modal features
        interaction = torch.cat([cand_fused, jd_fused, torch.abs(cand_fused - jd_fused)], dim=-1)
        base_logits = self.score_head(interaction).squeeze(-1)  # (B,)
        base_score = torch.sigmoid(base_logits)

        # 6. Hybrid Alignment Score: Gated fusion with exponential cone penalty
        final_score = base_score * torch.exp(-self.cone_gamma * cone_penalty)

        return final_score, base_score, cone_penalty

    # --------------------------------------------------------------------------
    # Deterministic Helper for Runtime Integration
    # --------------------------------------------------------------------------
    @staticmethod
    def text_to_embedding(text: str, dim: int = 1024) -> torch.Tensor:
        """Deterministic pseudo-embedding for text when neural backbone is offline."""
        vec = torch.zeros(dim, dtype=torch.float32)
        words = text.lower().split()
        if not words:
            return vec.unsqueeze(0)
        for w in words:
            h = int(hashlib.sha256(w.encode("utf-8")).hexdigest(), 16)
            idx = h % dim
            sign = 1.0 if (h >> 8) % 2 == 0 else -1.0
            vec[idx] += sign
        norm = torch.norm(vec, p=2)
        if norm > 1e-6:
            vec = vec / norm
        return vec.unsqueeze(0)

    @classmethod
    def graph_to_tensors(
        cls,
        graph_data: Dict[str, Any],
        d_node: int = 128,
        device: torch.device = torch.device("cpu")
    ) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor, Dict[str, int]]:
        """Converts user graph dict (nodes & edges) into PyTorch tensors."""
        nodes = graph_data.get("nodes", [])
        edges = graph_data.get("edges", [])

        node_id_to_idx: Dict[str, int] = {}
        for idx, n in enumerate(nodes):
            nid = n.get("id") or n.get("name") or str(idx)
            node_id_to_idx[nid] = idx

        num_nodes = max(len(nodes), 1)
        node_feats = torch.zeros((num_nodes, d_node), dtype=torch.float32, device=device)

        for nid, idx in node_id_to_idx.items():
            # Hash-based deterministic feature initialization
            h = int(hashlib.md5(nid.encode("utf-8")).hexdigest(), 16)
            for j in range(d_node):
                node_feats[idx, j] = ((h >> (j % 32)) & 1) * 2.0 - 1.0
            node_feats[idx] = F.normalize(node_feats[idx], p=2, dim=0)

        edge_indices: List[List[int]] = [[], []]
        edge_types: List[int] = []

        for e in edges:
            src = e.get("source")
            dst = e.get("target")
            rel = e.get("relation", "BRIDGES_TO")
            if src in node_id_to_idx and dst in node_id_to_idx:
                src_idx = node_id_to_idx[src]
                dst_idx = node_id_to_idx[dst]
                rel_idx = EDGE_TYPE_MAP.get(rel, 2)
                edge_indices[0].append(src_idx)
                edge_indices[1].append(dst_idx)
                edge_types.append(rel_idx)

        if not edge_indices[0]:
            # Add self-loops if empty
            edge_index = torch.zeros((2, 0), dtype=torch.long, device=device)
            edge_type = torch.zeros((0,), dtype=torch.long, device=device)
        else:
            edge_index = torch.tensor(edge_indices, dtype=torch.long, device=device)
            edge_type = torch.tensor(edge_types, dtype=torch.long, device=device)

        return node_feats, edge_index, edge_type, node_id_to_idx

    def predict_alignment(
        self,
        candidate_text: Union[str, torch.Tensor],
        jd_text: Union[str, torch.Tensor],
        graph_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, float]:
        """High-level evaluation method producing alignment metrics in [0, 100]."""
        self.eval()
        with torch.no_grad():
            if isinstance(candidate_text, str):
                h_cand = self.text_to_embedding(candidate_text, dim=self.d_text)
            else:
                h_cand = candidate_text

            if isinstance(jd_text, str):
                h_jd = self.text_to_embedding(jd_text, dim=self.d_text)
            else:
                h_jd = jd_text

            if graph_data is None:
                graph_data = {
                    "nodes": [{"id": "node_0", "name": "Concept"}],
                    "edges": []
                }

            node_feats, edge_index, edge_type, _ = self.graph_to_tensors(graph_data, d_node=self.d_node)
            final_score, base_score, cone_penalty = self.forward(
                h_cand, h_jd, node_feats, edge_index, edge_type
            )

            score_val = float(final_score.squeeze().item()) * 100.0
            base_val = float(base_score.squeeze().item()) * 100.0
            penalty_val = float(cone_penalty.squeeze().item())

            return {
                "alignment_score": round(min(max(score_val, 0.0), 100.0), 2),
                "base_score": round(base_val, 2),
                "cone_penalty": round(penalty_val, 4)
            }
