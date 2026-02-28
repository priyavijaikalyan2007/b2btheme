/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: SpineMap
 * 📜 PURPOSE: Interactive SVG capability/feature map with a central spine,
 *    branching sub-nodes, multiple layout algorithms, zoom/pan, status
 *    color coding, cross-branch connections, and integrated editing.
 * 🔗 RELATES: [[EnterpriseTheme]], [[TreeGrid]], [[CustomComponents]]
 * ⚡ FLOW: [Consumer] -> [createSpineMap()] -> [SVG canvas + sidebar + popover]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type NodeStatus = "available" | "in-progress" | "planned"
    | "not-supported" | "deprecated" | "custom";

export type LayoutMode = "vertical" | "horizontal" | "radial" | "winding";

export type ConnectionType = "depends-on" | "works-with" | "blocks" | "enhances";

export interface SpineBranch
{
    id: string;
    label: string;
    status?: NodeStatus;
    statusLabel?: string;
    statusColor?: string;
    link?: string;
    timeframe?: string;
    description?: string;
    metadata?: Record<string, string>;
    children?: SpineBranch[];
}

export interface SpineHub
{
    id: string;
    label: string;
    status?: NodeStatus;
    statusLabel?: string;
    statusColor?: string;
    link?: string;
    timeframe?: string;
    description?: string;
    metadata?: Record<string, string>;
    branches: SpineBranch[];
}

export interface SpineConnection
{
    from: string;
    to: string;
    type: ConnectionType;
    label?: string;
}

export interface SpineMapData
{
    hubs: SpineHub[];
    connections?: SpineConnection[];
}

export interface SpineMapOptions
{
    container: HTMLElement;
    data?: SpineMapData;
    layout?: LayoutMode;
    hubSpacing?: number;
    branchSpacing?: number;
    branchLength?: number;
    editable?: boolean;
    sidebarPosition?: "left" | "right" | "none";
    sidebarWidth?: number;
    statusColors?: Partial<Record<NodeStatus, string>>;
    minZoom?: number;
    maxZoom?: number;
    initialZoom?: number;
    showToolbar?: boolean;
    showConnections?: boolean;
    showStatusLegend?: boolean;
    fitOnLoad?: boolean;
    size?: "sm" | "md" | "lg";
    cssClass?: string;
    onNodeClick?: (node: SpineHub | SpineBranch) => void;
    onNodeDoubleClick?: (node: SpineHub | SpineBranch) => void;
    onNodeHover?: (node: SpineHub | SpineBranch | null) => void;
    onNodeAdd?: (node: SpineHub | SpineBranch, parentId: string | null) => void;
    onNodeChange?: (nodeId: string, changes: Partial<SpineHub | SpineBranch>) => void;
    onNodeRemove?: (nodeId: string) => void;
    onNodeReparent?: (nodeId: string, newParentId: string | null) => void;
    onConnectionAdd?: (conn: SpineConnection) => void;
    onConnectionRemove?: (connId: string) => void;
    onLayoutChange?: (layout: string) => void;
    onZoomChange?: (zoom: number) => void;
}

// Internal position type
interface NodePos
{
    x: number;
    y: number;
}

// Internal node entry for flat lookup
interface NodeEntry
{
    type: "hub" | "branch";
    data: SpineHub | SpineBranch;
    parentId: string | null;
    depth: number;
}

