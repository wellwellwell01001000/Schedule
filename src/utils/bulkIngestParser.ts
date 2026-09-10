import { DayKey, TaskCategory, TaskItem } from '../types';

export interface ParsedTaskDraft {
  id: string;
  rawLine: string;
  isValid: boolean;
  errorMessage?: string;
  title: string;
  timeSlot: string; // e.g. "08:00 – 09:00"
  startMinutes: number;
  endMinutes: number;
  durationMinutes: number;
  category: TaskCategory;
  isRepetitive: boolean;
  repeatDays: DayKey[];
  details: string;
}

const ALL_DAYS: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const WEEKDAYS: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri'];
const WEEKENDS: DayKey[] = ['sat', 'sun'];

/**
 * Infer task category based on keywords in title
 */
export function inferCategory(text: string): TaskCategory {
  const lower = text.toLowerCase();
  
  if (/\b(workout|gym|lift|cardio|run|running|bench|squat|deadlift|push|pull|legs|stretch|training|zone 2|fitness|calisthenics)\b/.test(lower)) {
    return 'workout';
  }
  if (/\b(ml|machine learning|pytorch|tensor|neural|deep learning|transformer|llm|dataset|weights|backprop|ai model|inference)\b/.test(lower)) {
    return 'ml';
  }
  if (/\b(guitar|music|chords|fretboard|scales|riff|solo|bass|jamming|metronome|acoustic|electric guitar)\b/.test(lower)) {
    return 'guitar';
  }
  if (/\b(cyber|security|ctf|reverse engineering|exploit|pentest|pwn|binary|wireshark|cryptography|vulnerability|firewall|auth token)\b/.test(lower)) {
    return 'cyber';
  }
  if (/\b(game|gamedev|unity|unreal|godot|shader|blender|3d model|sprites|rigging|level design|game engine)\b/.test(lower)) {
    return 'gamedev';
  }
  if (/\b(college|class|lecture|homework|assignment|exam|quiz|math|algebra|discrete|algorithms|cs\d+|professor|university|study)\b/.test(lower)) {
    return 'college';
  }
  if (/\b(relax|break|dinner|lunch|breakfast|meal|coffee|tea|walk|nap|movie|chill|gaming|friends)\b/.test(lower)) {
    return 'leisure';
  }
  if (/\b(shower|sleep|wake|bedtime|meditation|cold shower|hygiene|routine|protocol|planning|recap|review|journal)\b/.test(lower)) {
    return 'routine';
  }

  return 'custom';
}

/**
 * Parse day recurrence tag like [mwf], [sat,sun,mon], [daily], [weekdays], [once]
 */
export function parseRecurrenceTag(text: string, defaultDay: DayKey): { repeatDays: DayKey[]; isRepetitive: boolean; cleanText: string } {
  // Check for brackets like [sat,sun,mon], [daily], [mwf], etc.
  const bracketMatch = text.match(/\[([a-zA-Z0-9,\s\-]+)\]/);
  
  if (!bracketMatch) {
    return {
      repeatDays: [defaultDay],
      isRepetitive: true,
      cleanText: text.trim(),
    };
  }

  const rawTag = bracketMatch[1].toLowerCase().trim();
  const cleanText = text.replace(bracketMatch[0], '').replace(/\s+/g, ' ').trim();

  // Keyword tags
  if (rawTag === 'daily' || rawTag === 'everyday' || rawTag === 'all' || rawTag === 'all days') {
    return { repeatDays: [...ALL_DAYS], isRepetitive: true, cleanText };
  }
  if (rawTag === 'weekdays' || rawTag === 'm-f' || rawTag === 'mon-fri') {
    return { repeatDays: [...WEEKDAYS], isRepetitive: true, cleanText };
  }
  if (rawTag === 'weekends' || rawTag === 'sat-sun' || rawTag === 'sat,sun') {
    return { repeatDays: [...WEEKENDS], isRepetitive: true, cleanText };
  }
  if (rawTag === 'once' || rawTag === 'today' || rawTag === 'single') {
    return { repeatDays: [defaultDay], isRepetitive: false, cleanText };
  }
  if (rawTag === 'mwf') {
    return { repeatDays: ['mon', 'wed', 'fri'], isRepetitive: true, cleanText };
  }
  if (rawTag === 'tts' || rawTag === 'tth' || rawTag === 'th') {
    return { repeatDays: ['tue', 'thu', 'sat'], isRepetitive: true, cleanText };
  }

  // Comma or space separated custom days (e.g. "sat,sun,mon", "mon wed fri", "m,w,f")
  const dayTokens = rawTag.split(/[,\s]+/).map(t => t.trim()).filter(Boolean);
  const matchedDays: DayKey[] = [];

  for (const token of dayTokens) {
    if (token.startsWith('mon') || token === 'm') {
      if (!matchedDays.includes('mon')) matchedDays.push('mon');
    } else if (token.startsWith('tue') || token === 'tu') {
      if (!matchedDays.includes('tue')) matchedDays.push('tue');
    } else if (token.startsWith('wed') || token === 'w') {
      if (!matchedDays.includes('wed')) matchedDays.push('wed');
    } else if (token.startsWith('thu') || token === 'th') {
      if (!matchedDays.includes('thu')) matchedDays.push('thu');
    } else if (token.startsWith('fri') || token === 'f') {
      if (!matchedDays.includes('fri')) matchedDays.push('fri');
    } else if (token.startsWith('sat') || token === 'sa') {
      if (!matchedDays.includes('sat')) matchedDays.push('sat');
    } else if (token.startsWith('sun') || token === 'su') {
      if (!matchedDays.includes('sun')) matchedDays.push('sun');
    }
  }

  if (matchedDays.length > 0) {
    return {
      repeatDays: matchedDays,
      isRepetitive: true,
      cleanText,
    };
  }

  return {
    repeatDays: [defaultDay],
    isRepetitive: true,
    cleanText,
  };
}

