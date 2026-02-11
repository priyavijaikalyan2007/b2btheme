<!-- AGENT: Product Requirements Document for the ProgressModal component — structure, behaviour, API, and accessibility requirements. -->

# Progress Modal Component

**Status:** Draft
**Component name:** ProgressModal
**Folder:** `./components/progressmodal/`
**Spec author:** Agent
**Date:** 2026-02-10

---

## 1. Overview

### 1.1 What Is It

A progress modal is a dialog overlay that communicates the status of a long-running operation to the user. It supports two fundamental modes:

1. **Indeterminate mode** ("infinite spin") — The operation's progress cannot be quantified. A spinning animation tells the user "work is happening" without predicting when it will finish.
2. **Determinate mode** ("updatable progress") — The operation's progress is measurable. A progress bar fills proportionally, optionally showing step counts (e.g., "Step 3 of 7") or percentages (e.g., "50%").

Both modes support a **scrollable detail log** — a panel within the modal that displays timestamped status messages as the operation proceeds (e.g., "Step 1: Connected to server", "Step 2: Uploading file…", "Step 3: Done. Saved data."). This gives the user visibility into what is happening behind the scenes.

When the operation completes (successfully or with an error), the modal transitions to a **completed state** where a close button becomes active.

### 1.2 Why Build It

Enterprise SaaS applications frequently perform multi-step operations that take seconds to minutes:

- Importing large datasets
- Running batch updates across records
- Deploying configurations to multiple servers
- Generating reports from complex queries
- Synchronising data between systems

Without a dedicated progress component, developers either block the UI with no feedback (frustrating), show a simple spinner with no detail (opaque), or build bespoke progress dialogs for each operation (inconsistent). A reusable, programmable progress modal solves all three problems.

### 1.3 Design Inspiration

| Source | Key Pattern Adopted |
|--------|-------------------|
| **Windows File Copy dialog** | Progress bar with step details, scrollable log of operations |
| **macOS Installer progress** | Indeterminate spinner transitioning to determinate bar; status text updates |
| **GitHub Actions / CI runners** | Scrollable timestamped log of step outputs |
| **VS Code "Running Task" panel** | Auto-scrolling output log with step markers |
| **Bootstrap Modal** | Modal dialog structure, backdrop, focus trapping |

---

## 2. User Experience

### 2.1 Visual Design

The modal is a centred dialog with a fixed layout:

#### 2.1.1 Indeterminate Mode

```
┌──────────────────────────────────────────────┐
│  Importing Data...                           │  <-- Title
├──────────────────────────────────────────────┤
│                                              │
│               ◠ ◡ ◠ ◡  (spinner)             │  <-- Animated spinner
│                                              │
│  Connecting to server...                     │  <-- Status text (updates)
│                                              │
│  ┌──────────────────────────────────────┐    │
│  │ 10:30:01  Initialising connection... │    │  <-- Scrollable detail log
│  │ 10:30:02  Authenticating...          │    │
│  │ 10:30:03  Connected to db-prod-01    │    │
│  │ 10:30:04  Fetching schema...         │    │  <-- Auto-scrolls to bottom
│  └──────────────────────────────────────┘    │
│                                              │
├──────────────────────────────────────────────┤
│                              [ Cancel ]      │  <-- Footer: Cancel only while running
└──────────────────────────────────────────────┘
```

#### 2.1.2 Determinate Mode (Percentage)

```
┌──────────────────────────────────────────────┐
│  Uploading Files                             │  <-- Title
├──────────────────────────────────────────────┤
│                                              │
│  ████████████░░░░░░░░░░░░░░  47%            │  <-- Progress bar with %
│                                              │
│  Uploading report-Q4.xlsx (3 of 7)...        │  <-- Status text
│                                              │
│  ┌──────────────────────────────────────┐    │
│  │ 10:30:01  ✓ budget-2026.xlsx        │    │
│  │ 10:30:03  ✓ forecast.csv            │    │
│  │ 10:30:05  ⟳ report-Q4.xlsx...       │    │  <-- Current step animated
│  └──────────────────────────────────────┘    │
│                                              │
├──────────────────────────────────────────────┤
│                              [ Cancel ]      │
└──────────────────────────────────────────────┘
```

#### 2.1.3 Determinate Mode (Steps)

