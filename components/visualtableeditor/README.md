<!-- AGENT: Documentation for the VisualTableEditor component — cell-styled tabular data editor for diagrams, sidebars, and modals. -->

# VisualTableEditor

A compact, embeddable table component for editing and viewing styled tabular data. Unlike DataGrid (which targets data management with sorting, filtering, and pagination), VisualTableEditor is a **visual-first** component for presenting and editing cell-level styled tables -- analogous to table widgets in PowerPoint, Figma, draw.io, or Notion. Supports per-cell formatting, inline rich content (bold/italic/links/images), cell merging, presets, live aggregate summaries, undo/redo, and clipboard operations.

## Assets

| Asset | Path |
|-------|------|
| CSS | `components/visualtableeditor/visualtableeditor.css` |
| JS | `components/visualtableeditor/visualtableeditor.js` |
| Types | `components/visualtableeditor/visualtableeditor.d.ts` |

## Requirements

- **Bootstrap CSS** -- for SCSS variables and theme support
- **Bootstrap Icons** -- toolbar icons (`bi-type-bold`, `bi-table`, etc.)
- **InlineToolbar** -- formatting toolbar (reused)
- **ContextMenu** -- right-click menu (reused)
- **ColorPicker** -- text/background colour dropdowns (reused)
- Does **not** require Bootstrap JS.

## Quick Start

```html
<link rel="stylesheet" href="components/visualtableeditor/visualtableeditor.css">
<script src="components/visualtableeditor/visualtableeditor.js"></script>
<script>
    var table = createVisualTableEditor({
        container: "#my-container",
        mode: "edit",
        preset: "blue-header",
        data: {
            columns: [
                { id: "name", width: 180, align: "left" },
                { id: "role", width: 140, align: "left" },
                { id: "status", width: 100, align: "center" }
            ],
            rows: [
                {
                    id: "hdr",
                    cells: {
                        name: { value: "Name", style: { bold: true } },
                        role: { value: "Role", style: { bold: true } },
                        status: { value: "Status", style: { bold: true } }
                    }
                },
                {
                    id: "r1",
                    cells: {
                        name: { value: "Alice Chen" },
                        role: { value: "Engineer" },
                        status: { value: "Active", style: { color: "#198754" } }
                    }
                }
            ]
        }
    });
</script>
```

## API

### Factory

