/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: GridLayout
 * 📜 PURPOSE: Uniform grid layout container. All cells are the same size, arranged
 *    via CSS Grid with repeat(N, 1fr). Supports fixed column count or auto-fit
 *    columns based on minimum cell width. Optional aspect ratio enforcement.
 * 🔗 RELATES: [[EnterpriseTheme]], [[LayoutContainers]], [[FlexGridLayout]]
 * ⚡ FLOW: [Consumer App] -> [createGridLayout()] -> [CSS Grid]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// 1. TYPES AND INTERFACES
// ============================================================================

/** Configuration options for GridLayout. */
export interface GridLayoutOptions
{
    /** Custom element ID. Auto-generated if omitted. */
    id?: string;

    /** Number of columns, or "auto" for responsive auto-fit. */
    columns: number | "auto";

    /** Number of rows, or "auto" for natural flow. */
    rows?: number | "auto";

    /** Gap between cells (px number or CSS value). Default: 0. */
    gap?: number | string;

    /** Optional width/height ratio for cells (e.g. 1.0 = square). */
    aspectRatio?: number;

    /** Minimum cell width in px when columns === "auto". Default: 200. */
    minCellWidth?: number;

    /** Initial children (HTMLElement or duck-typed component). */
    children?: Array<HTMLElement | any>;

    /** Container padding (CSS value). */
    padding?: string;

    /** Additional CSS class(es) on root element. */
    cssClass?: string;

    /** Height CSS value. */
    height?: string;

    /** Width CSS value. */
    width?: string;

    /** Fired on layout change (column recalculation, child add/remove). */
    onLayoutChange?: (state: GridLayoutState) => void;
}

/** Serialisable layout state snapshot. */
export interface GridLayoutState
{
    columns: number;
    rows: number;
    childCount: number;
}

// ============================================================================
// 2. CONSTANTS
// ============================================================================

const LOG_PREFIX = "[GridLayout]";

/** Default minimum cell width for auto-column mode. */
const DEFAULT_MIN_CELL_WIDTH = 200;

/** Instance counter for unique ID generation. */
let instanceCounter = 0;

// ============================================================================
// 3. DOM HELPERS
// ============================================================================

/**
 * Creates an HTML element with optional CSS classes.
 *
 * @param tag - The HTML tag name
 * @param classes - CSS class names to add
 * @returns The created element
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
 * Sets an attribute on an HTML element.
 *
 * @param el - Target element
 * @param name - Attribute name
 * @param value - Attribute value
 */
function setAttr(
    el: HTMLElement, name: string, value: string
): void
{
    el.setAttribute(name, value);
}

// ============================================================================
// 4. GRIDLAYOUT CLASS
// ============================================================================

/**
 * GridLayout renders a uniform CSS Grid container. All cells are equal size,
 * arranged via `grid-template-columns: repeat(N, 1fr)`. Supports a fixed
 * column count or an "auto" mode that responsively calculates columns from
 * container width and a minimum cell width.
 *
 * @example
 * const grid = new GridLayout({
 *     columns: 3,
 *     gap: 8,
 *     children: [panelA, panelB, panelC, panelD]
 * });
 * grid.show(document.getElementById("app"));
 */
export class GridLayout
{
    private readonly instanceId: string;
    private readonly options: GridLayoutOptions;

    private visible = false;
    private contained = false;
    private rootEl: HTMLElement | null = null;

    private children: Array<HTMLElement | any> = [];
    private childWrappers: HTMLElement[] = [];

    private currentColumns = 1;
    private resizeObserver: ResizeObserver | null = null;

    constructor(options: GridLayoutOptions)
    {
        instanceCounter += 1;
        this.instanceId = options.id || `gridlayout-${instanceCounter}`;
        this.options = { ...options };

        this.currentColumns = this.resolveInitialColumns();
        this.buildDOM();
        this.mountInitialChildren();

        console.log(`${LOG_PREFIX} Initialised:`, this.instanceId);
    }

