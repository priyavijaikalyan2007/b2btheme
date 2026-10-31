/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: StackLayout
 * PURPOSE: Stacked collapsible panels (vertical or horizontal) with draggable dividers.
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

const _lu = (typeof window.createLogUtility === "function")
    ? window.createLogUtility().getLogger(LOG_PREFIX.slice(1, -1))
    : null;
const LOCAL_HOSTS = /^(localhost|127\.0\.0\.1|\[::1\]|.+\.localhost)$/;
// LOG-6. Read per call, never captured. A const freezes the flag at script
// evaluation, so a console toggle on a live page did nothing. The semantics
// match isGlobalFlagSet in logutility.ts: unset means "decide from the host"
// for debug and "off" for trace. See FRONTEND_LOGGING.md section 1.3.
function _dbg(): boolean
{
    const f = window.__ebt_debug_logging;
    return f === undefined ? LOCAL_HOSTS.test(location.hostname) : !!f;
}
function _trc(): boolean { return !!window.__ebt_trace_logging; }
function logInfo(...a: unknown[]): void
{
    _lu ? _lu.info(...a) : console.log(new Date().toISOString(), "[INFO]", LOG_PREFIX, ...a);
}
function logWarn(...a: unknown[]): void
{
    _lu ? _lu.warn(...a) : console.warn(new Date().toISOString(), "[WARN]", LOG_PREFIX, ...a);
}
function logError(...a: unknown[]): void
{
    _lu ? _lu.error(...a) : console.error(new Date().toISOString(), "[ERROR]", LOG_PREFIX, ...a);
}
function logDebug(...a: unknown[]): void
{
    _lu ? _lu.debug(...a) : _dbg() && console.debug(new Date().toISOString(), "[DEBUG]", LOG_PREFIX, ...a);
}
function logTrace(...a: unknown[]): void
{
    _lu ? _lu.trace(...a) : _trc() && console.debug(new Date().toISOString(), "[TRACE]", LOG_PREFIX, ...a);
}

// LOG-4a DECLARES ALL FIVE SHIMS IN EVERY COMPONENT, used or not, so a
// developer adding a log line never has to wire one up. `noUnusedLocals`
// is on (UNUSED-1), and this reference is what says that uniformity is
// deliberate rather than an oversight. Deleting a shim to silence the
// compiler is the wrong repair: `dynamicVerboseShims` holds the logDebug
// and logTrace population as a floor, and the preamble is the contract
// FRONTEND_LOGGING.md section 1.1 states.
void [logInfo, logWarn, logError, logDebug, logTrace];

/** Default collapsed header height in pixels. */
const HEADER_HEIGHT = 28;

/** Default minimum panel height in pixels. */
const DEFAULT_MIN_HEIGHT = 50;

/** Default divider height in pixels. */
const DIVIDER_HEIGHT = 4;

/** Width of a collapsed vertical strip in horizontal mode. */
const COLLAPSED_STRIP_WIDTH = 32;

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

    /** Stack orientation. Default: "vertical". */
    orientation?: "vertical" | "horizontal";

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

    /** StackLayout has no data slots: its panels are an option (readiness step 4). */
    setData(slot: string, value: unknown): void;

    /** Subscribes to "resize" (the panel sizes) or "collapse" ({ panelId, collapsed }); returns the unsubscribe. */
    on(channel: string, handler: (payload: unknown) => void): () => void;

    /** The panel sizes, as percentages in panel order, and the ids of the collapsed panels. */
    getState(): Record<string, unknown>;

    /** Restores state captured by getState(), or any subset of it, firing no callback or channel. */
    setState(state: Record<string, unknown>): void;
}

/** The surface channels (readiness step 4). */
type StackChannel = "resize" | "collapse";

/** What the surface methods share with the layout's own callbacks. */
interface StackSurface
{
    readonly handlers: Record<StackChannel, Set<(payload: unknown) => void>>;
    restoring: boolean;
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
    // ERR-2. AGENTS.md: a missing option throws, it does not
    // get a silent default. This used to reach the field and
    // crash a frame later with a TypeError that names the line
    // rather than the thing the caller left out. Absent means
    // undefined, so an empty array or a zero is present.
    if (options.panels === undefined)
    {
        throw new Error(
            `${LOG_PREFIX} options.panels is required. `
            + "Pass it when creating the StackLayout.");
    }

