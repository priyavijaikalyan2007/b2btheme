/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: DockLayout
 * 📜 PURPOSE: CSS Grid-based layout coordinator that arranges Toolbar,
 *    Sidebar, TabbedPanel, StatusBar, and BannerBar into a 5-zone
 *    application shell. Inspired by Java Swing's BorderLayout.
 * 🔗 RELATES: [[EnterpriseTheme]], [[Sidebar]], [[Toolbar]], [[TabbedPanel]],
 *    [[StatusBar]], [[BannerBar]]
 * ⚡ FLOW: [Consumer App] -> [createDockLayout()] -> [CSS Grid shell]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// 1. TYPES AND INTERFACES
// ============================================================================

/**
 * Current dimensions and collapse state of all layout slots.
 */
export interface LayoutState
{
    toolbar: { height: number } | null;
    leftSidebar: { width: number; collapsed: boolean } | null;
    rightSidebar: { width: number; collapsed: boolean } | null;
    bottomPanel: { height: number; collapsed: boolean } | null;
    statusBar: { height: number } | null;
    content: { width: number; height: number };
}

/**
 * Configuration options for the DockLayout component.
 */
export interface DockLayoutOptions
{
    /** Custom element ID. Auto-generated if omitted. */
    id?: string;

    /** Mount target element or CSS selector. Default: document.body. */
    container?: HTMLElement | string;

    /** Top row — spans full width. */
    toolbar?: any;

    /** Left column — between toolbar and bottom panel. */
    leftSidebar?: any;

    /** Right column — between toolbar and bottom panel. */
    rightSidebar?: any;

    /** Bottom row — spans full width, above status bar. */
    bottomPanel?: any;

    /** Very bottom row — spans full width. */
    statusBar?: any;

    /** Center cell element or CSS selector. */
    content?: HTMLElement | string;

    /** Additional CSS classes on root element. */
    cssClass?: string;

    /** Height CSS value. Default: "100vh". */
    height?: string;

    /** Width CSS value. Default: "100vw". */
    width?: string;

    /** Fired on any resize, collapse, or slot change event. */
    onLayoutChange?: (layout: LayoutState) => void;
}

// ============================================================================
// 2. CONSTANTS
// ============================================================================

const LOG_PREFIX = "[DockLayout]";
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

let instanceCounter = 0;

/** Default collapsed width for sidebars. */
const DEFAULT_COLLAPSED_WIDTH = 40;

/** Default collapsed height for bottom panel. */
const DEFAULT_COLLAPSED_HEIGHT = 32;

// ============================================================================
// 3. DOM HELPERS
// ============================================================================

/**
 * Creates an element with the given tag and CSS classes.
 */
function createElement(
    tag: string, classes: string[]
): HTMLElement
{
    const el = document.createElement(tag);

    for (const cls of classes)
    {
        if (cls) { el.classList.add(cls); }
    }

    return el;
}

/**
 * Sets an attribute on an element.
 */
function setAttr(
    el: HTMLElement, name: string, value: string
): void
{
    el.setAttribute(name, value);
}

// ============================================================================
// 4. DOCKLAYOUT CLASS
// ============================================================================

export class DockLayout
{
    private readonly instanceId: string;
    private readonly options: DockLayoutOptions;

    // State
    private visible = false;

    // Slot references (typed as any for cross-component compatibility)
    private toolbar: any | null = null;
    private leftSidebar: any | null = null;
    private rightSidebar: any | null = null;
    private bottomPanel: any | null = null;
    private statusBarComp: any | null = null;
    private contentElement: HTMLElement | null = null;

    // DOM references
    private rootEl: HTMLElement | null = null;
    private toolbarCell: HTMLElement | null = null;
    private leftCell: HTMLElement | null = null;
    private centerCell: HTMLElement | null = null;
    private rightCell: HTMLElement | null = null;
    private bottomCell: HTMLElement | null = null;
    private statusCell: HTMLElement | null = null;

    // Bound listener references for cleanup
    private leftResizeFn: ((w: number, h: number, s: any) => void) | null = null;
    private leftCollapseFn: ((c: boolean, s: any) => void) | null = null;
    private rightResizeFn: ((w: number, h: number, s: any) => void) | null = null;
    private rightCollapseFn: ((c: boolean, s: any) => void) | null = null;
    private bottomResizeFn: ((w: number, h: number, p: any) => void) | null = null;
    private bottomCollapseFn: ((c: boolean, p: any) => void) | null = null;

