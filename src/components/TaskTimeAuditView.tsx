import React, { useState, useMemo } from 'react';
import { TaskTimeAuditItem, DaySchedule, MonthLogRecord, TaskCategory } from '../types';
import {
  computeTaskTimeAudit,
  formatMinutes,
  addDirectTimeToTaskAudit,
  removeTaskFromAudit,
} from '../data/historyStore';
import { generateAsciiProgressBar } from '../utils/ascii';

interface TaskTimeAuditViewProps {
  schedules: Record<string, DaySchedule>;
  history: MonthLogRecord[];
  onRefresh?: () => void;
  onUpdateSchedules?: (newSchedules: Record<string, DaySchedule>) => void;
}

export function TaskTimeAuditView({
  schedules,
  history,
  onRefresh,
  onUpdateSchedules,
}: TaskTimeAuditViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'time' | 'sessions' | 'alpha'>('time');
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [localVersion, setLocalVersion] = useState<number>(0);

  // Direct Time Logging Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalTaskTitle, setModalTaskTitle] = useState<string>('');
  const [modalCategory, setModalCategory] = useState<TaskCategory>('custom');
  const [modalMinutes, setModalMinutes] = useState<number>(30);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Task Removal / Purge Modal State
  const [taskPendingRemoval, setTaskPendingRemoval] = useState<TaskTimeAuditItem | null>(null);
  const [removeRecurringSchedule, setRemoveRecurringSchedule] = useState<boolean>(true);

  // Compute all audit records across custom tasks and historical sessions + direct audit adjustments
  const allAuditItems: TaskTimeAuditItem[] = useMemo(() => {
    return computeTaskTimeAudit(schedules, history);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedules, history, localVersion]);

  // Total time across all tasks
  const grandTotalMinutes = useMemo(() => {
    return allAuditItems.reduce((acc, item) => acc + item.totalTimeMinutes, 0);
  }, [allAuditItems]);

  const maxTaskMinutes = useMemo(() => {
    return Math.max(...allAuditItems.map((item) => item.totalTimeMinutes), 1);
  }, [allAuditItems]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const item of allAuditItems) {
      set.add(item.category);
    }
    return ['all', ...Array.from(set)];
  }, [allAuditItems]);

  // Filtered and sorted items
  const filteredItems = useMemo(() => {
    return allAuditItems
      .filter((item) => {
        const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
        const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'time') return b.totalTimeMinutes - a.totalTimeMinutes;
        if (sortBy === 'sessions') return b.totalSessionsCount - a.totalSessionsCount;
        if (sortBy === 'alpha') return a.title.localeCompare(b.title);
        return 0;
      });
  }, [allAuditItems, selectedCategory, searchQuery, sortBy]);

  const handleQuickDirectAdd = (title: string, category: TaskCategory, minutes: number) => {
    addDirectTimeToTaskAudit(title, minutes, category);
    setLocalVersion((v) => v + 1);
    onRefresh?.();
    setToastMessage(`[DIRECT TIME AUDITED] ${minutes > 0 ? `+${minutes}m` : `${minutes}m`} added to "${title}"`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenAddModal = (initialTitle: string = '', initialCategory: TaskCategory = 'custom') => {
    setModalTaskTitle(initialTitle);
    setModalCategory(initialCategory);
    setModalMinutes(30);
    setIsModalOpen(true);
  };

  const handleCommitDirectTime = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalTaskTitle.trim() || modalMinutes === 0) return;

    addDirectTimeToTaskAudit(modalTaskTitle.trim(), modalMinutes, modalCategory);
    setLocalVersion((v) => v + 1);
    onRefresh?.();
    setToastMessage(`[DIRECT TIME AUDITED] ${modalMinutes > 0 ? `+${modalMinutes}m` : `${modalMinutes}m`} added to "${modalTaskTitle.trim()}"`);
    setTimeout(() => setToastMessage(null), 3500);
    setIsModalOpen(false);
  };

  const handleOpenRemoveModal = (task: TaskTimeAuditItem) => {
    setTaskPendingRemoval(task);
    setRemoveRecurringSchedule(true);
  };

  const handleConfirmRemoveTask = () => {
    if (!taskPendingRemoval) return;

    const { updatedSchedules, totalRemovedMinutes } = removeTaskFromAudit(
      taskPendingRemoval.title,
      schedules,
      { removeRecurring: removeRecurringSchedule }
    );

    if (removeRecurringSchedule && updatedSchedules) {
      onUpdateSchedules?.(updatedSchedules);
    }
    setLocalVersion((v) => v + 1);
    onRefresh?.();

    const hoursRemoved = (totalRemovedMinutes / 60).toFixed(1);
    setToastMessage(
      `[TASK PURGED] "${taskPendingRemoval.title}" wiped completely (-${hoursRemoved}h). Metrics & Audit rebalanced.`
    );
    setTimeout(() => setToastMessage(null), 4500);
    setTaskPendingRemoval(null);
  };

  const handleCopyReport = () => {
    const lines = [
      `=== TASK TIME AUDIT REPORT // PER-TASK ACCUMULATION ===`,
      `TOTAL SYSTEM TIME AUDITED: ${(grandTotalMinutes / 60).toFixed(1)} HOURS`,
      `TOTAL CREATED TASKS: ${allAuditItems.length}`,
      ``,
      ...filteredItems.map((item, idx) => {
        const hours = (item.totalTimeMinutes / 60).toFixed(1);
        const percent = grandTotalMinutes > 0 ? Math.round((item.totalTimeMinutes / grandTotalMinutes) * 100) : 0;
        return `[${idx + 1}] ${item.title.padEnd(35, ' ')} | ${hours.padStart(5, ' ')} hrs (${percent}%) | ${item.completedSessionsCount}/${item.totalSessionsCount} sessions`;
      }),
      `=== END REPORT ===`
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    setCopyStatus('ASCII AUDIT REPORT COPIED TO CLIPBOARD!');
    setTimeout(() => setCopyStatus(null), 3000);
  };

  return (
    <div className="space-y-6 font-mono text-white">
      {/* Header Banner */}
      <div className="border border-white bg-black">
        <div className="bg-white text-black text-xs px-4 py-1 font-bold flex items-center justify-between">
          <span>_TASK_TIME_AUDIT_METRIC</span>
          <span className="text-[10px] uppercase tracking-widest opacity-80">
            TOTAL TIME GIVEN TO EACH CREATED TASK
          </span>
        </div>

        <div className="p-4 md:p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/20 pb-4">
            <div>
              <div className="text-[10px] tracking-widest opacity-60 uppercase">
                PER-TASK DISTRIBUTION AUDIT
              </div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tighter text-white mt-1">
                {(grandTotalMinutes / 60).toFixed(1)} HOURS TOTAL TIME LOGGED
              </h2>
              <p className="text-xs opacity-75 mt-0.5">
                Exact time allocated to all {allAuditItems.length} tasks across daily schedules, historical sessions, and direct audit entries.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleOpenAddModal('', 'custom')}
                className="border border-white bg-white text-black px-4 py-1.5 text-xs hover:bg-white/80 transition-none cursor-pointer font-bold uppercase tracking-wider"
              >
                [+ ADD TIME TO TASK]
              </button>
              <button
                onClick={handleCopyReport}
                className="border border-white bg-black px-4 py-1.5 text-xs text-white hover:bg-white hover:text-black transition-none cursor-pointer font-bold uppercase tracking-wider"
              >
                [EXPORT ASCII AUDIT]
              </button>
            </div>
          </div>

          {copyStatus && (
            <div className="bg-white text-black text-xs font-bold py-1 px-3 text-center">
              {copyStatus}
            </div>
          )}

          {/* Search, Filter & Sort Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter tasks by name..."
                className="bg-black border border-white/40 px-3 py-1 text-xs text-white placeholder:text-white/40 focus:border-white focus:outline-none"
              />

              <div className="flex items-center gap-1">
                <span className="opacity-60 text-[11px]">CATEGORY:</span>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-black border border-white/40 px-2 py-1 text-xs text-white focus:border-white focus:outline-none uppercase"
                >
                  {categories.map((c) => (
                    <option key={c} value={c} className="bg-black text-white">
                      {c.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="opacity-60 text-[11px]">SORT BY:</span>
              <button
                onClick={() => setSortBy('time')}
                className={`px-2 py-0.5 border text-xs font-bold transition-none cursor-pointer ${
                  sortBy === 'time'
                    ? 'bg-white text-black border-white'
                    : 'border-white/30 text-white hover:border-white'
                }`}
              >
                TIME GIVEN
              </button>
              <button
                onClick={() => setSortBy('sessions')}
                className={`px-2 py-0.5 border text-xs font-bold transition-none cursor-pointer ${
                  sortBy === 'sessions'
                    ? 'bg-white text-black border-white'
                    : 'border-white/30 text-white hover:border-white'
                }`}
              >
                SESSIONS
              </button>
              <button
                onClick={() => setSortBy('alpha')}
                className={`px-2 py-0.5 border text-xs font-bold transition-none cursor-pointer ${
                  sortBy === 'alpha'
                    ? 'bg-white text-black border-white'
                    : 'border-white/30 text-white hover:border-white'
                }`}
              >
                A-Z
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Task List Table */}
      <div className="border border-white bg-black divide-y divide-white/20">
        <div className="bg-white text-black text-xs px-4 py-1.5 font-bold flex items-center justify-between">
          <span>_TASK_NAME_&amp;_SPECIFICATION</span>
          <div className="flex items-center gap-6">
            <span className="hidden sm:inline">RELATIVE VOLUME</span>
            <span>TOTAL TIME GIVEN &amp; ACTIONS</span>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="p-8 text-center text-xs opacity-60">
            NO TASKS FOUND MATCHING YOUR FILTER CRITERIA.
          </div>
        ) : (
          filteredItems.map((task, idx) => {
            const hours = (task.totalTimeMinutes / 60).toFixed(1);
            const percentOfGrandTotal = grandTotalMinutes > 0
              ? Math.round((task.totalTimeMinutes / grandTotalMinutes) * 100)
              : 0;
            const asciiBar = generateAsciiProgressBar(task.totalTimeMinutes, maxTaskMinutes, 14, 'blocks');
            const avgMinutes = task.totalSessionsCount > 0
              ? Math.round(task.totalTimeMinutes / task.totalSessionsCount)
              : 0;

            return (
              <div
                key={task.taskId + '-' + idx}
                className="p-4 md:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-white/5"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="opacity-50 text-xs font-bold">
                      [{String(idx + 1).padStart(2, '0')}]
                    </span>
                    <span className="text-base font-bold text-white tracking-tight">
                      {task.title}
                    </span>
                    <span className="text-[10px] uppercase border border-white/40 px-1 py-0 opacity-80">
                      {task.category}
                    </span>
                    <span className="text-[10px] uppercase opacity-60">
                      {task.isRepetitive ? '[REPETITIVE]' : '[ONE-TIME]'}
                    </span>
                    {task.isCustom && (
                      <span className="bg-white text-black text-[10px] font-bold px-1.5 py-0">
                        CUSTOM_CREATED
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs opacity-70">
                    <span>Sessions: {task.completedSessionsCount} of {task.totalSessionsCount} completed</span>
                    <span>•</span>
                    <span>Avg Duration: {avgMinutes}m per session</span>
                    {task.firstTrackedDate && (
                      <>
                        <span>•</span>
                        <span>First: {task.firstTrackedDate}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3 lg:gap-5 shrink-0">
                  <div className="hidden sm:block border border-white/20 p-2 bg-black text-xs">
                    <div className="text-[10px] opacity-60 uppercase mb-0.5">METER:</div>
                    <div className="font-mono text-xs font-bold text-white">{asciiBar}</div>
                  </div>

                  <div className="text-left sm:text-right border sm:border-0 border-white/20 p-2 sm:p-0 bg-white/5 sm:bg-transparent">
                    <div className="text-base md:text-lg font-bold text-white font-mono">
                      {hours}h <span className="text-xs font-normal opacity-70">({formatMinutes(task.totalTimeMinutes)})</span>
                    </div>
                    <div className="text-[11px] opacity-60">
                      {percentOfGrandTotal}% of total system time
                    </div>
                  </div>

                  {/* Direct Add Time Actions without Day */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleQuickDirectAdd(task.title, task.category, 15)}
                      className="border border-white/40 px-1.5 py-0.5 text-[10px] text-white hover:bg-white hover:text-black font-bold cursor-pointer transition-none"
                      title="Directly add 15 minutes to this task"
                    >
                      +15m
                    </button>
                    <button
                      onClick={() => handleQuickDirectAdd(task.title, task.category, 30)}
                      className="border border-white/40 px-1.5 py-0.5 text-[10px] text-white hover:bg-white hover:text-black font-bold cursor-pointer transition-none"
                      title="Directly add 30 minutes to this task"
                    >
                      +30m
                    </button>
                    <button
                      onClick={() => handleOpenAddModal(task.title, task.category)}
                      className="border border-white bg-white text-black px-2.5 py-0.5 text-[10px] font-bold uppercase hover:bg-white/80 cursor-pointer transition-none"
                      title="Add direct time to this task without specifying any day"
                    >
                      [+ ADD TIME]
                    </button>
                    <button
                      onClick={() => handleOpenRemoveModal(task)}
                      className="border border-red-500/70 text-red-400 hover:bg-red-500 hover:text-black px-2 py-0.5 text-[10px] font-bold uppercase cursor-pointer transition-none ml-0.5"
                      title="Purge this task completely from Audit and Hierarchy Metrics"
                    >
                      [REMOVE]
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Direct Add Time Modal (Without specifying any day) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="border-2 border-white bg-black max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/20 pb-2">
              <span className="text-sm font-bold text-white uppercase tracking-wider">
                _DIRECT_TASK_TIME_AUDIT // NO_DAY_BINDING
              </span>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white hover:opacity-60 text-xs font-bold font-mono cursor-pointer"
              >
                [X CLOSE]
              </button>
            </div>

            <form onSubmit={handleCommitDirectTime} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] opacity-70 uppercase font-bold block">
                  TASK TITLE / SPECIFICATION:
                </label>
                <input
                  type="text"
                  required
                  value={modalTaskTitle}
                  onChange={(e) => setModalTaskTitle(e.target.value)}
                  list="known-tasks-datalist"
                  className="w-full bg-black border border-white/40 px-3 py-1.5 text-sm text-white font-mono focus:border-white focus:outline-none"
                  placeholder="e.g. Deep Research, Math Practice..."
                />
                <datalist id="known-tasks-datalist">
                  {allAuditItems.map((item) => (
                    <option key={item.taskId} value={item.title} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] opacity-70 uppercase font-bold block">
                  CATEGORY:
                </label>
                <select
                  value={modalCategory}
                  onChange={(e) => setModalCategory(e.target.value as TaskCategory)}
                  className="w-full bg-black border border-white/40 px-2 py-1.5 text-xs text-white focus:border-white focus:outline-none uppercase"
                >
                  <option value="deep_work">DEEP WORK</option>
                  <option value="core_work">CORE WORK</option>
                  <option value="fitness">FITNESS / HEALTH</option>
                  <option value="learning">LEARNING / ACADEMIC</option>
                  <option value="creative">CREATIVE / EXPLORATION</option>
                  <option value="life_ops">LIFE OPERATIONS</option>
                  <option value="custom">CUSTOM</option>
                </select>
              </div>

              <div className="space-y-1.5 pt-1">
                <label className="text-[10px] opacity-70 uppercase font-bold block">
                  MINUTES TO ACCUMULATE (OR ENTER CUSTOM):
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[15, 30, 45, 60, 90, 120, 180, 240].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setModalMinutes(mins)}
                      className={`py-1 text-xs border font-mono font-bold transition-none cursor-pointer ${
                        modalMinutes === mins
                          ? 'bg-white text-black border-white'
                          : 'border-white/30 text-white hover:border-white'
                      }`}
                    >
                      +{mins}m
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1 pt-1">
                <label className="text-[10px] opacity-70 uppercase font-bold block">
                  CUSTOM MINUTES:
                </label>
                <input
                  type="number"
                  min="1"
                  value={modalMinutes}
                  onChange={(e) => setModalMinutes(parseInt(e.target.value) || 0)}
                  className="w-full bg-black border border-white/40 px-3 py-1.5 text-sm text-white font-mono focus:border-white focus:outline-none"
                  placeholder="e.g. 75"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/20">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="border border-white/40 px-3 py-1 text-xs text-white hover:bg-white hover:text-black transition-none cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="border border-white bg-white text-black px-4 py-1 text-xs font-bold hover:bg-white/90 transition-none cursor-pointer uppercase"
                >
                  CONFIRM &amp; ACCUMULATE (+{modalMinutes}m)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Purge / Remove Task Confirmation Modal */}
      {taskPendingRemoval && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50">
          <div className="border-2 border-red-500 bg-black max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-red-500/40 pb-2">
              <span className="text-sm font-bold text-red-400 uppercase tracking-wider flex items-center gap-2">
                <span className="bg-red-500 text-black px-1.5 py-0.5 text-[10px] font-black">CRITICAL_ACTION</span>
                _PURGE_TASK_FROM_AUDIT_&amp;_METRICS
              </span>
              <button
                onClick={() => setTaskPendingRemoval(null)}
                className="text-white hover:opacity-60 text-xs font-bold font-mono cursor-pointer"
              >
                [X CLOSE]
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-red-950/20 border border-red-500/30 p-3 space-y-1">
                <div className="text-[10px] opacity-70 uppercase font-bold text-white/80">TARGET TASK:</div>
                <div className="text-base font-bold text-white font-mono">
                  {taskPendingRemoval.title}
                </div>
                <div className="text-xs text-white/70">
                  Total Tracked: <span className="font-bold text-red-300">{(taskPendingRemoval.totalTimeMinutes / 60).toFixed(1)} hrs</span> ({taskPendingRemoval.totalTimeMinutes} minutes) across {taskPendingRemoval.completedSessionsCount} completed sessions.
                </div>
              </div>

              <div className="space-y-2 border border-white/20 p-3 bg-white/5 text-[11px] leading-relaxed">
                <div className="font-bold text-white uppercase tracking-wider text-[10px] text-yellow-400">
                  ⚡ EXECUTION BREAKDOWN (WHAT WILL HAPPEN):
                </div>
                <ul className="list-disc list-inside space-y-1 opacity-90">
                  <li>
                    <strong>Hierarchy Metrics:</strong> Completely erased from every historical day, week, and month. All day/week totals will automatically decrease by this task's time.
                  </li>
                  <li>
                    <strong>Task Time Audit:</strong> Deleted from the audit table. Grand total reduced by <strong>{(taskPendingRemoval.totalTimeMinutes / 60).toFixed(1)} hours</strong>.
                  </li>
                  <li>
                    <strong>Direct Audit Adjustments:</strong> Any direct hours stored without a calendar day will be wiped.
                  </li>
                </ul>
              </div>

              <label className="flex items-center gap-2.5 p-2.5 border border-white/30 bg-black cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={removeRecurringSchedule}
                  onChange={(e) => setRemoveRecurringSchedule(e.target.checked)}
                  className="w-4 h-4 accent-white bg-black border border-white/60 cursor-pointer"
                />
                <span className="text-xs text-white">
                  <strong>Also remove from recurring weekly schedule</strong> (recommended, so it completely disappears from both Audit table and routine planner)
                </span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/20">
                <button
                  type="button"
                  onClick={() => setTaskPendingRemoval(null)}
                  className="border border-white/40 px-3 py-1.5 text-xs text-white hover:bg-white hover:text-black transition-none cursor-pointer font-mono"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRemoveTask}
                  className="border-2 border-red-500 bg-red-600 text-white hover:bg-red-500 hover:text-black px-4 py-1.5 text-xs font-bold font-mono transition-none cursor-pointer uppercase tracking-wider"
                >
                  [CONFIRM PURGE TASK]
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 border-2 border-white bg-white text-black font-bold text-xs px-4 py-2 shadow-2xl z-50 animate-bounce font-mono">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
