/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: SplitLayout
 * 📜 PURPOSE: A draggable, resizable split pane container with nested layout
 *             support. Divides space into N panes with pointer-capture drag.
 * 🔗 RELATES: [[EnterpriseTheme]], [[SplitLayoutSpec]]
 * ⚡ FLOW: [Consumer App] -> [createSplitLayout()] -> [CSS Flex Layout]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// CONSTANTS
// ============================================================================

/** Log prefix for all console messages from this component. */
const LOG_PREFIX = "[SplitLayout]";

/** Default divider thickness in pixels. */
const DEFAULT_DIVIDER_SIZE = 4;

/** Default minimum pane size in pixels. */
const DEFAULT_MIN_SIZE = 50;

/** Keyboard resize step in pixels. */
const KEYBOARD_STEP = 10;

/** Collapse animation duration in ms. */
const COLLAPSE_DURATION = 200;

/** Instance counter for unique IDs. */
let instanceCounter = 0;

const DEFAULT_KEY_BINDINGS: Record<string, string> = {
    resizeLeft: "ArrowLeft",
    resizeRight: "ArrowRight",
    resizeUp: "ArrowUp",
    resizeDown: "ArrowDown",
    collapseStart: "Home",
    collapseEnd: "End",
    toggleCollapse: "Enter",
};

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Configuration for a single pane within the split layout.
 */
export interface SplitPaneConfig
{
    /** Unique identifier for this pane. */
    id: string;

    /** Optional content element to place inside the pane. */
    content?: HTMLElement;

    /** Initial size: number (px), string ("30%"), or "1fr". */
    initialSize?: number | string;

    /** Minimum pane size in pixels. */
    minSize?: number;

    /** Maximum pane size in pixels. */
    maxSize?: number;

    /** Whether the pane can be collapsed. */
    collapsible?: boolean;

    /** Whether the pane starts collapsed. */
    collapsed?: boolean;
}

/**
 * Configuration for the split layout container.
 */
export interface SplitLayoutOptions
{
    /** Split direction: side-by-side or stacked. */
    orientation: "horizontal" | "vertical";

    /** Pane definitions, in order. Minimum two required. */
    panes: SplitPaneConfig[];

    /** Divider thickness in pixels. */
    dividerSize?: number;

    /** Visual style of the divider. */
    dividerStyle?: "line" | "dots" | "handle";

    /** CSS colour for the divider. */
    gutterColor?: string;

    /** Called during and after resize with current pane sizes. */
    onResize?: (sizes: Record<string, number>) => void;

    /** Called when a pane is collapsed or expanded. */
    onCollapse?: (paneId: string, collapsed: boolean) => void;

    /** Called when a divider is double-clicked. */
    onDividerDblClick?: (paneId: string) => void;

    /** Additional CSS class(es) for the root element. */
    cssClass?: string;

    /** localStorage key for automatic size persistence. */
    persistKey?: string;

    /** Override default key combos. Keys are action names, values are combo strings. */
    keyBindings?: Partial<Record<string, string>>;
}

/**
 * Serialisable snapshot of the layout state.
 */
export interface SplitLayoutState
{
    /** Orientation at time of capture. */
    orientation: "horizontal" | "vertical";

    /** Pane sizes in pixels, keyed by pane ID. */
    sizes: Record<string, number>;

    /** Collapsed state per pane, keyed by pane ID. */
    collapsed: Record<string, boolean>;
}

// ============================================================================
// INTERNAL TYPES
// ============================================================================

/** Tracks runtime state for a single pane. */
interface PaneState
{
    config: SplitPaneConfig;
    element: HTMLElement;
    size: number;
    collapsed: boolean;
    preCollapseSize: number;
}

// ============================================================================
// PRIVATE HELPERS
// ============================================================================

/**
 * Creates an HTML element with optional classes.
 */
function createElement(
    tag: string,
    classes: string[]): HTMLElement
{
    const el = document.createElement(tag);

    if (classes.length > 0)
    {
        el.classList.add(...classes);
    }

    return el;
}

/**
 * Sets an attribute on an element.
 */
function setAttr(el: HTMLElement, name: string, value: string): void
{
    el.setAttribute(name, value);
}

/**
 * Clamps a value between min and max.
 */
function clamp(value: number, min: number, max: number): number
{
    return Math.max(min, Math.min(max, value));
}

// ============================================================================
// CLASS: SplitLayout
// ============================================================================

