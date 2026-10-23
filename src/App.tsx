import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { TrackerView } from './components/TrackerView';
import { HierarchicalMetricsView } from './components/HierarchicalMetricsView';
import { TaskTimeAuditView } from './components/TaskTimeAuditView';
import { BackupManagerModal } from './components/BackupManagerModal';
import { SystemWalkthroughModal } from './components/SystemWalkthroughModal';
import { RoutineTemplatesModal } from './components/RoutineTemplatesModal';
import { SyncChoiceModal } from './components/SyncChoiceModal';
import { BulkIngestModal } from './components/BulkIngestModal';
import { SettingsModal } from './components/SettingsModal';
import { CategoryManagerModal } from './components/CategoryManagerModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { RoutineTemplate } from './data/scheduleTemplates';
import { getDayKeyFromDate } from './utils/ascii';
import {
  loadSchedules,
  saveSchedules,
  loadHierarchyHistory,
  saveHierarchyHistory,
  purgeAllDataAndStartClean,
} from './data/historyStore';
import {
  checkAndRunNightlyAutoBackup,
  createSnapshot,
  saveSnapshotToList,
  parseAndValidateBackupJson,
  restoreAllCompletedMap,
  SystemSnapshot,
} from './data/backupStore';
import {
  getVaultScriptUrl,
  saveToDriveVault,
  loadFromDriveVault,
  getOrCreateSyncCode,
  setStoredSyncCode,
  getLocalLastModified,
  setLocalLastModified,
  setVaultLastSync,
  getVaultLastSync,
} from './services/driveVaultService';
import { getCustomShortcuts, isMatchingKey } from './data/shortcutStore';
import { ActiveTab, DaySchedule, MonthLogRecord } from './types';

