import { DaySchedule, MetricComparison } from '../types';

export const METRIC_COMPARISONS: MetricComparison[] = [
  {
    metric: 'Flow State Depth',
    allInOne: 'Shallow (30–45 min cuts you off just as you get into the zone)',
    alternating: 'Deep (75–90 min allows complex problem-solving)',
    winner: 'Alternating',
    why: 'Cognitive ramp-up requires ~20 mins; 75-90 min yields 55-70 mins of true flow.'
  },
  {
    metric: 'Context Switching',
    allInOne: 'High (5–6 different mental modes per day)',
    alternating: 'Low (Only 2 primary focuses per day)',
    winner: 'Alternating',
    why: 'Reduces attention residue caused by fracturing concentration across 6 subjects.'
  },
  {
    metric: 'Schedule Elasticity',
    allInOne: 'Fragile (If college runs late, everything breaks)',
    alternating: 'Flexible (Built-in buffer time for assignments/rest)',
    winner: 'Alternating',
    why: 'Missing one 30-min block derails the day; alternating has buffer room to absorb delay.'
  },
  {
    metric: 'CNS Recovery',
    allInOne: 'Low (Working out 6–7 days early morning causes fatigue)',
    alternating: 'High (4 workout days + rest days optimizes energy)',
    winner: 'Alternating',
    why: 'Allows nervous system regeneration while preserving 100% morning cognitive clarity.'
  }
];

export const WEEKLY_HOURS_SUMMARY = [
  { subject: 'Machine Learning', hours: '~6.0 hrs', schedule: '5x 70m morning sessions (Mon–Fri)', note: 'Pure high-neuroplasticity early focus' },
  { subject: 'Cybersecurity', hours: '~4.5 hrs', schedule: 'Tue/Thu eves (90m ea) + Sat morning (2.5h)', note: 'Hands-on lab CTFs & exploitation' },
  { subject: 'Game Development', hours: '~3.0 hrs', schedule: 'Sunday morning (09:30–12:30)', note: '3 unbroken hours in Godot/Unity' },
  { subject: 'Guitar & Music', hours: '~2.5–3 hrs', schedule: 'Mon/Wed/Fri (45m ea) + Sunday Jam', note: 'Intentional motor-skill practice' },
  { subject: 'Workouts', hours: '4 sessions', schedule: 'Mon, Tue, Thu, Fri (Upper/Lower Split)', note: 'Wed active rest, weekend recharge' },
  { subject: 'Gaming (Guilt-Free)', hours: '~4.0–6.0 hrs', schedule: 'Mon/Wed/Fri (60m) + Saturday afternoon', note: 'Zero-guilt nervous system decompression' },
];

