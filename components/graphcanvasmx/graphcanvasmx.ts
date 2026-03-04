/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: GraphCanvasMx
 * 📜 PURPOSE: Interactive graph visualization powered by maxGraph.
 *             Same public API as GraphCanvas (custom SVG version) so they
 *             are drop-in swappable. Delegates rendering, layout, zoom/pan,
 *             edge routing, and selection to maxGraph — adds project-specific
 *             concerns: TypeBadge integration, keyboard shortcuts, context
 *             menus, highlight/filter, and export.
 * 🔗 RELATES: [[GraphCanvas]], [[GraphToolbar]], [[TypeBadge]]
 * ⚡ FLOW: [Consumer] -> [createGraphCanvasMx()] -> [GraphCanvas handle]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[GraphCanvasMx]";
const ZOOM_STEP = 0.15;
const NUDGE_PX = 10;

// ============================================================================
// TYPES — re-export identical interfaces from GraphCanvas
// ============================================================================

export type GraphMode = "schema" | "instance";
export type GraphLayout =
    | "force"
    | "hierarchical"
    | "radial"
    | "dagre"
    | "group-by-namespace";
export type LayoutDirection = "TB" | "LR" | "BT" | "RL";
export type GraphNodeStatus = "active" | "planned" | "deprecated" | "external";
export type EdgeStyle = "solid" | "dashed" | "dotted";
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

/** Public API — identical to GraphCanvas. */
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
// MAXGRAPH TYPE SHIMS
// ============================================================================
// maxGraph is loaded externally. We define minimal type shims so TypeScript
// is happy without importing @maxgraph/core as a build dependency.

/* eslint-disable @typescript-eslint/no-explicit-any */
interface MxGraph
{
    getDataModel(): MxGraphModel;
    getDefaultParent(): any;
    getView(): any;
    getStylesheet(): any;
    insertVertex(params: Record<string, any>): any;
    insertEdge(params: Record<string, any>): any;
    removeCells(cells: any[]): void;
    batchUpdate(fn: () => void): void;
    setPanning(enabled: boolean): void;
    setConnectable(enabled: boolean): void;
    setCellsMovable(enabled: boolean): void;
    setCellsSelectable(enabled: boolean): void;
    setCellsResizable(enabled: boolean): void;
    setEnabled(enabled: boolean): void;
    addListener(event: string, handler: (sender: any, evt: any) => void): void;
    getSelectionCells(): any[];
    setSelectionCells(cells: any[]): void;
    setSelectionCell(cell: any): void;
    clearSelection(): void;
    zoomIn(): void;
    zoomOut(): void;
    fit(border?: number): void;
    zoom(factor: number, center?: boolean): void;
    scrollCellToVisible(cell: any, center?: boolean): void;
    refresh(): void;
    destroy(): void;
    container: HTMLElement;
}

interface MxGraphModel
{
    beginUpdate(): void;
    endUpdate(): void;
    getGeometry(cell: any): any;
    setGeometry(cell: any, geo: any): void;
    getStyle(cell: any): any;
    setStyle(cell: any, style: Record<string, any>): void;
    getValue(cell: any): any;
}

interface MxLayoutConstructor
{
    new(graph: MxGraph, ...args: any[]): MxLayoutInstance;
}

interface MxLayoutInstance
{
    execute(parent: any): void;
    interRankCellSpacing?: number;
    intraCellSpacing?: number;
    orientation?: string;
    forceConstant?: number;
    maxIterations?: number;
}

