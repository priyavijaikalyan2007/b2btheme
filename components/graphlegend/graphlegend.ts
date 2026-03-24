/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 7a3c91e4-d5b2-4f18-a9c0-8e1d3b6f0a24
 * Created: 2026-03-24
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: GraphLegend
 * 📜 PURPOSE: Collapsible legend panel showing color/icon/shape key for
 *             graph node types and edge types. Uses TypeBadge internally.
 * 🔗 RELATES: [[TypeBadge]], [[GraphCanvas]], [[OntologyVisualizer]]
 * ⚡ FLOW: [Consumer] -> [createGraphLegend()] -> [GraphLegend handle]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[GraphLegend]";

/** Default edge color when none is provided. Matches $gray-400. */
const DEFAULT_EDGE_COLOR = "#94a3b8";

/** Default maximum height before scrolling (px). */
const DEFAULT_MAX_HEIGHT = 300;

/** Default panel title. */
const DEFAULT_TITLE = "Legend";

// ============================================================================
// TYPES
// ============================================================================

/** Position for the legend panel within its container. */
export type LegendPosition = "bottom-left" | "bottom-right"
    | "top-left" | "top-right";

/** Style of the edge line sample. */
export type EdgeLineStyle = "solid" | "dashed" | "dotted";

/** Status for a node type entry. */
export type NodeTypeStatus = "active" | "planned"
    | "deprecated" | "external";

/** Configuration for a node type entry in the legend. */
export interface LegendNodeType
{
    /** Ontology type key, e.g. "strategy.okr". */
    typeKey: string;
    /** Display label, e.g. "OKR". */
    displayName: string;
    /** Bootstrap icon name (without "bi bi-" prefix). */
    icon: string;
    /** Hex color for the badge. */
    color: string;
    /** Number of this type in the graph. */
    count?: number;
    /** Visual status indicator. */
    status?: NodeTypeStatus;
}

/** Configuration for an edge type entry in the legend. */
export interface LegendEdgeType
{
    /** Relationship key, e.g. "owned_by". */
    relationshipKey: string;
    /** Display label, e.g. "owned by". */
    displayName: string;
    /** Edge color hex. Default: #94a3b8. */
    color?: string;
    /** Line style. Default: "solid". */
    style?: EdgeLineStyle;
    /** Number of this edge type in the graph. */
    count?: number;
}

/** Configuration options for the GraphLegend component. */
export interface GraphLegendOptions
{
    /** Container element to mount the legend into. Required. */
    container: HTMLElement;
    /** Initial list of node types. */
    nodeTypes: LegendNodeType[];
    /** Initial list of edge types. */
    edgeTypes?: LegendEdgeType[];
    /** Panel title. Default: "Legend". */
    title?: string;
    /** Start collapsed. Default: false. */
    collapsed?: boolean;
    /** Show the edge types section. Default: true. */
    showEdgeTypes?: boolean;
    /** Show count badges next to types. Default: false. */
    showCounts?: boolean;
    /** Panel corner position. Default: "bottom-left". */
    position?: LegendPosition;
    /** Max height before scrolling (px). Default: 300. */
    maxHeight?: number;
}

/** Public handle returned by createGraphLegend(). */
export interface GraphLegend
{
    /** Replace the list of node types. */
    setNodeTypes(types: LegendNodeType[]): void;
    /** Replace the list of edge types. */
    setEdgeTypes(types: LegendEdgeType[]): void;
    /** Update counts for existing node and edge types. */
    updateCounts(
        nodeCounts: Record<string, number>,
        edgeCounts: Record<string, number>
    ): void;
    /** Show the legend panel. */
    show(): void;
    /** Hide the legend panel. */
    hide(): void;
    /** Toggle visibility. */
    toggle(): void;
    /** Whether the panel is currently visible. */
    isVisible(): boolean;
    /** Set the collapsed state of the panel body. */
    setCollapsed(collapsed: boolean): void;
    /** Optional click handler for type items. */
    onTypeClick?: (typeKey: string) => void;
    /** Optional hover handler for type items. */
    onTypeHover?: (typeKey: string | null) => void;
    /** Tear down the component and remove from DOM. */
    destroy(): void;
}

// ============================================================================
// DOM HELPERS
// ============================================================================

/** Create an element with optional attributes and text. */
function createElement(
    tag: string,
    attrs?: Record<string, string>,
    text?: string
): HTMLElement
{
    const el = document.createElement(tag);

    if (attrs)
    {
        for (const [k, v] of Object.entries(attrs))
        {
            el.setAttribute(k, v);
        }
    }

    if (text)
    {
        el.textContent = text;
    }

    return el;
}

