/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: Sidebar
 * 📜 PURPOSE: Dockable, floatable, resizable sidebar panel component with
 *    tab grouping, collapse-to-icon-strip, drag-to-dock, and CSS custom
 *    property integration for main content offset.
 * 🔗 RELATES: [[EnterpriseTheme]], [[CustomComponents]], [[StatusBar]]
 * ⚡ FLOW: [Consumer App] -> [createSidebar()] -> [DOM fixed panel]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

/** Dock edge position */
export type SidebarDockPosition = "left" | "right";

/** Current sidebar mode */
export type SidebarMode = "docked" | "floating" | "collapsed";

/**
 * Configuration options for the Sidebar component.
 * All visual and behavioural aspects are controlled through these options.
 */
export interface SidebarOptions
{
    /** Unique identifier. Auto-generated if omitted. */
    id?: string;

    /** Title text displayed in the title bar. */
    title: string;

    /** Optional Bootstrap Icons class for the title bar icon. */
    icon?: string;

    /** Initial mode. Default: "docked". */
    mode?: "docked" | "floating";

    /** Dock edge when mode is "docked". Default: "left". */
    dockPosition?: SidebarDockPosition;

    /** Panel width in pixels. Default: 280. */
    width?: number;

    /** Minimum resize width in pixels. Default: 180. */
    minWidth?: number;

    /** Maximum resize width in pixels. Default: 600. */
    maxWidth?: number;

    /** Panel height when floating, in pixels. Default: 400. */
    height?: number;

    /** Minimum floating height in pixels. Default: 200. */
    minHeight?: number;

    /** Maximum floating height in pixels. Default: 800. */
    maxHeight?: number;

    /** Initial floating X position in pixels. */
    floatX?: number;

    /** Initial floating Y position in pixels. */
    floatY?: number;

    /** Start collapsed. Default: false. */
    collapsed?: boolean;

    /** Width when collapsed in pixels. Default: 40. */
    collapsedWidth?: number;

    /** Background colour (CSS value). */
    backgroundColor?: string;

    /** Opacity (0-1). */
    opacity?: number;

    /** Border colour (CSS value). */
    borderColor?: string;

    /** Border width (CSS value). */
    borderWidth?: string;

    /** CSS z-index override. */
    zIndex?: number;

    /** Additional CSS class(es) for the root element. */
    cssClass?: string;

    /** Enable resize handles. Default: true. */
    resizable?: boolean;

    /** Enable floating drag. Default: true. */
    draggable?: boolean;

    /** Enable collapse functionality. Default: true. */
    collapsible?: boolean;

    /** Show title bar. Default: true. */
    showTitleBar?: boolean;

    /** Contained mode: position relative, fills parent, no viewport pinning.
     *  Used by DockLayout. Default: false. */
    contained?: boolean;

    /** Called when mode changes (docked/floating/collapsed). */
    onModeChange?: (mode: SidebarMode, sidebar: Sidebar) => void;

    /** Called after resize completes. */
    onResize?: (width: number, height: number, sidebar: Sidebar) => void;

    /** Called when collapse state changes. */
    onCollapseToggle?: (collapsed: boolean, sidebar: Sidebar) => void;

    /** Called before close. Return false to cancel. */
    onBeforeClose?: (sidebar: Sidebar) => boolean;

    /** Called after close/destroy. */
    onClose?: (sidebar: Sidebar) => void;

    /** Override default key combos. Keys are action names, values are combo strings. */
    keyBindings?: Partial<Record<string, string>>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[Sidebar]";

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

/** Z-index values for sidebar layers */
const Z_INDEX_DOCKED = 1035;
const Z_INDEX_FLOATING = 1036;

/** Distance in pixels from viewport edge to trigger dock zone */
const DOCK_ZONE_THRESHOLD = 40;

/** Keyboard resize increment in pixels */
const KEYBOARD_RESIZE_STEP = 10;

/** Sidebar instance counter for unique ID generation */
let instanceCounter = 0;

/** Default key bindings for sidebar keyboard actions. */
const DEFAULT_KEY_BINDINGS: Record<string, string> = {
    expand: "Enter",
    expandSpace: " ",
    resizeGrowH: "ArrowRight",
    resizeShrinkH: "ArrowLeft",
    resizeGrowV: "ArrowDown",
    resizeShrinkV: "ArrowUp",
};

// ============================================================================
// PRIVATE HELPERS — DOM
// ============================================================================

/**
 * Creates an HTML element with optional CSS classes and text content.
 *
 * @param tag - The HTML tag name
 * @param classes - CSS class names to add
 * @param text - Optional text content
 * @returns The created element
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
 *
 * @param el - Target element
 * @param name - Attribute name
 * @param value - Attribute value
 */
function setAttr(el: HTMLElement, name: string, value: string): void
{
    el.setAttribute(name, value);
}

/**
 * Clamps a number between a minimum and maximum value.
 *
 * @param value - The value to clamp
 * @param min - Minimum bound
 * @param max - Maximum bound
 * @returns The clamped value
 */
function clamp(value: number, min: number, max: number): number
{
    return Math.max(min, Math.min(max, value));
}

// ============================================================================
// PUBLIC API — Sidebar
// ============================================================================

// @entrypoint
/**
 * Sidebar renders a dockable, floatable, resizable panel that acts as a
 * container for other components. Supports tab grouping when multiple
 * sidebars share the same dock edge, collapse to a 40px icon strip, and
 * drag-to-dock with visual drop zones.
 *
 * @example
 * const sb = new Sidebar({
 *     title: "Explorer",
 *     icon: "bi-folder",
 *     mode: "docked",
 *     dockPosition: "left"
 * });
 * sb.show();
 * sb.getContentElement().appendChild(myTree);
 */
export class Sidebar
{
    private readonly instanceId: string;
    private readonly options: Required<Pick<SidebarOptions,
        "title" | "width" | "minWidth" | "maxWidth" | "height" |
        "minHeight" | "maxHeight" | "collapsedWidth" | "resizable" |
        "draggable" | "collapsible" | "showTitleBar"
    >> & SidebarOptions;

    // State
    private currentMode: SidebarMode = "docked";
    private dockPosition: SidebarDockPosition = "left";
    private currentWidth: number;
    private currentHeight: number;
    private collapsed = false;
    private visible = false;
    private contained = false;

