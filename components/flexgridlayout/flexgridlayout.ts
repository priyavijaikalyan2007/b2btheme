/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: FlexGridLayout
 * 📜 PURPOSE: Advanced CSS Grid layout container with variable row/column track
 *    sizes and cell spanning. Supports mixed track definitions (px, fr, auto),
 *    named grid areas, and per-cell alignment overrides.
 * 🔗 RELATES: [[EnterpriseTheme]], [[LayoutContainers]], [[GridLayout]]
 * ⚡ FLOW: [Consumer App] -> [createFlexGridLayout()] -> [CSS Grid]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// 1. TYPES AND INTERFACES
// ============================================================================

/** Per-cell placement configuration for FlexGridLayout. */
export interface FlexGridCellConfig
{
    /** Child element or component (duck-typed). */
    child: HTMLElement | any;

    /** 0-based column index. */
    column: number;

    /** 0-based row index. */
    row: number;

    /** Number of columns to span. Default: 1. */
    columnSpan?: number;

    /** Number of rows to span. Default: 1. */
    rowSpan?: number;

    /** Per-cell block-axis alignment override. */
    alignSelf?: "start" | "center" | "end" | "stretch";

    /** Per-cell inline-axis alignment override. */
    justifySelf?: "start" | "center" | "end" | "stretch";
}

/** Configuration options for FlexGridLayout. */
export interface FlexGridLayoutOptions
{
    /** Custom element ID. Auto-generated if omitted. */
    id?: string;

    /** Column track definitions. e.g. ["200px", "1fr", "auto"]. */
    columns: string[];

    /** Row track definitions. e.g. ["auto", "1fr", "auto"]. */
    rows?: string[];

    /** Uniform gap between cells (CSS value or px number). */
    gap?: number | string;

    /** Row gap override (CSS value or px number). */
    rowGap?: number | string;

    /** Column gap override (CSS value or px number). */
    columnGap?: number | string;

    /** CSS grid-template-areas strings. e.g. ["header header", "nav main"]. */
    areas?: string[];

    /** Initial cells to place in the grid. */
    cells?: FlexGridCellConfig[];

    /** Container padding (CSS value). */
    padding?: string;

    /** Additional CSS classes on root element. */
    cssClass?: string;

    /** Height CSS value. */
    height?: string;

    /** Width CSS value. */
    width?: string;

    /** Fired on resize or structural layout changes. */
    onLayoutChange?: (state: FlexGridLayoutState) => void;
}

/** Serialisable layout state snapshot. */
export interface FlexGridLayoutState
{
    columns: string[];
    rows: string[];
    cellCount: number;
}

// ============================================================================
// 2. CONSTANTS
// ============================================================================

const LOG_PREFIX = "[FlexGridLayout]";
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

// ============================================================================
// 3. DOM HELPERS
// ============================================================================

/** Creates an element with the given tag and CSS classes. */
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

/** Sets a single attribute on an element. */
function setAttr(
    el: HTMLElement, name: string, value: string
): void
{
    el.setAttribute(name, value);
}

// ============================================================================
// 4. INTERNAL TRACKING TYPE
// ============================================================================

/** Tracks a mounted cell with its configuration and DOM wrapper. */
interface CellEntry
{
    config: FlexGridCellConfig;
    wrapper: HTMLElement;
}

// ============================================================================
// 5. FLEXGRIDLAYOUT CLASS
// ============================================================================

/** Advanced CSS Grid layout with variable tracks and cell spanning. */
export class FlexGridLayout
{
    private readonly instanceId: string;
    private readonly options: FlexGridLayoutOptions;

    private visible = false;
    private contained = false;
    private rootEl: HTMLElement | null = null;

    private cells: CellEntry[] = [];

    private resizeObserver: ResizeObserver | null = null;

    constructor(options: FlexGridLayoutOptions)
    {
        instanceCounter += 1;
        this.instanceId = options.id || `flexgridlayout-${instanceCounter}`;
        this.options = { ...options };

        this.buildDOM();
        this.mountInitialCells();

        logInfo("Initialised:", this.instanceId);
    }

    // ========================================================================
    // 6. PUBLIC -- LIFECYCLE
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
        this.destroyAllCells();
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
    // 7. PUBLIC -- CELL MANAGEMENT
    // ========================================================================