    constructor(options: DockLayoutOptions)
    {
        instanceCounter += 1;
        this.instanceId = options.id || `dock-layout-${instanceCounter}`;
        this.options = { ...options };

        this.buildDOM();
        this.mountInitialSlots();

        logInfo("Initialised:", this.instanceId);
    }

    // ========================================================================
    // 5. PUBLIC — LIFECYCLE
    // ========================================================================

    /** Append to container, display layout. */
    public show(): void
    {
        if (this.visible)
        {
            logWarn("Already visible:", this.instanceId);
            return;
        }

        if (!this.rootEl)
        {
            return;
        }

        const target = this.resolveContainer();
        target.appendChild(this.rootEl);
        this.visible = true;

        this.updateGridTemplate();
        this.fireOnLayoutChange();

        logDebug("Shown:", this.instanceId);
    }

    /** Remove from DOM (preserves state). */
    public hide(): void
    {
        if (!this.visible)
        {
            return;
        }

        this.rootEl?.remove();
        this.visible = false;

        logDebug("Hidden:", this.instanceId);
    }

    /** Full cleanup, destroy all child components. */
    public destroy(): void
    {
        this.unhookSidebar("left");
        this.unhookSidebar("right");
        this.unhookBottomPanel();

        this.destroySlotComponent(this.toolbar);
        this.destroySlotComponent(this.leftSidebar);
        this.destroySlotComponent(this.rightSidebar);
        this.destroySlotComponent(this.bottomPanel);
        this.destroySlotComponent(this.statusBarComp);

        this.toolbar = null;
        this.leftSidebar = null;
        this.rightSidebar = null;
        this.bottomPanel = null;
        this.statusBarComp = null;
        this.contentElement = null;

        this.rootEl?.remove();
        this.rootEl = null;
        this.visible = false;

        logInfo("Destroyed:", this.instanceId);
    }

    // ========================================================================
    // 6. PUBLIC — SLOT MANAGEMENT
    // ========================================================================

    /** Sets or removes the toolbar in the top row. */
    public setToolbar(toolbar: any | null): void
    {
        this.clearCell(this.toolbarCell);
        this.toolbar = null;

        if (toolbar)
        {
            this.toolbar = toolbar;
            this.mountComponent(toolbar, this.toolbarCell!);
        }

        this.updateGridTemplate();
        this.fireOnLayoutChange();
    }

    /** Sets or removes the left sidebar. */
    public setLeftSidebar(sidebar: any | null): void
    {
        this.unhookSidebar("left");
        this.clearCell(this.leftCell);
        this.leftSidebar = null;

        if (sidebar)
        {
            this.leftSidebar = sidebar;
            this.hookSidebarCallbacks(sidebar, "left");
            this.mountComponent(sidebar, this.leftCell!);
        }

        this.updateGridTemplate();
        this.fireOnLayoutChange();
    }

    /** Sets or removes the right sidebar. */
    public setRightSidebar(sidebar: any | null): void
    {
        this.unhookSidebar("right");
        this.clearCell(this.rightCell);
        this.rightSidebar = null;

        if (sidebar)
        {
            this.rightSidebar = sidebar;
            this.hookSidebarCallbacks(sidebar, "right");
            this.mountComponent(sidebar, this.rightCell!);
        }

        this.updateGridTemplate();
        this.fireOnLayoutChange();
    }

    /** Sets or removes the bottom panel. */
    public setBottomPanel(panel: any | null): void
    {
        this.unhookBottomPanel();
        this.clearCell(this.bottomCell);
        this.bottomPanel = null;

        if (panel)
        {
            this.bottomPanel = panel;
            this.hookBottomPanelCallbacks(panel);
            this.mountComponent(panel, this.bottomCell!);
        }

        this.updateGridTemplate();
        this.fireOnLayoutChange();
    }

    /** Sets or removes the status bar. */
    public setStatusBar(statusBar: any | null): void
    {
        this.clearCell(this.statusCell);
        this.statusBarComp = null;

        if (statusBar)
        {
            this.statusBarComp = statusBar;
            this.mountComponent(statusBar, this.statusCell!);
        }

        this.updateGridTemplate();
        this.fireOnLayoutChange();
    }

    /** Sets or replaces the center content element. */
    public setContent(element: HTMLElement): void
    {
        if (this.centerCell)
        {
            this.clearCell(this.centerCell);
            this.centerCell.appendChild(element);
            this.contentElement = element;
        }

        this.fireOnLayoutChange();
    }

    // ========================================================================
    // 7. PUBLIC — STATE
    // ========================================================================

