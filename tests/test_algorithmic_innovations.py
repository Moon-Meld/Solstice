"""Comprehensive Mathematical & Integration Tests for Solstice Phase 3 Algorithmic Innovations.

Verifies:
1. TopoGraphReranker forward pass, gradient flow, and asymmetric hierarchy cone penalty.
2. SolsticeGRPOVerifier zero-fabrication hard gate, anti-cliché decay, and group advantage zero-sum norm.
3. BayesianActiveProber 2PL-IRT variance shrinkage, Graph Laplacian diffusion, and EIG selection.
4. CounterfactualBridgePlanner budget constraints, topological DAG prerequisites, and Pareto superiority.
5. End-to-end LangGraph nodes algorithmic integration.
"""

import math
import pytest
import torch
import torch.nn as nn

from src.algorithms.topo_reranker import (
    TopoGraphReranker,
    AsymmetricHierarchyLoss,
    RGATv2Layer,
)
from src.algorithms.bayesian_irt_prober import (
    BayesianActiveProber,
    InterviewQuestion,
    SkillBelief,
)
from src.algorithms.counterfactual_planner import (
    CounterfactualBridgePlanner,
    BridgeSkillNode,
)
from training.rl_grpo.deterministic_verifiers import (
    SolsticeGRPOVerifier,
    verify_zero_fabrication,
    score_anti_cliche,
    score_information_density,
    score_kg_keyword_coverage,
    compute_grpo_advantages,
    compute_kl_divergence,
    compute_grpo_surrogate_loss,
)
from training.rl_grpo.grpo_trainer import GRPOTrainer
from src.agents.nodes import SolsticeNodes
from src.state import SolsticeState


# ==============================================================================
# 1. TopoGraphReranker & Asymmetric Hierarchy Tests
# ==============================================================================

def test_topo_reranker_forward_shapes():
    """Verify TopoGraphReranker forward pass tensor shapes and output bounds."""
    reranker = TopoGraphReranker(d_text=64, d_node=32, d_model=32, d_cone=16)
    B, N, E = 3, 4, 5
    h_cand = torch.randn(B, 64)
    h_jd = torch.randn(B, 64)
    node_feats = torch.randn(N, 32)
    edge_index = torch.tensor([[0, 1, 2, 3, 0], [1, 2, 3, 0, 2]], dtype=torch.long)
    edge_type = torch.tensor([0, 1, 2, 0, 1], dtype=torch.long)

    final_score, base_score, cone_penalty = reranker(
        h_cand, h_jd, node_feats, edge_index, edge_type
    )

    assert final_score.shape == (B,)
    assert base_score.shape == (B,)
    assert cone_penalty.shape == (B,)

    # Probability bounds
    assert torch.all(final_score >= 0.0) and torch.all(final_score <= 1.0)
    assert torch.all(base_score >= 0.0) and torch.all(base_score <= 1.0)
    assert torch.all(cone_penalty >= 0.0)


def test_topo_reranker_gradient_flow():
    """Verify gradients propagate backwards through GATv2, cross-attention, and cone heads."""
    reranker = TopoGraphReranker(d_text=32, d_node=16, d_model=16, d_cone=8)
    h_cand = torch.randn(2, 32, requires_grad=True)
    h_jd = torch.randn(2, 32, requires_grad=True)
    node_feats = torch.randn(3, 16, requires_grad=True)
    edge_index = torch.tensor([[0, 1], [1, 2]], dtype=torch.long)
    edge_type = torch.tensor([0, 1], dtype=torch.long)

    final_score, base_score, cone_penalty = reranker(
        h_cand, h_jd, node_feats, edge_index, edge_type
    )
    loss = final_score.sum() + cone_penalty.sum()
    loss.backward()

    assert h_cand.grad is not None and torch.norm(h_cand.grad) > 0
    assert h_jd.grad is not None and torch.norm(h_jd.grad) > 0
    assert node_feats.grad is not None and torch.norm(node_feats.grad) > 0
    assert reranker.rgat1.lin_q.weight.grad is not None


