/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: a7d3e1f4-8c26-4b9a-bf1d-0e5f2a3c8d17
 * Created: 2026-03-24
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: GraphMinimap
 * PURPOSE: Small overview widget showing miniaturised view of entire graph
 *          canvas with viewport rectangle for click-to-pan and drag-to-pan.
 * RELATES: [[GraphCanvas]], [[OntologyVisualizer]]
 * FLOW: [GraphCanvas events] -> [GraphMinimap.refresh()] -> [SVG render]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// CONSTANTS
// ============================================================================

/** Log prefix for all console messages from this component. */
const LOG_PREFIX = "[GraphMinimap]";

const _lu = (typeof (window as any).createLogUtility === "function") ? (window as any).createLogUtility().getLogger(LOG_PREFIX.slice(1, -1)) : null;
function logInfo(...a: unknown[]): void { _lu ? _lu.info(...a) : console.log(new Date().toISOString(), "[INFO]", LOG_PREFIX, ...a); }
function logWarn(...a: unknown[]): void { _lu ? _lu.warn(...a) : console.warn(new Date().toISOString(), "[WARN]", LOG_PREFIX, ...a); }
function logError(...a: unknown[]): void { _lu ? _lu.error(...a) : console.error(new Date().toISOString(), "[ERROR]", LOG_PREFIX, ...a); }
function logDebug(...a: unknown[]): void { _lu ? _lu.debug(...a) : console.debug(new Date().toISOString(), "[DEBUG]", LOG_PREFIX, ...a); }
function logTrace(...a: unknown[]): void { _lu ? _lu.trace(...a) : console.debug(new Date().toISOString(), "[TRACE]", LOG_PREFIX, ...a); }

/** SVG namespace for createElement calls. */
const SVG_NS = "http://www.w3.org/2000/svg";

/** Default minimap width in px. */
const DEFAULT_WIDTH = 200;

/** Default minimap height in px. */
const DEFAULT_HEIGHT = 150;

/** Default background colour. */
const DEFAULT_BG_COLOR = "#f8f9fa";

/** Default viewport rectangle fill colour. */
const DEFAULT_VIEWPORT_COLOR = "rgba(59, 130, 246, 0.3)";

/** Default viewport rectangle border colour. */
const DEFAULT_VIEWPORT_BORDER_COLOR = "#3b82f6";

/** Default node dot colour. */
const DEFAULT_NODE_COLOR = "#94a3b8";

/** Default edge line colour. */
const DEFAULT_EDGE_COLOR = "#cbd5e1";

/** Node count threshold above which edges are auto-hidden. */
const EDGE_THRESHOLD = 500;

/** Node dot radius in the minimap. */
const NODE_RADIUS = 3;

/** Viewport border width. */
const VIEWPORT_BORDER_WIDTH = 2;

/** Padding inside the SVG viewBox so nodes are not clipped. */
const VIEWBOX_PADDING = 20;

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Minimal interface that a graph canvas must implement for the minimap
 * to read node/edge data and issue pan commands.
 */
export interface GraphCanvasHandle
{
    /** Returns all nodes with their positions and optional colour. */
    getNodes(): { id: string; x: number; y: number; color?: string }[];

    /** Returns all edges as source/target ID pairs. */
    getEdges(): { source: string; target: string }[];

    /** Returns the current viewport bounds and zoom level. */
    getViewport(): { x: number; y: number; zoom: number; width: number; height: number };

    /** Pan the main canvas to centre on the given coordinates. */
    panTo(x: number, y: number): void;

    /** Subscribe to a named event on the graph canvas. */
    on(event: string, callback: Function): void;

    /** Unsubscribe from a named event on the graph canvas. */
    off(event: string, callback: Function): void;
}

/** Configuration for the GraphMinimap component. */
export interface GraphMinimapOptions
{
    /** Container element to render the minimap into. Required. */
    container: HTMLElement;

    /** GraphCanvas instance to synchronise with. Required. */
    graphCanvas: GraphCanvasHandle;

    /** Minimap width in px. Default: 200. */
    width?: number;

    /** Minimap height in px. Default: 150. */
    height?: number;

    /** Background colour of the minimap. Default: '#f8f9fa'. */
    backgroundColor?: string;

    /** Viewport rectangle fill colour. Default: semi-transparent blue. */
    viewportColor?: string;

