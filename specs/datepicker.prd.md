<!-- AGENT: Product Requirements Document for the DatePicker component — structure, behaviour, API, and accessibility requirements. -->

# Date Picker Component

**Status:** Draft
**Component name:** DatePicker
**Folder:** `./components/datepicker/`
**Spec author:** Agent
**Date:** 2026-02-10

---

## 1. Overview

### 1.1 What Is It

A date picker is an inline calendar control that allows the user to select a single date by navigating through a month grid. It combines a text input displaying the selected date with a calendar popup that appears on demand.

The calendar supports three navigable views:

1. **Day view** (default) — a month grid showing all days, with today highlighted and the selected date marked.
2. **Month view** — a grid of 12 months, entered by clicking the month name in the header. Selecting a month returns to the day view for that month.
3. **Year view** — a grid of years (typically 12 at a time), entered by clicking the year in the header. Selecting a year returns to the month view.

This is a standard control in desktop operating systems (Windows `DateTimePicker`, GNOME `GtkCalendar`, macOS `NSDatePicker`) and is commonly needed in enterprise SaaS applications for fields such as:

- Due dates, start/end dates, deadlines
- Date of birth and historical dates
- Report date ranges and filters
- Any field requiring a precise calendar date

### 1.2 Why Build It

Bootstrap 5 does not provide a date picker. The native HTML `<input type="date">` has significant limitations:

- Inconsistent rendering across browsers (especially Safari and Firefox)
- No control over calendar styling, first day of week, or week number display
- No programmatic API for navigation, min/max dates, or disabled dates
- Cannot style individual days or highlight today distinctly
- No month or year quick-navigation views

A custom component fills this gap while adhering to the Bootstrap component model and the enterprise theme.

### 1.3 Design Inspiration

| Source | Key Pattern Adopted |
|--------|-------------------|
| **Windows DateTimePicker** | Input field + dropdown calendar; month/year header navigation; click month/year to switch view |
| **GNOME GtkCalendar** | Week numbers in left column; Monday as first day option; today ring |
| **macOS NSDatePicker** | Clean grid layout; smooth view transitions |
| **Pikaday / Flatpickr** | Lightweight, no-dependency calendar; keyboard navigation; configurable options |
| **WAI-ARIA Date Picker Dialog** | Grid role for calendar, roving tabindex, arrow key navigation |

---

## 2. User Experience

### 2.1 Visual Design

The component consists of two visual parts:

1. **Text input** — A standard Bootstrap `form-control` input field displaying the formatted date. A calendar icon button sits at the right edge.
2. **Calendar popup** — A panel that appears below (or above) the input when activated. Contains a header, a day/month/year grid, and a footer.

#### 2.1.1 Day View (Default)

```
┌──────────────────────────────────────┐
│  [  February 2026  ]   [ < ]  [ > ]  │  <-- Header: month+year (clickable), nav arrows
├──────────────────────────────────────┤
│  Wk  Su  Mo  Tu  We  Th  Fr  Sa     │  <-- Weekday headers (Sunday start, optional Wk col)
│  05  26  27  28  29  30  31   1      │  <-- Previous month days (muted)
│  06   2   3   4   5   6   7   8      │
│  07   9  10 [11] 12  13  14  15      │  <-- [11] = today (highlighted ring)
│  08  16  17  18  19  20  21  22      │
│  09  23  24  25  26  27  28   1      │  <-- Next month days (muted)
├──────────────────────────────────────┤
│  [ Today ]                           │  <-- Footer: Today button
├──────────────────────────────────────┤
│  yyyy-MM-dd  (?)                     │  <-- Format hint + help icon
└──────────────────────────────────────┘
```

#### 2.1.2 Month View

```
┌──────────────────────────────────────┐
│  [    2026    ]        [ < ]  [ > ]  │  <-- Header: year (clickable), nav arrows
├──────────────────────────────────────┤
│   Jan    [Feb]    Mar    Apr         │  <-- [Feb] = current month (highlighted)
│   May     Jun     Jul    Aug         │
│   Sep     Oct     Nov    Dec         │
├──────────────────────────────────────┤
│  [ Today ]                           │
└──────────────────────────────────────┘
```

#### 2.1.3 Year View

```
┌──────────────────────────────────────┐
│  2020 – 2031               [ < ][ > ]│  <-- Header: year range, nav arrows
├──────────────────────────────────────┤
│   2020    2021    2022    2023        │
│   2024    2025   [2026]   2027       │  <-- [2026] = current year (highlighted)
│   2028    2029    2030    2031        │
├──────────────────────────────────────┤
│  [ Today ]                           │
└──────────────────────────────────────┘
```

