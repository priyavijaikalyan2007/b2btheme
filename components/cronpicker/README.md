<!-- AGENT: Documentation for the CronPicker component. -->

# CronPicker

A visual builder for extended 6-field CRON expressions (second, minute, hour, day-of-month, month, day-of-week) with presets, mode-based field editors, human-readable descriptions, and bidirectional raw expression editing.

## Quick Start

```html
<link rel="stylesheet" href="components/cronpicker/cronpicker.css">
<script src="components/cronpicker/cronpicker.js"></script>

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
