import React, { useState, useMemo } from 'react';
import { MonthLogRecord, WeekLogRecord, DayLogRecord, DayTaskLog } from '../types';
import { formatMinutes } from '../data/historyStore';
import { generateAsciiProgressBar } from '../utils/ascii';

interface HierarchicalMetricsViewProps {
  history: MonthLogRecord[];
  onRefresh?: () => void;
}

export function HierarchicalMetricsView({ history }: HierarchicalMetricsViewProps) {
  // Navigation states for hierarchy drilldown:
  // selectedMonthKey: null means showing all months list
  // selectedWeekId: null means showing weeks within selectedMonth
  // selectedDayDate: null means showing days within selectedWeek
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>('2026-09');
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);

  // Quick filter / view mode: 'drilldown' or 'expanded'
  const [viewMode, setViewMode] = useState<'drilldown' | 'tree'>('drilldown');

  // Overall calculations across all months
  const allMonthsTotals = useMemo(() => {
    let totalMinutes = 0;
    let completedTasks = 0;
    let totalTasks = 0;

    for (const m of history) {
      totalMinutes += m.totalTimeMinutes;
      completedTasks += m.completedCount;
      totalTasks += m.totalTasksCount;
    }

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    return {
      totalMinutes,
      totalHoursStr: (totalMinutes / 60).toFixed(1),
      completedTasks,
      totalTasks,
      completionRate,
      monthsCount: history.length,
    };
  }, [history]);

  // Comparative metrics: Past Week & Past Month calculation
  const comparativeStats = useMemo(() => {
    if (history.length === 0) {
      return {
        currentMonth: null,
        previousMonth: null,
        currentWeek: null,
        previousWeek: null,
        maxMonthMinutes: 1,
      };
    }
    // Current month is the last one in history
    const currentMonth = history[history.length - 1];
    const previousMonth = history.length > 1 ? history[history.length - 2] : null;

    // Current week is the last week of current month
    const allWeeksFlattened: WeekLogRecord[] = [];
    for (const m of history) {
      for (const w of m.weeks) {
        allWeeksFlattened.push(w);
      }
    }

    const currentWeek = allWeeksFlattened.length > 0 ? allWeeksFlattened[allWeeksFlattened.length - 1] : null;
    const previousWeek = allWeeksFlattened.length > 1 ? allWeeksFlattened[allWeeksFlattened.length - 2] : null;

    const maxMonthMinutes = Math.max(...history.map((m) => m.totalTimeMinutes), 1);

    return {
      currentMonth,
      previousMonth,
      currentWeek,
      previousWeek,
      maxMonthMinutes,
    };
  }, [history]);

  // Current selected entities
  const activeMonth = useMemo(() => {
    return history.find((m) => m.monthKey === selectedMonthKey) || null;
  }, [history, selectedMonthKey]);

  const activeWeek = useMemo(() => {
    if (!activeMonth || !selectedWeekId) return null;
    return activeMonth.weeks.find((w) => w.weekId === selectedWeekId) || null;
  }, [activeMonth, selectedWeekId]);

  const activeDay = useMemo(() => {
    if (!activeWeek || !selectedDayDate) return null;
    return activeWeek.days.find((d) => d.date === selectedDayDate) || null;
  }, [activeWeek, selectedDayDate]);

  if (history.length === 0) {
    return (
      <div className="border border-white bg-black p-8 font-mono text-white text-center space-y-4">
        <div className="inline-block p-3 border-2 border-white bg-white text-black font-black text-sm uppercase">
          _CLEAN_SLATE // NO_HISTORICAL_RECORDS_YET
        </div>
        <div className="max-w-xl mx-auto space-y-2 text-xs opacity-80 leading-relaxed text-justify sm:text-center">
          <p>
            Your system is currently at an authentic zero baseline. All synthetic and placeholder data have been cleared so every recorded hour comes purely from your real work.
          </p>
          <p>
            As you check off tasks or run the <strong>[START TIMER]</strong> / <strong>[POMODORO]</strong> engines in <strong>[1] _TIMELINE_TRACKER</strong>, your hierarchical audit trail (Months &gt; Weeks &gt; Days &gt; Tasks) will automatically build itself here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-mono text-white">
      {/* Top Banner: All Months Aggregation & Comparative Shell */}
      <div className="border border-white bg-black">
        <div className="bg-white text-black text-xs px-4 py-1 font-bold flex items-center justify-between">
          <span>_HIERARCHICAL_METRICS_ENGINE</span>
          <span className="text-[10px] uppercase tracking-widest opacity-80">
            MONTHS &gt; WEEKS &gt; DAYS &gt; TASKS
          </span>
        </div>

        <div className="p-4 md:p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/20 pb-4">
            <div>
              <div className="text-[10px] tracking-widest opacity-60 uppercase">
                ALL-TIME ACCUMULATED OUTPUT // SUM OF ALL RECORDED MONTHS
              </div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tighter text-white mt-1">
                {allMonthsTotals.totalHoursStr} HOURS TOTAL
              </h2>
              <p className="text-xs opacity-75 mt-0.5">
                {allMonthsTotals.completedTasks} of {allMonthsTotals.totalTasks} scheduled tasks completed ({allMonthsTotals.completionRate}% disciplined execution rate) across {allMonthsTotals.monthsCount} months.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSelectedMonthKey(null);
                  setSelectedWeekId(null);
                  setSelectedDayDate(null);
                }}
                className="border border-white/40 bg-black px-3 py-1 text-xs text-white hover:bg-white hover:text-black transition-none cursor-pointer font-bold"
              >
                [VIEW ALL MONTHS]
              </button>
              <button
                onClick={() => setViewMode(viewMode === 'drilldown' ? 'tree' : 'drilldown')}
                className="border border-white bg-black px-3 py-1 text-xs text-white hover:bg-white hover:text-black transition-none cursor-pointer font-bold uppercase"
              >
                MODE: {viewMode.toUpperCase()}
              </button>
            </div>
          </div>

          {/* Comparative Metrics Grid: Past Week vs Past Month vs All-Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="border border-white/30 p-3 bg-black space-y-1">
              <div className="text-[10px] opacity-60 uppercase font-bold">PAST WEEK OUTPUT</div>
              <div className="text-base font-bold text-white">
                {comparativeStats.previousWeek
                  ? `${(comparativeStats.previousWeek.totalTimeMinutes / 60).toFixed(1)} hrs`
                  : '--'}
              </div>
              <div className="text-[10px] opacity-60">
                {comparativeStats.previousWeek
                  ? `${comparativeStats.previousWeek.completedCount}/${comparativeStats.previousWeek.totalTasksCount} tasks`
                  : 'No prior week recorded'}
              </div>
            </div>

            <div className="border border-white/30 p-3 bg-black space-y-1">
              <div className="text-[10px] opacity-60 uppercase font-bold">CURRENT WEEK OUTPUT</div>
              <div className="text-base font-bold text-white">
                {comparativeStats.currentWeek
                  ? `${(comparativeStats.currentWeek.totalTimeMinutes / 60).toFixed(1)} hrs`
                  : '0.0 hrs'}
              </div>
              <div className="text-[10px] opacity-60">
                {comparativeStats.currentWeek
                  ? `${comparativeStats.currentWeek.completedCount}/${comparativeStats.currentWeek.totalTasksCount} tasks`
                  : 'Active pacing'}
              </div>
            </div>

            <div className="border border-white/30 p-3 bg-black space-y-1">
              <div className="text-[10px] opacity-60 uppercase font-bold">
                {comparativeStats.previousMonth
                  ? `PAST MONTH (${comparativeStats.previousMonth.monthName.toUpperCase()})`
                  : 'PAST MONTH'}
              </div>
              <div className="text-base font-bold text-white">
                {comparativeStats.previousMonth
                  ? `${(comparativeStats.previousMonth.totalTimeMinutes / 60).toFixed(1)} hrs`
                  : '--'}
              </div>
              <div className="text-[10px] opacity-60">
                {comparativeStats.previousMonth
                  ? `${comparativeStats.previousMonth.completedCount}/${comparativeStats.previousMonth.totalTasksCount} tasks (${Math.round((comparativeStats.previousMonth.completedCount / comparativeStats.previousMonth.totalTasksCount) * 100)}%)`
                  : 'No prior month recorded'}
              </div>
            </div>

            <div className="border border-white/30 p-3 bg-white/5 space-y-1">
              <div className="text-[10px] opacity-60 uppercase font-bold">
                {comparativeStats.currentMonth
                  ? `CURRENT MONTH (${comparativeStats.currentMonth.monthName.toUpperCase()})`
                  : 'CURRENT MONTH'}
              </div>
              <div className="text-base font-bold text-white">
                {comparativeStats.currentMonth
                  ? `${(comparativeStats.currentMonth.totalTimeMinutes / 60).toFixed(1)} hrs`
                  : '0.0 hrs'}
              </div>
              <div className="text-[10px] opacity-60">
                {comparativeStats.currentMonth
                  ? `${comparativeStats.currentMonth.completedCount}/${comparativeStats.currentMonth.totalTasksCount} tasks logged`
                  : 'Active pacing'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Breadcrumb Navigation Strip */}
      <div className="border border-white bg-black px-4 py-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="opacity-60 text-[10px] uppercase font-bold">NAV_DEPTH:</span>
        <button
          onClick={() => {
            setSelectedMonthKey(null);
            setSelectedWeekId(null);
            setSelectedDayDate(null);
          }}
          className={`px-2 py-0.5 border transition-none cursor-pointer font-bold ${
            !selectedMonthKey ? 'bg-white text-black border-white' : 'border-white/30 hover:border-white text-white'
          }`}
        >
          [ALL MONTHS]
        </button>

        {activeMonth && (
          <>
            <span className="opacity-40">&gt;</span>
            <button
              onClick={() => {
                setSelectedWeekId(null);
                setSelectedDayDate(null);
              }}
              className={`px-2 py-0.5 border transition-none cursor-pointer font-bold ${
                selectedMonthKey && !selectedWeekId
                  ? 'bg-white text-black border-white'
                  : 'border-white/30 hover:border-white text-white'
              }`}
            >
              [{activeMonth.monthName.toUpperCase()}]
            </button>
          </>
        )}

        {activeWeek && (
          <>
            <span className="opacity-40">&gt;</span>
            <button
              onClick={() => setSelectedDayDate(null)}
              className={`px-2 py-0.5 border transition-none cursor-pointer font-bold ${
                selectedWeekId && !selectedDayDate
                  ? 'bg-white text-black border-white'
                  : 'border-white/30 hover:border-white text-white'
              }`}
            >
              [{activeWeek.label.toUpperCase()}]
            </button>
          </>
        )}

        {activeDay && (
          <>
            <span className="opacity-40">&gt;</span>
            <span className="px-2 py-0.5 bg-white text-black border border-white font-bold">
              [{activeDay.date} // {activeDay.dayName.toUpperCase()}]
            </span>
          </>
        )}
      </div>

      {/* Main Comparative List of All Months (Always visible at shell or expandable) */}
      <div className="border border-white bg-black">
        <div className="bg-white text-black text-sm px-4 py-1 font-bold flex items-center justify-between">
          <span>_ALL_RECORDED_MONTHS // COMPARATIVE_SUMMARY</span>
          <span className="text-xs font-mono font-bold">
            {history.length} MONTHS ARCHIVED
          </span>
        </div>

        <div className="divide-y divide-white/20">
          {history.map((m) => {
            const isSelected = selectedMonthKey === m.monthKey;
            const hours = (m.totalTimeMinutes / 60).toFixed(1);
            const rate = m.totalTasksCount > 0 ? Math.round((m.completedCount / m.totalTasksCount) * 100) : 0;
            const asciiBar = generateAsciiProgressBar(
              m.totalTimeMinutes,
              comparativeStats.maxMonthMinutes,
              18,
              'blocks'
            );

            return (
              <div
                key={m.monthKey}
                className={`p-4 md:p-5 transition-none select-none ${
                  isSelected ? 'bg-white/5 border-l-4 border-l-white' : 'hover:bg-white/5'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="text-base font-bold text-white tracking-tight uppercase">
                        {m.monthName}
                      </span>
                      <span className="bg-white text-black text-xs font-bold px-2 py-0.5">
                        {hours} HOURS
                      </span>
                      {m.monthKey === '2026-09' && (
                        <span className="border border-white text-white text-[10px] font-bold px-1.5 py-0.5">
                          ACTIVE_MONTH
                        </span>
                      )}
                    </div>
                    <div className="text-xs opacity-70">
                      {m.weeks.length} Weeks Recorded // {m.completedCount} of {m.totalTasksCount} tasks completed ({rate}%)
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="border border-white/20 p-2 bg-black text-xs">
                      <div className="text-[10px] opacity-60 uppercase mb-0.5">VOLUME COMPARISON:</div>
                      <div className="font-mono text-xs font-bold text-white">{asciiBar}</div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedMonthKey(m.monthKey);
                        setSelectedWeekId(null);
                        setSelectedDayDate(null);
                      }}
                      className={`px-3 py-1.5 text-xs font-bold border transition-none cursor-pointer uppercase ${
                        isSelected
                          ? 'bg-white text-black border-white'
                          : 'border-white text-white hover:bg-white hover:text-black'
                      }`}
                    >
                      {isSelected ? '[DRILL DOWN WEEKS]' : '[INSPECT MONTH]'}
                    </button>
                  </div>
                </div>

                {/* If selected in tree mode or drilldown mode, show weeks */}
                {isSelected && (
                  <div className="mt-4 pt-4 border-t border-white/20 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-white">
                        &gt;&gt; WEEKS IN {m.monthName.toUpperCase()}
                      </span>
                      <span className="text-[11px] opacity-60">
                        CLICK A WEEK TO EXPAND DAYS
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {m.weeks.map((week) => {
                        const isWeekSelected = selectedWeekId === week.weekId;
                        const weekHours = (week.totalTimeMinutes / 60).toFixed(1);
                        const weekRate = week.totalTasksCount > 0
                          ? Math.round((week.completedCount / week.totalTasksCount) * 100)
                          : 0;

                        return (
                          <div
                            key={week.weekId}
                            onClick={() => {
                              setSelectedWeekId(week.weekId);
                              setSelectedDayDate(null);
                            }}
                            className={`border p-3.5 space-y-2 cursor-pointer transition-none select-none ${
                              isWeekSelected
                                ? 'border-white bg-white/10 text-white'
                                : 'border-white/30 bg-black hover:border-white'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-sm text-white uppercase">
                                {week.label}
                              </span>
                              <span className="bg-white text-black font-bold text-xs px-2 py-0.5">
                                {weekHours}h ({weekRate}%)
                              </span>
                            </div>

                            <div className="text-xs opacity-70 flex justify-between">
                              <span>{week.days.length} Days Tracked</span>
                              <span>{week.completedCount}/{week.totalTasksCount} tasks</span>
                            </div>

                            <div className="text-xs font-mono font-bold text-white pt-1">
                              {generateAsciiProgressBar(week.completedCount, week.totalTasksCount, 14, 'hashes')}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SUB-PART 2: DAYS IN SELECTED WEEK */}
      {activeWeek && (
        <div className="border border-white bg-black">
          <div className="bg-white text-black text-sm px-4 py-1 font-bold flex items-center justify-between">
            <span>_DAYS_IN_{activeWeek.label.toUpperCase().replace(/\s+/g, '_')}</span>
            <span className="text-xs font-mono font-bold">
              {formatMinutes(activeWeek.totalTimeMinutes)} TOTAL
            </span>
          </div>

          <div className="p-4 space-y-3">
            <div className="text-xs opacity-70 mb-2">
              SELECT A DAY BELOW TO AUDIT ITS COMPLETE TASK-LEVEL TIMELINE &amp; TIME GIVEN:
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {activeWeek.days.map((day) => {
                const isDaySelected = selectedDayDate === day.date;
                const dayHours = (day.totalTimeMinutes / 60).toFixed(1);

                return (
                  <div
                    key={day.date}
                    onClick={() => setSelectedDayDate(day.date)}
                    className={`border p-3.5 space-y-2 cursor-pointer transition-none select-none ${
                      isDaySelected
                        ? 'border-white bg-white text-black font-bold'
                        : 'border-white/40 bg-black text-white hover:border-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-tight">
                        {day.dayName}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 border ${
                        isDaySelected ? 'border-black text-black' : 'border-white text-white'
                      }`}>
                        {day.code || 'DAY'}
                      </span>
                    </div>

                    <div className="text-xs">
                      <span className="font-mono text-[11px] block">{day.date}</span>
                      <span className="text-sm font-bold block mt-1">
                        {formatMinutes(day.totalTimeMinutes)}
                      </span>
                    </div>

                    <div className="text-[11px] flex justify-between border-t pt-1.5 border-current/20">
                      <span>Completed:</span>
                      <span>{day.completedCount}/{day.totalTasksCount}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUB-PART 3: TASKS LISTED ON SELECTED DAY */}
      {activeDay && (
        <div className="border-2 border-white bg-black">
          <div className="bg-white text-black text-sm px-4 py-1.5 font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>_TASKS_LOGGED_ON_{activeDay.date} // {activeDay.dayName.toUpperCase()}</span>
              <span className="text-xs font-normal">[{activeDay.code || 'DAY'}]</span>
            </div>
            <div className="text-xs font-mono font-bold">
              TOTAL GIVEN: {formatMinutes(activeDay.totalTimeMinutes)} ({activeDay.completedCount}/{activeDay.totalTasksCount} DONE)
            </div>
          </div>

          <div className="p-4 md:p-6 space-y-4">
            <div className="text-xs opacity-80 border-b border-white/20 pb-3 flex flex-wrap items-center justify-between gap-2">
              <span>
                HERE ARE ALL TASKS SCHEDULED OR ADDED ON THIS DAY WITH EXACT TIME GIVEN:
              </span>
              <span className="text-white font-bold">
                {activeDay.tasks.length} TASK ENTRIES RECORDED
              </span>
            </div>

            <div className="divide-y divide-white/20 border border-white/30">
              {activeDay.tasks.map((task, idx) => (
                <div
                  key={task.taskId + '-' + idx}
                  className="p-3 md:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-black hover:bg-white/5"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 border shrink-0 ${
                        task.completed
                          ? 'bg-white text-black border-white'
                          : 'border-white/40 text-white/60'
                      }`}
                    >
                      {task.completed ? '[DONE]' : '[PENDING]'}
                    </span>

                    <div className="space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-white tracking-tight">
                          {task.title}
                        </span>
                        {task.timeSlot && (
                          <span className="text-xs opacity-60 font-mono">
                            [{task.timeSlot}]
                          </span>
                        )}
                        <span className="text-[10px] uppercase border border-white/30 px-1 py-0 opacity-75">
                          {task.category}
                        </span>
                        <span className="text-[10px] uppercase opacity-50">
                          {task.isRepetitive ? '[REPETITIVE]' : '[ONE-TIME]'}
                        </span>
                      </div>
                      {task.details && (
                        <p className="text-xs opacity-65 leading-relaxed">
                          {task.details}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                    <div className="text-right">
                      <div className="text-[10px] opacity-60 uppercase">TIME GIVEN</div>
                      <div className="text-sm font-bold text-white font-mono">
                        {formatMinutes(task.timeSpentMinutes)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
