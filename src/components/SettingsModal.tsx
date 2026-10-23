import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { DaySchedule, MonthLogRecord } from '../types';
import {
  BUILT_IN_TEMPLATES,
  getCustomTemplates,
  saveCustomTemplate,
  deleteCustomTemplate,
  RoutineTemplate,
} from '../data/scheduleTemplates';
import {
  CategoryDefinition,
  getCategories,
  addCategory,
  removeCategory,
} from '../data/categoryStore';
import {
  SystemSnapshot,
  getSavedSnapshots,
  saveSnapshotToList,
  createSnapshot,
  downloadSnapshotAsJsonFile,
  parseAndValidateBackupJson,
  restoreAllCompletedMap,
  deleteSnapshotById,
  clearManualSnapshots,
} from '../data/backupStore';
import {
  getVaultScriptUrl,
  setVaultScriptUrl,
  isVaultConfigured,
  getOrCreateSyncCode,
  setStoredSyncCode,
  generateSyncCode,
  getVaultLastSync,
  setVaultLastSync,
  saveToDriveVault,
  loadFromDriveVault,
  setLocalLastModified,
} from '../services/driveVaultService';
import {
  getCustomSoundsConfig,
  saveCustomSoundsConfig,
  testCustomSound,
  CustomSoundsConfig,
} from '../data/soundStore';
import {
  getCustomShortcuts,
  saveCustomShortcuts,
  resetCustomShortcuts,
  DEFAULT_SHORTCUT_ACTIONS,
  DEFAULT_SHORTCUTS,
  formatKeyDisplay,
  ShortcutConfig,
} from '../data/shortcutStore';

export type SettingsTab = 'templates' | 'sounds' | 'archive' | 'categories' | 'cloud' | 'system';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedules: Record<string, DaySchedule>;
  history: MonthLogRecord[];
  onApplyTemplate: (template: RoutineTemplate) => void;
  onRestoreSystem: (
    newSchedules: Record<string, DaySchedule>,
    newHistory: MonthLogRecord[],
    restoredIso?: string
  ) => void;
  onPurgeAndStartClean: () => void;
  onRefreshHistory: () => void;
  onOpenTutorial: () => void;
  initialTab?: SettingsTab;
}

