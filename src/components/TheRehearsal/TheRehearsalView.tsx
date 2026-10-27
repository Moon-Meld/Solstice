import React, { useState } from 'react';
import { 
  Radio, 
  Send, 
  Sparkles, 
  RotateCcw, 
  Award, 
  Target, 
  CheckCircle2, 
  Flame,
  HelpCircle,
  Briefcase,
  Volume2,
  Code2,
  MessageSquare,
  AlertTriangle
} from 'lucide-react';
import { InterviewSession, InterviewerPersona } from '../../types';

interface Props {
  activeSession: InterviewSession | null;
  onStartSession: (
    persona: InterviewerPersona, 
    company: string, 
    roleTitle: string, 
    roundType?: 'coding-concurrency' | 'system-design' | 'culture-leadership'
  ) => void;
  onSendAnswer: (answer: string) => Promise<void>;
  onResetSession: () => void;
  onUpdateScratchpad?: (notes: string) => void;
  defaultCompany: string;
  defaultRoleTitle: string;
}

export const TheRehearsalView: React.FC<Props> = ({
  activeSession,
  onStartSession,
  onSendAnswer,
  onResetSession,
  onUpdateScratchpad,
  defaultCompany,
  defaultRoleTitle
}) => {
  const [selectedPersona, setSelectedPersona] = useState<InterviewerPersona>('tech-lead');
  const [selectedRoundType, setSelectedRoundType] = useState<'coding-concurrency' | 'system-design' | 'culture-leadership'>('system-design');
  const [candidateInput, setCandidateInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'dialogue' | 'scratchpad'>('dialogue');
  const [isSpeaking, setIsSpeaking] = useState(false);

  const personas: { id: InterviewerPersona; name: string; title: string; desc: string; icon: string }[] = [
    {
      id: 'tech-lead',
      name: 'Dr. Vance (范斯博士)',
      title: '严苛系统架构负责人 (Tech Lead)',
      desc: '深耕高并发分布式系统与底层内存模型，穿透一切虚泛背书，直击系统崩溃与延迟拓扑。',
      icon: '⚡'
    },
    {
      id: 'product-director',
      name: 'Elena Rostova',
      title: '前瞻产品总监 (Product Director)',
      desc: '审视技术方案与商业战略、用户同理心及单位经济模型的深度融合，探寻第一性原理。',
      icon: '🧭'
    },
    {
      id: 'empathetic-hr',
      name: 'Sarah Jenkins',
      title: '敏锐资深 HR (Culture Partner)',
      desc: '关注真实领导力潜质、压力承载力、心理安全感构建及跨职能分歧化解能力。',
      icon: '🤝'
    },
    {
      id: 'quant-principal',
      name: 'Nikolai Chen',
      title: '量化策略总监 (Quant Principal)',
      desc: '要求在不确定性环境下瞬时计算期望值与贝叶斯条件概率，考察绝对的心智纪律。',
      icon: '📐'
    }
  ];

  // Speech synthesis
  const handleSpeak = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    if (isSpeaking) {
      setIsSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleSend = async () => {
    if (!candidateInput.trim() || isSubmitting) return;
    const text = candidateInput.trim();
    setCandidateInput('');
    setIsSubmitting(false);
    try {
      setIsSubmitting(true);
      await onSendAnswer(text);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filler word detection
  const fillerWordCount = (candidateInput.match(/(其实|然后|可能吧|就是说|um|uh|like)/gi) || []).length;

  // If no active session, show setup atelier stage
  if (!activeSession) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Banner */}
        <div className="relative mb-8 p-6 rounded-3xl glass-panel-glow border border-solstice-gold/25 overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <Radio className="w-4 h-4" />
                </span>
                <h2 className="font-serif text-2xl font-bold tracking-wide gold-gradient-text">
                  排练场 (The Rehearsal) · 沉浸式多重人设面试
                </h2>
              </div>
              <p className="mt-1 text-sm text-slate-300 max-w-2xl leading-relaxed">
                告别枯燥的题库背诵。步入针对 <strong>{defaultCompany}</strong> 核心标杆岗位的动态多轮博弈，由四大企业级面试人设层层递进审视你的架构深度与气场。
              </p>
            </div>
          </div>
        </div>

        {/* Round Type Switcher */}
        <div className="mb-6 p-4 rounded-2xl glass-panel border border-solstice-800 flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs font-semibold text-slate-200">
            选择本次排练轮次类型：
          </div>
          <div className="flex gap-2">
            {[
              { type: 'system-design' as const, label: '行星级系统架构设计 (System Design)' },
              { type: 'coding-concurrency' as const, label: '高并发与内核算法 (Concurrency & Algorithms)' },
              { type: 'culture-leadership' as const, label: '文化基因与领导力 (Leadership & Culture)' }
            ].map(r => (
              <button
                key={r.type}
                onClick={() => setSelectedRoundType(r.type)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  selectedRoundType === r.type
                    ? 'bg-solstice-gold text-solstice-950 font-bold shadow-gold-glow'
                    : 'bg-solstice-900 text-slate-400 hover:text-white border border-solstice-800'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Persona Selection Stage */}
        <div className="p-8 rounded-3xl glass-panel border border-solstice-700/60 shadow-2xl">
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-solstice-gold" />
            <span>选择当前轮次面试官人设 (Interviewer Persona)</span>
          </h3>
          <p className="text-xs text-slate-400 mb-6">
            不同人设将调用不同深度的知识图谱与追问策略，模拟名企真实高压评测场域。
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {personas.map((p) => {
              const isSelected = selectedPersona === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPersona(p.id)}
                  className={`p-5 rounded-2xl text-left border transition-all relative ${
                    isSelected
                      ? 'bg-solstice-gold/15 border-solstice-gold shadow-gold-glow text-white'
                      : 'bg-solstice-900/60 border-solstice-800 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{p.icon}</span>
                      <div>
                        <div className="font-semibold text-sm text-slate-100">{p.name}</div>
                        <div className="text-xs text-solstice-gold-dim font-medium">{p.title}</div>
                      </div>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="w-5 h-5 text-solstice-gold shrink-0" />
                    )}
                  </div>
                  <p className="mt-3 text-xs text-slate-400 leading-relaxed">
                    {p.desc}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="mt-8 flex justify-end">
            <button
              onClick={() => onStartSession(selectedPersona, defaultCompany, defaultRoleTitle, selectedRoundType)}
              className="flex items-center gap-2 px-8 py-3 rounded-2xl text-sm font-semibold bg-gradient-to-r from-solstice-gold-dim via-solstice-gold to-solstice-gold-light text-solstice-950 hover:brightness-110 shadow-gold-glow transition-all"
            >
              <Radio className="w-4 h-4" />
              <span>开启排练场对话</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active or Completed Session Stage
  const latestMessage = activeSession.messages[activeSession.messages.length - 1];
  const report = activeSession.report;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Session Header */}
      <div className="flex items-center justify-between pb-4 mb-6 border-b border-solstice-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              {activeSession.roundName}
            </h2>
            <p className="text-xs text-slate-400 flex items-center gap-2">
              <span>面试官：{personas.find(p => p.id === activeSession.persona)?.name}</span>
              <span>·</span>
              <span>{activeSession.targetRole}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Tab Switcher: Live Dialogue vs Whiteboard Scratchpad */}
          <div className="flex gap-1 p-1 bg-solstice-900 rounded-xl border border-solstice-800 text-xs">
            <button
              onClick={() => setActiveTab('dialogue')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg ${
                activeTab === 'dialogue'
                  ? 'bg-solstice-gold text-solstice-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>多轮答辩</span>
            </button>
            <button
              onClick={() => setActiveTab('scratchpad')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg ${
                activeTab === 'scratchpad'
                  ? 'bg-solstice-gold text-solstice-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>架构白板草稿</span>
            </button>
          </div>

          <button
            onClick={onResetSession}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-solstice-900 border border-solstice-700 text-slate-300 hover:text-white transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>重设面试</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Live Dialogue Flow or Scratchpad (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="p-6 rounded-3xl glass-panel border border-solstice-700/60 shadow-xl min-h-[500px] flex flex-col justify-between">
            {activeTab === 'dialogue' ? (
              <>
                {/* Messages Scroll Area */}
                <div className="space-y-4 max-h-[520px] overflow-y-auto pr-2">
                  {activeSession.messages.map((msg) => {
                    const isInterviewer = msg.sender === 'interviewer';
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isInterviewer ? 'items-start' : 'items-end'}`}
                      >
                        <div className="text-[10px] text-slate-500 font-mono mb-1 px-1 flex items-center gap-2">
                          <span>{isInterviewer ? activeSession.targetCompany + ' 面试官' : '候选人回答'}</span>
                          <span>{msg.timestamp}</span>
                          {isInterviewer && (
                            <button
                              onClick={() => handleSpeak(msg.content)}
                              className="text-solstice-gold hover:text-white p-0.5"
                              title="语音朗读问题"
                            >
                              <Volume2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        <div
                          className={`max-w-[85%] p-4 rounded-2xl text-xs leading-relaxed ${
                            isInterviewer
                              ? 'bg-solstice-900/90 border border-solstice-700/80 text-slate-100 rounded-tl-sm'
                              : 'bg-gradient-to-r from-solstice-gold/25 to-solstice-gold/15 border border-solstice-gold/40 text-solstice-gold-light rounded-tr-sm'
                          }`}
                        >
                          <p className="whitespace-pre-line">{msg.content}</p>

                          {/* Real-time score indicator */}
                          {msg.evaluation && (
                            <div className="mt-3 pt-2.5 border-t border-solstice-700/60 flex items-center justify-between text-[11px]">
                              <span className="text-solstice-celestial-emerald font-medium flex items-center gap-1">
                                <Flame className="w-3 h-3" />
                                即时评测分：{msg.evaluation.score}/100
                              </span>
                              <span className="text-slate-400 italic">
                                {msg.evaluation.quickFeedback}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {isSubmitting && (
                    <div className="flex items-center gap-2 p-3 text-xs text-solstice-gold animate-pulse">
                      <Sparkles className="w-4 h-4 animate-spin" />
                      <span>面试官正在推敲你的架构答复与边界条件...</span>
                    </div>
                  )}
                </div>

                {/* Input Box & Filler Word Warning */}
                <div className="mt-4 pt-4 border-t border-solstice-800">
                  {fillerWordCount > 2 && (
                    <div className="mb-2 flex items-center gap-1.5 text-[11px] text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      <span>语态提示：检测到 {fillerWordCount} 处冗余口癖词（如“其实/然后”），建议直接以定性结论或数据锚点切入。</span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <textarea
                      value={candidateInput}
                      onChange={(e) => setCandidateInput(e.target.value)}
                      placeholder="从情境背景、架构权衡、技术实现及量化指标展开阐述..."
                      rows={2}
                      className="flex-1 p-3 text-xs bg-solstice-950 border border-solstice-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-solstice-gold resize-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                    />
                    <button
                      onClick={handleSend}
                      disabled={!candidateInput.trim() || isSubmitting}
                      className="px-5 rounded-xl bg-solstice-gold text-solstice-950 font-semibold hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center shrink-0"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* Architecture Whiteboard Scratchpad */
              <div className="h-full flex flex-col space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>白板草稿区（模拟现场系统设计草图与容量测算）：</span>
                  <span className="font-mono text-[10px] text-solstice-gold">Live Markdown / ASCII Editor</span>
                </div>
                <textarea
                  value={activeSession.scratchpadNotes || ''}
                  onChange={(e) => onUpdateScratchpad && onUpdateScratchpad(e.target.value)}
                  placeholder="// 在此绘制系统拓扑、API 规范或容灾策略..."
                  className="w-full flex-1 min-h-[380px] p-4 font-mono text-xs bg-solstice-950 border border-solstice-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-solstice-gold resize-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Solstice Tactical Mentor & Director's Cut Report (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Tactical Hint Drawer */}
          {latestMessage?.hint && (
            <div className="p-4 rounded-2xl glass-panel-glow border border-solstice-gold/30">
              <div className="flex items-center gap-2 text-xs font-semibold text-solstice-gold mb-2">
                <HelpCircle className="w-4 h-4" />
                <span>至日排练战术锦囊 (Tactical Drawer)</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {latestMessage.hint}
              </p>
            </div>
          )}

          {/* Director's Cut Report (When generated) */}
          {report ? (
            <div className="p-5 rounded-2xl glass-panel-glow border border-solstice-gold/30 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-solstice-800">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-solstice-gold" />
                  <h3 className="font-serif text-sm font-bold text-slate-100 gold-gradient-text">
                    导演剪辑版复盘报告 (Director's Cut)
                  </h3>
                </div>
                <span className="text-lg font-mono font-bold text-solstice-gold-light">
                  {report.overallScore}/100
                </span>
              </div>

              {/* 4 Dimensions Grid */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 rounded-lg bg-solstice-900/80 border border-solstice-800">
                  <div className="text-slate-400">技术纵深</div>
                  <div className="text-sm font-mono font-bold text-sky-400 mt-0.5">
                    {report.dimensions.technicalRigor}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-solstice-900/80 border border-solstice-800">
                  <div className="text-slate-400">结构条理</div>
                  <div className="text-sm font-mono font-bold text-emerald-400 mt-0.5">
                    {report.dimensions.structuralClarity}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-solstice-900/80 border border-solstice-800">
                  <div className="text-slate-400">量化严谨</div>
                  <div className="text-sm font-mono font-bold text-amber-400 mt-0.5">
                    {report.dimensions.metricImpact}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-solstice-900/80 border border-solstice-800">
                  <div className="text-slate-400">领导力气场</div>
                  <div className="text-sm font-mono font-bold text-purple-400 mt-0.5">
                    {report.dimensions.executivePresence}
                  </div>
                </div>
              </div>

              {/* Summary */}
              <p className="text-xs text-slate-300 leading-relaxed italic">
                “{report.executiveSummary}”
              </p>

              {/* Strengths & Growth */}
              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-semibold text-emerald-400">✦ 高光优势：</span>
                  <ul className="list-disc list-inside text-slate-300 mt-1 space-y-1">
                    {report.strengths.slice(0, 2).map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <span className="font-semibold text-amber-400">✦ 跃迁生长点：</span>
                  <ul className="list-disc list-inside text-slate-300 mt-1 space-y-1">
                    {report.growthVectors.slice(0, 1).map((g, i) => (
                      <li key={i}>{g}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Golden Exemplar Answer */}
              <div className="p-3 rounded-xl bg-solstice-950/80 border border-solstice-gold/30">
                <div className="text-[10px] font-mono uppercase text-solstice-gold font-bold mb-1">
                  至日典范级解题框架 (Golden Exemplar)
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-sans">
                  {report.goldenExemplar.exemplarAnswer}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl glass-panel border border-solstice-800 text-xs text-slate-400 space-y-2">
              <div className="flex items-center gap-2 text-slate-200 font-medium">
                <Briefcase className="w-4 h-4 text-solstice-gold" />
                <span>实战节奏提示</span>
              </div>
              <p>
                完成 2 轮以上的高频攻防追问后，系统将自动汇总生成<strong>《导演剪辑版复盘报告》</strong>与标杆题解示范。
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
