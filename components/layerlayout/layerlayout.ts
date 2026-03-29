/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: LayerLayout
 * 📜 PURPOSE: Z-stack layout container. All children simultaneously visible,
 *    layered in z-order with configurable positioning.
 * 🔗 RELATES: [[EnterpriseTheme]], [[LayoutContainers]], [[CardLayout]]
 * ⚡ FLOW: [Consumer App] -> [createLayerLayout()] -> [CSS absolute positioning]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// 1. TYPES AND INTERFACES
// ============================================================================

/** Per-layer configuration for LayerLayout. */
export interface LayerConfig
{
    /** Child element or component (duck-typed). */
    child: HTMLElement | any;

    /** Optional string key for lookup. */
    key?: string;

    /** Anchor offsets from container edges (CSS values). */
    anchor?: {
        top?: string;
        right?: string;
        bottom?: string;
        left?: string;
    };

    /** Shorthand alignment within the container. */
    align?: "top-left" | "top-center" | "top-right"
        | "center-left" | "center" | "center-right"
        | "bottom-left" | "bottom-center" | "bottom-right";

    /** Explicit z-index for this layer. */
    zIndex?: number;

    /** If true, child fills the entire container. */
    fill?: boolean;
}

/** Configuration options for LayerLayout. */
export interface LayerLayoutOptions
{
    /** Custom element ID. Auto-generated if omitted. */
    id?: string;

    /** Sizing strategy: "largest" tracks the largest child,
     *  "fixed" uses explicit height/width, "fitContent" uses natural size. */
    sizing?: "largest" | "fixed" | "fitContent";

    /** Initial layers to mount (bottom-to-top order). */
    layers?: LayerConfig[];

    /** Container padding (CSS value). */
    padding?: string;

    /** Additional CSS class(es) on root element. */
    cssClass?: string;

    /** Explicit height (CSS value). Used with sizing: "fixed". */
    height?: string;

    /** Explicit width (CSS value). Used with sizing: "fixed". */
    width?: string;

    /** Fired on any layout change event. */
    onLayoutChange?: (state: LayerLayoutState) => void;
}

/** Serialisable layout state snapshot. */
export interface LayerLayoutState
{
    layerCount: number;
    sizing: string;
}

// ============================================================================
// 2. CONSTANTS
// ============================================================================

const LOG_PREFIX = "[LayerLayout]";
const _lu = (typeof (window as any).createLogUtility === "function") ? (window as any).createLogUtility().getLogger(LOG_PREFIX.slice(1, -1)) : null;
function logInfo(...a: unknown[]): void { _lu ? _lu.info(...a) : console.log(new Date().toISOString(), "[INFO]", LOG_PREFIX, ...a); }
function logWarn(...a: unknown[]): void { _lu ? _lu.warn(...a) : console.warn(new Date().toISOString(), "[WARN]", LOG_PREFIX, ...a); }
function logError(...a: unknown[]): void { _lu ? _lu.error(...a) : console.error(new Date().toISOString(), "[ERROR]", LOG_PREFIX, ...a); }
function logDebug(...a: unknown[]): void { _lu ? _lu.debug(...a) : console.debug(new Date().toISOString(), "[DEBUG]", LOG_PREFIX, ...a); }

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
// 4. ALIGNMENT POSITIONING MAP
// ============================================================================

/** Maps alignment shorthand to CSS inline styles for absolute positioning. */
const ALIGN_STYLES: Record<string, Record<string, string>> = {
    "top-left":      { top: "0", left: "0" },
    "top-center":    { top: "0", left: "50%", transform: "translateX(-50%)" },
    "top-right":     { top: "0", right: "0" },
    "center-left":   { top: "50%", left: "0", transform: "translateY(-50%)" },
    "center":        { top: "50%", left: "50%", transform: "translate(-50%, -50%)" },
    "center-right":  { top: "50%", right: "0", transform: "translateY(-50%)" },
    "bottom-left":   { bottom: "0", left: "0" },
    "bottom-center": { bottom: "0", left: "50%", transform: "translateX(-50%)" },
    "bottom-right":  { bottom: "0", right: "0" },
};

// ============================================================================
// 5. LAYERLAYOUT CLASS
// ============================================================================

