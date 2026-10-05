import {
  DayKey,
  DaySchedule,
  MonthLogRecord,
  WeekLogRecord,
  DayLogRecord,
  DayTaskLog,
  TaskItem,
  TaskTimeAuditItem,
  TaskCategory,
} from '../types';
import { SCHEDULES } from './scheduleData';
import { getTodayDateStr } from '../utils/ascii';
import { sortDayTaskLogsByStartTime } from '../utils/taskSorting';

// Helper to calculate exact week metadata for any date string (YYYY-MM-DD)
export function getWeekInfoForDate(dateStr: string): {
  weekId: string;
  weekNumber: number;
  label: string;
  startDate: string;
  endDate: string;
} {
  const parts = dateStr.split('-');
  const year = parts[0] || '2026';
  const month = parts[1] || '09';
  const day = parseInt(parts[2] || '1', 10);
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  const lastDay = new Date(y, m, 0).getDate();

  let weekNum = 1;
  let startDay = 1;
  let endDay = 7;

  if (day >= 1 && day <= 7) {
    weekNum = 1; startDay = 1; endDay = 7;
  } else if (day >= 8 && day <= 14) {
    weekNum = 2; startDay = 8; endDay = 14;
  } else if (day >= 15 && day <= 21) {
    weekNum = 3; startDay = 15; endDay = 21;
  } else if (day >= 22 && day <= 28) {
    weekNum = 4; startDay = 22; endDay = 28;
  } else {
    weekNum = 5; startDay = 29; endDay = lastDay;
  }

  const pad = (n: number) => String(n).padStart(2, '0');
  const monthKey = `${year}-${month}`;
  return {
    weekId: `${monthKey}-W${weekNum}`,
    weekNumber: weekNum,
    label: `Week ${weekNum} (${month}/${pad(startDay)} to ${month}/${pad(endDay)})`,
    startDate: `${year}-${month}-${pad(startDay)}`,
    endDate: `${year}-${month}-${pad(endDay)}`,
  };
}

// Rebalances any stored history to guarantee strict chronological ordering:
// - Days partitioned into mathematically correct weeks
// - Days sorted chronologically (ascending date: Mon -> Tue -> Wed -> Thu...)
// - Tasks within each day sorted chronologically by start time
// - Weeks sorted chronologically (Week 1 -> Week 2 -> Week 3...)
export function rebalanceAndSortHistory(history: MonthLogRecord[]): MonthLogRecord[] {
  const result: MonthLogRecord[] = [];

  for (const month of history) {
    const allDaysMap = new Map<string, DayLogRecord>();
    for (const week of month.weeks || []) {
      for (const day of week.days || []) {
        const sortedDayTasks = sortDayTaskLogsByStartTime(day.tasks || []);
        const totalTime = sortedDayTasks.reduce((acc, t) => acc + t.timeSpentMinutes, 0);
        const completedCount = sortedDayTasks.filter((t) => t.completed).length;

        const cleanDay: DayLogRecord = {
          ...day,
          tasks: sortedDayTasks,
          totalTimeMinutes: totalTime,
          completedCount,
          totalTasksCount: sortedDayTasks.length,
        };

        const existing = allDaysMap.get(day.date);
        if (!existing || cleanDay.totalTimeMinutes >= existing.totalTimeMinutes) {
          allDaysMap.set(day.date, cleanDay);
        }
      }
    }

    const uniqueDays = Array.from(allDaysMap.values());
    uniqueDays.sort((a, b) => a.date.localeCompare(b.date));

    const weeksMap = new Map<string, WeekLogRecord>();
    for (const day of uniqueDays) {
      const weekInfo = getWeekInfoForDate(day.date);
      let week = weeksMap.get(weekInfo.weekId);
      if (!week) {
        week = {
          weekId: weekInfo.weekId,
          weekNumber: weekInfo.weekNumber,
          label: weekInfo.label,
          startDate: weekInfo.startDate,
          endDate: weekInfo.endDate,
          days: [],
          totalTimeMinutes: 0,
          completedCount: 0,
          totalTasksCount: 0,
        };
        weeksMap.set(weekInfo.weekId, week);
      }
      week.days.push(day);
    }

    const cleanedWeeks: WeekLogRecord[] = [];
    for (const week of weeksMap.values()) {
      week.days.sort((a, b) => a.date.localeCompare(b.date));
      week.totalTimeMinutes = week.days.reduce((acc, d) => acc + d.totalTimeMinutes, 0);
      week.completedCount = week.days.reduce((acc, d) => acc + d.completedCount, 0);
      week.totalTasksCount = week.days.reduce((acc, d) => acc + d.totalTasksCount, 0);
      cleanedWeeks.push(week);
    }

    cleanedWeeks.sort((a, b) => a.weekNumber - b.weekNumber);

    const totalTimeMinutes = cleanedWeeks.reduce((acc, w) => acc + w.totalTimeMinutes, 0);
    const completedCount = cleanedWeeks.reduce((acc, w) => acc + w.completedCount, 0);
    const totalTasksCount = cleanedWeeks.reduce((acc, w) => acc + w.totalTasksCount, 0);

    result.push({
      ...month,
      weeks: cleanedWeeks,
      totalTimeMinutes,
      completedCount,
      totalTasksCount,
    });
  }

  result.sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  return result;
}

