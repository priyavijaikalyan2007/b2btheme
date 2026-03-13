# LineEndingPicker

A dropdown picker that displays line ending (arrowhead / marker) styles with inline SVG previews, letting users select marker shapes for the start or end of lines in graph and drawing tools.  Marker values are aligned with maxGraph native arrow types for direct interop with GraphCanvasMx.

## Usage

```html
<link rel="stylesheet" href="components/lineendingpicker/lineendingpicker.css">
<script src="components/lineendingpicker/lineendingpicker.js"></script>

<div id="my-ending-picker"></div>

<script>
var picker = createLineEndingPicker("my-ending-picker", {
    value: "classic",
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
| `endings` | `LineEndingItem[]` | 12 standard markers | Custom endings list |
| `value` | `string` | -- | Initially selected ending value |
| `mode` | `"start" \| "end"` | `"end"` | Which end of the line receives the marker |
| `previewStrokeWidth` | `number` | `2` | Preview line thickness |
| `size` | `"mini" \| "sm" \| "default" \| "lg"` | `"default"` | Size variant |
| `disabled` | `boolean` | `false` | Disable the picker |
| `maxVisibleItems` | `number` | `8` | Max items before scrolling |
| `showERNotation` | `boolean` | `false` | Append ER notation endings to the default list |
| `onChange` | `(ending) => void` | -- | Fires on selection change |
| `onOpen` | `() => void` | -- | Fires when dropdown opens |
| `onClose` | `() => void` | -- | Fires when dropdown closes |

## Default Endings (maxGraph-aligned)

| Name | Value | Description |
|------|-------|-------------|
| None | `none` | No marker, plain line end |
| Block | `block` | Filled triangle arrowhead |
| Block (Open) | `block-open` | Unfilled triangle outline |
| Classic | `classic` | Arrow with notch (classic arrowhead) |
| Classic (Open) | `classic-open` | Unfilled classic arrowhead |
| Open | `open` | Chevron (open, no fill) |
| Diamond | `diamond` | Filled diamond shape |
| Diamond (Open) | `diamond-open` | Unfilled diamond outline |
| Circle | `oval` | Filled circle |
| Circle (Open) | `oval-open` | Unfilled circle outline |
| Dash | `dash` | Perpendicular line |
| Cross | `cross` | X mark |

## ER Notation Endings

When `showERNotation: true` is set (and no custom `endings` array is provided), the following Entity-Relationship endings are appended after the standard endings, with a visual group separator.

| Name | Value | Description |
|------|-------|-------------|
| One | `er-one` | Single vertical bar |
| Mandatory One | `er-mandatory-one` | Double vertical bars |
| Many (Crow's Foot) | `er-many` | Three lines radiating from a point |
| One to Many | `er-one-to-many` | Bar + crow's foot |
| Zero to One | `er-zero-to-one` | Circle + bar |
| Zero to Many | `er-zero-to-many` | Circle + crow's foot |

```javascript
// Enable ER notation endings alongside standard endings
var picker = createLineEndingPicker("er-picker", {
    value: "classic",
    showERNotation: true,
    onChange: function(ending) {
        console.log("Selected:", ending.value);
    }
});
```

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
    value: "classic",
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