    /** Places a child at the specified grid position. */
    public addCell(config: FlexGridCellConfig): void
    {
        if (!this.rootEl) { return; }

        const wrapper = this.buildCellWrapper(config);
        this.mountComponent(config.child, wrapper);

        this.cells.push({ config, wrapper });
        this.rootEl.appendChild(wrapper);

        this.fireOnLayoutChange();
        logDebug(`Cell added at (${config.column}, ${config.row}).`,
            `Count: ${this.cells.length}`
        );
    }

    /** Removes the child at the specified column/row position. */
    public removeCell(column: number, row: number): void
    {
        const index = this.findCellIndex(column, row);

        if (index < 0)
        {
            logWarn(`No cell at (${column}, ${row})`);
            return;
        }

        this.removeCellByIndex(index);
        this.fireOnLayoutChange();
    }

    /** Returns the wrapper element at the specified grid position. */
    public getCellElement(
        column: number, row: number
    ): HTMLElement | null
    {
        const entry = this.cells.find(
            (c) => c.config.column === column && c.config.row === row
        );

        return entry ? entry.wrapper : null;
    }

    // ========================================================================
    // 8. PUBLIC -- TRACK MANAGEMENT
    // ========================================================================

    /** Updates column track definitions and reapplies the template. */
    public setColumns(columns: string[]): void
    {
        this.options.columns = [...columns];
        this.applyGridTemplate();
        this.fireOnLayoutChange();

        logDebug("Columns updated:", columns);
    }

    /** Updates row track definitions and reapplies the template. */
    public setRows(rows: string[]): void
    {
        this.options.rows = [...rows];
        this.applyGridTemplate();
        this.fireOnLayoutChange();

        logDebug("Rows updated:", rows);
    }

    // ========================================================================
    // 9. PUBLIC -- STATE
    // ========================================================================

    /** Returns a serialisable state snapshot. */
    public getState(): FlexGridLayoutState
    {
        return {
            columns: [...this.options.columns],
            rows: [...(this.options.rows || [])],
            cellCount: this.cells.length,
        };
    }

    /** Restores column/row definitions from a state snapshot. */
    public setState(state: FlexGridLayoutState): void
    {
        if (state.columns)
        {
            this.options.columns = [...state.columns];
        }

        if (state.rows)
        {
            this.options.rows = [...state.rows];
        }

        this.applyGridTemplate();
    }

    /** Sets or clears contained mode (fills parent instead of body). */
    public setContained(value: boolean): void
    {
        this.contained = value;
    }

    // ========================================================================
    // 10. PRIVATE -- DOM CONSTRUCTION
    // ========================================================================

    /** Builds the root CSS Grid container element. */
    private buildDOM(): void
    {
        this.rootEl = createElement("div", ["flexgridlayout"]);
        setAttr(this.rootEl, "id", this.instanceId);
        setAttr(this.rootEl, "role", "presentation");

        this.applyCssClass();
        this.applyGridTemplate();
        this.applyGapProps();
        this.applySizeProps();
    }

    /** Adds user-provided CSS classes to the root element. */
    private applyCssClass(): void
    {
        if (!this.rootEl || !this.options.cssClass) { return; }

        this.rootEl.classList.add(
            ...this.options.cssClass.split(" ")
        );
    }

    /** Sets grid-template-columns, grid-template-rows, and areas. */
    private applyGridTemplate(): void
    {
        if (!this.rootEl) { return; }
        const s = this.rootEl.style;

        s.gridTemplateColumns = this.options.columns.join(" ");

        if (this.options.rows && this.options.rows.length > 0)
        {
            s.gridTemplateRows = this.options.rows.join(" ");
        }

        this.applyGridAreas(s);
    }

    /** Applies grid-template-areas if provided. */
    private applyGridAreas(s: CSSStyleDeclaration): void
    {
        if (!this.options.areas || this.options.areas.length === 0)
        {
            return;
        }

        // Each row definition is wrapped in quotes for CSS syntax.
        const areasValue = this.options.areas
            .map((row) => `"${row}"`)
            .join(" ");

        s.gridTemplateAreas = areasValue;
    }

    /** Sets gap/rowGap/columnGap on the root style. */
    private applyGapProps(): void
    {
        if (!this.rootEl) { return; }
        const s = this.rootEl.style;
        const hasSpecificGap = (
            this.options.rowGap !== undefined
            || this.options.columnGap !== undefined
        );

        if (hasSpecificGap)
        {
            s.rowGap = this.resolveGap(
                this.options.rowGap ?? this.options.gap
            );
            s.columnGap = this.resolveGap(
                this.options.columnGap ?? this.options.gap
            );
        }
        else
        {
            s.gap = this.resolveGap(this.options.gap);
        }
    }

