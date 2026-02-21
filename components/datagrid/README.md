# DataGrid

High-performance flat data table with sorting, filtering, pagination, column resize, row selection, inline editing, virtual scrolling, footer aggregation, and CSV export.

## Quick Start

```html
<link rel="stylesheet" href="components/datagrid/datagrid.css">
<script src="components/datagrid/datagrid.js"></script>
<script>
    var grid = createDataGrid({
        columns: [
            { id: "name", label: "Name", sortable: true, filterable: true },
            { id: "status", label: "Status", filterType: "select",
              filterOptions: [
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" }
              ]},
            { id: "amount", label: "Amount", align: "right", aggregate: "sum" }
        ],
        rows: [
            { id: "1", data: { name: "Acme Corp", status: "active", amount: 1234.56 } },
            { id: "2", data: { name: "Beta Inc", status: "inactive", amount: 567.89 } }
        ],
        showFooter: true,
        selectable: "checkbox"
    }, "my-container");
</script>
```

## API

### `DataGridOptions`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `columns` | `DataGridColumn[]` | *required* | Column definitions |
| `rows` | `DataGridRow[]` | `[]` | Initial row data |
| `pageSize` | `number` | `50` | Rows per page (0 = no pagination) |
| `pageSizeOptions` | `number[]` | `[25, 50, 100, 250]` | Page size dropdown options |
| `serverSide` | `boolean` | `false` | Server-side pagination mode |
| `virtualScrolling` | `"auto" \| "enabled" \| "disabled"` | `"auto"` | Virtual scrolling mode. "auto" activates above 5,000 rows |
| `selectable` | `boolean \| "single" \| "multi" \| "checkbox"` | `false` | Row selection mode |
| `showRowNumbers` | `boolean` | `false` | Show row number column |
| `showFooter` | `boolean` | `false` | Show footer aggregation row |
| `striped` | `boolean` | `true` | Alternating row backgrounds |
| `dense` | `boolean` | `false` | Compact row height (24px vs 32px) |
| `enableColumnReorder` | `boolean` | `false` | Allow drag-and-drop column reorder |
| `externalSort` | `boolean` | `false` | Disable built-in sorting (emit events only) |
| `externalFilter` | `boolean` | `false` | Disable built-in filtering (emit events only) |
| `height` | `string` | `"400px"` | Scroll container height |
| `emptyStateOptions` | `object` | — | Options for empty state display |
| `cssClass` | `string` | — | Additional CSS class on root |

### `DataGridColumn`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `id` | `string` | *required* | Unique column identifier |
| `label` | `string` | *required* | Column header text |
| `width` | `number` | `120` | Column width in pixels |
| `minWidth` | `number` | `60` | Minimum column width |
| `maxWidth` | `number` | — | Maximum column width |
| `resizable` | `boolean` | `true` | Allow column resize |
| `sortable` | `boolean` | `true` | Allow sorting |
| `filterable` | `boolean` | `false` | Show filter in filter row |
| `filterType` | `"text" \| "select" \| "number-range" \| "date-range"` | `"text"` | Filter input type |
| `filterOptions` | `Array<{ value, label }>` | — | Options for select filter |
| `editable` | `boolean` | `false` | Allow inline cell editing |
| `editorType` | `"text" \| "number" \| "select" \| "date"` | `"text"` | Editor input type |
| `editorOptions` | `Array<{ value, label }>` | — | Options for select editor |
| `align` | `"left" \| "center" \| "right"` | `"left"` | Cell text alignment |
| `renderer` | `(cell, row, value) => void` | — | Custom cell renderer |
| `comparator` | `(a, b) => number` | — | Custom sort comparator |
| `aggregate` | `"sum" \| "avg" \| "count" \| "min" \| "max" \| Function` | — | Footer aggregation |
| `cssClass` | `string` | — | Additional CSS class on cells |
| `pinned` | `"left" \| "right"` | — | Pin column to side |
| `hidden` | `boolean` | `false` | Hide column |

### `DataGridRow`

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique row identifier |
| `data` | `Record<string, unknown>` | Row data keyed by column ID |
| `cssClass` | `string` | Additional CSS class on row |
| `disabled` | `boolean` | Disable selection and editing |

### Callbacks

