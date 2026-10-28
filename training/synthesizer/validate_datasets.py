"""Dataset Validator for Solstice Post-Training Suite.

Audits SFT, DPO, and Contrastive Embedding JSONL datasets for:
1. Exact ShareGPT / LLaMA-Factory / FlagEmbedding schema adherence.
2. Zero-leakage enforcement of banned AI clichés in `chosen` outputs (0.0% tolerance).
3. Ground-truth Knowledge Graph syntax (nodes, edges, missing_ground_truth_flags, 2-hop concepts).
4. Contrastive embedding format (query, pos >= 1, neg >= 1).
"""

from __future__ import annotations

import argparse
import json
import logging
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

from training.synthesizer.prompts_teacher import (
    BANNED_AI_CLICHES,
    BANNED_CN_CLICHES,
    BANNED_EN_CLICHES,
    COMPACT_ARTISAN_TRIGGER,
    COMPACT_KG_TRIGGER,
)

logger = logging.getLogger("solstice.validator")

# Regex for metric expressions (e.g., 40%, 15ms, 10000 QPS, 3倍)
METRIC_REGEX = re.compile(
    r"(?<!\[补充)(?:(?:\d+(?:\.\d+)?)\s*(?:%|ms|毫秒|s|秒|QPS|qps|tps|TPS|万|倍|倍速|GB|MB|TB|Core))",
    re.IGNORECASE,
)
# Regex for metric placeholders
PLACEHOLDER_REGEX = re.compile(r"\[补充[^\]]*\]")


@dataclass
class ValidationReport:
    """Report summarizing audit results for a dataset file."""

    dataset_name: str
    file_path: str
    total_records: int = 0
    valid_records: int = 0
    passed: bool = False
    cliche_violations: List[str] = field(default_factory=list)
    schema_errors: List[str] = field(default_factory=list)

    @property
    def pass_rate(self) -> float:
        if self.total_records == 0:
            return 0.0
        return (self.valid_records / self.total_records) * 100.0


def scan_text_for_cliches(text: str) -> List[str]:
    """Scan string for any occurrence of banned Chinese or English clichés."""
    detected: List[str] = []
    for word in BANNED_CN_CLICHES:
        if word in text and word not in detected:
            detected.append(word)

    for pattern in BANNED_EN_CLICHES:
        pattern_regex = re.compile(rf"\b{re.escape(pattern)}\b", re.IGNORECASE)
        if pattern_regex.search(text) and pattern not in detected:
            detected.append(pattern)

    return detected


def validate_sft_kg_record(record: Dict[str, Any], index: int = 0) -> Tuple[bool, Optional[str]]:
    """Validate a single SFT record for Solstice-KG-Extractor-7B."""
    if not isinstance(record, dict):
        return False, f"Record #{index}: Must be a JSON object"

    conversations = record.get("conversations")
    if not isinstance(conversations, list) or len(conversations) < 3:
        return False, f"Record #{index}: 'conversations' must be a list of at least 3 messages"

    # Turn 0: System message with trigger
    sys_turn = conversations[0]
    if sys_turn.get("from") != "system" or COMPACT_KG_TRIGGER not in sys_turn.get("value", ""):
        return False, f"Record #{index}: System message must contain COMPACT_KG_TRIGGER"

    # Turn 1: Human message with raw text
    human_turn = conversations[1]
    if human_turn.get("from") != "human" or not str(human_turn.get("value", "")).strip():
        return False, f"Record #{index}: Human message must provide non-empty raw text"

    # Turn 2: Assistant output with gold JSON
    gpt_turn = conversations[2]
    if gpt_turn.get("from") != "gpt":
        return False, f"Record #{index}: Assistant turn must have 'from': 'gpt'"

    gpt_val = gpt_turn.get("value", "")
    if isinstance(gpt_val, dict):
        gold_data = gpt_val
    else:
        try:
            gold_data = json.loads(gpt_val)
        except Exception as e:
            return False, f"Record #{index}: GPT response is not valid JSON: {e}"

    if not isinstance(gold_data, dict):
        return False, f"Record #{index}: Gold JSON must be a dictionary"

    nodes = gold_data.get("nodes")
    edges = gold_data.get("edges")
    missing_flags = gold_data.get("missing_ground_truth_flags")

    if not isinstance(nodes, list) or not isinstance(edges, list) or not isinstance(missing_flags, list):
        return False, f"Record #{index}: Gold JSON must contain 'nodes', 'edges', and 'missing_ground_truth_flags'"

    # Verify node structure
    concept_node_ids: Set[str] = set()
    framework_node_ids: Set[str] = set()
    for n in nodes:
        if not isinstance(n, dict) or "id" not in n or "type" not in n:
            return False, f"Record #{index}: Malformed node in nodes list: {n}"
        if n.get("type") == "Concept":
            concept_node_ids.add(str(n.get("id")))
        if n.get("type") in ("Skill", "Tool", "Framework") and n.get("category") == "Framework":
            framework_node_ids.add(str(n.get("id")))

    # Verify 2-hop concept edge if Framework node exists
    if framework_node_ids and concept_node_ids:
        has_requires_concept = False
        for edge in edges:
            if (
                isinstance(edge, dict)
                and edge.get("relation") == "REQUIRES_CONCEPT"
                and str(edge.get("source")) in framework_node_ids
                and str(edge.get("target")) in concept_node_ids
            ):
                has_requires_concept = True
                break
        if not has_requires_concept:
            return False, f"Record #{index}: Missing 2-hop REQUIRES_CONCEPT edge linking Framework to Concept"

    return True, None


