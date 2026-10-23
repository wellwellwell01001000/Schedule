# REMIX ALTERNATING ROUTINE TRACKER // v2026.09
> An editorial monochrome routine tracking engine with clean-slate flexible schedules, live timeline tracking, hierarchical Month > Week > Day metrics, and per-task time distribution audits.

```
+-------------------------------------------------------------------------+
|  [1] TRACKER       [2] HIERARCHY       [3] TASK AUDIT     [SYS_BACKUP]  |
|  CYCLE: 10/19 -> 10/25  |  ACTIVE: SATURDAY [SAT]         [CLOUD_SYNC]  |
|  PROGRESS: [========================--------] 75%                       |
+-------------------------------------------------------------------------+
```

---

## 01 // OVERVIEW & DESIGN PHILOSOPHY

The **Remix Alternating Routine Tracker** is built for high-focus professionals, engineers, students, and athletes who require strict time accountability without bloated productivity apps.

* **Zero-AI / Clean Monospace Aesthetic:** Brutalist high-contrast typography, ASCII progress meters, zero distracting pills or pastel gradients.
* **Date-Scoped Integrity:** Checkmarks and time spent are strictly tied to specific calendar dates. Future weeks always start 100% clean.
* **Hierarchical Metrics Engine:** Seamlessly aggregates time from individual 15-minute blocks up to daily, weekly, monthly, and yearly totals.
* **Offline-First & Cloud-Synced:** Stores everything in your browser's local storage and optionally syncs across devices via Google Drive Vault using a 6-character sync code.

---

## 02 // KEY VIEWS & NAVIGATION

Navigate between views using the top header buttons or instant **single-key shortcuts**:

| Key | View | Purpose |
|:---:|:---|:---|
| **`1`** | **`[1] TRACKER`** | Daily agenda, 24-hour timeline, live stopwatch, checkmarks, task creation |
| **`2`** | **`[2] HIERARCHY`** | Month > Week > Day drilldown metrics, completion rates, day task adjustments |
| **`3`** | **`[3] TASK AUDIT`** | Lifetime task ledger, percentage time allocation, category breakdown, quick adjustments |

---

## 03 // DETAILED FEATURE GUIDE

### View 1: `[1] TRACKER` (Daily Operations)
Your primary dashboard for executing daily routines.

1. **Cycle & Day Navigation:**
   * Shows the active weekly routine cycle (Monday to Sunday).
   * Click any day button (`MON`, `TUE`, `WED`, `THU`, `FRI`, `SAT`, `SUN`) to inspect or edit that day's schedule.
   * Click **`[TODAY]`** at any point to instantly jump back to the current real-world day.
2. **Task Execution & Checkmarks:**
   * Click the checkbox next to any task to mark it completed for the current date.
   * Completed tasks automatically update the ASCII progress bar and sync to history.
3. **Live Stopwatch & Time Tracking:**
   * Click **`[START TIMER]`** on any task to run a real-time ticking stopwatch.
   * Click **`[STOP & COMMIT]`** when finished. The tracked minutes are immediately saved to that task for today.
   * Use quick-adjustment buttons directly on the task card:
     * **`[-15m]`**: Subtracts 15 minutes (clamped at `0m`).
     * **`[+15m]`**: Adds 15 minutes.
     * **`[ADJUST TIME]`**: Opens the direct time editor.
4. **Creating Tasks (Recurring vs One-Time):**
   * Click **`[+ CREATE TASK]`** at the bottom of the Tracker.
   * **Task Title & Category:** Assign categories like `deep_work`, `core_work`, `fitness`, `learning`, or `custom`.
   * **24H Time Block Picker:** Choose start and end times or directly type the **ESTIMATE** in minutes (e.g., `120` for 2 hours).
   * **Recurrence Discipline:**
     * **`REPETITIVE`**: Repeats every week on the selected days of the week.
     * **`ONE-TIME`**: Binds strictly to the specific calendar date (e.g. `2026-10-24`). **It will not appear in future weeks**, keeping your recurring schedule clean!
5. **Park / Deschedule Management:**
   * Click **`[PARK]`** to temporarily deschedule a task without deleting it.
   * Choose **Today Only** (parks it just for this day) or **Across All Days**.
   * Parked tasks appear in the **PARKED / DESCHEDULED INVENTORY** at the bottom and can be restored at any time with **`[RESTORE]`**.

---

### View 2: `[2] HIERARCHY` (Analytical Drilldown)
A complete hierarchical audit trail of all work done across months, weeks, and days.

1. **Drilldown Navigation:**
   * **Month Level:** Shows monthly total hours, completion rate, and week-over-week trends.
   * **Week Level:** Breaks down each week's days, planned tasks vs completed tasks, and total logged minutes.
   * **Day Level:** Displays every task recorded on that specific calendar date.
2. **View Modes:**
   * **`[DRILLDOWN]`**: Step-by-step breadcrumb view (`MONTH > WEEK > DAY`).
   * **`[TREE VIEW]`**: Expands the full historical tree for fast scanning.
3. **Direct Day Task Editing:**
   * Drill down to any day and adjust historical tasks directly.
   * Click **`[-15m]`** or **`[+15m]`** on any task row.
   * Click **`[ADJUST TIME]`** to type an exact target total (e.g. `240` minutes).
   * Features a live difference indicator (`[+60m]` or `[-30m]`) and instant hour conversion (`= 4h 00m`).

---

### View 3: `[3] TASK AUDIT` (Lifetime Task Ledger)
Aggregates every minute spent on each distinct task across all schedules, historical days, and direct logging.