/**
 * A resizable split pane container that divides space into two or more panes
 * separated by draggable dividers. Supports horizontal/vertical orientation,
 * pane collapsing, nested layouts, and state persistence.
 *
 * @example
 * const layout = createSplitLayout({
 *     orientation: "horizontal",
 *     panes: [
 *         { id: "left", initialSize: "30%", minSize: 200 },
 *         { id: "center", initialSize: "1fr" },
 *         { id: "right", initialSize: 300, collapsible: true }
 *     ],
 *     onResize: (sizes) => console.log("Sizes:", sizes)
 * });
 */
export class SplitLayout
{
    private readonly instanceId!: string;
    private readonly options!: SplitLayoutOptions;
    private orientation!: "horizontal" | "vertical";
    private readonly dividerSize!: number;

    // State
    private panes: PaneState[] = [];
    private dividers: HTMLElement[] = [];

    // DOM
    private rootEl: HTMLElement | null = null;

    // Drag state
    private activeDividerIndex = -1;
    private dragStartPos = 0;
    private dragStartSizeA = 0;
    private dragStartSizeB = 0;

    constructor(options: SplitLayoutOptions)
    {
        if (options.panes.length < 2)
        {
            console.error(LOG_PREFIX, "At least two panes are required");
            return;
        }

        instanceCounter++;
        this.instanceId = `splitlayout-${instanceCounter}`;
        this.options = options;
        this.orientation = options.orientation;
        this.dividerSize = options.dividerSize ?? DEFAULT_DIVIDER_SIZE;

        this.rootEl = this.buildRoot();

        // Restore persisted state if available
        this.restorePersistedState();

        console.log(LOG_PREFIX, "Initialised:", this.instanceId);
        console.debug(LOG_PREFIX, "Panes:", options.panes.length,
            "Orientation:", this.orientation);
    }

    // ========================================================================
    // DOM CONSTRUCTION
    // ========================================================================

    /**
     * Builds the root flex container with panes and dividers.
     */
    private buildRoot(): HTMLElement
    {
        const orientClass = this.orientation === "horizontal"
            ? "splitlayout-horizontal"
            : "splitlayout-vertical";

        const root = createElement("div", ["splitlayout", orientClass]);
        setAttr(root, "id", this.instanceId);

        if (this.options.cssClass)
        {
            root.classList.add(...this.options.cssClass.split(" "));
        }

        // Build panes and dividers
        for (let i = 0; i < this.options.panes.length; i++)
        {
            const config = this.options.panes[i];
            const paneEl = this.buildPane(config);

            const state: PaneState = {
                config,
                element: paneEl,
                size: 0,
                collapsed: config.collapsed ?? false,
                preCollapseSize: 0,
            };

            this.panes.push(state);
            root.appendChild(paneEl);

            // Add divider between panes (not after the last)
            if (i < this.options.panes.length - 1)
            {
                const divider = this.buildDivider(i);
                this.dividers.push(divider);
                root.appendChild(divider);
            }
        }

        return root;
    }

    /**
     * Builds a single pane element.
     */
    private buildPane(config: SplitPaneConfig): HTMLElement
    {
        const pane = createElement("div", ["splitlayout-pane"]);
        setAttr(pane, "data-pane-id", config.id);
        setAttr(pane, "role", "region");
        setAttr(pane, "aria-label", config.id);

        if (config.content)
        {
            pane.appendChild(config.content);
        }

        return pane;
    }

    /**
     * Builds a divider between two panes.
     */
    private buildDivider(index: number): HTMLElement
    {
        const orientClass = this.orientation === "horizontal"
            ? "splitlayout-divider-horizontal"
            : "splitlayout-divider-vertical";

        const styleClass = `splitlayout-divider-${this.options.dividerStyle ?? "line"}`;

        const div = createElement("div", [
            "splitlayout-divider", orientClass, styleClass
        ]);

        this.applyDividerSize(div);
        this.applyDividerAria(div, index);

        if (this.options.gutterColor)
        {
            div.style.backgroundColor = this.options.gutterColor;
        }

        // Pointer-capture drag events
        div.addEventListener("pointerdown", (e) => this.onDividerPointerDown(e, index));
        div.addEventListener("pointermove", (e) => this.onDividerPointerMove(e));
        div.addEventListener("pointerup", (e) => this.onDividerPointerUp(e));

        // Keyboard events
        div.addEventListener("keydown", (e) => this.onDividerKeyDown(e, index));

        // Double-click to collapse
        div.addEventListener("dblclick", () => this.onDividerDblClick(index));

        return div;
    }

