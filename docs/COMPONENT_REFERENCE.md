<!-- AGENT: Auto-generated — do not edit. Run `npm run build` to regenerate. -->

# Component Reference

Complete reference for all custom components shipped with the enterprise theme.

## Components

| Component | CSS | JS |
|-----------|-----|----|
| [datepicker](#datepicker) | `dist/components/datepicker/datepicker.css` | `dist/components/datepicker/datepicker.js` |
| [durationpicker](#durationpicker) | `dist/components/durationpicker/durationpicker.css` | `dist/components/durationpicker/durationpicker.js` |
| [editablecombobox](#editablecombobox) | `dist/components/editablecombobox/editablecombobox.css` | `dist/components/editablecombobox/editablecombobox.js` |
| [errordialog](#errordialog) | `dist/components/errordialog/errordialog.css` | `dist/components/errordialog/errordialog.js` |
| [progressmodal](#progressmodal) | `dist/components/progressmodal/progressmodal.css` | `dist/components/progressmodal/progressmodal.js` |
| [timepicker](#timepicker) | `dist/components/timepicker/timepicker.css` | `dist/components/timepicker/timepicker.js` |

---

<a id="datepicker"></a>

# DatePicker

A calendar date picker with day, month, and year navigation views.

## Quick Start

### Script Tag

```html
<link rel="stylesheet" href="https://static.knobby.io/components/datepicker/datepicker.css">
<script src="https://static.knobby.io/components/datepicker/datepicker.js"></script>

<div id="my-date"></div>
<script>
    var picker = createDatePicker("my-date", {
        format: "yyyy-MM-dd",
        firstDayOfWeek: 0,
        onSelect: function(date) { console.log("Selected:", date); }
    });
</script>
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `value` | `Date` | Today | Initial selected date |
| `format` | `string` | `"yyyy-MM-dd"` | Display format |
| `firstDayOfWeek` | `number` | `0` | 0=Sunday, 1=Monday, …, 6=Saturday |
| `showWeekNumbers` | `boolean` | `false` | Show ISO week numbers |
| `showTodayButton` | `boolean` | `true` | Show Today button |
| `minDate` | `Date` | — | Earliest selectable date |
| `maxDate` | `Date` | — | Latest selectable date |
| `disabledDates` | `Date[]` | — | Specific non-selectable dates |
| `isDateDisabled` | `(date: Date) => boolean` | — | Custom disable function |
| `disabled` | `boolean` | `false` | Disable the component |
| `readonly` | `boolean` | `false` | Read-only input, calendar works |
| `placeholder` | `string` | Format string | Placeholder text |
| `size` | `"sm" \| "default" \| "lg"` | `"default"` | Size variant |
| `locale` | `string` | `"en-US"` | Locale for month/day names |
| `showFormatHint` | `boolean` | `true` | Show format hint below input |
| `formatHint` | `string` | Format string | Custom hint text |
| `showFormatHelp` | `boolean` | `true` | Show help icon |
| `formatHelpText` | `string` | Auto-generated | Custom help tooltip |
| `onSelect` | `(date: Date) => void` | — | Selection callback |
| `onChange` | `(date: Date \| null) => void` | — | Value change callback |
| `onOpen` | `() => void` | — | Calendar open callback |
| `onClose` | `() => void` | — | Calendar close callback |

## Instance Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getValue()` | `Date \| null` | Current selected date |
| `getFormattedValue()` | `string` | Formatted date string |
| `setValue(date)` | `void` | Set date programmatically |
| `open()` | `void` | Open the calendar |
| `close()` | `void` | Close the calendar |
| `navigateTo(year, month)` | `void` | Navigate to specific month |
| `enable()` | `void` | Enable the component |
| `disable()` | `void` | Disable the component |
| `setMinDate(date)` | `void` | Set minimum date |
| `setMaxDate(date)` | `void` | Set maximum date |
| `destroy()` | `void` | Remove from DOM |

## Keyboard Interactions

| Key | Day View |
|-----|----------|
| Arrow keys | Navigate by day/week |
| Home / End | First/last day of week |
| PageUp / PageDown | Previous/next month |
| Shift+PageUp/Down | Previous/next year |
| Enter / Space | Select focused date |
| Escape | Close calendar |
| t | Jump to today |

## Dependencies

- Bootstrap 5 CSS (input-group, form-control, btn)
- Bootstrap Icons (bi-calendar3, bi-chevron-left, bi-chevron-right)
- Enterprise Theme CSS


---

<a id="durationpicker"></a>

# DurationPicker

A duration/interval picker with configurable unit patterns and ISO 8601 support.

## Quick Start

```html
<link rel="stylesheet" href="https://static.knobby.io/components/durationpicker/durationpicker.css">
<script src="https://static.knobby.io/components/durationpicker/durationpicker.js"></script>

<div id="my-duration"></div>
<script>
    var picker = createDurationPicker("my-duration", {
        pattern: "h-m",
        onChange: function(val) { console.log("Duration:", val); }
    });
</script>
```

## Supported Patterns

`d-h-m`, `h-m`, `h-m-s`, `h`, `m`, `s`, `m-s`, `w`, `fn`, `mo`, `q`, `y`, `y-mo`, `y-mo-d`, `w-d`, `w-d-h`, `d-h-m-s`

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `pattern` | `string` | `"h-m"` | Unit pattern |
| `value` | `DurationValue` | All zeros | Initial value |
| `unitSteps` | `Record<DurationUnit, number>` | All 1 | Step per unit |
| `unitMax` | `Record<DurationUnit, number>` | Natural ranges | Max per unit |
| `carry` | `boolean` | `false` | Overflow carries to next unit |
| `hideZeroLeading` | `boolean` | `true` | Hide leading zeros in display |
| `displayFormat` | `(val) => string` | — | Custom formatter |
| `showClearButton` | `boolean` | `true` | Show Clear button |
| `showFormatHint` | `boolean` | `true` | Show ISO 8601 hint |
| `showFormatHelp` | `boolean` | `true` | Show help icon |
| `disabled` | `boolean` | `false` | Disable component |
| `readonly` | `boolean` | `false` | Read-only input |
| `size` | `"sm" \| "default" \| "lg"` | `"default"` | Size variant |
| `onChange` | `(val: DurationValue) => void` | — | Change callback |

## Instance Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getValue()` | `DurationValue` | Current duration |
| `getFormattedValue()` | `string` | Display string |
| `toISO()` | `string` | ISO 8601 string |
| `toTotalSeconds()` | `number` | Total in seconds |
| `setValue(val)` | `void` | Set duration |
| `setFromISO(iso)` | `void` | Set from ISO string |
| `clear()` | `void` | Reset to zero |
| `open()` / `close()` | `void` | Toggle dropdown |
| `enable()` / `disable()` | `void` | Toggle state |
| `destroy()` | `void` | Remove from DOM |

## Manual Input

Accepts ISO 8601 (`PT4H30M`) or shorthand (`4h 30m`).

## Dependencies

- Bootstrap 5 CSS, Bootstrap Icons, Enterprise Theme CSS


---

<a id="editablecombobox"></a>

# EditableComboBox

A combined text input and dropdown list component built on Bootstrap 5. Users can type free text or select a value from a filterable dropdown.

## Purpose and Use Cases

- Searchable selectors with large option lists
- Fields where users may type a custom value or pick from suggestions
- Tag entry with auto-complete suggestions
- Country, region, or status selectors

## Quick Start

### Script Tag

```html
<!-- Dependencies -->
<link rel="stylesheet" href="dist/css/custom.css">
<link rel="stylesheet" href="dist/icons/bootstrap-icons.css">
<link rel="stylesheet" href="dist/components/editablecombobox/editablecombobox.css">

<!-- Component -->
<div id="my-combo"></div>
<script src="dist/components/editablecombobox/editablecombobox.js"></script>
<script>
    createEditableComboBox("my-combo", {
        items: [
            { label: "Apple" },
            { label: "Banana" },
            { label: "Cherry" }
        ],
        placeholder: "Pick a fruit..."
    });
</script>
```

### ES Module

```js
import { createEditableComboBox } from "./dist/components/editablecombobox/editablecombobox.js";

const combo = createEditableComboBox("my-combo", {
    items: [{ label: "Red" }, { label: "Green" }, { label: "Blue" }],
    onSelect: (item) => console.log("Selected:", item.label)
});
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `items` | `ComboBoxItem[]` | Required | The items to display in the dropdown |
| `placeholder` | `string` | `undefined` | Placeholder text for the input |
| `value` | `string` | `undefined` | Initial input value |
| `restrictToItems` | `boolean` | `false` | When true, only list values are accepted |
| `maxVisibleItems` | `number` | `8` | Max visible items before scrolling |
| `minFilterLength` | `number` | `0` | Min characters before filtering starts |
| `disabled` | `boolean` | `false` | Disables the component |
| `readonly` | `boolean` | `false` | Makes input non-editable; dropdown still works |
| `size` | `"sm" \| "default" \| "lg"` | `"default"` | Size variant |
| `filterFn` | `function` | Substring match | Custom filter function |
| `onSelect` | `function` | `undefined` | Called when an item is selected |
| `onChange` | `function` | `undefined` | Called when input value changes |
| `onOpen` | `function` | `undefined` | Called when dropdown opens |
| `onClose` | `function` | `undefined` | Called when dropdown closes |

### ComboBoxItem

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `label` | `string` | Required | Display text |
| `value` | `string` | `undefined` | Programmatic value (distinct from label) |
| `disabled` | `boolean` | `false` | Item is visible but not selectable |
| `group` | `string` | `undefined` | Group header under which the item appears |

## Instance Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getValue()` | `string` | Current input text |
| `getSelectedItem()` | `ComboBoxItem \| null` | Selected item, or null for free text |
| `setValue(value)` | `void` | Set input value programmatically |
| `setItems(items)` | `void` | Replace the dropdown items |
| `open()` | `void` | Open the dropdown |
| `close()` | `void` | Close the dropdown |
| `enable()` | `void` | Enable the component |
| `disable()` | `void` | Disable the component |
| `destroy()` | `void` | Remove from DOM and clean up |

## Keyboard Interactions

| Key | Closed | Open |
|-----|--------|------|
| ArrowDown | Opens, highlights first | Highlights next |
| ArrowUp | Opens, highlights last | Highlights previous |
| Enter | No effect | Selects highlighted item |
| Escape | No effect | Closes dropdown |
| Tab | Normal tab | Commits highlight, moves focus |
| Home/End | Cursor in input | First/last item |
| PageUp/Down | No effect | Scroll by 10 items |

## Accessibility

- Implements the WAI-ARIA Combobox pattern
- `role="combobox"` on the input with `aria-expanded`, `aria-controls`, `aria-activedescendant`
- `role="listbox"` on the dropdown, `role="option"` on each item
- Focus stays on the input; items are highlighted via `aria-activedescendant`
- "No matches" message uses `role="status"` for screen reader announcement

## Dependencies

| Dependency | Required | Notes |
|------------|----------|-------|
| Bootstrap 5 CSS | Yes | For `input-group`, `form-control`, `btn` |
| Bootstrap 5 JS | No | Not used by this component |
| Bootstrap Icons | Yes | For `bi-chevron-down` |
| Enterprise Theme CSS | Yes | For theme variable overrides |


---

<a id="errordialog"></a>

# ErrorDialog Component

A Bootstrap 5 modal that displays literate error messages with user-friendly narrative and collapsible technical details.

## Dependencies

- Bootstrap 5 JS (Modal API) — loaded as a global script
- Bootstrap Icons CSS — for header and UI icons
- Enterprise theme CSS — `dist/css/custom.css`
- Component CSS — `dist/components/errordialog/errordialog.css`

## Quick Start

```html
<!-- In your HTML head -->
<link rel="stylesheet" href="dist/css/custom.css">
<link rel="stylesheet" href="dist/icons/bootstrap-icons.css">
<link rel="stylesheet" href="dist/components/errordialog/errordialog.css">

<!-- Container where modals will be injected -->
<div id="error-dialog-container"></div>

<!-- Scripts -->
<script src="dist/js/bootstrap.bundle.min.js"></script>
<script src="dist/components/errordialog/errordialog.js"></script>
<script>
    showErrorDialog("error-dialog-container", {
        title: "Document Could Not Be Saved",
        message: "The server rejected the save request.",
        suggestion: "Please try again in a moment.",
        errorCode: "DOC_SAVE_FAILED",
        correlationId: "a1b2c3d4-e5f6-7890"
    });
</script>
```

## LiterateError Interface

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | `string` | Yes | Short, non-alarming summary |
| `message` | `string` | Yes | Full sentence in plain language |
| `suggestion` | `string` | No | Actionable advice for the user |
| `errorCode` | `string` | No | Unique, searchable error code |
| `correlationId` | `string` | No | UUID linking to backend logs |
| `timestamp` | `string` | No | UTC timestamp of the error |
| `technicalDetail` | `string` | No | Stack trace, API response, etc. |
| `context` | `Record<string, string>` | No | Key-value pairs of system state |
| `onRetry` | `() => void` | No | Callback for the Retry button |

## API

### Class: `ErrorDialog`

```js
const dialog = new ErrorDialog("container-id");
dialog.show({ title: "Error", message: "Something went wrong." });
dialog.hide();
dialog.destroy();
```

- `show(error)` — Builds and displays the modal
- `hide()` — Hides the modal (triggers cleanup)
- `destroy()` — Removes the modal element from the DOM

### Function: `showErrorDialog(containerId, error)`

One-liner convenience function. Creates an `ErrorDialog` instance and immediately shows it.

## Features

- **Danger header** — Red header strip with exclamation icon
- **Suggestion box** — Light alert with lightbulb icon (only when suggestion provided)
- **Technical accordion** — Collapsible section with error code, correlation ID, timestamp, context, and stack trace
- **Copy to clipboard** — Copies all technical details with visual feedback
- **Retry button** — Shown only when `onRetry` callback is provided
- **XSS safe** — All content set via `textContent`, never `innerHTML`
- **Auto-cleanup** — Modal DOM is removed when dismissed

## Accessibility

- Modal uses `aria-labelledby` pointing to the title
- Close button has `aria-label="Close"`
- Suggestion box has `role="alert"`
- Tab navigation works across all focusable elements
- Escape key closes the modal


---

<a id="progressmodal"></a>

# ProgressModal

A modal dialog for displaying progress of long-running operations.

## Quick Start

```html
<link rel="stylesheet" href="https://static.knobby.io/components/progressmodal/progressmodal.css">
<script src="https://static.knobby.io/components/progressmodal/progressmodal.js"></script>

<script>
    // Indeterminate spinner
    var modal = showProgressModal({ title: "Processing..." });
    modal.logInfo("Starting operation...");
    modal.setStatus("Connecting...");
    // ... later
    modal.logSuccess("Done!");
    modal.complete("Operation finished.");

    // Stepped progress
    var stepped = showSteppedProgressModal("Uploading", 5);
    stepped.setStep(1);
    stepped.logInfo("Uploading file 1...");
    // ... later
    stepped.setStep(5);
    stepped.complete();
</script>
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `title` | `string` | Required | Modal title |
| `mode` | `"indeterminate" \| "determinate"` | `"indeterminate"` | Progress mode |
| `statusText` | `string` | — | Initial status message |
| `totalSteps` | `number` | — | Total steps (enables step counter) |
| `showTimestamps` | `boolean` | `true` | Timestamps in log |
| `showDetailLog` | `boolean` | `true` | Show scrollable log |
| `showCopyLog` | `boolean` | `true` | Copy log button |
| `autoClose` | `number` | `0` | Auto-close delay (ms) on success |
| `allowBackdropClose` | `boolean` | `false` | Backdrop dismissible when done |
| `wide` | `boolean` | `false` | Wide layout |
| `onCancel` | `() => void` | — | Cancel callback (shows button) |
| `onRetry` | `() => void` | — | Retry callback (shows on error) |
| `onClose` | `() => void` | — | Close callback |

## Instance Methods

| Method | Description |
|--------|-------------|
| `show()` | Show the modal |
| `setStatus(text)` | Update status text |
| `setProgress(0.0–1.0)` | Set progress (switches to determinate) |
| `setStep(n)` | Set current step (calculates %) |
| `setIndeterminate()` | Switch to spinner mode |
| `log(entry)` | Add log entry |
| `logInfo(msg)` | Add info entry |
| `logSuccess(msg)` | Add success entry |
| `logError(msg)` | Add error entry |
| `logWarning(msg)` | Add warning entry |
| `complete(msg?)` | Mark as complete |
| `fail(msg?)` | Mark as failed |
| `close()` | Close (after complete/fail) |
| `getLog()` | Get all entries |
| `getLogText()` | Get log as text |
| `getState()` | "running" / "completed" / "failed" / "closed" |
| `isVisible()` | Check visibility |
| `destroy()` | Remove from DOM |

## Log Entry Levels

| Level | Icon | Colour |
|-------|------|--------|
| `info` | `bi-info-circle` | Default |
| `success` | `bi-check-circle-fill` | Green |
| `error` | `bi-x-circle-fill` | Red |
| `warning` | `bi-exclamation-triangle-fill` | Yellow |
| `progress` | Mini spinner | Primary |

## Dependencies

- Bootstrap 5 CSS, Bootstrap Icons, Enterprise Theme CSS
- Does NOT require Bootstrap JS


---

<a id="timepicker"></a>

# TimePicker

A time-of-day picker with spinner columns and optional timezone selector.

## Quick Start

```html
<link rel="stylesheet" href="https://static.knobby.io/components/timepicker/timepicker.css">
<script src="https://static.knobby.io/components/timepicker/timepicker.js"></script>

<div id="my-time"></div>
<script>
    var picker = createTimePicker("my-time", {
        clockMode: "24",
        showSeconds: true,
        onSelect: function(time) { console.log("Selected:", time); }
    });
</script>
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `value` | `TimeValue` | Current time | Initial time |
| `clockMode` | `"12" \| "24"` | `"24"` | Clock mode |
| `showSeconds` | `boolean` | `true` | Show seconds column |
| `format` | `string` | `"HH:mm:ss"` | Display format |
| `minuteStep` | `number` | `1` | Minute step (1, 5, 15, 30) |
| `secondStep` | `number` | `1` | Second step |
| `minTime` | `TimeValue` | — | Earliest selectable time |
| `maxTime` | `TimeValue` | — | Latest selectable time |
| `showNowButton` | `boolean` | `true` | Show Now button |
| `showTimezone` | `boolean` | `false` | Show timezone selector |
| `timezone` | `string` | `"UTC"` | IANA timezone or "local" |
| `showFormatHint` | `boolean` | `true` | Format hint below input |
| `showFormatHelp` | `boolean` | `true` | Help icon and tooltip |
| `disabled` | `boolean` | `false` | Disable the component |
| `readonly` | `boolean` | `false` | Read-only input |
| `size` | `"sm" \| "default" \| "lg"` | `"default"` | Size variant |
| `onSelect` | `(time: TimeValue) => void` | — | Selection callback |
| `onChange` | `(time: TimeValue \| null) => void` | — | Change callback |
| `onTimezoneChange` | `(tz: string) => void` | — | Timezone change callback |

## TimeValue Interface

```typescript
interface TimeValue {
    hours: number;   // 0–23
    minutes: number; // 0–59
    seconds?: number; // 0–59
}
```

## Instance Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getValue()` | `TimeValue \| null` | Current time |
| `getFormattedValue()` | `string` | Formatted time string |
| `getTimezone()` | `string` | Current IANA timezone |
| `setValue(time)` | `void` | Set time programmatically |
| `setTimezone(tz)` | `void` | Set timezone |
| `open()` / `close()` | `void` | Toggle dropdown |
| `enable()` / `disable()` | `void` | Toggle state |
| `destroy()` | `void` | Remove from DOM |

## Dependencies

- Bootstrap 5 CSS, Bootstrap Icons, Enterprise Theme CSS
- Intl API (for timezone support)


---

