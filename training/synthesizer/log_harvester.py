"""Online Data Flywheel Harvester for Solstice Post-Training Suite.

Harvests online guardrail rollback events from `logs/guardrail_flywheel.jsonl`
(produced by LangGraph AntiAIGuardrailNode and AntiAIGate.log_dpo_pair), converts them into
validated LLaMA-Factory ShareGPT DPO training pairs, and appends them to
`training/data/dpo_artisan_writer.jsonl`.
"""

from __future__ import annotations

import argparse
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

from src.config import settings
from training.synthesizer.prompts_teacher import (
    COMPACT_ARTISAN_TRIGGER,
)
from training.synthesizer.validate_datasets import (
    scan_text_for_cliches,
    validate_dpo_artisan_record,
)

logger = logging.getLogger("solstice.harvester")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


def format_draft_to_text(draft_artifact: Any) -> str:
    """Extract and format textual content from diverse draft artifact schemas."""
    if isinstance(draft_artifact, str):
        return draft_artifact.strip()

    if isinstance(draft_artifact, dict):
        # Case 1: Self-Portrait diagnoses format
        if "diagnoses" in draft_artifact and isinstance(draft_artifact["diagnoses"], list):
            bullets = []
            for item in draft_artifact["diagnoses"]:
                if isinstance(item, dict):
                    carving = item.get("solstice_carving") or item.get("carved_text") or item.get("original_text")
                    if carving:
                        bullets.append(str(carving).strip())
            if bullets:
                return "\n".join(bullets)

        # Case 2: Direct carving or formatted markdown
        for key in ("solstice_carving", "formatted_markdown", "approved_content", "text", "content"):
            if key in draft_artifact and isinstance(draft_artifact[key], str):
                return draft_artifact[key].strip()

        # Fallback: flatten values
        extracted: List[str] = []
        for val in draft_artifact.values():
            if isinstance(val, str) and val.strip():
                extracted.append(val.strip())
            elif isinstance(val, (dict, list)):
                sub = format_draft_to_text(val)
                if sub:
                    extracted.append(sub)
        return "\n".join(extracted)

    if isinstance(draft_artifact, list):
        items = [format_draft_to_text(elem) for elem in draft_artifact]
        return "\n".join(i for i in items if i)

    return str(draft_artifact).strip()


