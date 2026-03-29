/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: FlowLayout
 * 📜 PURPOSE: Wrapping flex layout container. Arranges children sequentially
 *    and wraps to the next line when the boundary is reached. Supports
 *    configurable gap, alignment, and content distribution.
 * 🔗 RELATES: [[EnterpriseTheme]], [[LayoutContainers]], [[BoxLayout]]
 * ⚡ FLOW: [Consumer App] -> [createFlowLayout()] -> [CSS Flexbox wrap]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// 1. TYPES AND INTERFACES
// ============================================================================

/** Configuration options for FlowLayout. */
export interface FlowLayoutOptions
{
    /** Custom element ID. Auto-generated if omitted. */
    id?: string;

    /** Primary flow direction. Default: "horizontal". */
    direction?: "horizontal" | "vertical";

    /** Initial children. */
    children?: Array<HTMLElement | any>;

    /** Gap between children (CSS value). Default: "0". */
    gap?: number | string;

    /** Separate row gap (CSS value). Overrides gap for rows. */
    rowGap?: number | string;

    /** Separate column gap (CSS value). Overrides gap for columns. */
    columnGap?: number | string;

    /** Per-line cross-axis alignment. Default: "stretch". */
    align?: "start" | "center" | "end" | "stretch" | "baseline";

    /** Main-axis distribution within each line. Default: "start". */
    justify?: "start" | "center" | "end"
        | "space-between" | "space-around" | "space-evenly";

    /** Distribution of lines within the container. Default: "start". */
    alignContent?: "start" | "center" | "end"
        | "stretch" | "space-between" | "space-around";

    /** Container padding (CSS value). */
    padding?: string;

    /** Additional CSS classes on root element. */
    cssClass?: string;

    /** Height CSS value. */
    height?: string;

    /** Width CSS value. */
    width?: string;

    /** Fired on any layout change event. */
    onLayoutChange?: (state: FlowLayoutState) => void;
}

/** Serialisable layout state snapshot. */
export interface FlowLayoutState
{
    direction: "horizontal" | "vertical";
    childCount: number;
}

// ============================================================================
// 2. CONSTANTS
// ============================================================================

const LOG_PREFIX = "[FlowLayout]";
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

const ALIGN_MAP: Record<string, string> = {
    "start": "flex-start", "center": "center", "end": "flex-end",
    "stretch": "stretch", "baseline": "baseline",
};

const JUSTIFY_MAP: Record<string, string> = {
    "start": "flex-start", "center": "center", "end": "flex-end",
    "space-between": "space-between", "space-around": "space-around",
    "space-evenly": "space-evenly",
};

const ALIGN_CONTENT_MAP: Record<string, string> = {
    "start": "flex-start", "center": "center", "end": "flex-end",
    "stretch": "stretch", "space-between": "space-between",
    "space-around": "space-around",
};

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
// 4. FLOWLAYOUT CLASS
// ============================================================================

export class FlowLayout
{
    private readonly instanceId: string;
    private readonly options: FlowLayoutOptions;

    private visible = false;
    private contained = false;
    private rootEl: HTMLElement | null = null;

    private children: Array<HTMLElement | any> = [];
    private childWrappers: HTMLElement[] = [];

    private resizeObserver: ResizeObserver | null = null;

