/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: BorderLayout
 * 📜 PURPOSE: Five-region CSS Grid layout container. Divides its area into
 *    North, South, East, West, and Center regions. Supports region
 *    collapsing and dynamic slot assignment.
 * 🔗 RELATES: [[EnterpriseTheme]], [[LayoutContainers]], [[DockLayout]]
 * ⚡ FLOW: [Consumer App] -> [createBorderLayout()] -> [CSS Grid]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// 1. TYPES AND INTERFACES
// ============================================================================

/** Named region identifiers for BorderLayout. */
export type BorderRegion =
    "north" | "south" | "east" | "west" | "center";

/** Configuration options for BorderLayout. */
export interface BorderLayoutOptions
{
    /** Custom element ID. Auto-generated if omitted. */
    id?: string;

    /** North (top) region child. */
    north?: HTMLElement | any;

    /** South (bottom) region child. */
    south?: HTMLElement | any;

    /** East (right) region child. */
    east?: HTMLElement | any;

    /** West (left) region child. */
    west?: HTMLElement | any;

    /** Center region child. */
    center?: HTMLElement | any;

    /** Gap between regions (CSS value). Default: "0". */
    gap?: number | string;

    /** Fixed or preferred height for the north region. */
    northHeight?: string;

    /** Fixed or preferred height for the south region. */
    southHeight?: string;

    /** Fixed or preferred width for the east region. */
    eastWidth?: string;

    /** Fixed or preferred width for the west region. */
    westWidth?: string;

    /** Regions that can be collapsed. */
    collapsible?: BorderRegion[];

    /** Container padding (CSS value). */
    padding?: string;

    /** Additional CSS classes on root element. */
    cssClass?: string;

    /** Height CSS value. */
    height?: string;

    /** Width CSS value. */
    width?: string;

    /** Fired on any layout change event. */
    onLayoutChange?: (state: BorderLayoutState) => void;
}

/** Serialisable layout state snapshot. */
export interface BorderLayoutState
{
    regions: Record<BorderRegion, boolean>;
    collapsed: BorderRegion[];
}

// ============================================================================
// 2. CONSTANTS
// ============================================================================

const LOG_PREFIX = "[BorderLayout]";
const _lu = (typeof (window as any).createLogUtility === "function") ? (window as any).createLogUtility().getLogger(LOG_PREFIX.slice(1, -1)) : null;
function logInfo(...a: unknown[]): void { _lu ? _lu.info(...a) : console.log(new Date().toISOString(), "[INFO]", LOG_PREFIX, ...a); }
function logWarn(...a: unknown[]): void { _lu ? _lu.warn(...a) : console.warn(new Date().toISOString(), "[WARN]", LOG_PREFIX, ...a); }
function logError(...a: unknown[]): void { _lu ? _lu.error(...a) : console.error(new Date().toISOString(), "[ERROR]", LOG_PREFIX, ...a); }
function logDebug(...a: unknown[]): void { _lu ? _lu.debug(...a) : console.debug(new Date().toISOString(), "[DEBUG]", LOG_PREFIX, ...a); }

let instanceCounter = 0;

const ALL_REGIONS: BorderRegion[] =
    ["north", "south", "east", "west", "center"];

// ============================================================================
// 3. DOM HELPERS
// ============================================================================

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

function setAttr(
    el: HTMLElement, name: string, value: string
): void
{
    el.setAttribute(name, value);
}

// ============================================================================
// 4. BORDERLAYOUT CLASS
// ============================================================================

export class BorderLayout
{
    private readonly instanceId: string;
    private readonly options: BorderLayoutOptions;

    private visible = false;
    private contained = false;
    private rootEl: HTMLElement | null = null;

    private regionCells: Record<string, HTMLElement> =
        {} as Record<string, HTMLElement>;
    private regionChildren: Record<string, any> =
        {} as Record<string, any>;
    private collapsedRegions: Set<BorderRegion> = new Set();

    private resizeObserver: ResizeObserver | null = null;

    constructor(options: BorderLayoutOptions)
    {
        instanceCounter += 1;
        this.instanceId =
            options.id || `borderlayout-${instanceCounter}`;
        this.options = { ...options };

        this.buildDOM();
        this.mountInitialSlots();

        logInfo("Initialised:", this.instanceId);
    }

    // ========================================================================
    // 5. PUBLIC — LIFECYCLE
    // ========================================================================