    /**
     * Sets width or height on a divider element.
     */
    private applyDividerSize(div: HTMLElement): void
    {
        if (this.orientation === "horizontal")
        {
            div.style.width = `${this.dividerSize}px`;
            div.style.minWidth = `${this.dividerSize}px`;
        }
        else
        {
            div.style.height = `${this.dividerSize}px`;
            div.style.minHeight = `${this.dividerSize}px`;
        }
    }

    /**
     * Applies ARIA attributes to a divider.
     */
    private applyDividerAria(div: HTMLElement, index: number): void
    {
        setAttr(div, "role", "separator");
        setAttr(div, "tabindex", "0");

        // aria-orientation is opposite of layout orientation
        const ariaOrient = this.orientation === "horizontal"
            ? "vertical" : "horizontal";
        setAttr(div, "aria-orientation", ariaOrient);

        const leftId = this.options.panes[index].id;
        const rightId = this.options.panes[index + 1].id;
        setAttr(div, "aria-label",
            `Resize between ${leftId} and ${rightId}`);
    }

    // ========================================================================
    // SIZE CALCULATION
    // ========================================================================

    /**
     * Calculates initial pane sizes from config and container dimensions.
     */
    private calculateInitialSizes(): void
    {
        if (!this.rootEl)
        {
            return;
        }

        const totalDividers = this.dividers.length * this.dividerSize;
        const containerSize = this.getContainerSize() - totalDividers;

        if (containerSize <= 0)
        {
            console.warn(LOG_PREFIX, "Container size is zero; deferring layout");
            return;
        }

        let remaining = containerSize;
        let frCount = 0;

        // First pass: resolve fixed and percentage sizes
        for (const pane of this.panes)
        {
            if (pane.collapsed)
            {
                pane.size = 0;
                continue;
            }

            const init = pane.config.initialSize;

            if (typeof init === "number")
            {
                pane.size = init;
                remaining -= init;
            }
            else if (typeof init === "string" && init.endsWith("%"))
            {
                const pct = parseFloat(init) / 100;
                pane.size = Math.round(containerSize * pct);
                remaining -= pane.size;
            }
            else if (typeof init === "string" && init.endsWith("fr"))
            {
                frCount += parseFloat(init) || 1;
                pane.size = 0;
            }
            else
            {
                // No size specified — treat as 1fr
                frCount += 1;
                pane.size = 0;
            }
        }

        // Second pass: distribute remaining space to fr panes
        if (frCount > 0 && remaining > 0)
        {
            this.distributeFrSpace(remaining, frCount);
        }

        // Apply min/max constraints
        this.applyConstraints();

        // Apply sizes to DOM
        this.applySizesToDom();
    }

    /**
     * Distributes remaining space to fractional panes.
     */
    private distributeFrSpace(remaining: number, frCount: number): void
    {
        const perFr = remaining / frCount;

        for (const pane of this.panes)
        {
            if (pane.collapsed)
            {
                continue;
            }

            const init = pane.config.initialSize;

            if (typeof init === "string" && init.endsWith("fr"))
            {
                pane.size = Math.round(perFr * (parseFloat(init) || 1));
            }
            else if (init === undefined && pane.size === 0)
            {
                pane.size = Math.round(perFr);
            }
        }
    }

    /**
     * Clamps all pane sizes to their min/max constraints.
     */
    private applyConstraints(): void
    {
        for (const pane of this.panes)
        {
            if (pane.collapsed)
            {
                continue;
            }

            const min = pane.config.minSize ?? DEFAULT_MIN_SIZE;
            const max = pane.config.maxSize ?? Infinity;
            pane.size = clamp(pane.size, min, max);
        }
    }

    /**
     * Returns the container size along the split axis.
     */
    private getContainerSize(): number
    {
        if (!this.rootEl)
        {
            return 0;
        }

        return this.orientation === "horizontal"
            ? this.rootEl.clientWidth
            : this.rootEl.clientHeight;
    }

