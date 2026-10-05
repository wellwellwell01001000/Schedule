export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export type DayCode = 'A-DAY' | 'B-DAY' | 'WEEKEND-SAT' | 'WEEKEND-SUN' | string;

export type TaskCategory = 
  | 'workout'
  | 'ml'
  | 'guitar'
  | 'cyber'
  | 'gamedev'
  | 'college'
  | 'leisure'
  | 'routine'
  | 'custom';

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

export type ActiveTab = 'tracker' | 'hierarchy' | 'task_audit';

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
