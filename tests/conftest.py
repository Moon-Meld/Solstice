"""Deterministic mock fixtures and configuration for Solstice test suite."""

import os
import tempfile
import pytest
from typing import Any, Dict
from fastapi.testclient import TestClient

from src.config import settings
from src.llm_router import ModelRouter
from src.graph_rag.neo4j_client import SolsticeNeo4jClient
from src.graph_rag.vector_store import (
    HybridRRFVectorStore,
    Document,
    build_default_knowledge_store
)
from src.guardrails.anti_ai_gate import AntiAIGate
from src.agents.nodes import SolsticeNodes
from src.agents.workflow import build_solstice_graph, create_initial_state
from src.api.main import app


@pytest.fixture(autouse=True)
def configure_test_env(monkeypatch, tmp_path):
    """Set deterministic environment variables and redirect flywheel logs to temporary file."""
    flywheel_file = str(tmp_path / "test_guardrail_flywheel.jsonl")
    monkeypatch.setattr(settings, "guardrail_flywheel_path", flywheel_file)
    monkeypatch.setattr(settings, "use_finetuned_slm", False)
    monkeypatch.setattr(settings, "max_guardrail_retries", 2)
    yield


@pytest.fixture
def mock_router() -> ModelRouter:
    """Deterministic Mock Model Router."""
    return ModelRouter(mock_mode=True)


@pytest.fixture
def sample_user_graph() -> Dict[str, Any]:
    """Sample verified user profile graph."""
    return {
        "nodes": [
            {"id": "skill_langgraph", "type": "Skill", "name": "LangGraph", "category": "Framework"},
            {"id": "skill_pyasync", "type": "Skill", "name": "Python Asyncio", "category": "Language"},
            {"id": "proj_engine", "type": "Project", "name": "Multi-Agent Orchestration Engine", "role": "Core Developer"},
            {"id": "metric_tests", "type": "Metric", "value": "12 core unit tests passed", "verified": True},
            {"id": "concept_fsm", "type": "Concept", "name": "Deterministic Finite State Machine"}
        ],
        "edges": [
            {"source": "proj_engine", "target": "skill_langgraph", "relation": "UTILIZES_TECH"},
            {"source": "proj_engine", "target": "metric_tests", "relation": "ACHIEVED_OUTCOME"},
            {"source": "skill_langgraph", "target": "concept_fsm", "relation": "REQUIRES_CONCEPT"},
            {"source": "skill_pyasync", "target": "concept_fsm", "relation": "REQUIRES_CONCEPT"}
        ],
        "missing_ground_truth_flags": [
            "Project mentions high retrieval accuracy without baseline vs improved percentage."
        ]
    }


@pytest.fixture
def seeded_neo4j_client(sample_user_graph) -> SolsticeNeo4jClient:
    """Pre-seeded in-memory Neo4j client containing skills, concepts, and bridge paths."""
    client = SolsticeNeo4jClient()
    # Ingest candidate graph
    client.ingest_triplets(sample_user_graph["nodes"], sample_user_graph["edges"])

    # Ingest target skills & concept bridge
    target_nodes = [
        {"id": "skill_rrf_rag", "type": "Skill", "name": "Distributed Vector Indexing & Hybrid Reranking", "category": "Framework"},
        {"id": "concept_fsm", "type": "Concept", "name": "Deterministic Finite State Machine"},
        {"id": "concept_indexing", "type": "Concept", "name": "Inverted & Dense Indexing"}
    ]
    target_edges = [
        # Link LangGraph to Distributed Vector Indexing through Concept FSM or direct bridge
        {"source": "concept_fsm", "target": "skill_rrf_rag", "relation": "BRIDGES_TO"}
    ]
    client.ingest_triplets(target_nodes, target_edges)
    return client


@pytest.fixture
def seeded_vector_store() -> HybridRRFVectorStore:
    """Pre-seeded hybrid vector store with JDs, interview traps, and exemplars."""
    return build_default_knowledge_store()


@pytest.fixture
def mock_nodes(seeded_neo4j_client, seeded_vector_store, mock_router) -> SolsticeNodes:
    """SolsticeNodes wired to deterministic mocks."""
    gate = AntiAIGate(model_router=mock_router)
    return SolsticeNodes(
        neo4j_client=seeded_neo4j_client,
        vector_store=seeded_vector_store,
        model_router=mock_router,
        anti_ai_gate=gate
    )


@pytest.fixture
def mock_graph(mock_nodes):
    """Compiled LangGraph StateGraph with deterministic nodes."""
    return build_solstice_graph(mock_nodes)


@pytest.fixture
def api_client() -> TestClient:
    """FastAPI TestClient."""
    return TestClient(app)
