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
  ShieldAlert
} from 'lucide-react';
import { ConstellationAlignment } from '../../types/graph';
import { constellationAgent } from '../../services/agents/constellationAgent';
import { kgEngine } from '../../services/kgEngine';

interface Props {
  userSkillIds: string[];
  targetRoleId: string;
  alignment: ConstellationAlignment | null;
  onToggleSkill: (skillId: string) => void;
}

export const ConstellationView: React.FC<Props> = ({
  userSkillIds,
  targetRoleId,
  alignment,
  onToggleSkill
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Generate visual graph coordinates
  const visualGraph = constellationAgent.generateVisualGraph(
    userSkillIds,
    targetRoleId,
    760,
    520
  );

  const selectedNode = selectedNodeId ? kgEngine.getNode(selectedNodeId) : null;
  const allAvailableSkills = kgEngine.getAllNodes().filter(n => n.type === 'skill');

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
              基于知识图谱 (KG) 的多跳路径推理，不仅识别当前与目标岗位的对齐度，更自动规划由浅入深的<strong>多跳跃迁技能天桥 (Multi-Hop Skill Bridges)</strong>。
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
        {/* Left Column: Interactive Constellation Orbit Canvas */}
        <div className="lg:col-span-8 space-y-6">
          <div className="p-6 rounded-3xl glass-panel border border-solstice-700/60 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-solstice-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-solstice-gold" />
                <h3 className="text-sm font-semibold text-slate-100">
                  {alignment?.companyName} · {alignment?.targetRoleTitle} 技能引力场
                </h3>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-solstice-gold shadow-gold-glow" /> 已点亮星宿
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400" /> 目标必备
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> 多跳跃迁桥
                </span>
              </div>
            </div>

            {/* SVG Interactive Canvas */}
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
                      {/* Outer pulse aura if selected or center */}
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

                      {/* Star Label */}
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

              {/* Quick instructions floating badge */}
              <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-xl bg-solstice-900/90 border border-solstice-700 text-[10px] text-slate-400 backdrop-blur-md">
                点击任意星宿查看属性与多跳跃迁链路
              </div>
            </div>

            {/* Quick Skill Toggle Toolbar */}
            <div className="mt-6 pt-4 border-t border-solstice-800">
              <div className="text-xs font-medium text-slate-300 mb-2 flex items-center justify-between">
                <span>快速点亮 / 熄灭技能星宿（动态查看对齐度与寻径变化）：</span>
                <span className="text-[11px] font-mono text-solstice-gold">
                  已点亮 {userSkillIds.length} / {allAvailableSkills.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
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
                    className="p-3.5 rounded-xl bg-solstice-900/80 border border-solstice-800 hover:border-emerald-500/40 transition-all"
                  >
                    <div className="flex items-center justify-between text-[11px] mb-2">
                      <span className="font-mono text-emerald-400 font-semibold flex items-center gap-1">
                        <Compass className="w-3 h-3" />
                        {path.difficulty === 'direct' ? '平滑跃迁' : path.difficulty === 'steep' ? '攻坚跨越' : '量子跃迁'}
                      </span>
                      <span className="text-slate-400 flex items-center gap-1 text-[10px]">
                        <Clock className="w-3 h-3 text-slate-500" />
                        预计 ~{path.estimatedWeeks} 周
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
    </div>
  );
};