    // External listeners (for DockLayout integration)
    private resizeListeners: Array<(w: number, h: number, s: Sidebar) => void> = [];
    private collapseListeners: Array<(collapsed: boolean, s: Sidebar) => void> = [];

    // Floating position
    private floatX = 100;
    private floatY = 100;

    // DOM references
    private rootEl: HTMLElement | null = null;
    private titleBarEl: HTMLElement | null = null;
    private titleTextEl: HTMLElement | null = null;
    private titleIconEl: HTMLElement | null = null;
    private contentEl: HTMLElement | null = null;
    private collapsedStripEl: HTMLElement | null = null;
    private collapseBtn: HTMLElement | null = null;
    private floatBtn: HTMLElement | null = null;
    private resizeHandleH: HTMLElement | null = null;
    private resizeHandleV: HTMLElement | null = null;
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

    constructor(options: SidebarOptions)
    {
        instanceCounter += 1;
        this.instanceId = options.id || `sidebar-${instanceCounter}`;

        // Merge defaults
        this.options = {
            mode: "docked",
            dockPosition: "left",
            width: 280,
            minWidth: 180,
            maxWidth: Math.round(window.innerWidth * 0.5),
            height: 400,
            minHeight: 200,
            maxHeight: 800,
            collapsedWidth: 40,
            resizable: true,
            draggable: true,
            collapsible: true,
            showTitleBar: true,
            ...options,
        };

        this.currentMode = this.options.mode === "floating" ? "floating" : "docked";
        this.dockPosition = this.options.dockPosition || "left";
        this.currentWidth = this.options.width;
        this.currentHeight = this.options.height;

        if (this.options.floatX !== undefined)
        {
            this.floatX = this.options.floatX;
        }

        if (this.options.floatY !== undefined)
        {
            this.floatY = this.options.floatY;
        }

        this.contained = this.options.contained || false;

        this.buildDOM();

        // Start collapsed if requested
        if (this.options.collapsed)
        {
            this.collapsed = true;
            this.applyCollapsedState();
        }

        logInfo("Initialised:", this.instanceId);
        logDebug("Options:", this.options);
    }

    // ========================================================================
    // PUBLIC — LIFECYCLE
    // ========================================================================

    /**
     * Appends the sidebar to document.body, registers with SidebarManager,
     * and updates CSS custom properties.
     */
    public show(container?: HTMLElement): void
    {
        if (this.visible)
        {
            logWarn("Already visible:", this.instanceId);
            return;
        }

        if (!this.rootEl)
        {
            logError("DOM not built; cannot show.");
            return;
        }

        const target = container || document.body;
        target.appendChild(this.rootEl);
        this.visible = true;

        // Register with SidebarManager for tab grouping
        if (!this.contained)
        {
            SidebarManager.getInstance().register(this);
        }

        this.applyModeClasses();
        this.applyPositionStyles();
        this.updateCssCustomProperties();

        logDebug("Shown:", this.instanceId);
    }

    /**
     * Removes the sidebar from the DOM without destroying state.
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

        logDebug("Hidden:", this.instanceId);
    }

    /**
     * Hides the sidebar, unregisters from SidebarManager, fires onClose,
     * and releases all internal references.
     */
    public destroy(): void
    {
        if (this.options.onBeforeClose)
        {
            const allowed = this.options.onBeforeClose(this);

            if (allowed === false)
            {
                logDebug("Destroy cancelled by onBeforeClose.");
                return;
            }
        }

        this.hide();

        SidebarManager.getInstance().unregister(this);

        if (this.options.onClose)
        {
            this.options.onClose(this);
        }

        this.rootEl = null;
        this.titleBarEl = null;
        this.titleTextEl = null;
        this.titleIconEl = null;
        this.contentEl = null;
        this.collapsedStripEl = null;
        this.collapseBtn = null;
        this.floatBtn = null;
        this.resizeHandleH = null;
        this.resizeHandleV = null;
        this.resizeHandleCorner = null;
        this.boundDragMove = null;
        this.boundDragEnd = null;

        logDebug("Destroyed:", this.instanceId);
    }

    // ========================================================================
    // PUBLIC — MODE SWITCHING
    // ========================================================================

    /**
     * Switches the sidebar to docked mode at the given position.
     *
     * @param position - Dock edge ("left" or "right")
     */
    public dock(position: SidebarDockPosition): void
    {
        if (this.collapsed)
        {
            this.collapsed = false;
        }

        this.dockPosition = position;
        this.currentMode = "docked";

        this.applyModeClasses();
        this.applyPositionStyles();

        // Re-register for tab grouping at the new position
        if (this.visible)
        {
            SidebarManager.getInstance().rebuildTabs(this.dockPosition);
            this.updateCssCustomProperties();
        }

        this.fireOnModeChange("docked");

        logDebug("Docked to:", position);
    }

    /**
     * Switches the sidebar to floating mode at optional coordinates.
     *
     * @param x - Horizontal position in pixels
     * @param y - Vertical position in pixels
     */
    public float(x?: number, y?: number): void
    {
        if (this.collapsed)
        {
            this.collapsed = false;
        }

        const prevPosition = this.dockPosition;

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
            SidebarManager.getInstance().rebuildTabs(prevPosition);
            this.updateCssCustomProperties();
        }

        this.fireOnModeChange("floating");

        logDebug("Floating at:", this.floatX, this.floatY);
    }

    // ========================================================================
    // PUBLIC — COLLAPSE
    // ========================================================================

    /**
     * Collapses the sidebar to a narrow icon strip.
     */
    public collapse(): void
    {
        if (this.collapsed || this.currentMode === "floating")
        {
            return;
        }

        this.collapsed = true;
        this.applyCollapsedState();
        this.updateCssCustomProperties();
        this.fireOnModeChange("collapsed");

        if (this.options.onCollapseToggle)
        {
            this.options.onCollapseToggle(true, this);
        }

        for (const fn of this.collapseListeners)
        {
            fn(true, this);
        }

        logDebug("Collapsed:", this.instanceId);
    }

    /**
     * Expands the sidebar from collapsed state.
     */
    public expand(): void
    {
        if (!this.collapsed)
        {
            return;
        }

        this.collapsed = false;
        this.applyExpandedState();
        this.updateCssCustomProperties();
        this.fireOnModeChange("docked");

        if (this.options.onCollapseToggle)
        {
            this.options.onCollapseToggle(false, this);
        }

        for (const fn of this.collapseListeners)
        {
            fn(false, this);
        }

        logDebug("Expanded:", this.instanceId);
    }