/** Shape of the maxgraph window global. */
interface MaxGraphExports
{
    Graph: new (container: HTMLElement, model?: any, plugins?: any[], stylesheet?: any) => MxGraph;
    InternalEvent: { CLICK: string; DOUBLE_CLICK: string; disableContextMenu(el: HTMLElement): void };
    HierarchicalLayout: MxLayoutConstructor;
    FastOrganicLayout: MxLayoutConstructor;
    CircleLayout: MxLayoutConstructor;
    RadialTreeLayout: MxLayoutConstructor;
    CompactTreeLayout: MxLayoutConstructor;
    StackLayout: MxLayoutConstructor;
    Geometry: new (x: number, y: number, w: number, h: number) => any;
    constants: Record<string, any>;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ============================================================================
// DOM HELPERS
// ============================================================================

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

// ============================================================================
// MAXGRAPH PROBE
// ============================================================================

function getMaxGraph(): MaxGraphExports | null
{
    const mg = (window as unknown as Record<string, unknown>)["maxgraph"];
    if (mg && typeof mg === "object" && "Graph" in (mg as object))
    {
        return mg as unknown as MaxGraphExports;
    }
    return null;
}

// ============================================================================
// IMPLEMENTATION
// ============================================================================

class GraphCanvasMxImpl implements GraphCanvas
{
    private opts: GraphCanvasOptions;
    private mx: MaxGraphExports;
    private graph: MxGraph;
    private nodes: GraphNode[] = [];
    private edges: GraphEdge[] = [];
    private mode: GraphMode;
    private layout: GraphLayout;
    private layoutDirection: LayoutDirection;
    private nodeW: number;
    private nodeH: number;
    private nodeFilter: string[] | null = null;
    private edgeFilter: string[] | null = null;
    private highlightedIds: Set<string> = new Set();

    // Maps from our IDs → maxGraph cells
    /* eslint-disable @typescript-eslint/no-explicit-any */
    private nodeCells: Map<string, any> = new Map();
    private edgeCells: Map<string, any> = new Map();
    /* eslint-enable @typescript-eslint/no-explicit-any */

    // Wrapper + context menu
    private root: HTMLElement;
    private contextMenuEl: HTMLElement | null = null;
    private boundKeyDown: ((e: KeyboardEvent) => void) | null = null;

    constructor(opts: GraphCanvasOptions, mx: MaxGraphExports)
    {
        this.opts = opts;
        this.mx = mx;
        this.mode = opts.mode ?? "schema";
        this.layout = opts.layout ?? "force";
        this.layoutDirection = opts.layoutDirection ?? "TB";
        this.nodeW = opts.nodeSize?.width ?? 160;
        this.nodeH = opts.nodeSize?.height ?? 48;

        this.root = this.buildRoot();
        this.graph = this.createGraph();
        this.configureGraph();
        this.bindEvents();

        if (opts.nodes && opts.nodes.length > 0)
        {
            this.setData(opts.nodes, opts.edges ?? []);
        }
        console.log(LOG_PREFIX, "Created (maxGraph engine), mode:", this.mode);
    }

    // ====================================================================
    // LIFECYCLE — SETUP
    // ====================================================================

    private buildRoot(): HTMLElement
    {
        const root = htmlEl("div", { class: "gcmx-root", tabindex: "0" });
        const graphContainer = htmlEl("div", { class: "gcmx-container" });
        root.appendChild(graphContainer);
        this.contextMenuEl = htmlEl("div", { class: "gcmx-context-menu" });
        this.contextMenuEl.style.display = "none";
        root.appendChild(this.contextMenuEl);
        this.opts.container.appendChild(root);
        return root;
    }

    private createGraph(): MxGraph
    {
        const container = this.root.querySelector(".gcmx-container") as HTMLElement;
        this.mx.InternalEvent.disableContextMenu(container);
        return new this.mx.Graph(container);
    }

    private configureGraph(): void
    {
        const g = this.graph;
        g.setPanning(this.opts.panEnabled !== false);
        g.setCellsMovable(this.opts.dragEnabled !== false);
        g.setCellsSelectable(this.opts.selectEnabled !== false);
        g.setCellsResizable(false);
        g.setConnectable(this.opts.edgeCreationEnabled === true);
        this.applyDefaultStyles();
    }

    private applyDefaultStyles(): void
    {
        const ss = this.graph.getStylesheet();
        const vs = ss.getDefaultVertexStyle();
        vs.rounded = false;
        vs.strokeWidth = 1.5;
        vs.fontSize = 12;
        vs.fontFamily = "inherit";
        vs.fillColor = "#f1f5f9";
        vs.strokeColor = "#cbd5e1";
        vs.fontColor = "#0f172a";
        vs.whiteSpace = "wrap";
        vs.overflow = "hidden";

        const es = ss.getDefaultEdgeStyle();
        es.strokeColor = "#94a3b8";
        es.strokeWidth = 1.5;
        es.fontSize = 10;
        es.fontColor = "#64748b";
        es.endArrow = "classic";
        es.edgeStyle = "orthogonalEdgeStyle";
        es.rounded = true;
    }

    // ====================================================================
    // LIFECYCLE — EVENTS
    // ====================================================================

