```
====================================================================================================
  ██████╗ ███████╗███╗   ███╗██╗██╗  ██╗    ██████╗  ██████╗ ██╗   ██╗████████╗██╗███╗   ██╗███████╗
  ██╔══██╗██╔════╝████╗ ████║██║╚██╗██╔╝    ██╔══██╗██╔═══██╗██║   ██║╚══██╔══╝██║████╗  ██║██╔════╝
  ██████╔╝█████╗  ██╔████╔██║██║ ╚███╔╝     ██████╔╝██║   ██║██║   ██║   ██║   ██║██╔██╗ ██║█████╗  
  ██╔══██╗██╔══╝  ██║╚██╔╝██║██║ ██╔██╗     ██╔══██╗██║   ██║██║   ██║   ██║   ██║██║╚██╗██║██╔══╝  
  ██║  ██║███████╗██║ ╚═╝ ██║██║██╔╝ ██╗    ██║  ██║╚██████╔╝╚██████╔╝   ██║   ██║██║ ╚████║███████╗
  ╚═╝  ╚═╝╚══════╝╚═╝     ╚═╝╚═╝╚═╝  ╚═╝    ╚═╝  ╚═╝ ╚═════╝  ╚═════╝    ╚═╝   ╚═╝╚═╝  ╚═══╝╚══════╝
                                    [TRACKER // v2026.09]
====================================================================================================
```

```
+--------------------------------------------------------------------------------------------------+
|  [1] TRACKER               [2] HIERARCHY               [3] TASK AUDIT             [SYS_BACKUP]   |
|  CYCLE: 10/19 -> 10/25     ACTIVE: SATURDAY [SAT]      TIME: 21:45:00             [DRIVE_VAULT]  |
|  PROGRESS: [====================================--------------------] 64%                        |
+--------------------------------------------------------------------------------------------------+
```

> **A terminal-grade, high-contrast monochrome routine engine for strict personal time accountability.**
> Engineered with zero bloat, zero AI assistants, and pure typography.

---

## TABLE OF CONTENTS

