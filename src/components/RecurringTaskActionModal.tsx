import React, { useEffect } from 'react';
import { TaskItem, DayKey } from '../types';
import { TaskDayMatch } from '../utils/taskRecurrence';

export type TaskActionMode = 'deschedule' | 'delete' | 'schedule';

interface RecurringTaskActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: TaskItem | null;
  mode: TaskActionMode;
  currentDayKey: DayKey;
  currentDayName: string;
  matchingDays: TaskDayMatch[];
  onConfirm: (scope: 'today' | 'all') => void;
}

export function RecurringTaskActionModal({
  isOpen,
  onClose,
  task,
  mode,
  currentDayKey,
  currentDayName,
  matchingDays,
  onConfirm,
}: RecurringTaskActionModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === '1') onConfirm('today');
      if (e.key === '2') onConfirm('all');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onConfirm]);

  if (!isOpen || !task) return null;

  const dayAbbrevs = matchingDays.map((m) => m.dayKey.toUpperCase()).join(', ');
  const matchCount = matchingDays.length;

  const modeConfig = {
    deschedule: {
      title: '_DESCHEDULE_RECURRING_TASK',
      todayLabel: `[1] DESCHEDULE FOR TODAY ONLY (${currentDayName.toUpperCase()})`,
      todayDesc: `Parks this task for today only. It remains active on other recurring days (${dayAbbrevs}).`,
      allLabel: `[2] DESCHEDULE ACROSS ALL DAYS (${matchCount} DAYS)`,
      allDesc: `Parks this task across all days (${dayAbbrevs}). It will not clutter your daily active schedule.`,
      allButtonClass: 'border-2 border-white bg-black text-white hover:bg-white hover:text-black',
    },
    delete: {
      title: '_REMOVE_OR_DELETE_FOREVER',
      todayLabel: `[1] REMOVE FOR TODAY ONLY (${currentDayName.toUpperCase()})`,
      todayDesc: `Deletes the task from today's schedule only. Other days remain intact.`,
      allLabel: `[2] DELETE FOREVER FROM ALL DAYS (${matchCount} DAYS)`,
      allDesc: `Permanently erases this routine from Monday through Sunday. You will NEVER have to delete it manually everyday again.`,
      allButtonClass: 'border-2 border-white bg-white text-black hover:bg-black hover:text-white',
    },
    schedule: {
      title: '_RESTORE_RECURRING_TASK',
      todayLabel: `[1] RESTORE FOR TODAY ONLY (${currentDayName.toUpperCase()})`,
      todayDesc: `Re-activates this task only on today's schedule.`,
      allLabel: `[2] RESTORE ON ALL DAYS (${matchCount} DAYS)`,
      allDesc: `Re-activates this recurring routine on all days it recurs on (${dayAbbrevs}).`,
      allButtonClass: 'border-2 border-white bg-black text-white hover:bg-white hover:text-black',
    },
  }[mode];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs font-mono text-white"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg border-2 border-white bg-black shadow-2xl space-y-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Terminal Title Bar */}
        <div className="bg-white text-black px-4 py-2 flex items-center justify-between font-bold text-xs uppercase">
          <span>{modeConfig.title}</span>
          <button
            onClick={onClose}
            className="text-black font-black text-xs hover:opacity-60 transition-none cursor-pointer"
          >
            [X]
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Target Task Summary */}
          <div className="border border-white/30 p-3 bg-white/5 space-y-1.5">
            <div className="text-[10px] opacity-60 uppercase font-bold">
              TARGET ROUTINE:
            </div>
            <div className="text-sm font-bold text-white tracking-wide">
              {task.title}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] opacity-80 pt-0.5">
              <span className="font-mono">[{task.time}]</span>
              <span className="border border-white/30 px-1 uppercase text-[10px]">
                {task.category}
              </span>
              <span>{task.durationMinutes}m planned</span>
            </div>
            <div className="text-[11px] text-white/90 pt-1 border-t border-white/10 mt-1">
              <span className="opacity-60">RECURS ON ({matchCount} DAYS):</span>{' '}
              <span className="font-bold underline">{dayAbbrevs}</span>
            </div>
          </div>

          <div className="text-xs opacity-70">
            Choose how you want to apply this action:
          </div>

          {/* Action Choice Buttons */}
          <div className="space-y-3">
            {/* Choice 1: Today Only */}
            <button
              onClick={() => onConfirm('today')}
              className="w-full text-left p-3 border border-white/50 bg-black hover:border-white hover:bg-white/10 transition-none cursor-pointer group"
            >
              <div className="text-xs font-bold text-white flex items-center justify-between">
                <span>{modeConfig.todayLabel}</span>
                <span className="text-[10px] opacity-60 group-hover:opacity-100">[KEY 1]</span>
              </div>
              <p className="text-[11px] opacity-70 mt-1 leading-relaxed">
                {modeConfig.todayDesc}
              </p>
            </button>

            {/* Choice 2: All Days */}
            <button
              onClick={() => onConfirm('all')}
              className={`w-full text-left p-3 transition-none cursor-pointer group ${modeConfig.allButtonClass}`}
            >
              <div className="text-xs font-bold flex items-center justify-between">
                <span>{modeConfig.allLabel}</span>
                <span className="text-[10px] opacity-60 group-hover:opacity-100">[KEY 2]</span>
              </div>
              <p className="text-[11px] opacity-80 mt-1 leading-relaxed">
                {modeConfig.allDesc}
              </p>
            </button>
          </div>

          {/* Cancel */}
          <div className="pt-2 flex justify-end">
            <button
              onClick={onClose}
              className="border border-white/40 px-4 py-1.5 text-xs text-white hover:bg-white hover:text-black uppercase font-bold transition-none cursor-pointer"
            >
              [CANCEL / ESC]
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