const STORAGE_CUSTOM_SCHEDULES_KEY = 'prod_sys_custom_schedules_v1';
const STORAGE_HIERARCHY_HISTORY_KEY = 'prod_sys_hierarchy_history_v1';
const STORAGE_COMPLETED_TODAY_KEY = 'prod_sys_completed_today_v1';
const STORAGE_TASK_TIME_TRACKING_KEY = 'prod_sys_task_time_tracking_v1';

// Format helper
export function formatMinutes(mins: number): string {
  if (mins <= 0) return '0m';
  const hours = Math.floor(mins / 60);
  const remainingMins = Math.round(mins % 60);
  if (hours === 0) return `${remainingMins}m`;
  if (remainingMins === 0) return `${hours}h`;
  return `${hours}h ${remainingMins}m`;
}

// Helper to create an empty day schedule for a clean slate
export function createEmptyDaySchedule(dayKey: DayKey, dayName: string): DaySchedule {
  const isWeekendSat = dayKey === 'sat';
  const isWeekendSun = dayKey === 'sun';
  const code = isWeekendSat ? 'SAT' : isWeekendSun ? 'SUN' : dayKey.toUpperCase();

  return {
    dayKey,
    dayName,
    code,
    categoryLabel: 'Custom Routine',
    focusSummary: 'Clean slate — add your custom tasks for this day',
    isRestWorkout: false,
    tasks: [],
  };
}

// Clean Slate: 0 tasks across all 7 days
export function getCleanSlateSchedules(): Record<string, DaySchedule> {
  const dayNames: Record<DayKey, string> = {
    mon: 'Monday',
    tue: 'Tuesday',
    wed: 'Wednesday',
    thu: 'Thursday',
    fri: 'Friday',
    sat: 'Saturday',
    sun: 'Sunday',
  };

  const clean: Record<string, DaySchedule> = {};
  (Object.keys(dayNames) as DayKey[]).forEach((key) => {
    clean[key] = createEmptyDaySchedule(key, dayNames[key]);
  });
  return clean;
}

// Deep clone initial schedules (The 48-task Alternating Split, saved as preset)
export function getInitialSchedules(): Record<string, DaySchedule> {
  const cloned: Record<string, DaySchedule> = {};
  for (const [key, sched] of Object.entries(SCHEDULES)) {
    cloned[key] = {
      ...sched,
      tasks: sched.tasks.map((t) => ({
        ...t,
        durationMinutes: t.durationMinutes || 45,
        timeSpentMinutes: 0,
        isScheduled: true,
        isRepetitive: true,
        repeatDays:
          sched.code === 'A-DAY'
            ? (['mon', 'wed', 'fri'] as DayKey[])
            : sched.code === 'B-DAY'
            ? (['tue', 'thu'] as DayKey[])
            : ([key as DayKey] as DayKey[]),
        isCustom: false,
      })),
    };
  }
  return cloned;
}

// Strip actual tracked time from schedule templates so that schedules remain 100% clean templates across weeks
export function stripTimeSpentFromSchedules(schedules: Record<string, DaySchedule>): Record<string, DaySchedule> {
  const stripped: Record<string, DaySchedule> = {};
  for (const [key, sched] of Object.entries(schedules)) {
    stripped[key] = {
      ...sched,
      tasks: (sched.tasks || []).map((t) => {
        if (t.timeSpentMinutes !== undefined) {
          const copy = { ...t };
          delete copy.timeSpentMinutes;
          return copy;
        }
        return t;
      }),
    };
  }
  return stripped;
}

export function loadSchedules(): Record<string, DaySchedule> {
  try {
    // Check if the user has migrated to the clean slate system
    const hasMigratedToClean = localStorage.getItem('routine_tracker_clean_slate_active_v1') === 'true';
    if (!hasMigratedToClean) {
      // First visit under clean slate: wipe default pre-scheduled tasks to provide empty workspace
      localStorage.setItem('routine_tracker_clean_slate_active_v1', 'true');
      const clean = getCleanSlateSchedules();
      saveSchedules(clean);
      return clean;
    }

    const raw = localStorage.getItem(STORAGE_CUSTOM_SCHEDULES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.mon) {
        return stripTimeSpentFromSchedules(parsed);
      }
    }
  } catch {
    // fallback
  }
  const clean = getCleanSlateSchedules();
  saveSchedules(clean);
  return clean;
}

export function saveSchedules(schedules: Record<string, DaySchedule>) {
  try {
    const stripped = stripTimeSpentFromSchedules(schedules);
    localStorage.setItem(STORAGE_CUSTOM_SCHEDULES_KEY, JSON.stringify(stripped));
  } catch {
    // ignore
  }
}