    /**
     * Toggles between collapsed and expanded states.
     */
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
    // PUBLIC — CONTENT
    // ========================================================================

    /**
     * Updates the title bar text.
     *
     * @param title - New title text
     */
    public setTitle(title: string): void
    {
        if (this.titleTextEl)
        {
            this.titleTextEl.textContent = title;
        }

        // Update collapsed strip title
        const stripTitle = this.rootEl?.querySelector(
            ".sidebar-collapsed-title"
        );

        if (stripTitle)
        {
            stripTitle.textContent = title;
        }
    }

    /**
     * Updates the title bar icon.
     *
     * @param iconClass - Bootstrap Icons class (e.g., "bi-folder")
     */
    public setIcon(iconClass: string): void
    {
        if (this.titleIconEl)
        {
            // Clear existing icon classes, keep "bi" and "sidebar-titlebar-icon"
            const keepClasses = ["bi", "sidebar-titlebar-icon"];
            const toRemove: string[] = [];

            this.titleIconEl.classList.forEach((cls) =>
            {
                if (!keepClasses.includes(cls))
                {
                    toRemove.push(cls);
                }
            });

            toRemove.forEach((cls) => this.titleIconEl!.classList.remove(cls));
            this.titleIconEl.classList.add(iconClass);
        }
    }

    /**
     * Sets the sidebar width programmatically, clamped to min/max.
     *
     * @param w - Width in pixels
     */
    public setWidth(w: number): void
    {
        this.currentWidth = clamp(w, this.options.minWidth, this.options.maxWidth);
        this.applyPositionStyles();
        this.updateCssCustomProperties();
    }

    /**
     * Sets the sidebar height programmatically, clamped to min/max.
     * Only affects floating mode.
     *
     * @param h - Height in pixels
     */
    public setHeight(h: number): void
    {
        this.currentHeight = clamp(
            h, this.options.minHeight, this.options.maxHeight
        );
        this.applyPositionStyles();
    }

    /**
     * Returns the content element for consumers to append children.
     *
     * @returns The content div element
     */
    public getContentElement(): HTMLElement | null
    {
        return this.contentEl;
    }

    // ========================================================================
    // PUBLIC — STATE QUERIES
    // ========================================================================

    /** Returns the sidebar instance ID. */
    public getId(): string
    {
        return this.instanceId;
    }

    /** Returns the current mode. */
    public getMode(): SidebarMode
    {
        if (this.collapsed)
        {
            return "collapsed";
        }

        return this.currentMode;
    }

    /** Returns the current dock position. */
    public getDockPosition(): SidebarDockPosition
    {
        return this.dockPosition;
    }

    /** Returns the current width in pixels. */
    public getWidth(): number
    {
        return this.currentWidth;
    }

    /** Returns the current height in pixels. */
    public getHeight(): number
    {
        return this.currentHeight;
    }

    /** Returns whether the sidebar is currently visible. */
    public isVisible(): boolean
    {
        return this.visible;
    }

    /** Returns whether the sidebar is collapsed. */
    public isCollapsed(): boolean
    {
        return this.collapsed;
    }

    /** Returns whether the sidebar is in contained mode. */
    public isContained(): boolean
    {
        return this.contained;
    }

    /** Sets contained mode programmatically. */
    public setContained(value: boolean): void
    {
        this.contained = value;
        this.applyModeClasses();
        this.applyPositionStyles();
    }

    /** Registers an additional resize listener (does not replace onResize). */
    public addResizeListener(
        fn: (w: number, h: number, s: Sidebar) => void
    ): void
    {
        this.resizeListeners.push(fn);
    }

    /** Removes a resize listener. */
    public removeResizeListener(fn: Function): void
    {
        this.resizeListeners = this.resizeListeners.filter(
            (f) => f !== fn
        );
    }

    /** Registers an additional collapse listener (does not replace onCollapseToggle). */
    public addCollapseListener(
        fn: (collapsed: boolean, s: Sidebar) => void
    ): void
    {
        this.collapseListeners.push(fn);
    }

    /** Removes a collapse listener. */
    public removeCollapseListener(fn: Function): void
    {
        this.collapseListeners = this.collapseListeners.filter(
            (f) => f !== fn
        );
    }

    /** Returns the root DOM element. */
    public getRootElement(): HTMLElement | null
    {
        return this.rootEl;
    }

    /** Returns the sidebar title. */
    public getTitle(): string
    {
        return this.options.title;
    }

    /** Returns the sidebar icon class. */
    public getIcon(): string | undefined
    {
        return this.options.icon;
    }

    // ========================================================================
    // PRIVATE — KEY BINDING HELPERS
    // ========================================================================

    /**
     * Resolves the key combo string for the given action name.
     */
    private resolveKeyCombo(action: string): string
    {
        return this.options.keyBindings?.[action]
            ?? DEFAULT_KEY_BINDINGS[action] ?? "";
    }

    /**
     * Tests whether a keyboard event matches the combo for an action.
     */
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
    // PRIVATE — DOM CONSTRUCTION
    // ========================================================================

    /**
     * Builds the complete sidebar DOM tree.
     */
    private buildDOM(): void
    {
        this.rootEl = this.buildRoot();

        // Title bar
        if (this.options.showTitleBar)
        {
            this.titleBarEl = this.buildTitleBar();
            this.rootEl.appendChild(this.titleBarEl);
        }

        // Content area
        this.contentEl = createElement("div", ["sidebar-content"]);
        this.rootEl.appendChild(this.contentEl);

        // Collapsed strip (hidden until collapsed)
        this.collapsedStripEl = this.buildCollapsedStrip();
        this.rootEl.appendChild(this.collapsedStripEl);
        this.collapsedStripEl.style.display = "none";

        // Resize handles
        if (this.options.resizable)
        {
            this.buildResizeHandles();
        }

        this.applyModeClasses();
    }

    /**
     * Builds the root container element with ARIA attributes.
     */
    private buildRoot(): HTMLElement
    {
        const root = createElement("div", ["sidebar-container"]);

        setAttr(root, "id", this.instanceId);
        setAttr(root, "role", "complementary");
        setAttr(root, "aria-label", `${this.options.title} sidebar`);

        if (this.options.cssClass)
        {
            root.classList.add(...this.options.cssClass.split(" "));
        }

        this.applyStyleOverrides(root);

        return root;
    }

