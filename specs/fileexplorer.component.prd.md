<!-- AGENT: Component PRD for the FileExplorer CDN component. Specifies a reusable file/folder browser component for the CDN component library (static.knobby.io). Replaces the hand-built ExplorerContentPanel. -->

# Component PRD: FileExplorer

**Date:** April 6, 2026
**Status:** Draft
**For:** UI Team (CDN component implementation)
**Related:** `specs/explorer.prd.md`, `specs/resourcemodel+ontology+explorer.plan.md`
**Slug:** `fileexplorer` → `static.knobby.io/components/fileexplorer/fileexplorer.{css|js}`

---

## 1. Overview

FileExplorer is a CDN component that provides a Windows Explorer / macOS Finder-style browsable file and folder view. It is the primary content area for the standalone Explorer app and can be embedded in any app that needs to present a navigable hierarchy of items.

The component renders items provided by the host application (it does not make API calls itself) and communicates selection, navigation, and action events via callbacks.

### Design References

- **Windows File Explorer** — Detail/list/icon views, sortable columns, breadcrumb bar, grouped display
- **macOS Finder** — Column view, icon grid, quick look, toolbar view toggle
- **Google Drive** — Grid/list toggle, type-based icons, breadcrumb navigation, context menu
- **VS Code Explorer** — Tree + flat list hybrid, inline rename, keyboard navigation

### Key Principles

1. **Data-agnostic**: The component receives `FileNode[]` items — it does not know about Explorer API, resource types, or backend schemas.
2. **View modes**: Three switchable views — Detail (sortable table), Grid (icon cards), and List (compact rows).
3. **Host-driven**: All data loading, CRUD operations, and navigation are delegated to the host via callbacks. The component is purely presentational + interactive.
4. **Accessible**: Full keyboard navigation, ARIA landmarks, screen-reader labels.

---

## 2. Component Decomposition

```
FileExplorer
├── Toolbar Bar (internal)
│   ├── Breadcrumb / path bar
│   ├── Item count label
│   └── View mode toggle (Detail | Grid | List)
├── Content Area
│   ├── Detail View (sortable table with column headers)
│   │   ├── Column headers (click to sort, arrow indicators)
│   │   ├── Group headers (visual separators between item types)
│   │   └── Item rows (icon, name, type, modified, owner, size)
│   ├── Grid View (responsive icon grid)
│   │   ├── Group labels
│   │   └── Item cards (icon, name, type badge)
│   └── List View (compact single-line rows)
│       └── Item rows (icon + name + type on one line)
├── Empty State (configurable message + icon)
├── Loading State (skeleton rows/cards)
└── Context Menu (right-click actions, delegated to host)
```

### Reuse Matrix

| Sub-Component | CDN § | Status | Notes |
|---------------|-------|--------|-------|
| ContextMenu | contextmenu | ✅ Exists | Right-click on items |
| SkeletonLoader | skeletonloader | ✅ Exists | Loading placeholder |
| EmptyState | emptystate | ✅ Exists | No-items placeholder |
| InlineToolbar | inlinetoolbar | ✅ Exists | Internal toolbar bar |
| TypeBadge | typebadge | ✅ Exists | Type labels in grid view |

---

## 3. Data Model

### 3.1 FileNode

The host application maps its domain objects to `FileNode` items before passing them to the component.

```typescript
interface FileNode
{
    /** Unique identifier. */
    id: string;

    /** Display name. */
    name: string;

    /** Whether this is a navigable container or a leaf item. */
    type: 'folder' | 'file';

    /** Icon class (e.g., 'bi bi-folder-fill', 'bi bi-diagram-3'). */
    icon?: string;

    /** Icon color (CSS color value). */
    iconColor?: string;

    /** Type label for display (e.g., 'Diagram', 'Checklist'). */
    typeLabel?: string;

    /** Last modified ISO timestamp. */
    modified?: string;

    /** Display name of the item owner. */
    owner?: string;

    /** File size in bytes (optional — for actual files). */
    size?: number;

    /** Whether the item is read-only (disables rename/delete). */
    readOnly?: boolean;

    /** Whether the item is a system item (disables most actions). */
    isSystem?: boolean;

    /** Arbitrary metadata the host wants to carry through callbacks. */
    data?: Record<string, unknown>;
}
```