export default function App() {
  const [activeView, setActiveView] = useState<ActiveTab>('tracker');
  const [selectedDay, setSelectedDay] = useState<string>(() => getDayKeyFromDate());
  const [isBackupOpen, setIsBackupOpen] = useState<boolean>(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState<boolean>(false);
  const [isBulkIngestOpen, setIsBulkIngestOpen] = useState<boolean>(false);
  const [isSyncChoiceOpen, setIsSyncChoiceOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState<boolean>(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);
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
    setLocalLastModified();
  };

  const handleRefreshHistory = () => {
    setHistory(loadHierarchyHistory());
  };

  const handlePurgeAndStartClean = () => {
    const { cleanSchedules, cleanHistory } = purgeAllDataAndStartClean();
    setSchedules(cleanSchedules);
    setHistory(cleanHistory);
    setLocalLastModified();
    setSyncToast('[CLEAN SLATE]: All placeholder data purged. System reset to zero baseline.');
    setTimeout(() => setSyncToast(null), 5000);
  };

  const handleApplyTemplate = (template: RoutineTemplate) => {
    const newSchedules = template.getSchedules();
    setSchedules(newSchedules);
    saveSchedules(newSchedules);
    setLocalLastModified();
    setSyncToast(`[TEMPLATE APPLIED]: "${template.name}" active (${template.badge}).`);
    setTimeout(() => setSyncToast(null), 5000);
  };

  const handleRestoreSystem = (
    newSchedules: Record<string, DaySchedule>,
    newHistory: MonthLogRecord[],
    restoredIso?: string
  ) => {
    setSchedules(newSchedules);
    saveSchedules(newSchedules);
    setHistory(newHistory);
    saveHierarchyHistory(newHistory);
    if (restoredIso) {
      setLocalLastModified(restoredIso);
    }
  };

  // Two-Option Google Drive Sync: User directly chooses Fetch (Pull) or Upload (Push)
  const handleFetchFromCloud = async () => {
    const webhookUrl = getVaultScriptUrl();
    if (!webhookUrl) {
      setIsSyncChoiceOpen(true);
      setSyncToast('[DRIVE SETUP REQUIRED] Please paste your Google Apps Script Webhook URL.');
      setTimeout(() => setSyncToast(null), 5000);
      return;
    }

    setIsQuickSyncing(true);
    setSyncToast(`[FETCHING FROM CLOUD...] Downloading Code: ${syncCode}`);
    try {
      const remoteData = await loadFromDriveVault(syncCode);
      const rawJson = typeof remoteData === 'string' ? remoteData : JSON.stringify(remoteData);
      const cloudSnapshot = parseAndValidateBackupJson(rawJson);

      // Create safety snapshot in local archive before pulling
      const safetySnap = createSnapshot(schedules, history, 'manual');
      saveSnapshotToList(safetySnap);

      // Apply cloud snapshot
      if (cloudSnapshot.completedMap) {
        restoreAllCompletedMap(cloudSnapshot.completedMap);
      }
      handleRestoreSystem(cloudSnapshot.schedules, cloudSnapshot.history || [], cloudSnapshot.createdAt);
      setStoredSyncCode(syncCode);
      setVaultLastSync(cloudSnapshot.createdAt);

      const timeStr =
        cloudSnapshot.displayDate ||
        new Date(cloudSnapshot.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setSyncToast(`[✓ FETCHED FROM CLOUD]: Updated to ${timeStr} version!`);
      setTimeout(() => setSyncToast(null), 5000);
    } catch (err: unknown) {
      console.error('Fetch error:', err);
      const msg = err instanceof Error ? err.message : 'Fetch from Google Drive failed.';
      setSyncToast(`FETCH FAILED: ${msg}`);
      setTimeout(() => setSyncToast(null), 6000);
      throw err;
    } finally {
      setIsQuickSyncing(false);
    }
  };

  const handleUploadToCloud = async () => {
    const webhookUrl = getVaultScriptUrl();
    if (!webhookUrl) {
      setIsSyncChoiceOpen(true);
      setSyncToast('[DRIVE SETUP REQUIRED] Please paste your Google Apps Script Webhook URL.');
      setTimeout(() => setSyncToast(null), 5000);
      return;
    }

    setIsQuickSyncing(true);
    setSyncToast(`[UPLOADING TO CLOUD...] Saving to Code: ${syncCode}`);
    try {
      const currentSnap = createSnapshot(schedules, history, 'manual');
      const result = await saveToDriveVault(currentSnap, syncCode);
      saveSnapshotToList(currentSnap);
      setLocalLastModified(result.updatedAt || currentSnap.createdAt);
      setVaultLastSync(result.updatedAt || currentSnap.createdAt);
      setSyncCode(result.code);
      setStoredSyncCode(result.code);

      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setSyncToast(`[✓ UPLOADED TO CLOUD: ${timeStr}]: Saved under Code ${result.code}!`);
      setTimeout(() => setSyncToast(null), 5000);
    } catch (err: unknown) {
      console.error('Upload error:', err);
      const msg = err instanceof Error ? err.message : 'Upload to Google Drive failed.';
      setSyncToast(`UPLOAD FAILED: ${msg}`);
      setTimeout(() => setSyncToast(null), 6000);
      throw err;
    } finally {
      setIsQuickSyncing(false);
    }
  };

  const handleSetSyncCode = (newCode: string) => {
    setSyncCode(newCode);
    setStoredSyncCode(newCode);
  };

  const isAnyModalOpen =
    isSettingsOpen ||
    isSyncChoiceOpen ||
    isShortcutsOpen ||
    isBulkIngestOpen ||
    isTemplatesOpen ||
    isBackupOpen ||
    isCategoryManagerOpen ||
    isTutorialOpen;

  // Keyboard shortcut listener for terminal-style navigation and global actions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid intercepting when user is typing inside an input or textarea
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        if (e.key === 'Escape') {
          target.blur();
        }
        return;
      }

      const shortcuts = getCustomShortcuts();

      // If Settings is open: only ESC or open_settings key closes it
      if (isSettingsOpen) {
        if (isMatchingKey(e.key, shortcuts.open_settings) || e.key === 'Escape') {
          e.preventDefault();
          setIsSettingsOpen(false);
        }
        return;
      }

      // If Sync Choice is open: only ESC or open_sync key closes it
      if (isSyncChoiceOpen) {
        if (isMatchingKey(e.key, shortcuts.open_sync) || e.key === 'Escape') {
          e.preventDefault();
          setIsSyncChoiceOpen(false);
        }
        return;
      }

      // If Cheatsheet is open: only ESC or open_shortcuts key closes it
      if (isShortcutsOpen) {
        if (isMatchingKey(e.key, shortcuts.open_shortcuts) || e.key === '?' || e.key === 'Escape') {
          e.preventDefault();
          setIsShortcutsOpen(false);
        }
        return;
      }

      // If any other modal is open: only ESC closes it
      if (isBulkIngestOpen || isTemplatesOpen || isBackupOpen || isCategoryManagerOpen || isTutorialOpen) {
        if (e.key === 'Escape') {
          setIsBulkIngestOpen(false);
          setIsTemplatesOpen(false);
          setIsBackupOpen(false);
          setIsCategoryManagerOpen(false);
          setIsTutorialOpen(false);
        }
        return;
      }

      // --- When NO modal is open ---
      // Cheat sheet overlay toggle
      if (isMatchingKey(e.key, shortcuts.open_shortcuts) || e.key === '?') {
        e.preventDefault();
        setIsShortcutsOpen(true);
        return;
      }

      // Navigation: Tracker, Hierarchy, Audit
      if (isMatchingKey(e.key, shortcuts.nav_tracker)) setActiveView('tracker');
      if (isMatchingKey(e.key, shortcuts.nav_hierarchy)) setActiveView('hierarchy');
      if (isMatchingKey(e.key, shortcuts.nav_audit)) setActiveView('task_audit');

      // Jump to Today
      if (isMatchingKey(e.key, shortcuts.jump_today)) {
        const todayKey = getDayKeyFromDate();
        setSelectedDay(todayKey);
        setSyncToast(`[JUMP TO TODAY]: Switched to ${todayKey.toUpperCase()}`);
        setTimeout(() => setSyncToast(null), 3000);
      }

      // Previous Day
      if (isMatchingKey(e.key, shortcuts.prev_day)) {
        const DAYS_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
        const currentIdx = DAYS_ORDER.indexOf(selectedDay);
        const prevIdx = (currentIdx - 1 + 7) % 7;
        const newDay = DAYS_ORDER[prevIdx];
        setSelectedDay(newDay);
      }

      // Next Day
      if (isMatchingKey(e.key, shortcuts.next_day)) {
        const DAYS_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
        const currentIdx = DAYS_ORDER.indexOf(selectedDay);
        const nextIdx = (currentIdx + 1) % 7;
        const newDay = DAYS_ORDER[nextIdx];
        setSelectedDay(newDay);
      }

      // Open Settings Console
      if (isMatchingKey(e.key, shortcuts.open_settings)) {
        e.preventDefault();
        setIsSettingsOpen(true);
      }

      // Bulk Ingest
      if (isMatchingKey(e.key, shortcuts.bulk_ingest)) {
        e.preventDefault();
        setIsBulkIngestOpen(true);
      }

      // Open Cloud Sync Menu
      if (isMatchingKey(e.key, shortcuts.open_sync)) {
        e.preventDefault();
        setIsSyncChoiceOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedDay,
    isSettingsOpen,
    isBulkIngestOpen,
    isShortcutsOpen,
    isSyncChoiceOpen,
    isTemplatesOpen,
    isBackupOpen,
    isCategoryManagerOpen,
    isTutorialOpen,
  ]);

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
          onOpenBulkIngest={() => setIsBulkIngestOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenShortcuts={() => setIsShortcutsOpen(true)}
          onQuickDriveSync={() => setIsSyncChoiceOpen(true)}
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
              onOpenBulkIngest={() => setIsBulkIngestOpen(true)}
              isAnyModalOpen={isAnyModalOpen}
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
              onRefresh={handleRefreshHistory}
              onUpdateSchedules={handleUpdateSchedules}
            />
          )}
        </main>

        {/* Bulk Ingest Modal */}
        <BulkIngestModal
          isOpen={isBulkIngestOpen}
          onClose={() => setIsBulkIngestOpen(false)}
          selectedDay={selectedDay}
          schedules={schedules}
          onUpdateSchedules={handleUpdateSchedules}
          onRefreshHistory={handleRefreshHistory}
        />

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

        {/* Two-Option Google Drive Sync Dispatch Modal */}
        <SyncChoiceModal
          isOpen={isSyncChoiceOpen}
          onClose={() => setIsSyncChoiceOpen(false)}
          syncCode={syncCode}
          onSetSyncCode={handleSetSyncCode}
          onFetchFromCloud={handleFetchFromCloud}
          onUploadToCloud={handleUploadToCloud}
          isBusy={isQuickSyncing}
          lastSyncTime={getVaultLastSync()}
        />

        {/* Centered Tabbed System Settings Console */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          schedules={schedules}
          history={history}
          onApplyTemplate={handleApplyTemplate}
          onRestoreSystem={handleRestoreSystem}
          onPurgeAndStartClean={handlePurgeAndStartClean}
          onRefreshHistory={handleRefreshHistory}
          onOpenTutorial={() => {
            setIsSettingsOpen(false);
            setIsTutorialOpen(true);
          }}
        />

        {/* Global Category Manager Modal */}
        <CategoryManagerModal
          isOpen={isCategoryManagerOpen}
          onClose={() => setIsCategoryManagerOpen(false)}
        />

        {/* Keyboard Shortcuts Cheat Sheet Overlay Modal */}
        <KeyboardShortcutsModal
          isOpen={isShortcutsOpen}
          onClose={() => setIsShortcutsOpen(false)}
        />

        {/* Editorial Aesthetic Footer */}
        <footer className="mt-8 pt-4 border-t border-white flex flex-col md:flex-row justify-between items-start md:items-end text-[10px] tracking-widest opacity-80 gap-2">
          <div>USER: CS_3RD_YEAR_STUDENT // ROOT_ACCESS_GRANTED</div>
          <button
            type="button"
            onClick={() => setIsShortcutsOpen(true)}
            className="hover:underline cursor-pointer text-left text-white/90"
            title="Click to view all keyboard shortcuts (Hotkey: K)"
          >
            HOTKEYS: [1] TRACKER  [2] HIERARCHY  [3] TASK_AUDIT  [K] CHEAT_SHEET
          </button>
          <div>LOC: 127.0.0.1 // DEV_ENV: METRICS_LOG_ENGINE</div>
          <div className="animate-pulse font-bold text-white">_ CMD: READY</div>
        </footer>
      </div>
    </div>
  );
}
