<!--
SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
SPDX-License-Identifier: MIT
-->

<!-- AGENT: Specification for the VisualTableEditor — a cell-styled tabular data editor for embedding in diagrams, sidebars, and modals. -->

# VisualTableEditor

| Field         | Value                                              |
|---------------|----------------------------------------------------|
| Status        | Draft                                              |
| Component     | `VisualTableEditor`                                |
| Folder        | `components/visualtableeditor/`                    |
| Factory       | `createVisualTableEditor(options)`                 |
| Spec author   | PVK + Claude                                       |
| Date          | 2026-03-31                                         |

---

## 1. Overview

### 1.1 What Is It

A compact, embeddable table component for editing and viewing styled tabular data.
Unlike the DataGrid (which is a data-management component for sorting, filtering,
pagination, and bulk operations), the VisualTableEditor is a **visual-first** component
for presenting and editing cell-level styled tables — analogous to the table widgets
found in PowerPoint, Figma, draw.io, or Notion.

### 1.2 What It Is NOT

- **Not a spreadsheet.** No cell-level formulas (`=SUM(A1:A10)`), no cell
  references, no dependency graphs, no multi-sheet support. Aggregate
  summaries (sum, average, etc.) are provided as a selection-level feature,
  not per-cell formulas.
- **Not a DataGrid replacement.** No sorting, filtering, column pinning, virtual
  scrolling, CSV export, or server-side pagination. Use DataGrid for those.
- **Not a full rich-text editor.** Cells support inline formatting (mixed
  bold/italic/underline within the same cell), links, and images — but not
  embedded interactive components, formulas, or arbitrary HTML.

### 1.3 Why Build It

| Problem                                                  | How VisualTableEditor Solves It                      |
|----------------------------------------------------------|------------------------------------------------------|
| DiagramEngine needs inline tabular data in shapes        | Embeddable component; renders inside foreignObject    |
| DataGrid is too heavy/complex for simple styled tables   | Lightweight, visual-first, no data-management chrome  |
| Bootstrap tables have no interactivity or cell styling   | Per-cell formatting, edit mode, JSON import/export    |
| No way to present a styled data table in a sidebar/modal | Compact, `contained: true` friendly, responsive       |

### 1.4 Design Inspiration

| Source                          | Key Pattern Adopted                                 |
|---------------------------------|-----------------------------------------------------|
| PowerPoint / Google Slides      | Table styles, header row fills, alternating rows     |
| Figma / FigJam                  | Per-cell colours, minimal chrome, clean rendering    |
| Notion tables                   | Inline editing, simple column management             |
| draw.io / Lucidchart            | Embeddable in diagrams, compact rendering            |
| Bootstrap tables                | Striped rows, bordered, hover, responsive classes    |

### 1.5 Core Design Principles

1. **Visual first** — every cell can be individually styled (font, colour, background, alignment).
2. **Two modes** — Edit mode (interactive) and View mode (read-only presentation).
3. **JSON round-trip** — all data and formatting exports to/imports from a single JSON structure.
4. **Embeddable** — works in sidebars, tabbed panels, modals, and DiagramEngine canvases.
5. **Performant** — instant rendering for up to 500 rows; auto-pagination above 500.
6. **Minimal chrome** — no toolbar clutter in view mode; contextual formatting in edit mode.

---

## 2. Architecture

### 2.1 Component Structure

```
┌─────────────────────────────────────────────────┐
│  VisualTableEditor                              │
│  ┌───────────────────────────────────────────┐  │
│  │  Toolbar (edit mode only)                 │  │
│  │  [Bold][Italic][Align][BG][FG][Font][Sz]  │  │
│  │  [Insert Row][Insert Col][Delete][Merge]  │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │  Table Container (scrollable)             │  │
│  │  ┌─────┬─────┬─────┬─────┐               │  │
│  │  │ Hdr │ Hdr │ Hdr │ Hdr │  ← header row │  │
│  │  ├─────┼─────┼─────┼─────┤               │  │
│  │  │ A1  │ B1  │ C1  │ D1  │               │  │
│  │  ├─────┼─────┼─────┼─────┤               │  │
│  │  │ A2  │ B2  │ C2  │ D2  │               │  │
│  │  └─────┴─────┴─────┴─────┘               │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │  Pagination (auto, when rows > pageSize)  │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### 2.2 Module Boundaries

```
visualtableeditor.ts          — Single-file component (factory + implementation)
visualtableeditor.scss        — Styles with component-prefixed classes
visualtableeditor.test.ts     — Vitest test suite
visualtableeditor.d.ts        — TypeScript declarations (generated)
README.md                     — Component documentation
```

---

## 3. Data Model

### 3.1 Table Data JSON

The canonical data format for import/export. All styling is optional — unstyled
cells use the table's defaults.

```typescript
export interface VisualTableData
{
    /** Table-level metadata. */
    meta?: VisualTableMeta;

    /** Column definitions. */
    columns: VisualTableColumn[];

    /** Row data. First N rows may be header rows (controlled by meta.headerRows). */
    rows: VisualTableRow[];
}

export interface VisualTableMeta
{
    /** Number of header rows at the top. Default: 1. */
    headerRows?: number;

    /** Number of header columns on the left (frozen). Default: 0. */
    headerColumns?: number;

    /** Enable alternating row colours. Default: true. */
    alternatingRows?: boolean;

    /** Even-row background (alternating). Default: "var(--bs-tertiary-bg)". */
    alternatingRowColor?: string;

    /** Enable alternating column colours. Default: false. */
    alternatingColumns?: boolean;

    /** Even-column background (alternating). Default: "var(--bs-tertiary-bg)". */
    alternatingColumnColor?: string;

    /** Default background for all cells. Default: "transparent". */
    defaultBackground?: string;

    /** Default text colour. Default: "var(--bs-body-color)". */
    defaultForeground?: string;

    /** Default font family. Default: "inherit". */
    defaultFontFamily?: string;

    /** Default font size in px. Default: 13. */
    defaultFontSize?: number;

    /** Show outer border. Default: true. */
    bordered?: boolean;

