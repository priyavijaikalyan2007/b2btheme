# DiagramEngine

Universal vector canvas engine for diagramming, graph visualization, technical drawing, poster creation, and embedded document surfaces. 22,000+ lines across 26 source modules with full gradient, image, text-along-path, and raster painting support.

## Quick Start

```html
<link rel="stylesheet" href="components/diagramengine/diagramengine.css">
<script src="components/diagramengine/diagramengine.js"></script>

<div id="canvas" style="width: 100%; height: 600px;"></div>

<script>
var engine = createDiagramEngine("canvas", {
    grid: { visible: true, size: 20, style: "dots" },
    editable: true,
    textEditable: true,
});

engine.loadStencilPack("flowchart");

engine.addObject({
    semantic: { type: "process", data: { label: "Start" } },
    presentation: {
        shape: "rectangle",
        bounds: { x: 100, y: 100, width: 160, height: 80 },
        textContent: {
            runs: [{ text: "Start", bold: true }],
            overflow: "visible",
            verticalAlign: "middle",
            horizontalAlign: "center",
            padding: 8,
        },
    },
});
</script>
```

## Features

### Core

- **38+ built-in shapes** across 7 stencil packs (basic, extended, flowchart, UML, BPMN, ER, network) plus paintable canvas shapes
- **12 tools**: select, draw, text, connect, pen, brush, highlighter, paintbrush, measure, pan, zoom
- **Semantic/presentation split** — domain meaning separate from visual appearance
- **SVG rendering** with theme-aware colours (`var(--theme-*)`)
- **Dark mode** via MutationObserver on `data-bs-theme`

### Drawing & Painting

- **Pen tool** — click to place anchor points, click near first point to close shape with fill
- **Brush tool** — freehand drawing with point simplification
- **Highlighter tool** — semi-transparent thick strokes in 6 preset colours (yellow, pink, blue, green, orange, red)
- **Paintbrush tool** — raster painting inside paintable shapes with configurable brush size, shape (circle/square), colour, alpha, and hardness (0 = airbrush, 1 = hard edge)
- **Paintable shapes** — HTML `<canvas>` inside SVG clip masks (rectangle, circle, ellipse, triangle) with data URI persistence

### Gradients

- **Gradient fills** — linear and radial gradients on any shape (solid, gradient, pattern, or none)
- **Gradient strokes** — gradient colours on shape borders and connector lines
- **Per-edge stroke control** — independent top/right/bottom/left borders with separate colour, width, dash pattern, and gradient per side
- **Gradient text** — per-run gradient colours on text via CSS `background-clip: text` (foreignObject) or SVG `fill="url(#gradient)"` (textPath)
- **GradientPicker integration** — compose with the GradientPicker component for interactive gradient editing

### Text

- **Rich text** via `<foreignObject>` with inline editing on double-click
- **Text along path (WordArt)** — text follows SVG paths (arcs, bezier curves) via `<textPath>`
- **Per-run styling** — bold, italic, underline, strikethrough, font family, font size, colour (solid or gradient), letter spacing, superscript, subscript
- **Template engine** with `{{variable | filter}}` data binding

### Connectors

- **Straight, orthogonal, curved, manhattan, elbow, entity** routing algorithms
- **7 arrow markers** — none, block, classic, open, diamond, oval, dash
- **Selectable connectors** — click to select with dashed highlight, 12px transparent hit area
- **Port hover indicators** — blue circles appear at edge/corner ports during connect drag
- **Gradient connector strokes** — solid or gradient colours on connector lines
- **Connector labels** — positioned at start, middle, or end of path

### Images

- **SVG `<image>` rendering** from URL or data URI with `preserveAspectRatio` fit modes (cover, contain, stretch, original)
- **Custom HTTP headers** for authenticated image loading — fetched via XHR, converted to data URI
- **Transparency preserved** — PNG/WebP/GIF alpha channels render correctly

### Viewport

