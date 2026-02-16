/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: TabbedPanel
 * 📜 PURPOSE: Dockable (top/bottom), floatable, resizable, collapsible tabbed
 *    panel component with dynamic tab management, configurable tab bar position,
 *    drag-to-dock, and CSS custom property integration for layout offset.
 *    Complements the Sidebar component (left/right) with top/bottom docking.
 * 🔗 RELATES: [[EnterpriseTheme]], [[CustomComponents]], [[SidebarPanel]],
 *    [[StatusBar]], [[BannerBar]], [[Toolbar]]
 * ⚡ FLOW: [Consumer App] -> [createTabbedPanel()] -> [DOM fixed panel]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// S1: TYPES AND INTERFACES
// ============================================================================

/** Panel mode: fixed to viewport edge or free-floating. */
export type TabbedPanelMode = "docked" | "floating";

/** Dock edge position (complements Sidebar's "left" | "right"). */
export type TabbedPanelDockPosition = "top" | "bottom";

/** Position of the tab bar relative to the panel content area. */
export type TabBarPosition = "top" | "left" | "bottom" | "right";

/** How tab titles are displayed. */
export type TabTitleMode = "icon" | "text" | "icon-text";

/**
 * Configuration for a single tab within the panel.
 */
export interface TabDefinition
{
    /** Unique identifier for this tab. */
    id: string;

    /** Display title text. Used for text and icon-text modes, and for aria-label. */
    title: string;

    /** Bootstrap Icons class (e.g., "bi-terminal"). Used for icon and icon-text modes. */
    icon?: string;

    /** Whether this tab shows a close button. Default: false. */
    closable?: boolean;

    /** Initial content: an HTMLElement to append, or a string set via textContent. */
    content?: HTMLElement | string;

    /** Additional CSS class(es) for this tab's panel element. */
    cssClass?: string;

    /** Arbitrary data associated with this tab for consumer use. */
    data?: Record<string, unknown>;

    /** Whether this tab is initially disabled. Default: false. */
    disabled?: boolean;
}

/**
 * Configuration options for the TabbedPanel component.
 */
export interface TabbedPanelOptions
{
    /** Unique identifier. Auto-generated if omitted. */
    id?: string;

    /** Initial set of tabs. */
    tabs?: TabDefinition[];

    /** Position of the tab bar relative to the content. Default: "top". */
    tabBarPosition?: TabBarPosition;

    /** How tab titles are displayed. Default: "icon-text". */
    tabTitleMode?: TabTitleMode;

    /** Initial panel mode. Default: "docked". */
    mode?: TabbedPanelMode;

    /** Dock edge when mode is "docked". Default: "bottom". */
    dockPosition?: TabbedPanelDockPosition;

    /** Whether the panel can be collapsed. Default: true. */
    collapsible?: boolean;

    /** Whether the panel can be resized. Default: true. */
    resizable?: boolean;

    /** Whether the panel can be dragged (floating mode). Default: true. */
    draggable?: boolean;

    /** Panel height in pixels (docked and floating). Default: 250. */
    height?: number;

    /** Minimum height in pixels. Default: 100. */
    minHeight?: number;

    /** Maximum height in pixels. Default: 600. */
    maxHeight?: number;

    /** Panel width in pixels (floating only). Default: 500. */
    width?: number;

    /** Minimum width in pixels (floating only). Default: 300. */
    minWidth?: number;

    /** Maximum width in pixels (floating only). Default: 1200. */
    maxWidth?: number;

    /** Height of collapsed strip in pixels. Default: 32. */
    collapsedHeight?: number;

    /** Optional panel title shown in the title bar. */
    title?: string;

    /** Show the title bar. Default: true when floating, false when docked. */
    showTitleBar?: boolean;

    /** Start collapsed. Default: false. */
    collapsed?: boolean;

    /** Initial floating X position in pixels. */
    floatX?: number;

    /** Initial floating Y position in pixels. */
    floatY?: number;

    /** Background colour (CSS value). */
    background?: string;

    /** Foreground/text colour (CSS value). */
    foreground?: string;

    /** Font family (CSS value). */
    fontFamily?: string;

    /** Font size (CSS value). */
    fontSize?: string;

    /** Additional CSS class(es) for the root element. */
    cssClass?: string;

    /** CSS z-index override. */
    zIndex?: number;

    /** Called when a tab is selected. */
    onTabSelect?: (tabId: string, panel: TabbedPanel) => void;

    /** Called when a tab is deselected (before new tab activates). */
    onTabDeselect?: (tabId: string, panel: TabbedPanel) => void;

    /** Called when a tab close is requested. Return false to prevent close. */
    onTabClose?: (tabId: string, panel: TabbedPanel) => boolean | void;

    /** Called when collapse state changes. */
    onCollapse?: (collapsed: boolean, panel: TabbedPanel) => void;

    /** Called after resize completes. */
    onResize?: (width: number, height: number, panel: TabbedPanel) => void;

    /** Called when mode changes (docked/floating). */
    onModeChange?: (mode: TabbedPanelMode, panel: TabbedPanel) => void;

    /** Called before the panel is destroyed. Return false to cancel. */
    onBeforeClose?: (panel: TabbedPanel) => boolean;

    /** Called after the panel is destroyed. */
    onClose?: (panel: TabbedPanel) => void;
}

// ============================================================================
// S2: CONSTANTS
// ============================================================================

const LOG_PREFIX = "[TabbedPanel]";

/** Z-index values — same layer as Sidebar (different edges, no conflict) */
const Z_INDEX_DOCKED = 1035;
const Z_INDEX_FLOATING = 1036;

/** Distance in pixels from viewport edge to trigger dock zone */
const DOCK_ZONE_THRESHOLD = 40;

/** Keyboard resize increment in pixels */
const KEYBOARD_RESIZE_STEP = 10;

/** Instance counter for unique ID generation */
let instanceCounter = 0;

// ============================================================================
// S3: PRIVATE HELPERS — DOM
// ============================================================================

/**
 * Creates an HTML element with optional CSS classes and text content.
 */
function createElement(
    tag: string, classes: string[], text?: string
): HTMLElement
{
    const el = document.createElement(tag);

    if (classes.length > 0)
    {
        el.classList.add(...classes);
    }

    if (text)
    {
        el.textContent = text;
    }

    return el;
}

/**
 * Sets an attribute on an HTML element.
 */
function setAttr(el: HTMLElement, name: string, value: string): void
{
    el.setAttribute(name, value);
}

/**
 * Clamps a number between a minimum and maximum value.
 */
function clamp(value: number, min: number, max: number): number
{
    return Math.max(min, Math.min(max, value));
}

// ============================================================================
// S4: PUBLIC API — TabbedPanel
// ============================================================================

/**
 * TabbedPanel renders a dockable (top/bottom), floatable, resizable, and
 * collapsible tabbed panel. Tabs can be added and removed dynamically.
 * Complements the Sidebar component which docks left/right.
 *
 * @example
 * const panel = new TabbedPanel({
 *     dockPosition: "bottom",
 *     tabs: [
 *         { id: "terminal", title: "Terminal", icon: "bi-terminal" },
 *         { id: "output", title: "Output", icon: "bi-journal-text", closable: true }
 *     ]
 * });
 * panel.show();
 */
export class TabbedPanel
{
    private readonly instanceId: string;
    private readonly options: Required<Pick<TabbedPanelOptions,
        "height" | "minHeight" | "maxHeight" | "width" | "minWidth" |
        "maxWidth" | "collapsedHeight" | "resizable" | "draggable" |
        "collapsible"
    >> & TabbedPanelOptions;

    // State
    private currentMode: TabbedPanelMode = "docked";
    private dockPosition: TabbedPanelDockPosition = "bottom";
    private tabBarPosition: TabBarPosition = "top";
    private tabTitleMode: TabTitleMode = "icon-text";
    private currentHeight: number;
    private currentWidth: number;
    private collapsed = false;
    private visible = false;
    private activeTabId: string | null = null;

    // Floating position
    private floatX = 100;
    private floatY = 100;

