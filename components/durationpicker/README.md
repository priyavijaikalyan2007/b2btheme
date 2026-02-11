<!-- AGENT: Documentation for the DurationPicker component. -->

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
