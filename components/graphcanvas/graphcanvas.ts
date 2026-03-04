/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: GraphCanvas
 * 📜 PURPOSE: Interactive SVG graph visualization with multiple layout
 *             algorithms, zoom/pan, selection, edge creation, keyboard
 *             shortcuts, and export. Works in schema and instance modes.
 * 🔗 RELATES: [[GraphToolbar]], [[PropertyInspector]], [[TypeBadge]]
 * ⚡ FLOW: [Consumer] -> [createGraphCanvas()] -> [GraphCanvas handle]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[GraphCanvas]";
const SVG_NS = "http://www.w3.org/2000/svg";

const DEFAULT_MIN_ZOOM = 0.1;
const DEFAULT_MAX_ZOOM = 4.0;
const ZOOM_STEP = 0.15;
const FIT_PADDING = 40;
const NUDGE_PX = 10;
const FORCE_ITERATIONS = 150;
const FORCE_REPULSION = 5000;
const FORCE_SPRING = 0.01;
const FORCE_DAMPING = 0.95;

const DEFAULT_NODE_W = 160;
const DEFAULT_NODE_H = 48;
const EDGE_HIT_WIDTH = 12;
const TOOLTIP_DELAY = 400;
const RUBBER_BAND_MIN = 5;

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/** Graph operating mode. */
export type GraphMode = "schema" | "instance";

/** Available layout algorithms. */
export type GraphLayout =
    | "force"
    | "hierarchical"
    | "radial"
    | "dagre"
    | "group-by-namespace";

/** Hierarchical layout direction. */
export type LayoutDirection = "TB" | "LR" | "BT" | "RL";

/** Node status in the graph. */
export type GraphNodeStatus = "active" | "planned" | "deprecated" | "external";

/** Edge line style. */
export type EdgeStyle = "solid" | "dashed" | "dotted";

/** Edge provenance type. */
export type EdgeProvenance = "manual" | "system" | "ai_inferred" | "integration";

export interface GraphNode
{
    id: string;
    label: string;
    sublabel?: string;
    type: string;
    namespace?: string;
    icon?: string;
    color?: string;
    status?: GraphNodeStatus;
    badge?: string;
    properties?: Record<string, unknown>;
    expandable?: boolean;
    expanded?: boolean;
    pinned?: boolean;
    x?: number;
    y?: number;
}

export interface GraphEdge
{
    id: string;
    sourceId: string;
    targetId: string;
    label?: string;
    type: string;
    style?: EdgeStyle;
    color?: string;
    width?: number;
    animated?: boolean;
    properties?: Record<string, unknown>;
    provenance?: EdgeProvenance;
    confidence?: number;
}

export interface GraphCanvasOptions
{
    container: HTMLElement;
    mode?: GraphMode;
    nodes?: GraphNode[];
    edges?: GraphEdge[];
    layout?: GraphLayout;
    layoutDirection?: LayoutDirection;
    theme?: "light" | "dark";
    nodeSize?: { width: number; height: number };
    showEdgeLabels?: boolean;
    showNodeIcons?: boolean;
    showMinimap?: boolean;
    showLegend?: boolean;
    groupByField?: string;
    zoomEnabled?: boolean;
    panEnabled?: boolean;
    selectEnabled?: boolean;
    multiSelectEnabled?: boolean;
    dragEnabled?: boolean;
    edgeCreationEnabled?: boolean;
    visibleNodeTypes?: string[];
    visibleEdgeTypes?: string[];
    maxDepth?: number;
    onNodeClick?: (node: GraphNode) => void;
    onNodeDoubleClick?: (node: GraphNode) => void;
    onNodeHover?: (node: GraphNode | null) => void;
    onEdgeClick?: (edge: GraphEdge) => void;
    onEdgeHover?: (edge: GraphEdge | null) => void;
    onSelectionChange?: (nodes: GraphNode[], edges: GraphEdge[]) => void;
    onEdgeCreated?: (sourceId: string, targetId: string) => void | Promise<void>;
    onExpandRequest?: (nodeId: string) => void | Promise<void>;
    onLayoutComplete?: () => void;
}

/** Internal position type. */
interface NodePos
{
    x: number;
    y: number;
}

/** Viewport transform state. */
interface ViewportState
{
    tx: number;
    ty: number;
    scale: number;
}

/** Selection state. */
interface SelectionState
{
    nodeIds: Set<string>;
    edgeIds: Set<string>;
}

/** Public API for GraphCanvas. */
export interface GraphCanvas
{
    setData(nodes: GraphNode[], edges: GraphEdge[]): void;
    addNode(node: GraphNode): void;
    addEdge(edge: GraphEdge): void;
    removeNode(nodeId: string): void;
    removeEdge(edgeId: string): void;
    updateNode(nodeId: string, updates: Partial<GraphNode>): void;
    updateEdge(edgeId: string, updates: Partial<GraphEdge>): void;
    getNodes(): GraphNode[];
    getEdges(): GraphEdge[];
    getSelectedNodes(): GraphNode[];
    getSelectedEdges(): GraphEdge[];
    selectNode(nodeId: string): void;
    selectEdge(edgeId: string): void;
    clearSelection(): void;
    zoomIn(): void;
    zoomOut(): void;
    zoomToFit(): void;
    zoomToNode(nodeId: string): void;
    getZoomLevel(): number;
    setZoomLevel(level: number): void;
    centerOnNode(nodeId: string): void;
    setLayout(layout: string, direction?: string): void;
    relayout(): void;
    setNodeFilter(typeKeys: string[] | null): void;
    setEdgeFilter(relationshipKeys: string[] | null): void;
    setDepthFilter(maxDepth: number): void;
    highlightPath(nodeIds: string[]): void;
    highlightNeighbors(nodeId: string, depth?: number): void;
    highlightBlastRadius(nodeId: string): void;
    clearHighlights(): void;
    exportSVG(): string;
    exportPNG(): Promise<Blob>;
    exportJSON(): { nodes: GraphNode[]; edges: GraphEdge[] };
    setMode(mode: GraphMode): void;
    getMode(): string;
    resize(): void;
    destroy(): void;
}

// ============================================================================
// SVG / DOM HELPERS
// ============================================================================

function svgCreate(
    tag: string,
    attrs?: Record<string, string>
): SVGElement
{
    const el = document.createElementNS(SVG_NS, tag);
    if (attrs)
    {
        for (const [k, v] of Object.entries(attrs))
        {
            el.setAttribute(k, v);
        }
    }
    return el;
}

function htmlEl(
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
    if (text) { el.textContent = text; }
    return el;
}

function setAttr(el: Element, key: string, val: string): void
{
    el.setAttribute(key, val);
}

// ============================================================================
// LAYOUT ALGORITHMS — Pure functions returning Map<id, NodePos>
// ============================================================================

/** Spring-embedder force layout. O(N²) repulsion + spring edges. */
function runForceLayout(
    nodes: GraphNode[],
    edges: GraphEdge[],
    w: number,
    h: number
): Map<string, NodePos>
{
    const pos = new Map<string, NodePos>();
    initRandomPositions(nodes, pos, w, h);

    const vel = new Map<string, { vx: number; vy: number }>();
    for (const n of nodes)
    {
        vel.set(n.id, { vx: 0, vy: 0 });
    }

    for (let iter = 0; iter < FORCE_ITERATIONS; iter++)
    {
        applyRepulsion(nodes, pos, vel);
        applySpringForces(edges, pos, vel);
        applyDampingStep(nodes, pos, vel);
    }
    centerPositions(pos, w, h);
    return pos;
}

/** Seed random positions within canvas bounds. */
function initRandomPositions(
    nodes: GraphNode[],
    pos: Map<string, NodePos>,
    w: number,
    h: number
): void
{
    for (const n of nodes)
    {
        const px = n.x ?? (w * 0.2 + Math.random() * w * 0.6);
        const py = n.y ?? (h * 0.2 + Math.random() * h * 0.6);
        pos.set(n.id, { x: px, y: py });
    }
}

