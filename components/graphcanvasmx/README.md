# GraphCanvasMx

Interactive graph visualization powered by [maxGraph](https://github.com/maxGraph/maxGraph). Drop-in replacement for GraphCanvas (custom SVG version) with the same public API.

## When to Use

Use **GraphCanvasMx** when maxGraph is already loaded in your application (e.g., Diagrams, Thinker). It delegates rendering, layout algorithms, edge routing, zoom/pan, and selection to maxGraph — providing superior layout quality, orthogonal edge routing, and better performance on large graphs.

Use **GraphCanvas** (custom SVG) when maxGraph is not available or for lightweight standalone embeds.

## Prerequisites

maxGraph must be available on `window.maxgraph` before creating a GraphCanvasMx instance:

```html
<!-- Load maxGraph (UMD/CDN) -->
<script src="path/to/maxgraph.umd.js"></script>
```

## Usage

```html
<link rel="stylesheet" href="components/graphcanvasmx/graphcanvasmx.css" />
<script src="components/graphcanvasmx/graphcanvasmx.js"></script>
```

```javascript
// Returns null if maxGraph is not loaded
const canvas = createGraphCanvasMx({
    container: document.getElementById("graph"),
    mode: "schema",
    layout: "hierarchical",
    nodes: [
        { id: "1", label: "OKR", type: "strategy.okr", color: "#C0392B" },
        { id: "2", label: "Project", type: "work.project", color: "#2196f3" }
    ],
    edges: [
        { id: "e1", sourceId: "1", targetId: "2", label: "aligns_to", type: "aligns_to" }
    ],
    onNodeClick: (node) => console.log("Clicked:", node.label)
});
```

## Layout Algorithms (via maxGraph)

| Layout | maxGraph Class | Description |
|--------|---------------|-------------|
| `force` | `FastOrganicLayout` | Force-directed with configurable force constant |
| `hierarchical` | `HierarchicalLayout` | Proper Sugiyama with edge routing |
| `radial` | `CircleLayout` / `RadialTreeLayout` | Circular arrangement |
| `dagre` | `HierarchicalLayout` | Same as hierarchical (maxGraph's is already excellent) |
| `group-by-namespace` | `HierarchicalLayout` | Falls back to hierarchical |

## Advantages over Custom SVG Version

- **Layout quality** — maxGraph's HierarchicalLayout implements full Sugiyama with barycenter ordering, edge crossing minimization, and proper edge routing
- **Edge routing** — Orthogonal edge style with automatic bend points and overlap avoidance
- **Performance** — Optimized rendering for graphs with hundreds of nodes
- **Selection** — Native rubber-band selection, multi-select, and cell handlers
- **Zoom/Pan** — Built-in smooth zoom with focal point and pan handlers

## API

Identical to [GraphCanvas](../graphcanvas/README.md). All methods, options, and callbacks are the same.

## Global

```javascript
window.createGraphCanvasMx(options)  // Returns GraphCanvas | null
```
