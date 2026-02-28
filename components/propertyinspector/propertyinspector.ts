/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: PropertyInspector
 * 📜 PURPOSE: Non-modal slide-out drawer panel for viewing/editing entity
 *             details with optional tabbed sections, resize handle, and
 *             header actions.
 * 🔗 RELATES: [[EnterpriseTheme]], [[PropertyInspectorSpec]], [[SplitLayout]]
 * ⚡ FLOW: [Consumer App] -> [createPropertyInspector()] -> [Drawer Panel]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[PropertyInspector]";
const DEFAULT_WIDTH = 380;
const MIN_WIDTH = 200;
const MAX_WIDTH_RATIO = 0.6;
const DRAWER_Z_INDEX = 1050;

let instanceCounter = 0;

// ============================================================================
// INTERFACES
// ============================================================================

/** A tab within the Property Inspector drawer. */
export interface InspectorTab
{
    /** Unique tab identifier. */
    id: string;
    /** Display label. */
    label: string;
    /** Bootstrap Icons class. */
    icon?: string;
    /** Content element for this tab. */
    content: HTMLElement;
}

/** Header action button. */
export interface InspectorAction
{
    /** Unique identifier. */
    id: string;
    /** Tooltip label. */
    label: string;
    /** Bootstrap Icons class. */
    icon: string;
    /** Disabled state. */
    disabled?: boolean;
}

/** Options for opening the drawer. */
export interface InspectorOpenOptions
{
    /** Header title. */
    title: string;
    /** Optional subtitle. */
    subtitle?: string;
    /** Bootstrap Icons class for header icon. */
    icon?: string;
    /** Header action buttons. */
    actions?: InspectorAction[];
    /** Simple content element (if no tabs). */
    content?: HTMLElement;
    /** Tabbed sections (overrides content). */
    tabs?: InspectorTab[];
    /** Active tab ID (for tabbed mode). */
    activeTab?: string;
    /** Footer element. */
    footer?: HTMLElement;
    /** Arbitrary payload for callbacks. */
    data?: unknown;
}

/** Configuration for the PropertyInspector component. */
export interface PropertyInspectorOptions
{
    /** Container to scope the drawer within. Required. */
    container: HTMLElement;
    /** Drawer width in px. Default: 380. */
    width?: number;
    /** Allow drag-to-resize. Default: true. */
    resizable?: boolean;
    /** Show a backdrop overlay. Default: false. */
    showBackdrop?: boolean;
    /** Size variant. Default: "md". */
    size?: "sm" | "md" | "lg";
    /** Additional CSS class(es). */
    cssClass?: string;
    /** Called when the drawer is closed. */
    onClose?: () => void;
    /** Called when a header action is clicked. */
    onAction?: (actionId: string, data: unknown) => void;
    /** Called when active tab changes. */
    onTabChange?: (tabId: string) => void;
    /** Called when width changes via resize. */
    onResize?: (width: number) => void;
}

/** Public handle for controlling a PropertyInspector instance. */
export interface PropertyInspectorHandle
{
    open(options: InspectorOpenOptions): void;
    close(): void;
    isOpen(): boolean;
    setTitle(title: string, subtitle?: string): void;
    setContent(el: HTMLElement): void;
    setTabs(tabs: InspectorTab[]): void;
    setActiveTab(id: string): void;
    setFooter(el: HTMLElement): void;
    getElement(): HTMLElement;
    destroy(): void;
}

// ============================================================================
// DOM HELPERS
// ============================================================================

function createElement(tag: string, className?: string): HTMLElement
{
    const el = document.createElement(tag);
    if (className) { el.className = className; }
    return el;
}

function setAttr(el: HTMLElement, attrs: Record<string, string>): void
{
    for (const [key, value] of Object.entries(attrs))
    {
        el.setAttribute(key, value);
    }
}

// ============================================================================
// PROPERTY INSPECTOR CLASS
// ============================================================================

class PropertyInspector
{
    private readonly id: string;
    private readonly container: HTMLElement;
    private readonly options: PropertyInspectorOptions;

    private width: number;
    private resizable: boolean;
    private size: string;
    private open_ = false;
    private destroyed = false;

    private currentOptions: InspectorOpenOptions | null = null;
    private activeTabId: string | null = null;
    private tabs: InspectorTab[] = [];

