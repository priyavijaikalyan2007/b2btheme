<!-- AGENT: Product Requirements Document for the TimePicker component — structure, behaviour, API, and accessibility requirements. -->

# Time Picker Component

**Status:** Draft
**Component name:** TimePicker
**Folder:** `./components/timepicker/`
**Spec author:** Agent
**Date:** 2026-02-10

---

## 1. Overview

### 1.1 What Is It

A time picker is an input control that allows the user to select a time of day (hours, minutes, and optionally seconds) with an optional timezone selector. It combines a text input displaying the formatted time with a dropdown panel containing spinner columns for each time unit.

The component supports two clock modes:

1. **24-hour mode** (default) — Hours range 00–23. No AM/PM indicator.
2. **12-hour mode** — Hours range 1–12 with an AM/PM toggle column.

An optional timezone selector appends a searchable timezone dropdown to the right of the time input, allowing the user to pair a time with a specific timezone.

This is a standard control needed in enterprise SaaS applications for:

- Scheduling meetings and events across time zones
- Setting deadlines with precise times
- Configuring cron jobs, alerts, and notification windows
- Log viewers and audit timestamps
- Any field requiring a time of day with or without timezone context

### 1.2 Why Build It

Bootstrap 5 does not provide a time picker. The native HTML `<input type="time">` has significant limitations:

- Inconsistent rendering across browsers (Chrome shows spinners, Safari shows plain text)
- No control over 12/24-hour format (follows OS locale)
- No seconds support in some browsers
- No timezone selection capability
- No programmatic API for stepping, min/max times, or disabled time ranges
- Cannot style the input or dropdown

A custom component fills this gap while adhering to the Bootstrap component model and the enterprise theme.

### 1.3 Design Inspiration

| Source | Key Pattern Adopted |
|--------|-------------------|
| **Windows TimePicker** | Spinner columns for hours/minutes/seconds; arrow keys to increment/decrement |
| **macOS NSDatePicker (time mode)** | Inline segmented fields; tab between units |
| **Google Calendar time picker** | Dropdown list of times at intervals; manual input |
| **Material UI TimePicker** | Separate columns with scroll; AM/PM toggle |
| **Moment Timezone / Luxon** | IANA timezone database; searchable timezone list |

---

## 2. User Experience

### 2.1 Visual Design

The component consists of up to three visual parts:

1. **Time input** — A Bootstrap `form-control` input field displaying the formatted time. A clock icon button sits at the right edge.
2. **Time dropdown** — A panel that appears below the input containing scrollable spinner columns for hours, minutes, seconds (optional), and AM/PM (in 12-hour mode).
3. **Timezone selector** (optional) — A separate input to the right of the time input, showing the current timezone abbreviation with a searchable dropdown of IANA timezones.

#### 2.1.1 Time Dropdown (24-hour, with seconds)

```
┌────────────────────────────────────────┐
│  10 : 30 : 45                    [🕐] │  <-- Time input + clock icon
├────────────────────────────────────────┤
│   ┌──────┐  ┌──────┐  ┌──────┐       │
│   │  ▲   │  │  ▲   │  │  ▲   │       │
│   │  09  │  │  29  │  │  44  │       │
│   │ [10] │  │ [30] │  │ [45] │       │  <-- Current values highlighted
│   │  11  │  │  31  │  │  46  │       │
│   │  ▼   │  │  ▼   │  │  ▼   │       │
│   └──────┘  └──────┘  └──────┘       │
│    Hours     Minutes   Seconds        │
├────────────────────────────────────────┤
│  [ Now ]                              │  <-- Sets to current time
├────────────────────────────────────────┤
│  HH:mm:ss  (?)                        │  <-- Format hint + help icon
└────────────────────────────────────────┘
```

#### 2.1.2 Time Dropdown (12-hour, no seconds)

```
┌────────────────────────────────────────┐
│  02 : 30  PM                     [🕐] │
├────────────────────────────────────────┤
│   ┌──────┐  ┌──────┐  ┌──────┐       │
│   │  ▲   │  │  ▲   │  │      │       │
│   │  01  │  │  29  │  │  AM  │       │
│   │ [02] │  │ [30] │  │ [PM] │       │
│   │  03  │  │  31  │  │      │       │
│   │  ▼   │  │  ▼   │  │      │       │
│   └──────┘  └──────┘  └──────┘       │
│    Hours     Minutes   AM/PM          │
├────────────────────────────────────────┤
│  [ Now ]                              │
├────────────────────────────────────────┤
│  hh:mm a  (?)                         │
└────────────────────────────────────────┘
```

#### 2.1.3 With Timezone Selector