class LogHarvester:
    """Converts online guardrail rollback pairs into validated DPO training records."""

    def __init__(
        self,
        flywheel_log_path: Optional[Path] = None,
        output_dpo_path: Optional[Path] = None,
    ):
        self.flywheel_log_path = flywheel_log_path or settings.get_flywheel_path()
        self.output_dpo_path = output_dpo_path or Path("training/data/dpo_artisan_writer.jsonl")

    def create_mock_flywheel_entry(self) -> Dict[str, Any]:
        """Create a representative mock flywheel entry for testing and pipeline bootstrapping."""
        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "session_id": "session_bootstrap_001",
            "prompt_context": "Remove banned clichés: 赋能, 闭环. Replace unverified '45%' with placeholder.",
            "rejected": {
                "diagnoses": [
                    {
                        "original_text": "Participated in backend optimization.",
                        "solstice_carving": "深度赋能微服务架构，以RPC调用作为核心抓手，形成全链路闭环，显著提升性能45%。",
                    }
                ]
            },
            "chosen": {
                "diagnoses": [
                    {
                        "original_text": "Participated in backend optimization.",
                        "solstice_carving": "重构gRPC连接池与Protobuf序列化机制，消除连接重建瓶颈，将高并发下p99延迟压缩至 [补充具体指标：如由 X ms 降低至 Y ms]。",
                    }
                ]
            },
            "audit_violations": {
                "cliche_detected": ["赋能", "抓手", "闭环", "显著提升"],
                "hallucinated_metrics": ["45%"],
            },
        }

    def process_flywheel_event(self, raw_event: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Process a single flywheel log line into an audited DPO record."""
        rejected_raw = raw_event.get("rejected")
        chosen_raw = raw_event.get("chosen")

        if not rejected_raw or not chosen_raw:
            return None

        rejected_text = format_draft_to_text(rejected_raw)
        chosen_text = format_draft_to_text(chosen_raw)

        if not rejected_text or not chosen_text or rejected_text == chosen_text:
            return None

        # Sanity check: Ensure chosen has zero cliché leakage
        chosen_cliches = scan_text_for_cliches(chosen_text)
        if chosen_cliches:
            logger.warning(
                f"Skipping flywheel entry: chosen text still contains clichés: {chosen_cliches}"
            )
            return None

        prompt_context = raw_event.get("prompt_context", "Rewrite career experience using STAR-L syntax.")
        session_id = raw_event.get("session_id", "online_session")

        dpo_record: Dict[str, Any] = {
            "conversations": [
                {"from": "system", "value": COMPACT_ARTISAN_TRIGGER},
                {
                    "from": "human",
                    "value": f"Context: {prompt_context} | Session: {session_id} | Raw Fragment: {rejected_text[:120]}...",
                },
            ],
            "chosen": {"from": "gpt", "value": chosen_text},
            "rejected": {"from": "gpt", "value": rejected_text},
        }

        # Strict validation
        is_valid, err = validate_dpo_artisan_record(dpo_record)
        if not is_valid:
            logger.warning(f"Harvested DPO pair rejected by validator: {err}")
            return None

        return dpo_record

    def harvest(self) -> int:
        """Harvest all valid pairs from flywheel log, validate, and append to DPO dataset."""
        if not self.flywheel_log_path.exists():
            logger.info(f"Flywheel log {self.flywheel_log_path} not found. Creating bootstrap entry...")
            self.flywheel_log_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.flywheel_log_path, "w", encoding="utf-8") as f:
                f.write(json.dumps(self.create_mock_flywheel_entry(), ensure_ascii=False) + "\n")

        # Load existing output records to prevent duplicates
        existing_signatures: Set[str] = set()
        if self.output_dpo_path.exists():
            with open(self.output_dpo_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line:
                        try:
                            rec = json.loads(line)
                            sig = rec.get("chosen", {}).get("value", "")[:100]
                            existing_signatures.add(sig)
                        except Exception:
                            pass

        harvested_count = 0
        new_records: List[Dict[str, Any]] = []

        with open(self.flywheel_log_path, "r", encoding="utf-8") as f:
            for idx, line in enumerate(f):
                line = line.strip()
                if not line:
                    continue
                try:
                    event = json.loads(line)
                except Exception as e:
                    logger.warning(f"Error parsing log line {idx}: {e}")
                    continue

                dpo_pair = self.process_flywheel_event(event)
                if dpo_pair:
                    sig = dpo_pair["chosen"]["value"][:100]
                    if sig not in existing_signatures:
                        existing_signatures.add(sig)
                        new_records.append(dpo_pair)
                        harvested_count += 1

        if new_records:
            self.output_dpo_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.output_dpo_path, "a", encoding="utf-8") as f:
                for rec in new_records:
                    f.write(json.dumps(rec, ensure_ascii=False) + "\n")

            logger.info(
                f"Successfully harvested {harvested_count} new DPO pairs into {self.output_dpo_path}"
            )
        else:
            logger.info("No new unique DPO pairs harvested from flywheel.")

        return harvested_count


def main() -> None:
    parser = argparse.ArgumentParser(description="Solstice Online Flywheel Log Harvester")
    parser.add_argument(
        "--flywheel-log",
        type=str,
        default="logs/guardrail_flywheel.jsonl",
        help="Path to guardrail flywheel JSONL log file",
    )
    parser.add_argument(
        "--output",
        type=str,
        default="training/data/dpo_artisan_writer.jsonl",
        help="Path to target DPO JSONL file",
    )
    parser.add_argument(
        "--bootstrap",
        action="store_true",
        help="Generate a bootstrap flywheel entry if log does not exist",
    )
    args = parser.parse_args()

    harvester = LogHarvester(
        flywheel_log_path=Path(args.flywheel_log),
        output_dpo_path=Path(args.output),
    )
    count = harvester.harvest()
    print(f"Harvester finished. Harvested {count} pairs.")


if __name__ == "__main__":
    main()
