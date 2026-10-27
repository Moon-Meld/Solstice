export interface InterviewQuestionItem {
  id: string;
  targetCompany: string;
  roleId: string;
  persona: 'tech-lead' | 'product-director' | 'empathetic-hr' | 'quant-principal';
  question: string;
  category: 'System Architecture' | 'Concurrency & Performance' | 'Behavioral & Leadership' | 'Mathematical & Algorithmic' | 'Product Strategy';
  followUpProbes: string[];
  keySignalsLookedFor: string[];
  idealFramework: string;
}

export const INTERVIEW_QUESTION_BANK: InterviewQuestionItem[] = [
  // --- OpenAI / AI Systems ---
  {
    id: 'q-openai-1',
    targetCompany: 'OpenAI',
    roleId: 'role-openai-ai-infra',
    persona: 'tech-lead',
    question: 'Suppose we are training an MoE model across 4,096 GPUs. Suddenly, you observe that every 45 minutes, gradient synchronization hangs indefinitely for 180 seconds before crashing with an NCCL watchdog timeout. How do you isolate whether this is an all-to-all communication barrier, GPU kernel lockup, or node network hardware failure?',
    category: 'Concurrency & Performance',
    followUpProbes: [
      'What specific Linux and PyTorch profiling counters would you check first without restarting the run?',
      'If you discover one straggler GPU is throttling due to thermal limits, how should the orchestrator dynamically reallocate tensor shards?'
    ],
    keySignalsLookedFor: [
      'NCCL ring/tree topology understanding',
      'InfiniBand diagnostic tools (ibstat, perfquery)',
      'PyTorch distributed profiler & CUDA trace analysis',
      'Knowledge of all-to-all vs all-reduce bottlenecks in MoE routing'
    ],
    idealFramework: '1. Triage impact -> 2. Telemetry extraction (host vs network vs device logs) -> 3. Micro-benchmark isolation (reproduce on isolated 8-GPU slice) -> 4. Mitigate immediate training burn -> 5. Long-term watchdog circuit-breaker.'
  },
  {
    id: 'q-openai-2',
    targetCompany: 'OpenAI',
    roleId: 'role-openai-ai-infra',
    persona: 'tech-lead',
    question: 'Walk me through the design of an ultra-low latency serving layer for an o1-like reasoning model. Given the token generation tree can branch with speculative paths, how do you manage KV cache memory without running into fragmentation?',
    category: 'System Architecture',
    followUpProbes: [
      'How does RadixAttention or PagedAttention compare when handling multi-turn tree-search rollouts?',
      'What happens to token throughput when speculative verification fails on 3 consecutive tokens?'
    ],
    keySignalsLookedFor: [
      'PagedAttention block table mapping',
      'Prefix caching & Radix tree eviction policies',
      'Host-to-Device memory copy overheads',
      'Chunked prefill vs decode batch scheduling'
    ],
    idealFramework: 'Define hardware constraints (HBM3 bandwidth, PCIe) -> Virtual memory abstraction for KV tensors -> Branching cache eviction strategy -> Quantitative latency/throughput trade-off analysis.'
  },

  // --- Google / Distributed Systems ---
  {
    id: 'q-google-1',
    targetCompany: 'Google',
    roleId: 'role-google-dist-lead',
    persona: 'tech-lead',
    question: 'In a globally distributed multi-region database, we want to achieve external consistency (linearizability) across read-write transactions without taking global locks. How does Google Spanner solve this with TrueTime, and what happens if an atomic clock oscillator drifts beyond the uncertainty window \u03b5?',
    category: 'System Architecture',
    followUpProbes: [
      'Why is wait-out-the-uncertainty preferred over two-phase commit aborts?',
      'If TrueTime is unavailable, how does Hybrid Logical Clock (HLC) approximate these guarantees, and what are its trade-offs?'
    ],
    keySignalsLookedFor: [
      'TrueTime API ([earliest, latest] interval)',
      'Commit wait duration equal to 2 * \u03b5',
      'Paxos group leader leases',
      'Two-Phase Locking (2PL) combined with Two-Phase Commit (2PC)'
    ],
    idealFramework: 'Define external consistency formal definition -> TrueTime interval geometry -> Commit wait protocol -> Failure modes when clock drift exceeds epsilon bound.'
  },
  {
    id: 'q-google-2',
    targetCompany: 'Google',
    roleId: 'role-google-dist-lead',
    persona: 'empathetic-hr',
    question: 'Tell me about a time you strongly disagreed with a Principal Architect or Tech Lead on a fundamental architectural decision. How did you navigate the impasse, what data did you bring to the table, and what was the ultimate outcome?',
    category: 'Behavioral & Leadership',
    followUpProbes: [
      'If the team chose the opposing solution, how did you maintain velocity and morale?',
      'Looking back, were there blind spots in your own argument that you only recognized later?'
    ],
    keySignalsLookedFor: [
      'Googleyness: Disagree and commit with genuine alignment',
      'Data-driven advocacy vs ideological stubbornness',
      'Emotional maturity and psychological safety protection',
      'Blameless post-mortem perspective'
    ],
    idealFramework: 'STAR: Concrete technical conflict -> Objective benchmark data brought -> Respectful de-escalation mechanism -> Outcome and team learning curve.'
  },

  // --- Jane Street / Quantitative ---
  {
    id: 'q-jane-1',
    targetCompany: 'Jane Street',
    roleId: 'role-jane-street-quant',
    persona: 'quant-principal',
    question: 'You have a fair 6-sided die. You roll it. At each step, you can choose to walk away with the dollar amount shown, or pay $1 to roll again, up to a maximum of 3 rolls total. What is your optimal strategy and the expected value of this game?',
    category: 'Mathematical & Algorithmic',
    followUpProbes: [
      'Now generalize this: what if you have infinite rolls but each re-roll costs $c? For what range of $c do you stop immediately on a 4?',
      'How would your sizing change if this were an illiquid market where the die was suspected to be weighted with prior probability Beta(2, 2)?'
    ],
    keySignalsLookedFor: [
      'Backward induction / Dynamic programming on decision tree',
      'Calculation of E[roll 3] = 3.5, net expected roll 2 = max(x, 3.5 - 1)',
      'Clear oral calculation and zero hesitation with expected values',
      'Bayesian risk adjustment intuition'
    ],
    idealFramework: 'Work backwards from terminal state -> Formulate expected payout table -> Define reservation price threshold at each step -> Synthesize analytical insight.'
  },

  // --- Stripe / AI Product ---
  {
    id: 'q-stripe-1',
    targetCompany: 'Stripe',
    roleId: 'role-stripe-ai-product',
    persona: 'product-director',
    question: 'We want to launch an AI Financial Copilot inside the Stripe Dashboard to help merchants resolve chargebacks and automate revenue forecasting. However, merchants deal with regulatory audits where hallucinated accounting numbers could lead to severe fines. How do you design an architecture that guarantees zero-hallucination financial reconciliation while retaining natural conversational fluidness?',
    category: 'Product Strategy',
    followUpProbes: [
      'How do you decouple semantic intent parsing from deterministic deterministic ledger calculations?',
      'If the user asks an ambiguous prompt like "How much will I make next month?", what UX guardrails prevent false certainty?'
    ],
    keySignalsLookedFor: [
      'Strict decoupling: LLM for query translation -> Deterministic SQL/Graph engine for numbers -> Verifier LLM for synthesis',
      'Confidence calibration and explicit uncertainty representation in UI',
      'Audit logging and cryptographic provenance for every cited statistic',
      'Enterprise-grade security and SOC2 compliance constraints'
    ],
    idealFramework: 'User Trust Paradigm -> Deterministic Computation Sandbox -> Graph-RAG Verification Pipeline -> Product Experience & Failure Boundary Design.'
  }
];
