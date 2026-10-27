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
  Sparkles
} from 'lucide-react';
import { OdysseyOpportunity, ApplicationStage } from '../../types';
import { odysseyAgent } from '../../services/agents/odysseyAgent';

interface Props {
  opportunities: OdysseyOpportunity[];
  onUpdateStage: (id: string, stage: ApplicationStage) => void;
  candidateSkills: string[];
}

export const OdysseyView: React.FC<Props> = ({
  opportunities,
  onUpdateStage,
  candidateSkills
}) => {
  const [selectedOppId, setSelectedOppId] = useState<string>(opportunities[0]?.id || '');
  const [recipientType, setRecipientType] = useState<'hiring-manager' | 'peer-engineer' | 'recruiter'>('hiring-manager');
  const [copiedDraft, setCopiedDraft] = useState(false);

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
        </div>
      </div>

      {/* Kanban Pipeline Overview */}
      <div className="mb-10">
        <h3 className="text-sm font-semibold text-slate-100 uppercase tracking-wider mb-4 flex items-center gap-2">
          <span>职业航道看板 (Application Pipeline)</span>
        </h3>

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
    </div>
  );
};