    /**
     * Applies current pane sizes to DOM flex-basis.
     */
    private applySizesToDom(): void
    {
        for (const pane of this.panes)
        {
            const prop = this.orientation === "horizontal" ? "width" : "height";
            pane.element.style.flexBasis = `${pane.size}px`;
            pane.element.style.flexGrow = "0";
            pane.element.style.flexShrink = "0";

            if (pane.collapsed)
            {
                pane.element.classList.add("splitlayout-pane-collapsed");
                pane.element.style.flexBasis = "0px";
            }
            else
            {
                pane.element.classList.remove("splitlayout-pane-collapsed");
            }
        }

        // Update divider ARIA values
        this.updateDividerAria();
    }

    /**
     * Updates ARIA valuenow/min/max on all dividers.
     */
    private updateDividerAria(): void
    {
        let position = 0;

        for (let i = 0; i < this.dividers.length; i++)
        {
            position += this.panes[i].size;

            const paneA = this.panes[i];
            const paneB = this.panes[i + 1];
            const minA = paneA.config.minSize ?? DEFAULT_MIN_SIZE;
            const minB = paneB.config.minSize ?? DEFAULT_MIN_SIZE;

            setAttr(this.dividers[i], "aria-valuenow", String(Math.round(position)));
            setAttr(this.dividers[i], "aria-valuemin", String(minA));
            setAttr(this.dividers[i], "aria-valuemax",
                String(Math.round(position + paneB.size - minB)));
        }
    }

    // ========================================================================
    // POINTER-CAPTURE DRAG
    // ========================================================================

    /**
     * Begins drag on a divider.
     */
    private onDividerPointerDown(e: PointerEvent, index: number): void
    {
        e.preventDefault();

        const divider = this.dividers[index];
        divider.setPointerCapture(e.pointerId);
        divider.classList.add("splitlayout-divider-active");

        this.activeDividerIndex = index;
        this.dragStartPos = this.orientation === "horizontal" ? e.clientX : e.clientY;
        this.dragStartSizeA = this.panes[index].size;
        this.dragStartSizeB = this.panes[index + 1].size;
    }

    /**
     * Updates pane sizes during drag.
     */
    private onDividerPointerMove(e: PointerEvent): void
    {
        if (this.activeDividerIndex < 0)
        {
            return;
        }

        const currentPos = this.orientation === "horizontal" ? e.clientX : e.clientY;
        const delta = currentPos - this.dragStartPos;

        this.applyDelta(this.activeDividerIndex, delta);
    }

    /**
     * Ends drag and persists state.
     */
    private onDividerPointerUp(e: PointerEvent): void
    {
        if (this.activeDividerIndex < 0)
        {
            return;
        }

        const divider = this.dividers[this.activeDividerIndex];
        divider.releasePointerCapture(e.pointerId);
        divider.classList.remove("splitlayout-divider-active");

        this.activeDividerIndex = -1;
        this.fireOnResize();
        this.persistState();
    }

    /**
     * Applies a pixel delta to two adjacent panes.
     */
    private applyDelta(dividerIndex: number, delta: number): void
    {
        const paneA = this.panes[dividerIndex];
        const paneB = this.panes[dividerIndex + 1];

        const minA = paneA.config.minSize ?? DEFAULT_MIN_SIZE;
        const maxA = paneA.config.maxSize ?? Infinity;
        const minB = paneB.config.minSize ?? DEFAULT_MIN_SIZE;
        const maxB = paneB.config.maxSize ?? Infinity;

        let newA = this.dragStartSizeA + delta;
        let newB = this.dragStartSizeB - delta;

        // Clamp both panes
        newA = clamp(newA, minA, maxA);
        newB = clamp(newB, minB, maxB);

        // Re-derive delta after clamping
        const totalBefore = this.dragStartSizeA + this.dragStartSizeB;
        const totalAfter = newA + newB;

        if (totalAfter !== totalBefore)
        {
            // Redistribute — preserve total
            if (newA + minB > totalBefore)
            {
                newA = totalBefore - minB;
            }

            newB = totalBefore - newA;
        }

        paneA.size = newA;
        paneB.size = newB;

        this.applySizesToDom();
    }

    // ========================================================================
    // KEY BINDING HELPERS
    // ========================================================================

    private resolveKeyCombo(action: string): string
    {
        return this.options.keyBindings?.[action]
            ?? DEFAULT_KEY_BINDINGS[action] ?? "";
    }

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
    // KEYBOARD HANDLING
    // ========================================================================

