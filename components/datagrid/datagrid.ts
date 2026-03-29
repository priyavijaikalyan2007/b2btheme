/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: DataGrid
 * 📜 PURPOSE: High-performance flat data table with sorting, filtering,
 *    pagination, column resize, row selection, inline editing, aggregation,
 *    virtual scrolling, and CSV export.
 * 🔗 RELATES: [[EnterpriseTheme]], [[CustomComponents]]
 * ⚡ FLOW: [Consumer] -> [new DataGrid()] -> [show()] -> [DOM grid]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// INTERFACES
// ============================================================================

/** Describes a single column in the DataGrid. */
export interface DataGridColumn
{
    id: string;
    label: string;
    width?: number;
    minWidth?: number;
    maxWidth?: number;
    resizable?: boolean;
    sortable?: boolean;
    filterable?: boolean;
    filterType?: "text" | "select" | "number-range" | "date-range";
    filterOptions?: Array<{ value: string; label: string }>;
    editable?: boolean;
    editorType?: "text" | "number" | "select" | "date";
    editorOptions?: Array<{ value: string; label: string }>;
    align?: "left" | "center" | "right";
    renderer?: (cell: HTMLElement, row: DataGridRow, value: unknown) => void;
    comparator?: (a: unknown, b: unknown) => number;
    aggregate?: "sum" | "avg" | "count" | "min" | "max"
        | ((values: unknown[]) => string);
    cssClass?: string;
    pinned?: "left" | "right";
    hidden?: boolean;
}

/** Represents a single row in the DataGrid. */
export interface DataGridRow
{
    id: string;
    data: Record<string, unknown>;
    cssClass?: string;
    disabled?: boolean;
}

/** Sort state entry. */
interface SortEntry
{
    columnId: string;
    direction: "asc" | "desc";
}

