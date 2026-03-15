/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: DiagramEngine
 * 📜 PURPOSE: Universal vector canvas engine for diagramming, graph
 *    visualization, technical drawing, poster creation, and embedded
 *    document surfaces. SVG-based rendering with semantic/presentation
 *    split, pluggable shapes, tools, layouts, and collaboration support.
 * 🔗 RELATES: [[GraphCanvas]], [[GraphCanvasMx]], [[Ruler]], [[Toolbar]]
 * ⚡ FLOW: [Consumer App] -> [createDiagramEngine()] -> [SVG canvas]
 * 🔒 SECURITY: No innerHTML for user content. SVG sanitised on export.
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// S1: TYPES — GEOMETRY
// ============================================================================

export interface Rect
{
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface Point
{
    x: number;
    y: number;
}

// ============================================================================
// S2: TYPES — STYLES
// ============================================================================

export interface GradientDefinition
{
    type: "linear" | "radial";
    stops: { offset: number; color: string }[];
    angle?: number;
    center?: { x: number; y: number };
    radius?: number;
}

export interface PatternDefinition
{
    type: "hatch" | "cross-hatch" | "dots" | "checkerboard" | "custom";
    color: string;
    backgroundColor?: string;
    spacing: number;
    angle?: number;
    svg?: string;
}

export interface FillStyle
{
    type: "solid" | "gradient" | "pattern" | "none";
    color?: string;
    gradient?: GradientDefinition;
    pattern?: PatternDefinition;
}

export interface StrokeStyle
{
    color: string | GradientDefinition;
    width: number;
    dashPattern?: number[];
    lineCap?: "butt" | "round" | "square";
    lineJoin?: "miter" | "round" | "bevel";
}

export interface EdgeStroke
{
    visible: boolean;
    color?: string | GradientDefinition;
    width?: number;
    dashPattern?: number[];
}

export interface PerEdgeStroke
{
    top?: EdgeStroke;
    right?: EdgeStroke;
    bottom?: EdgeStroke;
    left?: EdgeStroke;
}

export interface ShadowStyle
{
    enabled: boolean;
    color: string;
    offsetX: number;
    offsetY: number;
    blur: number;
    opacity: number;
    spread?: number;
}

export interface ObjectStyle
{
    fill?: FillStyle;
    stroke?: StrokeStyle;
    perEdgeStroke?: PerEdgeStroke;
    shadow?: ShadowStyle;
    opacity?: number;
}

// ============================================================================
// S3: TYPES — TEXT
// ============================================================================

export interface TextRun
{
    text: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strikethrough?: boolean;
    fontFamily?: string;
    fontSize?: number;
    color?: string;
    backgroundColor?: string;
    shadow?: ShadowStyle;
    superscript?: boolean;
    subscript?: boolean;
    lineHeight?: number;
    letterSpacing?: number;
}

export interface IconRun
{
    icon: string;
    library: "bootstrap-icons" | "font-awesome" | "custom";
    fontSize?: number;
    color?: string;
}

export type ContentRun = TextRun | IconRun;

export interface TextBlock
{
    type: "paragraph" | "heading" | "ordered-list" | "unordered-list";
    level?: number;
    indent: number;
    runs: ContentRun[];
}

export interface TextContent
{
    runs?: ContentRun[];
    blocks?: TextBlock[];
    overflow: "visible" | "clip" | "ellipsis";
    verticalAlign: "top" | "middle" | "bottom";
    horizontalAlign: "left" | "center" | "right" | "justify";
    padding: number;
    autoSize?: "fixed" | "grow-to-fit" | "shrink-font";
}

// ============================================================================
// S4: TYPES — SEMANTIC
// ============================================================================

export interface ResourceReference
{
    type: string;
    uri: string;
    label?: string;
}

export interface SemanticData
{
    type: string;
    data: Record<string, unknown>;
    references?: ResourceReference[];
    tags?: string[];
    relationships?: string[];
}

// ============================================================================
// S5: TYPES — OBJECTS & CONNECTORS
// ============================================================================

export interface DiagramObject
{
    id: string;
    semantic: SemanticData;
    presentation:
    {
        shape: string;
        bounds: Rect;
        rotation: number;
        flipX: boolean;
        flipY: boolean;
        style: ObjectStyle;
        textContent?: TextContent;
        layer: string;
        zIndex: number;
        locked: boolean;
        visible: boolean;
        groupId?: string;
        parameters?: Record<string, number | Point | string>;
        renderStyle?: "clean" | "sketch";
        image?: ImageStyle;
        dataBindings?: DataBinding[];
        anchor?: AnchorConstraint;
    };
}

export interface ImageStyle
{
    src: string;
    fit: "cover" | "contain" | "stretch" | "original";
    crop?: { x: number; y: number; w: number; h: number };
    mask?: "none" | "circle" | "ellipse" | "rounded-rect";
    maskRadius?: number;
    adjustments?:
    {
        brightness?: number;
        contrast?: number;
        saturation?: number;
        hueRotate?: number;
        tint?: string;
        tintOpacity?: number;
    };
}

export interface DataBinding
{
    property: string;
    expression: string;
}

export interface AnchorConstraint
{
    edge: "top" | "bottom" | "left" | "right";
    offset: number;
}

export type ArrowType = "none" | "block" | "classic" | "open"
    | "diamond" | "oval" | "dash" | "cross"
    | "er-one" | "er-many" | "er-one-or-many"
    | "er-zero-or-one" | "er-zero-or-many" | "er-mandatory-one";

export type RoutingStyle = "straight" | "orthogonal" | "curved"
    | "segment" | "manhattan" | "elbow" | "entity";

export interface ConnectorStyle extends StrokeStyle
{
    startArrow?: ArrowType;
    endArrow?: ArrowType;
    shadow?: ShadowStyle;
}

export interface ConnectorLabel
{
    position: "start" | "middle" | "end" | number;
    textContent: TextContent;
    background?: FillStyle;
    border?: StrokeStyle;
    padding?: number;
}

export interface DiagramConnector
{
    id: string;
    semantic: SemanticData;
    presentation:
    {
        sourceId: string;
        targetId: string;
        sourcePort?: string;
        targetPort?: string;
        sourcePoint?: Point;
        targetPoint?: Point;
        waypoints: Point[];
        routing: RoutingStyle;
        style: ConnectorStyle;
        labels: ConnectorLabel[];
    };
}

// ============================================================================
// S6: TYPES — DOCUMENT
// ============================================================================

export interface Layer
{
    id: string;
    name: string;
    visible: boolean;
    locked: boolean;
    printable: boolean;
    opacity: number;
    order: number;
}

export interface RulerGuide
{
    id: string;
    orientation: "horizontal" | "vertical";
    position: number;
}

export interface DiagramDocument
{
    version: string;
    metadata:
    {
        title: string;
        description?: string;
        author?: string;
        created: string;
        modified: string;
        tags?: string[];
    };
    data?: Record<string, unknown>;
    layers: Layer[];
    objects: DiagramObject[];
    connectors: DiagramConnector[];
    comments: Comment[];
    guides: RulerGuide[];
    grid:
    {
        size: number;
        style: "dots" | "lines" | "none";
        visible: boolean;
    };
    renderStyle?: "clean" | "sketch";
}

export interface Comment
{
    id: string;
    anchor: { type: "object" | "connector" | "canvas"; entityId?: string; position?: Point };
    thread: CommentEntry[];
    status: "open" | "resolved";
    created: string;
    updated: string;
}

export interface CommentEntry
{
    id: string;
    userId: string;
    userName: string;
    content: string;
    timestamp: string;
    edited: boolean;
}

// ============================================================================
// S7: TYPES — SHAPES
// ============================================================================

export interface ConnectionPort
{
    id: string;
    position: { x: number; y: number };
    direction: "north" | "south" | "east" | "west" | "any";
    maxConnections: number;
}

export interface TextRegion
{
    id: string;
    bounds: Rect;
}

export interface ShapeRenderContext
{
    bounds: Rect;
    style: ObjectStyle;
    parameters: Record<string, number | Point | string>;
    renderStyle: "clean" | "sketch";
    selected: boolean;
}

export interface ShapeDefinition
{
    type: string;
    category: string;
    label: string;
    icon: string;
    defaultSize: { w: number; h: number };
    minSize?: { w: number; h: number };
    render(ctx: ShapeRenderContext): SVGElement;
    getHandles(bounds: Rect): ResizeHandle[];
    getPorts(bounds: Rect): ConnectionPort[];
    hitTest(point: Point, bounds: Rect): boolean;
    getTextRegions(bounds: Rect): TextRegion[];
    getOutlinePath(bounds: Rect): string;
}

export interface ResizeHandle
{
    id: string;
    position: Point;
    cursor: string;
    axis: "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
}

// ============================================================================
// S8: TYPES — ENGINE OPTIONS & EVENTS
// ============================================================================

export type AlignmentType = "left" | "center" | "right"
    | "top" | "middle" | "bottom";

export interface ViewportState
{
    x: number;
    y: number;
    zoom: number;
}

export interface SnappingConfig
{
    grid: boolean;
    gridSize: number;
    objects: boolean;
    guides: boolean;
    spacing: boolean;
    sizing: boolean;
    threshold: number;
    rulerGuides: boolean;
    rotationSnap: number;
}

/** Deep-partial input type for addObject(). */
export interface DiagramObjectInput
{
    id?: string;
    semantic?: Partial<SemanticData>;
    presentation?: Partial<DiagramObject["presentation"]>;
}

export interface DiagramEngineOptions
{
    document?: DiagramDocument;
    data?: Record<string, unknown>;
    stencils?: string[];
    tools?: string[];
    editable?: boolean;
    connectable?: boolean;
    textEditable?: boolean;
    resizable?: boolean;
    rotatable?: boolean;
    grid?: { visible: boolean; size: number; style: "dots" | "lines" | "none" };
    rulers?: { visible: boolean };
    snapping?: Partial<SnappingConfig>;
    contentRenderer?: (
        obj: DiagramObject, container: HTMLElement, bounds: Rect
    ) => boolean;
    onObjectClick?: (obj: DiagramObject) => void;
    onObjectDoubleClick?: (obj: DiagramObject) => void;
    onConnectorClick?: (conn: DiagramConnector) => void;
    onSelectionChange?: (
        objects: DiagramObject[], connectors: DiagramConnector[]
    ) => void;
    onTextEditRequest?: (obj: DiagramObject, region: TextRegion) => void;
    onChange?: (ops: Operation[]) => void;
    onViewportChange?: (viewport: ViewportState) => void;
}

export type LayoutFunction = (
    objects: DiagramObject[],
    connectors: DiagramConnector[],
    options: Record<string, unknown>
) => Map<string, Point> | Promise<Map<string, Point>>;

export interface Operation
{
    id: string;
    userId: string;
    timestamp: number;
    type: string;
    path: string;
    payload: Record<string, unknown>;
}

// ============================================================================
// S9: CONSTANTS
// ============================================================================

const LOG_PREFIX = "[DiagramEngine]";
const CLS = "de";
const VERSION = "1.0";
const DEFAULT_ZOOM = 1;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 4.0;
const ZOOM_STEP = 0.15;
const NUDGE_PX = 1;
const NUDGE_SHIFT_PX = 10;
const HANDLE_SIZE = 8;
const HANDLE_HIT_MARGIN = 4;
const DEFAULT_GRID_SIZE = 20;
const DEFAULT_LAYER_ID = "default";
const DEFAULT_LAYER_NAME = "Default";
const SNAP_THRESHOLD = 5;

// ── Guide types ──

interface LineSegment
{
    x1: number; y1: number;
    x2: number; y2: number;
}

interface AlignmentGuide
{
    type: "alignment" | "spacing";
    lines: LineSegment[];
    label?: { text: string; position: Point };
}

interface SnapResult
{
    dx: number;
    dy: number;
    guides: AlignmentGuide[];
}

let instanceCounter = 0;

// ============================================================================
// S10: DOM HELPERS
// ============================================================================

function createElement(
    tag: string, classes?: string[], text?: string
): HTMLElement
{
    const el = document.createElement(tag);
    if (classes && classes.length > 0) { el.classList.add(...classes); }
    if (text) { el.textContent = text; }
    return el;
}

function svgCreate(
    tag: string, attrs?: Record<string, string>
): SVGElement
{
    const el = document.createElementNS(
        "http://www.w3.org/2000/svg", tag
    );
    if (attrs)
    {
        for (const [k, v] of Object.entries(attrs))
        {
            el.setAttribute(k, v);
        }
    }
    return el;
}

function svgSetAttr(
    el: SVGElement, attrs: Record<string, string>
): void
{
    for (const [k, v] of Object.entries(attrs))
    {
        el.setAttribute(k, v);
    }
}

function generateId(): string
{
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function clamp(val: number, min: number, max: number): number
{
    return Math.max(min, Math.min(max, val));
}

function rectContainsPoint(r: Rect, p: Point): boolean
{
    return p.x >= r.x && p.x <= r.x + r.width
        && p.y >= r.y && p.y <= r.y + r.height;
}

function rectHitTest(point: Point, bounds: Rect): boolean
{
    return rectContainsPoint(bounds, point);
}

function rectsIntersect(a: Rect, b: Rect): boolean
{
    return a.x < b.x + b.width && a.x + a.width > b.x
        && a.y < b.y + b.height && a.y + a.height > b.y;
}

function safeCallback<T extends unknown[]>(
    fn: ((...a: T) => void) | undefined, ...args: T
): void
{
    if (!fn) { return; }
    try { fn(...args); }
    catch (err) { console.error(LOG_PREFIX, "callback error:", err); }
}

// ============================================================================
// S10A: TEMPLATE ENGINE
// ============================================================================

function resolveTemplateVars(
    text: string, data: Record<string, unknown>
): string
{
    return text.replace(/\{\{([^}]+)\}\}/g, (_match, expr: string) =>
    {
        const trimmed = expr.trim();
        const parts = trimmed.split("|");
        const path = parts[0].trim();
        const value = resolveDotPath(data, path);
        if (value === undefined || value === null) { return `{{${trimmed}}}`; }
        if (parts.length > 1)
        {
            return applyFilter(String(value), parts[1].trim());
        }
        return String(value);
    });
}

function resolveDotPath(
    obj: Record<string, unknown>, path: string
): unknown
{
    const keys = path.split(".");
    let current: unknown = obj;
    for (const key of keys)
    {
        if (current === null || current === undefined) { return undefined; }
        if (typeof current !== "object") { return undefined; }
        current = (current as Record<string, unknown>)[key];
    }
    return current;
}

function applyFilter(value: string, filter: string): string
{
    const filterName = filter.split(":")[0].trim();
    if (filterName === "uppercase") { return value.toUpperCase(); }
    if (filterName === "lowercase") { return value.toLowerCase(); }
    if (filterName === "capitalize")
    {
        return value.charAt(0).toUpperCase() + value.slice(1);
    }
    if (filterName === "format")
    {
        return value;
    }
    return value;
}

function resolveDocumentTemplates(
    doc: DiagramDocument
): void
{
    if (!doc.data) { return; }
    for (const obj of doc.objects)
    {
        resolveObjectTemplates(obj, doc.data);
    }
}

function resolveObjectTemplates(
    obj: DiagramObject,
    data: Record<string, unknown>
): void
{
    const tc = obj.presentation.textContent;
    if (!tc) { return; }
    if (tc.runs)
    {
        for (const run of tc.runs)
        {
            if ("text" in run)
            {
                (run as TextRun).text = resolveTemplateVars(
                    (run as TextRun).text, data
                );
            }
        }
    }
    if (tc.blocks)
    {
        for (const block of tc.blocks)
        {
            for (const run of block.runs)
            {
                if ("text" in run)
                {
                    (run as TextRun).text = resolveTemplateVars(
                        (run as TextRun).text, data
                    );
                }
            }
        }
    }
}

// ============================================================================
// S10B: GUIDE ENGINE
// ============================================================================

function computeAlignmentGuides(
    movingBounds: Rect,
    allObjects: DiagramObject[],
    excludeIds: Set<string>,
    threshold: number
): SnapResult
{
    let dx = 0;
    let dy = 0;
    const guides: AlignmentGuide[] = [];
    const edges = extractEdges(movingBounds);

    for (const obj of allObjects)
    {
        if (excludeIds.has(obj.id)) { continue; }
        if (!obj.presentation.visible) { continue; }
        const other = extractEdges(obj.presentation.bounds);
        checkAlignH(edges, other, threshold, guides, movingBounds, obj.presentation.bounds);
        checkAlignV(edges, other, threshold, guides, movingBounds, obj.presentation.bounds);
    }
    if (guides.length > 0)
    {
        dx = computeSnapDelta(guides, "x");
        dy = computeSnapDelta(guides, "y");
    }
    return { dx, dy, guides };
}

interface EdgeSet
{
    left: number; right: number; centerX: number;
    top: number; bottom: number; centerY: number;
}

function extractEdges(b: Rect): EdgeSet
{
    return {
        left: b.x, right: b.x + b.width,
        centerX: b.x + b.width / 2,
        top: b.y, bottom: b.y + b.height,
        centerY: b.y + b.height / 2,
    };
}

function checkAlignH(
    moving: EdgeSet, other: EdgeSet, threshold: number,
    guides: AlignmentGuide[], mb: Rect, ob: Rect
): void
{
    const pairs: [number, number][] = [
        [moving.left, other.left],
        [moving.left, other.right],
        [moving.right, other.left],
        [moving.right, other.right],
        [moving.centerX, other.centerX],
    ];
    for (const [mv, ov] of pairs)
    {
        if (Math.abs(mv - ov) <= threshold)
        {
            const minY = Math.min(mb.y, ob.y);
            const maxY = Math.max(
                mb.y + mb.height, ob.y + ob.height
            );
            guides.push({
                type: "alignment",
                lines: [{
                    x1: ov, y1: minY - 10,
                    x2: ov, y2: maxY + 10,
                }],
            });
        }
    }
}

function checkAlignV(
    moving: EdgeSet, other: EdgeSet, threshold: number,
    guides: AlignmentGuide[], mb: Rect, ob: Rect
): void
{
    const pairs: [number, number][] = [
        [moving.top, other.top],
        [moving.top, other.bottom],
        [moving.bottom, other.top],
        [moving.bottom, other.bottom],
        [moving.centerY, other.centerY],
    ];
    for (const [mv, ov] of pairs)
    {
        if (Math.abs(mv - ov) <= threshold)
        {
            const minX = Math.min(mb.x, ob.x);
            const maxX = Math.max(
                mb.x + mb.width, ob.x + ob.width
            );
            guides.push({
                type: "alignment",
                lines: [{
                    x1: minX - 10, y1: ov,
                    x2: maxX + 10, y2: ov,
                }],
            });
        }
    }
}

function computeSnapDelta(
    guides: AlignmentGuide[], _axis: string
): number
{
    // TODO: implement actual snap deltas from guide positions
    return 0;
}

// ============================================================================
// S11: EVENT BUS
// ============================================================================

type EventHandler = (...args: unknown[]) => void;

class EventBus
{
    private handlers: Map<string, Set<EventHandler>> = new Map();

    on(event: string, handler: EventHandler): void
    {
        if (!this.handlers.has(event))
        {
            this.handlers.set(event, new Set());
        }
        this.handlers.get(event)!.add(handler);
    }

    off(event: string, handler: EventHandler): void
    {
        this.handlers.get(event)?.delete(handler);
    }

    emit(event: string, ...args: unknown[]): void
    {
        const set = this.handlers.get(event);
        if (!set) { return; }
        for (const h of set)
        {
            try { h(...args); }
            catch (err)
            {
                console.error(LOG_PREFIX, `event '${event}' error:`, err);
            }
        }
    }
}

// ============================================================================
// S12: UNDO / REDO STACK
// ============================================================================

interface UndoCommand
{
    type: string;
    label: string;
    timestamp: number;
    undo: () => void;
    redo: () => void;
    mergeable: boolean;
}

class UndoStack
{
    private stack: UndoCommand[] = [];
    private pointer = -1;
    private readonly maxSize = 200;

    push(cmd: UndoCommand): void
    {
        if (this.pointer < this.stack.length - 1)
        {
            this.stack.length = this.pointer + 1;
        }
        if (this.shouldMerge(cmd))
        {
            this.mergeWithTop(cmd);
        }
        else
        {
            this.stack.push(cmd);
            this.pointer = this.stack.length - 1;
        }
        this.trimToMax();
    }

    undo(): boolean
    {
        if (this.pointer < 0) { return false; }
        this.stack[this.pointer].undo();
        this.pointer--;
        return true;
    }

    redo(): boolean
    {
        if (this.pointer >= this.stack.length - 1) { return false; }
        this.pointer++;
        this.stack[this.pointer].redo();
        return true;
    }

    canUndo(): boolean { return this.pointer >= 0; }
    canRedo(): boolean { return this.pointer < this.stack.length - 1; }

    clear(): void
    {
        this.stack.length = 0;
        this.pointer = -1;
    }

    private shouldMerge(cmd: UndoCommand): boolean
    {
        if (!cmd.mergeable || this.pointer < 0) { return false; }
        const top = this.stack[this.pointer];
        return top.mergeable && top.type === cmd.type
            && (cmd.timestamp - top.timestamp) < 500;
    }

    private mergeWithTop(cmd: UndoCommand): void
    {
        const top = this.stack[this.pointer];
        const origUndo = top.undo;
        top.redo = cmd.redo;
        top.undo = () => { cmd.undo(); origUndo(); };
        top.timestamp = cmd.timestamp;
    }

    private trimToMax(): void
    {
        if (this.stack.length > this.maxSize)
        {
            const excess = this.stack.length - this.maxSize;
            this.stack.splice(0, excess);
            this.pointer -= excess;
            if (this.pointer < -1) { this.pointer = -1; }
        }
    }
}

// ============================================================================
// S13: SHAPE REGISTRY + BUILT-IN SHAPES
// ============================================================================

class ShapeRegistry
{
    private shapes: Map<string, ShapeDefinition> = new Map();

    register(shape: ShapeDefinition): void
    {
        this.shapes.set(shape.type, shape);
    }

    get(type: string): ShapeDefinition | null
    {
        return this.shapes.get(type) ?? null;
    }

    getAll(): ShapeDefinition[]
    {
        return Array.from(this.shapes.values());
    }

