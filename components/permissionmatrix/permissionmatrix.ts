/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ⚓ COMPONENT: PermissionMatrix
 * 📜 PURPOSE: Interactive Roles x Permissions checkbox grid for RBAC
 *    management. CSS Grid layout, tri-state checkboxes, inheritance resolution,
 *    bulk operations, search/filter, change tracking, sticky headers, export.
 * 🔗 RELATES: [[EnterpriseTheme]], [[CustomComponents]]
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type PermissionState = "granted" | "denied" | "inherited" | "none";

/** The surface channels (readiness step 3). */
type MatrixChannel = "change" | "bulkchange" | "export" | "reset";
export type ExportFormat = "json" | "csv";

/** A role: one column of the matrix. */
export interface Role
{
    /** Unique id, used in cells and changes. */
    id: string;
    /** Column heading. Rendered as text. */
    name: string;
    /** A longer description. Not rendered. */
    description?: string;
    /** The id of a parent role whose granted permissions this one inherits. */
    inheritsFrom?: string;
    /**
     * Accent colour of the column heading, as a hex colour.
     * @pattern ^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$
     */
    color?: string;
    /** Shown but not editable, such as a built-in owner role. */
    readonly?: boolean;
    /** Arbitrary host data for callbacks. Not rendered. */
    data?: unknown;
}

/** A permission: one row of the matrix. */
export interface Permission
{
    /** Unique id, used in cells and changes. */
    id: string;
    /** Row label. Rendered as text. */
    name: string;
    /** A longer description. Not rendered. */
    description?: string;
    /** Arbitrary host data for callbacks. Not rendered. */
    data?: unknown;
}

/** A collapsible group of permission rows, such as Documents or Users. */
export interface PermissionGroup
{
    /** Unique id. */
    id: string;
    /** Group heading. Rendered as text. */
    name: string;
    /** A longer description. Not rendered. */
    description?: string;
    /** The permissions in this group, in order. */
    permissions: Permission[];
    /** Whether the group starts expanded. Default: true. */
    expanded?: boolean;
    /** Bootstrap Icons class shown before the heading, such as "bi-file-earmark". */
    icon?: string;
}

/** The state of one role for one permission. */
export interface MatrixCell
{
    /** The role's id. */
    roleId: string;
    /** The permission's id. */
    permissionId: string;
    /** granted, denied, inherited (from the parent role) or none. */
    state: PermissionState;
}

/** One edited cell: what it was and what the user made it. */
export interface PermissionChange
{
    roleId: string;
    permissionId: string;
    previousState: PermissionState;
    newState: PermissionState;
}

/** Several cells set at once by a bulk control, with each cell's change. */
export interface BulkChange
{
    type: "grant-all-for-role" | "deny-all-for-role"
        | "grant-all-for-permission" | "deny-all-for-permission"
        | "grant-all-in-group" | "deny-all-in-group";
    roleId?: string;
    permissionId?: string;
    groupId?: string;
    changes: PermissionChange[];
}

/** The whole matrix as exported, with the edits not yet saved. */
export interface MatrixExportData
{
    exportedAt: string;
    roles: Role[];
    groups: PermissionGroup[];
    cells: MatrixCell[];
    pendingChanges: PermissionChange[];
}