/** Repulsion between all node pairs. */
function applyRepulsion(
    nodes: GraphNode[],
    pos: Map<string, NodePos>,
    vel: Map<string, { vx: number; vy: number }>
): void
{
    for (let i = 0; i < nodes.length; i++)
    {
        for (let j = i + 1; j < nodes.length; j++)
        {
            const a = pos.get(nodes[i].id)!;
            const b = pos.get(nodes[j].id)!;
            let dx = b.x - a.x;
            let dy = b.y - a.y;
            const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
            const force = FORCE_REPULSION / (dist * dist);
            dx = (dx / dist) * force;
            dy = (dy / dist) * force;
            vel.get(nodes[i].id)!.vx -= dx;
            vel.get(nodes[i].id)!.vy -= dy;
            vel.get(nodes[j].id)!.vx += dx;
            vel.get(nodes[j].id)!.vy += dy;
        }
    }
}

/** Spring attraction along edges. */
function applySpringForces(
    edges: GraphEdge[],
    pos: Map<string, NodePos>,
    vel: Map<string, { vx: number; vy: number }>
): void
{
    for (const e of edges)
    {
        const a = pos.get(e.sourceId);
        const b = pos.get(e.targetId);
        if (!a || !b) { continue; }
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const fx = dx * FORCE_SPRING;
        const fy = dy * FORCE_SPRING;
        const va = vel.get(e.sourceId);
        const vb = vel.get(e.targetId);
        if (va) { va.vx += fx; va.vy += fy; }
        if (vb) { vb.vx -= fx; vb.vy -= fy; }
    }
}

/** Apply damping and update positions. */
function applyDampingStep(
    nodes: GraphNode[],
    pos: Map<string, NodePos>,
    vel: Map<string, { vx: number; vy: number }>
): void
{
    for (const n of nodes)
    {
        if (n.pinned) { continue; }
        const v = vel.get(n.id)!;
        const p = pos.get(n.id)!;
        v.vx *= FORCE_DAMPING;
        v.vy *= FORCE_DAMPING;
        p.x += v.vx;
        p.y += v.vy;
    }
}

/** Center all positions around (w/2, h/2). */
function centerPositions(
    pos: Map<string, NodePos>,
    w: number,
    h: number
): void
{
    let cx = 0;
    let cy = 0;
    let count = 0;
    pos.forEach((p) => { cx += p.x; cy += p.y; count++; });
    if (count === 0) { return; }
    cx /= count;
    cy /= count;
    const ox = w / 2 - cx;
    const oy = h / 2 - cy;
    pos.forEach((p) => { p.x += ox; p.y += oy; });
}

/** BFS-based hierarchical layout (Sugiyama-lite). */
function runHierarchicalLayout(
    nodes: GraphNode[],
    edges: GraphEdge[],
    w: number,
    h: number,
    direction: LayoutDirection
): Map<string, NodePos>
{
    const pos = new Map<string, NodePos>();
    const levels = assignBfsLevels(nodes, edges);
    const groups = groupByLevel(nodes, levels);
    arrangeHierarchical(groups, pos, w, h, direction);
    return pos;
}

/** BFS level assignment from roots. */
function assignBfsLevels(
    nodes: GraphNode[],
    edges: GraphEdge[]
): Map<string, number>
{
    const levels = new Map<string, number>();
    const children = new Map<string, string[]>();
    const hasParent = new Set<string>();

    for (const e of edges)
    {
        if (!children.has(e.sourceId))
        {
            children.set(e.sourceId, []);
        }
        children.get(e.sourceId)!.push(e.targetId);
        hasParent.add(e.targetId);
    }

    const roots = nodes.filter((n) => !hasParent.has(n.id));
    if (roots.length === 0 && nodes.length > 0)
    {
        roots.push(nodes[0]);
    }

    const queue: string[] = [];
    for (const r of roots)
    {
        levels.set(r.id, 0);
        queue.push(r.id);
    }

    while (queue.length > 0)
    {
        const id = queue.shift()!;
        const lvl = levels.get(id)!;
        const ch = children.get(id) ?? [];
        for (const c of ch)
        {
            if (!levels.has(c))
            {
                levels.set(c, lvl + 1);
                queue.push(c);
            }
        }
    }

    // Assign unvisited nodes
    for (const n of nodes)
    {
        if (!levels.has(n.id)) { levels.set(n.id, 0); }
    }
    return levels;
}

/** Group node IDs by their BFS level. */
function groupByLevel(
    nodes: GraphNode[],
    levels: Map<string, number>
): Map<number, string[]>
{
    const groups = new Map<number, string[]>();
    for (const n of nodes)
    {
        const lvl = levels.get(n.id) ?? 0;
        if (!groups.has(lvl)) { groups.set(lvl, []); }
        groups.get(lvl)!.push(n.id);
    }
    return groups;
}

/** Arrange groups into rows/columns based on direction. */
function arrangeHierarchical(
    groups: Map<number, string[]>,
    pos: Map<string, NodePos>,
    w: number,
    h: number,
    direction: LayoutDirection
): void
{
    const maxLevel = Math.max(0, ...groups.keys());
    const isVertical = direction === "TB" || direction === "BT";
    const spacing = isVertical
        ? h / (maxLevel + 2)
        : w / (maxLevel + 2);

    for (const [level, ids] of groups)
    {
        const count = ids.length;
        const cross = isVertical ? w : h;
        const gap = cross / (count + 1);
        const along = spacing * (level + 1);

        for (let i = 0; i < count; i++)
        {
            const crossPos = gap * (i + 1);
            if (direction === "TB")
            {
                pos.set(ids[i], { x: crossPos, y: along });
            }
            else if (direction === "BT")
            {
                pos.set(ids[i], { x: crossPos, y: h - along });
            }
            else if (direction === "LR")
            {
                pos.set(ids[i], { x: along, y: crossPos });
            }
            else
            {
                pos.set(ids[i], { x: w - along, y: crossPos });
            }
        }
    }
}

/** BFS-based radial layout — concentric rings. */
function runRadialLayout(
    nodes: GraphNode[],
    edges: GraphEdge[],
    w: number,
    h: number
): Map<string, NodePos>
{
    const pos = new Map<string, NodePos>();
    const levels = assignBfsLevels(nodes, edges);
    const groups = groupByLevel(nodes, levels);
    const cx = w / 2;
    const cy = h / 2;
    const maxLevel = Math.max(0, ...groups.keys());
    const ringStep = Math.min(w, h) / (2 * (maxLevel + 2));

    for (const [level, ids] of groups)
    {
        if (level === 0)
        {
            arrangeRadialCenter(ids, pos, cx, cy);
            continue;
        }
        arrangeRadialRing(ids, pos, cx, cy, ringStep * level);
    }
    return pos;
}

/** Place center-level nodes at the origin. */
function arrangeRadialCenter(
    ids: string[],
    pos: Map<string, NodePos>,
    cx: number,
    cy: number
): void
{
    if (ids.length === 1)
    {
        pos.set(ids[0], { x: cx, y: cy });
        return;
    }
    const step = (2 * Math.PI) / ids.length;
    for (let i = 0; i < ids.length; i++)
    {
        pos.set(ids[i], {
            x: cx + 30 * Math.cos(step * i),
            y: cy + 30 * Math.sin(step * i)
        });
    }
}

/** Place nodes on a ring at given radius. */
function arrangeRadialRing(
    ids: string[],
    pos: Map<string, NodePos>,
    cx: number,
    cy: number,
    radius: number
): void
{
    const step = (2 * Math.PI) / ids.length;
    for (let i = 0; i < ids.length; i++)
    {
        pos.set(ids[i], {
            x: cx + radius * Math.cos(step * i - Math.PI / 2),
            y: cy + radius * Math.sin(step * i - Math.PI / 2)
        });
    }
}

/** Group nodes by namespace, arrange groups in grid, mini force within. */
function runGroupByNamespaceLayout(
    nodes: GraphNode[],
    edges: GraphEdge[],
    w: number,
    h: number
): Map<string, NodePos>
{
    const pos = new Map<string, NodePos>();
    const nsGroups = partitionByNamespace(nodes);
    const nsKeys = Array.from(nsGroups.keys());
    const cols = Math.ceil(Math.sqrt(nsKeys.length));
    const cellW = w / cols;
    const cellH = h / Math.ceil(nsKeys.length / cols);

    for (let i = 0; i < nsKeys.length; i++)
    {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const ox = col * cellW;
        const oy = row * cellH;
        const groupNodes = nsGroups.get(nsKeys[i])!;
        const groupEdges = edges.filter((e) =>
        {
            const sids = new Set(groupNodes.map((n) => n.id));
            return sids.has(e.sourceId) && sids.has(e.targetId);
        });
        const sub = runForceLayout(groupNodes, groupEdges, cellW, cellH);
        sub.forEach((p, id) =>
        {
            pos.set(id, { x: p.x + ox, y: p.y + oy });
        });
    }
    return pos;
}

