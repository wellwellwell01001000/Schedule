/**
 * Category Management Store
 * Supports default categories ['work', 'workout', 'leisure'],
 * adding custom user categories, and removing any categories.
 */

export interface CategoryDefinition {
  id: string;
  label: string;
}

export const DEFAULT_CATEGORIES: CategoryDefinition[] = [
  { id: 'work', label: 'Work' },
  { id: 'workout', label: 'Workout' },
  { id: 'leisure', label: 'Leisure' },
];

export const STORAGE_CATEGORIES_KEY = 'prod_sys_categories_v1';

/**
 * Loads all active categories from localStorage.
 * Falls back to DEFAULT_CATEGORIES if uninitialized.
 */
export function getCategories(): CategoryDefinition[] {
  try {
    const raw = localStorage.getItem(STORAGE_CATEGORIES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // fallback
  }
  return DEFAULT_CATEGORIES;
}

/**
 * Saves categories list to localStorage and emits an update event.
 */
export function saveCategories(categories: CategoryDefinition[]): void {
  try {
    localStorage.setItem(STORAGE_CATEGORIES_KEY, JSON.stringify(categories));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('categories_changed', { detail: categories }));
    }
  } catch {
    // ignore
  }
}

/**
 * Adds a new custom category.
 * If category with identical label exists, returns it.
 */
export function addCategory(label: string): CategoryDefinition {
  const cleanLabel = label.trim();
  if (!cleanLabel) {
    throw new Error('Category name cannot be empty');
  }

  const existing = getCategories();
  const found = existing.find(
    (c) => c.label.toLowerCase() === cleanLabel.toLowerCase()
  );
  if (found) {
    return found;
  }

  // Generate URL/key-safe id
  const slug = cleanLabel
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || `cat_${Date.now()}`;

  let uniqueId = slug;
  let counter = 1;
  while (existing.some((c) => c.id === uniqueId)) {
    uniqueId = `${slug}_${counter++}`;
  }

  const newCat: CategoryDefinition = { id: uniqueId, label: cleanLabel };
  const updated = [...existing, newCat];
  saveCategories(updated);
  return newCat;
}

/**
 * Removes any category by id.
 */
export function removeCategory(id: string): CategoryDefinition[] {
  const existing = getCategories();
  const updated = existing.filter((c) => c.id !== id);
  // Ensure there's at least one default if user deletes everything
  if (updated.length === 0) {
    saveCategories(DEFAULT_CATEGORIES);
    return DEFAULT_CATEGORIES;
  }
  saveCategories(updated);
  return updated;
}

/**
 * Retrieves a human-readable display label for any category id.
 */
export function getCategoryLabel(id?: string): string {
  if (!id) return 'Work';
  const existing = getCategories();
  const found = existing.find((c) => c.id.toLowerCase() === id.toLowerCase());
  if (found) return found.label;

  // Legacy fallback mapping for previously generated tasks
  const legacyMap: Record<string, string> = {
    work: 'Work',
    workout: 'Workout',
    leisure: 'Leisure',
    ml: 'Machine Learning',
    cyber: 'Cybersecurity',
    gamedev: 'Game Dev',
    guitar: 'Guitar & Music',
    college: 'College / Lab',
    routine: 'Routine',
    custom: 'Custom',
    deep_work: 'Deep Work',
    core_work: 'Core Work',
    fitness: 'Fitness',
    learning: 'Learning',
    creative: 'Creative',
    life_ops: 'Life Ops',
  };

  if (legacyMap[id.toLowerCase()]) {
    return legacyMap[id.toLowerCase()];
  }

  // Auto-format slug (e.g. "deep_learning" -> "Deep Learning")
  return id
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