    /**
     * Applies optional colour and opacity overrides from options.
     */
    private applyStyleOverrides(root: HTMLElement): void
    {
        if (this.options.backgroundColor)
        {
            root.style.backgroundColor = this.options.backgroundColor;
        }

        if (this.options.opacity !== undefined)
        {
            root.style.opacity = String(this.options.opacity);
        }

        if (this.options.borderColor)
        {
            root.style.borderColor = this.options.borderColor;
        }

        if (this.options.borderWidth)
        {
            root.style.borderWidth = this.options.borderWidth;
        }
    }

    /**
     * Builds the title bar with icon, text, and action buttons.
     */
    private buildTitleBar(): HTMLElement
    {
        const bar = createElement("div", ["sidebar-titlebar"]);
        setAttr(bar, "role", "heading");
        setAttr(bar, "aria-level", "2");

        // Icon
        if (this.options.icon)
        {
            this.titleIconEl = createElement(
                "i", ["bi", this.options.icon, "sidebar-titlebar-icon"]
            );
            bar.appendChild(this.titleIconEl);
        }

        // Text
        this.titleTextEl = createElement(
            "span", ["sidebar-titlebar-text"], this.options.title
        );
        bar.appendChild(this.titleTextEl);

        // Action buttons container
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
        const actions = createElement("div", ["sidebar-titlebar-actions"]);

        // Collapse button
        if (this.options.collapsible)
        {
            this.collapseBtn = createElement("button", ["sidebar-collapse-btn"]);
            setAttr(this.collapseBtn, "aria-expanded", "true");
            setAttr(this.collapseBtn, "aria-label", "Collapse sidebar");
            setAttr(this.collapseBtn, "title", "Collapse");

            const collapseIcon = createElement(
                "i", ["bi", "bi-chevron-bar-left"]
            );
            this.collapseBtn.appendChild(collapseIcon);

            // <- Handles: collapse click
            this.collapseBtn.addEventListener("click", (e) =>
            {
                e.stopPropagation();
                this.toggleCollapse();
            });

            actions.appendChild(this.collapseBtn);
        }

        // Float/dock toggle button
        this.floatBtn = createElement("button", ["sidebar-float-btn"]);
        setAttr(this.floatBtn, "aria-label", "Float sidebar");
        setAttr(this.floatBtn, "title", "Float");

        const floatIcon = createElement("i", ["bi", "bi-box-arrow-up-right"]);
        this.floatBtn.appendChild(floatIcon);

        // <- Handles: float/dock toggle click
        this.floatBtn.addEventListener("click", (e) =>
        {
            e.stopPropagation();
            this.handleFloatToggle();
        });

        actions.appendChild(this.floatBtn);

        // Close button
        const closeBtn = createElement("button", ["sidebar-close-btn"]);
        setAttr(closeBtn, "aria-label", "Close sidebar");
        setAttr(closeBtn, "title", "Close");

        const closeIcon = createElement("i", ["bi", "bi-x-lg"]);
        closeBtn.appendChild(closeIcon);

        // <- Handles: close click
        closeBtn.addEventListener("click", (e) =>
        {
            e.stopPropagation();
            this.destroy();
        });

        actions.appendChild(closeBtn);

        return actions;
    }

    /**
     * Builds the collapsed strip element with icon and rotated title.
     */
    private buildCollapsedStrip(): HTMLElement
    {
        const strip = createElement("div", ["sidebar-collapsed-strip"]);
        setAttr(strip, "tabindex", "0");
        setAttr(strip, "role", "button");
        setAttr(strip, "aria-label", `Expand ${this.options.title} sidebar`);

        // Icon in collapsed strip
        if (this.options.icon)
        {
            const icon = createElement(
                "i", ["bi", this.options.icon, "sidebar-collapsed-icon"]
            );
            strip.appendChild(icon);
        }

        // Rotated title text
        const title = createElement(
            "span", ["sidebar-collapsed-title"], this.options.title
        );
        strip.appendChild(title);

        // <- Handles: click and keyboard on collapsed strip to expand
        strip.addEventListener("click", () => this.expand());

        strip.addEventListener("keydown", (e) =>
        {
            if (this.matchesKeyCombo(e, "expand")
                || this.matchesKeyCombo(e, "expandSpace"))
            {
                e.preventDefault();
                this.expand();
            }
        });

        return strip;
    }

    /**
     * Builds resize handle elements based on the current mode.
     */
    private buildResizeHandles(): void
    {
        if (!this.rootEl)
        {
            return;
        }

        // Horizontal resize handle (always present)
        this.resizeHandleH = createElement(
            "div", ["sidebar-resize-handle", "sidebar-resize-handle-h"]
        );
        setAttr(this.resizeHandleH, "role", "separator");
        setAttr(this.resizeHandleH, "aria-orientation", "vertical");
        setAttr(this.resizeHandleH, "tabindex", "0");
        this.updateResizeHandleAria();
        this.rootEl.appendChild(this.resizeHandleH);
        this.attachResizeHandler(this.resizeHandleH, "horizontal");

        // Vertical resize handle (floating only, shown dynamically)
        this.resizeHandleV = createElement(
            "div", ["sidebar-resize-handle", "sidebar-resize-handle-v"]
        );
        this.resizeHandleV.style.display = "none";
        this.rootEl.appendChild(this.resizeHandleV);
        this.attachResizeHandler(this.resizeHandleV, "vertical");

        // Corner resize handle (floating only, shown dynamically)
        this.resizeHandleCorner = createElement(
            "div", [
                "sidebar-resize-handle",
                "sidebar-resize-handle-corner",
                "sidebar-resize-handle-corner-right"
            ]
        );
        this.resizeHandleCorner.style.display = "none";
        this.rootEl.appendChild(this.resizeHandleCorner);
        this.attachResizeHandler(this.resizeHandleCorner, "corner");
    }

    // ========================================================================
    // PRIVATE — MODE AND POSITION
    // ========================================================================

