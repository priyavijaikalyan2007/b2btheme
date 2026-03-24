# GraphLegend

Collapsible legend panel showing color/icon/shape key for graph node types and edge types. Designed for the Ontology Visualizer but works with any graph canvas that needs a visual key.

## Usage

```html
<link rel="stylesheet" href="components/graphlegend/graphlegend.css" />
<link rel="stylesheet" href="components/typebadge/typebadge.css" />
<script src="components/typebadge/typebadge.js"></script>
<script src="components/graphlegend/graphlegend.js"></script>
```

```javascript
const legend = createGraphLegend({
    container: document.getElementById("graph-container"),
    nodeTypes: [
        {
            typeKey: "strategy.okr",
            displayName: "OKR",
            icon: "crosshair",
            color: "#C0392B",
            count: 5
        },
        {
            typeKey: "org.team",
            displayName: "Team",
            icon: "people",
            color: "#2980B9",
            count: 3
        }
    ],
    edgeTypes: [
        {
            relationshipKey: "owned_by",
            displayName: "owned by",
            color: "#94a3b8",
            style: "solid",
            count: 8
        }
    ],
    showCounts: true,
    position: "bottom-left"
});
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `container` | `HTMLElement` | — | Container element to mount into. Required. |
| `nodeTypes` | `LegendNodeType[]` | — | List of node types to display. Required. |
| `edgeTypes` | `LegendEdgeType[]` | `[]` | List of edge types to display. |
| `title` | `string` | `"Legend"` | Panel header title. |
| `collapsed` | `boolean` | `false` | Start collapsed. |
| `showEdgeTypes` | `boolean` | `true` | Show the edge types section. |
| `showCounts` | `boolean` | `false` | Show count badges next to types. |
| `position` | `string` | `"bottom-left"` | `"bottom-left"`, `"bottom-right"`, `"top-left"`, `"top-right"` |
| `maxHeight` | `number` | `300` | Max height in px before scrolling. |

## LegendNodeType

| Field | Type | Description |
|-------|------|-------------|
| `typeKey` | `string` | Ontology type key, e.g. `"strategy.okr"` |
| `displayName` | `string` | Display label, e.g. `"OKR"` |
| `icon` | `string` | Bootstrap icon name (without `bi bi-` prefix) |
| `color` | `string` | Hex color |
| `count` | `number?` | Number of this type in the graph |
| `status` | `string?` | `"active"`, `"planned"`, `"deprecated"`, or `"external"` |

## LegendEdgeType

| Field | Type | Description |
|-------|------|-------------|
| `relationshipKey` | `string` | Relationship key, e.g. `"owned_by"` |
| `displayName` | `string` | Display label, e.g. `"owned by"` |
| `color` | `string?` | Edge color hex. Default: `"#94a3b8"` |
| `style` | `string?` | `"solid"`, `"dashed"`, or `"dotted"`. Default: `"solid"` |
| `count` | `number?` | Number of this edge type in the graph |

## Public API

| Method | Description |
|--------|-------------|
| `setNodeTypes(types)` | Replace the list of node types and re-render. |
| `setEdgeTypes(types)` | Replace the list of edge types and re-render. |
| `updateCounts(nodeCounts, edgeCounts)` | Update count badges in-place. |
| `show()` | Show the legend panel. |
| `hide()` | Hide the legend panel. |
| `toggle()` | Toggle visibility. |
| `isVisible()` | Returns whether the panel is visible. |
| `setCollapsed(collapsed)` | Programmatically collapse or expand the body. |
| `destroy()` | Remove from DOM and clean up. |

## Callbacks

| Property | Signature | Description |
|----------|-----------|-------------|
| `onTypeClick` | `(typeKey: string) => void` | Called when a type item is clicked. |
| `onTypeHover` | `(typeKey: string \| null) => void` | Called on mouseenter/mouseleave. |

## Dependencies

- **TypeBadge** — used internally for node type rendering. Falls back to a simple color-dot badge when TypeBadge is not loaded.

## Status Indicators

- **planned** — Dashed border around the item row.
- **deprecated** — Reduced opacity (50%).
- **external** — Small external-link icon appended.

## Accessibility

- Root element has `role="complementary"` with `aria-label="Graph legend"`.
- Toggle button has `aria-expanded` and `aria-label` reflecting state.
- Items are focusable (`tabindex="0"`) when `onTypeClick` is set, with keyboard activation via Enter or Space.

## Global

```javascript
window.createGraphLegend(options)
```
