"""Unit tests for Solstice Dual-Layer Anti-AI Guardrail.

Covers:
- Banned Chinese and English buzzword interception (Layer 1 Regex Gate)
- Metric fabrication detection & Zero-Fabrication enforcement
- Permitted interactive [补充...] placeholders
- Verified metric passthrough from user_profile_graph
- DPO Flywheel JSONL logging
"""

import json
from pathlib import Path
import pytest

from src.config import settings
from src.guardrails.anti_ai_gate import (
    AntiAIGate,
    log_dpo_pair,
    BANNED_CN_CLICHES,
    BANNED_EN_CLICHES,
)


def test_banned_cn_cliche_interception():
    """Verify that all banned Chinese corporate clichés are detected."""
    gate = AntiAIGate()
    for word in ["赋能", "抓手", "闭环", "组合拳", "深度洞察", "心智", "拉齐", "颗粒度对齐", "显著提升", "全链路赋能", "底层逻辑"]:
        text = f"通过微服务架构深度{word}业务系统，提高整体吞吐。"
        detected = gate.scan_cliches(text)
        assert len(detected) > 0, f"Failed to detect Chinese cliché: {word}"
        assert any(word in d for d in detected)


def test_banned_en_cliche_interception():
    """Verify that banned English AI clichés are intercepted with word boundary checks."""
    gate = AntiAIGate()
    test_cases = [
        ("We should delve into the deterministic state machine.", "delve"),
        ("This platform is a testament to rigorous engineering.", "testament"),
        ("Created a rich tapestry of microservices.", "tapestry of"),
        ("Spearheaded the migration of the graph engine.", "spearheaded"),
        ("Achieved cross-team synergy across distributed nodes.", "synergy"),
        ("Introduced a paradigm shift in career counseling.", "paradigm shift"),
        ("Engineered a game-changer vector retrieval feature.", "game-changer"),
    ]
    for text, expected in test_cases:
        detected = gate.scan_cliches(text)
        assert len(detected) > 0, f"Failed to detect English cliché: {expected} in '{text}'"
        assert any(expected.replace(" ", "") in d.replace(" ", "") for d in detected)


def test_metric_fabrication_interception(sample_user_graph):
    """Verify that unverified quantitative metrics are flagged as hallucinated."""
    gate = AntiAIGate()
    unverified_text = "Optimized retrieval pipeline, cutting query latency by 45% and achieving 5000 QPS."
    verified = {"12 core unit tests passed"}

    hallucinated = gate.scan_fabricated_metrics(unverified_text, verified)
    assert len(hallucinated) >= 1
    assert any("45%" in h or "5000" in h or "qps" in h.lower() for h in hallucinated)


def test_metric_placeholder_allowed(sample_user_graph):
    """Verify that quantitative figures inside [补充...] placeholders are not flagged."""
    gate = AntiAIGate()
    placeholder_text = (
        "Architected deterministic LangGraph state machine, accelerating test execution while maintaining "
        "[补充具体指标：如检索延迟降低 45% / 准确率由 80% 提升至 95%]."
    )
    verified = {"12 core unit tests passed"}

    hallucinated = gate.scan_fabricated_metrics(placeholder_text, verified)
    assert len(hallucinated) == 0, f"Placeholders should not be flagged: {hallucinated}"


def test_verified_metrics_allowed(sample_user_graph):
    """Verify that metrics explicitly recorded in user_profile_graph pass without flags."""
    gate = AntiAIGate()
    verified_text = "Validated multi-agent orchestration engine with 12 core unit tests passed in CI/CD pipeline."
    draft = {
        "diagnoses": [
            {
                "original_text": "ran unit tests",
                "structural_flaw": "vague",
                "solstice_carving": verified_text,
                "artisan_notes": "anchored verified test count"
            }
        ]
    }

    result = gate.layer1_deterministic_audit(draft, sample_user_graph)
    assert result.passed is True
    assert result.cliche_detected == []
    assert result.hallucinated_metrics == []


def test_layer1_audit_rejection_composite(sample_user_graph):
    """Verify composite rejection when both clichés and fabricated metrics are present."""
    gate = AntiAIGate()
    bad_draft = {
        "diagnoses": [
            {
                "original_text": "worked on project",
                "structural_flaw": "none",
                "solstice_carving": "全面赋能核心系统，实现性能显著提升 60% 与超低延迟 15ms。",
                "artisan_notes": "none"
            }
        ]
    }

    audit = gate.audit(bad_draft, sample_user_graph)
    assert audit.passed is False
    assert "赋能" in audit.cliche_detected or "显著提升" in audit.cliche_detected
    assert any("60%" in m or "15ms" in m for m in audit.hallucinated_metrics)
    assert "Remove banned clichés" in audit.rewrite_instruction
    assert "[补充具体指标" in audit.rewrite_instruction


def test_dpo_flywheel_logging(tmp_path):
    """Verify that (rejected, chosen) pairs are written in valid JSONL format."""
    rejected = {"carving": "全面赋能系统，性能提升 50%"}
    approved = {"carving": "重构系统调度器，执行 [补充具体指标：如延迟降低 X%]"}
    audit_reason = {
        "cliche_detected": ["赋能"],
        "hallucinated_metrics": ["50%"],
        "rewrite_instruction": "Remove '赋能' and replace '50%' with placeholder."
    }
    session_id = "test_sess_001"

    log_dpo_pair(rejected, approved, audit_reason, session_id)

    log_path = Path(settings.guardrail_flywheel_path)
    assert log_path.exists()

    with open(log_path, "r", encoding="utf-8") as f:
        lines = f.readlines()
        assert len(lines) == 1
        record = json.loads(lines[0])
        assert record["session_id"] == session_id
        assert record["rejected"] == rejected
        assert record["chosen"] == approved
        assert "赋能" in record["audit_violations"]["cliche_detected"]
