import { DayKey, DaySchedule, TaskItem } from '../types';

/**
 * Checks if two tasks represent the same logical recurring routine.
 * Matches by explicit ID, or by normalized title + category.
 */
export function isSameRoutine(a: TaskItem, b: TaskItem): boolean {
  if (a.id === b.id) return true;
  const titleA = a.title.trim().toLowerCase();
  const titleB = b.title.trim().toLowerCase();
  return titleA === titleB && a.category === b.category;
}

export interface TaskDayMatch {
  dayKey: DayKey;
  dayName: string;
  task: TaskItem;
}

/**
 * Finds all days where this routine appears in the full weekly schedule.
 */
export function findRoutineMatches(
  targetTask: TaskItem,
  schedules: Record<string, DaySchedule>
): TaskDayMatch[] {
  const matches: TaskDayMatch[] = [];
  const dayKeys: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

  for (const dKey of dayKeys) {
    const sched = schedules[dKey];
    if (!sched) continue;
    const found = sched.tasks.find((t) => isSameRoutine(t, targetTask));
    if (found) {
      matches.push({
        dayKey: dKey,
        dayName: sched.dayName,
        task: found,
      });
    }
  }

  return matches;
}

/**
 * Deschedule a task either for today only, or across all days in the cycle.
 */
export function applyDeschedule(
  schedules: Record<string, DaySchedule>,
  targetTask: TaskItem,
  scope: 'today' | 'all',
  currentDay: DayKey
): Record<string, DaySchedule> {
  const updated: Record<string, DaySchedule> = { ...schedules };

  if (scope === 'today') {
    const sched = updated[currentDay];
    if (sched) {
      updated[currentDay] = {
        ...sched,
        tasks: sched.tasks.map((t) =>
          t.id === targetTask.id || isSameRoutine(t, targetTask)
            ? { ...t, isScheduled: false }
            : t
        ),
      };
    }
  } else {
    // All days
    for (const [dKey, sched] of Object.entries(updated)) {
      updated[dKey] = {
        ...sched,
        tasks: sched.tasks.map((t) =>
          isSameRoutine(t, targetTask) ? { ...t, isScheduled: false } : t
        ),
      };
    }
  }

  return updated;
}

/**
 * Restore / schedule a parked task either for today only, or across all days in the cycle.
 */
export function applySchedule(
  schedules: Record<string, DaySchedule>,
  targetTask: TaskItem,
  scope: 'today' | 'all',
  currentDay: DayKey
): Record<string, DaySchedule> {
  const updated: Record<string, DaySchedule> = { ...schedules };

  if (scope === 'today') {
    const sched = updated[currentDay];
    if (sched) {
      updated[currentDay] = {
        ...sched,
        tasks: sched.tasks.map((t) =>
          t.id === targetTask.id || isSameRoutine(t, targetTask)
            ? { ...t, isScheduled: true }
            : t
        ),
      };
    }
  } else {
    // All days
    for (const [dKey, sched] of Object.entries(updated)) {
      updated[dKey] = {
        ...sched,
        tasks: sched.tasks.map((t) =>
          isSameRoutine(t, targetTask) ? { ...t, isScheduled: true } : t
        ),
      };
    }
  }

  return updated;
}

/**
 * Delete / Remove a task either for today only, or forever across all days.
 */
export function applyDelete(
  schedules: Record<string, DaySchedule>,
  targetTask: TaskItem,
  scope: 'today' | 'all',
  currentDay: DayKey
): Record<string, DaySchedule> {
  const updated: Record<string, DaySchedule> = { ...schedules };

  if (scope === 'today') {
    const sched = updated[currentDay];
    if (sched) {
      updated[currentDay] = {
        ...sched,
        tasks: sched.tasks.filter(
          (t) => t.id !== targetTask.id && !isSameRoutine(t, targetTask)
        ),
      };
    }
  } else {
    // All days
    for (const [dKey, sched] of Object.entries(updated)) {
      updated[dKey] = {
        ...sched,
        tasks: sched.tasks.filter((t) => !isSameRoutine(t, targetTask)),
      };
    }
  }

  return updated;
}

/**
 * Deschedule all currently active tasks for a single day (e.g. sick day, exam day).
 */
export function descheduleAllForDay(
  schedules: Record<string, DaySchedule>,
  dayKey: DayKey
): Record<string, DaySchedule> {
  const updated = { ...schedules };
  const sched = updated[dayKey];
  if (!sched) return updated;

  updated[dayKey] = {
    ...sched,
    tasks: sched.tasks.map((t) => ({ ...t, isScheduled: false })),
  };

  return updated;
}

/**
 * Restore all descheduled / parked tasks for a single day back to active.
 */
