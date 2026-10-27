import { ConstellationAlignment, KGNode } from '../../types/graph';
import { CompetencyRadar, RoadmapMilestone } from '../../types';
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

  /**
   * Generates a 5-axis competency radar comparing candidate against target role benchmark
   */
  public generateCompetencyRadar(userSkillIds: string[], _targetRoleId: string): CompetencyRadar {
    const hasDistSys = userSkillIds.includes('skill-dist-sys');
    const hasCUDA = userSkillIds.includes('skill-cuda');
    const hasLowLatency = userSkillIds.includes('skill-low-latency');
    const hasRAG = userSkillIds.includes('skill-rag-triad');
    const hasFirstPrinciples = userSkillIds.includes('skill-first-principles');

    return {
      labels: [
        '系统架构与并发',
        '算法与数学严谨',
        '底层内存与加速',
        '前沿 AI 与 RAG',
        '战略拆解与统御'
      ],
      candidateScores: [
        hasDistSys ? 92 : 65,
        hasLowLatency ? 88 : 70,
        hasCUDA ? 90 : 58,
        hasRAG ? 94 : 60,
        hasFirstPrinciples ? 91 : 72
      ],
      benchmarkScores: [95, 90, 88, 92, 90]
    };
  }

  /**
   * Generates a concrete 3-phase milestone roadmap for bridging a skill gap
   */
  public generateMilestoneRoadmap(sourceLabel: string, targetLabel: string): RoadmapMilestone[] {
    return [
      {
        phase: 1,
        title: `破题与第一性原理奠基 (${sourceLabel} 原理下潜)`,
        durationWeeks: 2,
        keyConcepts: ['内存层级模型', '异步流水线与调度器', '局部性与缓存行对齐'],
        readingMaterials: ['《Computer Systems: A Programmer\'s Perspective》', '经典论文精读：FlashAttention-2 算法架构'],
        milestoneProject: `编写微基准测试工具，量化 ${sourceLabel} 在高并发条件下的 CPU 周期与内存命中率`,
        verificationCriteria: '能够独立绘制出完整数据流与上下文切换汇编跟踪图'
      },
      {
        phase: 2,
        title: `工程攻坚与分布式/硬件对齐 (${targetLabel} 骨骼搭建)`,
        durationWeeks: 3,
        keyConcepts: ['无锁环形队列', '批处理流水线', '显存张量重构与分片'],
        readingMaterials: ['Megatron-LM & vLLM 核心源码架构图', 'Triton Kernel 算子融合官方指南'],
        milestoneProject: `实现一个端到端的轻量化优化模块，使核心数据搬运延迟降低 35% 以上`,
        verificationCriteria: '在合成负载下维持 99.9% 吞吐稳定性，且无任何死锁或异常'
      },
      {
        phase: 3,
        title: `主权落地与名企标杆评测 (冲击顶尖工程标准)`,
        durationWeeks: 2,
        keyConcepts: ['端到端性能调优', '容错与看门狗回路', '量化成果叙事提取'],
        readingMaterials: ['OpenAI / Google Core 生产环境事故复盘文库'],
        milestoneProject: `撰写系统设计白皮书并开源至 GitHub，提供完备的压力测试报告与 Benchmark 对比`,
        verificationCriteria: '项目在生产级模拟集群通过 100,000 QPS 极限量级压力验证'
      }
    ];
  }
}

export const constellationAgent = new ConstellationAgent();
