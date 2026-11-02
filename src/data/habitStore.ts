import { HabitItem, HabitStats } from '../types';
import { getTodayDateStr } from '../utils/ascii';

export const STORAGE_HABITS_KEY = 'routine_tracker_habits_v1';
export const STORAGE_HABIT_LOGS_KEY = 'routine_tracker_habit_logs_v1';

export const DEFAULT_HABITS: HabitItem[] = [];

// Remove legacy starter placeholders so the repo stays completely clean & empty by default
const LEGACY_DEFAULT_IDS = new Set([
  'habit-hydration',
  'habit-reading',
  'habit-mobility',
  'habit-sleep-hygiene',
]);

export function loadHabits(): HabitItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_HABITS_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Strip legacy placeholders and normalize targetDaysPerWeek
        const cleaned = parsed
          .filter((item) => !LEGACY_DEFAULT_IDS.has(item.id))
          .map((item) => {
            let target = item.targetDaysPerWeek;
            if (typeof target !== 'number' || target < 1 || target > 7) {
              if (item.frequency === 'weekdays') target = 5;
              else if (item.frequency === 'weekends') target = 2;
              else target = 7;
            }
            return {
              ...item,
              targetDaysPerWeek: Math.max(1, Math.min(7, Math.round(target))),
            };
          });

        return cleaned;
      }
    }
  } catch {
    // fallback
  }

  return [];
}

export function saveHabits(habits: HabitItem[]): void {
  try {
    localStorage.setItem(STORAGE_HABITS_KEY, JSON.stringify(habits));
  } catch {
    // ignore
  }
}

export function deleteHabitFromStore(habitId: string): HabitItem[] {
  const current = loadHabits().filter((h) => h.id !== habitId);
  saveHabits(current);

  // Clean habit ID from logs
  try {
    const logs = loadHabitLogs();
    let modified = false;
    for (const dateKey of Object.keys(logs)) {
      if (logs[dateKey] && logs[dateKey].includes(habitId)) {
        logs[dateKey] = logs[dateKey].filter((id) => id !== habitId);
        if (logs[dateKey].length === 0) {
          delete logs[dateKey];
        }
        modified = true;
      }
    }
    if (modified) {
      saveHabitLogs(logs);
    }
  } catch {
    // ignore
  }

  return current;
}

export function loadHabitLogs(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(STORAGE_HABIT_LOGS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  return {};
}

export function saveHabitLogs(logs: Record<string, string[]>): void {
  try {
    localStorage.setItem(STORAGE_HABIT_LOGS_KEY, JSON.stringify(logs));
  } catch {
    // ignore
  }
}

export function toggleHabitForDate(habitId: string, dateStr: string): Record<string, string[]> {
  const logs = loadHabitLogs();
  const currentForDate = logs[dateStr] || [];
  const isCompleted = currentForDate.includes(habitId);

  const updatedForDate = isCompleted
    ? currentForDate.filter((id) => id !== habitId)
    : [...currentForDate, habitId];

  if (updatedForDate.length === 0) {
    delete logs[dateStr];
  } else {
    logs[dateStr] = updatedForDate;
  }

  saveHabitLogs(logs);
  return logs;
}

// Helper to format date offset from reference
export function getDateOffset(dateStr: string, offsetDays: number): string {
  const [y, m, d] = dateStr.split('-').map((s) => parseInt(s, 10));
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + offsetDays);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function getDayLetter(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map((s) => parseInt(s, 10));
  const dayIndex = new Date(y, m - 1, d).getDay(); // 0 is Sun, 1 is Mon
  const letters = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  return letters[dayIndex];
}

/**
 * Returns the Monday date string (YYYY-MM-DD) of the ISO week containing dateStr.
 */
export function getMondayOfWeek(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map((s) => parseInt(s, 10));
  const date = new Date(y, m - 1, d);
  const day = date.getDay(); // 0 is Sun, 1 is Mon, ..., 6 is Sat
  const diffToMon = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diffToMon);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Returns the 7 date strings (Monday through Sunday) for the week starting at mondayStr.
 */
export function getDatesOfWeek(mondayStr: string): string[] {
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    dates.push(getDateOffset(mondayStr, i));
  }
  return dates;
}

/**
 * Calculates habit statistics using the weekly frequency accumulation algorithm:
 * - Target: user specifies 1 to 7 days per week.
 * - Minimum days per week required: targetDaysPerWeek.
 * - Streak unit: cumulative completed days across consecutive qualifying weeks.
 * - Completed weeks (in past) MUST have completedDays >= targetDaysPerWeek. If a past week failed, streak resets.
 * - In-progress current week adds its completed days so far, and does not break the streak until the week concludes.
 */
