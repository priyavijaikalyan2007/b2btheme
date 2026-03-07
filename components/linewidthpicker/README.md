# LineWidthPicker

A dropdown picker that displays line widths with visual CSS border previews, letting users select stroke thickness for graph and drawing tools.

## Usage

```html
<link rel="stylesheet" href="components/linewidthpicker/linewidthpicker.css">
<script src="components/linewidthpicker/linewidthpicker.js"></script>

<div id="my-width-picker"></div>

<script>
var picker = createLineWidthPicker("my-width-picker", {
    value: 2,
    onChange: function(width) {
        console.log("Selected:", width.label, width.value);
    }
});
</script>
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `widths` | `LineWidthItem[]` | 13 common widths | Custom width list |
| `value` | `number` | — | Initially selected width |
| `size` | `"mini" \| "sm" \| "default" \| "lg"` | `"default"` | Size variant |
| `disabled` | `boolean` | `false` | Disable the picker |
| `maxVisibleItems` | `number` | `8` | Max items before scrolling |
| `onChange` | `(width) => void` | — | Fires on selection change |
| `onOpen` | `() => void` | — | Fires when dropdown opens |
| `onClose` | `() => void` | — | Fires when dropdown closes |

## Default Widths

0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 15, 20px

## API

| Method | Returns | Description |
|--------|---------|-------------|
| `getValue()` | `number` | Current width value |
| `getSelectedWidth()` | `LineWidthItem \| null` | Full selected item |
| `setValue(value)` | `void` | Select a width programmatically |
| `setWidths(widths)` | `void` | Replace width list |
| `open()` | `void` | Open the dropdown |
| `close()` | `void` | Close the dropdown |
| `enable()` | `void` | Enable the picker |
| `disable()` | `void` | Disable the picker |
| `getElement()` | `HTMLElement \| null` | Root DOM element |
| `destroy()` | `void` | Tear down component |

## Keyboard

| Key | Action |
|-----|--------|
| `ArrowDown` / `ArrowUp` | Move highlight / open dropdown |
| `Enter` | Confirm selection |
| `Escape` | Close dropdown |
| `Home` / `End` | Jump to first / last item |
| `Space` | Open dropdown (when trigger focused) |
