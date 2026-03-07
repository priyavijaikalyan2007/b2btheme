# LineShapePicker

A dropdown picker that displays line shape/routing patterns with inline SVG previews, letting users select connector shapes for graph and drawing tools.

## Usage

```html
<link rel="stylesheet" href="components/lineshapepicker/lineshapepicker.css">
<script src="components/lineshapepicker/lineshapepicker.js"></script>

<div id="my-shape-picker"></div>

<script>
var picker = createLineShapePicker("my-shape-picker", {
    value: "curved",
    onChange: function(shape) {
        console.log("Selected:", shape.label, shape.value);
    }
});
</script>
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `shapes` | `LineShapeItem[]` | 5 common shapes | Custom shape list |
| `value` | `string` | -- | Initially selected shape value |
| `previewStrokeWidth` | `number` | `2` | Preview line thickness |
| `size` | `"mini" \| "sm" \| "default" \| "lg"` | `"default"` | Size variant |
| `disabled` | `boolean` | `false` | Disable the picker |
| `maxVisibleItems` | `number` | `8` | Max items before scrolling |
| `onChange` | `(shape) => void` | -- | Fires on selection change |
| `onOpen` | `() => void` | -- | Fires when dropdown opens |
| `onClose` | `() => void` | -- | Fires when dropdown closes |

## Default Shapes

| Name | Value | Description |
|------|-------|-------------|
| Straight | `straight` | Horizontal line |
| Curved | `curved` | Smooth quadratic Bezier arc |
| Bezier | `bezier` | S-curve with two control points |
| Spline | `spline` | Multi-point smooth curve |
| Orthogonal | `orthogonal` | Right-angle stepped path |

## API

| Method | Returns | Description |
|--------|---------|-------------|
| `getValue()` | `string` | Current shape value |
| `getSelectedShape()` | `LineShapeItem \| null` | Full selected item |
| `setValue(value)` | `void` | Select by shape value |
| `setShapes(shapes)` | `void` | Replace shape list |
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
