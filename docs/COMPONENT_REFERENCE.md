<!-- AGENT: Auto-generated — do not edit. Run `npm run build` to regenerate. -->

# Component Reference

Complete reference for all custom components shipped with the enterprise theme.

## Components

| Component | CSS | JS |
|-----------|-----|----|
| [cronpicker](#cronpicker) | `dist/components/cronpicker/cronpicker.css` | `dist/components/cronpicker/cronpicker.js` |
| [datepicker](#datepicker) | `dist/components/datepicker/datepicker.css` | `dist/components/datepicker/datepicker.js` |
| [durationpicker](#durationpicker) | `dist/components/durationpicker/durationpicker.css` | `dist/components/durationpicker/durationpicker.js` |
| [editablecombobox](#editablecombobox) | `dist/components/editablecombobox/editablecombobox.css` | `dist/components/editablecombobox/editablecombobox.js` |
| [errordialog](#errordialog) | `dist/components/errordialog/errordialog.css` | `dist/components/errordialog/errordialog.js` |
| [markdowneditor](#markdowneditor) | `dist/components/markdowneditor/markdowneditor.css` | `dist/components/markdowneditor/markdowneditor.js` |
| [progressmodal](#progressmodal) | `dist/components/progressmodal/progressmodal.css` | `dist/components/progressmodal/progressmodal.js` |
| [timepicker](#timepicker) | `dist/components/timepicker/timepicker.css` | `dist/components/timepicker/timepicker.js` |
| [timezonepicker](#timezonepicker) | `dist/components/timezonepicker/timezonepicker.css` | `dist/components/timezonepicker/timezonepicker.js` |

---

<a id="cronpicker"></a>

# CronPicker

A visual builder for extended 6-field CRON expressions (second, minute, hour, day-of-month, month, day-of-week) with presets, mode-based field editors, human-readable descriptions, and bidirectional raw expression editing.

## Quick Start

```html
<link rel="stylesheet" href="dist/components/cronpicker/cronpicker.css">
<script src="dist/components/cronpicker/cronpicker.js"></script>

<div id="my-cron"></div>
<script>
    var picker = createCronPicker("my-cron", {
        value: "0 0 9 * * 1-5",
        onChange: function(expr) { console.log("Expression:", expr); }
    });
</script>
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `value` | `string` | `"0 * * * * *"` | Initial CRON expression |
| `showPresets` | `boolean` | `true` | Show preset dropdown |
| `showDescription` | `boolean` | `true` | Show human-readable description |
| `showRawExpression` | `boolean` | `true` | Show raw expression input |
| `allowRawEdit` | `boolean` | `true` | Allow editing raw expression |
| `showFormatHint` | `boolean` | `true` | Show field order hint |
| `presets` | `CronPreset[]` | Default list | Custom presets |
| `disabled` | `boolean` | `false` | Disable the component |
| `readonly` | `boolean` | `false` | Read-only mode |
| `size` | `"sm" \| "default" \| "lg"` | `"default"` | Size variant |
| `onChange` | `(value: string) => void` | — | Expression change callback |
| `onPresetSelect` | `(preset: CronPreset) => void` | — | Preset selection callback |

## CronPreset Interface

```typescript
interface CronPreset {
    label: string;  // Display label
    value: string;  // CRON expression
}
```

## Public API

| Method | Returns | Description |
|--------|---------|-------------|
| `getValue()` | `string` | Current CRON expression |
| `getDescription()` | `string` | Human-readable description |
| `setValue(cron)` | `void` | Set expression programmatically |
| `clear()` | `void` | Reset to default expression |
| `enable()` | `void` | Enable component |
| `disable()` | `void` | Disable component |
| `destroy()` | `void` | Remove from DOM |

## CRON Expression Format

Six-field extended format: `second minute hour day-of-month month day-of-week`

| Field | Range | Labels |
|-------|-------|--------|
| Second | 0–59 | Numeric |
| Minute | 0–59 | Numeric |
| Hour | 0–23 | Numeric |
| Day of Month | 1–31 | Numeric |
| Month | 1–12 | Jan–Dec |
| Day of Week | 0–6 | Sun–Sat |

### Supported Syntax

| Syntax | Meaning | Example |
|--------|---------|---------|
| `*` | Every value | Every minute |
| `N` | Specific value | `30` |
| `N,M` | List | `1,15` |
| `N-M` | Range | `1-5` (Mon–Fri) |
| `*/N` | Step from 0 | `*/15` (every 15) |
| `N/M` | Step from N | `5/10` |

## Default Presets

| Preset | Expression |
|--------|-----------|
| Every second | `* * * * * *` |
| Every minute | `0 * * * * *` |
| Every hour | `0 0 * * * *` |
| Daily at midnight | `0 0 0 * * *` |
| Daily at noon | `0 0 12 * * *` |
| Weekdays at 9am | `0 0 9 * * 1-5` |
| Weekly on Monday | `0 0 0 * * 1` |
| Monthly on the 1st | `0 0 0 1 * *` |
| Yearly on Jan 1 | `0 0 0 1 1 *` |

## Features

- **Visual field builder** with 4 modes per field: Every, Specific, Range, Step
- **Chip grid** for specific value selection with named labels for months and days
- **Bidirectional sync** between visual builder and raw expression input
- **Human-readable description** generated live from the expression
- **Presets** for common schedules with custom preset support
- **Accessible** with ARIA roles on all interactive elements

## Dependencies

- Bootstrap CSS (form-control, form-select, btn)
- Bootstrap Icons CSS
- Does **not** require Bootstrap JS


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

<a id="markdowneditor"></a>

# MarkdownEditor

A Bootstrap 5-themed Markdown editor wrapper around [Vditor](https://github.com/Vanessa219/vditor) with tab/side-by-side layout modes, collapsible panes, inline selection toolbar, export, and optional modal hosting.

## Dependencies

This component requires external libraries loaded before the component script:

```html
<!-- Vditor (>= 3.8.13 required for security fixes; 3.11.2 recommended) -->
<link rel="stylesheet" href="https://unpkg.com/vditor@3.11.2/dist/index.css" />
<script src="https://unpkg.com/vditor@3.11.2/dist/index.min.js"></script>

<!-- DOMPurify (strongly recommended for XSS protection) -->
<script src="https://unpkg.com/dompurify@3.2.4/dist/purify.min.js"></script>

<!-- Component CSS + JS -->
<link rel="stylesheet" href="dist/components/markdowneditor/markdowneditor.css">
<script src="dist/components/markdowneditor/markdowneditor.js"></script>
```

## Quick Start

```html
<div id="my-editor"></div>
<script>
    var editor = createMarkdownEditor("my-editor", {
        title: "My Document",
        value: "# Hello World\n\nStart writing...",
        onChange: function(value) { console.log("Content changed"); }
    });
</script>
```

## Modal Usage

```html
<script>
    showMarkdownEditorModal({
        modalTitle: "Edit Description",
        value: existingMarkdown,
        onSave: function(value) {
            console.log("Saved:", value);
        },
        onClose: function(value) {
            // value is null if cancelled
            if (value !== null) {
                console.log("Closed with content");
            }
        }
    });
</script>
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `value` | `string` | `""` | Initial markdown content |
| `mode` | `"tabs" \| "sidebyside"` | `"tabs"` | Layout mode |
| `editable` | `boolean` | `true` | Readwrite (true) or readonly (false). When false, the toolbar is hidden and the Preview tab is shown by default |
| `title` | `string` | — | Header bar title |
| `height` | `string` | `"70vh"` | Component height (CSS value) |
| `width` | `string` | `"100%"` | Component width (CSS value) |
| `minHeight` | `number` | `300` | Minimum height in pixels |
| `minWidth` | `number` | `400` | Minimum width in pixels |
| `showExport` | `boolean` | `true` | Show export dropdown |
| `showFullscreen` | `boolean` | `true` | Show fullscreen toggle |
| `showInlineToolbar` | `boolean` | `true` | Show inline formatting toolbar on selection |
| `showCounter` | `boolean` | `false` | Show character counter |
| `placeholder` | `string` | — | Placeholder text |
| `vditorMode` | `"ir" \| "wysiwyg" \| "sv"` | `"ir"` | Vditor editing mode |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Size variant |
| `disabled` | `boolean` | `false` | Disabled state |
| `toolbar` | `string[]` | Default set | Custom Vditor toolbar items |
| `vditorOptions` | `object` | — | Custom Vditor options (merged) |
| `onChange` | `(value: string) => void` | — | Content changed |
| `onReady` | `() => void` | — | Editor ready |
| `onSave` | `(value: string) => void` | — | Save triggered (Ctrl+Enter) |
| `onModeChange` | `(mode: string) => void` | — | Layout mode switched |

## Modal Options

Extends all options above plus:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `modalTitle` | `string` | `"Edit Markdown"` | Modal title |
| `showSave` | `boolean` | `true` | Show Save button |
| `saveLabel` | `string` | `"Save"` | Save button text |
| `cancelLabel` | `string` | `"Cancel"` | Cancel button text |
| `onClose` | `(value: string \| null) => void` | — | Modal closed (null if cancelled) |

The modal dialog is horizontally resizable — drag the right edge to adjust width (min 480 px, max 95 vw).

## Public API

| Method | Returns | Description |
|--------|---------|-------------|
| `getValue()` | `string` | Get current markdown |
| `setValue(md)` | `void` | Set markdown content |
| `getHTML()` | `string` | Get sanitised rendered HTML |
| `setMode(mode)` | `void` | Switch layout mode |
| `setEditable(bool)` | `void` | Switch readonly/readwrite |
| `setTitle(title)` | `void` | Update header title |
| `exportMarkdown()` | `void` | Download as .md file |
| `exportHTML()` | `void` | Download as .html file |
| `exportPDF()` | `void` | Open print dialog (Save as PDF) |
| `focus()` | `void` | Focus the editor |
| `enable()` | `void` | Enable the editor |
| `disable()` | `void` | Disable the editor |
| `destroy()` | `void` | Remove component and clean up |

## Supported Markdown Features

Via Vditor, the editor supports:

- **GFM**: Headings, bold, italic, strikethrough, lists, task lists, tables, blockquotes, code blocks, inline code, horizontal rules, images, links
- **Extended**: Footnotes, superscript (`^text^`), subscript (`~text~`), mark (`==text==`), table of contents
- **Diagrams**: MermaidJS, Graphviz (DOT), PlantUML (rendered inline)
- **Syntax highlighting**: 170+ languages in fenced code blocks
- **Math**: LaTeX formulas via KaTeX

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl/Cmd + B | Bold |
| Ctrl/Cmd + I | Italic |
| Ctrl/Cmd + U | Underline |
| Ctrl/Cmd + D | Strikethrough |
| Ctrl/Cmd + Z | Undo |
| Ctrl/Cmd + Shift + Z | Redo |
| Ctrl/Cmd + K | Insert link |
| Ctrl/Cmd + Enter | Save (triggers onSave) |
| Escape | Close inline toolbar / Exit fullscreen |

## Security

**Important:** This component requires security-conscious deployment.

1. **Vditor version**: Always use >= 3.8.13 (fixes CVE-2022-0341, CVE-2022-0350, CVE-2021-4103, CVE-2021-32855). Pin the version in production.
2. **DOMPurify**: Always load DOMPurify alongside this component. All HTML output is sanitised through DOMPurify before DOM insertion or export.
3. **Content-Security-Policy**: Configure CSP headers to restrict `script-src` to trusted CDN domains only.
4. **SRI hashes**: Use Subresource Integrity attributes on CDN `<script>` and `<link>` tags in production.
5. **`getHTML()` is safe**: The public `getHTML()` method returns sanitised HTML. If you bypass the component and call Vditor's `getHTML()` directly, you must sanitise the output yourself.

## Window Globals

| Global | Type |
|--------|------|
| `window.MarkdownEditor` | `class` |
| `window.createMarkdownEditor` | `function(containerId, options): MarkdownEditor` |
| `window.showMarkdownEditorModal` | `function(options): MarkdownEditor` |


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

<a id="timezonepicker"></a>

# TimezonePicker

A searchable dropdown selector for IANA timezones with grouped regions, UTC offset display, and live current-time preview.

## Quick Start

```html
<link rel="stylesheet" href="dist/components/timezonepicker/timezonepicker.css">
<script src="dist/components/timezonepicker/timezonepicker.js"></script>

<div id="my-tz"></div>
<script>
    var picker = createTimezonePicker("my-tz", {
        timezone: "America/New_York",
        onSelect: function(tz) { console.log("Selected:", tz); }
    });
</script>
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `timezone` | `string` | `"UTC"` | Initial IANA timezone or "local" |
| `showTimePreview` | `boolean` | `true` | Live clock in dropdown footer |
| `showFormatHint` | `boolean` | `true` | IANA identifier below input |
| `showFormatHelp` | `boolean` | `true` | Help icon and tooltip |
| `formatHelpText` | `string` | — | Custom help tooltip text |
| `disabled` | `boolean` | `false` | Disable the component |
| `readonly` | `boolean` | `false` | Read-only mode |
| `size` | `"sm" \| "default" \| "lg"` | `"default"` | Size variant |
| `placeholder` | `string` | `"Select a timezone..."` | Input placeholder |
| `onSelect` | `(tz: string) => void` | — | Selection callback |
| `onChange` | `(tz: string) => void` | — | Change callback |
| `onOpen` | `() => void` | — | Dropdown open callback |
| `onClose` | `() => void` | — | Dropdown close callback |

## Public API

| Method | Returns | Description |
|--------|---------|-------------|
| `getValue()` | `string` | Current IANA timezone |
| `setValue(tz)` | `void` | Set timezone programmatically |
| `getOffset()` | `string` | Current UTC offset (e.g., "GMT-5") |
| `open()` | `void` | Open dropdown |
| `close()` | `void` | Close dropdown |
| `enable()` | `void` | Enable component |
| `disable()` | `void` | Disable component |
| `destroy()` | `void` | Remove from DOM |

## Features

- **Searchable dropdown** with substring matching on timezone name and offset
- **Grouped by region** — Common timezones first, then Americas, Europe, Asia, Pacific, etc.
- **Live time preview** — Shows current time in the selected timezone, updated every second
- **UTC offset display** — Each timezone shows its current GMT offset
- **Keyboard navigation** — Arrow keys, Enter to select, Escape to close
- **Accessible** — WAI-ARIA combobox/listbox pattern

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `ArrowDown` | Open dropdown or move highlight down |
| `ArrowUp` | Move highlight up |
| `Enter` | Select highlighted timezone |
| `Escape` | Close dropdown |

## Dependencies

- Bootstrap CSS (input-group, form-control, btn)
- Bootstrap Icons CSS
- Does **not** require Bootstrap JS


---