/** Set multiple attributes on an element. */
function setAttr(el: HTMLElement, attrs: Record<string, string>): void
{
    for (const [k, v] of Object.entries(attrs))
    {
        el.setAttribute(k, v);
    }
}

// ============================================================================
// EDGE LINE SAMPLE
// ============================================================================

/** Build a small inline SVG showing a line sample for an edge type. */
function buildEdgeLineSvg(
    color: string,
    style: EdgeLineStyle
): SVGElement
{
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");

    svg.setAttribute("width", "30");
    svg.setAttribute("height", "12");
    svg.setAttribute("viewBox", "0 0 30 12");
    svg.setAttribute("aria-hidden", "true");
    svg.classList.add("graphlegend-edge-line");

    const line = document.createElementNS(ns, "line");

    line.setAttribute("x1", "2");
    line.setAttribute("y1", "6");
    line.setAttribute("x2", "28");
    line.setAttribute("y2", "6");
    line.setAttribute("stroke", color);
    line.setAttribute("stroke-width", "2");

    if (style === "dashed")
    {
        line.setAttribute("stroke-dasharray", "4 3");
    }
    else if (style === "dotted")
    {
        line.setAttribute("stroke-dasharray", "2 2");
    }

    svg.appendChild(line);
    return svg;
}

// ============================================================================
// NODE TYPE RENDERING
// ============================================================================

/** Reference to the global createTypeBadge factory. */
function getTypeBadgeFactory(): ((opts: Record<string, unknown>) => HTMLElement) | null
{
    const win = window as unknown as Record<string, unknown>;
    const fn = win.createTypeBadge;

    if (typeof fn === "function")
    {
        return fn as (opts: Record<string, unknown>) => HTMLElement;
    }

    return null;
}

/** Build a single node type row element. */
function buildNodeTypeRow(
    nodeType: LegendNodeType,
    showCounts: boolean,
    isClickable: boolean
): HTMLElement
{
    const row = createElement("div", {
        class: buildNodeRowClasses(nodeType),
        "data-type-key": nodeType.typeKey
    });

    appendNodeBadge(row, nodeType);
    appendCountBadge(row, nodeType.count, showCounts);
    appendStatusIcon(row, nodeType.status);

    if (isClickable)
    {
        setAttr(row, { tabindex: "0", role: "button" });
    }

    return row;
}

/** Determine CSS classes for a node type row. */
function buildNodeRowClasses(nodeType: LegendNodeType): string
{
    const classes = ["graphlegend-item", "graphlegend-node-item"];

    if (nodeType.status === "planned")
    {
        classes.push("graphlegend-status-planned");
    }
    else if (nodeType.status === "deprecated")
    {
        classes.push("graphlegend-status-deprecated");
    }
    else if (nodeType.status === "external")
    {
        classes.push("graphlegend-status-external");
    }

    return classes.join(" ");
}

/** Append a TypeBadge (or fallback) to the node row. */
function appendNodeBadge(row: HTMLElement, nodeType: LegendNodeType): void
{
    const factory = getTypeBadgeFactory();

    if (factory)
    {
        const badge = factory({
            typeKey: nodeType.typeKey,
            displayName: nodeType.displayName,
            icon: nodeType.icon,
            color: nodeType.color,
            size: "sm",
            variant: "subtle"
        });
        row.appendChild(badge);
    }
    else
    {
        console.warn(LOG_PREFIX, "TypeBadge not available; using fallback");
        const fallback = buildFallbackBadge(nodeType);
        row.appendChild(fallback);
    }
}

/** Build a fallback badge when TypeBadge is not loaded. */
function buildFallbackBadge(nodeType: LegendNodeType): HTMLElement
{
    const span = createElement("span", {
        class: "graphlegend-fallback-badge"
    });

    const dot = createElement("span", {
        class: "graphlegend-color-dot"
    });
    dot.style.backgroundColor = nodeType.color;

    const label = createElement("span", {}, nodeType.displayName);

    span.appendChild(dot);
    span.appendChild(label);
    return span;
}

/** Append a count badge if showCounts is true and count is defined. */
function appendCountBadge(
    row: HTMLElement,
    count: number | undefined,
    showCounts: boolean
): void
{
    if (!showCounts || count === undefined)
    {
        return;
    }

    const badge = createElement("span", {
        class: "graphlegend-count"
    }, String(count));

    row.appendChild(badge);
}

