<!-- AGENT: Product Requirements Document for the DurationPicker component — structure, behaviour, API, and accessibility requirements. -->

# Duration Picker Component

**Status:** Draft
**Component name:** DurationPicker
**Folder:** `./components/durationpicker/`
**Spec author:** Agent
**Date:** 2026-02-10

---

## 1. Overview

### 1.1 What Is It

A duration picker is an input control that allows the user to specify an absolute interval of time — not a point in time, but a length of time. It renders a set of spinner columns whose composition is determined by a configurable **unit pattern**.

Unlike a time picker (which represents a wall-clock time with optional timezone), a duration picker represents a quantity: "3 hours 15 minutes", "2 weeks", "1 year 6 months", "90 seconds", etc.

The component supports a wide range of unit patterns to cover enterprise use cases:

| Pattern ID | Units shown | Example use case |
|-----------|-------------|-----------------|
| `d-h-m` | Days, Hours, Minutes | SLA response times, project durations |
| `h-m` | Hours, Minutes | Meeting lengths, shift durations |
| `h-m-s` | Hours, Minutes, Seconds | Video/audio lengths, race times |
| `h` | Hours | Billable hours, simple time tracking |
| `m` | Minutes | Cooking timers, short tasks |
| `s` | Seconds | Timeout values, animation durations |
| `m-s` | Minutes, Seconds | Lap times, short intervals |
| `w` | Weeks | Sprint durations, leave periods |
| `fn` | Fortnights | Pay periods, bi-weekly cycles |
| `mo` | Months | Subscription lengths, contract terms |
| `q` | Quarters | Financial reporting periods |
| `y` | Years | Long-term contracts, depreciation |
| `y-mo` | Years, Months | Age, tenure, lease terms |
| `y-mo-d` | Years, Months, Days | Precise age, exact durations |
| `w-d` | Weeks, Days | Project planning, delivery estimates |
| `w-d-h` | Weeks, Days, Hours | Detailed project scheduling |
| `d-h-m-s` | Days, Hours, Minutes, Seconds | Countdown timers, precise intervals |

The component also accepts and outputs **ISO 8601 duration format** (`P[n]Y[n]M[n]DT[n]H[n]M[n]S`), enabling manual text input and interoperability with APIs and databases.

### 1.2 Why Build It

Bootstrap 5 does not provide a duration picker. There is no native HTML element for duration input. Enterprise applications frequently need duration entry for:

- SLA definitions (respond within 4 hours, resolve within 2 days)
- Scheduling (meeting length: 1 hour 30 minutes)
- Project management (sprint: 2 weeks, milestone: 3 months)
- Financial periods (contract term: 2 years 6 months)
- Timeout/interval configuration (retry after 30 seconds)
- Billing (billable time: 7.5 hours)

Without a dedicated component, developers resort to free-text fields, multiple numeric inputs, or awkward workarounds that produce inconsistent data.

### 1.3 Design Inspiration

| Source | Key Pattern Adopted |
|--------|-------------------|
| **iOS Duration Picker** | Side-by-side spinner columns with unit labels |
| **Jira Time Tracking** | Compact format entry (2w 3d 5h), flexible unit parsing |
| **Google Calendar event duration** | Simple hours/minutes selector, clean dropdown |
| **ISO 8601 Durations** | Standard machine-readable format for interoperability |
| **Windows Task Scheduler** | Configurable unit combinations for interval definition |

---

## 2. User Experience

### 2.1 Visual Design

The component consists of:

1. **Duration input** — A Bootstrap `form-control` input field displaying the formatted duration. A timer icon button sits at the right edge.
2. **Spinner dropdown** — A panel that appears below the input containing one spinner column per unit in the configured pattern, each with a unit label.

#### 2.1.1 Spinner Dropdown (Days-Hours-Minutes pattern)

```
┌─────────────────────────────────────────────┐
│  2d 4h 30m                          [⏱️]   │  <-- Duration input + icon
├─────────────────────────────────────────────┤
│   ┌──────┐    ┌──────┐    ┌──────┐         │
│   │  ▲   │    │  ▲   │    │  ▲   │         │
│   │  01  │    │  03  │    │  29  │         │
│   │ [02] │    │ [04] │    │ [30] │         │  <-- Current values
│   │  03  │    │  05  │    │  31  │         │
│   │  ▼   │    │  ▼   │    │  ▼   │         │
│   └──────┘    └──────┘    └──────┘         │
│    Days        Hours       Minutes          │
├─────────────────────────────────────────────┤
│  [ Clear ]                                  │  <-- Resets to zero
├─────────────────────────────────────────────┤
│  P2DT4H30M  (?)                             │  <-- ISO 8601 hint + help
└─────────────────────────────────────────────┘
```

#### 2.1.2 Spinner Dropdown (Years-Months pattern)