    getByCategory(category: string): ShapeDefinition[]
    {
        return this.getAll().filter(s => s.category === category);
    }
}

function createDefaultPorts(bounds: Rect): ConnectionPort[]
{
    return [
        { id: "n", position: { x: 0.5, y: 0 }, direction: "north", maxConnections: 0 },
        { id: "s", position: { x: 0.5, y: 1 }, direction: "south", maxConnections: 0 },
        { id: "e", position: { x: 1, y: 0.5 }, direction: "east", maxConnections: 0 },
        { id: "w", position: { x: 0, y: 0.5 }, direction: "west", maxConnections: 0 },
    ];
}

function createBoundingBoxHandles(bounds: Rect): ResizeHandle[]
{
    const { x, y, width: w, height: h } = bounds;
    return [
        { id: "nw", position: { x, y }, cursor: "nw-resize", axis: "nw" },
        { id: "n", position: { x: x + w / 2, y }, cursor: "n-resize", axis: "n" },
        { id: "ne", position: { x: x + w, y }, cursor: "ne-resize", axis: "ne" },
        { id: "e", position: { x: x + w, y: y + h / 2 }, cursor: "e-resize", axis: "e" },
        { id: "se", position: { x: x + w, y: y + h }, cursor: "se-resize", axis: "se" },
        { id: "s", position: { x: x + w / 2, y: y + h }, cursor: "s-resize", axis: "s" },
        { id: "sw", position: { x, y: y + h }, cursor: "sw-resize", axis: "sw" },
        { id: "w", position: { x, y: y + h / 2 }, cursor: "w-resize", axis: "w" },
    ];
}

function buildRectangleShape(): ShapeDefinition
{
    return {
        type: "rectangle",
        category: "basic",
        label: "Rectangle",
        icon: "bi-square",
        defaultSize: { w: 160, h: 100 },
        minSize: { w: 20, h: 20 },
        render(ctx: ShapeRenderContext): SVGElement
        {
            const rect = svgCreate("rect", {
                x: "0", y: "0",
                width: String(ctx.bounds.width),
                height: String(ctx.bounds.height),
            });
            applyFillToSvg(rect, ctx.style.fill);
            applyStrokeToSvg(rect, ctx.style.stroke);
            return rect;
        },
        getHandles: createBoundingBoxHandles,
        getPorts: () => createDefaultPorts({ x: 0, y: 0, width: 160, height: 100 }),
        hitTest: rectHitTest,
        getTextRegions(bounds: Rect): TextRegion[]
        {
            return [{
                id: "label",
                bounds: { x: 4, y: 4, width: bounds.width - 8, height: bounds.height - 8 },
            }];
        },
        getOutlinePath(bounds: Rect): string
        {
            const { width: w, height: h } = bounds;
            return `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z`;
        },
    };
}

function buildEllipseShape(): ShapeDefinition
{
    return {
        type: "ellipse",
        category: "basic",
        label: "Ellipse",
        icon: "bi-circle",
        defaultSize: { w: 140, h: 100 },
        minSize: { w: 20, h: 20 },
        render(ctx: ShapeRenderContext): SVGElement
        {
            const cx = ctx.bounds.width / 2;
            const cy = ctx.bounds.height / 2;
            const el = svgCreate("ellipse", {
                cx: String(cx), cy: String(cy),
                rx: String(cx), ry: String(cy),
            });
            applyFillToSvg(el, ctx.style.fill);
            applyStrokeToSvg(el, ctx.style.stroke);
            return el;
        },
        getHandles: createBoundingBoxHandles,
        getPorts: () => createDefaultPorts({ x: 0, y: 0, width: 140, height: 100 }),
        hitTest(point: Point, bounds: Rect): boolean
        {
            const cx = bounds.x + bounds.width / 2;
            const cy = bounds.y + bounds.height / 2;
            const rx = bounds.width / 2;
            const ry = bounds.height / 2;
            const dx = (point.x - cx) / rx;
            const dy = (point.y - cy) / ry;
            return (dx * dx + dy * dy) <= 1;
        },
        getTextRegions(bounds: Rect): TextRegion[]
        {
            const inset = 0.2;
            return [{
                id: "label",
                bounds: {
                    x: bounds.width * inset,
                    y: bounds.height * inset,
                    width: bounds.width * (1 - 2 * inset),
                    height: bounds.height * (1 - 2 * inset),
                },
            }];
        },
        getOutlinePath(bounds: Rect): string
        {
            const cx = bounds.width / 2;
            const cy = bounds.height / 2;
            return `M ${cx} 0 A ${cx} ${cy} 0 1 1 ${cx} ${bounds.height} `
                + `A ${cx} ${cy} 0 1 1 ${cx} 0 Z`;
        },
    };
}

function buildDiamondShape(): ShapeDefinition
{
    return {
        type: "diamond",
        category: "basic",
        label: "Diamond",
        icon: "bi-diamond",
        defaultSize: { w: 120, h: 120 },
        minSize: { w: 30, h: 30 },
        render(ctx: ShapeRenderContext): SVGElement
        {
            const w = ctx.bounds.width;
            const h = ctx.bounds.height;
            const d = `M ${w / 2} 0 L ${w} ${h / 2} L ${w / 2} ${h} L 0 ${h / 2} Z`;
            const path = svgCreate("path", { d });
            applyFillToSvg(path, ctx.style.fill);
            applyStrokeToSvg(path, ctx.style.stroke);
            return path;
        },
        getHandles: createBoundingBoxHandles,
        getPorts: () => createDefaultPorts({ x: 0, y: 0, width: 120, height: 120 }),
        hitTest(point: Point, bounds: Rect): boolean
        {
            const cx = bounds.x + bounds.width / 2;
            const cy = bounds.y + bounds.height / 2;
            const dx = Math.abs(point.x - cx) / (bounds.width / 2);
            const dy = Math.abs(point.y - cy) / (bounds.height / 2);
            return (dx + dy) <= 1;
        },
        getTextRegions(bounds: Rect): TextRegion[]
        {
            const inset = 0.25;
            return [{
                id: "label",
                bounds: {
                    x: bounds.width * inset,
                    y: bounds.height * inset,
                    width: bounds.width * (1 - 2 * inset),
                    height: bounds.height * (1 - 2 * inset),
                },
            }];
        },
        getOutlinePath(bounds: Rect): string
        {
            const w = bounds.width;
            const h = bounds.height;
            return `M ${w / 2} 0 L ${w} ${h / 2} L ${w / 2} ${h} L 0 ${h / 2} Z`;
        },
    };
}

function buildTriangleShape(): ShapeDefinition
{
    return {
        type: "triangle",
        category: "basic",
        label: "Triangle",
        icon: "bi-triangle",
        defaultSize: { w: 120, h: 100 },
        minSize: { w: 20, h: 20 },
        render(ctx: ShapeRenderContext): SVGElement
        {
            const w = ctx.bounds.width;
            const h = ctx.bounds.height;
            const d = `M ${w / 2} 0 L ${w} ${h} L 0 ${h} Z`;
            const path = svgCreate("path", { d });
            applyFillToSvg(path, ctx.style.fill);
            applyStrokeToSvg(path, ctx.style.stroke);
            return path;
        },
        getHandles: createBoundingBoxHandles,
        getPorts: () => createDefaultPorts({ x: 0, y: 0, width: 120, height: 100 }),
        hitTest(point: Point, bounds: Rect): boolean
        {
            const { x, y, width: w, height: h } = bounds;
            const px = point.x - x;
            const py = point.y - y;
            const cx = w / 2;
            if (py < 0 || py > h) { return false; }
            const halfW = (py / h) * cx;
            return px >= cx - halfW && px <= cx + halfW;
        },
        getTextRegions(bounds: Rect): TextRegion[]
        {
            return [{
                id: "label",
                bounds: {
                    x: bounds.width * 0.25,
                    y: bounds.height * 0.45,
                    width: bounds.width * 0.5,
                    height: bounds.height * 0.4,
                },
            }];
        },
        getOutlinePath(bounds: Rect): string
        {
            const w = bounds.width;
            const h = bounds.height;
            return `M ${w / 2} 0 L ${w} ${h} L 0 ${h} Z`;
        },
    };
}

function buildTextShape(): ShapeDefinition
{
    return {
        type: "text",
        category: "basic",
        label: "Text",
        icon: "bi-fonts",
        defaultSize: { w: 200, h: 40 },
        minSize: { w: 20, h: 16 },
        render(_ctx: ShapeRenderContext): SVGElement
        {
            return svgCreate("rect", {
                x: "0", y: "0",
                width: String(_ctx.bounds.width),
                height: String(_ctx.bounds.height),
                fill: "transparent",
                stroke: "none",
            });
        },
        getHandles: createBoundingBoxHandles,
        getPorts: () => [],
        hitTest: rectHitTest,
        getTextRegions(bounds: Rect): TextRegion[]
        {
            return [{
                id: "label",
                bounds: { x: 0, y: 0, width: bounds.width, height: bounds.height },
            }];
        },
        getOutlinePath(bounds: Rect): string
        {
            return `M 0 0 L ${bounds.width} 0 L ${bounds.width} ${bounds.height} L 0 ${bounds.height} Z`;
        },
    };
}

function applyFillToSvg(el: SVGElement, fill?: FillStyle): void
{
    if (!fill || fill.type === "none")
    {
        el.setAttribute("fill", "none");
        return;
    }
    if (fill.type === "solid" && fill.color)
    {
        el.setAttribute("fill", fill.color);
        return;
    }
    el.setAttribute("fill", "var(--theme-surface-raised-bg)");
}

function applyStrokeToSvg(
    el: SVGElement, stroke?: StrokeStyle
): void
{
    if (!stroke)
    {
        el.setAttribute("stroke", "var(--theme-border-color)");
        el.setAttribute("stroke-width", "1.5");
        return;
    }
    if (typeof stroke.color === "string")
    {
        el.setAttribute("stroke", stroke.color);
    }
    el.setAttribute("stroke-width", String(stroke.width));
    if (stroke.dashPattern && stroke.dashPattern.length > 0)
    {
        el.setAttribute("stroke-dasharray",
            stroke.dashPattern.join(" "));
    }
    if (stroke.lineCap) { el.setAttribute("stroke-linecap", stroke.lineCap); }
    if (stroke.lineJoin) { el.setAttribute("stroke-linejoin", stroke.lineJoin); }
}

function buildHexagonShape(): ShapeDefinition
{
    return {
        type: "hexagon",
        category: "basic",
        label: "Hexagon",
        icon: "bi-hexagon",
        defaultSize: { w: 120, h: 104 },
        minSize: { w: 30, h: 26 },
        render(ctx: ShapeRenderContext): SVGElement
        {
            const w = ctx.bounds.width;
            const h = ctx.bounds.height;
            const qw = w * 0.25;
            const d = `M ${qw} 0 L ${w - qw} 0 L ${w} ${h / 2} `
                + `L ${w - qw} ${h} L ${qw} ${h} L 0 ${h / 2} Z`;
            const path = svgCreate("path", { d });
            applyFillToSvg(path, ctx.style.fill);
            applyStrokeToSvg(path, ctx.style.stroke);
            return path;
        },
        getHandles: createBoundingBoxHandles,
        getPorts: () => createDefaultPorts({ x: 0, y: 0, width: 120, height: 104 }),
        hitTest: rectHitTest,
        getTextRegions(bounds: Rect): TextRegion[]
        {
            return [{ id: "label", bounds: {
                x: bounds.width * 0.25, y: bounds.height * 0.2,
                width: bounds.width * 0.5, height: bounds.height * 0.6,
            }}];
        },
        getOutlinePath(bounds: Rect): string
        {
            const w = bounds.width; const h = bounds.height;
            const qw = w * 0.25;
            return `M ${qw} 0 L ${w - qw} 0 L ${w} ${h / 2} `
                + `L ${w - qw} ${h} L ${qw} ${h} L 0 ${h / 2} Z`;
        },
    };
}

function buildStarShape(): ShapeDefinition
{
    return {
        type: "star",
        category: "basic",
        label: "Star",
        icon: "bi-star",
        defaultSize: { w: 120, h: 114 },
        minSize: { w: 30, h: 28 },
        render(ctx: ShapeRenderContext): SVGElement
        {
            const d = buildStarPath(ctx.bounds.width, ctx.bounds.height, 5, 0.4);
            const path = svgCreate("path", { d });
            applyFillToSvg(path, ctx.style.fill);
            applyStrokeToSvg(path, ctx.style.stroke);
            return path;
        },
        getHandles: createBoundingBoxHandles,
        getPorts: () => createDefaultPorts({ x: 0, y: 0, width: 120, height: 114 }),
        hitTest: rectHitTest,
        getTextRegions(bounds: Rect): TextRegion[]
        {
            return [{ id: "label", bounds: {
                x: bounds.width * 0.3, y: bounds.height * 0.3,
                width: bounds.width * 0.4, height: bounds.height * 0.35,
            }}];
        },
        getOutlinePath(bounds: Rect): string
        {
            return buildStarPath(bounds.width, bounds.height, 5, 0.4);
        },
    };
}

function buildStarPath(
    w: number, h: number, points: number, innerRatio: number
): string
{
    const cx = w / 2;
    const cy = h / 2;
    const outerR = Math.min(cx, cy);
    const innerR = outerR * innerRatio;
    const parts: string[] = [];
    for (let i = 0; i < points * 2; i++)
    {
        const angle = (i * Math.PI) / points - Math.PI / 2;
        const r = i % 2 === 0 ? outerR : innerR;
        const px = cx + r * Math.cos(angle);
        const py = cy + r * Math.sin(angle);
        parts.push(i === 0 ? `M ${px} ${py}` : `L ${px} ${py}`);
    }
    parts.push("Z");
    return parts.join(" ");
}

function buildCrossShape(): ShapeDefinition
{
    return {
        type: "cross",
        category: "basic",
        label: "Cross",
        icon: "bi-plus-lg",
        defaultSize: { w: 100, h: 100 },
        minSize: { w: 30, h: 30 },
        render(ctx: ShapeRenderContext): SVGElement
        {
            const w = ctx.bounds.width;
            const h = ctx.bounds.height;
            const t = 0.33;
            const d = `M ${w * t} 0 L ${w * (1 - t)} 0 L ${w * (1 - t)} ${h * t} `
                + `L ${w} ${h * t} L ${w} ${h * (1 - t)} L ${w * (1 - t)} ${h * (1 - t)} `
                + `L ${w * (1 - t)} ${h} L ${w * t} ${h} L ${w * t} ${h * (1 - t)} `
                + `L 0 ${h * (1 - t)} L 0 ${h * t} L ${w * t} ${h * t} Z`;
            const path = svgCreate("path", { d });
            applyFillToSvg(path, ctx.style.fill);
            applyStrokeToSvg(path, ctx.style.stroke);
            return path;
        },
        getHandles: createBoundingBoxHandles,
        getPorts: () => createDefaultPorts({ x: 0, y: 0, width: 100, height: 100 }),
        hitTest: rectHitTest,
        getTextRegions(bounds: Rect): TextRegion[]
        {
            const t = 0.33;
            return [{ id: "label", bounds: {
                x: bounds.width * t, y: bounds.height * t,
                width: bounds.width * (1 - 2 * t),
                height: bounds.height * (1 - 2 * t),
            }}];
        },
        getOutlinePath(bounds: Rect): string
        {
            const w = bounds.width; const h = bounds.height;
            return `M ${w * 0.33} 0 L ${w * 0.67} 0 L ${w * 0.67} ${h * 0.33} `
                + `L ${w} ${h * 0.33} L ${w} ${h * 0.67} L ${w * 0.67} ${h * 0.67} `
                + `L ${w * 0.67} ${h} L ${w * 0.33} ${h} L ${w * 0.33} ${h * 0.67} `
                + `L 0 ${h * 0.67} L 0 ${h * 0.33} L ${w * 0.33} ${h * 0.33} Z`;
        },
    };
}

function buildParallelogramShape(): ShapeDefinition
{
    return {
        type: "parallelogram",
        category: "basic",
        label: "Parallelogram",
        icon: "bi-box",
        defaultSize: { w: 160, h: 80 },
        minSize: { w: 40, h: 20 },
        render(ctx: ShapeRenderContext): SVGElement
        {
            const w = ctx.bounds.width; const h = ctx.bounds.height;
            const skew = w * 0.2;
            const d = `M ${skew} 0 L ${w} 0 L ${w - skew} ${h} L 0 ${h} Z`;
            const path = svgCreate("path", { d });
            applyFillToSvg(path, ctx.style.fill);
            applyStrokeToSvg(path, ctx.style.stroke);
            return path;
        },
        getHandles: createBoundingBoxHandles,
        getPorts: () => createDefaultPorts({ x: 0, y: 0, width: 160, height: 80 }),
        hitTest: rectHitTest,
        getTextRegions(bounds: Rect): TextRegion[]
        {
            return [{ id: "label", bounds: {
                x: bounds.width * 0.2, y: 4,
                width: bounds.width * 0.6, height: bounds.height - 8,
            }}];
        },
        getOutlinePath(bounds: Rect): string
        {
            const w = bounds.width; const h = bounds.height;
            const s = w * 0.2;
            return `M ${s} 0 L ${w} 0 L ${w - s} ${h} L 0 ${h} Z`;
        },
    };
}

function buildImageShape(): ShapeDefinition
{
    return {
        type: "image",
        category: "basic",
        label: "Image",
        icon: "bi-image",
        defaultSize: { w: 200, h: 150 },
        minSize: { w: 40, h: 30 },
        render(ctx: ShapeRenderContext): SVGElement
        {
            const g = svgCreate("g");
            const placeholder = svgCreate("rect", {
                x: "0", y: "0",
                width: String(ctx.bounds.width),
                height: String(ctx.bounds.height),
                fill: "var(--theme-surface-raised-bg)",
                stroke: "var(--theme-border-color)",
                "stroke-width": "1",
            });
            g.appendChild(placeholder);
            const icon = svgCreate("text", {
                x: String(ctx.bounds.width / 2),
                y: String(ctx.bounds.height / 2),
                "text-anchor": "middle",
                "dominant-baseline": "central",
                "font-family": "bootstrap-icons",
                "font-size": "24",
                fill: "var(--theme-text-muted)",
            });
            icon.textContent = "\uF3E6";
            g.appendChild(icon);
            return g;
        },
        getHandles: createBoundingBoxHandles,
        getPorts: () => createDefaultPorts({ x: 0, y: 0, width: 200, height: 150 }),
        hitTest: rectHitTest,
        getTextRegions(): TextRegion[] { return []; },
        getOutlinePath(bounds: Rect): string
        {
            return `M 0 0 L ${bounds.width} 0 L ${bounds.width} ${bounds.height} L 0 ${bounds.height} Z`;
        },
    };
}

function buildIconShape(): ShapeDefinition
{
    return {
        type: "icon",
        category: "basic",
        label: "Icon",
        icon: "bi-emoji-smile",
        defaultSize: { w: 48, h: 48 },
        minSize: { w: 16, h: 16 },
        render(ctx: ShapeRenderContext): SVGElement
        {
            const text = svgCreate("text", {
                x: String(ctx.bounds.width / 2),
                y: String(ctx.bounds.height / 2),
                "text-anchor": "middle",
                "dominant-baseline": "central",
                "font-family": "bootstrap-icons",
                "font-size": String(Math.min(ctx.bounds.width, ctx.bounds.height) * 0.8),
                fill: "var(--theme-text-primary)",
            });
            text.textContent = "\uF5A2";
            return text;
        },
        getHandles: createBoundingBoxHandles,
        getPorts: () => createDefaultPorts({ x: 0, y: 0, width: 48, height: 48 }),
        hitTest: rectHitTest,
        getTextRegions(): TextRegion[] { return []; },
        getOutlinePath(bounds: Rect): string
        {
            return `M 0 0 L ${bounds.width} 0 L ${bounds.width} ${bounds.height} L 0 ${bounds.height} Z`;
        },
    };
}

function buildArrowRightShape(): ShapeDefinition
{
    return {
        type: "arrow-right",
        category: "arrows",
        label: "Arrow Right",
        icon: "bi-arrow-right",
        defaultSize: { w: 140, h: 60 },
        minSize: { w: 40, h: 20 },
        render(ctx: ShapeRenderContext): SVGElement
        {
            const w = ctx.bounds.width; const h = ctx.bounds.height;
            const headW = w * 0.35;
            const stemH = h * 0.35;
            const d = `M 0 ${stemH} L ${w - headW} ${stemH} L ${w - headW} 0 `
                + `L ${w} ${h / 2} L ${w - headW} ${h} `
                + `L ${w - headW} ${h - stemH} L 0 ${h - stemH} Z`;
            const path = svgCreate("path", { d });
            applyFillToSvg(path, ctx.style.fill);
            applyStrokeToSvg(path, ctx.style.stroke);
            return path;
        },
        getHandles: createBoundingBoxHandles,
        getPorts: () => [
            { id: "left", position: { x: 0, y: 0.5 }, direction: "west" as const, maxConnections: 0 },
            { id: "right", position: { x: 1, y: 0.5 }, direction: "east" as const, maxConnections: 0 },
        ],
        hitTest: rectHitTest,
        getTextRegions(bounds: Rect): TextRegion[]
        {
            return [{ id: "label", bounds: {
                x: 4, y: bounds.height * 0.35,
                width: bounds.width * 0.6, height: bounds.height * 0.3,
            }}];
        },
        getOutlinePath(bounds: Rect): string
        {
            const w = bounds.width; const h = bounds.height;
            return `M 0 ${h * 0.35} L ${w * 0.65} ${h * 0.35} L ${w * 0.65} 0 `
                + `L ${w} ${h / 2} L ${w * 0.65} ${h} `
                + `L ${w * 0.65} ${h * 0.65} L 0 ${h * 0.65} Z`;
        },
    };
}

function buildChevronShape(): ShapeDefinition
{
    return {
        type: "chevron",
        category: "arrows",
        label: "Chevron",
        icon: "bi-chevron-right",
        defaultSize: { w: 140, h: 60 },
        minSize: { w: 40, h: 20 },
        render(ctx: ShapeRenderContext): SVGElement
        {
            const w = ctx.bounds.width; const h = ctx.bounds.height;
            const notch = w * 0.15;
            const point = w * 0.85;
            const d = `M 0 0 L ${point} 0 L ${w} ${h / 2} L ${point} ${h} `
                + `L 0 ${h} L ${notch} ${h / 2} Z`;
            const path = svgCreate("path", { d });
            applyFillToSvg(path, ctx.style.fill);
            applyStrokeToSvg(path, ctx.style.stroke);
            return path;
        },
        getHandles: createBoundingBoxHandles,
        getPorts: () => [
            { id: "left", position: { x: 0, y: 0.5 }, direction: "west" as const, maxConnections: 0 },
            { id: "right", position: { x: 1, y: 0.5 }, direction: "east" as const, maxConnections: 0 },
        ],
        hitTest: rectHitTest,
        getTextRegions(bounds: Rect): TextRegion[]
        {
            return [{ id: "label", bounds: {
                x: bounds.width * 0.18, y: 4,
                width: bounds.width * 0.6, height: bounds.height - 8,
            }}];
        },
        getOutlinePath(bounds: Rect): string
        {
            const w = bounds.width; const h = bounds.height;
            return `M 0 0 L ${w * 0.85} 0 L ${w} ${h / 2} `
                + `L ${w * 0.85} ${h} L 0 ${h} L ${w * 0.15} ${h / 2} Z`;
        },
    };
}

function buildCalloutShape(): ShapeDefinition
{
    return {
        type: "callout",
        category: "callouts",
        label: "Callout",
        icon: "bi-chat-square",
        defaultSize: { w: 180, h: 120 },
        minSize: { w: 60, h: 50 },
        render(ctx: ShapeRenderContext): SVGElement
        {
            const w = ctx.bounds.width; const h = ctx.bounds.height;
            const bodyH = h * 0.75;
            const tailW = w * 0.15;
            const tailX = w * 0.2;
            const d = `M 0 0 L ${w} 0 L ${w} ${bodyH} L ${tailX + tailW} ${bodyH} `
                + `L ${tailX + tailW * 0.3} ${h} L ${tailX} ${bodyH} `
                + `L 0 ${bodyH} Z`;
            const path = svgCreate("path", { d });
            applyFillToSvg(path, ctx.style.fill);
            applyStrokeToSvg(path, ctx.style.stroke);
            return path;
        },
        getHandles: createBoundingBoxHandles,
        getPorts: () => createDefaultPorts({ x: 0, y: 0, width: 180, height: 120 }),
        hitTest: rectHitTest,
        getTextRegions(bounds: Rect): TextRegion[]
        {
            return [{ id: "label", bounds: {
                x: 8, y: 8,
                width: bounds.width - 16, height: bounds.height * 0.75 - 16,
            }}];
        },
        getOutlinePath(bounds: Rect): string
        {
            const w = bounds.width; const h = bounds.height;
            return `M 0 0 L ${w} 0 L ${w} ${h * 0.75} L 0 ${h * 0.75} Z`;
        },
    };
}

function buildDonutShape(): ShapeDefinition
{
    return {
        type: "donut",
        category: "basic",
        label: "Donut",
        icon: "bi-circle",
        defaultSize: { w: 100, h: 100 },
        minSize: { w: 40, h: 40 },
        render(ctx: ShapeRenderContext): SVGElement
        {
            const cx = ctx.bounds.width / 2;
            const cy = ctx.bounds.height / 2;
            const outerR = Math.min(cx, cy);
            const innerR = outerR * 0.55;
            const outer = `M ${cx - outerR} ${cy} `
                + `A ${outerR} ${outerR} 0 1 1 ${cx + outerR} ${cy} `
                + `A ${outerR} ${outerR} 0 1 1 ${cx - outerR} ${cy} Z`;
            const inner = `M ${cx - innerR} ${cy} `
                + `A ${innerR} ${innerR} 0 1 0 ${cx + innerR} ${cy} `
                + `A ${innerR} ${innerR} 0 1 0 ${cx - innerR} ${cy} Z`;
            const path = svgCreate("path", {
                d: outer + " " + inner,
                "fill-rule": "evenodd",
            });
            applyFillToSvg(path, ctx.style.fill);
            applyStrokeToSvg(path, ctx.style.stroke);
            return path;
        },
        getHandles: createBoundingBoxHandles,
        getPorts: () => createDefaultPorts({ x: 0, y: 0, width: 100, height: 100 }),
        hitTest(point: Point, bounds: Rect): boolean
        {
            const cx = bounds.x + bounds.width / 2;
            const cy = bounds.y + bounds.height / 2;
            const r = Math.min(bounds.width, bounds.height) / 2;
            const dist = Math.hypot(point.x - cx, point.y - cy);
            return dist <= r && dist >= r * 0.55;
        },
        getTextRegions(): TextRegion[] { return []; },
        getOutlinePath(bounds: Rect): string
        {
            const cx = bounds.width / 2; const cy = bounds.height / 2;
            return `M 0 ${cy} A ${cx} ${cy} 0 1 1 ${bounds.width} ${cy} `
                + `A ${cx} ${cy} 0 1 1 0 ${cy} Z`;
        },
    };
}

// ── Flowchart shapes ──

function buildTerminatorShape(): ShapeDefinition
{
    return {
        type: "terminator", category: "flowchart",
        label: "Terminator", icon: "bi-capsule",
        defaultSize: { w: 140, h: 50 }, minSize: { w: 60, h: 30 },
        render(ctx: ShapeRenderContext): SVGElement
        {
            const w = ctx.bounds.width; const h = ctx.bounds.height;
            const r = h / 2;
            const d = `M ${r} 0 L ${w - r} 0 A ${r} ${r} 0 0 1 ${w - r} ${h} `
                + `L ${r} ${h} A ${r} ${r} 0 0 1 ${r} 0 Z`;
            const path = svgCreate("path", { d });
            applyFillToSvg(path, ctx.style.fill);
            applyStrokeToSvg(path, ctx.style.stroke);
            return path;
        },
        getHandles: createBoundingBoxHandles,
        getPorts: () => createDefaultPorts({ x: 0, y: 0, width: 140, height: 50 }),
        hitTest: rectHitTest,
        getTextRegions(b: Rect): TextRegion[]
        {
            return [{ id: "label", bounds: { x: b.height / 2, y: 4, width: b.width - b.height, height: b.height - 8 } }];
        },
        getOutlinePath(b: Rect): string
        {
            const r = b.height / 2;
            return `M ${r} 0 L ${b.width - r} 0 A ${r} ${r} 0 0 1 ${b.width - r} ${b.height} L ${r} ${b.height} A ${r} ${r} 0 0 1 ${r} 0 Z`;
        },
    };
}

function buildDocumentShape(): ShapeDefinition
{
    return {
        type: "document", category: "flowchart",
        label: "Document", icon: "bi-file-earmark",
        defaultSize: { w: 140, h: 100 }, minSize: { w: 60, h: 40 },
        render(ctx: ShapeRenderContext): SVGElement
        {
            const w = ctx.bounds.width; const h = ctx.bounds.height;
            const waveH = h * 0.15;
            const d = `M 0 0 L ${w} 0 L ${w} ${h - waveH} `
                + `Q ${w * 0.75} ${h - waveH * 2} ${w * 0.5} ${h - waveH} `
                + `Q ${w * 0.25} ${h} 0 ${h - waveH} Z`;
            const path = svgCreate("path", { d });
            applyFillToSvg(path, ctx.style.fill);
            applyStrokeToSvg(path, ctx.style.stroke);
            return path;
        },
        getHandles: createBoundingBoxHandles,
        getPorts: () => createDefaultPorts({ x: 0, y: 0, width: 140, height: 100 }),
        hitTest: rectHitTest,
        getTextRegions(b: Rect): TextRegion[]
        {
            return [{ id: "label", bounds: { x: 8, y: 8, width: b.width - 16, height: b.height * 0.7 } }];
        },
        getOutlinePath(b: Rect): string { return `M 0 0 L ${b.width} 0 L ${b.width} ${b.height} L 0 ${b.height} Z`; },
    };
}

function buildProcessShape(): ShapeDefinition
{
    return {
        type: "process", category: "flowchart",
        label: "Process", icon: "bi-square",
        defaultSize: { w: 140, h: 80 }, minSize: { w: 40, h: 30 },
        render: buildRectangleShape().render,
        getHandles: createBoundingBoxHandles,
        getPorts: () => createDefaultPorts({ x: 0, y: 0, width: 140, height: 80 }),
        hitTest: rectHitTest,
        getTextRegions(b: Rect): TextRegion[]
        {
            return [{ id: "label", bounds: { x: 8, y: 8, width: b.width - 16, height: b.height - 16 } }];
        },
        getOutlinePath(b: Rect): string { return `M 0 0 L ${b.width} 0 L ${b.width} ${b.height} L 0 ${b.height} Z`; },
    };
}

function buildDecisionShape(): ShapeDefinition
{
    const base = buildDiamondShape();
    return { ...base, type: "decision", category: "flowchart", label: "Decision", icon: "bi-diamond" };
}

function buildDataShape(): ShapeDefinition
{
    const base = buildParallelogramShape();
    return { ...base, type: "data", category: "flowchart", label: "Data", icon: "bi-hdd" };
}

function buildPreparationShape(): ShapeDefinition
{
    const base = buildHexagonShape();
    return { ...base, type: "preparation", category: "flowchart", label: "Preparation", icon: "bi-hexagon" };
}

function buildDatabaseShape(): ShapeDefinition
{
    return {
        type: "database", category: "flowchart",
        label: "Database", icon: "bi-database",
        defaultSize: { w: 100, h: 120 }, minSize: { w: 40, h: 50 },
        render(ctx: ShapeRenderContext): SVGElement
        {
            const g = svgCreate("g");
            const w = ctx.bounds.width; const h = ctx.bounds.height;
            const capH = h * 0.15;
            const body = svgCreate("path", {
                d: `M 0 ${capH} L 0 ${h - capH} A ${w / 2} ${capH} 0 0 0 ${w} ${h - capH} L ${w} ${capH}`,
            });
            applyFillToSvg(body, ctx.style.fill);
            applyStrokeToSvg(body, ctx.style.stroke);
            g.appendChild(body);
            const topCap = svgCreate("ellipse", {
                cx: String(w / 2), cy: String(capH),
                rx: String(w / 2), ry: String(capH),
            });
            applyFillToSvg(topCap, ctx.style.fill);
            applyStrokeToSvg(topCap, ctx.style.stroke);
            g.appendChild(topCap);
            return g;
        },
        getHandles: createBoundingBoxHandles,
        getPorts: () => createDefaultPorts({ x: 0, y: 0, width: 100, height: 120 }),
        hitTest: rectHitTest,
        getTextRegions(b: Rect): TextRegion[]
        {
            return [{ id: "label", bounds: { x: 8, y: b.height * 0.25, width: b.width - 16, height: b.height * 0.5 } }];
        },
        getOutlinePath(b: Rect): string { return `M 0 0 L ${b.width} 0 L ${b.width} ${b.height} L 0 ${b.height} Z`; },
    };
}

// ── UML shapes ──

function buildUmlClassShape(): ShapeDefinition
{
    return {
        type: "uml-class", category: "uml",
        label: "Class", icon: "bi-diagram-3",
        defaultSize: { w: 180, h: 140 }, minSize: { w: 80, h: 60 },
        render(ctx: ShapeRenderContext): SVGElement
        {
            const g = svgCreate("g");
            const w = ctx.bounds.width; const h = ctx.bounds.height;
            const headerH = Math.min(40, h * 0.3);
            const body = svgCreate("rect", {
                x: "0", y: "0", width: String(w), height: String(h),
            });
            applyFillToSvg(body, ctx.style.fill);
            applyStrokeToSvg(body, ctx.style.stroke);
            g.appendChild(body);
            const divider1 = svgCreate("line", {
                x1: "0", y1: String(headerH),
                x2: String(w), y2: String(headerH),
                stroke: "var(--theme-border-color)",
                "stroke-width": "1",
            });
            g.appendChild(divider1);
            const midH = headerH + (h - headerH) / 2;
            const divider2 = svgCreate("line", {
                x1: "0", y1: String(midH),
                x2: String(w), y2: String(midH),
                stroke: "var(--theme-border-color)",
                "stroke-width": "1",
            });
            g.appendChild(divider2);
            return g;
        },
        getHandles: createBoundingBoxHandles,
        getPorts: () => createDefaultPorts({ x: 0, y: 0, width: 180, height: 140 }),
        hitTest: rectHitTest,
        getTextRegions(b: Rect): TextRegion[]
        {
            const headerH = Math.min(40, b.height * 0.3);
            return [
                { id: "name", bounds: { x: 4, y: 4, width: b.width - 8, height: headerH - 8 } },
                { id: "attrs", bounds: { x: 4, y: headerH + 4, width: b.width - 8, height: (b.height - headerH) / 2 - 8 } },
                { id: "methods", bounds: { x: 4, y: headerH + (b.height - headerH) / 2 + 4, width: b.width - 8, height: (b.height - headerH) / 2 - 8 } },
            ];
        },
        getOutlinePath(b: Rect): string { return `M 0 0 L ${b.width} 0 L ${b.width} ${b.height} L 0 ${b.height} Z`; },
    };
}

function buildUmlActorShape(): ShapeDefinition
{
    return {
        type: "uml-actor", category: "uml",
        label: "Actor", icon: "bi-person",
        defaultSize: { w: 50, h: 80 }, minSize: { w: 30, h: 50 },
        render(ctx: ShapeRenderContext): SVGElement
        {
            const g = svgCreate("g");
            const w = ctx.bounds.width; const h = ctx.bounds.height;
            const cx = w / 2;
            const headR = w * 0.2;
            const head = svgCreate("circle", {
                cx: String(cx), cy: String(headR + 2),
                r: String(headR),
                fill: "none",
                stroke: "var(--theme-text-primary)",
                "stroke-width": "1.5",
            });
            g.appendChild(head);
            const bodyTop = headR * 2 + 4;
            const bodyBot = h * 0.6;
            const bodyLine = svgCreate("line", {
                x1: String(cx), y1: String(bodyTop),
                x2: String(cx), y2: String(bodyBot),
                stroke: "var(--theme-text-primary)",
                "stroke-width": "1.5",
            });
            g.appendChild(bodyLine);
            const arms = svgCreate("line", {
                x1: "0", y1: String(bodyTop + (bodyBot - bodyTop) * 0.3),
                x2: String(w), y2: String(bodyTop + (bodyBot - bodyTop) * 0.3),
                stroke: "var(--theme-text-primary)",
                "stroke-width": "1.5",
            });
            g.appendChild(arms);
            const leftLeg = svgCreate("line", {
                x1: String(cx), y1: String(bodyBot),
                x2: String(w * 0.15), y2: String(h),
                stroke: "var(--theme-text-primary)",
                "stroke-width": "1.5",
            });
            g.appendChild(leftLeg);
            const rightLeg = svgCreate("line", {
                x1: String(cx), y1: String(bodyBot),
                x2: String(w * 0.85), y2: String(h),
                stroke: "var(--theme-text-primary)",
                "stroke-width": "1.5",
            });
            g.appendChild(rightLeg);
            return g;
        },
        getHandles: createBoundingBoxHandles,
        getPorts: () => createDefaultPorts({ x: 0, y: 0, width: 50, height: 80 }),
        hitTest: rectHitTest,
        getTextRegions(): TextRegion[] { return []; },
        getOutlinePath(b: Rect): string { return `M 0 0 L ${b.width} 0 L ${b.width} ${b.height} L 0 ${b.height} Z`; },
    };
}

function buildUmlNoteShape(): ShapeDefinition
{
    return {
        type: "uml-note", category: "uml",
        label: "Note", icon: "bi-sticky",
        defaultSize: { w: 160, h: 100 }, minSize: { w: 60, h: 40 },
        render(ctx: ShapeRenderContext): SVGElement
        {
            const w = ctx.bounds.width; const h = ctx.bounds.height;
            const fold = 16;
            const d = `M 0 0 L ${w - fold} 0 L ${w} ${fold} L ${w} ${h} L 0 ${h} Z`;
            const path = svgCreate("path", { d });
            applyFillToSvg(path, ctx.style.fill);
            applyStrokeToSvg(path, ctx.style.stroke);
            return path;
        },
        getHandles: createBoundingBoxHandles,
        getPorts: () => createDefaultPorts({ x: 0, y: 0, width: 160, height: 100 }),
        hitTest: rectHitTest,
        getTextRegions(b: Rect): TextRegion[]
        {
            return [{ id: "label", bounds: { x: 8, y: 8, width: b.width - 24, height: b.height - 16 } }];
        },
        getOutlinePath(b: Rect): string { return `M 0 0 L ${b.width} 0 L ${b.width} ${b.height} L 0 ${b.height} Z`; },
    };
}

function registerFlowchartPack(registry: ShapeRegistry): void
{
    registry.register(buildProcessShape());
    registry.register(buildDecisionShape());
    registry.register(buildTerminatorShape());
    registry.register(buildDataShape());
    registry.register(buildDocumentShape());
    registry.register(buildPreparationShape());
    registry.register(buildDatabaseShape());
}

function registerUmlPack(registry: ShapeRegistry): void
{
    registry.register(buildUmlClassShape());
    registry.register(buildUmlActorShape());
    registry.register(buildUmlNoteShape());
}

// ── BPMN shapes ──

function buildBpmnTaskShape(): ShapeDefinition
{
    return {
        type: "bpmn-task", category: "bpmn",
        label: "Task", icon: "bi-card-text",
        defaultSize: { w: 160, h: 80 }, minSize: { w: 60, h: 40 },
        render(ctx: ShapeRenderContext): SVGElement
        {
            const w = ctx.bounds.width; const h = ctx.bounds.height;
            const r = 8;
            const d = `M ${r} 0 L ${w - r} 0 Q ${w} 0 ${w} ${r} L ${w} ${h - r} `
                + `Q ${w} ${h} ${w - r} ${h} L ${r} ${h} Q 0 ${h} 0 ${h - r} `
                + `L 0 ${r} Q 0 0 ${r} 0 Z`;
            const path = svgCreate("path", { d });
            applyFillToSvg(path, ctx.style.fill);
            applyStrokeToSvg(path, ctx.style.stroke);
            return path;
        },
        getHandles: createBoundingBoxHandles,
        getPorts: () => createDefaultPorts({ x: 0, y: 0, width: 160, height: 80 }),
        hitTest: rectHitTest,
        getTextRegions(b: Rect): TextRegion[]
        {
            return [{ id: "label", bounds: { x: 8, y: 8, width: b.width - 16, height: b.height - 16 } }];
        },
        getOutlinePath(b: Rect): string { return `M 0 0 L ${b.width} 0 L ${b.width} ${b.height} L 0 ${b.height} Z`; },
    };
}

function buildBpmnStartEventShape(): ShapeDefinition
{
    return {
        type: "bpmn-start-event", category: "bpmn",
        label: "Start Event", icon: "bi-play-circle",
        defaultSize: { w: 40, h: 40 }, minSize: { w: 24, h: 24 },
        render(ctx: ShapeRenderContext): SVGElement
        {
            const r = Math.min(ctx.bounds.width, ctx.bounds.height) / 2;
            const el = svgCreate("circle", {
                cx: String(r), cy: String(r), r: String(r - 1),
            });
            el.setAttribute("fill", "rgba(82, 183, 136, 0.15)");
            el.setAttribute("stroke", "var(--theme-success)");
            el.setAttribute("stroke-width", "2");
            return el;
        },
        getHandles: createBoundingBoxHandles,
        getPorts: () => createDefaultPorts({ x: 0, y: 0, width: 40, height: 40 }),
        hitTest(p: Point, b: Rect): boolean
        {
            const cx = b.x + b.width / 2; const cy = b.y + b.height / 2;
            return Math.hypot(p.x - cx, p.y - cy) <= b.width / 2;
        },
        getTextRegions(): TextRegion[] { return []; },
        getOutlinePath(b: Rect): string
        {
            const r = b.width / 2;
            return `M ${r} 0 A ${r} ${r} 0 1 1 ${r} ${b.height} A ${r} ${r} 0 1 1 ${r} 0 Z`;
        },
    };
}

function buildBpmnEndEventShape(): ShapeDefinition
{
    const base = buildBpmnStartEventShape();
    return {
        ...base, type: "bpmn-end-event", label: "End Event", icon: "bi-stop-circle",
        render(ctx: ShapeRenderContext): SVGElement
        {
            const r = Math.min(ctx.bounds.width, ctx.bounds.height) / 2;
            const el = svgCreate("circle", {
                cx: String(r), cy: String(r), r: String(r - 1),
            });
            el.setAttribute("fill", "rgba(220, 38, 38, 0.15)");
            el.setAttribute("stroke", "var(--theme-danger)");
            el.setAttribute("stroke-width", "3");
            return el;
        },
    };
}

function buildBpmnGatewayShape(): ShapeDefinition
{
    const base = buildDiamondShape();
    return {
        ...base, type: "bpmn-gateway", category: "bpmn",
        label: "Gateway", icon: "bi-diamond",
        defaultSize: { w: 50, h: 50 },
    };
}

function buildBpmnPoolShape(): ShapeDefinition
{
    return {
        type: "bpmn-pool", category: "bpmn",
        label: "Pool", icon: "bi-layout-three-columns",
        defaultSize: { w: 600, h: 200 }, minSize: { w: 200, h: 80 },
        render(ctx: ShapeRenderContext): SVGElement
        {
            const g = svgCreate("g");
            const w = ctx.bounds.width; const h = ctx.bounds.height;
            const body = svgCreate("rect", {
                x: "0", y: "0", width: String(w), height: String(h),
            });
            applyFillToSvg(body, ctx.style.fill);
            applyStrokeToSvg(body, ctx.style.stroke);
            g.appendChild(body);
            const headerW = 30;
            const divider = svgCreate("line", {
                x1: String(headerW), y1: "0",
                x2: String(headerW), y2: String(h),
                stroke: "var(--theme-border-color)", "stroke-width": "1",
            });
            g.appendChild(divider);
            return g;
        },
        getHandles: createBoundingBoxHandles,
        getPorts: () => createDefaultPorts({ x: 0, y: 0, width: 600, height: 200 }),
        hitTest: rectHitTest,
        getTextRegions(b: Rect): TextRegion[]
        {
            return [{ id: "label", bounds: { x: 2, y: 4, width: 26, height: b.height - 8 } }];
        },
        getOutlinePath(b: Rect): string { return `M 0 0 L ${b.width} 0 L ${b.width} ${b.height} L 0 ${b.height} Z`; },
    };
}

function registerBpmnPack(registry: ShapeRegistry): void
{
    registry.register(buildBpmnTaskShape());
    registry.register(buildBpmnStartEventShape());
    registry.register(buildBpmnEndEventShape());
    registry.register(buildBpmnGatewayShape());
    registry.register(buildBpmnPoolShape());
}

// ── ER shapes ──

function buildErEntityShape(): ShapeDefinition
{
    return {
        type: "er-entity", category: "er",
        label: "Entity", icon: "bi-table",
        defaultSize: { w: 140, h: 50 }, minSize: { w: 60, h: 30 },
        render: buildRectangleShape().render,
        getHandles: createBoundingBoxHandles,
        getPorts: () => createDefaultPorts({ x: 0, y: 0, width: 140, height: 50 }),
        hitTest: rectHitTest,
        getTextRegions(b: Rect): TextRegion[]
        {
            return [{ id: "label", bounds: { x: 8, y: 4, width: b.width - 16, height: b.height - 8 } }];
        },
        getOutlinePath(b: Rect): string { return `M 0 0 L ${b.width} 0 L ${b.width} ${b.height} L 0 ${b.height} Z`; },
    };
}

function buildErWeakEntityShape(): ShapeDefinition
{
    return {
        type: "er-weak-entity", category: "er",
        label: "Weak Entity", icon: "bi-table",
        defaultSize: { w: 140, h: 50 }, minSize: { w: 60, h: 30 },
        render(ctx: ShapeRenderContext): SVGElement
        {
            const g = svgCreate("g");
            const w = ctx.bounds.width; const h = ctx.bounds.height;
            const outer = svgCreate("rect", { x: "0", y: "0", width: String(w), height: String(h) });
            applyFillToSvg(outer, ctx.style.fill);
            applyStrokeToSvg(outer, ctx.style.stroke);
            g.appendChild(outer);
            const inner = svgCreate("rect", {
                x: "4", y: "4", width: String(w - 8), height: String(h - 8),
                fill: "none", stroke: "var(--theme-border-color)", "stroke-width": "1",
            });
            g.appendChild(inner);
            return g;
        },
        getHandles: createBoundingBoxHandles,
        getPorts: () => createDefaultPorts({ x: 0, y: 0, width: 140, height: 50 }),
        hitTest: rectHitTest,
        getTextRegions(b: Rect): TextRegion[]
        {
            return [{ id: "label", bounds: { x: 12, y: 8, width: b.width - 24, height: b.height - 16 } }];
        },
        getOutlinePath(b: Rect): string { return `M 0 0 L ${b.width} 0 L ${b.width} ${b.height} L 0 ${b.height} Z`; },
    };
}

function buildErRelationshipShape(): ShapeDefinition
{
    const base = buildDiamondShape();
    return { ...base, type: "er-relationship", category: "er", label: "Relationship", icon: "bi-diamond" };
}

function buildErAttributeShape(): ShapeDefinition
{
    const base = buildEllipseShape();
    return { ...base, type: "er-attribute", category: "er", label: "Attribute", icon: "bi-circle",
        defaultSize: { w: 100, h: 50 } };
}

function registerErPack(registry: ShapeRegistry): void
{
    registry.register(buildErEntityShape());
    registry.register(buildErWeakEntityShape());
    registry.register(buildErRelationshipShape());
    registry.register(buildErAttributeShape());
}

// ── Network shapes ──

function buildServerShape(): ShapeDefinition
{
    return {
        type: "server", category: "network",
        label: "Server", icon: "bi-hdd-rack",
        defaultSize: { w: 80, h: 100 }, minSize: { w: 40, h: 50 },
        render(ctx: ShapeRenderContext): SVGElement
        {
            const g = svgCreate("g");
            const w = ctx.bounds.width; const h = ctx.bounds.height;
            const body = svgCreate("rect", {
                x: "0", y: "0", width: String(w), height: String(h), rx: "2",
            });
            applyFillToSvg(body, ctx.style.fill);
            applyStrokeToSvg(body, ctx.style.stroke);
            g.appendChild(body);
            for (let i = 1; i <= 3; i++)
            {
                const y = (h * i) / 4;
                const line = svgCreate("line", {
                    x1: "4", y1: String(y), x2: String(w - 4), y2: String(y),
                    stroke: "var(--theme-border-color)", "stroke-width": "0.5",
                });
                g.appendChild(line);
            }
            return g;
        },
        getHandles: createBoundingBoxHandles,
        getPorts: () => createDefaultPorts({ x: 0, y: 0, width: 80, height: 100 }),
        hitTest: rectHitTest,
        getTextRegions(b: Rect): TextRegion[]
        {
            return [{ id: "label", bounds: { x: 4, y: b.height * 0.7, width: b.width - 8, height: b.height * 0.25 } }];
        },
        getOutlinePath(b: Rect): string { return `M 0 0 L ${b.width} 0 L ${b.width} ${b.height} L 0 ${b.height} Z`; },
    };
}

function buildCloudShape(): ShapeDefinition
{
    return {
        type: "cloud", category: "network",
        label: "Cloud", icon: "bi-cloud",
        defaultSize: { w: 160, h: 100 }, minSize: { w: 60, h: 40 },
        render(ctx: ShapeRenderContext): SVGElement
        {
            const w = ctx.bounds.width; const h = ctx.bounds.height;
            const d = `M ${w * 0.25} ${h * 0.7} `
                + `C ${w * -0.05} ${h * 0.7} ${w * -0.05} ${h * 0.3} ${w * 0.2} ${h * 0.3} `
                + `C ${w * 0.15} ${h * 0.05} ${w * 0.45} ${h * -0.05} ${w * 0.55} ${h * 0.15} `
                + `C ${w * 0.65} ${h * 0} ${w * 0.9} ${h * 0.05} ${w * 0.85} ${h * 0.3} `
                + `C ${w * 1.1} ${h * 0.35} ${w * 1.05} ${h * 0.7} ${w * 0.75} ${h * 0.7} Z`;
            const path = svgCreate("path", { d });
            applyFillToSvg(path, ctx.style.fill);
            applyStrokeToSvg(path, ctx.style.stroke);
            return path;
        },
        getHandles: createBoundingBoxHandles,
        getPorts: () => createDefaultPorts({ x: 0, y: 0, width: 160, height: 100 }),
        hitTest: rectHitTest,
        getTextRegions(b: Rect): TextRegion[]
        {
            return [{ id: "label", bounds: { x: b.width * 0.2, y: b.height * 0.25, width: b.width * 0.6, height: b.height * 0.4 } }];
        },
        getOutlinePath(b: Rect): string { return `M 0 0 L ${b.width} 0 L ${b.width} ${b.height} L 0 ${b.height} Z`; },
    };
}

function buildFirewallShape(): ShapeDefinition
{
    return {
        type: "firewall", category: "network",
        label: "Firewall", icon: "bi-shield",
        defaultSize: { w: 80, h: 80 }, minSize: { w: 30, h: 30 },
        render(ctx: ShapeRenderContext): SVGElement
        {
            const g = svgCreate("g");
            const w = ctx.bounds.width; const h = ctx.bounds.height;
            const body = svgCreate("rect", { x: "0", y: "0", width: String(w), height: String(h) });
            applyFillToSvg(body, ctx.style.fill);
            applyStrokeToSvg(body, ctx.style.stroke);
            g.appendChild(body);
            const brickH = h / 4;
            for (let row = 0; row < 4; row++)
            {
                const y = row * brickH;
                const line = svgCreate("line", {
                    x1: "0", y1: String(y), x2: String(w), y2: String(y),
                    stroke: "var(--theme-danger)", "stroke-width": "0.5", opacity: "0.5",
                });
                g.appendChild(line);
                const mx = row % 2 === 0 ? w / 2 : w / 3;
                const vert = svgCreate("line", {
                    x1: String(mx), y1: String(y),
                    x2: String(mx), y2: String(y + brickH),
                    stroke: "var(--theme-danger)", "stroke-width": "0.5", opacity: "0.5",
                });
                g.appendChild(vert);
            }
            return g;
        },
        getHandles: createBoundingBoxHandles,
        getPorts: () => createDefaultPorts({ x: 0, y: 0, width: 80, height: 80 }),
        hitTest: rectHitTest,
        getTextRegions(): TextRegion[] { return []; },
        getOutlinePath(b: Rect): string { return `M 0 0 L ${b.width} 0 L ${b.width} ${b.height} L 0 ${b.height} Z`; },
    };
}

function registerNetworkPack(registry: ShapeRegistry): void
{
    registry.register(buildServerShape());
    registry.register(buildCloudShape());
    registry.register(buildFirewallShape());
    registry.register(buildDatabaseShape());
}

function buildPathShape(): ShapeDefinition
{
    return {
        type: "path",
        category: "basic",
        label: "Path",
        icon: "bi-bezier2",
        defaultSize: { w: 100, h: 100 },
        minSize: { w: 10, h: 10 },
        render(ctx: ShapeRenderContext): SVGElement
        {
            const d = typeof ctx.parameters.d === "string"
                ? ctx.parameters.d : "";
            const path = svgCreate("path", {
                d,
                fill: "none",
            });
            applyStrokeToSvg(path, ctx.style.stroke);
            return path;
        },
        getHandles: createBoundingBoxHandles,
        getPorts: () => createDefaultPorts(
            { x: 0, y: 0, width: 100, height: 100 }
        ),
        hitTest: rectHitTest,
        getTextRegions(): TextRegion[] { return []; },
        getOutlinePath(b: Rect): string
        {
            return `M 0 0 L ${b.width} 0 `
                + `L ${b.width} ${b.height} L 0 ${b.height} Z`;
        },
    };
}

function registerBasicShapes(registry: ShapeRegistry): void
{
    registry.register(buildRectangleShape());
    registry.register(buildEllipseShape());
    registry.register(buildDiamondShape());
    registry.register(buildTriangleShape());
    registry.register(buildTextShape());
    registry.register(buildHexagonShape());
    registry.register(buildStarShape());
    registry.register(buildCrossShape());
    registry.register(buildParallelogramShape());
    registry.register(buildImageShape());
    registry.register(buildIconShape());
    registry.register(buildArrowRightShape());
    registry.register(buildChevronShape());
    registry.register(buildCalloutShape());
    registry.register(buildDonutShape());
    registry.register(buildPathShape());
}

// ============================================================================
// S14: RENDER ENGINE
// ============================================================================

class RenderEngine
{
    private svgEl: SVGElement;
    private defsEl: SVGElement;
    private viewportEl: SVGElement;
    private gridEl: SVGElement;
    private layerEls: Map<string, SVGElement> = new Map();
    private connectorsEl: SVGElement;
    private overlayEl: SVGElement;
    private toolOverlayEl: SVGElement;
    private objectEls: Map<string, SVGElement> = new Map();

