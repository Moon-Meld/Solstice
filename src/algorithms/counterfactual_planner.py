"""Counterfactual Minimal-Cost Graph Intervention Planner.

Solves DAG-Constrained Budgeted Submodular Maximization over the Knowledge Graph
to generate a Pareto-Optimal Skill Upgrade Trajectory within preparation time budget.
"""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Set, Tuple

from src.algorithms.topo_reranker import TopoGraphReranker


@dataclass
class BridgeSkillNode:
    """Candidate skill intervention node in the Knowledge Graph."""
    skill_id: str
    name: str
    category: str
    learning_days_cost: float
    prerequisites: List[str] = field(default_factory=list)  # IDs of prerequisite skills
    alignment_weight: float = 1.0                           # Intrinsic relevance to JD
    bridge_action: str = ""                                  # Concrete engineering project action


@dataclass
class ParetoTrajectoryStep:
    """Single step along the Pareto-optimal learning trajectory."""
    step: int
    day_range: str
    skill_name: str
    bridge_action: str
    days_cost: float
    cumulative_days: float
    score_before: float
    score_after: float
    marginal_gain: float
    roi: float

    def to_dict(self) -> Dict[str, Any]:
        return {
            "step": self.step,
            "day_range": self.day_range,
            "skill_name": self.skill_name,
            "bridge_action": self.bridge_action,
            "days_cost": round(self.days_cost, 1),
            "cumulative_days": round(self.cumulative_days, 1),
            "score_before": round(self.score_before, 2),
            "score_after": round(self.score_after, 2),
            "marginal_gain": round(self.marginal_gain, 2),
            "roi": round(self.roi, 3)
        }


# Curated high-impact bridge skills with topological DAG prerequisites
DEFAULT_BRIDGE_CATALOG: List[BridgeSkillNode] = [
    BridgeSkillNode(
        skill_id="skill_state_checkpoint",
        name="Redis Checkpoint Engine",
        category="Reliability",
        learning_days_cost=3.0,
        prerequisites=[],
        alignment_weight=7.5,
        bridge_action="Implement Redis state checkpointing with transactional atomic commit to prevent cyclic loss."
    ),
    BridgeSkillNode(
        skill_id="skill_hybrid_rrf",
        name="Hybrid RRF Reranker",
        category="Retrieval",
        learning_days_cost=4.0,
        prerequisites=["skill_state_checkpoint"],
        alignment_weight=11.2,
        bridge_action="Integrate Reciprocal Rank Fusion (RRF) blending BM25 lexical tokens with dense bge-m3 embeddings."
    ),
    BridgeSkillNode(
        skill_id="skill_circuit_breaker",
        name="Adaptive Circuit Breaker",
        category="Fault Tolerance",
        learning_days_cost=3.0,
        prerequisites=["skill_state_checkpoint"],
        alignment_weight=8.0,
        bridge_action="Deploy circuit breaker tripping at >=2 consecutive guardrail rejections with jittered exponential backoff."
    ),
    BridgeSkillNode(
        skill_id="skill_cross_attention_rerank",
        name="Cross-Attention Re-Ranking",
        category="Deep Learning",
        learning_days_cost=4.0,
        prerequisites=["skill_hybrid_rrf"],
        alignment_weight=12.5,
        bridge_action="Deploy PyTorch RGATv2 cross-attention layer to evaluate multi-hop cognitive skill bridges."
    ),
    BridgeSkillNode(
        skill_id="skill_distributed_trace",
        name="OpenTelemetry Distributed Tracing",
        category="Observability",
        learning_days_cost=2.0,
        prerequisites=[],
        alignment_weight=5.0,
        bridge_action="Instrument agent state transitions with OpenTelemetry spans and trace ID propagation."
    ),
    BridgeSkillNode(
        skill_id="skill_dpo_flywheel",
        name="DPO Flywheel Harvester",
        category="Continuous Learning",
        learning_days_cost=3.5,
        prerequisites=["skill_circuit_breaker"],
        alignment_weight=9.0,
        bridge_action="Harvest rejected-chosen trajectory pairs upon circuit-breaker trip for offline DPO fine-tuning."
    ),
]