// Layout options subset
interface LayoutOpts
{
    hubSpacing: number;
    branchSpacing: number;
    branchLength: number;
    canvasWidth: number;
    canvasHeight: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[SpineMap]";
const SVG_NS = "http://www.w3.org/2000/svg";

const DEFAULT_HUB_SPACING = 180;
const DEFAULT_BRANCH_SPACING = 50;
const DEFAULT_BRANCH_LENGTH = 140;
const DEFAULT_SIDEBAR_WIDTH = 320;
const DEFAULT_MIN_ZOOM = 0.1;
const DEFAULT_MAX_ZOOM = 3.0;
const ZOOM_STEP = 0.15;
const PAN_STEP = 40;
const FIT_PADDING = 60;
const CONN_CURVE_OFFSET = 40;
const COLLISION_ITERATIONS = 4;

const STATUS_COLORS: Record<string, string> =
{
    "available": "#198754",
    "in-progress": "#0d6efd",
    "planned": "#ffc107",
    "not-supported": "#adb5bd",
    "deprecated": "#dc3545",
    "custom": "#6f42c1"
};

const STATUS_LABELS: Record<string, string> =
{
    "available": "Available",
    "in-progress": "In Progress",
    "planned": "Planned",
    "not-supported": "Not Supported",
    "deprecated": "Deprecated"
};

const CONN_COLORS: Record<string, string> =
{
    "depends-on": "#fd7e14",
    "works-with": "#0d6efd",
    "blocks": "#dc3545",
    "enhances": "#198754"
};

const CONN_DASH: Record<string, string> =
{
    "depends-on": "6,3",
    "works-with": "2,4",
    "blocks": "none",
    "enhances": "8,3,2,3"
};

const SIZE_HUB_RADIUS: Record<string, number> =
    { sm: 24, md: 32, lg: 40 };
const SIZE_LEAF_WIDTH: Record<string, number> =
    { sm: 140, md: 180, lg: 220 };
const SIZE_LEAF_HEIGHT: Record<string, number> =
    { sm: 26, md: 30, lg: 36 };
const SIZE_FONT: Record<string, number> =
    { sm: 11, md: 13, lg: 15 };

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

function setAttr(
    el: Element,
    key: string,
    val: string
): void
{
    el.setAttribute(key, val);
}

function setAttrs(
    el: Element,
    attrs: Record<string, string>
): void
{
    for (const [k, v] of Object.entries(attrs))
    {
        el.setAttribute(k, v);
    }
}

// ============================================================================
// SVG HELPERS
// ============================================================================

function svgCreate(
    tag: string,
    attrs?: Record<string, string>
): SVGElement
{
    const el = document.createElementNS(SVG_NS, tag);
    if (attrs) { setAttrs(el, attrs); }
    return el;
}

function svgPath(d: string, attrs?: Record<string, string>): SVGElement
{
    const p = svgCreate("path", { d, ...attrs });
    return p;
}

function resolveStatusColor(
    node: SpineHub | SpineBranch,
    custom?: Partial<Record<NodeStatus, string>>
): string
{
    if (node.statusColor) { return node.statusColor; }
    const s = node.status || "available";
    if (custom && custom[s]) { return custom[s]!; }
    return STATUS_COLORS[s] || STATUS_COLORS["available"];
}

function truncLabel(label: string, maxChars: number): string
{
    if (label.length <= maxChars) { return label; }
    return label.slice(0, maxChars - 1) + "\u2026";
}

function safeCallback<T>(fn: T | undefined, ...args: unknown[]): void
{
    if (typeof fn === "function")
    {
        try { (fn as Function)(...args); }
        catch (e) { console.error(`${LOG_PREFIX} callback error`, e); }
    }
}

// ============================================================================
// LAYOUT ENGINE
// ============================================================================

/**
 * Collects all node IDs from a hub's branches recursively.
 */
function collectBranchIds(
    branches: SpineBranch[],
    parentId: string,
    out: Map<string, NodeEntry>,
    depth: number
): void
{
    for (const b of branches)
    {
        out.set(b.id, { type: "branch", data: b, parentId, depth });
        if (b.children && b.children.length > 0)
        {
            collectBranchIds(b.children, b.id, out, depth + 1);
        }
    }
}

/**
 * Build flat node map from hubs.
 */
function buildNodeMap(hubs: SpineHub[]): Map<string, NodeEntry>
{
    const map = new Map<string, NodeEntry>();
    for (const h of hubs)
    {
        map.set(h.id, { type: "hub", data: h, parentId: null, depth: 0 });
        collectBranchIds(h.branches, h.id, map, 1);
    }
    return map;
}

/**
 * Count total branches (including nested) for a hub.
 */
function countBranches(branches: SpineBranch[]): number
{
    let n = branches.length;
    for (const b of branches)
    {
        if (b.children) { n += countBranches(b.children); }
    }
    return n;
}

// ── Vertical Layout ──

function layoutVertical(
    hubs: SpineHub[],
    opts: LayoutOpts
): Map<string, NodePos>
{
    const pos = new Map<string, NodePos>();
    const cx = opts.canvasWidth / 2;
    let y = FIT_PADDING + 40;

    for (const hub of hubs)
    {
        pos.set(hub.id, { x: cx, y });
        layoutBranchesVertical(hub, cx, y, opts, pos);
        const clusterH = branchClusterHeight(hub.branches, opts);
        y += Math.max(opts.hubSpacing, clusterH + 40);
    }
    return pos;
}

function layoutBranchesVertical(
    hub: SpineHub,
    cx: number,
    hubY: number,
    opts: LayoutOpts,
    pos: Map<string, NodePos>
): void
{
    const left: SpineBranch[] = [];
    const right: SpineBranch[] = [];
    hub.branches.forEach((b, i) =>
    {
        if (i % 2 === 0) { left.push(b); }
        else { right.push(b); }
    });

    placeSide(left, cx, hubY, -1, opts, pos, 1);
    placeSide(right, cx, hubY, 1, opts, pos, 1);
}

function placeSide(
    branches: SpineBranch[],
    cx: number,
    hubY: number,
    dir: number,
    opts: LayoutOpts,
    pos: Map<string, NodePos>,
    depth: number
): void
{
    const startY = hubY - ((branches.length - 1) * opts.branchSpacing) / 2;
    for (let i = 0; i < branches.length; i++)
    {
        const b = branches[i];
        const bx = cx + dir * (opts.branchLength * depth);
        const by = startY + i * opts.branchSpacing;
        pos.set(b.id, { x: bx, y: by });
        if (b.children && b.children.length > 0)
        {
            placeSide(b.children, bx, by, dir, opts, pos, 1);
        }
    }
}

function branchClusterHeight(
    branches: SpineBranch[],
    opts: LayoutOpts
): number
{
    const leftCount = Math.ceil(branches.length / 2);
    const rightCount = Math.floor(branches.length / 2);
    const maxCount = Math.max(leftCount, rightCount, 1);
    return maxCount * opts.branchSpacing;
}

// ── Horizontal Layout ──

function layoutHorizontal(
    hubs: SpineHub[],
    opts: LayoutOpts
): Map<string, NodePos>
{
    const pos = new Map<string, NodePos>();
    const cy = opts.canvasHeight / 2;
    let x = FIT_PADDING + 40;

    for (const hub of hubs)
    {
        pos.set(hub.id, { x, y: cy });
        layoutBranchesHorizontal(hub, x, cy, opts, pos);
        const clusterH = branchClusterHeight(hub.branches, opts);
        x += Math.max(opts.hubSpacing, clusterH + 40);
    }
    return pos;
}

function layoutBranchesHorizontal(
    hub: SpineHub,
    hubX: number,
    cy: number,
    opts: LayoutOpts,
    pos: Map<string, NodePos>
): void
{
    const up: SpineBranch[] = [];
    const down: SpineBranch[] = [];
    hub.branches.forEach((b, i) =>
    {
        if (i % 2 === 0) { up.push(b); }
        else { down.push(b); }
    });

    placeHorizSide(up, hubX, cy, -1, opts, pos, 1);
    placeHorizSide(down, hubX, cy, 1, opts, pos, 1);
}

function placeHorizSide(
    branches: SpineBranch[],
    hubX: number,
    cy: number,
    dir: number,
    opts: LayoutOpts,
    pos: Map<string, NodePos>,
    depth: number
): void
{
    const startX = hubX - ((branches.length - 1) * opts.branchSpacing) / 2;
    for (let i = 0; i < branches.length; i++)
    {
        const b = branches[i];
        const bx = startX + i * opts.branchSpacing;
        const by = cy + dir * (opts.branchLength * depth);
        pos.set(b.id, { x: bx, y: by });
        if (b.children && b.children.length > 0)
        {
            placeHorizSide(b.children, bx, by, dir, opts, pos, 1);
        }
    }
}

// ── Radial Layout ──

function layoutRadial(
    hubs: SpineHub[],
    opts: LayoutOpts
): Map<string, NodePos>
{
    const pos = new Map<string, NodePos>();
    const n = Math.max(hubs.length, 1);
    const radius = Math.max(200, n * opts.hubSpacing / (2 * Math.PI));
    const cx = opts.canvasWidth / 2;
    const cy = radius + FIT_PADDING + 60;

    for (let i = 0; i < hubs.length; i++)
    {
        const angle = (i * 2 * Math.PI / n) - Math.PI / 2;
        const hx = cx + radius * Math.cos(angle);
        const hy = cy + radius * Math.sin(angle);
        pos.set(hubs[i].id, { x: hx, y: hy });
        layoutBranchesRadial(hubs[i], hx, hy, angle, cx, cy, opts, pos);
    }
    return pos;
}

function layoutBranchesRadial(
    hub: SpineHub,
    hx: number,
    hy: number,
    hubAngle: number,
    cx: number,
    cy: number,
    opts: LayoutOpts,
    pos: Map<string, NodePos>
): void
{
    const nb = hub.branches.length;
    if (nb === 0) { return; }
    const sector = (2 * Math.PI / Math.max(1, nb)) * 0.6;

    for (let j = 0; j < nb; j++)
    {
        const off = (j - (nb - 1) / 2) * (sector / Math.max(nb - 1, 1));
        const a = hubAngle + off;
        const bx = hx + opts.branchLength * Math.cos(a);
        const by = hy + opts.branchLength * Math.sin(a);
        pos.set(hub.branches[j].id, { x: bx, y: by });
        placeRadialChildren(hub.branches[j], bx, by, a, opts, pos);
    }
}

function placeRadialChildren(
    branch: SpineBranch,
    px: number,
    py: number,
    angle: number,
    opts: LayoutOpts,
    pos: Map<string, NodePos>
): void
{
    if (!branch.children || branch.children.length === 0) { return; }
    const nc = branch.children.length;
    const fan = 0.4;

    for (let k = 0; k < nc; k++)
    {
        const off = (k - (nc - 1) / 2) * (fan / Math.max(nc - 1, 1));
        const a = angle + off;
        const cx = px + opts.branchSpacing * Math.cos(a);
        const cy = py + opts.branchSpacing * Math.sin(a);
        pos.set(branch.children[k].id, { x: cx, y: cy });
    }
}

// ── Winding (Serpentine) Layout ──

function layoutWinding(
    hubs: SpineHub[],
    opts: LayoutOpts
): Map<string, NodePos>
{
    const pos = new Map<string, NodePos>();
    const hubsPerRow = Math.max(2,
        Math.floor((opts.canvasWidth - FIT_PADDING * 2) / opts.hubSpacing));
    const rowHeight = opts.hubSpacing * 1.4;
    const pad = FIT_PADDING + 60;

    for (let i = 0; i < hubs.length; i++)
    {
        const row = Math.floor(i / hubsPerRow);
        const col = i % hubsPerRow;
        const ltr = row % 2 === 0;
        const x = ltr
            ? pad + col * opts.hubSpacing
            : pad + (hubsPerRow - 1 - col) * opts.hubSpacing;
        const y = pad + row * rowHeight;
        pos.set(hubs[i].id, { x, y });
        layoutBranchesVertical(hubs[i], x, y, opts, pos);
    }
    return pos;
}

// ── Collision Resolution ──

function resolveCollisions(
    pos: Map<string, NodePos>,
    nodeMap: Map<string, NodeEntry>,
    leafW: number,
    leafH: number,
    hubR: number
): void
{
    const ids = Array.from(pos.keys());
    for (let iter = 0; iter < COLLISION_ITERATIONS; iter++)
    {
        for (let a = 0; a < ids.length; a++)
        {
            for (let b = a + 1; b < ids.length; b++)
            {
                nudgeIfOverlapping(
                    ids[a], ids[b], pos, nodeMap, leafW, leafH, hubR
                );
            }
        }
    }
}

function nudgeIfOverlapping(
    idA: string,
    idB: string,
    pos: Map<string, NodePos>,
    nodeMap: Map<string, NodeEntry>,
    leafW: number,
    leafH: number,
    hubR: number
): void
{
    const pa = pos.get(idA)!;
    const pb = pos.get(idB)!;
    const ea = nodeMap.get(idA);
    const eb = nodeMap.get(idB);
    const wa = ea?.type === "hub" ? hubR * 2 : leafW;
    const ha = ea?.type === "hub" ? hubR * 2 : leafH;
    const wb = eb?.type === "hub" ? hubR * 2 : leafW;
    const hb = eb?.type === "hub" ? hubR * 2 : leafH;

    const ox = (wa / 2 + wb / 2 + 8) - Math.abs(pa.x - pb.x);
    const oy = (ha / 2 + hb / 2 + 4) - Math.abs(pa.y - pb.y);
    if (ox <= 0 || oy <= 0) { return; }

    const moveB = eb?.type !== "hub";
    const target = moveB ? pb : pa;
    if (oy < ox)
    {
        target.y += (target.y >= (moveB ? pa : pb).y ? 1 : -1) * oy * 0.5;
    }
    else
    {
        target.x += (target.x >= (moveB ? pa : pb).x ? 1 : -1) * ox * 0.5;
    }
}

// ============================================================================
// CLASS: SpineMap
// ============================================================================

export class SpineMap
{
    // ── Fields ──

    private opts: Required<Pick<SpineMapOptions,
        "layout" | "hubSpacing" | "branchSpacing" | "branchLength"
        | "editable" | "sidebarWidth" | "minZoom" | "maxZoom"
        | "showToolbar" | "showConnections" | "showStatusLegend"
        | "fitOnLoad" | "size"
    >> & SpineMapOptions;

    private rootEl!: HTMLElement;
    private toolbarEl!: HTMLElement;
    private canvasWrapEl!: HTMLElement;
    private svgEl!: SVGSVGElement;
    private transformG!: SVGGElement;
    private spineG!: SVGGElement;
    private branchG!: SVGGElement;
    private nodeG!: SVGGElement;
    private connG!: SVGGElement;
    private defsEl!: SVGDefsElement;
    private popoverEl!: HTMLElement;
    private sidebarEl: HTMLElement | null = null;
    private legendEl: HTMLElement | null = null;

    private hubs: SpineHub[] = [];
    private connections: SpineConnection[] = [];
    private nodeMap = new Map<string, NodeEntry>();
    private positions = new Map<string, NodePos>();
    private manualOffsets = new Map<string, NodePos>();
    private svgNodes = new Map<string, SVGGElement>();
    private svgConns = new Map<string, SVGElement>();

    private zoom = { tx: 0, ty: 0, scale: 1 };
    private isPanning = false;
    private panStart = { x: 0, y: 0 };
    private panStartTx = 0;
    private panStartTy = 0;
    private isDragging = false;
    private dragNodeId: string | null = null;
    private dragStart = { x: 0, y: 0 };
    private isConnecting = false;
    private connectFromId: string | null = null;
    private tempConnLine: SVGElement | null = null;

    private selectedId: string | null = null;
    private popoverNodeId: string | null = null;
    private treeGridInstance: Record<string, Function> | null = null;
    private idCounter = 0;
    private liveRegion!: HTMLElement;

    // Bound handlers for cleanup
    private boundWheel!: (e: WheelEvent) => void;
    private boundPointerDown!: (e: PointerEvent) => void;
    private boundPointerMove!: (e: PointerEvent) => void;
    private boundPointerUp!: (e: PointerEvent) => void;
    private boundKeyDown!: (e: KeyboardEvent) => void;

    // ========================================================================
    // CONSTRUCTOR
    // ========================================================================