```
┌──────────────────────────┬──────────────────────┐
│  10 : 30 : 45      [🕐] │  UTC           [ ▼ ] │  <-- Time input + Timezone input
└──────────────────────────┴──────────────────────┘
                           ┌──────────────────────┐
                           │  🔍 Search...         │
                           ├──────────────────────┤
                           │  UTC (+00:00)         │  <-- Selected (highlighted)
                           │  US/Eastern (-05:00)  │
                           │  US/Central (-06:00)  │
                           │  US/Pacific (-08:00)  │
                           │  Europe/London (+00:00)│
                           │  Europe/Paris (+01:00) │
                           │  Asia/Tokyo (+09:00)  │
                           │  ...                  │
                           └──────────────────────┘
```

**Key visual properties:**

- The time input and clock icon button appear as a single unified control using Bootstrap's `input-group` pattern.
- When the timezone selector is enabled, the time input and timezone input appear side-by-side in a single `input-group`, visually connected.
- The spinner columns are vertically scrollable with up/down arrow buttons at top and bottom.
- The currently selected value in each spinner column is centred and highlighted with `$primary` background and white text.
- Adjacent values above and below the selection are visible but muted.
- The timezone dropdown is a searchable list with offset display (e.g., "US/Eastern (-05:00)").
- All elements use zero border-radius per the enterprise theme.
- All sizing uses theme variables.

### 2.2 Sizing Variants

| Size | CSS class | Input size | Spinner font |
|------|-----------|------------|--------------|
| Small | `.timepicker-sm` | Matches `form-control-sm` | `$font-size-sm` |
| Default | (none) | Matches `form-control` | `$font-size-base` |
| Large | `.timepicker-lg` | Matches `form-control-lg` | `$font-size-lg` |

### 2.3 States

| State | Visual Behaviour |
|-------|-----------------|
| **Default** | Input shows formatted time. Dropdown is closed. |
| **Focused** | Input has Bootstrap focus ring. Dropdown may or may not be open. |
| **Dropdown open** | Spinner panel is visible below (or above) the input. |
| **Disabled** | Input is dimmed. Clock icon is inert. Dropdown cannot open. Uses `$input-disabled-bg`. |
| **Readonly** | Input text is not editable by typing. Dropdown can still open to allow time selection. |
| **Invalid** | Input border turns `$danger`. Shown when manual input cannot be parsed. |

---

## 3. Behaviour

### 3.1 Opening the Dropdown

The time dropdown opens when:

1. The user clicks the clock icon button.
2. The user presses `ArrowDown` or `Alt+ArrowDown` while the input is focused and the dropdown is closed.
3. The user clicks directly on the time input field.

### 3.2 Closing the Dropdown

The dropdown closes when:

1. The user presses `Escape`. Focus returns to the input. Time value is not changed.
2. The user clicks outside the component (blur).
3. The user presses `Enter` (commits the current spinner selection and closes).
4. The user clicks the clock icon button while the dropdown is open.

### 3.3 Spinner Navigation

Each spinner column (hours, minutes, seconds, AM/PM) operates independently:

- **Clicking the up arrow** or **scrolling up** increments the value by one step.
- **Clicking the down arrow** or **scrolling down** decrements the value by one step.
- **Clicking a visible value** directly selects it.
- Values **wrap around**: incrementing past 23 (or 12 in 12-hour mode) wraps to 0 (or 1). Decrementing past 0 (or 1) wraps to 23 (or 12). Minutes and seconds wrap 59 → 0 and 0 → 59.
- **Minute stepping** is configurable via `minuteStep` (default: 1). Common values: 1, 5, 15, 30.
- **Second stepping** is configurable via `secondStep` (default: 1).

### 3.4 Now Button

- A "Now" button is always visible in the dropdown footer.
- Clicking it sets the time to the current system time (in the selected timezone if timezone is enabled) and closes the dropdown.
- The Now button respects `minTime`/`maxTime` constraints — if the current time is outside the allowed range, the Now button is disabled.

### 3.5 Manual Input

- Users may type a time directly into the input field.
- On blur or `Enter`, the component attempts to parse the typed text according to the configured `format`.
- If the parsed time is valid and within range, it becomes the selected time.
- If the parsed time is invalid, the input shows an error state (red border) for 2 seconds, then reverts to the previously valid time. A `console.warn` is logged.

#### 3.5.1 Format Tokens

The `format` option uses the following tokens:

| Token | Meaning | Example |
|-------|---------|---------|
| `HH` | 24-hour hours, zero-padded (00–23) | `09`, `14` |
| `H` | 24-hour hours, no padding (0–23) | `9`, `14` |
| `hh` | 12-hour hours, zero-padded (01–12) | `02`, `11` |
| `h` | 12-hour hours, no padding (1–12) | `2`, `11` |
| `mm` | Minutes, zero-padded (00–59) | `05`, `30` |
| `m` | Minutes, no padding (0–59) | `5`, `30` |
| `ss` | Seconds, zero-padded (00–59) | `00`, `45` |
| `s` | Seconds, no padding (0–59) | `0`, `45` |
| `a` | AM/PM lowercase | `am`, `pm` |
| `A` | AM/PM uppercase | `AM`, `PM` |

The separator between units is configurable as part of the format string. Common formats:

- `HH:mm:ss` — 24-hour with seconds (default)
- `HH:mm` — 24-hour without seconds
- `hh:mm:ss A` — 12-hour with seconds
- `hh:mm A` — 12-hour without seconds
- `HH-mm-ss` — 24-hour with dash separator
- `HH.mm` — 24-hour with dot separator

#### 3.5.2 Format Hint

- A subtle hint text is displayed below the input showing the expected time format (e.g., "HH:mm:ss" or "hh:mm A").
- The hint is always visible when the input is empty or focused, and fades to muted when a valid time is displayed.
- The hint text is configurable via the `formatHint` option. When not provided, it defaults to the value of the `format` option.
- The hint can be hidden entirely by setting `showFormatHint: false`.

#### 3.5.3 Format Help Popup

- A small help icon (`bi-question-circle`) appears at the right side of the format hint text.
- Clicking or hovering over the help icon shows a tooltip explaining the expected format with an example.
- The help text is configurable via `formatHelpText`. When not provided, it auto-generates a message like: "Enter a time in the format HH:mm:ss (e.g., 14:30:00)".
- The help popup can be hidden entirely by setting `showFormatHelp: false`.
- The tooltip is rendered manually (no Bootstrap JS dependency).

### 3.6 Timezone Selector

When `showTimezone` is `true`:

#### 3.6.1 Display

- A second input field appears to the right of the time input, inside the same `input-group`.
- It displays the currently selected timezone abbreviation and offset (e.g., "UTC", "EST -05:00").
- A chevron-down icon on the right indicates it is a dropdown.

#### 3.6.2 Timezone Dropdown

- Clicking the timezone input opens a dropdown with a search field at the top and a scrollable list of timezones below.
- Timezones are sourced from `Intl.supportedValuesOf('timeZone')` (available in modern browsers).
- Each timezone entry shows: IANA name and current UTC offset (e.g., "America/New_York (-05:00)").
- Typing in the search field filters timezones by name or offset.
- Timezones are grouped into regions: UTC, Americas, Europe, Asia, Africa, Pacific, etc.
- The currently selected timezone is highlighted.
- Common timezones (UTC, US/Eastern, US/Central, US/Mountain, US/Pacific, Europe/London, Europe/Paris, Asia/Tokyo) appear at the top of the list as a "Common" group for quick access.

#### 3.6.3 Default Timezone

- Default timezone is **UTC**.
- The initial timezone can be set via the `timezone` option (an IANA timezone string).
- Setting `timezone: "local"` uses the user's browser timezone (`Intl.DateTimeFormat().resolvedOptions().timeZone`).

#### 3.6.4 Timezone Change Behaviour

- When the user changes the timezone, the displayed time does **not** convert. The time value stays the same; only the timezone label changes.
- This is the standard "wall clock" model: if the user selects 10:30 and then changes the timezone from UTC to US/Eastern, the value remains 10:30 US/Eastern (not converted to 05:30 UTC).
- The `onTimezoneChange` callback fires when the timezone changes.

---

## 4. Keyboard Interactions

### 4.1 Input Field (Dropdown Closed)

| Key | Action |
|-----|--------|
| `ArrowDown` / `Alt+ArrowDown` | Opens the time dropdown |
| `ArrowUp` / `ArrowDown` | When cursor is on a time segment in the input, increments/decrements that segment |
| `Escape` | No effect |
| `Enter` | Parses and validates typed input |
| `Tab` | Normal tab behaviour (moves to timezone input if visible, or next element) |

### 4.2 Time Dropdown (Open)

| Key | Action |
|-----|--------|
| `ArrowUp` | Increments the focused spinner column by one step |
| `ArrowDown` | Decrements the focused spinner column by one step |
| `ArrowLeft` | Moves focus to the previous spinner column |
| `ArrowRight` | Moves focus to the next spinner column |
| `PageUp` | Increments the focused column by 10 (hours) or 10 (minutes/seconds) |
| `PageDown` | Decrements the focused column by 10 |
| `Home` | Sets the focused column to its minimum value (0 or 1) |
| `End` | Sets the focused column to its maximum value (23, 59, or 12) |
| `Enter` | Commits the current selection and closes the dropdown |
| `Escape` | Closes the dropdown without changing the time |
| `Tab` | Moves focus to the next spinner column; if on the last column, closes and moves to next element |
| `n` | Sets to current time (mnemonic: "now") |
| `0`–`9` | Numeric entry: typing digits directly sets the value for the focused column |

### 4.3 Timezone Dropdown

| Key | Action |
|-----|--------|
| `ArrowDown` | Highlights the next timezone in the list |
| `ArrowUp` | Highlights the previous timezone |
| `Enter` | Selects the highlighted timezone and closes |
| `Escape` | Closes the dropdown without changing timezone |
| Any printable character | Filters the timezone list |

---

## 5. Accessibility (ARIA)

### 5.1 Roles and Attributes

