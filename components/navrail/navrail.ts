/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: NavRail
 * 📜 PURPOSE: App-level primary navigation. Collapses to an icon rail and
 *    expands to a categorized drawer. Emits navigation events — the host
 *    app owns page content rendering.
 * 🔗 RELATES: [[EnterpriseTheme]], [[CustomComponents]], [[Sidebar]],
 *    [[Toolbar]], [[CommandPalette]]
 * ⚡ FLOW: [Consumer App] -> [createNavRail()] -> [DOM nav element]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

/** Edge the rail is pinned to. */
export type NavRailPosition = "left" | "right";

/** Size variant. */
export type NavRailSize = "sm" | "md" | "lg";

/** Colour variant for badges. */
export type NavRailBadgeVariant =
    "default" | "danger" | "success" | "warning";

/** A single leaf or parent nav item. */
export interface NavRailItem
{
    /** Stable id, referenced by `activeId`, `setActive`, `setBadge`, etc. */
    id: string;

    /** Bootstrap Icons class (e.g. "bi-speedometer2"). Required. */
    icon: string;

    /** Display label (shown expanded; also tooltip when collapsed). */
    label: string;

    /** Explicit tooltip text. Defaults to `label`. */
    tooltip?: string;

    /** Badge text / number. Shown as pill when expanded, dot when collapsed. */
    badge?: string | number;

    /** Badge colour variant. Default: "default". */
    badgeVariant?: NavRailBadgeVariant;

    /** When children exist, whether the parent itself is activatable. */
    hasOwnPage?: boolean;

    /** Sub-pages. Render indented (expanded) or in flyout (collapsed). */
    children?: NavRailItem[];

    /** Visually and semantically disabled; cannot be activated. */
    disabled?: boolean;

    /** Hidden from the rail entirely. */
    hidden?: boolean;

    /** Additional CSS class(es) on the item button. */
    cssClass?: string;

    /** Arbitrary payload passed back via `onNavigate`. */
    data?: Record<string, unknown>;
}

/** A labelled group of nav items. */
export interface NavRailCategory
{
    /** Stable id. */
    id: string;

    /** Display label — rendered above items when expanded. */
    label: string;

    /** Items in display order. */
    items: NavRailItem[];
}

/** Optional header block (brand, tenant, plan). */
export interface NavRailHeader
{
    /** Fully custom element — takes precedence over the other fields. */
    content?: HTMLElement;

    /** Bootstrap Icons class for a brand glyph. */
    brandIcon?: string;

    /** Short text mark — e.g. "K" in a 32x32 tile. */
    brandInitials?: string;

    /** Primary title line. */
    title?: string;

    /** Secondary/subtitle line. */
    subtitle?: string;

    /** Click handler (e.g. open workspace switcher). */
    onClick?: () => void;
}

/** Optional search row (delegates to CommandPalette or similar). */
export interface NavRailSearch
{
    /** Placeholder text shown inside the search input. */
    placeholder?: string;

    /** Visual hint (e.g. "⌘K"). */
    shortcutHint?: string;

    /** Fired when the search row or collapsed search icon is activated. */
    onActivate: () => void;
}

/** Optional footer block (account, settings). */
export interface NavRailFooter
{
    /** Fully custom element — takes precedence over items. */
    content?: HTMLElement;

    /** Items to render at the bottom (behave like regular items). */
    items?: NavRailItem[];
}

/** Constructor configuration. */
export interface NavRailOptions
{
    /** Container element to mount into. Required. */
    container: HTMLElement;

    /** Stable instance id. Auto-generated if omitted. */
    id?: string;

    /** Edge to pin to. Default: "left". */
    position?: NavRailPosition;

    /** Start collapsed. Default: false. */
    collapsed?: boolean;

    /** Width in px when collapsed. Default: 48. */
    collapsedWidth?: number;

    /** Width in px when expanded. Default: 240. */
    width?: number;

    /** Lower bound for expanded width (resizable). Default: 200. */
    minWidth?: number;

    /** Upper bound for expanded width (resizable). Default: 320. */
    maxWidth?: number;

    /** Enable a drag handle on the trailing edge. Default: false. */
    resizable?: boolean;

    /** Size variant. Default: "md". */
    size?: NavRailSize;

    /** Optional brand/tenant header. */
    header?: NavRailHeader;

    /** Optional search row (delegates to host — e.g. CommandPalette). */
    search?: NavRailSearch;

    /** Category groups. Required (may be empty array). */
    categories: NavRailCategory[];

    /** Optional footer (account, settings). */
    footer?: NavRailFooter;

    /** Initially active item id. */
    activeId?: string;

    /** localStorage key for collapsed-state persistence. Opt-in. */
    persistStateKey?: string;

    /** ARIA label for the <nav> root. Default: "Primary". */
    ariaLabel?: string;

    /** Extra class names on the root. */
    cssClass?: string;

    /** Custom keyboard combos. Known actions: `toggleCollapseLeft`,
     * `toggleCollapseRight`. */
    keyBindings?: Record<string, string>;

    /** Contained mode: sized by parent, no viewport pinning. Default: false. */
    contained?: boolean;

    /** Fires when an item is activated. Required. */
    onNavigate: (id: string, item: NavRailItem, evt?: Event) => void;