    private viewport: ViewportState = { x: 0, y: 0, zoom: DEFAULT_ZOOM };
    private containerEl: HTMLElement;

    constructor(container: HTMLElement)
    {
        this.containerEl = container;
        this.svgEl = this.buildSvg();
        this.defsEl = svgCreate("defs");
        this.viewportEl = svgCreate("g", { class: `${CLS}-viewport` });
        this.gridEl = svgCreate("g", { class: `${CLS}-grid` });
        this.connectorsEl = svgCreate("g", { class: `${CLS}-connectors` });
        this.overlayEl = svgCreate("g", { class: `${CLS}-overlay` });
        this.toolOverlayEl = svgCreate("g", { class: `${CLS}-tool-overlay` });

        this.viewportEl.appendChild(this.gridEl);
        this.viewportEl.appendChild(this.connectorsEl);
        this.viewportEl.appendChild(this.overlayEl);
        this.viewportEl.appendChild(this.toolOverlayEl);

        this.svgEl.appendChild(this.defsEl);
        this.svgEl.appendChild(this.viewportEl);
        container.appendChild(this.svgEl);
    }

    private buildSvg(): SVGElement
    {
        const svg = svgCreate("svg", {
            class: `${CLS}-canvas`,
            xmlns: "http://www.w3.org/2000/svg",
            width: "100%",
            height: "100%",
            tabindex: "0",
        });
        svg.setAttribute("role", "application");
        svg.setAttribute("aria-label", "Diagram canvas");
        return svg;
    }

