# ToolColorPicker

A visual colour picker that displays colours as tool icons (pens, markers, pencils, highlighters, brushes). Each colour renders as the tool icon filled with that colour. The tool shape is configurable at creation and runtime.

## Usage

### Row Layout (default)

```html
<link rel="stylesheet" href="components/toolcolorpicker/toolcolorpicker.css">
<script src="components/toolcolorpicker/toolcolorpicker.js"></script>

<div id="my-color-picker"></div>

<script>
var picker = createToolColorPicker({
    container: "my-color-picker",
    tool: "pen",
    onChange: function(color) {
        console.log("Selected:", color.label, color.hex);
    }
});
</script>
```

### Grid Layout

```html
<div id="brush-colors"></div>

<script>
var picker = createToolColorPicker({
    container: "brush-colors",
    tool: "brush",
    colors: createToolColorPicker.BRUSH_COLORS,
    layout: "grid",
    gridColumns: 4,
    onChange: function(color) {
        console.log("Brush:", color.hex);
    }
});
</script>
```

### Highlighter with Alpha

```html
<div id="highlighter-picker"></div>

<script>
var picker = createToolColorPicker({
    container: "highlighter-picker",
    tool: "highlighter",
    colors: createToolColorPicker.HIGHLIGHTER_COLORS,
    onChange: function(color) {
        console.log("Highlight:", color.hex, "alpha:", color.alpha);
    }
});
</script>
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `container` | `HTMLElement \| string` | (required) | Container element or ID |
| `tool` | `"pen" \| "marker" \| "pencil" \| "highlighter" \| "brush"` | `"pen"` | Tool icon shape |
| `colors` | `ToolColor[]` | Built-in pack for tool | Available colours |
| `value` | `string` | First colour's hex | Initially selected colour hex |
| `onChange` | `(color: ToolColor) => void` | -- | Fires on colour selection |
| `layout` | `"row" \| "grid"` | `"row"` | Layout mode |
| `gridColumns` | `number` | `6` | Columns in grid layout |
| `showTooltips` | `boolean` | `true` | Show colour name tooltip on hover |

## API

| Method | Returns | Description |
|--------|---------|-------------|
| `getValue()` | `ToolColor` | Currently selected colour |
| `setValue(hex)` | `void` | Set selected colour by hex |
| `setColors(colors)` | `void` | Replace the colour palette |
| `setTool(tool)` | `void` | Change the tool icon shape |
| `getElement()` | `HTMLElement \| null` | Root DOM element |
| `destroy()` | `void` | Tear down and remove from DOM |

## Built-in Color Packs

Access via static properties on the factory function:

| Pack | Property | Count | Alpha |
|------|----------|-------|-------|
| Pen | `createToolColorPicker.PEN_COLORS` | 7 | 1.0 |
| Marker | `createToolColorPicker.MARKER_COLORS` | 6 | 0.6 |
| Highlighter | `createToolColorPicker.HIGHLIGHTER_COLORS` | 6 | 0.4 |
| Pencil | `createToolColorPicker.PENCIL_COLORS` | 6 | 1.0 |
| Brush | `createToolColorPicker.BRUSH_COLORS` | 8 | 1.0 |

## Tool Icons

Each tool renders a distinct 24x36px SVG icon:

| Tool | Visual |
|------|--------|
| Pen | Thin triangular nib at bottom, cylindrical body with clip at top |
| Marker | Wide chisel-tip at bottom, thick rectangular body with ridge |
| Pencil | Hexagonal body, eraser at top, sharpened point at bottom |
| Highlighter | Wide flat tip, thick body with grip section |
| Brush | Round bristles at bottom, thin wooden handle with ferrule |

## Keyboard

| Key | Action |
|-----|--------|
| `Tab` / `Shift+Tab` | Navigate between swatches |
| `Enter` / `Space` | Select focused swatch |

## ToolColor Interface

```typescript
interface ToolColor {
    hex: string;      // CSS hex colour
    label: string;    // Human-readable name
    alpha?: number;   // 0-1 opacity (default: 1)
}
```