    /** Returns current dimensions and collapse state of all slots. */
    public getLayoutState(): LayoutState
    {
        const state: LayoutState = {
            toolbar: this.getToolbarState(),
            leftSidebar: this.getSidebarState(this.leftSidebar),
            rightSidebar: this.getSidebarState(this.rightSidebar),
            bottomPanel: this.getBottomPanelState(),
            statusBar: this.getStatusBarState(),
            content: this.getCenterDimensions(),
        };

        return state;
    }

    /** Returns the center grid cell element. */
    public getContentElement(): HTMLElement | null
    {
        return this.centerCell;
    }

    /** Returns the root grid container element. */
    public getRootElement(): HTMLElement | null
    {
        return this.rootEl;
    }

    /** Returns whether the layout is currently visible. */
    public isVisible(): boolean
    {
        return this.visible;
    }

    // ========================================================================
    // 8. PRIVATE — DOM CONSTRUCTION
    // ========================================================================

    /** Builds the CSS Grid container and all 6 cell divs. */
    private buildDOM(): void
    {
        this.rootEl = this.buildRoot();
        this.toolbarCell = createElement("div", ["dock-layout-toolbar"]);
        this.leftCell = createElement("div", ["dock-layout-left"]);
        this.centerCell = createElement("div", ["dock-layout-center"]);
        this.rightCell = createElement("div", ["dock-layout-right"]);
        this.bottomCell = createElement("div", ["dock-layout-bottom"]);
        this.statusCell = createElement("div", ["dock-layout-status"]);

        this.rootEl.appendChild(this.toolbarCell);
        this.rootEl.appendChild(this.leftCell);
        this.rootEl.appendChild(this.centerCell);
        this.rootEl.appendChild(this.rightCell);
        this.rootEl.appendChild(this.bottomCell);
        this.rootEl.appendChild(this.statusCell);
    }

    /** Creates the root grid container element. */
    private buildRoot(): HTMLElement
    {
        const root = createElement("div", ["dock-layout"]);
        setAttr(root, "id", this.instanceId);

        const h = this.options.height || "100vh";
        const w = this.options.width || "100vw";
        root.style.height = h;
        root.style.width = w;

        if (this.options.cssClass)
        {
            for (const cls of this.options.cssClass.split(" "))
            {
                if (cls.trim()) { root.classList.add(cls.trim()); }
            }
        }

        return root;
    }

    // ========================================================================
    // 9. PRIVATE — MOUNTING
    // ========================================================================

    /** Mounts all initial slot components from constructor options. */
    private mountInitialSlots(): void
    {
        if (this.options.toolbar)
        {
            this.setToolbar(this.options.toolbar);
        }

        if (this.options.leftSidebar)
        {
            this.setLeftSidebar(this.options.leftSidebar);
        }

        if (this.options.rightSidebar)
        {
            this.setRightSidebar(this.options.rightSidebar);
        }

        if (this.options.bottomPanel)
        {
            this.setBottomPanel(this.options.bottomPanel);
        }

        if (this.options.statusBar)
        {
            this.setStatusBar(this.options.statusBar);
        }

        if (this.options.content)
        {
            this.mountContentElement();
        }
    }

    /** Resolves and mounts the initial content element. */
    private mountContentElement(): void
    {
        if (!this.centerCell || !this.options.content)
        {
            return;
        }

        let el: HTMLElement | null = null;

        if (typeof this.options.content === "string")
        {
            el = document.querySelector(this.options.content);
        }
        else
        {
            el = this.options.content;
        }

        if (el)
        {
            this.centerCell.appendChild(el);
            this.contentElement = el;
        }
    }

    /**
     * Sets contained mode on a component and shows it inside a grid cell.
     */
    private mountComponent(
        component: any, cell: HTMLElement
    ): void
    {
        // Set contained mode if the component supports it
        if (typeof component.setContained === "function")
        {
            component.setContained(true);
        }

        // If already visible (e.g., factory auto-showed to body),
        // hide first so show(cell) can re-parent into the grid cell.
        if (typeof component.isVisible === "function"
            && component.isVisible()
            && typeof component.hide === "function")
        {
            component.hide();
        }

        // Show the component inside the cell
        if (typeof component.show === "function")
        {
            component.show(cell);
        }
        else if (typeof component.getRootElement === "function")
        {
            const rootEl = component.getRootElement();

            if (rootEl)
            {
                cell.appendChild(rootEl);
            }
        }
    }

    /** Clears all children from a grid cell. */
    private clearCell(cell: HTMLElement | null): void
    {
        if (!cell) { return; }

        while (cell.firstChild)
        {
            cell.removeChild(cell.firstChild);
        }
    }

