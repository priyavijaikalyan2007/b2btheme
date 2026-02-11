<!-- AGENT: Registry of custom components shipped with the enterprise theme. -->

# Components

Custom components built on the Enterprise Bootstrap Theme.

## ErrorDialog

Displays literate error messages in a Bootstrap 5 modal with user-friendly narrative and collapsible technical details.

| Asset | Path |
|-------|------|
| CSS | `dist/components/errordialog/errordialog.css` |
| JS | `dist/components/errordialog/errordialog.js` |
| Types | `dist/components/errordialog/errordialog.d.ts` |

**Requires:** Bootstrap JS (Modal API), Bootstrap Icons CSS.

**Usage (script tag):**

```html
<script src="dist/components/errordialog/errordialog.js"></script>
<script>
    showErrorDialog("container-id", {
        title: "Save Failed",
        message: "Could not save the document.",
        suggestion: "Try again in a moment.",
        errorCode: "DOC_SAVE_001"
    });
</script>
```

**Usage (ES module):**

```js
import { showErrorDialog } from "./dist/components/errordialog/errordialog.js";

showErrorDialog("container-id", {
    title: "Save Failed",
    message: "Could not save the document."
});
```

See `components/errordialog/README.md` for full documentation.

## EditableComboBox

A combined text input and dropdown list that allows free text entry or selection from a filterable list of options. Supports substring filtering, keyboard navigation, item grouping, size variants, and the WAI-ARIA combobox pattern.

| Asset | Path |
|-------|------|
| CSS | `dist/components/editablecombobox/editablecombobox.css` |
| JS | `dist/components/editablecombobox/editablecombobox.js` |
| Types | `dist/components/editablecombobox/editablecombobox.d.ts` |

**Requires:** Bootstrap CSS (input-group, form-control, btn), Bootstrap Icons CSS. Does **not** require Bootstrap JS.

**Usage (script tag):**

```html
<script src="dist/components/editablecombobox/editablecombobox.js"></script>
<script>
    var combo = createEditableComboBox("container-id", {
        items: [{ label: "Apple" }, { label: "Banana" }, { label: "Cherry" }],
        placeholder: "Pick a fruit...",
        onSelect: function(item) { console.log("Selected:", item.label); }
    });
</script>
```

**Usage (ES module):**

```js
import { createEditableComboBox } from "./dist/components/editablecombobox/editablecombobox.js";

const combo = createEditableComboBox("container-id", {
    items: [{ label: "Red" }, { label: "Green" }, { label: "Blue" }],
    onSelect: (item) => console.log("Selected:", item.label)
});
```

See `components/editablecombobox/README.md` for full documentation.

## DatePicker

A calendar date picker with day, month, and year navigation views. Supports manual input with configurable format, week numbers, locale-aware first day of week, min/max date constraints, and format hint with help tooltip.

| Asset | Path |
|-------|------|
| CSS | `dist/components/datepicker/datepicker.css` |
| JS | `dist/components/datepicker/datepicker.js` |
| Types | `dist/components/datepicker/datepicker.d.ts` |

**Requires:** Bootstrap CSS (input-group, form-control, btn), Bootstrap Icons CSS. Does **not** require Bootstrap JS.

**Usage (script tag):**

```html
<script src="dist/components/datepicker/datepicker.js"></script>
<script>
    var picker = createDatePicker("container-id", {
        format: "yyyy-MM-dd",
        firstDayOfWeek: 0,
        onSelect: function(date) { console.log("Selected:", date); }
    });
</script>
```

See `components/datepicker/README.md` for full documentation.

## TimePicker

A time-of-day picker with spinner columns for hours, minutes, and seconds. Supports 12-hour and 24-hour formats, optional timezone selector with searchable IANA timezone dropdown, and format hint with help tooltip.

| Asset | Path |
|-------|------|
| CSS | `dist/components/timepicker/timepicker.css` |
| JS | `dist/components/timepicker/timepicker.js` |
| Types | `dist/components/timepicker/timepicker.d.ts` |

**Requires:** Bootstrap CSS (input-group, form-control, btn), Bootstrap Icons CSS. Does **not** require Bootstrap JS.

**Usage (script tag):**