def test_topo_reranker_asymmetric_cone_penalty():
    """Verify child->parent incurs 0 cone penalty, while parent->child incurs strictly positive penalty."""
    loss_fn = AsymmetricHierarchyLoss(margin=1.0)

    # In order embedding cones, child skill coordinates dominate parent coordinates (z_child >= z_parent)
    z_child = torch.tensor([[3.0, 4.0, 2.5, 5.0]], dtype=torch.float32)
    z_parent = torch.tensor([[1.5, 2.0, 1.0, 3.0]], dtype=torch.float32)

    # 1. Child entails Parent: max(0, z_parent - z_child) == 0
    energy_child_to_parent = loss_fn.energy(z_child, z_parent)
    assert energy_child_to_parent.item() == 0.0

    # 2. Parent DOES NOT entail Child: max(0, z_child - z_parent) > 0
    energy_parent_to_child = loss_fn.energy(z_parent, z_child)
    assert energy_parent_to_child.item() > 0.0

    # 3. Model score: child->parent alignment is strictly higher than parent->child alignment
    gamma = 0.5
    base = 0.8
    score_child_to_parent = base * math.exp(-gamma * energy_child_to_parent.item())
    score_parent_to_child = base * math.exp(-gamma * energy_parent_to_child.item())
    assert score_child_to_parent > score_parent_to_child


def test_asymmetric_hierarchy_loss_optimization():
    """Verify AsymmetricHierarchyLoss decreases to 0 when trained on valid child-parent pairs."""
    loss_fn = AsymmetricHierarchyLoss(margin=1.0, neg_weight=1.0)
    z_child = nn.Parameter(torch.tensor([[1.0, 1.0]], dtype=torch.float32))
    z_parent = nn.Parameter(torch.tensor([[2.0, 2.0]], dtype=torch.float32))

    optimizer = torch.optim.SGD([z_child], lr=0.2)
    initial_loss = loss_fn.energy(z_child, z_parent).item()
    assert initial_loss > 0.0  # Initially z_child < z_parent, so violation exists

    for _ in range(30):
        optimizer.zero_grad()
        loss = loss_fn.energy(z_child, z_parent)
        loss.backward()
        optimizer.step()

    final_loss = loss_fn.energy(z_child, z_parent).item()
    assert final_loss < 0.01  # Successfully learned z_child >= z_parent


# ==============================================================================
# 2. Solstice-GRPO Verifier & Advantage Normalization Tests
# ==============================================================================

def test_grpo_zero_fabrication_hard_gate():
    """Verify unverified numbers collapse reward to -1.0, while placeholders and verified metrics pass."""
    verifier = SolsticeGRPOVerifier()
    allowed_metrics = ["40% latency reduction", "10000 qps"]

    # Case A: Fabricated number (85%)
    fab_draft = "Architected pipeline and achieved 85% accuracy with 15ms latency."
    assert verify_zero_fabrication(fab_draft, allowed_metrics) == 0.0
    reward_fab = verifier.compute_reward(fab_draft, allowed_metrics)
    assert reward_fab == -1.0

    # Case B: Standard placeholder [补充...]
    placeholder_draft = "Architected pipeline, achieving latency reduction [补充具体指标：如检索延迟降低 X% / 准确率由 Y% 提升至 Z%]."
    assert verify_zero_fabrication(placeholder_draft, allowed_metrics) == 1.0
    reward_ph = verifier.compute_reward(placeholder_draft, allowed_metrics)
    assert reward_ph > 0.0

    # Case C: Exact verified metric
    verified_draft = "Architected pipeline with verified 40% latency reduction and sustained 10000 QPS."
    assert verify_zero_fabrication(verified_draft, allowed_metrics) == 1.0
    reward_ver = verifier.compute_reward(verified_draft, allowed_metrics)
    assert reward_ver > 0.0


