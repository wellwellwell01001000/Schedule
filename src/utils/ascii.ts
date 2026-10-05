import { AsciiBarStyle } from '../types';

/**
 * Generates an ASCII progress bar string.
 * Example outputs:
 * [████████████░░░░░░░░] 60% (6/10)
 * [============>       ] 60% (6/10)
 * [############........] 60% (6/10)
 */
export function generateAsciiProgressBar(
  completed: number,
  total: number,
  width: number = 24,
  style: AsciiBarStyle = 'blocks'
): string {
  if (total <= 0) {
    return `[${' '.repeat(width)}] 0% (0/0)`;
  }

  const ratio = Math.max(0, Math.min(1, completed / total));
  const filledSlots = Math.round(ratio * width);
  const emptySlots = Math.max(0, width - filledSlots);
  const percentage = Math.round(ratio * 100);

  let bar = '';

  switch (style) {
    case 'blocks': {
      const filled = '█'.repeat(filledSlots);
      const empty = '░'.repeat(emptySlots);
      bar = `[${filled}${empty}]`;
      break;
    }
    case 'equals': {
      let inner = '';
      if (filledSlots === 0) {
        inner = ' '.repeat(width);
      } else if (filledSlots === width) {
        inner = '='.repeat(width);
      } else {
        inner = '='.repeat(Math.max(0, filledSlots - 1)) + '>' + ' '.repeat(emptySlots);
      }
      bar = `[${inner}]`;
      break;
    }
    case 'hashes': {
      const filled = '#'.repeat(filledSlots);
      const empty = '.'.repeat(emptySlots);
      bar = `[${filled}${empty}]`;
      break;
    }
    case 'pipes': {
      const filled = '|'.repeat(filledSlots);
      const empty = '-'.repeat(emptySlots);
      bar = `[${filled}${empty}]`;
      break;
    }
  }

  return `${bar} ${percentage.toString().padStart(3, ' ')}% (${completed}/${total})`;
}

/**
 * Returns the current day key ('mon', 'tue', etc.) from a Date object.
 */
export function getDayKeyFromDate(date: Date = new Date()): string {
  const day = date.getDay(); // 0 = Sunday, 1 = Monday, ...
  const map = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return map[day];
}

/**
 * Returns the current system date as 'YYYY-MM-DD'
 */
export function getTodayDateStr(date: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Computes the exact ISO YYYY-MM-DD date for any DayKey within the active week
 */
export function getDateForDayKey(dayKey: string, baseDate: Date = new Date()): string {
  const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const targetIndex = dayKeys.indexOf(dayKey);
  if (targetIndex === -1) return getTodayDateStr(baseDate);

  const currentDayOfWeek = baseDate.getDay();
  // Monday is index 0, Sunday is index 6
  const currentIsoIndex = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
  const diffDays = targetIndex - currentIsoIndex;

  const d = new Date(baseDate);
  d.setDate(d.getDate() + diffDays);

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Formats current system timestamp in monospace terminal format
 * e.g. "2026-09-03 07:58:12 UTC-7 [THU]"
 */
export function formatTerminalTimestamp(date: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const dayName = days[date.getDay()];

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} [${dayName}]`;
}