/** Partition nodes by namespace field. */
function partitionByNamespace(
    nodes: GraphNode[]
): Map<string, GraphNode[]>
{
    const groups = new Map<string, GraphNode[]>();
    for (const n of nodes)
    {
        const ns = n.namespace ?? "default";
        if (!groups.has(ns)) { groups.set(ns, []); }
        groups.get(ns)!.push(n);
    }
    return groups;
}

// ============================================================================
// GRAPH CANVAS IMPLEMENTATION
// ============================================================================

class GraphCanvasImpl implements GraphCanvas
{
    private opts: Required<Pick<GraphCanvasOptions, "container">> & GraphCanvasOptions;
    private nodes: GraphNode[] = [];
    private edges: GraphEdge[] = [];
    private positions: Map<string, NodePos> = new Map();
    private viewport: ViewportState = { tx: 0, ty: 0, scale: 1 };
    private selection: SelectionState = { nodeIds: new Set(), edgeIds: new Set() };
    private highlightedIds: Set<string> = new Set();
    private mode: GraphMode;
    private layout: GraphLayout;
    private layoutDirection: LayoutDirection;
    private nodeW: number;
    private nodeH: number;
    private minZoom: number;
    private maxZoom: number;
    private nodeFilter: string[] | null = null;
    private edgeFilter: string[] | null = null;

    // DOM refs
    private root: HTMLElement | null = null;
    private svg: SVGElement | null = null;
    private transformG: SVGElement | null = null;
    private groupsG: SVGElement | null = null;
    private edgesG: SVGElement | null = null;
    private nodesG: SVGElement | null = null;
    private overlayG: SVGElement | null = null;
    private tooltipEl: HTMLElement | null = null;
    private contextMenuEl: HTMLElement | null = null;
    private liveRegion: HTMLElement | null = null;
    private nodeElements: Map<string, SVGElement> = new Map();
    private edgeElements: Map<string, SVGElement> = new Map();

    // Interaction state
    private isPanning = false;
    private panStart = { x: 0, y: 0 };
    private isDragging = false;
    private dragNodeId: string | null = null;
    private dragStart = { x: 0, y: 0 };
    private isRubberBand = false;
    private rubberBandStart = { x: 0, y: 0 };
    private rubberBandRect: SVGElement | null = null;
    private isCreatingEdge = false;
    private edgeSourceId: string | null = null;
    private tempEdgeLine: SVGElement | null = null;
    private tooltipTimer: number | null = null;

    // Bound handlers for cleanup
    private boundWheel: ((e: WheelEvent) => void) | null = null;
    private boundPointerDown: ((e: PointerEvent) => void) | null = null;
    private boundPointerMove: ((e: PointerEvent) => void) | null = null;
    private boundPointerUp: ((e: PointerEvent) => void) | null = null;
    private boundKeyDown: ((e: KeyboardEvent) => void) | null = null;
    private boundContextMenu: ((e: MouseEvent) => void) | null = null;

    constructor(opts: GraphCanvasOptions)
    {
        this.opts = opts as typeof this.opts;
        this.mode = opts.mode ?? "schema";
        this.layout = opts.layout ?? "force";
        this.layoutDirection = opts.layoutDirection ?? "TB";
        this.nodeW = opts.nodeSize?.width ?? DEFAULT_NODE_W;
        this.nodeH = opts.nodeSize?.height ?? DEFAULT_NODE_H;
        this.minZoom = DEFAULT_MIN_ZOOM;
        this.maxZoom = DEFAULT_MAX_ZOOM;

        this.buildRoot();
        this.bindEvents();

        if (opts.nodes && opts.nodes.length > 0)
        {
            this.setData(opts.nodes, opts.edges ?? []);
        }
        console.log(LOG_PREFIX, "Created canvas, mode:", this.mode);
    }

    // ====================================================================
    // LIFECYCLE
    // ====================================================================

    private buildRoot(): void
    {
        this.root = htmlEl("div", { class: "gc-root" });
        this.root.setAttribute("tabindex", "0");
        this.buildSvgLayers();
        this.buildTooltip();
        this.buildContextMenu();
        this.buildLiveRegion();
        this.opts.container.appendChild(this.root);
    }

    private buildSvgLayers(): void
    {
        this.svg = svgCreate("svg", {
            class: "gc-svg",
            role: "application",
            "aria-label": "Graph canvas"
        }) as SVGElement;

        const defs = svgCreate("defs");
        this.buildArrowMarkers(defs);
        this.svg.appendChild(defs);

        this.transformG = svgCreate("g", { class: "gc-transform" });
        this.groupsG = svgCreate("g", { class: "gc-groups" });
        this.edgesG = svgCreate("g", { class: "gc-edges" });
        this.nodesG = svgCreate("g", { class: "gc-nodes" });
        this.overlayG = svgCreate("g", { class: "gc-overlay" });

        this.transformG.appendChild(this.groupsG);
        this.transformG.appendChild(this.edgesG);
        this.transformG.appendChild(this.nodesG);
        this.transformG.appendChild(this.overlayG);
        this.svg.appendChild(this.transformG);
        this.root!.appendChild(this.svg);
    }

    private buildArrowMarkers(defs: SVGElement): void
    {
        const marker = svgCreate("marker", {
            id: "gc-arrow",
            viewBox: "0 0 10 10",
            refX: "10",
            refY: "5",
            markerWidth: "8",
            markerHeight: "8",
            orient: "auto-start-reverse"
        });
        const path = svgCreate("path", {
            d: "M 0 0 L 10 5 L 0 10 z",
            fill: "#64748b"
        });
        marker.appendChild(path);
        defs.appendChild(marker);
    }

    private buildTooltip(): void
    {
        this.tooltipEl = htmlEl("div", { class: "gc-tooltip" });
        this.tooltipEl.style.display = "none";
        this.root!.appendChild(this.tooltipEl);
    }

    private buildContextMenu(): void
    {
        this.contextMenuEl = htmlEl("div", { class: "gc-context-menu" });
        this.contextMenuEl.style.display = "none";
        this.root!.appendChild(this.contextMenuEl);
    }

    private buildLiveRegion(): void
    {
        this.liveRegion = htmlEl("div", {
            class: "gc-live",
            "aria-live": "polite",
            "aria-atomic": "true"
        });
        this.liveRegion.style.cssText =
            "position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)";
        this.root!.appendChild(this.liveRegion);
    }

    // ====================================================================
    // EVENT BINDING
    // ====================================================================

    private bindEvents(): void
    {
        this.boundWheel = (e) => { this.onWheel(e); };
        this.boundPointerDown = (e) => { this.onPointerDown(e); };
        this.boundPointerMove = (e) => { this.onPointerMove(e); };
        this.boundPointerUp = (e) => { this.onPointerUp(e); };
        this.boundKeyDown = (e) => { this.onKeyDown(e); };
        this.boundContextMenu = (e) => { this.onContextMenuEvent(e); };

        this.root!.addEventListener("wheel", this.boundWheel, { passive: false });
        this.root!.addEventListener("pointerdown", this.boundPointerDown);
        this.root!.addEventListener("pointermove", this.boundPointerMove);
        this.root!.addEventListener("pointerup", this.boundPointerUp);
        this.root!.addEventListener("keydown", this.boundKeyDown);
        this.root!.addEventListener("contextmenu", this.boundContextMenu);
    }

    private unbindEvents(): void
    {
        if (!this.root) { return; }
        if (this.boundWheel) { this.root.removeEventListener("wheel", this.boundWheel); }
        if (this.boundPointerDown) { this.root.removeEventListener("pointerdown", this.boundPointerDown); }
        if (this.boundPointerMove) { this.root.removeEventListener("pointermove", this.boundPointerMove); }
        if (this.boundPointerUp) { this.root.removeEventListener("pointerup", this.boundPointerUp); }
        if (this.boundKeyDown) { this.root.removeEventListener("keydown", this.boundKeyDown); }
        if (this.boundContextMenu) { this.root.removeEventListener("contextmenu", this.boundContextMenu); }
    }

    // ====================================================================
    // PUBLIC API — DATA
    // ====================================================================

    /** Replace all nodes and edges, recompute layout, and re-render. */
    public setData(nodes: GraphNode[], edges: GraphEdge[]): void
    {
        this.nodes = [...nodes];
        this.edges = [...edges];
        this.computeLayout();
        this.renderAll();
    }

