import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { getCustomShortcuts, formatKeyDisplay, ShortcutConfig } from '../data/shortcutStore';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  const [cfg, setCfg] = useState<ShortcutConfig>(() => getCustomShortcuts());

  useEffect(() => {
    if (isOpen) {
      setCfg(getCustomShortcuts());
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const openShortcutsKey = cfg.open_shortcuts || 'k';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'Escape' ||
        e.key.toLowerCase() === openShortcutsKey.toLowerCase() ||
        e.key === '?'
      ) {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }
      e.stopPropagation();
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose, cfg]);

  if (!isOpen) return null;

  const content = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard Shortcuts Cheat Sheet"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 font-mono text-white bg-black/85 backdrop-blur-xs select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-black border-2 border-white flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Terminal Header */}
        <div className="bg-white text-black px-4 py-2 flex items-center justify-between font-bold text-xs uppercase shrink-0 border-b border-black">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 bg-black" />
            <span className="tracking-wider">_KEYBOARD_SHORTCUTS_CHEAT_SHEET</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] opacity-70 hidden sm:inline">[PRESS ESC OR {formatKeyDisplay(cfg.open_shortcuts)} TO DISMISS]</span>
            <button
              type="button"
              onClick={onClose}
              className="text-black hover:bg-black hover:text-white px-2 py-0.5 border border-black text-xs font-black transition-none cursor-pointer uppercase"
              title="Close Cheat Sheet"
            >
              [X CLOSE]
            </button>
          </div>
        </div>

        {/* Shortcuts Content */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Section 1: Navigation */}
            <div className="border border-white/40 p-3.5 bg-white/5 space-y-2.5">
              <div className="flex items-center justify-between border-b border-white/20 pb-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  1. NAVIGATION &amp; DAYS
                </span>
                <span className="text-[10px] opacity-60 font-mono">CYCLE</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white bg-white/10 px-1.5 py-0.5 border border-white/30">
                    {formatKeyDisplay(cfg.jump_today)}
                  </span>
                  <span className="text-white/80">Jump to Today</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white bg-white/10 px-1.5 py-0.5 border border-white/30">
                    {formatKeyDisplay(cfg.prev_day)} / {formatKeyDisplay(cfg.next_day)}
                  </span>
                  <span className="text-white/80">Previous / Next Day</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white bg-white/10 px-1.5 py-0.5 border border-white/30">
                    {formatKeyDisplay(cfg.nav_tracker)} / {formatKeyDisplay(cfg.nav_hierarchy)} / {formatKeyDisplay(cfg.nav_audit)}
                  </span>
                  <span className="text-white/80">Tracker / Hierarchy / Audit</span>
                </div>
              </div>
            </div>

            {/* Section 2: Timing & Execution */}
            <div className="border border-white/40 p-3.5 bg-white/5 space-y-2.5">
              <div className="flex items-center justify-between border-b border-white/20 pb-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  2. EXECUTION &amp; TIMING
                </span>
                <span className="text-[10px] opacity-60 font-mono">TIMERS</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white bg-white/10 px-1.5 py-0.5 border border-white/30">
                    {formatKeyDisplay(cfg.pomodoro_play_pause)}
                  </span>
                  <span className="text-white/80">Start / Pause Pomodoro</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white bg-white/10 px-1.5 py-0.5 border border-white/30">
                    {formatKeyDisplay(cfg.pomodoro_reset)}
                  </span>
                  <span className="text-white/80">Reset Pomodoro Timer</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white bg-white/10 px-1.5 py-0.5 border border-white/30">
                    {formatKeyDisplay(cfg.toggle_timer)}
                  </span>
                  <span className="text-white/80">Start / Stop Live Stopwatch</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white bg-white/10 px-1.5 py-0.5 border border-white/30">
                    {formatKeyDisplay(cfg.toggle_complete)}
                  </span>
                  <span className="text-white/80">Mark Directive Complete</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white bg-white/10 px-1.5 py-0.5 border border-white/30">
                    {formatKeyDisplay(cfg.log_time)} / {formatKeyDisplay(cfg.reduce_time)}
                  </span>
                  <span className="text-white/80">Log +15m / Reduce -15m</span>
                </div>
              </div>
            </div>

            {/* Section 3: Creation & Search */}
            <div className="border border-white/40 p-3.5 bg-white/5 space-y-2.5">
              <div className="flex items-center justify-between border-b border-white/20 pb-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  3. CREATION &amp; FILTER
                </span>
                <span className="text-[10px] opacity-60 font-mono">TASKS</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white bg-white/10 px-1.5 py-0.5 border border-white/30">
                    {formatKeyDisplay(cfg.add_task)}
                  </span>
                  <span className="text-white/80">Add New Task (Focus Title)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white bg-white/10 px-1.5 py-0.5 border border-white/30">
                    {formatKeyDisplay(cfg.bulk_ingest)}
                  </span>
                  <span className="text-white/80">Bulk Multi-Line Ingest</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white bg-white/10 px-1.5 py-0.5 border border-white/30">
                    {formatKeyDisplay(cfg.quick_filter)}
                  </span>
                  <span className="text-white/80">Quick Task Filter / Search</span>
                </div>
              </div>
            </div>

            {/* Section 4: System & Cloud */}
            <div className="border border-white/40 p-3.5 bg-white/5 space-y-2.5">
              <div className="flex items-center justify-between border-b border-white/20 pb-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  4. SYSTEM &amp; CLOUD
                </span>
                <span className="text-[10px] opacity-60 font-mono">GLOBAL</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white bg-white/10 px-1.5 py-0.5 border border-white/30">
                    {formatKeyDisplay(cfg.open_shortcuts)} / [?]
                  </span>
                  <span className="text-white/80">Toggle This Cheat Sheet</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white bg-white/10 px-1.5 py-0.5 border border-white/30">
                    {formatKeyDisplay(cfg.open_settings)}
                  </span>
                  <span className="text-white/80">Open Settings Console</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white bg-white/10 px-1.5 py-0.5 border border-white/30">
                    {formatKeyDisplay(cfg.open_sync)}
                  </span>
                  <span className="text-white/80">Cloud Sync Menu (Pull / Push)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white bg-white/10 px-1.5 py-0.5 border border-white/30">
                    [ESC]
                  </span>
                  <span className="text-white/80">Dismiss Modals / Clear Filter</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border border-white/20 p-2.5 text-[11px] text-white/70 bg-black flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 bg-white shrink-0" />
            <span>
              <strong>NOTE:</strong> Keyboard shortcuts are automatically disabled whenever you are typing inside a form input, textarea, or dropdown selector.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-black border-t-2 border-white px-4 py-2 flex items-center justify-between text-[11px] shrink-0">
          <div className="flex items-center gap-2 opacity-70">
            <span>STATUS: HOTKEYS_ARMED</span>
            <span>//</span>
            <span>MONOCHROME TERMINAL</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="border border-white bg-white text-black hover:bg-white/80 px-4 py-1 text-xs font-black uppercase transition-none cursor-pointer"
          >
            [DONE]
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
}