    /** Show cell borders. Default: true. */
    cellBorders?: boolean;

    /** Border colour. Default: "var(--bs-border-color)". */
    borderColor?: string;
}

export interface VisualTableColumn
{
    /** Unique column identifier. */
    id: string;

    /** Display width in px. Default: 120. */
    width?: number;

    /** Minimum width in px. Default: 40. */
    minWidth?: number;

    /** Maximum width in px. Optional. */
    maxWidth?: number;

    /** Default horizontal alignment for cells in this column. */
    align?: "left" | "center" | "right";

    /** Default vertical alignment for cells in this column. */
    valign?: "top" | "middle" | "bottom";

    /** Whether this column is resizable. Default: true. */
    resizable?: boolean;
}

export interface VisualTableRow
{
    /** Unique row identifier. */
    id: string;

    /** Row height in px. Optional (auto-sized if omitted). */
    height?: number;

    /** Cell data keyed by column ID. */
    cells: Record<string, VisualTableCell>;
}

export interface VisualTableCell
{
    /** Cell content — plain string or rich content array. */
    value: string | VisualTableCellContent[];

    /** Per-cell style overrides (applies as default to all content). */
    style?: VisualTableCellStyle;

    /** Column span. Default: 1. */
    colspan?: number;

    /** Row span. Default: 1. */
    rowspan?: number;
}

/**
 * Rich content segment within a cell.
 * Allows mixed formatting within a single cell (e.g. "Total: **$1,250**").
 */
export interface VisualTableCellContent
{
    /** Content type. */
    type: "text" | "link" | "image";

    /** Text content (for "text" and "link" types). */
    text?: string;

    /** URL (for "link" href or "image" src). */
    url?: string;

    /** Alt text (for "image" type). */
    alt?: string;

    /** Image width in px (for "image" type). Default: auto. */
    width?: number;

    /** Image height in px (for "image" type). Default: auto. */
    height?: number;

    /** Inline style overrides for this content segment. */
    style?: {
        bold?: boolean;
        italic?: boolean;
        underline?: boolean;
        color?: string;
        fontSize?: number;
    };
}

export interface VisualTableCellStyle
{
    /** Background colour. */
    background?: string;

    /** Text colour. */
    color?: string;

    /** Font family. */
    fontFamily?: string;

    /** Font size in px. */
    fontSize?: number;

    /** Bold. */
    bold?: boolean;

    /** Italic. */
    italic?: boolean;

    /** Underline. */
    underline?: boolean;

    /** Horizontal alignment. */
    align?: "left" | "center" | "right";

    /** Vertical alignment. */
    valign?: "top" | "middle" | "bottom";

    /** Text wrapping. Default: true. */
    wrap?: boolean;

    /** Cell padding in px. */
    padding?: number;
}
```

### 3.2 Example JSON

```json
{
    "meta": {
        "headerRows": 1,
        "alternatingRows": true,
        "alternatingRowColor": "#f8f9fa",
        "bordered": true
    },
    "columns": [
        { "id": "name", "width": 180, "align": "left" },
        { "id": "role", "width": 140, "align": "left" },
        { "id": "status", "width": 100, "align": "center" }
    ],
    "rows": [
        {
            "id": "hdr",
            "cells": {
                "name": { "value": "Name", "style": { "bold": true, "background": "#0d6efd", "color": "#ffffff" } },
                "role": { "value": "Role", "style": { "bold": true, "background": "#0d6efd", "color": "#ffffff" } },
                "status": { "value": "Status", "style": { "bold": true, "background": "#0d6efd", "color": "#ffffff" } }
            }
        },
        {
            "id": "r1",
            "cells": {
                "name": { "value": "Alice Chen" },
                "role": { "value": "Engineer" },
                "status": { "value": "Active", "style": { "color": "#198754" } }
            }
        },
        {
            "id": "r2",
            "cells": {
                "name": { "value": "Bob Kumar" },
                "role": { "value": "Designer" },
                "status": { "value": "Away", "style": { "color": "#fd7e14" } }
            }
        },
        {
            "id": "r3",
            "cells": {
                "name": {
                    "value": [
                        { "type": "text", "text": "Carol " },
                        { "type": "text", "text": "Reyes", "style": { "bold": true } }
                    ]
                },
                "role": {
                    "value": [
                        { "type": "link", "text": "PM Lead", "url": "https://example.com/carol" }
                    ]
                },
                "status": { "value": "Active", "style": { "color": "#198754" } }
            }
        }
    ]
}
```

---

## 4. Options Interface

```typescript
export interface VisualTableEditorOptions
{
    /** Container element or CSS selector. Required. */
    container: HTMLElement | string;

    /** Initial mode. Default: "edit". */
    mode?: "edit" | "view";

    /** Initial table data. If omitted, creates an empty 3×3 table. */
    data?: VisualTableData;

    /** Number of rows per page. 0 = no pagination. Default: 0 (auto-paginate at 500). */
    pageSize?: number;

    /** Show the formatting toolbar in edit mode. Default: true. */
    showToolbar?: boolean;

    /** Show row numbers in a gutter column. Default: false. */
    showRowNumbers?: boolean;

    /** Allow column resize by dragging. Default: true. */
    resizableColumns?: boolean;

    /** Allow row resize by dragging. Default: false. */
    resizableRows?: boolean;

    /** Allow cell merging (colspan/rowspan). Default: true. */
    allowMerge?: boolean;

    /** Allow adding/removing rows. Default: true (in edit mode). */
    allowStructureEdit?: boolean;

    /** Allow adding/removing columns. Default: true (in edit mode). */
    allowColumnEdit?: boolean;

    /** Allow drag-reordering of rows and columns. Default: false. */
    allowReorder?: boolean;

    /** Named table preset to apply. See Section 18. Default: none. */
    preset?: "blue-header" | "minimal" | "striped" | "dark-header" | "green-accent" | "warm";

    /** Compact mode — reduced padding, smaller font. Default: false. */
    compact?: boolean;

    /** Contained mode — no viewport docking. Default: false. */
    contained?: boolean;

