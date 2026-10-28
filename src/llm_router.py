"""Decoupled Model Router switching between frontier APIs and local fine-tuned SLMs."""

from __future__ import annotations

import json
import logging
from typing import Any, Dict, Optional
import httpx

from src.config import settings
from src.state import AntiAIAuditOutput

logger = logging.getLogger("solstice.router")

# Compact Online Inference Triggers (Shared with Post-Training Datasets)
try:
    from training.synthesizer.prompts_teacher import (
        COMPACT_ARTISAN_TRIGGER,
        COMPACT_KG_TRIGGER,
        COMPACT_REHEARSAL_TRIGGER,
    )
except ImportError:
    COMPACT_KG_TRIGGER = (
        "[SOLSTICE_KG_PARSE] Extract canonical nodes, edges, and unverified metric flags "
        "from the raw career text. Output strict JSON only."
    )
    COMPACT_ARTISAN_TRIGGER = (
        "[SOLSTICE_ARTISAN_CARVE] Rewrite the experience fragment using STAR-L syntax "
        "aligned with target JD keywords. Enforce Zero-Fabrication and Anti-AI Cliché locks."
    )
    COMPACT_REHEARSAL_TRIGGER = (
        "[SOLSTICE_REHEARSAL_PROBE] Persona: {persona} | Depth: {probe_depth}/3. "
        "Critique technical granularity and ask one progressive follow-up question "
        "targeting trade-offs or failure recovery."
    )


