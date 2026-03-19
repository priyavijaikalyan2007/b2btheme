/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: AnchorLayout
 * 📜 PURPOSE: Constraint-based layout container. Positions children by
 *    declaring anchor relationships between child edges and container
 *    edges. Children stretch or float based on anchoring rules.
 * 🔗 RELATES: [[EnterpriseTheme]], [[LayoutContainers]], [[LayerLayout]]
 * ⚡ FLOW: [Consumer App] -> [createAnchorLayout()] -> [CSS absolute positioning]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// 1. TYPES AND INTERFACES
// ============================================================================

/** Per-child anchor configuration for AnchorLayout. */
export interface AnchorChildConfig
{
    /** Child element or component (duck-typed). */
    child: HTMLElement | any;

    /** Offset from the top edge of the container (px or CSS value). */
    anchorTop?: number | string;

    /** Offset from the bottom edge of the container. */
    anchorBottom?: number | string;

    /** Offset from the left edge of the container. */
    anchorLeft?: number | string;

    /** Offset from the right edge of the container. */
    anchorRight?: number | string;

    /** Center horizontally with optional offset from center. */
    anchorCenterH?: number | string;

    /** Center vertically with optional offset from center. */
    anchorCenterV?: number | string;

    /** Minimum width constraint (px or CSS value). */
    minWidth?: number | string;

    /** Maximum width constraint (px or CSS value). */
    maxWidth?: number | string;

    /** Minimum height constraint (px or CSS value). */
    minHeight?: number | string;

    /** Maximum height constraint (px or CSS value). */
    maxHeight?: number | string;
}

/** Configuration options for AnchorLayout. */
export interface AnchorLayoutOptions
{
    /** Custom element ID. Auto-generated if omitted. */
    id?: string;

    /** Initial children with anchor constraints. */
    children?: AnchorChildConfig[];

    /** Container padding (CSS value). */
    padding?: string;

    /** Additional CSS classes on root element. */
    cssClass?: string;

    /** Height CSS value. */
    height?: string;

    /** Width CSS value. */
    width?: string;

    /** Fired on any layout change event. */
    onLayoutChange?: (state: AnchorLayoutState) => void;
}

/** Serialisable layout state snapshot. */
export interface AnchorLayoutState
{
    childCount: number;
}

// ============================================================================
// 2. CONSTANTS
// ============================================================================

const LOG_PREFIX = "[AnchorLayout]";
let instanceCounter = 0;

// ============================================================================
// 3. DOM HELPERS
// ============================================================================

/** Creates an HTML element with the given tag and CSS classes. */
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

/** Sets an attribute on an HTML element. */
function setAttr(
    el: HTMLElement, name: string, value: string
): void
{
    el.setAttribute(name, value);
}

// ============================================================================
// 4. INTERNAL CHILD RECORD
// ============================================================================

/** Tracks a mounted child and its wrapper element. */
interface ChildRecord
{
    config: AnchorChildConfig;
    wrapper: HTMLElement;
}

// ============================================================================
// 5. ANCHORLAYOUT CLASS
// ============================================================================

export class AnchorLayout
{
    private readonly instanceId: string;
    private readonly options: AnchorLayoutOptions;

    private visible = false;
    private contained = false;
    private rootEl: HTMLElement | null = null;

    private children: ChildRecord[] = [];

    private resizeObserver: ResizeObserver | null = null;

    constructor(options: AnchorLayoutOptions)
    {
        instanceCounter += 1;
        this.instanceId =
            options.id || `anchorlayout-${instanceCounter}`;
        this.options = { ...options };

        this.buildDOM();
        this.mountInitialChildren();

        console.log(
            `${LOG_PREFIX} Initialised:`, this.instanceId
        );
    }

    // ========================================================================
    // 6. PUBLIC — LIFECYCLE
    // ========================================================================