export const SCHEDULES: Record<string, DaySchedule> = {
  mon: {
    dayKey: 'mon',
    dayName: 'Monday',
    code: 'A-DAY',
    categoryLabel: 'Creative & Motor',
    focusSummary: 'Morning: Workout + ML | Evening: Guitar + Chill',
    tasks: [
      { id: 'mon-1', time: '05:30 – 06:30', title: 'Workout (Upper/Lower or Push/Pull)', category: 'workout', details: 'Session 1/4. High physical stimulus to awaken CNS.', durationMinutes: 60 },
      { id: 'mon-2', time: '06:30 – 07:00', title: 'Shower & Breakfast', category: 'routine', details: 'High-protein breakfast, hydration, prep workspace.', durationMinutes: 30 },
      { id: 'mon-3', time: '07:00 – 08:10', title: 'DEEP WORK: Machine Learning', category: 'ml', details: '70 mins uninterrupted peak analytical power before bus.', durationMinutes: 70, highlight: true },
      { id: 'mon-4', time: '08:20 – 18:30', title: 'College & Lectures', category: 'college', details: '08:20 bus arrival. 3rd-year CS coursework and lab work.', durationMinutes: 610 },
      { id: 'mon-5', time: '18:30 – 19:15', title: 'Commute, Tea/Snack & Disconnect', category: 'routine', details: 'Complete screen disconnect, physical unwind from campus.', durationMinutes: 45 },
      { id: 'mon-6', time: '19:15 – 20:00', title: 'Guitar Deep Practice', category: 'guitar', details: '45 mins focused playing. Scales, fingerstyle, rhythm.', durationMinutes: 45, highlight: true },
      { id: 'mon-7', time: '20:00 – 20:45', title: 'Dinner & Relaxation', category: 'routine', details: 'Nutritious dinner, no high-stimulus tasks.', durationMinutes: 45 },
      { id: 'mon-8', time: '20:45 – 21:45', title: 'Gaming (Guilt-Free)', category: 'leisure', details: '60 mins guilt-free motor decompression.', durationMinutes: 60, highlight: true },
      { id: 'mon-9', time: '21:45 – 22:00', title: 'Wind Down & Sleep (22:00)', category: 'routine', details: 'Zero screens. Prepare for 05:30 wake-up.', durationMinutes: 15 }
    ]
  },
  tue: {
    dayKey: 'tue',
    dayName: 'Tuesday',
    code: 'B-DAY',
    categoryLabel: 'Technical & Problem Solving',
    focusSummary: 'Morning: Workout + ML | Evening: Cybersecurity Lab',
    tasks: [
      { id: 'tue-1', time: '05:30 – 06:30', title: 'Workout (Upper/Lower or Push/Pull)', category: 'workout', details: 'Session 2/4. Strength training routine.', durationMinutes: 60 },
      { id: 'tue-2', time: '06:30 – 07:00', title: 'Shower & Breakfast', category: 'routine', details: 'Nutrition and mental priming.', durationMinutes: 30 },
      { id: 'tue-3', time: '07:00 – 08:10', title: 'DEEP WORK: Machine Learning', category: 'ml', details: '70 mins uninterrupted model building / theory.', durationMinutes: 70, highlight: true },
      { id: 'tue-4', time: '08:20 – 18:30', title: 'College & Lectures', category: 'college', details: '08:20 bus arrival. Full college schedule.', durationMinutes: 610 },
      { id: 'tue-5', time: '18:30 – 19:30', title: 'Commute, Dinner & Unwind', category: 'routine', details: 'Transit home, full dinner, mental break before lab.', durationMinutes: 60 },
      { id: 'tue-6', time: '19:30 – 21:00', title: 'Cybersecurity Lab / Projects', category: 'cyber', details: '90 mins hands-on: TryHackMe / OverTheWire / Linux / network scans.', durationMinutes: 90, highlight: true },
      { id: 'tue-7', time: '21:00 – 21:45', title: 'Free Time & Casual Social', category: 'leisure', details: 'Casual YouTube, talk with friends, no pressure.', durationMinutes: 45 },
      { id: 'tue-8', time: '21:45 – 22:00', title: 'Wind Down & Sleep (22:00)', category: 'routine', details: 'Lights out at 22:00 sharp.', durationMinutes: 15 }
    ]
  },
  wed: {
    dayKey: 'wed',
    dayName: 'Wednesday',
    code: 'A-DAY',
    categoryLabel: 'Creative & Motor',
    focusSummary: 'Morning: Active Rest + ML | Evening: Guitar + Chill',
    isRestWorkout: true,
    tasks: [
      { id: 'wed-1', time: '05:30 – 06:30', title: 'Active Rest / Mobility & Stretch', category: 'workout', details: 'Rest day from heavy lifting to prevent CNS burnout. Light mobility/walk.', durationMinutes: 60 },
      { id: 'wed-2', time: '06:30 – 07:00', title: 'Shower & Breakfast', category: 'routine', details: 'Healthy fuel and clean transition.', durationMinutes: 30 },
      { id: 'wed-3', time: '07:00 – 08:10', title: 'DEEP WORK: Machine Learning', category: 'ml', details: '70 mins uninterrupted math/code formulation.', durationMinutes: 70, highlight: true },
      { id: 'wed-4', time: '08:20 – 18:30', title: 'College & Lectures', category: 'college', details: '08:20 bus arrival. Mid-week academic schedule.', durationMinutes: 610 },
      { id: 'wed-5', time: '18:30 – 19:15', title: 'Commute, Tea/Snack & Disconnect', category: 'routine', details: 'Screen-off transition, snacks, breathing.', durationMinutes: 45 },
      { id: 'wed-6', time: '19:15 – 20:00', title: 'Guitar Deep Practice', category: 'guitar', details: '45 mins intentional fretboard practice & technique.', durationMinutes: 45, highlight: true },
      { id: 'wed-7', time: '20:00 – 20:45', title: 'Dinner & Relaxation', category: 'routine', details: 'Dinner with family/housemates.', durationMinutes: 45 },
      { id: 'wed-8', time: '20:45 – 21:45', title: 'Gaming (Guilt-Free)', category: 'leisure', details: '60 mins relaxing gaming session.', durationMinutes: 60, highlight: true },
      { id: 'wed-9', time: '21:45 – 22:00', title: 'Wind Down & Sleep (22:00)', category: 'routine', details: 'Prepare for Thursday technical block.', durationMinutes: 15 }
    ]
  },
  thu: {
    dayKey: 'thu',
    dayName: 'Thursday',
    code: 'B-DAY',
    categoryLabel: 'Technical & Problem Solving',
    focusSummary: 'Morning: Workout + ML | Evening: Cybersecurity Lab',
    tasks: [
      { id: 'thu-1', time: '05:30 – 06:30', title: 'Workout (Upper/Lower or Push/Pull)', category: 'workout', details: 'Session 3/4. Progressive overload lifting.', durationMinutes: 60 },
      { id: 'thu-2', time: '06:30 – 07:00', title: 'Shower & Breakfast', category: 'routine', details: 'Re-fuel and prepare cognitive workspace.', durationMinutes: 30 },
      { id: 'thu-3', time: '07:00 – 08:10', title: 'DEEP WORK: Machine Learning', category: 'ml', details: '70 mins ML implementations and research readings.', durationMinutes: 70, highlight: true },
      { id: 'thu-4', time: '08:20 – 18:30', title: 'College & Lectures', category: 'college', details: '08:20 bus arrival. Department classes & assignments.', durationMinutes: 610 },
      { id: 'thu-5', time: '18:30 – 19:30', title: 'Commute, Dinner & Unwind', category: 'routine', details: 'Buffer window. Late bus will not ruin the evening.', durationMinutes: 60 },
      { id: 'thu-6', time: '19:30 – 21:00', title: 'Cybersecurity Lab / Projects', category: 'cyber', details: '90 mins CTF practice, Linux forensics, vulnerability research.', durationMinutes: 90, highlight: true },
      { id: 'thu-7', time: '21:00 – 21:45', title: 'Free Time & Wind Down', category: 'leisure', details: 'Casual media, chat with friends, chill.', durationMinutes: 45 },
      { id: 'thu-8', time: '21:45 – 22:00', title: 'Wind Down & Sleep (22:00)', category: 'routine', details: 'Target 7.5 hours high restorative sleep.', durationMinutes: 15 }
    ]
  },
  fri: {
    dayKey: 'fri',
    dayName: 'Friday',
    code: 'A-DAY',
    categoryLabel: 'Creative & Motor',
    focusSummary: 'Morning: Workout + ML | Evening: Guitar + Chill',
    tasks: [
      { id: 'fri-1', time: '05:30 – 06:30', title: 'Workout (Upper/Lower or Push/Pull)', category: 'workout', details: 'Session 4/4. Final gym session of the week completed.', durationMinutes: 60 },
      { id: 'fri-2', time: '06:30 – 07:00', title: 'Shower & Breakfast', category: 'routine', details: 'Shower, breakfast, final morning anchor.', durationMinutes: 30 },
      { id: 'fri-3', time: '07:00 – 08:10', title: 'DEEP WORK: Machine Learning', category: 'ml', details: '70 mins completes ~6 total weekly hours of peak ML.', durationMinutes: 70, highlight: true },
      { id: 'fri-4', time: '08:20 – 18:30', title: 'College & Lectures', category: 'college', details: '08:20 bus. Final Friday university requirements.', durationMinutes: 610 },
      { id: 'fri-5', time: '18:30 – 19:15', title: 'Commute, Tea/Snack & Disconnect', category: 'routine', details: 'Friday evening reset. Step away from campus fatigue.', durationMinutes: 45 },
      { id: 'fri-6', time: '19:15 – 20:00', title: 'Guitar Deep Practice', category: 'guitar', details: '45 mins intentional guitar technique.', durationMinutes: 45, highlight: true },
      { id: 'fri-7', time: '20:00 – 20:45', title: 'Dinner', category: 'routine', details: 'Unrushed Friday dinner.', durationMinutes: 45 },
      { id: 'fri-8', time: '20:45 – 22:00', title: 'Gaming / Weekend Kickoff', category: 'leisure', details: 'Extended relaxing evening with zero guilt.', durationMinutes: 75, highlight: true },
      { id: 'fri-9', time: '22:00 – 22:30', title: 'Sleep', category: 'routine', details: 'High quality rest for Saturday morning deep dive.', durationMinutes: 30 }
    ]
  },
  sat: {
    dayKey: 'sat',
    dayName: 'Saturday',
    code: 'WEEKEND-SAT',
    categoryLabel: 'The Dual-Skill Sprint',
    focusSummary: 'Morning: Cyber Deep Dive | Afternoon/Evening: Complete Freedom',
    tasks: [
      { id: 'sat-1', time: '08:00 – 09:00', title: 'Natural Wake-Up & Breakfast', category: 'routine', details: 'No rushed alarm. Balanced breakfast and coffee/tea.', durationMinutes: 60 },
      { id: 'sat-2', time: '09:00 – 11:30', title: 'Cybersecurity Deep Dive (2.5 hrs)', category: 'cyber', details: 'CTF challenges, vulnerable VM exploitation, API security.', durationMinutes: 150, highlight: true },
      { id: 'sat-3', time: '11:30 – 13:00', title: 'Lunch & Unwind', category: 'routine', details: 'Complete freedom begins.', durationMinutes: 90 },
      { id: 'sat-4', time: '13:00 – 22:00', title: 'Complete Freedom / Hangout / Gaming', category: 'leisure', details: 'Hang out with friends, go out, or extended guilt-free gaming session.', durationMinutes: 540, highlight: true },
      { id: 'sat-5', time: '22:00 – 23:00', title: 'Sleep', category: 'routine', details: 'Recharge for Sunday game dev studio.', durationMinutes: 60 }
    ]
  },
  sun: {
    dayKey: 'sun',
    dayName: 'Sunday',
    code: 'WEEKEND-SUN',
    categoryLabel: 'Creative & Game Dev Studio',
    focusSummary: 'Morning: Game Dev | Afternoon: Guitar Jam | Evening: Week Plan',
    tasks: [
      { id: 'sun-1', time: '08:30 – 09:30', title: 'Breakfast & Creative Setup', category: 'routine', details: 'Setup game engine workspace, check dev logs.', durationMinutes: 60 },
      { id: 'sun-2', time: '09:30 – 12:30', title: 'Game Development Sprint (3 hrs)', category: 'gamedev', details: '3 uninterrupted hours in Godot/Unity, shaders, mechanics, AI logic.', durationMinutes: 180, highlight: true },
      { id: 'sun-3', time: '12:30 – 13:30', title: 'Lunch Break', category: 'routine', details: 'Rest and step away from the screen.', durationMinutes: 60 },
      { id: 'sun-4', time: '13:30 – 16:30', title: 'Free Guitar Jam / Songwriting', category: 'guitar', details: 'No strict drills, just play. Songwriting, improv, creative enjoyment.', durationMinutes: 180, highlight: true },
      { id: 'sun-5', time: '16:30 – 18:30', title: 'Walk / Workout / Free Leisure', category: 'leisure', details: 'Fresh air, light movement or socializing.', durationMinutes: 120 },
      { id: 'sun-6', time: '18:30 – 19:30', title: 'Dinner', category: 'routine', details: 'Dinner and calm prep.', durationMinutes: 60 },
      { id: 'sun-7', time: '19:30 – 20:30', title: 'Weekly Review & Routine Prep', category: 'routine', details: 'Review upcoming week classes, check labs, clear desk.', durationMinutes: 60 },
      { id: 'sun-8', time: '21:30 – 22:00', title: 'Early Sleep (22:00)', category: 'routine', details: 'Prime CNS for Monday morning 05:30 workout + ML.', durationMinutes: 30 }
    ]
  }
};