class CounterfactualBridgePlanner:
    """DAG-Constrained Budgeted Submodular Maximization Planner for Skill Bridges."""

    def __init__(
        self,
        reranker: Optional[TopoGraphReranker] = None,
        bridge_catalog: Optional[List[BridgeSkillNode]] = None
    ):
        self.reranker = reranker or TopoGraphReranker()
        self.bridge_catalog = {b.skill_id: b for b in (bridge_catalog or DEFAULT_BRIDGE_CATALOG)}

    def evaluate_graph_alignment(
        self,
        active_skill_ids: Set[str],
        target_skills: Set[str],
        base_score: float = 60.0
    ) -> float:
        """Submodular alignment evaluation function with diminishing marginal returns.
        
        Score(S) = Base + sum_{s in S} w_s * (1.0 / (1.0 + 0.08 * cumulative_weight))
        """
        if not active_skill_ids:
            return base_score

        total_gain = 0.0
        cumulative_w = 0.0

        # Sort for deterministic evaluation
        for sid in sorted(list(active_skill_ids)):
            node = self.bridge_catalog.get(sid)
            w = node.alignment_weight if node else 4.0
            # Diminishing marginal returns (concave submodular surrogate)
            marginal = w / (1.0 + 0.05 * cumulative_w)
            total_gain += marginal
            cumulative_w += w

        final_score = min(base_score + total_gain, 98.0)
        return float(final_score)

    def plan_intervention(
        self,
        candidate_existing_skills: Set[str],
        target_jd_skills: Optional[Set[str]] = None,
        max_prep_days: float = 14.0,
        base_score: float = 65.0
    ) -> List[ParetoTrajectoryStep]:
        """Compute the optimal DAG-constrained upgrade trajectory maximizing ROI under max_prep_days.
        
        Args:
            candidate_existing_skills: Initial skills candidate already possesses.
            target_jd_skills: Target skills specified by JD.
            max_prep_days: Total available study/project time budget.
            base_score: Starting alignment score.
            
        Returns:
            trajectory: Ordered sequence of ParetoTrajectoryStep.
        """
        current_skills: Set[str] = set(candidate_existing_skills)
        target_skills: Set[str] = target_jd_skills or {"skill_hybrid_rrf", "skill_cross_attention_rerank"}

        remaining_days = max_prep_days
        cumulative_days = 0.0
        current_score = self.evaluate_graph_alignment(current_skills, target_skills, base_score)

        trajectory: List[ParetoTrajectoryStep] = []
        step_idx = 1

        while remaining_days > 0.0:
            best_candidate: Optional[BridgeSkillNode] = None
            best_roi = -1.0
            best_new_score = current_score
            best_marginal = 0.0

            # Scan all eligible candidates in catalog
            for sid, node in self.bridge_catalog.items():
                if sid in current_skills:
                    continue
                # 1. Budget constraint check
                if node.learning_days_cost > remaining_days:
                    continue
                # 2. DAG prerequisite constraint check: all prereqs must be in current_skills
                prereqs_satisfied = all(p in current_skills for p in node.prerequisites)
                if not prereqs_satisfied:
                    continue

                # 3. Compute marginal gain and ROI
                candidate_set = current_skills | {sid}
                potential_score = self.evaluate_graph_alignment(candidate_set, target_skills, base_score)
                marginal_gain = potential_score - current_score
                roi = marginal_gain / node.learning_days_cost

                if roi > best_roi:
                    best_roi = roi
                    best_candidate = node
                    best_new_score = potential_score
                    best_marginal = marginal_gain

            if best_candidate is None or best_marginal <= 0.0:
                # No further improvements possible within budget or prerequisites
                break

            # Execute intervention step
            cost = best_candidate.learning_days_cost
            day_start = cumulative_days
            day_end = cumulative_days + cost
            day_range = f"Day {int(day_start) + 1}-{int(round(day_end))}"

            step = ParetoTrajectoryStep(
                step=step_idx,
                day_range=day_range,
                skill_name=best_candidate.name,
                bridge_action=f"{best_candidate.bridge_action} (+{best_marginal:.1f}% Match)",
                days_cost=cost,
                cumulative_days=day_end,
                score_before=current_score,
                score_after=best_new_score,
                marginal_gain=best_marginal,
                roi=best_roi
            )
            trajectory.append(step)

            # Update state
            current_skills.add(best_candidate.skill_id)
            current_score = best_new_score
            cumulative_days += cost
            remaining_days -= cost
            step_idx += 1

        return trajectory

    def simulate_random_selection(
        self,
        candidate_existing_skills: Set[str],
        max_prep_days: float = 14.0,
        base_score: float = 65.0,
        seed: int = 42
    ) -> float:
        """Simulate random valid selection respecting budget & DAG to benchmark Pareto ROI."""
        rng = random.Random(seed)
        current_skills = set(candidate_existing_skills)
        remaining_days = max_prep_days
        current_score = base_score

        while remaining_days > 0.0:
            valid_candidates = []
            for sid, node in self.bridge_catalog.items():
                if sid in current_skills or node.learning_days_cost > remaining_days:
                    continue
                if all(p in current_skills for p in node.prerequisites):
                    valid_candidates.append(node)

            if not valid_candidates:
                break

            chosen = rng.choice(valid_candidates)
            current_skills.add(chosen.skill_id)
            remaining_days -= chosen.learning_days_cost

        return self.evaluate_graph_alignment(current_skills, set(), base_score)
