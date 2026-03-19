<!-- AGENT: Documentation for the TimePicker component. -->

# TimePicker

A time-of-day picker with spinner columns and optional timezone selector.

## Quick Start

```html
<link rel="stylesheet" href="https://theme.priyavijai-kalyan2007.workers.dev/components/timepicker/timepicker.css">
<script src="https://theme.priyavijai-kalyan2007.workers.dev/components/timepicker/timepicker.js"></script>

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
| `size` | `"mini" \| "sm" \| "default" \| "lg"` | `"default"` | Size variant |
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