```
┌──────────────────────────────────────────────┐
│  Database Migration                          │
├──────────────────────────────────────────────┤
│                                              │
│  Step 3 of 5                                 │  <-- Step counter
│  ████████████████░░░░░░░░░░  60%            │  <-- Progress bar
│                                              │
│  Running migration: add_user_roles_table     │  <-- Status text
│                                              │
│  ┌──────────────────────────────────────┐    │
│  │ 10:30:01  ✓ Step 1: Backup created  │    │
│  │ 10:30:12  ✓ Step 2: Schema updated  │    │
│  │ 10:30:15  ⟳ Step 3: Adding table... │    │
│  └──────────────────────────────────────┘    │
│                                              │
├──────────────────────────────────────────────┤
│                              [ Cancel ]      │
└──────────────────────────────────────────────┘
```

#### 2.1.4 Completed State (Success)

```
┌──────────────────────────────────────────────┐
│  Database Migration                          │
├──────────────────────────────────────────────┤
│                                              │
│  ✓  Complete                                 │  <-- Success icon + text
│  ██████████████████████████  100%            │  <-- Full bar (green)
│                                              │
│  All 5 steps completed successfully.         │  <-- Final status text
│                                              │
│  ┌──────────────────────────────────────┐    │
│  │ 10:30:01  ✓ Step 1: Backup created  │    │
│  │ 10:30:12  ✓ Step 2: Schema updated  │    │
│  │ 10:30:15  ✓ Step 3: Table added     │    │
│  │ 10:30:18  ✓ Step 4: Indexes created │    │
│  │ 10:30:20  ✓ Step 5: Verified        │    │
│  └──────────────────────────────────────┘    │
│                                              │
├──────────────────────────────────────────────┤
│                              [ Close ]       │  <-- Close button (enabled)
└──────────────────────────────────────────────┘
```

#### 2.1.5 Completed State (Error)

```
┌──────────────────────────────────────────────┐
│  Database Migration                          │
├──────────────────────────────────────────────┤
│                                              │
│  ✗  Failed                                   │  <-- Error icon + text (red)
│  ████████████████░░░░░░░░░░  60%            │  <-- Bar frozen at failure point
│                                              │
│  Migration failed at step 3.                 │  <-- Error status text
│                                              │
│  ┌──────────────────────────────────────┐    │
│  │ 10:30:01  ✓ Step 1: Backup created  │    │
│  │ 10:30:12  ✓ Step 2: Schema updated  │    │
│  │ 10:30:15  ✗ Step 3: Table creation  │    │  <-- Failed step in red
│  │              failed: duplicate column│    │
│  └──────────────────────────────────────┘    │
│                                              │
├──────────────────────────────────────────────┤
│                     [ Retry ]  [ Close ]     │  <-- Retry (optional) + Close
└──────────────────────────────────────────────┘
```

**Key visual properties:**

- The modal uses Bootstrap's modal structure (centred, backdrop, shadow).
- The spinner in indeterminate mode uses a CSS-animated rotating ring (`border-spinner` pattern) in `$primary` colour.
- The progress bar uses Bootstrap's `.progress` / `.progress-bar` classes with `$primary` fill.
- On success, the progress bar transitions to `$success` colour.
- On error, the progress bar colour remains at its current position and the status area turns `$danger`.
- The detail log panel has a fixed max-height with `overflow-y: auto` and auto-scrolls to the latest entry.
- Log entries with a `✓` prefix use `$success` colour. Entries with `✗` use `$danger`. Current/in-progress entries use `$primary`.
- Timestamps in the log use `$gray-500` colour and `$font-family-monospace` font.
- The Close button is only enabled when the operation is complete (success or error).
- The Cancel button is only visible while the operation is running.
- The Retry button appears on error only if an `onRetry` callback is provided.
- All elements use zero border-radius per the enterprise theme.
- All sizing uses theme variables.

### 2.2 Detail Log

The detail log is a scrollable panel that displays operational messages:

- Each entry has an optional timestamp (configurable via `showTimestamps`, default: `true`).
- Each entry has a **level**: `info`, `success`, `error`, `warning`, `progress`.
- The `progress` level indicates an in-progress step (shown with an animated spinner icon).
- New entries are appended to the bottom. The panel auto-scrolls to the latest entry unless the user has manually scrolled up (scroll-lock behaviour).
- The log can be hidden entirely via `showDetailLog: false` for simple use cases.
- The log panel has a maximum height of ~200px (configurable via CSS) after which it scrolls.
- A "Copy log" button (clipboard icon) in the top-right corner of the log panel copies all log entries as plain text.

### 2.3 Sizing

The modal uses a fixed width appropriate for progress display:

| Size | CSS class | Width |
|------|-----------|-------|
| Default | (none) | Bootstrap `modal-dialog` default (~500px) |
| Wide | `.progressmodal-wide` | Bootstrap `modal-lg` (~800px) — for long log messages |

---

## 3. Behaviour

### 3.1 Modal Lifecycle

The progress modal follows a strict lifecycle:

```
[Created] → [Shown/Running] → [Completed] → [Closed/Destroyed]
                  ↑                  │
                  └──── [Retry] ─────┘  (optional, on error only)
```

1. **Created:** The `ProgressModal` instance is constructed. No DOM is rendered yet.
2. **Shown/Running:** `show()` is called. The modal appears with a backdrop. The operation is in progress.
3. **Completed:** `complete()` or `fail()` is called. The spinner/bar stops. Close button becomes active.
4. **Closed/Destroyed:** The user clicks Close (or the consumer calls `close()`). The modal is removed from the DOM.

### 3.2 Mode Transitions

A progress modal can transition from indeterminate to determinate mid-operation:

- Call `setProgress(0.5)` on a modal that was initially indeterminate → the spinner is replaced by a progress bar at 50%.
- This is useful when an operation discovers its total scope partway through (e.g., "counting records… found 1000, now processing 1 of 1000").

The reverse (determinate → indeterminate) is also supported via `setIndeterminate()`.

### 3.3 Backdrop and Dismissal

- The modal has a backdrop that **cannot be clicked to dismiss** while the operation is running. This prevents accidental closure mid-operation.
- Pressing `Escape` does **not** close the modal while running.
- Once completed, `Escape` closes the modal and the backdrop becomes dismissible (if `allowBackdropClose` is `true`, default: `false`).
- The `×` close button in the header is **only visible** in the completed state.

### 3.4 Cancel Behaviour

- If an `onCancel` callback is provided, a Cancel button appears in the footer while the operation is running.
- Clicking Cancel calls the `onCancel` callback. The consumer is responsible for actually stopping the operation.
- After calling `onCancel`, the Cancel button shows "Cancelling…" and is disabled until the consumer calls `fail()` or `complete()`.
- If no `onCancel` callback is provided, the Cancel button is not rendered and the user must wait for the operation to finish.

### 3.5 Auto-Close

- When `autoClose` is set to a number (milliseconds), the modal automatically closes that many milliseconds after `complete()` is called.
- Default: `0` (no auto-close; user must click Close).
- Auto-close only applies to successful completion, not errors.

---

## 4. Keyboard Interactions

| Key | Running state | Completed state |
|-----|--------------|-----------------|
| `Escape` | No effect (modal cannot be dismissed) | Closes the modal |
| `Enter` | Triggers Cancel (if Cancel button is focused) | Triggers Close (or Retry if focused) |
| `Tab` | Cycles through Cancel button and Copy Log button | Cycles through Retry, Close, Copy Log buttons |

---

## 5. Accessibility (ARIA)

### 5.1 Roles and Attributes

| Element | Role / Attribute | Value |
|---------|-----------------|-------|
| Modal wrapper | `role` | `dialog` |
| Modal wrapper | `aria-modal` | `true` |
| Modal wrapper | `aria-labelledby` | ID of the title element |
| Modal wrapper | `aria-describedby` | ID of the status text element |
| Progress bar | `role` | `progressbar` |
| Progress bar | `aria-valuenow` | Current percentage (0–100) or absent for indeterminate |
| Progress bar | `aria-valuemin` | `0` |
| Progress bar | `aria-valuemax` | `100` |
| Progress bar | `aria-label` | "Operation progress" |
| Spinner (indeterminate) | `role` | `status` |
| Spinner (indeterminate) | `aria-label` | "Operation in progress" |
| Status text | `aria-live` | `polite` |
| Detail log container | `role` | `log` |
| Detail log container | `aria-label` | "Operation details" |
| Detail log container | `aria-live` | `polite` |
| Cancel button | `aria-label` | "Cancel operation" |
| Close button | `aria-label` | "Close dialog" |
| Copy log button | `aria-label` | "Copy log to clipboard" |

### 5.2 Focus Management

- When the modal opens, focus moves to the modal container.
- Focus is trapped within the modal while it is open (standard modal focus trapping).
- When the modal transitions to the completed state, focus moves to the Close button.
- When the modal closes, focus returns to the element that was focused before the modal opened.

### 5.3 Screen Reader Announcements

- The status text uses `aria-live="polite"` so updates are announced without interrupting the user.
- The detail log uses `role="log"` so new entries are announced.
- On completion, the success or error state is announced via the status text update.
- The progress bar percentage is announced as it changes (screen readers poll `aria-valuenow`).

---

## 6. API

### 6.1 TypeScript Interfaces