```
┌─────────────────────────────────────────────┐
│  1y 6mo                             [⏱️]   │
├─────────────────────────────────────────────┤
│   ┌──────┐    ┌──────┐                     │
│   │  ▲   │    │  ▲   │                     │
│   │  00  │    │  05  │                     │
│   │ [01] │    │ [06] │                     │
│   │  02  │    │  07  │                     │
│   │  ▼   │    │  ▼   │                     │
│   └──────┘    └──────┘                     │
│    Years       Months                       │
├─────────────────────────────────────────────┤
│  [ Clear ]                                  │
├─────────────────────────────────────────────┤
│  P1Y6M  (?)                                 │
└─────────────────────────────────────────────┘
```

#### 2.1.3 Single-Unit Pattern (Hours only)

```
┌─────────────────────────────────────────────┐
│  8h                                 [⏱️]   │
├─────────────────────────────────────────────┤
│   ┌──────────────┐                         │
│   │      ▲       │                         │
│   │      07      │                         │
│   │    [ 08 ]    │                         │
│   │      09      │                         │
│   │      ▼       │                         │
│   └──────────────┘                         │
│        Hours                                │
├─────────────────────────────────────────────┤
│  [ Clear ]                                  │
├─────────────────────────────────────────────┤
│  PT8H  (?)                                  │
└─────────────────────────────────────────────┘
```

**Key visual properties:**

- The input and timer icon button appear as a single unified control using Bootstrap's `input-group` pattern.
- Spinner columns are laid out horizontally, one per unit in the pattern.
- Each column has a unit label below it (Days, Hours, Minutes, etc.).
- The currently selected value in each column is centred and highlighted with `$primary` background and white text.
- Adjacent values above and below are visible but muted.
- The "Clear" button in the footer resets all units to zero.
- The ISO 8601 format hint is shown below the footer with a help icon.
- All elements use zero border-radius per the enterprise theme.
- All sizing uses theme variables.

### 2.2 Display Format

The input field shows a compact human-readable format by default:

| Pattern | Display example | Notes |
|---------|----------------|-------|
| `d-h-m` | `2d 4h 30m` | Short unit suffixes |
| `h-m` | `4h 30m` | |
| `h-m-s` | `1h 15m 30s` | |
| `h` | `8h` | Single unit |
| `m` | `45m` | |
| `s` | `90s` | |
| `m-s` | `3m 45s` | |
| `w` | `2w` | |
| `fn` | `1fn` | |
| `mo` | `6mo` | |
| `q` | `3q` | |
| `y` | `2y` | |
| `y-mo` | `1y 6mo` | |
| `y-mo-d` | `1y 6mo 15d` | |
| `w-d` | `2w 3d` | |
| `w-d-h` | `1w 2d 8h` | |
| `d-h-m-s` | `1d 2h 30m 15s` | |

The display format is configurable via the `displayFormat` option. Consumers can supply a custom formatter function for full control.

Zero-value leading units are hidden by default (e.g., `0d 4h 30m` displays as `4h 30m`). This can be changed with `showZeroLeading: true`.

### 2.3 Sizing Variants

| Size | CSS class | Input size | Spinner font |
|------|-----------|------------|--------------|
| Small | `.durationpicker-sm` | Matches `form-control-sm` | `$font-size-sm` |
| Default | (none) | Matches `form-control` | `$font-size-base` |
| Large | `.durationpicker-lg` | Matches `form-control-lg` | `$font-size-lg` |

### 2.4 States

| State | Visual Behaviour |
|-------|-----------------|
| **Default** | Input shows formatted duration. Dropdown is closed. |
| **Focused** | Input has Bootstrap focus ring. Dropdown may or may not be open. |
| **Dropdown open** | Spinner panel is visible below (or above) the input. |
| **Disabled** | Input is dimmed. Icon is inert. Dropdown cannot open. Uses `$input-disabled-bg`. |
| **Readonly** | Input text is not editable by typing. Dropdown can still open for selection. |
| **Invalid** | Input border turns `$danger`. Shown when manual input cannot be parsed. |
| **Zero** | All units are zero. Input shows placeholder or "0" depending on configuration. |

---

## 3. Behaviour

### 3.1 Opening the Dropdown

The spinner dropdown opens when:

1. The user clicks the timer icon button.
2. The user presses `ArrowDown` or `Alt+ArrowDown` while the input is focused and the dropdown is closed.
3. The user clicks directly on the input field.

### 3.2 Closing the Dropdown

The dropdown closes when:

1. The user presses `Escape`. Focus returns to the input. Value is not changed.
2. The user clicks outside the component (blur).
3. The user presses `Enter` (commits and closes).
4. The user clicks the timer icon button while the dropdown is open.

### 3.3 Spinner Navigation

Each spinner column operates independently:

- **Clicking the up arrow** or **scrolling up** increments the value by the configured step.
- **Clicking the down arrow** or **scrolling down** decrements the value by the configured step.
- **Clicking a visible value** directly selects it.
- Values wrap or clamp depending on configuration (see section 3.5).
- The step for each unit defaults to 1 but is configurable via `unitSteps`.