    // Tab registry
    private tabs: TabDefinition[] = [];
    private tabButtonEls: Map<string, HTMLElement> = new Map();
    private tabPanelEls: Map<string, HTMLElement> = new Map();

    // DOM references
    private rootEl: HTMLElement | null = null;
    private titleBarEl: HTMLElement | null = null;
    private titleTextEl: HTMLElement | null = null;
    private tabBarEl: HTMLElement | null = null;
    private contentEl: HTMLElement | null = null;
    private collapsedStripEl: HTMLElement | null = null;
    private collapseBtn: HTMLElement | null = null;
    private tabBarCollapseBtn: HTMLElement | null = null;
    private floatBtn: HTMLElement | null = null;
    private resizeHandleV: HTMLElement | null = null;
    private resizeHandleH: HTMLElement | null = null;
    private resizeHandleHL: HTMLElement | null = null;
    private resizeHandleCorner: HTMLElement | null = null;

    // Drag state
    private isDragging = false;
    private dragStartX = 0;
    private dragStartY = 0;
    private dragOrigX = 0;
    private dragOrigY = 0;

    // Bound event handlers for cleanup
    private boundDragMove: ((e: PointerEvent) => void) | null = null;
    private boundDragEnd: ((e: PointerEvent) => void) | null = null;

    constructor(options: TabbedPanelOptions)
    {
        instanceCounter += 1;
        this.instanceId = options.id || `tabbedpanel-${instanceCounter}`;

        // Merge defaults
        this.options = {
            mode: "docked",
            dockPosition: "bottom",
            tabBarPosition: "top",
            tabTitleMode: "icon-text",
            height: 250,
            minHeight: 100,
            maxHeight: 600,
            width: 500,
            minWidth: 300,
            maxWidth: 1200,
            collapsedHeight: 32,
            collapsible: true,
            resizable: true,
            draggable: true,
            ...options,
        };

        this.currentMode = this.options.mode === "floating"
            ? "floating" : "docked";
        this.dockPosition = this.options.dockPosition || "bottom";
        this.tabBarPosition = this.options.tabBarPosition || "top";
        this.tabTitleMode = this.options.tabTitleMode || "icon-text";
        this.currentHeight = this.options.height;
        this.currentWidth = this.options.width;

        if (this.options.floatX !== undefined)
        {
            this.floatX = this.options.floatX;
        }

        if (this.options.floatY !== undefined)
        {
            this.floatY = this.options.floatY;
        }

        this.buildDOM();

        // Add initial tabs
        if (this.options.tabs && this.options.tabs.length > 0)
        {
            this.addInitialTabs(this.options.tabs);
        }

        // Start collapsed if requested
        if (this.options.collapsed)
        {
            this.applyCollapsedState();
        }

        console.log(`${LOG_PREFIX} Initialised:`, this.instanceId);
        console.debug(`${LOG_PREFIX} Options:`, this.options);
    }

    // ========================================================================
    // PUBLIC — LIFECYCLE
    // ========================================================================

    /**
     * Appends the panel to document.body, registers with manager,
     * and updates CSS custom properties.
     */
    public show(container?: string | HTMLElement): void
    {
        if (this.visible)
        {
            console.warn(`${LOG_PREFIX} Already visible:`, this.instanceId);
            return;
        }

        if (!this.rootEl)
        {
            console.error(`${LOG_PREFIX} DOM not built; cannot show.`);
            return;
        }

        const target = this.resolveContainer(container);
        target.appendChild(this.rootEl);
        this.visible = true;

        TabbedPanelManager.getInstance().register(this);

        this.applyModeClasses();
        this.applyPositionStyles();
        this.updateCssCustomProperties();

        console.debug(`${LOG_PREFIX} Shown:`, this.instanceId);
    }

    /**
     * Removes the panel from the DOM without destroying state.
     */
    public hide(): void
    {
        if (!this.visible)
        {
            return;
        }

        this.rootEl?.remove();
        this.visible = false;

        this.updateCssCustomProperties();

        console.debug(`${LOG_PREFIX} Hidden:`, this.instanceId);
    }

    /**
     * Hides the panel, unregisters from manager, fires onClose,
     * and releases all internal references.
     */
    public destroy(): void
    {
        if (this.options.onBeforeClose)
        {
            const allowed = this.options.onBeforeClose(this);

            if (allowed === false)
            {
                console.debug(
                    `${LOG_PREFIX} Destroy cancelled by onBeforeClose.`
                );
                return;
            }
        }

        this.hide();

        TabbedPanelManager.getInstance().unregister(this);

        if (this.options.onClose)
        {
            this.options.onClose(this);
        }

        // Null all DOM references
        this.rootEl = null;
        this.titleBarEl = null;
        this.titleTextEl = null;
        this.tabBarEl = null;
        this.contentEl = null;
        this.collapsedStripEl = null;
        this.collapseBtn = null;
        this.tabBarCollapseBtn = null;
        this.floatBtn = null;
        this.resizeHandleV = null;
        this.resizeHandleH = null;
        this.resizeHandleHL = null;
        this.resizeHandleCorner = null;
        this.boundDragMove = null;
        this.boundDragEnd = null;
        this.tabButtonEls.clear();
        this.tabPanelEls.clear();

        console.debug(`${LOG_PREFIX} Destroyed:`, this.instanceId);
    }

    // ========================================================================
    // PUBLIC — MODE SWITCHING
    // ========================================================================

    /**
     * Switches the panel to docked mode at the given position.
     */
    public dock(position: TabbedPanelDockPosition): void
    {
        if (this.collapsed)
        {
            this.collapsed = false;
        }

        this.dockPosition = position;
        this.currentMode = "docked";

        this.applyModeClasses();
        this.applyPositionStyles();

        if (this.visible)
        {
            this.updateCssCustomProperties();
        }

        this.fireOnModeChange("docked");

        console.debug(`${LOG_PREFIX} Docked to:`, position);
    }

    /**
     * Switches the panel to floating mode at optional coordinates.
     */
    public float(x?: number, y?: number): void
    {
        if (this.collapsed)
        {
            this.collapsed = false;
        }

        if (x !== undefined)
        {
            this.floatX = x;
        }

        if (y !== undefined)
        {
            this.floatY = y;
        }

        this.currentMode = "floating";

        this.applyModeClasses();
        this.applyPositionStyles();

        if (this.visible)
        {
            this.updateCssCustomProperties();
        }

        this.fireOnModeChange("floating");

        console.debug(
            `${LOG_PREFIX} Floating at:`, this.floatX, this.floatY
        );
    }

    // ========================================================================
    // PUBLIC — COLLAPSE
    // ========================================================================

    /** Collapses the panel to a narrow horizontal strip. */
    public collapse(): void
    {
        if (this.collapsed || this.currentMode === "floating")
        {
            return;
        }

        this.collapsed = true;
        this.applyCollapsedState();
        this.updateCssCustomProperties();

        if (this.options.onCollapse)
        {
            this.options.onCollapse(true, this);
        }

        console.debug(`${LOG_PREFIX} Collapsed:`, this.instanceId);
    }

    /** Expands the panel from collapsed state. */
    public expand(): void
    {
        if (!this.collapsed)
        {
            return;
        }

        this.collapsed = false;
        this.applyExpandedState();
        this.updateCssCustomProperties();

        if (this.options.onCollapse)
        {
            this.options.onCollapse(false, this);
        }

        console.debug(`${LOG_PREFIX} Expanded:`, this.instanceId);
    }

    /** Toggles between collapsed and expanded states. */
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

    // ========================================================================
    // PUBLIC — TAB MANAGEMENT
    // ========================================================================

    /**
     * Adds a new tab to the panel.
     */
    public addTab(tab: TabDefinition): void
    {
        if (this.tabs.some((t) => t.id === tab.id))
        {
            console.warn(`${LOG_PREFIX} Tab already exists:`, tab.id);
            return;
        }

        this.tabs.push(tab);

        // Build and append tab button
        const tabBtn = this.buildTabButton(tab);
        this.insertTabButton(tabBtn);

        // Build and append tab panel
        const tabPanel = this.buildTabPanel(tab);
        this.contentEl?.appendChild(tabPanel);

        // Auto-select if first tab
        if (this.tabs.length === 1)
        {
            this.activateTab(tab.id);
        }

        console.debug(`${LOG_PREFIX} Tab added:`, tab.id);
    }

