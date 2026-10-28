import React, { useState, useEffect } from 'react';
import { 
  X, 
  Monitor, 
  Apple, 
  Download, 
  CheckCircle2, 
  Terminal, 
  HardDrive, 
  Sparkles, 
  ExternalLink,
  ShieldCheck,
  Zap,
  FolderDown
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const DesktopDownloadModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [detectedOS, setDetectedOS] = useState<'mac' | 'windows' | 'other'>('mac');
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = window.navigator.userAgent.toLowerCase();
      if (ua.includes('mac') || ua.includes('darwin')) {
        setDetectedOS('mac');
      } else if (ua.includes('win')) {
        setDetectedOS('windows');
      } else {
        setDetectedOS('other');
      }
    }
  }, []);

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  // GitHub Release Direct or Fallback URLs
  const GITHUB_REPO = 'https://github.com/Moon-Meld/Solstice';
  const RELEASE_TAG = 'v1.0.0';
  const MAC_ARM_URL = `${GITHUB_REPO}/releases/download/${RELEASE_TAG}/Solstice-1.0.0-arm64.dmg`;
  const MAC_X64_URL = `${GITHUB_REPO}/releases/download/${RELEASE_TAG}/Solstice-1.0.0-x64.dmg`;
  const WIN_SETUP_URL = `${GITHUB_REPO}/releases/download/${RELEASE_TAG}/Solstice.Setup.1.0.0.exe`;
  const WIN_PORTABLE_URL = `${GITHUB_REPO}/releases/download/${RELEASE_TAG}/Solstice.1.0.0.exe`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-solstice-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-gradient-to-b from-solstice-900/95 via-solstice-950/95 to-[#06080E] border border-solstice-gold/30 shadow-2xl p-6 md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-solstice-800/60 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center max-w-2xl mx-auto mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-solstice-gold/10 border border-solstice-gold/30 text-solstice-gold text-xs font-mono mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>跨平台原生桌面工坊 · 双端现已发布</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-serif font-bold gold-gradient-text tracking-wide mb-2">
            下载 Solstice (至日) 桌面客户端
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            告别浏览器繁杂标签，享受原生桌面级毫秒启动、离线全功能 Graph-RAG 推理与更高私密性的本地生涯画卷存储。
          </p>
        </div>

        {/* OS Download Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* macOS Card */}
          <div className={`relative rounded-xl p-6 border transition-all ${
            detectedOS === 'mac' 
              ? 'bg-solstice-900/80 border-solstice-gold/50 shadow-gold-glow' 
              : 'bg-solstice-900/40 border-solstice-800 hover:border-solstice-700'
          }`}>
            {detectedOS === 'mac' && (
              <div className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full bg-solstice-gold text-solstice-950 text-[10px] font-bold font-mono tracking-wider shadow">
                当前系统推荐
              </div>
            )}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center text-slate-200">
                <Apple className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-serif font-semibold text-slate-100 flex items-center gap-2">
                  macOS 客户端
                </h3>
                <span className="text-xs text-slate-400 font-mono">支持 macOS 12+ (Monterey 及以上)</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-5 leading-relaxed">
              专为 Mac 深度调优，适配 Apple 视网膜屏与沉浸式暗黑标题栏，原生支持 Apple Silicon M 系列芯片与 Intel 架构。
            </p>

            <div className="space-y-2.5 mb-5">
              <a
                href={MAC_ARM_URL}
                download="Solstice-1.0.0-arm64.dmg"
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-gradient-to-r from-solstice-gold to-solstice-gold-light hover:brightness-110 text-solstice-950 font-semibold text-xs transition-all shadow-md group"
              >
                <span className="flex items-center gap-2">
                  <Download className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
                  下载 Apple Silicon 版 (.dmg)
                </span>
                <span className="font-mono text-[10px] opacity-80">M1/M2/M3/M4</span>
              </a>

              <a
                href={MAC_X64_URL}
                download="Solstice-1.0.0-x64.dmg"
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-solstice-800 hover:bg-solstice-700 border border-solstice-700/80 text-slate-200 text-xs transition-all"
              >
                <span className="flex items-center gap-2">
                  <Download className="w-3.5 h-3.5 text-solstice-gold" />
                  下载 Intel 芯片版 (.dmg)
                </span>
                <span className="font-mono text-[10px] text-slate-400">x64 架构</span>
              </a>
            </div>

            <div className="p-3 rounded-lg bg-solstice-950/70 border border-solstice-800/80 text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                <HardDrive className="w-3 h-3 text-solstice-gold" />
                <span>快速安装步骤：</span>
              </div>
              <p>1. 双击打开下载的 <code className="text-solstice-gold-light font-mono">.dmg</code> 镜像文件</p>
              <p>2. 将至日图标拖入 <code className="text-slate-200 font-mono">Applications (应用程序)</code> 即可</p>
            </div>
          </div>

          {/* Windows Card */}
          <div className={`relative rounded-xl p-6 border transition-all ${
            detectedOS === 'windows' 
              ? 'bg-solstice-900/80 border-solstice-gold/50 shadow-gold-glow' 
              : 'bg-solstice-900/40 border-solstice-800 hover:border-solstice-700'
          }`}>
            {detectedOS === 'windows' && (
              <div className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full bg-solstice-gold text-solstice-950 text-[10px] font-bold font-mono tracking-wider shadow">
                当前系统推荐
              </div>
            )}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center text-slate-200">
                <Monitor className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-serif font-semibold text-slate-100 flex items-center gap-2">
                  Windows 客户端
                </h3>
                <span className="text-xs text-slate-400 font-mono">支持 Windows 10 / 11 (64-bit)</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-5 leading-relaxed">
              针对 Windows 桌面体验优化，提供标准安装向导与绿色免安装双重选择，内置完整离线推理与图谱数据。
            </p>

            <div className="space-y-2.5 mb-5">
              <a
                href={WIN_SETUP_URL}
                download="Solstice-Setup-1.0.0.exe"
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-gradient-to-r from-solstice-gold to-solstice-gold-light hover:brightness-110 text-solstice-950 font-semibold text-xs transition-all shadow-md group"
              >
                <span className="flex items-center gap-2">
                  <Download className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
                  下载 Windows 安装包 (.exe)
                </span>
                <span className="font-mono text-[10px] opacity-80">NSIS 安装向导</span>
              </a>

              <a
                href={WIN_PORTABLE_URL}
                download="Solstice-1.0.0.exe"
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-solstice-800 hover:bg-solstice-700 border border-solstice-700/80 text-slate-200 text-xs transition-all"
              >
                <span className="flex items-center gap-2">
                  <FolderDown className="w-3.5 h-3.5 text-solstice-gold" />
                  下载便携免安装版 (Portable .exe)
                </span>
                <span className="font-mono text-[10px] text-slate-400">单文件即开即用</span>
              </a>
            </div>

            <div className="p-3 rounded-lg bg-solstice-950/70 border border-solstice-800/80 text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                <CheckCircle2 className="w-3 h-3 text-solstice-gold" />
                <span>快速安装步骤：</span>
              </div>
              <p>1. 运行 <code className="text-solstice-gold-light font-mono">Solstice Setup 1.0.0.exe</code> 安装向导</p>
              <p>2. 自动在桌面与开始菜单生成快捷方式，完成后一键启动</p>
            </div>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 pt-6 border-t border-solstice-800/80">
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-solstice-900/30 border border-solstice-800/50">
            <Zap className="w-4 h-4 text-solstice-gold shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-semibold text-slate-200 mb-1">原生极速流畅</h4>
              <p className="text-[11px] text-slate-400">无需等待浏览器加载，秒级唤醒四大艺术工坊，全屏专注沉浸。</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-solstice-900/30 border border-solstice-800/50">
            <ShieldCheck className="w-4 h-4 text-solstice-gold shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-semibold text-slate-200 mb-1">私有主权数据</h4>
              <p className="text-[11px] text-slate-400">经历与简历草稿完全保存在本地，无需担忧云端泄露，绝对安全。</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-solstice-900/30 border border-solstice-800/50">
            <HardDrive className="w-4 h-4 text-solstice-gold shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-semibold text-slate-200 mb-1">离线 Graph-RAG</h4>
              <p className="text-[11px] text-slate-400">内置多跳天桥寻径与标杆 JD 题库，即使断网亦能完整使用。</p>
            </div>
          </div>
        </div>

        {/* Developer / Local Pack CLI Section */}
        <div className="rounded-xl bg-solstice-950 border border-solstice-800 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
              <Terminal className="w-4 h-4 text-solstice-gold" />
              <span>开发与自编译打包 (Local Build)</span>
            </div>
            <a
              href={`${GITHUB_REPO}/releases`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] text-solstice-gold hover:underline font-mono"
            >
              <span>查看 GitHub Releases 全部历史版本</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-solstice-900/70 border border-solstice-800">
              <span className="text-slate-300 truncate"># 打包 macOS DMG</span>
              <button 
                onClick={() => handleCopy('npm run electron:build:mac', 'mac-cmd')}
                className="text-[11px] px-2 py-0.5 rounded bg-solstice-800 hover:bg-solstice-700 text-solstice-gold transition-colors shrink-0 ml-2"
              >
                {copiedCmd === 'mac-cmd' ? '已复制 ✓' : '复制命令'}
              </button>
            </div>

            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-solstice-900/70 border border-solstice-800">
              <span className="text-slate-300 truncate"># 打包 Windows EXE</span>
              <button 
                onClick={() => handleCopy('npm run electron:build:win', 'win-cmd')}
                className="text-[11px] px-2 py-0.5 rounded bg-solstice-800 hover:bg-solstice-700 text-solstice-gold transition-colors shrink-0 ml-2"
              >
                {copiedCmd === 'win-cmd' ? '已复制 ✓' : '复制命令'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