    /** Add a single node, recompute layout, and re-render. */
    public addNode(node: GraphNode): void
    {
        this.nodes.push(node);
        this.computeLayout();
        this.renderAll();
    }

    /** Add a single edge and re-render. */
    public addEdge(edge: GraphEdge): void
    {
        this.edges.push(edge);
        this.renderAll();
    }

    /** Remove a node and all its connected edges, then re-render. */
    public removeNode(nodeId: string): void
    {
        this.nodes = this.nodes.filter((n) => n.id !== nodeId);
        this.edges = this.edges.filter(
            (e) => e.sourceId !== nodeId && e.targetId !== nodeId
        );
        this.selection.nodeIds.delete(nodeId);
        this.positions.delete(nodeId);
        this.renderAll();
    }

    /** Remove an edge by ID and re-render. */
    public removeEdge(edgeId: string): void
    {
        this.edges = this.edges.filter((e) => e.id !== edgeId);
        this.selection.edgeIds.delete(edgeId);
        this.renderAll();
    }

    /** Merge partial updates into an existing node and re-render. */
    public updateNode(nodeId: string, updates: Partial<GraphNode>): void
    {
        const node = this.nodes.find((n) => n.id === nodeId);
        if (node) { Object.assign(node, updates); this.renderAll(); }
    }

    /** Merge partial updates into an existing edge and re-render. */
    public updateEdge(edgeId: string, updates: Partial<GraphEdge>): void
    {
        const edge = this.edges.find((e) => e.id === edgeId);
        if (edge) { Object.assign(edge, updates); this.renderAll(); }
    }

    /** Return a copy of all nodes. */
    public getNodes(): GraphNode[] { return [...this.nodes]; }
    /** Return a copy of all edges. */
    public getEdges(): GraphEdge[] { return [...this.edges]; }

    // ====================================================================
    // PUBLIC API — SELECTION
    // ====================================================================

    /** Return all currently selected nodes. */
    public getSelectedNodes(): GraphNode[]
    {
        return this.nodes.filter((n) => this.selection.nodeIds.has(n.id));
    }

    /** Return all currently selected edges. */
    public getSelectedEdges(): GraphEdge[]
    {
        return this.edges.filter((e) => this.selection.edgeIds.has(e.id));
    }

    /** Select a single node by ID, clearing previous selection. */
    public selectNode(nodeId: string): void
    {
        this.selectNodeInternal(nodeId, false);
    }

    /** Select a single edge by ID, clearing previous selection. */
    public selectEdge(edgeId: string): void
    {
        this.selectEdgeInternal(edgeId, false);
    }

    /** Clear all node and edge selections. */
    public clearSelection(): void
    {
        this.clearSelectionInternal();
    }

    // ====================================================================
    // PUBLIC API — VIEWPORT
    // ====================================================================

    /** Increase the zoom level by one step. */
    public zoomIn(): void
    {
        this.setZoomLevel(this.viewport.scale + ZOOM_STEP);
    }

    /** Decrease the zoom level by one step. */
    public zoomOut(): void
    {
        this.setZoomLevel(this.viewport.scale - ZOOM_STEP);
    }

    /** Adjust zoom and pan to fit all nodes within the viewport. */
    public zoomToFit(): void
    {
        const bbox = this.computeBBox();
        if (!bbox) { return; }
        this.zoomToRect(bbox.x, bbox.y, bbox.w, bbox.h);
    }

    /** Center on a node and zoom in to 1.5x magnification. */
    public zoomToNode(nodeId: string): void
    {
        this.centerOnNode(nodeId);
        this.setZoomLevel(1.5);
    }

    /** Return the current zoom scale factor. */
    public getZoomLevel(): number { return this.viewport.scale; }

    /** Set the zoom scale factor, clamped to min/max bounds. */
    public setZoomLevel(level: number): void
    {
        this.viewport.scale = Math.max(
            this.minZoom,
            Math.min(this.maxZoom, level)
        );
        this.applyTransform();
    }

    /** Pan the viewport to center on the given node. */
    public centerOnNode(nodeId: string): void
    {
        const pos = this.positions.get(nodeId);
        if (!pos || !this.svg) { return; }
        const rect = this.svg.getBoundingClientRect();
        this.viewport.tx = rect.width / 2 - pos.x * this.viewport.scale;
        this.viewport.ty = rect.height / 2 - pos.y * this.viewport.scale;
        this.applyTransform();
    }

    // ====================================================================
    // PUBLIC API — LAYOUT
    // ====================================================================

    /** Switch the layout algorithm and optionally set direction, then relayout. */
    public setLayout(layout: string, direction?: string): void
    {
        this.layout = layout as GraphLayout;
        if (direction) { this.layoutDirection = direction as LayoutDirection; }
        this.relayout();
    }

    /** Recompute the current layout and re-render all elements. */
    public relayout(): void
    {
        this.computeLayout();
        this.renderAll();
        this.opts.onLayoutComplete?.();
    }

    // ====================================================================
    // PUBLIC API — FILTERING
    // ====================================================================

    /** Filter visible nodes by type keys, or pass null to show all. */
    public setNodeFilter(typeKeys: string[] | null): void
    {
        this.nodeFilter = typeKeys;
        this.renderAll();
    }

    /** Filter visible edges by relationship type keys, or pass null to show all. */
    public setEdgeFilter(relationshipKeys: string[] | null): void
    {
        this.edgeFilter = relationshipKeys;
        this.renderAll();
    }

    /** Set depth filter (delegated to the application layer via onExpandRequest). */
    public setDepthFilter(_maxDepth: number): void
    {
        // Depth filtering handled by app layer via onExpandRequest
        console.log(LOG_PREFIX, "Depth filter set (handled externally).");
    }

    // ====================================================================
    // PUBLIC API — HIGHLIGHTING
    // ====================================================================

    /** Highlight a specific set of nodes by their IDs. */
    public highlightPath(nodeIds: string[]): void
    {
        this.highlightedIds = new Set(nodeIds);
        this.applyHighlightState();
    }

    /** Highlight a node and its neighbors up to the given BFS depth. */
    public highlightNeighbors(nodeId: string, depth = 1): void
    {
        const ids = this.collectNeighborIds(nodeId, depth);
        ids.add(nodeId);
        this.highlightedIds = ids;
        this.applyHighlightState();
    }

    /** Highlight the full blast radius (up to depth 10) from a node. */
    public highlightBlastRadius(nodeId: string): void
    {
        this.highlightNeighbors(nodeId, 10);
    }

    /** Remove all node and edge highlights. */
    public clearHighlights(): void
    {
        this.highlightedIds.clear();
        this.applyHighlightState();
    }

    // ====================================================================
    // PUBLIC API — EXPORT
    // ====================================================================

    /** Serialize the current SVG to a string. */
    public exportSVG(): string
    {
        if (!this.svg) { return ""; }
        return new XMLSerializer().serializeToString(this.svg);
    }

    /** Render the graph to a 2x resolution PNG blob. */
    public async exportPNG(): Promise<Blob>
    {
        const svgStr = this.exportSVG();
        const canvas = document.createElement("canvas");
        const rect = this.svg!.getBoundingClientRect();
        canvas.width = rect.width * 2;
        canvas.height = rect.height * 2;
        const ctx = canvas.getContext("2d")!;
        const img = new Image();
        const blob = new Blob([svgStr], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);

        return new Promise((resolve) =>
        {
            img.onload = () =>
            {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                URL.revokeObjectURL(url);
                canvas.toBlob((b) => { resolve(b!); }, "image/png");
            };
            img.src = url;
        });
    }

    /** Export the current graph data as a JSON-serializable object. */
    public exportJSON(): { nodes: GraphNode[]; edges: GraphEdge[] }
    {
        return { nodes: [...this.nodes], edges: [...this.edges] };
    }

    // ====================================================================
    // PUBLIC API — MODE & LIFECYCLE
    // ====================================================================

    /** Switch between schema and instance mode, then re-render. */
    public setMode(mode: GraphMode): void
    {
        this.mode = mode;
        this.renderAll();
    }

    /** Return the current graph mode ("schema" or "instance"). */
    public getMode(): string { return this.mode; }

    /** Re-render the graph to fit the current container dimensions. */
    public resize(): void
    {
        this.renderAll();
    }

