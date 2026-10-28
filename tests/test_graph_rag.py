"""Unit tests for Hybrid GraphRAG Engine: Neo4j 2-hop reasoning and Vector Store + RRF."""

import pytest
from src.graph_rag.neo4j_client import SolsticeNeo4jClient
from src.graph_rag.vector_store import (
    Document,
    HybridRRFVectorStore,
    reciprocal_rank_fusion,
    cosine_similarity,
    deterministic_embedding,
    tokenize_multilingual,
)


def test_neo4j_triplet_ingestion():
    """Verify that nodes and relationships are ingested into the Neo4j client."""
    client = SolsticeNeo4jClient()
    nodes = [
        {"id": "skill_langgraph", "type": "Skill", "name": "LangGraph"},
        {"id": "proj_engine", "type": "Project", "name": "Agent Engine"},
        {"id": "concept_fsm", "type": "Concept", "name": "FSM"}
    ]
    edges = [
        {"source": "proj_engine", "target": "skill_langgraph", "relation": "UTILIZES_TECH"},
        {"source": "skill_langgraph", "target": "concept_fsm", "relation": "REQUIRES_CONCEPT"}
    ]

    res = client.ingest_triplets(nodes, edges)
    assert res["nodes_ingested"] == 3
    assert res["edges_ingested"] == 2
    assert "skill_langgraph" in client._in_memory_nodes
    assert len(client._in_memory_edges) == 2


def test_two_hop_skill_bridge_reasoning(seeded_neo4j_client):
    """Verify 2-hop path traversal connecting candidate skills to target skills."""
    candidate_skills = ["LangGraph"]
    target_skills = ["Distributed Vector Indexing & Hybrid Reranking"]

    bridges = seeded_neo4j_client.find_two_hop_skill_bridges(candidate_skills, target_skills)
    assert len(bridges) > 0

    first_bridge = bridges[0]
    assert first_bridge["hop_count"] <= 2
    assert "bridge_path" in first_bridge
    assert len(first_bridge["bridge_path"]) >= 2
    # Verify path anchors
    assert any("LangGraph" in node for node in first_bridge["bridge_path"])


def test_bm25_multilingual_lexical_search():
    """Verify BM25 tokenization and lexical retrieval for mixed Chinese/English terms."""
    store = HybridRRFVectorStore()
    docs = [
        Document(id="doc1", content="LangGraph 状态机 编排 架构师", category="general"),
        Document(id="doc2", content="Neo4j 图数据库 2-hop 寻径", category="general"),
        Document(id="doc3", content="React 前端 界面 组件", category="general"),
    ]
    store.add_documents(docs)

    results = store.search_bm25("LangGraph 状态机", top_k=2)
    assert len(results) > 0
    top_doc_id, top_score = results[0]
    assert top_doc_id == "doc1"
    assert top_score > 0.0


def test_dense_vector_cosine_search():
    """Verify dense embedding generation and cosine similarity calculation."""
    vec1 = deterministic_embedding("LangGraph state machine deterministic transitions", dim=32)
    vec2 = deterministic_embedding("Deterministic finite state machine LangGraph", dim=32)
    vec3 = deterministic_embedding("Cooking pasta with tomato sauce", dim=32)

    sim_related = cosine_similarity(vec1, vec2)
    sim_unrelated = cosine_similarity(vec1, vec3)

    assert sim_related > sim_unrelated
    assert sim_related > 0.4


def test_reciprocal_rank_fusion_scoring():
    """Verify that RRF accurately combines BM25 and Dense ranks using k=60 formula."""
    bm25_ranks = ["docA", "docB", "docC"]
    dense_ranks = ["docB", "docA", "docD"]

    # docA: rank 1 in BM25 (1/61) + rank 2 in Dense (1/62) = 0.016393 + 0.016129 = 0.032522
    # docB: rank 2 in BM25 (1/62) + rank 1 in Dense (1/61) = 0.016129 + 0.016393 = 0.032522
    # docC: rank 3 in BM25 (1/63) = 0.015873
    # docD: rank 3 in Dense (1/63) = 0.015873

    fused = reciprocal_rank_fusion(bm25_ranks, dense_ranks, k=60)
    assert len(fused) == 4
    top_ids = [doc_id for doc_id, _ in fused[:2]]
    assert "docA" in top_ids
    assert "docB" in top_ids

    # Both docA and docB must score higher than docC and docD
    doc_c_score = dict(fused)["docC"]
    assert dict(fused)["docA"] > doc_c_score


def test_hybrid_search_end_to_end(seeded_vector_store):
    """Verify end-to-end hybrid retrieval with BM25 + Dense + RRF and category filtering."""
    results = seeded_vector_store.hybrid_search(
        query="LangGraph deterministic state machines and rollback loops",
        top_k=3,
        category="interview_trap"
    )
    assert len(results) > 0
    for r in results:
        assert r["category"] == "interview_trap"
        assert "rrf_score" in r
        assert r["rrf_score"] > 0
