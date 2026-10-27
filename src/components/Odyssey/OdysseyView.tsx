import React, { useState } from 'react';
import { 
  Compass, 
  MapPin, 
  DollarSign, 
  Send, 
  Copy, 
  Check, 
  CheckCircle2, 
  ChevronRight, 
  TrendingUp, 
  Sparkles,
  Plus,
  BookOpen,
  LayoutGrid,
  Scale,
  X
} from 'lucide-react';
import { OdysseyOpportunity, ApplicationStage, JournalEntry } from '../../types';
import { odysseyAgent } from '../../services/agents/odysseyAgent';

interface Props {
  opportunities: OdysseyOpportunity[];
  journalEntries?: JournalEntry[];
  onUpdateStage: (id: string, stage: ApplicationStage) => void;
  onAddOpportunity?: (opp: Omit<OdysseyOpportunity, 'id'>) => void;
  onAddJournalEntry?: (entry: Omit<JournalEntry, 'id' | 'date'>) => void;
  candidateSkills: string[];
}

export const OdysseyView: React.FC<Props> = ({
  opportunities,
  journalEntries = [],
  onUpdateStage,
  onAddOpportunity,
  onAddJournalEntry,
  candidateSkills
}) => {
  const [activeTab, setActiveTab] = useState<'kanban' | 'journal' | 'comparator'>('kanban');
  const [selectedOppId, setSelectedOppId] = useState<string>(opportunities[0]?.id || '');
  const [recipientType, setRecipientType] = useState<'hiring-manager' | 'peer-engineer' | 'recruiter'>('hiring-manager');
  const [copiedDraft, setCopiedDraft] = useState(false);
  const [isAddOppOpen, setIsAddOppOpen] = useState(false);

  // New Opp Form State
  const [newCompany, setNewCompany] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newSalary, setNewSalary] = useState('');
  const [newLocation, setNewLocation] = useState('San Francisco, CA');
  const [newNotes, setNewNotes] = useState('');

  // New Journal Form State
  const [journalTitle, setJournalTitle] = useState('');
  const [journalContent, setJournalContent] = useState('');
  const [journalMood, setJournalMood] = useState<JournalEntry['mood']>('breakthrough');

  const selectedOpp = opportunities.find(o => o.id === selectedOppId) || opportunities[0];

  const columns: { stage: ApplicationStage; label: string; color: string }[] = [
    { stage: 'discovered', label: '发现机缘', color: 'border-slate-500' },
    { stage: 'tailored', label: '定制重塑', color: 'border-sky-500' },
    { stage: 'interviewing', label: '推进面试', color: 'border-amber-500' },
    { stage: 'offer', label: '斩获 Offer', color: 'border-emerald-500' },
    { stage: 'negotiating', label: '战略博弈', color: 'border-solstice-gold' }
  ];

  // Networking draft
  const networkingDraft = selectedOpp ? odysseyAgent.generateNetworkingDraft(
    selectedOpp.company,
    selectedOpp.role,
    recipientType,
    candidateSkills.length > 0 
      ? candidateSkills.map(s => s.replace('skill-', '').replace('-', ' ')) 
      : ['Distributed Systems Latency Optimization', 'Zero-copy Ring Buffers']
  ) : null;

  // Negotiation strategy
  const negotiationStrategy = selectedOpp?.stage === 'offer' || selectedOpp?.stage === 'negotiating'
    ? odysseyAgent.generateNegotiationStrategy(selectedOpp)
    : null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDraft(true);
    setTimeout(() => setCopiedDraft(false), 1500);
  };

  const handleCreateOpp = () => {
    if (!newCompany.trim() || !newRole.trim()) return;
    if (onAddOpportunity) {
      onAddOpportunity({
        company: newCompany.trim(),
        role: newRole.trim(),
        stage: 'discovered',
        alignmentScore: 82,
        salaryRange: newSalary.trim() || '$200k - $280k',
        location: newLocation.trim(),
        notes: newNotes.trim() || '新发现的高匹配度战略标杆职位。',
        actionItems: ['使用自画像工坊定制针对性 STAR 履历', '通过星宿图多跳对齐关键缺失技能']
      });
      setNewCompany('');
      setNewRole('');
      setNewSalary('');
      setNewNotes('');
      setIsAddOppOpen(false);
    }
  };

  const handleCreateJournal = () => {
    if (!journalTitle.trim() || !journalContent.trim()) return;
    if (onAddJournalEntry) {
      onAddJournalEntry({
        title: journalTitle.trim(),
        content: journalContent.trim(),
        mood: journalMood,
        confidenceScore: 90,
        tags: ['Odyssey Log', 'Mindset']
      });
      setJournalTitle('');
      setJournalContent('');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Banner */}
      <div className="relative mb-8 p-6 rounded-3xl glass-panel-glow border border-solstice-gold/25 overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <Compass className="w-4 h-4" />
              </span>
              <h2 className="font-serif text-2xl font-bold tracking-wide gold-gradient-text">
                奥德赛 (Odyssey) · 求职生涯航向与战略副驾
              </h2>
            </div>
            <p className="mt-1 text-sm text-slate-300 max-w-2xl leading-relaxed">
              全周期护航名企投递、人脉破局信件与高杠杆薪酬博弈。每一封交流文书，皆直击企业文化基因。
            </p>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 p-1 bg-solstice-900 rounded-2xl border border-solstice-800 text-xs">
            <button
              onClick={() => setActiveTab('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                activeTab === 'kanban'
                  ? 'bg-solstice-gold text-solstice-950 font-bold shadow-gold-glow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>航道看板</span>
            </button>
            <button
              onClick={() => setActiveTab('journal')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                activeTab === 'journal'
                  ? 'bg-solstice-gold text-solstice-950 font-bold shadow-gold-glow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>航行手记</span>
            </button>
            <button
              onClick={() => setActiveTab('comparator')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                activeTab === 'comparator'
                  ? 'bg-solstice-gold text-solstice-950 font-bold shadow-gold-glow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Offer 决战天平</span>
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'kanban' && (
        <>
          {/* Kanban Pipeline Overview */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <span>职业航道看板 (Application Pipeline)</span>
              </h3>
              <button
                onClick={() => setIsAddOppOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-solstice-gold/20 border border-solstice-gold/40 text-solstice-gold text-xs font-semibold hover:bg-solstice-gold/30 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>新增航道机遇</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
              {columns.map((col) => {
                const oppsInStage = opportunities.filter(o => o.stage === col.stage);
                return (
                  <div 
                    key={col.stage}
                    className="p-3.5 rounded-2xl glass-panel border border-solstice-800 flex flex-col justify-between min-h-[180px]"
                  >
                    <div>
                      <div className="flex items-center justify-between pb-2 mb-3 border-b border-solstice-800">
                        <span className="text-xs font-semibold text-slate-200">{col.label}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-solstice-900 text-slate-400">
                          {oppsInStage.length}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {oppsInStage.map((opp) => {
                          const isSelected = selectedOpp?.id === opp.id;
                          return (
                            <button
                              key={opp.id}
                              onClick={() => setSelectedOppId(opp.id)}
                              className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${
                                isSelected
                                  ? 'bg-solstice-gold/20 border-solstice-gold shadow-gold-glow text-white'
                                  : 'bg-solstice-900/70 border-solstice-700/60 text-slate-300 hover:border-slate-500'
                              }`}
                            >
                              <div className="font-semibold text-slate-100">{opp.company}</div>
                              <div className="text-[11px] text-slate-400 truncate mt-0.5">{opp.role}</div>
                              <div className="flex items-center justify-between mt-2 text-[10px] font-mono text-solstice-gold">
                                <span>共振 {opp.alignmentScore}%</span>
                                <span className="text-slate-400 capitalize">{opp.stage}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Opportunity Detail Studio */}
          {selectedOpp && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Opportunity Details & Stage Controls (5 cols) */}
              <div className="lg:col-span-5 space-y-6">
                <div className="p-6 rounded-3xl glass-panel border border-solstice-700/60 shadow-xl">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-serif font-bold text-slate-100 gold-gradient-text">
                        {selectedOpp.company}
                      </h3>
                      <p className="text-sm font-medium text-slate-300 mt-0.5">{selectedOpp.role}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-solstice-gold/15 text-solstice-gold border border-solstice-gold/30">
                      {selectedOpp.alignmentScore}% 图谱对齐
                    </span>
                  </div>

                  <div className="mt-4 space-y-2 text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{selectedOpp.location}</span>
                    </div>
                    {selectedOpp.salaryRange && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="font-mono text-emerald-300">{selectedOpp.salaryRange}</span>
                      </div>
                    )}
                  </div>

                  {/* Stage Transition Selector */}
                  <div className="mt-6 pt-4 border-t border-solstice-800">
                    <label className="block text-xs font-medium text-slate-400 mb-2">
                      推进当前航程阶段：
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {columns.map((c) => (
                        <button
                          key={c.stage}
                          onClick={() => onUpdateStage(selectedOpp.id, c.stage)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            selectedOpp.stage === c.stage
                              ? 'bg-solstice-gold text-solstice-950 font-bold shadow-gold-glow'
                              : 'bg-solstice-900/80 text-slate-400 hover:text-white border border-solstice-800'
                          }`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Action Items */}
                  <div className="mt-6 pt-4 border-t border-solstice-800">
                    <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-solstice-gold" />
                      <span>航行攻坚备忘 (Action Items)</span>
                    </h4>
                    <ul className="space-y-2">
                      {selectedOpp.actionItems.map((item, idx) => (
                        <li key={idx} className="p-2.5 rounded-xl bg-solstice-900/60 border border-solstice-800 text-xs text-slate-300 flex items-start gap-2">
                          <ChevronRight className="w-3.5 h-3.5 text-solstice-gold shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Right Column: Strategic Outreach & Negotiation Composer (7 cols) */}
              <div className="lg:col-span-7 space-y-6">
                {/* Networking Outreach Composer */}
                <div className="p-6 rounded-3xl glass-panel-glow border border-solstice-gold/30 shadow-2xl">
                  <div className="flex items-center justify-between pb-4 border-b border-solstice-800">
                    <div className="flex items-center gap-2">
                      <Send className="w-4 h-4 text-solstice-gold" />
                      <h3 className="font-serif text-sm font-bold text-slate-100 gold-gradient-text">
                        文化基因定向破局信 (Cultural Outreach Composer)
                      </h3>
                    </div>

                    {/* Recipient Role Switcher */}
                    <div className="flex gap-1 p-1 bg-solstice-900 rounded-xl border border-solstice-800 text-[10px]">
                      <button
                        onClick={() => setRecipientType('hiring-manager')}
                        className={`px-2.5 py-1 rounded-lg ${recipientType === 'hiring-manager' ? 'bg-solstice-gold text-solstice-950 font-bold' : 'text-slate-400'}`}
                      >
                        主管 (HM)
                      </button>
                      <button
                        onClick={() => setRecipientType('peer-engineer')}
                        className={`px-2.5 py-1 rounded-lg ${recipientType === 'peer-engineer' ? 'bg-solstice-gold text-solstice-950 font-bold' : 'text-slate-400'}`}
                      >
                        核心极客
                      </button>
                      <button
                        onClick={() => setRecipientType('recruiter')}
                        className={`px-2.5 py-1 rounded-lg ${recipientType === 'recruiter' ? 'bg-solstice-gold text-solstice-950 font-bold' : 'text-slate-400'}`}
                      >
                        招聘官
                      </button>
                    </div>
                  </div>

                  {networkingDraft && (
                    <div className="mt-4 space-y-3">
                      <div className="p-3 rounded-xl bg-solstice-950 border border-solstice-800 text-xs">
                        <span className="text-slate-500 font-mono text-[10px] block mb-1">邮件标题 (Subject):</span>
                        <span className="font-semibold text-slate-200">{networkingDraft.subject}</span>
                      </div>

                      <div className="relative p-4 rounded-xl bg-solstice-950 border border-solstice-800 text-xs leading-relaxed text-slate-300 font-mono">
                        <button
                          onClick={() => handleCopy(networkingDraft.body)}
                          className="absolute top-3 right-3 p-1.5 rounded-lg bg-solstice-800 text-slate-300 hover:text-white"
                          title="复制邮件正文"
                        >
                          {copiedDraft ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <p className="whitespace-pre-line pr-8">{networkingDraft.body}</p>
                      </div>

                      <div className="p-3 rounded-xl bg-solstice-gold/5 border border-solstice-gold/15 text-[11px] text-slate-400 flex items-start gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-solstice-gold shrink-0 mt-0.5" />
                        <span><strong>策略解构：</strong>{networkingDraft.rationale}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Negotiation Script (Offer or Negotiating stage) */}
                {negotiationStrategy && (
                  <div className="p-6 rounded-3xl glass-panel-glow border border-emerald-500/30 shadow-2xl">
                    <div className="flex items-center gap-2 pb-3 border-b border-solstice-800">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      <h3 className="font-serif text-sm font-bold text-emerald-300">
                        {negotiationStrategy.strategyName}
                      </h3>
                    </div>

                    <div className="mt-4 space-y-3 text-xs">
                      <div>
                        <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold">谈判杠杆支点：</span>
                        <ul className="list-disc list-inside text-slate-300 mt-1 space-y-1">
                          {negotiationStrategy.leveragePoints.map((lp, idx) => (
                            <li key={idx}>{lp}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-3 rounded-xl bg-solstice-950 border border-emerald-500/20 text-slate-200 leading-relaxed font-sans italic">
                        “{negotiationStrategy.script}”
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Journal View */}
      {activeTab === 'journal' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 rounded-3xl glass-panel border border-solstice-700/60 shadow-xl">
              <h3 className="text-base font-serif font-bold text-slate-100 gold-gradient-text mb-4">
                撰写今日航行手记 (New Reflection)
              </h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={journalTitle}
                  onChange={(e) => setJournalTitle(e.target.value)}
                  placeholder="手记标题 (如: 攻坚 Raft 日志复制的顿悟)..."
                  className="w-full px-3 py-2 text-xs bg-solstice-950 border border-solstice-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-solstice-gold"
                />

                <textarea
                  value={journalContent}
                  onChange={(e) => setJournalContent(e.target.value)}
                  placeholder="记录今日的算法突破、面试博弈心境或架构认知迭代..."
                  rows={4}
                  className="w-full p-3 text-xs bg-solstice-950 border border-solstice-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-solstice-gold resize-none"
                />

                <div className="flex items-center justify-between">
                  <div className="flex gap-1.5">
                    {(['breakthrough', 'radiant', 'focused', 'contemplative'] as const).map(m => (
                      <button
                        key={m}
                        onClick={() => setJournalMood(m)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] capitalize transition-all ${
                          journalMood === m ? 'bg-solstice-gold text-solstice-950 font-bold' : 'bg-solstice-900 text-slate-400'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleCreateJournal}
                    disabled={!journalTitle.trim() || !journalContent.trim()}
                    className="px-4 py-1.5 rounded-xl bg-solstice-gold text-solstice-950 text-xs font-semibold hover:brightness-110 disabled:opacity-40 transition-all"
                  >
                    封存手记
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4">
            {journalEntries.map((entry) => (
              <div key={entry.id} className="p-5 rounded-2xl glass-panel border border-solstice-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-100 font-serif text-sm">{entry.title}</span>
                  <span className="font-mono text-slate-400 text-[11px]">{entry.date}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">{entry.content}</p>
                <div className="flex items-center gap-2 pt-2 text-[10px] text-slate-400 font-mono">
                  <span className="text-solstice-gold capitalize">心境: {entry.mood}</span>
                  <span>·</span>
                  <span>定力值: {entry.confidenceScore}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Offer Comparator Tab */}
      {activeTab === 'comparator' && (
        <div className="p-6 rounded-3xl glass-panel-glow border border-solstice-gold/30 shadow-2xl">
          <h3 className="font-serif text-base font-bold gold-gradient-text mb-2">
            Offer 决战天平 · 多维全景对比矩阵 (Offer Comparator)
          </h3>
          <p className="text-xs text-slate-400 mb-6">
            综合量化基本薪酬、股权权益包、地域生活成本以及在知识图谱中的**职业加速度势能 (Career Velocity)**。
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-solstice-700/80 text-slate-400 font-mono text-[11px]">
                  <th className="py-3 px-4">企业 &amp; 岗位</th>
                  <th className="py-3 px-4">总包构成 (Base + Equity)</th>
                  <th className="py-3 px-4">办公基准</th>
                  <th className="py-3 px-4">图谱共振分</th>
                  <th className="py-3 px-4">职业加速度评级</th>
                  <th className="py-3 px-4">至日决策天平推荐</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-solstice-800/80">
                <tr className="hover:bg-solstice-900/50">
                  <td className="py-3.5 px-4 font-bold text-slate-100">
                    <div>OpenAI</div>
                    <div className="text-[10px] font-normal text-slate-400">AI Systems Engineer</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-emerald-300">$260k Base + $400k Equity/4yr</td>
                  <td className="py-3.5 px-4">San Francisco, CA (Hybrid)</td>
                  <td className="py-3.5 px-4 font-mono text-solstice-gold font-bold">84%</td>
                  <td className="py-3.5 px-4 font-mono text-sky-400 font-bold">A+ (Frontier Lab)</td>
                  <td className="py-3.5 px-4 text-solstice-gold-light">首选：掌握下一代万卡集群核心话语权</td>
                </tr>

                <tr className="hover:bg-solstice-900/50">
                  <td className="py-3.5 px-4 font-bold text-slate-100">
                    <div>Google Core</div>
                    <div className="text-[10px] font-normal text-slate-400">Senior Distributed Systems Lead</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-emerald-300">$235k Base + $320k GSU/4yr</td>
                  <td className="py-3.5 px-4">Mountain View, CA</td>
                  <td className="py-3.5 px-4 font-mono text-solstice-gold font-bold">88%</td>
                  <td className="py-3.5 px-4 font-mono text-purple-400 font-bold">A (Big Tech Pillar)</td>
                  <td className="py-3.5 px-4 text-slate-300">防守盘：确定性极高，适宜发起股权加码反向博弈</td>
                </tr>

                <tr className="hover:bg-solstice-900/50">
                  <td className="py-3.5 px-4 font-bold text-slate-100">
                    <div>Jane Street</div>
                    <div className="text-[10px] font-normal text-slate-400">Quantitative Systems Dev</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-emerald-300">$300k Base + Alpha Bonus</td>
                  <td className="py-3.5 px-4">New York, NY</td>
                  <td className="py-3.5 px-4 font-mono text-solstice-gold font-bold">68%</td>
                  <td className="py-3.5 px-4 font-mono text-amber-400 font-bold">A- (High Risk/Yield)</td>
                  <td className="py-3.5 px-4 text-slate-300">高现金流激进选项，需先完成微秒级内核跳跃</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Opportunity Modal */}
      {isAddOppOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-solstice-950/85 backdrop-blur-md">
          <div className="relative w-full max-w-md p-6 rounded-3xl glass-panel-glow border border-solstice-gold/35 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-solstice-800">
              <h3 className="font-serif text-base font-bold gold-gradient-text">
                录入新航道机遇 (Add Dream Role)
              </h3>
              <button
                onClick={() => setIsAddOppOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">目标企业名称</label>
                <input
                  type="text"
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  placeholder="例如: Anthropic, Citadel, Apple..."
                  className="w-full px-3 py-2 bg-solstice-950 border border-solstice-700 rounded-xl text-slate-100 focus:outline-none focus:border-solstice-gold"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">目标职位名称</label>
                <input
                  type="text"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  placeholder="例如: LLM Alignment Architect"
                  className="w-full px-3 py-2 bg-solstice-950 border border-solstice-700 rounded-xl text-slate-100 focus:outline-none focus:border-solstice-gold"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">预期薪酬包 (Total Comp)</label>
                <input
                  type="text"
                  value={newSalary}
                  onChange={(e) => setNewSalary(e.target.value)}
                  placeholder="例如: $250k - $320k"
                  className="w-full px-3 py-2 bg-solstice-950 border border-solstice-700 rounded-xl text-slate-100 focus:outline-none focus:border-solstice-gold"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">工作地点</label>
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-solstice-950 border border-solstice-700 rounded-xl text-slate-100 focus:outline-none focus:border-solstice-gold"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">攻坚手记 / 突破点</label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="重点攻关领域与引荐人脉..."
                  rows={2}
                  className="w-full p-2.5 bg-solstice-950 border border-solstice-700 rounded-xl text-slate-100 focus:outline-none focus:border-solstice-gold resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  onClick={() => setIsAddOppOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  取消
                </button>
                <button
                  onClick={handleCreateOpp}
                  disabled={!newCompany.trim() || !newRole.trim()}
                  className="px-5 py-2 rounded-xl bg-solstice-gold text-solstice-950 font-bold hover:brightness-110 disabled:opacity-40 transition-all"
                >
                  录入看板
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
