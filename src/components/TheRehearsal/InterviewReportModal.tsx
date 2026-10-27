import React, { useState } from 'react';
import { X, Copy, Check, Printer, Award, FileText } from 'lucide-react';
import { InterviewSession } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  session: InterviewSession;
}

export const InterviewReportModal: React.FC<Props> = ({ isOpen, onClose, session }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const generateMarkdownReport = () => {
    let md = `# ${session.roundName} · 专场复盘案卷 (Interview Dossier)\n`;
    md += `**目标企业**：${session.targetCompany} | **岗位**：${session.targetRole}\n`;
    md += `**面试官人设**：${session.persona} | **生成时间**：${new Date().toLocaleString()}\n\n`;

    if (session.report) {
      md += `## 1. 导演剪辑版复盘总评 (Director's Cut Report)\n`;
      md += `**综合定力评分**：${session.report.overallScore} / 100\n\n`;
      md += `- **技术纵深 (Technical Rigor)**: ${session.report.dimensions.technicalRigor} / 100\n`;
      md += `- **结构条理 (Structural Clarity)**: ${session.report.dimensions.structuralClarity} / 100\n`;
      md += `- **量化严谨 (Metric Impact)**: ${session.report.dimensions.metricImpact} / 100\n`;
      md += `- **领导力气场 (Executive Presence)**: ${session.report.dimensions.executivePresence} / 100\n\n`;
      md += `> **主评策展语**：“${session.report.executiveSummary}”\n\n`;
      md += `### ✦ 高光优势 (Strengths)\n`;
      for (const s of session.report.strengths) md += `- ${s}\n`;
      md += `\n### ✦ 跃迁生长点 (Growth Vectors)\n`;
      for (const g of session.report.growthVectors) md += `- ${g}\n`;
      md += `\n### ✦ 至日典范级解题示范 (Golden Exemplar)\n`;
      md += `**原题**：“${session.report.goldenExemplar.question}”\n\n`;
      md += `**标杆示范**：\n“${session.report.goldenExemplar.exemplarAnswer}”\n\n`;
      md += `**解法拆解**：${session.report.goldenExemplar.breakdownRationale}\n\n`;
    }

    if (session.scratchpadNotes) {
      md += `## 2. 现场白板架构草案 (Whiteboard Architecture Notes)\n`;
      md += `\`\`\`\n${session.scratchpadNotes}\n\`\`\`\n\n`;
    }

    md += `## 3. 全程高压问答实录 (Verbatim Transcripts)\n`;
    for (const msg of session.messages) {
      const sender = msg.sender === 'interviewer' ? `【面试官 ${session.targetCompany}】` : `【候选人答辩】`;
      md += `### ${sender} · ${msg.timestamp}\n${msg.content}\n\n`;
      if (msg.evaluation) {
        md += `*即时评测分：${msg.evaluation.score}/100 — ${msg.evaluation.quickFeedback}*\n\n`;
      }
    }

    return md;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateMarkdownReport());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-solstice-950/85 backdrop-blur-md">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl glass-panel-glow border border-solstice-gold/35 shadow-2xl text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-solstice-800 bg-solstice-900/90">
          <div className="flex items-center gap-2.5">
            <Award className="w-5 h-5 text-solstice-gold" />
            <h3 className="font-serif text-base font-bold gold-gradient-text">
              排练场复盘专卷导出 (Interview Dossier Export)
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-solstice-800 border border-solstice-700 text-xs text-slate-200 hover:border-solstice-gold transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '已复制 Markdown' : '复制 Markdown 报告'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-solstice-gold text-solstice-950 text-xs font-semibold hover:brightness-110 transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>打印为 PDF 专报</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content View */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs leading-relaxed text-slate-200 font-sans">
          <div className="border-b border-solstice-800 pb-4">
            <h2 className="text-lg font-bold text-slate-100 font-serif gold-gradient-text">{session.roundName}</h2>
            <p className="text-slate-400 mt-1">{session.targetCompany} · {session.targetRole} | 面试官人设：{session.persona}</p>
          </div>

          {session.report && (
            <div className="p-4 rounded-2xl bg-solstice-900/80 border border-solstice-gold/30 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-sm text-solstice-gold font-serif">导演剪辑版复盘总评</span>
                <span className="text-base font-mono font-bold text-solstice-gold-light">{session.report.overallScore} / 100</span>
              </div>
              <p className="italic text-slate-300">“{session.report.executiveSummary}”</p>
              
              <div className="grid grid-cols-4 gap-2 pt-2 border-t border-solstice-800 text-center font-mono">
                <div className="p-2 rounded bg-solstice-950">
                  <div className="text-[10px] text-slate-400">技术纵深</div>
                  <div className="text-sky-400 font-bold">{session.report.dimensions.technicalRigor}</div>
                </div>
                <div className="p-2 rounded bg-solstice-950">
                  <div className="text-[10px] text-slate-400">结构条理</div>
                  <div className="text-emerald-400 font-bold">{session.report.dimensions.structuralClarity}</div>
                </div>
                <div className="p-2 rounded bg-solstice-950">
                  <div className="text-[10px] text-slate-400">量化严谨</div>
                  <div className="text-amber-400 font-bold">{session.report.dimensions.metricImpact}</div>
                </div>
                <div className="p-2 rounded bg-solstice-950">
                  <div className="text-[10px] text-slate-400">气场领导力</div>
                  <div className="text-purple-400 font-bold">{session.report.dimensions.executivePresence}</div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <h3 className="font-semibold text-slate-200 text-sm flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-solstice-gold" />
              <span>问答实录逐字稿</span>
            </h3>
            {session.messages.map((m) => (
              <div key={m.id} className="p-3.5 rounded-xl bg-solstice-900/60 border border-solstice-800">
                <div className="flex justify-between text-[10px] text-slate-500 font-mono mb-1">
                  <span>{m.sender === 'interviewer' ? session.targetCompany + ' 面试官' : '候选人答辩'}</span>
                  <span>{m.timestamp}</span>
                </div>
                <p className="text-slate-200 whitespace-pre-line">{m.content}</p>
                {m.evaluation && (
                  <div className="mt-2 text-[11px] text-emerald-400 font-mono">
                    评测反馈 ({m.evaluation.score}分): {m.evaluation.quickFeedback}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
