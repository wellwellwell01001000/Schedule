import React, { useState, useMemo } from 'react';
import { DayKey, DaySchedule, TaskCategory } from '../types';
import { parseBulkText, ParsedTaskDraft, convertDraftsToTaskItems } from '../utils/bulkIngestParser';
import { sortTasksByStartTime } from '../utils/taskSorting';
import { syncDayActionToHistory } from '../data/historyStore';
import { setLocalLastModified } from '../services/driveVaultService';

interface BulkIngestModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDay: string;
  schedules: Record<string, DaySchedule>;
  onUpdateSchedules: (newSchedules: Record<string, DaySchedule>) => void;
  onRefreshHistory: () => void;
}

const ALL_DAYS: { id: DayKey; label: string }[] = [
  { id: 'mon', label: 'MON' },
  { id: 'tue', label: 'TUE' },
  { id: 'wed', label: 'WED' },
  { id: 'thu', label: 'THU' },
  { id: 'fri', label: 'FRI' },
  { id: 'sat', label: 'SAT' },
  { id: 'sun', label: 'SUN' },
];

const CATEGORIES: { id: TaskCategory; label: string }[] = [
  { id: 'workout', label: 'WORKOUT' },
  { id: 'cyber', label: 'CYBER' },
  { id: 'ml', label: 'ML' },
  { id: 'guitar', label: 'GUITAR' },
  { id: 'gamedev', label: 'GAMEDEV' },
  { id: 'college', label: 'COLLEGE' },
  { id: 'leisure', label: 'LEISURE' },
  { id: 'routine', label: 'ROUTINE' },
  { id: 'custom', label: 'CUSTOM' },
];

const EXAMPLE_BUFFER = `08:00 - 09:00 Morning Cold Shower & Protocol [daily]
09:00 - 11:30 Deep Architecture Review & CTF [mwf]
12:00 - 13:00 Physical Calibration: Zone 2 Workout [sat,sun,mon]
14:00 - 15:30 ML Neural Engine & Backpropagation [weekdays]
16:00 - 17:00 Electric Guitar Practice: Speed & Arpeggios [tts]
19:00 - 20:00 Fix auth token bug & Deploy [once]`;

