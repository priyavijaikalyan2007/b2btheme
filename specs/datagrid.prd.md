<!-- AGENT: PRD for the DataGrid component — high-performance flat data table with sorting, filtering, pagination, virtual scrolling, cell editing, selection, and CSV export. -->

# DataGrid Component

**Status:** Draft
**Component name:** DataGrid
**Folder:** `./components/datagrid/`
**Spec author:** Agent
**Date:** 2026-02-20

---

## 1. Overview

### 1.1 What Is It

A high-performance flat (non-hierarchical) data table component for displaying, sorting, filtering, paginating, editing, and exporting tabular data. The DataGrid renders columnar data as a scrollable grid with a sticky header row, optional filter row, optional footer aggregation row, and a pagination bar. It is designed for datasets ranging from a handful of rows to 100K+ rows via virtual scrolling.

The DataGrid is a standalone component (ADR-029) that does not subclass TreeGrid. It borrows proven patterns from TreeGrid — flexbox rows with JS-managed column widths (ADR-022), pointer-capture column resize, inline cell editing, and row striping — but omits all hierarchy-related logic (expand/collapse, indentation, parent/child relationships, tree column).

The DataGrid supports:

- **Sortable columns** — click a header to sort ascending/descending; Shift+Click for multi-column sort.
- **Column-level filtering** — text search, select/enum dropdown, number range, and date range filters rendered in the header area.
- **Pagination** — client-side and server-side pagination with configurable page sizes.
- **Column resize** — pointer-capture drag on header borders; respects min/max width constraints.
- **Column reorder** — drag-and-drop column headers to rearrange.
- **Row selection** — single, multi (Ctrl+Click, Shift+Click), or checkbox column modes.
- **Inline cell editing** — text, number, select, and date editor types activated by Enter/F2.
- **Virtual scrolling** — viewport + buffer rendering for 100K+ rows; auto-activates above 5,000 rows.
- **Footer aggregation** — sum, average, count, min, max, or custom aggregate per column.
- **CSV export** — programmatic export of visible (filtered/sorted) data.
- **Row striping** — alternating row backgrounds for readability.
- **Pinned columns** — sticky left or right columns that remain visible during horizontal scroll.

### 1.2 Why Build It

Enterprise SaaS applications frequently need data tables for:

- Customer lists, order histories, and transaction logs
- Admin dashboards with filterable records
- Report views with sorting, pagination, and aggregation
- Data entry forms with inline editing
- Export workflows for CSV/spreadsheet consumption

No existing open-source library meets all requirements within the project's zero-dependency, IIFE-wrapped, Bootstrap 5 themed architecture. AG Grid, MUI X Data Grid, and Kendo UI Grid are framework-coupled or commercially licensed. TanStack Table is headless (no DOM rendering). Building custom ensures full control over DOM structure, accessibility, performance, and theme integration.

### 1.3 Design Inspiration

| Source | Key Pattern Adopted |
|--------|---------------------|
| AG Grid | Virtual scrolling, column pinning, inline cell editing, multi-column sort |
| MUI X Data Grid | Column filter row, pagination bar, checkbox selection column |
| Airtable | Clean grid layout, inline editing UX, row striping |
| TanStack Table | Headless data model patterns, sort/filter state management |
| Kendo UI Grid | Footer aggregation, column reorder, CSV export |
| Salesforce Report Tables | Dense enterprise data display, column resize, row numbers |

---

## 2. Use Cases

| # | Use Case | Description | Key Features Used |
|---|----------|-------------|-------------------|
| 1 | Customer directory | Browse and search customer records | Text filter, sort by name/date, pagination, row click |
| 2 | Order management | View, filter, and edit order statuses | Select filter, inline editing, multi-sort, footer totals |
| 3 | Transaction log | Explore large transaction datasets | Virtual scrolling, date range filter, number range filter, CSV export |
| 4 | Inventory table | Edit stock quantities with running totals | Inline number editing, footer sum/count, row striping |
| 5 | Admin user list | Manage users with bulk selection | Checkbox selection, select all, multi-select actions |
| 6 | Report view | Paginated report with column aggregation | Server-side pagination, footer aggregation, pinned columns |
| 7 | Data entry form | Rapid tabular data entry | Inline cell editing (text, number, select, date), Tab navigation |

---

## 3. Anatomy

### 3.1 Full Grid Layout

```
+---------------------------------------------------------------------------+
|  [ ] | #  | Name         ^| Status    | Created     | Amount     | Actions | <- Header row
|      |    | [filter...  ] | [v All  ] | [from][to]  | [min][max] |         | <- Filter row
+------+----+--------------+-----------+-------------+------------+---------+
|  [ ] |  1 | Acme Corp    | Active    | 2026-01-15  | $1,234.56  | ...     |
|  [ ] |  2 | Beta Inc     | Pending   | 2026-01-20  | $567.89    | ...     |
|  [ ] |  3 | Gamma LLC    | Active    | 2026-02-01  | $2,345.67  | ...     |
|  [ ] |  4 | (... virtual scrolling for large datasets ...)       |         |
+------+----+--------------+-----------+-------------+------------+---------+
|      |    | 3 rows       |           |             | Sum: $4,148|         | <- Footer row
+------+----+--------------+-----------+-------------+------------+---------+
| Showing 1-50 of 1,234  | < 1 2 3 ... 25 > | Rows: [50 v] | [Export] | <- Pagination bar
+---------------------------------------------------------------------------+
```

### 3.2 Element Breakdown

