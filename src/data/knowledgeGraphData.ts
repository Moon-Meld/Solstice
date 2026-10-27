import { KGNode, KGEdge } from '../types/graph';

export const INITIAL_KG_NODES: KGNode[] = [
  // --- Skills: Languages & Core ---
  { id: 'skill-python', label: 'Python (Async/Profiling)', type: 'skill', category: 'core', tier: 1, domain: 'Software', description: 'Proficiency in idiomatic Python, concurrency, memory profiling, and C-extensions.' },
  { id: 'skill-cpp', label: 'Modern C++ (20/23)', type: 'skill', category: 'advanced', tier: 2, domain: 'Systems', description: 'Zero-cost abstractions, template metaprogramming, memory arenas, cache alignment.' },
  { id: 'skill-rust', label: 'Rust & Memory Safety', type: 'skill', category: 'advanced', tier: 2, domain: 'Systems', description: 'Ownership semantics, async Tokio runtime, lock-free concurrency, FFI.' },
  { id: 'skill-go', label: 'Go & Goroutine Internals', type: 'skill', category: 'core', tier: 1, domain: 'Cloud', description: 'Microservices, gRPC, channel architecture, garbage collection tuning.' },

  // --- Skills: Systems & Distributed ---
  { id: 'skill-dist-sys', label: 'Distributed Consensus (Raft/Paxos)', type: 'skill', category: 'systemic', tier: 2, domain: 'Infrastructure', description: 'Partition tolerance, leader election, log replication, split-brain recovery.' },
  { id: 'skill-vector-db', label: 'Vector Indexing (HNSW/IVF)', type: 'skill', category: 'systemic', tier: 2, domain: 'AI Infra', description: 'Approximate nearest neighbor search, Milvus/Qdrant optimization, embedding quantization.' },
  { id: 'skill-low-latency', label: 'Sub-Microsecond Latency Optimization', type: 'skill', category: 'niche', tier: 3, domain: 'Quant Infra', description: 'Kernel bypass (DPDK/Solarflare), CPU pinning, branch prediction tuning, cacheline optimization.' },
  { id: 'skill-cuda', label: 'CUDA & Triton Kernel Programming', type: 'skill', category: 'niche', tier: 3, domain: 'AI Infra', description: 'GPU memory hierarchy (SRAM/HBM), FlashAttention implementation, tensor core tiling.' },

  // --- Skills: AI & Large Language Models ---
  { id: 'skill-rag-triad', label: 'Graph-RAG & Hybrid Semantic Retrieval', type: 'skill', category: 'advanced', tier: 2, domain: 'AI Engineering', description: 'Multi-hop graph traversal, cross-encoder reranking, context compression, hallucination mitigation.' },
  { id: 'skill-llm-serving', label: 'LLM Serving (vLLM, TensorRT-LLM)', type: 'skill', category: 'systemic', tier: 2, domain: 'AI Infra', description: 'PagedAttention, continuous batching, speculative decoding, pipeline parallelism.' },
  { id: 'skill-peft', label: 'Fine-Tuning & Alignment (LoRA / DPO)', type: 'skill', category: 'advanced', tier: 2, domain: 'Machine Learning', description: 'Parameter-efficient adaptation, reward modeling, Direct Preference Optimization.' },
  
  // --- Skills: Quant & Analytics ---
  { id: 'skill-stochastic-calc', label: 'Stochastic Calculus & Martingales', type: 'skill', category: 'niche', tier: 3, domain: 'Quantitative', description: 'Itô calculus, Black-Scholes PDE, Jump-diffusion models, risk-neutral measures.' },
  { id: 'skill-time-series', label: 'High-Frequency Order Book Microstructure', type: 'skill', category: 'advanced', tier: 2, domain: 'Quantitative', description: 'L2/L3 order book dynamics, market impact modeling, slippage minimization.' },

  // --- Skills: Product, Strategy & Leadership ---
  { id: 'skill-star-framing', label: 'Executive STAR Storytelling', type: 'skill', category: 'behavioral', tier: 1, domain: 'Communication', description: 'Synthesizing ambiguous strategic triumphs into high-potency quantitative narratives.' },
  { id: 'skill-first-principles', label: 'First-Principles System Deconstruction', type: 'skill', category: 'systemic', tier: 2, domain: 'Strategy', description: 'Unpacking legacy assumptions down to fundamental physics and mathematical constraints.' },
  { id: 'skill-cross-orchestration', label: 'Cross-Organizational Influence', type: 'skill', category: 'behavioral', tier: 2, domain: 'Leadership', description: 'Unifying disparate product, research, and infrastructure divisions under high urgency.' },

  // --- Target Roles ---
  { id: 'role-openai-ai-infra', label: 'AI Systems Engineer (OpenAI / Anthropic)', type: 'role', category: 'systemic', tier: 3, domain: 'Elite Frontier Lab', description: 'Architect massive distributed training clusters, custom inference engines, and fault-tolerant checkpointing.' },
  { id: 'role-google-dist-lead', label: 'Senior Distributed Systems Architect (Google)', type: 'role', category: 'systemic', tier: 3, domain: 'Big Tech Flagship', description: 'Design planetary-scale storage, Spanner-class consensus, and resilient multi-region infrastructure.' },
  { id: 'role-jane-street-quant', label: 'Quantitative Strategist / Dev (Jane Street)', type: 'role', category: 'niche', tier: 3, domain: 'Elite High-Frequency Trading', description: 'Bridge deep functional programming (OCaml/C++) with probabilistic alpha generation and ultra-fast execution.' },
  { id: 'role-stripe-ai-product', label: 'AI Product Engineering Lead (Stripe)', type: 'role', category: 'advanced', tier: 2, domain: 'Fintech Titan', description: 'Harmonize developer-delight APIs, zero-failure financial compliance, and generative AI copilot workflows.' },
  { id: 'role-mckinsey-qb-lead', label: 'Senior Digital Transformation Associate (McKinsey QB)', type: 'role', category: 'advanced', tier: 2, domain: 'Strategic Consulting', description: 'Guide Fortune 50 C-suite through AI transformation, capital allocation, and enterprise graph deployments.' },

  // --- Target Companies ---
  { id: 'comp-openai', label: 'OpenAI', type: 'company', category: 'culture', domain: 'AGI Research', description: 'Driven by high velocity, high-compute risk tolerance, mission-driven intensity.' },
  { id: 'comp-google', label: 'Google DeepMind / Core', type: 'company', category: 'culture', domain: 'Foundational Tech', description: 'Peer-reviewed academic rigor, planetary scale, peerless fault-tolerance.' },
  { id: 'comp-jane-street', label: 'Jane Street', type: 'company', category: 'culture', domain: 'Market Making', description: 'Decentralized intellectual honesty, Bayesian humility, mathematical purism.' },
  { id: 'comp-stripe', label: 'Stripe', type: 'company', category: 'culture', domain: 'Internet Economy', description: 'Obsessive craftsmanship, micro-copy perfection, operational elegance.' }
];

