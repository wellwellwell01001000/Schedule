import React from 'react';
import { parseSingleNoticeTime, minutesTo12HourString } from '../utils/timePickerUtils';

interface NoticeTimePickerProps {
  time: string;
  onChange: (formattedTime: string) => void;
}

export function NoticeTimePicker({ time, onChange }: NoticeTimePickerProps) {
  const { hour, minute, formatted } = parseSingleNoticeTime(time);

  const pad = (n: number) => String(n).padStart(2, '0');

  const updateTime = (newH: number, newM: number) => {
    const safeH = Math.max(0, Math.min(23, isNaN(newH) ? 0 : newH));
    const safeM = Math.max(0, Math.min(59, isNaN(newM) ? 0 : newM));
    onChange(`${pad(safeH)}:${pad(safeM)}`);
  };

  const handleHourChange = (newH: number) => {
    updateTime(newH, minute);
  };

  const handleMinuteChange = (newM: number) => {
    updateTime(hour, newM);
  };

  const handleNow = () => {
    const now = new Date();
    const m = Math.round(now.getMinutes() / 5) * 5;
    const roundedM = m >= 60 ? 55 : m;
    updateTime(now.getHours(), roundedM);
  };

  const handleNudge = (deltaMinutes: number) => {
    const currentMins = hour * 60 + minute;
    const newMins = (currentMins + deltaMinutes + 1440) % 1440;
    const newH = Math.floor(newMins / 60);
    const newM = newMins % 60;
    updateTime(newH, newM);
  };

  const totalMinutes = hour * 60 + minute;
  const ampmDisplay = minutesTo12HourString(totalMinutes);

  return (
    <div className="border border-white/60 bg-black p-3 space-y-2 font-mono text-white text-xs">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold uppercase tracking-wider opacity-70">
          MILESTONE / NOTICE TIME (24-HOUR):
        </label>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleNow}
            className="border border-white/50 px-2 py-0.5 text-[9px] font-bold uppercase hover:bg-white hover:text-black cursor-pointer transition-none"
            title="Set to Current Time"
          >
            [NOW]
          </button>
          <button
            type="button"
            onClick={() => handleNudge(-60)}
            className="border border-white/30 px-1.5 py-0.5 text-[9px] hover:bg-white hover:text-black cursor-pointer"
            title="Minus 1 Hour"
          >
            -1h
          </button>
          <button
            type="button"
            onClick={() => handleNudge(60)}
            className="border border-white/30 px-1.5 py-0.5 text-[9px] hover:bg-white hover:text-black cursor-pointer"
            title="Plus 1 Hour"
          >
            +1h
          </button>
          <button
            type="button"
            onClick={() => handleNudge(-15)}
            className="border border-white/30 px-1.5 py-0.5 text-[9px] hover:bg-white hover:text-black cursor-pointer"
            title="Minus 15 Minutes"
          >
            -15m
          </button>
          <button
            type="button"
            onClick={() => handleNudge(15)}
            className="border border-white/30 px-1.5 py-0.5 text-[9px] hover:bg-white hover:text-black cursor-pointer"
            title="Plus 15 Minutes"
          >
            +15m
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/5 p-2.5 border border-white/20">
        {/* Interactive Hour : Minute block */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white/10 border border-white/40 px-2 py-1">
            <input
              type="number"
              min={0}
              max={23}
              inputMode="numeric"
              value={pad(hour)}
              onChange={(e) => handleHourChange(parseInt(e.target.value, 10))}
              onFocus={(e) => e.target.select()}
              className="w-10 bg-transparent text-center text-lg font-black text-white focus:outline-none focus:bg-white/20 font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              title="Start Hour (00-23)"
            />
            <span className="text-lg font-black text-white/70 select-none px-1">:</span>
            <input
              type="number"
              min={0}
              max={59}
              step={5}
              inputMode="numeric"
              value={pad(minute)}
              onChange={(e) => handleMinuteChange(parseInt(e.target.value, 10))}
              onFocus={(e) => e.target.select()}
              className="w-10 bg-transparent text-center text-lg font-black text-white focus:outline-none focus:bg-white/20 font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              title="Start Minute (00-59)"
            />
          </div>

          <div className="text-[11px] font-bold text-white/80">
            <span className="font-mono">{formatted}</span>{' '}
            <span className="text-[10px] text-white/50">({ampmDisplay})</span>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[9px] opacity-60 uppercase mr-1">PRESETS:</span>
          {['09:00', '12:00', '14:00', '17:00', '20:00'].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onChange(preset)}
              className={`px-1.5 py-0.5 text-[10px] font-bold border transition-none cursor-pointer ${
                formatted === preset
                  ? 'border-white bg-white text-black'
                  : 'border-white/30 text-white/70 hover:border-white hover:text-white'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