    constructor(options: FlowLayoutOptions)
    {
        instanceCounter += 1;
        this.instanceId = options.id || `flowlayout-${instanceCounter}`;
        this.options = { direction: "horizontal", ...options };

        this.buildDOM();
        this.mountInitialChildren();

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
        this.destroyAllChildren();
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
    // 6. PUBLIC — CHILD MANAGEMENT
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

        this.fireOnLayoutChange();
        logDebug("Child added. Count:",
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

        this.fireOnLayoutChange();
    }

    /** Removes all children. */
    public clear(): void
    {
        this.destroyAllChildren();

        if (this.rootEl)
        {
            while (this.rootEl.firstChild)
            {
                this.rootEl.removeChild(this.rootEl.firstChild);
            }
        }

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
    // 7. PUBLIC — STATE
    // ========================================================================

    /** Returns a serialisable state snapshot. */
    public getState(): FlowLayoutState
    {
        return {
            direction: this.options.direction!,
            childCount: this.children.length,
        };
    }

    /** Restores state from a snapshot (direction only). */
    public setState(state: FlowLayoutState): void
    {
        if (state.direction
            && state.direction !== this.options.direction)
        {
            this.options.direction = state.direction;
            this.applyDirection();
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

    /** Builds the root flex-wrap container element. */
    private buildDOM(): void
    {
        this.rootEl = createElement("div", ["flowlayout"]);
        setAttr(this.rootEl, "id", this.instanceId);
        setAttr(this.rootEl, "role", "presentation");

        if (this.options.cssClass)
        {
            this.rootEl.classList.add(
                ...this.options.cssClass.split(" ")
            );
        }

        this.applyDirection();
        this.applyFlexProps();
    }

    /** Applies the flex-direction CSS based on options. */
    private applyDirection(): void
    {
        if (!this.rootEl) { return; }

        this.rootEl.style.flexDirection =
            this.options.direction === "vertical" ? "column" : "row";
    }

    /** Applies gap, alignment, justify, padding, and size CSS. */
    private applyFlexProps(): void
    {
        if (!this.rootEl) { return; }
        const s = this.rootEl.style;

        this.applyGapProps(s);
        this.applyAlignProps(s);
        this.applySizeProps(s);
    }

    /** Sets gap/rowGap/columnGap on the root style. */
    private applyGapProps(s: CSSStyleDeclaration): void
    {
        const baseGap = this.resolveGap(this.options.gap);

        if (this.options.rowGap !== undefined
            || this.options.columnGap !== undefined)
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
            s.gap = baseGap;
        }
    }

    /** Sets alignment and justify properties. */
    private applyAlignProps(s: CSSStyleDeclaration): void
    {
        s.alignItems =
            ALIGN_MAP[this.options.align || "stretch"] || "stretch";
        s.justifyContent =
            JUSTIFY_MAP[this.options.justify || "start"]
            || "flex-start";
        s.alignContent =
            ALIGN_CONTENT_MAP[this.options.alignContent || "start"]
            || "flex-start";
    }

    /** Sets padding and size properties. */
    private applySizeProps(s: CSSStyleDeclaration): void
    {
        if (this.options.padding) { s.padding = this.options.padding; }
        if (this.options.height) { s.height = this.options.height; }
        if (this.options.width) { s.width = this.options.width; }
    }

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
    // 9. PRIVATE — CHILD MOUNTING
    // ========================================================================

    /** Creates a wrapper element for a flow child. */
    private buildChildWrapper(): HTMLElement
    {
        return createElement("div", ["flowlayout-child"]);
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
        child: any,
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
        child: any, wrapper: HTMLElement
    ): void
    {
        this.rootEl!.appendChild(wrapper);
        this.children.push(child);
        this.childWrappers.push(wrapper);
    }

    /** Destroys all mounted children. */
    private destroyAllChildren(): void
    {
        for (const child of this.children)
        {
            this.unmountComponent(child);
        }

        this.children = [];
        this.childWrappers = [];
    }

    // ========================================================================
    // 10. PRIVATE — RESIZE OBSERVATION
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
    // 11. PRIVATE — CALLBACKS & UTILITIES
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
// 12. CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Creates a FlowLayout, optionally mounts it in a container,
 * and returns it.
 */
export function createFlowLayout(
    options: FlowLayoutOptions,
    containerId?: string
): FlowLayout
{
    const layout = new FlowLayout(options);

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
// 13. GLOBAL EXPORTS
// ============================================================================

if (typeof window !== "undefined")
{
    const w = window as unknown as Record<string, unknown>;
    w["FlowLayout"] = FlowLayout;
    w["createFlowLayout"] = createFlowLayout;
}