    /** Appends the layout to a container and makes it visible. */
    public show(container?: HTMLElement | string): void
    {
        if (this.visible)
        {
            logWarn("Already visible:", this.instanceId);
            return;
        }

        if (!this.rootEl) { return; }

        const target = this.resolveContainer(container);
        target.appendChild(this.rootEl);
        this.visible = true;
        this.setupResizeObserver();

        logDebug("Shown:", this.instanceId);
    }

    /** Removes from DOM without destroying state. */
    public hide(): void
    {
        if (!this.visible) { return; }

        this.teardownResizeObserver();
        this.rootEl?.remove();
        this.visible = false;

        logDebug("Hidden:", this.instanceId);
    }

    /** Removes from DOM, unhooks listeners, releases references. */
    public destroy(): void
    {
        this.teardownResizeObserver();
        this.destroyAllSlots();
        this.rootEl?.remove();
        this.rootEl = null;
        this.visible = false;

        logDebug("Destroyed:", this.instanceId);
    }

    /** Returns the root DOM element. */
    public getRootElement(): HTMLElement | null
    {
        return this.rootEl;
    }

    /** Returns whether the layout is currently in the DOM. */
    public isVisible(): boolean
    {
        return this.visible;
    }

    // ========================================================================
    // 6. PUBLIC — SLOT MANAGEMENT
    // ========================================================================

    /** Sets or clears the north region child. */
    public setNorth(child: HTMLElement | any | null): void
    {
        this.setRegion("north", child);
    }

    /** Sets or clears the south region child. */
    public setSouth(child: HTMLElement | any | null): void
    {
        this.setRegion("south", child);
    }

    /** Sets or clears the east region child. */
    public setEast(child: HTMLElement | any | null): void
    {
        this.setRegion("east", child);
    }

    /** Sets or clears the west region child. */
    public setWest(child: HTMLElement | any | null): void
    {
        this.setRegion("west", child);
    }

    /** Sets or clears the center region child. */
    public setCenter(child: HTMLElement | any | null): void
    {
        this.setRegion("center", child);
    }

    /** Collapses a region (hides it, gives space to neighbors). */
    public collapseRegion(region: BorderRegion): void
    {
        if (!this.isCollapsible(region)) { return; }
        if (this.collapsedRegions.has(region)) { return; }

        this.collapsedRegions.add(region);
        this.applyCollapsedClass(region, true);
        this.updateGridTemplate();
        this.fireOnLayoutChange();

        logDebug("Collapsed:", region);
    }

    /** Expands a previously collapsed region. */
    public expandRegion(region: BorderRegion): void
    {
        if (!this.collapsedRegions.has(region)) { return; }

        this.collapsedRegions.delete(region);
        this.applyCollapsedClass(region, false);
        this.updateGridTemplate();
        this.fireOnLayoutChange();

        logDebug("Expanded:", region);
    }

    /** Returns the cell element for a region. */
    public getRegionElement(
        region: BorderRegion
    ): HTMLElement | null
    {
        return this.regionCells[region] || null;
    }

    // ========================================================================
    // 7. PUBLIC — STATE
    // ========================================================================

    /** Returns a serialisable state snapshot. */
    public getState(): BorderLayoutState
    {
        const regions = {} as Record<BorderRegion, boolean>;

        for (const r of ALL_REGIONS)
        {
            regions[r] = !!this.regionChildren[r];
        }

        return {
            regions,
            collapsed: Array.from(this.collapsedRegions),
        };
    }

    /** Restores state from a snapshot. */
    public setState(state: BorderLayoutState): void
    {
        if (!state.collapsed) { return; }

        for (const region of ALL_REGIONS)
        {
            if (state.collapsed.includes(region))
            {
                this.collapseRegion(region);
            }
            else
            {
                this.expandRegion(region);
            }
        }
    }

    /** Sets or clears contained mode. */
    public setContained(value: boolean): void
    {
        this.contained = value;
    }

    // ========================================================================
    // 8. PRIVATE — DOM CONSTRUCTION
    // ========================================================================

    /** Builds the root grid container with 5 region cells. */
    private buildDOM(): void
    {
        this.rootEl = createElement("div", ["borderlayout"]);
        setAttr(this.rootEl, "id", this.instanceId);
        setAttr(this.rootEl, "role", "presentation");

        this.applyCssClass();
        this.createRegionCells();
        this.updateGridTemplate();
        this.applySizeProps();
    }

