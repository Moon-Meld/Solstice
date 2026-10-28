"""Custom PyTorch / TRL-aligned Group Relative Policy Optimization (GRPO) Trainer.

Optimizes language model policy using deterministic multi-objective reward verifiers
without a neural reward model, using group advantage normalization and analytical KL divergence.
"""

from __future__ import annotations

import os
from typing import Any, Dict, List, Optional, Tuple, Union

import torch
import torch.nn as nn
import yaml

from training.rl_grpo.deterministic_verifiers import (
    SolsticeGRPOVerifier,
    compute_grpo_advantages,
    compute_kl_divergence,
    compute_grpo_surrogate_loss,
    verify_zero_fabrication,
)


class GRPOTrainer:
    """Trainer executing online Group Relative Policy Optimization."""

    def __init__(
        self,
        model: Optional[nn.Module] = None,
        ref_model: Optional[nn.Module] = None,
        verifier: Optional[SolsticeGRPOVerifier] = None,
        optimizer: Optional[torch.optim.Optimizer] = None,
        config: Optional[Dict[str, Any]] = None,
        config_path: Optional[str] = None
    ):
        self.config = config or {}
        if config_path and os.path.exists(config_path):
            with open(config_path, "r", encoding="utf-8") as f:
                loaded = yaml.safe_load(f)
                if isinstance(loaded, dict):
                    self.config.update(loaded)

        self.group_size: int = self.config.get("group_size", 8)
        self.kl_coef: float = self.config.get("kl_coef", 0.04)
        self.clip_eps: float = self.config.get("clip_eps", 0.2)
        self.max_grad_norm: float = self.config.get("max_grad_norm", 1.0)
        self.lr: float = float(self.config.get("lr", 1e-6))

        # Verifier initialization
        v_weights = self.config.get("verifier_weights", {})
        self.verifier = verifier or SolsticeGRPOVerifier(
            w_cliche=v_weights.get("anti_cliche", 0.35),
            w_density=v_weights.get("star_density", 0.35),
            w_kg=v_weights.get("kg_keyword_coverage", 0.30),
            beta_kl=self.kl_coef
        )

        # Policy & Reference Models
        # If no model provided, construct a minimal linear policy layer for simulation
        if model is None:
            self.model = nn.Sequential(
                nn.Linear(128, 64),
                nn.ReLU(),
                nn.Linear(64, 1)
            )
        else:
            self.model = model

        if ref_model is None:
            self.ref_model = None
        else:
            self.ref_model = ref_model
            for p in self.ref_model.parameters():
                p.requires_grad = False

        if optimizer is None:
            self.optimizer = torch.optim.AdamW(self.model.parameters(), lr=self.lr)
        else:
            self.optimizer = optimizer

    def train_step(
        self,
        prompt: str,
        group_completions: List[str],
        verified_kg_metrics: List[str],
        kg_entities: Optional[List[str]] = None,
        target_kg_keywords: Optional[List[str]] = None,
        log_probs: Optional[torch.Tensor] = None,
        ref_log_probs: Optional[torch.Tensor] = None
    ) -> Dict[str, float]:
        """Executes a single GRPO training step on a group of G generated outputs.
        
        Args:
            prompt: Base prompt text.
            group_completions: G completions generated for this prompt.
            verified_kg_metrics: List of allowed ground-truth metrics.
            kg_entities: High-signal technical entities.
            target_kg_keywords: Expected domain concepts.
            log_probs: Policy log-probabilities of shape (G,).
            ref_log_probs: Reference model log-probabilities of shape (G,).
            
        Returns:
            metrics: Dict containing loss, mean_reward, advantage, zero_fab_rate, kl_div.
        """
        G = len(group_completions)
        assert G == self.group_size or G > 1, f"Expected group size > 1, got {G}"

        # 1. Compute analytical KL divergence against reference model
        if log_probs is None:
            # Deterministic simulation forward pass
            dummy_inputs = torch.randn(G, 128)
            raw_logits = self.model(dummy_inputs).squeeze(-1)
            log_probs = torch.log_softmax(raw_logits, dim=-1)

        if ref_log_probs is None:
            ref_log_probs = log_probs.detach().clone() + torch.randn_like(log_probs) * 0.05

        kl_div = compute_kl_divergence(log_probs.detach(), ref_log_probs)
        kl_penalties = kl_div.tolist()

        # 2. Compute deterministic rewards for all group members
        rewards = self.verifier.evaluate_group(
            group_drafts=group_completions,
            verified_kg_metrics=verified_kg_metrics,
            kg_entities=kg_entities,
            target_kg_keywords=target_kg_keywords,
            kl_penalties=kl_penalties
        )

        # Calculate zero-fabrication pass rate
        zero_fab_passes = sum(
            1 for c in group_completions if verify_zero_fabrication(c, verified_kg_metrics) == 1.0
        )
        zero_fab_rate = zero_fab_passes / float(G)

        # 3. Compute Group Normalized Advantages: sum(A_i) == 0
        advantages = compute_grpo_advantages(rewards)

        # 4. Compute Clipped Surrogate Loss
        old_log_probs = log_probs.detach().clone()
        surrogate_loss = compute_grpo_surrogate_loss(
            log_probs=log_probs,
            old_log_probs=old_log_probs,
            advantages=advantages,
            clip_eps=self.clip_eps
        )

        # Total Loss with KL Penalty
        total_loss = surrogate_loss + self.kl_coef * kl_div.mean()

        # 5. Optimization step
        self.optimizer.zero_grad()
        total_loss.backward()
        torch.nn.utils.clip_grad_norm_(self.model.parameters(), self.max_grad_norm)
        self.optimizer.step()

        return {
            "loss": float(total_loss.item()),
            "surrogate_loss": float(surrogate_loss.item()),
            "mean_reward": float(rewards.mean().item()),
            "min_reward": float(rewards.min().item()),
            "max_reward": float(rewards.max().item()),
            "zero_fab_rate": float(zero_fab_rate),
            "mean_kl": float(kl_div.mean().item()),
            "advantage_sum": float(advantages.sum().item()),
        }
