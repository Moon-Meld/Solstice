import { 
  OrchestratorState, 
  AtelierType, 
  CandidateProfile, 
  OdysseyOpportunity, 
  InterviewerPersona,
  JournalEntry
} from '../types';
import { selfPortraitAgent } from './agents/selfPortraitAgent';
import { constellationAgent } from './agents/constellationAgent';
import { theRehearsalAgent } from './agents/theRehearsalAgent';
import { llmAdapter } from './llmAdapter';
import { kgEngine } from './kgEngine';

// Initial Demo Profile
const INITIAL_DEMO_PROFILE: CandidateProfile = {
  name: 'Alexandre Sterling (盛凌)',
  title: 'Systems & Distributed Computing Artisan',
  email: 'alexandre.sterling@solstice.dev',
  targetRole: 'role-openai-ai-infra',
  summary: 'Distributed systems engineer with deep interest in low-level memory architectures, asynchronous runtimes, and frontier AI serving infrastructure. Driven by first-principles deconstruction of latency and throughput bottlenecks.',
  skills: [
    'skill-python',
    'skill-dist-sys',
    'skill-rag-triad',
    'skill-vector-db',
    'skill-first-principles'
  ],
  experiences: [
    {
      id: 'exp-1',
      company: 'Aether Cloud Systems',
      role: 'Distributed Systems Engineer',
      period: '2023 - Present',
      location: 'San Francisco, CA',
      rawBullets: [
        'Worked on PyTorch model training and fixed GPU memory issues when running large batches.',
        'Helped improve the database speed and wrote some API endpoints in Go for the payments service.',
        'Assisted in building an AI chatbot for customer support that answered user questions.'
      ],
      starBullets: [
        {
          id: 'sb-1',
          original: 'Worked on PyTorch model training and fixed GPU memory issues when running large batches.',
          situation: 'High-throughput transformer fine-tuning faced continuous out-of-memory (OOM) crashes across 64-GPU clusters during 32k context runs.',
          task: 'Eliminate peak activation memory overhead without sacrificing token training throughput.',
          action: 'Engineered custom Triton FlashAttention kernels and zero-redundancy optimizer (ZeRO-3) activation checkpointing.',
          result: 'Reduced peak VRAM footprint by 44% and scaled context length from 8k to 32k tokens on 128 H100 nodes with 99.8% job completion rate.',
          metrics: ['-44% Peak VRAM', '4\u00d7 Context Window (32k)', '99.8% SLA'],
          actionVerb: 'Engineered',
          potencyScore: 94,
          refined: 'Engineered custom Triton FlashAttention kernels and ZeRO-3 activation checkpointing, reducing peak GPU VRAM footprint by 44% and scaling context capacity from 8k to 32k tokens on 128 H100 nodes.',
          critique: 'Replaces passive verb with authoritative technical mechanism and concrete multi-dimensional metrics.'
        }
      ]
    }
  ],
  education: [
    {
      institution: 'UC Berkeley / Tsinghua University',
      degree: 'B.S. in Computer Science & Applied Mathematics',
      period: '2019 - 2023',
      highlights: 'Summa Cum Laude, Dean’s Honors List, Published in SysML on distributed memory locality.'
    }
  ]
};

const INITIAL_OPPORTUNITIES: OdysseyOpportunity[] = [
  {
    id: 'opp-1',
    company: 'OpenAI',
    role: 'AI Systems Engineer (Infrastructure)',
    stage: 'interviewing',
    alignmentScore: 84,
    salaryRange: '$220k - $290k + Equity',
    location: 'San Francisco, CA',
    deadline: 'Next Thursday: Round 2 Systems Interview',
    notes: 'Focus on multi-node all-to-all communication overhead and CUDA kernel memory tiling.',
    actionItems: [
      'Rehearse MoE gradient sync failure scenario in The Rehearsal',
      'Review Triton GPU SRAM vs HBM memory hierarchy flashcards',
      'Follow up with lead recruiter regarding cluster architecture specs'
    ]
  },
  {
    id: 'opp-2',
    company: 'Jane Street',
    role: 'Quantitative Dev / High-Frequency Systems',
    stage: 'discovered',
    alignmentScore: 68,
    salaryRange: '$250k - $350k + Discretionary Alpha Bonus',
    location: 'New York, NY',
    deadline: 'Open Application Window',
    notes: 'Need to bridge low-latency sub-microsecond gap via Modern C++ and Linux kernel bypass.',
    actionItems: [
      'Explore multi-hop path from Python to C++ to Low-Latency in Constellation',
      'Draft cold outreach to Jane Street Systems Principal via Odyssey'
    ]
  },
  {
    id: 'opp-3',
    company: 'Google',
    role: 'Senior Software Engineer, Distributed Systems (Core)',
    stage: 'offer',
    alignmentScore: 88,
    salaryRange: '$210k - $275k + $300k GSU',
    location: 'Mountain View, CA',
    notes: 'Offer received! Preparing strategic counter-proposal for equity step-up.',
    actionItems: [
      'Generate Sovereign Artisan Counter-Proposal script in Odyssey',
      'Schedule final call with Director of Engineering'
    ]
  }
];

