import { WEEKLY_HOURS_SUMMARY } from '../data/scheduleData';
import { generateAsciiProgressBar } from '../utils/ascii';

export function HoursSummaryView() {
  const maxGoalHours = 8; // benchmark scale

  return (
    <div className="space-y-6 font-mono text-white">
      {/* Banner */}
      <div className="border border-white bg-black">
        <div className="bg-white text-black text-xs px-4 py-1 font-bold flex items-center justify-between">
          <span>_WEEKLY_OUTPUT_AUDIT</span>
          <span className="text-[10px] uppercase tracking-widest opacity-80">AGGREGATE_HOURS</span>
        </div>
        <div className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white uppercase tracking-tight">
              Weekly Allocation &amp; Volume Metrics
            </h2>
            <p className="text-xs opacity-60 mt-0.5">
              With the alternating model, weekly output is deep and focused without cognitive fragmentation.
            </p>
          </div>
          <div className="border border-white bg-white text-black font-bold px-3 py-1 text-sm tracking-tight">
            TOTAL: ~23.5 HOURS / WK
          </div>
        </div>
      </div>

      {/* Summary rows */}
      <div className="border border-white bg-black divide-y divide-white/20">
        <div className="bg-white text-black text-sm px-4 py-1 font-bold">
          _SUBJECT_BREAKDOWN
        </div>

        {WEEKLY_HOURS_SUMMARY.map((item, idx) => {
          let estimatedHours = 3;
          if (item.subject.includes('Machine Learning')) estimatedHours = 6;
          if (item.subject.includes('Cybersecurity')) estimatedHours = 4.5;
          if (item.subject.includes('Game Development')) estimatedHours = 3;
          if (item.subject.includes('Guitar')) estimatedHours = 3;
          if (item.subject.includes('Workouts')) estimatedHours = 4;
          if (item.subject.includes('Gaming')) estimatedHours = 5;

          const bar = generateAsciiProgressBar(estimatedHours, maxGoalHours, 18, 'blocks');

          return (
            <div key={item.subject} className="p-4 md:p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="opacity-60 text-xs font-bold">[{idx + 1}]</span>
                  <span className="text-sm font-bold text-white uppercase tracking-tight">{item.subject}</span>
                </div>
                <div className="bg-white text-black font-bold text-xs px-2.5 py-0.5">
                  {item.hours}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                <div className="opacity-80">
                  <span className="opacity-50 uppercase text-[10px] tracking-wider block">Schedule Allocation:</span>
                  <span>{item.schedule}</span>
                </div>
                <div className="opacity-80">
                  <span className="opacity-50 uppercase text-[10px] tracking-wider block">Neuroplasticity Strategy:</span>
                  <span>{item.note}</span>
                </div>
              </div>

              <div className="border border-white/20 bg-black p-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="opacity-50 mr-2 text-[10px] tracking-wider">RELATIVE VOLUME METER:</span>
                  <span className="text-white font-bold">{bar}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Synthesis Box */}
      <div className="border border-white p-5 space-y-3 bg-black">
        <div className="text-xs">
          <span className="bg-white text-black px-1.5 py-0.5 font-bold mr-2 text-xs">
            ARCHITECTURAL_CONCLUSION:
          </span>
          <span className="font-bold text-white">3RD-YEAR CS RIGOROUS BALANCING</span>
        </div>
        <p className="text-xs opacity-75 leading-relaxed">
          Daily micro-dosing forces high cognitive penalty: loading a heavy ML codebase or setting up a Linux penetration testing VM takes 15 minutes alone. If you only have 30 minutes, 50% of the session is wasted in friction.
        </p>
        <p className="text-xs opacity-75 leading-relaxed">
          The alternating model gives you <span className="text-white font-bold bg-white/10 px-1">70–90 unbroken minutes</span>, granting real flow state while preserving workout recovery and guilt-free leisure.
        </p>
      </div>
    </div>
  );
}