**Key visual properties:**

- The input and calendar icon button appear as a single unified control using Bootstrap's `input-group` pattern.
- The calendar popup aligns with the left edge of the input and has a minimum width that accommodates the 7-column grid comfortably.
- The popup has a visible border, subtle box shadow, and white background.
- Today's date always has a distinctive ring or outline using the `$primary` colour.
- The selected date uses `$primary` background with white text.
- Days from adjacent months (leading/trailing) are shown in muted colour (`$gray-400`).
- The "Today" button in the footer is a small text button that jumps to today's date and selects it.
- All elements use zero border-radius per the enterprise theme.
- All sizing uses theme variables.

### 2.2 Sizing Variants

| Size | CSS class | Input size | Calendar font |
|------|-----------|------------|---------------|
| Small | `.datepicker-sm` | Matches `form-control-sm` | `$font-size-sm` |
| Default | (none) | Matches `form-control` | `$font-size-base` |
| Large | `.datepicker-lg` | Matches `form-control-lg` | `$font-size-lg` |

### 2.3 States

| State | Visual Behaviour |
|-------|-----------------|
| **Default** | Input shows formatted date. Calendar is closed. |
| **Focused** | Input has Bootstrap focus ring. Calendar may or may not be open. |
| **Calendar open** | Calendar popup is visible below (or above) the input. |
| **Disabled** | Input is dimmed. Calendar icon is inert. Calendar cannot open. Uses `$input-disabled-bg`. |
| **Readonly** | Input text is not editable by typing. Calendar can still open to allow date selection. |
| **Date selected** | Selected day cell has `$primary` background. Input text updates to formatted date. |
| **Today** | Today's cell always has a distinctive outline ring (`$primary` border, no fill) unless it is also the selected date. |
| **Out-of-range** | Days outside `minDate`/`maxDate` are muted and not selectable. |

---

## 3. Behaviour

### 3.1 Opening the Calendar

The calendar popup opens when:

1. The user clicks the calendar icon button.
2. The user presses `ArrowDown` or `Alt+ArrowDown` while the input is focused and the calendar is closed.
3. The user clicks directly on the input field.

### 3.2 Closing the Calendar

The calendar closes when:

1. The user presses `Escape`. Focus returns to the input. The date value is not changed.
2. The user clicks outside the component (blur).
3. The user selects a date (clicks a day cell or presses `Enter` on a focused day).
4. The user clicks the calendar icon button while the calendar is open.

### 3.3 Date Navigation

#### 3.3.1 Day View Navigation

- **Previous/Next Month arrows:** Clicking `<` or `>` in the header moves the calendar one month backward or forward.
- **Clicking the month name:** Transitions the calendar from day view to month view.
- **Clicking the year:** Transitions the calendar from day view to month view (same as clicking month, since month view shows the year too).
- **Adjacent month days:** Clicking a muted day from the previous or next month navigates to that month and selects that day.

#### 3.3.2 Month View Navigation

- **Previous/Next Year arrows:** Clicking `<` or `>` moves the displayed year backward or forward by one.
- **Clicking the year:** Transitions from month view to year view.
- **Selecting a month:** Returns to the day view for the selected month.

#### 3.3.3 Year View Navigation

- **Previous/Next Range arrows:** Clicking `<` or `>` moves the displayed year range backward or forward by 12 years.
- **Selecting a year:** Returns to the month view for the selected year.

### 3.4 Today Button

- A "Today" button is always visible in the calendar footer.
- Clicking it navigates to today's date, selects it, and closes the calendar.
- If today is outside `minDate`/`maxDate`, the Today button is disabled.

### 3.5 Date Formatting

- The displayed date format is configurable via the `format` option.
- Default format: `yyyy-MM-dd` (ISO 8601, unambiguous).
- Common alternative formats: `MM/dd/yyyy`, `dd/MM/yyyy`, `dd MMM yyyy`.
- The format uses the following tokens:
  - `yyyy` — 4-digit year
  - `yy` — 2-digit year
  - `MM` — 2-digit month (01–12)
  - `M` — month without leading zero (1–12)
  - `MMM` — abbreviated month name (Jan, Feb, …)
  - `MMMM` — full month name (January, February, …)
  - `dd` — 2-digit day (01–31)
  - `d` — day without leading zero (1–31)