    /**
     * Handles keyboard events on a focused divider.
     */
    private onDividerKeyDown(e: KeyboardEvent, index: number): void
    {
        const delta = this.resizeDeltaFromKey(e);

        if (delta !== 0)
        {
            e.preventDefault();
            this.dragStartSizeA = this.panes[index].size;
            this.dragStartSizeB = this.panes[index + 1].size;
            this.applyDelta(index, delta);
            this.fireOnResize();
            this.persistState();
            return;
        }

        this.handleDividerAction(e, index);
    }

    /**
     * Returns the resize delta for arrow key combos, or 0.
     */
    private resizeDeltaFromKey(e: KeyboardEvent): number
    {
        const isHoriz = this.orientation === "horizontal";
        if (this.matchesKeyCombo(e, "resizeLeft") && isHoriz)
        {
            return -KEYBOARD_STEP;
        }
        if (this.matchesKeyCombo(e, "resizeRight") && isHoriz)
        {
            return KEYBOARD_STEP;
        }
        if (this.matchesKeyCombo(e, "resizeUp") && !isHoriz)
        {
            return -KEYBOARD_STEP;
        }
        if (this.matchesKeyCombo(e, "resizeDown") && !isHoriz)
        {
            return KEYBOARD_STEP;
        }
        return 0;
    }

    /**
     * Handles collapse/toggle actions on a divider.
     */
    private handleDividerAction(
        e: KeyboardEvent, index: number
    ): void
    {
        if (this.matchesKeyCombo(e, "collapseStart"))
        {
            this.handleHomeEnd(index, "start");
            e.preventDefault();
        }
        else if (this.matchesKeyCombo(e, "collapseEnd"))
        {
            this.handleHomeEnd(index, "end");
            e.preventDefault();
        }
        else if (this.matchesKeyCombo(e, "toggleCollapse"))
        {
            this.onDividerDblClick(index);
            e.preventDefault();
        }
    }

    /**
     * Handles Home/End key to collapse a pane.
     */
    private handleHomeEnd(
        index: number,
        direction: "start" | "end"): void
    {
        const paneIndex = direction === "start" ? index : index + 1;
        const pane = this.panes[paneIndex];

        if (pane.config.collapsible)
        {
            this.togglePaneInternal(paneIndex);
        }
    }

    // ========================================================================
    // DOUBLE-CLICK COLLAPSE
    // ========================================================================

    /**
     * Handles double-click on a divider to collapse the smaller pane.
     */
    private onDividerDblClick(index: number): void
    {
        const paneA = this.panes[index];
        const paneB = this.panes[index + 1];

        // Choose the smaller pane (prefer the one that is collapsible)
        let target: PaneState;

        if (paneA.config.collapsible && !paneB.config.collapsible)
        {
            target = paneA;
        }
        else if (paneB.config.collapsible && !paneA.config.collapsible)
        {
            target = paneB;
        }
        else if (paneA.config.collapsible && paneB.config.collapsible)
        {
            target = paneA.size <= paneB.size ? paneA : paneB;
        }
        else
        {
            return;
        }

        const targetIndex = this.panes.indexOf(target);

        if (this.options.onDividerDblClick)
        {
            this.options.onDividerDblClick(target.config.id);
        }

        this.togglePaneInternal(targetIndex);
    }

    /**
     * Toggles a pane between collapsed and expanded.
     */
    private togglePaneInternal(paneIndex: number): void
    {
        const pane = this.panes[paneIndex];

        if (pane.collapsed)
        {
            this.expandPaneInternal(paneIndex);
        }
        else
        {
            this.collapsePaneInternal(paneIndex);
        }
    }

    /**
     * Collapses a pane, distributing its space to the neighbour.
     */
    private collapsePaneInternal(paneIndex: number): void
    {
        const pane = this.panes[paneIndex];

        if (pane.collapsed)
        {
            return;
        }

        pane.preCollapseSize = pane.size;

        // Find neighbour to absorb space
        const neighbour = this.findNeighbour(paneIndex);

        if (neighbour)
        {
            neighbour.size += pane.size;
        }

        pane.size = 0;
        pane.collapsed = true;

        this.applySizesToDom();
        this.fireOnCollapse(pane.config.id, true);
        this.persistState();

        console.debug(LOG_PREFIX, "Collapsed pane:", pane.config.id);
    }