    private bindEvents(): void
    {
        this.bindGraphClicks();
        this.bindKeyboard();
        this.bindContextMenu();
        this.bindSelectionChange();
        this.bindEdgeCreation();
    }

    private bindGraphClicks(): void
    {
        this.graph.addListener(this.mx.InternalEvent.CLICK,
            (_sender: unknown, evt: { getProperty(k: string): unknown }) =>
            {
                this.hideContextMenu();
                const cell = evt.getProperty("cell") as
                    { isVertex(): boolean; isEdge(): boolean } | null;
                if (!cell) { this.onCanvasClick(); return; }

                if (cell.isVertex())
                {
                    this.onCellNodeClick(cell);
                }
                else if (cell.isEdge())
                {
                    this.onCellEdgeClick(cell);
                }
            });

        this.graph.addListener(this.mx.InternalEvent.DOUBLE_CLICK,
            (_sender: unknown, evt: { getProperty(k: string): unknown }) =>
            {
                const cell = evt.getProperty("cell");
                if (!cell) { return; }
                const node = this.findNodeByCell(cell);
                if (node)
                {
                    this.opts.onNodeDoubleClick?.(node);
                    if (node.expandable)
                    {
                        this.opts.onExpandRequest?.(node.id);
                    }
                }
            });
    }

    private bindKeyboard(): void
    {
        this.boundKeyDown = (e: KeyboardEvent) => { this.onKeyDown(e); };
        this.root.addEventListener("keydown", this.boundKeyDown);
    }

    private bindContextMenu(): void
    {
        this.root.addEventListener("contextmenu", (e: MouseEvent) =>
        {
            e.preventDefault();
            const cells = this.graph.getSelectionCells();
            if (cells.length === 0) { return; }
            const cell = cells[0];
            const node = this.findNodeByCell(cell);
            if (node)
            {
                this.showContextMenu(e, this.buildNodeContextItems(node));
            }
            else
            {
                const edge = this.findEdgeByCell(cell);
                if (edge) { this.showContextMenu(e, this.buildEdgeContextItems(edge)); }
            }
        });
    }

    private bindSelectionChange(): void
    {
        this.graph.addListener("selectionChanged", () =>
        {
            this.opts.onSelectionChange?.(
                this.getSelectedNodes(),
                this.getSelectedEdges()
            );
        });
    }

    private bindEdgeCreation(): void
    {
        if (this.opts.edgeCreationEnabled !== true) { return; }
        // maxGraph handles edge creation natively when connectable=true.
        // We listen for new edge cells added by the connection handler.
        this.graph.addListener("connectCell",
            (_sender: unknown, evt: { getProperty(k: string): unknown }) =>
            {
                const edge = evt.getProperty("edge") as
                    { source: unknown; target: unknown } | null;
                if (edge)
                {
                    const src = edge.source;
                    const tgt = edge.target;
                    const srcNode = this.findNodeByCell(src);
                    const tgtNode = this.findNodeByCell(tgt);
                    if (srcNode && tgtNode)
                    {
                        this.opts.onEdgeCreated?.(srcNode.id, tgtNode.id);
                    }
                }
            });
    }

    // ====================================================================
    // PUBLIC API — DATA
    // ====================================================================

    /** Replace all nodes and edges, rebuilding the graph. */
    public setData(nodes: GraphNode[], edges: GraphEdge[]): void
    {
        this.nodes = [...nodes];
        this.edges = [...edges];
        this.rebuildGraph();
    }

    /** Add a single node and rebuild the graph. */
    public addNode(node: GraphNode): void
    {
        this.nodes.push(node);
        this.rebuildGraph();
    }

    /** Add a single edge and rebuild the graph. */
    public addEdge(edge: GraphEdge): void
    {
        this.edges.push(edge);
        this.rebuildGraph();
    }

    /** Remove a node by ID and discard its connected edges. */
    public removeNode(nodeId: string): void
    {
        const cell = this.nodeCells.get(nodeId);
        if (cell) { this.graph.removeCells([cell]); }
        this.nodes = this.nodes.filter((n) => n.id !== nodeId);
        this.edges = this.edges.filter(
            (e) => e.sourceId !== nodeId && e.targetId !== nodeId
        );
        this.nodeCells.delete(nodeId);
    }

