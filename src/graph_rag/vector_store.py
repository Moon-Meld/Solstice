"""Hybrid BM25 + Dense Vector Search with Reciprocal Rank Fusion (RRF)."""

from __future__ import annotations

import math
import re
from typing import Any, Dict, List, Optional, Tuple
from pydantic import BaseModel, Field

try:
    from rank_bm25 import BM25Okapi
except ImportError:
    BM25Okapi = None


def tokenize_multilingual(text: str) -> List[str]:
    """Tokenize mixed Chinese and English text into words and character n-grams."""
    text = text.lower().strip()
    tokens: List[str] = []

    # English words
    en_words = re.findall(r"[a-z0-9_-]+", text)
    tokens.extend(en_words)

    # Chinese character unigrams and bigrams
    cn_chars = re.findall(r"[\u4e00-\u9fff]", text)
    tokens.extend(cn_chars)
    for i in range(len(cn_chars) - 1):
        tokens.append(cn_chars[i] + cn_chars[i + 1])

    return tokens or [text]


def deterministic_embedding(text: str, dim: int = 64) -> List[float]:
    """Generate deterministic normalized dense embedding vector from text for testing and cold-start."""
    tokens = tokenize_multilingual(text)
    vec = [0.0] * dim
    if not tokens:
        return vec

    for i, token in enumerate(tokens):
        # Hash token into dimension buckets
        h = hash(token)
        bucket = abs(h) % dim
        weight = 1.0 / (1.0 + math.log(i + 1))
        vec[bucket] += (1.0 if h > 0 else -1.0) * weight

    # Cosine normalize
    norm = math.sqrt(sum(x * x for x in vec))
    if norm > 0:
        vec = [x / norm for x in vec]
    return vec


def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    """Calculate cosine similarity between two vectors."""
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot = sum(a * b for a, b in zip(v1, v2))
    norm1 = math.sqrt(sum(a * a for a in v1))
    norm2 = math.sqrt(sum(b * b for b in v2))
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return dot / (norm1 * norm2)


def reciprocal_rank_fusion(
    bm25_ranked_ids: List[str],
    dense_ranked_ids: List[str],
    k: int = 60
) -> List[Tuple[str, float]]:
    """Compute Reciprocal Rank Fusion (RRF) scores across BM25 and Dense result lists.

    RRF(d) = sum_{m} (1 / (k + rank_m(d)))
    """
    scores: Dict[str, float] = {}

    for rank, doc_id in enumerate(bm25_ranked_ids, start=1):
        scores[doc_id] = scores.get(doc_id, 0.0) + (1.0 / (k + rank))

    for rank, doc_id in enumerate(dense_ranked_ids, start=1):
        scores[doc_id] = scores.get(doc_id, 0.0) + (1.0 / (k + rank))

    sorted_ranks = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    return sorted_ranks


class Document(BaseModel):
    """Document unit stored in Hybrid Vector Store."""
    id: str
    content: str
    category: str = Field(
        default="general",
        description="Category: jd, interview_trap, starl_exemplar"
    )
    metadata: Dict[str, Any] = Field(default_factory=dict)
    vector: Optional[List[float]] = None