    /** Minimum table width in px. Default: 200. */
    minWidth?: number;

    /** CSS class(es) to add to the root element. */
    cssClass?: string;

    // ── Callbacks ──────────────────────────────────────────────────────

    /** Fired when any cell value changes. */
    onCellChange?: (row: string, column: string, oldValue: string, newValue: string) => void;

    /** Fired when cell style changes. */
    onStyleChange?: (row: string, column: string, style: VisualTableCellStyle) => void;

    /** Fired when table structure changes (row/column add/remove/reorder). */
    onStructureChange?: (action: string, detail: unknown) => void;

    /** Fired when mode switches between edit and view. */
    onModeChange?: (mode: "edit" | "view") => void;

    /** Fired when the table data changes (debounced, for auto-save). */
    onChange?: (data: VisualTableData) => void;

    /** Fired when a header cell is clicked. Host can use this to trigger sorting. */
    onHeaderClick?: (columnId: string, event: MouseEvent) => void;

    /** Fired when a header cell is right-clicked. Host can show filter/sort UI. */
    onHeaderContextMenu?: (columnId: string, event: MouseEvent) => void;

    /** Fired when the selection changes. */
    onSelectionChange?: (selection: CellRange | CellRange[] | null) => void;
}
```

---

## 5. Public API

### 5.1 Factory Function

```typescript
/** Create a VisualTableEditor instance. */
function createVisualTableEditor(options: VisualTableEditorOptions): VisualTableEditor;
```

Exposed as `window.createVisualTableEditor`.

### 5.2 Instance Methods

| Method | Returns | Description |
|--------|---------|-------------|
| **Mode** | | |
| `setMode(mode)` | `void` | Switch between `"edit"` and `"view"` |
| `getMode()` | `string` | Current mode |
| **Data** | | |
| `getData()` | `VisualTableData` | Export full table data as JSON |
| `setData(data)` | `void` | Import table data from JSON (replaces current) |
| `clear()` | `void` | Reset to empty table (preserves column count) |
| **Cell Access** | | |
| `getCellValue(row, col)` | `string` | Get cell text |
| `setCellValue(row, col, value)` | `void` | Set cell text |
| `getCellStyle(row, col)` | `VisualTableCellStyle` | Get cell style |
| `setCellStyle(row, col, style)` | `void` | Set cell style (merge with existing) |
| **Selection** | | |
| `getSelection()` | `CellRange[]` | Current selection (array of ranges; empty if none) |
| `setSelection(range)` | `void` | Programmatically select a contiguous range |
| `addToSelection(range)` | `void` | Add a range to the current non-contiguous selection |
| `selectRow(rowIndex)` | `void` | Select an entire row |
| `selectColumn(colIndex)` | `void` | Select an entire column |
| `selectAll()` | `void` | Select all cells |
| `clearSelection()` | `void` | Deselect all |
| **Structure** | | |
| `insertRow(index?)` | `string` | Insert row at index (default: end), returns row ID |
| `removeRow(rowId)` | `void` | Remove a row |
| `insertColumn(index?)` | `string` | Insert column at index (default: end), returns col ID |
| `removeColumn(colId)` | `void` | Remove a column |
| `setColumnWidth(colId, width)` | `void` | Set column width |
| `setRowHeight(rowId, height)` | `void` | Set row height |
| `moveRow(fromIndex, toIndex)` | `void` | Reorder a row |
| `moveColumn(fromIndex, toIndex)` | `void` | Reorder a column |
| **Merge** | | |
| `mergeCells(range)` | `void` | Merge cells in the given range |
| `unmergeCells(row, col)` | `void` | Unmerge a previously merged cell |
| **Formatting** | | |
| `applyStyleToSelection(style)` | `void` | Apply style to all selected cells (contiguous or not) |
| `applyPreset(name)` | `void` | Apply a named table preset (see Section 17) |
| `setHeaderRows(count)` | `void` | Set number of header rows |
| `setAlternatingRows(enabled, color?)` | `void` | Toggle alternating row colours |
| **Host Sorting / Filtering** | | |
| `sortRows(comparator)` | `void` | Reorder data rows using a comparator function |
| `filterRows(predicate)` | `void` | Show/hide rows based on a predicate function |
| `clearFilter()` | `void` | Show all rows (remove filter) |
| **Lifecycle** | | |
| `show()` | `void` | Show the component |
| `hide()` | `void` | Hide the component |
| `destroy()` | `void` | Remove DOM and release resources |
| `refresh()` | `void` | Re-render the table |

### 5.3 CellRange

```typescript
export interface CellRange
{
    /** Start row index (0-based). */
    startRow: number;

    /** Start column index (0-based). */
    startCol: number;

    /** End row index (inclusive). */
    endRow: number;