    /**
     * Removes a tab from the panel.
     */
    public removeTab(tabId: string): void
    {
        const idx = this.tabs.findIndex((t) => t.id === tabId);

        if (idx === -1)
        {
            console.warn(`${LOG_PREFIX} Tab not found:`, tabId);
            return;
        }

        // Fire onTabClose; allow cancellation
        if (this.options.onTabClose)
        {
            const allowed = this.options.onTabClose(tabId, this);

            if (allowed === false)
            {
                return;
            }
        }

        // Remove DOM elements
        this.tabButtonEls.get(tabId)?.remove();
        this.tabPanelEls.get(tabId)?.remove();
        this.tabButtonEls.delete(tabId);
        this.tabPanelEls.delete(tabId);
        this.tabs.splice(idx, 1);

        // Select adjacent tab if this was the active one
        if (this.activeTabId === tabId)
        {
            this.selectAdjacentTab(idx);
        }

        console.debug(`${LOG_PREFIX} Tab removed:`, tabId);
    }

    /**
     * Selects a tab by ID, making it the active tab.
     */
    public selectTab(tabId: string): void
    {
        const tab = this.tabs.find((t) => t.id === tabId);

        if (!tab)
        {
            console.warn(`${LOG_PREFIX} Tab not found:`, tabId);
            return;
        }

        if (tab.disabled)
        {
            return;
        }

        if (this.activeTabId === tabId)
        {
            return;
        }

        // Deselect current
        if (this.activeTabId)
        {
            this.deactivateTab(this.activeTabId);
        }

        // Activate new
        this.activateTab(tabId);
    }

    /** Returns the currently active tab ID, or null. */
    public getActiveTabId(): string | null
    {
        return this.activeTabId;
    }

    /** Returns the number of tabs. */
    public getTabCount(): number
    {
        return this.tabs.length;
    }

    /** Returns a tab definition by ID, or undefined. */
    public getTabDefinition(tabId: string): TabDefinition | undefined
    {
        return this.tabs.find((t) => t.id === tabId);
    }

    /** Returns the DOM element for a tab's content panel. */
    public getTabContentElement(tabId: string): HTMLElement | undefined
    {
        return this.tabPanelEls.get(tabId);
    }

    /** Updates a tab's title text. */
    public setTabTitle(tabId: string, title: string): void
    {
        const tab = this.tabs.find((t) => t.id === tabId);

        if (!tab)
        {
            return;
        }

        tab.title = title;
        const btn = this.tabButtonEls.get(tabId);

        if (btn)
        {
            const label = btn.querySelector(".tabbedpanel-tab-label");

            if (label)
            {
                label.textContent = title;
            }

            setAttr(btn, "aria-label", title);
        }
    }

    /** Updates a tab's icon class. */
    public setTabIcon(tabId: string, icon: string): void
    {
        const tab = this.tabs.find((t) => t.id === tabId);

        if (!tab)
        {
            return;
        }

        const oldIcon = tab.icon;
        tab.icon = icon;
        const btn = this.tabButtonEls.get(tabId);

        if (btn)
        {
            const iconEl = btn.querySelector(".tabbedpanel-tab-icon");

            if (iconEl && oldIcon)
            {
                iconEl.classList.remove(oldIcon);
                iconEl.classList.add(icon);
            }
        }
    }

    /** Enables or disables a tab. */
    public setTabDisabled(tabId: string, disabled: boolean): void
    {
        const tab = this.tabs.find((t) => t.id === tabId);

        if (!tab)
        {
            return;
        }

        tab.disabled = disabled;
        const btn = this.tabButtonEls.get(tabId);

        if (btn)
        {
            if (disabled)
            {
                setAttr(btn, "aria-disabled", "true");
                btn.classList.add("tabbedpanel-tab-disabled");
            }
            else
            {
                btn.removeAttribute("aria-disabled");
                btn.classList.remove("tabbedpanel-tab-disabled");
            }
        }
    }

    // ========================================================================
    // PUBLIC — STATE QUERIES
    // ========================================================================

    /** Returns the unique instance ID. */
    public getId(): string
    {
        return this.instanceId;
    }

    /** Returns the current mode ("docked" or "floating"). */
    public getMode(): TabbedPanelMode
    {
        return this.currentMode;
    }

    /** Returns the current dock position ("top" or "bottom"). */
    public getDockPosition(): TabbedPanelDockPosition
    {
        return this.dockPosition;
    }

    /** Returns the current height in pixels. */
    public getHeight(): number
    {
        return this.currentHeight;
    }

    /** Returns the current width in pixels (floating only). */
    public getWidth(): number
    {
        return this.currentWidth;
    }

    /** Returns true if the panel is currently visible. */
    public isVisible(): boolean
    {
        return this.visible;
    }

    /** Returns true if the panel is collapsed. */
    public isCollapsed(): boolean
    {
        return this.collapsed;
    }

    /** Returns the root DOM element, or null if destroyed. */
    public getRootElement(): HTMLElement | null
    {
        return this.rootEl;
    }

    /** Returns the panel title. */
    public getTitle(): string
    {
        return this.options.title || "Panel";
    }

    /** Updates the panel title text. */
    public setTitle(title: string): void
    {
        this.options.title = title;

        if (this.titleTextEl)
        {
            this.titleTextEl.textContent = title;
        }

        if (this.rootEl)
        {
            setAttr(this.rootEl, "aria-label", `${title} panel`);
        }
    }

    /** Sets the panel height programmatically. */
    public setHeight(h: number): void
    {
        this.currentHeight = clamp(
            h, this.options.minHeight, this.options.maxHeight
        );
        this.applyPositionStyles();
        this.updateCssCustomProperties();
    }

    /** Sets the panel width programmatically (floating only). */
    public setWidth(w: number): void
    {
        this.currentWidth = clamp(
            w, this.options.minWidth, this.options.maxWidth
        );
        this.applyPositionStyles();
    }

    // ========================================================================
    // PRIVATE — DOM CONSTRUCTION
    // ========================================================================

    /**
     * Builds the complete panel DOM tree.
     */
    private buildDOM(): void
    {
        this.rootEl = this.buildRoot();

        // Resize handle (top edge for bottom dock, bottom for top dock)
        if (this.options.resizable)
        {
            this.buildResizeHandles();
        }

        // Title bar (optional)
        const showTitle = this.resolveShowTitleBar();

        if (showTitle)
        {
            this.titleBarEl = this.buildTitleBar();
            this.rootEl.appendChild(this.titleBarEl);
        }

        // Tab bar
        this.tabBarEl = this.buildTabBar();

        // Content area
        this.contentEl = createElement("div", ["tabbedpanel-content"]);

        // Arrange tab bar + content based on tabBarPosition
        this.arrangeTabBarAndContent();

        // Collapsed strip (hidden until collapsed)
        this.collapsedStripEl = this.buildCollapsedStrip();
        this.rootEl.appendChild(this.collapsedStripEl);
        this.collapsedStripEl.style.display = "none";

        this.applyModeClasses();
    }

    /**
     * Builds the root container element with ARIA attributes.
     */
    private buildRoot(): HTMLElement
    {
        const root = createElement("div", ["tabbedpanel"]);

        setAttr(root, "id", this.instanceId);
        setAttr(root, "role", "region");
        setAttr(
            root, "aria-label",
            `${this.options.title || "Panel"} panel`
        );

        if (this.options.cssClass)
        {
            root.classList.add(...this.options.cssClass.split(" "));
        }

        this.applyStyleOverrides(root);

        return root;
    }

    /**
     * Applies optional colour, font, and style overrides from options.
     */
    private applyStyleOverrides(root: HTMLElement): void
    {
        if (this.options.background)
        {
            root.style.backgroundColor = this.options.background;
        }

        if (this.options.foreground)
        {
            root.style.color = this.options.foreground;
        }

        if (this.options.fontFamily)
        {
            root.style.fontFamily = this.options.fontFamily;
        }

        if (this.options.fontSize)
        {
            root.style.fontSize = this.options.fontSize;
        }
    }