### 3.6 Manual Input

- Users may type a date directly into the input field.
- On blur or `Enter`, the component attempts to parse the typed text according to the configured `format`.
- If the parsed date is valid and within range, it becomes the selected date.
- If the parsed date is invalid, the input reverts to the previously selected date and a `console.warn` is logged.

#### 3.6.1 Format Hint

- A subtle hint text is displayed below the input showing the expected date format (e.g., "yyyy-MM-dd" or "MM/dd/yyyy").
- The hint is always visible when the input is empty or focused, and fades to muted when a valid date is displayed.
- The hint text is configurable via the `formatHint` option. When not provided, it defaults to the value of the `format` option.
- The hint can be hidden entirely by setting `showFormatHint: false`.

#### 3.6.2 Format Help Popup

- A small help icon (`bi-question-circle`) appears at the right side of the format hint text.
- Clicking or hovering over the help icon shows a tooltip/popover explaining the expected date format with an example.
- The help text is configurable via the `formatHelpText` option. When not provided, it auto-generates a message like: "Enter a date in the format yyyy-MM-dd (e.g., 2026-02-11)".
- The help popup can be hidden entirely by setting `showFormatHelp: false`.
- The tooltip uses Bootstrap's `data-bs-toggle="tooltip"` pattern for styling consistency but is rendered manually (no Bootstrap JS dependency).

### 3.7 Week Numbers

- When `showWeekNumbers` is `true`, the leftmost column of the day grid displays ISO 8601 week numbers.
- Week number cells are not interactive (display only).
- Week numbers are shown in muted text with a slightly smaller font.

### 3.8 First Day of Week

- The `firstDayOfWeek` option accepts `0` (Sunday) through `6` (Saturday).
- Default is `0` (Sunday), the most common convention in North American enterprise applications.
- The day header row adjusts accordingly.

---

## 4. Keyboard Interactions

The component follows WAI-ARIA date picker keyboard conventions.

### 4.1 Input Field (Calendar Closed)

| Key | Action |
|-----|--------|
| `ArrowDown` / `Alt+ArrowDown` | Opens the calendar, focuses today or the selected date |
| `Escape` | No effect |
| `Enter` | Parses and validates typed input |
| `Tab` | Normal tab behaviour |

### 4.2 Day View (Calendar Open)

| Key | Action |
|-----|--------|
| `ArrowLeft` | Moves focus to the previous day |
| `ArrowRight` | Moves focus to the next day |
| `ArrowUp` | Moves focus to the same day in the previous week |
| `ArrowDown` | Moves focus to the same day in the next week |
| `Home` | Moves focus to the first day of the current week |
| `End` | Moves focus to the last day of the current week |
| `PageUp` | Moves focus to the same day in the previous month |
| `PageDown` | Moves focus to the same day in the next month |
| `Shift+PageUp` | Moves focus to the same day in the previous year |
| `Shift+PageDown` | Moves focus to the same day in the next year |
| `Enter` / `Space` | Selects the focused date and closes the calendar |
| `Escape` | Closes the calendar without changing the date; focus returns to input |
| `t` | Navigates to today (mnemonic: "today") |

### 4.3 Month View

| Key | Action |
|-----|--------|
| `ArrowLeft` | Moves focus to the previous month |
| `ArrowRight` | Moves focus to the next month |
| `ArrowUp` | Moves focus up one row (−4 months) |
| `ArrowDown` | Moves focus down one row (+4 months) |
| `Enter` / `Space` | Selects the focused month, returns to day view |
| `Escape` | Returns to day view without changing the month |

### 4.4 Year View

| Key | Action |
|-----|--------|
| `ArrowLeft` | Moves focus to the previous year |
| `ArrowRight` | Moves focus to the next year |
| `ArrowUp` | Moves focus up one row (−4 years) |
| `ArrowDown` | Moves focus down one row (+4 years) |
| `PageUp` | Moves to the previous year page (−12 years) |
| `PageDown` | Moves to the next year page (+12 years) |
| `Enter` / `Space` | Selects the focused year, returns to month view |
| `Escape` | Returns to month view without changing the year |

---

## 5. Accessibility (ARIA)

### 5.1 Roles and Attributes