    /** End column index (inclusive). */
    endCol: number;
}
```

---

## 6. Modes

### 6.1 View Mode

- Table renders as a styled HTML `<table>` with all formatting applied.
- No editing, no toolbar, no selection handles.
- Cells are not interactive (no click-to-edit).
- Links are clickable; images are visible.
- Intended for **read-only presentation**: published reports, exported
  documents, dashboard widgets, print previews.
- **Not the default for embedded contexts.** Tables in diagrams, documents,
  and apps default to edit mode (like PowerPoint / Google Drawings).
- The host calls `setMode("view")` explicitly when read-only is needed.

### 6.2 Edit Mode

- Formatting toolbar appears above the table (unless `showToolbar: false`).
- Click a cell to select it. The cell shows a blue selection border.
- Double-click or press Enter/F2 to begin inline editing (contentEditable).
- Shift+click or Shift+arrow to extend a contiguous range selection.
- **Ctrl+click** to toggle individual cells in/out of a non-contiguous selection.
- **Click a row header** (row number gutter) to select the entire row.
  Ctrl+click additional row headers to add rows to the selection.
  Shift+click a second row header to select a range of rows.
- **Click a column header** to select the entire column.
  Ctrl+click additional column headers to add columns to the selection.
  Shift+click a second column header to select a range of columns.
- **Ctrl+A** selects all cells.
- Selected cells can be formatted via toolbar or keyboard shortcuts.
  `applyStyleToSelection()` applies to every cell in the selection,
  whether contiguous or non-contiguous.
- Right-click opens a context menu (Insert/Delete row/column, Merge, Style).
- Tab moves to the next cell; Shift+Tab moves backward.
- Escape cancels editing and reverts the cell value.

### 6.3 Selection Model

The selection supports three shapes:

| Shape | How | Example |
|-------|-----|---------|
| **Single cell** | Click | One cell selected |
| **Contiguous range** | Click + Shift+click, or Shift+arrow | Rectangular block |
| **Non-contiguous** | Ctrl+click cells, Ctrl+click row/column headers | Scattered cells, multiple rows/columns |

All formatting operations (`applyStyleToSelection`, toolbar buttons,
Ctrl+B/I/U) apply to every cell in the current selection regardless of shape.
Structural operations (merge, delete row/column) require a contiguous selection.

---

## 7. Toolbar

The formatting toolbar is a compact single-row bar shown only in edit mode.

### 7.1 Component Reuse

The toolbar and context menu are built using existing library components,
not custom implementations:

| Feature | Reused Component | Usage |
|---------|------------------|-------|
| Formatting toolbar | **InlineToolbar** (`createInlineToolbar`) | Compact icon-button bar above the table |
| Right-click menu | **ContextMenu** (`createContextMenu`) | Insert/delete/merge/format actions |
| Text colour picker | **ColorPicker** (`createColorPicker`, compact mode) | Dropdown from toolbar colour button |
| Background colour picker | **ColorPicker** (`createColorPicker`, compact mode) | Dropdown from toolbar BG button |

If the table is hosted inside a Ribbon-based application, the host can
optionally hide the built-in toolbar (`showToolbar: false`) and drive
formatting via its own Ribbon controls using the public API.

### 7.2 Toolbar Groups

| Group | Actions |
|-------|---------|
| **Text** | Bold (Ctrl+B), Italic (Ctrl+I), Underline (Ctrl+U) |
| **Alignment** | Align Left, Center, Right |
| **Colour** | Text Colour (dropdown), Background Colour (dropdown) |
| **Font** | Font Size (dropdown: 10, 11, 12, 13, 14, 16, 18, 20, 24) |
| **Insert** | Insert Link, Insert Image (URL) |
| **Structure** | Insert Row Above, Insert Row Below, Insert Column Left, Insert Column Right |
| **Delete** | Delete Row, Delete Column |
| **Merge** | Merge Cells, Unmerge Cells |

---

## 8. Keyboard Shortcuts (Edit Mode)

| Key | Action |
|-----|--------|
| Arrow keys | Move selection |
| Shift+Arrow | Extend contiguous range selection |
| Ctrl+Click | Toggle cell in/out of non-contiguous selection |
| Tab / Shift+Tab | Move to next/previous cell |
| Enter / F2 | Begin editing selected cell |
| Escape | Cancel editing / clear selection |
| Delete / Backspace | Clear selected cell(s) content |
| Ctrl+B | Toggle bold on selection |
| Ctrl+I | Toggle italic on selection |
| Ctrl+U | Toggle underline on selection |
| Ctrl+A | Select all cells |
| Ctrl+C | Copy selection to clipboard (TSV) |
| Ctrl+V | Paste from clipboard (TSV) |
| Ctrl+Z | Undo |
| Ctrl+Y / Ctrl+Shift+Z | Redo |

---

## 9. Context Menu (Edit Mode)

Right-click on a cell or selection opens a context menu with:

| Item | Description |
|------|-------------|
| **Insert Row Above** | Insert a new row above the current row |
| **Insert Row Below** | Insert a new row below the current row |
| **Insert Column Left** | Insert a new column to the left |
| **Insert Column Right** | Insert a new column to the right |
| ── separator ── | |
| **Delete Row** | Remove the current row |
| **Delete Column** | Remove the current column |
| ── separator ── | |
| **Merge Cells** | Merge selected range (only if range selected) |
| **Unmerge** | Unmerge a merged cell (only if cell is merged) |
| ── separator ── | |
| **Insert Link** | Add or edit a hyperlink in the selected cell |
| **Insert Image** | Add an image by URL into the selected cell |
| ── separator ── | |
| **Clear Contents** | Clear text in selected cells |
| **Clear Formatting** | Reset style to defaults for selected cells |

Uses the project's **ContextMenu** component (`createContextMenu`).

---

## 10. Column and Row Resize

### 10.1 Column Resize

- A thin drag handle appears on column borders in edit mode.
- Drag horizontally to resize. Minimum width enforced per `minWidth`.
- Double-click a column border to auto-fit width to content.
- Fires `onStructureChange("column-resize", { columnId, width })`.

### 10.2 Row Resize

- When `resizableRows: true`, a drag handle appears on row borders.
- Drag vertically to resize. Minimum height: 24px.
- Fires `onStructureChange("row-resize", { rowId, height })`.

---

## 11. Cell Merging

- Select a rectangular range, then click Merge (toolbar or context menu).
- The top-left cell absorbs the range: its `colspan` and `rowspan` are set.
- Merged cells that held content show only the top-left cell's value.
- Content from absorbed cells is discarded (with undo support).
- Unmerge restores the original cell boundaries; absorbed cells are empty.
- Merged cells respect the merged area for selection and navigation.

---

## 12. Pagination

- When `pageSize` is set to a positive number, rows are paginated.
- When `pageSize` is `0` (default), auto-pagination activates at 500 rows.
- Header rows are always shown on every page.
- A simple pagination bar appears below the table:
  `◀ Page 1 of 5 ▶` with page number buttons.
- The pagination bar uses compact styling (font-size: 12px).
- In edit mode, structural edits (insert/delete row) update pagination.

---

## 13. Performance

| Rows | Strategy |
|------|----------|
| 0–500 | Full DOM rendering. Instant. |
| 500–5000 | Auto-pagination (100 rows/page). Smooth. |
| 5000+ | Not a target use case. Use DataGrid instead. |

### 13.1 Rendering Optimisations

- Use `<table>` with `table-layout: fixed` for predictable column widths.
- Batch DOM mutations during `setData()` and `clear()`.
- Debounce `onChange` callback (300ms default).
- Style application via CSS classes where possible; inline styles only for
  per-cell overrides.

---

## 14. Clipboard

### 14.1 Copy (Ctrl+C)

- Copies selected cells as tab-separated values (TSV) to the clipboard.
- Cell formatting is NOT copied to the clipboard (text only).

### 14.2 Paste (Ctrl+V)

- Pastes TSV data from the clipboard into the table starting at the
  selection anchor.
- If the paste area exceeds the table bounds, new rows/columns are added
  (if `allowStructureEdit` / `allowColumnEdit` are true).
- Paste does NOT carry formatting — pasted cells use the existing cell style.

---

## 15. Undo / Redo

- An internal undo stack tracks all edits (cell value, style, structure).
- Maximum 50 undo levels (configurable).
- Undo/redo are available via Ctrl+Z / Ctrl+Y keyboard shortcuts.
- Each undo entry is a minimal diff (not a full snapshot) for memory efficiency.

---

## 16. Aggregates

The VisualTableEditor provides live aggregate computations on the current
selection — similar to Excel's status bar. This is **not** a formula engine;
it is simple array math on selected numeric data with unit-awareness.

### 16.1 Summary Bar

An optional compact bar that displays live aggregate results for the current
selection. Position is configurable (bottom, top, or side).

```
Sum: $1,250 (8 of 12 cells)  |  Avg: $156.25  |  Min: $23  |  Max: $410
```

The `"8 of 12 cells"` indicator makes it transparent how many cells were
usable for computation. No warnings, no errors — just honest reporting.

**Behaviour:**
- Updates live as the selection changes.
- Shows results only when the selection contains at least 2 numeric cells.
- Hidden when the selection contains no numeric data.
- Read-only — the bar is informational, not editable.

### 16.2 Supported Aggregates

| Aggregate | Description |
|-----------|-------------|
| **Sum** | Total of all numeric values |
| **Average** | Arithmetic mean |
| **Count** | Number of non-empty cells (all types) |
| **Count Numbers** | Number of cells with parseable numeric values |
| **Min** | Smallest numeric value |
| **Max** | Largest numeric value |
| **Median** | Middle value when sorted |
| **Mode** | Most frequently occurring numeric value |
| **Std Dev** | Population standard deviation |
| **Range** | Max − Min |

The summary bar shows a configurable subset of these. Default: Sum, Average,
Min, Max, Count.

### 16.3 Numeric Parsing Rules

Each cell is parsed to extract a numeric value and a **unit signature**
(the non-numeric prefix and/or suffix pattern).

| Cell Content | Parsed Value | Unit Signature | Usable? |
|---|---|---|---|
| `"42"` | 42 | _(bare)_ | Yes |
| `"3.14"` | 3.14 | _(bare)_ | Yes |
| `"-7"` | −7 | _(bare)_ | Yes |
| `"$1,250"` | 1250 | `$_` | Yes |
| `"€50.00"` | 50 | `€_` | Yes |
| `"45%"` | 45 | `_%` | Yes |
| `"10kg"` | 10 | `_kg` | Yes |
| `"1,000.50"` | 1000.5 | _(bare)_ | Yes |
| `""` (empty) | — | — | Skipped |
| `"Alice"` | — | — | Skipped |
| `"Total: 500"` | — | — | Skipped (ambiguous) |
| Image / Link | — | — | Skipped |

**Parsing steps:**
1. If the cell value is a `VisualTableCellContent[]` (rich content), skip it.
2. Trim whitespace.
3. Extract leading non-digit characters (prefix) and trailing non-digit
   characters (suffix), ignoring commas, dots, and minus signs.
4. Strip prefix, suffix, and commas from the remaining string.
5. Attempt `parseFloat()`. If `NaN`, the cell is not numeric — skip it.
6. The unit signature is `prefix + "_" + suffix` (e.g., `$_`, `_%`, `_kg`).

### 16.4 Unit-Aware Aggregation

Aggregates are only computed when all numeric cells in the selection share
the **same unit signature** (or all have no unit).

| Selection | Unit Signatures | Result |
|---|---|---|
| `$100`, `$200`, `$350` | All `$_` | `Sum: $650` |
| `45%`, `80%`, `60%` | All `_%` | `Avg: 61.67%` |
| `100`, `200`, `350` | All bare | `Sum: 650` |
| `10kg`, `20kg`, `15kg` | All `_kg` | `Sum: 45kg` |
| `$100`, `45%`, `200` | Mixed (`$_`, `_%`, bare) | `—` (no computation) |
| `€50`, `$100` | Mixed (`€_`, `$_`) | `—` (no computation) |

When the result is displayed, the unit prefix/suffix is reattached to the
formatted number (e.g., `$1,250` not `1250`).

### 16.5 Column/Row Footer Aggregates

Optional non-editable summary rows (or columns) that display pinned
aggregate values for each column (or row). These persist in the JSON
data model as a special row type.

```typescript
export interface VisualTableMeta
{
    // ... existing fields ...