    /** Viewport rectangle border colour. Default: '#3b82f6'. */
    viewportBorderColor?: string;

    /** Default colour for node dots. Default: '#94a3b8'. */
    nodeColor?: string;

    /** Default colour for edge lines. Default: '#cbd5e1'. */
    edgeColor?: string;

    /** Whether to render edges. Default: true. Auto-disabled for >500 nodes. */
    showEdges?: boolean;

    /** Whether the minimap starts collapsed. Default: false. */
    collapsed?: boolean;

    /** Corner position for the minimap. Default: 'bottom-right'. */
    position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
}

/** Public API returned by createGraphMinimap. */
export interface GraphMinimap
{
    /** Re-read positions from GraphCanvas and redraw the minimap. */
    refresh(): void;

    /** Show the minimap. */
    show(): void;

    /** Hide the minimap. */
    hide(): void;

    /** Toggle minimap visibility. */
    toggle(): void;

    /** Returns true if the minimap is currently visible (not collapsed). */
    isVisible(): boolean;

    /** Tear down the minimap and remove all event listeners. */
    destroy(): void;
}

// ============================================================================
// INTERNAL STATE
// ============================================================================

/** Internal state for a minimap instance. */
interface MinimapState
{
    container: HTMLElement;
    graphCanvas: GraphCanvasHandle;
    wrapper: HTMLElement;
    svg: SVGSVGElement;
    nodesGroup: SVGGElement;
    edgesGroup: SVGGElement;
    viewportRect: SVGRectElement;
    toggleBtn: HTMLButtonElement;
    width: number;
    height: number;
    backgroundColor: string;
    viewportColor: string;
    viewportBorderColor: string;
    nodeColor: string;
    edgeColor: string;
    showEdges: boolean;
    collapsed: boolean;
    destroyed: boolean;
    isDragging: boolean;
    bounds: { minX: number; minY: number; maxX: number; maxY: number };
    layoutCallback: Function;
    boundMouseMove: (e: MouseEvent) => void;
    boundMouseUp: () => void;
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Creates a GraphMinimap instance that renders a miniaturised overview
 * of a graph canvas with viewport rectangle for navigation.
 *
 * @param options - Configuration for the minimap
 * @returns GraphMinimap public API handle
 */
export function createGraphMinimap(options: GraphMinimapOptions): GraphMinimap
{
    if (!options.container)
    {
        logError("No container element provided");
        throw new Error("GraphMinimap requires a container element");
    }

    if (!options.graphCanvas)
    {
        logError("No graphCanvas handle provided");
        throw new Error("GraphMinimap requires a graphCanvas handle");
    }

    const state = initState(options);

    buildDom(state);
    bindEvents(state);
    state.collapsed ? collapseContent(state) : expandContent(state);
    refresh(state);

    logInfo("Initialised", state.width, "x", state.height);

    return buildPublicApi(state);
}

// ============================================================================
// INITIALISATION HELPERS
// ============================================================================

/** Initialise internal state from options with defaults. */
function initState(options: GraphMinimapOptions): MinimapState
{
    const width = options.width ?? DEFAULT_WIDTH;
    const height = options.height ?? DEFAULT_HEIGHT;

    return {
        container: options.container,
        graphCanvas: options.graphCanvas,
        wrapper: document.createElement("div"),
        svg: document.createElementNS(SVG_NS, "svg") as SVGSVGElement,
        nodesGroup: document.createElementNS(SVG_NS, "g") as SVGGElement,
        edgesGroup: document.createElementNS(SVG_NS, "g") as SVGGElement,
        viewportRect: document.createElementNS(SVG_NS, "rect") as SVGRectElement,
        toggleBtn: document.createElement("button"),
        width,
        height,
        backgroundColor: options.backgroundColor ?? DEFAULT_BG_COLOR,
        viewportColor: options.viewportColor ?? DEFAULT_VIEWPORT_COLOR,
        viewportBorderColor: options.viewportBorderColor ?? DEFAULT_VIEWPORT_BORDER_COLOR,
        nodeColor: options.nodeColor ?? DEFAULT_NODE_COLOR,
        edgeColor: options.edgeColor ?? DEFAULT_EDGE_COLOR,
        showEdges: options.showEdges ?? true,
        collapsed: options.collapsed ?? false,
        destroyed: false,
        isDragging: false,
        bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 },
        layoutCallback: () => { /* placeholder, replaced in bindEvents */ },
        boundMouseMove: () => { /* placeholder, replaced in bindEvents */ },
        boundMouseUp: () => { /* placeholder, replaced in bindEvents */ },
    };
}

