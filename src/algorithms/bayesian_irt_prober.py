"""Bayesian IRT & Expected Information Gain Active Interview Prober.

Powers Node 5 (The Rehearsal) with:
1. 2-Parameter Logistic Item Response Theory (2PL-IRT) proficiency modeling:
   theta_k ~ N(mu_k, sigma_k^2)
2. Graph Laplacian Belief Propagation: S = (I + alpha * L)^(-1)
3. Shannon Entropy Reduction / Expected Information Gain (EIG) Question Selector.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Set, Tuple

import numpy as np


@dataclass
class SkillBelief:
    """Psychometric proficiency belief distribution over a Knowledge Graph skill node."""
    skill_id: str
    name: str
    mu: float = 0.0          # Estimated proficiency mean
    sigma_sq: float = 1.0    # Posterior variance (uncertainty)
    is_project_backed: bool = False

    @property
    def sigma(self) -> float:
        return math.sqrt(max(self.sigma_sq, 1e-6))

    @property
    def entropy(self) -> float:
        """Differential Shannon entropy H(theta) = 0.5 * ln(2 * pi * e * sigma^2)."""
        return 0.5 * math.log(2.0 * math.pi * math.e * max(self.sigma_sq, 1e-6))

    def to_dict(self) -> Dict[str, float]:
        return {
            "mu": round(self.mu, 4),
            "sigma": round(self.sigma, 4),
            "sigma_sq": round(self.sigma_sq, 4),
            "entropy": round(self.entropy, 4)
        }


@dataclass
class InterviewQuestion:
    """Calibrated psychometric interview item."""
    id: str
    target_skill: str
    discrimination: float  # a_q in [0.5, 2.5]
    difficulty: float      # b_q in [-2.0, 2.0]
    depth_level: int       # 1 = Surface, 2 = Trade-offs, 3 = Edge-case / Failure recovery
    text: str
    category: str = "Architecture"


# Default Question Bank Calibrated with IRT Parameters
DEFAULT_QUESTION_BANK: List[InterviewQuestion] = [
    InterviewQuestion(
        id="q_langgraph_d1",
        target_skill="LangGraph",
        discrimination=1.2,
        difficulty=-1.0,
        depth_level=1,
        text="How do you define nodes, state schemas, and conditional routing edges in your LangGraph workflow?"
    ),
    InterviewQuestion(
        id="q_langgraph_d2",
        target_skill="LangGraph",
        discrimination=1.8,
        difficulty=0.2,
        depth_level=2,
        text="When designing state persistence in LangGraph, what architectural trade-offs exist between memory checkpoints and external distributed key-value backends?"
    ),
    InterviewQuestion(
        id="q_langgraph_d3",
        target_skill="LangGraph",
        discrimination=2.4,
        difficulty=1.6,
        depth_level=3,
        text="Under concurrent multi-turn requests, how does your LangGraph engine prevent cyclic graph oscillation and guarantee deterministic rollback invariants?"
    ),
    InterviewQuestion(
        id="q_fsm_d1",
        target_skill="Deterministic Finite State Machine",
        discrimination=1.1,
        difficulty=-1.2,
        depth_level=1,
        text="What are the mathematical formalisms (states, transitions, inputs) defining a deterministic finite automaton?"
    ),
    InterviewQuestion(
        id="q_fsm_d2",
        target_skill="Deterministic Finite State Machine",
        discrimination=1.9,
        difficulty=0.5,
        depth_level=2,
        text="How do you handle unrecoverable error transitions in a hierarchical state machine without polluting the global state context?"
    ),
    InterviewQuestion(
        id="q_fsm_d3",
        target_skill="Deterministic Finite State Machine",
        discrimination=2.2,
        difficulty=1.7,
        depth_level=3,
        text="How do you formally verify deadlock freedom and liveness in distributed state machine replication protocols?"
    ),
    InterviewQuestion(
        id="q_rag_d1",
        target_skill="Hybrid Reranking",
        discrimination=1.0,
        difficulty=-0.8,
        depth_level=1,
        text="What is the conceptual difference between lexical BM25 retrieval and dense vector semantic search?"
    ),
    InterviewQuestion(
        id="q_rag_d2",
        target_skill="Hybrid Reranking",
        discrimination=1.7,
        difficulty=0.4,
        depth_level=2,
        text="Why does Reciprocal Rank Fusion (RRF) provide score calibration advantages over linear weighted rank combination?"
    ),
    InterviewQuestion(
        id="q_rag_d3",
        target_skill="Hybrid Reranking",
        discrimination=2.3,
        difficulty=1.5,
        depth_level=3,
        text="In high-throughput multi-modal RAG systems, how do you mitigate cross-encoder re-ranking latency bottlenecks while preserving Recall@10?"
    ),
]


class BayesianActiveProber:
    """Active Interview Prober using 2PL-IRT and Graph Laplacian Belief Propagation."""

    def __init__(
        self,
        questions: Optional[List[InterviewQuestion]] = None,
        alpha_laplacian: float = 0.5,
        min_variance: float = 0.05
    ):
        self.question_bank: List[InterviewQuestion] = list(questions or DEFAULT_QUESTION_BANK)
        self.alpha_laplacian = alpha_laplacian
        self.min_variance = min_variance

        # Skill graph structures
        self.skills: Dict[str, SkillBelief] = {}
        self.adjacency: Dict[str, Set[str]] = {}
        self.skill_index: Dict[str, int] = {}
        self.index_to_skill: Dict[int, str] = {}
        self.asked_question_ids: Set[str] = set()

    # --------------------------------------------------------------------------
    # Graph & Belief State Initialization
    # --------------------------------------------------------------------------
    def initialize_from_user_graph(self, user_graph: Dict[str, Any]) -> None:
        """Initialize skill prior beliefs and topology from user Knowledge Graph."""
        nodes = user_graph.get("nodes", [])
        edges = user_graph.get("edges", [])

        # Collect project-backed skills
        project_skills: Set[str] = set()
        for edge in edges:
            rel = edge.get("relation")
            if rel in ("UTILIZES_TECH", "ACHIEVED_OUTCOME", "APPLIED_IN"):
                target = edge.get("target", "")
                project_skills.add(target.lower())

        self.skills.clear()
        self.adjacency.clear()

        # Build skill nodes
        for node in nodes:
            nid = node.get("id") or node.get("name", "")
            name = node.get("name") or nid
            ntype = node.get("type", "")
            if ntype in ("Skill", "Concept", "Framework") or not ntype:
                is_backed = (nid.lower() in project_skills or name.lower() in project_skills)
                prior_mu = 0.5 if is_backed else 0.0
                self.skills[name] = SkillBelief(
                    skill_id=nid,
                    name=name,
                    mu=prior_mu,
                    sigma_sq=1.0,
                    is_project_backed=is_backed
                )
                self.adjacency[name] = set()

        # Ensure default skills exist if empty
        if not self.skills:
            for s_name in ["LangGraph", "Deterministic Finite State Machine", "Hybrid Reranking"]:
                self.skills[s_name] = SkillBelief(
                    skill_id=f"skill_{s_name.lower().replace(' ', '_')}",
                    name=s_name,
                    mu=0.5,
                    sigma_sq=1.0,
                    is_project_backed=True
                )
                self.adjacency[s_name] = set()

        # Map edges
        id_to_name: Dict[str, str] = {}
        for n in nodes:
            id_to_name[n.get("id", "")] = n.get("name") or n.get("id", "")

        for edge in edges:
            src = id_to_name.get(edge.get("source", ""), edge.get("source", ""))
            dst = id_to_name.get(edge.get("target", ""), edge.get("target", ""))
            if src in self.skills and dst in self.skills:
                self.adjacency[src].add(dst)
                self.adjacency[dst].add(src)

        # Indexing for Laplacian matrix
        skill_names = sorted(list(self.skills.keys()))
        self.skill_index = {name: i for i, name in enumerate(skill_names)}
        self.index_to_skill = {i: name for i, name in enumerate(skill_names)}

    def export_belief_state(self) -> Dict[str, Dict[str, float]]:
        """Export current beliefs as JSON-serializable dict for SolsticeState."""
        return {name: b.to_dict() for name, b in self.skills.items()}

    def load_belief_state(self, state_dict: Dict[str, Dict[str, float]]) -> None:
        """Load beliefs from SolsticeState."""
        for name, vals in state_dict.items():
            if name in self.skills:
                self.skills[name].mu = float(vals.get("mu", 0.0))
                self.skills[name].sigma_sq = float(vals.get("sigma_sq", vals.get("sigma", 1.0) ** 2))

    # --------------------------------------------------------------------------
    # 2PL-IRT Likelihood and Laplace Approximation
    # --------------------------------------------------------------------------
    @staticmethod
    def irt_probability(theta: float, a: float, b: float) -> float:
        """2PL-IRT response function: P(y=1 | theta) = 1 / (1 + exp(-a * (theta - b)))."""
        z = a * (theta - b)
        z = max(min(z, 20.0), -20.0)
        return 1.0 / (1.0 + math.exp(-z))

    def _build_smoothing_matrix(self) -> np.ndarray:
        """Compute Graph Laplacian smoothing operator S = (I + alpha * L)^(-1)."""
        N = len(self.skills)
        if N <= 1:
            return np.eye(max(N, 1))

        A = np.zeros((N, N), dtype=np.float64)
        for u, neighbors in self.adjacency.items():
            if u not in self.skill_index:
                continue
            i = self.skill_index[u]
            for v in neighbors:
                if v in self.skill_index:
                    j = self.skill_index[v]
                    A[i, j] = 1.0
                    A[j, i] = 1.0

        degrees = np.sum(A, axis=1)
        # Symmetrically normalized Laplacian: L = I - D^(-1/2) A D^(-1/2)
        deg_inv_sqrt = np.zeros(N)
        for i in range(N):
            if degrees[i] > 0:
                deg_inv_sqrt[i] = 1.0 / math.sqrt(degrees[i])
            else:
                deg_inv_sqrt[i] = 1.0

        D_inv = np.diag(deg_inv_sqrt)
        L_sym = np.eye(N) - D_inv @ A @ D_inv

        # Regularized diffusion matrix S = (I + alpha * L)^(-1)
        M = np.eye(N) + self.alpha_laplacian * L_sym
        try:
            S = np.linalg.inv(M)
        except np.linalg.LinAlgError:
            S = np.eye(N)
        return S

    # --------------------------------------------------------------------------
    # Posterior Belief Update
    # --------------------------------------------------------------------------
    def update_posterior(
        self,
        target_skill: str,
        question: InterviewQuestion,
        y_observed: float
    ) -> Dict[str, SkillBelief]:
        """Update proficiency posterior for target skill and propagate across KG.
        
        Args:
            target_skill: Name of target skill node.
            question: Interview item with (a_q, b_q).
            y_observed: Evaluated score in [0.0, 1.0].
        """
        # Fallback match skill name if needed
        skill = self._find_matching_skill(target_skill)
        if not skill:
            return self.skills

        prior_mu = skill.mu
        prior_var = skill.sigma_sq

        # 1. 2PL-IRT Laplace update on target node
        a_q = question.discrimination
        b_q = question.difficulty
        p_q = self.irt_probability(prior_mu, a_q, b_q)

        # Fisher Information: I = a_q^2 * p_q * (1 - p_q)
        fisher_info = (a_q ** 2) * p_q * (1.0 - p_q)
        post_var = 1.0 / ((1.0 / prior_var) + fisher_info)
        post_var = max(post_var, self.min_variance)

        # MAP shift: mu_new = mu_prior + post_var * a_q * (y - p_q)
        delta_target_mu = post_var * a_q * (y_observed - p_q)
        delta_target_var = prior_var - post_var  # > 0

        # 2. Propagate through Graph Laplacian Smoothing S
        if len(self.skills) > 1 and skill.name in self.skill_index:
            S = self._build_smoothing_matrix()
            k_idx = self.skill_index[skill.name]

            # Propagate mean shift
            delta_vec_mu = np.zeros(len(self.skills))
            delta_vec_mu[k_idx] = delta_target_mu
            prop_mu = S @ delta_vec_mu

            # Propagate variance reduction
            delta_vec_var = np.zeros(len(self.skills))
            delta_vec_var[k_idx] = delta_target_var
            prop_var = S @ delta_vec_var

            for idx, s_name in self.index_to_skill.items():
                node = self.skills[s_name]
                node.mu += float(prop_mu[idx])
                node.sigma_sq = max(node.sigma_sq - float(prop_var[idx]), self.min_variance)
        else:
            skill.mu += delta_target_mu
            skill.sigma_sq = post_var

        self.asked_question_ids.add(question.id)
        return self.skills

    # --------------------------------------------------------------------------
    # Active Question Selection via Expected Information Gain (EIG)
    # --------------------------------------------------------------------------
    def compute_expected_information_gain(
        self,
        question: InterviewQuestion
    ) -> float:
        """Compute Shannon Entropy Reduction / EIG across the 2-hop skill neighborhood.
        
        EIG(q) = H(Theta) - E_y[ H(Theta | y, q) ]
               = 0.5 * sum_j ln( sigma_{j, prior}^2 / sigma_{j, post}^2 )
        """
        skill = self._find_matching_skill(question.target_skill)
        if not skill:
            return 0.0

        a_q = question.discrimination
        b_q = question.difficulty
        p_q = self.irt_probability(skill.mu, a_q, b_q)

        # Fisher Information
        fisher_info = (a_q ** 2) * p_q * (1.0 - p_q)
        post_target_var = 1.0 / ((1.0 / skill.sigma_sq) + fisher_info)
        delta_target_var = skill.sigma_sq - post_target_var

        if len(self.skills) <= 1 or skill.name not in self.skill_index:
            # Single-node entropy reduction
            ratio = skill.sigma_sq / max(post_target_var, 1e-6)
            return 0.5 * math.log(max(ratio, 1.0))

        S = self._build_smoothing_matrix()
        k_idx = self.skill_index[skill.name]

        # Propagated variance reductions
        delta_vec = np.zeros(len(self.skills))
        delta_vec[k_idx] = delta_target_var
        prop_var_reduction = S @ delta_vec

        eig = 0.0
        # Sum over 2-hop neighborhood of target skill
        neighborhood = self._get_2hop_neighborhood(skill.name)
        for s_name in neighborhood:
            if s_name in self.skill_index:
                idx = self.skill_index[s_name]
                cur_var = self.skills[s_name].sigma_sq
                new_var = max(cur_var - prop_var_reduction[idx], self.min_variance)
                ratio = cur_var / new_var
                eig += 0.5 * math.log(max(ratio, 1.0))

        return float(eig)

    def select_next_question(
        self,
        candidate_questions: Optional[List[InterviewQuestion]] = None,
        filter_asked: bool = True
    ) -> Tuple[InterviewQuestion, float, str]:
        """Select question q* maximizing Expected Information Gain.
        
        Returns:
            best_question: InterviewQuestion item.
            max_eig: Shannon entropy reduction value.
            rationale: Mathematical explanation for active probing choice.
        """
        candidates = list(candidate_questions or self.question_bank)
        if filter_asked:
            available = [q for q in candidates if q.id not in self.asked_question_ids]
            if not available:
                available = candidates
        else:
            available = candidates

        best_q = available[0]
        max_eig = -1.0

        for q in available:
            eig = self.compute_expected_information_gain(q)
            if eig > max_eig:
                max_eig = eig
                best_q = q

        skill = self._find_matching_skill(best_q.target_skill)
        cur_sigma = skill.sigma if skill else 1.0
        rationale = (
            f"Active Bayesian IRT selected '{best_q.id}' (target: {best_q.target_skill}, "
            f"a_q={best_q.discrimination:.1f}, b_q={best_q.difficulty:+.1f}) yielding maximal "
            f"Expected Information Gain (EIG={max_eig:.4f} nats) targeting node uncertainty "
            f"(sigma={cur_sigma:.2f})."
        )
        return best_q, max_eig, rationale

    # --------------------------------------------------------------------------
    # Helpers
    # --------------------------------------------------------------------------
    def _find_matching_skill(self, target_name: str) -> Optional[SkillBelief]:
        """Find matching skill belief by exact or substring match."""
        if target_name in self.skills:
            return self.skills[target_name]
        for name, b in self.skills.items():
            if target_name.lower() in name.lower() or name.lower() in target_name.lower():
                return b
        # If not found, create on-the-fly
        new_skill = SkillBelief(
            skill_id=f"skill_{target_name.lower().replace(' ', '_')}",
            name=target_name,
            mu=0.0,
            sigma_sq=1.0,
            is_project_backed=False
        )
        self.skills[target_name] = new_skill
        self.adjacency[target_name] = set()
        self.skill_index[target_name] = len(self.skills) - 1
        self.index_to_skill[len(self.skills) - 1] = target_name
        return new_skill

    def _get_2hop_neighborhood(self, root: str) -> Set[str]:
        """Collect all skill names within 2 hops in KG."""
        visited: Set[str] = {root}
        one_hop = self.adjacency.get(root, set())
        visited.update(one_hop)
        for neighbor in one_hop:
            visited.update(self.adjacency.get(neighbor, set()))
        return visited
