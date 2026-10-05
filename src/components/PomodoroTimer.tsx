import React, { useState, useEffect, useRef } from 'react';
import { TaskItem } from '../types';
import { generateAsciiProgressBar } from '../utils/ascii';

interface PomodoroTimerProps {
  scheduledTasks: TaskItem[];
  activeFocusTaskId?: string;
  onLogMinutesToTask: (taskId: string, minutes: number) => void;
}

type SessionPreset = 'focus_25' | 'deep_50' | 'short_break' | 'long_break';

export function PomodoroTimer({
  scheduledTasks,
  activeFocusTaskId,
  onLogMinutesToTask,
}: PomodoroTimerProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string>(() => {
    return activeFocusTaskId || scheduledTasks[0]?.id || '';
  });

  const [preset, setPreset] = useState<SessionPreset>('focus_25');
  const [targetDurationMinutes, setTargetDurationMinutes] = useState<number>(25);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(25 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [pomodoroCount, setPomodoroCount] = useState<number>(0);
  const [justCompletedAlert, setJustCompletedAlert] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync selected task if activeFocusTaskId changes and no task selected
  useEffect(() => {
    if (!selectedTaskId && activeFocusTaskId) {
      setSelectedTaskId(activeFocusTaskId);
    }
  }, [activeFocusTaskId, selectedTaskId]);

  // Audio chime tone using browser Web Audio API
  const playChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch {
      // Audio context may be blocked before interaction
    }
  };

  // Switch preset
  const handleSelectPreset = (newPreset: SessionPreset) => {
    setIsRunning(false);
    setPreset(newPreset);
    let mins = 25;
    if (newPreset === 'focus_25') mins = 25;
    if (newPreset === 'deep_50') mins = 50;
    if (newPreset === 'short_break') mins = 5;
    if (newPreset === 'long_break') mins = 15;

    setTargetDurationMinutes(mins);
    setTimeLeftSeconds(mins * 60);
    setJustCompletedAlert(null);
  };

  // Timer countdown loop
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeftSeconds((prev) => {
          if (prev <= 1) {
            // Completed!
            setIsRunning(false);
            playChime();

            const isWorkSession = preset === 'focus_25' || preset === 'deep_50';
            if (isWorkSession) {
              setPomodoroCount((c) => c + 1);
              if (selectedTaskId) {
                onLogMinutesToTask(selectedTaskId, targetDurationMinutes);
              }
              const targetTask = scheduledTasks.find((t) => t.id === selectedTaskId);
              setJustCompletedAlert(
                `COMPLETED ${targetDurationMinutes}m FOCUS // LOGGED TO: ${targetTask?.title || 'TASK'}`
              );
            } else {
              setJustCompletedAlert(`BREAK FINISHED // READY FOR NEXT FOCUS ROUND`);
            }

            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, preset, selectedTaskId, targetDurationMinutes, onLogMinutesToTask, scheduledTasks]);

  // Handle manual log & finish early
  const handleFinishEarly = () => {
    setIsRunning(false);
    const elapsedSeconds = targetDurationMinutes * 60 - timeLeftSeconds;
    const elapsedMinutes = Math.round(elapsedSeconds / 60);

    if (elapsedMinutes > 0 && (preset === 'focus_25' || preset === 'deep_50') && selectedTaskId) {
      onLogMinutesToTask(selectedTaskId, elapsedMinutes);
      setJustCompletedAlert(`EARLY LOG: ${elapsedMinutes}m CREDITED TO TASK`);
    }

    setTimeLeftSeconds(targetDurationMinutes * 60);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeftSeconds(targetDurationMinutes * 60);
    setJustCompletedAlert(null);
  };

  const minutesDisplay = Math.floor(timeLeftSeconds / 60);
  const secondsDisplay = timeLeftSeconds % 60;
  const timeFormatted = `${String(minutesDisplay).padStart(2, '0')}:${String(secondsDisplay).padStart(2, '0')}`;

  const totalSeconds = targetDurationMinutes * 60;
  const elapsedSeconds = totalSeconds - timeLeftSeconds;
  const progressPercent = totalSeconds > 0 ? Math.round((elapsedSeconds / totalSeconds) * 100) : 0;
  const asciiBar = generateAsciiProgressBar(elapsedSeconds, totalSeconds, 18, 'blocks');

  const currentTask = scheduledTasks.find((t) => t.id === selectedTaskId);

  return (
    <div className="border border-white bg-black">
      <div className="bg-white text-black text-xs px-4 py-1 font-bold flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isRunning && <span className="inline-block w-2 h-2 bg-black animate-ping" />}
          <span>_POMODORO_SESSION_ENGINE</span>
        </div>
        <span className="text-[10px] font-mono font-bold">
          [{pomodoroCount} CYCLES COMPLETED]
        </span>
      </div>

      <div className="p-4 space-y-3 font-mono text-white text-xs">
        {/* Task Selection */}
        <div className="space-y-1">
          <label className="text-[10px] opacity-60 uppercase font-bold block">
            ATTACH TO SCHEDULED TASK:
          </label>
          <select
            value={selectedTaskId}
            onChange={(e) => setSelectedTaskId(e.target.value)}
            disabled={isRunning}
            className="w-full bg-black border border-white/50 px-2.5 py-1 text-xs text-white focus:border-white focus:outline-none disabled:opacity-50 uppercase"
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

        {/* Preset Selectors */}
        <div className="grid grid-cols-4 gap-1">
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
            onClick={() => setIsRunning(!isRunning)}
            className={`flex-1 py-1.5 text-xs font-bold border transition-none cursor-pointer uppercase ${
              isRunning
                ? 'bg-black text-white border-white animate-pulse'
                : 'bg-white text-black border-white hover:bg-white/90'
            }`}
          >
            {isRunning ? '[PAUSE]' : '[START POMODORO]'}
          </button>

          <button
            onClick={handleReset}
            className="border border-white/40 px-2.5 py-1.5 text-xs text-white hover:bg-white hover:text-black transition-none cursor-pointer font-bold uppercase"
          >
            [RESET]
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
