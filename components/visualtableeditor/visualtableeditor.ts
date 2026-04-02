/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: VisualTableEditor
 * PURPOSE: Cell-styled tabular data editor for embedding in diagrams,
 *          sidebars, and modals. Visual-first, JSON round-trip, per-cell
 *          styling, inline editing, presets, aggregates, undo/redo.
 * RELATES: [[InlineToolbar]], [[ContextMenu]], [[ColorPicker]], [[DiagramEngine]]
 * FLOW: [createVisualTableEditor(opts)] -> [HTML table] -> [edit/view modes]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// CONSTANTS + LOGGING
// ============================================================================

/** Log prefix for all console messages from this component. */
const LOG_PREFIX = "[VisualTableEditor]";

const _lu = (typeof (window as any).createLogUtility === "function") ? (window as any).createLogUtility().getLogger(LOG_PREFIX.slice(1, -1)) : null;
function logInfo(...a: unknown[]): void { _lu ? _lu.info(...a) : console.log(new Date().toISOString(), "[INFO]", LOG_PREFIX, ...a); }
function logWarn(...a: unknown[]): void { _lu ? _lu.warn(...a) : console.warn(new Date().toISOString(), "[WARN]", LOG_PREFIX, ...a); }
function logError(...a: unknown[]): void { _lu ? _lu.error(...a) : console.error(new Date().toISOString(), "[ERROR]", LOG_PREFIX, ...a); }
function logDebug(...a: unknown[]): void { _lu ? _lu.debug(...a) : console.debug(new Date().toISOString(), "[DEBUG]", LOG_PREFIX, ...a); }
function logTrace(...a: unknown[]): void { _lu ? _lu.trace(...a) : console.debug(new Date().toISOString(), "[TRACE]", LOG_PREFIX, ...a); }

const DEFAULT_COL_WIDTH = 120;
const DEFAULT_MIN_COL_WIDTH = 40;
const DEFAULT_FONT_SIZE = 13;
const DEFAULT_CELL_PADDING = 6;
const MIN_ROW_HEIGHT = 24;
const AUTO_PAGE_THRESHOLD = 500;
const AUTO_PAGE_SIZE = 100;
const UNDO_LIMIT = 50;
const DEBOUNCE_MS = 300;
const FONT_SIZE_OPTIONS = [10, 11, 12, 13, 14, 16, 18, 20, 24];

let _instanceId = 0;

// ============================================================================
// EXPORTED INTERFACES
// ============================================================================

/** Table-level metadata. */
export interface VisualTableMeta
{
    /** Number of header rows at the top. Default: 1. */
    headerRows?: number;

    /** Number of header columns on the left (frozen). Default: 0. */
    headerColumns?: number;

    /** Enable alternating row colours. Default: true. */
    alternatingRows?: boolean;

    /** Even-row background (alternating). */
    alternatingRowColor?: string;

    /** Enable alternating column colours. Default: false. */
    alternatingColumns?: boolean;

    /** Even-column background (alternating). */
    alternatingColumnColor?: string;

    /** Default background for all cells. Default: "transparent". */
    defaultBackground?: string;

    /** Default text colour. */
    defaultForeground?: string;

    /** Default font family. Default: "inherit". */
    defaultFontFamily?: string;

    /** Default font size in px. Default: 13. */
    defaultFontSize?: number;

    /** Show outer border. Default: true. */
    bordered?: boolean;

    /** Show cell borders. Default: true. */
    cellBorders?: boolean;

    /** Border colour. */
    borderColor?: string;

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

/** Column definition. */
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

    /** Per-column footer aggregate (overrides meta.footerAggregate). */
    aggregate?: "sum" | "average" | "count" | "min" | "max"
              | "median" | "mode" | "stddev" | "range" | "none";
}

/** Row data. */
export interface VisualTableRow
{
    /** Unique row identifier. */
    id: string;

    /** Row height in px. Optional (auto-sized if omitted). */
    height?: number;

    /** Cell data keyed by column ID. */
    cells: Record<string, VisualTableCell>;
}

/** Cell data. */
export interface VisualTableCell
{
    /** Cell content — plain string or rich content array. */
    value: string | VisualTableCellContent[];

    /** Per-cell style overrides. */
    style?: VisualTableCellStyle;

    /** Column span. Default: 1. */
    colspan?: number;

    /** Row span. Default: 1. */
    rowspan?: number;
}

/** Rich content segment within a cell. */
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

    /** Image width in px. */
    width?: number;

    /** Image height in px. */
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

/** Per-cell style overrides. */
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

/** Rectangular cell range. */
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

/** Aggregate computation result. */
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

    /** Formatted aggregate strings with unit reattached. */
    formatted: Record<string, string>;
}

/** The canonical data format for import/export. */
export interface VisualTableData
{
    /** Table-level metadata. */
    meta?: VisualTableMeta;

    /** Column definitions. */
    columns: VisualTableColumn[];

    /** Row data. */
    rows: VisualTableRow[];
}

/** Options for creating a VisualTableEditor. */
export interface VisualTableEditorOptions
{
    /** Container element or CSS selector. Required. */
    container: HTMLElement | string;

    /** Initial mode. Default: "edit". */
    mode?: "edit" | "view";

    /** Initial table data. If omitted, creates an empty 3x3 table. */
    data?: VisualTableData;

    /** Number of rows per page. 0 = no pagination. Default: 0. */
    pageSize?: number;

    /** Show the formatting toolbar in edit mode. Default: true. */
    showToolbar?: boolean;

    /** Show row numbers in a gutter column. Default: false. */
    showRowNumbers?: boolean;

    /** Allow column resize by dragging. Default: true. */
    resizableColumns?: boolean;

    /** Allow row resize by dragging. Default: false. */
    resizableRows?: boolean;

    /** Allow cell merging. Default: true. */
    allowMerge?: boolean;

    /** Allow adding/removing rows. Default: true. */
    allowStructureEdit?: boolean;

    /** Allow adding/removing columns. Default: true. */
    allowColumnEdit?: boolean;

    /** Allow drag-reordering. Default: false. */
    allowReorder?: boolean;

    /** Named table preset. */
    preset?: "blue-header" | "minimal" | "striped" | "dark-header" | "green-accent" | "warm";

    /** Compact mode. Default: false. */
    compact?: boolean;

    /** Contained mode. Default: false. */
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

    /** Fired when table structure changes. */
    onStructureChange?: (action: string, detail: unknown) => void;

    /** Fired when mode switches. */
    onModeChange?: (mode: "edit" | "view") => void;

    /** Fired when the table data changes (debounced). */
    onChange?: (data: VisualTableData) => void;

    /** Fired when a header cell is clicked. */
    onHeaderClick?: (columnId: string, event: MouseEvent) => void;

    /** Fired when a header cell is right-clicked. */
    onHeaderContextMenu?: (columnId: string, event: MouseEvent) => void;

    /** Fired when the selection changes. */
    onSelectionChange?: (selection: CellRange | CellRange[] | null) => void;

    /** Fired when aggregates are recomputed. */
    onAggregateChange?: (aggregates: AggregateResult) => void;
}

/** Public handle returned by createVisualTableEditor. */
export interface VisualTableEditor
{
    setMode(mode: "edit" | "view"): void;
    getMode(): string;

    getData(): VisualTableData;
    setData(data: VisualTableData): void;
    clear(): void;

    getCellValue(row: string, col: string): string;
    setCellValue(row: string, col: string, value: string): void;
    getCellStyle(row: string, col: string): VisualTableCellStyle;
    setCellStyle(row: string, col: string, style: VisualTableCellStyle): void;

    getSelection(): CellRange[];
    setSelection(range: CellRange): void;
    addToSelection(range: CellRange): void;
    selectRow(rowIndex: number): void;
    selectColumn(colIndex: number): void;
    selectAll(): void;
    clearSelection(): void;

    insertRow(index?: number): string;
    removeRow(rowId: string): void;
    insertColumn(index?: number): string;
    removeColumn(colId: string): void;
    setColumnWidth(colId: string, width: number): void;
    setRowHeight(rowId: string, height: number): void;
    moveRow(fromIndex: number, toIndex: number): void;
    moveColumn(fromIndex: number, toIndex: number): void;

    mergeCells(range: CellRange): void;
    unmergeCells(row: string, col: string): void;

    applyStyleToSelection(style: VisualTableCellStyle): void;
    applyPreset(name: string): void;
    setHeaderRows(count: number): void;
    setAlternatingRows(enabled: boolean, color?: string): void;

    sortRows(comparator: (a: VisualTableRow, b: VisualTableRow) => number): void;
    filterRows(predicate: (row: VisualTableRow) => boolean): void;
    clearFilter(): void;

    getAggregates(range?: CellRange): AggregateResult;
    setFooterAggregate(type: string): void;
    setColumnAggregate(colId: string, type: string): void;
    showSummaryBar(show: boolean): void;

    show(): void;
    hide(): void;
    destroy(): void;
    refresh(): void;
}

// ============================================================================
// INTERNAL STATE INTERFACE
// ============================================================================

interface UndoEntry
{
    type: "value" | "style" | "structure" | "merge" | "data";
    undo: () => void;
    redo: () => void;
}

interface InternalState
{
    id: number;
    mode: "edit" | "view";
    data: VisualTableData;
    options: VisualTableEditorOptions;
    container: HTMLElement;
    rootEl: HTMLElement | null;
    tableContainerEl: HTMLElement | null;
    tableEl: HTMLElement | null;
    toolbarEl: HTMLElement | null;
    paginationEl: HTMLElement | null;
    summaryBarEl: HTMLElement | null;
    selections: CellRange[];
    anchorRow: number;
    anchorCol: number;
    editingCell: { row: number; col: number } | null;
    editOriginalValue: string;
    undoStack: UndoEntry[];
    redoStack: UndoEntry[];
    currentPage: number;
    effectivePageSize: number;
    filteredRowIndices: number[] | null;
    destroyed: boolean;
    debounceTimer: number | null;
    resizingCol: number;
    resizeStartX: number;
    resizeStartWidth: number;
    resizingRow: number;
    resizeStartY: number;
    resizeStartHeight: number;
    boundHandlers: Record<string, EventListener>;
    toolbarHandle: any;
    contextMenuHandle: any;
    mergedCells: Map<string, { row: number; col: number }>;
}

// ============================================================================
// DOM HELPERS
// ============================================================================

/** Create an element with optional class name. */
function createElement(tag: string, className?: string): HTMLElement
{
    const el = document.createElement(tag);

    if (className)
    {
        el.className = className;
    }

    return el;
}

/** Set multiple attributes on an element. */
function setAttr(el: HTMLElement, attrs: Record<string, string>): void
{
    for (const [key, value] of Object.entries(attrs))
    {
        el.setAttribute(key, value);
    }
}

/** Whether to show the row-number gutter. Always on in edit mode. */
function shouldShowRowNumbers(state: InternalState): boolean
{
    if (state.options.showRowNumbers)
    {
        return true;
    }

    return state.mode === "edit";
}

/** Resolve a container from an element or CSS selector. */
function resolveContainer(container: HTMLElement | string): HTMLElement | null
{
    if (typeof container === "string")
    {
        return document.querySelector(container) as HTMLElement | null;
    }

    return container;
}

// ============================================================================
// PRESET DEFINITIONS
// ============================================================================

interface PresetConfig
{
    headerBg: string;
    headerFg: string;
    alternatingRow: string | null;
    bordered: boolean;
    cellBorders: boolean;
    borderColor?: string;
}

const PRESETS: Record<string, PresetConfig> =
{
    "blue-header": {
        headerBg: "#0d6efd",
        headerFg: "#ffffff",
        alternatingRow: "#e7f1ff",
        bordered: true,
        cellBorders: true,
    },
    "dark-header": {
        headerBg: "#212529",
        headerFg: "#ffffff",
        alternatingRow: "#f8f9fa",
        bordered: true,
        cellBorders: true,
    },
    "green-accent": {
        headerBg: "#198754",
        headerFg: "#ffffff",
        alternatingRow: "#e8f5e9",
        bordered: true,
        cellBorders: true,
    },
    "warm": {
        headerBg: "#fd7e14",
        headerFg: "#ffffff",
        alternatingRow: "#fff3e0",
        bordered: true,
        cellBorders: true,
    },
    "minimal": {
        headerBg: "transparent",
        headerFg: "var(--bs-body-color)",
        alternatingRow: null,
        bordered: false,
        cellBorders: false,
        borderColor: "var(--bs-border-color)",
    },
    "striped": {
        headerBg: "var(--bs-tertiary-bg)",
        headerFg: "var(--bs-body-color)",
        alternatingRow: "var(--bs-tertiary-bg)",
        bordered: true,
        cellBorders: true,
    },
};

// ============================================================================
// NUMERIC PARSING + AGGREGATION HELPERS
// ============================================================================

interface ParsedNumeric
{
    value: number;
    unit: string;
}

/** Parse a cell string into a numeric value + unit signature. */
function parseNumericCell(raw: string): ParsedNumeric | null
{
    const trimmed = raw.trim();

    if (!trimmed)
    {
        return null;
    }

    const prefixMatch = trimmed.match(/^([^0-9\-.,]*)/);
    const suffixMatch = trimmed.match(/([^0-9.,]*)$/);
    const prefix = prefixMatch ? prefixMatch[1] : "";
    const suffix = suffixMatch ? suffixMatch[1] : "";

    const inner = trimmed.slice(prefix.length, trimmed.length - (suffix.length || 0));
    const cleaned = inner.replace(/,/g, "");
    const num = parseFloat(cleaned);

    if (isNaN(num))
    {
        return null;
    }

    const unit = prefix + "_" + suffix;
    return { value: num, unit };
}

/** Get a cell's plain text value. */
function cellTextValue(cell: VisualTableCell | undefined): string
{
    if (!cell)
    {
        return "";
    }

    if (typeof cell.value === "string")
    {
        return cell.value;
    }

    return "";
}

/** Compute aggregates from an array of parsed numerics. */
function computeAggregatesFromValues(values: number[]): Omit<AggregateResult, "unit" | "count" | "countNumbers" | "totalCells" | "formatted">
{
    if (values.length === 0)
    {
        return {
            sum: null, average: null, min: null, max: null,
            median: null, mode: null, stddev: null, range: null,
        };
    }

    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const sorted = [...values].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];

    return {
        sum,
        average: avg,
        min,
        max,
        median: computeMedian(sorted),
        mode: computeMode(values),
        stddev: computeStdDev(values, avg),
        range: max - min,
    };
}

/** Compute median from a sorted array. */
function computeMedian(sorted: number[]): number
{
    const mid = Math.floor(sorted.length / 2);

    if ((sorted.length % 2) === 0)
    {
        return (sorted[mid - 1] + sorted[mid]) / 2;
    }

    return sorted[mid];
}

