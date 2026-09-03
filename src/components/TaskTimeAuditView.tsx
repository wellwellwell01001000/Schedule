import React, { useState, useMemo } from 'react';
import { TaskTimeAuditItem, DaySchedule, MonthLogRecord, TaskCategory } from '../types';
import { computeTaskTimeAudit, formatMinutes } from '../data/historyStore';
import { generateAsciiProgressBar } from '../utils/ascii';

interface TaskTimeAuditViewProps {
  schedules: Record<string, DaySchedule>;
  history: MonthLogRecord[];
}

export function TaskTimeAuditView({ schedules, history }: TaskTimeAuditViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'time' | 'sessions' | 'alpha'>('time');
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  // Compute all audit records across custom tasks and historical sessions
  const allAuditItems: TaskTimeAuditItem[] = useMemo(() => {
    return computeTaskTimeAudit(schedules, history);
  }, [schedules, history]);

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
                Exact time allocated to all {allAuditItems.length} created tasks across daily schedules and historical sessions.
              </p>
            </div>

            <button
              onClick={handleCopyReport}
              className="border border-white bg-black px-4 py-1.5 text-xs text-white hover:bg-white hover:text-black transition-none cursor-pointer font-bold uppercase tracking-wider"
            >
              [EXPORT ASCII AUDIT]
            </button>
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
            <span>TOTAL TIME GIVEN</span>
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
            const asciiBar = generateAsciiProgressBar(task.totalTimeMinutes, maxTaskMinutes, 16, 'blocks');
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

                <div className="flex flex-col sm:flex-row sm:items-center gap-4 lg:gap-6 shrink-0">
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
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