def validate_dpo_artisan_record(record: Dict[str, Any], index: int = 0) -> Tuple[bool, Optional[str]]:
    """Validate a single DPO record for Solstice-Artisan-Writer-14B.

    Strictly enforces 0.0% cliché leakage in `chosen`.
    """
    if not isinstance(record, dict):
        return False, f"Record #{index}: Must be a JSON object"

    conversations = record.get("conversations")
    chosen = record.get("chosen")
    rejected = record.get("rejected")

    if not isinstance(conversations, list) or len(conversations) < 2:
        return False, f"Record #{index}: 'conversations' must have at least 2 messages"

    sys_turn = conversations[0]
    if sys_turn.get("from") != "system" or COMPACT_ARTISAN_TRIGGER not in sys_turn.get("value", ""):
        return False, f"Record #{index}: System message must contain COMPACT_ARTISAN_TRIGGER"

    if not isinstance(chosen, dict) or chosen.get("from") != "gpt":
        return False, f"Record #{index}: 'chosen' must be a dict with 'from': 'gpt'"

    if not isinstance(rejected, dict) or rejected.get("from") != "gpt":
        return False, f"Record #{index}: 'rejected' must be a dict with 'from': 'gpt'"

    chosen_text = str(chosen.get("value", "")).strip()
    rejected_text = str(rejected.get("value", "")).strip()

    if not chosen_text:
        return False, f"Record #{index}: 'chosen' text cannot be empty"

    if not rejected_text:
        return False, f"Record #{index}: 'rejected' text cannot be empty"

    # ZERO-LEAKAGE AUDIT: chosen MUST NOT contain any banned AI clichés
    chosen_cliches = scan_text_for_cliches(chosen_text)
    if chosen_cliches:
        return False, f"Record #{index}: BANNED AI CLICHÉ LEAKAGE in chosen: {chosen_cliches}"

    # Verify rejected text contains flaws (banned clichés or contrast)
    rejected_cliches = scan_text_for_cliches(rejected_text)
    # Even if rejected has no explicit cliché, it must differ from chosen
    if chosen_text == rejected_text:
        return False, f"Record #{index}: 'chosen' and 'rejected' must not be identical"

    return True, None


def validate_contrastive_embed_record(record: Dict[str, Any], index: int = 0) -> Tuple[bool, Optional[str]]:
    """Validate a single triplet record for Solstice-Embed (BAAI/bge-m3)."""
    if not isinstance(record, dict):
        return False, f"Record #{index}: Must be a JSON object"

    query = record.get("query")
    pos = record.get("pos")
    neg = record.get("neg")

    if not isinstance(query, str) or not query.strip():
        return False, f"Record #{index}: 'query' must be a non-empty string"

    if not isinstance(pos, list) or len(pos) < 1:
        return False, f"Record #{index}: 'pos' must be a non-empty list of positive texts"

    if not isinstance(neg, list) or len(neg) < 1:
        return False, f"Record #{index}: 'neg' must be a non-empty list of hard negative texts"

    return True, None