class HybridRRFVectorStore:
    """Production Hybrid BM25 + Vector Retrieval Engine with Reciprocal Rank Fusion (RRF)."""

    def __init__(self, embedding_dim: int = 64, rrf_k: int = 60):
        self.embedding_dim = embedding_dim
        self.rrf_k = rrf_k
        self.documents: Dict[str, Document] = {}
        self._bm25_corpus: List[List[str]] = []
        self._bm25_doc_ids: List[str] = []
        self._bm25_index: Optional[Any] = None

    def add_documents(self, docs: List[Document]) -> None:
        """Add documents and rebuild internal indices."""
        for doc in docs:
            if doc.vector is None:
                doc.vector = deterministic_embedding(doc.content, self.embedding_dim)
            self.documents[doc.id] = doc

        self._rebuild_indices()

    def _rebuild_indices(self) -> None:
        """Rebuild BM25 index from active documents."""
        self._bm25_doc_ids = list(self.documents.keys())
        self._bm25_corpus = [
            tokenize_multilingual(self.documents[doc_id].content)
            for doc_id in self._bm25_doc_ids
        ]
        if self._bm25_corpus and BM25Okapi is not None:
            self._bm25_index = BM25Okapi(self._bm25_corpus)
        else:
            self._bm25_index = None

    def search_bm25(self, query: str, top_k: int = 10) -> List[Tuple[str, float]]:
        """Retrieve documents ranked by BM25 lexical relevance."""
        if not self.documents:
            return []
        tokenized_query = tokenize_multilingual(query)

        if self._bm25_index is not None:
            scores = self._bm25_index.get_scores(tokenized_query)
            scored_docs = list(zip(self._bm25_doc_ids, scores))
            scored_docs.sort(key=lambda x: x[1], reverse=True)
            return scored_docs[:top_k]

        # Simple term-frequency fallback
        scored_docs = []
        for doc_id, doc in self.documents.items():
            doc_tokens = tokenize_multilingual(doc.content)
            score = sum(1.0 for q in tokenized_query if q in doc_tokens)
            scored_docs.append((doc_id, score))
        scored_docs.sort(key=lambda x: x[1], reverse=True)
        return scored_docs[:top_k]

    def search_dense(
        self,
        query: str,
        query_vector: Optional[List[float]] = None,
        top_k: int = 10
    ) -> List[Tuple[str, float]]:
        """Retrieve documents ranked by dense vector cosine similarity."""
        if not self.documents:
            return []
        q_vec = query_vector or deterministic_embedding(query, self.embedding_dim)

        scored_docs: List[Tuple[str, float]] = []
        for doc_id, doc in self.documents.items():
            doc_vec = doc.vector or deterministic_embedding(doc.content, self.embedding_dim)
            sim = cosine_similarity(q_vec, doc_vec)
            scored_docs.append((doc_id, sim))

        scored_docs.sort(key=lambda x: x[1], reverse=True)
        return scored_docs[:top_k]

    def hybrid_search(
        self,
        query: str,
        top_k: int = 5,
        category: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Perform Hybrid search: BM25 + Dense vector ranking fused with RRF."""
        if not self.documents:
            return []

        # Filter documents if category provided
        candidate_ids = (
            {d.id for d in self.documents.values() if d.category == category}
            if category else set(self.documents.keys())
        )

        bm25_results = self.search_bm25(query, top_k=len(self.documents))
        dense_results = self.search_dense(query, top_k=len(self.documents))

        # Filter candidate ids
        bm25_filtered = [doc_id for doc_id, _ in bm25_results if doc_id in candidate_ids]
        dense_filtered = [doc_id for doc_id, _ in dense_results if doc_id in candidate_ids]

        # RRF Fusion
        fused = reciprocal_rank_fusion(bm25_filtered, dense_filtered, k=self.rrf_k)
        top_fused = fused[:top_k]

        results = []
        for doc_id, rrf_score in top_fused:
            doc = self.documents[doc_id]
            results.append({
                "id": doc.id,
                "content": doc.content,
                "category": doc.category,
                "metadata": doc.metadata,
                "rrf_score": rrf_score
            })

        return results


def build_default_knowledge_store() -> HybridRRFVectorStore:
    """Instantiate and seed store with production exemplars, interview traps, and JD competencies."""
    store = HybridRRFVectorStore()
    seed_docs = [
        Document(
            id="jd_agent_arch",
            category="jd",
            content="Senior AI Systems Architect: Production LangGraph deterministic state machines, hybrid GraphRAG, sub-second latency.",
            metadata={"role": "AI Architect", "company": "Hyperscaler"}
        ),
        Document(
            id="jd_rag_lead",
            category="jd",
            content="RAG Tech Lead: Distributed vector indexing, BM25 + Dense Reciprocal Rank Fusion (RRF), Neo4j knowledge graph reasoning.",
            metadata={"role": "RAG Lead", "company": "AI Lab"}
        ),
        Document(
            id="trap_rollback_loop",
            category="interview_trap",
            content="Interview Trap: How do you prevent infinite cyclic loops and hallucinated drift in self-correcting agent state machines? Probe depth 3: circuit breaker & deterministic invariants.",
            metadata={"topic": "Agent State Machine", "probe_depth": 3}
        ),
        Document(
            id="trap_rrf_tuning",
            category="interview_trap",
            content="Interview Trap: Why set RRF smoothing constant k=60? How does RRF handle outlier score scales compared to convex linear score combination?",
            metadata={"topic": "Hybrid RAG", "probe_depth": 2}
        ),
        Document(
            id="exemplar_starl_1",
            category="starl_exemplar",
            content="Engineered high-throughput LangGraph multi-agent orchestrator with deterministic StateGraph, cutting state rollback thrashing by [补充具体指标：如重试延迟降低 45%] across 12 core unit tests.",
            metadata={"domain": "Agent Systems"}
        )
    ]
    store.add_documents(seed_docs)
    return store