```typescript
/**
 * A single entry in the progress detail log.
 */
interface ProgressLogEntry
{
    /** The message text. */
    message: string;

    /** Log level determining the icon and colour. Default: "info". */
    level?: "info" | "success" | "error" | "warning" | "progress";

    /** Timestamp. Auto-generated if not provided. */
    timestamp?: Date;
}

/**
 * Configuration options for the ProgressModal component.
 */
interface ProgressModalOptions
{
    /** Modal title text. */
    title: string;

    /** Initial mode. Default: "indeterminate". */
    mode?: "indeterminate" | "determinate";

    /** Initial status text displayed below the spinner or progress bar. */
    statusText?: string;

    /** Total number of steps (for step-counter display). When set, the modal
     *  shows "Step N of totalSteps" above the progress bar. */
    totalSteps?: number;

    /** Show timestamps in the detail log. Default: true. */
    showTimestamps?: boolean;

    /** Show the scrollable detail log panel. Default: true. */
    showDetailLog?: boolean;

    /** Show the "Copy log" button on the detail log. Default: true. */
    showCopyLog?: boolean;

    /** Automatically close the modal N milliseconds after successful completion.
     *  0 = no auto-close (user must click Close). Default: 0. */
    autoClose?: number;

    /** Allow clicking the backdrop to close the modal once completed. Default: false. */
    allowBackdropClose?: boolean;

    /** Use wide layout for long log messages. Default: false. */
    wide?: boolean;

    /** Callback fired when the user clicks Cancel. If not provided, Cancel button is not shown. */
    onCancel?: () => void;

    /** Callback fired when the user clicks Retry (only on error). If not provided, Retry button is not shown. */
    onRetry?: () => void;

    /** Callback fired when the modal is closed (after completion). */
    onClose?: () => void;
}
```

### 6.2 Class API

```typescript
class ProgressModal
{
    /**
     * Creates a new ProgressModal. Does not show it until show() is called.
     *
     * @param options - Configuration options
     */
    constructor(options: ProgressModalOptions);

    /**
     * Shows the modal and begins the running state.
     * Optionally accepts initial log entries to display immediately.
     */
    show(initialEntries?: ProgressLogEntry[]): void;

    /**
     * Updates the status text displayed below the spinner/progress bar.
     */
    setStatus(text: string): void;

    /**
     * Sets the progress to a specific fraction (0.0 to 1.0).
     * Switches from indeterminate to determinate mode if currently indeterminate.
     */
    setProgress(fraction: number): void;

    /**
     * Sets the current step number (1-based) for step-counter display.
     * Automatically calculates the progress fraction from currentStep / totalSteps.
     */
    setStep(currentStep: number): void;

    /**
     * Switches the modal to indeterminate mode (spinning, no progress bar).
     */
    setIndeterminate(): void;

    /**
     * Appends one or more entries to the detail log.
     */
    log(entry: ProgressLogEntry | ProgressLogEntry[]): void;

    /**
     * Convenience: appends an info-level log entry.
     */
    logInfo(message: string): void;

    /**
     * Convenience: appends a success-level log entry.
     */
    logSuccess(message: string): void;

    /**
     * Convenience: appends an error-level log entry.
     */
    logError(message: string): void;

    /**
     * Convenience: appends a warning-level log entry.
     */
    logWarning(message: string): void;

    /**
     * Marks the operation as successfully completed.
     * Progress bar fills to 100% and turns green. Close button becomes active.
     *
     * @param statusText - Optional final status message.
     */
    complete(statusText?: string): void;

    /**
     * Marks the operation as failed.
     * Progress bar freezes. Error state is shown. Close button becomes active.
     *
     * @param statusText - Optional error message.
     */
    fail(statusText?: string): void;

    /**
     * Closes and removes the modal from the DOM.
     * Can only be called after complete() or fail().
     */
    close(): void;

    /**
     * Returns all log entries as an array.
     */
    getLog(): ProgressLogEntry[];

    /**
     * Returns the log as a plain text string (for clipboard or export).
     */
    getLogText(): string;

    /**
     * Returns true if the modal is currently visible.
     */
    isVisible(): boolean;

    /**
     * Returns the current state: "running", "completed", "failed", or "closed".
     */
    getState(): "running" | "completed" | "failed" | "closed";

    /**
     * Removes the modal from the DOM and cleans up all event listeners.
     */
    destroy(): void;
}
```

### 6.3 Convenience Functions

```typescript
/**
 * Shows an indeterminate progress modal in a single call.
 * Returns the instance for further updates.
 */
function showProgressModal(options: ProgressModalOptions): ProgressModal;

/**
 * Shows a determinate progress modal pre-configured with step count.
 * Returns the instance for further updates.
 */
function showSteppedProgressModal(
    title: string,
    totalSteps: number,
    options?: Partial<ProgressModalOptions>): ProgressModal;
```

### 6.4 Global Exports

For consumers using `<script>` tags:

```typescript
window.ProgressModal = ProgressModal;
window.showProgressModal = showProgressModal;
window.showSteppedProgressModal = showSteppedProgressModal;
```

---

## 7. HTML Structure (Rendered Output)

```html
<!-- Backdrop -->
<div class="progressmodal-backdrop"></div>

<!-- Modal -->
<div
    class="progressmodal"
    id="progressmodal-1"
    role="dialog"
    aria-modal="true"
    aria-labelledby="progressmodal-1-title"
    aria-describedby="progressmodal-1-status"
>
    <div class="progressmodal-dialog">
        <div class="progressmodal-content">

            <!-- Header -->
            <div class="progressmodal-header">
                <h5 class="progressmodal-title" id="progressmodal-1-title">
                    Importing Data...
                </h5>
                <!-- Close button: only visible when completed -->
                <button
                    type="button"
                    class="btn-close progressmodal-close-btn"
                    aria-label="Close dialog"
                    style="display: none;"
                ></button>
            </div>

            <!-- Body -->
            <div class="progressmodal-body">

                <!-- Spinner (indeterminate mode) -->
                <div class="progressmodal-spinner" role="status" aria-label="Operation in progress">
                    <div class="progressmodal-spinner-ring"></div>
                </div>

                <!-- Progress bar (determinate mode, hidden when indeterminate) -->
                <div class="progressmodal-progress-section" style="display: none;">
                    <div class="progressmodal-step-counter">
                        Step <span class="progressmodal-current-step">0</span>
                        of <span class="progressmodal-total-steps">0</span>
                    </div>
                    <div class="progress progressmodal-bar-container">
                        <div
                            class="progress-bar progressmodal-bar"
                            role="progressbar"
                            aria-valuenow="0"
                            aria-valuemin="0"
                            aria-valuemax="100"
                            aria-label="Operation progress"
                            style="width: 0%;"
                        ></div>
                    </div>
                    <div class="progressmodal-percentage">0%</div>
                </div>

                <!-- Status text -->
                <div class="progressmodal-status" id="progressmodal-1-status" aria-live="polite">
                    Connecting to server...
                </div>

                <!-- Detail log -->
                <div class="progressmodal-log-container">
                    <button
                        type="button"
                        class="progressmodal-copy-log-btn"
                        aria-label="Copy log to clipboard"
                        title="Copy log"
                    >
                        <i class="bi bi-clipboard"></i>
                    </button>
                    <div class="progressmodal-log" role="log" aria-label="Operation details" aria-live="polite">
                        <div class="progressmodal-log-entry progressmodal-log-info">
                            <span class="progressmodal-log-timestamp">10:30:01</span>
                            <span class="progressmodal-log-icon">
                                <i class="bi bi-info-circle"></i>
                            </span>
                            <span class="progressmodal-log-message">Initialising connection...</span>
                        </div>
                        <div class="progressmodal-log-entry progressmodal-log-success">
                            <span class="progressmodal-log-timestamp">10:30:03</span>
                            <span class="progressmodal-log-icon">
                                <i class="bi bi-check-circle-fill"></i>
                            </span>
                            <span class="progressmodal-log-message">Connected to db-prod-01</span>
                        </div>
                        <div class="progressmodal-log-entry progressmodal-log-progress">
                            <span class="progressmodal-log-timestamp">10:30:04</span>
                            <span class="progressmodal-log-icon">
                                <div class="progressmodal-log-spinner"></div>
                            </span>
                            <span class="progressmodal-log-message">Fetching schema...</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div class="progressmodal-footer">
                <button type="button" class="btn btn-secondary progressmodal-cancel-btn"
                        aria-label="Cancel operation">
                    Cancel
                </button>
                <button type="button" class="btn btn-primary progressmodal-retry-btn"
                        aria-label="Retry operation" style="display: none;">
                    Retry
                </button>
                <button type="button" class="btn btn-primary progressmodal-done-btn"
                        aria-label="Close dialog" style="display: none;">
                    Close
                </button>
            </div>
        </div>
    </div>
</div>
```

---

## 8. SCSS Styling

### 8.1 Class Naming

All classes are prefixed with `progressmodal-`:

| Class | Element |
|-------|---------|
| `.progressmodal` | Outer modal wrapper |
| `.progressmodal-backdrop` | Semi-transparent backdrop overlay |
| `.progressmodal-dialog` | Centred dialog container |
| `.progressmodal-content` | Content wrapper (border, shadow) |
| `.progressmodal-header` | Header with title and close button |
| `.progressmodal-title` | Modal title text |
| `.progressmodal-close-btn` | Header close button (×), only in completed state |
| `.progressmodal-body` | Main body area |
| `.progressmodal-spinner` | Indeterminate spinner container |
| `.progressmodal-spinner-ring` | Animated spinning ring |
| `.progressmodal-progress-section` | Determinate progress area (step counter + bar + %) |
| `.progressmodal-step-counter` | "Step N of M" text |
| `.progressmodal-current-step` | Current step number span |
| `.progressmodal-total-steps` | Total step count span |
| `.progressmodal-bar-container` | Bootstrap `.progress` wrapper |
| `.progressmodal-bar` | Bootstrap `.progress-bar` fill element |
| `.progressmodal-bar-success` | Green fill on completion |
| `.progressmodal-bar-error` | Frozen bar on error |
| `.progressmodal-percentage` | Percentage text (e.g., "47%") |
| `.progressmodal-status` | Status text below progress indicator |
| `.progressmodal-status-success` | Green status text on completion |
| `.progressmodal-status-error` | Red status text on error |
| `.progressmodal-log-container` | Log panel wrapper (relative positioning for copy button) |
| `.progressmodal-log` | Scrollable log area |
| `.progressmodal-log-entry` | Single log entry row |
| `.progressmodal-log-timestamp` | Timestamp text |
| `.progressmodal-log-icon` | Icon area (check, cross, spinner, info) |
| `.progressmodal-log-message` | Message text |
| `.progressmodal-log-info` | Info-level entry styling |
| `.progressmodal-log-success` | Success-level entry styling (green icon) |
| `.progressmodal-log-error` | Error-level entry styling (red icon) |
| `.progressmodal-log-warning` | Warning-level entry styling (yellow icon) |
| `.progressmodal-log-progress` | In-progress entry styling (animated spinner icon) |
| `.progressmodal-log-spinner` | Small inline spinner for progress-level entries |
| `.progressmodal-copy-log-btn` | Copy log to clipboard button |
| `.progressmodal-footer` | Footer with action buttons |
| `.progressmodal-cancel-btn` | Cancel button |
| `.progressmodal-retry-btn` | Retry button (error state only) |
| `.progressmodal-done-btn` | Close/Done button (completed state only) |
| `.progressmodal-wide` | Wide layout variant |
| `.progressmodal-completed` | State class added on success |
| `.progressmodal-failed` | State class added on error |

### 8.2 Styling Rules

- All colours, fonts, spacing, and borders use SCSS variables from `_variables.scss`.
- No hardcoded hex values, pixel sizes, or font names.
- The modal uses `position: fixed` with `z-index: 1055` (above standard Bootstrap modals).
- The backdrop uses `background-color: rgba($gray-900, 0.5)`.
- The spinner ring uses a CSS `@keyframes` animation with `border` and `border-top-color: $primary`.
- The progress bar uses Bootstrap's `.progress` and `.progress-bar` with `background-color: $primary`.
- On success, the bar transitions to `background-color: $success` via CSS transition.
- Log timestamps use `font-family: $font-family-monospace; color: $gray-500; font-size: $font-size-sm`.
- Log entries use alternating subtle background (`$gray-50` on even rows) for readability.
- The log container uses `max-height: 200px; overflow-y: auto`.
- The copy-log button is positioned `position: absolute; top: 0.5rem; right: 0.5rem` within the log container.
- The inline log spinner is a smaller version of the main spinner (`12px × 12px`).
- SCSS nesting is limited to 3 levels per `CODING_STYLE.md`.

### 8.3 Animations

| Animation | CSS |
|-----------|-----|
| Spinner ring rotation | `@keyframes progressmodal-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }` — `animation: progressmodal-spin 1s linear infinite` |
| Progress bar fill | `transition: width 0.3s ease` |
| Progress bar colour change (success) | `transition: background-color 0.5s ease` |
| Modal fade-in | `opacity 0 → 1` over `0.15s` |
| Log entry appearance | `opacity 0 → 1` over `0.2s` (subtle) |

---

## 9. Edge Cases

| Scenario | Behaviour |
|----------|-----------|
| `setProgress` called with value > 1.0 | Clamped to 1.0. Console warning logged. |
| `setProgress` called with value < 0 | Clamped to 0. Console warning logged. |
| `setStep` called with step > totalSteps | Clamped to totalSteps. Console warning logged. |
| `complete()` called without ever calling `setProgress` | If indeterminate, spinner disappears. A full green bar is shown briefly. |
| `fail()` called at 0% progress | Bar stays at 0%. Error state shown. |
| `close()` called while running | Console warning logged. Modal is not closed. Use `fail()` or `complete()` first. |
| `show()` called when already visible | Console warning logged. No effect. |
| Log panel scroll-lock | If user scrolls up in the log, auto-scroll pauses. Scrolling to the bottom resumes auto-scroll. |
| Very long log messages | Text wraps within the log entry. No horizontal scroll. |
| 1000+ log entries | Log entries are DOM nodes; no virtualisation. Performance is acceptable for typical use (< 500 entries). |
| `autoClose` with error | Auto-close does not trigger on error. User must click Close or Retry. |
| Retry clicked | Calls `onRetry`, resets state to running (spinner or progress bar at 0%). |
| Modal opened over another modal | Z-index ensures the progress modal stacks above. |
| No title provided | Console error logged. Defaults to "Processing…". |

