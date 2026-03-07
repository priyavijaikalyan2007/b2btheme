<!-- AGENT: Documentation for the Ruler component — canvas-based calibrated ruler with cursor tracking. -->

# Ruler

A canvas-based calibrated ruler with cursor tracking, multiple unit systems, and DPI-aware rendering. Supports horizontal and vertical orientations with configurable tick marks, labelling, and real-time cursor position tracking.

## Assets

| Asset | Path |
|-------|------|
| CSS | `components/ruler/ruler.css` |
| JS | `components/ruler/ruler.js` |
| Types | `components/ruler/ruler.d.ts` |

## Requirements

- **Bootstrap CSS** -- for SCSS variables only
- Does **not** require Bootstrap JS or Bootstrap Icons.
- A container element with a defined width (horizontal) or height (vertical).

## Quick Start

### Horizontal Pixel Ruler

```html
<link rel="stylesheet" href="components/ruler/ruler.css">
<script src="components/ruler/ruler.js"></script>

<div id="my-ruler" style="width: 800px;"></div>
<script>
    var ruler = createRuler("my-ruler", {
        orientation: "horizontal",
        unit: "px",
        showCursor: true
    });
</script>
```

### Vertical Centimetre Ruler

```html
<div id="cm-ruler" style="height: 600px;"></div>
<script>
    var cmRuler = createRuler("cm-ruler", {
        orientation: "vertical",
        unit: "cm",
        markingSide: "right",
        cursorColor: "#228be6"
    });
</script>
```

### Inch Ruler with Custom Origin

```html
<div id="inch-ruler" style="width: 600px;"></div>
<script>
    var inchRuler = createRuler("inch-ruler", {
        unit: "in",
        origin: 96,
        showCursor: true
    });
</script>
```

### Custom Unit Ruler

```html
<div id="unit-ruler" style="width: 500px;"></div>
<script>
    // 1 custom unit = 50 CSS pixels
    var unitRuler = createRuler("unit-ruler", {
        unit: "unit",
        unitScale: 50,
        majorInterval: 2
    });
</script>
```

## API

### Factory Function

| Function | Returns | Description |
|----------|---------|-------------|
| `createRuler(containerId, options?)` | `Ruler` | Create a ruler inside the container |

The `Ruler` class is also available globally for direct instantiation:

```javascript
var ruler = new Ruler("container-id", { unit: "cm" });
```

### RulerOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `orientation` | `"horizontal" \| "vertical"` | `"horizontal"` | Ruler orientation |
| `markingSide` | `"top" \| "bottom" \| "left" \| "right"` | Depends on orientation | Side where tick marks appear. Horizontal defaults to `"bottom"`, vertical defaults to `"right"`. |
| `unit` | `"px" \| "unit" \| "cm" \| "mm" \| "in"` | `"px"` | Measurement unit |
| `unitScale` | `number` | `1` | CSS pixels per unit (only used when `unit` is `"unit"`) |
| `length` | `number` | Container size | Ruler length in CSS px. Defaults to the container width (horizontal) or height (vertical). |
| `majorInterval` | `number` | Auto | Override the auto-calculated major tick interval (in current unit) |
| `showCursor` | `boolean` | `true` | Show the cursor tracking line |
| `cursorColor` | `string` | `"#e03131"` | Colour of the cursor tracking line |
| `origin` | `number` | `0` | Offset in CSS pixels where the 0 mark starts |
| `disabled` | `boolean` | `false` | Disable mouse interaction |

### Instance Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getElement()` | `HTMLElement \| null` | Returns the wrapper element, or null if destroyed |
| `setUnit(unit)` | `void` | Change the measurement unit and re-render |
| `setOrientation(orientation)` | `void` | Change the orientation and re-render |
| `setOrigin(origin)` | `void` | Change the origin offset and re-render |
| `setCursorPosition(px)` | `void` | Set cursor position (CSS px) along the ruler axis |
| `calibrate()` | `void` | Re-measure DPI and re-render |
| `resize()` | `void` | Recalculate canvas size from container, re-render |
| `destroy()` | `void` | Remove DOM elements and clean up event listeners |

## Unit Systems

The ruler supports five unit systems with automatic tick subdivision:

| Unit | Major Tick | Minor Tick | Sub Tick | Description |
|------|-----------|-----------|---------|-------------|
| `px` | Every 100px | Every 50px | Every 10px | CSS pixels |
| `unit` | Every 1 unit | Every 0.5 unit | Every 0.1 unit | Custom unit (scaled by `unitScale`) |
| `in` | Every 1" | Every 0.5" | Every 0.25" | Inches (DPI-aware) |
| `cm` | Every 1cm | Every 0.5cm | Every 0.1cm | Centimetres (DPI-aware) |
| `mm` | Every 10mm | Every 5mm | Every 1mm | Millimetres (DPI-aware) |

When `majorInterval` is provided, it overrides the default major tick interval. Minor ticks are placed at half the major interval and sub-minor ticks at one-tenth.

## DPI Awareness

The ruler measures the physical DPI of the display using a hidden 1-inch DOM element. This allows `cm`, `mm`, and `in` units to render at accurate physical sizes. The measurement accounts for `window.devicePixelRatio` to render sharp lines on high-DPI (Retina) displays.

Call `calibrate()` after display changes (e.g., moving the window to a different monitor).

## Cursor Tracking

When `showCursor` is `true` (the default), the ruler draws a coloured line that follows the mouse position. The cursor automatically tracks when the mouse is over the ruler canvas.

External code can also drive the cursor position programmatically:

```javascript
// Sync cursor with mouse position over another element
document.getElementById("workspace").addEventListener("mousemove", function(e) {
    ruler.setCursorPosition(e.clientX - workspaceRect.left);
});
```

## CSS Classes

| Class | Description |
|-------|-------------|
| `.ruler` | Base wrapper |
| `.ruler-canvas` | The `<canvas>` element |
| `.ruler-horizontal` | Horizontal orientation (28px tall, full width) |
| `.ruler-vertical` | Vertical orientation (28px wide, full height) |
| `.ruler-disabled` | Disabled state (reduced opacity, no pointer events) |

## Accessibility

- The wrapper element has `aria-label="Ruler"` for screen reader identification.
- When disabled, `pointer-events: none` prevents interaction.
- The component is a visual measurement aid; screen readers will announce the label.

See `specs/ruler.prd.md` for the complete specification.
