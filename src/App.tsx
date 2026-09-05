import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { TrackerView } from './components/TrackerView';
import { HierarchicalMetricsView } from './components/HierarchicalMetricsView';
import { TaskTimeAuditView } from './components/TaskTimeAuditView';
import { BackupManagerModal } from './components/BackupManagerModal';
import { SystemWalkthroughModal } from './components/SystemWalkthroughModal';
import { RoutineTemplatesModal } from './components/RoutineTemplatesModal';
import { RoutineTemplate } from './data/scheduleTemplates';
import { getDayKeyFromDate } from './utils/ascii';
import {
  loadSchedules,
  saveSchedules,
  loadHierarchyHistory,
  purgeAllDataAndStartClean,
} from './data/historyStore';
import {
  checkAndRunNightlyAutoBackup,
  createSnapshot,
  saveSnapshotToList,
  parseAndValidateBackupJson,
  restoreAllCompletedMap,
} from './data/backupStore';
import {
  getVaultScriptUrl,
  saveToDriveVault,
  getOrCreateSyncCode,
} from './services/driveVaultService';
import { ActiveTab, DaySchedule, MonthLogRecord } from './types';

export default function App() {
  const [activeView, setActiveView] = useState<ActiveTab>('tracker');
  const [selectedDay, setSelectedDay] = useState<string>(() => getDayKeyFromDate());
  const [isBackupOpen, setIsBackupOpen] = useState<boolean>(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState<boolean>(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem('routine_tracker_tutorial_seen_v1') !== 'true';
    } catch {
      return false;
    }
  });
  const [isQuickSyncing, setIsQuickSyncing] = useState<boolean>(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);
  const [syncCode, setSyncCode] = useState<string>(() => getOrCreateSyncCode());

  // Persistent schedules state
  const [schedules, setSchedules] = useState<Record<string, DaySchedule>>(() => {
    return loadSchedules();
  });

  // Persistent hierarchical history state
  const [history, setHistory] = useState<MonthLogRecord[]>(() => {
    return loadHierarchyHistory();
  });

  // Check and run automatic nightly backup when user uses app at night
  useEffect(() => {
    checkAndRunNightlyAutoBackup(schedules, history);
  }, [schedules, history]);

  const handleUpdateSchedules = (newSchedules: Record<string, DaySchedule>) => {
    setSchedules(newSchedules);
    saveSchedules(newSchedules);
  };

  const handleRefreshHistory = () => {
    setHistory(loadHierarchyHistory());
  };

  const handlePurgeAndStartClean = () => {
    const { cleanSchedules, cleanHistory } = purgeAllDataAndStartClean();
    setSchedules(cleanSchedules);
    setHistory(cleanHistory);
    setSyncToast('[CLEAN SLATE]: All placeholder data purged. System reset to zero baseline.');
    setTimeout(() => setSyncToast(null), 5000);
  };

  const handleApplyTemplate = (template: RoutineTemplate) => {
    const newSchedules = template.getSchedules();
    setSchedules(newSchedules);
    saveSchedules(newSchedules);
    setSyncToast(`[TEMPLATE APPLIED]: "${template.name}" active (${template.badge}).`);
    setTimeout(() => setSyncToast(null), 5000);
  };

  const handleRestoreSystem = (newSchedules: Record<string, DaySchedule>, newHistory: MonthLogRecord[]) => {
    setSchedules(newSchedules);
    saveSchedules(newSchedules);
    setHistory(newHistory);
    try {
      localStorage.setItem('alt_routine_hierarchy_history_v1', JSON.stringify(newHistory));
    } catch {
      // ignore
    }
  };

  // Quick 1-Click Google Drive Vault Sync: Backs up data directly to personal Drive Vault
  const handleQuickDriveSync = async () => {
    const webhookUrl = getVaultScriptUrl();
    if (!webhookUrl) {
      setIsBackupOpen(true);
      setSyncToast('[DRIVE SETUP REQUIRED] Please paste your Google Apps Script Webhook URL in Backup & Sync.');
      setTimeout(() => setSyncToast(null), 5000);
      return;
    }

    setIsQuickSyncing(true);
    const code = getOrCreateSyncCode();
    setSyncToast(`[SAVING TO GOOGLE DRIVE VAULT...] Sync Code: ${code}`);
    try {
      // Create snapshot from current state
      const currentSnap = createSnapshot(schedules, history, 'manual');

      // Upload state to Drive Vault
      const result = await saveToDriveVault(currentSnap, code);
      saveSnapshotToList(currentSnap);
      setSyncCode(result.code);

      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setSyncToast(`[✓ CLOUD SYNCED: ${timeStr}] Code: ${result.code} • Saved to Google Drive!`);
      setTimeout(() => setSyncToast(null), 4500);
    } catch (err: unknown) {
      console.error('Quick sync error:', err);
      const msg = err instanceof Error ? err.message : 'Google Drive sync failed.';
      setSyncToast(`SYNC FAILED: ${msg}`);
      setTimeout(() => setSyncToast(null), 6000);
    } finally {
      setIsQuickSyncing(false);
    }
  };

  // Keyboard shortcut listener for terminal-style navigation [1], [2], [3]
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid intercepting when user is typing inside an input or textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.key === '1') setActiveView('tracker');
      if (e.key === '2') setActiveView('hierarchy');
      if (e.key === '3') setActiveView('task_audit');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white font-mono flex flex-col p-4 md:p-8 selection:bg-white selection:text-black">
      <div className="w-full max-w-6xl mx-auto flex-1 flex flex-col">
        {/* Fixed top editorial header */}
        <Header
          activeView={activeView}
          setActiveView={setActiveView}
          selectedDay={selectedDay}
          setSelectedDay={setSelectedDay}
          schedules={schedules}
          onOpenTemplates={() => setIsTemplatesOpen(true)}
          onOpenBackup={() => setIsBackupOpen(true)}
          onOpenTutorial={() => setIsTutorialOpen(true)}
          onQuickDriveSync={handleQuickDriveSync}
          isSyncing={isQuickSyncing}
          syncCode={syncCode}
        />

        {/* Global Sync Notification Banner */}
        {syncToast && (
          <div className="mb-4 border-2 border-white bg-white text-black p-3 text-xs font-bold flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-black animate-pulse" />
              <span>{syncToast}</span>
            </div>
            <button
              onClick={() => setSyncToast(null)}
              className="text-[10px] uppercase font-black px-2 py-0.5 border border-black hover:bg-black hover:text-white transition-none cursor-pointer"
            >
              [DISMISS]
            </button>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 w-full pb-8">
          {activeView === 'tracker' && (
            <TrackerView
              selectedDay={selectedDay}
              setSelectedDay={setSelectedDay}
              schedules={schedules}
              onUpdateSchedules={handleUpdateSchedules}
              onRefreshHistory={handleRefreshHistory}
              onOpenTemplates={() => setIsTemplatesOpen(true)}
            />
          )}

          {activeView === 'hierarchy' && (
            <HierarchicalMetricsView
              history={history}
              onRefresh={handleRefreshHistory}
            />
          )}

          {activeView === 'task_audit' && (
            <TaskTimeAuditView
              schedules={schedules}
              history={history}
            />
          )}
        </main>

        {/* Routine Templates & Slate Manager Modal */}
        <RoutineTemplatesModal
          isOpen={isTemplatesOpen}
          onClose={() => setIsTemplatesOpen(false)}
          schedules={schedules}
          onApplyTemplate={handleApplyTemplate}
        />

        {/* Backup & Persistence Modal */}
        <BackupManagerModal
          isOpen={isBackupOpen}
          onClose={() => setIsBackupOpen(false)}
          schedules={schedules}
          history={history}
          onRestoreSystem={handleRestoreSystem}
          onPurgeAndStartClean={handlePurgeAndStartClean}
        />

        {/* First-Time User System Walkthrough & Interactive Guide Modal */}
        <SystemWalkthroughModal
          isOpen={isTutorialOpen}
          onClose={() => setIsTutorialOpen(false)}
          onPurgeAndStartClean={handlePurgeAndStartClean}
        />

        {/* Editorial Aesthetic Footer */}
        <footer className="mt-8 pt-4 border-t border-white flex flex-col md:flex-row justify-between items-start md:items-end text-[10px] tracking-widest opacity-80 gap-2">
          <div>USER: CS_3RD_YEAR_STUDENT // ROOT_ACCESS_GRANTED</div>
          <div className="hidden sm:block">
            KEYS: [1] TRACKER  [2] HIERARCHY  [3] TASK_AUDIT
          </div>
          <div>LOC: 127.0.0.1 // DEV_ENV: METRICS_LOG_ENGINE</div>
          <div className="animate-pulse font-bold text-white">_ CMD: READY</div>
        </footer>
      </div>
    </div>
  );
}