    /**
     * Expands a previously collapsed pane.
     */
    private expandPaneInternal(paneIndex: number): void
    {
        const pane = this.panes[paneIndex];

        if (!pane.collapsed)
        {
            return;
        }

        const restoreSize = pane.preCollapseSize || (pane.config.minSize ?? DEFAULT_MIN_SIZE);
        const neighbour = this.findNeighbour(paneIndex);

        if (neighbour)
        {
            const minNeighbour = neighbour.config.minSize ?? DEFAULT_MIN_SIZE;
            const available = neighbour.size - minNeighbour;
            const actual = Math.min(restoreSize, available);

            neighbour.size -= actual;
            pane.size = actual;
        }
        else
        {
            pane.size = restoreSize;
        }

        pane.collapsed = false;

        this.applySizesToDom();
        this.fireOnCollapse(pane.config.id, false);
        this.persistState();

        console.debug(LOG_PREFIX, "Expanded pane:", pane.config.id);
    }

    /**
     * Finds the best non-collapsed neighbour for a pane.
     */
    private findNeighbour(paneIndex: number): PaneState | null
    {
        // Prefer the pane after, then before
        for (let i = paneIndex + 1; i < this.panes.length; i++)
        {
            if (!this.panes[i].collapsed)
            {
                return this.panes[i];
            }
        }

        for (let i = paneIndex - 1; i >= 0; i--)
        {
            if (!this.panes[i].collapsed)
            {
                return this.panes[i];
            }
        }

        return null;
    }

    // ========================================================================
    // CALLBACKS & PERSISTENCE
    // ========================================================================

    /**
     * Fires the onResize callback with current sizes.
     */
    private fireOnResize(): void
    {
        if (this.options.onResize)
        {
            this.options.onResize(this.getSizes());
        }
    }

    /**
     * Fires the onCollapse callback.
     */
    private fireOnCollapse(paneId: string, collapsed: boolean): void
    {
        if (this.options.onCollapse)
        {
            this.options.onCollapse(paneId, collapsed);
        }
    }

    /**
     * Persists state to localStorage if persistKey is set.
     */
    private persistState(): void
    {
        if (!this.options.persistKey)
        {
            return;
        }

        try
        {
            const state = this.getState();
            localStorage.setItem(this.options.persistKey, JSON.stringify(state));
        }
        catch (err)
        {
            console.warn(LOG_PREFIX, "Failed to persist state:", err);
        }
    }

    /**
     * Restores persisted state from localStorage.
     */
    private restorePersistedState(): void
    {
        if (!this.options.persistKey)
        {
            return;
        }

        try
        {
            const raw = localStorage.getItem(this.options.persistKey);

            if (!raw)
            {
                return;
            }

            const state = JSON.parse(raw) as SplitLayoutState;
            this.applyStateInternal(state);

            console.debug(LOG_PREFIX, "Restored persisted state");
        }
        catch (err)
        {
            console.warn(LOG_PREFIX, "Failed to restore persisted state:", err);
        }
    }

    /**
     * Applies a state object to the current panes.
     */
    private applyStateInternal(state: SplitLayoutState): void
    {
        for (const pane of this.panes)
        {
            const id = pane.config.id;

            if (state.sizes[id] !== undefined)
            {
                pane.size = state.sizes[id];
            }

            if (state.collapsed[id] !== undefined)
            {
                pane.collapsed = state.collapsed[id];

                if (pane.collapsed)
                {
                    pane.preCollapseSize = pane.size;
                    pane.size = 0;
                }
            }
        }
    }

    // ========================================================================
    // PUBLIC API
    // ========================================================================

    // @entrypoint

    /**
     * Appends the layout to a container element.
     */
    public show(containerId?: string): void
    {
        const container = containerId
            ? document.getElementById(containerId)
            : document.body;

        if (!container)
        {
            console.error(LOG_PREFIX, "Container not found:", containerId);
            return;
        }

        if (this.rootEl)
        {
            container.appendChild(this.rootEl);

            // Calculate sizes after DOM attachment (needs dimensions)
            requestAnimationFrame(() => this.calculateInitialSizes());

            console.log(LOG_PREFIX, "Shown in container:", containerId ?? "body");
        }
    }

    /**
     * Removes the layout from the DOM without destroying state.
     */
    public hide(): void
    {
        this.persistState();

        if (this.rootEl && this.rootEl.parentNode)
        {
            this.rootEl.parentNode.removeChild(this.rootEl);
            console.debug(LOG_PREFIX, "Hidden");
        }
    }

    /**
     * Hides, releases all listeners, and nulls all references.
     */
    public destroy(): void
    {
        this.hide();
        this.panes = [];
        this.dividers = [];
        this.rootEl = null;

        console.log(LOG_PREFIX, "Destroyed:", this.instanceId);
    }

