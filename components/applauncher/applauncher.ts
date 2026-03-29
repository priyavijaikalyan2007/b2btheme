/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ⚓ COMPONENT: AppLauncher
 * 📜 PURPOSE: Grid-based application launcher with dropdown, modal, and fullpage
 *    view modes for switching between apps in enterprise SaaS. Supports search,
 *    favourites, recent apps, categories, badges, and 2D grid keyboard navigation.
 * 🔗 RELATES: [[EnterpriseTheme]], [[CustomComponents]]
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface AppItem
{
    id: string;
    name: string;
    description?: string;
    icon?: string;
    iconUrl?: string;
    url?: string;
    category?: string;
    badge?: string;
    badgeVariant?: "info" | "success" | "warning" | "danger";
    disabled?: boolean;
    data?: Record<string, unknown>;
}

export interface AppCategory
{
    id: string;
    label: string;
    icon?: string;
    order?: number;
}

export type AppLauncherMode = "dropdown" | "modal" | "fullpage";

export interface AppLauncherOptions
{
    apps: AppItem[];
    categories?: AppCategory[];
    activeAppId?: string;
    mode?: AppLauncherMode;
    columns?: number;
    showSearch?: boolean;
    showFavorites?: boolean;
    showRecent?: boolean;
    maxRecent?: number;
    showCategories?: boolean;
    placeholder?: string;
    triggerIcon?: string;
    triggerLabel?: string;
    showTriggerLabel?: boolean;
    size?: "sm" | "default" | "lg";
    favoritesKey?: string;
    recentKey?: string;
    cssClass?: string;
    keyBindings?: Partial<Record<string, string>>;
    onSelect?: (app: AppItem) => void;
    onSearch?: (query: string) => Promise<AppItem[]>;
    onFavoriteToggle?: (appId: string, isFavorite: boolean) => void;
    onOpen?: () => void;
    onClose?: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[AppLauncher]";
const _lu = (typeof (window as any).createLogUtility === "function") ? (window as any).createLogUtility().getLogger(LOG_PREFIX.slice(1, -1)) : null;
function logInfo(...a: unknown[]): void { _lu ? _lu.info(...a) : console.log(new Date().toISOString(), "[INFO]", LOG_PREFIX, ...a); }
function logWarn(...a: unknown[]): void { _lu ? _lu.warn(...a) : console.warn(new Date().toISOString(), "[WARN]", LOG_PREFIX, ...a); }
function logError(...a: unknown[]): void { _lu ? _lu.error(...a) : console.error(new Date().toISOString(), "[ERROR]", LOG_PREFIX, ...a); }
function logDebug(...a: unknown[]): void { _lu ? _lu.debug(...a) : console.debug(new Date().toISOString(), "[DEBUG]", LOG_PREFIX, ...a); }

const CLS = "applauncher";
const SEARCH_DEBOUNCE_MS = 150;
const DEFAULT_FAV_KEY = "applauncher-favorites";
const DEFAULT_RECENT_KEY = "applauncher-recent";
const DEFAULT_MAX_RECENT = 6;

const SIZE_CONFIG: Record<string, { triggerH: number; iconPx: number; dropW: number }> =
{
    sm:      { triggerH: 28, iconPx: 36, dropW: 280 },
    default: { triggerH: 36, iconPx: 48, dropW: 340 },
    lg:      { triggerH: 44, iconPx: 56, dropW: 400 },
};

const INITIALS_PALETTE = [
    "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
    "#f97316", "#eab308", "#22c55e", "#06b6d4",
];

const DEFAULT_KEY_BINDINGS: Record<string, string> =
{
    close: "Escape",
    focusDown: "ArrowDown",
    focusUp: "ArrowUp",
    focusLeft: "ArrowLeft",
    focusRight: "ArrowRight",
    focusFirst: "Home",
    focusLast: "End",
    select: "Enter",
    toggleFav: "Shift+F",
    focusSearch: "/",
};

const DEFAULT_COLUMNS: Record<string, number> =
{
    dropdown: 3,
    modal: 4,
    fullpage: 4,
};

// ============================================================================
// HELPERS
// ============================================================================

function createElement(
    tag: string, classes: string[], text?: string
): HTMLElement
{
    const el = document.createElement(tag);
    classes.forEach(c => { if (c) { el.classList.add(c); } });
    if (text) { el.textContent = text; }
    return el;
}

function setAttr(
    el: HTMLElement, name: string, value: string
): void
{
    el.setAttribute(name, value);
}

function addIconClasses(el: HTMLElement, iconStr: string): void
{
    iconStr.split(" ").forEach(c =>
    {
        if (c.trim()) { el.classList.add(c.trim()); }
    });
}

function safeCallback<T extends unknown[]>(
    fn: ((...a: T) => void) | undefined, ...args: T
): void
{
    if (!fn) { return; }
    try { fn(...args); }
    catch (err) { logError("Callback error:", err); }
}

function debounce<T extends (...args: unknown[]) => void>(
    fn: T, ms: number
): (...args: Parameters<T>) => void
{
    let timer: ReturnType<typeof setTimeout> | null = null;
    return (...args: Parameters<T>) =>
    {
        if (timer) { clearTimeout(timer); }
        timer = setTimeout(() => { fn(...args); }, ms);
    };
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

function loadFromStorage<T>(key: string): T | null
{
    try
    {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) as T : null;
    }
    catch (err)
    {
        logWarn("localStorage read failed:", err);
        return null;
    }
}

function saveToStorage(key: string, value: unknown): void
{
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch (err)
    {
        logWarn("localStorage write failed:", err);
    }
}

// ============================================================================
// CLASS: AppLauncher
// ============================================================================

export class AppLauncher
{
    private readonly opts: AppLauncherOptions;
    private rootEl: HTMLElement | null = null;
    private triggerEl: HTMLButtonElement | null = null;
    private portalEl: HTMLElement | null = null;
    private searchInputEl: HTMLInputElement | null = null;
    private sectionsEl: HTMLElement | null = null;
    private liveRegionEl: HTMLElement | null = null;
    private apps: AppItem[] = [];
    private filteredApps: AppItem[] = [];
    private favorites: string[] = [];
    private recent: string[] = [];
    private focusedIdx = -1;
    private visibleTiles: HTMLElement[] = [];
    private opened = false;
    private destroyed = false;
    private activeTab = "all";
    private activeAppId = "";
    private searchQuery = "";
    private readonly boundOnDocClick: (e: MouseEvent) => void;
    private readonly boundOnDocKeydown: (e: KeyboardEvent) => void;
    private readonly debouncedSearch: () => void;

