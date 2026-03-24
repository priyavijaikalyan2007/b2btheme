<!-- AGENT: Documentation for the GraphMinimap component — graph overview navigation widget. -->

# GraphMinimap

A small, always-visible overview widget that shows a miniaturised view of the entire graph canvas. Displays a viewport rectangle indicating the currently visible region. Users can click or drag the viewport rectangle to pan the main canvas.

## Assets

| Asset | Path |
|-------|------|
| CSS | `components/graphminimap/graphminimap.css` |
| JS | `components/graphminimap/graphminimap.js` |
| Types | `components/graphminimap/graphminimap.d.ts` |

## Requirements

- **Bootstrap CSS** — for SCSS variables
- A `GraphCanvasHandle`-compatible graph canvas instance
- Does **not** require Bootstrap JS

## Quick Start

```html
<link rel="stylesheet" href="components/graphminimap/graphminimap.css">
<script src="components/graphminimap/graphminimap.js"></script>
<script>
    var minimap = createGraphMinimap({
        container: document.getElementById("minimap-host"),
        graphCanvas: myGraphCanvasInstance
    });

    // Manually refresh after data changes
    minimap.refresh();

    // Toggle visibility
    minimap.toggle();

    // Clean up
    minimap.destroy();
</script>
```

## API

### Factory Function

| Function | Returns | Description |
|----------|---------|-------------|
| `createGraphMinimap(options)` | `GraphMinimap` | Create a minimap instance |

### GraphMinimapOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `container` | `HTMLElement` | **required** | Host element for the minimap |
| `graphCanvas` | `GraphCanvasHandle` | **required** | Graph canvas to synchronise with |
| `width` | `number` | `200` | Minimap width in px |
| `height` | `number` | `150` | Minimap height in px |
| `backgroundColor` | `string` | `'#f8f9fa'` | SVG background colour |
| `viewportColor` | `string` | `'rgba(59,130,246,0.3)'` | Viewport rectangle fill |
| `viewportBorderColor` | `string` | `'#3b82f6'` | Viewport rectangle border |
| `nodeColor` | `string` | `'#94a3b8'` | Default node dot colour |
| `edgeColor` | `string` | `'#cbd5e1'` | Default edge line colour |
| `showEdges` | `boolean` | `true` | Render edges (auto-disabled for >500 nodes) |
| `collapsed` | `boolean` | `false` | Start collapsed |
| `position` | `string` | `'bottom-right'` | Corner position hint |

### GraphCanvasHandle Interface

The graph canvas passed to the minimap must implement this interface:

```typescript
interface GraphCanvasHandle {
    getNodes(): { id: string; x: number; y: number; color?: string }[];
    getEdges(): { source: string; target: string }[];
    getViewport(): { x: number; y: number; zoom: number; width: number; height: number };
    panTo(x: number, y: number): void;
    on(event: string, callback: Function): void;
    off(event: string, callback: Function): void;
}
```

### GraphMinimap Handle

| Method | Returns | Description |
|--------|---------|-------------|
| `refresh()` | `void` | Re-read graph data and redraw |
| `show()` | `void` | Show the minimap widget |
| `hide()` | `void` | Hide the minimap widget |
| `toggle()` | `void` | Toggle minimap visibility |
| `isVisible()` | `boolean` | Check if minimap is visible |
| `destroy()` | `void` | Remove from DOM and clean up |

## Behaviour

1. **Nodes** are rendered as small filled circles (3px radius). Nodes with a `color` property use that colour; otherwise the configured `nodeColor` is used.
2. **Edges** are rendered as 1px lines connecting source and target nodes.
3. **Viewport rectangle** shows the currently visible region with a semi-transparent fill and solid border.
4. **Click** anywhere on the minimap to pan the main canvas to that position.
5. **Drag** the viewport rectangle (or anywhere) to pan the main canvas in real-time.
6. **Auto-refresh** occurs when the graph canvas fires a `layoutComplete` event.
7. **Collapse/expand** via the toggle button in the header.
8. **Performance**: For graphs with more than 500 nodes, edge rendering is automatically skipped.

## Accessibility

- `role="img"` with `aria-label="Graph minimap showing overview of the graph"` on the wrapper.
- Toggle button has `aria-label="Toggle minimap"` and `aria-expanded` state.
- No keyboard interaction required — the minimap is a visual navigation aid.

## Dark Mode

The component uses `var(--theme-*)` CSS tokens for backgrounds, borders, and text. SVG fill colours are passed by the consumer and do not change automatically on theme toggle.
