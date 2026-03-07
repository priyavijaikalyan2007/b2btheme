# LineTypePicker

A dropdown picker that displays line dash patterns with inline SVG previews, letting users select stroke styles for graph and drawing tools.

## Usage

```html
<link rel="stylesheet" href="components/linetypepicker/linetypepicker.css">
<script src="components/linetypepicker/linetypepicker.js"></script>

<div id="my-type-picker"></div>

<script>
var picker = createLineTypePicker("my-type-picker", {
    value: "6 4",
    onChange: function(type) {
        console.log("Selected:", type.label, type.value);
    }
});
</script>
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `types` | `LineTypeItem[]` | 12 common patterns | Custom type list |
| `value` | `string` | — | Initially selected dasharray value |
| `previewStrokeWidth` | `number` | `2` | Preview line thickness |
| `size` | `"mini" \| "sm" \| "default" \| "lg"` | `"default"` | Size variant |
| `disabled` | `boolean` | `false` | Disable the picker |
| `maxVisibleItems` | `number` | `8` | Max items before scrolling |
| `onChange` | `(type) => void` | — | Fires on selection change |
| `onOpen` | `() => void` | — | Fires when dropdown opens |
| `onClose` | `() => void` | — | Fires when dropdown closes |

## Default Types

| Name | Dasharray |
|------|-----------|
| Solid | (none) |
| Dotted | `2 2` |
| Dashed | `6 4` |
| Dash-Dot | `6 4 2 4` |
| Long Dash | `12 4` |
| Short Dash | `4 2` |
| Double Dot | `2 2 6 2` |
| Double Dash | `6 2 6 2` |
| Narrow Dot | `1 2` |
| Narrow Dash | `3 2` |
| Wide Dot | `2 6` |
| Wide Dash | `8 6` |

## API

| Method | Returns | Description |
|--------|---------|-------------|
| `getValue()` | `string` | Current dasharray value |
| `getSelectedType()` | `LineTypeItem \| null` | Full selected item |
| `setValue(value)` | `void` | Select by dasharray value |
| `setTypes(types)` | `void` | Replace type list |
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