```html
<script src="dist/components/timepicker/timepicker.js"></script>
<script>
    var picker = createTimePicker("container-id", {
        clockMode: "24",
        showSeconds: true,
        onSelect: function(time) { console.log("Selected:", time); }
    });
</script>
```

See `components/timepicker/README.md` for full documentation.

## DurationPicker

A duration/interval picker with configurable unit patterns and ISO 8601 support. Supports 17 unit patterns (d-h-m, h-m-s, w, fn, mo, q, y, etc.), carry mode, manual ISO 8601 and shorthand input, and format hint with help tooltip.

| Asset | Path |
|-------|------|
| CSS | `dist/components/durationpicker/durationpicker.css` |
| JS | `dist/components/durationpicker/durationpicker.js` |
| Types | `dist/components/durationpicker/durationpicker.d.ts` |

**Requires:** Bootstrap CSS (input-group, form-control, btn), Bootstrap Icons CSS. Does **not** require Bootstrap JS.

**Usage (script tag):**

```html
<script src="dist/components/durationpicker/durationpicker.js"></script>
<script>
    var picker = createDurationPicker("container-id", {
        pattern: "h-m",
        onChange: function(val) { console.log("Duration:", val); }
    });
</script>
```

See `components/durationpicker/README.md` for full documentation.

## ProgressModal

A modal dialog for displaying progress of long-running operations. Supports indeterminate (spinner) and determinate (progress bar) modes, stepped progress, a scrollable timestamped detail log with copy-to-clipboard, and Cancel/Retry/Close lifecycle management.

| Asset | Path |
|-------|------|
| CSS | `dist/components/progressmodal/progressmodal.css` |
| JS | `dist/components/progressmodal/progressmodal.js` |
| Types | `dist/components/progressmodal/progressmodal.d.ts` |

**Requires:** Bootstrap CSS, Bootstrap Icons CSS. Does **not** require Bootstrap JS.

**Usage (script tag):**

```html
<script src="dist/components/progressmodal/progressmodal.js"></script>
<script>
    var modal = showProgressModal({ title: "Processing..." });
    modal.logInfo("Starting operation...");
    modal.setStatus("Working...");
    // ... later
    modal.logSuccess("Done!");
    modal.complete("Operation finished.");
</script>
```

See `components/progressmodal/README.md` for full documentation.

## TimezonePicker

A searchable dropdown selector for IANA timezones grouped by geographic region, with UTC offset display and a live clock showing the current time in the selected timezone.

| Asset | Path |
|-------|------|
| CSS | `dist/components/timezonepicker/timezonepicker.css` |
| JS | `dist/components/timezonepicker/timezonepicker.js` |
| Types | `dist/components/timezonepicker/timezonepicker.d.ts` |

**Requires:** Bootstrap CSS (input-group, form-control, btn), Bootstrap Icons CSS. Does **not** require Bootstrap JS.

**Usage (script tag):**

```html
<script src="dist/components/timezonepicker/timezonepicker.js"></script>
<script>
    var picker = createTimezonePicker("container-id", {
        timezone: "America/New_York",
        onSelect: function(tz) { console.log("Selected:", tz); }
    });
</script>
```

See `components/timezonepicker/README.md` for full documentation.

## CronPicker

A visual builder for extended 6-field CRON expressions (second, minute, hour, day-of-month, month, day-of-week) with presets, mode-based field editors, human-readable descriptions, and bidirectional raw expression editing.

| Asset | Path |
|-------|------|
| CSS | `dist/components/cronpicker/cronpicker.css` |
| JS | `dist/components/cronpicker/cronpicker.js` |
| Types | `dist/components/cronpicker/cronpicker.d.ts` |

**Requires:** Bootstrap CSS (form-control, form-select, btn), Bootstrap Icons CSS. Does **not** require Bootstrap JS.

**Usage (script tag):**

```html
<script src="dist/components/cronpicker/cronpicker.js"></script>
<script>
    var picker = createCronPicker("container-id", {
        value: "0 0 9 * * 1-5",
        onChange: function(expr) { console.log("Expression:", expr); }
    });
</script>
```

See `components/cronpicker/README.md` for full documentation.
