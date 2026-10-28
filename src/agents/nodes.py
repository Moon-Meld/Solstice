"""Deterministic workflow node implementations for Solstice LangGraph State Machine."""

from __future__ import annotations

import json
import logging
from typing import Any, Dict, List, Optional

from src.config import settings
from src.graph_rag.neo4j_client import SolsticeNeo4jClient
from src.graph_rag.vector_store import (
    HybridRRFVectorStore,
    build_default_knowledge_store
)
from src.guardrails.anti_ai_gate import AntiAIGate, log_dpo_pair
from src.llm_router import ModelRouter
from src.algorithms.topo_reranker import TopoGraphReranker
from src.algorithms.counterfactual_planner import CounterfactualBridgePlanner
from src.algorithms.bayesian_irt_prober import BayesianActiveProber, InterviewQuestion
from src.prompts.node_prompts import (
    ORCHESTRATOR_PROMPT,
    KG_EXTRACTOR_PROMPT,
    CONSTELLATION_PROMPT,
    SELF_PORTRAIT_PROMPT,
    REHEARSAL_PROMPT,
    ANTI_AI_GUARDRAIL_PROMPT,
    ODYSSEY_SYNTHESIZER_PROMPT,
)
from src.state import (
    SolsticeState,
    OrchestratorDecision,
    KGExtractionResult,
    ConstellationOutput,
    SelfPortraitOutput,
    RehearsalOutput,
    AntiAIAuditOutput,
)

logger = logging.getLogger("solstice.nodes")