| Element | Role / Attribute | Value |
|---------|-----------------|-------|
| Time input | `role` | `combobox` |
| Time input | `aria-haspopup` | `dialog` |
| Time input | `aria-expanded` | `true` when dropdown is open |
| Time input | `aria-controls` | ID of the time dropdown |
| Time input | `aria-describedby` | ID of the format hint element |
| Time dropdown | `role` | `dialog` |
| Time dropdown | `aria-modal` | `true` |
| Time dropdown | `aria-label` | "Choose time" |
| Each spinner column | `role` | `spinbutton` |
| Each spinner column | `aria-label` | "Hours" / "Minutes" / "Seconds" / "AM/PM" |
| Each spinner column | `aria-valuenow` | Current numeric value |
| Each spinner column | `aria-valuemin` | Minimum value (0 or 1) |
| Each spinner column | `aria-valuemax` | Maximum value (23, 59, or 12) |
| Spinner up button | `aria-label` | "Increase hours" / "Increase minutes" / etc. |
| Spinner down button | `aria-label` | "Decrease hours" / etc. |
| Timezone input | `role` | `combobox` |
| Timezone input | `aria-expanded` | `true` when timezone dropdown is open |
| Timezone input | `aria-controls` | ID of the timezone listbox |
| Timezone listbox | `role` | `listbox` |
| Each timezone option | `role` | `option` |
| Now button | `aria-label` | "Set to current time" |

### 5.2 Focus Management

- When the time dropdown opens, focus moves to the hours spinner column.
- `Tab` cycles through spinner columns (hours → minutes → seconds → AM/PM → Now button).
- When the dropdown closes, focus returns to the time input.
- The timezone dropdown follows the same combobox focus pattern as the EditableComboBox.

### 5.3 Screen Reader Announcements

- When a spinner value changes, the new value is announced via the `aria-valuenow` change.
- When the dropdown opens/closes, the state is announced via `aria-expanded`.
- The Now button announces the current time when focused.

---

## 6. API

### 6.1 TypeScript Interfaces

```typescript
/**
 * Represents a time value with hours, minutes, optional seconds.
 */
interface TimeValue
{
    /** Hours (0–23). */
    hours: number;

    /** Minutes (0–59). */
    minutes: number;

    /** Seconds (0–59). Omitted when seconds are not shown. */
    seconds?: number;
}

/**
 * Configuration options for the TimePicker component.
 */
interface TimePickerOptions
{
    /** Initial time value. Defaults to the current time. */
    value?: TimeValue;

    /** Clock mode: "12" for 12-hour with AM/PM, "24" for 24-hour. Default: "24". */
    clockMode?: "12" | "24";

    /** Show seconds spinner column. Default: true. */
    showSeconds?: boolean;

    /** Time display format. Default: "HH:mm:ss" (24h) or "hh:mm:ss A" (12h). */
    format?: string;

    /** Minute step interval (1, 5, 15, 30). Default: 1. */
    minuteStep?: number;

    /** Second step interval. Default: 1. */
    secondStep?: number;

    /** Earliest selectable time. Times before this are disabled. */
    minTime?: TimeValue;

    /** Latest selectable time. Times after this are disabled. */
    maxTime?: TimeValue;

    /** Show the "Now" button in the dropdown footer. Default: true. */
    showNowButton?: boolean;

    /** Show the timezone selector. Default: false. */
    showTimezone?: boolean;

    /** Initial timezone (IANA string). Default: "UTC". Use "local" for browser timezone. */
    timezone?: string;

    /** Show the format hint text below the input. Default: true. */
    showFormatHint?: boolean;

    /** Custom format hint text. Defaults to the value of `format`. */
    formatHint?: string;

    /** Show the format help icon and tooltip. Default: true. */
    showFormatHelp?: boolean;

    /** Custom help text for the format tooltip. Auto-generated if not provided. */
    formatHelpText?: string;

    /** When true, the input is disabled. Default: false. */
    disabled?: boolean;

    /** When true, the input is not editable by typing but dropdown selection works. Default: false. */
    readonly?: boolean;

    /** Placeholder text when no time is selected. Default: format string. */
    placeholder?: string;

    /** Size variant: "sm", "default", or "lg". Default: "default". */
    size?: "sm" | "default" | "lg";

    /** Callback fired when the user selects a time. */
    onSelect?: (time: TimeValue) => void;

    /** Callback fired whenever the time value changes. */
    onChange?: (time: TimeValue | null) => void;

    /** Callback fired when the timezone changes. */
    onTimezoneChange?: (timezone: string) => void;

    /** Callback fired when the dropdown opens. */
    onOpen?: () => void;

    /** Callback fired when the dropdown closes. */
    onClose?: () => void;
}
```

### 6.2 Class API