    /** Tear down event listeners, clear timers, and remove the DOM tree. */
    public destroy(): void
    {
        this.unbindEvents();
        if (this.tooltipTimer) { clearTimeout(this.tooltipTimer); }
        if (this.root?.parentNode)
        {
            this.root.parentNode.removeChild(this.root);
        }
        this.root = null;
        this.svg = null;
        console.log(LOG_PREFIX, "Destroyed.");
    }

    // ====================================================================
    // INTERNAL — LAYOUT
    // ====================================================================

    private computeLayout(): void
    {
        if (!this.svg) { return; }
        const rect = this.svg.getBoundingClientRect();
        const w = rect.width || 800;
        const h = rect.height || 600;
        this.positions = this.dispatchLayout(w, h);
    }

    private dispatchLayout(w: number, h: number): Map<string, NodePos>
    {
        const visible = this.nodes.filter((n) => this.isNodeVisible(n));

        // Optional dagre probe
        if (this.layout === "dagre")
        {
            const dagre = (window as unknown as Record<string, unknown>)["dagre"];
            if (!dagre)
            {
                console.log(LOG_PREFIX, "dagre not found, falling back to hierarchical.");
                return runHierarchicalLayout(
                    visible, this.edges, w, h, this.layoutDirection
                );
            }
        }

        switch (this.layout)
        {
            case "hierarchical":
            case "dagre":
                return runHierarchicalLayout(
                    visible, this.edges, w, h, this.layoutDirection
                );
            case "radial":
                return runRadialLayout(visible, this.edges, w, h);
            case "group-by-namespace":
                return runGroupByNamespaceLayout(visible, this.edges, w, h);
            default:
                return runForceLayout(visible, this.edges, w, h);
        }
    }

    // ====================================================================
    // INTERNAL — RENDER
    // ====================================================================

    private renderAll(): void
    {
        this.renderGroupBackgrounds();
        this.renderEdges();
        this.renderNodes();
        this.applyTransform();
        this.updateSelectionVisuals();
        this.applyHighlightState();
    }

    private renderGroupBackgrounds(): void
    {
        if (!this.groupsG) { return; }
        this.groupsG.innerHTML = "";

        if (this.layout !== "group-by-namespace") { return; }

        const nsGroups = partitionByNamespace(
            this.nodes.filter((n) => this.isNodeVisible(n))
        );
        const colors = ["#dbeafe", "#dcfce7", "#fef3c7", "#fce7f3", "#e0e7ff"];
        let ci = 0;

        for (const [ns, groupNodes] of nsGroups)
        {
            this.renderOneGroupBg(ns, groupNodes, colors[ci % colors.length]);
            ci++;
        }
    }

    private renderOneGroupBg(
        ns: string,
        groupNodes: GraphNode[],
        bgColor: string
    ): void
    {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (const n of groupNodes)
        {
            const p = this.positions.get(n.id);
            if (!p) { continue; }
            if (p.x < minX) { minX = p.x; }
            if (p.y < minY) { minY = p.y; }
            if (p.x > maxX) { maxX = p.x; }
            if (p.y > maxY) { maxY = p.y; }
        }
        if (minX === Infinity) { return; }

        const pad = 40;
        const rect = svgCreate("rect", {
            x: String(minX - this.nodeW / 2 - pad),
            y: String(minY - this.nodeH / 2 - pad),
            width: String(maxX - minX + this.nodeW + pad * 2),
            height: String(maxY - minY + this.nodeH + pad * 2),
            fill: bgColor,
            "fill-opacity": "0.3",
            stroke: bgColor,
            "stroke-width": "1"
        });
        this.groupsG!.appendChild(rect);

        const label = svgCreate("text", {
            x: String(minX - this.nodeW / 2 - pad + 8),
            y: String(minY - this.nodeH / 2 - pad + 16),
            fill: "#475569",
            "font-size": "12",
            "font-weight": "600"
        });
        label.textContent = ns;
        this.groupsG!.appendChild(label);
    }

    private renderEdges(): void
    {
        if (!this.edgesG) { return; }
        this.edgesG.innerHTML = "";
        this.edgeElements.clear();

        for (const edge of this.edges)
        {
            if (!this.isEdgeVisible(edge)) { continue; }
            this.renderOneEdge(edge);
        }
    }

    private renderOneEdge(edge: GraphEdge): void
    {
        const sp = this.positions.get(edge.sourceId);
        const tp = this.positions.get(edge.targetId);
        if (!sp || !tp) { return; }

        const g = svgCreate("g", {
            class: "gc-edge",
            "data-edge-id": edge.id
        });

        const d = this.computeEdgePath(sp, tp);
        const color = edge.color ?? "#94a3b8";
        const width = edge.width ?? 1.5;

        // Invisible wide hitbox
        g.appendChild(svgCreate("path", {
            d,
            stroke: "transparent",
            "stroke-width": String(EDGE_HIT_WIDTH),
            fill: "none"
        }));

        // Visible path
        const pathAttrs: Record<string, string> = {
            d,
            stroke: color,
            "stroke-width": String(width),
            fill: "none",
            "marker-end": "url(#gc-arrow)"
        };
        if (edge.style === "dashed") { pathAttrs["stroke-dasharray"] = "6,3"; }
        if (edge.style === "dotted") { pathAttrs["stroke-dasharray"] = "2,3"; }
        g.appendChild(svgCreate("path", pathAttrs));

        // Edge label
        if (this.opts.showEdgeLabels !== false && edge.label)
        {
            this.renderEdgeLabel(g, sp, tp, edge.label, color);
        }

        // Confidence badge for AI edges
        if (edge.provenance === "ai_inferred" && edge.confidence != null)
        {
            this.renderEdgeConfidence(g, sp, tp, edge.confidence);
        }

        g.addEventListener("click", (e) =>
        {
            e.stopPropagation();
            this.onEdgeClick(edge);
        });
        g.addEventListener("mouseenter", () =>
        {
            this.opts.onEdgeHover?.(edge);
            this.showTooltip(this.buildEdgeTooltipContent(edge));
        });
        g.addEventListener("mouseleave", () =>
        {
            this.opts.onEdgeHover?.(null);
            this.hideTooltip();
        });

        this.edgesG!.appendChild(g);
        this.edgeElements.set(edge.id, g);
    }

    private renderEdgeLabel(
        g: SVGElement,
        sp: NodePos,
        tp: NodePos,
        label: string,
        color: string
    ): void
    {
        const mx = (sp.x + tp.x) / 2;
        const my = (sp.y + tp.y) / 2 - 8;
        const text = svgCreate("text", {
            x: String(mx),
            y: String(my),
            fill: color,
            "font-size": "10",
            "text-anchor": "middle"
        });
        text.textContent = label;
        g.appendChild(text);
    }

    private renderEdgeConfidence(
        g: SVGElement,
        sp: NodePos,
        tp: NodePos,
        confidence: number
    ): void
    {
        const mx = (sp.x + tp.x) / 2;
        const my = (sp.y + tp.y) / 2 + 10;
        const text = svgCreate("text", {
            x: String(mx),
            y: String(my),
            fill: "#6f42c1",
            "font-size": "9",
            "text-anchor": "middle"
        });
        text.textContent = `${Math.round(confidence * 100)}%`;
        g.appendChild(text);
    }

    private computeEdgePath(sp: NodePos, tp: NodePos): string
    {
        return this.cubicBezierPath(sp, tp);
    }

    private cubicBezierPath(sp: NodePos, tp: NodePos): string
    {
        const dx = tp.x - sp.x;
        const dy = tp.y - sp.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const offset = Math.min(dist * 0.3, 80);
        const cx1 = sp.x + offset;
        const cy1 = sp.y;
        const cx2 = tp.x - offset;
        const cy2 = tp.y;
        return `M ${sp.x} ${sp.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${tp.x} ${tp.y}`;
    }

    private renderNodes(): void
    {
        if (!this.nodesG) { return; }
        this.nodesG.innerHTML = "";
        this.nodeElements.clear();

        for (const node of this.nodes)
        {
            if (!this.isNodeVisible(node)) { continue; }
            this.renderOneNode(node);
        }
    }

    private renderOneNode(node: GraphNode): void
    {
        const pos = this.positions.get(node.id);
        if (!pos) { return; }

        const g = this.buildNodeGroup(node, pos);
        this.nodesG!.appendChild(g);
        this.nodeElements.set(node.id, g);
    }