/** Append a status icon for external types. */
function appendStatusIcon(
    row: HTMLElement,
    status: NodeTypeStatus | undefined
): void
{
    if (status !== "external")
    {
        return;
    }

    const icon = createElement("i", {
        class: "bi bi-box-arrow-up-right graphlegend-external-icon",
        "aria-label": "External type"
    });

    row.appendChild(icon);
}

// ============================================================================
// EDGE TYPE RENDERING
// ============================================================================

/** Build a single edge type row element. */
function buildEdgeTypeRow(
    edgeType: LegendEdgeType,
    showCounts: boolean,
    isClickable: boolean
): HTMLElement
{
    const row = createElement("div", {
        class: "graphlegend-item graphlegend-edge-item",
        "data-type-key": edgeType.relationshipKey
    });

    const color = edgeType.color ?? DEFAULT_EDGE_COLOR;
    const style = edgeType.style ?? "solid";
    const lineSvg = buildEdgeLineSvg(color, style);

    row.appendChild(lineSvg);

    const label = createElement("span", {
        class: "graphlegend-edge-label"
    }, edgeType.displayName);

    row.appendChild(label);
    appendCountBadge(row, edgeType.count, showCounts);

    if (isClickable)
    {
        setAttr(row, { tabindex: "0", role: "button" });
    }

    return row;
}

// ============================================================================
// HEADER RENDERING
// ============================================================================

/** Build the legend header with title and collapse toggle. */
function buildHeader(title: string, collapsed: boolean): HTMLElement
{
    const header = createElement("div", {
        class: "graphlegend-header"
    });

    const titleEl = createElement("span", {
        class: "graphlegend-title"
    }, title);

    const chevronClass = collapsed ? "bi-chevron-right" : "bi-chevron-down";
    const toggleBtn = createElement("button", {
        class: "graphlegend-toggle",
        type: "button",
        "aria-label": collapsed ? "Expand legend" : "Collapse legend",
        "aria-expanded": String(!collapsed)
    });

    const chevron = createElement("i", {
        class: `bi ${chevronClass} graphlegend-chevron`,
        "aria-hidden": "true"
    });

    toggleBtn.appendChild(chevron);
    header.appendChild(titleEl);
    header.appendChild(toggleBtn);
    return header;
}

// ============================================================================
// BODY RENDERING
// ============================================================================

/** Build the scrollable body containing node and edge sections. */
function buildBody(
    nodeTypes: LegendNodeType[],
    edgeTypes: LegendEdgeType[],
    showEdgeTypes: boolean,
    showCounts: boolean,
    maxHeight: number,
    isClickable: boolean
): HTMLElement
{
    const body = createElement("div", {
        class: "graphlegend-body"
    });

    body.style.maxHeight = `${maxHeight}px`;

    appendNodeSection(body, nodeTypes, showCounts, isClickable);

    if (showEdgeTypes && edgeTypes.length > 0)
    {
        appendEdgeSection(body, edgeTypes, showCounts, isClickable);
    }

    return body;
}

/** Append the node types section to the body. */
function appendNodeSection(
    body: HTMLElement,
    nodeTypes: LegendNodeType[],
    showCounts: boolean,
    isClickable: boolean
): void
{
    if (nodeTypes.length === 0)
    {
        return;
    }

    const section = createElement("div", {
        class: "graphlegend-section graphlegend-nodes-section"
    });

    const sectionLabel = createElement("div", {
        class: "graphlegend-section-label"
    }, "Node Types");

    section.appendChild(sectionLabel);

    for (const nt of nodeTypes)
    {
        section.appendChild(buildNodeTypeRow(nt, showCounts, isClickable));
    }

    body.appendChild(section);
}

/** Append the edge types section to the body. */
function appendEdgeSection(
    body: HTMLElement,
    edgeTypes: LegendEdgeType[],
    showCounts: boolean,
    isClickable: boolean
): void
{
    const section = createElement("div", {
        class: "graphlegend-section graphlegend-edges-section"
    });

    const sectionLabel = createElement("div", {
        class: "graphlegend-section-label"
    }, "Edge Types");

    section.appendChild(sectionLabel);

    for (const et of edgeTypes)
    {
        section.appendChild(buildEdgeTypeRow(et, showCounts, isClickable));
    }

    body.appendChild(section);
}

// ============================================================================
// EVENT WIRING
// ============================================================================

