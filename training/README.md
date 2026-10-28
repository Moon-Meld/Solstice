# Solstice Post-Training, Data Distillation & Fine-Tuning Suite

> **Industrial-grade Post-Training Architecture for Solstice (至日)**  
> Specialized Domain SLMs, Zero-Leakage Anti-AI DPO Alignment, and Hard-Negative InfoNCE Embeddings.

---

## 1. Post-Training Objectives & Model Matrix

Solstice replaces expensive frontier LLM API calls with three specialized domain models, delivering **sub-300ms latency**, **zero API token costs**, and **physical suppression of AI clichés from model weights**:

| Model Identifier | Base Architecture | Method | Core Objective & Metric Guarantee |
| :--- | :--- | :--- | :--- |
| **`Solstice-KG-Extractor-7B`** | `Qwen/Qwen2.5-7B-Instruct` | LoRA SFT (r=64, α=128) | **≥99.5% valid JSON schema adherence**; extracts canonical nodes, edges, 2-hop concept linkages, and unverified metric flags via a 20-token trigger. |
| **`Solstice-Artisan-Writer-14B`** | `Qwen/Qwen2.5-14B-Instruct` | LoRA SFT + DPO (β=0.1, Sigmoid) | **0.0% probability leakage of banned AI buzzwords** ("赋能", "抓手", "闭环", "显著提升", "spearheaded"); enforces high-density STAR-L syntax and metric placeholders. |
| **`Solstice-Embed`** | `BAAI/bge-m3` | InfoNCE Contrastive Learning | Maps candidate verified subgraphs to target JD competencies while penalizing **high-lexical-overlap Hard Negatives** (e.g. Django CRUD vs Agent StateGraph). |

---

## 2. Training Directory Blueprint

```
training/
├── README.md                          # Comprehensive post-training documentation & guide
├── requirements-train.txt             # ML, training, distillation, and benchmark dependencies
├── synthesizer/
│   ├── __init__.py                    # Exports prompts and trigger constants
│   ├── prompts_teacher.py             # Full Teacher LLM prompts (SFT, DPO, Contrastive) & Compact Triggers
│   ├── distill_pipeline.py            # Async batch data generator with rate-limiting, Pydantic validation & retry
│   ├── log_harvester.py               # Ingests online Node 6 guardrail rollback logs into real DPO pairs
│   └── validate_datasets.py           # Audits JSONL datasets for schema validity & zero cliché leakage
├── configs/
│   ├── dataset_info.json              # LLaMA-Factory dataset registry
│   ├── ds_z2_config.json              # DeepSpeed ZeRO-2 configuration
│   ├── qwen25_7b_kg_sft.yaml          # LoRA SFT hyperparameters & ZeRO-2 config for 7B extractor
│   └── qwen25_14b_artisan_dpo.yaml    # DPO preference alignment config (beta=0.1, sigmoid) for 14B writer
├── scripts/
│   ├── run_distillation.sh            # End-to-end data distillation, harvesting, and audit script
│   ├── train_slm_llamafactory.sh      # Executes 7B SFT and 14B DPO pipelines via LLaMA-Factory CLI
│   ├── train_bge_m3_embed.py          # Python training runner for BAAI/bge-m3 contrastive fine-tuning
│   └── serve_vllm_multi_lora.sh       # Launches high-throughput vLLM server mounting both LoRA adapters
└── eval/
    ├── __init__.py
    └── test_model_benchmarks.py       # pytest suite evaluating schema pass rate, cliché leakage, and MRR@10
```

---

## 3. Compact Online Inference Triggers

Vanilla frontier prompts consume 800–1,500 system prompt tokens per request, incurring high time-to-first-token (TTFT) and KV-cache bloat. After fine-tuning, system triggers are compressed into compact **15–20 token activation phrases**:

```python
COMPACT_KG_TRIGGER = "[SOLSTICE_KG_PARSE] Extract canonical nodes, edges, and unverified metric flags from the raw career text. Output strict JSON only."
COMPACT_ARTISAN_TRIGGER = "[SOLSTICE_ARTISAN_CARVE] Rewrite the experience fragment using STAR-L syntax aligned with target JD keywords. Enforce Zero-Fabrication and Anti-AI Cliché locks."
COMPACT_REHEARSAL_TRIGGER = "[SOLSTICE_REHEARSAL_PROBE] Persona: {persona} | Depth: {probe_depth}/3. Critique technical granularity and ask one progressive follow-up question targeting trade-offs or failure recovery."
```

These triggers are shared directly between the training datasets (`training/data/`) and the online runtime model router (`src/llm_router.py`).

---

## 4. Distillation Pipeline & Data Flywheel

### 4.1 Batch Data Distillation (`distill_pipeline.py`)
Generates high-contrast training pairs using either live Teacher LLM endpoints or deterministic domain seed synthesizers across 5 technical disciplines:
- **LLM Agent & GraphRAG Infra** (LangGraph, StateGraph, cyclic guards, Neo4j)
- **Distributed Storage & Messaging** (Go, Kafka partition rebalance, RocksDB, Raft)
- **Deep Learning Serving** (vLLM, PagedAttention, continuous batching, TensorRT-LLM)
- **Low-Latency Trading** (Modern C++20, lock-free ring buffers, DPDK kernel bypass)
- **Cloud-Native & eBPF** (Kubernetes networking, Cilium eBPF socket tracing, Prometheus)