    /** Sets padding and dimensional properties on the root element. */
    private applySizeProps(): void
    {
        if (!this.rootEl) { return; }
        const s = this.rootEl.style;

        if (this.options.padding) { s.padding = this.options.padding; }
        if (this.options.height) { s.height = this.options.height; }
        if (this.options.width) { s.width = this.options.width; }
    }

    // ========================================================================
    // 11. PRIVATE -- CELL WRAPPER CONSTRUCTION
    // ========================================================================

    /**
     * Creates a cell wrapper div with grid-column and grid-row
     * placement via inline styles. CSS Grid uses 1-based line numbers,
     * so we add 1 to the 0-based config indices.
     */
    private buildCellWrapper(config: FlexGridCellConfig): HTMLElement
    {
        const wrap = createElement("div", ["flexgridlayout-cell"]);
        const s = wrap.style;

        const colStart = config.column + 1;
        const colSpan = config.columnSpan || 1;
        s.gridColumn = `${colStart} / span ${colSpan}`;

        const rowStart = config.row + 1;
        const rowSpan = config.rowSpan || 1;
        s.gridRow = `${rowStart} / span ${rowSpan}`;

        this.applyCellAlignment(s, config);

        return wrap;
    }

    /** Applies per-cell alignSelf and justifySelf overrides. */
    private applyCellAlignment(
        s: CSSStyleDeclaration, config: FlexGridCellConfig
    ): void
    {
        if (config.alignSelf)
        {
            s.alignSelf = config.alignSelf;
        }

        if (config.justifySelf)
        {
            s.justifySelf = config.justifySelf;
        }
    }

    // ========================================================================
    // 12. PRIVATE -- COMPONENT MOUNTING
    // ========================================================================

    /** Mounts all cells from options.cells during initialisation. */
    private mountInitialCells(): void
    {
        if (!this.options.cells) { return; }

        for (const config of this.options.cells)
        {
            const wrapper = this.buildCellWrapper(config);
            this.mountComponent(config.child, wrapper);
            this.cells.push({ config, wrapper });
            this.rootEl!.appendChild(wrapper);
        }
    }

    /** Mounts a component or HTMLElement into a cell wrapper. */
    private mountComponent(child: any, cell: HTMLElement): void
    {
        if (typeof child.setContained === "function")
        {
            child.setContained(true);
        }

        this.hideIfVisible(child);
        this.showOrAppend(child, cell);
    }

    /** Hides a child that is currently visible before re-mounting. */
    private hideIfVisible(child: any): void
    {
        if (typeof child.isVisible === "function"
            && child.isVisible()
            && typeof child.hide === "function")
        {
            child.hide();
        }
    }

    /** Shows a duck-typed component or appends an HTMLElement. */
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

    /** Calls destroy or removes a child element. */
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

    // ========================================================================
    // 13. PRIVATE -- CELL LOOKUP AND REMOVAL
    // ========================================================================

    /** Finds the index of a cell entry by column and row. */
    private findCellIndex(column: number, row: number): number
    {
        return this.cells.findIndex(
            (c) => c.config.column === column && c.config.row === row
        );
    }

    /** Removes and unmounts a cell by its array index. */
    private removeCellByIndex(index: number): void
    {
        const entry = this.cells[index];
        this.unmountComponent(entry.config.child);
        entry.wrapper.remove();
        this.cells.splice(index, 1);
    }

    /** Destroys all mounted cells. */
    private destroyAllCells(): void
    {
        for (const entry of this.cells)
        {
            this.unmountComponent(entry.config.child);
        }

        this.cells = [];
    }

    // ========================================================================
    // 14. PRIVATE -- RESIZE OBSERVATION
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
    // 15. PRIVATE -- CALLBACKS AND UTILITIES
    // ========================================================================

    /** Fires the onLayoutChange callback if visible. */
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
// 16. CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Creates a FlexGridLayout, optionally mounts it in a container,
 * and returns it.
 */
export function createFlexGridLayout(
    options: FlexGridLayoutOptions,
    containerId?: string
): FlexGridLayout
{
    const layout = new FlexGridLayout(options);

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
// 17. GLOBAL EXPORTS
// ============================================================================

if (typeof window !== "undefined")
{
    const w = window as unknown as Record<string, unknown>;
    w["FlexGridLayout"] = FlexGridLayout;
    w["createFlexGridLayout"] = createFlexGridLayout;
}
