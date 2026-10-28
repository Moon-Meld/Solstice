"""Complete Teacher Distillation & Compact Trigger Prompts for Solstice Post-Training Suite.

Includes compact inference triggers, Teacher LLM prompts for SFT, DPO, and Contrastive Embedding datasets,
as well as banned cliché lists and domain seeds.
"""

from typing import Any, Dict, List

# === COMPACT ONLINE INFERENCE TRIGGERS (Shared by Training JSONL & `src/llm_router.py`) ===
COMPACT_KG_TRIGGER = "[SOLSTICE_KG_PARSE] Extract canonical nodes, edges, and unverified metric flags from the raw career text. Output strict JSON only."
COMPACT_ARTISAN_TRIGGER = "[SOLSTICE_ARTISAN_CARVE] Rewrite the experience fragment using STAR-L syntax aligned with target JD keywords. Enforce Zero-Fabrication and Anti-AI Cliché locks."
COMPACT_REHEARSAL_TRIGGER = "[SOLSTICE_REHEARSAL_PROBE] Persona: {persona} | Depth: {probe_depth}/3. Critique technical granularity and ask one progressive follow-up question targeting trade-offs or failure recovery."

# === TEACHER PROMPT 1: TEACHER_KG_SFT_SYNTHESIS_PROMPT (For `sft_kg_extractor.jsonl`) ===
TEACHER_KG_SFT_SYNTHESIS_PROMPT = """You are a Senior Knowledge Graph Data Annotator (Teacher LLM) generating gold-standard Supervised Fine-Tuning (SFT) data for `Solstice-KG-Extractor-7B`.

[Task & Domain Seed]
Based on the domain seed `{seed_context}`, generate a realistic raw resume experience paragraph or JD snippet (`raw_input`), alongside its exact ground-truth Knowledge Graph extraction (`gold_json`).

[Gold Annotation Rules]
1. Entity Canonicalization: Normalize colloquial or abbreviated terms to canonical engineering names (e.g., "py异步" -> "Python Asyncio", "lc/langgraph" -> "LangGraph").
2. Verified vs. Unverified Metrics: Include both explicit metrics (bind to `Metric` nodes with `verified: true`) and realistic vague boasts (do NOT invent numbers; log diagnostic warnings in `missing_ground_truth_flags`).
3. 2-Hop Concept Edges: Every `Framework` or `Tool` node must have one `REQUIRES_CONCEPT` edge pointing to its underlying CS/engineering concept node.

[Output JSON Schema (ShareGPT Format)]
{{
  "conversations": [
    {{
      "from": "system",
      "value": "[SOLSTICE_KG_PARSE] Extract canonical nodes, edges, and unverified metric flags from the raw career text. Output strict JSON only."
    }},
    {{
      "from": "human",
      "value": "<Generated raw resume paragraph or JD snippet>"
    }},
    {{
      "from": "gpt",
      "value": "<Strict JSON containing nodes, edges, and missing_ground_truth_flags string>"
    }}
  ]
}}"""

# === TEACHER PROMPT 2: TEACHER_ARTISAN_DPO_SYNTHESIS_PROMPT (For `dpo_artisan_writer.jsonl`) ===
TEACHER_ARTISAN_DPO_SYNTHESIS_PROMPT = """You are a Direct Preference Optimization (DPO) Dataset Synthesizer for **Solstice (至日)**. Construct a high-contrast preference pair (`chosen` vs. `rejected`) to align `Solstice-Artisan-Writer-14B`.

[Input Seed]
- Raw Experience: {raw_experience}
- Target Role JD Keywords: {jd_keywords}
- Verified Metrics from KG: {verified_metrics}

[Synthesis Rules]
1. `chosen` (The Solstice Artisan Standard):
   - High-density STAR-L engineering/business syntax: `[Concrete Verb] + [Specific Architecture/Mechanism] + [Bottleneck Solved] + [Verified Metric or [补充具体指标...] Placeholder]`.
   - ZERO words from the banned AI cliché list.
   - ZERO fabricated numbers outside `{verified_metrics}`.
2. `rejected` (The High-Trap AI Cliché Foil):
   - Must read like fluent, superficially "impressive" default GPT output so the model learns a sharp decision boundary.
   - Deliberately include 2-3 banned AI clichés ("赋能", "抓手", "闭环", "组合拳", "深度洞察", "显著提升", "全链路", "spearheaded", "synergy", "paradigm shift").
   - Either use hollow adjectives instead of concrete mechanisms OR hallucinate an unverified metric percentage.

[Output JSON Schema (LLaMA-Factory DPO ShareGPT Format)]
{{
  "conversations": [
    {{
      "from": "system",
      "value": "[SOLSTICE_ARTISAN_CARVE] Rewrite the experience fragment using STAR-L syntax aligned with target JD keywords. Enforce Zero-Fabrication and Anti-AI Cliché locks."
    }},
    {{
      "from": "human",
      "value": "Raw: {raw_experience} | JD Keywords: {jd_keywords} | Verified Metrics: {verified_metrics}"
    }}
  ],
  "chosen": {{
    "from": "gpt",
    "value": "<Crisp, zero-cliché STAR-L carving with verified metrics or [补充...] placeholders>"
  }},
  "rejected": {{
    "from": "gpt",
    "value": "<Fluent AI rewrite containing banned buzzwords or fabricated metrics>"
  }}
}}"""