    /** Remove an edge by ID. */
    public removeEdge(edgeId: string): void
    {
        const cell = this.edgeCells.get(edgeId);
        if (cell) { this.graph.removeCells([cell]); }
        this.edges = this.edges.filter((e) => e.id !== edgeId);
        this.edgeCells.delete(edgeId);
    }

    /** Merge partial updates into an existing node and rebuild. */
    public updateNode(nodeId: string, updates: Partial<GraphNode>): void
    {
        const node = this.nodes.find((n) => n.id === nodeId);
        if (node) { Object.assign(node, updates); this.rebuildGraph(); }
    }

    /** Merge partial updates into an existing edge and rebuild. */
    public updateEdge(edgeId: string, updates: Partial<GraphEdge>): void
    {
        const edge = this.edges.find((e) => e.id === edgeId);
        if (edge) { Object.assign(edge, updates); this.rebuildGraph(); }
    }

    /** Return a copy of all nodes. */
    public getNodes(): GraphNode[] { return [...this.nodes]; }
    /** Return a copy of all edges. */
    public getEdges(): GraphEdge[] { return [...this.edges]; }

    // ====================================================================
    // PUBLIC API — SELECTION
    // ====================================================================

    /** Return the currently selected node objects. */
    public getSelectedNodes(): GraphNode[]
    {
        const cells = this.graph.getSelectionCells();
        return cells
            .filter((c: any) => c.isVertex())
            .map((c: unknown) => this.findNodeByCell(c))
            .filter(Boolean) as GraphNode[];
    }

    /** Return the currently selected edge objects. */
    public getSelectedEdges(): GraphEdge[]
    {
        const cells = this.graph.getSelectionCells();
        return cells
            .filter((c: any) => c.isEdge())
            .map((c: unknown) => this.findEdgeByCell(c))
            .filter(Boolean) as GraphEdge[];
    }

    /** Select a single node by ID. */
    public selectNode(nodeId: string): void
    {
        const cell = this.nodeCells.get(nodeId);
        if (cell) { this.graph.setSelectionCell(cell); }
    }

    /** Select a single edge by ID. */
    public selectEdge(edgeId: string): void
    {
        const cell = this.edgeCells.get(edgeId);
        if (cell) { this.graph.setSelectionCell(cell); }
    }

    /** Deselect all nodes and edges. */
    public clearSelection(): void
    {
        this.graph.clearSelection();
    }

    // ====================================================================
    // PUBLIC API — VIEWPORT
    // ====================================================================

    /** Zoom in by one step. */
    public zoomIn(): void { this.graph.zoomIn(); }
    /** Zoom out by one step. */
    public zoomOut(): void { this.graph.zoomOut(); }

    /** Zoom and pan to fit all content in the viewport. */
    public zoomToFit(): void
    {
        this.graph.fit(40);
    }

    /** Scroll the viewport to center on a specific node. */
    public zoomToNode(nodeId: string): void
    {
        const cell = this.nodeCells.get(nodeId);
        if (cell) { this.graph.scrollCellToVisible(cell, true); }
    }

    /** Return the current zoom scale factor. */
    public getZoomLevel(): number
    {
        return this.graph.getView().getScale?.() ?? 1;
    }

    /** Set the zoom scale to an absolute level. */
    public setZoomLevel(level: number): void
    {
        const current = this.getZoomLevel();
        if (current > 0) { this.graph.zoom(level / current, true); }
    }

    /** Pan the viewport to center on a specific node. */
    public centerOnNode(nodeId: string): void
    {
        const cell = this.nodeCells.get(nodeId);
        if (cell) { this.graph.scrollCellToVisible(cell, true); }
    }

    // ====================================================================
    // PUBLIC API — LAYOUT
    // ====================================================================

    /** Change the layout algorithm and optionally the direction, then re-layout. */
    public setLayout(layout: string, direction?: string): void
    {
        this.layout = layout as GraphLayout;
        if (direction) { this.layoutDirection = direction as LayoutDirection; }
        this.relayout();
    }

    /** Re-run the current layout algorithm. */
    public relayout(): void
    {
        this.applyLayout();
        this.opts.onLayoutComplete?.();
    }

    // ====================================================================
    // PUBLIC API — FILTERING
    // ====================================================================

    /** Filter visible nodes by type keys, or pass null to show all. */
    public setNodeFilter(typeKeys: string[] | null): void
    {
        this.nodeFilter = typeKeys;
        this.rebuildGraph();
    }

