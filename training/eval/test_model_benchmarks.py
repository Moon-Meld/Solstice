"""Post-Training Quality, Schema Fidelity, and Retrieval Regression Benchmarks.

Evaluates:
1. Dataset Validator: Zero cliché leakage in `chosen` (0.0% tolerance) and ShareGPT schema validity.
2. Extractor Schema Fidelity: JSON parse success rate (>= 99.5%), graph node/edge structure, 2-hop concepts, and unverified metric flags recall.
3. Contrastive Embedding Separation: Cosine margin (sim(q, pos) - max(sim(q, neg)) > 0), Recall@5, and MRR@10.
4. Online Flywheel Harvesting: End-to-end rollback event harvesting to validated DPO pairs.
5. Compact Online Trigger Parity: Token budget (< 25 tokens) and consistency.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List
import numpy as np
import pytest

from training.synthesizer.prompts_teacher import (
    BANNED_AI_CLICHES,
    BANNED_CN_CLICHES,
    BANNED_EN_CLICHES,
    COMPACT_ARTISAN_TRIGGER,
    COMPACT_KG_TRIGGER,
    COMPACT_REHEARSAL_TRIGGER,
    DOMAIN_SEEDS,
)
from training.synthesizer.distill_pipeline import DistillationPipeline
from training.synthesizer.log_harvester import LogHarvester
from training.synthesizer.validate_datasets import (
    audit_dataset_file,
    scan_text_for_cliches,
    validate_contrastive_embed_record,
    validate_dpo_artisan_record,
    validate_sft_kg_record,
)


@pytest.fixture(scope="module")
def prepared_datasets(tmp_path_factory) -> Path:
    """Generate fresh mock/seed datasets for benchmark validation."""
    data_dir = tmp_path_factory.mktemp("benchmark_data")
    pipeline = DistillationPipeline(mock_mode=True)
    import asyncio

    asyncio.run(pipeline.run_distillation(data_dir, num_samples=15))
    return data_dir


class TestDatasetValidator:
    """Benchmark A: Audits synthesized & harvested DPO pairs for zero cliché leakage."""

    def test_zero_cliche_leakage_in_chosen_dpo(self, prepared_datasets: Path):
        """Verify 0.0% probability leakage of banned AI clichés in `chosen` artisan outputs."""
        dpo_path = prepared_datasets / "dpo_artisan_writer.jsonl"
        assert dpo_path.exists(), "DPO dataset file must exist"

        total_checked = 0
        total_leaked = 0
        leaked_details: List[str] = []

        with open(dpo_path, "r", encoding="utf-8") as f:
            for idx, line in enumerate(f):
                line = line.strip()
                if not line:
                    continue
                record = json.loads(line)
                chosen_text = record["chosen"]["value"]
                total_checked += 1

                detected = scan_text_for_cliches(chosen_text)
                if detected:
                    total_leaked += 1
                    leaked_details.append(f"Row {idx} leaked: {detected}")

        assert total_checked >= 10, f"Expected at least 10 DPO pairs, got {total_checked}"
        assert total_leaked == 0, (
            f"BANNED AI CLICHÉ LEAKAGE DETECTED! Leakage count: {total_leaked}/{total_checked}. "
            f"Details: {leaked_details}"
        )

    def test_rejected_foil_contrast(self, prepared_datasets: Path):
        """Verify `rejected` foils deliberately contain banned clichés or metric traps to teach sharp decision boundary."""
        dpo_path = prepared_datasets / "dpo_artisan_writer.jsonl"
        with open(dpo_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                record = json.loads(line)
                rejected_text = record["rejected"]["value"]
                chosen_text = record["chosen"]["value"]

                # Rejected must differ from chosen
                assert rejected_text != chosen_text
                # Rejected should exhibit clichés or hollow phrasing
                detected_rejected = scan_text_for_cliches(rejected_text)
                assert len(detected_rejected) > 0, "Rejected draft must contain intentional AI cliché traps"

    def test_dataset_audit_runner(self, prepared_datasets: Path):
        """Verify audit_dataset_file produces 100% pass rate across SFT, DPO, and Embed files."""
        sft_report = audit_dataset_file(prepared_datasets / "sft_kg_extractor.jsonl", "sft_kg")
        dpo_report = audit_dataset_file(prepared_datasets / "dpo_artisan_writer.jsonl", "dpo_artisan")
        embed_report = audit_dataset_file(prepared_datasets / "contrastive_bge_triplets.jsonl", "contrastive_embed")

        assert sft_report.passed is True
        assert sft_report.pass_rate == 100.0

        assert dpo_report.passed is True
        assert dpo_report.pass_rate == 100.0
        assert len(dpo_report.cliche_violations) == 0

        assert embed_report.passed is True
        assert embed_report.pass_rate == 100.0


class TestExtractorSchemaFidelity:
    """Benchmark B: Knowledge Graph Extractor JSON schema adherence & flags recall."""

    def test_kg_extractor_json_schema_validity(self, prepared_datasets: Path):
        """Verify 99.5%+ valid JSON schema adherence for Knowledge Graph extraction."""
        sft_path = prepared_datasets / "sft_kg_extractor.jsonl"
        total = 0
        valid_json = 0
        has_2hop_concept = 0

        with open(sft_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                total += 1
                record = json.loads(line)

                # Validate ShareGPT structure
                assert record["conversations"][0]["value"] == COMPACT_KG_TRIGGER
                gpt_val = record["conversations"][2]["value"]

                # Parse JSON
                try:
                    gold_json = json.loads(gpt_val)
                    valid_json += 1
                except Exception:
                    continue

                # Node & Edge structure
                nodes = gold_json.get("nodes", [])
                edges = gold_json.get("edges", [])
                assert isinstance(nodes, list) and len(nodes) >= 3
                assert isinstance(edges, list) and len(edges) >= 2

                # 2-Hop Concept edge verification
                concept_nodes = {n["id"] for n in nodes if n.get("type") == "Concept"}
                requires_concept_edges = [
                    e for e in edges if e.get("relation") == "REQUIRES_CONCEPT" and e.get("target") in concept_nodes
                ]
                if requires_concept_edges:
                    has_2hop_concept += 1

        pass_rate = (valid_json / total) * 100.0
        assert pass_rate >= 99.5, f"JSON parse rate {pass_rate:.2f}% below target 99.5%"
        assert has_2hop_concept == total, "100% of samples must satisfy 2-hop REQUIRES_CONCEPT linkage"

    def test_missing_ground_truth_flags_recall(self, prepared_datasets: Path):
        """Verify vague, ungrounded career claims reliably trigger missing_ground_truth_flags."""
        sft_path = prepared_datasets / "sft_kg_extractor.jsonl"
        with open(sft_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                record = json.loads(line)
                gold_json = json.loads(record["conversations"][2]["value"])

                flags = gold_json.get("missing_ground_truth_flags", [])
                assert isinstance(flags, list)
                assert len(flags) > 0, "Missing ground truth diagnostic flags must be populated"
                for flag in flags:
                    assert isinstance(flag, str) and len(flag) > 10


class TestRetrievalSeparationMargin:
    """Benchmark C: Contrastive InfoNCE Embedding hard-negative separation margin & ranking."""

    def test_contrastive_separation_margin_positive(self, prepared_datasets: Path):
        """Verify cosine similarity margin: sim(q, pos) - max(sim(q, hard_neg)) > 0."""
        import re
        from training.scripts.train_bge_m3_embed import compute_infonce_loss_numpy

        embed_path = prepared_datasets / "contrastive_bge_triplets.jsonl"
        triplets = []
        with open(embed_path, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    triplets.append(json.loads(line))

        assert len(triplets) >= 10

        stopwords = {
            "and", "or", "in", "for", "the", "with", "a", "to", "of", "is",
            "on", "at", "by", "as", "an", "candidate", "verified", "subgraph", "core"
        }

        def embed(text: str, dim: int = 512) -> np.ndarray:
            tokens = [w for w in re.findall(r"\b[a-zA-Z0-9_\+#\.]+\b", text.lower()) if w not in stopwords]
            vec = np.zeros(dim, dtype=np.float64)
            for tok in tokens:
                idx = hash(tok) % dim
                vec[idx] += 1.0
            norm = np.linalg.norm(vec)
            return vec / (norm + 1e-12)

        margins: List[float] = []
        recalls_at_5: List[float] = []
        mrrs_at_10: List[float] = []
        infonce_losses: List[float] = []

        for item in triplets:
            q_text = item["query"]
            pos_texts = item["pos"]
            neg_texts = item["neg"]

            q_vec = embed(q_text)
            pos_vecs = [embed(p) for p in pos_texts]
            neg_vecs = [embed(n) for n in neg_texts]

            # Cosine similarity
            sim_pos = max(float(np.dot(q_vec, pv)) for pv in pos_vecs)
            sim_negs = [float(np.dot(q_vec, nv)) for nv in neg_vecs]
            max_sim_neg = max(sim_negs)

            # Hard-negative separation margin
            margin = sim_pos - max_sim_neg
            margins.append(margin)

            # Compute exact InfoNCE loss
            loss, _, _ = compute_infonce_loss_numpy(
                q_vec.tolist(), pos_vecs[0].tolist(), [nv.tolist() for nv in neg_vecs], temperature=0.02
            )
            infonce_losses.append(loss)

            # Ranking evaluation
            all_candidates = [(sim_pos, True)] + [(s, False) for s in sim_negs]
            all_candidates.sort(key=lambda x: x[0], reverse=True)

            top5 = [c[1] for c in all_candidates[:5]]
            recalls_at_5.append(1.0 if any(top5) else 0.0)

            rank = next(i + 1 for i, c in enumerate(all_candidates[:10]) if c[1])
            mrrs_at_10.append(1.0 / rank)

        avg_margin = float(np.mean(margins))
        avg_recall = float(np.mean(recalls_at_5))
        avg_mrr = float(np.mean(mrrs_at_10))

        assert avg_margin > 0.05, f"Margin ({avg_margin:.4f}) must be strictly positive (> 0.05)"
        assert avg_recall >= 0.95, f"Recall@5 ({avg_recall:.2f}) below 0.95"
        assert avg_mrr >= 0.80, f"MRR@10 ({avg_mrr:.2f}) below 0.80"


class TestFlywheelHarvester:
    """Benchmark D: Online Guardrail Flywheel to DPO conversion."""

    def test_harvest_online_rollback_logs(self, tmp_path: Path):
        """Verify online guardrail rollback events convert into valid DPO pairs."""
        log_path = tmp_path / "guardrail_flywheel.jsonl"
        dpo_out = tmp_path / "dpo_artisan_writer.jsonl"

        # Write test flywheel event with a rejected draft containing clichés and an approved retry
        event = {
            "timestamp": "2026-10-28T07:15:00Z",
            "session_id": "session_test_999",
            "prompt_context": "Remove '赋能' and '显著提升'. State caching mechanism.",
            "rejected": {
                "solstice_carving": "深度赋能分布式任务队列，组合拳出击形成闭环，显著提升执行效率 40% 并拉齐心智。"
            },
            "chosen": {
                "solstice_carving": "重构分布式任务调度队列，引入一致性哈希分片与批量确认机制，将瞬时峰值排队延迟控制在 [补充具体指标：如由 X ms 降低至 Y ms]。"
            },
            "audit_violations": {
                "cliche_detected": ["赋能", "组合拳", "闭环", "显著提升", "心智"],
                "hallucinated_metrics": ["40%"],
            },
        }

        with open(log_path, "w", encoding="utf-8") as f:
            f.write(json.dumps(event, ensure_ascii=False) + "\n")

        harvester = LogHarvester(flywheel_log_path=log_path, output_dpo_path=dpo_out)
        count = harvester.harvest()
        assert count == 1

        # Audit generated DPO file
        report = audit_dataset_file(dpo_out, "dpo_artisan")
        assert report.passed is True
        assert report.total_records == 1
        assert len(report.cliche_violations) == 0


class TestCompactTriggers:
    """Benchmark E: Compact online inference triggers token compactness & parity."""

    def test_trigger_token_length(self):
        """Ensure compact triggers stay within ~20-25 tokens to minimize TTFT and KV cache overhead."""
        # Simple word/token estimation
        kg_tokens = len(COMPACT_KG_TRIGGER.split())
        artisan_tokens = len(COMPACT_ARTISAN_TRIGGER.split())

        assert kg_tokens <= 25, f"COMPACT_KG_TRIGGER too long: {kg_tokens} tokens"
        assert artisan_tokens <= 25, f"COMPACT_ARTISAN_TRIGGER too long: {artisan_tokens} tokens"
        assert "[SOLSTICE_KG_PARSE]" in COMPACT_KG_TRIGGER
        assert "[SOLSTICE_ARTISAN_CARVE]" in COMPACT_ARTISAN_TRIGGER
        assert "[SOLSTICE_REHEARSAL_PROBE]" in COMPACT_REHEARSAL_TRIGGER