### 3.2 BreadcrumbSegment

```typescript
interface BreadcrumbSegment
{
    /** Unique identifier of this path segment. null = root. */
    id: string | null;

    /** Display label for this segment. */
    label: string;
}
```

### 3.3 FileExplorerColumn

```typescript
interface FileExplorerColumn
{
    /** Column identifier used in sort callbacks. */
    id: string;

    /** Column header label. */
    label: string;

    /** Fixed width (CSS value). If omitted, column flexes. */
    width?: string;

    /** Whether clicking the header sorts by this column. Default: true. */
    sortable?: boolean;

    /** Custom cell renderer. Receives the FileNode and returns text or HTMLElement. */
    render?: (node: FileNode) => string | HTMLElement;
}
```

---

## 4. API

### 4.1 Factory Function

```typescript
interface Window
{
    createFileExplorer?: (options: FileExplorerOptions) => FileExplorer;
}
```

### 4.2 FileExplorerOptions

```typescript
interface FileExplorerOptions
{
    /** Container element or CSS selector. */
    container: HTMLElement | string;

    /** Initial items to display. */
    items?: FileNode[];

    /** Initial breadcrumb path. */
    breadcrumb?: BreadcrumbSegment[];

    /** Initial view mode. Default: 'detail'. */
    viewMode?: 'detail' | 'grid' | 'list';

    /** Column definitions for detail view. Uses defaults if omitted. */
    columns?: FileExplorerColumn[];

    /** Default sort field. Default: 'name'. */
    sortField?: string;

    /** Default sort direction. Default: 'asc'. */
    sortDirection?: 'asc' | 'desc';

    /**
     * Grouping strategy:
     * - 'type-first': folders first, then group assets by typeLabel (default)
     * - 'none': flat list, no visual grouping
     * - custom function: receives sorted items, returns grouped sections
     */
    groupBy?: 'type-first' | 'none'
        | ((items: FileNode[]) => Array<{ label: string; items: FileNode[] }>);

    /** Whether to show the internal toolbar (breadcrumb + view toggle). Default: true. */
    showToolbar?: boolean;

    /** Whether multi-select is enabled (Ctrl+click, Shift+click). Default: false. */
    multiSelect?: boolean;

    /** Empty state configuration. */
    emptyState?: {
        icon?: string;
        title?: string;
        description?: string;
    };

    /** Context menu items shown on right-click. */
    contextMenuItems?: (node: FileNode | null) => Array<{
        id: string;
        label: string;
        icon?: string;
        disabled?: boolean;
        separator?: boolean;
    }>;

    // ── Callbacks ──────────────────────────────────────────────────

    /** Fired when a single item is clicked (selected). */
    onSelect?: (node: FileNode) => void;

    /** Fired when selection changes (supports multi-select). */
    onSelectionChange?: (nodes: FileNode[]) => void;

    /** Fired when an item is double-clicked or Enter is pressed. */
    onOpen?: (node: FileNode) => void;

    /** Fired when a breadcrumb segment is clicked. null = root. */
    onNavigate?: (segmentId: string | null) => void;

    /** Fired when sort changes (column header click). */
    onSort?: (field: string, direction: 'asc' | 'desc') => void;

    /** Fired when the view mode toggle is clicked. */
    onViewModeChange?: (mode: 'detail' | 'grid' | 'list') => void;

    /** Fired when a context menu action is selected. */
    onContextMenuAction?: (actionId: string, node: FileNode | null) => void;

    /** Fired when inline rename is confirmed (if enabled). */
    onRename?: (node: FileNode, newName: string) => void;

    /**
     * Lazy loading callback. If provided, the component shows a loading state
     * and calls this when a folder is opened. The host should call
     * `explorer.setItems(...)` when data arrives.
     */
    onLoadChildren?: (folderId: string) => void;
}
```