# === TEACHER PROMPT 3: TEACHER_CONTRASTIVE_EMBED_PROMPT (For `contrastive_bge_triplets.jsonl`) ===
TEACHER_CONTRASTIVE_EMBED_PROMPT = """You are a Contrastive Learning Hard-Negative Miner generating training triplets (`query`, `pos`, `neg`) to fine-tune `BAAI/bge-m3` (`Solstice-Embed`) with InfoNCE loss.

[Anchor (`query`)]
Candidate verified skill & project subgraph summary:
{candidate_subgraph_text}

[Mining Rules]
1. `pos` (2 Positive Matches): Realistic JD requirement snippets where the candidate's architectural depth or 2-hop transferable skill is a direct competency hit (even when surface terminology differs, e.g., "LangGraph StateGraph" <-> "Deterministic Multi-Agent Workflow Orchestration").
2. `neg` (4 Hard Negatives): CRITICAL. Generate JD snippets that share HIGH lexical overlap (same programming languages or buzzwords) but are fundamentally mismatched in domain, mechanism, or seniority:
   - Trap A (Domain Mismatch): Candidate uses Python/FastAPI for LLM Agent orchestration -> Hard Negative JD uses Python for Quantitative High-Frequency Trading C++ wrappers or legacy Django ERP maintenance.
   - Trap B (Layer Mismatch): Candidate built GraphRAG application -> Hard Negative JD requires CUDA kernel fusion and Megatron-LM distributed pre-training from scratch.

[Output JSON Schema (FlagEmbedding Format)]
{{
  "query": "{candidate_subgraph_text}",
  "pos": ["Positive JD snippet 1", "Positive JD snippet 2"],
  "neg": ["Hard Negative JD 1", "Hard Negative JD 2", "Hard Negative JD 3", "Hard Negative JD 4"]
}}"""

# === BANNED AI BUZZWORD TAXONOMY ===
BANNED_CN_CLICHES: List[str] = [
    "赋能",
    "抓手",
    "闭环",
    "组合拳",
    "深度洞察",
    "心智",
    "拉齐",
    "颗粒度对齐",
    "显著提升",
    "全链路赋能",
    "底层逻辑",
    "全链路",
]

BANNED_EN_CLICHES: List[str] = [
    "delve",
    "testament",
    "tapestry of",
    "spearheaded",
    "synergy",
    "paradigm shift",
    "game-changer",
]

BANNED_AI_CLICHES: List[str] = BANNED_CN_CLICHES + BANNED_EN_CLICHES

# === SEED DOMAIN CATALOG FOR SYNTHESIS ===
DOMAIN_SEEDS: List[Dict[str, Any]] = [
    {
        "domain": "LLM Agent & GraphRAG Infra",
        "seed_context": "Agent orchestration using LangGraph StateGraph, hybrid retrieval with Milvus vector search + Neo4j property graph, and cyclic rollback guardrails.",
        "raw_experience": "负责了团队的智能体平台搭建，使用langgraph搭了状态机，接入了Neo4j图检索和Milvus向量检索，做了防死循环保护，显著提升了系统的响应质量与处理效率。",
        "jd_keywords": "Deterministic Multi-Agent Orchestration, GraphRAG, LangGraph, FSM Rollback, Vector DB",
        "verified_metrics": ["12 unit tests passed", "3-step cyclic rollback threshold"],
    },
    {
        "domain": "Distributed Storage & High-Throughput Messaging",
        "seed_context": "High-throughput log pipeline with Go, Apache Kafka partition rebalancing, RocksDB local state store, and Raft consensus.",
        "raw_experience": "参与基于Go的分布式日志收集系统研发，重写了Kafka分区的消费与存储逻辑，优化了并发性能，整体吞吐量全链路赋能下游服务。",
        "jd_keywords": "Go, Kafka Partitioning, High Throughput, RocksDB, Distributed Consensus",
        "verified_metrics": ["100000 QPS", "p99 latency < 15ms"],
    },
    {
        "domain": "High-Performance Deep Learning Inference",
        "seed_context": "LLM serving using vLLM, PagedAttention, continuous batching, TensorRT-LLM, and flash-decoding on NVIDIA H100 GPUs.",
        "raw_experience": "基于vLLM进行大模型推理性能优化，解决了并发场景下的显存碎片问题，优化了吞吐，底层逻辑清晰，spearheaded了推理集群降本增效。",
        "jd_keywords": "vLLM, PagedAttention, Continuous Batching, TensorRT-LLM, CUDA Memory Optimization",
        "verified_metrics": ["2.4x throughput increase", "TTFT reduced to 180ms"],
    },
    {
        "domain": "Financial Systems & Low Latency Matching",
        "seed_context": "Order book matching engine written in modern C++20 with cache-line alignment, lock-free ring buffers, and kernel bypass DPDK.",
        "raw_experience": "开发了高频撮合引擎的核心模块，使用了无锁队列和DPDK旁路网络，极大改善了订单延迟，实现了交易链路的闭环管理。",
        "jd_keywords": "Modern C++20, Lock-Free RingBuffer, Kernel Bypass DPDK, Cache Alignment, Low Latency",
        "verified_metrics": ["Round-trip latency < 850ns", "Zero memory allocations in hot path"],
    },
    {
        "domain": "Cloud-Native Infrastructure & eBPF Observability",
        "seed_context": "Kubernetes service mesh observability using Cilium eBPF, Envoy proxy filtering, and Prometheus metrics aggregation.",
        "raw_experience": "负责K8s集群网络可观测性建设，基于Cilium编写eBPF程序拦截TCP握手并导出指标，拉齐了各业务线的监控颗粒度，为平台深度赋能。",
        "jd_keywords": "Kubernetes, Cilium eBPF, TCP Socket Tracing, Prometheus, Service Mesh",
        "verified_metrics": ["CPU overhead < 1.2%", "500+ microservices traced in real time"],
    },
]