/** Attach click and hover listeners to all legend items. */
function wireItemEvents(
    root: HTMLElement,
    handle: GraphLegend
): void
{
    const items = root.querySelectorAll(".graphlegend-item");

    for (const item of items)
    {
        const el = item as HTMLElement;
        const typeKey = el.getAttribute("data-type-key") ?? "";

        wireClickEvent(el, typeKey, handle);
        wireHoverEvents(el, typeKey, handle);
        wireKeyboardEvent(el, typeKey, handle);
    }
}

/** Attach click event to a single item. */
function wireClickEvent(
    el: HTMLElement,
    typeKey: string,
    handle: GraphLegend
): void
{
    el.addEventListener("click", () =>
    {
        if (handle.onTypeClick)
        {
            handle.onTypeClick(typeKey);
        }
    });
}

/** Attach hover events to a single item. */
function wireHoverEvents(
    el: HTMLElement,
    typeKey: string,
    handle: GraphLegend
): void
{
    el.addEventListener("mouseenter", () =>
    {
        if (handle.onTypeHover)
        {
            handle.onTypeHover(typeKey);
        }
    });

    el.addEventListener("mouseleave", () =>
    {
        if (handle.onTypeHover)
        {
            handle.onTypeHover(null);
        }
    });
}

/** Attach keyboard activation to a single item. */
function wireKeyboardEvent(
    el: HTMLElement,
    typeKey: string,
    handle: GraphLegend
): void
{
    el.addEventListener("keydown", (e: Event) =>
    {
        const ke = e as KeyboardEvent;

        if (ke.key === "Enter" || ke.key === " ")
        {
            ke.preventDefault();

            if (handle.onTypeClick)
            {
                handle.onTypeClick(typeKey);
            }
        }
    });
}

// ============================================================================
// COLLAPSE TOGGLE WIRING
// ============================================================================

/** Wire the header toggle button to collapse/expand the body. */
function wireCollapseToggle(
    root: HTMLElement,
    state: LegendState
): void
{
    const toggleBtn = root.querySelector(".graphlegend-toggle");

    if (!toggleBtn)
    {
        return;
    }

    toggleBtn.addEventListener("click", () =>
    {
        state.collapsed = !state.collapsed;
        applyCollapsedState(root, state.collapsed);
    });
}

/** Apply collapsed or expanded visual state. */
function applyCollapsedState(
    root: HTMLElement,
    collapsed: boolean
): void
{
    const body = root.querySelector(".graphlegend-body") as HTMLElement | null;
    const chevron = root.querySelector(".graphlegend-chevron");
    const toggleBtn = root.querySelector(".graphlegend-toggle");

    if (body)
    {
        body.style.display = collapsed ? "none" : "";
    }

    if (chevron)
    {
        chevron.classList.toggle("bi-chevron-right", collapsed);
        chevron.classList.toggle("bi-chevron-down", !collapsed);
    }

    if (toggleBtn)
    {
        toggleBtn.setAttribute("aria-expanded", String(!collapsed));
        toggleBtn.setAttribute(
            "aria-label",
            collapsed ? "Expand legend" : "Collapse legend"
        );
    }
}

// ============================================================================
// COUNT UPDATING
// ============================================================================

/** Update count badges in-place for existing node and edge items. */
function applyCountUpdates(
    root: HTMLElement,
    nodeCounts: Record<string, number>,
    edgeCounts: Record<string, number>
): void
{
    const items = root.querySelectorAll(".graphlegend-item");

    for (const item of items)
    {
        const el = item as HTMLElement;
        const key = el.getAttribute("data-type-key") ?? "";
        const count = nodeCounts[key] ?? edgeCounts[key];

        updateItemCount(el, count);
    }
}

/** Update or create the count badge on a single item. */
function updateItemCount(
    el: HTMLElement,
    count: number | undefined
): void
{
    let badge = el.querySelector(".graphlegend-count") as HTMLElement | null;

    if (count === undefined)
    {
        if (badge)
        {
            badge.remove();
        }
        return;
    }

    if (!badge)
    {
        badge = createElement("span", {
            class: "graphlegend-count"
        });
        el.appendChild(badge);
    }

    badge.textContent = String(count);
}

// ============================================================================
// STATE
// ============================================================================

/** Internal mutable state for the legend instance. */
interface LegendState
{
    collapsed: boolean;
    visible: boolean;
    nodeTypes: LegendNodeType[];
    edgeTypes: LegendEdgeType[];
    showEdgeTypes: boolean;
    showCounts: boolean;
    maxHeight: number;
    destroyed: boolean;
}

// ============================================================================
// RE-RENDER
// ============================================================================

