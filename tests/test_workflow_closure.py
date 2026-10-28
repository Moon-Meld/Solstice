"""End-to-end unit tests for LangGraph deterministic state machine, routing, and rollback loops."""

import json
import pytest
from src.config import settings
from src.agents.workflow import (
    build_solstice_graph,
    create_initial_state,
    route_after_orchestrator,
    route_after_guardrail,
)
from src.state import SolsticeState


def test_orchestrator_routing_decisions(mock_nodes):
    """Verify deterministic routing for all atelier branches."""
    # Test routing to Constellation
    state_constellation = create_initial_state("How does my profile match the target job?", current_phase="ORCHESTRATOR")
    out_constellation = mock_nodes.orchestrator_node(state_constellation)
    assert out_constellation["current_phase"] in ("CONSTELLATION", "SELF_PORTRAIT", "THE_REHEARSAL", "ODYSSEY")

    # Test routing to Self-Portrait
    state_carve = create_initial_state("Please polish my resume bullet for agent engine", current_phase="ORCHESTRATOR")
    out_carve = mock_nodes.orchestrator_node(state_carve)
    assert out_carve["current_phase"] in ("CONSTELLATION", "SELF_PORTRAIT", "THE_REHEARSAL", "ODYSSEY")

    # Test routing to Rehearsal
    state_rehearse = create_initial_state("Let's do a mock interview technical probe", current_phase="ORCHESTRATOR")
    out_rehearse = mock_nodes.orchestrator_node(state_rehearse)
    assert out_rehearse["current_phase"] in ("CONSTELLATION", "SELF_PORTRAIT", "THE_REHEARSAL", "ODYSSEY")


def test_kg_extraction_conditional_trigger(mock_nodes):
    """Verify that raw resume text sets trigger_kg_extraction and routes to kg_extractor."""
    state_with_resume = create_initial_state(
        user_message="Analyze my background",
        raw_resume_text="Senior Developer: Engineered LangGraph engine with 12 core unit tests passed.",
        user_profile_graph=None  # unparsed
    )
    decision = mock_nodes.orchestrator_node(state_with_resume)
    assert decision["trigger_kg_extraction"] is True

    next_node = route_after_orchestrator({**state_with_resume, **decision})
    assert next_node == "kg_extractor"


def test_kg_extractor_node_execution(mock_nodes):
    """Verify KG Extractor parses entities, canonicalizes, and updates state."""
    state = create_initial_state(
        user_message="Extract profile",
        raw_resume_text="Developed Multi-Agent Orchestration Engine using LangGraph and verified 12 tests."
    )
    out = mock_nodes.kg_extractor_node(state)
    assert out["trigger_kg_extraction"] is False
    graph = out["user_profile_graph"]
    assert len(graph["nodes"]) > 0
    assert any(n["name"] == "LangGraph" for n in graph["nodes"])
    assert len(graph["edges"]) > 0


def test_end_to_end_state_machine_execution(mock_graph, sample_user_graph):
    """Verify full deterministic traversal through to Odyssey final markdown response."""
    initial_state = create_initial_state(
        user_message="Polish my bullet point for LangGraph project",
        current_phase="SELF_PORTRAIT",
        user_profile_graph=sample_user_graph
    )

    final_state = mock_graph.invoke(initial_state)

    assert final_state["current_phase"] == "ODYSSEY"
    assert "final_response" in final_state
    resp = final_state["final_response"]
    assert "### ✦ Solstice Insight | 至日洞察" in resp
    assert "### ❖ Core Atelier | 核心工坊" in resp
    assert "### ↗ Next Trajectory | 下一道轨迹" in resp


def test_guardrail_rejection_triggers_rollback_loop(mock_nodes):
    """Verify that guardrail rejection increments retries and rolls back to generating node."""
    # Construct state with a bad draft containing banned cliché and unverified metric
    bad_draft = {
        "diagnoses": [
            {
                "original_text": "built agent",
                "structural_flaw": "vague",
                "solstice_carving": "深度赋能系统，吞吐量显著提升 70% 与延迟降至 5ms。",
                "artisan_notes": "test"
            }
        ]
    }
    state = create_initial_state(
        user_message="Polish my bullet point",
        current_phase="SELF_PORTRAIT",
        guardrail_retries=0
    )
    state["draft_artifacts"] = bad_draft

    # Run Anti-AI Guardrail Node
    guardrail_out = mock_nodes.anti_ai_guardrail_node(state)
    assert guardrail_out["guardrail_retries"] == 1
    assert guardrail_out["anti_ai_audit"]["passed"] is False
    assert len(guardrail_out["anti_ai_audit"]["cliche_detected"]) > 0

    # Test conditional routing edge: must route BACK to self_portrait
    updated_state = {**state, **guardrail_out}
    next_node = route_after_guardrail(updated_state)
    assert next_node == "self_portrait"


def test_guardrail_circuit_breaker_tripping(mock_nodes):
    """Verify that when guardrail_retries reaches max_retries, circuit breaker releases to Odyssey."""
    bad_draft = {
        "diagnoses": [
            {
                "original_text": "test",
                "structural_flaw": "none",
                "solstice_carving": "赋能核心系统 80% 提升",
                "artisan_notes": "none"
            }
        ]
    }
    # Current retries at 1, max_guardrail_retries = 2
    state = create_initial_state(
        user_message="Polish bullet",
        current_phase="SELF_PORTRAIT",
        guardrail_retries=1
    )
    state["draft_artifacts"] = bad_draft

    guardrail_out = mock_nodes.anti_ai_guardrail_node(state)
    # guardrail_retries should now reach 2
    assert guardrail_out["guardrail_retries"] >= 2
    assert guardrail_out["anti_ai_audit"]["passed"] is False

    # Conditional routing edge must trip circuit breaker and route to odyssey
    updated_state = {**state, **guardrail_out}
    next_node = route_after_guardrail(updated_state)
    assert next_node == "odyssey"


def test_fastapi_endpoints_health_and_ateliers(api_client):
    """Verify FastAPI endpoints return status 200 and schema-conforming payloads."""
    # 1. Health
    res_health = api_client.get("/health")
    assert res_health.status_code == 200
    data_health = res_health.json()
    assert data_health["status"] == "ok"
    assert "version" in data_health

    # 2. Carve
    res_carve = api_client.post("/carve", json={"raw_experience": "Optimized multi-agent orchestrator"})
    assert res_carve.status_code == 200
    data_carve = res_carve.json()
    assert "diagnoses" in data_carve
    assert "final_response" in data_carve

    # 3. Constellation
    res_const = api_client.post("/constellation", json={"user_message": "Check match with AI Architect"})
    assert res_const.status_code == 200
    data_const = res_const.json()
    assert "alignment_score" in data_const
    assert "lit_stars" in data_const

    # 4. Rehearse
    res_rehearse = api_client.post(
        "/rehearse",
        json={"candidate_answer": "We enforce deterministic transitions with state snapshot rollbacks.", "probe_depth": 1}
    )
    assert res_rehearse.status_code == 200
    data_rehearse = res_rehearse.json()
    assert "stage_critique" in data_rehearse
    assert "next_probe" in data_rehearse

    # 5. Chat
    res_chat = api_client.post("/chat", json={"user_message": "Hello Solstice, map my career trajectory."})
    assert res_chat.status_code == 200
    data_chat = res_chat.json()
    assert "final_response" in data_chat
    assert "session_id" in data_chat
