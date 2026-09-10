import {
  DayKey,
  DaySchedule,
  MonthLogRecord,
  WeekLogRecord,
  DayLogRecord,
  DayTaskLog,
  TaskItem,
  TaskTimeAuditItem,
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
        return parsed;
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
    localStorage.setItem(STORAGE_CUSTOM_SCHEDULES_KEY, JSON.stringify(schedules));
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

// Compute per-task time calculation audit across all history and all custom schedules
// A task appears in the audit IF AND ONLY IF:
// - It currently exists in the schedule (active or parked, one-time or repetitive)
// - OR, if removed from the schedule, it had actual work logged (totalTimeMinutes > 0 or completed)
// Any removed task that had 0% / 0 minutes worked does NOT stay in the audit.
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

  // 2.5 Account for active uncommitted schedule time (e.g. today's active stopwatch or manual +/- minutes)
  for (const sched of Object.values(schedules)) {
    for (const t of sched.tasks) {
      const key = t.title.trim().toLowerCase();
      const item = auditMap.get(key);
      if (item && t.timeSpentMinutes && t.timeSpentMinutes > 0) {
        if (item.totalTimeMinutes < t.timeSpentMinutes) {
          item.totalTimeMinutes = Math.max(item.totalTimeMinutes, t.timeSpentMinutes);
        }
      }
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