    private buildNodeGroup(node: GraphNode, pos: NodePos): SVGElement
    {
        const g = svgCreate("g", {
            class: "gc-node",
            "data-node-id": node.id,
            transform: `translate(${pos.x - this.nodeW / 2}, ${pos.y - this.nodeH / 2})`
        });

        g.appendChild(this.buildNodeRect(node));

        let textX = 8;
        if (this.opts.showNodeIcons !== false && node.icon)
        {
            g.appendChild(this.buildNodeIcon(node.icon));
            textX = 26;
        }

        this.buildNodeLabels(g, node, textX);

        if (node.badge)
        {
            g.appendChild(this.buildNodeBadge(node.badge));
        }
        if (node.expandable)
        {
            g.appendChild(this.buildExpandIndicator(node.expanded === true));
        }

        this.registerNodeGroup(g, node);
        return g;
    }

    private buildNodeRect(node: GraphNode): SVGElement
    {
        const color = node.color ?? "#e2e8f0";
        const attrs: Record<string, string> = {
            width: String(this.nodeW),
            height: String(this.nodeH),
            fill: color,
            "fill-opacity": "0.15",
            stroke: color,
            "stroke-width": "1.5"
        };
        if (node.status === "planned")
        {
            attrs["stroke-dasharray"] = "4,3";
        }
        if (node.status === "deprecated")
        {
            attrs["opacity"] = "0.4";
        }
        if (node.status === "external")
        {
            attrs["stroke-dasharray"] = "2,3";
        }
        return svgCreate("rect", attrs);
    }

    private buildNodeIcon(icon: string): SVGElement
    {
        const text = svgCreate("text", {
            x: "14",
            y: String(this.nodeH / 2 + 4),
            "font-family": "bootstrap-icons",
            "font-size": "14",
            fill: "#475569",
            "text-anchor": "middle"
        });
        text.textContent = icon;
        return text;
    }

    private buildNodeLabels(
        g: SVGElement,
        node: GraphNode,
        textX: number
    ): void
    {
        const label = svgCreate("text", {
            x: String(textX),
            y: String(this.nodeH / 2 - (node.sublabel ? 2 : -4)),
            fill: "#0f172a",
            "font-size": "12",
            "font-weight": "600"
        });
        label.textContent = node.label;
        g.appendChild(label);

        if (node.sublabel)
        {
            const sub = svgCreate("text", {
                x: String(textX),
                y: String(this.nodeH / 2 + 12),
                fill: "#64748b",
                "font-size": "10"
            });
            sub.textContent = node.sublabel;
            g.appendChild(sub);
        }
    }

    private buildNodeBadge(badge: string): SVGElement
    {
        const g = svgCreate("g");
        const rect = svgCreate("rect", {
            x: String(this.nodeW - 28),
            y: "2",
            width: "26",
            height: "16",
            fill: "#475569",
            rx: "0"
        });
        const text = svgCreate("text", {
            x: String(this.nodeW - 15),
            y: "13",
            fill: "#f8fafc",
            "font-size": "9",
            "text-anchor": "middle"
        });
        text.textContent = badge;
        g.appendChild(rect);
        g.appendChild(text);
        return g;
    }

    private buildExpandIndicator(expanded: boolean): SVGElement
    {
        const text = svgCreate("text", {
            x: String(this.nodeW - 12),
            y: String(this.nodeH - 4),
            fill: "#1c7ed6",
            "font-size": "14",
            "font-weight": "700",
            "text-anchor": "middle",
            class: "gc-expand-indicator",
            style: "cursor:pointer"
        });
        text.textContent = expanded ? "\u2212" : "+";
        return text;
    }

    private registerNodeGroup(g: SVGElement, node: GraphNode): void
    {
        g.addEventListener("click", (e) =>
        {
            e.stopPropagation();
            this.onNodeClick(node, e as MouseEvent);
        });
        g.addEventListener("dblclick", (e) =>
        {
            e.stopPropagation();
            this.onNodeDblClick(node);
        });
        g.addEventListener("mouseenter", () =>
        {
            this.opts.onNodeHover?.(node);
            this.showTooltip(this.buildNodeTooltipContent(node));
        });
        g.addEventListener("mouseleave", () =>
        {
            this.opts.onNodeHover?.(null);
            this.hideTooltip();
        });
        g.addEventListener("pointerdown", (e) =>
        {
            if (e.button === 0 && this.opts.dragEnabled !== false)
            {
                this.startDrag(node.id, e as PointerEvent);
            }
        });
    }

    // ====================================================================
    // INTERNAL — VIEWPORT
    // ====================================================================

    private applyTransform(): void
    {
        if (!this.transformG) { return; }
        setAttr(
            this.transformG,
            "transform",
            `translate(${this.viewport.tx}, ${this.viewport.ty}) scale(${this.viewport.scale})`
        );
    }

    private onWheel(e: WheelEvent): void
    {
        if (this.opts.zoomEnabled === false) { return; }
        e.preventDefault();
        const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
        const newScale = Math.max(
            this.minZoom,
            Math.min(this.maxZoom, this.viewport.scale + delta)
        );
        const rect = this.root!.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const ratio = newScale / this.viewport.scale;
        this.viewport.tx = mx - (mx - this.viewport.tx) * ratio;
        this.viewport.ty = my - (my - this.viewport.ty) * ratio;
        this.viewport.scale = newScale;
        this.applyTransform();
    }

    private startPan(e: PointerEvent): void
    {
        this.isPanning = true;
        this.panStart = { x: e.clientX - this.viewport.tx, y: e.clientY - this.viewport.ty };
    }

    private doPan(e: PointerEvent): void
    {
        this.viewport.tx = e.clientX - this.panStart.x;
        this.viewport.ty = e.clientY - this.panStart.y;
        this.applyTransform();
    }

    private endPan(): void
    {
        this.isPanning = false;
    }

    private zoomToRect(x: number, y: number, w: number, h: number): void
    {
        if (!this.svg) { return; }
        const svgRect = this.svg.getBoundingClientRect();
        const svgW = svgRect.width;
        const svgH = svgRect.height;
        const scale = Math.min(
            (svgW - FIT_PADDING * 2) / Math.max(w, 1),
            (svgH - FIT_PADDING * 2) / Math.max(h, 1),
            this.maxZoom
        );
        this.viewport.scale = Math.max(this.minZoom, scale);
        this.viewport.tx = svgW / 2 - (x + w / 2) * this.viewport.scale;
        this.viewport.ty = svgH / 2 - (y + h / 2) * this.viewport.scale;
        this.applyTransform();
    }

    private computeBBox(): { x: number; y: number; w: number; h: number } | null
    {
        if (this.positions.size === 0) { return null; }
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        this.positions.forEach((p) =>
        {
            if (p.x < minX) { minX = p.x; }
            if (p.y < minY) { minY = p.y; }
            if (p.x > maxX) { maxX = p.x; }
            if (p.y > maxY) { maxY = p.y; }
        });
        return {
            x: minX - this.nodeW / 2,
            y: minY - this.nodeH / 2,
            w: maxX - minX + this.nodeW,
            h: maxY - minY + this.nodeH
        };
    }

    // ====================================================================
    // INTERNAL — SELECTION
    // ====================================================================

    private selectNodeInternal(nodeId: string, multi: boolean): void
    {
        if (!multi) { this.selection.nodeIds.clear(); this.selection.edgeIds.clear(); }
        this.selection.nodeIds.add(nodeId);
        this.updateSelectionVisuals();
        this.fireSelectionChange();
    }

    private selectEdgeInternal(edgeId: string, multi: boolean): void
    {
        if (!multi) { this.selection.nodeIds.clear(); this.selection.edgeIds.clear(); }
        this.selection.edgeIds.add(edgeId);
        this.updateSelectionVisuals();
        this.fireSelectionChange();
    }

    private clearSelectionInternal(): void
    {
        this.selection.nodeIds.clear();
        this.selection.edgeIds.clear();
        this.updateSelectionVisuals();
        this.fireSelectionChange();
    }

    private updateSelectionVisuals(): void
    {
        this.nodeElements.forEach((g, id) =>
        {
            const sel = this.selection.nodeIds.has(id);
            g.classList.toggle("gc-node-selected", sel);
        });
        this.edgeElements.forEach((g, id) =>
        {
            const sel = this.selection.edgeIds.has(id);
            g.classList.toggle("gc-edge-selected", sel);
        });
    }

    private fireSelectionChange(): void
    {
        this.opts.onSelectionChange?.(
            this.getSelectedNodes(),
            this.getSelectedEdges()
        );
    }