    // ERR-1. A caller that named a container asked for that container.
    // `options.container.appendChild` on a null container used to throw
    // "Cannot read properties of null", which names the line that broke
    // rather than the thing the caller got wrong.
    if (!options.container)
    {
        throw new Error(
            `${LOG_PREFIX} options.container was not an element. `
            + "Pass the element to mount into, and check it for null before you do.");
    }

    const id = ++instanceCounter;
    const resizable = options.resizable !== false;
    const orientation = options.orientation || "vertical";
    const isHorizontal = orientation === "horizontal";
    const panels: PanelState[] = [];
    const dividers: HTMLElement[] = [];

    const root = createElement("div", ["stacklayout"]);
    setAttr(root, "data-stacklayout-id", String(id));

    // The layout calls these where it called onResize and onCollapse; each channel hears after its callback, and
    // setState silences both (readiness step 4).
    const surface: StackSurface = { handlers: { resize: new Set(), collapse: new Set() }, restoring: false };
    const internal: StackLayoutOptions = {
        ...options,
        onResize: (sizes) =>
        {
            if (surface.restoring) { return; }
            options.onResize?.(sizes);
            emit(surface, "resize", [...sizes]);
        },
        onCollapse: (panelId, collapsed) =>
        {
            if (surface.restoring) { return; }
            options.onCollapse?.(panelId, collapsed);
            emit(surface, "collapse", { panelId, collapsed });
        },
    };

    if (isHorizontal)
    {
        root.classList.add("stacklayout--horizontal");
    }

    // -- Build panels and dividers ------------------------------------------
    buildPanels(internal, panels, dividers, root, resizable, isHorizontal);

    // -- Distribute initial sizes -------------------------------------------
    distributeInitialSizes(panels);

    // -- Mount into container -----------------------------------------------
    options.container.appendChild(root);
    applyPanelStyles(panels, isHorizontal);

    // -- Bind divider drag --------------------------------------------------
    if (resizable)
    {
        bindDividerDrag(panels, dividers, root, internal, isHorizontal);
    }

