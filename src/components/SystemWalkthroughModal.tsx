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

  if (!isOpen) return null;

  const totalSteps = 5;

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
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 font-mono">
      <div className="border-2 border-white bg-black w-full max-w-2xl text-white shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-white text-black px-4 py-2.5 font-bold flex items-center justify-between border-b border-black">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 bg-black" />
            <span className="text-xs uppercase tracking-wider">
              _SYS_DIRECTIVE // SYSTEM_ONBOARDING_WALKTHROUGH
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] bg-black text-white px-2 py-0.5 font-black uppercase">
              STEP [{currentStep}/{totalSteps}]
            </span>
            <button
              onClick={handleComplete}
              className="text-xs font-black px-2 py-0.5 border border-black hover:bg-black hover:text-white transition-none cursor-pointer uppercase"
              title="Close and enter app"
            >
              [ESC / SKIP]
            </button>
          </div>
        </div>

        {/* Modal Body / Step Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
          {cleanedNotice && (
            <div className="border-2 border-white bg-white text-black p-3 font-bold text-center text-xs tracking-tight">
              ✓ ALL PLACEHOLDER DATA REMOVED. ZERO BASELINE ESTABLISHED!
            </div>
          )}

          {/* STEP 1: Alternating Schedule Framework */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="border-l-4 border-white pl-3 py-1">
                <span className="text-[10px] uppercase tracking-widest opacity-60">PHASE 01 // ARCHITECTURE</span>
                <h2 className="text-lg md:text-xl font-black uppercase tracking-tight text-white mt-0.5">
                  THE ALTERNATING ROUTINE BLUEPRINT
                </h2>
              </div>

              <p className="leading-relaxed opacity-85 text-justify">
                Standard calendars fracture your cognitive focus by cramming 6 different subjects into every day. 
                This system eliminates context-switching burnout by alternating your cognitive load:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="border border-white/40 p-3 bg-white/5 space-y-1.5">
                  <div className="font-bold text-white uppercase text-[11px] flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-white inline-block" />
                    <span>A-DAYS (MON / WED / FRI)</span>
                  </div>
                  <div className="text-[11px] opacity-75">
                    <strong>Creative &amp; Motor Split</strong>: Peak morning analytical focus (Machine Learning) paired with evening motor recovery (Guitar practice &amp; guilt-free gaming).
                  </div>
                </div>

                <div className="border border-white/40 p-3 bg-white/5 space-y-1.5">
                  <div className="font-bold text-white uppercase text-[11px] flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-white inline-block" />
                    <span>B-DAYS (TUE / THU)</span>
                  </div>
                  <div className="text-[11px] opacity-75">
                    <strong>Technical &amp; Systems Split</strong>: Morning Machine Learning paired with unbroken 90-minute evening Cybersecurity lab sessions.
                  </div>
                </div>
              </div>

              <div className="border border-white/20 p-2.5 bg-black text-[11px] opacity-70">
                &gt; Tap any day button (<code className="text-white">[MON]</code>, <code className="text-white">[TUE]</code>, etc.) at the top of the Timeline Tracker to inspect or modify the schedule for that day.
              </div>
            </div>
          )}

          {/* STEP 2: Active Time Tracking (Stopwatch & Pomodoro) */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="border-l-4 border-white pl-3 py-1">
                <span className="text-[10px] uppercase tracking-widest opacity-60">PHASE 02 // EXECUTION</span>
                <h2 className="text-lg md:text-xl font-black uppercase tracking-tight text-white mt-0.5">
                  REAL-TIME TIME TRACKING &amp; POMODORO
                </h2>
              </div>

              <p className="leading-relaxed opacity-85">
                Every task in your routine is interactive and feeds directly into your analytics without manual spreadsheets:
              </p>

              <div className="space-y-2.5">
                <div className="border border-white/30 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-white uppercase">[START TIMER] (LIVE STOPWATCH)</span>
                    <p className="opacity-70 text-[11px]">Starts a live seconds-counter for that specific task. Perfect when actively studying or practicing.</p>
                  </div>
                  <span className="shrink-0 border border-white px-2 py-0.5 font-bold uppercase bg-white text-black">
                    00:45:22
                  </span>
                </div>

                <div className="border border-white/30 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-white uppercase">[POMODORO] (DEEP FOCUS ENGINE)</span>
                    <p className="opacity-70 text-[11px]">Launches a dedicated focus loop with customizable intervals, audio chimes, and automatic minute logging upon completion.</p>
                  </div>
                  <span className="shrink-0 border border-white px-2 py-0.5 font-bold uppercase">
                    25m FOCUS
                  </span>
                </div>

                <div className="border border-white/30 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-white uppercase">[+15M] / [-15M] (QUICK LOG)</span>
                    <p className="opacity-70 text-[11px]">Quickly increment tracked minutes if you completed a session offline or away from your computer.</p>
                  </div>
                  <span className="shrink-0 border border-white px-2 py-0.5 font-bold uppercase">
                    +15 MINS
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Progress & Task Checkmarks */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="border-l-4 border-white pl-3 py-1">
                <span className="text-[10px] uppercase tracking-widest opacity-60">PHASE 03 // DISCIPLINE</span>
                <h2 className="text-lg md:text-xl font-black uppercase tracking-tight text-white mt-0.5">
                  CHECKMARKS, ASCII BARS &amp; CUSTOM TASKS
                </h2>
              </div>

              <div className="space-y-3">
                <div className="border border-white/40 p-3 bg-white/5 space-y-1">
                  <div className="font-bold text-white uppercase">1. MARKING TASKS COMPLETED [X]</div>
                  <p className="opacity-75 leading-relaxed text-[11px]">
                    Click the checkbox next to any task when finished. If you haven&apos;t run the timer, checking the box automatically logs the planned duration as completed time.
                  </p>
                </div>

                <div className="border border-white/40 p-3 bg-white/5 space-y-1">
                  <div className="font-bold text-white uppercase">2. REAL-TIME ASCII PROGRESS BAR</div>
                  <p className="opacity-75 leading-relaxed text-[11px]">
                    Watch your daily discipline percentage climb visually in real time:
                  </p>
                  <div className="font-mono text-xs border border-white/30 p-2 bg-black text-white">
                    [████████████░░░░░░░░░░] 60% [6/10 TASKS]
                  </div>
                  <p className="opacity-60 text-[10px]">
                    Click <strong>[COPY ASCII SUMMARY]</strong> to copy a formatted report to your clipboard to paste into notes or Discord.
                  </p>
                </div>

                <div className="border border-white/40 p-3 bg-white/5 space-y-1">
                  <div className="font-bold text-white uppercase">3. ADDING YOUR OWN TASKS</div>
                  <p className="opacity-75 leading-relaxed text-[11px]">
                    Click <strong>[+ ADD CUSTOM TASK]</strong> on any day to schedule custom coursework, project milestones, or specific workout routines.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Analytics & Audit Views */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="border-l-4 border-white pl-3 py-1">
                <span className="text-[10px] uppercase tracking-widest opacity-60">PHASE 04 // AUDIT</span>
                <h2 className="text-lg md:text-xl font-black uppercase tracking-tight text-white mt-0.5">
                  VIEWS [2] &amp; [3]: DRILLDOWN ANALYTICS &amp; TASK AUDIT
                </h2>
              </div>

              <p className="leading-relaxed opacity-85">
                Use the top navigation buttons or press <code className="text-white">[1]</code>, <code className="text-white">[2]</code>, <code className="text-white">[3]</code> on your keyboard:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="border border-white/30 p-3 space-y-1.5 bg-black">
                  <div className="font-bold text-white text-[11px] uppercase">[2] _HIERARCHY_METRICS</div>
                  <p className="opacity-75 text-[11px] leading-relaxed">
                    Drill down seamlessly through <strong>Months &rarr; Weeks &rarr; Days &rarr; Tasks</strong>. 
                    Inspect past-week vs. current-week pacing and compliance percentages.
                  </p>
                </div>

                <div className="border border-white/30 p-3 space-y-1.5 bg-black">
                  <div className="font-bold text-white text-[11px] uppercase">[3] _TASK_TIME_AUDIT</div>
                  <p className="opacity-75 text-[11px] leading-relaxed">
                    Audits exact lifetime hours invested per subject (e.g. Total ML hours vs. Guitar hours vs. Cybersecurity hours).
                  </p>
                </div>
              </div>

              <div className="border border-white/20 p-2.5 bg-white/5 text-[11px] opacity-80">
                ★ <strong>Genuine Tracking</strong>: Your analytics reflect only genuine minutes logged and tasks completed.
              </div>
            </div>
          )}

          {/* STEP 5: Persistence, Google Drive Sync & Reset to Clean */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div className="border-l-4 border-white pl-3 py-1">
                <span className="text-[10px] uppercase tracking-widest opacity-60">PHASE 05 // PERSISTENCE</span>
                <h2 className="text-lg md:text-xl font-black uppercase tracking-tight text-white mt-0.5">
                  SYNC, BACKUP &amp; YOUR CLEAN START
                </h2>
              </div>

              <div className="space-y-3">
                <div className="border border-white/40 p-3 space-y-1 bg-white/5">
                  <div className="font-bold text-white uppercase flex items-center gap-2">
                    <span className="w-2 h-2 bg-white inline-block" />
                    <span>[SYNC &amp; BACKUP] (GOOGLE DRIVE VAULT)</span>
                  </div>
                  <p className="opacity-75 text-[11px] leading-relaxed">
                    Click the <strong>[SYNC &amp; BACKUP]</strong> button in the top header anytime. 
                    It saves your full routine, logged minutes, and history directly into your Google Drive vault using a lightweight 6-character Sync Code.
                    No Google account logins or permission popups needed for users!
                  </p>
                </div>

                <div className="border-2 border-white p-3.5 space-y-2 bg-black">
                  <div className="font-bold text-white uppercase text-[11px] flex items-center justify-between">
                    <span>START WITH A CLEAN SLATE (0 LOGGED HOURS)</span>
                    <span className="text-[9px] bg-white text-black font-black px-1.5 py-0.5">RECOMMENDED</span>
                  </div>
                  <p className="opacity-75 text-[11px] leading-relaxed">
                    Remove all demo/placeholder hours and reset checkmarks so you can track 100% of your real effort starting today:
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
        <div className="bg-black border-t border-white p-3.5 flex items-center justify-between gap-3 text-xs">
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