/** Build the DOM structure: wrapper > header (toggle) + SVG. */
function buildDom(state: MinimapState): void
{
    buildWrapper(state);
    buildToggleButton(state);
    buildSvg(state);

    state.container.appendChild(state.wrapper);
}

/** Create the outer wrapper element with positioning and styling classes. */
function buildWrapper(state: MinimapState): void
{
    const wrapper = state.wrapper;

    wrapper.className = "graphminimap";
    wrapper.setAttribute("role", "img");
    wrapper.setAttribute("aria-label", "Graph minimap showing overview of the graph");
    wrapper.style.width = `${state.width}px`;
}

/** Create the collapse/expand toggle button in the header. */
function buildToggleButton(state: MinimapState): void
{
    const header = document.createElement("div");

    header.className = "graphminimap-header";

    const label = document.createElement("span");

    label.className = "graphminimap-label";
    label.textContent = "Minimap";

    state.toggleBtn.className = "graphminimap-toggle";
    state.toggleBtn.setAttribute("type", "button");
    state.toggleBtn.setAttribute("aria-label", "Toggle minimap");
    state.toggleBtn.textContent = "\u25B2"; // up triangle

    header.appendChild(label);
    header.appendChild(state.toggleBtn);
    state.wrapper.appendChild(header);
}

/** Create the SVG element with groups for edges, nodes, and viewport rect. */
function buildSvg(state: MinimapState): void
{
    const svg = state.svg;

    svg.setAttribute("class", "graphminimap-svg");
    svg.setAttribute("width", String(state.width));
    svg.setAttribute("height", String(state.height));
    svg.style.backgroundColor = state.backgroundColor;

    svg.appendChild(state.edgesGroup);
    svg.appendChild(state.nodesGroup);
    svg.appendChild(state.viewportRect);

    configureViewportRect(state);

    state.wrapper.appendChild(svg);
}

/** Set up the viewport rectangle with default styling. */
function configureViewportRect(state: MinimapState): void
{
    const rect = state.viewportRect;

    rect.setAttribute("class", "graphminimap-viewport");
    rect.setAttribute("fill", state.viewportColor);
    rect.setAttribute("stroke", state.viewportBorderColor);
    rect.setAttribute("stroke-width", String(VIEWPORT_BORDER_WIDTH));
    rect.setAttribute("cursor", "move");
}

// ============================================================================
// EVENT BINDING
// ============================================================================

/** Bind mouse events on the SVG and graph canvas layout events. */
function bindEvents(state: MinimapState): void
{
    state.toggleBtn.addEventListener("click", () => handleToggleClick(state));
    state.svg.addEventListener("mousedown", (e: MouseEvent) => handleMouseDown(state, e));

    // Store bound handlers so they can be removed during destroy
    state.boundMouseMove = (e: MouseEvent) => handleMouseMove(state, e);
    state.boundMouseUp = () => handleMouseUp(state);
    document.addEventListener("mousemove", state.boundMouseMove as EventListener);
    document.addEventListener("mouseup", state.boundMouseUp as EventListener);

    // Subscribe to layout changes on the graph canvas
    state.layoutCallback = () => refresh(state);
    state.graphCanvas.on("layoutComplete", state.layoutCallback);
}