    // -- Return public handle -----------------------------------------------
    return createHandle(panels, root, internal, surface);
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
    resizable: boolean,
    isHorizontal: boolean): void
{
    options.panels.forEach((cfg, index) =>
    {
        const state = buildSinglePanel(cfg);
        panels.push(state);
        root.appendChild(state.wrapperEl);

        if (index < options.panels.length - 1)
        {
            const divider = buildDivider(index, resizable, isHorizontal);
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
    // Canvas anchors name this region rather than counting it (ADR-162).
    content.setAttribute("data-dui-region", "stacklayout:content");

    if (cfg.content)
    {
        content.appendChild(cfg.content);
    }

    return content;
}

/** Builds a draggable divider between panels. */
function buildDivider(index: number, resizable: boolean, isHorizontal: boolean): HTMLElement
{
    const divider = createElement("div", ["stacklayout-divider"]);
    setAttr(divider, "role", "separator");
    setAttr(divider, "aria-orientation", isHorizontal ? "vertical" : "horizontal");
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
function applyPanelStyles(panels: PanelState[], isHorizontal = false): void
{
    panels.forEach(p =>
    {
        if (p.collapsed)
        {
            applyCollapsedStyle(p, isHorizontal);
        }
        else
        {
            applyExpandedStyle(p, isHorizontal);
        }
    });
}

/** Applies collapsed styles — vertical strip in horizontal mode. */
function applyCollapsedStyle(p: PanelState, isHorizontal: boolean): void
{
    p.wrapperEl.style.flexGrow = "0";
    p.wrapperEl.style.flexShrink = "0";
    p.wrapperEl.style.flexBasis = "auto";
    p.contentEl.style.display = "none";

    if (isHorizontal)
    {
        p.wrapperEl.style.width = "32px";
        p.wrapperEl.style.minWidth = "32px";
    }
}

/** Applies expanded styles — clears horizontal strip overrides. */
function applyExpandedStyle(p: PanelState, isHorizontal: boolean): void
{
    p.wrapperEl.style.flexGrow = String(p.sizePct);
    p.wrapperEl.style.flexShrink = "0";
    p.wrapperEl.style.flexBasis = "0px";
    p.contentEl.style.display = "";

    if (isHorizontal)
    {
        p.wrapperEl.style.width = "";
        p.wrapperEl.style.minWidth = "";
    }
}

/** Recalculates sizes when a panel is collapsed or expanded. */
function redistributeSizes(panels: PanelState[], isHorizontal = false): void
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

    applyPanelStyles(panels, isHorizontal);
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
        logWarn("Panel is not collapsible:", panel.config.id);
        return;
    }

    const isHoriz = options.orientation === "horizontal";

    panel.collapsed = true;
    panel.wrapperEl.classList.add("stacklayout-panel-collapsed");
    updateHeaderState(panel);
    redistributeSizes(panels, isHoriz);

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

    const isHoriz = options.orientation === "horizontal";

    panel.collapsed = false;
    panel.wrapperEl.classList.remove("stacklayout-panel-collapsed");
    updateHeaderState(panel);
    redistributeSizes(panels, isHoriz);

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
    options: StackLayoutOptions,
    isHorizontal: boolean): void
{
    dividers.forEach((divider, divIdx) =>
    {
        bindSingleDivider(divider, divIdx, panels, root, options, isHorizontal);
    });
}

/** Shared mutable drag state passed between pointer event handlers. */
interface DividerDragState
{
    startPos: number;
    startSizeAbove: number;
    startSizeBelow: number;
}

/** Binds drag behaviour to a single divider element. */
function bindSingleDivider(
    divider: HTMLElement,
    divIdx: number,
    panels: PanelState[],
    root: HTMLElement,
    options: StackLayoutOptions,
    isHorizontal: boolean): void
{
    const drag: DividerDragState = { startPos: 0, startSizeAbove: 0, startSizeBelow: 0 };

    const onPointerMove = (e: PointerEvent): void =>
    {
        handleDividerMove(
            e, drag.startPos, drag.startSizeAbove, drag.startSizeBelow,
            divIdx, panels, root, options, isHorizontal
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
        beginDividerDrag(divider, e, drag, panels, divIdx, isHorizontal);
        document.addEventListener("pointermove", onPointerMove);
        document.addEventListener("pointerup", onPointerUp);
    });
}

/** Initialise divider drag state on pointer down. */
function beginDividerDrag(
    divider: HTMLElement,
    e: PointerEvent,
    drag: DividerDragState,
    panels: PanelState[],
    divIdx: number,
    isHorizontal: boolean): void
{
    divider.setPointerCapture(e.pointerId);
    divider.classList.add("stacklayout-divider-active");

    drag.startPos = isHorizontal ? e.clientX : e.clientY;
    const above = findExpandedAbove(panels, divIdx);
    const below = findExpandedBelow(panels, divIdx);
    const rect1 = above ? above.wrapperEl.getBoundingClientRect() : null;
    const rect2 = below ? below.wrapperEl.getBoundingClientRect() : null;
    drag.startSizeAbove = isHorizontal ? (rect1?.width ?? 0) : (rect1?.height ?? 0);
    drag.startSizeBelow = isHorizontal ? (rect2?.width ?? 0) : (rect2?.height ?? 0);
}

/** Handles pointer move during divider drag. */
function handleDividerMove(
    e: PointerEvent,
    startPos: number,
    startSizeAbove: number,
    startSizeBelow: number,
    divIdx: number,
    panels: PanelState[],
    root: HTMLElement,
    options: StackLayoutOptions,
    isHorizontal: boolean): void
{
    logTrace("pointermove handler:", { x: e.clientX, y: e.clientY });
    const delta = (isHorizontal ? e.clientX : e.clientY) - startPos;
    const above = findExpandedAbove(panels, divIdx);
    const below = findExpandedBelow(panels, divIdx);

    if (!above || !below)
    {
        return;
    }

    const minAbove = above.config.minHeight ?? DEFAULT_MIN_HEIGHT;
    const minBelow = below.config.minHeight ?? DEFAULT_MIN_HEIGHT;

    const newAbove = Math.max(minAbove, startSizeAbove + delta);
    const newBelow = Math.max(minBelow, startSizeBelow - delta);

    const totalSize = getAvailableSize(panels, root, isHorizontal);

    if (totalSize <= 0)
    {
        return;
    }

    above.sizePct = (newAbove / totalSize) * 100;
    below.sizePct = (newBelow / totalSize) * 100;
    applyPanelStyles(panels, isHorizontal);

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

/** Calculates total available size (height or width) for expanded panels. */
function getAvailableSize(
    panels: PanelState[],
    root: HTMLElement,
    isHorizontal: boolean): number
{
    const rect = root.getBoundingClientRect();
    const rootSize = isHorizontal ? rect.width : rect.height;
    const collapsedCount = panels.filter(p => p.collapsed).length;
    const dividerCount = panels.length - 1;
    const overhead = isHorizontal
        ? (collapsedCount * COLLAPSED_STRIP_WIDTH) + (dividerCount * DIVIDER_HEIGHT)
        : (collapsedCount * HEADER_HEIGHT) + (dividerCount * DIVIDER_HEIGHT);

    return rootSize - overhead;
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
            logTrace("keydown handler:", { key: e.key.length > 1 ? e.key : "(char)", ctrl: e.ctrlKey });
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
    options: StackLayoutOptions,
    surface: StackSurface): StackLayout
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
            const horiz = options.orientation === "horizontal";
            setSizesFromPercentages(panels, percentages, horiz);
        },

        destroy()
        {
            surface.handlers.resize.clear();
            surface.handlers.collapse.clear();
            destroyLayout(root);
        },

        getElement()
        {
            return root;
        },

        setData(slot: string)
        {
            throw new Error(`${LOG_PREFIX} setData("${slot}"): StackLayout has no data slots. Its panels are an `
                + "option.");
        },

        on(channel: string, handler: (payload: unknown) => void)
        {
            if (channel !== "resize" && channel !== "collapse")
            {
                throw new Error(`${LOG_PREFIX} on("${channel}"): the valid channels are "resize" and "collapse".`);
            }

            surface.handlers[channel].add(handler);

            return () => { surface.handlers[channel].delete(handler); };
        },

        getState()
        {
            return {
                sizes: panels.map(p => p.sizePct),
                collapsed: panels.filter(p => p.collapsed).map(p => p.config.id),
            };
        },

        setState(state: Record<string, unknown>)
        {
            surface.restoring = true;

            try
            {
                restoreState(panels, options, state);
            }
            finally
            {
                surface.restoring = false;
            }
        },
    };
}

