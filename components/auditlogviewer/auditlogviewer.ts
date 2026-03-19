/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ⚓ COMPONENT: AuditLogViewer
 * 📜 PURPOSE: Read-only filterable audit log viewer with fixed columns,
 *    expandable row detail, severity badges, filter chips, pagination,
 *    CSV/JSON export, and auto-refresh.
 * 🔗 RELATES: [[EnterpriseTheme]], [[CustomComponents]]
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface AuditLogEntry
{
    id: string;
    timestamp: Date;
    actor: string;
    actorId?: string;
    action: string;
    resource: string;
    resourceType?: string;
    ipAddress?: string;
    severity?: "info" | "warning" | "critical";
    detail?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
}

export interface AuditLogFilters
{
    dateFrom?: Date;
    dateTo?: Date;
    actor?: string;
    action?: string;
    resourceType?: string;
    severity?: string[];
    search?: string;
}

export interface AuditLogViewerOptions
{
    entries?: AuditLogEntry[];
    pageSize?: number;
    serverSide?: boolean;
    showFilters?: boolean;
    showExport?: boolean;
    showDetail?: boolean;
    showSeverity?: boolean;
    showIPAddress?: boolean;
    autoRefresh?: number;
    height?: string;
    dateFormat?: string;
    cssClass?: string;
    onFilter?: (filters: AuditLogFilters) => void;
    onPageChange?: (page: number) => void;
    onLoadPage?: (page: number, filters: AuditLogFilters) => Promise<{ entries: AuditLogEntry[]; total: number }>;
    onExport?: (format: "csv" | "json", filters: AuditLogFilters) => void;
    onRowClick?: (entry: AuditLogEntry) => void;
    /** Override default key combos. Keys are action names, values are combo strings. */
    keyBindings?: Partial<Record<string, string>>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[AuditLogViewer]";
const CLS = "auditlog";
const FILTER_DEBOUNCE_MS = 250;
const JSON_TRUNCATE_LIMIT = 10000;

const DEFAULT_KEY_BINDINGS: Record<string, string> = {
    "moveDown": "ArrowDown",
    "moveUp": "ArrowUp",
    "home": "Home",
    "end": "End",
    "activate": "Enter",
    "toggleDetail": " ",
    "escape": "Escape",
};

// ============================================================================
// HELPERS
// ============================================================================

function createElement(tag: string, cls?: string): HTMLElement
{
    const el = document.createElement(tag);
    if (cls) { el.className = cls; }
    return el;
}

function setAttr(el: HTMLElement, key: string, value: string): void
{
    el.setAttribute(key, value);
}

function safeCallback<T extends unknown[]>(
    fn: ((...a: T) => void) | undefined,
    ...args: T
): void
{
    if (!fn) { return; }
    try { fn(...args); }
    catch (err) { console.error(LOG_PREFIX, "Callback error:", err); }
}

function debounce<T extends (...args: unknown[]) => void>(
    fn: T,
    ms: number
): (...args: Parameters<T>) => void
{
    let timer = 0;
    return (...args: Parameters<T>): void =>
    {
        clearTimeout(timer);
        timer = window.setTimeout(() => fn(...args), ms);
    };
}

function escapeCSVValue(value: unknown): string
{
    const str = (value == null) ? "" : String(value);
    if (str.includes(",") || str.includes('"') || str.includes("\n"))
    {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

function formatTimestamp(date: Date, format: string): string
{
    if (format === "iso") { return date.toISOString(); }
    return new Intl.DateTimeFormat(undefined, {
        dateStyle: "short",
        timeStyle: "medium"
    }).format(date);
}

function formatDetailJSON(detail: Record<string, unknown>): string
{
    const json = JSON.stringify(detail, null, 2);
    if (json.length > JSON_TRUNCATE_LIMIT)
    {
        return json.substring(0, JSON_TRUNCATE_LIMIT) + "\n... (truncated)";
    }
    return json;
}

function downloadBlob(blob: Blob, filename: string): void
{
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ============================================================================
// CLASS
// ============================================================================

export class AuditLogViewer
{
    // -- Options -------------------------------------------------------------
    private opts: AuditLogViewerOptions;
    private pageSize: number;
    private serverSide: boolean;
    private dateFormat: string;

    // -- Data ----------------------------------------------------------------
    private allEntries: AuditLogEntry[] = [];
    private entryMap = new Map<string, AuditLogEntry>();
    private filters: AuditLogFilters = {};
    private currentPage = 1;
    private totalEntries = 0;

    // -- DOM -----------------------------------------------------------------
    private rootEl: HTMLElement | null = null;
    private tableBodyEl: HTMLElement | null = null;
    private paginationEl: HTMLElement | null = null;
    private chipsEl: HTMLElement | null = null;
    private footerEl: HTMLElement | null = null;
    private liveEl: HTMLElement | null = null;
    private expandedId: string | null = null;
    private focusedRowIdx = 0;

    // -- State ---------------------------------------------------------------
    private destroyed = false;
    private refreshTimer = 0;
    private debouncedFilterText: (...args: unknown[]) => void;

    // ========================================================================
    // CONSTRUCTOR
    // ========================================================================

    constructor(options: AuditLogViewerOptions)
    {
        this.opts = options;
        this.pageSize = options.pageSize ?? 50;
        this.serverSide = options.serverSide === true;
        this.dateFormat = options.dateFormat ?? "locale";
        this.debouncedFilterText = debounce(
            () => this.applyFilters(), FILTER_DEBOUNCE_MS
        );

        if (options.entries)
        {
            this.setEntriesInternal(options.entries);
        }

        this.rootEl = this.buildRoot();

        console.log(
            LOG_PREFIX,
            `Initialised with ${this.allEntries.length} entries`
        );
    }

    // ========================================================================
    // LIFECYCLE
    // ========================================================================

    show(containerId: string | HTMLElement): void
    {
        if (this.destroyed) { console.warn(LOG_PREFIX, "Already destroyed"); return; }
        const container = typeof containerId === "string"
            ? document.getElementById(containerId) : containerId;
        if (!container) { console.error(LOG_PREFIX, "Container not found:", containerId); return; }
        container.appendChild(this.rootEl!);
        this.renderPage();
        this.startAutoRefresh();
        console.log(LOG_PREFIX, "Shown in container");
    }

    hide(): void
    {
        if (this.destroyed) { return; }
        this.stopAutoRefresh();
        this.rootEl?.parentElement?.removeChild(this.rootEl);
    }

    destroy(): void
    {
        if (this.destroyed) { console.warn(LOG_PREFIX, "Already destroyed"); return; }
        this.destroyed = true;
        this.stopAutoRefresh();
        this.rootEl?.parentElement?.removeChild(this.rootEl);
        this.rootEl = null;
        this.tableBodyEl = null;
        this.paginationEl = null;
        this.chipsEl = null;
        this.footerEl = null;
        this.liveEl = null;
        this.entryMap.clear();
        this.allEntries = [];
        console.log(LOG_PREFIX, "Destroyed");
    }

    getElement(): HTMLElement | null { return this.rootEl; }

    // ========================================================================
    // PUBLIC API
    // ========================================================================

    setEntries(entries: AuditLogEntry[]): void
    {
        this.setEntriesInternal(entries);
        this.currentPage = 1;
        this.renderPage();
    }

    addEntry(entry: AuditLogEntry): void
    {
        this.allEntries.unshift(entry);
        this.entryMap.set(entry.id, entry);
        this.totalEntries = this.allEntries.length;
        this.renderPage();
    }

    getEntries(): AuditLogEntry[] { return [...this.allEntries]; }

    setFilters(filters: AuditLogFilters): void
    {
        this.filters = { ...filters };
        this.currentPage = 1;
        this.renderChips();
        this.renderPage();
    }

    clearFilters(): void
    {
        this.filters = {};
        this.currentPage = 1;
        this.renderChips();
        this.renderPage();
        this.announce("Filters cleared");
    }

    getFilters(): AuditLogFilters { return { ...this.filters }; }
    setPage(page: number): void { this.goToPage(page); }
    getPage(): number { return this.currentPage; }

    getPageCount(): number
    {
        return Math.max(1, Math.ceil(this.totalEntries / this.pageSize));
    }

    exportCSV(): void { this.doExportCSV(); }
    exportJSON(): void { this.doExportJSON(); }

    refresh(): void
    {
        if (this.serverSide && this.opts.onLoadPage)
        {
            this.loadServerPage(this.currentPage);
        }
        else
        {
            this.renderPage();
        }
    }

    getSelectedEntry(): AuditLogEntry | null
    {
        return this.expandedId ? (this.entryMap.get(this.expandedId) ?? null) : null;
    }

    scrollToEntry(entryId: string): void
    {
        if (!this.tableBodyEl) { return; }
        const row = this.tableBodyEl.querySelector(`[data-entry-id="${entryId}"]`);
        if (row)
        {
            (row as HTMLElement).scrollIntoView({ block: "nearest" });
            if (this.opts.showDetail !== false) { this.toggleDetail(entryId); }
        }
    }

    // ========================================================================
    // BUILD — ROOT
    // ========================================================================

    private buildRoot(): HTMLElement
    {
        const root = createElement("div", CLS);
        if (this.opts.cssClass) { root.classList.add(...this.opts.cssClass.split(" ")); }
        if (this.opts.height) { root.style.height = this.opts.height; }
        setAttr(root, "role", "region");
        setAttr(root, "aria-label", "Audit Log");

        root.appendChild(this.buildHeader());

        if (this.opts.showFilters !== false)
        {
            root.appendChild(this.buildFilterBar());
            this.chipsEl = createElement("div", `${CLS}-chips`);
            setAttr(this.chipsEl, "role", "list");
            root.appendChild(this.chipsEl);
        }

        root.appendChild(this.buildTable());

        this.paginationEl = createElement("nav", `${CLS}-pagination`);
        setAttr(this.paginationEl, "role", "navigation");
        setAttr(this.paginationEl, "aria-label", "Pagination");
        root.appendChild(this.paginationEl);

        this.footerEl = createElement("div", `${CLS}-footer`);
        root.appendChild(this.footerEl);

        this.liveEl = createElement("div", "visually-hidden");
        setAttr(this.liveEl, "aria-live", "polite");
        setAttr(this.liveEl, "aria-atomic", "true");
        root.appendChild(this.liveEl);

        return root;
    }

    // ========================================================================
    // BUILD — HEADER
    // ========================================================================

    private buildHeader(): HTMLElement
    {
        const header = createElement("div", `${CLS}-header`);

        const title = createElement("span", `${CLS}-title`);
        title.textContent = "Audit Log";
        header.appendChild(title);

        if (this.opts.showExport !== false)
        {
            const actions = createElement("div", `${CLS}-header-actions`);
            actions.appendChild(this.buildExportBtn("CSV"));
            actions.appendChild(this.buildExportBtn("JSON"));
            header.appendChild(actions);
        }

        return header;
    }

    private buildExportBtn(format: string): HTMLElement
    {
        const btn = createElement("button", `${CLS}-export-btn`);
        setAttr(btn, "type", "button");
        setAttr(btn, "aria-label", `Export as ${format}`);
        const icon = createElement("i", "bi bi-download");
        setAttr(icon, "aria-hidden", "true");
        btn.appendChild(icon);
        btn.appendChild(document.createTextNode(` ${format}`));
        btn.addEventListener("click", () =>
        {
            if (format === "CSV") { this.doExportCSV(); }
            else { this.doExportJSON(); }
        });
        return btn;
    }

    // ========================================================================
    // BUILD — FILTER BAR
    // ========================================================================

    private buildFilterBar(): HTMLElement
    {
        const bar = createElement("div", `${CLS}-filters`);

        bar.appendChild(this.buildDateFilter("From", "dateFrom"));
        bar.appendChild(this.buildDateFilter("To", "dateTo"));
        bar.appendChild(this.buildTextFilter("Actor...", "actor"));
        bar.appendChild(this.buildActionSelect());

        if (this.opts.showSeverity !== false)
        {
            bar.appendChild(this.buildSeverityChecks());
        }

        bar.appendChild(this.buildTextFilter("Search...", "search"));
        return bar;
    }

    private buildDateFilter(label: string, key: string): HTMLElement
    {
        const input = document.createElement("input") as HTMLInputElement;
        input.className = `${CLS}-filter-date`;
        input.type = "date";
        setAttr(input, "aria-label", `Filter by ${label} date`);
        input.placeholder = label;
        input.addEventListener("change", () =>
        {
            (this.filters as Record<string, unknown>)[key] =
                input.value ? new Date(input.value + "T00:00:00") : undefined;
            this.applyFilters();
        });
        return input;
    }

    private buildTextFilter(
        placeholder: string,
        key: string
    ): HTMLElement
    {
        const input = document.createElement("input") as HTMLInputElement;
        input.className = `${CLS}-filter-input`;
        input.type = "text";
        input.placeholder = placeholder;
        setAttr(input, "aria-label", `Filter by ${key}`);
        input.addEventListener("input", () =>
        {
            (this.filters as Record<string, unknown>)[key] =
                input.value.trim() || undefined;
            this.debouncedFilterText();
        });
        return input;
    }

    private buildActionSelect(): HTMLElement
    {
        const select = document.createElement("select") as HTMLSelectElement;
        select.className = `${CLS}-filter-select`;
        setAttr(select, "aria-label", "Filter by action");

        const all = document.createElement("option");
        all.value = "";
        all.textContent = "All actions";
        select.appendChild(all);

        const actions = new Set(this.allEntries.map(e => e.action));
        actions.forEach(a =>
        {
            const opt = document.createElement("option");
            opt.value = a;
            opt.textContent = a;
            select.appendChild(opt);
        });

        select.addEventListener("change", () =>
        {
            this.filters.action = select.value || undefined;
            this.applyFilters();
        });
        return select;
    }

    private buildSeverityChecks(): HTMLElement
    {
        const wrap = createElement("div", `${CLS}-filter-severity`);
        const levels = ["info", "warning", "critical"];
        levels.forEach(sev =>
        {
            const label = createElement("label", `${CLS}-filter-checkbox`);
            const cb = document.createElement("input") as HTMLInputElement;
            cb.type = "checkbox";
            cb.value = sev;
            cb.checked = true;
            cb.addEventListener("change", () => this.onSeverityChange());
            label.appendChild(cb);
            label.appendChild(document.createTextNode(" " + sev));
            wrap.appendChild(label);
        });
        return wrap;
    }

    private onSeverityChange(): void
    {
        if (!this.rootEl) { return; }
        const checks = this.rootEl.querySelectorAll(
            `.${CLS}-filter-checkbox input[type="checkbox"]`
        ) as NodeListOf<HTMLInputElement>;
        const checked: string[] = [];
        checks.forEach(cb => { if (cb.checked) { checked.push(cb.value); } });

        this.filters.severity = checked.length < 3 ? checked : undefined;
        this.applyFilters();
    }

    // ========================================================================
    // FILTER LOGIC
    // ========================================================================

    private applyFilters(): void
    {
        this.currentPage = 1;
        this.renderChips();

        if (this.serverSide)
        {
            safeCallback(this.opts.onFilter, { ...this.filters });
            if (this.opts.onLoadPage)
            {
                this.loadServerPage(1);
            }
        }
        else
        {
            this.renderPage();
            const count = this.getFilteredEntries().length;
            this.announce(`${count} entries match filter`);
        }
    }

    private getFilteredEntries(): AuditLogEntry[]
    {
        if (this.serverSide) { return this.allEntries; }

        return this.allEntries.filter(e =>
        {
            if (this.filters.dateFrom && e.timestamp < this.filters.dateFrom) { return false; }
            if (this.filters.dateTo)
            {
                const end = new Date(this.filters.dateTo);
                end.setHours(23, 59, 59, 999);
                if (e.timestamp > end) { return false; }
            }
            if (this.filters.actor)
            {
                if (!e.actor.toLowerCase().includes(this.filters.actor.toLowerCase())) { return false; }
            }
            if (this.filters.action && e.action !== this.filters.action) { return false; }
            if (this.filters.severity && this.filters.severity.length > 0)
            {
                const sev = e.severity ?? "info";
                if (!this.filters.severity.includes(sev)) { return false; }
            }
            if (this.filters.search)
            {
                const q = this.filters.search.toLowerCase();
                const haystack = [e.actor, e.action, e.resource, e.ipAddress ?? ""]
                    .join(" ").toLowerCase();
                if (!haystack.includes(q)) { return false; }
            }
            return true;
        });
    }

    // ========================================================================
    // RENDER — PAGE
    // ========================================================================

    private renderPage(): void
    {
        if (!this.tableBodyEl || !this.paginationEl || !this.footerEl) { return; }

        const filtered = this.getFilteredEntries();
        this.totalEntries = filtered.length;
        const sorted = filtered.sort(
            (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
        );

        const start = (this.currentPage - 1) * this.pageSize;
        const pageEntries = sorted.slice(start, start + this.pageSize);

        this.renderRows(pageEntries);
        this.renderPagination();
        this.renderFooter(filtered);
    }

    private renderRows(entries: AuditLogEntry[]): void
    {
        if (!this.tableBodyEl) { return; }
        this.tableBodyEl.textContent = "";
        this.expandedId = null;

        if (entries.length === 0)
        {
            const empty = createElement("div", `${CLS}-empty`);
            empty.textContent = "No entries match the current filters";
            this.tableBodyEl.appendChild(empty);
            return;
        }

        entries.forEach((e, idx) =>
        {
            this.tableBodyEl!.appendChild(this.buildRow(e, idx));
        });
    }

    // ========================================================================
    // BUILD — TABLE
    // ========================================================================

    private buildTable(): HTMLElement
    {
        const wrap = createElement("div", `${CLS}-table`);
        setAttr(wrap, "role", "grid");
        setAttr(wrap, "aria-label", "Audit log entries");

        const headerGroup = createElement("div", `${CLS}-table-header-group`);
        setAttr(headerGroup, "role", "rowgroup");
        headerGroup.appendChild(this.buildTableHeader());
        wrap.appendChild(headerGroup);

        this.tableBodyEl = createElement("div", `${CLS}-table-body`);
        setAttr(this.tableBodyEl, "role", "rowgroup");
        wrap.appendChild(this.tableBodyEl);

        wrap.addEventListener("keydown", (e) => this.onTableKeydown(e));
        return wrap;
    }

    private buildTableHeader(): HTMLElement
    {
        const row = createElement("div", `${CLS}-table-header`);
        setAttr(row, "role", "row");

        const cols = this.getColumns();
        cols.forEach(col =>
        {
            const cell = createElement("div",
                `${CLS}-table-header-cell ${CLS}-cell-${col.key}`);
            setAttr(cell, "role", "columnheader");
            cell.textContent = col.label;
            row.appendChild(cell);
        });

        return row;
    }

    private getColumns(): Array<{ key: string; label: string }>
    {
        const cols = [
            { key: "timestamp", label: "Time" },
            { key: "actor", label: "Actor" },
            { key: "action", label: "Action" },
            { key: "resource", label: "Resource" },
        ];
        if (this.opts.showIPAddress !== false)
        {
            cols.push({ key: "ip", label: "IP" });
        }
        if (this.opts.showSeverity !== false)
        {
            cols.push({ key: "severity", label: "Severity" });
        }
        return cols;
    }

    // ========================================================================
    // BUILD — ROW
    // ========================================================================

    private buildRow(entry: AuditLogEntry, idx: number): HTMLElement
    {
        const sev = entry.severity ?? "info";
        const row = createElement("div",
            `${CLS}-row ${CLS}-row-${sev}`);
        setAttr(row, "role", "row");
        setAttr(row, "data-entry-id", entry.id);
        setAttr(row, "tabindex", idx === 0 ? "0" : "-1");
        setAttr(row, "aria-rowindex", String(idx + 1));

        if (entry.detail && this.opts.showDetail !== false)
        {
            setAttr(row, "aria-expanded", "false");
        }

        row.appendChild(this.buildCell("timestamp",
            formatTimestamp(entry.timestamp, this.dateFormat)));
        row.appendChild(this.buildCell("actor", entry.actor));
        row.appendChild(this.buildCell("action", entry.action));
        row.appendChild(this.buildCell("resource", entry.resource));

        if (this.opts.showIPAddress !== false)
        {
            row.appendChild(this.buildCell("ip", entry.ipAddress ?? "--"));
        }
        if (this.opts.showSeverity !== false)
        {
            row.appendChild(this.buildSeverityCell(sev));
        }

        row.addEventListener("click", () => this.onRowClick(entry));
        return row;
    }

    private buildCell(key: string, text: string): HTMLElement
    {
        const cell = createElement("div", `${CLS}-cell ${CLS}-cell-${key}`);
        setAttr(cell, "role", "gridcell");
        cell.textContent = text;
        cell.title = text;
        return cell;
    }

    private buildSeverityCell(sev: string): HTMLElement
    {
        const cell = createElement("div", `${CLS}-cell ${CLS}-cell-severity`);
        setAttr(cell, "role", "gridcell");

        const badge = createElement("span",
            `${CLS}-severity-badge ${CLS}-severity-${sev}`);
        setAttr(badge, "aria-label", `Severity: ${sev}`);

        const iconMap: Record<string, string> = {
            info: "bi-info-circle",
            warning: "bi-exclamation-triangle",
            critical: "bi-exclamation-octagon"
        };
        const i = createElement("i", `bi ${iconMap[sev] ?? "bi-info-circle"}`);
        setAttr(i, "aria-hidden", "true");
        badge.appendChild(i);
        badge.appendChild(document.createTextNode(" " + sev));
        cell.appendChild(badge);
        return cell;
    }

    // ========================================================================
    // DETAIL PANEL
    // ========================================================================

    private onRowClick(entry: AuditLogEntry): void
    {
        safeCallback(this.opts.onRowClick, entry);
        if (this.opts.showDetail !== false && entry.detail)
        {
            this.toggleDetail(entry.id);
        }
    }

    private toggleDetail(entryId: string): void
    {
        if (!this.tableBodyEl) { return; }

        // Close existing
        const existing = this.tableBodyEl.querySelector(`.${CLS}-detail`);
        if (existing)
        {
            const prevRow = existing.previousElementSibling as HTMLElement;
            existing.parentElement?.removeChild(existing);
            if (prevRow) { setAttr(prevRow, "aria-expanded", "false"); }
            prevRow?.classList.remove(`${CLS}-row-expanded`);

            if (this.expandedId === entryId)
            {
                this.expandedId = null;
                this.announce("Detail panel closed");
                return;
            }
        }

        // Open new
        const entry = this.entryMap.get(entryId);
        if (!entry || !entry.detail) { return; }

        const row = this.tableBodyEl.querySelector(
            `[data-entry-id="${entryId}"]`
        ) as HTMLElement;
        if (!row) { return; }

        const detail = this.buildDetailPanel(entry);
        row.after(detail);
        setAttr(row, "aria-expanded", "true");
        row.classList.add(`${CLS}-row-expanded`);
        this.expandedId = entryId;
        this.announce(
            `Detail panel opened for ${entry.action} by ${entry.actor}`
        );
    }

    private buildDetailPanel(entry: AuditLogEntry): HTMLElement
    {
        const panel = createElement("div", `${CLS}-detail`);
        setAttr(panel, "role", "region");
        setAttr(panel, "aria-label",
            `Event detail for ${entry.action}`);

        const detail = entry.detail!;

        if (detail.before != null || detail.after != null)
        {
            panel.appendChild(this.buildDetailSection("Before",
                detail.before as Record<string, unknown>));
            panel.appendChild(this.buildDetailSection("After",
                detail.after as Record<string, unknown>));
        }
        else
        {
            const pre = createElement("pre", `${CLS}-detail-json`);
            pre.textContent = formatDetailJSON(detail);
            panel.appendChild(pre);
        }

        return panel;
    }

    private buildDetailSection(
        label: string,
        data: Record<string, unknown> | undefined
    ): HTMLElement
    {
        const section = createElement("div", `${CLS}-detail-section`);
        const lbl = createElement("div", `${CLS}-detail-label`);
        lbl.textContent = label;
        section.appendChild(lbl);

        const pre = createElement("pre", `${CLS}-detail-json`);
        pre.textContent = data ? formatDetailJSON(data) : "(empty)";
        section.appendChild(pre);
        return section;
    }

    // ========================================================================
    // CHIPS
    // ========================================================================

    private renderChips(): void
    {
        if (!this.chipsEl) { return; }
        this.chipsEl.textContent = "";
        const f = this.filters;

        if (f.dateFrom || f.dateTo)
        {
            const from = f.dateFrom ? f.dateFrom.toLocaleDateString() : "...";
            const to = f.dateTo ? f.dateTo.toLocaleDateString() : "...";
            this.addChip(`${from} – ${to}`, () =>
            {
                f.dateFrom = undefined;
                f.dateTo = undefined;
                this.applyFilters();
            });
        }
        if (f.actor)
        {
            this.addChip(`actor:${f.actor}`, () =>
            {
                f.actor = undefined;
                this.applyFilters();
            });
        }
        if (f.action)
        {
            this.addChip(`action:${f.action}`, () =>
            {
                f.action = undefined;
                this.applyFilters();
            });
        }
        if (f.severity && f.severity.length > 0 && f.severity.length < 3)
        {
            this.addChip(`severity:${f.severity.join(",")}`, () =>
            {
                f.severity = undefined;
                this.applyFilters();
            });
        }
        if (f.search)
        {
            this.addChip(`search:"${f.search}"`, () =>
            {
                f.search = undefined;
                this.applyFilters();
            });
        }
    }

    private addChip(text: string, onRemove: () => void): void
    {
        if (!this.chipsEl) { return; }
        const chip = createElement("span", `${CLS}-chip`);
        setAttr(chip, "role", "listitem");
        chip.textContent = text + " ";

        const btn = createElement("button", `${CLS}-chip-remove`);
        setAttr(btn, "type", "button");
        setAttr(btn, "aria-label", `Remove filter: ${text}`);
        btn.textContent = "\u00d7";
        btn.addEventListener("click", (e) =>
        {
            e.stopPropagation();
            onRemove();
        });
        chip.appendChild(btn);
        this.chipsEl.appendChild(chip);
    }

    // ========================================================================
    // PAGINATION
    // ========================================================================

    private renderPagination(): void
    {
        if (!this.paginationEl) { return; }
        this.paginationEl.textContent = "";

        const total = this.totalEntries;
        const pages = this.getPageCount();
        if (pages <= 1) { return; }

        const start = (this.currentPage - 1) * this.pageSize + 1;
        const end = Math.min(this.currentPage * this.pageSize, total);

        const info = createElement("span", `${CLS}-pagination-info`);
        info.textContent = `Showing ${start}-${end} of ${total.toLocaleString()} entries`;
        this.paginationEl.appendChild(info);

        const btnGroup = createElement("div", `${CLS}-pagination-pages`);
        this.addPageBtn(btnGroup, "<", this.currentPage - 1, this.currentPage > 1);
        this.addPageNumbers(btnGroup, pages);
        this.addPageBtn(btnGroup, ">", this.currentPage + 1, this.currentPage < pages);
        this.paginationEl.appendChild(btnGroup);
    }

    private addPageNumbers(container: HTMLElement, pages: number): void
    {
        const cur = this.currentPage;
        const range: (number | string)[] = [];

        range.push(1);
        if (cur > 3) { range.push("..."); }
        for (let i = Math.max(2, cur - 1); i <= Math.min(pages - 1, cur + 1); i++)
        {
            range.push(i);
        }
        if (cur < pages - 2) { range.push("..."); }
        if (pages > 1) { range.push(pages); }

        for (const item of range)
        {
            if (item === "...")
            {
                const dots = createElement("span", `${CLS}-pagination-dots`);
                dots.textContent = "...";
                container.appendChild(dots);
            }
            else
            {
                const n = item as number;
                this.addPageBtn(container, String(n), n, true, n === cur);
            }
        }
    }

    private addPageBtn(
        container: HTMLElement,
        text: string,
        page: number,
        enabled: boolean,
        active = false
    ): void
    {
        const btn = createElement("button", `${CLS}-pagination-btn`);
        setAttr(btn, "type", "button");
        btn.textContent = text;
        if (active)
        {
            btn.classList.add(`${CLS}-pagination-btn-active`);
            setAttr(btn, "aria-current", "page");
        }
        if (!enabled)
        {
            (btn as HTMLButtonElement).disabled = true;
        }
        else
        {
            btn.addEventListener("click", () => this.goToPage(page));
        }
        setAttr(btn, "aria-label", text === "<" ? "Previous page" :
            text === ">" ? "Next page" : `Page ${text}`);
        container.appendChild(btn);
    }

    private goToPage(page: number): void
    {
        const pages = this.getPageCount();
        if (page < 1 || page > pages) { return; }
        this.currentPage = page;

        if (this.serverSide && this.opts.onLoadPage)
        {
            this.loadServerPage(page);
        }
        else
        {
            this.renderPage();
        }

        safeCallback(this.opts.onPageChange, page);
        this.announce(`Page ${page} of ${pages}`);
    }

    // ========================================================================
    // FOOTER
    // ========================================================================

    private renderFooter(entries: AuditLogEntry[]): void
    {
        if (!this.footerEl) { return; }
        this.footerEl.textContent = "";

        const count = createElement("span", `${CLS}-footer-count`);
        count.textContent = `${entries.length.toLocaleString()} total entries`;
        this.footerEl.appendChild(count);

        if (entries.length > 0)
        {
            const sorted = [...entries].sort(
                (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
            );
            const oldest = sorted[0].timestamp;
            const newest = sorted[sorted.length - 1].timestamp;
            const range = createElement("span", `${CLS}-footer-range`);
            range.textContent = ` | Date range: ${oldest.toLocaleDateString()} – ${newest.toLocaleDateString()}`;
            this.footerEl.appendChild(range);
        }
    }

    // ========================================================================
    // EXPORT
    // ========================================================================

    private doExportCSV(): void
    {
        const entries = this.getFilteredEntries();
        const header = "Timestamp,Actor,Action,Resource,IP Address,Severity";
        const rows = entries.map(e =>
            [
                formatTimestamp(e.timestamp, this.dateFormat),
                e.actor,
                e.action,
                e.resource,
                e.ipAddress ?? "",
                e.severity ?? "info"
            ].map(escapeCSVValue).join(",")
        );
        const csv = [header, ...rows].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        downloadBlob(blob, "audit-log.csv");
        safeCallback(this.opts.onExport, "csv", { ...this.filters });
        console.log(LOG_PREFIX, "Exported CSV");
    }

    private doExportJSON(): void
    {
        const entries = this.getFilteredEntries();
        const json = JSON.stringify(entries, null, 2);
        const blob = new Blob([json], { type: "application/json;charset=utf-8" });
        downloadBlob(blob, "audit-log.json");
        safeCallback(this.opts.onExport, "json", { ...this.filters });
        console.log(LOG_PREFIX, "Exported JSON");
    }

    // ========================================================================
    // SERVER-SIDE
    // ========================================================================

    private async loadServerPage(page: number): Promise<void>
    {
        if (!this.opts.onLoadPage) { return; }
        try
        {
            const result = await this.opts.onLoadPage(page, { ...this.filters });
            this.allEntries = result.entries;
            this.totalEntries = result.total;
            this.buildEntryMap();
            this.currentPage = page;
            this.renderRows(this.allEntries);
            this.renderPagination();
            this.renderFooter(this.allEntries);
        }
        catch (err)
        {
            console.warn(LOG_PREFIX, "Server-side page load failed:", err);
        }
    }

    // ========================================================================
    // AUTO REFRESH
    // ========================================================================

    private startAutoRefresh(): void
    {
        const interval = this.opts.autoRefresh ?? 0;
        if (interval <= 0 || !this.serverSide) { return; }
        this.refreshTimer = window.setInterval(
            () => this.loadServerPage(this.currentPage), interval
        );
    }

    private stopAutoRefresh(): void
    {
        if (this.refreshTimer)
        {
            clearInterval(this.refreshTimer);
            this.refreshTimer = 0;
        }
    }

    // ========================================================================
    // KEY BINDING RESOLUTION
    // ========================================================================

    private resolveKeyCombo(action: string): string
    {
        return this.opts.keyBindings?.[action]
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

    // ========================================================================
    // KEYBOARD
    // ========================================================================

    private onTableKeydown(e: KeyboardEvent): void
    {
        if (!this.tableBodyEl) { return; }
        const rows = this.tableBodyEl.querySelectorAll(`.${CLS}-row`);
        if (rows.length === 0) { return; }

        if (this.matchesKeyCombo(e, "moveDown"))
        {
            e.preventDefault();
            this.moveRowFocus(rows, 1);
        }
        else if (this.matchesKeyCombo(e, "moveUp"))
        {
            e.preventDefault();
            this.moveRowFocus(rows, -1);
        }
        else if (this.matchesKeyCombo(e, "home"))
        {
            e.preventDefault();
            this.setRowFocus(rows, 0);
        }
        else if (this.matchesKeyCombo(e, "end"))
        {
            e.preventDefault();
            this.setRowFocus(rows, rows.length - 1);
        }
        else if (this.matchesKeyCombo(e, "activate")
            || this.matchesKeyCombo(e, "toggleDetail"))
        {
            e.preventDefault();
            this.activateRow(rows);
        }
        else if (this.matchesKeyCombo(e, "escape"))
        {
            if (this.expandedId) { this.toggleDetail(this.expandedId); }
        }
    }

    private moveRowFocus(rows: NodeListOf<Element>, delta: number): void
    {
        const next = this.focusedRowIdx + delta;
        if (next < 0 || next >= rows.length) { return; }
        this.setRowFocus(rows, next);
    }

    private setRowFocus(rows: NodeListOf<Element>, idx: number): void
    {
        if (this.focusedRowIdx < rows.length)
        {
            (rows[this.focusedRowIdx] as HTMLElement).setAttribute("tabindex", "-1");
        }
        this.focusedRowIdx = idx;
        const row = rows[idx] as HTMLElement;
        row.setAttribute("tabindex", "0");
        row.focus();
    }

    private activateRow(rows: NodeListOf<Element>): void
    {
        const row = rows[this.focusedRowIdx] as HTMLElement;
        if (!row) { return; }
        const id = row.getAttribute("data-entry-id");
        if (id)
        {
            const entry = this.entryMap.get(id);
            if (entry) { this.onRowClick(entry); }
        }
    }

    // ========================================================================
    // INTERNAL
    // ========================================================================

    private setEntriesInternal(entries: AuditLogEntry[]): void
    {
        this.allEntries = [...entries];
        this.totalEntries = entries.length;
        this.buildEntryMap();
    }

    private buildEntryMap(): void
    {
        this.entryMap.clear();
        for (const e of this.allEntries)
        {
            this.entryMap.set(e.id, e);
        }
    }

    private announce(msg: string): void
    {
        if (!this.liveEl) { return; }
        this.liveEl.textContent = msg;
    }
}

// ============================================================================
// FACTORY & GLOBALS
// ============================================================================

export function createAuditLogViewer(
    options: AuditLogViewerOptions,
    containerId?: string
): AuditLogViewer
{
    const instance = new AuditLogViewer(options);
    if (containerId) { instance.show(containerId); }
    return instance;
}

(window as unknown as Record<string, unknown>).AuditLogViewer = AuditLogViewer;
(window as unknown as Record<string, unknown>).createAuditLogViewer = createAuditLogViewer;
