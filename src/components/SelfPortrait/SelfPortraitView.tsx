import React, { useState } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  Check, 
  Flame, 
  TrendingUp, 
  Target, 
  FileText, 
  Layers, 
  Copy,
  Lightbulb
} from 'lucide-react';
import { CandidateProfile, StarBullet } from '../../types';
import { selfPortraitAgent } from '../../services/agents/selfPortraitAgent';
import { ragEngine } from '../../services/ragEngine';

interface Props {
  profile: CandidateProfile;
  onRefineBullet: (expId: string, rawBullet: string) => Promise<void>;
  targetRoleTitle: string;
}

export const SelfPortraitView: React.FC<Props> = ({
  profile,
  onRefineBullet,
  targetRoleTitle
}) => {
  const currentExp = profile.experiences[0];
  const [selectedBulletText, setSelectedBulletText] = useState<string>(
    currentExp?.rawBullets[0] || 'Worked on PyTorch model training and fixed GPU memory issues.'
  );
  const [customInput, setCustomInput] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [activeStarData, setActiveStarData] = useState<StarBullet | null>(
    currentExp?.starBullets[0] || null
  );
  const [copied, setCopied] = useState(false);

  // ATS Resonance calculation
  const atsAnalysis = ragEngine.evaluateAtsResonance(
    `${profile.summary} ${profile.experiences.map(e => e.rawBullets.join(' ')).join(' ')} ${activeStarData?.refined || ''}`,
    targetRoleTitle
  );

  const handleTriggerRefine = async (textToRefine: string) => {
    setIsRefining(true);
    try {
      const result = await selfPortraitAgent.refineBulletPoint(textToRefine, targetRoleTitle);
      setActiveStarData(result);
      if (currentExp) {
        await onRefineBullet(currentExp.id, textToRefine);
      }
    } finally {
      setIsRefining(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Atelier Banner */}
      <div className="relative mb-8 p-6 rounded-3xl glass-panel-glow border border-solstice-gold/25 overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-solstice-gold/10 blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-solstice-gold/15 text-solstice-gold border border-solstice-gold/30">
                <FileText className="w-4 h-4" />
              </span>
              <h2 className="font-serif text-2xl font-bold tracking-wide gold-gradient-text">
                自画像 (Self-Portrait) · 履历重塑与叙事工坊
              </h2>
            </div>
            <p className="mt-1 text-sm text-slate-300 max-w-2xl leading-relaxed">
              将平铺直叙的职责罗列，炼化为具备<strong>严谨量化支点</strong>与<strong>技术统御力</strong>的 STAR 叙事典范。每一次表述，皆是与目标标杆 JD 的高频共振。
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-4">
            <div className="px-4 py-2.5 rounded-2xl bg-solstice-900/80 border border-solstice-700/80 text-center">
              <div className="text-[10px] text-slate-400 uppercase tracking-widest">ATS 语义共振率</div>
              <div className="text-xl font-bold font-mono text-solstice-gold-light mt-0.5">
                {atsAnalysis.score}%
              </div>
            </div>
            <div className="px-4 py-2.5 rounded-2xl bg-solstice-900/80 border border-solstice-700/80 text-center">
              <div className="text-[10px] text-slate-400 uppercase tracking-widest">叙事张力评级</div>
              <div className="text-xl font-bold font-mono text-solstice-celestial-emerald mt-0.5">
                {activeStarData ? `${activeStarData.potencyScore}/100` : '92/100'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Split Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Candidate Experience & Raw Bullets (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-2xl glass-panel border border-solstice-700/60 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-solstice-800">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-solstice-gold" />
                <h3 className="text-sm font-semibold text-slate-100 tracking-wide">
                  候选人经历节点 (Profile Nodes)
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-400">{profile.name}</span>
            </div>

            {/* Current Experience Card */}
            {currentExp && (
              <div className="mt-4 p-4 rounded-xl bg-solstice-900/70 border border-solstice-800">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-sm text-slate-100">{currentExp.role}</h4>
                    <p className="text-xs text-solstice-gold-dim">{currentExp.company} · {currentExp.period}</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-solstice-800 text-slate-300 font-mono">
                    {currentExp.location}
                  </span>
                </div>

                <div className="mt-4 space-y-2.5">
                  <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    点击选择待雕琢的原始描述：
                  </div>
                  {currentExp.rawBullets.map((bullet, idx) => {
                    const isSelected = selectedBulletText === bullet;
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          setSelectedBulletText(bullet);
                          handleTriggerRefine(bullet);
                        }}
                        className={`w-full text-left p-3 rounded-xl text-xs transition-all border ${
                          isSelected
                            ? 'bg-solstice-gold/15 border-solstice-gold text-slate-100 shadow-gold-glow'
                            : 'bg-solstice-950/60 border-solstice-800 text-slate-300 hover:border-slate-600 hover:text-white'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-solstice-gold font-mono font-bold mt-0.5">#{idx + 1}</span>
                          <span className="leading-relaxed">{bullet}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Custom Bullet Experiment Input */}
            <div className="mt-6">
              <label className="block text-xs font-medium text-slate-300 mb-2">
                自由试验：输入任意平淡陈述，由至日重塑
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder="例如: 参与了微服务重构，修复了一些内存泄漏..."
                  className="flex-1 px-3 py-2 text-xs bg-solstice-950 border border-solstice-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-solstice-gold"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customInput.trim()) {
                      setSelectedBulletText(customInput.trim());
                      handleTriggerRefine(customInput.trim());
                      setCustomInput('');
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (customInput.trim()) {
                      setSelectedBulletText(customInput.trim());
                      handleTriggerRefine(customInput.trim());
                      setCustomInput('');
                    }
                  }}
                  disabled={!customInput.trim() || isRefining}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-solstice-gold text-solstice-950 hover:brightness-110 disabled:opacity-50 transition-all"
                >
                  重塑
                </button>
              </div>
            </div>

            {/* Target JD Keyword Resonance Breakdown */}
            <div className="mt-6 p-4 rounded-xl bg-solstice-900/60 border border-solstice-800">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 mb-2">
                <Target className="w-3.5 h-3.5 text-solstice-celestial-blue" />
                <span>目标标杆 JD 关键词捕获雷达</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {atsAnalysis.matchedKeywords.map((kw, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-1">
                    <Check className="w-2.5 h-2.5" />
                    {kw}
                  </span>
                ))}
                {atsAnalysis.missingCriticalKeywords.map((kw, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/10 border border-amber-500/30 text-amber-300">
                    + 待融入: {kw}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: STAR Refinement Canvas (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-6 rounded-2xl glass-panel-glow border border-solstice-gold/30 shadow-2xl relative">
            {/* Action Bar */}
            <div className="flex items-center justify-between pb-4 border-b border-solstice-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-solstice-gold" />
                <h3 className="font-serif text-base font-semibold text-slate-100 gold-gradient-text">
                  STAR 黄金结构叙事呈现
                </h3>
              </div>
              <button
                onClick={() => handleTriggerRefine(selectedBulletText)}
                disabled={isRefining}
                className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-solstice-gold-dim to-solstice-gold text-solstice-950 hover:brightness-110 shadow-gold-glow transition-all disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isRefining ? 'animate-spin' : ''}`} />
                <span>{isRefining ? '至日炼金中...' : '重新炼铸表达'}</span>
              </button>
            </div>

            {/* Before & After Comparison */}
            <div className="mt-5 space-y-4">
              {/* Original Raw Bullet */}
              <div className="p-3.5 rounded-xl bg-solstice-950/70 border border-solstice-800 text-xs text-slate-400">
                <div className="text-[10px] uppercase tracking-wider font-mono text-slate-500 mb-1">
                  原始陈述 (Raw Draft)
                </div>
                <p className="italic text-slate-300">“{selectedBulletText}”</p>
              </div>

              {/* Polished Executive Bullet */}
              <div className="relative p-5 rounded-2xl bg-gradient-to-br from-solstice-900 to-solstice-850 border border-solstice-gold/40 shadow-gold-glow">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[10px] uppercase font-mono font-bold tracking-wider bg-solstice-gold/20 text-solstice-gold rounded border border-solstice-gold/30">
                      至日黄金润色
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-solstice-celestial-emerald font-medium">
                      <Flame className="w-3.5 h-3.5" />
                      动词能量指数: {activeStarData ? activeStarData.potencyScore : 94}%
                    </span>
                  </div>

                  <button
                    onClick={() => activeStarData && handleCopy(activeStarData.refined)}
                    className="p-1.5 rounded-lg bg-solstice-800 text-slate-300 hover:text-white hover:bg-solstice-700 transition-colors"
                    title="复制到剪贴板"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <p className="text-sm font-medium text-slate-100 leading-relaxed font-sans">
                  {activeStarData?.refined || '正在为这段经历注入量化支点与架构统御力...'}
                </p>

                {/* Metric Badges */}
                {activeStarData?.metrics && (
                  <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-solstice-700/60">
                    {activeStarData.metrics.map((m, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-lg text-xs font-mono bg-solstice-gold/10 border border-solstice-gold/30 text-solstice-gold-light flex items-center gap-1.5">
                        <TrendingUp className="w-3 h-3 text-solstice-gold" />
                        {m}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 4-Quadrant STAR Breakdown */}
            {activeStarData && (
              <div className="mt-6">
                <div className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-solstice-gold" />
                  <span>STAR 逻辑支柱四维解构</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-solstice-900/60 border border-solstice-800">
                    <span className="text-[10px] font-mono uppercase font-bold text-sky-400">
                      S · Situation (情境)
                    </span>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      {activeStarData.situation}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-solstice-900/60 border border-solstice-800">
                    <span className="text-[10px] font-mono uppercase font-bold text-amber-400">
                      T · Task (任务)
                    </span>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      {activeStarData.task}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-solstice-900/60 border border-solstice-800">
                    <span className="text-[10px] font-mono uppercase font-bold text-emerald-400">
                      A · Action (行动)
                    </span>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      {activeStarData.action}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-solstice-900/60 border border-solstice-800">
                    <span className="text-[10px] font-mono uppercase font-bold text-purple-400">
                      R · Result (结果)
                    </span>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      {activeStarData.result}
                    </p>
                  </div>
                </div>

                {/* Artisan Critique */}
                <div className="mt-4 p-3.5 rounded-xl bg-solstice-gold/5 border border-solstice-gold/15 text-xs text-slate-300 flex items-start gap-2.5">
                  <ArrowRight className="w-4 h-4 text-solstice-gold shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-solstice-gold-light">至日评审手记：</span>
                    <span className="ml-1 text-slate-300">{activeStarData.critique}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