```typescript
class TimePicker
{
    /**
     * Creates a new TimePicker and renders it into the specified container.
     *
     * @param containerId - The ID of the DOM element to render into
     * @param options - Configuration options
     */
    constructor(containerId: string, options?: TimePickerOptions);

    /** Returns the currently selected TimeValue, or null if no time is set. */
    getValue(): TimeValue | null;

    /** Returns the formatted time string currently displayed in the input. */
    getFormattedValue(): string;

    /** Returns the currently selected IANA timezone string. */
    getTimezone(): string;

    /** Sets the time programmatically. */
    setValue(time: TimeValue | null): void;

    /** Sets the timezone programmatically (IANA string). */
    setTimezone(timezone: string): void;

    /** Opens the time dropdown programmatically. */
    open(): void;

    /** Closes the time dropdown programmatically. */
    close(): void;

    /** Enables the component. */
    enable(): void;

    /** Disables the component. */
    disable(): void;

    /** Sets the minimum selectable time. */
    setMinTime(time: TimeValue | null): void;

    /** Sets the maximum selectable time. */
    setMaxTime(time: TimeValue | null): void;

    /** Removes the component from the DOM and cleans up event listeners. */
    destroy(): void;
}
```

### 6.3 Convenience Function

```typescript
/**
 * Creates a TimePicker in a single call.
 *
 * @param containerId - The DOM element ID to render into
 * @param options - Configuration options
 * @returns The TimePicker instance for further programmatic control
 */
function createTimePicker(
    containerId: string,
    options?: TimePickerOptions): TimePicker;
```

### 6.4 Global Exports

For consumers using `<script>` tags:

```typescript
window.TimePicker = TimePicker;
window.createTimePicker = createTimePicker;
```

---

## 7. HTML Structure (Rendered Output)

### 7.1 Input Group (with timezone)

```html
<div class="timepicker" id="timepicker-1">
    <div class="input-group">
        <input
            type="text"
            class="form-control timepicker-input"
            role="combobox"
            aria-haspopup="dialog"
            aria-expanded="false"
            aria-controls="timepicker-1-dropdown"
            aria-describedby="timepicker-1-format-hint"
            placeholder="HH:mm:ss"
            autocomplete="off"
            value="14:30:00"
        >
        <button
            type="button"
            class="btn btn-outline-secondary timepicker-toggle"
            tabindex="-1"
            aria-label="Open time picker"
        >
            <i class="bi bi-clock"></i>
        </button>
        <!-- Timezone selector (optional) -->
        <input
            type="text"
            class="form-control timepicker-tz-input"
            role="combobox"
            aria-haspopup="listbox"
            aria-expanded="false"
            aria-controls="timepicker-1-tz-listbox"
            value="UTC"
            readonly
        >
        <button
            type="button"
            class="btn btn-outline-secondary timepicker-tz-toggle"
            tabindex="-1"
            aria-label="Select timezone"
        >
            <i class="bi bi-chevron-down"></i>
        </button>
    </div>

    <!-- Format hint -->
    <div class="timepicker-hint" id="timepicker-1-format-hint">
        <span class="timepicker-hint-text text-muted small">HH:mm:ss</span>
        <button type="button" class="timepicker-help-icon" aria-label="Time format help">
            <i class="bi bi-question-circle"></i>
        </button>
        <div class="timepicker-help-tooltip" role="tooltip">
            Enter a time in the format HH:mm:ss (e.g., 14:30:00)
        </div>
    </div>
</div>
```

### 7.2 Time Dropdown

```html
<div
    class="timepicker-dropdown"
    id="timepicker-1-dropdown"
    role="dialog"
    aria-modal="true"
    aria-label="Choose time"
>
    <div class="timepicker-spinners">
        <!-- Hours spinner -->
        <div class="timepicker-spinner" role="spinbutton"
             aria-label="Hours" aria-valuenow="14" aria-valuemin="0" aria-valuemax="23">
            <button type="button" class="timepicker-spinner-up" aria-label="Increase hours">
                <i class="bi bi-chevron-up"></i>
            </button>
            <div class="timepicker-spinner-track">
                <div class="timepicker-spinner-value timepicker-spinner-adjacent">13</div>
                <div class="timepicker-spinner-value timepicker-spinner-selected">14</div>
                <div class="timepicker-spinner-value timepicker-spinner-adjacent">15</div>
            </div>
            <button type="button" class="timepicker-spinner-down" aria-label="Decrease hours">
                <i class="bi bi-chevron-down"></i>
            </button>
            <div class="timepicker-spinner-label">Hours</div>
        </div>

        <div class="timepicker-separator">:</div>

        <!-- Minutes spinner (same structure) -->
        <div class="timepicker-spinner" role="spinbutton"
             aria-label="Minutes" aria-valuenow="30" aria-valuemin="0" aria-valuemax="59">
            <!-- ... same structure as hours ... -->
        </div>

        <div class="timepicker-separator">:</div>

        <!-- Seconds spinner (optional, same structure) -->
        <div class="timepicker-spinner" role="spinbutton"
             aria-label="Seconds" aria-valuenow="0" aria-valuemin="0" aria-valuemax="59">
            <!-- ... same structure as hours ... -->
        </div>

        <!-- AM/PM spinner (12-hour mode only) -->
        <!--
        <div class="timepicker-spinner timepicker-spinner-ampm" role="spinbutton"
             aria-label="AM or PM" aria-valuenow="1" aria-valuemin="0" aria-valuemax="1">
            ...
        </div>
        -->
    </div>

    <!-- Footer -->
    <div class="timepicker-footer">
        <button type="button" class="btn btn-sm btn-link timepicker-now-btn"
                aria-label="Set to current time">
            Now
        </button>
    </div>
</div>
```