    /** Fires when collapsed state changes. */
    onCollapseToggle?: (collapsed: boolean) => void;

    /** Fires when the search row / collapsed search icon is activated. */
    onSearchOpen?: () => void;
}

/** Public handle returned by `createNavRail`. */
export interface NavRailHandle
{
    collapse(): void;
    expand(): void;
    toggleCollapse(): void;
    isCollapsed(): boolean;
    setActive(id: string): void;
    getActive(): string | undefined;
    setCategories(categories: NavRailCategory[]): void;
    setBadge(
        itemId: string,
        badge: string | number | null,
        variant?: NavRailBadgeVariant
    ): void;
    setDisabled(itemId: string, disabled: boolean): void;
    setVisible(itemId: string, visible: boolean): void;
    getRootElement(): HTMLElement | null;
    destroy(): void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[NavRail]";

const _lu = (typeof (window as unknown as Record<string, unknown>)
    .createLogUtility === "function")
    ? ((window as unknown as Record<string, unknown>)
        .createLogUtility as () => { getLogger: (n: string) => unknown })()
        .getLogger(LOG_PREFIX.slice(1, -1)) as {
            info: (...a: unknown[]) => void;
            warn: (...a: unknown[]) => void;
            error: (...a: unknown[]) => void;
            debug: (...a: unknown[]) => void;
            trace: (...a: unknown[]) => void;
        }
    : null;

function logInfo(...a: unknown[]): void
{
    if (_lu) { _lu.info(...a); return; }
    console.log(new Date().toISOString(), "[INFO]", LOG_PREFIX, ...a);
}

function logWarn(...a: unknown[]): void
{
    if (_lu) { _lu.warn(...a); return; }
    console.warn(new Date().toISOString(), "[WARN]", LOG_PREFIX, ...a);
}

function logDebug(...a: unknown[]): void
{
    if (_lu) { _lu.debug(...a); return; }
    console.debug(new Date().toISOString(), "[DEBUG]", LOG_PREFIX, ...a);
}

/** Default expanded width in px. */
const DEFAULT_WIDTH = 240;

/** Default collapsed width in px. */
const DEFAULT_COLLAPSED_WIDTH = 48;

/** Default aria-label. */
const DEFAULT_ARIA_LABEL = "Primary";

/** Allowlist for icon class names (sanity check). */
const ICON_CLASS_RE = /^(bi|fa|fas|far|fab)-[a-z0-9-]+$/i;

/** Flyout offset from the rail in px. */
const FLYOUT_GAP = 4;

/** Default key bindings. */
const DEFAULT_KEY_BINDINGS: Record<string, string> = {
    toggleCollapseLeft: "Ctrl+`",
    toggleCollapseRight: "Ctrl+B",
};

/** Instance counter for unique ids. */
let instanceCounter = 0;

// ============================================================================
// MANAGER — CSS custom properties, multi-rail coordination
// ============================================================================

// ⚓ NavRailManager
/**
 * Singleton that keeps `--navrail-left-width` / `--navrail-right-width`
 * in sync with mounted rails so Sidebar + app content can offset around
 * them. Does not own layout itself.
 */
export class NavRailManager
{
    private static instance: NavRailManager | null = null;
    private rails: Map<string, NavRail> = new Map();

    public static getInstance(): NavRailManager
    {
        if (!NavRailManager.instance)
        {
            NavRailManager.instance = new NavRailManager();
            if (typeof window !== "undefined")
            {
                (window as unknown as Record<string, unknown>)
                    .__navRailManager = NavRailManager.instance;
            }
        }
        return NavRailManager.instance;
    }

    public register(rail: NavRail): void
    {
        const existingAtEdge = this.rails.get(rail.getPosition());

        if (existingAtEdge && existingAtEdge !== rail)
        {
            if (this.isRailConnected(existingAtEdge))
            {
                logWarn(
                    "Another NavRail already registered at",
                    rail.getPosition(),
                    "— hiding newcomer."
                );
                const root = rail.getRootElement();

                if (root)
                {
                    root.hidden = true;
                }
                return;
            }

            // Previous rail is orphaned (parent detached) — drop it silently.
            this.rails.delete(rail.getPosition());
        }

        this.rails.set(rail.getPosition(), rail);
        this.updateCssCustomProperties();
    }

    private isRailConnected(rail: NavRail): boolean
    {
        const root = rail.getRootElement();
        return !!(root && root.isConnected);
    }

    public unregister(rail: NavRail): void
    {
        const atEdge = this.rails.get(rail.getPosition());

        if (atEdge === rail)
        {
            this.rails.delete(rail.getPosition());
        }
        this.updateCssCustomProperties();
    }

    public updateCssCustomProperties(): void
    {
        const root = document.documentElement;
        this.updateEdge("left", root);
        this.updateEdge("right", root);
    }