| Element | Required | Description |
|---------|----------|-------------|
| Root container | Yes | `div.datagrid` wrapping the entire component |
| Header row | Yes | `div.datagrid-header-row` with `role="row"` and `role="columnheader"` cells |
| Filter row | Optional | `div.datagrid-filter-row` with filter inputs per column |
| Scroll viewport | Yes | `div.datagrid-viewport` — scrollable body area |
| Body row | Yes (0+) | `div.datagrid-row` with `role="row"` and `role="gridcell"` cells |
| Footer row | Optional | `div.datagrid-footer-row` with aggregation values |
| Pagination bar | Optional | `div.datagrid-pagination` with page controls |
| Checkbox column | Optional | First column with `role="checkbox"` in each row |
| Row number column | Optional | Auto-numbered column when `showRowNumbers` is true |
| Column resize handle | Auto | `div.datagrid-resize-handle` between header cells |
| Empty state | Conditional | `div.datagrid-empty` or embedded EmptyState component |
| Live region | Yes | `div.visually-hidden[aria-live="polite"]` for announcements |

---

## 4. API

### 4.1 Interfaces

```typescript
/** Describes a single column in the DataGrid. */
interface DataGridColumn
{
    /** Unique column identifier. */
    id: string;

    /** Column header display label. */
    label: string;

    /** Initial width in px. Default: 120. */
    width?: number;

    /** Minimum width in px. Default: 60. */
    minWidth?: number;

    /** Maximum width in px. No default (unlimited). */
    maxWidth?: number;

    /** Whether the column is drag-resizable. Default: true. */
    resizable?: boolean;

    /** Whether clicking the header sorts this column. Default: true. */
    sortable?: boolean;

    /** Whether the column has a filter input. Default: false. */
    filterable?: boolean;

    /** Type of filter control. Default: "text". */
    filterType?: "text" | "select" | "number-range" | "date-range";

    /** Options for "select" filter type. */
    filterOptions?: Array<{ value: string; label: string }>;

    /** Whether cells in this column are inline-editable. Default: false. */
    editable?: boolean;

    /** Type of inline editor. Default: "text". */
    editorType?: "text" | "number" | "select" | "date";

    /** Options for "select" editor type. */
    editorOptions?: Array<{ value: string; label: string }>;

    /** Cell text alignment. Default: "left". */
    align?: "left" | "center" | "right";

    /**
     * Custom cell renderer. Called for every cell in this column.
     * Receives the cell element, the row data, and the cell value.
     * Responsible for populating the cell element.
     */
    renderer?: (cell: HTMLElement, row: DataGridRow, value: unknown) => void;

    /**
     * Custom sort comparator. Receives two cell values.
     * Return negative, zero, or positive.
     */
    comparator?: (a: unknown, b: unknown) => number;

    /**
     * Aggregation function for the footer row.
     * Built-in: "sum", "avg", "count", "min", "max".
     * Custom: function receiving all column values, returning display string.
     */
    aggregate?: "sum" | "avg" | "count" | "min" | "max"
        | ((values: unknown[]) => string);

    /** Additional CSS class(es) applied to cells in this column. */
    cssClass?: string;

    /** Pin this column to left or right edge (sticky). */
    pinned?: "left" | "right";

    /** Whether the column is hidden. Default: false. */
    hidden?: boolean;
}

/** Represents a single row in the DataGrid. */
interface DataGridRow
{
    /** Unique row identifier. */
    id: string;

    /** Row data keyed by column ID. */
    data: Record<string, unknown>;

    /** Additional CSS class(es) applied to this row. */
    cssClass?: string;

    /** Whether the row is non-interactive. Default: false. */
    disabled?: boolean;
}

/** Configuration options for the DataGrid component. */
interface DataGridOptions
{
    /** Column definitions. Required. */
    columns: DataGridColumn[];

    /** Initial row data. Default: []. */
    rows?: DataGridRow[];

    /** Rows per page. 0 = no pagination (show all). Default: 50. */
    pageSize?: number;

    /** Available page size options for the dropdown. e.g., [25, 50, 100, 250]. */
    pageSizeOptions?: number[];

    /**
     * Server-side data mode. When true, the grid does not sort, filter,
     * or paginate internally. It fires callbacks and expects the consumer
     * to provide updated rows. Default: false.
     */
    serverSide?: boolean;

    /**
     * Virtual scrolling mode. Default: "auto".
     * - "auto": activates when row count exceeds 5,000.
     * - "enabled": always active.
     * - "disabled": never active (renders all rows in DOM).
     */
    virtualScrolling?: "auto" | "enabled" | "disabled";

    /**
     * Row selection mode. Default: false (no selection).
     * - false: no selection.
     * - "single": click to select one row.
     * - "multi": Ctrl+Click and Shift+Click for multiple rows.
     * - "checkbox": checkbox column for multi-selection.
     */
    selectable?: boolean | "single" | "multi" | "checkbox";

    /** Show an auto-numbered row number column. Default: false. */
    showRowNumbers?: boolean;

    /** Show the footer aggregation row. Default: false. */
    showFooter?: boolean;

    /** Alternating row background striping. Default: true. */
    striped?: boolean;

    /** Compact row height (24px instead of 32px). Default: false. */
    dense?: boolean;

    /** Allow column reorder via drag-and-drop. Default: true. */
    enableColumnReorder?: boolean;

    /**
     * External sort mode. When true, the grid only updates sort indicators
     * and fires onSort. The consumer sorts the data. Default: false.
     */
    externalSort?: boolean;

    /**
     * External filter mode. When true, the grid fires onFilter but does not
     * filter rows internally. Default: false.
     */
    externalFilter?: boolean;

    /** CSS height of the grid. Default: "400px". */
    height?: string;

    /** EmptyState options displayed when the grid has no rows. */
    emptyStateOptions?: object;

    /** Additional CSS class(es) for the root element. */
    cssClass?: string;

    // -- Callbacks --------------------------------------------------------

    /** Called when sort state changes (click header, multi-sort). */
    onSort?: (
        sorts: Array<{ columnId: string; direction: "asc" | "desc" }>
    ) => void;

    /** Called when filter values change. */
    onFilter?: (filters: Record<string, unknown>) => void;

    /** Called when the active page or page size changes. */
    onPageChange?: (page: number, pageSize: number) => void;

    /**
     * Called when a cell edit is committed. Return false to reject the edit.
     * Returning void or true accepts the edit.
     */
    onCellEdit?: (
        rowId: string,
        columnId: string,
        oldValue: unknown,
        newValue: unknown
    ) => boolean | void;

    /** Called when the set of selected row IDs changes. */
    onRowSelect?: (selectedIds: string[]) => void;

    /** Called on single-click of a row. */
    onRowClick?: (row: DataGridRow) => void;

    /** Called on double-click of a row. */
    onRowDoubleClick?: (row: DataGridRow) => void;

    /** Called when a column is resized. */
    onColumnResize?: (columnId: string, width: number) => void;

    /** Called when a column is reordered. */
    onColumnReorder?: (columnId: string, newIndex: number) => void;

    /** Called when CSV export completes. */
    onExport?: (format: "csv") => void;
}
```