### 7.3 Timezone Dropdown

```html
<div class="timepicker-tz-dropdown" id="timepicker-1-tz-listbox" role="listbox" aria-label="Timezones">
    <div class="timepicker-tz-search">
        <input type="text" class="form-control form-control-sm" placeholder="Search timezones..." aria-label="Search timezones">
    </div>
    <div class="timepicker-tz-list">
        <!-- Common group -->
        <div class="timepicker-tz-group-header" aria-hidden="true">Common</div>
        <div class="timepicker-tz-option timepicker-tz-option-selected" role="option" aria-selected="true">
            UTC (+00:00)
        </div>
        <div class="timepicker-tz-option" role="option" aria-selected="false">
            America/New_York (-05:00)
        </div>
        <!-- ... more options ... -->

        <!-- Region groups -->
        <div class="timepicker-tz-group-header" aria-hidden="true">Americas</div>
        <div class="timepicker-tz-option" role="option" aria-selected="false">
            America/Chicago (-06:00)
        </div>
        <!-- ... -->
    </div>
</div>
```

---

## 8. SCSS Styling

### 8.1 Class Naming

All classes are prefixed with `timepicker-`:

| Class | Element |
|-------|---------|
| `.timepicker` | Outer wrapper |
| `.timepicker-input` | Time text input |
| `.timepicker-toggle` | Clock icon button |
| `.timepicker-dropdown` | Time dropdown panel |
| `.timepicker-spinners` | Container for all spinner columns |
| `.timepicker-spinner` | Single spinner column |
| `.timepicker-spinner-up` | Up arrow button |
| `.timepicker-spinner-down` | Down arrow button |
| `.timepicker-spinner-track` | Scrollable value track |
| `.timepicker-spinner-value` | Individual value cell |
| `.timepicker-spinner-selected` | Currently selected value (highlighted) |
| `.timepicker-spinner-adjacent` | Values above/below selection (muted) |
| `.timepicker-spinner-label` | Column label ("Hours", "Minutes", etc.) |
| `.timepicker-spinner-ampm` | AM/PM spinner column |
| `.timepicker-separator` | Colon or separator between spinners |
| `.timepicker-footer` | Footer row with Now button |
| `.timepicker-now-btn` | Now button |
| `.timepicker-hint` | Format hint container below input |
| `.timepicker-hint-text` | The format text |
| `.timepicker-help-icon` | Help icon button |
| `.timepicker-help-tooltip` | Tooltip with format explanation |
| `.timepicker-tz-input` | Timezone display input |
| `.timepicker-tz-toggle` | Timezone chevron button |
| `.timepicker-tz-dropdown` | Timezone dropdown panel |
| `.timepicker-tz-search` | Search input within timezone dropdown |
| `.timepicker-tz-list` | Scrollable timezone list |
| `.timepicker-tz-option` | Individual timezone option |
| `.timepicker-tz-option-selected` | Currently selected timezone |
| `.timepicker-tz-option-highlighted` | Keyboard-highlighted timezone |
| `.timepicker-tz-group-header` | Region group header |
| `.timepicker-dropdown-above` | Dropdown positioned above input |
| `.timepicker-sm` | Small size variant |
| `.timepicker-lg` | Large size variant |
| `.timepicker-disabled` | Disabled state |
| `.timepicker-invalid` | Invalid input state |

### 8.2 Styling Rules

- All colours, fonts, spacing, and borders use SCSS variables from `_variables.scss`.
- No hardcoded hex values, pixel sizes, or font names.
- The dropdown uses `position: absolute` and `z-index: 1050`.
- Spinner columns use `overflow: hidden` with CSS scroll-snap for smooth value selection.
- The selected spinner value uses `background-color: $primary; color: white`.
- Adjacent values use `color: $gray-400`.
- Separator characters (`:`, `-`, `.`) are styled as static text with `color: $gray-600`.
- Spinner up/down buttons use `color: $gray-600` with `hover: $primary`.
- The timezone dropdown follows the same styling as the EditableComboBox dropdown.
- SCSS nesting is limited to 3 levels per `CODING_STYLE.md`.

---

## 9. Dropdown Positioning

- The dropdown appears **below** the input by default.
- If there is insufficient space below (near the bottom of the viewport), it appears **above**. Calculated on open using `getBoundingClientRect()`.
- When positioned above, the class `timepicker-dropdown-above` is added.
- The timezone dropdown positions independently of the time dropdown.

---

## 10. Edge Cases