    getSvgElement(): SVGElement { return this.svgEl; }
    getViewport(): ViewportState { return { ...this.viewport }; }

    ensureLayerEl(layerId: string, order: number): SVGElement
    {
        if (this.layerEls.has(layerId))
        {
            return this.layerEls.get(layerId)!;
        }
        const g = svgCreate("g", {
            class: `${CLS}-layer`,
            "data-layer": layerId,
        });
        this.insertLayerByOrder(g, order);
        this.layerEls.set(layerId, g);
        return g;
    }

    private insertLayerByOrder(
        g: SVGElement, order: number
    ): void
    {
        const before = this.connectorsEl;
        this.viewportEl.insertBefore(g, before);
    }

    removeLayerEl(layerId: string): void
    {
        const el = this.layerEls.get(layerId);
        if (el) { el.remove(); this.layerEls.delete(layerId); }
    }

    // ── Viewport transforms ──

    setViewport(vp: ViewportState): void
    {
        this.viewport = { ...vp };
        this.applyViewportTransform();
    }

    pan(dx: number, dy: number): void
    {
        this.viewport.x += dx;
        this.viewport.y += dy;
        this.applyViewportTransform();
    }

    zoomAt(factor: number, focalX: number, focalY: number): void
    {
        const oldZoom = this.viewport.zoom;
        const newZoom = clamp(oldZoom * factor, MIN_ZOOM, MAX_ZOOM);
        const ratio = newZoom / oldZoom;
        this.viewport.x = focalX - (focalX - this.viewport.x) * ratio;
        this.viewport.y = focalY - (focalY - this.viewport.y) * ratio;
        this.viewport.zoom = newZoom;
        this.applyViewportTransform();
    }

    zoomToFit(objects: DiagramObject[], padding: number = 40): void
    {
        if (objects.length === 0) { return; }
        const bbox = this.computeBBox(objects);
        const cw = this.containerEl.clientWidth;
        const ch = this.containerEl.clientHeight;
        const scaleX = (cw - padding * 2) / bbox.width;
        const scaleY = (ch - padding * 2) / bbox.height;
        const zoom = clamp(Math.min(scaleX, scaleY), MIN_ZOOM, MAX_ZOOM);
        this.viewport.zoom = zoom;
        this.viewport.x = (cw - bbox.width * zoom) / 2 - bbox.x * zoom;
        this.viewport.y = (ch - bbox.height * zoom) / 2 - bbox.y * zoom;
        this.applyViewportTransform();
    }

    private computeBBox(objects: DiagramObject[]): Rect
    {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (const obj of objects)
        {
            const b = obj.presentation.bounds;
            if (b.x < minX) { minX = b.x; }
            if (b.y < minY) { minY = b.y; }
            if (b.x + b.width > maxX) { maxX = b.x + b.width; }
            if (b.y + b.height > maxY) { maxY = b.y + b.height; }
        }
        return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }

    private applyViewportTransform(): void
    {
        const { x, y, zoom } = this.viewport;
        this.viewportEl.setAttribute("transform",
            `translate(${x}, ${y}) scale(${zoom})`);
    }

    screenToCanvas(sx: number, sy: number): Point
    {
        const rect = this.svgEl.getBoundingClientRect();
        const { x: vx, y: vy, zoom } = this.viewport;
        return {
            x: (sx - rect.left - vx) / zoom,
            y: (sy - rect.top - vy) / zoom,
        };
    }

    canvasToScreen(cx: number, cy: number): Point
    {
        const rect = this.svgEl.getBoundingClientRect();
        const { x: vx, y: vy, zoom } = this.viewport;
        return {
            x: cx * zoom + vx + rect.left,
            y: cy * zoom + vy + rect.top,
        };
    }

    // ── Object rendering ──

    renderObject(
        obj: DiagramObject, shapeDef: ShapeDefinition
    ): void
    {
        this.removeObjectEl(obj.id);
        const layerEl = this.ensureLayerEl(
            obj.presentation.layer, 0
        );
        const g = this.buildObjectGroup(obj, shapeDef);
        layerEl.appendChild(g);
        this.objectEls.set(obj.id, g);
    }

    private buildObjectGroup(
        obj: DiagramObject, shapeDef: ShapeDefinition
    ): SVGElement
    {
        const p = obj.presentation;
        const g = svgCreate("g", {
            class: `${CLS}-object`,
            "data-id": obj.id,
        });
        this.applyObjectTransform(g, p.bounds, p.rotation, p.flipX, p.flipY);
        if (p.style.opacity !== undefined && p.style.opacity < 1)
        {
            g.setAttribute("opacity", String(p.style.opacity));
        }
        this.applyShadowFilter(g, obj.id, p.style.shadow);
        const ctx = this.buildRenderContext(obj);
        const shapeEl = shapeDef.render(ctx);
        g.appendChild(shapeEl);
        if (p.textContent)
        {
            const textEl = this.renderTextContent(
                p.textContent, p.bounds
            );
            g.appendChild(textEl);
        }
        return g;
    }

    private applyObjectTransform(
        g: SVGElement, bounds: Rect, rotation: number,
        flipX: boolean, flipY: boolean
    ): void
    {
        const parts: string[] = [];
        parts.push(`translate(${bounds.x}, ${bounds.y})`);
        if (rotation !== 0)
        {
            const cx = bounds.width / 2;
            const cy = bounds.height / 2;
            parts.push(`rotate(${rotation}, ${cx}, ${cy})`);
        }
        if (flipX || flipY)
        {
            const sx = flipX ? -1 : 1;
            const sy = flipY ? -1 : 1;
            const tx = flipX ? bounds.width : 0;
            const ty = flipY ? bounds.height : 0;
            parts.push(`translate(${tx}, ${ty}) scale(${sx}, ${sy})`);
        }
        g.setAttribute("transform", parts.join(" "));
    }

    private applyShadowFilter(
        g: SVGElement, objId: string, shadow?: ShadowStyle
    ): void
    {
        if (!shadow || !shadow.enabled) { return; }
        const filterId = `${CLS}-shadow-${objId}`;
        let filter = this.defsEl.querySelector(`#${filterId}`);
        if (!filter)
        {
            filter = svgCreate("filter", {
                id: filterId,
                x: "-20%", y: "-20%",
                width: "140%", height: "140%",
            });
            const drop = svgCreate("feDropShadow", {
                dx: String(shadow.offsetX),
                dy: String(shadow.offsetY),
                stdDeviation: String(shadow.blur),
                "flood-color": shadow.color,
                "flood-opacity": String(shadow.opacity),
            });
            filter.appendChild(drop);
            this.defsEl.appendChild(filter);
        }
        else
        {
            const drop = filter.querySelector("feDropShadow");
            if (drop)
            {
                svgSetAttr(drop as SVGElement, {
                    dx: String(shadow.offsetX),
                    dy: String(shadow.offsetY),
                    stdDeviation: String(shadow.blur),
                    "flood-color": shadow.color,
                    "flood-opacity": String(shadow.opacity),
                });
            }
        }
        g.setAttribute("filter", `url(#${filterId})`);
    }

    private buildRenderContext(obj: DiagramObject): ShapeRenderContext
    {
        return {
            bounds: {
                x: 0, y: 0,
                width: obj.presentation.bounds.width,
                height: obj.presentation.bounds.height,
            },
            style: obj.presentation.style,
            parameters: obj.presentation.parameters ?? {},
            renderStyle: obj.presentation.renderStyle ?? "clean",
            selected: false,
        };
    }

    renderTextContent(
        tc: TextContent, bounds: Rect
    ): SVGElement
    {
        const fo = svgCreate("foreignObject", {
            x: String(tc.padding),
            y: String(tc.padding),
            width: String(bounds.width - tc.padding * 2),
            height: String(bounds.height - tc.padding * 2),
        });
        const div = document.createElement("div");
        div.style.width = "100%";
        div.style.height = "100%";
        div.style.overflow = tc.overflow === "ellipsis" ? "hidden" : tc.overflow;
        div.style.textAlign = tc.horizontalAlign;
        div.style.display = "flex";
        div.style.flexDirection = "column";
        div.style.justifyContent = this.mapVerticalAlign(tc.verticalAlign);
        if (tc.overflow === "ellipsis")
        {
            div.style.textOverflow = "ellipsis";
            div.style.whiteSpace = "nowrap";
        }
        this.renderRuns(div, tc.runs ?? []);
        fo.appendChild(div);
        return fo;
    }

    private mapVerticalAlign(
        align: "top" | "middle" | "bottom"
    ): string
    {
        if (align === "middle") { return "center"; }
        if (align === "bottom") { return "flex-end"; }
        return "flex-start";
    }

    private renderRuns(
        container: HTMLElement, runs: ContentRun[]
    ): void
    {
        for (const run of runs)
        {
            if ("icon" in run)
            {
                const icon = document.createElement("i");
                icon.className = run.icon;
                if (run.color) { icon.style.color = run.color; }
                if (run.fontSize)
                {
                    icon.style.fontSize = `${run.fontSize}px`;
                }
                container.appendChild(icon);
            }
            else
            {
                const span = document.createElement("span");
                span.textContent = run.text;
                this.applyRunStyle(span, run);
                container.appendChild(span);
            }
        }
    }

    private applyRunStyle(
        span: HTMLElement, run: TextRun
    ): void
    {
        if (run.bold) { span.style.fontWeight = "bold"; }
        if (run.italic) { span.style.fontStyle = "italic"; }
        if (run.underline) { span.style.textDecoration = "underline"; }
        if (run.strikethrough)
        {
            span.style.textDecoration =
                (span.style.textDecoration || "") + " line-through";
        }
        if (run.fontFamily) { span.style.fontFamily = run.fontFamily; }
        if (run.fontSize) { span.style.fontSize = `${run.fontSize}px`; }
        if (run.color) { span.style.color = run.color; }
        if (run.backgroundColor)
        {
            span.style.backgroundColor = run.backgroundColor;
        }
    }

    removeObjectEl(id: string): void
    {
        const el = this.objectEls.get(id);
        if (el) { el.remove(); this.objectEls.delete(id); }
        const filterId = `${CLS}-shadow-${id}`;
        const filter = this.defsEl.querySelector(`#${filterId}`);
        if (filter) { filter.remove(); }
    }

    // ── Selection overlay ──

    renderSelectionHandles(
        objects: DiagramObject[]
    ): void
    {
        this.clearOverlay();
        for (const obj of objects)
        {
            this.renderObjectSelection(obj);
        }
    }

    private renderObjectSelection(obj: DiagramObject): void
    {
        const b = obj.presentation.bounds;
        const outline = svgCreate("rect", {
            x: String(b.x), y: String(b.y),
            width: String(b.width), height: String(b.height),
            fill: "none",
            stroke: "var(--theme-primary)",
            "stroke-width": "1.5",
            "stroke-dasharray": "4 2",
        });
        this.overlayEl.appendChild(outline);
        const handles = createBoundingBoxHandles(b);
        for (const h of handles)
        {
            const handleEl = svgCreate("rect", {
                x: String(h.position.x - HANDLE_SIZE / 2),
                y: String(h.position.y - HANDLE_SIZE / 2),
                width: String(HANDLE_SIZE),
                height: String(HANDLE_SIZE),
                fill: "var(--theme-surface-bg)",
                stroke: "var(--theme-primary)",
                "stroke-width": "1.5",
                class: `${CLS}-handle`,
                "data-handle": h.id,
                cursor: h.cursor,
            });
            this.overlayEl.appendChild(handleEl);
        }
        this.renderRotationHandle(b);
    }

    private renderRotationHandle(b: Rect): void
    {
        const cx = b.x + b.width / 2;
        const topY = b.y - 25;
        const stem = svgCreate("line", {
            x1: String(cx), y1: String(b.y),
            x2: String(cx), y2: String(topY + 5),
            stroke: "var(--theme-primary)",
            "stroke-width": "1",
        });
        this.overlayEl.appendChild(stem);
        const handle = svgCreate("circle", {
            cx: String(cx), cy: String(topY),
            r: "5",
            fill: "var(--theme-surface-bg)",
            stroke: "var(--theme-primary)",
            "stroke-width": "1.5",
            class: `${CLS}-handle`,
            "data-handle": "rotate",
            cursor: "grab",
        });
        this.overlayEl.appendChild(handle);
    }

    // ── Inline text editing ──

    private editOverlay: HTMLElement | null = null;

    private editCommitCallback: (() => void) | null = null;

    startInlineEdit(
        obj: DiagramObject, _regionId?: string,
        commitCallback?: () => void
    ): void
    {
        this.endInlineEdit();
        const b = obj.presentation.bounds;
        const screenPos = this.canvasToScreen(b.x, b.y);
        const zoom = this.viewport.zoom;
        const div = document.createElement("div");
        div.className = `${CLS}-inline-editor`;
        div.contentEditable = "true";
        div.style.position = "fixed";
        div.style.left = `${screenPos.x}px`;
        div.style.top = `${screenPos.y}px`;
        div.style.width = `${b.width * zoom}px`;
        div.style.minHeight = `${b.height * zoom}px`;
        div.style.padding = "4px";
        div.style.border = "2px solid var(--theme-primary)";
        div.style.backgroundColor = "var(--theme-surface-bg)";
        div.style.color = "var(--theme-text-primary)";
        div.style.fontSize = `${14 * zoom}px`;
        div.style.fontFamily = "inherit";
        div.style.outline = "none";
        div.style.zIndex = "10000";
        div.style.boxSizing = "border-box";
        div.style.whiteSpace = "pre-wrap";
        div.style.overflowWrap = "break-word";
        const tc = obj.presentation.textContent;
        if (tc?.runs)
        {
            const text = tc.runs
                .filter(r => "text" in r)
                .map(r => (r as TextRun).text)
                .join("");
            div.textContent = text;
        }
        this.editCommitCallback = commitCallback ?? null;
        div.addEventListener("blur", () =>
        {
            if (this.editCommitCallback)
            {
                this.editCommitCallback();
            }
        });
        div.addEventListener("keydown", (ke: KeyboardEvent) =>
        {
            if (ke.key === "Escape")
            {
                ke.preventDefault();
                ke.stopPropagation();
                if (this.editCommitCallback)
                {
                    this.editCommitCallback();
                }
            }
            else if (ke.key === "Enter" && !ke.shiftKey)
            {
                ke.preventDefault();
                if (this.editCommitCallback)
                {
                    this.editCommitCallback();
                }
            }
            else
            {
                ke.stopPropagation();
            }
        });
        div.addEventListener("mousedown", (me: MouseEvent) =>
        {
            me.stopPropagation();
        });
        document.body.appendChild(div);
        this.editOverlay = div;
        div.focus();
        this.selectAllText(div);
    }