    /** Calls destroy on a component if it has a destroy method. */
    private destroySlotComponent(comp: any): void
    {
        if (comp && typeof comp.destroy === "function")
        {
            comp.destroy();
        }
    }

    // ========================================================================
    // 10. PRIVATE — GRID TEMPLATE UPDATE
    // ========================================================================

    /** Recalculates and applies grid-template-columns and rows. */
    private updateGridTemplate(): void
    {
        if (!this.rootEl) { return; }

        const leftW = this.getLeftColumnWidth();
        const rightW = this.getRightColumnWidth();
        this.rootEl.style.gridTemplateColumns =
            `${leftW} 1fr ${rightW}`;

        const toolbarH = this.toolbar ? "auto" : "0";
        const bottomH = this.getBottomRowHeight();
        const statusH = this.statusBarComp ? "auto" : "0";
        this.rootEl.style.gridTemplateRows =
            `${toolbarH} 1fr ${bottomH} ${statusH}`;
    }

    /** Returns CSS value for the left sidebar column. */
    private getLeftColumnWidth(): string
    {
        if (!this.leftSidebar) { return "0"; }

        if (typeof this.leftSidebar.isCollapsed === "function"
            && this.leftSidebar.isCollapsed())
        {
            const w = this.leftSidebar.options?.collapsedWidth
                || DEFAULT_COLLAPSED_WIDTH;
            return `${w}px`;
        }

        if (typeof this.leftSidebar.getWidth === "function")
        {
            return `${this.leftSidebar.getWidth()}px`;
        }

        return "auto";
    }

    /** Returns CSS value for the right sidebar column. */
    private getRightColumnWidth(): string
    {
        if (!this.rightSidebar) { return "0"; }

        if (typeof this.rightSidebar.isCollapsed === "function"
            && this.rightSidebar.isCollapsed())
        {
            const w = this.rightSidebar.options?.collapsedWidth
                || DEFAULT_COLLAPSED_WIDTH;
            return `${w}px`;
        }

        if (typeof this.rightSidebar.getWidth === "function")
        {
            return `${this.rightSidebar.getWidth()}px`;
        }

        return "auto";
    }

    /** Returns CSS value for the bottom panel row. */
    private getBottomRowHeight(): string
    {
        if (!this.bottomPanel) { return "0"; }

        if (typeof this.bottomPanel.isCollapsed === "function"
            && this.bottomPanel.isCollapsed())
        {
            const h = this.bottomPanel.options?.collapsedHeight
                || DEFAULT_COLLAPSED_HEIGHT;
            return `${h}px`;
        }

        if (typeof this.bottomPanel.getHeight === "function")
        {
            return `${this.bottomPanel.getHeight()}px`;
        }

        return "auto";
    }

    // ========================================================================
    // 11. PRIVATE — CALLBACK HOOKS
    // ========================================================================

    /**
     * Hooks sidebar resize and collapse listeners for grid updates.
     */
    private hookSidebarCallbacks(
        sidebar: any, side: "left" | "right"
    ): void
    {
        const resizeFn = () =>
        {
            this.updateGridTemplate();
            this.fireOnLayoutChange();
        };

        const collapseFn = () =>
        {
            this.updateGridTemplate();
            this.fireOnLayoutChange();
        };

        if (typeof sidebar.addResizeListener === "function")
        {
            sidebar.addResizeListener(resizeFn);
        }

        if (typeof sidebar.addCollapseListener === "function")
        {
            sidebar.addCollapseListener(collapseFn);
        }

        if (side === "left")
        {
            this.leftResizeFn = resizeFn;
            this.leftCollapseFn = collapseFn;
        }
        else
        {
            this.rightResizeFn = resizeFn;
            this.rightCollapseFn = collapseFn;
        }
    }

    /**
     * Hooks bottom panel resize and collapse listeners for grid updates.
     */
    private hookBottomPanelCallbacks(panel: any): void
    {
        const resizeFn = () =>
        {
            this.updateGridTemplate();
            this.fireOnLayoutChange();
        };

        const collapseFn = () =>
        {
            this.updateGridTemplate();
            this.fireOnLayoutChange();
        };

        if (typeof panel.addResizeListener === "function")
        {
            panel.addResizeListener(resizeFn);
        }

        if (typeof panel.addCollapseListener === "function")
        {
            panel.addCollapseListener(collapseFn);
        }

        this.bottomResizeFn = resizeFn;
        this.bottomCollapseFn = collapseFn;
    }