    constructor(options: SpineMapOptions)
    {
        this.opts = {
            ...options,
            layout: options.layout || "vertical",
            hubSpacing: options.hubSpacing || DEFAULT_HUB_SPACING,
            branchSpacing: options.branchSpacing || DEFAULT_BRANCH_SPACING,
            branchLength: options.branchLength || DEFAULT_BRANCH_LENGTH,
            editable: options.editable ?? false,
            sidebarWidth: options.sidebarWidth || DEFAULT_SIDEBAR_WIDTH,
            minZoom: options.minZoom ?? DEFAULT_MIN_ZOOM,
            maxZoom: options.maxZoom ?? DEFAULT_MAX_ZOOM,
            showToolbar: options.showToolbar ?? true,
            showConnections: options.showConnections ?? true,
            showStatusLegend: options.showStatusLegend ?? true,
            fitOnLoad: options.fitOnLoad ?? true,
            size: options.size || "md"
        };

        this.buildRoot();
        this.bindEvents();
        if (options.data) { this.loadData(options.data); }
        console.debug(`${LOG_PREFIX} Initialized`, this.opts.layout);
    }

    // ========================================================================
    // PUBLIC API — DATA
    // ========================================================================

    public loadData(data: SpineMapData): void
    {
        this.hubs = JSON.parse(JSON.stringify(data.hubs || []));
        this.connections = JSON.parse(
            JSON.stringify(data.connections || [])
        );
        this.nodeMap = buildNodeMap(this.hubs);
        this.computeLayout();
        this.renderAll();
        this.syncSidebar();
        if (this.opts.fitOnLoad) { this.fitToView(); }
        console.debug(`${LOG_PREFIX} Data loaded: ${this.hubs.length} hubs`);
    }

    public getData(): SpineMapData
    {
        return {
            hubs: JSON.parse(JSON.stringify(this.hubs)),
            connections: JSON.parse(JSON.stringify(this.connections))
        };
    }

    // ========================================================================
    // PUBLIC API — NODES
    // ========================================================================

    public addHub(hub: SpineHub, index?: number): void
    {
        const h = JSON.parse(JSON.stringify(hub));
        if (!h.id) { h.id = this.genId(); }
        if (index !== undefined && index < this.hubs.length)
        {
            this.hubs.splice(index, 0, h);
        }
        else { this.hubs.push(h); }
        this.refreshAfterEdit();
        safeCallback(this.opts.onNodeAdd, h, null);
        this.announce(`Hub "${h.label}" added`);
    }

    public addBranch(branch: SpineBranch, parentId: string): void
    {
        const b = JSON.parse(JSON.stringify(branch));
        if (!b.id) { b.id = this.genId(); }
        const parent = this.findNodeData(parentId);
        if (!parent) { console.warn(`${LOG_PREFIX} Parent not found`); return; }

        if ("branches" in parent) { parent.branches.push(b); }
        else
        {
            if (!parent.children) { parent.children = []; }
            parent.children.push(b);
        }
        this.refreshAfterEdit();
        safeCallback(this.opts.onNodeAdd, b, parentId);
        this.announce(`Branch "${b.label}" added`);
    }

    public updateNode(
        nodeId: string,
        changes: Partial<SpineHub | SpineBranch>
    ): void
    {
        const node = this.findNodeData(nodeId);
        if (!node) { return; }
        Object.assign(node, changes);
        this.refreshAfterEdit();
        safeCallback(this.opts.onNodeChange, nodeId, changes);
    }

    public removeNode(nodeId: string): void
    {
        const entry = this.nodeMap.get(nodeId);
        if (!entry) { return; }
        if (entry.type === "hub")
        {
            this.hubs = this.hubs.filter(h => h.id !== nodeId);
        }
        else
        {
            this.removeBranchFromParent(nodeId, entry.parentId);
        }
        this.connections = this.connections.filter(
            c => c.from !== nodeId && c.to !== nodeId
        );
        this.refreshAfterEdit();
        safeCallback(this.opts.onNodeRemove, nodeId);
        this.announce(`Node removed`);
    }

    public reparentNode(nodeId: string, newParentId: string | null): void
    {
        const entry = this.nodeMap.get(nodeId);
        if (!entry || entry.type === "hub") { return; }
        const branchData = JSON.parse(JSON.stringify(entry.data));
        this.removeBranchFromParent(nodeId, entry.parentId);
        if (newParentId)
        {
            this.addBranch(branchData, newParentId);
        }
        safeCallback(this.opts.onNodeReparent, nodeId, newParentId);
    }

    public getNode(nodeId: string): SpineHub | SpineBranch | null
    {
        return this.findNodeData(nodeId) || null;
    }

    // ========================================================================
    // PUBLIC API — CONNECTIONS
    // ========================================================================

    public addConnection(conn: SpineConnection): void
    {
        this.connections.push({ ...conn });
        this.renderConnections();
        safeCallback(this.opts.onConnectionAdd, conn);
    }

    public removeConnection(fromId: string, toId: string): void
    {
        const idx = this.connections.findIndex(
            c => c.from === fromId && c.to === toId
        );
        if (idx >= 0)
        {
            const removed = this.connections.splice(idx, 1)[0];
            this.renderConnections();
            safeCallback(this.opts.onConnectionRemove,
                `${removed.from}-${removed.to}`);
        }
    }

    public getConnections(): SpineConnection[]
    {
        return JSON.parse(JSON.stringify(this.connections));
    }

    // ========================================================================
    // PUBLIC API — LAYOUT
    // ========================================================================

    public setLayout(layout: LayoutMode): void
    {
        this.opts.layout = layout;
        this.manualOffsets.clear();
        this.computeLayout();
        this.renderAll();
        this.fitToView();
        safeCallback(this.opts.onLayoutChange, layout);
    }

    public getLayout(): LayoutMode { return this.opts.layout; }

    public relayout(): void
    {
        this.computeLayout();
        this.renderAll();
    }

    // ========================================================================
    // PUBLIC API — ZOOM & PAN
    // ========================================================================

    public zoomIn(): void
    {
        this.zoomTo(this.zoom.scale * (1 + ZOOM_STEP));
    }

    public zoomOut(): void
    {
        this.zoomTo(this.zoom.scale * (1 - ZOOM_STEP));
    }

    public zoomTo(level: number): void
    {
        this.zoom.scale = Math.max(this.opts.minZoom,
            Math.min(this.opts.maxZoom, level));
        this.applyTransform();
        safeCallback(this.opts.onZoomChange, this.zoom.scale);
    }

    public fitToView(): void
    {
        const bbox = this.computeBBox();
        const cw = this.canvasWrapEl.clientWidth || 800;
        const ch = this.canvasWrapEl.clientHeight || 600;
        const sx = (cw - FIT_PADDING * 2) / (bbox.w || 1);
        const sy = (ch - FIT_PADDING * 2) / (bbox.h || 1);
        const s = Math.min(sx, sy, this.opts.maxZoom);

        this.zoom.scale = Math.max(this.opts.minZoom, s);
        this.zoom.tx = (cw - bbox.w * this.zoom.scale) / 2
            - bbox.x * this.zoom.scale;
        this.zoom.ty = (ch - bbox.h * this.zoom.scale) / 2
            - bbox.y * this.zoom.scale;
        this.applyTransform();
    }

    public panTo(nodeId: string): void
    {
        const p = this.positions.get(nodeId);
        if (!p) { return; }
        const cw = this.canvasWrapEl.clientWidth || 800;
        const ch = this.canvasWrapEl.clientHeight || 600;
        this.zoom.tx = cw / 2 - p.x * this.zoom.scale;
        this.zoom.ty = ch / 2 - p.y * this.zoom.scale;
        this.applyTransform();
    }

    public getZoom(): number { return this.zoom.scale; }

    // ========================================================================
    // PUBLIC API — SELECTION
    // ========================================================================

    public selectNode(nodeId: string): void
    {
        this.clearSelection();
        this.selectedId = nodeId;
        const g = this.svgNodes.get(nodeId);
        if (g) { g.classList.add("spinemap-node-selected"); }
    }

    public clearSelection(): void
    {
        if (this.selectedId)
        {
            const g = this.svgNodes.get(this.selectedId);
            if (g) { g.classList.remove("spinemap-node-selected"); }
        }
        this.selectedId = null;
    }

    public getSelectedNode(): string | null { return this.selectedId; }

    // ========================================================================
    // PUBLIC API — EXPORT / IMPORT
    // ========================================================================

    public exportSVG(): string
    {
        const clone = this.svgEl.cloneNode(true) as SVGSVGElement;
        const tg = clone.querySelector(".spinemap-transform") as SVGGElement;
        if (tg) { tg.removeAttribute("transform"); }
        const bbox = this.computeBBox();
        setAttrs(clone, {
            width: String(bbox.w + FIT_PADDING * 2),
            height: String(bbox.h + FIT_PADDING * 2),
            viewBox: `${bbox.x - FIT_PADDING} ${bbox.y - FIT_PADDING} `
                + `${bbox.w + FIT_PADDING * 2} ${bbox.h + FIT_PADDING * 2}`
        });
        return new XMLSerializer().serializeToString(clone);
    }

    public exportPNG(): Promise<Blob>
    {
        return new Promise((resolve, reject) =>
        {
            const svgStr = this.exportSVG();
            const img = new Image();
            img.onload = () =>
            {
                const c = document.createElement("canvas");
                c.width = img.naturalWidth * 2;
                c.height = img.naturalHeight * 2;
                const ctx = c.getContext("2d")!;
                ctx.scale(2, 2);
                ctx.drawImage(img, 0, 0);
                c.toBlob(b => b ? resolve(b) : reject(
                    new Error("toBlob failed")), "image/png");
            };
            img.onerror = reject;
            img.src = "data:image/svg+xml;charset=utf-8,"
                + encodeURIComponent(svgStr);
        });
    }

    public exportJSON(): string
    {
        return JSON.stringify(this.getData(), null, 2);
    }