- **Ultra Zoom** — 10% to 3200% (32x) for pixel-level precision
- **Pan** — click+drag, middle-mouse, Space+drag
- **Zoom to fit**, zoom to selection, zoom to object
- **Coordinate conversion** — `screenToCanvas()`, `canvasToScreen()`, `canvasToContainer()`

### Organisation

- **Groups** with collapse/expand, nested groups
- **Layers** with visibility, lock, opacity, z-ordering
- **Page frames** — 40+ predefined sizes (paper, cards, photo, presentation, social, mobile, screen) with customisable margins and borders
- **Alignment guides** — snap to edges, centres, equal spacing during drag
- **Z-ordering** — bring to front, send to back, bring forward, send backward

### Persistence & Export

- **JSON** — full document serialisation with `toJSON()` / `fromJSON()`
- **SVG** — vector export with `exportSVG()`
- **Dirty tracking** — `isDirty()` / `markClean()` / `getChangeCount()`
- **PNG export** — deprecated (CORS limitations); use `exportSVG()` + server-side rendering

### Analysis & Collaboration

- **Graph analysis** — shortest path, connected components, incoming/outgoing connectors
- **Find and replace** across all text content
- **Format painter** — pick and apply styles between objects
- **Comments** anchored to objects, connectors, or canvas positions
- **Deep linking** via `diagram://` URI scheme
- **Undo/redo** with command merge window

## Stencil Packs

| Pack | Shapes | Load |
|---|---|---|
| `basic` | rectangle, ellipse, diamond, triangle, text | Auto-loaded |
| `extended` | hexagon, star, cross, parallelogram, arrow-right, chevron, callout, donut, image, icon, path, paintable | Auto-loaded |
| `flowchart` | process, decision, terminator, data, document, preparation, database | `loadStencilPack("flowchart")` |
| `uml` | uml-class, uml-actor, uml-note, uml-component, uml-package | `loadStencilPack("uml")` |
| `bpmn` | bpmn-task, bpmn-start-event, bpmn-end-event, bpmn-gateway | `loadStencilPack("bpmn")` |
| `er` | er-entity, er-relationship | `loadStencilPack("er")` |
| `network` | server, cloud, firewall | `loadStencilPack("network")` |

Custom shapes can be registered via `registerStencilPack(name, shapes)`.

## Tools

| Tool | Name | Cursor | Description |
|---|---|---|---|
| Select | `select` | default | Click, multi-select, move, resize, rotate, rubber band, connector selection |
| Draw | `draw` | crosshair | Click/drag to place shapes from stencil palette |
| Text | `text` | text | Click to create text objects |
| Connect | `connect` | crosshair | Click source → drag → release on target; port indicators shown on nearby shapes |
| Pen | `pen` | crosshair | Click to add anchor points; click near first point to close shape; Enter to finalise |
| Brush | `brush` | crosshair | Freehand vector drawing with point simplification |
| Highlighter | `highlighter` | crosshair | Semi-transparent marker strokes; 6 preset colours |
| Paintbrush | `paintbrush` | crosshair | Raster painting inside paintable shapes; configurable size, hardness, alpha |
| Measure | `measure` | crosshair | Click+drag to measure distances |
| Pan | `pan` | grab | Drag to pan canvas; also via middle-mouse or Space+drag |
| Zoom | — | — | Scroll wheel, +/-, 0 for zoom-to-fit |

### Tool Configuration

```javascript
// Access any tool instance for property configuration
var brush = engine.getToolInstance("paintbrush");
brush.brushSize = 12;
brush.brushHardness = 0.3;  // 0 = airbrush, 1 = hard edge
brush.brushColor = "#ff0000";
brush.brushAlpha = 0.6;
brush.brushShape = "circle";  // or "square"

var highlighter = engine.getToolInstance("highlighter");
highlighter.highlightColor = "rgba(255, 182, 193, 0.4)";  // pink
```

## Style System

### Fill Types