### 4.3 FileExplorer Instance

```typescript
interface FileExplorer
{
    /** Replace the displayed items. */
    setItems(items: FileNode[]): void;

    /** Get the currently displayed items. */
    getItems(): FileNode[];

    /** Update the breadcrumb path. */
    setBreadcrumb(segments: BreadcrumbSegment[]): void;

    /** Set the view mode. */
    setViewMode(mode: 'detail' | 'grid' | 'list'): void;

    /** Get the current view mode. */
    getViewMode(): 'detail' | 'grid' | 'list';

    /** Sort items by the given column. */
    sort(field: string, direction: 'asc' | 'desc'): void;

    /** Select an item by ID. */
    selectItem(id: string): void;

    /** Select multiple items by ID. */
    selectItems(ids: string[]): void;

    /** Clear selection. */
    deselectAll(): void;

    /** Get selected item IDs. */
    getSelectedIds(): string[];

    /** Get selected items. */
    getSelectedItems(): FileNode[];

    /** Show loading state. */
    showLoading(): void;

    /** Show empty state. */
    showEmpty(config?: { icon?: string; title?: string; description?: string }): void;

    /** Start inline rename on the selected item. */
    startRename(): void;

    /** Focus the component for keyboard navigation. */
    focus(): void;

    /** Get the root HTMLElement. */
    getElement(): HTMLElement;

    /** Destroy the component and clean up event listeners. */
    destroy(): void;
}
```

---

## 5. View Modes

### 5.1 Detail View (Default)

A sortable table with column headers, row highlighting, and visual type grouping.

| Feature | Behavior |
|---------|----------|
| Column headers | Click to sort (toggle asc/desc). Active column shows ▲/▼ arrow. |
| Default columns | Name, Type, Modified, Owner |
| Custom columns | Host can add/replace columns via `columns` option |
| Row selection | Click to select (blue highlight). Ctrl+click for multi-select. |
| Row open | Double-click or Enter navigates into folders, opens files. |
| Group headers | Visual separator rows with label (e.g., "Folders & Teams (3)"). |
| Sort stability | Folders always sort before files regardless of column. |
| Hover | Light background highlight on hover. |
| Inline rename | F2 or slow double-click on name cell enables inline edit. |

### 5.2 Grid View

A responsive card grid with icons, names, and type badges.

| Feature | Behavior |
|---------|----------|
| Card layout | `grid-template-columns: repeat(auto-fill, minmax(140px, 1fr))` |
| Card contents | Icon (26px), name (2-line clamp), type badge |
| Selection | Blue border on selected card |
| Group headers | Uppercase labels above each group section |
| Responsive | Auto-fills columns based on container width |

### 5.3 List View

Compact single-line rows optimized for dense content.

| Feature | Behavior |
|---------|----------|
| Row layout | `icon | name | typeLabel | modified` in a single line |
| Row height | Compact — no padding, smaller font |
| Selection | Background highlight |
| Use case | Maximum information density |

---

## 6. Keyboard Navigation

| Key | Action |
|-----|--------|
| ↑ / ↓ | Move selection up/down |
| Enter | Open selected item (navigate into folder or trigger onOpen) |
| Backspace | Navigate to parent (trigger onNavigate with parent breadcrumb) |
| F2 | Start inline rename on selected item |
| Delete | Trigger context menu delete action (if configured) |
| Ctrl+A | Select all items (if multiSelect enabled) |
| Escape | Deselect all |
| Home / End | Jump to first / last item |
| Tab | Move focus to toolbar, then breadcrumb, then items area |

---

## 7. Drag and Drop

