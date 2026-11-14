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

## Node icons

A node's `icon` takes any of:

- a Bootstrap Icons name, `"person"` or `"bi-person"`, or a Feather name such as `"user"`;
- a single character, such as an emoji;
- a full icon class string: Font Awesome (`"fa-solid fa-user"`), an icon-pack class (`"fluent-ui-person-16-regular"`, see [docs/ICON_PACKS.md](../../docs/ICON_PACKS.md)) or `"bi bi-person"`.

A value with a space, or one that starts with a pack prefix (`fluent-ui-`, `fluent-emoji-`, `aws-`, `azure-`, `gcp-`), is a class string. The page must load the stylesheet that defines it. GraphCanvas reads the class from the page and draws it as the stylesheet does:

- **Font icons** (Bootstrap Icons, Font Awesome) are drawn as text in the icon's own font and weight.
- **Monochrome pack icons** are drawn in the secondary text colour.
- **Colour pack icons** keep their own palette.

Font Awesome needs its two-class form (`"fa-solid fa-user"`, `"fa-brands fa-github"`); a lone `"fa-user"` has no font. A class whose stylesheet has not loaded yet draws no icon, and is drawn on the next render after it loads.

`exportPNG()` draws no node icons: an SVG drawn as an image loads no fonts or outside images. This was already the case for Bootstrap Icons glyphs. `exportSVG()` keeps the icons, and they draw where the same stylesheets and fonts are loaded.

## Modes

- **schema** — Type definitions and relationship edges (the meta-model)
- **instance** — Resource instances and actual relationships

## Layout Algorithms

| Layout | Description |
|--------|-------------|
| `force` | Spring-embedder with repulsion + spring attraction (default). Node boxes do not overlap. |
| `hierarchical` | BFS-based level assignment with configurable direction |
| `radial` | Concentric rings from root nodes |
| `dagre` | Delegates to `window.dagre` if loaded; falls back to hierarchical |
| `group-by-namespace` | Groups nodes by namespace, grid arrangement, mini-force within |

The force layout keeps every node box at least 12 px clear of the others, at the `nodeSize` you give, so a person can click each node. It still starts from random positions, so the same graph can lay out differently on each load. Pass `layoutSeed` to get the same layout every time, for example in tests:

```javascript
createGraphCanvas({ container, nodes, edges, layout: "force", layoutSeed: 1 });
```

Two `pinned` nodes stay where you put them, even when their boxes overlap. A free node moves off a pinned one.

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

## Edge label density

On dense graphs, edge labels that all converge on a single "hub" node used to
stack on top of one another and become illegible. The `edgeLabelDensity`
option controls how labels are rendered:

| Value | Behavior |
|-------|----------|
| `"all"` | Every visible edge renders its full label. Labels step along the edge (t ∈ 0.5 ± …) to avoid overlap; falls back to the midpoint if no step is free. |
| `"hub-compact"` **(default)** | Edges where *either* endpoint has degree ≥ `hubDegreeThreshold` (default `5`) render a 2–3 char abbreviation — multi-word labels use word initials (`"Sourced From"` → `"SF"`), single-word labels use the first two chars (`"Mirrors"` → `"MI"`). Non-hub edges keep full labels with collision stepping. The full label is always available via the edge HoverCard on hover. |
| `"none"` | Suppress on-canvas labels entirely. |

The legacy `showEdgeLabels: false` flag still works and forces density to
`"none"`. When both are set, `edgeLabelDensity` wins unless `showEdgeLabels`
is explicitly `false`.

```javascript
createGraphCanvas({
    container,
    nodes, edges,
    edgeLabelDensity: "hub-compact", // default
    hubDegreeThreshold: 5            // tune for your graph density
});
```

## Global

```javascript
window.createGraphCanvas(options)
```