    /**
     * Applies CSS classes for the current mode (docked/floating/collapsed).
     */
    private applyModeClasses(): void
    {
        if (!this.rootEl)
        {
            return;
        }

        // Remove all mode classes
        this.rootEl.classList.remove(
            "sidebar-docked", "sidebar-floating", "sidebar-collapsed",
            "sidebar-left", "sidebar-right", "sidebar-contained"
        );

        // Add contained class if in contained mode
        if (this.contained)
        {
            this.rootEl.classList.add("sidebar-contained");
        }

        if (this.collapsed)
        {
            this.rootEl.classList.add("sidebar-docked", "sidebar-collapsed");
            this.rootEl.classList.add(`sidebar-${this.dockPosition}`);
        }
        else if (this.currentMode === "docked")
        {
            this.rootEl.classList.add("sidebar-docked");
            this.rootEl.classList.add(`sidebar-${this.dockPosition}`);
        }
        else
        {
            this.rootEl.classList.add("sidebar-floating");
        }

        // Toggle floating resize handles
        this.toggleFloatingHandles();

        // Update float button icon and label
        this.updateFloatButton();
    }

    /**
     * Applies inline styles for position, width, and height.
     */
    private applyPositionStyles(): void
    {
        if (!this.rootEl)
        {
            return;
        }

        // Contained mode: parent controls position via CSS Grid
        if (this.contained)
        {
            const w = this.collapsed
                ? this.options.collapsedWidth
                : this.currentWidth;
            this.rootEl.style.width = `${w}px`;
            this.rootEl.style.height = "100%";
            this.rootEl.style.top = "";
            this.rootEl.style.bottom = "";
            this.rootEl.style.left = "";
            this.rootEl.style.right = "";
            return;
        }

        if (this.collapsed)
        {
            this.rootEl.style.width = `${this.options.collapsedWidth}px`;
            this.rootEl.style.height = "";
            this.rootEl.style.top = "";
            this.rootEl.style.left = "";
            this.rootEl.style.right = "";
            return;
        }

        if (this.currentMode === "docked")
        {
            this.rootEl.style.width = `${this.currentWidth}px`;
            this.rootEl.style.height = "";
            this.rootEl.style.top = "";
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
            this.rootEl.style.right = "";

            // Apply z-index
            const zIdx = this.options.zIndex || Z_INDEX_FLOATING;
            this.rootEl.style.zIndex = String(zIdx);
        }
    }

    /**
     * Shows or hides vertical and corner resize handles based on mode.
     */
    private toggleFloatingHandles(): void
    {
        const isFloating = (this.currentMode === "floating") && !this.collapsed;

        if (this.resizeHandleV)
        {
            this.resizeHandleV.style.display = isFloating ? "" : "none";
        }

        if (this.resizeHandleCorner)
        {
            this.resizeHandleCorner.style.display = isFloating ? "" : "none";
        }

        if (this.resizeHandleH)
        {
            this.resizeHandleH.style.display = this.collapsed ? "none" : "";
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
            setAttr(this.floatBtn, "aria-label", "Dock sidebar");
            setAttr(this.floatBtn, "title", "Dock");

            if (icon)
            {
                icon.classList.remove("bi-box-arrow-up-right");
                icon.classList.add("bi-layout-sidebar-inset");
            }
        }
        else
        {
            setAttr(this.floatBtn, "aria-label", "Float sidebar");
            setAttr(this.floatBtn, "title", "Float");

            if (icon)
            {
                icon.classList.remove("bi-layout-sidebar-inset");
                icon.classList.add("bi-box-arrow-up-right");
            }
        }
    }

    /**
     * Applies collapsed visual state.
     */
    private applyCollapsedState(): void
    {
        if (!this.rootEl)
        {
            return;
        }

        this.applyModeClasses();
        this.applyPositionStyles();

        // Show collapsed strip, hide expanded content
        if (this.collapsedStripEl)
        {
            this.collapsedStripEl.style.display = "";
        }

        if (this.titleBarEl)
        {
            this.titleBarEl.style.display = "none";
        }

        if (this.contentEl)
        {
            this.contentEl.style.display = "none";
        }

        if (this.collapseBtn)
        {
            setAttr(this.collapseBtn, "aria-expanded", "false");
        }
    }

    /**
     * Applies expanded visual state.
     */
    private applyExpandedState(): void
    {
        if (!this.rootEl)
        {
            return;
        }

        this.applyModeClasses();

        // Hide collapsed strip, show expanded content
        if (this.collapsedStripEl)
        {
            this.collapsedStripEl.style.display = "none";
        }

        if (this.titleBarEl)
        {
            this.titleBarEl.style.display = "";
        }

        if (this.contentEl)
        {
            this.contentEl.style.display = "";
        }

        this.applyPositionStyles();

        if (this.collapseBtn)
        {
            setAttr(this.collapseBtn, "aria-expanded", "true");
        }
    }

    // ========================================================================
    // PRIVATE — FLOATING DRAG
    // ========================================================================

    /**
     * Attaches pointer event handlers to the title bar for floating drag.
     */
    private attachTitleBarDrag(bar: HTMLElement): void
    {
        bar.addEventListener("pointerdown", (e) =>
        {
            this.handleDragStart(e, bar);
        });
    }

    /**
     * Begins a title bar drag operation using pointer capture.
     */
    private handleDragStart(e: PointerEvent, bar: HTMLElement): void
    {
        // No drag-to-dock in contained mode
        if (this.contained)
        {
            return;
        }

        // Only drag in floating mode, and only with primary button
        if (this.currentMode !== "floating" || e.button !== 0)
        {
            return;
        }

        // Do not drag when clicking action buttons
        const target = e.target as HTMLElement;

        if (target.closest(".sidebar-titlebar-actions"))
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

        this.boundDragMove = (ev: PointerEvent) => this.handleDragMove(ev);
        this.boundDragEnd = (ev: PointerEvent) =>
        {
            this.handleDragEnd(ev, bar);
        };

        bar.addEventListener("pointermove", this.boundDragMove);
        bar.addEventListener("pointerup", this.boundDragEnd);

        // Show dock zone indicators
        SidebarManager.getInstance().showDropZones();
    }

    /**
     * Handles pointer movement during a drag operation.
     */
    private handleDragMove(e: PointerEvent): void
    {
        if (!this.isDragging)
        {
            return;
        }

        const dx = e.clientX - this.dragStartX;
        const dy = e.clientY - this.dragStartY;

        this.floatX = this.dragOrigX + dx;
        this.floatY = this.dragOrigY + dy;

        // Constrain to viewport
        this.floatX = Math.max(0, this.floatX);
        this.floatY = Math.max(0, this.floatY);

        this.applyPositionStyles();

        // Check dock zone proximity
        SidebarManager.getInstance().updateDropZones(e.clientX);
    }