### 4.2 Class: DataGrid

| Method | Signature | Description |
|--------|-----------|-------------|
| `constructor` | `(options: DataGridOptions)` | Creates the grid DOM tree. Does not attach to the page. |
| `show` | `(containerId: string)` | Appends the grid to the container element. |
| `hide` | `()` | Removes from DOM without destroying state. |
| `destroy` | `()` | Hides, removes all listeners, nulls references. |
| `getElement` | `(): HTMLElement` | Returns the root `div.datagrid` DOM element. |
| `setRows` | `(rows: DataGridRow[])` | Replaces all row data. Resets to page 1. Recalculates aggregation. |
| `addRow` | `(row: DataGridRow, index?: number)` | Inserts a row at the given index (or appends). |
| `removeRow` | `(rowId: string)` | Removes the row with the given ID. |
| `updateRow` | `(rowId: string, data: Partial<Record<string, unknown>>)` | Merges data into an existing row. Re-renders the row. |
| `getRow` | `(rowId: string): DataGridRow \| null` | Returns the row data object, or null. |
| `getSelectedRows` | `(): DataGridRow[]` | Returns all currently selected rows. |
| `selectRow` | `(rowId: string)` | Programmatically selects a row. |
| `deselectRow` | `(rowId: string)` | Programmatically deselects a row. |
| `selectAll` | `()` | Selects all non-disabled rows on the current page. |
| `deselectAll` | `()` | Clears all selection. |
| `setPage` | `(page: number)` | Navigates to the given page (1-based). |
| `getPage` | `(): number` | Returns the current page number. |
| `getPageCount` | `(): number` | Returns the total number of pages. |
| `setPageSize` | `(size: number)` | Changes the page size. Resets to page 1. |
| `sort` | `(columnId: string, direction?: "asc" \| "desc")` | Sorts by the given column. Toggles direction if omitted. |
| `clearSort` | `()` | Removes all sort state. |
| `setFilter` | `(columnId: string, value: unknown)` | Applies a filter value to the given column. |
| `clearFilters` | `()` | Removes all active filters. |
| `refresh` | `()` | Re-renders the grid body from current data and state. |
| `exportCSV` | `(filename?: string)` | Exports visible data as CSV. Default filename: `"export.csv"`. |
| `getColumns` | `(): DataGridColumn[]` | Returns the current column definitions. |
| `showColumn` | `(columnId: string)` | Makes a hidden column visible. |
| `hideColumn` | `(columnId: string)` | Hides a visible column. |
| `setColumnWidth` | `(columnId: string, width: number)` | Programmatically resizes a column. |
| `scrollToRow` | `(rowId: string)` | Scrolls the viewport to bring the row into view. |

### 4.3 Convenience Functions

| Function | Description |
|----------|-------------|
| `createDataGrid(options)` | Creates and returns a DataGrid instance. |

### 4.4 Global Exports

```
window.DataGrid
window.createDataGrid
```

---

## 5. Behaviour

### 5.1 Lifecycle

1. **Construction** -- Builds the complete DOM tree from `options.columns` and `options.rows`. Does not attach to the page. Initialises internal state: row index map, selection set, sort state, filter state, pagination state.
2. **show(containerId)** -- Resolves the container element, appends the grid root. Measures viewport, activates virtual scrolling if applicable, calculates initial column widths.
3. **hide()** -- Removes from DOM. Preserves all internal state for re-show.
4. **destroy()** -- Calls hide, removes all event listeners, clears maps and sets, nulls internal references. Sets a `destroyed` flag; subsequent calls warn and no-op.

### 5.2 Sorting

**Single-column sort:**
1. Click a sortable column header.
2. First click: sort ascending. Second click: sort descending. Third click: clear sort.
3. The header cell displays a sort indicator arrow (up or down) and receives `aria-sort="ascending"` or `aria-sort="descending"`.
4. When `externalSort` is false, the grid sorts rows internally using a type-aware comparator: numbers sort numerically, strings sort case-insensitively via `localeCompare`, nulls sort to the end.
5. If the column defines a custom `comparator`, it is used instead of the default.
6. When `externalSort` is true, the grid only updates visual indicators and fires `onSort`. The consumer is responsible for sorting and calling `setRows()`.

**Multi-column sort (Shift+Click):**
1. Shift+Click a sortable header to add it to the sort stack.
2. The sort stack is ordered by the sequence of Shift+Clicks (primary, secondary, tertiary, etc.).
3. Each column in the stack displays its sort direction and its priority number (1, 2, 3...).
4. Shift+Click the same column again to toggle its direction or remove it.
5. A plain click (without Shift) replaces the entire sort stack with a single-column sort.

**Implementation:** Stable sort via `Array.prototype.sort()` with a chained comparator that evaluates sort columns in priority order.

### 5.3 Filtering

