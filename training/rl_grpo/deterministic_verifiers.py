"""Deterministic Reward Verifiers and Group Relative Advantage Estimator for Solstice-GRPO.

Implements the multi-objective verification suite:
1. Multiplicative Zero-Fabrication Hard Gate (collapses to -1.0 on unverified metrics).
2. Anti-Cliché Exponential Decay Penalty.
3. Information Density & Length Brevity Scorer.
4. KG Keyword Coverage Scorer.
5. Group Advantage Normalizer (sum(A_i) == 0).
6. Analytical KL Divergence and Clipped GRPO Surrogate Loss.
"""

from __future__ import annotations

import math
import re
from typing import Any, Dict, List, Optional, Set, Union

import numpy as np
import torch

# Banned AI Clichés (Chinese & English)
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

# Low-information filler adverbs to penalize
FILLER_ADVERBS: List[str] = [
    "非常",
    "极大地",
    "十分",
    "深入地",
    "显著地",
    "essentially",
    "drastically",
    "significantly",
    "deeply",
    "greatly",
    "substantially",
]

# High-impact active engineering verbs
HIGH_IMPACT_VERBS: List[str] = [
    "architected",
    "implemented",
    "optimized",
    "benchmarked",
    "deployed",
    "refactored",
    "built",
    "engineered",
    "constructed",
    "designed",
    "scaled",
    "重构",
    "设计",
    "实现",
    "构建",
    "优化",
    "部署",
    "搭建",
    "研发",
    "测试",
]

# Metric detection regex matching quantitative figures with units
METRIC_REGEX = re.compile(
    r"(?<!\[补充)(?:(?:\d+(?:\.\d+)?)\s*(?:%|ms|毫秒|s|秒|QPS|qps|tps|TPS|万|倍|倍速|GB|MB|TB|Core|k|w|次))",
    re.IGNORECASE
)

# Placeholder regex to safely mask allowable dynamic slots
PLACEHOLDER_REGEX = re.compile(r"\[补充[^\]]*\]")


def verify_zero_fabrication(draft: str, verified_kg_metrics: List[str]) -> float:
    """Multiplicative Zero-Fabrication Hard Gate.
    
    Extracts all numerical and quantitative claims from draft.
    Ignores numbers safely wrapped in [补充...] placeholders.
    Returns 1.0 if 100% of extracted numbers exist in verified_kg_metrics, else 0.0.
    """
    # 1. Mask out legitimate interactive placeholders
    masked_draft = PLACEHOLDER_REGEX.sub("[PLACEHOLDER_MASKED]", draft)

    # 2. Extract quantitative metric claims
    matches = METRIC_REGEX.findall(masked_draft)
    if not matches:
        return 1.0

    # Normalize verified metrics
    verified_normalized = [v.strip().lower() for v in verified_kg_metrics if v]

    # 3. Verify each detected metric against verified ground truth
    for m in matches:
        clean_m = m.strip().lower()
        # Check substring containment in both directions
        is_grounded = any(clean_m in v or v in clean_m for v in verified_normalized)
        if not is_grounded:
            return 0.0

    return 1.0


def score_anti_cliche(draft: str) -> float:
    """Computes exponential decay penalty on banned AI buzzwords and filler adverbs.
    
    Score = exp(-2.0 * cliche_count).
    """
    text_lower = draft.lower()
    count = 0

    # Check CN clichés
    for c in BANNED_CN_CLICHES:
        count += text_lower.count(c.lower())

    # Check EN clichés regex
    for pattern in BANNED_EN_CLICHES:
        count += len(re.findall(pattern, text_lower))

    # Check filler adverbs
    for adv in FILLER_ADVERBS:
        count += text_lower.count(adv.lower())

    return float(math.exp(-2.0 * count))


def score_information_density(draft: str, kg_entities: List[str]) -> float:
    """Computes ratio of verified technical entities + action verbs to token length.
    
    Penalizes verbosity above 85 tokens per bullet.
    """
    # Tokenize by words / CJK characters
    tokens = re.findall(r"[\u4e00-\u9fff]|[a-zA-Z0-9_\-\.\%]+", draft)
    num_tokens = max(len(tokens), 1)

    text_lower = draft.lower()

    # Count matching technical entities
    entity_hits = 0
    for entity in kg_entities:
        if entity and entity.lower() in text_lower:
            entity_hits += 1

    # Count matching active verbs
    verb_hits = 0
    for verb in HIGH_IMPACT_VERBS:
        if verb.lower() in text_lower:
            verb_hits += 1

    # Signal density
    signal_count = entity_hits * 2.0 + verb_hits * 1.5
    raw_density = min(signal_count / float(num_tokens), 1.0)

    # Verbosity penalty if tokens > 85
    if num_tokens > 85:
        length_penalty = 85.0 / float(num_tokens)
        density = raw_density * length_penalty
    else:
        density = raw_density

    return float(max(min(density, 1.0), 0.0))


def score_kg_keyword_coverage(draft: str, target_kg_keywords: List[str]) -> float:
    """Computes coverage fraction of target Knowledge Graph keywords."""
    if not target_kg_keywords:
        return 1.0

    text_lower = draft.lower()
    matched = sum(1 for kw in target_kg_keywords if kw and kw.lower() in text_lower)
    return float(matched / max(len(target_kg_keywords), 1))