| Feature | Behavior |
|---------|----------|
| Drag source | Items are draggable. Drag data includes FileNode IDs. |
| Drop target | Folders accept drops. Visual highlight on dragover. |
| Callbacks | `onDragStart?(nodes: FileNode[])`, `onDrop?(targetFolder: FileNode, draggedIds: string[])` |
| External drops | Optional `onExternalDrop?(targetFolder: FileNode, dataTransfer: DataTransfer)` for file uploads |

---

## 8. Styling

### 8.1 CSS Custom Properties

```css
/* Container */
--file-explorer-bg: #ffffff;
--file-explorer-border: #e2e8f0;
--file-explorer-font-size: 0.8125rem;

/* Toolbar */
--file-explorer-toolbar-bg: #f8fafc;
--file-explorer-toolbar-border: #e2e8f0;
--file-explorer-toolbar-height: 40px;

/* Items */
--file-explorer-row-hover-bg: #f8fafc;
--file-explorer-row-selected-bg: #dbeafe;
--file-explorer-row-selected-border: #3b82f6;
--file-explorer-row-border: #f1f5f9;

/* Column headers */
--file-explorer-header-color: #64748b;
--file-explorer-header-active-color: #1e40af;
--file-explorer-header-font-size: 0.6875rem;

/* Group headers */
--file-explorer-group-color: #94a3b8;
--file-explorer-group-font-size: 0.6875rem;

/* Grid cards */
--file-explorer-card-border: #e2e8f0;
--file-explorer-card-border-radius: 8px;
--file-explorer-card-hover-border: #93c5fd;

/* Breadcrumb */
--file-explorer-breadcrumb-color: #64748b;
--file-explorer-breadcrumb-link-color: #3b82f6;
--file-explorer-breadcrumb-separator: #cbd5e1;
```

### 8.2 CSS Classes

```
.file-explorer                         Root container
.file-explorer__toolbar                Toolbar bar
.file-explorer__breadcrumb             Breadcrumb path
.file-explorer__breadcrumb-segment     Clickable path segment
.file-explorer__breadcrumb-separator   "/" separator
.file-explorer__view-toggle            View mode button group
.file-explorer__count                  Item count label
.file-explorer__content                Scrollable items area
.file-explorer__table                  Detail view table
.file-explorer__th                     Column header
.file-explorer__th--active             Currently sorted column
.file-explorer__th--asc               Ascending sort indicator
.file-explorer__th--desc              Descending sort indicator
.file-explorer__tr                     Item row
.file-explorer__tr--selected           Selected row
.file-explorer__tr--folder             Folder row (bold name)
.file-explorer__group-header           Type group separator row
.file-explorer__grid                   Grid view container
.file-explorer__card                   Grid view card
.file-explorer__card--selected         Selected card
.file-explorer__list                   List view container
.file-explorer__list-row               List view row
.file-explorer__empty                  Empty state container
.file-explorer__loading                Loading skeleton
.file-explorer__inline-rename          Inline rename input
```

---

## 9. Integration Example

### 9.1 Explorer App (Primary Consumer)

