"""Dual-Layer Anti-AI Guardrail for Solstice.

Layer 1: Deterministic Regex Gate for banned AI clichés and unverified metrics.
Layer 2: LLM Fact & Style Critic verifying Zero-Fabrication against user_profile_graph.
Flywheel: Logs (rejected_draft, approved_draft) pairs to logs/guardrail_flywheel.jsonl for DPO training.
"""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set, Tuple

from src.config import settings
from src.state import AntiAIAuditOutput


# Banned Cliché Vocabulary
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
    r"\bdelve\b",
    r"\btestament\b",
    r"\btapestry\s+of\b",
    r"\bspearheaded\b",
    r"\bsynergy\b",
    r"\bparadigm\s+shift\b",
    r"\bgame[- ]changer\b",
]

# Regex to detect metrics: e.g. 40%, 15ms, 10000 QPS, 3倍, 50万
METRIC_REGEX = re.compile(
    r"(?<!\[补充)(?:(?:\d+(?:\.\d+)?)\s*(?:%|ms|毫秒|s|秒|QPS|qps|tps|TPS|万|倍|倍速|GB|MB|TB|Core))",
    re.IGNORECASE
)

# Regex to detect explicit placeholder tokens like [补充具体指标：如检索延迟降低 X% / 准确率由 Y% 提升至 Z%]
PLACEHOLDER_REGEX = re.compile(r"\[补充[^\]]*\]")


def extract_all_text_fragments(data: Any) -> List[str]:
    """Recursively extract all string values from nested dict/list/string artifacts."""
    fragments: List[str] = []
    if isinstance(data, str):
        fragments.append(data)
    elif isinstance(data, dict):
        for val in data.values():
            fragments.extend(extract_all_text_fragments(val))
    elif isinstance(data, list):
        for item in data:
            fragments.extend(extract_all_text_fragments(item))
    return fragments


def extract_verified_metrics(user_profile_graph: Dict[str, Any]) -> Set[str]:
    """Extract all verified metric values and keywords from user profile graph."""
    verified: Set[str] = set()
    nodes = user_profile_graph.get("nodes", [])
    for node in nodes:
        if isinstance(node, dict):
            # Check metric type nodes or verified values
            if node.get("type") == "Metric":
                val = str(node.get("value", "")).strip().lower()
                if val:
                    verified.add(val)
            name = str(node.get("name", "")).strip().lower()
            if name:
                verified.add(name)
            val = str(node.get("value", "")).strip().lower()
            if val:
                verified.add(val)
    return verified


class AntiAIGate:
    """Dual-Layer Anti-AI Quality and Authenticity Gate."""

    def __init__(self, model_router: Optional[Any] = None):
        self.model_router = model_router

    @classmethod
    def scan_cliches(cls, text: str) -> List[str]:
        """Layer 1: Fast zero-latency scan for banned Chinese and English clichés."""
        detected: List[str] = []
        for word in BANNED_CN_CLICHES:
            if word in text and word not in detected:
                detected.append(word)

        for pattern in BANNED_EN_CLICHES:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for m in matches:
                normalized = m.lower().strip()
                if normalized not in detected:
                    detected.append(normalized)

        return detected

    @classmethod
    def scan_fabricated_metrics(
        cls,
        text: str,
        verified_metrics: Set[str]
    ) -> List[str]:
        """Layer 1: Detect quantitative metrics that are not in user_profile_graph and not in [补充...] placeholders."""
        hallucinated: List[str] = []

        # Mask out legitimate [补充...] placeholder expressions so metrics inside them are not flagged
        masked_text = PLACEHOLDER_REGEX.sub("[PLACEHOLDER_MASKED]", text)

        matches = METRIC_REGEX.findall(masked_text)
        for match in matches:
            clean_match = match.strip()
            # If the metric is not accounted for in verified metrics
            is_grounded = False
            for v in verified_metrics:
                if clean_match.lower() in v or v in clean_match.lower():
                    is_grounded = True
                    break
            if not is_grounded:
                if clean_match not in hallucinated:
                    hallucinated.append(clean_match)

        return hallucinated

    def layer1_deterministic_audit(
        self,
        draft_artifacts: Dict[str, Any],
        user_profile_graph: Dict[str, Any]
    ) -> AntiAIAuditOutput:
        """Execute deterministic Layer 1 audit across all text fragments in draft_artifacts."""
        text_fragments = extract_all_text_fragments(draft_artifacts)
        combined_text = "\n".join(text_fragments)

        cliches = self.scan_cliches(combined_text)
        verified = extract_verified_metrics(user_profile_graph)
        hallucinations = self.scan_fabricated_metrics(combined_text, verified)

        if cliches or hallucinations:
            instructions: List[str] = []
            if cliches:
                instructions.append(f"Remove banned clichés: {', '.join(cliches)}.")
            if hallucinations:
                instructions.append(
                    f"Replace unverified metrics ({', '.join(hallucinations)}) with explicit "
                    f"[补充具体指标：如检索延迟降低 X% / 准确率由 Y% 提升至 Z%] placeholders."
                )
            return AntiAIAuditOutput(
                passed=False,
                cliche_detected=cliches,
                hallucinated_metrics=hallucinations,
                rewrite_instruction=" ".join(instructions)
            )

        return AntiAIAuditOutput(
            passed=True,
            cliche_detected=[],
            hallucinated_metrics=[],
            rewrite_instruction=""
        )

    def audit(
        self,
        draft_artifacts: Dict[str, Any],
        user_profile_graph: Dict[str, Any]
    ) -> AntiAIAuditOutput:
        """Execute full Dual-Layer Audit: Layer 1 deterministic gate + optional Layer 2 critic."""
        # Layer 1 scan
        l1_result = self.layer1_deterministic_audit(draft_artifacts, user_profile_graph)
        if not l1_result.passed:
            return l1_result

        # Layer 2: If router is provided and active, run LLM fact and style critic
        if self.model_router is not None:
            try:
                l2_result = self.model_router.run_critic(draft_artifacts, user_profile_graph)
                if not l2_result.passed:
                    return l2_result
            except Exception:
                # Fall back to deterministic L1 pass if LLM call fails
                return l1_result

        return l1_result


def log_dpo_pair(
    rejected_draft: Dict[str, Any],
    approved_draft: Dict[str, Any],
    audit_reason: Dict[str, Any],
    session_id: str
) -> None:
    """Log rejected draft and its approved rewrite to guardrail flywheel JSONL for DPO model training."""
    record = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "session_id": session_id,
        "prompt_context": audit_reason.get("rewrite_instruction", ""),
        "rejected": rejected_draft,
        "chosen": approved_draft,
        "audit_violations": {
            "cliche_detected": audit_reason.get("cliche_detected", []),
            "hallucinated_metrics": audit_reason.get("hallucinated_metrics", [])
        }
    }
    path = settings.get_flywheel_path()
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")