    /** Appends the layout to a container and makes it visible. */
    public show(container?: HTMLElement | string): void
    {
        if (this.visible)
        {
            console.warn(
                `${LOG_PREFIX} Already visible:`,
                this.instanceId
            );
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

        console.debug(
            `${LOG_PREFIX} Hidden:`, this.instanceId
        );
    }

    /** Removes from DOM, unhooks listeners, releases references. */
    public destroy(): void
    {
        this.teardownResizeObserver();
        this.destroyAllChildren();
        this.rootEl?.remove();
        this.rootEl = null;
        this.visible = false;

        console.debug(
            `${LOG_PREFIX} Destroyed:`, this.instanceId
        );
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
    // 7. PUBLIC — CHILD MANAGEMENT
    // ========================================================================

    /** Adds a child with anchor constraints. */
    public addChild(config: AnchorChildConfig): void
    {
        if (!this.rootEl) { return; }

        const wrapper = this.buildChildWrapper(config);
        this.mountComponent(config.child, wrapper);
        this.rootEl.appendChild(wrapper);
        this.children.push({ config, wrapper });

        this.fireOnLayoutChange();

        console.debug(
            `${LOG_PREFIX} Child added. Count:`,
            this.children.length
        );
    }

    /** Removes a child by index. */
    public removeChild(index: number): void
    {
        if (index < 0 || index >= this.children.length)
        {
            console.warn(
                `${LOG_PREFIX} Invalid child index:`, index
            );
            return;
        }

        const record = this.children[index];
        this.unmountComponent(record.config.child);
        record.wrapper.remove();
        this.children.splice(index, 1);

        this.fireOnLayoutChange();

        console.debug(
            `${LOG_PREFIX} Child removed at index:`, index
        );
    }

    /** Updates anchor constraints for an existing child. */
    public updateAnchors(
        index: number,
        anchors: Partial<AnchorChildConfig>
    ): void
    {
        if (index < 0 || index >= this.children.length)
        {
            console.warn(
                `${LOG_PREFIX} Invalid child index:`, index
            );
            return;
        }

        const record = this.children[index];
        this.mergeAnchors(record.config, anchors);
        this.resetWrapperStyles(record.wrapper);
        this.applyAnchors(record.wrapper.style, record.config);
        this.applySizeConstraints(
            record.wrapper.style, record.config
        );

        this.fireOnLayoutChange();
    }

    /** Returns the number of children. */
    public getChildCount(): number
    {
        return this.children.length;
    }

    // ========================================================================
    // 8. PUBLIC — STATE
    // ========================================================================

    /** Returns a serialisable state snapshot. */
    public getState(): AnchorLayoutState
    {
        return {
            childCount: this.children.length,
        };
    }

    /** Restores state from a snapshot. */
    public setState(_state: AnchorLayoutState): void
    {
        // AnchorLayout state is structural — child positions
        // are determined by anchor configs, not serialised state.
        // This method is provided for contract compatibility.
        console.debug(
            `${LOG_PREFIX} setState called — no-op for`,
            "AnchorLayout (anchors are config-driven)"
        );
    }

    // ========================================================================
    // 9. PRIVATE — DOM CONSTRUCTION
    // ========================================================================

    /** Builds the root container element with position: relative. */
    private buildDOM(): void
    {
        this.rootEl = createElement("div", ["anchorlayout"]);
        setAttr(this.rootEl, "id", this.instanceId);
        setAttr(this.rootEl, "role", "presentation");

        this.applyCssClass();
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

    /** Applies height, width, and padding to the root element. */
    private applySizeProps(): void
    {
        if (!this.rootEl) { return; }
        const s = this.rootEl.style;

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
            this.children.push({ config, wrapper });
            this.rootEl!.appendChild(wrapper);
        }
    }

    // ========================================================================
    // 10. PRIVATE — CHILD WRAPPER & ANCHORS
    // ========================================================================

    /** Creates an absolutely positioned wrapper with anchor styles. */
    private buildChildWrapper(
        config: AnchorChildConfig
    ): HTMLElement
    {
        const wrap = createElement(
            "div", ["anchorlayout-child"]
        );

        this.applyAnchors(wrap.style, config);
        this.applySizeConstraints(wrap.style, config);

        return wrap;
    }

    /** Sets all CSS positioning properties from anchor config. */
    private applyAnchors(
        style: CSSStyleDeclaration,
        config: AnchorChildConfig
    ): void
    {
        this.applyHorizontalAnchors(style, config);
        this.applyVerticalAnchors(style, config);
        this.applyCenterTransform(style, config);
    }

    /** Handles left/right/centerH positioning logic. */
    private applyHorizontalAnchors(
        style: CSSStyleDeclaration,
        config: AnchorChildConfig
    ): void
    {
        const hasCenterH = config.anchorCenterH !== undefined;

        if (hasCenterH)
        {
            this.applyCenterH(style, config.anchorCenterH!);
            return;
        }

        this.applyEdgeAnchorsH(style, config);
    }

    /** Applies centerH positioning — left: 50% with translateX. */
    private applyCenterH(
        style: CSSStyleDeclaration,
        offset: number | string
    ): void
    {
        style.left = "50%";

        const resolvedOffset = this.resolveOffset(offset);

        if (resolvedOffset !== "0px" && resolvedOffset !== "0")
        {
            style.marginLeft = resolvedOffset;
        }
    }

    /** Applies left and/or right edge anchors. */
    private applyEdgeAnchorsH(
        style: CSSStyleDeclaration,
        config: AnchorChildConfig
    ): void
    {
        if (config.anchorLeft !== undefined)
        {
            style.left = this.resolveOffset(config.anchorLeft);
        }

        if (config.anchorRight !== undefined)
        {
            style.right = this.resolveOffset(config.anchorRight);
        }
    }

    /** Handles top/bottom/centerV positioning logic. */
    private applyVerticalAnchors(
        style: CSSStyleDeclaration,
        config: AnchorChildConfig
    ): void
    {
        const hasCenterV = config.anchorCenterV !== undefined;

        if (hasCenterV)
        {
            this.applyCenterV(style, config.anchorCenterV!);
            return;
        }

        this.applyEdgeAnchorsV(style, config);
    }

    /** Applies centerV positioning — top: 50% with translateY. */
    private applyCenterV(
        style: CSSStyleDeclaration,
        offset: number | string
    ): void
    {
        style.top = "50%";

        const resolvedOffset = this.resolveOffset(offset);

        if (resolvedOffset !== "0px" && resolvedOffset !== "0")
        {
            style.marginTop = resolvedOffset;
        }
    }

    /** Applies top and/or bottom edge anchors. */
    private applyEdgeAnchorsV(
        style: CSSStyleDeclaration,
        config: AnchorChildConfig
    ): void
    {
        if (config.anchorTop !== undefined)
        {
            style.top = this.resolveOffset(config.anchorTop);
        }

        if (config.anchorBottom !== undefined)
        {
            style.bottom = this.resolveOffset(config.anchorBottom);
        }
    }

    /** Builds the CSS transform for center anchoring combinations. */
    private applyCenterTransform(
        style: CSSStyleDeclaration,
        config: AnchorChildConfig
    ): void
    {
        const hasCenterH = config.anchorCenterH !== undefined;
        const hasCenterV = config.anchorCenterV !== undefined;

        if (hasCenterH && hasCenterV)
        {
            style.transform = "translate(-50%, -50%)";
        }
        else if (hasCenterH)
        {
            style.transform = "translateX(-50%)";
        }
        else if (hasCenterV)
        {
            style.transform = "translateY(-50%)";
        }
    }

    /** Applies min/max width and height constraints. */
    private applySizeConstraints(
        style: CSSStyleDeclaration,
        config: AnchorChildConfig
    ): void
    {
        if (config.minWidth !== undefined)
        {
            style.minWidth = this.resolveOffset(config.minWidth);
        }

        if (config.maxWidth !== undefined)
        {
            style.maxWidth = this.resolveOffset(config.maxWidth);
        }

        if (config.minHeight !== undefined)
        {
            style.minHeight = this.resolveOffset(config.minHeight);
        }

        if (config.maxHeight !== undefined)
        {
            style.maxHeight = this.resolveOffset(config.maxHeight);
        }
    }

    /** Converts a numeric offset to "Xpx"; strings pass through. */
    private resolveOffset(value: number | string): string
    {
        if (typeof value === "number")
        {
            return `${value}px`;
        }

        return value;
    }

    /** Resets positioning styles before re-applying anchors. */
    private resetWrapperStyles(wrapper: HTMLElement): void
    {
        const s = wrapper.style;

        s.top = "";
        s.bottom = "";
        s.left = "";
        s.right = "";
        s.transform = "";
        s.marginLeft = "";
        s.marginTop = "";
        s.minWidth = "";
        s.maxWidth = "";
        s.minHeight = "";
        s.maxHeight = "";
    }

    /** Merges partial anchor updates into the existing config. */
    private mergeAnchors(
        target: AnchorChildConfig,
        source: Partial<AnchorChildConfig>
    ): void
    {
        this.mergeAnchorEdges(target, source);
        this.mergeAnchorCenters(target, source);
        this.mergeAnchorSizeConstraints(target, source);
    }

    /** Merges edge anchor properties (top/bottom/left/right). */
    private mergeAnchorEdges(
        target: AnchorChildConfig,
        source: Partial<AnchorChildConfig>
    ): void
    {
        const keys: (keyof AnchorChildConfig)[] =
            ["anchorTop", "anchorBottom", "anchorLeft", "anchorRight"];

        for (const key of keys)
        {
            if (source[key] !== undefined)
            {
                (target as any)[key] = source[key];
            }
        }
    }

    /** Merges center anchor properties. */
    private mergeAnchorCenters(
        target: AnchorChildConfig,
        source: Partial<AnchorChildConfig>
    ): void
    {
        const keys: (keyof AnchorChildConfig)[] =
            ["anchorCenterH", "anchorCenterV"];

        for (const key of keys)
        {
            if (source[key] !== undefined)
            {
                (target as any)[key] = source[key];
            }
        }
    }

    /** Merges size constraint properties. */
    private mergeAnchorSizeConstraints(
        target: AnchorChildConfig,
        source: Partial<AnchorChildConfig>
    ): void
    {
        const keys: (keyof AnchorChildConfig)[] =
            ["minWidth", "maxWidth", "minHeight", "maxHeight"];

        for (const key of keys)
        {
            if (source[key] !== undefined)
            {
                (target as any)[key] = source[key];
            }
        }
    }

    // ========================================================================
    // 11. PRIVATE — COMPONENT MOUNTING (DUCK-TYPED)
    // ========================================================================

    /** Mounts a component or HTMLElement into a wrapper cell. */
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

    /** Destroys all mounted children and clears the array. */
    private destroyAllChildren(): void
    {
        for (const record of this.children)
        {
            this.unmountComponent(record.config.child);
        }

        this.children = [];
    }

    // ========================================================================
    // 12. PRIVATE — RESIZE OBSERVATION
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
    // 13. PRIVATE — CALLBACKS & UTILITIES
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
                console.warn(
                    `${LOG_PREFIX} Container not found:`,
                    container
                );
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
 * Creates an AnchorLayout, optionally mounts it, and returns it.
 */
export function createAnchorLayout(
    options: AnchorLayoutOptions,
    containerId?: string
): AnchorLayout
{
    const layout = new AnchorLayout(options);

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
    w["AnchorLayout"] = AnchorLayout;
    w["createAnchorLayout"] = createAnchorLayout;
}