### 3.4 Unit Ranges

Each unit has a natural range that depends on the pattern:

| Unit | Range when subordinate | Range when standalone |
|------|----------------------|---------------------|
| Years | 0–1 | 0–1 |
| Quarters | 0–3 (within a year context) | 0–4 |
| Months | 0–11 (within a year context) | 0–12 |
| Fortnights | 0–25 (within a year context) | 0–26 |
| Weeks | 0–51 (within a year context) | 0–52 |
| Days | 0–6 (within a week context), 0–30 (within a month context), 0–364 (within a year context) | 0–365 |
| Hours | 0–23 (within a day context) | 0–8760 |
| Minutes | 0–59 | 0–525600 (standalone) |
| Seconds | 0–59 | 0–31536000 (standalone) |

**Note:** The maximum representable duration is 1 year. All standalone maximums are derived from this ceiling (e.g., 8760 hours = 365 days × 24 hours). The maximum for each unit is configurable via `unitMax` but cannot exceed 1 year equivalent.

"Subordinate" means the unit appears alongside a larger unit in the pattern. For example, in `d-h-m`, hours range 0–23 (subordinate to days) and minutes range 0–59 (subordinate to hours). In the standalone `h` pattern, hours range 0–999.

The maximum value for each unit is configurable via `unitMax`.

### 3.5 Wrapping vs. Clamping

- **Default behaviour: clamp.** When a spinner reaches its maximum, further incrementing stops at the max. When it reaches 0, further decrementing stops at 0.
- **Optional carry mode (`carry: true`):** When a subordinate unit overflows, it wraps to 0 and increments the next larger unit. For example, in `h-m` with carry enabled, incrementing minutes past 59 wraps to 0 and adds 1 to hours. This provides a "counter" feel.
- Carry never applies to the largest unit in a pattern — it clamps at its max.

### 3.6 Clear Button

- A "Clear" button is always visible in the dropdown footer.
- Clicking it resets all units to zero and closes the dropdown.
- The clear button can be hidden by setting `showClearButton: false`.

### 3.7 Manual Input — ISO 8601

- Users may type a duration directly into the input field using **ISO 8601 duration format**.
- The format is: `P[n]Y[n]M[n]W[n]DT[n]H[n]M[n]S`
  - `P` — required prefix (period)
  - `Y` — years, `M` (before `T`) — months, `W` — weeks, `D` — days
  - `T` — time separator
  - `H` — hours, `M` (after `T`) — minutes, `S` — seconds
- Examples: `PT4H30M` (4 hours 30 minutes), `P2W` (2 weeks), `P1Y6M` (1 year 6 months), `P1DT2H30M15S` (1 day 2 hours 30 minutes 15 seconds).
- On blur or `Enter`, the component parses the ISO 8601 string and maps the values to the configured unit pattern.
- If the input contains units not present in the current pattern, they are converted where possible (e.g., `PT90M` in an `h-m` picker becomes 1h 30m). Where conversion is not meaningful (e.g., `P2Y` in an `h-m` picker), the input is rejected.
- Invalid input reverts to the previous value with a `console.warn`.

#### 3.7.1 Shorthand Input

In addition to ISO 8601, the component accepts a shorthand format matching the display format:

- `2d 4h 30m` — parsed as 2 days, 4 hours, 30 minutes
- `1y 6mo` — parsed as 1 year, 6 months
- `90s` — parsed as 90 seconds
- `2w 3d` — parsed as 2 weeks, 3 days

The parser tries ISO 8601 first, then shorthand, then rejects.

#### 3.7.2 Format Hint

- A subtle hint text is displayed below the input showing the ISO 8601 format for the current value (e.g., "P2DT4H30M").
- This hint updates live as the user changes the duration via spinners.
- The hint can be hidden by setting `showFormatHint: false`.

#### 3.7.3 Format Help Popup

- A small help icon (`bi-question-circle`) appears beside the format hint.
- Clicking or hovering shows a tooltip explaining both accepted input formats: ISO 8601 and shorthand.
- Example tooltip: "Enter a duration as ISO 8601 (e.g., PT4H30M) or shorthand (e.g., 4h 30m)."
- The help popup can be hidden by setting `showFormatHelp: false`.
- Custom help text can be set via `formatHelpText`.

---

## 4. Keyboard Interactions

### 4.1 Input Field (Dropdown Closed)

| Key | Action |
|-----|--------|
| `ArrowDown` / `Alt+ArrowDown` | Opens the spinner dropdown |
| `Escape` | No effect |
| `Enter` | Parses and validates typed input |
| `Tab` | Normal tab behaviour |

### 4.2 Spinner Dropdown (Open)