    private updateEdge(edge: NavRailPosition, root: HTMLElement): void
    {
        const cssVar = `--navrail-${edge}-width`;
        const rail = this.rails.get(edge);

        if (!rail)
        {
            root.style.removeProperty(cssVar);
            return;
        }

        const w = rail.getEffectiveWidth();
        root.style.setProperty(cssVar, `${w}px`);
    }
}

// ============================================================================
// PRIVATE HELPERS — DOM
// ============================================================================

function createElement(
    tag: string, classes: string[], text?: string
): HTMLElement
{
    const el = document.createElement(tag);

    if (classes.length > 0)
    {
        el.classList.add(...classes);
    }

    if (text !== undefined && text !== null)
    {
        el.textContent = text;
    }

    return el;
}

function setAttr(el: HTMLElement, name: string, value: string): void
{
    el.setAttribute(name, value);
}

function safeIconClass(cls: string | undefined): string | null
{
    if (!cls)
    {
        return null;
    }

    if (!ICON_CLASS_RE.test(cls))
    {
        logWarn("Rejecting suspicious icon class:", cls);
        return null;
    }
    return cls;
}

function iconPrefix(cls: string): string
{
    const dash = cls.indexOf("-");
    return dash > 0 ? cls.slice(0, dash) : "bi";
}

function buildIconEl(iconClass: string): HTMLElement
{
    const safe = safeIconClass(iconClass);
    const el = createElement("i", ["navrail-item-icon"]);

    if (safe)
    {
        el.classList.add(iconPrefix(safe), safe);
    }
    else
    {
        el.classList.add("bi", "bi-question-circle");
    }
    setAttr(el, "aria-hidden", "true");
    return el;
}

// ============================================================================
// PUBLIC API — NavRail
// ============================================================================

// @entrypoint
// ⚓ NavRail
/**
 * @internal Instance class. Consumers use {@link createNavRail} instead.
 */
export class NavRail
{
    private readonly options: NavRailOptions;
    private readonly instanceId: string;
    private readonly keyBindings: Record<string, string>;

    private rootEl: HTMLElement | null = null;
    private bodyEl: HTMLElement | null = null;
    private toggleBtn: HTMLElement | null = null;
    private flyoutEl: HTMLElement | null = null;
    private flyoutParentId: string | null = null;

    private position: NavRailPosition;
    private collapsed: boolean;
    private activeId: string | undefined;
    private categories: NavRailCategory[];
    private expandedParents: Set<string> = new Set();

    // DOM maps for O(1) item lookups.
    private itemEls: Map<string, HTMLElement> = new Map();
    private itemRefs: Map<string, NavRailItem> = new Map();

    // Bound handlers for removal on destroy.
    private boundDocKey: ((e: KeyboardEvent) => void) | null = null;
    private boundDocClick: ((e: MouseEvent) => void) | null = null;

    constructor(options: NavRailOptions)
    {
        instanceCounter += 1;
        this.instanceId = options.id
            || `navrail-${instanceCounter}-${Date.now().toString(36)}`;
        this.options = options;
        this.position = options.position || "left";
        this.collapsed = this.resolveInitialCollapsed();
        this.activeId = options.activeId;
        this.categories = options.categories || [];
        this.keyBindings = { ...DEFAULT_KEY_BINDINGS, ...options.keyBindings };

        this.buildDOM();
        this.mount();
        this.attachDocumentListeners();
        NavRailManager.getInstance().register(this);

        logInfo("Initialised:", this.instanceId, "at", this.position);
        logDebug("Categories:", this.categories.length);
    }

    // ========================================================================
    // PUBLIC — STATE QUERIES
    // ========================================================================

    public getRootElement(): HTMLElement | null
    {
        return this.rootEl;
    }

    public getPosition(): NavRailPosition
    {
        return this.position;
    }

    public isCollapsed(): boolean
    {
        return this.collapsed;
    }

    public getActive(): string | undefined
    {
        return this.activeId;
    }

    public getEffectiveWidth(): number
    {
        if (this.collapsed)
        {
            return this.options.collapsedWidth ?? DEFAULT_COLLAPSED_WIDTH;
        }
        return this.options.width ?? DEFAULT_WIDTH;
    }

    // ========================================================================
    // PUBLIC — STATE MUTATIONS
    // ========================================================================

    public collapse(): void
    {
        if (this.collapsed)
        {
            return;
        }

        this.collapsed = true;
        this.applyCollapsedClass();
        this.closeFlyout();
        this.persistCollapsedState();
        NavRailManager.getInstance().updateCssCustomProperties();

        if (this.options.onCollapseToggle)
        {
            this.options.onCollapseToggle(true);
        }
        logDebug("Collapsed:", this.instanceId);
    }

    public expand(): void
    {
        if (!this.collapsed)
        {
            return;
        }

        this.collapsed = false;
        this.applyCollapsedClass();
        this.closeFlyout();
        this.persistCollapsedState();
        NavRailManager.getInstance().updateCssCustomProperties();

        if (this.options.onCollapseToggle)
        {
            this.options.onCollapseToggle(false);
        }
        logDebug("Expanded:", this.instanceId);
    }

    public toggleCollapse(): void
    {
        if (this.collapsed)
        {
            this.expand();
        }
        else
        {
            this.collapse();
        }
    }

    public setActive(id: string): void
    {
        if (!this.itemEls.has(id))
        {
            logWarn("setActive: unknown id:", id);
            return;
        }

        // Unmark previous.
        if (this.activeId && this.itemEls.has(this.activeId))
        {
            const prev = this.itemEls.get(this.activeId)!;
            prev.classList.remove("navrail-item-active");
            prev.removeAttribute("aria-current");
        }

        this.activeId = id;
        const el = this.itemEls.get(id)!;
        el.classList.add("navrail-item-active");
        setAttr(el, "aria-current", "page");
    }