    /**
     * Determines whether the title bar should be shown.
     */
    private resolveShowTitleBar(): boolean
    {
        if (this.options.showTitleBar !== undefined)
        {
            return this.options.showTitleBar;
        }

        return this.currentMode === "floating";
    }

    /**
     * Resolves a container argument to an HTMLElement.
     */
    private resolveContainer(
        container?: string | HTMLElement
    ): HTMLElement
    {
        if (!container)
        {
            return document.body;
        }

        if (typeof container === "string")
        {
            const el = document.getElementById(container);
            return el || document.body;
        }

        return container;
    }

    /**
     * Builds the title bar with text and action buttons.
     */
    private buildTitleBar(): HTMLElement
    {
        const bar = createElement("div", ["tabbedpanel-titlebar"]);
        setAttr(bar, "role", "heading");
        setAttr(bar, "aria-level", "2");

        // Title text
        this.titleTextEl = createElement(
            "span", ["tabbedpanel-titlebar-text"],
            this.options.title || "Panel"
        );
        bar.appendChild(this.titleTextEl);

        // Action buttons
        const actions = this.buildTitleBarActions();
        bar.appendChild(actions);

        // Drag events for floating mode
        if (this.options.draggable)
        {
            this.attachTitleBarDrag(bar);
        }

        return bar;
    }

    /**
     * Builds the title bar action buttons (collapse, float, close).
     */
    private buildTitleBarActions(): HTMLElement
    {
        const actions = createElement(
            "div", ["tabbedpanel-titlebar-actions"]
        );

        // Collapse button
        if (this.options.collapsible)
        {
            this.collapseBtn = this.createActionButton(
                "tabbedpanel-collapse-btn",
                "Collapse panel",
                this.getCollapseIcon()
            );
            setAttr(this.collapseBtn, "aria-expanded", "true");

            this.collapseBtn.addEventListener("click", (e) =>
            {
                e.stopPropagation();
                this.toggleCollapse();
            });

            actions.appendChild(this.collapseBtn);
        }

        // Float/dock toggle button
        this.floatBtn = this.createActionButton(
            "tabbedpanel-float-btn",
            "Float panel",
            "bi-box-arrow-up-right"
        );

        this.floatBtn.addEventListener("click", (e) =>
        {
            e.stopPropagation();
            this.handleFloatToggle();
        });

        actions.appendChild(this.floatBtn);

        // Close button
        const closeBtn = this.createActionButton(
            "tabbedpanel-close-btn",
            "Close panel",
            "bi-x-lg"
        );

        closeBtn.addEventListener("click", (e) =>
        {
            e.stopPropagation();
            this.destroy();
        });

        actions.appendChild(closeBtn);

        return actions;
    }

    /**
     * Creates a button element with an icon for the title bar.
     */
    private createActionButton(
        cssClass: string, label: string, icon: string
    ): HTMLElement
    {
        const btn = createElement("button", [cssClass]);
        setAttr(btn, "aria-label", label);
        setAttr(btn, "title", label);

        const iconEl = createElement("i", ["bi", icon]);
        btn.appendChild(iconEl);

        return btn;
    }

    /**
     * Returns the appropriate collapse icon based on dock position.
     */
    private getCollapseIcon(): string
    {
        return this.dockPosition === "bottom"
            ? "bi-chevron-bar-down" : "bi-chevron-bar-up";
    }

    /**
     * Builds the tab bar container.
     */
    private buildTabBar(): HTMLElement
    {
        const bar = createElement("div", ["tabbedpanel-tabbar"]);
        setAttr(bar, "role", "tablist");

        const isVertical = this.tabBarPosition === "left" ||
            this.tabBarPosition === "right";
        setAttr(
            bar, "aria-orientation",
            isVertical ? "vertical" : "horizontal"
        );

        // Tab bar action area (collapse button when no title bar)
        const barActions = createElement(
            "div", ["tabbedpanel-tabbar-actions"]
        );

        if (this.options.collapsible && !this.resolveShowTitleBar())
        {
            this.tabBarCollapseBtn = this.createActionButton(
                "tabbedpanel-collapse-btn",
                "Collapse panel",
                this.getCollapseIcon()
            );
            setAttr(this.tabBarCollapseBtn, "aria-expanded", "true");

            this.tabBarCollapseBtn.addEventListener("click", (e) =>
            {
                e.stopPropagation();
                this.toggleCollapse();
            });

            barActions.appendChild(this.tabBarCollapseBtn);
        }

        bar.appendChild(barActions);

        return bar;
    }

    /**
     * Arranges the tab bar and content in the correct order based
     * on the tabBarPosition option.
     */
    private arrangeTabBarAndContent(): void
    {
        if (!this.rootEl || !this.tabBarEl || !this.contentEl)
        {
            return;
        }

        // Add tab bar position class to root
        this.rootEl.classList.add(
            `tabbedpanel-tabbar-${this.tabBarPosition}`
        );

        // Add title mode class
        if (this.tabTitleMode === "icon")
        {
            this.rootEl.classList.add("tabbedpanel-mode-icon");
        }
        else if (this.tabTitleMode === "text")
        {
            this.rootEl.classList.add("tabbedpanel-mode-text");
        }

        if (this.tabBarPosition === "left" || this.tabBarPosition === "right")
        {
            // Horizontal layout: wrap tab bar + content in a flex row
            const wrapper = createElement(
                "div", ["tabbedpanel-body-wrapper"]
            );

            if (this.tabBarPosition === "left")
            {
                wrapper.appendChild(this.tabBarEl);
                wrapper.appendChild(this.contentEl);
            }
            else
            {
                wrapper.appendChild(this.contentEl);
                wrapper.appendChild(this.tabBarEl);
            }

            this.rootEl.appendChild(wrapper);
        }
        else
        {
            // Vertical layout: tab bar top or bottom
            if (this.tabBarPosition === "top")
            {
                this.rootEl.appendChild(this.tabBarEl);
                this.rootEl.appendChild(this.contentEl);
            }
            else
            {
                this.rootEl.appendChild(this.contentEl);
                this.rootEl.appendChild(this.tabBarEl);
            }
        }
    }

    /**
     * Builds a single tab button element.
     */
    private buildTabButton(tab: TabDefinition): HTMLElement
    {
        const classes = ["tabbedpanel-tab"];

        if (tab.disabled)
        {
            classes.push("tabbedpanel-tab-disabled");
        }

        const btn = createElement("button", classes);
        const panelId = `${this.instanceId}-panel-${tab.id}`;
        const tabElId = `${this.instanceId}-tab-${tab.id}`;

        setAttr(btn, "role", "tab");
        setAttr(btn, "id", tabElId);
        setAttr(btn, "aria-selected", "false");
        setAttr(btn, "aria-controls", panelId);
        setAttr(btn, "aria-label", tab.title);
        setAttr(btn, "tabindex", "-1");

        if (tab.disabled)
        {
            setAttr(btn, "aria-disabled", "true");
        }

        // Icon
        if (tab.icon)
        {
            const icon = createElement(
                "i", ["bi", tab.icon, "tabbedpanel-tab-icon"]
            );
            btn.appendChild(icon);
        }

        // Label
        const label = createElement(
            "span", ["tabbedpanel-tab-label"], tab.title
        );
        btn.appendChild(label);

        // Close button
        if (tab.closable)
        {
            const closeBtn = createElement(
                "button", ["tabbedpanel-tab-close"]
            );
            setAttr(closeBtn, "aria-label", `Close ${tab.title} tab`);
            setAttr(closeBtn, "title", "Close tab");
            setAttr(closeBtn, "tabindex", "-1");

            const closeIcon = createElement("i", ["bi", "bi-x"]);
            closeBtn.appendChild(closeIcon);

            closeBtn.addEventListener("click", (e) =>
            {
                e.stopPropagation();
                this.removeTab(tab.id);
            });

            btn.appendChild(closeBtn);
        }

        // Tab click handler
        btn.addEventListener("click", () =>
        {
            if (!tab.disabled)
            {
                this.selectTab(tab.id);
            }
        });

        // Keyboard navigation
        btn.addEventListener("keydown", (e) =>
        {
            this.handleTabKeydown(e, tab.id);
        });

        this.tabButtonEls.set(tab.id, btn);

        return btn;
    }

