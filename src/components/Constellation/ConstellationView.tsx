import React, { useState } from 'react';
import { 
  Sparkles, 
  Orbit, 
  GitBranch, 
  Compass, 
  CheckCircle2, 
  CircleDashed, 
  Clock, 
  ArrowRight,
  ShieldAlert,
  BarChart3,
  BookOpen,
  Plus,
  X
} from 'lucide-react';
import { ConstellationAlignment, MultiHopPath } from '../../types/graph';
import { constellationAgent } from '../../services/agents/constellationAgent';
import { kgEngine } from '../../services/kgEngine';
import { RoadmapMilestone } from '../../types';

interface Props {
  userSkillIds: string[];
  targetRoleId: string;
  alignment: ConstellationAlignment | null;
  onToggleSkill: (skillId: string) => void;
  onAddCustomSkill?: (label: string) => void;
}

export const ConstellationView: React.FC<Props> = ({
  userSkillIds,
  targetRoleId,
  alignment,
  onToggleSkill,
  onAddCustomSkill
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'orbit' | 'radar'>('orbit');
  const [activeRoadmap, setActiveRoadmap] = useState<{ path: MultiHopPath; milestones: RoadmapMilestone[] } | null>(null);
  const [customSkillInput, setCustomSkillInput] = useState('');

  // Visual Graph
  const visualGraph = constellationAgent.generateVisualGraph(
    userSkillIds,
    targetRoleId,
    760,
    520
  );

  // Competency Radar
  const radarData = constellationAgent.generateCompetencyRadar(userSkillIds, targetRoleId);

  const selectedNode = selectedNodeId ? kgEngine.getNode(selectedNodeId) : null;
  const allAvailableSkills = kgEngine.getAllNodes().filter(n => n.type === 'skill');

  const handleOpenRoadmap = (path: MultiHopPath) => {
    const sourceLabel = path.hops[0]?.label || 'Current';
    const targetLabel = path.hops[path.hops.length - 1]?.label || 'Target';
    const milestones = constellationAgent.generateMilestoneRoadmap(sourceLabel, targetLabel);
    setActiveRoadmap({ path, milestones });
  };

  const handleAddSkill = () => {
    if (!customSkillInput.trim()) return;
    if (onAddCustomSkill) {
      onAddCustomSkill(customSkillInput.trim());
      setCustomSkillInput('');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Constellation Header Banner */}
      <div className="relative mb-8 p-6 rounded-3xl glass-panel-glow border border-solstice-gold/25 overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-solstice-celestial-blue/10 blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-solstice-celestial-blue/15 text-sky-400 border border-solstice-celestial-blue/30">
                <Orbit className="w-4 h-4" />
              </span>
              <h2 className="font-serif text-2xl font-bold tracking-wide celestial-gradient-text">
                星宿图 (Constellation) · 技能图谱与多跳对齐
              </h2>
            </div>
            <p className="mt-1 text-sm text-slate-300 max-w-2xl leading-relaxed">
              基于知识图谱 (KG) 的多跳路径推理，不仅识别当前与目标岗位的对齐度，更自动规划由浅入深的<strong>多跳跃迁技能天桥 (Multi-Hop Skill Bridges)</strong> 与阶梯攻坚路线。
            </p>
          </div>

          {/* Resonance Score Card */}
          <div className="flex items-center gap-4">
            <div className="px-5 py-3 rounded-2xl bg-solstice-900/90 border border-solstice-gold/40 text-center shadow-gold-glow">
              <div className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">天体对齐共振度</div>
              <div className="text-2xl font-bold font-mono gold-gradient-text mt-0.5">
                {alignment ? `${alignment.overallMatchScore}%` : '85%'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Interactive Astrolabe SVG (8 cols) + Multi-Hop Inspector (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Interactive Constellation Orbit Canvas / Radar (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="p-6 rounded-3xl glass-panel border border-solstice-700/60 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-solstice-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-solstice-gold" />
                <h3 className="text-sm font-semibold text-slate-100">
                  {alignment?.companyName} · {alignment?.targetRoleTitle}
                </h3>
              </div>

              {/* View Switcher: Orbit vs 5-Axis Radar */}
              <div className="flex items-center gap-1 p-1 bg-solstice-900 rounded-xl border border-solstice-800 text-xs">
                <button
                  onClick={() => setActiveTab('orbit')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
                    activeTab === 'orbit'
                      ? 'bg-solstice-gold text-solstice-950 font-bold shadow-gold-glow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Orbit className="w-3.5 h-3.5" />
                  <span>天体引力图</span>
                </button>
                <button
                  onClick={() => setActiveTab('radar')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
                    activeTab === 'radar'
                      ? 'bg-solstice-gold text-solstice-950 font-bold shadow-gold-glow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>五维能力雷达</span>
                </button>
              </div>
            </div>

            {/* Orbit Graph Mode */}
            {activeTab === 'orbit' ? (
              <div className="relative w-full h-[520px] flex items-center justify-center bg-solstice-950/80 rounded-2xl overflow-hidden mt-4 border border-solstice-800/80">
                <svg 
                  className="w-full h-full cursor-grab active:cursor-grabbing select-none"
                  viewBox="0 0 760 520"
                >
                  <defs>
                    <filter id="glow-gold" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="6" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                    <filter id="glow-cyan" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="6" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                    <linearGradient id="bridge-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#10B981" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.8" />
                    </linearGradient>
                  </defs>

                  {/* Celestial Concentric Orbital Rings */}
                  <circle cx="380" cy="260" r="100" fill="none" stroke="rgba(212, 175, 55, 0.08)" strokeDasharray="4 6" />
                  <circle cx="380" cy="260" r="180" fill="none" stroke="rgba(56, 189, 248, 0.08)" strokeDasharray="3 8" />
                  <circle cx="380" cy="260" r="240" fill="none" stroke="rgba(212, 175, 55, 0.05)" strokeDasharray="2 10" />

                  {/* Connecting Links */}
                  {visualGraph.links.map((link, idx) => {
                    const source = visualGraph.nodes.find(n => n.id === link.sourceId);
                    const target = visualGraph.nodes.find(n => n.id === link.targetId);
                    if (!source || !target) return null;

                    const isBridge = link.relation === 'bridges_to';

                    return (
                      <g key={idx}>
                        <line
                          x1={source.x}
                          y1={source.y}
                          x2={target.x}
                          y2={target.y}
                          stroke={link.isHighlighted ? (isBridge ? 'url(#bridge-gradient)' : '#D4AF37') : 'rgba(71, 85, 105, 0.25)'}
                          strokeWidth={link.isHighlighted ? (isBridge ? 2.5 : 1.8) : 1}
                          strokeDasharray={isBridge ? '5 3' : 'none'}
                          className={link.isHighlighted ? 'animate-pulse' : ''}
                        />
                      </g>
                    );
                  })}

                  {/* Star Nodes */}
                  {visualGraph.nodes.map((node) => {
                    const isSelected = selectedNodeId === node.id;
                    const isCenter = node.isCenter;
                    const isUnlocked = node.isUnlocked;
                    const isMissing = node.isMissing;

                    let fillColor = '#64748B';
                    let strokeColor = '#334155';
                    let radius = 10;
                    let filter = '';

                    if (isCenter) {
                      fillColor = '#D4AF37';
                      strokeColor = '#FFF3D6';
                      radius = 22;
                      filter = 'url(#glow-gold)';
                    } else if (isUnlocked) {
                      fillColor = '#F59E0B';
                      strokeColor = '#FEF3C7';
                      radius = 13;
                      filter = 'url(#glow-gold)';
                    } else if (isMissing) {
                      fillColor = '#38BDF8';
                      strokeColor = '#E0F2FE';
                      radius = 13;
                      filter = 'url(#glow-cyan)';
                    } else {
                      fillColor = '#10B981';
                      strokeColor = '#A7F3D0';
                      radius = 11;
                    }

                    return (
                      <g
                        key={node.id}
                        onClick={() => setSelectedNodeId(node.id)}
                        className="cursor-pointer transition-all hover:scale-125"
                      >
                        {(isSelected || isCenter) && (
                          <circle
                            cx={node.x}
                            cy={node.y}
                            r={radius + 8}
                            fill="none"
                            stroke={fillColor}
                            strokeWidth="1.5"
                            opacity="0.5"
                            className="animate-ping"
                          />
                        )}

                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={radius}
                          fill={fillColor}
                          stroke={strokeColor}
                          strokeWidth={isSelected ? 3 : 1.5}
                          filter={filter}
                        />

                        <text
                          x={node.x}
                          y={node.y + radius + 14}
                          textAnchor="middle"
                          fill={isUnlocked ? '#F5E6BE' : isCenter ? '#FFFFFF' : '#CBD5E1'}
                          fontSize={isCenter ? '11px' : '9.5px'}
                          fontWeight={isCenter || isUnlocked ? '600' : '400'}
                          className="pointer-events-none drop-shadow"
                        >
                          {node.label.length > 18 ? node.label.slice(0, 16) + '...' : node.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>

                <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-xl bg-solstice-900/90 border border-solstice-700 text-[10px] text-slate-400 backdrop-blur-md">
                  点击星宿查看详细属性，点击右侧桥梁卡片开启阶段攻坚路线
                </div>
              </div>
            ) : (
              /* 5-Axis Radar Chart Mode */
              <div className="relative w-full h-[520px] flex flex-col items-center justify-center bg-solstice-950/80 rounded-2xl overflow-hidden mt-4 border border-solstice-800/80 p-6">
                <svg className="w-full max-w-[460px] h-[360px]" viewBox="0 0 400 360">
                  {/* Pentagonal concentric grid */}
                  {[0.2, 0.4, 0.6, 0.8, 1.0].map((level, lIdx) => {
                    const r = 130 * level;
                    const points = [0, 1, 2, 3, 4].map(i => {
                      const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
                      return `${200 + r * Math.cos(angle)},${180 + r * Math.sin(angle)}`;
                    }).join(' ');
                    return (
                      <polygon
                        key={lIdx}
                        points={points}
                        fill="none"
                        stroke="rgba(212, 175, 55, 0.15)"
                        strokeWidth="1"
                        strokeDasharray={lIdx === 4 ? 'none' : '3 3'}
                      />
                    );
                  })}

                  {/* Benchmark Polygon (Cyan / Gray) */}
                  {(() => {
                    const points = radarData.benchmarkScores.map((score, i) => {
                      const r = 130 * (score / 100);
                      const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
                      return `${200 + r * Math.cos(angle)},${180 + r * Math.sin(angle)}`;
                    }).join(' ');
                    return (
                      <polygon
                        points={points}
                        fill="rgba(56, 189, 248, 0.12)"
                        stroke="#38BDF8"
                        strokeWidth="1.5"
                        strokeDasharray="4 4"
                      />
                    );
                  })()}

                  {/* Candidate Polygon (Gold Glow) */}
                  {(() => {
                    const points = radarData.candidateScores.map((score, i) => {
                      const r = 130 * (score / 100);
                      const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
                      return `${200 + r * Math.cos(angle)},${180 + r * Math.sin(angle)}`;
                    }).join(' ');
                    return (
                      <polygon
                        points={points}
                        fill="rgba(212, 175, 55, 0.25)"
                        stroke="#D4AF37"
                        strokeWidth="2.5"
                      />
                    );
                  })()}

                  {/* Dimension Labels */}
                  {radarData.labels.map((label, i) => {
                    const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
                    const lx = 200 + 160 * Math.cos(angle);
                    const ly = 180 + 160 * Math.sin(angle);
                    return (
                      <text
                        key={i}
                        x={lx}
                        y={ly}
                        textAnchor="middle"
                        fill="#F5E6BE"
                        fontSize="11px"
                        fontWeight="600"
                      >
                        {label} ({radarData.candidateScores[i]}分)
                      </text>
                    );
                  })}
                </svg>

                {/* Legend */}
                <div className="flex items-center gap-6 text-xs mt-2">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-solstice-gold/40 border border-solstice-gold" />
                    <span className="text-slate-200">候选人当前势能</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-sky-500/20 border border-sky-400" />
                    <span className="text-slate-400">名企标杆期望阈值 (Benchmark)</span>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Skill Toggle & Custom Skill Registration */}
            <div className="mt-6 pt-4 border-t border-solstice-800">
              <div className="text-xs font-medium text-slate-300 mb-2 flex items-center justify-between">
                <span>快速点亮 / 熄灭星宿：</span>
                <span className="text-[11px] font-mono text-solstice-gold">
                  已点亮 {userSkillIds.length} / {allAvailableSkills.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto pr-1">
                {allAvailableSkills.map((skill) => {
                  const active = userSkillIds.includes(skill.id);
                  return (
                    <button
                      key={skill.id}
                      onClick={() => onToggleSkill(skill.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 border ${
                        active
                          ? 'bg-solstice-gold/20 border-solstice-gold text-solstice-gold-light'
                          : 'bg-solstice-950/60 border-solstice-800 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {active ? <CheckCircle2 className="w-3 h-3 text-solstice-gold" /> : <CircleDashed className="w-3 h-3 text-slate-500" />}
                      <span>{skill.label.split('(')[0].trim()}</span>
                    </button>
                  );
                })}
              </div>

              {/* Add Custom Skill Star */}
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="text"
                  value={customSkillInput}
                  onChange={(e) => setCustomSkillInput(e.target.value)}
                  placeholder="点亮自定义技能星宿 (如: WebAssembly, DPDK, LangGraph)..."
                  className="flex-1 px-3 py-1.5 text-xs bg-solstice-950 border border-solstice-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-solstice-gold"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddSkill();
                  }}
                />
                <button
                  onClick={handleAddSkill}
                  disabled={!customSkillInput.trim()}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-solstice-gold/20 border border-solstice-gold/40 text-solstice-gold text-xs font-medium hover:bg-solstice-gold/30 disabled:opacity-40 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>注入星宿</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Multi-Hop Pathfinder & Node Inspector (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Selected Node Details Card */}
          {selectedNode && (
            <div className="p-5 rounded-2xl glass-panel-glow border border-solstice-gold/30 shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-solstice-gold/15 text-solstice-gold border border-solstice-gold/30">
                  {selectedNode.type.toUpperCase()} · {selectedNode.category}
                </span>
                {userSkillIds.includes(selectedNode.id) ? (
                  <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> 已点亮
                  </span>
                ) : (
                  <button
                    onClick={() => onToggleSkill(selectedNode.id)}
                    className="text-xs text-solstice-gold hover:underline font-medium"
                  >
                    + 点亮此星宿
                  </button>
                )}
              </div>
              <h4 className="font-serif text-base font-bold text-slate-100">{selectedNode.label}</h4>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">{selectedNode.description}</p>
            </div>
          )}

          {/* Multi-Hop Skill Bridges List */}
          <div className="p-5 rounded-2xl glass-panel border border-solstice-700/60 shadow-lg">
            <div className="flex items-center gap-2 pb-3 border-b border-solstice-800">
              <GitBranch className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-slate-100">
                多跳跃迁技能天桥 (Multi-Hop Bridges)
              </h3>
            </div>

            <div className="mt-4 space-y-3.5">
              {alignment?.multiHopPaths && alignment.multiHopPaths.length > 0 ? (
                alignment.multiHopPaths.map((path, idx) => (
                  <div 
                    key={idx}
                    onClick={() => handleOpenRoadmap(path)}
                    className="p-3.5 rounded-xl bg-solstice-900/80 border border-solstice-800 hover:border-emerald-500/50 hover:bg-solstice-900 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-[11px] mb-2">
                      <span className="font-mono text-emerald-400 font-semibold flex items-center gap-1">
                        <Compass className="w-3 h-3" />
                        {path.difficulty === 'direct' ? '平滑跃迁' : path.difficulty === 'steep' ? '攻坚跨越' : '量子跃迁'}
                      </span>
                      <span className="text-solstice-gold group-hover:underline text-[11px] flex items-center gap-1 font-medium">
                        <BookOpen className="w-3 h-3" />
                        攻坚方案
                      </span>
                    </div>

                    {/* Path Hops Chain */}
                    <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-slate-200">
                      {path.hops.map((hop, hIdx) => (
                        <React.Fragment key={hIdx}>
                          <span className={`px-2 py-0.5 rounded text-[11px] ${
                            hIdx === 0
                              ? 'bg-amber-500/20 text-amber-200 border border-amber-500/30'
                              : hIdx === path.hops.length - 1
                              ? 'bg-sky-500/20 text-sky-200 border border-sky-500/30'
                              : 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30'
                          }`}>
                            {hop.label.split('(')[0].trim()}
                          </span>
                          {hIdx < path.hops.length - 1 && (
                            <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                          )}
                        </React.Fragment>
                      ))}
                    </div>

                    <p className="text-[11px] text-slate-400 mt-2.5 leading-relaxed">
                      {path.rationale}
                    </p>
                  </div>
                ))
              ) : (
                <div className="p-4 rounded-xl bg-solstice-900/40 text-center text-xs text-slate-400">
                  所有必备技能星宿均已直接点亮，达到天穹完全共振。
                </div>
              )}
            </div>

            {/* Cultural Alignment Synthesis */}
            {alignment?.culturalSynergies && (
              <div className="mt-5 pt-4 border-t border-solstice-800">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-solstice-gold mb-2">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>企业文化基因拓扑</span>
                </div>
                <ul className="space-y-1.5">
                  {alignment.culturalSynergies.map((syn, sIdx) => (
                    <li key={sIdx} className="text-xs text-slate-300 flex items-start gap-2">
                      <span className="text-solstice-gold mt-0.5">✦</span>
                      <span>{syn}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Multi-Hop Milestone Roadmap Modal */}
      {activeRoadmap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-solstice-950/85 backdrop-blur-md">
          <div className="relative w-full max-w-2xl p-6 rounded-3xl glass-panel-glow border border-solstice-gold/35 shadow-2xl text-slate-100 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-solstice-800">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-emerald-400" />
                <h3 className="font-serif text-base font-bold gold-gradient-text">
                  多跳技能天桥攻坚案 · 三阶攻防路线图
                </h3>
              </div>
              <button
                onClick={() => setActiveRoadmap(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-solstice-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {activeRoadmap.milestones.map((m) => (
                <div key={m.phase} className="p-4 rounded-2xl bg-solstice-900/80 border border-solstice-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      第 {m.phase} 阶段 (预计 {m.durationWeeks} 周)
                    </span>
                    <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3" /> 攻坚周期
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-100">{m.title}</h4>
                  
                  <div className="text-xs text-slate-300">
                    <span className="text-solstice-gold font-medium">✦ 经典必读：</span>
                    <ul className="list-disc list-inside mt-0.5 text-slate-400">
                      {m.readingMaterials.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-2.5 rounded-xl bg-solstice-950 border border-solstice-800/80 text-xs">
                    <span className="text-sky-400 font-medium">✦ 里程碑交付项目：</span>
                    <p className="text-slate-300 mt-0.5">{m.milestoneProject}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