    endInlineEdit(): string | null
    {
        if (!this.editOverlay) { return null; }
        this.editCommitCallback = null;
        const text = this.editOverlay.textContent ?? "";
        this.editOverlay.remove();
        this.editOverlay = null;
        return text;
    }

    private selectAllText(el: HTMLElement): void
    {
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        if (sel)
        {
            sel.removeAllRanges();
            sel.addRange(range);
        }
    }

    renderRubberBand(rect: Rect): void
    {
        this.clearToolOverlay();
        const band = svgCreate("rect", {
            x: String(rect.x), y: String(rect.y),
            width: String(rect.width), height: String(rect.height),
            fill: "rgba(var(--theme-primary-rgb), 0.08)",
            stroke: "var(--theme-primary)",
            "stroke-width": "1",
            "stroke-dasharray": "3 3",
        });
        this.toolOverlayEl.appendChild(band);
    }

    clearOverlay(): void
    {
        while (this.overlayEl.firstChild)
        {
            this.overlayEl.removeChild(this.overlayEl.firstChild);
        }
    }

    clearToolOverlay(): void
    {
        while (this.toolOverlayEl.firstChild)
        {
            this.toolOverlayEl.removeChild(this.toolOverlayEl.firstChild);
        }
    }

    // ── Grid ──

    renderGrid(
        gridConfig: { size: number; style: string; visible: boolean }
    ): void
    {
        while (this.gridEl.firstChild)
        {
            this.gridEl.removeChild(this.gridEl.firstChild);
        }
        if (!gridConfig.visible || gridConfig.style === "none") { return; }
        if (gridConfig.style === "dots")
        {
            this.renderDotGrid(gridConfig.size);
        }
    }

    private renderDotGrid(size: number): void
    {
        const patternId = `${CLS}-grid-pattern`;
        let pattern = this.defsEl.querySelector(`#${patternId}`);
        if (pattern) { pattern.remove(); }
        pattern = svgCreate("pattern", {
            id: patternId,
            width: String(size), height: String(size),
            patternUnits: "userSpaceOnUse",
        });
        const dot = svgCreate("circle", {
            cx: String(size / 2), cy: String(size / 2),
            r: "1.2",
            fill: "var(--theme-text-muted)",
            opacity: "0.4",
        });
        pattern.appendChild(dot);
        this.defsEl.appendChild(pattern);
        const gridRect = svgCreate("rect", {
            x: "-10000", y: "-10000",
            width: "20000", height: "20000",
            fill: `url(#${patternId})`,
        });
        this.gridEl.appendChild(gridRect);
    }

    // ── Arrow markers ──

    ensureArrowMarker(arrowType: ArrowType): string
    {
        const markerId = `${CLS}-arrow-${arrowType}`;
        if (this.defsEl.querySelector(`#${markerId}`)) { return markerId; }
        const marker = this.buildArrowMarker(markerId, arrowType);
        if (marker) { this.defsEl.appendChild(marker); }
        return markerId;
    }

    private buildArrowMarker(
        id: string, arrowType: ArrowType
    ): SVGElement | null
    {
        if (arrowType === "none") { return null; }
        const marker = svgCreate("marker", {
            id, markerWidth: "10", markerHeight: "10",
            refX: "9", refY: "5", orient: "auto-start-reverse",
            markerUnits: "strokeWidth",
        });
        const shapes: Record<string, string> = {
            block: "M 0 0 L 10 5 L 0 10 Z",
            classic: "M 0 0 L 10 5 L 0 10 L 2 5 Z",
            open: "M 0 0 L 10 5 L 0 10",
            diamond: "M 0 5 L 5 0 L 10 5 L 5 10 Z",
            oval: "M 5 5 m -4 0 a 4 4 0 1 0 8 0 a 4 4 0 1 0 -8 0",
            dash: "M 0 0 L 0 10",
            cross: "M 0 0 L 10 10 M 10 0 L 0 10",
        };
        const d = shapes[arrowType] ?? shapes["block"];
        const path = svgCreate("path", {
            d, fill: "var(--theme-text-secondary)",
            stroke: "var(--theme-text-secondary)",
            "stroke-width": "1",
        });
        if (arrowType === "open" || arrowType === "dash"
            || arrowType === "cross")
        {
            path.setAttribute("fill", "none");
            path.setAttribute("stroke-width", "1.5");
        }
        marker.appendChild(path);
        return marker;
    }

    // ── Connector rendering ──

    private connectorEls: Map<string, SVGElement> = new Map();

    renderConnector(
        conn: DiagramConnector,
        objects: DiagramObject[]
    ): void
    {
        this.removeConnectorEl(conn.id);
        const g = svgCreate("g", {
            class: `${CLS}-connector`,
            "data-id": conn.id,
        });
        const pathD = this.computeConnectorPath(conn, objects);
        const path = svgCreate("path", {
            d: pathD,
            fill: "none",
        });
        this.applyConnectorStyle(path, conn.presentation.style);
        g.appendChild(path);
        this.renderConnectorLabels(g, conn, objects);
        this.connectorsEl.appendChild(g);
        this.connectorEls.set(conn.id, g);
    }

    private computeConnectorPath(
        conn: DiagramConnector,
        objects: DiagramObject[]
    ): string
    {
        const src = this.resolveEndpoint(
            conn.presentation.sourceId,
            conn.presentation.sourcePort,
            conn.presentation.sourcePoint,
            objects
        );
        const tgt = this.resolveEndpoint(
            conn.presentation.targetId,
            conn.presentation.targetPort,
            conn.presentation.targetPoint,
            objects
        );
        if (!src || !tgt) { return "M 0 0"; }
        if (conn.presentation.routing === "orthogonal")
        {
            return this.buildOrthogonalPath(src, tgt);
        }
        return `M ${src.x} ${src.y} L ${tgt.x} ${tgt.y}`;
    }

    private resolveEndpoint(
        objId: string, portId: string | undefined,
        fallbackPoint: Point | undefined,
        objects: DiagramObject[]
    ): Point | null
    {
        const obj = objects.find(o => o.id === objId);
        if (obj)
        {
            const b = obj.presentation.bounds;
            if (portId)
            {
                return this.resolvePortPosition(b, portId);
            }
            return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
        }
        if (fallbackPoint) { return fallbackPoint; }
        return null;
    }

    private resolvePortPosition(
        bounds: Rect, portId: string
    ): Point
    {
        const portMap: Record<string, Point> = {
            n: { x: bounds.x + bounds.width / 2, y: bounds.y },
            s: { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height },
            e: { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 },
            w: { x: bounds.x, y: bounds.y + bounds.height / 2 },
        };
        return portMap[portId]
            ?? { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
    }

    private buildOrthogonalPath(src: Point, tgt: Point): string
    {
        const midX = (src.x + tgt.x) / 2;
        return `M ${src.x} ${src.y} L ${midX} ${src.y} `
            + `L ${midX} ${tgt.y} L ${tgt.x} ${tgt.y}`;
    }

    private applyConnectorStyle(
        path: SVGElement, style: ConnectorStyle
    ): void
    {
        if (typeof style.color === "string")
        {
            path.setAttribute("stroke", style.color);
        }
        else
        {
            path.setAttribute("stroke", "var(--theme-text-muted)");
        }
        path.setAttribute("stroke-width",
            String(style.width || 1.5));
        if (style.dashPattern && style.dashPattern.length > 0)
        {
            path.setAttribute("stroke-dasharray",
                style.dashPattern.join(" "));
        }
        if (style.startArrow && style.startArrow !== "none")
        {
            const id = this.ensureArrowMarker(style.startArrow);
            path.setAttribute("marker-start", `url(#${id})`);
        }
        if (style.endArrow && style.endArrow !== "none")
        {
            const id = this.ensureArrowMarker(style.endArrow);
            path.setAttribute("marker-end", `url(#${id})`);
        }
    }

    private renderConnectorLabels(
        g: SVGElement, conn: DiagramConnector,
        objects: DiagramObject[]
    ): void
    {
        for (const label of conn.presentation.labels)
        {
            if (!label.textContent?.runs
                || label.textContent.runs.length === 0)
            {
                continue;
            }
            const text = (label.textContent.runs[0] as TextRun).text ?? "";
            if (!text) { continue; }
            const pos = this.getLabelPosition(conn, label.position, objects);
            const textEl = svgCreate("text", {
                x: String(pos.x), y: String(pos.y - 6),
                "text-anchor": "middle",
                "font-size": "11",
                fill: "var(--theme-text-secondary)",
            });
            textEl.textContent = text;
            g.appendChild(textEl);
        }
    }

    private getLabelPosition(
        conn: DiagramConnector,
        position: "start" | "middle" | "end" | number,
        objects: DiagramObject[]
    ): Point
    {
        const sp = this.resolveEndpoint(
            conn.presentation.sourceId,
            conn.presentation.sourcePort,
            conn.presentation.sourcePoint,
            objects
        ) ?? { x: 0, y: 0 };
        const tp = this.resolveEndpoint(
            conn.presentation.targetId,
            conn.presentation.targetPort,
            conn.presentation.targetPoint,
            objects
        ) ?? { x: 100, y: 100 };
        const t = position === "start" ? 0.1
            : position === "end" ? 0.9
            : typeof position === "number" ? position : 0.5;
        return {
            x: sp.x + (tp.x - sp.x) * t,
            y: sp.y + (tp.y - sp.y) * t,
        };
    }

    removeConnectorEl(id: string): void
    {
        const el = this.connectorEls.get(id);
        if (el) { el.remove(); this.connectorEls.delete(id); }
    }

    // ── Alignment guides ──

    renderAlignmentGuides(guides: AlignmentGuide[]): void
    {
        this.clearToolOverlay();
        for (const guide of guides)
        {
            this.renderOneGuide(guide);
        }
    }

    private renderOneGuide(guide: AlignmentGuide): void
    {
        const color = guide.type === "spacing"
            ? "var(--theme-danger)" : "var(--theme-primary)";
        for (const line of guide.lines)
        {
            const el = svgCreate("line", {
                x1: String(line.x1), y1: String(line.y1),
                x2: String(line.x2), y2: String(line.y2),
                stroke: color,
                "stroke-width": "0.5",
                "stroke-dasharray": guide.type === "spacing"
                    ? "" : "4 4",
            });
            this.toolOverlayEl.appendChild(el);
        }
        if (guide.label)
        {
            const text = svgCreate("text", {
                x: String(guide.label.position.x),
                y: String(guide.label.position.y),
                "text-anchor": "middle",
                "font-size": "10",
                fill: color,
            });
            text.textContent = guide.label.text;
            this.toolOverlayEl.appendChild(text);
        }
    }

    destroy(): void
    {
        this.svgEl.remove();
        this.objectEls.clear();
        this.layerEls.clear();
        this.connectorEls.clear();
    }
}

// ============================================================================
// S15: TOOL SYSTEM
// ============================================================================

interface Tool
{
    name: string;
    cursor: string;
    onActivate(): void;
    onDeactivate(): void;
    onMouseDown(e: MouseEvent, canvasPos: Point): void;
    onMouseMove(e: MouseEvent, canvasPos: Point): void;
    onMouseUp(e: MouseEvent, canvasPos: Point): void;
    onKeyDown(e: KeyboardEvent): void;
}

class ToolManager
{
    private tools: Map<string, Tool> = new Map();
    private activeTool: Tool | null = null;

    register(tool: Tool): void
    {
        this.tools.set(tool.name, tool);
    }

    setActive(name: string): void
    {
        if (this.activeTool)
        {
            this.activeTool.onDeactivate();
        }
        this.activeTool = this.tools.get(name) ?? null;
        if (this.activeTool)
        {
            this.activeTool.onActivate();
        }
    }

    getActive(): Tool | null { return this.activeTool; }
    getActiveName(): string { return this.activeTool?.name ?? ""; }
    getTool(name: string): Tool | null { return this.tools.get(name) ?? null; }

    dispatchMouseDown(e: MouseEvent, pos: Point): void
    {
        this.activeTool?.onMouseDown(e, pos);
    }

    dispatchMouseMove(e: MouseEvent, pos: Point): void
    {
        this.activeTool?.onMouseMove(e, pos);
    }

    dispatchMouseUp(e: MouseEvent, pos: Point): void
    {
        this.activeTool?.onMouseUp(e, pos);
    }

    dispatchKeyDown(e: KeyboardEvent): void
    {
        this.activeTool?.onKeyDown(e);
    }
}

// ============================================================================
// S16: SELECT TOOL
// ============================================================================

class SelectTool implements Tool
{
    name = "select";
    cursor = "default";

    private engine: DiagramEngineImpl;
    private dragging = false;
    private resizing = false;
    private rubberBanding = false;
    private rotating = false;
    private lastRubberBandPos: Point = { x: 0, y: 0 };
    private rotateCenter: Point = { x: 0, y: 0 };
    private rotateStartAngle = 0;
    private dragStartCanvas: Point = { x: 0, y: 0 };
    private dragStartBounds: Map<string, Rect> = new Map();
    private activeHandle: string | null = null;
    private resizeStartBounds: Rect | null = null;

    constructor(engine: DiagramEngineImpl)
    {
        this.engine = engine;
    }

    onActivate(): void { /* no-op */ }
    onDeactivate(): void { this.reset(); }

    onMouseDown(e: MouseEvent, canvasPos: Point): void
    {
        const handle = this.hitTestHandles(canvasPos);
        if (handle)
        {
            this.startResize(handle, canvasPos);
            return;
        }
        const hitObj = this.engine.hitTestObject(canvasPos);
        if (hitObj)
        {
            this.handleObjectClick(hitObj, e);
            this.startDrag(canvasPos);
        }
        else
        {
            if (!e.shiftKey) { this.engine.clearSelectionInternal(); }
            this.startRubberBand(canvasPos);
        }
    }

    onMouseMove(_e: MouseEvent, canvasPos: Point): void
    {
        if (this.dragging)
        {
            this.updateDrag(canvasPos);
        }
        else if (this.rubberBanding)
        {
            this.updateRubberBand(canvasPos);
        }
        else if (this.resizing)
        {
            this.updateResize(canvasPos);
        }
        else if (this.rotating)
        {
            this.updateRotation(canvasPos);
        }
    }

    onMouseUp(_e: MouseEvent, _canvasPos: Point): void
    {
        if (this.dragging) { this.endDrag(); }
        if (this.rubberBanding) { this.endRubberBand(); }
        if (this.resizing) { this.endResize(); }
        if (this.rotating) { this.rotating = false; }
    }

    private updateRotation(canvasPos: Point): void
    {
        const selected = this.engine.getSelectedObjects();
        if (selected.length !== 1) { return; }
        const angle = Math.atan2(
            canvasPos.y - this.rotateCenter.y,
            canvasPos.x - this.rotateCenter.x
        ) * 180 / Math.PI;
        const delta = angle - this.rotateStartAngle;
        const current = selected[0].presentation.rotation;
        this.engine.rotateObjectTo(
            selected[0].id,
            (current + delta + 360) % 360
        );
        this.rotateStartAngle = angle;
    }

    onKeyDown(e: KeyboardEvent): void
    {
        if (e.key === "Delete" || e.key === "Backspace")
        {
            this.engine.deleteSelected();
            e.preventDefault();
        }
        else if (e.key === "Escape")
        {
            this.engine.clearSelectionInternal();
        }
        else if (e.key === "a" && (e.ctrlKey || e.metaKey))
        {
            this.engine.selectAll();
            e.preventDefault();
        }
        else if (this.isArrowKey(e.key))
        {
            this.nudge(e);
        }
    }

    private handleObjectClick(
        obj: DiagramObject, e: MouseEvent
    ): void
    {
        if (e.shiftKey || e.ctrlKey || e.metaKey)
        {
            this.engine.toggleSelection(obj.id);
        }
        else if (!this.engine.isSelected(obj.id))
        {
            this.engine.clearSelectionInternal();
            this.engine.addToSelection(obj.id);
        }
    }

    private startDrag(canvasPos: Point): void
    {
        this.dragging = true;
        this.dragStartCanvas = { ...canvasPos };
        this.dragStartBounds.clear();
        for (const id of this.engine.getSelectedIds())
        {
            const obj = this.engine.getObjectById(id);
            if (obj)
            {
                this.dragStartBounds.set(id, { ...obj.presentation.bounds });
            }
        }
    }

    private updateDrag(canvasPos: Point): void
    {
        const dx = canvasPos.x - this.dragStartCanvas.x;
        const dy = canvasPos.y - this.dragStartCanvas.y;
        for (const [id, startBounds] of this.dragStartBounds)
        {
            this.engine.moveObjectTo(id, {
                x: startBounds.x + dx,
                y: startBounds.y + dy,
            });
        }
        this.showAlignmentGuides();
    }

    private showAlignmentGuides(): void
    {
        const selected = this.engine.getSelectedObjects();
        if (selected.length === 0) { return; }
        const bbox = this.engine.getSelectionBBox();
        if (!bbox) { return; }
        const result = computeAlignmentGuides(
            bbox,
            this.engine.getAllObjects(),
            new Set(this.engine.getSelectedIds()),
            SNAP_THRESHOLD
        );
        this.engine.showGuides(result.guides);
    }

    private endDrag(): void
    {
        if (!this.dragging) { return; }
        this.dragging = false;
        this.engine.pushMoveUndo(this.dragStartBounds);
        this.dragStartBounds.clear();
        this.engine.clearToolOverlay();
    }

    private startRubberBand(canvasPos: Point): void
    {
        this.rubberBanding = true;
        this.dragStartCanvas = { ...canvasPos };
        this.lastRubberBandPos = { ...canvasPos };
    }

    private updateRubberBand(canvasPos: Point): void
    {
        this.lastRubberBandPos = { ...canvasPos };
        const rect = this.computeRubberBandRect(canvasPos);
        this.engine.renderRubberBand(rect);
    }

    private endRubberBand(): void
    {
        if (!this.rubberBanding) { return; }
        this.rubberBanding = false;
        const rect = this.computeRubberBandRect(this.lastRubberBandPos);
        this.engine.clearToolOverlay();
        if (rect.width > 2 || rect.height > 2)
        {
            this.engine.selectObjectsInRect(rect);
        }
    }

    private computeRubberBandRect(canvasPos: Point): Rect
    {
        const x = Math.min(this.dragStartCanvas.x, canvasPos.x);
        const y = Math.min(this.dragStartCanvas.y, canvasPos.y);
        const w = Math.abs(canvasPos.x - this.dragStartCanvas.x);
        const h = Math.abs(canvasPos.y - this.dragStartCanvas.y);
        return { x, y, width: w, height: h };
    }

    private startResize(
        handleId: string, canvasPos: Point
    ): void
    {
        if (handleId === "rotate")
        {
            this.startRotation(canvasPos);
            return;
        }
        this.resizing = true;
        this.activeHandle = handleId;
        this.dragStartCanvas = { ...canvasPos };
        const selected = this.engine.getSelectedObjects();
        if (selected.length === 1)
        {
            this.resizeStartBounds = {
                ...selected[0].presentation.bounds,
            };
        }
    }

    private startRotation(canvasPos: Point): void
    {
        const selected = this.engine.getSelectedObjects();
        if (selected.length !== 1) { return; }
        this.rotating = true;
        const b = selected[0].presentation.bounds;
        this.rotateCenter = {
            x: b.x + b.width / 2,
            y: b.y + b.height / 2,
        };
        this.rotateStartAngle = Math.atan2(
            canvasPos.y - this.rotateCenter.y,
            canvasPos.x - this.rotateCenter.x
        ) * 180 / Math.PI;
    }

    private updateResize(canvasPos: Point): void
    {
        if (!this.activeHandle || !this.resizeStartBounds) { return; }
        const selected = this.engine.getSelectedObjects();
        if (selected.length !== 1) { return; }
        const newBounds = this.computeResizedBounds(
            this.resizeStartBounds, this.activeHandle,
            canvasPos
        );
        this.engine.resizeObject(selected[0].id, newBounds);
    }

    private endResize(): void
    {
        if (!this.resizing) { return; }
        this.resizing = false;
        if (this.resizeStartBounds)
        {
            const selected = this.engine.getSelectedObjects();
            if (selected.length === 1)
            {
                this.engine.pushResizeUndo(
                    selected[0].id,
                    this.resizeStartBounds,
                    { ...selected[0].presentation.bounds }
                );
            }
        }
        this.activeHandle = null;
        this.resizeStartBounds = null;
    }

    private computeResizedBounds(
        start: Rect, handle: string, pos: Point
    ): Rect
    {
        const dx = pos.x - this.dragStartCanvas.x;
        const dy = pos.y - this.dragStartCanvas.y;
        const b = { ...start };

        if (handle.includes("e"))
        {
            b.width = Math.max(20, start.width + dx);
        }
        if (handle.includes("w"))
        {
            const newW = Math.max(20, start.width - dx);
            b.x = start.x + start.width - newW;
            b.width = newW;
        }
        if (handle.includes("s"))
        {
            b.height = Math.max(20, start.height + dy);
        }
        if (handle.includes("n"))
        {
            const newH = Math.max(20, start.height - dy);
            b.y = start.y + start.height - newH;
            b.height = newH;
        }
        return b;
    }

    private hitTestHandles(canvasPos: Point): string | null
    {
        const selected = this.engine.getSelectedObjects();
        if (selected.length !== 1) { return null; }
        const b = selected[0].presentation.bounds;
        const rotatePt = {
            x: b.x + b.width / 2,
            y: b.y - 25,
        };
        if (Math.hypot(
            canvasPos.x - rotatePt.x,
            canvasPos.y - rotatePt.y
        ) <= 8)
        {
            return "rotate";
        }
        const handles = createBoundingBoxHandles(b);
        for (const h of handles)
        {
            const dist = Math.hypot(
                canvasPos.x - h.position.x,
                canvasPos.y - h.position.y
            );
            if (dist <= HANDLE_SIZE + HANDLE_HIT_MARGIN)
            {
                return h.id;
            }
        }
        return null;
    }

    private isArrowKey(key: string): boolean
    {
        return key === "ArrowUp" || key === "ArrowDown"
            || key === "ArrowLeft" || key === "ArrowRight";
    }

    private nudge(e: KeyboardEvent): void
    {
        const step = e.shiftKey ? NUDGE_SHIFT_PX : NUDGE_PX;
        let dx = 0;
        let dy = 0;
        if (e.key === "ArrowLeft") { dx = -step; }
        if (e.key === "ArrowRight") { dx = step; }
        if (e.key === "ArrowUp") { dy = -step; }
        if (e.key === "ArrowDown") { dy = step; }
        this.engine.nudgeSelected(dx, dy);
        e.preventDefault();
    }

    cancelDrag(): void
    {
        this.dragging = false;
        this.resizing = false;
        this.rubberBanding = false;
        this.rotating = false;
        this.dragStartBounds.clear();
    }

    private reset(): void
    {
        this.cancelDrag();
    }
}

// ============================================================================
// S17: PAN TOOL
// ============================================================================

class PanTool implements Tool
{
    name = "pan";
    cursor = "grab";

    private engine: DiagramEngineImpl;
    private panning = false;
    private lastScreenPos: Point = { x: 0, y: 0 };

    constructor(engine: DiagramEngineImpl)
    {
        this.engine = engine;
    }

    onActivate(): void { /* no-op */ }
    onDeactivate(): void { this.panning = false; }