// Seed generation for Months -> Weeks -> Days -> Tasks
function createSampleMonth(
  year: number,
  monthIndex: number,
  monthName: string,
  baseCompletionRate: number,
  factor: number
): MonthLogRecord {
  const monthKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const weeks: WeekLogRecord[] = [];
  let currentWeekDays: DayLogRecord[] = [];
  let weekCounter = 1;

  for (let day = 1; day <= daysInMonth; day++) {
    const dateObj = new Date(year, monthIndex, day);
    const dayOfWeek = dateObj.getDay(); // 0 = Sun, 1 = Mon ...
    const dayKeys: DayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const dayKey = dayKeys[dayOfWeek];
    const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // Tasks for this day based on schedule
    const baseSched = SCHEDULES[dayKey] || SCHEDULES.mon;
    const dayTasks: DayTaskLog[] = baseSched.tasks.map((t) => {
      // Deterministic pseudo-completion for past history
      const pseudoHash = (day * 17 + t.title.length * 3 + monthIndex * 31) % 100;
      const isCompleted = pseudoHash < baseCompletionRate * 100;
      const planned = t.durationMinutes || 45;
      const timeSpent = isCompleted ? Math.round(planned * (0.85 + (pseudoHash % 20) / 100)) : 0;

      return {
        taskId: t.id,
        title: t.title,
        category: t.category,
        timeSpentMinutes: timeSpent,
        completed: isCompleted,
        isScheduled: true,
        isRepetitive: true,
        timeSlot: t.time,
        details: t.details,
      };
    });

    const dayTotalMinutes = dayTasks.reduce((acc, t) => acc + t.timeSpentMinutes, 0);
    const dayCompletedCount = dayTasks.filter((t) => t.completed).length;

    currentWeekDays.push({
      date: dateStr,
      dayKey,
      dayName: baseSched.dayName,
      code: baseSched.code,
      tasks: dayTasks,
      totalTimeMinutes: dayTotalMinutes,
      completedCount: dayCompletedCount,
      totalTasksCount: dayTasks.length,
    });

    // End of week on Sunday or end of month
    if (dayOfWeek === 0 || day === daysInMonth) {
      const weekStartDate = currentWeekDays[0].date;
      const weekEndDate = currentWeekDays[currentWeekDays.length - 1].date;
      const weekTotalMinutes = currentWeekDays.reduce((acc, d) => acc + d.totalTimeMinutes, 0);
      const weekCompleted = currentWeekDays.reduce((acc, d) => acc + d.completedCount, 0);
      const weekTotalTasks = currentWeekDays.reduce((acc, d) => acc + d.totalTasksCount, 0);

      weeks.push({
        weekId: `${monthKey}-W${weekCounter}`,
        weekNumber: weekCounter,
        label: `Week ${weekCounter} (${weekStartDate.slice(5)} to ${weekEndDate.slice(5)})`,
        startDate: weekStartDate,
        endDate: weekEndDate,
        days: currentWeekDays,
        totalTimeMinutes: weekTotalMinutes,
        completedCount: weekCompleted,
        totalTasksCount: weekTotalTasks,
      });

      currentWeekDays = [];
      weekCounter++;
    }
  }

  const monthTotalMinutes = weeks.reduce((acc, w) => acc + w.totalTimeMinutes, 0);
  const monthCompletedCount = weeks.reduce((acc, w) => acc + w.completedCount, 0);
  const monthTotalTasks = weeks.reduce((acc, w) => acc + w.totalTasksCount, 0);

  return {
    monthKey,
    monthName,
    year,
    monthIndex,
    weeks,
    totalTimeMinutes: monthTotalMinutes,
    completedCount: monthCompletedCount,
    totalTasksCount: monthTotalTasks,
  };
}

export function generateSeedMonths(): MonthLogRecord[] {
  // June 2026, July 2026, August 2026, September 2026
  const june = createSampleMonth(2026, 5, 'June 2026', 0.78, 1.0);
  const july = createSampleMonth(2026, 6, 'July 2026', 0.84, 1.05);
  const august = createSampleMonth(2026, 7, 'August 2026', 0.89, 1.12);

  // September 2026 up to today (Sep 03)
  const sep = createSampleMonth(2026, 8, 'September 2026', 0.92, 1.15);

  return [june, july, august, sep];
}

export function loadHierarchyHistory(): MonthLogRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_HIERARCHY_HISTORY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Sanitize: detect and purge synthetic seed months (June, July, August 2026, or synthetic full-month data)
        const todayStr = getTodayDateStr();
        const hasLegacySeedMonths = parsed.some(
          (m: MonthLogRecord) =>
            m.monthName === 'June 2026' ||
            m.monthName === 'July 2026' ||
            m.monthName === 'August 2026' ||
            (m.monthKey === '2026-09' && m.weeks?.some((w) => w.days?.some((d) => d.date > todayStr)))
        );

        let genuineMonths: MonthLogRecord[] = [];
        if (hasLegacySeedMonths) {
          for (const m of parsed) {
            if (m.monthName === 'June 2026' || m.monthName === 'July 2026' || m.monthName === 'August 2026') {
              continue; // Drop synthetic historical mock months completely
            }
            if (m.monthKey === '2026-09') {
              const cleanedWeeks = m.weeks
                .map((w) => ({
                  ...w,
                  days: w.days.filter((d) => d.date <= todayStr && d.totalTimeMinutes > 0),
                }))
                .filter((w) => w.days.length > 0);

              if (cleanedWeeks.length > 0) {
                genuineMonths.push({
                  ...m,
                  weeks: cleanedWeeks,
                });
              }
            } else {
              genuineMonths.push(m);
            }
          }
        } else {
          genuineMonths = parsed;
        }

        // Rebalance weeks and sort chronologically (days ascending, tasks by start time ascending)
        const rebalanced = rebalanceAndSortHistory(genuineMonths);
        saveHierarchyHistory(rebalanced);
        return rebalanced;
      }
    }
  } catch {
    // fallback
  }
  // Default to a clean empty history so users track 100% genuine progress
  saveHierarchyHistory([]);
  return [];
}