* [01 // QUICK START & HOTKEYS](#01--quick-start--hotkeys)
* [02 // CORE MODULES & HOW TO USE EACH VIEW](#02--core-modules--how-to-use-each-view)
  * [View 1: `[1] TRACKER` (Daily Execution & Time-Blocking)](#view-1-1-tracker-daily-execution--time-blocking)
  * [View 2: `[2] HIERARCHY` (Month > Week > Day Analytics)](#view-2-2-hierarchy-month--week--day-analytics)
  * [View 3: `[3] TASK AUDIT` (Lifetime Task Ledger)](#view-3-3-task-audit-lifetime-task-ledger)
* [03 // MANAGING TASKS: REPETITIVE VS ONE-TIME](#03--managing-tasks-repetitive-vs-one-time)
* [04 // TIME ADJUSTMENT DISCIPLINE (+ / - & DIRECT EDIT)](#04--time-adjustment-discipline----direct-edit)
* [05 // BACKUPS & MANUAL DATA EDITING](#05--backups--manual-data-editing)
* [06 // GOOGLE DRIVE VAULT SYNC SETUP (STEP-BY-STEP)](#06--google-drive-vault-sync-setup-step-by-step)
* [07 // SELF-HOSTING & LOCAL INSTALLATION](#07--self-hosting--local-installation)

---

## 01 // QUICK START & HOTKEYS

Use these single-key shortcuts from anywhere in the app to switch views instantly:

```
[1] -> TRACKER       : Daily agenda, live stopwatch, checkmarks, new tasks
[2] -> HIERARCHY     : Analytical drilldown (Months > Weeks > Days)
[3] -> TASK AUDIT    : Aggregate time distribution ledger across all tasks
```

---

## 02 // CORE MODULES & HOW TO USE EACH VIEW

```
+--------------------------------------------------------------------------------------------------+
| VIEW 1: [1] TRACKER                                                                              |
+--------------------------------------------------------------------------------------------------+
```

The daily command center for executing your schedule.

### 1. Navigating Days & Cycle
* The top bar shows your current Monday-to-Sunday routine cycle (`CYCLE: MM/DD -> MM/DD`).
* Click any day button (`MON`, `TUE`, `WED`, `THU`, `FRI`, `SAT`, `SUN`) to inspect or edit that day's plan.
* Click **`[TODAY]`** at any point to jump straight back to the active real-world day.

### 2. Checking Off Tasks
* Click the checkbox next to any task to mark it complete.
* The progress bar updates in real time:
  ```
  PROGRESS: [====================================--------------------] 64% (7/11 TASKS)
  ```
* Completion status is stored with strict date-scoping so your past history is permanently locked.

### 3. Tracking Time
* **Live Stopwatch:** Click **`[START TIMER]`** on any task to start the live timer while you work. When finished, click **`[STOP & COMMIT]`** to log the exact minutes to that task for today.
* **Quick Nudge Buttons:**
  * **`[-15m]`**: Deducts 15 minutes (safely clamps at `0m`, never goes negative).
  * **`[+15m]`**: Adds 15 minutes.
  * **`[ADJUST TIME]`**: Opens a modal where you can type an exact number of minutes or select presets.

### 4. Parking & Descheduling Tasks
* Need to skip a task today without permanently deleting it from your routine?
* Click **`[PARK]`** on the task card.
* Choose between:
  * **`[PARK FOR TODAY ONLY]`**: Moves the task to the **PARKED / DESCHEDULED INVENTORY** for today only.
  * **`[PARK ACROSS ALL DAYS]`**: Parks it across the whole week.
* Click **`[RESTORE]`** in the parked list at any time to reactivate it.

---

```
+--------------------------------------------------------------------------------------------------+
| VIEW 2: [2] HIERARCHY                                                                            |
+--------------------------------------------------------------------------------------------------+
```

An analytical drilldown tree showing how every minute rolls up from days into weeks, months, and years.

```
ALL MONTHS
  └── OCTOBER 2026 [1,528m / 25.5h] (7/14 Tasks - 50%)
        ├── Week 1 (10/01 to 10/07) [75m]
        ├── Week 2 (10/08 to 10/14) [101m]
        └── Week 3 (10/15 to 10/21) [1,352m]
              ├── 2026-10-15 (THU) [240m]
              ├── 2026-10-16 (FRI) [438m]
              ├── 2026-10-17 (SAT) [240m]
              └── 2026-10-18 (SUN) [434m]
```

### 1. Drilldown Navigation
* **Month Level:** Shows total hours, completion rates, and comparative past-week/past-month performance.
* **Week Level:** View individual weeks with progress meters and completed session counts.
* **Day Level:** Click into any day to view all tasks executed on that exact date.

### 2. View Modes
* Toggle between **`[DRILLDOWN]`** (step-by-step breadcrumb view) and **`[TREE VIEW]`** (full expanded tree) via the top toggle.

### 3. Historical Editing
* Need to correct time on a past day?
* Drill down into that specific day. Every task card has **`[-15m]`**, **`[+15m]`**, and **`[ADJUST TIME]`**.
* You can type an exact new total (e.g. `240` minutes) and the system will recalculate all day, week, and month totals automatically.

---

```
+--------------------------------------------------------------------------------------------------+
| VIEW 3: [3] TASK AUDIT                                                                           |
+--------------------------------------------------------------------------------------------------+
```

The lifetime audit ledger. Aggregates all time ever recorded for each distinct task across schedules, past history, and direct logging.

```
TASK LEDGER                                      HOURS       % OF TOTAL   SESSIONS
[---------------------------------------------------------------------------------]
1. CYBERPUNK 2077 [CUSTOM]                       18.0h (1080m)    41%      4 done
   [====================================------------------------------]
2. DEEP LEARNING [CORE_WORK]                      8.0h (480m)     18%      1 done
   [================--------------------------------------------------]
3. DAA 5 & 6 [LEARNING]                           3.8h (226m)      9%      1 done
   [========----------------------------------------------------------]
```

### 1. Ledger Functions
* **Search:** Filter by typing any task name in the search box.
* **Category Filter:** View only `DEEP WORK`, `CORE WORK`, `LEARNING`, `FITNESS`, etc.
* **Sort:** Sort by **Time**, **Sessions**, or **Alphabetical**.

### 2. Direct Task Adjustments
* Use **`[-15m]`** and **`[+15m]`** directly on the ledger rows.
* Click **`[ADJUST TIME]`** to set exact audited totals.
* **`[REMOVE]`**: Purges a task completely from both the audit ledger and active schedules.

---

## 03 // MANAGING TASKS: REPETITIVE VS ONE-TIME

When you click **`[+ CREATE TASK]`** at the bottom of the Tracker:

```
+---------------------------------------------------------------------+
| _CREATE_CUSTOM_TASK                                                 |
|                                                                     |
| TASK TITLE:       [ Deep Learning Architecture                     ] |
| CATEGORY:         [ DEEP WORK                                    v ] |
|                                                                     |
| START TIME (24H): [ 14 : 00 ]    END TIME (24H): [ 16 : 00 ]        |
| ESTIMATE:         [ 120 ] m  (= 2h 00m)   [-15m] [+15m]             |
|                                                                     |
| RECURRENCE:       (o) REPETITIVE           ( ) ONE-TIME             |
| ACTIVE ON DAYS:   [x] MON  [ ] TUE  [x] WED  [ ] THU  [x] FRI       |
|                                                                     |
|                   [CANCEL]    [COMMIT TO SCHEDULE]                  |
+---------------------------------------------------------------------+
```

### 1. `REPETITIVE` Tasks (Weekly Template)
* Use this for ongoing habits, workout splits, or work schedules.
* Select which days of the week it should repeat on (`MON`, `WED`, `FRI`, etc.).
* It will automatically appear on those weekdays every cycle.

### 2. `ONE-TIME` Tasks (Date-Scoped)
* Use this for exams, deadlines, one-off events, or specific sessions (e.g. "Cyberpunk 2077" on a specific weekend).
* Select **`ONE-TIME`**. The app pins the task strictly to the date of the day you are currently viewing (`oneTimeDate: YYYY-MM-DD`).
* **It will only appear on that exact calendar date.** When next week comes, it will not appear on the daily schedule, keeping your routine clean!

---

## 04 // TIME ADJUSTMENT DISCIPLINE (+ / - & DIRECT EDIT)

Both **`[2] HIERARCHY`** and **`[3] TASK AUDIT`** share the same bidirectional time editing modal:

```
+---------------------------------------------------------------------+
| _EDIT_TIME // 2026-10-17                                            |
+---------------------------------------------------------------------+
| TASK:                 Cyberpunk 2077                                |
| CURRENT TIME LOGGED:  240m (4.0 hrs)                                |
|                                                                     |
| NEW TARGET TOTAL:     [ 180 ] min   = 3h 00m (3.0 hrs)              |
| DIFFERENCE:           -60m (-1.0h)                                  |
|                                                                     |
| QUICK ADJUST:         [-60m] [-30m] [-15m] [+15m] [+30m] [+60m]     |
|                                                                     |
|                       [CANCEL]    [COMMIT TIME (3h 00m)]            |
+---------------------------------------------------------------------+
```

1. **Direct Number Entry:** You can directly type the target number (e.g. `180`).
2. **Live Difference Display:** Shows in real-time whether you are adding (`+60m`) or subtracting (`-60m`).
3. **Safety Clamp:** Time will never drop below `0m`.

---

## 05 // BACKUPS & MANUAL DATA EDITING

Click **`[SYS_BACKUP]`** at the top right to manage your data:

```
+---------------------------------------------------------------------+
|                      _SYSTEM_DATA_VAULT                             |
|                                                                     |
|  [EXPORT COMPLETE BACKUP (JSON)]       [RESTORE SYSTEM (JSON)]      |
|  [UPLOAD TO CLOUD (PUSH)]              [FETCH FROM CLOUD (PULL)]    |
|  [WIPE SAMPLE DATA & START CLEAN]                                   |
+---------------------------------------------------------------------+
```

### 1. Exporting & Restoring JSON
* Click **`[EXPORT COMPLETE BACKUP (JSON)]`** to download your full database as a `.json` file.
* Click **`[RESTORE SYSTEM (JSON)]`** to load any exported backup file. All schedules, dates, and historical totals will be restored and verified.

### 2. Manually Adding Tasks to Past Days in the JSON
You can open your exported `.json` file in any text editor (like Notepad or VS Code), add tasks to any past day, and re-import it:
1. Search for the date you want under `"history"` (e.g. `"date": "2026-10-15"`).
2. Add your task to that day's `"tasks"` array:
   ```json
   {
     "taskId": "manual-task-01",
     "title": "Machine Learning Research",
     "category": "deep_work",
     "timeSpentMinutes": 120,
     "completed": true,
     "isScheduled": true,
     "isRepetitive": false,
     "timeSlot": "14:00 - 16:00"
   }
   ```
3. Save the file and click **`[RESTORE SYSTEM (JSON)]`** in the app. The app recalculates all week and month totals automatically.

### 3. Reset to Zero Baseline
* Click **`[WIPE SAMPLE DATA & START CLEAN]`** in the Archive tab to wipe all demo/placeholder data, leaving your routine, history, and audit ledger at a 100% clean zero baseline.

---

## 06 // GOOGLE DRIVE VAULT SYNC SETUP (STEP-BY-STEP)

This app features a private Google Drive Vault sync. It connects directly to your personal Google Drive via a lightweight Google Apps Script Webhook. No third-party accounts, no server databases.

```
[DESKTOP]  ──(PUSH)──>  [GOOGLE DRIVE VAULT]  ──(PULL)──>  [PHONE / MOBILE]
```

### Step 1: Create the Webhook in Google Drive (Takes 2 minutes)
1. Open [Google Drive](https://drive.google.com).
2. Click **`+ New`** ➔ **`More`** ➔ **`Google Apps Script`** (or go to [script.google.com](https://script.google.com)).
3. Delete any default code in the editor, and paste this exact script:

```javascript
function doGet(e) {
  var code = (e && e.parameter && e.parameter.code) ? e.parameter.code : 'DEFAULT';
  var prop = PropertiesService.getUserProperties();
  var data = prop.getProperty('vault_' + code);
  return ContentService.createTextOutput(data || '{}')
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var code = (e && e.parameter && e.parameter.code) ? e.parameter.code : 'DEFAULT';
  var body = e.postData.contents;
  var prop = PropertiesService.getUserProperties();
  prop.setProperty('vault_' + code, body);
  return ContentService.createTextOutput(JSON.stringify({ status: 'ok', code: code }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

### Step 2: Deploy as a Web App
1. In Google Apps Script, click the blue **`Deploy`** button at the top right ➔ **`New deployment`**.
2. Click the gear icon (`Select type`) ➔ choose **`Web app`**.
3. Fill in the fields:
   * **Description:** `Routine Tracker Vault`
   * **Execute as:** `Me (your email)`
   * **Who has access:** `Anyone` *(Note: Access is secured by your private 6-character Sync Code)*.
4. Click **`Deploy`**.
5. Copy the **Web App URL** (it looks like `https://script.google.com/macros/s/.../exec`).

### Step 3: Link Your Devices
1. In the Routine Tracker app, click **`[SYS_BACKUP]`** ➔ **`Google Drive Vault Settings`**.
2. Paste your **Web App URL** into the URL box.
3. Note your **6-character Sync Code** (e.g. `AX79KZ`) or generate a custom one.
4. Click **`[UPLOAD TO CLOUD (PUSH)]`** on your primary device.
5. On your phone (or second device):
   * Open the app.
   * Open **`[SYS_BACKUP]`**, paste the same **Web App URL**, and enter the same **Sync Code**.
   * Click **`[FETCH FROM CLOUD (PULL)]`**.
   * Both devices are now completely synchronized!

---

## 07 // SELF-HOSTING & LOCAL INSTALLATION

To run this application locally or host it on your own server:

### Prerequisites
* [Node.js](https://nodejs.org) (v18 or higher)
* `npm` (v9 or higher)

### Installation
```bash
# 1. Clone the repository
git clone https://github.com/your-username/routine-tracker.git
cd routine-tracker

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
```

The app will be running at `http://localhost:3000`.

### Production Build & Preview
```bash
# Type check and lint
npm run lint

# Build production bundle
npm run build

# Preview production build locally
npm run preview
```

### PWA / Mobile Installation
* Open the application in **Chrome** (Android/Desktop) or **Safari** (iOS).
* In Chrome: Click the **Install** icon in the address bar.
* In Safari (iOS): Tap **Share** ➔ **Add to Home Screen**.
* The app will run as a standalone, fullscreen native-like application with full offline support.

---

```
====================================================================================================
  [STATUS: OPERATIONAL] // REMIX ALTERNATING ROUTINE TRACKER // STRICT HIGH-CONTRAST MONOCHROME
====================================================================================================
```
