import React, { useState } from 'react';
import { 
  Compass, 
  Palette, 
  Sparkles, 
  Radio, 
  SlidersHorizontal,
  ChevronDown,
  Layers,
  Download
} from 'lucide-react';
import { AtelierType, LLMConfig } from '../../types';
import { kgEngine } from '../../services/kgEngine';

interface Props {
  activeAtelier: AtelierType;
  onSelectAtelier: (atelier: AtelierType) => void;
  currentTargetRole: string;
  onSelectTargetRole: (roleId: string) => void;
  llmConfig: LLMConfig;
  onOpenSettings: () => void;
  onExportBackup?: () => void;
}

export const AstrolabeHeader: React.FC<Props> = ({
  activeAtelier,
  onSelectAtelier,
  currentTargetRole,
  onSelectTargetRole,
  llmConfig,
  onOpenSettings,
  onExportBackup
}) => {
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const roles = kgEngine.getRoleNodes();
  const currentRoleNode = kgEngine.getNode(currentTargetRole);

  const ateliers: { id: AtelierType; label: string; icon: React.ReactNode; sublabel: string }[] = [
    {
      id: 'self-portrait',
      label: '自画像',
      sublabel: 'Self-Portrait',
      icon: <Palette className="w-4 h-4" />
    },
    {
      id: 'constellation',
      label: '星宿图',
      sublabel: 'Constellation',
      icon: <Sparkles className="w-4 h-4" />
    },
    {
      id: 'the-rehearsal',
      label: '排练场',
      sublabel: 'The Rehearsal',
      icon: <Radio className="w-4 h-4" />
    },
    {
      id: 'odyssey',
      label: '奥德赛',
      sublabel: 'Odyssey',
      icon: <Compass className="w-4 h-4" />
    }
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-solstice-gold/15 bg-solstice-950/85 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
        {/* Brand & Astrolabe Mark */}
        <div className="flex items-center gap-3.5 shrink-0">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-solstice-900 to-solstice-800 border border-solstice-gold/30 shadow-gold-glow overflow-hidden">
            <img src="/solstice-logo.svg" alt="Solstice Icon" className="w-8 h-8 object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-lg font-bold tracking-wider gold-gradient-text">
                SOLSTICE
              </h1>
              <span className="px-1.5 py-0.5 text-[10px] font-mono tracking-widest text-solstice-gold border border-solstice-gold/30 rounded bg-solstice-gold/10">
                至日
              </span>
            </div>
            <p className="text-[10px] tracking-widest uppercase text-slate-400 font-sans">
              Career Artisan &amp; Orchestrator
            </p>
          </div>
        </div>

        {/* 4 Ateliers Navigation Switcher */}
        <nav className="hidden md:flex items-center p-1 rounded-2xl bg-solstice-900/90 border border-solstice-700/60 shadow-inner">
          {ateliers.map((atelier) => {
            const isActive = activeAtelier === atelier.id;
            return (
              <button
                key={atelier.id}
                onClick={() => onSelectAtelier(atelier.id)}
                className={`relative flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'text-solstice-950 font-semibold bg-gradient-to-r from-solstice-gold to-solstice-gold-light shadow-gold-glow'
                    : 'text-slate-300 hover:text-slate-100 hover:bg-solstice-800/60'
                }`}
              >
                <span className={isActive ? 'text-solstice-950' : 'text-solstice-gold'}>
                  {atelier.icon}
                </span>
                <span className="flex flex-col text-left">
                  <span className="leading-tight">{atelier.label}</span>
                  <span className={`text-[9px] font-sans tracking-tight opacity-75 ${isActive ? 'text-solstice-900' : 'text-slate-400'}`}>
                    {atelier.sublabel}
                  </span>
                </span>
              </button>
            );
          })}
        </nav>

        {/* Target Role & Engine Controls */}
        <div className="flex items-center gap-3">
          {/* Target Role Selector */}
          <div className="relative">
            <button
              onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-xl border border-solstice-700/70 bg-solstice-900/80 hover:border-solstice-gold/40 text-slate-200 transition-all max-w-[210px] truncate"
            >
              <Layers className="w-3.5 h-3.5 text-solstice-gold shrink-0" />
              <div className="text-left truncate">
                <div className="text-[9px] text-slate-400 uppercase tracking-wider">目标对准星位</div>
                <div className="font-medium truncate text-slate-100">
                  {currentRoleNode ? currentRoleNode.label.split('(')[0].trim() : '选择目标岗位'}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
            </button>

            {roleDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 p-2 rounded-xl glass-panel-glow border border-solstice-gold/30 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-2 py-1.5 text-[10px] uppercase tracking-wider text-slate-400 font-medium border-b border-solstice-800">
                  知识图谱·标杆对齐星位
                </div>
                <div className="mt-1 space-y-1">
                  {roles.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => {
                        onSelectTargetRole(r.id);
                        setRoleDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex flex-col ${
                        r.id === currentTargetRole
                          ? 'bg-solstice-gold/20 text-solstice-gold-light border border-solstice-gold/30'
                          : 'text-slate-300 hover:bg-solstice-800 hover:text-white'
                      }`}
                    >
                      <span className="font-medium text-slate-100">{r.label}</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">{r.domain}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Export Full Workspace Backup */}
          {onExportBackup && (
            <button
              onClick={onExportBackup}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-xl border border-solstice-700/70 bg-solstice-900/80 hover:border-solstice-gold/40 text-slate-300 hover:text-slate-100 transition-all"
              title="导出当前工作区备份文件 (JSON)"
            >
              <Download className="w-3.5 h-3.5 text-solstice-gold" />
              <span className="hidden sm:inline font-mono text-[11px] text-slate-300">备份</span>
            </button>
          )}

          {/* Settings / Engine Toggle */}
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-xl border border-solstice-700/70 bg-solstice-900/80 hover:border-solstice-gold/40 text-slate-300 hover:text-slate-100 transition-all"
            title="配置大模型与图谱引擎"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-solstice-gold" />
            <span className="hidden sm:inline font-mono text-[11px] text-slate-300">
              {llmConfig.mode === 'hybrid' ? 'Graph-RAG' : llmConfig.mode.toUpperCase()}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Ateliers Bar */}
      <div className="flex md:hidden border-t border-solstice-800/80 bg-solstice-900/90 px-2 py-1 justify-around">
        {ateliers.map((atelier) => {
          const isActive = activeAtelier === atelier.id;
          return (
            <button
              key={atelier.id}
              onClick={() => onSelectAtelier(atelier.id)}
              className={`flex flex-col items-center py-1.5 px-3 rounded-lg text-[10px] ${
                isActive ? 'text-solstice-gold font-semibold' : 'text-slate-400'
              }`}
            >
              {atelier.icon}
              <span className="mt-0.5">{atelier.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