export function saveHierarchyHistory(history: MonthLogRecord[]) {
  try {
    localStorage.setItem(STORAGE_HIERARCHY_HISTORY_KEY, JSON.stringify(history));
  } catch {
    // ignore
  }
}

// Complete wipe of all placeholder and mock data for a 100% genuine clean start
export function purgeAllDataAndStartClean(): {
  cleanSchedules: Record<string, DaySchedule>;
  cleanHistory: MonthLogRecord[];
} {
  const cleanSchedules = getCleanSlateSchedules();
  saveSchedules(cleanSchedules);
  saveHierarchyHistory([]);

  // Clear all completed checkboxes and day logs from localStorage
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith('alt_routine_completed_') ||
          key.startsWith('prod_sys_completed_') ||
          key.startsWith('prod_sys_task_time_') ||
          key === 'alt_routine_hierarchy_history_v1')
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    localStorage.setItem('prod_sys_data_cleaned_v1', 'true');
    localStorage.setItem('routine_tracker_clean_slate_active_v1', 'true');
  } catch {
    // ignore
  }

  return {
    cleanSchedules,
    cleanHistory: [],
  };
}

// Optional helper to restore sample demonstration months if user wants to preview filled charts
export function loadSampleSeedData(): MonthLogRecord[] {
  const seed = generateSeedMonths();
  saveHierarchyHistory(seed);
  return seed;
}

// Helper to record / update today's live task action into the hierarchy history
export function syncDayActionToHistory(
  dateStr: string, // '2026-09-03'
  dayKey: DayKey,
  tasks: TaskItem[],
  completedIds: string[]
) {
  const history = loadHierarchyHistory();
  const [yearStr, monthStr, dayNumStr] = dateStr.split('-');
  const year = parseInt(yearStr, 10);
  const monthIndex = parseInt(monthStr, 10) - 1;
  const monthKey = `${yearStr}-${monthStr}`;

  let monthRecord = history.find((m) => m.monthKey === monthKey);
  if (!monthRecord) {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    monthRecord = {
      monthKey,
      monthName: `${monthNames[monthIndex]} ${year}`,
      year,
      monthIndex,
      weeks: [],
      totalTimeMinutes: 0,
      completedCount: 0,
      totalTasksCount: 0,
    };
    history.push(monthRecord);
  }

  const convertedTasks: DayTaskLog[] = tasks.map((t) => {
    const isDone = completedIds.includes(t.id);
    const timeSpent = (t.timeSpentMinutes !== undefined && t.timeSpentMinutes > 0)
      ? t.timeSpentMinutes
      : isDone
      ? t.durationMinutes
      : 0;

    return {
      taskId: t.id,
      title: t.title,
      category: t.category,
      timeSpentMinutes: timeSpent,
      completed: isDone,
      isScheduled: t.isScheduled !== false,
      isRepetitive: t.isRepetitive !== false,
      timeSlot: t.time,
      details: t.details,
    };
  });

  // Sort tasks chronologically by start time
  const sortedConvertedTasks = sortDayTaskLogsByStartTime(convertedTasks);
  const totalTime = sortedConvertedTasks.reduce((acc, t) => acc + t.timeSpentMinutes, 0);
  const completedCount = sortedConvertedTasks.filter((t) => t.completed).length;

  // Determine correct week container based on exact calendar date
  const weekInfo = getWeekInfoForDate(dateStr);
  let targetWeek = monthRecord.weeks.find((w) => w.weekId === weekInfo.weekId);
  if (!targetWeek) {
    targetWeek = {
      weekId: weekInfo.weekId,
      weekNumber: weekInfo.weekNumber,
      label: weekInfo.label,
      startDate: weekInfo.startDate,
      endDate: weekInfo.endDate,
      days: [],
      totalTimeMinutes: 0,
      completedCount: 0,
      totalTasksCount: 0,
    };
    monthRecord.weeks.push(targetWeek);
  }

  // Purge this date from any other week if it was erroneously recorded there previously
  for (const w of monthRecord.weeks) {
    if (w.weekId !== targetWeek.weekId) {
      w.days = w.days.filter((d) => d.date !== dateStr);
    }
  }

  let foundDay = targetWeek.days.find((d) => d.date === dateStr);
  if (foundDay) {
    foundDay.dayKey = dayKey;
    if (SCHEDULES[dayKey]) {
      foundDay.dayName = SCHEDULES[dayKey].dayName;
      foundDay.code = SCHEDULES[dayKey].code;
    }
    foundDay.tasks = sortedConvertedTasks;
    foundDay.totalTimeMinutes = totalTime;
    foundDay.completedCount = completedCount;
    foundDay.totalTasksCount = sortedConvertedTasks.length;
  } else {
    const newDay: DayLogRecord = {
      date: dateStr,
      dayKey,
      dayName: SCHEDULES[dayKey]?.dayName || dayKey.toUpperCase(),
      code: SCHEDULES[dayKey]?.code,
      tasks: sortedConvertedTasks,
      totalTimeMinutes: totalTime,
      completedCount,
      totalTasksCount: sortedConvertedTasks.length,
    };
    targetWeek.days.push(newDay);
  }

  // Re-sort and recalculate everything
  const rebalanced = rebalanceAndSortHistory(history);
  saveHierarchyHistory(rebalanced);
}