class SolsticeGRPOVerifier:
    """Deterministic Multi-Objective Reward Verifier Suite for Solstice-GRPO."""

    def __init__(
        self,
        w_cliche: float = 0.35,
        w_density: float = 0.35,
        w_kg: float = 0.30,
        beta_kl: float = 0.04
    ):
        self.w_cliche = w_cliche
        self.w_density = w_density
        self.w_kg = w_kg
        self.beta_kl = beta_kl

    def compute_reward(
        self,
        draft: str,
        verified_kg_metrics: List[str],
        kg_entities: Optional[List[str]] = None,
        target_kg_keywords: Optional[List[str]] = None,
        kl_penalty: float = 0.0
    ) -> float:
        """Computes composite reward with Multiplicative Zero-Fabrication Gate.
        
        R_total = I_hallucination_free * (
            0.35 * R_anti_cliche + 0.35 * R_star_density + 0.30 * R_kg_keyword_coverage
        ) - beta * KL_penalty.
        
        If I_hallucination_free == 0, R_total immediately collapses to -1.0.
        """
        i_hallucination_free = verify_zero_fabrication(draft, verified_kg_metrics)
        if i_hallucination_free == 0.0:
            # Immediate hard penalty collapse
            return -1.0

        r_anti_cliche = score_anti_cliche(draft)
        r_star_density = score_information_density(draft, kg_entities or [])
        r_kg_keyword_coverage = score_kg_keyword_coverage(draft, target_kg_keywords or [])

        content_reward = (
            self.w_cliche * r_anti_cliche
            + self.w_density * r_star_density
            + self.w_kg * r_kg_keyword_coverage
        )

        r_total = content_reward - self.beta_kl * kl_penalty
        return float(r_total)

    def evaluate_group(
        self,
        group_drafts: List[str],
        verified_kg_metrics: List[str],
        kg_entities: Optional[List[str]] = None,
        target_kg_keywords: Optional[List[str]] = None,
        kl_penalties: Optional[List[float]] = None
    ) -> torch.Tensor:
        """Evaluates rewards for a group of G candidate outputs."""
        G = len(group_drafts)
        kls = kl_penalties if kl_penalties is not None else [0.0] * G

        rewards = []
        for i in range(G):
            r = self.compute_reward(
                draft=group_drafts[i],
                verified_kg_metrics=verified_kg_metrics,
                kg_entities=kg_entities,
                target_kg_keywords=target_kg_keywords,
                kl_penalty=kls[i]
            )
            rewards.append(r)

        return torch.tensor(rewards, dtype=torch.float32)


def compute_grpo_advantages(rewards: torch.Tensor) -> torch.Tensor:
    """Computes group-normalized advantages A_i = (r_i - mean(r)) / (std(r) + 1e-8).
    
    Guarantees sum(A_i) == 0 across each group.
    
    Args:
        rewards: Tensor of shape (G,) or (B, G).
    """
    if rewards.dim() == 1:
        mean = rewards.mean()
        std = rewards.std(unbiased=False)
        if float(std) < 1e-7:
            return torch.zeros_like(rewards)
        advantages = (rewards - mean) / (std + 1e-8)
        # Numerical zero-mean correction
        advantages = advantages - advantages.mean()
        return advantages
    elif rewards.dim() == 2:
        mean = rewards.mean(dim=-1, keepdim=True)
        std = rewards.std(dim=-1, keepdim=True, unbiased=False)
        zero_std_mask = (std < 1e-7)
        safe_std = torch.where(zero_std_mask, torch.ones_like(std), std)
        advantages = (rewards - mean) / (safe_std + 1e-8)
        advantages = torch.where(zero_std_mask.expand_as(advantages), torch.zeros_like(advantages), advantages)
        advantages = advantages - advantages.mean(dim=-1, keepdim=True)
        return advantages
    else:
        raise ValueError(f"Expected 1D or 2D rewards tensor, got shape {rewards.shape}")


def compute_kl_divergence(
    log_probs: torch.Tensor,
    ref_log_probs: torch.Tensor
) -> torch.Tensor:
    """Computes analytical KL divergence against reference model.
    
    KL(pi_theta || pi_ref) = pi_ref / pi_theta - log(pi_ref / pi_theta) - 1.
    """
    log_ratio = ref_log_probs - log_probs
    ratio = torch.exp(torch.clamp(log_ratio, -10.0, 10.0))
    kl = ratio - log_ratio - 1.0
    return torch.clamp(kl, min=0.0)


def compute_grpo_surrogate_loss(
    log_probs: torch.Tensor,
    old_log_probs: torch.Tensor,
    advantages: torch.Tensor,
    clip_eps: float = 0.2
) -> torch.Tensor:
    """Computes PPO/GRPO clipped surrogate objective loss.
    
    L_surr = -E[ min( ratio * A, clip(ratio, 1-eps, 1+eps) * A ) ].
    """
    ratio = torch.exp(log_probs - old_log_probs)
    surr1 = ratio * advantages
    surr2 = torch.clamp(ratio, 1.0 - clip_eps, 1.0 + clip_eps) * advantages
    clipped_loss = -torch.min(surr1, surr2).mean()
    return clipped_loss