```typescript
function createVisualTableEditor(options: VisualTableEditorOptions): VisualTableEditor;
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `container` | `HTMLElement \| string` | **required** | Container element or CSS selector |
| `mode` | `"edit" \| "view"` | `"edit"` | Initial mode |
| `data` | `VisualTableData` | — | Initial table data (empty 3x3 if omitted) |
| `pageSize` | `number` | `0` | Rows per page (0 = auto-paginate at 500) |
| `showToolbar` | `boolean` | `true` | Show formatting toolbar in edit mode |
| `showRowNumbers` | `boolean` | `false` | Show row number gutter column |
| `resizableColumns` | `boolean` | `true` | Allow column resize by dragging |
| `resizableRows` | `boolean` | `false` | Allow row resize by dragging |
| `allowMerge` | `boolean` | `true` | Allow cell merging |
| `allowStructureEdit` | `boolean` | `true` | Allow adding/removing rows |
| `allowColumnEdit` | `boolean` | `true` | Allow adding/removing columns |
| `allowReorder` | `boolean` | `false` | Allow drag-reorder of rows and columns |
| `preset` | `string` | — | Named table preset (see Presets) |
| `compact` | `boolean` | `false` | Compact mode -- reduced padding/font |
| `contained` | `boolean` | `false` | Contained mode -- no viewport docking |
| `minWidth` | `number` | `200` | Minimum table width in px |
| `cssClass` | `string` | — | Additional CSS class on root element |

### Callbacks

| Callback | Signature | Description |
|----------|-----------|-------------|
| `onCellChange` | `(row, col, oldValue, newValue) => void` | Cell value changed |
| `onStyleChange` | `(row, col, style) => void` | Cell style changed |
| `onStructureChange` | `(action, detail) => void` | Row/column add/remove/resize/reorder |
| `onModeChange` | `(mode) => void` | Mode switched |
| `onChange` | `(data) => void` | Table data changed (debounced 300ms) |
| `onHeaderClick` | `(columnId, event) => void` | Header cell clicked (host sorting) |
| `onHeaderContextMenu` | `(columnId, event) => void` | Header cell right-clicked |
| `onSelectionChange` | `(selection) => void` | Selection changed |
| `onAggregateChange` | `(aggregates) => void` | Aggregates recomputed on selection |

### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `setMode(mode)` | `void` | Switch between `"edit"` and `"view"` |
| `getMode()` | `string` | Current mode |
| `getData()` | `VisualTableData` | Export full table data as JSON |
| `setData(data)` | `void` | Import table data (replaces current) |
| `clear()` | `void` | Reset to empty table |
| `getCellValue(row, col)` | `string` | Get cell text |
| `setCellValue(row, col, value)` | `void` | Set cell text |
| `getCellStyle(row, col)` | `VisualTableCellStyle` | Get cell style |
| `setCellStyle(row, col, style)` | `void` | Set cell style (merge with existing) |
| `getSelection()` | `CellRange[]` | Current selection |
| `setSelection(range)` | `void` | Select a contiguous range |
| `addToSelection(range)` | `void` | Add range to non-contiguous selection |
| `selectRow(rowIndex)` | `void` | Select entire row |
| `selectColumn(colIndex)` | `void` | Select entire column |
| `selectAll()` | `void` | Select all cells |
| `clearSelection()` | `void` | Deselect all |
| `insertRow(index?)` | `string` | Insert row, returns row ID |
| `removeRow(rowId)` | `void` | Remove a row |
| `insertColumn(index?)` | `string` | Insert column, returns column ID |
| `removeColumn(colId)` | `void` | Remove a column |
| `setColumnWidth(colId, width)` | `void` | Set column width |
| `setRowHeight(rowId, height)` | `void` | Set row height |
| `moveRow(from, to)` | `void` | Reorder a row |
| `moveColumn(from, to)` | `void` | Reorder a column |
| `mergeCells(range)` | `void` | Merge cells in range |
| `unmergeCells(row, col)` | `void` | Unmerge a merged cell |
| `applyStyleToSelection(style)` | `void` | Apply style to all selected cells |
| `applyPreset(name)` | `void` | Apply a named table preset |
| `setHeaderRows(count)` | `void` | Set number of header rows |
| `setAlternatingRows(enabled, color?)` | `void` | Toggle alternating row colours |
| `sortRows(comparator)` | `void` | Reorder rows using comparator |
| `filterRows(predicate)` | `void` | Show/hide rows by predicate |
| `clearFilter()` | `void` | Show all rows |
| `getAggregates(range?)` | `AggregateResult` | Compute aggregates for range or selection |
| `setFooterAggregate(type)` | `void` | Set table-level footer aggregate |
| `setColumnAggregate(colId, type)` | `void` | Set per-column footer aggregate |
| `showSummaryBar(show)` | `void` | Toggle summary bar visibility |
| `show()` | `void` | Show the component |
| `hide()` | `void` | Hide the component |
| `destroy()` | `void` | Remove DOM and release resources |
| `refresh()` | `void` | Re-render the table |

## Data Model

### VisualTableData

| Property | Type | Description |
|----------|------|-------------|
| `meta` | `VisualTableMeta` | Table-level metadata (header rows, alternating, borders, etc.) |
| `columns` | `VisualTableColumn[]` | Column definitions (id, width, alignment) |
| `rows` | `VisualTableRow[]` | Row data with cells keyed by column ID |

### VisualTableCell

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `value` | `string \| VisualTableCellContent[]` | — | Plain text or rich content segments |
| `style` | `VisualTableCellStyle` | — | Per-cell style overrides |
| `colspan` | `number` | `1` | Column span |
| `rowspan` | `number` | `1` | Row span |

### VisualTableCellContent

Rich content segment for mixed formatting within a cell (e.g., `"Total: **$1,250**"`).

| Property | Type | Description |
|----------|------|-------------|
| `type` | `"text" \| "link" \| "image"` | Content type |
| `text` | `string` | Text content (for text/link) |
| `url` | `string` | URL (for link href or image src) |
| `alt` | `string` | Alt text (for image) |
| `width` | `number` | Image width in px |
| `height` | `number` | Image height in px |
| `style` | `object` | Inline style: `bold`, `italic`, `underline`, `color`, `fontSize` |

### VisualTableCellStyle

| Property | Type | Description |
|----------|------|-------------|
| `background` | `string` | Background colour |
| `color` | `string` | Text colour |
| `fontFamily` | `string` | Font family |
| `fontSize` | `number` | Font size in px |
| `bold` | `boolean` | Bold |
| `italic` | `boolean` | Italic |
| `underline` | `boolean` | Underline |
| `align` | `"left" \| "center" \| "right"` | Horizontal alignment |
| `valign` | `"top" \| "middle" \| "bottom"` | Vertical alignment |
| `wrap` | `boolean` | Text wrapping (default: true) |
| `padding` | `number` | Cell padding in px |

## Example JSON

```json
{
    "meta": { "headerRows": 1, "alternatingRows": true, "bordered": true },
    "columns": [
        { "id": "name", "width": 180 },
        { "id": "role", "width": 140 },
        { "id": "status", "width": 100, "align": "center" }
    ],
    "rows": [
        {
            "id": "hdr",
            "cells": {
                "name": { "value": "Name", "style": { "bold": true, "background": "#0d6efd", "color": "#fff" } },
                "role": { "value": "Role", "style": { "bold": true, "background": "#0d6efd", "color": "#fff" } },
                "status": { "value": "Status", "style": { "bold": true, "background": "#0d6efd", "color": "#fff" } }
            }
        },
        { "id": "r1", "cells": { "name": { "value": "Alice" }, "role": { "value": "Engineer" }, "status": { "value": "Active", "style": { "color": "#198754" } } } },
        { "id": "r2", "cells": { "name": { "value": "Bob" }, "role": { "value": "Designer" }, "status": { "value": "Away", "style": { "color": "#fd7e14" } } } }
    ]
}
```

## Presets

Six built-in presets applied via `applyPreset(name)` or the `preset` option.

| Preset | Header BG | Alt Row | Description |
|--------|-----------|---------|-------------|
| `"blue-header"` | `#0d6efd` | `#e7f1ff` | Classic blue header, light blue stripes |
| `"dark-header"` | `#212529` | `#f8f9fa` | Dark header, subtle grey stripes |
| `"green-accent"` | `#198754` | `#e8f5e9` | Green header, light green stripes |
| `"warm"` | `#fd7e14` | `#fff3e0` | Warm orange header, cream stripes |
| `"minimal"` | transparent | none | No fills, bottom borders only |
| `"striped"` | `var(--bs-tertiary-bg)` | `var(--bs-tertiary-bg)` | Subtle grey, standard striped |