/**
 * Return completed task IDs for a specific calendar date (YYYY-MM-DD).
 * Looks in:
 * 1. Dedicated date key: `alt_routine_completed_date_${dateStr}`
 * 2. Hierarchy history for that date if already logged
 * Returns [] if this date has not been completed yet (fresh slate for a new week).
 */
export function getCompletedTaskIdsForDate(dateStr: string): string[] {
  try {
    const key = `alt_routine_completed_date_${dateStr}`;
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      return JSON.parse(raw);
    }
    // If not cached in localStorage, check the hierarchy history store
    const history = loadHierarchyHistory();
    for (const month of history) {
      for (const week of month.weeks || []) {
        const found = week.days?.find((d) => d.date === dateStr);
        if (found) {
          const ids = (found.tasks || []).filter((t) => t.completed).map((t) => t.taskId);
          localStorage.setItem(key, JSON.stringify(ids));
          return ids;
        }
      }
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Save completed task IDs for a specific calendar date (YYYY-MM-DD).
 */
export function saveCompletedTaskIdsForDate(dateStr: string, completedIds: string[]): void {
  try {
    const key = `alt_routine_completed_date_${dateStr}`;
    localStorage.setItem(key, JSON.stringify(completedIds));
  } catch {
    // ignore
  }
}

/**
 * Migrates legacy un-dated keys (`alt_routine_completed_[mon|tue|...]`)
 * by removing them so they never bleed into future weeks.
 */
export function migrateLegacyCompletedKeys(): void {
  const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  try {
    for (const d of dayKeys) {
      const legacyKey = `alt_routine_completed_${d}`;
      localStorage.removeItem(legacyKey);
    }
  } catch {
    // ignore
  }
}

/**
 * Retrieves tracked time map { [taskId]: minutes } for a specific calendar date (YYYY-MM-DD).
 * Ensures tracked time is strictly scoped to that exact date and NEVER bleeds across weeks.
 */
export function getDateTrackedTimeMap(dateStr: string): Record<string, number> {
  try {
    const key = `alt_routine_time_spent_date_${dateStr}`;
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      return JSON.parse(raw);
    }
    // Fallback: Check if this date was already saved in history store
    const history = loadHierarchyHistory();
    for (const month of history) {
      for (const week of month.weeks || []) {
        const found = week.days?.find((d) => d.date === dateStr);
        if (found) {
          const map: Record<string, number> = {};
          for (const t of found.tasks || []) {
            if (t.timeSpentMinutes && t.timeSpentMinutes > 0) {
              map[t.taskId] = t.timeSpentMinutes;
            }
          }
          localStorage.setItem(key, JSON.stringify(map));
          return map;
        }
      }
    }
    return {};
  } catch {
    return {};
  }
}

/**
 * Saves tracked time map { [taskId]: minutes } for a specific calendar date (YYYY-MM-DD).
 */
export function saveDateTrackedTimeMap(dateStr: string, timeMap: Record<string, number>): void {
  try {
    const key = `alt_routine_time_spent_date_${dateStr}`;
    localStorage.setItem(key, JSON.stringify(timeMap));
  } catch {
    // ignore
  }
}

/**
 * Adjusts tracked time on a task for a specific calendar date.
 */
export function addTimeToDateTask(dateStr: string, taskId: string, deltaMinutes: number): Record<string, number> {
  const currentMap = getDateTrackedTimeMap(dateStr);
  const currentVal = currentMap[taskId] || 0;
  const newVal = Math.max(0, currentVal + deltaMinutes);
  if (newVal === 0) {
    delete currentMap[taskId];
  } else {
    currentMap[taskId] = newVal;
  }
  saveDateTrackedTimeMap(dateStr, currentMap);
  return currentMap;
}

/**
 * Adds or adjusts time to a specific task on a SPECIFIC DAY in the hierarchy metrics.
 * Recalculates day, week, and month totals and persists to history store.
 */
export function addTimeToHistoryDayTask(
  dateStr: string,
  taskIdOrTitle: string,
  additionalMinutes: number,
  markCompleted?: boolean
): void {
  const history = loadHierarchyHistory();
  const weekInfo = getWeekInfoForDate(dateStr);
  const [yearStr, monthStr] = dateStr.split('-');
  const monthKey = `${yearStr}-${monthStr}`;

  let month = history.find((m) => m.monthKey === monthKey);
  if (!month) {
    const year = parseInt(yearStr, 10);
    const monthIndex = parseInt(monthStr, 10) - 1;
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    month = {
      monthKey,
      monthName: `${monthNames[monthIndex]} ${year}`,
      year,
      monthIndex,
      weeks: [],
      totalTimeMinutes: 0,
      completedCount: 0,
      totalTasksCount: 0,
    };
    history.push(month);
  }

  let week = month.weeks.find((w) => w.weekId === weekInfo.weekId);
  if (!week) {
    week = {
      weekId: weekInfo.weekId,
      weekNumber: weekInfo.weekNumber,
      label: weekInfo.label,
      startDate: weekInfo.startDate,
      endDate: weekInfo.endDate,
      days: [],
      totalTimeMinutes: 0,
      completedCount: 0,
      totalTasksCount: 0,
    };
    month.weeks.push(week);
  }

  let day = week.days.find((d) => d.date === dateStr);
  const dayOfWeekIndex = new Date(dateStr + 'T12:00:00').getDay();
  const dayKeys: DayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const dayKey = dayKeys[dayOfWeekIndex];

  if (!day) {
    day = {
      date: dateStr,
      dayKey,
      dayName: SCHEDULES[dayKey]?.dayName || dayKey.toUpperCase(),
      code: SCHEDULES[dayKey]?.code,
      tasks: [],
      totalTimeMinutes: 0,
      completedCount: 0,
      totalTasksCount: 0,
    };
    week.days.push(day);
  }

  // Find task by id or by title
  const normalizedSearch = taskIdOrTitle.trim().toLowerCase();
  let task = day.tasks.find(
    (t) => t.taskId === taskIdOrTitle || t.title.trim().toLowerCase() === normalizedSearch
  );

  if (task) {
    task.timeSpentMinutes = Math.max(0, (task.timeSpentMinutes || 0) + additionalMinutes);
    if (markCompleted !== undefined) {
      task.completed = markCompleted;
    }
  } else {
    task = {
      taskId: 'daytask-' + Date.now(),
      title: taskIdOrTitle.trim(),
      category: 'custom',
      timeSpentMinutes: Math.max(0, additionalMinutes),
      completed: !!markCompleted,
      isScheduled: true,
      isRepetitive: false,
    };
    day.tasks.push(task);
  }

  // Sort and rebalance history
  day.tasks = sortDayTaskLogsByStartTime(day.tasks);
  day.totalTimeMinutes = day.tasks.reduce((sum, t) => sum + (t.timeSpentMinutes || 0), 0);
  day.completedCount = day.tasks.filter((t) => t.completed).length;
  day.totalTasksCount = day.tasks.length;

  const rebalanced = rebalanceAndSortHistory(history);
  saveHierarchyHistory(rebalanced);

  // Sync to date tracked time map as well
  if (task) {
    const timeMap = getDateTrackedTimeMap(dateStr);
    timeMap[task.taskId] = task.timeSpentMinutes;
    saveDateTrackedTimeMap(dateStr, timeMap);
  }
}

/**
 * Purges all tasks with 0 hours / 0 tracked time that no longer exist in the active schedules
 * from the hierarchical history store.
 * Tasks with logged work (> 0 minutes or completed sessions) are strictly preserved.
 * Rebalances and recalculates all day, week, and month totals to ensure metrics and audit integrity.
 */
export function cleanZeroHourTasksFromHistory(
  schedules: Record<string, DaySchedule>
): MonthLogRecord[] {
  const history = loadHierarchyHistory();
  const scheduleTaskKeys = new Set<string>();
  for (const sched of Object.values(schedules)) {
    for (const t of sched.tasks || []) {
      scheduleTaskKeys.add(t.title.trim().toLowerCase());
    }
  }

  for (const month of history) {
    for (const week of month.weeks || []) {
      for (const day of week.days || []) {
        day.tasks = (day.tasks || []).filter((t) => {
          const hasTime = (t.timeSpentMinutes || 0) > 0;
          const isDone = !!t.completed;
          const key = t.title.trim().toLowerCase();
          const inSchedule = scheduleTaskKeys.has(key);
          // Keep task if it has actual logged time, was marked completed, or is still in the schedule
          return hasTime || isDone || inSchedule;
        });

        day.totalTimeMinutes = day.tasks.reduce((sum, t) => sum + (t.timeSpentMinutes || 0), 0);
        day.completedCount = day.tasks.filter((t) => t.completed).length;
        day.totalTasksCount = day.tasks.length;
      }
      week.totalTimeMinutes = week.days.reduce((sum, d) => sum + d.totalTimeMinutes, 0);
      week.completedCount = week.days.reduce((sum, d) => sum + d.completedCount, 0);
      week.totalTasksCount = week.days.reduce((sum, d) => sum + d.totalTasksCount, 0);
    }
    month.totalTimeMinutes = month.weeks.reduce((sum, w) => sum + w.totalTimeMinutes, 0);
    month.completedCount = month.weeks.reduce((sum, w) => sum + w.completedCount, 0);
    month.totalTasksCount = month.weeks.reduce((sum, w) => sum + w.totalTasksCount, 0);
  }

  const rebalanced = rebalanceAndSortHistory(history);
  saveHierarchyHistory(rebalanced);
  return rebalanced;
}

// Storage key for direct task audit adjustments (logged WITHOUT specifying any day)
const STORAGE_DIRECT_TASK_AUDIT_KEY = 'alt_routine_direct_task_audit_time_v1';
const STORAGE_DIRECT_TASK_TITLES_KEY = 'alt_routine_direct_task_audit_titles_v1';

export function getDirectTaskAuditMap(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_DIRECT_TASK_AUDIT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveDirectTaskAuditMap(map: Record<string, number>): void {
  try {
    localStorage.setItem(STORAGE_DIRECT_TASK_AUDIT_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function getDirectTaskTitlesMap(): Record<string, { title: string; category?: TaskCategory }> {
  try {
    const raw = localStorage.getItem(STORAGE_DIRECT_TASK_TITLES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveDirectTaskTitlesMap(map: Record<string, { title: string; category?: TaskCategory }>): void {
  try {
    localStorage.setItem(STORAGE_DIRECT_TASK_TITLES_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

/**
 * Adds time directly to a task in the Task Time Audit WITHOUT specifying a day.
 * Persists directly and accumulates into the task's grand audited total.
 */
export function addDirectTimeToTaskAudit(
  taskTitleOrId: string,
  additionalMinutes: number,
  category?: TaskCategory
): void {
  const map = getDirectTaskAuditMap();
  const key = taskTitleOrId.trim().toLowerCase();
  const current = map[key] || 0;
  const newVal = Math.max(0, current + additionalMinutes);
  if (newVal === 0) {
    delete map[key];
  } else {
    map[key] = newVal;
  }
  saveDirectTaskAuditMap(map);

  const titlesMap = getDirectTaskTitlesMap();
  titlesMap[key] = {
    title: taskTitleOrId.trim(),
    category: category || titlesMap[key]?.category || 'custom',
  };
  saveDirectTaskTitlesMap(titlesMap);
}

// Compute per-task time calculation audit across all history, custom schedules, and direct audit entries
// A task appears in the audit IF AND ONLY IF:
// - It currently exists in the schedule (active or parked, one-time or repetitive)
// - OR, if removed from the schedule, it had actual work logged (totalTimeMinutes > 0 or completed)
// - OR has direct audit time allocated to it
export function computeTaskTimeAudit(
  schedules: Record<string, DaySchedule>,
  history: MonthLogRecord[]
): TaskTimeAuditItem[] {
  const auditMap: Map<string, TaskTimeAuditItem> = new Map();
  const scheduleTaskKeys = new Set<string>();

  // 1. Collect all known tasks from current active schedules
  for (const sched of Object.values(schedules)) {
    for (const t of sched.tasks) {
      const key = t.title.trim().toLowerCase();
      scheduleTaskKeys.add(key);

      if (!auditMap.has(key)) {
        auditMap.set(key, {
          taskId: t.id,
          title: t.title,
          category: t.category,
          isRepetitive: t.isRepetitive !== false,
          isCustom: !!t.isCustom,
          totalTimeMinutes: 0,
          completedSessionsCount: 0,
          totalSessionsCount: 0,
        });
      }
    }
  }

  // 2. Scan all historical records (all months, weeks, days, tasks)
  for (const month of history) {
    for (const week of month.weeks) {
      for (const day of week.days) {
        for (const t of day.tasks) {
          const key = t.title.trim().toLowerCase();
          const timeWorked = t.timeSpentMinutes || 0;
          const isDone = !!t.completed;

          let item = auditMap.get(key);
          if (!item) {
            // Only consider if it currently exists in schedule OR had actual work logged
            if (scheduleTaskKeys.has(key) || timeWorked > 0 || isDone) {
              item = {
                taskId: t.taskId,
                title: t.title,
                category: t.category,
                isRepetitive: t.isRepetitive !== false,
                isCustom: false,
                totalTimeMinutes: 0,
                completedSessionsCount: 0,
                totalSessionsCount: 0,
              };
              auditMap.set(key, item);
            } else {
              continue;
            }
          }

          // Track sessions and time
          if (timeWorked > 0 || isDone) {
            item.totalSessionsCount += 1;
            if (isDone) {
              item.completedSessionsCount += 1;
            }
            item.totalTimeMinutes += timeWorked;

            if (!item.firstTrackedDate || day.date < item.firstTrackedDate) {
              item.firstTrackedDate = day.date;
            }
            if (!item.lastTrackedDate || day.date > item.lastTrackedDate) {
              item.lastTrackedDate = day.date;
            }
          } else if (scheduleTaskKeys.has(key)) {
            // Scheduled task that was unworked in this particular past day
            item.totalSessionsCount += 1;
          }
        }
      }
    }
  }

  // 2.5 Apply direct task audit additions (logged WITHOUT specifying any day)
  const directAuditMap = getDirectTaskAuditMap();
  const titlesMap = getDirectTaskTitlesMap();
  for (const [key, directMinutes] of Object.entries(directAuditMap)) {
    if (directMinutes > 0) {
      let item = auditMap.get(key);
      if (!item) {
        const meta = titlesMap[key];
        item = {
          taskId: 'direct-' + key,
          title: meta?.title || key.toUpperCase(),
          category: meta?.category || 'custom',
          isRepetitive: false,
          isCustom: true,
          totalTimeMinutes: 0,
          completedSessionsCount: 0,
          totalSessionsCount: 1,
        };
        auditMap.set(key, item);
      }
      item.totalTimeMinutes += directMinutes;
    }
  }

  // 3. Filter rule:
  // Must exist in current schedule OR have logged work (> 0 minutes or completed session)
  const validItems = Array.from(auditMap.values()).filter((item) => {
    const existsInSchedule = scheduleTaskKeys.has(item.title.trim().toLowerCase());
    const hasLoggedWork = item.totalTimeMinutes > 0 || item.completedSessionsCount > 0;
    return existsInSchedule || hasLoggedWork;
  });

  // Sort by total time descending, then alpha
  return validItems.sort((a, b) => {
    if (b.totalTimeMinutes !== a.totalTimeMinutes) {
      return b.totalTimeMinutes - a.totalTimeMinutes;
    }
    return a.title.localeCompare(b.title);
  });
}

/**
 * Completely purges a task from Task Time Audit and Hierarchy Metrics:
 * 1. Purges the task from all historical days across all weeks & months in `history`.
 * 2. Recalculates and rebalances all Day, Week, and Month totals in the hierarchy.
 * 3. Clears any direct audit time entries for this task from storage.
 * 4. Clears date-specific time/completed records for this task if matched.
 * 5. Optionally removes the task from the recurring weekly schedule.
 * 6. Saves changes to localStorage and returns updated history & schedules.
 */
export function removeTaskFromAudit(
  taskTitleOrId: string,
  schedules?: Record<string, DaySchedule>,
  options?: { removeRecurring?: boolean }
): {
  updatedHistory: MonthLogRecord[];
  updatedSchedules: Record<string, DaySchedule>;
  removedHistoryMinutes: number;
  removedDirectMinutes: number;
  totalRemovedMinutes: number;
} {
  const targetKey = taskTitleOrId.trim().toLowerCase();
  const history = loadHierarchyHistory();
  let removedHistoryMinutes = 0;

  // 1. Scan and remove task from every historical day across all weeks & months
  for (const month of history) {
    for (const week of month.weeks || []) {
      for (const day of week.days || []) {
        const remainingTasks: DayTaskLog[] = [];
        for (const t of day.tasks || []) {
          const tKey = t.title.trim().toLowerCase();
          if (tKey === targetKey || t.taskId === taskTitleOrId) {
            removedHistoryMinutes += (t.timeSpentMinutes || 0);
          } else {
            remainingTasks.push(t);
          }
        }
        day.tasks = sortDayTaskLogsByStartTime(remainingTasks);
        day.totalTimeMinutes = day.tasks.reduce((sum, t) => sum + (t.timeSpentMinutes || 0), 0);
        day.completedCount = day.tasks.filter((t) => t.completed).length;
        day.totalTasksCount = day.tasks.length;
      }
      week.totalTimeMinutes = week.days.reduce((sum, d) => sum + d.totalTimeMinutes, 0);
      week.completedCount = week.days.reduce((sum, d) => sum + d.completedCount, 0);
      week.totalTasksCount = week.days.reduce((sum, d) => sum + d.totalTasksCount, 0);
    }
    month.totalTimeMinutes = month.weeks.reduce((sum, w) => sum + w.totalTimeMinutes, 0);
    month.completedCount = month.weeks.reduce((sum, w) => sum + w.completedCount, 0);
    month.totalTasksCount = month.weeks.reduce((sum, w) => sum + w.totalTasksCount, 0);
  }

  const updatedHistory = rebalanceAndSortHistory(history);
  saveHierarchyHistory(updatedHistory);

  // 2. Remove direct audit minutes if any
  const directMap = getDirectTaskAuditMap();
  const removedDirectMinutes = directMap[targetKey] || 0;
  if (removedDirectMinutes > 0) {
    delete directMap[targetKey];
    saveDirectTaskAuditMap(directMap);
  }
  const titlesMap = getDirectTaskTitlesMap();
  if (titlesMap[targetKey]) {
    delete titlesMap[targetKey];
    saveDirectTaskTitlesMap(titlesMap);
  }

  // 3. Remove from recurring schedules if requested (default true)
  const updatedSchedules: Record<string, DaySchedule> = schedules ? { ...schedules } : loadSchedules();
  if (options?.removeRecurring !== false) {
    for (const [dayKey, sched] of Object.entries(updatedSchedules)) {
      const filtered = sched.tasks.filter(
        (t) => t.title.trim().toLowerCase() !== targetKey && t.id !== taskTitleOrId
      );
      if (filtered.length !== sched.tasks.length) {
        updatedSchedules[dayKey] = {
          ...sched,
          tasks: filtered,
        };
      }
    }
    saveSchedules(updatedSchedules);
  }

  // 4. Clean up any local storage time maps with matching task keys
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('alt_routine_time_spent_date_')) {
        const raw = localStorage.getItem(k);
        if (raw) {
          const map = JSON.parse(raw);
          let changed = false;
          for (const taskId of Object.keys(map)) {
            if (taskId === taskTitleOrId) {
              delete map[taskId];
              changed = true;
            }
          }
          if (changed) {
            localStorage.setItem(k, JSON.stringify(map));
          }
        }
      }
    }
  } catch {
    // ignore
  }

  const totalRemovedMinutes = removedHistoryMinutes + removedDirectMinutes;

  return {
    updatedHistory,
    updatedSchedules,
    removedHistoryMinutes,
    removedDirectMinutes,
    totalRemovedMinutes,
  };
}