    public setCategories(categories: NavRailCategory[]): void
    {
        this.categories = categories;
        this.rebuildBody();
    }

    public setBadge(
        itemId: string,
        badge: string | number | null,
        variant?: NavRailBadgeVariant
    ): void
    {
        const item = this.itemRefs.get(itemId);
        const el = this.itemEls.get(itemId);

        if (!item || !el)
        {
            logWarn("setBadge: unknown id:", itemId);
            return;
        }

        if (badge === null || badge === undefined || badge === "")
        {
            this.clearItemBadge(item, el);
            return;
        }

        this.applyItemBadge(item, el, badge, variant);
    }

    private clearItemBadge(item: NavRailItem, el: HTMLElement): void
    {
        item.badge = undefined;
        const existing = el.querySelector(".navrail-item-badge");
        if (existing) { existing.remove(); }
    }

    private applyItemBadge(
        item: NavRailItem,
        el: HTMLElement,
        badge: string | number,
        variant?: NavRailBadgeVariant
    ): void
    {
        item.badge = badge;
        item.badgeVariant = variant ?? item.badgeVariant ?? "default";
        let badgeEl = el.querySelector<HTMLElement>(".navrail-item-badge");

        if (!badgeEl)
        {
            badgeEl = this.buildBadgeEl(item);
            el.appendChild(badgeEl);
            return;
        }
        this.refreshBadgeEl(badgeEl, item);
    }

    public setDisabled(itemId: string, disabled: boolean): void
    {
        const item = this.itemRefs.get(itemId);
        const el = this.itemEls.get(itemId);

        if (!item || !el)
        {
            logWarn("setDisabled: unknown id:", itemId);
            return;
        }

        item.disabled = disabled;
        el.classList.toggle("navrail-item-disabled", disabled);
        setAttr(el, "aria-disabled", disabled ? "true" : "false");

        if (disabled)
        {
            setAttr(el, "tabindex", "-1");
        }
        else
        {
            setAttr(el, "tabindex", "0");
        }
    }

    public setVisible(itemId: string, visible: boolean): void
    {
        const item = this.itemRefs.get(itemId);
        const el = this.itemEls.get(itemId);

        if (!item || !el)
        {
            logWarn("setVisible: unknown id:", itemId);
            return;
        }
        item.hidden = !visible;
        el.hidden = !visible;
    }

    public destroy(): void
    {
        this.closeFlyout();
        this.detachDocumentListeners();
        NavRailManager.getInstance().unregister(this);

        if (this.rootEl && this.rootEl.parentNode)
        {
            this.rootEl.parentNode.removeChild(this.rootEl);
        }

        this.itemEls.clear();
        this.itemRefs.clear();
        this.rootEl = null;
        this.bodyEl = null;
        this.toggleBtn = null;

        logDebug("Destroyed:", this.instanceId);
    }

    // ========================================================================
    // PRIVATE — INITIAL STATE
    // ========================================================================

    private resolveInitialCollapsed(): boolean
    {
        const key = this.options.persistStateKey;

        if (key)
        {
            try
            {
                const stored = localStorage.getItem(key);
                if (stored === "collapsed") { return true; }
                if (stored === "expanded") { return false; }
            }
            catch
            {
                // Storage unavailable — fall through to option default.
            }
        }

        return this.options.collapsed === true;
    }

    private persistCollapsedState(): void
    {
        const key = this.options.persistStateKey;
        if (!key) { return; }

        try
        {
            localStorage.setItem(key, this.collapsed ? "collapsed" : "expanded");
        }
        catch
        {
            // Ignore — quota, private mode, etc.
        }
    }

    // ========================================================================
    // PRIVATE — DOM BUILD
    // ========================================================================

    private buildDOM(): void
    {
        this.rootEl = this.buildRoot();

        if (this.options.header)
        {
            this.rootEl.appendChild(this.buildHeader(this.options.header));
        }

        if (this.options.search)
        {
            this.rootEl.appendChild(this.buildSearchRow(this.options.search));
        }

        this.bodyEl = createElement("div", ["navrail-body"]);
        setAttr(this.bodyEl, "role", "tree");
        this.rootEl.appendChild(this.bodyEl);
        this.renderCategories();

        if (this.options.footer)
        {
            this.rootEl.appendChild(this.buildFooter(this.options.footer));
        }

        this.rootEl.appendChild(this.buildToggleButton());
    }

    private buildRoot(): HTMLElement
    {
        const root = createElement("nav", ["navrail-container"]);
        setAttr(root, "id", this.instanceId);
        setAttr(root, "aria-label",
            this.options.ariaLabel || DEFAULT_ARIA_LABEL);
        root.classList.add(`navrail-${this.position}`);
        root.classList.add(`navrail-size-${this.options.size || "md"}`);

        if (this.options.contained) { root.classList.add("navrail-contained"); }
        if (this.options.cssClass)
        {
            root.classList.add(...this.options.cssClass.split(/\s+/));
        }

        this.applyCollapsedClass(root);
        return root;
    }

