/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: StackLayout
 * PURPOSE: Vertically stacked collapsible panels with draggable dividers.
 *          Each panel has a title bar (icon, collapse toggle) and content area.
 * RELATES: [[EnterpriseTheme]], [[SplitLayout]], [[StackableSidebarsSpec]]
 * FLOW: [createStackLayout()] -> [StackLayout DOM] -> [Panel Headers + Content]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// CONSTANTS
// ============================================================================

/** Log prefix for all console messages from this component. */
const LOG_PREFIX = "[StackLayout]";

/** Default collapsed header height in pixels. */
const HEADER_HEIGHT = 28;

/** Default minimum panel height in pixels. */
const DEFAULT_MIN_HEIGHT = 50;

/** Default divider height in pixels. */
const DIVIDER_HEIGHT = 4;

/** Instance counter for unique IDs. */
let instanceCounter = 0;

// ============================================================================
// INTERFACES
// ============================================================================

/** Configuration for a single panel within the stack layout. */
export interface StackedPanelConfig
{
    /** Unique panel identifier. */
    id: string;

    /** Display title shown in the panel header. */
    title: string;

    /** Optional Bootstrap Icons class for the header. */
    icon?: string;

    /** Content element placed inside the panel body. */
    content: HTMLElement;

    /** Whether the panel starts collapsed. Default: false. */
    collapsed?: boolean;

    /** Whether the panel can be collapsed. Default: true. */
    collapsible?: boolean;

    /** Minimum panel height in pixels. Default: 50. */
    minHeight?: number;
}

/** Configuration for the stack layout container. */
export interface StackLayoutOptions
{
    /** Container element to render into. */
    container: HTMLElement;

    /** Panel definitions, in order. */
    panels: StackedPanelConfig[];

    /** Whether dividers are draggable. Default: true. */
    resizable?: boolean;

    /** Stack orientation. Only vertical for now. */
    orientation?: "vertical";

    /** Called after resize with current panel sizes as percentages. */
    onResize?: (sizes: number[]) => void;

    /** Called when a panel is collapsed or expanded. */
    onCollapse?: (panelId: string, collapsed: boolean) => void;
}

/** Public handle returned by createStackLayout. */
export interface StackLayout
{
    /** Get a panel handle by ID. */
    getPanel(id: string): {
        setContent(el: HTMLElement): void;
        collapse(): void;
        expand(): void;
    } | null;

    /** Collapse a panel by ID. */
    collapsePanel(id: string): void;

    /** Expand a panel by ID. */
    expandPanel(id: string): void;

    /** Set panel sizes as percentages (expanded panels only). */
    setSizes(percentages: number[]): void;

    /** Remove component from DOM and clean up. */
    destroy(): void;

    /** Get the root DOM element. */
    getElement(): HTMLElement;
}

// ============================================================================
// DOM HELPERS
// ============================================================================

/** Creates an element with the given tag and CSS classes. */
function createElement(tag: string, classes: string[]): HTMLElement
{
    const el = document.createElement(tag);

    if (classes.length > 0)
    {
        el.classList.add(...classes);
    }

    return el;
}

/** Sets an attribute on an element. */
function setAttr(el: HTMLElement, name: string, value: string): void
{
    el.setAttribute(name, value);
}

// ============================================================================
// INTERNAL STATE
// ============================================================================

/** Internal panel state tracked at runtime. */
interface PanelState
{
    config: StackedPanelConfig;
    collapsed: boolean;
    sizePct: number;
    headerEl: HTMLElement;
    contentEl: HTMLElement;
    wrapperEl: HTMLElement;
}

// ============================================================================
// FACTORY: createStackLayout
// ============================================================================

/**
 * Creates a vertically stacked panel layout with collapsible headers
 * and draggable dividers between panels.
 */
export function createStackLayout(options: StackLayoutOptions): StackLayout
{
    const id = ++instanceCounter;
    const resizable = options.resizable !== false;
    const panels: PanelState[] = [];
    const dividers: HTMLElement[] = [];

    const root = createElement("div", ["stacklayout"]);
    setAttr(root, "data-stacklayout-id", String(id));

    // -- Build panels and dividers ------------------------------------------
    buildPanels(options, panels, dividers, root, resizable);

    // -- Distribute initial sizes -------------------------------------------
    distributeInitialSizes(panels);

    // -- Mount into container -----------------------------------------------
    options.container.appendChild(root);
    applyPanelStyles(panels);

    // -- Bind divider drag --------------------------------------------------
    if (resizable)
    {
        bindDividerDrag(panels, dividers, root, options);
    }

    // -- Return public handle -----------------------------------------------
    return createHandle(panels, root, options);
}

// ============================================================================
// BUILD HELPERS
// ============================================================================

