<!-- AGENT: Documentation for the SpineMap component — interactive SVG capability map. -->

# SpineMap

Interactive SVG capability/feature map with a central spine, branching sub-nodes, four layout algorithms, zoom/pan, status color coding, cross-branch connections, and integrated editing.

## Assets

| Asset | Path |
|-------|------|
| JS | `components/spinemap/spinemap.js` |
| CSS | `components/spinemap/spinemap.css` |

## Quick Start

```html
<link rel="stylesheet" href="components/spinemap/spinemap.css">
<script src="components/spinemap/spinemap.js"></script>

<div id="my-map" style="width:100%; height:600px;"></div>

<script>
const map = createSpineMap({
    container: document.getElementById("my-map"),
    layout: "vertical",
    data: {
        hubs: [
            {
                id: "admin",
                label: "Tenant Admin",
                status: "available",
                branches: [
                    { id: "rbac", label: "RBAC", status: "available" },
                    { id: "fgac", label: "FGAC", status: "planned", timeframe: "Q3 2026" }
                ]
            },
            {
                id: "apps",
                label: "Apps",
                status: "available",
                branches: [
                    { id: "diagrams", label: "Diagrams", status: "available" },
                    { id: "todo", label: "ToDo", status: "in-progress" },
                    { id: "checklists", label: "Checklists", status: "available" },
                    { id: "workitems", label: "Work Items", status: "planned" }
                ]
            }
        ],
        connections: [
            { from: "fgac", to: "rbac", type: "depends-on" }
        ]
    }
});
</script>
```

## Global Functions

| Function | Returns | Description |
|----------|---------|-------------|
| `createSpineMap(options)` | `SpineMap` | Creates and mounts a new SpineMap |

## Class API

### Data

| Method | Description |
|--------|-------------|
| `loadData(data)` | Replace all hubs and connections |
| `getData()` | Get current `SpineMapData` (deep copy) |
| `importJSON(json)` | Parse JSON string and load as data |

### Nodes

| Method | Description |
|--------|-------------|
| `addHub(hub, index?)` | Add a hub to the spine |
| `addBranch(branch, parentId)` | Add a branch under a hub or another branch |
| `updateNode(nodeId, changes)` | Update node properties |
| `removeNode(nodeId)` | Remove node and all children |
| `reparentNode(nodeId, newParentId)` | Move node to a different parent |
| `getNode(nodeId)` | Get node data by ID |

### Connections

| Method | Description |
|--------|-------------|
| `addConnection(conn)` | Add a cross-branch connection |
| `removeConnection(fromId, toId)` | Remove a connection |
| `getConnections()` | Get all connections (deep copy) |

### Layout

| Method | Description |
|--------|-------------|
| `setLayout(layout)` | Switch layout: `vertical`, `horizontal`, `radial`, `winding` |
| `getLayout()` | Get current layout mode |
| `relayout()` | Recompute positions without changing layout mode |

### Zoom & Pan

| Method | Description |
|--------|-------------|
| `zoomIn()` / `zoomOut()` | Step zoom |
| `zoomTo(level)` | Set exact zoom level |
| `fitToView()` | Auto-fit all nodes in viewport |
| `panTo(nodeId)` | Center viewport on a node |
| `getZoom()` | Get current zoom level |

### Selection

| Method | Description |
|--------|-------------|
| `selectNode(nodeId)` | Select and highlight a node |
| `clearSelection()` | Clear selection |
| `getSelectedNode()` | Get selected node ID |

### Export

| Method | Description |
|--------|-------------|
| `exportSVG()` | Returns SVG markup string |
| `exportPNG()` | Returns `Promise<Blob>` |
| `exportJSON()` | Returns JSON data string |

### Lifecycle