    /**
     * Returns the root DOM element.
     */
    public getElement(): HTMLElement | null
    {
        return this.rootEl;
    }

    /**
     * Returns the content div for the given pane.
     */
    public getPaneElement(paneId: string): HTMLElement | null
    {
        const pane = this.panes.find((p) => p.config.id === paneId);

        return pane ? pane.element : null;
    }

    /**
     * Replaces the content of a pane with the given element.
     */
    public setPaneContent(paneId: string, element: HTMLElement): void
    {
        const pane = this.panes.find((p) => p.config.id === paneId);

        if (!pane)
        {
            console.warn(LOG_PREFIX, "Pane not found:", paneId);
            return;
        }

        pane.element.replaceChildren(element);
    }

    /**
     * Collapses a pane to zero visible size.
     */
    public collapsePane(paneId: string): void
    {
        const index = this.panes.findIndex((p) => p.config.id === paneId);

        if (index < 0)
        {
            console.warn(LOG_PREFIX, "Pane not found:", paneId);
            return;
        }

        if (!this.panes[index].config.collapsible)
        {
            console.warn(LOG_PREFIX, "Pane is not collapsible:", paneId);
            return;
        }

        this.collapsePaneInternal(index);
    }

    /**
     * Expands a previously collapsed pane.
     */
    public expandPane(paneId: string): void
    {
        const index = this.panes.findIndex((p) => p.config.id === paneId);

        if (index < 0)
        {
            console.warn(LOG_PREFIX, "Pane not found:", paneId);
            return;
        }

        this.expandPaneInternal(index);
    }

    /**
     * Toggles a pane between collapsed and expanded.
     */
    public togglePane(paneId: string): void
    {
        const index = this.panes.findIndex((p) => p.config.id === paneId);

        if (index < 0)
        {
            console.warn(LOG_PREFIX, "Pane not found:", paneId);
            return;
        }

        this.togglePaneInternal(index);
    }

    /**
     * Returns current pane sizes as Record<string, number> in pixels.
     */
    public getSizes(): Record<string, number>
    {
        const sizes: Record<string, number> = {};

        for (const pane of this.panes)
        {
            sizes[pane.config.id] = Math.round(pane.size);
        }

        return sizes;
    }

    /**
     * Applies pane sizes from a Record. Clamped to min/max.
     */
    public setSizes(sizes: Record<string, number>): void
    {
        for (const pane of this.panes)
        {
            const id = pane.config.id;

            if (sizes[id] !== undefined)
            {
                const min = pane.config.minSize ?? DEFAULT_MIN_SIZE;
                const max = pane.config.maxSize ?? Infinity;
                pane.size = clamp(sizes[id], min, max);
                pane.collapsed = false;
            }
        }

        this.applySizesToDom();
        this.fireOnResize();
        this.persistState();
    }

    /**
     * Switches between horizontal and vertical orientation.
     */
    public setOrientation(dir: "horizontal" | "vertical"): void
    {
        if (dir === this.orientation)
        {
            return;
        }

        this.orientation = dir;

        if (this.rootEl)
        {
            this.rootEl.classList.remove(
                "splitlayout-horizontal",
                "splitlayout-vertical"
            );
            this.rootEl.classList.add(
                dir === "horizontal"
                    ? "splitlayout-horizontal"
                    : "splitlayout-vertical"
            );
        }

        // Update divider classes and sizes
        for (let i = 0; i < this.dividers.length; i++)
        {
            const div = this.dividers[i];
            div.classList.remove(
                "splitlayout-divider-horizontal",
                "splitlayout-divider-vertical"
            );
            div.classList.add(
                dir === "horizontal"
                    ? "splitlayout-divider-horizontal"
                    : "splitlayout-divider-vertical"
            );

            // Reset inline size styles
            div.style.width = "";
            div.style.height = "";
            div.style.minWidth = "";
            div.style.minHeight = "";
            this.applyDividerSize(div);
            this.applyDividerAria(div, i);
        }

        // Recalculate sizes for the new axis
        requestAnimationFrame(() => this.calculateInitialSizes());

        console.debug(LOG_PREFIX, "Orientation changed to:", dir);
    }