const INITIAL_JOURNAL_ENTRIES: JournalEntry[] = [
  {
    id: 'j-1',
    date: '2026-10-25',
    title: '突破 NCCL 通信瓶颈后的沉思',
    content: '在排练场与 Dr. Vance 模拟了 MoE 模型跨节点 All-to-All 梯度死锁场景。第一性原理至关重要：永远不要将延迟归咎于玄学，而是拆解为网络拓扑环形通信（Ring NCCL）与 PCIe 主机搬运边界。信心倍增。',
    mood: 'breakthrough',
    confidenceScore: 92,
    tags: ['Distributed Systems', 'The Rehearsal', 'NCCL']
  },
  {
    id: 'j-2',
    date: '2026-10-23',
    title: '重塑自画像简历的顿悟',
    content: '将“负责微服务与数据库优化”用 STAR 炼金术重构为“主导无锁环形队列与内存池设计，降低 p99 延迟 94%”。叙事不是夸大，而是还事实以应有的技术尊严与度量衡。',
    mood: 'radiant',
    confidenceScore: 88,
    tags: ['Self-Portrait', 'STAR Framework', 'Empowerment']
  }
];

export class MasterOrchestrator {
  private state: OrchestratorState;
  private listeners: ((state: OrchestratorState) => void)[] = [];

  constructor() {
    this.state = {
      activeAtelier: 'self-portrait',
      profile: INITIAL_DEMO_PROFILE,
      alignment: null,
      activeInterview: null,
      opportunities: INITIAL_OPPORTUNITIES,
      journalEntries: INITIAL_JOURNAL_ENTRIES,
      llmConfig: llmAdapter.getConfig()
    };

    // Calculate initial constellation alignment
    this.recalculateAlignment();
  }

  public getState(): OrchestratorState {
    return { ...this.state };
  }