| Method | Description |
|--------|-------------|
| `refresh()` | Recompute layout and re-render |
| `destroy()` | Remove from DOM, clean up events |
| `getElement()` | Get root HTMLElement |

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `container` | `HTMLElement` | — | **Required.** Mount target |
| `data` | `SpineMapData` | — | Initial data |
| `layout` | `string` | `"vertical"` | `vertical`, `horizontal`, `radial`, `winding` |
| `hubSpacing` | `number` | `180` | Pixels between hub centers |
| `branchSpacing` | `number` | `50` | Pixels between branch nodes |
| `branchLength` | `number` | `140` | Pixels from hub to first branch |
| `editable` | `boolean` | `false` | Enable all editing modes |
| `sidebarPosition` | `string` | `"right"` | `left`, `right`, `none` |
| `sidebarWidth` | `number` | `320` | Sidebar width in pixels |
| `statusColors` | `object` | — | Override default status colors |
| `minZoom` | `number` | `0.1` | Minimum zoom level |
| `maxZoom` | `number` | `3.0` | Maximum zoom level |
| `showToolbar` | `boolean` | `true` | Show toolbar |
| `showConnections` | `boolean` | `true` | Show cross-branch connections |
| `showStatusLegend` | `boolean` | `true` | Show status color legend |
| `fitOnLoad` | `boolean` | `true` | Auto-fit on initial render |
| `size` | `string` | `"md"` | `sm`, `md`, `lg` |
| `cssClass` | `string` | — | Additional CSS class on root |
| `popoverFields` | `SpinePopoverFieldConfig[]` | — | Custom field configuration for the node popover. When omitted, uses the default fields (Status, Timeframe, Link, Description, Connections) |
| `popoverWidth` | `number` | `300` | Popover width in pixels (overrides size-variant defaults) |

## Popover Fields

The `popoverFields` option lets consumers configure which fields appear in the node popover, their order, and what widget renders each field.

### SpinePopoverFieldConfig

```typescript
{
    key: string;             // Node property name or metadata key
    label: string;           // Display label
    type: SpinePopoverFieldType;  // Widget type (see below)
    source?: "property" | "metadata";  // Where to read/write the value
    showInView?: boolean;    // Show in view mode (default: true)
    showInEdit?: boolean;    // Show in edit mode (default: true)
    componentOptions?: Record<string, unknown>;  // Forwarded to component factory
    selectOptions?: { value: string; label: string }[];  // For "select" type
    serialize?: (value: unknown) => string;    // Custom serializer
    deserialize?: (stored: string) => unknown; // Custom deserializer
    renderView?: (value: unknown, node) => HTMLElement;  // Custom view renderer
    required?: boolean;
    hint?: string;           // Help text below field in edit mode
    cssClass?: string;       // Extra CSS class on field wrapper
    width?: "compact" | "full";  // "full" forces min-height for editors
}
```

### Supported Field Types

| Category | Types |
|----------|-------|
| HTML native | `text`, `number`, `email`, `url`, `tel`, `textarea`, `select`, `checkbox`, `range` |
| Library pickers | `datepicker`, `timepicker`, `durationpicker`, `cronpicker`, `timezonepicker`, `periodpicker`, `sprintpicker`, `colorpicker`, `symbolpicker`, `fontdropdown` |
| Library text/content | `richtextinput`, `maskedentry`, `editablecombobox` |
| Library multi-value | `multiselectcombo`, `tagger`, `peoplepicker` |
| Library editors | `codeeditor`, `markdowneditor` |
| Built-in special | `status`, `connections`, `link` |
| Fully custom | `custom` |

Library component types require the corresponding component JS to be loaded. If unavailable, the field falls back to a plain text input with a console warning.

### Source Auto-Detection

If `source` is not specified, known node properties (`label`, `status`, `timeframe`, `link`, `description`, `statusLabel`, `statusColor`) default to `"property"`. All other keys default to `"metadata"` and are stored in `node.metadata`.

### Default Configuration

When `popoverFields` is omitted, the popover uses this default (identical to previous behavior):

```javascript
[
    { key: "status",      label: "Status",      type: "status"      },
    { key: "timeframe",   label: "Timeframe",   type: "text"        },
    { key: "link",        label: "Link",        type: "link"        },
    { key: "description", label: "Description", type: "textarea"    },
    { key: "connections", label: "Connections",  type: "connections" }
]
```

### Example: Custom Fields with Metadata