| Key | Action |
|-----|--------|
| `ArrowUp` | Increments the focused spinner column by one step |
| `ArrowDown` | Decrements the focused spinner column by one step |
| `ArrowLeft` | Moves focus to the previous spinner column |
| `ArrowRight` | Moves focus to the next spinner column |
| `PageUp` | Increments the focused column by 10 steps |
| `PageDown` | Decrements the focused column by 10 steps |
| `Home` | Sets the focused column to 0 |
| `End` | Sets the focused column to its maximum |
| `Enter` | Commits the current values and closes the dropdown |
| `Escape` | Closes the dropdown without changing the duration |
| `Tab` | Moves focus to the next spinner column; if on the last, closes and moves to next element |
| `Delete` / `Backspace` | Resets the focused column to 0 |
| `0`–`9` | Numeric entry: typing digits directly sets the value for the focused column |

---

## 5. Accessibility (ARIA)

### 5.1 Roles and Attributes

| Element | Role / Attribute | Value |
|---------|-----------------|-------|
| Duration input | `role` | `combobox` |
| Duration input | `aria-haspopup` | `dialog` |
| Duration input | `aria-expanded` | `true` when dropdown is open |
| Duration input | `aria-controls` | ID of the spinner dropdown |
| Duration input | `aria-describedby` | ID of the format hint element |
| Spinner dropdown | `role` | `dialog` |
| Spinner dropdown | `aria-modal` | `true` |
| Spinner dropdown | `aria-label` | "Choose duration" |
| Each spinner column | `role` | `spinbutton` |
| Each spinner column | `aria-label` | Unit name (e.g., "Days", "Hours", "Minutes") |
| Each spinner column | `aria-valuenow` | Current numeric value |
| Each spinner column | `aria-valuemin` | 0 |
| Each spinner column | `aria-valuemax` | Maximum for that unit |
| Spinner up button | `aria-label` | "Increase days" / "Increase hours" / etc. |
| Spinner down button | `aria-label` | "Decrease days" / etc. |
| Clear button | `aria-label` | "Clear duration" |

### 5.2 Focus Management

- When the dropdown opens, focus moves to the first (leftmost) spinner column.
- `Tab` cycles through spinner columns left to right, then to the Clear button.
- When the dropdown closes, focus returns to the duration input.

### 5.3 Screen Reader Announcements

- When a spinner value changes, the new value and unit are announced via `aria-valuenow`.
- When the dropdown opens/closes, the state is announced via `aria-expanded`.
- The Clear button announces "Duration cleared" when activated (via a live region).

---

## 6. API

### 6.1 TypeScript Interfaces

```typescript
/**
 * Unit identifiers for duration patterns.
 */
type DurationUnit = "y" | "q" | "mo" | "fn" | "w" | "d" | "h" | "m" | "s";

/**
 * A duration pattern is a hyphen-separated string of unit identifiers.
 * Examples: "d-h-m", "h-m-s", "y-mo", "w", "m-s"
 */
type DurationPattern = string;

/**
 * Represents a duration value as a map of unit to numeric value.
 * Only units present in the configured pattern will have entries.
 */
interface DurationValue
{
    /** Years. */
    y?: number;
    /** Quarters. */
    q?: number;
    /** Months. */
    mo?: number;
    /** Fortnights. */
    fn?: number;
    /** Weeks. */
    w?: number;
    /** Days. */
    d?: number;
    /** Hours. */
    h?: number;
    /** Minutes. */
    m?: number;
    /** Seconds. */
    s?: number;
}

/**
 * Configuration options for the DurationPicker component.
 */
interface DurationPickerOptions
{
    /** The unit pattern determining which spinner columns are shown.
     *  A hyphen-separated string of unit identifiers.
     *  Default: "h-m". */
    pattern?: DurationPattern;

    /** Initial duration value. Defaults to all zeros. */
    value?: DurationValue;

    /** Step increment for each unit. Default: 1 for all units. */
    unitSteps?: Partial<Record<DurationUnit, number>>;

    /** Maximum value for each unit. Uses natural range defaults if not specified. */
    unitMax?: Partial<Record<DurationUnit, number>>;

    /** When true, overflowing a subordinate unit carries into the next larger unit. Default: false. */
    carry?: boolean;

    /** Hide leading zero-value units in the display. Default: true. */
    hideZeroLeading?: boolean;

    /** Custom display formatter. Receives the DurationValue, returns a display string.
     *  When not provided, the default compact format is used (e.g., "2d 4h 30m"). */
    displayFormat?: (value: DurationValue) => string;

    /** Show the "Clear" button in the dropdown footer. Default: true. */
    showClearButton?: boolean;

    /** Show the ISO 8601 format hint below the input. Default: true. */
    showFormatHint?: boolean;

    /** Show the format help icon and tooltip. Default: true. */
    showFormatHelp?: boolean;

    /** Custom help text for the format tooltip. */
    formatHelpText?: string;

    /** When true, the input is disabled. Default: false. */
    disabled?: boolean;

    /** When true, the input is not editable by typing but dropdown works. Default: false. */
    readonly?: boolean;

    /** Placeholder text when duration is zero. Default: pattern display (e.g., "0h 0m"). */
    placeholder?: string;

    /** Size variant: "sm", "default", or "lg". Default: "default". */
    size?: "sm" | "default" | "lg";

    /** Callback fired when the duration value changes. */
    onChange?: (value: DurationValue) => void;

    /** Callback fired when the dropdown opens. */
    onOpen?: () => void;

    /** Callback fired when the dropdown closes. */
    onClose?: () => void;
}
```