1. **Task Ledger Metrics:**
   * Total accumulated hours & minutes.
   * Percentage of total system lifetime time.
   * Total number of completed sessions.
   * ASCII bar representation of relative task weight.
2. **Search & Filter:**
   * Live search bar: Filter tasks instantly by title.
   * Category selector: Filter by `DEEP WORK`, `CORE WORK`, `LEARNING`, `FITNESS`, etc.
   * Sorting options: Sort by **Most Time**, **Most Sessions**, or **Alphabetical**.
3. **Bidirectional Time Adjustments:**
   * Use **`[-15m]`** and **`[+15m]`** on any row.
   * Use **`[ADJUST TIME]`** to set exact audited totals.
   * Adjustments automatically synchronize: additions accumulate into direct audit time; reductions deduct from direct time first, then smoothly adjust the latest calendar day in history.
4. **Purge / Remove Task:**
   * Click **`[REMOVE]`** to permanently delete a task from the audit ledger and active schedules.

---

## 04 // DATA BACKUPS & CLOUD SYNC

Click **`[SYS_BACKUP]`** in the top navigation bar to access the Backup & Vault interface.

```
+---------------------------------------------------------------------+
|                      _SYSTEM_DATA_VAULT                             |
|                                                                     |
|  [EXPORT COMPLETE BACKUP (JSON)]       [RESTORE SYSTEM (JSON)]      |
|  [UPLOAD TO CLOUD (PUSH)]              [FETCH FROM CLOUD (PULL)]    |
|  [WIPE SAMPLE DATA & START CLEAN]                                   |
+---------------------------------------------------------------------+
```

### 1. Manual JSON Export & Restore
* **Export:** Click **`[EXPORT COMPLETE BACKUP (JSON)]`** to download a portable `.json` snapshot of your entire routine, historical logs, and completion states.
* **Restore:** Click **`[RESTORE SYSTEM (JSON)]`** and select any exported `.json` file. The app rebalances all historical math and restores your data instantly.

### 2. Google Drive Vault (Cross-Device Sync)
Sync your routine between phone, tablet, and PC without setting up third-party accounts or databases:
1. Click **`[DRIVE_VAULT]`** / **`[SYS_BACKUP]`**.
2. Deploy a lightweight Google Apps Script Webhook (see below) and paste the URL.
3. Enter your **6-character Sync Code** (e.g. `K9X2P4`).
4. Click **`[UPLOAD TO CLOUD (PUSH)]`** on your primary device.
5. Enter the same Sync Code on your other device and click **`[FETCH FROM CLOUD (PULL)]`**.

#### Optional: Google Apps Script Webhook (One-Time Setup)
Create a free Google Apps Script in your Google Drive:
```javascript
function doGet(e) {
  var code = e.parameter.code || 'DEFAULT';
  var prop = PropertiesService.getUserProperties();
  var data = prop.getProperty('vault_' + code);
  return ContentService.createTextOutput(data || '{}').setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var code = e.parameter.code || 'DEFAULT';
  var body = e.postData.contents;
  var prop = PropertiesService.getUserProperties();
  prop.setProperty('vault_' + code, body);
  return ContentService.createTextOutput(JSON.stringify({ status: 'ok', code: code })).setMimeType(ContentService.MimeType.JSON);
}
```
* Deploy as **Web App** ➔ Set access to **"Anyone"**.
* Paste the Web App URL into the app's Drive Vault settings.

### 3. Reset to Zero Baseline
* Click **`[WIPE SAMPLE DATA & START CLEAN]`** in the Archive tab.
* Completely purges all placeholder history, demo months, and direct audit time, giving you a 100% clean slate starting from 0.0 hours.

---

## 05 // LOCAL STORAGE KEYS SPECIFICATION

For developers or advanced users inspecting browser storage:

| Key | Type | Description |
|:---|:---|:---|
| `prod_sys_custom_schedules_v1` | Object | Active Monday–Sunday schedule objects and task definitions |
| `prod_sys_hierarchy_history_v1` | Array | Hierarchical Month > Week > Day logs with task durations |
| `alt_routine_direct_task_audit_time_v1` | Object | Direct task audit adjustments (minutes per task key) |
| `alt_routine_completed_date_YYYY-MM-DD` | Array | Task IDs marked completed on specific calendar dates |
| `alt_routine_time_spent_date_YYYY-MM-DD` | Object | Minutes tracked per task on specific calendar dates |
| `prod_sys_backup_snapshots_v1` | Array | Local snapshot history archive (last 15 snapshots) |

---

## 06 // TECHNICAL STACK & ARCHITECTURE

* **Runtime:** React 19 SPA + Vite
* **Language:** TypeScript (strict mode)
* **Styling:** Tailwind CSS (monochrome high-contrast design system)
* **Icons:** Lucide React
* **Build System:** `npm run build`
* **Performance:** Zero heavy chart libraries; ultra-lightweight ASCII progress meters with millisecond rendering.

---

## 07 // DEVELOPMENT

### Installation
```bash
# Clone the repository
git clone https://github.com/your-repo/routine-tracker.git
cd routine-tracker

# Install dependencies
npm install

# Start local development server
npm run dev
```

### Production Build & Lint
```bash
# Type check and lint
npm run lint

# Production build
npm run build
```

---

```
[SYSTEM STATUS: OPERATIONAL] // REMIX ALTERNATING ROUTINE TRACKER // 2026.09
```