    /**
     * Ends a drag operation and checks for dock zone snap.
     */
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

        // Check if we should dock
        const dockTarget = SidebarManager.getInstance().getDockTarget(
            e.clientX
        );

        SidebarManager.getInstance().hideDropZones();

        if (dockTarget)
        {
            this.dock(dockTarget);
        }
    }

    // ========================================================================
    // PRIVATE — RESIZE HANDLING
    // ========================================================================

    /**
     * Attaches pointer and keyboard handlers to a resize handle element.
     *
     * @param handle - The resize handle element
     * @param direction - "horizontal", "vertical", or "corner"
     */
    private attachResizeHandler(
        handle: HTMLElement, direction: string
    ): void
    {
        // Pointer drag for resize
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
                    ev, direction, startX, startY, startWidth, startHeight
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

        // Keyboard resize for accessibility
        handle.addEventListener("keydown", (e) =>
        {
            this.handleResizeKeyboard(e, direction);
        });
    }

    /**
     * Processes resize movement based on direction.
     */
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

        if ((direction === "horizontal") || (direction === "corner"))
        {
            this.applyResizeWidth(dx, startWidth);
        }

        if ((direction === "vertical") || (direction === "corner"))
        {
            const newHeight = clamp(
                startHeight + dy,
                this.options.minHeight,
                this.options.maxHeight
            );
            this.currentHeight = newHeight;
        }

        this.applyPositionStyles();
        this.updateResizeHandleAria();
    }

    /**
     * Calculates and applies new width during horizontal resize.
     */
    private applyResizeWidth(dx: number, startWidth: number): void
    {
        let newWidth: number;

        // Direction depends on dock position
        if (this.currentMode === "docked" && this.dockPosition === "right")
        {
            newWidth = startWidth - dx;
        }
        else
        {
            newWidth = startWidth + dx;
        }

        this.currentWidth = clamp(
            newWidth, this.options.minWidth, this.options.maxWidth
        );
    }

    /**
     * Fires callbacks and updates CSS properties after resize completes.
     */
    private handleResizeEnd(): void
    {
        this.updateCssCustomProperties();

        if (this.options.onResize)
        {
            this.options.onResize(
                this.currentWidth, this.currentHeight, this
            );
        }

        // Fire external listeners (DockLayout integration)
        for (const fn of this.resizeListeners)
        {
            fn(this.currentWidth, this.currentHeight, this);
        }
    }

    /**
     * Handles keyboard arrow keys for accessible resize.
     */
    private handleResizeKeyboard(e: KeyboardEvent, direction: string): void
    {
        let handled = false;

        if ((direction === "horizontal") || (direction === "corner"))
        {
            handled = this.handleResizeKeyH(e);
        }

        if ((direction === "vertical") || (direction === "corner"))
        {
            handled = this.handleResizeKeyV(e) || handled;
        }

        if (handled)
        {
            e.preventDefault();
            this.applyPositionStyles();
            this.updateResizeHandleAria();
            this.handleResizeEnd();
        }
    }

    /**
     * Handles horizontal arrow keys for keyboard resize.
     */
    private handleResizeKeyH(e: KeyboardEvent): boolean
    {
        if (this.matchesKeyCombo(e, "resizeGrowH"))
        {
            this.applyResizeWidth(KEYBOARD_RESIZE_STEP, this.currentWidth);
            return true;
        }
        if (this.matchesKeyCombo(e, "resizeShrinkH"))
        {
            this.applyResizeWidth(
                -KEYBOARD_RESIZE_STEP, this.currentWidth
            );
            return true;
        }
        return false;
    }

    /**
     * Handles vertical arrow keys for keyboard resize.
     */
    private handleResizeKeyV(e: KeyboardEvent): boolean
    {
        if (this.matchesKeyCombo(e, "resizeGrowV"))
        {
            this.currentHeight = clamp(
                this.currentHeight + KEYBOARD_RESIZE_STEP,
                this.options.minHeight,
                this.options.maxHeight
            );
            return true;
        }
        if (this.matchesKeyCombo(e, "resizeShrinkV"))
        {
            this.currentHeight = clamp(
                this.currentHeight - KEYBOARD_RESIZE_STEP,
                this.options.minHeight,
                this.options.maxHeight
            );
            return true;
        }
        return false;
    }

    /**
     * Updates ARIA value attributes on the horizontal resize handle.
     */
    private updateResizeHandleAria(): void
    {
        if (!this.resizeHandleH)
        {
            return;
        }

        setAttr(
            this.resizeHandleH, "aria-valuenow", String(this.currentWidth)
        );
        setAttr(
            this.resizeHandleH, "aria-valuemin", String(this.options.minWidth)
        );
        setAttr(
            this.resizeHandleH, "aria-valuemax", String(this.options.maxWidth)
        );
    }

    // ========================================================================
    // PRIVATE — CSS CUSTOM PROPERTIES
    // ========================================================================

    /**
     * Updates --sidebar-left-width and --sidebar-right-width on <html>
     * based on all visible, docked sidebars.
     */
    private updateCssCustomProperties(): void
    {
        const manager = SidebarManager.getInstance();
        manager.updateCssCustomProperties();
    }

    // ========================================================================
    // PRIVATE — CALLBACKS
    // ========================================================================

    /**
     * Fires the onModeChange callback if configured.
     */
    private fireOnModeChange(mode: SidebarMode): void
    {
        if (this.options.onModeChange)
        {
            this.options.onModeChange(mode, this);
        }
    }

    /**
     * Handles the float/dock toggle button click.
     */
    private handleFloatToggle(): void
    {
        if (this.currentMode === "floating")
        {
            this.dock(this.dockPosition);
        }
        else
        {
            // Calculate a reasonable float position
            const x = this.dockPosition === "left"
                ? this.currentWidth + 20
                : window.innerWidth - this.currentWidth - 320;
            const y = 60;

            this.float(Math.max(20, x), y);
        }
    }
}

// ============================================================================
// PUBLIC API — SidebarManager
// ============================================================================

/**
 * SidebarManager is a singleton orchestrator that manages dock zones,
 * tab grouping, drop-zone indicators, and CSS custom properties for
 * all active sidebars. Created lazily on first sidebar registration.
 */
export class SidebarManager
{
    private static instance: SidebarManager | null = null;

