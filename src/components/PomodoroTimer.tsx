import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import { TaskItem } from '../types';
import { playCustomOrFallbackSound } from '../data/soundStore';
import { generateAsciiProgressBar } from '../utils/ascii';

export interface PomodoroTimerHandle {
  togglePlayPause: () => boolean;
  reset: () => void;
  attachTask: (taskId: string) => void;
  isRunning: () => boolean;
}

interface PomodoroTimerProps {
  scheduledTasks: TaskItem[];
  activeFocusTaskId?: string;
  onLogMinutesToTask: (taskId: string, minutes: number) => void;
  onPomodoroStateChange?: (isRunning: boolean, taskId: string | null) => void;
  onPauseLiveStopwatch?: () => void;
}

type SessionPreset = 'focus_25' | 'deep_50' | 'short_break' | 'long_break';

export const PomodoroTimer = forwardRef<PomodoroTimerHandle, PomodoroTimerProps>(
  function PomodoroTimer(
    {
      scheduledTasks,
      activeFocusTaskId,
      onLogMinutesToTask,
      onPomodoroStateChange,
      onPauseLiveStopwatch,
    },
    ref
  ) {
    // Dropdown selection - defaults to active focus task or first scheduled task
    const [selectedTaskId, setSelectedTaskId] = useState<string>(() => {
      return activeFocusTaskId || scheduledTasks[0]?.id || '';
    });

    const userSelectedRef = useRef<boolean>(false);
    const [preset, setPreset] = useState<SessionPreset>('focus_25');
    const [targetDurationMinutes, setTargetDurationMinutes] = useState<number>(25);
    const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(25 * 60);
    const [isRunning, setIsRunning] = useState<boolean>(false);
    const [pomodoroCount, setPomodoroCount] = useState<number>(0);
    const [justCompletedAlert, setJustCompletedAlert] = useState<string | null>(null);

    // Precise time tracking refs
    const isRunningRef = useRef<boolean>(false);
    const timeLeftSecondsRef = useRef<number>(25 * 60);
    const targetEndTimeRef = useRef<number | null>(null);
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Uncommitted elapsed seconds bucket - keeps track of seconds worked even across multiple pauses
    const uncommittedSecondsRef = useRef<number>(0);
    const lastTickTimeRef = useRef<number | null>(null);

    // Keep stable references to props so callbacks never trigger interval resets
    const scheduledTasksRef = useRef<TaskItem[]>(scheduledTasks);
    scheduledTasksRef.current = scheduledTasks;

    const onLogMinutesToTaskRef = useRef(onLogMinutesToTask);
    onLogMinutesToTaskRef.current = onLogMinutesToTask;

    const onPomodoroStateChangeRef = useRef(onPomodoroStateChange);
    onPomodoroStateChangeRef.current = onPomodoroStateChange;

    const onPauseLiveStopwatchRef = useRef(onPauseLiveStopwatch);
    onPauseLiveStopwatchRef.current = onPauseLiveStopwatch;

    const selectedTaskIdRef = useRef<string>(selectedTaskId);
    selectedTaskIdRef.current = selectedTaskId;

    const presetRef = useRef<SessionPreset>(preset);
    presetRef.current = preset;

    // Keep active focus task synced in dropdown when idle if user hasn't explicitly picked a different task
    const prevActiveFocusRef = useRef<string | undefined>(activeFocusTaskId);
    useEffect(() => {
      if (!isRunningRef.current && activeFocusTaskId && !userSelectedRef.current) {
        if (!selectedTaskId || selectedTaskId === prevActiveFocusRef.current) {
          setSelectedTaskId(activeFocusTaskId);
        }
      }
      prevActiveFocusRef.current = activeFocusTaskId;
    }, [activeFocusTaskId, selectedTaskId]);

    // Ensure selectedTaskId falls back to first scheduled task if current selection is deleted/invalid
    useEffect(() => {
      if (scheduledTasks.length > 0) {
        if (!selectedTaskId || !scheduledTasks.some((t) => t.id === selectedTaskId)) {
          setSelectedTaskId(scheduledTasks[0].id);
          userSelectedRef.current = false;
        }
      }
    }, [scheduledTasks, selectedTaskId]);

    // Helper to log uncommitted elapsed minutes to the selected task
    const flushElapsedTimeToTask = useCallback((): { elapsedMinutes: number; taskTitle: string } | null => {
      const isWorkSession = presetRef.current === 'focus_25' || presetRef.current === 'deep_50';
      const currentTaskId = selectedTaskIdRef.current;
      const uncommitted = uncommittedSecondsRef.current;

      if (!isWorkSession || !currentTaskId || uncommitted <= 0) {
        return null;
      }

      // Convert seconds to minutes (round up if >= 30 seconds worked)
      const elapsedMinutes = Math.round(uncommitted / 60);

      if (elapsedMinutes > 0) {
        onLogMinutesToTaskRef.current(currentTaskId, elapsedMinutes);
        // Reset uncommitted seconds
        uncommittedSecondsRef.current = 0;
        const targetTask = scheduledTasksRef.current.find((t) => t.id === currentTaskId);
        return { elapsedMinutes, taskTitle: targetTask?.title || 'TASK' };
      }

      return null;
    }, []);

    // Audio chime tone fallback using browser Web Audio API
    const playChime = useCallback(() => {
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(659.25, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15);

        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      } catch {
        // Audio context may be blocked before user interaction
      }
    }, []);

    // Main countdown tick handler (imperative, robust against re-renders)
    const tick = useCallback(() => {
      if (!isRunningRef.current) return;

      const now = Date.now();
      if (lastTickTimeRef.current !== null) {
        const deltaSec = Math.max(0, (now - lastTickTimeRef.current) / 1000);
        const isWorkSession = presetRef.current === 'focus_25' || presetRef.current === 'deep_50';
        if (isWorkSession) {
          uncommittedSecondsRef.current += deltaSec;
        }
      }
      lastTickTimeRef.current = now;

      if (targetEndTimeRef.current !== null) {
        const remainingMs = Math.max(0, targetEndTimeRef.current - now);
        const remainingSeconds = Math.ceil(remainingMs / 1000);

        timeLeftSecondsRef.current = remainingSeconds;
        setTimeLeftSeconds(remainingSeconds);

        if (remainingSeconds <= 0) {
          // Completed session!
          isRunningRef.current = false;
          setIsRunning(false);
          targetEndTimeRef.current = null;
          lastTickTimeRef.current = null;

          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
          }

          onPomodoroStateChangeRef.current?.(false, null);
          playChime();

          const isWorkSession = presetRef.current === 'focus_25' || presetRef.current === 'deep_50';
          if (isWorkSession) {
            playCustomOrFallbackSound('pomodoro_complete');
            setPomodoroCount((c) => c + 1);

            // Commit all remaining uncommitted seconds (at least 1 minute)
            const minutesToCommit = Math.max(
              1,
              Math.round(uncommittedSecondsRef.current / 60)
            );
            uncommittedSecondsRef.current = 0;

            const targetId = selectedTaskIdRef.current;
            if (targetId) {
              onLogMinutesToTaskRef.current(targetId, minutesToCommit);
            }
            const targetTask = scheduledTasksRef.current.find((t) => t.id === targetId);
            setJustCompletedAlert(
              `COMPLETED ${minutesToCommit}m FOCUS // LOGGED TO: ${targetTask?.title || 'TASK'}`
            );
          } else {
            playCustomOrFallbackSound('break_complete');
            setJustCompletedAlert(`BREAK FINISHED // READY FOR NEXT FOCUS ROUND`);
          }
        }
      }
    }, [playChime]);

    // Start timer execution loop
    const startTimer = useCallback(() => {
      // Pause any conflicting manual stopwatch in TrackerView
      onPauseLiveStopwatchRef.current?.();

      isRunningRef.current = true;
      setIsRunning(true);

      const isWorkSession = presetRef.current === 'focus_25' || presetRef.current === 'deep_50';
      onPomodoroStateChangeRef.current?.(true, isWorkSession ? selectedTaskIdRef.current : null);

      const now = Date.now();
      lastTickTimeRef.current = now;
      targetEndTimeRef.current = now + timeLeftSecondsRef.current * 1000;

      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      timerIntervalRef.current = setInterval(tick, 250);
    }, [tick]);

    // Pause timer execution loop
    const pauseTimer = useCallback(() => {
      isRunningRef.current = false;
      setIsRunning(false);

      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }

      // Record final fractional second delta before stopping
      if (lastTickTimeRef.current !== null) {
        const deltaSec = Math.max(0, (Date.now() - lastTickTimeRef.current) / 1000);
        const isWorkSession = presetRef.current === 'focus_25' || presetRef.current === 'deep_50';
        if (isWorkSession) {
          uncommittedSecondsRef.current += deltaSec;
        }
      }
      lastTickTimeRef.current = null;
      targetEndTimeRef.current = null;

      onPomodoroStateChangeRef.current?.(false, null);

      // Auto-log uncommitted time to task
      const logged = flushElapsedTimeToTask();
      if (logged) {
        setJustCompletedAlert(`[AUTOLOG ON PAUSE]: ${logged.elapsedMinutes}m credited to "${logged.taskTitle}"`);
      }
    }, [flushElapsedTimeToTask]);

    // Toggle Play / Pause
    const handleTogglePlayPause = useCallback((): boolean => {
      if (isRunningRef.current) {
        pauseTimer();
        return false;
      } else {
        startTimer();
        return true;
      }
    }, [pauseTimer, startTimer]);

    // Reset Pomodoro timer: auto-log any uncommitted elapsed minutes, then reset to target duration
    const handleReset = useCallback(() => {
      pauseTimer();
      const resetSeconds = targetDurationMinutes * 60;
      timeLeftSecondsRef.current = resetSeconds;
      setTimeLeftSeconds(resetSeconds);
      uncommittedSecondsRef.current = 0;

      setJustCompletedAlert(`[TIMER RESET]: Reset to ${targetDurationMinutes}m`);
      setTimeout(() => setJustCompletedAlert(null), 2500);
    }, [pauseTimer, targetDurationMinutes]);

    // Switch preset
    const handleSelectPreset = (newPreset: SessionPreset) => {
      pauseTimer();
      setPreset(newPreset);
      presetRef.current = newPreset;

      let mins = 25;
      if (newPreset === 'focus_25') mins = 25;
      if (newPreset === 'deep_50') mins = 50;
      if (newPreset === 'short_break') mins = 5;
      if (newPreset === 'long_break') mins = 15;

      setTargetDurationMinutes(mins);
      const newSeconds = mins * 60;
      timeLeftSecondsRef.current = newSeconds;
      setTimeLeftSeconds(newSeconds);
      uncommittedSecondsRef.current = 0;
      setJustCompletedAlert(null);
    };

    // Handle manual log & finish early
    const handleFinishEarly = () => {
      pauseTimer();
      const resetSeconds = targetDurationMinutes * 60;
      timeLeftSecondsRef.current = resetSeconds;
      setTimeLeftSeconds(resetSeconds);
      uncommittedSecondsRef.current = 0;
    };

    // Cleanup interval on unmount
    useEffect(() => {
      return () => {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
      };
    }, []);

    // Imperative handle for keyboard shortcuts (P to toggle, R to reset)
    useImperativeHandle(
      ref,
      () => ({
        togglePlayPause: () => {
          return handleTogglePlayPause();
        },
        reset: () => {
          handleReset();
        },
        attachTask: (taskId: string) => {
          userSelectedRef.current = true;
          setSelectedTaskId(taskId);
          selectedTaskIdRef.current = taskId;
        },
        isRunning: () => isRunningRef.current,
      }),
      [handleTogglePlayPause, handleReset]
    );

    const minutesDisplay = Math.floor(timeLeftSeconds / 60);
    const secondsDisplay = timeLeftSeconds % 60;
    const timeFormatted = `${String(minutesDisplay).padStart(2, '0')}:${String(secondsDisplay).padStart(2, '0')}`;

    const totalSeconds = targetDurationMinutes * 60;
    const elapsedSeconds = Math.max(0, totalSeconds - timeLeftSeconds);
    const progressPercent = totalSeconds > 0 ? Math.min(100, Math.round((elapsedSeconds / totalSeconds) * 100)) : 0;
    const asciiBar = generateAsciiProgressBar(elapsedSeconds, totalSeconds, 18, 'blocks');

    const currentTask = scheduledTasks.find((t) => t.id === selectedTaskId);

    return (
      <div className="border border-white bg-black">
        <div className="bg-white text-black text-xs px-4 py-1 font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isRunning && <span className="inline-block w-2 h-2 bg-black animate-ping" />}
            <span>_POMODORO_SESSION_ENGINE</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold">
              [{pomodoroCount} CYCLES]
            </span>
          </div>
        </div>

        <div className="p-4 space-y-3 font-mono text-white text-xs">
          {/* Task Selection Dropdown */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] opacity-60 uppercase font-bold block">
                ATTACH TO SCHEDULED TASK:
              </label>
              <span className="text-[9px] text-white/50 uppercase">
                {isRunning ? 'LOCKED DURING SESSION' : 'SELECT TARGET TASK'}
              </span>
            </div>
            <select
              value={selectedTaskId}
              onChange={(e) => {
                userSelectedRef.current = true;
                setSelectedTaskId(e.target.value);
                selectedTaskIdRef.current = e.target.value;
              }}
              disabled={isRunning}
              className="w-full bg-black border border-white/50 px-2.5 py-1 text-xs text-white focus:border-white focus:outline-none disabled:opacity-50 uppercase cursor-pointer"
            >
              {scheduledTasks.length === 0 ? (
                <option value="">NO ACTIVE SCHEDULED TASKS</option>
              ) : (
                scheduledTasks.map((t) => (
                  <option key={t.id} value={t.id} className="bg-black text-white">
                    {t.title} [{t.time}] ({t.timeSpentMinutes || 0}m/{t.durationMinutes}m)
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Preset Buttons */}
          <div className="grid grid-cols-4 gap-1.5 pt-1">
            <button
              onClick={() => handleSelectPreset('focus_25')}
              disabled={isRunning}
              className={`py-1 text-[10px] border font-bold uppercase transition-none cursor-pointer ${
                preset === 'focus_25'
                  ? 'bg-white text-black border-white'
                  : 'border-white/30 text-white/70 hover:border-white'
              }`}
            >
              25m FOCUS
            </button>
            <button
              onClick={() => handleSelectPreset('deep_50')}
              disabled={isRunning}
              className={`py-1 text-[10px] border font-bold uppercase transition-none cursor-pointer ${
                preset === 'deep_50'
                  ? 'bg-white text-black border-white'
                  : 'border-white/30 text-white/70 hover:border-white'
              }`}
            >
              50m DEEP
            </button>
            <button
              onClick={() => handleSelectPreset('short_break')}
              disabled={isRunning}
              className={`py-1 text-[10px] border font-bold uppercase transition-none cursor-pointer ${
                preset === 'short_break'
                  ? 'bg-white text-black border-white'
                  : 'border-white/30 text-white/70 hover:border-white'
              }`}
            >
              5m BREAK
            </button>
            <button
              onClick={() => handleSelectPreset('long_break')}
              disabled={isRunning}
              className={`py-1 text-[10px] border font-bold uppercase transition-none cursor-pointer ${
                preset === 'long_break'
                  ? 'bg-white text-black border-white'
                  : 'border-white/30 text-white/70 hover:border-white'
              }`}
            >
              15m BREAK
            </button>
          </div>

          {/* Large Countdown Display */}
          <div className="border border-white/30 bg-black p-3 text-center space-y-1">
            <div className="text-3xl md:text-4xl font-black tracking-widest text-white font-mono">
              {timeFormatted}
            </div>
            <div className="text-[10px] opacity-60 uppercase tracking-wider">
              {preset.includes('break') ? 'RECOVERY INTERVAL' : `DEEP FOCUS // ${currentTask?.title || 'ACTIVE'}`}
            </div>
            <div className="text-xs font-mono font-bold pt-1 overflow-x-auto select-none">
              {asciiBar}
            </div>
            <div className="text-[10px] opacity-50">
              {elapsedSeconds}s / {totalSeconds}s ({progressPercent}%)
            </div>
          </div>

          {justCompletedAlert && (
            <div className="bg-white text-black p-2 text-center text-[10px] font-bold tracking-tight border border-white">
              {justCompletedAlert}
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleTogglePlayPause}
              className={`flex-1 py-1.5 text-xs font-bold border transition-none cursor-pointer uppercase ${
                isRunning
                  ? 'bg-black text-white border-white animate-pulse'
                  : 'bg-white text-black border-white hover:bg-white/90'
              }`}
            >
              {isRunning ? '[PAUSE (P)]' : '[START POMODORO (P)]'}
            </button>

            <button
              onClick={handleReset}
              className="border border-white/40 px-2.5 py-1.5 text-xs text-white hover:bg-white hover:text-black transition-none cursor-pointer font-bold uppercase"
              title="Reset Pomodoro Timer & Auto-Log Elapsed Worked Time (Hotkey: R)"
            >
              [RESET (R)]
            </button>

            {isRunning && (
              <button
                onClick={handleFinishEarly}
                className="border border-white/40 px-2.5 py-1.5 text-xs text-white hover:bg-white hover:text-black transition-none cursor-pointer font-bold uppercase"
                title="Log completed portion to task and stop"
              >
                [LOG &amp; STOP]
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
);