    private applyCollapsedClass(target?: HTMLElement): void
    {
        const el = target || this.rootEl;
        if (!el) { return; }

        el.classList.toggle("navrail-collapsed", this.collapsed);
        el.classList.toggle("navrail-expanded", !this.collapsed);
        setAttr(el, "aria-expanded", this.collapsed ? "false" : "true");
    }

    private buildHeader(header: NavRailHeader): HTMLElement
    {
        const wrap = createElement("div", ["navrail-header"]);

        if (header.content)
        {
            wrap.appendChild(header.content);
            return wrap;
        }

        const inner = createElement(
            header.onClick ? "button" : "div", ["navrail-header-body"]
        );

        if (header.onClick)
        {
            setAttr(inner, "type", "button");
            inner.addEventListener("click", () => header.onClick!());
        }

        if (header.brandIcon || header.brandInitials)
        {
            inner.appendChild(this.buildHeaderMark(header));
        }

        inner.appendChild(this.buildHeaderText(header));
        wrap.appendChild(inner);
        return wrap;
    }

    private buildHeaderMark(header: NavRailHeader): HTMLElement
    {
        const mark = createElement("span", ["navrail-header-mark"]);

        if (header.brandIcon)
        {
            mark.appendChild(buildIconEl(header.brandIcon));
        }
        else if (header.brandInitials)
        {
            mark.textContent = header.brandInitials;
        }
        return mark;
    }

    private buildHeaderText(header: NavRailHeader): HTMLElement
    {
        const stack = createElement("span", ["navrail-header-text"]);

        if (header.title)
        {
            stack.appendChild(createElement(
                "span", ["navrail-header-title"], header.title
            ));
        }

        if (header.subtitle)
        {
            stack.appendChild(createElement(
                "span", ["navrail-header-subtitle"], header.subtitle
            ));
        }
        return stack;
    }

    private buildSearchRow(search: NavRailSearch): HTMLElement
    {
        const row = createElement("button", ["navrail-search"]);
        setAttr(row, "type", "button");
        setAttr(row, "aria-label", search.placeholder || "Search");

        row.appendChild(buildIconEl("bi-search"));
        row.appendChild(createElement(
            "span", ["navrail-search-placeholder"],
            search.placeholder || "Jump to..."
        ));

        if (search.shortcutHint)
        {
            row.appendChild(createElement(
                "span", ["navrail-search-hint"], search.shortcutHint
            ));
        }

        row.addEventListener("click", () =>
        {
            search.onActivate();
            if (this.options.onSearchOpen)
            {
                this.options.onSearchOpen();
            }
        });
        return row;
    }

    private buildFooter(footer: NavRailFooter): HTMLElement
    {
        const wrap = createElement("div", ["navrail-footer"]);

        if (footer.content)
        {
            wrap.appendChild(footer.content);
            return wrap;
        }

        if (footer.items)
        {
            for (const item of footer.items)
            {
                if (item.hidden) { continue; }
                wrap.appendChild(this.buildItemEl(item, 0));
            }
        }
        return wrap;
    }

    private buildToggleButton(): HTMLElement
    {
        this.toggleBtn = createElement("button", ["navrail-toggle"]);
        setAttr(this.toggleBtn, "type", "button");
        this.refreshToggleButton();

        this.toggleBtn.addEventListener("click", () => this.toggleCollapse());
        return this.toggleBtn;
    }

    private refreshToggleButton(): void
    {
        if (!this.toggleBtn) { return; }

        this.toggleBtn.innerHTML = "";
        const icon = this.resolveToggleIcon();
        this.toggleBtn.appendChild(buildIconEl(icon));
        setAttr(this.toggleBtn, "aria-label",
            this.collapsed ? "Expand navigation" : "Collapse navigation");
        setAttr(this.toggleBtn, "aria-expanded",
            this.collapsed ? "false" : "true");
    }

    private resolveToggleIcon(): string
    {
        const leftExpanded = "bi-chevron-bar-left";
        const rightExpanded = "bi-chevron-bar-right";
        const leftCollapsed = "bi-chevron-bar-right";
        const rightCollapsed = "bi-chevron-bar-left";

        if (this.position === "left")
        {
            return this.collapsed ? leftCollapsed : leftExpanded;
        }
        return this.collapsed ? rightCollapsed : rightExpanded;
    }

    // ========================================================================
    // PRIVATE — BODY RENDERING
    // ========================================================================

    private rebuildBody(): void
    {
        if (!this.bodyEl) { return; }

        this.bodyEl.innerHTML = "";
        this.itemEls.clear();
        this.itemRefs.clear();
        this.renderCategories();
    }

    private renderCategories(): void
    {
        if (!this.bodyEl) { return; }

        for (const cat of this.categories)
        {
            this.bodyEl.appendChild(this.buildCategoryEl(cat));
        }
    }

    private buildCategoryEl(cat: NavRailCategory): HTMLElement
    {
        const catEl = createElement("div", ["navrail-category"]);
        setAttr(catEl, "role", "group");
        setAttr(catEl, "data-category-id", cat.id);

        const labelId = `${this.instanceId}-cat-${cat.id}-label`;
        const labelEl = createElement(
            "div", ["navrail-category-label"], cat.label
        );
        setAttr(labelEl, "id", labelId);
        setAttr(catEl, "aria-labelledby", labelId);
        catEl.appendChild(labelEl);

        for (const item of cat.items)
        {
            if (item.hidden) { continue; }
            catEl.appendChild(this.buildItemEl(item, 0));
        }
        return catEl;
    }

