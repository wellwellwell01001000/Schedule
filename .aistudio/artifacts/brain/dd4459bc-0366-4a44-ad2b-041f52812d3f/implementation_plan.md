# Implementation Plan: Centered Tabbed Settings Console

## 1. Overview & Clarified Design Decisions

Based on user feedback, we are replacing the side slide-out drawer with a **centered full-screen modal dialog** featuring an organized **tabbed interface**.

### Key Architectural Decisions
- **Display Format**: Centered modal overlay window (`w-full max-w-4xl h-[85vh] max-h-[820px]`) centered over a dark backdrop (`bg-black/85`), with support for `Escape` key and `[X CLOSE]`.
- **Navigation Structure**: Top horizontal sub-tab bar inside the modal allowing instantaneous switching between:
  1. `[1] TEMPLATES` // Routine presets & slate setup
  2. `[2] ARCHIVE` // System snapshots, JSON backup & restore
  3. `[3] CATEGORIES` // Category definitions, creation & removal
  4. `[4] CLOUD SYNC` // Google Drive cloud vault, sync code & automated syncing
  5. `[5] SYSTEM` // Walkthrough tutorial, keyboard guide & clean reset
- **Aesthetic**: Brutalist terminal monospace design with high-contrast white borders, tabular figures, and responsive layout.
- **Top Navigation Bar**: Remains streamlined with view tabs (`[1]`, `[2]`, `[3]`), `[+ BULK INGEST]`, and the `[SETTINGS]` button opening the centered modal.

---

## 2. Component Specifications

### A. New Component: `src/components/SettingsModal.tsx`
- **Container**: `fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 font-mono` with backdrop overlay.
- **Modal Window**: `border-2 border-white bg-black w-full max-w-4xl h-[85vh] max-h-[820px] flex flex-col shadow-2xl`.
- **Modal Header**:
  - Left: Title `_SYSTEM_SETTINGS_CONSOLE` and active section indicator (`// TAB: TEMPLATES`).
  - Right: `[X CLOSE]` button and keyboard hint (`[ESC]`).
- **Sub-Tab Navigation Bar**:
  - Horizontal tab row with active state:
    - `[1] TEMPLATES`
    - `[2] ARCHIVE & BACKUP`
    - `[3] CATEGORIES`
    - `[4] CLOUD SYNC`
    - `[5] SYSTEM GUIDE`
  - Keyboard shortcut navigation: pressing `1`–`5` switches tabs while modal is open.
- **Tab Content Panels**:
  1. **Templates Tab**:
     - Visual comparison of built-in templates (Clean Slate, Alternating Split, High-Intensity CS & Lab).
     - Preview of daily schedule structure.
     - Direct `[APPLY TEMPLATE]` button with immediate confirmation toast.
  2. **Archive Tab**:
     - Point-in-time snapshots ledger with timestamps and task count.
     - `[+ CREATE SNAPSHOT NOW]` one-click manual backup button.
     - `[DOWNLOAD .JSON]` file export and `[RESTORE FILE]` file upload input.
     - Clear individual or all snapshots.
  3. **Categories Tab**:
     - Inline category management: view all active categories.
     - Clean `<div>` input for creating new custom categories with Enter key submission.
     - `[REMOVE]` button for each category with safe rollback and count indicator.
  4. **Cloud Sync Tab**:
     - Google Drive Cloud Vault status: active 6-character Sync Code.
     - Direct `[FETCH FROM CLOUD]` and `[UPLOAD TO CLOUD]` buttons.
     - Option to enter/generate custom Sync Code and configure Google Apps Script Webhook URL.
  5. **System Guide Tab**:
     - `[LAUNCH INTERACTIVE TUTORIAL]` to open the step-by-step walkthrough.
     - Quick Reference Cheat Sheet for keyboard shortcuts and routine phases.
     - Danger Zone: `[PURGE ALL DATA & START CLEAN]` with safeguard confirmation.
- **Modal Footer**:
  - Status ticker: `STATUS: ONLINE`, `SYNC CODE: ROUT-XXXX`, `CATEGORIES: N ACTIVE`.
  - `[DONE]` button to dismiss.

### B. Header Component: `src/components/Header.tsx`
- Ensure `[SETTINGS]` button cleanly triggers opening `SettingsModal`.
- Retain the clean, decluttered top bar (View Tabs + Bulk Ingest + Settings).

### C. Application Root: `src/App.tsx`
- Replace `SettingsDrawer` import and mounting with `SettingsModal`.
- Maintain clean callback pass-through for `onApplyTemplate`, `onPurgeAndStartClean`, `onRestoreSystem`, and sync actions.

---

## 3. Step-by-Step Implementation Sequence

1. **Step 1**: Create `src/components/SettingsModal.tsx` with the 5 tabbed sections and full keyboard navigation.
2. **Step 2**: Remove `src/components/SettingsDrawer.tsx` or replace its usage in `src/App.tsx`.
3. **Step 3**: Connect all modal actions (`applyTemplate`, `createSnapshot`, `restoreBackup`, `syncActions`, `categoryActions`).
4. **Step 4**: Verify compilation and linting via `compile_applet` and `lint_applet`.
5. **Step 5**: Test opening the modal, switching between the 5 tabs, applying actions, and closing via `[X CLOSE]`, backdrop, or `Escape`.

---

## 4. Verification & Testing Checklist

- [x] Clicking `[SETTINGS]` in the top header opens the centered full-screen modal (not a side drawer).
- [x] Sub-tabs `[1]` through `[5]` switch cleanly without page reloads or layout shift.
- [x] Templates tab allows previewing and applying routine presets.
- [x] Archive tab lists snapshots and supports immediate snapshot creation and JSON export.
- [x] Categories tab allows adding and removing categories seamlessly without form errors.
- [x] Cloud Sync tab allows syncing with Google Drive and updating sync codes.
- [x] System Guide tab launches the interactive tutorial and provides system docs.
- [x] Pressing `Escape` or clicking `[X CLOSE]` dismisses the modal.
- [x] `compile_applet` and `lint_applet` pass with 0 errors.
