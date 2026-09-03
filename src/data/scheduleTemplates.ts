import { DayKey, DaySchedule } from '../types';
import { getInitialSchedules, getCleanSlateSchedules, createEmptyDaySchedule } from './historyStore';

export { createEmptyDaySchedule, getCleanSlateSchedules };

export interface RoutineTemplate {
  id: string;
  name: string;
  badge: string;
  description: string;
  totalWeeklyTasks: number;
  getSchedules: () => Record<string, DaySchedule>;
}

// Built-in Templates Registry
export const BUILT_IN_TEMPLATES: RoutineTemplate[] = [
  {
    id: 'clean_slate',
    name: 'Clean Slate (0 Tasks Scheduled)',
    badge: '0 TASKS',
    description: 'Completely blank Monday–Sunday schedule. Zero pre-scheduled tasks, ready for your custom routines and daily flow.',
    totalWeeklyTasks: 0,
    getSchedules: () => getCleanSlateSchedules(),
  },
  {
    id: 'alternating_split',
    name: 'Alternating Routine Split (Original Preset)',
    badge: '48 TASKS',
    description: 'The complete alternating routine split: Morning Deep Work ML, Alternating Evenings (Guitar / Leisure vs. Cybersecurity Lab), Workouts, and Weekend Deep Immersion.',
    totalWeeklyTasks: 48,
    getSchedules: () => getInitialSchedules(),
  },
];

const STORAGE_SAVED_TEMPLATES_KEY = 'prod_sys_user_custom_templates_v1';

export function getCustomTemplates(): RoutineTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_SAVED_TEMPLATES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((item: any) => ({
          ...item,
          getSchedules: () => item.schedules,
        }));
      }
    }
  } catch {
    // fallback
  }
  return [];
}

export function saveCustomTemplate(
  name: string,
  description: string,
  schedules: Record<string, DaySchedule>
): RoutineTemplate[] {
  const existing = getCustomTemplates();
  let totalTasks = 0;
  for (const s of Object.values(schedules)) {
    totalTasks += s.tasks.length;
  }

  const newTemplate = {
    id: `custom_${Date.now()}`,
    name,
    badge: `${totalTasks} TASKS`,
    description: description || `Saved custom routine layout with ${totalTasks} total tasks across the week.`,
    totalWeeklyTasks: totalTasks,
    schedules,
  };

  const serializable = [...existing, newTemplate].map((t: any) => ({
    id: t.id,
    name: t.name,
    badge: t.badge,
    description: t.description,
    totalWeeklyTasks: t.totalWeeklyTasks,
    schedules: t.schedules || (t.getSchedules ? t.getSchedules() : {}),
  }));

  try {
    localStorage.setItem(STORAGE_SAVED_TEMPLATES_KEY, JSON.stringify(serializable));
  } catch {
    // ignore
  }

  return getCustomTemplates();
}

export function deleteCustomTemplate(id: string): RoutineTemplate[] {
  const existing = getCustomTemplates();
  const filtered = existing.filter((t) => t.id !== id);
  try {
    localStorage.setItem(STORAGE_SAVED_TEMPLATES_KEY, JSON.stringify(filtered));
  } catch {
    // ignore
  }
  return filtered;
}
