import React, { useState, useRef, useEffect } from 'react';
import {
  SystemSnapshot,
  getSavedSnapshots,
  saveSnapshotToList,
  createSnapshot,
  downloadSnapshotAsJsonFile,
  parseAndValidateBackupJson,
  restoreAllCompletedMap,
} from '../data/backupStore';
import {
  getStoredAccessToken,
  requestGoogleDriveAccessToken,
  uploadToGoogleDrive,
  findDriveSyncFile,
  downloadFromGoogleDrive,
  getLastSyncTime,
  setLastSyncTime,
  clearStoredAuth,
} from '../services/googleDriveService';
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
  const [driveLastSync, setDriveLastSync] = useState<string | null>(() => getLastSyncTime());
  const [hasDriveAuth, setHasDriveAuth] = useState<boolean>(() => !!getStoredAccessToken());
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setHasDriveAuth(!!getStoredAccessToken());
    setDriveLastSync(getLastSyncTime());
  }, [isOpen]);

  if (!isOpen) return null;

  // Single-Click Google Drive Sync: Backs up to Drive, or fetches newer if cloud exists
  const handleGoogleDriveSync = async () => {
    setIsDriveSyncing(true);
    setFeedback('CONNECTING TO GOOGLE DRIVE...');
    try {
      const token = await requestGoogleDriveAccessToken();
      setHasDriveAuth(true);

      // Check if file already exists in user's Drive
      setFeedback('CHECKING GOOGLE DRIVE SYNC ARCHIVE...');
      const existingDriveFile = await findDriveSyncFile(token);

      // Create snapshot of current local system
      const currentSnap = createSnapshot(schedules, history, 'manual');

      if (existingDriveFile) {
        // Fetch remote metadata & prompt or upload
        setFeedback('SYNCING LOCAL STATE TO GOOGLE DRIVE...');
      } else {
        setFeedback('CREATING NEW ROUTINE SYNC ARCHIVE ON GOOGLE DRIVE...');
      }

      const result = await uploadToGoogleDrive(token, currentSnap);
      const nowIso = new Date().toISOString();
      const displayTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastSyncTime(nowIso);
      setDriveLastSync(nowIso);

      // Save into local snapshot registry too
      const updatedSnaps = saveSnapshotToList(currentSnap);
      setSnapshots(updatedSnaps);

      setFeedback(`SUCCESS: SYNCED TO GOOGLE DRIVE (${displayTime}) [FILE ID: ${result.fileId.substring(0, 8)}...]`);
      setTimeout(() => setFeedback(null), 4500);
    } catch (err: unknown) {
      console.error('Drive Sync Error:', err);
      const msg = err instanceof Error ? err.message : 'Google Drive sync failed.';
      setFeedback(`DRIVE ERROR: ${msg}`);
      if (msg.includes('expired') || msg.includes('401')) {
        setHasDriveAuth(false);
      }
    } finally {
      setIsDriveSyncing(false);
    }
  };

  // Pull latest from Google Drive
  const handleGoogleDrivePull = async () => {
    setIsDriveSyncing(true);
    setFeedback('FETCHING LATEST DATA FROM GOOGLE DRIVE...');
    try {
      const token = await requestGoogleDriveAccessToken();
      setHasDriveAuth(true);

      const existingDriveFile = await findDriveSyncFile(token);
      if (!existingDriveFile) {
        setFeedback('NO ROUTINE ARCHIVE FOUND ON GOOGLE DRIVE YET. RUN [SYNC & BACKUP] FIRST.');
        setTimeout(() => setFeedback(null), 4000);
        return;
      }

      const remoteContent = await downloadFromGoogleDrive(token, existingDriveFile.id);
      const validatedSnap = parseAndValidateBackupJson(
        typeof remoteContent === 'string' ? remoteContent : JSON.stringify(remoteContent)
      );

      if (window.confirm(`Found Google Drive backup from ${validatedSnap.displayDate}. Restore and replace current local data?`)) {
        restoreAllCompletedMap(validatedSnap.completedMap);
        onRestoreSystem(validatedSnap.schedules, validatedSnap.history);
        const updated = saveSnapshotToList({
          ...validatedSnap,
          type: 'file_import',
        });
        setSnapshots(updated);
        setFeedback(`RESTORED SYSTEM FROM GOOGLE DRIVE (${validatedSnap.displayDate})`);
        setTimeout(() => setFeedback(null), 4000);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to pull from Google Drive.';
      setFeedback(`DRIVE ERROR: ${msg}`);
    } finally {
      setIsDriveSyncing(false);
    }
  };

  const handleDisconnectDrive = () => {
    clearStoredAuth();
    setHasDriveAuth(false);
    setFeedback('DISCONNECTED GOOGLE DRIVE SESSION');
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
              _PERSISTENCE_&amp;_FILE_BACKUP_ENGINE
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
                STORAGE STATUS: LOCAL-FIRST &amp; NIGHTLY AUTO-PERSISTENCE
              </span>
              <span className="text-[10px] bg-white text-black font-bold px-1.5 py-0.5 uppercase">
                ZERO_SERVER_FETCH_LAG
              </span>
            </div>
            <p className="opacity-75 leading-relaxed">
              • <strong>Fast &amp; Offline</strong>: The app does not query a remote server on start. All your custom tasks, time tracking logs, and checked items load instantly from persistent storage.
              <br />
              • <strong>Nightly Auto-Backup</strong>: Automatically saves a complete snapshot archive to storage every night when you wind down (after 21:00).
              <br />
              • <strong>File Export / Google Drive</strong>: You can download a standalone <code className="text-white bg-black px-1">.json</code> file to save directly in any folder on your computer or into your Google Drive backup directory.
            </p>
          </div>

          {feedback && (
            <div className="border border-white bg-white text-black p-2 font-bold text-center text-xs tracking-tight">
              {feedback}
            </div>
          )}

          {/* GOOGLE DRIVE 1-BUTTON SYNC & BACKUP MODULE */}
          <div className="border-2 border-white bg-black p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/20 pb-2">
              <div className="flex items-center gap-2">
                <span className={`inline-block w-2.5 h-2.5 ${hasDriveAuth ? 'bg-white' : 'border border-white'}`} />
                <span className="font-black text-xs uppercase tracking-wider">
                  _GOOGLE_DRIVE_CROSS_DEVICE_SYNC
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                {driveLastSync && (
                  <span className="opacity-70 font-mono">
                    LAST SYNCED: {new Date(driveLastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
                <span className={`px-1.5 py-0.5 uppercase font-bold ${hasDriveAuth ? 'bg-white text-black' : 'border border-white/40 text-white/60'}`}>
                  {hasDriveAuth ? 'DRIVE_READY' : 'NEEDS_AUTH'}
                </span>
              </div>
            </div>

            <p className="text-[11px] opacity-75 leading-relaxed">
              Synchronize your schedule, stopwatch logs, and checkmarks across your iPhone, Android phone, and Desktop browser via your personal Google Drive (<code className="text-white">routine_tracker_sync.json</code>).
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                onClick={handleGoogleDriveSync}
                disabled={isDriveSyncing}
                className="flex-1 min-w-[200px] border-2 border-white bg-white text-black py-2.5 px-4 font-black text-xs uppercase hover:bg-white/90 transition-none cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isDriveSyncing ? (
                  <>
                    <span className="inline-block w-2 h-2 bg-black animate-ping" />
                    <span>SYNCING WITH DRIVE...</span>
                  </>
                ) : (
                  <>
                    <span>&gt;&gt; [SYNC &amp; BACKUP TO GOOGLE DRIVE] &lt;&lt;</span>
                  </>
                )}
              </button>

              <button
                onClick={handleGoogleDrivePull}
                disabled={isDriveSyncing}
                className="border border-white/70 bg-black text-white py-2.5 px-3 font-bold text-xs uppercase hover:bg-white hover:text-black transition-none cursor-pointer disabled:opacity-50"
                title="Pull latest backup file from Google Drive to this device"
              >
                [FETCH FROM DRIVE]
              </button>

              {hasDriveAuth && (
                <button
                  onClick={handleDisconnectDrive}
                  className="border border-white/30 text-white/60 py-2.5 px-2 text-[10px] uppercase hover:text-white hover:border-white transition-none cursor-pointer"
                >
                  [LOGOUT]
                </button>
              )}
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
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider opacity-80">
              <span>SAVED SNAPSHOT ARCHIVES ({snapshots.length})</span>
              <span className="text-[10px] opacity-60">KEPT IN PERSISTENT REGISTRY</span>
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