    // ====================================================================
    // INTERNAL — INTERACTION EVENTS
    // ====================================================================

    private onPointerDown(e: PointerEvent): void
    {
        this.hideContextMenu();
        if (e.button !== 0) { return; }

        const target = e.target as Element;
        const nodeG = target.closest(".gc-node");
        if (nodeG) { return; } // handled by registerNodeGroup

        if (e.shiftKey)
        {
            this.startRubberBand(e);
            return;
        }
        if (this.opts.panEnabled !== false)
        {
            this.startPan(e);
        }
    }

    private onPointerMove(e: PointerEvent): void
    {
        if (this.isDragging) { this.doDrag(e); return; }
        if (this.isPanning) { this.doPan(e); return; }
        if (this.isRubberBand) { this.doRubberBand(e); return; }
        if (this.isCreatingEdge) { this.doEdgeCreate(e); return; }
        this.updateTooltipPosition(e);
    }

    private onPointerUp(e: PointerEvent): void
    {
        if (this.isDragging) { this.endDrag(); return; }
        if (this.isPanning) { this.endPan(); return; }
        if (this.isRubberBand) { this.endRubberBand(); return; }
        if (this.isCreatingEdge) { this.endEdgeCreate(e); return; }
    }

    private startDrag(nodeId: string, e: PointerEvent): void
    {
        e.stopPropagation();
        this.isDragging = true;
        this.dragNodeId = nodeId;
        this.dragStart = {
            x: e.clientX,
            y: e.clientY
        };
    }

    private doDrag(e: PointerEvent): void
    {
        if (!this.dragNodeId) { return; }
        const pos = this.positions.get(this.dragNodeId);
        if (!pos) { return; }
        const dx = (e.clientX - this.dragStart.x) / this.viewport.scale;
        const dy = (e.clientY - this.dragStart.y) / this.viewport.scale;
        pos.x += dx;
        pos.y += dy;
        this.dragStart = { x: e.clientX, y: e.clientY };
        // Pin the node
        const node = this.nodes.find((n) => n.id === this.dragNodeId);
        if (node) { node.pinned = true; }
        this.renderAll();
    }

    private endDrag(): void
    {
        this.isDragging = false;
        this.dragNodeId = null;
    }

    private startRubberBand(e: PointerEvent): void
    {
        this.isRubberBand = true;
        const rect = this.root!.getBoundingClientRect();
        this.rubberBandStart = {
            x: (e.clientX - rect.left - this.viewport.tx) / this.viewport.scale,
            y: (e.clientY - rect.top - this.viewport.ty) / this.viewport.scale
        };
        this.rubberBandRect = svgCreate("rect", {
            class: "gc-rubber-band",
            fill: "rgba(29, 126, 214, 0.1)",
            stroke: "#1c7ed6",
            "stroke-width": "1",
            "stroke-dasharray": "4,2"
        });
        this.overlayG!.appendChild(this.rubberBandRect);
    }

    private doRubberBand(e: PointerEvent): void
    {
        if (!this.rubberBandRect) { return; }
        const rect = this.root!.getBoundingClientRect();
        const cx = (e.clientX - rect.left - this.viewport.tx) / this.viewport.scale;
        const cy = (e.clientY - rect.top - this.viewport.ty) / this.viewport.scale;
        const x = Math.min(this.rubberBandStart.x, cx);
        const y = Math.min(this.rubberBandStart.y, cy);
        const w = Math.abs(cx - this.rubberBandStart.x);
        const h = Math.abs(cy - this.rubberBandStart.y);
        setAttr(this.rubberBandRect, "x", String(x));
        setAttr(this.rubberBandRect, "y", String(y));
        setAttr(this.rubberBandRect, "width", String(w));
        setAttr(this.rubberBandRect, "height", String(h));
    }

    private endRubberBand(): void
    {
        this.isRubberBand = false;
        if (!this.rubberBandRect) { return; }
        const rx = parseFloat(this.rubberBandRect.getAttribute("x") ?? "0");
        const ry = parseFloat(this.rubberBandRect.getAttribute("y") ?? "0");
        const rw = parseFloat(this.rubberBandRect.getAttribute("width") ?? "0");
        const rh = parseFloat(this.rubberBandRect.getAttribute("height") ?? "0");
        this.rubberBandRect.remove();
        this.rubberBandRect = null;

        if (rw < RUBBER_BAND_MIN || rh < RUBBER_BAND_MIN) { return; }

        this.selection.nodeIds.clear();
        this.positions.forEach((p, id) =>
        {
            if (p.x >= rx && p.x <= rx + rw && p.y >= ry && p.y <= ry + rh)
            {
                this.selection.nodeIds.add(id);
            }
        });
        this.updateSelectionVisuals();
        this.fireSelectionChange();
    }

    private startEdgeCreate(sourceId: string): void
    {
        if (this.opts.edgeCreationEnabled !== true) { return; }
        this.isCreatingEdge = true;
        this.edgeSourceId = sourceId;
        const sp = this.positions.get(sourceId);
        if (!sp) { return; }
        this.tempEdgeLine = svgCreate("line", {
            x1: String(sp.x),
            y1: String(sp.y),
            x2: String(sp.x),
            y2: String(sp.y),
            stroke: "#1c7ed6",
            "stroke-width": "2",
            "stroke-dasharray": "4,3"
        });
        this.overlayG!.appendChild(this.tempEdgeLine);
    }

    private doEdgeCreate(e: PointerEvent): void
    {
        if (!this.tempEdgeLine) { return; }
        const rect = this.root!.getBoundingClientRect();
        const x = (e.clientX - rect.left - this.viewport.tx) / this.viewport.scale;
        const y = (e.clientY - rect.top - this.viewport.ty) / this.viewport.scale;
        setAttr(this.tempEdgeLine, "x2", String(x));
        setAttr(this.tempEdgeLine, "y2", String(y));
    }

    private endEdgeCreate(e: PointerEvent): void
    {
        this.isCreatingEdge = false;
        if (this.tempEdgeLine) { this.tempEdgeLine.remove(); this.tempEdgeLine = null; }

        const target = (e.target as Element).closest(".gc-node");
        if (!target || !this.edgeSourceId) { this.edgeSourceId = null; return; }

        const targetId = target.getAttribute("data-node-id");
        if (targetId && targetId !== this.edgeSourceId)
        {
            this.opts.onEdgeCreated?.(this.edgeSourceId, targetId);
        }
        this.edgeSourceId = null;
    }

    private onNodeClick(node: GraphNode, e: MouseEvent): void
    {
        const multi = this.opts.multiSelectEnabled !== false && (e.ctrlKey || e.metaKey);
        this.selectNodeInternal(node.id, multi);
        this.opts.onNodeClick?.(node);

        // Expand indicator click
        if (node.expandable && (e.target as Element).classList.contains("gc-expand-indicator"))
        {
            this.opts.onExpandRequest?.(node.id);
        }
    }

    private onNodeDblClick(node: GraphNode): void
    {
        this.opts.onNodeDoubleClick?.(node);
    }

    private onEdgeClick(edge: GraphEdge): void
    {
        this.selectEdgeInternal(edge.id, false);
        this.opts.onEdgeClick?.(edge);
    }

    private onKeyDown(e: KeyboardEvent): void
    {
        if (!this.root || document.activeElement !== this.root) { return; }

        switch (e.key)
        {
            case "+":
            case "=":
                this.zoomIn();
                break;
            case "-":
                this.zoomOut();
                break;
            case "0":
                this.zoomToFit();
                break;
            case "Delete":
            case "Backspace":
                this.handleDeleteKey();
                break;
            case "Escape":
                this.clearSelectionInternal();
                this.hideContextMenu();
                break;
            case "a":
                if (e.ctrlKey || e.metaKey)
                {
                    e.preventDefault();
                    this.selectAllNodes();
                }
                break;
            case "f":
            case "F":
                this.focusSelectedNode();
                break;
            case "ArrowUp":
                this.nudgeSelection(0, -NUDGE_PX);
                break;
            case "ArrowDown":
                this.nudgeSelection(0, NUDGE_PX);
                break;
            case "ArrowLeft":
                this.nudgeSelection(-NUDGE_PX, 0);
                break;
            case "ArrowRight":
                this.nudgeSelection(NUDGE_PX, 0);
                break;
        }
    }