export const RAW_README_TEXT = `# The Alternating (Day-Themed) Model for Maximum Productivity

> The alternating model eliminates schedule friction and attention residue.
> Trying to do everything every single day—even in small 30-minute slivers—causes routine collapse from a single delayed college bus or tiring lecture.

---

## Why Alternating Days Beats the "All-in-One" Routine

| Metric | Daily Micro-Dosing (All-in-One) | Alternating / Day-Themed Model | Winner |
|---|---|---|---|
| Flow State Depth | Shallow (30–45 min cuts you off as you get into the zone) | Deep (75–90 min allows complex problem-solving) | **Alternating** |
| Context Switching | High (5–6 different mental modes per day) | Low (Only 2 primary focuses per day) | **Alternating** |
| Schedule Elasticity | Fragile (If college runs late, everything breaks) | Flexible (Built-in buffer time for assignments/rest) | **Alternating** |
| CNS Recovery | Low (Working out 6–7 days early morning causes fatigue) | High (4 workout days + rest days optimizes energy) | **Alternating** |

---

## The Weekday System Blueprint

\`\`\`
WEEKDAY SYSTEM
┌───────────────────────────┐   ┌───────────────────────────┐
│   A-DAYS (Mon / Wed / Fri)│   │   B-DAYS (Tue / Thu)      │
│  • Morning: Workout + ML  │   │  • Morning: Workout + ML  │
│  • Evening: Guitar + Chill│   │  • Evening: Cybersecurity │
└───────────────────────────┘   └───────────────────────────┘
\`\`\`

---

### 1. Weekday Morning Anchor (Mon–Fri)
*Keep mornings consistent because your early-bird brain is at peak analytical power.*

- **05:30 – 06:30**: Workout (Mon, Tue, Thu, Fri = 4-day Upper/Lower or Push/Pull split. Wednesday is active rest/stretch).
- **06:30 – 07:00**: Shower & Breakfast.
- **07:00 – 08:10 (70 mins)**: **DEEP WORK — Machine Learning**.
  - *Why this works:* 70 uninterrupted minutes 5 days a week = almost 6 hours of high-focus ML weekly, completed before stepping onto the 08:20 bus.
- **08:20 – 18:00 / 18:30**: College until evening.

---

### 2. Alternating Weekday Evenings (18:30 – 22:00)
*Brain is tired from college math/coding, so engage motor and leisure circuits on A-Days, or puzzle-based lab work on B-Days.*

#### A-Days (Mon / Wed / Fri): Creative & Motor
- **18:30 – 19:15**: Commute back, tea/snack, complete screen disconnect.
- **19:15 – 20:00 (45 mins)**: **Guitar Deep Practice** (45 min 3x/wk > 20 min rushed daily).
- **20:00 – 20:45**: Dinner.
- **20:45 – 21:45 (60 mins)**: **Gaming (Guilt-Free)**.
- **21:45 – 22:00**: Wind down → Sleep at 22:00.

#### B-Days (Tue / Thu): Technical & Problem Solving
- **18:30 – 19:30**: Commute back, dinner, unwind.
- **19:30 – 21:00 (90 mins)**: **Cybersecurity Lab / College Projects**.
  - *Why this works:* Lab-based work (TryHackMe, OverTheWire, Linux) feels like interactive puzzles rather than dry reading.
- **21:00 – 21:45**: Free time / casual YouTube / talk with friends.
- **22:00**: Sleep.

---

### 3. Weekends: Deep Immersion (Game Dev & Passion)
*Open cognitive space without checking the clock every 30 minutes.*

#### Saturday (The Dual-Skill Sprint):
- **09:00 – 11:30**: Cybersecurity Deep Dive (CTF challenges, VM exploitation, API security).
- **Afternoon / Evening**: Complete freedom—friends, outdoors, or extended gaming.

#### Sunday (The Creative & Game Dev Studio):
- **09:30 – 12:30**: Game Development Sprint (3 uninterrupted hours in Godot/Unity, shaders, AI logic).
- **Afternoon**: Free guitar jam / songwriting session (no rules, just play).
- **Evening**: Plan upcoming week, light review, early sleep.

---

## Summary of Weekly Hours Achieved

- **Machine Learning**: ~6 hours of pure morning focus
- **Cybersecurity**: ~4.5 hours hands-on lab time (Tue/Thu eves + Sat morning)
- **Game Development**: 3 solid, uninterrupted weekend hours
- **Guitar**: 2.5–3 hours intentional practice + Sunday jamming
- **Workouts**: 4 intense, recovery-optimized gym sessions
- **Gaming**: 4–6 hours guilt-free decompression
`;
