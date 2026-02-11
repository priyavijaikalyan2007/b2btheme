<!-- AGENT: Documentation for the DatePicker component. -->

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