    private sidebars: Map<string, Sidebar> = new Map();

    // Tab bar DOM elements per dock position
    private tabBars: Map<string, HTMLElement> = new Map();

    // Active tab per dock position
    private activeTabs: Map<string, string> = new Map();

    // Drop zone elements
    private dropZoneLeft: HTMLElement | null = null;
    private dropZoneRight: HTMLElement | null = null;

    private constructor()
    {
        logInfo("SidebarManager initialised.");
    }

    /**
     * Returns the singleton SidebarManager instance.
     */
    public static getInstance(): SidebarManager
    {
        if (!SidebarManager.instance)
        {
            SidebarManager.instance = new SidebarManager();

            // Store on window for cross-component access
            if (typeof window !== "undefined")
            {
                (window as any).__sidebarManager = SidebarManager.instance;
            }
        }

        return SidebarManager.instance;
    }

    /**
     * Registers a sidebar for tab grouping and dock management.
     *
     * @param sidebar - The sidebar to register
     */
    public register(sidebar: Sidebar): void
    {
        if (this.sidebars.has(sidebar.getId()))
        {
            return;
        }

        this.sidebars.set(sidebar.getId(), sidebar);

        if (sidebar.getMode() === "docked" || sidebar.getMode() === "collapsed")
        {
            this.rebuildTabs(sidebar.getDockPosition());
        }

        logDebug("Registered sidebar:", sidebar.getId());
    }

    /**
     * Unregisters a sidebar from management.
     *
     * @param sidebar - The sidebar to unregister
     */
    public unregister(sidebar: Sidebar): void
    {
        const id = sidebar.getId();

        if (!this.sidebars.has(id))
        {
            return;
        }

        const position = sidebar.getDockPosition();
        this.sidebars.delete(id);
        this.rebuildTabs(position);
        this.updateCssCustomProperties();

        logDebug("Unregistered sidebar:", id);
    }

    /**
     * Returns all registered sidebars, optionally filtered by dock position.
     *
     * @param position - Optional dock position filter
     * @returns Array of matching sidebars
     */
    public getSidebars(position?: SidebarDockPosition): Sidebar[]
    {
        const all = Array.from(this.sidebars.values());

        if (!position)
        {
            return all;
        }

        return all.filter((s) =>
        {
            return s.getDockPosition() === position &&
                   (s.getMode() === "docked" || s.getMode() === "collapsed");
        });
    }

    /**
     * Returns the active sidebar at a dock position.
     *
     * @param position - Dock position to query
     * @returns The active sidebar or undefined
     */
    public getActiveTab(position: SidebarDockPosition): Sidebar | undefined
    {
        const activeId = this.activeTabs.get(position);

        if (!activeId)
        {
            return undefined;
        }

        return this.sidebars.get(activeId);
    }

    /**
     * Activates a specific sidebar tab and hides others at the same position.
     *
     * @param sidebar - The sidebar to activate
     */
    public setActiveTab(sidebar: Sidebar): void
    {
        const position = sidebar.getDockPosition();
        const docked = this.getSidebars(position);

        // Hide all panels at this position
        for (const s of docked)
        {
            const root = s.getRootElement();

            if (!root)
            {
                continue;
            }

            if (s.getId() === sidebar.getId())
            {
                root.style.display = "";
                this.activeTabs.set(position, s.getId());
            }
            else
            {
                root.style.display = "none";
            }
        }

        // Update tab bar active states
        this.updateTabBarActive(position);
    }

    /**
     * Rebuilds the tab bar for a dock position based on registered sidebars.
     */
    public rebuildTabs(position: SidebarDockPosition): void
    {
        const docked = this.getSidebars(position);

        // Remove existing tab bar for this position
        const existingBar = this.tabBars.get(position);

        if (existingBar)
        {
            existingBar.remove();
            this.tabBars.delete(position);
        }

        // Remove tab bars from all sidebar roots at this position
        for (const s of docked)
        {
            const root = s.getRootElement();
            const oldBar = root?.querySelector(".sidebar-tab-bar");

            if (oldBar)
            {
                oldBar.remove();
            }
        }

        // Only create tabs when more than one sidebar is at this position
        if (docked.length <= 1)
        {
            // Single sidebar — ensure it is visible
            if (docked.length === 1)
            {
                const root = docked[0].getRootElement();

                if (root)
                {
                    root.style.display = "";
                }

                this.activeTabs.set(position, docked[0].getId());
            }

            return;
        }

        // Ensure an active tab exists for this position
        if (!this.activeTabs.has(position))
        {
            this.activeTabs.set(position, docked[0].getId());
        }

        const activeId = this.activeTabs.get(position)!;

        // Validate activeId still exists in docked list
        const activeStillExists = docked.some((s) => s.getId() === activeId);

        if (!activeStillExists)
        {
            this.activeTabs.set(position, docked[0].getId());
        }

        const currentActiveId = this.activeTabs.get(position)!;

        // Build tab bar and insert into each sidebar's root
        for (const s of docked)
        {
            const root = s.getRootElement();

            if (!root)
            {
                continue;
            }

            const tabBar = this.buildTabBar(docked, currentActiveId);

            // Insert at top of sidebar
            root.insertBefore(tabBar, root.firstChild);

            // Show/hide based on active state
            if (s.getId() === currentActiveId)
            {
                root.style.display = "";
            }
            else
            {
                root.style.display = "none";
            }
        }
    }

    /**
     * Builds a tab bar element with tabs for each sidebar.
     */
    private buildTabBar(
        sidebars: Sidebar[], activeId: string
    ): HTMLElement
    {
        const bar = createElement("div", ["sidebar-tab-bar"]);
        setAttr(bar, "role", "tablist");

        for (const s of sidebars)
        {
            const tab = this.buildTab(s, s.getId() === activeId);
            bar.appendChild(tab);
        }

        return bar;
    }

    /**
     * Builds a single tab button element.
     */
    private buildTab(sidebar: Sidebar, isActive: boolean): HTMLElement
    {
        const classes = ["sidebar-tab"];

        if (isActive)
        {
            classes.push("sidebar-tab-active");
        }

        const tab = createElement("button", classes, sidebar.getTitle());
        setAttr(tab, "role", "tab");
        setAttr(tab, "aria-selected", isActive ? "true" : "false");
        setAttr(tab, "data-sidebar-id", sidebar.getId());

        // <- Handles: tab click to switch active sidebar
        tab.addEventListener("click", () =>
        {
            this.setActiveTab(sidebar);
        });

        return tab;
    }

