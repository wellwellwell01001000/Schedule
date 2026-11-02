export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export type DayCode = 'A-DAY' | 'B-DAY' | 'WEEKEND-SAT' | 'WEEKEND-SUN' | string;

export type TaskCategory = 'work' | 'workout' | 'leisure' | string;

export type TaskType = 'timed_routine' | 'timed_note' | 'untimed_checklist' | 'untimed_note';

export interface TaskItem {
  id: string;
  time: string;
  title: string;
  category: TaskCategory;
  details: string;
  durationMinutes: number; // planned minutes
  timeSpentMinutes?: number; // actual tracked time in minutes
  isScheduled?: boolean; // true if active, false if descheduled/parked
  isRepetitive?: boolean; // true = repeats on days, false = one-time
  repeatDays?: DayKey[]; // e.g. ['mon', 'wed', 'fri']
  oneTimeDate?: string; // YYYY-MM-DD for one-time tasks
  highlight?: boolean;
  isCustom?: boolean;
  taskType?: TaskType;
  isCheckable?: boolean; // true for checkable, false for pure note
  isUntimed?: boolean; // true for all-day untimed scratchpad items
}

export interface DaySchedule {
  dayKey: DayKey;
  dayName: string;
  code: DayCode;
  categoryLabel: string;
  focusSummary: string;
  isRestWorkout?: boolean;
  tasks: TaskItem[];
}

export type AsciiBarStyle = 'blocks' | 'equals' | 'hashes' | 'pipes';

export interface MetricComparison {
  metric: string;
  allInOne: string;
  alternating: string;
  winner: string;
  why: string;
}

export type ActiveTab = 'tracker' | 'hierarchy' | 'task_audit' | 'habits';

export interface HabitItem {
  id: string;
  title: string;
  category: TaskCategory;
  targetDaysPerWeek: number; // 1 to 7 days per week
  frequency?: string; // deprecated legacy field
  description?: string;
  createdAt: string; // YYYY-MM-DD
}

export interface HabitStats {
  currentStreak: number; // cumulative days across consecutive qualifying weeks
  bestStreak: number;
  totalCompletions: number;
  completionRate30d: number;
  currentWeekCompleted: number;
  targetDaysPerWeek: number;
  isTargetMetThisWeek: boolean;
  historyTrail7d: { dateStr: string; dayLabel: string; completed: boolean }[];
  historyTrail30d: { dateStr: string; completed: boolean }[];
  isCompletedToday: boolean;
}

// Hierarchical Log structures
export interface DayTaskLog {
  taskId: string;
  title: string;
  category: TaskCategory;
  timeSpentMinutes: number;
  completed: boolean;
  isScheduled: boolean;
  isRepetitive: boolean;
  timeSlot?: string;
  details?: string;
  taskType?: TaskType;
}

export interface DayLogRecord {
  date: string; // YYYY-MM-DD
  dayKey: DayKey;
  dayName: string;
  code?: DayCode;
  tasks: DayTaskLog[];
  totalTimeMinutes: number;
  completedCount: number;
  totalTasksCount: number;
}

export interface WeekLogRecord {
  weekId: string; // e.g. '2026-W36'
  weekNumber: number;
  label: string; // e.g. 'Week 1 (Sep 01 – Sep 07)'
  startDate: string;
  endDate: string;
  days: DayLogRecord[];
  totalTimeMinutes: number;
  completedCount: number;
  totalTasksCount: number;
}

export interface MonthLogRecord {
  monthKey: string; // '2026-09'
  monthName: string; // 'September 2026'
  year: number;
  monthIndex: number; // 0-11
  weeks: WeekLogRecord[];
  totalTimeMinutes: number;
  completedCount: number;
  totalTasksCount: number;
}

export interface TaskTimeAuditItem {
  taskId: string;
  title: string;
  category: TaskCategory;
  isRepetitive: boolean;
  isCustom: boolean;
  totalTimeMinutes: number;
  completedSessionsCount: number;
  totalSessionsCount: number;
  firstTrackedDate?: string;
  lastTrackedDate?: string;
}