    private handleDeleteKey(): void
    {
        for (const edgeId of this.selection.edgeIds)
        {
            this.removeEdge(edgeId);
        }
    }

    private selectAllNodes(): void
    {
        this.selection.nodeIds.clear();
        for (const n of this.nodes)
        {
            if (this.isNodeVisible(n))
            {
                this.selection.nodeIds.add(n.id);
            }
        }
        this.updateSelectionVisuals();
        this.fireSelectionChange();
    }

    private focusSelectedNode(): void
    {
        const first = [...this.selection.nodeIds][0];
        if (first) { this.centerOnNode(first); }
    }

    private nudgeSelection(dx: number, dy: number): void
    {
        for (const id of this.selection.nodeIds)
        {
            const pos = this.positions.get(id);
            if (pos) { pos.x += dx; pos.y += dy; }
        }
        this.renderAll();
    }

    private onContextMenuEvent(e: MouseEvent): void
    {
        e.preventDefault();
        const target = e.target as Element;
        const nodeG = target.closest(".gc-node");
        const edgeG = target.closest(".gc-edge");

        if (nodeG)
        {
            const nodeId = nodeG.getAttribute("data-node-id");
            const node = this.nodes.find((n) => n.id === nodeId);
            if (node) { this.showContextMenu(e, this.buildNodeContextMenu(node)); }
        }
        else if (edgeG)
        {
            const edgeId = edgeG.getAttribute("data-edge-id");
            const edge = this.edges.find((ed) => ed.id === edgeId);
            if (edge) { this.showContextMenu(e, this.buildEdgeContextMenu(edge)); }
        }
    }

    // ====================================================================
    // INTERNAL — TOOLTIP
    // ====================================================================

    private showTooltip(content: string): void
    {
        if (this.tooltipTimer) { clearTimeout(this.tooltipTimer); }
        this.tooltipTimer = window.setTimeout(() =>
        {
            if (!this.tooltipEl) { return; }
            this.tooltipEl.textContent = content;
            this.tooltipEl.style.display = "block";
        }, TOOLTIP_DELAY);
    }

    private hideTooltip(): void
    {
        if (this.tooltipTimer) { clearTimeout(this.tooltipTimer); this.tooltipTimer = null; }
        if (this.tooltipEl) { this.tooltipEl.style.display = "none"; }
    }

    private updateTooltipPosition(e: PointerEvent): void
    {
        if (!this.tooltipEl || this.tooltipEl.style.display === "none") { return; }
        const rect = this.root!.getBoundingClientRect();
        this.tooltipEl.style.left = `${e.clientX - rect.left + 12}px`;
        this.tooltipEl.style.top = `${e.clientY - rect.top + 12}px`;
    }

    private buildNodeTooltipContent(node: GraphNode): string
    {
        const parts = [node.label];
        if (node.sublabel) { parts.push(node.sublabel); }
        parts.push(`Type: ${node.type}`);
        if (node.namespace) { parts.push(`Namespace: ${node.namespace}`); }
        if (node.status) { parts.push(`Status: ${node.status}`); }
        return parts.join(" \u2022 ");
    }

    private buildEdgeTooltipContent(edge: GraphEdge): string
    {
        const parts = [edge.label ?? edge.type];
        parts.push(`${edge.sourceId} \u2192 ${edge.targetId}`);
        if (edge.provenance) { parts.push(`Provenance: ${edge.provenance}`); }
        return parts.join(" \u2022 ");
    }

    // ====================================================================
    // INTERNAL — CONTEXT MENU
    // ====================================================================

    private showContextMenu(
        e: MouseEvent,
        items: { label: string; action: () => void }[]
    ): void
    {
        if (!this.contextMenuEl) { return; }
        this.contextMenuEl.innerHTML = "";
        for (const item of items)
        {
            const btn = htmlEl("button", {
                class: "gc-context-menu-item",
                type: "button"
            }, item.label);
            btn.addEventListener("click", () =>
            {
                item.action();
                this.hideContextMenu();
            });
            this.contextMenuEl.appendChild(btn);
        }
        const rect = this.root!.getBoundingClientRect();
        this.contextMenuEl.style.left = `${e.clientX - rect.left}px`;
        this.contextMenuEl.style.top = `${e.clientY - rect.top}px`;
        this.contextMenuEl.style.display = "block";
    }

    private hideContextMenu(): void
    {
        if (this.contextMenuEl) { this.contextMenuEl.style.display = "none"; }
    }

    private buildNodeContextMenu(
        node: GraphNode
    ): { label: string; action: () => void }[]
    {
        const items: { label: string; action: () => void }[] = [
            { label: "Center on node", action: () => { this.centerOnNode(node.id); } },
            { label: "Highlight neighbors", action: () => { this.highlightNeighbors(node.id); } }
        ];
        if (node.expandable)
        {
            items.push({
                label: node.expanded ? "Collapse" : "Expand",
                action: () => { this.opts.onExpandRequest?.(node.id); }
            });
        }
        if (this.opts.edgeCreationEnabled)
        {
            items.push({
                label: "Create edge from here",
                action: () => { this.startEdgeCreate(node.id); }
            });
        }
        return items;
    }

    private buildEdgeContextMenu(
        edge: GraphEdge
    ): { label: string; action: () => void }[]
    {
        return [
            { label: "Delete edge", action: () => { this.removeEdge(edge.id); } },
            { label: "Highlight path", action: () => { this.highlightPath([edge.sourceId, edge.targetId]); } }
        ];
    }

    // ====================================================================
    // INTERNAL — FILTERING
    // ====================================================================

    private isNodeVisible(node: GraphNode): boolean
    {
        if (this.nodeFilter && !this.nodeFilter.includes(node.type))
        {
            return false;
        }
        return true;
    }

    private isEdgeVisible(edge: GraphEdge): boolean
    {
        if (this.edgeFilter && !this.edgeFilter.includes(edge.type))
        {
            return false;
        }
        // Both endpoints must be visible
        const src = this.nodes.find((n) => n.id === edge.sourceId);
        const tgt = this.nodes.find((n) => n.id === edge.targetId);
        if (src && !this.isNodeVisible(src)) { return false; }
        if (tgt && !this.isNodeVisible(tgt)) { return false; }
        return true;
    }

    // ====================================================================
    // INTERNAL — HIGHLIGHTING
    // ====================================================================

    private applyHighlightState(): void
    {
        const active = this.highlightedIds.size > 0;
        this.nodeElements.forEach((g, id) =>
        {
            if (active)
            {
                g.classList.toggle("gc-dimmed", !this.highlightedIds.has(id));
                g.classList.toggle("gc-highlighted", this.highlightedIds.has(id));
            }
            else
            {
                g.classList.remove("gc-dimmed", "gc-highlighted");
            }
        });
        this.edgeElements.forEach((g, id) =>
        {
            const edge = this.edges.find((e) => e.id === id);
            if (!edge) { return; }
            const highlighted = this.highlightedIds.has(edge.sourceId)
                && this.highlightedIds.has(edge.targetId);
            if (active)
            {
                g.classList.toggle("gc-dimmed", !highlighted);
                g.classList.toggle("gc-highlighted", highlighted);
            }
            else
            {
                g.classList.remove("gc-dimmed", "gc-highlighted");
            }
        });
    }

    /** Collect neighbor IDs via BFS up to given depth. */
    private collectNeighborIds(nodeId: string, depth: number): Set<string>
    {
        const visited = new Set<string>();
        const queue: { id: string; d: number }[] = [{ id: nodeId, d: 0 }];

        while (queue.length > 0)
        {
            const { id, d } = queue.shift()!;
            if (visited.has(id)) { continue; }
            visited.add(id);
            if (d >= depth) { continue; }
            for (const e of this.edges)
            {
                if (e.sourceId === id && !visited.has(e.targetId))
                {
                    queue.push({ id: e.targetId, d: d + 1 });
                }
                if (e.targetId === id && !visited.has(e.sourceId))
                {
                    queue.push({ id: e.sourceId, d: d + 1 });
                }
            }
        }
        return visited;
    }
}

// ============================================================================
// FACTORY
// ============================================================================

/** Create a GraphCanvas instance. */
// @entrypoint
export function createGraphCanvas(options: GraphCanvasOptions): GraphCanvas
{
    return new GraphCanvasImpl(options);
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

(window as unknown as Record<string, unknown>).GraphCanvasImpl = GraphCanvasImpl;
(window as unknown as Record<string, unknown>).createGraphCanvas = createGraphCanvas;