    /** Unhooks sidebar listeners and clears references. */
    private unhookSidebar(side: "left" | "right"): void
    {
        const sidebar = side === "left"
            ? this.leftSidebar : this.rightSidebar;
        const resizeFn = side === "left"
            ? this.leftResizeFn : this.rightResizeFn;
        const collapseFn = side === "left"
            ? this.leftCollapseFn : this.rightCollapseFn;

        if (sidebar && resizeFn
            && typeof sidebar.removeResizeListener === "function")
        {
            sidebar.removeResizeListener(resizeFn);
        }

        if (sidebar && collapseFn
            && typeof sidebar.removeCollapseListener === "function")
        {
            sidebar.removeCollapseListener(collapseFn);
        }

        if (side === "left")
        {
            this.leftResizeFn = null;
            this.leftCollapseFn = null;
        }
        else
        {
            this.rightResizeFn = null;
            this.rightCollapseFn = null;
        }
    }

    /** Unhooks bottom panel listeners and clears references. */
    private unhookBottomPanel(): void
    {
        const panel = this.bottomPanel;

        if (panel && this.bottomResizeFn
            && typeof panel.removeResizeListener === "function")
        {
            panel.removeResizeListener(this.bottomResizeFn);
        }

        if (panel && this.bottomCollapseFn
            && typeof panel.removeCollapseListener === "function")
        {
            panel.removeCollapseListener(this.bottomCollapseFn);
        }

        this.bottomResizeFn = null;
        this.bottomCollapseFn = null;
    }

    // ========================================================================
    // 12. PRIVATE — STATE HELPERS
    // ========================================================================

    /** Returns toolbar slot state or null. */
    private getToolbarState(): { height: number } | null
    {
        if (!this.toolbar || !this.toolbarCell)
        {
            return null;
        }

        return { height: this.toolbarCell.offsetHeight };
    }

    /** Returns sidebar slot state or null. */
    private getSidebarState(
        sidebar: any
    ): { width: number; collapsed: boolean } | null
    {
        if (!sidebar) { return null; }

        const collapsed = typeof sidebar.isCollapsed === "function"
            ? sidebar.isCollapsed() : false;
        const width = typeof sidebar.getWidth === "function"
            ? sidebar.getWidth() : 0;

        return { width, collapsed };
    }

    /** Returns bottom panel slot state or null. */
    private getBottomPanelState():
        { height: number; collapsed: boolean } | null
    {
        if (!this.bottomPanel) { return null; }

        const collapsed =
            typeof this.bottomPanel.isCollapsed === "function"
                ? this.bottomPanel.isCollapsed() : false;
        const height =
            typeof this.bottomPanel.getHeight === "function"
                ? this.bottomPanel.getHeight() : 0;

        return { height, collapsed };
    }

    /** Returns status bar slot state or null. */
    private getStatusBarState(): { height: number } | null
    {
        if (!this.statusBarComp || !this.statusCell)
        {
            return null;
        }

        return { height: this.statusCell.offsetHeight };
    }

    /** Returns center cell dimensions. */
    private getCenterDimensions(): { width: number; height: number }
    {
        if (!this.centerCell)
        {
            return { width: 0, height: 0 };
        }

        return {
            width: this.centerCell.offsetWidth,
            height: this.centerCell.offsetHeight,
        };
    }

    // ========================================================================
    // 13. PRIVATE — LAYOUT CHANGE
    // ========================================================================

    /** Fires the onLayoutChange callback with current state. */
    private fireOnLayoutChange(): void
    {
        if (!this.options.onLayoutChange || !this.visible)
        {
            return;
        }

        this.options.onLayoutChange(this.getLayoutState());
    }

    // ========================================================================
    // 14. PRIVATE — CONTAINER RESOLUTION
    // ========================================================================

    /** Resolves the mount container from options. */
    private resolveContainer(): HTMLElement
    {
        if (!this.options.container)
        {
            return document.body;
        }

        if (typeof this.options.container === "string")
        {
            const el = document.querySelector(
                this.options.container
            ) as HTMLElement | null;

            if (!el)
            {
                logWarn("Container not found:",
                    this.options.container,
                    "— falling back to document.body"
                );
                return document.body;
            }

            return el;
        }

        return this.options.container;
    }
}

// ============================================================================
// 15. CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Creates a DockLayout instance and immediately shows it.
 */
export function createDockLayout(
    options: DockLayoutOptions
): DockLayout
{
    const layout = new DockLayout(options);
    layout.show();
    return layout;
}

// ============================================================================
// 16. GLOBAL EXPORTS
// ============================================================================

if (typeof window !== "undefined")
{
    (window as any)["DockLayout"] = DockLayout;
    (window as any)["createDockLayout"] = createDockLayout;
}
