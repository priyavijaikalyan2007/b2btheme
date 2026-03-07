<!-- AGENT: Documentation for the TimezonePicker component. -->

# TimezonePicker

A searchable dropdown selector for IANA timezones with grouped regions, UTC offset display, and live current-time preview.

## Quick Start

```html
<link rel="stylesheet" href="components/timezonepicker/timezonepicker.css">
<script src="components/timezonepicker/timezonepicker.js"></script>

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
| `size` | `"mini" \| "sm" \| "default" \| "lg"` | `"default"` | Size variant |
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