    // ========================================================================
    // 5. PUBLIC -- LIFECYCLE
    // ========================================================================

    /** Appends the grid to a container and makes it visible. */
    public show(container?: HTMLElement | string): void
    {
        if (this.visible)
        {
            console.warn(`${LOG_PREFIX} Already visible:`, this.instanceId);
            return;
        }

        if (!this.rootEl) { return; }

        const target = this.resolveContainer(container);
        target.appendChild(this.rootEl);
        this.visible = true;

        if (this.options.columns === "auto")
        {
            this.setupResizeObserver();
        }

        console.debug(`${LOG_PREFIX} Shown:`, this.instanceId);
    }

    /** Removes from DOM without destroying state. */
    public hide(): void
    {
        if (!this.visible) { return; }

        this.teardownResizeObserver();
        this.rootEl?.remove();
        this.visible = false;

        console.debug(`${LOG_PREFIX} Hidden:`, this.instanceId);
    }

    /** Removes from DOM, unhooks listeners, releases references. */
    public destroy(): void
    {
        this.teardownResizeObserver();
        this.destroyAllChildren();
        this.rootEl?.remove();
        this.rootEl = null;
        this.visible = false;

        console.debug(`${LOG_PREFIX} Destroyed:`, this.instanceId);
    }

    /** Returns the root DOM element. */
    public getRootElement(): HTMLElement | null
    {
        return this.rootEl;
    }

    /** Returns whether the grid is currently in the DOM. */
    public isVisible(): boolean
    {
        return this.visible;
    }

    // ========================================================================
    // 6. PUBLIC -- CHILD MANAGEMENT
    // ========================================================================

    /** Adds a child at an optional index position. */
    public addChild(child: HTMLElement | any, index?: number): void
    {
        if (!this.rootEl) { return; }

        const wrapper = this.buildChildWrapper();
        this.mountComponent(child, wrapper);

        if (index !== undefined && index >= 0
            && index < this.children.length)
        {
            this.insertChildAt(child, wrapper, index);
        }
        else
        {
            this.appendChildAtEnd(child, wrapper);
        }

        this.recalculateIfAuto();
        this.fireOnLayoutChange();

        console.debug(
            `${LOG_PREFIX} Child added. Count:`,
            this.children.length
        );
    }

    /** Removes a child by index. */
    public removeChild(index: number): void
    {
        if (index < 0 || index >= this.children.length) { return; }

        this.unmountComponent(this.children[index]);
        this.childWrappers[index].remove();
        this.children.splice(index, 1);
        this.childWrappers.splice(index, 1);

        this.recalculateIfAuto();
        this.fireOnLayoutChange();
    }

    /** Removes all children. */
    public clear(): void
    {
        this.destroyAllChildren();
        this.recalculateIfAuto();
        this.fireOnLayoutChange();
    }

    /** Returns the number of children. */
    public getChildCount(): number
    {
        return this.children.length;
    }

    /** Returns the wrapper element at the given index. */
    public getChildElement(index: number): HTMLElement | null
    {
        return this.childWrappers[index] || null;
    }

    // ========================================================================
    // 7. PUBLIC -- COLUMN MANAGEMENT
    // ========================================================================

    /** Updates the column configuration dynamically. */
    public setColumns(n: number | "auto"): void
    {
        (this.options as any).columns = n;

        if (n === "auto")
        {
            this.recalculateColumns();

            if (this.visible)
            {
                this.setupResizeObserver();
            }
        }
        else
        {
            this.teardownResizeObserver();
            this.currentColumns = n;
            this.applyGridTemplate();
        }

        this.fireOnLayoutChange();

        console.debug(
            `${LOG_PREFIX} Columns set to:`, n,
            `(effective: ${this.currentColumns})`
        );
    }

    // ========================================================================
    // 8. PUBLIC -- STATE
    // ========================================================================

    /** Returns a serialisable state snapshot. */
    public getState(): GridLayoutState
    {
        const rows = this.computeRows();

        return {
            columns: this.currentColumns,
            rows: rows,
            childCount: this.children.length,
        };
    }