    private drawerEl: HTMLElement | null = null;
    private backdropEl: HTMLElement | null = null;
    private headerEl: HTMLElement | null = null;
    private bodyEl: HTMLElement | null = null;
    private footerEl: HTMLElement | null = null;
    private tabBarEl: HTMLElement | null = null;

    private boundKeyDown: (e: KeyboardEvent) => void;

    constructor(options: PropertyInspectorOptions)
    {
        instanceCounter++;
        this.id = `propertyinspector-${instanceCounter}`;
        this.container = options.container;
        this.options = options;
        this.width = options.width ?? DEFAULT_WIDTH;
        this.resizable = options.resizable ?? true;
        this.size = options.size ?? "md";

        this.boundKeyDown = (e) => this.handleKeyDown(e);
        document.addEventListener("keydown", this.boundKeyDown, true);

        this.ensureContainerPositioned();
        this.buildDrawer();

        console.log(LOG_PREFIX, "Created", this.id);
    }

    // ====================================================================
    // PUBLIC API
    // ====================================================================

    open(opts: InspectorOpenOptions): void
    {
        this.currentOptions = opts;
        this.tabs = opts.tabs ?? [];
        this.activeTabId = opts.activeTab ?? this.tabs[0]?.id ?? null;

        this.renderDrawer(opts);
        this.open_ = true;
        this.drawerEl?.classList.add("propertyinspector-open");

        if (this.options.showBackdrop && this.backdropEl)
        {
            this.backdropEl.style.display = "";
        }
    }

    close(): void
    {
        if (!this.open_) { return; }
        this.open_ = false;
        this.drawerEl?.classList.remove("propertyinspector-open");

        if (this.backdropEl)
        {
            this.backdropEl.style.display = "none";
        }
        if (this.options.onClose) { this.options.onClose(); }
    }

    isOpen(): boolean
    {
        return this.open_;
    }

    setTitle(title: string, subtitle?: string): void
    {
        if (!this.headerEl) { return; }
        const titleEl = this.headerEl.querySelector(
            ".propertyinspector-title"
        );
        if (titleEl) { titleEl.textContent = title; }

        const subEl = this.headerEl.querySelector(
            ".propertyinspector-subtitle"
        );
        if (subEl && subtitle !== undefined)
        {
            subEl.textContent = subtitle;
        }
    }

    setContent(el: HTMLElement): void
    {
        if (!this.bodyEl) { return; }
        this.bodyEl.innerHTML = "";
        this.bodyEl.appendChild(el);
    }

    setTabs(tabs: InspectorTab[]): void
    {
        this.tabs = tabs;
        this.activeTabId = tabs[0]?.id ?? null;
        if (this.open_ && this.currentOptions)
        {
            this.renderDrawer(this.currentOptions);
        }
    }

    setActiveTab(id: string): void
    {
        this.activeTabId = id;
        this.updateTabContent();

        if (this.options.onTabChange)
        {
            this.options.onTabChange(id);
        }
    }

    setFooter(el: HTMLElement): void
    {
        if (!this.footerEl) { return; }
        this.footerEl.innerHTML = "";
        this.footerEl.appendChild(el);
        this.footerEl.style.display = "";
    }

    getElement(): HTMLElement
    {
        return this.drawerEl as HTMLElement;
    }

    destroy(): void
    {
        if (this.destroyed) { return; }
        this.destroyed = true;

        document.removeEventListener("keydown", this.boundKeyDown, true);
        this.drawerEl?.parentNode?.removeChild(this.drawerEl);
        this.backdropEl?.parentNode?.removeChild(this.backdropEl);
        console.log(LOG_PREFIX, "Destroyed", this.id);
    }

    // ====================================================================
    // PRIVATE: SCAFFOLD
    // ====================================================================

    private ensureContainerPositioned(): void
    {
        const pos = getComputedStyle(this.container).position;
        if (pos === "static")
        {
            this.container.style.position = "relative";
        }
    }

    private buildDrawer(): void
    {
        const sizeClass = this.size !== "md"
            ? ` propertyinspector-${this.size}` : "";
        const extra = this.options.cssClass
            ? ` ${this.options.cssClass}` : "";

        this.drawerEl = createElement(
            "div", `propertyinspector${sizeClass}${extra}`
        );
        this.drawerEl.id = this.id;
        this.drawerEl.style.width = `${this.width}px`;
        this.drawerEl.style.zIndex = String(DRAWER_Z_INDEX);
        setAttr(this.drawerEl, {
            role: "complementary",
            "aria-label": "Property Inspector"
        });

        if (this.options.showBackdrop)
        {
            this.backdropEl = createElement(
                "div", "propertyinspector-backdrop"
            );
            this.backdropEl.style.display = "none";
            this.backdropEl.addEventListener("click", () => this.close());
            this.container.appendChild(this.backdropEl);
        }

        this.container.appendChild(this.drawerEl);
    }