When a column has `filterable: true`, the filter row displays an appropriate filter control below the column header.

| Filter Type | Control | Behaviour |
|-------------|---------|-----------|
| `"text"` | Text input with placeholder "Filter..." | Case-insensitive substring match. Debounced 250ms. |
| `"select"` | `<select>` dropdown with an "All" option | Exact match against `filterOptions` values. Immediate on change. |
| `"number-range"` | Two number inputs: min and max | Inclusive range match. Either field may be empty. Debounced 250ms. |
| `"date-range"` | Two date inputs: from and to | Inclusive date range match. Either field may be empty. Debounced 250ms. |

**Client-side filtering** (`externalFilter: false`): The grid applies all active filters as a logical AND across columns. Rows passing all filters are the "filtered set" used for sorting, pagination, and aggregation.

**Server-side filtering** (`externalFilter: true`): The grid fires `onFilter(filters)` with the current filter state but does not filter rows internally. The consumer fetches filtered data and calls `setRows()`.

**Filter state format** passed to `onFilter`:
```typescript
{
    "name": "acme",                          // text filter
    "status": "active",                      // select filter
    "amount": { min: 100, max: 5000 },       // number-range filter
    "created": { from: "2026-01-01", to: "2026-02-28" } // date-range filter
}
```

### 5.4 Pagination

When `pageSize > 0`, the pagination bar renders below the grid body.

**Pagination bar elements:**
- **Row count label**: "Showing 1-50 of 1,234" (or "No rows" when empty).
- **Page buttons**: First (1), last (N), current, and up to 2 neighbours. Ellipsis (...) for gaps.
- **Previous/Next arrows**: `<` and `>` buttons. Disabled on first/last page.
- **Page size dropdown**: `<select>` with `pageSizeOptions` values. Default: [25, 50, 100, 250].
- **Export button**: "Export" button triggering CSV download.

**Client-side pagination** (`serverSide: false`): The grid slices the filtered+sorted row array by `(page - 1) * pageSize` to `page * pageSize`. Page count is `ceil(filteredRows.length / pageSize)`.

**Server-side pagination** (`serverSide: true`): The grid fires `onPageChange(page, pageSize)`. The consumer fetches the page and calls `setRows()`. The consumer must also provide total row count information for the "Showing X-Y of Z" label and page count calculation. This is communicated via `setTotalRowCount(count)` or by setting `rows` with a metadata convention.

### 5.5 Virtual Scrolling

For large datasets, virtual scrolling renders only the visible rows plus a buffer, keeping DOM element count constant regardless of total rows.

**Activation:**
- `"auto"` (default): activates when total rows exceed 5,000.
- `"enabled"`: always active.
- `"disabled"`: renders all rows in DOM.

**Implementation:**
1. The viewport `div.datagrid-viewport` has a fixed CSS height and `overflow-y: auto`.
2. A sentinel `div.datagrid-scroll-sentinel` inside the viewport has its height set to `totalRows * rowHeight` to produce the correct scrollbar range.
3. Body rows are absolutely positioned within the viewport at `top: rowIndex * rowHeight`.
4. On scroll, the grid calculates the first visible row index (`Math.floor(scrollTop / rowHeight)`) and renders rows in the range `[firstVisible - buffer, firstVisible + visibleCount + buffer]`.
5. Buffer size: 20 rows above and below the viewport (40 total buffer rows).
6. DOM element recycling pool: reuse detached row elements to avoid allocation during scroll.
7. Scroll handler is throttled via `requestAnimationFrame` for smooth 60fps scrolling.
8. Row height is fixed: 32px (default) or 24px (dense mode). Variable row heights are not supported.

**Interaction with pagination:** When both pagination and virtual scrolling are active, virtual scrolling applies within the current page's row set.

### 5.6 Inline Cell Editing

When a column has `editable: true`, its cells support inline editing.

**Activation:**
- Press **Enter** or **F2** on a focused editable cell.
- Double-click an editable cell.

**Editor types:**

| Type | Element | Behaviour |
|------|---------|-----------|
| `"text"` | `<input type="text">` | Pre-filled with current value. |
| `"number"` | `<input type="number">` | Pre-filled with current value. Validates numeric input. |
| `"select"` | `<select>` | Options from `editorOptions`. Pre-selected to current value. |
| `"date"` | `<input type="date">` | Pre-filled with current value in ISO format. |

**Edit lifecycle:**
1. **Start**: Replace cell content with the editor element. Auto-focus and select all text (for text/number). Fire no callback at this stage.
2. **Commit (Enter or Tab)**: Read the new value from the editor. If `onCellEdit(rowId, columnId, oldValue, newValue)` returns `false`, reject the edit and revert. Otherwise, update the internal row data and re-render the cell. Tab commits and moves focus to the next editable cell.
3. **Cancel (Escape)**: Revert the cell to its original content. Return focus to the cell.
4. **Blur**: Same as commit (Enter).

**Disabled rows**: Cells in rows with `disabled: true` are never editable, even if the column has `editable: true`.

### 5.7 Row Selection

| Mode | Behaviour |
|------|-----------|
| `false` | No selection. Rows are not highlighted on click. |
| `"single"` | Click selects one row and deselects all others. |
| `"multi"` | Click selects one row. Ctrl+Click toggles. Shift+Click selects range. Ctrl+A selects all on current page. |
| `"checkbox"` | A checkbox column is prepended. Header checkbox toggles select all / deselect all for the current page. Per-row checkbox toggles individual selection. Ctrl+Click and Shift+Click also work. |

**Selection state**: Maintained as a `Set<string>` of selected row IDs. Selection persists across page changes (selected rows on other pages remain selected).

**Callbacks**: `onRowSelect(selectedIds)` fires after every selection change with the full set of selected IDs (across all pages).

### 5.8 Column Resize

Drag the border between two header cells to resize the left column.