    /** Restores state from a snapshot (columns only). */
    public setState(state: GridLayoutState): void
    {
        if (state.columns !== undefined
            && state.columns !== this.currentColumns)
        {
            this.setColumns(state.columns);
        }
    }

    /** Sets or clears contained mode (fills parent instead of body). */
    public setContained(value: boolean): void
    {
        this.contained = value;
    }

    // ========================================================================
    // 9. PRIVATE -- DOM CONSTRUCTION
    // ========================================================================

    /** Builds the root CSS Grid container element. */
    private buildDOM(): void
    {
        this.rootEl = createElement("div", ["gridlayout"]);
        setAttr(this.rootEl, "id", this.instanceId);
        setAttr(this.rootEl, "role", "presentation");

        if (this.options.cssClass)
        {
            this.rootEl.classList.add(
                ...this.options.cssClass.split(" ")
            );
        }

        this.applyContainerStyles();
        this.applyGridTemplate();
    }

    /** Applies gap, padding, width, and height CSS to root. */
    private applyContainerStyles(): void
    {
        if (!this.rootEl) { return; }

        const s = this.rootEl.style;

        s.gap = this.resolveGap(this.options.gap);

        if (this.options.padding) { s.padding = this.options.padding; }
        if (this.options.height) { s.height = this.options.height; }
        if (this.options.width) { s.width = this.options.width; }
    }

    /** Sets CSS grid-template-columns and optionally grid-template-rows. */
    private applyGridTemplate(): void
    {
        if (!this.rootEl) { return; }

        const s = this.rootEl.style;

        s.gridTemplateColumns = `repeat(${this.currentColumns}, 1fr)`;

        const rows = this.resolveRowTemplate();

        if (rows)
        {
            s.gridTemplateRows = rows;
        }
        else
        {
            s.gridTemplateRows = "";
        }

        this.applyAspectRatio();
    }

    /** Resolves the row template string from options. */
    private resolveRowTemplate(): string | null
    {
        const rows = this.options.rows;

        if (rows === undefined || rows === "auto")
        {
            return null;
        }

        if (typeof rows === "number" && rows > 0)
        {
            return `repeat(${rows}, 1fr)`;
        }

        return null;
    }

    /** Applies aspect-ratio to each child wrapper if configured. */
    private applyAspectRatio(): void
    {
        if (!this.options.aspectRatio) { return; }

        const ratio = this.options.aspectRatio;

        for (const wrapper of this.childWrappers)
        {
            wrapper.style.aspectRatio = String(ratio);
        }
    }

    // ========================================================================
    // 10. PRIVATE -- INITIAL CHILDREN
    // ========================================================================

    /** Mounts all children from options.children. */
    private mountInitialChildren(): void
    {
        if (!this.options.children) { return; }

        for (const child of this.options.children)
        {
            const wrapper = this.buildChildWrapper();
            this.mountComponent(child, wrapper);
            this.children.push(child);
            this.childWrappers.push(wrapper);
            this.rootEl!.appendChild(wrapper);
        }
    }

    // ========================================================================
    // 11. PRIVATE -- CHILD MOUNTING
    // ========================================================================

    /** Creates a grid cell wrapper element. */
    private buildChildWrapper(): HTMLElement
    {
        const cell = createElement("div", ["gridlayout-cell"]);

        if (this.options.aspectRatio)
        {
            cell.style.aspectRatio = String(this.options.aspectRatio);
        }

        return cell;
    }