| Scenario | Behaviour |
|----------|-----------|
| No initial value provided | Defaults to current system time (or current time in the configured timezone). |
| `value` outside `minTime`/`maxTime` | Clamped to the nearest boundary. Console warning logged. |
| `minTime` > `maxTime` | Console error logged. Component renders but no times are selectable. |
| `minuteStep` that doesn't divide 60 evenly | Accepted but wrapping may skip values. Console warning logged. |
| 12-hour mode with seconds | Works as expected: three spinners + AM/PM. |
| 24-hour mode without seconds | Two spinners only (hours + minutes). |
| Timezone search with no matches | Shows "No timezones found" message. |
| `showTimezone: false` (default) | Timezone input and dropdown are not rendered. `getTimezone()` returns "UTC". |
| `timezone: "local"` | Resolves to browser timezone on init. |
| Invalid IANA timezone string | Falls back to UTC. Console warning logged. |
| Container not found | Console error logged. Component is not rendered. |
| Component disabled while dropdown open | Dropdown closes immediately. |
| Manual input "25:00" (invalid hours) | Rejected on blur; reverts to previous value. |
| Manual input "14:30" when format includes seconds | Seconds default to `00`. |
| Typing digits while spinner is focused | Direct numeric entry; e.g., typing "1" then "4" in hours sets to 14. |
| Multiple TimePickers on same page | Each has unique instance ID. Only one dropdown open at a time. |

---

## 11. Performance

- **Spinner rendering:** Only 3 values (previous, current, next) are rendered per column at a time. No virtualisation needed.
- **Timezone list:** The full list (~400 IANA zones) is rendered once and filtered via CSS `display: none` for fast search.
- **Event delegation:** Spinner click events use a single listener on the spinners container.
- **No external dependencies:** All time calculations use native `Date` and `Intl` APIs.
- **Timezone offset calculation:** Uses `Intl.DateTimeFormat` with `timeZoneName` option. Offsets are cached per timezone to avoid repeated API calls.

---

## 12. Testing Requirements

### 12.1 Unit Tests (Jest/Vitest with jsdom)

| Test Case | Category |
|-----------|----------|
| `constructor_WithValidContainer_RendersComponent` | Initialisation |
| `constructor_WithMissingContainer_LogsError` | Error handling |
| `constructor_WithDefaultOptions_ShowsCurrentTime` | Initialisation |
| `constructor_WithValue_ShowsSpecifiedTime` | Initialisation |
| `constructor_24HourMode_ShowsHHmmss` | Initialisation |
| `constructor_12HourMode_ShowsHHmmAMPM` | Initialisation |
| `open_WhenClosed_ShowsDropdown` | Dropdown |
| `open_WhenDisabled_DoesNotOpen` | State |
| `close_WhenOpen_HidesDropdown` | Dropdown |
| `spinnerUp_Hours_IncrementsHour` | Spinner |
| `spinnerDown_Hours_DecrementsHour` | Spinner |
| `spinnerWrap_Hours24_23To0` | Spinner |
| `spinnerWrap_Hours12_12To1` | Spinner |
| `spinnerWrap_Minutes_59To0` | Spinner |
| `spinnerWrap_Seconds_59To0` | Spinner |
| `minuteStep_5_IncrementsByFive` | Configuration |
| `ampm_Toggle_SwitchesBetweenAMPM` | 12-hour |
| `nowButton_ClickSetsCurrentTime` | Footer |
| `nowButton_WhenOutOfRange_IsDisabled` | Footer |
| `keyboard_ArrowUp_IncrementsSpinner` | Keyboard |
| `keyboard_ArrowDown_DecrementsSpinner` | Keyboard |
| `keyboard_LeftRight_MoveBetweenColumns` | Keyboard |
| `keyboard_Enter_CommitsAndCloses` | Keyboard |
| `keyboard_Escape_ClosesWithoutChange` | Keyboard |
| `keyboard_Tab_CyclesThroughColumns` | Keyboard |
| `keyboard_N_SetsCurrentTime` | Keyboard |
| `keyboard_NumericEntry_SetsValue` | Keyboard |
| `manualInput_ValidTime_UpdatesSelection` | Input |
| `manualInput_InvalidTime_RevertsOnBlur` | Input |
| `manualInput_PartialSeconds_DefaultsToZero` | Input |
| `timezone_DefaultIsUTC` | Timezone |
| `timezone_ShowTimezone_RendersSelector` | Timezone |
| `timezone_HideTimezone_NoSelector` | Timezone |
| `timezone_Local_UsesBrowserTimezone` | Timezone |
| `timezone_InvalidString_FallsToUTC` | Timezone |
| `timezone_Search_FiltersOptions` | Timezone |
| `timezone_Select_UpdatesDisplay` | Timezone |
| `timezone_Change_DoesNotConvertTime` | Timezone |
| `timezone_CommonGroup_ShownFirst` | Timezone |
| `minTime_TimesBeforeAreDisabled` | Range |
| `maxTime_TimesAfterAreDisabled` | Range |
| `format_CustomSeparator_ParsesCorrectly` | Formatting |
| `format_12Hour_FormatsWithAMPM` | Formatting |
| `formatHint_WhenEnabled_ShowsBelowInput` | Configuration |
| `formatHint_WhenDisabled_IsHidden` | Configuration |
| `formatHelp_ClickIcon_ShowsTooltip` | Help |
| `formatHelp_WhenDisabled_HidesIcon` | Help |
| `getValue_ReturnsTimeValue` | API |
| `setValue_UpdatesInputAndSpinners` | API |
| `getTimezone_ReturnsIANAString` | API |
| `setTimezone_UpdatesDisplay` | API |
| `disable_WhileOpen_ClosesDropdown` | State |
| `destroy_RemovesFromDOM_CleansUpListeners` | Lifecycle |
| `aria_Attributes_AreCorrectlySet` | Accessibility |
| `showSeconds_False_HidesSecondsSpinner` | Configuration |