    public importJSON(json: string): void
    {
        try
        {
            const data = JSON.parse(json) as SpineMapData;
            this.loadData(data);
        }
        catch (e)
        {
            console.error(`${LOG_PREFIX} Import failed`, e);
        }
    }

    // ========================================================================
    // PUBLIC API — LIFECYCLE
    // ========================================================================

    public refresh(): void
    {
        this.nodeMap = buildNodeMap(this.hubs);
        this.computeLayout();
        this.renderAll();
    }

    public destroy(): void
    {
        this.unbindEvents();
        this.hidePopover();
        if (this.treeGridInstance && this.treeGridInstance["destroy"])
        {
            this.treeGridInstance["destroy"]();
        }
        this.rootEl.remove();
        console.debug(`${LOG_PREFIX} Destroyed`);
    }

    public getElement(): HTMLElement { return this.rootEl; }

    // ========================================================================
    // PRIVATE — BUILD DOM
    // ========================================================================

    private buildRoot(): void
    {
        const sz = this.opts.size;
        const cls = ["spinemap", `spinemap-${sz}`];
        if (this.opts.cssClass) { cls.push(this.opts.cssClass); }
        if (this.opts.editable) { cls.push("spinemap-editable"); }

        this.rootEl = htmlEl("div", { class: cls.join(" ") });
        this.liveRegion = htmlEl("div", {
            class: "spinemap-live",
            "aria-live": "polite",
            "aria-atomic": "true"
        });
        this.rootEl.appendChild(this.liveRegion);

        if (this.opts.showToolbar) { this.buildToolbar(); }
        this.buildBody();
        if (this.opts.showStatusLegend) { this.buildLegend(); }
        this.opts.container.appendChild(this.rootEl);
    }

    private buildToolbar(): void
    {
        this.toolbarEl = htmlEl("div", { class: "spinemap-toolbar" });
        this.buildLayoutSelect();
        this.buildZoomButtons();
        this.buildExportMenu();
        if (this.opts.editable) { this.buildSidebarToggle(); }
        this.rootEl.appendChild(this.toolbarEl);
    }

    private buildLayoutSelect(): void
    {
        const grp = htmlEl("div", { class: "spinemap-toolbar-group" });
        const sel = htmlEl("select", {
            class: "spinemap-layout-select",
            "aria-label": "Layout mode"
        }) as HTMLSelectElement;

        const modes: LayoutMode[] =
            ["vertical", "horizontal", "radial", "winding"];
        for (const m of modes)
        {
            const opt = htmlEl("option", { value: m },
                m.charAt(0).toUpperCase() + m.slice(1));
            if (m === this.opts.layout) { setAttr(opt, "selected", ""); }
            sel.appendChild(opt);
        }
        sel.addEventListener("change", () =>
        {
            this.setLayout(sel.value as LayoutMode);
        });
        grp.appendChild(sel);
        this.toolbarEl.appendChild(grp);
    }

    private buildZoomButtons(): void
    {
        const grp = htmlEl("div", { class: "spinemap-toolbar-group" });
        const btnIn = this.toolbarBtn("+", "Zoom in", () => this.zoomIn());
        const btnOut = this.toolbarBtn("\u2212", "Zoom out",
            () => this.zoomOut());
        const btnFit = this.toolbarBtn("\u2922", "Fit to view",
            () => this.fitToView());
        grp.append(btnIn, btnOut, btnFit);
        this.toolbarEl.appendChild(grp);
    }

    private buildExportMenu(): void
    {
        const grp = htmlEl("div", { class: "spinemap-toolbar-group" });
        const wrap = htmlEl("div", { class: "spinemap-export-wrap" });
        const btn = this.toolbarBtn("\u21E9", "Export", () =>
        {
            menu.style.display =
                menu.style.display === "none" ? "" : "none";
        });
        const menu = htmlEl("div", {
            class: "spinemap-export-menu",
            style: "display:none"
        });

        this.appendExportItems(menu);
        wrap.append(btn, menu);
        grp.appendChild(wrap);
        this.toolbarEl.appendChild(grp);
    }

    private appendExportItems(menu: HTMLElement): void
    {
        const items: [string, () => void][] = [
            ["SVG", () => this.downloadExport("svg")],
            ["PNG", () => this.downloadExport("png")],
            ["JSON", () => this.downloadExport("json")]
        ];
        for (const [label, handler] of items)
        {
            const b = htmlEl("button", {
                class: "spinemap-export-item",
                type: "button"
            }, `Export ${label}`);
            b.addEventListener("click", handler);
            menu.appendChild(b);
        }
    }

    private buildSidebarToggle(): void
    {
        const grp = htmlEl("div", { class: "spinemap-toolbar-group" });
        const btn = this.toolbarBtn("\u2630", "Toggle sidebar", () =>
        {
            if (this.sidebarEl)
            {
                const vis = this.sidebarEl.style.display !== "none";
                this.sidebarEl.style.display = vis ? "none" : "";
            }
        });
        grp.appendChild(btn);
        this.toolbarEl.appendChild(grp);
    }

    private toolbarBtn(
        text: string,
        label: string,
        handler: () => void
    ): HTMLElement
    {
        const b = htmlEl("button", {
            class: "spinemap-toolbar-btn",
            type: "button",
            "aria-label": label,
            title: label
        }, text);
        b.addEventListener("click", handler);
        return b;
    }

    private buildBody(): void
    {
        const body = htmlEl("div", { class: "spinemap-body" });
        const pos = this.opts.sidebarPosition ?? "right";

        this.buildCanvas();
        if (this.opts.editable && pos !== "none") { this.buildSidebar(); }

        if (pos === "left" && this.sidebarEl)
        {
            body.append(this.sidebarEl, this.canvasWrapEl);
        }
        else
        {
            body.appendChild(this.canvasWrapEl);
            if (this.sidebarEl) { body.appendChild(this.sidebarEl); }
        }
        this.rootEl.appendChild(body);
    }

    private buildCanvas(): void
    {
        this.canvasWrapEl = htmlEl("div", { class: "spinemap-canvas-wrap" });
        this.svgEl = svgCreate("svg", {
            class: "spinemap-canvas",
            width: "100%",
            height: "100%",
            "aria-label": "Capability map"
        }) as unknown as SVGSVGElement;

        this.defsEl = svgCreate("defs") as SVGDefsElement;
        this.buildMarkers();
        this.svgEl.appendChild(this.defsEl);

        this.transformG = svgCreate("g", {
            class: "spinemap-transform"
        }) as SVGGElement;
        this.connG = svgCreate("g",
            { class: "spinemap-connections" }) as SVGGElement;
        this.spineG = svgCreate("g",
            { class: "spinemap-spine" }) as SVGGElement;
        this.branchG = svgCreate("g",
            { class: "spinemap-branches" }) as SVGGElement;
        this.nodeG = svgCreate("g",
            { class: "spinemap-nodes" }) as SVGGElement;

        this.transformG.append(
            this.connG, this.spineG, this.branchG, this.nodeG
        );
        this.svgEl.appendChild(this.transformG);

        this.popoverEl = htmlEl("div", {
            class: "spinemap-popover",
            style: "display:none",
            role: "dialog"
        });

        this.canvasWrapEl.append(this.svgEl, this.popoverEl);
    }

    private buildMarkers(): void
    {
        const makeArrow = (id: string, color: string): void =>
        {
            const m = svgCreate("marker", {
                id,
                viewBox: "0 0 10 10",
                refX: "10",
                refY: "5",
                markerWidth: "8",
                markerHeight: "8",
                orient: "auto-start-reverse"
            });
            m.appendChild(svgCreate("path", {
                d: "M 0 0 L 10 5 L 0 10 z",
                fill: color
            }));
            this.defsEl.appendChild(m);
        };

        makeArrow("sm-arrow", "#adb5bd");
        for (const [type, color] of Object.entries(CONN_COLORS))
        {
            makeArrow(`sm-arrow-${type}`, color);
        }
    }

    private buildSidebar(): void
    {
        const w = this.opts.sidebarWidth;
        this.sidebarEl = htmlEl("div", {
            class: "spinemap-sidebar",
            style: `width:${w}px`
        });

        const hdr = htmlEl("div", { class: "spinemap-sidebar-header" });
        hdr.appendChild(htmlEl("span", {
            class: "spinemap-sidebar-title"
        }, "Map Structure"));

        const toolbar = htmlEl("div", { class: "spinemap-sidebar-toolbar" });
        const addBtn = htmlEl("button", {
            class: "spinemap-sidebar-add btn btn-sm btn-primary",
            type: "button"
        }, "+ Add Hub");
        addBtn.addEventListener("click", () => this.addHubFromSidebar());
        toolbar.appendChild(addBtn);

        const treeWrap = htmlEl("div", {
            class: "spinemap-sidebar-tree",
            id: `spinemap-tree-${Date.now()}`
        });

        this.sidebarEl.append(hdr, toolbar, treeWrap);
    }

    private buildLegend(): void
    {
        this.legendEl = htmlEl("div", { class: "spinemap-legend" });
        const statuses: NodeStatus[] = [
            "available", "in-progress", "planned",
            "not-supported", "deprecated"
        ];
        for (const s of statuses)
        {
            const item = htmlEl("div", { class: "spinemap-legend-item" });
            const dot = htmlEl("span", {
                class: "spinemap-legend-dot",
                style: `background:${
                    this.opts.statusColors?.[s] || STATUS_COLORS[s]
                }`
            });
            const lbl = htmlEl("span", {
                class: "spinemap-legend-label"
            }, STATUS_LABELS[s]);
            item.append(dot, lbl);
            this.legendEl.appendChild(item);
        }
        this.rootEl.appendChild(this.legendEl);
    }

    // ========================================================================
    // PRIVATE — SVG RENDERING
    // ========================================================================