/** Collapses and expands panels to match `state.collapsed`, then applies `state.sizes`. */
function restoreState(panels: PanelState[], options: StackLayoutOptions, state: Record<string, unknown>): void
{
    if (Array.isArray(state.collapsed))
    {
        const collapsed = new Set(state.collapsed as string[]);

        panels.forEach((p, i) =>
        {
            if (collapsed.has(p.config.id)) { collapseByIndex(panels, i, options); }
            else { expandByIndex(panels, i, options); }
        });
    }

    if (Array.isArray(state.sizes))
    {
        (state.sizes as number[]).forEach((pct, i) =>
        {
            if (panels[i] && typeof pct === "number") { panels[i].sizePct = pct; }
        });
        applyPanelStyles(panels, options.orientation === "horizontal");
    }
}

/** Calls every handler on a channel, isolating each so one throw cannot starve the rest. */
function emit(surface: StackSurface, channel: StackChannel, payload: unknown): void
{
    for (const handler of surface.handlers[channel])
    {
        try
        {
            handler(payload);
        }
        catch (err)
        {
            logError(`Channel "${channel}" handler threw:`, err);
        }
    }
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
        logWarn("Panel not found:", id);
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
function setSizesFromPercentages(
    panels: PanelState[],
    percentages: number[],
    isHorizontal = false): void
{
    const expanded = panels.filter(p => !p.collapsed);

    percentages.forEach((pct, i) =>
    {
        if (i < expanded.length)
        {
            expanded[i].sizePct = pct;
        }
    });

    applyPanelStyles(panels, isHorizontal);
}

/** Removes the layout from the DOM. */
function destroyLayout(root: HTMLElement): void
{
    if (root.parentNode)
    {
        root.parentNode.removeChild(root);
    }

    logInfo("Destroyed");
}

// ============================================================================
// WINDOW GLOBAL
// ============================================================================

if (typeof window !== "undefined")
{
    window["createStackLayout"] = createStackLayout;
}