/** Builds all panel wrappers and dividers into the root element. */
function buildPanels(
    options: StackLayoutOptions,
    panels: PanelState[],
    dividers: HTMLElement[],
    root: HTMLElement,
    resizable: boolean): void
{
    options.panels.forEach((cfg, index) =>
    {
        const state = buildSinglePanel(cfg);
        panels.push(state);
        root.appendChild(state.wrapperEl);

        if (index < options.panels.length - 1)
        {
            const divider = buildDivider(index, resizable);
            dividers.push(divider);
            root.appendChild(divider);
        }
    });
}

/** Builds a single panel wrapper with header and content areas. */
function buildSinglePanel(cfg: StackedPanelConfig): PanelState
{
    const wrapper = createElement("div", ["stacklayout-panel"]);
    setAttr(wrapper, "role", "region");
    setAttr(wrapper, "aria-label", cfg.title);
    setAttr(wrapper, "data-panel-id", cfg.id);

    const header = buildPanelHeader(cfg);
    const content = buildPanelContent(cfg);

    wrapper.appendChild(header);
    wrapper.appendChild(content);

    const collapsed = cfg.collapsed === true;

    if (collapsed)
    {
        wrapper.classList.add("stacklayout-panel-collapsed");
    }

    return {
        config: cfg,
        collapsed,
        sizePct: 0,
        headerEl: header,
        contentEl: content,
        wrapperEl: wrapper,
    };
}

/** Builds the panel header row with chevron, optional icon, and title. */
function buildPanelHeader(cfg: StackedPanelConfig): HTMLElement
{
    const header = createElement("div", ["stacklayout-header"]);
    const collapsible = cfg.collapsible !== false;

    if (collapsible)
    {
        setAttr(header, "tabindex", "0");
        setAttr(header, "role", "button");
        setAttr(header, "aria-expanded", cfg.collapsed ? "false" : "true");
    }

    const chevron = createElement("span", ["stacklayout-chevron"]);
    chevron.textContent = cfg.collapsed ? "\u25B8" : "\u25BE";
    header.appendChild(chevron);

    if (cfg.icon)
    {
        const icon = createElement("i", [cfg.icon, "stacklayout-icon"]);
        header.appendChild(icon);
    }

    const title = createElement("span", ["stacklayout-title"]);
    title.textContent = cfg.title;
    header.appendChild(title);

    return header;
}

/** Builds the panel content container. */
function buildPanelContent(cfg: StackedPanelConfig): HTMLElement
{
    const content = createElement("div", ["stacklayout-content"]);

    if (cfg.content)
    {
        content.appendChild(cfg.content);
    }

    return content;
}

/** Builds a draggable divider between panels. */
function buildDivider(index: number, resizable: boolean): HTMLElement
{
    const divider = createElement("div", ["stacklayout-divider"]);
    setAttr(divider, "role", "separator");
    setAttr(divider, "aria-orientation", "horizontal");
    setAttr(divider, "data-divider-index", String(index));

    if (resizable)
    {
        setAttr(divider, "tabindex", "0");
        setAttr(divider, "aria-label", `Resize divider ${index + 1}`);
    }

    return divider;
}

// ============================================================================
// SIZE MANAGEMENT
// ============================================================================

/** Distributes initial sizes equally among expanded panels. */
function distributeInitialSizes(panels: PanelState[]): void
{
    const expanded = panels.filter(p => !p.collapsed);
    const count = expanded.length;

    if (count === 0)
    {
        return;
    }

    const pct = 100 / count;

    expanded.forEach(p =>
    {
        p.sizePct = pct;
    });
}

/** Applies CSS flex styles to panels based on their current state. */
function applyPanelStyles(panels: PanelState[]): void
{
    panels.forEach(p =>
    {
        if (p.collapsed)
        {
            p.wrapperEl.style.flexGrow = "0";
            p.wrapperEl.style.flexShrink = "0";
            p.wrapperEl.style.flexBasis = "auto";
            p.contentEl.style.display = "none";
        }
        else
        {
            p.wrapperEl.style.flexGrow = String(p.sizePct);
            p.wrapperEl.style.flexShrink = "0";
            p.wrapperEl.style.flexBasis = "0px";
            p.contentEl.style.display = "";
        }
    });
}

/** Recalculates sizes when a panel is collapsed or expanded. */
function redistributeSizes(panels: PanelState[]): void
{
    const expanded = panels.filter(p => !p.collapsed);
    const count = expanded.length;

    if (count === 0)
    {
        return;
    }

    const total = expanded.reduce((sum, p) => sum + p.sizePct, 0);

    if (total <= 0)
    {
        const pct = 100 / count;
        expanded.forEach(p => { p.sizePct = pct; });
    }
    else
    {
        const scale = 100 / total;
        expanded.forEach(p => { p.sizePct = p.sizePct * scale; });
    }

    applyPanelStyles(panels);
}