    // ========================================================================
    // CONSTRUCTOR
    // ========================================================================

    constructor(options: AppLauncherOptions)
    {
        this.opts = { ...options };
        this.apps = [...(options.apps || [])];
        this.filteredApps = [...this.apps];
        this.activeAppId = options.activeAppId ?? "";
        this.boundOnDocClick = (e) => this.onDocClick(e);
        this.boundOnDocKeydown = (e) => this.onDocKeydown(e);
        this.debouncedSearch = debounce(
            () => { this.applySearch(); }, SEARCH_DEBOUNCE_MS
        );
        this.loadFavorites();
        this.loadRecent();
        this.buildRoot();
        logInfo("Initialised, mode:", this.getMode());
    }

    // ========================================================================
    // LIFECYCLE
    // ========================================================================

    show(containerId: string | HTMLElement): void
    {
        if (this.destroyed || !this.rootEl) { return; }
        const container = typeof containerId === "string"
            ? document.getElementById(containerId) : containerId;
        if (!container)
        {
            logWarn("Container not found:", containerId);
            return;
        }
        container.appendChild(this.rootEl);
        if (this.getMode() === "fullpage") { this.renderFullpageContent(); }
    }

    hide(): void
    {
        if (this.opened) { this.close(); }
        this.rootEl?.parentElement?.removeChild(this.rootEl);
    }

    destroy(): void
    {
        if (this.destroyed) { return; }
        this.destroyed = true;
        this.close();
        this.removeDocListeners();
        this.rootEl?.parentElement?.removeChild(this.rootEl);
        this.rootEl = null;
        this.triggerEl = null;
        this.portalEl = null;
        this.searchInputEl = null;
        this.sectionsEl = null;
        this.liveRegionEl = null;
        logInfo("Destroyed");
    }

    getElement(): HTMLElement | null { return this.rootEl; }

    // ========================================================================
    // BUILD — ROOT
    // ========================================================================

    private buildRoot(): void
    {
        const size = this.opts.size ?? "default";
        const classes = [CLS, `${CLS}-${size}`];
        if (this.opts.cssClass) { classes.push(this.opts.cssClass); }
        this.rootEl = createElement("div", classes);

        if (this.getMode() === "fullpage")
        {
            this.rootEl.classList.add(`${CLS}-fullpage`);
            this.buildFullpage();
        }
        else
        {
            this.buildTrigger();
        }
    }

    // ========================================================================
    // BUILD — TRIGGER (DROPDOWN / MODAL)
    // ========================================================================

    private buildTrigger(): void
    {
        this.triggerEl = document.createElement("button");
        this.triggerEl.className = `${CLS}-trigger`;
        setAttr(this.triggerEl, "type", "button");
        const popup = this.getMode() === "modal" ? "dialog" : "grid";
        setAttr(this.triggerEl, "aria-haspopup", popup);
        setAttr(this.triggerEl, "aria-expanded", "false");
        setAttr(this.triggerEl, "aria-label", "App launcher");

        this.appendTriggerIcon();
        this.appendTriggerLabel();
        this.triggerEl.addEventListener("click", () => this.onTriggerClick());
        this.rootEl!.appendChild(this.triggerEl);
    }

    private appendTriggerIcon(): void
    {
        const iconCls = this.opts.triggerIcon ?? "bi bi-grid-3x3-gap";
        const icon = createElement("span", [`${CLS}-trigger-icon`]);
        const i = document.createElement("i");
        addIconClasses(i, iconCls);
        setAttr(i, "aria-hidden", "true");
        icon.appendChild(i);
        this.triggerEl!.appendChild(icon);
    }

    private appendTriggerLabel(): void
    {
        if (this.opts.showTriggerLabel === false) { return; }
        const label = this.opts.triggerLabel ?? "Apps";
        const span = createElement("span", [`${CLS}-trigger-label`], label);
        this.triggerEl!.appendChild(span);
    }

    // ========================================================================
    // OPEN / CLOSE
    // ========================================================================

    open(): void
    {
        if (this.destroyed || this.opened) { return; }
        if (this.getMode() === "fullpage") { return; }
        this.opened = true;
        this.searchQuery = "";
        this.filteredApps = [...this.apps];
        this.activeTab = "all";
        this.focusedIdx = -1;

        if (this.getMode() === "modal")
        {
            this.buildModalPortal();
        }
        else
        {
            this.buildDropdownPortal();
        }

        this.renderContent();
        this.addDocListeners();
        this.updateTriggerExpanded(true);
        safeCallback(this.opts.onOpen);
        this.focusSearchOrFirst();
    }

