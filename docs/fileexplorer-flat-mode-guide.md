<!--
SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan
SPDX-License-Identifier: MIT
-->

<!-- AGENT: Integration guide for FileExplorer flat mode. Audience: apps team developers consuming the CDN component library. -->

# FileExplorer Flat Mode -- Apps Team Integration Guide

## Table of Contents

1. [Overview](#1-overview)
2. [Quick Start](#2-quick-start)
3. [Mapping Domain Objects](#3-mapping-domain-objects)
4. [Breadcrumb Management](#4-breadcrumb-management)
5. [Custom Columns](#5-custom-columns)
6. [Grouping](#6-grouping)
7. [Loading and Empty States](#7-loading-and-empty-states)
8. [Selection API](#8-selection-api)
9. [Context Menu](#9-context-menu)
10. [Drag and Drop](#10-drag-and-drop)
11. [CSS Theming](#11-css-theming)
12. [Full API Reference](#12-full-api-reference)

---

## 1. Overview

FileExplorer now supports a **flat mode** where the host application provides items directly
via `setItems()` and `setBreadcrumb()` instead of relying on the built-in tree sidebar pane.
In flat mode the component acts as a pure presentation layer: your app fetches data, maps it
to `FileNode[]`, and pushes it into the explorer. Navigation, breadcrumb path, loading
states, and context actions are all driven by callbacks you supply.

This eliminates the need for a separate tree-view component or a pre-built folder hierarchy.
The host app owns the data lifecycle; the component owns the rendering.

**When to use flat mode:**

- Your data comes from a REST API and you load children on demand.
- You already have your own navigation (sidebar, search results, filters) and just need
  a file listing panel.
- You want full control over breadcrumb segments (e.g., from API ancestor chains).

**What changes from tree mode:**

| Concern | Tree mode (default) | Flat mode |
|---------|---------------------|-----------|
| Data source | `roots: FileNode[]` with nested `children` | `items: FileNode[]` (flat array) |
| Navigation | Built-in tree sidebar drives folder navigation | Host calls `setItems()` + `setBreadcrumb()` |
| Tree pane | Visible (`showTreePane: true`) | Hidden (`showTreePane: false`) |
| Breadcrumb | Auto-computed from folder hierarchy | Host provides `BreadcrumbSegment[]` |
| Folder open | Internal navigate | `onOpen` callback, host fetches new items |

---

## 2. Quick Start

Include the CSS and JS from the CDN, then call `createFileExplorer` with `showTreePane: false`
and supply `items` plus `breadcrumb`.

```html
<link rel="stylesheet" href="components/fileexplorer/fileexplorer.css">
<script src="components/fileexplorer/fileexplorer.js"></script>
```

```javascript
var explorer = createFileExplorer(document.getElementById("panel"), {
    showTreePane: false,
    showBreadcrumbs: true,
    viewMode: "detail",
    items: [
        { id: "t1", name: "Engineering", type: "folder", icon: "bi bi-people-fill", typeLabel: "Team" },
        { id: "d1", name: "Architecture.diagram", type: "file", icon: "bi bi-diagram-3", typeLabel: "Diagram" },
        { id: "c1", name: "Sprint Backlog", type: "file", icon: "bi bi-check2-square", typeLabel: "Checklist" }
    ],
    breadcrumb: [
        { id: null, label: "Home" },
        { id: "org1", label: "My Org" }
    ],
    onBreadcrumbNavigate: function(segmentId) {
        loadFolder(segmentId);
    },
    onOpen: function(node) {
        if (node.type === "folder") {
            loadFolder(node.id);
        } else {
            openResource(node);
        }
    }
});

function loadFolder(folderId) {
    explorer.showLoading();
    fetch("/api/folders/" + (folderId || "root") + "/children")
        .then(function(r) { return r.json(); })
        .then(function(data) {
            explorer.setItems(data.children.map(toFileNode));
            explorer.setBreadcrumb(toBreadcrumb(data.ancestors));
        });
}
```

**Key points:**

- `showTreePane: false` hides the sidebar. The full width is used for the content listing.
- `items` sets the initial visible items (no nested `children` needed).
- `breadcrumb` sets the initial path displayed in the breadcrumb bar.
- `onBreadcrumbNavigate` fires when the user clicks a breadcrumb segment.
- `onOpen` fires on double-click or Enter. For folders, load the new folder contents.

---

## 3. Mapping Domain Objects

Your API will return domain-specific objects (e.g., `ExplorerNode`, `Resource`, `Asset`).
Map them to `FileNode` before passing to the component. This keeps the component
data-agnostic and your mapping logic in one place.

```javascript
/**
 * Map an ExplorerNode from the API to a FileNode for FileExplorer.
 */
function toFileNode(node) {
    var isContainer = node.nodeType === "ORG_UNIT"
        || node.nodeType === "FOLDER"
        || node.nodeType === "TEAM";

    return {
        id:        node.id,
        name:      node.name,
        type:      isContainer ? "folder" : "file",
        icon:      TYPE_ICONS[node.resourceType || node.nodeType] || "bi bi-file-earmark",
        iconColor: TYPE_COLORS[node.resourceType || node.nodeType] || "#64748b",
        typeLabel: TYPE_LABELS[node.resourceType || node.nodeType] || node.nodeType,
        modified:  node.updatedAt ? new Date(node.updatedAt) : undefined,
        owner:     node.createdBy,
        size:      node.sizeBytes,
        readOnly:  node.permissions && !node.permissions.canEdit,
        isSystem:  node.isSystem || false,
        data: {
            resourceType: node.resourceType,
            sourceId:     node.sourceId,
            nodeType:     node.nodeType
        }
    };
}
```

### FileNode field reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Unique identifier. Must be stable across refreshes. |
| `name` | `string` | Yes | Display name shown in all view modes. |
| `type` | `"file" \| "folder"` | Yes | Determines icon default, sort grouping, and open behavior. |
| `icon` | `string` | No | Bootstrap Icons class (e.g., `"bi bi-diagram-3"`). Auto-detected from extension if omitted. |
| `iconColor` | `string` | No | CSS color value applied to the icon element. |
| `typeLabel` | `string` | No | Human-readable type label (e.g., `"Diagram"`, `"Checklist"`). Shown in the Type column and used for grouping. |
| `modified` | `Date` | No | Last modified date. Shown in the Modified column. Accepts a `Date` object or ISO string. |
| `owner` | `string` | No | Display name of the item owner. Available for custom column rendering. |
| `size` | `number` | No | Size in bytes. Auto-formatted to KB/MB/GB in the Size column. |
| `readOnly` | `boolean` | No | When `true`, inline rename and delete are blocked for this item. |
| `isSystem` | `boolean` | No | When `true`, most context menu actions are suppressed for this item. |
| `data` | `Record<string, unknown>` | No | Arbitrary metadata carried through callbacks. The component never reads this field. |

**Tip:** Store the original domain object or its key identifiers in `data` so your
callbacks can look up the full object without a second map.

---

## 4. Breadcrumb Management

In flat mode, the host application is responsible for building and updating the breadcrumb
path. The component renders the segments and fires a callback when the user clicks one.

### 4.1 Building BreadcrumbSegment[] from API ancestors

Most folder APIs return an `ancestors` array ordered from root to current folder.
Map each ancestor to a `BreadcrumbSegment`:

```javascript
function toBreadcrumb(ancestors, currentNode) {
    var segments = [{ id: null, label: "Home" }];

    for (var i = 0; i < ancestors.length; i++) {
        segments.push({
            id:    ancestors[i].id,
            label: ancestors[i].name
        });
    }

    if (currentNode) {
        segments.push({
            id:    currentNode.id,
            label: currentNode.name
        });
    }

    return segments;
}
```

### 4.2 Updating the breadcrumb

Call `setBreadcrumb()` whenever the displayed folder changes:

```javascript
explorer.setBreadcrumb(toBreadcrumb(response.ancestors, response.node));
```

The component re-renders the breadcrumb bar immediately. The last segment is shown as
plain text (current location); all preceding segments are clickable links.

### 4.3 Handling breadcrumb clicks

When the user clicks a breadcrumb segment, `onBreadcrumbNavigate` fires with the
segment's `id`. A `null` id means the user clicked the root segment.

```javascript
onBreadcrumbNavigate: function(segmentId) {
    // segmentId is null for root, or the folder ID for other segments
    loadFolder(segmentId);
}
```

### 4.4 Backspace navigation

When the user presses **Backspace** while the listing has focus, the component fires
`onBreadcrumbNavigate` with the parent segment's `id` (the second-to-last segment).
If the breadcrumb has only one segment (root), the callback receives `null`.

---

## 5. Custom Columns

The detail view ships with four default columns: **Name**, **Modified**, **Size**, and
**Type**. You can replace or extend these by providing a `columns` array in the options.

### 5.1 FileExplorerColumn definition

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | `string` | -- | Column identifier, used in sort callbacks. |
| `label` | `string` | -- | Column header text. |
| `width` | `string` | flex | Fixed CSS width (e.g., `"120px"`). Omit for a flex column. |
| `sortable` | `boolean` | `true` | Whether clicking the header sorts by this column. |
| `render` | `(node: FileNode) => string \| HTMLElement` | -- | Custom cell renderer. Return a string for text content, or an `HTMLElement` for rich content. |

### 5.2 Adding an Owner column

```javascript
var explorer = createFileExplorer(document.getElementById("panel"), {
    showTreePane: false,
    viewMode: "detail",
    columns: [
        { id: "name",     label: "Name",     sortable: true },
        { id: "type",     label: "Type",     width: "100px", sortable: true },
        { id: "owner",    label: "Owner",    width: "140px", sortable: false,
          render: function(node) {
              return node.owner || "--";
          }
        },
        { id: "modified", label: "Modified", width: "150px", sortable: true },
        { id: "size",     label: "Size",     width: "80px",  sortable: true }
    ],
    items: myItems,
    breadcrumb: myBreadcrumb
});
```

### 5.3 Rich cell rendering

The `render` function can return an `HTMLElement` for richer content:

```javascript
{
    id: "status",
    label: "Status",
    width: "100px",
    sortable: false,
    render: function(node) {
        var badge = document.createElement("span");
        badge.className = "badge bg-success";
        badge.textContent = node.data && node.data.status
            ? node.data.status : "Active";
        return badge;
    }
}
```

**Note:** The `Name` column has built-in rendering (icon + name + inline rename support).
When you include a column with `id: "name"`, the component uses its internal renderer
regardless of any `render` function you supply. The same applies to `modified`, `size`,
and `type` columns when no `render` is provided -- they use built-in formatters.

---

## 6. Grouping

Grouping controls how items are visually separated in the listing. Group headers appear
as labeled divider rows (detail/list view) or labeled sections (grid view).

### 6.1 Type-first grouping (default)

```javascript
groupBy: "type-first"
```

Items are split into two top-level groups:

1. **Folders and Teams** -- all items with `type: "folder"`, sorted by name.
2. **Files by typeLabel** -- file items grouped by their `typeLabel` value
   (e.g., "Diagrams (3)", "Checklists (2)"), each group sorted by the current
   sort field.

This mirrors the Windows Explorer pattern where folders always appear above files.

### 6.2 No grouping

```javascript
groupBy: "none"
```

All items appear in a single flat list, sorted by the current sort field and direction.
Folders still sort before files within the same sort key.

### 6.3 Custom grouping function

For full control, pass a function that receives the sorted items array and returns
an array of `{ label: string; items: FileNode[] }` groups:

```javascript
groupBy: function(sortedItems) {
    var starred = [];
    var rest = [];
    for (var i = 0; i < sortedItems.length; i++) {
        if (sortedItems[i].data && sortedItems[i].data.starred) {
            starred.push(sortedItems[i]);
        } else {
            rest.push(sortedItems[i]);
        }
    }

    var groups = [];
    if (starred.length > 0) {
        groups.push({ label: "Starred (" + starred.length + ")", items: starred });
    }
    groups.push({ label: "All Items (" + rest.length + ")", items: rest });
    return groups;
}
```

The component renders each group with a visual header label. Empty groups are skipped.

---

## 7. Loading and Empty States

### 7.1 Loading state

Call `showLoading()` before initiating a data fetch. The component clears the listing
and renders skeleton placeholder rows (detail/list view) or skeleton cards (grid view)
matching the current view mode.

```javascript
explorer.showLoading();
```

Skeleton count: 5 rows in detail/list mode, 6 cards in grid mode.

### 7.2 Empty state

Call `showEmpty()` when a folder has no children. You can pass an optional configuration
object to customize the icon, title, and description:

```javascript
explorer.showEmpty({
    icon: "bi bi-inbox",
    title: "No items here",
    description: "This folder is empty. Create a new item to get started."
});
```

If no config is provided, the component falls back to the `emptyState` defaults set
in the constructor options.

### 7.3 Default empty state via options

Set defaults once at initialization so every empty folder shows a consistent message:

```javascript
var explorer = createFileExplorer(container, {
    showTreePane: false,
    emptyState: {
        icon: "bi bi-compass",
        title: "Nothing to see here",
        description: "Select a folder from the sidebar or use search."
    },
    // ...
});
```

### 7.4 Recommended lifecycle

The standard pattern for loading folder contents:

```javascript
function loadFolder(folderId) {
    // 1. Show skeleton loading state
    explorer.showLoading();

    // 2. Fetch data from your API
    fetchFolderContents(folderId)
        .then(function(response) {
            var items = response.children.map(toFileNode);

            if (items.length === 0) {
                // 3a. No items -- show empty state
                explorer.showEmpty();
            } else {
                // 3b. Items received -- push into explorer
                explorer.setItems(items);
            }

            // 4. Update breadcrumb path
            explorer.setBreadcrumb(toBreadcrumb(response.ancestors));
        })
        .catch(function(err) {
            // 5. Error -- show error empty state
            explorer.showEmpty({
                icon: "bi bi-exclamation-triangle",
                title: "Failed to load",
                description: err.message || "An unexpected error occurred."
            });
        });
}
```

---

## 8. Selection API

FileExplorer provides programmatic selection control in addition to user click/keyboard
interactions. All selection methods fire the `onSelectionChange` callback after updating
internal state.

### 8.1 Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `selectItem` | `selectItem(id: string): void` | Select a single item by ID. Clears previous selection. |
| `selectItems` | `selectItems(ids: string[]): void` | Select multiple items by ID. Clears previous selection. |
| `deselectAll` | `deselectAll(): void` | Clear all selection. |
| `getSelectedIds` | `getSelectedIds(): string[]` | Return an array of currently selected item IDs. |
| `getSelectedFiles` | `getSelectedFiles(): FileNode[]` | Return the full `FileNode` objects for all selected items. |

### 8.2 Selection callback

```javascript
var explorer = createFileExplorer(container, {
    showTreePane: false,
    multiSelect: true,
    onSelectionChange: function(nodes) {
        console.log("Selected:", nodes.length, "items");
        updatePropertiesPanel(nodes);
        updateToolbarState(nodes);
    },
    onSelect: function(nodes) {
        // Also fires on single click selection
        console.log("Clicked:", nodes.map(function(n) { return n.name; }));
    }
});
```

### 8.3 Programmatic selection

```javascript
// Select a specific item after loading
explorer.setItems(items);
explorer.selectItem(items[0].id);

// Select multiple items
explorer.selectItems(["id-1", "id-2", "id-3"]);

// Read back the selection
var ids = explorer.getSelectedIds();
var files = explorer.getSelectedFiles();

// Clear selection
explorer.deselectAll();
```

### 8.4 Multi-select mode

Set `multiSelect: true` (or `selectable: "multi"`) to enable Ctrl+click and Shift+click
range selection. When multi-select is enabled, Ctrl+A selects all visible items.

---

## 9. Context Menu

FileExplorer integrates with the CDN ContextMenu component to show right-click actions
on items.

### 9.1 Static menu items

Provide a fixed array of `FileContextMenuItem` objects:

```javascript
contextMenuItems: [
    { id: "open",      label: "Open",      icon: "bi bi-box-arrow-up-right",
      action: function(files) { openResource(files[0]); } },
    { id: "rename",    label: "Rename",     icon: "bi bi-pencil-square",   shortcut: "F2",
      action: function(files) { explorer.startRenamePublic(files[0].id); } },
    { id: "duplicate", label: "Duplicate",  icon: "bi bi-files",
      action: function(files) { duplicateItems(files); }, separatorAfter: true },
    { id: "delete",    label: "Delete",     icon: "bi bi-trash",           shortcut: "Del",
      action: function(files) { deleteItems(files); } }
]
```

### 9.2 Dynamic menu items

Provide a function that receives the right-clicked node (or `null` for background clicks)
and returns the menu items array. This lets you conditionally show, hide, or disable
actions based on the node:

```javascript
contextMenuItems: function(node) {
    var items = [
        { id: "open", label: "Open", icon: "bi bi-box-arrow-up-right",
          action: function(files) { openResource(files[0]); } }
    ];

    // Only show rename for editable items
    if (node && !node.readOnly && !node.isSystem) {
        items.push({
            id: "rename", label: "Rename", icon: "bi bi-pencil-square",
            action: function(files) { explorer.startRenamePublic(files[0].id); }
        });
    }

    // Disable delete for system items
    items.push({
        id: "delete", label: "Delete", icon: "bi bi-trash",
        disabled: node ? (node.readOnly || node.isSystem) : true,
        separatorAfter: false,
        action: function(files) { deleteItems(files); }
    });

    // Background context menu (no node)
    if (!node) {
        items = [
            { id: "new-folder", label: "New Folder", icon: "bi bi-folder-plus",
              action: function() { createNewFolder(); } },
            { id: "paste", label: "Paste", icon: "bi bi-clipboard",
              disabled: !hasClipboard(),
              action: function() { pasteItems(); } }
        ];
    }

    return items;
}
```

### 9.3 Context menu action callback

As an alternative to inline `action` functions on each menu item, you can use the
`onContextMenuAction` callback:

```javascript
onContextMenuAction: function(actionId, node) {
    switch (actionId) {
        case "open":      openResource(node); break;
        case "rename":    explorer.startRenamePublic(node.id); break;
        case "duplicate": duplicateItem(node); break;
        case "delete":    deleteItem(node); break;
    }
}
```

### 9.4 readOnly and isSystem guards

The component does **not** automatically hide or disable menu items based on `readOnly`
or `isSystem` flags. Your dynamic `contextMenuItems` function is responsible for
checking these fields and setting `disabled: true` or omitting the item entirely.

The only built-in guard is on inline rename: the component will refuse to start rename
on items where `readOnly` or `isSystem` is `true`.

---

## 10. Drag and Drop

FileExplorer supports internal drag-and-drop (moving items between folders) and external
drops (e.g., file uploads from the desktop). Drag-and-drop is opt-in: items become
draggable only when at least one DnD callback is configured.

### 10.1 Callbacks

| Callback | Signature | Description |
|----------|-----------|-------------|
| `onDragStart` | `(nodes: FileNode[]) => void` | Fires when selected items start being dragged. |
| `onDrop` | `(target: FileNode, ids: string[]) => void` | Fires when internal items are dropped on a folder. `ids` contains the dragged item IDs. |
| `onExternalDrop` | `(target: FileNode, dataTransfer: DataTransfer) => void` | Fires when files from outside the browser (or another component) are dropped on a folder. |

### 10.2 Configuration

```javascript
var explorer = createFileExplorer(container, {
    showTreePane: false,
    items: myItems,
    onDragStart: function(nodes) {
        console.log("Dragging:", nodes.map(function(n) { return n.name; }));
    },
    onDrop: function(targetFolder, draggedIds) {
        moveItems(draggedIds, targetFolder.id).then(function() {
            loadFolder(currentFolderId);
        });
    },
    onExternalDrop: function(targetFolder, dataTransfer) {
        if (dataTransfer.files && dataTransfer.files.length > 0) {
            uploadFiles(targetFolder.id, dataTransfer.files);
        }
    }
});
```

### 10.3 Behavior details

- Items receive `draggable="true"` when any DnD callback is configured.
- During a drag, the component sets a custom MIME type (`application/x-fileexplorer`)
  containing a JSON array of the dragged item IDs.
- Folder items (and the content background) accept drops. A visual highlight
  class (`fileexplorer-drop-target`) is applied on `dragover` and removed on
  `dragleave` or `drop`.
- Self-drops are ignored: dropping an item onto itself is a no-op.
- If no internal drag data is found but `onExternalDrop` is configured, the
  component delegates to that callback with the raw `DataTransfer` object.

---

## 11. CSS Theming

FileExplorer exposes CSS custom properties on the `.fileexplorer` root element. Override
these on your own `.fileexplorer` selector or on a parent element to theme the component
without touching the source SCSS.

### 11.1 Custom properties reference

| Property | Default | Description |
|----------|---------|-------------|
| `--file-explorer-bg` | `var(--theme-surface-bg)` | Content area background color |
| `--file-explorer-border` | `var(--theme-border-subtle)` | Outer border color |
| `--file-explorer-font-size` | `$font-size-sm` | Base font size for item text |
| `--file-explorer-toolbar-bg` | `var(--theme-surface-raised-bg)` | Toolbar background color |
| `--file-explorer-toolbar-border` | `var(--theme-border-subtle)` | Toolbar bottom border color |
| `--file-explorer-row-hover-bg` | `var(--theme-hover-bg)` | Row hover background (detail/list) |
| `--file-explorer-row-selected-bg` | `rgba($blue-100, 0.5)` | Selected row background |
| `--file-explorer-row-selected-border` | `$blue-600` | Selected row left-border accent |
| `--file-explorer-row-border` | `var(--theme-hover-bg)` | Row bottom border |
| `--file-explorer-header-color` | `var(--theme-text-secondary)` | Column header text color |
| `--file-explorer-group-color` | `var(--theme-text-muted)` | Group header text color |
| `--file-explorer-group-font-size` | `$font-size-2xs` | Group header font size |
| `--file-explorer-card-border` | `var(--theme-border-subtle)` | Grid card border color |
| `--file-explorer-breadcrumb-color` | `var(--theme-text-secondary)` | Breadcrumb text color |
| `--file-explorer-breadcrumb-link-color` | `$blue-600` | Breadcrumb clickable link color |

### 11.2 Override example

```css
/* High-contrast dark theme override */
.my-app .fileexplorer {
    --file-explorer-bg: #1a1a2e;
    --file-explorer-border: #30305a;
    --file-explorer-toolbar-bg: #16213e;
    --file-explorer-row-hover-bg: #1a1a3e;
    --file-explorer-row-selected-bg: rgba(59, 130, 246, 0.25);
    --file-explorer-row-selected-border: #3b82f6;
    --file-explorer-header-color: #94a3b8;
    --file-explorer-breadcrumb-color: #94a3b8;
    --file-explorer-breadcrumb-link-color: #60a5fa;
    --file-explorer-card-border: #30305a;
}
```

### 11.3 BEM class structure

All internal elements use BEM-style class names under the `.fileexplorer` block.
You can target these for further customization:

```
.fileexplorer                         Root container
.fileexplorer-toolbar                 Toolbar bar
.fileexplorer__breadcrumb             Breadcrumb path
.fileexplorer__breadcrumb-segment     Clickable path segment
.fileexplorer__breadcrumb-separator   "/" separator
.fileexplorer__view-toggle            View mode button group
.fileexplorer__count                  Item count label
.fileexplorer__content                Scrollable items area
.fileexplorer__table                  Detail view table
.fileexplorer__th                     Column header
.fileexplorer__th--active             Currently sorted column
.fileexplorer__th--asc                Ascending sort indicator
.fileexplorer__th--desc               Descending sort indicator
.fileexplorer__tr                     Item row
.fileexplorer__tr--selected           Selected row
.fileexplorer__tr--folder             Folder row (bold name)
.fileexplorer__group-header           Type group separator row
.fileexplorer__grid                   Grid view container
.fileexplorer__card                   Grid view card
.fileexplorer__card--selected         Selected card
.fileexplorer__list                   List view container
.fileexplorer__list-row               List view row
.fileexplorer__empty                  Empty state container
.fileexplorer__loading                Loading skeleton
.fileexplorer__inline-rename          Inline rename input
```

---

## 12. Full API Reference

### 12.1 Constructor options (`FileExplorerOptions`)

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `roots` | `FileNode[]` | `[]` | Root folder nodes with nested `children` (tree mode). |
| `items` | `FileNode[]` | -- | Initial flat items (enables flat mode). |
| `breadcrumb` | `BreadcrumbSegment[]` | -- | Initial breadcrumb path (flat mode). |
| `viewMode` | `"grid" \| "list" \| "detail"` | `"detail"` | Initial view mode. |
| `columns` | `FileExplorerColumn[]` | Name, Modified, Size, Type | Column definitions for detail view. |
| `sortField` | `"name" \| "modified" \| "size" \| "type"` | `"name"` | Default sort field. |
| `sortDirection` | `"asc" \| "desc"` | `"asc"` | Default sort direction. |
| `groupBy` | `"type-first" \| "none" \| function` | `"type-first"` | Grouping strategy (see [Section 6](#6-grouping)). |
| `showToolbar` | `boolean` | `true` | Whether to show the toolbar (view toggle, sort). |
| `showBreadcrumbs` | `boolean` | `true` | Whether to show the breadcrumb bar. |
| `showTreePane` | `boolean` | `true` | Whether to show the tree sidebar. Set `false` for flat mode. |
| `showStatusLine` | `boolean` | `true` | Whether to show the bottom status line. |
| `treePaneWidth` | `number` | `250` | Initial tree pane width in pixels. |
| `treePaneMinWidth` | `number` | `150` | Minimum tree pane width in pixels. |
| `treePaneMaxWidth` | `number` | `500` | Maximum tree pane width in pixels. |
| `selectable` | `"single" \| "multi"` | `"multi"` | Selection mode. |
| `multiSelect` | `boolean` | `false` | Sugar for `selectable: "multi"`. |
| `height` | `string` | `"500px"` | CSS height of the explorer container. |
| `cssClass` | `string` | -- | Additional CSS class on the root element. |
| `emptyState` | `{ icon?, title?, description? }` | -- | Default empty state config. |
| `contextMenuItems` | `FileContextMenuItem[] \| (node) => FileContextMenuItem[]` | -- | Context menu items (static array or dynamic function). |
| `keyBindings` | `Partial<Record<string, string>>` | -- | Override default key combos. |

### 12.2 Callbacks

| Callback | Signature | Description |
|----------|-----------|-------------|
| `onOpen` | `(node: FileNode) => void` | Double-click or Enter on an item. |
| `onSelect` | `(nodes: FileNode[]) => void` | Single-click selection. |
| `onSelectionChange` | `(nodes: FileNode[]) => void` | Any selection change (click, programmatic). |
| `onNavigate` | `(folder: FileNode) => void` | Tree-mode folder navigation. |
| `onBreadcrumbNavigate` | `(segmentId: string \| null) => void` | Breadcrumb segment click or Backspace (flat mode). |
| `onSort` | `(field: string, direction: "asc" \| "desc") => void` | Column header sort click. |
| `onViewModeChange` | `(mode: "grid" \| "list" \| "detail") => void` | View mode toggle click. |
| `onContextMenuAction` | `(actionId: string, node: FileNode \| null) => void` | Context menu action selection. |
| `onRename` | `(node: FileNode, newName: string) => Promise<boolean>` | Inline rename confirmed. Return `true` to accept. |
| `onDelete` | `(nodes: FileNode[]) => Promise<boolean>` | Delete action. Return `true` to confirm removal. |
| `onMove` | `(nodes: FileNode[], target: FileNode) => Promise<boolean>` | Move action (tree mode). |
| `onCreateFolder` | `(parent: FileNode, name: string) => Promise<FileNode \| null>` | New folder action. |
| `onLoadChildren` | `(folder: FileNode) => Promise<FileNode[]>` | Lazy-load children for a folder (tree mode). |
| `onUpload` | `(folder: FileNode, files: FileList) => Promise<void>` | File upload action. |
| `onDragStart` | `(nodes: FileNode[]) => void` | Items start being dragged. |
| `onDrop` | `(target: FileNode, ids: string[]) => void` | Internal items dropped on a folder. |
| `onExternalDrop` | `(target: FileNode, dataTransfer: DataTransfer) => void` | External items dropped on a folder. |

### 12.3 Instance methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `show` | `show(container: HTMLElement \| string): void` | Render into a container element or element ID. |
| `hide` | `hide(): void` | Remove from DOM, preserving internal state. |
| `destroy` | `destroy(): void` | Full teardown. Removes DOM, clears maps, detaches listeners. |
| `getElement` | `getElement(): HTMLElement \| null` | Return the root DOM element. |
| `setItems` | `setItems(items: FileNode[]): void` | Replace displayed items (flat mode). Clears selection. |
| `getItems` | `getItems(): FileNode[]` | Return a copy of the currently displayed items. |
| `setBreadcrumb` | `setBreadcrumb(segments: BreadcrumbSegment[]): void` | Update the breadcrumb path (flat mode). |
| `setViewMode` | `setViewMode(mode: "grid" \| "list" \| "detail"): void` | Switch the view mode. |
| `getViewMode` | `getViewMode(): string` | Return the current view mode. |
| `setSort` | `setSort(field: string, direction: "asc" \| "desc"): void` | Change the sort field and direction. |
| `navigate` | `navigate(folderId: string): void` | Navigate to a folder by ID (tree mode). |
| `getCurrentFolder` | `getCurrentFolder(): FileNode` | Return the current folder node. |
| `getPath` | `getPath(): FileNode[]` | Return the breadcrumb path as an array of nodes (tree mode). |
| `selectItem` | `selectItem(id: string): void` | Select a single item. Clears previous selection. |
| `selectItems` | `selectItems(ids: string[]): void` | Select multiple items. Clears previous selection. |
| `deselectAll` | `deselectAll(): void` | Clear all selection. |
| `getSelectedIds` | `getSelectedIds(): string[]` | Return IDs of selected items. |
| `getSelectedFiles` | `getSelectedFiles(): FileNode[]` | Return `FileNode` objects for selected items. |
| `showLoading` | `showLoading(): void` | Show skeleton loading state. |
| `showEmpty` | `showEmpty(config?: { icon?, title?, description? }): void` | Show configurable empty state. |
| `startRenamePublic` | `startRenamePublic(nodeId?: string): void` | Start inline rename on the given or selected item. |
| `focus` | `focus(): void` | Focus the listing for keyboard navigation. |
| `refresh` | `refresh(): void` | Re-render the current view without changing data. |
| `addFile` | `addFile(file: FileNode, parentId: string): void` | Add a file node to a parent (tree mode). |
| `removeFile` | `removeFile(fileId: string): void` | Remove a file node by ID (tree mode). |
| `updateFile` | `updateFile(fileId: string, changes: Partial<FileNode>): void` | Patch a file node (tree mode). |

### 12.4 Keyboard shortcuts

| Key | Action |
|-----|--------|
| Arrow Up / Arrow Down | Move selection up/down |
| Enter | Open selected item (folder navigation or file open) |
| Backspace | Navigate to parent (fires `onBreadcrumbNavigate` in flat mode) |
| F2 | Start inline rename on selected item |
| Delete | Trigger delete action |
| Ctrl+A | Select all items (multi-select mode only) |
| Escape | Cancel rename, close context menu, deselect all |
| Home / End | Jump to first / last item |