    /**
     * Returns a serialisable SplitLayoutState snapshot.
     */
    public getState(): SplitLayoutState
    {
        const sizes: Record<string, number> = {};
        const collapsed: Record<string, boolean> = {};

        for (const pane of this.panes)
        {
            sizes[pane.config.id] = Math.round(
                pane.collapsed ? pane.preCollapseSize : pane.size
            );
            collapsed[pane.config.id] = pane.collapsed;
        }

        return { orientation: this.orientation, sizes, collapsed };
    }

    /**
     * Restores sizes and collapsed states from a SplitLayoutState.
     */
    public setState(state: SplitLayoutState): void
    {
        this.applyStateInternal(state);
        this.applyConstraints();
        this.applySizesToDom();
        this.fireOnResize();
        this.persistState();
    }

    /**
     * Inserts a new pane at the given index.
     */
    public addPane(config: SplitPaneConfig, index?: number): void
    {
        const insertAt = index ?? this.panes.length;
        const paneEl = this.buildPane(config);
        const state: PaneState = {
            config,
            element: paneEl,
            size: config.minSize ?? DEFAULT_MIN_SIZE,
            collapsed: config.collapsed ?? false,
            preCollapseSize: 0,
        };

        // Shrink existing panes proportionally
        const newPaneSize = state.size;
        const totalCurrent = this.panes.reduce((s, p) => s + p.size, 0);

        if (totalCurrent > 0)
        {
            const shrinkRatio = (totalCurrent - newPaneSize) / totalCurrent;

            for (const p of this.panes)
            {
                if (!p.collapsed)
                {
                    p.size = Math.round(p.size * shrinkRatio);
                }
            }
        }

        // Insert pane and divider
        this.panes.splice(insertAt, 0, state);

        if (this.rootEl && this.panes.length > 1)
        {
            const divIndex = Math.max(0, insertAt - 1);
            const divider = this.buildDivider(divIndex);

            // DOM insertion
            if (insertAt < this.panes.length - 1)
            {
                const nextPaneEl = this.panes[insertAt + 1].element;
                this.rootEl.insertBefore(paneEl, nextPaneEl);
                this.rootEl.insertBefore(divider, nextPaneEl);
            }
            else
            {
                this.rootEl.appendChild(divider);
                this.rootEl.appendChild(paneEl);
            }

            this.dividers.splice(divIndex, 0, divider);
        }

        this.applySizesToDom();
        console.debug(LOG_PREFIX, "Added pane:", config.id, "at index:", insertAt);
    }

    /**
     * Removes a pane and its adjacent divider.
     */
    public removePane(paneId: string): void
    {
        if (this.panes.length <= 2)
        {
            console.warn(LOG_PREFIX, "Cannot remove pane — minimum two required");
            return;
        }

        const index = this.panes.findIndex((p) => p.config.id === paneId);

        if (index < 0)
        {
            console.warn(LOG_PREFIX, "Pane not found:", paneId);
            return;
        }

        const pane = this.panes[index];
        const freedSpace = pane.size;

        // Remove pane from DOM
        pane.element.remove();
        this.panes.splice(index, 1);

        // Remove adjacent divider
        const divIndex = Math.min(index, this.dividers.length - 1);

        if (divIndex >= 0 && divIndex < this.dividers.length)
        {
            this.dividers[divIndex].remove();
            this.dividers.splice(divIndex, 1);
        }

        // Distribute freed space to neighbour
        const neighbour = this.panes[Math.min(index, this.panes.length - 1)];

        if (neighbour && !neighbour.collapsed)
        {
            neighbour.size += freedSpace;
        }

        this.applySizesToDom();
        this.fireOnResize();
        this.persistState();

        console.debug(LOG_PREFIX, "Removed pane:", paneId);
    }
}

// ============================================================================
// CONVENIENCE FUNCTION
// ============================================================================

/**
 * Creates a SplitLayout and immediately shows it in the given container.
 *
 * @param options - Configuration options
 * @param containerId - Optional container element ID
 * @returns The SplitLayout instance
 */
export function createSplitLayout(
    options: SplitLayoutOptions,
    containerId?: string): SplitLayout
{
    const layout = new SplitLayout(options);
    layout.show(containerId);
    return layout;
}

// ============================================================================
// GLOBAL EXPORTS (for <script> tag usage)
// ============================================================================

if (typeof window !== "undefined")
{
    (window as unknown as Record<string, unknown>)["SplitLayout"] = SplitLayout;
    (window as unknown as Record<string, unknown>)["createSplitLayout"] = createSplitLayout;
}
