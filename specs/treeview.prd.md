<!-- AGENT: Product requirements document for the TreeView component — highly configurable, generic tree view for representing multi-tree structured data with drag-and-drop, search, inline rename, context menus, and WAI-ARIA tree pattern accessibility. -->

# TreeView Component — Product Requirements

**Status:** Draft
**Component name:** TreeView
**Folder:** `./components/treeview/`
**Spec author:** Agent
**Date:** 2026-02-15

---

## 1. Overview

### 1.1 What Is It

A highly configurable, generic tree view component for representing multi-tree structured data. The TreeView renders one or more root nodes and their descendants as a navigable, collapsible hierarchy using the WAI-ARIA tree pattern. It is designed for use cases such as organisational hierarchies, folder trees, resource explorers, project navigators, and any domain where data has parent-child relationships.

The TreeView supports:

- **Multiple roots** — render several independent trees within a single container (multi-tree).
- **Extensible node types** — a kind registry (`TreeNodeTypeDescriptor`) defines icons, behaviour flags, and context menu items per node type.
- **Lazy loading** — parent nodes can declare `lazy: true` with `children: null` to defer child loading until expand.
- **Single, multi, or no selection** — configurable selection modes with Ctrl+Click, Shift+Click range, and Ctrl+A.
- **Drag and drop** — internal reordering, cross-tree transfers, and external resource drops via HTML5 Drag and Drop API.
- **Inline rename** — F2 triggers in-place label editing with consumer validation.
- **Context menu** — right-click menus with per-node-type items, separators, and disabled states.
- **Search/filter** — toolbar search input with debounced filtering, `<mark>` highlighting, and ancestor auto-expansion.
- **Starred items** — a virtual "Starred" group at the top for pinned/favourite nodes.
- **Status badges** — per-node badge pills with Bootstrap variant colours and tooltips.
- **Sort modes** — alpha-asc, alpha-desc, newest, oldest, and custom comparator.
- **Toolbar** — configurable action buttons above the tree.
- **Callbacks only** — the consumer owns all data mutations; the TreeView never modifies the data model.

### 1.2 Why Build It

Enterprise SaaS applications frequently need tree-based navigation for:

- File and folder explorers (like VS Code's file explorer or Windows Explorer)
- Organisational hierarchy browsers (teams, departments, business units)
- Project and solution navigators (like Visual Studio Solution Explorer)
- Resource catalogues (APIs, services, environments, configurations)
- Category and taxonomy managers (product categories, permission trees)

No existing open-source library meets all requirements. A custom component ensures alignment with the project's zero-dependency, IIFE-wrapped, Bootstrap 5 themed architecture and delivers the full feature set required by the Explorer experience.

### 1.3 Design Inspiration

| Source | Key Pattern Adopted |
|--------|---------------------|
| VS Code File Explorer | Tree with inline rename, context menus, drag-drop, multi-selection, search filter |
| Windows Explorer Tree | Expand/collapse chevrons, indent guides, multi-root drives, lazy loading |
| Visual Studio Solution Explorer | Node-type icons, badges, starred/pinned items, extensible context menus |
| macOS Finder Sidebar | Starred/favourites section at top, smooth expand/collapse transitions |
| WAI-ARIA Tree Pattern | `role="tree"`, `role="treeitem"`, `aria-expanded`, `aria-selected`, roving tabindex |
| JetBrains IDEs | Search-as-you-type filtering with ancestor expansion, mark highlighting |

### 1.4 Open Source Evaluation

| Library | Verdict | Reason |
|---------|---------|--------|
| jsTree | Not recommended | jQuery dependency; limited Bootstrap 5 theme support; no cross-tree DnD |
| FancyTree | Not recommended | jQuery dependency; no built-in context menus; complex API surface |
| Dnd-kit Tree | Not recommended | React-only; no vanilla JS support |
| react-arborist | Not recommended | React-only; no vanilla JS support |
| angular-tree-component | Not recommended | Angular-only; no vanilla JS support |
| vaadin-grid-tree | Not recommended | Polymer/Lit dependency; heavy framework coupling |
| bootstrap-treeview | Not recommended | Unmaintained (last updated 2016); Bootstrap 3 only; no DnD, rename, or badges |
| zTree | Not recommended | jQuery dependency; no TypeScript types; dated API |
| jqxTree | Not recommended | Commercial licence; jQuery dependency |

**Decision (ADR-019):** Build custom. No single library covers more than 60% of the required feature set (multi-tree + cross-tree DnD + context menu + inline rename + starred + badges + extensible node types + Bootstrap 5 theming). Building custom ensures full control over DOM structure, accessibility, and performance.

---

## 2. Use Cases

| # | Use Case | Description | Node Types | Key Features Used |
|---|----------|-------------|------------|-------------------|
| 1 | Explorer sidebar | Unified asset browser for the Knobby.io platform | root, org-unit, folder, diagram, checklist, session, link | Multi-tree, lazy load, DnD, context menu, search, starred, badges |
| 2 | Org hierarchy browser | Visualise and navigate organisational structure | root, division, department, team, person | Multi-root, expand/collapse, search, selection |
| 3 | Folder/file tree | Classic file system navigation | root, folder, file | DnD reorder, inline rename, context menu, sort |
| 4 | Category taxonomy | Browse and manage product categories | root, category, subcategory, item | Inline rename, DnD reparent, context menu CRUD |
| 5 | Permission tree | View and assign role-based permissions | root, module, permission | Badges (granted/denied), multi-select, no DnD |
| 6 | Service catalogue | Browse microservices, components, environments | root, service, component, environment | Lazy load, badges (status), tooltips, custom icons |
| 7 | Side-by-side transfer | Two trees for moving items between containers | Any | Cross-tree DnD, multi-select, external drop |

---

## 3. Anatomy

### 3.1 Full Tree Layout

```
┌─────────────────────────────────────────────────┐
│ [+] [−] [↻] [⋮]    [ 🔍 Search...         ]   │  ← Toolbar
├─────────────────────────────────────────────────┤
│ ⭐ Starred                                      │  ← Virtual starred group
│   ├── 📊 System Overview                        │
│   └── ✅ Deploy Checklist                       │
│                                                 │
│ ▼ 📁 Engineering Division                       │  ← Root 1
│   ▼ 📁 Platform Team                            │
│     ▶ 📂 Architecture              [3] [★]     │  ← Collapsed, badge, star
│     ▼ 📂 Runbooks                               │  ← Expanded
│       ├── ✅ Deployment Checklist                │  ← Leaf
│       ├── ✅ Deploy v2.3           [done]       │  ← Leaf with badge
│       └── 🔗 On-Call Playbook                   │  ← Leaf
│                                                 │
│ ▶ 📁 Product Division                           │  ← Root 2 (collapsed)
│                                                 │
│                                                 │  ← Scrollable area
└─────────────────────────────────────────────────┘
```

### 3.2 Node Row Detail

```
┌──────────────────────────────────────────────────────────┐
│ [indent] [▶] [icon] [label]        [badges] [★] [actions]│
└──────────────────────────────────────────────────────────┘

indent   — nested spacing (indentPx * level)
▶        — toggle chevron (rotates 90° when expanded); hidden for leaves
icon     — Bootstrap Icons class from node.icon or nodeType.icon
label    — node.label text
badges   — zero or more badge pills (text + variant colour)
★        — star toggle (visible when showStarred is true)
actions  — hover-visible action buttons (from nodeType.contextMenuItems or toolbar)
```

### 3.3 Element Breakdown

| Element | Required | Description |
|---------|----------|-------------|
| Root container | Yes | `div.treeview` wrapping the entire component |
| Toolbar | Optional | Action buttons and search input above the tree |
| Search input | Optional | Text input for filtering nodes (`showSearch`) |
| Tree list | Yes | `ul.treeview-list` with `role="tree"` |
| Tree node | Yes (1+) | `li.treeview-node` with `role="treeitem"` |
| Node row | Yes | `div.treeview-node-row` — the clickable row content |
| Indent spacer | Yes | `span.treeview-node-indent` — indentation per level |
| Toggle button | Conditional | `button.treeview-node-toggle` — chevron for parent nodes |
| Node icon | Optional | `span.treeview-node-icon` — Bootstrap Icons `<i>` element |
| Node label | Yes | `span.treeview-node-label` — text label |
| Badges container | Optional | `span.treeview-node-badges` — wraps badge pills |
| Badge pill | Optional | `span.treeview-badge.badge` — individual badge |
| Star toggle | Optional | `span.treeview-node-star` — star icon button |
| Hover actions | Optional | `span.treeview-node-actions` — buttons visible on hover |
| Children group | Conditional | `ul.treeview-children` with `role="group"` — nested list |
| Loading spinner | Conditional | `span.spinner-border.spinner-border-sm` — during lazy load |
| Empty message | Conditional | `div.treeview-empty` — shown when tree has no nodes |
| Context menu | Optional | `div.treeview-context-menu` with `role="menu"` |
| Inline rename input | Conditional | `input.treeview-rename-input` — replaces label during rename |
| Drag indicator | Conditional | Visual drop position indicator during DnD |

---

## 4. API

### 4.1 Types

```typescript
/** Kind of tree node — extensible string union. */
type TreeNodeKind = "root" | "folder" | "leaf" | "virtual-root" | string;

/** Sort mode for sibling ordering within parent nodes. */
type TreeSortMode = "alpha-asc" | "alpha-desc" | "newest" | "oldest" | "custom";

/** Selection behaviour mode. */
type TreeSelectionMode = "single" | "multi" | "none";

/** Drop position indicator relative to the target node. */
type DropPosition = "before" | "inside" | "after";
```

### 4.2 Interfaces

#### 4.2.1 TreeNodeTypeDescriptor

Defines the behaviour and appearance of a node kind. Registered via `options.nodeTypes`.

```typescript
interface TreeNodeTypeDescriptor
{
    /** The kind string this descriptor applies to. Must match TreeNode.kind. */
    kind: string;

    /** Default Bootstrap Icons class for nodes of this type (e.g., "bi-folder"). */
    icon?: string;

    /** Whether nodes of this type can contain children. Default: false. */
    isParent?: boolean;

    /** Whether nodes of this type support inline rename (F2). Default: false. */
    renamable?: boolean;

    /** Whether nodes of this type can be dragged. Default: false. */
    draggable?: boolean;

    /** Whether nodes of this type accept drops (as a parent). Default: false. */
    droppable?: boolean;

    /** Context menu items available for nodes of this type. */
    contextMenuItems?: TreeContextMenuItem[];

    /** Additional CSS class applied to nodes of this type. */
    cssClass?: string;
}
```

#### 4.2.2 TreeContextMenuItem

Defines a single item in the right-click context menu.

```typescript
interface TreeContextMenuItem
{
    /** Unique identifier for this action. */
    id: string;

    /** Display label. */
    label: string;

    /** Bootstrap Icons class (e.g., "bi-pencil"). */
    icon?: string;

    /** Whether this item is disabled. Default: false. */
    disabled?: boolean;

    /** Whether this item is hidden. Default: false. */
    hidden?: boolean;

    /** Keyboard shortcut hint text (e.g., "F2", "Del"). Displayed right-aligned. */
    shortcut?: string;

    /** If true, render a separator line after this item. Default: false. */
    separatorAfter?: boolean;

    /** If true, render a separator line before this item. Default: false. */
    separatorBefore?: boolean;

    /** CSS class for custom styling. */
    cssClass?: string;
}
```

#### 4.2.3 TreeToolbarAction

Defines a button in the toolbar above the tree.

```typescript
interface TreeToolbarAction
{
    /** Unique identifier. */
    id: string;

    /** Bootstrap Icons class (e.g., "bi-plus"). */
    icon: string;

    /** Tooltip text. */
    tooltip: string;

    /** Whether the button is disabled. Default: false. */
    disabled?: boolean;

    /** Click handler. */
    onClick: () => void;
}
```

#### 4.2.4 TreeBadge

Defines a status badge displayed on a node.

```typescript
interface TreeBadge
{
    /** Badge text content. */
    text: string;

    /** Bootstrap colour variant. Default: "secondary". */
    variant?: "primary" | "secondary" | "success" | "danger" | "warning" | "info";

    /** Tooltip text shown on hover. */
    tooltip?: string;
}
```

#### 4.2.5 TreeNode

Represents a single node in the tree data model.

```typescript
interface TreeNode
{
    /** Unique identifier. Must be unique across all nodes in the tree instance. */
    id: string;

    /** Display label. */
    label: string;

    /** Node type kind string. Matched against nodeTypes registry. */
    kind: string;

    /** Bootstrap Icons class override. Overrides the kind default if set. */
    icon?: string;

    /**
     * Child nodes.
     * - Array of children: node is a parent with known children.
     * - null: node is a lazy parent (children loaded on first expand).
     * - undefined: node is a leaf.
     */
    children?: TreeNode[] | null;

    /** If true, children are loaded lazily via onLoadChildren on first expand. */
    lazy?: boolean;

    /** Whether this parent node is initially expanded. Default: false. */
    expanded?: boolean;

    /** Whether this node is disabled (non-interactive). Default: false. */
    disabled?: boolean;

    /** Whether this node is starred/pinned. Default: false. */
    starred?: boolean;

    /** Tooltip text shown on hover over the node row. */
    tooltip?: string;

    /** Status badges displayed after the label. */
    badges?: TreeBadge[];

    /** Arbitrary consumer data attached to this node. Not rendered. */
    data?: unknown;
}
```

#### 4.2.6 TreeViewOptions

Configuration object passed to the TreeView constructor.

```typescript
interface TreeViewOptions
{
    /** ID of the container element to render the tree inside. */
    containerId: string;

    /** Root-level nodes. Multiple roots create a multi-tree view. */
    roots: TreeNode[];

    /**
     * Node type registry. Maps kind strings to behaviour descriptors.
     * Nodes with unregistered kinds use default leaf behaviour.
     */
    nodeTypes?: Record<string, TreeNodeTypeDescriptor>;

    /** Selection mode. Default: "single". */
    selectionMode?: TreeSelectionMode;

    /** Sort mode for sibling ordering. Default: "alpha-asc". */
    sortMode?: TreeSortMode;

    /**
     * Custom sort comparator. Used when sortMode is "custom".
     * Receives two sibling TreeNode objects. Return negative, zero, or positive.
     */
    sortComparator?: (a: TreeNode, b: TreeNode) => number;

    /** Show the virtual starred group at the top. Default: false. */
    showStarred?: boolean;

    /** Label for the starred group. Default: "Starred". */
    starredLabel?: string;

    /** Show the search input in the toolbar. Default: false. */
    showSearch?: boolean;

    /** Debounce delay in ms for search input. Default: 250. */
    searchDebounceMs?: number;

    /** Toolbar action buttons. Rendered left-to-right before the search input. */
    toolbarActions?: TreeToolbarAction[];

    /** Enable drag and drop. Default: false. */
    enableDragDrop?: boolean;

    /** Enable inline rename on F2. Default: false. */
    enableInlineRename?: boolean;

    /** Enable right-click context menu. Default: false. */
    enableContextMenu?: boolean;

    /** Indentation per level in pixels. Default: 20. */
    indentPx?: number;

    /** CSS height of the tree container. Default: "100%". */
    height?: string;

    /** CSS width of the tree container. Default: "100%". */
    width?: string;

    /** Additional CSS class(es) for the root element. */
    cssClass?: string;

    /** Message displayed when the tree has no nodes. Default: "No items to display". */
    emptyMessage?: string;

    // ── Callbacks ──────────────────────────────────────────────────────

    /**
     * Called when a node's selection state changes (click, programmatic).
     * Receives the node and its new selected state.
     */
    onSelect?: (node: TreeNode, selected: boolean) => void;

    /**
     * Called when the set of selected nodes changes.
     * Receives the full array of currently selected nodes.
     */
    onSelectionChange?: (nodes: TreeNode[]) => void;

    /**
     * Called when a node is activated (double-click or Enter).
     * Activation is distinct from selection — it opens or navigates to the node.
     */
    onActivate?: (node: TreeNode) => void;

    /**
     * Called when a parent node is expanded or collapsed.
     * Receives the node and its new expanded state.
     */
    onToggle?: (node: TreeNode, expanded: boolean) => void;

    /**
     * Called when a lazy parent is expanded for the first time.
     * Must return a Promise resolving to the child nodes.
     * While the promise is pending, a spinner is shown on the node.
     */
    onLoadChildren?: (node: TreeNode) => Promise<TreeNode[]>;

    /**
     * Called when inline rename completes.
     * Return true (or a Promise resolving to true) to accept the rename.
     * Return false to revert to the original label.
     */
    onRename?: (node: TreeNode, newLabel: string) => Promise<boolean> | boolean;

    /**
     * Called when a node's starred state is toggled.
     * The consumer is responsible for updating node.starred in their data model.
     */
    onStarToggle?: (node: TreeNode, starred: boolean) => void;

    /**
     * Called during drag to validate whether a drop is allowed.
     * Return true to allow the drop, false to disallow.
     */
    onDragValidate?: (
        sourceNodes: TreeNode[],
        targetNode: TreeNode,
        position: DropPosition
    ) => boolean;

    /**
     * Called when an internal drag-and-drop completes (within same tree or cross-tree).
     * The consumer must perform the actual data model mutation.
     */
    onDrop?: (
        sourceNodes: TreeNode[],
        targetNode: TreeNode,
        position: DropPosition
    ) => void;

    /**
     * Called when an external resource (file, URL) is dropped onto the tree.
     * Receives the native DataTransfer object for reading dropped data.
     */
    onExternalDrop?: (
        dataTransfer: DataTransfer,
        targetNode: TreeNode,
        position: DropPosition
    ) => void;

    /**
     * Called when a context menu action is triggered.
     * Receives the action ID and the node the menu was opened on.
     */
    onContextMenuAction?: (actionId: string, node: TreeNode) => void;

    /** Called after a programmatic refresh() completes. */
    onRefreshComplete?: () => void;

    /**
     * Custom node renderer. If provided, called for every node.
     * Return an HTMLElement to replace the default node row content,
     * or null to use the default renderer.
     */
    nodeRenderer?: (node: TreeNode, level: number) => HTMLElement | null;

    /**
     * Custom filter predicate for search. If provided, replaces the default
     * substring match. Return true if the node matches the search text.
     */
    filterPredicate?: (searchText: string, node: TreeNode) => boolean;
}
```

### 4.3 Class: TreeView

| Method | Signature | Description |
|--------|-----------|-------------|
| `constructor` | `(options: TreeViewOptions)` | Creates the tree DOM inside the container element identified by `containerId`. |
| `addNode` | `(parentId: string \| null, node: TreeNode, index?: number)` | Adds a node under the given parent (or as a root if `parentId` is null) at the optional index. Triggers re-sort and re-render of the parent. |
| `removeNode` | `(nodeId: string)` | Removes a node and all its descendants from the tree. Updates selection if the removed node was selected. |
| `updateNode` | `(nodeId: string, updates: Partial<TreeNode>)` | Updates one or more properties of an existing node (label, icon, badges, disabled, etc.). Re-renders the node row. |
| `getNodeById` | `(nodeId: string): TreeNode \| null` | Returns the TreeNode data object for the given ID, or null if not found. |
| `expandNode` | `(nodeId: string)` | Expands a parent node. If lazy and not yet loaded, triggers `onLoadChildren`. |
| `collapseNode` | `(nodeId: string)` | Collapses a parent node. |
| `expandAll` | `()` | Expands all parent nodes recursively. Lazy nodes are not auto-loaded. |
| `collapseAll` | `()` | Collapses all parent nodes. |
| `selectNode` | `(nodeId: string, options?: { append?: boolean })` | Selects a node. In single mode, deselects others first. With `append: true` in multi mode, adds to selection. |
| `deselectAll` | `()` | Clears all selection. |
| `getSelectedNodes` | `(): TreeNode[]` | Returns an array of currently selected nodes. |
| `scrollToNode` | `(nodeId: string)` | Scrolls the tree container to bring the node into view. Expands ancestor nodes if collapsed. |
| `setSort` | `(mode: TreeSortMode, comparator?: Function)` | Changes the sort mode and optionally the custom comparator. Re-sorts and re-renders. |
| `refresh` | `()` | Re-renders the entire tree from the current data. Fires `onRefreshComplete` when done. |
| `setRoots` | `(roots: TreeNode[])` | Replaces all root nodes with a new data set. Clears selection and search state. |
| `clearSearch` | `()` | Clears the search input and removes filter highlighting. Restores original expand/collapse state. |
| `destroy` | `()` | Removes all DOM elements, event listeners, and internal references. |
| `getElement` | `(): HTMLElement` | Returns the root `div.treeview` DOM element. |

### 4.4 Convenience Functions

| Function | Description |
|----------|-------------|
| `createTreeView(options)` | Creates and returns a TreeView instance. |

### 4.5 Global Exports

```
window.TreeView
window.createTreeView
```

---

## 5. Features

### 5.1 Expand and Collapse

Parent nodes (nodes whose `TreeNodeTypeDescriptor` has `isParent: true`, or whose `children` property is an array or null) display a toggle chevron. The chevron is a right-pointing triangle (`bi-chevron-right`) that rotates 90 degrees clockwise when expanded. Clicking the chevron or double-clicking the node row toggles the expanded state.

- Expanding a node reveals its `ul.treeview-children` group with a CSS transition (`max-height` transition, 200ms ease).
- Collapsing hides the children group.
- The `onToggle` callback fires after the state change.
- `aria-expanded` is updated on the `li.treeview-node` element.

### 5.2 Lazy Loading

Nodes with `lazy: true` and `children: null` load their children on first expand:

1. User clicks the toggle chevron (or presses Right Arrow / Enter).
2. The chevron is replaced with a Bootstrap `spinner-border spinner-border-sm` spinner.
3. The `onLoadChildren(node)` callback is invoked. It must return a `Promise<TreeNode[]>`.
4. While the promise is pending, the node is non-interactive (toggle disabled).
5. On resolve, the returned children are rendered under the node. The spinner is replaced with the expanded chevron. `onToggle` fires.
6. On reject, the spinner is replaced with the collapsed chevron. A console warning is logged with `LOG_PREFIX`. The node remains collapsed. The consumer may show an error via their own UI.
7. Subsequent expand/collapse cycles use the cached children. To force reload, the consumer calls `updateNode(id, { children: null, lazy: true })` to reset.

### 5.3 Selection

#### 5.3.1 Selection Modes

| Mode | Behaviour |
|------|-----------|
| `"none"` | Clicking a node does not select it. `onActivate` still fires on double-click. No `aria-selected` attributes. |
| `"single"` | Clicking a node selects it and deselects all others. At most one node is selected. |
| `"multi"` | Clicking a node selects it (deselects others). Ctrl+Click toggles individual selection. Shift+Click selects a contiguous range. Ctrl+A selects all visible (non-disabled) nodes. |

#### 5.3.2 Selection Interaction

| Action | Single Mode | Multi Mode |
|--------|-------------|------------|
| Click | Select this node, deselect others | Select this node, deselect others |
| Ctrl+Click | (same as Click) | Toggle this node's selection |
| Shift+Click | (same as Click) | Select range from last-clicked to this node |
| Ctrl+A | (no effect) | Select all visible non-disabled nodes |
| Arrow keys | Move focus (auto-selects in single mode) | Move focus only; Enter to toggle selection |

#### 5.3.3 Selection Callbacks

- `onSelect(node, selected)` fires for each individual node whose selection state changes.
- `onSelectionChange(nodes)` fires once per interaction with the final set of selected nodes.
- Both callbacks fire after programmatic selection via `selectNode()` and `deselectAll()`.

### 5.4 Activation

Activation is distinct from selection. It represents the user's intent to "open" or "navigate to" the node:

- **Double-click** on a node row fires `onActivate(node)`.
- **Enter** key on the focused node fires `onActivate(node)`.
- Activation does not change selection state.
- For leaf nodes, activation typically opens the item. For parent nodes, the consumer decides whether to open or toggle expand.

### 5.5 Starred Items (Favourites/Pinning)

When `showStarred` is true:

1. A virtual "Starred" group appears at the top of the tree, rendered as a non-draggable, non-selectable section header with a star icon (`bi-star-fill`).
2. Each node with `starred: true` is rendered as a shallow reference under the starred group. The reference shows the node's icon, label, and badges but not its children.
3. A star toggle icon (`bi-star` / `bi-star-fill`) appears at the right side of each node row. Clicking it fires `onStarToggle(node, newState)`.
4. The consumer is responsible for updating `node.starred` in their data model and calling `refresh()` or `updateNode()` to reflect the change.
5. The starred group label is configurable via `starredLabel` (default: "Starred").
6. If no nodes are starred, the starred group is hidden.
7. Clicking a starred reference scrolls to and selects the original node in the tree.

### 5.6 Sort Modes

Sibling nodes within each parent are sorted according to the active sort mode:

| Mode | Behaviour |
|------|-----------|
| `"alpha-asc"` | Alphabetical ascending by `node.label` (case-insensitive). Parents sorted before leaves. |
| `"alpha-desc"` | Alphabetical descending by `node.label` (case-insensitive). Parents sorted before leaves. |
| `"newest"` | By `node.data` timestamp (consumer must include a sortable date). Newest first. |
| `"oldest"` | By `node.data` timestamp. Oldest first. |
| `"custom"` | Uses `sortComparator(a, b)` provided in options or via `setSort()`. |

Sort is applied recursively at every level. Changing sort mode via `setSort()` triggers a full re-render.

### 5.7 Status Badges

Each node can display zero or more badge pills after its label:

- Badges are rendered as `<span class="treeview-badge badge bg-{variant}">` elements inside `span.treeview-node-badges`.
- The `variant` maps to Bootstrap colour classes: `primary`, `secondary`, `success`, `danger`, `warning`, `info`.
- If `tooltip` is set on the badge, it renders as a Bootstrap tooltip or `title` attribute.
- Badges are compact: `font-size: 0.7rem`, `padding: 0.15em 0.4em`.
- Updating badges is done via `updateNode(id, { badges: [...] })`.

### 5.8 Per-Node-Type Actions

Each `TreeNodeTypeDescriptor` can define `contextMenuItems` — an array of `TreeContextMenuItem` objects that appear in the context menu for nodes of that type. This allows different menus for folders, files, org units, links, etc.

Additionally, node types control:

- `draggable` — whether nodes of this type can be drag sources.
- `droppable` — whether nodes of this type accept drops as a parent.
- `renamable` — whether F2 triggers inline rename.
- `icon` — default icon for nodes of this type (overridable per node).
- `cssClass` — additional styling class applied to the node row.

### 5.9 Multiple Roots (Multi-Tree)

The `roots` array can contain multiple root-level nodes. Each root is rendered as an independent top-level tree item within the same `ul.treeview-list`. This supports use cases like:

- Multiple drives or mount points in a file explorer.
- Multiple organisational divisions in a hierarchy browser.
- A starred group + main tree + unassigned group in the Explorer.

All roots share the same selection state, sort mode, and search filter.

### 5.10 Toolbar

When `toolbarActions` or `showSearch` is configured, a toolbar renders above the tree list:

- Toolbar buttons are rendered left-to-right as icon buttons with tooltips.
- The search input renders at the right side of the toolbar (or fills the toolbar if no actions are defined).
- The toolbar has `role="toolbar"` and uses roving tabindex for keyboard navigation.
- Common toolbar actions: Expand All, Collapse All, Refresh, New Folder, New Item.

### 5.11 Search and Filter

When `showSearch` is true:

1. A search input (`input.treeview-search-input`, `role="searchbox"`) appears in the toolbar.
2. As the user types, the tree is filtered after a debounce delay (`searchDebounceMs`, default 250ms).
3. **Default filter**: case-insensitive substring match against `node.label`. Override with `filterPredicate`.
4. **Matching nodes** remain visible. **Non-matching leaves** are hidden (`display: none`).
5. **Ancestor expansion**: any ancestor of a matching node is auto-expanded and kept visible, even if the ancestor itself does not match.
6. **Mark highlighting**: matching text within visible labels is wrapped in `<mark class="treeview-highlight">` elements for visual emphasis.
7. **Empty result**: if no nodes match, the `emptyMessage` is displayed (or "No matching items" variant).
8. **Clear**: clicking the clear button (×) in the search input, pressing Escape while the input is focused, or calling `clearSearch()` removes the filter, restores original expand/collapse state, and removes mark highlighting.
9. **Lazy nodes**: search does not trigger lazy loading. Only already-loaded nodes are searched. This is by design — the consumer may implement server-side search separately.

### 5.12 Drag and Drop

When `enableDragDrop` is true, the TreeView uses the HTML5 Drag and Drop API for maximum interoperability (including cross-tree and external drops).

#### 5.12.1 Internal Drag (Within Same Tree)

1. **Drag start**: mousedown + move on a draggable node (per `TreeNodeTypeDescriptor.draggable`). Sets `dataTransfer` with `application/x-treeview-nodes` MIME type containing serialised node IDs.
2. **Drag over**: as the pointer moves over droppable targets, a visual indicator shows the drop position:
   - **Before**: horizontal line above the target node row.
   - **Inside**: target node row highlighted with a blue outline.
   - **After**: horizontal line below the target node row.
3. **Drop position detection**: the drop zone is divided vertically into three regions:
   - Top 25%: `"before"`.
   - Middle 50%: `"inside"` (only if target is droppable).
   - Bottom 25%: `"after"`.
4. **Validation**: `onDragValidate(sourceNodes, targetNode, position)` is called on each `dragover`. If it returns false, the `dropEffect` is set to `"none"` and the visual indicator is removed.
5. **Drop**: `onDrop(sourceNodes, targetNode, position)` fires. The consumer performs the data model mutation and calls `refresh()` or the appropriate add/remove API methods.
6. **Multi-drag**: when multiple nodes are selected in multi-selection mode, all selected nodes are dragged together.
7. **Restrictions**: a node cannot be dropped onto itself or any of its own descendants. This is enforced automatically.

#### 5.12.2 Cross-Tree Drag

Multiple TreeView instances on the same page can participate in cross-tree drag and drop:

1. The `dataTransfer` MIME type `application/x-treeview-nodes` includes a `treeId` field to identify the source tree.
2. When a drop occurs in a different tree instance, `onDrop` fires on the target tree. The consumer reads the source tree ID from the transfer data and coordinates the move across both data models.
3. `onDragValidate` on the target tree receives the source nodes (deserialized from the transfer data) for validation.

#### 5.12.3 External Drop

When files, URLs, or other external data is dropped onto the tree:

1. The TreeView detects that the `dataTransfer` does not contain `application/x-treeview-nodes`.
2. `onExternalDrop(dataTransfer, targetNode, position)` fires instead of `onDrop`.
3. The consumer reads the dropped data (files, URLs, text) from the native `DataTransfer` object and decides how to handle it.

### 5.13 Inline Rename

When `enableInlineRename` is true and a node's type has `renamable: true`:

1. **Trigger**: press F2 while a node is focused, or select "Rename" from the context menu.
2. The node label (`span.treeview-node-label`) is replaced with a text input (`input.treeview-rename-input`) pre-filled with the current label.
3. The input is auto-focused and the text is fully selected.
4. **Commit**: pressing Enter or blurring the input fires `onRename(node, newLabel)`.
   - If `onRename` returns `true` (or a Promise resolving to `true`), the label is updated in the DOM.
   - If `onRename` returns `false`, the input is reverted to the original label.
5. **Cancel**: pressing Escape reverts to the original label without firing `onRename`.
6. **Validation**: empty labels are not accepted. If the user clears the input and presses Enter, it is treated as a cancel.
7. During rename, the node is not draggable and selection changes are suppressed.

### 5.14 Context Menu

When `enableContextMenu` is true:

1. **Trigger**: right-click on a node row, or press the Menu key (or Shift+F10) while a node is focused.
2. The context menu (`div.treeview-context-menu`, `role="menu"`) is rendered at the pointer position (or below the node for keyboard triggers).
3. Menu items come from the node's `TreeNodeTypeDescriptor.contextMenuItems` array.
4. Each item is a `button.treeview-context-item` with `role="menuitem"`.
5. Separators are `div.treeview-context-separator` with `role="separator"`.
6. Clicking a menu item fires `onContextMenuAction(actionId, node)` and closes the menu.
7. The menu closes on: click outside, Escape key, scroll, or window blur.
8. **Positioning**: the menu is absolutely positioned. If it would extend beyond the viewport, it flips to the opposite side (bottom-right preferred, then bottom-left, top-right, top-left).
9. **Z-index**: 1050 (above Bootstrap modals are 1055+, but above all other tree UI).
10. **Disabled items**: rendered with `.treeview-context-item-disabled`, visually greyed out, not focusable, click suppressed.
11. **Keyboard navigation in menu**: Up/Down arrows move focus between items. Enter/Space activates the focused item. Escape closes the menu and returns focus to the tree node.

### 5.15 Multiple Instances

Multiple TreeView instances can coexist on the same page:

- Each instance operates independently with its own data, selection, search, and sort state.
- Cross-tree drag and drop is supported between instances.
- Each instance has a unique internal ID for disambiguation (auto-generated or derived from `containerId`).
- Event listeners are scoped to each instance's DOM subtree. Global listeners (e.g., click-outside for context menu) are registered per instance and cleaned up on `destroy()`.

### 5.16 Programmatic Refresh

The `refresh()` method re-renders the entire tree from the current data model:

1. Preserves current selection state (re-selects nodes by ID if they still exist).
2. Preserves current expand/collapse state (re-expands nodes by ID if they still exist).
3. Preserves scroll position.
4. Clears and rebuilds the DOM.
5. Re-applies the current search filter if active.
6. Fires `onRefreshComplete()` when done.

---

## 6. Accessibility

The TreeView follows the [WAI-ARIA Tree View Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/).

### 6.1 Keyboard Navigation

| Key | Action |
|-----|--------|
| **Tab** | Moves focus into the tree (to the last-focused node, or the first node). |
| **Shift+Tab** | Moves focus out of the tree. |
| **Down Arrow** | Moves focus to the next visible node. |
| **Up Arrow** | Moves focus to the previous visible node. |
| **Right Arrow** | If on a collapsed parent: expands it. If on an expanded parent: moves focus to the first child. If on a leaf: no effect. |
| **Left Arrow** | If on an expanded parent: collapses it. If on a child node: moves focus to the parent. If on a root: no effect. |
| **Home** | Moves focus to the first visible node in the tree. |
| **End** | Moves focus to the last visible node in the tree. |
| **Enter** | Activates the focused node (fires `onActivate`). In single-selection mode, also selects. |
| **Space** | Toggles selection of the focused node (in multi mode). In single mode, selects. |
| **F2** | Starts inline rename (if enabled and node type is renamable). |
| **Delete** | Fires `onContextMenuAction("delete", node)` if a "delete" action exists in the context menu. |
| **Escape** | Closes context menu or inline rename. Clears search if search input is focused. |
| **Ctrl+A** | Selects all visible non-disabled nodes (multi mode only). |
| **Menu / Shift+F10** | Opens context menu for the focused node. |
| **\*** (asterisk) | Expands all siblings of the focused node. |

### 6.2 Roving Tabindex

Only one node in the tree has `tabindex="0"` at a time (the currently focused node). All other nodes have `tabindex="-1"`. Arrow keys move focus and update tabindex values. This ensures a single Tab stop for the tree widget.

### 6.3 ARIA Attributes

| Element | Attribute | Value |
|---------|-----------|-------|
| `ul.treeview-list` | `role="tree"` | Tree container |
| `ul.treeview-list` | `aria-label` | Descriptive label (from container's `aria-label` or toolbar context) |
| `ul.treeview-list` | `aria-multiselectable` | `"true"` if selectionMode is `"multi"`, omitted otherwise |
| `li.treeview-node` | `role="treeitem"` | Each tree node |
| `li.treeview-node` | `aria-level` | Nesting depth (1 for roots, 2 for their children, etc.) |
| `li.treeview-node` | `aria-expanded` | `"true"` or `"false"` for parent nodes; omitted for leaves |
| `li.treeview-node` | `aria-selected` | `"true"` or `"false"` when selectionMode is not `"none"` |
| `li.treeview-node` | `aria-disabled` | `"true"` for disabled nodes |
| `li.treeview-node` | `aria-setsize` | Number of siblings at this level |
| `li.treeview-node` | `aria-posinset` | Position within siblings (1-based) |
| `ul.treeview-children` | `role="group"` | Child container |
| `button.treeview-node-toggle` | `aria-label` | "Expand" or "Collapse" |
| `button.treeview-node-toggle` | `tabindex` | `"-1"` (not independently focusable) |
| `input.treeview-search-input` | `role="searchbox"` | Search input |
| `input.treeview-search-input` | `aria-label` | "Search tree" |
| `div.treeview-context-menu` | `role="menu"` | Context menu container |
| `button.treeview-context-item` | `role="menuitem"` | Context menu item |
| `div.treeview-context-separator` | `role="separator"` | Context menu separator |
| `div.treeview-toolbar` | `role="toolbar"` | Toolbar container |
| `div.treeview-toolbar` | `aria-label` | "Tree actions" |

### 6.4 Screen Reader Announcements

- When a node is expanded or collapsed, the `aria-expanded` attribute change is sufficient for screen reader announcement.
- When lazy children finish loading, a visually hidden live region (`aria-live="polite"`) announces "N items loaded" (e.g., "5 items loaded").
- When search results update, the live region announces "N results found" or "No results found".
- When a node is renamed, the live region announces "Renamed to [new label]".
- When drag and drop completes, the live region announces "Moved [label] to [target label]".

### 6.5 Focus Management

- After expand: focus stays on the expanded node.
- After collapse: focus stays on the collapsed node.
- After delete: focus moves to the next sibling, or the parent if no siblings remain.
- After rename: focus returns to the renamed node.
- After context menu close: focus returns to the node the menu was opened on.
- After search clear: focus moves to the search input.
- After drag-drop: focus moves to the dropped node in its new location.

---

## 7. Styling

### 7.1 CSS Classes

| Class | Description |
|-------|-------------|
| `.treeview` | Root container |
| `.treeview-toolbar` | Toolbar container above the tree list |
| `.treeview-toolbar-btn` | Toolbar action button |
| `.treeview-search` | Search input wrapper |
| `.treeview-search-input` | Search text input |
| `.treeview-search-clear` | Search clear (×) button |
| `.treeview-list-container` | Scrollable wrapper around the tree list |
| `.treeview-list` | Root `<ul>` element |
| `.treeview-node` | Node `<li>` element |
| `.treeview-node-row` | Clickable row within a node |
| `.treeview-node-row-selected` | Selected state on node row |
| `.treeview-node-row-focused` | Keyboard-focused state on node row |
| `.treeview-node-row-disabled` | Disabled state on node row |
| `.treeview-node-row-dragging` | State applied during drag |
| `.treeview-node-row-drop-target` | State when node is a valid drop target |
| `.treeview-node-indent` | Indentation spacer |
| `.treeview-node-toggle` | Expand/collapse chevron button |
| `.treeview-node-toggle-expanded` | Rotated chevron state |
| `.treeview-node-icon` | Node icon element |
| `.treeview-node-label` | Node label text |
| `.treeview-node-badges` | Badges container |
| `.treeview-badge` | Individual badge pill |
| `.treeview-node-star` | Star toggle icon |
| `.treeview-node-star-active` | Filled star state |
| `.treeview-node-actions` | Hover-visible action buttons container |
| `.treeview-children` | Nested `<ul>` for children |
| `.treeview-empty` | Empty state message |
| `.treeview-loading` | Loading spinner wrapper |
| `.treeview-rename-input` | Inline rename text input |
| `.treeview-highlight` | `<mark>` element for search match highlighting |
| `.treeview-context-menu` | Context menu container |
| `.treeview-context-item` | Context menu button |
| `.treeview-context-item-disabled` | Disabled context menu item |
| `.treeview-context-item-icon` | Icon within context menu item |
| `.treeview-context-item-label` | Label within context menu item |
| `.treeview-context-item-shortcut` | Shortcut hint within context menu item |
| `.treeview-context-separator` | Context menu separator line |
| `.treeview-drop-before` | Drop indicator line above a node |
| `.treeview-drop-after` | Drop indicator line below a node |
| `.treeview-drop-inside` | Drop highlight on a droppable parent |
| `.treeview-starred-group` | Virtual starred section container |
| `.treeview-starred-header` | Starred section header row |
| `.treeview-starred-item` | Starred reference node |

### 7.2 Theme Integration

| Property | Value | Source / Rationale |
|----------|-------|---------------------|
| Background | `$white` | Clean, content-forward tree background |
| Node row height | 28px | Compact enterprise density |
| Node row hover | `$gray-100` background | Subtle highlight |
| Node row selected | `$blue-50` background, `$blue-700` left border (2px) | Clear selection indicator |
| Node row focused | `1px dotted $gray-500` outline | Keyboard focus ring |
| Node row disabled | `$gray-400` text, 0.6 opacity | Standard disabled pattern |
| Toggle chevron | `$gray-500` colour, 14px | Subtle but visible |
| Toggle chevron hover | `$gray-700` colour | Hover emphasis |
| Node icon | 16px, inherits node type colour or `$gray-600` | Consistent iconography |
| Node label | `$font-size-sm` (0.8rem), `$gray-900` | Readable at compact size |
| Badge pill | `$font-size-xs` (0.7rem), Bootstrap variant backgrounds | Compact status indicator |
| Star icon (inactive) | `$gray-400`, `bi-star` | Subtle when not starred |
| Star icon (active) | `$warning` (`#ffc107`), `bi-star-fill` | Prominent when starred |
| Hover actions | `$gray-500` icons, visible only on row hover | Clean, non-cluttered |
| Indent guide | 1px dotted `$gray-200` vertical line per level | Optional visual hierarchy aid |
| Toolbar background | `$gray-50` | Lighter than tree background |
| Toolbar border | `1px solid $gray-200` bottom border | Subtle separation |
| Search input | Standard `form-control-sm` styling | Bootstrap-consistent |
| Context menu background | `$white` | Standard dropdown pattern |
| Context menu border | `1px solid $gray-300` | Matches Bootstrap dropdown |
| Context menu shadow | `0 2px 8px rgba(0,0,0,0.15)` | Elevation indicator |
| Context menu item hover | `$gray-100` background | Matches Bootstrap dropdown |
| Context menu separator | `1px solid $gray-200` | Light divider |
| Drop indicator line | `2px solid $blue-600` | Clear drop target |
| Drop inside highlight | `1px solid $blue-400` outline | Parent drop target |
| Inline rename input | `form-control-sm`, `$blue-200` border | Editing state |
| Search highlight `<mark>` | `$yellow-100` background | Standard mark styling |
| Empty message | `$gray-500`, `$font-size-sm`, italic | Subtle empty state |
| Starred header | `$gray-600`, `$font-size-xs`, uppercase, letter-spacing | Section divider |
| Loading spinner | `spinner-border-sm`, `$gray-500` | Bootstrap standard |

### 7.3 Dimensions

| Property | Value |
|----------|-------|
| Default indent per level | 20px |
| Node row padding | `2px 8px` |
| Toggle chevron width | 20px |
| Icon width | 20px |
| Minimum tree height | 100px |
| Context menu min width | 160px |
| Context menu max width | 280px |
| Context menu item padding | `6px 12px` |
| Badge margin-left | 4px |
| Star icon width | 20px |
| Toolbar height | 32px |
| Search input height | 26px |

### 7.4 Z-Index

| Element | Z-Index | Rationale |
|---------|---------|-----------|
| Tree container | Auto (flow) | Normal stacking context |
| Context menu | 1050 | Above tree content, above Bootstrap dropdowns (1000) |
| Drag ghost | 1051 | Above context menu during drag |
| Inline rename input | Auto | Within node row flow |
| Loading spinner | Auto | Within node row flow |

### 7.5 Transitions and Animations

| Property | Duration | Easing | Description |
|----------|----------|--------|-------------|
| Node row background (hover/select) | 150ms | ease | Smooth colour transition |
| Chevron rotation | 200ms | ease | Expand/collapse toggle |
| Children `max-height` | 200ms | ease-out | Expand/collapse reveal |
| Context menu opacity | 100ms | ease-in | Fade-in on open |
| Drop indicator | 100ms | ease | Position indicator appearance |
| Search highlight | 150ms | ease | Mark highlight appearance |
| Star icon colour | 150ms | ease | Star toggle transition |

---

## 8. DOM Structure

### 8.1 Full Tree

```html
<div class="treeview" id="explorer-tree">

    <!-- Toolbar -->
    <div class="treeview-toolbar" role="toolbar" aria-label="Tree actions">
        <button class="treeview-toolbar-btn" type="button"
                data-action-id="expand-all"
                aria-label="Expand all" tabindex="0">
            <i class="bi bi-arrows-expand"></i>
        </button>
        <button class="treeview-toolbar-btn" type="button"
                data-action-id="collapse-all"
                aria-label="Collapse all" tabindex="-1">
            <i class="bi bi-arrows-collapse"></i>
        </button>
        <button class="treeview-toolbar-btn" type="button"
                data-action-id="refresh"
                aria-label="Refresh" tabindex="-1">
            <i class="bi bi-arrow-clockwise"></i>
        </button>
        <div class="treeview-search">
            <input class="treeview-search-input form-control form-control-sm"
                   type="text" role="searchbox"
                   aria-label="Search tree"
                   placeholder="Search...">
            <button class="treeview-search-clear" type="button"
                    aria-label="Clear search" tabindex="-1"
                    style="display: none;">
                <i class="bi bi-x"></i>
            </button>
        </div>
    </div>

    <!-- Tree list container (scrollable) -->
    <div class="treeview-list-container">

        <!-- Starred group (virtual) -->
        <div class="treeview-starred-group">
            <div class="treeview-starred-header">
                <i class="bi bi-star-fill"></i>
                <span>Starred</span>
            </div>
            <ul class="treeview-list" role="group">
                <li class="treeview-starred-item treeview-node" role="treeitem"
                    aria-level="1" data-node-id="ref-diagram-1">
                    <div class="treeview-node-row">
                        <span class="treeview-node-icon">
                            <i class="bi bi-diagram-3"></i>
                        </span>
                        <span class="treeview-node-label">System Overview</span>
                    </div>
                </li>
            </ul>
        </div>

        <!-- Main tree -->
        <ul class="treeview-list" role="tree" aria-label="Explorer"
            aria-multiselectable="true">

            <!-- Root node (expanded parent) -->
            <li class="treeview-node" role="treeitem"
                aria-level="1" aria-expanded="true"
                aria-selected="false" aria-setsize="2" aria-posinset="1"
                data-node-id="eng-division" tabindex="0">
                <div class="treeview-node-row">
                    <span class="treeview-node-indent"></span>
                    <button class="treeview-node-toggle treeview-node-toggle-expanded"
                            type="button" tabindex="-1" aria-label="Collapse">
                        <i class="bi bi-chevron-right"></i>
                    </button>
                    <span class="treeview-node-icon">
                        <i class="bi bi-folder-fill"></i>
                    </span>
                    <span class="treeview-node-label">Engineering Division</span>
                    <span class="treeview-node-badges">
                        <span class="treeview-badge badge bg-info"
                              title="12 items">12</span>
                    </span>
                    <span class="treeview-node-star" role="button"
                          aria-label="Star" tabindex="-1">
                        <i class="bi bi-star"></i>
                    </span>
                    <span class="treeview-node-actions">
                        <button type="button" tabindex="-1"
                                aria-label="New folder">
                            <i class="bi bi-folder-plus"></i>
                        </button>
                    </span>
                </div>

                <!-- Children group -->
                <ul class="treeview-children" role="group">
                    <!-- Nested child (leaf) -->
                    <li class="treeview-node" role="treeitem"
                        aria-level="2" aria-selected="true"
                        aria-setsize="3" aria-posinset="1"
                        data-node-id="diagram-1" tabindex="-1">
                        <div class="treeview-node-row treeview-node-row-selected">
                            <span class="treeview-node-indent"
                                  style="width: 20px;"></span>
                            <span class="treeview-node-icon">
                                <i class="bi bi-diagram-3"></i>
                            </span>
                            <span class="treeview-node-label">System Overview</span>
                            <span class="treeview-node-star treeview-node-star-active"
                                  role="button" aria-label="Unstar" tabindex="-1">
                                <i class="bi bi-star-fill"></i>
                            </span>
                        </div>
                    </li>

                    <!-- Lazy node (not yet loaded) -->
                    <li class="treeview-node" role="treeitem"
                        aria-level="2" aria-expanded="false"
                        aria-selected="false"
                        aria-setsize="3" aria-posinset="2"
                        data-node-id="platform-team" tabindex="-1">
                        <div class="treeview-node-row">
                            <span class="treeview-node-indent"
                                  style="width: 20px;"></span>
                            <button class="treeview-node-toggle"
                                    type="button" tabindex="-1"
                                    aria-label="Expand">
                                <i class="bi bi-chevron-right"></i>
                            </button>
                            <span class="treeview-node-icon">
                                <i class="bi bi-folder"></i>
                            </span>
                            <span class="treeview-node-label">Platform Team</span>
                        </div>
                        <!-- No ul.treeview-children yet — will be created on expand -->
                    </li>

                    <!-- Disabled leaf -->
                    <li class="treeview-node" role="treeitem"
                        aria-level="2" aria-selected="false"
                        aria-disabled="true"
                        aria-setsize="3" aria-posinset="3"
                        data-node-id="archived-doc" tabindex="-1">
                        <div class="treeview-node-row treeview-node-row-disabled">
                            <span class="treeview-node-indent"
                                  style="width: 20px;"></span>
                            <span class="treeview-node-icon">
                                <i class="bi bi-file-earmark"></i>
                            </span>
                            <span class="treeview-node-label">Archived Doc</span>
                        </div>
                    </li>
                </ul>
            </li>

            <!-- Second root (collapsed) -->
            <li class="treeview-node" role="treeitem"
                aria-level="1" aria-expanded="false"
                aria-selected="false" aria-setsize="2" aria-posinset="2"
                data-node-id="product-division" tabindex="-1">
                <div class="treeview-node-row">
                    <span class="treeview-node-indent"></span>
                    <button class="treeview-node-toggle"
                            type="button" tabindex="-1" aria-label="Expand">
                        <i class="bi bi-chevron-right"></i>
                    </button>
                    <span class="treeview-node-icon">
                        <i class="bi bi-folder-fill"></i>
                    </span>
                    <span class="treeview-node-label">Product Division</span>
                </div>
            </li>
        </ul>

        <!-- Empty state (hidden when tree has nodes) -->
        <div class="treeview-empty" style="display: none;">
            No items to display
        </div>
    </div>

    <!-- Context menu (hidden, absolutely positioned) -->
    <div class="treeview-context-menu" role="menu" style="display: none;">
        <button class="treeview-context-item" role="menuitem"
                data-action-id="open" tabindex="0">
            <span class="treeview-context-item-icon">
                <i class="bi bi-box-arrow-up-right"></i>
            </span>
            <span class="treeview-context-item-label">Open</span>
            <span class="treeview-context-item-shortcut">Enter</span>
        </button>
        <button class="treeview-context-item" role="menuitem"
                data-action-id="rename" tabindex="-1">
            <span class="treeview-context-item-icon">
                <i class="bi bi-pencil"></i>
            </span>
            <span class="treeview-context-item-label">Rename</span>
            <span class="treeview-context-item-shortcut">F2</span>
        </button>
        <div class="treeview-context-separator" role="separator"></div>
        <button class="treeview-context-item" role="menuitem"
                data-action-id="delete" tabindex="-1">
            <span class="treeview-context-item-icon">
                <i class="bi bi-trash"></i>
            </span>
            <span class="treeview-context-item-label">Delete</span>
            <span class="treeview-context-item-shortcut">Del</span>
        </button>
    </div>

    <!-- Screen reader live region -->
    <div class="visually-hidden" aria-live="polite" aria-atomic="true"></div>
</div>
```

### 8.2 Inline Rename State

```html
<!-- Normal label replaced by input during rename -->
<div class="treeview-node-row treeview-node-row-selected">
    <span class="treeview-node-indent" style="width: 20px;"></span>
    <span class="treeview-node-icon">
        <i class="bi bi-diagram-3"></i>
    </span>
    <input class="treeview-rename-input form-control form-control-sm"
           type="text" value="System Overview"
           aria-label="Rename node">
</div>
```

### 8.3 Loading State (Lazy Expand)

```html
<div class="treeview-node-row">
    <span class="treeview-node-indent" style="width: 20px;"></span>
    <span class="treeview-loading">
        <span class="spinner-border spinner-border-sm" role="status">
            <span class="visually-hidden">Loading...</span>
        </span>
    </span>
    <span class="treeview-node-icon">
        <i class="bi bi-folder"></i>
    </span>
    <span class="treeview-node-label">Platform Team</span>
</div>
```

### 8.4 Drop Indicators

```html
<!-- "Before" drop indicator: horizontal line above the node -->
<div class="treeview-drop-before" aria-hidden="true"></div>

<!-- "After" drop indicator: horizontal line below the node -->
<div class="treeview-drop-after" aria-hidden="true"></div>

<!-- "Inside" drop indicator: outline on the target node row -->
<!-- Applied as a class on .treeview-node-row -->
<div class="treeview-node-row treeview-drop-inside">...</div>
```

---

## 9. Integration with Existing Components

### 9.1 Sidebar

The TreeView is designed to be rendered inside a Sidebar's content area (`sidebar.getContentElement()`). When used this way:

- Set `height: "100%"` and `width: "100%"` to fill the sidebar content.
- The tree's scroll container integrates with the sidebar's overflow.
- Sidebar resize triggers no special handling — the tree uses `100%` dimensions and reflows naturally.

### 9.2 ProgressModal

Bulk operations (e.g., moving 50 nodes, deleting a subtree) should use the ProgressModal component for user feedback. The TreeView does not invoke ProgressModal internally — this is the consumer's responsibility in their `onDrop`, `onContextMenuAction`, or other callbacks.

### 9.3 BannerBar and StatusBar

The TreeView does not interact directly with BannerBar or StatusBar. When embedded in a Sidebar, the Sidebar handles layout coordination with these components.

### 9.4 Toolbar Component

The TreeView has its own lightweight toolbar (section 5.10). For complex toolbars with regions, split buttons, or galleries, the consumer may use the standalone Toolbar component above the TreeView container instead of the built-in toolbar.

---

## 10. Edge Cases

| Scenario | Behaviour |
|----------|-----------|
| Empty roots array | Show `emptyMessage`. Toolbar and search remain functional. |
| Single root | Render normally — no special single-root mode. |
| Deeply nested tree (20+ levels) | Indentation continues linearly. Performance may degrade; consumer should use lazy loading for deep trees. |
| Node ID collision | Console warning logged. First node with the ID wins in lookups. |
| Circular parent-child references | Not detected automatically. Consumer must ensure data integrity. Build logs a warning if a cycle is detected during rendering (max depth guard of 100 levels). |
| Rapid expand/collapse during lazy load | Toggle is disabled while the promise is pending. Clicks are ignored. |
| Lazy load failure (promise reject) | Node reverts to collapsed. Console warning with `LOG_PREFIX`. Consumer may retry via `expandNode()`. |
| Rename to empty string | Treated as cancel. Original label is restored. |
| Rename to very long string | No truncation — the label wraps or the container scrolls. Consumer should validate length in `onRename`. |
| Context menu at viewport edge | Menu repositions to stay within viewport bounds. |
| Drag a node onto its own descendant | Automatically prevented. `onDragValidate` is not called; the drop is rejected by the component. |
| Drag a disabled node | Drag is not initiated on disabled nodes. |
| Multi-select drag | All selected nodes are dragged together. If any selected node is an ancestor of another, the descendant is excluded from the drag set. |
| External drop with no handler | If `onExternalDrop` is not configured, external drops are ignored (`dropEffect: "none"`). |
| Search with no results | `emptyMessage` (or "No matching items") is shown. Tree nodes are all hidden. |
| Search with lazy nodes | Lazy nodes that have not been loaded are not searched. Only loaded children are filtered. |
| Starred group with no starred items | Starred group header is hidden. |
| Sort mode "newest" / "oldest" with no timestamp | Nodes without sortable data in `node.data` sort to the end. |
| Destroy while context menu open | Context menu is removed. All event listeners are cleaned up. |
| Destroy while inline rename is active | Rename is cancelled. DOM is cleaned up. |
| Destroy while lazy load is pending | Promise result is ignored (guard flag prevents DOM updates after destroy). |
| Multiple TreeView instances in same container | Not supported — console error logged. Each TreeView requires a unique container. |
| Container element not found | Constructor throws with a descriptive error message. |
| `setRoots()` called during active search | Search is cleared. New roots are rendered without filter. |
| `addNode` to a collapsed lazy parent | Node is added to the data model. Children become non-lazy. On next expand, the added node is visible alongside any previously loaded children. |
| `removeNode` on a selected node | Node is deselected before removal. `onSelectionChange` fires. |
| `updateNode` with new `children` | Children are re-rendered. Expand state is preserved if node was already expanded. |

---

## 11. Performance Considerations

### 11.1 Node Index Maps — O(1) Lookups

- **`nodeMap: Map<string, TreeNode>`** — ID → node reference. Built via iterative stack-based DFS on `setRoots()` and constructor.
- **`parentMap: Map<string, string>`** — ID → parent ID ("" for roots). Enables O(1) parent lookup, O(depth) ancestor checks.
- Replaces all recursive `findNodeById()` and `findParent()` calls (20 call sites).
- Incrementally maintained by `insertIntoIndex()` / `removeFromIndex()`.

### 11.2 Cached Flat Visible Array — O(1) Navigation

- **`visibleNodes: VisibleEntry[]`** — cached flat array of `{ node, level, index }` for visible nodes.
- **`visibleIndexMap: Map<string, number>`** — node ID → index in the visible array.
- Lazy rebuild on `getVisibleNodes()` when `visibleDirty` flag is set.
- Invalidated on expand/collapse, search, sort, add/remove, `setRoots()`.
- Replaces 7 `flattenVisible()` call sites — keyboard navigation is now O(1) instead of O(V).

### 11.3 Virtual Scrolling — Constant DOM

- **Activation**: `virtualScrolling` option: `"auto"` (default, enables above 5000 visible), `"enabled"`, `"disabled"`.
- Renders only viewport + buffer rows (~200 DOM elements) using flat `<div>` structure.
- DOM element recycling pool avoids allocation during scroll.
- rAF-throttled scroll handler for smooth 60fps scrolling.
- Event delegation on viewport container (single click/dblclick listener).
- Explicit ARIA attributes (`aria-level`, `aria-setsize`, `aria-posinset`) on flat rows.
- Small trees (< 5K visible) continue using nested `<ul>/<li>` DOM.

### 11.4 Incremental DOM Updates

- `addNode()` builds a single `<li>` and inserts into the parent `<ul>` (non-virtual) or calls `renderVisibleWindow()` (virtual).
- `removeNode()` uses O(1) `parentMap` lookup instead of O(N) tree walk, then removes single `<li>`.
- Neither calls `refresh()` — no full DOM rebuild.

### 11.5 Three-Tier Search

| Tree size | Strategy | Main thread impact |
|-----------|----------|-------------------|
| < 5K nodes | Synchronous (existing `findMatchesAndAncestors`) | Negligible |
| >= 5K nodes, no `onSearchAsync` | Client-side chunked via rAF (5000 nodes/frame) | Non-blocking |
| >= threshold, `onSearchAsync` provided | Server-side async | Zero |

- Ancestor expansion uses `parentMap` (O(depth) per match) instead of O(N) tree walk.
- Stale result detection via `searchGeneration` counter.

### 11.6 Event Delegation

- Use a single `click` event listener on the tree list container, delegating to individual nodes via `event.target.closest(".treeview-node-row")`.
- Virtual mode: single delegated listener on viewport container using `.closest(".treeview-virtual-row")`.
- Use a single `contextmenu` event listener on the tree list container.
- Use a single `keydown` event listener on the tree list container.

### 11.7 Drag and Drop Performance

- Use `requestAnimationFrame` for updating drop indicator position during `dragover`.
- Throttle `dragover` processing to one update per animation frame.

### 11.8 Batch Operations

- `setRoots()` performs a single DOM rebuild and `rebuildNodeIndex()`.
- `expandAll()` and `collapseAll()` invalidate visible cache once, then rebuild.

---

## 12. Logging

All log statements use the pattern:

```typescript
const LOG_PREFIX = "[TreeView]";
```

| Level | When | Example |
|-------|------|---------|
| `console.log` | Component lifecycle events | `[TreeView] Initialised with 3 roots in container #explorer` |
| `console.log` | Significant user actions | `[TreeView] Node "Platform Team" expanded` |
| `console.warn` | Recoverable issues | `[TreeView] Lazy load failed for node "Platform Team": timeout` |
| `console.warn` | Data integrity issues | `[TreeView] Duplicate node ID "abc-123" detected` |
| `console.error` | Unrecoverable errors | `[TreeView] Container element #explorer not found` |
| `console.debug` | Verbose diagnostics (disabled by default) | `[TreeView] Search filter applied: 42 of 150 nodes visible` |

---

## 13. Testing Considerations

### 13.1 Unit Tests

| Area | Test Cases |
|------|------------|
| Rendering | Empty tree, single root, multiple roots, nested children, leaf nodes |
| Expand/collapse | Toggle chevron, keyboard Right/Left, `expandNode()`, `collapseNode()`, `expandAll()`, `collapseAll()` |
| Lazy loading | Successful load, failed load, loading spinner display, subsequent expands use cache |
| Selection (single) | Click selects, click another deselects first, `selectNode()`, `deselectAll()` |
| Selection (multi) | Click, Ctrl+Click toggle, Shift+Click range, Ctrl+A, `getSelectedNodes()` |
| Selection (none) | Click does not select, no `aria-selected` attributes |
| Activation | Double-click fires `onActivate`, Enter key fires `onActivate` |
| Starred | Star toggle fires `onStarToggle`, starred group renders, starred group hides when empty |
| Sort | Alpha-asc, alpha-desc, custom comparator, `setSort()` |
| Badges | Render badge pills, correct variant classes, tooltip rendering |
| Search | Substring match, case-insensitive, ancestor expansion, mark highlighting, clear, no results, custom predicate |
| Inline rename | F2 trigger, Enter commit, Escape cancel, empty string cancel, `onRename` validation |
| Context menu | Right-click open, keyboard open, item click, Escape close, click-outside close, disabled items |
| Drag and drop | Drag start, drop position detection, `onDragValidate`, `onDrop`, ancestor drop prevention, multi-drag |
| Cross-tree DnD | DataTransfer MIME type, source tree ID, drop on different instance |
| External drop | File drop, URL drop, `onExternalDrop` |
| API methods | `addNode`, `removeNode`, `updateNode`, `getNodeById`, `scrollToNode`, `refresh`, `setRoots`, `destroy` |
| Node types | Kind registry lookup, per-type icons, per-type context menus, per-type draggable/droppable/renamable |

### 13.2 Accessibility Tests

| Test | Expectation |
|------|-------------|
| `role="tree"` present | Root `<ul>` has correct role |
| `role="treeitem"` present | Each `<li>` node has correct role |
| `aria-level` set | Matches nesting depth |
| `aria-expanded` set | Present on parent nodes, correct value |
| `aria-selected` set | Present when selectionMode is not "none" |
| `aria-multiselectable` set | Present when selectionMode is "multi" |
| Roving tabindex | Only one node has `tabindex="0"` at a time |
| Keyboard navigation | All keys from section 6.1 work correctly |
| Screen reader announcements | Live region updates for load, search, rename, move |
| Focus management | Focus moves correctly after expand, collapse, delete, rename, menu close |

### 13.3 Visual Regression Tests

| Scenario | What to Capture |
|----------|-----------------|
| Default tree (3 levels) | Full tree with expanded and collapsed nodes |
| Selected node | Single node with selected styling |
| Multi-selection | Multiple non-contiguous selected nodes |
| Hover state | Node row with hover background |
| Search active | Filtered tree with mark highlighting |
| Context menu open | Menu positioned correctly with items |
| Inline rename | Node with active rename input |
| Drag in progress | Ghost element and drop indicator |
| Empty state | Tree with empty message |
| Starred group | Starred section with pinned items |
| Badges | Nodes with various badge variants |
| Disabled nodes | Nodes with disabled styling |
| Loading spinner | Node with lazy load spinner |

---

## 14. Files

| File | Purpose |
|------|---------|
| `specs/treeview.prd.md` | This specification |
| `components/treeview/treeview.ts` | TypeScript source |
| `components/treeview/treeview.scss` | Styles |
| `components/treeview/README.md` | Consumer documentation |

---

## 15. Implementation Notes

### 15.1 Node Element Map

Maintain a `Map<string, HTMLLIElement>` mapping node IDs to their DOM elements. This enables O(1) lookups for `getNodeById`, `scrollToNode`, `selectNode`, `expandNode`, and other ID-based API methods. The map is updated on every `addNode`, `removeNode`, and `refresh` call.

### 15.2 Selection State

Maintain a `Set<string>` of selected node IDs. This enables O(1) selection checks and efficient `getSelectedNodes()` (iterate set, look up each node). The set is updated on click, Ctrl+Click, Shift+Click, and programmatic selection methods.

For Shift+Click range selection in multi mode, maintain a reference to the last-clicked node (`lastClickedNodeId`). The range is determined by walking the visible (non-hidden, non-filtered) nodes in DOM order between the last-clicked and the Shift+Clicked node.

### 15.3 Expand/Collapse State

Maintain a `Set<string>` of expanded node IDs. This enables O(1) state checks and efficient state preservation across `refresh()` calls. When a node is expanded, its ID is added to the set. When collapsed, it is removed.

### 15.4 Search State Preservation

Before applying a search filter, snapshot the current expand/collapse state. When the search is cleared, restore the snapshot. This prevents the search's ancestor auto-expansion from permanently altering the user's manual expand/collapse choices.

### 15.5 Context Menu Lifecycle

1. On `contextmenu` event, prevent the browser's native context menu.
2. Build the menu items from the node's `TreeNodeTypeDescriptor.contextMenuItems`.
3. Position the menu at `(event.clientX, event.clientY)`. Adjust if the menu would overflow the viewport.
4. Register a one-time `pointerdown` listener on `document` to detect click-outside. Use `setTimeout(0)` to avoid the listener firing on the same click that opened the menu.
5. Register a one-time `keydown` listener for Escape.
6. On item click or Escape, remove the menu, deregister listeners, return focus to the tree node.

### 15.6 Drag and Drop Transfer Data

```typescript
// Set on dragstart
const transferData = JSON.stringify({
    treeId: this.instanceId,
    nodeIds: selectedNodeIds
});
event.dataTransfer.setData("application/x-treeview-nodes", transferData);
event.dataTransfer.effectAllowed = "move";
```

On `dragover`, read the MIME type to distinguish internal vs. external drops. On `drop`, parse the transfer data to retrieve source node IDs and source tree instance ID.

### 15.7 Sort Implementation

```typescript
function sortChildren(children: TreeNode[], mode: TreeSortMode,
    comparator?: (a: TreeNode, b: TreeNode) => number): TreeNode[]
{
    const sorted = [...children];
    switch (mode)
    {
        case "alpha-asc":
            sorted.sort((a, b) =>
            {
                const aParent = isParent(a) ? 0 : 1;
                const bParent = isParent(b) ? 0 : 1;
                if (aParent !== bParent) return aParent - bParent;
                return a.label.localeCompare(b.label, undefined,
                    { sensitivity: "base" });
            });
            break;
        case "alpha-desc":
            sorted.sort((a, b) =>
            {
                const aParent = isParent(a) ? 0 : 1;
                const bParent = isParent(b) ? 0 : 1;
                if (aParent !== bParent) return aParent - bParent;
                return b.label.localeCompare(a.label, undefined,
                    { sensitivity: "base" });
            });
            break;
        case "custom":
            if (comparator) sorted.sort(comparator);
            break;
        // newest, oldest use node.data timestamps
    }
    return sorted;
}
```

### 15.8 Mark Highlighting Implementation

```typescript
function highlightLabel(labelElement: HTMLElement,
    searchText: string): void
{
    const text = labelElement.textContent || "";
    const lowerText = text.toLowerCase();
    const lowerSearch = searchText.toLowerCase();
    const index = lowerText.indexOf(lowerSearch);

    if (index === -1)
    {
        return;
    }

    const before = text.substring(0, index);
    const match = text.substring(index, index + searchText.length);
    const after = text.substring(index + searchText.length);

    labelElement.textContent = "";
    if (before) labelElement.appendChild(document.createTextNode(before));
    const mark = document.createElement("mark");
    mark.className = "treeview-highlight";
    mark.textContent = match;
    labelElement.appendChild(mark);
    if (after) labelElement.appendChild(document.createTextNode(after));
}
```

### 15.9 Pointer Events for Drag

Use `setPointerCapture` on `pointerdown` for the drag initiation threshold (5px movement before drag starts). Once the threshold is met, switch to the HTML5 Drag and Drop API by programmatically calling `element.dispatchEvent(new DragEvent("dragstart", ...))` or setting up `draggable="true"` and relying on the native drag events. This approach provides precise drag initiation control while leveraging the browser's native DnD for cross-window and cross-tree interop.

### 15.10 Defensive Destroy

The `destroy()` method must:

1. Set an internal `destroyed` flag.
2. Cancel any pending lazy-load promises (via the flag — promise callbacks check it before DOM updates).
3. Close any open context menu.
4. Cancel any active inline rename.
5. Remove all event listeners (click, contextmenu, keydown, dragstart, dragover, drop, pointerdown on document).
6. Clear the node element map, selection set, and expand set.
7. Remove all child DOM elements from the container.
8. Null internal references to prevent memory leaks.

---

## 16. Future Considerations (Out of Scope for v1)

These features are explicitly deferred:

- **Virtual scrolling** — for trees exceeding 10,000 nodes. Would render only visible nodes in the viewport.
- **Checkbox mode** — tri-state checkboxes (checked, unchecked, indeterminate) for bulk selection with parent-child propagation.
- **Column view** — Miller column layout as an alternative to the nested tree view.
- **Breadcrumb bar** — shows the path from root to the focused node.
- **Inline node creation** — creating new nodes directly in the tree (currently done via consumer UI).
- **Undo/redo** — undoing drag-drop moves or renames within the tree.
- **Keyboard DnD** — moving nodes via keyboard shortcuts (currently DnD is mouse/touch only).
- **Touch gestures** — long-press for context menu, swipe for actions on mobile devices.
- **Node decorations** — overlays on icons (e.g., source control status badges on file icons).
- **Asynchronous search** — server-side search with result integration into the tree.
