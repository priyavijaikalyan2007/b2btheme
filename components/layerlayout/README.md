<!-- AGENT: Documentation for the LayerLayout component -- z-stack layout container with absolute positioning. -->

# LayerLayout

A z-stack layout container where all children are simultaneously visible, layered in z-order. The container uses `position: relative` and each layer uses `position: absolute`, enabling overlapping content such as floating action buttons, overlays, watermarks, and heads-up displays.

## Assets

| Asset | Path |
|-------|------|
| CSS | `dist/components/layerlayout/layerlayout.css` |
| JS | `dist/components/layerlayout/layerlayout.js` |
| Types | `dist/components/layerlayout/layerlayout.d.ts` |

## Requirements

- **Bootstrap CSS** -- for SCSS variables (`$gray-*`, `$font-size-*`, etc.)
- Does **not** require Bootstrap JS.

## Quick Start

```html
<link rel="stylesheet" href="dist/components/layerlayout/layerlayout.css">
<script src="dist/components/layerlayout/layerlayout.js"></script>

<script>
    // Background canvas with a floating action button in the bottom-right
    var stack = createLayerLayout({
        sizing: "fixed",
        width: "100%",
        height: "400px",
        layers: [
            { child: document.getElementById("canvas"), fill: true },
            { child: document.getElementById("fab"), align: "bottom-right", zIndex: 10 }
        ]
    });
</script>
```

## How It Works

LayerLayout creates a `position: relative` container. Each layer is wrapped in a `position: absolute` div and positioned according to its configuration -- fill the entire container, anchor to specific edges, or snap to one of nine alignment points.

```
Container (position: relative)
+-------------------------------------------------------+
|  Layer 0: fill (background image)                     |
|  +---------------------------------------------------+|
|  |                                                   ||
|  |         Layer 1: align "center"                   ||
|  |              (watermark)                          ||
|  |                                                   ||
|  +---------------------------------------------------+|
|                                                       |
|                              Layer 2: align           |
|                              "bottom-right"           |
|                                   [FAB]               |
+-------------------------------------------------------+
```

All layers are rendered simultaneously. Higher z-index values appear on top of lower ones. Layers added later appear above earlier layers by default.

## Options

### LayerLayoutOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | `string` | auto | Custom element ID |
| `sizing` | `"largest" \| "fixed" \| "fitContent"` | `"fitContent"` | Container sizing strategy |
| `layers` | `LayerConfig[]` | `[]` | Initial layers (bottom-to-top order) |
| `padding` | `string` | -- | Container padding (CSS value) |
| `cssClass` | `string` | -- | Additional CSS class(es) |
| `height` | `string` | -- | Explicit height (CSS value) |
| `width` | `string` | -- | Explicit width (CSS value) |
| `onLayoutChange` | `(state) => void` | -- | Fired when layers are added or removed |

### LayerConfig

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `child` | `HTMLElement \| Component` | -- | Child element or component |
| `key` | `string` | -- | Optional string key for lookup |
| `anchor` | `{ top?, right?, bottom?, left? }` | -- | Anchor offsets from container edges (CSS values) |
| `align` | alignment string | -- | Shorthand alignment (see table below) |
| `zIndex` | `number` | -- | Explicit z-index for this layer |
| `fill` | `boolean` | `false` | If true, layer stretches to fill entire container |

## Alignment Shortcuts

The `align` property maps to CSS absolute positioning:

| Value | CSS Position |
|-------|-------------|
| `"top-left"` | `top: 0; left: 0` |
| `"top-center"` | `top: 0; left: 50%; transform: translateX(-50%)` |
| `"top-right"` | `top: 0; right: 0` |
| `"center-left"` | `top: 50%; left: 0; transform: translateY(-50%)` |
| `"center"` | `top: 50%; left: 50%; transform: translate(-50%, -50%)` |
| `"center-right"` | `top: 50%; right: 0; transform: translateY(-50%)` |
| `"bottom-left"` | `bottom: 0; left: 0` |
| `"bottom-center"` | `bottom: 0; left: 50%; transform: translateX(-50%)` |
| `"bottom-right"` | `bottom: 0; right: 0` |

## Public API

| Method | Returns | Description |
|--------|---------|-------------|
| `show(container?)` | `void` | Append to container and display |
| `hide()` | `void` | Remove from DOM (preserves state) |
| `destroy()` | `void` | Full cleanup, destroy all layers |
| `getRootElement()` | `HTMLElement \| null` | The root relative container |
| `isVisible()` | `boolean` | Whether the layout is displayed |
| `setContained(value)` | `void` | Set contained mode |
| `addLayer(config)` | `void` | Add a layer on top of the stack |
| `removeLayer(index)` | `void` | Remove a layer by index |
| `removeLayerByKey(key)` | `void` | Remove a layer by its string key |
| `setLayerZIndex(index, z)` | `void` | Update z-index of a layer |
| `getLayerCount()` | `number` | Number of mounted layers |
| `getState()` | `LayerLayoutState` | Serialisable state snapshot |
| `setState(state)` | `void` | Restore state (sizing only) |

## State

```typescript
interface LayerLayoutState {
    layerCount: number;
    sizing: string;
}
```

## Composability

LayerLayout implements the standard layout container contract. Any component with `show(container)` / `hide()` / `destroy()` can be used as a layer child. Plain HTMLElements are also supported.

```js
// Overlay a loading spinner on top of a content area
var overlay = new LayerLayout({
    sizing: "fixed",
    width: "100%",
    height: "100%",
    layers: [
        { child: contentPanel, fill: true },
        { child: spinner, align: "center", zIndex: 100 }
    ]
});

overlay.show(document.getElementById("main"));
```

## Global Exports

When loaded via `<script>` tag:

- `window.LayerLayout` -- LayerLayout class
- `window.createLayerLayout` -- Factory function (creates and shows)

## CSS Classes

| Class | Element | Description |
|-------|---------|-------------|
| `.layerlayout` | Root | Relative-positioned container |
| `.layerlayout-layer` | Wrapper | Absolute-positioned layer wrapper |