    /** Footer aggregate type for each column. Default: none. */
    footerAggregate?: "sum" | "average" | "count" | "min" | "max"
                    | "median" | "mode" | "stddev" | "range";

    /** Show the summary bar. Default: false. */
    showSummaryBar?: boolean;

    /** Summary bar position. Default: "bottom". */
    summaryBarPosition?: "top" | "bottom" | "left" | "right";

    /** Which aggregates to show in the summary bar. */
    summaryBarAggregates?: ("sum" | "average" | "count" | "countNumbers"
                         | "min" | "max" | "median" | "mode"
                         | "stddev" | "range")[];
}
```

**Footer row behaviour:**
- Rendered as the last row(s) of the table with a distinct visual style
  (e.g., bold, top border, slightly different background).
- Not editable — values are computed automatically.
- Recomputed on every cell value change.
- If a column contains no numeric values (or has mixed units), the footer
  cell shows `—` (em dash).
- Footer rows are not included in pagination row counts.
- The footer aggregate type can be set per-column via the column definition
  (`VisualTableColumn.aggregate`), overriding the table-level default.

```typescript
export interface VisualTableColumn
{
    // ... existing fields ...

    /** Per-column footer aggregate (overrides meta.footerAggregate). */
    aggregate?: "sum" | "average" | "count" | "min" | "max"
              | "median" | "mode" | "stddev" | "range" | "none";
}
```

### 16.6 Aggregate API

| Method | Returns | Description |
|--------|---------|-------------|
| `getAggregates(range?)` | `AggregateResult` | Compute aggregates for a range (default: current selection) |
| `setFooterAggregate(type)` | `void` | Set the table-level footer aggregate type |
| `setColumnAggregate(colId, type)` | `void` | Set per-column footer aggregate |
| `showSummaryBar(show)` | `void` | Toggle summary bar visibility |

```typescript
export interface AggregateResult
{
    /** Unit signature shared by all numeric cells, or null if mixed. */
    unit: string | null;

