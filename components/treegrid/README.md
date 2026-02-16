<!-- AGENT: Documentation for the TreeGrid component — enterprise tree-grid hybrid with columnar data, inline editing, sorting, and ARIA support. -->

# TreeGrid

A highly configurable tree-grid hybrid component for displaying hierarchical data with multi-column tabular views. Supports expandable tree structure in the first column, inline cell editing, column sorting, resizing, drag-and-drop, context menu, virtual scrolling for large datasets, and full WAI-ARIA grid pattern keyboard navigation.

## Assets

| Asset | Path |
|-------|------|
| CSS | `dist/components/treegrid/treegrid.css` |
| JS | `dist/components/treegrid/treegrid.js` |
| Types | `dist/components/treegrid/treegrid.d.ts` |

## Requirements

- **Bootstrap CSS** — for SCSS variables (`$gray-*`, `$primary`, `$font-size-*`, etc.)
- **Bootstrap Icons CSS** — for tree toggle chevrons, column sort icons, and node icons
- Does **not** require Bootstrap JS.

## Quick Start

```html
<link rel="stylesheet" href="dist/components/treegrid/treegrid.css">
<script src="dist/components/treegrid/treegrid.js"></script>

<div id="my-grid" style="height: 400px"></div>

<script>
    var grid = createTreeGrid({
        containerId: "my-grid",
        label: "Project Files",
        nodes: [
            {
                id: "1",
                label: "src",
                icon: "bi-folder",
                data: { size: "4.2 MB", modified: "2026-02-10" },
                children: [
                    {
                        id: "2",
                        label: "main.ts",
                        icon: "bi-file-code",
                        data: { size: "1.5 KB", modified: "2026-02-12" }
                    },
                    {
                        id: "3",
                        label: "utils.ts",
                        icon: "bi-file-code",
                        data: { size: "890 B", modified: "2026-02-11" }
                    }
                ],
                expanded: true
            },
            {
                id: "4",
                label: "package.json",
                icon: "bi-filetype-json",
                data: { size: "512 B", modified: "2026-02-09" }
            }
        ],
        columns: [
            { id: "size", label: "Size", width: 100, sortable: true, align: "right" },
            { id: "modified", label: "Modified", width: 150, sortable: true }
        ],
        treeColumnLabel: "Name",
        treeColumnWidth: 250,
        stickyHeader: true,
        rowStriping: true,
        onRowSelect: function(node, selected) {
            console.log(node.label, selected ? "selected" : "deselected");
        }
    });
</script>
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `containerId` | `string` | required | DOM element ID for the container |
| `label` | `string` | required | Accessible label for the grid (ARIA) |
| `nodes` | `TreeGridNode[]` | required | Root-level tree nodes |
| `columns` | `TreeGridColumn[]` | required | Column definitions for data columns |
| `treeColumnLabel` | `string` | `"Name"` | Label for the first (tree) column |
| `treeColumnWidth` | `number` | `250` | Initial width of tree column in pixels |
| `treeColumnMinWidth` | `number` | `120` | Minimum width of tree column |
| `treeColumnResizable` | `boolean` | `true` | Allow tree column resizing |
| `selectionMode` | `"single" \| "multi" \| "none"` | `"single"` | Selection behaviour |
| `enableDragDrop` | `boolean` | `false` | Enable drag-and-drop row reordering |
| `enableContextMenu` | `boolean` | `false` | Enable right-click context menu |
| `contextMenuItems` | `TreeGridContextMenuItem[]` | `[]` | Context menu item definitions |
| `indentPx` | `number` | `20` | Per-level indent in tree column (pixels) |
| `rowStriping` | `boolean` | `false` | Alternate row background colors |
| `stickyHeader` | `boolean` | `true` | Fix header row during vertical scroll |
| `rowHeight` | `number` | `32` | Fixed row height in pixels (required for virtual scrolling) |
| `height` | `string` | `"100%"` | Component height CSS value |
| `width` | `string` | `"100%"` | Component width CSS value |
| `cssClass` | `string` | — | Additional CSS class on root element |
| `emptyMessage` | `string` | `"No items to display"` | Message shown when grid is empty |
| `virtualScrolling` | `"auto" \| "enabled" \| "disabled"` | `"auto"` | Virtual scrolling mode. "auto" enables above 5000 visible rows |
| `scrollBuffer` | `number` | `50` | Number of rows rendered above/below viewport in virtual mode |
| `enableColumnReorder` | `boolean` | `false` | Enable drag-to-reorder columns by dragging header cells |
| `showColumnPicker` | `boolean` | `false` | Show a gear icon button in the header that opens a dropdown checklist for showing/hiding columns |
| `externalSort` | `boolean` | `false` | When true, the grid does not sort internally. The app must sort data in the `onColumnSort` callback and call `refresh()`. Useful when sort logic requires server-side or complex comparisons |

## Column Definition

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique column identifier (maps to node.data keys) |
| `label` | `string` | Column header label |
| `width` | `number` | Initial column width in pixels (default: 150) |
| `minWidth` | `number` | Minimum column width (default: 60) |
| `maxWidth` | `number` | Maximum column width (optional) |
| `resizable` | `boolean` | Allow column resizing (default: true) |
| `sortable` | `boolean` | Allow column sorting (default: false) |
| `sortDirection` | `"asc" \| "desc"` | Initial sort direction (optional) |
| `valueAccessor` | `(data) => unknown` | Custom value accessor function (default: `data[column.id]`) |
| `renderer` | `(cell, node, value) => void` | Custom cell renderer (default: textContent) |
| `editable` | `boolean` | Allow inline cell editing (default: false) |
| `editorType` | `"text" \| "number" \| "select" \| "date" \| "custom"` | Editor type for inline editing |
| `editorOptions` | `Array<{value, label}>` | Options for select editor |
| `align` | `"left" \| "center" \| "right"` | Cell text alignment (default: "left") |
| `hidden` | `boolean` | Hide column (default: false) |
| `cssClass` | `string` | Additional CSS class for cells |
| `aggregate` | `(values) => unknown` | Aggregate function for parent rows (e.g., sum, count) |
| `comparator` | `(a: unknown, b: unknown) => number` | Custom comparator for sorting. Receives raw cell values; return negative/zero/positive. Overrides the built-in type-aware default |

## Node Definition

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique node identifier |
| `label` | `string` | Display text in tree column |
| `icon` | `string` | Bootstrap Icons class (e.g., "bi-folder") |
| `data` | `Record<string, unknown>` | Column data keyed by column ID |
| `children` | `TreeGridNode[] \| null` | Child nodes. `null` = lazy-loadable |
| `expanded` | `boolean` | Initially expanded (default: false) |
| `lazy` | `boolean` | When true and children is null, expand triggers onLoadChildren |
| `selectable` | `boolean` | Can be selected (default: true) |
| `draggable` | `boolean` | Can be dragged (default: true) |
| `disabled` | `boolean` | Cannot be interacted with (default: false) |
| `tooltip` | `string` | Native tooltip text |

## Callbacks

| Callback | Parameters | Description |
|----------|------------|-------------|
| `onRowSelect` | `(node, selected)` | Row selected or deselected |
| `onSelectionChange` | `(nodes)` | Full selection set changed |
| `onRowActivate` | `(node)` | Row double-clicked or Enter pressed on tree cell |
| `onRowToggle` | `(node, expanded)` | Tree node expanded or collapsed |
| `onLoadChildren` | `(node) => Promise<TreeGridNode[]>` | Async loader for lazy children |
| `onColumnResize` | `(column, newWidth)` | Column resized by user |
| `onColumnReorder` | `(columns)` | Columns reordered by drag-drop (future) |
| `onColumnSort` | `(column, direction)` | Column sort direction changed |
| `onEditStart` | `(node, column, currentValue) => boolean \| void` | Cell edit started. Return false to cancel |
| `onEditCommit` | `(node, column, oldValue, newValue)` | Cell edit committed |
| `onEditCancel` | `(node, column)` | Cell edit cancelled |
| `onContextMenuAction` | `(actionId, node)` | Context menu action clicked |
| `onDragValidate` | `(sources[], target, position) => boolean` | Validate drop operation |
| `onDrop` | `(sources[], target, position)` | Rows dropped |
| `onExternalDrop` | `(dataTransfer, target, position)` | External content dropped |
| `onRefreshComplete` | `()` | Programmatic refresh completed |

## Keyboard Navigation

| Key | Action |
|-----|--------|
| `Arrow Down` | Move focus to next row (same column) |
| `Arrow Up` | Move focus to previous row (same column) |
| `Arrow Right` | Move focus to next column / expand collapsed parent in tree column |
| `Arrow Left` | Move focus to previous column / collapse expanded parent in tree column |
| `Home` | Move to first cell in row (Ctrl+Home = first cell in grid) |
| `End` | Move to last cell in row (Ctrl+End = last cell in grid) |
| `Space` | Toggle row selection in tree column |
| `Enter` | Activate row (tree column) / start editing (data column) |
| `F2` | Start inline edit on focused cell |
| `Escape` | Cancel inline edit / close context menu |
| `Tab` | Commit edit and move to next editable cell |
| `Shift+Tab` | Commit edit and move to previous editable cell |

## Public API

| Method | Returns | Description |
|--------|---------|-------------|
| `addNode(node, parentId)` | `void` | Add a node under parent (null = root) |
| `removeNode(nodeId)` | `void` | Remove a node and descendants |
| `updateNode(nodeId, updates)` | `void` | Update node properties (label, icon, data, etc.) |
| `expandNode(nodeId)` | `void` | Expand a node |
| `collapseNode(nodeId)` | `void` | Collapse a node |
| `expandAll()` | `void` | Expand all parent nodes |
| `collapseAll()` | `void` | Collapse all nodes |
| `selectNode(nodeId)` | `void` | Select and focus a node |
| `clearSelection()` | `void` | Clear selection |
| `getSelectedNodes()` | `TreeGridNode[]` | Get selected nodes |
| `scrollToNode(nodeId)` | `void` | Scroll to node, expanding ancestors |
| `setColumns(columns)` | `void` | Replace column definitions |
| `updateColumn(columnId, updates)` | `void` | Update a single column's properties at runtime. Takes a column ID and a `Partial<TreeGridColumn>` object. Triggers minimal rebuild |
| `getColumns()` | `TreeGridColumn[]` | Get current column definitions |
| `showColumn(columnId)` | `void` | Show a hidden column |
| `hideColumn(columnId)` | `void` | Hide a visible column |
| `refresh()` | `void` | Re-render grid |
| `destroy()` | `void` | Full cleanup |
| `getElement()` | `HTMLElement \| null` | Root DOM element |
| `getId()` | `string` | Instance ID |

## Convenience Functions

| Function | Description |
|----------|-------------|
| `createTreeGrid(options)` | Create a TreeGrid instance |

## Global Exports

When loaded via `<script>` tag:

- `window.TreeGrid` — TreeGrid class
- `window.createTreeGrid` — Factory function

## Performance

The TreeGrid is optimized for large datasets with 1M+ total nodes:

- **O(1) node lookups** — internal `nodeMap` and `parentMap` for instant access
- **Cached visible array** — flat visible-row list rebuilt lazily on expand/collapse
- **Virtual scrolling** — renders only viewport + buffer rows (~200 DOM elements) instead of all visible rows
- **Incremental DOM updates** — `addNode()` and `removeNode()` update only affected rows

### Virtual Scrolling

Virtual scrolling activates automatically when visible row count exceeds 5000, or can be forced via `virtualScrolling: "enabled"`. In virtual mode, only visible rows are rendered in the DOM, with spacer elements maintaining scroll height.

**Requirements:**
- Fixed `rowHeight` (default: 32px). Variable-height rows are not supported.
- Custom `renderer` functions are supported and called during row recycling.

### Large Dataset Example

```js
var grid = createTreeGrid({
    containerId: "large-grid",
    label: "Enterprise Data",
    virtualScrolling: "auto",
    rowHeight: 32,
    scrollBuffer: 50,
    stickyHeader: true,
    nodes: largeDataSet,
    columns: [
        { id: "col1", label: "Column 1", sortable: true },
        { id: "col2", label: "Column 2", sortable: true }
    ],
    onLoadChildren: function(node) {
        return fetch("/api/children/" + node.id)
            .then(function(r) { return r.json(); });
    }
});
```

## Examples

### Lazy Loading Tree

```js
var grid = createTreeGrid({
    containerId: "lazy-grid",
    label: "File System",
    nodes: [
        {
            id: "root",
            label: "C:\\",
            icon: "bi-hdd",
            data: { type: "Drive" },
            children: null,
            lazy: true
        }
    ],
    columns: [
        { id: "type", label: "Type", width: 100 },
        { id: "size", label: "Size", width: 100, align: "right" }
    ],
    treeColumnLabel: "Path",
    onLoadChildren: function(node) {
        return fetch("/api/fs/children?path=" + encodeURIComponent(node.id))
            .then(function(r) { return r.json(); });
    }
});
```

### Inline Editing

```js
var grid = createTreeGrid({
    containerId: "editable-grid",
    label: "Product Catalog",
    nodes: [
        {
            id: "1",
            label: "Electronics",
            icon: "bi-lightning",
            data: { stock: 150, price: 0 },
            children: [
                {
                    id: "2",
                    label: "Laptop",
                    icon: "bi-laptop",
                    data: { stock: 25, price: 1299.99 }
                },
                {
                    id: "3",
                    label: "Mouse",
                    icon: "bi-mouse",
                    data: { stock: 125, price: 29.99 }
                }
            ]
        }
    ],
    columns: [
        {
            id: "stock",
            label: "Stock",
            width: 100,
            editable: true,
            editorType: "number",
            align: "right"
        },
        {
            id: "price",
            label: "Price",
            width: 100,
            editable: true,
            editorType: "number",
            align: "right",
            renderer: function(cell, node, value) {
                if (typeof value === "number") {
                    cell.textContent = "$" + value.toFixed(2);
                }
            }
        }
    ],
    treeColumnLabel: "Category / Item",
    onEditCommit: function(node, column, oldValue, newValue) {
        console.log("Updated", node.label, column.id, "from", oldValue, "to", newValue);
        // Persist to server
        fetch("/api/products/" + node.id, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ [column.id]: newValue })
        });
    }
});
```

### Sortable Columns with Custom Renderer

```js
var grid = createTreeGrid({
    containerId: "sorted-grid",
    label: "Team Members",
    nodes: [
        {
            id: "eng",
            label: "Engineering",
            icon: "bi-code-slash",
            data: { count: 12, budget: 1200000 },
            children: [
                { id: "e1", label: "Alice", data: { role: "Senior", salary: 125000 } },
                { id: "e2", label: "Bob", data: { role: "Junior", salary: 85000 } }
            ]
        },
        {
            id: "des",
            label: "Design",
            icon: "bi-palette",
            data: { count: 5, budget: 500000 },
            children: [
                { id: "d1", label: "Carol", data: { role: "Lead", salary: 110000 } }
            ]
        }
    ],
    columns: [
        {
            id: "role",
            label: "Role",
            width: 120,
            sortable: true
        },
        {
            id: "salary",
            label: "Salary",
            width: 120,
            sortable: true,
            align: "right",
            renderer: function(cell, node, value) {
                if (typeof value === "number") {
                    cell.textContent = "$" + value.toLocaleString();
                }
            }
        }
    ],
    treeColumnLabel: "Department / Name",
    rowStriping: true,
    onColumnSort: function(column, direction) {
        console.log("Sorting by", column.label, direction);
    }
});
```

### Context Menu

```js
var grid = createTreeGrid({
    containerId: "context-grid",
    label: "Project Tasks",
    enableContextMenu: true,
    contextMenuItems: [
        { id: "add-child", label: "Add Subtask", icon: "bi-plus-circle" },
        { id: "edit", label: "Edit", icon: "bi-pencil", shortcutHint: "F2" },
        { id: "sep1", label: "", separator: true },
        { id: "delete", label: "Delete", icon: "bi-trash" }
    ],
    nodes: [
        {
            id: "t1",
            label: "Phase 1",
            data: { status: "In Progress", due: "2026-03-01" },
            children: [
                { id: "t2", label: "Design mockups", data: { status: "Done", due: "2026-02-15" } }
            ]
        }
    ],
    columns: [
        { id: "status", label: "Status", width: 120, sortable: true },
        { id: "due", label: "Due Date", width: 120, sortable: true }
    ],
    treeColumnLabel: "Task",
    onContextMenuAction: function(actionId, node) {
        console.log("Action:", actionId, "on", node.label);
        if (actionId === "delete") {
            grid.removeNode(node.id);
        }
    }
});
```

## Column Management

The TreeGrid supports runtime column management:

- **Resize**: Drag the handle between column headers (visible as a thin border). All columns are resizable by default (`resizable: true`).
- **Reorder**: When `enableColumnReorder: true`, drag column headers to rearrange them.
- **Show/Hide**: When `showColumnPicker: true`, click the gear icon in the header to toggle column visibility via checkboxes.
- **Programmatic**: Use `updateColumn(id, { editable: false })`, `showColumn(id)`, `hideColumn(id)`, or `setColumns(newArray)` for full control.

```js
// Toggle a column's editability at runtime
grid.updateColumn("status", { editable: false });