    close(): void
    {
        if (!this.opened) { return; }
        this.opened = false;
        this.removeDocListeners();
        this.removePortal();
        this.updateTriggerExpanded(false);
        this.searchInputEl = null;
        this.sectionsEl = null;
        safeCallback(this.opts.onClose);
        this.triggerEl?.focus();
    }

    isOpen(): boolean
    {
        if (this.getMode() === "fullpage") { return true; }
        return this.opened;
    }

    private updateTriggerExpanded(expanded: boolean): void
    {
        if (!this.triggerEl) { return; }
        setAttr(this.triggerEl, "aria-expanded", String(expanded));
    }

    // ========================================================================
    // BUILD — DROPDOWN PORTAL
    // ========================================================================

    private buildDropdownPortal(): void
    {
        const size = this.opts.size ?? "default";
        const cfg = SIZE_CONFIG[size] ?? SIZE_CONFIG.default;
        this.portalEl = createElement("div", [`${CLS}-dropdown`]);
        this.portalEl.style.minWidth = `${cfg.dropW}px`;

        this.liveRegionEl = this.buildLiveRegion();
        this.portalEl.appendChild(this.liveRegionEl);
        this.appendSearchToPortal();
        this.appendTabsIfNeeded();
        this.sectionsEl = createElement("div", [`${CLS}-sections`]);
        this.portalEl.appendChild(this.sectionsEl);
        this.appendFooter();

        document.body.appendChild(this.portalEl);
        this.positionDropdown();
    }

    private positionDropdown(): void
    {
        if (!this.portalEl || !this.triggerEl) { return; }
        requestAnimationFrame(() => this.applyDropdownPosition());
    }

    private applyDropdownPosition(): void
    {
        if (!this.portalEl || !this.triggerEl) { return; }
        const rect = this.triggerEl.getBoundingClientRect();
        const portalH = this.portalEl.offsetHeight;
        const portalW = this.portalEl.offsetWidth;
        const viewH = window.innerHeight;
        const viewW = window.innerWidth;

        let top = rect.bottom + 4;
        let left = rect.left;
        if (top + portalH > viewH) { top = rect.top - portalH - 4; }
        if (left + portalW > viewW) { left = rect.right - portalW; }
        if (left < 0) { left = 4; }

        this.portalEl.style.position = "fixed";
        this.portalEl.style.top = `${top}px`;
        this.portalEl.style.left = `${left}px`;
    }

    // ========================================================================
    // BUILD — MODAL PORTAL
    // ========================================================================

    private buildModalPortal(): void
    {
        this.portalEl = createElement("div", [`${CLS}-modal`]);
        const backdrop = createElement("div", [`${CLS}-backdrop`]);
        backdrop.addEventListener("click", () => this.close());
        this.portalEl.appendChild(backdrop);

        const content = this.buildModalContent();
        this.portalEl.appendChild(content);
        document.body.appendChild(this.portalEl);
        this.animateModalEntry(backdrop, content);
    }

    private buildModalContent(): HTMLElement
    {
        const content = createElement("div", [`${CLS}-modal-content`]);
        setAttr(content, "role", "dialog");
        setAttr(content, "aria-modal", "true");
        setAttr(content, "aria-label", "App Launcher");

        content.appendChild(this.buildModalHeader());
        this.liveRegionEl = this.buildLiveRegion();
        content.appendChild(this.liveRegionEl);
        this.appendSearchTo(content);
        this.appendTabsTo(content);
        this.sectionsEl = createElement("div", [`${CLS}-sections`]);
        content.appendChild(this.sectionsEl);
        return content;
    }

    private buildModalHeader(): HTMLElement
    {
        const header = createElement("div", [`${CLS}-modal-header`]);
        const heading = createElement(
            "h2", [`${CLS}-modal-heading`], "App Launcher"
        );
        header.appendChild(heading);
        header.appendChild(this.buildCloseBtn());
        return header;
    }

    private buildCloseBtn(): HTMLElement
    {
        const btn = document.createElement("button");
        btn.className = `${CLS}-modal-close`;
        setAttr(btn, "type", "button");
        setAttr(btn, "aria-label", "Close app launcher");
        const icon = document.createElement("i");
        addIconClasses(icon, "bi bi-x-lg");
        setAttr(icon, "aria-hidden", "true");
        btn.appendChild(icon);
        btn.addEventListener("click", () => this.close());
        return btn;
    }

    private animateModalEntry(
        backdrop: HTMLElement, content: HTMLElement
    ): void
    {
        requestAnimationFrame(() =>
        {
            backdrop.classList.add(`${CLS}-entering`);
            content.classList.add(`${CLS}-entering`);
        });
    }

    // ========================================================================
    // BUILD — FULLPAGE
    // ========================================================================

    private buildFullpage(): void
    {
        if (!this.rootEl) { return; }
        const header = this.buildFullpageHeader();
        this.rootEl.appendChild(header);

        const body = createElement("div", [`${CLS}-fullpage-body`]);
        if (this.hasCategoriesData() && this.opts.showCategories !== false)
        {
            body.appendChild(this.buildSidebar());
        }
        const content = createElement("div", [`${CLS}-fullpage-content`]);
        this.sectionsEl = content;
        body.appendChild(content);
        this.rootEl.appendChild(body);

        this.liveRegionEl = this.buildLiveRegion();
        this.rootEl.appendChild(this.liveRegionEl);
    }

    private buildFullpageHeader(): HTMLElement
    {
        const header = createElement("div", [`${CLS}-fullpage-header`]);
        const heading = createElement(
            "h1", [`${CLS}-fullpage-heading`], "All Applications"
        );
        header.appendChild(heading);
        this.appendSearchTo(header);
        return header;
    }

    private renderFullpageContent(): void
    {
        this.opened = true;
        this.filteredApps = [...this.apps];
        this.renderContent();
    }