def audit_dataset_file(file_path: Path, dataset_type: str) -> ValidationReport:
    """Audit an entire JSONL dataset file."""
    report = ValidationReport(dataset_name=dataset_type, file_path=str(file_path))

    if not file_path.exists():
        report.schema_errors.append(f"File not found: {file_path}")
        return report

    with open(file_path, "r", encoding="utf-8") as f:
        for idx, line in enumerate(f):
            line = line.strip()
            if not line:
                continue
            report.total_records += 1
            try:
                data = json.loads(line)
            except Exception as e:
                report.schema_errors.append(f"Line {idx}: JSON parse error: {e}")
                continue

            if dataset_type == "sft_kg":
                ok, err = validate_sft_kg_record(data, idx)
            elif dataset_type == "dpo_artisan":
                ok, err = validate_dpo_artisan_record(data, idx)
                if not ok and "CLICHÉ LEAKAGE" in (err or ""):
                    report.cliche_violations.append(err or "")
            elif dataset_type == "contrastive_embed":
                ok, err = validate_contrastive_embed_record(data, idx)
            else:
                ok, err = False, f"Unknown dataset type: {dataset_type}"

            if ok:
                report.valid_records += 1
            else:
                report.schema_errors.append(err or f"Line {idx}: Validation failed")

    report.passed = (
        report.total_records > 0
        and report.valid_records == report.total_records
        and len(report.cliche_violations) == 0
    )
    return report


def audit_all_datasets(data_dir: Path) -> Dict[str, ValidationReport]:
    """Audit all 3 post-training datasets in data_dir."""
    files_to_check = {
        "sft_kg": data_dir / "sft_kg_extractor.jsonl",
        "dpo_artisan": data_dir / "dpo_artisan_writer.jsonl",
        "contrastive_embed": data_dir / "contrastive_bge_triplets.jsonl",
    }
    reports: Dict[str, ValidationReport] = {}
    for dtype, path in files_to_check.items():
        if path.exists():
            reports[dtype] = audit_dataset_file(path, dtype)
    return reports


def main() -> int:
    parser = argparse.ArgumentParser(description="Solstice Post-Training Dataset Validator")
    parser.add_argument("--data-dir", type=str, default="training/data", help="Path to data directory")
    parser.add_argument("--sft-file", type=str, default="", help="Specific SFT file to audit")
    parser.add_argument("--dpo-file", type=str, default="", help="Specific DPO file to audit")
    parser.add_argument("--embed-file", type=str, default="", help="Specific Embed file to audit")
    args = parser.parse_args()

    data_dir = Path(args.data_dir)
    reports: List[ValidationReport] = []

    if args.sft_file:
        reports.append(audit_dataset_file(Path(args.sft_file), "sft_kg"))
    if args.dpo_file:
        reports.append(audit_dataset_file(Path(args.dpo_file), "dpo_artisan"))
    if args.embed_file:
        reports.append(audit_dataset_file(Path(args.embed_file), "contrastive_embed"))

    if not reports:
        all_rep = audit_all_datasets(data_dir)
        reports = list(all_rep.values())

    if not reports:
        print(f"Warning: No dataset files found in {data_dir}")
        return 0

    all_passed = True
    print("\n" + "=" * 70)
    print(" ✦ SOLSTICE POST-TRAINING DATASET AUDIT REPORT")
    print("=" * 70)

    for rep in reports:
        status = "PASSED ✓" if rep.passed else "FAILED ✗"
        print(f"\nDataset: [{rep.dataset_name}]")
        print(f"File:    {rep.file_path}")
        print(f"Status:  {status} | Valid: {rep.valid_records}/{rep.total_records} ({rep.pass_rate:.1f}%)")
        if rep.cliche_violations:
            print("  [!] Cliché Violations in 'chosen':")
            for viol in rep.cliche_violations[:5]:
                print(f"      - {viol}")
        if rep.schema_errors and not rep.passed:
            print("  [!] Schema Errors (sample):")
            for err in rep.schema_errors[:5]:
                print(f"      - {err}")
        if not rep.passed:
            all_passed = False

    print("\n" + "=" * 70)
    if all_passed:
        print("RESULT: ALL DATASETS PASSED ZERO-CLICHÉ AND SCHEMA AUDITS ✓")
        print("=" * 70 + "\n")
        return 0
    else:
        print("RESULT: DATASET AUDIT FAILED ✗")
        print("=" * 70 + "\n")
        return 1


if __name__ == "__main__":
    sys.exit(main())