/** Compute mode from an array of numbers. */
function computeMode(values: number[]): number
{
    const freq = new Map<number, number>();
    let maxFreq = 0;
    let modeVal = values[0];

    for (const v of values)
    {
        const count = (freq.get(v) || 0) + 1;
        freq.set(v, count);

        if (count > maxFreq)
        {
            maxFreq = count;
            modeVal = v;
        }
    }

    return modeVal;
}

/** Compute population standard deviation. */
function computeStdDev(values: number[], avg: number): number
{
    const variance = values.reduce((sum, v) =>
    {
        const diff = v - avg;
        return sum + (diff * diff);
    }, 0) / values.length;

    return Math.sqrt(variance);
}

/** Format a number with optional unit prefix/suffix. */
function formatWithUnit(value: number, unit: string): string
{
    const parts = unit.split("_");
    const prefix = parts[0] || "";
    const suffix = parts[1] || "";
    const rounded = Math.round(value * 100) / 100;
    const numStr = rounded.toLocaleString();

    return prefix + numStr + suffix;
}

/** Compute full aggregate result for a set of cell values. */
/** Parse cell values into numerics and count non-empty. */
function parseCellValues(cellValues: string[]): { parsed: ParsedNumeric[]; nonEmpty: number }
{
    const parsed: ParsedNumeric[] = [];
    let nonEmpty = 0;

    for (const val of cellValues)
    {
        if (val.trim())
        {
            nonEmpty++;
        }

        const p = parseNumericCell(val);

        if (p)
        {
            parsed.push(p);
        }
    }

    return { parsed, nonEmpty };
}

/** Compute full aggregate result for a set of cell values. */
function computeAggregateResult(
    cellValues: string[],
    totalCells: number): AggregateResult
{
    const { parsed, nonEmpty } = parseCellValues(cellValues);
    const result = buildEmptyAggregate(nonEmpty, parsed.length, totalCells);

    if (parsed.length < 2)
    {
        return result;
    }

    const unitCheck = checkUniformUnit(parsed);

    if (!unitCheck.uniform)
    {
        return result;
    }

    return buildPopulatedAggregate(parsed, unitCheck.unit, result);
}

/** Build an empty aggregate result shell. */
function buildEmptyAggregate(
    count: number,
    countNumbers: number,
    totalCells: number): AggregateResult
{
    return {
        unit: null,
        count,
        countNumbers,
        totalCells,
        sum: null, average: null, min: null, max: null,
        median: null, mode: null, stddev: null, range: null,
        formatted: {},
    };
}

/** Check if all parsed numerics share the same unit. */
function checkUniformUnit(parsed: ParsedNumeric[]): { uniform: boolean; unit: string }
{
    const firstUnit = parsed[0].unit;
    const uniform = parsed.every(p => p.unit === firstUnit);

    return { uniform, unit: firstUnit };
}

/** Build a populated aggregate from parsed values. */
function buildPopulatedAggregate(
    parsed: ParsedNumeric[],
    unit: string,
    shell: AggregateResult): AggregateResult
{
    const values = parsed.map(p => p.value);
    const aggs = computeAggregatesFromValues(values);
    const result = { ...shell, ...aggs, unit, countNumbers: parsed.length };

    result.formatted = buildFormattedAggregates(aggs, unit);
    return result;
}

/** Format all aggregate values with unit. */
function buildFormattedAggregates(
    aggs: Omit<AggregateResult, "unit" | "count" | "countNumbers" | "totalCells" | "formatted">,
    unit: string): Record<string, string>
{
    const formatted: Record<string, string> = {};
    const keys = ["sum", "average", "min", "max", "median", "mode", "stddev", "range"] as const;

    for (const key of keys)
    {
        const val = aggs[key];

        if (val !== null)
        {
            formatted[key] = formatWithUnit(val, unit);
        }
    }

    return formatted;
}

// ============================================================================
// DATA HELPERS
// ============================================================================

/** Generate a unique ID for rows/columns. */
function generateId(prefix: string): string
{
    return prefix + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6);
}

/** Create a default empty 3x3 table. */
function createDefaultData(): VisualTableData
{
    const columns: VisualTableColumn[] = [
        { id: "c1", width: DEFAULT_COL_WIDTH },
        { id: "c2", width: DEFAULT_COL_WIDTH },
        { id: "c3", width: DEFAULT_COL_WIDTH },
    ];

    const rows: VisualTableRow[] = [
        { id: "h1", cells: { c1: { value: "Header 1" }, c2: { value: "Header 2" }, c3: { value: "Header 3" } } },
        { id: "r1", cells: { c1: { value: "" }, c2: { value: "" }, c3: { value: "" } } },
        { id: "r2", cells: { c1: { value: "" }, c2: { value: "" }, c3: { value: "" } } },
    ];

    return { meta: { headerRows: 1 }, columns, rows };
}

/** Deep clone a VisualTableData object. */
function cloneData(data: VisualTableData): VisualTableData
{
    return JSON.parse(JSON.stringify(data));
}

/** Ensure the cell exists in the data, creating it if missing. */
function ensureCell(data: VisualTableData, rowIdx: number, colIdx: number): VisualTableCell
{
    const row = data.rows[rowIdx];
    const colId = data.columns[colIdx].id;

    if (!row.cells[colId])
    {
        row.cells[colId] = { value: "" };
    }

    return row.cells[colId];
}

/** Get the effective page size for a given state. */
function getEffectivePageSize(state: InternalState): number
{
    const ps = state.options.pageSize;
    const totalRows = getDataRowCount(state);

    if (ps && ps > 0)
    {
        return ps;
    }

    if (totalRows > AUTO_PAGE_THRESHOLD)
    {
        return AUTO_PAGE_SIZE;
    }

    return 0;
}

/** Get data row count (excluding header rows). */
function getDataRowCount(state: InternalState): number
{
    const headerRows = state.data.meta?.headerRows || 0;
    return state.data.rows.length - headerRows;
}

/** Get rows for the current page. */
function getPageRows(state: InternalState): number[]
{
    const headerRows = state.data.meta?.headerRows || 0;
    const allIndices = state.filteredRowIndices
        ? state.filteredRowIndices
        : Array.from({ length: state.data.rows.length - headerRows }, (_, i) => i + headerRows);

    if (state.effectivePageSize <= 0)
    {
        return [...Array.from({ length: headerRows }, (_, i) => i), ...allIndices];
    }

    const start = state.currentPage * state.effectivePageSize;
    const end = Math.min(start + state.effectivePageSize, allIndices.length);
    const pageDataIndices = allIndices.slice(start, end);

    return [...Array.from({ length: headerRows }, (_, i) => i), ...pageDataIndices];
}

/** Get total page count. */
function getTotalPages(state: InternalState): number
{
    if (state.effectivePageSize <= 0)
    {
        return 1;
    }

    const dataCount = state.filteredRowIndices
        ? state.filteredRowIndices.length
        : getDataRowCount(state);

    return Math.max(1, Math.ceil(dataCount / state.effectivePageSize));
}

// ============================================================================
// UNDO / REDO SYSTEM
// ============================================================================

/** Push an undo entry. */
function pushUndo(state: InternalState, entry: UndoEntry): void
{
    state.undoStack.push(entry);

    if (state.undoStack.length > UNDO_LIMIT)
    {
        state.undoStack.shift();
    }

    state.redoStack = [];
    logDebug("Undo pushed, stack size:", state.undoStack.length);
}

/** Perform undo. */
function performUndo(state: InternalState): void
{
    const entry = state.undoStack.pop();

    if (!entry)
    {
        logDebug("Nothing to undo");
        return;
    }

    entry.undo();
    state.redoStack.push(entry);
    renderAll(state);
    logDebug("Undo performed, remaining:", state.undoStack.length);
}

/** Perform redo. */
function performRedo(state: InternalState): void
{
    const entry = state.redoStack.pop();

    if (!entry)
    {
        logDebug("Nothing to redo");
        return;
    }

    entry.redo();
    state.undoStack.push(entry);
    renderAll(state);
    logDebug("Redo performed");
}

/** Create a value-change undo entry. */
function createValueUndoEntry(
    state: InternalState,
    rowIdx: number,
    colIdx: number,
    oldVal: string,
    newVal: string): UndoEntry
{
    const colId = state.data.columns[colIdx].id;

    return {
        type: "value",
        undo: () =>
        {
            const cell = ensureCell(state.data, rowIdx, colIdx);
            cell.value = oldVal;
        },
        redo: () =>
        {
            const cell = ensureCell(state.data, rowIdx, colIdx);
            cell.value = newVal;
        },
    };
}

/** Create a style-change undo entry. */
function createStyleUndoEntry(
    state: InternalState,
    rowIdx: number,
    colIdx: number,
    oldStyle: VisualTableCellStyle | undefined,
    newStyle: VisualTableCellStyle): UndoEntry
{
    return {
        type: "style",
        undo: () =>
        {
            const cell = ensureCell(state.data, rowIdx, colIdx);
            cell.style = oldStyle ? { ...oldStyle } : undefined;
        },
        redo: () =>
        {
            const cell = ensureCell(state.data, rowIdx, colIdx);
            cell.style = { ...(cell.style || {}), ...newStyle };
        },
    };
}

/** Create a full data snapshot undo entry. */
function createDataUndoEntry(
    state: InternalState,
    oldData: VisualTableData,
    newData: VisualTableData): UndoEntry
{
    return {
        type: "data",
        undo: () => { state.data = cloneData(oldData); },
        redo: () => { state.data = cloneData(newData); },
    };
}

// ============================================================================
// TABLE RENDERING
// ============================================================================

/** Full render/re-render of the component. */
function renderAll(state: InternalState): void
{
    if (state.destroyed || !state.rootEl)
    {
        return;
    }

    logTrace("renderAll start");
    state.effectivePageSize = getEffectivePageSize(state);
    renderToolbar(state);
    renderTable(state);
    renderPagination(state);
    renderSummaryBar(state);
    updateRootClasses(state);
    logTrace("renderAll end");
}

/** Update root element CSS classes. */
function updateRootClasses(state: InternalState): void
{
    if (!state.rootEl)
    {
        return;
    }

    const root = state.rootEl;
    root.classList.toggle("vte-root--edit", state.mode === "edit");
    root.classList.toggle("vte-root--view", state.mode === "view");
    root.classList.toggle("vte-root--compact", !!state.options.compact);
}