    /** Adds custom CSS classes from options. */
    private applyCssClass(): void
    {
        if (!this.options.cssClass || !this.rootEl) { return; }
        this.rootEl.classList.add(
            ...this.options.cssClass.split(" ")
        );
    }

    /** Creates the 5 grid area cells and appends to root. */
    private createRegionCells(): void
    {
        for (const region of ALL_REGIONS)
        {
            const cell = createElement(
                "div", [`borderlayout-${region}`]
            );
            setAttr(cell, "data-region", region);
            this.regionCells[region] = cell;
            this.rootEl!.appendChild(cell);
        }
    }

    /** Applies height, width, padding, and gap to root. */
    private applySizeProps(): void
    {
        if (!this.rootEl) { return; }
        const s = this.rootEl.style;

        s.gap = this.resolveGap(this.options.gap);
        if (this.options.padding) { s.padding = this.options.padding; }
        if (this.options.height) { s.height = this.options.height; }
        if (this.options.width) { s.width = this.options.width; }
    }

    /** Updates grid-template-columns and grid-template-rows. */
    private updateGridTemplate(): void
    {
        if (!this.rootEl) { return; }
        const s = this.rootEl.style;

        s.gridTemplateColumns = this.buildColumnTemplate();
        s.gridTemplateRows = this.buildRowTemplate();
    }

    /** Builds the 3-column template: west | center | east. */
    private buildColumnTemplate(): string
    {
        const west = this.resolveColSize(
            "west", this.options.westWidth, "auto"
        );
        const east = this.resolveColSize(
            "east", this.options.eastWidth, "auto"
        );
        return `${west} 1fr ${east}`;
    }

    /** Builds the 3-row template: north | middle | south. */
    private buildRowTemplate(): string
    {
        const north = this.resolveRowSize(
            "north", this.options.northHeight, "auto"
        );
        const south = this.resolveRowSize(
            "south", this.options.southHeight, "auto"
        );
        return `${north} 1fr ${south}`;
    }

    /** Resolves a column size, returning 0 if collapsed/empty. */
    private resolveColSize(
        region: BorderRegion,
        size: string | undefined,
        fallback: string
    ): string
    {
        if (this.collapsedRegions.has(region)) { return "0"; }
        if (!this.regionChildren[region]) { return "0"; }
        return size || fallback;
    }

    /** Resolves a row size, returning 0 if collapsed/empty. */
    private resolveRowSize(
        region: BorderRegion,
        size: string | undefined,
        fallback: string
    ): string
    {
        if (this.collapsedRegions.has(region)) { return "0"; }
        if (!this.regionChildren[region]) { return "0"; }
        return size || fallback;
    }

    // ========================================================================
    // 9. PRIVATE — SLOT MOUNTING
    // ========================================================================

    /** Mounts initial children from options into their regions. */
    private mountInitialSlots(): void
    {
        for (const region of ALL_REGIONS)
        {
            const child =
                this.options[region as keyof BorderLayoutOptions];

            if (child && typeof child !== "string"
                && typeof child !== "number"
                && typeof child !== "boolean"
                && typeof child !== "function")
            {
                this.setRegion(region as BorderRegion, child);
            }
        }
    }

    /** Sets or clears a region's child component. */
    private setRegion(
        region: BorderRegion,
        child: HTMLElement | any | null
    ): void
    {
        const cell = this.regionCells[region];
        if (!cell) { return; }

        this.clearRegion(region, cell);

        if (child)
        {
            this.mountComponent(child, cell);
            this.regionChildren[region] = child;
        }

        this.updateGridTemplate();
        this.fireOnLayoutChange();
    }

    /** Clears a region, unmounting any existing child. */
    private clearRegion(
        region: string, cell: HTMLElement
    ): void
    {
        const existing = this.regionChildren[region];

        if (existing)
        {
            this.unmountComponent(existing);
            this.removeAllChildNodes(cell);
            delete this.regionChildren[region];
        }
    }

    /** Removes all child nodes from an element. */
    private removeAllChildNodes(el: HTMLElement): void
    {
        while (el.firstChild)
        {
            el.removeChild(el.firstChild);
        }
    }

