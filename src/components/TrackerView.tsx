import React, { useState, useEffect, useRef } from 'react';
import { TaskItem, TaskCategory, DayKey, DaySchedule, AsciiBarStyle } from '../types';
import { generateAsciiProgressBar, getDayKeyFromDate } from '../utils/ascii';
import { formatMinutes, syncDayActionToHistory } from '../data/historyStore';
import { PomodoroTimer } from './PomodoroTimer';
import {
  findRoutineMatches,
  applyDeschedule,
  applySchedule,
  applyDelete,
  descheduleAllForDay,
  restoreAllForDay,
  applyTaskEdit,
  TaskDayMatch,
} from '../utils/taskRecurrence';
import { sortTasksByStartTime } from '../utils/taskSorting';
import { RecurringTaskActionModal, TaskActionMode } from './RecurringTaskActionModal';
import { RecurringRoutinesManagerModal } from './RecurringRoutinesManagerModal';
import { EditTaskModal } from './EditTaskModal';
import { TaskTimeBlockPicker } from './TaskTimeBlockPicker';
import { setLocalLastModified } from '../services/driveVaultService';

interface TrackerViewProps {
  selectedDay: string;
  setSelectedDay: (day: string) => void;
  schedules: Record<string, DaySchedule>;
  onUpdateSchedules: (newSchedules: Record<string, DaySchedule>) => void;
  onRefreshHistory: () => void;
  onOpenTemplates?: () => void;
  onOpenBulkIngest?: () => void;
}

// Helper to parse time slot like "07:00 – 08:10" into start and end minutes from midnight
function parseSlotMinutes(timeStr: string): { start: number; end: number } | null {
  try {
    const parts = timeStr.split(/[-–—]/).map((s) => s.trim());
    if (parts.length !== 2) return null;
    const [startStr, endStr] = parts;
    const [startH, startM] = startStr.split(':').map(Number);
    const [endH, endM] = endStr.split(':').map(Number);
    if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return null;
    return { start: startH * 60 + startM, end: endH * 60 + endM };
  } catch {
    return null;
  }
}

// Helper to check if the current time falls inside a time slot like "07:00 – 08:10" or "19:15 - 20:45"
function isCurrentTimeInSlot(timeStr: string): boolean {
  const slot = parseSlotMinutes(timeStr);
  if (!slot) return false;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return currentMinutes >= slot.start && currentMinutes <= slot.end;
}