    // ====================================================================
    // PRIVATE: RENDER
    // ====================================================================

    private renderDrawer(opts: InspectorOpenOptions): void
    {
        if (!this.drawerEl) { return; }
        this.drawerEl.innerHTML = "";

        this.headerEl = this.buildHeader(opts);
        this.drawerEl.appendChild(this.headerEl);

        if (this.resizable)
        {
            this.drawerEl.appendChild(this.buildResizeHandle());
        }

        if (this.tabs.length > 0)
        {
            this.tabBarEl = this.buildTabBar();
            this.drawerEl.appendChild(this.tabBarEl);
        }

        this.bodyEl = createElement("div", "propertyinspector-body");
        this.drawerEl.appendChild(this.bodyEl);
        this.renderBodyContent(opts);

        this.footerEl = createElement("div", "propertyinspector-footer");
        if (opts.footer)
        {
            this.footerEl.appendChild(opts.footer);
        }
        else
        {
            this.footerEl.style.display = "none";
        }
        this.drawerEl.appendChild(this.footerEl);
    }

    private renderBodyContent(opts: InspectorOpenOptions): void
    {
        if (!this.bodyEl) { return; }
        this.bodyEl.innerHTML = "";

        if (this.tabs.length > 0)
        {
            this.updateTabContent();
        }
        else if (opts.content)
        {
            this.bodyEl.appendChild(opts.content);
        }
    }

    // ====================================================================
    // PRIVATE: HEADER
    // ====================================================================

    private buildHeader(opts: InspectorOpenOptions): HTMLElement
    {
        const header = createElement("div", "propertyinspector-header");
        header.appendChild(this.buildHeaderLeft(opts));
        header.appendChild(this.buildHeaderRight(opts));
        return header;
    }

    /** Build left side of header: icon + title/subtitle. */
    private buildHeaderLeft(opts: InspectorOpenOptions): HTMLElement
    {
        const left = createElement("div", "propertyinspector-header-left");
        if (opts.icon)
        {
            const icon = createElement("i", `bi ${opts.icon}`);
            setAttr(icon, { "aria-hidden": "true" });
            left.appendChild(icon);
        }

        const titles = createElement("div", "propertyinspector-titles");
        const title = createElement("span", "propertyinspector-title");
        title.textContent = opts.title;
        titles.appendChild(title);

        if (opts.subtitle)
        {
            const sub = createElement("span", "propertyinspector-subtitle");
            sub.textContent = opts.subtitle;
            titles.appendChild(sub);
        }
        left.appendChild(titles);
        return left;
    }

    /** Build right side of header: action buttons + close. */
    private buildHeaderRight(opts: InspectorOpenOptions): HTMLElement
    {
        const right = createElement("div", "propertyinspector-header-right");
        if (opts.actions)
        {
            for (const action of opts.actions)
            {
                right.appendChild(this.buildActionBtn(action, opts.data));
            }
        }
        right.appendChild(this.buildCloseBtn());
        return right;
    }

    private buildActionBtn(
        action: InspectorAction, data: unknown
    ): HTMLElement
    {
        const btn = createElement("button", "propertyinspector-action-btn");
        setAttr(btn, {
            type: "button",
            "aria-label": action.label,
            title: action.label
        });
        if (action.disabled) { btn.setAttribute("disabled", "true"); }

        const icon = createElement("i", `bi ${action.icon}`);
        setAttr(icon, { "aria-hidden": "true" });
        btn.appendChild(icon);

        btn.addEventListener("click", () =>
        {
            if (this.options.onAction)
            {
                this.options.onAction(action.id, data);
            }
        });
        return btn;
    }

    private buildCloseBtn(): HTMLElement
    {
        const btn = createElement("button", "propertyinspector-close-btn");
        setAttr(btn, { type: "button", "aria-label": "Close" });

        const icon = createElement("i", "bi bi-x-lg");
        setAttr(icon, { "aria-hidden": "true" });
        btn.appendChild(icon);

        btn.addEventListener("click", () => this.close());
        return btn;
    }

