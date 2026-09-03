import { useState } from 'react';
import { RAW_README_TEXT } from '../data/scheduleData';

export function BlueprintView() {
  const [copied, setCopied] = useState(false);

  const handleCopyRaw = () => {
    navigator.clipboard.writeText(RAW_README_TEXT).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="space-y-6 font-mono text-white">
      {/* Top action bar */}
      <div className="border border-white bg-black">
        <div className="bg-white text-black text-xs px-4 py-1 font-bold flex items-center justify-between">
          <span>_DOCUMENT_BROWSER // README.md</span>
          <span className="text-[10px] uppercase tracking-widest opacity-80">SYS_SPECIFICATION</span>
        </div>
        <div className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs opacity-70">
            RAW ARCHITECTURAL SPECIFICATION FOR 3RD-YEAR CS PRODUCTIVITY
          </div>
          <button
            onClick={handleCopyRaw}
            className="border border-white bg-black px-3 py-1 text-xs text-white hover:bg-white hover:text-black transition-none cursor-pointer font-bold uppercase tracking-wider"
          >
            {copied ? '[COPIED TO CLIPBOARD]' : '[COPY RAW MARKDOWN]'}
          </button>
        </div>
      </div>

      {/* Editorial Document Container */}
      <div className="border border-white bg-black">
        <div className="bg-white text-black text-sm px-4 py-1 font-bold">
          _SPECIFICATION_BODY
        </div>

        <div className="p-6 md:p-8 space-y-8 text-sm leading-relaxed">
          {/* Document Title Header */}
          <div className="border-b border-white pb-4 space-y-1">
            <div className="text-[10px] opacity-60 uppercase tracking-widest">
              DOC_ID: ALT_SYS_01 // DISCIPLINE: 3RD_YEAR_CS
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tighter text-white">
              The Alternating (Day-Themed) Model for Maximum Productivity
            </h1>
            <p className="text-xs opacity-70 pt-1">
              Engineered to eliminate schedule friction and cognitive attention residue.
            </p>
          </div>

          {/* Blockquote callout in editorial style */}
          <div className="border border-white p-5 space-y-2 bg-black">
            <div className="text-xs">
              <span className="bg-white text-black px-1 font-bold mr-2">CORE_THESIS:</span>
              <span className="font-bold text-white">
                "Trying to do everything every single day—even in small 30-minute slivers—creates high schedule friction and attention residue."
              </span>
            </div>
            <p className="text-xs opacity-70 pt-1 leading-relaxed">
              When your schedule is packed to the minute, a single delayed college bus or tiring lecture causes the whole daily routine to collapse, creating guilt and cognitive fatigue.
            </p>
          </div>

          {/* Section 1: Comparison Table */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-white/40 pb-2">
              <h2 className="text-base font-bold text-white uppercase tracking-tight">
                ## Why Alternating Days Beats the "All-in-One" Routine
              </h2>
            </div>

            <div className="overflow-x-auto border border-white">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white bg-white text-black font-bold">
                    <th className="p-3 border-r border-black font-bold">Metric</th>
                    <th className="p-3 border-r border-black font-bold">Daily Micro-Dosing (All-in-One)</th>
                    <th className="p-3 border-r border-black font-bold">Alternating / Day-Themed Model</th>
                    <th className="p-3 font-bold">Winner</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/20">
                  <tr>
                    <td className="p-3 border-r border-white/20 font-bold text-white">Flow State Depth</td>
                    <td className="p-3 border-r border-white/20 opacity-60">Shallow (30–45 min cuts you off just as you get into the zone)</td>
                    <td className="p-3 border-r border-white/20 text-white">Deep (75–90 min allows complex problem-solving)</td>
                    <td className="p-3 font-bold bg-white text-black">[ALTERNATING]</td>
                  </tr>
                  <tr>
                    <td className="p-3 border-r border-white/20 font-bold text-white">Context Switching</td>
                    <td className="p-3 border-r border-white/20 opacity-60">High (5–6 different mental modes per day)</td>
                    <td className="p-3 border-r border-white/20 text-white">Low (Only 2 primary focuses per day)</td>
                    <td className="p-3 font-bold bg-white text-black">[ALTERNATING]</td>
                  </tr>
                  <tr>
                    <td className="p-3 border-r border-white/20 font-bold text-white">Schedule Elasticity</td>
                    <td className="p-3 border-r border-white/20 opacity-60">Fragile (If college runs late, everything breaks)</td>
                    <td className="p-3 border-r border-white/20 text-white">Flexible (Built-in buffer time for assignments/rest)</td>
                    <td className="p-3 font-bold bg-white text-black">[ALTERNATING]</td>
                  </tr>
                  <tr>
                    <td className="p-3 border-r border-white/20 font-bold text-white">CNS Recovery</td>
                    <td className="p-3 border-r border-white/20 opacity-60">Low (Working out 6–7 days early morning causes fatigue)</td>
                    <td className="p-3 border-r border-white/20 text-white">High (4 workout days + rest days optimizes energy)</td>
                    <td className="p-3 font-bold bg-white text-black">[ALTERNATING]</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 2: The Optimized Blueprint ASCII diagram */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-white/40 pb-2">
              <h2 className="text-base font-bold text-white uppercase tracking-tight">
                ## The Optimized "Alternating / Maximum Productivity" Blueprint
              </h2>
            </div>

            <p className="text-xs opacity-70">
              Instead of micro-dosing all 6 activities daily, we group them into A-Days (Creative &amp; Motor) and B-Days (Technical &amp; Problem Solving).
            </p>

            <pre className="border border-white bg-black p-4 text-xs md:text-sm text-white overflow-x-auto leading-tight font-mono select-all">
{`WEEKDAY SYSTEM
┌───────────────────────────┐   ┌───────────────────────────┐
│   A-DAYS (Mon / Wed / Fri)│   │   B-DAYS (Tue / Thu)      │
│  • Morning: Workout + ML  │   │  • Morning: Workout + ML  │
│  • Evening: Guitar + Chill│   │  • Evening: Cybersecurity │
└───────────────────────────┘   └───────────────────────────┘`}
            </pre>
          </section>

          {/* Section 3: Morning Anchor */}
          <section className="space-y-3">
            <h3 className="text-sm md:text-base font-bold text-white uppercase tracking-tight">
              ### 1. Weekday Morning Anchor (Mon–Fri)
            </h3>
            <p className="text-xs opacity-70 italic">
              Keep your mornings consistent because your early-bird brain is at peak analytical power.
            </p>

            <div className="border border-white divide-y divide-white/20 text-xs">
              <div className="p-3 flex flex-col sm:flex-row gap-2">
                <span className="bg-white text-black font-bold px-1.5 py-0.5 w-32 shrink-0 text-center">
                  05:30 – 06:30
                </span>
                <span className="opacity-90">Workout (Mon, Tue, Thu, Fri = 4-day Upper/Lower or Push/Pull split. Wednesday is active rest/stretch to prevent central nervous system burnout).</span>
              </div>
              <div className="p-3 flex flex-col sm:flex-row gap-2">
                <span className="border border-white/40 font-bold px-1.5 py-0.5 w-32 shrink-0 text-center">
                  06:30 – 07:00
                </span>
                <span className="opacity-90">Shower &amp; Breakfast.</span>
              </div>
              <div className="p-3 flex flex-col sm:flex-row gap-2 bg-white/5">
                <span className="bg-white text-black font-bold px-1.5 py-0.5 w-32 shrink-0 text-center">
                  07:00 – 08:10
                </span>
                <div>
                  <span className="font-bold text-white">(70 mins): DEEP WORK — Machine Learning.</span>
                  <p className="opacity-70 text-[11px] mt-1">
                    Why this works: 70 uninterrupted minutes 5 days a week = almost 6 hours of high-focus ML weekly, completed before you even step onto your 08:20 bus.
                  </p>
                </div>
              </div>
              <div className="p-3 flex flex-col sm:flex-row gap-2 opacity-60">
                <span className="border border-white/30 font-bold px-1.5 py-0.5 w-32 shrink-0 text-center">
                  08:20 – 18:30
                </span>
                <span>Bus arrives → College until 18:00 / 18:30.</span>
              </div>
            </div>
          </section>

          {/* Section 4: Alternating Weekday Evenings */}
          <section className="space-y-4">
            <h3 className="text-sm md:text-base font-bold text-white uppercase tracking-tight">
              ### 2. Alternating Weekday Evenings (18:30 – 22:00)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* A-Day Column */}
              <div className="border border-white p-4 space-y-3">
                <div className="border-b border-white/30 pb-2">
                  <span className="bg-white text-black font-bold text-xs px-2 py-0.5 uppercase">
                    A-DAYS: MON / WED / FRI
                  </span>
                  <div className="text-[11px] opacity-70 mt-1">Creative &amp; Motor Circuits</div>
                </div>
                <p className="text-xs opacity-70">
                  Your brain is tired from college math/coding, so you engage motor and leisure circuits:
                </p>
                <ul className="text-xs space-y-2 list-none">
                  <li><span className="font-bold text-white">18:30 – 19:15:</span> Commute back, tea/snack, complete screen disconnect.</li>
                  <li><span className="font-bold text-white">19:15 – 20:00 (45m):</span> Guitar Deep Practice (focused 45m 3x/wk beats rushed 20m daily).</li>
                  <li><span className="font-bold text-white">20:00 – 20:45:</span> Dinner.</li>
                  <li><span className="font-bold text-white">20:45 – 21:45 (60m):</span> Gaming (Guilt-Free).</li>
                  <li><span className="font-bold text-white">21:45 – 22:00:</span> Wind down → Sleep at 22:00.</li>
                </ul>
              </div>

              {/* B-Day Column */}
              <div className="border border-white p-4 space-y-3">
                <div className="border-b border-white/30 pb-2">
                  <span className="bg-white text-black font-bold text-xs px-2 py-0.5 uppercase">
                    B-DAYS: TUE / THU
                  </span>
                  <div className="text-[11px] opacity-70 mt-1">Technical &amp; Problem Solving</div>
                </div>
                <p className="text-xs opacity-70">
                  No guitar, no forced gaming. You have one clear evening goal:
                </p>
                <ul className="text-xs space-y-2 list-none">
                  <li><span className="font-bold text-white">18:30 – 19:30:</span> Commute back, dinner, unwind.</li>
                  <li><span className="font-bold text-white">19:30 – 21:00 (90m):</span> Cybersecurity Lab / College Projects. (TryHackMe, OverTheWire, Linux feel like interactive puzzles).</li>
                  <li><span className="font-bold text-white">21:00 – 21:45:</span> Free time / casual YouTube / talk with friends.</li>
                  <li><span className="font-bold text-white">22:00:</span> Sleep.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 5: Weekends */}
          <section className="space-y-4">
            <h3 className="text-sm md:text-base font-bold text-white uppercase tracking-tight">
              ### 3. Weekends: Deep Immersion (Game Dev &amp; Passion)
            </h3>
            <p className="text-xs opacity-70">
              Weekends give you open cognitive space where you don't have to look at the clock every 30 minutes.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="border border-white p-4 space-y-2">
                <div className="font-bold text-white uppercase border-b border-white/30 pb-1 flex items-center justify-between">
                  <span>SATURDAY: THE DUAL-SKILL SPRINT</span>
                  <span className="text-[10px] opacity-60">[CYBERSECURITY]</span>
                </div>
                <p><span className="font-bold text-white">Morning (09:00 – 11:30):</span> Cybersecurity Deep Dive (CTF challenges, vulnerable VM exploitation, API security).</p>
                <p className="opacity-70"><span className="font-bold text-white">Afternoon / Evening:</span> Complete freedom—hang out with friends, go out, or have an extended Gaming session.</p>
              </div>

              <div className="border border-white p-4 space-y-2">
                <div className="font-bold text-white uppercase border-b border-white/30 pb-1 flex items-center justify-between">
                  <span>SUNDAY: GAME DEV STUDIO</span>
                  <span className="text-[10px] opacity-60">[GODOT / UNITY]</span>
                </div>
                <p><span className="font-bold text-white">Morning (09:30 – 12:30):</span> Game Development Sprint (3 uninterrupted hours building game mechanics in Godot/Unity or writing shaders/AI logic).</p>
                <p className="opacity-70"><span className="font-bold text-white">Afternoon:</span> Free guitar jam / songwriting session (no rules, just play).</p>
                <p className="opacity-70"><span className="font-bold text-white">Evening:</span> Plan upcoming week, light review, early sleep.</p>
              </div>
            </div>
          </section>

          {/* Section 6: Summary of Weekly Hours */}
          <section className="space-y-3 border-t border-white pt-4">
            <h3 className="text-sm md:text-base font-bold text-white uppercase tracking-tight">
              ## Summary of Weekly Hours Achieved
            </h3>
            <div className="border border-white p-4 text-xs space-y-2">
              <p>• <span className="bg-white text-black px-1 font-bold mr-1">Machine Learning:</span> ~6 hours of pure, high-neuroplasticity morning focus.</p>
              <p>• <span className="bg-white text-black px-1 font-bold mr-1">Cybersecurity:</span> ~4.5 hours of hands-on lab time (Tue/Thu evenings + Sat morning).</p>
              <p>• <span className="bg-white text-black px-1 font-bold mr-1">Game Development:</span> 3 solid, uninterrupted weekend hours.</p>
              <p>• <span className="bg-white text-black px-1 font-bold mr-1">Guitar:</span> 2.5–3 hours of intentional practice + Sunday jamming.</p>
              <p>• <span className="bg-white text-black px-1 font-bold mr-1">Workouts:</span> 4 intense, recovery-optimized gym sessions.</p>
              <p>• <span className="bg-white text-black px-1 font-bold mr-1">Gaming:</span> 4–6 hours of guilt-free decompression.</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