  public subscribe(listener: (state: OrchestratorState) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener(this.getState());
    }
  }

  public switchAtelier(atelier: AtelierType) {
    this.state.activeAtelier = atelier;
    this.notify();
  }

  public updateTargetRole(roleId: string) {
    this.state.profile.targetRole = roleId;
    this.recalculateAlignment();
    this.notify();
  }

  public toggleSkill(skillId: string) {
    const hasSkill = this.state.profile.skills.includes(skillId);
    if (hasSkill) {
      this.state.profile.skills = this.state.profile.skills.filter(s => s !== skillId);
    } else {
      this.state.profile.skills.push(skillId);
    }
    this.recalculateAlignment();
    this.notify();
  }

  public addCustomSkill(skillLabel: string) {
    const cleanLabel = skillLabel.trim();
    if (!cleanLabel) return;
    const newId = `skill-custom-${Date.now()}`;
    const newNode = {
      id: newId,
      label: cleanLabel,
      type: 'skill' as const,
      category: 'advanced' as const,
      tier: 2 as const,
      domain: 'Custom Mastery',
      description: `Candidate custom competency in ${cleanLabel}.`
    };
    kgEngine.getAllNodes().push(newNode);
    this.state.profile.skills.push(newId);
    this.recalculateAlignment();
    this.notify();
  }

  public recalculateAlignment() {
    this.state.alignment = constellationAgent.generateAlignment(
      this.state.profile.skills,
      this.state.profile.targetRole
    );
  }

  public async refineBullet(expId: string, rawBullet: string): Promise<void> {
    const refined = await selfPortraitAgent.refineBulletPoint(rawBullet, this.state.profile.targetRole);
    const exp = this.state.profile.experiences.find(e => e.id === expId);
    if (exp) {
      const existingIdx = exp.starBullets.findIndex(b => b.original === rawBullet);
      if (existingIdx >= 0) {
        exp.starBullets[existingIdx] = refined;
      } else {
        exp.starBullets.push(refined);
      }
    }
    this.notify();
  }

  public async batchRefineAllBullets(expId: string): Promise<void> {
    const exp = this.state.profile.experiences.find(e => e.id === expId);
    if (!exp) return;
    for (const raw of exp.rawBullets) {
      await this.refineBullet(expId, raw);
    }
    this.notify();
  }

  public startMockInterview(
    persona: InterviewerPersona, 
    company: string, 
    roleTitle: string,
    roundType: 'coding-concurrency' | 'system-design' | 'culture-leadership' = 'system-design'
  ) {
    const firstMsg = theRehearsalAgent.initiateSession(company, roleTitle, persona);
    this.state.activeInterview = {
      id: `interview-${Date.now()}`,
      persona,
      targetCompany: company,
      targetRole: roleTitle,
      roundName: `${company} · ${roundType === 'coding-concurrency' ? '并发核心与底层算法' : roundType === 'system-design' ? '行星级系统架构设计' : '主权领导力与文化基因'}评估`,
      roundType,
      messages: [firstMsg],
      status: 'in-progress',
      scratchpadNotes: `// [${company} 系统设计草稿板]\n// 需求与容量预估：\n// - 峰值吞吐: 100,000 QPS\n// - 延迟约束: p99 < 10ms\n// 架构拓扑分层：\n// Client -> L4 LB -> Ring Buffer Gateway -> Distributed Workers`
    };
    this.notify();
  }

  public updateScratchpad(notes: string) {
    if (this.state.activeInterview) {
      this.state.activeInterview.scratchpadNotes = notes;
      this.notify();
    }
  }

  public async sendInterviewAnswer(answer: string) {
    if (!this.state.activeInterview) return;

    const userMsg = {
      id: `msg-${Date.now()}`,
      sender: 'candidate' as const,
      content: answer,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    this.state.activeInterview.messages.push(userMsg);
    this.notify();

    // Generate Interviewer follow-up or report
    const nextMsg = await theRehearsalAgent.respondToCandidate(
      answer,
      this.state.activeInterview.messages,
      this.state.activeInterview.persona,
      this.state.activeInterview.targetCompany
    );

    this.state.activeInterview.messages.push(nextMsg);

    // If session has >= 4 messages, generate Director's Cut Report
    if (this.state.activeInterview.messages.length >= 4) {
      this.state.activeInterview.report = theRehearsalAgent.generateDirectorsCut(
        this.state.activeInterview.messages,
        this.state.activeInterview.targetCompany,
        this.state.activeInterview.targetRole
      );
      this.state.activeInterview.status = 'completed';
    }

    this.notify();
  }

  public resetInterview() {
    this.state.activeInterview = null;
    this.notify();
  }

  public addOpportunity(oppData: Omit<OdysseyOpportunity, 'id'>) {
    const newOpp: OdysseyOpportunity = {
      ...oppData,
      id: `opp-${Date.now()}`
    };
    this.state.opportunities.unshift(newOpp);
    this.notify();
  }

  public updateOpportunityStage(id: string, stage: OdysseyOpportunity['stage']) {
    const opp = this.state.opportunities.find(o => o.id === id);
    if (opp) {
      opp.stage = stage;
      this.notify();
    }
  }

  public addJournalEntry(entryData: Omit<JournalEntry, 'id' | 'date'>) {
    const newEntry: JournalEntry = {
      ...entryData,
      id: `j-${Date.now()}`,
      date: new Date().toISOString().split('T')[0]
    };
    this.state.journalEntries.unshift(newEntry);
    this.notify();
  }

  public setLLMConfig(newConfig: Partial<typeof this.state.llmConfig>) {
    llmAdapter.setConfig(newConfig);
    this.state.llmConfig = llmAdapter.getConfig();
    this.notify();
  }
}

export const orchestrator = new MasterOrchestrator();