export function BulkIngestModal({
  isOpen,
  onClose,
  selectedDay,
  schedules,
  onUpdateSchedules,
  onRefreshHistory,
}: BulkIngestModalProps) {
  const defaultDayKey = (selectedDay as DayKey) || 'mon';
  const [textBuffer, setTextBuffer] = useState<string>(EXAMPLE_BUFFER);
  const [editedDrafts, setEditedDrafts] = useState<ParsedTaskDraft[] | null>(null);

  // Parse drafts whenever buffer changes (unless manually fine-tuned)
  const parsedDrafts = useMemo(() => {
    return parseBulkText(textBuffer, defaultDayKey);
  }, [textBuffer, defaultDayKey]);

  const activeDrafts = editedDrafts ?? parsedDrafts;
  const validCount = activeDrafts.filter((d) => d.isValid).length;

  if (!isOpen) return null;

  const handleTextChange = (val: string) => {
    setTextBuffer(val);
    setEditedDrafts(null); // Reset manual tweaks to follow text
  };

  const handleToggleDraftDay = (draftIndex: number, dayKey: DayKey) => {
    const currentList = [...activeDrafts];
    const draft = { ...currentList[draftIndex] };
    const currentDays = [...draft.repeatDays];

    if (currentDays.includes(dayKey)) {
      if (currentDays.length > 1) {
        draft.repeatDays = currentDays.filter((d) => d !== dayKey);
      }
    } else {
      draft.repeatDays = [...currentDays, dayKey];
    }
    draft.isRepetitive = draft.repeatDays.length > 1 || draft.repeatDays[0] !== defaultDayKey;

    currentList[draftIndex] = draft;
    setEditedDrafts(currentList);
  };

  const handleChangeDraftCategory = (draftIndex: number, newCat: TaskCategory) => {
    const currentList = [...activeDrafts];
    currentList[draftIndex] = { ...currentList[draftIndex], category: newCat };
    setEditedDrafts(currentList);
  };

  const handleExecuteIngest = () => {
    const taskItems = convertDraftsToTaskItems(activeDrafts);
    if (taskItems.length === 0) return;

    const updatedSchedules: Record<string, DaySchedule> = { ...schedules };

    taskItems.forEach((task) => {
      const targetDays = task.isRepetitive && task.repeatDays && task.repeatDays.length > 0
        ? task.repeatDays
        : [defaultDayKey];

      targetDays.forEach((dKey) => {
        if (updatedSchedules[dKey]) {
          updatedSchedules[dKey] = {
            ...updatedSchedules[dKey],
            tasks: sortTasksByStartTime([...updatedSchedules[dKey].tasks, { ...task }]),
          };
        }
      });
    });

    onUpdateSchedules(updatedSchedules);
    setLocalLastModified();

    // Sync all modified days to history
    ALL_DAYS.forEach(({ id }) => {
      const dayTasks = updatedSchedules[id]?.tasks || [];
      try {
        const saved = localStorage.getItem(`alt_routine_completed_${id}`);
        const completedIds = saved ? JSON.parse(saved) : [];
        syncDayActionToHistory('2026-09-03', id, dayTasks, completedIds);
      } catch {
        // ignore
      }
    });

    onRefreshHistory();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/90 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-black border-2 border-white text-white font-mono p-4 md:p-6 space-y-5 shadow-2xl my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between border-b-2 border-white pb-3 gap-2">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-white inline-block animate-pulse" />
            <h2 className="text-base md:text-lg font-black uppercase tracking-wider">
              MULTI-LINE BULK INGEST ENGINE // 24-HOUR FORMAT
            </h2>
          </div>
          <button
            onClick={onClose}
            className="border border-white px-2.5 py-1 text-xs hover:bg-white hover:text-black transition-none cursor-pointer uppercase font-bold"
          >
            [ESC / CLOSE]
          </button>
        </div>

        {/* Recurrence Syntax Cheatsheet */}
        <div className="border border-white/30 p-3 bg-white/5 text-[11px] space-y-1.5">
          <div className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 bg-white" />
            <span>RECURRENCE & 24H SYNTAX CHEATSHEET:</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-white/80">
            <div>
              <p><span className="text-white font-bold">[daily]</span> or <span className="text-white font-bold">[everyday]</span> → Mon, Tue, Wed, Thu, Fri, Sat, Sun</p>
              <p><span className="text-white font-bold">[mwf]</span> → Mon, Wed, Fri</p>
              <p><span className="text-white font-bold">[weekdays]</span> or <span className="text-white font-bold">[m-f]</span> → Mon through Fri</p>
            </div>
            <div>
              <p><span className="text-white font-bold">[sat,sun,mon]</span> or <span className="text-white font-bold">[t,th]</span> → Specific customized days</p>
              <p><span className="text-white font-bold">[tts]</span> / <span className="text-white font-bold">[tth]</span> → Tue, Thu, Sat</p>
              <p><span className="text-white font-bold">[once]</span> → Only target day ({defaultDayKey.toUpperCase()})</p>
            </div>
          </div>
        </div>

        {/* Input Textarea Buffer */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <label className="font-bold text-white uppercase tracking-wide">
              _TEXT_BUFFER // PASTE ONE TASK PER LINE:
            </label>
            <span className="text-white/60 text-[11px]">
              24H TIME RANGE + TITLE + [TAG]
            </span>
          </div>
          <textarea
            value={textBuffer}
            onChange={(e) => handleTextChange(e.target.value)}
            rows={6}
            placeholder="08:00 - 09:00 Morning Review [daily]&#10;09:30 - 11:00 ML Model Training [mwf]&#10;12:00 - 13:00 Calisthenics & Run [sat,sun,mon]"
            className="w-full bg-black border-2 border-white/60 p-3 text-xs md:text-sm font-mono text-white focus:outline-none focus:border-white resize-y"
          />
        </div>

        {/* Live Parse Audit Table */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs border-b border-white/20 pb-1">
            <span className="font-bold uppercase tracking-wide text-white">
              _LIVE_PARSE_AUDIT // ({validCount} VALID TASKS DETECTED)
            </span>
            <span className="text-[10px] text-white/60">
              CLICK DAY CHIPS TO TOGGLE ACTIVE DAYS
            </span>
          </div>

          <div className="max-h-56 overflow-y-auto border border-white/40 divide-y divide-white/20">
            {activeDrafts.length === 0 ? (
              <div className="p-4 text-center text-xs text-white/50">
                NO TASKS ENTERED. TYPE OR PASTE LINES IN THE BUFFER ABOVE.
              </div>
            ) : (
              activeDrafts.map((draft, idx) => (
                <div
                  key={draft.id || idx}
                  className={`p-2.5 flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs transition-colors ${
                    draft.isValid ? 'bg-black hover:bg-white/5' : 'bg-red-950/30 border-red-500/50'
                  }`}
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold bg-white text-black px-1.5 py-0.5 text-[10px]">
                        {draft.timeSlot}
                      </span>
                      <span className="text-[10px] text-white/70">
                        ({draft.durationMinutes} min)
                      </span>
                      <select
                        value={draft.category}
                        onChange={(e) => handleChangeDraftCategory(idx, e.target.value as TaskCategory)}
                        className="bg-black border border-white/40 text-[10px] px-1 py-0.5 uppercase text-white font-bold cursor-pointer"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c.id} value={c.id}>
                            [{c.label}]
                          </option>
                        ))}
                      </select>
                      {draft.isRepetitive ? (
                        <span className="text-[10px] text-white/60">[RECURRING]</span>
                      ) : (
                        <span className="text-[10px] text-yellow-300/80">[ONCE]</span>
                      )}
                    </div>
                    <div className="font-bold text-white text-xs md:text-sm tracking-tight">
                      {draft.title || <span className="text-red-400">MISSING TITLE</span>}
                    </div>
                    {draft.errorMessage && (
                      <div className="text-[10px] text-red-400 font-bold">
                        ERR: {draft.errorMessage}
                      </div>
                    )}
                  </div>

                  {/* Day Selection Chips */}
                  <div className="flex items-center gap-1 flex-wrap">
                    {ALL_DAYS.map(({ id, label }) => {
                      const isActive = draft.repeatDays.includes(id);
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => handleToggleDraftDay(idx, id)}
                          className={`px-1.5 py-0.5 text-[10px] font-bold border transition-none cursor-pointer ${
                            isActive
                              ? 'bg-white text-black border-white'
                              : 'bg-black text-white/40 border-white/20 hover:border-white/60 hover:text-white'
                          }`}
                          title={`Toggle ${label}`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t-2 border-white">
          <div className="text-xs text-white/70">
            TOTAL BATCH: <span className="font-bold text-white">{validCount}</span> TASKS TO COMMIT
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTextBuffer(EXAMPLE_BUFFER)}
              className="border border-white/40 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10 hover:text-white transition-none cursor-pointer uppercase font-bold"
            >
              [LOAD EXAMPLE]
            </button>
            <button
              type="button"
              onClick={onClose}
              className="border border-white/40 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10 hover:text-white transition-none cursor-pointer uppercase font-bold"
            >
              [CANCEL]
            </button>
            <button
              type="button"
              onClick={handleExecuteIngest}
              disabled={validCount === 0}
              className="border-2 border-white bg-white text-black px-4 py-1.5 text-xs font-black uppercase hover:bg-white/90 disabled:opacity-40 transition-none cursor-pointer flex items-center gap-1.5 shadow-md"
            >
              <span>[EXECUTE BATCH INGEST ({validCount})]</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