---

## 10. Performance

- **DOM efficiency:** Log entries are simple `<div>` elements appended to a container. No complex rendering.
- **Auto-scroll:** Uses `scrollTop = scrollHeight` which is efficient for append-only logs.
- **Animation:** All animations are CSS-only (no JavaScript animation loops).
- **Progress bar updates:** CSS transition handles smooth bar movement; only the `style.width` and `aria-valuenow` properties are updated.
- **No external dependencies:** No animation libraries or progress bar plugins.

---

## 11. Testing Requirements

### 11.1 Unit Tests (Jest/Vitest with jsdom)

| Test Case | Category |
|-----------|----------|
| `constructor_WithOptions_CreatesInstance` | Initialisation |
| `show_InsertsModalIntoDOM` | Lifecycle |
| `show_IndeterminateMode_ShowsSpinner` | Mode |
| `show_DeterminateMode_ShowsProgressBar` | Mode |
| `show_WithInitialEntries_PopulatesLog` | Log |
| `setStatus_UpdatesStatusText` | Status |
| `setProgress_UpdatesBarWidth` | Progress |
| `setProgress_ClampsAboveOne` | Validation |
| `setProgress_SwitchesFromIndeterminate` | Mode transition |
| `setStep_UpdatesStepCounterAndBar` | Steps |
| `setStep_ClampsAboveTotalSteps` | Validation |
| `setIndeterminate_SwitchesFromDeterminate` | Mode transition |
| `log_AppendsEntry_WithTimestamp` | Log |
| `log_MultipleEntries_AllAppended` | Log |
| `logInfo_AddsInfoEntry` | Log convenience |
| `logSuccess_AddsSuccessEntry` | Log convenience |
| `logError_AddsErrorEntry` | Log convenience |
| `logWarning_AddsWarningEntry` | Log convenience |
| `logProgress_ShowsSpinnerIcon` | Log |
| `complete_ShowsSuccessState` | Lifecycle |
| `complete_BarTurnsGreen` | Visual |
| `complete_EnablesCloseButton` | Lifecycle |
| `complete_HidesCancelButton` | Lifecycle |
| `complete_WithAutoClose_ClosesAfterDelay` | Auto-close |
| `fail_ShowsErrorState` | Lifecycle |
| `fail_FreezesProgressBar` | Visual |
| `fail_ShowsRetryButton_WhenCallbackProvided` | Retry |
| `fail_HidesRetryButton_WhenNoCallback` | Retry |
| `fail_EnablesCloseButton` | Lifecycle |
| `retry_ResetsToRunningState` | Retry |
| `close_AfterComplete_RemovesFromDOM` | Lifecycle |
| `close_WhileRunning_LogsWarning` | Validation |
| `cancel_CallsOnCancelCallback` | Cancel |
| `cancel_ShowsCancellingState` | Cancel |
| `cancel_HiddenWhenNoCallback` | Cancel |
| `escape_WhileRunning_NoEffect` | Keyboard |
| `escape_WhenCompleted_ClosesModal` | Keyboard |
| `backdrop_WhileRunning_NotDismissible` | Interaction |
| `backdrop_WhenCompleted_DismissibleIfConfigured` | Interaction |
| `focusTrap_TabCyclesWithinModal` | Accessibility |
| `focusReturn_AfterClose_ReturnsToPrevious` | Accessibility |
| `scrollLock_ManualScrollUp_PausesAutoScroll` | Log |
| `scrollLock_ScrollToBottom_ResumesAutoScroll` | Log |
| `copyLog_CopiesPlainTextToClipboard` | Log |
| `getLog_ReturnsAllEntries` | API |
| `getLogText_ReturnsFormattedText` | API |
| `getState_ReturnsCorrectState` | API |
| `isVisible_ReflectsModalState` | API |
| `aria_ProgressBar_HasCorrectAttributes` | Accessibility |
| `aria_StatusText_IsLiveRegion` | Accessibility |
| `aria_Log_HasLogRole` | Accessibility |
| `destroy_RemovesAllDOM_CleansUpListeners` | Lifecycle |
| `showProgressModal_ConvenienceFunction_Works` | Convenience |
| `showSteppedProgressModal_ConvenienceFunction_Works` | Convenience |

