import React, { useState } from 'react';
import { X, Sparkles, FileText, CheckCircle2, UploadCloud, RotateCcw } from 'lucide-react';
import { DOMAIN_RESUME_TEMPLATES, resumeParserService } from '../../services/resumeParser';
import { CandidateProfile } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (templateId: string) => void;
  onImportProfile: (profile: CandidateProfile) => void;
  onResetDefault: () => void;
  currentTargetRole: string;
}

export const ResumeImportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSelectTemplate,
  onImportProfile,
  onResetDefault,
  currentTargetRole
}) => {
  const [activeTab, setActiveTab] = useState<'templates' | 'paste' | 'upload'>('templates');
  const [rawText, setRawText] = useState('');
  const [isParsing, setIsParsing] = useState(false);

  if (!isOpen) return null;

  const handleParseAndImport = () => {
    if (!rawText.trim()) return;
    setIsParsing(true);
    setTimeout(() => {
      const parsed = resumeParserService.parseRawResumeText(rawText, currentTargetRole);
      onImportProfile(parsed);
      setIsParsing(false);
      onClose();
    }, 400);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(content);
          if (parsed.profile) {
            onImportProfile(parsed.profile);
          } else if (parsed.name && parsed.experiences) {
            onImportProfile(parsed);
          }
        } else {
          const parsed = resumeParserService.parseRawResumeText(content, currentTargetRole);
          onImportProfile(parsed);
        }
        onClose();
      } catch (err) {
        alert('文件解析异常，请确认文件格式有效。');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-solstice-950/85 backdrop-blur-md">
      <div className="relative w-full max-w-2xl p-6 rounded-3xl glass-panel-glow border border-solstice-gold/35 shadow-2xl text-slate-100 max-h-[88vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-solstice-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-solstice-gold/15 text-solstice-gold border border-solstice-gold/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold gold-gradient-text">
                履历载入与领域模板切换 (Resume Import &amp; Templates)
              </h3>
              <p className="text-xs text-slate-400">
                载入名企精选工程模板，或粘贴/上传自定义简历文本进行 Graph-RAG 结构化解析
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 my-4 border-b border-solstice-800/80 pb-3 text-xs">
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
              activeTab === 'templates'
                ? 'bg-solstice-gold text-solstice-950 font-bold shadow-gold-glow'
                : 'text-slate-400 hover:text-white bg-solstice-900'
            }`}
          >
            名企精选模板
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
              activeTab === 'paste'
                ? 'bg-solstice-gold text-solstice-950 font-bold shadow-gold-glow'
                : 'text-slate-400 hover:text-white bg-solstice-900'
            }`}
          >
            粘贴纯文本解析
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
              activeTab === 'upload'
                ? 'bg-solstice-gold text-solstice-950 font-bold shadow-gold-glow'
                : 'text-slate-400 hover:text-white bg-solstice-900'
            }`}
          >
            上传文件 (JSON / TXT)
          </button>
        </div>

        {/* Tab 1: Pre-set Domain Templates */}
        {activeTab === 'templates' && (
          <div className="space-y-3 overflow-y-auto pr-1 flex-1">
            {DOMAIN_RESUME_TEMPLATES.map((tmpl) => (
              <div
                key={tmpl.id}
                className="p-4 rounded-2xl bg-solstice-900/70 border border-solstice-800 hover:border-solstice-gold/50 transition-all flex items-center justify-between gap-4"
              >
                <div>
                  <div className="font-semibold text-sm text-slate-100 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-solstice-gold" />
                    <span>{tmpl.label}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 max-w-lg leading-relaxed">
                    {tmpl.profile.summary}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {tmpl.profile.skills.slice(0, 4).map((s, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-solstice-800 text-[10px] font-mono text-slate-300">
                        {s.replace('skill-', '').replace('-', ' ')}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => {
                    onSelectTemplate(tmpl.id);
                    onClose();
                  }}
                  className="px-4 py-2 rounded-xl bg-solstice-gold/20 border border-solstice-gold/40 text-solstice-gold hover:bg-solstice-gold hover:text-solstice-950 text-xs font-semibold shrink-0 transition-all"
                >
                  载入此模板
                </button>
              </div>
            ))}

            <div className="pt-2 flex justify-between items-center text-xs text-slate-500">
              <span>预置模板均通过业界前 1% 猎头与名企面试官严苛审核</span>
              <button
                onClick={() => {
                  onResetDefault();
                  onClose();
                }}
                className="flex items-center gap-1 text-slate-400 hover:text-amber-400"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>重置为初始默认长卷</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Raw Text Parsing */}
        {activeTab === 'paste' && (
          <div className="flex flex-col flex-1 space-y-3">
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="在此粘贴你的简历全文（支持 Markdown、纯文本或从 LinkedIn / 简历导出的片段）..."
              rows={8}
              className="w-full flex-1 p-3 text-xs font-sans bg-solstice-950 border border-solstice-700 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-solstice-gold resize-none"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={handleParseAndImport}
                disabled={!rawText.trim() || isParsing}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-solstice-gold text-solstice-950 text-xs font-semibold hover:brightness-110 disabled:opacity-40 transition-all shadow-gold-glow"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isParsing ? '至日解析中...' : '智能解析并载入工作区'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: File Upload */}
        {activeTab === 'upload' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 border-2 border-dashed border-solstice-700/80 rounded-2xl bg-solstice-950/40 text-center">
            <UploadCloud className="w-10 h-10 text-solstice-gold mb-3 opacity-80" />
            <p className="text-xs font-medium text-slate-200 mb-1">
              选择或拖放简历文件至此
            </p>
            <p className="text-[11px] text-slate-400 mb-4">
              支持 `.json` (Solstice 工作区备份) 或 `.txt` / `.md` 文本文件
            </p>
            <label className="cursor-pointer px-4 py-2 rounded-xl bg-solstice-800 border border-solstice-700 hover:border-solstice-gold text-xs font-medium text-slate-200 transition-all">
              <span>浏览本地文件</span>
              <input
                type="file"
                accept=".json,.txt,.md"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
};