| Element | Role / Attribute | Value |
|---------|-----------------|-------|
| Text input | `role` | Not set (native `<input>`) |
| Text input | `aria-haspopup` | `dialog` |
| Text input | `aria-expanded` | `true` when calendar is open, `false` when closed |
| Text input | `aria-controls` | ID of the calendar popup element |
| Text input | `aria-describedby` | ID of a hidden element with format hint text |
| Calendar popup | `role` | `dialog` |
| Calendar popup | `aria-modal` | `true` |
| Calendar popup | `aria-label` | "Choose date" |
| Day grid `<table>` | `role` | `grid` |
| Day grid | `aria-labelledby` | ID of the month+year heading |
| Day cell `<td>` | `role` | `gridcell` |
| Each day cell `<button>` | `aria-label` | Full date text, e.g. "Tuesday, 11 February 2026" |
| Selected day button | `aria-pressed` | `true` |
| Disabled day button | `aria-disabled` | `true` |
| Today button | `aria-label` | `Today, <full date>` |
| Prev/Next buttons | `aria-label` | "Previous month" / "Next month" (or year/range) |
| Month/year heading | `role` | `heading` with `aria-level="2"` or via `<h2>` element |

### 5.2 Focus Management

- When the calendar opens, focus moves to the grid cell representing the selected date (or today if no date is selected).
- Focus is trapped within the calendar popup while it is open (tab cycles through calendar controls).
- When the calendar closes, focus returns to the text input.
- The grid uses **roving tabindex**: only the focused cell has `tabindex="0"`; all others have `tabindex="-1"`.

### 5.3 Screen Reader Announcements

- When the view changes (day → month → year), the new view heading is announced via a live region.
- When the user navigates to a new month (via arrows or page keys), the month name is announced.
- The "Today" button announces the full date of today.

---

## 6. API

### 6.1 TypeScript Interfaces

```typescript
/**
 * Configuration options for the DatePicker component.
 */
interface DatePickerOptions
{
    /** Initial selected date. Defaults to today. */
    value?: Date;

    /** Date display format. Default: "yyyy-MM-dd". */
    format?: string;

    /** First day of the week: 0 = Sunday, 1 = Monday, ..., 6 = Saturday. Default: 0. */
    firstDayOfWeek?: number;

    /** Show ISO week numbers in the left column. Default: false. */
    showWeekNumbers?: boolean;

    /** Show the "Today" button in the footer. Default: true. */
    showTodayButton?: boolean;

    /** Earliest selectable date. Days before this are disabled. */
    minDate?: Date;

    /** Latest selectable date. Days after this are disabled. */
    maxDate?: Date;

    /** Array of specific dates that cannot be selected. */
    disabledDates?: Date[];

    /** Function that returns true if a given date should be disabled. */
    isDateDisabled?: (date: Date) => boolean;

    /** Show the format hint text below the input. Default: true. */
    showFormatHint?: boolean;

    /** Custom format hint text. Defaults to the value of `format`. */
    formatHint?: string;

    /** Show the format help icon and tooltip. Default: true. */
    showFormatHelp?: boolean;

    /** Custom help text for the format tooltip. Auto-generated if not provided. */
    formatHelpText?: string;

    /** When true, the input and calendar are disabled. Default: false. */
    disabled?: boolean;

    /** When true, the input is not editable by typing but calendar selection works. Default: false. */
    readonly?: boolean;

    /** Placeholder text when no date is selected. Default: format string. */
    placeholder?: string;

    /** Size variant: "sm", "default", or "lg". Default: "default". */
    size?: "sm" | "default" | "lg";

    /** Locale for month and day names. Default: "en-US". */
    locale?: string;

    /** Callback fired when the user selects a date. */
    onSelect?: (date: Date) => void;

    /** Callback fired whenever the date value changes (selection or typed input). */
    onChange?: (date: Date | null) => void;

    /** Callback fired when the calendar opens. */
    onOpen?: () => void;

    /** Callback fired when the calendar closes. */
    onClose?: () => void;
}
```

### 6.2 Class API