    private buildItemEl(item: NavRailItem, depth: number): HTMLElement
    {
        const hasChildren = Array.isArray(item.children)
            && item.children.length > 0;
        const btn = this.buildItemButtonShell(item, depth, hasChildren);

        this.wireItemElBase(btn, item);
        btn.appendChild(buildIconEl(item.icon));
        btn.appendChild(createElement(
            "span", ["navrail-item-label"], item.label
        ));

        if (hasChildren) { this.attachParentChrome(btn, item); }

        if (item.badge !== undefined && item.badge !== "")
        {
            btn.appendChild(this.buildBadgeEl(item));
        }

        this.registerItem(item, btn);
        this.attachItemListeners(btn, item, hasChildren);
        this.applyInitialActiveState(btn, item);

        return hasChildren
            ? this.wrapParentWithChildren(btn, item, depth)
            : btn;
    }

    private buildItemButtonShell(
        item: NavRailItem, depth: number, hasChildren: boolean
    ): HTMLElement
    {
        const btn = createElement("button", ["navrail-item"]);
        setAttr(btn, "type", "button");
        setAttr(btn, "role", "treeitem");
        setAttr(btn, "data-item-id", item.id);

        if (depth > 0)
        {
            btn.classList.add("navrail-item-child");
            btn.style.setProperty("--navrail-item-depth", String(depth));
        }

        if (item.cssClass)
        {
            btn.classList.add(...item.cssClass.split(/\s+/));
        }

        if (hasChildren) { btn.classList.add("navrail-item-parent"); }

        return btn;
    }

    private attachParentChrome(btn: HTMLElement, item: NavRailItem): void
    {
        btn.appendChild(this.buildChevronEl());
        setAttr(btn, "aria-expanded",
            this.expandedParents.has(item.id) ? "true" : "false");
    }

    private attachItemListeners(
        btn: HTMLElement, item: NavRailItem, hasChildren: boolean
    ): void
    {
        btn.addEventListener("click", (e) => this.onItemClick(item, btn, e));
        btn.addEventListener(
            "keydown", (e) => this.onItemKeyDown(item, btn, e)
        );

        if (!hasChildren) { return; }
        btn.addEventListener("mouseenter",
            () => this.onItemPointerEnter(item, btn));
        btn.addEventListener("focus",
            () => this.onItemPointerEnter(item, btn));
    }

    private applyInitialActiveState(
        btn: HTMLElement, item: NavRailItem
    ): void
    {
        if (this.activeId !== item.id) { return; }
        btn.classList.add("navrail-item-active");
        setAttr(btn, "aria-current", "page");
    }

    private wrapParentWithChildren(
        parentBtn: HTMLElement, item: NavRailItem, depth: number
    ): HTMLElement
    {
        const group = createElement("div", ["navrail-item-group"]);
        group.appendChild(parentBtn);

        const childrenWrap = createElement(
            "div", ["navrail-item-children"]
        );
        setAttr(childrenWrap, "role", "group");
        childrenWrap.hidden = !this.expandedParents.has(item.id);

        for (const child of item.children!)
        {
            if (child.hidden) { continue; }
            childrenWrap.appendChild(this.buildItemEl(child, depth + 1));
        }

        group.appendChild(childrenWrap);
        return group;
    }

    private wireItemElBase(btn: HTMLElement, item: NavRailItem): void
    {
        setAttr(btn, "aria-label", item.tooltip || item.label);
        setAttr(btn, "title", item.tooltip || item.label);
        setAttr(btn, "tabindex", item.disabled ? "-1" : "0");

        if (item.disabled)
        {
            btn.classList.add("navrail-item-disabled");
            setAttr(btn, "aria-disabled", "true");
        }

        if (item.hidden)
        {
            btn.hidden = true;
        }
    }

    private buildChevronEl(): HTMLElement
    {
        const el = createElement("i", ["navrail-item-chevron"]);
        el.classList.add("bi", "bi-chevron-right");
        setAttr(el, "aria-hidden", "true");
        return el;
    }

    private buildBadgeEl(item: NavRailItem): HTMLElement
    {
        const b = createElement(
            "span", ["navrail-item-badge"], String(item.badge)
        );
        this.refreshBadgeEl(b, item);
        return b;
    }

    private refreshBadgeEl(el: HTMLElement, item: NavRailItem): void
    {
        el.textContent = String(item.badge);
        el.classList.remove(
            "navrail-item-badge-default",
            "navrail-item-badge-danger",
            "navrail-item-badge-success",
            "navrail-item-badge-warning"
        );
        el.classList.add(
            `navrail-item-badge-${item.badgeVariant || "default"}`
        );
        setAttr(el, "aria-label", `${item.badge} notifications`);
    }

    private registerItem(item: NavRailItem, el: HTMLElement): void
    {
        this.itemRefs.set(item.id, item);
        this.itemEls.set(item.id, el);
    }

