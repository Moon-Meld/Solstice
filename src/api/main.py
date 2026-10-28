"""FastAPI Application for Solstice AI Career & Internship Multi-Agent Platform."""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from src import __version__
from src.config import settings
from src.agents.nodes import SolsticeNodes
from src.agents.workflow import build_solstice_graph, create_initial_state

# Application Lifecycle & Core Singletons
app = FastAPI(
    title="Solstice (至日) API",
    description="Artistic, Industrial-Grade AI Career Multi-Agent Platform",
    version=__version__,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Shared graph instance
solstice_nodes = SolsticeNodes()
solstice_graph = build_solstice_graph(solstice_nodes)


# ==============================================================================
# Request / Response Schemas
# ==============================================================================

class ChatRequest(BaseModel):
    user_message: str
    session_id: Optional[str] = None
    raw_resume_text: Optional[str] = None
    raw_jd_text: Optional[str] = None
    interviewer_persona: Optional[str] = None
    current_phase: Optional[str] = "ORCHESTRATOR"


class ChatResponse(BaseModel):
    session_id: str
    current_phase: str
    final_response: str
    draft_artifacts: Dict[str, Any]
    anti_ai_audit: Dict[str, Any]
    guardrail_retries: int


class CarveRequest(BaseModel):
    raw_experience: str
    session_id: Optional[str] = None
    raw_resume_text: Optional[str] = None


class CarveResponse(BaseModel):
    session_id: str
    diagnoses: List[Dict[str, Any]]
    final_response: str
    anti_ai_audit: Dict[str, Any]


class ConstellationRequest(BaseModel):
    session_id: Optional[str] = None
    user_message: Optional[str] = "Evaluate job fit and 2-hop skill bridges"
    raw_resume_text: Optional[str] = None
    raw_jd_text: Optional[str] = None


class ConstellationResponse(BaseModel):
    session_id: str
    alignment_score: int
    constellation_summary: str
    lit_stars: List[Dict[str, Any]]
    unlit_stars_and_bridges: List[Dict[str, Any]]
    final_response: str


class RehearseRequest(BaseModel):
    candidate_answer: str
    session_id: Optional[str] = None
    interviewer_persona: Optional[str] = "rigorous_tech_lead"
    probe_depth: Optional[int] = 1


class RehearseResponse(BaseModel):
    session_id: str
    stage_critique: Dict[str, Any]
    next_probe: Dict[str, Any]
    final_response: str


class HealthResponse(BaseModel):
    status: str
    version: str
    use_finetuned_slm: bool
    frontier_model: str
    vector_store_documents: int
    flywheel_log_path: str


# ==============================================================================
# Endpoints
# ==============================================================================

@app.get("/health", response_model=HealthResponse)
def health_check():
    """Health status and configuration inspection."""
    return HealthResponse(
        status="ok",
        version=__version__,
        use_finetuned_slm=settings.use_finetuned_slm,
        frontier_model=settings.frontier_model,
        vector_store_documents=len(solstice_nodes.vector_store.documents),
        flywheel_log_path=str(settings.get_flywheel_path()),
    )


@app.post("/chat", response_model=ChatResponse)
def chat_endpoint(req: ChatRequest):
    """General conversation dispatcher executing the full LangGraph deterministic state machine."""
    try:
        initial_state = create_initial_state(
            user_message=req.user_message,
            session_id=req.session_id,
            raw_resume_text=req.raw_resume_text,
            raw_jd_text=req.raw_jd_text,
            current_phase=req.current_phase or "ORCHESTRATOR",
            interviewer_persona=req.interviewer_persona,
        )
        final_state = solstice_graph.invoke(initial_state)

        return ChatResponse(
            session_id=final_state["session_id"],
            current_phase=final_state["current_phase"],
            final_response=final_state["final_response"],
            draft_artifacts=final_state.get("draft_artifacts", {}),
            anti_ai_audit=final_state.get("anti_ai_audit", {}),
            guardrail_retries=final_state.get("guardrail_retries", 0),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Solstice execution error: {str(e)}")


@app.post("/carve", response_model=CarveResponse)
def carve_endpoint(req: CarveRequest):
    """Direct STAR-L Resume Carving atelier endpoint."""
    try:
        initial_state = create_initial_state(
            user_message=req.raw_experience,
            session_id=req.session_id,
            raw_resume_text=req.raw_resume_text or req.raw_experience,
            current_phase="SELF_PORTRAIT",
        )
        final_state = solstice_graph.invoke(initial_state)
        draft = final_state.get("draft_artifacts", {})

        return CarveResponse(
            session_id=final_state["session_id"],
            diagnoses=draft.get("diagnoses", []),
            final_response=final_state["final_response"],
            anti_ai_audit=final_state.get("anti_ai_audit", {}),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Carving error: {str(e)}")


@app.post("/constellation", response_model=ConstellationResponse)
def constellation_endpoint(req: ConstellationRequest):
    """Constellation 2-Hop Graph Matching & Cognitive Leap endpoint."""
    try:
        initial_state = create_initial_state(
            user_message=req.user_message or "Compute constellation alignment",
            session_id=req.session_id,
            raw_resume_text=req.raw_resume_text,
            raw_jd_text=req.raw_jd_text,
            current_phase="CONSTELLATION",
        )
        final_state = solstice_graph.invoke(initial_state)
        draft = final_state.get("draft_artifacts", {})

        return ConstellationResponse(
            session_id=final_state["session_id"],
            alignment_score=draft.get("alignment_score", 80),
            constellation_summary=draft.get("constellation_summary", ""),
            lit_stars=draft.get("lit_stars", []),
            unlit_stars_and_bridges=draft.get("unlit_stars_and_bridges", []),
            final_response=final_state["final_response"],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Constellation error: {str(e)}")


@app.post("/rehearse", response_model=RehearseResponse)
def rehearse_endpoint(req: RehearseRequest):
    """3-Layer Deep-Dive Rehearsal stage mock interview endpoint."""
    try:
        initial_state = create_initial_state(
            user_message=req.candidate_answer,
            session_id=req.session_id,
            current_phase="THE_REHEARSAL",
            interviewer_persona=req.interviewer_persona or "rigorous_tech_lead",
            probe_depth=req.probe_depth or 1,
        )
        final_state = solstice_graph.invoke(initial_state)
        draft = final_state.get("draft_artifacts", {})

        return RehearseResponse(
            session_id=final_state["session_id"],
            stage_critique=draft.get("stage_critique", {}),
            next_probe=draft.get("next_probe", {}),
            final_response=final_state["final_response"],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Rehearsal error: {str(e)}")
