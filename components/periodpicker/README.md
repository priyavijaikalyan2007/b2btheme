# PeriodPicker

Coarse time-period selector for enterprise project planning. Select months, quarters, halves, or years (e.g., "Q1 2026", "H2 2028") with automatic date resolution based on start/end mode.

## Usage

### CSS

```html
<link rel="stylesheet" href="components/periodpicker/periodpicker.css">
```

### JavaScript

```html
<script src="components/periodpicker/periodpicker.js"></script>
```

### Basic

```html
<div id="my-period-picker"></div>

<script>
const picker = createPeriodPicker("my-period-picker", {
    mode: "start",
    onSelect: function(value) {
        console.log("Selected:", value.period, value.year, value.date);
    }
});
</script>
```

### End Mode (Quarters Only)

```html
<div id="quarter-picker"></div>

<script>
const picker = createPeriodPicker("quarter-picker", {
    mode: "end",
    granularities: ["quarter", "year"],
    onSelect: function(value) {
        console.log("End date:", value.date);
    }
});
</script>
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mode` | `"start" \| "end"` | `"start"` | Resolve to first or last day of period |
| `granularities` | `PeriodGranularity[]` | `["month","quarter","half","year"]` | Which period types to show |
| `value` | `PeriodValue \| null` | `null` | Initial selected value |
| `minYear` | `number` | `currentYear - 10` | Earliest navigable year |
| `maxYear` | `number` | `currentYear + 10` | Latest navigable year |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Size variant |
| `disabled` | `boolean` | `false` | Disable the component |
| `readonly` | `boolean` | `false` | Read-only mode |
| `placeholder` | `string` | `"Select period…"` | Input placeholder |
| `onSelect` | `(value: PeriodValue) => void` | — | Fires on selection |
| `onChange` | `(value: PeriodValue \| null) => void` | — | Fires on value change |
| `onOpen` | `() => void` | — | Fires when dropdown opens |
| `onClose` | `() => void` | — | Fires when dropdown closes |
| `keyBindings` | `Record<string, string>` | — | Override default key combos |

## PeriodValue

```typescript
interface PeriodValue {
    year: number;           // e.g., 2026
    period: string;         // "Jan", "Q1", "H1", "2026"
    type: PeriodGranularity; // "month" | "quarter" | "half" | "year"
    date: Date;             // Resolved date based on mode
    monthIndex?: number;    // 0-11 for months
}
```

## Date Resolution

| Selection | Start Mode | End Mode |
|-----------|-----------|----------|
| Jan 2026 | 2026-01-01 | 2026-01-31 |
| Q1 2026 | 2026-01-01 | 2026-03-31 |
| H2 2028 | 2028-07-01 | 2028-12-31 |
| 2026 | 2026-01-01 | 2026-12-31 |

## Public API

| Method | Returns | Description |
|--------|---------|-------------|
| `getValue()` | `PeriodValue \| null` | Get current selection |
| `setValue(value)` | `void` | Set selection programmatically |
| `getFormattedValue()` | `string` | Get display string (e.g., "Q1 2026") |
| `open()` | `void` | Open dropdown |
| `close()` | `void` | Close dropdown |
| `enable()` | `void` | Enable component |
| `disable()` | `void` | Disable component |
| `setReadonly(flag)` | `void` | Toggle read-only |
| `setMode(mode)` | `void` | Switch start/end mode |
| `setYear(year)` | `void` | Navigate to year |
| `destroy()` | `void` | Clean up DOM and listeners |

## Keyboard

| Key | Action |
|-----|--------|
| `ArrowDown` | Open dropdown / Move focus down |
| `ArrowUp` | Move focus up |
| `ArrowLeft` | Move focus left |
| `ArrowRight` | Move focus right |
| `Enter` / `Space` | Select focused period |
| `Escape` | Close dropdown |
| `PageUp` | Previous year |
| `PageDown` | Next year |

## Dropdown Positioning

The dropdown is portaled to `document.body` with `position: fixed` and `z-index: 2050`, ensuring it renders above FormDialog overlays (z-index 2001).