```typescript
// Map ExplorerNode → FileNode
function toFileNode(node: ExplorerNode): FileNode
{
    const isContainer = node.nodeType === 'ORG_UNIT' || node.nodeType === 'FOLDER';
    return {
        id: node.id,
        name: node.name,
        type: isContainer ? 'folder' : 'file',
        icon: TYPE_ICONS[node.resourceType || node.nodeType] ?? 'bi bi-file-earmark',
        iconColor: TYPE_COLORS[node.resourceType || node.nodeType] ?? '#64748b',
        typeLabel: TYPE_LABELS[node.resourceType || node.nodeType] ?? node.nodeType,
        modified: node.updatedAt,
        owner: node.createdBy,
        readOnly: false,
        isSystem: node.isSystem,
        data: { resourceType: node.resourceType, sourceId: node.sourceId },
    };
}

// Create the component
const explorer = createFileExplorer({
    container: centerContentEl,
    viewMode: 'detail',
    groupBy: 'type-first',
    multiSelect: false,
    emptyState: {
        icon: 'bi bi-compass',
        title: 'Select a folder',
        description: 'Choose a folder or team to see its contents.',
    },
    onSelect: (node) => propertiesPanel.showNode(node),
    onOpen: (node) => {
        if (node.type === 'folder') {
            loadFolder(node.id);
        } else {
            openInApp(node);
        }
    },
    onNavigate: (segmentId) => navigateToNode(segmentId),
    onSort: (field, direction) => { /* handled internally */ },
    onRename: (node, newName) => renameNode(node.id, newName),
    contextMenuItems: (node) => [
        { id: 'open',      label: 'Open',      icon: 'bi bi-file' },
        { id: 'rename',    label: 'Rename',     icon: 'bi bi-pencil-square' },
        { id: 'duplicate',  label: 'Duplicate',  icon: 'bi bi-files' },
        { id: 'separator',  label: '',           separator: true },
        { id: 'delete',    label: 'Delete',     icon: 'bi bi-trash' },
    ],
    onContextMenuAction: (actionId, node) => handleAction(actionId, node),
});

// Load folder contents
async function loadFolder(folderId: string) {
    explorer.showLoading();
    const [children, nodeResponse] = await Promise.all([
        explorerApi.fetchChildren(folderId),
        explorerApi.fetchNode(folderId),
    ]);
    explorer.setItems(children.map(toFileNode));
    explorer.setBreadcrumb(toBreadcrumb(nodeResponse.ancestors, nodeResponse.node));
}
```

---

## 10. Acceptance Criteria

1. **Three view modes**: Detail, Grid, List — switchable via toolbar toggle.
2. **Sortable columns**: Click column header to sort. Folders always precede files.
3. **Type grouping**: Visual group headers separate folders from file types.
4. **Breadcrumb navigation**: Clickable path segments navigate to ancestors.
5. **Selection**: Single-click selects. Optional multi-select (Ctrl+click, Shift+range).
6. **Open**: Double-click or Enter opens items via callback.
7. **Inline rename**: F2 starts rename, Enter confirms, Escape cancels.
8. **Context menu**: Right-click shows configurable menu via ContextMenu CDN component.
9. **Keyboard**: Full arrow-key navigation, Enter/Backspace/Delete/F2/Escape.
10. **Loading state**: Skeleton loader while data is being fetched.
11. **Empty state**: Configurable message when folder is empty.
12. **CSS custom properties**: Fully themeable via CSS variables.
13. **Drag and drop**: Items are draggable into folders (optional, callback-driven).
14. **Responsive**: Grid view auto-fills columns. Detail view scrolls horizontally if narrow.
15. **No API coupling**: Component receives data via `setItems()` — it never fetches data itself.

---

## 11. Non-Goals (Out of Scope)

- **Column view** (macOS Finder-style multi-column) — may be added in v2
- **Thumbnail previews** — image/video thumbnails require backend support
- **File upload widget** — handled by host app, not the component
- **Tree view** — use existing CDN TreeView component for tree hierarchy
- **Search / filter** — handled externally; host filters items before calling `setItems()`
- **Virtualization** — v1 targets <1000 items; virtual scrolling in v2 if needed

---

## 12. Files Summary

| Deliverable | Path |
|-------------|------|
| CSS | `static.knobby.io/components/fileexplorer/fileexplorer.css` |
| JS | `static.knobby.io/components/fileexplorer/fileexplorer.js` |
| README | `static.knobby.io/docs/components/fileexplorer/README.md` |
| TypeScript types | `typescript/shared/types/component-library.d.ts` (augment Window) |
| Explorer app integration | `typescript/apps/explorer/main.ts` (replace ExplorerContentPanel) |