    /**
     * Updates active state classes and aria-selected on tab bar buttons.
     */
    private updateTabBarActive(position: SidebarDockPosition): void
    {
        const activeId = this.activeTabs.get(position);
        const docked = this.getSidebars(position);

        for (const s of docked)
        {
            const root = s.getRootElement();

            if (!root)
            {
                continue;
            }

            const tabs = root.querySelectorAll(".sidebar-tab");

            tabs.forEach((tab) =>
            {
                const tabId = tab.getAttribute("data-sidebar-id");
                const isActive = (tabId === activeId);

                if (isActive)
                {
                    tab.classList.add("sidebar-tab-active");
                    tab.setAttribute("aria-selected", "true");
                }
                else
                {
                    tab.classList.remove("sidebar-tab-active");
                    tab.setAttribute("aria-selected", "false");
                }
            });
        }
    }

    // ========================================================================
    // DROP ZONES — DRAG-TO-DOCK
    // ========================================================================

    /**
     * Creates and shows drop zone overlay elements during drag.
     */
    public showDropZones(): void
    {
        if (!this.dropZoneLeft)
        {
            this.dropZoneLeft = createElement(
                "div", ["sidebar-dock-zone", "sidebar-dock-zone-left"]
            );
            document.body.appendChild(this.dropZoneLeft);
        }

        if (!this.dropZoneRight)
        {
            this.dropZoneRight = createElement(
                "div", ["sidebar-dock-zone", "sidebar-dock-zone-right"]
            );
            document.body.appendChild(this.dropZoneRight);
        }
    }

    /**
     * Updates drop zone active state based on pointer position.
     *
     * @param clientX - Current pointer X coordinate
     */
    public updateDropZones(clientX: number): void
    {
        if (this.dropZoneLeft)
        {
            if (clientX <= DOCK_ZONE_THRESHOLD)
            {
                this.dropZoneLeft.classList.add("sidebar-dock-zone-active");
            }
            else
            {
                this.dropZoneLeft.classList.remove("sidebar-dock-zone-active");
            }
        }

        if (this.dropZoneRight)
        {
            if (clientX >= (window.innerWidth - DOCK_ZONE_THRESHOLD))
            {
                this.dropZoneRight.classList.add("sidebar-dock-zone-active");
            }
            else
            {
                this.dropZoneRight.classList.remove("sidebar-dock-zone-active");
            }
        }
    }

    /**
     * Hides and removes drop zone overlay elements.
     */
    public hideDropZones(): void
    {
        if (this.dropZoneLeft)
        {
            this.dropZoneLeft.remove();
            this.dropZoneLeft = null;
        }

        if (this.dropZoneRight)
        {
            this.dropZoneRight.remove();
            this.dropZoneRight = null;
        }
    }

    /**
     * Returns the dock target position if the pointer is within a drop zone.
     *
     * @param clientX - Current pointer X coordinate
     * @returns Dock position or null
     */
    public getDockTarget(clientX: number): SidebarDockPosition | null
    {
        if (clientX <= DOCK_ZONE_THRESHOLD)
        {
            return "left";
        }

        if (clientX >= (window.innerWidth - DOCK_ZONE_THRESHOLD))
        {
            return "right";
        }

        return null;
    }

    // ========================================================================
    // CSS CUSTOM PROPERTIES
    // ========================================================================

    /**
     * Updates --sidebar-left-width and --sidebar-right-width on <html>
     * based on all visible, docked (non-floating) sidebars.
     */
    public updateCssCustomProperties(): void
    {
        const leftWidth = this.getDockedWidth("left");
        const rightWidth = this.getDockedWidth("right");

        const root = document.documentElement;

        if (leftWidth > 0)
        {
            root.style.setProperty(
                "--sidebar-left-width", `${leftWidth}px`
            );
        }
        else
        {
            root.style.removeProperty("--sidebar-left-width");
        }

        if (rightWidth > 0)
        {
            root.style.setProperty(
                "--sidebar-right-width", `${rightWidth}px`
            );
        }
        else
        {
            root.style.removeProperty("--sidebar-right-width");
        }
    }

    /**
     * Calculates the total width of visible docked sidebars at a position.
     * When multiple sidebars share a dock, only the active tab's width counts.
     */
    private getDockedWidth(position: SidebarDockPosition): number
    {
        const docked = this.getSidebars(position);

        if (docked.length === 0)
        {
            return 0;
        }

        // When tabs exist, only the active sidebar's width matters
        const activeId = this.activeTabs.get(position);
        const activeSidebar = activeId ? this.sidebars.get(activeId) : null;

        if (activeSidebar && activeSidebar.isVisible())
        {
            if (activeSidebar.isCollapsed())
            {
                return 40; // collapsed width
            }

            return activeSidebar.getWidth();
        }

        // Fallback: first visible sidebar's width
        for (const s of docked)
        {
            if (s.isVisible())
            {
                if (s.isCollapsed())
                {
                    return 40;
                }

                return s.getWidth();
            }
        }

        return 0;
    }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Creates and shows a sidebar in a single call.
 *
 * @param options - Sidebar configuration
 * @returns The created Sidebar instance
 */
export function createSidebar(options: SidebarOptions): Sidebar
{
    const sidebar = new Sidebar(options);
    sidebar.show();
    return sidebar;
}

/**
 * Creates a docked sidebar. Defaults mode to "docked".
 *
 * @param options - Sidebar configuration (mode defaults to "docked")
 * @returns The created Sidebar instance
 */
export function createDockedSidebar(options: SidebarOptions): Sidebar
{
    return createSidebar({ mode: "docked", ...options });
}

/**
 * Creates a floating sidebar. Defaults mode to "floating".
 *
 * @param options - Sidebar configuration (mode defaults to "floating")
 * @returns The created Sidebar instance
 */
export function createFloatingSidebar(options: SidebarOptions): Sidebar
{
    return createSidebar({ mode: "floating", ...options });
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

if (typeof window !== "undefined")
{
    (window as any)["Sidebar"] = Sidebar;
    (window as any)["SidebarManager"] = SidebarManager;
    (window as any)["createSidebar"] = createSidebar;
    (window as any)["createDockedSidebar"] = createDockedSidebar;
    (window as any)["createFloatingSidebar"] = createFloatingSidebar;
}
