# GraphCanvas

Interactive SVG graph visualization with multiple layout algorithms, zoom/pan, selection, edge creation, keyboard shortcuts, and export.

## Usage

```html
<link rel="stylesheet" href="components/graphcanvas/graphcanvas.css" />
<script src="components/graphcanvas/graphcanvas.js"></script>
```

```javascript
const canvas = createGraphCanvas({
    container: document.getElementById("graph"),
    mode: "schema",
    layout: "force",
    nodes: [
        { id: "1", label: "OKR", type: "strategy.okr", color: "#C0392B" },
        { id: "2", label: "Project", type: "work.project", color: "#2196f3" }
    ],
    edges: [
        { id: "e1", sourceId: "1", targetId: "2", label: "aligns_to", type: "aligns_to" }
    ],
    onNodeClick: (node) => console.log("Clicked:", node.label),
    onSelectionChange: (nodes, edges) => console.log("Selected:", nodes.length)
});
```

## Modes

- **schema** — Type definitions and relationship edges (the meta-model)
- **instance** — Resource instances and actual relationships

## Layout Algorithms

| Layout | Description |
|--------|-------------|
| `force` | Spring-embedder with repulsion + spring attraction (default) |
| `hierarchical` | BFS-based level assignment with configurable direction |
| `radial` | Concentric rings from root nodes |
| `dagre` | Delegates to `window.dagre` if loaded; falls back to hierarchical |
| `group-by-namespace` | Groups nodes by namespace, grid arrangement, mini-force within |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `+` / `-` | Zoom in / out |
| `0` | Zoom to fit |
| `Delete` | Remove selected edges |
| `Escape` | Clear selection |
| `Ctrl+A` | Select all visible nodes |
| `F` | Center on selected node |
| Arrow keys | Nudge selected nodes |

## Interactions

- **Click node** — Select, triggers `onNodeClick`
- **Ctrl+click** — Multi-select
- **Drag node** — Move and pin position
- **Shift+drag canvas** — Rubber-band selection
- **Scroll wheel** — Zoom (focal point under cursor)
- **Click+drag canvas** — Pan
- **Right-click** — Context menu
- **Double-click node** — Triggers `onNodeDoubleClick`

## Public API

### Data
- `setData(nodes, edges)` — Replace all data
- `addNode(node)` / `removeNode(id)` / `updateNode(id, updates)`
- `addEdge(edge)` / `removeEdge(id)` / `updateEdge(id, updates)`
- `getNodes()` / `getEdges()`

### Selection
- `selectNode(id)` / `selectEdge(id)` / `clearSelection()`
- `getSelectedNodes()` / `getSelectedEdges()`

### Viewport
- `zoomIn()` / `zoomOut()` / `zoomToFit()` / `zoomToNode(id)`
- `getZoomLevel()` / `setZoomLevel(level)` / `centerOnNode(id)`

### Layout
- `setLayout(layout, direction?)` / `relayout()`

### Filtering
- `setNodeFilter(typeKeys)` / `setEdgeFilter(keys)` / `setDepthFilter(maxDepth)`

### Highlighting
- `highlightPath(nodeIds)` / `highlightNeighbors(nodeId, depth)`
- `highlightBlastRadius(nodeId)` / `clearHighlights()`

### Export
- `exportSVG()` — SVG markup string
- `exportPNG()` — Promise resolving to Blob
- `exportJSON()` — `{ nodes, edges }` object

### Lifecycle
- `setMode(mode)` / `getMode()` / `resize()` / `destroy()`

## Global

```javascript
window.createGraphCanvas(options)
```
