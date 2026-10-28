"""LangGraph StateGraph assembly for Solstice multi-agent platform."""

from __future__ import annotations

import uuid
from typing import Any, Dict, Optional
from langgraph.graph import StateGraph, START, END

from src.config import settings
from src.agents.nodes import SolsticeNodes
from src.state import SolsticeState


def create_initial_state(
    user_message: str,
    session_id: Optional[str] = None,
    raw_resume_text: Optional[str] = None,
    raw_jd_text: Optional[str] = None,
    current_phase: str = "ORCHESTRATOR",
    interviewer_persona: Optional[str] = None,
    probe_depth: int = 1,
    user_profile_graph: Optional[Dict[str, Any]] = None,
    target_jd_context: Optional[Dict[str, Any]] = None,
    guardrail_retries: int = 0
) -> SolsticeState:
    """Create a fully-initialized SolsticeState dictionary."""
    return SolsticeState(
        session_id=session_id or f"sess_{uuid.uuid4().hex[:8]}",
        user_message=user_message,
        raw_resume_text=raw_resume_text,
        raw_jd_text=raw_jd_text,
        current_phase=current_phase,  # type: ignore
        trigger_kg_extraction=bool(raw_resume_text and not user_profile_graph),
        rag_search_queries=[],
        interviewer_persona=interviewer_persona,  # type: ignore
        probe_depth=probe_depth,
        user_profile_graph=user_profile_graph or {"nodes": [], "edges": [], "missing_ground_truth_flags": []},
        target_jd_context=target_jd_context or {"chunks": [], "bridge_paths": []},
        draft_artifacts={},
        anti_ai_audit={"passed": True, "cliche_detected": [], "hallucinated_metrics": [], "rewrite_instruction": ""},
        guardrail_retries=guardrail_retries,
        final_response=""
    )


def route_after_orchestrator(state: SolsticeState) -> str:
    """Conditional edge from Node 1: route to KG Extractor if raw input, else directly to atelier."""
    if state.get("trigger_kg_extraction", False):
        return "kg_extractor"

    target = state.get("current_phase", "CONSTELLATION")
    if target == "SELF_PORTRAIT":
        return "self_portrait"
    elif target == "THE_REHEARSAL":
        return "the_rehearsal"
    elif target == "ODYSSEY":
        return "odyssey"
    return "constellation"


def route_after_kg_extractor(state: SolsticeState) -> str:
    """Conditional edge from Node 2: route to active atelier after graph ingestion."""
    target = state.get("current_phase", "CONSTELLATION")
    if target == "SELF_PORTRAIT":
        return "self_portrait"
    elif target == "THE_REHEARSAL":
        return "the_rehearsal"
    elif target == "ODYSSEY":
        return "odyssey"
    return "constellation"


def route_after_guardrail(state: SolsticeState) -> str:
    """Conditional edge from Node 6: pass to Odyssey, or trigger rollback loop with circuit-breaker."""
    audit = state.get("anti_ai_audit", {})
    passed = audit.get("passed", True)
    retries = state.get("guardrail_retries", 0)

    if passed:
        return "odyssey"

    # Circuit breaker: max_guardrail_retries
    if retries >= settings.max_guardrail_retries:
        return "odyssey"

    # Roll back to generating atelier
    phase = state.get("current_phase", "SELF_PORTRAIT")
    if phase == "CONSTELLATION":
        return "constellation"
    elif phase == "THE_REHEARSAL":
        return "the_rehearsal"
    else:
        return "self_portrait"


def build_solstice_graph(nodes: Optional[SolsticeNodes] = None):
    """Build and compile the deterministic Solstice LangGraph StateGraph."""
    solstice_nodes = nodes or SolsticeNodes()
    workflow = StateGraph(SolsticeState)

    # 1. Add all 7 deterministic nodes
    workflow.add_node("orchestrator", solstice_nodes.orchestrator_node)
    workflow.add_node("kg_extractor", solstice_nodes.kg_extractor_node)
    workflow.add_node("constellation", solstice_nodes.constellation_node)
    workflow.add_node("self_portrait", solstice_nodes.self_portrait_node)
    workflow.add_node("the_rehearsal", solstice_nodes.rehearsal_node)
    workflow.add_node("anti_ai_guardrail", solstice_nodes.anti_ai_guardrail_node)
    workflow.add_node("odyssey", solstice_nodes.odyssey_synthesizer_node)

    # 2. Add edges
    # START -> orchestrator
    workflow.add_edge(START, "orchestrator")

    # Orchestrator conditional router
    workflow.add_conditional_edges(
        "orchestrator",
        route_after_orchestrator,
        {
            "kg_extractor": "kg_extractor",
            "constellation": "constellation",
            "self_portrait": "self_portrait",
            "the_rehearsal": "the_rehearsal",
            "odyssey": "odyssey"
        }
    )

    # KG Extractor conditional router
    workflow.add_conditional_edges(
        "kg_extractor",
        route_after_kg_extractor,
        {
            "constellation": "constellation",
            "self_portrait": "self_portrait",
            "the_rehearsal": "the_rehearsal",
            "odyssey": "odyssey"
        }
    )

    # Ateliers all feed into Anti-AI Guardrail
    workflow.add_edge("constellation", "anti_ai_guardrail")
    workflow.add_edge("self_portrait", "anti_ai_guardrail")
    workflow.add_edge("the_rehearsal", "anti_ai_guardrail")

    # Guardrail conditional router: Odyssey OR Rollback Loop with Circuit Breaker
    workflow.add_conditional_edges(
        "anti_ai_guardrail",
        route_after_guardrail,
        {
            "odyssey": "odyssey",
            "constellation": "constellation",
            "self_portrait": "self_portrait",
            "the_rehearsal": "the_rehearsal"
        }
    )

    # Odyssey -> END
    workflow.add_edge("odyssey", END)

    return workflow.compile()
