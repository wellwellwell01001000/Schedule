import React, { useState, useRef, useEffect } from 'react';
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
  getOrCreateSyncCode,
  setStoredSyncCode,
  generateSyncCode,
  getVaultLastSync,
  saveToDriveVault,
  loadFromDriveVault,
} from '../services/driveVaultService';
import { DaySchedule, MonthLogRecord } from '../types';

interface BackupManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedules: Record<string, DaySchedule>;
  history: MonthLogRecord[];
  onRestoreSystem: (newSchedules: Record<string, DaySchedule>, newHistory: MonthLogRecord[]) => void;
  onPurgeAndStartClean?: () => void;
}

export function BackupManagerModal({
  isOpen,
  onClose,
  schedules,
  history,
  onRestoreSystem,
  onPurgeAndStartClean,
}: BackupManagerModalProps) {
  const [snapshots, setSnapshots] = useState<SystemSnapshot[]>(() => getSavedSnapshots());
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isDriveSyncing, setIsDriveSyncing] = useState<boolean>(false);
  const [vaultLastSync, setVaultLastSyncTime] = useState<string | null>(() => getVaultLastSync());
  const [syncCode, setSyncCode] = useState<string>(() => getOrCreateSyncCode());
  const [restoreCodeInput, setRestoreCodeInput] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setVaultLastSyncTime(getVaultLastSync());
    setSyncCode(getOrCreateSyncCode());
  }, [isOpen]);

  if (!isOpen) return null;

  const isVaultConfigured = !!getVaultScriptUrl();

  // Save / Sync to Google Drive Vault via Webhook
  const handleDriveVaultSync = async () => {
    if (!getVaultScriptUrl()) {
      setFeedback('Drive Vault is connecting...');
      return;
    }

    setIsDriveSyncing(true);
    setFeedback(`SAVING TO GOOGLE DRIVE VAULT (CODE: ${syncCode})...`);
    try {
      const currentSnap = createSnapshot(schedules, history, 'manual');
      const result = await saveToDriveVault(currentSnap, syncCode);
      const displayTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      setVaultLastSyncTime(new Date().toISOString());

      // Save into local snapshot registry too
      const updatedSnaps = saveSnapshotToList(currentSnap);
      setSnapshots(updatedSnaps);

      setFeedback(`[✓] SYNC SUCCESSFUL: SAVED TO GOOGLE DRIVE (${displayTime}) • CODE: ${result.code}`);
      setTimeout(() => setFeedback(null), 5500);
    } catch (err: unknown) {
      console.error('Drive Vault Sync Error:', err);
      const msg = err instanceof Error ? err.message : 'Google Drive sync failed.';
      setFeedback(`VAULT ERROR: ${msg}`);
    } finally {
      setIsDriveSyncing(false);
    }
  };

  // Pull / Restore from Google Drive Vault using a Sync Code
  const handleDriveVaultPull = async () => {
    const codeToLoad = (restoreCodeInput.trim() || syncCode).toUpperCase();
    if (!codeToLoad) {
      setFeedback('PLEASE ENTER A VALID SYNC CODE TO RESTORE.');
      return;
    }

    if (!getVaultScriptUrl()) {
      setFeedback('Drive Vault is connecting...');
      return;
    }

    setIsDriveSyncing(true);
    setFeedback(`QUERYING GOOGLE DRIVE FOR SYNC CODE: ${codeToLoad}...`);
    try {
      const remoteSnap = await loadFromDriveVault(codeToLoad);
      const validatedSnap = parseAndValidateBackupJson(
        typeof remoteSnap === 'string' ? remoteSnap : JSON.stringify(remoteSnap)
      );

      if (window.confirm(`Found Google Drive backup for Code [${codeToLoad}] from ${validatedSnap.displayDate}. Restore and replace current local data?`)) {
        restoreAllCompletedMap(validatedSnap.completedMap);
        onRestoreSystem(validatedSnap.schedules, validatedSnap.history);
        setSyncCode(codeToLoad);
        setStoredSyncCode(codeToLoad);
        const updated = saveSnapshotToList({
          ...validatedSnap,
          type: 'file_import',
        });
        setSnapshots(updated);
        setFeedback(`[✓] SYSTEM RESTORED FROM GOOGLE DRIVE VAULT (${validatedSnap.displayDate})`);
        setTimeout(() => setFeedback(null), 4500);
      }
    } catch (err: unknown) {
      console.error('Drive Vault Load Error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to retrieve routine from Google Drive.';
      setFeedback(`VAULT ERROR: ${msg}`);
    } finally {
      setIsDriveSyncing(false);
    }
  };

  const handleGenerateNewCode = () => {
    const newCode = generateSyncCode();
    setSyncCode(newCode);
    setStoredSyncCode(newCode);
    setFeedback(`GENERATED NEW SYNC CODE: ${newCode}`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(syncCode);
    setFeedback(`COPIED SYNC CODE "${syncCode}" TO CLIPBOARD!`);
    setTimeout(() => setFeedback(null), 2500);
  };

  const handleCreateManualSnapshot = () => {
    const snap = createSnapshot(schedules, history, 'manual');
    const updated = saveSnapshotToList(snap);
    setSnapshots(updated);
    setFeedback(`MANUAL SNAPSHOT CREATED: ${snap.displayDate}`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleDownloadCurrentAsFile = () => {
    const snap = createSnapshot(schedules, history, 'manual');
    downloadSnapshotAsJsonFile(snap);
    setFeedback('BACKUP JSON FILE DOWNLOADED TO YOUR DISK');
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleDownloadSnapshotFile = (snap: SystemSnapshot) => {
    downloadSnapshotAsJsonFile(snap);
    setFeedback(`DOWNLOADED SNAPSHOT: ${snap.displayDate}`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleRestoreSnapshot = (snap: SystemSnapshot) => {
    if (window.confirm(`RESTORE SYSTEM TO SNAPSHOT FROM ${snap.displayDate}? Current unsaved modifications will be replaced.`)) {
      restoreAllCompletedMap(snap.completedMap);
      onRestoreSystem(snap.schedules, snap.history);
      setFeedback(`SYSTEM RESTORED TO ${snap.displayDate}`);
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  const handleClearManualSnapshots = () => {
    const manualCount = snapshots.filter((s) => s.type === 'manual').length;
    if (manualCount === 0) {
      setFeedback('NO MANUAL SNAPSHOTS FOUND TO CLEAR.');
      setTimeout(() => setFeedback(null), 2500);
      return;
    }
    if (window.confirm(`DELETE ALL ${manualCount} MANUAL SNAPSHOT(S)? Automated nightly archives will be preserved.`)) {
      const remaining = clearManualSnapshots();
      setSnapshots(remaining);
      setFeedback(`[CLEARED]: Removed ${manualCount} manual snapshot(s). Automated nightly backups preserved.`);
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  const handleDeleteSnapshot = (snap: SystemSnapshot, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`DELETE SNAPSHOT FROM ${snap.displayDate}?`)) {
      const remaining = deleteSnapshotById(snap.id);
      setSnapshots(remaining);
      setFeedback(`[DELETED]: Snapshot from ${snap.displayDate} removed.`);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = parseAndValidateBackupJson(content);
        const snap = {
          ...parsed,
          id: `snap-import-${Date.now()}`,
          type: 'file_import' as const,
        };
        const updated = saveSnapshotToList(snap);
        setSnapshots(updated);
        restoreAllCompletedMap(snap.completedMap);
        onRestoreSystem(snap.schedules, snap.history);
        setFeedback(`RESTORED SUCCESSFULLY FROM ${file.name}`);
        setTimeout(() => setFeedback(null), 4000);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Invalid backup JSON file.';
        alert(`Failed to import backup: ${msg}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 font-mono">
      <div className="border-2 border-white bg-black w-full max-w-3xl max-h-[90vh] flex flex-col text-white shadow-2xl">
        {/* Modal Top Header */}
        <div className="bg-white text-black px-4 py-2 font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 bg-black" />
            <span className="text-xs uppercase tracking-wider">
              _PERSISTENCE_&amp;_DRIVE_VAULT_BACKUP
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-xs font-black px-2 py-0.5 border border-black hover:bg-black hover:text-white transition-none cursor-pointer uppercase"
          >
            [ESC / CLOSE]
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 md:p-6 overflow-y-auto space-y-5 text-xs">
          {/* Information & Status Box */}
          <div className="border border-white/30 p-3.5 space-y-2 bg-white/5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-white uppercase tracking-wider">
                STORAGE ARCHITECTURE: LOCAL-FIRST &amp; DRIVE VAULT SYNC
              </span>
              <span className="text-[10px] bg-white text-black font-bold px-1.5 py-0.5 uppercase">
                ZERO_AUTH_FRICTION
              </span>
            </div>
            <p className="opacity-75 leading-relaxed">
              • <strong>Fast &amp; Offline</strong>: The app never hangs waiting for remote servers. All your tasks, tracked minutes, and checkmarks load instantly from local storage.
              <br />
              • <strong>Central Google Drive Vault</strong>: Users can backup and restore routines across any device with a simple 6-character Sync Code. <strong>No Google accounts, popups, or OAuth permissions required for users!</strong>
              <br />
              • <strong>Direct File Export (.json)</strong>: Download a standalone JSON backup file anytime for 100% offline portability.
            </p>
          </div>

          {feedback && (
            <div className="border border-white bg-white text-black p-2 font-bold text-center text-xs tracking-tight">
              {feedback}
            </div>
          )}

          {/* GOOGLE DRIVE VAULT SYNC MODULE (NO LOGIN REQUIRED) */}
          <div className="border-2 border-white bg-black p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/20 pb-2">
              <div className="flex items-center gap-2">
                <span className={`inline-block w-2.5 h-2.5 ${isVaultConfigured ? 'bg-white' : 'border border-white animate-pulse'}`} />
                <span className="font-black text-xs uppercase tracking-wider">
                  _GOOGLE_DRIVE_VAULT_SYNC // (NO SIGN-IN REQUIRED)
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                {vaultLastSync && (
                  <span className="opacity-70 font-mono">
                    LAST SYNCED: {new Date(vaultLastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
                <span className={`px-1.5 py-0.5 uppercase font-bold ${isVaultConfigured ? 'bg-white text-black' : 'border border-white/40 text-white/60'}`}>
                  {isVaultConfigured ? 'VAULT_CONNECTED' : 'SETUP_PENDING'}
                </span>
              </div>
            </div>

            {/* Sync Code Box */}
            <div className="border border-white/30 p-3 bg-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-[10px] opacity-60 uppercase font-bold tracking-wider">YOUR ACTIVE SYNC CODE:</div>
                <div className="text-xl font-black tracking-widest text-white font-mono mt-0.5">
                  {syncCode}
                </div>
                <div className="text-[10px] opacity-70 mt-1">
                  Use this code to restore your routine on your phone, tablet, or another browser.
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="border border-white bg-white text-black px-3 py-1.5 text-xs font-bold uppercase hover:bg-white/80 cursor-pointer"
                >
                  [COPY CODE]
                </button>
                <button
                  type="button"
                  onClick={handleGenerateNewCode}
                  className="border border-white/50 text-white px-2.5 py-1.5 text-xs hover:border-white cursor-pointer uppercase"
                  title="Generate a new Sync Code for this device"
                >
                  [NEW CODE]
                </button>
              </div>
            </div>

            {/* Sync / Push Action */}
            <div className="space-y-1">
              <button
                onClick={handleDriveVaultSync}
                disabled={isDriveSyncing}
                className="w-full border-2 border-white bg-white text-black py-3 px-4 font-black text-xs uppercase hover:bg-white/90 transition-none cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 shadow-md"
              >
                {isDriveSyncing ? (
                  <>
                    <span className="inline-block w-2 h-2 bg-black animate-ping" />
                    <span>SAVING TO GOOGLE DRIVE VAULT...</span>
                  </>
                ) : (
                  <>
                    <span>&gt;&gt; [SYNC &amp; BACKUP TO GOOGLE DRIVE VAULT] &lt;&lt;</span>
                  </>
                )}
              </button>
              <div className="text-[10px] opacity-65 text-center">
                Saves your full schedule, stopwatch logs, and checks into your Google Drive folder.
              </div>
            </div>

            {/* Restore / Pull from Code Module */}
            <div className="pt-2 border-t border-white/15 space-y-2">
              <div className="text-[10px] opacity-80 uppercase font-bold">
                RESTORE ROUTINE FROM ANOTHER DEVICE VIA SYNC CODE:
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={restoreCodeInput}
                  onChange={(e) => setRestoreCodeInput(e.target.value.toUpperCase())}
                  placeholder="ENTER SYNC CODE (e.g. ROUT-8B2F)"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="off"
                  className="flex-1 bg-black border border-white/50 px-3 py-2 text-xs text-white uppercase font-mono focus:border-white focus:outline-none"
                />
                <button
                  onClick={handleDriveVaultPull}
                  disabled={isDriveSyncing}
                  className="border border-white/80 bg-black text-white px-4 py-2 text-xs font-bold uppercase hover:bg-white hover:text-black transition-none cursor-pointer disabled:opacity-50"
                >
                  [FETCH &amp; RESTORE FROM VAULT]
                </button>
              </div>
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={handleCreateManualSnapshot}
              className="border border-white bg-black p-3 text-left hover:bg-white hover:text-black transition-none cursor-pointer space-y-1"
            >
              <div className="font-bold text-xs uppercase">[+ SNAPSHOT NOW]</div>
              <div className="text-[10px] opacity-70">
                Save an instant point-in-time state to internal archives.
              </div>
            </button>

            <button
              onClick={handleDownloadCurrentAsFile}
              className="border border-white bg-white text-black p-3 text-left hover:bg-white/90 transition-none cursor-pointer space-y-1"
            >
              <div className="font-black text-xs uppercase">[DOWNLOAD FILE (.JSON)]</div>
              <div className="text-[10px] opacity-80">
                Save backup directly to your computer or Google Drive folder.
              </div>
            </button>

            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileImport}
                accept=".json"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-full border border-white/60 bg-black p-3 text-left hover:border-white hover:bg-white/10 transition-none cursor-pointer space-y-1"
              >
                <div className="font-bold text-xs uppercase">[RESTORE FROM FILE]</div>
                <div className="text-[10px] opacity-70">
                  Select a previously downloaded .json file to restore.
                </div>
              </button>
            </div>
          </div>

          {/* DANGER / FRESH START MODULE */}
          {onPurgeAndStartClean && (
            <div className="border border-white/40 p-3 bg-black space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold uppercase text-[11px] text-white">
                  _CLEAN_SLATE_RESET // PURGE ALL SAMPLE DATA
                </span>
                <span className="text-[9px] border border-white/40 px-1 py-0.5 uppercase opacity-70">
                  ZERO_BASELINE
                </span>
              </div>
              <p className="text-[10px] opacity-70 leading-relaxed">
                Removes all pre-populated synthetic months, resets all task tracked minutes to 0m, and clears all completion checkmarks so your dashboard reflects 100% genuine progress starting today.
              </p>
              <button
                onClick={() => {
                  if (window.confirm('PURGE ALL PLACEHOLDERS & RESET TO ZERO? This will clear all sample hours and checkmarks.')) {
                    onPurgeAndStartClean();
                    setFeedback('ALL PLACEHOLDER DATA PURGED. ZERO BASELINE ESTABLISHED!');
                    setTimeout(() => setFeedback(null), 4000);
                  }
                }}
                className="border border-white/80 bg-white text-black px-3 py-1.5 font-black text-xs uppercase hover:bg-white/80 cursor-pointer"
              >
                [WIPE SAMPLE DATA &amp; START CLEAN]
              </button>
            </div>
          )}

          {/* Saved Snapshots List */}
          <div className="space-y-2 border-t border-white/20 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-wider">
              <div className="flex items-center gap-2">
                <span className="opacity-80">SAVED SNAPSHOT ARCHIVES ({snapshots.length})</span>
                <span className="text-[10px] opacity-60 font-normal">
                  ({snapshots.filter((s) => s.type === 'manual').length} manual, {snapshots.filter((s) => s.type === 'nightly').length} nightly)
                </span>
              </div>
              <div className="flex items-center gap-2">
                {snapshots.some((s) => s.type === 'manual') && (
                  <button
                    onClick={handleClearManualSnapshots}
                    className="border border-white/60 text-white hover:bg-white hover:text-black px-2 py-0.5 text-[10px] font-bold uppercase transition-none cursor-pointer"
                    title="Delete all manual snapshots while keeping nightly archives"
                  >
                    [CLEAR MANUAL SNAPSHOTS ({snapshots.filter((s) => s.type === 'manual').length})]
                  </button>
                )}
                <span className="text-[10px] opacity-60 hidden sm:inline">KEPT IN REGISTRY</span>
              </div>
            </div>

            {/* Mobile Installation Guide (iOS & Android) */}
            <div className="border border-white/40 p-3.5 space-y-2 bg-white/5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white uppercase tracking-wider text-[11px]">
                  _MOBILE_APP_SETUP: HOW TO RUN ON IPHONE &amp; ANDROID
                </span>
                <span className="text-[9px] border border-white px-1.5 py-0.2 uppercase font-bold">
                  STANDALONE_PWA
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] opacity-80 pt-1">
                <div className="border border-white/20 p-2.5 space-y-1">
                  <div className="font-bold text-white uppercase text-[10px]">🍎 iOS (iPhone / iPad):</div>
                  <ol className="list-decimal list-inside space-y-0.5 leading-relaxed">
                    <li>Open this URL in <strong>Safari</strong>.</li>
                    <li>Tap the <strong>Share</strong> button (box with upward arrow).</li>
                    <li>Tap <strong>&quot;Add to Home Screen&quot;</strong>.</li>
                    <li>Launches like a native full-screen app with custom monochrome icon.</li>
                  </ol>
                </div>
                <div className="border border-white/20 p-2.5 space-y-1">
                  <div className="font-bold text-white uppercase text-[10px]">🤖 Android (Chrome / Firefox):</div>
                  <ol className="list-decimal list-inside space-y-0.5 leading-relaxed">
                    <li>Open this URL in <strong>Google Chrome</strong>.</li>
                    <li>Tap the <strong>Menu (⋮)</strong> in the top right corner.</li>
                    <li>Tap <strong>&quot;Install App&quot;</strong> or <strong>&quot;Add to Home screen&quot;</strong>.</li>
                    <li>Installs directly to your home screen with offline persistence.</li>
                  </ol>
                </div>
              </div>
            </div>

            {snapshots.length === 0 ? (
              <div className="border border-white/20 p-6 text-center text-xs opacity-60">
                NO SNAPSHOTS SAVED YET. CLICK [+ SNAPSHOT NOW] OR LET THE NIGHTLY AUTO-BACKUP RUN.
              </div>
            ) : (
              <div className="border border-white/20 divide-y divide-white/15 max-h-56 overflow-y-auto">
                {snapshots.map((snap) => (
                  <div
                    key={snap.id}
                    className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/5"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white font-mono">
                          {snap.displayDate}
                        </span>
                        <span
                          className={`text-[9px] px-1 py-0 uppercase font-bold border ${
                            snap.type === 'nightly'
                              ? 'border-white bg-white text-black'
                              : snap.type === 'file_import'
                              ? 'border-white/60 text-white'
                              : 'border-white/30 text-white/70'
                          }`}
                        >
                          {snap.type}
                        </span>
                      </div>
                      <div className="text-[10px] opacity-60">
                        {snap.summary.totalTasks} tasks ({snap.summary.scheduledTasks} scheduled) • {snap.summary.totalHoursTracked}h tracked
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleRestoreSnapshot(snap)}
                        className="border border-white bg-white text-black px-2.5 py-1 text-[11px] font-bold uppercase hover:bg-white/90 cursor-pointer"
                      >
                        [RESTORE]
                      </button>
                      <button
                        onClick={() => handleDownloadSnapshotFile(snap)}
                        className="border border-white/40 px-2 py-1 text-[11px] hover:border-white text-white cursor-pointer uppercase"
                      >
                        [.JSON]
                      </button>
                      <button
                        onClick={(e) => handleDeleteSnapshot(snap, e)}
                        className="border border-white/30 text-white/70 hover:border-white hover:text-white px-2 py-1 text-[11px] cursor-pointer uppercase"
                        title="Delete this snapshot"
                      >
                        [DELETE]
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-white p-3 bg-black flex items-center justify-between text-[10px] opacity-70">
          <span>BACKUP FORMAT: MONOCHROME_EDITORIAL_SNAPSHOT_V1</span>
          <button
            onClick={onClose}
            className="hover:text-white uppercase font-bold cursor-pointer"
          >
            [CLOSE MODAL]
          </button>
        </div>
      </div>
    </div>
  );
}