    /** Mounts a component or HTMLElement into a cell. */
    private mountComponent(child: any, cell: HTMLElement): void
    {
        if (typeof child.setContained === "function")
        {
            child.setContained(true);
        }

        this.hideIfVisible(child);
        this.showOrAppend(child, cell);
    }

    /** Hides a child if it is currently visible. */
    private hideIfVisible(child: any): void
    {
        if (typeof child.isVisible === "function"
            && child.isVisible()
            && typeof child.hide === "function")
        {
            child.hide();
        }
    }

    /** Shows a child in a cell, or appends its root element. */
    private showOrAppend(child: any, cell: HTMLElement): void
    {
        if (typeof child.show === "function")
        {
            child.show(cell);
        }
        else if (typeof child.getRootElement === "function")
        {
            const rootEl = child.getRootElement();
            if (rootEl) { cell.appendChild(rootEl); }
        }
        else if (child instanceof HTMLElement)
        {
            cell.appendChild(child);
        }
    }

    /** Calls destroy or removes the element from a child. */
    private unmountComponent(child: any): void
    {
        if (typeof child.destroy === "function")
        {
            child.destroy();
        }
        else if (child instanceof HTMLElement)
        {
            child.remove();
        }
    }

    /** Destroys all mounted slot children. */
    private destroyAllSlots(): void
    {
        for (const region of ALL_REGIONS)
        {
            const child = this.regionChildren[region];
            if (child) { this.unmountComponent(child); }
        }

        this.regionChildren = {} as Record<string, any>;
    }

    // ========================================================================
    // 10. PRIVATE — COLLAPSE
    // ========================================================================

    /** Returns whether a region is in the collapsible list. */
    private isCollapsible(region: BorderRegion): boolean
    {
        if (!this.options.collapsible) { return false; }
        return this.options.collapsible.includes(region);
    }

    /** Adds or removes the collapsed CSS class on a cell. */
    private applyCollapsedClass(
        region: BorderRegion, collapsed: boolean
    ): void
    {
        const cell = this.regionCells[region];
        if (!cell) { return; }

        cell.classList.toggle(
            "borderlayout-collapsed", collapsed
        );
    }

    // ========================================================================
    // 11. PRIVATE — RESIZE OBSERVATION
    // ========================================================================

    /** Sets up a ResizeObserver on the root element. */
    private setupResizeObserver(): void
    {
        if (!this.rootEl) { return; }

        this.resizeObserver = new ResizeObserver(() =>
        {
            this.fireOnLayoutChange();
        });

        this.resizeObserver.observe(this.rootEl);
    }

    /** Disconnects the ResizeObserver. */
    private teardownResizeObserver(): void
    {
        if (this.resizeObserver)
        {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
    }

    // ========================================================================
    // 12. PRIVATE — CALLBACKS & UTILITIES
    // ========================================================================

    /** Fires the onLayoutChange callback. */
    private fireOnLayoutChange(): void
    {
        if (!this.options.onLayoutChange || !this.visible)
        {
            return;
        }
        this.options.onLayoutChange(this.getState());
    }

    /** Resolves a container argument to an HTMLElement. */
    private resolveContainer(
        container?: HTMLElement | string
    ): HTMLElement
    {
        if (!container) { return document.body; }

        if (typeof container === "string")
        {
            const el =
                document.querySelector(container) as HTMLElement;

            if (!el)
            {
                logWarn("Container not found:",
                    container
                );
                return document.body;
            }

            return el;
        }

        return container;
    }

    /** Resolves a gap value to a CSS string. */
    private resolveGap(gap?: number | string): string
    {
        if (gap === undefined) { return "0"; }
        return typeof gap === "number" ? `${gap}px` : gap;
    }
}

// ============================================================================
// 13. CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Creates a BorderLayout, optionally mounts it, and returns it.
 */
export function createBorderLayout(
    options: BorderLayoutOptions,
    containerId?: string
): BorderLayout
{
    const layout = new BorderLayout(options);

    if (containerId)
    {
        const el = document.getElementById(containerId);
        if (el) { layout.show(el); }
    }
    else
    {
        layout.show();
    }

    return layout;
}

// ============================================================================
// 14. GLOBAL EXPORTS
// ============================================================================

if (typeof window !== "undefined")
{
    const w = window as unknown as Record<string, unknown>;
    w["BorderLayout"] = BorderLayout;
    w["createBorderLayout"] = createBorderLayout;
}
