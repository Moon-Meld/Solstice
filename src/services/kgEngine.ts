import { KGNode, KGEdge, MultiHopPath, ConstellationAlignment } from '../types/graph';
import { INITIAL_KG_NODES, INITIAL_KG_EDGES } from '../data/knowledgeGraphData';

export class KnowledgeGraphEngine {
  private nodes: Map<string, KGNode> = new Map();
  private edges: KGEdge[] = [];
  private adjacency: Map<string, { targetId: string; edge: KGEdge }[]> = new Map();

  constructor() {
    this.initialize(INITIAL_KG_NODES, INITIAL_KG_EDGES);
  }

  public initialize(nodes: KGNode[], edges: KGEdge[]) {
    this.nodes.clear();
    this.edges = [...edges];
    this.adjacency.clear();

    for (const node of nodes) {
      this.nodes.set(node.id, { ...node });
      this.adjacency.set(node.id, []);
    }

    for (const edge of edges) {
      const neighbors = this.adjacency.get(edge.source) || [];
      neighbors.push({ targetId: edge.target, edge });
      this.adjacency.set(edge.source, neighbors);
    }
  }

  public getAllNodes(): KGNode[] {
    return Array.from(this.nodes.values());
  }

  public getNode(id: string): KGNode | undefined {
    return this.nodes.get(id);
  }

  public getAllEdges(): KGEdge[] {
    return this.edges;
  }

  public getRoleNodes(): KGNode[] {
    return this.getAllNodes().filter(n => n.type === 'role');
  }

  public getRequiredSkillsForRole(roleId: string): { skillNode: KGNode; edge: KGEdge }[] {
    const roleEdges = this.edges.filter(e => e.source === roleId && e.relation === 'requires');
    const result: { skillNode: KGNode; edge: KGEdge }[] = [];
    for (const edge of roleEdges) {
      const skillNode = this.nodes.get(edge.target);
      if (skillNode) {
        result.push({ skillNode, edge });
      }
    }
    return result;
  }

  /**
   * Multi-hop Pathfinding (BFS / Shortest Path over 'bridges_to' or 'synergizes_with' relations)
   * Charts how a candidate can travel from an existing unlocked skill to a missing required skill.
   */
  public findMultiHopBridge(sourceSkillId: string, targetSkillId: string): MultiHopPath | null {
    if (sourceSkillId === targetSkillId) return null;

    interface QueueItem {
      currentId: string;
      pathNodes: KGNode[];
      pathEdges: KGEdge[];
    }

    const queue: QueueItem[] = [];
    const visited = new Set<string>();

    const startNode = this.nodes.get(sourceSkillId);
    const endNode = this.nodes.get(targetSkillId);
    if (!startNode || !endNode) return null;

    queue.push({
      currentId: sourceSkillId,
      pathNodes: [startNode],
      pathEdges: []
    });
    visited.add(sourceSkillId);

    while (queue.length > 0) {
      const { currentId, pathNodes, pathEdges } = queue.shift()!;

      if (currentId === targetSkillId) {
        const hopCount = pathNodes.length - 1;
        return {
          sourceNodeId: sourceSkillId,
          targetNodeId: targetSkillId,
          hops: pathNodes,
          edges: pathEdges,
          difficulty: hopCount <= 1 ? 'direct' : hopCount === 2 ? 'steep' : 'quantum-leap',
          estimatedWeeks: hopCount * 3,
          rationale: `Traverse from ${startNode.label} through ${pathNodes.slice(1, -1).map(n => n.label).join(' \u2192 ') || 'direct mastery'} to achieve ${endNode.label}.`
        };
      }

      // Check outgoing bridge edges
      const neighbors = this.adjacency.get(currentId) || [];
      for (const { targetId, edge } of neighbors) {
        if (edge.relation === 'bridges_to' || edge.relation === 'synergizes_with') {
          if (!visited.has(targetId)) {
            visited.add(targetId);
            const nextNode = this.nodes.get(targetId);
            if (nextNode) {
              queue.push({
                currentId: targetId,
                pathNodes: [...pathNodes, nextNode],
                pathEdges: [...pathEdges, edge]
              });
            }
          }
        }
      }
    }

    return null;
  }

  /**
   * Comprehensive Constellation Alignment
   * Calculates match score, unlocked nodes, missing nodes, and charts multi-hop growth paths.
   */
  public calculateConstellationAlignment(
    userSkillIds: string[], 
    targetRoleId: string
  ): ConstellationAlignment {
    const roleNode = this.nodes.get(targetRoleId);
    const roleTitle = roleNode ? roleNode.label : 'Target Role';

    // Find company linked to role
    const compEdge = this.edges.find(e => e.target === targetRoleId && e.relation === 'culturally_values');
    const compNode = compEdge ? this.nodes.get(compEdge.source) : undefined;
    const companyName = compNode ? compNode.label : 'Elite Enterprise';

    const requiredSkillsWithEdges = this.getRequiredSkillsForRole(targetRoleId);
    const requiredSkills = requiredSkillsWithEdges.map(r => r.skillNode);

    const unlockedSet = new Set(userSkillIds);
    const unlockedNodes: KGNode[] = [];
    const missingNodes: KGNode[] = [];

    for (const reqSkill of requiredSkills) {
      if (unlockedSet.has(reqSkill.id)) {
        unlockedNodes.push(reqSkill);
      } else {
        missingNodes.push(reqSkill);
      }
    }

    // Multi-hop pathfinding for missing skills
    const multiHopPaths: MultiHopPath[] = [];
    for (const missing of missingNodes) {
      let bestPath: MultiHopPath | null = null;
      // Search from each of the user's unlocked skills
      for (const userSkillId of userSkillIds) {
        const path = this.findMultiHopBridge(userSkillId, missing.id);
        if (path) {
          if (!bestPath || path.hops.length < bestPath.hops.length) {
            bestPath = path;
          }
        }
      }
      if (bestPath) {
        multiHopPaths.push(bestPath);
      }
    }

    // Weight calculation
    const totalCount = requiredSkills.length || 1;
    const baseScore = Math.round((unlockedNodes.length / totalCount) * 80);
    // Add bonus if paths exist
    const bridgeBonus = Math.min(20, multiHopPaths.length * 5);
    const overallMatchScore = Math.min(100, baseScore + (unlockedNodes.length === totalCount ? 20 : bridgeBonus));

    const culturalSynergies = compNode ? [
      `${companyName} high-resonance cultural axis identified: ${compNode.description}`,
      `Architectural autonomy verified across ${unlockedNodes.length} core competencies.`,
      `Growth trajectory mapped via ${multiHopPaths.length} multi-hop bridging vectors.`
    ] : ['Excellence and precision oriented.'];

    return {
      targetRoleId,
      targetRoleTitle: roleTitle,
      companyName,
      overallMatchScore,
      unlockedSkillsCount: unlockedNodes.length,
      requiredSkillsCount: requiredSkills.length,
      unlockedNodes,
      missingNodes,
      multiHopPaths,
      culturalSynergies
    };
  }
}

export const kgEngine = new KnowledgeGraphEngine();