/**
 * Parses time tokens in 24h format, e.g.:
 * "08:00 - 09:00"
 * "14:30 – 16:00"
 * "08:00 to 09:30"
 * "8:00 - 9:00"
 * "14:00 (45m)"
 */
export function parseTimeAndTitle(rawLine: string): {
  isValid: boolean;
  timeSlot: string;
  startMinutes: number;
  endMinutes: number;
  durationMinutes: number;
  title: string;
  errorMessage?: string;
} {
  const line = rawLine.trim();
  if (!line) {
    return {
      isValid: false,
      timeSlot: '08:00 – 09:00',
      startMinutes: 480,
      endMinutes: 540,
      durationMinutes: 60,
      title: '',
      errorMessage: 'Empty line',
    };
  }

  // Pattern 1: Time range at start of line: "08:00 - 09:30 Title..." or "08:00 – 09:30: Title"
  const rangeMatch = line.match(/^(\d{1,2}):(\d{2})\s*(?:[-–—]|to)\s*(\d{1,2}):(\d{2})\s*[:\s-]*(.*)$/i);
  if (rangeMatch) {
    const startH = parseInt(rangeMatch[1], 10);
    const startM = parseInt(rangeMatch[2], 10);
    const endH = parseInt(rangeMatch[3], 10);
    const endM = parseInt(rangeMatch[4], 10);
    const title = rangeMatch[5].trim();

    if (startH < 0 || startH > 23 || startM < 0 || startM > 59) {
      return {
        isValid: false,
        timeSlot: '00:00 – 01:00',
        startMinutes: 0,
        endMinutes: 60,
        durationMinutes: 60,
        title,
        errorMessage: `Invalid start time 24H: ${startH}:${startM}`,
      };
    }

    if (endH < 0 || endH > 23 || endM < 0 || endM > 59) {
      return {
        isValid: false,
        timeSlot: '00:00 – 01:00',
        startMinutes: 0,
        endMinutes: 60,
        durationMinutes: 60,
        title,
        errorMessage: `Invalid end time 24H: ${endH}:${endM}`,
      };
    }

    const startMinutes = startH * 60 + startM;
    let endMinutes = endH * 60 + endM;
    let duration = endMinutes - startMinutes;
    if (duration <= 0) {
      duration += 1440; // overnight wrap
    }

    const pad = (n: number) => String(n).padStart(2, '0');
    const timeSlot = `${pad(startH)}:${pad(startM)} – ${pad(endH)}:${pad(endM)}`;

    return {
      isValid: title.length > 0,
      timeSlot,
      startMinutes,
      endMinutes,
      durationMinutes: duration,
      title: title || 'Untitled Task',
      errorMessage: title.length === 0 ? 'Missing task title' : undefined,
    };
  }

  // Pattern 2: Single start time with duration e.g. "08:00 (45m) Title" or "08:00 45m Title"
  const singleWithDurMatch = line.match(/^(\d{1,2}):(\d{2})\s*(?:\((\d+)\s*(?:m|min|mins)?\)|\[(\d+)\s*(?:m|min|mins)?\]|(\d+)\s*(?:m|min|mins))\s*[:\s-]*(.*)$/i);
  if (singleWithDurMatch) {
    const startH = parseInt(singleWithDurMatch[1], 10);
    const startM = parseInt(singleWithDurMatch[2], 10);
    const dur = parseInt(singleWithDurMatch[3] || singleWithDurMatch[4] || singleWithDurMatch[5], 10) || 60;
    const title = singleWithDurMatch[6].trim();

    if (startH < 0 || startH > 23 || startM < 0 || startM > 59) {
      return {
        isValid: false,
        timeSlot: '00:00 – 01:00',
        startMinutes: 0,
        endMinutes: 60,
        durationMinutes: 60,
        title,
        errorMessage: `Invalid start time 24H: ${startH}:${startM}`,
      };
    }

    const startMinutes = startH * 60 + startM;
    const endMinutes = (startMinutes + dur) % 1440;
    const pad = (n: number) => String(n).padStart(2, '0');
    const endH = Math.floor(endMinutes / 60);
    const endM = endMinutes % 60;
    const timeSlot = `${pad(startH)}:${pad(startM)} – ${pad(endH)}:${pad(endM)}`;

    return {
      isValid: title.length > 0,
      timeSlot,
      startMinutes,
      endMinutes,
      durationMinutes: dur,
      title: title || 'Untitled Task',
      errorMessage: title.length === 0 ? 'Missing task title' : undefined,
    };
  }

  // Pattern 3: Single start time without duration e.g. "08:00 Morning Review" -> default 45 mins
  const singleTimeMatch = line.match(/^(\d{1,2}):(\d{2})\s*[:\s-]*(.*)$/i);
  if (singleTimeMatch) {
    const startH = parseInt(singleTimeMatch[1], 10);
    const startM = parseInt(singleTimeMatch[2], 10);
    const title = singleTimeMatch[3].trim();

    if (startH < 0 || startH > 23 || startM < 0 || startM > 59) {
      return {
        isValid: false,
        timeSlot: '00:00 – 00:45',
        startMinutes: 0,
        endMinutes: 45,
        durationMinutes: 45,
        title,
        errorMessage: `Invalid start time 24H: ${startH}:${startM}`,
      };
    }

    const startMinutes = startH * 60 + startM;
    const endMinutes = (startMinutes + 45) % 1440;
    const pad = (n: number) => String(n).padStart(2, '0');
    const endH = Math.floor(endMinutes / 60);
    const endM = endMinutes % 60;
    const timeSlot = `${pad(startH)}:${pad(startM)} – ${pad(endH)}:${pad(endM)}`;

    return {
      isValid: title.length > 0,
      timeSlot,
      startMinutes,
      endMinutes,
      durationMinutes: 45,
      title: title || 'Untitled Task',
      errorMessage: title.length === 0 ? 'Missing task title' : undefined,
    };
  }

  // Fallback: No time found, treat entire line as title with a default 19:00-20:00 slot
  return {
    isValid: line.length > 0,
    timeSlot: '19:00 – 20:00',
    startMinutes: 1140,
    endMinutes: 1200,
    durationMinutes: 60,
    title: line,
    errorMessage: undefined,
  };
}

