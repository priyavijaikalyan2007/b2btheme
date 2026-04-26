<!-- AGENT: Documentation for the TreeView component — configurable hierarchical tree with selection, DnD, context menu, search, and starred. -->

# TreeView

A highly configurable, generic tree view component for representing multi-tree structured data. Supports lazy loading, multi-select (Ctrl+Click / Shift+Click), drag and drop (internal + cross-tree + external), context menu, inline rename (F2), search with mark highlighting, starred/favourites group, sort modes, extensible node types with badges, toolbar actions, and full WAI-ARIA tree pattern keyboard navigation.

## Assets

| Asset | Path |
|-------|------|
| CSS | `components/treeview/treeview.css` |
| JS | `components/treeview/treeview.js` |
| Types | `components/treeview/treeview.d.ts` |

## Requirements

- **Bootstrap CSS** — for SCSS variables (`$gray-*`, `$primary`, `$font-size-*`, etc.)
- **Bootstrap Icons CSS** — for node icons, toggle chevrons, star icons, and toolbar buttons
- Does **not** require Bootstrap JS.

## Quick Start

```html
<link rel="stylesheet" href="components/treeview/treeview.css">
<script src="components/treeview/treeview.js"></script>

<div id="my-tree" style="height: 400px"></div>

<script>
    var tree = createTreeView({
        containerId: "my-tree",
        roots: [
            { id: "1", label: "Documents", kind: "folder", children: [
                { id: "2", label: "Report.pdf", kind: "leaf", icon: "bi-file-earmark-pdf" },
                { id: "3", label: "Notes.txt", kind: "leaf", icon: "bi-file-text" }
            ]},
            { id: "4", label: "Images", kind: "folder", children: [] }
        ],
        nodeTypes: {
            folder: { kind: "folder", icon: "bi-folder", isParent: true },
            leaf: { kind: "leaf", icon: "bi-file-earmark" }
        },
        onSelect: function(node, selected) {
            console.log(node.label, selected ? "selected" : "deselected");
        }
    });
</script>
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `containerId` | `string` | required | DOM element ID for the container |
| `roots` | `TreeNode[]` | required | Root-level tree nodes |
| `nodeTypes` | `Record<string, TreeNodeTypeDescriptor>` | `{}` | Registry of node type descriptors keyed by kind |
| `selectionMode` | `"single" \| "multi" \| "none"` | `"single"` | Selection behaviour |
| `sortMode` | `"alpha-asc" \| "alpha-desc" \| "newest" \| "oldest" \| "custom"` | `"alpha-asc"` | Sort mode for siblings |
| `sortComparator` | `(a, b) => number` | — | Custom sort comparator (when sortMode is "custom") |
| `showStarred` | `boolean` | `false` | Show the starred/favourites group |
| `starredLabel` | `string` | `"Starred"` | Label for the starred group |
| `showSearch` | `boolean` | `false` | Show search box in toolbar |
| `searchDebounceMs` | `number` | `300` | Search input debounce delay (ms) |
| `toolbarActions` | `TreeToolbarAction[]` | `[]` | Toolbar action buttons |
| `showDefaultGroupActions` | `boolean` | `false` | Prepend the four default group actions (sort A→Z, sort Z→A, expand all, collapse all) to the existing toolbar. ADR-128. |
| `enableDragDrop` | `boolean` | `false` | Enable drag and drop |
| `enableInlineRename` | `boolean` | `false` | Enable F2 inline rename |
| `enableContextMenu` | `boolean` | `false` | Enable right-click context menu |
| `indentPx` | `number` | `20` | Per-level indent in pixels |
| `height` | `string` | `"100%"` | Component height CSS value |
| `width` | `string` | `"100%"` | Component width CSS value |
| `cssClass` | `string` | — | Additional CSS class on root element |
| `emptyMessage` | `string` | `"No items to display"` | Message shown when tree is empty |
| `rowHeight` | `number` | `28` | Fixed row height in pixels (required for virtual scrolling) |
| `virtualScrolling` | `"auto" \| "enabled" \| "disabled"` | `"auto"` | Virtual scrolling mode. "auto" enables above 5000 visible nodes |
| `scrollBuffer` | `number` | `50` | Number of rows rendered above/below viewport in virtual mode |
| `searchAsyncThreshold` | `number` | `5000` | Node count above which async/chunked search is used |

## Callbacks

| Callback | Parameters | Description |
|----------|------------|-------------|
| `onSelect` | `(node, selected)` | Node selected or deselected |
| `onSelectionChange` | `(nodes)` | Full selection set changed |
| `onActivate` | `(node)` | Node double-clicked or Enter pressed |
| `onToggle` | `(node, expanded)` | Node expanded or collapsed |
| `onLoadChildren` | `(node) => Promise<TreeNode[]>` | Async loader for lazy children |
| `onRename` | `(node, newLabel) => Promise<boolean> \| boolean` | Inline rename handler |
| `onStarToggle` | `(node, starred)` | Star state toggled |
| `onDragValidate` | `(sources[], target, position) => boolean` | Validate drop |
| `onDrop` | `(sources[], target, position)` | Nodes dropped |
| `onExternalDrop` | `(dataTransfer, target, position)` | External content dropped |
| `onContextMenuAction` | `(actionId, node)` | Context menu action clicked |
| `onRefreshComplete` | `()` | Programmatic refresh completed |
| `onSearchAsync` | `(query: string) => Promise<string[]>` | Server-side search returning matching node IDs |
| `onSortModeChange` | `(mode: TreeSortMode)` | Sort mode changed (toolbar-driven OR imperative `setSort`). Idempotent — does not fire when mode is unchanged. ADR-128. |
| `onCollapseStateChange` | `(state: TreeViewCollapseState)` | Aggregate collapse-state changed via `expandAll`/`collapseAll`. Idempotent. ADR-128. |

### TreeViewCollapseState

`type TreeViewCollapseState = "all-collapsed" | "all-expanded" | "mixed"` — exported for hosts that round-trip the collapse-state across sessions.

### Default group actions (ADR-128)

Setting `showDefaultGroupActions: true` opts the TreeView into the [CategorizedDataInlineToolbar pattern](../../agentknowledge/decisions.yaml). Unlike RelationshipManager, ActionItems, and Timeline — which mount a separate `InlineToolbar` — TreeView extends its own existing `.treeview-toolbar`: four default action buttons (`tv-sort-asc`, `tv-sort-desc`, `tv-expand-all`, `tv-collapse-all`) are prepended to the toolbar before any host-supplied `toolbarActions`. The defaults wire to the existing public API (`setSort`, `expandAll`, `collapseAll`); host actions still take effect and remain in their declared order. Sort buttons reflect the live `sortMode` via the `active` class and `aria-pressed`. Toggling an active sort button drops the mode to `"custom"` (insertion order). Default is `false` so existing consumers see no change.

## TreeNode Interface

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique identifier |
| `label` | `string` | Display text |
| `kind` | `string` | Node kind (matches nodeTypes registry) |
| `icon` | `string` | Bootstrap Icons class override |
| `children` | `TreeNode[] \| null` | Child nodes. `null` = lazy-loadable |
| `lazy` | `boolean` | When true and children is null, expand triggers onLoadChildren |
| `expanded` | `boolean` | Initially expanded |
| `disabled` | `boolean` | Cannot be interacted with |
| `starred` | `boolean` | Appears in starred group |
| `tooltip` | `string` | Native tooltip text |
| `badges` | `TreeBadge[]` | Badges after label |
| `data` | `unknown` | Arbitrary consumer data |

## Public API

| Method | Returns | Description |
|--------|---------|-------------|
| `addNode(parentId, node, index?)` | `void` | Add a node under parent (null = root) |
| `removeNode(nodeId)` | `void` | Remove a node and descendants |
| `updateNode(nodeId, updates)` | `void` | Update node properties |
| `getNodeById(nodeId)` | `TreeNode \| undefined` | Find a node by ID |
| `expandNode(nodeId)` | `void` | Expand a node |
| `collapseNode(nodeId)` | `void` | Collapse a node |
| `expandAll()` | `void` | Expand all parent nodes |
| `collapseAll()` | `void` | Collapse all nodes |
| `selectNode(nodeId)` | `void` | Select and focus a node |
| `deselectAll()` | `void` | Clear selection |
| `getSelectedNodes()` | `TreeNode[]` | Get selected nodes |
| `scrollToNode(nodeId)` | `void` | Scroll to node, expanding ancestors |
| `setSort(mode)` | `void` | Change sort mode |
| `setRoots(roots)` | `void` | Replace all roots |
| `clearSearch()` | `void` | Clear search filter |
| `refresh()` | `void` | Re-render tree |
| `destroy()` | `void` | Full cleanup |
| `getElement()` | `HTMLElement \| null` | Root DOM element |
| `getId()` | `string` | Instance ID |

## Convenience Functions

| Function | Description |
|----------|-------------|
| `createTreeView(options)` | Create a TreeView instance |

## Global Exports

When loaded via `<script>` tag:

- `window.TreeView` — TreeView class
- `window.createTreeView` — Factory function

## Keyboard Navigation

| Key | Action |
|-----|--------|
| `Arrow Down` | Move to next visible node |
| `Arrow Up` | Move to previous visible node |
| `Arrow Right` | Expand collapsed parent / move to first child |
| `Arrow Left` | Collapse expanded parent / move to parent |
| `Home` | Move to first node |
| `End` | Move to last visible node |
| `Space` | Toggle selection |
| `Enter` | Activate node (fires onActivate) |
| `F2` | Start inline rename (when enabled) |
| `*` | Expand all siblings |
| `Ctrl+A` | Select all visible nodes (multi-select mode) |
| `Escape` | Close context menu / cancel rename |
| Type character | Jump to next node starting with that character |

## Drag and Drop

Internal drag uses MIME type `application/x-treeview` with a JSON payload containing the source tree ID and node IDs, enabling cross-tree drag between multiple TreeView instances. External drops (files, URLs) are passed to `onExternalDrop` with the raw `DataTransfer` object.

Drop position is determined by mouse Y within the target row thirds: top third = "before", middle third = "inside" (parent nodes only), bottom third = "after".

## Performance

The TreeView is optimized for trees with 1M+ total nodes:

- **O(1) node lookups** — internal `nodeMap` and `parentMap` replace recursive tree walks
- **Cached visible array** — flat visible-node list rebuilt lazily on expand/collapse, not per keystroke
- **Virtual scrolling** — renders only viewport + buffer rows (~200 DOM elements) instead of all visible nodes
- **Incremental DOM updates** — `addNode()` and `removeNode()` update only the affected DOM, not full rebuild
- **Three-tier search** — sync (< 5K nodes), chunked rAF (>= 5K), or server-side async via `onSearchAsync`

### Virtual Scrolling

Virtual scrolling activates automatically when visible node count exceeds 5000, or can be forced via `virtualScrolling: "enabled"`. In virtual mode, the tree uses a flat `<div>` structure with explicit `aria-level` instead of nested `<ul>/<li>`. DOM elements are recycled from a pool during scroll.

**Requirements:**
- Fixed `rowHeight` (default: 28px). Variable-height rows are not supported in virtual mode.
- Custom `nodeRenderer` is not compatible with virtual scrolling.

### Large Tree Example

```js
var tree = createTreeView({
    containerId: "large-tree",
    virtualScrolling: "auto",
    rowHeight: 28,
    scrollBuffer: 50,
    roots: largeDataSet,
    nodeTypes: { folder: { kind: "folder", icon: "bi-folder", isParent: true } },
    onSearchAsync: function(query) {
        return fetch("/api/search?q=" + encodeURIComponent(query))
            .then(function(r) { return r.json(); });
    }
});
```

## Examples

### Lazy Loading

```js
var tree = createTreeView({
    containerId: "lazy-tree",
    roots: [
        { id: "root", label: "Projects", kind: "folder", children: null, lazy: true }
    ],
    nodeTypes: {
        folder: { kind: "folder", icon: "bi-folder", isParent: true }
    },
    onLoadChildren: function(node) {
        return fetch("/api/children/" + node.id)
            .then(function(r) { return r.json(); });
    }
});
```

### Multi-Select with Starred

```js
var tree = createTreeView({
    containerId: "starred-tree",
    selectionMode: "multi",
    showStarred: true,
    roots: myNodes,
    onStarToggle: function(node, starred) {
        console.log(node.label, starred ? "starred" : "unstarred");
    }
});
```

### Context Menu

```js
var tree = createTreeView({
    containerId: "ctx-tree",
    enableContextMenu: true,
    nodeTypes: {
        folder: {
            kind: "folder", icon: "bi-folder", isParent: true,
            contextMenuItems: [
                { id: "new-folder", label: "New Folder", icon: "bi-folder-plus" },
                { id: "rename", label: "Rename", shortcutHint: "F2" },
                { id: "sep", label: "", separator: true },
                { id: "delete", label: "Delete", icon: "bi-trash" }
            ]
        }
    },
    onContextMenuAction: function(actionId, node) {
        console.log("Action:", actionId, "on", node.label);
    }
});
```