### 6.2 Class API

```typescript
class DurationPicker
{
    /**
     * Creates a new DurationPicker and renders it into the specified container.
     *
     * @param containerId - The ID of the DOM element to render into
     * @param options - Configuration options
     */
    constructor(containerId: string, options?: DurationPickerOptions);

    /** Returns the current DurationValue. */
    getValue(): DurationValue;

    /** Returns the formatted display string. */
    getFormattedValue(): string;

    /** Returns the duration as an ISO 8601 string (e.g., "P2DT4H30M"). */
    toISO(): string;

    /** Returns the total duration in seconds (for patterns with time units)
     *  or total in the smallest unit of the pattern. */
    toTotalSeconds(): number;

    /** Sets the duration programmatically. */
    setValue(value: DurationValue): void;

    /** Sets the duration from an ISO 8601 duration string. */
    setFromISO(iso: string): void;

    /** Opens the spinner dropdown programmatically. */
    open(): void;

    /** Closes the spinner dropdown programmatically. */
    close(): void;

    /** Resets all units to zero. */
    clear(): void;

    /** Enables the component. */
    enable(): void;

    /** Disables the component. */
    disable(): void;

    /** Removes the component from the DOM and cleans up event listeners. */
    destroy(): void;
}
```

### 6.3 Convenience Function

```typescript
/**
 * Creates a DurationPicker in a single call.
 *
 * @param containerId - The DOM element ID to render into
 * @param options - Configuration options
 * @returns The DurationPicker instance for further programmatic control
 */
function createDurationPicker(
    containerId: string,
    options?: DurationPickerOptions): DurationPicker;
```

### 6.4 Global Exports

For consumers using `<script>` tags:

```typescript
window.DurationPicker = DurationPicker;
window.createDurationPicker = createDurationPicker;
```

---

## 7. HTML Structure (Rendered Output)

### 7.1 Input Group

```html
<div class="durationpicker" id="durationpicker-1">
    <div class="input-group">
        <input
            type="text"
            class="form-control durationpicker-input"
            role="combobox"
            aria-haspopup="dialog"
            aria-expanded="false"
            aria-controls="durationpicker-1-dropdown"
            aria-describedby="durationpicker-1-format-hint"
            placeholder="0h 0m"
            autocomplete="off"
            value="4h 30m"
        >
        <button
            type="button"
            class="btn btn-outline-secondary durationpicker-toggle"
            tabindex="-1"
            aria-label="Open duration picker"
        >
            <i class="bi bi-hourglass-split"></i>
        </button>
    </div>

    <!-- Format hint -->
    <div class="durationpicker-hint" id="durationpicker-1-format-hint">
        <span class="durationpicker-hint-text text-muted small">PT4H30M</span>
        <button type="button" class="durationpicker-help-icon" aria-label="Duration format help">
            <i class="bi bi-question-circle"></i>
        </button>
        <div class="durationpicker-help-tooltip" role="tooltip">
            Enter a duration as ISO 8601 (e.g., PT4H30M) or shorthand (e.g., 4h 30m).
        </div>
    </div>
</div>
```

### 7.2 Spinner Dropdown

```html
<div
    class="durationpicker-dropdown"
    id="durationpicker-1-dropdown"
    role="dialog"
    aria-modal="true"
    aria-label="Choose duration"
>
    <div class="durationpicker-spinners">
        <!-- Hours spinner -->
        <div class="durationpicker-spinner" role="spinbutton"
             aria-label="Hours" aria-valuenow="4" aria-valuemin="0" aria-valuemax="999">
            <button type="button" class="durationpicker-spinner-up" aria-label="Increase hours">
                <i class="bi bi-chevron-up"></i>
            </button>
            <div class="durationpicker-spinner-track">
                <div class="durationpicker-spinner-value durationpicker-spinner-adjacent">03</div>
                <div class="durationpicker-spinner-value durationpicker-spinner-selected">04</div>
                <div class="durationpicker-spinner-value durationpicker-spinner-adjacent">05</div>
            </div>
            <button type="button" class="durationpicker-spinner-down" aria-label="Decrease hours">
                <i class="bi bi-chevron-down"></i>
            </button>
            <div class="durationpicker-spinner-label">Hours</div>
        </div>

        <!-- Minutes spinner -->
        <div class="durationpicker-spinner" role="spinbutton"
             aria-label="Minutes" aria-valuenow="30" aria-valuemin="0" aria-valuemax="59">
            <button type="button" class="durationpicker-spinner-up" aria-label="Increase minutes">
                <i class="bi bi-chevron-up"></i>
            </button>
            <div class="durationpicker-spinner-track">
                <div class="durationpicker-spinner-value durationpicker-spinner-adjacent">29</div>
                <div class="durationpicker-spinner-value durationpicker-spinner-selected">30</div>
                <div class="durationpicker-spinner-value durationpicker-spinner-adjacent">31</div>
            </div>
            <button type="button" class="durationpicker-spinner-down" aria-label="Decrease minutes">
                <i class="bi bi-chevron-down"></i>
            </button>
            <div class="durationpicker-spinner-label">Minutes</div>
        </div>
    </div>

    <!-- Footer -->
    <div class="durationpicker-footer">
        <button type="button" class="btn btn-sm btn-link durationpicker-clear-btn"
                aria-label="Clear duration">
            Clear
        </button>
    </div>
</div>
```