    // ========================================================================
    // BUILD — SEARCH
    // ========================================================================

    private appendSearchToPortal(): void
    {
        if (this.opts.showSearch === false) { return; }
        this.appendSearchTo(this.portalEl!);
    }

    private appendSearchTo(parent: HTMLElement): void
    {
        if (this.opts.showSearch === false) { return; }
        const row = createElement("div", [`${CLS}-search`]);
        const icon = document.createElement("i");
        addIconClasses(icon, "bi bi-search");
        icon.className += ` ${CLS}-search-icon`;
        setAttr(icon, "aria-hidden", "true");
        row.appendChild(icon);

        this.searchInputEl = this.buildSearchInput();
        row.appendChild(this.searchInputEl);
        parent.appendChild(row);
    }

    private buildSearchInput(): HTMLInputElement
    {
        const input = document.createElement("input");
        input.type = "text";
        input.className = `${CLS}-search-input`;
        setAttr(input, "role", "searchbox");
        setAttr(input, "aria-label", "Search apps");
        input.placeholder = this.opts.placeholder ?? "Search apps...";
        input.autocomplete = "off";
        input.addEventListener("input", () => this.onSearchInput());
        input.addEventListener("keydown", (e) => this.onSearchKeydown(e));
        return input;
    }

    private onSearchKeydown(e: KeyboardEvent): void
    {
        if (this.matchesKeyCombo(e, "focusDown"))
        {
            e.preventDefault();
            if (this.visibleTiles.length > 0) { this.setFocusIdx(0); }
        }
    }

    // ========================================================================
    // BUILD — TABS (DROPDOWN / MODAL)
    // ========================================================================

    private appendTabsIfNeeded(): void
    {
        if (!this.portalEl) { return; }
        this.appendTabsTo(this.portalEl);
    }

    private appendTabsTo(parent: HTMLElement): void
    {
        if (!this.hasCategoriesData()) { return; }
        if (this.opts.showCategories === false) { return; }
        parent.appendChild(this.buildTabs());
    }

    private buildTabs(): HTMLElement
    {
        const nav = createElement("div", [`${CLS}-tabs`]);
        setAttr(nav, "role", "tablist");
        nav.appendChild(this.buildTabItem("all", "All"));
        this.getSortedCategories().forEach(cat =>
        {
            nav.appendChild(this.buildTabItem(cat.id, cat.label, cat.icon));
        });
        return nav;
    }

    private buildTabItem(
        id: string, label: string, icon?: string
    ): HTMLElement
    {
        const tab = document.createElement("button");
        tab.className = `${CLS}-tab`;
        setAttr(tab, "type", "button");
        setAttr(tab, "role", "tab");
        setAttr(tab, "aria-selected", String(this.activeTab === id));
        if (this.activeTab === id)
        {
            tab.classList.add(`${CLS}-tab-active`);
        }
        this.appendTabContent(tab, label, icon);
        tab.addEventListener("click", () => this.onTabClick(id));
        return tab;
    }

    private appendTabContent(
        tab: HTMLElement, label: string, icon?: string
    ): void
    {
        if (icon)
        {
            const i = document.createElement("i");
            addIconClasses(i, icon);
            setAttr(i, "aria-hidden", "true");
            tab.appendChild(i);
            tab.appendChild(document.createTextNode(" "));
        }
        tab.appendChild(document.createTextNode(label));
    }

    // ========================================================================
    // BUILD — SIDEBAR (FULLPAGE)
    // ========================================================================

    private buildSidebar(): HTMLElement
    {
        const sidebar = createElement("div", [`${CLS}-sidebar`]);
        setAttr(sidebar, "role", "navigation");
        setAttr(sidebar, "aria-label", "App categories");
        sidebar.appendChild(
            this.buildSidebarItem("all", "All", "bi bi-grid")
        );
        this.getSortedCategories().forEach(cat =>
        {
            sidebar.appendChild(
                this.buildSidebarItem(cat.id, cat.label, cat.icon)
            );
        });
        return sidebar;
    }

    private buildSidebarItem(
        id: string, label: string, icon?: string
    ): HTMLElement
    {
        const item = document.createElement("button");
        item.className = `${CLS}-sidebar-item`;
        setAttr(item, "type", "button");
        if (this.activeTab === id)
        {
            item.classList.add(`${CLS}-sidebar-active`);
        }
        this.appendSidebarContent(item, label, icon);
        item.addEventListener("click", () => this.onSidebarClick(id));
        return item;
    }

    private appendSidebarContent(
        item: HTMLElement, label: string, icon?: string
    ): void
    {
        if (icon)
        {
            const i = document.createElement("i");
            addIconClasses(i, icon);
            setAttr(i, "aria-hidden", "true");
            item.appendChild(i);
            item.appendChild(document.createTextNode(" "));
        }
        item.appendChild(document.createTextNode(label));
    }

    // ========================================================================
    // BUILD — FOOTER (DROPDOWN)
    // ========================================================================

    private appendFooter(): void
    {
        if (this.getMode() !== "dropdown" || !this.portalEl) { return; }
        const footer = createElement("div", [`${CLS}-footer`]);
        const link = document.createElement("button");
        link.className = `${CLS}-footer-link`;
        setAttr(link, "type", "button");
        link.textContent = "View all apps";
        link.addEventListener("click", () => this.onViewAllClick());
        footer.appendChild(link);
        this.portalEl.appendChild(footer);
    }

    private onViewAllClick(): void
    {
        this.close();
        logInfo("View all apps clicked");
    }

    // ========================================================================
    // BUILD — LIVE REGION
    // ========================================================================

