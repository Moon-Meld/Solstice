export type NodeType = 'skill' | 'role' | 'company' | 'competency' | 'course' | 'domain';

export type EdgeRelation = 
  | 'requires' 
  | 'bridges_to' 
  | 'culturally_values' 
  | 'evaluates' 
  | 'accelerates'
  | 'synergizes_with';

export interface KGNode {
  id: string;
  label: string;
  type: NodeType;
  category: 'core' | 'advanced' | 'niche' | 'systemic' | 'behavioral' | 'culture';
  tier?: 1 | 2 | 3; // 1 = Foundational, 2 = Differentiating, 3 = Vanguard / Elite
  domain: string;
  description: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  unlocked?: boolean; // True if the candidate possesses this skill node
}

export interface KGEdge {
  id: string;
  source: string;
  target: string;
  relation: EdgeRelation;
  weight: number; // 0.1 to 1.0 (coupling strength)
  rationale: string;
}

export interface MultiHopPath {
  sourceNodeId: string;
  targetNodeId: string;
  hops: KGNode[];
  edges: KGEdge[];
  difficulty: 'direct' | 'steep' | 'quantum-leap';
  estimatedWeeks: number;
  rationale: string;
}

export interface ConstellationAlignment {
  targetRoleId: string;
  targetRoleTitle: string;
  companyName: string;
  overallMatchScore: number; // 0 - 100
  unlockedSkillsCount: number;
  requiredSkillsCount: number;
  unlockedNodes: KGNode[];
  missingNodes: KGNode[];
  multiHopPaths: MultiHopPath[];
  culturalSynergies: string[];
}