---

## 8. SCSS Styling

### 8.1 Class Naming

All classes are prefixed with `durationpicker-`:

| Class | Element |
|-------|---------|
| `.durationpicker` | Outer wrapper |
| `.durationpicker-input` | Duration text input |
| `.durationpicker-toggle` | Timer icon button |
| `.durationpicker-dropdown` | Spinner dropdown panel |
| `.durationpicker-spinners` | Container for all spinner columns |
| `.durationpicker-spinner` | Single spinner column |
| `.durationpicker-spinner-up` | Up arrow button |
| `.durationpicker-spinner-down` | Down arrow button |
| `.durationpicker-spinner-track` | Scrollable value track |
| `.durationpicker-spinner-value` | Individual value cell |
| `.durationpicker-spinner-selected` | Currently selected value |
| `.durationpicker-spinner-adjacent` | Values above/below selection (muted) |
| `.durationpicker-spinner-label` | Column label ("Hours", "Minutes", etc.) |
| `.durationpicker-footer` | Footer row with Clear button |
| `.durationpicker-clear-btn` | Clear button |
| `.durationpicker-hint` | Format hint container below input |
| `.durationpicker-hint-text` | ISO 8601 hint text |
| `.durationpicker-help-icon` | Help icon button |
| `.durationpicker-help-tooltip` | Tooltip with format explanation |
| `.durationpicker-dropdown-above` | Dropdown positioned above input |
| `.durationpicker-sm` | Small size variant |
| `.durationpicker-lg` | Large size variant |
| `.durationpicker-disabled` | Disabled state |
| `.durationpicker-invalid` | Invalid input state |

### 8.2 Styling Rules

- All colours, fonts, spacing, and borders use SCSS variables from `_variables.scss`.
- No hardcoded hex values, pixel sizes, or font names.
- The dropdown uses `position: absolute` and `z-index: 1050`.
- Spinner columns use the same visual pattern as the TimePicker (shared visual language).
- The selected value uses `background-color: $primary; color: white`.
- Adjacent values use `color: $gray-400`.
- Unit labels use `color: $gray-600; font-size: $font-size-sm; text-transform: uppercase; letter-spacing: 0.05em`.
- Spinner up/down buttons use `color: $gray-600` with `hover: $primary`.
- SCSS nesting is limited to 3 levels per `CODING_STYLE.md`.

---

## 9. Dropdown Positioning

- The dropdown appears **below** the input by default.
- If there is insufficient space below, it appears **above**. Calculated on open using `getBoundingClientRect()`.
- When positioned above, the class `durationpicker-dropdown-above` is added.

---

## 10. ISO 8601 Duration Format

### 10.1 Parsing

The component parses ISO 8601 duration strings with this grammar:

```
P [nY] [nM] [nW] [nD] [T [nH] [nM] [nS]]
```

- `P` is a mandatory prefix.
- `T` separates date units (Y, M, W, D) from time units (H, M, S).
- Numbers can be integers or decimals (`PT1.5H` = 1 hour 30 minutes).
- All units are optional; at least one must be present.

### 10.2 Output

The `toISO()` method always outputs the canonical form:

- Only non-zero units are included.
- Date units appear before `T`; time units after.
- If only time units are present, the output is `PT...`.
- If only date units, the output is `P...`.
- A zero duration outputs `PT0S`.

### 10.3 Unit Mapping

When the ISO string contains units not in the current pattern, the component converts where possible:

| ISO unit | Conversion |
|----------|-----------|
| Years → Months | 1Y = 12M |
| Months → Quarters | 3M = 1Q |
| Weeks → Days | 1W = 7D |
| Days → Hours | 1D = 24H |
| Hours → Minutes | 1H = 60M |
| Minutes → Seconds | 1M = 60S |
| Fortnights → Days | 1FN = 14D |

Conversions only apply downward to units present in the pattern. If no conversion path exists, the input is rejected.

---

## 11. Edge Cases