    private buildLiveRegion(): HTMLElement
    {
        const live = createElement("div", ["visually-hidden"]);
        setAttr(live, "aria-live", "polite");
        setAttr(live, "aria-atomic", "true");
        return live;
    }

    // ========================================================================
    // RENDER CONTENT
    // ========================================================================

    renderContent(): void
    {
        if (!this.sectionsEl) { return; }
        this.sectionsEl.innerHTML = "";
        this.visibleTiles = [];
        this.focusedIdx = -1;

        if (this.searchQuery.length > 0)
        {
            this.renderSearchResults();
            return;
        }
        this.renderFavoritesSection();
        this.renderRecentSection();
        this.renderAllAppsSection();
    }

    private renderSearchResults(): void
    {
        const apps = this.getVisibleApps();
        if (apps.length === 0)
        {
            this.renderEmptyState("No apps found");
            return;
        }
        this.appendGrid(apps);
    }

    private renderFavoritesSection(): void
    {
        if (this.opts.showFavorites === false) { return; }
        const favApps = this.getFavoriteApps();
        if (favApps.length === 0) { return; }
        this.appendSection("Favorites", favApps);
    }

    private renderRecentSection(): void
    {
        if (this.opts.showRecent === false) { return; }
        const recentApps = this.getRecentApps();
        if (recentApps.length === 0) { return; }
        this.appendSection("Recently Used", recentApps);
    }

    private renderAllAppsSection(): void
    {
        const apps = this.getVisibleApps();
        if (apps.length === 0)
        {
            this.renderEmptyState("No apps available");
            return;
        }
        this.appendSection("All Apps", apps);
    }

    private appendSection(title: string, apps: AppItem[]): void
    {
        if (!this.sectionsEl) { return; }
        const section = createElement("div", [`${CLS}-section`]);
        const header = createElement(
            "div", [`${CLS}-section-header`], title
        );
        section.appendChild(header);
        section.appendChild(this.buildGrid(apps));
        this.sectionsEl.appendChild(section);
    }

    private appendGrid(apps: AppItem[]): void
    {
        if (!this.sectionsEl) { return; }
        this.sectionsEl.appendChild(this.buildGrid(apps));
    }

    private renderEmptyState(msg: string): void
    {
        if (!this.sectionsEl) { return; }
        const empty = createElement("div", [`${CLS}-empty`], msg);
        this.sectionsEl.appendChild(empty);
    }

    // ========================================================================
    // BUILD — GRID & TILES
    // ========================================================================

    private buildGrid(apps: AppItem[]): HTMLElement
    {
        const grid = createElement("div", [`${CLS}-grid`]);
        setAttr(grid, "role", "grid");
        setAttr(grid, "aria-label", "Applications");
        const cols = this.getColumnsPerRow();
        grid.style.setProperty("--al-cols", String(cols));

        let row: HTMLElement | null = null;
        apps.forEach((app, i) =>
        {
            if (i % cols === 0)
            {
                row = createElement("div", [`${CLS}-row`]);
                setAttr(row!, "role", "row");
                grid.appendChild(row!);
            }
            const tile = this.buildTile(app);
            row!.appendChild(tile);
            this.visibleTiles.push(tile);
        });
        return grid;
    }

    private buildTile(app: AppItem): HTMLElement
    {
        const tile = createElement("div", [`${CLS}-tile`]);
        setAttr(tile, "role", "gridcell");
        setAttr(tile, "data-app-id", app.id);
        const tabIdx = this.visibleTiles.length === 0 ? "0" : "-1";
        setAttr(tile, "tabindex", tabIdx);

        this.applyTileState(tile, app);
        tile.appendChild(this.buildTileIcon(app));
        tile.appendChild(this.buildTileName(app));
        this.appendTileBadge(tile, app);
        this.appendTileFavBtn(tile, app);
        this.attachTileListeners(tile, app);
        return tile;
    }

    private applyTileState(tile: HTMLElement, app: AppItem): void
    {
        if (app.id === this.activeAppId)
        {
            tile.classList.add(`${CLS}-tile-active`);
            setAttr(tile, "aria-current", "true");
        }
        if (app.disabled)
        {
            tile.classList.add(`${CLS}-tile-disabled`);
            setAttr(tile, "aria-disabled", "true");
        }
    }

    private attachTileListeners(
        tile: HTMLElement, app: AppItem
    ): void
    {
        if (app.disabled) { return; }
        tile.addEventListener("click", () => this.onTileClick(app));
        tile.addEventListener("keydown", e => this.handleGridKeydown(e));
    }

    private buildTileIcon(app: AppItem): HTMLElement
    {
        const container = createElement("span", [`${CLS}-tile-icon`]);
        setAttr(container, "aria-hidden", "true");
        if (app.iconUrl)
        {
            return this.buildTileImgIcon(container, app.iconUrl);
        }
        if (app.icon)
        {
            const i = document.createElement("i");
            addIconClasses(i, app.icon);
            container.appendChild(i);
            return container;
        }
        return this.buildTileInitial(container, app.name);
    }

    private buildTileImgIcon(
        container: HTMLElement, url: string
    ): HTMLElement
    {
        const img = document.createElement("img");
        img.className = `${CLS}-tile-img`;
        img.src = url;
        img.alt = "";
        container.appendChild(img);
        return container;
    }

    private buildTileInitial(
        container: HTMLElement, name: string
    ): HTMLElement
    {
        const initial = createElement("span", [`${CLS}-tile-initial`]);
        initial.textContent = name.charAt(0).toUpperCase();
        const colorIdx = hashString(name) % INITIALS_PALETTE.length;
        initial.style.backgroundColor = INITIALS_PALETTE[colorIdx];
        container.appendChild(initial);
        return container;
    }