1. On `pointerdown` on a resize handle, call `setPointerCapture(pointerId)` for reliable cross-element tracking.
2. On `pointermove`, calculate `newWidth = startWidth + (clientX - startX)`.
3. Clamp to `[minWidth, maxWidth]`.
4. Apply the new width as inline styles (ADR-022) to the header cell and all body cells in that column.
5. On `pointerup`, release pointer capture. Fire `onColumnResize(columnId, newWidth)`.

**Cursor**: `col-resize` on hover over the resize handle and during drag.

**Pinned columns**: Pinned column resize works the same way, but the sticky offset of subsequent pinned columns is recalculated.

### 5.9 Column Reorder

When `enableColumnReorder` is true, column headers are draggable.

1. **Drag start**: `mousedown` + 5px movement threshold on a column header. The header receives a ghost-style opacity (0.5). A visual drop indicator (vertical blue line) appears between columns.
2. **Drag over**: The drop indicator moves to the nearest column boundary as the pointer moves.
3. **Drop**: The column is moved to the new position in the internal column array. The grid re-renders header, filter row, body, and footer. `onColumnReorder(columnId, newIndex)` fires.
4. **Restrictions**: Pinned columns cannot be reordered past other pinned columns. The checkbox column and row number column are not reorderable.

### 5.10 Footer Aggregation

When `showFooter` is true, a footer row renders below the body (or below the last visible row in virtual scrolling mode).

For each column with an `aggregate` property:
- **Built-in aggregations** operate on the current filtered row set:
  - `"sum"`: Numeric sum. Non-numeric values are ignored.
  - `"avg"`: Numeric average. Non-numeric values are ignored.
  - `"count"`: Count of non-null values.
  - `"min"`: Minimum numeric value.
  - `"max"`: Maximum numeric value.
- **Custom aggregation**: The function receives an array of all column values from the filtered set and returns a display string.

Footer cells that have no aggregation configured display empty content.

The footer row uses `role="row"` with `role="gridcell"` children. Aggregation values are rendered via `textContent`. The footer row has a distinct background (`$gray-100`) and bold text to differentiate it from data rows.

### 5.11 CSV Export

The `exportCSV(filename?)` method exports the current view (filtered + sorted rows, all pages) as a comma-separated values file.

1. Build a header line from visible column labels.
2. For each row in the filtered+sorted set (all pages, not just the current page), extract cell values by column ID.
3. Escape values containing commas, double quotes, or newlines per RFC 4180.
4. Create a `Blob` with MIME type `text/csv;charset=utf-8`.
5. Create a temporary `<a>` element with `href = URL.createObjectURL(blob)` and `download = filename`.
6. Programmatically click the link, then revoke the object URL.
7. Fire `onExport("csv")` after the download is initiated.

Hidden columns are excluded from the export. The checkbox column and row number column are excluded.

### 5.12 Empty State

When the grid has no rows (or all rows are filtered out), the body area displays an empty state:
- If `emptyStateOptions` is provided, an embedded EmptyState component is rendered using those options.
- If not provided, a default message "No data to display" is shown in the centre of the viewport area.

---

## 6. Styling

### 6.1 CSS Classes

| Class | Description |
|-------|-------------|
| `.datagrid` | Root container |
| `.datagrid-dense` | Compact row height modifier |
| `.datagrid-striped` | Row striping modifier |
| `.datagrid-header` | Header area (header row + filter row) |
| `.datagrid-header-row` | Header row containing column headers |
| `.datagrid-header-cell` | Individual column header cell |
| `.datagrid-header-cell-sortable` | Header cell that supports sorting (cursor pointer) |
| `.datagrid-header-cell-sorted` | Header cell with active sort |
| `.datagrid-sort-indicator` | Sort arrow icon within header cell |
| `.datagrid-sort-priority` | Multi-sort priority number badge |
| `.datagrid-resize-handle` | Drag handle between header cells |
| `.datagrid-filter-row` | Filter row below the header |
| `.datagrid-filter-cell` | Individual filter cell |
| `.datagrid-filter-input` | Text/number filter input |
| `.datagrid-filter-select` | Select/dropdown filter |
| `.datagrid-filter-range` | Container for range inputs (number or date) |
| `.datagrid-viewport` | Scrollable body area |
| `.datagrid-scroll-sentinel` | Height sentinel for virtual scrolling |
| `.datagrid-row` | Body data row |
| `.datagrid-row-selected` | Selected row state |
| `.datagrid-row-disabled` | Disabled row state |
| `.datagrid-row-hover` | Hover state (applied via CSS :hover) |
| `.datagrid-row-even` | Even row (for striping) |
| `.datagrid-row-odd` | Odd row (for striping) |
| `.datagrid-cell` | Individual body cell |
| `.datagrid-cell-focused` | Keyboard-focused cell |
| `.datagrid-cell-editing` | Cell in edit mode |
| `.datagrid-cell-align-left` | Left-aligned cell |
| `.datagrid-cell-align-center` | Centre-aligned cell |
| `.datagrid-cell-align-right` | Right-aligned cell |
| `.datagrid-cell-pinned-left` | Left-pinned sticky cell |
| `.datagrid-cell-pinned-right` | Right-pinned sticky cell |
| `.datagrid-checkbox` | Checkbox element in selection column |
| `.datagrid-row-number` | Row number cell |
| `.datagrid-editor` | Inline editor element (input or select) |
| `.datagrid-footer-row` | Footer aggregation row |
| `.datagrid-footer-cell` | Individual footer cell |
| `.datagrid-pagination` | Pagination bar container |
| `.datagrid-pagination-info` | "Showing X-Y of Z" label |
| `.datagrid-pagination-pages` | Page button group |
| `.datagrid-pagination-btn` | Individual page button |
| `.datagrid-pagination-btn-active` | Current page button |
| `.datagrid-pagination-size` | Page size dropdown |
| `.datagrid-pagination-export` | Export button |
| `.datagrid-empty` | Empty state container |
| `.datagrid-dragging-column` | Column header during reorder drag |
| `.datagrid-drop-indicator` | Vertical line indicating column drop position |