| Scenario | Behaviour |
|----------|-----------|
| All units zero | Input shows placeholder. `toISO()` returns `PT0S`. |
| Pattern has single unit | Only one spinner column rendered. |
| Duration exceeds 1 year | Clamped to 1-year equivalent. Console warning logged. |
| Decimal ISO input (`PT1.5H`) | Converted to 1h 30m in `h-m` pattern. |
| ISO input with units not in pattern | Converted downward where possible; rejected otherwise. |
| Shorthand input with wrong units | Rejected. Console warning logged. |
| Negative values | Not supported. Parser rejects negative durations. |
| `carry: true` with minutes overflow | 60 minutes wraps to 0 and increments hours. |
| `carry: true` on largest unit | Largest unit clamps at its maximum (does not overflow). |
| Container not found | Console error logged. Component is not rendered. |
| Component disabled while dropdown open | Dropdown closes immediately. |
| `pattern` changed after init | Not supported. Destroy and recreate the component. |
| Multiple DurationPickers on same page | Each has unique instance ID. Only one dropdown open at a time. |

---

## 12. Performance

- **Spinner rendering:** Only 3 values per column are rendered (previous, current, next). No virtualisation needed.
- **ISO parsing:** Pure string parsing with no external dependencies.
- **Event delegation:** Click events on spinner buttons use a single listener on the spinners container.
- **No external dependencies:** All calculations are pure arithmetic.

---

## 13. Testing Requirements

### 13.1 Unit Tests (Jest/Vitest with jsdom)

| Test Case | Category |
|-----------|----------|
| `constructor_WithValidContainer_RendersComponent` | Initialisation |
| `constructor_WithMissingContainer_LogsError` | Error handling |
| `constructor_DefaultPattern_ShowsHoursMinutes` | Initialisation |
| `constructor_WithValue_ShowsSpecifiedDuration` | Initialisation |
| `constructor_CustomPattern_RendersCorrectColumns` | Initialisation |
| `open_WhenClosed_ShowsDropdown` | Dropdown |
| `open_WhenDisabled_DoesNotOpen` | State |
| `close_WhenOpen_HidesDropdown` | Dropdown |
| `spinnerUp_IncrementsValue` | Spinner |
| `spinnerDown_DecrementsValue` | Spinner |
| `spinnerClamp_AtMax_StopsIncrementing` | Spinner |
| `spinnerClamp_AtZero_StopsDecrementing` | Spinner |
| `spinnerCarry_MinutesOverflow_IncrementsHours` | Carry |
| `spinnerCarry_LargestUnit_ClampsAtMax` | Carry |
| `unitSteps_Custom_IncrementsByStep` | Configuration |
| `unitMax_Custom_ClampsAtCustomMax` | Configuration |
| `clearButton_ResetsAllToZero` | Footer |
| `clearButton_WhenHidden_NotRendered` | Configuration |
| `keyboard_ArrowUp_IncrementsSpinner` | Keyboard |
| `keyboard_ArrowDown_DecrementsSpinner` | Keyboard |
| `keyboard_LeftRight_MoveBetweenColumns` | Keyboard |
| `keyboard_Enter_CommitsAndCloses` | Keyboard |
| `keyboard_Escape_ClosesWithoutChange` | Keyboard |
| `keyboard_Home_SetsToZero` | Keyboard |
| `keyboard_End_SetsToMax` | Keyboard |
| `keyboard_NumericEntry_SetsValue` | Keyboard |
| `keyboard_Delete_ResetsColumn` | Keyboard |
| `manualInput_ISO8601_ParsesCorrectly` | Input |
| `manualInput_Shorthand_ParsesCorrectly` | Input |
| `manualInput_Invalid_RevertsOnBlur` | Input |
| `manualInput_DecimalISO_ConvertsCorrectly` | Input |
| `manualInput_UnitsNotInPattern_ConvertsDown` | Input |
| `manualInput_UnconvertibleUnits_Rejects` | Input |
| `toISO_ReturnsCorrectString` | API |
| `toISO_ZeroDuration_ReturnsPT0S` | API |
| `toTotalSeconds_CalculatesCorrectly` | API |
| `setFromISO_UpdatesValueAndDisplay` | API |
| `getValue_ReturnsDurationValue` | API |
| `setValue_UpdatesInputAndSpinners` | API |
| `clear_ResetsToZero` | API |
| `displayFormat_Custom_UsesFormatter` | Configuration |
| `hideZeroLeading_HidesLeadingZeros` | Display |
| `hideZeroLeading_False_ShowsAll` | Display |
| `formatHint_ShowsISOBelowInput` | Configuration |
| `formatHint_UpdatesLive` | Configuration |
| `formatHelp_ClickIcon_ShowsTooltip` | Help |
| `formatHelp_WhenDisabled_HidesIcon` | Help |
| `pattern_DHM_RendersThreeColumns` | Pattern |
| `pattern_HM_RendersTwoColumns` | Pattern |
| `pattern_H_RendersOneColumn` | Pattern |
| `pattern_YMO_RendersYearsMonths` | Pattern |
| `pattern_W_RendersWeeks` | Pattern |
| `pattern_FN_RendersFortnights` | Pattern |
| `pattern_Q_RendersQuarters` | Pattern |
| `pattern_DHMS_RendersFourColumns` | Pattern |
| `subordinateRange_HoursInDHM_Max23` | Range |
| `standaloneRange_HoursInH_Max8760` | Range |
| `maxDuration_ExceedsOneYear_Clamped` | Range |
| `disable_WhileOpen_ClosesDropdown` | State |
| `destroy_RemovesFromDOM_CleansUpListeners` | Lifecycle |
| `aria_Attributes_AreCorrectlySet` | Accessibility |

