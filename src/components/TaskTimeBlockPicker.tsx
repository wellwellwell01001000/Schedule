import React, { useState, useEffect } from 'react';
import {
  minutesToTimeString,
  minutesTo12HourString,
  formatDurationHuman,
  parseTimeSlot,
  formatTimeSlot,
  updateStartTime,
  updateEndTime,
  updateEstimateDuration,
} from '../utils/timePickerUtils';

interface TaskTimeBlockPickerProps {
  timeSlot: string;
  durationMinutes: number;
  onChange: (newTimeSlot: string, newDurationMinutes: number) => void;
  className?: string;
}

export function TaskTimeBlockPicker({
  timeSlot,
  durationMinutes,
  onChange,
  className = '',
}: TaskTimeBlockPickerProps) {
  // Parse initial state
  const initial = parseTimeSlot(timeSlot, durationMinutes);
  const [startMinutes, setStartMinutes] = useState<number>(initial.startMinutes);
  const [endMinutes, setEndMinutes] = useState<number>(initial.endMinutes);
  const [currentDuration, setCurrentDuration] = useState<number>(
    durationMinutes > 0 ? durationMinutes : initial.durationMinutes
  );

  // Sync internal state if props change from outside
  useEffect(() => {
    const parsed = parseTimeSlot(timeSlot, durationMinutes);
    setStartMinutes(parsed.startMinutes);
    setEndMinutes(parsed.endMinutes);
    setCurrentDuration(durationMinutes > 0 ? durationMinutes : parsed.durationMinutes);
  }, [timeSlot, durationMinutes]);

  // Propagate changes upwards
  const emitChange = (newStart: number, newEnd: number, newDur: number) => {
    setStartMinutes(newStart);
    setEndMinutes(newEnd);
    setCurrentDuration(newDur);
    onChange(formatTimeSlot(newStart, newEnd), newDur);
  };

  /* =========================================================================
     RULE 1: CHANGE START TIME -> END TIME STAYS FIXED, ESTIMATE UPDATES
     ========================================================================= */
  const handleStartHourChange = (deltaHours: number) => {
    let currentH = Math.floor(startMinutes / 60);
    const currentM = startMinutes % 60;
    currentH = (currentH + deltaHours + 24) % 24;
    const newStart = currentH * 60 + currentM;
    const updated = updateStartTime(newStart, endMinutes, currentDuration);
    emitChange(updated.startMinutes, updated.endMinutes, updated.durationMinutes);
  };

  const handleStartMinuteChange = (deltaMinutes: number) => {
    let newStart = (startMinutes + deltaMinutes + 1440) % 1440;
    // Round to nearest 5 mins if nudged
    if (Math.abs(deltaMinutes) === 5) {
      newStart = Math.round(newStart / 5) * 5 % 1440;
    }
    const updated = updateStartTime(newStart, endMinutes, currentDuration);
    emitChange(updated.startMinutes, updated.endMinutes, updated.durationMinutes);
  };

  const handleSetStartTimeDirect = (h: number, m: number) => {
    const newStart = ((h * 60 + m) % 1440 + 1440) % 1440;
    const updated = updateStartTime(newStart, endMinutes, currentDuration);
    emitChange(updated.startMinutes, updated.endMinutes, updated.durationMinutes);
  };

  const handleStartNow = () => {
    const now = new Date();
    // round to nearest 5 mins
    const m = Math.round(now.getMinutes() / 5) * 5;
    handleSetStartTimeDirect(now.getHours(), m);
  };

  /* =========================================================================
     RULE 2: CHANGE END TIME -> START TIME STAYS FIXED, ESTIMATE UPDATES
     ========================================================================= */
  const handleEndHourChange = (deltaHours: number) => {
    let currentH = Math.floor(endMinutes / 60);
    const currentM = endMinutes % 60;
    currentH = (currentH + deltaHours + 24) % 24;
    const newEnd = currentH * 60 + currentM;
    const updated = updateEndTime(startMinutes, newEnd, currentDuration);
    emitChange(updated.startMinutes, updated.endMinutes, updated.durationMinutes);
  };

  const handleEndMinuteChange = (deltaMinutes: number) => {
    let newEnd = (endMinutes + deltaMinutes + 1440) % 1440;
    if (Math.abs(deltaMinutes) === 5) {
      newEnd = Math.round(newEnd / 5) * 5 % 1440;
    }
    const updated = updateEndTime(startMinutes, newEnd, currentDuration);
    emitChange(updated.startMinutes, updated.endMinutes, updated.durationMinutes);
  };

  const handleSetEndTimeDirect = (h: number, m: number) => {
    const newEnd = ((h * 60 + m) % 1440 + 1440) % 1440;
    const updated = updateEndTime(startMinutes, newEnd, currentDuration);
    emitChange(updated.startMinutes, updated.endMinutes, updated.durationMinutes);
  };

  /* =========================================================================
     RULE 3: CHANGE ESTIMATE -> START TIME STAYS FIXED, END TIME UPDATES
     ========================================================================= */
  const handleEstimateChange = (newMinutes: number) => {
    const safeMins = Math.max(5, newMinutes);
    const updated = updateEstimateDuration(startMinutes, safeMins);
    emitChange(updated.startMinutes, updated.endMinutes, updated.durationMinutes);
  };

  const handleEstimateDelta = (deltaMinutes: number) => {
    handleEstimateChange(currentDuration + deltaMinutes);
  };

  // Derived hours and minutes for clean display
  const startH = Math.floor(startMinutes / 60);
  const startM = startMinutes % 60;
  const endH = Math.floor(endMinutes / 60);
  const endM = endMinutes % 60;

  return (
    <div className={`space-y-3 font-mono ${className}`}>
      {/* 2 Distinct Blocks: Start Time and End Time */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* BLOCK 1: START TIME */}
        <div className="border-2 border-white bg-black p-3 space-y-2.5">
          <div className="flex items-center justify-between border-b border-white/20 pb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 bg-white" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-white">
                [1] START TIME
              </span>
            </div>
            <span className="text-[9px] opacity-60 uppercase tracking-widest border border-white/20 px-1 py-0.2">
              End time locked
            </span>
          </div>

          {/* Stepper Dial for Start Time */}
          <div className="flex items-center justify-between gap-2 py-1">
            {/* Hour Dial */}
            <div className="flex-1 bg-white/5 border border-white/40 p-2 flex flex-col items-center">
              <span className="text-[9px] opacity-50 uppercase font-bold tracking-widest">HOUR</span>
              <div className="flex items-center gap-2 my-1">
                <button
                  type="button"
                  onClick={() => handleStartHourChange(-1)}
                  className="w-6 h-6 border border-white/40 hover:bg-white hover:text-black flex items-center justify-center text-xs font-black cursor-pointer select-none"
                  title="Previous Hour"
                >
                  ▼
                </button>
                <span className="text-xl md:text-2xl font-black tracking-widest text-white px-1">
                  {String(startH).padStart(2, '0')}
                </span>
                <button
                  type="button"
                  onClick={() => handleStartHourChange(1)}
                  className="w-6 h-6 border border-white/40 hover:bg-white hover:text-black flex items-center justify-center text-xs font-black cursor-pointer select-none"
                  title="Next Hour"
                >
                  ▲
                </button>
              </div>
            </div>

            <span className="text-xl font-black text-white/50">:</span>

            {/* Minute Dial */}
            <div className="flex-1 bg-white/5 border border-white/40 p-2 flex flex-col items-center">
              <span className="text-[9px] opacity-50 uppercase font-bold tracking-widest">MIN</span>
              <div className="flex items-center gap-2 my-1">
                <button
                  type="button"
                  onClick={() => handleStartMinuteChange(-5)}
                  className="w-6 h-6 border border-white/40 hover:bg-white hover:text-black flex items-center justify-center text-xs font-black cursor-pointer select-none"
                  title="-5 Minutes"
                >
                  ▼
                </button>
                <span className="text-xl md:text-2xl font-black tracking-widest text-white px-1">
                  {String(startM).padStart(2, '0')}
                </span>
                <button
                  type="button"
                  onClick={() => handleStartMinuteChange(5)}
                  className="w-6 h-6 border border-white/40 hover:bg-white hover:text-black flex items-center justify-center text-xs font-black cursor-pointer select-none"
                  title="+5 Minutes"
                >
                  ▲
                </button>
              </div>
            </div>

            {/* 12-Hour conversion badge */}
            <div className="text-right pl-1 min-w-[70px]">
              <div className="text-[11px] font-bold text-white tracking-wider">
                {minutesTo12HourString(startMinutes)}
              </div>
              <div className="text-[9px] opacity-50">24H: {minutesToTimeString(startMinutes)}</div>
            </div>
          </div>

          {/* Quick Preset Buttons for Start */}
          <div className="flex flex-wrap items-center gap-1 text-[10px] pt-1 border-t border-white/10">
            <span className="opacity-50 text-[9px]">PRESETS:</span>
            <button
              type="button"
              onClick={handleStartNow}
              className="border border-white/40 px-1.5 py-0.5 hover:bg-white hover:text-black cursor-pointer uppercase font-bold text-[9px]"
              title="Set to Current Time"
            >
              [NOW]
            </button>
            <button
              type="button"
              onClick={() => handleSetStartTimeDirect(7, 0)}
              className="border border-white/20 px-1.5 py-0.5 hover:bg-white hover:text-black cursor-pointer text-[9px]"
            >
              07:00
            </button>
            <button
              type="button"
              onClick={() => handleSetStartTimeDirect(9, 0)}
              className="border border-white/20 px-1.5 py-0.5 hover:bg-white hover:text-black cursor-pointer text-[9px]"
            >
              09:00
            </button>
            <button
              type="button"
              onClick={() => handleSetStartTimeDirect(14, 0)}
              className="border border-white/20 px-1.5 py-0.5 hover:bg-white hover:text-black cursor-pointer text-[9px]"
            >
              14:00
            </button>
            <button
              type="button"
              onClick={() => handleSetStartTimeDirect(18, 0)}
              className="border border-white/20 px-1.5 py-0.5 hover:bg-white hover:text-black cursor-pointer text-[9px]"
            >
              18:00
            </button>
            <button
              type="button"
              onClick={() => handleSetStartTimeDirect(20, 0)}
              className="border border-white/20 px-1.5 py-0.5 hover:bg-white hover:text-black cursor-pointer text-[9px]"
            >
              20:00
            </button>
          </div>
        </div>

        {/* BLOCK 2: END TIME */}
        <div className="border-2 border-white bg-black p-3 space-y-2.5">
          <div className="flex items-center justify-between border-b border-white/20 pb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 bg-white" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-white">
                [2] END TIME
              </span>
            </div>
            <span className="text-[9px] opacity-60 uppercase tracking-widest border border-white/20 px-1 py-0.2">
              Start time locked
            </span>
          </div>

          {/* Stepper Dial for End Time */}
          <div className="flex items-center justify-between gap-2 py-1">
            {/* Hour Dial */}
            <div className="flex-1 bg-white/5 border border-white/40 p-2 flex flex-col items-center">
              <span className="text-[9px] opacity-50 uppercase font-bold tracking-widest">HOUR</span>
              <div className="flex items-center gap-2 my-1">
                <button
                  type="button"
                  onClick={() => handleEndHourChange(-1)}
                  className="w-6 h-6 border border-white/40 hover:bg-white hover:text-black flex items-center justify-center text-xs font-black cursor-pointer select-none"
                  title="Previous Hour"
                >
                  ▼
                </button>
                <span className="text-xl md:text-2xl font-black tracking-widest text-white px-1">
                  {String(endH).padStart(2, '0')}
                </span>
                <button
                  type="button"
                  onClick={() => handleEndHourChange(1)}
                  className="w-6 h-6 border border-white/40 hover:bg-white hover:text-black flex items-center justify-center text-xs font-black cursor-pointer select-none"
                  title="Next Hour"
                >
                  ▲
                </button>
              </div>
            </div>

            <span className="text-xl font-black text-white/50">:</span>

            {/* Minute Dial */}
            <div className="flex-1 bg-white/5 border border-white/40 p-2 flex flex-col items-center">
              <span className="text-[9px] opacity-50 uppercase font-bold tracking-widest">MIN</span>
              <div className="flex items-center gap-2 my-1">
                <button
                  type="button"
                  onClick={() => handleEndMinuteChange(-5)}
                  className="w-6 h-6 border border-white/40 hover:bg-white hover:text-black flex items-center justify-center text-xs font-black cursor-pointer select-none"
                  title="-5 Minutes"
                >
                  ▼
                </button>
                <span className="text-xl md:text-2xl font-black tracking-widest text-white px-1">
                  {String(endM).padStart(2, '0')}
                </span>
                <button
                  type="button"
                  onClick={() => handleEndMinuteChange(5)}
                  className="w-6 h-6 border border-white/40 hover:bg-white hover:text-black flex items-center justify-center text-xs font-black cursor-pointer select-none"
                  title="+5 Minutes"
                >
                  ▲
                </button>
              </div>
            </div>

            {/* 12-Hour conversion badge */}
            <div className="text-right pl-1 min-w-[70px]">
              <div className="text-[11px] font-bold text-white tracking-wider">
                {minutesTo12HourString(endMinutes)}
              </div>
              <div className="text-[9px] opacity-50">24H: {minutesToTimeString(endMinutes)}</div>
            </div>
          </div>

          {/* Quick Nudge Buttons for End */}
          <div className="flex flex-wrap items-center gap-1 text-[10px] pt-1 border-t border-white/10">
            <span className="opacity-50 text-[9px]">NUDGE:</span>
            <button
              type="button"
              onClick={() => handleEndMinuteChange(15)}
              className="border border-white/30 px-1.5 py-0.5 hover:bg-white hover:text-black cursor-pointer text-[9px]"
              title="Add 15 mins to end"
            >
              +15m
            </button>
            <button
              type="button"
              onClick={() => handleEndMinuteChange(30)}
              className="border border-white/30 px-1.5 py-0.5 hover:bg-white hover:text-black cursor-pointer text-[9px]"
              title="Add 30 mins to end"
            >
              +30m
            </button>
            <button
              type="button"
              onClick={() => handleEndHourChange(1)}
              className="border border-white/30 px-1.5 py-0.5 hover:bg-white hover:text-black cursor-pointer text-[9px]"
              title="Add 1 hour to end"
            >
              +1h
            </button>
            <button
              type="button"
              onClick={() => handleSetEndTimeDirect(21, 0)}
              className="border border-white/20 px-1.5 py-0.5 hover:bg-white hover:text-black cursor-pointer text-[9px]"
            >
              21:00
            </button>
            <button
              type="button"
              onClick={() => handleSetEndTimeDirect(22, 0)}
              className="border border-white/20 px-1.5 py-0.5 hover:bg-white hover:text-black cursor-pointer text-[9px]"
            >
              22:00
            </button>
          </div>
        </div>
      </div>

      {/* BLOCK 3: PLANNED ESTIMATE (DURATION) */}
      <div className="border border-white/60 bg-white/5 p-3 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              [3] PLANNED ESTIMATE (DURATION):
            </span>
            <span className="bg-white text-black px-2 py-0.5 text-xs font-black tracking-wider">
              {currentDuration} MINS ({formatDurationHuman(currentDuration)})
            </span>
          </div>
          <div className="text-[10px] opacity-70">
            Start at <span className="font-bold text-white">{minutesToTimeString(startMinutes)}</span> → End shifts to <span className="font-bold text-white">{minutesToTimeString(endMinutes)}</span>
          </div>
        </div>

        {/* Duration Quick Adjust Bar */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[9px] opacity-50 uppercase font-bold mr-1">PRESET DURATION:</span>
          {[
            { label: '25m', val: 25 },
            { label: '30m', val: 30 },
            { label: '45m', val: 45 },
            { label: '60m (1h)', val: 60 },
            { label: '90m (1.5h)', val: 90 },
            { label: '120m (2h)', val: 120 },
            { label: '180m (3h)', val: 180 },
          ].map((item) => {
            const isSelected = currentDuration === item.val;
            return (
              <button
                key={item.val}
                type="button"
                onClick={() => handleEstimateChange(item.val)}
                className={`px-2 py-0.5 text-[10px] border transition-none cursor-pointer uppercase font-bold ${
                  isSelected
                    ? 'border-white bg-white text-black'
                    : 'border-white/40 bg-black text-white hover:border-white hover:bg-white/20'
                }`}
              >
                {item.label}
              </button>
            );
          })}

          <div className="flex items-center gap-1 ml-auto">
            <button
              type="button"
              onClick={() => handleEstimateDelta(-15)}
              className="border border-white/40 px-1.5 py-0.5 text-[10px] hover:bg-white hover:text-black cursor-pointer font-bold"
              title="Decrease duration by 15 mins"
            >
              -15m
            </button>
            <button
              type="button"
              onClick={() => handleEstimateDelta(15)}
              className="border border-white/40 px-1.5 py-0.5 text-[10px] hover:bg-white hover:text-black cursor-pointer font-bold"
              title="Increase duration by 15 mins"
            >
              +15m
            </button>
          </div>
        </div>
      </div>

      {/* Sync Status Banner */}
      <div className="border border-white/20 px-3 py-1.5 bg-black flex flex-wrap items-center justify-between text-[10px] opacity-80 gap-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white">SYNCED TIME SLOT:</span>
          <span className="font-black text-white bg-white/10 px-1.5 py-0.5 border border-white/30">
            {minutesToTimeString(startMinutes)} – {minutesToTimeString(endMinutes)}
          </span>
          <span className="opacity-60">({minutesTo12HourString(startMinutes)} to {minutesTo12HourString(endMinutes)})</span>
        </div>
        <div className="opacity-60 text-[9px] uppercase tracking-wider">
          ⇅ Bidirectional Anchor Synchronized
        </div>
      </div>
    </div>
  );
}
