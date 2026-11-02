import React, { useState, useMemo } from 'react';
import { HabitItem, TaskCategory } from '../types';
import {
  loadHabits,
  saveHabits,
  loadHabitLogs,
  toggleHabitForDate,
  calculateHabitStats,
  getDateOffset,
  deleteHabitFromStore,
} from '../data/habitStore';
import { getTodayDateStr, generateAsciiProgressBar } from '../utils/ascii';
import { CategorySelect } from './CategorySelect';
import { getCategoryLabel } from '../data/categoryStore';

export function HabitTrackerView() {
  const [habits, setHabits] = useState<HabitItem[]>(() => loadHabits());
  const [habitLogs, setHabitLogs] = useState<Record<string, string[]>>(() => loadHabitLogs());
  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayDateStr());
  const todayStr = useMemo(() => getTodayDateStr(), []);

  // Filter & Search state
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Expand past days state per habit (defaults to collapsed/hidden so only today is shown)
  const [expandedHistoryHabits, setExpandedHistoryHabits] = useState<Record<string, boolean>>({});

  // Modal State for New / Edit Habit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [habitTitle, setHabitTitle] = useState('');
  const [habitCategory, setHabitCategory] = useState<TaskCategory>('workout');
  const [habitTargetDays, setHabitTargetDays] = useState<number>(7);
  const [habitDescription, setHabitDescription] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Popup state for Habit Deletion Confirmation
  const [deletingHabit, setDeletingHabit] = useState<HabitItem | null>(null);

  // Compute stats for all habits independently
  const habitStatsMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof calculateHabitStats>>();
    for (const h of habits) {
      map.set(h.id, calculateHabitStats(h, habitLogs, todayStr));
    }
    return map;
  }, [habits, habitLogs, todayStr]);

  // Overall aggregate stats
  const aggregateMetrics = useMemo(() => {
    const totalHabits = habits.length;
    if (totalHabits === 0) {
      return {
        completedToday: 0,
        totalHabits: 0,
        todayRate: 0,
        highestStreak: 0,
        average30dRate: 0,
      };
    }

    const todayCompletedList = habitLogs[todayStr] || [];
    const completedToday = habits.filter((h) => todayCompletedList.includes(h.id)).length;
    const todayRate = Math.round((completedToday / totalHabits) * 100);

    let highestStreak = 0;
    let sumRates = 0;
    for (const h of habits) {
      const stats = habitStatsMap.get(h.id);
      if (stats) {
        if (stats.currentStreak > highestStreak) highestStreak = stats.currentStreak;
        sumRates += stats.completionRate30d;
      }
    }

    const average30dRate = Math.round(sumRates / totalHabits);

    return {
      completedToday,
      totalHabits,
      todayRate,
      highestStreak,
      average30dRate,
    };
  }, [habits, habitLogs, todayStr, habitStatsMap]);

  // Filtered habits list: always preserves natural fixed order with no sorting
  const filteredHabits = useMemo(() => {
    return habits.filter((h) => {
      const matchesCat = selectedCategory === 'all' || h.category === selectedCategory;
      const matchesQuery =
        h.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (h.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesQuery;
    });
  }, [habits, selectedCategory, searchQuery]);

  // Toggle habit on selectedDate or any specific date without rearranging
  const handleToggle = (habitId: string, dateToToggle: string = todayStr) => {
    const updated = toggleHabitForDate(habitId, dateToToggle);
    setHabitLogs({ ...updated });
    const isNowDone = (updated[dateToToggle] || []).includes(habitId);
    const targetHabit = habits.find((h) => h.id === habitId);
    setToastMessage(
      `[HABIT ${isNowDone ? 'CHECKED' : 'UNCHECKED'}]: "${targetHabit?.title || 'Habit'}" for ${dateToToggle}`
    );
    setTimeout(() => setToastMessage(null), 2500);
  };

  const toggleExpandHistory = (habitId: string) => {
    setExpandedHistoryHabits((prev) => ({
      ...prev,
      [habitId]: !prev[habitId],
    }));
  };

  const handleOpenAddModal = () => {
    setEditingHabitId(null);
    setHabitTitle('');
    setHabitCategory('workout');
    setHabitTargetDays(7);
    setHabitDescription('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (habit: HabitItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingHabitId(habit.id);
    setHabitTitle(habit.title);
    setHabitCategory(habit.category);
    setHabitTargetDays(Math.max(1, Math.min(7, habit.targetDaysPerWeek || 7)));
    setHabitDescription(habit.description || '');
    setIsModalOpen(true);
  };

  const handleConfirmDelete = (habitId: string, habitTitleStr: string) => {
    const updated = deleteHabitFromStore(habitId);
    setHabits(updated);
    setToastMessage(`[HABIT REMOVED]: "${habitTitleStr}" deleted.`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSaveHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!habitTitle.trim()) return;
    const targetDays = Math.max(1, Math.min(7, habitTargetDays));

    if (editingHabitId) {
      const updated = habits.map((h) =>
        h.id === editingHabitId
          ? {
              ...h,
              title: habitTitle.trim(),
              category: habitCategory,
              targetDaysPerWeek: targetDays,
              description: habitDescription.trim(),
            }
          : h
      );
      setHabits(updated);
      saveHabits(updated);
      setToastMessage(`[HABIT UPDATED]: "${habitTitle.trim()}" saved.`);
    } else {
      const newHabit: HabitItem = {
        id: `habit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: habitTitle.trim(),
        category: habitCategory,
        targetDaysPerWeek: targetDays,
        description: habitDescription.trim(),
        createdAt: todayStr,
      };
      const updated = [...habits, newHabit];
      setHabits(updated);
      saveHabits(updated);
      setToastMessage(`[NEW HABIT CREATED]: "${newHabit.title}" active.`);
    }

    setTimeout(() => setToastMessage(null), 3000);
    setIsModalOpen(false);
  };

  const isTodaySelected = selectedDate === todayStr;

  return (
    <div className="space-y-6 font-mono text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="border-2 border-white bg-white text-black p-3 text-xs font-bold flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 bg-black animate-pulse" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-[10px] font-black uppercase px-2 py-0.5 border border-black hover:bg-black hover:text-white cursor-pointer"
          >
            [DISMISS]
          </button>
        </div>
      )}

      {/* Main Banner Header */}
      <div className="border border-white bg-black">
        <div className="bg-white text-black text-xs px-4 py-1.5 font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-black inline-block" />
            <span className="tracking-wider">_HABIT_STREAK_MATRIX // CONSISTENCY ENGINE</span>
          </div>
          <span className="text-[10px] uppercase opacity-75">
            DAILY DISCIPLINE &amp; INDEPENDENT STREAKS
          </span>
        </div>

        <div className="p-4 md:p-6 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
                HABITUAL REPETITION &amp; STREAK METRICS
              </h2>
              <p className="text-xs opacity-60 mt-1 max-w-2xl">
                Independent habits tracked across time. Log today&apos;s rituals, maintain
                unbroken chains, and expand past history whenever needed.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="border-2 border-white bg-white text-black px-4 py-2 text-xs font-black uppercase hover:bg-white/90 cursor-pointer shadow-md flex items-center gap-2 transition-none"
              >
                <span>[+ NEW HABIT]</span>
              </button>
            </div>
          </div>

          {/* Metric KPI Blocks */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
            <div className="border border-white/30 p-3 bg-white/5 space-y-1">
              <span className="text-[10px] opacity-60 uppercase font-bold block">
                TODAY&apos;S COMPLETION:
              </span>
              <div className="text-xl md:text-2xl font-black">
                {aggregateMetrics.completedToday} / {aggregateMetrics.totalHabits}
              </div>
              <div className="text-[10px] opacity-75 font-mono">
                {generateAsciiProgressBar(
                  aggregateMetrics.completedToday,
                  Math.max(1, aggregateMetrics.totalHabits),
                  14,
                  'blocks'
                )}
              </div>
            </div>

            <div className="border border-white/30 p-3 bg-white/5 space-y-1">
              <span className="text-[10px] opacity-60 uppercase font-bold block">
                COMPLETION SCORE:
              </span>
              <div className="text-xl md:text-2xl font-black text-white">
                {aggregateMetrics.todayRate}%
              </div>
              <span className="text-[10px] opacity-60 block">Daily targeted rituals logged</span>
            </div>

            <div className="border border-white/30 p-3 bg-white/5 space-y-1">
              <span className="text-[10px] opacity-60 uppercase font-bold block">
                PEAK ACTIVE STREAK:
              </span>
              <div className="text-xl md:text-2xl font-black text-white flex items-center gap-1.5">
                <span>{aggregateMetrics.highestStreak} DAYS</span>
                <span className="text-base">🔥</span>
              </div>
              <span className="text-[10px] opacity-60 block">Cumulative unbroken streak</span>
            </div>

            <div className="border border-white/30 p-3 bg-white/5 space-y-1">
              <span className="text-[10px] opacity-60 uppercase font-bold block">
                30-DAY CONSISTENCY:
              </span>
              <div className="text-xl md:text-2xl font-black text-white">
                {aggregateMetrics.average30dRate}%
              </div>
              <span className="text-[10px] opacity-60 block">Rolling aggregate across habits</span>
            </div>
          </div>
        </div>
      </div>

      {/* Date Switcher & Search Controls Row */}
      <div className="border border-white/40 bg-black p-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        {/* Date Navigator */}
        <div className="flex items-center gap-1.5 bg-white/5 border border-white/20 p-1 shrink-0">
          <button
            type="button"
            onClick={() => setSelectedDate(getDateOffset(selectedDate, -1))}
            className="border border-white/30 px-2 py-1 hover:bg-white hover:text-black font-bold uppercase transition-none cursor-pointer"
            title="Inspect & check for previous day"
          >
            &lt; PREV
          </button>
          <div className="px-3 py-1 font-mono font-bold text-center">
            <span className="text-white">{selectedDate}</span>{' '}
            {isTodaySelected ? (
              <span className="text-[10px] bg-white text-black px-1.5 py-0.5 ml-1 font-bold">
                [TODAY]
              </span>
            ) : (
              <span className="text-[10px] opacity-60 ml-1">[HISTORICAL]</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSelectedDate(getDateOffset(selectedDate, 1))}
            className="border border-white/30 px-2 py-1 hover:bg-white hover:text-black font-bold uppercase transition-none cursor-pointer"
            title="Inspect & check for next day"
          >
            NEXT &gt;
          </button>
          {!isTodaySelected && (
            <button
              type="button"
              onClick={() => setSelectedDate(todayStr)}
              className="border border-white bg-white text-black px-2 py-1 font-bold text-[10px] uppercase cursor-pointer"
            >
              [JUMP TO TODAY]
            </button>
          )}
        </div>

        {/* Filters and search */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="text-[10px] opacity-60 uppercase font-bold">FILTER:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-black border border-white/40 px-2 py-1 text-xs text-white focus:outline-none"
            >
              <option value="all">ALL CATEGORIES</option>
              <option value="work">WORK / RESEARCH</option>
              <option value="workout">WORKOUT / BODY</option>
              <option value="leisure">LEISURE / HEALTH</option>
            </select>
          </div>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search habits..."
            className="bg-black border border-white/40 px-2.5 py-1 text-xs text-white placeholder:text-white/40 focus:border-white focus:outline-none w-36"
          />
        </div>
      </div>

      {/* Habits Grid */}
      {habits.length === 0 ? (
        <div className="border border-white/30 p-12 text-center bg-black space-y-4">
          <div className="w-3 h-3 bg-white inline-block animate-pulse" />
          <h3 className="text-base font-bold uppercase tracking-wider">NO HABITS TRACKED YET</h3>
          <p className="text-xs opacity-60 max-w-md mx-auto">
            Your habit streak matrix is currently empty. Define rituals and track your daily discipline.
          </p>
          <div>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="border-2 border-white bg-white text-black px-5 py-2 text-xs font-black uppercase hover:bg-white/90 cursor-pointer shadow-lg"
            >
              [+ CREATE YOUR FIRST HABIT]
            </button>
          </div>
        </div>
      ) : filteredHabits.length === 0 ? (
        <div className="border border-white/30 p-8 text-center bg-black space-y-3">
          <p className="text-sm opacity-60 uppercase">NO HABITS MATCHING CURRENT FILTER CRITERIA.</p>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('all');
              setSearchQuery('');
            }}
            className="border border-white bg-white text-black px-4 py-1.5 text-xs font-bold uppercase hover:bg-white/90 cursor-pointer"
          >
            [RESET FILTERS]
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredHabits.map((habit) => {
            const stats = habitStatsMap.get(habit.id)!;
            const isDoneToday = stats.isCompletedToday;
            const isExpanded = !!expandedHistoryHabits[habit.id];

            return (
              <div
                key={habit.id}
                className={`border p-4 space-y-3 transition-none bg-black flex flex-col justify-between ${
                  isDoneToday
                    ? 'border-white bg-white/5 ring-1 ring-white/50'
                    : 'border-white/30 hover:border-white/70'
                }`}
              >
                {/* Header Row: Title, Category, & Edit/Delete Controls */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white uppercase tracking-tight">
                          {habit.title}
                        </span>
                      </div>
                      {habit.description && (
                        <p className="text-[11px] opacity-60 leading-relaxed">
                          {habit.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[9px] uppercase border border-white/30 px-1.5 py-0.5 opacity-80">
                        {getCategoryLabel(habit.category)}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => handleOpenEditModal(habit, e)}
                        className="text-[10px] text-white/60 hover:text-white font-bold uppercase px-1 cursor-pointer"
                        title="Edit habit configuration"
                      >
                        [EDIT]
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingHabit(habit);
                        }}
                        className="text-[10px] text-white/60 hover:text-red-400 font-bold uppercase px-1 cursor-pointer"
                        title="Delete habit"
                      >
                        [DEL]
                      </button>
                    </div>
                  </div>

                  {/* Clean Minimal Stats Row (NO WEEKS SHOWN) */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono">
                    {/* Streak Badge */}
                    <div
                      className={`px-2 py-0.5 border text-xs font-bold font-mono flex items-center gap-1 ${
                        stats.currentStreak > 0
                          ? 'border-white bg-white text-black'
                          : 'border-white/30 text-white/50'
                      }`}
                      title="Current active streak"
                    >
                      <span>
                        STREAK: {stats.currentStreak} {stats.currentStreak === 1 ? 'DAY' : 'DAYS'}
                      </span>
                      {stats.currentStreak >= 3 && <span>🔥</span>}
                    </div>

                    <span className="text-[10px] opacity-70 font-mono">
                      BEST: <strong>{stats.bestStreak}d</strong>
                    </span>
                    <span className="opacity-30">•</span>
                    <span className="text-[10px] opacity-70 font-mono">
                      TOTAL: <strong>{stats.totalCompletions}d</strong>
                    </span>
                    <span className="opacity-30">•</span>
                    <span className="text-[10px] opacity-70 font-mono">
                      30D: <strong>{stats.completionRate30d}%</strong>
                    </span>
                  </div>
                </div>

                {/* HIGHLIGHTED CURRENT DAY (TODAY) BOX */}
                <div className="space-y-2 pt-2 border-t border-white/20">
                  <div
                    className={`border p-2.5 space-y-2 transition-none ${
                      isDoneToday
                        ? 'border-white bg-white text-black'
                        : 'border-white/60 bg-white/5 text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 inline-block ${
                            isDoneToday ? 'bg-black' : 'bg-white animate-pulse'
                          }`}
                        />
                        <span className="uppercase tracking-wider">
                          TODAY ({todayStr})
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-black uppercase px-1.5 py-0.5 ${
                          isDoneToday
                            ? 'bg-black text-white'
                            : 'border border-white/40 text-white'
                        }`}
                      >
                        {isDoneToday ? '[✓ COMPLETED TODAY]' : '[○ PENDING TODAY]'}
                      </span>
                    </div>

                    {/* Today Toggle Action Button */}
                    <button
                      type="button"
                      onClick={() => handleToggle(habit.id, todayStr)}
                      className={`w-full py-2.5 text-xs font-black uppercase transition-none cursor-pointer flex items-center justify-center gap-2 border-2 ${
                        isDoneToday
                          ? 'border-black bg-black text-white hover:bg-black/85 shadow-md'
                          : 'border-white bg-white text-black hover:bg-white/90 shadow-md'
                      }`}
                    >
                      {isDoneToday ? (
                        <>
                          <span className="text-sm font-black">✓</span>
                          <span>[COMPLETED TODAY — CLICK TO UNCHECK]</span>
                        </>
                      ) : (
                        <>
                          <span className="text-sm font-black">○</span>
                          <span>[CHECK OFF FOR TODAY]</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Toggle button around the habit button to view past days */}
                  <button
                    type="button"
                    onClick={() => toggleExpandHistory(habit.id)}
                    className="w-full text-[10px] text-white/70 hover:text-white uppercase font-bold py-1.5 px-3 border border-white/20 hover:border-white/60 flex items-center justify-between cursor-pointer transition-none bg-white/5"
                    title="Click around button to expand or collapse past history"
                  >
                    <span>
                      {isExpanded ? '[-] HIDE PAST DAYS' : '[+] SHOW PAST DAYS & HISTORY'}
                    </span>
                    <span className="text-[9px]">{isExpanded ? '▲' : '▼'}</span>
                  </button>

                  {/* PAST DAYS EXPANDED VIEW */}
                  {isExpanded && (
                    <div className="space-y-3 pt-2 border-t border-white/10">
                      {/* 7-Day Punchcard Row */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] opacity-60 uppercase font-bold">
                          <span>PAST 7 DAYS ACTIVITY:</span>
                          <span>CLICK ANY DAY TO LOG/UNLOG</span>
                        </div>

                        <div className="grid grid-cols-7 gap-1 text-center font-mono text-xs">
                          {stats.historyTrail7d.map((day) => {
                            const isToday = day.dateStr === todayStr;
                            return (
                              <button
                                key={day.dateStr}
                                type="button"
                                onClick={() => handleToggle(habit.id, day.dateStr)}
                                className={`p-1.5 border text-center transition-none cursor-pointer flex flex-col items-center gap-0.5 ${
                                  day.completed
                                    ? 'border-white bg-white text-black font-bold'
                                    : 'border-white/20 text-white/50 hover:border-white/60 hover:text-white'
                                } ${isToday ? 'ring-2 ring-white ring-offset-1 ring-offset-black' : ''}`}
                                title={`${day.dateStr} (${day.completed ? 'Completed' : 'Missed'})${
                                  isToday ? ' [TODAY]' : ''
                                } - Click to toggle`}
                              >
                                <span className="text-[9px] uppercase opacity-75">
                                  {day.dayLabel}
                                </span>
                                <span className="text-xs font-bold">
                                  {day.completed ? '■' : '·'}
                                </span>
                                {isToday && (
                                  <span className="text-[8px] font-black uppercase bg-black text-white px-0.5 mt-0.5 leading-none">
                                    TODAY
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 30-Day Heatmap Micro Matrix */}
                      <div className="space-y-1 pt-1 border-t border-white/10">
                        <div className="flex items-center justify-between text-[9px] opacity-50 uppercase">
                          <span>30-DAY CONTINUITY MATRIX:</span>
                          <span>{stats.completionRate30d}% CONSISTENCY</span>
                        </div>
                        <div className="flex flex-wrap gap-0.5">
                          {stats.historyTrail30d.map((point) => (
                            <span
                              key={point.dateStr}
                              className={`w-2 h-2 inline-block ${
                                point.completed ? 'bg-white' : 'bg-white/15'
                              }`}
                              title={`${point.dateStr}: ${point.completed ? 'Checked' : 'Missed'}`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT HABIT MODAL */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs font-mono text-white"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="w-full max-w-lg border-2 border-white bg-black shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/30 pb-2">
              <div className="flex items-center gap-2 font-bold text-sm uppercase">
                <span className="w-2.5 h-2.5 bg-white inline-block animate-pulse" />
                <span>{editingHabitId ? '_EDIT_HABIT_SPEC' : '_NEW_HABIT_SPECIFICATION'}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-white/60 hover:text-white font-bold text-xs cursor-pointer"
              >
                [X CLOSE]
              </button>
            </div>

            <form onSubmit={handleSaveHabit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] opacity-70 uppercase font-bold block">
                  HABIT TITLE *
                </label>
                <input
                  type="text"
                  required
                  value={habitTitle}
                  onChange={(e) => setHabitTitle(e.target.value)}
                  placeholder="e.g., Morning Cold Shower & Mobility"
                  className="w-full bg-black border border-white/50 px-3 py-1.5 text-xs text-white focus:border-white focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <CategorySelect
                  value={habitCategory}
                  onChange={(cat) => setHabitCategory(cat as TaskCategory)}
                />
              </div>

              {/* Weekly Frequency Target: strictly 1 to 7 days per week */}
              <div className="space-y-2 border border-white/30 p-3 bg-white/5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] uppercase font-bold block text-white">
                    WEEKLY FREQUENCY TARGET *
                  </label>
                  <span className="text-[11px] font-mono font-bold bg-white text-black px-2 py-0.5">
                    {habitTargetDays} {habitTargetDays === 1 ? 'DAY' : 'DAYS'} / WEEK
                  </span>
                </div>

                <div className="grid grid-cols-7 gap-1 pt-1">
                  {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setHabitTargetDays(num)}
                      className={`py-2 text-center text-xs font-mono font-bold border transition-none cursor-pointer ${
                        habitTargetDays === num
                          ? 'border-white bg-white text-black ring-1 ring-white'
                          : 'border-white/30 text-white/70 hover:border-white hover:text-white bg-black'
                      }`}
                    >
                      {num}d
                    </button>
                  ))}
                </div>

                <p className="text-[10px] opacity-70 leading-relaxed pt-1">
                  Target: Complete at least <strong>{habitTargetDays}</strong>{' '}
                  {habitTargetDays === 1 ? 'day' : 'days'} every week (Mon–Sun) to maintain your
                  cumulative streak.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] opacity-70 uppercase font-bold block">
                  HABIT OBJECTIVE / WHY (OPTIONAL)
                </label>
                <textarea
                  rows={2}
                  value={habitDescription}
                  onChange={(e) => setHabitDescription(e.target.value)}
                  placeholder="Reasoning, trigger cue, or target metric..."
                  className="w-full bg-black border border-white/50 px-3 py-1.5 text-xs text-white focus:border-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/20">
                {editingHabitId ? (
                  <button
                    type="button"
                    onClick={() => {
                      const h = habits.find((x) => x.id === editingHabitId);
                      if (h) {
                        setIsModalOpen(false);
                        setDeletingHabit(h);
                      }
                    }}
                    className="border border-red-500/70 text-red-400 hover:bg-red-500 hover:text-white px-3 py-1.5 text-xs font-bold uppercase cursor-pointer transition-none"
                  >
                    [DELETE HABIT]
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="border border-white/40 px-3 py-1.5 text-xs text-white hover:bg-white hover:text-black cursor-pointer uppercase transition-none"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    className="border border-white bg-white text-black px-4 py-1.5 text-xs font-bold uppercase hover:bg-white/90 cursor-pointer transition-none shadow-md"
                  >
                    {editingHabitId ? 'SAVE CHANGES' : 'COMMIT & START STREAK'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP CONFIRMATION MODAL FOR HABIT DELETION */}
      {deletingHabit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs font-mono text-white"
          onClick={() => setDeletingHabit(null)}
        >
          <div
            className="w-full max-w-md border-2 border-white bg-black shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/30 pb-2">
              <div className="flex items-center gap-2 font-bold text-sm uppercase">
                <span className="w-2.5 h-2.5 bg-red-500 inline-block animate-pulse" />
                <span>_CONFIRM_HABIT_DELETION</span>
              </div>
              <button
                type="button"
                onClick={() => setDeletingHabit(null)}
                className="text-white/60 hover:text-white font-bold text-xs cursor-pointer"
              >
                [X CLOSE]
              </button>
            </div>

            <div className="space-y-3 py-1">
              <p className="text-xs text-white">
                Are you sure you want to permanently delete this habit?
              </p>
              <div className="p-3 border border-white/40 bg-white/5 font-bold text-sm text-white uppercase tracking-tight">
                {deletingHabit.title}
              </div>
              <p className="text-[11px] opacity-60">
                This will permanently remove the habit and all of its recorded streak logs. This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/20">
              <button
                type="button"
                onClick={() => setDeletingHabit(null)}
                className="border border-white/40 px-3 py-1.5 text-xs text-white hover:bg-white hover:text-black cursor-pointer uppercase transition-none"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={() => {
                  handleConfirmDelete(deletingHabit.id, deletingHabit.title);
                  setDeletingHabit(null);
                }}
                className="border border-red-500 bg-red-600 text-white hover:bg-red-500 px-4 py-1.5 text-xs font-bold uppercase cursor-pointer transition-none shadow-md"
              >
                CONFIRM DELETE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