// ============================================================================
// COLLAPSE / EXPAND
// ============================================================================

/** Collapses a panel by index. */
function collapseByIndex(
    panels: PanelState[],
    index: number,
    options: StackLayoutOptions): void
{
    const panel = panels[index];

    if (!panel || panel.collapsed)
    {
        return;
    }

    if (panel.config.collapsible === false)
    {
        console.warn(LOG_PREFIX, "Panel is not collapsible:", panel.config.id);
        return;
    }

    panel.collapsed = true;
    panel.wrapperEl.classList.add("stacklayout-panel-collapsed");
    updateHeaderState(panel);
    redistributeSizes(panels);

    if (options.onCollapse)
    {
        options.onCollapse(panel.config.id, true);
    }
}

/** Expands a panel by index. */
function expandByIndex(
    panels: PanelState[],
    index: number,
    options: StackLayoutOptions): void
{
    const panel = panels[index];

    if (!panel || !panel.collapsed)
    {
        return;
    }

    panel.collapsed = false;
    panel.wrapperEl.classList.remove("stacklayout-panel-collapsed");
    updateHeaderState(panel);
    redistributeSizes(panels);

    if (options.onCollapse)
    {
        options.onCollapse(panel.config.id, false);
    }
}

/** Updates the chevron and aria-expanded on a panel header. */
function updateHeaderState(panel: PanelState): void
{
    const chevron = panel.headerEl.querySelector(".stacklayout-chevron");

    if (chevron)
    {
        chevron.textContent = panel.collapsed ? "\u25B8" : "\u25BE";
    }

    if (panel.config.collapsible !== false)
    {
        setAttr(panel.headerEl, "aria-expanded", panel.collapsed ? "false" : "true");
    }
}

/** Toggles collapse on a panel and binds to header click/keyboard. */
function togglePanel(
    panels: PanelState[],
    index: number,
    options: StackLayoutOptions): void
{
    const panel = panels[index];

    if (!panel)
    {
        return;
    }

    if (panel.collapsed)
    {
        expandByIndex(panels, index, options);
    }
    else
    {
        collapseByIndex(panels, index, options);
    }
}

// ============================================================================
// DIVIDER DRAG
// ============================================================================

/** Binds pointer-based drag resize to each divider. */
function bindDividerDrag(
    panels: PanelState[],
    dividers: HTMLElement[],
    root: HTMLElement,
    options: StackLayoutOptions): void
{
    dividers.forEach((divider, divIdx) =>
    {
        bindSingleDivider(divider, divIdx, panels, root, options);
    });
}

/** Binds drag behaviour to a single divider element. */
function bindSingleDivider(
    divider: HTMLElement,
    divIdx: number,
    panels: PanelState[],
    root: HTMLElement,
    options: StackLayoutOptions): void
{
    let startY = 0;
    let startHeightAbove = 0;
    let startHeightBelow = 0;

    const onPointerMove = (e: PointerEvent): void =>
    {
        handleDividerMove(
            e, startY, startHeightAbove, startHeightBelow,
            divIdx, panels, root, options
        );
    };

    const onPointerUp = (e: PointerEvent): void =>
    {
        divider.releasePointerCapture(e.pointerId);
        divider.classList.remove("stacklayout-divider-active");
        document.removeEventListener("pointermove", onPointerMove);
        document.removeEventListener("pointerup", onPointerUp);
    };

    divider.addEventListener("pointerdown", (e: PointerEvent) =>
    {
        e.preventDefault();
        divider.setPointerCapture(e.pointerId);
        divider.classList.add("stacklayout-divider-active");

        startY = e.clientY;
        const above = findExpandedAbove(panels, divIdx);
        const below = findExpandedBelow(panels, divIdx);
        startHeightAbove = above ? above.wrapperEl.getBoundingClientRect().height : 0;
        startHeightBelow = below ? below.wrapperEl.getBoundingClientRect().height : 0;

        document.addEventListener("pointermove", onPointerMove);
        document.addEventListener("pointerup", onPointerUp);
    });
}

/** Handles pointer move during divider drag. */
function handleDividerMove(
    e: PointerEvent,
    startY: number,
    startHeightAbove: number,
    startHeightBelow: number,
    divIdx: number,
    panels: PanelState[],
    root: HTMLElement,
    options: StackLayoutOptions): void
{
    const delta = e.clientY - startY;
    const above = findExpandedAbove(panels, divIdx);
    const below = findExpandedBelow(panels, divIdx);

    if (!above || !below)
    {
        return;
    }

    const minAbove = above.config.minHeight ?? DEFAULT_MIN_HEIGHT;
    const minBelow = below.config.minHeight ?? DEFAULT_MIN_HEIGHT;

    const newAbove = Math.max(minAbove, startHeightAbove + delta);
    const newBelow = Math.max(minBelow, startHeightBelow - delta);

    const totalHeight = getAvailableHeight(panels, root);

    if (totalHeight <= 0)
    {
        return;
    }

    above.sizePct = (newAbove / totalHeight) * 100;
    below.sizePct = (newBelow / totalHeight) * 100;
    applyPanelStyles(panels);

    if (options.onResize)
    {
        options.onResize(panels.map(p => p.sizePct));
    }
}

