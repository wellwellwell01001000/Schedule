import React, { useState } from 'react';

interface SystemWalkthroughModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPurgeAndStartClean?: () => void;
}

export function SystemWalkthroughModal({
  isOpen,
  onClose,
  onPurgeAndStartClean,
}: SystemWalkthroughModalProps) {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [cleanedNotice, setCleanedNotice] = useState<boolean>(false);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const target = e.target as HTMLElement | null;
        if (target && (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)) {
          target.blur();
        }
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const totalSteps = 6;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    try {
      localStorage.setItem('routine_tracker_tutorial_seen_v1', 'true');
    } catch {
      // ignore
    }
    onClose();
  };

  const handlePurge = () => {
    if (onPurgeAndStartClean) {
      onPurgeAndStartClean();
      setCleanedNotice(true);
      setTimeout(() => setCleanedNotice(false), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 font-mono select-none">
      <div className="border-2 border-white bg-black w-full max-w-2xl text-white shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-white text-black px-4 py-2.5 font-bold flex items-center justify-between border-b border-black shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-block w-2.5 h-2.5 bg-black shrink-0" />
            <span className="text-xs uppercase tracking-wider truncate">
              _SYS_DIRECTIVE // MASTER_SYSTEM_WALKTHROUGH
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-[10px] bg-black text-white px-2 py-0.5 font-black uppercase font-mono">
              STEP [{currentStep}/{totalSteps}]
            </span>
            <button
              onClick={handleComplete}
              className="text-xs font-black px-2 py-0.5 border border-black hover:bg-black hover:text-white transition-none cursor-pointer uppercase"
              title="Close and enter application"
            >
              [ESC / SKIP]
            </button>
          </div>
        </div>

        {/* Modal Body / Step Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {cleanedNotice && (
            <div className="border-2 border-white bg-white text-black p-3 font-bold text-center text-xs tracking-tight">
              ✓ ALL PLACEHOLDER DATA REMOVED. ZERO BASELINE ESTABLISHED!
            </div>
          )}

          {/* STEP 1: Alternating Schedule Framework & Day Cycle */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="border-l-4 border-white pl-3 py-1">
                <span className="text-[10px] uppercase tracking-widest opacity-60">STEP 01 // ARCHITECTURE</span>
                <h2 className="text-lg md:text-xl font-black uppercase tracking-tight text-white mt-0.5">
                  ALTERNATING ROUTINES &amp; DAY NAVIGATION
                </h2>
              </div>

              <p className="leading-relaxed opacity-85">
                Standard calendars cause cognitive burnout by cramming too many disparate subjects into a single day. 
                This system rotates your cognitive load across alternating focus days:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="border border-white/40 p-3 bg-white/5 space-y-1.5">
                  <div className="font-bold text-white uppercase text-[11px] flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-white inline-block" />
                    <span>A-DAYS (MON / WED / FRI)</span>
                  </div>
                  <div className="text-[11px] opacity-75 leading-relaxed">
                    <strong>Creative &amp; Analytical Split</strong>: Morning Machine Learning paired with evening Guitar practice &amp; recovery.
                  </div>
                </div>

                <div className="border border-white/40 p-3 bg-white/5 space-y-1.5">
                  <div className="font-bold text-white uppercase text-[11px] flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-white inline-block" />
                    <span>B-DAYS (TUE / THU)</span>
                  </div>
                  <div className="text-[11px] opacity-75 leading-relaxed">
                    <strong>Systems &amp; Technical Split</strong>: Morning Machine Learning paired with unbroken 90-minute evening Cybersecurity lab sessions.
                  </div>
                </div>
              </div>

              <div className="border border-white/30 p-3 bg-black space-y-2">
                <div className="font-bold text-white uppercase text-[11px]">DAY NAVIGATION CONTROLS:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] opacity-80">
                  <div>• Tap <code className="text-white bg-white/10 px-1">[MON]</code>..<code className="text-white bg-white/10 px-1">[SUN]</code> tabs at top</div>
                  <div>• Press <code className="text-white bg-white/10 px-1">[ [ ]</code> / <code className="text-white bg-white/10 px-1">[ ] ]</code> to cycle days</div>
                  <div>• Click <code className="text-white bg-white/10 px-1">[TODAY]</code> or press <code className="text-white bg-white/10 px-1">[T]</code></div>
                  <div>• Repetitive vs One-Time Date Scoping</div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Active Time Tracking & Custom Sound Effects */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="border-l-4 border-white pl-3 py-1">
                <span className="text-[10px] uppercase tracking-widest opacity-60">STEP 02 // EXECUTION &amp; SOUNDS</span>
                <h2 className="text-lg md:text-xl font-black uppercase tracking-tight text-white mt-0.5">
                  TIME TRACKING, POMODORO &amp; AUDIO EFFECTS
                </h2>
              </div>

              <p className="leading-relaxed opacity-85">
                Every task is interactive and feeds directly into your analytics without manual spreadsheets:
              </p>

              <div className="space-y-2.5">
                <div className="border border-white/30 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-white uppercase">[START TIMER] (LIVE STOPWATCH / [SPACE])</span>
                    <p className="opacity-70 text-[11px]">Starts a live seconds-counter on active directive tasks.</p>
                  </div>
                  <span className="shrink-0 border border-white px-2 py-0.5 font-bold uppercase bg-white text-black">
                    00:45:22
                  </span>
                </div>

                <div className="border border-white/30 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-white uppercase">[POMODORO ENGINE / [P] / [R]]</span>
                    <p className="opacity-70 text-[11px]">Focus loops (25m / 50m) attached to scheduled tasks with auto minute logging upon completion or pause.</p>
                  </div>
                  <span className="shrink-0 border border-white px-2 py-0.5 font-bold uppercase">
                    25m FOCUS
                  </span>
                </div>

                <div className="border border-white/30 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-white uppercase">[+15M] / [-15M] (QUICK LOG / REDUCE / [L] / [J])</span>
                    <p className="opacity-70 text-[11px]">Quickly increment (+15m) or reduce (-15m) tracked minutes, floored safely at 0m.</p>
                  </div>
                  <span className="shrink-0 border border-white px-2 py-0.5 font-bold uppercase">
                    +15M / -15M
                  </span>
                </div>

                <div className="border border-white/40 p-3 bg-white/5 space-y-1">
                  <div className="font-bold text-white uppercase flex items-center justify-between">
                    <span>★ CUSTOM AUDIO EFFECTS (OPTION B)</span>
                    <span className="text-[9px] bg-white text-black font-black px-1.5 py-0.5">SETTINGS [4] SOUNDS</span>
                  </div>
                  <p className="opacity-75 leading-relaxed text-[11px]">
                    Upload your own audio files (<code className="text-white">.mp3</code>, <code className="text-white">.wav</code>) or paste direct audio URLs in <strong>Settings [S] &rarr; [4] SOUNDS</strong> for Task Completion, Focus Complete, and Break Complete. Web Audio API chimes automatically act as fallbacks.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Task Management, Parking, Bulk Ingest & Search */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="border-l-4 border-white pl-3 py-1">
                <span className="text-[10px] uppercase tracking-widest opacity-60">STEP 03 // DISCIPLINE</span>
                <h2 className="text-lg md:text-xl font-black uppercase tracking-tight text-white mt-0.5">
                  CHECKMARKS, PARKING, BULK INGEST &amp; SEARCH
                </h2>
              </div>

              <div className="space-y-3">
                <div className="border border-white/40 p-3 bg-white/5 space-y-1">
                  <div className="font-bold text-white uppercase flex items-center justify-between">
                    <span>1. MARKING TASKS COMPLETED [X]</span>
                    <span className="font-mono text-[10px] opacity-60">HOTKEY: [X]</span>
                  </div>
                  <p className="opacity-75 leading-relaxed text-[11px]">
                    Check off tasks when finished. Unworked completed tasks log planned minutes automatically, while active timer tasks log actual elapsed minutes.
                  </p>
                </div>

                <div className="border border-white/40 p-3 bg-white/5 space-y-1">
                  <div className="font-bold text-white uppercase flex items-center justify-between">
                    <span>2. PARKING / DESCHEDULING TASKS</span>
                    <span className="font-mono text-[10px] opacity-60">[PARK] / [RESTORE]</span>
                  </div>
                  <p className="opacity-75 leading-relaxed text-[11px]">
                    Skip tasks without deleting them! Park a task for <strong>Today Only</strong> or <strong>Across All Days</strong>. Reactivate them anytime from the Parked Inventory or the <strong>[RECURRING ROUTINES]</strong> manager.
                  </p>
                </div>

                <div className="border border-white/40 p-3 bg-white/5 space-y-1">
                  <div className="font-bold text-white uppercase flex items-center justify-between">
                    <span>3. TASK CREATION &amp; BULK INGEST [N] / [B]</span>
                    <span className="font-mono text-[10px] opacity-60">HOTKEYS: [N] &amp; [B]</span>
                  </div>
                  <p className="opacity-75 leading-relaxed text-[11px]">
                    Press <code className="text-white">[N]</code> to slide open the top New Task specification panel, or press <code className="text-white">[B]</code> to paste a multi-line batch schedule. Press <code className="text-white">[/]</code> anytime for instant search &amp; query filtering.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Settings Console & Customizable Hotkeys */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="border-l-4 border-white pl-3 py-1">
                <span className="text-[10px] uppercase tracking-widest opacity-60">STEP 04 // CONFIGURATION</span>
                <h2 className="text-lg md:text-xl font-black uppercase tracking-tight text-white mt-0.5">
                  SETTINGS CONSOLE &amp; CUSTOM HOTKEY EDITOR
                </h2>
              </div>

              <p className="leading-relaxed opacity-85">
                Press <code className="text-white">[S]</code> from anywhere to open the System Settings Console with 6 organized tabs:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="border border-white/30 p-2.5 bg-black">
                  <strong className="text-white">[1] SYSTEM</strong>: Interactive shortcut customizer, tutorial, and zero baseline purge.
                </div>
                <div className="border border-white/30 p-2.5 bg-black">
                  <strong className="text-white">[2] CATEGORIES</strong>: Category definitions, colors, and badge labels.
                </div>
                <div className="border border-white/30 p-2.5 bg-black">
                  <strong className="text-white">[3] CLOUD SYNC</strong>: Google Drive Vault URL &amp; 6-character Sync Code pairing.
                </div>
                <div className="border border-white/30 p-2.5 bg-black">
                  <strong className="text-white">[4] SOUNDS</strong>: Audio customizer for uploaded files and URL sound clips.
                </div>
                <div className="border border-white/30 p-2.5 bg-black">
                  <strong className="text-white">[5] ARCHIVE</strong>: Point-in-time snapshots and JSON backup imports.
                </div>
                <div className="border border-white/30 p-2.5 bg-black">
                  <strong className="text-white">[6] TEMPLATES</strong>: Built-in routine templates and custom routine presets.
                </div>
              </div>

              <div className="border border-white/40 p-3 bg-white/5 space-y-1">
                <div className="font-bold text-white uppercase text-[11px]">★ CUSTOMIZABLE KEYBOARD SHORTCUTS</div>
                <p className="opacity-75 leading-relaxed text-[11px]">
                  Go to <strong>Settings [S] &rarr; [1] SYSTEM</strong> to rebind any shortcut. Click <code className="text-white">[EDIT]</code> and press your preferred key, or click <code className="text-white">[RESET ALL TO DEFAULTS]</code> to restore factory hotkeys anytime.
                </p>
              </div>
            </div>
          )}

          {/* STEP 5: Analytics & Lifetime Task Audit */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div className="border-l-4 border-white pl-3 py-1">
                <span className="text-[10px] uppercase tracking-widest opacity-60">STEP 05 // AUDIT</span>
                <h2 className="text-lg md:text-xl font-black uppercase tracking-tight text-white mt-0.5">
                  VIEWS [1], [2], [3]: TIMELINE, METRICS &amp; AUDIT
                </h2>
              </div>

              <p className="leading-relaxed opacity-85">
                Switch views instantly with single-key shortcuts <code className="text-white">[1]</code>, <code className="text-white">[2]</code>, <code className="text-white">[3]</code>:
              </p>

              <div className="space-y-2.5">
                <div className="border border-white/30 p-3 bg-black space-y-1">
                  <div className="font-bold text-white text-[11px] uppercase">[1] _TIMELINE_TRACKER</div>
                  <p className="opacity-75 text-[11px] leading-relaxed">
                    Daily execution dashboard, live timers, Pomodoro focus engine, task checkmarks, and ASCII progress bar summaries.
                  </p>
                </div>

                <div className="border border-white/30 p-3 bg-black space-y-1">
                  <div className="font-bold text-white text-[11px] uppercase">[2] _HIERARCHY_METRICS</div>
                  <p className="opacity-75 text-[11px] leading-relaxed">
                    Multi-level analytical drilldown through <strong>Months &rarr; Weeks &rarr; Days &rarr; Tasks</strong> with compliance percentages and week-over-week pacing comparison.
                  </p>
                </div>

                <div className="border border-white/30 p-3 bg-black space-y-1">
                  <div className="font-bold text-white text-[11px] uppercase">[3] _TASK_TIME_AUDIT</div>
                  <p className="opacity-75 text-[11px] leading-relaxed">
                    Lifetime aggregate hours ledger per task/subject (e.g. Total ML hours vs. Guitar hours vs. Cybersecurity hours) with selective audit removal.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: Cloud Sync, Persistence & Clean Slate */}
          {currentStep === 6 && (
            <div className="space-y-4">
              <div className="border-l-4 border-white pl-3 py-1">
                <span className="text-[10px] uppercase tracking-widest opacity-60">STEP 06 // PERSISTENCE</span>
                <h2 className="text-lg md:text-xl font-black uppercase tracking-tight text-white mt-0.5">
                  GOOGLE DRIVE CLOUD SYNC &amp; ZERO BASELINE
                </h2>
              </div>

              <div className="space-y-3">
                <div className="border border-white/40 p-3 space-y-1 bg-white/5">
                  <div className="font-bold text-white uppercase flex items-center justify-between">
                    <span>[SYNC &amp; BACKUP] (GOOGLE DRIVE VAULT / [U])</span>
                    <span className="font-mono text-[10px] opacity-60">HOTKEY: [U]</span>
                  </div>
                  <p className="opacity-75 text-[11px] leading-relaxed">
                    Press <code className="text-white">[U]</code> or click <strong>[SYNC]</strong> in the header. Sync your schedule and logged minutes across desktop, laptop, and phone using a private 6-character Sync Code and Google Drive Webhook. No third-party accounts required!
                  </p>
                </div>

                <div className="border-2 border-white p-3.5 space-y-2 bg-black">
                  <div className="font-bold text-white uppercase text-[11px] flex items-center justify-between">
                    <span>START WITH A CLEAN SLATE (0 LOGGED HOURS)</span>
                    <span className="text-[9px] bg-white text-black font-black px-1.5 py-0.5">RECOMMENDED</span>
                  </div>
                  <p className="opacity-75 text-[11px] leading-relaxed">
                    Purge sample/placeholder hours and reset checkmarks so you can track 100% of your real effort starting today:
                  </p>
                  <button
                    onClick={handlePurge}
                    className="w-full border-2 border-white bg-white text-black hover:bg-white/80 py-2 px-3 font-black text-xs uppercase cursor-pointer transition-none flex items-center justify-center gap-2"
                  >
                    <span>[WIPE SAMPLE DATA &amp; START AT ZERO]</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Navigation Footer */}
        <div className="bg-black border-t border-white p-3.5 flex items-center justify-between gap-3 text-xs shrink-0 font-mono">
          <button
            onClick={handlePrev}
            disabled={currentStep === 1}
            className="border border-white/50 px-3 py-1.5 font-bold uppercase hover:border-white disabled:opacity-30 disabled:hover:border-white/50 cursor-pointer"
          >
            &lt;&lt; [PREV]
          </button>

          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalSteps }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx + 1)}
                className={`w-3 h-3 border transition-none cursor-pointer ${
                  currentStep === idx + 1
                    ? 'bg-white border-white'
                    : 'bg-black border-white/40 hover:border-white'
                }`}
                title={`Jump to step ${idx + 1}`}
              />
            ))}
          </div>

          {currentStep < totalSteps ? (
            <button
              onClick={handleNext}
              className="border-2 border-white bg-white text-black px-4 py-1.5 font-black uppercase hover:bg-white/90 cursor-pointer"
            >
              [NEXT] &gt;&gt;
            </button>
          ) : (
            <button
              onClick={handleComplete}
              className="border-2 border-white bg-white text-black px-4 py-1.5 font-black uppercase hover:bg-white/90 cursor-pointer"
            >
              [FINISH &amp; ENTER] ✓
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