### 6.2 Theme Integration

| Property | Value | Rationale |
|----------|-------|-----------|
| Background | `$gray-50` | Clean, content-forward grid background |
| Header row background | `$gray-100` | Distinct from body rows |
| Header text | `$gray-900`, `$font-weight-semibold` | High contrast, clear hierarchy |
| Header hover | `$gray-200` background | Interactive affordance for sortable columns |
| Filter row background | `$gray-50` | Subtle separation from header |
| Filter inputs | Bootstrap `form-control-sm` styling | Consistent with project form patterns |
| Body row background (default) | `$gray-50` | Base row colour |
| Body row background (striped even) | `$gray-100` | Alternating stripe |
| Body row hover | `$gray-200` background | Subtle highlight |
| Body row selected | `rgba($primary, 0.08)` background, `$primary` left border (2px) | Clear selection indicator |
| Body row disabled | `$gray-400` text, 0.6 opacity | Standard disabled pattern |
| Cell text | `$gray-900`, `$font-size-sm` (0.8rem) | Readable at compact density |
| Cell border | `1px solid $gray-200` bottom border | Light grid lines |
| Focused cell | `2px solid $primary` outline, `-2px` outline offset | Clear keyboard focus ring |
| Footer row background | `$gray-100` | Distinct summary row |
| Footer text | `$gray-900`, `$font-weight-bold` | Bold aggregation values |
| Pagination background | `$gray-50` | Consistent with body |
| Pagination button | Bootstrap `.btn-outline-secondary.btn-sm` | Standard button styling |
| Pagination active page | Bootstrap `.btn-primary.btn-sm` | Highlighted current page |
| Sort indicator | `$gray-500` (inactive), `$primary` (active) | Clear sort state |
| Resize handle | `$gray-300` (idle), `$primary` (active drag) | Visible affordance |
| Column drop indicator | `2px solid $primary` | Clear reorder target |
| Checkbox | Bootstrap `.form-check-input` | Consistent checkbox styling |
| Editor input | `form-control-sm`, `$primary` border | Active editing state |
| Empty state text | `$gray-500`, italic | Subtle empty placeholder |
| SCSS import | `@import '../../src/scss/variables'` | Access project variables |

### 6.3 Dimensions

| Property | Default | Dense |
|----------|---------|-------|
| Row height | 32px | 24px |
| Header row height | 36px | 28px |
| Filter row height | 36px | 28px |
| Footer row height | 32px | 24px |
| Pagination bar height | 40px | 32px |
| Cell padding | `4px 8px` | `2px 6px` |
| Minimum column width | 60px | 60px |
| Default column width | 120px | 120px |
| Resize handle width | 6px | 6px |
| Checkbox column width | 40px | 32px |
| Row number column width | 50px | 40px |

### 6.4 Z-Index

The DataGrid is a flow-positioned component (not fixed/floating). It does not establish its own z-index stacking tier. Internal z-index values are relative:

| Element | Z-Index | Rationale |
|---------|---------|-----------|
| Header (sticky) | 2 | Above body rows during vertical scroll |
| Pinned columns | 1 | Above non-pinned cells during horizontal scroll |
| Pinned header cell | 3 | Above both header and pinned body cells |
| Filter dropdowns | 4 | Above header when open |
| Resize handle | 2 | Same as header |
| Column drop indicator | 5 | Above all grid content during drag |
| Inline editor | Auto | Within cell flow |

---

## 7. Keyboard Interaction

The DataGrid follows the [WAI-ARIA Grid Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/) for two-dimensional keyboard navigation.

### 7.1 Grid Navigation

| Key | Action |
|-----|--------|
| **Tab** | Moves focus into the grid (to the last-focused cell, or the first data cell). |
| **Shift+Tab** | Moves focus out of the grid. |
| **Right Arrow** | Moves focus to the next cell in the row. |
| **Left Arrow** | Moves focus to the previous cell in the row. |
| **Down Arrow** | Moves focus to the same column in the next row. |
| **Up Arrow** | Moves focus to the same column in the previous row. |
| **Home** | Moves focus to the first cell in the current row. |
| **End** | Moves focus to the last cell in the current row. |
| **Ctrl+Home** | Moves focus to the first cell in the first row. |
| **Ctrl+End** | Moves focus to the last cell in the last row. |
| **Page Down** | Scrolls down by one viewport page of rows. Focus follows. |
| **Page Up** | Scrolls up by one viewport page of rows. Focus follows. |

### 7.2 Selection

| Key | Action |
|-----|--------|
| **Space** | Toggles the checkbox of the focused row (checkbox mode). Selects the focused row (single/multi mode). |
| **Ctrl+A** | Selects all non-disabled rows on the current page (multi/checkbox mode). |
| **Shift+Down/Up** | Extends selection range (multi/checkbox mode). |

### 7.3 Editing

| Key | Action |
|-----|--------|
| **Enter** | Activates the inline editor on an editable focused cell. If editing, commits the edit and moves focus down. |
| **F2** | Activates the inline editor on an editable focused cell. |
| **Escape** | Cancels the active edit. Returns focus to the cell. |
| **Tab** | Commits the active edit and moves focus to the next editable cell in the row. At the end of a row, wraps to the first editable cell of the next row. |
| **Shift+Tab** | Commits the active edit and moves focus to the previous editable cell. |

### 7.4 Sorting

| Key | Action |
|-----|--------|
| **Click header** | Single-column sort (cycles ascending, descending, none). |
| **Shift+Click header** | Adds column to multi-sort stack, or toggles direction if already in stack. |

