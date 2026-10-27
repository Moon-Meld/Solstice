import { OrchestratorState } from '../types';

const STORAGE_KEY = 'solstice_orchestrator_workspace_v1';

export class WorkspaceStorageService {
  /**
   * Saves current state to localStorage safely
   */
  public saveState(state: OrchestratorState): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      const serialized = JSON.stringify({
        profile: state.profile,
        opportunities: state.opportunities,
        journalEntries: state.journalEntries,
        llmConfig: state.llmConfig,
        activeAtelier: state.activeAtelier
      });
      localStorage.setItem(STORAGE_KEY, serialized);
    } catch (e) {
      console.warn('[Solstice Storage] Failed to persist state:', e);
    }
  }

  /**
   * Loads state from localStorage
   */
  public loadState(): Partial<OrchestratorState> | null {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return null;
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.warn('[Solstice Storage] Failed to load persisted state:', e);
      return null;
    }
  }

  /**
   * Clears saved state
   */
  public clearState(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.warn('[Solstice Storage] Failed to clear storage:', e);
    }
  }

  /**
   * Exports full workspace data package
   */
  public exportWorkspaceFile(state: OrchestratorState): void {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `Solstice_Workspace_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }
}

export const storageService = new WorkspaceStorageService();
