import React, { useState } from 'react';
import { DayKey, DaySchedule, TaskItem } from '../types';
import {
  getAllUniqueRoutines,
  applyDeschedule,
  applySchedule,
  applyDelete,
  RecurringRoutineSummary,
} from '../utils/taskRecurrence';

interface RecurringRoutinesManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedules: Record<string, DaySchedule>;
  onUpdateSchedules: (newSchedules: Record<string, DaySchedule>) => void;
  onRefreshHistory: () => void;
  currentDayKey: DayKey;
}

export function RecurringRoutinesManagerModal({
  isOpen,
  onClose,
  schedules,
  onUpdateSchedules,
  onRefreshHistory,
  currentDayKey,
}: RecurringRoutinesManagerModalProps) {
  const [filter, setFilter] = useState<'all' | 'active' | 'parked'>('all');
  const [confirmDeleteTitle, setConfirmDeleteTitle] = useState<string | null>(null);

  if (!isOpen) return null;

  const allRoutines = getAllUniqueRoutines(schedules);

  const filtered = allRoutines.filter((r) => {
    if (filter === 'active') return !r.isAllDescheduled;
    if (filter === 'parked') return r.isAllDescheduled;
    return true;
  });

  const handleGlobalToggle = (routine: RecurringRoutineSummary) => {
    let updated: Record<string, DaySchedule>;
    if (routine.isAllDescheduled) {
      // Re-activate on all days
      updated = applySchedule(schedules, routine.sampleTask, 'all', currentDayKey);
    } else {
      // Park / Deschedule on all days
      updated = applyDeschedule(schedules, routine.sampleTask, 'all', currentDayKey);
    }
    onUpdateSchedules(updated);
    onRefreshHistory();
  };

  const handleToggleDay = (routine: RecurringRoutineSummary, dayKey: DayKey, currentSched: boolean) => {
    let updated: Record<string, DaySchedule>;
    if (currentSched) {
      updated = applyDeschedule(schedules, routine.sampleTask, 'today', dayKey);
    } else {
      updated = applySchedule(schedules, routine.sampleTask, 'today', dayKey);
    }
    onUpdateSchedules(updated);
    onRefreshHistory();
  };

  const handleDeleteForever = (routine: RecurringRoutineSummary) => {
    const updated = applyDelete(schedules, routine.sampleTask, 'all', currentDayKey);
    onUpdateSchedules(updated);
    onRefreshHistory();
    setConfirmDeleteTitle(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs font-mono text-white"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] flex flex-col border-2 border-white bg-black shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Terminal Header */}
        <div className="bg-white text-black px-4 py-2 flex items-center justify-between font-bold text-xs uppercase shrink-0">
          <div className="flex items-center gap-2">
            <span>_RECURRING_ROUTINES_MANAGER</span>
            <span className="text-[10px] opacity-75 font-normal">
              [{allRoutines.length} UNIQUE ROUTINES IN CYCLE]
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-black font-black text-xs hover:opacity-60 transition-none cursor-pointer"
          >
            [X]
          </button>
        </div>

        {/* Action bar / filters */}
        <div className="p-4 border-b border-white/20 bg-black flex flex-wrap items-center justify-between gap-3 shrink-0">
          <p className="text-xs opacity-75 max-w-md">
            Deschedule or delete recurring tasks globally so you don&apos;t have to manually remove them everyday.
          </p>

          <div className="flex items-center gap-1 text-xs">
            <span className="text-[10px] opacity-60 uppercase mr-1">VIEW:</span>
            {(['all', 'active', 'parked'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilter(mode)}
                className={`px-2 py-0.5 text-xs font-bold uppercase transition-none cursor-pointer border ${
                  filter === mode
                    ? 'bg-white text-black border-white'
                    : 'border-white/30 text-white/70 hover:border-white'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable routine list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filtered.length === 0 ? (
            <div className="p-8 border border-white/20 text-center text-xs opacity-60">
              NO ROUTINES MATCH THE SELECTED FILTER.
            </div>
          ) : (
            filtered.map((routine) => {
              const isDeleting = confirmDeleteTitle === routine.title;
              return (
                <div
                  key={routine.title}
                  className={`border p-3.5 space-y-3 transition-none ${
                    routine.isAllDescheduled
                      ? 'border-white/20 bg-white/5 opacity-60 hover:opacity-100'
                      : 'border-white bg-black'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-white">
                          {routine.title}
                        </span>
                        <span className="text-[10px] uppercase border border-white/30 px-1 py-0 opacity-75">
                          {routine.category}
                        </span>
                        <span className="text-xs font-mono opacity-60">
                          [{routine.timeSlot}]
                        </span>
                        <span className="text-[10px] opacity-60">
                          {routine.durationMinutes}m planned
                        </span>
                      </div>

                      {/* Status indicator */}
                      <div className="mt-1 flex items-center gap-2 text-[11px]">
                        {routine.isAllScheduled && (
                          <span className="text-white font-bold bg-white/20 px-1.5 py-0 text-[10px]">
                            ACTIVE EVERYWHERE
                          </span>
                        )}
                        {routine.isAllDescheduled && (
                          <span className="border border-white/40 text-white/60 px-1.5 py-0 text-[10px]">
                            PARKED GLOBALLY
                          </span>
                        )}
                        {routine.isPartiallyScheduled && (
                          <span className="bg-white text-black font-bold px-1.5 py-0 text-[10px]">
                            PARTIALLY SCHEDULED
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Global action buttons */}
                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <button
                        onClick={() => handleGlobalToggle(routine)}
                        className={`px-2.5 py-1 text-xs font-bold border transition-none cursor-pointer uppercase ${
                          routine.isAllDescheduled
                            ? 'bg-white text-black border-white'
                            : 'border-white/40 text-white hover:border-white'
                        }`}
                        title={
                          routine.isAllDescheduled
                            ? 'Activate this routine on all recurring days'
                            : 'Park / Deschedule this routine on all recurring days'
                        }
                      >
                        {routine.isAllDescheduled ? '[ACTIVATE ALL]' : '[DESCHEDULE ALL]'}
                      </button>

                      {!isDeleting ? (
                        <button
                          onClick={() => setConfirmDeleteTitle(routine.title)}
                          className="px-2 py-1 text-xs font-bold border border-white/30 text-white/70 hover:border-white hover:text-white transition-none cursor-pointer uppercase"
                          title="Delete permanently from all days"
                        >
                          [DELETE ALL]
                        </button>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDeleteForever(routine)}
                            className="px-2 py-1 text-xs font-black border-2 border-white bg-white text-black transition-none cursor-pointer uppercase"
                          >
                            [CONFIRM DELETE]
                          </button>
                          <button
                            onClick={() => setConfirmDeleteTitle(null)}
                            className="px-1.5 py-1 text-xs border border-white/40 text-white hover:bg-white hover:text-black cursor-pointer"
                          >
                            [NO]
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Day-by-Day Matrix Chips */}
                  <div className="pt-2 border-t border-white/10 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-[10px] opacity-60 uppercase mr-1">
                      DAYS SCHEDULED:
                    </span>
                    {(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as DayKey[]).map((dKey) => {
                      const dayRec = routine.days.find((d) => d.dayKey === dKey);
                      if (!dayRec) {
                        return (
                          <span
                            key={dKey}
                            className="px-1.5 py-0.5 border border-white/10 text-[10px] opacity-20 uppercase font-mono"
                          >
                            {dKey}
                          </span>
                        );
                      }

                      return (
                        <button
                          key={dKey}
                          onClick={() => handleToggleDay(routine, dKey, dayRec.isScheduled)}
                          className={`px-2 py-0.5 border text-[11px] font-bold uppercase transition-none cursor-pointer font-mono ${
                            dayRec.isScheduled
                              ? 'bg-white text-black border-white'
                              : 'border-white/30 text-white/50 line-through hover:text-white hover:border-white'
                          }`}
                          title={`Click to toggle ${dKey.toUpperCase()} scheduling`}
                        >
                          {dKey.toUpperCase()} {dayRec.isScheduled ? '✓' : '✗'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/20 bg-black flex items-center justify-between text-xs shrink-0">
          <div className="text-[11px] opacity-60">
            Changes save automatically to your persistent schedule.
          </div>
          <button
            onClick={onClose}
            className="border border-white bg-white text-black px-4 py-1 font-bold uppercase cursor-pointer"
          >
            [DONE]
          </button>
        </div>
      </div>
    </div>
  );
}