```javascript
// Solid fill
{ type: "solid", color: "#1c7ed6" }

// Linear gradient fill
{ type: "gradient", gradient: {
    type: "linear", angle: 90,
    stops: [
        { offset: 0, color: "rgba(255, 0, 0, 0.8)" },
        { offset: 1, color: "rgba(0, 0, 255, 0.8)" }
    ]
}}

// Radial gradient fill
{ type: "gradient", gradient: {
    type: "radial", center: { x: 0.3, y: 0.3 }, radius: 0.8,
    stops: [
        { offset: 0, color: "#ffffff" },
        { offset: 1, color: "#000000" }
    ]
}}

// No fill
{ type: "none" }
```

### Stroke Types

```javascript
// Solid stroke
{ color: "#000000", width: 2 }

// Gradient stroke
{ color: { type: "linear", angle: 90, stops: [...] }, width: 3 }

// Dashed stroke
{ color: "#333", width: 1.5, dashPattern: [6, 3] }
```

### Per-Edge Borders

```javascript
perEdgeStroke: {
    top: { visible: true, color: "#1c7ed6", width: 3 },
    right: { visible: true, color: { type: "linear", stops: [...] }, width: 4 },
    bottom: { visible: true, color: "#dc2626", width: 3 },
    left: { visible: false }  // hidden
}
```

### Text Styling

```javascript
textContent: {
    runs: [
        { text: "Bold ", bold: true, color: "#1c7ed6" },
        { text: "Gradient ", color: { type: "linear", angle: 0,
            stops: [{ offset: 0, color: "#FF0000" }, { offset: 1, color: "#0000FF" }]
        }},
        { text: "Alpha", color: "rgba(111, 66, 193, 0.5)" }
    ],
    overflow: "visible",
    verticalAlign: "middle",
    horizontalAlign: "center",
    padding: 8
}
```

### Text Along Path (WordArt)

```javascript
textContent: {
    runs: [{ text: "Curved Text!", fontSize: 24, bold: true }],
    textPath: {
        path: "M 0,100 Q 200,0 400,100",  // SVG path in local coordinates
        startOffset: 0.5,                   // 50% along path
        textAnchor: "middle"                // centre text at offset
    },
    overflow: "visible",
    verticalAlign: "middle",
    horizontalAlign: "center",
    padding: 0
}
```

### Image Objects

```javascript
presentation: {
    shape: "image",
    image: {
        src: "https://example.com/photo.png",
        fit: "contain",  // cover, contain, stretch, original
        headers: { "Authorization": "Bearer token123" }  // optional auth
    }
}
```

### Paintable Shapes

```javascript
presentation: {
    shape: "paintable",
    paintable: {
        clipShape: "rectangle",  // rectangle, circle, ellipse, triangle
        clipToBounds: true,      // clip paint to shape boundary
        canvasData: "data:image/png;base64,..."  // persisted canvas content
    }
}
```

## API Reference

### Document

| Method | Description |
|--------|-------------|
| `getDocument()` | Returns the full document object |
| `setDocument(doc)` | Replaces the document |
| `clear()` | Clears all objects, connectors, comments |
| `toJSON(indent?)` | Serialises to JSON string |
| `fromJSON(json)` | Loads from JSON string |
| `isDirty()` | Whether document has unsaved changes |
| `markClean()` | Resets dirty flag |

### Objects

| Method | Description |
|--------|-------------|
| `addObject(partial)` | Add object with defaults filled in |
| `removeObject(id)` | Remove by ID (also removes attached connectors) |
| `updateObject(id, changes)` | Deep-merge changes (preserves sibling style properties) |
| `getObject(id)` | Get by ID or null |
| `getObjects()` | All objects |
| `getObjectsBySemanticType(type)` | Filter by semantic type |

### Connectors

| Method | Description |
|--------|-------------|
| `addConnector(partial)` | Create connector between objects |
| `removeConnector(id)` | Remove by ID |
| `updateConnector(id, changes)` | Update properties |
| `getConnector(id)` | Get by ID or null |
| `getConnectors()` | All connectors |
| `getConnectorsBetween(a, b)` | Connectors between two objects |

