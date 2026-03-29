/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ⚓ COMPONENT: WorkspaceSwitcher
 * 📜 PURPOSE: Dropdown or modal for switching between organisational workspaces
 *    and tenants. Trigger button with icon/avatar + name + chevron. Search,
 *    keyboard navigation, portal pattern.
 * 🔗 RELATES: [[EnterpriseTheme]], [[CustomComponents]]
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface Workspace
{
    id: string;
    name: string;
    icon?: string;
    avatarUrl?: string;
    role?: string;
    memberCount?: number;
    plan?: string;
    data?: Record<string, unknown>;
}

export interface WorkspaceSwitcherOptions
{
    workspaces: Workspace[];
    activeWorkspaceId: string;
    mode?: "dropdown" | "modal";
    showSearch?: boolean;
    showCreateButton?: boolean;
    showMemberCount?: boolean;
    showRole?: boolean;
    showPlan?: boolean;
    createLabel?: string;
    placeholder?: string;
    size?: "sm" | "default" | "lg";
    cssClass?: string;
    /** Override default key combos. Keys are action names, values are combo strings. */
    keyBindings?: Partial<Record<string, string>>;
    onSwitch?: (workspace: Workspace) => void;
    onCreate?: () => void;
    onSearch?: (query: string) => Promise<Workspace[]>;
    onOpen?: () => void;
    onClose?: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[WorkspaceSwitcher]";
const _lu = (typeof (window as any).createLogUtility === "function") ? (window as any).createLogUtility().getLogger(LOG_PREFIX.slice(1, -1)) : null;
function logInfo(...a: unknown[]): void { _lu ? _lu.info(...a) : console.log(new Date().toISOString(), "[INFO]", LOG_PREFIX, ...a); }
function logWarn(...a: unknown[]): void { _lu ? _lu.warn(...a) : console.warn(new Date().toISOString(), "[WARN]", LOG_PREFIX, ...a); }
function logError(...a: unknown[]): void { _lu ? _lu.error(...a) : console.error(new Date().toISOString(), "[ERROR]", LOG_PREFIX, ...a); }
function logDebug(...a: unknown[]): void { _lu ? _lu.debug(...a) : console.debug(new Date().toISOString(), "[DEBUG]", LOG_PREFIX, ...a); }

const CLS = "workspaceswitcher";
const SEARCH_DEBOUNCE_MS = 150;

const SIZE_CONFIG: Record<string, { triggerH: number; avatarPx: number; dropW: number }>
= {
    sm:      { triggerH: 28, avatarPx: 20, dropW: 240 },
    default: { triggerH: 36, avatarPx: 28, dropW: 300 },
    lg:      { triggerH: 44, avatarPx: 36, dropW: 360 },
};

const INITIALS_PALETTE = [
    "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
    "#f97316", "#eab308", "#22c55e", "#06b6d4",
];

const DEFAULT_KEY_BINDINGS: Record<string, string> = {
    close: "Escape",
    focusDown: "ArrowDown",
    focusUp: "ArrowUp",
    focusFirst: "Home",
    focusLast: "End",
    select: "Enter",
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

function hashString(str: string): number
{
    let hash = 0;
    for (let i = 0; i < str.length; i++)
    {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
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

// ============================================================================
// CLASS
// ============================================================================

export class WorkspaceSwitcher
{
    // -- Options -------------------------------------------------------------
    private opts: Required<
        Pick<WorkspaceSwitcherOptions,
            "mode" | "showCreateButton" | "showMemberCount" |
            "showRole" | "showPlan" | "createLabel" | "placeholder" | "size">
    > & WorkspaceSwitcherOptions;

    // -- Data ----------------------------------------------------------------
    private workspaces: Workspace[];
    private activeId: string;

    // -- DOM -----------------------------------------------------------------
    private rootEl: HTMLElement | null = null;
    private triggerEl: HTMLElement | null = null;
    private portalEl: HTMLElement | null = null;
    private searchInputEl: HTMLInputElement | null = null;
    private listEl: HTMLElement | null = null;
    private liveEl: HTMLElement | null = null;

    // -- State ---------------------------------------------------------------
    private opened = false;
    private destroyed = false;
    private focusedIdx = -1;
    private showSearch: boolean;
    private filteredWs: Workspace[] = [];
    private searchTimer = 0;

    // -- Bound handlers ------------------------------------------------------
    private boundOnDocClick = this.onDocClick.bind(this);
    private boundOnDocKeydown = this.onDocKeydown.bind(this);

    // ========================================================================
    // CONSTRUCTOR
    // ========================================================================

    constructor(options: WorkspaceSwitcherOptions)
    {
        this.opts = {
            mode: "dropdown",
            showCreateButton: true,
            showMemberCount: false,
            showRole: true,
            showPlan: false,
            createLabel: "Create workspace",
            placeholder: "Search workspaces...",
            size: "default",
            ...options,
        };

        this.workspaces = [...options.workspaces];
        this.activeId = options.activeWorkspaceId;
        this.showSearch = options.showSearch ?? (this.workspaces.length > 5);
        this.filteredWs = this.orderedWorkspaces();

        this.rootEl = this.buildRoot();
        this.triggerEl = this.buildTrigger();
        this.rootEl.appendChild(this.triggerEl);

        logInfo(`Initialised ${this.opts.mode} mode with ${this.workspaces.length} workspaces`);
    }

    // ========================================================================
    // LIFECYCLE
    // ========================================================================

    show(containerId: string | HTMLElement): void
    {
        if (this.destroyed) { logWarn("Already destroyed"); return; }
        const container = typeof containerId === "string"
            ? document.getElementById(containerId) : containerId;
        if (!container) { logError("Container not found:", containerId); return; }
        container.appendChild(this.rootEl!);
        logInfo("Shown in container");
    }

    hide(): void
    {
        if (this.destroyed) { return; }
        this.closePortal();
        this.rootEl?.parentElement?.removeChild(this.rootEl);
    }

    destroy(): void
    {
        if (this.destroyed) { logWarn("Already destroyed"); return; }
        this.destroyed = true;
        this.closePortal();
        this.rootEl?.parentElement?.removeChild(this.rootEl);
        this.rootEl = null;
        this.triggerEl = null;
        this.portalEl = null;
        this.searchInputEl = null;
        this.listEl = null;
        this.liveEl = null;
        clearTimeout(this.searchTimer);
        logInfo("Destroyed");
    }

    getElement(): HTMLElement | null { return this.rootEl; }

    // ========================================================================
    // OPEN / CLOSE
    // ========================================================================

    open(): void
    {
        if (this.destroyed || this.opened) { return; }
        this.opened = true;
        this.filteredWs = this.orderedWorkspaces();
        this.portalEl = this.opts.mode === "modal"
            ? this.buildModal() : this.buildDropdown();
        document.body.appendChild(this.portalEl);

        this.updateTriggerExpanded(true);
        this.focusSearchOrFirst();

        document.addEventListener("mousedown", this.boundOnDocClick, true);
        document.addEventListener("keydown", this.boundOnDocKeydown, true);

        safeCallback(this.opts.onOpen);
    }

    close(): void { this.closePortal(); }

    isOpen(): boolean { return this.opened; }

    // ========================================================================
    // PUBLIC API
    // ========================================================================

    getActiveWorkspace(): Workspace | undefined
    {
        return this.workspaces.find(w => w.id === this.activeId);
    }

    setActiveWorkspace(id: string): void
    {
        this.activeId = id;
        this.updateTriggerContent();
    }

    setWorkspaces(workspaces: Workspace[]): void
    {
        this.workspaces = [...workspaces];
        this.showSearch = this.opts.showSearch ?? (this.workspaces.length > 5);
        this.filteredWs = this.orderedWorkspaces();
        this.updateTriggerContent();
        if (this.opened && this.listEl) { this.renderList(); }
    }

    addWorkspace(workspace: Workspace): void
    {
        this.workspaces.push(workspace);
        this.showSearch = this.opts.showSearch ?? (this.workspaces.length > 5);
        this.filteredWs = this.orderedWorkspaces();
        if (this.opened && this.listEl) { this.renderList(); }
    }

    removeWorkspace(id: string): void
    {
        this.workspaces = this.workspaces.filter(w => w.id !== id);
        this.filteredWs = this.orderedWorkspaces();
        if (this.opened && this.listEl) { this.renderList(); }
    }

    // ========================================================================
    // BUILD — ROOT & TRIGGER
    // ========================================================================

    private buildRoot(): HTMLElement
    {
        const sizeClass = `${CLS}-${this.opts.size}`;
        const root = createElement("div", `${CLS} ${sizeClass}`);
        if (this.opts.cssClass) { root.classList.add(...this.opts.cssClass.split(" ")); }
        return root;
    }

    private buildTrigger(): HTMLElement
    {
        const btn = createElement("button", `${CLS}-trigger`) as HTMLButtonElement;
        setAttr(btn, "type", "button");
        const hasPopup = this.opts.mode === "modal" ? "dialog" : "listbox";
        setAttr(btn, "aria-haspopup", hasPopup);
        setAttr(btn, "aria-expanded", "false");

        btn.addEventListener("click", () => this.onTriggerClick());

        this.appendTriggerContent(btn);
        return btn;
    }

    private appendTriggerContent(btn: HTMLElement): void
    {
        btn.textContent = "";
        const ws = this.getActiveWorkspace();
        const name = ws ? ws.name : "Select workspace";
        setAttr(btn, "aria-label", `Switch workspace, currently ${name}`);

        const iconEl = this.buildWorkspaceIcon(ws, true);
        iconEl.className = `${CLS}-trigger-icon`;
        btn.appendChild(iconEl);

        const nameEl = createElement("span", `${CLS}-trigger-name`);
        nameEl.textContent = name;
        btn.appendChild(nameEl);

        const chevron = createElement("i", `bi bi-chevron-down ${CLS}-trigger-chevron`);
        setAttr(chevron, "aria-hidden", "true");
        btn.appendChild(chevron);
    }

    private updateTriggerContent(): void
    {
        if (!this.triggerEl) { return; }
        this.appendTriggerContent(this.triggerEl);
    }

    private updateTriggerExpanded(expanded: boolean): void
    {
        if (!this.triggerEl) { return; }
        setAttr(this.triggerEl, "aria-expanded", String(expanded));
    }

    // ========================================================================
    // BUILD — DROPDOWN
    // ========================================================================

    private buildDropdown(): HTMLElement
    {
        const drop = createElement("div", `${CLS}-dropdown`);
        drop.style.position = "fixed";
        drop.style.zIndex = "1050";

        this.liveEl = this.buildLive();
        drop.appendChild(this.liveEl);

        if (this.showSearch)
        {
            drop.appendChild(this.buildSearch());
        }

        this.listEl = this.buildList();
        drop.appendChild(this.listEl);

        if (this.opts.showCreateButton)
        {
            drop.appendChild(this.buildDivider());
            drop.appendChild(this.buildCreateBtn());
        }

        this.positionDropdown(drop);
        return drop;
    }

    private positionDropdown(drop: HTMLElement): void
    {
        if (!this.triggerEl) { return; }
        requestAnimationFrame(() =>
        {
            if (!this.triggerEl) { return; }
            const rect = this.triggerEl.getBoundingClientRect();
            const cfg = SIZE_CONFIG[this.opts.size ?? "default"];
            const maxH = Math.min(400, window.innerHeight * 0.6);

            drop.style.width = cfg.dropW + "px";
            drop.style.maxHeight = maxH + "px";

            let top = rect.bottom + 4;
            let left = rect.left;

            if (top + maxH > window.innerHeight)
            {
                top = rect.top - maxH - 4;
            }
            if (left + cfg.dropW > window.innerWidth)
            {
                left = rect.right - cfg.dropW;
            }

            drop.style.top = Math.max(0, top) + "px";
            drop.style.left = Math.max(0, left) + "px";
        });
    }

    // ========================================================================
    // BUILD — MODAL
    // ========================================================================

    private buildModal(): HTMLElement
    {
        const container = createElement("div", `${CLS}-modal`);
        container.style.zIndex = "1055";

        const backdrop = createElement("div", `${CLS}-backdrop`);
        backdrop.addEventListener("click", () => this.closePortal());
        container.appendChild(backdrop);

        const content = createElement("div", `${CLS}-modal-content`);
        content.style.zIndex = "1056";
        setAttr(content, "role", "dialog");
        setAttr(content, "aria-modal", "true");
        setAttr(content, "aria-label", "Switch workspace");

        const heading = createElement("h2", `${CLS}-modal-heading`);
        heading.textContent = "Switch workspace";
        content.appendChild(heading);

        this.liveEl = this.buildLive();
        content.appendChild(this.liveEl);

        if (this.showSearch)
        {
            content.appendChild(this.buildSearch());
        }

        this.listEl = this.buildList();
        content.appendChild(this.listEl);

        if (this.opts.showCreateButton)
        {
            content.appendChild(this.buildDivider());
            content.appendChild(this.buildCreateBtn());
        }

        container.appendChild(content);
        return container;
    }

    // ========================================================================
    // BUILD — SHARED PARTS
    // ========================================================================

    private buildLive(): HTMLElement
    {
        const live = createElement("div", "visually-hidden");
        setAttr(live, "aria-live", "polite");
        setAttr(live, "aria-atomic", "true");
        return live;
    }

    private buildSearch(): HTMLElement
    {
        const wrapper = createElement("div", `${CLS}-search`);
        const icon = createElement("i", `bi bi-search ${CLS}-search-icon`);
        setAttr(icon, "aria-hidden", "true");
        wrapper.appendChild(icon);

        const input = document.createElement("input") as HTMLInputElement;
        input.className = `${CLS}-search-input`;
        input.type = "text";
        input.placeholder = this.opts.placeholder ?? "Search workspaces...";
        setAttr(input, "aria-label", "Search workspaces");
        setAttr(input, "role", "searchbox");
        input.addEventListener("input", this.onSearchInput.bind(this));
        wrapper.appendChild(input);

        this.searchInputEl = input;
        return wrapper;
    }

    private buildList(): HTMLElement
    {
        const list = createElement("div", `${CLS}-list`);
        setAttr(list, "role", "listbox");
        setAttr(list, "aria-label", "Workspace list");
        this.renderListInto(list);
        return list;
    }

    private renderList(): void
    {
        if (!this.listEl) { return; }
        this.listEl.textContent = "";
        this.renderListInto(this.listEl);
    }

    private renderListInto(list: HTMLElement): void
    {
        if (this.filteredWs.length === 0)
        {
            const empty = createElement("div", `${CLS}-empty`);
            empty.textContent = "No workspaces found";
            list.appendChild(empty);
            return;
        }

        this.filteredWs.forEach((ws, idx) =>
        {
            list.appendChild(this.buildItem(ws, idx));
        });
    }

    private buildItem(ws: Workspace, idx: number): HTMLElement
    {
        const isActive = ws.id === this.activeId;
        const item = createElement("div", `${CLS}-item`);
        if (isActive) { item.classList.add(`${CLS}-item-active`); }
        setAttr(item, "role", "option");
        setAttr(item, "aria-selected", String(isActive));
        setAttr(item, "tabindex", idx === 0 ? "0" : "-1");
        setAttr(item, "data-ws-id", ws.id);

        item.appendChild(this.buildItemIcon(ws));
        item.appendChild(this.buildItemInfo(ws));

        if (isActive)
        {
            const check = createElement("i", `bi bi-check-lg ${CLS}-item-check`);
            setAttr(check, "aria-hidden", "true");
            item.appendChild(check);
        }

        item.addEventListener("click", () => this.selectWorkspace(ws));
        return item;
    }

    private buildItemIcon(ws: Workspace): HTMLElement
    {
        return this.buildWorkspaceIcon(ws, false);
    }

    private buildItemInfo(ws: Workspace): HTMLElement
    {
        const info = createElement("div", `${CLS}-item-info`);

        const name = createElement("span", `${CLS}-item-name`);
        name.textContent = ws.name;
        info.appendChild(name);

        if (this.opts.showRole && ws.role)
        {
            const badge = createElement("span", `${CLS}-item-role`);
            badge.textContent = ws.role;
            info.appendChild(badge);
        }

        if (this.opts.showMemberCount && ws.memberCount != null)
        {
            const members = createElement("span", `${CLS}-item-members`);
            members.textContent = `${ws.memberCount} members`;
            info.appendChild(members);
        }

        if (this.opts.showPlan && ws.plan)
        {
            const plan = createElement("span", `${CLS}-item-plan`);
            plan.textContent = ws.plan;
            info.appendChild(plan);
        }

        return info;
    }

    private buildWorkspaceIcon(
        ws: Workspace | undefined,
        isTrigger: boolean
    ): HTMLElement
    {
        const cls = isTrigger ? `${CLS}-trigger-icon` : `${CLS}-item-icon`;
        const container = createElement("span", cls);
        setAttr(container, "aria-hidden", "true");

        if (!ws)
        {
            const i = createElement("i", "bi bi-building");
            container.appendChild(i);
            return container;
        }

        if (ws.avatarUrl)
        {
            return this.buildAvatarImg(ws.avatarUrl, cls);
        }

        if (ws.icon)
        {
            if (ws.icon.startsWith("http") || ws.icon.startsWith("/"))
            {
                return this.buildAvatarImg(ws.icon, cls);
            }
            const i = createElement("i", ws.icon);
            container.appendChild(i);
            return container;
        }

        return this.buildInitials(ws.name, cls);
    }

    private buildAvatarImg(url: string, cls: string): HTMLElement
    {
        const container = createElement("span", cls);
        setAttr(container, "aria-hidden", "true");
        const img = document.createElement("img") as HTMLImageElement;
        img.className = `${CLS}-item-avatar`;
        img.src = url;
        img.alt = "";
        container.appendChild(img);
        return container;
    }

    private buildInitials(name: string, cls: string): HTMLElement
    {
        const container = createElement("span", cls);
        setAttr(container, "aria-hidden", "true");
        const circle = createElement("span", `${CLS}-item-initials`);
        circle.textContent = name.charAt(0).toUpperCase();
        const colorIdx = hashString(name) % INITIALS_PALETTE.length;
        circle.style.backgroundColor = INITIALS_PALETTE[colorIdx];
        container.appendChild(circle);
        return container;
    }

    private buildDivider(): HTMLElement
    {
        return createElement("div", `${CLS}-divider`);
    }

    private buildCreateBtn(): HTMLElement
    {
        const btn = createElement("button", `${CLS}-create`) as HTMLButtonElement;
        setAttr(btn, "type", "button");
        const icon = createElement("i", "bi bi-plus-lg");
        setAttr(icon, "aria-hidden", "true");
        btn.appendChild(icon);
        const txt = document.createTextNode(" " + (this.opts.createLabel ?? "Create workspace"));
        btn.appendChild(txt);
        btn.addEventListener("click", () => this.onCreateClick());
        return btn;
    }

    // ========================================================================
    // KEY BINDING HELPERS
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
    // EVENT HANDLERS
    // ========================================================================

    private onTriggerClick(): void
    {
        if (this.opened) { this.closePortal(); }
        else { this.open(); }
    }

    private onDocClick(e: MouseEvent): void
    {
        if (!this.portalEl || !this.triggerEl) { return; }
        const target = e.target as Node;
        if (this.portalEl.contains(target) || this.triggerEl.contains(target))
        {
            return;
        }
        this.closePortal();
    }

    private onDocKeydown(e: KeyboardEvent): void
    {
        if (!this.opened) { return; }

        if (this.matchesKeyCombo(e, "close"))
        {
            e.preventDefault();
            this.closePortal();
            this.triggerEl?.focus();
        }
        else
        {
            this.handleNavKeydown(e);
        }
    }

    private handleNavKeydown(e: KeyboardEvent): void
    {
        if (this.matchesKeyCombo(e, "focusDown"))
        {
            e.preventDefault(); this.moveFocus(1);
        }
        else if (this.matchesKeyCombo(e, "focusUp"))
        {
            e.preventDefault(); this.moveFocus(-1);
        }
        else if (this.matchesKeyCombo(e, "focusFirst"))
        {
            e.preventDefault(); this.setFocus(0);
        }
        else if (this.matchesKeyCombo(e, "focusLast"))
        {
            e.preventDefault();
            this.setFocus(this.filteredWs.length - 1);
        }
        else if (this.matchesKeyCombo(e, "select"))
        {
            this.onEnterKey(e);
        }
    }

    private onEnterKey(e: KeyboardEvent): void
    {
        if (this.focusedIdx >= 0 && this.focusedIdx < this.filteredWs.length)
        {
            e.preventDefault();
            this.selectWorkspace(this.filteredWs[this.focusedIdx]);
        }
    }

    private onSearchInput(): void
    {
        clearTimeout(this.searchTimer);
        this.searchTimer = window.setTimeout(
            () => this.applySearch(),
            SEARCH_DEBOUNCE_MS
        );
    }

    private async applySearch(): Promise<void>
    {
        const query = this.searchInputEl?.value.trim() ?? "";

        if (this.opts.onSearch && query.length > 0)
        {
            try
            {
                const results = await this.opts.onSearch(query);
                this.filteredWs = results;
            }
            catch (err)
            {
                logWarn("Server search failed:", err);
                this.filteredWs = this.filterLocal(query);
            }
        }
        else
        {
            this.filteredWs = query.length > 0
                ? this.filterLocal(query) : this.orderedWorkspaces();
        }

        this.renderList();
        this.focusedIdx = -1;
        this.announce(`${this.filteredWs.length} workspaces found`);
    }

    private filterLocal(query: string): Workspace[]
    {
        const lower = query.toLowerCase();
        return this.orderedWorkspaces().filter(
            ws => ws.name.toLowerCase().includes(lower)
        );
    }

    private selectWorkspace(ws: Workspace): void
    {
        if (ws.id === this.activeId)
        {
            this.closePortal();
            return;
        }

        this.activeId = ws.id;
        this.updateTriggerContent();
        this.closePortal();
        safeCallback(this.opts.onSwitch, ws);
        logInfo(`Switched to workspace: ${ws.name}`);
    }

    private onCreateClick(): void
    {
        this.closePortal();
        safeCallback(this.opts.onCreate);
    }

    // ========================================================================
    // FOCUS MANAGEMENT
    // ========================================================================

    private focusSearchOrFirst(): void
    {
        requestAnimationFrame(() =>
        {
            if (this.searchInputEl && this.showSearch)
            {
                this.searchInputEl.focus();
            }
            else
            {
                this.setFocus(0);
            }
        });
    }

    private moveFocus(delta: number): void
    {
        const next = this.focusedIdx + delta;
        if (next < 0 || next >= this.filteredWs.length) { return; }
        this.setFocus(next);
    }

    private setFocus(idx: number): void
    {
        if (!this.listEl || idx < 0 || idx >= this.filteredWs.length) { return; }
        const items = this.listEl.querySelectorAll(`.${CLS}-item`);

        if (this.focusedIdx >= 0 && this.focusedIdx < items.length)
        {
            (items[this.focusedIdx] as HTMLElement).setAttribute("tabindex", "-1");
        }

        this.focusedIdx = idx;
        const target = items[idx] as HTMLElement;
        target.setAttribute("tabindex", "0");
        target.focus();
    }

    // ========================================================================
    // PORTAL MANAGEMENT
    // ========================================================================

    private closePortal(): void
    {
        if (!this.opened) { return; }
        this.opened = false;
        this.focusedIdx = -1;

        if (this.portalEl)
        {
            this.portalEl.parentElement?.removeChild(this.portalEl);
            this.portalEl = null;
        }

        this.searchInputEl = null;
        this.listEl = null;
        this.liveEl = null;

        this.updateTriggerExpanded(false);

        document.removeEventListener("mousedown", this.boundOnDocClick, true);
        document.removeEventListener("keydown", this.boundOnDocKeydown, true);

        safeCallback(this.opts.onClose);
    }

    // ========================================================================
    // UTILITY
    // ========================================================================

    private orderedWorkspaces(): Workspace[]
    {
        const active = this.workspaces.find(w => w.id === this.activeId);
        const rest = this.workspaces.filter(w => w.id !== this.activeId);
        return active ? [active, ...rest] : rest;
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

export function createWorkspaceSwitcher(
    options: WorkspaceSwitcherOptions,
    containerId?: string
): WorkspaceSwitcher
{
    const instance = new WorkspaceSwitcher(options);
    if (containerId) { instance.show(containerId); }
    return instance;
}

(window as unknown as Record<string, unknown>).WorkspaceSwitcher = WorkspaceSwitcher;
(window as unknown as Record<string, unknown>).createWorkspaceSwitcher = createWorkspaceSwitcher;