// Change column width
grid.updateColumn("estimate", { width: 200 });

// Hide a column
grid.updateColumn("priority", { hidden: true });
```

## Sorting

Columns with `sortable: true` support click-to-sort (ascending → descending → none). The built-in sort is **type-aware**: numbers are compared numerically, strings lexicographically (case-insensitive), and nulls sort to the end.

### Per-Column Comparator

Override the default sort logic for a specific column:

```js
columns: [
    {
        id: "estimate",
        label: "Est. Hours",
        sortable: true,
        comparator: function(a, b) {
            // Custom numeric comparison with null handling
            if (a == null && b == null) return 0;
            if (a == null) return 1;
            if (b == null) return -1;
            return Number(a) - Number(b);
        }
    }
]
```

### External Sort (Server-Side)

When the application needs full control over sorting (e.g., server-side sort, complex multi-column sort), set `externalSort: true`. The grid updates sort indicators and fires the callback, but does not rearrange data:

```js
var grid = createTreeGrid({
    containerId: "server-sorted-grid",
    label: "Server Data",
    externalSort: true,
    columns: [
        { id: "name", label: "Name", sortable: true },
        { id: "created", label: "Created", sortable: true }
    ],
    nodes: serverData,
    onColumnSort: function(column, direction) {
        // Application fetches sorted data from server
        fetch("/api/data?sort=" + column.id + "&dir=" + direction)
            .then(function(r) { return r.json(); })
            .then(function(sorted) {
                grid.setNodes(sorted);
                grid.refresh();
            });
    }
});
```
