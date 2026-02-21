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
export type ExportFormat = "json" | "csv";

export interface Role
{
    id: string;
    name: string;
    description?: string;
    inheritsFrom?: string;
    color?: string;
    readonly?: boolean;
    data?: unknown;
}

export interface Permission
{
    id: string;
    name: string;
    description?: string;
    data?: unknown;
}

export interface PermissionGroup
{
    id: string;
    name: string;
    description?: string;
    permissions: Permission[];
    expanded?: boolean;
    icon?: string;
}

export interface MatrixCell
{
    roleId: string;
    permissionId: string;
    state: PermissionState;
}

export interface PermissionChange
{
    roleId: string;
    permissionId: string;
    previousState: PermissionState;
    newState: PermissionState;
}

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

export interface MatrixExportData
{
    exportedAt: string;
    roles: Role[];
    groups: PermissionGroup[];
    cells: MatrixCell[];
    pendingChanges: PermissionChange[];
}

export interface PermissionMatrixOptions
{
    roles: Role[];
    groups: PermissionGroup[];
    cells: MatrixCell[];
    readOnly?: boolean;
    showFilter?: boolean;
    filterDebounceMs?: number;
    showExport?: boolean;
    showReset?: boolean;
    showChangeCounter?: boolean;
    showInheritance?: boolean;
    showChangeHighlight?: boolean;
    enableGroupBulk?: boolean;
    enableRoleBulk?: boolean;
    enablePermissionBulk?: boolean;
    stickyHeader?: boolean;
    stickyFirstColumn?: boolean;
    height?: string;
    width?: string;
    cssClass?: string;
    emptyMessage?: string;
    onChange?: (change: PermissionChange) => void;
    onBulkChange?: (bulkChange: BulkChange) => void;
    onExport?: (data: MatrixExportData, format: ExportFormat) => void;
    onReset?: () => void;
    cellRenderer?: (role: Role, perm: Permission, state: PermissionState) => HTMLElement | null;
    /** Override default key combos. Keys are action names, values are combo strings. */
    keyBindings?: Partial<Record<string, string>>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[PermissionMatrix]";
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

export class PermissionMatrix
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
        console.log(
            LOG_PREFIX,
            `Initialised with ${this.roles.length} roles, ${totalPerms} permissions in ${this.groups.length} groups`
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
        if (!container)
        {
            console.error(LOG_PREFIX, "Container not found:", containerId);
            return;
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
        if (this.destroyed) { console.warn(LOG_PREFIX, "Already destroyed"); return; }
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
        console.log(LOG_PREFIX, "Destroyed");
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

    setData(
        roles: Role[],
        groups: PermissionGroup[],
        cells: MatrixCell[]
    ): void
    {
        this.roles = [...roles];
        this.groups = groups.map(g => ({ ...g, permissions: [...g.permissions] }));
        this.buildStateMaps(cells);
        this.buildInheritanceChains();
        this.pendingChanges.clear();
        this.renderGrid();
        this.updateCounter();
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
        this.toggleGroupVisibility(groupId, true);
        this.announce(`${this.getGroupName(groupId)} expanded`);
    }

    collapseGroup(groupId: string): void
    {
        this.expandedGroups.delete(groupId);
        this.toggleGroupVisibility(groupId, false);
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

    exportData(format: ExportFormat): MatrixExportData
    {
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
            this.filterText = input.value;
            this.debouncedFilter();
        });
        input.addEventListener("keydown", (e) =>
        {
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
        safeCallback(this.opts.onChange, {
            roleId, permissionId: permId,
            previousState: prev, newState: next
        });
        this.announce(
            `${permName} for ${roleName} changed to ${next}`
        );
    }

    private onGridKeydown(e: KeyboardEvent): void
    {
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
                console.warn(
                    LOG_PREFIX,
                    `Circular inheritance detected: ${[...visited, current.inheritsFrom].join(" -> ")}`
                );
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
        safeCallback(this.opts.onBulkChange, {
            type: target === "granted" ? "grant-all-in-group" : "deny-all-in-group",
            roleId,
            groupId,
            changes
        });
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

    private toggleGroupVisibility(groupId: string, expanded: boolean): void
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
        console.log(LOG_PREFIX, "Exported matrix as JSON");
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
): PermissionMatrix
{
    const instance = new PermissionMatrix(options);
    if (containerId) { instance.show(containerId); }
    return instance;
}

(window as unknown as Record<string, unknown>).PermissionMatrix = PermissionMatrix;
(window as unknown as Record<string, unknown>).createPermissionMatrix = createPermissionMatrix;
