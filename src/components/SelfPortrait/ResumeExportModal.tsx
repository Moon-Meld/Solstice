import React, { useState } from 'react';
import { X, Copy, Check, Printer, FileDown, Sparkles } from 'lucide-react';
import { CandidateProfile } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  profile: CandidateProfile;
}

export const ResumeExportModal: React.FC<Props> = ({ isOpen, onClose, profile }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const generateMarkdown = () => {
    let md = `# ${profile.name}\n`;
    md += `**${profile.title}** | ${profile.email}\n\n`;
    md += `## 职业概述 (Executive Summary)\n${profile.summary}\n\n`;
    md += `## 核心专业技能 (Core Competencies)\n${profile.skills.map(s => s.replace('skill-', '').replace('-', ' ')).join(', ')}\n\n`;
    md += `## 工作经历 (Professional Experience)\n`;
    for (const exp of profile.experiences) {
      md += `### ${exp.role} · ${exp.company}\n`;
      md += `*${exp.period} | ${exp.location}*\n\n`;
      for (const bullet of exp.starBullets) {
        md += `- **${bullet.actionVerb}**: ${bullet.refined}\n`;
      }
      md += `\n`;
    }
    md += `## 教育背景 (Education)\n`;
    for (const edu of profile.education) {
      md += `### ${edu.institution} — ${edu.degree}\n`;
      md += `*${edu.period}*\n`;
      md += `- ${edu.highlights}\n`;
    }
    return md;
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(generateMarkdown());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownloadJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(profile, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${profile.name.replace(/\s+/g, '_')}_Solstice_Resume.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-solstice-950/85 backdrop-blur-lg">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl glass-panel-glow border border-solstice-gold/35 shadow-2xl text-slate-100 overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-solstice-700/60 bg-solstice-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-solstice-gold/15 text-solstice-gold border border-solstice-gold/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold gold-gradient-text">
                至日长卷 · 典籍级履历预览与导出 (Executive Resume Canvas)
              </h3>
              <p className="text-xs text-slate-400">
                支持标准 Markdown 导出、JSON 数据留存及浏览器一键打印为高保真 PDF
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyMarkdown}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-solstice-800 border border-solstice-700 hover:border-solstice-gold/40 text-xs font-medium text-slate-200 transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '已复制 Markdown' : '复制 Markdown'}</span>
            </button>
            <button
              onClick={handleDownloadJSON}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-solstice-800 border border-solstice-700 hover:border-solstice-gold/40 text-xs font-medium text-slate-200 transition-all"
            >
              <FileDown className="w-3.5 h-3.5 text-sky-400" />
              <span>下载 JSON</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-solstice-gold text-solstice-950 text-xs font-semibold hover:brightness-110 shadow-gold-glow transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>打印为 PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-solstice-800 ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Resume Content View */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-solstice-950/70 font-sans text-xs leading-relaxed text-slate-200">
          {/* Header */}
          <div className="text-center pb-6 border-b border-solstice-800">
            <h1 className="font-serif text-2xl font-bold tracking-wider text-slate-100 gold-gradient-text">
              {profile.name}
            </h1>
            <p className="text-sm font-medium text-slate-300 mt-1">{profile.title}</p>
            <p className="text-slate-400 font-mono text-[11px] mt-1">{profile.email} · San Francisco / Remote</p>
          </div>

          {/* Summary */}
          <div>
            <h2 className="text-xs font-serif font-bold uppercase tracking-wider text-solstice-gold pb-1 border-b border-solstice-800/80 mb-2">
              职业概述 (Executive Summary)
            </h2>
            <p className="text-slate-300">{profile.summary}</p>
          </div>

          {/* Experience */}
          <div>
            <h2 className="text-xs font-serif font-bold uppercase tracking-wider text-solstice-gold pb-1 border-b border-solstice-800/80 mb-3">
              专业经历与 STAR 高光战绩 (Professional Experience)
            </h2>
            {profile.experiences.map((exp) => (
              <div key={exp.id} className="mb-4">
                <div className="flex justify-between items-baseline mb-1">
                  <div>
                    <span className="font-bold text-slate-100 text-sm">{exp.role}</span>
                    <span className="text-solstice-gold-dim ml-2 font-medium">@ {exp.company}</span>
                  </div>
                  <span className="font-mono text-slate-400 text-[11px]">{exp.period} | {exp.location}</span>
                </div>

                <ul className="space-y-2 mt-2">
                  {exp.starBullets.map((bullet) => (
                    <li key={bullet.id} className="p-2.5 rounded-xl bg-solstice-900/60 border border-solstice-800/80">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-solstice-gold/20 text-solstice-gold">
                          {bullet.actionVerb}
                        </span>
                        <span className="text-[10px] text-emerald-400 font-mono">
                          张力指数 {bullet.potencyScore}%
                        </span>
                      </div>
                      <p className="text-slate-200">{bullet.refined}</p>
                      {bullet.metrics.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {bullet.metrics.map((m, mIdx) => (
                            <span key={mIdx} className="px-2 py-0.5 rounded bg-solstice-800 text-[9px] font-mono text-solstice-gold-light">
                              {m}
                            </span>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Education */}
          <div>
            <h2 className="text-xs font-serif font-bold uppercase tracking-wider text-solstice-gold pb-1 border-b border-solstice-800/80 mb-2">
              教育背景 (Education &amp; Academic Honors)
            </h2>
            {profile.education.map((edu, idx) => (
              <div key={idx} className="flex justify-between items-baseline">
                <div>
                  <span className="font-bold text-slate-100">{edu.institution}</span>
                  <span className="text-slate-300 ml-2">— {edu.degree}</span>
                  <p className="text-slate-400 text-[11px] mt-0.5">{edu.highlights}</p>
                </div>
                <span className="font-mono text-slate-400 text-[11px]">{edu.period}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
