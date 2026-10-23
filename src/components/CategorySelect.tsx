import React, { useState, useEffect } from 'react';
import {
  CategoryDefinition,
  getCategories,
  addCategory,
} from '../data/categoryStore';
import { CategoryManagerModal } from './CategoryManagerModal';

interface CategorySelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  label?: string;
}

export function CategorySelect({
  value,
  onChange,
  className = '',
  label = 'CATEGORY',
}: CategorySelectProps) {
  const [categories, setCategories] = useState<CategoryDefinition[]>(() => getCategories());
  const [isAddingInline, setIsAddingInline] = useState(false);
  const [inlineLabel, setInlineLabel] = useState('');
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);

  const reloadCategories = () => {
    const list = getCategories();
    setCategories(list);
  };

  useEffect(() => {
    const handleUpdate = () => {
      reloadCategories();
    };
    window.addEventListener('categories_changed', handleUpdate);
    return () => window.removeEventListener('categories_changed', handleUpdate);
  }, []);

  const submitInline = (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setInlineError(null);
    if (!inlineLabel.trim()) return;

    try {
      const created = addCategory(inlineLabel.trim());
      reloadCategories();
      onChange(created.id);
      setInlineLabel('');
      setIsAddingInline(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid category';
      setInlineError(msg);
    }
  };

  // Ensure selected value is valid or shown in the dropdown
  const valueExists = categories.some((c) => c.id.toLowerCase() === value.toLowerCase());

  return (
    <div className={`space-y-1 font-mono ${className}`}>
      <div className="flex items-center justify-between text-[11px]">
        <label className="opacity-70 uppercase font-bold">{label}</label>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setIsAddingInline((prev) => !prev);
              setInlineError(null);
            }}
            className="border border-white/40 hover:border-white px-1.5 py-0.5 text-[9px] uppercase font-bold text-white hover:bg-white hover:text-black cursor-pointer transition-none"
            title="Create a new custom category"
          >
            {isAddingInline ? '[CANCEL]' : '[+ NEW]'}
          </button>
          <button
            type="button"
            onClick={() => setIsManagerOpen(true)}
            className="border border-white/40 hover:border-white px-1.5 py-0.5 text-[9px] uppercase font-bold text-white/70 hover:text-white cursor-pointer transition-none"
            title="Manage and remove categories"
          >
            [MANAGE]
          </button>
        </div>
      </div>

      {/* Inline Category Creation Input */}
      {isAddingInline ? (
        <div className="space-y-1 pt-0.5">
          <div className="flex items-center gap-1">
            <input
              type="text"
              autoFocus
              value={inlineLabel}
              onChange={(e) => setInlineLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  submitInline(e);
                } else if (e.key === 'Escape') {
                  setIsAddingInline(false);
                  setInlineError(null);
                }
              }}
              placeholder="e.g. Freelance, Deep Learning..."
              className="flex-1 bg-black border border-white px-2 py-1 text-xs text-white focus:outline-none"
            />
            <button
              type="button"
              onClick={submitInline}
              className="border border-white bg-white text-black px-2.5 py-1 text-xs font-bold uppercase hover:bg-white/80 cursor-pointer transition-none shrink-0"
            >
              [ADD]
            </button>
          </div>
          {inlineError && <div className="text-red-400 text-[9px]">{inlineError}</div>}
        </div>
      ) : (
        <select
          value={value}
          onChange={(e) => {
            if (e.target.value === '__NEW__') {
              setIsAddingInline(true);
            } else if (e.target.value === '__MANAGE__') {
              setIsManagerOpen(true);
            } else {
              onChange(e.target.value);
            }
          }}
          className="w-full bg-black border border-white/50 px-3 py-1.5 text-xs text-white focus:border-white focus:outline-none uppercase"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label.toUpperCase()}
            </option>
          ))}
          {!valueExists && value && (
            <option value={value}>
              {value.replace(/_/g, ' ').toUpperCase()} (CURRENT)
            </option>
          )}
          <option disabled>───────────────</option>
          <option value="__NEW__">+ CREATE NEW CATEGORY...</option>
          <option value="__MANAGE__">⚙ MANAGE CATEGORIES...</option>
        </select>
      )}

      {/* Category Manager Modal */}
      <CategoryManagerModal
        isOpen={isManagerOpen}
        onClose={() => setIsManagerOpen(false)}
        onCategoriesChanged={(updated) => {
          setCategories(updated);
          // If active value was deleted, switch to the first category
          if (updated.length > 0 && !updated.some((c) => c.id === value)) {
            onChange(updated[0].id);
          }
        }}
      />
    </div>
  );
}