/** Finds the nearest expanded panel above a divider index. */
function findExpandedAbove(panels: PanelState[], divIdx: number): PanelState | null
{
    for (let i = divIdx; i >= 0; i--)
    {
        if (!panels[i].collapsed)
        {
            return panels[i];
        }
    }

    return null;
}

/** Finds the nearest expanded panel below a divider index. */
function findExpandedBelow(panels: PanelState[], divIdx: number): PanelState | null
{
    for (let i = divIdx + 1; i < panels.length; i++)
    {
        if (!panels[i].collapsed)
        {
            return panels[i];
        }
    }

    return null;
}

/** Calculates total available height for expanded panels. */
function getAvailableHeight(panels: PanelState[], root: HTMLElement): number
{
    const rootHeight = root.getBoundingClientRect().height;
    const collapsedCount = panels.filter(p => p.collapsed).length;
    const dividerCount = panels.length - 1;
    const overhead = (collapsedCount * HEADER_HEIGHT) + (dividerCount * DIVIDER_HEIGHT);

    return rootHeight - overhead;
}

// ============================================================================
// HEADER EVENT BINDING
// ============================================================================

/** Binds click and keyboard events to all panel headers. */
function bindHeaderEvents(
    panels: PanelState[],
    options: StackLayoutOptions): void
{
    panels.forEach((panel, index) =>
    {
        if (panel.config.collapsible === false)
        {
            return;
        }

        panel.headerEl.addEventListener("click", () =>
        {
            togglePanel(panels, index, options);
        });

        panel.headerEl.addEventListener("keydown", (e: KeyboardEvent) =>
        {
            if (e.key === "Enter" || e.key === " ")
            {
                e.preventDefault();
                togglePanel(panels, index, options);
            }
        });
    });
}

// ============================================================================
// PUBLIC HANDLE
// ============================================================================

/** Creates the public StackLayout handle object. */
function createHandle(
    panels: PanelState[],
    root: HTMLElement,
    options: StackLayoutOptions): StackLayout
{
    // Bind header toggle events
    bindHeaderEvents(panels, options);

    return {
        getPanel(id: string)
        {
            return getPanelHandle(panels, id, options);
        },

        collapsePanel(id: string)
        {
            const idx = panels.findIndex(p => p.config.id === id);
            collapseByIndex(panels, idx, options);
        },

        expandPanel(id: string)
        {
            const idx = panels.findIndex(p => p.config.id === id);
            expandByIndex(panels, idx, options);
        },

        setSizes(percentages: number[])
        {
            setSizesFromPercentages(panels, percentages);
        },

        destroy()
        {
            destroyLayout(root);
        },

        getElement()
        {
            return root;
        },
    };
}

/** Returns a panel sub-handle for a given panel ID. */
function getPanelHandle(
    panels: PanelState[],
    id: string,
    options: StackLayoutOptions):
    { setContent(el: HTMLElement): void; collapse(): void; expand(): void } | null
{
    const idx = panels.findIndex(p => p.config.id === id);

    if (idx < 0)
    {
        console.warn(LOG_PREFIX, "Panel not found:", id);
        return null;
    }

    const panel = panels[idx];

    return {
        setContent(el: HTMLElement)
        {
            panel.contentEl.textContent = "";
            panel.contentEl.appendChild(el);
        },
        collapse()
        {
            collapseByIndex(panels, idx, options);
        },
        expand()
        {
            expandByIndex(panels, idx, options);
        },
    };
}

/** Applies user-provided percentage sizes to expanded panels. */
function setSizesFromPercentages(panels: PanelState[], percentages: number[]): void
{
    const expanded = panels.filter(p => !p.collapsed);

    percentages.forEach((pct, i) =>
    {
        if (i < expanded.length)
        {
            expanded[i].sizePct = pct;
        }
    });

    applyPanelStyles(panels);
}

/** Removes the layout from the DOM. */
function destroyLayout(root: HTMLElement): void
{
    if (root.parentNode)
    {
        root.parentNode.removeChild(root);
    }

    console.log(LOG_PREFIX, "Destroyed");
}

// ============================================================================
// WINDOW GLOBAL
// ============================================================================

if (typeof window !== "undefined")
{
    (window as unknown as Record<string, unknown>)["createStackLayout"] = createStackLayout;
}
