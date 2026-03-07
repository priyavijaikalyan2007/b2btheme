<!-- AGENT: Documentation for the Magnifier component -- cursor-following magnifying glass overlay. -->

# Magnifier

A cursor-following magnifying glass overlay that clones and scales the content of a target element within a circular lens. The lens tracks the mouse cursor and shows a magnified view of the area directly under the pointer.

## Assets

| Asset | Path |
|-------|------|
| CSS | `components/magnifier/magnifier.css` |
| JS | `components/magnifier/magnifier.js` |
| Types | `components/magnifier/magnifier.d.ts` |

## Requirements

- **Bootstrap CSS** -- for SCSS variables (`$gray-*`, `$shadow-md`)
- Does **not** require Bootstrap JS or Bootstrap Icons.
- No external dependencies.

## Quick Start

```html
<link rel="stylesheet" href="components/magnifier/magnifier.css">
<script src="components/magnifier/magnifier.js"></script>

<div id="magnify-target" style="width: 600px; height: 400px; overflow: auto;">
    <p>Hover over this content to see it magnified in the lens.</p>
    <img src="sample-image.png" alt="Sample" style="width: 100%;">
</div>

<script>
    var magnifier = createMagnifier("my-container", {
        target: "magnify-target",
        zoom: 2.5,
        diameter: 180,
        showCrosshair: true,
        onMove: function(x, y) {
            console.log("Cursor at:", x, y);
        }
    });
</script>
```

## Options (MagnifierOptions)

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `target` | `HTMLElement \| string` | `document.body` | Element to magnify. A string value is treated as an element ID. |
| `zoom` | `number` | `2` | Magnification factor. |
| `diameter` | `number` | `150` | Lens diameter in pixels. |
| `borderColor` | `string` | `"#868e96"` | Lens border colour (gray-600). |
| `borderWidth` | `number` | `2` | Lens border width in pixels. |
| `offset` | `{ x: number; y: number }` | `{ x: 20, y: 20 }` | Pixel offset from cursor to lens position. |
| `showCrosshair` | `boolean` | `true` | Display crosshair lines at the centre of the lens. |
| `disabled` | `boolean` | `false` | Start with magnification disabled. |
| `onMove` | `(x: number, y: number) => void` | -- | Callback fired on each mouse move with cursor coordinates. |

## API

| Method | Returns | Description |
|--------|---------|-------------|
| `getElement()` | `HTMLElement \| null` | Returns the lens DOM element. |
| `enable()` | `void` | Enable magnification tracking. |
| `disable()` | `void` | Disable tracking and hide the lens. |
| `setZoom(zoom)` | `void` | Update the magnification factor. Must be positive. |
| `setDiameter(diameter)` | `void` | Update the lens diameter in pixels. Must be positive. |
| `destroy()` | `void` | Remove the lens from the DOM and detach all event listeners. |

### Factory Function

```javascript
var magnifier = createMagnifier("container-id", { zoom: 3, diameter: 200 });
```

The `containerId` parameter serves as the logical owner identifier. The lens element itself is appended to `document.body` because it uses `position: fixed` to follow the cursor across the viewport.

## How It Works

1. On `mouseenter` over the target, the component clones the target element's DOM subtree into the lens.
2. The clone is scaled by the `zoom` factor using CSS `transform: scale()`.
3. On each `mousemove`, the lens repositions near the cursor (offset by `offset.x` and `offset.y`), and the clone is translated so that the area directly under the cursor appears centred in the lens.
4. On `mouseleave`, the lens hides and the clone is removed.

## Global Exports

```javascript
window.Magnifier;          // Class constructor
window.createMagnifier;    // Factory function
```

## Examples

### Basic Usage with Default Settings

```javascript
var mag = createMagnifier("app", { target: "photo-gallery" });
```

### High Zoom with Large Lens

```javascript
var mag = createMagnifier("app", {
    target: document.getElementById("blueprint"),
    zoom: 4,
    diameter: 250,
    borderColor: "#1c7ed6",
    borderWidth: 3,
    showCrosshair: true
});
```

### Programmatic Control

```javascript
var mag = createMagnifier("app", { target: "map-view", disabled: true });

// Enable on button click
document.getElementById("toggle-btn").addEventListener("click", function() {
    mag.enable();
});

// Change zoom dynamically
document.getElementById("zoom-slider").addEventListener("input", function(e) {
    mag.setZoom(parseFloat(e.target.value));
});

// Clean up
document.getElementById("remove-btn").addEventListener("click", function() {
    mag.destroy();
});
```
