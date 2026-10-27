import React, { useState } from 'react';
import { X, Sparkles, Key, CheckCircle2, ShieldCheck } from 'lucide-react';
import { LLMConfig } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  config: LLMConfig;
  onSave: (config: Partial<LLMConfig>) => void;
}

export const LLMSettingsModal: React.FC<Props> = ({ isOpen, onClose, config, onSave }) => {
  const [mode, setMode] = useState<LLMConfig['mode']>(config.mode);
  const [apiKey, setApiKey] = useState(config.apiKey || '');
  const [modelName, setModelName] = useState(config.modelName || 'gemini-2.0-flash');
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({ mode, apiKey, modelName });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-solstice-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg p-6 rounded-2xl glass-panel-glow border border-solstice-gold/30 text-slate-100 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-solstice-700/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-solstice-gold/10 border border-solstice-gold/20 text-solstice-gold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-semibold tracking-wide gold-gradient-text">
                大模型与推理引擎配置 (LLM Dual-Engine)
              </h3>
              <p className="text-xs text-slate-400">
                配置 Solstice 智能体的底层推理源与知识综合引擎
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-solstice-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="mt-5 space-y-5">
          {/* Engine Mode */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">
              推理模式 (Inference Engine)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMode('hybrid')}
                className={`px-3 py-2.5 rounded-xl text-xs font-medium border text-center transition-all ${
                  mode === 'hybrid'
                    ? 'border-solstice-gold bg-solstice-gold/15 text-solstice-gold-light shadow-gold-glow'
                    : 'border-solstice-700/60 bg-solstice-900/60 text-slate-300 hover:border-slate-500'
                }`}
              >
                <div className="font-semibold">渐进式高保真</div>
                <div className="text-[10px] text-slate-400 mt-0.5">本地 Graph-RAG 引擎</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('gemini');
                  if (!modelName.includes('gemini')) setModelName('gemini-2.0-flash');
                }}
                className={`px-3 py-2.5 rounded-xl text-xs font-medium border text-center transition-all ${
                  mode === 'gemini'
                    ? 'border-solstice-celestial-blue bg-solstice-celestial-blue/15 text-sky-200 shadow-celestial-glow'
                    : 'border-solstice-700/60 bg-solstice-900/60 text-slate-300 hover:border-slate-500'
                }`}
              >
                <div className="font-semibold">Google Gemini</div>
                <div className="text-[10px] text-slate-400 mt-0.5">2.0 Flash / Pro</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('openai');
                  if (!modelName.includes('gpt')) setModelName('gpt-4o');
                }}
                className={`px-3 py-2.5 rounded-xl text-xs font-medium border text-center transition-all ${
                  mode === 'openai'
                    ? 'border-solstice-celestial-emerald bg-solstice-celestial-emerald/15 text-emerald-200'
                    : 'border-solstice-700/60 bg-solstice-900/60 text-slate-300 hover:border-slate-500'
                }`}
              >
                <div className="font-semibold">OpenAI</div>
                <div className="text-[10px] text-slate-400 mt-0.5">GPT-4o / o1</div>
              </button>
            </div>
          </div>

          {/* API Key (When not purely hybrid) */}
          {mode !== 'hybrid' && (
            <div className="space-y-3 p-3.5 rounded-xl bg-solstice-900/80 border border-solstice-700/80">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-300 mb-1.5">
                  <Key className="w-3.5 h-3.5 text-solstice-gold" />
                  <span>{mode === 'gemini' ? 'Gemini API Key' : 'OpenAI API Key'}</span>
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={mode === 'gemini' ? 'AIzaSy...' : 'sk-...'}
                  className="w-full px-3 py-2 text-sm bg-solstice-950 border border-solstice-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-solstice-gold font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  模型名称 (Model Identifier)
                </label>
                <input
                  type="text"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder={mode === 'gemini' ? 'gemini-2.0-flash' : 'gpt-4o'}
                  className="w-full px-3 py-2 text-sm bg-solstice-950 border border-solstice-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-solstice-gold font-mono"
                />
              </div>
            </div>
          )}

          {/* Safe Note */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-solstice-gold/5 border border-solstice-gold/15 text-xs text-slate-300">
            <ShieldCheck className="w-4 h-4 text-solstice-gold shrink-0 mt-0.5" />
            <span>
              <strong>安全与隐私声明</strong>：API 密钥仅保存在当前本地会话内存中，绝不上传至任何第三方服务器。在无需配置密钥时，渐进式高保真引擎亦可提供完整、丝滑的 Graph-RAG 多跳推理体验。
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-solstice-gold-dim to-solstice-gold text-solstice-950 hover:brightness-110 shadow-gold-glow transition-all"
          >
            {savedSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>已应用更新</span>
              </>
            ) : (
              <span>保存引擎偏好</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