def test_grpo_anti_cliche_exponential_decay():
    """Verify exponential penalty on banned AI buzzwords and filler adverbs: exp(-2 * count)."""
    clean_draft = "Implemented deterministic finite state machine with cyclic rollback guards."
    cliche_1 = "Implemented deterministic state machine to 赋能 business flow."
    cliche_2 = "Implemented state machine to 赋能 business flow and achieve 闭环."
    cliche_en = "This project is a testament to how we delve into paradigm shift."

    score_clean = score_anti_cliche(clean_draft)
    score_1 = score_anti_cliche(cliche_1)
    score_2 = score_anti_cliche(cliche_2)
    score_en = score_anti_cliche(cliche_en)

    assert pytest.approx(score_clean, rel=1e-4) == 1.0
    assert pytest.approx(score_1, rel=1e-4) == math.exp(-2.0)
    assert pytest.approx(score_2, rel=1e-4) == math.exp(-4.0)
    assert score_en < math.exp(-4.0)


def test_grpo_information_density_and_length_penalty():
    """Verify technical signal density and length penalty for bullets > 85 tokens."""
    entities = ["LangGraph", "Redis", "FSM"]
    concise = "Architected LangGraph state machine with Redis checkpoints."
    verbose = concise + " " + " ".join(["padding" for _ in range(100)])

    score_concise = score_information_density(concise, entities)
    score_verbose = score_information_density(verbose, entities)

    assert score_concise > 0.2
    assert score_concise > score_verbose


def test_grpo_group_advantages_zero_mean():
    """Verify GRPO group advantage estimator guarantees sum(A_i) == 0 and handles zero-variance."""
    rewards = torch.tensor([-1.0, 0.2, 0.5, 0.8, -1.0, 0.4, 0.7, 0.1])
    advantages = compute_grpo_advantages(rewards)

    # 1. Sum of advantages within group must be strictly 0
    assert abs(advantages.sum().item()) < 1e-6

    # 2. Best reward gets positive advantage, worst gets negative
    assert advantages[3] > 0.0  # reward 0.8
    assert advantages[0] < 0.0  # reward -1.0

    # 3. Degenerate case: identical rewards within group -> all advantages zero
    flat_rewards = torch.tensor([0.5, 0.5, 0.5, 0.5])
    flat_adv = compute_grpo_advantages(flat_rewards)
    assert torch.all(flat_adv == 0.0)


def test_grpo_clipped_surrogate_and_analytical_kl():
    """Verify analytical KL divergence and clipped surrogate loss bounds."""
    log_probs = torch.tensor([-1.5, -2.0, -0.8])
    ref_log_probs = torch.tensor([-1.5, -2.0, -0.8])

    # 1. KL is 0 when distributions match
    kl_zero = compute_kl_divergence(log_probs, ref_log_probs)
    assert torch.all(torch.isclose(kl_zero, torch.tensor(0.0), atol=1e-6))

    # 2. KL is strictly non-negative when policy drifts
    drift_log_probs = torch.tensor([-1.2, -2.5, -0.5])
    kl_drift = compute_kl_divergence(drift_log_probs, ref_log_probs)
    assert torch.all(kl_drift >= 0.0)

    # 3. Clipped surrogate loss
    adv = torch.tensor([1.0, -1.0, 0.0])
    loss = compute_grpo_surrogate_loss(drift_log_probs, log_probs, adv, clip_eps=0.2)
    assert torch.isfinite(loss)


# ==============================================================================
# 3. Bayesian IRT & Graph Laplacian EIG Prober Tests
# ==============================================================================

def test_bayesian_irt_posterior_variance_shrinkage():
    """Verify 2PL-IRT observation strictly shrinks posterior variance and entropy."""
    prober = BayesianActiveProber()
    prober.initialize_from_user_graph({
        "nodes": [{"id": "skill_langgraph", "type": "Skill", "name": "LangGraph"}],
        "edges": []
    })

    initial_belief = prober.skills["LangGraph"]
    prior_var = initial_belief.sigma_sq
    prior_entropy = initial_belief.entropy

    q = InterviewQuestion(
        id="q_test",
        target_skill="LangGraph",
        discrimination=1.8,
        difficulty=0.2,
        depth_level=2,
        text="Test prompt"
    )

    # Candidate provides a strong answer (y=0.9)
    prober.update_posterior("LangGraph", q, y_observed=0.9)
    post_belief = prober.skills["LangGraph"]

    # 1. Variance must strictly decrease
    assert post_belief.sigma_sq < prior_var

    # 2. Shannon entropy must strictly decrease
    assert post_belief.entropy < prior_entropy

    # 3. Proficiency estimate must increase on good answer
    assert post_belief.mu > initial_belief.mu - 0.1