    private renderAll(): void
    {
        this.clearSvgGroups();
        this.renderSpinePath();
        this.renderBranchPaths();
        this.renderNodes();
        if (this.opts.showConnections) { this.renderConnections(); }
    }

    private clearSvgGroups(): void
    {
        this.spineG.innerHTML = "";
        this.branchG.innerHTML = "";
        this.nodeG.innerHTML = "";
        this.connG.innerHTML = "";
        this.svgNodes.clear();
        this.svgConns.clear();
    }

    private renderSpinePath(): void
    {
        if (this.hubs.length < 2) { return; }
        const pts = this.hubs.map(h => this.positions.get(h.id)!);
        const d = this.buildSpinePathD(pts);
        const path = svgPath(d, {
            class: "spinemap-spine-path",
            fill: "none",
            stroke: "#adb5bd",
            "stroke-width": "3"
        });
        this.spineG.appendChild(path);
    }

    private buildSpinePathD(pts: NodePos[]): string
    {
        if (pts.length === 0) { return ""; }
        let d = `M ${pts[0].x},${pts[0].y}`;
        for (let i = 1; i < pts.length; i++)
        {
            d += ` L ${pts[i].x},${pts[i].y}`;
        }
        return d;
    }

    private renderBranchPaths(): void
    {
        for (const hub of this.hubs)
        {
            const hp = this.positions.get(hub.id);
            if (!hp) { continue; }
            this.renderBranchPathsForNode(hub.branches, hp);
        }
    }

    private renderBranchPathsForNode(
        branches: SpineBranch[],
        parentPos: NodePos
    ): void
    {
        for (const b of branches)
        {
            const bp = this.positions.get(b.id);
            if (!bp) { continue; }
            const d = this.orthogonalPath(
                parentPos.x, parentPos.y, bp.x, bp.y
            );
            const path = svgPath(d, {
                class: "spinemap-branch-path",
                fill: "none",
                stroke: "#ced4da",
                "stroke-width": "1.5",
                "marker-end": "url(#sm-arrow)"
            });
            this.branchG.appendChild(path);
            if (b.children && b.children.length > 0)
            {
                this.renderBranchPathsForNode(b.children, bp);
            }
        }
    }

    private orthogonalPath(
        x1: number, y1: number,
        x2: number, y2: number
    ): string
    {
        const mx = (x1 + x2) / 2;
        return `M ${x1},${y1} L ${mx},${y1} L ${mx},${y2} L ${x2},${y2}`;
    }

    private renderNodes(): void
    {
        for (const hub of this.hubs)
        {
            this.renderHubNode(hub);
            this.renderBranchNodes(hub.branches);
        }
    }

    private renderHubNode(hub: SpineHub): void
    {
        const p = this.positions.get(hub.id);
        if (!p) { return; }
        const r = SIZE_HUB_RADIUS[this.opts.size];
        const fs = SIZE_FONT[this.opts.size];
        const color = resolveStatusColor(hub, this.opts.statusColors);

        const g = svgCreate("g", {
            class: "spinemap-hub",
            "data-id": hub.id,
            tabindex: "0",
            role: "button",
            "aria-label": `${hub.label}, ${hub.status || "available"}`,
            transform: `translate(${p.x},${p.y})`
        }) as SVGGElement;

        g.appendChild(svgCreate("circle", {
            class: "spinemap-hub-ring",
            r: String(r),
            fill: "#f8f9fa",
            stroke: "#adb5bd",
            "stroke-width": "2"
        }));
        g.appendChild(svgCreate("circle", {
            class: "spinemap-hub-ring-inner",
            r: String(r - 5),
            fill: "none",
            stroke: color,
            "stroke-width": "2.5"
        }));

        const maxChars = Math.floor((r * 2 - 8) / (fs * 0.6));
        const txt = svgCreate("text", {
            class: "spinemap-hub-label",
            "text-anchor": "middle",
            "dominant-baseline": "central",
            "font-size": `${fs}px`,
            fill: "#212529"
        });
        txt.textContent = truncLabel(hub.label, maxChars);
        g.appendChild(txt);

        this.attachNodeEvents(g, hub.id);
        this.nodeG.appendChild(g);
        this.svgNodes.set(hub.id, g);
    }

    private renderBranchNodes(branches: SpineBranch[]): void
    {
        for (const b of branches)
        {
            this.renderLeafNode(b);
            if (b.children && b.children.length > 0)
            {
                this.renderBranchNodes(b.children);
            }
        }
    }

    private renderLeafNode(branch: SpineBranch): void
    {
        const p = this.positions.get(branch.id);
        if (!p) { return; }
        const w = SIZE_LEAF_WIDTH[this.opts.size];
        const h = SIZE_LEAF_HEIGHT[this.opts.size];
        const fs = SIZE_FONT[this.opts.size];
        const color = resolveStatusColor(branch, this.opts.statusColors);

        const g = svgCreate("g", {
            class: "spinemap-leaf",
            "data-id": branch.id,
            tabindex: "0",
            role: "button",
            "aria-label": `${branch.label}, ${branch.status || "available"}`,
            transform: `translate(${p.x},${p.y})`
        }) as SVGGElement;

        g.appendChild(svgCreate("rect", {
            class: "spinemap-leaf-rect",
            x: String(-w / 2), y: String(-h / 2),
            width: String(w), height: String(h),
            rx: "4",
            fill: "#f8f9fa",
            stroke: "#ced4da",
            "stroke-width": "1"
        }));
        g.appendChild(svgCreate("circle", {
            class: "spinemap-leaf-status",
            cx: String(-w / 2 + 10),
            cy: "0",
            r: String(SIZE_FONT[this.opts.size] * 0.3),
            fill: color
        }));

        const maxChars = Math.floor((w - 28) / (fs * 0.6));
        const txt = svgCreate("text", {
            class: "spinemap-leaf-label",
            x: String(-w / 2 + 20),
            "dominant-baseline": "central",
            "font-size": `${fs}px`,
            fill: "#212529"
        });
        txt.textContent = truncLabel(branch.label, maxChars);
        g.appendChild(txt);

        this.attachNodeEvents(g, branch.id);
        this.nodeG.appendChild(g);
        this.svgNodes.set(branch.id, g);
    }

    private renderConnections(): void
    {
        this.connG.innerHTML = "";
        this.svgConns.clear();
        for (const c of this.connections)
        {
            this.renderOneConnection(c);
        }
    }

    private renderOneConnection(conn: SpineConnection): void
    {
        const pa = this.positions.get(conn.from);
        const pb = this.positions.get(conn.to);
        if (!pa || !pb) { return; }

        const color = CONN_COLORS[conn.type] || "#6c757d";
        const dash = CONN_DASH[conn.type] || "none";
        const d = this.curvedConnPath(pa.x, pa.y, pb.x, pb.y);

        const attrs: Record<string, string> = {
            class: `spinemap-conn spinemap-conn-${conn.type}`,
            "data-from": conn.from,
            "data-to": conn.to,
            d,
            fill: "none",
            stroke: color,
            "stroke-width": "2"
        };
        if (dash !== "none") { attrs["stroke-dasharray"] = dash; }
        if (conn.type !== "works-with")
        {
            attrs["marker-end"] = `url(#sm-arrow-${conn.type})`;
        }

        const path = svgPath("", attrs);
        setAttr(path, "d", d);
        this.addConnClickHandler(path, conn);
        this.connG.appendChild(path);
        this.svgConns.set(`${conn.from}-${conn.to}`, path);

        if (conn.label) { this.renderConnLabel(conn, pa, pb); }
    }

    private curvedConnPath(
        x1: number, y1: number,
        x2: number, y2: number
    ): string
    {
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        const dy = Math.abs(y2 - y1);
        const offset = Math.max(CONN_CURVE_OFFSET, dy * 0.3);
        return `M ${x1},${y1} Q ${mx},${my - offset} ${x2},${y2}`;
    }

    private renderConnLabel(
        conn: SpineConnection,
        pa: NodePos,
        pb: NodePos
    ): void
    {
        const mx = (pa.x + pb.x) / 2;
        const my = (pa.y + pb.y) / 2 - 12;
        const bg = svgCreate("rect", {
            x: String(mx - 30), y: String(my - 8),
            width: "60", height: "16", rx: "3",
            fill: "#f8f9fa", stroke: "#ced4da", "stroke-width": "0.5"
        });
        const txt = svgCreate("text", {
            x: String(mx), y: String(my + 3),
            "text-anchor": "middle",
            "font-size": "10",
            fill: "#6c757d"
        });
        txt.textContent = conn.label || "";
        this.connG.append(bg, txt);
    }

    private addConnClickHandler(
        path: SVGElement,
        conn: SpineConnection
    ): void
    {
        path.style.cursor = "pointer";
        path.addEventListener("click", (e) =>
        {
            e.stopPropagation();
            if (this.opts.editable)
            {
                if (confirm(`Remove "${conn.type}" connection?`))
                {
                    this.removeConnection(conn.from, conn.to);
                }
            }
        });
    }

    // ========================================================================
    // PRIVATE — LAYOUT COMPUTATION
    // ========================================================================

    private computeLayout(): void
    {
        this.nodeMap = buildNodeMap(this.hubs);
        const cw = this.canvasWrapEl?.clientWidth || 800;
        const ch = this.canvasWrapEl?.clientHeight || 600;
        const lo: LayoutOpts = {
            hubSpacing: this.opts.hubSpacing,
            branchSpacing: this.opts.branchSpacing,
            branchLength: this.opts.branchLength,
            canvasWidth: Math.max(cw, 600),
            canvasHeight: Math.max(ch, 400)
        };

        this.positions = this.dispatchLayout(lo);
        this.applyManualOffsets();
        this.runCollisionPass();
    }

    private dispatchLayout(lo: LayoutOpts): Map<string, NodePos>
    {
        switch (this.opts.layout)
        {
            case "horizontal": return layoutHorizontal(this.hubs, lo);
            case "radial": return layoutRadial(this.hubs, lo);
            case "winding": return layoutWinding(this.hubs, lo);
            default: return layoutVertical(this.hubs, lo);
        }
    }