export function calculateHabitStats(
  habit: HabitItem,
  logs: Record<string, string[]>,
  todayStr: string = getTodayDateStr()
): HabitStats {
  const habitId = habit.id;
  const targetDays = Math.max(1, Math.min(7, habit.targetDaysPerWeek || 7));
  const isCompletedToday = (logs[todayStr] || []).includes(habitId);

  // 1. Current Week calculation (Monday through Sunday)
  const currentMonday = getMondayOfWeek(todayStr);
  const currentWeekDates = getDatesOfWeek(currentMonday);
  const currentWeekCompleted = currentWeekDates.filter((d) =>
    (logs[d] || []).includes(habitId)
  ).length;
  const isTargetMetThisWeek = currentWeekCompleted >= targetDays;

  // 2. Scan past weeks backwards to evaluate current streak
  // Start with days completed in the current week
  let runningStreak = currentWeekCompleted;
  let weekOffset = -1;
  const habitCreatedMonday = getMondayOfWeek(habit.createdAt || '2026-09-01');

  while (true) {
    const pastMonday = getDateOffset(currentMonday, weekOffset * 7);
    const pastSunday = getDateOffset(pastMonday, 6);

    // If this week is strictly before the habit creation week and has no logs, stop
    if (pastSunday < habit.createdAt && pastMonday < habitCreatedMonday) {
      break;
    }

    const pastWeekDates = getDatesOfWeek(pastMonday);
    const completedInPastWeek = pastWeekDates.filter((d) =>
      (logs[d] || []).includes(habitId)
    ).length;

    if (completedInPastWeek >= targetDays) {
      // Met weekly minimum! Add all completed days from this qualifying week to streak
      runningStreak += completedInPastWeek;
      weekOffset--;
    } else {
      // Past completed week failed to reach the weekly target -> streak broken!
      break;
    }

    // Safety brake (max 104 weeks / 2 years)
    if (weekOffset < -104) break;
  }

  const currentStreak = runningStreak;

  // 3. Calculate Total Completions & Best Streak across all time
  const allLoggedDates = Object.keys(logs)
    .filter((d) => (logs[d] || []).includes(habitId))
    .sort();
  const totalCompletions = allLoggedDates.length;

  let bestStreak = currentStreak;
  if (allLoggedDates.length > 0) {
    const earliestDate = allLoggedDates[0] < habit.createdAt ? allLoggedDates[0] : habit.createdAt;
    let cursorMonday = getMondayOfWeek(earliestDate);
    let streakAccumulator = 0;
    let computedBest = 0;

    while (cursorMonday <= currentMonday) {
      const weekDates = getDatesOfWeek(cursorMonday);
      const count = weekDates.filter((d) => (logs[d] || []).includes(habitId)).length;

      if (cursorMonday === currentMonday) {
        // Ongoing week
        const totalWithCurrent = streakAccumulator + count;
        if (totalWithCurrent > computedBest) computedBest = totalWithCurrent;
      } else {
        // Past week
        if (count >= targetDays) {
          streakAccumulator += count;
          if (streakAccumulator > computedBest) computedBest = streakAccumulator;
        } else {
          streakAccumulator = 0;
        }
      }

      cursorMonday = getDateOffset(cursorMonday, 7);
    }

    bestStreak = Math.max(computedBest, currentStreak);
  }

  // 4. Build 7-day history trail (6 days ago to today)
  const historyTrail7d: HabitStats['historyTrail7d'] = [];
  for (let i = -6; i <= 0; i++) {
    const dStr = getDateOffset(todayStr, i);
    historyTrail7d.push({
      dateStr: dStr,
      dayLabel: getDayLetter(dStr),
      completed: (logs[dStr] || []).includes(habitId),
    });
  }

  // 5. Build 30-day history trail (29 days ago to today)
  const historyTrail30d: HabitStats['historyTrail30d'] = [];
  let completedIn30d = 0;
  for (let i = -29; i <= 0; i++) {
    const dStr = getDateOffset(todayStr, i);
    const completed = (logs[dStr] || []).includes(habitId);
    if (completed) completedIn30d++;
    historyTrail30d.push({
      dateStr: dStr,
      completed,
    });
  }

  const completionRate30d = Math.round((completedIn30d / 30) * 100);

  return {
    currentStreak,
    bestStreak,
    totalCompletions,
    completionRate30d,
    currentWeekCompleted,
    targetDaysPerWeek: targetDays,
    isTargetMetThisWeek,
    historyTrail7d,
    historyTrail30d,
    isCompletedToday,
  };
}