    private buildTileName(app: AppItem): HTMLElement
    {
        return createElement("span", [`${CLS}-tile-name`], app.name);
    }

    private appendTileBadge(tile: HTMLElement, app: AppItem): void
    {
        if (!app.badge) { return; }
        const variant = app.badgeVariant ?? "info";
        const badge = createElement("span", [
            `${CLS}-tile-badge`,
            `${CLS}-tile-badge-${variant}`,
        ]);
        badge.textContent = app.badge;
        tile.appendChild(badge);
    }

    private appendTileFavBtn(tile: HTMLElement, app: AppItem): void
    {
        if (this.opts.showFavorites === false) { return; }
        tile.appendChild(this.buildTileFavBtn(app));
    }

    private buildTileFavBtn(app: AppItem): HTMLElement
    {
        const isFav = this.favorites.includes(app.id);
        const btn = document.createElement("button");
        btn.className = `${CLS}-tile-fav`;
        setAttr(btn, "type", "button");
        const label = isFav
            ? `Remove ${app.name} from favorites`
            : `Add ${app.name} to favorites`;
        setAttr(btn, "aria-label", label);
        setAttr(btn, "aria-pressed", String(isFav));
        this.appendFavIcon(btn, isFav);
        btn.addEventListener("click", (e) =>
        {
            e.stopPropagation();
            this.toggleFavorite(app.id);
        });
        return btn;
    }

    private appendFavIcon(btn: HTMLElement, isFav: boolean): void
    {
        const icon = document.createElement("i");
        addIconClasses(icon, isFav ? "bi bi-star-fill" : "bi bi-star");
        setAttr(icon, "aria-hidden", "true");
        btn.appendChild(icon);
    }

    // ========================================================================
    // SEARCH
    // ========================================================================

    private onSearchInput(): void
    {
        this.searchQuery = this.searchInputEl?.value.trim() ?? "";
        this.debouncedSearch();
    }

    private async applySearch(): Promise<void>
    {
        if (this.opts.onSearch && this.searchQuery.length > 0)
        {
            await this.applyAsyncSearch();
        }
        else
        {
            this.applyLocalSearch();
        }
        this.renderContent();
        this.focusedIdx = -1;
        this.announce(`${this.filteredApps.length} apps found`);
    }

    private async applyAsyncSearch(): Promise<void>
    {
        try
        {
            const results = await this.opts.onSearch!(this.searchQuery);
            this.filteredApps = results;
        }
        catch (err)
        {
            logWarn("Async search failed:", err);
            this.filteredApps = this.filterLocal(this.searchQuery);
        }
    }

    private applyLocalSearch(): void
    {
        this.filteredApps = this.searchQuery.length > 0
            ? this.filterLocal(this.searchQuery) : [...this.apps];
    }

    private filterLocal(query: string): AppItem[]
    {
        const lower = query.toLowerCase();
        return this.apps.filter(app => this.matchesQuery(app, lower));
    }

    private matchesQuery(app: AppItem, lower: string): boolean
    {
        if (app.name.toLowerCase().includes(lower)) { return true; }
        if (app.description?.toLowerCase().includes(lower)) { return true; }
        if (app.category?.toLowerCase().includes(lower)) { return true; }
        return false;
    }

    // ========================================================================
    // FAVORITES
    // ========================================================================

    private loadFavorites(): void
    {
        const key = this.opts.favoritesKey ?? DEFAULT_FAV_KEY;
        const data = loadFromStorage<string[]>(key);
        this.favorites = Array.isArray(data) ? data : [];
    }

    private saveFavorites(): void
    {
        saveToStorage(
            this.opts.favoritesKey ?? DEFAULT_FAV_KEY, this.favorites
        );
    }

    toggleFavorite(appId: string): void
    {
        const idx = this.favorites.indexOf(appId);
        const isFav = idx === -1;
        if (isFav) { this.favorites.push(appId); }
        else { this.favorites.splice(idx, 1); }

        this.saveFavorites();
        safeCallback(this.opts.onFavoriteToggle, appId, isFav);
        if (this.opened) { this.renderContent(); }
        const app = this.apps.find(a => a.id === appId);
        const name = app?.name ?? appId;
        const msg = isFav
            ? `${name} added to favorites`
            : `${name} removed from favorites`;
        this.announce(msg);
    }

    getFavorites(): string[] { return [...this.favorites]; }

    setFavorites(ids: string[]): void
    {
        this.favorites = [...ids];
        this.saveFavorites();
        if (this.opened) { this.renderContent(); }
    }

    clearFavorites(): void
    {
        this.favorites = [];
        this.saveFavorites();
        if (this.opened) { this.renderContent(); }
    }

    // ========================================================================
    // RECENT
    // ========================================================================

    private loadRecent(): void
    {
        const key = this.opts.recentKey ?? DEFAULT_RECENT_KEY;
        const data = loadFromStorage<string[]>(key);
        this.recent = Array.isArray(data) ? data : [];
    }

    private saveRecent(): void
    {
        saveToStorage(
            this.opts.recentKey ?? DEFAULT_RECENT_KEY, this.recent
        );
    }

    private pushRecent(appId: string): void
    {
        this.recent = this.recent.filter(id => id !== appId);
        this.recent.unshift(appId);
        const max = this.opts.maxRecent ?? DEFAULT_MAX_RECENT;
        if (this.recent.length > max)
        {
            this.recent = this.recent.slice(0, max);
        }
        this.saveRecent();
    }

    getRecent(): string[] { return [...this.recent]; }

    clearRecent(): void
    {
        this.recent = [];
        this.saveRecent();
        if (this.opened) { this.renderContent(); }
    }