    private applyManualOffsets(): void
    {
        for (const [id, off] of this.manualOffsets)
        {
            const p = this.positions.get(id);
            if (p) { p.x += off.x; p.y += off.y; }
        }
    }

    private runCollisionPass(): void
    {
        resolveCollisions(
            this.positions,
            this.nodeMap,
            SIZE_LEAF_WIDTH[this.opts.size],
            SIZE_LEAF_HEIGHT[this.opts.size],
            SIZE_HUB_RADIUS[this.opts.size]
        );
    }

    // ========================================================================
    // PRIVATE — ZOOM / PAN HANDLERS
    // ========================================================================

    private applyTransform(): void
    {
        const { tx, ty, scale } = this.zoom;
        setAttr(this.transformG,
            "transform", `translate(${tx},${ty}) scale(${scale})`);
    }

    private onWheel(e: WheelEvent): void
    {
        e.preventDefault();
        const dir = e.deltaY < 0 ? 1 : -1;
        const factor = 1 + dir * ZOOM_STEP;
        const rect = this.svgEl.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        const oldScale = this.zoom.scale;
        const newScale = Math.max(this.opts.minZoom,
            Math.min(this.opts.maxZoom, oldScale * factor));

        this.zoom.tx = mx - (mx - this.zoom.tx) * (newScale / oldScale);
        this.zoom.ty = my - (my - this.zoom.ty) * (newScale / oldScale);
        this.zoom.scale = newScale;
        this.applyTransform();
        safeCallback(this.opts.onZoomChange, newScale);
    }

    private onPointerDown(e: PointerEvent): void
    {
        if (e.button !== 0) { return; }
        const target = (e.target as Element).closest("[data-id]");

        if (target && this.opts.editable && e.shiftKey)
        {
            this.startConnection(target.getAttribute("data-id")!, e);
            return;
        }
        if (target && this.opts.editable && !e.shiftKey)
        {
            this.startDrag(target.getAttribute("data-id")!, e);
            return;
        }
        this.startPan(e);
    }

    private onPointerMove(e: PointerEvent): void
    {
        if (this.isPanning) { this.doPan(e); }
        else if (this.isDragging) { this.doDrag(e); }
        else if (this.isConnecting) { this.doConnection(e); }
    }

    private onPointerUp(e: PointerEvent): void
    {
        if (this.isPanning) { this.endPan(); }
        else if (this.isDragging) { this.endDrag(e); }
        else if (this.isConnecting) { this.endConnection(e); }
    }

    private startPan(e: PointerEvent): void
    {
        this.isPanning = true;
        this.panStart = { x: e.clientX, y: e.clientY };
        this.panStartTx = this.zoom.tx;
        this.panStartTy = this.zoom.ty;
        this.svgEl.style.cursor = "grabbing";
    }

    private doPan(e: PointerEvent): void
    {
        this.zoom.tx = this.panStartTx + (e.clientX - this.panStart.x);
        this.zoom.ty = this.panStartTy + (e.clientY - this.panStart.y);
        this.applyTransform();
    }

    private endPan(): void
    {
        this.isPanning = false;
        this.svgEl.style.cursor = "";
    }

    // ========================================================================
    // PRIVATE — VISUAL EDITING (DRAG)
    // ========================================================================

    private startDrag(nodeId: string, e: PointerEvent): void
    {
        this.isDragging = true;
        this.dragNodeId = nodeId;
        this.dragStart = { x: e.clientX, y: e.clientY };
        this.selectNode(nodeId);
    }

    private doDrag(e: PointerEvent): void
    {
        if (!this.dragNodeId) { return; }
        const dx = (e.clientX - this.dragStart.x) / this.zoom.scale;
        const dy = (e.clientY - this.dragStart.y) / this.zoom.scale;
        const g = this.svgNodes.get(this.dragNodeId);
        const p = this.positions.get(this.dragNodeId);
        if (!g || !p) { return; }

        setAttr(g, "transform",
            `translate(${p.x + dx},${p.y + dy})`);
    }

    private endDrag(e: PointerEvent): void
    {
        if (!this.dragNodeId) { this.isDragging = false; return; }
        const dx = (e.clientX - this.dragStart.x) / this.zoom.scale;
        const dy = (e.clientY - this.dragStart.y) / this.zoom.scale;

        if (Math.abs(dx) > 5 || Math.abs(dy) > 5)
        {
            this.applyDragOffset(dx, dy);
        }
        else
        {
            this.handleNodeClick(this.dragNodeId);
        }
        this.isDragging = false;
        this.dragNodeId = null;
    }

    private applyDragOffset(dx: number, dy: number): void
    {
        const id = this.dragNodeId!;
        const existing = this.manualOffsets.get(id) || { x: 0, y: 0 };
        this.manualOffsets.set(id,
            { x: existing.x + dx, y: existing.y + dy });
        this.computeLayout();
        this.renderAll();
    }

    // ========================================================================
    // PRIVATE — VISUAL EDITING (CONNECTIONS)
    // ========================================================================

    private startConnection(nodeId: string, e: PointerEvent): void
    {
        this.isConnecting = true;
        this.connectFromId = nodeId;
        const p = this.positions.get(nodeId);
        if (!p) { return; }
        this.tempConnLine = svgPath(
            `M ${p.x},${p.y} L ${p.x},${p.y}`,
            { stroke: "#6c757d", "stroke-width": "2",
              "stroke-dasharray": "4,4", fill: "none" }
        );
        this.connG.appendChild(this.tempConnLine);
    }

    private doConnection(e: PointerEvent): void
    {
        if (!this.tempConnLine || !this.connectFromId) { return; }
        const rect = this.svgEl.getBoundingClientRect();
        const sx = (e.clientX - rect.left - this.zoom.tx) / this.zoom.scale;
        const sy = (e.clientY - rect.top - this.zoom.ty) / this.zoom.scale;
        const fp = this.positions.get(this.connectFromId)!;
        setAttr(this.tempConnLine, "d",
            `M ${fp.x},${fp.y} L ${sx},${sy}`);
    }

    private endConnection(e: PointerEvent): void
    {
        if (this.tempConnLine)
        {
            this.tempConnLine.remove();
            this.tempConnLine = null;
        }
        this.isConnecting = false;

        const target = (e.target as Element).closest("[data-id]");
        if (target && this.connectFromId)
        {
            const toId = target.getAttribute("data-id")!;
            if (toId !== this.connectFromId)
            {
                this.promptConnectionType(this.connectFromId, toId);
            }
        }
        this.connectFromId = null;
    }

    private promptConnectionType(fromId: string, toId: string): void
    {
        const types: ConnectionType[] =
            ["depends-on", "works-with", "blocks", "enhances"];
        const choice = prompt(
            "Connection type:\n1) depends-on\n2) works-with\n"
            + "3) blocks\n4) enhances\nEnter number (1-4):"
        );
        const idx = parseInt(choice || "", 10) - 1;
        if (idx >= 0 && idx < types.length)
        {
            this.addConnection({ from: fromId, to: toId, type: types[idx] });
        }
    }

    // ========================================================================
    // PRIVATE — NODE EVENTS
    // ========================================================================

    private attachNodeEvents(g: SVGGElement, nodeId: string): void
    {
        g.addEventListener("click", (e) =>
        {
            e.stopPropagation();
            if (!this.isDragging && !this.isConnecting)
            {
                this.handleNodeClick(nodeId);
            }
        });
        g.addEventListener("dblclick", (e) =>
        {
            e.stopPropagation();
            this.handleNodeDblClick(nodeId);
        });
        g.addEventListener("mouseenter", () =>
        {
            const node = this.findNodeData(nodeId);
            safeCallback(this.opts.onNodeHover, node);
        });
        g.addEventListener("mouseleave", () =>
        {
            safeCallback(this.opts.onNodeHover, null);
        });
    }

    private handleNodeClick(nodeId: string): void
    {
        this.selectNode(nodeId);
        this.showPopover(nodeId);
        const node = this.findNodeData(nodeId);
        safeCallback(this.opts.onNodeClick, node);
    }

    private handleNodeDblClick(nodeId: string): void
    {
        if (this.opts.editable)
        {
            this.showPopover(nodeId, true);
        }
        const node = this.findNodeData(nodeId);
        safeCallback(this.opts.onNodeDoubleClick, node);
    }

    // ========================================================================
    // PRIVATE — POPOVER
    // ========================================================================

    private showPopover(nodeId: string, editMode = false): void
    {
        this.hidePopover();
        this.popoverNodeId = nodeId;
        const node = this.findNodeData(nodeId);
        if (!node) { return; }

        this.popoverEl.innerHTML = "";
        this.popoverEl.style.display = "";

        if (editMode && this.opts.editable)
        {
            this.buildPopoverEdit(node, nodeId);
        }
        else
        {
            this.buildPopoverView(node, nodeId);
        }
        this.positionPopover(nodeId);
    }

    private hidePopover(): void
    {
        this.popoverEl.style.display = "none";
        this.popoverEl.innerHTML = "";
        this.popoverNodeId = null;
    }

    private buildPopoverView(
        node: SpineHub | SpineBranch,
        nodeId: string
    ): void
    {
        const hdr = this.buildPopoverHeader(node.label);
        const body = htmlEl("div", { class: "spinemap-popover-body" });

        this.appendPopoverField(body, "Status",
            this.statusBadge(node));
        if (node.timeframe)
        {
            this.appendPopoverField(body, "Timeframe", node.timeframe);
        }
        if (node.link)
        {
            this.appendPopoverLink(body, node.link);
        }
        if (node.description)
        {
            this.appendPopoverField(body, "Description", node.description);
        }
        this.appendPopoverDeps(body, nodeId);

        this.popoverEl.append(hdr, body);
        if (this.opts.editable) { this.appendPopoverActions(nodeId); }
    }