export function TrackerView({
  selectedDay,
  setSelectedDay,
  schedules,
  onUpdateSchedules,
  onRefreshHistory,
  onOpenTemplates,
  onOpenBulkIngest,
}: TrackerViewProps) {
  const currentSchedule = schedules[selectedDay] || schedules['mon'];
  const todayKey = getDayKeyFromDate();
  const isToday = selectedDay === todayKey;

  // Local storage persistence key for completed tasks
  const storageKey = `alt_routine_completed_${selectedDay}`;

  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [asciiStyle, setAsciiStyle] = useState<AsciiBarStyle>('blocks');
  const [barWidth, setBarWidth] = useState<number>(22);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Modal / Form state for Add Task
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<TaskCategory>('custom');
  const [newTimeSlot, setNewTimeSlot] = useState('19:00 – 20:00');
  const [newDuration, setNewDuration] = useState<number>(60);
  const [newDetails, setNewDetails] = useState('');
  const [newIsRepetitive, setNewIsRepetitive] = useState(true);
  const [newRepeatDays, setNewRepeatDays] = useState<DayKey[]>([selectedDay as DayKey]);
  const [newIsScheduled, setNewIsScheduled] = useState(true);

  // Recurring Task Action Modal state (Deschedule / Delete choices)
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionModalTask, setActionModalTask] = useState<TaskItem | null>(null);
  const [actionModalMode, setActionModalMode] = useState<TaskActionMode>('deschedule');
  const [actionModalMatches, setActionModalMatches] = useState<TaskDayMatch[]>([]);

  // Recurring Routines Manager Modal state & toast banner
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Edit Task Modal state
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Live Timer states: which task is currently running a live stopwatch
  const [activeTimerTaskId, setActiveTimerTaskId] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Reload completed tasks when day changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`alt_routine_completed_${selectedDay}`);
      setCompletedTaskIds(saved ? JSON.parse(saved) : []);
    } catch {
      setCompletedTaskIds([]);
    }
  }, [selectedDay]);

  // Stopwatch interval handler
  useEffect(() => {
    if (activeTimerTaskId) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [activeTimerTaskId]);

  // Save completed tasks and auto-sync with history
  const saveCompletion = (newIds: string[]) => {
    setCompletedTaskIds(newIds);
    try {
      localStorage.setItem(`alt_routine_completed_${selectedDay}`, JSON.stringify(newIds));
      setLocalLastModified();
    } catch {
      // ignore
    }

    // Sync to 2026-09-03
    const todayDateStr = '2026-09-03';
    syncDayActionToHistory(todayDateStr, selectedDay as DayKey, currentSchedule.tasks, newIds);
    onRefreshHistory();
  };

  const toggleTaskCompletion = (taskId: string) => {
    let updated: string[];
    if (completedTaskIds.includes(taskId)) {
      updated = completedTaskIds.filter((id) => id !== taskId);
    } else {
      updated = [...completedTaskIds, taskId];
    }
    saveCompletion(updated);
  };

  // Trigger Deschedule Request (shows prompt if recurring across days)
  const handleRequestDeschedule = (task: TaskItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const matches = findRoutineMatches(task, schedules);
    if (matches.length > 1 || task.isRepetitive) {
      setActionModalTask(task);
      setActionModalMode('deschedule');
      setActionModalMatches(matches);
      setActionModalOpen(true);
    } else {
      executeDeschedule(task, 'today');
    }
  };

  // Trigger Schedule / Restore Request (shows prompt if recurring across days)
  const handleRequestSchedule = (task: TaskItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const matches = findRoutineMatches(task, schedules);
    if (matches.length > 1 || task.isRepetitive) {
      setActionModalTask(task);
      setActionModalMode('schedule');
      setActionModalMatches(matches);
      setActionModalOpen(true);
    } else {
      executeSchedule(task, 'today');
    }
  };

  // Trigger Delete Request (shows prompt if recurring across days)
  const handleRequestDelete = (task: TaskItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const matches = findRoutineMatches(task, schedules);
    if (matches.length > 1 || task.isRepetitive) {
      setActionModalTask(task);
      setActionModalMode('delete');
      setActionModalMatches(matches);
      setActionModalOpen(true);
    } else {
      executeDelete(task, 'today');
    }
  };

  // Execute Deschedule (Today Only or All Days)
  const executeDeschedule = (task: TaskItem, scope: 'today' | 'all') => {
    const updatedSchedules = applyDeschedule(schedules, task, scope, selectedDay as DayKey);
    onUpdateSchedules(updatedSchedules);
    syncDayActionToHistory('2026-09-03', selectedDay as DayKey, updatedSchedules[selectedDay]?.tasks || [], completedTaskIds);
    onRefreshHistory();
    setActionModalOpen(false);

    const scopeText = scope === 'today' ? `for today (${currentSchedule.dayName})` : 'across ALL recurring days';
    setToastMessage(`[DESCHEDULED]: "${task.title}" parked ${scopeText}.`);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Execute Schedule / Restore (Today Only or All Days)
  const executeSchedule = (task: TaskItem, scope: 'today' | 'all') => {
    const updatedSchedules = applySchedule(schedules, task, scope, selectedDay as DayKey);
    onUpdateSchedules(updatedSchedules);
    syncDayActionToHistory('2026-09-03', selectedDay as DayKey, updatedSchedules[selectedDay]?.tasks || [], completedTaskIds);
    onRefreshHistory();
    setActionModalOpen(false);

    const scopeText = scope === 'today' ? `for today (${currentSchedule.dayName})` : 'across ALL recurring days';
    setToastMessage(`[RESTORED]: "${task.title}" activated ${scopeText}.`);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Execute Delete (Today Only or Delete Forever from All Days)
  const executeDelete = (task: TaskItem, scope: 'today' | 'all') => {
    if (activeTimerTaskId === task.id) {
      setActiveTimerTaskId(null);
      setTimerSeconds(0);
    }

    const updatedSchedules = applyDelete(schedules, task, scope, selectedDay as DayKey);
    const updatedCompleted = completedTaskIds.filter((id) => id !== task.id);
    onUpdateSchedules(updatedSchedules);
    saveCompletion(updatedCompleted);
    syncDayActionToHistory('2026-09-03', selectedDay as DayKey, updatedSchedules[selectedDay]?.tasks || [], updatedCompleted);
    onRefreshHistory();
    setActionModalOpen(false);

    const scopeText = scope === 'today' ? `from today (${currentSchedule.dayName})` : 'FOREVER across ALL schedule days';
    setToastMessage(`[DELETED]: "${task.title}" erased ${scopeText}.`);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Bulk: Deschedule all tasks for today
  const handleDescheduleAllToday = () => {
    const updated = descheduleAllForDay(schedules, selectedDay as DayKey);
    onUpdateSchedules(updated);
    syncDayActionToHistory('2026-09-03', selectedDay as DayKey, updated[selectedDay].tasks, completedTaskIds);
    onRefreshHistory();
    setToastMessage(`[ALL PARKED]: All active tasks for ${currentSchedule.dayName.toUpperCase()} moved to Parked.`);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Bulk: Restore all parked tasks for today
  const handleRestoreAllToday = () => {
    const updated = restoreAllForDay(schedules, selectedDay as DayKey);
    onUpdateSchedules(updated);
    syncDayActionToHistory('2026-09-03', selectedDay as DayKey, updated[selectedDay].tasks, completedTaskIds);
    onRefreshHistory();
    setToastMessage(`[ALL RESTORED]: All parked tasks for ${currentSchedule.dayName.toUpperCase()} restored to Active.`);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Adjust tracked time manually on task
  const handleAdjustTime = (taskId: string, deltaMinutes: number, e?: React.MouseEvent) => {
    e?.stopPropagation?.();
    const updatedTasks = currentSchedule.tasks.map((t) => {
      if (t.id === taskId) {
        const currentMins = t.timeSpentMinutes || 0;
        const newMins = Math.max(0, currentMins + deltaMinutes);
        return {
          ...t,
          timeSpentMinutes: newMins,
        };
      }
      return t;
    });

    const updatedSchedules = {
      ...schedules,
      [selectedDay]: {
        ...currentSchedule,
        tasks: updatedTasks,
      },
    };

    onUpdateSchedules(updatedSchedules);
    syncDayActionToHistory('2026-09-03', selectedDay as DayKey, updatedTasks, completedTaskIds);
    onRefreshHistory();
  };

  const handleOpenEditModal = (task: TaskItem, e?: React.MouseEvent) => {
    e?.stopPropagation?.();
    setEditingTask(task);
    setIsEditModalOpen(true);
  };

  const handleSaveTaskEdit = (
    updatedFields: Partial<TaskItem>,
    scope: 'today' | 'all',
    selectedRepeatDays?: DayKey[]
  ) => {
    if (!editingTask) return;
    const updatedSchedules = applyTaskEdit(
      schedules,
      editingTask,
      updatedFields,
      scope,
      selectedDay as DayKey,
      selectedRepeatDays
    );

    onUpdateSchedules(updatedSchedules);
    const dayTasks = updatedSchedules[selectedDay]?.tasks || [];
    syncDayActionToHistory('2026-09-03', selectedDay as DayKey, dayTasks, completedTaskIds);
    onRefreshHistory();

    setToastMessage(`[TASK UPDATED]: "${updatedFields.title || editingTask.title}" updated.`);
    setTimeout(() => setToastMessage(null), 4000);
    setEditingTask(null);
    setIsEditModalOpen(false);
  };

  // Toggle Live Timer
  const handleToggleTimer = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeTimerTaskId === taskId) {
      // Stopping timer: commit accumulated seconds to task minutes
      const additionalMinutes = Math.round(timerSeconds / 60);
      if (additionalMinutes > 0) {
        handleAdjustTime(taskId, additionalMinutes, e);
      }
      setActiveTimerTaskId(null);
      setTimerSeconds(0);
    } else {
      // If another timer was running, flush it
      if (activeTimerTaskId && timerSeconds > 0) {
        const mins = Math.round(timerSeconds / 60);
        if (mins > 0) {
          handleAdjustTime(activeTimerTaskId, mins, e);
        }
      }
      setActiveTimerTaskId(taskId);
      setTimerSeconds(0);
    }
  };

  // Add Task submit
  const handleAddTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newTaskId = `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newTask: TaskItem = {
      id: newTaskId,
      title: newTitle.trim(),
      category: newCategory,
      time: newTimeSlot.trim() || '19:00 – 20:00',
      durationMinutes: newDuration > 0 ? newDuration : 45,
      timeSpentMinutes: 0,
      details: newDetails.trim() || 'Custom created task item.',
      isScheduled: newIsScheduled,
      isRepetitive: newIsRepetitive,
      repeatDays: newIsRepetitive ? newRepeatDays : [selectedDay as DayKey],
      isCustom: true,
      oneTimeDate: newIsRepetitive ? undefined : '2026-09-03',
    };

    const targetDays = newIsRepetitive ? newRepeatDays : [selectedDay as DayKey];
    const updatedSchedules = { ...schedules };

    for (const dKey of targetDays) {
      if (updatedSchedules[dKey]) {
        updatedSchedules[dKey] = {
          ...updatedSchedules[dKey],
          tasks: sortTasksByStartTime([...updatedSchedules[dKey].tasks, { ...newTask }]),
        };
      }
    }

    onUpdateSchedules(updatedSchedules);
    syncDayActionToHistory('2026-09-03', selectedDay as DayKey, updatedSchedules[selectedDay].tasks, completedTaskIds);
    onRefreshHistory();

    // Reset form
    setNewTitle('');
    setNewDetails('');
    setIsAddingTask(false);
  };

  // Scheduled tasks count vs total - strictly sorted by start time
  const scheduledTasks = sortTasksByStartTime(currentSchedule.tasks.filter((t) => t.isScheduled !== false));
  const descheduledTasks = sortTasksByStartTime(currentSchedule.tasks.filter((t) => t.isScheduled === false));
  const completedCount = scheduledTasks.filter((t) => completedTaskIds.includes(t.id)).length;
  const totalTasks = scheduledTasks.length;
  const percentage = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  // Uncompleted scheduled tasks
  const pendingScheduledTasks = scheduledTasks.filter((t) => !completedTaskIds.includes(t.id));

  // Current real-time clock
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const currentTimeDisplay = `${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes()
  ).padStart(2, '0')}`;

  // 1. Check if user is currently running a live stopwatch on a task
  const runningTimerTask = activeTimerTaskId
    ? scheduledTasks.find((t) => t.id === activeTimerTaskId)
    : undefined;

  // 2. Check if real-time clock falls inside an uncompleted task's time slot
  const matchedSlotTask = isToday
    ? pendingScheduledTasks.find((t) => isCurrentTimeInSlot(t.time))
    : undefined;

  // 3. If no task actively matches right now, find the UPCOMING scheduled task:
  let upcomingTaskByTime: TaskItem | undefined;
  if (isToday) {
    const futurePending = pendingScheduledTasks
      .map((t) => ({ task: t, slot: parseSlotMinutes(t.time) }))
      .filter((item) => item.slot && item.slot.start >= currentMinutes)
      .sort((a, b) => a.slot!.start - b.slot!.start);

    if (futurePending.length > 0) {
      upcomingTaskByTime = futurePending[0].task;
    }
  }

  // Fallback next pending task in list sequence
  const fallbackNextTask = pendingScheduledTasks.length > 0 ? pendingScheduledTasks[0] : null;

  // Whether a task is actively occurring right now (clock is in its slot or stopwatch running)
  const isDirectlyInSession = !!(runningTimerTask || matchedSlotTask);

  // The task to display in Current Directive:
  // If actively in session, that task is focused.
  // When no task is scheduled at the present time, focus on the upcoming task!
  const currentFocusTask: TaskItem | null =
    runningTimerTask || matchedSlotTask || upcomingTaskByTime || fallbackNextTask;

  // Find the NEXT upcoming task after currentFocusTask:
  let nextUpcomingTask: TaskItem | null = null;
  if (currentFocusTask) {
    const focusIndex = pendingScheduledTasks.findIndex((t) => t.id === currentFocusTask.id);
    if (focusIndex !== -1 && focusIndex + 1 < pendingScheduledTasks.length) {
      nextUpcomingTask = pendingScheduledTasks[focusIndex + 1];
    } else if (focusIndex === -1 && pendingScheduledTasks.length > 0) {
      nextUpcomingTask = pendingScheduledTasks[0];
    }
  }

  const asciiBar = generateAsciiProgressBar(completedCount, totalTasks, barWidth, asciiStyle);

  const daysList = [
    { key: 'mon', label: 'MON', code: schedules.mon?.code || 'MON' },
    { key: 'tue', label: 'TUE', code: schedules.tue?.code || 'TUE' },
    { key: 'wed', label: 'WED', code: schedules.wed?.code || 'WED' },
    { key: 'thu', label: 'THU', code: schedules.thu?.code || 'THU' },
    { key: 'fri', label: 'FRI', code: schedules.fri?.code || 'FRI' },
    { key: 'sat', label: 'SAT', code: schedules.sat?.code || 'SAT' },
    { key: 'sun', label: 'SUN', code: schedules.sun?.code || 'SUN' },
  ];

  const copyAsciiReport = () => {
    const lines = [
      `=== ROUTINE TRACKER [${currentSchedule.dayName.toUpperCase()}] ===`,
      `CODE: ${currentSchedule.code} (${currentSchedule.categoryLabel})`,
      `PROGRESS: ${asciiBar} (${percentage}%)`,
      `SCHEDULED TASKS (${completedCount}/${totalTasks}):`,
      ...scheduledTasks.map((t) => {
        const isDone = completedTaskIds.includes(t.id);
        const timeLog = t.timeSpentMinutes ? `[${t.timeSpentMinutes}m spent]` : '';
        return `[${isDone ? 'DONE' : 'PENDING'}] ${t.time} | ${t.title} ${timeLog}`;
      }),
      ...(descheduledTasks.length > 0
        ? [
            `DESCHEDULED / PARKED (${descheduledTasks.length}):`,
            ...descheduledTasks.map((t) => `[DESCHEDULED] ${t.title}`),
          ]
        : []),
      `=== END REPORT ===`,
    ].join('\n');

    navigator.clipboard.writeText(lines).then(() => {
      setCopyFeedback('REPORT COPIED TO CLIPBOARD');
      setTimeout(() => setCopyFeedback(null), 2500);
    });
  };

  return (
    <div className="space-y-6 font-mono text-white">
      {/* Schedule Cycle Selector Banner */}
      <div className="border border-white bg-black">
        <div className="bg-white text-black text-xs px-4 py-1 font-bold flex items-center justify-between">
          <span>_SCHEDULE_CYCLE_SELECTOR</span>
          <span className="text-[10px] tracking-widest uppercase opacity-80">
            DAY-THEMED DISCIPLINE
          </span>
        </div>

        <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {daysList.map((d) => {
              const isActive = selectedDay === d.key;
              const isTodayButton = todayKey === d.key;
              return (
                <button
                  key={d.key}
                  onClick={() => setSelectedDay(d.key)}
                  className={`px-3 py-1 text-xs border transition-none cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'border-white bg-white text-black font-bold'
                      : 'border-white/40 bg-black text-white/80 hover:border-white hover:text-white'
                  }`}
                >
                  <span>{d.label}</span>
                  <span className={`text-[10px] ${isActive ? 'text-black/70' : 'text-white/60'}`}>
                    [{d.code}]
                  </span>
                  {isTodayButton && (
                    <span
                      className={`text-[9px] px-1 py-0 border font-bold ${
                        isActive ? 'border-black text-black' : 'border-white text-white'
                      }`}
                    >
                      TODAY
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedDay(todayKey)}
              className="border border-white/60 bg-black px-2.5 py-1 text-xs text-white hover:bg-white hover:text-black hover:border-white transition-none cursor-pointer font-bold uppercase"
            >
              [JUMP TO TODAY]
            </button>
            <button
              onClick={() => setIsManagerOpen(true)}
              className="border border-white/70 bg-black px-2.5 py-1 text-xs text-white hover:bg-white hover:text-black hover:border-white transition-none cursor-pointer font-bold uppercase"
              title="Manage and toggle recurring routines globally"
            >
              [RECURRING ROUTINES]
            </button>
            <button
              onClick={() => setIsAddingTask(!isAddingTask)}
              className="border border-white bg-white text-black px-3 py-1 text-xs font-bold transition-none cursor-pointer uppercase"
            >
              {isAddingTask ? '[CLOSE FORM]' : '[+ ADD TASK]'}
            </button>
          </div>
        </div>

        {/* Selected Day Info Sub-strip */}
        <div className="border-t border-white/20 px-4 py-2 bg-black flex flex-wrap items-center justify-between text-xs gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-white uppercase">{currentSchedule.dayName}</span>
            <span className="opacity-40">|</span>
            <span className="text-white/80">{currentSchedule.categoryLabel}</span>
            <span className="opacity-40">|</span>
            <span className="opacity-70">{currentSchedule.focusSummary}</span>
          </div>

          <div className="flex items-center gap-3 text-[11px] opacity-70">
            <span>{scheduledTasks.length} SCHEDULED</span>
            <span>•</span>
            <span>{descheduledTasks.length} PARKED</span>
          </div>
        </div>
      </div>

      {/* Action Notification Toast Banner */}
      {toastMessage && (
        <div className="border-2 border-white bg-white text-black p-3 text-xs font-bold flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2.5">
            <span className="inline-block w-2.5 h-2.5 bg-black animate-pulse" />
            <span className="font-mono tracking-tight">{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-[10px] font-black uppercase px-2 py-0.5 border border-black hover:bg-black hover:text-white cursor-pointer"
          >
            [DISMISS]
          </button>
        </div>
      )}

      {/* Inline Form: Add New Task */}
      {isAddingTask && (
        <div className="border-2 border-white bg-black p-4 md:p-6 space-y-4">
          <div className="border-b border-white pb-2 flex items-center justify-between">
            <span className="text-sm font-bold uppercase tracking-tight text-white">
              _NEW_TASK_SPECIFICATION // ADD TO SCHEDULE
            </span>
            <span className="text-[10px] opacity-60">TARGET DAY: {currentSchedule.dayName.toUpperCase()}</span>
          </div>

          <form onSubmit={handleAddTaskSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] opacity-70 uppercase font-bold block">
                  TASK TITLE *
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Deep Learning Architecture Review"
                  required
                  className="w-full bg-black border border-white/50 px-3 py-1.5 text-xs text-white focus:border-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] opacity-70 uppercase font-bold block">
                  CATEGORY
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as TaskCategory)}
                  className="w-full bg-black border border-white/50 px-3 py-1.5 text-xs text-white focus:border-white focus:outline-none uppercase"
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

            {/* Interactive Start & End Time Blocks with Synchronized Estimate */}
            <div className="space-y-1">
              <TaskTimeBlockPicker
                timeSlot={newTimeSlot}
                durationMinutes={newDuration}
                onChange={(newSlot, newDur) => {
                  setNewTimeSlot(newSlot);
                  setNewDuration(newDur);
                }}
              />
            </div>

            {/* Recurrence Type */}
            <div className="border border-white/20 p-3 bg-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] opacity-70 uppercase font-bold">
                  RECURRENCE TYPE:
                </span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      checked={newIsRepetitive}
                      onChange={() => setNewIsRepetitive(true)}
                      className="accent-white"
                    />
                    <span>REPETITIVE</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      checked={!newIsRepetitive}
                      onChange={() => setNewIsRepetitive(false)}
                      className="accent-white"
                    />
                    <span>ONE-TIME</span>
                  </label>
                </div>
              </div>
            </div>

            {/* If repetitive, choose which days */}
            {newIsRepetitive && (
              <div className="space-y-1.5 border border-white/20 p-3 bg-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] opacity-70 uppercase font-bold">
                    REPEAT ON DAYS:
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setNewRepeatDays(['mon', 'wed', 'fri'])}
                      className="border border-white/40 px-1.5 py-0.5 text-[10px] hover:bg-white hover:text-black"
                    >
                      A-DAYS (M/W/F)
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewRepeatDays(['tue', 'thu'])}
                      className="border border-white/40 px-1.5 py-0.5 text-[10px] hover:bg-white hover:text-black"
                    >
                      B-DAYS (T/TH)
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewRepeatDays(['sat', 'sun'])}
                      className="border border-white/40 px-1.5 py-0.5 text-[10px] hover:bg-white hover:text-black"
                    >
                      WEEKENDS
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as DayKey[]).map((d) => {
                    const isChecked = newRepeatDays.includes(d);
                    return (
                      <label
                        key={d}
                        className={`px-2 py-1 border text-xs cursor-pointer font-bold uppercase ${
                          isChecked ? 'bg-white text-black border-white' : 'border-white/30 text-white/70'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewRepeatDays([...newRepeatDays, d]);
                            } else {
                              setNewRepeatDays(newRepeatDays.filter((k) => k !== d));
                            }
                          }}
                          className="hidden"
                        />
                        {d.toUpperCase()}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] opacity-70 uppercase font-bold block">
                DETAILS &amp; NOTES
              </label>
              <textarea
                value={newDetails}
                onChange={(e) => setNewDetails(e.target.value)}
                placeholder="Specific instructions, neuroplastic focus, or resources..."
                rows={2}
                className="w-full bg-black border border-white/50 px-3 py-1.5 text-xs text-white focus:border-white focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/20">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newIsScheduled}
                  onChange={(e) => setNewIsScheduled(e.target.checked)}
                  className="accent-white"
                />
                <span className="font-bold">SCHEDULE IMMEDIATELY FOR TODAY</span>
              </label>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingTask(false)}
                  className="border border-white/40 px-3 py-1 text-xs text-white hover:bg-white hover:text-black"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="border border-white bg-white text-black px-4 py-1 text-xs font-bold hover:bg-white/90"
                >
                  SAVE &amp; COMMIT TASK
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Main Two-Column Editorial Grid */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Column: _TIMELINE_LOG */}
        <section className="flex-1 flex flex-col border border-white bg-black">
          <div className="bg-white text-black text-sm px-4 py-1 font-bold flex items-center justify-between">
            <span>_TIMELINE_LOG</span>
            <span className="text-xs opacity-75 font-mono font-normal">
              [{completedCount}/{totalTasks} COMPLETED]
            </span>
          </div>

          <div className="p-4 md:p-6 space-y-4 flex-1">
            {/* _CURRENT_DIRECTIVE: WHAT TO DO RIGHT NOW */}
            {currentFocusTask && !completedTaskIds.includes(currentFocusTask.id) ? (
              <div className="border-2 border-white bg-white text-black p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/20 pb-2">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block w-2.5 h-2.5 bg-black ${isDirectlyInSession ? 'animate-ping' : ''}`} />
                    <span className="text-xs font-black uppercase tracking-wider">
                      {isDirectlyInSession
                        ? '_CURRENT_DIRECTIVE // ACTIVE IN-PROGRESS'
                        : `_CURRENT_DIRECTIVE // STANDBY (NO TASK AT ${currentTimeDisplay})`}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest bg-black text-white px-2 py-0.5">
                    {activeTimerTaskId === currentFocusTask.id
                      ? 'STOPWATCH RUNNING'
                      : matchedSlotTask?.id === currentFocusTask.id
                      ? 'CURRENT TIME SLOT MATCH'
                      : 'NEXT UPCOMING TASK'}
                  </span>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base md:text-lg font-black tracking-tight">
                        {!isDirectlyInSession ? 'NEXT: ' : ''}{currentFocusTask.title}
                      </span>
                      <span className="text-[10px] uppercase border border-black px-1.5 py-0 font-bold">
                        {currentFocusTask.category}
                      </span>
                      <span className="text-xs font-mono font-bold">
                        [{currentFocusTask.time}]
                      </span>
                      <span className="text-xs font-mono font-bold bg-black text-white px-2 py-0.5">
                        {currentFocusTask.timeSpentMinutes || 0}m / {currentFocusTask.durationMinutes}m planned
                      </span>
                      {!isDirectlyInSession && (
                        <span className="bg-black text-white text-[9px] font-bold px-1.5 py-0 tracking-wider">
                          UPCOMING
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-black/80 font-mono leading-relaxed">
                      {currentFocusTask.details || 'No additional instructions logged.'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => handleToggleTimer(currentFocusTask.id, e)}
                      className={`px-3 py-1.5 text-xs font-bold border-2 border-black transition-none cursor-pointer uppercase ${
                        activeTimerTaskId === currentFocusTask.id
                          ? 'bg-black text-white animate-pulse'
                          : 'bg-transparent text-black hover:bg-black hover:text-white'
                      }`}
                    >
                      {activeTimerTaskId === currentFocusTask.id
                        ? `[STOPWATCH: ${Math.floor(timerSeconds / 60)}:${String(
                            timerSeconds % 60
                          ).padStart(2, '0')}]`
                        : !isDirectlyInSession
                        ? '[START EARLY]'
                        : '[START TIMER]'}
                    </button>

                    <button
                      onClick={() => toggleTaskCompletion(currentFocusTask.id)}
                      className="px-3 py-1.5 text-xs font-bold border-2 border-black bg-black text-white hover:bg-black/80 transition-none cursor-pointer uppercase"
                    >
                      [MARK DONE]
                    </button>

                    <button
                      onClick={(e) => handleOpenEditModal(currentFocusTask, e)}
                      className="px-2.5 py-1.5 text-xs font-bold border border-black hover:bg-black hover:text-white text-black transition-none cursor-pointer uppercase"
                      title="Edit this directive task"
                    >
                      [EDIT TASK]
                    </button>

                    <button
                      onClick={(e) => handleAdjustTime(currentFocusTask.id, 15, e)}
                      className="px-2 py-1.5 text-xs font-bold border border-black/40 hover:border-black text-black transition-none cursor-pointer"
                    >
                      +15m
                    </button>

                    <button
                      onClick={(e) => handleAdjustTime(currentFocusTask.id, -15, e)}
                      className="px-2 py-1.5 text-xs font-bold border border-black/40 hover:border-black text-black transition-none cursor-pointer"
                    >
                      -15m
                    </button>
                  </div>
                </div>

                {/* SHOW NEXT UPCOMING TASK BANNER */}
                {nextUpcomingTask && (
                  <div className="border-t border-black/20 pt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="bg-black text-white text-[9px] font-black px-1.5 py-0.5 tracking-wider">
                        {isDirectlyInSession ? 'NEXT:' : 'FOLLOWED BY:'}
                      </span>
                      <span className="font-bold text-black text-xs sm:text-sm tracking-tight">
                        {nextUpcomingTask.title}
                      </span>
                      <span className="font-mono text-black/70 text-xs font-bold">
                        [{nextUpcomingTask.time}]
                      </span>
                      <span className="text-[10px] uppercase border border-black/40 px-1 py-0 font-bold">
                        {nextUpcomingTask.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => handleOpenEditModal(nextUpcomingTask, e)}
                        className="border border-black/40 hover:border-black px-2 py-0.5 text-[10px] font-bold uppercase cursor-pointer text-black"
                        title="Edit next upcoming task"
                      >
                        [EDIT NEXT]
                      </button>
                      <button
                        onClick={(e) => handleToggleTimer(nextUpcomingTask.id, e)}
                        className="border border-black bg-transparent hover:bg-black hover:text-white px-2 py-0.5 text-[10px] font-bold uppercase cursor-pointer text-black"
                        title="Start timer on next task early"
                      >
                        [START EARLY]
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : scheduledTasks.length > 0 && completedCount === scheduledTasks.length ? (
              <div className="border border-white bg-black p-4 text-center space-y-1">
                <div className="text-xs font-bold text-white uppercase tracking-wider">
                  *** ALL SCHEDULED TASKS COMPLETED FOR {currentSchedule.dayName.toUpperCase()} ***
                </div>
                <p className="text-xs opacity-60">
                  Daily directive satisfied (100%). System standing by.
                </p>
              </div>
            ) : null}

            {/* SCHEDULED ACTIVE TASKS */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] opacity-60 uppercase font-bold tracking-wider">
                <span>ACTIVE SCHEDULED TASKS ({scheduledTasks.length})</span>
                {scheduledTasks.length > 0 && (
                  <button
                    onClick={handleDescheduleAllToday}
                    className="border border-white/40 px-2 py-0.5 text-[10px] text-white hover:bg-white hover:text-black cursor-pointer uppercase transition-none"
                    title="Park/deschedule all active tasks for today in 1 click"
                  >
                    [DESCHEDULE ALL TODAY]
                  </button>
                )}
              </div>

              {scheduledTasks.length === 0 ? (
                <div className="p-6 border border-white/20 text-center text-xs opacity-60">
                  NO TASKS CURRENTLY SCHEDULED FOR {currentSchedule.dayName.toUpperCase()}. USE [+ ADD TASK] ABOVE OR ACTIVATE PARKED TASKS BELOW.
                </div>
              ) : (
                scheduledTasks.map((task) => {
                  const isCompleted = completedTaskIds.includes(task.id);
                  const isInProgress = currentFocusTask?.id === task.id && !isCompleted;
                  const isTimerRunning = activeTimerTaskId === task.id;
                  const timeSpent = task.timeSpentMinutes || 0;
                  const matches = findRoutineMatches(task, schedules);
                  const isRecurringAcrossDays = matches.length > 1;

                  return (
                    <div
                      key={task.id}
                      className={`border p-3 space-y-2 transition-none ${
                        isCompleted
                          ? 'border-white/20 bg-black opacity-50'
                          : isInProgress
                          ? 'border-white bg-white/10 ring-1 ring-white'
                          : 'border-white/30 bg-black hover:border-white/60'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        {/* Status Checkbox & Title */}
                        <div
                          onClick={() => toggleTaskCompletion(task.id)}
                          className="flex items-start gap-2.5 cursor-pointer flex-1"
                        >
                          <span
                            className={`text-xs px-2 py-0.5 font-bold border shrink-0 ${
                              isCompleted
                                ? 'bg-white text-black border-white'
                                : isInProgress
                                ? 'border-white text-black bg-white'
                                : 'border-white/40 text-white/60'
                            }`}
                          >
                            {isCompleted ? '[DONE]' : isInProgress ? '[IN_PROGRESS]' : '[PENDING]'}
                          </span>

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`text-sm font-bold tracking-tight ${
                                  isCompleted ? 'line-through opacity-70' : 'text-white'
                                }`}
                              >
                                {task.title}
                              </span>

                              {isInProgress && (
                                <span className="bg-white text-black text-[9px] font-black px-1.5 py-0 tracking-wider">
                                  &gt;&gt; IN PROGRESS &lt;&lt;
                                </span>
                              )}

                              <span className="text-xs font-mono opacity-60">
                                [{task.time}]
                              </span>

                              <span className="text-[10px] uppercase border border-white/30 px-1 py-0 opacity-75">
                                {task.category}
                              </span>

                              {isRecurringAcrossDays ? (
                                <span
                                  className="border border-white/60 bg-white/10 px-1 py-0 text-[9px] text-white font-mono"
                                  title={`Recurring across ${matches.length} days: ${matches.map((m) => m.dayKey.toUpperCase()).join(', ')}`}
                                >
                                  RECURRING ({matches.length}D)
                                </span>
                              ) : (
                                <span className="text-[10px] uppercase opacity-50">
                                  {task.isRepetitive ? '[REPETITIVE]' : '[ONE-TIME]'}
                                </span>
                              )}

                              {task.highlight && (
                                <span className="bg-white text-black text-[9px] font-bold px-1 py-0">
                                  PRIORITY
                                </span>
                              )}
                            </div>

                            <p className="text-xs opacity-70 mt-1 leading-relaxed">
                              {task.details}
                            </p>
                          </div>
                        </div>

                        {/* Edit, Deschedule & Delete Actions */}
                        <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                          <button
                            onClick={(e) => handleOpenEditModal(task, e)}
                            className="border border-white/40 px-2 py-0.5 text-[10px] text-white hover:bg-white hover:text-black font-bold uppercase transition-none cursor-pointer"
                            title="Edit task specifications, category, time, or recurrence"
                          >
                            [EDIT]
                          </button>

                          <button
                            onClick={(e) => handleRequestDeschedule(task, e)}
                            className="border border-white/30 px-2 py-0.5 text-[10px] text-white hover:bg-white hover:text-black font-bold uppercase transition-none cursor-pointer"
                            title="Deschedule / park this task (today only or all days)"
                          >
                            [DESCHEDULE]
                          </button>

                          <button
                            onClick={(e) => handleRequestDelete(task, e)}
                            className="border border-white/30 px-2 py-0.5 text-[10px] text-white hover:bg-white hover:text-black font-bold uppercase transition-none cursor-pointer"
                            title="Delete task (today only or erase forever from all days)"
                          >
                            [DEL]
                          </button>
                        </div>
                      </div>

                      {/* TIME TRACKER CONTROLS FOR THIS TASK */}
                      <div className="border-t border-white/20 pt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] opacity-60 uppercase font-bold">
                            TIME TRACKED:
                          </span>
                          <span className="font-bold text-white font-mono">
                            {formatMinutes(timeSpent)} / {task.durationMinutes}m planned
                          </span>

                          {timeSpent >= task.durationMinutes && (
                            <span className="bg-white text-black text-[9px] font-bold px-1 py-0">
                              GOAL MET
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Live Timer button */}
                          <button
                            onClick={(e) => handleToggleTimer(task.id, e)}
                            className={`px-2 py-0.5 text-xs font-bold border transition-none cursor-pointer ${
                              isTimerRunning
                                ? 'bg-white text-black border-white animate-pulse'
                                : 'border-white/50 text-white hover:border-white'
                            }`}
                          >
                            {isTimerRunning
                              ? `[STOPWATCH: ${Math.floor(timerSeconds / 60)}:${String(
                                  timerSeconds % 60
                                ).padStart(2, '0')}]`
                              : '[START TIMER]'}
                          </button>

                          {/* Quick manual adjusters */}
                          <button
                            onClick={(e) => handleAdjustTime(task.id, 15, e)}
                            className="border border-white/30 px-1.5 py-0.5 text-[10px] text-white hover:bg-white hover:text-black cursor-pointer font-bold"
                          >
                            +15m
                          </button>
                          <button
                            onClick={(e) => handleAdjustTime(task.id, 30, e)}
                            className="border border-white/30 px-1.5 py-0.5 text-[10px] text-white hover:bg-white hover:text-black cursor-pointer font-bold"
                          >
                            +30m
                          </button>
                          <button
                            onClick={(e) => handleAdjustTime(task.id, -15, e)}
                            className="border border-white/30 px-1.5 py-0.5 text-[10px] text-white hover:bg-white hover:text-black cursor-pointer"
                          >
                            -15m
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* DESCHEDULED / PARKED TASKS SECTION */}
            {descheduledTasks.length > 0 && (
              <div className="space-y-2 pt-4 border-t border-white/20">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] opacity-60 uppercase font-bold tracking-wider">
                  <span>DESCHEDULED / PARKED TASKS ({descheduledTasks.length})</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleRestoreAllToday}
                      className="border border-white/40 px-2 py-0.5 text-[10px] text-white hover:bg-white hover:text-black cursor-pointer uppercase transition-none"
                      title="Restore all parked tasks back to active on today in 1 click"
                    >
                      [RESTORE ALL TODAY]
                    </button>
                    <span className="hidden sm:inline">CLICK [SCHEDULE] TO RESTORE</span>
                  </div>
                </div>

                <div className="divide-y divide-white/10 border border-white/20 bg-black">
                  {descheduledTasks.map((task) => {
                    const matches = findRoutineMatches(task, schedules);
                    const isRecurringAcrossDays = matches.length > 1;

                    return (
                      <div
                        key={task.id}
                        className="p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 opacity-65 hover:opacity-100 transition-none"
                      >
                        <div className="space-y-0.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-white line-through">
                              {task.title}
                            </span>
                            <span className="text-[10px] uppercase border border-white/30 px-1 py-0">
                              {task.category}
                            </span>
                            <span className="text-[10px] opacity-60 font-mono">
                              [{task.time}]
                            </span>
                            {isRecurringAcrossDays && (
                              <span
                                className="border border-white/40 px-1 py-0 text-[9px] text-white/80 font-mono"
                                title={`Recurs across ${matches.length} days: ${matches.map((m) => m.dayKey.toUpperCase()).join(', ')}`}
                              >
                                RECURRING ({matches.length}D)
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] opacity-60">{task.details}</p>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          <button
                            onClick={(e) => handleOpenEditModal(task, e)}
                            className="border border-white/40 px-2 py-0.5 text-[10px] text-white hover:bg-white hover:text-black cursor-pointer uppercase"
                            title="Edit this parked task"
                          >
                            [EDIT]
                          </button>
                          <button
                            onClick={(e) => handleRequestSchedule(task, e)}
                            className="border border-white bg-white text-black px-2 py-0.5 text-[10px] font-bold uppercase transition-none cursor-pointer"
                            title="Restore this task (today only or across all days)"
                          >
                            [SCHEDULE]
                          </button>
                          <button
                            onClick={(e) => handleRequestDelete(task, e)}
                            className="border border-white/40 px-2 py-0.5 text-[10px] text-white hover:bg-white hover:text-black cursor-pointer uppercase"
                            title="Delete task (today only or erase forever from all days)"
                          >
                            [DEL]
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Quick interactive action strip at bottom of timeline */}
          <div className="border-t border-white/20 p-3 bg-black flex flex-wrap items-center justify-between text-xs gap-2">
            <div className="opacity-60 text-[11px]">
              SCHEDULED: {scheduledTasks.length} | PARKED: {descheduledTasks.length}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => saveCompletion(scheduledTasks.map((t) => t.id))}
                className="border border-white/40 bg-black px-2 py-1 text-xs text-white hover:bg-white hover:text-black transition-none cursor-pointer"
              >
                [MARK ALL DONE]
              </button>
              <button
                onClick={() => saveCompletion([])}
                className="border border-white/40 bg-black px-2 py-1 text-xs text-white hover:bg-white hover:text-black transition-none cursor-pointer"
              >
                [RESET DAY]
              </button>
            </div>
          </div>
        </section>

        {/* Right Column: _SYSTEM_STATS & TIME LOGGED SUMMARY */}
        <section className="w-full lg:w-80 flex flex-col gap-6">
          {/* Card 1: _PROGRESS_METER */}
          <div className="border border-white bg-black">
            <div className="bg-white text-black text-xs px-4 py-1 font-bold flex items-center justify-between">
              <span>_PROGRESS_METER</span>
              <span className="text-[10px] font-mono">{percentage}%</span>
            </div>

            <div className="p-4 space-y-4">
              <div className="space-y-1">
                <div className="text-[10px] opacity-60 uppercase font-bold">ASCII METRIC:</div>
                <div className="font-mono text-xs font-bold text-white select-all overflow-x-auto">
                  {asciiBar}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs border-t border-white/20 pt-3">
                <div>
                  <span className="opacity-50 text-[10px] uppercase block">Scheduled:</span>
                  <span className="font-bold text-white">{scheduledTasks.length} tasks</span>
                </div>
                <div>
                  <span className="opacity-50 text-[10px] uppercase block">Completed:</span>
                  <span className="font-bold text-white">
                    {completedCount} / {totalTasks}
                  </span>
                </div>
              </div>

              {/* ASCII style switcher */}
              <div className="border-t border-white/20 pt-3 space-y-2">
                <div className="text-[10px] opacity-60 uppercase font-bold">METER FORMAT:</div>
                <div className="grid grid-cols-4 gap-1">
                  {(['blocks', 'equals', 'hashes', 'pipes'] as AsciiBarStyle[]).map((style) => (
                    <button
                      key={style}
                      onClick={() => setAsciiStyle(style)}
                      className={`text-[10px] py-1 border font-mono transition-none cursor-pointer uppercase ${
                        asciiStyle === style
                          ? 'border-white bg-white text-black font-bold'
                          : 'border-white/30 text-white/70 hover:border-white hover:text-white'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={copyAsciiReport}
                className="w-full border border-white bg-black py-1.5 text-xs text-white hover:bg-white hover:text-black transition-none cursor-pointer font-bold uppercase tracking-wider"
              >
                {copyFeedback ? `[${copyFeedback}]` : '[COPY ASCII STATUS]'}
              </button>
            </div>
          </div>

          {/* Card 2: _POMODORO_SESSION_ENGINE */}
          <PomodoroTimer
            scheduledTasks={scheduledTasks}
            activeFocusTaskId={currentFocusTask?.id}
            onLogMinutesToTask={(taskId, mins) => {
              handleAdjustTime(taskId, mins);
            }}
          />
        </section>
      </div>

      {/* Action Modal: Scope-based Deschedule / Delete / Restore Prompt */}
      <RecurringTaskActionModal
        isOpen={actionModalOpen}
        onClose={() => setActionModalOpen(false)}
        task={actionModalTask}
        mode={actionModalMode}
        currentDayKey={selectedDay as DayKey}
        currentDayName={currentSchedule.dayName}
        matchingDays={actionModalMatches}
        onConfirm={(scope) => {
          if (!actionModalTask) return;
          if (actionModalMode === 'deschedule') {
            executeDeschedule(actionModalTask, scope);
          } else if (actionModalMode === 'delete') {
            executeDelete(actionModalTask, scope);
          } else if (actionModalMode === 'schedule') {
            executeSchedule(actionModalTask, scope);
          }
        }}
      />

      {/* Global Recurring Routines Manager Modal */}
      <RecurringRoutinesManagerModal
        isOpen={isManagerOpen}
        onClose={() => setIsManagerOpen(false)}
        schedules={schedules}
        onUpdateSchedules={onUpdateSchedules}
        onRefreshHistory={onRefreshHistory}
        currentDayKey={selectedDay as DayKey}
      />

      {/* Edit Task Specification Modal */}
      <EditTaskModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingTask(null);
        }}
        task={editingTask}
        currentDayKey={selectedDay as DayKey}
        currentDayName={currentSchedule.dayName}
        schedules={schedules}
        onSave={handleSaveTaskEdit}
      />
    </div>
  );
}