### Selection

| Method | Description |
|--------|-------------|
| `select(ids)` | Select objects by ID |
| `clearSelection()` | Clear all selection |
| `getSelectedObjects()` | Selected objects |
| `getSelectedConnectors()` | Selected connectors |

### Viewport

| Method | Description |
|--------|-------------|
| `zoomIn()` / `zoomOut()` | Step zoom (0.15 increments) |
| `zoomToFit()` | Fit all objects in view |
| `setZoomLevel(n)` | Set exact zoom (0.1 – 32.0) |
| `getZoomLevel()` | Current zoom level |
| `getViewport()` | Viewport state (x, y, zoom) |

### Tools

| Method | Description |
|--------|-------------|
| `setActiveTool(name)` | Switch active tool (cursor updates automatically) |
| `getActiveTool()` | Current tool name |
| `getToolInstance(name)` | Get tool instance for property configuration |
| `setDrawShape(type)` | Set shape type for draw tool |

### Transform

| Method | Description |
|--------|-------------|
| `rotateObjects(ids, degrees)` | Rotate objects |
| `flipHorizontal(ids)` / `flipVertical(ids)` | Mirror objects |
| `alignObjects(ids, alignment)` | Align (left, center, right, top, middle, bottom) |
| `distributeObjects(ids, axis)` | Distribute evenly (horizontal, vertical) |
| `bringToFront(ids)` / `sendToBack(ids)` | Z-ordering |

### Groups & Layers

| Method | Description |
|--------|-------------|
| `group(ids)` / `ungroup(groupId)` | Group/ungroup objects |
| `collapseGroup(id)` / `expandGroup(id)` | Collapse/expand groups |
| `addLayer(partial)` / `removeLayer(id)` / `getLayers()` | Layer management |

### Clipboard & History

| Method | Description |
|--------|-------------|
| `copy()` / `cut()` / `paste()` / `duplicate()` | Clipboard operations |
| `undo()` / `redo()` | History navigation |
| `canUndo()` / `canRedo()` | History state |

### Page Frames

| Method | Description |
|--------|-------------|
| `addPageFrame(sizeName, position?)` | Add frame (40+ predefined sizes) |
| `removePageFrame(id)` | Remove frame |
| `lockPageFrame(id)` / `unlockPageFrame(id)` | Lock/unlock position |
| `setPageFrameMargins(id, margins)` | Set margins (normal, narrow, wide, none, custom) |
| `setPageFrameBorder(id, color, width)` | Customise border |
| `setPageFrameBackground(id, color)` | Set background |
| `getPageFrames()` / `getPageFrameSizes()` | Query frames and available sizes |

### Export

| Method | Description |
|--------|-------------|
| `exportSVG()` | Vector SVG export |
| `exportJSON()` | Full document JSON |
| `exportPNG(options?)` | **Deprecated** — use `exportSVG()` + server-side rendering |

### Format & Search

| Method | Description |
|--------|-------------|
| `pickFormat(id)` / `applyFormat(ids)` | Format painter |
| `clearFormat()` / `hasFormat()` | Format state |
| `findText(query, options?)` | Search text content |
| `replaceText(query, replacement, options?)` | Replace text |

### Graph Analysis

| Method | Description |
|--------|-------------|
| `getShortestPath(from, to)` | BFS shortest path |
| `getConnectedComponents()` | DFS connected components |
| `getIncomingConnectors(id)` / `getOutgoingConnectors(id)` | Connector queries |

### Spatial Queries

| Method | Description |
|--------|-------------|
| `findObjectsInRect(rect)` | Objects within rectangle |
| `findObjectsAtPoint(point)` | Objects at point |

### Comments & Navigation

| Method | Description |
|--------|-------------|
| `addComment(anchor, content, metadata?)` | Add comment |
| `getComments()` / `getCommentsForObject(id)` | Query comments |
| `resolveComment(id)` | Mark resolved |
| `navigateToURI(uri)` | Deep link navigation |