    /** Filter visible edges by relationship keys, or pass null to show all. */
    public setEdgeFilter(relationshipKeys: string[] | null): void
    {
        this.edgeFilter = relationshipKeys;
        this.rebuildGraph();
    }

    /** Set a maximum traversal depth for filtering (handled externally). */
    public setDepthFilter(_maxDepth: number): void
    {
        console.log(LOG_PREFIX, "Depth filter set (handled externally).");
    }

    // ====================================================================
    // PUBLIC API — HIGHLIGHTING
    // ====================================================================

    /** Highlight a path defined by the given node IDs, dimming all others. */
    public highlightPath(nodeIds: string[]): void
    {
        this.highlightedIds = new Set(nodeIds);
        this.applyHighlightVisuals();
    }

    /** Highlight a node and its neighbors up to the given depth. */
    public highlightNeighbors(nodeId: string, depth = 1): void
    {
        const ids = this.collectNeighborIds(nodeId, depth);
        ids.add(nodeId);
        this.highlightedIds = ids;
        this.applyHighlightVisuals();
    }

    /** Highlight the full blast radius (deep neighbors) of a node. */
    public highlightBlastRadius(nodeId: string): void
    {
        this.highlightNeighbors(nodeId, 10);
    }

    /** Remove all highlights, restoring normal opacity. */
    public clearHighlights(): void
    {
        this.highlightedIds.clear();
        this.applyHighlightVisuals();
    }

    // ====================================================================
    // PUBLIC API — EXPORT
    // ====================================================================

    /** Export the graph as an SVG string. */
    public exportSVG(): string
    {
        const svg = this.graph.container.querySelector("svg");
        return svg ? new XMLSerializer().serializeToString(svg) : "";
    }