### 13.2 Visual Verification

After implementation, visually verify in the demo page:

- Multiple unit patterns render the correct number of spinner columns
- Single-unit patterns render cleanly
- Spinner values increment, decrement, and clamp correctly
- Carry mode wraps subordinate units and increments the larger unit
- Clear button resets all columns
- ISO 8601 input parses and displays correctly
- Shorthand input parses correctly
- Format hint shows the live ISO representation
- Format help tooltip displays on click/hover
- Display format hides leading zeros by default
- Size variants render correctly
- Disabled and readonly states work correctly
- Keyboard navigation between columns works smoothly
- Numeric direct entry works
- Focus ring is visible during keyboard navigation

### 13.3 Cross-Browser

Test in Chrome, Firefox, Safari, and Edge for consistent rendering and keyboard behaviour.

---

## 14. Demo Page Integration

Add a section to `demo/index.html` titled "Duration Picker" that demonstrates:

1. **Hours and Minutes** — Default `h-m` pattern. Simple meeting duration.
2. **Days, Hours, Minutes** — `d-h-m` pattern. SLA response time.
3. **Hours, Minutes, Seconds** — `h-m-s` pattern. Video length.
4. **Full precision** — `d-h-m-s` pattern. Countdown timer value.
5. **Years and Months** — `y-mo` pattern. Contract term.
6. **Weeks** — `w` pattern. Sprint duration.
7. **Weeks and Days** — `w-d` pattern. Delivery estimate.
8. **Quarters** — `q` pattern. Reporting period.
9. **Fortnights** — `fn` pattern. Pay cycle.
10. **Carry mode** — `h-m` with `carry: true`. Minutes overflow into hours.
11. **Custom steps** — `h-m` with `minuteStep: 15`. Only 0, 15, 30, 45.
12. **Size variants** — Small, default, and large side by side.
13. **Disabled and readonly** — One disabled, one readonly.
14. **Programmatic control** — Buttons for `setValue()`, `getValue()`, `toISO()`, `setFromISO()`, `clear()`, `open()`, `close()`.
15. **ISO 8601 input** — Text field where user can type an ISO string and see it parsed.

---

## 15. File Structure

```
components/
└── durationpicker/
    ├── durationpicker.ts          # Component logic
    ├── durationpicker.scss        # Component styles
    ├── durationpicker.test.ts     # Unit tests
    └── README.md                  # Component documentation
```

Output in `dist/`:

```
dist/
└── components/
    └── durationpicker/
        ├── durationpicker.js      # Compiled JavaScript
        ├── durationpicker.css     # Compiled CSS
        └── durationpicker.d.ts    # TypeScript declarations
```

---

## 16. Dependencies

| Dependency | Required | Notes |
|------------|----------|-------|
| Bootstrap 5 CSS | Yes | For `input-group`, `form-control`, `btn` base styles |
| Bootstrap 5 JS | No | This component does not use Bootstrap JS plugins |
| Bootstrap Icons | Yes | For `bi-hourglass-split`, `bi-chevron-up`, `bi-chevron-down`, `bi-question-circle` icons |
| Enterprise Theme CSS | Yes | For theme variable overrides |

---

## 17. Definition of Done

- [ ] TypeScript component compiles without errors
- [ ] SCSS compiles without errors via `npm run build`
- [ ] All unit tests pass
- [ ] Component renders correctly in `demo/index.html`
- [ ] All keyboard interactions work as specified
- [ ] ARIA attributes are correct (verified with axe-core or manual inspection)
- [ ] Focus states are visible
- [ ] Component respects disabled and readonly states
- [ ] All 17 unit patterns render correctly
- [ ] Carry mode works for subordinate unit overflow
- [ ] ISO 8601 parsing and output work correctly
- [ ] Shorthand input parsing works correctly
- [ ] Unit conversion from ISO to pattern units works
- [ ] Format hint updates live with ISO representation
- [ ] Format help popup displays correctly
- [ ] Clear button resets all units
- [ ] Display format hides leading zeros correctly
- [ ] Custom display formatter works
- [ ] `COMPONENTS.md` is updated with the new component entry
- [ ] `agentknowledge/concepts.yaml` is updated
- [ ] `CONVERSATION.md` is updated
- [ ] Code committed to git