```javascript
const map = createSpineMap({
    container: document.getElementById("my-map"),
    editable: true,
    popoverFields: [
        { key: "status",   label: "Status",   type: "status"   },
        { key: "timeframe", label: "Timeframe", type: "periodpicker" },
        { key: "priority", label: "Priority",  type: "select",
          source: "metadata",
          selectOptions: [
              { value: "high", label: "High" },
              { value: "medium", label: "Medium" },
              { value: "low", label: "Low" }
          ]
        },
        { key: "owner", label: "Owner", type: "text",
          source: "metadata", hint: "Assignee name" },
        { key: "description", label: "Description",
          type: "richtextinput", width: "full" },
        { key: "connections", label: "Connections",
          type: "connections" }
    ],
    popoverWidth: 380,
    data: { hubs: [ /* ... */ ] }
});
```

## Callbacks

| Callback | Arguments | Description |
|----------|-----------|-------------|
| `onNodeClick` | `(node)` | Node clicked |
| `onNodeDoubleClick` | `(node)` | Node double-clicked |
| `onNodeHover` | `(node \| null)` | Mouse enter/leave |
| `onNodeAdd` | `(node, parentId)` | Node added |
| `onNodeChange` | `(nodeId, changes)` | Node updated |
| `onNodeRemove` | `(nodeId)` | Node removed |
| `onNodeReparent` | `(nodeId, newParentId)` | Node moved to new parent |
| `onConnectionAdd` | `(conn)` | Connection added |
| `onConnectionRemove` | `(connId)` | Connection removed |
| `onLayoutChange` | `(layout)` | Layout mode changed |
| `onZoomChange` | `(zoom)` | Zoom level changed |

## Data Types

### SpineHub

```typescript
{
    id: string;
    label: string;
    status?: "available" | "in-progress" | "planned" | "not-supported" | "deprecated" | "custom";
    statusLabel?: string;
    statusColor?: string;
    link?: string;
    timeframe?: string;
    description?: string;
    metadata?: Record<string, string>;
    branches: SpineBranch[];
}
```

### SpineBranch

Same as SpineHub but with `children?: SpineBranch[]` instead of `branches`.

### SpineConnection

```typescript
{
    from: string;           // node id
    to: string;             // node id
    type: "depends-on" | "works-with" | "blocks" | "enhances";
    label?: string;
}
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `+` / `=` | Zoom in |
| `-` | Zoom out |
| `0` | Fit to view |
| Arrow keys | Pan viewport |
| Shift + arrows | Fast pan |
| Escape | Close popover |
| Click node | Select + show popover |
| Double-click | Open popover in edit mode (editable) |
| Shift + drag | Draw connection between nodes (editable) |
| Drag node | Reposition node (editable) |

## Accessibility

- `role="button"` and `tabindex="0"` on each node for keyboard focus
- `aria-label` on nodes includes label and status
- `aria-live="polite"` region announces node changes
- Popover has `role="dialog"`
- Toolbar buttons have `aria-label` and `title`
- Focus-visible indicators with 2px blue outline

## Connection Types

| Type | Line Style | Color | Use |
|------|-----------|-------|-----|
| `depends-on` | Dashed | Orange | B requires A |
| `works-with` | Dotted | Blue | Complementary features |
| `blocks` | Solid | Red | A blocks B |
| `enhances` | Dash-dot | Green | A enhances B |

## Layout Modes

| Mode | Description |
|------|-------------|
| `vertical` | Spine top-to-bottom, branches left/right |
| `horizontal` | Spine left-to-right, branches up/down |
| `radial` | Hubs in a circle, branches radiate outward |
| `winding` | Serpentine S-curve path, branches up/down |

## Editing Modes

### Sidebar (TreeGrid)

When `editable: true`, a sidebar with a TreeGrid shows the full hierarchy. Edit labels, status, and timeframe inline. Drag rows to reparent nodes. Requires TreeGrid JS to be loaded; falls back to a simple tree list otherwise.

### Popover

Click any node to see its details. In editable mode, use Edit/Add Child/Remove buttons. Double-click to open directly in edit mode.

### Visual

Drag nodes to reposition. Shift+drag from one node to another to create a connection. Click a connection path to remove it.

## Export Formats

| Format | Method | Description |
|--------|--------|-------------|
| SVG | `exportSVG()` | Standalone SVG markup |
| PNG | `exportPNG()` | 2x resolution raster via canvas |
| JSON | `exportJSON()` | Full `SpineMapData` for backup/import |