/** Clear and re-render the legend body contents. */
function reRenderBody(
    root: HTMLElement,
    state: LegendState,
    handle: GraphLegend
): void
{
    const existingBody = root.querySelector(".graphlegend-body");

    if (existingBody)
    {
        existingBody.remove();
    }

    const isClickable = typeof handle.onTypeClick === "function";
    const body = buildBody(
        state.nodeTypes,
        state.edgeTypes,
        state.showEdgeTypes,
        state.showCounts,
        state.maxHeight,
        isClickable
    );

    root.appendChild(body);
    wireItemEvents(root, handle);
    applyCollapsedState(root, state.collapsed);
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create a GraphLegend component.
 *
 * Renders a collapsible legend panel showing node types (via TypeBadge)
 * and edge types (via inline SVG line samples) with optional count badges.
 */
// @entrypoint
export function createGraphLegend(options: GraphLegendOptions): GraphLegend
{
    const container = options.container;

    if (!container)
    {
        console.error(LOG_PREFIX, "No container element provided");
        throw new Error("GraphLegend requires a container element");
    }

    const state = initState(options);
    const root = buildRoot(options);

    container.appendChild(root);

    const handle = createHandle(root, state);

    wireCollapseToggle(root, state);
    wireItemEvents(root, handle);
    applyCollapsedState(root, state.collapsed);

    console.log(LOG_PREFIX, "Created with",
        state.nodeTypes.length, "node types,",
        state.edgeTypes.length, "edge types");

    return handle;
}

/** Initialise internal state from options. */
function initState(options: GraphLegendOptions): LegendState
{
    return {
        collapsed: options.collapsed ?? false,
        visible: true,
        nodeTypes: [...options.nodeTypes],
        edgeTypes: options.edgeTypes ? [...options.edgeTypes] : [],
        showEdgeTypes: options.showEdgeTypes ?? true,
        showCounts: options.showCounts ?? false,
        maxHeight: options.maxHeight ?? DEFAULT_MAX_HEIGHT,
        destroyed: false
    };
}

/** Build the root element with header and body. */
function buildRoot(options: GraphLegendOptions): HTMLElement
{
    const state = initState(options);
    const position = options.position ?? "bottom-left";
    const title = options.title ?? DEFAULT_TITLE;
    const isClickable = false; // no handler yet at build time

    const root = createElement("div", {
        class: `graphlegend graphlegend-${position}`,
        role: "complementary",
        "aria-label": "Graph legend"
    });

    const header = buildHeader(title, state.collapsed);

    const body = buildBody(
        state.nodeTypes,
        state.edgeTypes,
        state.showEdgeTypes,
        state.showCounts,
        state.maxHeight,
        isClickable
    );

    root.appendChild(header);
    root.appendChild(body);
    return root;
}

/** Create the public API handle. */
function createHandle(
    root: HTMLElement,
    state: LegendState
): GraphLegend
{
    const handle: GraphLegend =
    {
        onTypeClick: undefined,
        onTypeHover: undefined,

        setNodeTypes(types: LegendNodeType[]): void
        {
            state.nodeTypes = [...types];
            reRenderBody(root, state, handle);
            console.log(LOG_PREFIX, "Updated node types:", types.length);
        },

        setEdgeTypes(types: LegendEdgeType[]): void
        {
            state.edgeTypes = [...types];
            reRenderBody(root, state, handle);
            console.log(LOG_PREFIX, "Updated edge types:", types.length);
        },

        updateCounts(
            nodeCounts: Record<string, number>,
            edgeCounts: Record<string, number>
        ): void
        {
            applyCountUpdates(root, nodeCounts, edgeCounts);
        },

        show(): void
        {
            state.visible = true;
            root.style.display = "";
            console.log(LOG_PREFIX, "Shown");
        },

        hide(): void
        {
            state.visible = false;
            root.style.display = "none";
            console.log(LOG_PREFIX, "Hidden");
        },

        toggle(): void
        {
            if (state.visible)
            {
                handle.hide();
            }
            else
            {
                handle.show();
            }
        },

        isVisible(): boolean
        {
            return state.visible;
        },

        setCollapsed(collapsed: boolean): void
        {
            state.collapsed = collapsed;
            applyCollapsedState(root, collapsed);
        },

        destroy(): void
        {
            if (state.destroyed)
            {
                return;
            }

            state.destroyed = true;
            root.remove();
            console.log(LOG_PREFIX, "Destroyed");
        }
    };

    return handle;
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

(window as unknown as Record<string, unknown>).createGraphLegend = createGraphLegend;