    /** Export the graph as a PNG blob at 2x resolution. */
    public async exportPNG(): Promise<Blob>
    {
        const svgStr = this.exportSVG();
        const canvas = document.createElement("canvas");
        const container = this.graph.container;
        canvas.width = container.clientWidth * 2;
        canvas.height = container.clientHeight * 2;
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

    /** Export nodes and edges as a plain JSON object. */
    public exportJSON(): { nodes: GraphNode[]; edges: GraphEdge[] }
    {
        return { nodes: [...this.nodes], edges: [...this.edges] };
    }

    // ====================================================================
    // PUBLIC API — MODE & LIFECYCLE
    // ====================================================================

    /** Switch between schema and instance mode, rebuilding the graph. */
    public setMode(mode: GraphMode): void
    {
        this.mode = mode;
        this.rebuildGraph();
    }

    /** Return the current graph mode. */
    public getMode(): string { return this.mode; }

    /** Notify the graph that its container has been resized. */
    public resize(): void
    {
        this.graph.refresh();
    }

    /** Tear down the graph, remove event listeners, and detach the DOM. */
    public destroy(): void
    {
        if (this.boundKeyDown)
        {
            this.root.removeEventListener("keydown", this.boundKeyDown);
        }
        this.graph.destroy();
        if (this.root.parentNode)
        {
            this.root.parentNode.removeChild(this.root);
        }
        console.log(LOG_PREFIX, "Destroyed.");
    }

    // ====================================================================
    // INTERNAL — GRAPH REBUILD
    // ====================================================================

    private rebuildGraph(): void
    {
        this.graph.batchUpdate(() =>
        {
            this.clearAllCells();
            this.insertNodes();
            this.insertEdges();
        });
        this.applyLayout();
        this.applyHighlightVisuals();
    }

    private clearAllCells(): void
    {
        const parent = this.graph.getDefaultParent();
        const children = parent.children ?? [];
        if (children.length > 0)
        {
            this.graph.removeCells(children);
        }
        this.nodeCells.clear();
        this.edgeCells.clear();
    }

    private insertNodes(): void
    {
        const parent = this.graph.getDefaultParent();
        for (const node of this.nodes)
        {
            if (!this.isNodeVisible(node)) { continue; }
            const cell = this.insertOneNode(parent, node);
            this.nodeCells.set(node.id, cell);
        }
    }

    /* eslint-disable @typescript-eslint/no-explicit-any */
    private insertOneNode(parent: any, node: GraphNode): any
    {
        const color = node.color ?? "#e2e8f0";
        const label = this.buildNodeLabel(node);
        const style = this.buildNodeStyle(node, color);

        return this.graph.insertVertex({
            parent,
            value: label,
            position: [node.x ?? 0, node.y ?? 0],
            size: [this.nodeW, this.nodeH],
            style
        });
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */

    private buildNodeLabel(node: GraphNode): string
    {
        if (node.sublabel)
        {
            return `${node.label}\n${node.sublabel}`;
        }
        return node.label;
    }

    private buildNodeStyle(
        node: GraphNode,
        color: string
    ): Record<string, unknown>
    {
        const style: Record<string, unknown> = {
            fillColor: this.hexWithAlpha(color, 0.15),
            strokeColor: color,
            fontColor: "#0f172a",
            fontSize: 12,
            fontStyle: 0,
            whiteSpace: "wrap",
            overflow: "hidden"
        };

        if (node.status === "planned")
        {
            style.dashed = true;
            style.dashPattern = "4 3";
        }
        if (node.status === "deprecated")
        {
            style.opacity = 40;
        }
        if (node.status === "external")
        {
            style.dashed = true;
            style.dashPattern = "2 3";
        }
        return style;
    }

    private insertEdges(): void
    {
        const parent = this.graph.getDefaultParent();
        for (const edge of this.edges)
        {
            if (!this.isEdgeVisible(edge)) { continue; }
            const src = this.nodeCells.get(edge.sourceId);
            const tgt = this.nodeCells.get(edge.targetId);
            if (!src || !tgt) { continue; }
            const cell = this.insertOneEdge(parent, edge, src, tgt);
            this.edgeCells.set(edge.id, cell);
        }
    }

    /* eslint-disable @typescript-eslint/no-explicit-any */
    private insertOneEdge(
        parent: any,
        edge: GraphEdge,
        src: any,
        tgt: any
    ): any
    {
        const label = (this.opts.showEdgeLabels !== false && edge.label)
            ? this.buildEdgeLabel(edge)
            : "";
        const style = this.buildEdgeStyle(edge);

        return this.graph.insertEdge({
            parent,
            value: label,
            source: src,
            target: tgt,
            style
        });
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */

    private buildEdgeLabel(edge: GraphEdge): string
    {
        let label = edge.label ?? "";
        if (edge.provenance === "ai_inferred" && edge.confidence != null)
        {
            label += ` (${Math.round(edge.confidence * 100)}%)`;
        }
        return label;
    }

    private buildEdgeStyle(edge: GraphEdge): Record<string, unknown>
    {
        const style: Record<string, unknown> = {
            strokeColor: edge.color ?? "#94a3b8",
            strokeWidth: edge.width ?? 1.5,
            endArrow: "classic"
        };

        if (edge.style === "dashed")
        {
            style.dashed = true;
            style.dashPattern = "6 3";
        }
        if (edge.style === "dotted")
        {
            style.dashed = true;
            style.dashPattern = "2 3";
        }
        if (edge.provenance === "ai_inferred")
        {
            style.dashed = true;
            style.dashPattern = "4 3";
            style.strokeColor = "#6f42c1";
        }
        return style;
    }

    // ====================================================================
    // INTERNAL — LAYOUT
    // ====================================================================

    private applyLayout(): void
    {
        const layoutInstance = this.createLayoutInstance();
        if (!layoutInstance) { return; }

        this.graph.batchUpdate(() =>
        {
            layoutInstance.execute(this.graph.getDefaultParent());
        });
    }

    private createLayoutInstance(): MxLayoutInstance | null
    {
        switch (this.layout)
        {
            case "force":
                return this.createForceLayout();
            case "hierarchical":
            case "dagre":
                return this.createHierarchicalLayout();
            case "radial":
                return this.createRadialLayout();
            case "group-by-namespace":
                // For group-by-namespace, use hierarchical as a reasonable default.
                // maxGraph doesn't have a native "group by field" layout, but
                // hierarchical with namespace-ordered insertion works well.
                return this.createHierarchicalLayout();
            default:
                return this.createForceLayout();
        }
    }

    private createForceLayout(): MxLayoutInstance | null
    {
        if (!this.mx.FastOrganicLayout) { return null; }
        const layout = new this.mx.FastOrganicLayout(this.graph);
        layout.forceConstant = 120;
        layout.maxIterations = 200;
        return layout;
    }

    private createHierarchicalLayout(): MxLayoutInstance | null
    {
        if (!this.mx.HierarchicalLayout) { return null; }
        const layout = new this.mx.HierarchicalLayout(this.graph);
        layout.interRankCellSpacing = 80;
        layout.intraCellSpacing = 40;
        this.applyDirectionToLayout(layout);
        return layout;
    }

    private applyDirectionToLayout(layout: MxLayoutInstance): void
    {
        // maxGraph uses NORTH=1, SOUTH=4, WEST=2, EAST=8 for orientation
        switch (this.layoutDirection)
        {
            case "TB": layout.orientation = "south"; break;
            case "BT": layout.orientation = "north"; break;
            case "LR": layout.orientation = "east"; break;
            case "RL": layout.orientation = "west"; break;
        }
    }

    private createRadialLayout(): MxLayoutInstance | null
    {
        // Use CircleLayout as radial equivalent
        if (this.mx.CircleLayout)
        {
            return new this.mx.CircleLayout(this.graph);
        }
        // Fallback to RadialTreeLayout if available
        if (this.mx.RadialTreeLayout)
        {
            return new this.mx.RadialTreeLayout(this.graph);
        }
        return null;
    }

    // ====================================================================
    // INTERNAL — CLICK HANDLERS
    // ====================================================================

    /* eslint-disable @typescript-eslint/no-explicit-any */
    private onCellNodeClick(cell: any): void
    {
        const node = this.findNodeByCell(cell);
        if (node) { this.opts.onNodeClick?.(node); }
    }

    private onCellEdgeClick(cell: any): void
    {
        const edge = this.findEdgeByCell(cell);
        if (edge) { this.opts.onEdgeClick?.(edge); }
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */

    private onCanvasClick(): void
    {
        this.clearSelection();
        this.hideContextMenu();
    }

    // ====================================================================
    // INTERNAL — KEYBOARD
    // ====================================================================

    private onKeyDown(e: KeyboardEvent): void
    {
        if (document.activeElement !== this.root) { return; }

        switch (e.key)
        {
            case "+": case "=": this.zoomIn(); break;
            case "-": this.zoomOut(); break;
            case "0": this.zoomToFit(); break;
            case "Delete": case "Backspace": this.deleteSelectedEdges(); break;
            case "Escape": this.clearSelection(); this.hideContextMenu(); break;
            case "a":
                if (e.ctrlKey || e.metaKey)
                {
                    e.preventDefault();
                    this.selectAllNodes();
                }
                break;
            case "f": case "F": this.focusSelectedNode(); break;
            case "ArrowUp": this.nudgeSelection(0, -NUDGE_PX); break;
            case "ArrowDown": this.nudgeSelection(0, NUDGE_PX); break;
            case "ArrowLeft": this.nudgeSelection(-NUDGE_PX, 0); break;
            case "ArrowRight": this.nudgeSelection(NUDGE_PX, 0); break;
        }
    }

    private deleteSelectedEdges(): void
    {
        const edges = this.getSelectedEdges();
        for (const edge of edges)
        {
            this.removeEdge(edge.id);
        }
    }

    private selectAllNodes(): void
    {
        const cells = Array.from(this.nodeCells.values());
        this.graph.setSelectionCells(cells);
    }

    private focusSelectedNode(): void
    {
        const nodes = this.getSelectedNodes();
        if (nodes.length > 0)
        {
            this.centerOnNode(nodes[0].id);
        }
    }

    private nudgeSelection(dx: number, dy: number): void
    {
        const cells = this.graph.getSelectionCells();
        const model = this.graph.getDataModel();
        this.graph.batchUpdate(() =>
        {
            for (const cell of cells)
            {
                if (!cell.isVertex()) { continue; }
                const geo = model.getGeometry(cell);
                if (geo)
                {
                    const newGeo = geo.clone();
                    newGeo.x += dx;
                    newGeo.y += dy;
                    model.setGeometry(cell, newGeo);
                }
            }
        });
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
                class: "gcmx-context-menu-item",
                type: "button"
            }, item.label);
            btn.addEventListener("click", () =>
            {
                item.action();
                this.hideContextMenu();
            });
            this.contextMenuEl.appendChild(btn);
        }
        const rect = this.root.getBoundingClientRect();
        this.contextMenuEl.style.left = `${e.clientX - rect.left}px`;
        this.contextMenuEl.style.top = `${e.clientY - rect.top}px`;
        this.contextMenuEl.style.display = "block";
    }

    private hideContextMenu(): void
    {
        if (this.contextMenuEl) { this.contextMenuEl.style.display = "none"; }
    }

    private buildNodeContextItems(
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
        return items;
    }

    private buildEdgeContextItems(
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
        const src = this.nodes.find((n) => n.id === edge.sourceId);
        const tgt = this.nodes.find((n) => n.id === edge.targetId);
        if (src && !this.isNodeVisible(src)) { return false; }
        if (tgt && !this.isNodeVisible(tgt)) { return false; }
        return true;
    }

    // ====================================================================
    // INTERNAL — HIGHLIGHTING
    // ====================================================================

    private applyHighlightVisuals(): void
    {
        const active = this.highlightedIds.size > 0;
        const model = this.graph.getDataModel();

        this.graph.batchUpdate(() =>
        {
            this.nodeCells.forEach((cell, id) =>
            {
                const opacity = active
                    ? (this.highlightedIds.has(id) ? 100 : 20)
                    : 100;
                const style = model.getStyle(cell) ?? {};
                style.opacity = opacity;
                model.setStyle(cell, style);
            });
            this.edgeCells.forEach((cell, id) =>
            {
                const edge = this.edges.find((e) => e.id === id);
                if (!edge) { return; }
                const highlighted = this.highlightedIds.has(edge.sourceId)
                    && this.highlightedIds.has(edge.targetId);
                const opacity = active ? (highlighted ? 100 : 20) : 100;
                const style = model.getStyle(cell) ?? {};
                style.opacity = opacity;
                model.setStyle(cell, style);
            });
        });
    }

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

    // ====================================================================
    // INTERNAL — CELL LOOKUPS
    // ====================================================================

    /* eslint-disable @typescript-eslint/no-explicit-any */
    private findNodeByCell(cell: any): GraphNode | null
    {
        for (const [id, c] of this.nodeCells)
        {
            if (c === cell)
            {
                return this.nodes.find((n) => n.id === id) ?? null;
            }
        }
        return null;
    }

    private findEdgeByCell(cell: any): GraphEdge | null
    {
        for (const [id, c] of this.edgeCells)
        {
            if (c === cell)
            {
                return this.edges.find((e) => e.id === id) ?? null;
            }
        }
        return null;
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */

    // ====================================================================
    // INTERNAL — UTILITY
    // ====================================================================

    private hexWithAlpha(hex: string, alpha: number): string
    {
        const h = hex.replace("#", "");
        let r = 0;
        let g = 0;
        let b = 0;
        if (h.length === 3)
        {
            r = parseInt(h[0] + h[0], 16);
            g = parseInt(h[1] + h[1], 16);
            b = parseInt(h[2] + h[2], 16);
        }
        else if (h.length === 6)
        {
            r = parseInt(h.substring(0, 2), 16);
            g = parseInt(h.substring(2, 4), 16);
            b = parseInt(h.substring(4, 6), 16);
        }
        // maxGraph expects hex colors — blend with white at given alpha
        const br = Math.round(r * alpha + 255 * (1 - alpha));
        const bg = Math.round(g * alpha + 255 * (1 - alpha));
        const bb = Math.round(b * alpha + 255 * (1 - alpha));
        return `#${br.toString(16).padStart(2, "0")}${bg.toString(16).padStart(2, "0")}${bb.toString(16).padStart(2, "0")}`;
    }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create a GraphCanvas backed by maxGraph.
 * Requires `window.maxgraph` to be available.
 * Returns null if maxGraph is not loaded.
 */
// @entrypoint
export function createGraphCanvasMx(
    options: GraphCanvasOptions
): GraphCanvas | null
{
    const mx = getMaxGraph();
    if (!mx)
    {
        console.error(
            LOG_PREFIX,
            "maxGraph not found on window.maxgraph.",
            "Load maxGraph before using GraphCanvasMx,",
            "or use GraphCanvas (custom SVG) instead."
        );
        return null;
    }
    return new GraphCanvasMxImpl(options, mx);
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

(window as unknown as Record<string, unknown>).GraphCanvasMxImpl = GraphCanvasMxImpl;
(window as unknown as Record<string, unknown>).createGraphCanvasMx = createGraphCanvasMx;