export const INITIAL_KG_EDGES: KGEdge[] = [
  // --- Role Prerequisites (requires) ---
  { id: 'e-1', source: 'role-openai-ai-infra', target: 'skill-cuda', relation: 'requires', weight: 0.95, rationale: 'Writing custom GPU kernels is non-negotiable for low-level latency & memory bottlenecks.' },
  { id: 'e-2', source: 'role-openai-ai-infra', target: 'skill-llm-serving', relation: 'requires', weight: 0.90, rationale: 'Continuous batching and PagedAttention are foundational for serving billions of tokens.' },
  { id: 'e-3', source: 'role-openai-ai-infra', target: 'skill-dist-sys', relation: 'requires', weight: 0.85, rationale: 'Handling node failures across thousands of H100 clusters requires rock-solid consensus knowledge.' },
  { id: 'e-4', source: 'role-openai-ai-infra', target: 'skill-python', relation: 'requires', weight: 0.80, rationale: 'PyTorch runtime, orchestration pipelines, and profiling harnesses.' },

  { id: 'e-5', source: 'role-google-dist-lead', target: 'skill-cpp', relation: 'requires', weight: 0.95, rationale: 'Core Google services run on high-performance modern C++ infrastructure.' },
  { id: 'e-6', source: 'role-google-dist-lead', target: 'skill-dist-sys', relation: 'requires', weight: 0.98, rationale: 'Understanding Paxos, Spanner TrueTime, and linearizability is mandatory.' },
  { id: 'e-7', source: 'role-google-dist-lead', target: 'skill-go', relation: 'requires', weight: 0.75, rationale: 'Kubernetes and cloud-native control planes.' },
  { id: 'e-8', source: 'role-google-dist-lead', target: 'skill-first-principles', relation: 'requires', weight: 0.90, rationale: 'Deconstructing petabyte-scale architectural bottlenecks.' },

  { id: 'e-9', source: 'role-jane-street-quant', target: 'skill-low-latency', relation: 'requires', weight: 0.95, rationale: 'Tick-to-trade microseconds dictate profitability in volatile regimes.' },
  { id: 'e-10', source: 'role-jane-street-quant', target: 'skill-time-series', relation: 'requires', weight: 0.90, rationale: 'Dissecting queue position and order book dynamics.' },
  { id: 'e-11', source: 'role-jane-street-quant', target: 'skill-stochastic-calc', relation: 'requires', weight: 0.88, rationale: 'Mathematical framework for pricing derivatives and volatility arbitrage.' },
  { id: 'e-12', source: 'role-jane-street-quant', target: 'skill-cpp', relation: 'requires', weight: 0.85, rationale: 'High performance execution loops.' },

  { id: 'e-13', source: 'role-stripe-ai-product', target: 'skill-rag-triad', relation: 'requires', weight: 0.92, rationale: 'Powering context-aware financial co-pilots and dispute intelligence.' },
  { id: 'e-14', source: 'role-stripe-ai-product', target: 'skill-python', relation: 'requires', weight: 0.85, rationale: 'Fast iteration and AI API orchestrations.' },
  { id: 'e-15', source: 'role-stripe-ai-product', target: 'skill-cross-orchestration', relation: 'requires', weight: 0.90, rationale: 'Aligning product managers, legal compliance, and frontier engineers.' },

  // --- Skill Bridges (bridges_to) - Foundation for Multi-Hop Pathfinding ---
  { id: 'b-1', source: 'skill-python', target: 'skill-rag-triad', relation: 'bridges_to', weight: 0.85, rationale: 'Python fluency allows rapid mastery of vector indexing, LangGraph, and hybrid RAG pipelines.' },
  { id: 'b-2', source: 'skill-rag-triad', target: 'skill-vector-db', relation: 'bridges_to', weight: 0.80, rationale: 'Building RAG applications naturally reveals the need for HNSW indexing and distributed vector storage.' },
  { id: 'b-3', source: 'skill-vector-db', target: 'skill-dist-sys', relation: 'bridges_to', weight: 0.75, rationale: 'Scaling vector databases requires sharding, raft consensus, and replication topology.' },
  { id: 'b-4', source: 'skill-dist-sys', target: 'skill-llm-serving', relation: 'bridges_to', weight: 0.88, rationale: 'Tensor and pipeline model parallelism relies deeply on distributed consensus & all-reduce topologies.' },
  { id: 'b-5', source: 'skill-llm-serving', target: 'skill-cuda', relation: 'bridges_to', weight: 0.82, rationale: 'Optimizing memory footprint in vLLM leads directly to custom Triton/CUDA kernel compilation.' },

  { id: 'b-6', source: 'skill-python', target: 'skill-go', relation: 'bridges_to', weight: 0.70, rationale: 'Transitioning from Python asyncio to Go concurrent goroutines provides a gentle onramp to systems.' },
  { id: 'b-7', source: 'skill-go', target: 'skill-cpp', relation: 'bridges_to', weight: 0.65, rationale: 'Understanding pointers and memory layouts in Go paves the way for modern C++ zero-cost abstractions.' },
  { id: 'b-8', source: 'skill-cpp', target: 'skill-low-latency', relation: 'bridges_to', weight: 0.90, rationale: 'Mastery of C++ memory layouts and assembly translation unlocks sub-microsecond latency engineering.' },
  { id: 'b-9', source: 'skill-cpp', target: 'skill-cuda', relation: 'bridges_to', weight: 0.85, rationale: 'CUDA is fundamentally an extension of C++ memory hierarchy and SIMT thread blocks.' },

  // --- Company Culture Alignments ---
  { id: 'c-1', source: 'comp-openai', target: 'role-openai-ai-infra', relation: 'culturally_values', weight: 0.95, rationale: 'OpenAI values builders who can single-handedly diagnose distributed loss spikes at midnight.' },
  { id: 'c-2', source: 'comp-google', target: 'role-google-dist-lead', relation: 'culturally_values', weight: 0.95, rationale: 'Google culture demands multi-decade longevity, formal verification, and design doc rigor.' },
  { id: 'c-3', source: 'comp-jane-street', target: 'role-jane-street-quant', relation: 'culturally_values', weight: 0.98, rationale: 'Jane Street fosters radical egalitarian debate, probabilistic humility, and peer code reviews.' },
  { id: 'c-4', source: 'comp-stripe', target: 'role-stripe-ai-product', relation: 'culturally_values', weight: 0.94, rationale: 'Stripe venerates written prose, user friction elimination, and beautiful documentation.' }
];