    /**
     * Inserts a tab button into the tab bar before the actions area.
     */
    private insertTabButton(btn: HTMLElement): void
    {
        if (!this.tabBarEl)
        {
            return;
        }

        const actions = this.tabBarEl.querySelector(
            ".tabbedpanel-tabbar-actions"
        );

        if (actions)
        {
            this.tabBarEl.insertBefore(btn, actions);
        }
        else
        {
            this.tabBarEl.appendChild(btn);
        }
    }

    /**
     * Builds a tab panel element for content.
     */
    private buildTabPanel(tab: TabDefinition): HTMLElement
    {
        const panel = createElement("div", ["tabbedpanel-panel"]);
        const panelId = `${this.instanceId}-panel-${tab.id}`;
        const tabElId = `${this.instanceId}-tab-${tab.id}`;

        setAttr(panel, "role", "tabpanel");
        setAttr(panel, "id", panelId);
        setAttr(panel, "aria-labelledby", tabElId);
        setAttr(panel, "tabindex", "0");
        panel.hidden = true;

        if (tab.cssClass)
        {
            panel.classList.add(...tab.cssClass.split(" "));
        }

        // Set initial content
        if (tab.content)
        {
            if (typeof tab.content === "string")
            {
                panel.textContent = tab.content;
            }
            else
            {
                panel.appendChild(tab.content);
            }
        }

        this.tabPanelEls.set(tab.id, panel);

        return panel;
    }

    /**
     * Adds the initial set of tabs without triggering callbacks.
     */
    private addInitialTabs(tabDefs: TabDefinition[]): void
    {
        for (const tab of tabDefs)
        {
            this.tabs.push(tab);

            const btn = this.buildTabButton(tab);
            this.insertTabButton(btn);

            const panel = this.buildTabPanel(tab);
            this.contentEl?.appendChild(panel);
        }

        // Activate first non-disabled tab
        const firstActive = this.tabs.find((t) => !t.disabled);

        if (firstActive)
        {
            this.activateTab(firstActive.id);
        }
    }

    /**
     * Builds the collapsed strip element with icon and title.
     */
    private buildCollapsedStrip(): HTMLElement
    {
        const strip = createElement(
            "div", ["tabbedpanel-collapsed-strip"]
        );
        setAttr(strip, "tabindex", "0");
        setAttr(strip, "role", "button");
        setAttr(
            strip, "aria-label",
            `Expand ${this.options.title || "Panel"} panel`
        );

        // Icon from the active tab or first tab
        const activeTab = this.tabs.find(
            (t) => t.id === this.activeTabId
        );

        if (activeTab?.icon)
        {
            const icon = createElement(
                "i", ["bi", activeTab.icon, "tabbedpanel-collapsed-icon"]
            );
            strip.appendChild(icon);
        }

        // Title
        const title = createElement(
            "span", ["tabbedpanel-collapsed-title"],
            this.options.title || this.activeTabId || "Panel"
        );
        strip.appendChild(title);

        // Click to expand
        strip.addEventListener("click", () => this.expand());

        strip.addEventListener("keydown", (e) =>
        {
            if (e.key === "Enter" || e.key === " ")
            {
                e.preventDefault();
                this.expand();
            }
        });

        return strip;
    }

    /**
     * Builds resize handle elements.
     */
    private buildResizeHandles(): void
    {
        if (!this.rootEl)
        {
            return;
        }

        // Vertical resize handle (always present for docked)
        this.resizeHandleV = createElement(
            "div", [
                "tabbedpanel-resize-handle",
                "tabbedpanel-resize-handle-v"
            ]
        );
        setAttr(this.resizeHandleV, "role", "separator");
        setAttr(this.resizeHandleV, "aria-orientation", "horizontal");
        setAttr(this.resizeHandleV, "tabindex", "0");
        this.updateResizeHandleAria();
        this.rootEl.appendChild(this.resizeHandleV);
        this.attachResizeHandler(this.resizeHandleV, "vertical");

        // Horizontal resize handles (floating only)
        this.resizeHandleH = createElement(
            "div", [
                "tabbedpanel-resize-handle",
                "tabbedpanel-resize-handle-h",
                "tabbedpanel-resize-handle-h-right"
            ]
        );
        this.resizeHandleH.style.display = "none";
        this.rootEl.appendChild(this.resizeHandleH);
        this.attachResizeHandler(this.resizeHandleH, "horizontal");

        this.resizeHandleHL = createElement(
            "div", [
                "tabbedpanel-resize-handle",
                "tabbedpanel-resize-handle-h",
                "tabbedpanel-resize-handle-h-left"
            ]
        );
        this.resizeHandleHL.style.display = "none";
        this.rootEl.appendChild(this.resizeHandleHL);
        this.attachResizeHandler(this.resizeHandleHL, "horizontal-left");

        // Corner resize handle (floating only)
        this.resizeHandleCorner = createElement(
            "div", [
                "tabbedpanel-resize-handle",
                "tabbedpanel-resize-handle-corner"
            ]
        );
        this.resizeHandleCorner.style.display = "none";
        this.rootEl.appendChild(this.resizeHandleCorner);
        this.attachResizeHandler(this.resizeHandleCorner, "corner");
    }

    // ========================================================================
    // PRIVATE — TAB SWITCHING
    // ========================================================================

    /**
     * Activates a tab: shows its panel and updates ARIA state.
     */
    private activateTab(tabId: string): void
    {
        this.activeTabId = tabId;

        const btn = this.tabButtonEls.get(tabId);
        const panel = this.tabPanelEls.get(tabId);

        if (btn)
        {
            btn.classList.add("tabbedpanel-tab-active");
            setAttr(btn, "aria-selected", "true");
            setAttr(btn, "tabindex", "0");
        }

        if (panel)
        {
            panel.hidden = false;
            panel.classList.add("tabbedpanel-panel-active");
        }

        if (this.options.onTabSelect)
        {
            this.options.onTabSelect(tabId, this);
        }
    }

    /**
     * Deactivates a tab: hides its panel and updates ARIA state.
     */
    private deactivateTab(tabId: string): void
    {
        const btn = this.tabButtonEls.get(tabId);
        const panel = this.tabPanelEls.get(tabId);

        if (btn)
        {
            btn.classList.remove("tabbedpanel-tab-active");
            setAttr(btn, "aria-selected", "false");
            setAttr(btn, "tabindex", "-1");
        }

        if (panel)
        {
            panel.hidden = true;
            panel.classList.remove("tabbedpanel-panel-active");
        }

        if (this.options.onTabDeselect)
        {
            this.options.onTabDeselect(tabId, this);
        }
    }

    /**
     * Selects an adjacent tab after the active tab is removed.
     */
    private selectAdjacentTab(removedIndex: number): void
    {
        this.activeTabId = null;

        if (this.tabs.length === 0)
        {
            return;
        }

        const nextIdx = Math.min(removedIndex, this.tabs.length - 1);
        const nextTab = this.tabs[nextIdx];

        if (nextTab && !nextTab.disabled)
        {
            this.activateTab(nextTab.id);
        }
        else
        {
            // Find any non-disabled tab
            const any = this.tabs.find((t) => !t.disabled);

            if (any)
            {
                this.activateTab(any.id);
            }
        }
    }

    /**
     * Handles keyboard navigation within the tab bar (roving tabindex).
     */
    private handleTabKeydown(e: KeyboardEvent, tabId: string): void
    {
        const isVertical = this.tabBarPosition === "left" ||
            this.tabBarPosition === "right";

        const prevKey = isVertical ? "ArrowUp" : "ArrowLeft";
        const nextKey = isVertical ? "ArrowDown" : "ArrowRight";

        if (e.key === prevKey)
        {
            e.preventDefault();
            this.focusAdjacentTab(tabId, -1);
        }
        else if (e.key === nextKey)
        {
            e.preventDefault();
            this.focusAdjacentTab(tabId, 1);
        }
        else if (e.key === "Home")
        {
            e.preventDefault();
            this.focusFirstTab();
        }
        else if (e.key === "End")
        {
            e.preventDefault();
            this.focusLastTab();
        }
    }

