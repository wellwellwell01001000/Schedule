export interface ShortcutAction {
  id: keyof ShortcutConfig;
  label: string;
  category: 'navigation' | 'execution' | 'tasks' | 'system';
  defaultKey: string;
  displayDefault: string;
}

export interface ShortcutConfig {
  nav_tracker: string;
  nav_hierarchy: string;
  nav_audit: string;
  jump_today: string;
  prev_day: string;
  next_day: string;
  open_settings: string;
  open_sync: string;
  open_shortcuts: string;
  toggle_timer: string;
  toggle_complete: string;
  log_time: string;
  reduce_time: string;
  pomodoro_play_pause: string;
  pomodoro_reset: string;
  add_task: string;
  bulk_ingest: string;
  quick_filter: string;
}

export const DEFAULT_SHORTCUT_ACTIONS: ShortcutAction[] = [
  // Navigation & Days
  { id: 'nav_tracker', label: 'Switch to Timeline Tracker View', category: 'navigation', defaultKey: '1', displayDefault: '[1]' },
  { id: 'nav_hierarchy', label: 'Switch to Hierarchy Metrics View', category: 'navigation', defaultKey: '2', displayDefault: '[2]' },
  { id: 'nav_audit', label: 'Switch to Task Time Audit View', category: 'navigation', defaultKey: '3', displayDefault: '[3]' },
  { id: 'jump_today', label: 'Jump to Today', category: 'navigation', defaultKey: 't', displayDefault: '[T]' },
  { id: 'prev_day', label: 'Previous Day in Schedule', category: 'navigation', defaultKey: '[', displayDefault: '[' },
  { id: 'next_day', label: 'Next Day in Schedule', category: 'navigation', defaultKey: ']', displayDefault: ']' },

  // Execution & Timing
  { id: 'pomodoro_play_pause', label: 'Start / Pause Pomodoro Session', category: 'execution', defaultKey: 'p', displayDefault: '[P]' },
  { id: 'pomodoro_reset', label: 'Reset Pomodoro Timer', category: 'execution', defaultKey: 'r', displayDefault: '[R]' },
  { id: 'toggle_timer', label: 'Start / Stop Live Stopwatch', category: 'execution', defaultKey: ' ', displayDefault: '[SPACE]' },
  { id: 'toggle_complete', label: 'Mark Directive Task Completed / Reopen', category: 'execution', defaultKey: 'x', displayDefault: '[X]' },
  { id: 'log_time', label: 'Quick Log Time (+15m)', category: 'execution', defaultKey: 'l', displayDefault: '[L]' },
  { id: 'reduce_time', label: 'Quick Reduce Time (-15m)', category: 'execution', defaultKey: 'j', displayDefault: '[J]' },

  // Creation & Search
  { id: 'add_task', label: 'Add New Task (Focus Form)', category: 'tasks', defaultKey: 'n', displayDefault: '[N]' },
  { id: 'bulk_ingest', label: 'Bulk Multi-Line Ingest', category: 'tasks', defaultKey: 'b', displayDefault: '[B]' },
  { id: 'quick_filter', label: 'Quick Task Filter / Search', category: 'tasks', defaultKey: '/', displayDefault: '[/]' },

  // System & Modals
  { id: 'open_shortcuts', label: 'Toggle Shortcuts Cheat Sheet', category: 'system', defaultKey: 'k', displayDefault: '[K] / [?]' },
  { id: 'open_settings', label: 'Open / Close Settings Console', category: 'system', defaultKey: 's', displayDefault: '[S]' },
  { id: 'open_sync', label: 'Open / Close Cloud Sync Menu', category: 'system', defaultKey: 'u', displayDefault: '[U]' },
];

export const DEFAULT_SHORTCUTS: ShortcutConfig = {
  nav_tracker: '1',
  nav_hierarchy: '2',
  nav_audit: '3',
  jump_today: 't',
  prev_day: '[',
  next_day: ']',
  open_settings: 's',
  open_sync: 'u',
  open_shortcuts: 'k',
  toggle_timer: ' ',
  toggle_complete: 'x',
  log_time: 'l',
  reduce_time: 'j',
  pomodoro_play_pause: 'p',
  pomodoro_reset: 'r',
  add_task: 'n',
  bulk_ingest: 'b',
  quick_filter: '/',
};

const STORAGE_KEY = 'routine_tracker_custom_shortcuts_v1';

export function getCustomShortcuts(): ShortcutConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_SHORTCUTS, ...parsed };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_SHORTCUTS };
}

export function saveCustomShortcuts(config: Partial<ShortcutConfig>): ShortcutConfig {
  const current = getCustomShortcuts();
  const updated = { ...current, ...config };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
  return updated;
}

export function resetCustomShortcuts(): ShortcutConfig {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  return { ...DEFAULT_SHORTCUTS };
}

export function formatKeyDisplay(key: string): string {
  if (!key) return '[NONE]';
  if (key === ' ') return '[SPACE]';
  if (key === 'Escape') return '[ESC]';
  if (key === 'Enter') return '[ENTER]';
  return `[${key.toUpperCase()}]`;
}

export function isMatchingKey(eventKey: string, shortcutKey: string): boolean {
  if (!shortcutKey) return false;
  if (shortcutKey === ' ') return eventKey === ' ' || eventKey === 'Space';
  return eventKey.toLowerCase() === shortcutKey.toLowerCase();
}
