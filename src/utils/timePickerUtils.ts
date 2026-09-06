/**
 * Utility functions for parsing, formatting, and synchronizing
 * Start Time, End Time, and Duration (Estimate) blocks.
 */

import { parseStartTimeMinutes } from './taskSorting';

export function minutesToTimeString(minutes: number): string {
  const norm = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function minutesTo12HourString(minutes: number): string {
  const norm = ((minutes % 1440) + 1440) % 1440;
  let h = Math.floor(norm / 60);
  const m = norm % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function formatDurationHuman(minutes: number): string {
  const safeMins = Math.max(0, minutes);
  const h = Math.floor(safeMins / 60);
  const m = safeMins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Parses a time slot string like "18:00 – 20:00" or "1800 - 2000" or "07:00"
 * into startMinutes, endMinutes, and durationMinutes.
 */
export function parseTimeSlot(
  timeSlotStr?: string,
  fallbackDuration = 60
): { startMinutes: number; endMinutes: number; durationMinutes: number } {
  if (!timeSlotStr || !timeSlotStr.trim()) {
    // Default: 19:00 - 20:00 (60 mins)
    const defStart = 19 * 60;
    const defEnd = defStart + fallbackDuration;
    return {
      startMinutes: defStart,
      endMinutes: defEnd,
      durationMinutes: fallbackDuration,
    };
  }

  const parts = timeSlotStr.split(/[-–—]|(\s+to\s+)/i).filter((s) => s && s.trim() && !/^(to|-|–|—)$/i.test(s.trim()));
  
  if (parts.length >= 2) {
    const startStr = parts[0].trim();
    const endStr = parts[1].trim();
    const parsedStart = parseStartTimeMinutes(startStr);
    const parsedEnd = parseStartTimeMinutes(endStr);

    if (parsedStart !== Number.MAX_SAFE_INTEGER && parsedEnd !== Number.MAX_SAFE_INTEGER) {
      let duration = parsedEnd - parsedStart;
      let finalEnd = parsedEnd;
      if (duration <= 0) {
        // Across midnight or inverted: adjust duration or end
        duration = duration < 0 ? duration + 1440 : fallbackDuration;
        finalEnd = (parsedStart + duration) % 1440;
      }
      return {
        startMinutes: parsedStart,
        endMinutes: finalEnd,
        durationMinutes: duration,
      };
    }
  }

  // Single time given (e.g. "18:00")
  const parsedStart = parseStartTimeMinutes(timeSlotStr);
  const start = parsedStart !== Number.MAX_SAFE_INTEGER ? parsedStart : 19 * 60;
  const duration = fallbackDuration > 0 ? fallbackDuration : 60;
  const end = (start + duration) % 1440;

  return {
    startMinutes: start,
    endMinutes: end,
    durationMinutes: duration,
  };
}

export function formatTimeSlot(startMinutes: number, endMinutes: number): string {
  return `${minutesToTimeString(startMinutes)} – ${minutesToTimeString(endMinutes)}`;
}

/**
 * Rule 1: Change START TIME -> END TIME STAYS FIXED, ESTIMATE UPDATES
 */
export function updateStartTime(
  newStartMinutes: number,
  currentEndMinutes: number,
  _currentDuration: number
): { startMinutes: number; endMinutes: number; durationMinutes: number } {
  const normStart = ((newStartMinutes % 1440) + 1440) % 1440;
  let end = currentEndMinutes;
  let duration = end - normStart;

  // If start is moved at or past end, nudge end so duration is at least 15m
  if (duration <= 0) {
    duration = 15;
    end = (normStart + 15) % 1440;
  }

  return {
    startMinutes: normStart,
    endMinutes: end,
    durationMinutes: duration,
  };
}

/**
 * Rule 2: Change END TIME -> START TIME STAYS FIXED, ESTIMATE UPDATES
 */
export function updateEndTime(
  currentStartMinutes: number,
  newEndMinutes: number,
  _currentDuration: number
): { startMinutes: number; endMinutes: number; durationMinutes: number } {
  const normEnd = ((newEndMinutes % 1440) + 1440) % 1440;
  let duration = normEnd - currentStartMinutes;

  if (duration <= 0) {
    duration = 15;
    const adjustedEnd = (currentStartMinutes + 15) % 1440;
    return {
      startMinutes: currentStartMinutes,
      endMinutes: adjustedEnd,
      durationMinutes: 15,
    };
  }

  return {
    startMinutes: currentStartMinutes,
    endMinutes: normEnd,
    durationMinutes: duration,
  };
}

/**
 * Rule 3: Change ESTIMATE -> START TIME STAYS FIXED, END TIME UPDATES
 */
export function updateEstimateDuration(
  currentStartMinutes: number,
  newDurationMinutes: number
): { startMinutes: number; endMinutes: number; durationMinutes: number } {
  const safeDuration = Math.max(5, Math.min(1440, newDurationMinutes));
  const newEnd = (currentStartMinutes + safeDuration) % 1440;

  return {
    startMinutes: currentStartMinutes,
    endMinutes: newEnd,
    durationMinutes: safeDuration,
  };
}
