import React, { useState, useEffect } from 'react';
import {
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
  const initial = parseTimeSlot(timeSlot, durationMinutes);
  const [startMinutes, setStartMinutes] = useState<number>(initial.startMinutes);
  const [endMinutes, setEndMinutes] = useState<number>(initial.endMinutes);
  const [currentDuration, setCurrentDuration] = useState<number>(
    durationMinutes > 0 ? durationMinutes : initial.durationMinutes
  );

  useEffect(() => {
    const parsed = parseTimeSlot(timeSlot, durationMinutes);
    setStartMinutes(parsed.startMinutes);
    setEndMinutes(parsed.endMinutes);
    setCurrentDuration(durationMinutes > 0 ? durationMinutes : parsed.durationMinutes);
  }, [timeSlot, durationMinutes]);

  const emitChange = (newStart: number, newEnd: number, newDur: number) => {
    setStartMinutes(newStart);
    setEndMinutes(newEnd);
    setCurrentDuration(newDur);
    onChange(formatTimeSlot(newStart, newEnd), newDur);
  };

  const startHour = Math.floor(startMinutes / 60);
  const startMin = startMinutes % 60;
  const endHour = Math.floor(endMinutes / 60);
  const endMin = endMinutes % 60;

  const handleStartHourChange = (newH: number) => {
    const safeH = Math.max(0, Math.min(23, isNaN(newH) ? 0 : newH));
    const newStart = safeH * 60 + startMin;
    const updated = updateStartTime(newStart, endMinutes, currentDuration);
    emitChange(updated.startMinutes, updated.endMinutes, updated.durationMinutes);
  };

  const handleStartMinChange = (newM: number) => {
    const safeM = Math.max(0, Math.min(59, isNaN(newM) ? 0 : newM));
    const newStart = startHour * 60 + safeM;
    const updated = updateStartTime(newStart, endMinutes, currentDuration);
    emitChange(updated.startMinutes, updated.endMinutes, updated.durationMinutes);
  };

  const handleStartNow = () => {
    const now = new Date();
    const m = Math.round(now.getMinutes() / 5) * 5;
    const newStart = ((now.getHours() * 60 + m) % 1440 + 1440) % 1440;
    const updated = updateStartTime(newStart, endMinutes, currentDuration);
    emitChange(updated.startMinutes, updated.endMinutes, updated.durationMinutes);
  };

  const handleEndHourChange = (newH: number) => {
    const safeH = Math.max(0, Math.min(23, isNaN(newH) ? 0 : newH));
    const newEnd = safeH * 60 + endMin;
    const updated = updateEndTime(startMinutes, newEnd, currentDuration);
    emitChange(updated.startMinutes, updated.endMinutes, updated.durationMinutes);
  };

  const handleEndMinChange = (newM: number) => {
    const safeM = Math.max(0, Math.min(59, isNaN(newM) ? 0 : newM));
    const newEnd = endHour * 60 + safeM;
    const updated = updateEndTime(startMinutes, newEnd, currentDuration);
    emitChange(updated.startMinutes, updated.endMinutes, updated.durationMinutes);
  };

  const handleEndNudge = (deltaMinutes: number) => {
    const newEnd = (endMinutes + deltaMinutes + 1440) % 1440;
    const updated = updateEndTime(startMinutes, newEnd, currentDuration);
    emitChange(updated.startMinutes, updated.endMinutes, updated.durationMinutes);
  };

  const handleEstimateChange = (newMinutes: number) => {
    const safeMins = Math.max(5, Math.min(1440, newMinutes));
    const updated = updateEstimateDuration(startMinutes, safeMins);
    emitChange(updated.startMinutes, updated.endMinutes, updated.durationMinutes);
  };

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className={`space-y-2 font-mono ${className}`}>
      {/* 24-Hour Start & End Blocks */}
      <div className="grid grid-cols-2 gap-2">
        {/* START TIME (24-HOUR) */}
        <div className="border border-white/60 bg-black p-2 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white">
              START TIME (24H)
            </span>
            <button
              type="button"
              onClick={handleStartNow}
              className="border border-white/40 px-1.5 py-0.5 text-[9px] hover:bg-white hover:text-black cursor-pointer uppercase font-bold"
              title="Set to Current Time"
            >
              [NOW]
            </button>
          </div>

          <div className="flex items-center justify-center gap-1 bg-white/10 border border-white/30 py-1.5 px-2">
            <input
              type="number"
              min={0}
              max={23}
              inputMode="numeric"
              value={pad(startHour)}
              onChange={(e) => handleStartHourChange(parseInt(e.target.value, 10))}
              onFocus={(e) => e.target.select()}
              className="w-10 bg-transparent text-center text-lg font-black text-white focus:outline-none focus:bg-white/20 font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              title="Start Hour (00-23)"
            />
            <span className="text-lg font-black text-white/70 select-none">:</span>
            <input
              type="number"
              min={0}
              max={59}
              step={5}
              inputMode="numeric"
              value={pad(startMin)}
              onChange={(e) => handleStartMinChange(parseInt(e.target.value, 10))}
              onFocus={(e) => e.target.select()}
              className="w-10 bg-transparent text-center text-lg font-black text-white focus:outline-none focus:bg-white/20 font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              title="Start Minute (00-59)"
            />
            <span className="text-[10px] text-white/40 font-bold ml-1 uppercase">HRS</span>
          </div>
        </div>

        {/* END TIME (24-HOUR) */}
        <div className="border border-white/60 bg-black p-2 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white">
              END TIME (24H)
            </span>
            <button
              type="button"
              onClick={() => handleEndNudge(30)}
              className="border border-white/40 px-1.5 py-0.5 text-[9px] hover:bg-white hover:text-black cursor-pointer font-bold"
              title="Add 30m to End Time"
            >
              +30m
            </button>
          </div>

          <div className="flex items-center justify-center gap-1 bg-white/10 border border-white/30 py-1.5 px-2">
            <input
              type="number"
              min={0}
              max={23}
              inputMode="numeric"
              value={pad(endHour)}
              onChange={(e) => handleEndHourChange(parseInt(e.target.value, 10))}
              onFocus={(e) => e.target.select()}
              className="w-10 bg-transparent text-center text-lg font-black text-white focus:outline-none focus:bg-white/20 font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              title="End Hour (00-23)"
            />
            <span className="text-lg font-black text-white/70 select-none">:</span>
            <input
              type="number"
              min={0}
              max={59}
              step={5}
              inputMode="numeric"
              value={pad(endMin)}
              onChange={(e) => handleEndMinChange(parseInt(e.target.value, 10))}
              onFocus={(e) => e.target.select()}
              className="w-10 bg-transparent text-center text-lg font-black text-white focus:outline-none focus:bg-white/20 font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              title="End Minute (00-59)"
            />
            <span className="text-[10px] text-white/40 font-bold ml-1 uppercase">HRS</span>
          </div>
        </div>
      </div>

      {/* COMPACT PLANNED ESTIMATE (DURATION) */}
      <div className="border border-white/40 bg-white/5 p-2 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-white uppercase tracking-wider">
              ESTIMATE:
            </span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={5}
                max={1440}
                value={currentDuration || ''}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val > 0) handleEstimateChange(val);
                }}
                className="w-16 bg-white/10 border border-white/40 text-white font-mono text-xs font-black px-1.5 py-0.5 text-center focus:outline-none focus:border-white focus:bg-white/20"
                title="Type minutes directly"
              />
              <span className="text-[10px] text-white/70 font-mono font-bold">m</span>
              <span className="text-[10px] text-white/50 font-mono">({formatDurationHuman(currentDuration)})</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleEstimateChange(currentDuration - 15)}
              className="border border-white/40 px-1.5 py-0.5 text-[9px] hover:bg-white hover:text-black cursor-pointer font-bold"
              title="-15 mins"
            >
              -15m
            </button>
            <button
              type="button"
              onClick={() => handleEstimateChange(currentDuration + 15)}
              className="border border-white/40 px-1.5 py-0.5 text-[9px] hover:bg-white hover:text-black cursor-pointer font-bold"
              title="+15 mins"
            >
              +15m
            </button>
          </div>
        </div>

        {/* Quick presets row */}
        <div className="flex flex-wrap items-center gap-1">
          {[
            { label: '25m', val: 25 },
            { label: '30m', val: 30 },
            { label: '45m', val: 45 },
            { label: '60m', val: 60 },
            { label: '90m', val: 90 },
            { label: '120m', val: 120 },
            { label: '180m', val: 180 },
          ].map((item) => {
            const isSelected = currentDuration === item.val;
            return (
              <button
                key={item.val}
                type="button"
                onClick={() => handleEstimateChange(item.val)}
                className={`px-1.5 py-0.5 text-[9px] border transition-none cursor-pointer uppercase font-bold ${
                  isSelected
                    ? 'border-white bg-white text-black'
                    : 'border-white/30 bg-black text-white hover:border-white hover:bg-white/20'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
