<!-- AGENT: Product requirements document for the TreeGrid component — tree-table hybrid with columnar data editing. -->

# TreeGrid Component — Product Requirements

**Status:** Draft (Spec Only — No Implementation Planned)
**Component name:** TreeGrid
**Folder:** `./components/treegrid/` (future)
**Spec author:** Agent
**Date:** 2026-02-15

---

## 1. Overview

A tree-table hybrid component: a hierarchical tree in the first column with tabular, columnar data in the remaining columns. Each row is a tree node; the first column renders expand/collapse toggles, indentation, and labels, while subsequent columns display structured data fields that can be read-only or inline-editable.

The TreeGrid builds on the TreeView component. It inherits the TreeView node model, selection, keyboard navigation, drag-and-drop, and expand/collapse semantics, then extends them with a column layout, cell rendering, cell editing, column resize and reorder, sorting, and summary rows.

| Inspiration | Pattern Adopted |
|-------------|-----------------|
| VS Code Problems Panel | Tree in first column, severity/source/location in data columns |
| Jira List View | Hierarchy (Epic > Story > Subtask) with Status, Assignee, Priority |
| macOS Finder List View | File tree with Size, Date Modified, Kind columns; column resize |
| WAI-ARIA Treegrid Pattern | `role="treegrid"`, `role="row"`, `role="gridcell"`, two-axis keyboard nav |

---

## 2. Use Cases

### 2.1 Project Task Tracker

Hierarchy: **Project > Milestone > Epic > Task**. Columns: Title (tree), Priority, Assignee, Status, Due Date. Inline editing on Priority (dropdown), Assignee (combo box), Status (dropdown), Due Date (date picker).

### 2.2 File Browser Detail View

Hierarchy: **Drive > Folder > File**. Columns: Name (tree), Size, Modified, Type. Read-only columns with sorting by Size, Modified, or Type.

### 2.3 Configuration Editor

Hierarchy: **Section > Group > Setting**. Columns: Setting (tree), Value, Type, Default. Inline editing on Value; Type and Default are read-only.

### 2.4 Inventory Management

Hierarchy: **Warehouse > Aisle > Shelf > Item**. Columns: Location (tree), SKU, Quantity, Last Counted. Summary/aggregate rows showing totals for Quantity at each hierarchy level.

---

## 3. Column Model

```typescript
/** Describes a single data column in the TreeGrid. */
interface TreeGridColumn
{
    id: string;                    // Unique column identifier
    label: string;                 // Column header label
    width?: number;                // Initial width in px. Default: 150
    minWidth?: number;             // Minimum width in px. Default: 60
    maxWidth?: number;             // Maximum width in px. Default: none
    resizable?: boolean;           // Drag-resizable. Default: true
    sortable?: boolean;            // Header-click sorting. Default: false
    sortDirection?: "asc" | "desc"; // Current sort direction

    /** Extracts the display value from a node's data object. */
    valueAccessor: (data: Record<string, unknown>) => string | number | null;

    /** Custom cell renderer. If omitted, the cell displays the value as text. */
    renderer?: (cell: HTMLElement, node: TreeGridNode, value: string | number | null) => void;

    editable?: boolean;            // Inline-editable cells. Default: false
    editorType?: "text" | "number" | "select" | "date" | "custom"; // Default: "text"
    editorOptions?: Array<{ value: string; label: string }>; // For "select" editor
    align?: "left" | "center" | "right"; // Cell text alignment. Default: "left"
    hidden?: boolean;              // Column visibility. Default: false
    cssClass?: string;             // Additional CSS class(es) for cells

    /** Aggregation function for summary rows. Receives descendant values. */
    aggregate?: (values: Array<string | number | null>) => string | number | null;
}
```

The first column is always the tree column. It is not defined in the `columns` array but configured via `TreeGridOptions.treeColumnLabel` and `TreeGridOptions.treeColumnWidth`. It renders the expand/collapse toggle, indentation, node icon, and label. It is pinned to the left edge and cannot be reordered.

---

## 4. Types

```typescript
/** A single node in the TreeGrid hierarchy. */
interface TreeGridNode
{
    id: string;                         // Unique node identifier
    label: string;                      // Tree column display label
    icon?: string;                      // Bootstrap Icons class
    data?: Record<string, unknown>;     // Columnar data accessed by valueAccessors
    children?: TreeGridNode[];          // Child nodes
    expanded?: boolean;                 // Initially expanded. Default: false
    lazy?: boolean;                     // Supports lazy-loading of children
    selectable?: boolean;               // Default: true
    draggable?: boolean;                // Default: inherits from options
}

/** Configuration options for the TreeGrid component. */
interface TreeGridOptions
{
    id?: string;                        // Auto-generated if omitted
    label: string;                      // Accessible label (required)
    nodes: TreeGridNode[];              // Root nodes
    columns: TreeGridColumn[];          // Data column definitions

    // Tree column
    treeColumnLabel?: string;           // Default: "Name"
    treeColumnWidth?: number;           // Default: 250
    treeColumnMinWidth?: number;        // Default: 120
    treeColumnResizable?: boolean;      // Default: true

    // Selection and interaction (inherited from TreeView model)
    selectionMode?: "none" | "single" | "multi";
    dragAndDrop?: boolean;              // Default: false
    onLazyLoad?: (node: TreeGridNode) => Promise<TreeGridNode[]>;

    // Editing callbacks
    onEditStart?: (node: TreeGridNode, column: TreeGridColumn, cell: HTMLElement) => boolean | void;
    onEditCommit?: (node: TreeGridNode, column: TreeGridColumn, oldValue: unknown, newValue: unknown) => void;
    onEditCancel?: (node: TreeGridNode, column: TreeGridColumn) => void;

    // Column events
    onColumnResize?: (column: TreeGridColumn, newWidth: number) => void;
    onColumnReorder?: (columns: TreeGridColumn[]) => void;
    onColumnSort?: (column: TreeGridColumn, direction: "asc" | "desc") => void;

    // Row events
    onRowSelect?: (node: TreeGridNode) => void;
    onRowToggle?: (node: TreeGridNode, expanded: boolean) => void;

    // Display
    rowStriping?: boolean;              // Alternating row backgrounds. Default: true
    stickyHeader?: boolean;             // Sticky column headers. Default: true
    rowHeight?: number;                 // Row height in px. Default: 32
    cssClass?: string;                  // Additional CSS class(es) for root
}
```