### Events

| Event | Payload |
|-------|---------|
| `object:add` / `object:remove` / `object:change` | DiagramObject |
| `connector:add` / `connector:remove` | DiagramConnector |
| `selection:change` | { objects, connectors } |
| `viewport:change` | ViewportState |
| `tool:change` | tool name string |
| `history:undo` / `history:redo` | — |
| `dirty:change` | boolean |
| `text:edit:start` / `text:edit:end` | DiagramObject |
| `comment:add` | DiagramComment |

### Lifecycle

| Method | Description |
|--------|-------------|
| `resize()` | Recalculate SVG dimensions |
| `getElement()` | Root container element |
| `destroy()` | Full cleanup |

## Keyboard Shortcuts

| Key | Action |
|---|---|
| Ctrl+Z | Undo |
| Ctrl+Y / Ctrl+Shift+Z | Redo |
| Delete / Backspace | Delete selected objects or connectors |
| Ctrl+A | Select all |
| Arrows | Nudge 1px (10px with Shift) |
| Ctrl+C / Ctrl+X / Ctrl+V / Ctrl+D | Copy / Cut / Paste / Duplicate |
| Ctrl+G / Ctrl+Shift+G | Group / Ungroup |
| +/= | Zoom in |
| - | Zoom out |
| 0 | Zoom to fit |
| Middle-click drag | Pan |
| Scroll wheel | Zoom at cursor position |
| Space+drag | Pan |
| Enter | Finalise pen path |
| Escape | Cancel current tool operation |

## Architecture

```
components/diagramengine/
├── diagramengine.ts        # Bundled output (22,000+ lines)
├── diagramengine.scss      # Component styles
├── diagramengine.test.ts   # Per-edge stroke + gradient tests
├── diagramengine-core.test.ts      # Factory, CRUD, selection, zoom, undo, serialisation
├── diagramengine-features.test.ts  # Connectors, layers, groups, transforms, clipboard
├── diagramengine-advanced.test.ts  # Find/replace, format painter, graph analysis, events
├── README.md               # This file
└── src/                    # 26 source modules (concatenated by bundle script)
    ├── types.ts            # All interfaces and type definitions
    ├── event-bus.ts        # Pub/sub event system
    ├── undo-stack.ts       # Command pattern undo/redo
    ├── shape-registry.ts   # Shape registration + SVG rendering utilities
    ├── shapes-basic.ts     # 5 basic shapes (rectangle, ellipse, diamond, triangle, text)
    ├── shapes-extended.ts  # 12 extended shapes (hexagon, star, path, paintable, etc.)
    ├── stencils-*.ts       # Flowchart, UML, BPMN, ER, Network stencil packs
    ├── connectors.ts       # Connector routing, rendering, hit testing
    ├── guides.ts           # Alignment and spacing guides
    ├── render-engine.ts    # SVG DOM rendering, selection, inline editing, images, text
    ├── tool-select.ts      # Selection, move, resize, rotate, connector selection
    ├── tool-draw.ts        # Shape placement
    ├── tool-text.ts        # Text object creation
    ├── tool-connect.ts     # Connector creation with port indicators
    ├── tool-pen.ts         # Vector path drawing with close-shape support
    ├── tool-brush.ts       # Freehand vector drawing
    ├── tool-highlighter.ts # Semi-transparent marker strokes
    ├── tool-paintbrush.ts  # Raster painting with hardness control
    ├── tool-measure.ts     # Distance measurement
    ├── tool-pan.ts         # Canvas panning
    ├── tool-manager.ts     # Tool lifecycle, cursor management
    ├── templates.ts        # Template variable resolution
    ├── page-frames.ts      # Page frame rendering (40+ sizes)
    └── engine.ts           # Main engine class (public API)
```

## Spec

Full PRD: `specs/diagramengine.prd.md` (3,685 lines, 21 sections)