/**
 * LayerLayout creates a position: relative container where all children
 * are simultaneously visible, layered in z-order using position: absolute.
 * Each layer can be aligned, anchored to edges, or set to fill the container.
 *
 * @example
 * const stack = new LayerLayout({
 *     sizing: "fixed",
 *     width: "100%",
 *     height: "400px",
 *     layers: [
 *         { child: backgroundImage, fill: true },
 *         { child: fabButton, align: "bottom-right", zIndex: 10 }
 *     ]
 * });
 * stack.show();
 */
export class LayerLayout
{
    private readonly instanceId: string;
    private readonly options: LayerLayoutOptions;

    private visible = false;
    private contained = false;
    private rootEl: HTMLElement | null = null;

    /** Tracked layers in insertion order (bottom-to-top). */
    private layers: Array<{ config: LayerConfig; wrapper: HTMLElement }> = [];

    private resizeObserver: ResizeObserver | null = null;

    constructor(options: LayerLayoutOptions)
    {
        instanceCounter += 1;
        this.instanceId = options.id || `layerlayout-${instanceCounter}`;
        this.options = { ...options };

        this.buildDOM();
        this.mountInitialLayers();

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
        this.destroyAllLayers();
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

    /** Sets or clears contained mode (fills parent instead of body). */
    public setContained(value: boolean): void
    {
        this.contained = value;
    }

    // ========================================================================
    // 7. PUBLIC -- LAYER MANAGEMENT
    // ========================================================================

    /**
     * Adds a new layer on top of the stack.
     *
     * @param config - Layer configuration
     */
    public addLayer(config: LayerConfig): void
    {
        if (!this.rootEl) { return; }

        const wrapper = this.buildLayerWrapper(config);
        this.mountComponent(config.child, wrapper);
        this.rootEl.appendChild(wrapper);
        this.layers.push({ config, wrapper });

        this.fireOnLayoutChange();

        logDebug("Layer added. Count:",
            this.layers.length
        );
    }

    /**
     * Removes a layer by its index position.
     *
     * @param index - Zero-based index of the layer to remove
     */
    public removeLayer(index: number): void
    {
        if (index < 0 || index >= this.layers.length) { return; }

        const entry = this.layers[index];
        this.unmountComponent(entry.config.child);
        entry.wrapper.remove();
        this.layers.splice(index, 1);

        this.fireOnLayoutChange();

        logDebug("Layer removed at index:", index);
    }

    /**
     * Removes a layer by its string key.
     *
     * @param key - The key value assigned to the layer
     */
    public removeLayerByKey(key: string): void
    {
        const index = this.layers.findIndex(
            (entry) => entry.config.key === key
        );

        if (index === -1)
        {
            logWarn("Layer key not found:", key);
            return;
        }

        this.removeLayer(index);
    }

    /**
     * Updates the z-index of a layer at the given index.
     *
     * @param index - Zero-based index of the layer
     * @param zIndex - New z-index value
     */
    public setLayerZIndex(index: number, zIndex: number): void
    {
        if (index < 0 || index >= this.layers.length) { return; }

        const entry = this.layers[index];
        entry.config.zIndex = zIndex;
        entry.wrapper.style.zIndex = String(zIndex);
    }

    /** Returns the number of layers currently mounted. */
    public getLayerCount(): number
    {
        return this.layers.length;
    }

    // ========================================================================
    // 8. PUBLIC -- STATE
    // ========================================================================

    /** Returns a serialisable state snapshot. */
    public getState(): LayerLayoutState
    {
        return {
            layerCount: this.layers.length,
            sizing: this.options.sizing || "fitContent",
        };
    }

    /**
     * Restores state from a snapshot (sizing only; layers must be
     * re-added programmatically).
     */
    public setState(state: LayerLayoutState): void
    {
        if (state.sizing)
        {
            this.options.sizing = state.sizing as
                "largest" | "fixed" | "fitContent";
        }
    }

    // ========================================================================
    // 9. PRIVATE -- DOM CONSTRUCTION
    // ========================================================================

    /** Builds the root relative-positioned container element. */
    private buildDOM(): void
    {
        this.rootEl = createElement("div", ["layerlayout"]);
        setAttr(this.rootEl, "id", this.instanceId);
        setAttr(this.rootEl, "role", "presentation");

        if (this.options.cssClass)
        {
            this.rootEl.classList.add(
                ...this.options.cssClass.split(" ")
            );
        }

        this.applySizing();
    }

    /** Applies sizing, padding, and dimension styles to the root. */
    private applySizing(): void
    {
        if (!this.rootEl) { return; }

        const s = this.rootEl.style;

        if (this.options.padding) { s.padding = this.options.padding; }
        if (this.options.height) { s.height = this.options.height; }
        if (this.options.width) { s.width = this.options.width; }
    }

    /** Mounts all layers from options.layers. */
    private mountInitialLayers(): void
    {
        if (!this.options.layers) { return; }

        for (const config of this.options.layers)
        {
            const wrapper = this.buildLayerWrapper(config);
            this.mountComponent(config.child, wrapper);
            this.layers.push({ config, wrapper });
            this.rootEl!.appendChild(wrapper);
        }
    }

    // ========================================================================
    // 10. PRIVATE -- LAYER WRAPPER CONSTRUCTION
    // ========================================================================

    /**
     * Creates an absolutely-positioned wrapper element for a single layer.
     * Applies fill, anchor, or alignment positioning based on config.
     *
     * @param config - The layer configuration
     * @returns The wrapper element with positioning styles applied
     */
    private buildLayerWrapper(config: LayerConfig): HTMLElement
    {
        const wrap = createElement("div", ["layerlayout-layer"]);

        if (config.fill)
        {
            this.applyFillStyles(wrap);
        }
        else if (config.anchor)
        {
            this.applyAnchorStyles(wrap, config.anchor);
        }
        else if (config.align)
        {
            this.applyAlignStyles(wrap, config.align);
        }

        if (config.zIndex !== undefined)
        {
            wrap.style.zIndex = String(config.zIndex);
        }

        return wrap;
    }

    /** Sets fill positioning: stretch to all four edges. */
    private applyFillStyles(wrap: HTMLElement): void
    {
        wrap.style.top = "0";
        wrap.style.right = "0";
        wrap.style.bottom = "0";
        wrap.style.left = "0";
    }

    /** Sets anchor positioning from individual edge offsets. */
    private applyAnchorStyles(
        wrap: HTMLElement,
        anchor: NonNullable<LayerConfig["anchor"]>
    ): void
    {
        if (anchor.top !== undefined)    { wrap.style.top = anchor.top; }
        if (anchor.right !== undefined)  { wrap.style.right = anchor.right; }
        if (anchor.bottom !== undefined) { wrap.style.bottom = anchor.bottom; }
        if (anchor.left !== undefined)   { wrap.style.left = anchor.left; }
    }

    /** Applies alignment shorthand as CSS position + transform. */
    private applyAlignStyles(
        wrap: HTMLElement, align: string
    ): void
    {
        const styles = ALIGN_STYLES[align];

        if (!styles)
        {
            logWarn("Unknown alignment:", align);
            return;
        }

        for (const [prop, value] of Object.entries(styles))
        {
            (wrap.style as any)[prop] = value;
        }
    }

    // ========================================================================
    // 11. PRIVATE -- CHILD MOUNTING (DUCK-TYPED)
    // ========================================================================

    /**
     * Mounts a component or HTMLElement into a wrapper cell.
     * Uses duck-typing: calls setContained, hide/show, getRootElement,
     * or falls back to direct appendChild.
     */
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

    /**
     * Calls destroy or removes the element from a child.
     * Mirrors mountComponent in duck-typing approach.
     */
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

    /** Destroys all mounted layers and clears the tracking array. */
    private destroyAllLayers(): void
    {
        for (const entry of this.layers)
        {
            this.unmountComponent(entry.config.child);
        }

        this.layers = [];
    }

    // ========================================================================
    // 12. PRIVATE -- RESIZE OBSERVATION
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
    // 13. PRIVATE -- CALLBACKS & UTILITIES
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
                logWarn("Container not found:", container);
                return document.body;
            }

            return el;
        }

        return container;
    }
}

// ============================================================================
// 14. CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Creates a LayerLayout, optionally mounts it in a container, and returns it.
 *
 * @param options - Layout configuration
 * @param containerId - Optional container element ID
 * @returns The created LayerLayout instance
 */
export function createLayerLayout(
    options: LayerLayoutOptions,
    containerId?: string
): LayerLayout
{
    const layout = new LayerLayout(options);

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
// 15. GLOBAL EXPORTS
// ============================================================================

if (typeof window !== "undefined")
{
    const w = window as unknown as Record<string, unknown>;
    w["LayerLayout"] = LayerLayout;
    w["createLayerLayout"] = createLayerLayout;
}