```typescript
class DatePicker
{
    /**
     * Creates a new DatePicker and renders it into the specified container.
     *
     * @param containerId - The ID of the DOM element to render into
     * @param options - Configuration options
     */
    constructor(containerId: string, options?: DatePickerOptions);

    /** Returns the currently selected Date, or null if no date is selected. */
    getValue(): Date | null;

    /** Returns the formatted date string currently displayed in the input. */
    getFormattedValue(): string;

    /** Sets the selected date programmatically. */
    setValue(date: Date | null): void;

    /** Opens the calendar popup programmatically. */
    open(): void;

    /** Closes the calendar popup programmatically. */
    close(): void;

    /** Navigates the calendar to a specific month and year without selecting a date. */
    navigateTo(year: number, month: number): void;

    /** Enables the component. */
    enable(): void;

    /** Disables the component. */
    disable(): void;

    /** Sets the minimum selectable date. */
    setMinDate(date: Date | null): void;

    /** Sets the maximum selectable date. */
    setMaxDate(date: Date | null): void;

    /** Removes the component from the DOM and cleans up event listeners. */
    destroy(): void;
}
```

### 6.3 Convenience Function

```typescript
/**
 * Creates a DatePicker in a single call.
 *
 * @param containerId - The DOM element ID to render into
 * @param options - Configuration options
 * @returns The DatePicker instance for further programmatic control
 */
function createDatePicker(
    containerId: string,
    options?: DatePickerOptions): DatePicker;
```

### 6.4 Global Exports

For consumers using `<script>` tags:

```typescript
window.DatePicker = DatePicker;
window.createDatePicker = createDatePicker;
```

---

## 7. HTML Structure (Rendered Output)

### 7.1 Input Group

```html
<div class="datepicker" id="datepicker-1">
    <div class="input-group">
        <input
            type="text"
            class="form-control datepicker-input"
            aria-haspopup="dialog"
            aria-expanded="false"
            aria-controls="datepicker-1-calendar"
            aria-describedby="datepicker-1-format-hint"
            placeholder="yyyy-MM-dd"
            autocomplete="off"
            value="2026-02-11"
        >
        <button
            type="button"
            class="btn btn-outline-secondary datepicker-toggle"
            tabindex="-1"
            aria-label="Open calendar"
        >
            <i class="bi bi-calendar3"></i>
        </button>
    </div>
    <div class="datepicker-hint" id="datepicker-1-format-hint">
        <span class="datepicker-hint-text text-muted small">yyyy-MM-dd</span>
        <button
            type="button"
            class="datepicker-help-icon"
            aria-label="Date format help"
        >
            <i class="bi bi-question-circle"></i>
        </button>
        <div class="datepicker-help-tooltip" role="tooltip">
            Enter a date in the format yyyy-MM-dd (e.g., 2026-02-11)
        </div>
    </div>
</div>
```

### 7.2 Calendar Popup (Day View)

```html
<div
    class="datepicker-calendar"
    id="datepicker-1-calendar"
    role="dialog"
    aria-modal="true"
    aria-label="Choose date"
>
    <!-- Header -->
    <div class="datepicker-header">
        <button type="button" class="datepicker-nav-btn" aria-label="Previous month">
            <i class="bi bi-chevron-left"></i>
        </button>
        <button type="button" class="datepicker-header-label" aria-live="polite">
            February 2026
        </button>
        <button type="button" class="datepicker-nav-btn" aria-label="Next month">
            <i class="bi bi-chevron-right"></i>
        </button>
    </div>

    <!-- Day Grid -->
    <table class="datepicker-grid" role="grid" aria-labelledby="datepicker-1-heading">
        <thead>
            <tr>
                <th class="datepicker-weeknumber-header" aria-hidden="true">Wk</th>
                <th scope="col" abbr="Monday">Mo</th>
                <th scope="col" abbr="Tuesday">Tu</th>
                <!-- ... -->
            </tr>
        </thead>
        <tbody>
            <tr>
                <td class="datepicker-weeknumber" aria-hidden="true">06</td>
                <td role="gridcell">
                    <button
                        type="button"
                        class="datepicker-day"
                        tabindex="-1"
                        aria-label="Monday, 2 February 2026"
                    >2</button>
                </td>
                <!-- ... -->
                <td role="gridcell">
                    <button
                        type="button"
                        class="datepicker-day datepicker-day-today"
                        tabindex="0"
                        aria-label="Wednesday, 11 February 2026"
                        aria-pressed="true"
                    >11</button>
                </td>
                <!-- ... -->
            </tr>
        </tbody>
    </table>

    <!-- Footer -->
    <div class="datepicker-footer">
        <button type="button" class="btn btn-sm btn-link datepicker-today-btn">
            Today
        </button>
    </div>
</div>
```

---

## 8. SCSS Styling

### 8.1 Class Naming

All classes are prefixed with `datepicker-`:

| Class | Element |
|-------|---------|
| `.datepicker` | Outer wrapper |
| `.datepicker-input` | Text input |
| `.datepicker-toggle` | Calendar icon button |
| `.datepicker-calendar` | Calendar popup container |
| `.datepicker-header` | Header row with nav arrows and month/year label |
| `.datepicker-header-label` | Clickable month+year text (transitions between views) |
| `.datepicker-nav-btn` | Previous/Next arrow buttons |
| `.datepicker-grid` | Day/month/year grid table |
| `.datepicker-day` | Individual day cell button |
| `.datepicker-day-today` | Today's date (ring highlight) |
| `.datepicker-day-selected` | Currently selected date (filled highlight) |
| `.datepicker-day-focused` | Keyboard-focused date (focus ring) |
| `.datepicker-day-disabled` | Disabled/out-of-range date |
| `.datepicker-day-outside` | Day from adjacent month (muted) |
| `.datepicker-weeknumber` | Week number cell |
| `.datepicker-weeknumber-header` | "Wk" column header |
| `.datepicker-weekday` | Weekday header cell (Mo, Tu, …) |
| `.datepicker-month` | Month cell in month view |
| `.datepicker-year` | Year cell in year view |
| `.datepicker-month-selected` | Selected month in month view |
| `.datepicker-year-selected` | Selected year in year view |
| `.datepicker-footer` | Footer row with Today button |
| `.datepicker-today-btn` | Today button |
| `.datepicker-hint` | Format hint container below input |
| `.datepicker-hint-text` | The format text (e.g., "yyyy-MM-dd") |
| `.datepicker-help-icon` | Help icon button (question mark circle) |
| `.datepicker-help-tooltip` | Tooltip popup with format explanation and example |
| `.datepicker-calendar-above` | Calendar positioned above input |
| `.datepicker-sm` | Small size variant (on `.datepicker`) |
| `.datepicker-lg` | Large size variant (on `.datepicker`) |

### 8.2 Styling Rules

- All colours, fonts, spacing, and borders use SCSS variables from `_variables.scss`.
- No hardcoded hex values, pixel sizes, or font names.
- The calendar popup uses `position: absolute` and `z-index: 1050` to overlay page content.
- The day grid cells are square, sized proportionally to the font size.
- Today's ring uses `box-shadow: inset 0 0 0 2px $primary` to avoid layout shift.
- Selected date uses `background-color: $primary; color: white`.
- Adjacent month days use `color: $gray-400`.
- Week numbers use `color: $gray-400; font-size: $font-size-sm`.
- Hover on day cells uses `background-color: $dropdown-link-hover-bg`.
- Focus ring on day cells uses the theme `$input-focus-box-shadow`.
- Month/year grid cells follow the same hover/selected patterns as day cells.
- SCSS nesting is limited to 3 levels per `CODING_STYLE.md`.

---

## 9. Calendar Positioning

- The calendar appears **below** the input by default.
- If there is insufficient space below (near the bottom of the viewport), the calendar appears **above** the input. This is calculated on open using `getBoundingClientRect()`.
- When positioned above, the class `datepicker-calendar-above` is added for styling (e.g., different box-shadow direction, top-aligned).

---

## 10. Date Calculations

### 10.1 Month Grid

- The grid always shows 6 rows × 7 columns (42 cells) for consistent height.
- Leading cells show the last days of the previous month (muted).
- Trailing cells show the first days of the next month (muted).
- The first cell in the grid is determined by `firstDayOfWeek` and the day of the week of the 1st of the displayed month.

### 10.2 Week Number Calculation

- Week numbers follow ISO 8601: the week containing the first Thursday of the year is week 1.
- The `getISOWeekNumber(date)` utility handles edge cases (week 52/53, year boundaries).

### 10.3 Locale Support

- Month names and weekday abbreviations are derived from `Intl.DateTimeFormat` using the configured `locale` option.
- This allows the component to display month/day names in any language supported by the browser's `Intl` API.

---

## 11. Edge Cases

