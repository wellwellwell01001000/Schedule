import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  CategoryDefinition,
  getCategories,
  addCategory,
  removeCategory,
} from '../data/categoryStore';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoriesChanged?: (categories: CategoryDefinition[]) => void;
}

export function CategoryManagerModal({
  isOpen,
  onClose,
  onCategoriesChanged,
}: CategoryManagerModalProps) {
  const [categories, setCategories] = useState<CategoryDefinition[]>(() => getCategories());
  const [newCategoryLabel, setNewCategoryLabel] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCategories(getCategories());
      setNewCategoryLabel('');
      setErrorMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAdd = (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setErrorMsg(null);
    if (!newCategoryLabel.trim()) return;

    try {
      addCategory(newCategoryLabel.trim());
      const updated = getCategories();
      setCategories(updated);
      setNewCategoryLabel('');
      onCategoriesChanged?.(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add category';
      setErrorMsg(msg);
    }
  };

  const handleRemove = (cat: CategoryDefinition) => {
    if (window.confirm(`Delete category "${cat.label}"? Tasks with this category will retain their label in past logs.`)) {
      const updated = removeCategory(cat.id);
      setCategories(updated);
      onCategoriesChanged?.(updated);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 font-mono">
      <div className="border-2 border-white bg-black max-w-md w-full p-5 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/20 pb-2">
          <div>
            <span className="text-sm font-bold text-white uppercase tracking-wider block">
              _CATEGORY_MANAGER
            </span>
            <span className="text-[10px] opacity-60 uppercase">
              // CREATE, ORGANIZE &amp; REMOVE CATEGORIES
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:opacity-60 text-xs font-bold font-mono cursor-pointer"
          >
            [X CLOSE]
          </button>
        </div>

        {/* Existing Categories List */}
        <div className="space-y-2">
          <label className="text-[10px] opacity-70 uppercase font-bold block">
            ACTIVE CATEGORIES ({categories.length}):
          </label>
          <div className="border border-white/30 divide-y divide-white/20 max-h-56 overflow-y-auto">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between p-2 hover:bg-white/5 transition-none text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white uppercase">{cat.label}</span>
                  <span className="text-[10px] text-white/50 font-mono">[{cat.id}]</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(cat)}
                  className="border border-red-500/70 text-red-400 hover:bg-red-500 hover:text-black px-1.5 py-0.5 text-[10px] font-bold uppercase transition-none cursor-pointer"
                  title={`Delete category ${cat.label}`}
                >
                  [REMOVE]
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Add New Category Section */}
        <div className="space-y-2 pt-2 border-t border-white/20 text-xs">
          <label className="text-[10px] opacity-70 uppercase font-bold block">
            + CREATE NEW CATEGORY:
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newCategoryLabel}
              onChange={(e) => setNewCategoryLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  handleAdd(e);
                }
              }}
              placeholder="e.g. Research, Freelance, Health..."
              className="flex-1 bg-black border border-white/50 px-3 py-1.5 text-xs text-white focus:border-white focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAdd}
              className="border border-white bg-white text-black px-3 py-1.5 text-xs font-bold uppercase hover:bg-white/80 cursor-pointer transition-none shrink-0"
            >
              [+ ADD]
            </button>
          </div>
          {errorMsg && <div className="text-red-400 text-[10px]">{errorMsg}</div>}
        </div>

        <div className="flex justify-end pt-2 border-t border-white/20">
          <button
            type="button"
            onClick={onClose}
            className="border border-white/60 bg-black text-white px-4 py-1 text-xs font-bold uppercase hover:bg-white hover:text-black transition-none cursor-pointer"
          >
            DONE
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