### 12.2 Visual Verification

After implementation, visually verify in the demo page:

- Default, small, and large size variants render correctly
- Dropdown opens below (or above near viewport bottom)
- Spinner columns scroll smoothly and wrap correctly
- 12-hour and 24-hour modes render correctly
- AM/PM toggle works in 12-hour mode
- Now button sets current time
- Manual time entry parses correctly
- Format hint is visible and shows the configured format
- Format help icon shows tooltip on click/hover
- Timezone selector appears when enabled
- Timezone search filters correctly
- Timezone change does not convert the time
- Disabled and readonly states prevent interaction
- Focus ring is visible during keyboard navigation
- Min/max time constraints are enforced

### 12.3 Cross-Browser

Test in Chrome, Firefox, Safari, and Edge for consistent rendering and keyboard behaviour.

---

## 13. Demo Page Integration

Add a section to `demo/index.html` titled "Time Picker" that demonstrates:

1. **Basic time picker** — 24-hour, with seconds, default to current time.
2. **12-hour mode** — `clockMode: "12"`, format `hh:mm A`.
3. **No seconds** — `showSeconds: false`, format `HH:mm`.
4. **Minute stepping** — `minuteStep: 15` (only 00, 15, 30, 45).
5. **Min/Max range** — Restrict to business hours (09:00–17:00).
6. **With timezone** — `showTimezone: true`, default UTC.
7. **Local timezone** — `showTimezone: true`, `timezone: "local"`.
8. **Size variants** — Small, default, and large side by side.
9. **Disabled and readonly** — One disabled, one readonly instance.
10. **Programmatic control** — Buttons that call `setValue()`, `getValue()`, `getTimezone()`, `setTimezone()`, `open()`, `close()`.
11. **Custom format** — Dash separator (`HH-mm-ss`), custom format hint and help text.

---

## 14. File Structure

```
components/
└── timepicker/
    ├── timepicker.ts              # Component logic
    ├── timepicker.scss            # Component styles
    ├── timepicker.test.ts         # Unit tests
    └── README.md                  # Component documentation
```

Output in `dist/`:

```
dist/
└── components/
    └── timepicker/
        ├── timepicker.js          # Compiled JavaScript
        ├── timepicker.css         # Compiled CSS
        └── timepicker.d.ts        # TypeScript declarations
```

---

## 15. Dependencies

| Dependency | Required | Notes |
|------------|----------|-------|
| Bootstrap 5 CSS | Yes | For `input-group`, `form-control`, `btn` base styles |
| Bootstrap 5 JS | No | This component does not use Bootstrap JS plugins |
| Bootstrap Icons | Yes | For `bi-clock`, `bi-chevron-up`, `bi-chevron-down`, `bi-question-circle` icons |
| Enterprise Theme CSS | Yes | For theme variable overrides |
| Intl API | Yes | For timezone names, offsets, and `supportedValuesOf('timeZone')` |

---

## 16. Definition of Done

- [ ] TypeScript component compiles without errors
- [ ] SCSS compiles without errors via `npm run build`
- [ ] All unit tests pass
- [ ] Component renders correctly in `demo/index.html`
- [ ] All keyboard interactions work as specified
- [ ] ARIA attributes are correct (verified with axe-core or manual inspection)
- [ ] Focus states are visible
- [ ] Component respects disabled, readonly, minTime, maxTime states
- [ ] 12-hour and 24-hour modes work correctly
- [ ] Seconds column shows/hides based on configuration
- [ ] Spinner wrapping works correctly
- [ ] Manual time input parsing works with configurable format
- [ ] Format hint and help popup display correctly and are configurable
- [ ] Timezone selector shows, searches, and selects correctly when enabled
- [ ] Default timezone is UTC
- [ ] Now button works correctly
- [ ] `COMPONENTS.md` is updated with the new component entry
- [ ] `agentknowledge/concepts.yaml` is updated
- [ ] `CONVERSATION.md` is updated
- [ ] Code committed to git
