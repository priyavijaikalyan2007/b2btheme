# DiagramEngine

Universal vector canvas engine for diagramming, graph visualization, technical drawing, poster creation, and embedded document surfaces.

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

- **25 built-in shapes** across 6 stencil packs (basic, flowchart, UML, BPMN, ER, network)
- **9 tools**: select, draw, text, connect, pen, measure, brush, pan, zoom
- **Semantic/presentation split** — domain meaning separate from visual appearance
- **SVG rendering** with theme-aware colors (`var(--theme-*)`)
- **Connectors** with straight and orthogonal routing, 7 arrow markers
- **Alignment guides** during drag operations
- **Rich text** via `<foreignObject>` with inline editing on double-click
- **Rotation handle** with drag-to-rotate interaction
- **Groups**, layers, copy/paste, flip, align, distribute
- **Template engine** with `{{variable}}` data binding
- **Layout algorithms** (force, grid, custom, async/AI)
- **Export**: SVG, PNG, JSON, PDF (HTML)
- **Find and replace** across all text content
- **Format painter** — pick and apply styles
- **Graph analysis**: shortest path, connected components
- **Comments** anchored to objects
- **Deep linking** via `diagram://` URI scheme
- **Undo/redo** with command merge window
- **Dark mode** via MutationObserver on `data-bs-theme`

## Stencil Packs

| Pack | Shapes | Load |
|---|---|---|
| `basic` | rectangle, ellipse, diamond, triangle, text, hexagon, star, cross, parallelogram, image, icon, arrow-right, chevron, callout, donut | Auto-loaded |
| `flowchart` | process, decision, terminator, data, document, preparation, database | `loadStencilPack("flowchart")` |
| `uml` | uml-class, uml-actor, uml-note | `loadStencilPack("uml")` |
| `bpmn` | bpmn-task, bpmn-start-event, bpmn-end-event, bpmn-gateway, bpmn-pool | `loadStencilPack("bpmn")` |
| `er` | er-entity, er-weak-entity, er-relationship, er-attribute | `loadStencilPack("er")` |
| `network` | server, cloud, firewall, database | `loadStencilPack("network")` |

## Tools

| Tool | Key | Description |
|---|---|---|
| `select` | V | Click, multi-select, move, resize, rotate, rubber band |
| `draw` | R | Click/drag to place shapes |
| `text` | T | Click to create text objects |
| `connect` | L | Click source → drag → release on target |
| `pen` | P | Click to add anchor points, Enter to finalize |
| `measure` | M | Click+drag to measure distances |
| `brush` | B | Freehand drawing |
| `pan` | H | Drag to pan canvas |
| `zoom` | | Scroll wheel, +/-, 0 for zoom-to-fit |

## API

### Document
- `getDocument()` / `setDocument(doc)` / `clear()`
- `toJSON(indent?)` / `fromJSON(json)`
- `isDirty()` / `markClean()` / `getChangeCount()`

### Objects
- `addObject(partial)` / `removeObject(id)` / `updateObject(id, changes)`
- `getObject(id)` / `getObjects()` / `getObjectsBySemanticType(type)`

### Connectors
- `addConnector(partial)` / `removeConnector(id)` / `updateConnector(id, changes)`
- `getConnector(id)` / `getConnectors()` / `getConnectorsBetween(a, b)`

### Selection
- `select(ids)` / `clearSelection()` / `getSelectedObjectsPublic()`

### Viewport
- `zoomIn()` / `zoomOut()` / `zoomToFit()` / `setZoomLevel(n)` / `getZoomLevel()`

### Z-ordering
- `bringToFront(ids)` / `sendToBack(ids)` / `bringForward(ids)` / `sendBackward(ids)`

### Groups
- `group(ids)` / `ungroup(groupId)`
- `collapseGroup(id)` / `expandGroup(id)` / `isGroupCollapsed(id)`

### Transform
- `rotateObjects(ids, degrees)` / `flipHorizontal(ids)` / `flipVertical(ids)`
- `alignObjects(ids, alignment)` / `distributeObjects(ids, axis)`

### Clipboard
- `copy()` / `cut()` / `paste()` / `duplicate()`

### Format
- `pickFormat(id)` / `applyFormat(ids)` / `clearFormat()` / `hasFormat()`
- `findText(query, options?)` / `replaceText(query, replacement, options?)`

### Layout
- `applyLayout(name, options?)` / `registerLayout(name, fn)`

### Export
- `exportSVG()` / `exportPNG(options?)` / `exportJSON()` / `exportPDF()`

### Graph Analysis
- `getShortestPath(from, to)` / `getConnectedComponents()`
- `getIncomingConnectors(id)` / `getOutgoingConnectors(id)`

### Comments
- `addComment(anchor, content, userId, userName)` / `getComments()`
- `getCommentsForObject(id)` / `resolveComment(id)`

### Events
- `on(event, handler)` / `off(event, handler)`
- Events: `object:add`, `object:remove`, `object:change`, `connector:add`, `selection:change`, `viewport:change`, `tool:change`, `history:undo`, `history:redo`, `dirty:change`, `comment:add`, `text:edit:start`, `text:edit:end`

## Keyboard Shortcuts

| Key | Action |
|---|---|
| Ctrl+Z | Undo |
| Ctrl+Y / Ctrl+Shift+Z | Redo |
| Delete | Delete selected |
| Ctrl+A | Select all |
| Arrows | Nudge (1px, 10px with Shift) |
| +/- | Zoom in/out |
| 0 | Zoom to fit |
| Middle-click drag | Pan |
| Scroll wheel | Zoom at cursor |

## Spec

Full PRD: `specs/diagramengine.prd.md` (3,685 lines, 21 sections)