    onMouseDown(e: MouseEvent, _canvasPos: Point): void
    {
        this.panning = true;
        this.lastScreenPos = { x: e.clientX, y: e.clientY };
    }

    onMouseMove(e: MouseEvent, _canvasPos: Point): void
    {
        if (!this.panning) { return; }
        const dx = e.clientX - this.lastScreenPos.x;
        const dy = e.clientY - this.lastScreenPos.y;
        this.engine.panCanvas(dx, dy);
        this.lastScreenPos = { x: e.clientX, y: e.clientY };
    }

    onMouseUp(_e: MouseEvent, _canvasPos: Point): void
    {
        this.panning = false;
    }

    onKeyDown(_e: KeyboardEvent): void { /* no-op */ }
}

// ============================================================================
// S17B: DRAW TOOL
// ============================================================================

class DrawTool implements Tool
{
    name = "draw";
    cursor = "crosshair";

    private engine: DiagramEngineImpl;
    private drawing = false;
    private startPos: Point = { x: 0, y: 0 };
    private shapeType = "rectangle";

    constructor(engine: DiagramEngineImpl)
    {
        this.engine = engine;
    }

    setShapeType(type: string): void
    {
        this.shapeType = type;
    }

    onActivate(): void { /* no-op */ }
    onDeactivate(): void { this.drawing = false; }

    onMouseDown(_e: MouseEvent, canvasPos: Point): void
    {
        this.drawing = true;
        this.startPos = { ...canvasPos };
    }

    onMouseMove(_e: MouseEvent, canvasPos: Point): void
    {
        if (!this.drawing) { return; }
        const rect = this.computeRect(canvasPos);
        this.engine.renderRubberBand(rect);
    }

    onMouseUp(_e: MouseEvent, canvasPos: Point): void
    {
        if (!this.drawing) { return; }
        this.drawing = false;
        this.engine.clearToolOverlay();
        const rect = this.computeRect(canvasPos);
        if (rect.width < 5 && rect.height < 5)
        {
            this.placeDefaultSize(canvasPos);
        }
        else
        {
            this.placeWithBounds(rect);
        }
        this.engine.setActiveTool("select");
    }

    onKeyDown(e: KeyboardEvent): void
    {
        if (e.key === "Escape")
        {
            this.drawing = false;
            this.engine.clearToolOverlay();
            this.engine.setActiveTool("select");
        }
    }

    private computeRect(canvasPos: Point): Rect
    {
        return {
            x: Math.min(this.startPos.x, canvasPos.x),
            y: Math.min(this.startPos.y, canvasPos.y),
            width: Math.abs(canvasPos.x - this.startPos.x),
            height: Math.abs(canvasPos.y - this.startPos.y),
        };
    }

    private placeDefaultSize(pos: Point): void
    {
        const shapeDef = this.engine.getShapeDef(this.shapeType);
        const size = shapeDef?.defaultSize
            ?? { w: 160, h: 100 };
        this.engine.addObject({
            presentation: {
                shape: this.shapeType,
                bounds: {
                    x: pos.x - size.w / 2,
                    y: pos.y - size.h / 2,
                    width: size.w, height: size.h,
                },
            },
        });
    }

    private placeWithBounds(rect: Rect): void
    {
        this.engine.addObject({
            presentation: {
                shape: this.shapeType,
                bounds: rect,
            },
        });
    }
}

// ============================================================================
// S17C: TEXT TOOL
// ============================================================================

class TextTool implements Tool
{
    name = "text";
    cursor = "text";

    private engine: DiagramEngineImpl;

    constructor(engine: DiagramEngineImpl)
    {
        this.engine = engine;
    }

    onActivate(): void { /* no-op */ }
    onDeactivate(): void { /* no-op */ }

    onMouseDown(_e: MouseEvent, canvasPos: Point): void
    {
        const obj = this.engine.addObject({
            presentation: {
                shape: "text",
                bounds: {
                    x: canvasPos.x, y: canvasPos.y,
                    width: 200, height: 40,
                },
                textContent: {
                    runs: [{ text: "Text" }],
                    overflow: "visible",
                    verticalAlign: "middle",
                    horizontalAlign: "center",
                    padding: 4,
                },
            },
        });
        this.engine.clearSelectionInternal();
        this.engine.addToSelection(obj.id);
        this.engine.setActiveTool("select");
    }

    onMouseMove(_e: MouseEvent, _p: Point): void { /* no-op */ }
    onMouseUp(_e: MouseEvent, _p: Point): void { /* no-op */ }
    onKeyDown(e: KeyboardEvent): void
    {
        if (e.key === "Escape")
        {
            this.engine.setActiveTool("select");
        }
    }
}

// ============================================================================
// S17D: CONNECTOR TOOL
// ============================================================================

class ConnectorTool implements Tool
{
    name = "connect";
    cursor = "crosshair";

    private engine: DiagramEngineImpl;
    private connecting = false;
    private sourceObj: DiagramObject | null = null;
    private startPos: Point = { x: 0, y: 0 };

    constructor(engine: DiagramEngineImpl)
    {
        this.engine = engine;
    }

    onActivate(): void { /* no-op */ }
    onDeactivate(): void { this.connecting = false; }

    onMouseDown(_e: MouseEvent, canvasPos: Point): void
    {
        const obj = this.engine.hitTestObject(canvasPos);
        if (obj)
        {
            this.connecting = true;
            this.sourceObj = obj;
            const b = obj.presentation.bounds;
            this.startPos = {
                x: b.x + b.width / 2,
                y: b.y + b.height / 2,
            };
        }
    }

    onMouseMove(_e: MouseEvent, canvasPos: Point): void
    {
        if (!this.connecting) { return; }
        this.engine.clearToolOverlay();
        this.engine.renderPreviewLine(
            this.startPos, canvasPos
        );
    }

    onMouseUp(_e: MouseEvent, canvasPos: Point): void
    {
        if (!this.connecting || !this.sourceObj) { return; }
        this.connecting = false;
        this.engine.clearToolOverlay();
        const targetObj = this.engine.hitTestObject(canvasPos);
        if (targetObj && targetObj.id !== this.sourceObj.id)
        {
            this.engine.addConnector({
                presentation: {
                    sourceId: this.sourceObj.id,
                    targetId: targetObj.id,
                    routing: "straight",
                    style: {
                        color: "var(--theme-text-muted)",
                        width: 1.5,
                        endArrow: "classic",
                    },
                    labels: [],
                    waypoints: [],
                },
            });
        }
        this.sourceObj = null;
    }

    onKeyDown(e: KeyboardEvent): void
    {
        if (e.key === "Escape")
        {
            this.connecting = false;
            this.engine.clearToolOverlay();
            this.engine.setActiveTool("select");
        }
    }
}

// ============================================================================
// S17E: PEN TOOL
// ============================================================================

class PenTool implements Tool
{
    name = "pen";
    cursor = "crosshair";

    private engine: DiagramEngineImpl;
    private points: Point[] = [];

    constructor(engine: DiagramEngineImpl)
    {
        this.engine = engine;
    }

    onActivate(): void { this.points = []; }
    onDeactivate(): void { this.finalizePath(); }

    onMouseDown(_e: MouseEvent, canvasPos: Point): void
    {
        this.points.push({ ...canvasPos });
        this.renderPreview();
    }

    onMouseMove(_e: MouseEvent, _p: Point): void { /* no-op */ }
    onMouseUp(_e: MouseEvent, _p: Point): void { /* no-op */ }

    onKeyDown(e: KeyboardEvent): void
    {
        if (e.key === "Escape")
        {
            this.finalizePath();
            this.engine.setActiveTool("select");
        }
        if (e.key === "Enter") { this.finalizePath(); }
    }

    private renderPreview(): void
    {
        this.engine.clearToolOverlay();
        if (this.points.length === 0) { return; }
        const svg = this.engine.getElement();
        const overlay = svg.querySelector(`.${CLS}-tool-overlay`);
        if (!overlay) { return; }
        if (this.points.length === 1)
        {
            const dot = svgCreate("circle", {
                cx: String(this.points[0].x),
                cy: String(this.points[0].y),
                r: "3",
                fill: "var(--theme-primary)",
            });
            overlay.appendChild(dot);
            return;
        }
        const d = this.points.map((p, i) =>
            `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`
        ).join(" ");
        const path = svgCreate("path", {
            d, fill: "none",
            stroke: "var(--theme-primary)",
            "stroke-width": "1.5",
            "stroke-dasharray": "4 4",
        });
        overlay.appendChild(path);
    }

    private finalizePath(): void
    {
        if (this.points.length < 2)
        {
            this.points = [];
            this.engine.clearToolOverlay();
            return;
        }
        const bbox = this.computeBBox();
        const localD = this.points.map((p, i) =>
            `${i === 0 ? "M" : "L"} ${p.x - bbox.x} ${p.y - bbox.y}`
        ).join(" ");
        this.engine.addObject({
            semantic: { type: "path", data: {} },
            presentation: {
                shape: "path",
                bounds: bbox,
                parameters: { d: localD },
                style: {
                    fill: { type: "none" },
                    stroke: {
                        color: "var(--theme-primary)",
                        width: 1.5,
                    },
                },
            },
        });
        this.points = [];
        this.engine.clearToolOverlay();
        this.engine.setActiveTool("select");
    }

    private computeBBox(): Rect
    {
        let minX = Infinity; let minY = Infinity;
        let maxX = -Infinity; let maxY = -Infinity;
        for (const p of this.points)
        {
            if (p.x < minX) { minX = p.x; }
            if (p.y < minY) { minY = p.y; }
            if (p.x > maxX) { maxX = p.x; }
            if (p.y > maxY) { maxY = p.y; }
        }
        return {
            x: minX, y: minY,
            width: maxX - minX || 10,
            height: maxY - minY || 10,
        };
    }
}

// ============================================================================
// S17F: MEASURE TOOL
// ============================================================================

class MeasureTool implements Tool
{
    name = "measure";
    cursor = "crosshair";

    private engine: DiagramEngineImpl;
    private measuring = false;
    private startPos: Point = { x: 0, y: 0 };

    constructor(engine: DiagramEngineImpl)
    {
        this.engine = engine;
    }

    onActivate(): void { /* no-op */ }
    onDeactivate(): void { this.measuring = false; }

    onMouseDown(_e: MouseEvent, canvasPos: Point): void
    {
        this.measuring = true;
        this.startPos = { ...canvasPos };
    }

    onMouseMove(_e: MouseEvent, canvasPos: Point): void
    {
        if (!this.measuring) { return; }
        this.engine.clearToolOverlay();
        this.renderMeasurement(canvasPos);
    }

    onMouseUp(_e: MouseEvent, _p: Point): void
    {
        this.measuring = false;
    }

    onKeyDown(e: KeyboardEvent): void
    {
        if (e.key === "Escape")
        {
            this.measuring = false;
            this.engine.clearToolOverlay();
            this.engine.setActiveTool("select");
        }
    }

    private renderMeasurement(endPos: Point): void
    {
        const svg = this.engine.getElement();
        const overlay = svg.querySelector(`.${CLS}-tool-overlay`);
        if (!overlay) { return; }
        const line = svgCreate("line", {
            x1: String(this.startPos.x),
            y1: String(this.startPos.y),
            x2: String(endPos.x),
            y2: String(endPos.y),
            stroke: "var(--theme-danger)",
            "stroke-width": "1",
            "stroke-dasharray": "4 4",
        });
        overlay.appendChild(line);
        const dist = Math.hypot(
            endPos.x - this.startPos.x,
            endPos.y - this.startPos.y
        );
        const midX = (this.startPos.x + endPos.x) / 2;
        const midY = (this.startPos.y + endPos.y) / 2;
        const label = svgCreate("text", {
            x: String(midX), y: String(midY - 8),
            "text-anchor": "middle",
            "font-size": "11",
            fill: "var(--theme-danger)",
        });
        label.textContent = `${Math.round(dist)}px`;
        overlay.appendChild(label);
    }
}

// ============================================================================
// S17G: BRUSH TOOL
// ============================================================================

class BrushTool implements Tool
{
    name = "brush";
    cursor = "crosshair";

    private engine: DiagramEngineImpl;
    private drawing = false;
    private points: Point[] = [];

    constructor(engine: DiagramEngineImpl)
    {
        this.engine = engine;
    }

    onActivate(): void { /* no-op */ }
    onDeactivate(): void { this.drawing = false; }

    onMouseDown(_e: MouseEvent, canvasPos: Point): void
    {
        this.drawing = true;
        this.points = [{ ...canvasPos }];
    }

    onMouseMove(_e: MouseEvent, canvasPos: Point): void
    {
        if (!this.drawing) { return; }
        this.points.push({ ...canvasPos });
        this.renderStroke();
    }

    onMouseUp(_e: MouseEvent, _p: Point): void
    {
        if (!this.drawing) { return; }
        this.drawing = false;
        this.finalizeStroke();
    }

    onKeyDown(e: KeyboardEvent): void
    {
        if (e.key === "Escape")
        {
            this.drawing = false;
            this.engine.clearToolOverlay();
            this.engine.setActiveTool("select");
        }
    }

    private renderStroke(): void
    {
        this.engine.clearToolOverlay();
        if (this.points.length < 2) { return; }
        const d = this.buildSmoothPath();
        const svg = this.engine.getElement();
        const overlay = svg.querySelector(`.${CLS}-tool-overlay`);
        if (!overlay) { return; }
        const path = svgCreate("path", {
            d, fill: "none",
            stroke: "var(--theme-text-primary)",
            "stroke-width": "2",
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
        });
        overlay.appendChild(path);
    }

    private finalizeStroke(): void
    {
        if (this.points.length < 3)
        {
            this.points = [];
            this.engine.clearToolOverlay();
            return;
        }
        const bbox = this.computeBBox();
        const localPoints = this.points.map(p => ({
            x: p.x - bbox.x,
            y: p.y - bbox.y,
        }));
        const smoothed = this.simplifyPoints(localPoints, 3);
        const d = this.buildPathFromPoints(smoothed);
        this.engine.addObject({
            semantic: {
                type: "freehand",
                data: { pointCount: smoothed.length },
            },
            presentation: {
                shape: "path",
                bounds: bbox,
                parameters: { d },
                style: {
                    fill: { type: "none" },
                    stroke: {
                        color: "var(--theme-text-primary)",
                        width: 2,
                    },
                },
            },
        });
        this.points = [];
        this.engine.clearToolOverlay();
    }

    private buildSmoothPath(): string
    {
        return this.buildPathFromPoints(this.points);
    }

    private buildPathFromPoints(pts: Point[]): string
    {
        if (pts.length < 2) { return ""; }
        const parts = [`M ${pts[0].x} ${pts[0].y}`];
        for (let i = 1; i < pts.length; i++)
        {
            parts.push(`L ${pts[i].x} ${pts[i].y}`);
        }
        return parts.join(" ");
    }

    private simplifyPoints(
        pts: Point[], tolerance: number
    ): Point[]
    {
        if (pts.length <= 2) { return pts; }
        const result: Point[] = [pts[0]];
        let lastKept = pts[0];
        for (let i = 1; i < pts.length - 1; i++)
        {
            const dist = Math.hypot(
                pts[i].x - lastKept.x,
                pts[i].y - lastKept.y
            );
            if (dist >= tolerance)
            {
                result.push(pts[i]);
                lastKept = pts[i];
            }
        }
        result.push(pts[pts.length - 1]);
        return result;
    }

    private computeBBox(): Rect
    {
        let minX = Infinity; let minY = Infinity;
        let maxX = -Infinity; let maxY = -Infinity;
        for (const p of this.points)
        {
            if (p.x < minX) { minX = p.x; }
            if (p.y < minY) { minY = p.y; }
            if (p.x > maxX) { maxX = p.x; }
            if (p.y > maxY) { maxY = p.y; }
        }
        return {
            x: minX, y: minY,
            width: maxX - minX || 10,
            height: maxY - minY || 10,
        };
    }
}

// ============================================================================
// S18: DIAGRAM ENGINE IMPLEMENTATION
// ============================================================================

class DiagramEngineImpl
{
    private instanceId: string;
    private opts: DiagramEngineOptions;
    private doc: DiagramDocument;
    private renderer: RenderEngine;
    private shapeRegistry: ShapeRegistry;
    private toolManager: ToolManager;
    private events: EventBus;
    private undoStack: UndoStack;
    private selectedIds: Set<string> = new Set();
    private dirty = false;
    private changeCount = 0;
    private clipboard: unknown[] = [];
    private themeObserver: MutationObserver | null = null;
    private destroyed = false;

    constructor(
        container: HTMLElement, opts: DiagramEngineOptions
    )
    {
        this.instanceId = `${CLS}-${++instanceCounter}`;
        this.opts = opts;
        this.events = new EventBus();
        this.undoStack = new UndoStack();
        this.shapeRegistry = new ShapeRegistry();
        registerBasicShapes(this.shapeRegistry);

        container.classList.add(`${CLS}-container`);
        this.renderer = new RenderEngine(container);

        this.doc = opts.document
            ? this.cloneDocument(opts.document)
            : this.createEmptyDocument();

        this.toolManager = new ToolManager();
        this.registerTools();
        this.toolManager.setActive("select");

        this.bindEvents(container);
        this.observeThemeChanges();
        this.initialRender();

        console.log(LOG_PREFIX, "Created:", this.instanceId);
    }

    // ── Internals exposed to tools ──

    hitTestObject(canvasPos: Point): DiagramObject | null
    {
        const visible = this.getVisibleObjects();
        for (let i = visible.length - 1; i >= 0; i--)
        {
            const obj = visible[i];
            const b = obj.presentation.bounds;
            const shapeDef = this.shapeRegistry.get(
                obj.presentation.shape
            );
            if (shapeDef && shapeDef.hitTest(canvasPos, b))
            {
                return obj;
            }
        }
        return null;
    }

    isSelected(id: string): boolean
    {
        return this.selectedIds.has(id);
    }

    addToSelection(id: string): void
    {
        this.selectedIds.add(id);
        this.updateSelectionVisuals();
    }

    toggleSelection(id: string): void
    {
        if (this.selectedIds.has(id))
        {
            this.selectedIds.delete(id);
        }
        else
        {
            this.selectedIds.add(id);
        }
        this.updateSelectionVisuals();
    }

    clearSelectionInternal(): void
    {
        this.selectedIds.clear();
        this.updateSelectionVisuals();
    }

    getSelectedIds(): string[]
    {
        return Array.from(this.selectedIds);
    }

    getSelectedObjects(): DiagramObject[]
    {
        return this.doc.objects.filter(
            o => this.selectedIds.has(o.id)
        );
    }

    getObjectById(id: string): DiagramObject | null
    {
        return this.doc.objects.find(o => o.id === id) ?? null;
    }

    moveObjectTo(id: string, pos: { x: number; y: number }): void
    {
        const obj = this.getObjectById(id);
        if (!obj || obj.presentation.locked) { return; }
        obj.presentation.bounds.x = pos.x;
        obj.presentation.bounds.y = pos.y;
        this.rerenderObject(obj);
        this.rerenderAttachedConnectors(id);
        this.updateSelectionVisuals();
    }

    resizeObject(id: string, bounds: Rect): void
    {
        const obj = this.getObjectById(id);
        if (!obj || obj.presentation.locked) { return; }
        obj.presentation.bounds = { ...bounds };
        this.rerenderObject(obj);
        this.rerenderAttachedConnectors(id);
        this.updateSelectionVisuals();
    }

    nudgeSelected(dx: number, dy: number): void
    {
        for (const id of this.selectedIds)
        {
            const obj = this.getObjectById(id);
            if (obj && !obj.presentation.locked)
            {
                obj.presentation.bounds.x += dx;
                obj.presentation.bounds.y += dy;
                this.rerenderObject(obj);
                this.rerenderAttachedConnectors(id);
            }
        }
        this.updateSelectionVisuals();
    }

    deleteSelected(): void
    {
        const ids = Array.from(this.selectedIds);
        for (const id of ids)
        {
            this.removeAttachedConnectors(id);
            this.removeObjectInternal(id);
        }
        this.selectedIds.clear();
        this.updateSelectionVisuals();
    }

    private removeAttachedConnectors(objectId: string): void
    {
        const toRemove = this.doc.connectors.filter(
            c => c.presentation.sourceId === objectId
                || c.presentation.targetId === objectId
        );
        for (const conn of toRemove)
        {
            const idx = this.doc.connectors.indexOf(conn);
            if (idx >= 0)
            {
                this.doc.connectors.splice(idx, 1);
                this.renderer.removeConnectorEl(conn.id);
            }
        }
    }

    selectAll(): void
    {
        for (const obj of this.doc.objects)
        {
            if (obj.presentation.visible)
            {
                this.selectedIds.add(obj.id);
            }
        }
        this.updateSelectionVisuals();
    }

    pushMoveUndo(
        startBounds: Map<string, Rect>
    ): void
    {
        const endBounds = new Map<string, Rect>();
        for (const [id] of startBounds)
        {
            const obj = this.getObjectById(id);
            if (obj)
            {
                endBounds.set(id, { ...obj.presentation.bounds });
            }
        }
        const clonedStart = new Map(startBounds);
        this.undoStack.push({
            type: "move",
            label: "Move objects",
            timestamp: Date.now(),
            mergeable: true,
            undo: () =>
            {
                for (const [id, b] of clonedStart)
                {
                    this.moveObjectTo(id, { x: b.x, y: b.y });
                }
            },
            redo: () =>
            {
                for (const [id, b] of endBounds)
                {
                    this.moveObjectTo(id, { x: b.x, y: b.y });
                }
            },
        });
        this.markDirty();
    }

    pushResizeUndo(
        id: string, startBounds: Rect, endBounds: Rect
    ): void
    {
        const clonedStart = { ...startBounds };
        const clonedEnd = { ...endBounds };
        this.undoStack.push({
            type: "resize",
            label: "Resize object",
            timestamp: Date.now(),
            mergeable: false,
            undo: () =>
            {
                this.resizeObject(id, clonedStart);
            },
            redo: () =>
            {
                this.resizeObject(id, clonedEnd);
            },
        });
        this.markDirty();
    }

    rotateObjectTo(id: string, degrees: number): void
    {
        const obj = this.getObjectById(id);
        if (!obj || obj.presentation.locked) { return; }
        obj.presentation.rotation = degrees;
        this.rerenderObject(obj);
        this.updateSelectionVisuals();
    }

    startInlineTextEdit(
        objectId: string, regionId?: string
    ): void
    {
        const obj = this.getObjectById(objectId);
        if (!obj) { return; }
        const selectTool = this.toolManager.getTool("select");
        if (selectTool)
        {
            (selectTool as SelectTool).cancelDrag();
        }
        this.renderer.startInlineEdit(
            obj, regionId,
            () => { this.endInlineTextEdit(); }
        );
        this.events.emit("text:edit:start", obj);
    }

    endInlineTextEdit(): void
    {
        const text = this.renderer.endInlineEdit();
        if (text === null) { return; }
        const selected = this.getSelectedObjects();
        if (selected.length === 1)
        {
            selected[0].presentation.textContent = {
                runs: [{ text }],
                overflow: "visible",
                verticalAlign: "middle",
                horizontalAlign: "center",
                padding: 4,
            };
            this.rerenderObject(selected[0]);
            this.markDirty();
        }
        this.events.emit("text:edit:end");
    }