    /** Number of non-empty cells in the range. */
    count: number;

    /** Number of cells with parseable numeric values. */
    countNumbers: number;

    /** Total cells in the range (including empty). */
    totalCells: number;

    /** Aggregate values. Null if mixed units or no numeric data. */
    sum: number | null;
    average: number | null;
    min: number | null;
    max: number | null;
    median: number | null;
    mode: number | null;
    stddev: number | null;
    range: number | null;

    /** Formatted aggregate strings with unit reattached (e.g., "$1,250"). */
    formatted: Record<string, string>;
}
```

### 16.7 Aggregate Callback

```typescript
export interface VisualTableEditorOptions
{
    // ... existing fields ...

    /** Fired when selection changes and aggregates are recomputed. */
    onAggregateChange?: (aggregates: AggregateResult) => void;
}
```

The host application can use this event to display aggregates in its own
UI (e.g., a Ribbon status section, a sidebar panel, or a StatusBar
component) instead of or in addition to the built-in summary bar.

---

## 17. Styling

### 16.1 CSS Classes

All classes are prefixed with `vte-` (visual table editor).

| Class | Description |
|-------|-------------|
| `.vte-root` | Root container |
| `.vte-toolbar` | Formatting toolbar |
| `.vte-table-container` | Scrollable table wrapper |
| `.vte-table` | The `<table>` element |
| `.vte-header-row` | Header row(s) |
| `.vte-cell` | Table cell (`<td>`) |
| `.vte-cell--selected` | Selected cell highlight |
| `.vte-cell--editing` | Cell in inline-edit mode |
| `.vte-cell--merged` | Merged cell |
| `.vte-row-number` | Row number gutter cell |
| `.vte-resize-handle` | Column/row resize handle |
| `.vte-pagination` | Pagination bar |
| `.vte-summary-bar` | Aggregate summary bar |
| `.vte-footer-row` | Non-editable aggregate footer row |
| `.vte-root--compact` | Compact mode modifier |
| `.vte-root--view` | View mode modifier |
| `.vte-root--edit` | Edit mode modifier |

### 16.2 Dark Mode

- All colours use CSS custom properties or Bootstrap theme variables.
- Alternating row/column colours respect `data-bs-theme="dark"`.
- Selection colour: `var(--bs-primary)` with 20% opacity.
- Header fill defaults adapt to the current theme.

### 16.3 Bootstrap Integration

- Inherits Bootstrap's typography (font-family, base font-size from body).
- Uses Bootstrap colour variables (`--bs-body-color`, `--bs-border-color`, etc.).
- Toolbar buttons use Bootstrap icon classes (`bi-type-bold`, etc.).
- No Bootstrap JS dependency.

---

## 18. Table Presets

Six built-in named presets that apply coordinated header, row, and border
styles in a single call via `applyPreset(name)` or the `preset` option.
Presets set `meta` and header-row `style` values — they do not overwrite
per-cell styles that the user has already applied.

| Preset | Header BG | Header FG | Alternating Row | Borders | Description |
|--------|-----------|-----------|-----------------|---------|-------------|
| `"blue-header"` | `#0d6efd` | `#ffffff` | `#e7f1ff` | Yes | Classic blue header with light blue alternating rows |
| `"dark-header"` | `#212529` | `#ffffff` | `#f8f9fa` | Yes | Dark header with subtle grey alternating rows |
| `"green-accent"` | `#198754` | `#ffffff` | `#e8f5e9` | Yes | Green header with light green alternating rows |
| `"warm"` | `#fd7e14` | `#ffffff` | `#fff3e0` | Yes | Warm orange header with cream alternating rows |
| `"minimal"` | transparent | `var(--bs-body-color)` | none | Bottom-only | No fills, only bottom borders, clean look |
| `"striped"` | `var(--bs-tertiary-bg)` | `var(--bs-body-color)` | `var(--bs-tertiary-bg)` | Yes | Subtle grey header with standard striped rows |

### 17.1 Preset Behaviour

- `applyPreset(name)` updates `meta` defaults (alternating colours, border
  settings) and applies styles to all header rows.
- Existing per-cell style overrides are preserved — the preset only sets
  defaults and header row styles.
- Presets are theme-aware: the `"minimal"` and `"striped"` presets use CSS
  variables and adapt automatically to light/dark mode.
- A preset can be applied at construction time via `options.preset` or
  at runtime via `applyPreset()`.
- Applying a new preset replaces the previous preset's styles.

### 17.2 Custom Presets (Future)

Users can register custom presets via `registerPreset(name, config)` in a
future enhancement. For now, the six built-in presets cover the most common
visual styles.

---

## 19. Accessibility

| Requirement | Implementation |
|-------------|----------------|
| WAI-ARIA Grid | `role="grid"` on table, `role="row"`, `role="gridcell"` |
| Keyboard navigation | Full arrow-key, Tab, Enter, Escape support |
| Screen reader | `aria-label` on table, `aria-colindex`/`aria-rowindex` on cells |
| Selection announcement | `aria-selected="true"` on selected cells |
| Edit mode | `aria-readonly="false"` in edit mode |
| Focus management | Roving tabindex within the grid |
| High contrast | Sufficient contrast ratios on all default colours |