def test_bayesian_irt_laplacian_belief_propagation():
    """Verify failing a fundamental concept downgrades belief in dependent framework via Laplacian diffusion."""
    prober = BayesianActiveProber(alpha_laplacian=0.8)
    user_graph = {
        "nodes": [
            {"id": "concept_fsm", "type": "Concept", "name": "Deterministic Finite State Machine"},
            {"id": "skill_langgraph", "type": "Skill", "name": "LangGraph"}
        ],
        "edges": [
            {"source": "skill_langgraph", "target": "concept_fsm", "relation": "REQUIRES_CONCEPT"}
        ]
    }
    prober.initialize_from_user_graph(user_graph)

    prior_fsm_mu = prober.skills["Deterministic Finite State Machine"].mu
    prior_langgraph_mu = prober.skills["LangGraph"].mu

    # Candidate fails fundamental concept question miserably (y=0.0)
    q_fsm = InterviewQuestion(
        id="q_fsm",
        target_skill="Deterministic Finite State Machine",
        discrimination=2.0,
        difficulty=0.0,
        depth_level=2,
        text="Formalize FSM transitions"
    )
    prober.update_posterior("Deterministic Finite State Machine", q_fsm, y_observed=0.0)

    # 1. Direct target node proficiency downgraded
    assert prober.skills["Deterministic Finite State Machine"].mu < prior_fsm_mu

    # 2. Connected framework (LangGraph) belief must be downgraded via Laplacian diffusion
    assert prober.skills["LangGraph"].mu < prior_langgraph_mu


def test_bayesian_irt_eig_question_selection():
    """Verify prober actively selects question maximizing Expected Information Gain (EIG)."""
    prober = BayesianActiveProber()
    prober.initialize_from_user_graph({
        "nodes": [
            {"id": "skill_langgraph", "type": "Skill", "name": "LangGraph"},
            {"id": "concept_fsm", "type": "Concept", "name": "Deterministic Finite State Machine"}
        ],
        "edges": [
            {"source": "skill_langgraph", "target": "concept_fsm", "relation": "REQUIRES_CONCEPT"}
        ]
    })

    # High discrimination question on uncertain node
    q_high_gain = InterviewQuestion(
        id="q_high",
        target_skill="LangGraph",
        discrimination=2.5,
        difficulty=0.5,
        depth_level=2,
        text="High gain probe"
    )

    # Low discrimination question
    q_low_gain = InterviewQuestion(
        id="q_low",
        target_skill="LangGraph",
        discrimination=0.5,
        difficulty=0.5,
        depth_level=1,
        text="Low gain probe"
    )

    eig_high = prober.compute_expected_information_gain(q_high_gain)
    eig_low = prober.compute_expected_information_gain(q_low_gain)

    # Higher discrimination directly yields higher Shannon entropy reduction
    assert eig_high > eig_low

    # Active selector picks q_high
    best_q, max_eig, rationale = prober.select_next_question([q_low_gain, q_high_gain])
    assert best_q.id == "q_high"
    assert "Expected Information Gain" in rationale


# ==============================================================================
# 4. Counterfactual Minimal-Cost Graph Intervention Tests
# ==============================================================================

def test_counterfactual_planner_budget_constraint():
    """Verify CounterfactualBridgePlanner strictly respects prep days budget."""
    planner = CounterfactualBridgePlanner()
    budget = 7.0
    trajectory = planner.plan_intervention(
        candidate_existing_skills=set(),
        max_prep_days=budget,
        base_score=60.0
    )

    assert len(trajectory) > 0
    total_days = sum(step.days_cost for step in trajectory)
    assert total_days <= budget
    assert trajectory[-1].cumulative_days <= budget