/** Configuration options for the DataGrid component. */
export interface DataGridOptions
{
    columns: DataGridColumn[];
    rows?: DataGridRow[];
    pageSize?: number;
    pageSizeOptions?: number[];
    serverSide?: boolean;
    virtualScrolling?: "auto" | "enabled" | "disabled";
    selectable?: boolean | "single" | "multi" | "checkbox";
    showRowNumbers?: boolean;
    showFooter?: boolean;
    striped?: boolean;
    dense?: boolean;
    enableColumnReorder?: boolean;
    externalSort?: boolean;
    externalFilter?: boolean;
    height?: string;
    emptyStateOptions?: object;
    cssClass?: string;
    onSort?: (sorts: SortEntry[]) => void;
    onFilter?: (filters: Record<string, unknown>) => void;
    onPageChange?: (page: number, pageSize: number) => void;
    onCellEdit?: (
        rowId: string, columnId: string,
        oldValue: unknown, newValue: unknown
    ) => boolean | void;
    onRowSelect?: (selectedIds: string[]) => void;
    onRowClick?: (row: DataGridRow) => void;
    onRowDoubleClick?: (row: DataGridRow) => void;
    onColumnResize?: (columnId: string, width: number) => void;
    onColumnReorder?: (columnId: string, newIndex: number) => void;
    onExport?: (format: "csv") => void;
    /** Override default key combos. Keys are action names, values are combo strings. */
    keyBindings?: Partial<Record<string, string>>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[DataGrid]";
function logInfo(...args: unknown[]): void
{
    console.log(new Date().toISOString(), "[INFO]", LOG_PREFIX, ...args);
}

function logWarn(...args: unknown[]): void
{
    console.warn(new Date().toISOString(), "[WARN]", LOG_PREFIX, ...args);
}

function logError(...args: unknown[]): void
{
    console.error(new Date().toISOString(), "[ERROR]", LOG_PREFIX, ...args);
}

function logDebug(...args: unknown[]): void
{
    console.debug(new Date().toISOString(), "[DEBUG]", LOG_PREFIX, ...args);
}

const DEFAULT_COL_WIDTH = 120;
const MIN_COL_WIDTH = 60;
const DEFAULT_PAGE_SIZE = 50;
const DEFAULT_PAGE_OPTIONS = [25, 50, 100, 250];
const ROW_HEIGHT = 32;
const ROW_HEIGHT_DENSE = 24;
const HEADER_HEIGHT = 36;
const HEADER_HEIGHT_DENSE = 28;
const VIRTUAL_THRESHOLD = 5000;
const VIRTUAL_BUFFER = 20;
const FILTER_DEBOUNCE_MS = 250;
const CHECKBOX_COL_WIDTH = 40;
const ROWNUM_COL_WIDTH = 50;
let instanceCounter = 0;

const DEFAULT_KEY_BINDINGS: Record<string, string> = {
    "moveUp": "ArrowUp",
    "moveDown": "ArrowDown",
    "moveLeft": "ArrowLeft",
    "moveRight": "ArrowRight",
    "editCell": "Enter",
    "home": "Home",
    "end": "End",
    "pageUp": "PageUp",
    "pageDown": "PageDown",
    "selectAll": "Ctrl+a",
    "delete": "Delete",
    "escape": "Escape",
};

// ============================================================================
// PRIVATE HELPERS
// ============================================================================

function createElement(
    tag: string, classes: string[], text?: string): HTMLElement
{
    const el = document.createElement(tag);
    if (classes.length > 0) { el.classList.add(...classes); }
    if (text) { el.textContent = text; }
    return el;
}

function setAttr(el: HTMLElement, name: string, value: string): void
{
    el.setAttribute(name, value);
}

function escapeCSV(value: unknown): string
{
    const str = (value == null) ? "" : String(value);

    if (str.includes(",") || str.includes('"') || str.includes("\n"))
    {
        return '"' + str.replace(/"/g, '""') + '"';
    }

    return str;
}

function defaultCompare(a: unknown, b: unknown): number
{
    if (a == null && b == null) { return 0; }
    if (a == null) { return 1; }
    if (b == null) { return -1; }

    if (typeof a === "number" && typeof b === "number")
    {
        return a - b;
    }

    return String(a).localeCompare(String(b), undefined, { sensitivity: "base" });
}

function formatNumber(n: number): string
{
    return n.toLocaleString();
}

// ============================================================================
// PUBLIC API
// ============================================================================

// @entrypoint

export class DataGrid
{
    // -- Configuration
    private readonly instanceId: string;
    private options: DataGridOptions;

    // -- Column state
    private columns: DataGridColumn[] = [];

    // -- Data
    private allRows: DataGridRow[] = [];
    private filteredRows: DataGridRow[] = [];
    private sortedRows: DataGridRow[] = [];
    private rowMap = new Map<string, DataGridRow>();

    // -- Sort
    private sortState: SortEntry[] = [];

    // -- Filter
    private filterState: Record<string, unknown> = {};
    private filterTimers: Record<string, ReturnType<typeof setTimeout>> = {};

    // -- Pagination
    private currentPage = 1;
    private pageSize: number;
    private totalRowCount = 0;

    // -- Selection
    private selectedIds = new Set<string>();
    private lastClickedRowId: string | null = null;

    // -- Focus (grid navigation)
    private focusedRow = 0;
    private focusedCol = 0;

    // -- Editing
    private editState: {
        rowId: string; columnId: string;
        editorEl: HTMLElement; oldValue: unknown;
    } | null = null;

    // -- Virtual scrolling
    private virtualActive = false;
    private renderedVRows = new Map<number, HTMLElement>();
    private rafId: number | null = null;

    // -- DOM
    private rootEl!: HTMLElement;
    private scrollContainerEl!: HTMLElement;
    private headerRowEl!: HTMLElement;
    private filterRowEl: HTMLElement | null = null;
    private bodyEl!: HTMLElement;
    private footerRowEl: HTMLElement | null = null;
    private paginationEl: HTMLElement | null = null;
    private emptyEl: HTMLElement | null = null;
    private liveRegionEl!: HTMLElement;
    private headerCheckboxEl: HTMLInputElement | null = null;

    // -- State
    private destroyed = false;

    // -- Bound handlers
    private readonly boundOnDocClick: (e: MouseEvent) => void;
    private readonly boundOnScroll: () => void;

    constructor(options: DataGridOptions)
    {
        instanceCounter++;
        this.instanceId = `dg-${instanceCounter}`;
        this.options = { ...options };
        this.columns = options.columns.map(c => ({ ...c }));
        this.pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;

        this.initRows(options.rows || []);
        this.processData();

        this.boundOnDocClick = (e) => this.onDocClick(e);
        this.boundOnScroll = () => this.onViewportScroll();
        this.rootEl = this.buildRoot();

        logInfo(`Initialised: ${this.instanceId}`);
        logDebug({
            cols: this.columns.length,
            rows: this.allRows.length,
            pageSize: this.pageSize
        });
    }

    // ========================================================================
    // PUBLIC — LIFECYCLE
    // ========================================================================

    public show(containerId: string): void
    {
        if (this.guardDestroyed("show")) { return; }

        const c = document.getElementById(containerId);

        if (!c)
        {
            logError(`Container not found: ${containerId}`);
            return;
        }

        c.appendChild(this.rootEl);
        this.checkVirtual();
        this.renderBody();
        this.renderFooter();
        this.renderPagination();
    }

    public hide(): void
    {
        if (this.guardDestroyed("hide")) { return; }
        this.cancelEdit();
        this.rootEl.remove();
    }

    public destroy(): void
    {
        if (this.destroyed) { return; }
        this.cancelEdit();
        this.hide();
        this.clearFilterTimers();

        if (this.rafId !== null)
        {
            cancelAnimationFrame(this.rafId);
        }

        this.destroyed = true;
        logDebug(`Destroyed: ${this.instanceId}`);
    }

    public getElement(): HTMLElement { return this.rootEl; }

    // ========================================================================
    // PUBLIC — DATA
    // ========================================================================

    public setRows(rows: DataGridRow[]): void
    {
        if (this.guardDestroyed("setRows")) { return; }
        this.cancelEdit();
        this.initRows(rows);
        this.currentPage = 1;
        this.processData();
        this.fullRender();
    }

    public addRow(row: DataGridRow, index?: number): void
    {
        if (this.guardDestroyed("addRow")) { return; }

        if (index !== undefined)
        {
            this.allRows.splice(index, 0, row);
        }
        else
        {
            this.allRows.push(row);
        }

        this.rowMap.set(row.id, row);
        this.processData();
        this.fullRender();
    }

    public removeRow(rowId: string): void
    {
        if (this.guardDestroyed("removeRow")) { return; }
        this.allRows = this.allRows.filter(r => r.id !== rowId);
        this.rowMap.delete(rowId);
        this.selectedIds.delete(rowId);
        this.processData();
        this.fullRender();
    }

    public updateRow(
        rowId: string, data: Partial<Record<string, unknown>>): void
    {
        if (this.guardDestroyed("updateRow")) { return; }
        const row = this.rowMap.get(rowId);

        if (!row)
        {
            logWarn(`Row not found: ${rowId}`);
            return;
        }

        Object.assign(row.data, data);
        this.processData();
        this.fullRender();
    }

    public getRow(rowId: string): DataGridRow | null
    {
        return this.rowMap.get(rowId) ?? null;
    }

    public setTotalRowCount(count: number): void
    {
        this.totalRowCount = count;
        this.renderPagination();
    }

    // ========================================================================
    // PUBLIC — SELECTION
    // ========================================================================

    public getSelectedRows(): DataGridRow[]
    {
        return Array.from(this.selectedIds)
            .map(id => this.rowMap.get(id))
            .filter((r): r is DataGridRow => r !== undefined);
    }

    public selectRow(rowId: string): void
    {
        if (this.guardDestroyed("selectRow")) { return; }
        const row = this.rowMap.get(rowId);

        if (!row || row.disabled) { return; }

        this.selectedIds.add(rowId);
        this.onSelectionChange();
    }

    public deselectRow(rowId: string): void
    {
        if (this.guardDestroyed("deselectRow")) { return; }
        this.selectedIds.delete(rowId);
        this.onSelectionChange();
    }

    public selectAll(): void
    {
        if (this.guardDestroyed("selectAll")) { return; }
        const pageRows = this.getCurrentPageRows();

        for (const r of pageRows)
        {
            if (!r.disabled) { this.selectedIds.add(r.id); }
        }

        this.onSelectionChange();
    }

    public deselectAll(): void
    {
        if (this.guardDestroyed("deselectAll")) { return; }
        this.selectedIds.clear();
        this.onSelectionChange();
    }

    // ========================================================================
    // PUBLIC — PAGINATION
    // ========================================================================

    public setPage(page: number): void
    {
        if (this.guardDestroyed("setPage")) { return; }
        this.goToPage(page);
    }

    public getPage(): number { return this.currentPage; }

    public getPageCount(): number
    {
        const total = this.options.serverSide
            ? this.totalRowCount
            : this.sortedRows.length;

        return this.pageSize > 0 ? Math.max(1, Math.ceil(total / this.pageSize)) : 1;
    }

    public setPageSize(size: number): void
    {
        if (this.guardDestroyed("setPageSize")) { return; }
        this.pageSize = size;
        this.currentPage = 1;
        this.renderBody();
        this.renderPagination();
        this.options.onPageChange?.(1, size);
    }

    // ========================================================================
    // PUBLIC — SORT / FILTER
    // ========================================================================

    public sort(columnId: string, direction?: "asc" | "desc"): void
    {
        if (this.guardDestroyed("sort")) { return; }
        const existing = this.sortState.find(s => s.columnId === columnId);

        if (existing)
        {
            existing.direction = direction || (existing.direction === "asc" ? "desc" : "asc");
        }
        else
        {
            this.sortState = [{ columnId, direction: direction || "asc" }];
        }

        this.afterSort();
    }

    public clearSort(): void
    {
        if (this.guardDestroyed("clearSort")) { return; }
        this.sortState = [];
        this.afterSort();
    }

    public setFilter(columnId: string, value: unknown): void
    {
        if (this.guardDestroyed("setFilter")) { return; }
        this.filterState[columnId] = value;
        this.afterFilter();
    }

    public clearFilters(): void
    {
        if (this.guardDestroyed("clearFilters")) { return; }
        this.filterState = {};
        this.clearFilterInputs();
        this.afterFilter();
        this.announce(`Filters cleared, showing ${this.filteredRows.length} rows`);
    }

    // ========================================================================
    // PUBLIC — VIEW
    // ========================================================================

    public refresh(): void
    {
        if (this.guardDestroyed("refresh")) { return; }
        this.processData();
        this.fullRender();
    }

    public exportCSV(filename?: string): void
    {
        if (this.guardDestroyed("exportCSV")) { return; }
        const csv = this.buildCSVContent();
        this.downloadBlob(csv, filename || "export.csv");
        this.options.onExport?.("csv");
        this.announce("CSV exported");
    }

    public getColumns(): DataGridColumn[]
    {
        return this.columns.map(c => ({ ...c }));
    }

    public showColumn(columnId: string): void
    {
        const col = this.findCol(columnId);
        if (col) { col.hidden = false; this.fullRender(); }
    }

    public hideColumn(columnId: string): void
    {
        const col = this.findCol(columnId);
        if (col) { col.hidden = true; this.fullRender(); }
    }

    public setColumnWidth(columnId: string, width: number): void
    {
        const col = this.findCol(columnId);

        if (col)
        {
            col.width = this.clampWidth(col, width);
            this.updateAllColumnWidths();
        }
    }

    public scrollToRow(rowId: string): void
    {
        if (this.guardDestroyed("scrollToRow")) { return; }
        const el = this.bodyEl.querySelector(`[data-row-id="${rowId}"]`);

        if (el)
        {
            el.scrollIntoView({ block: "nearest" });
        }
        else
        {
            logWarn(`Row not in view: ${rowId}`);
        }
    }

    // ========================================================================
    // BUILDING — ROOT
    // ========================================================================

    private buildRoot(): HTMLElement
    {
        const root = createElement("div", ["datagrid"]);
        setAttr(root, "id", this.instanceId);
        setAttr(root, "role", "grid");
        setAttr(root, "aria-label", "Data grid");

        if (this.options.dense) { root.classList.add("datagrid-dense"); }
        if (this.options.striped !== false) { root.classList.add("datagrid-striped"); }
        if (this.options.cssClass) { root.classList.add(...this.options.cssClass.split(" ")); }

        this.scrollContainerEl = this.buildScrollContainer();
        root.appendChild(this.scrollContainerEl);

        if (this.pageSize > 0)
        {
            this.paginationEl = this.buildPaginationBar();
            root.appendChild(this.paginationEl);
        }

        this.liveRegionEl = createElement("div", ["visually-hidden"]);
        setAttr(this.liveRegionEl, "aria-live", "polite");
        setAttr(this.liveRegionEl, "aria-atomic", "true");
        root.appendChild(this.liveRegionEl);

        return root;
    }

    private buildScrollContainer(): HTMLElement
    {
        const sc = createElement("div", ["datagrid-scroll-container"]);
        sc.style.height = this.options.height || "400px";

        this.headerRowEl = this.buildHeaderRow();
        sc.appendChild(this.headerRowEl);

        if (this.hasFilterableColumns())
        {
            this.filterRowEl = this.buildFilterRow();
            sc.appendChild(this.filterRowEl);
        }

        this.bodyEl = createElement("div", ["datagrid-body"]);
        sc.appendChild(this.bodyEl);

        this.emptyEl = createElement("div", ["datagrid-empty"]);
        this.emptyEl.style.display = "none";
        this.emptyEl.textContent = "No data to display";
        sc.appendChild(this.emptyEl);

        if (this.options.showFooter)
        {
            this.footerRowEl = this.buildFooterRow();
            sc.appendChild(this.footerRowEl);
        }

        sc.addEventListener("scroll", this.boundOnScroll);
        sc.addEventListener("keydown", (e) => this.handleKeydown(e));

        return sc;
    }

    // ========================================================================
    // BUILDING — HEADER
    // ========================================================================

    private buildHeaderRow(): HTMLElement
    {
        const row = createElement("div", ["datagrid-header-row"]);
        setAttr(row, "role", "row");

        if (this.options.selectable === "checkbox")
        {
            row.appendChild(this.buildHeaderCheckboxCell());
        }

        if (this.options.showRowNumbers)
        {
            row.appendChild(this.buildHeaderCell({
                id: "__rownum__", label: "#",
                width: ROWNUM_COL_WIDTH, sortable: false, resizable: false
            }));
        }

        for (const col of this.getVisibleColumns())
        {
            row.appendChild(this.buildHeaderCell(col));
        }

        return row;
    }

    private buildHeaderCell(col: DataGridColumn): HTMLElement
    {
        const cell = createElement("div", ["datagrid-header-cell"]);
        setAttr(cell, "role", "columnheader");
        setAttr(cell, "data-col-id", col.id);
        this.applyColWidth(cell, col);

        const label = createElement("span", ["datagrid-header-label"], col.label);
        cell.appendChild(label);

        if (col.sortable !== false && col.id !== "__rownum__")
        {
            cell.classList.add("datagrid-header-cell-sortable");
            cell.appendChild(this.buildSortIndicator());
            cell.addEventListener("click", (e) =>
                this.handleHeaderClick(col.id, e.shiftKey));
        }

        if (col.resizable !== false && col.id !== "__rownum__")
        {
            cell.appendChild(this.buildResizeHandle(col));
        }

        if (this.options.enableColumnReorder !== false
            && col.id !== "__rownum__" && col.id !== "__checkbox__")
        {
            this.setupColumnDrag(cell, col);
        }

        return cell;
    }

    private buildHeaderCheckboxCell(): HTMLElement
    {
        const cell = createElement("div", ["datagrid-header-cell", "datagrid-checkbox-cell"]);
        setAttr(cell, "role", "columnheader");
        cell.style.width = `${CHECKBOX_COL_WIDTH}px`;
        cell.style.minWidth = `${CHECKBOX_COL_WIDTH}px`;

        this.headerCheckboxEl = document.createElement("input");
        this.headerCheckboxEl.type = "checkbox";
        this.headerCheckboxEl.classList.add("datagrid-checkbox", "form-check-input");
        setAttr(this.headerCheckboxEl, "aria-label", "Select all");
        this.headerCheckboxEl.addEventListener("change",
            () => this.handleHeaderCheckbox());

        cell.appendChild(this.headerCheckboxEl);
        return cell;
    }

    private buildSortIndicator(): HTMLElement
    {
        const ind = createElement("span", ["datagrid-sort-indicator"]);
        return ind;
    }

    private buildResizeHandle(col: DataGridColumn): HTMLElement
    {
        const handle = createElement("div", ["datagrid-resize-handle"]);

        handle.addEventListener("pointerdown", (e) =>
        {
            e.stopPropagation();
            this.onResizeStart(e, col);
        });

        return handle;
    }

    // ========================================================================
    // BUILDING — FILTER ROW
    // ========================================================================

    private buildFilterRow(): HTMLElement
    {
        const row = createElement("div", ["datagrid-filter-row"]);

        if (this.options.selectable === "checkbox")
        {
            const spacer = createElement("div", ["datagrid-filter-cell"]);
            spacer.style.width = `${CHECKBOX_COL_WIDTH}px`;
            row.appendChild(spacer);
        }

        if (this.options.showRowNumbers)
        {
            const spacer = createElement("div", ["datagrid-filter-cell"]);
            spacer.style.width = `${ROWNUM_COL_WIDTH}px`;
            row.appendChild(spacer);
        }

        for (const col of this.getVisibleColumns())
        {
            row.appendChild(this.buildFilterCell(col));
        }

        return row;
    }

    private buildFilterCell(col: DataGridColumn): HTMLElement
    {
        const cell = createElement("div", ["datagrid-filter-cell"]);
        this.applyColWidth(cell, col);

        if (!col.filterable) { return cell; }

        const type = col.filterType || "text";

        if (type === "text") { cell.appendChild(this.buildTextFilter(col)); }
        else if (type === "select") { cell.appendChild(this.buildSelectFilter(col)); }
        else if (type === "number-range") { this.buildRangeFilter(cell, col, "number"); }
        else if (type === "date-range") { this.buildRangeFilter(cell, col, "date"); }

        return cell;
    }

    private buildTextFilter(col: DataGridColumn): HTMLElement
    {
        const input = document.createElement("input");
        input.type = "text";
        input.classList.add("datagrid-filter-input", "form-control", "form-control-sm");
        input.placeholder = "Filter...";
        setAttr(input, "aria-label", `Filter ${col.label}`);

        input.addEventListener("input", () =>
            this.debouncedFilter(col.id, input.value));

        return input;
    }

    private buildSelectFilter(col: DataGridColumn): HTMLElement
    {
        const sel = document.createElement("select");
        sel.classList.add("datagrid-filter-select", "form-select", "form-select-sm");
        setAttr(sel, "aria-label", `Filter ${col.label}`);

        const allOpt = document.createElement("option");
        allOpt.value = "";
        allOpt.textContent = "All";
        sel.appendChild(allOpt);

        for (const opt of (col.filterOptions || []))
        {
            const o = document.createElement("option");
            o.value = opt.value;
            o.textContent = opt.label;
            sel.appendChild(o);
        }

        sel.addEventListener("change", () =>
        {
            this.filterState[col.id] = sel.value || undefined;
            this.afterFilter();
        });

        return sel;
    }

    private buildRangeFilter(
        cell: HTMLElement, col: DataGridColumn, inputType: string): void
    {
        const wrap = createElement("div", ["datagrid-filter-range"]);

        const min = document.createElement("input");
        min.type = inputType;
        min.classList.add("datagrid-filter-input", "form-control", "form-control-sm");
        min.placeholder = inputType === "number" ? "Min" : "From";
        setAttr(min, "aria-label", `${col.label} minimum`);

        const max = document.createElement("input");
        max.type = inputType;
        max.classList.add("datagrid-filter-input", "form-control", "form-control-sm");
        max.placeholder = inputType === "number" ? "Max" : "To";
        setAttr(max, "aria-label", `${col.label} maximum`);

        const update = () =>
        {
            const val: Record<string, string> = {};
            if (min.value) { val[inputType === "number" ? "min" : "from"] = min.value; }
            if (max.value) { val[inputType === "number" ? "max" : "to"] = max.value; }
            this.debouncedFilter(col.id, Object.keys(val).length > 0 ? val : undefined);
        };

        min.addEventListener("input", update);
        max.addEventListener("input", update);

        wrap.appendChild(min);
        wrap.appendChild(max);
        cell.appendChild(wrap);
    }

    // ========================================================================
    // BUILDING — FOOTER
    // ========================================================================

    private buildFooterRow(): HTMLElement
    {
        const row = createElement("div", ["datagrid-footer-row"]);
        setAttr(row, "role", "row");

        if (this.options.selectable === "checkbox")
        {
            const spacer = createElement("div", ["datagrid-footer-cell"]);
            spacer.style.width = `${CHECKBOX_COL_WIDTH}px`;
            row.appendChild(spacer);
        }

        if (this.options.showRowNumbers)
        {
            const spacer = createElement("div", ["datagrid-footer-cell"]);
            spacer.style.width = `${ROWNUM_COL_WIDTH}px`;
            row.appendChild(spacer);
        }

        for (const col of this.getVisibleColumns())
        {
            const cell = createElement("div", ["datagrid-footer-cell"]);
            setAttr(cell, "role", "gridcell");
            setAttr(cell, "data-col-id", col.id);
            this.applyColWidth(cell, col);
            row.appendChild(cell);
        }

        return row;
    }

    // ========================================================================
    // BUILDING — PAGINATION
    // ========================================================================

    private buildPaginationBar(): HTMLElement
    {
        const bar = createElement("div", ["datagrid-pagination"]);
        const nav = createElement("nav", []);
        setAttr(nav, "role", "navigation");
        setAttr(nav, "aria-label", "Pagination");
        bar.appendChild(nav);

        return bar;
    }

    // ========================================================================
    // BUILDING — ROWS & CELLS
    // ========================================================================

    private buildRow(row: DataGridRow, displayIndex: number): HTMLElement
    {
        const el = createElement("div", ["datagrid-row"]);
        setAttr(el, "role", "row");
        setAttr(el, "data-row-id", row.id);
        setAttr(el, "aria-rowindex", String(displayIndex + 2));

        if (row.disabled) { el.classList.add("datagrid-row-disabled"); }
        if (row.cssClass) { el.classList.add(...row.cssClass.split(" ")); }
        if (this.selectedIds.has(row.id)) { el.classList.add("datagrid-row-selected"); }

        this.applyRowStriping(el, displayIndex);
        this.appendRowCells(el, row, displayIndex);
        this.attachRowEvents(el, row);

        return el;
    }

    private applyRowStriping(el: HTMLElement, index: number): void
    {
        if (this.options.striped !== false)
        {
            el.classList.add(index % 2 === 0 ? "datagrid-row-even" : "datagrid-row-odd");
        }
    }

    private appendRowCells(
        el: HTMLElement, row: DataGridRow, displayIndex: number): void
    {
        if (this.options.selectable === "checkbox")
        {
            el.appendChild(this.buildCheckboxCell(row));
        }

        if (this.options.showRowNumbers)
        {
            el.appendChild(this.buildRowNumCell(displayIndex));
        }

        for (const col of this.getVisibleColumns())
        {
            el.appendChild(this.buildCell(row, col));
        }
    }

    private buildCheckboxCell(row: DataGridRow): HTMLElement
    {
        const cell = createElement("div", ["datagrid-cell", "datagrid-checkbox-cell"]);
        setAttr(cell, "role", "gridcell");
        cell.style.width = `${CHECKBOX_COL_WIDTH}px`;
        cell.style.minWidth = `${CHECKBOX_COL_WIDTH}px`;

        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.classList.add("datagrid-checkbox", "form-check-input");
        cb.checked = this.selectedIds.has(row.id);
        cb.disabled = !!row.disabled;
        setAttr(cb, "aria-label", "Select row");
        setAttr(cb, "role", "checkbox");
        setAttr(cb, "aria-checked", String(cb.checked));

        cb.addEventListener("change", (e) =>
        {
            e.stopPropagation();
            this.handleRowCheckbox(row.id, cb.checked);
        });

        cell.appendChild(cb);
        return cell;
    }

    private buildRowNumCell(index: number): HTMLElement
    {
        const cell = createElement("div", [
            "datagrid-cell", "datagrid-row-number"
        ], String(this.getAbsoluteRowIndex(index) + 1));
        setAttr(cell, "role", "gridcell");
        cell.style.width = `${ROWNUM_COL_WIDTH}px`;
        cell.style.minWidth = `${ROWNUM_COL_WIDTH}px`;
        return cell;
    }

    private buildCell(row: DataGridRow, col: DataGridColumn): HTMLElement
    {
        const cell = createElement("div", ["datagrid-cell"]);
        setAttr(cell, "role", "gridcell");
        setAttr(cell, "data-col-id", col.id);
        setAttr(cell, "tabindex", "-1");
        this.applyColWidth(cell, col);
        this.applyCellAlign(cell, col);

        if (col.cssClass) { cell.classList.add(...col.cssClass.split(" ")); }
        if (col.pinned) { cell.classList.add(`datagrid-cell-pinned-${col.pinned}`); }

        const value = row.data[col.id];

        if (col.renderer)
        {
            col.renderer(cell, row, value);
        }
        else
        {
            cell.textContent = value != null ? String(value) : "";
        }

        if (col.editable && !row.disabled)
        {
            cell.addEventListener("dblclick", () =>
                this.startEdit(row.id, col.id));
        }

        return cell;
    }

    private applyCellAlign(cell: HTMLElement, col: DataGridColumn): void
    {
        if (col.align)
        {
            cell.classList.add(`datagrid-cell-align-${col.align}`);
        }
    }

    // ========================================================================
    // BUILDING — COLUMN DRAG (REORDER)
    // ========================================================================

    private setupColumnDrag(cell: HTMLElement, col: DataGridColumn): void
    {
        setAttr(cell, "draggable", "true");

        cell.addEventListener("dragstart", (e) =>
        {
            if (!e.dataTransfer) { return; }
            e.dataTransfer.setData("text/plain", col.id);
            cell.classList.add("datagrid-dragging-column");
        });

        cell.addEventListener("dragend", () =>
        {
            cell.classList.remove("datagrid-dragging-column");
            this.removeDropIndicators();
        });

        cell.addEventListener("dragover", (e) =>
        {
            e.preventDefault();
            this.showDropIndicator(cell);
        });

        cell.addEventListener("drop", (e) =>
        {
            e.preventDefault();
            const sourceId = e.dataTransfer?.getData("text/plain");
            if (sourceId) { this.reorderColumn(sourceId, col.id); }
            this.removeDropIndicators();
        });
    }

    // ========================================================================
    // DATA PROCESSING
    // ========================================================================

    private initRows(rows: DataGridRow[]): void
    {
        this.allRows = [...rows];
        this.rowMap.clear();

        for (const r of this.allRows)
        {
            this.rowMap.set(r.id, r);
        }
    }

    private processData(): void
    {
        this.applyFilters();
        this.applySorts();
        this.updateRowCountAttr();
    }

    private applyFilters(): void
    {
        if (this.options.externalFilter)
        {
            this.filteredRows = [...this.allRows];
            return;
        }

        const activeFilters = Object.entries(this.filterState)
            .filter(([, v]) => v !== undefined && v !== "");

        if (activeFilters.length === 0)
        {
            this.filteredRows = [...this.allRows];
            return;
        }

        this.filteredRows = this.allRows.filter(
            row => this.rowMatchesAllFilters(row, activeFilters)
        );
    }

    private rowMatchesAllFilters(
        row: DataGridRow,
        filters: Array<[string, unknown]>): boolean
    {
        return filters.every(([colId, filterVal]) =>
        {
            const col = this.findCol(colId);
            if (!col) { return true; }

            const cellVal = row.data[colId];
            return this.cellMatchesFilter(cellVal, filterVal, col);
        });
    }

    private cellMatchesFilter(
        cellVal: unknown, filterVal: unknown, col: DataGridColumn): boolean
    {
        const type = col.filterType || "text";

        if (type === "text")
        {
            return String(cellVal ?? "").toLowerCase()
                .includes(String(filterVal).toLowerCase());
        }

        if (type === "select")
        {
            return String(cellVal) === String(filterVal);
        }

        if (type === "number-range")
        {
            return this.matchNumberRange(cellVal, filterVal as Record<string, string>);
        }

        if (type === "date-range")
        {
            return this.matchDateRange(cellVal, filterVal as Record<string, string>);
        }

        return true;
    }

    private matchNumberRange(
        cellVal: unknown, range: Record<string, string>): boolean
    {
        const num = Number(cellVal);
        if (isNaN(num)) { return false; }
        if (range.min && num < Number(range.min)) { return false; }
        if (range.max && num > Number(range.max)) { return false; }
        return true;
    }

    private matchDateRange(
        cellVal: unknown, range: Record<string, string>): boolean
    {
        const str = String(cellVal ?? "");
        if (!str) { return false; }
        if (range.from && str < range.from) { return false; }
        if (range.to && str > range.to) { return false; }
        return true;
    }

    private applySorts(): void
    {
        if (this.options.externalSort || this.sortState.length === 0)
        {
            this.sortedRows = [...this.filteredRows];
            return;
        }

        this.sortedRows = [...this.filteredRows].sort(
            (a, b) => this.chainedComparator(a, b)
        );
    }

    private chainedComparator(a: DataGridRow, b: DataGridRow): number
    {
        for (const s of this.sortState)
        {
            const col = this.findCol(s.columnId);
            const cmp = col?.comparator
                ? col.comparator(a.data[s.columnId], b.data[s.columnId])
                : defaultCompare(a.data[s.columnId], b.data[s.columnId]);

            if (cmp !== 0)
            {
                return s.direction === "asc" ? cmp : -cmp;
            }
        }

        return 0;
    }

    private getCurrentPageRows(): DataGridRow[]
    {
        if (this.pageSize <= 0) { return this.sortedRows; }
        const start = (this.currentPage - 1) * this.pageSize;
        return this.sortedRows.slice(start, start + this.pageSize);
    }

    // ========================================================================
    // RENDERING — BODY
    // ========================================================================

    private renderBody(): void
    {
        this.clearBody();
        const rows = this.getCurrentPageRows();

        if (rows.length === 0)
        {
            this.showEmptyState();
            return;
        }

        this.hideEmptyState();
        this.checkVirtual();

        if (this.virtualActive)
        {
            this.setupVirtual(rows);
            this.renderVirtualRows();
        }
        else
        {
            this.renderAllRows(rows);
        }

        this.updateAllColumnWidths();
    }

    private clearBody(): void
    {
        while (this.bodyEl.firstChild)
        {
            this.bodyEl.removeChild(this.bodyEl.firstChild);
        }

        this.bodyEl.style.height = "";
        this.bodyEl.style.position = "";
        this.renderedVRows.clear();
    }

    private renderAllRows(rows: DataGridRow[]): void
    {
        for (let i = 0; i < rows.length; i++)
        {
            this.bodyEl.appendChild(this.buildRow(rows[i], i));
        }
    }

    private showEmptyState(): void
    {
        if (this.emptyEl) { this.emptyEl.style.display = ""; }
    }

    private hideEmptyState(): void
    {
        if (this.emptyEl) { this.emptyEl.style.display = "none"; }
    }

    // ========================================================================
    // RENDERING — FOOTER
    // ========================================================================

    private renderFooter(): void
    {
        if (!this.footerRowEl) { return; }

        const aggs = this.calculateAggregates();
        const cells = this.footerRowEl.querySelectorAll(
            ".datagrid-footer-cell[data-col-id]"
        );

        cells.forEach(cell =>
        {
            const colId = cell.getAttribute("data-col-id") || "";
            cell.textContent = aggs[colId] ?? "";
        });
    }

    // ========================================================================
    // RENDERING — PAGINATION
    // ========================================================================

    private renderPagination(): void
    {
        if (!this.paginationEl) { return; }

        const nav = this.paginationEl.querySelector("nav");
        if (!nav) { return; }

        while (nav.firstChild) { nav.removeChild(nav.firstChild); }

        const total = this.options.serverSide
            ? this.totalRowCount : this.sortedRows.length;
        const pageCount = this.getPageCount();

        nav.appendChild(this.buildPageInfo(total));
        nav.appendChild(this.buildPageButtons(pageCount));

        const actions = createElement("div", ["datagrid-pagination-actions"]);
        actions.appendChild(this.buildPageSizeSelect());
        actions.appendChild(this.buildExportBtn());
        nav.appendChild(actions);
    }

    private buildPageInfo(total: number): HTMLElement
    {
        const info = createElement("span", ["datagrid-pagination-info"]);

        if (total === 0)
        {
            info.textContent = "No rows";
        }
        else
        {
            const start = (this.currentPage - 1) * this.pageSize + 1;
            const end = Math.min(this.currentPage * this.pageSize, total);
            info.textContent = `Showing ${formatNumber(start)}-${formatNumber(end)} of ${formatNumber(total)}`;
        }

        return info;
    }

    private buildPageButtons(pageCount: number): HTMLElement
    {
        const wrap = createElement("div", ["datagrid-pagination-pages"]);

        this.addPageBtn(wrap, "<", this.currentPage - 1, this.currentPage <= 1);
        this.addPageNumbers(wrap, pageCount);
        this.addPageBtn(wrap, ">", this.currentPage + 1, this.currentPage >= pageCount);

        return wrap;
    }

    private addPageBtn(
        wrap: HTMLElement, label: string, page: number, disabled: boolean): void
    {
        const btn = createElement("button", [
            "datagrid-pagination-btn", "btn", "btn-outline-secondary", "btn-sm"
        ], label);
        setAttr(btn, "type", "button");

        if (label === "<") { setAttr(btn, "aria-label", "Previous page"); }
        if (label === ">") { setAttr(btn, "aria-label", "Next page"); }

        if (disabled) { btn.setAttribute("disabled", ""); }
        else { btn.addEventListener("click", () => this.goToPage(page)); }

        wrap.appendChild(btn);
    }

    private addPageNumbers(wrap: HTMLElement, pageCount: number): void
    {
        const pages = this.getPageRange(pageCount);

        for (const p of pages)
        {
            if (p === -1)
            {
                wrap.appendChild(createElement("span", ["datagrid-pagination-ellipsis"], "..."));
                continue;
            }

            const btn = createElement("button", [
                "datagrid-pagination-btn", "btn", "btn-sm",
                p === this.currentPage ? "btn-primary" : "btn-outline-secondary"
            ], String(p));

            setAttr(btn, "type", "button");
            setAttr(btn, "aria-label", `Page ${p}`);

            if (p === this.currentPage)
            {
                btn.classList.add("datagrid-pagination-btn-active");
                setAttr(btn, "aria-current", "page");
            }
            else
            {
                btn.addEventListener("click", () => this.goToPage(p));
            }

            wrap.appendChild(btn);
        }
    }

    private getPageRange(total: number): number[]
    {
        if (total <= 7) { return Array.from({ length: total }, (_, i) => i + 1); }

        const c = this.currentPage;
        const pages: number[] = [1];

        if (c > 3) { pages.push(-1); }

        const start = Math.max(2, c - 1);
        const end = Math.min(total - 1, c + 1);

        for (let i = start; i <= end; i++) { pages.push(i); }

        if (c < total - 2) { pages.push(-1); }
        pages.push(total);

        return pages;
    }

    private buildPageSizeSelect(): HTMLElement
    {
        const sel = document.createElement("select");
        sel.classList.add("datagrid-pagination-size", "form-select", "form-select-sm");
        setAttr(sel, "aria-label", "Rows per page");

        const opts = this.options.pageSizeOptions || DEFAULT_PAGE_OPTIONS;

        for (const size of opts)
        {
            const o = document.createElement("option");
            o.value = String(size);
            o.textContent = String(size);
            if (size === this.pageSize) { o.selected = true; }
            sel.appendChild(o);
        }

        sel.addEventListener("change", () => this.setPageSize(Number(sel.value)));
        return sel;
    }

    private buildExportBtn(): HTMLElement
    {
        const btn = createElement("button", [
            "datagrid-pagination-export", "btn", "btn-outline-secondary", "btn-sm"
        ]);
        setAttr(btn, "type", "button");

        const icon = createElement("i", ["bi", "bi-download"]);
        btn.appendChild(icon);
        btn.appendChild(document.createTextNode(" Export"));
        btn.addEventListener("click", () => this.exportCSV());

        return btn;
    }

    // ========================================================================
    // RENDERING — COLUMN WIDTHS
    // ========================================================================

    private updateAllColumnWidths(): void
    {
        for (const col of this.getVisibleColumns())
        {
            const cells = this.rootEl.querySelectorAll(
                `[data-col-id="${col.id}"]`
            );
            cells.forEach(c => this.applyColWidth(c as HTMLElement, col));
        }
    }

    private applyColWidth(el: HTMLElement, col: DataGridColumn): void
    {
        const w = col.width || DEFAULT_COL_WIDTH;
        el.style.width = `${w}px`;
        el.style.minWidth = `${w}px`;
        el.style.maxWidth = `${w}px`;
    }

    private updateRowCountAttr(): void
    {
        if (!this.rootEl) { return; }
        setAttr(this.rootEl, "aria-rowcount", String(this.sortedRows.length));
        setAttr(this.rootEl, "aria-colcount",
            String(this.getVisibleColumns().length));
    }

    // ========================================================================
    // RENDERING — HEADER SORT STATE
    // ========================================================================

    private updateHeaderSort(): void
    {
        const cells = this.headerRowEl.querySelectorAll(".datagrid-header-cell");

        cells.forEach(cell =>
        {
            const colId = cell.getAttribute("data-col-id");
            const ind = cell.querySelector(".datagrid-sort-indicator");
            if (!ind || !colId) { return; }

            const entry = this.sortState.find(s => s.columnId === colId);
            this.applySortStyle(cell as HTMLElement, ind as HTMLElement, entry);
        });
    }

    private applySortStyle(
        cell: HTMLElement, ind: HTMLElement, entry?: SortEntry): void
    {
        cell.classList.toggle("datagrid-header-cell-sorted", !!entry);

        if (entry)
        {
            ind.textContent = entry.direction === "asc" ? "\u25B2" : "\u25BC";
            setAttr(cell, "aria-sort", entry.direction === "asc" ? "ascending" : "descending");
        }
        else
        {
            ind.textContent = "";
            setAttr(cell, "aria-sort", "none");
        }
    }

    // ========================================================================
    // SORTING
    // ========================================================================

    private handleHeaderClick(colId: string, shiftKey: boolean): void
    {
        if (shiftKey)
        {
            this.toggleMultiSort(colId);
        }
        else
        {
            this.toggleSingleSort(colId);
        }

        this.afterSort();
    }

    private toggleSingleSort(colId: string): void
    {
        const existing = this.sortState.length === 1
            && this.sortState[0].columnId === colId
            ? this.sortState[0] : null;

        if (!existing)
        {
            this.sortState = [{ columnId: colId, direction: "asc" }];
        }
        else if (existing.direction === "asc")
        {
            existing.direction = "desc";
        }
        else
        {
            this.sortState = [];
        }
    }

    private toggleMultiSort(colId: string): void
    {
        const idx = this.sortState.findIndex(s => s.columnId === colId);

        if (idx === -1)
        {
            this.sortState.push({ columnId: colId, direction: "asc" });
        }
        else if (this.sortState[idx].direction === "asc")
        {
            this.sortState[idx].direction = "desc";
        }
        else
        {
            this.sortState.splice(idx, 1);
        }
    }

    private afterSort(): void
    {
        this.applySorts();
        this.currentPage = 1;
        this.renderBody();
        this.renderFooter();
        this.renderPagination();
        this.updateHeaderSort();
        this.options.onSort?.(this.sortState);
        this.announceSortState();
    }

    private announceSortState(): void
    {
        if (this.sortState.length === 0)
        {
            this.announce("Sort cleared");
            return;
        }

        const desc = this.sortState.map(s =>
        {
            const col = this.findCol(s.columnId);
            return `${col?.label || s.columnId} ${s.direction}`;
        }).join(", ");

        this.announce(`Sorted by ${desc}`);
    }

    // ========================================================================
    // FILTERING
    // ========================================================================

    private debouncedFilter(colId: string, value: unknown): void
    {
        if (this.filterTimers[colId])
        {
            clearTimeout(this.filterTimers[colId]);
        }

        this.filterTimers[colId] = setTimeout(() =>
        {
            this.filterState[colId] = value || undefined;
            this.afterFilter();
        }, FILTER_DEBOUNCE_MS);
    }

    private afterFilter(): void
    {
        this.processData();
        this.currentPage = 1;
        this.renderBody();
        this.renderFooter();
        this.renderPagination();
        this.options.onFilter?.(this.filterState);
        this.announce(`${this.filteredRows.length} rows match filter`);
    }

    private clearFilterInputs(): void
    {
        if (!this.filterRowEl) { return; }

        this.filterRowEl.querySelectorAll("input").forEach(
            (el) => { (el as HTMLInputElement).value = ""; });
        this.filterRowEl.querySelectorAll("select").forEach(
            (el) => { (el as HTMLSelectElement).selectedIndex = 0; });
    }

    private clearFilterTimers(): void
    {
        for (const key of Object.keys(this.filterTimers))
        {
            clearTimeout(this.filterTimers[key]);
        }

        this.filterTimers = {};
    }

    // ========================================================================
    // PAGINATION
    // ========================================================================

    private goToPage(page: number): void
    {
        const clamped = Math.max(1, Math.min(page, this.getPageCount()));

        if (clamped === this.currentPage) { return; }

        this.currentPage = clamped;
        this.cancelEdit();
        this.renderBody();
        this.renderPagination();
        this.options.onPageChange?.(clamped, this.pageSize);
        this.announce(`Page ${clamped} of ${this.getPageCount()}`);
    }

    // ========================================================================
    // SELECTION
    // ========================================================================

    private attachRowEvents(el: HTMLElement, row: DataGridRow): void
    {
        el.addEventListener("click", (e) =>
        {
            if ((e.target as HTMLElement).closest(".datagrid-checkbox"))
            {
                return;
            }

            this.handleRowClick(row, e);
        });

        el.addEventListener("dblclick", () =>
        {
            this.options.onRowDoubleClick?.(row);
        });
    }

    private handleRowClick(row: DataGridRow, e: MouseEvent): void
    {
        this.options.onRowClick?.(row);

        if (!this.options.selectable || row.disabled) { return; }

        const mode = this.options.selectable;

        if (mode === "single")
        {
            this.selectedIds.clear();
            this.selectedIds.add(row.id);
        }
        else if (mode === "multi" || mode === "checkbox")
        {
            this.handleMultiSelect(row, e);
        }

        this.lastClickedRowId = row.id;
        this.onSelectionChange();
    }

    private handleMultiSelect(row: DataGridRow, e: MouseEvent): void
    {
        if (e.shiftKey && this.lastClickedRowId)
        {
            this.selectRange(this.lastClickedRowId, row.id);
        }
        else if (e.ctrlKey || e.metaKey)
        {
            this.toggleSelection(row.id);
        }
        else
        {
            this.selectedIds.clear();
            this.selectedIds.add(row.id);
        }
    }

    private selectRange(fromId: string, toId: string): void
    {
        const pageRows = this.getCurrentPageRows();
        const fromIdx = pageRows.findIndex(r => r.id === fromId);
        const toIdx = pageRows.findIndex(r => r.id === toId);
        const start = Math.min(fromIdx, toIdx);
        const end = Math.max(fromIdx, toIdx);

        for (let i = start; i <= end; i++)
        {
            if (i >= 0 && i < pageRows.length && !pageRows[i].disabled)
            {
                this.selectedIds.add(pageRows[i].id);
            }
        }
    }

    private toggleSelection(rowId: string): void
    {
        if (this.selectedIds.has(rowId))
        {
            this.selectedIds.delete(rowId);
        }
        else
        {
            this.selectedIds.add(rowId);
        }
    }

    private handleRowCheckbox(rowId: string, checked: boolean): void
    {
        if (checked) { this.selectedIds.add(rowId); }
        else { this.selectedIds.delete(rowId); }
        this.onSelectionChange();
    }

    private handleHeaderCheckbox(): void
    {
        if (!this.headerCheckboxEl) { return; }

        if (this.headerCheckboxEl.checked) { this.selectAll(); }
        else { this.deselectAll(); }
    }

    private onSelectionChange(): void
    {
        this.updateRowSelectionStyles();
        this.updateHeaderCheckboxState();
        this.options.onRowSelect?.(Array.from(this.selectedIds));
        this.announce(`${this.selectedIds.size} rows selected`);
    }

    private updateRowSelectionStyles(): void
    {
        this.bodyEl.querySelectorAll(".datagrid-row").forEach(row =>
        {
            const id = row.getAttribute("data-row-id") || "";
            row.classList.toggle("datagrid-row-selected", this.selectedIds.has(id));

            const cb = row.querySelector<HTMLInputElement>(".datagrid-checkbox");
            if (cb) { cb.checked = this.selectedIds.has(id); }
        });
    }

    private updateHeaderCheckboxState(): void
    {
        if (!this.headerCheckboxEl) { return; }

        const pageRows = this.getCurrentPageRows().filter(r => !r.disabled);
        const selectedCount = pageRows.filter(
            r => this.selectedIds.has(r.id)).length;

        this.headerCheckboxEl.checked = selectedCount === pageRows.length
            && pageRows.length > 0;
        this.headerCheckboxEl.indeterminate = selectedCount > 0
            && selectedCount < pageRows.length;
    }

    // ========================================================================
    // INLINE EDITING
    // ========================================================================

    private startEdit(rowId: string, colId: string): void
    {
        this.cancelEdit();
        const col = this.findCol(colId);
        const row = this.rowMap.get(rowId);

        if (!col || !row || !col.editable || row.disabled) { return; }

        const cellEl = this.bodyEl.querySelector(
            `[data-row-id="${rowId}"] [data-col-id="${colId}"]`
        ) as HTMLElement | null;

        if (!cellEl) { return; }

        const oldValue = row.data[colId];
        const editor = this.createEditor(col, oldValue);
        cellEl.textContent = "";
        cellEl.appendChild(editor);
        cellEl.classList.add("datagrid-cell-editing");

        this.editState = { rowId, columnId: colId, editorEl: editor, oldValue };
        this.focusEditor(editor);
    }

    private createEditor(col: DataGridColumn, value: unknown): HTMLElement
    {
        const type = col.editorType || "text";

        if (type === "select")
        {
            return this.createSelectEditor(col, value);
        }

        const input = document.createElement("input");
        input.type = type;
        input.classList.add("datagrid-editor", "form-control", "form-control-sm");
        input.value = value != null ? String(value) : "";

        input.addEventListener("keydown", (e) => this.handleEditorKey(e));
        input.addEventListener("blur", () => this.commitEdit());

        return input;
    }

    private createSelectEditor(
        col: DataGridColumn, value: unknown): HTMLElement
    {
        const sel = document.createElement("select");
        sel.classList.add("datagrid-editor", "form-select", "form-select-sm");

        for (const opt of (col.editorOptions || []))
        {
            const o = document.createElement("option");
            o.value = opt.value;
            o.textContent = opt.label;
            if (String(value) === opt.value) { o.selected = true; }
            sel.appendChild(o);
        }

        sel.addEventListener("keydown", (e) => this.handleEditorKey(e));
        sel.addEventListener("blur", () => this.commitEdit());
        sel.addEventListener("change", () => this.commitEdit());

        return sel;
    }

    private focusEditor(editor: HTMLElement): void
    {
        requestAnimationFrame(() =>
        {
            (editor as HTMLInputElement).focus();

            if (editor instanceof HTMLInputElement && editor.type !== "date")
            {
                editor.select();
            }
        });
    }

    private commitEdit(): void
    {
        if (!this.editState) { return; }

        const { rowId, columnId, editorEl, oldValue } = this.editState;
        const newValue = (editorEl as HTMLInputElement).value;
        this.editState = null;

        const result = this.options.onCellEdit?.(
            rowId, columnId, oldValue, newValue);

        if (result === false)
        {
            this.revertCell(rowId, columnId, oldValue);
            return;
        }

        const row = this.rowMap.get(rowId);
        if (row) { row.data[columnId] = newValue; }

        this.refreshCellContent(rowId, columnId, newValue);
        this.renderFooter();
        this.announce(`${this.findCol(columnId)?.label} updated to ${newValue}`);
    }

    private cancelEdit(): void
    {
        if (!this.editState) { return; }

        const { rowId, columnId, oldValue } = this.editState;
        this.editState = null;
        this.revertCell(rowId, columnId, oldValue);
    }

    private revertCell(
        rowId: string, colId: string, value: unknown): void
    {
        this.refreshCellContent(rowId, colId, value);
    }

    private refreshCellContent(
        rowId: string, colId: string, value: unknown): void
    {
        const cellEl = this.bodyEl.querySelector(
            `[data-row-id="${rowId}"] [data-col-id="${colId}"]`
        ) as HTMLElement | null;

        if (!cellEl) { return; }

        cellEl.classList.remove("datagrid-cell-editing");
        cellEl.textContent = value != null ? String(value) : "";
    }

    private handleEditorKey(e: KeyboardEvent): void
    {
        if (e.key === "Enter")
        {
            e.preventDefault();
            this.commitEdit();
        }
        else if (e.key === "Escape")
        {
            e.preventDefault();
            this.cancelEdit();
        }
        else if (e.key === "Tab")
        {
            e.preventDefault();
            this.commitEdit();
            this.moveToNextEditableCell(e.shiftKey);
        }
    }

    private moveToNextEditableCell(reverse: boolean): void
    {
        const cols = this.getVisibleColumns().filter(c => c.editable);
        if (cols.length === 0) { return; }

        // Simple: move focus down or to next editable column
        const delta = reverse ? -1 : 1;
        this.moveFocus(0, delta);
    }

    // ========================================================================
    // COLUMN RESIZE
    // ========================================================================

    private onResizeStart(e: PointerEvent, col: DataGridColumn): void
    {
        const handle = e.currentTarget as HTMLElement;
        handle.setPointerCapture(e.pointerId);

        const startX = e.clientX;
        const startWidth = col.width || DEFAULT_COL_WIDTH;

        const onMove = (me: PointerEvent) =>
        {
            const newW = this.clampWidth(col, startWidth + (me.clientX - startX));
            col.width = newW;
            this.updateAllColumnWidths();
        };

        const onUp = (ue: PointerEvent) =>
        {
            handle.releasePointerCapture(ue.pointerId);
            handle.removeEventListener("pointermove", onMove);
            handle.removeEventListener("pointerup", onUp);
            this.options.onColumnResize?.(col.id, col.width || DEFAULT_COL_WIDTH);
        };

        handle.addEventListener("pointermove", onMove);
        handle.addEventListener("pointerup", onUp);
    }

    private clampWidth(col: DataGridColumn, w: number): number
    {
        const min = col.minWidth ?? MIN_COL_WIDTH;
        const max = col.maxWidth ?? Infinity;
        return Math.max(min, Math.min(max, w));
    }

    // ========================================================================
    // COLUMN REORDER
    // ========================================================================

    private reorderColumn(sourceId: string, targetId: string): void
    {
        const srcIdx = this.columns.findIndex(c => c.id === sourceId);
        const tgtIdx = this.columns.findIndex(c => c.id === targetId);

        if (srcIdx === -1 || tgtIdx === -1 || srcIdx === tgtIdx) { return; }

        const [moved] = this.columns.splice(srcIdx, 1);
        this.columns.splice(tgtIdx, 0, moved);

        this.rebuildGrid();
        this.options.onColumnReorder?.(sourceId, tgtIdx);
    }

    private showDropIndicator(cell: HTMLElement): void
    {
        this.removeDropIndicators();
        cell.classList.add("datagrid-drop-indicator");
    }

    private removeDropIndicators(): void
    {
        this.rootEl.querySelectorAll(".datagrid-drop-indicator")
            .forEach(el => el.classList.remove("datagrid-drop-indicator"));
    }

    // ========================================================================
    // VIRTUAL SCROLLING
    // ========================================================================

    private checkVirtual(): void
    {
        const mode = this.options.virtualScrolling || "auto";
        const pageRows = this.getCurrentPageRows();

        this.virtualActive = mode === "enabled"
            || (mode === "auto" && pageRows.length > VIRTUAL_THRESHOLD);
    }

    private setupVirtual(rows: DataGridRow[]): void
    {
        const rh = this.getRowHeight();
        this.bodyEl.style.position = "relative";
        this.bodyEl.style.height = `${rows.length * rh}px`;
    }

    private renderVirtualRows(): void
    {
        const rh = this.getRowHeight();
        const scrollTop = this.scrollContainerEl.scrollTop;
        const vpHeight = this.scrollContainerEl.clientHeight;
        const pageRows = this.getCurrentPageRows();

        const firstVis = Math.floor(scrollTop / rh);
        const visCount = Math.ceil(vpHeight / rh);
        const start = Math.max(0, firstVis - VIRTUAL_BUFFER);
        const end = Math.min(pageRows.length - 1, firstVis + visCount + VIRTUAL_BUFFER);

        this.pruneVirtualRows(start, end);
        this.addVirtualRows(pageRows, start, end, rh);
    }

    private pruneVirtualRows(start: number, end: number): void
    {
        for (const [idx, el] of this.renderedVRows)
        {
            if (idx < start || idx > end)
            {
                el.remove();
                this.renderedVRows.delete(idx);
            }
        }
    }

    private addVirtualRows(
        rows: DataGridRow[], start: number, end: number, rh: number): void
    {
        for (let i = start; i <= end; i++)
        {
            if (this.renderedVRows.has(i)) { continue; }

            const el = this.buildRow(rows[i], i);
            el.style.position = "absolute";
            el.style.top = `${i * rh}px`;
            el.style.width = "100%";
            this.bodyEl.appendChild(el);
            this.renderedVRows.set(i, el);
        }
    }

    private onViewportScroll(): void
    {
        if (!this.virtualActive || this.rafId !== null) { return; }

        this.rafId = requestAnimationFrame(() =>
        {
            this.renderVirtualRows();
            this.rafId = null;
        });
    }

    // ========================================================================
    // KEYBOARD NAVIGATION
    // ========================================================================

    private resolveKeyCombo(action: string): string
    {
        return this.options.keyBindings?.[action]
            ?? DEFAULT_KEY_BINDINGS[action] ?? "";
    }

    private matchesKeyCombo(
        e: KeyboardEvent, action: string
    ): boolean
    {
        const combo = this.resolveKeyCombo(action);
        if (!combo) { return false; }
        const parts = combo.split("+");
        const key = parts[parts.length - 1];
        const needCtrl = parts.includes("Ctrl");
        const needShift = parts.includes("Shift");
        const needAlt = parts.includes("Alt");
        return e.key === key
            && e.ctrlKey === needCtrl
            && e.shiftKey === needShift
            && e.altKey === needAlt;
    }

    private handleKeydown(e: KeyboardEvent): void
    {
        if (this.editState) { return; }

        const target = e.target as HTMLElement;
        if (target.closest(".datagrid-filter-cell")) { return; }
        if (target.closest(".datagrid-pagination")) { return; }

        if (this.handleKeydownNav(e)) { return; }
        if (this.handleKeydownActions(e)) { return; }
    }

    private handleKeydownNav(e: KeyboardEvent): boolean
    {
        if (this.matchesKeyCombo(e, "moveRight"))
        {
            e.preventDefault(); this.moveFocus(0, 1); return true;
        }
        if (this.matchesKeyCombo(e, "moveLeft"))
        {
            e.preventDefault(); this.moveFocus(0, -1); return true;
        }
        if (this.matchesKeyCombo(e, "moveDown"))
        {
            e.preventDefault(); this.moveFocus(1, 0); return true;
        }
        if (this.matchesKeyCombo(e, "moveUp"))
        {
            e.preventDefault(); this.moveFocus(-1, 0); return true;
        }
        if (this.matchesKeyCombo(e, "home"))
        {
            e.preventDefault(); this.handleHome(e.ctrlKey); return true;
        }
        if (this.matchesKeyCombo(e, "end"))
        {
            e.preventDefault(); this.handleEnd(e.ctrlKey); return true;
        }
        return false;
    }

    private handleKeydownActions(e: KeyboardEvent): boolean
    {
        if (this.matchesKeyCombo(e, "editCell"))
        {
            this.handleEditKey(); return true;
        }
        if (e.key === " ")
        {
            e.preventDefault(); this.handleSpaceKey(); return true;
        }
        if (this.matchesKeyCombo(e, "selectAll"))
        {
            e.preventDefault(); this.selectAll(); return true;
        }
        if (this.matchesKeyCombo(e, "escape"))
        {
            e.preventDefault(); this.cancelEdit(); return true;
        }
        return false;
    }

    private moveFocus(dRow: number, dCol: number): void
    {
        const pageRows = this.getCurrentPageRows();
        const cols = this.getVisibleColumns();

        this.focusedRow = Math.max(0, Math.min(
            this.focusedRow + dRow, pageRows.length - 1));
        this.focusedCol = Math.max(0, Math.min(
            this.focusedCol + dCol, cols.length - 1));

        this.applyFocusToCell();
    }

    private handleHome(ctrl: boolean): void
    {
        this.focusedCol = 0;
        if (ctrl) { this.focusedRow = 0; }
        this.applyFocusToCell();
    }

    private handleEnd(ctrl: boolean): void
    {
        this.focusedCol = this.getVisibleColumns().length - 1;
        if (ctrl) { this.focusedRow = this.getCurrentPageRows().length - 1; }
        this.applyFocusToCell();
    }

    private handleEditKey(): void
    {
        const pageRows = this.getCurrentPageRows();
        const cols = this.getVisibleColumns();

        if (this.focusedRow < pageRows.length && this.focusedCol < cols.length)
        {
            const row = pageRows[this.focusedRow];
            const col = cols[this.focusedCol];

            if (col.editable && !row.disabled)
            {
                this.startEdit(row.id, col.id);
            }
        }
    }

    private handleSpaceKey(): void
    {
        const pageRows = this.getCurrentPageRows();

        if (this.focusedRow < pageRows.length && this.options.selectable)
        {
            const row = pageRows[this.focusedRow];

            if (!row.disabled)
            {
                this.toggleSelection(row.id);
                this.onSelectionChange();
            }
        }
    }

    private applyFocusToCell(): void
    {
        // Clear previous focus
        const prev = this.bodyEl.querySelector(".datagrid-cell-focused");
        if (prev)
        {
            prev.classList.remove("datagrid-cell-focused");
            setAttr(prev as HTMLElement, "tabindex", "-1");
        }

        // Apply new focus
        const rows = this.bodyEl.querySelectorAll(".datagrid-row");
        if (this.focusedRow >= rows.length) { return; }

        const cells = rows[this.focusedRow].querySelectorAll(
            ".datagrid-cell[data-col-id]"
        );
        if (this.focusedCol >= cells.length) { return; }

        const cell = cells[this.focusedCol] as HTMLElement;
        cell.classList.add("datagrid-cell-focused");
        setAttr(cell, "tabindex", "0");
        cell.focus();
    }

    // ========================================================================
    // AGGREGATION
    // ========================================================================

    private calculateAggregates(): Record<string, string>
    {
        const result: Record<string, string> = {};

        for (const col of this.getVisibleColumns())
        {
            if (!col.aggregate) { continue; }

            const values = this.filteredRows.map(r => r.data[col.id]);
            result[col.id] = this.computeAggregate(col.aggregate, values);
        }

        return result;
    }

    private computeAggregate(
        agg: DataGridColumn["aggregate"],
        values: unknown[]): string
    {
        if (typeof agg === "function") { return agg(values); }

        const nums = values
            .map(v => Number(v))
            .filter(n => !isNaN(n));

        switch (agg)
        {
            case "sum":   return formatNumber(nums.reduce((a, b) => a + b, 0));
            case "avg":   return nums.length ? formatNumber(nums.reduce((a, b) => a + b, 0) / nums.length) : "—";
            case "count": return formatNumber(values.filter(v => v != null).length);
            case "min":   return nums.length ? formatNumber(Math.min(...nums)) : "—";
            case "max":   return nums.length ? formatNumber(Math.max(...nums)) : "—";
            default:      return "";
        }
    }

    // ========================================================================
    // CSV EXPORT
    // ========================================================================

    private buildCSVContent(): string
    {
        const cols = this.getVisibleColumns();
        const headerLine = cols.map(c => escapeCSV(c.label)).join(",");
        const lines = [headerLine];

        for (const row of this.sortedRows)
        {
            const cells = cols.map(c => escapeCSV(row.data[c.id]));
            lines.push(cells.join(","));
        }

        return lines.join("\n");
    }

    private downloadBlob(csv: string, filename: string): void
    {
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();

        URL.revokeObjectURL(url);
    }

    // ========================================================================
    // HELPERS
    // ========================================================================

    private fullRender(): void
    {
        this.renderBody();
        this.renderFooter();
        this.renderPagination();
        this.updateHeaderSort();
    }

    private rebuildGrid(): void
    {
        const parent = this.rootEl.parentElement;
        if (!parent) { return; }

        const newRoot = this.buildRoot();
        parent.replaceChild(newRoot, this.rootEl);
        this.rootEl = newRoot;
        this.fullRender();
    }

    private getVisibleColumns(): DataGridColumn[]
    {
        return this.columns.filter(c => !c.hidden);
    }

    private hasFilterableColumns(): boolean
    {
        return this.columns.some(c => c.filterable);
    }

    private findCol(id: string): DataGridColumn | undefined
    {
        return this.columns.find(c => c.id === id);
    }

    private getRowHeight(): number
    {
        return this.options.dense ? ROW_HEIGHT_DENSE : ROW_HEIGHT;
    }

    private getAbsoluteRowIndex(pageIndex: number): number
    {
        return (this.currentPage - 1) * this.pageSize + pageIndex;
    }

    private onDocClick(e: MouseEvent): void
    {
        if (!this.rootEl.contains(e.target as Node))
        {
            this.cancelEdit();
        }
    }

    private announce(message: string): void
    {
        this.liveRegionEl.textContent = "";
        requestAnimationFrame(() =>
        {
            this.liveRegionEl.textContent = message;
        });
    }

    private guardDestroyed(method: string): boolean
    {
        if (this.destroyed)
        {
            logWarn(`Cannot call ${method}() on destroyed instance`);
            return true;
        }

        return false;
    }
}

// ============================================================================
// CONVENIENCE FUNCTION
// ============================================================================

export function createDataGrid(
    options: DataGridOptions,
    containerId?: string): DataGrid
{
    const instance = new DataGrid(options);
    if (containerId) { instance.show(containerId); }
    return instance;
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

if (typeof window !== "undefined")
{
    (window as unknown as Record<string, unknown>)["DataGrid"] = DataGrid;
    (window as unknown as Record<string, unknown>)["createDataGrid"] = createDataGrid;
}
