# LineEndingPicker

A dropdown picker that displays line ending (arrowhead / marker) styles with inline SVG previews, letting users select marker shapes for the start or end of lines in graph and drawing tools.

## Usage

```html
<link rel="stylesheet" href="components/lineendingpicker/lineendingpicker.css">
<script src="components/lineendingpicker/lineendingpicker.js"></script>

<div id="my-ending-picker"></div>

<script>
var picker = createLineEndingPicker("my-ending-picker", {
    value: "arrow",
    mode: "end",
    onChange: function(ending) {
        console.log("Selected:", ending.label, ending.value);
    }
});
</script>
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `endings` | `LineEndingItem[]` | 9 common markers | Custom endings list |
| `value` | `string` | -- | Initially selected ending value |
| `mode` | `"start" \| "end"` | `"end"` | Which end of the line receives the marker |
| `previewStrokeWidth` | `number` | `2` | Preview line thickness |
| `size` | `"mini" \| "sm" \| "default" \| "lg"` | `"default"` | Size variant |
| `disabled` | `boolean` | `false` | Disable the picker |
| `maxVisibleItems` | `number` | `8` | Max items before scrolling |
| `onChange` | `(ending) => void` | -- | Fires on selection change |
| `onOpen` | `() => void` | -- | Fires when dropdown opens |
| `onClose` | `() => void` | -- | Fires when dropdown closes |

## Default Endings

| Name | Value | Description |
|------|-------|-------------|
| None | `none` | No marker, plain line end |
| Narrow Arrow | `arrow-narrow` | Narrow acute arrowhead |
| Arrow | `arrow` | Standard filled arrowhead |
| Wide Arrow | `arrow-wide` | Wide filled arrowhead |
| Open Arrow | `arrow-open` | Unfilled arrowhead outline |
| Diamond | `diamond` | Filled diamond shape |
| Diamond Open | `diamond-open` | Unfilled diamond outline |
| Circle | `circle` | Filled circle |
| Circle Open | `circle-open` | Unfilled circle outline |

## API

| Method | Returns | Description |
|--------|---------|-------------|
| `getValue()` | `string` | Current ending value |
| `getSelectedEnding()` | `LineEndingItem \| null` | Full selected item |
| `setValue(value)` | `void` | Select by ending value |
| `setEndings(endings)` | `void` | Replace endings list |
| `getMode()` | `"start" \| "end"` | Current marker mode |
| `setMode(mode)` | `void` | Change mode and re-render trigger |
| `open()` | `void` | Open the dropdown |
| `close()` | `void` | Close the dropdown |
| `enable()` | `void` | Enable the picker |
| `disable()` | `void` | Disable the picker |
| `getElement()` | `HTMLElement \| null` | Root DOM element |
| `destroy()` | `void` | Tear down component |

## Mode

The `mode` option controls which end of the preview line displays the marker:

- `"end"` (default) -- marker appears on the right end of the line (`marker-end`)
- `"start"` -- marker appears on the left end of the line (`marker-start`)

You can change the mode at runtime with `setMode()`, which re-renders the trigger preview.

```javascript
// Create a start-of-line ending picker
var startPicker = createLineEndingPicker("start-picker", {
    value: "arrow",
    mode: "start"
});

// Switch mode at runtime
startPicker.setMode("end");
```

## Keyboard

| Key | Action |
|-----|--------|
| `ArrowDown` / `ArrowUp` | Move highlight / open dropdown |
| `Enter` | Confirm selection |
| `Escape` | Close dropdown |
| `Home` / `End` | Jump to first / last item |
| `Space` | Open dropdown (when trigger focused) |