    /**
     * Moves focus to the adjacent tab in the given direction.
     */
    private focusAdjacentTab(currentId: string, direction: number): void
    {
        const enabledTabs = this.tabs.filter((t) => !t.disabled);
        const idx = enabledTabs.findIndex((t) => t.id === currentId);

        if (idx === -1)
        {
            return;
        }

        let nextIdx = idx + direction;

        if (nextIdx < 0)
        {
            nextIdx = enabledTabs.length - 1;
        }
        else if (nextIdx >= enabledTabs.length)
        {
            nextIdx = 0;
        }

        const nextTab = enabledTabs[nextIdx];

        if (nextTab)
        {
            this.selectTab(nextTab.id);
            this.tabButtonEls.get(nextTab.id)?.focus();
        }
    }

    /** Focuses and selects the first enabled tab. */
    private focusFirstTab(): void
    {
        const first = this.tabs.find((t) => !t.disabled);

        if (first)
        {
            this.selectTab(first.id);
            this.tabButtonEls.get(first.id)?.focus();
        }
    }

    /** Focuses and selects the last enabled tab. */
    private focusLastTab(): void
    {
        const enabledTabs = this.tabs.filter((t) => !t.disabled);
        const last = enabledTabs[enabledTabs.length - 1];

        if (last)
        {
            this.selectTab(last.id);
            this.tabButtonEls.get(last.id)?.focus();
        }
    }

    // ========================================================================
    // PRIVATE — MODE AND POSITION
    // ========================================================================

    /**
     * Applies CSS classes for the current mode.
     */
    private applyModeClasses(): void
    {
        if (!this.rootEl)
        {
            return;
        }

        this.rootEl.classList.remove(
            "tabbedpanel-docked", "tabbedpanel-floating",
            "tabbedpanel-collapsed", "tabbedpanel-top", "tabbedpanel-bottom"
        );

        if (this.collapsed)
        {
            this.rootEl.classList.add(
                "tabbedpanel-docked", "tabbedpanel-collapsed"
            );
            this.rootEl.classList.add(
                `tabbedpanel-${this.dockPosition}`
            );
        }
        else if (this.currentMode === "docked")
        {
            this.rootEl.classList.add("tabbedpanel-docked");
            this.rootEl.classList.add(
                `tabbedpanel-${this.dockPosition}`
            );
        }
        else
        {
            this.rootEl.classList.add("tabbedpanel-floating");
        }

        this.toggleFloatingHandles();
        this.updateFloatButton();
        this.updateTitleBarVisibility();
    }

    /**
     * Applies inline styles for position, height, and width.
     */
    private applyPositionStyles(): void
    {
        if (!this.rootEl)
        {
            return;
        }

        if (this.collapsed)
        {
            this.rootEl.style.height =
                `${this.options.collapsedHeight}px`;
            this.rootEl.style.width = "";
            this.rootEl.style.top = "";
            this.rootEl.style.bottom = "";
            this.rootEl.style.left = "";
            this.rootEl.style.right = "";
            return;
        }

        if (this.currentMode === "docked")
        {
            this.rootEl.style.height = `${this.currentHeight}px`;
            this.rootEl.style.width = "";
            this.rootEl.style.top = "";
            this.rootEl.style.bottom = "";
            this.rootEl.style.left = "";
            this.rootEl.style.right = "";
        }
        else
        {
            // Floating
            this.rootEl.style.width = `${this.currentWidth}px`;
            this.rootEl.style.height = `${this.currentHeight}px`;
            this.rootEl.style.top = `${this.floatY}px`;
            this.rootEl.style.left = `${this.floatX}px`;
            this.rootEl.style.bottom = "";
            this.rootEl.style.right = "";

            const zIdx = this.options.zIndex || Z_INDEX_FLOATING;
            this.rootEl.style.zIndex = String(zIdx);
        }
    }

    /**
     * Shows or hides floating-only resize handles.
     */
    private toggleFloatingHandles(): void
    {
        const isFloating = this.currentMode === "floating" &&
            !this.collapsed;

        if (this.resizeHandleH)
        {
            this.resizeHandleH.style.display = isFloating ? "" : "none";
        }

        if (this.resizeHandleHL)
        {
            this.resizeHandleHL.style.display = isFloating ? "" : "none";
        }

        if (this.resizeHandleCorner)
        {
            this.resizeHandleCorner.style.display =
                isFloating ? "" : "none";
        }

        if (this.resizeHandleV)
        {
            this.resizeHandleV.style.display =
                this.collapsed ? "none" : "";
        }
    }

    /**
     * Updates the float/dock toggle button icon and label.
     */
    private updateFloatButton(): void
    {
        if (!this.floatBtn)
        {
            return;
        }

        const icon = this.floatBtn.querySelector("i");

        if (this.currentMode === "floating")
        {
            setAttr(this.floatBtn, "aria-label", "Dock panel");
            setAttr(this.floatBtn, "title", "Dock panel");

            if (icon)
            {
                icon.classList.remove("bi-box-arrow-up-right");
                icon.classList.add("bi-layout-sidebar-inset");
            }
        }
        else
        {
            setAttr(this.floatBtn, "aria-label", "Float panel");
            setAttr(this.floatBtn, "title", "Float panel");

            if (icon)
            {
                icon.classList.remove("bi-layout-sidebar-inset");
                icon.classList.add("bi-box-arrow-up-right");
            }
        }
    }

    /**
     * Shows/hides the title bar based on mode and options.
     */
    private updateTitleBarVisibility(): void
    {
        if (!this.titleBarEl)
        {
            return;
        }

        if (this.options.showTitleBar !== undefined)
        {
            return;
        }

        // Auto: show in floating, hide in docked
        this.titleBarEl.style.display =
            this.currentMode === "floating" ? "" : "none";
    }

    // ========================================================================
    // PRIVATE — COLLAPSE
    // ========================================================================

    /** Applies collapsed visual state. */
    private applyCollapsedState(): void
    {
        if (!this.rootEl)
        {
            return;
        }

        this.applyModeClasses();
        this.applyPositionStyles();

        if (this.collapsedStripEl)
        {
            this.collapsedStripEl.style.display = "";
        }

        if (this.titleBarEl)
        {
            this.titleBarEl.style.display = "none";
        }

        if (this.tabBarEl)
        {
            this.tabBarEl.style.display = "none";
        }

        if (this.contentEl)
        {
            this.contentEl.style.display = "none";
        }

        // Hide body wrapper if present
        const wrapper = this.rootEl.querySelector(
            ".tabbedpanel-body-wrapper"
        );

        if (wrapper instanceof HTMLElement)
        {
            wrapper.style.display = "none";
        }

        this.updateCollapseButtons("false");
    }

    /** Applies expanded visual state. */
    private applyExpandedState(): void
    {
        if (!this.rootEl)
        {
            return;
        }

        this.applyModeClasses();

        if (this.collapsedStripEl)
        {
            this.collapsedStripEl.style.display = "none";
        }

        if (this.titleBarEl)
        {
            this.titleBarEl.style.display = "";
        }

        if (this.tabBarEl)
        {
            this.tabBarEl.style.display = "";
        }

        if (this.contentEl)
        {
            this.contentEl.style.display = "";
        }

        // Show body wrapper if present
        const wrapper = this.rootEl.querySelector(
            ".tabbedpanel-body-wrapper"
        );

        if (wrapper instanceof HTMLElement)
        {
            wrapper.style.display = "";
        }

        this.applyPositionStyles();
        this.updateTitleBarVisibility();
        this.updateCollapseButtons("true");
    }