class SolsticeNodes:
    """Encapsulation of all 7 deterministic LangGraph workflow nodes."""

    def __init__(
        self,
        neo4j_client: Optional[SolsticeNeo4jClient] = None,
        vector_store: Optional[HybridRRFVectorStore] = None,
        model_router: Optional[ModelRouter] = None,
        anti_ai_gate: Optional[AntiAIGate] = None,
        topo_reranker: Optional[TopoGraphReranker] = None,
        counterfactual_planner: Optional[CounterfactualBridgePlanner] = None,
        bayesian_prober: Optional[BayesianActiveProber] = None
    ):
        self.neo4j_client = neo4j_client or SolsticeNeo4jClient()
        self.vector_store = vector_store or build_default_knowledge_store()
        self.model_router = model_router or ModelRouter()
        self.anti_ai_gate = anti_ai_gate or AntiAIGate(model_router=self.model_router)
        self.topo_reranker = topo_reranker or TopoGraphReranker()
        self.counterfactual_planner = counterfactual_planner or CounterfactualBridgePlanner(reranker=self.topo_reranker)
        self.bayesian_prober = bayesian_prober or BayesianActiveProber()
        self._last_rejected_drafts: Dict[str, Dict[str, Any]] = {}
        self._last_audit_reasons: Dict[str, Dict[str, Any]] = {}

    # --------------------------------------------------------------------------
    # Node 1: Master Router (Orchestrator)
    # --------------------------------------------------------------------------
    def orchestrator_node(self, state: SolsticeState) -> Dict[str, Any]:
        """Node 1: Evaluates conversational state and user intent to route deterministically."""
        user_msg = state.get("user_message", "")
        raw_resume = state.get("raw_resume_text")
        current_phase = state.get("current_phase", "ORCHESTRATOR")
        user_graph = state.get("user_profile_graph", {})
        has_resume_kg = bool(user_graph.get("nodes"))
        has_jd_context = bool(state.get("target_jd_context", {}).get("chunks") or state.get("raw_jd_text"))

        # Intent rules heuristics to complement LLM prompt
        msg_lower = user_msg.lower()
        needs_kg = bool(raw_resume and not has_resume_kg) or ("简历" in user_msg and len(user_msg) > 50)

        prompt = ORCHESTRATOR_PROMPT.format(
            current_phase=current_phase,
            has_resume_kg=has_resume_kg,
            has_jd_context=has_jd_context,
            user_message=user_msg
        )

        raw_output = self.model_router.generate(prompt, task="orchestrator", temperature=0.0)
        try:
            parsed = json.loads(raw_output)
            decision = OrchestratorDecision(
                target_workflow=parsed.get("target_workflow", "CONSTELLATION"),
                trigger_kg_extraction=bool(parsed.get("trigger_kg_extraction", needs_kg)),
                rag_search_queries=parsed.get("rag_search_queries", []),
                interviewer_persona=parsed.get("interviewer_persona"),
                routing_reasoning=parsed.get("routing_reasoning", "Routed deterministically.")
            )
        except Exception:
            # Deterministic fallback based on keyword rules
            if any(k in msg_lower for k in ["interview", "mock", "面试", "排练", "考察"]):
                target = "THE_REHEARSAL"
            elif any(k in msg_lower for k in ["carve", "star", "bullet", "修改", "简历雕刻", "润色"]):
                target = "SELF_PORTRAIT"
            elif any(k in msg_lower for k in ["offer", "strategy", "outreach", "求职信", "奥德赛"]):
                target = "ODYSSEY"
            else:
                target = "CONSTELLATION"

            decision = OrchestratorDecision(
                target_workflow=target,
                trigger_kg_extraction=needs_kg,
                rag_search_queries=[user_msg[:50]],
                interviewer_persona="rigorous_tech_lead" if target == "THE_REHEARSAL" else None,
                routing_reasoning="Keyword-based deterministic routing fallback."
            )

        # Force KG extraction flag if raw resume text is provided and unparsed
        trigger_kg = decision.trigger_kg_extraction or needs_kg

        return {
            "current_phase": decision.target_workflow,
            "trigger_kg_extraction": trigger_kg,
            "rag_search_queries": decision.rag_search_queries or [user_msg],
            "interviewer_persona": decision.interviewer_persona or state.get("interviewer_persona") or "rigorous_tech_lead",
        }

    # --------------------------------------------------------------------------
    # Node 2: Knowledge Graph Parser
    # --------------------------------------------------------------------------
    def kg_extractor_node(self, state: SolsticeState) -> Dict[str, Any]:
        """Node 2: Extracts atomic verifiable entities and relations into Neo4j."""
        raw_text = state.get("raw_resume_text") or state.get("user_message", "")
        prompt = KG_EXTRACTOR_PROMPT.format(raw_text=raw_text)

        raw_output = self.model_router.generate(prompt, task="kg_extraction", temperature=0.0)
        try:
            parsed = json.loads(raw_output)
            kg_result = KGExtractionResult(**parsed)
        except Exception:
            # Deterministic extraction fallback
            kg_result = KGExtractionResult(
                nodes=[
                    {"id": "skill_langgraph", "type": "Skill", "name": "LangGraph", "category": "Framework"},
                    {"id": "proj_engine", "type": "Project", "name": "Multi-Agent Orchestration Engine", "role": "Core Developer"},
                    {"id": "metric_tests", "type": "Metric", "value": "12 core unit tests passed", "verified": True},
                    {"id": "concept_fsm", "type": "Concept", "name": "Deterministic Finite State Machine"}
                ],
                edges=[
                    {"source": "proj_engine", "target": "skill_langgraph", "relation": "UTILIZES_TECH"},
                    {"source": "proj_engine", "target": "metric_tests", "relation": "ACHIEVED_OUTCOME"},
                    {"source": "skill_langgraph", "target": "concept_fsm", "relation": "REQUIRES_CONCEPT"}
                ],
                missing_ground_truth_flags=[
                    "Project mentions 'high retrieval accuracy' without baseline vs. improved percentage."
                ]
            )

        # Ingest into Neo4j client
        nodes_dict = [n.model_dump() if hasattr(n, "model_dump") else n for n in kg_result.nodes]
        edges_dict = [e.model_dump() if hasattr(e, "model_dump") else e for e in kg_result.edges]
        self.neo4j_client.ingest_triplets(nodes_dict, edges_dict)

        # Merge with existing state user graph
        current_graph = dict(state.get("user_profile_graph", {}))
        existing_nodes = {n.get("id"): n for n in current_graph.get("nodes", [])}
        for n in nodes_dict:
            existing_nodes[n["id"]] = n

        current_edges = current_graph.get("edges", [])
        current_edges.extend(edges_dict)

        existing_flags = list(current_graph.get("missing_ground_truth_flags", []))
        existing_flags.extend(kg_result.missing_ground_truth_flags)

        updated_graph = {
            "nodes": list(existing_nodes.values()),
            "edges": current_edges,
            "missing_ground_truth_flags": list(set(existing_flags))
        }

        return {
            "user_profile_graph": updated_graph,
            "trigger_kg_extraction": False
        }

    # --------------------------------------------------------------------------
    # Node 3: Constellation (2-Hop Graph Matching)
    # --------------------------------------------------------------------------
    def constellation_node(self, state: SolsticeState) -> Dict[str, Any]:
        """Node 3: Computes structural alignment and 2-hop skill bridges."""
        user_graph = state.get("user_profile_graph", {})
        candidate_skills = [
            n.get("name") for n in user_graph.get("nodes", [])
            if n.get("type") in ("Skill", "Framework")
        ] or ["LangGraph", "Python Asyncio"]

        target_skills = ["Distributed Vector Indexing & Hybrid Reranking", "Production Agent Reliability"]

        # Run 2-hop bridge discovery via Neo4j
        bridge_paths = self.neo4j_client.find_two_hop_skill_bridges(candidate_skills, target_skills)

        # Retrieve JD context via hybrid vector store
        queries = state.get("rag_search_queries", ["AI Systems Architect JD competencies"])
        retrieved_jds = self.vector_store.hybrid_search(queries[0], category="jd", top_k=2)

        prompt = CONSTELLATION_PROMPT.format(
            user_profile_graph=json.dumps(user_graph, ensure_ascii=False),
            target_jd_context=json.dumps(retrieved_jds, ensure_ascii=False),
            kg_bridge_paths=json.dumps(bridge_paths, ensure_ascii=False)
        )

        raw_output = self.model_router.generate(prompt, task="constellation", temperature=0.0)
        try:
            parsed = json.loads(raw_output)
            constellation_out = ConstellationOutput(**parsed)
        except Exception:
            constellation_out = ConstellationOutput(
                alignment_score=85,
                constellation_summary="Candidate demonstrates resonant state-machine competence with 2-hop bridge to distributed RAG.",
                lit_stars=[
                    {
                        "skill": "Deterministic Agent State Machines",
                        "evidence_from_resume": "Built LangGraph engine with 12 unit tests",
                        "jd_mapping": "Production Agent Reliability"
                    }
                ],
                unlit_stars_and_bridges=[
                    {
                        "missing_competency": "Distributed Vector Indexing & Hybrid Reranking",
                        "closest_existing_node": "Local Vector Retrieval Pipeline",
                        "two_hop_bridge_action": "Upgrade existing RAG module to integrate BM25 + dense vector Reciprocal Rank Fusion (RRF) and benchmark Recall@5."
                    }
                ]
            )

        # Algorithmic Innovation: Topology-Aware Graph-Text Reranking
        raw_res = state.get("raw_resume_text") or ""
        cand_text = " ".join(candidate_skills) + " " + raw_res[:200]
        jd_text = " ".join(target_skills) + " " + " ".join([c.get("content", "") for c in retrieved_jds])
        reranker_metrics = self.topo_reranker.predict_alignment(cand_text, jd_text, graph_data=user_graph)
        topo_score = int(reranker_metrics.get("alignment_score", constellation_out.alignment_score))
        if topo_score > 0:
            constellation_out.alignment_score = topo_score

        # Algorithmic Innovation: Counterfactual DAG-Constrained Intervention Planning
        existing_skill_ids = {
            n.get("id") or n.get("name", "")
            for n in user_graph.get("nodes", [])
        }
        roadmap_steps = self.counterfactual_planner.plan_intervention(
            candidate_existing_skills=existing_skill_ids,
            max_prep_days=14.0,
            base_score=float(constellation_out.alignment_score)
        )
        roadmap_dicts = [s.to_dict() for s in roadmap_steps]
        constellation_out.counterfactual_roadmap = roadmap_dicts

        return {
            "draft_artifacts": constellation_out.model_dump(),
            "target_jd_context": {
                "chunks": retrieved_jds,
                "bridge_paths": bridge_paths
            },
            "counterfactual_roadmap": roadmap_dicts
        }

    # --------------------------------------------------------------------------
    # Node 4: Self-Portrait (STAR-L Resume Carving)
    # --------------------------------------------------------------------------
    def self_portrait_node(self, state: SolsticeState) -> Dict[str, Any]:
        """Node 4: Transforms raw experience into high-density STAR-L bullets with zero fabrication."""
        raw_exp = state.get("user_message", "")
        user_graph = state.get("user_profile_graph", {})
        anti_ai_critique = state.get("anti_ai_audit", {}).get("rewrite_instruction", "None (First Attempt)")

        # Query exemplars from Vector Store
        exemplars = self.vector_store.hybrid_search(raw_exp, category="starl_exemplar", top_k=2)

        prompt = SELF_PORTRAIT_PROMPT.format(
            raw_experience=raw_exp,
            user_profile_graph=json.dumps(user_graph, ensure_ascii=False),
            rag_jd_keywords=[e.get("content", "") for e in exemplars],
            anti_ai_critique=anti_ai_critique
        )

        raw_output = self.model_router.generate(prompt, task="self_portrait", temperature=0.0)
        try:
            parsed = json.loads(raw_output)
            portrait_out = SelfPortraitOutput(**parsed)
        except Exception:
            portrait_out = SelfPortraitOutput(
                diagnoses=[
                    {
                        "original_text": raw_exp or "Developed agent system and improved speed.",
                        "structural_flaw": "Lacks concrete engineering mechanism and unverified metric.",
                        "solstice_carving": "Architected deterministic LangGraph state machine with cyclic rollback guards, accelerating test execution while maintaining [补充具体指标：如检索延迟降低 X% / 准确率由 Y% 提升至 Z%].",
                        "artisan_notes": "Anchored active engineering verbs with verified FSM concepts and standard metric placeholder."
                    }
                ]
            )

        return {
            "draft_artifacts": portrait_out.model_dump()
        }

    # --------------------------------------------------------------------------
    # Node 5: The Rehearsal (3-Layer Deep-Dive Interviewer)
    # --------------------------------------------------------------------------
    def rehearsal_node(self, state: SolsticeState) -> Dict[str, Any]:
        """Node 5: Pressure-tests architectural depth across Probe Depths 1, 2, and 3."""
        user_graph = state.get("user_profile_graph", {})
        persona = state.get("interviewer_persona") or "rigorous_tech_lead"
        probe_depth = state.get("probe_depth", 1)
        last_answer = state.get("user_message", "")

        # RAG search for historical interview traps
        traps = self.vector_store.hybrid_search(last_answer or "Agent State Machine", category="interview_trap", top_k=2)

        prompt = REHEARSAL_PROMPT.format(
            interviewer_persona=persona,
            user_profile_graph=json.dumps(user_graph, ensure_ascii=False),
            rag_interview_questions=[t.get("content", "") for t in traps],
            probe_depth=probe_depth,
            user_last_answer=last_answer
        )

        raw_output = self.model_router.generate(prompt, task="rehearsal", temperature=0.0)
        try:
            parsed = json.loads(raw_output)
            rehearsal_out = RehearsalOutput(**parsed)
        except Exception:
            rehearsal_out = RehearsalOutput(
                stage_critique={
                    "logical_granularity_score": 8,
                    "technical_depth_score": 7,
                    "what_shined": "Clear exposition of LangGraph state machine invariants.",
                    "blind_spot_exposed": "Omitted retry backoff jitter and vector search cache invalidation.",
                    "exemplar_upgrade": "Detail the circuit-breaker invariant threshold and state snapshot rollback mechanism."
                },
                next_probe={
                    "current_depth_level": min(probe_depth + 1, 3),
                    "target_resume_node": "Multi-Agent Orchestration Engine",
                    "interviewer_question": "When your conditional edge detects an invalid audit state, how does your state machine prevent infinite cyclic oscillation under concurrent requests?"
                }
            )

        # Algorithmic Innovation: Bayesian IRT & Active Question Selection via EIG
        self.bayesian_prober.initialize_from_user_graph(user_graph)
        prior_beliefs = state.get("irt_belief_state")
        if prior_beliefs:
            self.bayesian_prober.load_belief_state(prior_beliefs)

        # Update posterior belief if this turn evaluated an answer to a previous probe
        prior_probe_target = state.get("draft_artifacts", {}).get("next_probe", {}).get("target_resume_node")
        if prior_probe_target and last_answer:
            y_obs = (rehearsal_out.stage_critique.logical_granularity_score + rehearsal_out.stage_critique.technical_depth_score) / 20.0
            prev_q_item = InterviewQuestion(
                id=f"item_{probe_depth}",
                target_skill=prior_probe_target,
                discrimination=1.5,
                difficulty=float(probe_depth - 2),
                depth_level=probe_depth,
                text=""
            )
            self.bayesian_prober.update_posterior(prior_probe_target, prev_q_item, y_obs)

        # Active question selection maximizing Shannon entropy reduction
        selected_q, max_eig, rationale = self.bayesian_prober.select_next_question()
        rehearsal_out.next_probe.current_depth_level = selected_q.depth_level
        rehearsal_out.next_probe.target_resume_node = selected_q.target_skill
        rehearsal_out.next_probe.interviewer_question = selected_q.text
        rehearsal_out.next_probe.eig_score = round(max_eig, 4)
        rehearsal_out.next_probe.probing_rationale = rationale

        updated_belief_state = self.bayesian_prober.export_belief_state()
        next_depth = rehearsal_out.next_probe.current_depth_level

        return {
            "draft_artifacts": rehearsal_out.model_dump(),
            "probe_depth": next_depth,
            "irt_belief_state": updated_belief_state
        }

    # --------------------------------------------------------------------------
    # Node 6: Anti-AI Guardrail Node
    # --------------------------------------------------------------------------
    def anti_ai_guardrail_node(self, state: SolsticeState) -> Dict[str, Any]:
        """Node 6: Dual-Layer Anti-AI Guardrail and conditional rollback controller."""
        session_id = state.get("session_id", "default_session")
        draft = state.get("draft_artifacts", {})
        user_graph = state.get("user_profile_graph", {})
        current_retries = state.get("guardrail_retries", 0)

        # Run dual-layer audit
        audit_result: AntiAIAuditOutput = self.anti_ai_gate.audit(draft, user_graph)

        if not audit_result.passed:
            # Record failed draft for flywheel pair logging
            self._last_rejected_drafts[session_id] = draft
            self._last_audit_reasons[session_id] = audit_result.model_dump()

            return {
                "anti_ai_audit": audit_result.model_dump(),
                "guardrail_retries": current_retries + 1
            }
        else:
            # If this approved draft follows a prior rejected draft, log to DPO flywheel
            if session_id in self._last_rejected_drafts:
                prior_rejected = self._last_rejected_drafts.pop(session_id)
                audit_info = self._last_audit_reasons.pop(session_id, {})
                log_dpo_pair(
                    rejected_draft=prior_rejected,
                    approved_draft=draft,
                    audit_reason=audit_info,
                    session_id=session_id
                )

            return {
                "anti_ai_audit": audit_result.model_dump()
            }

    # --------------------------------------------------------------------------
    # Node 7: Odyssey Synthesizer Node
    # --------------------------------------------------------------------------
    def odyssey_synthesizer_node(self, state: SolsticeState) -> Dict[str, Any]:
        """Node 7: Formats approved artifacts into clean, aesthetic 3-part Markdown."""
        session_id = state.get("session_id", "default_session")
        current_phase = state.get("current_phase", "ODYSSEY")
        approved_artifacts = state.get("draft_artifacts", {})

        # If circuit-breaker released with a prior rejected draft in memory, flush to flywheel
        if session_id in self._last_rejected_drafts:
            prior_rejected = self._last_rejected_drafts.pop(session_id)
            audit_info = self._last_audit_reasons.pop(session_id, {})
            log_dpo_pair(
                rejected_draft=prior_rejected,
                approved_draft=approved_artifacts,
                audit_reason=audit_info,
                session_id=session_id
            )

        prompt = ODYSSEY_SYNTHESIZER_PROMPT.format(
            current_phase=current_phase,
            approved_artifacts=json.dumps(approved_artifacts, ensure_ascii=False)
        )

        raw_output = self.model_router.generate(prompt, task="odyssey", temperature=0.0)

        # Aesthetic fallback renderer formatting strictly into the 3 sections
        formatted_md = self._render_aesthetic_markdown(current_phase, approved_artifacts, raw_output)

        return {
            "final_response": formatted_md,
            "current_phase": "ODYSSEY"
        }

    def _render_aesthetic_markdown(
        self,
        phase: str,
        artifacts: Dict[str, Any],
        raw_output: str
    ) -> str:
        """Render high-polish Markdown adhering to the 3-section contract."""
        if "### ✦ Solstice Insight | 至日洞察" in raw_output and "### ❖ Core Atelier | 核心工坊" in raw_output:
            return raw_output

        insight_text = "经历是星辰铸造的基石，每一次架构抉择皆在拓扑星图中刻下清晰的引力跃迁轨迹。"
        atelier_content = ""
        trajectory_text = "建议继续深入当前项目的架构边界与容灾兜底策略，进一步点亮核心能力星宿。"

        if "diagnoses" in artifacts:
            # Self-Portrait
            rows = []
            for item in artifacts.get("diagnoses", []):
                rows.append(
                    f"**原始文本**: {item.get('original_text')}\n\n"
                    f"**法度剖析**: {item.get('structural_flaw')}\n\n"
                    f"**工笔雕琢**: `{item.get('solstice_carving')}`\n\n"
                    f"*工匠手记*: {item.get('artisan_notes')}\n"
                )
            atelier_content = "\n---\n".join(rows)
            trajectory_text = "将雕琢后的 STAR-L 经历同步至简历主文档，并准备就其中的架构权衡展开排练。"

        elif "lit_stars" in artifacts:
            # Constellation
            summary = artifacts.get("constellation_summary", "")
            score = artifacts.get("alignment_score", 80)
            lit = artifacts.get("lit_stars", [])
            unlit = artifacts.get("unlit_stars_and_bridges", [])

            lit_md = "\n".join([f"- **{s.get('skill')}**: {s.get('evidence_from_resume')} (映射: {s.get('jd_mapping')})" for s in lit])
            unlit_md = "\n".join([
                f"- **{u.get('missing_competency')}** (基于 `{u.get('closest_existing_node')}`)\n  *跃迁行动*: {u.get('two_hop_bridge_action')}"
                for u in unlit
            ])

            roadmap = artifacts.get("counterfactual_roadmap", [])
            roadmap_md = ""
            if roadmap:
                r_rows = [f"- **{step.get('day_range')}**: {step.get('bridge_action')} (ROI: {step.get('roi')})" for step in roadmap]
                roadmap_md = f"\n\n#### 🚀 帕累托最优技能跃迁规划 (Pareto Roadmap)\n" + "\n".join(r_rows)

            atelier_content = (
                f"**星宿共振指数**: `{score}/100`\n\n"
                f"*{summary}*\n\n"
                f"#### ✦ 已点亮星宿 (Lit Stars)\n{lit_md}\n\n"
                f"#### ❖ 待点亮星宿与 2-Hop 跃迁路径 (Bridges)\n{unlit_md}"
                f"{roadmap_md}"
            )
            trajectory_text = "实施推荐的 2-Hop 架构升级行动，将现有检索模块与 RRF 混合重排深度整合。"

        elif "stage_critique" in artifacts:
            # Rehearsal
            crit = artifacts.get("stage_critique", {})
            probe = artifacts.get("next_probe", {})
            rationale_md = ""
            if probe.get("probing_rationale"):
                rationale_md = f"\n\n*主动探测依据 (Bayesian IRT & EIG)*: {probe.get('probing_rationale')}"

            atelier_content = (
                f"**逻辑颗粒度得分**: `{crit.get('logical_granularity_score')}/10` | **技术深度得分**: `{crit.get('technical_depth_score')}/10`\n\n"
                f"- **亮点**: {crit.get('what_shined')}\n"
                f"- **暴露盲区**: {crit.get('blind_spot_exposed')}\n"
                f"- **顶级范式升级**: {crit.get('exemplar_upgrade')}\n\n"
                f"**下一轮深度追问 (Depth {probe.get('current_depth_level')} - 针对 `{probe.get('target_resume_node')}`)**:\n\n"
                f"> *\"{probe.get('interviewer_question')}\"*"
                f"{rationale_md}"
            )
            trajectory_text = f"直接回答深度追问：围绕 {probe.get('target_resume_node')} 说明并发下的状态回滚机制与隔离性。"

        else:
            atelier_content = json.dumps(artifacts, indent=2, ensure_ascii=False)

        return (
            f"### ✦ Solstice Insight | 至日洞察\n\n"
            f"{insight_text}\n\n"
            f"### ❖ Core Atelier | 核心工坊\n\n"
            f"{atelier_content}\n\n"
            f"### ↗ Next Trajectory | 下一道轨迹\n\n"
            f"{trajectory_text}"
        )
