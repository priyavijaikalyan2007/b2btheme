# LineTypePicker

A dropdown picker that displays line dash patterns with inline SVG previews, letting users select stroke styles for graph and drawing tools.

## Usage

```html
<link rel="stylesheet" href="components/linetypepicker/linetypepicker.css">
<script src="components/linetypepicker/linetypepicker.js"></script>

<div id="my-type-picker"></div>

<script>
var picker = createLineTypePicker("my-type-picker", {
    value: "dashed",
    onChange: function(type) {
        console.log("Selected:", type.label, type.value, type.dashArray);
    }
});
</script>
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `types` | `LineTypeItem[]` | 12 common patterns | Custom type list |
| `value` | `string` | — | Initially selected type name (e.g. `"dashed"`) |
| `previewStrokeWidth` | `number` | `2` | Preview line thickness |
| `size` | `"mini" \| "sm" \| "default" \| "lg"` | `"default"` | Size variant |
| `disabled` | `boolean` | `false` | Disable the picker |
| `maxVisibleItems` | `number` | `8` | Max items before scrolling |
| `onChange` | `(type) => void` | — | Fires on selection change |
| `onOpen` | `() => void` | — | Fires when dropdown opens |
| `onClose` | `() => void` | — | Fires when dropdown closes |

## Default Types

| Name | Value | Dasharray |
|------|-------|-----------|
| Solid | `solid` | (none) |
| Dotted | `dotted` | `2 2` |
| Dashed | `dashed` | `6 4` |
| Dash-Dot | `dash-dot` | `6 4 2 4` |
| Long Dash | `long-dash` | `12 4` |
| Short Dash | `short-dash` | `4 2` |
| Double Dot | `double-dot` | `2 2 6 2` |
| Double Dash | `double-dash` | `6 2 6 2` |
| Narrow Dot | `narrow-dot` | `1 2` |
| Narrow Dash | `narrow-dash` | `3 2` |
| Wide Dot | `wide-dot` | `2 6` |
| Wide Dash | `wide-dash` | `8 6` |

## LineTypeItem

| Field | Type | Description |
|-------|------|-------------|
| `label` | `string` | Display name (e.g. `"Dashed"`) |
| `value` | `string` | Semantic identifier (e.g. `"dashed"`) |
| `dashArray` | `string` | SVG stroke-dasharray (e.g. `"6 4"`). Empty string for solid. |

## API

| Method | Returns | Description |
|--------|---------|-------------|
| `getValue()` | `string` | Current semantic type name (e.g. `"dashed"`) |
| `getSelectedType()` | `LineTypeItem \| null` | Full selected item |
| `setValue(value)` | `void` | Select by type name (also accepts dasharray for compat) |
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
