import { TaskItem, DayTaskLog } from '../types';

/**
 * Extracts start time in minutes from midnight (0..1439).
 * Parses formats such as:
 * - "13:00 - 14:00", "13:00 – 14:00", "13:00 to 14:00"
 * - "1300 to 1400", "1300 - 1400"
 * - "05:30", "5:30", "9:00"
 * - "1:30 PM", "9:00 AM", "2pm"
 * Returns Number.MAX_SAFE_INTEGER if completely unparseable so it safely sits at the end.
 */
export function parseStartTimeMinutes(timeStr?: string): number {
  if (!timeStr) return Number.MAX_SAFE_INTEGER;
  const str = timeStr.trim();
  if (!str) return Number.MAX_SAFE_INTEGER;

  // 1. Check 12-hour AM/PM format at start, e.g. "1:30 PM", "09:00 AM", "2pm", "11am"
  const ampmMatch = str.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1], 10);
    const m = ampmMatch[2] ? parseInt(ampmMatch[2], 10) : 0;
    const isPM = ampmMatch[3].toLowerCase() === 'pm';
    if (isPM && h < 12) h += 12;
    if (!isPM && h === 12) h = 0;
    return h * 60 + m;
  }

  // 2. Check 24-hour with colon at start, e.g. "13:00", "05:30", "9:15"
  const colonMatch = str.match(/^(\d{1,2}):(\d{2})/);
  if (colonMatch) {
    const h = parseInt(colonMatch[1], 10);
    const m = parseInt(colonMatch[2], 10);
    if (!isNaN(h) && !isNaN(m)) {
      return h * 60 + m;
    }
  }

  // 3. Check 4-digit format without colon, e.g. "1300 to 1400", "0930 - 1030"
  const fourDigitMatch = str.match(/^(\d{2})(\d{2})/);
  if (fourDigitMatch) {
    const h = parseInt(fourDigitMatch[1], 10);
    const m = parseInt(fourDigitMatch[2], 10);
    if (!isNaN(h) && !isNaN(m) && h >= 0 && h <= 24 && m >= 0 && m < 60) {
      return h * 60 + m;
    }
  }

  // 4. Check single or double digit hour at beginning, e.g. "9 - 10", "9 to 10"
  const singleHourMatch = str.match(/^(\d{1,2})(?:\s*[-–—]|\s+to\b|\s*$)/i);
  if (singleHourMatch) {
    const h = parseInt(singleHourMatch[1], 10);
    if (!isNaN(h) && h >= 0 && h <= 24) {
      return h * 60;
    }
  }

  // 5. Fallback: take the first token before a separator and check for time patterns
  const firstPart = str.split(/[-–—]|(\s+to\s+)/i)[0].trim();
  const fallbackColon = firstPart.match(/(\d{1,2}):(\d{2})/);
  if (fallbackColon) {
    const h = parseInt(fallbackColon[1], 10);
    const m = parseInt(fallbackColon[2], 10);
    if (!isNaN(h) && !isNaN(m)) return h * 60 + m;
  }

  const fallbackDigits = firstPart.match(/^(\d{1,4})/);
  if (fallbackDigits) {
    const val = parseInt(fallbackDigits[1], 10);
    if (fallbackDigits[1].length === 4) {
      return Math.floor(val / 100) * 60 + (val % 100);
    } else if (val <= 24) {
      return val * 60;
    }
  }

  return Number.MAX_SAFE_INTEGER;
}

/**
 * Sorts an array of TaskItem objects strictly in ascending order by their start time.
 * End time does not affect ordering.
 * If two tasks have the exact same start time, their relative order is preserved.
 */
export function sortTasksByStartTime(tasks: TaskItem[]): TaskItem[] {
  return [...tasks].sort((a, b) => {
    const timeA = parseStartTimeMinutes(a.time);
    const timeB = parseStartTimeMinutes(b.time);
    return timeA - timeB;
  });
}

/**
 * Sorts an array of DayTaskLog objects strictly in ascending order by their start time.
 */
export function sortDayTaskLogsByStartTime(tasks: DayTaskLog[]): DayTaskLog[] {
  return [...tasks].sort((a, b) => {
    const timeA = parseStartTimeMinutes(a.timeSlot);
    const timeB = parseStartTimeMinutes(b.timeSlot);
    return timeA - timeB;
  });
}

/**
 * Parses any time slot string into start and end minutes from midnight.
 * Supports:
 * - "07:00 – 08:10", "07:00-08:10", "07:00 to 08:10"
 * - "7:00 AM – 8:10 AM", "1:30 PM - 2:45 PM", "11am to 12pm"
 * - Single time string like "07:00" or "9:00 AM" (using defaultDurationMinutes)
 */
export function parseTimeSlotRange(
  timeStr?: string,
  defaultDurationMinutes: number = 60
): { start: number; end: number } | null {
  if (!timeStr) return null;
  const str = timeStr.trim();
  if (!str) return null;

  // Split by range separators: en-dash, em-dash, hyphen, or 'to'
  const parts = str.split(/\s*[-–—]\s*|\s+to\s+/i);
  if (parts.length >= 2) {
    const start = parseStartTimeMinutes(parts[0]);
    const end = parseStartTimeMinutes(parts[1]);
    if (start !== Number.MAX_SAFE_INTEGER && end !== Number.MAX_SAFE_INTEGER && end > start) {
      return { start, end };
    } else if (start !== Number.MAX_SAFE_INTEGER) {
      return { start, end: Math.min(1439, start + defaultDurationMinutes) };
    }
  }

  // Single time entry
  const start = parseStartTimeMinutes(str);
  if (start !== Number.MAX_SAFE_INTEGER) {
    return { start, end: Math.min(1439, start + defaultDurationMinutes) };
  }

  return null;
}
