"""Solstice-GRPO: Verifier-Driven Group Relative Policy Optimization."""

from training.rl_grpo.deterministic_verifiers import (
    SolsticeGRPOVerifier,
    verify_zero_fabrication,
    score_anti_cliche,
    score_information_density,
    score_kg_keyword_coverage,
    compute_grpo_advantages,
    compute_kl_divergence,
    compute_grpo_surrogate_loss,
)
from training.rl_grpo.grpo_trainer import GRPOTrainer

__all__ = [
    "SolsticeGRPOVerifier",
    "verify_zero_fabrication",
    "score_anti_cliche",
    "score_information_density",
    "score_kg_keyword_coverage",
    "compute_grpo_advantages",
    "compute_kl_divergence",
    "compute_grpo_surrogate_loss",
    "GRPOTrainer",
]