    /** Mounts a component or HTMLElement into a wrapper cell. */
    private mountComponent(child: any, cell: HTMLElement): void
    {
        if (typeof child.setContained === "function")
        {
            child.setContained(true);
        }

        if (typeof child.isVisible === "function"
            && child.isVisible()
            && typeof child.hide === "function")
        {
            child.hide();
        }

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

    /** Inserts a wrapper at the given index. */
    private insertChildAt(
        child: HTMLElement | any,
        wrapper: HTMLElement,
        index: number
    ): void
    {
        const ref = this.childWrappers[index];
        this.rootEl!.insertBefore(wrapper, ref);
        this.children.splice(index, 0, child);
        this.childWrappers.splice(index, 0, wrapper);
    }

    /** Appends a wrapper at the end. */
    private appendChildAtEnd(
        child: HTMLElement | any,
        wrapper: HTMLElement
    ): void
    {
        this.rootEl!.appendChild(wrapper);
        this.children.push(child);
        this.childWrappers.push(wrapper);
    }

    /** Destroys all mounted children and clears arrays. */
    private destroyAllChildren(): void
    {
        for (const child of this.children)
        {
            this.unmountComponent(child);
        }

        for (const wrapper of this.childWrappers)
        {
            wrapper.remove();
        }

        this.children = [];
        this.childWrappers = [];
    }

    // ========================================================================
    // 12. PRIVATE -- AUTO-COLUMN CALCULATION
    // ========================================================================

    /** Returns the initial column count based on options. */
    private resolveInitialColumns(): number
    {
        if (this.options.columns === "auto")
        {
            return 1;
        }

        return Math.max(1, this.options.columns);
    }

    /** Recalculates columns only when in "auto" mode. */
    private recalculateIfAuto(): void
    {
        if (this.options.columns === "auto")
        {
            this.recalculateColumns();
        }
    }

    /**
     * For "auto" mode: calculates optimal column count from container
     * width and minCellWidth, clamped to the child count.
     */
    private recalculateColumns(): void
    {
        if (!this.rootEl) { return; }

        const containerWidth = this.rootEl.clientWidth;

        if (containerWidth <= 0) { return; }

        const minWidth = this.options.minCellWidth
            || DEFAULT_MIN_CELL_WIDTH;

        const calculated = Math.max(
            1, Math.floor(containerWidth / minWidth)
        );

        const clamped = this.children.length > 0
            ? Math.min(calculated, this.children.length)
            : calculated;

        if (clamped !== this.currentColumns)
        {
            this.currentColumns = clamped;
            this.applyGridTemplate();
            this.fireOnLayoutChange();

            console.debug(
                `${LOG_PREFIX} Auto-columns:`, this.currentColumns,
                `(container: ${containerWidth}px)`
            );
        }
    }

    /** Computes the current number of rows based on children and columns. */
    private computeRows(): number
    {
        if (this.children.length === 0) { return 0; }

        return Math.ceil(this.children.length / this.currentColumns);
    }

    // ========================================================================
    // 13. PRIVATE -- RESIZE OBSERVER
    // ========================================================================

    /** Sets up a ResizeObserver for auto-column recalculation. */
    private setupResizeObserver(): void
    {
        if (this.resizeObserver || !this.rootEl) { return; }

        this.resizeObserver = new ResizeObserver(() =>
        {
            this.recalculateColumns();
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
    // 14. PRIVATE -- CALLBACKS AND UTILITIES
    // ========================================================================

    /** Fires the onLayoutChange callback. */
    private fireOnLayoutChange(): void
    {
        if (!this.options.onLayoutChange) { return; }
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
            const el = document.querySelector(container) as HTMLElement;

            if (!el)
            {
                console.warn(
                    `${LOG_PREFIX} Container not found:`, container
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
// 15. CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Creates a GridLayout, optionally mounts it in a container, and returns it.
 *
 * @param options - GridLayout configuration
 * @param containerId - Optional container element ID or selector
 * @returns The created GridLayout instance
 */
export function createGridLayout(
    options: GridLayoutOptions,
    containerId?: string
): GridLayout
{
    const layout = new GridLayout(options);

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
// 16. GLOBAL EXPORTS
// ============================================================================

if (typeof window !== "undefined")
{
    const w = window as unknown as Record<string, unknown>;
    w["GridLayout"] = GridLayout;
    w["createGridLayout"] = createGridLayout;
}
