import React, { useState, useEffect } from 'react';
import { TaskItem, TaskCategory, DayKey, DaySchedule } from '../types';
import { findRoutineMatches, TaskDayMatch } from '../utils/taskRecurrence';

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: TaskItem | null;
  currentDayKey: DayKey;
  currentDayName: string;
  schedules: Record<string, DaySchedule>;
  onSave: (
    updatedFields: Partial<TaskItem>,
    scope: 'today' | 'all',
    selectedRepeatDays?: DayKey[]
  ) => void;
}

export function EditTaskModal({
  isOpen,
  onClose,
  task,
  currentDayKey,
  currentDayName,
  schedules,
  onSave,
}: EditTaskModalProps) {
  const [title, setTitle] = useState('');
  const [category, setNewCategory] = useState<TaskCategory>('custom');
  const [timeSlot, setTimeSlot] = useState('');
  const [duration, setDuration] = useState<number>(45);
  const [details, setDetails] = useState('');
  const [isRepetitive, setIsRepetitive] = useState(true);
  const [repeatDays, setRepeatDays] = useState<DayKey[]>([currentDayKey]);
  const [isScheduled, setIsScheduled] = useState(true);
  const [scope, setScope] = useState<'today' | 'all'>('all');
  const [matchingDays, setMatchingDays] = useState<TaskDayMatch[]>([]);

  useEffect(() => {
    if (!task || !isOpen) return;

    setTitle(task.title || '');
    setNewCategory(task.category || 'custom');
    setTimeSlot(task.time || '');
    setDuration(task.durationMinutes || 45);
    setDetails(task.details || '');
    setIsRepetitive(task.isRepetitive !== false);
    setIsScheduled(task.isScheduled !== false);

    const matches = findRoutineMatches(task, schedules);
    setMatchingDays(matches);

    const existingDays = matches.map((m) => m.dayKey);
    setRepeatDays(existingDays.length > 0 ? existingDays : [currentDayKey]);

    // If it recurs on multiple days, default scope to 'all' or 'today'
    setScope(matches.length > 1 ? 'all' : 'today');
  }, [task, isOpen, currentDayKey, schedules]);

  if (!isOpen || !task) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const updatedFields: Partial<TaskItem> = {
      title: title.trim(),
      category,
      time: timeSlot.trim() || task.time,
      durationMinutes: duration > 0 ? duration : 45,
      details: details.trim(),
      isRepetitive,
      isScheduled,
    };

    onSave(updatedFields, scope, isRepetitive ? repeatDays : [currentDayKey]);
    onClose();
  };

  const dayAbbrevs = matchingDays.map((m) => m.dayKey.toUpperCase()).join(', ');
  const hasMultipleDays = matchingDays.length > 1;

  const allWeekDays: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs font-mono text-white"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl border-2 border-white bg-black shadow-2xl space-y-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-white text-black px-4 py-2 font-bold flex items-center justify-between text-xs tracking-wider">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 bg-black" />
            <span>_EDIT_TASK_SPECIFICATION // {task.title.toUpperCase()}</span>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-black hover:text-white px-1.5 py-0.5 text-[10px] font-bold cursor-pointer"
          >
            [ESC / CLOSE]
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4 text-xs">
          {/* Title & Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] opacity-70 uppercase font-bold block">
                TASK TITLE *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full bg-black border border-white/60 px-3 py-1.5 text-xs text-white focus:border-white focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] opacity-70 uppercase font-bold block">
                CATEGORY
              </label>
              <select
                value={category}
                onChange={(e) => setNewCategory(e.target.value as TaskCategory)}
                className="w-full bg-black border border-white/60 px-3 py-1.5 text-xs text-white focus:border-white focus:outline-none uppercase"
              >
                <option value="ml">MACHINE LEARNING (ML)</option>
                <option value="cyber">CYBERSECURITY (CYBER)</option>
                <option value="gamedev">GAME DEVELOPMENT (GAMEDEV)</option>
                <option value="guitar">GUITAR &amp; MUSIC</option>
                <option value="workout">WORKOUT / PHYSICAL</option>
                <option value="college">COLLEGE / LAB</option>
                <option value="leisure">GAMING / LEISURE</option>
                <option value="routine">ROUTINE / HABIT</option>
                <option value="custom">CUSTOM INITIATIVE</option>
              </select>
            </div>
          </div>

          {/* Time Slot & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] opacity-70 uppercase font-bold block">
                TIME SLOT (E.G. 07:00 – 08:30)
              </label>
              <input
                type="text"
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
                placeholder="19:00 – 20:00"
                className="w-full bg-black border border-white/60 px-3 py-1.5 text-xs text-white focus:border-white focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] opacity-70 uppercase font-bold block">
                PLANNED DURATION (MINUTES)
              </label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value, 10) || 0)}
                min={5}
                max={480}
                className="w-full bg-black border border-white/60 px-3 py-1.5 text-xs text-white focus:border-white focus:outline-none"
              />
            </div>
          </div>

          {/* Details / Notes */}
          <div className="space-y-1">
            <label className="text-[11px] opacity-70 uppercase font-bold block">
              DETAILS &amp; NOTES
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Instructions, study goals, or resources..."
              rows={2}
              className="w-full bg-black border border-white/60 px-3 py-1.5 text-xs text-white focus:border-white focus:outline-none"
            />
          </div>

          {/* Recurrence & Repeat Days */}
          <div className="border border-white/20 p-3 space-y-3 bg-white/5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] opacity-70 uppercase font-bold">
                RECURRENCE TYPE:
              </span>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    checked={isRepetitive}
                    onChange={() => setIsRepetitive(true)}
                    className="accent-white"
                  />
                  <span>REPETITIVE</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    checked={!isRepetitive}
                    onChange={() => setIsRepetitive(false)}
                    className="accent-white"
                  />
                  <span>ONE-TIME</span>
                </label>
              </div>
            </div>

            {isRepetitive && (
              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between text-[10px] opacity-70 uppercase">
                  <span>ACTIVE ON DAYS:</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setRepeatDays(['mon', 'wed', 'fri'])}
                      className="border border-white/40 px-1 py-0 hover:bg-white hover:text-black"
                    >
                      M/W/F
                    </button>
                    <button
                      type="button"
                      onClick={() => setRepeatDays(['tue', 'thu'])}
                      className="border border-white/40 px-1 py-0 hover:bg-white hover:text-black"
                    >
                      TUE/THU
                    </button>
                    <button
                      type="button"
                      onClick={() => setRepeatDays(allWeekDays)}
                      className="border border-white/40 px-1 py-0 hover:bg-white hover:text-black"
                    >
                      ALL 7 DAYS
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {allWeekDays.map((d) => {
                    const isChecked = repeatDays.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          if (isChecked) {
                            if (repeatDays.length > 1) {
                              setRepeatDays(repeatDays.filter((k) => k !== d));
                            }
                          } else {
                            setRepeatDays([...repeatDays, d]);
                          }
                        }}
                        className={`px-2 py-1 text-[10px] font-bold border ${
                          isChecked
                            ? 'bg-white text-black border-white'
                            : 'border-white/30 text-white/60 hover:border-white'
                        }`}
                      >
                        {d.toUpperCase()}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Scope Selector if recurring on multiple days */}
          {hasMultipleDays && (
            <div className="border-2 border-white/50 p-3 bg-white/5 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider block text-white">
                UPDATE SCOPE (THIS ROUTINE RECURS ON {dayAbbrevs})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setScope('today')}
                  className={`p-2 border text-left cursor-pointer ${
                    scope === 'today'
                      ? 'border-white bg-white text-black font-bold'
                      : 'border-white/30 text-white/70 hover:border-white'
                  }`}
                >
                  <div className="font-bold uppercase">[THIS DAY ONLY]</div>
                  <div className="text-[10px] opacity-80">
                    Apply updates to {currentDayName.toUpperCase()} only.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setScope('all')}
                  className={`p-2 border text-left cursor-pointer ${
                    scope === 'all'
                      ? 'border-white bg-white text-black font-bold'
                      : 'border-white/30 text-white/70 hover:border-white'
                  }`}
                >
                  <div className="font-bold uppercase">[ALL RECURRING DAYS]</div>
                  <div className="text-[10px] opacity-80">
                    Update all {matchingDays.length} days ({dayAbbrevs}).
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Scheduled vs Parked checkbox */}
          <div className="flex items-center justify-between pt-2 border-t border-white/20">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isScheduled}
                onChange={(e) => setIsScheduled(e.target.checked)}
                className="accent-white"
              />
              <span className="font-bold text-white">ACTIVE SCHEDULE STATUS</span>
            </label>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="border border-white/40 px-3 py-1 text-xs text-white hover:bg-white hover:text-black cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="submit"
                className="border border-white bg-white text-black px-4 py-1 text-xs font-bold hover:bg-white/90 cursor-pointer"
              >
                SAVE CHANGES
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
