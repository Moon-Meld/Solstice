import React, { useState, useEffect } from 'react';
import { StarFieldCanvas } from './components/Common/StarFieldCanvas';
import { AstrolabeHeader } from './components/Navigation/AstrolabeHeader';
import { SelfPortraitView } from './components/SelfPortrait/SelfPortraitView';
import { ConstellationView } from './components/Constellation/ConstellationView';
import { TheRehearsalView } from './components/TheRehearsal/TheRehearsalView';
import { OdysseyView } from './components/Odyssey/OdysseyView';
import { LLMSettingsModal } from './components/Common/LLMSettingsModal';
import { orchestrator } from './services/orchestrator';
import { OrchestratorState } from './types';
import { kgEngine } from './services/kgEngine';

export const App: React.FC = () => {
  const [state, setState] = useState<OrchestratorState>(orchestrator.getState());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = orchestrator.subscribe((newState) => {
      setState(newState);
    });
    return unsubscribe;
  }, []);

  const currentRole = kgEngine.getNode(state.profile.targetRole);
  const targetRoleTitle = currentRole ? currentRole.label : 'AI Infrastructure Engineer';

  return (
    <div className="relative min-h-screen bg-solstice-950 text-slate-100 flex flex-col font-sans selection:bg-solstice-gold/30 selection:text-solstice-gold-light">
      {/* Celestial Ambient Canvas */}
      <StarFieldCanvas />

      {/* Astrolabe Top Header */}
      <AstrolabeHeader
        activeAtelier={state.activeAtelier}
        onSelectAtelier={(atelier) => orchestrator.switchAtelier(atelier)}
        currentTargetRole={state.profile.targetRole}
        onSelectTargetRole={(roleId) => orchestrator.updateTargetRole(roleId)}
        llmConfig={state.llmConfig}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Atelier View Container */}
      <main className="relative z-10 flex-1">
        {state.activeAtelier === 'self-portrait' && (
          <SelfPortraitView
            profile={state.profile}
            onRefineBullet={(expId, rawBullet) => orchestrator.refineBullet(expId, rawBullet)}
            onBatchRefineAll={(expId) => orchestrator.batchRefineAllBullets(expId)}
            targetRoleTitle={targetRoleTitle}
          />
        )}

        {state.activeAtelier === 'constellation' && (
          <ConstellationView
            userSkillIds={state.profile.skills}
            targetRoleId={state.profile.targetRole}
            alignment={state.alignment}
            onToggleSkill={(skillId) => orchestrator.toggleSkill(skillId)}
            onAddCustomSkill={(label) => orchestrator.addCustomSkill(label)}
          />
        )}

        {state.activeAtelier === 'the-rehearsal' && (
          <TheRehearsalView
            activeSession={state.activeInterview}
            onStartSession={(persona, comp, role, roundType) => orchestrator.startMockInterview(persona, comp, role, roundType)}
            onSendAnswer={(answer) => orchestrator.sendInterviewAnswer(answer)}
            onResetSession={() => orchestrator.resetInterview()}
            onUpdateScratchpad={(notes) => orchestrator.updateScratchpad(notes)}
            defaultCompany={state.alignment?.companyName || 'OpenAI'}
            defaultRoleTitle={targetRoleTitle}
          />
        )}

        {state.activeAtelier === 'odyssey' && (
          <OdysseyView
            opportunities={state.opportunities}
            journalEntries={state.journalEntries}
            onUpdateStage={(id, stage) => orchestrator.updateOpportunityStage(id, stage)}
            onAddOpportunity={(opp) => orchestrator.addOpportunity(opp)}
            onAddJournalEntry={(entry) => orchestrator.addJournalEntry(entry)}
            candidateSkills={state.profile.skills}
          />
        )}
      </main>

      {/* Global Status Bar Footer */}
      <footer className="relative z-10 w-full border-t border-solstice-800/80 bg-solstice-950/90 py-3 px-6 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span className="flex items-center gap-1.5 text-solstice-gold">
              <span className="w-2 h-2 rounded-full bg-solstice-gold animate-pulse" />
              Graph-RAG 引擎就绪
            </span>
            <span className="text-slate-500">|</span>
            <span>KG 节点：{kgEngine.getAllNodes().length} 星宿</span>
            <span className="text-slate-500">|</span>
            <span>拓扑边：{kgEngine.getAllEdges().length} 引力链</span>
          </div>

          <div className="text-[11px] text-slate-500 flex items-center gap-2">
            <span>Solstice (至日) · AI Career Artisan &amp; Orchestrator</span>
            <span>·</span>
            <span className="text-solstice-gold-dim">The Canvas Principle</span>
          </div>
        </div>
      </footer>

      {/* Settings Modal */}
      <LLMSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={state.llmConfig}
        onSave={(newCfg) => orchestrator.setLLMConfig(newCfg)}
      />
    </div>
  );
};