### 11.2 Visual Verification

After implementation, visually verify in the demo page:

- Indeterminate spinner animates smoothly
- Progress bar fills smoothly with correct percentage
- Step counter updates correctly
- Bar turns green on success, freezes on error
- Status text updates in real time
- Log entries appear with correct icons and colours
- Log auto-scrolls; manual scroll-up pauses auto-scroll
- Copy log button copies all entries
- Timestamps display correctly
- Cancel button appears when callback provided, disappears otherwise
- Retry button appears on error when callback provided
- Close button only enabled after completion
- Escape key behaviour differs between running and completed states
- Modal cannot be dismissed by clicking backdrop while running
- Focus trapping works correctly
- Wide layout accommodates long messages

### 11.3 Cross-Browser

Test in Chrome, Firefox, Safari, and Edge for consistent rendering, animation, and keyboard behaviour.

---

## 12. Demo Page Integration

Add a section to `demo/index.html` titled "Progress Modal" that demonstrates:

1. **Indeterminate spinner** — Button that opens a modal with a spinning wheel, logs a few messages over 3 seconds, then completes.
2. **Determinate progress (percentage)** — Button that runs a simulated upload at 10% increments with log entries per step.
3. **Determinate progress (steps)** — Button that runs 5 named steps with 1-second intervals, showing "Step N of 5" and a log entry per step.
4. **Indeterminate → Determinate transition** — Starts with a spinner ("Counting records…"), then switches to a progress bar after 2 seconds.
5. **Error scenario** — Runs 3 steps then fails on step 4 with an error log entry and Retry button.
6. **Cancel scenario** — Shows a Cancel button that stops the operation mid-progress.
7. **Auto-close** — Completes and auto-closes after 2 seconds.
8. **No detail log** — `showDetailLog: false` for a minimal spinner-only modal.
9. **Wide layout** — Long log messages in wide modal.
10. **Programmatic control** — Buttons to manually call `setProgress()`, `setStatus()`, `logInfo()`, `logError()`, `complete()`, `fail()`, `close()`.

---

## 13. File Structure

```
components/
└── progressmodal/
    ├── progressmodal.ts           # Component logic
    ├── progressmodal.scss         # Component styles
    ├── progressmodal.test.ts      # Unit tests
    └── README.md                  # Component documentation
```

Output in `dist/`:

```
dist/
└── components/
    └── progressmodal/
        ├── progressmodal.js       # Compiled JavaScript
        ├── progressmodal.css      # Compiled CSS
        └── progressmodal.d.ts     # TypeScript declarations
```

---

## 14. Dependencies

| Dependency | Required | Notes |
|------------|----------|-------|
| Bootstrap 5 CSS | Yes | For `.progress`, `.progress-bar`, `.btn`, modal-like structure |
| Bootstrap 5 JS | No | This component manages its own modal lifecycle (no Bootstrap Modal plugin). |
| Bootstrap Icons | Yes | For `bi-info-circle`, `bi-check-circle-fill`, `bi-x-circle-fill`, `bi-exclamation-triangle-fill`, `bi-clipboard` |
| Enterprise Theme CSS | Yes | For theme variable overrides |

Note: This component does **not** depend on Bootstrap's Modal JS plugin. It renders its own modal structure, backdrop, and focus trapping to ensure full control over the running-state dismissal rules.

---

## 15. Definition of Done

- [ ] TypeScript component compiles without errors
- [ ] SCSS compiles without errors via `npm run build`
- [ ] All unit tests pass
- [ ] Component renders correctly in `demo/index.html`
- [ ] All keyboard interactions work as specified
- [ ] ARIA attributes are correct (verified with axe-core or manual inspection)
- [ ] Focus trapping and focus return work correctly
- [ ] Indeterminate spinner animates smoothly
- [ ] Determinate progress bar fills correctly with percentage
- [ ] Step counter works correctly
- [ ] Mode transition (indeterminate ↔ determinate) works
- [ ] Detail log scrolls, auto-scrolls, and supports scroll-lock
- [ ] Copy log button works
- [ ] Log entry levels display correct icons and colours
- [ ] Complete state: green bar, Close button enabled, Cancel hidden
- [ ] Error state: frozen bar, red status, Retry button (when callback provided)
- [ ] Cancel button calls callback and shows "Cancelling…"
- [ ] Auto-close works on success
- [ ] Backdrop and Escape are non-dismissible while running
- [ ] `COMPONENTS.md` is updated with the new component entry
- [ ] `agentknowledge/concepts.yaml` is updated
- [ ] `CONVERSATION.md` is updated
- [ ] Code committed to git