Presets set `meta` and header-row styles without overwriting per-cell overrides. The `"minimal"` and `"striped"` presets use CSS variables and adapt to dark mode automatically.

## Aggregates

Live aggregate computations on the current selection, displayed in an optional summary bar.

| Aggregate | Description |
|-----------|-------------|
| Sum | Total of numeric values |
| Average | Arithmetic mean |
| Count | Non-empty cells (all types) |
| Count Numbers | Cells with parseable numeric values |
| Min / Max | Smallest / largest numeric value |
| Median | Middle value when sorted |
| Mode | Most frequent numeric value |
| Std Dev | Population standard deviation |
| Range | Max minus Min |

Aggregates are **unit-aware**: only computed when all numeric cells share the same unit signature (e.g., all `$`-prefixed or all `%`-suffixed). Mixed units produce no result. Results reattach the unit prefix/suffix for display (e.g., `Sum: $1,250`).

Footer aggregate rows can be configured per-table or per-column. They are non-editable and recompute automatically on cell value changes.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Arrow keys | Move selection |
| Shift+Arrow | Extend contiguous range |
| Ctrl+Click | Toggle cell in non-contiguous selection |
| Tab / Shift+Tab | Next / previous cell |
| Enter / F2 | Begin editing selected cell |
| Escape | Cancel editing / clear selection |
| Delete / Backspace | Clear selected cell(s) |
| Ctrl+B / I / U | Toggle bold / italic / underline |
| Ctrl+A | Select all cells |
| Ctrl+C / V | Copy / paste (TSV format) |
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |

## Accessibility

- `role="grid"` on table, `role="row"`, `role="gridcell"` on cells
- `aria-colindex` / `aria-rowindex` on cells
- `aria-selected="true"` on selected cells
- `aria-readonly="false"` in edit mode
- Roving tabindex for single Tab stop
- `aria-label` on the table element
- Sufficient contrast ratios on all default colours

## Window Globals

| Global | Type |
|--------|------|
| `window.createVisualTableEditor` | `function(options): VisualTableEditor` |

See `specs/visualtableeditor.prd.md` for the complete specification.
