import { ConstellationAlignment, KGNode } from '../../types/graph';
import { kgEngine } from '../kgEngine';

export interface ConstellationVisualGraph {
  nodes: (KGNode & { x: number; y: number; isCenter?: boolean; isRequired?: boolean; isMissing?: boolean; isUnlocked?: boolean })[];
  links: { sourceId: string; targetId: string; relation: string; isHighlighted: boolean; weight: number }[];
}

export class ConstellationAgent {
  /**
   * Generates comprehensive Constellation Alignment report
   */
  public generateAlignment(userSkillIds: string[], targetRoleId: string): ConstellationAlignment {
    return kgEngine.calculateConstellationAlignment(userSkillIds, targetRoleId);
  }

  /**
   * Prepares celestial orbit layout coordinates for the interactive Constellation graph visualizer
   */
  public generateVisualGraph(
    userSkillIds: string[], 
    targetRoleId: string,
    width: number = 800,
    height: number = 600
  ): ConstellationVisualGraph {
    const alignment = this.generateAlignment(userSkillIds, targetRoleId);
    const roleNode = kgEngine.getNode(targetRoleId);
    const allNodes = kgEngine.getAllNodes();
    const allEdges = kgEngine.getAllEdges();

    const unlockedSet = new Set(userSkillIds);
    const requiredSkillIds = new Set(kgEngine.getRequiredSkillsForRole(targetRoleId).map(r => r.skillNode.id));

    // Calculate highlighted path edges from multi-hop paths
    const highlightedEdgeKeys = new Set<string>();
    for (const path of alignment.multiHopPaths) {
      for (const edge of path.edges) {
        highlightedEdgeKeys.add(`${edge.source}->${edge.target}`);
      }
    }

    const centerX = width / 2;
    const centerY = height / 2;

    // Filter relevant nodes: Role, Company, Required skills, User skills, and Intermediate bridge hops
    const relevantNodeIds = new Set<string>();
    if (roleNode) relevantNodeIds.add(roleNode.id);
    for (const id of userSkillIds) relevantNodeIds.add(id);
    for (const id of requiredSkillIds) relevantNodeIds.add(id);
    for (const p of alignment.multiHopPaths) {
      for (const hop of p.hops) relevantNodeIds.add(hop.id);
    }

    const filteredNodes = allNodes.filter(n => relevantNodeIds.has(n.id));

    // Assign celestial orbital positions
    const visualNodes = filteredNodes.map((n, index) => {
      let x = centerX;
      let y = centerY;
      const isCenter = n.id === targetRoleId;
      const isRequired = requiredSkillIds.has(n.id);
      const isUnlocked = unlockedSet.has(n.id);
      const isMissing = isRequired && !isUnlocked;

      if (!isCenter) {
        // Distribute on concentric celestial rings
        const ringRadius = isRequired ? 180 : isUnlocked ? 270 : 220;
        const totalInRing = filteredNodes.length - 1 || 1;
        const angle = (index / totalInRing) * 2 * Math.PI - Math.PI / 2;
        x = centerX + ringRadius * Math.cos(angle);
        y = centerY + ringRadius * Math.sin(angle);
      }

      return {
        ...n,
        x,
        y,
        isCenter,
        isRequired,
        isMissing,
        isUnlocked
      };
    });

    const links = allEdges
      .filter(e => relevantNodeIds.has(e.source) && relevantNodeIds.has(e.target))
      .map(e => ({
        sourceId: e.source,
        targetId: e.target,
        relation: e.relation,
        weight: e.weight,
        isHighlighted: highlightedEdgeKeys.has(`${e.source}->${e.target}`) || 
                       (e.source === targetRoleId && requiredSkillIds.has(e.target))
      }));

    return {
      nodes: visualNodes,
      links
    };
  }
}

export const constellationAgent = new ConstellationAgent();