    // ========================================================================
    // APP LISTS
    // ========================================================================

    private getVisibleApps(): AppItem[]
    {
        if (this.searchQuery.length > 0) { return this.filteredApps; }
        if (this.activeTab !== "all")
        {
            return this.getCategoryApps(this.activeTab);
        }
        return this.filteredApps;
    }

    private getFavoriteApps(): AppItem[]
    {
        return this.favorites
            .map(id => this.apps.find(a => a.id === id))
            .filter((a): a is AppItem => a != null);
    }

    private getRecentApps(): AppItem[]
    {
        return this.recent
            .map(id => this.apps.find(a => a.id === id))
            .filter((a): a is AppItem => a != null);
    }

    private getCategoryApps(catId: string): AppItem[]
    {
        return this.filteredApps.filter(a => a.category === catId);
    }

    private getSortedCategories(): AppCategory[]
    {
        if (!this.opts.categories) { return []; }
        return [...this.opts.categories].sort(
            (a, b) => (a.order ?? 0) - (b.order ?? 0)
        );
    }

    private hasCategoriesData(): boolean
    {
        return (this.opts.categories?.length ?? 0) > 0;
    }

    // ========================================================================
    // GRID FOCUS & NAVIGATION
    // ========================================================================

    private setFocusIdx(idx: number): void
    {
        if (idx < 0 || idx >= this.visibleTiles.length) { return; }
        this.clearCurrentFocus();
        this.focusedIdx = idx;
        const tile = this.visibleTiles[idx];
        setAttr(tile, "tabindex", "0");
        tile.focus();
    }

    private clearCurrentFocus(): void
    {
        if (this.focusedIdx < 0) { return; }
        if (this.focusedIdx >= this.visibleTiles.length) { return; }
        setAttr(this.visibleTiles[this.focusedIdx], "tabindex", "-1");
    }

    private moveFocus(delta: number): void
    {
        const next = this.focusedIdx + delta;
        if (next < 0 || next >= this.visibleTiles.length) { return; }
        this.setFocusIdx(next);
    }

    private getColumnsPerRow(): number
    {
        if (this.opts.columns) { return this.opts.columns; }
        return DEFAULT_COLUMNS[this.getMode()] ?? 3;
    }

    private handleGridKeydown(e: KeyboardEvent): void
    {
        if (this.matchesKeyCombo(e, "focusDown"))
        {
            e.preventDefault();
            this.moveFocus(this.getColumnsPerRow());
        }
        else if (this.matchesKeyCombo(e, "focusUp"))
        {
            e.preventDefault();
            this.moveFocus(-this.getColumnsPerRow());
        }
        else
        {
            this.handleGridHorizKeys(e);
        }
    }

    private handleGridHorizKeys(e: KeyboardEvent): void
    {
        if (this.matchesKeyCombo(e, "focusRight"))
        {
            e.preventDefault();
            this.moveFocus(1);
        }
        else if (this.matchesKeyCombo(e, "focusLeft"))
        {
            e.preventDefault();
            this.moveFocus(-1);
        }
        else
        {
            this.handleGridActionKeys(e);
        }
    }

    private handleGridActionKeys(e: KeyboardEvent): void
    {
        if (this.matchesKeyCombo(e, "focusFirst"))
        {
            e.preventDefault();
            this.setFocusIdx(0);
        }
        else if (this.matchesKeyCombo(e, "focusLast"))
        {
            e.preventDefault();
            this.setFocusIdx(this.visibleTiles.length - 1);
        }
        else
        {
            this.handleGridSelectFav(e);
        }
    }

    private handleGridSelectFav(e: KeyboardEvent): void
    {
        if (this.matchesKeyCombo(e, "select"))
        {
            e.preventDefault();
            this.selectFocusedTile();
        }
        else if (this.matchesKeyCombo(e, "toggleFav"))
        {
            e.preventDefault();
            this.toggleFocusedFav();
        }
        else if (this.matchesKeyCombo(e, "focusSearch"))
        {
            e.preventDefault();
            this.searchInputEl?.focus();
        }
    }

    private selectFocusedTile(): void
    {
        if (this.focusedIdx < 0) { return; }
        if (this.focusedIdx >= this.visibleTiles.length) { return; }
        const tile = this.visibleTiles[this.focusedIdx];
        const appId = tile.getAttribute("data-app-id") ?? "";
        const app = this.apps.find(a => a.id === appId);
        if (app && !app.disabled) { this.onTileClick(app); }
    }

    private toggleFocusedFav(): void
    {
        if (this.focusedIdx < 0) { return; }
        if (this.focusedIdx >= this.visibleTiles.length) { return; }
        const tile = this.visibleTiles[this.focusedIdx];
        const appId = tile.getAttribute("data-app-id") ?? "";
        if (appId) { this.toggleFavorite(appId); }
    }

    // ========================================================================
    // EVENT HANDLERS
    // ========================================================================

    private onTriggerClick(): void
    {
        if (this.opened) { this.close(); }
        else { this.open(); }
    }

    private onDocClick(e: MouseEvent): void
    {
        if (!this.portalEl || !this.triggerEl) { return; }
        const target = e.target as Node;
        const inPortal = this.portalEl.contains(target);
        const inTrigger = this.triggerEl.contains(target);
        if (inPortal || inTrigger) { return; }
        this.close();
    }

    private onDocKeydown(e: KeyboardEvent): void
    {
        if (!this.opened) { return; }
        if (this.matchesKeyCombo(e, "close"))
        {
            e.preventDefault();
            this.close();
        }
        else if (this.shouldFocusSearch(e))
        {
            e.preventDefault();
            this.searchInputEl?.focus();
        }
    }