    // ====================================================================
    // PRIVATE: TAB BAR
    // ====================================================================

    private buildTabBar(): HTMLElement
    {
        const bar = createElement("div", "propertyinspector-tabs");
        setAttr(bar, { role: "tablist" });

        for (const tab of this.tabs)
        {
            bar.appendChild(this.buildTabButton(tab));
        }
        return bar;
    }

    private buildTabButton(tab: InspectorTab): HTMLElement
    {
        const isActive = tab.id === this.activeTabId;
        const btn = createElement("button",
            `propertyinspector-tab${isActive ? " active" : ""}`
        );
        setAttr(btn, {
            type: "button",
            role: "tab",
            "aria-selected": String(isActive)
        });

        if (tab.icon)
        {
            const icon = createElement("i", `bi ${tab.icon}`);
            setAttr(icon, { "aria-hidden": "true" });
            btn.appendChild(icon);
        }

        const label = createElement("span");
        label.textContent = tab.label;
        btn.appendChild(label);

        btn.addEventListener("click", () => this.setActiveTab(tab.id));
        return btn;
    }

    private updateTabContent(): void
    {
        if (!this.bodyEl) { return; }
        this.bodyEl.innerHTML = "";

        const active = this.tabs.find(t => t.id === this.activeTabId);
        if (active)
        {
            this.bodyEl.appendChild(active.content);
        }

        this.updateTabBarActive();
    }

    private updateTabBarActive(): void
    {
        if (!this.tabBarEl) { return; }
        const buttons = this.tabBarEl.querySelectorAll(
            ".propertyinspector-tab"
        );
        for (let i = 0; i < buttons.length; i++)
        {
            const isActive = this.tabs[i]?.id === this.activeTabId;
            buttons[i].classList.toggle("active", isActive);
            buttons[i].setAttribute("aria-selected", String(isActive));
        }
    }

    // ====================================================================
    // PRIVATE: RESIZE HANDLE
    // ====================================================================

    private buildResizeHandle(): HTMLElement
    {
        const handle = createElement(
            "div", "propertyinspector-resize-handle"
        );
        setAttr(handle, { "aria-label": "Resize panel" });
        handle.addEventListener("mousedown", (e) => this.startResize(e));
        return handle;
    }

    /** Begin drag-to-resize on the resize handle. */
    private startResize(e: MouseEvent): void
    {
        e.preventDefault();
        const startX = e.clientX;
        const startWidth = this.width;
        document.body.style.userSelect = "none";

        const onMove = (ev: MouseEvent) =>
        {
            this.applyResize(startX, startWidth, ev.clientX);
        };

        const onUp = () =>
        {
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
            document.body.style.userSelect = "";
            if (this.options.onResize)
            {
                this.options.onResize(this.width);
            }
        };

        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
    }

    /** Calculate and apply new drawer width during resize drag. */
    private applyResize(
        startX: number, startWidth: number, currentX: number
    ): void
    {
        const delta = startX - currentX;
        const maxWidth = this.container.clientWidth * MAX_WIDTH_RATIO;
        this.width = Math.max(MIN_WIDTH, Math.min(startWidth + delta, maxWidth));
        if (this.drawerEl)
        {
            this.drawerEl.style.width = `${this.width}px`;
        }
    }

    // ====================================================================
    // PRIVATE: EVENT HANDLERS
    // ====================================================================

    private handleKeyDown(e: KeyboardEvent): void
    {
        if (e.key === "Escape" && this.open_)
        {
            e.preventDefault();
            this.close();
        }
    }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

// @entrypoint

export function createPropertyInspector(
    options: PropertyInspectorOptions
): PropertyInspectorHandle
{
    if (!options.container)
    {
        console.error(LOG_PREFIX, "No container provided");
        throw new Error(`${LOG_PREFIX} container is required`);
    }

    const inst = new PropertyInspector(options);
    return {
        open: (o) => inst.open(o),
        close: () => inst.close(),
        isOpen: () => inst.isOpen(),
        setTitle: (t, s) => inst.setTitle(t, s),
        setContent: (el) => inst.setContent(el),
        setTabs: (tabs) => inst.setTabs(tabs),
        setActiveTab: (id) => inst.setActiveTab(id),
        setFooter: (el) => inst.setFooter(el),
        getElement: () => inst.getElement(),
        destroy: () => inst.destroy()
    };
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

(window as unknown as Record<string, unknown>).createPropertyInspector =
    createPropertyInspector;
