"""Strict TypedDict state and Pydantic v2 schemas for Solstice LangGraph workflow."""

from typing import Any, Dict, List, Literal, Optional, TypedDict
from pydantic import BaseModel, Field


# ==============================================================================
# Pydantic v2 Models for Deterministic Node Outputs
# ==============================================================================

class OrchestratorDecision(BaseModel):
    """Output schema for Node 1 (Master Router)."""
    target_workflow: Literal["CONSTELLATION", "SELF_PORTRAIT", "THE_REHEARSAL", "ODYSSEY"]
    trigger_kg_extraction: bool = False
    rag_search_queries: List[str] = Field(default_factory=list)
    interviewer_persona: Optional[Literal["rigorous_tech_lead", "visionary_pm", "executive_hr"]] = None
    routing_reasoning: str


class KGNode(BaseModel):
    """Knowledge graph node entity."""
    id: str
    type: Literal["Candidate", "Skill", "Project", "Metric", "Role", "Company", "Concept", "Framework"]
    name: Optional[str] = None
    category: Optional[str] = None
    role: Optional[str] = None
    value: Optional[str] = None
    verified: Optional[bool] = None

    def model_post_init(self, __context: Any) -> None:
        if not self.name:
            self.name = self.value or self.id


class KGEdge(BaseModel):
    """Knowledge graph directional relationship."""
    source: str
    target: str
    relation: Literal[
        "UTILIZES_TECH",
        "ACHIEVED_OUTCOME",
        "REQUIRES_CONCEPT",
        "REQUIRES_SKILL",
        "BRIDGES_TO",
        "APPLIED_IN",
        "TARGETS_ROLE"
    ]


class KGExtractionResult(BaseModel):
    """Output schema for Node 2 (Knowledge Graph Parser)."""
    nodes: List[KGNode] = Field(default_factory=list)
    edges: List[KGEdge] = Field(default_factory=list)
    missing_ground_truth_flags: List[str] = Field(default_factory=list)


class ConstellationLitStar(BaseModel):
    """Direct resonance between candidate evidence and target role."""
    skill: str
    evidence_from_resume: str
    jd_mapping: str


class ConstellationUnlitStar(BaseModel):
    """Skill gap mapped to a 2-hop bridge action."""
    missing_competency: str
    closest_existing_node: str
    two_hop_bridge_action: str


class ConstellationOutput(BaseModel):
    """Output schema for Node 3 (2-Hop Graph Matching)."""
    alignment_score: int = Field(ge=0, le=100)
    constellation_summary: str
    lit_stars: List[ConstellationLitStar] = Field(default_factory=list)
    unlit_stars_and_bridges: List[ConstellationUnlitStar] = Field(default_factory=list)
    counterfactual_roadmap: List[Dict[str, Any]] = Field(default_factory=list)


class SelfPortraitDiagnosis(BaseModel):
    """Single bullet carving diagnosis and transformation."""
    original_text: str
    structural_flaw: str
    solstice_carving: str
    artisan_notes: str


class SelfPortraitOutput(BaseModel):
    """Output schema for Node 4 (STAR-L Resume Carving)."""
    diagnoses: List[SelfPortraitDiagnosis] = Field(default_factory=list)


class RehearsalStageCritique(BaseModel):
    """Stage critique for mock interview answers."""
    logical_granularity_score: int = Field(ge=1, le=10)
    technical_depth_score: int = Field(ge=1, le=10)
    what_shined: str
    blind_spot_exposed: str
    exemplar_upgrade: str


class RehearsalNextProbe(BaseModel):
    """Next probing question targeting architectural depth or failure mode."""
    current_depth_level: int = Field(ge=1, le=3)
    target_resume_node: str
    interviewer_question: str
    eig_score: Optional[float] = None
    probing_rationale: Optional[str] = None


class RehearsalOutput(BaseModel):
    """Output schema for Node 5 (3-Layer Deep-Dive Interviewer)."""
    stage_critique: RehearsalStageCritique
    next_probe: RehearsalNextProbe


class AntiAIAuditOutput(BaseModel):
    """Output schema for Node 6 (Quality & Authenticity Gate)."""
    passed: bool
    cliche_detected: List[str] = Field(default_factory=list)
    hallucinated_metrics: List[str] = Field(default_factory=list)
    rewrite_instruction: str = ""


class OdysseyOutput(BaseModel):
    """Output schema for Node 7 (Final Aesthetic Renderer)."""
    insight: str
    core_atelier: str
    next_trajectory: str
    formatted_markdown: str


# ==============================================================================
# LangGraph State Schema
# ==============================================================================

class SolsticeState(TypedDict):
    """Deterministic LangGraph state definition for Solstice multi-agent workflow."""
    session_id: str
    user_message: str
    raw_resume_text: Optional[str]
    raw_jd_text: Optional[str]
    current_phase: Literal["ORCHESTRATOR", "CONSTELLATION", "SELF_PORTRAIT", "THE_REHEARSAL", "ODYSSEY"]
    trigger_kg_extraction: bool
    rag_search_queries: List[str]
    interviewer_persona: Optional[Literal["rigorous_tech_lead", "visionary_pm", "executive_hr"]]
    probe_depth: int  # 1 = Surface Implementation, 2 = Architectural Trade-offs, 3 = Edge-Case & Failure Recovery
    user_profile_graph: Dict[str, Any]  # Verified nodes, edges, and missing_ground_truth_flags
    target_jd_context: Dict[str, Any]   # Retrieved JD chunks, competency nodes, and 2-hop Neo4j bridge paths
    draft_artifacts: Dict[str, Any]     # Structured JSON output produced by Node 3, 4, or 5
    anti_ai_audit: Dict[str, Any]       # {passed: bool, cliche_detected: List[str], hallucinated_metrics: List[str], rewrite_instruction: str}
    guardrail_retries: int              # Increments on rejection; circuit-breaker releases at >= 2
    final_response: str                 # Formatted Markdown response rendered by Node 7
    irt_belief_state: Optional[Dict[str, Dict[str, float]]]  # Bayesian IRT (mu, sigma, entropy) per skill node
    counterfactual_roadmap: Optional[List[Dict[str, Any]]]   # Pareto-optimal high-ROI skill upgrades under budget
