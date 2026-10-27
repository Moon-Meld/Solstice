export interface PowerVerb {
  verb: string;
  category: 'Architected' | 'Optimized' | 'Spearheaded' | 'Transformed' | 'Synthesized';
  impactTier: 'Executive' | 'Deep-Technical' | 'Strategic';
  substituteFor: string[];
}

export const POWER_VERBS: PowerVerb[] = [
  { verb: 'Orchestrated', category: 'Spearheaded', impactTier: 'Executive', substituteFor: ['helped with', 'managed', 'worked on', 'led'] },
  { verb: 'Spearheaded', category: 'Spearheaded', impactTier: 'Executive', substituteFor: ['started', 'was responsible for', 'handled'] },
  { verb: 'Engineered', category: 'Architected', impactTier: 'Deep-Technical', substituteFor: ['coded', 'built', 'developed', 'made'] },
  { verb: 'Architected', category: 'Architected', impactTier: 'Deep-Technical', substituteFor: ['designed', 'created', 'set up'] },
  { verb: 'Decoupled', category: 'Architected', impactTier: 'Deep-Technical', substituteFor: ['separated', 'refactored', 'cleaned up'] },
  { verb: 'Accelerated', category: 'Optimized', impactTier: 'Deep-Technical', substituteFor: ['made faster', 'improved', 'boosted'] },
  { verb: 'Pruned', category: 'Optimized', impactTier: 'Deep-Technical', substituteFor: ['reduced', 'deleted', 'cut'] },
  { verb: 'Galvanized', category: 'Transformed', impactTier: 'Executive', substituteFor: ['motivated', 'convinced', 'talked to'] },
  { verb: 'Pioneered', category: 'Transformed', impactTier: 'Strategic', substituteFor: ['tried', 'explored', 'researched'] },
  { verb: 'Synthesized', category: 'Synthesized', impactTier: 'Strategic', substituteFor: ['combined', 'gathered', 'analyzed'] }
];

export interface StarTransformationRule {
  domain: string;
  before: string;
  after: string;
  critique: string;
  potencyIncrease: number;
}

export const STAR_GOLDEN_EXAMPLES: StarTransformationRule[] = [
  {
    domain: 'AI / Distributed Systems',
    before: 'Worked on PyTorch model training and fixed GPU memory issues when running large batches.',
    after: 'Engineered custom Triton FlashAttention kernels and zero-redundancy optimizer (ZeRO-3) sharding, reducing peak GPU VRAM footprint by 44% and enabling unblocked 32k context-window fine-tuning on 128 H100 nodes.',
    critique: 'Replaced passive phrasing ("worked on", "fixed") with precise technical primitives (Triton kernels, ZeRO-3) and unyielding quantitative triumph (44% VRAM reduction, 128 H100 scale).',
    potencyIncrease: 48
  },
  {
    domain: 'Backend / Infrastructure',
    before: 'Helped improve the database speed and wrote some API endpoints in Go for the payments service.',
    after: 'Architected lock-free memory ring buffers and pipeline batching in Go, slashing p99 transaction commit latency from 140ms to 8.2ms under 85,000 req/sec peak concurrency.',
    critique: 'Transitions from vague maintenance tasks to definitive architectural sovereignty with unambiguous p99 latency compression.',
    potencyIncrease: 52
  },
  {
    domain: 'Product Strategy / AI Copilot',
    before: 'Assisted in building an AI chatbot for customer support that answered user questions.',
    after: 'Spearheaded the enterprise Graph-RAG retrieval pipeline with cross-encoder reranking, lifting automated ticket deflection from 12% to 68% and saving $1.4M in annualized human triage overhead.',
    critique: 'Binds technical implementation directly to executive balance-sheet impact ($1.4M saved) and customer deflection metrics.',
    potencyIncrease: 45
  }
];