    // ========================================================================
    // PRIVATE — INTERACTION
    // ========================================================================

    private onItemClick(
        item: NavRailItem, btn: HTMLElement, evt: Event
    ): void
    {
        if (item.disabled) { return; }

        const hasChildren = Array.isArray(item.children)
            && item.children.length > 0;

        if (hasChildren)
        {
            this.handleParentClick(item, btn, evt);
            return;
        }
        this.fireNavigate(item, evt);
    }

    private handleParentClick(
        item: NavRailItem, btn: HTMLElement, evt: Event
    ): void
    {
        if (this.collapsed) { this.openFlyout(item, btn); }
        else { this.toggleParentExpanded(item, btn); }

        if (item.hasOwnPage !== false)
        {
            this.fireNavigate(item, evt);
        }
    }

    private fireNavigate(item: NavRailItem, evt?: Event): void
    {
        this.setActive(item.id);
        this.options.onNavigate(item.id, item, evt);
    }

    private toggleParentExpanded(
        item: NavRailItem, btn: HTMLElement
    ): void
    {
        const wasExpanded = this.expandedParents.has(item.id);

        if (wasExpanded) { this.expandedParents.delete(item.id); }
        else { this.expandedParents.add(item.id); }

        setAttr(btn, "aria-expanded", wasExpanded ? "false" : "true");
        const group = btn.parentElement;
        const childrenWrap = group?.querySelector<HTMLElement>(
            ".navrail-item-children"
        );

        if (childrenWrap)
        {
            childrenWrap.hidden = wasExpanded;
        }
    }

    private onItemPointerEnter(
        item: NavRailItem, btn: HTMLElement
    ): void
    {
        if (!this.collapsed) { return; }
        if (!item.children || item.children.length === 0) { return; }
        this.openFlyout(item, btn);
    }

    private onItemKeyDown(
        item: NavRailItem, btn: HTMLElement, e: KeyboardEvent
    ): void
    {
        const key = e.key;

        if (key === "Enter" || key === " ")
        {
            e.preventDefault();
            this.onItemClick(item, btn, e);
            return;
        }

        if (key === "ArrowDown" || key === "ArrowUp")
        {
            e.preventDefault();
            this.moveFocus(btn, key === "ArrowDown" ? 1 : -1);
            return;
        }

        if (key === "Home" || key === "End")
        {
            e.preventDefault();
            this.moveFocusToEdge(key === "Home");
            return;
        }

        if (key === "ArrowRight") { this.onArrowRight(item, btn, e); return; }
        if (key === "ArrowLeft") { this.onArrowLeft(item, btn, e); }
    }

    private onArrowRight(
        item: NavRailItem, btn: HTMLElement, e: KeyboardEvent
    ): void
    {
        if (!item.children || item.children.length === 0) { return; }

        e.preventDefault();

        if (this.collapsed)
        {
            this.openFlyout(item, btn);
            return;
        }

        if (!this.expandedParents.has(item.id))
        {
            this.toggleParentExpanded(item, btn);
        }
    }

    private onArrowLeft(
        item: NavRailItem, btn: HTMLElement, e: KeyboardEvent
    ): void
    {
        if (this.collapsed && this.flyoutEl)
        {
            e.preventDefault();
            this.closeFlyout();
            btn.focus();
            return;
        }

        const hasChildren = Array.isArray(item.children)
            && item.children.length > 0;

        if (hasChildren && this.expandedParents.has(item.id))
        {
            e.preventDefault();
            this.toggleParentExpanded(item, btn);
        }
    }

    private moveFocus(fromBtn: HTMLElement, direction: 1 | -1): void
    {
        const all = this.collectFocusableItems();
        const idx = all.indexOf(fromBtn);
        if (idx === -1) { return; }

        const next = all[idx + direction];
        if (next) { next.focus(); }
    }

    private moveFocusToEdge(first: boolean): void
    {
        const all = this.collectFocusableItems();
        const target = first ? all[0] : all[all.length - 1];
        if (target) { target.focus(); }
    }

    private collectFocusableItems(): HTMLElement[]
    {
        if (!this.rootEl) { return []; }

        return Array.from(
            this.rootEl.querySelectorAll<HTMLElement>(".navrail-item")
        ).filter((el) =>
        {
            if (el.hidden) { return false; }
            if (el.getAttribute("aria-disabled") === "true") { return false; }
            return true;
        });
    }

    // ========================================================================
    // PRIVATE — FLYOUT (collapsed + children)
    // ========================================================================

    private openFlyout(item: NavRailItem, anchor: HTMLElement): void
    {
        if (this.flyoutParentId === item.id && this.flyoutEl)
        {
            return;
        }
        this.closeFlyout();

        const fly = createElement("div", ["navrail-flyout"]);
        setAttr(fly, "role", "menu");
        setAttr(fly, "data-parent-id", item.id);
        fly.classList.add(`navrail-flyout-${this.position}`);

        const title = createElement(
            "div", ["navrail-flyout-title"], item.label
        );
        fly.appendChild(title);

        const list = createElement("div", ["navrail-flyout-list"]);
        for (const child of item.children || [])
        {
            if (child.hidden) { continue; }
            list.appendChild(this.buildFlyoutItem(child));
        }
        fly.appendChild(list);

        document.body.appendChild(fly);
        this.positionFlyout(fly, anchor);
        this.flyoutEl = fly;
        this.flyoutParentId = item.id;
    }