    private shouldFocusSearch(e: KeyboardEvent): boolean
    {
        if (!this.matchesKeyCombo(e, "focusSearch")) { return false; }
        return document.activeElement !== this.searchInputEl;
    }

    private onTileClick(app: AppItem): void
    {
        this.pushRecent(app.id);
        if (this.getMode() !== "fullpage") { this.close(); }
        safeCallback(this.opts.onSelect, app);
        logInfo(`Selected app: ${app.name}`);
    }

    private onTabClick(categoryId: string): void
    {
        this.activeTab = categoryId;
        this.renderContent();
        const msg = categoryId === "all"
            ? "Showing all apps" : `Showing ${categoryId} apps`;
        this.announce(msg);
    }

    private onSidebarClick(categoryId: string): void
    {
        this.activeTab = categoryId;
        this.renderContent();
        this.updateSidebarActive();
        const msg = categoryId === "all"
            ? "Showing all apps" : `Showing ${categoryId} apps`;
        this.announce(msg);
    }

    private updateSidebarActive(): void
    {
        if (!this.rootEl) { return; }
        const items = this.rootEl.querySelectorAll(`.${CLS}-sidebar-item`);
        items.forEach(el =>
        {
            el.classList.remove(`${CLS}-sidebar-active`);
        });
        const active = this.rootEl.querySelector(
            `.${CLS}-sidebar-item:nth-child(${this.getSidebarIndex() + 1})`
        );
        active?.classList.add(`${CLS}-sidebar-active`);
    }

    private getSidebarIndex(): number
    {
        if (this.activeTab === "all") { return 0; }
        const cats = this.getSortedCategories();
        const idx = cats.findIndex(c => c.id === this.activeTab);
        return idx + 1;
    }

    // ========================================================================
    // LISTENER MANAGEMENT
    // ========================================================================

    private addDocListeners(): void
    {
        document.addEventListener("mousedown", this.boundOnDocClick, true);
        document.addEventListener("keydown", this.boundOnDocKeydown, true);
    }

    private removeDocListeners(): void
    {
        document.removeEventListener(
            "mousedown", this.boundOnDocClick, true
        );
        document.removeEventListener(
            "keydown", this.boundOnDocKeydown, true
        );
    }

    private removePortal(): void
    {
        if (!this.portalEl) { return; }
        this.portalEl.parentElement?.removeChild(this.portalEl);
        this.portalEl = null;
    }

    // ========================================================================
    // FOCUS HELPERS
    // ========================================================================

    private focusSearchOrFirst(): void
    {
        requestAnimationFrame(() =>
        {
            if (this.searchInputEl && this.opts.showSearch !== false)
            {
                this.searchInputEl.focus();
            }
            else if (this.visibleTiles.length > 0)
            {
                this.setFocusIdx(0);
            }
        });
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
        return this.testCombo(e, combo);
    }

    private testCombo(e: KeyboardEvent, combo: string): boolean
    {
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
    // ANNOUNCEMENT
    // ========================================================================

    private announce(text: string): void
    {
        if (!this.liveRegionEl) { return; }
        this.liveRegionEl.textContent = text;
    }

    // ========================================================================
    // PUBLIC API — APPS
    // ========================================================================

    getApps(): AppItem[] { return [...this.apps]; }

    setApps(apps: AppItem[]): void
    {
        this.apps = [...apps];
        this.filteredApps = [...this.apps];
        if (this.opened) { this.renderContent(); }
    }

    addApp(app: AppItem): void
    {
        this.apps.push(app);
        this.filteredApps = [...this.apps];
        if (this.opened) { this.renderContent(); }
    }

    removeApp(id: string): void
    {
        this.apps = this.apps.filter(a => a.id !== id);
        this.filteredApps = this.filteredApps.filter(a => a.id !== id);
        this.favorites = this.favorites.filter(fid => fid !== id);
        this.recent = this.recent.filter(rid => rid !== id);
        if (this.opened) { this.renderContent(); }
    }

    updateApp(id: string, updates: Partial<AppItem>): void
    {
        const idx = this.apps.findIndex(a => a.id === id);
        if (idx === -1)
        {
            logWarn("App not found:", id);
            return;
        }
        this.apps[idx] = { ...this.apps[idx], ...updates };
        this.filteredApps = [...this.apps];
        if (this.opened) { this.renderContent(); }
    }

    // ========================================================================
    // PUBLIC API — ACTIVE / CATEGORIES / SEARCH / MODE
    // ========================================================================

    getActiveAppId(): string { return this.activeAppId; }

    setActiveAppId(id: string): void
    {
        this.activeAppId = id;
        if (this.opened) { this.renderContent(); }
    }

    setCategories(categories: AppCategory[]): void
    {
        this.opts.categories = [...categories];
        if (this.opened) { this.renderContent(); }
    }

    setSearchQuery(query: string): void
    {
        this.searchQuery = query;
        if (this.searchInputEl) { this.searchInputEl.value = query; }
        this.applyLocalSearch();
        if (this.opened) { this.renderContent(); }
    }

    getMode(): AppLauncherMode { return this.opts.mode ?? "dropdown"; }
}

// ============================================================================
// FACTORY & GLOBALS
// ============================================================================

export function createAppLauncher(
    options: AppLauncherOptions,
    containerId?: string
): AppLauncher
{
    const launcher = new AppLauncher(options);
    if (containerId)
    {
        launcher.show(containerId);
    }
    return launcher;
}

(window as unknown as Record<string, unknown>).AppLauncher = AppLauncher;
(window as unknown as Record<string, unknown>).createAppLauncher = createAppLauncher;