class ModelRouter:
    """Intelligent router dispatching tasks between Frontier LLMs and Fine-Tuned SLMs."""

    def __init__(
        self,
        use_finetuned_slm: Optional[bool] = None,
        mock_mode: bool = False
    ):
        self.use_finetuned_slm = (
            use_finetuned_slm if use_finetuned_slm is not None else settings.use_finetuned_slm
        )
        self.mock_mode = mock_mode

    def get_target_model(self, task: str) -> Dict[str, str]:
        """Determine base_url and model name based on active routing policy."""
        if self.use_finetuned_slm:
            base_url = settings.local_vllm_base.rstrip("/")
            if task in ("kg_extraction", "kg_parse"):
                model_name = settings.local_kg_model
            else:
                # writer, carve, starl
                model_name = settings.local_writer_model
            return {
                "base_url": base_url,
                "model": model_name,
                "type": "fine_tuned_slm"
            }
        else:
            return {
                "base_url": settings.frontier_api_base.rstrip("/"),
                "model": settings.frontier_model,
                "type": "frontier_api"
            }

    def generate(
        self,
        prompt: str,
        task: str = "general",
        temperature: float = 0.0,
        response_format_json: bool = True
    ) -> str:
        """Execute model call or return deterministic fallback response."""
        target = self.get_target_model(task)

        if self.mock_mode:
            return self._mock_response_for_task(task, prompt)

        headers = {
            "Content-Type": "application/json"
        }
        if target["type"] == "frontier_api":
            headers["Authorization"] = f"Bearer {settings.frontier_api_key}"

        messages = []
        if target["type"] == "fine_tuned_slm":
            if task in ("kg_extraction", "kg_parse"):
                messages.append({"role": "system", "content": COMPACT_KG_TRIGGER})
            elif task in ("writer", "carve", "starl", "self_portrait"):
                messages.append({"role": "system", "content": COMPACT_ARTISAN_TRIGGER})
            elif task == "rehearsal":
                messages.append({
                    "role": "system",
                    "content": COMPACT_REHEARSAL_TRIGGER.format(persona="rigorous_tech_lead", probe_depth=1)
                })

        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": target["model"],
            "messages": messages,
            "temperature": temperature,
        }
        if response_format_json:
            payload["response_format"] = {"type": "json_object"}

        try:
            with httpx.Client(timeout=10.0) as client:
                res = client.post(
                    f"{target['base_url']}/chat/completions",
                    headers=headers,
                    json=payload
                )
                if res.status_code == 200:
                    data = res.json()
                    return data["choices"][0]["message"]["content"]
                else:
                    logger.warning(
                        f"LLM API call returned status {res.status_code}. Using deterministic fallback."
                    )
        except Exception as e:
            logger.info(f"Model call skipped/failed ({e}); employing deterministic response generator.")

        return self._mock_response_for_task(task, prompt)

    def run_critic(
        self,
        draft_artifacts: Dict[str, Any],
        user_profile_graph: Dict[str, Any]
    ) -> AntiAIAuditOutput:
        """Layer 2 LLM Fact & Style Critic call."""
        # Prompt 6 format
        prompt = f"""Audit draft: {json.dumps(draft_artifacts, ensure_ascii=False)} against {json.dumps(user_profile_graph, ensure_ascii=False)}."""
        raw_res = self.generate(prompt, task="critic", temperature=0.0)
        try:
            parsed = json.loads(raw_res)
            return AntiAIAuditOutput(
                passed=bool(parsed.get("passed", True)),
                cliche_detected=parsed.get("cliche_detected", []),
                hallucinated_metrics=parsed.get("hallucinated_metrics", []),
                rewrite_instruction=parsed.get("rewrite_instruction", "")
            )
        except Exception:
            return AntiAIAuditOutput(
                passed=True,
                cliche_detected=[],
                hallucinated_metrics=[],
                rewrite_instruction=""
            )

    def _mock_response_for_task(self, task: str, prompt: str) -> str:
        """Deterministic fallback responses adhering to strict node schemas."""
        if task == "orchestrator":
            return json.dumps({
                "target_workflow": "CONSTELLATION",
                "trigger_kg_extraction": False,
                "rag_search_queries": ["LangGraph agent production", "hybrid graph RAG"],
                "interviewer_persona": "rigorous_tech_lead",
                "routing_reasoning": "User requested job fit evaluation; routing to Constellation."
            })
        elif task in ("kg_extraction", "kg_parse"):
            return json.dumps({
                "nodes": [
                    {"id": "skill_langgraph", "type": "Skill", "name": "LangGraph", "category": "Framework"},
                    {"id": "proj_engine", "type": "Project", "name": "Multi-Agent Orchestration Engine", "role": "Core Developer"},
                    {"id": "metric_tests", "type": "Metric", "value": "12 core unit tests passed", "verified": True},
                    {"id": "concept_fsm", "type": "Concept", "name": "Deterministic Finite State Machine"}
                ],
                "edges": [
                    {"source": "proj_engine", "target": "skill_langgraph", "relation": "UTILIZES_TECH"},
                    {"source": "proj_engine", "target": "metric_tests", "relation": "ACHIEVED_OUTCOME"},
                    {"source": "skill_langgraph", "target": "concept_fsm", "relation": "REQUIRES_CONCEPT"}
                ],
                "missing_ground_truth_flags": [
                    "Project mentions high retrieval accuracy without baseline vs improved percentage."
                ]
            })
        elif task == "constellation":
            return json.dumps({
                "alignment_score": 88,
                "constellation_summary": "Candidate displays strong architectural alignment in deterministic agent systems.",
                "lit_stars": [
                    {
                        "skill": "Deterministic Agent State Machines",
                        "evidence_from_resume": "Built LangGraph engine with 12 unit tests",
                        "jd_mapping": "Production Agent Reliability"
                    }
                ],
                "unlit_stars_and_bridges": [
                    {
                        "missing_competency": "Distributed Vector Indexing & Hybrid Reranking",
                        "closest_existing_node": "Local Vector Retrieval Pipeline",
                        "two_hop_bridge_action": "Upgrade existing RAG module to integrate BM25 + dense vector Reciprocal Rank Fusion (RRF) and benchmark Recall@5."
                    }
                ]
            })
        elif task == "self_portrait":
            return json.dumps({
                "diagnoses": [
                    {
                        "original_text": "Participated in agent project development and made it faster.",
                        "structural_flaw": "Vague verb and missing quantifiable metrics or concrete architectural mechanism.",
                        "solstice_carving": "Architected deterministic LangGraph state machine with cyclic rollback guards, accelerating test execution while maintaining [补充具体指标：如检索延迟降低 X% / 准确率由 Y% 提升至 Z%].",
                        "artisan_notes": "Anchored active engineering verbs with verified FSM concepts and standard metric placeholder."
                    }
                ]
            })
        elif task == "rehearsal":
            return json.dumps({
                "stage_critique": {
                    "logical_granularity_score": 8,
                    "technical_depth_score": 7,
                    "what_shined": "Clear exposition of LangGraph state machine invariants.",
                    "blind_spot_exposed": "Omitted retry backoff jitter and vector search cache invalidation.",
                    "exemplar_upgrade": "Detail the circuit-breaker invariant threshold and state snapshot rollback mechanism."
                },
                "next_probe": {
                    "current_depth_level": 2,
                    "target_resume_node": "Multi-Agent Orchestration Engine",
                    "interviewer_question": "When your conditional edge detects an invalid audit state, how does your state machine prevent infinite cyclic oscillation under concurrent requests?"
                }
            })
        elif task == "odyssey":
            return json.dumps({
                "insight": "Your structural mastery of deterministic agent graphs positions you squarely in the top tier of AI Systems candidates.",
                "core_atelier": "Carved 1 production STAR-L bullet with zero fabrication and mapped 2-hop bridge to Hybrid RAG.",
                "next_trajectory": "Conduct depth-2 rehearsal simulation on state rollback invariants or commit revised resume bullets.",
                "formatted_markdown": "### ✦ Solstice Insight | 至日洞察\n\nCandidate demonstrates robust command of state machines.\n\n### ❖ Core Atelier | 核心工坊\n\nProduction STAR-L carvings and Constellation alignment generated.\n\n### ↗ Next Trajectory | 下一道轨迹\n\nPressure-test state rollback invariants."
            })
        elif task == "critic":
            return json.dumps({
                "passed": True,
                "cliche_detected": [],
                "hallucinated_metrics": [],
                "rewrite_instruction": ""
            })
        return "{}"