---

## 20. DiagramEngine Embedding

### 18.1 Registration

```typescript
// In embed-registry or enterprise-theme embed pack:
engine.registerEmbeddableComponent("visualtableeditor", {
    factory: "createVisualTableEditor",
    label: "Table Editor",
    icon: "bi-table",
    category: "data",
    defaultOptions: {
        mode: "edit",
        compact: true,
        showToolbar: false,
        contained: true,
        data: {
            columns: [
                { id: "c1", width: 80 },
                { id: "c2", width: 80 },
                { id: "c3", width: 80 }
            ],
            rows: [
                { id: "h1", cells: { c1: { value: "Header 1", style: { bold: true } }, c2: { value: "Header 2", style: { bold: true } }, c3: { value: "Header 3", style: { bold: true } } } },
                { id: "r1", cells: { c1: { value: "A" }, c2: { value: "B" }, c3: { value: "C" } } },
                { id: "r2", cells: { c1: { value: "D" }, c2: { value: "E" }, c3: { value: "F" } } }
            ]
        }
    },
    defaultSize: { w: 300, h: 150 }
});
```

### 20.2 Embed Behaviour

- Renders in `edit` mode by default — tables are directly editable inline,
  matching the behaviour of PowerPoint, Google Drawings, and OneNote.
- Click a cell to select it; double-click or Enter to type — no mode switch
  required. The table is always interactive when focused.
- The built-in toolbar is hidden by default in embedded mode
  (`showToolbar: false`); formatting is available via the context menu
  and keyboard shortcuts. The host can optionally show the toolbar.
- The DiagramEngine handles focus delegation: clicking the table shape
  passes focus into the foreignObject, making the table interactive.
  Clicking outside the shape deselects it normally.
- The table respects the foreignObject dimensions and scrolls internally.
- `compact: true` reduces cell padding for tighter diagram rendering.
- View mode is still available for truly read-only contexts (e.g., a
  published report or exported PDF). The host sets `mode: "view"` explicitly.

---

## 21. Logging

Follow the standard logging pattern from `FRONTEND_LOGGING.md`:

```typescript
const LOG_PREFIX = "[VisualTableEditor]";
```

### 19.1 What to Log

| Level | Messages |
|-------|----------|
| `logInfo` | Initialised, destroyed, mode change |
| `logDebug` | Data loaded (row/col counts), selection change, undo/redo |
| `logWarn` | Invalid cell reference, paste overflow, merge conflict |
| `logError` | Container not found, invalid data format, DOM errors |
| `logTrace` | Cell edit start/end, key events, resize drag, render cycle |

---

## 22. Test Plan

### 20.1 Unit Tests (Vitest + jsdom)

| Area | Tests | Description |
|------|-------|-------------|
| **Factory** | 3 | Create with defaults, with options, container selector |
| **Data** | 8 | getData/setData round-trip, clear, empty table, large data |
| **Cells** | 10 | getCellValue/setCellValue, getCellStyle/setCellStyle, missing cell |
| **Selection** | 12 | Single cell, contiguous range, non-contiguous (Ctrl+click), select row, select column, select all, addToSelection, multi-row, multi-column, clearSelection, getSelection returns array |
| **Structure** | 12 | Insert/remove row/column, moveRow, moveColumn, resize, boundary checks, reorder callbacks |
| **Merge** | 6 | Merge range, unmerge, merged cell navigation, overlapping merge |
| **Formatting** | 10 | Bold/italic/underline toggle, alignment, colours, font size, applyStyleToSelection on non-contiguous, applyStyleToSelection on row/column |
| **Presets** | 8 | Apply each of 6 presets, preset via options, preset preserves per-cell overrides |
| **Keyboard** | 10 | Arrow nav, Tab, Enter/Escape, Ctrl+B/I/U, Ctrl+Z/Y, Ctrl+A |
| **Clipboard** | 4 | Copy TSV, paste TSV, paste overflow, paste with merge |
| **Pagination** | 5 | Auto at 500, custom pageSize, header on every page, navigate |
| **Undo/Redo** | 5 | Value change, style change, structure change, stack limit |
| **Mode** | 4 | View → Edit, Edit → View, toolbar visibility, read-only |
| **Sort/Filter** | 6 | sortRows with comparator, filterRows with predicate, clearFilter, onHeaderClick, onHeaderContextMenu, sort preserves styles |
| **Aggregates** | 12 | Sum/avg/min/max/median/mode/stddev/range on numeric selection, skip non-numeric, unit-aware grouping (same unit OK, mixed → dash), summary bar rendering, footer aggregate row, per-column aggregate override, onAggregateChange callback, getAggregates API |
| **Callbacks** | 8 | onCellChange, onStyleChange, onStructureChange, onModeChange, onChange, onSelectionChange, onHeaderClick, onHeaderContextMenu |
| **Lifecycle** | 3 | show/hide/destroy, refresh |
| **Accessibility** | 4 | ARIA roles, aria-selected, roving tabindex, screen reader labels |

**Total: ~130 tests**

### 22.2 Manual Tests

- Embed in DiagramEngine canvas, verify view/edit mode transition.
- Embed in Sidebar with `contained: true`.
- Paste a 10×10 block from Excel/Google Sheets.
- Verify dark mode rendering.
- Test with 600 rows — confirm auto-pagination kicks in.
- Select 3 non-adjacent rows via Ctrl+click row headers, apply bold — verify all styled.
- Apply each of the 6 presets, verify visual appearance.
- Click column header, verify entire column selection and formatting.
- Select a column of `$` values, verify summary bar shows `Sum: $X`.
- Select mixed units (`$100`, `45%`), verify summary bar shows `—`.
- Add footer aggregate (sum) to a numeric column, verify auto-recompute on edit.

---

## 23. Implementation Phases