/** Render the table element. */
function renderTable(state: InternalState): void
{
    if (!state.tableContainerEl)
    {
        return;
    }

    state.tableContainerEl.textContent = "";
    rebuildMergedCellMap(state);

    const table = createElement("table", "vte-table");
    applyTableAttributes(state, table);
    renderColgroup(state, table);

    const pageRows = getPageRows(state);
    const tbody = createElement("tbody");

    for (const rowIdx of pageRows)
    {
        const tr = renderRow(state, rowIdx);
        tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    renderFooterRows(state, table);
    state.tableContainerEl.appendChild(table);
    state.tableEl = table;
}

/** Apply table-level attributes. */
function applyTableAttributes(state: InternalState, table: HTMLElement): void
{
    const meta = state.data.meta || {};

    setAttr(table, {
        role: "grid",
        "aria-label": "Visual Table Editor",
        "aria-readonly": state.mode === "view" ? "true" : "false",
    });

    table.style.tableLayout = "fixed";
    table.style.minWidth = (state.options.minWidth || 200) + "px";

    if (meta.bordered !== false)
    {
        table.classList.add("vte-table--bordered");
    }

    if (meta.cellBorders !== false)
    {
        table.classList.add("vte-table--cell-borders");
    }
}

/** Render the colgroup element for fixed column widths. */
function renderColgroup(state: InternalState, table: HTMLElement): void
{
    const colgroup = createElement("colgroup");

    if (shouldShowRowNumbers(state))
    {
        const rowNumCol = createElement("col");
        rowNumCol.style.width = "40px";
        colgroup.appendChild(rowNumCol);
    }

    for (const col of state.data.columns)
    {
        const colEl = createElement("col");
        colEl.style.width = (col.width || DEFAULT_COL_WIDTH) + "px";
        colgroup.appendChild(colEl);
    }

    table.appendChild(colgroup);
}

/** Render a single table row. */
function renderRow(state: InternalState, rowIdx: number): HTMLElement
{
    const tr = createElement("tr");
    const row = state.data.rows[rowIdx];
    const headerRows = state.data.meta?.headerRows || 0;
    const isHeader = rowIdx < headerRows;

    setAttr(tr, { role: "row", "data-row-index": String(rowIdx) });
    applyRowClasses(state, tr, rowIdx, isHeader);
    applyRowHeight(state, tr, row);

    if (shouldShowRowNumbers(state))
    {
        tr.appendChild(buildRowNumberCell(rowIdx, isHeader));
    }

    renderRowCells(state, tr, row, rowIdx, isHeader);
    appendRowResizeHandle(state, tr, rowIdx);

    return tr;
}

/** Apply classes to a table row. */
function applyRowClasses(
    state: InternalState,
    tr: HTMLElement,
    rowIdx: number,
    isHeader: boolean): void
{
    if (isHeader)
    {
        tr.classList.add("vte-header-row");
    }

    const meta = state.data.meta || {};
    const headerCount = meta.headerRows || 0;
    const dataIdx = rowIdx - headerCount;

    if (!isHeader && meta.alternatingRows !== false && (dataIdx % 2) === 1)
    {
        tr.classList.add("vte-row--alt");

        if (meta.alternatingRowColor)
        {
            tr.style.backgroundColor = meta.alternatingRowColor;
        }
    }
}

/** Apply row height to a TR element. */
function applyRowHeight(
    _state: InternalState,
    tr: HTMLElement,
    row: VisualTableRow): void
{
    if (row.height)
    {
        tr.style.height = row.height + "px";
    }
}

/** Build a row number gutter cell. */
function buildRowNumberCell(rowIdx: number, isHeader: boolean): HTMLElement
{
    const td = createElement("td", "vte-row-number");
    setAttr(td, { "aria-hidden": "true", "data-row": String(rowIdx) });
    td.style.cursor = "pointer";

    if (!isHeader)
    {
        td.textContent = String(rowIdx);
    }

    return td;
}

/** Render all cells in a row. */
function renderRowCells(
    state: InternalState,
    tr: HTMLElement,
    row: VisualTableRow,
    rowIdx: number,
    isHeader: boolean): void
{
    for (let colIdx = 0; colIdx < state.data.columns.length; colIdx++)
    {
        const col = state.data.columns[colIdx];
        const cell = row.cells[col.id];

        if (isCellHiddenByMerge(state, rowIdx, colIdx))
        {
            continue;
        }

        const td = buildCell(state, cell, row, col, rowIdx, colIdx, isHeader);
        tr.appendChild(td);
    }
}

/** Check if a cell is hidden by a merge. */
function isCellHiddenByMerge(
    state: InternalState,
    rowIdx: number,
    colIdx: number): boolean
{
    const key = rowIdx + "," + colIdx;
    const owner = state.mergedCells.get(key);

    if (owner && (owner.row !== rowIdx || owner.col !== colIdx))
    {
        return true;
    }

    return false;
}

/** Build a single table cell element. */
function buildCell(
    state: InternalState,
    cell: VisualTableCell | undefined,
    _row: VisualTableRow,
    col: VisualTableColumn,
    rowIdx: number,
    colIdx: number,
    isHeader: boolean): HTMLElement
{
    const td = createElement(isHeader ? "th" : "td", "vte-cell");

    setAttr(td, {
        role: "gridcell",
        "data-row": String(rowIdx),
        "data-col": String(colIdx),
        "aria-colindex": String(colIdx + 1),
        "aria-rowindex": String(rowIdx + 1),
    });

    applyCellSpans(td, cell);
    applyCellStyle(state, td, cell, col, rowIdx, colIdx);
    renderCellContent(td, cell);
    applySelectionHighlight(state, td, rowIdx, colIdx);

    return td;
}

/** Apply colspan/rowspan to a cell element. */
function applyCellSpans(td: HTMLElement, cell: VisualTableCell | undefined): void
{
    if (!cell)
    {
        return;
    }

    if (cell.colspan && cell.colspan > 1)
    {
        (td as HTMLTableCellElement).colSpan = cell.colspan;
        td.classList.add("vte-cell--merged");
    }

    if (cell.rowspan && cell.rowspan > 1)
    {
        (td as HTMLTableCellElement).rowSpan = cell.rowspan;
        td.classList.add("vte-cell--merged");
    }
}

/** Apply styling to a cell element. */
function applyCellStyle(
    state: InternalState,
    td: HTMLElement,
    cell: VisualTableCell | undefined,
    col: VisualTableColumn,
    rowIdx: number,
    colIdx: number): void
{
    const meta = state.data.meta || {};
    const style = cell?.style;

    applyBackgroundStyle(td, style, meta, rowIdx, colIdx);
    applyTextStyle(td, style, meta);
    applyAlignmentStyle(td, style, col);
    applyPaddingStyle(td, style);
}

/** Apply background styling. */
function applyBackgroundStyle(
    td: HTMLElement,
    style: VisualTableCellStyle | undefined,
    meta: VisualTableMeta,
    _rowIdx: number,
    _colIdx: number): void
{
    if (style?.background)
    {
        td.style.backgroundColor = style.background;
    }
    else if (meta.defaultBackground && meta.defaultBackground !== "transparent")
    {
        td.style.backgroundColor = meta.defaultBackground;
    }
}

/** Apply text colour. */
function applyTextColor(
    td: HTMLElement,
    style: VisualTableCellStyle | undefined,
    meta: VisualTableMeta): void
{
    if (style?.color)
    {
        td.style.color = style.color;
    }
    else if (meta.defaultForeground)
    {
        td.style.color = meta.defaultForeground;
    }
}

/** Apply text formatting decorations (bold, italic, underline, wrap). */
function applyTextDecorations(
    td: HTMLElement,
    style: VisualTableCellStyle | undefined): void
{
    if (style?.bold)
    {
        td.style.fontWeight = "bold";
    }

    if (style?.italic)
    {
        td.style.fontStyle = "italic";
    }

    if (style?.underline)
    {
        td.style.textDecoration = "underline";
    }

    if (style?.wrap === false)
    {
        td.style.whiteSpace = "nowrap";
        td.style.overflow = "hidden";
        td.style.textOverflow = "ellipsis";
    }
}

/** Apply text formatting styles. */
function applyTextStyle(
    td: HTMLElement,
    style: VisualTableCellStyle | undefined,
    meta: VisualTableMeta): void
{
    applyTextColor(td, style, meta);
    td.style.fontFamily = style?.fontFamily || meta.defaultFontFamily || "inherit";
    td.style.fontSize = (style?.fontSize || meta.defaultFontSize || DEFAULT_FONT_SIZE) + "px";
    applyTextDecorations(td, style);
}

/** Apply alignment styles. */
function applyAlignmentStyle(
    td: HTMLElement,
    style: VisualTableCellStyle | undefined,
    col: VisualTableColumn): void
{
    td.style.textAlign = style?.align || col.align || "left";
    td.style.verticalAlign = style?.valign || col.valign || "middle";
}

/** Apply padding style. */
function applyPaddingStyle(
    td: HTMLElement,
    style: VisualTableCellStyle | undefined): void
{
    const padding = style?.padding ?? DEFAULT_CELL_PADDING;
    td.style.padding = padding + "px";
}

/** Render cell content (plain text or rich content). */
function renderCellContent(td: HTMLElement, cell: VisualTableCell | undefined): void
{
    if (!cell || cell.value === "" || cell.value === undefined)
    {
        return;
    }

    if (typeof cell.value === "string")
    {
        td.textContent = cell.value;
        return;
    }

    renderRichContent(td, cell.value);
}

/** Render rich content (VisualTableCellContent[]). */
function renderRichContent(td: HTMLElement, contents: VisualTableCellContent[]): void
{
    for (const segment of contents)
    {
        const el = buildContentSegment(segment);

        if (el)
        {
            td.appendChild(el);
        }
    }
}

/** Build a single content segment element. */
function buildContentSegment(segment: VisualTableCellContent): HTMLElement | null
{
    if (segment.type === "text")
    {
        return buildTextSegment(segment);
    }

    if (segment.type === "link")
    {
        return buildLinkSegment(segment);
    }

    if (segment.type === "image")
    {
        return buildImageSegment(segment);
    }

    return null;
}

/** Build a text content segment. */
function buildTextSegment(segment: VisualTableCellContent): HTMLElement
{
    const span = createElement("span");
    span.textContent = segment.text || "";
    applyContentSegmentStyle(span, segment.style);
    return span;
}

/** Build a link content segment. */
function buildLinkSegment(segment: VisualTableCellContent): HTMLElement
{
    const a = document.createElement("a");
    a.textContent = segment.text || segment.url || "";
    a.href = segment.url || "#";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    applyContentSegmentStyle(a, segment.style);
    return a;
}

/** Build an image content segment. */
function buildImageSegment(segment: VisualTableCellContent): HTMLElement
{
    const img = document.createElement("img");
    img.src = segment.url || "";
    img.alt = segment.alt || "";

    if (segment.width)
    {
        img.style.width = segment.width + "px";
    }

    if (segment.height)
    {
        img.style.height = segment.height + "px";
    }

    img.style.maxWidth = "100%";
    img.style.verticalAlign = "middle";
    return img;
}

/** Apply inline style overrides to a content segment element. */
function applyContentSegmentStyle(
    el: HTMLElement,
    style?: VisualTableCellContent["style"]): void
{
    if (!style)
    {
        return;
    }

    applySegmentTextDecorations(el, style);

    if (style.color)
    {
        el.style.color = style.color;
    }

    if (style.fontSize)
    {
        el.style.fontSize = style.fontSize + "px";
    }
}

/** Apply bold/italic/underline to a content segment. */
function applySegmentTextDecorations(
    el: HTMLElement,
    style: NonNullable<VisualTableCellContent["style"]>): void
{
    if (style.bold)
    {
        el.style.fontWeight = "bold";
    }

    if (style.italic)
    {
        el.style.fontStyle = "italic";
    }

    if (style.underline)
    {
        el.style.textDecoration = "underline";
    }
}

/** Apply selection highlight to a cell. */
function applySelectionHighlight(
    state: InternalState,
    td: HTMLElement,
    rowIdx: number,
    colIdx: number): void
{
    if (state.mode !== "edit")
    {
        return;
    }

    if (isCellSelected(state, rowIdx, colIdx))
    {
        td.classList.add("vte-cell--selected");
        setAttr(td, { "aria-selected": "true" });
    }
}

/** Append a row resize handle if enabled. */
function appendRowResizeHandle(
    state: InternalState,
    tr: HTMLElement,
    rowIdx: number): void
{
    if (!state.options.resizableRows)
    {
        return;
    }

    const handle = createElement("div", "vte-resize-handle vte-resize-handle--row");
    handle.addEventListener("mousedown", (e: Event) =>
    {
        handleRowResizeMouseDown(state, rowIdx, e as MouseEvent);
    });
    tr.style.position = "relative";
    tr.appendChild(handle);
}

// ============================================================================
// FOOTER ROWS (AGGREGATES)
// ============================================================================

/** Render aggregate footer rows. */
function renderFooterRows(state: InternalState, table: HTMLElement): void
{
    const meta = state.data.meta || {};

    if (!meta.footerAggregate)
    {
        return;
    }

    const tfoot = createElement("tfoot");
    const tr = createElement("tr", "vte-footer-row");
    setAttr(tr, { role: "row" });

    if (shouldShowRowNumbers(state))
    {
        const gutterTd = createElement("td", "vte-row-number");
        tr.appendChild(gutterTd);
    }

    for (let colIdx = 0; colIdx < state.data.columns.length; colIdx++)
    {
        const td = buildFooterCell(state, colIdx);
        tr.appendChild(td);
    }

    tfoot.appendChild(tr);
    table.appendChild(tfoot);
}

/** Build a footer aggregate cell. */
function buildFooterCell(state: InternalState, colIdx: number): HTMLElement
{
    const td = createElement("td", "vte-cell vte-footer-cell");
    const col = state.data.columns[colIdx];
    const aggType = col.aggregate || state.data.meta?.footerAggregate;

    if (!aggType || aggType === "none")
    {
        td.textContent = "";
        return td;
    }

    const values = getColumnValues(state, colIdx);
    const result = computeAggregateResult(values, values.length);
    td.textContent = formatFooterValue(result, aggType);
    td.style.fontWeight = "bold";
    return td;
}

/** Get all cell values for a column (data rows only). */
function getColumnValues(state: InternalState, colIdx: number): string[]
{
    const headerRows = state.data.meta?.headerRows || 0;
    const colId = state.data.columns[colIdx].id;
    const values: string[] = [];

    for (let r = headerRows; r < state.data.rows.length; r++)
    {
        const cell = state.data.rows[r].cells[colId];
        values.push(cellTextValue(cell));
    }

    return values;
}

/** Format a footer aggregate value. */
function formatFooterValue(
    result: AggregateResult,
    aggType: string): string
{
    if (result.countNumbers < 1)
    {
        return "\u2014";
    }

    const key = aggType === "countNumbers" ? "countNumbers" : aggType;

    if (key === "count")
    {
        return String(result.count);
    }

    if (key === "countNumbers")
    {
        return String(result.countNumbers);
    }

    return result.formatted[key] || "\u2014";
}

// ============================================================================
// COLGROUP + COLUMN RESIZE HANDLES
// ============================================================================

/** Render resize handles for columns. */
function renderColumnResizeHandles(state: InternalState): void
{
    if (state.mode !== "edit" || state.options.resizableColumns === false)
    {
        return;
    }

    if (!state.tableContainerEl || !state.tableEl)
    {
        return;
    }

    removeExistingResizeHandles(state);

    for (let i = 0; i < state.data.columns.length; i++)
    {
        const col = state.data.columns[i];

        if (col.resizable === false)
        {
            continue;
        }

        appendColumnResizeHandle(state, i);
    }
}

/** Remove existing resize handles from the table container. */
function removeExistingResizeHandles(state: InternalState): void
{
    if (!state.tableContainerEl)
    {
        return;
    }

    const existing = state.tableContainerEl.querySelectorAll(".vte-resize-handle");

    for (let i = existing.length - 1; i >= 0; i--)
    {
        existing[i].remove();
    }
}

/** Append a single column resize handle. */
function appendColumnResizeHandle(state: InternalState, colIdx: number): void
{
    const handle = createElement("div", "vte-resize-handle");
    setAttr(handle, { "data-col-index": String(colIdx) });

    const leftOffset = computeColumnLeftOffset(state, colIdx);
    const width = state.data.columns[colIdx].width || DEFAULT_COL_WIDTH;

    handle.style.left = (leftOffset + width - 2) + "px";
    handle.style.top = "0";
    handle.style.height = "100%";
    handle.style.position = "absolute";
    handle.style.width = "4px";
    handle.style.cursor = "col-resize";
    handle.style.zIndex = "10";

    state.tableContainerEl!.appendChild(handle);
}

/** Compute the left pixel offset for a column. */
function computeColumnLeftOffset(state: InternalState, colIdx: number): number
{
    let offset = 0;

    if (shouldShowRowNumbers(state))
    {
        offset += 40;
    }

    for (let i = 0; i < colIdx; i++)
    {
        offset += state.data.columns[i].width || DEFAULT_COL_WIDTH;
    }

    return offset;
}

// ============================================================================
// SELECTION SYSTEM
// ============================================================================

/** Check if a cell is within any selection range. */
function isCellSelected(state: InternalState, rowIdx: number, colIdx: number): boolean
{
    for (const range of state.selections)
    {
        if (isCellInRange(rowIdx, colIdx, range))
        {
            return true;
        }
    }

    return false;
}

/** Check if a cell falls within a range. */
function isCellInRange(row: number, col: number, range: CellRange): boolean
{
    const r0 = Math.min(range.startRow, range.endRow);
    const r1 = Math.max(range.startRow, range.endRow);
    const c0 = Math.min(range.startCol, range.endCol);
    const c1 = Math.max(range.startCol, range.endCol);

    return row >= r0 && row <= r1 && col >= c0 && col <= c1;
}

/** Normalize a range so start <= end. */
function normalizeRange(range: CellRange): CellRange
{
    return {
        startRow: Math.min(range.startRow, range.endRow),
        startCol: Math.min(range.startCol, range.endCol),
        endRow: Math.max(range.startRow, range.endRow),
        endCol: Math.max(range.startCol, range.endCol),
    };
}

/** Set a single selection range, replacing existing. */
function setSelectionInternal(state: InternalState, range: CellRange): void
{
    state.selections = [normalizeRange(range)];
    state.anchorRow = range.startRow;
    state.anchorCol = range.startCol;
    fireSelectionChange(state);
    updateSelectionVisuals(state);
}

/** Add a range to the current selection. */
function addSelectionInternal(state: InternalState, range: CellRange): void
{
    state.selections.push(normalizeRange(range));
    fireSelectionChange(state);
    updateSelectionVisuals(state);
}

/** Clear all selections. */
function clearSelectionInternal(state: InternalState): void
{
    state.selections = [];
    fireSelectionChange(state);
    updateSelectionVisuals(state);
}

/** Fire the onSelectionChange callback and update aggregates. */
function fireSelectionChange(state: InternalState): void
{
    const opts = state.options;

    if (opts.onSelectionChange)
    {
        const sel = state.selections.length === 0 ? null :
            state.selections.length === 1 ? state.selections[0] :
            state.selections;

        opts.onSelectionChange(sel);
    }

    updateSummaryBarFromSelection(state);
}

/** Update cell selection visuals (add/remove classes). */
function updateSelectionVisuals(state: InternalState): void
{
    if (!state.tableEl)
    {
        return;
    }

    const cells = state.tableEl.querySelectorAll(".vte-cell");

    for (let i = 0; i < cells.length; i++)
    {
        const cell = cells[i];
        const r = parseInt(cell.getAttribute("data-row") || "-1", 10);
        const c = parseInt(cell.getAttribute("data-col") || "-1", 10);
        const selected = isCellSelected(state, r, c);

        cell.classList.toggle("vte-cell--selected", selected);
        cell.setAttribute("aria-selected", selected ? "true" : "false");
    }
}

/** Handle a cell click for selection. */
function handleCellClick(
    state: InternalState,
    rowIdx: number,
    colIdx: number,
    event: MouseEvent): void
{
    logTrace("Cell click:", { rowIdx, colIdx, ctrl: event.ctrlKey, shift: event.shiftKey });

    if (event.ctrlKey || event.metaKey)
    {
        handleCtrlClick(state, rowIdx, colIdx);
        return;
    }

    if (event.shiftKey)
    {
        handleShiftClick(state, rowIdx, colIdx);
        return;
    }

    setSelectionInternal(state, {
        startRow: rowIdx, startCol: colIdx,
        endRow: rowIdx, endCol: colIdx,
    });
}

/** Handle Ctrl+click for non-contiguous selection. */
function handleCtrlClick(state: InternalState, rowIdx: number, colIdx: number): void
{
    if (isCellSelected(state, rowIdx, colIdx))
    {
        state.selections = state.selections.filter(r => !isCellInRange(rowIdx, colIdx, r));
        fireSelectionChange(state);
        updateSelectionVisuals(state);
        return;
    }

    addSelectionInternal(state, {
        startRow: rowIdx, startCol: colIdx,
        endRow: rowIdx, endCol: colIdx,
    });
}

/** Handle Shift+click to extend contiguous range. */
function handleShiftClick(state: InternalState, rowIdx: number, colIdx: number): void
{
    const range: CellRange = {
        startRow: state.anchorRow,
        startCol: state.anchorCol,
        endRow: rowIdx,
        endCol: colIdx,
    };

    state.selections = [normalizeRange(range)];
    fireSelectionChange(state);
    updateSelectionVisuals(state);
}

/** Select an entire row. */
function selectRowInternal(state: InternalState, rowIdx: number, additive: boolean): void
{
    const colCount = state.data.columns.length;
    const range: CellRange = {
        startRow: rowIdx, startCol: 0,
        endRow: rowIdx, endCol: colCount - 1,
    };

    if (additive)
    {
        addSelectionInternal(state, range);
    }
    else
    {
        setSelectionInternal(state, range);
    }
}

/** Select an entire column. */
function selectColumnInternal(state: InternalState, colIdx: number, additive: boolean): void
{
    const rowCount = state.data.rows.length;
    const range: CellRange = {
        startRow: 0, startCol: colIdx,
        endRow: rowCount - 1, endCol: colIdx,
    };

    if (additive)
    {
        addSelectionInternal(state, range);
    }
    else
    {
        setSelectionInternal(state, range);
    }
}

/** Select all cells. */
function selectAllInternal(state: InternalState): void
{
    setSelectionInternal(state, {
        startRow: 0,
        startCol: 0,
        endRow: state.data.rows.length - 1,
        endCol: state.data.columns.length - 1,
    });
}

// ============================================================================
// INLINE EDITING
// ============================================================================

/** Start editing a cell. */
function startCellEdit(state: InternalState, rowIdx: number, colIdx: number): void
{
    if (state.mode !== "edit")
    {
        return;
    }

    finishCellEdit(state, true);

    const td = findCellElement(state, rowIdx, colIdx);

    if (!td)
    {
        logWarn("Cell element not found for editing:", rowIdx, colIdx);
        return;
    }

    const cell = ensureCell(state.data, rowIdx, colIdx);
    state.editingCell = { row: rowIdx, col: colIdx };
    state.editOriginalValue = cellTextValue(cell);

    td.classList.add("vte-cell--editing");
    td.contentEditable = "true";
    td.focus();
    selectAllTextInElement(td);

    logTrace("Edit started:", { rowIdx, colIdx });
}

/** Select all text in an element. */
function selectAllTextInElement(el: HTMLElement): void
{
    const range = document.createRange();
    range.selectNodeContents(el);
    const selection = window.getSelection();

    if (selection)
    {
        selection.removeAllRanges();
        selection.addRange(range);
    }
}

/** Finish editing the current cell. */
function finishCellEdit(state: InternalState, commit: boolean): void
{
    if (!state.editingCell)
    {
        return;
    }

    const { row, col } = state.editingCell;
    const td = findCellElement(state, row, col);

    if (td)
    {
        td.contentEditable = "false";
        td.classList.remove("vte-cell--editing");
    }

    if (commit && td)
    {
        commitCellEdit(state, row, col, td);
    }
    else
    {
        revertCellEdit(state, row, col);
    }

    state.editingCell = null;
    logTrace("Edit finished:", { commit });
}

/** Commit the edited cell value. */
function commitCellEdit(
    state: InternalState,
    rowIdx: number,
    colIdx: number,
    td: HTMLElement): void
{
    const newVal = td.textContent || "";
    const cell = ensureCell(state.data, rowIdx, colIdx);
    const oldVal = state.editOriginalValue;

    if (newVal === oldVal)
    {
        return;
    }

    cell.value = newVal;
    pushUndo(state, createValueUndoEntry(state, rowIdx, colIdx, oldVal, newVal));
    fireCellChange(state, rowIdx, colIdx, oldVal, newVal);
    notifyChange(state);
}

/** Revert the cell to its original value. */
function revertCellEdit(
    state: InternalState,
    rowIdx: number,
    colIdx: number): void
{
    const cell = state.data.rows[rowIdx]?.cells[state.data.columns[colIdx]?.id];

    if (cell)
    {
        const td = findCellElement(state, rowIdx, colIdx);

        if (td)
        {
            td.textContent = "";
            renderCellContent(td, cell);
        }
    }
}

/** Find a cell DOM element by row/col indices. */
function findCellElement(
    state: InternalState,
    rowIdx: number,
    colIdx: number): HTMLElement | null
{
    if (!state.tableEl)
    {
        return null;
    }

    return state.tableEl.querySelector(
        `[data-row="${rowIdx}"][data-col="${colIdx}"]`
    ) as HTMLElement | null;
}

/** Fire the onCellChange callback. */
function fireCellChange(
    state: InternalState,
    rowIdx: number,
    colIdx: number,
    oldVal: string,
    newVal: string): void
{
    const opts = state.options;

    if (opts.onCellChange)
    {
        const rowId = state.data.rows[rowIdx].id;
        const colId = state.data.columns[colIdx].id;
        opts.onCellChange(rowId, colId, oldVal, newVal);
    }
}

// ============================================================================
// KEYBOARD HANDLING
// ============================================================================

/** Handle keydown events on the table. */
function handleKeyDown(state: InternalState, event: KeyboardEvent): void
{
    if (state.mode !== "edit")
    {
        return;
    }

    if (state.editingCell)
    {
        handleEditingKeyDown(state, event);
        return;
    }

    handleNavigationKeyDown(state, event);
}

/** Handle keydown while editing a cell. */
function handleEditingKeyDown(state: InternalState, event: KeyboardEvent): void
{
    if (event.key === "Escape")
    {
        finishCellEdit(state, false);
        event.preventDefault();
        return;
    }

    if (event.key === "Enter" && !event.shiftKey)
    {
        finishCellEdit(state, true);
        event.preventDefault();
        return;
    }

    if (event.key === "Tab")
    {
        finishCellEdit(state, true);
        moveSelection(state, 0, event.shiftKey ? -1 : 1);
        event.preventDefault();
        return;
    }
}

/** Handle keydown for navigation (not editing). */
function handleNavigationKeyDown(state: InternalState, event: KeyboardEvent): void
{
    const ctrlOrMeta = event.ctrlKey || event.metaKey;

    if (handleCtrlShortcuts(state, event, ctrlOrMeta))
    {
        return;
    }

    if (handleNavigationKeys(state, event))
    {
        return;
    }

    if (handleActionKeys(state, event))
    {
        return;
    }
}

/** Handle Ctrl+B/I/U formatting shortcuts. Returns true if handled. */
function handleCtrlFormatShortcuts(
    state: InternalState,
    event: KeyboardEvent,
    key: string): boolean
{
    if (key === "b")
    {
        toggleStyleOnSelection(state, "bold");
        event.preventDefault();
        return true;
    }

    if (key === "i")
    {
        toggleStyleOnSelection(state, "italic");
        event.preventDefault();
        return true;
    }

    if (key === "u")
    {
        toggleStyleOnSelection(state, "underline");
        event.preventDefault();
        return true;
    }

    return false;
}

/** Handle Ctrl+Z/Y/A undo/redo/select shortcuts. */
function handleCtrlUndoShortcuts(
    state: InternalState,
    event: KeyboardEvent,
    key: string): boolean
{
    if (key === "z" && !event.shiftKey)
    {
        performUndo(state);
        event.preventDefault();
        return true;
    }

    if (key === "y" || (key === "z" && event.shiftKey))
    {
        performRedo(state);
        event.preventDefault();
        return true;
    }

    if (key === "a")
    {
        selectAllInternal(state);
        event.preventDefault();
        return true;
    }

    return false;
}

/** Handle Ctrl+C/V clipboard shortcuts. */
function handleCtrlClipboardShortcuts(
    state: InternalState,
    event: KeyboardEvent,
    key: string): boolean
{
    if (key === "c")
    {
        handleCopy(state);
        event.preventDefault();
        return true;
    }

    if (key === "v")
    {
        handlePaste(state);
        event.preventDefault();
        return true;
    }

    return false;
}

/** Handle Ctrl+ keyboard shortcuts. Returns true if handled. */
function handleCtrlShortcuts(
    state: InternalState,
    event: KeyboardEvent,
    ctrlOrMeta: boolean): boolean
{
    if (!ctrlOrMeta)
    {
        return false;
    }

    const key = event.key.toLowerCase();

    return handleCtrlFormatShortcuts(state, event, key)
        || handleCtrlUndoShortcuts(state, event, key)
        || handleCtrlClipboardShortcuts(state, event, key);
}

/** Map of arrow keys to row/col deltas. */
const ARROW_DELTAS: Record<string, [number, number]> = {
    "ArrowUp": [-1, 0],
    "ArrowDown": [1, 0],
    "ArrowLeft": [0, -1],
    "ArrowRight": [0, 1],
};

/** Handle arrow and tab keys. Returns true if handled. */
function handleNavigationKeys(state: InternalState, event: KeyboardEvent): boolean
{
    const delta = ARROW_DELTAS[event.key];

    if (delta)
    {
        handleArrowKey(state, event, delta[0], delta[1]);
        return true;
    }

    if (event.key === "Tab")
    {
        moveSelection(state, 0, event.shiftKey ? -1 : 1);
        event.preventDefault();
        return true;
    }

    return false;
}

/** Handle arrow key navigation with optional shift-extend. */
function handleArrowKey(
    state: InternalState,
    event: KeyboardEvent,
    dRow: number,
    dCol: number): void
{
    event.preventDefault();

    if (event.shiftKey && state.selections.length > 0)
    {
        extendSelection(state, dRow, dCol);
        return;
    }

    moveSelection(state, dRow, dCol);
}

/** Handle action keys (Enter, F2, Delete, Escape). */
function handleActionKeys(state: InternalState, event: KeyboardEvent): boolean
{
    if (event.key === "Enter" || event.key === "F2")
    {
        handleEditStart(state);
        event.preventDefault();
        return true;
    }

    if (event.key === "Delete" || event.key === "Backspace")
    {
        clearSelectedCells(state);
        event.preventDefault();
        return true;
    }

    if (event.key === "Escape")
    {
        clearSelectionInternal(state);
        event.preventDefault();
        return true;
    }

    return false;
}

/** Start editing the anchor cell. */
function handleEditStart(state: InternalState): void
{
    if (state.selections.length === 0)
    {
        return;
    }

    const range = state.selections[0];
    startCellEdit(state, range.startRow, range.startCol);
}

/** Move selection by a delta. */
function moveSelection(state: InternalState, dRow: number, dCol: number): void
{
    let newRow = state.anchorRow + dRow;
    let newCol = state.anchorCol + dCol;

    newRow = clamp(newRow, 0, state.data.rows.length - 1);
    newCol = clamp(newCol, 0, state.data.columns.length - 1);

    setSelectionInternal(state, {
        startRow: newRow, startCol: newCol,
        endRow: newRow, endCol: newCol,
    });

    scrollCellIntoView(state, newRow, newCol);
}

/** Extend the current selection by a delta. */
function extendSelection(state: InternalState, dRow: number, dCol: number): void
{
    if (state.selections.length === 0)
    {
        return;
    }

    const range = { ...state.selections[0] };
    range.endRow = clamp(range.endRow + dRow, 0, state.data.rows.length - 1);
    range.endCol = clamp(range.endCol + dCol, 0, state.data.columns.length - 1);

    state.selections = [normalizeRange(range)];
    fireSelectionChange(state);
    updateSelectionVisuals(state);
}

/** Clamp a value between min and max. */
function clamp(value: number, min: number, max: number): number
{
    return Math.max(min, Math.min(max, value));
}

/** Scroll a cell into the visible area. */
function scrollCellIntoView(state: InternalState, rowIdx: number, colIdx: number): void
{
    const td = findCellElement(state, rowIdx, colIdx);

    if (td && state.tableContainerEl)
    {
        td.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
}

/** Clear the content of all selected cells. */
function clearSelectedCells(state: InternalState): void
{
    const oldData = cloneData(state.data);

    forEachSelectedCell(state, (rowIdx, colIdx) =>
    {
        const cell = ensureCell(state.data, rowIdx, colIdx);
        cell.value = "";
    });

    pushUndo(state, createDataUndoEntry(state, oldData, cloneData(state.data)));
    renderAll(state);
    notifyChange(state);
}

/** Iterate over every selected cell. */
function forEachSelectedCell(
    state: InternalState,
    callback: (rowIdx: number, colIdx: number) => void): void
{
    for (const range of state.selections)
    {
        const nr = normalizeRange(range);

        for (let r = nr.startRow; r <= nr.endRow; r++)
        {
            for (let c = nr.startCol; c <= nr.endCol; c++)
            {
                callback(r, c);
            }
        }
    }
}

// ============================================================================
// CLIPBOARD
// ============================================================================

/** Handle Ctrl+C copy. */
function handleCopy(state: InternalState): void
{
    if (state.selections.length === 0)
    {
        return;
    }

    const range = normalizeRange(state.selections[0]);
    const lines: string[] = [];

    for (let r = range.startRow; r <= range.endRow; r++)
    {
        const cells: string[] = [];

        for (let c = range.startCol; c <= range.endCol; c++)
        {
            const colId = state.data.columns[c].id;
            const cell = state.data.rows[r]?.cells[colId];
            cells.push(cellTextValue(cell));
        }

        lines.push(cells.join("\t"));
    }

    const tsv = lines.join("\n");
    writeToClipboard(tsv);
    logDebug("Copied TSV to clipboard:", lines.length, "rows");
}

/** Write text to the clipboard. */
function writeToClipboard(text: string): void
{
    if (navigator.clipboard && navigator.clipboard.writeText)
    {
        navigator.clipboard.writeText(text).catch(err =>
        {
            logWarn("Clipboard write failed:", err);
        });
    }
}

/** Handle Ctrl+V paste. */
function handlePaste(state: InternalState): void
{
    if (state.selections.length === 0)
    {
        return;
    }

    if (!navigator.clipboard || !navigator.clipboard.readText)
    {
        logWarn("Clipboard API not available for paste");
        return;
    }

    navigator.clipboard.readText().then(text =>
    {
        processPasteData(state, text);
    }).catch(err =>
    {
        logWarn("Clipboard read failed:", err);
    });
}

/** Process pasted TSV data. */
function processPasteData(state: InternalState, text: string): void
{
    const lines = text.split("\n");
    const range = normalizeRange(state.selections[0]);
    const oldData = cloneData(state.data);
    const startRow = range.startRow;
    const startCol = range.startCol;

    for (let r = 0; r < lines.length; r++)
    {
        const cells = lines[r].split("\t");
        pasteRowCells(state, startRow + r, startCol, cells);
    }

    pushUndo(state, createDataUndoEntry(state, oldData, cloneData(state.data)));
    renderAll(state);
    notifyChange(state);
    logDebug("Paste complete:", lines.length, "rows");
}

/** Paste cells into a specific row. */
function pasteRowCells(
    state: InternalState,
    rowIdx: number,
    startCol: number,
    cells: string[]): void
{
    expandIfNeeded(state, rowIdx, startCol + cells.length - 1);

    for (let c = 0; c < cells.length; c++)
    {
        const targetCol = startCol + c;

        if (targetCol >= state.data.columns.length)
        {
            break;
        }

        const cell = ensureCell(state.data, rowIdx, targetCol);
        cell.value = cells[c];
    }
}

/** Expand the table if paste exceeds bounds. */
function expandIfNeeded(state: InternalState, targetRow: number, targetCol: number): void
{
    const opts = state.options;

    while (targetRow >= state.data.rows.length && opts.allowStructureEdit !== false)
    {
        insertRowInternal(state);
    }

    while (targetCol >= state.data.columns.length && opts.allowColumnEdit !== false)
    {
        insertColumnInternal(state);
    }
}

// ============================================================================
// COLUMN / ROW RESIZE
// ============================================================================

/** Handle mousedown on a column resize handle. */
function handleResizeMouseDown(
    state: InternalState,
    colIdx: number,
    event: MouseEvent): void
{
    event.preventDefault();
    state.resizingCol = colIdx;
    state.resizeStartX = event.clientX;
    state.resizeStartWidth = state.data.columns[colIdx].width || DEFAULT_COL_WIDTH;

    logTrace("Column resize start:", { colIdx });

    const onMove = (e: Event) => handleResizeMouseMove(state, e as MouseEvent);
    const onUp = () => handleResizeMouseUp(state, onMove, onUp);

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
}

/** Handle mousemove during column resize. */
function handleResizeMouseMove(state: InternalState, event: MouseEvent): void
{
    if (state.resizingCol < 0)
    {
        return;
    }

    const col = state.data.columns[state.resizingCol];
    const delta = event.clientX - state.resizeStartX;
    const minW = col.minWidth || DEFAULT_MIN_COL_WIDTH;
    const maxW = col.maxWidth || 2000;
    const newWidth = clamp(state.resizeStartWidth + delta, minW, maxW);

    col.width = newWidth;
    renderAll(state);
}

/** Handle mouseup to finish column resize. */
function handleResizeMouseUp(
    state: InternalState,
    onMove: EventListener,
    onUp: EventListener): void
{
    if (state.resizingCol >= 0)
    {
        const col = state.data.columns[state.resizingCol];

        if (state.options.onStructureChange)
        {
            state.options.onStructureChange("column-resize", {
                columnId: col.id,
                width: col.width,
            });
        }

        logTrace("Column resize end:", { colIdx: state.resizingCol, width: col.width });
    }

    state.resizingCol = -1;
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
    notifyChange(state);
}

/** Handle row resize start. */
function handleRowResizeMouseDown(
    state: InternalState,
    rowIdx: number,
    event: MouseEvent): void
{
    event.preventDefault();
    state.resizingRow = rowIdx;
    state.resizeStartY = event.clientY;
    const row = state.data.rows[rowIdx];
    state.resizeStartHeight = row.height || MIN_ROW_HEIGHT;

    const onMove = (e: Event) => handleRowResizeMove(state, e as MouseEvent);
    const onUp = () => handleRowResizeEnd(state, onMove, onUp);

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
}

/** Handle mousemove during row resize. */
function handleRowResizeMove(state: InternalState, event: MouseEvent): void
{
    if (state.resizingRow < 0)
    {
        return;
    }

    const delta = event.clientY - state.resizeStartY;
    const newHeight = Math.max(MIN_ROW_HEIGHT, state.resizeStartHeight + delta);
    state.data.rows[state.resizingRow].height = newHeight;
    renderAll(state);
}

/** Handle mouseup for row resize. */
function handleRowResizeEnd(
    state: InternalState,
    onMove: EventListener,
    onUp: EventListener): void
{
    if (state.resizingRow >= 0)
    {
        const row = state.data.rows[state.resizingRow];

        if (state.options.onStructureChange)
        {
            state.options.onStructureChange("row-resize", {
                rowId: row.id,
                height: row.height,
            });
        }
    }

    state.resizingRow = -1;
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
    notifyChange(state);
}

// ============================================================================
// CELL MERGING
// ============================================================================

/** Rebuild the merged cell map from data. */
function rebuildMergedCellMap(state: InternalState): void
{
    state.mergedCells.clear();

    for (let r = 0; r < state.data.rows.length; r++)
    {
        const row = state.data.rows[r];

        for (let c = 0; c < state.data.columns.length; c++)
        {
            const colId = state.data.columns[c].id;
            const cell = row.cells[colId];

            if (cell && ((cell.colspan && cell.colspan > 1) || (cell.rowspan && cell.rowspan > 1)))
            {
                registerMergedRegion(state, r, c, cell);
            }
        }
    }
}

/** Register a merged region in the map. */
function registerMergedRegion(
    state: InternalState,
    rowIdx: number,
    colIdx: number,
    cell: VisualTableCell): void
{
    const cs = cell.colspan || 1;
    const rs = cell.rowspan || 1;

    for (let dr = 0; dr < rs; dr++)
    {
        for (let dc = 0; dc < cs; dc++)
        {
            const key = (rowIdx + dr) + "," + (colIdx + dc);
            state.mergedCells.set(key, { row: rowIdx, col: colIdx });
        }
    }
}

/** Merge cells in a given range. */
function mergeCellsInternal(state: InternalState, range: CellRange): void
{
    if (state.options.allowMerge === false)
    {
        logWarn("Merge not allowed");
        return;
    }

    const nr = normalizeRange(range);
    const oldData = cloneData(state.data);
    const topLeft = ensureCell(state.data, nr.startRow, nr.startCol);
    const colspan = (nr.endCol - nr.startCol) + 1;
    const rowspan = (nr.endRow - nr.startRow) + 1;

    topLeft.colspan = colspan;
    topLeft.rowspan = rowspan;
    clearMergedChildCells(state, nr);

    pushUndo(state, createDataUndoEntry(state, oldData, cloneData(state.data)));
    renderAll(state);
    notifyChange(state);
    logDebug("Merged cells:", nr);
}

/** Clear content from cells absorbed by a merge. */
function clearMergedChildCells(state: InternalState, range: CellRange): void
{
    for (let r = range.startRow; r <= range.endRow; r++)
    {
        for (let c = range.startCol; c <= range.endCol; c++)
        {
            if (r === range.startRow && c === range.startCol)
            {
                continue;
            }

            const colId = state.data.columns[c].id;
            delete state.data.rows[r].cells[colId];
        }
    }
}

/** Unmerge a previously merged cell. */
function unmergeCellsInternal(state: InternalState, rowId: string, colId: string): void
{
    const rowIdx = state.data.rows.findIndex(r => r.id === rowId);
    const colIdx = state.data.columns.findIndex(c => c.id === colId);

    if (rowIdx < 0 || colIdx < 0)
    {
        logWarn("Invalid row/col for unmerge:", rowId, colId);
        return;
    }

    const cell = state.data.rows[rowIdx].cells[colId];

    if (!cell || (!cell.colspan && !cell.rowspan))
    {
        return;
    }

    const oldData = cloneData(state.data);
    cell.colspan = undefined;
    cell.rowspan = undefined;

    pushUndo(state, createDataUndoEntry(state, oldData, cloneData(state.data)));
    renderAll(state);
    notifyChange(state);
    logDebug("Unmerged cell:", { rowId, colId });
}

// ============================================================================
// TOOLBAR INTEGRATION (via InlineToolbar window global)
// ============================================================================

/** Check if toolbar should be shown. */
function shouldShowToolbar(state: InternalState): boolean
{
    return !!state.rootEl
        && state.mode === "edit"
        && state.options.showToolbar !== false;
}

/** Render the formatting toolbar. */
function renderToolbar(state: InternalState): void
{
    destroyToolbar(state);

    if (!shouldShowToolbar(state))
    {
        return;
    }

    const toolbarContainer = createElement("div", "vte-toolbar");
    state.toolbarEl = toolbarContainer;
    populateToolbar(state, toolbarContainer);
    state.rootEl!.insertBefore(toolbarContainer, state.rootEl!.firstChild);
}

/** Populate the toolbar container with buttons. */
function populateToolbar(state: InternalState, container: HTMLElement): void
{
    const win = window as unknown as Record<string, unknown>;
    const factory = win["createInlineToolbar"] as Function | undefined;

    if (typeof factory === "function")
    {
        buildToolbarViaComponent(state, container, factory);
    }
    else
    {
        logWarn("InlineToolbar not available, building fallback toolbar");
        buildFallbackToolbar(state, container);
    }
}

/** Build toolbar using InlineToolbar component. */
function buildToolbarViaComponent(
    state: InternalState,
    container: HTMLElement,
    createInlineToolbar: Function): void
{
    const items = buildToolbarItems(state);

    state.toolbarHandle = createInlineToolbar({
        container,
        items,
        size: "sm",
        compact: !!state.options.compact,
    });
}

/** Build toolbar items configuration. */
function buildToolbarItems(state: InternalState): any[]
{
    const textGroup = buildTextToolbarItems(state);
    const alignGroup = buildAlignToolbarItems(state);
    const structGroup = buildStructureToolbarItems(state);
    const mergeGroup = buildMergeToolbarItems(state);

    return [
        ...textGroup,
        { id: "sep1", icon: "", tooltip: "", type: "separator" },
        ...alignGroup,
        { id: "sep2", icon: "", tooltip: "", type: "separator" },
        ...structGroup,
        { id: "sep3", icon: "", tooltip: "", type: "separator" },
        ...mergeGroup,
    ];
}

/** Build text formatting toolbar items. */
function buildTextToolbarItems(_state: InternalState): any[]
{
    return [
        { id: "bold", icon: "type-bold", tooltip: "Bold (Ctrl+B)", type: "toggle", onClick: () => toggleStyleOnSelection(_state, "bold") },
        { id: "italic", icon: "type-italic", tooltip: "Italic (Ctrl+I)", type: "toggle", onClick: () => toggleStyleOnSelection(_state, "italic") },
        { id: "underline", icon: "type-underline", tooltip: "Underline (Ctrl+U)", type: "toggle", onClick: () => toggleStyleOnSelection(_state, "underline") },
    ];
}

/** Build alignment toolbar items. */
function buildAlignToolbarItems(_state: InternalState): any[]
{
    return [
        { id: "align-left", icon: "text-left", tooltip: "Align Left", type: "button", onClick: () => applyAlignToSelection(_state, "left") },
        { id: "align-center", icon: "text-center", tooltip: "Align Center", type: "button", onClick: () => applyAlignToSelection(_state, "center") },
        { id: "align-right", icon: "text-right", tooltip: "Align Right", type: "button", onClick: () => applyAlignToSelection(_state, "right") },
    ];
}

/** Build structure editing toolbar items. */
function buildStructureToolbarItems(_state: InternalState): any[]
{
    return [
        { id: "insert-row-above", icon: "arrow-bar-up", tooltip: "Insert Row Above", type: "button", onClick: () => insertRowAtAnchor(_state, 0) },
        { id: "insert-row-below", icon: "arrow-bar-down", tooltip: "Insert Row Below", type: "button", onClick: () => insertRowAtAnchor(_state, 1) },
        { id: "insert-col-left", icon: "arrow-bar-left", tooltip: "Insert Column Left", type: "button", onClick: () => insertColAtAnchor(_state, 0) },
        { id: "insert-col-right", icon: "arrow-bar-right", tooltip: "Insert Column Right", type: "button", onClick: () => insertColAtAnchor(_state, 1) },
        { id: "delete-row", icon: "dash-square", tooltip: "Delete Row", type: "button", onClick: () => deleteRowAtAnchor(_state) },
        { id: "delete-col", icon: "dash-square-dotted", tooltip: "Delete Column", type: "button", onClick: () => deleteColAtAnchor(_state) },
    ];
}

/** Build merge toolbar items. */
function buildMergeToolbarItems(_state: InternalState): any[]
{
    return [
        { id: "merge", icon: "union", tooltip: "Merge Cells", type: "button", onClick: () => mergeSelectionCells(_state) },
        { id: "unmerge", icon: "intersect", tooltip: "Unmerge Cells", type: "button", onClick: () => unmergeSelectionCells(_state) },
    ];
}

/** Build a fallback toolbar when InlineToolbar is not available. */
function buildFallbackToolbar(state: InternalState, container: HTMLElement): void
{
    const buttons = [
        { label: "B", title: "Bold", fn: () => toggleStyleOnSelection(state, "bold") },
        { label: "I", title: "Italic", fn: () => toggleStyleOnSelection(state, "italic") },
        { label: "U", title: "Underline", fn: () => toggleStyleOnSelection(state, "underline") },
    ];

    for (const btnDef of buttons)
    {
        const btn = createElement("button", "vte-toolbar-btn");
        btn.textContent = btnDef.label;
        btn.title = btnDef.title;
        setAttr(btn, { type: "button" });
        btn.addEventListener("click", btnDef.fn);
        container.appendChild(btn);
    }
}

/** Destroy the toolbar. */
function destroyToolbar(state: InternalState): void
{
    if (state.toolbarHandle && typeof state.toolbarHandle.destroy === "function")
    {
        state.toolbarHandle.destroy();
        state.toolbarHandle = null;
    }

    if (state.toolbarEl)
    {
        state.toolbarEl.remove();
        state.toolbarEl = null;
    }
}

// ============================================================================
// TOOLBAR ACTION HELPERS
// ============================================================================

/** Toggle a boolean style property on all selected cells. */
function toggleStyleOnSelection(
    state: InternalState,
    prop: "bold" | "italic" | "underline"): void
{
    const currentVal = getSelectedCellStyleProp(state, prop);
    const newVal = !currentVal;

    applyStyleToSelectionInternal(state, { [prop]: newVal });
}

/** Get a style property value from the first selected cell. */
function getSelectedCellStyleProp(
    state: InternalState,
    prop: keyof VisualTableCellStyle): unknown
{
    if (state.selections.length === 0)
    {
        return undefined;
    }

    const range = state.selections[0];
    const cell = state.data.rows[range.startRow]?.cells[state.data.columns[range.startCol]?.id];

    return cell?.style?.[prop];
}

/** Apply alignment to selection. */
function applyAlignToSelection(state: InternalState, align: "left" | "center" | "right"): void
{
    applyStyleToSelectionInternal(state, { align });
}

/** Insert a row relative to the anchor. */
function insertRowAtAnchor(state: InternalState, offset: number): void
{
    const idx = state.anchorRow + offset;
    insertRowInternal(state, idx);
    renderAll(state);
}

/** Insert a column relative to the anchor. */
function insertColAtAnchor(state: InternalState, offset: number): void
{
    const idx = state.anchorCol + offset;
    insertColumnInternal(state, idx);
    renderAll(state);
}

/** Delete the row at the anchor. */
function deleteRowAtAnchor(state: InternalState): void
{
    if (state.data.rows.length <= 1)
    {
        logWarn("Cannot delete the last row");
        return;
    }

    const rowId = state.data.rows[state.anchorRow]?.id;

    if (rowId)
    {
        removeRowInternal(state, rowId);
        renderAll(state);
    }
}

/** Delete the column at the anchor. */
function deleteColAtAnchor(state: InternalState): void
{
    if (state.data.columns.length <= 1)
    {
        logWarn("Cannot delete the last column");
        return;
    }

    const colId = state.data.columns[state.anchorCol]?.id;

    if (colId)
    {
        removeColumnInternal(state, colId);
        renderAll(state);
    }
}

/** Merge cells in the current selection. */
function mergeSelectionCells(state: InternalState): void
{
    if (state.selections.length !== 1)
    {
        logWarn("Merge requires exactly one contiguous selection");
        return;
    }

    mergeCellsInternal(state, state.selections[0]);
}

/** Unmerge cells in the current selection. */
function unmergeSelectionCells(state: InternalState): void
{
    if (state.selections.length === 0)
    {
        return;
    }

    const range = state.selections[0];
    const rowId = state.data.rows[range.startRow]?.id;
    const colId = state.data.columns[range.startCol]?.id;

    if (rowId && colId)
    {
        unmergeCellsInternal(state, rowId, colId);
    }
}

// ============================================================================
// CONTEXT MENU INTEGRATION (via ContextMenu window global)
// ============================================================================

/** Show the context menu at a position. */
function showContextMenu(state: InternalState, event: MouseEvent): void
{
    event.preventDefault();

    const win = window as unknown as Record<string, unknown>;
    const createContextMenu = win["createContextMenu"] as Function | undefined;

    if (typeof createContextMenu !== "function")
    {
        logWarn("ContextMenu component not available");
        return;
    }

    const items = buildContextMenuItems(state);

    state.contextMenuHandle = createContextMenu({
        items,
        x: event.clientX,
        y: event.clientY,
    });
}

/** Build context menu items. */
function buildContextMenuItems(state: InternalState): any[]
{
    const items: any[] = [];

    addStructureMenuItems(state, items);
    items.push({ id: "sep1", type: "separator" });
    addMergeMenuItems(state, items);
    items.push({ id: "sep2", type: "separator" });
    addContentMenuItems(state, items);
    items.push({ id: "sep3", type: "separator" });
    addClearMenuItems(state, items);

    return items;
}

/** Add structure editing context menu items. */
function addStructureMenuItems(state: InternalState, items: any[]): void
{
    const canEdit = state.options.allowStructureEdit !== false;
    const canEditCol = state.options.allowColumnEdit !== false;

    items.push(
        { id: "insert-row-above", label: "Insert Row Above", icon: "arrow-bar-up", disabled: !canEdit, onClick: () => insertRowAtAnchor(state, 0) },
        { id: "insert-row-below", label: "Insert Row Below", icon: "arrow-bar-down", disabled: !canEdit, onClick: () => insertRowAtAnchor(state, 1) },
        { id: "insert-col-left", label: "Insert Column Left", icon: "arrow-bar-left", disabled: !canEditCol, onClick: () => insertColAtAnchor(state, 0) },
        { id: "insert-col-right", label: "Insert Column Right", icon: "arrow-bar-right", disabled: !canEditCol, onClick: () => insertColAtAnchor(state, 1) },
    );

    items.push({ id: "sep-del", type: "separator" });
    items.push(
        { id: "delete-row", label: "Delete Row", icon: "dash-square", danger: true, disabled: !canEdit, onClick: () => deleteRowAtAnchor(state) },
        { id: "delete-col", label: "Delete Column", icon: "dash-square-dotted", danger: true, disabled: !canEditCol, onClick: () => deleteColAtAnchor(state) },
    );
}

/** Add merge context menu items. */
function addMergeMenuItems(state: InternalState, items: any[]): void
{
    const hasSel = state.selections.length === 1;
    const range = hasSel ? normalizeRange(state.selections[0]) : null;
    const isRange = range && (range.endRow > range.startRow || range.endCol > range.startCol);

    items.push(
        { id: "merge", label: "Merge Cells", icon: "union", disabled: !isRange, onClick: () => mergeSelectionCells(state) },
        { id: "unmerge", label: "Unmerge", icon: "intersect", onClick: () => unmergeSelectionCells(state) },
    );
}

/** Add content insertion context menu items. */
function addContentMenuItems(state: InternalState, items: any[]): void
{
    items.push(
        { id: "insert-link", label: "Insert Link", icon: "link-45deg", onClick: () => promptInsertLink(state) },
        { id: "insert-image", label: "Insert Image", icon: "image", onClick: () => promptInsertImage(state) },
    );
}

/** Add clear context menu items. */
function addClearMenuItems(state: InternalState, items: any[]): void
{
    items.push(
        { id: "clear-contents", label: "Clear Contents", icon: "eraser", onClick: () => clearSelectedCells(state) },
        { id: "clear-formatting", label: "Clear Formatting", icon: "eraser-fill", onClick: () => clearFormattingOnSelection(state) },
    );
}

/** Insert a link content segment into a cell. */
function insertLinkContent(cell: VisualTableCell, content: VisualTableCellContent): void
{
    if (typeof cell.value === "string" && cell.value)
    {
        cell.value = [
            { type: "text", text: cell.value },
            content,
        ];
    }
    else
    {
        cell.value = [content];
    }
}

/** Prompt for a link URL and insert into the selected cell. */
function promptInsertLink(state: InternalState): void
{
    const url = prompt("Enter link URL:");

    if (!url || state.selections.length === 0)
    {
        return;
    }

    const text = prompt("Enter link text:", url) || url;
    const range = state.selections[0];
    const cell = ensureCell(state.data, range.startRow, range.startCol);

    insertLinkContent(cell, { type: "link", text, url });
    renderAll(state);
    notifyChange(state);
}

/** Prompt for an image URL and insert into the selected cell. */
function promptInsertImage(state: InternalState): void
{
    const url = prompt("Enter image URL:");

    if (!url)
    {
        return;
    }

    if (state.selections.length === 0)
    {
        return;
    }

    const range = state.selections[0];
    const cell = ensureCell(state.data, range.startRow, range.startCol);
    const content: VisualTableCellContent = { type: "image", url, alt: "Image" };

    cell.value = [content];
    renderAll(state);
    notifyChange(state);
}

/** Clear formatting on all selected cells. */
function clearFormattingOnSelection(state: InternalState): void
{
    const oldData = cloneData(state.data);

    forEachSelectedCell(state, (rowIdx, colIdx) =>
    {
        const cell = ensureCell(state.data, rowIdx, colIdx);
        cell.style = undefined;
    });

    pushUndo(state, createDataUndoEntry(state, oldData, cloneData(state.data)));
    renderAll(state);
    notifyChange(state);
}

// ============================================================================
// SORTING + FILTERING
// ============================================================================

/** Sort data rows using a comparator. */
function sortRowsInternal(
    state: InternalState,
    comparator: (a: VisualTableRow, b: VisualTableRow) => number): void
{
    const headerRows = state.data.meta?.headerRows || 0;
    const headers = state.data.rows.slice(0, headerRows);
    const dataRows = state.data.rows.slice(headerRows);

    dataRows.sort(comparator);
    state.data.rows = [...headers, ...dataRows];

    renderAll(state);
    notifyChange(state);
    logDebug("Rows sorted");
}

/** Filter rows using a predicate. */
function filterRowsInternal(
    state: InternalState,
    predicate: (row: VisualTableRow) => boolean): void
{
    const headerRows = state.data.meta?.headerRows || 0;
    const indices: number[] = [];

    for (let i = headerRows; i < state.data.rows.length; i++)
    {
        if (predicate(state.data.rows[i]))
        {
            indices.push(i);
        }
    }

    state.filteredRowIndices = indices;
    state.currentPage = 0;
    renderAll(state);
    logDebug("Rows filtered:", indices.length, "of", state.data.rows.length - headerRows);
}

/** Clear any row filter. */
function clearFilterInternal(state: InternalState): void
{
    state.filteredRowIndices = null;
    state.currentPage = 0;
    renderAll(state);
    logDebug("Filter cleared");
}

// ============================================================================
// PRESETS APPLICATION
// ============================================================================

/** Apply a named preset to the table. */
function applyPresetInternal(state: InternalState, name: string): void
{
    const preset = PRESETS[name];

    if (!preset)
    {
        logWarn("Unknown preset:", name);
        return;
    }

    applyPresetMeta(state, preset);
    applyPresetHeaderStyles(state, preset);

    renderAll(state);
    notifyChange(state);
    logInfo("Preset applied:", name);
}

/** Apply preset to table meta. */
function applyPresetMeta(state: InternalState, preset: PresetConfig): void
{
    if (!state.data.meta)
    {
        state.data.meta = {};
    }

    const meta = state.data.meta;
    meta.bordered = preset.bordered;
    meta.cellBorders = preset.cellBorders;

    if (preset.alternatingRow)
    {
        meta.alternatingRows = true;
        meta.alternatingRowColor = preset.alternatingRow;
    }
    else
    {
        meta.alternatingRows = false;
    }

    if (preset.borderColor)
    {
        meta.borderColor = preset.borderColor;
    }
}

/** Apply preset styles to header rows. */
function applyPresetHeaderStyles(state: InternalState, preset: PresetConfig): void
{
    const headerRows = state.data.meta?.headerRows || 0;

    for (let r = 0; r < headerRows && r < state.data.rows.length; r++)
    {
        const row = state.data.rows[r];

        for (const col of state.data.columns)
        {
            const cell = row.cells[col.id];

            if (!cell)
            {
                continue;
            }

            if (!cell.style)
            {
                cell.style = {};
            }

            cell.style.background = preset.headerBg;
            cell.style.color = preset.headerFg;
            cell.style.bold = true;
        }
    }
}

// ============================================================================
// DEBOUNCE + CALLBACKS
// ============================================================================

/** Notify the host of data changes (debounced). */
function notifyChange(state: InternalState): void
{
    if (!state.options.onChange)
    {
        return;
    }

    if (state.debounceTimer !== null)
    {
        clearTimeout(state.debounceTimer);
    }

    state.debounceTimer = window.setTimeout(() =>
    {
        state.debounceTimer = null;

        if (state.options.onChange && !state.destroyed)
        {
            state.options.onChange(cloneData(state.data));
        }
    }, DEBOUNCE_MS);
}

/** Apply a style to all selected cells. */
function applyStyleToSelectionInternal(
    state: InternalState,
    style: VisualTableCellStyle): void
{
    if (state.selections.length === 0)
    {
        return;
    }

    const oldData = cloneData(state.data);

    forEachSelectedCell(state, (rowIdx, colIdx) =>
    {
        const cell = ensureCell(state.data, rowIdx, colIdx);
        cell.style = { ...(cell.style || {}), ...style };
    });

    pushUndo(state, createDataUndoEntry(state, oldData, cloneData(state.data)));
    renderAll(state);
    fireStyleChangeForSelection(state, style);
    notifyChange(state);
}

/** Fire onStyleChange for all selected cells. */
function fireStyleChangeForSelection(
    state: InternalState,
    style: VisualTableCellStyle): void
{
    if (!state.options.onStyleChange)
    {
        return;
    }

    forEachSelectedCell(state, (rowIdx, colIdx) =>
    {
        const rowId = state.data.rows[rowIdx]?.id;
        const colId = state.data.columns[colIdx]?.id;

        if (rowId && colId)
        {
            state.options.onStyleChange!(rowId, colId, style);
        }
    });
}

// ============================================================================
// PAGINATION
// ============================================================================

/** Render the pagination bar. */
function renderPagination(state: InternalState): void
{
    if (state.paginationEl)
    {
        state.paginationEl.remove();
        state.paginationEl = null;
    }

    if (state.effectivePageSize <= 0)
    {
        return;
    }

    const totalPages = getTotalPages(state);

    if (totalPages <= 1)
    {
        return;
    }

    const bar = createElement("div", "vte-pagination");
    buildPaginationControls(state, bar, totalPages);
    state.rootEl!.appendChild(bar);
    state.paginationEl = bar;
}

/** Build pagination control elements. */
function buildPaginationControls(
    state: InternalState,
    bar: HTMLElement,
    totalPages: number): void
{
    const prevBtn = buildPageButton("\u25C0", state.currentPage > 0, () =>
    {
        state.currentPage--;
        renderAll(state);
    });

    const label = createElement("span", "vte-pagination-label");
    label.textContent = "Page " + (state.currentPage + 1) + " of " + totalPages;

    const nextBtn = buildPageButton("\u25B6", state.currentPage < totalPages - 1, () =>
    {
        state.currentPage++;
        renderAll(state);
    });

    bar.appendChild(prevBtn);
    bar.appendChild(label);
    bar.appendChild(nextBtn);
}

/** Build a pagination button. */
function buildPageButton(
    text: string,
    enabled: boolean,
    onClick: () => void): HTMLElement
{
    const btn = createElement("button", "vte-pagination-btn");
    btn.textContent = text;
    setAttr(btn, { type: "button" });

    if (!enabled)
    {
        (btn as HTMLButtonElement).disabled = true;
    }
    else
    {
        btn.addEventListener("click", onClick);
    }

    return btn;
}

// ============================================================================
// SUMMARY BAR
// ============================================================================

/** Render the summary bar. */
function renderSummaryBar(state: InternalState): void
{
    if (state.summaryBarEl)
    {
        state.summaryBarEl.remove();
        state.summaryBarEl = null;
    }

    const meta = state.data.meta || {};

    if (!meta.showSummaryBar)
    {
        return;
    }

    const bar = createElement("div", "vte-summary-bar");
    state.summaryBarEl = bar;
    state.rootEl!.appendChild(bar);
    updateSummaryBarFromSelection(state);
}

/** Update the summary bar with aggregate values from the current selection. */
function updateSummaryBarFromSelection(state: InternalState): void
{
    if (!state.summaryBarEl)
    {
        return;
    }

    state.summaryBarEl.textContent = "";

    if (state.selections.length === 0)
    {
        return;
    }

    const result = computeSelectionAggregates(state);
    renderSummaryBarContent(state, result);
    fireAggregateChange(state, result);
}

/** Compute aggregates for the current selection. */
function computeSelectionAggregates(state: InternalState): AggregateResult
{
    const cellValues: string[] = [];
    let totalCells = 0;

    forEachSelectedCell(state, (rowIdx, colIdx) =>
    {
        totalCells++;
        const colId = state.data.columns[colIdx]?.id;
        const cell = state.data.rows[rowIdx]?.cells[colId];
        cellValues.push(cellTextValue(cell));
    });

    return computeAggregateResult(cellValues, totalCells);
}

/** Render the content of the summary bar. */
function renderSummaryBarContent(state: InternalState, result: AggregateResult): void
{
    if (!state.summaryBarEl || result.countNumbers < 2)
    {
        return;
    }

    const meta = state.data.meta || {};
    const showAggs = meta.summaryBarAggregates || ["sum", "average", "min", "max", "count"];
    const parts: string[] = [];

    for (const aggName of showAggs)
    {
        const formatted = getFormattedAggValue(result, aggName);

        if (formatted)
        {
            parts.push(capitaliseFirst(aggName) + ": " + formatted);
        }
    }

    if (parts.length > 0)
    {
        const countLabel = result.countNumbers + " of " + result.totalCells + " cells";
        state.summaryBarEl!.textContent = parts.join("  |  ") + "  (" + countLabel + ")";
    }
}

/** Get a formatted aggregate value from a result. */
function getFormattedAggValue(result: AggregateResult, aggName: string): string | null
{
    if (aggName === "count")
    {
        return String(result.count);
    }

    if (aggName === "countNumbers")
    {
        return String(result.countNumbers);
    }

    return result.formatted[aggName] || null;
}

/** Capitalise the first letter of a string. */
function capitaliseFirst(str: string): string
{
    if (!str)
    {
        return str;
    }

    return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Fire the onAggregateChange callback. */
function fireAggregateChange(state: InternalState, result: AggregateResult): void
{
    if (state.options.onAggregateChange)
    {
        state.options.onAggregateChange(result);
    }
}

// ============================================================================
// STRUCTURE EDITING
// ============================================================================

/** Insert a row at a given index (or end). Returns the new row ID. */
function insertRowInternal(state: InternalState, index?: number): string
{
    if (state.options.allowStructureEdit === false)
    {
        logWarn("Structure editing not allowed");
        return "";
    }

    const id = generateId("row");
    const cells: Record<string, VisualTableCell> = {};

    for (const col of state.data.columns)
    {
        cells[col.id] = { value: "" };
    }

    const newRow: VisualTableRow = { id, cells };
    const idx = (index !== undefined) ? index : state.data.rows.length;
    state.data.rows.splice(idx, 0, newRow);

    if (state.options.onStructureChange)
    {
        state.options.onStructureChange("insert-row", { rowId: id, index: idx });
    }

    notifyChange(state);
    logDebug("Row inserted:", id, "at index:", idx);
    return id;
}

/** Remove a row by ID. */
function removeRowInternal(state: InternalState, rowId: string): void
{
    if (state.options.allowStructureEdit === false)
    {
        logWarn("Structure editing not allowed");
        return;
    }

    const idx = state.data.rows.findIndex(r => r.id === rowId);

    if (idx < 0)
    {
        logWarn("Row not found:", rowId);
        return;
    }

    const oldData = cloneData(state.data);
    state.data.rows.splice(idx, 1);
    pushUndo(state, createDataUndoEntry(state, oldData, cloneData(state.data)));

    if (state.options.onStructureChange)
    {
        state.options.onStructureChange("remove-row", { rowId });
    }

    notifyChange(state);
    logDebug("Row removed:", rowId);
}

/** Insert a column at a given index (or end). Returns the new column ID. */
function insertColumnInternal(state: InternalState, index?: number): string
{
    if (state.options.allowColumnEdit === false)
    {
        logWarn("Column editing not allowed");
        return "";
    }

    const id = generateId("col");
    const newCol: VisualTableColumn = { id, width: DEFAULT_COL_WIDTH };
    const idx = (index !== undefined) ? index : state.data.columns.length;
    state.data.columns.splice(idx, 0, newCol);

    for (const row of state.data.rows)
    {
        row.cells[id] = { value: "" };
    }

    if (state.options.onStructureChange)
    {
        state.options.onStructureChange("insert-column", { columnId: id, index: idx });
    }

    notifyChange(state);
    logDebug("Column inserted:", id, "at index:", idx);
    return id;
}

/** Remove column cells from all rows. */
function removeColumnFromRows(data: VisualTableData, colId: string): void
{
    for (const row of data.rows)
    {
        delete row.cells[colId];
    }
}

/** Remove a column by ID. */
function removeColumnInternal(state: InternalState, colId: string): void
{
    if (state.options.allowColumnEdit === false)
    {
        logWarn("Column editing not allowed");
        return;
    }

    const idx = state.data.columns.findIndex(c => c.id === colId);

    if (idx < 0)
    {
        logWarn("Column not found:", colId);
        return;
    }

    const oldData = cloneData(state.data);
    state.data.columns.splice(idx, 1);
    removeColumnFromRows(state.data, colId);
    pushUndo(state, createDataUndoEntry(state, oldData, cloneData(state.data)));

    if (state.options.onStructureChange)
    {
        state.options.onStructureChange("remove-column", { columnId: colId });
    }

    notifyChange(state);
    logDebug("Column removed:", colId);
}

/** Move a row from one index to another. */
function moveRowInternal(state: InternalState, fromIdx: number, toIdx: number): void
{
    if (fromIdx < 0 || fromIdx >= state.data.rows.length)
    {
        logWarn("Invalid moveRow fromIndex:", fromIdx);
        return;
    }

    if (toIdx < 0 || toIdx >= state.data.rows.length)
    {
        logWarn("Invalid moveRow toIndex:", toIdx);
        return;
    }

    const oldData = cloneData(state.data);
    const [row] = state.data.rows.splice(fromIdx, 1);
    state.data.rows.splice(toIdx, 0, row);

    pushUndo(state, createDataUndoEntry(state, oldData, cloneData(state.data)));

    if (state.options.onStructureChange)
    {
        state.options.onStructureChange("move-row", { fromIndex: fromIdx, toIndex: toIdx });
    }

    renderAll(state);
    notifyChange(state);
}

/** Move a column from one index to another. */
function moveColumnInternal(state: InternalState, fromIdx: number, toIdx: number): void
{
    if (fromIdx < 0 || fromIdx >= state.data.columns.length)
    {
        logWarn("Invalid moveColumn fromIndex:", fromIdx);
        return;
    }

    if (toIdx < 0 || toIdx >= state.data.columns.length)
    {
        logWarn("Invalid moveColumn toIndex:", toIdx);
        return;
    }

    const oldData = cloneData(state.data);
    const [col] = state.data.columns.splice(fromIdx, 1);
    state.data.columns.splice(toIdx, 0, col);

    pushUndo(state, createDataUndoEntry(state, oldData, cloneData(state.data)));

    if (state.options.onStructureChange)
    {
        state.options.onStructureChange("move-column", { fromIndex: fromIdx, toIndex: toIdx });
    }

    renderAll(state);
    notifyChange(state);
}

// ============================================================================
// EVENT BINDING
// ============================================================================

/** Bind all event listeners to the table container. */
function bindEvents(state: InternalState): void
{
    if (!state.tableContainerEl)
    {
        return;
    }

    const tableClick = (e: Event) => onTableClick(state, e as MouseEvent);
    const tableDblClick = (e: Event) => onTableDoubleClick(state, e as MouseEvent);
    const tableContext = (e: Event) => onTableContextMenu(state, e as MouseEvent);
    const keyDown = (e: Event) => handleKeyDown(state, e as KeyboardEvent);
    const resizeDown = (e: Event) => onResizeHandleMouseDown(state, e as MouseEvent);

    state.tableContainerEl.addEventListener("click", tableClick);
    state.tableContainerEl.addEventListener("dblclick", tableDblClick);
    state.tableContainerEl.addEventListener("contextmenu", tableContext);
    state.tableContainerEl.addEventListener("keydown", keyDown);
    state.tableContainerEl.addEventListener("mousedown", resizeDown);

    state.boundHandlers = {
        click: tableClick,
        dblclick: tableDblClick,
        contextmenu: tableContext,
        keydown: keyDown,
        mousedown: resizeDown,
    };

    setAttr(state.tableContainerEl as HTMLElement, { tabindex: "0" });
}

/** Unbind all event listeners. */
function unbindEvents(state: InternalState): void
{
    if (!state.tableContainerEl)
    {
        return;
    }

    for (const [evt, handler] of Object.entries(state.boundHandlers))
    {
        state.tableContainerEl.removeEventListener(evt, handler);
    }

    state.boundHandlers = {};
}

/** Handle click on the table. */
function onTableClick(state: InternalState, event: MouseEvent): void
{
    const target = event.target as HTMLElement;

    // Row-number gutter click → select entire row
    if (target.closest(".vte-row-number"))
    {
        const gutter = target.closest(".vte-row-number") as HTMLElement;
        const rowIdx = parseInt(gutter.getAttribute("data-row") || "-1", 10);

        if (rowIdx >= 0)
        {
            if (state.editingCell) { finishCellEdit(state, true); }
            selectRowInternal(state, rowIdx, event.ctrlKey || event.metaKey);
        }
        return;
    }

    const cell = target.closest(".vte-cell") as HTMLElement | null;

    if (!cell)
    {
        return;
    }

    const rowIdx = parseInt(cell.getAttribute("data-row") || "-1", 10);
    const colIdx = parseInt(cell.getAttribute("data-col") || "-1", 10);

    if (rowIdx < 0 || colIdx < 0)
    {
        return;
    }

    if (state.editingCell)
    {
        finishCellEdit(state, true);
    }

    // Header cell click → select entire column
    const headerRows = state.data.meta?.headerRows || 0;

    if (rowIdx < headerRows)
    {
        selectColumnInternal(state, colIdx, event.ctrlKey || event.metaKey);
        fireHeaderClick(state, colIdx, event);
        return;
    }

    handleCellClick(state, rowIdx, colIdx, event);
}

/** Fire the onHeaderClick callback for a column. */
function fireHeaderClick(
    state: InternalState,
    colIdx: number,
    event: MouseEvent): void
{
    const colId = state.data.columns[colIdx]?.id;

    if (colId && state.options.onHeaderClick)
    {
        state.options.onHeaderClick(colId, event);
    }
}

/** Handle double-click on the table. */
function onTableDoubleClick(state: InternalState, event: MouseEvent): void
{
    if (state.mode !== "edit")
    {
        return;
    }

    const target = event.target as HTMLElement;
    const cell = target.closest(".vte-cell") as HTMLElement | null;

    if (!cell)
    {
        return;
    }

    const rowIdx = parseInt(cell.getAttribute("data-row") || "-1", 10);
    const colIdx = parseInt(cell.getAttribute("data-col") || "-1", 10);

    if (rowIdx >= 0 && colIdx >= 0)
    {
        startCellEdit(state, rowIdx, colIdx);
    }
}

/** Handle context menu on the table. */
function onTableContextMenu(state: InternalState, event: MouseEvent): void
{
    if (state.mode !== "edit")
    {
        return;
    }

    const target = event.target as HTMLElement;
    const cell = target.closest(".vte-cell") as HTMLElement | null;

    if (cell)
    {
        const rowIdx = parseInt(cell.getAttribute("data-row") || "-1", 10);
        const colIdx = parseInt(cell.getAttribute("data-col") || "-1", 10);

        handleHeaderContextMenu(state, rowIdx, colIdx, event);
    }

    showContextMenu(state, event);
}

/** Check if a header cell was right-clicked and fire the callback. */
function handleHeaderContextMenu(
    state: InternalState,
    rowIdx: number,
    colIdx: number,
    event: MouseEvent): void
{
    const headerRows = state.data.meta?.headerRows || 0;

    if (rowIdx >= headerRows)
    {
        return;
    }

    const colId = state.data.columns[colIdx]?.id;

    if (colId && state.options.onHeaderContextMenu)
    {
        state.options.onHeaderContextMenu(colId, event);
    }
}

/** Handle mousedown on resize handles. */
function onResizeHandleMouseDown(state: InternalState, event: MouseEvent): void
{
    const target = event.target as HTMLElement;

    if (!target.classList.contains("vte-resize-handle"))
    {
        return;
    }

    const colIdx = parseInt(target.getAttribute("data-col-index") || "-1", 10);

    if (colIdx >= 0)
    {
        handleResizeMouseDown(state, colIdx, event);
    }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/** Create a VisualTableEditor instance. */
export function createVisualTableEditor(options: VisualTableEditorOptions): VisualTableEditor
{
    const container = resolveContainer(options.container);

    if (!container)
    {
        logError("Container not found:", options.container);
        throw new Error(LOG_PREFIX + " Container not found");
    }

    const state = initializeState(options, container);
    buildDom(state);
    bindEvents(state);

    if (options.preset)
    {
        applyPresetInternal(state, options.preset);
    }

    renderAll(state);
    renderColumnResizeHandles(state);

    logInfo("Initialised", { id: state.id, mode: state.mode, rows: state.data.rows.length, cols: state.data.columns.length });
    logDebug("Effective config:", { pageSize: state.effectivePageSize, compact: options.compact, contained: options.contained });

    return buildPublicHandle(state);
}

/** Create default DOM element references. */
function createDefaultDomRefs(): Pick<InternalState,
    "rootEl" | "tableContainerEl" | "tableEl" | "toolbarEl" | "paginationEl" | "summaryBarEl">
{
    return {
        rootEl: null,
        tableContainerEl: null,
        tableEl: null,
        toolbarEl: null,
        paginationEl: null,
        summaryBarEl: null,
    };
}

/** Create default resize state. */
function createDefaultResizeState(): Pick<InternalState,
    "resizingCol" | "resizeStartX" | "resizeStartWidth" | "resizingRow" | "resizeStartY" | "resizeStartHeight">
{
    return {
        resizingCol: -1, resizeStartX: 0, resizeStartWidth: 0,
        resizingRow: -1, resizeStartY: 0, resizeStartHeight: 0,
    };
}

/** Initialize the internal state. */
function initializeState(
    options: VisualTableEditorOptions,
    container: HTMLElement): InternalState
{
    const data = options.data ? cloneData(options.data) : createDefaultData();

    return {
        id: ++_instanceId,
        mode: options.mode || "edit",
        data, options, container,
        ...createDefaultDomRefs(),
        selections: [], anchorRow: 0, anchorCol: 0,
        editingCell: null, editOriginalValue: "",
        undoStack: [], redoStack: [],
        currentPage: 0, effectivePageSize: 0,
        filteredRowIndices: null, destroyed: false,
        debounceTimer: null,
        ...createDefaultResizeState(),
        boundHandlers: {},
        toolbarHandle: null, contextMenuHandle: null,
        mergedCells: new Map(),
    };
}

/** Build the root DOM structure. */
function buildDom(state: InternalState): void
{
    const root = createElement("div", "vte-root");
    setAttr(root, { "data-vte-id": String(state.id) });

    if (state.options.cssClass)
    {
        root.className += " " + state.options.cssClass;
    }

    const tableContainer = createElement("div", "vte-table-container");
    tableContainer.style.position = "relative";
    tableContainer.style.overflow = "auto";
    root.appendChild(tableContainer);

    state.rootEl = root;
    state.tableContainerEl = tableContainer;
    state.container.appendChild(root);
}

// ============================================================================
// PUBLIC API HANDLE
// ============================================================================

/** Build mode and data API methods. */
function buildDataMethods(state: InternalState): Pick<VisualTableEditor,
    "setMode" | "getMode" | "getData" | "setData" | "clear" |
    "getCellValue" | "setCellValue" | "getCellStyle" | "setCellStyle">
{
    return {
        setMode: (mode) => setModePublic(state, mode),
        getMode: () => state.mode,
        getData: () => cloneData(state.data),
        setData: (data) => setDataPublic(state, data),
        clear: () => clearPublic(state),
        getCellValue: (row, col) => getCellValuePublic(state, row, col),
        setCellValue: (row, col, value) => setCellValuePublic(state, row, col, value),
        getCellStyle: (row, col) => getCellStylePublic(state, row, col),
        setCellStyle: (row, col, style) => setCellStylePublic(state, row, col, style),
    };
}

/** Build selection API methods. */
function buildSelectionMethods(state: InternalState): Pick<VisualTableEditor,
    "getSelection" | "setSelection" | "addToSelection" |
    "selectRow" | "selectColumn" | "selectAll" | "clearSelection">
{
    return {
        getSelection: () => [...state.selections],
        setSelection: (range) => setSelectionInternal(state, range),
        addToSelection: (range) => addSelectionInternal(state, range),
        selectRow: (rowIndex) => selectRowInternal(state, rowIndex, false),
        selectColumn: (colIndex) => selectColumnInternal(state, colIndex, false),
        selectAll: () => selectAllInternal(state),
        clearSelection: () => clearSelectionInternal(state),
    };
}

/** Build structure editing API methods. */
function buildStructureMethods(state: InternalState): Pick<VisualTableEditor,
    "insertRow" | "removeRow" | "insertColumn" | "removeColumn" |
    "setColumnWidth" | "setRowHeight" | "moveRow" | "moveColumn" |
    "mergeCells" | "unmergeCells">
{
    return {
        insertRow: (index) => { const id = insertRowInternal(state, index); renderAll(state); return id; },
        removeRow: (rowId) => { removeRowInternal(state, rowId); renderAll(state); },
        insertColumn: (index) => { const id = insertColumnInternal(state, index); renderAll(state); return id; },
        removeColumn: (colId) => { removeColumnInternal(state, colId); renderAll(state); },
        setColumnWidth: (colId, width) => setColumnWidthPublic(state, colId, width),
        setRowHeight: (rowId, height) => setRowHeightPublic(state, rowId, height),
        moveRow: (from, to) => moveRowInternal(state, from, to),
        moveColumn: (from, to) => moveColumnInternal(state, from, to),
        mergeCells: (range) => mergeCellsInternal(state, range),
        unmergeCells: (row, col) => unmergeCellsInternal(state, row, col),
    };
}

/** Build formatting, sorting, aggregate, and lifecycle API methods. */
function buildFormattingMethods(state: InternalState): Pick<VisualTableEditor,
    "applyStyleToSelection" | "applyPreset" | "setHeaderRows" | "setAlternatingRows" |
    "sortRows" | "filterRows" | "clearFilter" |
    "getAggregates" | "setFooterAggregate" | "setColumnAggregate" | "showSummaryBar" |
    "show" | "hide" | "destroy" | "refresh">
{
    return {
        applyStyleToSelection: (style) => applyStyleToSelectionInternal(state, style),
        applyPreset: (name) => applyPresetInternal(state, name),
        setHeaderRows: (count) => setHeaderRowsPublic(state, count),
        setAlternatingRows: (enabled, color) => setAlternatingRowsPublic(state, enabled, color),
        sortRows: (comparator) => sortRowsInternal(state, comparator),
        filterRows: (predicate) => filterRowsInternal(state, predicate),
        clearFilter: () => clearFilterInternal(state),
        getAggregates: (range) => getAggregatesPublic(state, range),
        setFooterAggregate: (type) => setFooterAggregatePublic(state, type),
        setColumnAggregate: (colId, type) => setColumnAggregatePublic(state, colId, type),
        showSummaryBar: (show) => showSummaryBarPublic(state, show),
        show: () => showPublic(state),
        hide: () => hidePublic(state),
        destroy: () => destroyPublic(state),
        refresh: () => renderAll(state),
    };
}

/** Build the public API handle object. */
function buildPublicHandle(state: InternalState): VisualTableEditor
{
    return {
        ...buildDataMethods(state),
        ...buildSelectionMethods(state),
        ...buildStructureMethods(state),
        ...buildFormattingMethods(state),
    };
}

// ============================================================================
// PUBLIC API METHOD IMPLEMENTATIONS
// ============================================================================

/** Switch between edit and view modes. */
function setModePublic(state: InternalState, mode: "edit" | "view"): void
{
    if (state.mode === mode)
    {
        return;
    }

    if (state.editingCell)
    {
        finishCellEdit(state, true);
    }

    state.mode = mode;
    clearSelectionInternal(state);
    renderAll(state);
    renderColumnResizeHandles(state);

    if (state.options.onModeChange)
    {
        state.options.onModeChange(mode);
    }

    logInfo("Mode changed to:", mode);
}

/** Replace the table data. */
function setDataPublic(state: InternalState, data: VisualTableData): void
{
    if (state.editingCell)
    {
        finishCellEdit(state, false);
    }

    state.data = cloneData(data);
    state.selections = [];
    state.currentPage = 0;
    state.filteredRowIndices = null;
    state.undoStack = [];
    state.redoStack = [];
    renderAll(state);
    renderColumnResizeHandles(state);
    logDebug("Data loaded:", { rows: data.rows.length, cols: data.columns.length });
}

/** Clear the table, preserving column count. */
function clearPublic(state: InternalState): void
{
    const oldData = cloneData(state.data);

    for (const row of state.data.rows)
    {
        for (const col of state.data.columns)
        {
            row.cells[col.id] = { value: "" };
        }
    }

    // Keep the same number of rows as before, but clear content
    pushUndo(state, createDataUndoEntry(state, oldData, cloneData(state.data)));
    renderAll(state);
    notifyChange(state);
    logInfo("Table cleared");
}

/** Get a cell's text value by row/column IDs. */
function getCellValuePublic(state: InternalState, rowId: string, colId: string): string
{
    const row = state.data.rows.find(r => r.id === rowId);

    if (!row)
    {
        logWarn("Row not found:", rowId);
        return "";
    }

    return cellTextValue(row.cells[colId]);
}

/** Set a cell's text value by row/column IDs. */
function setCellValuePublic(
    state: InternalState,
    rowId: string,
    colId: string,
    value: string): void
{
    const rowIdx = state.data.rows.findIndex(r => r.id === rowId);
    const colIdx = state.data.columns.findIndex(c => c.id === colId);

    if (rowIdx < 0 || colIdx < 0)
    {
        logWarn("Invalid cell reference:", rowId, colId);
        return;
    }

    const cell = ensureCell(state.data, rowIdx, colIdx);
    const oldVal = cellTextValue(cell);
    cell.value = value;

    pushUndo(state, createValueUndoEntry(state, rowIdx, colIdx, oldVal, value));
    fireCellChange(state, rowIdx, colIdx, oldVal, value);
    renderAll(state);
    notifyChange(state);
}

/** Get a cell's style by row/column IDs. */
function getCellStylePublic(
    state: InternalState,
    rowId: string,
    colId: string): VisualTableCellStyle
{
    const row = state.data.rows.find(r => r.id === rowId);

    if (!row)
    {
        logWarn("Row not found:", rowId);
        return {};
    }

    return { ...(row.cells[colId]?.style || {}) };
}

/** Set a cell's style by row/column IDs (merge with existing). */
function setCellStylePublic(
    state: InternalState,
    rowId: string,
    colId: string,
    style: VisualTableCellStyle): void
{
    const rowIdx = state.data.rows.findIndex(r => r.id === rowId);
    const colIdx = state.data.columns.findIndex(c => c.id === colId);

    if (rowIdx < 0 || colIdx < 0)
    {
        logWarn("Invalid cell reference:", rowId, colId);
        return;
    }

    const cell = ensureCell(state.data, rowIdx, colIdx);
    const oldStyle = cell.style ? { ...cell.style } : undefined;
    cell.style = { ...(cell.style || {}), ...style };

    pushUndo(state, createStyleUndoEntry(state, rowIdx, colIdx, oldStyle, style));

    if (state.options.onStyleChange)
    {
        state.options.onStyleChange(rowId, colId, style);
    }

    renderAll(state);
    notifyChange(state);
}

/** Set column width by column ID. */
function setColumnWidthPublic(state: InternalState, colId: string, width: number): void
{
    const col = state.data.columns.find(c => c.id === colId);

    if (!col)
    {
        logWarn("Column not found:", colId);
        return;
    }

    col.width = width;
    renderAll(state);
    renderColumnResizeHandles(state);
    notifyChange(state);
}

/** Set row height by row ID. */
function setRowHeightPublic(state: InternalState, rowId: string, height: number): void
{
    const row = state.data.rows.find(r => r.id === rowId);

    if (!row)
    {
        logWarn("Row not found:", rowId);
        return;
    }

    row.height = Math.max(MIN_ROW_HEIGHT, height);
    renderAll(state);
    notifyChange(state);
}

/** Set the number of header rows. */
function setHeaderRowsPublic(state: InternalState, count: number): void
{
    if (!state.data.meta)
    {
        state.data.meta = {};
    }

    state.data.meta.headerRows = count;
    renderAll(state);
    notifyChange(state);
}

/** Toggle alternating row colours. */
function setAlternatingRowsPublic(
    state: InternalState,
    enabled: boolean,
    color?: string): void
{
    if (!state.data.meta)
    {
        state.data.meta = {};
    }

    state.data.meta.alternatingRows = enabled;

    if (color)
    {
        state.data.meta.alternatingRowColor = color;
    }

    renderAll(state);
    notifyChange(state);
}

/** Compute aggregates for a range. */
function getAggregatesPublic(
    state: InternalState,
    range?: CellRange): AggregateResult
{
    if (!range && state.selections.length === 0)
    {
        return buildEmptyAggregate(0, 0, 0);
    }

    if (range)
    {
        return computeAggregatesForRange(state, range);
    }

    return computeSelectionAggregates(state);
}

/** Compute aggregates for a specific range. */
function computeAggregatesForRange(
    state: InternalState,
    range: CellRange): AggregateResult
{
    const nr = normalizeRange(range);
    const cellValues: string[] = [];
    let totalCells = 0;

    for (let r = nr.startRow; r <= nr.endRow; r++)
    {
        for (let c = nr.startCol; c <= nr.endCol; c++)
        {
            totalCells++;
            const colId = state.data.columns[c]?.id;
            const cell = state.data.rows[r]?.cells[colId];
            cellValues.push(cellTextValue(cell));
        }
    }

    return computeAggregateResult(cellValues, totalCells);
}

/** Set the table-level footer aggregate type. */
function setFooterAggregatePublic(state: InternalState, type: string): void
{
    if (!state.data.meta)
    {
        state.data.meta = {};
    }

    state.data.meta.footerAggregate = type as any;
    renderAll(state);
}

/** Set per-column footer aggregate. */
function setColumnAggregatePublic(
    state: InternalState,
    colId: string,
    type: string): void
{
    const col = state.data.columns.find(c => c.id === colId);

    if (!col)
    {
        logWarn("Column not found:", colId);
        return;
    }

    col.aggregate = type as any;
    renderAll(state);
}

/** Toggle summary bar visibility. */
function showSummaryBarPublic(state: InternalState, show: boolean): void
{
    if (!state.data.meta)
    {
        state.data.meta = {};
    }

    state.data.meta.showSummaryBar = show;
    renderAll(state);
}

/** Show the component. */
function showPublic(state: InternalState): void
{
    if (state.rootEl)
    {
        state.rootEl.style.display = "";
    }
}

/** Hide the component. */
function hidePublic(state: InternalState): void
{
    if (state.rootEl)
    {
        state.rootEl.style.display = "none";
    }
}

/** Clear all DOM references from state. */
function clearDomReferences(state: InternalState): void
{
    state.rootEl = null;
    state.tableContainerEl = null;
    state.tableEl = null;
    state.paginationEl = null;
    state.summaryBarEl = null;
}

/** Tear down listeners and child components. */
function tearDownSubComponents(state: InternalState): void
{
    if (state.debounceTimer !== null)
    {
        clearTimeout(state.debounceTimer);
    }

    finishCellEdit(state, false);
    unbindEvents(state);
    destroyToolbar(state);

    if (state.contextMenuHandle && typeof state.contextMenuHandle.destroy === "function")
    {
        state.contextMenuHandle.destroy();
    }
}

/** Destroy the component and release resources. */
function destroyPublic(state: InternalState): void
{
    if (state.destroyed)
    {
        return;
    }

    state.destroyed = true;
    tearDownSubComponents(state);

    if (state.rootEl)
    {
        state.rootEl.remove();
    }

    clearDomReferences(state);
    logInfo("Destroyed", { id: state.id });
}

// ============================================================================
// WINDOW GLOBAL EXPORT
// ============================================================================

(window as unknown as Record<string, unknown>)["createVisualTableEditor"] = createVisualTableEditor;
