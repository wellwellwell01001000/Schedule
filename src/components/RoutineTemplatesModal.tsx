import React, { useState } from 'react';
import { DaySchedule } from '../types';
import {
  BUILT_IN_TEMPLATES,
  getCustomTemplates,
  saveCustomTemplate,
  deleteCustomTemplate,
  RoutineTemplate,
} from '../data/scheduleTemplates';

interface RoutineTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedules: Record<string, DaySchedule>;
  onApplyTemplate: (template: RoutineTemplate) => void;
}

export function RoutineTemplatesModal({
  isOpen,
  onClose,
  schedules,
  onApplyTemplate,
}: RoutineTemplatesModalProps) {
  const [customTemplates, setCustomTemplates] = useState<RoutineTemplate[]>(() =>
    getCustomTemplates()
  );
  const [saveMode, setSaveMode] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDesc, setNewTemplateDesc] = useState('');
  const [confirmApplyId, setConfirmApplyId] = useState<string | null>(null);

  if (!isOpen) return null;

  // Calculate current task count
  let currentTaskCount = 0;
  for (const s of Object.values(schedules)) {
    currentTaskCount += s.tasks.length;
  }

  const handleSaveCurrentAsTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim()) return;
    const updated = saveCustomTemplate(newTemplateName.trim(), newTemplateDesc.trim(), schedules);
    setCustomTemplates(updated);
    setNewTemplateName('');
    setNewTemplateDesc('');
    setSaveMode(false);
  };

  const handleDeleteTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = deleteCustomTemplate(id);
    setCustomTemplates(updated);
  };

  const handleConfirmApply = (template: RoutineTemplate) => {
    onApplyTemplate(template);
    setConfirmApplyId(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs font-mono text-white"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] flex flex-col border-2 border-white bg-black shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Terminal Header */}
        <div className="bg-white text-black px-4 py-2 flex items-center justify-between font-bold text-xs uppercase shrink-0">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 bg-black" />
            <span>_ROUTINE_TEMPLATES_&amp;_SLATE_MANAGER</span>
          </div>
          <button
            onClick={onClose}
            className="text-black font-black text-xs hover:opacity-60 transition-none cursor-pointer"
          >
            [X]
          </button>
        </div>

        {/* Informational Banner */}
        <div className="p-4 border-b border-white/20 bg-white/5 space-y-2 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-white">
            <span>UNIVERSAL ROUTINE TRACKER TEMPLATES</span>
            <span className="border border-white/40 px-1.5 py-0.5 text-[10px] uppercase">
              CURRENT SCHEDULE: {currentTaskCount} TASKS
            </span>
          </div>
          <p className="text-[11px] opacity-75 leading-relaxed">
            Switch between a fresh <strong>Clean Slate (0 tasks)</strong> to build your own personal routine from scratch,
            or load the <strong>Alternating Split (48 tasks)</strong> whenever you want it back. You can also save your current routine as a custom template.
          </p>
        </div>

        {/* Scrollable Templates List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Section 1: Core System Templates */}
          <div className="space-y-2">
            <div className="text-[10px] opacity-60 uppercase font-bold tracking-wider">
              SYSTEM TEMPLATES ({BUILT_IN_TEMPLATES.length})
            </div>

            <div className="space-y-2.5">
              {BUILT_IN_TEMPLATES.map((tmpl) => {
                const isConfirming = confirmApplyId === tmpl.id;
                const isClean = tmpl.id === 'clean_slate';

                return (
                  <div
                    key={tmpl.id}
                    className={`border p-3.5 space-y-2 transition-none ${
                      isClean
                        ? 'border-white bg-black hover:bg-white/5'
                        : 'border-white/50 bg-black hover:border-white'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">
                            {tmpl.name}
                          </span>
                          <span className="bg-white text-black text-[10px] font-bold px-1.5 py-0">
                            {tmpl.badge}
                          </span>
                        </div>
                        <p className="text-[11px] opacity-70 leading-relaxed max-w-lg">
                          {tmpl.description}
                        </p>
                      </div>

                      {/* Action buttons */}
                      <div className="shrink-0 self-start sm:self-center">
                        {!isConfirming ? (
                          <button
                            onClick={() => setConfirmApplyId(tmpl.id)}
                            className={`px-3 py-1 text-xs font-bold uppercase transition-none cursor-pointer border ${
                              isClean
                                ? 'bg-white text-black border-white hover:bg-black hover:text-white'
                                : 'border-white text-white hover:bg-white hover:text-black'
                            }`}
                          >
                            {isClean ? '[APPLY CLEAN SLATE]' : '[LOAD TEMPLATE]'}
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleConfirmApply(tmpl)}
                              className="px-2.5 py-1 text-xs font-black bg-white text-black border-2 border-white uppercase cursor-pointer hover:bg-white/80"
                            >
                              [CONFIRM REPLACE]
                            </button>
                            <button
                              onClick={() => setConfirmApplyId(null)}
                              className="px-2 py-1 text-xs border border-white/40 text-white hover:bg-white hover:text-black cursor-pointer"
                            >
                              [CANCEL]
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: User Custom Templates */}
          <div className="space-y-2 pt-2 border-t border-white/20">
            <div className="flex items-center justify-between text-[10px] opacity-60 uppercase font-bold tracking-wider">
              <span>MY SAVED TEMPLATES ({customTemplates.length})</span>
              <button
                onClick={() => setSaveMode(!saveMode)}
                className="border border-white/40 px-2 py-0.5 text-[10px] text-white hover:bg-white hover:text-black uppercase cursor-pointer transition-none"
              >
                {saveMode ? '[CANCEL SAVE]' : '[+ SAVE CURRENT SPLIT AS TEMPLATE]'}
              </button>
            </div>

            {saveMode && (
              <form
                onSubmit={handleSaveCurrentAsTemplate}
                className="border border-white bg-white/5 p-3 space-y-3"
              >
                <div className="text-xs font-bold text-white uppercase">
                  SAVE CURRENT SCHEDULE ({currentTaskCount} TASKS) AS REUSABLE TEMPLATE
                </div>
                <div className="space-y-2">
                  <input
                    type="text"
                    required
                    placeholder="Template Name (e.g. My 4-Day Strength & Coding Split)..."
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    className="w-full bg-black border border-white/50 px-3 py-1.5 text-xs text-white placeholder:text-white/40 focus:border-white focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Brief description (optional)..."
                    value={newTemplateDesc}
                    onChange={(e) => setNewTemplateDesc(e.target.value)}
                    className="w-full bg-black border border-white/40 px-3 py-1.5 text-xs text-white placeholder:text-white/40 focus:border-white focus:outline-none"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSaveMode(false)}
                    className="border border-white/40 px-3 py-1 text-xs text-white hover:bg-white hover:text-black cursor-pointer uppercase"
                  >
                    [CANCEL]
                  </button>
                  <button
                    type="submit"
                    className="border border-white bg-white text-black px-3 py-1 text-xs font-bold uppercase cursor-pointer"
                  >
                    [SAVE TEMPLATE]
                  </button>
                </div>
              </form>
            )}

            {customTemplates.length === 0 ? (
              <div className="border border-white/20 p-5 text-center text-xs opacity-50">
                NO CUSTOM TEMPLATES SAVED YET. CONFIGURE YOUR DESIRED SPLIT THEN CLICK [+ SAVE CURRENT SPLIT AS TEMPLATE].
              </div>
            ) : (
              <div className="space-y-2">
                {customTemplates.map((tmpl) => {
                  const isConfirming = confirmApplyId === tmpl.id;

                  return (
                    <div
                      key={tmpl.id}
                      className="border border-white/40 p-3 space-y-2 bg-black hover:border-white"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">
                              {tmpl.name}
                            </span>
                            <span className="border border-white/40 text-white/80 text-[9px] px-1 py-0">
                              {tmpl.badge}
                            </span>
                          </div>
                          <p className="text-[11px] opacity-60 mt-0.5">{tmpl.description}</p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-center">
                          {!isConfirming ? (
                            <>
                              <button
                                onClick={() => setConfirmApplyId(tmpl.id)}
                                className="border border-white bg-white text-black px-2.5 py-1 text-xs font-bold uppercase cursor-pointer"
                              >
                                [APPLY]
                              </button>
                              <button
                                onClick={(e) => handleDeleteTemplate(tmpl.id, e)}
                                className="border border-white/30 text-white/60 hover:text-white hover:border-white px-2 py-1 text-xs uppercase cursor-pointer"
                                title="Delete saved template"
                              >
                                [DEL]
                              </button>
                            </>
                          ) : (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleConfirmApply(tmpl)}
                                className="px-2.5 py-1 text-xs font-black bg-white text-black border-2 border-white uppercase cursor-pointer"
                              >
                                [CONFIRM]
                              </button>
                              <button
                                onClick={() => setConfirmApplyId(null)}
                                className="px-1.5 py-1 text-xs border border-white/40 text-white cursor-pointer"
                              >
                                [NO]
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-white/20 bg-black flex items-center justify-between text-xs shrink-0">
          <span className="text-[11px] opacity-60">
            Applying a template updates your active 7-day schedule. Your logged work history is preserved.
          </span>
          <button
            onClick={onClose}
            className="border border-white bg-white text-black px-4 py-1 font-bold uppercase cursor-pointer"
          >
            [CLOSE]
          </button>
        </div>
      </div>
    </div>
  );
}