### Phase 1 — Core Table Rendering + View Mode
- Factory function, options, container setup.
- Render `<table>` from `VisualTableData` JSON.
- Header rows, alternating rows/columns, bordered.
- Per-cell styling (background, colour, font, alignment).
- `getData()` / `setData()` round-trip.
- `show()` / `hide()` / `destroy()`.
- View mode (read-only).

### Phase 2 — Edit Mode + Selection Model
- Mode switching (`setMode`).
- Click to select cell, Shift+click for contiguous range.
- Ctrl+click for non-contiguous multi-cell selection.
- Row header click to select entire row; Ctrl+click for multi-row.
- Column header click to select entire column; Ctrl+click for multi-column.
- Ctrl+A to select all cells.
- Arrow key navigation, Tab between cells.
- Double-click / Enter / F2 for inline editing (contentEditable).
- Escape to cancel, Enter to commit.
- `getCellValue` / `setCellValue` / `getCellStyle` / `setCellStyle`.
- `getSelection` / `setSelection` / `addToSelection` / `selectRow` / `selectColumn` / `selectAll`.
- `onCellChange` and `onSelectionChange` callbacks.

### Phase 3 — Formatting Toolbar + Presets
- Toolbar rendering (Bold, Italic, Underline, Alignment).
- Text colour and background colour dropdowns (ColorPicker).
- Font size dropdown.
- `applyStyleToSelection()` — works on contiguous and non-contiguous selections.
- `onStyleChange` callback.
- Keyboard shortcuts (Ctrl+B/I/U).
- 6 built-in table presets (`applyPreset()`).
- `preset` option for construction-time preset application.

### Phase 4 — Structure Editing + Reorder
- Insert / remove rows and columns.
- Column resize (drag handles).
- Row resize (optional).
- Drag-to-reorder rows and columns (`allowReorder: true`).
- `moveRow()` / `moveColumn()` programmatic reorder.
- Context menu (right-click) with ContextMenu component.
- `onStructureChange` callback.
- `onHeaderClick` / `onHeaderContextMenu` callbacks for host sorting/filtering.
- `sortRows(comparator)` / `filterRows(predicate)` / `clearFilter()`.

### Phase 5 — Rich Cell Content
- `VisualTableCellContent[]` support (text segments, links, images).
- Mixed inline formatting within a single cell.
- Insert Link / Insert Image via toolbar and context menu.
- Links clickable in view mode, editable in edit mode.
- Image rendering with configurable width/height.

### Phase 6 — Cell Merging + Clipboard
- `mergeCells()` / `unmergeCells()`.
- Merged cell rendering (colspan/rowspan).
- Navigation respects merged cells.
- Copy (Ctrl+C) as TSV.
- Paste (Ctrl+V) from TSV.

### Phase 7 — Aggregates + Summary Bar
- Numeric parsing with unit-signature extraction.
- Unit-aware aggregation (same unit OK, mixed → no result).
- 10 aggregate functions (sum, average, count, countNumbers, min, max,
  median, mode, stddev, range).
- Summary bar rendering (configurable position: top/bottom/left/right).
- Column/row footer aggregates (non-editable summary rows).
- Per-column aggregate override via `VisualTableColumn.aggregate`.
- `getAggregates()` API and `onAggregateChange` callback.

### Phase 8 — Undo/Redo + Pagination
- Undo stack with 50-level limit.
- Ctrl+Z / Ctrl+Y support.
- Auto-pagination at 500 rows.
- Pagination bar rendering.
- Header rows on every page.

### Phase 9 — Tests + DiagramEngine Embed
- Full Vitest test suite (~130 tests).
- Register in embed-registry for DiagramEngine.
- Add to Component Studio palette.
- Demo page (`demo/components/visualtableeditor.html`).
- README.md documentation.

---

## 24. File Checklist

| File | Description |
|------|-------------|
| `components/visualtableeditor/visualtableeditor.ts` | Component source |
| `components/visualtableeditor/visualtableeditor.scss` | Component styles |
| `components/visualtableeditor/visualtableeditor.test.ts` | Test suite |
| `components/visualtableeditor/README.md` | Documentation |
| `demo/components/visualtableeditor.html` | Demo page |

---

## 25. Dependencies

| Dependency | Type | Purpose |
|------------|------|---------|
| Bootstrap 5 CSS | Peer | Theme variables, typography |
| Bootstrap Icons | Peer | Toolbar icons |
| **InlineToolbar** | Internal | Formatting toolbar (reused, not rebuilt) |
| **ContextMenu** | Internal | Right-click menu (reused, not rebuilt) |
| **ColorPicker** | Internal | Text/background colour dropdowns (reused) |
| LogUtility | Optional | Structured logging |

No external dependencies. No npm packages. The formatting toolbar, context
menu, and colour pickers are existing library components — not reimplemented.

---

## 26. Resolved Decisions

1. **Table presets / themes** — RESOLVED: ship 6 built-in presets at launch
   (Phase 3). See Section 18.

2. **Formula support** — RESOLVED: no cell-level formulas (`=SUM(A1:A10)`).
   Instead, selection-level aggregate summaries (sum, average, median, etc.)
   are provided via a summary bar and footer rows. Unit-aware: only computes
   when all numeric cells share the same unit signature.

3. **Row/column reorder via drag** — RESOLVED: included in Phase 4 as optional
   (`allowReorder: true`). Programmatic `moveRow()` / `moveColumn()` also available.

4. **Host sorting/filtering** — RESOLVED: the component does not implement sorting
   or filtering UI. Instead, it exposes `onHeaderClick` / `onHeaderContextMenu`
   callbacks and `sortRows(comparator)` / `filterRows(predicate)` methods so the
   host application can wire up its own sorting/filtering logic.

## 27. Open Questions

1. **Custom presets** — should we support `registerPreset(name, config)` for
   user-defined presets? *Recommendation: defer to a future enhancement.*

2. **Cell data types** — should cells support typed data (number, date, boolean)
   with automatic formatting? *Recommendation: no. Keep cells as plain text.
   The host can format values before setting them.*