| Scenario | Behaviour |
|----------|-----------|
| No initial value provided | Calendar opens on today's month. Input is empty with placeholder. |
| `value` is set to a Date before `minDate` | The value is clamped to `minDate`. Console warning logged. |
| `value` is set to a Date after `maxDate` | The value is clamped to `maxDate`. Console warning logged. |
| `minDate` equals `maxDate` | Only one date is selectable. |
| `minDate` > `maxDate` | Console error logged. Component renders but no dates are selectable. |
| February 29 in a non-leap year | Date is adjusted to February 28. |
| Navigating to a month where all days are disabled | The month is shown but no day is focusable. Nav arrows still work. |
| Typing an invalid date string | Input reverts to previous valid date on blur. Console warning logged. |
| Container not found | Console error logged. Component is not rendered. |
| Component disabled while calendar open | Calendar closes immediately. |
| `disabledDates` contains today | Today ring is still shown but cell is not selectable. Today button is disabled. |
| Year view at extreme ranges (year < 100 or > 9999) | Navigation buttons at the edges are disabled. |
| Multiple DatePickers on the same page | Each has a unique instance ID. Only one calendar is open at a time (opening one closes any other). |

---

## 12. Performance

- **DOM efficiency:** The calendar grid is rebuilt when the view month changes rather than maintaining 12 months of DOM. Only 42 day cells exist at a time.
- **Event delegation:** Click events on day cells use a single event listener on the grid table, not individual listeners per cell.
- **No external dependencies:** All date calculations use native `Date` and `Intl` APIs.
- **Animation:** View transitions (day → month → year) use CSS opacity transitions for a smooth feel without JavaScript animation overhead.

---

## 13. Testing Requirements

### 13.1 Unit Tests (Jest/Vitest with jsdom)

| Test Case | Category |
|-----------|----------|
| `constructor_WithValidContainer_RendersComponent` | Initialisation |
| `constructor_WithMissingContainer_LogsError` | Error handling |
| `constructor_WithDefaultOptions_ShowsTodaySelected` | Initialisation |
| `constructor_WithValue_ShowsSpecifiedDate` | Initialisation |
| `open_WhenClosed_ShowsCalendar` | Calendar |
| `open_WhenDisabled_DoesNotOpen` | State |
| `close_WhenOpen_HidesCalendar` | Calendar |
| `selectDay_ByClick_SetsValueAndCloses` | Selection |
| `selectDay_ByEnter_SetsValueAndCloses` | Selection |
| `selectDay_OutsideMonth_NavigatesToThatMonth` | Navigation |
| `navigateMonth_PrevButton_ShowsPreviousMonth` | Navigation |
| `navigateMonth_NextButton_ShowsNextMonth` | Navigation |
| `navigateMonth_PageUp_ShowsPreviousMonth` | Keyboard |
| `navigateMonth_PageDown_ShowsNextMonth` | Keyboard |
| `navigateYear_ShiftPageUp_ShowsPreviousYear` | Keyboard |
| `navigateYear_ShiftPageDown_ShowsNextYear` | Keyboard |
| `keyboard_ArrowKeys_MoveFocusByDay` | Keyboard |
| `keyboard_HomeEnd_MoveFocusToWeekBoundary` | Keyboard |
| `keyboard_Escape_ClosesCalendar` | Keyboard |
| `keyboard_T_NavigatesToToday` | Keyboard |
| `monthView_ClickMonth_ReturnsToDay View` | View switching |
| `yearView_ClickYear_ReturnsToMonthView` | View switching |
| `todayButton_ClickSelectsTodayAndCloses` | Footer |
| `todayButton_WhenTodayDisabled_IsDisabled` | Footer |
| `weekNumbers_WhenEnabled_ShowsISOWeekNumbers` | Configuration |
| `weekNumbers_WhenDisabled_HidesColumn` | Configuration |
| `firstDayOfWeek_Sunday_StartsGridOnSunday` | Configuration |
| `firstDayOfWeek_Monday_StartsGridOnMonday` | Configuration |
| `minDate_DaysBeforeAreDisabled` | Range |
| `maxDate_DaysAfterAreDisabled` | Range |
| `disabledDates_SpecificDaysAreDisabled` | Range |
| `format_CustomFormat_DisplaysCorrectly` | Formatting |
| `manualInput_ValidDate_UpdatesSelection` | Input |
| `manualInput_InvalidDate_RevertsOnBlur` | Input |
| `formatHint_WhenEnabled_ShowsBelowInput` | Configuration |
| `formatHint_WhenDisabled_IsHidden` | Configuration |
| `formatHint_CustomText_ShowsCustomText` | Configuration |
| `formatHelp_ClickIcon_ShowsTooltip` | Help |
| `formatHelp_HoverIcon_ShowsTooltip` | Help |
| `formatHelp_WhenDisabled_HidesIcon` | Help |
| `formatHelp_CustomText_ShowsCustomText` | Help |
| `getValue_ReturnsSelectedDate` | API |
| `setValue_UpdatesInputAndCalendar` | API |
| `navigateTo_MovesCalendarToMonth` | API |
| `setMinDate_UpdatesDisabledDays` | API |
| `disable_WhileOpen_ClosesCalendar` | State |
| `destroy_RemovesFromDOM_CleansUpListeners` | Lifecycle |
| `todayHighlight_AlwaysVisible_RegardlessOfMonth` | Visual |
| `locale_NonEnglish_ShowsLocalizedNames` | Locale |
| `aria_Attributes_AreCorrectlySet` | Accessibility |