/** Unbind all event listeners during destroy. */
function unbindEvents(state: MinimapState): void
{
    document.removeEventListener("mousemove", state.boundMouseMove as EventListener);
    document.removeEventListener("mouseup", state.boundMouseUp as EventListener);
    state.graphCanvas.off("layoutComplete", state.layoutCallback);
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

/** Handle toggle button click to collapse or expand the minimap. */
function handleToggleClick(state: MinimapState): void
{
    if (state.collapsed)
    {
        expandContent(state);
    }
    else
    {
        collapseContent(state);
    }
}

/** Handle mousedown on the SVG — begin pan or start viewport drag. */
function handleMouseDown(state: MinimapState, e: MouseEvent): void
{
    if (state.collapsed || state.destroyed)
    {
        return;
    }

    e.preventDefault();
    state.isDragging = true;

    panToMousePosition(state, e);
}

/** Handle mousemove — drag the viewport if dragging is active. */
function handleMouseMove(state: MinimapState, e: MouseEvent): void
{
    if (!state.isDragging || state.destroyed)
    {
        return;
    }

    panToMousePosition(state, e);
}

/** Handle mouseup — stop dragging. */
function handleMouseUp(state: MinimapState): void
{
    state.isDragging = false;
}

/** Convert mouse position on the SVG to graph coordinates and pan. */
function panToMousePosition(state: MinimapState, e: MouseEvent): void
{
    const svgRect = state.svg.getBoundingClientRect();
    const ratioX = (e.clientX - svgRect.left) / svgRect.width;
    const ratioY = (e.clientY - svgRect.top) / svgRect.height;
    const bounds = state.bounds;

    const graphWidth = bounds.maxX - bounds.minX;
    const graphHeight = bounds.maxY - bounds.minY;

    const graphX = bounds.minX + (ratioX * graphWidth);
    const graphY = bounds.minY + (ratioY * graphHeight);

    state.graphCanvas.panTo(graphX, graphY);
    logDebug("Pan to", graphX.toFixed(0), graphY.toFixed(0));
}

// ============================================================================
// COLLAPSE / EXPAND
// ============================================================================

/** Collapse the minimap, hiding the SVG content. */
function collapseContent(state: MinimapState): void
{
    state.collapsed = true;
    state.svg.style.display = "none";
    state.toggleBtn.textContent = "\u25BC"; // down triangle
    state.toggleBtn.setAttribute("aria-expanded", "false");
    logDebug("Collapsed");
}

/** Expand the minimap, showing the SVG content. */
function expandContent(state: MinimapState): void
{
    state.collapsed = false;
    state.svg.style.display = "";
    state.toggleBtn.textContent = "\u25B2"; // up triangle
    state.toggleBtn.setAttribute("aria-expanded", "true");
    logDebug("Expanded");
}

// ============================================================================
// RENDERING
// ============================================================================

/** Main refresh — re-read graph data and redraw the minimap. */
function refresh(state: MinimapState): void
{
    if (state.destroyed)
    {
        return;
    }

    const nodes = state.graphCanvas.getNodes();
    const edges = state.graphCanvas.getEdges();

    const shouldShowEdges = computeShowEdges(state, nodes.length);

    computeBounds(state, nodes);
    clearSvgGroups(state);
    updateViewBox(state);

    if (shouldShowEdges)
    {
        renderEdges(state, nodes, edges);
    }

    renderNodes(state, nodes);
    renderViewportRect(state);

    logDebug("Refreshed:", nodes.length, "nodes,", edges.length, "edges");
}

/** Decide whether edges should be shown based on node count and options. */
function computeShowEdges(state: MinimapState, nodeCount: number): boolean
{
    if (!state.showEdges)
    {
        return false;
    }

    // PERF: Auto-disable edges for large graphs to maintain rendering speed
    if (nodeCount > EDGE_THRESHOLD)
    {
        logDebug("Auto-hiding edges:", nodeCount, "nodes exceeds threshold");
        return false;
    }

    return true;
}

/** Compute the bounding box of all nodes with padding. */
function computeBounds(
    state: MinimapState,
    nodes: { id: string; x: number; y: number; color?: string }[]
): void
{
    if (nodes.length === 0)
    {
        state.bounds = { minX: 0, minY: 0, maxX: 100, maxY: 100 };
        return;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const node of nodes)
    {
        if (node.x < minX) { minX = node.x; }
        if (node.y < minY) { minY = node.y; }
        if (node.x > maxX) { maxX = node.x; }
        if (node.y > maxY) { maxY = node.y; }
    }

    state.bounds = {
        minX: minX - VIEWBOX_PADDING,
        minY: minY - VIEWBOX_PADDING,
        maxX: maxX + VIEWBOX_PADDING,
        maxY: maxY + VIEWBOX_PADDING,
    };
}

/** Clear all child elements from the node and edge SVG groups. */
function clearSvgGroups(state: MinimapState): void
{
    while (state.nodesGroup.firstChild)
    {
        state.nodesGroup.removeChild(state.nodesGroup.firstChild);
    }

    while (state.edgesGroup.firstChild)
    {
        state.edgesGroup.removeChild(state.edgesGroup.firstChild);
    }
}

/** Update the SVG viewBox attribute to fit the computed bounds. */
function updateViewBox(state: MinimapState): void
{
    const b = state.bounds;
    const w = b.maxX - b.minX;
    const h = b.maxY - b.minY;

    state.svg.setAttribute("viewBox", `${b.minX} ${b.minY} ${w} ${h}`);
}

/** Render all edges as thin SVG lines. */
function renderEdges(
    state: MinimapState,
    nodes: { id: string; x: number; y: number; color?: string }[],
    edges: { source: string; target: string }[]
): void
{
    const nodeMap = buildNodeMap(nodes);

    for (const edge of edges)
    {
        renderSingleEdge(state, nodeMap, edge);
    }
}

/** Build a lookup map from node ID to node position. */
function buildNodeMap(
    nodes: { id: string; x: number; y: number; color?: string }[]
): Map<string, { x: number; y: number }>
{
    const map = new Map<string, { x: number; y: number }>();

    for (const node of nodes)
    {
        map.set(node.id, { x: node.x, y: node.y });
    }

    return map;
}

/** Render a single edge as an SVG line element. */
function renderSingleEdge(
    state: MinimapState,
    nodeMap: Map<string, { x: number; y: number }>,
    edge: { source: string; target: string }
): void
{
    const sourcePos = nodeMap.get(edge.source);
    const targetPos = nodeMap.get(edge.target);

    if (!sourcePos || !targetPos)
    {
        return;
    }

    const line = document.createElementNS(SVG_NS, "line");

    line.setAttribute("x1", String(sourcePos.x));
    line.setAttribute("y1", String(sourcePos.y));
    line.setAttribute("x2", String(targetPos.x));
    line.setAttribute("y2", String(targetPos.y));
    line.setAttribute("stroke", state.edgeColor);
    line.setAttribute("stroke-width", "1");

    state.edgesGroup.appendChild(line);
}

/** Render all nodes as small filled SVG circles. */
function renderNodes(
    state: MinimapState,
    nodes: { id: string; x: number; y: number; color?: string }[]
): void
{
    for (const node of nodes)
    {
        const circle = document.createElementNS(SVG_NS, "circle");

        circle.setAttribute("cx", String(node.x));
        circle.setAttribute("cy", String(node.y));
        circle.setAttribute("r", String(NODE_RADIUS));
        circle.setAttribute("fill", node.color ?? state.nodeColor);

        state.nodesGroup.appendChild(circle);
    }
}

/** Render the viewport rectangle showing the currently visible region. */
function renderViewportRect(state: MinimapState): void
{
    const viewport = state.graphCanvas.getViewport();
    const rect = state.viewportRect;

    rect.setAttribute("x", String(viewport.x));
    rect.setAttribute("y", String(viewport.y));
    rect.setAttribute("width", String(viewport.width / viewport.zoom));
    rect.setAttribute("height", String(viewport.height / viewport.zoom));
}

// ============================================================================
// PUBLIC API BUILDER
// ============================================================================

/** Construct the public API object that the factory returns. */
function buildPublicApi(state: MinimapState): GraphMinimap
{
    return {
        refresh: () => refresh(state),

        show: () =>
        {
            state.wrapper.style.display = "";
            logDebug("Shown");
        },

        hide: () =>
        {
            state.wrapper.style.display = "none";
            logDebug("Hidden");
        },

        toggle: () =>
        {
            const isHidden = state.wrapper.style.display === "none";

            if (isHidden)
            {
                state.wrapper.style.display = "";
            }
            else
            {
                state.wrapper.style.display = "none";
            }
        },

        isVisible: () =>
        {
            return state.wrapper.style.display !== "none";
        },

        destroy: () =>
        {
            if (state.destroyed)
            {
                return;
            }

            state.destroyed = true;
            unbindEvents(state);
            state.wrapper.remove();

            logInfo("Destroyed");
        },
    };
}

// ============================================================================
// WINDOW GLOBAL
// ============================================================================

(window as unknown as Record<string, unknown>).createGraphMinimap = createGraphMinimap;