/**
 * Full parser: Takes multi-line text and converts to array of ParsedTaskDraft
 */
export function parseBulkText(rawText: string, defaultDay: DayKey): ParsedTaskDraft[] {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  
  return lines.map((line, index) => {
    // 1. Extract recurrence tag e.g. [sat,sun,mon] or [daily]
    const { repeatDays, isRepetitive, cleanText } = parseRecurrenceTag(line, defaultDay);

    // 2. Parse time range and title
    const parsed = parseTimeAndTitle(cleanText);

    // 3. Infer category
    const category = inferCategory(parsed.title);

    return {
      id: `draft-${index}-${Date.now()}`,
      rawLine: line,
      isValid: parsed.isValid,
      errorMessage: parsed.errorMessage,
      title: parsed.title,
      timeSlot: parsed.timeSlot,
      startMinutes: parsed.startMinutes,
      endMinutes: parsed.endMinutes,
      durationMinutes: parsed.durationMinutes,
      category,
      isRepetitive,
      repeatDays,
      details: 'Bulk ingested schedule task.',
    };
  });
}

/**
 * Converts drafts to TaskItems ready for insertion into schedules
 */
export function convertDraftsToTaskItems(drafts: ParsedTaskDraft[]): TaskItem[] {
  return drafts
    .filter(d => d.isValid)
    .map(d => ({
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: d.title,
      time: d.timeSlot,
      durationMinutes: d.durationMinutes,
      timeSpentMinutes: 0,
      category: d.category,
      details: d.details || 'Bulk ingested task item.',
      isScheduled: true,
      isRepetitive: d.isRepetitive,
      repeatDays: d.repeatDays,
      isCustom: true,
      oneTimeDate: d.isRepetitive ? undefined : '2026-09-03',
    }));
}