    private buildPopoverHeader(title: string): HTMLElement
    {
        const hdr = htmlEl("div", { class: "spinemap-popover-header" });
        hdr.appendChild(htmlEl("span", {
            class: "spinemap-popover-title"
        }, title));
        const closeBtn = htmlEl("button", {
            class: "spinemap-popover-close",
            type: "button",
            "aria-label": "Close"
        }, "\u00D7");
        closeBtn.addEventListener("click", () => this.hidePopover());
        hdr.appendChild(closeBtn);
        return hdr;
    }

    private appendPopoverField(
        body: HTMLElement,
        label: string,
        value: string | HTMLElement
    ): void
    {
        const row = htmlEl("div", { class: "spinemap-popover-field" });
        row.appendChild(htmlEl("span", {
            class: "spinemap-popover-label"
        }, label + ":"));
        if (typeof value === "string")
        {
            row.appendChild(htmlEl("span", {
                class: "spinemap-popover-value"
            }, value));
        }
        else { row.appendChild(value); }
        body.appendChild(row);
    }

    private appendPopoverLink(body: HTMLElement, link: string): void
    {
        const row = htmlEl("div", { class: "spinemap-popover-field" });
        row.appendChild(htmlEl("span", {
            class: "spinemap-popover-label"
        }, "Link:"));
        const a = htmlEl("a", {
            class: "spinemap-popover-link",
            href: link,
            target: "_blank",
            rel: "noopener"
        }, truncLabel(link, 30));
        row.appendChild(a);
        body.appendChild(row);
    }

    private appendPopoverDeps(body: HTMLElement, nodeId: string): void
    {
        const deps = this.connections.filter(
            c => c.from === nodeId || c.to === nodeId
        );
        if (deps.length === 0) { return; }
        const wrap = htmlEl("div", { class: "spinemap-popover-deps" });
        wrap.appendChild(htmlEl("span", {
            class: "spinemap-popover-label"
        }, "Connections:"));
        for (const d of deps)
        {
            const otherId = d.from === nodeId ? d.to : d.from;
            const other = this.findNodeData(otherId);
            const txt = `${d.type}: ${other?.label || otherId}`;
            wrap.appendChild(htmlEl("div", {
                class: "spinemap-popover-dep"
            }, txt));
        }
        body.appendChild(wrap);
    }

    private statusBadge(node: SpineHub | SpineBranch): HTMLElement
    {
        const s = node.status || "available";
        const color = resolveStatusColor(node, this.opts.statusColors);
        const label = node.statusLabel || STATUS_LABELS[s] || s;
        const badge = htmlEl("span", {
            class: "spinemap-status-badge",
            style: `background:${color}`
        }, label);
        return badge;
    }

    private appendPopoverActions(nodeId: string): void
    {
        const acts = htmlEl("div", { class: "spinemap-popover-actions" });
        const editBtn = htmlEl("button", {
            class: "spinemap-popover-btn", type: "button"
        }, "Edit");
        editBtn.addEventListener("click", () =>
            this.showPopover(nodeId, true));

        const addBtn = htmlEl("button", {
            class: "spinemap-popover-btn", type: "button"
        }, "Add Child");
        addBtn.addEventListener("click", () =>
            this.addChildFromPopover(nodeId));

        const delBtn = htmlEl("button", {
            class: "spinemap-popover-btn spinemap-popover-btn-danger",
            type: "button"
        }, "Remove");
        delBtn.addEventListener("click", () =>
        {
            if (confirm("Remove this node and all children?"))
            {
                this.removeNode(nodeId);
                this.hidePopover();
            }
        });

        acts.append(editBtn, addBtn, delBtn);
        this.popoverEl.appendChild(acts);
    }

    private buildPopoverEdit(
        node: SpineHub | SpineBranch,
        nodeId: string
    ): void
    {
        const hdr = this.buildPopoverHeader("Edit: " + node.label);
        const body = htmlEl("div", { class: "spinemap-popover-body" });

        const fields = this.buildEditFields(node);
        body.appendChild(fields.container);

        const foot = htmlEl("div", { class: "spinemap-popover-actions" });
        const saveBtn = htmlEl("button", {
            class: "spinemap-popover-btn spinemap-popover-btn-primary",
            type: "button"
        }, "Save");
        saveBtn.addEventListener("click", () =>
        {
            this.savePopoverEdit(nodeId, fields);
        });
        const cancelBtn = htmlEl("button", {
            class: "spinemap-popover-btn", type: "button"
        }, "Cancel");
        cancelBtn.addEventListener("click", () =>
            this.showPopover(nodeId, false));

        foot.append(saveBtn, cancelBtn);
        this.popoverEl.append(hdr, body, foot);
    }

    private buildEditFields(
        node: SpineHub | SpineBranch
    ): {
        container: HTMLElement;
        label: HTMLInputElement;
        status: HTMLSelectElement;
        timeframe: HTMLInputElement;
        link: HTMLInputElement;
        description: HTMLTextAreaElement;
    }
    {
        const c = htmlEl("div", { class: "spinemap-popover-form" });

        const label = this.editInput("Label", node.label);
        const status = this.editSelect("Status", node.status || "available");
        const timeframe = this.editInput("Timeframe", node.timeframe || "");
        const link = this.editInput("Link", node.link || "");
        const description = this.editTextarea("Description",
            node.description || "");

        c.append(
            label.wrap, status.wrap, timeframe.wrap,
            link.wrap, description.wrap
        );
        return {
            container: c,
            label: label.input,
            status: status.select,
            timeframe: timeframe.input,
            link: link.input,
            description: description.textarea
        };
    }

    private editInput(
        lbl: string,
        val: string
    ): { wrap: HTMLElement; input: HTMLInputElement }
    {
        const wrap = htmlEl("div", { class: "spinemap-edit-field" });
        wrap.appendChild(htmlEl("label", {}, lbl));
        const input = htmlEl("input", {
            type: "text",
            class: "spinemap-edit-input",
            value: val
        }) as HTMLInputElement;
        wrap.appendChild(input);
        return { wrap, input };
    }

    private editSelect(
        lbl: string,
        val: string
    ): { wrap: HTMLElement; select: HTMLSelectElement }
    {
        const wrap = htmlEl("div", { class: "spinemap-edit-field" });
        wrap.appendChild(htmlEl("label", {}, lbl));
        const sel = htmlEl("select", {
            class: "spinemap-edit-select"
        }) as HTMLSelectElement;
        const statuses: NodeStatus[] = [
            "available", "in-progress", "planned",
            "not-supported", "deprecated"
        ];
        for (const s of statuses)
        {
            const o = htmlEl("option", { value: s },
                STATUS_LABELS[s]) as HTMLOptionElement;
            if (s === val) { o.selected = true; }
            sel.appendChild(o);
        }
        wrap.appendChild(sel);
        return { wrap, select: sel };
    }

    private editTextarea(
        lbl: string,
        val: string
    ): { wrap: HTMLElement; textarea: HTMLTextAreaElement }
    {
        const wrap = htmlEl("div", { class: "spinemap-edit-field" });
        wrap.appendChild(htmlEl("label", {}, lbl));
        const ta = htmlEl("textarea", {
            class: "spinemap-edit-textarea",
            rows: "2"
        }) as HTMLTextAreaElement;
        ta.value = val;
        wrap.appendChild(ta);
        return { wrap, textarea: ta };
    }

    private savePopoverEdit(
        nodeId: string,
        fields: {
            label: HTMLInputElement;
            status: HTMLSelectElement;
            timeframe: HTMLInputElement;
            link: HTMLInputElement;
            description: HTMLTextAreaElement;
        }
    ): void
    {
        this.updateNode(nodeId, {
            label: fields.label.value,
            status: fields.status.value as NodeStatus,
            timeframe: fields.timeframe.value || undefined,
            link: fields.link.value || undefined,
            description: fields.description.value || undefined
        });
        this.showPopover(nodeId, false);
    }

    private addChildFromPopover(parentId: string): void
    {
        const newId = this.genId();
        const child: SpineBranch = {
            id: newId,
            label: "New Item",
            status: "planned",
            children: []
        };
        this.addBranch(child, parentId);
        this.hidePopover();
        requestAnimationFrame(() => this.showPopover(newId, true));
    }

    private positionPopover(nodeId: string): void
    {
        const g = this.svgNodes.get(nodeId);
        if (!g) { return; }
        const gRect = g.getBoundingClientRect();
        const wrapRect = this.canvasWrapEl.getBoundingClientRect();

        const left = gRect.left - wrapRect.left
            + gRect.width / 2 - 150;
        const top = gRect.bottom - wrapRect.top + 8;

        this.popoverEl.style.position = "absolute";
        this.popoverEl.style.left = `${Math.max(4, left)}px`;
        this.popoverEl.style.top = `${top}px`;
    }

    // ========================================================================
    // PRIVATE — SIDEBAR (TreeGrid Bridge)
    // ========================================================================

    private syncSidebar(): void
    {
        if (!this.sidebarEl) { return; }
        const treeWrap = this.sidebarEl.querySelector(
            ".spinemap-sidebar-tree"
        ) as HTMLElement;
        if (!treeWrap) { return; }

        if (this.treeGridInstance)
        {
            this.updateTreeGridData();
            return;
        }
        this.initTreeGrid(treeWrap);
    }

