import React, { useEffect, useState } from 'react';
import { formatTerminalTimestamp, getDayKeyFromDate } from '../utils/ascii';
import { DaySchedule, ActiveTab } from '../types';

interface HeaderProps {
  activeView: ActiveTab;
  setActiveView: (view: ActiveTab) => void;
  selectedDay: string;
  setSelectedDay: (day: string) => void;
  schedules: Record<string, DaySchedule>;
  onOpenTemplates?: () => void;
  onOpenBackup?: () => void;
  onOpenTutorial?: () => void;
  onQuickDriveSync?: () => void;
  isSyncing?: boolean;
  syncCode?: string;
}

export function Header({
  activeView,
  setActiveView,
  selectedDay,
  schedules,
  onOpenTemplates,
  onOpenBackup,
  onOpenTutorial,
  onQuickDriveSync,
  isSyncing,
  syncCode,
}: HeaderProps) {
  const [timeStr, setTimeStr] = useState<string>(formatTerminalTimestamp());
  const todayKey = getDayKeyFromDate();
  const currentSchedule = schedules[selectedDay] || schedules[todayKey];

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeStr(formatTerminalTimestamp());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="border-b border-white pb-4 mb-6 bg-black text-white font-mono">
      {/* Top utility row: Title + Handy Sync to Cloud button + Day badge */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/20 pb-3 mb-4 gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 bg-white" />
            <h1 className="text-2xl font-bold tracking-tighter">ROUTINE_TRACKER.sh</h1>
          </div>
          <p className="text-xs opacity-60">
            BUILD: 2026.09.03 // ROUTINE_TRACKER_SYSTEM
          </p>
        </div>

        {/* Top Direct Cloud Sync & Status */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          {onQuickDriveSync && (
            <button
              onClick={onQuickDriveSync}
              disabled={isSyncing}
              className="border-2 border-white bg-white text-black px-3.5 py-1.5 text-xs hover:bg-white/90 transition-none cursor-pointer uppercase font-black flex items-center gap-2 disabled:opacity-50 shadow-md"
              title={`Google Drive Cloud Sync: Choose Fetch from Cloud or Upload to Cloud (Code: ${syncCode || 'ACTIVE'})`}
            >
              {isSyncing ? (
                <>
                  <span className="inline-block w-2 h-2 bg-black animate-ping" />
                  <span>SYNCING...</span>
                </>
              ) : (
                <>
                  <span className="text-sm leading-none font-bold">⇅</span>
                  <span>[SYNC]</span>
                  {syncCode && (
                    <span className="bg-black text-white px-1.5 py-0.5 text-[10px] font-mono tracking-wider">
                      {syncCode}
                    </span>
                  )}
                </>
              )}
            </button>
          )}

          <div className="text-left md:text-right flex flex-col md:items-end">
            <div className="bg-white text-black px-3 py-1 font-bold text-xs uppercase tracking-wide inline-block">
              {currentSchedule?.dayName?.toUpperCase() || 'MONDAY'}: {currentSchedule?.code || 'DAY'} ({currentSchedule?.categoryLabel?.toUpperCase() || 'ROUTINE'})
            </div>
            <div className="text-[10px] mt-1.5 opacity-50 uppercase tracking-widest flex items-center gap-2">
              <span>STATUS: ACTIVE_METRICS_LOGGING</span>
              <span>|</span>
              <span>{timeStr}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation tabs row: Only [1], [2], [3] */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap items-center gap-2" aria-label="Views">
          <button
            onClick={() => setActiveView('tracker')}
            className={`px-3 py-1 text-xs font-bold transition-none cursor-pointer border ${
              activeView === 'tracker'
                ? 'bg-white text-black border-white'
                : 'border-white/40 text-white/80 hover:border-white hover:text-white bg-black'
            }`}
          >
            [1] _TIMELINE_TRACKER
          </button>

          <button
            onClick={() => setActiveView('hierarchy')}
            className={`px-3 py-1 text-xs font-bold transition-none cursor-pointer border ${
              activeView === 'hierarchy'
                ? 'bg-white text-black border-white'
                : 'border-white/40 text-white/80 hover:border-white hover:text-white bg-black'
            }`}
          >
            [2] _HIERARCHY_METRICS
          </button>

          <button
            onClick={() => setActiveView('task_audit')}
            className={`px-3 py-1 text-xs font-bold transition-none cursor-pointer border ${
              activeView === 'task_audit'
                ? 'bg-white text-black border-white'
                : 'border-white/40 text-white/80 hover:border-white hover:text-white bg-black'
            }`}
          >
            [3] _TASK_TIME_AUDIT
          </button>
        </nav>

        <div className="flex items-center gap-2">
          {onOpenTemplates && (
            <button
              onClick={onOpenTemplates}
              className="border border-white bg-black px-2.5 py-1 text-xs text-white hover:bg-white hover:text-black transition-none cursor-pointer uppercase font-bold flex items-center gap-1.5"
              title="Switch between Clean Slate (0 tasks), Alternating Split, or custom templates"
            >
              <span className="inline-block w-1.5 h-1.5 bg-white" />
              <span>[TEMPLATES]</span>
            </button>
          )}

          {onOpenTutorial && (
            <button
              onClick={onOpenTutorial}
              className="border border-white/60 bg-black px-2.5 py-1 text-xs text-white hover:bg-white hover:text-black transition-none cursor-pointer uppercase font-bold flex items-center gap-1.5"
              title="Revisit the interactive system tutorial & guide"
            >
              <span className="inline-block w-1.5 h-1.5 bg-white animate-pulse" />
              <span>[TUTORIAL]</span>
            </button>
          )}

          {onOpenBackup && (
            <button
              onClick={onOpenBackup}
              className="border border-white/60 bg-black px-2.5 py-1 text-xs text-white hover:bg-white hover:text-black transition-none cursor-pointer uppercase font-bold flex items-center gap-1.5"
            >
              <span className="inline-block w-1.5 h-1.5 bg-white" />
              <span>[ARCHIVE]</span>
            </button>
          )}

          <div className="text-[10px] tracking-widest opacity-60 uppercase hidden md:block">
            MODE: <span className="text-white font-bold">MONOCHROME</span>
          </div>
        </div>
      </div>
    </header>
  );
}