    /** Updates aria-expanded on both collapse buttons. */
    private updateCollapseButtons(value: string): void
    {
        if (this.collapseBtn)
        {
            setAttr(this.collapseBtn, "aria-expanded", value);
        }

        if (this.tabBarCollapseBtn)
        {
            setAttr(this.tabBarCollapseBtn, "aria-expanded", value);
        }
    }

    // ========================================================================
    // PRIVATE — FLOATING DRAG
    // ========================================================================

    /** Attaches pointer event handlers for floating drag. */
    private attachTitleBarDrag(bar: HTMLElement): void
    {
        bar.addEventListener("pointerdown", (e) =>
        {
            this.handleDragStart(e, bar);
        });
    }

    /** Begins a title bar drag operation using pointer capture. */
    private handleDragStart(e: PointerEvent, bar: HTMLElement): void
    {
        if (this.currentMode !== "floating" || e.button !== 0)
        {
            return;
        }

        const target = e.target as HTMLElement;

        if (target.closest(".tabbedpanel-titlebar-actions"))
        {
            return;
        }

        e.preventDefault();
        this.isDragging = true;
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        this.dragOrigX = this.floatX;
        this.dragOrigY = this.floatY;

        bar.setPointerCapture(e.pointerId);

        this.boundDragMove = (ev: PointerEvent) =>
            this.handleDragMove(ev);
        this.boundDragEnd = (ev: PointerEvent) =>
            this.handleDragEnd(ev, bar);

        bar.addEventListener("pointermove", this.boundDragMove);
        bar.addEventListener("pointerup", this.boundDragEnd);

        TabbedPanelManager.getInstance().showDropZones();
    }

    /** Handles pointer movement during a drag operation. */
    private handleDragMove(e: PointerEvent): void
    {
        if (!this.isDragging)
        {
            return;
        }

        const dx = e.clientX - this.dragStartX;
        const dy = e.clientY - this.dragStartY;

        this.floatX = Math.max(0, this.dragOrigX + dx);
        this.floatY = Math.max(0, this.dragOrigY + dy);

        this.applyPositionStyles();

        TabbedPanelManager.getInstance().updateDropZones(e.clientY);
    }

    /** Ends a drag operation and checks for dock zone snap. */
    private handleDragEnd(e: PointerEvent, bar: HTMLElement): void
    {
        if (!this.isDragging)
        {
            return;
        }

        this.isDragging = false;
        bar.releasePointerCapture(e.pointerId);

        if (this.boundDragMove)
        {
            bar.removeEventListener("pointermove", this.boundDragMove);
        }

        if (this.boundDragEnd)
        {
            bar.removeEventListener("pointerup", this.boundDragEnd);
        }

        const dockTarget = TabbedPanelManager.getInstance().getDockTarget(
            e.clientY
        );

        TabbedPanelManager.getInstance().hideDropZones();

        if (dockTarget)
        {
            this.dock(dockTarget);
        }
    }

    // ========================================================================
    // PRIVATE — RESIZE HANDLING
    // ========================================================================

    /**
     * Attaches pointer and keyboard handlers to a resize handle.
     */
    private attachResizeHandler(
        handle: HTMLElement, direction: string
    ): void
    {
        handle.addEventListener("pointerdown", (e) =>
        {
            if (e.button !== 0)
            {
                return;
            }

            e.preventDefault();
            e.stopPropagation();
            handle.setPointerCapture(e.pointerId);

            const startX = e.clientX;
            const startY = e.clientY;
            const startWidth = this.currentWidth;
            const startHeight = this.currentHeight;

            const onMove = (ev: PointerEvent) =>
            {
                this.handleResizeMove(
                    ev, direction, startX, startY,
                    startWidth, startHeight
                );
            };

            const onUp = (ev: PointerEvent) =>
            {
                handle.releasePointerCapture(ev.pointerId);
                handle.removeEventListener("pointermove", onMove);
                handle.removeEventListener("pointerup", onUp);
                this.handleResizeEnd();
            };

            handle.addEventListener("pointermove", onMove);
            handle.addEventListener("pointerup", onUp);
        });

        handle.addEventListener("keydown", (e) =>
        {
            this.handleResizeKeyboard(e, direction);
        });
    }

    /** Processes resize movement based on direction. */
    private handleResizeMove(
        e: PointerEvent,
        direction: string,
        startX: number,
        startY: number,
        startWidth: number,
        startHeight: number
    ): void
    {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        if (direction === "vertical" || direction === "corner")
        {
            this.applyResizeHeight(dy, startHeight);
        }

        if (direction === "horizontal" || direction === "corner")
        {
            this.currentWidth = clamp(
                startWidth + dx,
                this.options.minWidth,
                this.options.maxWidth
            );
        }

        if (direction === "horizontal-left")
        {
            this.currentWidth = clamp(
                startWidth - dx,
                this.options.minWidth,
                this.options.maxWidth
            );

            // Adjust X position so right edge stays fixed
            this.floatX = startX + dx - (startX - this.dragOrigX);
            const widthDiff = startWidth - this.currentWidth;
            this.floatX = this.dragOrigX + widthDiff;
        }

        this.applyPositionStyles();
        this.updateResizeHandleAria();
    }

    /** Applies height change during vertical resize. */
    private applyResizeHeight(
        dy: number, startHeight: number
    ): void
    {
        if (this.currentMode === "docked" &&
            this.dockPosition === "bottom")
        {
            // Bottom dock: dragging up increases height
            this.currentHeight = clamp(
                startHeight - dy,
                this.options.minHeight,
                this.options.maxHeight
            );
        }
        else if (this.currentMode === "docked" &&
            this.dockPosition === "top")
        {
            // Top dock: dragging down increases height
            this.currentHeight = clamp(
                startHeight + dy,
                this.options.minHeight,
                this.options.maxHeight
            );
        }
        else
        {
            // Floating: dragging down increases height
            this.currentHeight = clamp(
                startHeight + dy,
                this.options.minHeight,
                this.options.maxHeight
            );
        }
    }

    /** Fires callbacks and updates after resize completes. */
    private handleResizeEnd(): void
    {
        this.updateCssCustomProperties();

        if (this.options.onResize)
        {
            this.options.onResize(
                this.currentWidth, this.currentHeight, this
            );
        }
    }

    /** Handles keyboard arrow keys for accessible resize. */
    private handleResizeKeyboard(
        e: KeyboardEvent, direction: string
    ): void
    {
        let handled = false;

        if (direction === "vertical" || direction === "corner")
        {
            if (e.key === "ArrowUp")
            {
                this.applyResizeHeight(
                    -KEYBOARD_RESIZE_STEP, this.currentHeight
                );
                handled = true;
            }
            else if (e.key === "ArrowDown")
            {
                this.applyResizeHeight(
                    KEYBOARD_RESIZE_STEP, this.currentHeight
                );
                handled = true;
            }
        }

        if (direction === "horizontal" || direction === "corner" ||
            direction === "horizontal-left")
        {
            if (e.key === "ArrowRight")
            {
                this.currentWidth = clamp(
                    this.currentWidth + KEYBOARD_RESIZE_STEP,
                    this.options.minWidth,
                    this.options.maxWidth
                );
                handled = true;
            }
            else if (e.key === "ArrowLeft")
            {
                this.currentWidth = clamp(
                    this.currentWidth - KEYBOARD_RESIZE_STEP,
                    this.options.minWidth,
                    this.options.maxWidth
                );
                handled = true;
            }
        }

        if (handled)
        {
            e.preventDefault();
            this.applyPositionStyles();
            this.updateResizeHandleAria();
            this.handleResizeEnd();
        }
    }

    /** Updates ARIA value attributes on the vertical resize handle. */
    private updateResizeHandleAria(): void
    {
        if (!this.resizeHandleV)
        {
            return;
        }

        setAttr(
            this.resizeHandleV, "aria-valuenow",
            String(this.currentHeight)
        );
        setAttr(
            this.resizeHandleV, "aria-valuemin",
            String(this.options.minHeight)
        );
        setAttr(
            this.resizeHandleV, "aria-valuemax",
            String(this.options.maxHeight)
        );
    }

    // ========================================================================
    // PRIVATE — CSS CUSTOM PROPERTIES
    // ========================================================================