### 13.2 Visual Verification

After implementation, visually verify in the demo page:

- Default, small, and large size variants render correctly
- Calendar opens below (or above near viewport bottom)
- Today has a ring highlight, selected date has filled highlight
- Arrow key navigation moves focus smoothly between days
- Month and year views render and navigate correctly
- Week numbers appear/disappear based on configuration
- Adjacent month days are muted
- Min/max date range is enforced visually and functionally
- Disabled state prevents all interaction
- Readonly allows calendar selection but no typing
- Manual date entry parses correctly
- Format hint is visible below the input and shows the configured format
- Format help icon shows a tooltip with example on click/hover
- Format hint and help icon hide when configured to do so
- Focus ring is visible during keyboard navigation

### 13.3 Cross-Browser

Test in Chrome, Firefox, Safari, and Edge for consistent rendering and keyboard behaviour.

---

## 14. Demo Page Integration

Add a section to `demo/index.html` titled "Date Picker" that demonstrates:

1. **Basic date picker** — Default configuration (today selected, Sunday start, format hint visible).
2. **Custom format** — `dd MMM yyyy` format (e.g., "11 Feb 2026") with matching format hint.
3. **Monday start** — First day of week set to Monday.
4. **Week numbers** — `showWeekNumbers: true`.
5. **Min/Max range** — Restrict to a specific date range (e.g., current month only).
6. **Disabled dates** — Weekends disabled via `isDateDisabled`.
7. **Size variants** — Small, default, and large side by side.
8. **Disabled and readonly** — One disabled, one readonly instance.
9. **Programmatic control** — Buttons that call `setValue()`, `getValue()`, `open()`, `close()`, `navigateTo()` to demonstrate the API.
10. **Locale** — A French locale picker showing localized month/day names.
11. **Format options** — Demonstrates `showFormatHint: false`, custom `formatHint`, custom `formatHelpText`, and `showFormatHelp: false`.

---

## 15. File Structure

```
components/
└── datepicker/
    ├── datepicker.ts             # Component logic
    ├── datepicker.scss           # Component styles
    ├── datepicker.test.ts        # Unit tests
    └── README.md                 # Component documentation
```

Output in `dist/`:

```
dist/
└── components/
    └── datepicker/
        ├── datepicker.js         # Compiled JavaScript
        ├── datepicker.css        # Compiled CSS
        └── datepicker.d.ts       # TypeScript declarations
```

---

## 16. Dependencies

| Dependency | Required | Notes |
|------------|----------|-------|
| Bootstrap 5 CSS | Yes | For `input-group`, `form-control`, `btn` base styles |
| Bootstrap 5 JS | No | This component does not use Bootstrap JS plugins |
| Bootstrap Icons | Yes | For `bi-calendar3`, `bi-chevron-left`, `bi-chevron-right` icons |
| Enterprise Theme CSS | Yes | For theme variable overrides |
| Intl API | Yes | Built into all modern browsers; used for locale-aware month/day names |

---

## 17. Definition of Done

- [ ] TypeScript component compiles without errors
- [ ] SCSS compiles without errors via `npm run build`
- [ ] All unit tests pass
- [ ] Component renders correctly in `demo/index.html`
- [ ] All keyboard interactions work as specified
- [ ] ARIA attributes are correct (verified with axe-core or manual inspection)
- [ ] Focus states are visible
- [ ] Component respects disabled, readonly, minDate, maxDate states
- [ ] Week numbers display correctly when enabled
- [ ] First day of week is configurable
- [ ] Today button works correctly
- [ ] Month view and year view navigation work
- [ ] Manual date input parsing works
- [ ] Locale-aware month and day names work
- [ ] `COMPONENTS.md` is updated with the new component entry
- [ ] `agentknowledge/concepts.yaml` is updated
- [ ] `CONVERSATION.md` is updated
- [ ] Code committed to git