| Callback | Signature | Description |
|----------|-----------|-------------|
| `onSort` | `(sorts: SortEntry[]) => void` | Sort state changed |
| `onFilter` | `(filters: Record<string, unknown>) => void` | Filter state changed |
| `onPageChange` | `(page: number, pageSize: number) => void` | Page or page size changed |
| `onCellEdit` | `(rowId, colId, oldValue, newValue) => boolean \| void` | Cell edit committed. Return `false` to reject |
| `onRowSelect` | `(selectedIds: string[]) => void` | Selection changed |
| `onRowClick` | `(row: DataGridRow) => void` | Row clicked |
| `onRowDoubleClick` | `(row: DataGridRow) => void` | Row double-clicked |
| `onColumnResize` | `(columnId, width) => void` | Column resized |
| `onColumnReorder` | `(columnId, newIndex) => void` | Column reordered |
| `onExport` | `(format: "csv") => void` | Export completed |

### Methods

| Method | Description |
|--------|-------------|
| `show(containerId)` | Render into a container element |
| `hide()` | Remove from DOM (preserves state) |
| `destroy()` | Clean up all resources |
| `getElement()` | Returns the root DOM element |
| `setRows(rows)` | Replace all row data |
| `addRow(row, index?)` | Add a row at optional index |
| `removeRow(rowId)` | Remove a row by ID |
| `updateRow(rowId, data)` | Merge data into a row |
| `getRow(rowId)` | Get a row by ID |
| `setTotalRowCount(count)` | Set total count for server-side mode |
| `getSelectedRows()` | Get selected row objects |
| `selectRow(rowId)` | Select a row |
| `deselectRow(rowId)` | Deselect a row |
| `selectAll()` | Select all rows on current page |
| `deselectAll()` | Deselect all rows |
| `setPage(page)` | Navigate to a page |
| `getPage()` | Get current page number |
| `getPageCount()` | Get total page count |
| `setPageSize(size)` | Change rows per page |
| `sort(columnId, direction?)` | Sort by column |
| `clearSort()` | Clear all sorts |
| `setFilter(columnId, value)` | Set a column filter |
| `clearFilters()` | Clear all filters |
| `refresh()` | Re-process data and re-render |
| `exportCSV(filename?)` | Export filtered/sorted data as CSV |
| `getColumns()` | Get column definitions (copy) |
| `showColumn(columnId)` | Un-hide a column |
| `hideColumn(columnId)` | Hide a column |
| `setColumnWidth(columnId, width)` | Set column width |
| `scrollToRow(rowId)` | Scroll a row into view |

## Features

- **Sorting** — Click header to sort (asc/desc/none). Shift+Click for multi-column sort.
- **Filtering** — Text search (250ms debounce), select dropdown, number range, date range.
- **Pagination** — Page buttons with ellipsis, page size dropdown, "Showing X-Y of Z" info.
- **Column resize** — Pointer-capture drag on header borders with min/max constraints.
- **Column reorder** — HTML5 drag-and-drop on header cells.
- **Row selection** — Single, multi (Ctrl/Shift+Click), or checkbox with select-all.
- **Inline editing** — Text, number, select, date editors. Enter/Tab commit, Escape cancel.
- **Virtual scrolling** — Auto-activates above 5,000 rows. DOM recycling for 100K+ rows.
- **Footer aggregation** — Sum, average, count, min, max, or custom function per column.
- **CSV export** — RFC 4180 compliant. Downloads filtered/sorted visible data.
- **Dense mode** — Compact 24px rows for high-density data display.
- **Row striping** — Alternating backgrounds for readability (enabled by default).

## Keyboard

| Key | Action |
|-----|--------|
| Arrow keys | Navigate cells (2D grid pattern) |
| Home / End | First / last cell in row |
| Ctrl+Home / Ctrl+End | First / last cell in grid |
| Space | Toggle row selection |
| Enter / F2 | Start inline editing |
| Escape | Cancel editing |
| Tab / Shift+Tab | Next / previous editable cell (while editing) |
| Ctrl+A | Select all rows on page |

## Accessibility

- Full WAI-ARIA Grid pattern: `role="grid"`, `role="row"`, `role="columnheader"`, `role="gridcell"`
- `aria-sort` on sortable headers
- `aria-rowindex` on body rows
- Roving tabindex for single Tab stop
- Live region announcements for sort, filter, page, selection, and edit changes
- Checkbox `role="checkbox"` with `aria-checked` and `aria-label`
- Pagination `<nav>` with `aria-label="Pagination"` and `aria-current="page"`