### 7.5 Roving Tabindex

One cell in the grid has `tabindex="0"` at any time (the currently focused cell). All other cells have `tabindex="-1"`. Arrow keys move the active cell and update tabindex values. This ensures a single Tab stop for the grid widget.

---

## 8. Accessibility

The DataGrid follows the [WAI-ARIA Grid Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/).

### 8.1 ARIA Roles and Attributes

| Element | Attributes |
|---------|------------|
| Root container | `role="grid"`, `aria-label`, `aria-rowcount`, `aria-colcount` |
| Header row | `role="row"` |
| Header cell | `role="columnheader"`, `aria-sort="ascending" \| "descending" \| "none"` (if sortable) |
| Body row | `role="row"`, `aria-rowindex` (1-based, relative to full dataset) |
| Body cell | `role="gridcell"` |
| Checkbox (header) | `role="checkbox"`, `aria-checked="true" \| "false" \| "mixed"`, `aria-label="Select all"` |
| Checkbox (row) | `role="checkbox"`, `aria-checked="true" \| "false"`, `aria-label="Select row"` |
| Filter input | `aria-label="Filter [column label]"` |
| Footer row | `role="row"` |
| Footer cell | `role="gridcell"` |
| Pagination container | `<nav role="navigation" aria-label="Pagination">` |
| Pagination button | `aria-label="Page N"` or `"Previous page"` / `"Next page"` |
| Pagination current | `aria-current="page"` |
| Page size dropdown | `aria-label="Rows per page"` |

### 8.2 Live Region Announcements

A visually hidden `div[aria-live="polite"]` announces state changes:

| Event | Announcement |
|-------|-------------|
| Sort applied | "Sorted by [column] [ascending/descending]" |
| Multi-sort | "Sorted by [col1] ascending, [col2] descending" |
| Filter applied | "[N] rows match filter" |
| Filter cleared | "Filters cleared, showing [N] rows" |
| Page change | "Page [N] of [M]" |
| Selection change | "[N] rows selected" |
| Edit committed | "[column] updated to [value]" |
| Export completed | "CSV exported" |

### 8.3 Focus Management

- After sort: focus remains on the header cell that was clicked.
- After filter: focus remains in the filter input.
- After page change: focus moves to the first data cell on the new page.
- After edit commit (Enter): focus moves to the cell below (same column, next row).
- After edit commit (Tab): focus moves to the next editable cell.
- After edit cancel (Escape): focus returns to the cell.
- After row deletion: focus moves to the next row, or the previous row if the last row was deleted.
- After selection (Space/click): focus remains on the activated row.

---

## 9. Dependencies

- **Bootstrap 5 CSS** -- `$gray-*` variables, `.form-control-sm`, `.btn-*`, `.form-check-input`, spacing utilities.
- **Bootstrap Icons** -- sort arrows (`bi-caret-up-fill`, `bi-caret-down-fill`), export icon, pagination arrows.
- **EmptyState component** -- optional dependency for `emptyStateOptions`.
- No JavaScript framework dependencies.
- No external data or grid libraries.

---

## 10. Open Questions

| # | Question | Impact |
|---|----------|--------|
| 1 | Should the grid support variable row heights (e.g., multi-line cells)? This would complicate virtual scrolling significantly. | Performance / complexity trade-off. Recommend fixed row height for v1. |
| 2 | Should server-side mode accept a total row count via a dedicated method or through a property on the options? | API design. Propose `setTotalRowCount(count: number)` method. |
| 3 | Should column state persistence (widths, order, visibility, sort, filters) be built in or left to the consumer? | Feature scope. Recommend consumer-managed for v1 via `getColumns()` + `onColumnResize` / `onColumnReorder`. |
| 4 | Should the grid support grouped headers (multi-level column headers where a parent spans child columns)? | UI complexity. Recommend deferral to v2. |
| 5 | Should the export feature support formats beyond CSV (e.g., Excel XLSX, JSON)? | Dependency impact (XLSX requires a library). Recommend CSV-only for v1. |
| 6 | Should clipboard copy (Ctrl+C on selected cells/rows) be supported? | Feature scope. Recommend deferral to v2. |
| 7 | How should the DataGrid integrate with DockLayout and contained mode? As a flow-positioned component, it should work naturally inside a layout cell. Confirm no `contained` option is needed. | Integration. Likely no action needed. |

---

## 11. Implementation Notes

### 11.1 Row Index Map

Maintain a `Map<string, DataGridRow>` mapping row IDs to row data objects. Built on `setRows()` and constructor. Incrementally updated by `addRow()`, `removeRow()`, `updateRow()`. Enables O(1) row lookups by ID.

### 11.2 Column Width Management (ADR-022)

All column widths are applied as inline styles on every header cell, filter cell, body cell, and footer cell. The `updateColumnWidths()` helper is called after every body rebuild (setRows, sort, filter, page change, addRow, removeRow) to keep widths consistent. This follows the same approach proven in TreeGrid.

### 11.3 Selection State

Maintain a `Set<string>` of selected row IDs. Selection persists across page changes — selecting a row on page 1, then navigating to page 2, does not deselect the page 1 row. `getSelectedRows()` iterates the set and resolves each ID via the row index map.

For Shift+Click range selection, maintain `lastClickedRowId`. The range is computed over the current page's visible row order between the last-clicked and the Shift+Clicked row.

### 11.4 Virtual Scrolling

Reuse the viewport + buffer approach established in TreeView (ADR-020):
- Fixed-height rows enable simple `scrollTop / rowHeight` index calculation.
- DOM element recycling pool of ~80 elements (viewport + 2 * buffer).
- `requestAnimationFrame`-throttled scroll handler.
- Event delegation on the viewport container (single click/dblclick/keydown listener).
- Scroll sentinel element provides the correct scrollbar height.

