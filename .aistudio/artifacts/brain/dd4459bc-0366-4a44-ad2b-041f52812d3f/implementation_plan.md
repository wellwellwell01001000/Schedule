# Untimed Checklist, To-Dos & Timeless Schedule Milestones

A flexible task management upgrade introducing untimed all-day checklist items, pure text notes, and timed schedule notices without timers or stopwatch tracking, maintaining complete isolation from the core routine completion bar.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following design decisions were confirmed based on your preferences:
> - **Display Separation**: Timed tasks without checkboxes will appear in chronological order directly in the schedule, while untimed tasks (all-day to-dos) will live in a dedicated **`_DAILY_SCRATCHPAD`** checklist panel.
> - **Item Modes**: When creating items, you can select whether it is **Checkable** (`[ ]` / `[X]`) or a **Pure Note** (informational text banner without checkboxes).
> - **Progress Bar Isolation**: Untimed tasks and pure notes will **not** count toward the routine schedule completion percentage. The routine percentage remains dedicated strictly to your scheduled timed routine blocks.

---

## 1. Overview & Core Concept

- **What It Does**: Enables adding flexible day-level tasks alongside your strict timed routines:
  1. **Untimed Checkable To-Dos**: All-day checklist items with toggleable checkboxes `[ ]` ⇄ `[X]`.
  2. **Untimed Pure Notes**: Quick text notes and reminders (no checkboxes, no timer).
  3. **Timed Schedule Notices**: Tasks scheduled for a specific time (e.g. 14:00 Doctor Call) that appear in the schedule timeline but have **no stopwatch**, **no countdown timer**, and **no checkbox**.
  4. **Standard Timed Routines**: Preserves all existing timed routines with Pomodoro, stopwatch, duration, and progress logging.
- **Target Persona**: Fast-paced power users who want strict timeboxed routines for deep work, but also need a frictionless scratchpad for ad-hoc to-dos and milestone reminders on the same day.
- **Key Value**: Eliminates the need to assign artificial durations and start times to simple errands or reference notes, while keeping your daily focus schedule clean.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Quick-Adding Untimed To-Dos**:
   - In the **`_DAILY_SCRATCHPAD`** card (placed right in the tracker view), an inline input allows typing `Buy groceries` and hitting `Enter`. It instantly adds a checkable to-do for today.
   - Click `[ ]` to check off `[X]`. A separate counter displays `CHECKLIST: 1/3 DONE`.
2. **Creating via Modal**:
   - In the `[+] ADD TASK` modal, a new Mode Selector switch lets you pick:
     - `[ROUTINE]` (Timed with stopwatch / Pomodoro)
     - `[TIMED NOTICE]` (Specific hour, informational only, no timers/checkbox)
     - `[CHECKLIST]` (All-day checkable to-do)
     - `[NOTE]` (All-day pure text note)
   - When `CHECKLIST` or `NOTE` is chosen, the time picker and duration fields disappear automatically.
3. **Timed Schedule Timeline**:
   - `timed_routine` items show duration, start time, `[START TIMER]`, and `[STOPWATCH]`.
   - `timed_note` items show start time, category tag, and text, styled with a distinct subtle border and `[NOTE]` badge, without timer buttons or checkboxes.

### Visual Identity & Theme
- **Aesthetic**: Brutalist monochromatic terminal aesthetic matching the existing design (`border border-white`, uppercase mono text, bracketed badges).
- **Checklist Presentation**: Clean ASCII markers `[ ]` and `[X]` with strikethrough upon completion.
- **Pure Note Presentation**: Prefix `// ` or `[NOTE]` with muted border so it reads cleanly as reference text.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Progress Bar Calculation Isolation**
  - *Chosen Approach*: Routine progress bar continues to compute `(completedScheduledMinutes / totalScheduledMinutes) * 100` or completed routine count, strictly filtering out untimed tasks and pure notes.
  - *Why*: Adding 10 small quick errands won't skew your primary 8-hour deep-work routine progress. Untimed tasks get their own dedicated mini-counter.
- **Decision 2: Dual Entry Point (Inline Scratchpad + Modal)**
  - *Chosen Approach*: Provide a fast inline input in the scratchpad for quick to-dos, plus full options in the Add Task modal for recurring/categorized items.
  - *Why*: Daily errands must be effortless to jot down without multi-step form dialogs.

---

## 4. Technical Architecture & Data Strategy

### Component & Data Architecture Diagram
```
┌────────────────────────────────────────────────────────────────────────┐
│                               App State                                │
│      (tasks: TaskItem[], dayTaskLogs, completedTaskIds per date)       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
         ┌──────────────────────────┴──────────────────────────┐
         ▼                                                     ▼
┌──────────────────────────────┐              ┌──────────────────────────────┐
│       Scheduled Timeline     │              │       _DAILY_SCRATCHPAD      │
│  - Timed Routines (timers)   │              │  - Untimed Checklists ([X])  │
│  - Timed Notices (pure info) │              │  - Untimed Pure Notes (// )  │
│  * Drives Routine Progress % │              │  - Inline Fast Add Input     │
└──────────────────────────────┘              │  * Independent Done Counter  │
                                              └──────────────────────────────┘
```

### Data Model (`src/types.ts`)
```ts
export type TaskType = 'timed_routine' | 'timed_note' | 'untimed_checklist' | 'untimed_note';

export interface TaskItem {
  id: string;
  time: string;              // "HH:MM" or "ANYTIME"
  title: string;
  category: TaskCategory;
  details: string;
  durationMinutes: number;   // 0 for notes / untimed
  timeSpentMinutes?: number;
  isScheduled?: boolean;
  isRepetitive?: boolean;
  repeatDays?: DayKey[];
  oneTimeDate?: string;
  highlight?: boolean;
  isCustom?: boolean;

  taskType?: TaskType;       // Defaults to 'timed_routine'
  isCheckable?: boolean;     // False for pure notes
  isUntimed?: boolean;       // True for scratchpad items
}
```

---

## Verification & Testing Plan
1. **Creation**:
   - Add untimed checklist item via inline input and via Modal.
   - Add untimed pure note; verify it renders without a checkbox.
   - Add timed notice; verify it appears in chronological order in the schedule without timer/stopwatch buttons.
2. **Progress Isolation**:
   - Complete untimed checklist items; verify the main routine progress bar does not change.
3. **Persistence & Day Switching**:
   - Verify checked states persist across page reloads and date selections in `localStorage`.
4. **Build Quality**:
   - Run `compile_applet` and `lint_applet` to confirm zero compilation or lint errors.