---

## 5. Features

| Feature | Description |
|---------|-------------|
| **Column resize** | Drag the border between column headers; respects `minWidth`/`maxWidth` constraints |
| **Column reorder** | Drag column headers to reorder; tree column is always first (not reorderable) |
| **Sticky header** | Column headers pin to the top of the scroll container via `position: sticky` |
| **Cell editing** | Double-click or Enter/F2 activates inline editor; Enter commits, Escape cancels, Tab commits and moves |
| **Column sort** | Click a sortable header to sort; children sort within their parent (hierarchy preserved) |
| **Row striping** | Alternating visible rows receive `$gray-50` background; recalculates on expand/collapse/sort |
| **Fixed tree column** | Tree column is `position: sticky; left: 0` so it stays visible during horizontal scroll |
| **Summary rows** | Parent nodes display aggregated values (sum, count, average) from descendants, styled bold and muted |

---

## 6. WAI-ARIA Accessibility

Follows the [WAI-ARIA Treegrid Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/treegrid/).

### 6.1 Roles

| Element | Attributes |
|---------|------------|
| Root container | `role="treegrid"`, `aria-label` |
| Header row | `role="row"` |
| Header cell | `role="columnheader"`, `aria-sort` (if sortable) |
| Body row | `role="row"`, `aria-level`, `aria-setsize`, `aria-posinset`, `aria-expanded` (parents only) |
| Tree cell | `role="gridcell"` (first cell) |
| Data cell | `role="gridcell"` |

### 6.2 Keyboard Navigation

| Key | Action |
|-----|--------|
| **Up / Down Arrow** | Move focus to previous / next visible row (same column) |
| **Left Arrow** | Tree cell: collapse expanded parent, or move to parent row. Data cell: move to previous cell |
| **Right Arrow** | Tree cell: expand collapsed parent, or move to next cell. Data cell: move to next cell |
| **Home / End** | Move to first / last cell of first / last visible row |
| **Enter / F2** | Activate inline edit on editable cell; commit if already editing |
| **Escape** | Cancel inline edit; if not editing, clear selection |
| **Space** | Toggle selection of focused row |
| **Tab** | Move focus out of the treegrid |

### 6.3 Focus Management

Single roving `tabindex`: one cell has `tabindex="0"` at any time; all others have `tabindex="-1"`. Arrow keys move the active cell and update tabindex values.

---

## 7. Relationship to TreeView

The TreeGrid extends TreeView conceptually but does not subclass it, to avoid tight coupling. Shared logic may be extracted into a `tree-core` module in the future.

### 7.1 Inherited from TreeView

Node model, single/multi selection, expand/collapse with animation, lazy loading with spinner, drag-and-drop with drop indicators, right-click context menu, type-ahead search, and starred/pinned nodes.

### 7.2 Added by TreeGrid

Column layout with resizable/reorderable/sortable headers, per-column cell rendering via `valueAccessor` and `renderer`, inline cell editing (text, number, select, date, custom), fixed first column with horizontal scroll, summary/aggregate rows, and alternating row striping.

---

## 8. Future Considerations

| Feature | Notes |
|---------|-------|
| **Virtual scrolling** | For 10K+ rows. Render only visible rows plus buffer; requires flat index mapping visible positions to tree nodes |
| **Frozen columns** | Freeze data columns beyond the tree column on left or right edge; requires synchronised scroll regions |
| **Column grouping** | Multi-level headers where a parent spans child columns (e.g., "Dates" > "Start" + "End") |
| **Export to CSV / Excel** | Programmatic export preserving hierarchy via indentation or outline levels; filter callback for exclusions |
| **Copy / paste cells** | Clipboard integration: select cell range, copy as TSV, paste invokes editing pipeline per cell |
| **Conditional formatting** | Per-cell style rules via `cellClass` callback returning CSS classes based on value |
| **Column pinning** | Pin any column to left or right edge independent of the tree column |
| **Row grouping** | Auto-group siblings by column value, creating synthetic hierarchy from flat data |

---

## 9. Files (Future)

| File | Purpose |
|------|---------|
| `specs/treegrid.prd.md` | This specification |
| `components/treegrid/treegrid.ts` | TypeScript source |
| `components/treegrid/treegrid.scss` | Styles |
| `components/treegrid/README.md` | Consumer documentation |