    /** Delegates CSS property updates to TabbedPanelManager. */
    private updateCssCustomProperties(): void
    {
        TabbedPanelManager.getInstance().updateCssCustomProperties();
    }

    // ========================================================================
    // PRIVATE — CALLBACKS
    // ========================================================================

    /** Fires the onModeChange callback if configured. */
    private fireOnModeChange(mode: TabbedPanelMode): void
    {
        if (this.options.onModeChange)
        {
            this.options.onModeChange(mode, this);
        }
    }

    /** Handles the float/dock toggle button click. */
    private handleFloatToggle(): void
    {
        if (this.currentMode === "floating")
        {
            this.dock(this.dockPosition);
        }
        else
        {
            const x = Math.max(
                20, (window.innerWidth - this.currentWidth) / 2
            );
            const y = Math.max(20, (window.innerHeight - 300) / 2);

            this.float(x, y);
        }
    }
}

// ============================================================================
// S5: PUBLIC API — TabbedPanelManager
// ============================================================================

/**
 * TabbedPanelManager is a singleton that coordinates CSS custom properties,
 * drop zone indicators, and stacking for all active TabbedPanel instances.
 */
export class TabbedPanelManager
{
    private static instance: TabbedPanelManager | null = null;
    private panels: Map<string, TabbedPanel> = new Map();

    // Drop zone elements
    private dropZoneTop: HTMLElement | null = null;
    private dropZoneBottom: HTMLElement | null = null;

    private constructor()
    {
        console.log(`${LOG_PREFIX} TabbedPanelManager initialised.`);
    }

    /** Returns the singleton instance. */
    public static getInstance(): TabbedPanelManager
    {
        if (!TabbedPanelManager.instance)
        {
            TabbedPanelManager.instance = new TabbedPanelManager();

            if (typeof window !== "undefined")
            {
                (window as any).__tabbedPanelManager =
                    TabbedPanelManager.instance;
            }
        }

        return TabbedPanelManager.instance;
    }

    /** Registers a panel for management. */
    public register(panel: TabbedPanel): void
    {
        if (this.panels.has(panel.getId()))
        {
            return;
        }

        this.panels.set(panel.getId(), panel);
        console.debug(
            `${LOG_PREFIX} Registered panel:`, panel.getId()
        );
    }

    /** Unregisters a panel from management. */
    public unregister(panel: TabbedPanel): void
    {
        if (!this.panels.has(panel.getId()))
        {
            return;
        }

        this.panels.delete(panel.getId());
        this.updateCssCustomProperties();

        console.debug(
            `${LOG_PREFIX} Unregistered panel:`, panel.getId()
        );
    }

    /** Returns all panels at a dock position. */
    public getPanels(
        position?: TabbedPanelDockPosition
    ): TabbedPanel[]
    {
        const all = Array.from(this.panels.values());

        if (!position)
        {
            return all;
        }

        return all.filter((p) =>
        {
            return p.getDockPosition() === position &&
                   p.getMode() === "docked" &&
                   p.isVisible();
        });
    }

    /**
     * Updates --tabbedpanel-top-height and --tabbedpanel-bottom-height
     * on <html> based on all visible docked panels.
     */
    public updateCssCustomProperties(): void
    {
        const root = document.documentElement;

        const topHeight = this.getDockedHeight("top");
        const bottomHeight = this.getDockedHeight("bottom");

        if (topHeight > 0)
        {
            root.style.setProperty(
                "--tabbedpanel-top-height", `${topHeight}px`
            );
        }
        else
        {
            root.style.removeProperty("--tabbedpanel-top-height");
        }

        if (bottomHeight > 0)
        {
            root.style.setProperty(
                "--tabbedpanel-bottom-height", `${bottomHeight}px`
            );
        }
        else
        {
            root.style.removeProperty("--tabbedpanel-bottom-height");
        }
    }

    /** Calculates total height of visible docked panels at a position. */
    private getDockedHeight(
        position: TabbedPanelDockPosition
    ): number
    {
        const panels = this.getPanels(position);
        let total = 0;

        for (const p of panels)
        {
            if (p.isCollapsed())
            {
                total += 32; // collapsed height
            }
            else
            {
                total += p.getHeight();
            }
        }

        return total;
    }

    // ========================================================================
    // DROP ZONES — DRAG-TO-DOCK
    // ========================================================================

    /** Creates and shows drop zone overlay elements during drag. */
    public showDropZones(): void
    {
        if (!this.dropZoneTop)
        {
            this.dropZoneTop = createElement(
                "div", [
                    "tabbedpanel-dock-zone",
                    "tabbedpanel-dock-zone-top"
                ]
            );
            document.body.appendChild(this.dropZoneTop);
        }

        if (!this.dropZoneBottom)
        {
            this.dropZoneBottom = createElement(
                "div", [
                    "tabbedpanel-dock-zone",
                    "tabbedpanel-dock-zone-bottom"
                ]
            );
            document.body.appendChild(this.dropZoneBottom);
        }
    }

    /** Updates drop zone active state based on pointer Y. */
    public updateDropZones(clientY: number): void
    {
        if (this.dropZoneTop)
        {
            if (clientY <= DOCK_ZONE_THRESHOLD)
            {
                this.dropZoneTop.classList.add(
                    "tabbedpanel-dock-zone-active"
                );
            }
            else
            {
                this.dropZoneTop.classList.remove(
                    "tabbedpanel-dock-zone-active"
                );
            }
        }

        if (this.dropZoneBottom)
        {
            if (clientY >= (window.innerHeight - DOCK_ZONE_THRESHOLD))
            {
                this.dropZoneBottom.classList.add(
                    "tabbedpanel-dock-zone-active"
                );
            }
            else
            {
                this.dropZoneBottom.classList.remove(
                    "tabbedpanel-dock-zone-active"
                );
            }
        }
    }

    /** Hides and removes drop zone overlay elements. */
    public hideDropZones(): void
    {
        if (this.dropZoneTop)
        {
            this.dropZoneTop.remove();
            this.dropZoneTop = null;
        }

        if (this.dropZoneBottom)
        {
            this.dropZoneBottom.remove();
            this.dropZoneBottom = null;
        }
    }

    /** Returns the dock position if pointer is near an edge. */
    public getDockTarget(
        clientY: number
    ): TabbedPanelDockPosition | null
    {
        if (clientY <= DOCK_ZONE_THRESHOLD)
        {
            return "top";
        }

        if (clientY >= (window.innerHeight - DOCK_ZONE_THRESHOLD))
        {
            return "bottom";
        }

        return null;
    }
}

// ============================================================================
// S6: CONVENIENCE FUNCTIONS AND GLOBAL EXPORTS
// ============================================================================

/**
 * Creates a TabbedPanel, shows it, and returns the instance.
 */
export function createTabbedPanel(
    options: TabbedPanelOptions,
    container?: string | HTMLElement
): TabbedPanel
{
    const panel = new TabbedPanel(options);
    panel.show(container);
    return panel;
}

/**
 * Creates a docked TabbedPanel.
 * The dockPosition is taken from options (default: "bottom").
 */
export function createDockedTabbedPanel(
    options: TabbedPanelOptions,
    container?: string | HTMLElement
): TabbedPanel
{
    const merged = { ...options, mode: "docked" as const };
    return createTabbedPanel(merged, container);
}

/**
 * Creates a floating TabbedPanel.
 * Position is taken from options.floatX / options.floatY.
 */
export function createFloatingTabbedPanel(
    options: TabbedPanelOptions,
    container?: string | HTMLElement
): TabbedPanel
{
    const merged = {
        ...options,
        mode: "floating" as const,
        showTitleBar: true,
    };
    return createTabbedPanel(merged, container);
}

// Global exports for script tag usage
if (typeof window !== "undefined")
{
    (window as any).TabbedPanel = TabbedPanel;
    (window as any).TabbedPanelManager = TabbedPanelManager;
    (window as any).createTabbedPanel = createTabbedPanel;
    (window as any).createDockedTabbedPanel = createDockedTabbedPanel;
    (window as any).createFloatingTabbedPanel = createFloatingTabbedPanel;
}
