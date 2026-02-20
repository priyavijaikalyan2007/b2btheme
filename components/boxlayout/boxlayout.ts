/*
 * ----------------------------------------------------------------------------
 * COMPONENT: BoxLayout
 * PURPOSE: Single-axis flex layout container. Arranges children sequentially
 *    along one axis (horizontal or vertical) with configurable flex factors,
 *    alignment, and gap. Inspired by Java Swing BoxLayout, WPF StackPanel.
 * RELATES: [[EnterpriseTheme]], [[LayoutContainers]], [[FlowLayout]]
 * FLOW: [Consumer App] -> [createBoxLayout()] -> [CSS Flexbox]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// 1. TYPES AND INTERFACES
// ============================================================================

/** Per-child configuration for BoxLayout. */
export interface BoxLayoutChildConfig
{
    /** Child element or component (duck-typed). */
    child: HTMLElement | any;

    /** Flex grow factor. 0 = natural size (default). */
    flex?: number;

    /** Minimum size in pixels along main axis. */
    minSize?: number;

    /** Maximum size in pixels along main axis. */
    maxSize?: number;

    /** Cross-axis alignment override for this child. */
    alignSelf?: "start" | "center" | "end" | "stretch" | "baseline";
}

/** Configuration options for BoxLayout. */
export interface BoxLayoutOptions
{
    /** Custom element ID. Auto-generated if omitted. */
    id?: string;

    /** Main axis direction. */
    direction: "horizontal" | "vertical";

    /** Initial children. */
    children?: BoxLayoutChildConfig[];

    /** Gap between children (CSS value). Default: "0". */
    gap?: number | string;

    /** Cross-axis alignment. Default: "stretch". */
    align?: "start" | "center" | "end" | "stretch" | "baseline";

    /** Main-axis distribution. Default: "start". */
    justify?: "start" | "center" | "end"
        | "space-between" | "space-around" | "space-evenly";

    /** Container padding (CSS value). */
    padding?: string;

    /** Additional CSS classes on root element. */
    cssClass?: string;

    /** Height CSS value. */
    height?: string;

    /** Width CSS value. */
    width?: string;

    /** Fired on any layout change event. */
    onLayoutChange?: (state: BoxLayoutState) => void;
}

/** Serialisable layout state snapshot. */
export interface BoxLayoutState
{
    direction: "horizontal" | "vertical";
    childCount: number;
}

// ============================================================================
// 2. CONSTANTS
// ============================================================================

const LOG_PREFIX = "[BoxLayout]";
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
// 4. BOXLAYOUT CLASS
// ============================================================================

export class BoxLayout
{
    private readonly instanceId: string;
    private readonly options: BoxLayoutOptions;

    private visible = false;
    private contained = false;
    private rootEl: HTMLElement | null = null;

    private childConfigs: BoxLayoutChildConfig[] = [];
    private childWrappers: HTMLElement[] = [];

    private resizeObserver: ResizeObserver | null = null;

    constructor(options: BoxLayoutOptions)
    {
        instanceCounter += 1;
        this.instanceId = options.id || `boxlayout-${instanceCounter}`;
        this.options = { ...options };

        this.buildDOM();
        this.mountInitialChildren();

        console.log(`${LOG_PREFIX} Initialised:`, this.instanceId);
    }

    // ========================================================================
    // 5. PUBLIC — LIFECYCLE
    // ========================================================================

    /** Appends the layout to a container and makes it visible. */
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
        this.setupResizeObserver();

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

    /** Returns whether the layout is currently in the DOM. */
    public isVisible(): boolean
    {
        return this.visible;
    }

    // ========================================================================
    // 6. PUBLIC — CHILD MANAGEMENT
    // ========================================================================

    /** Adds a child at an optional index position. */
    public addChild(config: BoxLayoutChildConfig, index?: number): void
    {
        if (!this.rootEl) { return; }

        const wrapper = this.buildChildWrapper(config);
        this.mountComponent(config.child, wrapper);

        if (index !== undefined && index >= 0
            && index < this.childConfigs.length)
        {
            this.insertChildAt(config, wrapper, index);
        }
        else
        {
            this.appendChildAtEnd(config, wrapper);
        }

        this.fireOnLayoutChange();
        console.debug(
            `${LOG_PREFIX} Child added. Count:`,
            this.childConfigs.length
        );
    }