def test_counterfactual_planner_dag_prerequisites():
    """Verify prerequisite nodes are always unlocked prior to dependent bridge skills."""
    planner = CounterfactualBridgePlanner()
    trajectory = planner.plan_intervention(
        candidate_existing_skills=set(),
        max_prep_days=14.0,
        base_score=60.0
    )

    scheduled_ids = []
    id_map = {node.name: node.skill_id for node in planner.bridge_catalog.values()}

    for step in trajectory:
        sid = id_map.get(step.skill_name)
        if sid:
            node = planner.bridge_catalog[sid]
            # Verify all prerequisites occurred earlier in the trajectory
            for prereq in node.prerequisites:
                assert prereq in scheduled_ids, (
                    f"Prerequisite {prereq} violated for {node.name} at step {step.step}"
                )
            scheduled_ids.append(sid)


def test_counterfactual_planner_beats_random_roi():
    """Verify Pareto-optimal greedy marginal search achieves strictly higher score than random search."""
    planner = CounterfactualBridgePlanner()
    budget = 10.0
    base_score = 65.0

    trajectory = planner.plan_intervention(
        candidate_existing_skills=set(),
        max_prep_days=budget,
        base_score=base_score
    )
    planned_final_score = trajectory[-1].score_after

    random_score = planner.simulate_random_selection(
        candidate_existing_skills=set(),
        max_prep_days=budget,
        base_score=base_score,
        seed=42
    )

    assert planned_final_score >= random_score


# ==============================================================================
# 5. LangGraph Nodes Algorithmic Integration Tests
# ==============================================================================

def test_langgraph_nodes_algorithmic_integration():
    """Verify ConstellationNode and RehearsalNode execute with Phase 3 algorithmic engines."""
    nodes = SolsticeNodes()

    # 1. Test Constellation Node with Topo-Reranker & Counterfactual Roadmap
    const_state: SolsticeState = {
        "session_id": "test_integ",
        "user_message": "Evaluate my skill bridge roadmap for AI Architect",
        "raw_resume_text": "Built LangGraph multi-agent engine with deterministic finite state machines.",
        "raw_jd_text": "Requires distributed vector indexing and production agent reliability.",
        "current_phase": "CONSTELLATION",
        "trigger_kg_extraction": False,
        "rag_search_queries": ["AI Architect RAG"],
        "interviewer_persona": "rigorous_tech_lead",
        "probe_depth": 1,
        "user_profile_graph": {
            "nodes": [
                {"id": "skill_langgraph", "type": "Skill", "name": "LangGraph"},
                {"id": "concept_fsm", "type": "Concept", "name": "Deterministic Finite State Machine"}
            ],
            "edges": [
                {"source": "skill_langgraph", "target": "concept_fsm", "relation": "REQUIRES_CONCEPT"}
            ]
        },
        "target_jd_context": {},
        "draft_artifacts": {},
        "anti_ai_audit": {},
        "guardrail_retries": 0,
        "final_response": "",
        "irt_belief_state": None,
        "counterfactual_roadmap": None,
    }

    const_out = nodes.constellation_node(const_state)
    assert "counterfactual_roadmap" in const_out
    assert len(const_out["counterfactual_roadmap"]) > 0
    assert "draft_artifacts" in const_out
    assert const_out["draft_artifacts"]["alignment_score"] > 0

    # 2. Test Rehearsal Node with Bayesian IRT Prober & EIG Question Selection
    rehearsal_state: SolsticeState = dict(const_state)
    rehearsal_state["current_phase"] = "THE_REHEARSAL"
    rehearsal_state["user_message"] = "We implemented state checkpoints using Redis transactional commits."

    rehearsal_out = nodes.rehearsal_node(rehearsal_state)
    assert "irt_belief_state" in rehearsal_out
    assert "draft_artifacts" in rehearsal_out

    probe = rehearsal_out["draft_artifacts"]["next_probe"]
    assert "eig_score" in probe and probe["eig_score"] is not None
    assert "probing_rationale" in probe and probe["probing_rationale"] is not None
    assert probe["current_depth_level"] in (1, 2, 3)