```bash
# Run distillation in mock/domain-seed mode (offline reproducible)
python -m training.synthesizer.distill_pipeline --output-dir training/data --num-samples 25 --mock

# Run distillation querying live Teacher LLM API
python -m training.synthesizer.distill_pipeline --output-dir training/data --num-samples 25 --api --concurrency 4
```

### 4.2 Online Guardrail Flywheel Harvester (`log_harvester.py`)
Bridges online user sessions with continuous offline DPO training:
1. Online runtime Node 6 (`AntiAIGuardrailNode`) checks every generated draft.
2. When an initial draft fails (`passed == False`) due to cliché leakage or metric fabrication, and a subsequent retry passes (`passed == True`), `AntiAIGate.log_dpo_pair` appends the event to `logs/guardrail_flywheel.jsonl`.
3. `log_harvester.py` reads the log, extracts the rejected draft as `rejected`, the approved rewrite as `chosen`, validates against zero-cliché rules, and appends valid pairs to `training/data/dpo_artisan_writer.jsonl`.

```bash
python -m training.synthesizer.log_harvester \
    --flywheel-log logs/guardrail_flywheel.jsonl \
    --output training/data/dpo_artisan_writer.jsonl
```

### 4.3 Zero-Cliché & Schema Auditor (`validate_datasets.py`)
Audits generated datasets with 0.0% tolerance for banned buzzwords in `chosen`:

```bash
python -m training.synthesizer.validate_datasets --data-dir training/data
```

---

## 5. Fine-Tuning Execution

### 5.1 SLM Fine-Tuning via LLaMA-Factory
Fine-tunes the 7B Extractor and 14B Writer using LoRA with DeepSpeed ZeRO-2:

```bash
# Execute training via script (supports sft | dpo | all)
./training/scripts/train_slm_llamafactory.sh all false

# Or dry-run config validation without GPU
./training/scripts/train_slm_llamafactory.sh all true
```

#### Hyperparameters Summary:
- **LoRA Hyperparameters**: Rank $r = 64$, Alpha $\alpha = 128$, Dropout $= 0.05$, Target modules = `all-linear`.
- **7B SFT Extractor**: Batch Size = 4, Gradient Accumulation = 4 (Effective BS = 16), Learning Rate = `1.0e-4`, Epochs = `3.0`, Cosine schedule, BF16.
- **14B DPO Writer**: Batch Size = 2, Gradient Accumulation = 8 (Effective BS = 16), Learning Rate = `5.0e-6`, Beta $\beta = 0.1$, Loss = `sigmoid`, Epochs = `2.0`, BF16.

### 5.2 Contrastive Embedding InfoNCE Fine-Tuning
Fine-tunes `BAAI/bge-m3` using InfoNCE loss with 1 positive and 4 hard negatives per anchor:

$$\mathcal{L}_{InfoNCE} = -\log \frac{\exp(\text{sim}(q, p_i)/\tau)}{\exp(\text{sim}(q, p_i)/\tau) + \sum_{j=1}^K \exp(\text{sim}(q, n_{i,j})/\tau)}$$

Configuration:
- $\tau = 0.02$
- Group Size = 5 (1 positive + 4 hard negatives)
- Negatives Cross Device = True
- Sentence Pooling = `cls`
- Query Instruction: `"Represent this candidate skill subgraph for matching target role competencies: "`

```bash
# Execute embedding fine-tuning (or dry-run verification)
python training/scripts/train_bge_m3_embed.py --dry-run
```

---

## 6. Multi-LoRA Serving with vLLM

Both fine-tuned adapters are served concurrently on a single base engine using vLLM's multi-LoRA routing:

```bash
./training/scripts/serve_vllm_multi_lora.sh
```

When active, requests to `http://localhost:8000/v1` can target:
- `model: Solstice-KG-Extractor-7B` for structural parsing and graph extraction.
- `model: Solstice-Artisan-Writer-14B` for zero-cliché STAR-L carving.

---

## 7. Quality & Regression Benchmark Suite

Executable pytest benchmarks verify schema adherence, cliché suppression, and retrieval margins:

```bash
pytest training/eval/test_model_benchmarks.py -v
```

### Benchmark Metrics & Pass Criteria:
1. **Zero Cliché Leakage**: 100% of `chosen` turns contain 0 occurrences of banned Chinese and English clichés.
2. **Extractor Schema Fidelity**: JSON parse success rate $\ge 99.5\%$, 100% 2-hop concept edge connectivity (`REQUIRES_CONCEPT`), and complete detection of unverified claims in `missing_ground_truth_flags`.
3. **Retrieval Separation Margin**: Cosine similarity margin $\text{sim}(q, pos) - \max_j \text{sim}(q, neg_j) > 0.05$, **Recall@5 $\ge 95\%$**, and **MRR@10 $\ge 80\%$**.