### 11.5 Filter Debounce

Text and range filter inputs use a 250ms debounce timer. Each keystroke resets the timer. When the timer fires, the grid re-applies all filters and re-renders. Select filters fire immediately on `change`.

### 11.6 CSV Export

```typescript
function escapeCSVValue(value: unknown): string
{
    const str = (value == null) ? "" : String(value);

    if (str.includes(",") || str.includes('"') || str.includes("\n"))
    {
        return '"' + str.replace(/"/g, '""') + '"';
    }

    return str;
}
```

### 11.7 Aggregation Calculation

Footer aggregation is recalculated whenever the filtered row set changes (after filter, sort, setRows, addRow, removeRow). The `calculateAggregates()` helper iterates the filtered row set once, collecting per-column value arrays, then computes each column's aggregate.

### 11.8 Pointer Capture for Column Resize

Same pattern as TreeGrid and Sidebar:
```typescript
handle.addEventListener("pointerdown", (e: PointerEvent) =>
{
    handle.setPointerCapture(e.pointerId);
    const startX = e.clientX;
    const startWidth = column.width;
    // ... pointermove / pointerup handlers
});
```

### 11.9 Column Reorder Drag

Use native HTML5 Drag and Drop API on header cells (`draggable="true"`). Set `dataTransfer` with the column ID. On `dragover`, calculate the nearest column boundary by comparing `event.clientX` against header cell `getBoundingClientRect()` midpoints. On `drop`, reorder the internal column array and call `refresh()`.

### 11.10 Defensive Destroy

The `destroy()` method must:
1. Set an internal `destroyed` flag.
2. Cancel any pending filter debounce timers.
3. Close any active inline editor (cancel without commit).
4. Remove all event listeners (click, dblclick, keydown, pointerdown, scroll, dragstart, dragover, drop).
5. Clear the row map, selection set, and column state.
6. Remove all child DOM elements from the container.
7. Null internal references to prevent memory leaks.

---

## 12. Performance Considerations

| Concern | Strategy |
|---------|----------|
| Large datasets (100K+ rows) | Virtual scrolling with DOM recycling. Only ~80 DOM elements regardless of row count. |
| Sort performance | Stable `Array.prototype.sort()` with pre-extracted values. O(N log N). |
| Filter performance | Single pass over all rows per filter change. O(N) per column, O(N * C) total. |
| DOM updates | Batch all measurement reads before mutation writes. Use `requestAnimationFrame` for scroll. |
| Event handling | Single delegated click/keydown listener on the viewport container. |
| Aggregation | Single pass over filtered rows. Computed lazily (only when `showFooter` is true). |
| Column resize | Inline style updates on all visible cells. In virtual scrolling mode, only ~80 cells. |
| Memory | Row data stored by reference (not cloned). DOM elements recycled, not created/destroyed. |

---

## 13. Edge Cases

| Scenario | Behaviour |
|----------|-----------|
| Empty rows array | Show empty state. Header, filter row, and pagination render normally. Footer shows "0" for count. |
| All rows filtered out | Show empty state with message "No rows match the current filters". Footer shows "0". |
| Single row | Renders normally. Pagination shows "Showing 1-1 of 1". |
| Zero columns | Console error logged. Grid renders empty. |
| Duplicate row IDs | Console warning logged. First row with the ID wins in lookups. |
| Duplicate column IDs | Console warning logged. First column with the ID wins. |
| Column width below minWidth | Clamped to minWidth. |
| Column width above maxWidth | Clamped to maxWidth. |
| Page number beyond range | Clamped to [1, pageCount]. |
| setRows() during active edit | Active edit is cancelled (no commit). New data is rendered. |
| setRows() during column resize | Resize is cancelled. New data is rendered. |
| Sort column with mixed types | Numbers sort numerically, strings sort alphabetically, nulls sort to end. |
| Filter on column with no data | No rows match. Empty state shown. |
| Export with no rows | Downloads an empty CSV (header row only). |
| Destroy while editing | Edit is cancelled. DOM is cleaned up. |
| Destroy while resizing | Pointer capture is released. DOM is cleaned up. |
| Multiple DataGrid instances | Each operates independently. No shared state or singleton manager. |
| Container element not found | `show()` logs error and returns without rendering. |
| scrollToRow for non-existent ID | Console warning logged. No scroll. |
| selectRow on disabled row | Selection is rejected. Console warning logged. |
| Virtual scrolling with < 5K rows on "auto" | Standard DOM rendering (no virtual scrolling). |

---

## 14. Files

| File | Purpose |
|------|---------|
| `specs/datagrid.prd.md` | This specification |
| `components/datagrid/datagrid.ts` | TypeScript source |
| `components/datagrid/datagrid.scss` | Styles |
| `components/datagrid/README.md` | Consumer documentation |

---

## 15. Future Considerations (Out of Scope for v1)

| Feature | Notes |
|---------|-------|
| **Grouped headers** | Multi-level column headers where a parent spans child columns (e.g., "Dates" > "Start" + "End"). |
| **Row grouping** | Auto-group rows by column value, creating collapsible sections (e.g., group by Status). |
| **Clipboard integration** | Ctrl+C to copy selected cells/rows as TSV. Ctrl+V to paste into editable cells. |
| **Excel export** | XLSX export via SheetJS or similar library. |
| **Column menu** | Right-click column header for sort, filter, hide, pin, and resize options. |
| **Master-detail rows** | Expandable rows revealing a detail panel or sub-grid. |
| **Conditional cell formatting** | Per-cell style rules via a `cellClass` callback returning CSS classes based on value. |
| **Frozen rows** | Pin rows to the top (e.g., totals row always visible). |
| **Context menu** | Right-click row for actions (copy, edit, delete, etc.). |
| **Column persistence** | Built-in save/restore of column widths, order, visibility, sort, and filter state. |