export function SettingsModal({
  isOpen,
  onClose,
  schedules,
  history,
  onApplyTemplate,
  onRestoreSystem,
  onPurgeAndStartClean,
  onRefreshHistory,
  onOpenTutorial,
  initialTab = 'templates',
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [toast, setToast] = useState<string | null>(null);

  // --- Templates State ---
  const [customTemplates, setCustomTemplates] = useState<RoutineTemplate[]>(() =>
    getCustomTemplates()
  );
  const [isSavingCustomTemplate, setIsSavingCustomTemplate] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [confirmApplyId, setConfirmApplyId] = useState<string | null>(null);

  // --- Archive State ---
  const [snapshots, setSnapshots] = useState<SystemSnapshot[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // --- Categories State ---
  const [categories, setCategories] = useState<CategoryDefinition[]>([]);
  const [newCatLabel, setNewCatLabel] = useState('');
  const [catError, setCatError] = useState<string | null>(null);

  // --- Cloud Sync State ---
  const [syncCode, setSyncCode] = useState<string>(() => getOrCreateSyncCode());
  const [isEditingCode, setIsEditingCode] = useState(false);
  const [codeInput, setCodeInput] = useState<string>(syncCode);
  const [vaultUrl, setVaultUrl] = useState<string>(() => getVaultScriptUrl());
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [urlInput, setUrlInput] = useState<string>(() => getVaultScriptUrl());
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [lastSyncStr, setLastSyncStr] = useState<string>('NEVER');

  // --- Custom Sounds State ---
  const [soundsConfig, setSoundsConfig] = useState<CustomSoundsConfig>(() =>
    getCustomSoundsConfig()
  );

  const handleSoundFileUpload = (
    type: 'task' | 'pomodoro' | 'break',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      showToast('[AUDIO ERROR]: File too large (>8MB). Please choose a shorter sound clip.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const updated = { ...soundsConfig };
      if (type === 'task') updated.taskCompleteAudioUrl = dataUrl;
      if (type === 'pomodoro') updated.pomodoroCompleteAudioUrl = dataUrl;
      if (type === 'break') updated.breakCompleteAudioUrl = dataUrl;

      setSoundsConfig(updated);
      saveCustomSoundsConfig(updated);
      showToast(`[CUSTOM AUDIO LOADED]: Audio saved for ${type.toUpperCase()}`);
    };
    reader.readAsDataURL(file);
  };

  const handleSoundUrlSave = (type: 'task' | 'pomodoro' | 'break', url: string) => {
    const updated = { ...soundsConfig };
    if (type === 'task') updated.taskCompleteAudioUrl = url;
    if (type === 'pomodoro') updated.pomodoroCompleteAudioUrl = url;
    if (type === 'break') updated.breakCompleteAudioUrl = url;

    setSoundsConfig(updated);
    saveCustomSoundsConfig(updated);
  };

  const handleResetSound = (type: 'task' | 'pomodoro' | 'break') => {
    const updated = { ...soundsConfig };
    if (type === 'task') delete updated.taskCompleteAudioUrl;
    if (type === 'pomodoro') delete updated.pomodoroCompleteAudioUrl;
    if (type === 'break') delete updated.breakCompleteAudioUrl;

    setSoundsConfig(updated);
    saveCustomSoundsConfig(updated);
    showToast(`[AUDIO RESET]: Restored synthesized chime for ${type.toUpperCase()}`);
  };

  // Trigger toast banner inside modal
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  // --- Custom Shortcuts State ---
  const [shortcutsConfig, setShortcutsConfig] = useState<ShortcutConfig>(() =>
    getCustomShortcuts()
  );
  const [editingShortcutId, setEditingShortcutId] = useState<keyof ShortcutConfig | null>(null);

  const handleResetAllShortcuts = () => {
    const defaultCfg = resetCustomShortcuts();
    setShortcutsConfig(defaultCfg);
    setEditingShortcutId(null);
    showToast('[SHORTCUTS RESET]: All hotkeys restored to standard defaults.');
  };

  const handleResetSingleShortcut = (id: keyof ShortcutConfig) => {
    const updated = saveCustomShortcuts({ [id]: DEFAULT_SHORTCUTS[id] });
    setShortcutsConfig(updated);
    showToast(`[HOTKEY RESTORED]: "${id}" set to default ${formatKeyDisplay(DEFAULT_SHORTCUTS[id])}`);
  };

  // Synchronize state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCategories(getCategories());
      setSnapshots(getSavedSnapshots());
      setCustomTemplates(getCustomTemplates());
      setSoundsConfig(getCustomSoundsConfig());
      setShortcutsConfig(getCustomShortcuts());
      setEditingShortcutId(null);
      const currentCode = getOrCreateSyncCode();
      setSyncCode(currentCode);
      setCodeInput(currentCode);
      const url = getVaultScriptUrl();
      setVaultUrl(url);
      setUrlInput(url);
      setIsEditingUrl(!url);
      const syncTime = getVaultLastSync();
      setLastSyncStr(syncTime ? new Date(syncTime).toLocaleString() : 'NEVER');
      if (initialTab) setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Global keydown: ESC or S/s to close, 1-6 to switch tabs (if not typing in input)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Rebind Mode: Capture keypress for the active editing shortcut
      if (editingShortcutId) {
        e.preventDefault();
        e.stopPropagation();
        if (e.key === 'Escape') {
          setEditingShortcutId(null);
          showToast('[REBIND CANCELLED]');
          return;
        }
        const keyToSet = e.key === ' ' ? ' ' : e.key.length === 1 ? e.key.toLowerCase() : e.key;
        const updated = saveCustomShortcuts({ [editingShortcutId]: keyToSet });
        setShortcutsConfig(updated);
        setEditingShortcutId(null);
        showToast(`[HOTKEY SAVED]: Rebound to ${formatKeyDisplay(keyToSet)}`);
        return;
      }

      const target = e.target as HTMLElement | null;
      const isInput = target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);

      if (e.key === 'Escape') {
        if (isInput) {
          target?.blur();
        }
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      const openSettingsKey = shortcutsConfig.open_settings || 's';
      if (e.key.toLowerCase() === openSettingsKey.toLowerCase()) {
        if (!isInput) {
          e.preventDefault();
          e.stopPropagation();
          onClose();
          return;
        }
      }

      if (isInput) {
        return;
      }

      if (e.key === '1') setActiveTab('templates');
      if (e.key === '2') setActiveTab('sounds');
      if (e.key === '3') setActiveTab('archive');
      if (e.key === '4') setActiveTab('categories');
      if (e.key === '5') setActiveTab('cloud');
      if (e.key === '6') setActiveTab('system');

      e.stopPropagation();
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose, shortcutsConfig, editingShortcutId]);

  if (!isOpen) return null;

  // --- Handlers: Templates ---
  const handleSaveCurrentSchedule = () => {
    if (!customName.trim()) return;
    try {
      const updated = saveCustomTemplate(customName.trim(), customDesc.trim(), schedules);
      setCustomTemplates(updated);
      setCustomName('');
      setCustomDesc('');
      setIsSavingCustomTemplate(false);
      showToast('[SUCCESS]: Routine saved as custom template!');
    } catch {
      showToast('[ERROR]: Failed to save custom template.');
    }
  };

  const handleDeleteCustomTemplate = (id: string) => {
    if (window.confirm('Delete this custom routine preset?')) {
      const updated = deleteCustomTemplate(id);
      setCustomTemplates(updated);
      showToast('[REMOVED]: Custom template deleted.');
    }
  };

  const handleApply = (tpl: RoutineTemplate) => {
    onApplyTemplate(tpl);
    setConfirmApplyId(null);
    showToast(`[APPLIED]: Loaded "${tpl.name}".`);
  };

  // --- Handlers: Archive ---
  const handleCreateSnapshot = () => {
    try {
      const snap = createSnapshot(schedules, history, 'manual');
      saveSnapshotToList(snap);
      setSnapshots(getSavedSnapshots());
      showToast('[SNAPSHOT SAVED]: Point-in-time state recorded.');
    } catch {
      showToast('[ERROR]: Failed to create snapshot.');
    }
  };

  const handleRestoreSnapshot = (snap: SystemSnapshot) => {
    const snapLabel = snap.displayDate || new Date(snap.createdAt).toLocaleString();
    if (
      window.confirm(
        `RESTORE SNAPSHOT "${snapLabel}"?\nCreated: ${new Date(snap.createdAt).toLocaleString()}\n\nThis will replace the current active schedule and history.`
      )
    ) {
      if (snap.completedMap) {
        restoreAllCompletedMap(snap.completedMap);
      }
      onRestoreSystem(snap.schedules, snap.history || [], snap.createdAt);
      showToast(`[RESTORED]: System restored to "${snapLabel}".`);
    }
  };

  const handleDeleteSnapshot = (id: string) => {
    deleteSnapshotById(id);
    setSnapshots(getSavedSnapshots());
    showToast('[DELETED]: Snapshot removed from vault.');
  };

  const handleClearAllManualSnapshots = () => {
    if (window.confirm('Clear all manual snapshots? Automated nightly snapshots will be retained.')) {
      clearManualSnapshots();
      setSnapshots(getSavedSnapshots());
      showToast('[CLEARED]: Manual snapshots deleted.');
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseAndValidateBackupJson(text);
        saveSnapshotToList(parsed);
        if (parsed.completedMap) {
          restoreAllCompletedMap(parsed.completedMap);
        }
        onRestoreSystem(parsed.schedules, parsed.history || [], parsed.createdAt);
        setSnapshots(getSavedSnapshots());
        showToast(`[IMPORTED]: Successfully restored backup from file "${file.name}".`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Invalid JSON file.';
        showToast(`[IMPORT FAILED]: ${msg}`);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- Handlers: Categories ---
  const handleAddCategory = () => {
    setCatError(null);
    if (!newCatLabel.trim()) return;
    try {
      addCategory(newCatLabel.trim());
      setCategories(getCategories());
      setNewCatLabel('');
      showToast(`[CATEGORY ADDED]: "${newCatLabel.trim()}"`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add category.';
      setCatError(msg);
    }
  };

  const handleRemoveCategory = (cat: CategoryDefinition) => {
    if (
      window.confirm(
        `DELETE CATEGORY "${cat.label}"?\n\nTasks previously marked with this category will retain their text tag in logs.`
      )
    ) {
      const updated = removeCategory(cat.id);
      setCategories(updated);
      showToast(`[DELETED]: Removed category "${cat.label}".`);
    }
  };

  // --- Handlers: Cloud Sync ---
  const handleSaveCustomCode = () => {
    const clean = codeInput.trim().toUpperCase();
    if (clean) {
      setSyncCode(clean);
      setStoredSyncCode(clean);
      setIsEditingCode(false);
      showToast(`[SYNC CODE UPDATED]: ${clean}`);
    }
  };

  const handleGenerateNewCode = () => {
    const fresh = generateSyncCode();
    setSyncCode(fresh);
    setCodeInput(fresh);
    setStoredSyncCode(fresh);
    showToast(`[NEW SYNC CODE GENERATED]: ${fresh}`);
  };

  const handleSaveVaultUrl = () => {
    const clean = urlInput.trim();
    if (!clean) {
      showToast('[ERROR]: Please provide a valid Webhook URL.');
      return;
    }
    setVaultScriptUrl(clean);
    setVaultUrl(clean);
    setIsEditingUrl(false);
    showToast('[SAVED]: Google Drive Webhook URL updated.');
  };

  const handleFetchFromDrive = async () => {
    if (!vaultUrl) {
      setIsEditingUrl(true);
      showToast('[WEBHOOK REQUIRED]: Paste your Google Apps Script Webhook URL.');
      return;
    }

    setIsCloudSyncing(true);
    showToast(`[FETCHING FROM CLOUD]: Requesting vault for code ${syncCode}...`);
    try {
      const remoteData = await loadFromDriveVault(syncCode);
      const rawJson = typeof remoteData === 'string' ? remoteData : JSON.stringify(remoteData);
      const cloudSnapshot = parseAndValidateBackupJson(rawJson);

      // Local safety snapshot
      const safetySnap = createSnapshot(schedules, history, 'manual');
      saveSnapshotToList(safetySnap);

      if (cloudSnapshot.completedMap) {
        restoreAllCompletedMap(cloudSnapshot.completedMap);
      }
      onRestoreSystem(cloudSnapshot.schedules, cloudSnapshot.history || [], cloudSnapshot.createdAt);
      setStoredSyncCode(syncCode);
      setVaultLastSync(cloudSnapshot.createdAt);
      setLastSyncStr(new Date(cloudSnapshot.createdAt).toLocaleString());
      setSnapshots(getSavedSnapshots());
      showToast(`[✓ CLOUD FETCH SUCCESS]: Routine updated to latest cloud version.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fetch failed.';
      showToast(`[FETCH FAILED]: ${msg}`);
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const handleUploadToDrive = async () => {
    if (!vaultUrl) {
      setIsEditingUrl(true);
      showToast('[WEBHOOK REQUIRED]: Paste your Google Apps Script Webhook URL.');
      return;
    }

    setIsCloudSyncing(true);
    showToast(`[UPLOADING TO CLOUD]: Saving routine to Code ${syncCode}...`);
    try {
      const currentSnap = createSnapshot(schedules, history, 'manual');
      const result = await saveToDriveVault(currentSnap, syncCode);
      saveSnapshotToList(currentSnap);
      setLocalLastModified(result.updatedAt || currentSnap.createdAt);
      setVaultLastSync(result.updatedAt || currentSnap.createdAt);
      setSyncCode(result.code);
      setStoredSyncCode(result.code);
      setLastSyncStr(new Date().toLocaleString());
      setSnapshots(getSavedSnapshots());
      showToast(`[✓ CLOUD UPLOAD SUCCESS]: Uploaded under Code ${result.code}!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed.';
      showToast(`[UPLOAD FAILED]: ${msg}`);
    } finally {
      setIsCloudSyncing(false);
    }
  };

  // --- Handlers: System ---
  const handlePurge = () => {
    if (
      window.confirm(
        'CRITICAL WARNING: PURGE ALL DATA & START CLEAN?\n\nThis will reset your schedule to zero baseline (0 tasks) and clear all logged history.\n\nType OK to proceed.'
      )
    ) {
      onPurgeAndStartClean();
      onClose();
    }
  };

  // Calculate current task count
  let totalCurrentTasks = 0;
  for (const s of Object.values(schedules)) {
    totalCurrentTasks += s.tasks.length;
  }

  const modalNode = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="System Settings Console"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 font-mono text-white bg-black/85 backdrop-blur-xs select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl h-[92vh] max-h-[820px] bg-black border-2 border-white flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* --- Top Console Header --- */}
        <div className="bg-white text-black px-4 py-2 flex items-center justify-between font-bold text-xs uppercase shrink-0 border-b border-black">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 bg-black" />
            <span className="tracking-wider">_SYSTEM_SETTINGS_CONSOLE</span>
            <span className="text-[10px] opacity-70 font-normal hidden sm:inline">
              // ACTIVE: [{activeTab.toUpperCase()}]
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] opacity-70 hidden md:inline">[KEYS: 1-5 TABS, ESC CLOSE]</span>
            <button
              type="button"
              onClick={onClose}
              className="text-black hover:bg-black hover:text-white px-2 py-0.5 border border-black text-xs font-black transition-none cursor-pointer uppercase"
              title="Close Settings (Esc)"
            >
              [X CLOSE]
            </button>
          </div>
        </div>

        {/* --- Tab Navigation Bar --- */}
        <div className="flex border-b-2 border-white bg-black shrink-0 overflow-x-auto text-xs font-bold uppercase divide-x divide-white/40">
          <button
            type="button"
            onClick={() => setActiveTab('templates')}
            className={`px-3.5 py-2.5 flex items-center gap-2 transition-none cursor-pointer whitespace-nowrap ${
              activeTab === 'templates'
                ? 'bg-white text-black font-black'
                : 'text-white/80 hover:bg-white/10 hover:text-white'
            }`}
          >
            <span>[1] TEMPLATES</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sounds')}
            className={`px-3.5 py-2.5 flex items-center gap-2 transition-none cursor-pointer whitespace-nowrap ${
              activeTab === 'sounds'
                ? 'bg-white text-black font-black'
                : 'text-white/80 hover:bg-white/10 hover:text-white'
            }`}
          >
            <span>[2] SOUNDS</span>
            {(soundsConfig.taskCompleteAudioUrl || soundsConfig.pomodoroCompleteAudioUrl || soundsConfig.breakCompleteAudioUrl) && (
              <span className="text-[9px] px-1 bg-white/20 font-mono">CUSTOM</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('archive')}
            className={`px-3.5 py-2.5 flex items-center gap-2 transition-none cursor-pointer whitespace-nowrap ${
              activeTab === 'archive'
                ? 'bg-white text-black font-black'
                : 'text-white/80 hover:bg-white/10 hover:text-white'
            }`}
          >
            <span>[3] ARCHIVE</span>
            <span className="text-[10px] px-1 bg-white/20 text-white font-mono">
              {snapshots.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            className={`px-3.5 py-2.5 flex items-center gap-2 transition-none cursor-pointer whitespace-nowrap ${
              activeTab === 'categories'
                ? 'bg-white text-black font-black'
                : 'text-white/80 hover:bg-white/10 hover:text-white'
            }`}
          >
            <span>[4] CATEGORIES</span>
            <span className="text-[10px] px-1 bg-white/20 text-white font-mono">
              {categories.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cloud')}
            className={`px-3.5 py-2.5 flex items-center gap-2 transition-none cursor-pointer whitespace-nowrap ${
              activeTab === 'cloud'
                ? 'bg-white text-black font-black'
                : 'text-white/80 hover:bg-white/10 hover:text-white'
            }`}
          >
            <span>[5] CLOUD SYNC</span>
            <span
              className={`text-[9px] px-1 font-mono ${
                isVaultConfigured() ? 'bg-white text-black' : 'border border-white/50 text-white/60'
              }`}
            >
              {isVaultConfigured() ? 'READY' : 'SETUP'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('system')}
            className={`px-3.5 py-2.5 flex items-center gap-2 transition-none cursor-pointer whitespace-nowrap ${
              activeTab === 'system'
                ? 'bg-white text-black font-black'
                : 'text-white/80 hover:bg-white/10 hover:text-white'
            }`}
          >
            <span>[6] SYSTEM</span>
          </button>
        </div>

        {/* --- Notification Banner --- */}
        {toast && (
          <div className="bg-white text-black px-4 py-1.5 text-xs font-bold border-b border-black flex items-center justify-between shrink-0 animate-pulse">
            <span>{toast}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-[10px] font-black underline uppercase cursor-pointer"
            >
              [DISMISS]
            </button>
          </div>
        )}

        {/* --- Tab Content Area --- */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-5 md:p-6 space-y-6">
          {/* ===================== TAB 1: TEMPLATES ===================== */}
          {activeTab === 'templates' && (
            <div className="space-y-6">
              <div className="border border-white/30 p-3 bg-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3 overflow-hidden">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                    ROUTINE TEMPLATES &amp; SLATE PRESETS
                  </h3>
                  <p className="text-xs text-white/70 mt-0.5 break-words">
                    Select a built-in schedule preset or save your current customized day routines into a reusable template.
                  </p>
                </div>
                <div className="text-xs font-mono text-white/80 shrink-0">
                  CURRENT LOAD: <span className="text-white font-bold">{totalCurrentTasks} TASKS</span>
                </div>
              </div>

              {/* Save Current Schedule as Template Accordion */}
              <div className="border border-white/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider">
                    + CREATE TEMPLATE FROM CURRENT ROUTINE
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsSavingCustomTemplate(!isSavingCustomTemplate)}
                    className="border border-white/60 px-2 py-0.5 text-xs font-bold uppercase hover:bg-white hover:text-black transition-none cursor-pointer"
                  >
                    {isSavingCustomTemplate ? '[CANCEL]' : '[+ CAPTURE CURRENT SCHEDULE]'}
                  </button>
                </div>

                {isSavingCustomTemplate && (
                  <div className="pt-3 border-t border-white/20 space-y-3">
                    <p className="text-[11px] text-white/70">
                      Saves your current Monday-Sunday schedule (all {totalCurrentTasks} tasks and categories) as a named preset.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] opacity-70 uppercase block mb-1">
                          TEMPLATE NAME:
                        </label>
                        <input
                          type="text"
                          value={customName}
                          onChange={(e) => setCustomName(e.target.value)}
                          placeholder="e.g. Exam Cram Sprint, Summer Routine"
                          className="w-full bg-black border border-white/50 px-3 py-1.5 text-xs text-white focus:border-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] opacity-70 uppercase block mb-1">
                          DESCRIPTION (OPTIONAL):
                        </label>
                        <input
                          type="text"
                          value={customDesc}
                          onChange={(e) => setCustomDesc(e.target.value)}
                          placeholder="e.g. Heavy DSA + systems focus with evening workouts"
                          className="w-full bg-black border border-white/50 px-3 py-1.5 text-xs text-white focus:border-white focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={handleSaveCurrentSchedule}
                        disabled={!customName.trim()}
                        className="border border-white bg-white text-black px-4 py-1.5 text-xs font-bold uppercase hover:bg-white/80 disabled:opacity-40 cursor-pointer transition-none"
                      >
                        [SAVE TO CUSTOM PRESETS]
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Custom Templates Ledger */}
              {customTemplates.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-white/30 pb-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-white">
                      CUSTOM USER PRESETS ({customTemplates.length})
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {customTemplates.map((tpl) => (
                      <div
                        key={tpl.id}
                        className="border border-white/40 p-3 bg-white/5 flex flex-col justify-between space-y-3"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-bold uppercase text-white">
                              {tpl.name}
                            </span>
                            <span className="text-[9px] border border-white/40 px-1 py-0.5 uppercase">
                              {tpl.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-white/70 mt-1 line-clamp-2">
                            {tpl.description}
                          </p>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-white/20">
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomTemplate(tpl.id)}
                            className="text-[10px] text-red-400 hover:text-red-300 uppercase underline cursor-pointer"
                          >
                            [DELETE]
                          </button>
                          {confirmApplyId === tpl.id ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-yellow-300 uppercase">OVERWRITE?</span>
                              <button
                                type="button"
                                onClick={() => handleApply(tpl)}
                                className="border border-white bg-white text-black px-2 py-0.5 text-[10px] font-bold uppercase cursor-pointer"
                              >
                                [CONFIRM]
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmApplyId(null)}
                                className="text-[10px] opacity-70 underline uppercase cursor-pointer"
                              >
                                [NO]
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmApplyId(tpl.id)}
                              className="border border-white bg-black hover:bg-white hover:text-black px-3 py-1 text-xs font-bold uppercase transition-none cursor-pointer"
                            >
                              [APPLY PRESET]
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Built-in Templates Ledger */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-white/30 pb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-white">
                    BUILT-IN SYSTEM TEMPLATES ({BUILT_IN_TEMPLATES.length})
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {BUILT_IN_TEMPLATES.map((tpl) => (
                    <div
                      key={tpl.id}
                      className="border border-white/40 p-3 bg-white/5 flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-bold uppercase text-white">
                            {tpl.name}
                          </span>
                          <span className="text-[9px] border border-white/40 px-1 py-0.5 uppercase">
                            {tpl.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-white/70 mt-1">
                          {tpl.description}
                        </p>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-white/20">
                        <span className="text-[10px] opacity-50 uppercase font-mono">
                          ID: {tpl.id}
                        </span>
                        {confirmApplyId === tpl.id ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-yellow-300 uppercase">OVERWRITE?</span>
                            <button
                              type="button"
                              onClick={() => handleApply(tpl)}
                              className="border border-white bg-white text-black px-2 py-0.5 text-[10px] font-bold uppercase cursor-pointer"
                            >
                              [CONFIRM]
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmApplyId(null)}
                              className="text-[10px] opacity-70 underline uppercase cursor-pointer"
                            >
                              [NO]
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmApplyId(tpl.id)}
                            className="border border-white bg-black hover:bg-white hover:text-black px-3 py-1 text-xs font-bold uppercase transition-none cursor-pointer"
                          >
                            [LOAD TEMPLATE]
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ===================== TAB 2: SOUNDS & AUDIO ===================== */}
          {activeTab === 'sounds' && (
            <div className="space-y-6">
              <div className="border border-white/30 p-4 bg-white/5 space-y-2">
                <div className="flex items-center justify-between border-b border-white/20 pb-2">
                  <span className="font-bold text-sm uppercase text-white">
                    _CUSTOM_AUDIO_CONFIGURATOR // OPTION B
                  </span>
                  <span className="text-[10px] opacity-60 font-mono">3 NOTIFICATION EVENTS</span>
                </div>
                <p className="text-xs opacity-70">
                  Upload custom MP3/WAV/OGG audio files (or paste audio links) for each event.
                  If no custom file is uploaded, system defaults to Web Audio API synthesized chimes.
                </p>
              </div>

              {/* Event 1: Task Goal Met / Completion */}
              <div className="border border-white/30 p-4 bg-black space-y-3">
                <div className="flex items-center justify-between border-b border-white/20 pb-2">
                  <div className="space-y-0.5">
                    <span className="font-bold text-xs uppercase text-white block">
                      1. TASK TARGET TIME MET / COMPLETED
                    </span>
                    <span className="text-[10px] opacity-60">Fires when tracked minutes reach planned estimate</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => testCustomSound('task_complete', soundsConfig.taskCompleteAudioUrl)}
                    className="border border-white bg-white text-black hover:bg-white/90 px-3 py-1 text-xs font-bold uppercase transition-none cursor-pointer"
                  >
                    ▶ [TEST AUDIO]
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    <label className="border border-white/50 bg-white/10 hover:bg-white hover:text-black px-3 py-1.5 cursor-pointer text-xs font-bold uppercase shrink-0">
                      <span>[UPLOAD LOCAL FILE (.MP3/.WAV)]</span>
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={(e) => handleSoundFileUpload('task', e)}
                        className="hidden"
                      />
                    </label>
                    <span className="text-[10px] opacity-50 uppercase">OR PASTE URL:</span>
                    <input
                      type="text"
                      value={soundsConfig.taskCompleteAudioUrl || ''}
                      onChange={(e) => handleSoundUrlSave('task', e.target.value)}
                      placeholder="https://example.com/chime.mp3 or data:audio/mp3;base64,..."
                      className="flex-1 w-full bg-black border border-white/40 px-2.5 py-1 text-xs text-white focus:border-white focus:outline-none font-mono"
                    />
                  </div>

                  {soundsConfig.taskCompleteAudioUrl && (
                    <div className="flex items-center justify-between bg-white/10 p-2 text-[11px]">
                      <span className="text-white font-bold uppercase truncate max-w-md">
                        ✓ CUSTOM AUDIO LOADED
                      </span>
                      <button
                        type="button"
                        onClick={() => handleResetSound('task')}
                        className="text-[10px] uppercase font-bold text-white/80 hover:text-white border border-white/40 px-2 py-0.5 cursor-pointer"
                      >
                        [RESET TO DEFAULT CHIME]
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Event 2: Pomodoro Focus Session Complete */}
              <div className="border border-white/30 p-4 bg-black space-y-3">
                <div className="flex items-center justify-between border-b border-white/20 pb-2">
                  <div className="space-y-0.5">
                    <span className="font-bold text-xs uppercase text-white block">
                      2. POMODORO FOCUS ROUND COMPLETE
                    </span>
                    <span className="text-[10px] opacity-60">Fires when 25m or 50m work session reaches 00:00</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => testCustomSound('pomodoro_complete', soundsConfig.pomodoroCompleteAudioUrl)}
                    className="border border-white bg-white text-black hover:bg-white/90 px-3 py-1 text-xs font-bold uppercase transition-none cursor-pointer"
                  >
                    ▶ [TEST AUDIO]
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    <label className="border border-white/50 bg-white/10 hover:bg-white hover:text-black px-3 py-1.5 cursor-pointer text-xs font-bold uppercase shrink-0">
                      <span>[UPLOAD LOCAL FILE (.MP3/.WAV)]</span>
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={(e) => handleSoundFileUpload('pomodoro', e)}
                        className="hidden"
                      />
                    </label>
                    <span className="text-[10px] opacity-50 uppercase">OR PASTE URL:</span>
                    <input
                      type="text"
                      value={soundsConfig.pomodoroCompleteAudioUrl || ''}
                      onChange={(e) => handleSoundUrlSave('pomodoro', e.target.value)}
                      placeholder="https://example.com/focus_end.mp3 or data:audio/mp3;base64,..."
                      className="flex-1 w-full bg-black border border-white/40 px-2.5 py-1 text-xs text-white focus:border-white focus:outline-none font-mono"
                    />
                  </div>

                  {soundsConfig.pomodoroCompleteAudioUrl && (
                    <div className="flex items-center justify-between bg-white/10 p-2 text-[11px]">
                      <span className="text-white font-bold uppercase truncate max-w-md">
                        ✓ CUSTOM AUDIO LOADED
                      </span>
                      <button
                        type="button"
                        onClick={() => handleResetSound('pomodoro')}
                        className="text-[10px] uppercase font-bold text-white/80 hover:text-white border border-white/40 px-2 py-0.5 cursor-pointer"
                      >
                        [RESET TO DEFAULT CHIME]
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Event 3: Break Session Complete */}
              <div className="border border-white/30 p-4 bg-black space-y-3">
                <div className="flex items-center justify-between border-b border-white/20 pb-2">
                  <div className="space-y-0.5">
                    <span className="font-bold text-xs uppercase text-white block">
                      3. BREAK SESSION COMPLETE
                    </span>
                    <span className="text-[10px] opacity-60">Fires when 5m or 15m break session reaches 00:00</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => testCustomSound('break_complete', soundsConfig.breakCompleteAudioUrl)}
                    className="border border-white bg-white text-black hover:bg-white/90 px-3 py-1 text-xs font-bold uppercase transition-none cursor-pointer"
                  >
                    ▶ [TEST AUDIO]
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    <label className="border border-white/50 bg-white/10 hover:bg-white hover:text-black px-3 py-1.5 cursor-pointer text-xs font-bold uppercase shrink-0">
                      <span>[UPLOAD LOCAL FILE (.MP3/.WAV)]</span>
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={(e) => handleSoundFileUpload('break', e)}
                        className="hidden"
                      />
                    </label>
                    <span className="text-[10px] opacity-50 uppercase">OR PASTE URL:</span>
                    <input
                      type="text"
                      value={soundsConfig.breakCompleteAudioUrl || ''}
                      onChange={(e) => handleSoundUrlSave('break', e.target.value)}
                      placeholder="https://example.com/break_end.mp3 or data:audio/mp3;base64,..."
                      className="flex-1 w-full bg-black border border-white/40 px-2.5 py-1 text-xs text-white focus:border-white focus:outline-none font-mono"
                    />
                  </div>

                  {soundsConfig.breakCompleteAudioUrl && (
                    <div className="flex items-center justify-between bg-white/10 p-2 text-[11px]">
                      <span className="text-white font-bold uppercase truncate max-w-md">
                        ✓ CUSTOM AUDIO LOADED
                      </span>
                      <button
                        type="button"
                        onClick={() => handleResetSound('break')}
                        className="text-[10px] uppercase font-bold text-white/80 hover:text-white border border-white/40 px-2 py-0.5 cursor-pointer"
                      >
                        [RESET TO DEFAULT CHIME]
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ===================== TAB 3: ARCHIVE ===================== */}
          {activeTab === 'archive' && (
            <div className="space-y-6">
              <div className="border border-white/30 p-3 bg-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3 overflow-hidden">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                    LOCAL ARCHIVE &amp; POINT-IN-TIME SNAPSHOTS
                  </h3>
                  <p className="text-xs text-white/70 mt-0.5 break-words">
                    Safe point-in-time states stored in your browser. Automatic nightly backups run quietly at midnight.
                  </p>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto shrink-0 justify-start md:justify-end">
                  <button
                    type="button"
                    onClick={handleCreateSnapshot}
                    className="w-full md:w-auto border border-white bg-white text-black hover:bg-white/80 px-3 py-1.5 text-xs font-bold uppercase transition-none cursor-pointer max-w-full text-center whitespace-normal sm:whitespace-nowrap"
                  >
                    [+ CREATE SNAPSHOT NOW]
                  </button>
                </div>
              </div>

              {/* JSON File Export / Import Strip */}
              <div className="border border-white/40 p-3 bg-black flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-bold uppercase block">FILE SYSTEM PERSISTENCE:</span>
                  <span className="text-[11px] text-white/70">
                    Download full backup as .json or restore from an existing file.
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const snap = createSnapshot(schedules, history, 'manual');
                      downloadSnapshotAsJsonFile(snap);
                      showToast('[EXPORTED]: Snapshot JSON file generated.');
                    }}
                    className="border border-white/70 px-3 py-1 hover:bg-white hover:text-black transition-none cursor-pointer uppercase font-bold"
                  >
                    [DOWNLOAD .JSON]
                  </button>
                  <label className="border border-white/70 px-3 py-1 hover:bg-white hover:text-black transition-none cursor-pointer uppercase font-bold">
                    [RESTORE FILE]
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileImport}
                      accept=".json"
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Snapshots Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-white/30 pb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-white">
                    RECORDED SNAPSHOTS ({snapshots.length})
                  </span>
                  {snapshots.some((s) => s.type === 'manual') && (
                    <button
                      type="button"
                      onClick={handleClearAllManualSnapshots}
                      className="text-[10px] text-red-400 hover:text-red-300 uppercase underline cursor-pointer"
                    >
                      [CLEAR MANUAL SNAPSHOTS]
                    </button>
                  )}
                </div>

                {snapshots.length === 0 ? (
                  <div className="border border-dashed border-white/30 p-8 text-center text-xs opacity-60">
                    NO SNAPSHOTS IN LOCAL LEDGER YET. CLICK [+ CREATE SNAPSHOT NOW] ABOVE.
                  </div>
                ) : (
                  <div className="border border-white/30 divide-y divide-white/20 max-h-80 overflow-y-auto">
                    {snapshots.map((snap) => (
                      <div
                        key={snap.id}
                        className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-white/5 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white uppercase">
                              {snap.displayDate || new Date(snap.createdAt).toLocaleString()}
                            </span>
                            <span
                              className={`text-[9px] px-1 font-mono uppercase ${
                                snap.type === 'nightly'
                                  ? 'bg-white/20 text-white'
                                  : 'bg-white text-black font-black'
                              }`}
                            >
                              {snap.type}
                            </span>
                          </div>
                          <div className="text-[10px] opacity-60">
                            {snap.summary?.totalTasks || 0} TASKS ({snap.summary?.scheduledTasks || 0} SCHEDULED) // {snap.summary?.totalHoursTracked || 0}H TRACKED
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => downloadSnapshotAsJsonFile(snap)}
                            className="border border-white/40 px-2 py-0.5 text-[10px] uppercase font-bold hover:bg-white hover:text-black cursor-pointer"
                            title="Export this snapshot file"
                          >
                            [EXPORT]
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRestoreSnapshot(snap)}
                            className="border border-white bg-black hover:bg-white hover:text-black px-2 py-0.5 text-[10px] uppercase font-bold cursor-pointer"
                          >
                            [RESTORE]
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSnapshot(snap.id)}
                            className="border border-red-500/50 text-red-400 hover:bg-red-500 hover:text-black px-1.5 py-0.5 text-[10px] uppercase font-bold cursor-pointer"
                            title="Delete snapshot"
                          >
                            [X]
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===================== TAB 3: CATEGORIES ===================== */}
          {activeTab === 'categories' && (
            <div className="space-y-6">
              <div className="border border-white/30 p-3 bg-white/5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  TAXONOMY &amp; CATEGORY MANAGER
                </h3>
                <p className="text-xs text-white/70 mt-0.5">
                  Organize and classify routine blocks. You can create custom categories, remove unused labels, or assign them to tasks.
                </p>
              </div>

              {/* Add New Category Container (pure div to avoid nested form hydration issues) */}
              <div className="border border-white/40 p-4 space-y-3 bg-black">
                <label className="text-xs font-bold uppercase tracking-wider block">
                  + CREATE NEW CATEGORY
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="text"
                    value={newCatLabel}
                    onChange={(e) => setNewCatLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                        handleAddCategory();
                      }
                    }}
                    placeholder="e.g. Research, Studio, Reading, Fitness..."
                    className="flex-1 bg-black border border-white/50 px-3 py-1.5 text-xs text-white focus:border-white focus:outline-none uppercase"
                  />
                  <button
                    type="button"
                    onClick={handleAddCategory}
                    disabled={!newCatLabel.trim()}
                    className="border border-white bg-white text-black px-4 py-1.5 text-xs font-bold uppercase hover:bg-white/80 disabled:opacity-40 cursor-pointer transition-none shrink-0"
                  >
                    [+ ADD CATEGORY]
                  </button>
                </div>
                {catError && <div className="text-red-400 text-xs font-mono">{catError}</div>}
              </div>

              {/* Active Categories List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-white/30 pb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-white">
                    ACTIVE CATEGORIES ({categories.length})
                  </span>
                  <span className="text-[10px] opacity-60">DEFAULT / CUSTOM</span>
                </div>

                <div className="border border-white/30 divide-y divide-white/20">
                  {categories.map((cat) => (
                    <div
                      key={cat.id}
                      className="p-3 flex items-center justify-between hover:bg-white/5 transition-none text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-white uppercase tracking-wider">
                          {cat.label}
                        </span>
                        <span className="text-[10px] opacity-40 font-mono">
                          ID: [{cat.id}]
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleRemoveCategory(cat)}
                          className="border border-red-500/70 text-red-400 hover:bg-red-500 hover:text-black px-2 py-0.5 text-[10px] font-bold uppercase transition-none cursor-pointer"
                        >
                          [REMOVE]
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ===================== TAB 4: CLOUD SYNC ===================== */}
          {activeTab === 'cloud' && (
            <div className="space-y-6">
              <div className="border border-white/30 p-3 bg-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3 overflow-hidden">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                    GOOGLE DRIVE CLOUD SYNC VAULT
                  </h3>
                  <p className="text-xs text-white/70 mt-0.5 break-words">
                    Sync routines across your laptop, desktop, and phone using Google Drive and a private 6-character Sync Code.
                  </p>
                </div>
                <div className="text-xs font-mono text-white/80 shrink-0">
                  LAST SYNCED: <span className="text-white font-bold">{lastSyncStr}</span>
                </div>
              </div>

              {/* Sync Code Box */}
              <div className="border border-white/40 p-4 space-y-3 bg-black">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider">
                    PRIVATE SYNC CODE:
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditingCode(!isEditingCode)}
                    className="text-[10px] uppercase underline opacity-80 hover:opacity-100 cursor-pointer"
                  >
                    {isEditingCode ? '[CANCEL]' : '[CHANGE / PAIR CODE]'}
                  </button>
                </div>

                {!isEditingCode ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/5 border border-white/20 p-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-black tracking-widest text-white bg-black border border-white px-3 py-1">
                        {syncCode}
                      </span>
                      <span className="text-[10px] opacity-60 uppercase">
                        // USE THIS CODE ON OTHER DEVICES TO SYNC
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(syncCode);
                            showToast('[COPIED]: Sync code copied to clipboard.');
                          } catch {
                            showToast(`CODE: ${syncCode}`);
                          }
                        }}
                        className="border border-white/60 px-3 py-1 text-xs font-bold uppercase hover:bg-white hover:text-black cursor-pointer transition-none"
                      >
                        [COPY CODE]
                      </button>
                      <button
                        type="button"
                        onClick={handleGenerateNewCode}
                        className="border border-white/60 px-2 py-1 text-xs font-bold uppercase hover:bg-white hover:text-black cursor-pointer transition-none"
                        title="Generate a brand new random sync code"
                      >
                        [GENERATE NEW]
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 pt-2 border-t border-white/20">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={codeInput}
                        onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                        placeholder="ENTER SYNC CODE (e.g. ROUT-9X2A)"
                        className="flex-1 bg-black border border-white px-3 py-1 text-xs text-white font-mono uppercase"
                      />
                      <button
                        type="button"
                        onClick={handleSaveCustomCode}
                        className="border border-white bg-white text-black px-4 py-1 text-xs font-bold uppercase cursor-pointer"
                      >
                        [SAVE]
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Webhook Configuration Section */}
              <div className="border border-white/40 p-4 space-y-3 bg-black">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider">
                    GOOGLE APPS SCRIPT WEBHOOK URL:
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditingUrl(!isEditingUrl)}
                    className="text-[10px] uppercase underline opacity-80 hover:opacity-100 cursor-pointer"
                  >
                    {isEditingUrl ? '[HIDE]' : '[CONFIGURE / EDIT URL]'}
                  </button>
                </div>

                {isEditingUrl ? (
                  <div className="space-y-2 pt-2 border-t border-white/20">
                    <p className="text-[11px] text-white/70">
                      Paste the web app deployment URL from your Google Apps Script (e.g. https://script.google.com/macros/s/.../exec).
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="https://script.google.com/macros/s/.../exec"
                        className="flex-1 bg-black border border-white px-3 py-1.5 text-xs text-white font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleSaveVaultUrl}
                        className="border border-white bg-white text-black px-4 py-1.5 text-xs font-bold uppercase cursor-pointer"
                      >
                        [SAVE URL]
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-white/70 truncate font-mono bg-white/5 p-2 border border-white/20">
                    {vaultUrl ? vaultUrl : 'NOT CONFIGURED (CLICK CONFIGURE URL)'}
                  </div>
                )}
              </div>

              {/* Two Primary Cloud Sync Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <button
                  type="button"
                  disabled={isCloudSyncing}
                  onClick={handleFetchFromDrive}
                  className="border-2 border-white bg-black hover:bg-white hover:text-black p-4 text-xs font-bold uppercase transition-none cursor-pointer flex flex-col items-center justify-center gap-1 disabled:opacity-50"
                >
                  <span className="text-base font-black">↓ [FETCH FROM CLOUD]</span>
                  <span className="text-[10px] opacity-70">
                    Pull newest routine from Drive Vault ({syncCode})
                  </span>
                </button>

                <button
                  type="button"
                  disabled={isCloudSyncing}
                  onClick={handleUploadToDrive}
                  className="border-2 border-white bg-white text-black hover:bg-white/80 p-4 text-xs font-black uppercase transition-none cursor-pointer flex flex-col items-center justify-center gap-1 disabled:opacity-50"
                >
                  <span className="text-base font-black">↑ [UPLOAD TO CLOUD]</span>
                  <span className="text-[10px] opacity-70">
                    Push current schedule &amp; logs to Drive Vault ({syncCode})
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* ===================== TAB 5: SYSTEM ===================== */}
          {activeTab === 'system' && (
            <div className="space-y-6">
              <div className="border border-white/30 p-3 bg-white/5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  SYSTEM DOCS, SHORTCUTS &amp; DIAGNOSTICS
                </h3>
                <p className="text-xs text-white/70 mt-0.5">
                  Guidance, keyboard hotkeys, and system initialization controls.
                </p>
              </div>

              {/* Interactive Tutorial Launcher */}
              <div className="border border-white/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-black">
                <div>
                  <span className="text-xs font-bold uppercase block text-white">
                    INTERACTIVE SYSTEM WALKTHROUGH
                  </span>
                  <span className="text-[11px] text-white/70">
                    Take the 4-step tour covering the 3-phase cycle, execution tracking, and Pomodoro timers.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenTutorial();
                  }}
                  className="border border-white bg-white text-black hover:bg-white/80 px-4 py-1.5 text-xs font-bold uppercase transition-none cursor-pointer shrink-0"
                >
                  [LAUNCH WALKTHROUGH]
                </button>
              </div>

              {/* Keyboard Shortcuts Customizer Manager */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/20 pb-2">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-white block">
                      CUSTOMIZABLE KEYBOARD SHORTCUTS:
                    </span>
                    <span className="text-[11px] text-white/60">
                      Click [EDIT] to rebind any shortcut. Press key when prompt appears.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetAllShortcuts}
                    className="border border-white/60 text-white hover:bg-white hover:text-black px-3 py-1 text-[10px] font-bold uppercase transition-none cursor-pointer shrink-0"
                    title="Restore all keyboard shortcuts to system defaults"
                  >
                    [RESET ALL TO DEFAULTS]
                  </button>
                </div>

                <div className="border border-white/30 text-xs divide-y divide-white/20 bg-black">
                  {DEFAULT_SHORTCUT_ACTIONS.map((action) => {
                    const currentKey = shortcutsConfig[action.id] || action.defaultKey;
                    const isEditing = editingShortcutId === action.id;
                    const isModified = currentKey !== action.defaultKey;

                    return (
                      <div
                        key={action.id}
                        className={`p-2.5 flex items-center justify-between gap-3 ${
                          isEditing ? 'bg-white/10 border-y border-white' : 'hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-white/80 font-medium truncate">
                            {action.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {/* Current Key Badge */}
                          <span
                            className={`font-mono font-bold px-2 py-0.5 border text-xs uppercase ${
                              isEditing
                                ? 'bg-white text-black border-white animate-pulse'
                                : isModified
                                ? 'bg-white/20 text-white border-white'
                                : 'bg-black text-white border-white/40'
                            }`}
                          >
                            {isEditing ? '[PRESS ANY KEY...]' : formatKeyDisplay(currentKey)}
                          </span>

                          {/* Rebind / Edit Button */}
                          <button
                            type="button"
                            onClick={() => {
                              if (isEditing) {
                                setEditingShortcutId(null);
                              } else {
                                setEditingShortcutId(action.id);
                              }
                            }}
                            className={`px-2 py-0.5 text-[10px] font-bold uppercase transition-none cursor-pointer border ${
                              isEditing
                                ? 'border-white bg-white text-black'
                                : 'border-white/60 text-white hover:bg-white hover:text-black'
                            }`}
                          >
                            {isEditing ? '[CANCEL]' : '[EDIT]'}
                          </button>

                          {/* Reset Single Shortcut Button if Modified */}
                          {isModified && (
                            <button
                              type="button"
                              onClick={() => handleResetSingleShortcut(action.id)}
                              className="border border-white/40 text-white/60 hover:text-white hover:border-white px-2 py-0.5 text-[10px] font-mono transition-none cursor-pointer"
                              title={`Reset to default (${formatKeyDisplay(action.defaultKey)})`}
                            >
                              [RESET]
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Danger Zone: Purge */}
              <div className="border-2 border-red-500/60 p-4 bg-red-950/20 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 bg-red-500" />
                  <span className="text-xs font-bold text-red-400 uppercase tracking-wider">
                    DANGER ZONE: SYSTEM RESET &amp; PURGE
                  </span>
                </div>
                <p className="text-[11px] text-white/70">
                  Reset the app to a clean 0-task state. This erases placeholder tasks and resets logs to a baseline.
                </p>
                <button
                  type="button"
                  onClick={handlePurge}
                  className="border border-red-500 text-red-400 hover:bg-red-500 hover:text-black px-4 py-2 text-xs font-bold uppercase transition-none cursor-pointer"
                >
                  [PURGE ALL DATA &amp; START CLEAN]
                </button>
              </div>
            </div>
          )}
        </div>

        {/* --- Console Footer --- */}
        <div className="bg-black border-t-2 border-white px-4 py-2.5 flex items-center justify-between text-[11px] font-mono shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-white font-bold uppercase">STATUS: ONLINE</span>
            <span className="hidden sm:inline opacity-50">//</span>
            <span className="hidden sm:inline text-white/70 uppercase">
              CODE: <span className="text-white font-bold">{syncCode}</span>
            </span>
            <span className="hidden sm:inline opacity-50">//</span>
            <span className="hidden sm:inline text-white/70 uppercase">
              CATEGORIES: <span className="text-white font-bold">{categories.length} ACTIVE</span>
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="border border-white bg-white text-black hover:bg-white/80 px-4 py-1 text-xs font-black uppercase transition-none cursor-pointer"
          >
            [DONE]
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : modalNode;
}
