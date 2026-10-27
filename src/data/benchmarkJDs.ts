export interface BenchmarkJD {
  id: string;
  roleId: string;
  company: string;
  title: string;
  location: string;
  tier: 'Elite Frontier' | 'FAANG Flagship' | 'Tier-1 Quant' | 'Fintech Titan';
  overview: string;
  hardRequirements: string[];
  softRequirements: string[];
  keyMissions: string[];
  evaluationRubric: {
    systemDesignWeight: number;
    codingPurityWeight: number;
    communicationWeight: number;
    culturalWeight: number;
  };
  sampleInterviewThemes: string[];
}

export const BENCHMARK_JDS: BenchmarkJD[] = [
  {
    id: 'jd-openai-infra',
    roleId: 'role-openai-ai-infra',
    company: 'OpenAI',
    title: 'Research Engineer / Systems (AI Infrastructure)',
    location: 'San Francisco, CA / Hybrid',
    tier: 'Elite Frontier',
    overview: 'Join the team building the supercomputing and inference substrates that power frontier models (GPT-4o, o1, Sora). You will write low-level systems software to orchestrate tens of thousands of GPUs with sub-millisecond reliability.',
    hardRequirements: [
      'Deep fluency with GPU kernel development (CUDA, Triton) and PyTorch internals.',
      'Demonstrated experience with distributed training/serving frameworks (Megatron-LM, vLLM, TensorRT-LLM).',
      'Solid foundations in distributed consensus, RDMA/RoCE networking, and InfiniBand topologies.',
      'Proficiency in Modern C++ and Systems Python.'
    ],
    softRequirements: [
      'High tolerance for ambiguity and changing research directions.',
      'First-principles orientation: ability to question existing paradigms when hardware limits are breached.',
      'Extreme ownership: diagnosing cluster stragglers and memory leaks end-to-end.'
    ],
    keyMissions: [
      'Squeeze the last 15% of MFU (Model FLOPs Utilization) from bleeding-edge accelerator clusters.',
      'Eliminate tail latencies in streaming token delivery down to 5ms TTFT (Time to First Token).',
      'Build resilient automated checkpointing systems capable of absorbing frequent node hardware dropouts.'
    ],
    evaluationRubric: {
      systemDesignWeight: 0.35,
      codingPurityWeight: 0.35,
      communicationWeight: 0.15,
      culturalWeight: 0.15
    },
    sampleInterviewThemes: [
      'Design an auto-healing distributed checkpointing pipeline for a 16,000 GPU cluster.',
      'How would you diagnose a sudden 30% drop in throughput across an all-reduce ring topology?',
      'Walk through the memory hierarchy differences between SRAM and HBM3 on the Hopper architecture.'
    ]
  },
  {
    id: 'jd-google-dist',
    roleId: 'role-google-dist-lead',
    company: 'Google',
    title: 'Senior Software Engineer, Distributed Systems (Core Infrastructure)',
    location: 'Mountain View, CA / Sunnyvale, CA',
    tier: 'FAANG Flagship',
    overview: 'As an architect within Google Core, you will engineer planetary-scale primitives that support Search, YouTube, and Google Cloud with 99.999% availability under petabyte-per-second concurrency.',
    hardRequirements: [
      '7+ years writing production-grade C++ or Go for distributed environments.',
      'Deep mastery of consensus algorithms (Raft, Multi-Paxos, Spanner TrueTime).',
      'Track record of optimizing cache-coherency, lockless data structures, and RPC serialization protocols (Proto3/CapnProto).'
    ],
    softRequirements: [
      'Exemplary technical writing: authoring clear, battle-tested Design Documents.',
      'Ability to mentor junior engineers and shepherd consensus across cross-functional teams.'
    ],
    keyMissions: [
      'Modernize foundational multi-tenant storage clusters to reduce tail p99 latencies by 25%.',
      'Architect geo-distributed replication engines resilient against fiber cuts and regional blackouts.'
    ],
    evaluationRubric: {
      systemDesignWeight: 0.40,
      codingPurityWeight: 0.30,
      communicationWeight: 0.15,
      culturalWeight: 0.15
    },
    sampleInterviewThemes: [
      'Design a globally consistent distributed key-value store with bounded staleness guarantees.',
      'Explain how Spanner leverages atomic clocks and GPS receivers to prevent commit order ambiguity.',
      'Debug a cascading RPC timeout storm across interdependent microservices.'
    ]
  },
  {
    id: 'jd-jane-street-quant',
    roleId: 'role-jane-street-quant',
    company: 'Jane Street',
    title: 'Quantitative Trader / Software Engineer',
    location: 'New York, NY / London',
    tier: 'Tier-1 Quant',
    overview: 'At Jane Street, trading and technology are inseparable. We build our own ultra-low latency trading systems from scratch using OCaml and C++, trading trillions of dollars annually on global exchanges.',
    hardRequirements: [
      'Profound mathematical intuition: probability, statistics, combinatorics, and mental arithmetic.',
      'Superb programming discipline: functional programming paradigms or modern C++.',
      'Understanding of Linux kernel networking, socket buffers, and CPU architecture.'
    ],
    softRequirements: [
      'Bayesian humility: willing to update beliefs instantly in the face of counter-evidence.',
      'Egalitarian, ego-free collaboration in intense real-time market regimes.'
    ],
    keyMissions: [
      'Formulate and backtest systematic trading strategies on high-frequency order books.',
      'Refactor core tick processing loops to shave sub-microsecond latency off critical execution paths.'
    ],
    evaluationRubric: {
      systemDesignWeight: 0.20,
      codingPurityWeight: 0.40,
      communicationWeight: 0.20,
      culturalWeight: 0.20
    },
    sampleInterviewThemes: [
      'Expected value and conditional probability brainteasers under time pressure.',
      'Given an order book feed with jitter and packet loss, design a deterministic arbitration engine.',
      'How would you detect adverse selection when trading an illiquid ETF basket against broad index futures?'
    ]
  },
  {
    id: 'jd-stripe-ai-product',
    roleId: 'role-stripe-ai-product',
    company: 'Stripe',
    title: 'Staff Software Engineer, AI Platforms & Experiences',
    location: 'San Francisco, CA / Remote',
    tier: 'Fintech Titan',
    overview: 'Stripe is the economic infrastructure for the internet. You will infuse generative intelligence directly into payment flows, fraud radar detection, and developer integration copilots.',
    hardRequirements: [
      'Extensive experience deploying end-to-end LLM workflows (hybrid Graph-RAG, tool calling, eval harnesses).',
      'Track record of building APIs trusted by millions of developers worldwide.',
      'Strong full-stack acumen with deep mastery of TypeScript and Python.'
    ],
    softRequirements: [
      'Unrelenting taste for pristine developer experience and documentation craft.',
      'Ability to translate ambiguous C-suite business goals into precise engineering milestones.'
    ],
    keyMissions: [
      'Build zero-hallucination document intelligence pipelines for global compliance validation.',
      'Architect real-time fraud mitigation agent swarms evaluating transactions within 100ms budget.'
    ],
    evaluationRubric: {
      systemDesignWeight: 0.35,
      codingPurityWeight: 0.25,
      communicationWeight: 0.25,
      culturalWeight: 0.15
    },
    sampleInterviewThemes: [
      'Design a fault-tolerant Graph-RAG system for Stripe Docs that synthesizes accurate multi-API code examples.',
      'How would you handle non-deterministic LLM outputs in an automated accounting ledger reconciliation flow?'
    ]
  }
];