/** Configuration options for the PermissionMatrix component. */
export interface PermissionMatrixOptions
{
    /** The roles, one column each, in order. */
    roles: Role[];
    /** The permission groups, each with its rows. */
    groups: PermissionGroup[];
    /** The state of each role for each permission; a pair not listed is none. */
    cells: MatrixCell[];
    /** Disables every edit, the bulk controls and Reset. Default: false. */
    readOnly?: boolean;
    /** Shows the filter box above the grid. Default: true. */
    showFilter?: boolean;
    /** Delay in milliseconds between typing in the filter and filtering. Default: 250. */
    filterDebounceMs?: number;
    /** Shows the Export button. Default: true. */
    showExport?: boolean;
    /** Shows the Reset button, which asks the host to discard unsaved edits. Default: true. */
    showReset?: boolean;
    /** Shows how many edits are unsaved. Default: true. */
    showChangeCounter?: boolean;
    /** Declared but not read. */
    showInheritance?: boolean;
    /** Declared but not read. */
    showChangeHighlight?: boolean;
    /** Shows a control per group and role that grants or denies the whole group. Default: true. */
    enableGroupBulk?: boolean;
    /** Declared but not read. */
    enableRoleBulk?: boolean;
    /** Declared but not read. */
    enablePermissionBulk?: boolean;
    /** Declared but not read. */
    stickyHeader?: boolean;
    /** Declared but not read. */
    stickyFirstColumn?: boolean;
    /** CSS height of the component, such as "400px". */
    height?: string;
    /** CSS width of the component, such as "100%". */
    width?: string;
    /** Additional CSS class(es) on the root. */
    cssClass?: string;
    /** Text shown when the filter matches no permission. Default: "No matching permissions". */
    emptyMessage?: string;
    /** Fires when the user edits one cell. */
    onChange?: (change: PermissionChange) => void;
    /** Fires when the user sets several cells with a bulk control. */
    onBulkChange?: (bulkChange: BulkChange) => void;
    /** Fires with the matrix when the user clicks Export; without it the matrix downloads as JSON. */
    onExport?: (data: MatrixExportData, format: ExportFormat) => void;
    /** Fires when the user clicks Reset; the host discards the edits, for example by calling setData. */
    onReset?: () => void;
    /** Renders a cell's content in place of the built-in icon. */
    cellRenderer?: (role: Role, perm: Permission, state: PermissionState) => HTMLElement | null;
    /** Override default key combos. Keys are action names, values are combo strings. */
    keyBindings?: Partial<Record<string, string>>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[PermissionMatrix]";
const _lu = (typeof window.createLogUtility === "function")
    ? window.createLogUtility().getLogger(LOG_PREFIX.slice(1, -1))
    : null;
const LOCAL_HOSTS = /^(localhost|127\.0\.0\.1|\[::1\]|.+\.localhost)$/;
// LOG-6. Read per call, never captured. A const freezes the flag at script
// evaluation, so a console toggle on a live page did nothing. The semantics
// match isGlobalFlagSet in logutility.ts: unset means "decide from the host"
// for debug and "off" for trace. See FRONTEND_LOGGING.md section 1.3.
function _dbg(): boolean
{
    const f = window.__ebt_debug_logging;
    return f === undefined ? LOCAL_HOSTS.test(location.hostname) : !!f;
}
function _trc(): boolean { return !!window.__ebt_trace_logging; }
function logInfo(...a: unknown[]): void
{
    _lu ? _lu.info(...a) : console.log(new Date().toISOString(), "[INFO]", LOG_PREFIX, ...a);
}
function logWarn(...a: unknown[]): void
{
    _lu ? _lu.warn(...a) : console.warn(new Date().toISOString(), "[WARN]", LOG_PREFIX, ...a);
}
function logError(...a: unknown[]): void
{
    _lu ? _lu.error(...a) : console.error(new Date().toISOString(), "[ERROR]", LOG_PREFIX, ...a);
}
function logDebug(...a: unknown[]): void
{
    _lu ? _lu.debug(...a) : _dbg() && console.debug(new Date().toISOString(), "[DEBUG]", LOG_PREFIX, ...a);
}
function logTrace(...a: unknown[]): void
{
    _lu ? _lu.trace(...a) : _trc() && console.debug(new Date().toISOString(), "[TRACE]", LOG_PREFIX, ...a);
}

// LOG-4a DECLARES ALL FIVE SHIMS IN EVERY COMPONENT, used or not, so a
// developer adding a log line never has to wire one up. `noUnusedLocals`
// is on (UNUSED-1), and this reference is what says that uniformity is
// deliberate rather than an oversight. Deleting a shim to silence the
// compiler is the wrong repair: `dynamicVerboseShims` holds the logDebug
// and logTrace population as a floor, and the preamble is the contract
// FRONTEND_LOGGING.md section 1.1 states.
void [logInfo, logWarn, logError, logDebug, logTrace];

const CLS = "permissionmatrix";
const MAX_INHERIT_DEPTH = 20;

const DEFAULT_KEY_BINDINGS: Record<string, string> = {
    "moveUp": "ArrowUp",
    "moveDown": "ArrowDown",
    "moveLeft": "ArrowLeft",
    "moveRight": "ArrowRight",
    "togglePermission": " ",
    "activateToggle": "Enter",
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

/** The export as an agent receives it: the host's role and permission data is host-only (readiness step 3). */
function withoutData(data: MatrixExportData): MatrixExportData
{
    return {
        ...data,
        roles: data.roles.map(({ data: _data, ...role }) => role),
        groups: data.groups.map(g => ({
            ...g,
            permissions: g.permissions.map(({ data: _data, ...perm }) => perm),
        })),
    };
}

function safeCallback<T extends unknown[]>(
    fn: ((...a: T) => void) | undefined,
    ...args: T
): void
{
    if (!fn) { return; }
    try { fn(...args); }
    catch (err) { logError("Callback error:", err); }
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

/**
 * The PermissionMatrix surface a factory caller receives.
 *
 * PAT-1. `implements` below is what keeps this in step with the
 * class: remove a member there and the typecheck fails here. Adding
 * one to the class does NOT add it here, which is the point — a new
 * method is API when somebody writes it into this interface.
 */
export interface PermissionMatrixHandle
{
    show(containerId: string | HTMLElement): void;
    hide(): void;
    destroy(): void;
    getElement(): HTMLElement | null;
    setCellState(roleId: string, permissionId: string, state: PermissionState): void;
    getCellState(roleId: string, permissionId: string): PermissionState;
    getEffectiveState(roleId: string, permissionId: string): PermissionState;
    setData(roles: Role[], groups: PermissionGroup[], cells: MatrixCell[]): void;
    setData(slot: string, value: unknown): void;
    on(channel: string, handler: (payload: unknown) => void): () => void;
    getState(): Record<string, unknown>;
    setState(state: Record<string, unknown>): void;
    getChanges(): PermissionChange[];
    clearChanges(): void;
    expandGroup(groupId: string): void;
    collapseGroup(groupId: string): void;
    expandAllGroups(): void;
    collapseAllGroups(): void;
    setFilter(text: string): void;
    clearFilter(): void;
    exportData(format?: ExportFormat): MatrixExportData;
    setReadOnly(readOnly: boolean): void;
    refresh(): void;
}

export class PermissionMatrix implements PermissionMatrixHandle
{
    // -- Options -------------------------------------------------------------
    private opts: PermissionMatrixOptions;
    private readOnly: boolean;

    // -- Data ----------------------------------------------------------------
    private roles: Role[] = [];
    private groups: PermissionGroup[] = [];
    private stateMap = new Map<string, Map<string, PermissionState>>();
    private originalStateMap = new Map<string, Map<string, PermissionState>>();
    private inheritanceChains = new Map<string, string[]>();
    private pendingChanges = new Map<string, PermissionChange>();
    private expandedGroups = new Set<string>();

    // -- Surface channels (additive, readiness step 3) -------------------------
    private readonly handlers: Record<MatrixChannel, Set<(payload: unknown) => void>> =
        { change: new Set(), bulkchange: new Set(), export: new Set(), reset: new Set() };

    // -- DOM -----------------------------------------------------------------
    private rootEl: HTMLElement | null = null;
    private gridEl: HTMLElement | null = null;
    private counterEl: HTMLElement | null = null;
    private resetBtnEl: HTMLElement | null = null;
    private filterInputEl: HTMLInputElement | null = null;
    private liveEl: HTMLElement | null = null;

    // -- State ---------------------------------------------------------------
    private destroyed = false;
    private filterText = "";
    private focusedRow = 0;
    private focusedCol = 0;
    private debouncedFilter: (...args: unknown[]) => void;

    // ========================================================================
    // CONSTRUCTOR
    // ========================================================================

    constructor(options: PermissionMatrixOptions)
    {
        this.opts = options;
        this.readOnly = options.readOnly === true;
        this.roles = [...options.roles];
        this.groups = options.groups.map(g => ({ ...g, permissions: [...g.permissions] }));
        this.debouncedFilter = debounce(
            () => this.applyFilter(), options.filterDebounceMs ?? 250
        );

        this.buildStateMaps(options.cells);
        this.buildInheritanceChains();

        // Init expanded state
        for (const g of this.groups)
        {
            if (g.expanded !== false) { this.expandedGroups.add(g.id); }
        }

        this.rootEl = this.buildRoot();

        const totalPerms = this.groups.reduce(
            (sum, g) => sum + g.permissions.length, 0
        );
        logInfo(`Initialised with ${this.roles.length} roles, ${totalPerms} permissions in ${this.groups.length} groups`);
    }

    // ========================================================================
    // LIFECYCLE
    // ========================================================================

    show(containerId: string | HTMLElement): void
    {
        if (this.destroyed) { return; }
        const container = typeof containerId === "string"
            ? document.getElementById(containerId) : containerId;
        if (!container)
        {
            // ERR-1. This logged and carried on, so the caller got a
            // handle to a component that was never mounted.
            throw new Error(
                `${LOG_PREFIX} Container "${containerId}" was not found. `
                + "Insert the element before showing it.");
        }
        container.appendChild(this.rootEl!);
    }

    hide(): void
    {
        if (this.destroyed) { return; }
        this.rootEl?.parentElement?.removeChild(this.rootEl);
    }

    destroy(): void
    {
        if (this.destroyed) { return; }
        this.destroyed = true;
        this.rootEl?.parentElement?.removeChild(this.rootEl);
        this.rootEl = null;
        this.gridEl = null;
        this.counterEl = null;
        this.resetBtnEl = null;
        this.filterInputEl = null;
        this.liveEl = null;
        this.stateMap.clear();
        this.originalStateMap.clear();
        this.inheritanceChains.clear();
        this.pendingChanges.clear();
        Object.values(this.handlers).forEach((set) => set.clear());
        logInfo("Destroyed");
    }

    getElement(): HTMLElement | null { return this.rootEl; }

    // ========================================================================
    // PUBLIC API
    // ========================================================================

    setCellState(
        roleId: string,
        permissionId: string,
        state: PermissionState
    ): void
    {
        const prev = this.getExplicitState(roleId, permissionId);
        this.setStateInternal(roleId, permissionId, state);
        this.trackChange(roleId, permissionId, prev, state);
        this.refreshCellEl(roleId, permissionId);
        this.updateCounter();
    }

    getCellState(roleId: string, permissionId: string): PermissionState
    {
        return this.getExplicitState(roleId, permissionId);
    }

    getEffectiveState(roleId: string, permissionId: string): PermissionState
    {
        return this.resolveEffective(roleId, permissionId);
    }

    /**
     * Replaces the roles, groups and cells together, clearing pending
     * changes; or, with a slot name, one of them (readiness step 3):
     * "roles" and "groups" keep the cells and pending changes, and "cells"
     * is a new baseline, so it clears them. Fires nothing.
     */
    setData(roles: Role[], groups: PermissionGroup[], cells: MatrixCell[]): void;
    setData(slot: string, value: unknown): void;
    setData(
        first: Role[] | string,
        second: PermissionGroup[] | unknown,
        cells?: MatrixCell[]
    ): void
    {
        if (typeof first === "string")
        {
            this.setSlot(first, second);
            return;
        }

        this.roles = [...first];
        this.groups = (second as PermissionGroup[]).map(g => ({ ...g, permissions: [...g.permissions] }));
        this.buildStateMaps(cells as MatrixCell[]);
        this.buildInheritanceChains();
        this.pendingChanges.clear();
        this.renderGrid();
        this.updateCounter();
    }

    /** Replaces one slot in place; see setData. */
    private setSlot(slot: string, value: unknown): void
    {
        if (slot === "roles")
        {
            this.roles = [...(value as Role[])];
            this.buildInheritanceChains();
        }
        else if (slot === "groups")
        {
            const known = new Set(this.groups.map(g => g.id));

            this.groups = (value as PermissionGroup[]).map(g => ({ ...g, permissions: [...g.permissions] }));
            this.groups.filter(g => !known.has(g.id) && g.expanded !== false)
                .forEach(g => this.expandedGroups.add(g.id));
        }
        else if (slot === "cells")
        {
            this.buildStateMaps(value as MatrixCell[]);
            this.pendingChanges.clear();
        }
        else
        {
            throw new Error(`${LOG_PREFIX} setData("${slot}"): the slots are "roles", "groups" and "cells".`);
        }

        this.renderGrid();
        this.updateCounter();
    }

    /** Subscribes to "change", "bulkchange", "export" or "reset"; returns the unsubscribe. */
    on(channel: string, handler: (payload: unknown) => void): () => void
    {
        if (!(channel in this.handlers))
        {
            throw new Error(`${LOG_PREFIX} on("${channel}"): the valid channels are "change", "bulkchange", `
                + "\"export\" and \"reset\".");
        }

        this.handlers[channel as MatrixChannel].add(handler);

        return () => { this.handlers[channel as MatrixChannel].delete(handler); };
    }

    /** The user's unsaved edits, the expanded groups and the filter text. */
    getState(): Record<string, unknown>
    {
        return {
            changes: this.getChanges(),
            expandedGroups: [...this.expandedGroups],
            filter: this.filterText,
        };
    }

    /**
     * Restores state captured by getState(), or any subset of it, firing
     * nothing: the edits are re-applied over the baseline cells.
     */
    setState(state: Record<string, unknown>): void
    {
        if (Array.isArray(state.changes))
        {
            this.revertToOriginal();

            for (const c of state.changes as PermissionChange[])
            {
                this.setStateInternal(c.roleId, c.permissionId, c.newState);
                this.trackChange(c.roleId, c.permissionId, c.previousState, c.newState);
            }
        }

        if (Array.isArray(state.expandedGroups))
        {
            this.expandedGroups = new Set(state.expandedGroups as string[]);
        }

        this.renderGrid();
        this.updateCounter();

        if (typeof state.filter === "string") { this.setFilter(state.filter); }
    }

    /** Puts every cell back to its baseline and drops the pending changes. */
    private revertToOriginal(): void
    {
        this.stateMap.clear();

        for (const [roleId, perms] of this.originalStateMap)
        {
            this.stateMap.set(roleId, new Map(perms));
        }

        this.pendingChanges.clear();
    }

    /** Calls every handler on a channel with a JSON copy, isolating each so one throw cannot starve the rest. */
    private emit(channel: MatrixChannel, payload: unknown): void
    {
        const copy = JSON.parse(JSON.stringify(payload)) as unknown;

        for (const handler of this.handlers[channel])
        {
            try
            {
                handler(copy);
            }
            catch (err)
            {
                logError(`Channel "${channel}" handler threw:`, err);
            }
        }
    }

    getChanges(): PermissionChange[]
    {
        return [...this.pendingChanges.values()];
    }

    clearChanges(): void
    {
        this.pendingChanges.clear();
        this.cloneStateToOriginal();
        this.renderGrid();
        this.updateCounter();
    }

    expandGroup(groupId: string): void
    {
        this.expandedGroups.add(groupId);
        this.toggleGroupVisibility();
        this.announce(`${this.getGroupName(groupId)} expanded`);
    }

    collapseGroup(groupId: string): void
    {
        this.expandedGroups.delete(groupId);
        this.toggleGroupVisibility();
        this.announce(`${this.getGroupName(groupId)} collapsed`);
    }

    expandAllGroups(): void
    {
        this.groups.forEach(g => this.expandGroup(g.id));
    }

    collapseAllGroups(): void
    {
        this.groups.forEach(g => this.collapseGroup(g.id));
    }

    setFilter(text: string): void
    {
        this.filterText = text;
        if (this.filterInputEl) { this.filterInputEl.value = text; }
        this.applyFilter();
    }

    clearFilter(): void { this.setFilter(""); }

    exportData(format: ExportFormat = "json"): MatrixExportData
    {
        // `format` WAS ACCEPTED AND IGNORED. `ExportFormat` publishes
        // `"json" | "csv"` and there is no CSV serialiser anywhere in
        // this component: `onExportClick` hard-codes "json" and this
        // method returned the same structured object whatever it was
        // handed. The compiler had been reporting the parameter as
        // unread since it was written (UNUSED-1), and a caller asking
        // for CSV got JSON and no indication.
        //
        // ADR-200: a request the caller NAMED is owed either the
        // effect or an error. CSV is an honest gap, so this says so.
        if (format !== "json")
        {
            throw new Error(
                `${LOG_PREFIX} exportData("${format}") is not implemented. `
                + "This component serialises JSON only. Build the CSV from "
                + "the returned MatrixExportData, or export JSON.");
        }

        const cells = this.getAllCells();
        const data: MatrixExportData = {
            exportedAt: new Date().toISOString(),
            roles: this.roles,
            groups: this.groups,
            cells,
            pendingChanges: this.getChanges(),
        };
        return data;
    }

    setReadOnly(readOnly: boolean): void
    {
        this.readOnly = readOnly;
        this.renderGrid();
    }

    refresh(): void { this.renderGrid(); }

    // ========================================================================
    // BUILD — ROOT
    // ========================================================================

    private buildRoot(): HTMLElement
    {
        const root = createElement("div", CLS);
        if (this.opts.cssClass) { root.classList.add(...this.opts.cssClass.split(" ")); }
        if (this.opts.height) { root.style.height = this.opts.height; }
        if (this.opts.width) { root.style.width = this.opts.width; }

        root.appendChild(this.buildToolbar());

        this.gridEl = this.buildGrid();
        root.appendChild(this.gridEl);

        this.liveEl = createElement("div", `${CLS}-sr-live visually-hidden`);
        setAttr(this.liveEl, "aria-live", "polite");
        setAttr(this.liveEl, "aria-atomic", "true");
        root.appendChild(this.liveEl);

        return root;
    }

    // ========================================================================
    // BUILD — TOOLBAR
    // ========================================================================

    private buildToolbar(): HTMLElement
    {
        const bar = createElement("div", `${CLS}-toolbar`);
        setAttr(bar, "role", "toolbar");
        setAttr(bar, "aria-label", "Permission matrix actions");

        if (this.opts.showFilter !== false)
        {
            bar.appendChild(this.buildFilterInput());
        }

        const actions = createElement("div", `${CLS}-toolbar-actions`);

        if (this.opts.showExport !== false)
        {
            actions.appendChild(this.buildExportBtn());
        }
        if (this.opts.showReset !== false && !this.readOnly)
        {
            actions.appendChild(this.buildResetBtn());
        }
        if (this.opts.showChangeCounter !== false && !this.readOnly)
        {
            this.counterEl = createElement("span", `${CLS}-change-counter`);
            setAttr(this.counterEl, "aria-live", "polite");
            setAttr(this.counterEl, "aria-label", "0 pending changes");
            actions.appendChild(this.counterEl);
        }

        bar.appendChild(actions);
        return bar;
    }

    private buildFilterInput(): HTMLElement
    {
        const wrap = createElement("div", `${CLS}-filter`);
        const input = document.createElement("input") as HTMLInputElement;
        input.className = `${CLS}-filter-input`;
        input.type = "text";
        input.placeholder = "Filter permissions...";
        setAttr(input, "role", "searchbox");
        setAttr(input, "aria-label", "Filter permissions");
        input.addEventListener("input", () =>
        {
            logTrace("input handler");
            this.filterText = input.value;
            this.debouncedFilter();
        });
        input.addEventListener("keydown", (e) =>
        {
            logTrace("keydown handler");
            if (this.matchesKeyCombo(e, "escape"))
            {
                input.value = "";
                this.filterText = "";
                this.applyFilter();
            }
        });
        this.filterInputEl = input;
        wrap.appendChild(input);
        return wrap;
    }

    private buildExportBtn(): HTMLElement
    {
        const btn = createElement("button", `${CLS}-export-btn`);
        setAttr(btn, "type", "button");
        setAttr(btn, "aria-label", "Export permission matrix");
        const icon = createElement("i", "bi bi-download");
        setAttr(icon, "aria-hidden", "true");
        btn.appendChild(icon);
        btn.appendChild(document.createTextNode(" Export"));
        btn.addEventListener("click", () => this.onExportClick());
        return btn;
    }

    private buildResetBtn(): HTMLElement
    {
        const btn = createElement("button", `${CLS}-reset-btn`);
        setAttr(btn, "type", "button");
        setAttr(btn, "aria-label", "Reset changes");
        const icon = createElement("i", "bi bi-arrow-counterclockwise");
        setAttr(icon, "aria-hidden", "true");
        btn.appendChild(icon);
        btn.appendChild(document.createTextNode(" Reset"));
        (btn as HTMLButtonElement).disabled = true;
        btn.addEventListener("click", () =>
        {
            safeCallback(this.opts.onReset);
            this.emit("reset", this.pendingChanges.size);
            this.announce("All changes reset");
        });
        this.resetBtnEl = btn;
        return btn;
    }

    // ========================================================================
    // BUILD — GRID
    // ========================================================================

    private buildGrid(): HTMLElement
    {
        const grid = createElement("div", `${CLS}-grid`);
        // Canvas anchors name this region rather than counting it (ADR-162).
        grid.setAttribute("data-dui-region", "permissionmatrix:grid");
        setAttr(grid, "role", "grid");
        setAttr(grid, "aria-label", "Permission matrix");
        if (this.readOnly)
        {
            setAttr(grid, "aria-readonly", "true");
        }

        grid.style.setProperty("--pm-role-count", String(this.roles.length));
        grid.addEventListener("click", (e) => this.onGridClick(e));
        grid.addEventListener("keydown", (e) => this.onGridKeydown(e));

        this.renderGridContent(grid);
        return grid;
    }

    private renderGrid(): void
    {
        if (!this.gridEl) { return; }
        this.gridEl.textContent = "";
        this.renderGridContent(this.gridEl);
    }

    private renderGridContent(grid: HTMLElement): void
    {
        grid.appendChild(this.buildHeaderRow());

        for (const group of this.groups)
        {
            grid.appendChild(this.buildGroupHeader(group));

            if (this.expandedGroups.has(group.id))
            {
                for (const perm of group.permissions)
                {
                    if (this.matchesFilter(perm))
                    {
                        grid.appendChild(this.buildPermissionRow(perm, group.id));
                    }
                }
            }
        }

        if (this.filterText && !this.hasVisiblePermissions())
        {
            const empty = createElement("div", `${CLS}-empty`);
            empty.textContent = this.opts.emptyMessage ?? "No matching permissions";
            grid.appendChild(empty);
        }

        this.applyRovingTabindex(grid);
    }

    /**
     * Gives exactly one cell `tabindex="0"` so the grid can be TABBED
     * INTO.
     *
     * (CRITICAL) EVERY CELL WAS BUILT WITH -1 AND NOTHING EVER SET A
     * ZERO. A user tabbing through the page skipped the whole matrix,
     * and because `onGridKeydown` only fires on a focused cell the
     * arrow navigation underneath it was unreachable too — a grid
     * with a complete roving-tabindex implementation and no way in.
     *
     * `focusedRow` and `focusedCol` are the state that was meant to
     * drive it. Both were initialised to 0, written nowhere and read
     * nowhere, and the compiler had been reporting them as unused
     * since they were declared (UNUSED-1). `moveCellFocus` keeps them
     * in step now, so a re-render puts the entry point back where the
     * user left it rather than at the top-left.
     *
     * One owner for the invariant, rather than a rule spread across
     * `buildPermCell`: "exactly one" is not a property any single
     * cell can know.
     */
    private applyRovingTabindex(grid: HTMLElement): void
    {
        const rows = grid.querySelectorAll(`.${CLS}-row`);
        const row = rows[Math.min(this.focusedRow, rows.length - 1)];
        if (!row) { return; }

        const cells = row.querySelectorAll(`.${CLS}-cell`);
        const cell = cells[Math.min(this.focusedCol, cells.length - 1)];
        if (!cell) { return; }

        cell.setAttribute("tabindex", "0");
    }

    // ========================================================================
    // BUILD — HEADER ROW
    // ========================================================================

    private buildHeaderRow(): HTMLElement
    {
        const row = createElement("div", `${CLS}-header-row`);
        setAttr(row, "role", "row");

        // Corner cell
        const corner = createElement("div", `${CLS}-corner-cell`);
        row.appendChild(corner);

        for (const role of this.roles)
        {
            row.appendChild(this.buildRoleHeader(role));
        }
        return row;
    }

    private buildRoleHeader(role: Role): HTMLElement
    {
        const cell = createElement("div", `${CLS}-role-header`);
        setAttr(cell, "role", "columnheader");
        setAttr(cell, "aria-label", role.name);

        if (role.color)
        {
            cell.style.borderTopColor = role.color;
        }

        const name = createElement("span", `${CLS}-role-name`);
        name.textContent = role.name;
        cell.appendChild(name);

        if (role.inheritsFrom)
        {
            const parent = this.roles.find(r => r.id === role.inheritsFrom);
            if (parent)
            {
                const desc = createElement("span", `${CLS}-role-desc`);
                desc.textContent = `inherits ${parent.name}`;
                cell.appendChild(desc);
            }
        }

        return cell;
    }

    // ========================================================================
    // BUILD — GROUP HEADER
    // ========================================================================

    private buildGroupHeader(group: PermissionGroup): HTMLElement
    {
        const row = createElement("div", `${CLS}-group-header`);
        setAttr(row, "role", "row");
        setAttr(row, "data-group-id", group.id);
        const expanded = this.expandedGroups.has(group.id);
        setAttr(row, "aria-expanded", String(expanded));

        // Toggle + name cell
        const label = createElement("div", `${CLS}-group-label`);
        const toggle = createElement("button", `${CLS}-group-toggle`);
        setAttr(toggle, "type", "button");
        setAttr(toggle, "aria-label",
            `${expanded ? "Collapse" : "Expand"} ${group.name}`);
        const chevron = createElement("i",
            `bi bi-chevron-right ${CLS}-group-chevron`);
        if (expanded) { chevron.classList.add(`${CLS}-group-chevron-open`); }
        setAttr(chevron, "aria-hidden", "true");
        toggle.appendChild(chevron);
        label.appendChild(toggle);

        if (group.icon)
        {
            const icon = createElement("i", `bi ${group.icon}`);
            setAttr(icon, "aria-hidden", "true");
            label.appendChild(icon);
        }

        const nameEl = createElement("span", `${CLS}-group-name`);
        nameEl.textContent = group.name;
        label.appendChild(nameEl);
        row.appendChild(label);

        // Bulk cells per role in group header
        if (this.opts.enableGroupBulk !== false && !this.readOnly)
        {
            for (const role of this.roles)
            {
                row.appendChild(this.buildGroupBulkCell(group, role));
            }
        }

        return row;
    }

    private buildGroupBulkCell(
        group: PermissionGroup,
        role: Role
    ): HTMLElement
    {
        const cell = createElement("div", `${CLS}-group-bulk-cell`);
        if (role.readonly) { return cell; }

        const agg = this.aggregateGroupState(group, role.id);
        const btn = this.buildCheckboxBtn(agg, true);
        setAttr(btn, "aria-label",
            `Toggle all ${group.name} for ${role.name}`);
        setAttr(btn, "data-bulk", "group");
        setAttr(btn, "data-group-id", group.id);
        setAttr(btn, "data-role-id", role.id);
        cell.appendChild(btn);
        return cell;
    }

    // ========================================================================
    // BUILD — PERMISSION ROW
    // ========================================================================

    private buildPermissionRow(perm: Permission, groupId: string): HTMLElement
    {
        const row = createElement("div", `${CLS}-row`);
        setAttr(row, "role", "row");
        setAttr(row, "data-perm-id", perm.id);
        setAttr(row, "data-group-id", groupId);

        // Permission label (sticky left)
        const label = createElement("div", `${CLS}-permission-label`);
        setAttr(label, "role", "rowheader");
        setAttr(label, "aria-label", perm.name);
        const nameEl = this.buildPermLabel(perm);
        label.appendChild(nameEl);
        row.appendChild(label);

        // Cells per role
        for (const role of this.roles)
        {
            row.appendChild(this.buildPermCell(perm, role));
        }

        return row;
    }

    private buildPermLabel(perm: Permission): HTMLElement
    {
        const el = createElement("span", `${CLS}-permission-name`);

        if (this.filterText)
        {
            this.highlightLabel(el, perm.name, this.filterText);
        }
        else
        {
            el.textContent = perm.name;
        }
        return el;
    }

    // ========================================================================
    // BUILD — CELL & CHECKBOX
    // ========================================================================

    private buildPermCell(perm: Permission, role: Role): HTMLElement
    {
        const cell = createElement("div", `${CLS}-cell`);
        setAttr(cell, "role", "gridcell");
        setAttr(cell, "data-perm-id", perm.id);
        setAttr(cell, "data-role-id", role.id);
        setAttr(cell, "tabindex", "-1");

        const effective = this.resolveEffective(role.id, perm.id);
        cell.classList.add(`${CLS}-cell-${effective}`);

        if (this.isCellChanged(role.id, perm.id))
        {
            cell.classList.add(`${CLS}-cell-changed`);
        }

        const isDisabled = this.readOnly || role.readonly === true;
        if (isDisabled) { cell.classList.add(`${CLS}-cell-readonly`); }

        // Custom renderer
        if (this.opts.cellRenderer)
        {
            const custom = this.opts.cellRenderer(role, perm, effective);
            if (custom) { cell.appendChild(custom); return cell; }
        }

        const btn = this.buildCheckboxBtn(effective, false);
        setAttr(btn, "aria-label",
            `${perm.name} for ${role.name}: ${effective}`);
        if (isDisabled)
        {
            setAttr(btn, "aria-disabled", "true");
        }
        cell.appendChild(btn);
        return cell;
    }

    private buildCheckboxBtn(
        state: PermissionState,
        isBulk: boolean
    ): HTMLElement
    {
        const btn = createElement("button", `${CLS}-checkbox`);
        setAttr(btn, "type", "button");
        setAttr(btn, "role", "checkbox");

        const iconMap: Record<string, string> = {
            granted:     "bi-check-square-fill",
            denied:      "bi-square",
            inherited:   "bi-check-square",
            none:        "bi-square",
        };

        const ariaMap: Record<string, string> = {
            granted:   "true",
            denied:    "false",
            inherited: "mixed",
            none:      "false",
        };

        if (isBulk && state === "none")
        {
            // indeterminate: assume mixed
        }

        setAttr(btn, "aria-checked", ariaMap[state] ?? "false");
        btn.classList.add(`${CLS}-checkbox-${state}`);

        const i = createElement("i", `bi ${iconMap[state] ?? "bi-square"}`);
        setAttr(i, "aria-hidden", "true");
        btn.appendChild(i);
        return btn;
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
    // EVENTS
    // ========================================================================

    private onGridClick(e: Event): void
    {
        const target = e.target as HTMLElement;

        // Group toggle
        const toggle = target.closest(`.${CLS}-group-toggle`);
        if (toggle)
        {
            const groupRow = toggle.closest(`.${CLS}-group-header`);
            if (groupRow)
            {
                const gid = groupRow.getAttribute("data-group-id")!;
                if (this.expandedGroups.has(gid))
                {
                    this.collapseGroup(gid);
                }
                else
                {
                    this.expandGroup(gid);
                }
            }
            return;
        }

        // Bulk group checkbox
        const bulkBtn = target.closest(`[data-bulk="group"]`);
        if (bulkBtn)
        {
            const gid = bulkBtn.getAttribute("data-group-id")!;
            const rid = bulkBtn.getAttribute("data-role-id")!;
            this.bulkToggleGroup(gid, rid);
            return;
        }

        // Cell checkbox
        const cell = target.closest(`.${CLS}-cell`);
        if (cell)
        {
            this.onCellClick(cell as HTMLElement);
        }
    }

    private onCellClick(cell: HTMLElement): void
    {
        if (this.readOnly) { return; }
        const permId = cell.getAttribute("data-perm-id");
        const roleId = cell.getAttribute("data-role-id");
        if (!permId || !roleId) { return; }

        const role = this.roles.find(r => r.id === roleId);
        if (role?.readonly) { return; }

        const current = this.resolveEffective(roleId, permId);
        const next = this.nextState(current);
        const prev = this.getExplicitState(roleId, permId);

        this.setStateInternal(roleId, permId, next === "inherited" ? "none" : next);
        this.trackChange(roleId, permId, prev, next === "inherited" ? "none" : next);
        this.refreshCellEl(roleId, permId);
        this.updateCounter();

        const permName = this.getPermName(permId);
        const roleName = role?.name ?? roleId;
        const change: PermissionChange = {
            roleId, permissionId: permId,
            previousState: prev, newState: next
        };
        safeCallback(this.opts.onChange, change);
        this.emit("change", change);
        this.announce(
            `${permName} for ${roleName} changed to ${next}`
        );
    }

    private onGridKeydown(e: KeyboardEvent): void
    {
        logTrace("keydown handler:", { key: e.key.length > 1 ? e.key : "(char)", ctrl: e.ctrlKey });
        const target = e.target as HTMLElement;

        if (target.classList.contains(`${CLS}-group-toggle`))
        {
            if (this.matchesKeyCombo(e, "activateToggle")
                || this.matchesKeyCombo(e, "togglePermission"))
            {
                e.preventDefault();
                target.click();
            }
            return;
        }

        const cell = target.closest(`.${CLS}-cell`);
        if (!cell) { return; }

        if (this.matchesKeyCombo(e, "togglePermission")
            || this.matchesKeyCombo(e, "activateToggle"))
        {
            e.preventDefault();
            this.onCellClick(cell as HTMLElement);
        }
        else if (this.matchesKeyCombo(e, "moveRight"))
        {
            e.preventDefault();
            this.moveCellFocus(cell as HTMLElement, 0, 1);
        }
        else if (this.matchesKeyCombo(e, "moveLeft"))
        {
            e.preventDefault();
            this.moveCellFocus(cell as HTMLElement, 0, -1);
        }
        else if (this.matchesKeyCombo(e, "moveDown"))
        {
            e.preventDefault();
            this.moveCellFocus(cell as HTMLElement, 1, 0);
        }
        else if (this.matchesKeyCombo(e, "moveUp"))
        {
            e.preventDefault();
            this.moveCellFocus(cell as HTMLElement, -1, 0);
        }
    }

    // ========================================================================
    // CELL FOCUS NAVIGATION
    // ========================================================================

    private moveCellFocus(
        current: HTMLElement,
        dRow: number,
        dCol: number
    ): void
    {
        if (!this.gridEl) { return; }
        const rows = this.gridEl.querySelectorAll(`.${CLS}-row`);
        const rowArr = Array.from(rows);
        const currentRow = current.closest(`.${CLS}-row`);
        if (!currentRow) { return; }

        const ri = rowArr.indexOf(currentRow as HTMLElement);
        const cells = currentRow.querySelectorAll(`.${CLS}-cell`);
        const ci = Array.from(cells).indexOf(current);

        const newRi = ri + dRow;
        const newCi = ci + dCol;
        if (newRi < 0 || newRi >= rowArr.length) { return; }
        if (newCi < 0 || newCi >= this.roles.length) { return; }

        const newRow = rowArr[newRi];
        const newCells = newRow.querySelectorAll(`.${CLS}-cell`);
        if (newCi >= newCells.length) { return; }

        current.setAttribute("tabindex", "-1");
        const target = newCells[newCi] as HTMLElement;
        target.setAttribute("tabindex", "0");
        target.focus();

        // So a re-render restores the entry point where the user
        // left it. See applyRovingTabindex.
        this.focusedRow = newRi;
        this.focusedCol = newCi;
    }

    // ========================================================================
    // STATE MANAGEMENT
    // ========================================================================

    private nextState(current: PermissionState): PermissionState
    {
        if (current === "inherited")
        {
            return "granted";
        }
        const cycle: Record<string, PermissionState> = {
            none: "granted",
            granted: "denied",
            denied: "none",
        };
        return cycle[current] ?? "granted";
    }

    private getExplicitState(
        roleId: string,
        permId: string
    ): PermissionState
    {
        return this.stateMap.get(roleId)?.get(permId) ?? "none";
    }

    private setStateInternal(
        roleId: string,
        permId: string,
        state: PermissionState
    ): void
    {
        if (!this.stateMap.has(roleId))
        {
            this.stateMap.set(roleId, new Map());
        }
        this.stateMap.get(roleId)!.set(permId, state);
    }

    private resolveEffective(
        roleId: string,
        permId: string
    ): PermissionState
    {
        const explicit = this.getExplicitState(roleId, permId);
        if (explicit === "granted" || explicit === "denied")
        {
            return explicit;
        }
        const chain = this.inheritanceChains.get(roleId);
        if (!chain) { return "none"; }

        for (const ancestorId of chain)
        {
            const ancestorState = this.stateMap.get(ancestorId)?.get(permId);
            if (ancestorState === "granted") { return "inherited"; }
        }
        return "none";
    }

    // ========================================================================
    // INHERITANCE
    // ========================================================================

    private buildInheritanceChains(): void
    {
        this.inheritanceChains.clear();
        for (const role of this.roles)
        {
            if (role.inheritsFrom)
            {
                const chain = this.resolveChain(role.id);
                this.inheritanceChains.set(role.id, chain);
            }
        }
    }

    private resolveChain(roleId: string): string[]
    {
        const chain: string[] = [];
        const visited = new Set<string>();
        let current = this.roles.find(r => r.id === roleId);

        while (current?.inheritsFrom && chain.length < MAX_INHERIT_DEPTH)
        {
            if (visited.has(current.inheritsFrom))
            {
                logWarn(`Circular inheritance detected: ${[...visited, current.inheritsFrom].join(" -> ")}`);
                break;
            }
            visited.add(current.inheritsFrom);
            chain.push(current.inheritsFrom);
            current = this.roles.find(r => r.id === current!.inheritsFrom);
        }
        return chain;
    }

    // ========================================================================
    // CHANGE TRACKING
    // ========================================================================

    private trackChange(
        roleId: string,
        permId: string,
        prev: PermissionState,
        next: PermissionState
    ): void
    {
        const key = `${roleId}:${permId}`;
        const original = this.originalStateMap.get(roleId)?.get(permId) ?? "none";

        if (next === original)
        {
            this.pendingChanges.delete(key);
        }
        else
        {
            this.pendingChanges.set(key, {
                roleId,
                permissionId: permId,
                previousState: prev,
                newState: next
            });
        }
    }

    private isCellChanged(roleId: string, permId: string): boolean
    {
        return this.pendingChanges.has(`${roleId}:${permId}`);
    }

    private updateCounter(): void
    {
        const count = this.pendingChanges.size;
        if (this.counterEl)
        {
            this.counterEl.textContent = count > 0 ? `${count} changes` : "";
            setAttr(this.counterEl, "aria-label", `${count} pending changes`);
        }
        if (this.resetBtnEl)
        {
            (this.resetBtnEl as HTMLButtonElement).disabled = count === 0;
        }
    }

    // ========================================================================
    // BULK OPERATIONS
    // ========================================================================

    private bulkToggleGroup(groupId: string, roleId: string): void
    {
        const group = this.groups.find(g => g.id === groupId);
        const role = this.roles.find(r => r.id === roleId);
        if (!group || !role || role.readonly) { return; }

        const agg = this.aggregateGroupState(group, roleId);
        const target: PermissionState = (agg === "granted") ? "denied" : "granted";
        const changes: PermissionChange[] = [];

        for (const perm of group.permissions)
        {
            const eff = this.resolveEffective(roleId, perm.id);
            if (eff === "inherited") { continue; }
            const prev = this.getExplicitState(roleId, perm.id);
            if (prev === target) { continue; }

            this.setStateInternal(roleId, perm.id, target);
            this.trackChange(roleId, perm.id, prev, target);
            changes.push({
                roleId,
                permissionId: perm.id,
                previousState: prev,
                newState: target
            });
        }

        this.renderGrid();
        this.updateCounter();
        const bulk: BulkChange = {
            type: target === "granted" ? "grant-all-in-group" : "deny-all-in-group",
            roleId,
            groupId,
            changes
        };
        safeCallback(this.opts.onBulkChange, bulk);
        this.emit("bulkchange", bulk);
        this.announce(
            `All ${group.name} permissions for ${role.name} set to ${target}`
        );
    }

    private aggregateGroupState(
        group: PermissionGroup,
        roleId: string
    ): PermissionState
    {
        let allGranted = true;
        let allDenied = true;

        for (const perm of group.permissions)
        {
            const eff = this.resolveEffective(roleId, perm.id);
            if (eff !== "granted" && eff !== "inherited") { allGranted = false; }
            if (eff === "granted" || eff === "inherited") { allDenied = false; }
        }

        if (allGranted) { return "granted"; }
        if (allDenied) { return "denied"; }
        return "none"; // mixed -> shows as indeterminate
    }

    // ========================================================================
    // FILTER
    // ========================================================================

    private applyFilter(): void
    {
        this.renderGrid();
        const count = this.countVisiblePermissions();
        if (this.filterText)
        {
            this.announce(`${count} permissions match filter`);
        }
        else
        {
            this.announce(`Filter cleared, showing all permissions`);
        }
    }

    private matchesFilter(perm: Permission): boolean
    {
        if (!this.filterText) { return true; }
        return perm.name.toLowerCase().includes(
            this.filterText.toLowerCase()
        );
    }

    private hasVisiblePermissions(): boolean
    {
        return this.countVisiblePermissions() > 0;
    }

    private countVisiblePermissions(): number
    {
        let count = 0;
        for (const group of this.groups)
        {
            for (const perm of group.permissions)
            {
                if (this.matchesFilter(perm)) { count++; }
            }
        }
        return count;
    }

    private highlightLabel(
        el: HTMLElement,
        text: string,
        search: string
    ): void
    {
        const lower = text.toLowerCase();
        const idx = lower.indexOf(search.toLowerCase());

        if (idx === -1)
        {
            el.textContent = text;
            return;
        }

        const before = text.substring(0, idx);
        const match = text.substring(idx, idx + search.length);
        const after = text.substring(idx + search.length);

        if (before) { el.appendChild(document.createTextNode(before)); }

        const mark = createElement("mark", `${CLS}-highlight`);
        mark.textContent = match;
        el.appendChild(mark);

        if (after) { el.appendChild(document.createTextNode(after)); }
    }

    // ========================================================================
    // GROUP TOGGLE
    // ========================================================================

    // THE PARAMETERS WENT ON 2026-10-21 (UNUSED-1). Both callers
    // update `expandedGroups` and then call this, so the group and
    // its new state are already in the model a full re-render reads.
    private toggleGroupVisibility(): void
    {
        this.renderGrid();
    }

    // ========================================================================
    // CELL REFRESH
    // ========================================================================

    private refreshCellEl(roleId: string, permId: string): void
    {
        if (!this.gridEl) { return; }
        const cell = this.gridEl.querySelector(
            `.${CLS}-cell[data-role-id="${roleId}"][data-perm-id="${permId}"]`
        );
        if (!cell) { return; }

        const perm = this.findPermission(permId);
        const role = this.roles.find(r => r.id === roleId);
        if (!perm || !role) { return; }

        const newCell = this.buildPermCell(perm, role);
        newCell.setAttribute("tabindex", cell.getAttribute("tabindex") ?? "-1");
        cell.replaceWith(newCell);
    }

    // ========================================================================
    // EXPORT
    // ========================================================================

    private onExportClick(): void
    {
        const data = this.exportData("json");
        if (this.opts.onExport)
        {
            safeCallback(this.opts.onExport, data, "json");
        }
        else
        {
            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: "application/json;charset=utf-8" });
            downloadBlob(blob, "permission-matrix.json");
        }
        this.emit("export", withoutData(data));
        logInfo("Exported matrix as JSON");
        this.announce("Permission matrix exported");
    }

    // ========================================================================
    // INTERNAL HELPERS
    // ========================================================================

    private buildStateMaps(cells: MatrixCell[]): void
    {
        this.stateMap.clear();
        for (const cell of cells)
        {
            if (!this.stateMap.has(cell.roleId))
            {
                this.stateMap.set(cell.roleId, new Map());
            }
            this.stateMap.get(cell.roleId)!.set(cell.permissionId, cell.state);
        }
        this.cloneStateToOriginal();
    }

    private cloneStateToOriginal(): void
    {
        this.originalStateMap.clear();
        for (const [roleId, perms] of this.stateMap)
        {
            this.originalStateMap.set(roleId, new Map(perms));
        }
    }

    private getAllCells(): MatrixCell[]
    {
        const cells: MatrixCell[] = [];
        for (const [roleId, perms] of this.stateMap)
        {
            for (const [permId, state] of perms)
            {
                cells.push({ roleId, permissionId: permId, state });
            }
        }
        return cells;
    }

    private findPermission(permId: string): Permission | undefined
    {
        for (const g of this.groups)
        {
            const p = g.permissions.find(p => p.id === permId);
            if (p) { return p; }
        }
        return undefined;
    }

    private getPermName(permId: string): string
    {
        return this.findPermission(permId)?.name ?? permId;
    }

    private getGroupName(groupId: string): string
    {
        return this.groups.find(g => g.id === groupId)?.name ?? groupId;
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

export function createPermissionMatrix(
    options: PermissionMatrixOptions,
    containerId?: string
): PermissionMatrixHandle
{
    // ERR-2. AGENTS.md: a missing option throws, it does not
    // get a silent default. This used to reach the field and
    // crash a frame later with a TypeError that names the line
    // rather than the thing the caller left out. Absent means
    // undefined, so an empty array or a zero is present.
    if (options.roles === undefined)
    {
        throw new Error(
            `${LOG_PREFIX} options.roles is required. `
            + "Pass it when creating the PermissionMatrix.");
    }

    if (options.groups === undefined)
    {
        throw new Error(
            `${LOG_PREFIX} options.groups is required. `
            + "Pass it when creating the PermissionMatrix.");
    }

    if (options.cells === undefined)
    {
        throw new Error(
            `${LOG_PREFIX} options.cells is required. `
            + "Pass it when creating the PermissionMatrix.");
    }

    const instance = new PermissionMatrix(options);
    if (containerId) { instance.show(containerId); }
    return instance;
}

window.createPermissionMatrix = createPermissionMatrix;
