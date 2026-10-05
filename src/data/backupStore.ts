import { DaySchedule, MonthLogRecord, DayKey } from '../types';

export interface SystemSnapshot {
  id: string;
  version: string;
  createdAt: string; // ISO string
  displayDate: string;
  type: 'manual' | 'nightly' | 'file_import';
  schedules: Record<string, DaySchedule>;
  history: MonthLogRecord[];
  completedMap: Record<string, string[]>;
  summary: {
    totalTasks: number;
    scheduledTasks: number;
    totalHoursTracked: number;
  };
}

const SNAPSHOTS_KEY = 'alt_routine_backup_snapshots_v1';
const LAST_NIGHTLY_DATE_KEY = 'alt_routine_last_nightly_backup_date';

// Collect completed tasks and date-scoped time maps for all days from localStorage
export function collectAllCompletedMap(): Record<string, string[]> {
  const map: Record<string, any> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith('alt_routine_completed_date_') ||
          key.startsWith('alt_routine_completed_') ||
          key.startsWith('alt_routine_time_spent_date_') ||
          key === 'alt_routine_direct_task_audit_time_v1' ||
          key === 'alt_routine_direct_task_audit_titles_v1')
      ) {
        const raw = localStorage.getItem(key);
        if (raw) {
          map[key] = JSON.parse(raw);
        }
      }
    }
  } catch {
    // ignore
  }
  return map;
}

// Restore completed tasks and time maps for all days to localStorage
export function restoreAllCompletedMap(map: Record<string, any>): void {
  for (const [key, data] of Object.entries(map)) {
    try {
      const storageKey = key.startsWith('alt_routine_')
        ? key
        : `alt_routine_completed_${key}`;
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch {
      // ignore
    }
  }
}

// Create snapshot object from current state
export function createSnapshot(
  schedules: Record<string, DaySchedule>,
  history: MonthLogRecord[],
  type: 'manual' | 'nightly' | 'file_import' = 'manual'
): SystemSnapshot {
  const now = new Date();
  const completedMap = collectAllCompletedMap();

  let totalTasks = 0;
  let scheduledTasks = 0;
  let totalMinutes = 0;

  for (const schedule of Object.values(schedules)) {
    for (const t of schedule.tasks) {
      totalTasks++;
      if (t.isScheduled !== false) scheduledTasks++;
      totalMinutes += t.timeSpentMinutes || 0;
    }
  }

  const snapshot: SystemSnapshot = {
    id: `snap-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    version: '2026.09.03_RELEASE-02',
    createdAt: now.toISOString(),
    displayDate: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`,
    type,
    schedules,
    history,
    completedMap,
    summary: {
      totalTasks,
      scheduledTasks,
      totalHoursTracked: Math.round((totalMinutes / 60) * 10) / 10,
    },
  };

  return snapshot;
}

// Get saved snapshots from local storage
export function getSavedSnapshots(): SystemSnapshot[] {
  try {
    const raw = localStorage.getItem(SNAPSHOTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Save snapshot to list
export function saveSnapshotToList(snapshot: SystemSnapshot): SystemSnapshot[] {
  const list = getSavedSnapshots();
  // Keep last 15 snapshots
  const updated = [snapshot, ...list.slice(0, 14)];
  try {
    localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save snapshot to localStorage', e);
  }
  return updated;
}

// Check and trigger automatic nightly backup
export function checkAndRunNightlyAutoBackup(
  schedules: Record<string, DaySchedule>,
  history: MonthLogRecord[]
): SystemSnapshot | null {
  try {
    const now = new Date();
    const currentHour = now.getHours();
    // Night is defined as >= 21:00 (9 PM) or <= 04:00 (4 AM)
    const isNightTime = currentHour >= 21 || currentHour <= 4;
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`;

    const lastNightly = localStorage.getItem(LAST_NIGHTLY_DATE_KEY);

    if (isNightTime && lastNightly !== todayStr) {
      const snapshot = createSnapshot(schedules, history, 'nightly');
      saveSnapshotToList(snapshot);
      localStorage.setItem(LAST_NIGHTLY_DATE_KEY, todayStr);
      return snapshot;
    }
  } catch (err) {
    console.error('Error during nightly auto backup check:', err);
  }
  return null;
}

// Delete a specific snapshot by ID
export function deleteSnapshotById(id: string): SystemSnapshot[] {
  const list = getSavedSnapshots();
  const updated = list.filter((s) => s.id !== id);
  try {
    localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to update snapshots in localStorage', e);
  }
  return updated;
}

// Clear all manual snapshots, preserving automated/nightly archives
export function clearManualSnapshots(): SystemSnapshot[] {
  const list = getSavedSnapshots();
  const updated = list.filter((s) => s.type !== 'manual');
  try {
    localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to clear manual snapshots in localStorage', e);
  }
  return updated;
}

// Export snapshot as a downloadable .json file on disk
export function downloadSnapshotAsJsonFile(snapshot: SystemSnapshot): void {
  const jsonStr = JSON.stringify(snapshot, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const safeDate = snapshot.displayDate.replace(/[: ]/g, '_');
  const a = document.createElement('a');
  a.href = url;
  a.download = `productivity_system_backup_${safeDate}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Parse and validate imported backup file
export function parseAndValidateBackupJson(jsonString: string): SystemSnapshot {
  const parsed = JSON.parse(jsonString);
  if (!parsed.schedules || typeof parsed.schedules !== 'object') {
    throw new Error('Invalid backup file: missing schedules object.');
  }
  if (!parsed.history || !Array.isArray(parsed.history)) {
    throw new Error('Invalid backup file: missing history records.');
  }
  return parsed as SystemSnapshot;
}