    /** Removes a child by index. */
    public removeChild(index: number): void
    {
        if (index < 0 || index >= this.childConfigs.length) { return; }

        this.unmountComponent(this.childConfigs[index].child);
        this.childWrappers[index].remove();
        this.childConfigs.splice(index, 1);
        this.childWrappers.splice(index, 1);

        this.fireOnLayoutChange();
    }

    /** Returns the number of children. */
    public getChildCount(): number
    {
        return this.childConfigs.length;
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
    public getState(): BoxLayoutState
    {
        return {
            direction: this.options.direction,
            childCount: this.childConfigs.length,
        };
    }

    /** Restores state from a snapshot (direction only). */
    public setState(state: BoxLayoutState): void
    {
        if (state.direction && state.direction !== this.options.direction)
        {
            this.options.direction = state.direction;
            this.applyDirection();
        }
    }

    /** Sets or clears contained mode (fills parent instead of body). */
    public setContained(value: boolean): void
    {
        this.contained = value;
    }

    // ========================================================================
    // 8. PRIVATE — DOM CONSTRUCTION
    // ========================================================================

    /** Builds the root flex container element. */
    private buildDOM(): void
    {
        this.rootEl = createElement("div", ["boxlayout"]);
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

        s.gap = this.resolveGap(this.options.gap);
        s.alignItems = ALIGN_MAP[this.options.align || "stretch"] || "stretch";
        s.justifyContent = JUSTIFY_MAP[this.options.justify || "start"] || "flex-start";

        if (this.options.padding) { s.padding = this.options.padding; }
        if (this.options.height) { s.height = this.options.height; }
        if (this.options.width) { s.width = this.options.width; }
    }

    /** Mounts all children from options.children. */
    private mountInitialChildren(): void
    {
        if (!this.options.children) { return; }

        for (const config of this.options.children)
        {
            const wrapper = this.buildChildWrapper(config);
            this.mountComponent(config.child, wrapper);
            this.childConfigs.push(config);
            this.childWrappers.push(wrapper);
            this.rootEl!.appendChild(wrapper);
        }
    }

    // ========================================================================
    // 9. PRIVATE — CHILD MOUNTING
    // ========================================================================

    /** Creates a flex wrapper element for a child with size constraints. */
    private buildChildWrapper(config: BoxLayoutChildConfig): HTMLElement
    {
        const wrap = createElement("div", ["boxlayout-child"]);
        const s = wrap.style;

        s.flexGrow = String(config.flex ?? 0);
        s.flexShrink = config.flex ? "1" : "0";
        s.flexBasis = config.flex ? "0" : "auto";

        this.applyChildConstraints(s, config);
        return wrap;
    }

    /** Applies min/max and alignSelf constraints to a child wrapper. */
    private applyChildConstraints(
        s: CSSStyleDeclaration, config: BoxLayoutChildConfig
    ): void
    {
        const axis = this.options.direction === "vertical"
            ? "Height" : "Width";

        if (config.minSize !== undefined)
        {
            (s as any)[`min${axis}`] = `${config.minSize}px`;
        }

        if (config.maxSize !== undefined)
        {
            (s as any)[`max${axis}`] = `${config.maxSize}px`;
        }

        if (config.alignSelf)
        {
            s.alignSelf = ALIGN_MAP[config.alignSelf] || "stretch";
        }
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
        config: BoxLayoutChildConfig,
        wrapper: HTMLElement,
        index: number
    ): void
    {
        const ref = this.childWrappers[index];
        this.rootEl!.insertBefore(wrapper, ref);
        this.childConfigs.splice(index, 0, config);
        this.childWrappers.splice(index, 0, wrapper);
    }

    /** Appends a wrapper at the end. */
    private appendChildAtEnd(
        config: BoxLayoutChildConfig,
        wrapper: HTMLElement
    ): void
    {
        this.rootEl!.appendChild(wrapper);
        this.childConfigs.push(config);
        this.childWrappers.push(wrapper);
    }

    /** Destroys all mounted children. */
    private destroyAllChildren(): void
    {
        for (const config of this.childConfigs)
        {
            this.unmountComponent(config.child);
        }

        this.childConfigs = [];
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
        if (!this.options.onLayoutChange || !this.visible) { return; }
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
                console.warn(`${LOG_PREFIX} Container not found:`, container);
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
 * Creates a BoxLayout, optionally mounts it in a container, and returns it.
 */
export function createBoxLayout(
    options: BoxLayoutOptions,
    containerId?: string
): BoxLayout
{
    const layout = new BoxLayout(options);

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
    w["BoxLayout"] = BoxLayout;
    w["createBoxLayout"] = createBoxLayout;
}