    panCanvas(dx: number, dy: number): void
    {
        this.renderer.pan(dx, dy);
        this.emitViewportChange();
    }

    renderRubberBand(rect: Rect): void
    {
        this.renderer.renderRubberBand(rect);
    }

    clearToolOverlay(): void
    {
        this.renderer.clearToolOverlay();
    }

    getSelectionBBox(): Rect | null
    {
        const selected = this.getSelectedObjects();
        if (selected.length === 0) { return null; }
        return this.computeGroupBBox(selected);
    }

    getAllObjects(): DiagramObject[]
    {
        return this.doc.objects;
    }

    showGuides(guides: AlignmentGuide[]): void
    {
        this.renderer.renderAlignmentGuides(guides);
    }

    selectObjectsInRect(rect: Rect): void
    {
        const found = this.findObjectsInRect(rect);
        for (const obj of found)
        {
            if (obj.presentation.visible && !obj.presentation.locked)
            {
                this.selectedIds.add(obj.id);
            }
        }
        this.updateSelectionVisuals();
    }

    // ── Private ──

    private registerTools(): void
    {
        this.toolManager.register(new SelectTool(this));
        this.toolManager.register(new PanTool(this));
        this.toolManager.register(new DrawTool(this));
        this.toolManager.register(new TextTool(this));
        this.toolManager.register(new ConnectorTool(this));
        this.toolManager.register(new PenTool(this));
        this.toolManager.register(new MeasureTool(this));
        this.toolManager.register(new BrushTool(this));
    }

    getShapeDef(type: string): ShapeDefinition | null
    {
        return this.shapeRegistry.get(type);
    }

    renderPreviewLine(from: Point, to: Point): void
    {
        const line = svgCreate("line", {
            x1: String(from.x), y1: String(from.y),
            x2: String(to.x), y2: String(to.y),
            stroke: "var(--theme-primary)",
            "stroke-width": "1.5",
            "stroke-dasharray": "4 4",
        });
        const svg = this.renderer.getSvgElement();
        const toolOverlay = svg.querySelector(`.${CLS}-tool-overlay`);
        if (toolOverlay) { toolOverlay.appendChild(line); }
    }

    private bindEvents(container: HTMLElement): void
    {
        const svg = this.renderer.getSvgElement();
        svg.addEventListener("mousedown", (e) => this.onMouseDown(e));
        svg.addEventListener("mousemove", (e) => this.onMouseMove(e));
        svg.addEventListener("mouseup", (e) => this.onMouseUp(e));
        svg.addEventListener("wheel", (e) => this.onWheel(e), { passive: false });
        svg.addEventListener("keydown", (e) => this.onKeyDown(e));
        svg.addEventListener("dblclick", (e) => this.onDoubleClick(e));
    }

    private previousTool: string | null = null;

    private onMouseDown(e: MouseEvent): void
    {
        this.endInlineTextEdit();
        const pos = this.renderer.screenToCanvas(e.clientX, e.clientY);
        if (e.button === 1)
        {
            this.previousTool = this.toolManager.getActiveName();
            this.toolManager.setActive("pan");
        }
        this.toolManager.dispatchMouseDown(e, pos);
    }

    private onMouseMove(e: MouseEvent): void
    {
        const pos = this.renderer.screenToCanvas(e.clientX, e.clientY);
        this.toolManager.dispatchMouseMove(e, pos);
    }

    private onMouseUp(e: MouseEvent): void
    {
        const pos = this.renderer.screenToCanvas(e.clientX, e.clientY);
        this.toolManager.dispatchMouseUp(e, pos);
        if (e.button === 1)
        {
            const restoreTo = this.previousTool ?? "select";
            this.previousTool = null;
            this.toolManager.setActive(restoreTo);
        }
    }

    private onWheel(e: WheelEvent): void
    {
        e.preventDefault();
        const factor = e.deltaY < 0 ? (1 + ZOOM_STEP) : (1 - ZOOM_STEP);
        const rect = this.renderer.getSvgElement().getBoundingClientRect();
        const fx = e.clientX - rect.left;
        const fy = e.clientY - rect.top;
        this.renderer.zoomAt(factor, fx, fy);
        this.emitViewportChange();
    }

    private onKeyDown(e: KeyboardEvent): void
    {
        if (e.key === "z" && (e.ctrlKey || e.metaKey) && !e.shiftKey)
        {
            this.undo();
            e.preventDefault();
            return;
        }
        if ((e.key === "y" && (e.ctrlKey || e.metaKey))
            || (e.key === "z" && (e.ctrlKey || e.metaKey) && e.shiftKey))
        {
            this.redo();
            e.preventDefault();
            return;
        }
        if (e.key === "0" && (e.ctrlKey || e.metaKey))
        {
            this.zoomToFit();
            e.preventDefault();
            return;
        }
        if (e.key === "=" || e.key === "+")
        {
            this.zoomIn();
            e.preventDefault();
            return;
        }
        if (e.key === "-")
        {
            this.zoomOut();
            e.preventDefault();
            return;
        }
        this.toolManager.dispatchKeyDown(e);
    }

    private onDoubleClick(e: MouseEvent): void
    {
        const pos = this.renderer.screenToCanvas(e.clientX, e.clientY);
        const obj = this.hitTestObject(pos);
        if (obj)
        {
            if (this.opts.onObjectDoubleClick)
            {
                safeCallback(this.opts.onObjectDoubleClick, obj);
            }
            else if (this.opts.textEditable !== false)
            {
                if (!obj.presentation.textContent)
                {
                    obj.presentation.textContent = {
                        runs: [{ text: "" }],
                        overflow: "visible",
                        verticalAlign: "middle",
                        horizontalAlign: "center",
                        padding: 4,
                    };
                }
                this.startInlineTextEdit(obj.id);
            }
        }
    }

    private initialRender(): void
    {
        this.renderer.renderGrid(this.doc.grid);
        for (const layer of this.doc.layers)
        {
            this.renderer.ensureLayerEl(layer.id, layer.order);
        }
        for (const obj of this.doc.objects)
        {
            this.rerenderObject(obj);
        }
        for (const conn of this.doc.connectors)
        {
            this.rerenderConnector(conn);
        }
    }

    private rerenderObject(obj: DiagramObject): void
    {
        const shapeDef = this.shapeRegistry.get(
            obj.presentation.shape
        );
        if (!shapeDef)
        {
            console.warn(LOG_PREFIX,
                "Unknown shape:", obj.presentation.shape);
            return;
        }
        this.renderer.renderObject(obj, shapeDef);
    }

    private updateSelectionVisuals(): void
    {
        const selected = this.getSelectedObjects();
        this.renderer.renderSelectionHandles(selected);
        safeCallback(this.opts.onSelectionChange, selected, []);
        this.events.emit("selection:change", selected);
    }

    private getVisibleObjects(): DiagramObject[]
    {
        return this.doc.objects.filter(o => o.presentation.visible);
    }

    private removeObjectInternal(id: string): void
    {
        const idx = this.doc.objects.findIndex(o => o.id === id);
        if (idx < 0) { return; }
        this.doc.objects.splice(idx, 1);
        this.renderer.removeObjectEl(id);
        this.markDirty();
        this.events.emit("object:remove", id);
    }

    private markDirty(): void
    {
        this.dirty = true;
        this.changeCount++;
        this.events.emit("dirty:change", true);
    }

    private emitViewportChange(): void
    {
        const vp = this.renderer.getViewport();
        safeCallback(this.opts.onViewportChange, vp);
        this.events.emit("viewport:change", vp);
    }

    private observeThemeChanges(): void
    {
        this.themeObserver = new MutationObserver(() =>
        {
            this.reRenderAll();
        });
        this.themeObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["data-bs-theme"],
        });
    }

    private reRenderAll(): void
    {
        for (const obj of this.doc.objects)
        {
            this.rerenderObject(obj);
        }
        this.updateSelectionVisuals();
    }

    private createEmptyDocument(): DiagramDocument
    {
        const now = new Date().toISOString();
        return {
            version: VERSION,
            metadata: {
                title: "Untitled Diagram",
                created: now,
                modified: now,
            },
            layers: [{
                id: DEFAULT_LAYER_ID,
                name: DEFAULT_LAYER_NAME,
                visible: true,
                locked: false,
                printable: true,
                opacity: 1,
                order: 0,
            }],
            objects: [],
            connectors: [],
            comments: [],
            guides: [],
            grid: {
                size: this.opts.grid?.size ?? DEFAULT_GRID_SIZE,
                style: this.opts.grid?.style ?? "dots",
                visible: this.opts.grid?.visible ?? true,
            },
        };
    }

    private cloneDocument(doc: DiagramDocument): DiagramDocument
    {
        return JSON.parse(JSON.stringify(doc));
    }

    // ================================================================
    // PUBLIC API
    // ================================================================

    // ── Document ──

    getDocument(): DiagramDocument
    {
        return this.cloneDocument(this.doc);
    }

    setDocument(doc: DiagramDocument): void
    {
        this.doc = this.cloneDocument(doc);
        this.selectedIds.clear();
        this.undoStack.clear();
        this.dirty = false;
        this.changeCount = 0;
        this.initialRender();
        this.events.emit("document:load");
    }

    clear(): void
    {
        this.setDocument(this.createEmptyDocument());
    }

    // ── Objects ──

    addObject(partial: DiagramObjectInput): DiagramObject
    {
        const obj = this.buildObject(partial);
        this.doc.objects.push(obj);
        this.rerenderObject(obj);
        this.markDirty();
        this.events.emit("object:add", obj);
        return obj;
    }

    removeObject(id: string): void
    {
        this.removeAttachedConnectors(id);
        this.removeObjectInternal(id);
        this.selectedIds.delete(id);
        this.updateSelectionVisuals();
    }

    updateObject(
        id: string, changes: Partial<DiagramObject>
    ): void
    {
        const obj = this.getObjectById(id);
        if (!obj) { return; }
        if (changes.semantic)
        {
            Object.assign(obj.semantic, changes.semantic);
        }
        if (changes.presentation)
        {
            Object.assign(obj.presentation, changes.presentation);
        }
        this.rerenderObject(obj);
        this.markDirty();
        this.events.emit("object:change", obj);
    }

    getObject(id: string): DiagramObject | null
    {
        return this.getObjectById(id);
    }

    getObjects(): DiagramObject[]
    {
        return [...this.doc.objects];
    }

    getObjectsBySemanticType(type: string): DiagramObject[]
    {
        return this.doc.objects.filter(
            o => o.semantic.type === type
        );
    }

    // ── Connectors ──

    addConnector(
        partial: Partial<DiagramConnector>
    ): DiagramConnector
    {
        const conn = this.buildConnector(partial);
        this.doc.connectors.push(conn);
        this.rerenderConnector(conn);
        this.markDirty();
        this.events.emit("connector:add", conn);
        return conn;
    }

    removeConnector(id: string): void
    {
        const idx = this.doc.connectors.findIndex(c => c.id === id);
        if (idx < 0) { return; }
        this.doc.connectors.splice(idx, 1);
        this.renderer.removeConnectorEl(id);
        this.markDirty();
        this.events.emit("connector:remove", id);
    }

    updateConnector(
        id: string, changes: Partial<DiagramConnector>
    ): void
    {
        const conn = this.doc.connectors.find(c => c.id === id);
        if (!conn) { return; }
        if (changes.semantic)
        {
            Object.assign(conn.semantic, changes.semantic);
        }
        if (changes.presentation)
        {
            Object.assign(conn.presentation, changes.presentation);
        }
        this.rerenderConnector(conn);
        this.markDirty();
        this.events.emit("connector:change", conn);
    }

    getConnector(id: string): DiagramConnector | null
    {
        return this.doc.connectors.find(c => c.id === id) ?? null;
    }

    getConnectors(): DiagramConnector[]
    {
        return [...this.doc.connectors];
    }

    getConnectorsBetween(
        objA: string, objB: string
    ): DiagramConnector[]
    {
        return this.doc.connectors.filter(c =>
            (c.presentation.sourceId === objA
                && c.presentation.targetId === objB)
            || (c.presentation.sourceId === objB
                && c.presentation.targetId === objA)
        );
    }

    private rerenderConnector(conn: DiagramConnector): void
    {
        this.renderer.renderConnector(conn, this.doc.objects);
    }

    private rerenderAttachedConnectors(objectId: string): void
    {
        for (const conn of this.doc.connectors)
        {
            if (conn.presentation.sourceId === objectId
                || conn.presentation.targetId === objectId)
            {
                this.rerenderConnector(conn);
            }
        }
    }

    private buildConnector(
        partial: Partial<DiagramConnector>
    ): DiagramConnector
    {
        return {
            id: partial.id ?? generateId(),
            semantic: partial.semantic ?? {
                type: "connection",
                data: {
                    sourceRef: "",
                    targetRef: "",
                    direction: "forward",
                },
            },
            presentation: {
                sourceId: partial.presentation?.sourceId ?? "",
                targetId: partial.presentation?.targetId ?? "",
                sourcePort: partial.presentation?.sourcePort,
                targetPort: partial.presentation?.targetPort,
                sourcePoint: partial.presentation?.sourcePoint,
                targetPoint: partial.presentation?.targetPoint,
                waypoints: partial.presentation?.waypoints ?? [],
                routing: partial.presentation?.routing ?? "straight",
                style: partial.presentation?.style ?? {
                    color: "var(--theme-text-muted)",
                    width: 1.5,
                    endArrow: "classic",
                },
                labels: partial.presentation?.labels ?? [],
            },
        };
    }

    // ── Selection ──

    select(ids: string[]): void
    {
        this.selectedIds.clear();
        for (const id of ids) { this.selectedIds.add(id); }
        this.updateSelectionVisuals();
    }

    clearSelection(): void
    {
        this.clearSelectionInternal();
    }

    getSelectedObjectsPublic(): DiagramObject[]
    {
        return this.getSelectedObjects();
    }

    // ── Viewport ──

    zoomIn(): void
    {
        const svg = this.renderer.getSvgElement();
        const rect = svg.getBoundingClientRect();
        this.renderer.zoomAt(1 + ZOOM_STEP,
            rect.width / 2, rect.height / 2);
        this.emitViewportChange();
    }

    zoomOut(): void
    {
        const svg = this.renderer.getSvgElement();
        const rect = svg.getBoundingClientRect();
        this.renderer.zoomAt(1 - ZOOM_STEP,
            rect.width / 2, rect.height / 2);
        this.emitViewportChange();
    }

    zoomToFit(): void
    {
        this.renderer.zoomToFit(this.doc.objects);
        this.emitViewportChange();
    }

    getZoomLevel(): number
    {
        return this.renderer.getViewport().zoom;
    }

    setZoomLevel(level: number): void
    {
        const svg = this.renderer.getSvgElement();
        const rect = svg.getBoundingClientRect();
        const vp = this.renderer.getViewport();
        const factor = level / vp.zoom;
        this.renderer.zoomAt(factor,
            rect.width / 2, rect.height / 2);
        this.emitViewportChange();
    }

    getViewport(): ViewportState
    {
        return this.renderer.getViewport();
    }

    // ── Z-ordering ──

    bringToFront(ids: string[]): void
    {
        const maxZ = Math.max(
            ...this.doc.objects.map(o => o.presentation.zIndex)
        );
        for (const id of ids)
        {
            const obj = this.getObjectById(id);
            if (obj) { obj.presentation.zIndex = maxZ + 1; }
        }
        this.reRenderAll();
        this.markDirty();
    }

    sendToBack(ids: string[]): void
    {
        const minZ = Math.min(
            ...this.doc.objects.map(o => o.presentation.zIndex)
        );
        for (const id of ids)
        {
            const obj = this.getObjectById(id);
            if (obj) { obj.presentation.zIndex = minZ - 1; }
        }
        this.reRenderAll();
        this.markDirty();
    }

    bringForward(ids: string[]): void
    {
        for (const id of ids)
        {
            const obj = this.getObjectById(id);
            if (obj) { obj.presentation.zIndex += 1; }
        }
        this.reRenderAll();
        this.markDirty();
    }

    sendBackward(ids: string[]): void
    {
        for (const id of ids)
        {
            const obj = this.getObjectById(id);
            if (obj) { obj.presentation.zIndex -= 1; }
        }
        this.reRenderAll();
        this.markDirty();
    }

    // ── Grouping ──

    group(ids: string[]): DiagramObject
    {
        const children = ids.map(id => this.getObjectById(id))
            .filter(o => o !== null) as DiagramObject[];
        if (children.length < 2)
        {
            throw new Error(`${LOG_PREFIX} Need at least 2 objects to group`);
        }
        const bbox = this.computeGroupBBox(children);
        const groupObj = this.addObject({
            semantic: { type: "group", data: {} },
            presentation: {
                shape: "rectangle",
                bounds: bbox,
                rotation: 0,
                flipX: false,
                flipY: false,
                style: { fill: { type: "none" } },
                layer: DEFAULT_LAYER_ID,
                zIndex: this.doc.objects.length,
                locked: false,
                visible: true,
            },
        });
        for (const child of children)
        {
            child.presentation.groupId = groupObj.id;
        }
        this.markDirty();
        this.events.emit("object:change", groupObj);
        return groupObj;
    }

    ungroup(groupId: string): DiagramObject[]
    {
        const children = this.doc.objects.filter(
            o => o.presentation.groupId === groupId
        );
        for (const child of children)
        {
            child.presentation.groupId = undefined;
        }
        this.removeObjectInternal(groupId);
        this.markDirty();
        return children;
    }

    private computeGroupBBox(objects: DiagramObject[]): Rect
    {
        let minX = Infinity; let minY = Infinity;
        let maxX = -Infinity; let maxY = -Infinity;
        for (const obj of objects)
        {
            const b = obj.presentation.bounds;
            if (b.x < minX) { minX = b.x; }
            if (b.y < minY) { minY = b.y; }
            if (b.x + b.width > maxX) { maxX = b.x + b.width; }
            if (b.y + b.height > maxY) { maxY = b.y + b.height; }
        }
        return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }

    // ── Flip ──

    flipHorizontal(ids: string[]): void
    {
        for (const id of ids)
        {
            const obj = this.getObjectById(id);
            if (obj)
            {
                obj.presentation.flipX = !obj.presentation.flipX;
                this.rerenderObject(obj);
            }
        }
        this.markDirty();
    }

    flipVertical(ids: string[]): void
    {
        for (const id of ids)
        {
            const obj = this.getObjectById(id);
            if (obj)
            {
                obj.presentation.flipY = !obj.presentation.flipY;
                this.rerenderObject(obj);
            }
        }
        this.markDirty();
    }

    // ── Rotation ──

    rotateObjects(ids: string[], degrees: number): void
    {
        for (const id of ids)
        {
            const obj = this.getObjectById(id);
            if (obj)
            {
                obj.presentation.rotation =
                    (obj.presentation.rotation + degrees) % 360;
                this.rerenderObject(obj);
            }
        }
        this.updateSelectionVisuals();
        this.markDirty();
    }

    // ── Clipboard ──

    copy(): void
    {
        this.clipboard = this.getSelectedObjects()
            .map(o => this.cloneDocument(
                { objects: [o] } as unknown as DiagramDocument
            ));
    }

    cut(): void
    {
        this.copy();
        this.deleteSelected();
    }

    paste(): void
    {
        if (!this.clipboard || this.clipboard.length === 0) { return; }
        this.clearSelectionInternal();
        for (const snap of this.clipboard)
        {
            const src = (snap as unknown as { objects: DiagramObject[] })
                .objects[0];
            const obj = this.addObject({
                semantic: { ...src.semantic },
                presentation: {
                    ...src.presentation,
                    bounds: {
                        ...src.presentation.bounds,
                        x: src.presentation.bounds.x + 20,
                        y: src.presentation.bounds.y + 20,
                    },
                },
            });
            this.addToSelection(obj.id);
        }
    }

    duplicate(): void
    {
        this.copy();
        this.paste();
    }

    // ── Alignment ──

    alignObjects(ids: string[], alignment: AlignmentType): void
    {
        const objs = ids.map(id => this.getObjectById(id))
            .filter(o => o !== null) as DiagramObject[];
        if (objs.length < 2) { return; }
        const bbox = this.computeGroupBBox(objs);
        for (const obj of objs)
        {
            const b = obj.presentation.bounds;
            if (alignment === "left") { b.x = bbox.x; }
            if (alignment === "right")
            {
                b.x = bbox.x + bbox.width - b.width;
            }
            if (alignment === "center")
            {
                b.x = bbox.x + (bbox.width - b.width) / 2;
            }
            if (alignment === "top") { b.y = bbox.y; }
            if (alignment === "bottom")
            {
                b.y = bbox.y + bbox.height - b.height;
            }
            if (alignment === "middle")
            {
                b.y = bbox.y + (bbox.height - b.height) / 2;
            }
            this.rerenderObject(obj);
        }
        this.updateSelectionVisuals();
        this.markDirty();
    }

    distributeObjects(
        ids: string[], axis: "horizontal" | "vertical"
    ): void
    {
        const objs = ids.map(id => this.getObjectById(id))
            .filter(o => o !== null) as DiagramObject[];
        if (objs.length < 3) { return; }
        if (axis === "horizontal")
        {
            this.distributeH(objs);
        }
        else
        {
            this.distributeV(objs);
        }
        this.updateSelectionVisuals();
        this.markDirty();
    }

    private distributeH(objs: DiagramObject[]): void
    {
        objs.sort((a, b) =>
            a.presentation.bounds.x - b.presentation.bounds.x);
        const first = objs[0].presentation.bounds;
        const last = objs[objs.length - 1].presentation.bounds;
        const totalW = objs.reduce(
            (s, o) => s + o.presentation.bounds.width, 0
        );
        const gap = (last.x + last.width - first.x - totalW)
            / (objs.length - 1);
        let cx = first.x + first.width + gap;
        for (let i = 1; i < objs.length - 1; i++)
        {
            objs[i].presentation.bounds.x = cx;
            this.rerenderObject(objs[i]);
            cx += objs[i].presentation.bounds.width + gap;
        }
    }

    private distributeV(objs: DiagramObject[]): void
    {
        objs.sort((a, b) =>
            a.presentation.bounds.y - b.presentation.bounds.y);
        const first = objs[0].presentation.bounds;
        const last = objs[objs.length - 1].presentation.bounds;
        const totalH = objs.reduce(
            (s, o) => s + o.presentation.bounds.height, 0
        );
        const gap = (last.y + last.height - first.y - totalH)
            / (objs.length - 1);
        let cy = first.y + first.height + gap;
        for (let i = 1; i < objs.length - 1; i++)
        {
            objs[i].presentation.bounds.y = cy;
            this.rerenderObject(objs[i]);
            cy += objs[i].presentation.bounds.height + gap;
        }
    }

    // ── Layers ──

    addLayer(partial: Partial<Layer>): Layer
    {
        const layer: Layer = {
            id: partial.id ?? generateId(),
            name: partial.name ?? `Layer ${this.doc.layers.length + 1}`,
            visible: partial.visible ?? true,
            locked: partial.locked ?? false,
            printable: partial.printable ?? true,
            opacity: partial.opacity ?? 1,
            order: partial.order ?? this.doc.layers.length,
        };
        this.doc.layers.push(layer);
        this.renderer.ensureLayerEl(layer.id, layer.order);
        this.markDirty();
        this.events.emit("layer:add", layer);
        return layer;
    }