export function restoreAllForDay(
  schedules: Record<string, DaySchedule>,
  dayKey: DayKey
): Record<string, DaySchedule> {
  const updated = { ...schedules };
  const sched = updated[dayKey];
  if (!sched) return updated;

  updated[dayKey] = {
    ...sched,
    tasks: sched.tasks.map((t) => ({ ...t, isScheduled: true })),
  };

  return updated;
}

export interface RecurringRoutineSummary {
  sampleTask: TaskItem;
  title: string;
  category: string;
  timeSlot: string;
  durationMinutes: number;
  days: { dayKey: DayKey; dayName: string; isScheduled: boolean }[];
  isAllScheduled: boolean;
  isAllDescheduled: boolean;
  isPartiallyScheduled: boolean;
}

/**
 * Aggregates all unique routines across the entire weekly schedule
 * so users can manage them globally in one place.
 */
export function getAllUniqueRoutines(
  schedules: Record<string, DaySchedule>
): RecurringRoutineSummary[] {
  const routines: RecurringRoutineSummary[] = [];
  const dayKeys: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

  for (const dKey of dayKeys) {
    const sched = schedules[dKey];
    if (!sched) continue;

    for (const task of sched.tasks) {
      let existing = routines.find((r) => isSameRoutine(r.sampleTask, task));
      const isSched = task.isScheduled !== false;

      if (!existing) {
        existing = {
          sampleTask: task,
          title: task.title,
          category: task.category,
          timeSlot: task.time,
          durationMinutes: task.durationMinutes,
          days: [],
          isAllScheduled: true,
          isAllDescheduled: false,
          isPartiallyScheduled: false,
        };
        routines.push(existing);
      }

      if (!existing.days.some((d) => d.dayKey === dKey)) {
        existing.days.push({
          dayKey: dKey,
          dayName: sched.dayName.substring(0, 3).toUpperCase(),
          isScheduled: isSched,
        });
      }
    }
  }

  // Update status flags
  for (const r of routines) {
    const scheduledCount = r.days.filter((d) => d.isScheduled).length;
    r.isAllScheduled = scheduledCount === r.days.length;
    r.isAllDescheduled = scheduledCount === 0;
    r.isPartiallyScheduled = scheduledCount > 0 && scheduledCount < r.days.length;
  }

  return routines;
}

/**
 * Applies updates to a task in the schedule, handling both single-day and all-days scopes,
 * and synchronizing recurrence across repeat days if modified.
 */
export function applyTaskEdit(
  schedules: Record<string, DaySchedule>,
  originalTask: TaskItem,
  updatedFields: Partial<TaskItem>,
  scope: 'today' | 'all',
  currentDay: DayKey,
  selectedRepeatDays?: DayKey[]
): Record<string, DaySchedule> {
  const updated: Record<string, DaySchedule> = { ...schedules };

  if (scope === 'today') {
    const sched = updated[currentDay];
    if (sched) {
      updated[currentDay] = {
        ...sched,
        tasks: sched.tasks.map((t) =>
          t.id === originalTask.id
            ? { ...t, ...updatedFields }
            : t
        ),
      };
    }
  } else {
    // Scope is 'all' - update across all matching days, or sync with selectedRepeatDays
    const targetDays = selectedRepeatDays && selectedRepeatDays.length > 0
      ? selectedRepeatDays
      : (['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as DayKey[]);

    const allDays: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

    for (const dKey of allDays) {
      const sched = updated[dKey];
      if (!sched) continue;

      const hasTask = sched.tasks.some((t) => isSameRoutine(t, originalTask) || t.id === originalTask.id);
      const shouldHaveTask = targetDays.includes(dKey);

      if (hasTask && shouldHaveTask) {
        // Update task on this day
        updated[dKey] = {
          ...sched,
          tasks: sched.tasks.map((t) =>
            isSameRoutine(t, originalTask) || t.id === originalTask.id
              ? { ...t, ...updatedFields }
              : t
          ),
        };
      } else if (hasTask && !shouldHaveTask) {
        // Routine was deselected from this day
        updated[dKey] = {
          ...sched,
          tasks: sched.tasks.filter(
            (t) => !(isSameRoutine(t, originalTask) || t.id === originalTask.id)
          ),
        };
      } else if (!hasTask && shouldHaveTask) {
        // Routine was added to this day
        const newTask: TaskItem = {
          ...originalTask,
          ...updatedFields,
          id: `task-${Date.now()}-${dKey}-${Math.random().toString(36).substring(2, 5)}`,
        };
        updated[dKey] = {
          ...sched,
          tasks: [...sched.tasks, newTask],
        };
      }
    }
  }

  return updated;
}