    private initTreeGrid(container: HTMLElement): void
    {
        const createFn = (
            window as unknown as Record<string, unknown>
        ).createTreeGrid as
            ((o: Record<string, unknown>) => Record<string, Function>)
            | undefined;

        if (!createFn)
        {
            this.buildFallbackTree(container);
            return;
        }
        this.treeGridInstance = createFn({
            containerId: container.id,
            label: "SpineMap structure",
            nodes: this.buildTreeGridNodes(),
            columns: this.treeGridColumns(),
            treeColumnLabel: "Name",
            treeColumnWidth: 160,
            selectionMode: "single",
            enableDragDrop: true,
            onRowSelect: (node: Record<string, unknown>) =>
            {
                this.selectNode(node["id"] as string);
                this.panTo(node["id"] as string);
            },
            onEditCommit: (
                node: Record<string, unknown>,
                col: Record<string, unknown>,
                _old: unknown,
                val: unknown
            ) =>
            {
                this.handleTreeEdit(
                    node["id"] as string,
                    col["id"] as string,
                    val as string
                );
            },
            onDrop: (
                src: Record<string, unknown>,
                tgt: Record<string, unknown>
            ) =>
            {
                this.reparentNode(
                    src["id"] as string,
                    tgt["id"] as string
                );
            }
        });
    }

    private treeGridColumns(): Record<string, unknown>[]
    {
        return [
            {
                id: "status", label: "Status", width: 100,
                editable: true, editorType: "select",
                editorOptions: [
                    { value: "available", label: "Available" },
                    { value: "in-progress", label: "In Progress" },
                    { value: "planned", label: "Planned" },
                    { value: "not-supported", label: "Not Supported" },
                    { value: "deprecated", label: "Deprecated" }
                ]
            },
            {
                id: "timeframe", label: "Timeframe", width: 90,
                editable: true, editorType: "text"
            }
        ];
    }

    private buildTreeGridNodes(): Record<string, unknown>[]
    {
        return this.hubs.map(h => ({
            id: h.id,
            label: h.label,
            data: {
                status: h.status || "available",
                timeframe: h.timeframe || ""
            },
            children: this.branchesToTreeNodes(h.branches)
        }));
    }

    private branchesToTreeNodes(
        branches: SpineBranch[]
    ): Record<string, unknown>[]
    {
        return branches.map(b => ({
            id: b.id,
            label: b.label,
            data: {
                status: b.status || "available",
                timeframe: b.timeframe || ""
            },
            children: b.children
                ? this.branchesToTreeNodes(b.children)
                : []
        }));
    }

    private updateTreeGridData(): void
    {
        if (!this.treeGridInstance) { return; }
        // Full refresh: rebuild nodes
        const loadFn = this.treeGridInstance["loadData"]
            || this.treeGridInstance["refresh"];
        if (loadFn)
        {
            // TreeGrid doesn't have loadData; use refresh pattern
        }
    }

    private handleTreeEdit(
        nodeId: string,
        colId: string,
        value: string
    ): void
    {
        const changes: Record<string, unknown> = {};
        changes[colId] = value;
        this.updateNode(nodeId, changes as Partial<SpineHub | SpineBranch>);
    }

    private buildFallbackTree(container: HTMLElement): void
    {
        container.innerHTML = "";
        const list = htmlEl("div", { class: "spinemap-fallback-tree" });
        for (const hub of this.hubs)
        {
            this.buildFallbackHubRow(list, hub);
        }
        container.appendChild(list);
    }

    private buildFallbackHubRow(
        list: HTMLElement,
        hub: SpineHub
    ): void
    {
        const row = htmlEl("div", {
            class: "spinemap-fallback-row spinemap-fallback-hub"
        });
        row.appendChild(htmlEl("span", {}, hub.label));
        row.addEventListener("click", () =>
        {
            this.selectNode(hub.id);
            this.panTo(hub.id);
        });
        list.appendChild(row);

        for (const b of hub.branches)
        {
            this.buildFallbackBranchRow(list, b, 1);
        }
    }

    private buildFallbackBranchRow(
        list: HTMLElement,
        branch: SpineBranch,
        depth: number
    ): void
    {
        const row = htmlEl("div", {
            class: "spinemap-fallback-row",
            style: `padding-left:${depth * 16}px`
        });
        row.appendChild(htmlEl("span", {}, branch.label));
        row.addEventListener("click", () =>
        {
            this.selectNode(branch.id);
            this.panTo(branch.id);
        });
        list.appendChild(row);

        if (branch.children)
        {
            for (const c of branch.children)
            {
                this.buildFallbackBranchRow(list, c, depth + 1);
            }
        }
    }

    private addHubFromSidebar(): void
    {
        const newHub: SpineHub = {
            id: this.genId(),
            label: "New Hub",
            status: "planned",
            branches: []
        };
        this.addHub(newHub);
        requestAnimationFrame(() =>
            this.showPopover(newHub.id, true));
    }

    // ========================================================================
    // PRIVATE — EVENTS
    // ========================================================================

    private bindEvents(): void
    {
        this.boundWheel = (e) => this.onWheel(e);
        this.boundPointerDown = (e) => this.onPointerDown(e);
        this.boundPointerMove = (e) => this.onPointerMove(e);
        this.boundPointerUp = (e) => this.onPointerUp(e);
        this.boundKeyDown = (e) => this.onKeyDown(e);

        this.svgEl.addEventListener("wheel", this.boundWheel,
            { passive: false });
        this.svgEl.addEventListener("pointerdown", this.boundPointerDown);
        window.addEventListener("pointermove", this.boundPointerMove);
        window.addEventListener("pointerup", this.boundPointerUp);
        this.rootEl.addEventListener("keydown", this.boundKeyDown);

        this.svgEl.addEventListener("click", (e) =>
        {
            if (e.target === this.svgEl || e.target === this.transformG)
            {
                this.clearSelection();
                this.hidePopover();
            }
        });
    }

    private unbindEvents(): void
    {
        this.svgEl.removeEventListener("wheel", this.boundWheel);
        this.svgEl.removeEventListener("pointerdown",
            this.boundPointerDown);
        window.removeEventListener("pointermove", this.boundPointerMove);
        window.removeEventListener("pointerup", this.boundPointerUp);
        this.rootEl.removeEventListener("keydown", this.boundKeyDown);
    }

    private onKeyDown(e: KeyboardEvent): void
    {
        if (e.key === "Escape") { this.hidePopover(); return; }
        if (e.key === "+" || e.key === "=") { this.zoomIn(); return; }
        if (e.key === "-") { this.zoomOut(); return; }
        if (e.key === "0") { this.fitToView(); return; }
        this.handleArrowPan(e);
    }

    private handleArrowPan(e: KeyboardEvent): void
    {
        const step = e.shiftKey ? PAN_STEP * 3 : PAN_STEP;
        let handled = true;
        switch (e.key)
        {
            case "ArrowLeft": this.zoom.tx += step; break;
            case "ArrowRight": this.zoom.tx -= step; break;
            case "ArrowUp": this.zoom.ty += step; break;
            case "ArrowDown": this.zoom.ty -= step; break;
            default: handled = false;
        }
        if (handled) { e.preventDefault(); this.applyTransform(); }
    }

    // ========================================================================
    // PRIVATE — UTILITIES
    // ========================================================================

    private findNodeData(
        nodeId: string
    ): (SpineHub | SpineBranch) | undefined
    {
        for (const h of this.hubs)
        {
            if (h.id === nodeId) { return h; }
            const found = this.findInBranches(h.branches, nodeId);
            if (found) { return found; }
        }
        return undefined;
    }

    private findInBranches(
        branches: SpineBranch[],
        nodeId: string
    ): SpineBranch | undefined
    {
        for (const b of branches)
        {
            if (b.id === nodeId) { return b; }
            if (b.children)
            {
                const found = this.findInBranches(b.children, nodeId);
                if (found) { return found; }
            }
        }
        return undefined;
    }

    private removeBranchFromParent(
        nodeId: string,
        parentId: string | null
    ): void
    {
        if (!parentId) { return; }
        const parent = this.findNodeData(parentId);
        if (!parent) { return; }

        if ("branches" in parent)
        {
            parent.branches = parent.branches.filter(b => b.id !== nodeId);
        }
        if ("children" in parent && parent.children)
        {
            parent.children = parent.children.filter(
                (c: SpineBranch) => c.id !== nodeId
            );
        }
    }

    private computeBBox(): { x: number; y: number; w: number; h: number }
    {
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        for (const p of this.positions.values())
        {
            if (p.x < minX) { minX = p.x; }
            if (p.y < minY) { minY = p.y; }
            if (p.x > maxX) { maxX = p.x; }
            if (p.y > maxY) { maxY = p.y; }
        }
        if (!isFinite(minX)) { return { x: 0, y: 0, w: 400, h: 300 }; }
        return {
            x: minX - 80,
            y: minY - 80,
            w: maxX - minX + 160,
            h: maxY - minY + 160
        };
    }

    private genId(): string
    {
        return `sm-node-${++this.idCounter}-${Date.now().toString(36)}`;
    }

    private refreshAfterEdit(): void
    {
        this.nodeMap = buildNodeMap(this.hubs);
        this.computeLayout();
        this.renderAll();
        this.syncSidebar();
    }

    private downloadExport(format: string): void
    {
        if (format === "svg")
        {
            this.downloadBlob(
                new Blob([this.exportSVG()], { type: "image/svg+xml" }),
                "spinemap.svg"
            );
        }
        else if (format === "json")
        {
            this.downloadBlob(
                new Blob([this.exportJSON()],
                    { type: "application/json" }),
                "spinemap.json"
            );
        }
        else if (format === "png")
        {
            this.exportPNG().then(blob =>
                this.downloadBlob(blob, "spinemap.png"));
        }
    }

    private downloadBlob(blob: Blob, name: string): void
    {
        const url = URL.createObjectURL(blob);
        const a = htmlEl("a", { href: url, download: name });
        document.body.appendChild(a);
        (a as HTMLAnchorElement).click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    private announce(msg: string): void
    {
        this.liveRegion.textContent = msg;
        setTimeout(() => { this.liveRegion.textContent = ""; }, 3000);
    }
}

// ============================================================================
// FACTORY
// ============================================================================

export function createSpineMap(options: SpineMapOptions): SpineMap
{
    return new SpineMap(options);
}

(window as unknown as Record<string, unknown>).createSpineMap = createSpineMap;