    removeLayer(id: string): void
    {
        if (id === DEFAULT_LAYER_ID) { return; }
        const idx = this.doc.layers.findIndex(l => l.id === id);
        if (idx < 0) { return; }
        this.doc.layers.splice(idx, 1);
        this.renderer.removeLayerEl(id);
        for (const obj of this.doc.objects)
        {
            if (obj.presentation.layer === id)
            {
                obj.presentation.layer = DEFAULT_LAYER_ID;
                this.rerenderObject(obj);
            }
        }
        this.markDirty();
        this.events.emit("layer:remove", id);
    }

    getLayers(): Layer[]
    {
        return [...this.doc.layers];
    }

    // ── History ──

    undo(): void
    {
        if (this.undoStack.undo())
        {
            this.updateSelectionVisuals();
            this.events.emit("history:undo");
        }
    }

    redo(): void
    {
        if (this.undoStack.redo())
        {
            this.updateSelectionVisuals();
            this.events.emit("history:redo");
        }
    }

    canUndo(): boolean { return this.undoStack.canUndo(); }
    canRedo(): boolean { return this.undoStack.canRedo(); }

    // ── Tools ──

    setActiveTool(name: string): void
    {
        this.toolManager.setActive(name);
        this.events.emit("tool:change", name);
    }

    getActiveTool(): string
    {
        return this.toolManager.getActiveName();
    }

    setDrawShape(type: string): void
    {
        const tool = this.toolManager.getTool("draw");
        if (tool && tool instanceof DrawTool)
        {
            (tool as DrawTool).setShapeType(type);
        }
    }

    // ── Stencils ──

    loadStencilPack(name: string): void
    {
        const packs: Record<string, (r: ShapeRegistry) => void> = {
            flowchart: registerFlowchartPack,
            uml: registerUmlPack,
            bpmn: registerBpmnPack,
            er: registerErPack,
            network: registerNetworkPack,
        };
        const fn = packs[name];
        if (fn)
        {
            fn(this.shapeRegistry);
            console.log(LOG_PREFIX, "Loaded stencil pack:", name);
        }
        else
        {
            console.warn(LOG_PREFIX,
                "Unknown stencil pack:", name);
        }
    }

    registerStencilPack(
        name: string, shapes: ShapeDefinition[]
    ): void
    {
        for (const shape of shapes)
        {
            this.shapeRegistry.register(shape);
        }
        console.log(LOG_PREFIX,
            `Registered stencil pack '${name}':`,
            shapes.length, "shapes");
    }

    getAvailableShapes(): ShapeDefinition[]
    {
        return this.shapeRegistry.getAll();
    }

    // ── Persistence ──

    toJSON(indent?: number): string
    {
        this.doc.metadata.modified = new Date().toISOString();
        return JSON.stringify(this.doc, null, indent);
    }

    fromJSON(json: string): void
    {
        const doc = JSON.parse(json) as DiagramDocument;
        this.setDocument(doc);
    }

    isDirty(): boolean { return this.dirty; }

    markClean(): void
    {
        this.dirty = false;
        this.changeCount = 0;
        this.events.emit("dirty:change", false);
    }

    getChangeCount(): number { return this.changeCount; }

    // ── Layout ──

    private layoutRegistry: Map<string, LayoutFunction> = new Map();

    registerLayout(
        name: string, fn: LayoutFunction
    ): void
    {
        this.layoutRegistry.set(name, fn);
    }

    applyLayout(
        name: string, options?: Record<string, unknown>
    ): void
    {
        const fn = this.layoutRegistry.get(name);
        if (fn)
        {
            this.applyLayoutFunction(fn, options ?? {});
            return;
        }
        if (name === "force")
        {
            this.applyForceLayout(options ?? {});
            return;
        }
        if (name === "grid")
        {
            this.applyGridLayout(options ?? {});
            return;
        }
        console.warn(LOG_PREFIX, "Unknown layout:", name);
    }

    private applyLayoutFunction(
        fn: LayoutFunction,
        options: Record<string, unknown>
    ): void
    {
        const result = fn(
            this.doc.objects, this.doc.connectors, options
        );
        if (result instanceof Promise)
        {
            (result as Promise<Map<string, Point>>).then(
                (positions) => this.applyPositions(positions)
            );
        }
        else
        {
            this.applyPositions(result as Map<string, Point>);
        }
    }

    private applyPositions(positions: Map<string, Point>): void
    {
        for (const [id, pos] of positions)
        {
            const obj = this.getObjectById(id);
            if (obj)
            {
                obj.presentation.bounds.x = pos.x;
                obj.presentation.bounds.y = pos.y;
                this.rerenderObject(obj);
            }
        }
        for (const conn of this.doc.connectors)
        {
            this.rerenderConnector(conn);
        }
        this.updateSelectionVisuals();
        this.markDirty();
    }

    private applyForceLayout(
        _options: Record<string, unknown>
    ): void
    {
        const objects = this.doc.objects.filter(
            o => o.presentation.visible
        );
        const positions = new Map<string, Point>();
        const n = objects.length;
        for (let i = 0; i < n; i++)
        {
            const angle = (2 * Math.PI * i) / n;
            const radius = Math.max(200, n * 30);
            positions.set(objects[i].id, {
                x: 400 + radius * Math.cos(angle),
                y: 300 + radius * Math.sin(angle),
            });
        }
        this.applyPositions(positions);
    }

    private applyGridLayout(
        options: Record<string, unknown>
    ): void
    {
        const cols = (options.columns as number) ?? 4;
        const gap = (options.gap as number) ?? 40;
        const objects = this.doc.objects.filter(
            o => o.presentation.visible
        );
        const positions = new Map<string, Point>();
        for (let i = 0; i < objects.length; i++)
        {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const b = objects[i].presentation.bounds;
            positions.set(objects[i].id, {
                x: 40 + col * (b.width + gap),
                y: 40 + row * (b.height + gap),
            });
        }
        this.applyPositions(positions);
    }

    // ── Export ──

    exportSVG(): string
    {
        const svg = this.renderer.getSvgElement();
        return new XMLSerializer().serializeToString(svg);
    }

    exportJSON(): string
    {
        return this.toJSON(2);
    }

    // ── Find and Replace ──

    findText(
        query: string,
        options?: { caseSensitive?: boolean }
    ): { objectId: string; text: string }[]
    {
        const results: { objectId: string; text: string }[] = [];
        const q = options?.caseSensitive
            ? query : query.toLowerCase();
        for (const obj of this.doc.objects)
        {
            const text = this.extractText(obj);
            const compare = options?.caseSensitive
                ? text : text.toLowerCase();
            if (compare.includes(q))
            {
                results.push({ objectId: obj.id, text });
            }
        }
        return results;
    }

    replaceText(
        query: string, replacement: string,
        options?: { caseSensitive?: boolean }
    ): number
    {
        let count = 0;
        for (const obj of this.doc.objects)
        {
            const tc = obj.presentation.textContent;
            if (!tc?.runs) { continue; }
            for (const run of tc.runs)
            {
                if (!("text" in run)) { continue; }
                const tr = run as TextRun;
                const flags = options?.caseSensitive ? "g" : "gi";
                const regex = new RegExp(
                    query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
                    flags
                );
                const newText = tr.text.replace(regex, replacement);
                if (newText !== tr.text)
                {
                    count++;
                    tr.text = newText;
                }
            }
            this.rerenderObject(obj);
        }
        if (count > 0) { this.markDirty(); }
        return count;
    }

    private extractText(obj: DiagramObject): string
    {
        const tc = obj.presentation.textContent;
        if (!tc?.runs) { return ""; }
        return tc.runs
            .filter(r => "text" in r)
            .map(r => (r as TextRun).text)
            .join("");
    }

    // ── Format Painter ──

    private formatClipboard: ObjectStyle | null = null;

    pickFormat(objectId: string): void
    {
        const obj = this.getObjectById(objectId);
        if (!obj) { return; }
        this.formatClipboard = JSON.parse(
            JSON.stringify(obj.presentation.style)
        );
        console.log(LOG_PREFIX, "Format picked from:", objectId);
    }

    applyFormat(targetIds: string[]): void
    {
        if (!this.formatClipboard) { return; }
        for (const id of targetIds)
        {
            const obj = this.getObjectById(id);
            if (!obj) { continue; }
            obj.presentation.style = JSON.parse(
                JSON.stringify(this.formatClipboard)
            );
            this.rerenderObject(obj);
        }
        this.markDirty();
    }

    clearFormat(): void
    {
        this.formatClipboard = null;
    }

    hasFormat(): boolean
    {
        return this.formatClipboard !== null;
    }

    // ── Spatial Queries ──

    findObjectsInRect(rect: Rect): DiagramObject[]
    {
        return this.doc.objects.filter(o =>
        {
            const b = o.presentation.bounds;
            return rectsIntersect(b, rect);
        });
    }

    findObjectsAtPoint(point: Point): DiagramObject[]
    {
        return this.doc.objects.filter(o =>
        {
            const b = o.presentation.bounds;
            return rectContainsPoint(b, point);
        });
    }

    // ── Spacing Guides ──

    private computeSpacingGuides(
        movingBounds: Rect
    ): AlignmentGuide[]
    {
        const guides: AlignmentGuide[] = [];
        const others = this.doc.objects.filter(
            o => !this.selectedIds.has(o.id) && o.presentation.visible
        );
        if (others.length < 2) { return guides; }
        const sortedX = [...others].sort(
            (a, b) => a.presentation.bounds.x - b.presentation.bounds.x
        );
        for (let i = 0; i < sortedX.length - 1; i++)
        {
            const aB = sortedX[i].presentation.bounds;
            const bB = sortedX[i + 1].presentation.bounds;
            const gap = bB.x - (aB.x + aB.width);
            if (gap <= 0) { continue; }
            const movingGapLeft = movingBounds.x
                - (aB.x + aB.width);
            const movingGapRight = bB.x
                - (movingBounds.x + movingBounds.width);
            if (Math.abs(movingGapLeft - gap) < SNAP_THRESHOLD
                || Math.abs(movingGapRight - gap) < SNAP_THRESHOLD)
            {
                const y = Math.min(
                    aB.y, bB.y, movingBounds.y
                );
                guides.push({
                    type: "spacing",
                    lines: [
                        {
                            x1: aB.x + aB.width, y1: y - 15,
                            x2: bB.x, y2: y - 15,
                        },
                    ],
                    label: {
                        text: `${Math.round(gap)}`,
                        position: {
                            x: aB.x + aB.width + gap / 2,
                            y: y - 20,
                        },
                    },
                });
            }
        }
        return guides;
    }

    // ── Control Points ──

    getControlPoints(
        objectId: string
    ): { id: string; position: Point; parameter: string }[]
    {
        const obj = this.getObjectById(objectId);
        if (!obj) { return []; }
        const params = obj.presentation.parameters ?? {};
        const result: { id: string; position: Point; parameter: string }[] = [];
        const b = obj.presentation.bounds;
        for (const [key, val] of Object.entries(params))
        {
            if (typeof val === "number")
            {
                result.push({
                    id: key,
                    position: { x: b.x + val, y: b.y },
                    parameter: key,
                });
            }
            else if (val && typeof val === "object"
                && "x" in val && "y" in val)
            {
                result.push({
                    id: key,
                    position: val as Point,
                    parameter: key,
                });
            }
        }
        return result;
    }

    setControlPointValue(
        objectId: string,
        parameter: string,
        value: number | Point
    ): void
    {
        const obj = this.getObjectById(objectId);
        if (!obj) { return; }
        if (!obj.presentation.parameters)
        {
            obj.presentation.parameters = {};
        }
        obj.presentation.parameters[parameter] = value;
        this.rerenderObject(obj);
        this.markDirty();
    }

    // ── Boolean Path Operations (stubs — full implementation requires SVG path algebra) ──

    booleanUnion(idA: string, idB: string): DiagramObject | null
    {
        return this.booleanOp(idA, idB, "union");
    }

    booleanSubtract(idA: string, idB: string): DiagramObject | null
    {
        return this.booleanOp(idA, idB, "subtract");
    }

    booleanIntersect(idA: string, idB: string): DiagramObject | null
    {
        return this.booleanOp(idA, idB, "intersect");
    }

    private booleanOp(
        idA: string, idB: string, op: string
    ): DiagramObject | null
    {
        const a = this.getObjectById(idA);
        const b = this.getObjectById(idB);
        if (!a || !b) { return null; }
        const bA = a.presentation.bounds;
        const bB = b.presentation.bounds;
        const combined: Rect = {
            x: Math.min(bA.x, bB.x),
            y: Math.min(bA.y, bB.y),
            width: Math.max(bA.x + bA.width, bB.x + bB.width)
                - Math.min(bA.x, bB.x),
            height: Math.max(bA.y + bA.height, bB.y + bB.height)
                - Math.min(bA.y, bB.y),
        };
        this.removeObjectInternal(idA);
        this.removeObjectInternal(idB);
        const result = this.addObject({
            semantic: {
                type: "compound",
                data: { operation: op },
            },
            presentation: {
                shape: "rectangle",
                bounds: combined,
            },
        });
        this.selectedIds.clear();
        this.selectedIds.add(result.id);
        this.updateSelectionVisuals();
        return result;
    }

    // ── PDF Export ──

    exportPDF(): Promise<Blob>
    {
        const svgStr = this.exportSVG();
        const htmlPage = `<!DOCTYPE html><html><head>
            <style>@page{margin:10mm;size:landscape}
            body{margin:0}svg{width:100%;height:auto}</style>
            </head><body>${svgStr}</body></html>`;
        return new Promise((resolve) =>
        {
            const blob = new Blob([htmlPage],
                { type: "text/html;charset=utf-8" });
            resolve(blob);
        });
    }

    // ── Graph Analysis ──

    getShortestPath(
        fromId: string, toId: string
    ): string[]
    {
        const adj = this.buildAdjacencyList();
        const visited = new Set<string>();
        const queue: { id: string; path: string[] }[] =
            [{ id: fromId, path: [fromId] }];
        while (queue.length > 0)
        {
            const current = queue.shift()!;
            if (current.id === toId) { return current.path; }
            if (visited.has(current.id)) { continue; }
            visited.add(current.id);
            const neighbors = adj.get(current.id) ?? [];
            for (const n of neighbors)
            {
                if (!visited.has(n))
                {
                    queue.push({
                        id: n,
                        path: [...current.path, n],
                    });
                }
            }
        }
        return [];
    }

    getConnectedComponents(): string[][]
    {
        const adj = this.buildAdjacencyList();
        const visited = new Set<string>();
        const components: string[][] = [];
        for (const obj of this.doc.objects)
        {
            if (visited.has(obj.id)) { continue; }
            const component: string[] = [];
            const stack = [obj.id];
            while (stack.length > 0)
            {
                const id = stack.pop()!;
                if (visited.has(id)) { continue; }
                visited.add(id);
                component.push(id);
                const neighbors = adj.get(id) ?? [];
                for (const n of neighbors) { stack.push(n); }
            }
            components.push(component);
        }
        return components;
    }

    getIncomingConnectors(
        objectId: string
    ): DiagramConnector[]
    {
        return this.doc.connectors.filter(
            c => c.presentation.targetId === objectId
        );
    }

    getOutgoingConnectors(
        objectId: string
    ): DiagramConnector[]
    {
        return this.doc.connectors.filter(
            c => c.presentation.sourceId === objectId
        );
    }

    private buildAdjacencyList(): Map<string, string[]>
    {
        const adj = new Map<string, string[]>();
        for (const obj of this.doc.objects)
        {
            if (!adj.has(obj.id)) { adj.set(obj.id, []); }
        }
        for (const conn of this.doc.connectors)
        {
            const s = conn.presentation.sourceId;
            const t = conn.presentation.targetId;
            if (!adj.has(s)) { adj.set(s, []); }
            if (!adj.has(t)) { adj.set(t, []); }
            adj.get(s)!.push(t);
            adj.get(t)!.push(s);
        }
        return adj;
    }

    // ── Collapse/Expand Groups ──

    collapseGroup(groupId: string): void
    {
        const children = this.doc.objects.filter(
            o => o.presentation.groupId === groupId
        );
        for (const child of children)
        {
            child.presentation.visible = false;
            this.renderer.removeObjectEl(child.id);
        }
        this.markDirty();
    }

    expandGroup(groupId: string): void
    {
        const children = this.doc.objects.filter(
            o => o.presentation.groupId === groupId
        );
        for (const child of children)
        {
            child.presentation.visible = true;
            this.rerenderObject(child);
        }
        this.markDirty();
    }

    isGroupCollapsed(groupId: string): boolean
    {
        const children = this.doc.objects.filter(
            o => o.presentation.groupId === groupId
        );
        return children.length > 0
            && children.every(c => !c.presentation.visible);
    }

    // ── Lock/Unlock, Visibility ──

    lockObjects(ids: string[]): void
    {
        for (const id of ids)
        {
            const obj = this.getObjectById(id);
            if (obj) { obj.presentation.locked = true; }
        }
        this.markDirty();
    }

    unlockObjects(ids: string[]): void
    {
        for (const id of ids)
        {
            const obj = this.getObjectById(id);
            if (obj) { obj.presentation.locked = false; }
        }
        this.markDirty();
    }

    setObjectVisible(ids: string[], visible: boolean): void
    {
        for (const id of ids)
        {
            const obj = this.getObjectById(id);
            if (!obj) { continue; }
            obj.presentation.visible = visible;
            if (visible) { this.rerenderObject(obj); }
            else { this.renderer.removeObjectEl(id); }
        }
        this.markDirty();
    }

    setObjectOpacity(ids: string[], opacity: number): void
    {
        for (const id of ids)
        {
            const obj = this.getObjectById(id);
            if (!obj) { continue; }
            obj.presentation.style.opacity = clamp(opacity, 0, 1);
            this.rerenderObject(obj);
        }
        this.markDirty();
    }

    // ── Comments ──

    addComment(
        anchor: Comment["anchor"],
        content: string,
        userId: string,
        userName: string
    ): Comment
    {
        const now = new Date().toISOString();
        const comment: Comment = {
            id: generateId(),
            anchor,
            thread: [{
                id: generateId(),
                userId, userName, content,
                timestamp: now, edited: false,
            }],
            status: "open",
            created: now,
            updated: now,
        };
        this.doc.comments.push(comment);
        this.markDirty();
        this.events.emit("comment:add", comment);
        return comment;
    }

    getComments(): Comment[] { return [...this.doc.comments]; }

    getCommentsForObject(objectId: string): Comment[]
    {
        return this.doc.comments.filter(
            c => c.anchor.entityId === objectId
        );
    }

    resolveComment(commentId: string): void
    {
        const c = this.doc.comments.find(x => x.id === commentId);
        if (c) { c.status = "resolved"; this.markDirty(); }
    }

    // ── Deep Linking ──

    navigateToURI(uri: string): boolean
    {
        const parts = uri.replace("diagram://", "").split("/");
        if (parts.length < 3) { return false; }
        const entityType = parts[1];
        const entityId = parts[2];
        if (entityType === "object")
        {
            const obj = this.getObjectById(entityId);
            if (!obj) { return false; }
            this.clearSelectionInternal();
            this.addToSelection(entityId);
            this.renderer.zoomToFit([obj], 100);
            return true;
        }
        return false;
    }

    exportPNG(options?: {
        scale?: number; background?: string
    }): Promise<Blob>
    {
        const scale = options?.scale ?? 2;
        const bg = options?.background ?? "transparent";
        const svgStr = this.exportSVG();
        const svgBlob = new Blob([svgStr],
            { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(svgBlob);
        const img = new Image();

        return new Promise((resolve, reject) =>
        {
            img.onload = () =>
            {
                const canvas = document.createElement("canvas");
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                const ctx2d = canvas.getContext("2d");
                if (!ctx2d) { reject(new Error("No 2d context")); return; }
                if (bg !== "transparent")
                {
                    ctx2d.fillStyle = bg;
                    ctx2d.fillRect(
                        0, 0, canvas.width, canvas.height
                    );
                }
                ctx2d.scale(scale, scale);
                ctx2d.drawImage(img, 0, 0);
                canvas.toBlob((blob) =>
                {
                    URL.revokeObjectURL(url);
                    if (blob) { resolve(blob); }
                    else { reject(new Error("toBlob failed")); }
                }, "image/png");
            };
            img.onerror = () =>
            {
                URL.revokeObjectURL(url);
                reject(new Error("Image load failed"));
            };
            img.src = url;
        });
    }

    // ── Events ──

    on(event: string, handler: EventHandler): void
    {
        this.events.on(event, handler);
    }

    off(event: string, handler: EventHandler): void
    {
        this.events.off(event, handler);
    }

    // ── Lifecycle ──

    resize(): void
    {
        // SVG auto-sizes via width/height 100%
    }

    getElement(): HTMLElement
    {
        return this.renderer.getSvgElement() as unknown as HTMLElement;
    }

    destroy(): void
    {
        if (this.destroyed) { return; }
        this.destroyed = true;
        if (this.themeObserver)
        {
            this.themeObserver.disconnect();
            this.themeObserver = null;
        }
        this.renderer.destroy();
        console.log(LOG_PREFIX, "Destroyed:", this.instanceId);
    }

    // ── Private helpers ──

    private buildObject(
        partial: DiagramObjectInput
    ): DiagramObject
    {
        const id = partial.id ?? generateId();
        const sem = partial.semantic ?? {
            type: "generic", data: {},
        };
        const pres = partial.presentation ?? {
            shape: "rectangle",
            bounds: { x: 100, y: 100, width: 160, height: 100 },
            rotation: 0,
            flipX: false,
            flipY: false,
            style: {},
            layer: DEFAULT_LAYER_ID,
            zIndex: this.doc.objects.length,
            locked: false,
            visible: true,
        };
        return {
            id,
            semantic: sem as SemanticData,
            presentation: {
                shape: pres.shape ?? "rectangle",
                bounds: pres.bounds ?? {
                    x: 100, y: 100, width: 160, height: 100,
                },
                rotation: pres.rotation ?? 0,
                flipX: pres.flipX ?? false,
                flipY: pres.flipY ?? false,
                style: pres.style ?? {
                    fill: { type: "solid", color: "var(--theme-surface-raised-bg)" },
                    stroke: { color: "var(--theme-border-color)", width: 1.5 },
                },
                textContent: pres.textContent,
                layer: pres.layer ?? DEFAULT_LAYER_ID,
                zIndex: pres.zIndex ?? this.doc.objects.length,
                locked: pres.locked ?? false,
                visible: pres.visible ?? true,
                groupId: pres.groupId,
                parameters: pres.parameters,
                renderStyle: pres.renderStyle,
                image: pres.image,
                dataBindings: pres.dataBindings,
                anchor: pres.anchor,
            },
        };
    }
}

// ============================================================================
// S19: FACTORY FUNCTION & GLOBAL EXPORTS
// ============================================================================

export function createDiagramEngine(
    container: string | HTMLElement,
    options: DiagramEngineOptions = {}
): DiagramEngineImpl
{
    let el: HTMLElement;
    if (typeof container === "string")
    {
        const found = document.getElementById(container);
        if (!found)
        {
            throw new Error(
                `${LOG_PREFIX} Container not found: ${container}`
            );
        }
        el = found;
    }
    else
    {
        el = container;
    }
    return new DiagramEngineImpl(el, options);
}

(window as unknown as Record<string, unknown>)["DiagramEngine"] =
    DiagramEngineImpl;
(window as unknown as Record<string, unknown>)["createDiagramEngine"] =
    createDiagramEngine;