    private buildFlyoutItem(child: NavRailItem): HTMLElement
    {
        const btn = createElement("button", ["navrail-flyout-item"]);
        setAttr(btn, "type", "button");
        setAttr(btn, "role", "menuitem");
        setAttr(btn, "data-item-id", child.id);
        this.wireItemElBase(btn, child);

        btn.appendChild(buildIconEl(child.icon));
        btn.appendChild(createElement(
            "span", ["navrail-flyout-item-label"], child.label
        ));

        btn.addEventListener("click", (e) =>
        {
            if (child.disabled) { return; }
            this.fireNavigate(child, e);
            this.closeFlyout();
        });
        return btn;
    }

    private positionFlyout(fly: HTMLElement, anchor: HTMLElement): void
    {
        const rect = anchor.getBoundingClientRect();
        const top = Math.max(8, rect.top);

        if (this.position === "left")
        {
            fly.style.left = `${rect.right + FLYOUT_GAP}px`;
        }
        else
        {
            fly.style.right =
                `${window.innerWidth - rect.left + FLYOUT_GAP}px`;
        }
        fly.style.top = `${top}px`;
    }

    private closeFlyout(): void
    {
        if (this.flyoutEl && this.flyoutEl.parentNode)
        {
            this.flyoutEl.parentNode.removeChild(this.flyoutEl);
        }
        this.flyoutEl = null;
        this.flyoutParentId = null;
    }

    // ========================================================================
    // PRIVATE — DOCUMENT LISTENERS
    // ========================================================================

    private attachDocumentListeners(): void
    {
        this.boundDocKey = (e: KeyboardEvent) => this.onDocumentKey(e);
        this.boundDocClick = (e: MouseEvent) => this.onDocumentClick(e);
        document.addEventListener("keydown", this.boundDocKey);
        document.addEventListener("click", this.boundDocClick);
    }

    private detachDocumentListeners(): void
    {
        if (this.boundDocKey)
        {
            document.removeEventListener("keydown", this.boundDocKey);
        }

        if (this.boundDocClick)
        {
            document.removeEventListener("click", this.boundDocClick);
        }
        this.boundDocKey = null;
        this.boundDocClick = null;
    }

    private onDocumentKey(e: KeyboardEvent): void
    {
        if (e.key === "Escape" && this.flyoutEl)
        {
            e.preventDefault();
            this.closeFlyout();
            return;
        }

        const action = this.position === "left"
            ? "toggleCollapseLeft" : "toggleCollapseRight";

        if (this.matchesKeyCombo(e, action))
        {
            e.preventDefault();
            this.toggleCollapse();
        }
    }

    private onDocumentClick(e: MouseEvent): void
    {
        if (!this.flyoutEl) { return; }

        const target = e.target as Node;
        if (this.flyoutEl.contains(target)) { return; }
        if (this.rootEl && this.rootEl.contains(target)) { return; }
        this.closeFlyout();
    }

    private matchesKeyCombo(e: KeyboardEvent, action: string): boolean
    {
        const combo = this.keyBindings[action];
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
    // PRIVATE — MOUNT
    // ========================================================================

    private mount(): void
    {
        if (!this.rootEl) { return; }
        this.options.container.appendChild(this.rootEl);
    }
}

// ============================================================================
// FACTORY
// ============================================================================

// @entrypoint
// ⚓ createNavRail
/**
 * Creates and mounts a NavRail. Returns a handle for programmatic control.
 *
 * @param options - Configuration. `container`, `categories`, and `onNavigate`
 *                  are required.
 * @returns Handle exposing mutators + destroy.
 *
 * @example
 * const nav = createNavRail({
 *     container: document.getElementById("app-shell")!,
 *     position: "left",
 *     header: { brandInitials: "K", title: "Knobby IO" },
 *     categories: [{
 *         id: "workspace", label: "Workspace",
 *         items: [{ id: "overview", icon: "bi-speedometer2", label: "Overview" }]
 *     }],
 *     activeId: "overview",
 *     onNavigate: (id) => router.push(`/${id}`),
 * });
 */
export function createNavRail(options: NavRailOptions): NavRailHandle
{
    const rail = new NavRail(options);

    return {
        collapse: () => rail.collapse(),
        expand: () => rail.expand(),
        toggleCollapse: () => rail.toggleCollapse(),
        isCollapsed: () => rail.isCollapsed(),
        setActive: (id) => rail.setActive(id),
        getActive: () => rail.getActive(),
        setCategories: (c) => rail.setCategories(c),
        setBadge: (id, b, v) => rail.setBadge(id, b, v),
        setDisabled: (id, d) => rail.setDisabled(id, d),
        setVisible: (id, v) => rail.setVisible(id, v),
        getRootElement: () => rail.getRootElement(),
        destroy: () => rail.destroy(),
    };
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

if (typeof window !== "undefined")
{
    const w = window as unknown as Record<string, unknown>;
    w["NavRail"] = NavRail;
    w["NavRailManager"] = NavRailManager;
    w["createNavRail"] = createNavRail;
}
