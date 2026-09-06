import React, { useState } from 'react';

interface SyncChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncCode: string;
  onSetSyncCode: (newCode: string) => void;
  onFetchFromCloud: () => Promise<void>;
  onUploadToCloud: () => Promise<void>;
  isBusy: boolean;
  lastSyncTime?: string | null;
}

export function SyncChoiceModal({
  isOpen,
  onClose,
  syncCode,
  onSetSyncCode,
  onFetchFromCloud,
  onUploadToCloud,
  isBusy,
  lastSyncTime,
}: SyncChoiceModalProps) {
  const [isEditingCode, setIsEditingCode] = useState<boolean>(false);
  const [codeInput, setCodeInput] = useState<string>(syncCode);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(syncCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleSaveCustomCode = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = codeInput.trim().toUpperCase();
    if (clean) {
      onSetSyncCode(clean);
      setIsEditingCode(false);
      setFeedback(`[SYNC CODE UPDATED TO: ${clean}]`);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleFetchClick = async () => {
    const confirmFetch = window.confirm(
      `[CONFIRM FETCH FROM CLOUD]\n\nDo you wish to FETCH data from Google Drive (Sync Code: ${syncCode})?\n\nThis will download the cloud version and update this device's schedule and checkmarks.\n(A local safety backup will be saved in your archive first).`
    );
    if (!confirmFetch) return;

    try {
      await onFetchFromCloud();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fetch failed.';
      setFeedback(`FETCH FAILED: ${msg}`);
    }
  };

  const handleUploadClick = async () => {
    const confirmUpload = window.confirm(
      `[CONFIRM UPLOAD TO CLOUD]\n\nDo you wish to UPLOAD this device's data to Google Drive (Sync Code: ${syncCode})?\n\nThis will overwrite the cloud backup with your latest local schedule and checkmarks.`
    );
    if (!confirmUpload) return;

    try {
      await onUploadToCloud();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed.';
      setFeedback(`UPLOAD FAILED: ${msg}`);
    }
  };

  return (
    <div
      id="sync-choice-modal"
      className="fixed inset-0 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 z-50 font-mono text-white selection:bg-white selection:text-black animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-black border-2 border-white p-5 md:p-6 shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/20 pb-3">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 bg-white" />
            <h2 className="text-sm md:text-base font-bold uppercase tracking-wider">
              GOOGLE_DRIVE_SYNC_DISPATCH
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isBusy}
            className="border border-white/40 hover:border-white text-xs px-2 py-0.5 cursor-pointer disabled:opacity-50"
          >
            [ESC]
          </button>
        </div>

        {/* Sync Code Bar */}
        <div className="border border-white/30 bg-white/5 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-[10px] opacity-60 uppercase font-bold tracking-widest">
              ACTIVE SYNC CODE:
            </div>
            {!isEditingCode ? (
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-lg font-black tracking-widest text-white">
                  {syncCode}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="text-[10px] border border-white/40 px-1.5 py-0.5 hover:bg-white hover:text-black uppercase cursor-pointer"
                >
                  {copied ? '[COPIED!]' : '[COPY]'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCodeInput(syncCode);
                    setIsEditingCode(true);
                  }}
                  className="text-[10px] opacity-60 hover:opacity-100 underline uppercase cursor-pointer"
                >
                  change code
                </button>
              </div>
            ) : (
              <form onSubmit={handleSaveCustomCode} className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                  placeholder="ROUT-XXXX"
                  className="bg-black border border-white px-2 py-0.5 text-xs text-white uppercase font-bold w-28"
                  autoFocus
                />
                <button
                  type="submit"
                  className="border border-white bg-white text-black px-2 py-0.5 text-[10px] font-bold uppercase cursor-pointer"
                >
                  SAVE
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingCode(false)}
                  className="text-[10px] opacity-60 hover:opacity-100 uppercase cursor-pointer"
                >
                  CANCEL
                </button>
              </form>
            )}
          </div>

          {lastSyncTime && (
            <div className="text-[10px] opacity-60 font-mono sm:text-right">
              LAST SYNC: {new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>

        {feedback && (
          <div className="border border-white bg-white/10 p-2 text-xs font-bold text-center">
            {feedback}
          </div>
        )}

        {/* 2 Primary Choices */}
        <div className="space-y-3 pt-1">
          {/* Option 1: FETCH FROM CLOUD */}
          <button
            onClick={handleFetchClick}
            disabled={isBusy}
            className="w-full border-2 border-white bg-black hover:bg-white/15 p-4 text-left cursor-pointer transition-none disabled:opacity-50 group flex items-start gap-3"
          >
            <span className="text-xl font-bold leading-none mt-0.5 group-hover:translate-y-0.5 transition-transform">
              ⬇
            </span>
            <div className="flex-1 space-y-1">
              <div className="text-xs md:text-sm font-black uppercase tracking-wider flex items-center justify-between">
                <span>[FETCH FROM CLOUD] (PULL)</span>
                <span className="text-[10px] border border-white/50 px-1.5 py-0.2 font-normal opacity-80">
                  OPENING APP
                </span>
              </div>
              <p className="text-[11px] opacity-70 leading-relaxed">
                Download the latest routine, checkmarks, and time logs from Google Drive onto this device.
              </p>
              <div className="text-[10px] opacity-50 uppercase tracking-wide">
                → Use when you first open this device to get changes made on your other device.
              </div>
            </div>
          </button>

          {/* Option 2: UPLOAD TO CLOUD */}
          <button
            onClick={handleUploadClick}
            disabled={isBusy}
            className="w-full border-2 border-white bg-white text-black hover:bg-white/90 p-4 text-left cursor-pointer transition-none disabled:opacity-50 group flex items-start gap-3 shadow-md"
          >
            <span className="text-xl font-bold leading-none mt-0.5 group-hover:-translate-y-0.5 transition-transform">
              ⬆
            </span>
            <div className="flex-1 space-y-1">
              <div className="text-xs md:text-sm font-black uppercase tracking-wider flex items-center justify-between">
                <span>[UPLOAD TO CLOUD] (PUSH)</span>
                <span className="text-[10px] border border-black/50 px-1.5 py-0.2 font-normal opacity-80">
                  DONE EDITING
                </span>
              </div>
              <p className="text-[11px] opacity-80 leading-relaxed">
                Upload your current routine, checkmarks, and time logs from this device to Google Drive.
              </p>
              <div className="text-[10px] opacity-70 uppercase tracking-wide">
                → Use when you finish making changes on this device to update the cloud.
              </div>
            </div>
          </button>
        </div>

        {/* Footer info */}
        <div className="pt-2 border-t border-white/15 flex items-center justify-between text-[10px] opacity-60">
          <span>Both actions ask for confirmation before modifying anything.</span>
          <button
            onClick={onClose}
            disabled={isBusy}
            className="underline uppercase cursor-pointer hover:opacity-100"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
