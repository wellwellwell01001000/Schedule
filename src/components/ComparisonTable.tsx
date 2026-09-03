import { useState } from 'react';
import { METRIC_COMPARISONS } from '../data/scheduleData';

export function ComparisonTable() {
  const [copiedAscii, setCopiedAscii] = useState(false);

  const rawAsciiTable = `+---------------------+---------------------------------------+------------------------------------------+-------------+
| Metric              | Daily Micro-Dosing (All-in-One)       | Alternating / Day-Themed Model           | Winner      |
+---------------------+---------------------------------------+------------------------------------------+-------------+
| Flow State Depth    | Shallow (30-45 min cuts you off early)| Deep (75-90 min allows complex solution) | Alternating |
| Context Switching   | High (5-6 different mental modes/day) | Low (Only 2 primary focuses per day)     | Alternating |
| Schedule Elasticity | Fragile (College delays break routine)| Flexible (Buffer time absorbs delays)    | Alternating |
| CNS Recovery        | Low (Fatigue from 6-7d early workouts)| High (4 workout days + rest days energy) | Alternating |
+---------------------+---------------------------------------+------------------------------------------+-------------+`;

  const handleCopy = () => {
    navigator.clipboard.writeText(rawAsciiTable).then(() => {
      setCopiedAscii(true);
      setTimeout(() => setCopiedAscii(false), 2500);
    });
  };

  return (
    <div className="space-y-6 font-mono text-white">
      {/* Title block */}
      <div className="border border-white bg-black">
        <div className="bg-white text-black text-xs px-4 py-1 font-bold flex items-center justify-between">
          <span>_MODEL_BENCHMARK_ANALYSIS</span>
          <span className="text-[10px] uppercase tracking-widest opacity-80">ALL-IN-ONE vs ALTERNATING</span>
        </div>
        <div className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white uppercase tracking-tight">
              Attention Residue, Cognitive Load, and Schedule Fragility
            </h2>
            <p className="text-xs opacity-60 mt-0.5">
              Empirical breakdown of why the alternating schedule prevents academic burnout.
            </p>
          </div>
          <button
            onClick={handleCopy}
            className="border border-white bg-black px-3 py-1 text-xs text-white hover:bg-white hover:text-black transition-none cursor-pointer font-bold uppercase tracking-wider"
          >
            {copiedAscii ? '[COPIED ASCII TABLE]' : '[COPY ASCII TABLE]'}
          </button>
        </div>
      </div>

      {/* Structured monochrome cards */}
      <div className="border border-white bg-black divide-y divide-white/20">
        <div className="bg-white text-black text-sm px-4 py-1 font-bold">
          _METRIC_EVALUATION_MATRIX
        </div>

        {METRIC_COMPARISONS.map((row, idx) => (
          <div key={row.metric} className="p-4 md:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/20 pb-2">
              <span className="text-sm font-bold text-white uppercase tracking-tight">
                [{idx + 1}] {row.metric}
              </span>
              <span className="bg-white text-black font-bold text-xs px-2 py-0.5 uppercase tracking-wide">
                WINNER: {row.winner.toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="border border-white/30 p-3.5 space-y-1 bg-black">
                <span className="text-[10px] font-bold opacity-60 uppercase tracking-wider">
                  [X] DAILY MICRO-DOSING (ALL-IN-ONE)
                </span>
                <p className="opacity-70 leading-relaxed">{row.allInOne}</p>
              </div>

              <div className="border border-white p-3.5 space-y-1 bg-white/5">
                <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                  [✓] ALTERNATING / DAY-THEMED MODEL
                </span>
                <p className="text-white leading-relaxed font-bold">{row.alternating}</p>
              </div>
            </div>

            <div className="text-xs pl-3 border-l-2 border-white opacity-80 leading-relaxed">
              <span className="bg-white text-black px-1 font-bold mr-2 text-[11px]">RATIONALE:</span>
              <span>{row.why}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Raw ASCII Terminal Table representation */}
      <div className="border border-white bg-black">
        <div className="bg-white text-black text-xs px-4 py-1 font-bold flex items-center justify-between">
          <span>_RAW_ASCII_TABLE_OUTPUT</span>
          <span className="text-[10px] opacity-75">SELECT_ALL</span>
        </div>
        <div className="p-4">
          <pre className="border border-white/30 bg-black p-4 text-[11px] md:text-xs text-white overflow-x-auto select-all leading-relaxed font-mono">
            {rawAsciiTable}
          </pre>
        </div>
      </div>
    </div>
  );
}
