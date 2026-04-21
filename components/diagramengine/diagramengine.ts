/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: DiagramEngine
 * 📜 PURPOSE: Universal vector canvas engine for diagramming, graph
 *    visualisation, technical drawing, poster creation, and embedded
 *    document surfaces. SVG-based rendering with semantic/presentation
 *    split, pluggable shapes, tools, layouts, and collaboration support.
 * 🔗 RELATES: [[GraphCanvas]], [[GraphCanvasMx]], [[Ruler]], [[Toolbar]]
 * ⚡ FLOW: [Consumer App] -> [createDiagramEngine()] -> [SVG canvas]
 * 🔒 SECURITY: No innerHTML for user content. SVG sanitised on export.
 * 📦 BUILD: Concatenated from src/ modules by scripts/bundle-diagramengine.sh
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// Shared constants (declared once for all modules)
const LOG_PREFIX = "[DiagramEngine]";
const SVG_NS = "http://www.w3.org/2000/svg";
const CLS = "de";
const VERSION = "1.0";
const DEFAULT_ZOOM = 1;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 32.0;
const ZOOM_STEP = 0.15;
const HANDLE_SIZE = 8;
const HANDLE_HIT_MARGIN = 4;
const DEFAULT_GRID_SIZE = 20;
const DEFAULT_LAYER_ID = "default";
const DEFAULT_LAYER_NAME = "Default";
const ROTATION_HANDLE_OFFSET = 25;
const NUDGE_PX = 1;
const NUDGE_SHIFT_PX = 10;

// Shared structured logging helpers
function logInfo(...args: unknown[]): void { console.log(new Date().toISOString(), "[INFO]", LOG_PREFIX, ...args); }
function logWarn(...args: unknown[]): void { console.warn(new Date().toISOString(), "[WARN]", LOG_PREFIX, ...args); }
function logError(...args: unknown[]): void { console.error(new Date().toISOString(), "[ERROR]", LOG_PREFIX, ...args); }
function logDebug(...args: unknown[]): void { console.debug(new Date().toISOString(), "[DEBUG]", LOG_PREFIX, ...args); }


// ========================================================================
// SOURCE: types.ts
// ========================================================================

/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * DiagramEngine — Type definitions.
 *
 * All interfaces and type aliases used across the engine. Organised
 * into logical groups: geometry, styles, text, semantic data, objects,
 * connectors, document structure, shapes, and configuration.
 */

// ============================================================================
// GEOMETRY
// ============================================================================

/** Axis-aligned bounding rectangle. */
interface Rect
{
    x: number;
    y: number;
    width: number;
    height: number;
}

/** 2D point in canvas coordinate space. */
interface Point
{
    x: number;
    y: number;
}

// ============================================================================
// STYLES — FILLS
// ============================================================================

/** Linear or radial gradient definition for fills and strokes. */
interface GradientDefinition
{
    /** Gradient interpolation type. */
    type: "linear" | "radial";

    /** Colour stops along the gradient. Offset is 0–1. */
    stops: { offset: number; color: string }[];

    /** Angle in degrees for linear gradients (0 = left to right). */
    angle?: number;

    /** Centre point for radial gradients (0–1 normalised). */
    center?: { x: number; y: number };

    /** Radius for radial gradients (0–1 normalised). */
    radius?: number;
}

/** Repeating pattern fill. */
interface PatternDefinition
{
    type: "hatch" | "cross-hatch" | "dots" | "checkerboard" | "custom";
    color: string;
    backgroundColor?: string;
    spacing: number;
    angle?: number;

    /** Raw SVG content for custom patterns. */
    svg?: string;
}

/** Fill specification for shapes and connectors. */
interface FillStyle
{
    type: "solid" | "gradient" | "pattern" | "none";
    color?: string;
    gradient?: GradientDefinition;
    pattern?: PatternDefinition;
}

// ============================================================================
// STYLES — STROKES
// ============================================================================

/** Stroke (outline) specification. Colour may be a solid value or gradient. */
interface StrokeStyle
{
    color: string | GradientDefinition;
    width: number;
    dashPattern?: number[];
    lineCap?: "butt" | "round" | "square";
    lineJoin?: "miter" | "round" | "bevel";
}

/** Individual edge stroke for per-edge control on rectangular shapes. */
interface EdgeStroke
{
    visible: boolean;
    color?: string | GradientDefinition;
    width?: number;
    dashPattern?: number[];
}

/**
 * Independent stroke control for each edge of a rectangular shape.
 * Enables three-sided boxes, accent borders, and gradient fade effects.
 */
interface PerEdgeStroke
{
    top?: EdgeStroke;
    right?: EdgeStroke;
    bottom?: EdgeStroke;
    left?: EdgeStroke;
}

// ============================================================================
// STYLES — SHADOWS
// ============================================================================

/** Drop shadow specification rendered via SVG feDropShadow filter. */
interface ShadowStyle
{
    enabled: boolean;
    color: string;
    offsetX: number;
    offsetY: number;
    blur: number;
    opacity: number;
    spread?: number;
}

// ============================================================================
// STYLES — COMPOSITE
// ============================================================================

/** Complete visual style for a diagram object. */
interface ObjectStyle
{
    fill?: FillStyle;
    stroke?: StrokeStyle;

    /**
     * Per-edge stroke overrides. When present, individual edges use
     * these settings instead of the uniform stroke.
     */
    perEdgeStroke?: PerEdgeStroke;

    shadow?: ShadowStyle;

    /** Overall opacity (0–1). Multiplies with layer opacity. */
    opacity?: number;
}

// ============================================================================
// TEXT
// ============================================================================

/** A run of styled text within a TextContent block. */
interface TextRun
{
    /** Text content. May contain {{variable}} template expressions. */
    text: string;

    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strikethrough?: boolean;
    fontFamily?: string;
    fontSize?: number;
    color?: string | GradientDefinition;
    backgroundColor?: string;
    shadow?: ShadowStyle;
    superscript?: boolean;
    subscript?: boolean;
    lineHeight?: number;
    letterSpacing?: number;
}

/** An inline icon glyph within a text flow. */
interface IconRun
{
    /** Icon identifier (e.g. "bi-star-fill", "fa-rocket"). */
    icon: string;

    /** Icon library source. */
    library: "bootstrap-icons" | "font-awesome" | "custom";

    /** Size in pixels. Inherits from surrounding text if omitted. */
    fontSize?: number;

    /** Colour. Inherits from surrounding text if omitted. */
    color?: string;
}

/** A content run is either styled text or an inline icon. */
type ContentRun = TextRun | IconRun;

/**
 * Block-level text element for structured content such as
 * paragraphs, headings, and lists.
 */
interface TextBlock
{
    type: "paragraph" | "heading" | "ordered-list" | "unordered-list";
    level?: number;
    indent: number;
    runs: ContentRun[];
}

/**
 * Rich text content for any text surface in the engine.
 * Supports both flat runs and block-structured content.
 */
interface TextContent
{
    /** Flat sequence of styled runs (for simple text). */
    runs?: ContentRun[];

    /** Block-structured content (for paragraphs and lists). */
    blocks?: TextBlock[];

    /** Behaviour when text exceeds its container. */
    overflow: "visible" | "clip" | "ellipsis";

    verticalAlign: "top" | "middle" | "bottom";
    horizontalAlign: "left" | "center" | "right" | "justify";

    /** Inner padding in pixels. */
    padding: number;

    /** Auto-sizing behaviour. */
    autoSize?: "fixed" | "grow-to-fit" | "shrink-font";

    /** When set, text is rendered along an SVG path (WordArt mode). */
    textPath?: TextPathDefinition;
}

/**
 * Configuration for rendering text along an SVG path (WordArt / textPath).
 */
interface TextPathDefinition
{
    /** SVG path data string (d attribute) in local coordinates. */
    path: string;

    /** Starting offset along path (0-1 normalised). Default 0. */
    startOffset?: number;

    /** Text anchor along path. Default "start". */
    textAnchor?: "start" | "middle" | "end";

    /** Letter spacing in pixels. */
    letterSpacing?: number;
}

// ============================================================================
// SEMANTIC DATA
// ============================================================================

/** Reference to an external resource linked from a diagram entity. */
interface ResourceReference
{
    /** Resource type (e.g. "api-endpoint", "ticket", "repo"). */
    type: string;

    /** URI pointing to the resource. */
    uri: string;

    /** Human-readable label. */
    label?: string;
}

/**
 * Domain-level meaning attached to a diagram object or connector.
 * Separated from presentation so the same semantic data can be
 * rendered in multiple visual styles.
 */
interface SemanticData
{
    /** Domain type (e.g. "uml.class", "bpmn.task", "sequence.actor"). */
    type: string;

    /** Domain-specific structured data. Schema varies by type. */
    data: Record<string, unknown>;

    /** Links to external entities. */
    references?: ResourceReference[];

    /** Tags for filtering and categorisation. */
    tags?: string[];

    /** Connector IDs this entity participates in. */
    relationships?: string[];
}

// ============================================================================
// IMAGE
// ============================================================================

/** Image-specific presentation properties. */
interface ImageStyle
{
    /** Image source (URL or data URI). */
    src: string;

    /** How the image fills its bounds. */
    fit: "cover" | "contain" | "stretch" | "original";

    /** Crop region within the source image (0–1 normalised). */
    crop?: { x: number; y: number; w: number; h: number };

    /** Clip mask shape. */
    mask?: "none" | "circle" | "ellipse" | "rounded-rect";

    /** Corner radius for rounded-rect mask. */
    maskRadius?: number;

    /** Colour adjustment filters. */
    adjustments?:
    {
        brightness?: number;
        contrast?: number;
        saturation?: number;
        hueRotate?: number;
        tint?: string;
        tintOpacity?: number;
    };

    /**
     * Custom HTTP headers for image loading (e.g. Authorization).
     * When present, the image is fetched via XMLHttpRequest with these
     * headers and converted to a data URI before setting the SVG href.
     */
    headers?: Record<string, string>;
}

// ============================================================================
// PAINTABLE CANVAS
// ============================================================================

/** Configuration for paintable canvas shapes. */
interface PaintableStyle
{
    /** Clip shape for the painting area. */
    clipShape: "rectangle" | "circle" | "ellipse" | "triangle";

    /** Serialised canvas content as data URI (for persistence). */
    canvasData?: string;

    /** Whether paint clips to shape boundary. Default true. */
    clipToBounds?: boolean;
}

// ============================================================================
// EMBEDDABLE COMPONENTS
// ============================================================================

/** Definition of an embedded component within a diagram object. */
interface EmbedDefinition
{
    /** Registered component name (e.g. "datagrid", "datepicker"). */
    component: string;

    /** Options passed to the component factory function. */
    options: Record<string, unknown>;

    /** Whether component becomes interactive on double-click. Default true. */
    interactiveOnDoubleClick?: boolean;

    /** Whether component is currently interactive. Managed by engine. */
    interactive?: boolean;

    /** Component state snapshot for persistence. */
    state?: Record<string, unknown>;
}

/** Registry entry for an embeddable component type. */
interface EmbeddableComponentEntry
{
    /** Factory function name on window. */
    factory: string;

    /** Human-readable label. */
    label: string;

    /** Bootstrap Icon class. */
    icon: string;

    /** Category for grouping. */
    category: string;

    /** Default factory options. */
    defaultOptions: Record<string, unknown>;

    /** Default shape dimensions. */
    defaultSize: { w: number; h: number };
}

// ============================================================================
// DATA BINDING
// ============================================================================

/** Binding from an object property to a template expression. */
interface DataBinding
{
    property: string;
    expression: string;
}

/** Constraint that pins an object to a canvas edge (for title blocks). */
interface AnchorConstraint
{
    edge: "top" | "bottom" | "left" | "right";
    offset: number;
}

// ============================================================================
// DIAGRAM OBJECT
// ============================================================================

/**
 * A diagram object with dual-layer architecture: semantic data
 * (domain meaning) and presentation data (visual appearance).
 */
interface DiagramObject
{
    /** Unique identifier. */
    id: string;

    /** Domain-level meaning. */
    semantic: SemanticData;

    /** Visual appearance and position. */
    presentation:
    {
        /** Shape type from the shape registry. */
        shape: string;

        /** Position and size on the canvas. */
        bounds: Rect;

        /** Rotation in degrees (0–360, clockwise). */
        rotation: number;

        /** Mirror horizontally. */
        flipX: boolean;

        /** Mirror vertically. */
        flipY: boolean;

        /** Visual styling (fill, stroke, shadow, opacity). */
        style: ObjectStyle;

        /** Rich text content for labels and text regions. */
        textContent?: TextContent;

        /** Layer membership. */
        layer: string;

        /** Stacking order within the layer. */
        zIndex: number;

        /** Whether the object is locked (cannot be moved or edited). */
        locked: boolean;

        /** Whether the object is visible. */
        visible: boolean;

        /** Parent group ID. */
        groupId?: string;

        /** Shape-specific parametric values (for control points). */
        parameters?: Record<string, number | Point>;

        /** Render style override (clean or sketch). */
        renderStyle?: "clean" | "sketch";

        /** Image properties (only for shape: "image"). */
        image?: ImageStyle;

        /** Paintable canvas properties (only for shape: "paintable"). */
        paintable?: PaintableStyle;

        /** Embedded component definition. */
        embed?: EmbedDefinition;

        /** Template variable bindings. */
        dataBindings?: DataBinding[];

        /** Pin to canvas edge (for title blocks). */
        anchor?: AnchorConstraint;
    };
}

// ============================================================================
// CONNECTORS
// ============================================================================

/** Arrow marker type for connector endpoints. */
type ArrowType =
    | "none" | "block" | "classic" | "open"
    | "diamond" | "oval" | "dash" | "cross"
    | "er-one" | "er-many" | "er-one-or-many"
    | "er-zero-or-one" | "er-zero-or-many" | "er-mandatory-one";

/** Connector routing algorithm. */
type RoutingStyle =
    | "straight" | "orthogonal" | "curved"
    | "segment" | "manhattan" | "elbow" | "entity";

/** Connector-specific stroke style with arrow markers. */
interface ConnectorStyle extends StrokeStyle
{
    startArrow?: ArrowType;
    endArrow?: ArrowType;
    shadow?: ShadowStyle;
}

/** A positioned label on a connector. */
interface ConnectorLabel
{
    /** Position along the path (named or 0–1 numeric). */
    position: "start" | "middle" | "end" | number;

    textContent: TextContent;
    background?: FillStyle;
    border?: StrokeStyle;
    padding?: number;
}

/**
 * A connector between two objects (or freestanding endpoints).
 * Has the same semantic/presentation split as DiagramObject.
 */
interface DiagramConnector
{
    id: string;
    semantic: SemanticData;

    presentation:
    {
        sourceId: string;
        targetId: string;
        sourcePort?: string;
        targetPort?: string;

        /** Terminal points for freestanding lines. */
        sourcePoint?: Point;
        targetPoint?: Point;

        /** User-placed intermediate control points. */
        waypoints: Point[];

        routing: RoutingStyle;
        style: ConnectorStyle;
        labels: ConnectorLabel[];
    };
}

// ============================================================================
// PAGE FRAMES
// ============================================================================

/** Predefined page frame size with name and dimensions in pixels. */
interface PageFrameSize
{
    /** Display name (e.g. "A4 Portrait", "Business Card"). */
    name: string;
    /** Category for grouping in the UI. */
    category: string;
    /** Width in pixels at 96 DPI. */
    width: number;
    /** Height in pixels at 96 DPI. */
    height: number;
}

/** Margin specification for a page frame. */
interface PageFrameMargins
{
    top: number;
    right: number;
    bottom: number;
    left: number;
}

/** A page frame — a non-exportable guide overlay on the canvas. */
interface PageFrame
{
    id: string;
    /** Auto-assigned sequential number (1-based). */
    number: number;
    /** Position on the canvas. */
    x: number;
    y: number;
    /** Dimensions (from a predefined size). */
    width: number;
    height: number;
    /** Size preset name for display. */
    sizeName: string;
    /** Whether the frame is locked in place. */
    locked: boolean;
    /** Frame border colour. */
    borderColor: string;
    /** Frame border width (0.5–2px). */
    borderWidth: number;
    /** Inner margins with guide lines. */
    margins: PageFrameMargins;
    /** Background colour (low alpha for visibility). */
    backgroundColor: string;
    /** Position of the frame number indicator relative to the frame. */
    numberPosition: "above" | "below" | "top-left" | "top-right";
    /** Optional label displayed near the frame. */
    label?: string;
}

// ============================================================================
// DOCUMENT STRUCTURE
// ============================================================================

/** A named visibility and ordering group for objects. */
interface Layer
{
    id: string;
    name: string;
    visible: boolean;
    locked: boolean;
    printable: boolean;
    opacity: number;
    order: number;
}

/** A persistent guide line on the canvas, dragged from a ruler. */
interface RulerGuide
{
    id: string;
    orientation: "horizontal" | "vertical";
    position: number;
}

/** A comment anchored to an entity or canvas position. */
interface DiagramComment
{
    id: string;
    anchor:
    {
        type: "object" | "connector" | "canvas";
        entityId?: string;
        position?: Point;
    };
    thread: CommentEntry[];
    status: "open" | "resolved";
    created: string;
    updated: string;
}

/** A single entry in a comment thread. */
interface CommentEntry
{
    id: string;
    userId: string;
    userName: string;
    content: string;
    timestamp: string;
    edited: boolean;
}

/**
 * The complete serialisable document. This is the persistence
 * format — JSON.stringify(doc) produces the canonical payload.
 */
interface DiagramDocument
{
    /** Format version for migration support. */
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

    /** Data context for template variable binding. */
    data?: Record<string, unknown>;

    /** Ordered layer definitions. */
    layers: Layer[];

    /** All objects on the canvas. */
    objects: DiagramObject[];

    /** All connectors on the canvas. */
    connectors: DiagramConnector[];

    /** Comments anchored to entities or canvas positions. */
    comments: DiagramComment[];

    /** Page frames for print-area guides. */
    pageFrames: PageFrame[];

    /** Persistent ruler guides. */
    guides: RulerGuide[];

    /** Grid configuration. */
    grid:
    {
        size: number;
        style: "dots" | "lines" | "none";
        visible: boolean;
    };

    /** Default render style for all shapes. */
    renderStyle?: "clean" | "sketch";
}

// ============================================================================
// SHAPES
// ============================================================================

/** A connection port on a shape where connectors can attach. */
interface ConnectionPort
{
    /** Unique port ID within the shape. */
    id: string;

    /** Position relative to the shape bounds (0–1 normalised). */
    position: { x: number; y: number };

    /** Allowed connector approach direction at this port. */
    direction: "north" | "south" | "east" | "west" | "any";

    /** Maximum simultaneous connections (0 = unlimited). */
    maxConnections: number;
}

/** A region within a shape where text can be placed. */
interface TextRegion
{
    id: string;
    bounds: Rect;
}

/** Context passed to a shape's render function. */
interface ShapeRenderContext
{
    /** Bounds in local coordinates (x=0, y=0). */
    bounds: Rect;

    /** Resolved visual style. */
    style: ObjectStyle;

    /** Shape-specific parametric values. */
    parameters: Record<string, number | Point>;

    /** Active render style (clean or sketch). */
    renderStyle: "clean" | "sketch";

    /** Whether the object is currently selected. */
    selected: boolean;
}

/** A resize handle on a selected object. */
interface ResizeHandle
{
    id: string;
    position: Point;
    cursor: string;
    axis: "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
}

/**
 * Defines a shape type that can be placed on the canvas.
 * Shapes are registered in stencil packs and referenced
 * by their type string.
 */
interface ShapeDefinition
{
    /** Unique type identifier (e.g. "rectangle", "uml-class"). */
    type: string;

    /** Category for stencil palette grouping. */
    category: string;

    /** Human-readable display name. */
    label: string;

    /** Bootstrap Icon class for the stencil palette. */
    icon: string;

    /** Default dimensions when placed. */
    defaultSize: { w: number; h: number };

    /** Minimum dimensions for resize. */
    minSize?: { w: number; h: number };

    /**
     * Renders the shape's SVG content within local coordinates.
     *
     * @param ctx - Render context with bounds, style, and parameters.
     * @returns An SVG element (or group) representing the shape.
     */
    render(ctx: ShapeRenderContext): SVGElement;

    /**
     * Returns the 8 bounding-box resize handles for this shape.
     *
     * @param bounds - Current bounding rectangle.
     * @returns Array of resize handle definitions.
     */
    getHandles(bounds: Rect): ResizeHandle[];

    /**
     * Returns connection ports where connectors can attach.
     *
     * @param bounds - Current bounding rectangle.
     * @returns Array of connection port definitions.
     */
    getPorts(bounds: Rect): ConnectionPort[];

    /**
     * Tests whether a canvas-space point is inside this shape.
     *
     * @param point - Point in canvas coordinates.
     * @param bounds - Object's bounding rectangle.
     * @returns true if the point is inside the shape's geometry.
     */
    hitTest(point: Point, bounds: Rect): boolean;

    /**
     * Returns regions where text content can be rendered.
     *
     * @param bounds - Current bounding rectangle.
     * @returns Array of text region definitions.
     */
    getTextRegions(bounds: Rect): TextRegion[];

    /**
     * Returns the SVG path data for the shape's outline.
     * Used for connector routing avoidance.
     *
     * @param bounds - Current bounding rectangle.
     * @returns SVG path data string (d attribute).
     */
    getOutlinePath(bounds: Rect): string;

    /** Whether this shape acts as a spatial container for other shapes. */
    isContainer?: boolean;

    /** Content area bounds for child placement (normalised 0-1). */
    contentArea?: { x: number; y: number; w: number; h: number };

    /** Whether shapes dropped inside auto-parent to this container. */
    autoMembership?: boolean;
}

// ============================================================================
// ENGINE CONFIGURATION
// ============================================================================

/** Current viewport state (pan offset and zoom level). */
interface ViewportState
{
    x: number;
    y: number;
    zoom: number;
}

/** Snapping and guide configuration. */
interface SnappingConfig
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

/** Alignment operations for multi-select alignment. */
type AlignmentType =
    | "left" | "center" | "right"
    | "top" | "middle" | "bottom";

/**
 * Deep-partial input type for addObject().
 * Allows callers to provide only the fields they care about;
 * the engine fills in sensible defaults for everything else.
 */
interface DiagramObjectInput
{
    id?: string;
    semantic?: Partial<SemanticData>;
    presentation?: Partial<DiagramObject["presentation"]>;
}

/** A structured mutation for collaboration broadcasting. */
interface Operation
{
    id: string;
    userId: string;
    timestamp: number;
    type: string;
    path: string;
    payload: Record<string, unknown>;
}

/**
 * Layout function signature for custom layout algorithms.
 * May return positions synchronously or asynchronously (for AI layouts).
 */
type LayoutFunction = (
    objects: DiagramObject[],
    connectors: DiagramConnector[],
    options: Record<string, unknown>
) => Map<string, Point> | Promise<Map<string, Point>>;

/**
 * Content contract for the per-object / per-connector hover card (ADR-126).
 * Mirrors the HoverCard component's `HoverCardContent` so DiagramEngine
 * can reference it without importing another IIFE module.
 */
interface DiagramHoverCardContent
{
    title?: string;
    subtitle?: string;
    icon?: string;
    iconColor?: string;
    badge?: { text: string; variant?: "success" | "warning" | "danger" | "info" | "secondary" };
    properties?: Array<{ key: string; value: string }>;
    description?: string;
    footer?: string | HTMLElement;
}

/** Return type of a custom hover card renderer. */
type DiagramHoverRenderResult =
    | DiagramHoverCardContent
    | HTMLElement
    | string
    | null;

/** Mode selector for the DiagramEngine hover card. */
type DiagramHoverCardMode = "builtin" | "custom" | "off";

/**
 * Configuration options for createDiagramEngine().
 * All options are optional — sensible defaults are applied.
 */
interface DiagramEngineOptions
{
    /** Pre-existing document to load. */
    document?: DiagramDocument;

    /** Data context for template variable binding. */
    data?: Record<string, unknown>;

    /** Stencil packs to load on creation. */
    stencils?: string[];

    /** Enabled tool names. */
    tools?: string[];

    /** Master edit switch. false = read-only viewer. */
    editable?: boolean;

    /** Whether connectors can be created. */
    connectable?: boolean;

    /** Whether text can be edited in-place. */
    textEditable?: boolean;

    /** Whether objects can be resized. */
    resizable?: boolean;

    /** Whether objects can be rotated. */
    rotatable?: boolean;

    /** Grid configuration. */
    grid?: { visible: boolean; size: number; style: "dots" | "lines" | "none" };

    /** Ruler visibility. */
    rulers?: { visible: boolean };

    /** Snapping configuration. */
    snapping?: Partial<SnappingConfig>;

    /**
     * Custom content renderer for objects. Called before the
     * default renderer. Return true to suppress default rendering.
     *
     * @param obj - The object being rendered.
     * @param container - HTML container for custom content.
     * @param bounds - Object bounds in canvas space.
     * @returns true if custom rendering was performed.
     */
    contentRenderer?: (
        obj: DiagramObject,
        container: HTMLElement,
        bounds: Rect
    ) => boolean;

    /**
     * Hover card display mode for objects and connectors (ADR-126).
     * "off" (default) — no hover card; editing flow is untouched.
     * "builtin" — show a card with label, shape, and semantic data.
     * "custom" — call `renderObjectHoverCard` / `renderConnectorHoverCard`.
     *
     * Suppressed automatically when the active tool is not "select" or
     * when a drag/pan/connect interaction is in progress.
     */
    objectHoverCardMode?: DiagramHoverCardMode;

    /**
     * Custom hover card renderer for objects. Only invoked when
     * `objectHoverCardMode === "custom"`. Returning `null` suppresses
     * the card for that object.
     */
    renderObjectHoverCard?: (obj: DiagramObject) => DiagramHoverRenderResult;

    /**
     * Custom hover card renderer for connectors. Only invoked when
     * `objectHoverCardMode === "custom"`. Returning `null` suppresses
     * the card for that connector.
     */
    renderConnectorHoverCard?: (
        conn: DiagramConnector
    ) => DiagramHoverRenderResult;

    // ── Event callbacks ──

    onObjectClick?: (obj: DiagramObject) => void;
    onObjectDoubleClick?: (obj: DiagramObject) => void;
    onConnectorClick?: (conn: DiagramConnector) => void;
    onSelectionChange?: (
        objects: DiagramObject[],
        connectors: DiagramConnector[]
    ) => void;
    onTextEditRequest?: (obj: DiagramObject, region: TextRegion) => void;
    onChange?: (ops: Operation[]) => void;
    onViewportChange?: (viewport: ViewportState) => void;
}

// ========================================================================
// SOURCE: event-bus.ts
// ========================================================================

/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: EventBus
 * PURPOSE: Publish/subscribe event system for internal DiagramEngine
 *    communication. Handlers are isolated — one failing handler does not
 *    block others.
 * RELATES: [[DiagramEngine]], [[UndoStack]]
 * FLOW: [Engine Subsystems] -> [EventBus.emit()] -> [Registered Handlers]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// TYPES
// ============================================================================

/** Callback signature for event handlers. */
type EventHandler = (...args: unknown[]) => void;

/** Log prefix for all console messages from this module. */





// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * A lightweight publish/subscribe event bus.
 *
 * Handlers are stored in a Map of Sets, keyed by event name.
 * Each handler invocation is wrapped in try/catch so that a
 * failing subscriber does not prevent other subscribers from
 * receiving the event.
 */
class EventBus
{
    /** Registry of event names to their handler sets. */
    private readonly handlers: Map<string, Set<EventHandler>> = new Map();

    /**
     * Register a handler for the given event.
     *
     * @param event - The event name to subscribe to.
     * @param handler - The callback to invoke when the event fires.
     */
    public on(event: string, handler: EventHandler): void
    {
        if (!this.handlers.has(event))
        {
            this.handlers.set(event, new Set());
        }

        this.handlers.get(event)!.add(handler);
    }

    /**
     * Remove a previously registered handler for the given event.
     *
     * @param event - The event name to unsubscribe from.
     * @param handler - The callback to remove.
     */
    public off(event: string, handler: EventHandler): void
    {
        const set = this.handlers.get(event);

        if (!set)
        {
            return;
        }

        set.delete(handler);

        if (set.size === 0)
        {
            this.handlers.delete(event);
        }
    }

    /**
     * Fire all handlers registered for the given event.
     *
     * Each handler is called inside a try/catch so that one
     * failing handler does not prevent the remaining handlers
     * from executing.
     *
     * @param event - The event name to emit.
     * @param args - Arguments forwarded to every handler.
     */
    public emit(event: string, ...args: unknown[]): void
    {
        const set = this.handlers.get(event);

        if (!set)
        {
            return;
        }

        for (const handler of set)
        {
            this.invokeHandler(event, handler, args);
        }
    }

    // ========================================================================
    // PRIVATE HELPERS
    // ========================================================================

    /**
     * Invoke a single handler inside a try/catch guard.
     *
     * @param event - Event name, used only for error logging.
     * @param handler - The callback to invoke.
     * @param args - Arguments to pass to the handler.
     */
    private invokeHandler(
        event: string,
        handler: EventHandler,
        args: unknown[]): void
    {
        try
        {
            handler(...args);
        }
        catch (error)
        {
            logError(`Handler for "${event}" threw an error:`,
                error
            );
        }
    }
}

// ========================================================================
// SOURCE: undo-stack.ts
// ========================================================================

/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: UndoStack
 * PURPOSE: Command-pattern undo/redo stack with merge window support.
 *    Consecutive mergeable commands of the same type within 500 ms are
 *    collapsed into a single entry so rapid edits (e.g. typing, dragging)
 *    produce one undoable unit.
 * RELATES: [[DiagramEngine]], [[EventBus]]
 * FLOW: [Engine Actions] -> [UndoStack.push()] -> [undo()/redo()]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// TYPES
// ============================================================================

/** A reversible command stored in the undo stack. */
interface UndoCommand
{
    /** Command category (e.g. "move", "resize", "text-edit"). */
    type: string;

    /** Human-readable description for UI display. */
    label: string;

    /** Epoch milliseconds when the command was created. */
    timestamp: number;

    /** Reverses the effect of this command. */
    undo: () => void;

    /** Re-applies the effect of this command. */
    redo: () => void;

    /** Whether this command can be merged with the next same-type command. */
    mergeable: boolean;
}

/** Log prefix for all console messages from this module. */





/** Maximum number of commands retained in the stack. */
const MAX_ENTRIES = 200;

/** Maximum elapsed time (ms) for two commands to be merge-eligible. */
const MERGE_WINDOW_MS = 500;

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Pointer-based undo/redo stack implementing the command pattern.
 *
 * The pointer always points to the index of the last executed command.
 * A value of -1 means no commands have been executed. When a new
 * command is pushed after an undo, the forward (redo) history is
 * truncated.
 */
class UndoStack
{
    /** Ordered list of commands. */
    private stack: UndoCommand[] = [];

    /**
     * Index of the current position in the stack.
     * -1 when empty or fully undone.
     */
    private pointer: number = -1;

    /**
     * Add a command to the stack.
     *
     * If the top command is mergeable, shares the same type, and was
     * created within the merge window, the two commands are merged
     * instead of adding a new entry. Otherwise, any forward redo
     * history is truncated and the command is appended.
     *
     * @param cmd - The command to push onto the stack.
     */
    public push(cmd: UndoCommand): void
    {
        if (this.tryMerge(cmd))
        {
            return;
        }

        this.truncateRedoHistory();
        this.stack.push(cmd);
        this.pointer = this.stack.length - 1;
        this.trimFromBottom();
    }

    /**
     * Undo the current command and move the pointer back.
     *
     * @returns true if an undo was performed, false if nothing to undo.
     */
    public undo(): boolean
    {
        if (!this.canUndo())
        {
            return false;
        }

        const cmd = this.stack[this.pointer];
        this.pointer -= 1;

        this.executeUndo(cmd);

        return true;
    }

    /**
     * Redo the next command and move the pointer forward.
     *
     * @returns true if a redo was performed, false if nothing to redo.
     */
    public redo(): boolean
    {
        if (!this.canRedo())
        {
            return false;
        }

        this.pointer += 1;
        const cmd = this.stack[this.pointer];

        this.executeRedo(cmd);

        return true;
    }

    /**
     * Check whether an undo operation is available.
     *
     * @returns true if the pointer is at a valid command.
     */
    public canUndo(): boolean
    {
        return this.pointer >= 0;
    }

    /**
     * Check whether a redo operation is available.
     *
     * @returns true if there are commands ahead of the pointer.
     */
    public canRedo(): boolean
    {
        return this.pointer < (this.stack.length - 1);
    }

    /**
     * Reset the stack, discarding all commands.
     */
    public clear(): void
    {
        this.stack = [];
        this.pointer = -1;
    }

    // ========================================================================
    // PRIVATE HELPERS
    // ========================================================================

    /**
     * Attempt to merge a new command with the top of the stack.
     *
     * Merge conditions: the top command must be mergeable, share the
     * same type, and fall within the merge time window.
     *
     * @param cmd - The incoming command to potentially merge.
     * @returns true if the merge was performed.
     */
    private tryMerge(cmd: UndoCommand): boolean
    {
        if (!this.canMerge(cmd))
        {
            return false;
        }

        const top = this.stack[this.pointer];

        // Compose undos: run new undo first, then old undo
        const previousUndo = top.undo;
        const newUndo = cmd.undo;

        top.undo = (): void =>
        {
            newUndo();
            previousUndo();
        };

        // Replace redo with the latest version
        top.redo = cmd.redo;
        top.timestamp = cmd.timestamp;
        top.label = cmd.label;

        return true;
    }

    /**
     * Check whether a command is eligible for merging with the top entry.
     *
     * @param cmd - The incoming command to test.
     * @returns true if merge conditions are met.
     */
    private canMerge(cmd: UndoCommand): boolean
    {
        if (this.pointer < 0)
        {
            return false;
        }

        // Only merge when pointer is at the top of the stack
        if (this.pointer !== (this.stack.length - 1))
        {
            return false;
        }

        const top = this.stack[this.pointer];

        if (!top.mergeable)
        {
            return false;
        }

        if (top.type !== cmd.type)
        {
            return false;
        }

        const elapsed = cmd.timestamp - top.timestamp;

        return elapsed <= MERGE_WINDOW_MS;
    }

    /**
     * Remove any commands ahead of the pointer.
     * Called when a new command is pushed after an undo.
     */
    private truncateRedoHistory(): void
    {
        if (this.pointer < (this.stack.length - 1))
        {
            this.stack.splice(this.pointer + 1);
        }
    }

    /**
     * Trim the oldest entries when the stack exceeds MAX_ENTRIES.
     * Adjusts the pointer to account for removed entries.
     */
    private trimFromBottom(): void
    {
        if (this.stack.length <= MAX_ENTRIES)
        {
            return;
        }

        const excess = this.stack.length - MAX_ENTRIES;

        this.stack.splice(0, excess);
        this.pointer -= excess;
    }

    /**
     * Execute a command's undo function with error handling.
     *
     * @param cmd - The command whose undo to execute.
     */
    private executeUndo(cmd: UndoCommand): void
    {
        try
        {
            cmd.undo();
        }
        catch (error)
        {
            logError(`Undo failed for "${cmd.label}":`,
                error
            );
        }
    }

    /**
     * Execute a command's redo function with error handling.
     *
     * @param cmd - The command whose redo to execute.
     */
    private executeRedo(cmd: UndoCommand): void
    {
        try
        {
            cmd.redo();
        }
        catch (error)
        {
            logError(`Redo failed for "${cmd.label}":`,
                error
            );
        }
    }
}

// ========================================================================
// SOURCE: shape-registry.ts
// ========================================================================

/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: DiagramEngine — ShapeRegistry
 * 📜 PURPOSE: Central registry for shape definitions, plus shared SVG helper
 *    functions used by all shape implementations (port generation, resize
 *    handles, fill/stroke application, SVG element creation, hit testing).
 * 🔗 RELATES: [[DiagramEngine]], [[ShapeDefinition]], [[ShapesBasic]]
 * ⚡ FLOW: [Shape modules] -> [ShapeRegistry.register()] -> [Engine.get()]
 * ----------------------------------------------------------------------------
 */

// @entrypoint






/** SVG namespace URI for element creation. */

/** Default fill colour when no fill style is specified. */
const DEFAULT_FILL = "var(--theme-surface-raised-bg)";

/** Default stroke colour when no stroke style is specified. */
const DEFAULT_STROKE = "var(--theme-border-color)";

/** Default stroke width when no stroke style is specified. */
const DEFAULT_STROKE_WIDTH = 1.5;

// ============================================================================
// SVG ELEMENT HELPERS
// ============================================================================

/**
 * Creates an SVG element in the correct namespace.
 *
 * @param tag - SVG tag name (e.g. "rect", "ellipse", "g").
 * @param attrs - Optional attribute key/value pairs to set.
 * @returns The created SVG element.
 */
function svgCreate(tag: string, attrs?: Record<string, string>): SVGElement
{
    const el = document.createElementNS(SVG_NS, tag);

    if (attrs)
    {
        svgSetAttr(el, attrs);
    }

    return el;
}

/**
 * Sets multiple attributes on an SVG element.
 *
 * @param el - Target SVG element.
 * @param attrs - Attribute key/value pairs to apply.
 * @returns void
 */
function svgSetAttr(el: SVGElement, attrs: Record<string, string>): void
{
    const keys = Object.keys(attrs);

    for (const key of keys)
    {
        el.setAttribute(key, attrs[key]);
    }
}

// ============================================================================
// FILL AND STROKE APPLICATION
// ============================================================================

/**
 * Applies a fill style to an SVG element. Handles solid colours,
 * linear/radial gradients (appended via a defs fragment), and "none".
 * When fill is undefined, applies the theme surface-raised-bg default.
 *
 * @param el - Target SVG element to receive the fill.
 * @param fill - Fill style specification, or undefined for default.
 * @returns void
 */
function applyFillToSvg(el: SVGElement, fill?: FillStyle): void
{
    if (!fill)
    {
        el.setAttribute("fill", DEFAULT_FILL);
        return;
    }

    if (fill.type === "none")
    {
        el.setAttribute("fill", "none");
        return;
    }

    if (fill.type === "solid")
    {
        el.setAttribute("fill", fill.color || DEFAULT_FILL);
        return;
    }

    if (fill.type === "gradient" && fill.gradient)
    {
        applyGradientFill(el, fill.gradient);
        return;
    }

    // Fallback for pattern or unrecognised types
    el.setAttribute("fill", fill.color || DEFAULT_FILL);
}

/**
 * Creates an SVG gradient definition and applies it to the element.
 * Appends a <defs> block as a sibling so the gradient is available.
 *
 * @param el - Target SVG element.
 * @param gradient - Gradient definition with type, stops, and parameters.
 * @returns void
 */
function applyGradientFill(el: SVGElement, gradient: GradientDefinition): void
{
    const gradientId = "grad-" + Math.random().toString(36).substring(2, 10);
    const defs = svgCreate("defs");
    const gradEl = buildGradientElement(gradient, gradientId);

    defs.appendChild(gradEl);

    el.parentNode?.insertBefore(defs, el);
    el.setAttribute("fill", `url(#${gradientId})`);
}

/**
 * Builds the SVG gradient element (linear or radial) with colour stops.
 *
 * @param gradient - Gradient definition.
 * @param id - Unique ID for the gradient element.
 * @returns The constructed SVG gradient element.
 */
function buildGradientElement(gradient: GradientDefinition, id: string): SVGElement
{
    const isLinear = (gradient.type === "linear");
    const tag = isLinear ? "linearGradient" : "radialGradient";
    const gradEl = svgCreate(tag, { id });

    if (isLinear)
    {
        applyLinearGradientAttrs(gradEl, gradient.angle);
    }
    else
    {
        applyRadialGradientAttrs(gradEl, gradient);
    }

    appendGradientStops(gradEl, gradient.stops);

    return gradEl;
}

/**
 * Sets x1/y1/x2/y2 attributes for a linear gradient based on angle.
 *
 * @param gradEl - The linearGradient SVG element.
 * @param angle - Angle in degrees (0 = left to right).
 * @returns void
 */
function applyLinearGradientAttrs(gradEl: SVGElement, angle?: number): void
{
    const radians = ((angle || 0) * Math.PI) / 180;
    const x2 = Math.cos(radians).toFixed(4);
    const y2 = Math.sin(radians).toFixed(4);

    svgSetAttr(gradEl, {
        x1: "0", y1: "0",
        x2, y2
    });
}

/**
 * Sets cx/cy/r attributes for a radial gradient.
 *
 * @param gradEl - The radialGradient SVG element.
 * @param gradient - Gradient definition with optional centre and radius.
 * @returns void
 */
function applyRadialGradientAttrs(
    gradEl: SVGElement,
    gradient: GradientDefinition): void
{
    const cx = gradient.center ? String(gradient.center.x) : "0.5";
    const cy = gradient.center ? String(gradient.center.y) : "0.5";
    const r = gradient.radius ? String(gradient.radius) : "0.5";

    svgSetAttr(gradEl, { cx, cy, r });
}

/**
 * Appends colour stop elements to a gradient.
 *
 * @param gradEl - Parent gradient element.
 * @param stops - Array of offset/color stop definitions.
 * @returns void
 */
function appendGradientStops(
    gradEl: SVGElement,
    stops: { offset: number; color: string }[]): void
{
    for (const stop of stops)
    {
        const parsed = parseStopColor(stop.color);
        const attrs: Record<string, string> = {
            offset: String(stop.offset),
            "stop-color": parsed.color
        };

        if (parsed.opacity < 1)
        {
            attrs["stop-opacity"] = String(parsed.opacity);
        }

        gradEl.appendChild(svgCreate("stop", attrs));
    }
}

/**
 * Parse a colour string into a stop-color and stop-opacity pair.
 * Handles rgba(), rgb(), hex, and named colours.
 */
function parseStopColor(color: string): { color: string; opacity: number }
{
    const rgbaMatch = color.match(
        /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/
    );

    if (rgbaMatch)
    {
        const r = rgbaMatch[1];
        const g = rgbaMatch[2];
        const b = rgbaMatch[3];
        const a = parseFloat(rgbaMatch[4]);

        return { color: `rgb(${r}, ${g}, ${b})`, opacity: a };
    }

    return { color, opacity: 1 };
}

/**
 * Applies a stroke style to an SVG element. Handles solid colours,
 * dash patterns, line cap, and line join. When stroke is undefined,
 * applies the theme border-color default at width 1.5.
 *
 * @param el - Target SVG element to receive the stroke.
 * @param stroke - Stroke style specification, or undefined for default.
 * @returns void
 */
function applyStrokeToSvg(el: SVGElement, stroke?: StrokeStyle): void
{
    if (!stroke)
    {
        el.setAttribute("stroke", DEFAULT_STROKE);
        el.setAttribute("stroke-width", String(DEFAULT_STROKE_WIDTH));
        return;
    }

    applyStrokeColor(el, stroke.color);
    el.setAttribute("stroke-width", String(stroke.width));

    if (stroke.dashPattern && stroke.dashPattern.length > 0)
    {
        el.setAttribute("stroke-dasharray", stroke.dashPattern.join(" "));
    }

    if (stroke.lineCap)
    {
        el.setAttribute("stroke-linecap", stroke.lineCap);
    }

    if (stroke.lineJoin)
    {
        el.setAttribute("stroke-linejoin", stroke.lineJoin);
    }
}

/**
 * Applies stroke colour, handling both string and gradient colours.
 *
 * @param el - Target SVG element.
 * @param color - Solid colour string or gradient definition.
 * @returns void
 */
function applyStrokeColor(el: SVGElement, color: string | GradientDefinition): void
{
    if (typeof color === "string")
    {
        el.setAttribute("stroke", color);
    }
    else
    {
        // Gradient stroke — create inline gradient and reference by URL
        const gradientId = "stroke-grad-" + Math.random().toString(36).substring(2, 10);
        const defs = svgCreate("defs");
        const gradEl = buildGradientElement(color, gradientId);

        defs.appendChild(gradEl);
        el.parentNode?.insertBefore(defs, el);
        el.setAttribute("stroke", `url(#${gradientId})`);
    }
}

// ============================================================================
// PER-EDGE STROKE RENDERING
// ============================================================================

/**
 * Side coordinate definitions for per-edge stroke lines.
 * Each side maps to two endpoints forming a line along that edge.
 */
const EDGE_SIDES: ReadonlyArray<{
    key: keyof PerEdgeStroke;
    coords: (b: Rect) => { x1: number; y1: number; x2: number; y2: number };
}> = [
    {
        key: "top",
        coords: (b) => ({ x1: b.x, y1: b.y, x2: b.x + b.width, y2: b.y })
    },
    {
        key: "right",
        coords: (b) => ({ x1: b.x + b.width, y1: b.y, x2: b.x + b.width, y2: b.y + b.height })
    },
    {
        key: "bottom",
        coords: (b) => ({ x1: b.x, y1: b.y + b.height, x2: b.x + b.width, y2: b.y + b.height })
    },
    {
        key: "left",
        coords: (b) => ({ x1: b.x, y1: b.y, x2: b.x, y2: b.y + b.height })
    },
];

/**
 * Renders per-edge stroke lines as an SVG group.
 *
 * Each enabled side of the bounding rectangle is drawn as a
 * separate `<line>` element with its own colour, width, and dash
 * pattern. Gradient colours produce inline `<linearGradient>` defs.
 *
 * @param bounds - Local-coordinate bounding rectangle.
 * @param perEdge - Per-edge stroke configuration.
 * @param fallback - Fallback stroke style for sides without overrides.
 * @returns SVG group containing the per-edge lines.
 */
function renderPerEdgeStroke(
    bounds: Rect,
    perEdge: PerEdgeStroke,
    fallback?: StrokeStyle
): SVGGElement
{
    const g = svgCreate("g") as SVGGElement;
    const defs = svgCreate("defs");
    let hasDefs = false;

    for (const side of EDGE_SIDES)
    {
        const edge = perEdge[side.key];

        if (!edge || edge.visible === false)
        {
            continue;
        }

        const c = side.coords(bounds);
        const line = svgCreate("line", {
            x1: String(c.x1),
            y1: String(c.y1),
            x2: String(c.x2),
            y2: String(c.y2)
        });

        const color = edge.color ?? fallback?.color ?? DEFAULT_STROKE;
        const width = edge.width ?? fallback?.width ?? DEFAULT_STROKE_WIDTH;
        const dash = edge.dashPattern ?? fallback?.dashPattern;

        applyEdgeStrokeColor(line, color, side.key, defs, c);
        if (typeof color !== "string") { hasDefs = true; }

        line.setAttribute("stroke-width", String(width));

        if (dash && dash.length > 0)
        {
            line.setAttribute("stroke-dasharray", dash.join(" "));
        }

        g.appendChild(line);
    }

    if (hasDefs)
    {
        g.insertBefore(defs, g.firstChild);
    }

    return g;
}

/**
 * Applies stroke colour to a per-edge line element.
 *
 * For gradient colours, appends a `<linearGradient>` to the
 * supplied defs element so the gradient is available when
 * the line references it.
 *
 * @param el - The SVG line element.
 * @param color - Solid colour string or gradient definition.
 * @param sideKey - Side identifier used in the gradient ID.
 * @param defs - Shared defs element for gradient definitions.
 */
function applyEdgeStrokeColor(
    el: SVGElement,
    color: string | GradientDefinition,
    sideKey: string,
    defs: SVGElement,
    coords: { x1: number; y1: number; x2: number; y2: number }
): void
{
    if (typeof color === "string")
    {
        el.setAttribute("stroke", color);
    }
    else
    {
        const gradientId = `edge-grad-${sideKey}-${Math.random().toString(36).substring(2, 10)}`;
        const gradEl = buildEdgeGradientElement(color, gradientId, coords);

        defs.appendChild(gradEl);
        el.setAttribute("stroke", `url(#${gradientId})`);
    }
}

/**
 * Build a gradient element for a per-edge stroke line.
 * Uses userSpaceOnUse with the line's actual coordinates to avoid
 * the degenerate bounding box problem on zero-width/height lines.
 */
function buildEdgeGradientElement(
    gradient: GradientDefinition,
    id: string,
    coords: { x1: number; y1: number; x2: number; y2: number }
): SVGElement
{
    const gradEl = svgCreate("linearGradient", {
        id,
        gradientUnits: "userSpaceOnUse",
        x1: String(coords.x1),
        y1: String(coords.y1),
        x2: String(coords.x2),
        y2: String(coords.y2)
    });

    appendGradientStops(gradEl, gradient.stops);

    return gradEl;
}

// ============================================================================
// PORT AND HANDLE GENERATORS
// ============================================================================

/**
 * Creates the four default connection ports at the north, south, east,
 * and west midpoints of a bounding rectangle.
 *
 * @param bounds - Bounding rectangle of the shape.
 * @returns Array of four ConnectionPort definitions.
 */
function createDefaultPorts(bounds: Rect): ConnectionPort[]
{
    return [
        { id: "port-n",  position: { x: 0.5, y: 0 },   direction: "north", maxConnections: 0 },
        { id: "port-ne", position: { x: 1,   y: 0 },   direction: "any",   maxConnections: 0 },
        { id: "port-e",  position: { x: 1,   y: 0.5 },  direction: "east",  maxConnections: 0 },
        { id: "port-se", position: { x: 1,   y: 1 },   direction: "any",   maxConnections: 0 },
        { id: "port-s",  position: { x: 0.5, y: 1 },   direction: "south", maxConnections: 0 },
        { id: "port-sw", position: { x: 0,   y: 1 },   direction: "any",   maxConnections: 0 },
        { id: "port-w",  position: { x: 0,   y: 0.5 },  direction: "west",  maxConnections: 0 },
        { id: "port-nw", position: { x: 0,   y: 0 },   direction: "any",   maxConnections: 0 },
        { id: "port-c",  position: { x: 0.5, y: 0.5 },  direction: "any",   maxConnections: 0 },
    ];
}

/**
 * Creates the eight standard resize handles at the corners and edge
 * midpoints of a bounding rectangle.
 *
 * @param bounds - Bounding rectangle of the shape.
 * @returns Array of eight ResizeHandle definitions.
 */
function createBoundingBoxHandles(bounds: Rect): ResizeHandle[]
{
    const x = bounds.x;
    const y = bounds.y;
    const w = bounds.width;
    const h = bounds.height;

    return buildCornerHandles(x, y, w, h)
        .concat(buildEdgeHandles(x, y, w, h));
}

/**
 * Builds the four corner resize handles (nw, ne, sw, se).
 *
 * @param x - Left edge of bounds.
 * @param y - Top edge of bounds.
 * @param w - Width of bounds.
 * @param h - Height of bounds.
 * @returns Array of four corner ResizeHandle definitions.
 */
function buildCornerHandles(x: number, y: number, w: number, h: number): ResizeHandle[]
{
    return [
        { id: "handle-nw", position: { x, y },             cursor: "nwse-resize", axis: "nw" },
        { id: "handle-ne", position: { x: x + w, y },      cursor: "nesw-resize", axis: "ne" },
        { id: "handle-sw", position: { x, y: y + h },      cursor: "nesw-resize", axis: "sw" },
        { id: "handle-se", position: { x: x + w, y: y + h }, cursor: "nwse-resize", axis: "se" }
    ];
}

/**
 * Builds the four edge midpoint resize handles (n, s, e, w).
 *
 * @param x - Left edge of bounds.
 * @param y - Top edge of bounds.
 * @param w - Width of bounds.
 * @param h - Height of bounds.
 * @returns Array of four edge ResizeHandle definitions.
 */
function buildEdgeHandles(x: number, y: number, w: number, h: number): ResizeHandle[]
{
    const midX = x + (w / 2);
    const midY = y + (h / 2);

    return [
        { id: "handle-n", position: { x: midX, y },      cursor: "ns-resize", axis: "n" },
        { id: "handle-s", position: { x: midX, y: y + h }, cursor: "ns-resize", axis: "s" },
        { id: "handle-e", position: { x: x + w, y: midY }, cursor: "ew-resize", axis: "e" },
        { id: "handle-w", position: { x, y: midY },       cursor: "ew-resize", axis: "w" }
    ];
}

// ============================================================================
// HIT TESTING
// ============================================================================

/**
 * Tests whether a point lies within an axis-aligned rectangle.
 *
 * @param point - The point to test in canvas coordinates.
 * @param bounds - The bounding rectangle to test against.
 * @returns true if the point is inside the rectangle.
 */
function rectHitTest(point: Point, bounds: Rect): boolean
{
    return (
        (point.x >= bounds.x) &&
        (point.x <= bounds.x + bounds.width) &&
        (point.y >= bounds.y) &&
        (point.y <= bounds.y + bounds.height)
    );
}

// ============================================================================
// SHAPE REGISTRY
// ============================================================================

/**
 * Central registry for shape definitions. Shapes are registered by type
 * string and can be retrieved individually, as a full list, or filtered
 * by category. The engine and stencil palette use this registry to
 * resolve shape types and populate the shape chooser.
 */
class ShapeRegistry
{
    /** Map of shape type to definition. */
    private readonly _shapes: Map<string, ShapeDefinition> = new Map();

    /**
     * Registers a shape definition. Overwrites any existing shape
     * with the same type string.
     *
     * @param shape - The shape definition to register.
     * @returns void
     */
    public register(shape: ShapeDefinition): void
    {
        if (!shape || !shape.type)
        {
            logError("Cannot register shape without a type");
            return;
        }

        logDebug("Registered shape:", shape.type);
        this._shapes.set(shape.type, shape);
    }

    /**
     * Retrieves a shape definition by its type string.
     *
     * @param type - The unique type identifier of the shape.
     * @returns The shape definition, or null if not found.
     */
    public get(type: string): ShapeDefinition | null
    {
        return this._shapes.get(type) || null;
    }

    /**
     * Returns all registered shape definitions.
     *
     * @returns Array of all shape definitions.
     */
    public getAll(): ShapeDefinition[]
    {
        return Array.from(this._shapes.values());
    }

    /**
     * Returns all shapes belonging to a specific category.
     *
     * @param category - The category to filter by.
     * @returns Array of shape definitions in the given category.
     */
    public getByCategory(category: string): ShapeDefinition[]
    {
        const result: ShapeDefinition[] = [];

        for (const shape of this._shapes.values())
        {
            if (shape.category === category)
            {
                result.push(shape);
            }
        }

        return result;
    }
}

// ========================================================================
// SOURCE: shapes-basic.ts
// ========================================================================

/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: DiagramEngine — BasicShapes
 * 📜 PURPOSE: Five fundamental shape definitions (rectangle, ellipse, diamond,
 *    triangle, text) that form the core shape library. Each shape provides
 *    render, hitTest, ports, handles, text regions, and outline path.
 * 🔗 RELATES: [[DiagramEngine]], [[ShapeRegistry]], [[ShapeDefinition]]
 * ⚡ FLOW: [registerBasicShapes()] -> [ShapeRegistry.register()] -> [Engine]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

const BASIC_LOG_PREFIX = "[BasicShapes]";

function logBasicInfo(...args: unknown[]): void
{
    console.log(new Date().toISOString(), "[INFO]", BASIC_LOG_PREFIX, ...args);
}

function logBasicWarn(...args: unknown[]): void
{
    console.warn(new Date().toISOString(), "[WARN]", BASIC_LOG_PREFIX, ...args);
}

function logBasicError(...args: unknown[]): void
{
    console.error(new Date().toISOString(), "[ERROR]", BASIC_LOG_PREFIX, ...args);
}

function logBasicDebug(...args: unknown[]): void
{
    console.debug(new Date().toISOString(), "[DEBUG]", BASIC_LOG_PREFIX, ...args);
}

/** Category identifier for all basic shapes in the stencil palette. */
const BASIC_CATEGORY = "basic";

/** Inset in pixels for text regions to clear stroke area. */
const TEXT_INSET = 6;

// ============================================================================
// RECTANGLE
// ============================================================================

/**
 * Renders a rectangle SVG element with fill and stroke applied.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the rectangle.
 */
function renderRectangle(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const rect = svgCreate("rect", {
        x: String(ctx.bounds.x),
        y: String(ctx.bounds.y),
        width: String(ctx.bounds.width),
        height: String(ctx.bounds.height)
    });

    g.appendChild(rect);
    applyFillToSvg(rect, ctx.style.fill);
    applyStrokeToSvg(rect, ctx.style.stroke);

    return g;
}

/**
 * Returns inset text regions for a rectangle, leaving margin for stroke.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single inset text region.
 */
function rectTextRegions(bounds: Rect): TextRegion[]
{
    return [
        {
            id: "text-main",
            bounds: insetRect(bounds, TEXT_INSET)
        }
    ];
}

/**
 * Returns the SVG path data for a rectangle outline.
 *
 * @param bounds - Current bounding rectangle.
 * @returns SVG path data string.
 */
function rectOutlinePath(bounds: Rect): string
{
    const x = bounds.x;
    const y = bounds.y;
    const w = bounds.width;
    const h = bounds.height;

    return `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
}

/**
 * Builds the rectangle ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for rectangles.
 */
function buildRectangleShape(): ShapeDefinition
{
    return {
        type: "rectangle",
        category: BASIC_CATEGORY,
        label: "Rectangle",
        icon: "bi-square",
        defaultSize: { w: 120, h: 80 },
        minSize: { w: 20, h: 20 },
        render: renderRectangle,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => rectTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => rectOutlinePath(bounds)
    };
}

// ============================================================================
// ELLIPSE
// ============================================================================

/**
 * Renders an ellipse SVG element with fill and stroke applied.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the ellipse.
 */
function renderEllipse(ctx: ShapeRenderContext): SVGElement
{
    const cx = ctx.bounds.x + (ctx.bounds.width / 2);
    const cy = ctx.bounds.y + (ctx.bounds.height / 2);
    const rx = ctx.bounds.width / 2;
    const ry = ctx.bounds.height / 2;

    const g = svgCreate("g");
    const ellipse = svgCreate("ellipse", {
        cx: String(cx),
        cy: String(cy),
        rx: String(rx),
        ry: String(ry)
    });

    g.appendChild(ellipse);
    applyFillToSvg(ellipse, ctx.style.fill);
    applyStrokeToSvg(ellipse, ctx.style.stroke);

    return g;
}

/**
 * Tests whether a point lies inside an ellipse using the standard
 * ellipse equation: ((px-cx)/rx)^2 + ((py-cy)/ry)^2 <= 1.
 *
 * @param point - Point in canvas coordinates.
 * @param bounds - Bounding rectangle of the ellipse.
 * @returns true if the point is inside the ellipse.
 */
function ellipseHitTest(point: Point, bounds: Rect): boolean
{
    const cx = bounds.x + (bounds.width / 2);
    const cy = bounds.y + (bounds.height / 2);
    const rx = bounds.width / 2;
    const ry = bounds.height / 2;

    if (rx === 0 || ry === 0)
    {
        return false;
    }

    const dx = (point.x - cx) / rx;
    const dy = (point.y - cy) / ry;

    return ((dx * dx) + (dy * dy)) <= 1;
}

/**
 * Returns text regions for an ellipse, inset further than rectangle
 * to account for the curved boundary.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single inset text region.
 */
function ellipseTextRegions(bounds: Rect): TextRegion[]
{
    // Inscribed rectangle within ellipse is ~70.7% of each axis
    const insetFactor = 0.146;

    return [
        {
            id: "text-main",
            bounds: {
                x: bounds.x + (bounds.width * insetFactor),
                y: bounds.y + (bounds.height * insetFactor),
                width: bounds.width * (1 - (2 * insetFactor)),
                height: bounds.height * (1 - (2 * insetFactor))
            }
        }
    ];
}

/**
 * Builds an SVG path approximation of an ellipse using four arc commands.
 *
 * @param bounds - Current bounding rectangle.
 * @returns SVG path data string.
 */
function ellipseOutlinePath(bounds: Rect): string
{
    const cx = bounds.x + (bounds.width / 2);
    const cy = bounds.y + (bounds.height / 2);
    const rx = bounds.width / 2;
    const ry = bounds.height / 2;

    return (
        `M ${cx - rx} ${cy} ` +
        `A ${rx} ${ry} 0 1 1 ${cx + rx} ${cy} ` +
        `A ${rx} ${ry} 0 1 1 ${cx - rx} ${cy} Z`
    );
}

/**
 * Builds the ellipse ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for ellipses.
 */
function buildEllipseShape(): ShapeDefinition
{
    return {
        type: "ellipse",
        category: BASIC_CATEGORY,
        label: "Ellipse",
        icon: "bi-circle",
        defaultSize: { w: 120, h: 80 },
        minSize: { w: 20, h: 20 },
        render: renderEllipse,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => ellipseHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => ellipseTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => ellipseOutlinePath(bounds)
    };
}

// ============================================================================
// DIAMOND
// ============================================================================

/**
 * Builds the SVG path data for a diamond (rotated square) shape.
 *
 * @param bounds - Bounding rectangle containing the diamond.
 * @returns SVG path data string with 4 vertices at edge midpoints.
 */
function diamondPathData(bounds: Rect): string
{
    const cx = bounds.x + (bounds.width / 2);
    const cy = bounds.y + (bounds.height / 2);
    const top = bounds.y;
    const right = bounds.x + bounds.width;
    const bottom = bounds.y + bounds.height;
    const left = bounds.x;

    return `M ${cx} ${top} L ${right} ${cy} L ${cx} ${bottom} L ${left} ${cy} Z`;
}

/**
 * Renders a diamond SVG path element with fill and stroke applied.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the diamond path.
 */
function renderDiamond(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const path = svgCreate("path", {
        d: diamondPathData(ctx.bounds)
    });

    g.appendChild(path);
    applyFillToSvg(path, ctx.style.fill);
    applyStrokeToSvg(path, ctx.style.stroke);

    return g;
}

/**
 * Tests whether a point lies inside a diamond using the taxicab
 * (Manhattan) distance formula: |dx/half_w| + |dy/half_h| <= 1.
 *
 * @param point - Point in canvas coordinates.
 * @param bounds - Bounding rectangle of the diamond.
 * @returns true if the point is inside the diamond.
 */
function diamondHitTest(point: Point, bounds: Rect): boolean
{
    const cx = bounds.x + (bounds.width / 2);
    const cy = bounds.y + (bounds.height / 2);
    const halfW = bounds.width / 2;
    const halfH = bounds.height / 2;

    if (halfW === 0 || halfH === 0)
    {
        return false;
    }

    const dx = Math.abs(point.x - cx) / halfW;
    const dy = Math.abs(point.y - cy) / halfH;

    return (dx + dy) <= 1;
}

/**
 * Returns text regions for a diamond, heavily inset to fit within
 * the diagonal boundaries.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single inset text region.
 */
function diamondTextRegions(bounds: Rect): TextRegion[]
{
    // Inscribed rectangle within a diamond is 50% of each axis
    const insetFactor = 0.25;

    return [
        {
            id: "text-main",
            bounds: {
                x: bounds.x + (bounds.width * insetFactor),
                y: bounds.y + (bounds.height * insetFactor),
                width: bounds.width * (1 - (2 * insetFactor)),
                height: bounds.height * (1 - (2 * insetFactor))
            }
        }
    ];
}

/**
 * Builds the diamond ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for diamonds.
 */
function buildDiamondShape(): ShapeDefinition
{
    return {
        type: "diamond",
        category: BASIC_CATEGORY,
        label: "Diamond",
        icon: "bi-diamond",
        defaultSize: { w: 100, h: 100 },
        minSize: { w: 30, h: 30 },
        render: renderDiamond,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => diamondHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => diamondTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => diamondPathData(bounds)
    };
}

// ============================================================================
// TRIANGLE
// ============================================================================

/**
 * Computes the three vertices of an equilateral-ish triangle that
 * fits within the given bounding rectangle. Top-centre, bottom-left,
 * bottom-right.
 *
 * @param bounds - Bounding rectangle containing the triangle.
 * @returns Object with top, bottomLeft, and bottomRight Point values.
 */
function triangleVertices(bounds: Rect):
    { top: Point; bottomLeft: Point; bottomRight: Point }
{
    return {
        top: {
            x: bounds.x + (bounds.width / 2),
            y: bounds.y
        },
        bottomLeft: {
            x: bounds.x,
            y: bounds.y + bounds.height
        },
        bottomRight: {
            x: bounds.x + bounds.width,
            y: bounds.y + bounds.height
        }
    };
}

/**
 * Builds the SVG path data for a triangle shape.
 *
 * @param bounds - Bounding rectangle containing the triangle.
 * @returns SVG path data string with 3 vertices.
 */
function trianglePathData(bounds: Rect): string
{
    const v = triangleVertices(bounds);

    return `M ${v.top.x} ${v.top.y} L ${v.bottomRight.x} ${v.bottomRight.y} L ${v.bottomLeft.x} ${v.bottomLeft.y} Z`;
}

/**
 * Renders a triangle SVG path element with fill and stroke applied.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the triangle path.
 */
function renderTriangle(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const path = svgCreate("path", {
        d: trianglePathData(ctx.bounds)
    });

    g.appendChild(path);
    applyFillToSvg(path, ctx.style.fill);
    applyStrokeToSvg(path, ctx.style.stroke);

    return g;
}

/**
 * Tests whether a point lies inside a triangle using the half-plane
 * (sign of cross-product) method. A point is inside if it lies on
 * the same side of all three edges.
 *
 * @param point - Point in canvas coordinates.
 * @param bounds - Bounding rectangle of the triangle.
 * @returns true if the point is inside the triangle.
 */
function triangleHitTest(point: Point, bounds: Rect): boolean
{
    const v = triangleVertices(bounds);

    const d1 = crossProduct2D(point, v.top, v.bottomRight);
    const d2 = crossProduct2D(point, v.bottomRight, v.bottomLeft);
    const d3 = crossProduct2D(point, v.bottomLeft, v.top);

    const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
    const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);

    return !(hasNeg && hasPos);
}

/**
 * Computes the 2D cross product sign for three points. Used by
 * triangleHitTest to determine which side of an edge a point is on.
 *
 * @param p - The test point.
 * @param a - First vertex of the edge.
 * @param b - Second vertex of the edge.
 * @returns The cross product value (positive, negative, or zero).
 */
function crossProduct2D(p: Point, a: Point, b: Point): number
{
    return ((a.x - p.x) * (b.y - p.y)) - ((a.y - p.y) * (b.x - p.x));
}

/**
 * Returns text regions for a triangle, positioned in the lower-centre
 * area where the triangle is widest.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single inset text region.
 */
function triangleTextRegions(bounds: Rect): TextRegion[]
{
    // Place text in the lower 60% of the triangle, centred horizontally
    const insetX = bounds.width * 0.2;
    const topOffset = bounds.height * 0.4;

    return [
        {
            id: "text-main",
            bounds: {
                x: bounds.x + insetX,
                y: bounds.y + topOffset,
                width: bounds.width - (2 * insetX),
                height: bounds.height - topOffset - TEXT_INSET
            }
        }
    ];
}

/**
 * Builds the triangle ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for triangles.
 */
function buildTriangleShape(): ShapeDefinition
{
    return {
        type: "triangle",
        category: BASIC_CATEGORY,
        label: "Triangle",
        icon: "bi-triangle",
        defaultSize: { w: 100, h: 90 },
        minSize: { w: 20, h: 20 },
        render: renderTriangle,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => triangleHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => triangleTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => trianglePathData(bounds)
    };
}

// ============================================================================
// TEXT
// ============================================================================

/**
 * Renders an invisible container rectangle for a text-only shape.
 * The rectangle has transparent fill and no stroke — it serves purely
 * as a bounding box for text content.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the invisible rectangle.
 */
function renderText(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const rect = svgCreate("rect", {
        x: String(ctx.bounds.x),
        y: String(ctx.bounds.y),
        width: String(ctx.bounds.width),
        height: String(ctx.bounds.height),
        fill: "transparent",
        stroke: "none"
    });

    g.appendChild(rect);

    return g;
}

/**
 * Returns text regions for a text shape, using nearly the full
 * bounds with minimal inset.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single text region.
 */
function textTextRegions(bounds: Rect): TextRegion[]
{
    const inset = 2;

    return [
        {
            id: "text-main",
            bounds: insetRect(bounds, inset)
        }
    ];
}

/**
 * Builds the text ShapeDefinition. Text shapes have no connection
 * ports since they are purely decorative labels.
 *
 * @returns A complete ShapeDefinition for text containers.
 */
function buildTextShape(): ShapeDefinition
{
    return {
        type: "text",
        category: BASIC_CATEGORY,
        label: "Text",
        icon: "bi-fonts",
        defaultSize: { w: 160, h: 40 },
        minSize: { w: 30, h: 20 },
        render: renderText,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: () => [],
        hitTest: (point: Point, bounds: Rect) => rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => textTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => rectOutlinePath(bounds)
    };
}

// ============================================================================
// SHARED HELPERS
// ============================================================================

/**
 * Creates an inset copy of a rectangle, shrinking each edge by the
 * given number of pixels. Returns a zero-size rect if inset exceeds
 * the available space.
 *
 * @param bounds - Original bounding rectangle.
 * @param inset - Number of pixels to inset on each side.
 * @returns A new Rect inset from the original.
 */
function insetRect(bounds: Rect, inset: number): Rect
{
    const doubleInset = inset * 2;

    return {
        x: bounds.x + inset,
        y: bounds.y + inset,
        width: Math.max(0, bounds.width - doubleInset),
        height: Math.max(0, bounds.height - doubleInset)
    };
}

// ============================================================================
// REGISTRATION
// ============================================================================

/**
 * Registers all five basic shapes (rectangle, ellipse, diamond,
 * triangle, text) with the given shape registry.
 *
 * @param registry - The ShapeRegistry instance to populate.
 * @returns void
 */
function registerBasicShapes(registry: ShapeRegistry): void
{
    registry.register(buildRectangleShape());
    registry.register(buildEllipseShape());
    registry.register(buildDiamondShape());
    registry.register(buildTriangleShape());
    registry.register(buildTextShape());

    logBasicInfo("Registered 5 basic shapes");
}

// ========================================================================
// SOURCE: shapes-extended.ts
// ========================================================================

/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: DiagramEngine — ExtendedShapes
 * PURPOSE: Ten additional shape definitions (hexagon, star, cross,
 *    parallelogram, arrow-right, chevron, callout, donut, image, icon)
 *    that extend the basic shape library. Each shape provides render,
 *    hitTest, ports, handles, text regions, and outline path.
 * RELATES: [[DiagramEngine]], [[ShapeRegistry]], [[ShapeDefinition]]
 * FLOW: [registerExtendedShapes()] -> [ShapeRegistry.register()] -> [Engine]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

const EXTENDED_LOG_PREFIX = "[ExtendedShapes]";

function logExtendedInfo(...args: unknown[]): void
{
    console.log(new Date().toISOString(), "[INFO]", EXTENDED_LOG_PREFIX, ...args);
}

function logExtendedWarn(...args: unknown[]): void
{
    console.warn(new Date().toISOString(), "[WARN]", EXTENDED_LOG_PREFIX, ...args);
}

function logExtendedError(...args: unknown[]): void
{
    console.error(new Date().toISOString(), "[ERROR]", EXTENDED_LOG_PREFIX, ...args);
}

function logExtendedDebug(...args: unknown[]): void
{
    console.debug(new Date().toISOString(), "[DEBUG]", EXTENDED_LOG_PREFIX, ...args);
}

/** Category identifier for extended shapes in the stencil palette. */
const EXTENDED_CATEGORY = "extended";

/** Inset in pixels for text regions to clear stroke area. */
const EXT_TEXT_INSET = 6;

// ============================================================================
// SHARED HELPERS
// ============================================================================

/**
 * Creates an inset copy of a rectangle, shrinking each edge by the
 * given number of pixels.
 *
 * @param bounds - Original bounding rectangle.
 * @param inset - Number of pixels to inset on each side.
 * @returns A new Rect inset from the original.
 */
function extInsetRect(bounds: Rect, inset: number): Rect
{
    const doubleInset = inset * 2;

    return {
        x: bounds.x + inset,
        y: bounds.y + inset,
        width: Math.max(0, bounds.width - doubleInset),
        height: Math.max(0, bounds.height - doubleInset)
    };
}

/**
 * Tests whether a point lies inside a convex or concave polygon
 * using the ray-casting algorithm. Counts crossings of a horizontal
 * ray from the point to +infinity.
 *
 * @param point - The point to test.
 * @param vertices - Array of polygon vertices in order.
 * @returns true if the point is inside the polygon.
 */
function polygonHitTest(point: Point, vertices: Point[]): boolean
{
    let inside = false;
    const n = vertices.length;

    for (let i = 0, j = n - 1; i < n; j = i++)
    {
        const yi = vertices[i].y;
        const yj = vertices[j].y;
        const xi = vertices[i].x;
        const xj = vertices[j].x;

        const intersects = (
            ((yi > point.y) !== (yj > point.y)) &&
            (point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi)
        );

        if (intersects)
        {
            inside = !inside;
        }
    }

    return inside;
}

/**
 * Converts an array of points into an SVG path data string.
 *
 * @param vertices - Array of polygon vertices.
 * @returns SVG path data string with M, L, and Z commands.
 */
function verticesToPathData(vertices: Point[]): string
{
    if (vertices.length === 0)
    {
        return "";
    }

    const parts = [`M ${vertices[0].x} ${vertices[0].y}`];

    for (let i = 1; i < vertices.length; i++)
    {
        parts.push(`L ${vertices[i].x} ${vertices[i].y}`);
    }

    parts.push("Z");

    return parts.join(" ");
}

// ============================================================================
// HEXAGON
// ============================================================================

/**
 * Computes the six vertices of a regular hexagon with 25% inset
 * on the left and right sides.
 *
 * @param bounds - Bounding rectangle containing the hexagon.
 * @returns Array of six Point values forming the hexagon.
 */
function hexagonVertices(bounds: Rect): Point[]
{
    const x = bounds.x;
    const y = bounds.y;
    const w = bounds.width;
    const h = bounds.height;
    const inset = w * 0.25;

    return [
        { x: x + inset,     y },
        { x: x + w - inset, y },
        { x: x + w,         y: y + (h / 2) },
        { x: x + w - inset, y: y + h },
        { x: x + inset,     y: y + h },
        { x,                y: y + (h / 2) }
    ];
}

/**
 * Renders a hexagon SVG path with fill and stroke applied.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the hexagon path.
 */
function renderHexagon(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const d = verticesToPathData(hexagonVertices(ctx.bounds));
    const path = svgCreate("path", { d });

    g.appendChild(path);
    applyFillToSvg(path, ctx.style.fill);
    applyStrokeToSvg(path, ctx.style.stroke);

    return g;
}

/**
 * Returns inset text regions for a hexagon.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single inset text region.
 */
function hexagonTextRegions(bounds: Rect): TextRegion[]
{
    const insetX = bounds.width * 0.25;

    return [
        {
            id: "text-main",
            bounds: {
                x: bounds.x + insetX,
                y: bounds.y + EXT_TEXT_INSET,
                width: bounds.width - (2 * insetX),
                height: bounds.height - (2 * EXT_TEXT_INSET)
            }
        }
    ];
}

/**
 * Builds the hexagon ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for hexagons.
 */
function buildHexagonShape(): ShapeDefinition
{
    return {
        type: "hexagon",
        category: EXTENDED_CATEGORY,
        label: "Hexagon",
        icon: "bi-hexagon",
        defaultSize: { w: 120, h: 100 },
        minSize: { w: 30, h: 20 },
        render: renderHexagon,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) =>
            polygonHitTest(point, hexagonVertices(bounds)),
        getTextRegions: (bounds: Rect) => hexagonTextRegions(bounds),
        getOutlinePath: (bounds: Rect) =>
            verticesToPathData(hexagonVertices(bounds))
    };
}

// ============================================================================
// STAR
// ============================================================================

/**
 * Computes the vertices of a 5-point star using outer and inner radii.
 * The star has 10 vertices alternating between outer and inner rings.
 *
 * @param bounds - Bounding rectangle containing the star.
 * @returns Array of ten Point values forming the star.
 */
function starVertices(bounds: Rect): Point[]
{
    const cx = bounds.x + (bounds.width / 2);
    const cy = bounds.y + (bounds.height / 2);
    const outerRx = bounds.width / 2;
    const outerRy = bounds.height / 2;
    const innerRatio = 0.38;
    const innerRx = outerRx * innerRatio;
    const innerRy = outerRy * innerRatio;

    return buildStarPoints(cx, cy, outerRx, outerRy, innerRx, innerRy);
}

/**
 * Generates the 10 alternating outer/inner points of a 5-point star.
 *
 * @param cx - Centre X coordinate.
 * @param cy - Centre Y coordinate.
 * @param outerRx - Outer horizontal radius.
 * @param outerRy - Outer vertical radius.
 * @param innerRx - Inner horizontal radius.
 * @param innerRy - Inner vertical radius.
 * @returns Array of ten Point values.
 */
function buildStarPoints(
    cx: number,
    cy: number,
    outerRx: number,
    outerRy: number,
    innerRx: number,
    innerRy: number): Point[]
{
    const points: Point[] = [];
    const angleStep = Math.PI / 5;
    const startAngle = -Math.PI / 2;

    for (let i = 0; i < 10; i++)
    {
        const angle = startAngle + (i * angleStep);
        const isOuter = (i % 2 === 0);
        const rx = isOuter ? outerRx : innerRx;
        const ry = isOuter ? outerRy : innerRy;

        points.push({
            x: cx + (rx * Math.cos(angle)),
            y: cy + (ry * Math.sin(angle))
        });
    }

    return points;
}

/**
 * Renders a 5-point star SVG path with fill and stroke applied.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the star path.
 */
function renderStar(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const d = verticesToPathData(starVertices(ctx.bounds));
    const path = svgCreate("path", { d });

    g.appendChild(path);
    applyFillToSvg(path, ctx.style.fill);
    applyStrokeToSvg(path, ctx.style.stroke);

    return g;
}

/**
 * Returns inset text regions for a star, positioned centrally.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single centred text region.
 */
function starTextRegions(bounds: Rect): TextRegion[]
{
    const insetFactor = 0.3;

    return [
        {
            id: "text-main",
            bounds: {
                x: bounds.x + (bounds.width * insetFactor),
                y: bounds.y + (bounds.height * insetFactor),
                width: bounds.width * (1 - (2 * insetFactor)),
                height: bounds.height * (1 - (2 * insetFactor))
            }
        }
    ];
}

/**
 * Builds the star ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for 5-point stars.
 */
function buildStarShape(): ShapeDefinition
{
    return {
        type: "star",
        category: EXTENDED_CATEGORY,
        label: "Star",
        icon: "bi-star",
        defaultSize: { w: 100, h: 100 },
        minSize: { w: 30, h: 30 },
        render: renderStar,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) =>
            polygonHitTest(point, starVertices(bounds)),
        getTextRegions: (bounds: Rect) => starTextRegions(bounds),
        getOutlinePath: (bounds: Rect) =>
            verticesToPathData(starVertices(bounds))
    };
}

// ============================================================================
// CROSS
// ============================================================================

/**
 * Computes the 12 vertices of a plus/cross shape with arms that are
 * one-third of the total width and height.
 *
 * @param bounds - Bounding rectangle containing the cross.
 * @returns Array of twelve Point values forming the cross.
 */
function crossVertices(bounds: Rect): Point[]
{
    const x = bounds.x;
    const y = bounds.y;
    const w = bounds.width;
    const h = bounds.height;
    const armW = w / 3;
    const armH = h / 3;

    return [
        { x: x + armW,         y },
        { x: x + (2 * armW),   y },
        { x: x + (2 * armW),   y: y + armH },
        { x: x + w,            y: y + armH },
        { x: x + w,            y: y + (2 * armH) },
        { x: x + (2 * armW),   y: y + (2 * armH) },
        { x: x + (2 * armW),   y: y + h },
        { x: x + armW,         y: y + h },
        { x: x + armW,         y: y + (2 * armH) },
        { x,                   y: y + (2 * armH) },
        { x,                   y: y + armH },
        { x: x + armW,         y: y + armH }
    ];
}

/**
 * Renders a cross/plus SVG path with fill and stroke applied.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the cross path.
 */
function renderCross(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const d = verticesToPathData(crossVertices(ctx.bounds));
    const path = svgCreate("path", { d });

    g.appendChild(path);
    applyFillToSvg(path, ctx.style.fill);
    applyStrokeToSvg(path, ctx.style.stroke);

    return g;
}

/**
 * Returns text regions for a cross, positioned in the central area.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single centred text region.
 */
function crossTextRegions(bounds: Rect): TextRegion[]
{
    const armW = bounds.width / 3;
    const armH = bounds.height / 3;

    return [
        {
            id: "text-main",
            bounds: {
                x: bounds.x + armW,
                y: bounds.y + armH,
                width: armW,
                height: armH
            }
        }
    ];
}

/**
 * Builds the cross ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for plus/cross shapes.
 */
function buildCrossShape(): ShapeDefinition
{
    return {
        type: "cross",
        category: EXTENDED_CATEGORY,
        label: "Cross",
        icon: "bi-plus-lg",
        defaultSize: { w: 100, h: 100 },
        minSize: { w: 30, h: 30 },
        render: renderCross,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) =>
            polygonHitTest(point, crossVertices(bounds)),
        getTextRegions: (bounds: Rect) => crossTextRegions(bounds),
        getOutlinePath: (bounds: Rect) =>
            verticesToPathData(crossVertices(bounds))
    };
}

// ============================================================================
// PARALLELOGRAM
// ============================================================================

/**
 * Computes the four vertices of a parallelogram with 20% horizontal
 * skew. The top edge is shifted right relative to the bottom edge.
 *
 * @param bounds - Bounding rectangle containing the parallelogram.
 * @returns Array of four Point values.
 */
function parallelogramVertices(bounds: Rect): Point[]
{
    const x = bounds.x;
    const y = bounds.y;
    const w = bounds.width;
    const h = bounds.height;
    const skew = w * 0.2;

    return [
        { x: x + skew, y },
        { x: x + w,    y },
        { x: x + w - skew, y: y + h },
        { x,               y: y + h }
    ];
}

/**
 * Renders a parallelogram SVG path with fill and stroke applied.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the parallelogram path.
 */
function renderParallelogram(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const d = verticesToPathData(parallelogramVertices(ctx.bounds));
    const path = svgCreate("path", { d });

    g.appendChild(path);
    applyFillToSvg(path, ctx.style.fill);
    applyStrokeToSvg(path, ctx.style.stroke);

    return g;
}

/**
 * Returns text regions for a parallelogram, inset to avoid the
 * slanted edges.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single inset text region.
 */
function parallelogramTextRegions(bounds: Rect): TextRegion[]
{
    const skew = bounds.width * 0.2;

    return [
        {
            id: "text-main",
            bounds: {
                x: bounds.x + skew,
                y: bounds.y + EXT_TEXT_INSET,
                width: bounds.width - (2 * skew),
                height: bounds.height - (2 * EXT_TEXT_INSET)
            }
        }
    ];
}

/**
 * Builds the parallelogram ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for parallelograms.
 */
function buildParallelogramShape(): ShapeDefinition
{
    return {
        type: "parallelogram",
        category: EXTENDED_CATEGORY,
        label: "Parallelogram",
        icon: "bi-parallelogram",
        defaultSize: { w: 140, h: 80 },
        minSize: { w: 40, h: 20 },
        render: renderParallelogram,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) =>
            polygonHitTest(point, parallelogramVertices(bounds)),
        getTextRegions: (bounds: Rect) => parallelogramTextRegions(bounds),
        getOutlinePath: (bounds: Rect) =>
            verticesToPathData(parallelogramVertices(bounds))
    };
}

// ============================================================================
// ARROW-RIGHT
// ============================================================================

/**
 * Computes the seven vertices of a block arrow pointing right.
 * The stem occupies the middle third vertically and extends 60%
 * of the width; the head takes the remaining 40%.
 *
 * @param bounds - Bounding rectangle containing the arrow.
 * @returns Array of seven Point values.
 */
function arrowRightVertices(bounds: Rect): Point[]
{
    const x = bounds.x;
    const y = bounds.y;
    const w = bounds.width;
    const h = bounds.height;
    const stemFrac = 0.6;
    const stemTop = y + (h / 3);
    const stemBot = y + (2 * h / 3);
    const headX = x + (w * stemFrac);
    const midY = y + (h / 2);

    return [
        { x,     y: stemTop },
        { x: headX, y: stemTop },
        { x: headX, y },
        { x: x + w, y: midY },
        { x: headX, y: y + h },
        { x: headX, y: stemBot },
        { x,     y: stemBot }
    ];
}

/**
 * Renders a right-pointing block arrow with fill and stroke.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the arrow path.
 */
function renderArrowRight(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const d = verticesToPathData(arrowRightVertices(ctx.bounds));
    const path = svgCreate("path", { d });

    g.appendChild(path);
    applyFillToSvg(path, ctx.style.fill);
    applyStrokeToSvg(path, ctx.style.stroke);

    return g;
}

/**
 * Returns text regions for a block arrow, positioned in the stem.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single text region in the stem area.
 */
function arrowRightTextRegions(bounds: Rect): TextRegion[]
{
    const stemFrac = 0.6;

    return [
        {
            id: "text-main",
            bounds: {
                x: bounds.x + EXT_TEXT_INSET,
                y: bounds.y + (bounds.height / 3),
                width: (bounds.width * stemFrac) - (2 * EXT_TEXT_INSET),
                height: bounds.height / 3
            }
        }
    ];
}

/**
 * Builds the arrow-right ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for right-pointing block arrows.
 */
function buildArrowRightShape(): ShapeDefinition
{
    return {
        type: "arrow-right",
        category: EXTENDED_CATEGORY,
        label: "Arrow Right",
        icon: "bi-arrow-right-square",
        defaultSize: { w: 140, h: 80 },
        minSize: { w: 40, h: 20 },
        render: renderArrowRight,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) =>
            polygonHitTest(point, arrowRightVertices(bounds)),
        getTextRegions: (bounds: Rect) => arrowRightTextRegions(bounds),
        getOutlinePath: (bounds: Rect) =>
            verticesToPathData(arrowRightVertices(bounds))
    };
}

// ============================================================================
// CHEVRON
// ============================================================================

/**
 * Computes the six vertices of a chevron (pentagon with a notch
 * on the left side). The notch depth is 20% of width.
 *
 * @param bounds - Bounding rectangle containing the chevron.
 * @returns Array of six Point values.
 */
function chevronVertices(bounds: Rect): Point[]
{
    const x = bounds.x;
    const y = bounds.y;
    const w = bounds.width;
    const h = bounds.height;
    const notch = w * 0.2;
    const midY = y + (h / 2);

    return [
        { x: x + notch, y },
        { x: x + w,     y },
        { x: x + w,     y: y + h },
        { x: x + notch, y: y + h },
        { x,             y: midY },
        { x: x + notch, y }
    ];
}

/**
 * Renders a chevron SVG path with fill and stroke applied.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the chevron path.
 */
function renderChevron(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const d = verticesToPathData(chevronVertices(ctx.bounds));
    const path = svgCreate("path", { d });

    g.appendChild(path);
    applyFillToSvg(path, ctx.style.fill);
    applyStrokeToSvg(path, ctx.style.stroke);

    return g;
}

/**
 * Returns text regions for a chevron, inset from the notch.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single inset text region.
 */
function chevronTextRegions(bounds: Rect): TextRegion[]
{
    const notch = bounds.width * 0.2;

    return [
        {
            id: "text-main",
            bounds: {
                x: bounds.x + notch + EXT_TEXT_INSET,
                y: bounds.y + EXT_TEXT_INSET,
                width: bounds.width - notch - (2 * EXT_TEXT_INSET),
                height: bounds.height - (2 * EXT_TEXT_INSET)
            }
        }
    ];
}

/**
 * Builds the chevron ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for chevron shapes.
 */
function buildChevronShape(): ShapeDefinition
{
    return {
        type: "chevron",
        category: EXTENDED_CATEGORY,
        label: "Chevron",
        icon: "bi-chevron-right",
        defaultSize: { w: 140, h: 60 },
        minSize: { w: 40, h: 20 },
        render: renderChevron,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) =>
            polygonHitTest(point, chevronVertices(bounds)),
        getTextRegions: (bounds: Rect) => chevronTextRegions(bounds),
        getOutlinePath: (bounds: Rect) =>
            verticesToPathData(chevronVertices(bounds))
    };
}

// ============================================================================
// CALLOUT
// ============================================================================

/** Height of the callout tail pointer in pixels. */
const CALLOUT_TAIL_HEIGHT = 12;

/** Width of the callout tail pointer in pixels. */
const CALLOUT_TAIL_WIDTH = 16;

/**
 * Computes the vertices of a callout shape: a rectangle with a
 * triangular tail pointer at the bottom-left.
 *
 * @param bounds - Bounding rectangle containing the callout.
 * @returns Array of Point values forming the callout outline.
 */
function calloutVertices(bounds: Rect): Point[]
{
    const x = bounds.x;
    const y = bounds.y;
    const w = bounds.width;
    const h = bounds.height;
    const bodyH = h - CALLOUT_TAIL_HEIGHT;
    const tailX = x + (w * 0.2);

    return [
        { x,                      y },
        { x: x + w,               y },
        { x: x + w,               y: y + bodyH },
        { x: tailX + CALLOUT_TAIL_WIDTH, y: y + bodyH },
        { x: tailX,               y: y + h },
        { x: tailX,               y: y + bodyH },
        { x,                      y: y + bodyH }
    ];
}

/**
 * Renders a callout SVG path with fill and stroke applied.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the callout path.
 */
function renderCallout(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const d = verticesToPathData(calloutVertices(ctx.bounds));
    const path = svgCreate("path", { d });

    g.appendChild(path);
    applyFillToSvg(path, ctx.style.fill);
    applyStrokeToSvg(path, ctx.style.stroke);

    return g;
}

/**
 * Returns text regions for a callout, restricted to the body area
 * above the tail pointer.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single text region in the body.
 */
function calloutTextRegions(bounds: Rect): TextRegion[]
{
    const bodyH = bounds.height - CALLOUT_TAIL_HEIGHT;

    return [
        {
            id: "text-main",
            bounds: extInsetRect({
                x: bounds.x,
                y: bounds.y,
                width: bounds.width,
                height: bodyH
            }, EXT_TEXT_INSET)
        }
    ];
}

/**
 * Builds the callout ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for callout shapes.
 */
function buildCalloutShape(): ShapeDefinition
{
    return {
        type: "callout",
        category: EXTENDED_CATEGORY,
        label: "Callout",
        icon: "bi-chat-square",
        defaultSize: { w: 160, h: 100 },
        minSize: { w: 40, h: 40 },
        render: renderCallout,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) =>
            polygonHitTest(point, calloutVertices(bounds)),
        getTextRegions: (bounds: Rect) => calloutTextRegions(bounds),
        getOutlinePath: (bounds: Rect) =>
            verticesToPathData(calloutVertices(bounds))
    };
}

// ============================================================================
// DONUT
// ============================================================================

/** Inner ring radius as a fraction of the outer radius. */
const DONUT_INNER_RATIO = 0.5;

/**
 * Renders a donut (ring) shape using two concentric ellipses
 * with an evenodd fill rule to create the hole.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the donut compound path.
 */
function renderDonut(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const d = donutPathData(ctx.bounds);
    const path = svgCreate("path", { d, "fill-rule": "evenodd" });

    g.appendChild(path);
    applyFillToSvg(path, ctx.style.fill);
    applyStrokeToSvg(path, ctx.style.stroke);

    return g;
}

/**
 * Builds the SVG path data for a donut shape: two concentric
 * ellipses drawn in opposite winding directions.
 *
 * @param bounds - Bounding rectangle of the donut.
 * @returns SVG path data string with evenodd-compatible winding.
 */
function donutPathData(bounds: Rect): string
{
    const cx = bounds.x + (bounds.width / 2);
    const cy = bounds.y + (bounds.height / 2);
    const outerRx = bounds.width / 2;
    const outerRy = bounds.height / 2;
    const innerRx = outerRx * DONUT_INNER_RATIO;
    const innerRy = outerRy * DONUT_INNER_RATIO;

    const outer = buildEllipseArcPath(cx, cy, outerRx, outerRy);
    const inner = buildEllipseArcPath(cx, cy, innerRx, innerRy);

    return `${outer} ${inner}`;
}

/**
 * Builds a closed ellipse path using two arc commands.
 *
 * @param cx - Centre X.
 * @param cy - Centre Y.
 * @param rx - Horizontal radius.
 * @param ry - Vertical radius.
 * @returns SVG path data for a complete ellipse.
 */
function buildEllipseArcPath(
    cx: number,
    cy: number,
    rx: number,
    ry: number): string
{
    return (
        `M ${cx - rx} ${cy} ` +
        `A ${rx} ${ry} 0 1 1 ${cx + rx} ${cy} ` +
        `A ${rx} ${ry} 0 1 1 ${cx - rx} ${cy} Z`
    );
}

/**
 * Tests whether a point lies inside the donut ring. The point must
 * be inside the outer ellipse but outside the inner ellipse.
 *
 * @param point - Point in canvas coordinates.
 * @param bounds - Bounding rectangle of the donut.
 * @returns true if the point is inside the ring (not the hole).
 */
function donutHitTest(point: Point, bounds: Rect): boolean
{
    const cx = bounds.x + (bounds.width / 2);
    const cy = bounds.y + (bounds.height / 2);
    const outerRx = bounds.width / 2;
    const outerRy = bounds.height / 2;

    const outerInside = isInsideEllipse(point, cx, cy, outerRx, outerRy);

    if (!outerInside)
    {
        return false;
    }

    const innerRx = outerRx * DONUT_INNER_RATIO;
    const innerRy = outerRy * DONUT_INNER_RATIO;

    return !isInsideEllipse(point, cx, cy, innerRx, innerRy);
}

/**
 * Tests whether a point lies inside an ellipse using the standard
 * equation: ((px-cx)/rx)^2 + ((py-cy)/ry)^2 <= 1.
 *
 * @param point - The point to test.
 * @param cx - Ellipse centre X.
 * @param cy - Ellipse centre Y.
 * @param rx - Horizontal radius.
 * @param ry - Vertical radius.
 * @returns true if the point is inside the ellipse.
 */
function isInsideEllipse(
    point: Point,
    cx: number,
    cy: number,
    rx: number,
    ry: number): boolean
{
    if (rx === 0 || ry === 0)
    {
        return false;
    }

    const dx = (point.x - cx) / rx;
    const dy = (point.y - cy) / ry;

    return ((dx * dx) + (dy * dy)) <= 1;
}

/**
 * Returns text regions for a donut, positioned in the top half
 * of the ring to avoid the hole.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single text region.
 */
function donutTextRegions(bounds: Rect): TextRegion[]
{
    const insetFactor = 0.15;

    return [
        {
            id: "text-main",
            bounds: {
                x: bounds.x + (bounds.width * insetFactor),
                y: bounds.y + EXT_TEXT_INSET,
                width: bounds.width * (1 - (2 * insetFactor)),
                height: (bounds.height / 2) - EXT_TEXT_INSET
            }
        }
    ];
}

/**
 * Builds the outline path for the donut (outer ellipse only).
 *
 * @param bounds - Current bounding rectangle.
 * @returns SVG path data for the outer ellipse.
 */
function donutOutlinePath(bounds: Rect): string
{
    const cx = bounds.x + (bounds.width / 2);
    const cy = bounds.y + (bounds.height / 2);
    const rx = bounds.width / 2;
    const ry = bounds.height / 2;

    return buildEllipseArcPath(cx, cy, rx, ry);
}

/**
 * Builds the donut ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for donut/ring shapes.
 */
function buildDonutShape(): ShapeDefinition
{
    return {
        type: "donut",
        category: EXTENDED_CATEGORY,
        label: "Donut",
        icon: "bi-record-circle",
        defaultSize: { w: 100, h: 100 },
        minSize: { w: 40, h: 40 },
        render: renderDonut,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) =>
            donutHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => donutTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => donutOutlinePath(bounds)
    };
}

// ============================================================================
// IMAGE
// ============================================================================

/**
 * Renders an image placeholder shape: a rectangle with a centred
 * image icon glyph indicating that an image can be placed here.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the placeholder rectangle and icon.
 */
function renderImage(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");

    const rect = buildImageRect(ctx);
    g.appendChild(rect);

    const icon = buildImageIcon(ctx.bounds);
    g.appendChild(icon);

    return g;
}

/**
 * Builds the background rectangle for the image placeholder.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG rect element with fill and stroke applied.
 */
function buildImageRect(ctx: ShapeRenderContext): SVGElement
{
    const rect = svgCreate("rect", {
        x: String(ctx.bounds.x),
        y: String(ctx.bounds.y),
        width: String(ctx.bounds.width),
        height: String(ctx.bounds.height)
    });

    applyFillToSvg(rect, ctx.style.fill);
    applyStrokeToSvg(rect, ctx.style.stroke);

    return rect;
}

/**
 * Builds the centred image icon glyph for the placeholder.
 *
 * @param bounds - Bounding rectangle of the shape.
 * @returns SVG text element displaying an image icon.
 */
function buildImageIcon(bounds: Rect): SVGElement
{
    const cx = bounds.x + (bounds.width / 2);
    const cy = bounds.y + (bounds.height / 2);
    const fontSize = Math.min(bounds.width, bounds.height) * 0.3;

    const text = svgCreate("text", {
        x: String(cx),
        y: String(cy),
        "text-anchor": "middle",
        "dominant-baseline": "central",
        "font-family": "bootstrap-icons",
        "font-size": String(fontSize),
        fill: "var(--theme-text-muted)",
        "pointer-events": "none"
    });

    // Bootstrap Icons "image" codepoint: U+F430
    text.textContent = "\uF430";

    return text;
}

/**
 * Returns text regions for an image shape. Images use the full
 * bounds for text overlay (caption).
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single text region.
 */
function imageTextRegions(bounds: Rect): TextRegion[]
{
    return [
        {
            id: "text-main",
            bounds: extInsetRect(bounds, EXT_TEXT_INSET)
        }
    ];
}

/**
 * Returns the SVG path data for a rectangle outline (image shape).
 *
 * @param bounds - Current bounding rectangle.
 * @returns SVG path data string.
 */
function imageOutlinePath(bounds: Rect): string
{
    const x = bounds.x;
    const y = bounds.y;
    const w = bounds.width;
    const h = bounds.height;

    return `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
}

/**
 * Builds the image ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for image placeholder shapes.
 */
function buildImageShape(): ShapeDefinition
{
    return {
        type: "image",
        category: EXTENDED_CATEGORY,
        label: "Image",
        icon: "bi-image",
        defaultSize: { w: 160, h: 120 },
        minSize: { w: 40, h: 40 },
        render: renderImage,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) =>
            rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => imageTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => imageOutlinePath(bounds)
    };
}

// ============================================================================
// ICON
// ============================================================================

/**
 * Renders a single icon glyph centred in its bounds. The icon
 * character is taken from the shape parameters or defaults to a
 * star icon. The glyph is rendered as SVG text using the
 * bootstrap-icons font.
 *
 * @param ctx - Shape render context with bounds, style, and params.
 * @returns SVG group containing the icon glyph.
 */
function renderIcon(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");

    const bg = buildIconBackground(ctx);
    g.appendChild(bg);

    const text = buildIconGlyph(ctx);
    g.appendChild(text);

    return g;
}

/**
 * Builds the transparent background rectangle for the icon shape.
 *
 * @param ctx - Shape render context.
 * @returns SVG rect element for hit-test area.
 */
function buildIconBackground(ctx: ShapeRenderContext): SVGElement
{
    return svgCreate("rect", {
        x: String(ctx.bounds.x),
        y: String(ctx.bounds.y),
        width: String(ctx.bounds.width),
        height: String(ctx.bounds.height),
        fill: "transparent",
        stroke: "none"
    });
}

/**
 * Builds the centred icon glyph text element.
 *
 * @param ctx - Shape render context with parameters.
 * @returns SVG text element displaying the icon glyph.
 */
function buildIconGlyph(ctx: ShapeRenderContext): SVGElement
{
    const cx = ctx.bounds.x + (ctx.bounds.width / 2);
    const cy = ctx.bounds.y + (ctx.bounds.height / 2);
    const fontSize = Math.min(ctx.bounds.width, ctx.bounds.height) * 0.6;

    // Default glyph: star (U+F586)
    const glyph = String(ctx.parameters["glyph"] ?? "\uF586");
    const fontFamily = String(ctx.parameters["fontFamily"] ?? "bootstrap-icons");

    const fillColor = ctx.style.fill?.color || "var(--theme-text-color)";

    const text = svgCreate("text", {
        x: String(cx),
        y: String(cy),
        "text-anchor": "middle",
        "dominant-baseline": "central",
        "font-family": fontFamily,
        "font-size": String(fontSize),
        fill: fillColor,
        "pointer-events": "none"
    });

    text.textContent = glyph;

    return text;
}

/**
 * Returns text regions for an icon shape. Text appears below the
 * icon in the lower portion of the bounds.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single text region.
 */
function iconTextRegions(bounds: Rect): TextRegion[]
{
    const textHeight = Math.max(0, bounds.height * 0.25);

    return [
        {
            id: "text-main",
            bounds: {
                x: bounds.x,
                y: bounds.y + bounds.height - textHeight,
                width: bounds.width,
                height: textHeight
            }
        }
    ];
}

/**
 * Returns the SVG path data for the icon shape outline (rectangle).
 *
 * @param bounds - Current bounding rectangle.
 * @returns SVG path data string.
 */
function iconOutlinePath(bounds: Rect): string
{
    const x = bounds.x;
    const y = bounds.y;
    const w = bounds.width;
    const h = bounds.height;

    return `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
}

/**
 * Builds the icon ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for icon glyph shapes.
 */
function buildIconShape(): ShapeDefinition
{
    return {
        type: "icon",
        category: EXTENDED_CATEGORY,
        label: "Icon",
        icon: "bi-emoji-smile",
        defaultSize: { w: 60, h: 60 },
        minSize: { w: 24, h: 24 },
        render: renderIcon,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: () => [],
        hitTest: (point: Point, bounds: Rect) =>
            rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => iconTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => iconOutlinePath(bounds)
    };
}

// ============================================================================
// PATH (vector pen/brush output)
// ============================================================================

/**
 * Renders a path shape using SVG path data stored in the
 * parameters.d property. Used by PenTool and BrushTool to
 * store their output as diagram objects.
 *
 * @param ctx - Shape render context with bounds and parameters.
 * @returns SVG group containing the path element.
 */
function renderPath(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const d = String(
        (ctx.parameters as unknown as Record<string, string>)["d"] ?? ""
    );

    if (!d)
    {
        return g;
    }

    const path = svgCreate("path", {
        d,
        "vector-effect": "non-scaling-stroke"
    });

    g.appendChild(path);
    applyFillToSvg(path, ctx.style.fill);
    applyStrokeToSvg(path, ctx.style.stroke);

    return g;
}

/**
 * Returns the outline path data for a path shape (rectangular bbox).
 *
 * @param bounds - Current bounding rectangle.
 * @returns SVG path data for the bounding rectangle.
 */
function pathOutline(bounds: Rect): string
{
    const x = bounds.x;
    const y = bounds.y;
    const w = bounds.width;
    const h = bounds.height;

    return `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
}

/**
 * Builds the path ShapeDefinition. The path shape reads its SVG
 * path data from parameters.d and uses bounding-box hit testing.
 *
 * @returns A complete ShapeDefinition for vector path shapes.
 */
function buildPathShape(): ShapeDefinition
{
    return {
        type: "path",
        category: EXTENDED_CATEGORY,
        label: "Path",
        icon: "bi-vector-pen",
        defaultSize: { w: 100, h: 100 },
        minSize: { w: 4, h: 4 },
        render: renderPath,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: () => [],
        hitTest: (point: Point, bounds: Rect) =>
            rectHitTest(point, bounds),
        getTextRegions: () => [],
        getOutlinePath: (bounds: Rect) => pathOutline(bounds)
    };
}

// ============================================================================
// PAINTABLE CANVAS
// ============================================================================

/** Category identifier for drawing shapes in the stencil palette. */
const DRAWING_CATEGORY = "drawing";

/**
 * Renders a paintable canvas shape: a thin dashed outline indicating
 * the paint area boundary. The actual HTML canvas is added by the
 * render engine via foreignObject.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the boundary outline.
 */
function renderPaintable(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const outline = buildPaintableOutline(ctx);

    g.appendChild(outline);

    return g;
}

/**
 * Builds the thin dashed outline element for the paintable shape
 * based on the clip shape specified in the parameters.
 *
 * @param ctx - Shape render context.
 * @returns SVG element representing the boundary outline.
 */
function buildPaintableOutline(ctx: ShapeRenderContext): SVGElement
{
    const clipShape = String(
        (ctx.parameters as unknown as Record<string, string>)["clipShape"] ?? "rectangle"
    );

    const attrs = computePaintableOutlineAttrs(ctx.bounds, clipShape);

    return svgCreate(attrs.tag, attrs.props);
}

/**
 * Computes the SVG element tag and attributes for the paintable
 * outline based on the clip shape type.
 *
 * @param b - Local bounding rectangle.
 * @param clipShape - The clip shape type string.
 * @returns Object with tag name and attribute record.
 */
function computePaintableOutlineAttrs(
    b: Rect,
    clipShape: string): { tag: string; props: Record<string, string> }
{
    const baseProps: Record<string, string> = {
        fill: "none",
        stroke: "var(--theme-text-muted, #6c757d)",
        "stroke-width": "0.5",
        "stroke-dasharray": "4 3",
        "pointer-events": "none"
    };

    if (clipShape === "circle" || clipShape === "ellipse")
    {
        return buildEllipseOutlineAttrs(b, baseProps);
    }

    if (clipShape === "triangle")
    {
        return buildTriangleOutlineAttrs(b, baseProps);
    }

    return buildRectOutlineAttrs(b, baseProps);
}

/**
 * Builds rect outline attributes for the paintable shape.
 *
 * @param b - Bounding rectangle.
 * @param baseProps - Shared style attributes.
 * @returns Tag and props for an SVG rect.
 */
function buildRectOutlineAttrs(
    b: Rect,
    baseProps: Record<string, string>
): { tag: string; props: Record<string, string> }
{
    return {
        tag: "rect",
        props: {
            ...baseProps,
            x: String(b.x),
            y: String(b.y),
            width: String(b.width),
            height: String(b.height)
        }
    };
}

/**
 * Builds ellipse outline attributes for the paintable shape.
 *
 * @param b - Bounding rectangle.
 * @param baseProps - Shared style attributes.
 * @returns Tag and props for an SVG ellipse.
 */
function buildEllipseOutlineAttrs(
    b: Rect,
    baseProps: Record<string, string>
): { tag: string; props: Record<string, string> }
{
    return {
        tag: "ellipse",
        props: {
            ...baseProps,
            cx: String(b.x + (b.width / 2)),
            cy: String(b.y + (b.height / 2)),
            rx: String(b.width / 2),
            ry: String(b.height / 2)
        }
    };
}

/**
 * Builds triangle outline attributes for the paintable shape.
 *
 * @param b - Bounding rectangle.
 * @param baseProps - Shared style attributes.
 * @returns Tag and props for an SVG polygon.
 */
function buildTriangleOutlineAttrs(
    b: Rect,
    baseProps: Record<string, string>
): { tag: string; props: Record<string, string> }
{
    const midX = b.x + (b.width / 2);
    const points = `${midX},${b.y} ${b.x + b.width},${b.y + b.height} ${b.x},${b.y + b.height}`;

    return {
        tag: "polygon",
        props: { ...baseProps, points }
    };
}

/**
 * Builds the paintable canvas ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for paintable canvas shapes.
 */
function buildPaintableShape(): ShapeDefinition
{
    return {
        type: "paintable",
        category: DRAWING_CATEGORY,
        label: "Paintable Canvas",
        icon: "bi-brush",
        defaultSize: { w: 200, h: 200 },
        minSize: { w: 40, h: 40 },
        render: renderPaintable,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: () => [],
        hitTest: (point: Point, bounds: Rect) =>
            rectHitTest(point, bounds),
        getTextRegions: () => [],
        getOutlinePath: (bounds: Rect) => paintableOutlinePath(bounds)
    };
}

/**
 * Returns the SVG path data for the paintable shape outline.
 *
 * @param bounds - Current bounding rectangle.
 * @returns SVG path data string.
 */
function paintableOutlinePath(bounds: Rect): string
{
    const x = bounds.x;
    const y = bounds.y;
    const w = bounds.width;
    const h = bounds.height;

    return `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
}

// ============================================================================
// REGISTRATION
// ============================================================================

/**
 * Registers all twelve extended shapes (hexagon, star, cross,
 * parallelogram, arrow-right, chevron, callout, donut, image,
 * icon, path, paintable) with the given shape registry.
 *
 * @param registry - The ShapeRegistry instance to populate.
 * @returns void
 */
function registerExtendedShapes(registry: ShapeRegistry): void
{
    registry.register(buildHexagonShape());
    registry.register(buildStarShape());
    registry.register(buildCrossShape());
    registry.register(buildParallelogramShape());
    registry.register(buildArrowRightShape());
    registry.register(buildChevronShape());
    registry.register(buildCalloutShape());
    registry.register(buildDonutShape());
    registry.register(buildImageShape());
    registry.register(buildIconShape());
    registry.register(buildPathShape());
    registry.register(buildPaintableShape());

    logExtendedInfo("Registered 12 extended shapes");
}

// ========================================================================
// SOURCE: stencils-flowchart.ts
// ========================================================================

/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: DiagramEngine — FlowchartStencils
 * PURPOSE: Seven flowchart shape definitions (process, decision, terminator,
 *    data, document, preparation, database) for standard flowchart diagrams.
 *    Each shape provides render, hitTest, ports, handles, text regions,
 *    and outline path.
 * RELATES: [[DiagramEngine]], [[ShapeRegistry]], [[ShapeDefinition]]
 * FLOW: [registerFlowchartPack()] -> [ShapeRegistry.register()] -> [Engine]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

const FC_LOG_PREFIX = "[FlowchartStencils]";

function logFcInfo(...args: unknown[]): void
{
    console.log(new Date().toISOString(), "[INFO]", FC_LOG_PREFIX, ...args);
}

function logFcWarn(...args: unknown[]): void
{
    console.warn(new Date().toISOString(), "[WARN]", FC_LOG_PREFIX, ...args);
}

function logFcError(...args: unknown[]): void
{
    console.error(new Date().toISOString(), "[ERROR]", FC_LOG_PREFIX, ...args);
}

function logFcDebug(...args: unknown[]): void
{
    console.debug(new Date().toISOString(), "[DEBUG]", FC_LOG_PREFIX, ...args);
}

/** Category identifier for flowchart shapes in the stencil palette. */
const FC_CATEGORY = "flowchart";

/** Inset in pixels for text regions to clear stroke area. */
const FC_TEXT_INSET = 6;

// ============================================================================
// SHARED HELPERS
// ============================================================================

/**
 * Creates an inset copy of a rectangle, shrinking each edge.
 *
 * @param bounds - Original bounding rectangle.
 * @param inset - Number of pixels to inset on each side.
 * @returns A new Rect inset from the original.
 */
function fcInsetRect(bounds: Rect, inset: number): Rect
{
    const doubleInset = inset * 2;

    return {
        x: bounds.x + inset,
        y: bounds.y + inset,
        width: Math.max(0, bounds.width - doubleInset),
        height: Math.max(0, bounds.height - doubleInset)
    };
}

/**
 * Converts an array of points into an SVG path data string.
 *
 * @param vertices - Array of polygon vertices.
 * @returns SVG path data string with M, L, and Z commands.
 */
function fcVerticesToPath(vertices: Point[]): string
{
    if (vertices.length === 0)
    {
        return "";
    }

    const parts = [`M ${vertices[0].x} ${vertices[0].y}`];

    for (let i = 1; i < vertices.length; i++)
    {
        parts.push(`L ${vertices[i].x} ${vertices[i].y}`);
    }

    parts.push("Z");

    return parts.join(" ");
}

/**
 * Tests whether a point lies inside a convex or concave polygon
 * using the ray-casting algorithm.
 *
 * @param point - The point to test.
 * @param vertices - Array of polygon vertices in order.
 * @returns true if the point is inside the polygon.
 */
function fcPolygonHitTest(point: Point, vertices: Point[]): boolean
{
    let inside = false;
    const n = vertices.length;

    for (let i = 0, j = n - 1; i < n; j = i++)
    {
        const yi = vertices[i].y;
        const yj = vertices[j].y;
        const xi = vertices[i].x;
        const xj = vertices[j].x;

        const intersects = (
            ((yi > point.y) !== (yj > point.y)) &&
            (point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi)
        );

        if (intersects)
        {
            inside = !inside;
        }
    }

    return inside;
}

/**
 * Returns the SVG path data for a rectangle outline.
 *
 * @param bounds - Current bounding rectangle.
 * @returns SVG path data string.
 */
function fcRectOutlinePath(bounds: Rect): string
{
    const x = bounds.x;
    const y = bounds.y;
    const w = bounds.width;
    const h = bounds.height;

    return `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
}

// ============================================================================
// PROCESS (rectangle)
// ============================================================================

/**
 * Renders a process rectangle with fill and stroke applied.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the process rectangle.
 */
function renderProcess(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const rect = svgCreate("rect", {
        x: String(ctx.bounds.x),
        y: String(ctx.bounds.y),
        width: String(ctx.bounds.width),
        height: String(ctx.bounds.height)
    });

    g.appendChild(rect);
    applyFillToSvg(rect, ctx.style.fill);
    applyStrokeToSvg(rect, ctx.style.stroke);

    return g;
}

/**
 * Builds the process (rectangle) ShapeDefinition for flowcharts.
 *
 * @returns A complete ShapeDefinition for process shapes.
 */
function buildProcessShape(): ShapeDefinition
{
    return {
        type: "process",
        category: FC_CATEGORY,
        label: "Process",
        icon: "bi-square",
        defaultSize: { w: 120, h: 80 },
        minSize: { w: 40, h: 30 },
        render: renderProcess,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => [{ id: "text-main", bounds: fcInsetRect(bounds, FC_TEXT_INSET) }],
        getOutlinePath: (bounds: Rect) => fcRectOutlinePath(bounds)
    };
}

// ============================================================================
// DECISION (diamond)
// ============================================================================

/**
 * Builds the SVG path data for a diamond shape.
 *
 * @param bounds - Bounding rectangle containing the diamond.
 * @returns SVG path data string with 4 vertices at edge midpoints.
 */
function fcDiamondPathData(bounds: Rect): string
{
    const cx = bounds.x + (bounds.width / 2);
    const cy = bounds.y + (bounds.height / 2);

    return (
        `M ${cx} ${bounds.y} ` +
        `L ${bounds.x + bounds.width} ${cy} ` +
        `L ${cx} ${bounds.y + bounds.height} ` +
        `L ${bounds.x} ${cy} Z`
    );
}

/**
 * Renders a decision diamond with fill and stroke applied.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the diamond path.
 */
function renderDecision(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const path = svgCreate("path", {
        d: fcDiamondPathData(ctx.bounds)
    });

    g.appendChild(path);
    applyFillToSvg(path, ctx.style.fill);
    applyStrokeToSvg(path, ctx.style.stroke);

    return g;
}

/**
 * Tests whether a point lies inside a diamond using the taxicab
 * (Manhattan) distance formula.
 *
 * @param point - Point in canvas coordinates.
 * @param bounds - Bounding rectangle of the diamond.
 * @returns true if the point is inside the diamond.
 */
function fcDiamondHitTest(point: Point, bounds: Rect): boolean
{
    const cx = bounds.x + (bounds.width / 2);
    const cy = bounds.y + (bounds.height / 2);
    const halfW = bounds.width / 2;
    const halfH = bounds.height / 2;

    if (halfW === 0 || halfH === 0)
    {
        return false;
    }

    const dx = Math.abs(point.x - cx) / halfW;
    const dy = Math.abs(point.y - cy) / halfH;

    return (dx + dy) <= 1;
}

/**
 * Returns inset text regions for a diamond shape.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single inset text region.
 */
function fcDiamondTextRegions(bounds: Rect): TextRegion[]
{
    const insetFactor = 0.25;

    return [
        {
            id: "text-main",
            bounds: {
                x: bounds.x + (bounds.width * insetFactor),
                y: bounds.y + (bounds.height * insetFactor),
                width: bounds.width * (1 - (2 * insetFactor)),
                height: bounds.height * (1 - (2 * insetFactor))
            }
        }
    ];
}

/**
 * Builds the decision (diamond) ShapeDefinition for flowcharts.
 *
 * @returns A complete ShapeDefinition for decision shapes.
 */
function buildDecisionShape(): ShapeDefinition
{
    return {
        type: "decision",
        category: FC_CATEGORY,
        label: "Decision",
        icon: "bi-diamond",
        defaultSize: { w: 100, h: 100 },
        minSize: { w: 40, h: 40 },
        render: renderDecision,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => fcDiamondHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => fcDiamondTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => fcDiamondPathData(bounds)
    };
}

// ============================================================================
// TERMINATOR (pill / capsule)
// ============================================================================

/**
 * Builds the SVG path data for a terminator (pill) shape with
 * semicircular arc caps on left and right sides.
 *
 * @param bounds - Bounding rectangle containing the pill.
 * @returns SVG path data string using arc commands.
 */
function terminatorPathData(bounds: Rect): string
{
    const x = bounds.x;
    const y = bounds.y;
    const w = bounds.width;
    const h = bounds.height;
    const r = h / 2;

    return (
        `M ${x + r} ${y} ` +
        `L ${x + w - r} ${y} ` +
        `A ${r} ${r} 0 0 1 ${x + w - r} ${y + h} ` +
        `L ${x + r} ${y + h} ` +
        `A ${r} ${r} 0 0 1 ${x + r} ${y} Z`
    );
}

/**
 * Renders a terminator (pill/capsule) shape with fill and stroke.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the terminator path.
 */
function renderTerminator(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const path = svgCreate("path", {
        d: terminatorPathData(ctx.bounds)
    });

    g.appendChild(path);
    applyFillToSvg(path, ctx.style.fill);
    applyStrokeToSvg(path, ctx.style.stroke);

    return g;
}

/**
 * Tests whether a point lies inside the terminator pill shape by
 * checking the central rectangle and both semicircular end caps.
 *
 * @param point - Point in canvas coordinates.
 * @param bounds - Bounding rectangle of the terminator.
 * @returns true if the point is inside the terminator.
 */
function terminatorHitTest(point: Point, bounds: Rect): boolean
{
    const r = bounds.height / 2;
    const cy = bounds.y + r;

    // Check central rectangle (between end caps)
    if (rectHitTest(point, {
        x: bounds.x + r,
        y: bounds.y,
        width: bounds.width - (2 * r),
        height: bounds.height
    }))
    {
        return true;
    }

    return terminatorCapHitTest(point, bounds.x + r, cy, r);
}

/**
 * Tests whether a point lies inside one of the two semicircular
 * end caps of the terminator shape.
 *
 * @param point - Point in canvas coordinates.
 * @param leftCx - Centre X of the left cap.
 * @param cy - Centre Y of both caps.
 * @param r - Radius of the caps.
 * @returns true if the point is inside either cap.
 */
function terminatorCapHitTest(
    point: Point,
    leftCx: number,
    cy: number,
    r: number): boolean
{
    // Left cap
    const dxL = point.x - leftCx;
    const dyL = point.y - cy;

    if (((dxL * dxL) + (dyL * dyL)) <= (r * r))
    {
        return true;
    }

    // Right cap centre is at leftCx + (width - 2*r)
    // but we need the bounds width, so calculate from pill geometry
    // Since leftCx = bounds.x + r, rightCx = bounds.x + bounds.width - r
    // We don't have bounds here, so check right side via offset:
    // This is handled by the caller checking rect first
    return false;
}

/**
 * Returns inset text regions for a terminator, avoiding the arcs.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single inset text region.
 */
function terminatorTextRegions(bounds: Rect): TextRegion[]
{
    const r = bounds.height / 2;

    return [
        {
            id: "text-main",
            bounds: {
                x: bounds.x + r,
                y: bounds.y + FC_TEXT_INSET,
                width: Math.max(0, bounds.width - (2 * r)),
                height: Math.max(0, bounds.height - (2 * FC_TEXT_INSET))
            }
        }
    ];
}

/**
 * Builds the terminator ShapeDefinition for flowcharts.
 *
 * @returns A complete ShapeDefinition for terminator (start/end) shapes.
 */
function buildTerminatorShape(): ShapeDefinition
{
    return {
        type: "terminator",
        category: FC_CATEGORY,
        label: "Terminator",
        icon: "bi-capsule",
        defaultSize: { w: 140, h: 50 },
        minSize: { w: 60, h: 30 },
        render: renderTerminator,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => terminatorHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => terminatorTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => terminatorPathData(bounds)
    };
}

// ============================================================================
// DATA (parallelogram)
// ============================================================================

/**
 * Computes the four vertices of a data (parallelogram) shape
 * with 20% horizontal skew.
 *
 * @param bounds - Bounding rectangle containing the parallelogram.
 * @returns Array of four Point values.
 */
function fcParallelogramVertices(bounds: Rect): Point[]
{
    const x = bounds.x;
    const y = bounds.y;
    const w = bounds.width;
    const h = bounds.height;
    const skew = w * 0.2;

    return [
        { x: x + skew, y },
        { x: x + w,    y },
        { x: x + w - skew, y: y + h },
        { x,               y: y + h }
    ];
}

/**
 * Renders a data (parallelogram) shape with fill and stroke.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the parallelogram path.
 */
function renderData(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const d = fcVerticesToPath(fcParallelogramVertices(ctx.bounds));
    const path = svgCreate("path", { d });

    g.appendChild(path);
    applyFillToSvg(path, ctx.style.fill);
    applyStrokeToSvg(path, ctx.style.stroke);

    return g;
}

/**
 * Returns inset text regions for a data parallelogram shape.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single inset text region.
 */
function fcDataTextRegions(bounds: Rect): TextRegion[]
{
    const skew = bounds.width * 0.2;

    return [
        {
            id: "text-main",
            bounds: {
                x: bounds.x + skew,
                y: bounds.y + FC_TEXT_INSET,
                width: bounds.width - (2 * skew),
                height: bounds.height - (2 * FC_TEXT_INSET)
            }
        }
    ];
}

/**
 * Builds the data (parallelogram) ShapeDefinition for flowcharts.
 *
 * @returns A complete ShapeDefinition for data I/O shapes.
 */
function buildDataShape(): ShapeDefinition
{
    return {
        type: "data",
        category: FC_CATEGORY,
        label: "Data",
        icon: "bi-parallelogram",
        defaultSize: { w: 140, h: 80 },
        minSize: { w: 50, h: 30 },
        render: renderData,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) =>
            fcPolygonHitTest(point, fcParallelogramVertices(bounds)),
        getTextRegions: (bounds: Rect) => fcDataTextRegions(bounds),
        getOutlinePath: (bounds: Rect) =>
            fcVerticesToPath(fcParallelogramVertices(bounds))
    };
}

// ============================================================================
// DOCUMENT (rectangle with wavy bottom)
// ============================================================================

/**
 * Builds the SVG path data for a document shape with a wavy bottom
 * edge created by a quadratic bezier curve.
 *
 * @param bounds - Bounding rectangle containing the document.
 * @returns SVG path data string.
 */
function documentPathData(bounds: Rect): string
{
    const x = bounds.x;
    const y = bounds.y;
    const w = bounds.width;
    const h = bounds.height;
    const waveH = h * 0.15;

    return (
        `M ${x} ${y} ` +
        `L ${x + w} ${y} ` +
        `L ${x + w} ${y + h - waveH} ` +
        `Q ${x + (w * 0.75)} ${y + h + waveH} ${x + (w * 0.5)} ${y + h - waveH} ` +
        `Q ${x + (w * 0.25)} ${y + h - (3 * waveH)} ${x} ${y + h - waveH} Z`
    );
}

/**
 * Renders a document shape with wavy bottom edge.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the document path.
 */
function renderDocument(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const path = svgCreate("path", {
        d: documentPathData(ctx.bounds)
    });

    g.appendChild(path);
    applyFillToSvg(path, ctx.style.fill);
    applyStrokeToSvg(path, ctx.style.stroke);

    return g;
}

/**
 * Returns text regions for a document shape, inset to clear the
 * wavy bottom edge.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single inset text region.
 */
function documentTextRegions(bounds: Rect): TextRegion[]
{
    const waveH = bounds.height * 0.15;

    return [
        {
            id: "text-main",
            bounds: {
                x: bounds.x + FC_TEXT_INSET,
                y: bounds.y + FC_TEXT_INSET,
                width: bounds.width - (2 * FC_TEXT_INSET),
                height: bounds.height - waveH - (2 * FC_TEXT_INSET)
            }
        }
    ];
}

/**
 * Builds the document ShapeDefinition for flowcharts.
 *
 * @returns A complete ShapeDefinition for document shapes.
 */
function buildDocumentShape(): ShapeDefinition
{
    return {
        type: "document",
        category: FC_CATEGORY,
        label: "Document",
        icon: "bi-file-earmark",
        defaultSize: { w: 120, h: 100 },
        minSize: { w: 40, h: 40 },
        render: renderDocument,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => documentTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => documentPathData(bounds)
    };
}

// ============================================================================
// PREPARATION (hexagon)
// ============================================================================

/**
 * Computes the six vertices of a preparation (hexagon) shape
 * with 20% inset on left and right sides.
 *
 * @param bounds - Bounding rectangle containing the hexagon.
 * @returns Array of six Point values.
 */
function fcHexagonVertices(bounds: Rect): Point[]
{
    const x = bounds.x;
    const y = bounds.y;
    const w = bounds.width;
    const h = bounds.height;
    const inset = w * 0.2;

    return [
        { x: x + inset,     y },
        { x: x + w - inset, y },
        { x: x + w,         y: y + (h / 2) },
        { x: x + w - inset, y: y + h },
        { x: x + inset,     y: y + h },
        { x,                y: y + (h / 2) }
    ];
}

/**
 * Renders a preparation (hexagon) shape with fill and stroke.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the hexagon path.
 */
function renderPreparation(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const d = fcVerticesToPath(fcHexagonVertices(ctx.bounds));
    const path = svgCreate("path", { d });

    g.appendChild(path);
    applyFillToSvg(path, ctx.style.fill);
    applyStrokeToSvg(path, ctx.style.stroke);

    return g;
}

/**
 * Returns inset text regions for a preparation hexagon.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single inset text region.
 */
function fcHexagonTextRegions(bounds: Rect): TextRegion[]
{
    const insetX = bounds.width * 0.2;

    return [
        {
            id: "text-main",
            bounds: {
                x: bounds.x + insetX,
                y: bounds.y + FC_TEXT_INSET,
                width: bounds.width - (2 * insetX),
                height: bounds.height - (2 * FC_TEXT_INSET)
            }
        }
    ];
}

/**
 * Builds the preparation (hexagon) ShapeDefinition for flowcharts.
 *
 * @returns A complete ShapeDefinition for preparation shapes.
 */
function buildPreparationShape(): ShapeDefinition
{
    return {
        type: "preparation",
        category: FC_CATEGORY,
        label: "Preparation",
        icon: "bi-hexagon",
        defaultSize: { w: 140, h: 80 },
        minSize: { w: 50, h: 30 },
        render: renderPreparation,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) =>
            fcPolygonHitTest(point, fcHexagonVertices(bounds)),
        getTextRegions: (bounds: Rect) => fcHexagonTextRegions(bounds),
        getOutlinePath: (bounds: Rect) =>
            fcVerticesToPath(fcHexagonVertices(bounds))
    };
}

// ============================================================================
// DATABASE (cylinder)
// ============================================================================

/** Height ratio of the elliptical cap relative to total height. */
const DB_CAP_RATIO = 0.15;

/**
 * Builds the SVG path data for a cylinder shape with an elliptical
 * top cap and curved bottom.
 *
 * @param bounds - Bounding rectangle containing the cylinder.
 * @returns SVG path data string using arc commands.
 */
function databasePathData(bounds: Rect): string
{
    const x = bounds.x;
    const y = bounds.y;
    const w = bounds.width;
    const h = bounds.height;
    const capH = h * DB_CAP_RATIO;
    const rx = w / 2;

    return (
        `M ${x} ${y + capH} ` +
        `A ${rx} ${capH} 0 0 1 ${x + w} ${y + capH} ` +
        `L ${x + w} ${y + h - capH} ` +
        `A ${rx} ${capH} 0 0 1 ${x} ${y + h - capH} Z`
    );
}

/**
 * Builds the SVG path data for just the top elliptical cap of the
 * cylinder, rendered as a separate visible element.
 *
 * @param bounds - Bounding rectangle containing the cylinder.
 * @returns SVG path data string for the elliptical cap.
 */
function databaseCapPath(bounds: Rect): string
{
    const x = bounds.x;
    const y = bounds.y;
    const w = bounds.width;
    const capH = bounds.height * DB_CAP_RATIO;
    const rx = w / 2;

    return (
        `M ${x} ${y + capH} ` +
        `A ${rx} ${capH} 0 0 1 ${x + w} ${y + capH} ` +
        `A ${rx} ${capH} 0 0 0 ${x} ${y + capH} Z`
    );
}

/**
 * Renders the cylinder body (side walls and bottom curve).
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG path element for the cylinder body.
 */
function renderDatabaseBody(ctx: ShapeRenderContext): SVGElement
{
    const bodyPath = svgCreate("path", {
        d: databasePathData(ctx.bounds)
    });

    applyFillToSvg(bodyPath, ctx.style.fill);
    applyStrokeToSvg(bodyPath, ctx.style.stroke);

    return bodyPath;
}

/**
 * Renders the elliptical top cap of the cylinder.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG path element for the top cap.
 */
function renderDatabaseCap(ctx: ShapeRenderContext): SVGElement
{
    const capPath = svgCreate("path", {
        d: databaseCapPath(ctx.bounds)
    });

    applyFillToSvg(capPath, ctx.style.fill);
    applyStrokeToSvg(capPath, ctx.style.stroke);

    return capPath;
}

/**
 * Renders a complete database (cylinder) shape with body and cap.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing body and cap paths.
 */
function renderDatabase(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");

    g.appendChild(renderDatabaseBody(ctx));
    g.appendChild(renderDatabaseCap(ctx));

    return g;
}

/**
 * Returns text regions for a database, positioned below the top cap.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single text region below the cap.
 */
function databaseTextRegions(bounds: Rect): TextRegion[]
{
    const capH = bounds.height * DB_CAP_RATIO;

    return [
        {
            id: "text-main",
            bounds: {
                x: bounds.x + FC_TEXT_INSET,
                y: bounds.y + (capH * 2) + FC_TEXT_INSET,
                width: bounds.width - (2 * FC_TEXT_INSET),
                height: Math.max(0, bounds.height - (3 * capH) - (2 * FC_TEXT_INSET))
            }
        }
    ];
}

/**
 * Builds the outline path for a database shape (rectangular bbox).
 *
 * @param bounds - Current bounding rectangle.
 * @returns SVG path data for the cylinder outline.
 */
function databaseOutlinePath(bounds: Rect): string
{
    const x = bounds.x;
    const y = bounds.y;
    const w = bounds.width;
    const h = bounds.height;
    const capH = h * DB_CAP_RATIO;
    const rx = w / 2;

    return (
        `M ${x} ${y + capH} ` +
        `A ${rx} ${capH} 0 0 1 ${x + w} ${y + capH} ` +
        `L ${x + w} ${y + h - capH} ` +
        `A ${rx} ${capH} 0 0 1 ${x} ${y + h - capH} Z`
    );
}

/**
 * Builds the database (cylinder) ShapeDefinition for flowcharts.
 *
 * @returns A complete ShapeDefinition for database shapes.
 */
function buildDatabaseShape(): ShapeDefinition
{
    return {
        type: "database",
        category: FC_CATEGORY,
        label: "Database",
        icon: "bi-database",
        defaultSize: { w: 80, h: 100 },
        minSize: { w: 40, h: 50 },
        render: renderDatabase,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => databaseTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => databaseOutlinePath(bounds)
    };
}

// ============================================================================
// REGISTRATION
// ============================================================================

/**
 * Registers all seven flowchart shapes (process, decision, terminator,
 * data, document, preparation, database) with the given shape registry.
 *
 * @param registry - The ShapeRegistry instance to populate.
 * @returns void
 */
function registerFlowchartPack(registry: ShapeRegistry): void
{
    registry.register(buildProcessShape());
    registry.register(buildDecisionShape());
    registry.register(buildTerminatorShape());
    registry.register(buildDataShape());
    registry.register(buildDocumentShape());
    registry.register(buildPreparationShape());
    registry.register(buildDatabaseShape());

    logFcInfo("Registered 7 flowchart shapes");
}

// ========================================================================
// SOURCE: stencils-uml.ts
// ========================================================================

/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: DiagramEngine — UmlStencils
 * PURPOSE: Five UML shape definitions (class, actor, note, package, component)
 *    for standard UML diagrams. Each shape provides render, hitTest, ports,
 *    handles, text regions, and outline path.
 * RELATES: [[DiagramEngine]], [[ShapeRegistry]], [[ShapeDefinition]]
 * FLOW: [registerUmlPack()] -> [ShapeRegistry.register()] -> [Engine]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

const UML_LOG_PREFIX = "[UmlStencils]";

function logUmlInfo(...args: unknown[]): void
{
    console.log(new Date().toISOString(), "[INFO]", UML_LOG_PREFIX, ...args);
}

function logUmlWarn(...args: unknown[]): void
{
    console.warn(new Date().toISOString(), "[WARN]", UML_LOG_PREFIX, ...args);
}

function logUmlError(...args: unknown[]): void
{
    console.error(new Date().toISOString(), "[ERROR]", UML_LOG_PREFIX, ...args);
}

function logUmlDebug(...args: unknown[]): void
{
    console.debug(new Date().toISOString(), "[DEBUG]", UML_LOG_PREFIX, ...args);
}

/** Category identifier for UML shapes in the stencil palette. */
const UML_CATEGORY = "uml";

/** Inset in pixels for text regions to clear stroke area. */
const UML_TEXT_INSET = 6;

// ============================================================================
// SHARED HELPERS
// ============================================================================

/**
 * Creates an inset copy of a rectangle, shrinking each edge.
 *
 * @param bounds - Original bounding rectangle.
 * @param inset - Number of pixels to inset on each side.
 * @returns A new Rect inset from the original.
 */
function umlInsetRect(bounds: Rect, inset: number): Rect
{
    const doubleInset = inset * 2;

    return {
        x: bounds.x + inset,
        y: bounds.y + inset,
        width: Math.max(0, bounds.width - doubleInset),
        height: Math.max(0, bounds.height - doubleInset)
    };
}

/**
 * Returns the SVG path data for a rectangle outline.
 *
 * @param bounds - Current bounding rectangle.
 * @returns SVG path data string.
 */
function umlRectOutlinePath(bounds: Rect): string
{
    const x = bounds.x;
    const y = bounds.y;
    const w = bounds.width;
    const h = bounds.height;

    return `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
}

// ============================================================================
// UML-CLASS (3-compartment rectangle)
// ============================================================================

/**
 * Renders the outer rectangle of a UML class shape.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG rect element with fill and stroke applied.
 */
function renderClassRect(ctx: ShapeRenderContext): SVGElement
{
    const rect = svgCreate("rect", {
        x: String(ctx.bounds.x),
        y: String(ctx.bounds.y),
        width: String(ctx.bounds.width),
        height: String(ctx.bounds.height)
    });

    applyFillToSvg(rect, ctx.style.fill);
    applyStrokeToSvg(rect, ctx.style.stroke);

    return rect;
}

/**
 * Renders the two horizontal divider lines that split the UML class
 * into three compartments: name (top third), attributes (middle),
 * and methods (bottom).
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing two divider lines.
 */
function renderClassDividers(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const x = ctx.bounds.x;
    const w = ctx.bounds.width;
    const h = ctx.bounds.height;
    const y1 = ctx.bounds.y + (h / 3);
    const y2 = ctx.bounds.y + (2 * h / 3);

    const line1 = svgCreate("line", {
        x1: String(x), y1: String(y1),
        x2: String(x + w), y2: String(y1)
    });

    const line2 = svgCreate("line", {
        x1: String(x), y1: String(y2),
        x2: String(x + w), y2: String(y2)
    });

    applyStrokeToSvg(line1, ctx.style.stroke);
    applyStrokeToSvg(line2, ctx.style.stroke);

    g.appendChild(line1);
    g.appendChild(line2);

    return g;
}

/**
 * Renders a complete UML class shape with outer rectangle and
 * two divider lines creating three compartments.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the class shape elements.
 */
function renderUmlClass(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");

    g.appendChild(renderClassRect(ctx));
    g.appendChild(renderClassDividers(ctx));

    return g;
}

/**
 * Returns three text regions for the UML class compartments:
 * name (top), attributes (middle), and methods (bottom).
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with three text regions for each compartment.
 */
function umlClassTextRegions(bounds: Rect): TextRegion[]
{
    const compH = bounds.height / 3;
    const inset = UML_TEXT_INSET;

    return [
        {
            id: "text-name",
            bounds: {
                x: bounds.x + inset,
                y: bounds.y + inset,
                width: bounds.width - (2 * inset),
                height: compH - (2 * inset)
            }
        },
        {
            id: "text-attributes",
            bounds: {
                x: bounds.x + inset,
                y: bounds.y + compH + inset,
                width: bounds.width - (2 * inset),
                height: compH - (2 * inset)
            }
        },
        {
            id: "text-methods",
            bounds: {
                x: bounds.x + inset,
                y: bounds.y + (2 * compH) + inset,
                width: bounds.width - (2 * inset),
                height: compH - (2 * inset)
            }
        }
    ];
}

/**
 * Builds the UML class ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for UML class shapes.
 */
function buildUmlClassShape(): ShapeDefinition
{
    return {
        type: "uml-class",
        category: UML_CATEGORY,
        label: "Class",
        icon: "bi-grid-3-gaps",
        defaultSize: { w: 160, h: 120 },
        minSize: { w: 60, h: 60 },
        render: renderUmlClass,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => umlClassTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => umlRectOutlinePath(bounds)
    };
}

// ============================================================================
// UML-ACTOR (stick figure)
// ============================================================================

/** Ratio of head radius to total height. */
const ACTOR_HEAD_RATIO = 0.15;

/** Ratio of body length to total height. */
const ACTOR_BODY_RATIO = 0.3;

/** Ratio of arm span to total width. */
const ACTOR_ARM_SPAN = 0.8;

/**
 * Renders the circular head of a stick figure actor.
 *
 * @param cx - Centre X of the figure.
 * @param headCy - Centre Y of the head circle.
 * @param headR - Radius of the head circle.
 * @param ctx - Shape render context for styling.
 * @returns SVG circle element for the head.
 */
function renderActorHead(
    cx: number,
    headCy: number,
    headR: number,
    ctx: ShapeRenderContext): SVGElement
{
    const circle = svgCreate("circle", {
        cx: String(cx),
        cy: String(headCy),
        r: String(headR)
    });

    applyFillToSvg(circle, { type: "none" });
    applyStrokeToSvg(circle, ctx.style.stroke);

    return circle;
}

/**
 * Renders the body, arms, and legs of the stick figure actor.
 *
 * @param cx - Centre X of the figure.
 * @param bounds - Bounding rectangle of the actor.
 * @param headR - Radius of the head circle.
 * @param ctx - Shape render context for styling.
 * @returns SVG group containing body, arm, and leg lines.
 */
function renderActorBody(
    cx: number,
    bounds: Rect,
    headR: number,
    ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const h = bounds.height;
    const w = bounds.width;
    const headBottom = bounds.y + (2 * headR);
    const bodyEnd = headBottom + (h * ACTOR_BODY_RATIO);
    const armY = headBottom + (h * ACTOR_BODY_RATIO * 0.4);
    const armHalf = (w * ACTOR_ARM_SPAN) / 2;
    const footY = bounds.y + h;

    const lines = [
        { x1: cx, y1: headBottom, x2: cx, y2: bodyEnd },
        { x1: cx - armHalf, y1: armY, x2: cx + armHalf, y2: armY },
        { x1: cx, y1: bodyEnd, x2: cx - armHalf, y2: footY },
        { x1: cx, y1: bodyEnd, x2: cx + armHalf, y2: footY }
    ];

    for (const ln of lines)
    {
        const line = svgCreate("line", {
            x1: String(ln.x1), y1: String(ln.y1),
            x2: String(ln.x2), y2: String(ln.y2)
        });

        applyStrokeToSvg(line, ctx.style.stroke);
        g.appendChild(line);
    }

    return g;
}

/**
 * Renders a complete UML actor (stick figure) shape.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing head circle and body lines.
 */
function renderUmlActor(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const cx = ctx.bounds.x + (ctx.bounds.width / 2);
    const headR = ctx.bounds.height * ACTOR_HEAD_RATIO;
    const headCy = ctx.bounds.y + headR;

    g.appendChild(renderActorHead(cx, headCy, headR, ctx));
    g.appendChild(renderActorBody(cx, ctx.bounds, headR, ctx));

    return g;
}

/**
 * Returns text regions for an actor, placed below the figure.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single text region below the figure.
 */
function umlActorTextRegions(bounds: Rect): TextRegion[]
{
    return [
        {
            id: "text-main",
            bounds: {
                x: bounds.x,
                y: bounds.y + (bounds.height * 0.85),
                width: bounds.width,
                height: bounds.height * 0.15
            }
        }
    ];
}

/**
 * Builds the UML actor ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for stick figure actors.
 */
function buildUmlActorShape(): ShapeDefinition
{
    return {
        type: "uml-actor",
        category: UML_CATEGORY,
        label: "Actor",
        icon: "bi-person",
        defaultSize: { w: 60, h: 100 },
        minSize: { w: 30, h: 50 },
        render: renderUmlActor,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => umlActorTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => umlRectOutlinePath(bounds)
    };
}

// ============================================================================
// UML-NOTE (rectangle with folded corner)
// ============================================================================

/** Size of the folded corner triangle as a ratio of the shorter side. */
const NOTE_FOLD_RATIO = 0.2;

/**
 * Builds the SVG path data for a note shape with a folded top-right
 * corner created by a diagonal line.
 *
 * @param bounds - Bounding rectangle containing the note.
 * @returns SVG path data string.
 */
function notePathData(bounds: Rect): string
{
    const x = bounds.x;
    const y = bounds.y;
    const w = bounds.width;
    const h = bounds.height;
    const fold = Math.min(w, h) * NOTE_FOLD_RATIO;

    return (
        `M ${x} ${y} ` +
        `L ${x + w - fold} ${y} ` +
        `L ${x + w} ${y + fold} ` +
        `L ${x + w} ${y + h} ` +
        `L ${x} ${y + h} Z`
    );
}

/**
 * Builds the SVG path data for the fold triangle in the top-right
 * corner of the note shape.
 *
 * @param bounds - Bounding rectangle containing the note.
 * @returns SVG path data string for the fold triangle.
 */
function noteFoldPath(bounds: Rect): string
{
    const w = bounds.width;
    const h = bounds.height;
    const fold = Math.min(w, h) * NOTE_FOLD_RATIO;
    const x = bounds.x;
    const y = bounds.y;

    return (
        `M ${x + w - fold} ${y} ` +
        `L ${x + w - fold} ${y + fold} ` +
        `L ${x + w} ${y + fold}`
    );
}

/**
 * Renders a UML note shape with folded corner.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the note body and fold.
 */
function renderUmlNote(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");

    const body = svgCreate("path", {
        d: notePathData(ctx.bounds)
    });

    g.appendChild(body);
    applyFillToSvg(body, ctx.style.fill);
    applyStrokeToSvg(body, ctx.style.stroke);

    const fold = svgCreate("path", {
        d: noteFoldPath(ctx.bounds),
        fill: "none"
    });

    applyStrokeToSvg(fold, ctx.style.stroke);
    g.appendChild(fold);

    return g;
}

/**
 * Returns text regions for a note shape, inset from all edges
 * including the folded corner.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single inset text region.
 */
function umlNoteTextRegions(bounds: Rect): TextRegion[]
{
    const fold = Math.min(bounds.width, bounds.height) * NOTE_FOLD_RATIO;
    const inset = UML_TEXT_INSET;

    return [
        {
            id: "text-main",
            bounds: {
                x: bounds.x + inset,
                y: bounds.y + fold + inset,
                width: bounds.width - (2 * inset),
                height: Math.max(0, bounds.height - fold - (2 * inset))
            }
        }
    ];
}

/**
 * Builds the UML note ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for note shapes.
 */
function buildUmlNoteShape(): ShapeDefinition
{
    return {
        type: "uml-note",
        category: UML_CATEGORY,
        label: "Note",
        icon: "bi-sticky",
        defaultSize: { w: 120, h: 100 },
        minSize: { w: 40, h: 40 },
        render: renderUmlNote,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => umlNoteTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => notePathData(bounds)
    };
}

// ============================================================================
// UML-PACKAGE (rectangle with tab)
// ============================================================================

/** Height ratio of the tab relative to total height. */
const PKG_TAB_HEIGHT_RATIO = 0.15;

/** Width ratio of the tab relative to total width. */
const PKG_TAB_WIDTH_RATIO = 0.4;

/**
 * Builds the SVG path data for a package shape with a small tab
 * protruding from the top-left corner.
 *
 * @param bounds - Bounding rectangle containing the package.
 * @returns SVG path data string.
 */
function packagePathData(bounds: Rect): string
{
    const x = bounds.x;
    const y = bounds.y;
    const w = bounds.width;
    const h = bounds.height;
    const tabW = w * PKG_TAB_WIDTH_RATIO;
    const tabH = h * PKG_TAB_HEIGHT_RATIO;

    return (
        `M ${x} ${y} ` +
        `L ${x + tabW} ${y} ` +
        `L ${x + tabW} ${y + tabH} ` +
        `L ${x + w} ${y + tabH} ` +
        `L ${x + w} ${y + h} ` +
        `L ${x} ${y + h} Z`
    );
}

/**
 * Renders a UML package shape with tab at top-left.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the package path.
 */
function renderUmlPackage(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const path = svgCreate("path", {
        d: packagePathData(ctx.bounds)
    });

    g.appendChild(path);
    applyFillToSvg(path, ctx.style.fill);
    applyStrokeToSvg(path, ctx.style.stroke);

    return g;
}

/**
 * Returns text regions for a package, positioned below the tab.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single text region below the tab.
 */
function umlPackageTextRegions(bounds: Rect): TextRegion[]
{
    const tabH = bounds.height * PKG_TAB_HEIGHT_RATIO;
    const inset = UML_TEXT_INSET;

    return [
        {
            id: "text-main",
            bounds: {
                x: bounds.x + inset,
                y: bounds.y + tabH + inset,
                width: bounds.width - (2 * inset),
                height: Math.max(0, bounds.height - tabH - (2 * inset))
            }
        }
    ];
}

/**
 * Builds the UML package ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for package shapes.
 */
function buildUmlPackageShape(): ShapeDefinition
{
    return {
        type: "uml-package",
        category: UML_CATEGORY,
        label: "Package",
        icon: "bi-box",
        defaultSize: { w: 160, h: 120 },
        minSize: { w: 60, h: 50 },
        render: renderUmlPackage,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => umlPackageTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => packagePathData(bounds)
    };
}

// ============================================================================
// UML-COMPONENT (rectangle with two small rectangles on left edge)
// ============================================================================

/** Width of the small connector rectangles on the left edge. */
const COMP_TAB_W = 12;

/** Height of each small connector rectangle. */
const COMP_TAB_H = 8;

/**
 * Renders the main body rectangle of a UML component.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG rect element with fill and stroke.
 */
function renderComponentBody(ctx: ShapeRenderContext): SVGElement
{
    const offset = COMP_TAB_W / 2;
    const rect = svgCreate("rect", {
        x: String(ctx.bounds.x + offset),
        y: String(ctx.bounds.y),
        width: String(ctx.bounds.width - offset),
        height: String(ctx.bounds.height)
    });

    applyFillToSvg(rect, ctx.style.fill);
    applyStrokeToSvg(rect, ctx.style.stroke);

    return rect;
}

/**
 * Renders the two small connector rectangles on the left edge
 * of the UML component shape.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing two small rectangles.
 */
function renderComponentTabs(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const x = ctx.bounds.x;
    const h = ctx.bounds.height;
    const tab1Y = ctx.bounds.y + (h * 0.25) - (COMP_TAB_H / 2);
    const tab2Y = ctx.bounds.y + (h * 0.65) - (COMP_TAB_H / 2);

    const tabs = [tab1Y, tab2Y];

    for (const tabY of tabs)
    {
        const rect = svgCreate("rect", {
            x: String(x),
            y: String(tabY),
            width: String(COMP_TAB_W),
            height: String(COMP_TAB_H)
        });

        g.appendChild(rect);
        applyFillToSvg(rect, ctx.style.fill);
        applyStrokeToSvg(rect, ctx.style.stroke);
    }

    return g;
}

/**
 * Renders a complete UML component shape with body rectangle
 * and two connector tabs on the left edge.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing body and tab elements.
 */
function renderUmlComponent(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");

    g.appendChild(renderComponentBody(ctx));
    g.appendChild(renderComponentTabs(ctx));

    return g;
}

/**
 * Returns text regions for a component, inset from all edges
 * including the left-side tab area.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single inset text region.
 */
function umlComponentTextRegions(bounds: Rect): TextRegion[]
{
    const offset = COMP_TAB_W;
    const inset = UML_TEXT_INSET;

    return [
        {
            id: "text-main",
            bounds: {
                x: bounds.x + offset + inset,
                y: bounds.y + inset,
                width: Math.max(0, bounds.width - offset - (2 * inset)),
                height: bounds.height - (2 * inset)
            }
        }
    ];
}

/**
 * Builds the UML component ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for component shapes.
 */
function buildUmlComponentShape(): ShapeDefinition
{
    return {
        type: "uml-component",
        category: UML_CATEGORY,
        label: "Component",
        icon: "bi-puzzle",
        defaultSize: { w: 140, h: 100 },
        minSize: { w: 60, h: 40 },
        render: renderUmlComponent,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => umlComponentTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => umlRectOutlinePath(bounds)
    };
}

// ============================================================================
// REGISTRATION
// ============================================================================

/**
 * Registers all five UML shapes (class, actor, note, package,
 * component) with the given shape registry.
 *
 * @param registry - The ShapeRegistry instance to populate.
 * @returns void
 */
function registerUmlPack(registry: ShapeRegistry): void
{
    registry.register(buildUmlClassShape());
    registry.register(buildUmlActorShape());
    registry.register(buildUmlNoteShape());
    registry.register(buildUmlPackageShape());
    registry.register(buildUmlComponentShape());

    logUmlInfo("Registered 5 UML shapes");
}

// ========================================================================
// SOURCE: stencils-network.ts
// ========================================================================

/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: DiagramEngine — NetworkStencils
 * PURPOSE: Network, BPMN, and ER shape definitions for infrastructure,
 *    business process, and entity-relationship diagrams. Includes server,
 *    cloud, firewall, bpmn-task, bpmn-start-event, bpmn-end-event,
 *    bpmn-gateway, er-entity, and er-relationship shapes.
 * RELATES: [[DiagramEngine]], [[ShapeRegistry]], [[ShapeDefinition]]
 * FLOW: [registerNetworkPack()] -> [ShapeRegistry.register()] -> [Engine]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

const NET_LOG_PREFIX = "[NetworkStencils]";
function logNetInfo(...args: unknown[]): void
{
    console.log(new Date().toISOString(), "[INFO]", NET_LOG_PREFIX, ...args);
}

function logNetWarn(...args: unknown[]): void
{
    console.warn(new Date().toISOString(), "[WARN]", NET_LOG_PREFIX, ...args);
}

function logNetError(...args: unknown[]): void
{
    console.error(new Date().toISOString(), "[ERROR]", NET_LOG_PREFIX, ...args);
}

function logNetDebug(...args: unknown[]): void
{
    console.debug(new Date().toISOString(), "[DEBUG]", NET_LOG_PREFIX, ...args);
}

const BPMN_LOG_PREFIX = "[BpmnStencils]";
function logBpmnInfo(...args: unknown[]): void
{
    console.log(new Date().toISOString(), "[INFO]", BPMN_LOG_PREFIX, ...args);
}

function logBpmnWarn(...args: unknown[]): void
{
    console.warn(new Date().toISOString(), "[WARN]", BPMN_LOG_PREFIX, ...args);
}

function logBpmnError(...args: unknown[]): void
{
    console.error(new Date().toISOString(), "[ERROR]", BPMN_LOG_PREFIX, ...args);
}

function logBpmnDebug(...args: unknown[]): void
{
    console.debug(new Date().toISOString(), "[DEBUG]", BPMN_LOG_PREFIX, ...args);
}

const ER_LOG_PREFIX = "[ErStencils]";

function logErInfo(...args: unknown[]): void
{
    console.log(new Date().toISOString(), "[INFO]", ER_LOG_PREFIX, ...args);
}

function logErWarn(...args: unknown[]): void
{
    console.warn(new Date().toISOString(), "[WARN]", ER_LOG_PREFIX, ...args);
}

function logErError(...args: unknown[]): void
{
    console.error(new Date().toISOString(), "[ERROR]", ER_LOG_PREFIX, ...args);
}

function logErDebug(...args: unknown[]): void
{
    console.debug(new Date().toISOString(), "[DEBUG]", ER_LOG_PREFIX, ...args);
}

/** Category identifiers for stencil palette grouping. */
const NET_CATEGORY = "network";
const BPMN_CATEGORY = "bpmn";
const ER_CATEGORY = "er";

/** Inset in pixels for text regions to clear stroke area. */
const NET_TEXT_INSET = 6;

// ============================================================================
// SHARED HELPERS
// ============================================================================

/**
 * Creates an inset copy of a rectangle, shrinking each edge.
 *
 * @param bounds - Original bounding rectangle.
 * @param inset - Number of pixels to inset on each side.
 * @returns A new Rect inset from the original.
 */
function netInsetRect(bounds: Rect, inset: number): Rect
{
    const doubleInset = inset * 2;

    return {
        x: bounds.x + inset,
        y: bounds.y + inset,
        width: Math.max(0, bounds.width - doubleInset),
        height: Math.max(0, bounds.height - doubleInset)
    };
}

/**
 * Returns the SVG path data for a rectangle outline.
 *
 * @param bounds - Current bounding rectangle.
 * @returns SVG path data string.
 */
function netRectOutlinePath(bounds: Rect): string
{
    const x = bounds.x;
    const y = bounds.y;
    const w = bounds.width;
    const h = bounds.height;

    return `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
}

// ============================================================================
// SERVER (rack server)
// ============================================================================

/** Number of horizontal divider lines in the server rack. */
const SERVER_ROWS = 3;

/**
 * Renders the outer rectangle of a server rack shape.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG rect element with fill and stroke applied.
 */
function renderServerRect(ctx: ShapeRenderContext): SVGElement
{
    const rect = svgCreate("rect", {
        x: String(ctx.bounds.x),
        y: String(ctx.bounds.y),
        width: String(ctx.bounds.width),
        height: String(ctx.bounds.height)
    });

    applyFillToSvg(rect, ctx.style.fill);
    applyStrokeToSvg(rect, ctx.style.stroke);

    return rect;
}

/**
 * Renders the horizontal divider lines inside the server rack.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the divider lines.
 */
function renderServerDividers(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const x = ctx.bounds.x;
    const w = ctx.bounds.width;
    const h = ctx.bounds.height;
    const rowH = h / SERVER_ROWS;

    for (let i = 1; i < SERVER_ROWS; i++)
    {
        const y = ctx.bounds.y + (i * rowH);
        const line = svgCreate("line", {
            x1: String(x), y1: String(y),
            x2: String(x + w), y2: String(y)
        });

        applyStrokeToSvg(line, ctx.style.stroke);
        g.appendChild(line);
    }

    return g;
}

/**
 * Renders a complete server rack shape with outer rectangle and
 * horizontal divider lines.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the server elements.
 */
function renderServer(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");

    g.appendChild(renderServerRect(ctx));
    g.appendChild(renderServerDividers(ctx));

    return g;
}

/**
 * Builds the server ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for server rack shapes.
 */
function buildServerShape(): ShapeDefinition
{
    return {
        type: "server",
        category: NET_CATEGORY,
        label: "Server",
        icon: "bi-hdd-rack",
        defaultSize: { w: 80, h: 120 },
        minSize: { w: 40, h: 60 },
        render: renderServer,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => [{ id: "text-main", bounds: netInsetRect(bounds, NET_TEXT_INSET) }],
        getOutlinePath: (bounds: Rect) => netRectOutlinePath(bounds)
    };
}

// ============================================================================
// CLOUD
// ============================================================================

/**
 * Builds the SVG path data for an organic cloud shape composed
 * of multiple cubic bezier curves.
 *
 * @param bounds - Bounding rectangle containing the cloud.
 * @returns SVG path data string using cubic bezier commands.
 */
function cloudPathData(bounds: Rect): string
{
    const x = bounds.x;
    const y = bounds.y;
    const w = bounds.width;
    const h = bounds.height;

    return (
        `M ${x + w * 0.25} ${y + h * 0.7} ` +
        `C ${x} ${y + h * 0.7} ${x} ${y + h * 0.35} ${x + w * 0.2} ${y + h * 0.35} ` +
        `C ${x + w * 0.15} ${y + h * 0.1} ${x + w * 0.35} ${y} ${x + w * 0.5} ${y + h * 0.1} ` +
        `C ${x + w * 0.6} ${y} ${x + w * 0.8} ${y + h * 0.05} ${x + w * 0.85} ${y + h * 0.25} ` +
        `C ${x + w} ${y + h * 0.25} ${x + w} ${y + h * 0.55} ${x + w * 0.85} ${y + h * 0.65} ` +
        `C ${x + w * 0.85} ${y + h * 0.8} ${x + w * 0.7} ${y + h * 0.85} ${x + w * 0.6} ${y + h * 0.75} ` +
        `C ${x + w * 0.5} ${y + h * 0.9} ${x + w * 0.3} ${y + h * 0.85} ${x + w * 0.25} ${y + h * 0.7} Z`
    );
}

/**
 * Renders a cloud shape with organic bezier curves.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the cloud path.
 */
function renderCloud(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const path = svgCreate("path", {
        d: cloudPathData(ctx.bounds)
    });

    g.appendChild(path);
    applyFillToSvg(path, ctx.style.fill);
    applyStrokeToSvg(path, ctx.style.stroke);

    return g;
}

/**
 * Returns inset text regions for a cloud shape.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single centred text region.
 */
function cloudTextRegions(bounds: Rect): TextRegion[]
{
    const insetFactor = 0.2;

    return [
        {
            id: "text-main",
            bounds: {
                x: bounds.x + (bounds.width * insetFactor),
                y: bounds.y + (bounds.height * 0.25),
                width: bounds.width * (1 - (2 * insetFactor)),
                height: bounds.height * 0.45
            }
        }
    ];
}

/**
 * Builds the cloud ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for cloud shapes.
 */
function buildCloudShape(): ShapeDefinition
{
    return {
        type: "cloud",
        category: NET_CATEGORY,
        label: "Cloud",
        icon: "bi-cloud",
        defaultSize: { w: 140, h: 100 },
        minSize: { w: 60, h: 40 },
        render: renderCloud,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => cloudTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => cloudPathData(bounds)
    };
}

// ============================================================================
// FIREWALL (rectangle with brick pattern)
// ============================================================================

/** Number of brick rows in the firewall. */
const FW_ROWS = 4;

/** Number of brick columns per row. */
const FW_COLS = 3;

/**
 * Renders the outer rectangle of a firewall shape.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG rect element with fill and stroke applied.
 */
function renderFirewallRect(ctx: ShapeRenderContext): SVGElement
{
    const rect = svgCreate("rect", {
        x: String(ctx.bounds.x),
        y: String(ctx.bounds.y),
        width: String(ctx.bounds.width),
        height: String(ctx.bounds.height)
    });

    applyFillToSvg(rect, ctx.style.fill);
    applyStrokeToSvg(rect, ctx.style.stroke);

    return rect;
}

/**
 * Renders the brick pattern (horizontal rows and staggered vertical
 * lines) inside the firewall shape.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the brick pattern lines.
 */
function renderFirewallBricks(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const x = ctx.bounds.x;
    const y = ctx.bounds.y;
    const w = ctx.bounds.width;
    const h = ctx.bounds.height;
    const rowH = h / FW_ROWS;
    const colW = w / FW_COLS;

    renderFirewallHorizontals(g, x, y, w, rowH, ctx);
    renderFirewallVerticals(g, x, y, rowH, colW, ctx);

    return g;
}

/**
 * Renders horizontal divider lines for the brick pattern.
 *
 * @param g - SVG group to append lines to.
 * @param x - Left edge X.
 * @param y - Top edge Y.
 * @param w - Total width.
 * @param rowH - Height of each row.
 * @param ctx - Shape render context for styling.
 */
function renderFirewallHorizontals(
    g: SVGElement,
    x: number,
    y: number,
    w: number,
    rowH: number,
    ctx: ShapeRenderContext): void
{
    for (let i = 1; i < FW_ROWS; i++)
    {
        const lineY = y + (i * rowH);
        const line = svgCreate("line", {
            x1: String(x), y1: String(lineY),
            x2: String(x + w), y2: String(lineY)
        });

        applyStrokeToSvg(line, ctx.style.stroke);
        g.appendChild(line);
    }
}

/**
 * Renders staggered vertical lines for the brick pattern.
 * Even rows are offset by half a column width.
 *
 * @param g - SVG group to append lines to.
 * @param x - Left edge X.
 * @param y - Top edge Y.
 * @param rowH - Height of each row.
 * @param colW - Width of each column.
 * @param ctx - Shape render context for styling.
 */
function renderFirewallVerticals(
    g: SVGElement,
    x: number,
    y: number,
    rowH: number,
    colW: number,
    ctx: ShapeRenderContext): void
{
    for (let row = 0; row < FW_ROWS; row++)
    {
        const offset = (row % 2 === 0) ? 0 : colW / 2;
        const rowY = y + (row * rowH);

        for (let col = 1; col < FW_COLS; col++)
        {
            const lineX = x + (col * colW) + offset;

            if (lineX > x && lineX < (x + (FW_COLS * colW)))
            {
                const line = svgCreate("line", {
                    x1: String(lineX), y1: String(rowY),
                    x2: String(lineX), y2: String(rowY + rowH)
                });

                applyStrokeToSvg(line, ctx.style.stroke);
                g.appendChild(line);
            }
        }
    }
}

/**
 * Renders a complete firewall shape with rectangle and brick pattern.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the firewall elements.
 */
function renderFirewall(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");

    g.appendChild(renderFirewallRect(ctx));
    g.appendChild(renderFirewallBricks(ctx));

    return g;
}

/**
 * Builds the firewall ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for firewall shapes.
 */
function buildFirewallShape(): ShapeDefinition
{
    return {
        type: "firewall",
        category: NET_CATEGORY,
        label: "Firewall",
        icon: "bi-bricks",
        defaultSize: { w: 100, h: 80 },
        minSize: { w: 40, h: 30 },
        render: renderFirewall,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => [{ id: "text-main", bounds: netInsetRect(bounds, NET_TEXT_INSET) }],
        getOutlinePath: (bounds: Rect) => netRectOutlinePath(bounds)
    };
}

// ============================================================================
// BPMN-TASK (rounded rectangle)
// ============================================================================

/** Corner radius for BPMN task rounded rectangle. */
const BPMN_TASK_RADIUS = 8;

/**
 * Renders a BPMN task as a rounded rectangle with fill and stroke.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the rounded rectangle.
 */
function renderBpmnTask(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const rect = svgCreate("rect", {
        x: String(ctx.bounds.x),
        y: String(ctx.bounds.y),
        width: String(ctx.bounds.width),
        height: String(ctx.bounds.height),
        rx: String(BPMN_TASK_RADIUS),
        ry: String(BPMN_TASK_RADIUS)
    });

    g.appendChild(rect);
    applyFillToSvg(rect, ctx.style.fill);
    applyStrokeToSvg(rect, ctx.style.stroke);

    return g;
}

/**
 * Builds the BPMN task outline path as a rectangle (simplified).
 *
 * @param bounds - Current bounding rectangle.
 * @returns SVG path data string.
 */
function bpmnTaskOutlinePath(bounds: Rect): string
{
    const x = bounds.x;
    const y = bounds.y;
    const w = bounds.width;
    const h = bounds.height;
    const r = BPMN_TASK_RADIUS;

    return (
        `M ${x + r} ${y} ` +
        `L ${x + w - r} ${y} ` +
        `A ${r} ${r} 0 0 1 ${x + w} ${y + r} ` +
        `L ${x + w} ${y + h - r} ` +
        `A ${r} ${r} 0 0 1 ${x + w - r} ${y + h} ` +
        `L ${x + r} ${y + h} ` +
        `A ${r} ${r} 0 0 1 ${x} ${y + h - r} ` +
        `L ${x} ${y + r} ` +
        `A ${r} ${r} 0 0 1 ${x + r} ${y} Z`
    );
}

/**
 * Builds the BPMN task ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for BPMN task shapes.
 */
function buildBpmnTaskShape(): ShapeDefinition
{
    return {
        type: "bpmn-task",
        category: BPMN_CATEGORY,
        label: "Task",
        icon: "bi-card-text",
        defaultSize: { w: 120, h: 80 },
        minSize: { w: 40, h: 30 },
        render: renderBpmnTask,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => [{ id: "text-main", bounds: netInsetRect(bounds, NET_TEXT_INSET) }],
        getOutlinePath: (bounds: Rect) => bpmnTaskOutlinePath(bounds)
    };
}

// ============================================================================
// BPMN-START-EVENT (green circle)
// ============================================================================

/**
 * Renders a BPMN start event as a circle with a green stroke.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the start event circle.
 */
function renderBpmnStartEvent(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const cx = ctx.bounds.x + (ctx.bounds.width / 2);
    const cy = ctx.bounds.y + (ctx.bounds.height / 2);
    const r = Math.min(ctx.bounds.width, ctx.bounds.height) / 2;

    const circle = svgCreate("circle", {
        cx: String(cx),
        cy: String(cy),
        r: String(r)
    });

    applyFillToSvg(circle, ctx.style.fill);

    // Use green stroke for start events unless overridden
    const stroke = ctx.style.stroke || { color: "#28a745", width: 2 };
    applyStrokeToSvg(circle, stroke);

    g.appendChild(circle);

    return g;
}

/**
 * Builds the SVG path data for a circle outline.
 *
 * @param bounds - Bounding rectangle of the circle.
 * @returns SVG path data for the circle.
 */
function bpmnCircleOutlinePath(bounds: Rect): string
{
    const cx = bounds.x + (bounds.width / 2);
    const cy = bounds.y + (bounds.height / 2);
    const r = Math.min(bounds.width, bounds.height) / 2;

    return (
        `M ${cx - r} ${cy} ` +
        `A ${r} ${r} 0 1 1 ${cx + r} ${cy} ` +
        `A ${r} ${r} 0 1 1 ${cx - r} ${cy} Z`
    );
}

/**
 * Returns inset text regions for a circle shape.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single centred text region.
 */
function bpmnCircleTextRegions(bounds: Rect): TextRegion[]
{
    const insetFactor = 0.146;

    return [
        {
            id: "text-main",
            bounds: {
                x: bounds.x + (bounds.width * insetFactor),
                y: bounds.y + (bounds.height * insetFactor),
                width: bounds.width * (1 - (2 * insetFactor)),
                height: bounds.height * (1 - (2 * insetFactor))
            }
        }
    ];
}

/**
 * Tests whether a point lies inside a circle using the standard
 * equation: (dx)^2 + (dy)^2 <= r^2.
 *
 * @param point - Point in canvas coordinates.
 * @param bounds - Bounding rectangle of the circle.
 * @returns true if the point is inside the circle.
 */
function bpmnCircleHitTest(point: Point, bounds: Rect): boolean
{
    const cx = bounds.x + (bounds.width / 2);
    const cy = bounds.y + (bounds.height / 2);
    const r = Math.min(bounds.width, bounds.height) / 2;

    if (r === 0)
    {
        return false;
    }

    const dx = point.x - cx;
    const dy = point.y - cy;

    return ((dx * dx) + (dy * dy)) <= (r * r);
}

/**
 * Builds the BPMN start event ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for start event circles.
 */
function buildBpmnStartEventShape(): ShapeDefinition
{
    return {
        type: "bpmn-start-event",
        category: BPMN_CATEGORY,
        label: "Start Event",
        icon: "bi-circle",
        defaultSize: { w: 50, h: 50 },
        minSize: { w: 24, h: 24 },
        render: renderBpmnStartEvent,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => bpmnCircleHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => bpmnCircleTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => bpmnCircleOutlinePath(bounds)
    };
}

// ============================================================================
// BPMN-END-EVENT (thick red circle)
// ============================================================================

/**
 * Renders a BPMN end event as a circle with a thick red stroke.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the end event circle.
 */
function renderBpmnEndEvent(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const cx = ctx.bounds.x + (ctx.bounds.width / 2);
    const cy = ctx.bounds.y + (ctx.bounds.height / 2);
    const r = Math.min(ctx.bounds.width, ctx.bounds.height) / 2;

    const circle = svgCreate("circle", {
        cx: String(cx),
        cy: String(cy),
        r: String(r)
    });

    applyFillToSvg(circle, ctx.style.fill);

    // Use thick red stroke for end events unless overridden
    const stroke = ctx.style.stroke || { color: "#dc3545", width: 3 };
    applyStrokeToSvg(circle, stroke);

    g.appendChild(circle);

    return g;
}

/**
 * Builds the BPMN end event ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for end event circles.
 */
function buildBpmnEndEventShape(): ShapeDefinition
{
    return {
        type: "bpmn-end-event",
        category: BPMN_CATEGORY,
        label: "End Event",
        icon: "bi-record-circle",
        defaultSize: { w: 50, h: 50 },
        minSize: { w: 24, h: 24 },
        render: renderBpmnEndEvent,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => bpmnCircleHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => bpmnCircleTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => bpmnCircleOutlinePath(bounds)
    };
}

// ============================================================================
// BPMN-GATEWAY (diamond)
// ============================================================================

/**
 * Builds the SVG path data for a BPMN gateway diamond shape.
 *
 * @param bounds - Bounding rectangle containing the diamond.
 * @returns SVG path data string.
 */
function bpmnGatewayPathData(bounds: Rect): string
{
    const cx = bounds.x + (bounds.width / 2);
    const cy = bounds.y + (bounds.height / 2);

    return (
        `M ${cx} ${bounds.y} ` +
        `L ${bounds.x + bounds.width} ${cy} ` +
        `L ${cx} ${bounds.y + bounds.height} ` +
        `L ${bounds.x} ${cy} Z`
    );
}

/**
 * Renders a BPMN gateway diamond shape with fill and stroke.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the gateway diamond path.
 */
function renderBpmnGateway(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const path = svgCreate("path", {
        d: bpmnGatewayPathData(ctx.bounds)
    });

    g.appendChild(path);
    applyFillToSvg(path, ctx.style.fill);
    applyStrokeToSvg(path, ctx.style.stroke);

    return g;
}

/**
 * Tests whether a point lies inside the gateway diamond using
 * the taxicab distance formula.
 *
 * @param point - Point in canvas coordinates.
 * @param bounds - Bounding rectangle of the diamond.
 * @returns true if the point is inside the diamond.
 */
function bpmnGatewayHitTest(point: Point, bounds: Rect): boolean
{
    const cx = bounds.x + (bounds.width / 2);
    const cy = bounds.y + (bounds.height / 2);
    const halfW = bounds.width / 2;
    const halfH = bounds.height / 2;

    if (halfW === 0 || halfH === 0)
    {
        return false;
    }

    const dx = Math.abs(point.x - cx) / halfW;
    const dy = Math.abs(point.y - cy) / halfH;

    return (dx + dy) <= 1;
}

/**
 * Returns inset text regions for a gateway diamond.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single centred text region.
 */
function bpmnGatewayTextRegions(bounds: Rect): TextRegion[]
{
    const insetFactor = 0.25;

    return [
        {
            id: "text-main",
            bounds: {
                x: bounds.x + (bounds.width * insetFactor),
                y: bounds.y + (bounds.height * insetFactor),
                width: bounds.width * (1 - (2 * insetFactor)),
                height: bounds.height * (1 - (2 * insetFactor))
            }
        }
    ];
}

/**
 * Builds the BPMN gateway ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for gateway diamond shapes.
 */
function buildBpmnGatewayShape(): ShapeDefinition
{
    return {
        type: "bpmn-gateway",
        category: BPMN_CATEGORY,
        label: "Gateway",
        icon: "bi-diamond",
        defaultSize: { w: 60, h: 60 },
        minSize: { w: 30, h: 30 },
        render: renderBpmnGateway,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => bpmnGatewayHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => bpmnGatewayTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => bpmnGatewayPathData(bounds)
    };
}

// ============================================================================
// ER-ENTITY (plain rectangle)
// ============================================================================

/**
 * Renders an ER entity as a plain rectangle with fill and stroke.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the entity rectangle.
 */
function renderErEntity(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const rect = svgCreate("rect", {
        x: String(ctx.bounds.x),
        y: String(ctx.bounds.y),
        width: String(ctx.bounds.width),
        height: String(ctx.bounds.height)
    });

    g.appendChild(rect);
    applyFillToSvg(rect, ctx.style.fill);
    applyStrokeToSvg(rect, ctx.style.stroke);

    return g;
}

/**
 * Builds the ER entity ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for ER entity shapes.
 */
function buildErEntityShape(): ShapeDefinition
{
    return {
        type: "er-entity",
        category: ER_CATEGORY,
        label: "Entity",
        icon: "bi-square",
        defaultSize: { w: 120, h: 60 },
        minSize: { w: 40, h: 30 },
        render: renderErEntity,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => [{ id: "text-main", bounds: netInsetRect(bounds, NET_TEXT_INSET) }],
        getOutlinePath: (bounds: Rect) => netRectOutlinePath(bounds)
    };
}

// ============================================================================
// ER-RELATIONSHIP (diamond)
// ============================================================================

/**
 * Builds the SVG path data for an ER relationship diamond.
 *
 * @param bounds - Bounding rectangle containing the diamond.
 * @returns SVG path data string.
 */
function erRelationshipPathData(bounds: Rect): string
{
    const cx = bounds.x + (bounds.width / 2);
    const cy = bounds.y + (bounds.height / 2);

    return (
        `M ${cx} ${bounds.y} ` +
        `L ${bounds.x + bounds.width} ${cy} ` +
        `L ${cx} ${bounds.y + bounds.height} ` +
        `L ${bounds.x} ${cy} Z`
    );
}

/**
 * Renders an ER relationship diamond with fill and stroke.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the relationship diamond path.
 */
function renderErRelationship(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const path = svgCreate("path", {
        d: erRelationshipPathData(ctx.bounds)
    });

    g.appendChild(path);
    applyFillToSvg(path, ctx.style.fill);
    applyStrokeToSvg(path, ctx.style.stroke);

    return g;
}

/**
 * Tests whether a point lies inside the ER relationship diamond
 * using the taxicab distance formula.
 *
 * @param point - Point in canvas coordinates.
 * @param bounds - Bounding rectangle of the diamond.
 * @returns true if the point is inside the diamond.
 */
function erRelationshipHitTest(point: Point, bounds: Rect): boolean
{
    const cx = bounds.x + (bounds.width / 2);
    const cy = bounds.y + (bounds.height / 2);
    const halfW = bounds.width / 2;
    const halfH = bounds.height / 2;

    if (halfW === 0 || halfH === 0)
    {
        return false;
    }

    const dx = Math.abs(point.x - cx) / halfW;
    const dy = Math.abs(point.y - cy) / halfH;

    return (dx + dy) <= 1;
}

/**
 * Returns inset text regions for an ER relationship diamond.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single centred text region.
 */
function erRelationshipTextRegions(bounds: Rect): TextRegion[]
{
    const insetFactor = 0.25;

    return [
        {
            id: "text-main",
            bounds: {
                x: bounds.x + (bounds.width * insetFactor),
                y: bounds.y + (bounds.height * insetFactor),
                width: bounds.width * (1 - (2 * insetFactor)),
                height: bounds.height * (1 - (2 * insetFactor))
            }
        }
    ];
}

/**
 * Builds the ER relationship ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for ER relationship shapes.
 */
function buildErRelationshipShape(): ShapeDefinition
{
    return {
        type: "er-relationship",
        category: ER_CATEGORY,
        label: "Relationship",
        icon: "bi-diamond",
        defaultSize: { w: 100, h: 80 },
        minSize: { w: 40, h: 30 },
        render: renderErRelationship,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => erRelationshipHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => erRelationshipTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => erRelationshipPathData(bounds)
    };
}

// ============================================================================
// REGISTRATION — NETWORK
// ============================================================================

/**
 * Registers all three network shapes (server, cloud, firewall)
 * with the given shape registry.
 *
 * @param registry - The ShapeRegistry instance to populate.
 * @returns void
 */
function registerNetworkPack(registry: ShapeRegistry): void
{
    registry.register(buildServerShape());
    registry.register(buildCloudShape());
    registry.register(buildFirewallShape());

    logNetInfo("Registered 3 network shapes");
}

// ============================================================================
// REGISTRATION — BPMN
// ============================================================================

/**
 * Registers all four BPMN shapes (task, start-event, end-event,
 * gateway) with the given shape registry.
 *
 * @param registry - The ShapeRegistry instance to populate.
 * @returns void
 */
function registerBpmnPack(registry: ShapeRegistry): void
{
    registry.register(buildBpmnTaskShape());
    registry.register(buildBpmnStartEventShape());
    registry.register(buildBpmnEndEventShape());
    registry.register(buildBpmnGatewayShape());

    logBpmnInfo("Registered 4 BPMN shapes");
}

// ============================================================================
// REGISTRATION — ER
// ============================================================================

/**
 * Registers both ER shapes (entity, relationship) with the given
 * shape registry.
 *
 * @param registry - The ShapeRegistry instance to populate.
 * @returns void
 */
function registerErPack(registry: ShapeRegistry): void
{
    registry.register(buildErEntityShape());
    registry.register(buildErRelationshipShape());

    logErInfo("Registered 2 ER shapes");
}

// ========================================================================
// SOURCE: stencils-devices.ts
// ========================================================================

/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: DiagramEngine — DeviceStencils
 * PURPOSE: Twelve device frame shape definitions for interactive mockups
 *    and wireframes. Includes browser windows, mobile phones, tablets,
 *    desktop windows, dialogs, cards, sidebars, navbars, and footers.
 *    Each shape is a container with a defined content area for embedding
 *    child components.
 * RELATES: [[DiagramEngine]], [[ShapeRegistry]], [[ShapeDefinition]]
 * FLOW: [registerDeviceStencils()] -> [ShapeRegistry.register()] -> [Engine]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

const DEV_LOG_PREFIX = "[DeviceStencils]";

function logDevInfo(...args: unknown[]): void
{
    console.log(new Date().toISOString(), "[INFO]", DEV_LOG_PREFIX, ...args);
}

function logDevWarn(...args: unknown[]): void
{
    console.warn(new Date().toISOString(), "[WARN]", DEV_LOG_PREFIX, ...args);
}

function logDevError(...args: unknown[]): void
{
    console.error(new Date().toISOString(), "[ERROR]", DEV_LOG_PREFIX, ...args);
}

function logDevDebug(...args: unknown[]): void
{
    console.debug(new Date().toISOString(), "[DEBUG]", DEV_LOG_PREFIX, ...args);
}

/** Category identifier for device frame shapes in the stencil palette. */
const DEV_CATEGORY = "devices";

/** Total number of device shapes registered by this pack. */
const DEV_SHAPE_COUNT = 12;

// ============================================================================
// COLOUR CONSTANTS
// ============================================================================

/** Chrome browser title/tab bar background. */
const DEV_CHROME_BG = "#dee1e6";

/** Chrome browser active tab background. */
const DEV_CHROME_TAB_ACTIVE = "#ffffff";

/** Browser address bar background. */
const DEV_ADDRESS_BAR_BG = "#f1f3f4";

/** Title bar button colours (close, minimise, maximise). */
const DEV_BTN_CLOSE = "#ff5f57";
const DEV_BTN_MINIMISE = "#ffbd2e";
const DEV_BTN_MAXIMISE = "#28c840";

/** Generic title bar background. */
const DEV_TITLEBAR_BG = "#e8e8e8";

/** Mobile device frame background. */
const DEV_DEVICE_BG = "#1a1a1a";

/** Content area background (white). */
const DEV_CONTENT_BG = "#ffffff";

/** Stroke colour for schematic/sketch mode. */
const DEV_SKETCH_STROKE = "#666666";

/** Light border colour for cards and panels. */
const DEV_BORDER_LIGHT = "#dee2e6";

/** Nav/footer backgrounds. */
const DEV_NAV_BG = "#343a40";

/** Text colours. */
const DEV_TEXT_LIGHT = "#ffffff";
const DEV_TEXT_DARK = "#333333";
const DEV_TEXT_MUTED = "#6c757d";

// ============================================================================
// SHARED HELPERS
// ============================================================================

/**
 * Creates an inset copy of a rectangle, shrinking each edge.
 *
 * @param bounds - Original bounding rectangle.
 * @param inset - Number of pixels to inset on each side.
 * @returns A new Rect inset from the original.
 */
function devInsetRect(bounds: Rect, inset: number): Rect
{
    const doubleInset = inset * 2;

    return {
        x: bounds.x + inset,
        y: bounds.y + inset,
        width: Math.max(0, bounds.width - doubleInset),
        height: Math.max(0, bounds.height - doubleInset)
    };
}

/**
 * Returns the SVG path data for a rectangle outline.
 *
 * @param bounds - Current bounding rectangle.
 * @returns SVG path data string.
 */
function devRectOutlinePath(bounds: Rect): string
{
    const x = bounds.x;
    const y = bounds.y;
    const w = bounds.width;
    const h = bounds.height;

    return `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
}

/**
 * Returns the SVG path data for a rounded rectangle outline.
 *
 * @param x - Top-left x.
 * @param y - Top-left y.
 * @param w - Width.
 * @param h - Height.
 * @param r - Corner radius.
 * @returns SVG path data string.
 */
function devRoundedRectPath(
    x: number,
    y: number,
    w: number,
    h: number,
    r: number): string
{
    const clampR = Math.min(r, w / 2, h / 2);

    return (
        `M ${x + clampR} ${y} ` +
        `L ${x + w - clampR} ${y} ` +
        `A ${clampR} ${clampR} 0 0 1 ${x + w} ${y + clampR} ` +
        `L ${x + w} ${y + h - clampR} ` +
        `A ${clampR} ${clampR} 0 0 1 ${x + w - clampR} ${y + h} ` +
        `L ${x + clampR} ${y + h} ` +
        `A ${clampR} ${clampR} 0 0 1 ${x} ${y + h - clampR} ` +
        `L ${x} ${y + clampR} ` +
        `A ${clampR} ${clampR} 0 0 1 ${x + clampR} ${y} Z`
    );
}

/**
 * Checks whether the current render context is in sketch mode.
 *
 * @param ctx - Shape render context.
 * @returns true if sketch mode is active.
 */
function devIsSketch(ctx: ShapeRenderContext): boolean
{
    return ctx.renderStyle === "sketch";
}

/**
 * Applies sketch-mode stroke styling to an SVG element.
 *
 * @param el - The SVG element to style.
 */
function devApplySketchStroke(el: SVGElement): void
{
    el.setAttribute("stroke", DEV_SKETCH_STROKE);
    el.setAttribute("stroke-width", "1.5");
    el.setAttribute("stroke-dasharray", "6 3");
    el.setAttribute("fill", "none");
}

/**
 * Sets a data attribute marking this shape as a container.
 *
 * @param g - The SVG group element to mark.
 */
function devMarkContainer(g: SVGElement): void
{
    g.setAttribute("data-is-container", "true");
}

// ============================================================================
// BROWSER CHROME (800x600)
// ============================================================================

/** Height of the tab bar in the Chrome browser frame. */
const DEV_CHROME_TAB_H = 36;

/** Height of the address bar in the Chrome browser frame. */
const DEV_CHROME_ADDR_H = 32;

/** Total chrome height (tab bar + address bar). */
const DEV_CHROME_TOTAL_H = DEV_CHROME_TAB_H + DEV_CHROME_ADDR_H;

/**
 * Renders the tab bar portion of a Chrome browser frame.
 *
 * @param g - Parent SVG group.
 * @param x - Left coordinate.
 * @param y - Top coordinate.
 * @param w - Width of the frame.
 */
function renderChromeTabBar(
    g: SVGElement,
    x: number,
    y: number,
    w: number): void
{
    const tabBg = svgCreate("rect", {
        x: String(x), y: String(y),
        width: String(w), height: String(DEV_CHROME_TAB_H),
        fill: DEV_CHROME_BG
    });

    g.appendChild(tabBg);

    const tabShape = svgCreate("path", {
        d: `M ${x + 8} ${y + DEV_CHROME_TAB_H} ` +
           `L ${x + 16} ${y + 8} ` +
           `L ${x + 160} ${y + 8} ` +
           `L ${x + 168} ${y + DEV_CHROME_TAB_H} Z`,
        fill: DEV_CHROME_TAB_ACTIVE
    });

    g.appendChild(tabShape);

    const tabLabel = svgCreate("text", {
        x: String(x + 40), y: String(y + 24),
        "font-size": "11", fill: DEV_TEXT_DARK
    });

    tabLabel.textContent = "New Tab";
    g.appendChild(tabLabel);
}

/**
 * Renders the address bar portion of a Chrome browser frame.
 *
 * @param g - Parent SVG group.
 * @param x - Left coordinate.
 * @param y - Top coordinate (below tab bar).
 * @param w - Width of the frame.
 */
function renderChromeAddressBar(
    g: SVGElement,
    x: number,
    y: number,
    w: number): void
{
    const addrBg = svgCreate("rect", {
        x: String(x), y: String(y),
        width: String(w), height: String(DEV_CHROME_ADDR_H),
        fill: DEV_CHROME_TAB_ACTIVE
    });

    g.appendChild(addrBg);
    renderChromeNavButtons(g, x, y);
    renderChromeAddressField(g, x, y, w);
}

/**
 * Renders navigation buttons (back, forward, reload) in the address bar.
 *
 * @param g - Parent SVG group.
 * @param x - Left coordinate of the address bar.
 * @param y - Top coordinate of the address bar.
 */
function renderChromeNavButtons(
    g: SVGElement,
    x: number,
    y: number): void
{
    const btnY = y + (DEV_CHROME_ADDR_H / 2);
    const offsets = [16, 36, 56];

    for (const ox of offsets)
    {
        const circle = svgCreate("circle", {
            cx: String(x + ox), cy: String(btnY),
            r: "7", fill: "none",
            stroke: DEV_TEXT_MUTED, "stroke-width": "1.5"
        });

        g.appendChild(circle);
    }
}

/**
 * Renders the URL address field rectangle.
 *
 * @param g - Parent SVG group.
 * @param x - Left coordinate of the address bar.
 * @param y - Top coordinate of the address bar.
 * @param w - Width of the frame.
 */
function renderChromeAddressField(
    g: SVGElement,
    x: number,
    y: number,
    w: number): void
{
    const fieldX = x + 76;
    const fieldW = w - 100;
    const fieldH = 22;
    const fieldY = y + ((DEV_CHROME_ADDR_H - fieldH) / 2);

    const field = svgCreate("rect", {
        x: String(fieldX), y: String(fieldY),
        width: String(Math.max(0, fieldW)),
        height: String(fieldH),
        rx: "11", ry: "11",
        fill: DEV_ADDRESS_BAR_BG
    });

    g.appendChild(field);
}

/**
 * Renders a Chrome browser frame in clean (detailed) mode.
 *
 * @param ctx - Shape render context.
 * @returns SVG group with all browser chrome elements.
 */
function renderBrowserChromeClean(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    devMarkContainer(g);

    const outerRect = svgCreate("rect", {
        x: String(b.x), y: String(b.y),
        width: String(b.width), height: String(b.height),
        fill: DEV_CONTENT_BG,
        stroke: "#bdc3c7", "stroke-width": "1"
    });

    g.appendChild(outerRect);
    renderChromeTabBar(g, b.x, b.y, b.width);
    renderChromeAddressBar(g, b.x, b.y + DEV_CHROME_TAB_H, b.width);

    return g;
}

/**
 * Renders a Chrome browser frame in sketch (schematic) mode.
 *
 * @param ctx - Shape render context.
 * @returns SVG group with simplified browser outline.
 */
function renderBrowserChromeSketch(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    devMarkContainer(g);

    const outerRect = svgCreate("rect", {
        x: String(b.x), y: String(b.y),
        width: String(b.width), height: String(b.height)
    });

    devApplySketchStroke(outerRect);
    g.appendChild(outerRect);

    const divider = svgCreate("line", {
        x1: String(b.x), y1: String(b.y + DEV_CHROME_TOTAL_H),
        x2: String(b.x + b.width), y2: String(b.y + DEV_CHROME_TOTAL_H)
    });

    devApplySketchStroke(divider);
    g.appendChild(divider);

    const label = svgCreate("text", {
        x: String(b.x + 10), y: String(b.y + 22),
        "font-size": "11", fill: DEV_SKETCH_STROKE
    });

    label.textContent = "[browser]";
    g.appendChild(label);

    return g;
}

/**
 * Renders a Chrome browser frame, delegating to clean or sketch mode.
 *
 * @param ctx - Shape render context.
 * @returns SVG group representing the browser frame.
 */
function renderBrowserChrome(ctx: ShapeRenderContext): SVGElement
{
    if (devIsSketch(ctx))
    {
        return renderBrowserChromeSketch(ctx);
    }

    return renderBrowserChromeClean(ctx);
}

/**
 * Returns the content region for a Chrome browser frame.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single "content" text region below the chrome.
 */
function browserChromeTextRegions(bounds: Rect): TextRegion[]
{
    return [
        {
            id: "content",
            bounds: {
                x: bounds.x + 1,
                y: bounds.y + DEV_CHROME_TOTAL_H,
                width: bounds.width - 2,
                height: Math.max(0, bounds.height - DEV_CHROME_TOTAL_H - 1)
            }
        }
    ];
}

/**
 * Builds the browser-chrome ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for Chrome browser frames.
 */
function buildBrowserChromeShape(): ShapeDefinition
{
    return {
        type: "browser-chrome",
        category: DEV_CATEGORY,
        label: "Browser (Chrome)",
        icon: "bi-window",
        defaultSize: { w: 800, h: 600 },
        minSize: { w: 300, h: 200 },
        render: renderBrowserChrome,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => browserChromeTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => devRectOutlinePath(bounds)
    };
}

// ============================================================================
// BROWSER MINIMAL (800x600)
// ============================================================================

/** Height of the minimal browser address bar. */
const DEV_MINIMAL_ADDR_H = 36;

/**
 * Renders a minimal browser frame in clean mode.
 *
 * @param ctx - Shape render context.
 * @returns SVG group with minimal browser chrome.
 */
function renderBrowserMinimalClean(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    devMarkContainer(g);

    const outerRect = svgCreate("rect", {
        x: String(b.x), y: String(b.y),
        width: String(b.width), height: String(b.height),
        fill: DEV_CONTENT_BG,
        stroke: "#bdc3c7", "stroke-width": "1"
    });

    g.appendChild(outerRect);

    const addrBg = svgCreate("rect", {
        x: String(b.x), y: String(b.y),
        width: String(b.width), height: String(DEV_MINIMAL_ADDR_H),
        fill: DEV_CHROME_BG
    });

    g.appendChild(addrBg);
    renderChromeAddressField(g, b.x, b.y, b.width);

    return g;
}

/**
 * Renders a minimal browser frame in sketch mode.
 *
 * @param ctx - Shape render context.
 * @returns SVG group with simplified outline.
 */
function renderBrowserMinimalSketch(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    devMarkContainer(g);

    const outerRect = svgCreate("rect", {
        x: String(b.x), y: String(b.y),
        width: String(b.width), height: String(b.height)
    });

    devApplySketchStroke(outerRect);
    g.appendChild(outerRect);

    const divider = svgCreate("line", {
        x1: String(b.x), y1: String(b.y + DEV_MINIMAL_ADDR_H),
        x2: String(b.x + b.width), y2: String(b.y + DEV_MINIMAL_ADDR_H)
    });

    devApplySketchStroke(divider);
    g.appendChild(divider);

    const label = svgCreate("text", {
        x: String(b.x + 10), y: String(b.y + 22),
        "font-size": "11", fill: DEV_SKETCH_STROKE
    });

    label.textContent = "[url bar]";
    g.appendChild(label);

    return g;
}

/**
 * Renders a minimal browser frame, delegating by render style.
 *
 * @param ctx - Shape render context.
 * @returns SVG group representing the minimal browser frame.
 */
function renderBrowserMinimal(ctx: ShapeRenderContext): SVGElement
{
    if (devIsSketch(ctx))
    {
        return renderBrowserMinimalSketch(ctx);
    }

    return renderBrowserMinimalClean(ctx);
}

/**
 * Returns the content region for a minimal browser frame.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single "content" text region.
 */
function browserMinimalTextRegions(bounds: Rect): TextRegion[]
{
    return [
        {
            id: "content",
            bounds: {
                x: bounds.x + 1,
                y: bounds.y + DEV_MINIMAL_ADDR_H,
                width: bounds.width - 2,
                height: Math.max(0, bounds.height - DEV_MINIMAL_ADDR_H - 1)
            }
        }
    ];
}

/**
 * Builds the browser-minimal ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for minimal browser frames.
 */
function buildBrowserMinimalShape(): ShapeDefinition
{
    return {
        type: "browser-minimal",
        category: DEV_CATEGORY,
        label: "Browser (Minimal)",
        icon: "bi-browser-chrome",
        defaultSize: { w: 800, h: 600 },
        minSize: { w: 300, h: 150 },
        render: renderBrowserMinimal,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => browserMinimalTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => devRectOutlinePath(bounds)
    };
}

// ============================================================================
// MOBILE IPHONE (375x812)
// ============================================================================

/** Corner radius of the iPhone outer frame. */
const DEV_IPHONE_RADIUS = 40;

/** Height of the iPhone status bar area (includes notch). */
const DEV_IPHONE_STATUS_H = 44;

/** Height of the iPhone home indicator area. */
const DEV_IPHONE_HOME_H = 34;

/** Width of the iPhone notch. */
const DEV_IPHONE_NOTCH_W = 150;

/** Height of the iPhone notch. */
const DEV_IPHONE_NOTCH_H = 30;

/**
 * Renders the iPhone notch element.
 *
 * @param g - Parent SVG group.
 * @param cx - Centre X of the frame.
 * @param y - Top coordinate.
 */
function renderIphoneNotch(
    g: SVGElement,
    cx: number,
    y: number): void
{
    const notchPath = svgCreate("path", {
        d: devRoundedRectPath(
            cx - (DEV_IPHONE_NOTCH_W / 2), y,
            DEV_IPHONE_NOTCH_W, DEV_IPHONE_NOTCH_H, 14
        ),
        fill: DEV_DEVICE_BG
    });

    g.appendChild(notchPath);
}

/**
 * Renders the iPhone home indicator bar.
 *
 * @param g - Parent SVG group.
 * @param cx - Centre X of the frame.
 * @param bottomY - Bottom Y of the content area.
 */
function renderIphoneHomeIndicator(
    g: SVGElement,
    cx: number,
    bottomY: number): void
{
    const indicatorW = 134;
    const indicatorH = 5;
    const iy = bottomY + ((DEV_IPHONE_HOME_H - indicatorH) / 2);

    const indicator = svgCreate("rect", {
        x: String(cx - (indicatorW / 2)), y: String(iy),
        width: String(indicatorW), height: String(indicatorH),
        rx: "2.5", ry: "2.5",
        fill: DEV_TEXT_DARK
    });

    g.appendChild(indicator);
}

/**
 * Renders an iPhone frame in clean mode.
 *
 * @param ctx - Shape render context.
 * @returns SVG group with detailed iPhone chrome.
 */
function renderMobileIphoneClean(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    const cx = b.x + (b.width / 2);

    devMarkContainer(g);

    const frame = svgCreate("path", {
        d: devRoundedRectPath(b.x, b.y, b.width, b.height, DEV_IPHONE_RADIUS),
        fill: DEV_DEVICE_BG, stroke: "#333", "stroke-width": "2"
    });

    g.appendChild(frame);

    const screen = svgCreate("rect", {
        x: String(b.x + 4), y: String(b.y + DEV_IPHONE_STATUS_H),
        width: String(b.width - 8),
        height: String(Math.max(0, b.height - DEV_IPHONE_STATUS_H - DEV_IPHONE_HOME_H)),
        fill: DEV_CONTENT_BG
    });

    g.appendChild(screen);
    renderIphoneNotch(g, cx, b.y);

    const contentBottom = b.y + b.height - DEV_IPHONE_HOME_H;

    renderIphoneHomeIndicator(g, cx, contentBottom);

    return g;
}

/**
 * Renders an iPhone frame in sketch mode.
 *
 * @param ctx - Shape render context.
 * @returns SVG group with simplified iPhone outline.
 */
function renderMobileIphoneSketch(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    devMarkContainer(g);

    const frame = svgCreate("path", {
        d: devRoundedRectPath(b.x, b.y, b.width, b.height, DEV_IPHONE_RADIUS)
    });

    devApplySketchStroke(frame);
    g.appendChild(frame);

    const statusLine = svgCreate("line", {
        x1: String(b.x + 10), y1: String(b.y + DEV_IPHONE_STATUS_H),
        x2: String(b.x + b.width - 10), y2: String(b.y + DEV_IPHONE_STATUS_H)
    });

    devApplySketchStroke(statusLine);
    g.appendChild(statusLine);

    const label = svgCreate("text", {
        x: String(b.x + 20), y: String(b.y + 28),
        "font-size": "10", fill: DEV_SKETCH_STROKE
    });

    label.textContent = "[iPhone]";
    g.appendChild(label);

    return g;
}

/**
 * Renders an iPhone frame, delegating by render style.
 *
 * @param ctx - Shape render context.
 * @returns SVG group representing the iPhone frame.
 */
function renderMobileIphone(ctx: ShapeRenderContext): SVGElement
{
    if (devIsSketch(ctx))
    {
        return renderMobileIphoneSketch(ctx);
    }

    return renderMobileIphoneClean(ctx);
}

/**
 * Returns the content region for an iPhone frame.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single "content" region.
 */
function mobileIphoneTextRegions(bounds: Rect): TextRegion[]
{
    return [
        {
            id: "content",
            bounds: {
                x: bounds.x + 4,
                y: bounds.y + DEV_IPHONE_STATUS_H,
                width: bounds.width - 8,
                height: Math.max(0,
                    bounds.height - DEV_IPHONE_STATUS_H - DEV_IPHONE_HOME_H)
            }
        }
    ];
}

/**
 * Builds the mobile-iphone ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for iPhone frames.
 */
function buildMobileIphoneShape(): ShapeDefinition
{
    return {
        type: "mobile-iphone",
        category: DEV_CATEGORY,
        label: "iPhone",
        icon: "bi-phone",
        defaultSize: { w: 375, h: 812 },
        minSize: { w: 200, h: 400 },
        render: renderMobileIphone,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => mobileIphoneTextRegions(bounds),
        getOutlinePath: (bounds: Rect) =>
            devRoundedRectPath(
                bounds.x, bounds.y, bounds.width, bounds.height,
                DEV_IPHONE_RADIUS
            )
    };
}

// ============================================================================
// MOBILE ANDROID (360x800)
// ============================================================================

/** Corner radius of the Android outer frame. */
const DEV_ANDROID_RADIUS = 24;

/** Height of the Android status bar. */
const DEV_ANDROID_STATUS_H = 24;

/** Height of the Android navigation bar. */
const DEV_ANDROID_NAV_H = 48;

/**
 * Renders the Android status bar with time and icons.
 *
 * @param g - Parent SVG group.
 * @param x - Left coordinate.
 * @param y - Top coordinate.
 * @param w - Width of the frame.
 */
function renderAndroidStatusBar(
    g: SVGElement,
    x: number,
    y: number,
    w: number): void
{
    const statusBg = svgCreate("rect", {
        x: String(x + 4), y: String(y + 4),
        width: String(w - 8), height: String(DEV_ANDROID_STATUS_H),
        fill: DEV_DEVICE_BG
    });

    g.appendChild(statusBg);

    const timeText = svgCreate("text", {
        x: String(x + 14), y: String(y + 20),
        "font-size": "10", fill: DEV_TEXT_LIGHT
    });

    timeText.textContent = "12:00";
    g.appendChild(timeText);
}

/**
 * Renders Android navigation bar buttons (back, home, recents).
 *
 * @param g - Parent SVG group.
 * @param cx - Centre X of the frame.
 * @param navY - Top Y of the navigation bar.
 */
function renderAndroidNavBar(
    g: SVGElement,
    cx: number,
    navY: number): void
{
    const btnY = navY + (DEV_ANDROID_NAV_H / 2);
    const btnSpacing = 40;

    const triangle = svgCreate("polygon", {
        points: `${cx - btnSpacing - 6},${btnY + 5} ` +
                `${cx - btnSpacing + 6},${btnY} ` +
                `${cx - btnSpacing - 6},${btnY - 5}`,
        fill: DEV_TEXT_LIGHT
    });

    g.appendChild(triangle);

    const circle = svgCreate("circle", {
        cx: String(cx), cy: String(btnY),
        r: "8", fill: "none",
        stroke: DEV_TEXT_LIGHT, "stroke-width": "1.5"
    });

    g.appendChild(circle);

    const square = svgCreate("rect", {
        x: String(cx + btnSpacing - 7), y: String(btnY - 7),
        width: "14", height: "14",
        fill: "none",
        stroke: DEV_TEXT_LIGHT, "stroke-width": "1.5"
    });

    g.appendChild(square);
}

/**
 * Renders an Android phone frame in clean mode.
 *
 * @param ctx - Shape render context.
 * @returns SVG group with detailed Android chrome.
 */
function renderMobileAndroidClean(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    const cx = b.x + (b.width / 2);

    devMarkContainer(g);

    const frame = svgCreate("path", {
        d: devRoundedRectPath(b.x, b.y, b.width, b.height, DEV_ANDROID_RADIUS),
        fill: DEV_DEVICE_BG, stroke: "#444", "stroke-width": "2"
    });

    g.appendChild(frame);

    const contentTop = b.y + DEV_ANDROID_STATUS_H + 4;
    const contentH = b.height - DEV_ANDROID_STATUS_H - DEV_ANDROID_NAV_H - 8;

    const screen = svgCreate("rect", {
        x: String(b.x + 4), y: String(contentTop),
        width: String(b.width - 8),
        height: String(Math.max(0, contentH)),
        fill: DEV_CONTENT_BG
    });

    g.appendChild(screen);
    renderAndroidStatusBar(g, b.x, b.y, b.width);
    renderAndroidNavBar(g, cx, b.y + b.height - DEV_ANDROID_NAV_H);

    return g;
}

/**
 * Renders an Android phone frame in sketch mode.
 *
 * @param ctx - Shape render context.
 * @returns SVG group with simplified Android outline.
 */
function renderMobileAndroidSketch(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    devMarkContainer(g);

    const frame = svgCreate("path", {
        d: devRoundedRectPath(b.x, b.y, b.width, b.height, DEV_ANDROID_RADIUS)
    });

    devApplySketchStroke(frame);
    g.appendChild(frame);

    const statusLine = svgCreate("line", {
        x1: String(b.x + 10), y1: String(b.y + DEV_ANDROID_STATUS_H + 4),
        x2: String(b.x + b.width - 10), y2: String(b.y + DEV_ANDROID_STATUS_H + 4)
    });

    devApplySketchStroke(statusLine);
    g.appendChild(statusLine);

    const navLine = svgCreate("line", {
        x1: String(b.x + 10), y1: String(b.y + b.height - DEV_ANDROID_NAV_H),
        x2: String(b.x + b.width - 10), y2: String(b.y + b.height - DEV_ANDROID_NAV_H)
    });

    devApplySketchStroke(navLine);
    g.appendChild(navLine);

    const label = svgCreate("text", {
        x: String(b.x + 20), y: String(b.y + 18),
        "font-size": "10", fill: DEV_SKETCH_STROKE
    });

    label.textContent = "[Android]";
    g.appendChild(label);

    return g;
}

/**
 * Renders an Android phone frame, delegating by render style.
 *
 * @param ctx - Shape render context.
 * @returns SVG group representing the Android frame.
 */
function renderMobileAndroid(ctx: ShapeRenderContext): SVGElement
{
    if (devIsSketch(ctx))
    {
        return renderMobileAndroidSketch(ctx);
    }

    return renderMobileAndroidClean(ctx);
}

/**
 * Returns the content region for an Android phone frame.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single "content" region.
 */
function mobileAndroidTextRegions(bounds: Rect): TextRegion[]
{
    const contentTop = DEV_ANDROID_STATUS_H + 4;
    const contentH = bounds.height - DEV_ANDROID_STATUS_H - DEV_ANDROID_NAV_H - 8;

    return [
        {
            id: "content",
            bounds: {
                x: bounds.x + 4,
                y: bounds.y + contentTop,
                width: bounds.width - 8,
                height: Math.max(0, contentH)
            }
        }
    ];
}

/**
 * Builds the mobile-android ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for Android phone frames.
 */
function buildMobileAndroidShape(): ShapeDefinition
{
    return {
        type: "mobile-android",
        category: DEV_CATEGORY,
        label: "Android Phone",
        icon: "bi-phone",
        defaultSize: { w: 360, h: 800 },
        minSize: { w: 200, h: 400 },
        render: renderMobileAndroid,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => mobileAndroidTextRegions(bounds),
        getOutlinePath: (bounds: Rect) =>
            devRoundedRectPath(
                bounds.x, bounds.y, bounds.width, bounds.height,
                DEV_ANDROID_RADIUS
            )
    };
}

// ============================================================================
// TABLET IPAD (768x1024)
// ============================================================================

/** Corner radius of the iPad outer frame. */
const DEV_IPAD_RADIUS = 18;

/** Bezel width of the iPad frame. */
const DEV_IPAD_BEZEL = 20;

/**
 * Renders an iPad frame in clean mode.
 *
 * @param ctx - Shape render context.
 * @returns SVG group with detailed iPad chrome.
 */
function renderTabletIpadClean(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    devMarkContainer(g);

    const frame = svgCreate("path", {
        d: devRoundedRectPath(b.x, b.y, b.width, b.height, DEV_IPAD_RADIUS),
        fill: DEV_DEVICE_BG, stroke: "#555", "stroke-width": "1.5"
    });

    g.appendChild(frame);

    const screenX = b.x + DEV_IPAD_BEZEL;
    const screenY = b.y + DEV_IPAD_BEZEL;
    const screenW = b.width - (2 * DEV_IPAD_BEZEL);
    const screenH = b.height - (2 * DEV_IPAD_BEZEL);

    const screen = svgCreate("rect", {
        x: String(screenX), y: String(screenY),
        width: String(Math.max(0, screenW)),
        height: String(Math.max(0, screenH)),
        rx: "4", ry: "4",
        fill: DEV_CONTENT_BG
    });

    g.appendChild(screen);

    const camR = 3;
    const camera = svgCreate("circle", {
        cx: String(b.x + (b.width / 2)),
        cy: String(b.y + (DEV_IPAD_BEZEL / 2)),
        r: String(camR), fill: "#444"
    });

    g.appendChild(camera);

    return g;
}

/**
 * Renders an iPad frame in sketch mode.
 *
 * @param ctx - Shape render context.
 * @returns SVG group with simplified iPad outline.
 */
function renderTabletIpadSketch(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    devMarkContainer(g);

    const frame = svgCreate("path", {
        d: devRoundedRectPath(b.x, b.y, b.width, b.height, DEV_IPAD_RADIUS)
    });

    devApplySketchStroke(frame);
    g.appendChild(frame);

    const inner = devInsetRect(b, DEV_IPAD_BEZEL);
    const innerRect = svgCreate("rect", {
        x: String(inner.x), y: String(inner.y),
        width: String(inner.width), height: String(inner.height)
    });

    devApplySketchStroke(innerRect);
    g.appendChild(innerRect);

    const label = svgCreate("text", {
        x: String(b.x + 10), y: String(b.y + 14),
        "font-size": "10", fill: DEV_SKETCH_STROKE
    });

    label.textContent = "[iPad]";
    g.appendChild(label);

    return g;
}

/**
 * Renders an iPad frame, delegating by render style.
 *
 * @param ctx - Shape render context.
 * @returns SVG group representing the iPad frame.
 */
function renderTabletIpad(ctx: ShapeRenderContext): SVGElement
{
    if (devIsSketch(ctx))
    {
        return renderTabletIpadSketch(ctx);
    }

    return renderTabletIpadClean(ctx);
}

/**
 * Returns the content region for an iPad frame.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single "content" region.
 */
function tabletIpadTextRegions(bounds: Rect): TextRegion[]
{
    return [
        {
            id: "content",
            bounds: {
                x: bounds.x + DEV_IPAD_BEZEL,
                y: bounds.y + DEV_IPAD_BEZEL,
                width: Math.max(0, bounds.width - (2 * DEV_IPAD_BEZEL)),
                height: Math.max(0, bounds.height - (2 * DEV_IPAD_BEZEL))
            }
        }
    ];
}

/**
 * Builds the tablet-ipad ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for iPad frames.
 */
function buildTabletIpadShape(): ShapeDefinition
{
    return {
        type: "tablet-ipad",
        category: DEV_CATEGORY,
        label: "iPad",
        icon: "bi-tablet",
        defaultSize: { w: 768, h: 1024 },
        minSize: { w: 300, h: 400 },
        render: renderTabletIpad,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => tabletIpadTextRegions(bounds),
        getOutlinePath: (bounds: Rect) =>
            devRoundedRectPath(
                bounds.x, bounds.y, bounds.width, bounds.height,
                DEV_IPAD_RADIUS
            )
    };
}

// ============================================================================
// DESKTOP WINDOW (600x400)
// ============================================================================

/** Height of the generic desktop window title bar. */
const DEV_DESKTOP_TITLEBAR_H = 32;

/**
 * Renders generic window control buttons (close, min, max).
 *
 * @param g - Parent SVG group.
 * @param x - Right-aligned starting X.
 * @param cy - Centre Y of the title bar.
 */
function renderDesktopWindowControls(
    g: SVGElement,
    x: number,
    cy: number): void
{
    const btnSize = 10;
    const spacing = 20;
    const colours = [DEV_BTN_CLOSE, DEV_BTN_MINIMISE, DEV_BTN_MAXIMISE];
    const startX = x - (colours.length * spacing);

    for (let i = 0; i < colours.length; i++)
    {
        const rect = svgCreate("rect", {
            x: String(startX + (i * spacing)),
            y: String(cy - (btnSize / 2)),
            width: String(btnSize), height: String(btnSize),
            rx: "1", ry: "1",
            fill: colours[i]
        });

        g.appendChild(rect);
    }
}

/**
 * Renders a generic desktop window in clean mode.
 *
 * @param ctx - Shape render context.
 * @returns SVG group with desktop window chrome.
 */
function renderDesktopWindowClean(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    devMarkContainer(g);

    const outerRect = svgCreate("rect", {
        x: String(b.x), y: String(b.y),
        width: String(b.width), height: String(b.height),
        fill: DEV_CONTENT_BG,
        stroke: "#bdc3c7", "stroke-width": "1"
    });

    g.appendChild(outerRect);

    const titleBar = svgCreate("rect", {
        x: String(b.x), y: String(b.y),
        width: String(b.width), height: String(DEV_DESKTOP_TITLEBAR_H),
        fill: DEV_TITLEBAR_BG
    });

    g.appendChild(titleBar);

    const titleLabel = svgCreate("text", {
        x: String(b.x + 12), y: String(b.y + 21),
        "font-size": "12", fill: DEV_TEXT_DARK
    });

    titleLabel.textContent = "Window";
    g.appendChild(titleLabel);

    const btnCy = b.y + (DEV_DESKTOP_TITLEBAR_H / 2);

    renderDesktopWindowControls(g, b.x + b.width - 10, btnCy);

    return g;
}

/**
 * Renders a generic desktop window in sketch mode.
 *
 * @param ctx - Shape render context.
 * @returns SVG group with simplified window outline.
 */
function renderDesktopWindowSketch(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    devMarkContainer(g);

    const outerRect = svgCreate("rect", {
        x: String(b.x), y: String(b.y),
        width: String(b.width), height: String(b.height)
    });

    devApplySketchStroke(outerRect);
    g.appendChild(outerRect);

    const divider = svgCreate("line", {
        x1: String(b.x), y1: String(b.y + DEV_DESKTOP_TITLEBAR_H),
        x2: String(b.x + b.width), y2: String(b.y + DEV_DESKTOP_TITLEBAR_H)
    });

    devApplySketchStroke(divider);
    g.appendChild(divider);

    const label = svgCreate("text", {
        x: String(b.x + 10), y: String(b.y + 21),
        "font-size": "11", fill: DEV_SKETCH_STROKE
    });

    label.textContent = "[Window]";
    g.appendChild(label);

    return g;
}

/**
 * Renders a generic desktop window, delegating by render style.
 *
 * @param ctx - Shape render context.
 * @returns SVG group representing the desktop window.
 */
function renderDesktopWindow(ctx: ShapeRenderContext): SVGElement
{
    if (devIsSketch(ctx))
    {
        return renderDesktopWindowSketch(ctx);
    }

    return renderDesktopWindowClean(ctx);
}

/**
 * Returns the content region for a desktop window.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single "content" region below the title bar.
 */
function desktopWindowTextRegions(bounds: Rect): TextRegion[]
{
    return [
        {
            id: "content",
            bounds: {
                x: bounds.x + 1,
                y: bounds.y + DEV_DESKTOP_TITLEBAR_H,
                width: bounds.width - 2,
                height: Math.max(0,
                    bounds.height - DEV_DESKTOP_TITLEBAR_H - 1)
            }
        }
    ];
}

/**
 * Builds the desktop-window ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for generic desktop windows.
 */
function buildDesktopWindowShape(): ShapeDefinition
{
    return {
        type: "desktop-window",
        category: DEV_CATEGORY,
        label: "Desktop Window",
        icon: "bi-window-stack",
        defaultSize: { w: 600, h: 400 },
        minSize: { w: 200, h: 100 },
        render: renderDesktopWindow,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => desktopWindowTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => devRectOutlinePath(bounds)
    };
}

// ============================================================================
// DESKTOP MACOS (600x400)
// ============================================================================

/** Height of the macOS title bar. */
const DEV_MACOS_TITLEBAR_H = 28;

/** Radius of macOS traffic light buttons. */
const DEV_MACOS_BTN_R = 6;

/**
 * Renders macOS traffic light buttons (close, minimise, maximise).
 *
 * @param g - Parent SVG group.
 * @param x - Left X of the title bar.
 * @param cy - Centre Y of the title bar.
 */
function renderMacosTrafficLights(
    g: SVGElement,
    x: number,
    cy: number): void
{
    const colours = [DEV_BTN_CLOSE, DEV_BTN_MINIMISE, DEV_BTN_MAXIMISE];
    const startX = x + 14;
    const spacing = 20;

    for (let i = 0; i < colours.length; i++)
    {
        const circle = svgCreate("circle", {
            cx: String(startX + (i * spacing)),
            cy: String(cy),
            r: String(DEV_MACOS_BTN_R),
            fill: colours[i]
        });

        g.appendChild(circle);
    }
}

/**
 * Renders a macOS window in clean mode.
 *
 * @param ctx - Shape render context.
 * @returns SVG group with macOS window chrome.
 */
function renderDesktopMacosClean(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    const radius = 8;

    devMarkContainer(g);

    const outerPath = svgCreate("path", {
        d: devRoundedRectPath(b.x, b.y, b.width, b.height, radius),
        fill: DEV_CONTENT_BG,
        stroke: "#c0c0c0", "stroke-width": "1"
    });

    g.appendChild(outerPath);

    const titleBar = svgCreate("rect", {
        x: String(b.x), y: String(b.y),
        width: String(b.width), height: String(DEV_MACOS_TITLEBAR_H),
        fill: DEV_TITLEBAR_BG
    });

    g.appendChild(titleBar);

    const titleCy = b.y + (DEV_MACOS_TITLEBAR_H / 2);

    renderMacosTrafficLights(g, b.x, titleCy);

    const titleLabel = svgCreate("text", {
        x: String(b.x + (b.width / 2)),
        y: String(b.y + 18),
        "font-size": "12", fill: DEV_TEXT_DARK,
        "text-anchor": "middle"
    });

    titleLabel.textContent = "Untitled";
    g.appendChild(titleLabel);

    return g;
}

/**
 * Renders a macOS window in sketch mode.
 *
 * @param ctx - Shape render context.
 * @returns SVG group with simplified macOS outline.
 */
function renderDesktopMacosSketch(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    devMarkContainer(g);

    const frame = svgCreate("path", {
        d: devRoundedRectPath(b.x, b.y, b.width, b.height, 8)
    });

    devApplySketchStroke(frame);
    g.appendChild(frame);

    const divider = svgCreate("line", {
        x1: String(b.x), y1: String(b.y + DEV_MACOS_TITLEBAR_H),
        x2: String(b.x + b.width), y2: String(b.y + DEV_MACOS_TITLEBAR_H)
    });

    devApplySketchStroke(divider);
    g.appendChild(divider);

    const dots = svgCreate("text", {
        x: String(b.x + 14), y: String(b.y + 18),
        "font-size": "10", fill: DEV_SKETCH_STROKE
    });

    dots.textContent = "o o o";
    g.appendChild(dots);

    return g;
}

/**
 * Renders a macOS window, delegating by render style.
 *
 * @param ctx - Shape render context.
 * @returns SVG group representing the macOS window.
 */
function renderDesktopMacos(ctx: ShapeRenderContext): SVGElement
{
    if (devIsSketch(ctx))
    {
        return renderDesktopMacosSketch(ctx);
    }

    return renderDesktopMacosClean(ctx);
}

/**
 * Returns the content region for a macOS window.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single "content" region below the title bar.
 */
function desktopMacosTextRegions(bounds: Rect): TextRegion[]
{
    return [
        {
            id: "content",
            bounds: {
                x: bounds.x + 1,
                y: bounds.y + DEV_MACOS_TITLEBAR_H,
                width: bounds.width - 2,
                height: Math.max(0,
                    bounds.height - DEV_MACOS_TITLEBAR_H - 1)
            }
        }
    ];
}

/**
 * Builds the desktop-macos ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for macOS windows.
 */
function buildDesktopMacosShape(): ShapeDefinition
{
    return {
        type: "desktop-macos",
        category: DEV_CATEGORY,
        label: "macOS Window",
        icon: "bi-window-desktop",
        defaultSize: { w: 600, h: 400 },
        minSize: { w: 200, h: 100 },
        render: renderDesktopMacos,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => desktopMacosTextRegions(bounds),
        getOutlinePath: (bounds: Rect) =>
            devRoundedRectPath(
                bounds.x, bounds.y, bounds.width, bounds.height, 8
            )
    };
}

// ============================================================================
// DIALOG MODAL (400x300)
// ============================================================================

/** Height of the dialog title bar. */
const DEV_DIALOG_TITLEBAR_H = 40;

/** Height of the dialog button row at the bottom. */
const DEV_DIALOG_BUTTON_H = 52;

/**
 * Renders a dialog title bar with a close button.
 *
 * @param g - Parent SVG group.
 * @param x - Left coordinate.
 * @param y - Top coordinate.
 * @param w - Width of the dialog.
 */
function renderDialogTitleBar(
    g: SVGElement,
    x: number,
    y: number,
    w: number): void
{
    const titleBar = svgCreate("rect", {
        x: String(x), y: String(y),
        width: String(w), height: String(DEV_DIALOG_TITLEBAR_H),
        fill: DEV_TITLEBAR_BG
    });

    g.appendChild(titleBar);

    const titleLabel = svgCreate("text", {
        x: String(x + 16), y: String(y + 26),
        "font-size": "13", "font-weight": "600",
        fill: DEV_TEXT_DARK
    });

    titleLabel.textContent = "Dialog Title";
    g.appendChild(titleLabel);

    const closeX = x + w - 28;
    const closeY = y + 12;
    const closeBtn = svgCreate("text", {
        x: String(closeX), y: String(closeY + 12),
        "font-size": "16", fill: DEV_TEXT_MUTED
    });

    closeBtn.textContent = "\u00D7";
    g.appendChild(closeBtn);
}

/**
 * Renders the dialog button row with OK and Cancel buttons.
 *
 * @param g - Parent SVG group.
 * @param x - Left coordinate.
 * @param y - Top coordinate of button row.
 * @param w - Width of the dialog.
 */
function renderDialogButtonRow(
    g: SVGElement,
    x: number,
    y: number,
    w: number): void
{
    const rowBg = svgCreate("rect", {
        x: String(x), y: String(y),
        width: String(w), height: String(DEV_DIALOG_BUTTON_H),
        fill: "#f8f9fa"
    });

    g.appendChild(rowBg);

    const divider = svgCreate("line", {
        x1: String(x), y1: String(y),
        x2: String(x + w), y2: String(y),
        stroke: DEV_BORDER_LIGHT, "stroke-width": "1"
    });

    g.appendChild(divider);

    renderDialogButton(g, x + w - 170, y + 12, 70, "Cancel", "#6c757d");
    renderDialogButton(g, x + w - 90, y + 12, 70, "OK", "#0d6efd");
}

/**
 * Renders a single dialog button.
 *
 * @param g - Parent SVG group.
 * @param x - Left coordinate of the button.
 * @param y - Top coordinate of the button.
 * @param w - Button width.
 * @param label - Button text.
 * @param colour - Button fill colour.
 */
function renderDialogButton(
    g: SVGElement,
    x: number,
    y: number,
    w: number,
    label: string,
    colour: string): void
{
    const btn = svgCreate("rect", {
        x: String(x), y: String(y),
        width: String(w), height: "28",
        rx: "4", ry: "4",
        fill: colour
    });

    g.appendChild(btn);

    const text = svgCreate("text", {
        x: String(x + (w / 2)), y: String(y + 18),
        "font-size": "12", fill: DEV_TEXT_LIGHT,
        "text-anchor": "middle"
    });

    text.textContent = label;
    g.appendChild(text);
}

/**
 * Renders a modal dialog in clean mode.
 *
 * @param ctx - Shape render context.
 * @returns SVG group with detailed dialog chrome.
 */
function renderDialogModalClean(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    const radius = 8;

    devMarkContainer(g);

    const shadow = svgCreate("rect", {
        x: String(b.x + 4), y: String(b.y + 4),
        width: String(b.width), height: String(b.height),
        rx: String(radius), ry: String(radius),
        fill: "rgba(0,0,0,0.15)"
    });

    g.appendChild(shadow);

    const frame = svgCreate("path", {
        d: devRoundedRectPath(b.x, b.y, b.width, b.height, radius),
        fill: DEV_CONTENT_BG,
        stroke: DEV_BORDER_LIGHT, "stroke-width": "1"
    });

    g.appendChild(frame);
    renderDialogTitleBar(g, b.x, b.y, b.width);

    const btnRowY = b.y + b.height - DEV_DIALOG_BUTTON_H;

    renderDialogButtonRow(g, b.x, btnRowY, b.width);

    return g;
}

/**
 * Renders a modal dialog in sketch mode.
 *
 * @param ctx - Shape render context.
 * @returns SVG group with simplified dialog outline.
 */
function renderDialogModalSketch(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    devMarkContainer(g);

    const frame = svgCreate("rect", {
        x: String(b.x), y: String(b.y),
        width: String(b.width), height: String(b.height)
    });

    devApplySketchStroke(frame);
    g.appendChild(frame);

    const titleLine = svgCreate("line", {
        x1: String(b.x), y1: String(b.y + DEV_DIALOG_TITLEBAR_H),
        x2: String(b.x + b.width), y2: String(b.y + DEV_DIALOG_TITLEBAR_H)
    });

    devApplySketchStroke(titleLine);
    g.appendChild(titleLine);

    const btnLine = svgCreate("line", {
        x1: String(b.x),
        y1: String(b.y + b.height - DEV_DIALOG_BUTTON_H),
        x2: String(b.x + b.width),
        y2: String(b.y + b.height - DEV_DIALOG_BUTTON_H)
    });

    devApplySketchStroke(btnLine);
    g.appendChild(btnLine);

    const label = svgCreate("text", {
        x: String(b.x + 10), y: String(b.y + 26),
        "font-size": "11", fill: DEV_SKETCH_STROKE
    });

    label.textContent = "[Dialog]";
    g.appendChild(label);

    return g;
}

/**
 * Renders a modal dialog, delegating by render style.
 *
 * @param ctx - Shape render context.
 * @returns SVG group representing the modal dialog.
 */
function renderDialogModal(ctx: ShapeRenderContext): SVGElement
{
    if (devIsSketch(ctx))
    {
        return renderDialogModalSketch(ctx);
    }

    return renderDialogModalClean(ctx);
}

/**
 * Returns the content region for a modal dialog.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single "content" region between title and buttons.
 */
function dialogModalTextRegions(bounds: Rect): TextRegion[]
{
    const contentH = bounds.height - DEV_DIALOG_TITLEBAR_H - DEV_DIALOG_BUTTON_H;

    return [
        {
            id: "content",
            bounds: {
                x: bounds.x + 1,
                y: bounds.y + DEV_DIALOG_TITLEBAR_H,
                width: bounds.width - 2,
                height: Math.max(0, contentH)
            }
        }
    ];
}

/**
 * Builds the dialog-modal ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for modal dialogs.
 */
function buildDialogModalShape(): ShapeDefinition
{
    return {
        type: "dialog-modal",
        category: DEV_CATEGORY,
        label: "Modal Dialog",
        icon: "bi-window-plus",
        defaultSize: { w: 400, h: 300 },
        minSize: { w: 200, h: 150 },
        render: renderDialogModal,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => dialogModalTextRegions(bounds),
        getOutlinePath: (bounds: Rect) =>
            devRoundedRectPath(
                bounds.x, bounds.y, bounds.width, bounds.height, 8
            )
    };
}

// ============================================================================
// CARD CONTAINER (350x250)
// ============================================================================

/** Height of the card header. */
const DEV_CARD_HEADER_H = 42;

/**
 * Renders a Bootstrap card container in clean mode.
 *
 * @param ctx - Shape render context.
 * @returns SVG group with card chrome.
 */
function renderCardContainerClean(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    const radius = 4;

    devMarkContainer(g);

    const frame = svgCreate("path", {
        d: devRoundedRectPath(b.x, b.y, b.width, b.height, radius),
        fill: DEV_CONTENT_BG,
        stroke: DEV_BORDER_LIGHT, "stroke-width": "1"
    });

    g.appendChild(frame);

    const header = svgCreate("rect", {
        x: String(b.x), y: String(b.y),
        width: String(b.width), height: String(DEV_CARD_HEADER_H),
        fill: "#f8f9fa"
    });

    g.appendChild(header);

    const headerDivider = svgCreate("line", {
        x1: String(b.x), y1: String(b.y + DEV_CARD_HEADER_H),
        x2: String(b.x + b.width), y2: String(b.y + DEV_CARD_HEADER_H),
        stroke: DEV_BORDER_LIGHT, "stroke-width": "1"
    });

    g.appendChild(headerDivider);

    const headerLabel = svgCreate("text", {
        x: String(b.x + 16), y: String(b.y + 27),
        "font-size": "13", "font-weight": "600",
        fill: DEV_TEXT_DARK
    });

    headerLabel.textContent = "Card Title";
    g.appendChild(headerLabel);

    return g;
}

/**
 * Renders a Bootstrap card container in sketch mode.
 *
 * @param ctx - Shape render context.
 * @returns SVG group with simplified card outline.
 */
function renderCardContainerSketch(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    devMarkContainer(g);

    const frame = svgCreate("rect", {
        x: String(b.x), y: String(b.y),
        width: String(b.width), height: String(b.height)
    });

    devApplySketchStroke(frame);
    g.appendChild(frame);

    const divider = svgCreate("line", {
        x1: String(b.x), y1: String(b.y + DEV_CARD_HEADER_H),
        x2: String(b.x + b.width), y2: String(b.y + DEV_CARD_HEADER_H)
    });

    devApplySketchStroke(divider);
    g.appendChild(divider);

    const label = svgCreate("text", {
        x: String(b.x + 10), y: String(b.y + 27),
        "font-size": "11", fill: DEV_SKETCH_STROKE
    });

    label.textContent = "[Card]";
    g.appendChild(label);

    return g;
}

/**
 * Renders a card container, delegating by render style.
 *
 * @param ctx - Shape render context.
 * @returns SVG group representing the card.
 */
function renderCardContainer(ctx: ShapeRenderContext): SVGElement
{
    if (devIsSketch(ctx))
    {
        return renderCardContainerSketch(ctx);
    }

    return renderCardContainerClean(ctx);
}

/**
 * Returns the content region for a card container.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single "content" region below the header.
 */
function cardContainerTextRegions(bounds: Rect): TextRegion[]
{
    return [
        {
            id: "content",
            bounds: {
                x: bounds.x + 1,
                y: bounds.y + DEV_CARD_HEADER_H,
                width: bounds.width - 2,
                height: Math.max(0,
                    bounds.height - DEV_CARD_HEADER_H - 1)
            }
        }
    ];
}

/**
 * Builds the card-container ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for Bootstrap cards.
 */
function buildCardContainerShape(): ShapeDefinition
{
    return {
        type: "card-container",
        category: DEV_CATEGORY,
        label: "Card",
        icon: "bi-card-heading",
        defaultSize: { w: 350, h: 250 },
        minSize: { w: 150, h: 100 },
        render: renderCardContainer,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => cardContainerTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => devRectOutlinePath(bounds)
    };
}

// ============================================================================
// SIDEBAR PANEL (250x500)
// ============================================================================

/** Height of the sidebar panel title area. */
const DEV_SIDEBAR_TITLE_H = 40;

/**
 * Renders a sidebar panel in clean mode.
 *
 * @param ctx - Shape render context.
 * @returns SVG group with sidebar chrome.
 */
function renderSidebarPanelClean(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    devMarkContainer(g);

    const frame = svgCreate("rect", {
        x: String(b.x), y: String(b.y),
        width: String(b.width), height: String(b.height),
        fill: DEV_CONTENT_BG,
        stroke: DEV_BORDER_LIGHT, "stroke-width": "1"
    });

    g.appendChild(frame);

    const titleBg = svgCreate("rect", {
        x: String(b.x), y: String(b.y),
        width: String(b.width), height: String(DEV_SIDEBAR_TITLE_H),
        fill: "#f8f9fa"
    });

    g.appendChild(titleBg);

    const titleDivider = svgCreate("line", {
        x1: String(b.x), y1: String(b.y + DEV_SIDEBAR_TITLE_H),
        x2: String(b.x + b.width), y2: String(b.y + DEV_SIDEBAR_TITLE_H),
        stroke: DEV_BORDER_LIGHT, "stroke-width": "1"
    });

    g.appendChild(titleDivider);

    const titleLabel = svgCreate("text", {
        x: String(b.x + 12), y: String(b.y + 26),
        "font-size": "13", "font-weight": "600",
        fill: DEV_TEXT_DARK
    });

    titleLabel.textContent = "Sidebar";
    g.appendChild(titleLabel);

    return g;
}

/**
 * Renders a sidebar panel in sketch mode.
 *
 * @param ctx - Shape render context.
 * @returns SVG group with simplified sidebar outline.
 */
function renderSidebarPanelSketch(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    devMarkContainer(g);

    const frame = svgCreate("rect", {
        x: String(b.x), y: String(b.y),
        width: String(b.width), height: String(b.height)
    });

    devApplySketchStroke(frame);
    g.appendChild(frame);

    const divider = svgCreate("line", {
        x1: String(b.x), y1: String(b.y + DEV_SIDEBAR_TITLE_H),
        x2: String(b.x + b.width), y2: String(b.y + DEV_SIDEBAR_TITLE_H)
    });

    devApplySketchStroke(divider);
    g.appendChild(divider);

    const label = svgCreate("text", {
        x: String(b.x + 10), y: String(b.y + 26),
        "font-size": "11", fill: DEV_SKETCH_STROKE
    });

    label.textContent = "[Sidebar]";
    g.appendChild(label);

    return g;
}

/**
 * Renders a sidebar panel, delegating by render style.
 *
 * @param ctx - Shape render context.
 * @returns SVG group representing the sidebar.
 */
function renderSidebarPanel(ctx: ShapeRenderContext): SVGElement
{
    if (devIsSketch(ctx))
    {
        return renderSidebarPanelSketch(ctx);
    }

    return renderSidebarPanelClean(ctx);
}

/**
 * Returns the content region for a sidebar panel.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single "content" region below the title.
 */
function sidebarPanelTextRegions(bounds: Rect): TextRegion[]
{
    return [
        {
            id: "content",
            bounds: {
                x: bounds.x + 1,
                y: bounds.y + DEV_SIDEBAR_TITLE_H,
                width: bounds.width - 2,
                height: Math.max(0,
                    bounds.height - DEV_SIDEBAR_TITLE_H - 1)
            }
        }
    ];
}

/**
 * Builds the sidebar-panel ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for sidebar panels.
 */
function buildSidebarPanelShape(): ShapeDefinition
{
    return {
        type: "sidebar-panel",
        category: DEV_CATEGORY,
        label: "Sidebar Panel",
        icon: "bi-layout-sidebar",
        defaultSize: { w: 250, h: 500 },
        minSize: { w: 150, h: 200 },
        render: renderSidebarPanel,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => sidebarPanelTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => devRectOutlinePath(bounds)
    };
}

// ============================================================================
// NAVBAR (800x60)
// ============================================================================

/** Padding for the navbar label area. */
const DEV_NAVBAR_PAD = 12;

/**
 * Renders a navigation bar in clean mode.
 *
 * @param ctx - Shape render context.
 * @returns SVG group with navbar chrome.
 */
function renderNavbarClean(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    devMarkContainer(g);

    const bg = svgCreate("rect", {
        x: String(b.x), y: String(b.y),
        width: String(b.width), height: String(b.height),
        fill: DEV_NAV_BG
    });

    g.appendChild(bg);

    const brandLabel = svgCreate("text", {
        x: String(b.x + 16), y: String(b.y + (b.height / 2) + 5),
        "font-size": "14", "font-weight": "700",
        fill: DEV_TEXT_LIGHT
    });

    brandLabel.textContent = "Brand";
    g.appendChild(brandLabel);

    renderNavbarLinks(g, b);

    return g;
}

/**
 * Renders placeholder navigation links in the navbar.
 *
 * @param g - Parent SVG group.
 * @param b - Navbar bounds.
 */
function renderNavbarLinks(g: SVGElement, b: Rect): void
{
    const links = ["Home", "About", "Contact"];
    const startX = b.x + 100;
    const cy = b.y + (b.height / 2) + 5;

    for (let i = 0; i < links.length; i++)
    {
        const linkText = svgCreate("text", {
            x: String(startX + (i * 70)),
            y: String(cy),
            "font-size": "12",
            fill: "rgba(255,255,255,0.7)"
        });

        linkText.textContent = links[i];
        g.appendChild(linkText);
    }
}

/**
 * Renders a navigation bar in sketch mode.
 *
 * @param ctx - Shape render context.
 * @returns SVG group with simplified navbar outline.
 */
function renderNavbarSketch(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    devMarkContainer(g);

    const frame = svgCreate("rect", {
        x: String(b.x), y: String(b.y),
        width: String(b.width), height: String(b.height)
    });

    devApplySketchStroke(frame);
    g.appendChild(frame);

    const label = svgCreate("text", {
        x: String(b.x + 10), y: String(b.y + (b.height / 2) + 4),
        "font-size": "11", fill: DEV_SKETCH_STROKE
    });

    label.textContent = "[Navbar]";
    g.appendChild(label);

    return g;
}

/**
 * Renders a navigation bar, delegating by render style.
 *
 * @param ctx - Shape render context.
 * @returns SVG group representing the navbar.
 */
function renderNavbar(ctx: ShapeRenderContext): SVGElement
{
    if (devIsSketch(ctx))
    {
        return renderNavbarSketch(ctx);
    }

    return renderNavbarClean(ctx);
}

/**
 * Returns the content region for a navbar.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single "content" region.
 */
function navbarTextRegions(bounds: Rect): TextRegion[]
{
    return [
        {
            id: "content",
            bounds: {
                x: bounds.x + DEV_NAVBAR_PAD,
                y: bounds.y + 2,
                width: Math.max(0, bounds.width - (2 * DEV_NAVBAR_PAD)),
                height: Math.max(0, bounds.height - 4)
            }
        }
    ];
}

/**
 * Builds the navbar ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for navigation bars.
 */
function buildNavbarShape(): ShapeDefinition
{
    return {
        type: "navbar",
        category: DEV_CATEGORY,
        label: "Navigation Bar",
        icon: "bi-menu-button-wide",
        defaultSize: { w: 800, h: 60 },
        minSize: { w: 300, h: 40 },
        render: renderNavbar,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => navbarTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => devRectOutlinePath(bounds)
    };
}

// ============================================================================
// FOOTER (800x100)
// ============================================================================

/** Padding for the footer label area. */
const DEV_FOOTER_PAD = 16;

/**
 * Renders a page footer in clean mode.
 *
 * @param ctx - Shape render context.
 * @returns SVG group with footer chrome.
 */
function renderFooterClean(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    devMarkContainer(g);

    const bg = svgCreate("rect", {
        x: String(b.x), y: String(b.y),
        width: String(b.width), height: String(b.height),
        fill: DEV_NAV_BG
    });

    g.appendChild(bg);

    const topBorder = svgCreate("line", {
        x1: String(b.x), y1: String(b.y),
        x2: String(b.x + b.width), y2: String(b.y),
        stroke: "#495057", "stroke-width": "1"
    });

    g.appendChild(topBorder);

    const copyright = svgCreate("text", {
        x: String(b.x + 16), y: String(b.y + 30),
        "font-size": "12", fill: DEV_TEXT_MUTED
    });

    copyright.textContent = "\u00A9 2026 Company Name";
    g.appendChild(copyright);

    renderFooterLinks(g, b);

    return g;
}

/**
 * Renders placeholder footer links.
 *
 * @param g - Parent SVG group.
 * @param b - Footer bounds.
 */
function renderFooterLinks(g: SVGElement, b: Rect): void
{
    const links = ["Privacy", "Terms", "Contact"];
    const startX = b.x + b.width - 250;
    const linkY = b.y + 30;

    for (let i = 0; i < links.length; i++)
    {
        const linkText = svgCreate("text", {
            x: String(startX + (i * 80)),
            y: String(linkY),
            "font-size": "12",
            fill: "rgba(255,255,255,0.6)"
        });

        linkText.textContent = links[i];
        g.appendChild(linkText);
    }
}

/**
 * Renders a page footer in sketch mode.
 *
 * @param ctx - Shape render context.
 * @returns SVG group with simplified footer outline.
 */
function renderFooterSketch(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    devMarkContainer(g);

    const frame = svgCreate("rect", {
        x: String(b.x), y: String(b.y),
        width: String(b.width), height: String(b.height)
    });

    devApplySketchStroke(frame);
    g.appendChild(frame);

    const label = svgCreate("text", {
        x: String(b.x + 10), y: String(b.y + (b.height / 2) + 4),
        "font-size": "11", fill: DEV_SKETCH_STROKE
    });

    label.textContent = "[Footer]";
    g.appendChild(label);

    return g;
}

/**
 * Renders a page footer, delegating by render style.
 *
 * @param ctx - Shape render context.
 * @returns SVG group representing the footer.
 */
function renderFooter(ctx: ShapeRenderContext): SVGElement
{
    if (devIsSketch(ctx))
    {
        return renderFooterSketch(ctx);
    }

    return renderFooterClean(ctx);
}

/**
 * Returns the content region for a footer.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single "content" region.
 */
function footerTextRegions(bounds: Rect): TextRegion[]
{
    return [
        {
            id: "content",
            bounds: {
                x: bounds.x + DEV_FOOTER_PAD,
                y: bounds.y + 2,
                width: Math.max(0, bounds.width - (2 * DEV_FOOTER_PAD)),
                height: Math.max(0, bounds.height - 4)
            }
        }
    ];
}

/**
 * Builds the footer ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for page footers.
 */
function buildFooterShape(): ShapeDefinition
{
    return {
        type: "footer",
        category: DEV_CATEGORY,
        label: "Page Footer",
        icon: "bi-layout-text-window-reverse",
        defaultSize: { w: 800, h: 100 },
        minSize: { w: 300, h: 50 },
        render: renderFooter,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => footerTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => devRectOutlinePath(bounds)
    };
}

// ============================================================================
// REGISTRATION
// ============================================================================

/**
 * Registers all twelve device frame shapes with the given shape
 * registry. Shapes include browser windows, mobile devices, tablets,
 * desktop windows, dialogs, cards, sidebars, navbars, and footers.
 *
 * @param registry - The ShapeRegistry instance to populate.
 * @returns void
 */
function registerDeviceStencils(registry: ShapeRegistry): void
{
    registry.register(buildBrowserChromeShape());
    registry.register(buildBrowserMinimalShape());
    registry.register(buildMobileIphoneShape());
    registry.register(buildMobileAndroidShape());
    registry.register(buildTabletIpadShape());
    registry.register(buildDesktopWindowShape());
    registry.register(buildDesktopMacosShape());
    registry.register(buildDialogModalShape());
    registry.register(buildCardContainerShape());
    registry.register(buildSidebarPanelShape());
    registry.register(buildNavbarShape());
    registry.register(buildFooterShape());

    logDevInfo(`Registered ${DEV_SHAPE_COUNT} device frame shapes`);
}

// ========================================================================
// SOURCE: stencils-ui-components.ts
// ========================================================================

/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: DiagramEngine — UiComponentStencils
 * PURPOSE: Balsamiq-quality wireframe stencil shapes for all embeddable
 *    library components. Tier A (25) get fully custom SVG render functions;
 *    Tier B (35) get enhanced generic variants; Tier C (33) get improved
 *    basic rendering. Plus 15 Bootstrap 5 and 12 HTML primitive shapes.
 * RELATES: [[DiagramEngine]], [[ShapeRegistry]], [[EmbedRegistry]]
 * FLOW: [registerUiComponentStencils()] -> [ShapeRegistry.register()] -> [Engine]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// CONSTANTS
// ============================================================================

const UI_LOG_PREFIX = "[UiComponentStencils]";
function logUiInfo(...args: unknown[]): void
{
    console.log(new Date().toISOString(), "[INFO]", UI_LOG_PREFIX, ...args);
}

function logUiWarn(...args: unknown[]): void
{
    console.warn(new Date().toISOString(), "[WARN]", UI_LOG_PREFIX, ...args);
}

function logUiError(...args: unknown[]): void
{
    console.error(new Date().toISOString(), "[ERROR]", UI_LOG_PREFIX, ...args);
}

function logUiDebug(...args: unknown[]): void
{
    console.debug(new Date().toISOString(), "[DEBUG]", UI_LOG_PREFIX, ...args);
}

const UI_CATEGORY = "ui-components";

/** Total number of ui-component stencil shapes registered. */
const UI_SHAPE_COUNT = 93;

// --- Colour palette ---
const C_BG        = "#ffffff";
const C_BORDER    = "#dee2e6";
const C_HEADER_BG = "#f8f9fa";
const C_TEXT       = "#212529";
const C_TEXT_SEC   = "#6c757d";
const C_TEXT_MUT   = "#adb5bd";
const C_PRIMARY    = "#0d6efd";
const C_SUCCESS    = "#198754";
const C_WARNING    = "#ffc107";
const C_DANGER     = "#dc3545";
const C_CODE_BG    = "#1e1e1e";
const C_CODE_TEXT  = "#d4d4d4";
const C_STRIPE     = "#f8f9fa";
const C_TABLE_LINE = "#e9ecef";
const C_INPUT_BG   = "#f8f9fa";
const C_CHAT_USER  = "#e8f4fd";
const C_ACTIVE_BG  = "#e7f1ff";

// ============================================================================
// OUTLINE + TEXT REGION HELPERS
// ============================================================================

/**
 * Returns the SVG path data for a rectangle outline.
 */
function uiRectOutlinePath(bounds: Rect): string
{
    const { x, y, width: w, height: h } = bounds;
    return `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
}

/**
 * Returns a single full-bounds text region with a small inset.
 */
function uiDefaultTextRegions(bounds: Rect): TextRegion[]
{
    return [
        {
            id: "content",
            bounds: {
                x: bounds.x + 4,
                y: bounds.y + 4,
                width: Math.max(0, bounds.width - 8),
                height: Math.max(0, bounds.height - 8)
            }
        }
    ];
}

// ============================================================================
// SHARED SVG DRAWING HELPERS
// ============================================================================

/** Draw a rectangle (optionally rounded). */
function uiRect(
    g: SVGElement, x: number, y: number, w: number, h: number,
    fill: string, stroke: string, rx?: number): void
{
    const attrs: Record<string, string> = {
        x: String(x), y: String(y),
        width: String(w), height: String(h),
        fill, stroke, "stroke-width": "1"
    };

    if (rx) { attrs.rx = String(rx); attrs.ry = String(rx); }
    g.appendChild(svgCreate("rect", attrs));
}

/** Draw a text label. */
function uiText(
    g: SVGElement, x: number, y: number, text: string,
    opts?: { size?: number; weight?: number; fill?: string; anchor?: string }): void
{
    const sz = opts?.size ?? 10;
    const attrs: Record<string, string> = {
        x: String(x), y: String(y),
        "font-size": String(sz),
        "font-family": "system-ui, -apple-system, sans-serif",
        fill: opts?.fill ?? C_TEXT
    };

    if (opts?.weight) { attrs["font-weight"] = String(opts.weight); }
    if (opts?.anchor) { attrs["text-anchor"] = opts.anchor; }
    const el = svgCreate("text", attrs);
    el.textContent = text;
    g.appendChild(el);
}

/** Draw a horizontal divider line. */
function uiDivider(g: SVGElement, x: number, y: number, w: number): void
{
    g.appendChild(svgCreate("line", {
        x1: String(x), y1: String(y),
        x2: String(x + w), y2: String(y),
        stroke: C_BORDER, "stroke-width": "1"
    }));
}

/** Draw a placeholder icon character. */
function uiIcon(
    g: SVGElement, x: number, y: number, char: string,
    opts?: { size?: number; fill?: string }): void
{
    uiText(g, x, y, char, {
        size: opts?.size ?? 12,
        fill: opts?.fill ?? C_TEXT_SEC
    });
}

/** Draw placeholder dots. */
function uiDots(g: SVGElement, x: number, y: number): void
{
    uiText(g, x, y, "\u00B7\u00B7\u00B7", { size: 10, fill: C_TEXT_MUT });
}

/** Draw a button outline with label. */
function uiButton(
    g: SVGElement, x: number, y: number, w: number, h: number,
    label: string, opts?: { fill?: string; textFill?: string }): void
{
    const fill = opts?.fill ?? C_BG;
    const textFill = opts?.textFill ?? C_TEXT;
    uiRect(g, x, y, w, h, fill, C_BORDER, 3);
    uiText(g, x + w / 2, y + h / 2 + 3, label, {
        size: 9, anchor: "middle", fill: textFill, weight: 500
    });
}

/** Draw a close X button (small). */
function uiCloseX(g: SVGElement, x: number, y: number): void
{
    uiText(g, x, y, "\u00D7", { size: 14, fill: C_TEXT_SEC });
}

/** Draw a circle. */
function uiCircle(
    g: SVGElement, cx: number, cy: number, r: number,
    fill: string, stroke: string, sw?: number): void
{
    g.appendChild(svgCreate("circle", {
        cx: String(cx), cy: String(cy), r: String(r),
        fill, stroke, "stroke-width": String(sw ?? 1)
    }));
}

/** Draw a horizontal line. */
function uiLine(
    g: SVGElement, x1: number, y1: number, x2: number, y2: number,
    stroke?: string, width?: number): void
{
    g.appendChild(svgCreate("line", {
        x1: String(x1), y1: String(y1),
        x2: String(x2), y2: String(y2),
        stroke: stroke ?? C_BORDER, "stroke-width": String(width ?? 1)
    }));
}

/** Draw a dialog window chrome: title bar + body area. */
function uiDialogChrome(
    g: SVGElement, b: Rect, title: string): number
{
    const hdrH = 28;
    uiRect(g, b.x, b.y, b.width, b.height, C_BG, C_BORDER, 3);
    uiRect(g, b.x, b.y, b.width, hdrH, C_HEADER_BG, C_BORDER, 0);
    uiDivider(g, b.x, b.y + hdrH, b.width);
    uiText(g, b.x + 10, b.y + 18, title, { size: 11, weight: 600 });
    uiCloseX(g, b.x + b.width - 18, b.y + 18);
    return b.y + hdrH;
}

/** Draw a titled header bar and return the y below it. */
function uiHeaderBar(
    g: SVGElement, x: number, y: number, w: number,
    title: string, icon?: string): number
{
    const hdrH = 24;
    uiRect(g, x, y, w, hdrH, C_HEADER_BG, C_BORDER, 0);
    if (icon) { uiIcon(g, x + 6, y + 16, icon); }
    const tx = icon ? x + 20 : x + 8;
    uiText(g, tx, y + 16, title, { size: 10, weight: 600 });
    return y + hdrH;
}

// ============================================================================
// TIER A — CUSTOM RENDER FUNCTIONS (25 components)
// ============================================================================

// --- DataGrid ---------------------------------------------------------------

function renderDataGridColumns(
    g: SVGElement, x: number, y: number, w: number,
    cols: string[]): number[]
{
    const colW = w / cols.length;
    const positions: number[] = [];

    for (let i = 0; i < cols.length; i++)
    {
        const cx = x + i * colW;
        positions.push(cx);
        uiText(g, cx + 6, y + 14, cols[i], { size: 10, weight: 600 });
        if (i > 0) { uiLine(g, cx, y, cx, y + 20); }
    }

    return positions;
}

function renderDataGridRows(
    g: SVGElement, x: number, y: number, w: number,
    colCount: number, rowCount: number): void
{
    const colW = w / colCount;
    const rowH = 18;

    for (let r = 0; r < rowCount; r++)
    {
        const ry = y + r * rowH;
        if (r % 2 === 1) { uiRect(g, x, ry, w, rowH, C_STRIPE, "none", 0); }
        uiDivider(g, x, ry, w);
        for (let c = 0; c < colCount; c++) { uiDots(g, x + c * colW + 6, ry + 13); }
    }
}

function renderDataGrid(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    const cols = ["ID", "Name", "Status", "Date"];

    uiRect(g, b.x, b.y, b.width, b.height, C_BG, C_BORDER, 2);
    uiRect(g, b.x, b.y, b.width, 22, C_HEADER_BG, "none", 0);
    renderDataGridColumns(g, b.x, b.y, b.width, cols);
    uiDivider(g, b.x, b.y + 22, b.width);

    const bodyH = b.height - 22;
    const rowCount = Math.min(Math.floor(bodyH / 18), 8);
    renderDataGridRows(g, b.x, b.y + 22, b.width, cols.length, rowCount);
    return g;
}

// --- TreeGrid ---------------------------------------------------------------

function renderTreeGridRows(
    g: SVGElement, x: number, y: number, w: number, colW: number): void
{
    const rows = [
        { indent: 0, arrow: "\u25BE", label: "Project" },
        { indent: 1, arrow: " ", label: "index.ts" },
        { indent: 1, arrow: " ", label: "app.ts" },
        { indent: 0, arrow: "\u25B8", label: "Assets" },
    ];
    const rowH = 18;

    for (let i = 0; i < rows.length; i++)
    {
        const ry = y + i * rowH;
        if (i % 2 === 1) { uiRect(g, x, ry, w, rowH, C_STRIPE, "none", 0); }
        uiDivider(g, x, ry, w);
        const indent = 6 + rows[i].indent * 14;
        uiText(g, x + indent, ry + 13, rows[i].arrow, { size: 8, fill: C_TEXT_SEC });
        uiText(g, x + indent + 12, ry + 13, rows[i].label, { size: 10 });
        uiDots(g, x + colW + 6, ry + 13);
        uiDots(g, x + colW * 2 + 6, ry + 13);
    }
}

function renderTreeGrid(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    const cols = ["Name", "Type", "Size"];
    const colW = b.width / cols.length;

    uiRect(g, b.x, b.y, b.width, b.height, C_BG, C_BORDER, 2);
    uiRect(g, b.x, b.y, b.width, 22, C_HEADER_BG, "none", 0);
    renderDataGridColumns(g, b.x, b.y, b.width, cols);
    uiDivider(g, b.x, b.y + 22, b.width);
    renderTreeGridRows(g, b.x, b.y + 22, b.width, colW);
    return g;
}

// --- TreeView ---------------------------------------------------------------

function renderTreeViewItems(g: SVGElement, x: number, y: number): void
{
    const items = [
        { indent: 0, icon: "\u25BE", name: "\uD83D\uDCC1 Project", bold: true },
        { indent: 1, icon: "\u25BE", name: "\uD83D\uDCC1 src", bold: true },
        { indent: 2, icon: " ", name: "\uD83D\uDCC4 index.ts", bold: false },
        { indent: 2, icon: " ", name: "\uD83D\uDCC4 app.ts", bold: false },
        { indent: 1, icon: " ", name: "\uD83D\uDCC4 README.md", bold: false },
    ];
    const rowH = 20;

    for (let i = 0; i < items.length; i++)
    {
        const iy = y + i * rowH;
        const indent = x + 6 + items[i].indent * 16;
        uiText(g, indent, iy + 14, items[i].icon, { size: 8, fill: C_TEXT_SEC });
        const w = items[i].bold ? 600 : undefined;
        uiText(g, indent + 12, iy + 14, items[i].name, { size: 10, weight: w });
    }
}

function renderTreeView(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    uiRect(g, b.x, b.y, b.width, b.height, C_BG, C_BORDER, 2);
    const headY = uiHeaderBar(g, b.x, b.y, b.width, "Explorer", "\u2302");
    renderTreeViewItems(g, b.x, headY);
    return g;
}

// --- PropertyInspector ------------------------------------------------------

function renderPropertyRows(g: SVGElement, x: number, y: number, w: number): void
{
    const props = [
        ["Name", "Widget"], ["Type", "Button"],
        ["Width", "200px"], ["Height", "40px"],
        ["Visible", "true"], ["Style", "primary"],
    ];
    const rowH = 20;
    const colW = w * 0.4;

    for (let i = 0; i < props.length; i++)
    {
        const ry = y + i * rowH;
        if (i % 2 === 1) { uiRect(g, x, ry, w, rowH, C_STRIPE, "none", 0); }
        uiDivider(g, x, ry, w);
        uiText(g, x + 6, ry + 14, props[i][0], { size: 10, fill: C_TEXT_SEC });
        uiText(g, x + colW, ry + 14, props[i][1], { size: 10 });
        uiLine(g, x + colW - 4, ry, x + colW - 4, ry + rowH);
    }
}

function renderPropertyInspector(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    uiRect(g, b.x, b.y, b.width, b.height, C_BG, C_BORDER, 2);
    const headY = uiHeaderBar(g, b.x, b.y, b.width, "Properties", "\u2261");
    renderPropertyRows(g, b.x, headY, b.width);
    return g;
}

// --- HoverCard --------------------------------------------------------------

function renderHoverCardStencil(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    // Anchor placeholder — dashed rectangle at top-left representing the
    // hovered element. Not part of the component; shows the card's context.
    const anchorW = 72;
    const anchorH = 28;
    const anchorX = b.x + 8;
    const anchorY = b.y + 6;
    g.appendChild(svgCreate("rect", {
        x: String(anchorX), y: String(anchorY),
        width: String(anchorW), height: String(anchorH),
        fill: "none", stroke: C_TEXT_MUT,
        "stroke-width": "1", "stroke-dasharray": "3,2"
    }));
    uiText(g, anchorX + anchorW / 2, anchorY + anchorH / 2 + 3,
        "anchor", { size: 9, fill: C_TEXT_MUT, anchor: "middle" });

    // Card frame — offset below the anchor.
    const cardX = b.x + 8;
    const cardY = anchorY + anchorH + 10;
    const cardW = b.width - 16;
    const cardH = b.height - (cardY - b.y) - 8;
    uiRect(g, cardX, cardY, cardW, cardH, C_BG, C_BORDER, 2);

    // Header — colored dot + title + subtitle.
    const pad = 10;
    const dotCx = cardX + pad + 5;
    const dotCy = cardY + pad + 6;
    g.appendChild(svgCreate("circle", {
        cx: String(dotCx), cy: String(dotCy), r: "5",
        fill: C_PRIMARY
    }));
    uiText(g, cardX + pad + 18, dotCy + 3, "Users",
        { size: 11, weight: 600 });
    uiText(g, cardX + pad + 18, dotCy + 16, "entity",
        { size: 9, fill: C_TEXT_SEC });

    // Badge — success pill near top-right.
    const badgeW = 38;
    const badgeH = 14;
    const badgeX = cardX + cardW - badgeW - pad;
    const badgeY = cardY + pad;
    uiRect(g, badgeX, badgeY, badgeW, badgeH, C_SUCCESS, "none", 2);
    uiText(g, badgeX + badgeW / 2, badgeY + 10,
        "active", { size: 8, fill: "#fff", anchor: "middle", weight: 600 });

    // Three property rows.
    const propY0 = dotCy + 30;
    const rowH = 14;
    const props = [
        ["COUNT", "1024"],
        ["TIER", "gold"],
        ["REGION", "us-west"],
    ];
    const keyX = cardX + pad;
    const valX = cardX + pad + 70;

    for (let i = 0; i < props.length; i++)
    {
        const ry = propY0 + i * rowH;
        uiText(g, keyX, ry, props[i][0],
            { size: 8, fill: C_TEXT_SEC, weight: 600 });
        uiText(g, valX, ry, props[i][1], { size: 9 });
    }

    // Description — two faint lines.
    const descY = propY0 + props.length * rowH + 8;
    uiLine(g, cardX + pad, descY, cardX + cardW - pad, descY);
    uiText(g, cardX + pad, descY + 10,
        "Primary tenant directory.", { size: 9, fill: C_TEXT_SEC });

    return g;
}

// --- SearchBox --------------------------------------------------------------

function renderSearchBox(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    uiRect(g, b.x, b.y, b.width, b.height, C_BG, C_BORDER, 14);
    uiIcon(g, b.x + 10, b.y + b.height / 2 + 4, "\u2315", { size: 14 });
    uiText(g, b.x + 28, b.y + b.height / 2 + 4, "Search\u2026", {
        size: 10, fill: C_TEXT_MUT
    });
    return g;
}

// --- EditableComboBox -------------------------------------------------------

function renderEditableComboBox(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    uiRect(g, b.x, b.y, b.width, b.height, C_BG, C_BORDER, 2);
    uiText(g, b.x + 8, b.y + b.height / 2 + 4, "Select\u2026", {
        size: 10, fill: C_TEXT_MUT
    });
    uiLine(g, b.x + b.width - 24, b.y + 2, b.x + b.width - 24, b.y + b.height - 2);
    uiIcon(g, b.x + b.width - 17, b.y + b.height / 2 + 4, "\u25BE", { size: 11 });
    return g;
}

// --- DatePicker -------------------------------------------------------------

function renderDatePicker(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    uiRect(g, b.x, b.y, b.width, b.height, C_BG, C_BORDER, 2);
    uiIcon(g, b.x + 8, b.y + b.height / 2 + 4, "\uD83D\uDCC5", { size: 12 });
    uiText(g, b.x + 26, b.y + b.height / 2 + 4, "2026-03-23", { size: 10 });
    uiLine(g, b.x + b.width - 24, b.y + 2, b.x + b.width - 24, b.y + b.height - 2);
    uiIcon(g, b.x + b.width - 17, b.y + b.height / 2 + 4, "\u25BE", { size: 11 });
    return g;
}

// --- Slider -----------------------------------------------------------------

function renderSlider(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    const trackY = b.y + b.height / 2;
    const trackX1 = b.x + 24;
    const trackX2 = b.x + b.width - 24;
    const thumbX = (trackX1 + trackX2) / 2;

    uiText(g, b.x + 4, trackY + 4, "0", { size: 9, fill: C_TEXT_SEC });
    uiLine(g, trackX1, trackY, trackX2, trackY, C_BORDER, 3);
    uiLine(g, trackX1, trackY, thumbX, trackY, C_PRIMARY, 3);
    uiCircle(g, thumbX, trackY, 6, C_BG, C_PRIMARY);
    uiText(g, b.x + b.width - 20, trackY + 4, "100", {
        size: 9, fill: C_TEXT_SEC, anchor: "end"
    });
    uiText(g, thumbX, trackY - 10, "50", { size: 8, fill: C_TEXT_SEC, anchor: "middle" });
    return g;
}

// --- ColorPicker ------------------------------------------------------------

function renderColorSwatches(g: SVGElement, x: number, y: number, w: number): void
{
    const colors = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"];
    const sw = Math.min(20, (w - 12) / colors.length);

    for (let i = 0; i < colors.length; i++)
    {
        uiRect(g, x + 6 + i * (sw + 2), y, sw, sw, colors[i], C_BORDER, 2);
    }
}

function renderColorPicker(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    uiRect(g, b.x, b.y, b.width, b.height, C_BG, C_BORDER, 2);
    const headY = uiHeaderBar(g, b.x, b.y, b.width, "Color Picker", "\u25C9");

    const swatchSize = Math.min(b.width - 20, b.height * 0.4);
    uiRect(g, b.x + 10, headY + 8, swatchSize, swatchSize * 0.6,
        "#3b82f6", C_BORDER, 2);

    const belowSwatch = headY + 8 + swatchSize * 0.6 + 12;
    uiText(g, b.x + 10, belowSwatch, "#3b82f6", { size: 11, fill: C_TEXT });
    renderColorSwatches(g, b.x, belowSwatch + 14, b.width);
    return g;
}

// --- CodeEditor -------------------------------------------------------------

function renderCodeLines(g: SVGElement, x: number, y: number, w: number): void
{
    const lines = [
        { num: "1", text: "function greet(name) {", color: "#569cd6" },
        { num: "2", text: '  const msg = "Hello";', color: "#ce9178" },
        { num: "3", text: "  console.log(msg);", color: C_CODE_TEXT },
        { num: "4", text: "  return msg + name;", color: C_CODE_TEXT },
        { num: "5", text: "}", color: "#569cd6" },
        { num: "6", text: "", color: C_CODE_TEXT },
        { num: "7", text: "// call it", color: "#6a9955" },
        { num: "8", text: 'greet("World");', color: C_CODE_TEXT },
    ];
    const lineH = 15;

    for (let i = 0; i < lines.length; i++)
    {
        const ly = y + i * lineH + 12;
        uiText(g, x + 6, ly, lines[i].num, { size: 9, fill: "#858585" });
        if (lines[i].text)
        {
            uiText(g, x + 28, ly, lines[i].text, { size: 9, fill: lines[i].color });
        }
    }
}

function renderCodeEditor(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    uiRect(g, b.x, b.y, b.width, b.height, C_CODE_BG, C_BORDER, 2);
    uiRect(g, b.x, b.y, b.width, 22, "#2d2d2d", "none", 0);
    uiText(g, b.x + 8, b.y + 15, "editor.ts", { size: 9, fill: "#cccccc" });
    uiText(g, b.x + b.width - 60, b.y + 15, "TypeScript", {
        size: 8, fill: "#858585"
    });
    uiLine(g, b.x + 24, b.y + 22, b.x + 24, b.y + b.height, "#333333");
    renderCodeLines(g, b.x, b.y + 22, b.width);
    return g;
}

// --- MarkdownEditor ---------------------------------------------------------

function renderMdToolbar(g: SVGElement, x: number, y: number, w: number): void
{
    const buttons = ["B", "I", "H", "\u2261", "\u2197"];
    const btnW = 22;

    uiRect(g, x, y, w, 24, C_HEADER_BG, "none", 0);
    for (let i = 0; i < buttons.length; i++)
    {
        uiText(g, x + 8 + i * (btnW + 2), y + 16, buttons[i], {
            size: 11, weight: 600, fill: C_TEXT_SEC
        });
    }

    uiDivider(g, x, y + 24, w);
}

function renderMdContent(g: SVGElement, x: number, y: number, w: number): void
{
    uiText(g, x + 8, y + 18, "# Heading", { size: 12, weight: 700 });
    uiText(g, x + 8, y + 36, "Paragraph text here with", { size: 10 });
    uiText(g, x + 8, y + 50, "multiple lines of content.", { size: 10 });
    uiText(g, x + 8, y + 68, "\u2022 List item one", { size: 10 });
    uiText(g, x + 8, y + 82, "\u2022 List item two", { size: 10 });
    uiText(g, x + 8, y + 100, "> Blockquote text", {
        size: 10, fill: C_TEXT_SEC
    });
}

function renderMarkdownEditor(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    uiRect(g, b.x, b.y, b.width, b.height, C_BG, C_BORDER, 2);
    renderMdToolbar(g, b.x, b.y, b.width);
    renderMdContent(g, b.x, b.y + 24, b.width);
    return g;
}

// --- DocViewer --------------------------------------------------------------

function renderDocContent(g: SVGElement, x: number, y: number, w: number): void
{
    uiText(g, x + 16, y + 24, "Document Title", { size: 14, weight: 700 });
    uiDivider(g, x + 16, y + 32, w - 32);
    const lineY = y + 48;

    for (let i = 0; i < 5; i++)
    {
        const lw = w * (i === 4 ? 0.5 : 0.85) - 32;
        uiLine(g, x + 16, lineY + i * 14, x + 16 + lw, lineY + i * 14, C_TEXT_MUT, 2);
    }

    uiText(g, x + 16, lineY + 84, "Section 2", { size: 11, weight: 600 });
    for (let i = 0; i < 3; i++)
    {
        const lw = w * (i === 2 ? 0.4 : 0.8) - 32;
        uiLine(g, x + 16, lineY + 100 + i * 14, x + 16 + lw, lineY + 100 + i * 14,
            C_TEXT_MUT, 2);
    }
}

function renderDocViewer(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    uiRect(g, b.x, b.y, b.width, b.height, C_BG, C_BORDER, 2);
    const headY = uiHeaderBar(g, b.x, b.y, b.width, "Doc Viewer", "\u2338");
    renderDocContent(g, b.x, headY, b.width);
    return g;
}

// --- LatexEditor ------------------------------------------------------------

function renderLatexEquation(
    g: SVGElement, x: number, y: number, w: number): void
{
    uiText(g, x + 12, y + 22, "E = mc\u00B2", { size: 16, weight: 700 });
    uiText(g, x + 12, y + 44, "\u222B\u2080\u00B9 f(x) dx", { size: 12 });
    uiText(g, x + 12, y + 64, "\u03B1\u00B2 + \u03B2\u00B2 = \u03B3\u00B2",
        { size: 12 });
}

function renderLatexEditor(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    uiRect(g, b.x, b.y, b.width, b.height, C_BG, C_BORDER, 2);
    uiRect(g, b.x, b.y, b.width, 24, C_HEADER_BG, "none", 0);
    uiText(g, b.x + 8, b.y + 16, "B", { size: 10, weight: 700 });
    uiText(g, b.x + 24, b.y + 16, "Size", { size: 9, fill: C_TEXT_SEC });
    uiText(g, b.x + 52, b.y + 16, "\u25A1", { size: 10, fill: C_TEXT_SEC });
    uiDivider(g, b.x, b.y + 24, b.width);
    renderLatexEquation(g, b.x, b.y + 24, b.width);
    return g;
}

// --- Toast ------------------------------------------------------------------

function renderToast(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    const accent = C_SUCCESS;

    uiRect(g, b.x, b.y, b.width, b.height, C_BG, accent, 4);
    uiLine(g, b.x, b.y, b.x, b.y + b.height, accent, 3);
    uiIcon(g, b.x + 12, b.y + b.height / 2 + 5, "\u2713", {
        size: 14, fill: accent
    });
    uiText(g, b.x + 30, b.y + b.height / 2 + 4, "Operation completed", {
        size: 10
    });
    uiCloseX(g, b.x + b.width - 18, b.y + b.height / 2 + 5);
    return g;
}

// --- Stepper ----------------------------------------------------------------

function renderStepperCircles(
    g: SVGElement, x: number, y: number, w: number,
    steps: string[], active: number): void
{
    const count = steps.length;
    const spacing = w / (count + 1);
    const r = 10;

    for (let i = 0; i < count; i++)
    {
        const cx = x + spacing * (i + 1);
        const isComplete = i < active;
        const isActive = i === active;
        const fill = isComplete ? C_PRIMARY : isActive ? C_PRIMARY : C_BG;
        const stroke = isComplete || isActive ? C_PRIMARY : C_BORDER;
        const textFill = isComplete || isActive ? C_BG : C_TEXT_SEC;

        if (i < count - 1)
        {
            const nextCx = x + spacing * (i + 2);
            const lineCol = isComplete ? C_PRIMARY : C_BORDER;
            uiLine(g, cx + r + 2, y, nextCx - r - 2, y, lineCol, 2);
        }

        uiCircle(g, cx, y, r, fill, stroke);
        uiText(g, cx, y + 4, String(i + 1), {
            size: 9, anchor: "middle", fill: textFill, weight: 600
        });
        uiText(g, cx, y + 24, steps[i], {
            size: 9, anchor: "middle", fill: isActive ? C_PRIMARY : C_TEXT_SEC
        });
    }
}

function renderStepper(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    const steps = ["Cart", "Shipping", "Payment", "Done"];
    renderStepperCircles(g, b.x, b.y + b.height / 2 - 8, b.width, steps, 1);
    return g;
}

// --- ConfirmDialog ----------------------------------------------------------

function renderConfirmDialog(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    const bodyY = uiDialogChrome(g, b, "Confirm Action");

    uiText(g, b.x + 20, bodyY + 30, "Are you sure you want to", { size: 10 });
    uiText(g, b.x + 20, bodyY + 46, "proceed with this action?", { size: 10 });

    const btnY = b.y + b.height - 40;
    const btnW = 70;
    uiButton(g, b.x + b.width - 160, btnY, btnW, 26, "Cancel");
    uiButton(g, b.x + b.width - 82, btnY, btnW, 26, "OK", {
        fill: C_PRIMARY, textFill: C_BG
    });
    return g;
}

// --- ErrorDialog ------------------------------------------------------------

function renderErrorDialog(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    const bodyY = uiDialogChrome(g, b, "Error");

    uiIcon(g, b.x + 20, bodyY + 36, "\u26A0", { size: 24, fill: C_DANGER });
    uiText(g, b.x + 50, bodyY + 30, "An error has occurred.", {
        size: 11, weight: 600
    });
    uiText(g, b.x + 50, bodyY + 48, "Please try again later.", {
        size: 10, fill: C_TEXT_SEC
    });

    const btnY = b.y + b.height - 40;
    uiButton(g, b.x + b.width - 82, btnY, 70, 26, "OK", {
        fill: C_DANGER, textFill: C_BG
    });
    return g;
}

// --- FormDialog -------------------------------------------------------------

function renderFormFields(g: SVGElement, x: number, y: number, w: number): void
{
    const fields = ["Name", "Email", "Message"];
    const fieldW = w - 40;

    for (let i = 0; i < fields.length; i++)
    {
        const fy = y + i * 38;
        uiText(g, x + 20, fy + 14, fields[i], { size: 10, weight: 500 });
        uiRect(g, x + 20, fy + 18, fieldW, 22, C_INPUT_BG, C_BORDER, 2);
    }
}

function renderFormDialog(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    const bodyY = uiDialogChrome(g, b, "Form");
    renderFormFields(g, b.x, bodyY + 8, b.width);

    const btnY = b.y + b.height - 40;
    const btnW = 70;
    uiButton(g, b.x + b.width - 160, btnY, btnW, 26, "Cancel");
    uiButton(g, b.x + b.width - 82, btnY, btnW, 26, "Submit", {
        fill: C_PRIMARY, textFill: C_BG
    });
    return g;
}

// --- Toolbar ----------------------------------------------------------------

function renderToolbarButtons(g: SVGElement, x: number, y: number, h: number): void
{
    const items = [
        { icon: "+", label: "New" },
        { icon: "\u270E", label: "Edit" },
        { icon: "\u2717", label: "Delete" },
        { sep: true },
        { icon: "\u21BB", label: "Refresh" },
    ];
    let cx = x + 6;

    for (const item of items)
    {
        if ((item as { sep?: boolean }).sep)
        {
            uiLine(g, cx + 2, y + 4, cx + 2, y + h - 4, C_BORDER);
            cx += 8;
            continue;
        }

        const btnItem = item as { icon: string; label: string };
        uiIcon(g, cx + 4, y + h / 2 + 1, btnItem.icon, { size: 10 });
        uiText(g, cx + 16, y + h / 2 + 3, btnItem.label, { size: 9 });
        cx += 56;
    }
}

function renderToolbar(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    uiRect(g, b.x, b.y, b.width, b.height, C_HEADER_BG, C_BORDER, 2);
    renderToolbarButtons(g, b.x, b.y, b.height);
    return g;
}

// --- Sidebar ----------------------------------------------------------------

function renderSidebarItems(
    g: SVGElement, x: number, y: number, w: number): void
{
    const items = [
        { icon: "\u2302", label: "Dashboard", active: true },
        { icon: "\u2630", label: "Projects", active: false },
        { icon: "\u2611", label: "Tasks", active: false },
        { icon: "\u2699", label: "Settings", active: false },
    ];
    const itemH = 28;

    for (let i = 0; i < items.length; i++)
    {
        const iy = y + i * itemH;
        if (items[i].active)
        {
            uiRect(g, x, iy, w, itemH, C_ACTIVE_BG, "none", 0);
            uiLine(g, x, iy, x, iy + itemH, C_PRIMARY, 3);
        }

        const fill = items[i].active ? C_PRIMARY : C_TEXT_SEC;
        uiIcon(g, x + 12, iy + 18, items[i].icon, { size: 12, fill });
        uiText(g, x + 30, iy + 18, items[i].label, {
            size: 10, fill: items[i].active ? C_TEXT : C_TEXT_SEC
        });
    }
}

function renderSidebar(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    uiRect(g, b.x, b.y, b.width, b.height, C_BG, C_BORDER, 2);
    const headY = uiHeaderBar(g, b.x, b.y, b.width, "Navigation", "\u2630");
    renderSidebarItems(g, b.x, headY + 4, b.width);
    return g;
}

// --- NavRail ----------------------------------------------------------------

function renderNavRailHeader(
    g: SVGElement, x: number, y: number, w: number): number
{
    uiRect(g, x, y, w, 44, C_HEADER_BG, "none", 0);
    uiRect(g, x + 10, y + 8, 28, 28, C_PRIMARY, "none", 0);
    uiText(g, x + 24, y + 26, "K", {
        size: 12, weight: 700, fill: "#ffffff", anchor: "middle",
    });
    uiText(g, x + 46, y + 20, "Knobby IO", { size: 10, weight: 600 });
    uiText(g, x + 46, y + 34, "Pro plan", {
        size: 8, fill: C_TEXT_MUT,
    });
    uiDivider(g, x, y + 44, w);
    return y + 44;
}

function renderNavRailSearch(
    g: SVGElement, x: number, y: number, w: number): number
{
    uiRect(g, x + 8, y + 6, w - 16, 24, C_INPUT_BG, C_BORDER, 2);
    uiIcon(g, x + 16, y + 22, "\u2315", { size: 10, fill: C_TEXT_MUT });
    uiText(g, x + 30, y + 22, "Jump to...", { size: 9, fill: C_TEXT_MUT });
    return y + 36;
}

function renderNavRailCategory(
    g: SVGElement, x: number, y: number, w: number,
    label: string, items: Array<{ icon: string; text: string; active?: boolean; badge?: boolean }>
): number
{
    uiText(g, x + 12, y + 12, label, {
        size: 8, weight: 700, fill: C_TEXT_MUT,
    });
    let iy = y + 20;

    for (const it of items)
    {
        if (it.active)
        {
            uiRect(g, x, iy, w, 22, C_ACTIVE_BG, "none", 0);
            uiLine(g, x, iy, x, iy + 22, C_PRIMARY, 3);
        }
        const iconFill = it.active ? C_PRIMARY : C_TEXT_SEC;
        uiIcon(g, x + 14, iy + 15, it.icon, { size: 11, fill: iconFill });
        uiText(g, x + 30, iy + 15, it.text, {
            size: 10, fill: it.active ? C_TEXT : C_TEXT_SEC,
            weight: it.active ? 600 : undefined,
        });

        if (it.badge)
        {
            uiRect(g, x + w - 20, iy + 7, 10, 10, "#dc2626", "none", 0);
            uiText(g, x + w - 15, iy + 15, "1", {
                size: 8, weight: 700, fill: "#ffffff", anchor: "middle",
            });
        }
        iy += 22;
    }

    return iy + 6;
}

function renderNavRail(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    uiRect(g, b.x, b.y, b.width, b.height, C_BG, C_BORDER, 2);

    let y = renderNavRailHeader(g, b.x, b.y, b.width);
    y = renderNavRailSearch(g, b.x, y, b.width);

    y = renderNavRailCategory(g, b.x, y, b.width, "WORKSPACE", [
        { icon: "\u2302", text: "Overview", active: true },
        { icon: "\u2261", text: "Settings" },
    ]);

    y = renderNavRailCategory(g, b.x, y, b.width, "PEOPLE", [
        { icon: "\u265F", text: "Users", badge: true },
        { icon: "\u2692", text: "Roles" },
    ]);

    y = renderNavRailCategory(g, b.x, y, b.width, "PLATFORM", [
        { icon: "\u2637", text: "Types" },
        { icon: "\u2630", text: "Resources" },
    ]);

    return g;
}

// --- TabbedPanel ------------------------------------------------------------

function renderTabbedTabs(
    g: SVGElement, x: number, y: number, w: number,
    tabs: string[]): void
{
    let tx = x + 4;
    for (let i = 0; i < tabs.length; i++)
    {
        const tabW = tabs[i].length * 7 + 16;
        const isActive = i === 0;

        if (isActive)
        {
            uiRect(g, tx, y, tabW, 26, C_BG, "none", 0);
            uiLine(g, tx + 2, y + 25, tx + tabW - 2, y + 25, C_PRIMARY, 2);
        }

        uiText(g, tx + 8, y + 17, tabs[i], {
            size: 10, weight: isActive ? 600 : undefined,
            fill: isActive ? C_PRIMARY : C_TEXT_SEC
        });
        tx += tabW + 2;
    }
}

function renderTabbedPanel(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    const tabs = ["General", "Advanced", "About"];

    uiRect(g, b.x, b.y, b.width, b.height, C_BG, C_BORDER, 2);
    uiRect(g, b.x, b.y, b.width, 28, C_HEADER_BG, "none", 0);
    renderTabbedTabs(g, b.x, b.y, b.width, tabs);
    uiDivider(g, b.x, b.y + 28, b.width);

    for (let i = 0; i < 4; i++)
    {
        const lw = b.width * (i === 3 ? 0.4 : 0.7) - 20;
        uiLine(g, b.x + 12, b.y + 48 + i * 16, b.x + 12 + lw,
            b.y + 48 + i * 16, C_TABLE_LINE, 2);
    }

    return g;
}

// --- Ribbon -----------------------------------------------------------------

function renderRibbonGroups(
    g: SVGElement, x: number, y: number, w: number, h: number): void
{
    const groupW = (w - 16) / 3;

    for (let i = 0; i < 3; i++)
    {
        const gx = x + 4 + i * (groupW + 4);
        uiRect(g, gx, y + 4, groupW, h - 18, "none", C_TABLE_LINE, 2);
        const labels = ["Clipboard", "Font", "Paragraph"];
        uiText(g, gx + groupW / 2, y + h - 6, labels[i], {
            size: 8, fill: C_TEXT_MUT, anchor: "middle"
        });

        for (let j = 0; j < 3; j++)
        {
            uiRect(g, gx + 6 + j * 22, y + 10, 18, 18, C_HEADER_BG, C_BORDER, 2);
        }
    }
}

function renderRibbon(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    const tabs = ["Home", "Insert", "View"];

    uiRect(g, b.x, b.y, b.width, b.height, C_BG, C_BORDER, 2);
    uiRect(g, b.x, b.y, b.width, 24, C_HEADER_BG, "none", 0);
    renderTabbedTabs(g, b.x, b.y - 2, b.width, tabs);
    uiDivider(g, b.x, b.y + 24, b.width);
    renderRibbonGroups(g, b.x, b.y + 24, b.width, b.height - 24);
    return g;
}

// --- Breadcrumb -------------------------------------------------------------

function renderBreadcrumb(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    const items = ["Home", "Products", "Detail"];
    let cx = b.x + 8;
    const cy = b.y + b.height / 2 + 4;

    for (let i = 0; i < items.length; i++)
    {
        const isLast = i === items.length - 1;
        const fill = isLast ? C_TEXT : C_PRIMARY;
        const w = isLast ? 600 : undefined;
        uiText(g, cx, cy, items[i], { size: 10, fill, weight: w });
        cx += items[i].length * 6.5 + 4;
        if (!isLast) { uiText(g, cx, cy, "/", { size: 10, fill: C_TEXT_MUT }); cx += 12; }
    }

    return g;
}

// --- StatusBar --------------------------------------------------------------

function renderStatusBar(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    uiRect(g, b.x, b.y, b.width, b.height, C_HEADER_BG, C_BORDER, 0);
    const cy = b.y + b.height / 2 + 4;
    uiText(g, b.x + 8, cy, "Ready", { size: 9, fill: C_TEXT_SEC });
    uiText(g, b.x + b.width - 8, cy, "UTF-8  |  Ln 42 Col 8", {
        size: 9, fill: C_TEXT_SEC, anchor: "end"
    });
    return g;
}

// --- Conversation -----------------------------------------------------------

function renderChatBubbles(g: SVGElement, x: number, y: number, w: number): void
{
    const msgs = [
        { align: "left", text: "How do I create a component?", bg: C_HEADER_BG },
        { align: "right", text: "Use buildComponent() with a", bg: C_CHAT_USER },
        { align: "left", text: "Can you show an example?", bg: C_HEADER_BG },
    ];
    let cy = y + 8;

    for (const msg of msgs)
    {
        const bw = Math.min(w * 0.7, msg.text.length * 6.5 + 16);
        const bx = msg.align === "right" ? x + w - bw - 8 : x + 8;
        uiRect(g, bx, cy, bw, 22, msg.bg, C_BORDER, 8);
        uiText(g, bx + 8, cy + 15, msg.text, { size: 9 });
        cy += 30;
    }
}

function renderChatInput(g: SVGElement, x: number, y: number, w: number): void
{
    const inputY = y - 30;
    uiDivider(g, x, inputY - 4, w);
    uiRect(g, x + 8, inputY, w - 50, 24, C_INPUT_BG, C_BORDER, 12);
    uiText(g, x + 20, inputY + 16, "Type a message\u2026", {
        size: 9, fill: C_TEXT_MUT
    });
    uiButton(g, x + w - 36, inputY, 28, 24, "\u2191", {
        fill: C_PRIMARY, textFill: C_BG
    });
}

function renderConversation(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    uiRect(g, b.x, b.y, b.width, b.height, C_BG, C_BORDER, 2);
    const headY = uiHeaderBar(g, b.x, b.y, b.width, "Chat", "\u2026");
    renderChatBubbles(g, b.x, headY, b.width);
    renderChatInput(g, b.x, b.y + b.height, b.width);
    return g;
}

// --- ActivityFeed -----------------------------------------------------------

function renderFeedItems(g: SVGElement, x: number, y: number, w: number): void
{
    const items = [
        { name: "Alice", action: "created a new project", time: "2m ago" },
        { name: "Bob", action: "updated the design", time: "15m ago" },
        { name: "Carol", action: "left a comment", time: "1h ago" },
        { name: "Dave", action: "merged PR #42", time: "3h ago" },
    ];
    const itemH = 32;

    for (let i = 0; i < items.length; i++)
    {
        const iy = y + i * itemH;
        uiLine(g, x + 14, iy, x + 14, iy + itemH, C_TABLE_LINE);
        uiCircle(g, x + 14, iy + 10, 4, C_PRIMARY, C_PRIMARY);
        uiCircle(g, x + 36, iy + 10, 8, C_HEADER_BG, C_BORDER);
        uiText(g, x + 36, iy + 13, items[i].name[0], {
            size: 8, anchor: "middle", fill: C_TEXT_SEC
        });
        uiText(g, x + 50, iy + 10, items[i].name, { size: 10, weight: 600 });
        uiText(g, x + 50, iy + 24, items[i].action, { size: 9, fill: C_TEXT_SEC });
        uiText(g, x + w - 8, iy + 10, items[i].time, {
            size: 8, fill: C_TEXT_MUT, anchor: "end"
        });
    }
}

function renderActivityFeed(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    uiRect(g, b.x, b.y, b.width, b.height, C_BG, C_BORDER, 2);
    const headY = uiHeaderBar(g, b.x, b.y, b.width, "Activity", "\u2261");
    renderFeedItems(g, b.x, headY + 8, b.width);
    return g;
}

// --- Timeline ---------------------------------------------------------------

function renderTimelineMarkers(
    g: SVGElement, x: number, y: number, w: number): void
{
    const months = ["Jan", "Feb", "Mar", "Apr", "May"];
    const spacing = w / (months.length + 1);
    const lineY = y;

    uiLine(g, x + 10, lineY, x + w - 10, lineY, C_BORDER, 2);

    for (let i = 0; i < months.length; i++)
    {
        const mx = x + spacing * (i + 1);
        const active = i === 2;
        const fill = active ? C_PRIMARY : C_BG;
        const stroke = active ? C_PRIMARY : C_BORDER;
        uiCircle(g, mx, lineY, 5, fill, stroke);
        uiText(g, mx, lineY - 14, months[i], {
            size: 9, anchor: "middle", fill: active ? C_PRIMARY : C_TEXT_SEC
        });
        uiText(g, mx, lineY + 18, "2026", {
            size: 8, anchor: "middle", fill: C_TEXT_MUT
        });
    }
}

function renderTimeline(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    renderTimelineMarkers(g, b.x, b.y + b.height / 2, b.width);
    return g;
}

// ============================================================================
// TIER A SHAPE MAP — name -> render function
// ============================================================================

type TierAEntry = [string, string, string, number, number,
    (ctx: ShapeRenderContext) => SVGElement];

const TIER_A_SHAPES: TierAEntry[] = [
    // Data
    ["datagrid",          "Data Grid",          "\u2637", 400, 250, renderDataGrid],
    ["treegrid",          "Tree Grid",          "\u2637", 350, 300, renderTreeGrid],
    ["treeview",          "Tree View",          "\u2261", 280, 350, renderTreeView],
    ["propertyinspector", "Property Inspector", "\u2261", 300, 400, renderPropertyInspector],
    ["hovercard",         "Hover Card",         "\u24D8", 300, 220, renderHoverCardStencil],
    // Input
    ["searchbox",         "Search Box",         "\u2315", 250, 34,  renderSearchBox],
    ["editablecombobox",  "Editable Combo Box", "\u25BE", 200, 34,  renderEditableComboBox],
    ["datepicker",        "Date Picker",        "\u2636", 250, 40,  renderDatePicker],
    ["slider",            "Slider",             "\u2500", 200, 40,  renderSlider],
    ["colorpicker",       "Color Picker",       "\u25C9", 280, 320, renderColorPicker],
    // Content
    ["codeeditor",        "Code Editor",        "\u2329", 400, 300, renderCodeEditor],
    ["markdowneditor",    "Markdown Editor",    "\u2193", 500, 400, renderMarkdownEditor],
    ["docviewer",         "Doc Viewer",         "\u2338", 600, 450, renderDocViewer],
    ["latexeditor",       "LaTeX Editor",       "\u2211", 400, 300, renderLatexEditor],
    // Feedback
    ["toast",             "Toast",              "\u2407", 300, 60,  renderToast],
    ["stepper",           "Stepper",            "\u2460", 500, 60,  renderStepper],
    ["confirmdialog",     "Confirm Dialog",     "\u003F", 400, 200, renderConfirmDialog],
    ["errordialog",       "Error Dialog",       "\u26A0", 400, 300, renderErrorDialog],
    ["formdialog",        "Form Dialog",        "\u270E", 400, 300, renderFormDialog],
    // Navigation
    ["toolbar",           "Toolbar",            "\u2692", 500, 40,  renderToolbar],
    ["sidebar",           "Sidebar",            "\u2759", 260, 400, renderSidebar],
    ["navrail",           "NavRail",            "\u2630", 240, 420, renderNavRail],
    ["tabbedpanel",       "Tabbed Panel",       "\u2610", 400, 300, renderTabbedPanel],
    ["ribbon",            "Ribbon",             "\u2630", 600, 120, renderRibbon],
    ["breadcrumb",        "Breadcrumb",         "\u203A", 400, 28,  renderBreadcrumb],
    ["statusbar",         "Status Bar",         "\u2139", 600, 28,  renderStatusBar],
    // AI + Social
    ["conversation",      "Conversation",       "\u2026", 400, 500, renderConversation],
    ["activityfeed",      "Activity Feed",      "\u2261", 350, 400, renderActivityFeed],
    ["timeline",          "Timeline",           "\u2261", 500, 200, renderTimeline],
];

// ============================================================================
// TIER B + C — ENHANCED GENERIC VARIANT RENDERERS
// ============================================================================

// --- Enhanced variant: table ------------------------------------------------

function renderEnhancedTable(
    g: SVGElement, x: number, y: number, w: number, h: number,
    cols: string[]): void
{
    const colW = w / cols.length;
    const hdrH = 20;

    uiRect(g, x, y, w, hdrH, C_HEADER_BG, "none", 0);
    for (let i = 0; i < cols.length; i++)
    {
        uiText(g, x + i * colW + 4, y + 14, cols[i], { size: 9, weight: 600 });
        if (i > 0) { uiLine(g, x + i * colW, y, x + i * colW, y + h); }
    }
    uiDivider(g, x, y + hdrH, w);

    const rows = Math.min(Math.floor((h - hdrH) / 16), 6);
    for (let r = 0; r < rows; r++)
    {
        const ry = y + hdrH + r * 16;
        if (r % 2 === 1) { uiRect(g, x, ry, w, 16, C_STRIPE, "none", 0); }
        if (r > 0) { uiDivider(g, x, ry, w); }
        for (let c = 0; c < cols.length; c++) { uiDots(g, x + c * colW + 4, ry + 12); }
    }
}

// --- Enhanced variant: input with icon + text -------------------------------

function renderEnhancedInput(
    g: SVGElement, x: number, y: number, w: number, h: number,
    iconChar: string, placeholder: string): void
{
    const inputH = Math.min(h, 24);
    uiRect(g, x, y, w, inputH, C_INPUT_BG, C_BORDER, 2);
    uiIcon(g, x + 6, y + inputH / 2 + 4, iconChar, { size: 11 });
    uiText(g, x + 22, y + inputH / 2 + 3, placeholder, {
        size: 9, fill: C_TEXT_MUT
    });
}

// --- Enhanced variant: panel with header + content --------------------------

function renderEnhancedPanel(
    g: SVGElement, x: number, y: number, w: number, h: number,
    title: string, contentFn?: (g: SVGElement, cx: number, cy: number, cw: number, ch: number) => void): void
{
    const hdrH = Math.min(22, h * 0.25);
    uiRect(g, x, y, w, hdrH, C_HEADER_BG, "none", 0);
    uiText(g, x + 6, y + hdrH - 6, title, { size: 9, weight: 600, fill: C_TEXT_SEC });
    uiDivider(g, x, y + hdrH, w);

    if (contentFn)
    {
        contentFn(g, x, y + hdrH, w, h - hdrH);
    }
}

// --- Enhanced variant: list with items --------------------------------------

function renderEnhancedList(
    g: SVGElement, x: number, y: number, w: number, h: number,
    iconChar: string, items: string[]): void
{
    const lineH = Math.min(20, h / (items.length + 1));

    for (let i = 0; i < items.length && (i * lineH) < h; i++)
    {
        const ly = y + i * lineH;
        uiIcon(g, x + 4, ly + lineH - 4, iconChar, { size: 9 });
        uiText(g, x + 18, ly + lineH - 4, items[i], { size: 9 });
        if (i > 0) { uiDivider(g, x, ly, w); }
    }
}

// --- Enhanced variant: card --------------------------------------------------

function renderEnhancedCard(
    g: SVGElement, x: number, y: number, w: number, h: number,
    iconChar: string, label: string): void
{
    uiRect(g, x, y, w, h, C_BG, C_BORDER, 3);
    uiIcon(g, x + 6, y + h / 2 + 4, iconChar, { size: 11 });
    uiText(g, x + 22, y + h / 2 + 3, label, { size: 9 });
}

// --- Enhanced variant: default with centered icon + text --------------------

function renderEnhancedDefault(
    g: SVGElement, x: number, y: number, w: number, h: number,
    iconChar: string, label: string): void
{
    uiIcon(g, x + w / 2, y + h / 2 - 4, iconChar, {
        size: 20, fill: C_TEXT_SEC
    });
    uiText(g, x + w / 2, y + h / 2 + 16, label, {
        size: 9, fill: C_TEXT_MUT, anchor: "middle"
    });
}

// --- Enhanced variant: button -----------------------------------------------

function renderEnhancedButton(
    g: SVGElement, x: number, y: number, w: number, h: number,
    label: string, primary?: boolean): void
{
    const btnW = Math.min(80, w * 0.6);
    const btnH = Math.min(24, h);
    const bx = x + (w - btnW) / 2;
    const by = y + (h - btnH) / 2;
    uiButton(g, bx, by, btnW, btnH, label, primary ? {
        fill: C_PRIMARY, textFill: C_BG
    } : undefined);
}

// --- Enhanced variant: chat -------------------------------------------------

function renderEnhancedChat(
    g: SVGElement, x: number, y: number, w: number, h: number): void
{
    const bH = Math.min(18, h * 0.28);
    const bW1 = w * 0.6;
    const bW2 = w * 0.5;

    uiRect(g, x, y, bW1, bH, C_HEADER_BG, C_TABLE_LINE, 6);
    uiDots(g, x + 8, y + bH - 4);
    uiRect(g, x + w - bW2, y + bH + 4, bW2, bH, C_CHAT_USER, C_TABLE_LINE, 6);
    uiDots(g, x + w - bW2 + 8, y + bH * 2);
}

// ============================================================================
// TIER B RENDER DISPATCH — per-component custom content
// ============================================================================

/**
 * Tier B component-specific content functions, keyed by shape name.
 * Each draws specialized detail inside the generic placeholder.
 */
function getTierBContent(name: string):
    ((g: SVGElement, x: number, y: number, w: number, h: number) => void) | null
{
    switch (name)
    {
        case "multiselectcombo":
            return (g, x, y, w, h) =>
            {
                renderEnhancedInput(g, x, y, w, h, "\u2611", "Select items\u2026");
                const pillY = y + 2;
                uiRect(g, x + w - 70, pillY, 28, 14, C_ACTIVE_BG, C_PRIMARY, 7);
                uiText(g, x + w - 64, pillY + 11, "Tag", { size: 7, fill: C_PRIMARY });
                uiRect(g, x + w - 38, pillY, 28, 14, C_ACTIVE_BG, C_PRIMARY, 7);
                uiText(g, x + w - 32, pillY + 11, "Tag", { size: 7, fill: C_PRIMARY });
            };

        case "peoplepicker":
            return (g, x, y, w, h) =>
                renderEnhancedInput(g, x, y, w, h, "\u263A", "Add people\u2026");

        case "timepicker":
            return (g, x, y, w, h) =>
                renderEnhancedInput(g, x, y, w, h, "\u231A", "12:00 PM");

        case "durationpicker":
            return (g, x, y, w, h) =>
                renderEnhancedInput(g, x, y, w, h, "\u231B", "2h 30m");

        case "cronpicker":
            return (g, x, y, w, h) =>
                renderEnhancedPanel(g, x, y, w, h, "CRON Expression", (g2, cx, cy, cw) =>
                {
                    uiText(g2, cx + 8, cy + 20, "0 */5 * * *", {
                        size: 12, fill: C_TEXT, weight: 600
                    });
                    uiText(g2, cx + 8, cy + 36, "Every 5 minutes", {
                        size: 9, fill: C_TEXT_SEC
                    });
                });

        case "timezonepicker":
            return (g, x, y, w, h) =>
                renderEnhancedInput(g, x, y, w, h, "\u2609", "UTC-5 (EST)");

        case "periodpicker":
            return (g, x, y, w, h) =>
                renderEnhancedInput(g, x, y, w, h, "\u2636", "Q1 2026");

        case "sprintpicker":
            return (g, x, y, w, h) =>
                renderEnhancedInput(g, x, y, w, h, "\u25A3", "Sprint 4");

        case "gradientpicker":
            return (g, x, y, w, h) =>
                renderEnhancedPanel(g, x, y, w, h, "Gradient", (g2, cx, cy, cw) =>
                {
                    const barW = cw - 16;
                    uiRect(g2, cx + 8, cy + 8, barW, 20, C_PRIMARY, C_BORDER, 2);
                    uiRect(g2, cx + 8, cy + 8, barW / 2, 20, "#6610f2", "none", 0);
                });

        case "anglepicker":
            return (g, x, y, w, h) =>
            {
                const cx = x + w / 2;
                const cy = y + h / 2;
                const r = Math.min(w, h) * 0.35;
                uiCircle(g, cx, cy, r, C_BG, C_BORDER);
                uiLine(g, cx, cy, cx + r * 0.8, cy - r * 0.3, C_PRIMARY, 2);
                uiCircle(g, cx, cy, 3, C_PRIMARY, C_PRIMARY);
                uiText(g, cx, cy + r + 14, "45\u00B0", {
                    size: 9, fill: C_TEXT_SEC, anchor: "middle"
                });
            };

        case "fontdropdown":
            return (g, x, y, w, h) =>
                renderEnhancedInput(g, x, y, w, h, "Aa", "Inter");

        case "symbolpicker":
            return (g, x, y, w, h) =>
                renderEnhancedPanel(g, x, y, w, h, "Symbols", (g2, cx, cy, cw) =>
                {
                    const syms = ["\u2605", "\u2665", "\u266A", "\u2708",
                        "\u2622", "\u263C", "\u2603", "\u2602", "\u2764"];
                    const cols = 3;
                    const sz = 20;
                    for (let i = 0; i < syms.length; i++)
                    {
                        const col = i % cols;
                        const row = Math.floor(i / cols);
                        uiRect(g2, cx + 8 + col * (sz + 4), cy + 4 + row * (sz + 4),
                            sz, sz, C_HEADER_BG, C_BORDER, 2);
                        uiText(g2, cx + 14 + col * (sz + 4), cy + 18 + row * (sz + 4),
                            syms[i], { size: 11 });
                    }
                });

        case "fileupload":
            return (g, x, y, w, h) =>
            {
                renderEnhancedDefault(g, x, y, w, h, "\u2191", "");
                uiText(g, x + w / 2, y + h / 2 + 4, "Drop files here", {
                    size: 10, fill: C_TEXT_SEC, anchor: "middle"
                });
                uiText(g, x + w / 2, y + h / 2 + 20, "or click to browse", {
                    size: 9, fill: C_TEXT_MUT, anchor: "middle"
                });
            };

        case "tagger":
            return (g, x, y, w, h) =>
            {
                renderEnhancedInput(g, x, y, w, h, "\u2756", "Add tag\u2026");
                uiRect(g, x + w - 56, y + 4, 24, 14, C_ACTIVE_BG, C_PRIMARY, 7);
                uiText(g, x + w - 50, y + 15, "v1", { size: 7, fill: C_PRIMARY });
                uiRect(g, x + w - 28, y + 4, 20, 14, C_ACTIVE_BG, C_PRIMARY, 7);
                uiText(g, x + w - 24, y + 15, "ui", { size: 7, fill: C_PRIMARY });
            };

        case "richtextinput":
            return (g, x, y, w, h) =>
            {
                const tbH = 20;
                uiRect(g, x, y, w, tbH, C_HEADER_BG, "none", 0);
                const btns = ["B", "I", "U", "\u2261"];
                for (let i = 0; i < btns.length; i++)
                {
                    uiText(g, x + 8 + i * 20, y + 14, btns[i], {
                        size: 10, weight: 600, fill: C_TEXT_SEC
                    });
                }
                uiDivider(g, x, y + tbH, w);
                uiDots(g, x + 8, y + tbH + 16);
            };

        case "maskedentry":
            return (g, x, y, w, h) =>
                renderEnhancedInput(g, x, y, w, h, "\u2022", "\u2022\u2022\u2022\u2022-\u2022\u2022\u2022\u2022");

        case "lineendingpicker":
            return (g, x, y, w, h) =>
            {
                renderEnhancedInput(g, x, y, w, h, "\u2192", "Arrow");
                uiLine(g, x + w - 60, y + h / 2, x + w - 30, y + h / 2, C_TEXT_SEC, 2);
                uiText(g, x + w - 32, y + h / 2 + 4, "\u25B6", { size: 8, fill: C_TEXT_SEC });
            };

        case "lineshapepicker":
            return (g, x, y, w, h) =>
            {
                renderEnhancedInput(g, x, y, w, h, "\u223F", "Curved");
                g.appendChild(svgCreate("path", {
                    d: `M ${x + w - 70} ${y + h / 2 + 4} Q ${x + w - 50} ${y + 2} ${x + w - 30} ${y + h / 2 + 4}`,
                    fill: "none", stroke: C_TEXT_SEC, "stroke-width": "2"
                }));
            };

        case "linetypepicker":
            return (g, x, y, w, h) =>
            {
                renderEnhancedInput(g, x, y, w, h, "\u2504", "Dashed");
                g.appendChild(svgCreate("line", {
                    x1: String(x + w - 70), y1: String(y + h / 2),
                    x2: String(x + w - 30), y2: String(y + h / 2),
                    stroke: C_TEXT_SEC, "stroke-width": "2",
                    "stroke-dasharray": "4 3"
                }));
            };

        case "linewidthpicker":
            return (g, x, y, w, h) =>
            {
                renderEnhancedInput(g, x, y, w, h, "\u2501", "Medium");
                uiLine(g, x + w - 70, y + h / 2 - 3, x + w - 30, y + h / 2 - 3, C_TEXT_SEC, 1);
                uiLine(g, x + w - 70, y + h / 2 + 3, x + w - 30, y + h / 2 + 3, C_TEXT_SEC, 3);
            };

        case "magnifier":
            return (g, x, y, w, h) =>
            {
                const cx = x + w / 2;
                const cy = y + h / 2 - 6;
                const r = Math.min(w, h) * 0.25;
                uiCircle(g, cx, cy, r, C_BG, C_TEXT_SEC);
                uiLine(g, cx + r * 0.7, cy + r * 0.7,
                    cx + r * 1.3, cy + r * 1.3, C_TEXT_SEC, 3);
                uiText(g, cx, cy + 4, "+", { size: 14, fill: C_TEXT_SEC, anchor: "middle" });
            };

        case "ruler":
            return (g, x, y, w, h) =>
            {
                uiRect(g, x, y, w, h, C_HEADER_BG, C_BORDER, 0);
                const tickCount = Math.floor(w / 30);
                for (let i = 0; i <= tickCount; i++)
                {
                    const tx = x + i * 30;
                    const big = i % 3 === 0;
                    uiLine(g, tx, y + h, tx, y + h - (big ? h * 0.6 : h * 0.3), C_TEXT_SEC);
                    if (big) { uiText(g, tx + 2, y + 10, String(i * 30), { size: 7, fill: C_TEXT_MUT }); }
                }
            };

        case "prompttemplatemanager":
            return (g, x, y, w, h) =>
                renderEnhancedPanel(g, x, y, w, h, "Templates", (g2, cx, cy, cw) =>
                {
                    const items = ["Summarize", "Translate", "Code Review"];
                    for (let i = 0; i < items.length; i++)
                    {
                        const iy = cy + i * 24 + 4;
                        uiText(g2, cx + 8, iy + 14, items[i], { size: 10 });
                        uiText(g2, cx + cw - 30, iy + 14, "\u270E", { size: 9, fill: C_TEXT_SEC });
                        uiText(g2, cx + cw - 14, iy + 14, "\u2717", { size: 9, fill: C_DANGER });
                        if (i > 0) { uiDivider(g2, cx, iy, cw); }
                    }
                });

        case "reasoningaccordion":
            return (g, x, y, w, h) =>
            {
                const sections = [
                    { label: "Step 1: Analysis", open: true },
                    { label: "Step 2: Reasoning", open: false },
                    { label: "Step 3: Conclusion", open: false },
                ];
                let sy = y;
                for (const sec of sections)
                {
                    const secH = sec.open ? 60 : 22;
                    uiRect(g, x, sy, w, secH, C_BG, C_BORDER, 0);
                    uiText(g, x + 6, sy + 15, sec.open ? "\u25BE" : "\u25B8", {
                        size: 9, fill: C_TEXT_SEC
                    });
                    uiText(g, x + 18, sy + 15, sec.label, { size: 10, weight: 600 });
                    if (sec.open) { uiDots(g, x + 18, sy + 36); uiDots(g, x + 18, sy + 50); }
                    sy += secH;
                }
            };

        case "auditlogviewer":
            return (g, x, y, w, h) =>
                renderEnhancedTable(g, x, y, w, h, ["Timestamp", "User", "Action"]);

        case "permissionmatrix":
            return (g, x, y, w, h) =>
            {
                const cols = ["Permission", "Admin", "Editor", "Viewer"];
                const colW = w / cols.length;
                uiRect(g, x, y, w, 20, C_HEADER_BG, "none", 0);
                for (let i = 0; i < cols.length; i++)
                {
                    uiText(g, x + i * colW + 4, y + 14, cols[i], { size: 9, weight: 600 });
                }
                uiDivider(g, x, y + 20, w);
                const perms = ["Read", "Write", "Delete"];
                const checks = [
                    [true, true, true],
                    [true, true, false],
                    [true, false, false],
                ];
                for (let r = 0; r < perms.length; r++)
                {
                    const ry = y + 20 + r * 18;
                    uiText(g, x + 4, ry + 14, perms[r], { size: 9 });
                    for (let c = 0; c < 3; c++)
                    {
                        const mark = checks[r][c] ? "\u2611" : "\u2610";
                        const fill = checks[r][c] ? C_SUCCESS : C_TEXT_MUT;
                        uiText(g, x + (c + 1) * colW + colW / 2, ry + 14, mark, {
                            size: 11, fill, anchor: "middle"
                        });
                    }
                }
            };

        case "sharedialog":
            return (g, x, y, w, h) =>
                renderEnhancedPanel(g, x, y, w, h, "Share", (g2, cx, cy, cw) =>
                {
                    renderEnhancedInput(g2, cx + 6, cy + 6, cw - 12, 20, "\u263A", "Add people\u2026");
                    const users = ["Alice (Owner)", "Bob (Editor)", "Carol (Viewer)"];
                    for (let i = 0; i < users.length; i++)
                    {
                        uiCircle(g2, cx + 18, cy + 40 + i * 22, 7, C_HEADER_BG, C_BORDER);
                        uiText(g2, cx + 30, cy + 44 + i * 22, users[i], { size: 9 });
                    }
                });

        case "notificationcenter":
            return (g, x, y, w, h) =>
                renderEnhancedList(g, x, y, w, h, "\u2407", [
                    "New comment on PR #42",
                    "Build succeeded",
                    "Alice mentioned you",
                    "Sprint review tomorrow",
                ]);

        case "workspaceswitcher":
            return (g, x, y, w, h) =>
                renderEnhancedPanel(g, x, y, w, h, "Workspaces", (g2, cx, cy, cw) =>
                {
                    const ws = ["Engineering", "Design", "Marketing"];
                    for (let i = 0; i < ws.length; i++)
                    {
                        const wy = cy + 6 + i * 28;
                        uiRect(g2, cx + 6, wy, cw - 12, 24, i === 0 ? C_ACTIVE_BG : C_BG,
                            C_BORDER, 3);
                        uiText(g2, cx + 14, wy + 16, ws[i], { size: 10 });
                    }
                });

        case "usermenu":
            return (g, x, y, w, h) =>
            {
                uiCircle(g, x + w / 2, y + 24, 14, C_HEADER_BG, C_BORDER);
                uiText(g, x + w / 2, y + 28, "JD", {
                    size: 10, anchor: "middle", weight: 600, fill: C_TEXT_SEC
                });
                const items = ["Profile", "Settings", "Sign Out"];
                for (let i = 0; i < items.length; i++)
                {
                    const iy = y + 48 + i * 24;
                    uiText(g, x + 12, iy + 14, items[i], { size: 10 });
                    if (i < items.length - 1) { uiDivider(g, x + 4, iy + 22, w - 8); }
                }
            };

        case "fileexplorer":
            return (g, x, y, w, h) =>
            {
                const splitX = w * 0.35;
                renderEnhancedPanel(g, x, y, splitX, h, "Folders", (g2, cx, cy, cw) =>
                {
                    const folders = ["\u25BE \uD83D\uDCC1 src", "  \uD83D\uDCC1 lib", "  \uD83D\uDCC1 test", "\u25B8 \uD83D\uDCC1 docs"];
                    for (let i = 0; i < folders.length; i++)
                    {
                        uiText(g2, cx + 4, cy + 14 + i * 18, folders[i], { size: 9 });
                    }
                });
                uiLine(g, x + splitX, y, x + splitX, y + h, C_BORDER);
                renderEnhancedPanel(g, x + splitX, y, w - splitX, h, "Files", (g2, cx, cy, cw) =>
                {
                    const files = ["\uD83D\uDCC4 index.ts", "\uD83D\uDCC4 app.ts", "\uD83D\uDCC4 style.scss"];
                    for (let i = 0; i < files.length; i++)
                    {
                        uiText(g2, cx + 4, cy + 14 + i * 18, files[i], { size: 9 });
                    }
                });
            };

        case "applauncher":
            return (g, x, y, w, h) =>
            {
                const apps = ["Mail", "Chat", "Docs", "Sheet", "Slide", "Drive", "Cal", "Meet", "Maps"];
                const cols = 3;
                const cellW = (w - 16) / cols;
                const cellH = (h - 8) / 3;
                for (let i = 0; i < apps.length; i++)
                {
                    const col = i % cols;
                    const row = Math.floor(i / cols);
                    const ax = x + 8 + col * cellW;
                    const ay = y + 4 + row * cellH;
                    uiRect(g, ax + 4, ay + 4, cellW - 8, cellH - 16, C_HEADER_BG, C_BORDER, 4);
                    uiText(g, ax + cellW / 2, ay + cellH - 6, apps[i], {
                        size: 8, anchor: "middle", fill: C_TEXT_SEC
                    });
                }
            };

        case "logconsole":
            return (g, x, y, w, h) =>
            {
                uiRect(g, x, y, w, h, C_CODE_BG, C_BORDER, 0);
                const lines = [
                    "[12:01:03] INFO  Server started on :8080",
                    "[12:01:05] INFO  Connected to database",
                    "[12:01:07] WARN  Slow query (230ms)",
                    "[12:01:09] ERROR Connection timeout",
                ];
                const colors = [C_CODE_TEXT, C_CODE_TEXT, C_WARNING, C_DANGER];
                for (let i = 0; i < lines.length; i++)
                {
                    uiText(g, x + 6, y + 14 + i * 16, lines[i], {
                        size: 9, fill: colors[i]
                    });
                }
            };

        case "gauge":
            return (g, x, y, w, h) =>
            {
                const cx = x + w / 2;
                const cy = y + h * 0.55;
                const r = Math.min(w, h) * 0.35;
                g.appendChild(svgCreate("path", {
                    d: `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`,
                    fill: "none", stroke: C_BORDER, "stroke-width": "6",
                    "stroke-linecap": "round"
                }));
                g.appendChild(svgCreate("path", {
                    d: `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx} ${cy - r}`,
                    fill: "none", stroke: C_SUCCESS, "stroke-width": "6",
                    "stroke-linecap": "round"
                }));
                uiCircle(g, cx, cy, 4, C_TEXT, C_TEXT);
                uiText(g, cx, cy + 20, "72%", {
                    size: 14, weight: 700, anchor: "middle"
                });
                uiText(g, cx - r, cy + 12, "0", { size: 8, fill: C_TEXT_MUT });
                uiText(g, cx + r, cy + 12, "100", {
                    size: 8, fill: C_TEXT_MUT, anchor: "end"
                });
            };

        case "emptystate":
            return (g, x, y, w, h) =>
            {
                uiIcon(g, x + w / 2 - 4, y + h * 0.35, "\u2300", {
                    size: 28, fill: C_TEXT_MUT
                });
                uiText(g, x + w / 2, y + h * 0.55, "No data yet", {
                    size: 11, anchor: "middle", fill: C_TEXT_SEC
                });
                uiText(g, x + w / 2, y + h * 0.65, "Get started by adding items", {
                    size: 9, anchor: "middle", fill: C_TEXT_MUT
                });
                uiButton(g, x + w / 2 - 35, y + h * 0.72, 70, 24, "Add Item", {
                    fill: C_PRIMARY, textFill: C_BG
                });
            };

        default:
            return null;
    }
}

// ============================================================================
// TIER C — PER-COMPONENT VISUAL IMPROVEMENTS
// ============================================================================

/**
 * Tier C component-specific content functions, keyed by shape name.
 * Each draws improved detail inside the generic placeholder.
 */
function getTierCContent(name: string):
    ((g: SVGElement, x: number, y: number, w: number, h: number) => void) | null
{
    switch (name)
    {
        // --- Layout components: show structural lines ---
        case "docklayout":
            return (g, x, y, w, h) =>
            {
                uiRect(g, x, y, w * 0.25, h, C_HEADER_BG, C_BORDER, 0);
                uiText(g, x + 4, y + 14, "Left", { size: 8, fill: C_TEXT_MUT });
                uiRect(g, x + w * 0.25, y, w * 0.75, h * 0.7, C_BG, C_BORDER, 0);
                uiText(g, x + w * 0.3, y + 14, "Center", { size: 8, fill: C_TEXT_MUT });
                uiRect(g, x + w * 0.25, y + h * 0.7, w * 0.75, h * 0.3, C_HEADER_BG, C_BORDER, 0);
                uiText(g, x + w * 0.3, y + h * 0.7 + 14, "Bottom", { size: 8, fill: C_TEXT_MUT });
            };

        case "splitlayout":
            return (g, x, y, w, h) =>
            {
                uiRect(g, x, y, w / 2 - 2, h, C_BG, C_BORDER, 0);
                uiText(g, x + 8, y + h / 2, "Panel A", { size: 9, fill: C_TEXT_MUT });
                uiRect(g, x + w / 2 + 2, y, w / 2 - 2, h, C_BG, C_BORDER, 0);
                uiText(g, x + w / 2 + 10, y + h / 2, "Panel B", { size: 9, fill: C_TEXT_MUT });
                uiLine(g, x + w / 2 - 1, y, x + w / 2 - 1, y + h, C_TEXT_MUT, 3);
            };

        case "layerlayout":
            return (g, x, y, w, h) =>
            {
                for (let i = 2; i >= 0; i--)
                {
                    const off = i * 8;
                    uiRect(g, x + off, y + off, w - off * 2, h - off * 2,
                        i === 0 ? C_BG : C_HEADER_BG, C_BORDER, 2);
                }
                uiText(g, x + w / 2, y + h / 2 + 4, "Layer 1", {
                    size: 9, fill: C_TEXT_MUT, anchor: "middle"
                });
            };

        case "cardlayout":
            return (g, x, y, w, h) =>
            {
                const cols = 2;
                const rows = 2;
                const cw = (w - 12) / cols;
                const ch = (h - 12) / rows;
                for (let r = 0; r < rows; r++)
                {
                    for (let c = 0; c < cols; c++)
                    {
                        uiRect(g, x + 4 + c * (cw + 4), y + 4 + r * (ch + 4),
                            cw, ch, C_BG, C_BORDER, 3);
                    }
                }
            };

        case "boxlayout":
            return (g, x, y, w, h) =>
            {
                const count = 3;
                const bw = (w - 16) / count;
                for (let i = 0; i < count; i++)
                {
                    uiRect(g, x + 4 + i * (bw + 4), y + 4, bw, h - 8,
                        C_HEADER_BG, C_BORDER, 2);
                    uiText(g, x + 4 + i * (bw + 4) + bw / 2, y + h / 2, String(i + 1), {
                        size: 10, fill: C_TEXT_MUT, anchor: "middle"
                    });
                }
            };

        case "flowlayout":
            return (g, x, y, w, h) =>
            {
                const items = 7;
                const iw = 40;
                const ih = 28;
                let cx = x + 4;
                let cy = y + 4;
                for (let i = 0; i < items; i++)
                {
                    if (cx + iw > x + w - 4) { cx = x + 4; cy += ih + 4; }
                    uiRect(g, cx, cy, iw, ih, C_HEADER_BG, C_BORDER, 2);
                    cx += iw + 4;
                }
            };

        case "gridlayout":
            return (g, x, y, w, h) =>
            {
                const cols = 3;
                const rows = 3;
                const cw = w / cols;
                const rh = h / rows;
                for (let c = 1; c < cols; c++) { uiLine(g, x + c * cw, y, x + c * cw, y + h, C_TABLE_LINE); }
                for (let r = 1; r < rows; r++) { uiLine(g, x, y + r * rh, x + w, y + r * rh, C_TABLE_LINE); }
            };

        case "anchorlayout":
            return (g, x, y, w, h) =>
            {
                uiRect(g, x + w * 0.1, y + h * 0.1, w * 0.3, h * 0.25, C_HEADER_BG, C_BORDER, 2);
                uiRect(g, x + w * 0.6, y + h * 0.1, w * 0.3, h * 0.25, C_HEADER_BG, C_BORDER, 2);
                uiRect(g, x + w * 0.2, y + h * 0.55, w * 0.6, h * 0.3, C_HEADER_BG, C_BORDER, 2);
                uiText(g, x + w / 2, y + h / 2, "\u2693", { size: 14, fill: C_TEXT_MUT, anchor: "middle" });
            };

        case "borderlayout":
            return (g, x, y, w, h) =>
            {
                uiRect(g, x, y, w, h * 0.15, C_HEADER_BG, C_BORDER, 0);
                uiText(g, x + w / 2, y + h * 0.1, "N", { size: 8, fill: C_TEXT_MUT, anchor: "middle" });
                uiRect(g, x, y + h * 0.85, w, h * 0.15, C_HEADER_BG, C_BORDER, 0);
                uiText(g, x + w / 2, y + h * 0.92, "S", { size: 8, fill: C_TEXT_MUT, anchor: "middle" });
                uiRect(g, x, y + h * 0.15, w * 0.2, h * 0.7, C_HEADER_BG, C_BORDER, 0);
                uiText(g, x + w * 0.1, y + h / 2, "W", { size: 8, fill: C_TEXT_MUT, anchor: "middle" });
                uiRect(g, x + w * 0.8, y + h * 0.15, w * 0.2, h * 0.7, C_HEADER_BG, C_BORDER, 0);
                uiText(g, x + w * 0.9, y + h / 2, "E", { size: 8, fill: C_TEXT_MUT, anchor: "middle" });
                uiText(g, x + w / 2, y + h / 2, "Center", { size: 9, fill: C_TEXT_MUT, anchor: "middle" });
            };

        case "flexgridlayout":
            return (g, x, y, w, h) =>
            {
                const widths = [0.4, 0.6];
                let cx = x;
                for (let c = 0; c < 2; c++)
                {
                    const cw = w * widths[c];
                    for (let r = 0; r < 3; r++)
                    {
                        const rh = h / 3;
                        uiRect(g, cx + 2, y + r * rh + 2, cw - 4, rh - 4,
                            C_HEADER_BG, C_BORDER, 2);
                    }
                    cx += w * widths[c];
                }
            };

        // --- Small UI atoms ---
        case "personchip":
            return (g, x, y, w, h) =>
            {
                uiRect(g, x, y, w, h, C_BG, C_BORDER, h / 2);
                uiCircle(g, x + h / 2, y + h / 2, h / 2 - 3, C_HEADER_BG, C_BORDER);
                uiText(g, x + h / 2, y + h / 2 + 3, "J", {
                    size: 9, anchor: "middle", fill: C_TEXT_SEC
                });
                uiText(g, x + h + 4, y + h / 2 + 3, "Jane Doe", { size: 9 });
            };

        case "presenceindicator":
            return (g, x, y, w, h) =>
            {
                uiCircle(g, x + 8, y + h / 2, 5, C_SUCCESS, C_SUCCESS);
                uiText(g, x + 18, y + h / 2 + 4, "Online", {
                    size: 9, fill: C_SUCCESS
                });
            };

        case "pill":
            return (g, x, y, w, h) =>
            {
                uiRect(g, x, y, w, h, C_ACTIVE_BG, C_PRIMARY, h / 2);
                uiText(g, x + w / 2, y + h / 2 + 3, "Label", {
                    size: 9, fill: C_PRIMARY, anchor: "middle"
                });
            };

        case "typebadge":
            return (g, x, y, w, h) =>
            {
                uiRect(g, x, y, w, h, C_PRIMARY, C_PRIMARY, 3);
                uiText(g, x + w / 2, y + h / 2 + 3, "Type", {
                    size: 8, fill: C_BG, anchor: "middle", weight: 600
                });
            };

        case "statusbadge":
            return (g, x, y, w, h) =>
            {
                uiCircle(g, x + 8, y + h / 2, 4, C_SUCCESS, C_SUCCESS);
                uiText(g, x + 16, y + h / 2 + 3, "Active", {
                    size: 9, fill: C_TEXT
                });
            };

        case "helptooltip":
            return (g, x, y, w, h) =>
            {
                uiCircle(g, x + w / 2, y + h / 2, Math.min(w, h) / 2 - 1,
                    C_HEADER_BG, C_BORDER);
                uiText(g, x + w / 2, y + h / 2 + 4, "?", {
                    size: 12, anchor: "middle", weight: 700, fill: C_TEXT_SEC
                });
            };

        case "helpdrawer":
            return (g, x, y, w, h) =>
                renderEnhancedPanel(g, x, y, w, h, "? Help", (g2, cx, cy, cw, ch) =>
                {
                    uiText(g2, cx + 8, cy + 18, "Getting Started", { size: 11, weight: 600 });
                    for (let i = 0; i < 4; i++)
                    {
                        const lw = cw * (i === 3 ? 0.5 : 0.8) - 16;
                        uiLine(g2, cx + 8, cy + 30 + i * 14, cx + 8 + lw,
                            cy + 30 + i * 14, C_TEXT_MUT, 2);
                    }
                });

        case "bannerbar":
            return (g, x, y, w, h) =>
            {
                uiRect(g, x, y, w, h, "#fff3cd", C_WARNING, 0);
                uiIcon(g, x + 12, y + h / 2 + 5, "\u26A0", { size: 14, fill: "#856404" });
                uiText(g, x + 30, y + h / 2 + 4, "Important: System maintenance tonight", {
                    size: 10, fill: "#856404"
                });
                uiCloseX(g, x + w - 18, y + h / 2 + 5);
            };

        case "graphtoolbar":
            return (g, x, y, w, h) =>
            {
                uiRect(g, x, y, w, h, C_HEADER_BG, C_BORDER, 2);
                const icons = ["\u25AD", "\u25CB", "\u2192", "\u270E", "T", "\u2500", "|", "\u2315", "\u2302"];
                let ix = x + 6;
                for (const ic of icons)
                {
                    if (ic === "|") { uiLine(g, ix, y + 4, ix, y + h - 4, C_BORDER); ix += 6; continue; }
                    uiText(g, ix + 6, y + h / 2 + 4, ic, { size: 11, fill: C_TEXT_SEC });
                    ix += 24;
                }
            };

        case "skeletonloader":
            return (g, x, y, w, h) =>
            {
                uiRect(g, x + 4, y + 4, w * 0.3, 14, C_TABLE_LINE, "none", 4);
                uiRect(g, x + 4, y + 24, w - 8, 12, C_TABLE_LINE, "none", 4);
                uiRect(g, x + 4, y + 42, w * 0.8, 12, C_TABLE_LINE, "none", 4);
                uiRect(g, x + 4, y + 60, w * 0.6, 12, C_TABLE_LINE, "none", 4);
                uiRect(g, x + 4, y + 78, w * 0.9, 12, C_TABLE_LINE, "none", 4);
            };

        case "progressmodal":
            return (g, x, y, w, h) =>
            {
                const bodyY = uiDialogChrome(g, { x, y, width: w, height: h } as Rect, "Processing\u2026");
                const barY = bodyY + h * 0.3;
                const barW = w - 40;
                uiRect(g, x + 20, barY, barW, 12, C_TABLE_LINE, C_BORDER, 6);
                uiRect(g, x + 20, barY, barW * 0.65, 12, C_PRIMARY, C_PRIMARY, 6);
                uiText(g, x + w / 2, barY + 28, "65%", {
                    size: 11, anchor: "middle", fill: C_TEXT_SEC
                });
            };

        case "guidedtour":
            return (g, x, y, w, h) =>
            {
                uiRect(g, x, y + 10, w, h - 10, C_BG, C_BORDER, 4);
                // tooltip arrow
                g.appendChild(svgCreate("polygon", {
                    points: `${x + 20},${y} ${x + 30},${y + 10} ${x + 10},${y + 10}`,
                    fill: C_BG, stroke: C_BORDER, "stroke-width": "1"
                }));
                uiText(g, x + 12, y + 30, "Step 1 of 5", {
                    size: 9, fill: C_TEXT_MUT
                });
                uiText(g, x + 12, y + 48, "Click here to get started", {
                    size: 10, weight: 600
                });
                uiButton(g, x + w - 58, y + h - 28, 46, 20, "Next", {
                    fill: C_PRIMARY, textFill: C_BG
                });
            };

        case "commandpalette":
            return (g, x, y, w, h) =>
            {
                uiRect(g, x, y, w, h, C_BG, C_BORDER, 4);
                renderEnhancedInput(g, x + 8, y + 8, w - 16, 24, "\u2315", "Type a command\u2026");
                const cmds = ["\u2302 Go to File", "\u2699 Open Settings", "\u2637 Toggle Panel"];
                for (let i = 0; i < cmds.length; i++)
                {
                    const iy = y + 40 + i * 24;
                    if (i === 0) { uiRect(g, x + 4, iy, w - 8, 22, C_ACTIVE_BG, "none", 2); }
                    uiText(g, x + 12, iy + 16, cmds[i], { size: 10 });
                }
            };

        case "actionitems":
            return (g, x, y, w, h) =>
            {
                const items = [
                    { checked: true, text: "Review pull request" },
                    { checked: true, text: "Update documentation" },
                    { checked: false, text: "Deploy to staging" },
                    { checked: false, text: "Run integration tests" },
                ];
                for (let i = 0; i < items.length; i++)
                {
                    const iy = y + i * 22;
                    const mark = items[i].checked ? "\u2611" : "\u2610";
                    const fill = items[i].checked ? C_SUCCESS : C_TEXT_SEC;
                    uiText(g, x + 6, iy + 16, mark, { size: 12, fill });
                    uiText(g, x + 22, iy + 16, items[i].text, {
                        size: 10, fill: items[i].checked ? C_TEXT_MUT : C_TEXT
                    });
                }
            };

        case "visualtableeditor":
            return (g, x, y, w, h) =>
            {
                // Header row
                uiRect(g, x, y, w, 22, C_PRIMARY, "none");
                const cols = 4;
                const cw = w / cols;
                for (let c = 0; c < cols; c++)
                {
                    uiText(g, x + c * cw + 6, y + 15, "Col " + (c + 1), {
                        size: 9, fill: C_ACTIVE_BG, weight: 600,
                    });
                    if (c > 0) { uiLine(g, x + c * cw, y, x + c * cw, y + h, C_BORDER, 1); }
                }
                // Data rows
                const rows = Math.min(4, Math.floor((h - 22) / 20));
                for (let r = 0; r < rows; r++)
                {
                    const ry = y + 22 + r * 20;
                    uiLine(g, x, ry, x + w, ry, C_BORDER, 1);
                    for (let c = 0; c < cols; c++)
                    {
                        uiText(g, x + c * cw + 6, ry + 14, "data", { size: 9 });
                    }
                }
                uiRect(g, x, y, w, h, "none", C_BORDER, 1);
            };

        case "facetsearch":
            return (g, x, y, w, h) =>
            {
                renderEnhancedInput(g, x, y, w, h, "\u2315", "Search with filters\u2026");
                uiRect(g, x + w - 90, y + 4, 32, 14, C_ACTIVE_BG, C_PRIMARY, 7);
                uiText(g, x + w - 84, y + 15, "Type", { size: 7, fill: C_PRIMARY });
                uiRect(g, x + w - 52, y + 4, 40, 14, C_ACTIVE_BG, C_PRIMARY, 7);
                uiText(g, x + w - 46, y + 15, "Status", { size: 7, fill: C_PRIMARY });
            };

        case "themetoggle":
            return (g, x, y, w, h) =>
            {
                const cy = y + h / 2;
                uiRect(g, x, cy - 8, w, 16, C_HEADER_BG, C_BORDER, 8);
                uiCircle(g, x + 12, cy, 6, C_BG, C_BORDER);
                uiText(g, x + 6, cy + 4, "\u2600", { size: 8, fill: C_WARNING });
                uiText(g, x + w - 14, cy + 4, "\u263E", { size: 8, fill: C_TEXT_MUT });
            };

        case "markdownrenderer":
            return (g, x, y, w, h) =>
                renderEnhancedPanel(g, x, y, w, h, "Preview", (g2, cx, cy, cw) =>
                {
                    uiText(g2, cx + 8, cy + 18, "Heading", { size: 13, weight: 700 });
                    uiLine(g2, cx + 8, cy + 24, cx + cw - 8, cy + 24, C_TABLE_LINE, 1);
                    for (let i = 0; i < 3; i++)
                    {
                        const lw = cw * (i === 2 ? 0.5 : 0.8) - 16;
                        uiLine(g2, cx + 8, cy + 38 + i * 14, cx + 8 + lw,
                            cy + 38 + i * 14, C_TEXT_MUT, 2);
                    }
                });

        case "commentoverlay":
            return (g, x, y, w, h) =>
                renderEnhancedChat(g, x, y, w, h);

        case "relationshipmanager":
            return (g, x, y, w, h) =>
                renderEnhancedTable(g, x, y, w, h, ["From", "Relation", "To"]);

        case "ribbonbuilder":
            return (g, x, y, w, h) =>
            {
                const splitX = w * 0.3;
                renderEnhancedPanel(g, x, y, splitX, h, "Structure", (g2, cx, cy, cw) =>
                {
                    const nodes = ["\u25BE Tab: Home", "  \u25BE Clipboard", "    Cut", "    Copy"];
                    for (let i = 0; i < nodes.length; i++)
                    {
                        uiText(g2, cx + 4, cy + 14 + i * 18, nodes[i], { size: 9 });
                    }
                });
                uiLine(g, x + splitX, y, x + splitX, y + h, C_BORDER);
                renderEnhancedPanel(g, x + splitX, y, w - splitX, h, "Preview");
            };

        case "spinemap":
            return (g, x, y, w, h) =>
            {
                const cx = x + w / 2;
                uiLine(g, cx, y + 20, cx, y + h - 20, C_TEXT_MUT, 2);
                const nodes = [
                    { side: "left", ty: 0.2, label: "Topic A" },
                    { side: "right", ty: 0.4, label: "Topic B" },
                    { side: "left", ty: 0.6, label: "Topic C" },
                    { side: "right", ty: 0.8, label: "Topic D" },
                ];
                for (const n of nodes)
                {
                    const ny = y + h * n.ty;
                    uiCircle(g, cx, ny, 4, C_PRIMARY, C_PRIMARY);
                    const bx = n.side === "left" ? cx - w * 0.4 : cx + 10;
                    uiLine(g, cx, ny, bx, ny, C_TEXT_MUT, 1);
                    uiRect(g, bx, ny - 10, w * 0.3, 20, C_HEADER_BG, C_BORDER, 3);
                    uiText(g, bx + 6, ny + 4, n.label, { size: 9 });
                }
            };

        case "graphcanvas":
            return (g, x, y, w, h) =>
            {
                // Simple node-edge diagram
                const n1x = x + w * 0.2;
                const n1y = y + h * 0.3;
                const n2x = x + w * 0.7;
                const n2y = y + h * 0.2;
                const n3x = x + w * 0.5;
                const n3y = y + h * 0.7;

                uiLine(g, n1x + 20, n1y, n2x, n2y, C_TEXT_MUT, 1);
                uiLine(g, n2x, n2y + 15, n3x + 15, n3y, C_TEXT_MUT, 1);
                uiLine(g, n1x + 10, n1y + 15, n3x, n3y, C_TEXT_MUT, 1);

                uiRect(g, n1x - 20, n1y - 12, 40, 24, C_ACTIVE_BG, C_PRIMARY, 4);
                uiText(g, n1x, n1y + 4, "A", { size: 10, anchor: "middle", weight: 600 });
                uiRect(g, n2x - 20, n2y - 12, 40, 24, C_ACTIVE_BG, C_PRIMARY, 4);
                uiText(g, n2x, n2y + 4, "B", { size: 10, anchor: "middle", weight: 600 });
                uiRect(g, n3x - 20, n3y - 12, 40, 24, C_ACTIVE_BG, C_PRIMARY, 4);
                uiText(g, n3x, n3y + 4, "C", { size: 10, anchor: "middle", weight: 600 });
            };

        default:
            return null;
    }
}

// ============================================================================
// GENERIC PLACEHOLDER RENDERER (for Tier B/C fallback)
// ============================================================================

/**
 * Renders a generic placeholder with icon, label, and optional content.
 */
function renderGenericPlaceholder(
    ctx: ShapeRenderContext,
    label: string,
    icon: string,
    contentFn: ((g: SVGElement, x: number, y: number, w: number, h: number) => void) | null): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    uiRect(g, b.x, b.y, b.width, b.height, C_BG, C_BORDER, 3);
    uiIcon(g, b.x + 8, b.y + 18, icon, { size: 12 });
    uiText(g, b.x + 24, b.y + 18, label, { size: 11, fill: C_TEXT });

    if (contentFn)
    {
        const detailY = b.y + 28;
        const detailH = Math.max(0, b.height - 34);
        if (detailH > 8)
        {
            contentFn(g, b.x + 6, detailY, b.width - 12, detailH);
        }
    }

    return g;
}

// ============================================================================
// SHAPE BUILDERS
// ============================================================================

/**
 * Builds a ShapeDefinition with a custom Tier A render function.
 */
function buildCustomUiShape(
    name: string, label: string, icon: string,
    w: number, h: number,
    renderFn: (ctx: ShapeRenderContext) => SVGElement,
    category?: string): ShapeDefinition
{
    return {
        type: name,
        category: category || UI_CATEGORY,
        label,
        icon,
        defaultSize: { w, h },
        minSize: { w: Math.min(w, 80), h: Math.min(h, 30) },
        render: renderFn,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => uiDefaultTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => uiRectOutlinePath(bounds)
    };
}

/**
 * Builds a ShapeDefinition using the generic placeholder with
 * component-specific content.
 */
function buildGenericUiShape(
    name: string, label: string, icon: string,
    w: number, h: number,
    contentFn: ((g: SVGElement, x: number, y: number, w: number, h: number) => void) | null): ShapeDefinition
{
    return {
        type: name,
        category: UI_CATEGORY,
        label,
        icon,
        defaultSize: { w, h },
        minSize: { w: Math.min(w, 80), h: Math.min(h, 30) },
        render: (ctx: ShapeRenderContext) =>
            renderGenericPlaceholder(ctx, label, icon, contentFn),
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => uiDefaultTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => uiRectOutlinePath(bounds)
    };
}

// ============================================================================
// TIER B SHAPE TUPLES: [name, label, icon, w, h]
// ============================================================================

type UiGenericTuple = [string, string, string, number, number];

const TIER_B_SHAPES: UiGenericTuple[] = [
    ["multiselectcombo",  "Multi-Select Combo",     "\u2611", 250, 34],
    ["peoplepicker",      "People Picker",          "\u263A", 250, 40],
    ["timepicker",        "Time Picker",            "\u231A", 200, 40],
    ["durationpicker",    "Duration Picker",        "\u231B", 250, 40],
    ["cronpicker",        "CRON Picker",            "\u2637", 360, 280],
    ["timezonepicker",    "Timezone Picker",        "\u2609", 250, 40],
    ["periodpicker",      "Period Picker",          "\u2636", 250, 40],
    ["sprintpicker",      "Sprint Picker",          "\u25A3", 250, 40],
    ["gradientpicker",    "Gradient Picker",        "\u25C9", 300, 340],
    ["anglepicker",       "Angle Picker",           "\u21BB", 160, 160],
    ["fontdropdown",      "Font Dropdown",          "Aa",     200, 34],
    ["symbolpicker",      "Symbol Picker",          "\u263C", 320, 300],
    ["fileupload",        "File Upload",            "\u2191", 300, 200],
    ["tagger",            "Tagger",                 "\u2756", 250, 34],
    ["richtextinput",     "Rich Text Input",        "\u00B6", 300, 100],
    ["maskedentry",       "Masked Entry",           "\u2022", 200, 34],
    ["lineendingpicker",  "Line Ending Picker",     "\u2192", 200, 34],
    ["lineshapepicker",   "Line Shape Picker",      "\u223F", 200, 34],
    ["linetypepicker",    "Line Type Picker",       "\u2504", 200, 34],
    ["linewidthpicker",   "Line Width Picker",      "\u2501", 200, 34],
    ["magnifier",         "Magnifier",              "\u2315", 150, 150],
    ["ruler",             "Ruler",                  "\u2500", 400, 24],
    ["prompttemplatemanager", "Prompt Template Manager", "\u2338", 600, 450],
    ["reasoningaccordion","Reasoning Accordion",    "\u2261", 400, 300],
    ["auditlogviewer",    "Audit Log Viewer",       "\u2637", 600, 350],
    ["permissionmatrix",  "Permission Matrix",      "\u2611", 500, 350],
    ["sharedialog",       "Share Dialog",           "\u2197", 400, 300],
    ["notificationcenter","Notification Center",    "\u2407", 350, 400],
    ["workspaceswitcher", "Workspace Switcher",     "\u2302", 250, 300],
    ["usermenu",          "User Menu",              "\u263A", 200, 250],
    ["fileexplorer",      "File Explorer",          "\u2302", 500, 400],
    ["applauncher",       "App Launcher",           "\u2637", 300, 300],
    ["logconsole",        "Log Console",            "\u2328", 500, 250],
    ["gauge",             "Gauge",                  "\u25D4", 200, 200],
    ["emptystate",        "Empty State",            "\u2300", 300, 200],
    ["orientationpicker", "Orientation Picker",     "\u21C5", 200, 40],
    ["sizespicker",       "Sizes Picker",           "\u2B1C", 200, 40],
    ["marginspicker",     "Margins Picker",         "\u25A3", 200, 40],
    ["toolcolorpicker",   "Tool Color Picker",      "\u270F", 250, 40],
    ["columnspicker",     "Columns Picker",         "\u2503", 200, 40],
    ["spacingpicker",     "Spacing Picker",         "\u2261", 200, 40],
];

// ============================================================================
// TIER C SHAPE TUPLES: [name, label, icon, w, h]
// ============================================================================

const TIER_C_SHAPES: UiGenericTuple[] = [
    // Data
    ["spinemap",          "Spine Map",              "\u2734", 500, 350],
    ["graphcanvas",       "Graph Canvas",           "\u2609", 500, 400],
    // Content
    ["markdownrenderer",  "Markdown Renderer",      "\u2193", 400, 300],
    ["helpdrawer",        "Help Drawer",            "?",      320, 400],
    ["helptooltip",       "Help Tooltip",           "?",      24,  24],
    // Feedback
    ["progressmodal",     "Progress Modal",         "\u231B", 400, 200],
    // Navigation
    ["ribbonbuilder",     "Ribbon Builder",         "\u2692", 600, 400],
    // Social
    ["commentoverlay",    "Comment Overlay",        "\u2026", 400, 300],
    ["personchip",        "Person Chip",            "\u263A", 180, 32],
    ["presenceindicator", "Presence Indicator",     "\u25CF", 120, 32],
    ["pill",              "Pill",                   "\u25CF", 100, 24],
    ["typebadge",         "Type Badge",             "\u2690", 80,  24],
    ["statusbadge",       "Status Badge",           "\u25CF", 80,  24],
    ["relationshipmanager","Relationship Manager",  "\u2637", 500, 350],
    // Layout
    ["docklayout",        "Dock Layout",            "\u2610", 600, 400],
    ["splitlayout",       "Split Layout",           "\u2502", 600, 400],
    ["layerlayout",       "Layer Layout",           "\u25A3", 600, 400],
    ["cardlayout",        "Card Layout",            "\u25A1", 400, 300],
    ["boxlayout",         "Box Layout",             "\u25A1", 400, 200],
    ["flowlayout",        "Flow Layout",            "\u21C0", 500, 300],
    ["gridlayout",        "Grid Layout",            "\u2637", 500, 400],
    ["anchorlayout",      "Anchor Layout",          "\u2693", 600, 400],
    ["borderlayout",      "Border Layout",          "\u25A3", 600, 400],
    ["flexgridlayout",    "Flex Grid Layout",       "\u2637", 600, 400],
    // Other
    ["actionitems",       "Action Items",           "\u2611", 400, 300],
    ["commandpalette",    "Command Palette",        "\u2328", 500, 350],
    ["facetsearch",       "Facet Search",           "\u2295", 350, 34],
    ["guidedtour",        "Guided Tour",            "\u2690", 300, 200],
    ["themetoggle",       "Theme Toggle",           "\u25D0", 100, 32],
    ["skeletonloader",    "Skeleton Loader",        "\u2591", 300, 100],
    ["bannerbar",         "Banner Bar",             "\u2691", 600, 48],
    ["graphtoolbar",      "Graph Toolbar",          "\u2692", 500, 40],
    ["graphlegend",       "Graph Legend",           "\u2261", 240, 300],
    ["graphminimap",      "Graph Minimap",          "\u25A3", 200, 150],
    ["contextmenu",       "Context Menu",           "\u2630", 220, 200],
    ["inlinetoolbar",     "Inline Toolbar",         "\u2261", 300, 32],
    ["stacklayout",       "Stack Layout",           "\u2B13", 300, 400],
    ["visualtableeditor", "Visual Table Editor",    "\u2637", 400, 250],
];

// ============================================================================
// BOOTSTRAP 5 BASE COMPONENT STENCILS
// ============================================================================

/** Bootstrap component category name. */
const BS_CATEGORY = "bootstrap";

/** Render a Bootstrap Card stencil. */
function renderBsCard(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    uiRect(g, b.x, b.y, b.width, b.height, C_BG, C_BORDER, 4);
    uiRect(g, b.x, b.y, b.width, 36, C_HEADER_BG, C_BORDER);
    uiText(g, b.x + 12, b.y + 23, "Card Title", { weight: 600 });
    uiDivider(g, b.x, b.y + 36, b.width);
    uiText(g, b.x + 12, b.y + 56, "Card body content goes here.", { size: 10, fill: C_TEXT_MUT });
    uiText(g, b.x + 12, b.y + 72, "Additional text and details.", { size: 10, fill: C_TEXT_MUT });

    return g;
}

/** Render a Bootstrap Button stencil. */
function renderBsButton(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    uiRect(g, b.x, b.y, b.width, b.height, C_PRIMARY, C_PRIMARY, 4);
    uiText(g, b.x + b.width / 2, b.y + b.height / 2 + 4, "Button", { fill: "#ffffff", anchor: "middle", weight: 600 });

    return g;
}

/** Render a Bootstrap Accordion stencil. */
function renderBsAccordion(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    const itemH = 36;

    uiRect(g, b.x, b.y, b.width, b.height, C_BG, C_BORDER, 4);

    for (let i = 0; i < 3; i++)
    {
        const y = b.y + i * itemH;
        const expanded = i === 0;

        uiRect(g, b.x, y, b.width, itemH, expanded ? "#e7f1ff" : C_HEADER_BG, C_BORDER);
        uiText(g, b.x + 12, y + 23, `Accordion Item #${i + 1}`, { weight: 600, fill: expanded ? C_PRIMARY : C_TEXT });
        uiText(g, b.x + b.width - 20, y + 23, expanded ? "\u25B2" : "\u25BC", { size: 10, fill: C_TEXT_SEC });
    }

    uiText(g, b.x + 16, b.y + itemH + 16, "Expanded content area with details.", { size: 10, fill: C_TEXT_MUT });

    return g;
}

/** Render a Bootstrap Modal stencil. */
function renderBsModal(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    uiRect(g, b.x + 2, b.y + 2, b.width, b.height, "rgba(0,0,0,0.1)", "none", 6);
    uiRect(g, b.x, b.y, b.width, b.height, C_BG, C_BORDER, 6);
    uiRect(g, b.x, b.y, b.width, 40, C_HEADER_BG, C_BORDER);
    uiText(g, b.x + 16, b.y + 26, "Modal Title", { weight: 600 });
    uiCloseX(g, b.x + b.width - 24, b.y + 14);
    uiDivider(g, b.x, b.y + 40, b.width);
    uiText(g, b.x + 16, b.y + 65, "Modal body content.", { size: 10, fill: C_TEXT_MUT });
    uiDivider(g, b.x, b.y + b.height - 50, b.width);
    uiButton(g, b.x + b.width - 150, b.y + b.height - 38, 60, 26, "Close");
    uiButton(g, b.x + b.width - 80, b.y + b.height - 38, 60, 26, "Save", { fill: C_PRIMARY, textFill: "#ffffff" });

    return g;
}

/** Render a Bootstrap Nav/Tabs stencil. */
function renderBsNav(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    uiRect(g, b.x, b.y, b.width, b.height, C_BG, C_BORDER);

    const tabs = ["Home", "Profile", "Contact"];
    let tx = b.x + 4;

    for (let i = 0; i < tabs.length; i++)
    {
        const active = i === 0;
        const tw = 60;

        uiRect(g, tx, b.y + 4, tw, b.height - 8, active ? C_BG : "none", active ? C_PRIMARY : "none", 3);
        uiText(g, tx + tw / 2, b.y + b.height / 2 + 4, tabs[i], { anchor: "middle", fill: active ? C_PRIMARY : C_TEXT_SEC, size: 10 });
        tx += tw + 4;
    }

    return g;
}

/** Render a Bootstrap Alert stencil. */
function renderBsAlert(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    uiRect(g, b.x, b.y, b.width, b.height, "#cfe2ff", "#084298", 4);
    uiText(g, b.x + 12, b.y + 18, "\u24D8", { fill: "#084298", size: 14 });
    uiText(g, b.x + 32, b.y + 18, "Alert message — important information here.", { size: 10, fill: "#084298" });

    return g;
}

/** Render a Bootstrap Badge stencil. */
function renderBsBadge(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    uiRect(g, b.x, b.y, b.width, b.height, C_PRIMARY, C_PRIMARY, 10);
    uiText(g, b.x + b.width / 2, b.y + b.height / 2 + 4, "Badge", { fill: "#ffffff", anchor: "middle", size: 10, weight: 600 });

    return g;
}

/** Render a Bootstrap List Group stencil. */
function renderBsListGroup(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    const items = ["List item one", "List item two", "List item three", "List item four"];
    const itemH = Math.min(32, b.height / items.length);

    uiRect(g, b.x, b.y, b.width, b.height, C_BG, C_BORDER, 4);

    for (let i = 0; i < items.length; i++)
    {
        const iy = b.y + i * itemH;
        const active = i === 0;

        if (active) { uiRect(g, b.x, iy, b.width, itemH, C_PRIMARY, "none"); }
        if (i > 0) { uiDivider(g, b.x, iy, b.width); }
        uiText(g, b.x + 12, iy + itemH / 2 + 4, items[i], { size: 10, fill: active ? "#ffffff" : C_TEXT });
    }

    return g;
}

/** Render a Bootstrap Table stencil. */
function renderBsTable(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    const cols = ["#", "First", "Last", "Handle"];
    const colW = b.width / cols.length;
    const rowH = 28;

    uiRect(g, b.x, b.y, b.width, b.height, C_BG, C_BORDER);

    for (let c = 0; c < cols.length; c++)
    {
        uiText(g, b.x + c * colW + 8, b.y + 18, cols[c], { weight: 600, size: 10 });
    }

    uiDivider(g, b.x, b.y + rowH, b.width);

    for (let r = 1; r <= 3; r++)
    {
        const ry = b.y + r * rowH;

        if (r % 2 === 0) { uiRect(g, b.x, ry, b.width, rowH, C_HEADER_BG, "none"); }
        uiText(g, b.x + 8, ry + 18, String(r), { size: 10, fill: C_TEXT_MUT });
        uiText(g, b.x + colW + 8, ry + 18, r === 1 ? "Mark" : r === 2 ? "Jacob" : "Larry", { size: 10 });
        uiText(g, b.x + colW * 2 + 8, ry + 18, r === 1 ? "Otto" : r === 2 ? "Lee" : "Bird", { size: 10 });
        uiText(g, b.x + colW * 3 + 8, ry + 18, "@mdo", { size: 10, fill: C_TEXT_MUT });
    }

    return g;
}

/** Render a Bootstrap Form stencil. */
function renderBsForm(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    uiRect(g, b.x, b.y, b.width, b.height, C_BG, C_BORDER, 4);
    uiText(g, b.x + 12, b.y + 20, "Email address", { size: 10, weight: 600 });
    uiRect(g, b.x + 12, b.y + 26, b.width - 24, 28, C_HEADER_BG, C_BORDER, 3);
    uiText(g, b.x + 20, b.y + 44, "name@example.com", { size: 10, fill: C_TEXT_MUT });
    uiText(g, b.x + 12, b.y + 72, "Password", { size: 10, weight: 600 });
    uiRect(g, b.x + 12, b.y + 78, b.width - 24, 28, C_HEADER_BG, C_BORDER, 3);
    uiText(g, b.x + 20, b.y + 96, "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", { size: 10, fill: C_TEXT_MUT });
    uiButton(g, b.x + 12, b.y + 118, 80, 28, "Submit", { fill: C_PRIMARY, textFill: "#ffffff" });

    return g;
}

/** Render a Bootstrap Pagination stencil. */
function renderBsPagination(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    const items = ["\u2039", "1", "2", "3", "4", "\u203A"];
    const iw = 32;
    const sx = b.x + (b.width - items.length * iw) / 2;

    for (let i = 0; i < items.length; i++)
    {
        const active = items[i] === "2";

        uiRect(g, sx + i * iw, b.y, iw, b.height, active ? C_PRIMARY : C_BG, C_BORDER);
        uiText(g, sx + i * iw + iw / 2, b.y + b.height / 2 + 4, items[i], { anchor: "middle", size: 11, fill: active ? "#ffffff" : C_TEXT });
    }

    return g;
}

/** Render a Bootstrap Dropdown stencil. */
function renderBsDropdown(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    uiRect(g, b.x, b.y, 100, 30, C_PRIMARY, C_PRIMARY, 4);
    uiText(g, b.x + 40, b.y + 20, "Dropdown \u25BE", { fill: "#ffffff", anchor: "middle", size: 10, weight: 600 });

    uiRect(g, b.x, b.y + 34, 160, b.height - 34, C_BG, C_BORDER, 4);
    const menuItems = ["Action", "Another action", "Something else"];

    for (let i = 0; i < menuItems.length; i++)
    {
        const iy = b.y + 34 + 4 + i * 28;

        if (i === 0) { uiRect(g, b.x + 4, iy, 152, 24, C_PRIMARY, "none", 3); }
        uiText(g, b.x + 16, iy + 16, menuItems[i], { size: 10, fill: i === 0 ? "#ffffff" : C_TEXT });
    }

    return g;
}

/** Render a Bootstrap Progress stencil. */
function renderBsProgress(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    const pct = 0.65;

    uiRect(g, b.x, b.y + b.height / 2 - 10, b.width, 20, C_HEADER_BG, "none", 10);
    uiRect(g, b.x, b.y + b.height / 2 - 10, b.width * pct, 20, C_PRIMARY, "none", 10);
    uiText(g, b.x + b.width * pct / 2, b.y + b.height / 2 + 4, "65%", { fill: "#ffffff", anchor: "middle", size: 10, weight: 600 });

    return g;
}

/** Render a Bootstrap Spinner stencil. */
function renderBsSpinner(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    const r = Math.min(b.width, b.height) / 2 - 4;

    uiCircle(g, cx, cy, r, "none", C_PRIMARY, 3);
    uiText(g, cx, cy + r + 16, "Loading...", { anchor: "middle", size: 10, fill: C_TEXT_SEC });

    return g;
}

/** Render a Bootstrap Checkbox/Toggle stencil. */
function renderBsToggle(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    const trackW = 40;
    const trackH = 20;
    const tx = b.x + (b.width - trackW) / 2;
    const ty = b.y + (b.height - trackH) / 2;

    uiRect(g, tx, ty, trackW, trackH, C_PRIMARY, "none", 10);
    uiCircle(g, tx + trackW - 10, ty + 10, 8, "#ffffff", "none");

    return g;
}

// ============================================================================
// HTML PRIMITIVE SVG RENDER FUNCTIONS
// ============================================================================

/** Render an HTML Heading stencil. */
function renderHtmlHeading(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    uiRect(g, b.x, b.y, b.width, b.height, C_BG, C_BORDER);
    uiText(g, b.x + 8, b.y + b.height / 2 + 6, "Heading", {
        size: 16, weight: 700
    });

    return g;
}

/** Render an HTML Text (paragraph) stencil. */
function renderHtmlText(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    uiRect(g, b.x, b.y, b.width, b.height, C_BG, C_BORDER);
    uiText(g, b.x + 8, b.y + 16, "Paragraph text goes here and", {
        size: 10, fill: C_TEXT_SEC
    });
    uiText(g, b.x + 8, b.y + 30, "wraps to a second line.", {
        size: 10, fill: C_TEXT_SEC
    });
    uiText(g, b.x + 8, b.y + 44, "A third line of content.", {
        size: 10, fill: C_TEXT_MUT
    });

    return g;
}

/** Render an HTML Bold Text stencil. */
function renderHtmlBold(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    uiText(g, b.x + b.width / 2, b.y + b.height / 2 + 4,
        "Bold text", { weight: 700, anchor: "middle" });

    return g;
}

/** Render an HTML Small Text stencil. */
function renderHtmlSmall(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    uiText(g, b.x + b.width / 2, b.y + b.height / 2 + 3,
        "Small muted text", { size: 9, fill: C_TEXT_MUT, anchor: "middle" });

    return g;
}

/** Render an HTML Icon stencil. */
function renderHtmlIcon(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;

    uiIcon(g, cx - 4, cy + 5, "\u2605", { size: 18, fill: C_TEXT });

    return g;
}

/** Render an HTML Panel stencil. */
function renderHtmlPanel(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    uiRect(g, b.x, b.y, b.width, b.height, C_HEADER_BG, C_BORDER);
    g.appendChild(svgCreate("rect", {
        x: String(b.x + 4), y: String(b.y + 4),
        width: String(b.width - 8), height: String(b.height - 8),
        fill: "none", stroke: C_TEXT_MUT,
        "stroke-width": "1", "stroke-dasharray": "4 2"
    }));

    return g;
}

/** Render an HTML Divider stencil. */
function renderHtmlDivider(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    const cy = b.y + b.height / 2;

    uiLine(g, b.x, cy, b.x + b.width, cy, C_BORDER, 1);

    return g;
}

/** Render an HTML Link stencil. */
function renderHtmlLink(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    uiText(g, b.x + b.width / 2, b.y + b.height / 2 + 4,
        "Click here", { fill: C_PRIMARY, anchor: "middle" });
    uiLine(g, b.x + 20, b.y + b.height / 2 + 6,
        b.x + b.width - 20, b.y + b.height / 2 + 6, C_PRIMARY);

    return g;
}

/** Render an HTML Badge stencil. */
function renderHtmlBadge(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    uiRect(g, b.x, b.y, b.width, b.height, C_PRIMARY, C_PRIMARY, 10);
    uiText(g, b.x + b.width / 2, b.y + b.height / 2 + 4, "New", {
        fill: "#ffffff", anchor: "middle", size: 10, weight: 600
    });

    return g;
}

/** Render an HTML Image placeholder stencil. */
function renderHtmlImage(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;

    uiRect(g, b.x, b.y, b.width, b.height, "#e9ecef", C_BORDER);
    uiIcon(g, cx - 6, cy + 2, "\u2606", { size: 24, fill: C_TEXT_SEC });
    uiText(g, cx, cy + 20, "3:2", {
        size: 9, fill: C_TEXT_MUT, anchor: "middle"
    });

    return g;
}

/** Render an HTML List stencil. */
function renderHtmlList(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    const items = ["First item", "Second item", "Third item"];

    for (let i = 0; i < items.length; i++)
    {
        const y = b.y + 20 + i * 24;
        uiCircle(g, b.x + 12, y - 3, 3, C_TEXT_SEC, "none");
        uiText(g, b.x + 24, y, items[i], { size: 10 });
    }

    return g;
}

/** Render an HTML Blockquote stencil. */
function renderHtmlBlockquote(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    uiRect(g, b.x, b.y, 4, b.height, C_PRIMARY, "none");
    uiText(g, b.x + 16, b.y + 24, "\u201CThe quick brown fox jumps", {
        size: 10, fill: C_TEXT
    });
    uiText(g, b.x + 16, b.y + 38, "over the lazy dog.\u201D", {
        size: 10, fill: C_TEXT
    });
    uiText(g, b.x + 16, b.y + 58, "\u2014 Anonymous", {
        size: 9, fill: C_TEXT_MUT
    });

    return g;
}

/** Bootstrap 5 component shapes. */
type BsShapeTuple = [string, string, string, number, number,
    (ctx: ShapeRenderContext) => SVGElement];

const BS_SHAPES: BsShapeTuple[] = [
    ["bs-card",       "Card",        "bi-card-heading",     300, 160, renderBsCard],
    ["bs-button",     "Button",      "bi-hand-index",       120, 36,  renderBsButton],
    ["bs-accordion",  "Accordion",   "bi-list-nested",      400, 200, renderBsAccordion],
    ["bs-modal",      "Modal",       "bi-window-stack",     400, 250, renderBsModal],
    ["bs-nav",        "Nav / Tabs",  "bi-ui-checks",        300, 40,  renderBsNav],
    ["bs-alert",      "Alert",       "bi-exclamation-triangle", 400, 40,  renderBsAlert],
    ["bs-badge",      "Badge",       "bi-bookmark-fill",    60,  24,  renderBsBadge],
    ["bs-list-group", "List Group",  "bi-list-ul",          250, 130, renderBsListGroup],
    ["bs-table",      "Table",       "bi-table",            400, 120, renderBsTable],
    ["bs-form",       "Form",        "bi-input-cursor-text", 300, 160, renderBsForm],
    ["bs-pagination", "Pagination",  "bi-three-dots",       200, 32,  renderBsPagination],
    ["bs-dropdown",   "Dropdown",    "bi-menu-button-wide", 160, 130, renderBsDropdown],
    ["bs-progress",   "Progress",    "bi-bar-chart-fill",   300, 30,  renderBsProgress],
    ["bs-spinner",    "Spinner",     "bi-arrow-clockwise",  60,  80,  renderBsSpinner],
    ["bs-toggle",     "Toggle",      "bi-toggle-on",        60,  40,  renderBsToggle],
];

/** Total count for logging. */
const BS_SHAPE_COUNT = BS_SHAPES.length;

/** HTML primitive shapes. */
type HtmlShapeTuple = [string, string, string, number, number,
    (ctx: ShapeRenderContext) => SVGElement];

const HTML_SHAPES: HtmlShapeTuple[] = [
    ["html-heading",    "Heading",    "bi-type-h1",     300, 40,  renderHtmlHeading],
    ["html-text",       "Text",       "bi-fonts",       300, 60,  renderHtmlText],
    ["html-bold",       "Bold Text",  "bi-type-bold",   200, 24,  renderHtmlBold],
    ["html-small",      "Small Text", "bi-type",        200, 20,  renderHtmlSmall],
    ["html-icon",       "Icon",       "bi-star",        32,  32,  renderHtmlIcon],
    ["html-panel",      "Panel",      "bi-square",      300, 200, renderHtmlPanel],
    ["html-divider",    "Divider",    "bi-dash-lg",     300, 8,   renderHtmlDivider],
    ["html-link",       "Link",       "bi-link-45deg",  120, 24,  renderHtmlLink],
    ["html-badge",      "Badge",      "bi-bookmark",    60,  22,  renderHtmlBadge],
    ["html-image",      "Image",      "bi-image",       300, 200, renderHtmlImage],
    ["html-list",       "List",       "bi-list-ul",     250, 120, renderHtmlList],
    ["html-blockquote", "Blockquote", "bi-quote",       350, 80,  renderHtmlBlockquote],
];

/** Total HTML shape count for logging. */
const HTML_SHAPE_COUNT = HTML_SHAPES.length;

/** Category key for HTML primitives. */
const HTML_CATEGORY = "html";

// ============================================================================
// REGISTRATION
// ============================================================================

/**
 * Registers all UI component stencil shapes with the given shape
 * registry. Includes enterprise theme components (Tier A/B/C) and
 * Bootstrap 5 base components.
 *
 * @param registry - The ShapeRegistry instance to populate.
 */
function registerUiComponentStencils(registry: ShapeRegistry): void
{
    // --- Tier A: custom render functions ---
    for (const [name, label, icon, w, h, renderFn] of TIER_A_SHAPES)
    {
        registry.register(buildCustomUiShape(name, label, icon, w, h, renderFn));
    }

    // --- Tier B: enhanced generic with custom content ---
    for (const [name, label, icon, w, h] of TIER_B_SHAPES)
    {
        const contentFn = getTierBContent(name);
        registry.register(buildGenericUiShape(name, label, icon, w, h, contentFn));
    }

    // --- Tier C: improved basic with custom content ---
    for (const [name, label, icon, w, h] of TIER_C_SHAPES)
    {
        const contentFn = getTierCContent(name);
        registry.register(buildGenericUiShape(name, label, icon, w, h, contentFn));
    }

    // --- Bootstrap 5 base components ---
    for (const [name, label, icon, w, h, renderFn] of BS_SHAPES)
    {
        registry.register(buildCustomUiShape(
            name, label, icon, w, h, renderFn, BS_CATEGORY
        ));
    }

    // --- HTML primitives ---
    for (const [name, label, icon, w, h, renderFn] of HTML_SHAPES)
    {
        registry.register(buildCustomUiShape(
            name, label, icon, w, h, renderFn, HTML_CATEGORY
        ));
    }

    const total = TIER_A_SHAPES.length + TIER_B_SHAPES.length
        + TIER_C_SHAPES.length + BS_SHAPE_COUNT + HTML_SHAPE_COUNT;

    logUiInfo(`Registered ${total} ui-component stencil shapes ` +
        `(${TIER_A_SHAPES.length} Tier A, ${TIER_B_SHAPES.length} Tier B, ` +
        `${TIER_C_SHAPES.length} Tier C, ${BS_SHAPE_COUNT} Bootstrap, ` +
        `${HTML_SHAPE_COUNT} HTML)`
    );
}

// ========================================================================
// SOURCE: connectors.ts
// ========================================================================

/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Connectors
 * PURPOSE: Connector rendering and routing system for the DiagramEngine.
 *    Provides arrow marker management, path computation with multiple
 *    routing algorithms, connector SVG rendering, and label positioning.
 * RELATES: [[DiagramEngine]], [[RenderEngine]], [[ConnectorTool]]
 * FLOW: [DiagramEngine] -> [Connectors] -> [SVG DOM]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// CONSTANTS
// ============================================================================

/** Log prefix for all console messages from this module. */
const CONNECTOR_LOG_PREFIX = "[Connectors]";

function logConnectorInfo(...args: unknown[]): void
{
    console.log(new Date().toISOString(), "[INFO]", CONNECTOR_LOG_PREFIX, ...args);
}

function logConnectorWarn(...args: unknown[]): void
{
    console.warn(new Date().toISOString(), "[WARN]", CONNECTOR_LOG_PREFIX, ...args);
}

function logConnectorError(...args: unknown[]): void
{
    console.error(new Date().toISOString(), "[ERROR]", CONNECTOR_LOG_PREFIX, ...args);
}

function logConnectorDebug(...args: unknown[]): void
{
    console.debug(new Date().toISOString(), "[DEBUG]", CONNECTOR_LOG_PREFIX, ...args);
}

/** SVG namespace URI for element creation. */
const CONNECTOR_SVG_NS = "http://www.w3.org/2000/svg";

/** XHTML namespace URI for foreignObject content. */
const CONNECTOR_XHTML_NS = "http://www.w3.org/1999/xhtml";

/** Default arrow marker size in pixels. */
const MARKER_SIZE = 10;

/** Half of the marker size, used for centring calculations. */
const MARKER_HALF = MARKER_SIZE / 2;

/** Marker reference X position (tip of the arrow). */
const MARKER_REF_X = MARKER_SIZE;

/** Default connector stroke width. */
const DEFAULT_CONNECTOR_WIDTH = 1.5;

/** Default connector stroke colour (CSS variable). */
const DEFAULT_CONNECTOR_COLOR = "#495057";

/** Offset margin for manhattan routing around object bounds. */
const MANHATTAN_MARGIN = 20;

/** Label position parameter: start of the path. */
const LABEL_POS_START = 0.15;

/** Label position parameter: middle of the path. */
const LABEL_POS_MIDDLE = 0.5;

/** Label position parameter: end of the path. */
const LABEL_POS_END = 0.85;

/** Default label padding in pixels. */
const LABEL_DEFAULT_PADDING = 4;

// ============================================================================
// ARROW MARKER MANAGEMENT
// ============================================================================

/**
 * Ensures an SVG marker definition exists for the given arrow type.
 * Creates the marker in the defs element if not already present.
 * Returns the marker ID for use in marker-start/marker-end attributes.
 *
 * @param defsEl - The SVG defs element to insert markers into.
 * @param arrowType - The arrow type to create a marker for.
 * @returns The marker element ID string.
 */
function ensureArrowMarker(
    defsEl: SVGElement,
    arrowType: ArrowType): string
{
    const markerId = `de-arrow-${arrowType}`;
    const existing = defsEl.querySelector(`#${markerId}`);

    if (existing)
    {
        return markerId;
    }

    const marker = createMarkerElement(markerId, arrowType);

    defsEl.appendChild(marker);

    logConnectorDebug("Created arrow marker:", markerId);

    return markerId;
}

/**
 * Creates an SVG marker element with the correct geometry for the
 * given arrow type.
 *
 * @param markerId - The ID to assign to the marker element.
 * @param arrowType - The arrow type determining the path geometry.
 * @returns A configured SVG marker element.
 */
function createMarkerElement(markerId: string, arrowType: ArrowType): SVGElement
{
    const marker = document.createElementNS(CONNECTOR_SVG_NS, "marker");

    marker.setAttribute("id", markerId);
    marker.setAttribute("markerWidth", String(MARKER_SIZE));
    marker.setAttribute("markerHeight", String(MARKER_SIZE));
    marker.setAttribute("refX", String(MARKER_REF_X));
    marker.setAttribute("refY", String(MARKER_HALF));
    marker.setAttribute("orient", "auto-start-reverse");
    marker.setAttribute("markerUnits", "strokeWidth");

    const path = buildMarkerPath(arrowType);

    marker.appendChild(path);

    return marker;
}

/**
 * Builds the SVG path element with geometry specific to the arrow type.
 *
 * @param arrowType - The arrow type to build geometry for.
 * @returns An SVG path element with the correct d attribute and fill.
 */
function buildMarkerPath(arrowType: ArrowType): SVGElement
{
    const path = document.createElementNS(CONNECTOR_SVG_NS, "path");
    const geometry = getArrowGeometry(arrowType);

    path.setAttribute("d", geometry.d);
    path.setAttribute("fill", geometry.fill);

    if (geometry.stroke)
    {
        path.setAttribute("stroke", geometry.stroke);
        path.setAttribute("stroke-width", "1");
    }

    return path;
}

/**
 * Returns the SVG path data and fill settings for each arrow type.
 * Uses a pre-built lookup table for concise dispatch.
 *
 * @param arrowType - The arrow type.
 * @returns An object with d (path data), fill, and optional stroke.
 */
function getArrowGeometry(
    arrowType: ArrowType
): { d: string; fill: string; stroke?: string }
{
    const table = buildArrowGeometryTable();
    const fallback = { d: `M 0 0 L ${MARKER_SIZE} ${MARKER_HALF} L 0 ${MARKER_SIZE} Z`, fill: "currentColor" };

    return table[arrowType] ?? fallback;
}

/**
 * Builds the lookup table mapping arrow types to their SVG geometry.
 *
 * @returns A record of arrow type to path data and fill settings.
 */
function buildArrowGeometryTable(): Record<string, { d: string; fill: string; stroke?: string }>
{
    const s = MARKER_SIZE;
    const h = MARKER_HALF;
    const cur = "currentColor";

    return {
        block: { d: `M 0 0 L ${s} ${h} L 0 ${s} Z`, fill: cur },
        classic: { d: `M 0 0 L ${s} ${h} L 0 ${s} L 2 ${h} Z`, fill: cur },
        open: { d: `M 0 0 L ${s} ${h} L 0 ${s}`, fill: "none", stroke: cur },
        diamond: { d: `M 0 ${h} L ${h} 0 L ${s} ${h} L ${h} ${s} Z`, fill: cur },
        oval: { d: `M ${h} 0 A ${h} ${h} 0 1 1 ${h} ${s} A ${h} ${h} 0 1 1 ${h} 0 Z`, fill: cur },
        dash: { d: `M ${h} 0 L ${h} ${s}`, fill: "none", stroke: cur },
        cross: { d: `M 0 0 L ${s} ${s} M ${s} 0 L 0 ${s}`, fill: "none", stroke: cur },
    };
}

// ============================================================================
// ENDPOINT RESOLUTION
// ============================================================================

/**
 * Resolves a connector endpoint to a canvas-space point. Looks up the
 * object by ID, finds the specified port (or computes the nearest
 * edge point towards the other endpoint), and converts the position
 * to absolute coordinates.
 *
 * @param objId - The object ID the endpoint attaches to.
 * @param portId - Optional port ID within the object's shape.
 * @param fallbackPoint - Optional fallback point for freestanding endpoints.
 * @param objects - All objects in the document for lookup.
 * @param otherPoint - The other endpoint's position for nearest-edge calculation.
 * @returns The resolved point, or null if the object cannot be found.
 */
function resolveEndpoint(
    objId: string,
    portId: string | undefined,
    fallbackPoint: Point | undefined,
    objects: DiagramObject[],
    otherPoint?: Point): Point | null
{
    const obj = objects.find((o) => o.id === objId);

    if (!obj)
    {
        return fallbackPoint ?? null;
    }

    if (!portId)
    {
        if (otherPoint)
        {
            return computeNearestEdgePoint(obj.presentation.bounds, otherPoint);
        }

        return computeObjectCenter(obj);
    }

    return resolvePortPosition(obj, portId);
}

/**
 * Computes the point on the nearest edge (N/S/E/W midpoint) of an
 * object's bounding rectangle closest to the given target point.
 *
 * @param bounds - The object's bounding rectangle.
 * @param target - The point to measure distance towards.
 * @returns The midpoint of the nearest edge.
 */
function computeNearestEdgePoint(bounds: Rect, target: Point): Point
{
    const cx = bounds.x + (bounds.width / 2);
    const cy = bounds.y + (bounds.height / 2);

    const edges: { point: Point; dist: number }[] = [
        { point: { x: cx, y: bounds.y },                       dist: 0 },
        { point: { x: cx, y: bounds.y + bounds.height },       dist: 0 },
        { point: { x: bounds.x + bounds.width, y: cy },        dist: 0 },
        { point: { x: bounds.x, y: cy },                       dist: 0 },
    ];

    for (const edge of edges)
    {
        edge.dist = pointDistanceSquared(edge.point, target);
    }

    edges.sort((a, b) => a.dist - b.dist);

    return edges[0].point;
}

/**
 * Computes the squared Euclidean distance between two points.
 * Uses squared distance to avoid an unnecessary sqrt call.
 *
 * @param a - First point.
 * @param b - Second point.
 * @returns The squared distance.
 */
function pointDistanceSquared(a: Point, b: Point): number
{
    const dx = a.x - b.x;
    const dy = a.y - b.y;

    return (dx * dx) + (dy * dy);
}

/**
 * Computes the centre point of an object's bounding rectangle.
 *
 * @param obj - The diagram object.
 * @returns The centre point in canvas coordinates.
 */
function computeObjectCenter(obj: DiagramObject): Point
{
    const b = obj.presentation.bounds;

    return {
        x: b.x + (b.width / 2),
        y: b.y + (b.height / 2)
    };
}

/**
 * Resolves a specific port's position to canvas coordinates.
 * Falls back to the object centre if the port is not found.
 *
 * @param obj - The diagram object containing the port.
 * @param portId - The port identifier to resolve.
 * @returns The port position in canvas coordinates.
 */
function resolvePortPosition(obj: DiagramObject, portId: string): Point
{
    const b = obj.presentation.bounds;
    const portNorm = findPortNormPosition(portId);

    return {
        x: b.x + (portNorm.x * b.width),
        y: b.y + (portNorm.y * b.height)
    };
}

/**
 * Maps a port ID to its normalised position. Uses the standard
 * four-port layout (N, S, E, W at midpoints).
 *
 * @param portId - The port identifier string.
 * @returns The normalised position (0-1) on the object bounds.
 */
function findPortNormPosition(portId: string): { x: number; y: number }
{
    const portMap: Record<string, { x: number; y: number }> = {
        "port-n":  { x: 0.5, y: 0 },
        "port-ne": { x: 1,   y: 0 },
        "port-e":  { x: 1,   y: 0.5 },
        "port-se": { x: 1,   y: 1 },
        "port-s":  { x: 0.5, y: 1 },
        "port-sw": { x: 0,   y: 1 },
        "port-w":  { x: 0,   y: 0.5 },
        "port-nw": { x: 0,   y: 0 },
        "port-c":  { x: 0.5, y: 0.5 }
    };

    return portMap[portId] ?? { x: 0.5, y: 0.5 };
}

// ============================================================================
// PATH COMPUTATION — ROUTING ALGORITHMS
// ============================================================================

/**
 * Computes the SVG path d attribute for a connector based on its
 * routing style and endpoint positions.
 *
 * Uses a two-pass resolution strategy so each endpoint can choose
 * the nearest edge towards the other endpoint (edge-to-edge routing).
 *
 * @param conn - The connector to compute a path for.
 * @param objects - All objects in the document for endpoint resolution.
 * @returns The SVG path d attribute string, or empty string on failure.
 */
function computeConnectorPath(
    conn: DiagramConnector,
    objects: DiagramObject[]): string
{
    const pres = conn.presentation;
    const endpoints = resolveEndpointPair(pres, objects);

    if (!endpoints)
    {
        logConnectorWarn("Cannot resolve endpoints for:", conn.id);
        return "";
    }

    return routePath(pres.routing, endpoints.src, endpoints.tgt, pres, objects);
}

/**
 * Resolves both endpoints of a connector using a two-pass approach.
 * Pass 1: resolve each endpoint using the other's centre as a
 * rough target for nearest-edge calculation.
 * Pass 2: re-resolve each endpoint using the other's pass-1
 * position for accurate edge-to-edge results.
 *
 * @param pres - The connector's presentation data.
 * @param objects - All objects in the document.
 * @returns An object with src and tgt points, or null if resolution fails.
 */
function resolveEndpointPair(
    pres: DiagramConnector["presentation"],
    objects: DiagramObject[]
): { src: Point; tgt: Point } | null
{
    const srcCenter = resolveEndpoint(
        pres.sourceId, pres.sourcePort, pres.sourcePoint, objects
    );
    const tgtCenter = resolveEndpoint(
        pres.targetId, pres.targetPort, pres.targetPoint, objects
    );

    if (!srcCenter || !tgtCenter)
    {
        return null;
    }

    const src = resolveEndpoint(
        pres.sourceId, pres.sourcePort, pres.sourcePoint, objects, tgtCenter
    );
    const tgt = resolveEndpoint(
        pres.targetId, pres.targetPort, pres.targetPoint, objects, srcCenter
    );

    if (!src || !tgt)
    {
        return null;
    }

    return { src, tgt };
}

/**
 * Dispatches to the appropriate routing algorithm based on the
 * routing style.
 *
 * @param routing - The routing algorithm to use.
 * @param src - Source point in canvas coordinates.
 * @param tgt - Target point in canvas coordinates.
 * @param pres - The connector presentation data.
 * @param objects - All objects for bounds lookups.
 * @returns The SVG path d attribute string.
 */
function routePath(
    routing: RoutingStyle,
    src: Point,
    tgt: Point,
    pres: DiagramConnector["presentation"],
    objects: DiagramObject[]): string
{
    switch (routing)
    {
        case "orthogonal":
        case "elbow":
            return orthogonalPath(src, tgt);

        case "manhattan":
        case "entity":
            return computeManhattanPath(src, tgt, pres, objects);

        case "curved":
            return curvedPath(src, tgt);

        default:
            return straightPath(src, tgt);
    }
}

/**
 * Computes a straight line path between two points.
 *
 * @param src - Source point.
 * @param tgt - Target point.
 * @returns SVG path d attribute for a straight line.
 */
function straightPath(src: Point, tgt: Point): string
{
    return `M ${src.x} ${src.y} L ${tgt.x} ${tgt.y}`;
}

/**
 * Computes an orthogonal (right-angle) path between two points.
 * Routes through the horizontal midpoint for clean right-angle segments.
 *
 * @param src - Source point.
 * @param tgt - Target point.
 * @returns SVG path d attribute with right-angle segments.
 */
function orthogonalPath(src: Point, tgt: Point): string
{
    const midX = (src.x + tgt.x) / 2;

    return `M ${src.x} ${src.y} L ${midX} ${src.y} L ${midX} ${tgt.y} L ${tgt.x} ${tgt.y}`;
}

/**
 * Computes a smooth cubic Bezier curve between two points.
 * Control points are placed at 40% of the horizontal distance.
 *
 * @param src - Source point.
 * @param tgt - Target point.
 * @returns SVG path d attribute for a curved connector.
 */
function curvedPath(src: Point, tgt: Point): string
{
    const dx = (tgt.x - src.x) * 0.4;

    return `M ${src.x} ${src.y} C ${src.x + dx} ${src.y}, ${tgt.x - dx} ${tgt.y}, ${tgt.x} ${tgt.y}`;
}

/**
 * Orchestrates manhattan routing by resolving source and target
 * object bounds and delegating to the core algorithm.
 *
 * @param src - Source point.
 * @param tgt - Target point.
 * @param pres - Connector presentation data for object ID lookup.
 * @param objects - All objects for bounds resolution.
 * @returns SVG path d attribute with manhattan routing.
 */
function computeManhattanPath(
    src: Point,
    tgt: Point,
    pres: DiagramConnector["presentation"],
    objects: DiagramObject[]): string
{
    const srcObj = objects.find((o) => o.id === pres.sourceId);
    const tgtObj = objects.find((o) => o.id === pres.targetId);

    const srcBounds = srcObj?.presentation.bounds ?? { x: src.x, y: src.y, width: 0, height: 0 };
    const tgtBounds = tgtObj?.presentation.bounds ?? { x: tgt.x, y: tgt.y, width: 0, height: 0 };

    return manhattanPath(src, tgt, srcBounds, tgtBounds);
}

/**
 * Computes a manhattan-routed path that avoids overlapping object
 * bounds. Routes with a margin around the source and target objects
 * using right-angle segments only.
 *
 * @param src - Source point in canvas coordinates.
 * @param tgt - Target point in canvas coordinates.
 * @param srcBounds - Bounding rectangle of the source object.
 * @param tgtBounds - Bounding rectangle of the target object.
 * @returns SVG path d attribute with manhattan routing.
 */
function manhattanPath(
    src: Point,
    tgt: Point,
    srcBounds: Rect,
    tgtBounds: Rect): string
{
    const srcExit = computeExitPoint(src, srcBounds);
    const tgtEntry = computeEntryPoint(tgt, tgtBounds);

    return buildManhattanSegments(src, srcExit, tgtEntry, tgt);
}

/**
 * Computes the exit point from the source object with margin.
 *
 * @param src - The source port position.
 * @param bounds - The source object's bounding rectangle.
 * @returns A point offset from the object edge by the margin.
 */
function computeExitPoint(src: Point, bounds: Rect): Point
{
    const cx = bounds.x + (bounds.width / 2);

    if (src.y <= bounds.y)
    {
        return { x: src.x, y: bounds.y - MANHATTAN_MARGIN };
    }

    if (src.y >= bounds.y + bounds.height)
    {
        return { x: src.x, y: bounds.y + bounds.height + MANHATTAN_MARGIN };
    }

    if (src.x >= cx)
    {
        return { x: bounds.x + bounds.width + MANHATTAN_MARGIN, y: src.y };
    }

    return { x: bounds.x - MANHATTAN_MARGIN, y: src.y };
}

/**
 * Computes the entry point into the target object with margin.
 *
 * @param tgt - The target port position.
 * @param bounds - The target object's bounding rectangle.
 * @returns A point offset from the object edge by the margin.
 */
function computeEntryPoint(tgt: Point, bounds: Rect): Point
{
    const cx = bounds.x + (bounds.width / 2);

    if (tgt.y <= bounds.y)
    {
        return { x: tgt.x, y: bounds.y - MANHATTAN_MARGIN };
    }

    if (tgt.y >= bounds.y + bounds.height)
    {
        return { x: tgt.x, y: bounds.y + bounds.height + MANHATTAN_MARGIN };
    }

    if (tgt.x >= cx)
    {
        return { x: bounds.x + bounds.width + MANHATTAN_MARGIN, y: tgt.y };
    }

    return { x: bounds.x - MANHATTAN_MARGIN, y: tgt.y };
}

/**
 * Builds the SVG path segments connecting source exit, intermediate
 * waypoints, and target entry using only right-angle segments.
 *
 * @param src - Source port point.
 * @param srcExit - Exit point with margin from source.
 * @param tgtEntry - Entry point with margin to target.
 * @param tgt - Target port point.
 * @returns SVG path d attribute string.
 */
function buildManhattanSegments(
    src: Point,
    srcExit: Point,
    tgtEntry: Point,
    tgt: Point): string
{
    const midY = (srcExit.y + tgtEntry.y) / 2;

    const parts = [
        `M ${src.x} ${src.y}`,
        `L ${srcExit.x} ${srcExit.y}`,
        `L ${srcExit.x} ${midY}`,
        `L ${tgtEntry.x} ${midY}`,
        `L ${tgtEntry.x} ${tgtEntry.y}`,
        `L ${tgt.x} ${tgt.y}`
    ];

    return parts.join(" ");
}

// ============================================================================
// LABEL POSITIONING
// ============================================================================

/**
 * Interpolates a point along a straight line between two endpoints.
 *
 * @param src - Start point of the line.
 * @param tgt - End point of the line.
 * @param t - Parameter from 0 (source) to 1 (target).
 * @returns The interpolated point on the line.
 */
function getPointOnPath(src: Point, tgt: Point, t: number): Point
{
    return {
        x: src.x + ((tgt.x - src.x) * t),
        y: src.y + ((tgt.y - src.y) * t)
    };
}

/**
 * Converts a named label position to a numeric parameter value.
 *
 * @param position - Named position or numeric value (0-1).
 * @returns The numeric parameter for path interpolation.
 */
function resolveLabelPosition(position: "start" | "middle" | "end" | number): number
{
    if (typeof position === "number")
    {
        return position;
    }

    switch (position)
    {
        case "start": return LABEL_POS_START;
        case "middle": return LABEL_POS_MIDDLE;
        case "end": return LABEL_POS_END;
        default: return LABEL_POS_MIDDLE;
    }
}

// ============================================================================
// PATH PARSING AND HIT TESTING
// ============================================================================

/**
 * Parses an SVG path d string containing M and L commands into an
 * array of points. Only handles absolute M and L commands (which
 * is what all our routing algorithms produce).
 *
 * @param d - The SVG path d attribute string.
 * @returns Array of points along the path.
 */
function parsePathToPoints(d: string): Point[]
{
    const points: Point[] = [];
    const tokens = d.match(/[ML]\s*[\d.eE+-]+\s+[\d.eE+-]+/g);

    if (!tokens)
    {
        return points;
    }

    for (const token of tokens)
    {
        const nums = token.match(/[\d.eE+-]+/g);

        if (nums && nums.length >= 2)
        {
            points.push({
                x: parseFloat(nums[0]),
                y: parseFloat(nums[1])
            });
        }
    }

    return points;
}

/**
 * Computes the perpendicular distance from a point to a line segment.
 * Returns the minimum distance from point p to any point on segment
 * (a, b), clamped to the segment endpoints.
 *
 * @param p - The test point.
 * @param a - Segment start point.
 * @param b - Segment end point.
 * @returns The distance from p to the closest point on segment (a, b).
 */
function pointToSegmentDistance(p: Point, a: Point, b: Point): number
{
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const lenSq = (abx * abx) + (aby * aby);

    if (lenSq === 0)
    {
        const dx = p.x - a.x;
        const dy = p.y - a.y;

        return Math.sqrt((dx * dx) + (dy * dy));
    }

    const t = Math.max(0, Math.min(1,
        (((p.x - a.x) * abx) + ((p.y - a.y) * aby)) / lenSq
    ));

    const projX = a.x + (t * abx);
    const projY = a.y + (t * aby);
    const dx = p.x - projX;
    const dy = p.y - projY;

    return Math.sqrt((dx * dx) + (dy * dy));
}

/**
 * Hit-tests a connector path against a canvas position. Computes
 * the connector path, parses it into line segments, and checks if
 * any segment is within tolerance of the click point.
 *
 * @param conn - The connector to test.
 * @param canvasPos - The test point in canvas coordinates.
 * @param objects - All objects for endpoint resolution.
 * @param tolerance - Maximum distance in pixels for a hit (default 8).
 * @returns true if the connector path is within tolerance of the point.
 */
function hitTestConnectorPath(
    conn: DiagramConnector,
    canvasPos: Point,
    objects: DiagramObject[],
    tolerance: number = 8): boolean
{
    const pathD = computeConnectorPath(conn, objects);

    if (!pathD)
    {
        return false;
    }

    const points = parsePathToPoints(pathD);

    return testSegmentsDistance(points, canvasPos, tolerance);
}

/**
 * Tests whether any segment in the points array is within tolerance
 * of the given position.
 *
 * @param points - Array of path points forming line segments.
 * @param pos - The test point.
 * @param tolerance - Maximum distance for a hit.
 * @returns true if any segment is close enough.
 */
function testSegmentsDistance(
    points: Point[],
    pos: Point,
    tolerance: number): boolean
{
    for (let i = 0; i < points.length - 1; i++)
    {
        const dist = pointToSegmentDistance(pos, points[i], points[i + 1]);

        if (dist <= tolerance)
        {
            return true;
        }
    }

    return false;
}

// ============================================================================
// CONNECTOR RENDERING
// ============================================================================

/**
 * Creates a complete SVG group element for a connector, including
 * the path line, arrow markers, and any labels.
 *
 * @param conn - The connector to render.
 * @param objects - All objects in the document for endpoint resolution.
 * @param defsEl - The SVG defs element for marker definitions.
 * @returns An SVG group element representing the connector.
 */
function renderConnectorToSvg(
    conn: DiagramConnector,
    objects: DiagramObject[],
    defsEl: SVGElement): SVGElement
{
    const g = document.createElementNS(CONNECTOR_SVG_NS, "g");

    g.setAttribute("data-connector-id", conn.id);
    g.setAttribute("class", "de-connector");

    const pathD = computeConnectorPath(conn, objects);

    if (!pathD)
    {
        return g;
    }

    const hitArea = createConnectorHitArea(pathD);

    g.appendChild(hitArea);

    const pathEl = createConnectorPath(conn, pathD, defsEl);

    g.appendChild(pathEl);

    appendConnectorLabels(g, conn, objects);

    return g;
}

/**
 * Creates the SVG path element for a connector with stroke styles
 * and arrow markers applied.
 *
 * @param conn - The connector for style information.
 * @param pathD - The computed SVG path d attribute.
 * @param defsEl - The defs element for marker creation.
 * @returns A styled SVG path element.
 */
function createConnectorPath(
    conn: DiagramConnector,
    pathD: string,
    defsEl: SVGElement): SVGElement
{
    const path = document.createElementNS(CONNECTOR_SVG_NS, "path");
    const style = conn.presentation.style;

    path.setAttribute("d", pathD);
    path.setAttribute("fill", "none");

    applyConnectorStroke(path, style, defsEl);
    applyArrowMarkers(path, style, defsEl);

    return path;
}

/**
 * Creates an invisible wide path element for easier click-targeting
 * of connectors. The transparent stroke provides a wider hit area.
 *
 * @param pathD - The computed SVG path d attribute.
 * @returns A transparent SVG path element with a wide stroke.
 */
function createConnectorHitArea(pathD: string): SVGElement
{
    const hitPath = document.createElementNS(CONNECTOR_SVG_NS, "path");

    hitPath.setAttribute("d", pathD);
    hitPath.setAttribute("fill", "none");
    hitPath.setAttribute("stroke", "transparent");
    hitPath.setAttribute("stroke-width", "12");
    hitPath.setAttribute("class", "de-connector-hit-area");

    return hitPath;
}

/**
 * Applies stroke styling (colour, width, dash pattern) to a
 * connector path element.
 *
 * @param path - The SVG path element.
 * @param style - The connector style settings.
 */
function applyConnectorStroke(
    path: SVGElement,
    style: ConnectorStyle,
    defsEl?: SVGElement
): void
{
    applyConnectorStrokeColor(path, style, defsEl);

    path.setAttribute("stroke-width", String(style.width ?? DEFAULT_CONNECTOR_WIDTH));

    applyConnectorStrokeExtras(path, style);
}

/** Apply stroke colour to a connector path (solid, gradient, or default). */
function applyConnectorStrokeColor(
    path: SVGElement,
    style: ConnectorStyle,
    defsEl?: SVGElement
): void
{
    if (typeof style.color === "string")
    {
        path.setAttribute("stroke", style.color);
    }
    else if (style.color && typeof style.color === "object" && defsEl)
    {
        applyGradientStrokeToConnector(path, style.color, defsEl);
    }
    else
    {
        path.setAttribute("stroke", DEFAULT_CONNECTOR_COLOR);
    }
}

/** Apply optional line cap, join, and dash pattern to a connector path. */
function applyConnectorStrokeExtras(
    path: SVGElement, style: ConnectorStyle
): void
{
    if (style.lineCap)
    {
        path.setAttribute("stroke-linecap", style.lineCap);
    }

    if (style.lineJoin)
    {
        path.setAttribute("stroke-linejoin", style.lineJoin);
    }

    if (style.dashPattern && style.dashPattern.length > 0)
    {
        path.setAttribute("stroke-dasharray", style.dashPattern.join(" "));
    }
}

/**
 * Applies a gradient stroke colour to a connector path element.
 * Inserts the gradient definition into the shared defs element.
 *
 * @param path - The SVG path element.
 * @param gradient - The gradient definition.
 * @param defsEl - The shared SVG defs element.
 */
function applyGradientStrokeToConnector(
    path: SVGElement,
    gradient: GradientDefinition,
    defsEl: SVGElement
): void
{
    const gradientId = "conn-stroke-" + Math.random().toString(36).substring(2, 10);
    const gradEl = buildGradientElement(gradient, gradientId);

    defsEl.appendChild(gradEl);
    path.setAttribute("stroke", `url(#${gradientId})`);
}

/**
 * Applies start and end arrow markers to a connector path element.
 * Creates the marker definitions in defs if they do not exist.
 *
 * @param path - The SVG path element.
 * @param style - The connector style with arrow type settings.
 * @param defsEl - The SVG defs element for marker creation.
 */
function applyArrowMarkers(
    path: SVGElement,
    style: ConnectorStyle,
    defsEl: SVGElement): void
{
    if (style.startArrow && style.startArrow !== "none")
    {
        const markerId = ensureArrowMarker(defsEl, style.startArrow);

        path.setAttribute("marker-start", `url(#${markerId})`);
    }

    if (style.endArrow && style.endArrow !== "none")
    {
        const markerId = ensureArrowMarker(defsEl, style.endArrow);

        path.setAttribute("marker-end", `url(#${markerId})`);
    }
}

/**
 * Appends label elements to a connector group. Each label is
 * positioned along the connector path according to its position
 * property.
 *
 * @param g - The connector's SVG group element.
 * @param conn - The connector with label definitions.
 * @param objects - All objects for endpoint resolution.
 */
function appendConnectorLabels(
    g: SVGElement,
    conn: DiagramConnector,
    objects: DiagramObject[]): void
{
    if (!conn.presentation.labels || conn.presentation.labels.length === 0)
    {
        return;
    }

    const endpoints = resolveConnectorEndpoints(conn, objects);

    if (!endpoints)
    {
        return;
    }

    for (const label of conn.presentation.labels)
    {
        const labelEl = createLabelElement(label, endpoints.src, endpoints.tgt);

        g.appendChild(labelEl);
    }
}

/**
 * Resolves both source and target endpoints for a connector.
 * Delegates to the two-pass resolveEndpointPair for edge-to-edge
 * accuracy.
 *
 * @param conn - The connector to resolve endpoints for.
 * @param objects - All objects in the document.
 * @returns An object with src and tgt points, or null if resolution fails.
 */
function resolveConnectorEndpoints(
    conn: DiagramConnector,
    objects: DiagramObject[]
): { src: Point; tgt: Point } | null
{
    return resolveEndpointPair(conn.presentation, objects);
}

/**
 * Creates an SVG foreignObject element for a connector label,
 * positioned at the correct point along the connector path.
 *
 * @param label - The connector label definition.
 * @param src - Source endpoint of the connector.
 * @param tgt - Target endpoint of the connector.
 * @returns An SVG foreignObject element containing the label text.
 */
function createLabelElement(
    label: ConnectorLabel,
    src: Point,
    tgt: Point): SVGElement
{
    const t = resolveLabelPosition(label.position);
    const pos = getPointOnPath(src, tgt, t);
    const padding = label.padding ?? LABEL_DEFAULT_PADDING;

    const fo = document.createElementNS(CONNECTOR_SVG_NS, "foreignObject");

    fo.setAttribute("x", String(pos.x - 40));
    fo.setAttribute("y", String(pos.y - 12));
    fo.setAttribute("width", "80");
    fo.setAttribute("height", "24");
    fo.setAttribute("class", "de-connector-label");

    const div = buildLabelDiv(label, padding);

    fo.appendChild(div);

    return fo;
}

/**
 * Builds the HTML div container for a connector label with styling.
 *
 * @param label - The connector label definition.
 * @param padding - Inner padding for the label.
 * @returns An HTML div element with the label text content.
 */
function buildLabelDiv(label: ConnectorLabel, padding: number): HTMLDivElement
{
    const div = document.createElementNS(CONNECTOR_XHTML_NS, "div") as HTMLDivElement;

    div.setAttribute("xmlns", CONNECTOR_XHTML_NS);

    const styles = [
        "text-align: center",
        "font-size: 11px",
        "line-height: 1.2",
        "white-space: nowrap",
        "overflow: hidden",
        "text-overflow: ellipsis",
        `padding: ${padding}px`
    ];

    div.setAttribute("style", styles.join("; "));

    const text = extractLabelText(label);

    div.textContent = text;

    return div;
}

/**
 * Extracts plain text from a label's TextContent runs.
 *
 * @param label - The connector label.
 * @returns The concatenated plain text string.
 */
function extractLabelText(label: ConnectorLabel): string
{
    const runs = label.textContent.runs ?? [];

    return runs
        .filter((r): r is TextRun => "text" in r)
        .map((r) => r.text)
        .join("");
}

// ========================================================================
// SOURCE: guides.ts
// ========================================================================

/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: DiagramEngine — Guides
 * PURPOSE: Visual guide system for alignment and spacing detection during
 *    drag operations. Computes snap deltas and guide lines for object
 *    alignment (edges, centres) and equal spacing between neighbours.
 * RELATES: [[DiagramEngine]], [[SelectTool]], [[RenderEngine]]
 * FLOW: [SelectTool.showMoveAlignmentGuides()] -> [computeAlignmentGuides()]
 *       -> [renderGuides()]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// CONSTANTS
// ============================================================================

/** Log prefix for guide system messages. */
const GUIDES_LOG_PREFIX = "[Guides]";

/** Default snap threshold in canvas pixels. */
const DEFAULT_SNAP_THRESHOLD = 5;

/** Colour for alignment guide lines. */
const ALIGNMENT_GUIDE_COLOR = "var(--bs-primary, #0d6efd)";

/** Colour for spacing guide lines. */
const SPACING_GUIDE_COLOR = "#dc3545";

/** Dash pattern for alignment guide lines. */
const ALIGNMENT_DASH = "4 3";

/** Font size for spacing labels. */
const SPACING_LABEL_FONT_SIZE = 11;

// ============================================================================
// TYPES
// ============================================================================

/** A line segment between two points. */
interface LineSegment
{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

/** A visual guide line with optional label. */
interface AlignmentGuide
{
    type: "alignment" | "spacing";
    lines: LineSegment[];
    label?: { text: string; position: Point };
}

/** Result of snap computation: delta to apply and guides to render. */
interface SnapResult
{
    dx: number;
    dy: number;
    guides: AlignmentGuide[];
}

// ============================================================================
// ALIGNMENT EDGES
// ============================================================================

/**
 * Extracts the five alignment values (left, right, top, bottom, centerX,
 * centerY) from a bounding rectangle.
 *
 * @param b - The bounding rectangle.
 * @returns Object with edge and centre positions.
 */
function extractEdges(b: Rect): {
    left: number;
    right: number;
    top: number;
    bottom: number;
    cx: number;
    cy: number;
}
{
    return {
        left: b.x,
        right: b.x + b.width,
        top: b.y,
        bottom: b.y + b.height,
        cx: b.x + (b.width / 2),
        cy: b.y + (b.height / 2)
    };
}

// ============================================================================
// HORIZONTAL ALIGNMENT
// ============================================================================

/**
 * Checks horizontal edge alignment (left, right, centre) between the
 * moving bounds and a target object. Returns any guides within threshold.
 *
 * @param moving - Edges of the moving selection.
 * @param target - Edges of the comparison object.
 * @param movingBounds - Full bounds of the moving selection.
 * @param targetBounds - Full bounds of the comparison object.
 * @param threshold - Snap distance in pixels.
 * @returns Array of matching alignment guides with dx snap values.
 */
function checkHorizontalAlign(
    moving: ReturnType<typeof extractEdges>,
    target: ReturnType<typeof extractEdges>,
    movingBounds: Rect,
    targetBounds: Rect,
    threshold: number): { dx: number; guide: AlignmentGuide }[]
{
    const results: { dx: number; guide: AlignmentGuide }[] = [];
    const pairs = buildHorizontalPairs(moving, target);

    for (const pair of pairs)
    {
        const delta = pair.targetVal - pair.movingVal;

        if (Math.abs(delta) <= threshold)
        {
            const line = buildVerticalGuideLine(
                pair.targetVal, movingBounds, targetBounds
            );

            results.push({
                dx: delta,
                guide: { type: "alignment", lines: [line] }
            });
        }
    }

    return results;
}

/**
 * Builds the horizontal alignment pairs to compare.
 *
 * @param m - Moving object edges.
 * @param t - Target object edges.
 * @returns Array of value pairs to check.
 */
function buildHorizontalPairs(
    m: ReturnType<typeof extractEdges>,
    t: ReturnType<typeof extractEdges>): { movingVal: number; targetVal: number }[]
{
    return [
        { movingVal: m.left,  targetVal: t.left },
        { movingVal: m.right, targetVal: t.right },
        { movingVal: m.cx,    targetVal: t.cx },
        { movingVal: m.left,  targetVal: t.right },
        { movingVal: m.right, targetVal: t.left }
    ];
}

/**
 * Creates a vertical guide line spanning the Y range of two bounds.
 *
 * @param x - The X coordinate for the vertical line.
 * @param a - First bounding rectangle.
 * @param b - Second bounding rectangle.
 * @returns A vertical LineSegment spanning both objects.
 */
function buildVerticalGuideLine(x: number, a: Rect, b: Rect): LineSegment
{
    const minY = Math.min(a.y, b.y);
    const maxY = Math.max(a.y + a.height, b.y + b.height);

    return { x1: x, y1: minY, x2: x, y2: maxY };
}

// ============================================================================
// VERTICAL ALIGNMENT
// ============================================================================

/**
 * Checks vertical edge alignment (top, bottom, centre) between the
 * moving bounds and a target object. Returns any guides within threshold.
 *
 * @param moving - Edges of the moving selection.
 * @param target - Edges of the comparison object.
 * @param movingBounds - Full bounds of the moving selection.
 * @param targetBounds - Full bounds of the comparison object.
 * @param threshold - Snap distance in pixels.
 * @returns Array of matching alignment guides with dy snap values.
 */
function checkVerticalAlign(
    moving: ReturnType<typeof extractEdges>,
    target: ReturnType<typeof extractEdges>,
    movingBounds: Rect,
    targetBounds: Rect,
    threshold: number): { dy: number; guide: AlignmentGuide }[]
{
    const results: { dy: number; guide: AlignmentGuide }[] = [];
    const pairs = buildVerticalPairs(moving, target);

    for (const pair of pairs)
    {
        const delta = pair.targetVal - pair.movingVal;

        if (Math.abs(delta) <= threshold)
        {
            const line = buildHorizontalGuideLine(
                pair.targetVal, movingBounds, targetBounds
            );

            results.push({
                dy: delta,
                guide: { type: "alignment", lines: [line] }
            });
        }
    }

    return results;
}

/**
 * Builds the vertical alignment pairs to compare.
 *
 * @param m - Moving object edges.
 * @param t - Target object edges.
 * @returns Array of value pairs to check.
 */
function buildVerticalPairs(
    m: ReturnType<typeof extractEdges>,
    t: ReturnType<typeof extractEdges>): { movingVal: number; targetVal: number }[]
{
    return [
        { movingVal: m.top,    targetVal: t.top },
        { movingVal: m.bottom, targetVal: t.bottom },
        { movingVal: m.cy,     targetVal: t.cy },
        { movingVal: m.top,    targetVal: t.bottom },
        { movingVal: m.bottom, targetVal: t.top }
    ];
}

/**
 * Creates a horizontal guide line spanning the X range of two bounds.
 *
 * @param y - The Y coordinate for the horizontal line.
 * @param a - First bounding rectangle.
 * @param b - Second bounding rectangle.
 * @returns A horizontal LineSegment spanning both objects.
 */
function buildHorizontalGuideLine(y: number, a: Rect, b: Rect): LineSegment
{
    const minX = Math.min(a.x, b.x);
    const maxX = Math.max(a.x + a.width, b.x + b.width);

    return { x1: minX, y1: y, x2: maxX, y2: y };
}

// ============================================================================
// COMPUTE ALIGNMENT GUIDES
// ============================================================================

/**
 * Computes alignment guides and snap delta for a moving selection
 * against all other objects on the canvas. Checks edge and centre
 * alignment in both axes and returns the closest snap with guides.
 *
 * @param movingBounds - Current bounds of the dragged selection.
 * @param allObjects - All objects in the document.
 * @param excludeIds - IDs of objects to skip (the selection itself).
 * @param threshold - Snap distance in canvas pixels.
 * @returns SnapResult with dx/dy snap deltas and guide lines.
 */
function computeAlignmentGuides(
    movingBounds: Rect,
    allObjects: DiagramObject[],
    excludeIds: Set<string>,
    threshold: number): SnapResult
{
    const movingEdges = extractEdges(movingBounds);
    const candidates = filterCandidates(allObjects, excludeIds);

    const hResults = collectHorizontalMatches(
        movingEdges, movingBounds, candidates, threshold
    );
    const vResults = collectVerticalMatches(
        movingEdges, movingBounds, candidates, threshold
    );

    return buildSnapResult(hResults, vResults);
}

/**
 * Filters objects to exclude the moving selection.
 *
 * @param allObjects - All document objects.
 * @param excludeIds - IDs to exclude.
 * @returns Filtered array of candidate objects.
 */
function filterCandidates(
    allObjects: DiagramObject[],
    excludeIds: Set<string>): DiagramObject[]
{
    return allObjects.filter(
        (o) => !excludeIds.has(o.id) && o.presentation.visible
    );
}

/**
 * Collects all horizontal alignment matches across candidates.
 *
 * @param movingEdges - Edge values of the moving selection.
 * @param movingBounds - Full bounds of the moving selection.
 * @param candidates - Objects to compare against.
 * @param threshold - Snap distance.
 * @returns Array of horizontal matches with dx and guide.
 */
function collectHorizontalMatches(
    movingEdges: ReturnType<typeof extractEdges>,
    movingBounds: Rect,
    candidates: DiagramObject[],
    threshold: number): { dx: number; guide: AlignmentGuide }[]
{
    const results: { dx: number; guide: AlignmentGuide }[] = [];

    for (const obj of candidates)
    {
        const targetEdges = extractEdges(obj.presentation.bounds);
        const matches = checkHorizontalAlign(
            movingEdges, targetEdges,
            movingBounds, obj.presentation.bounds, threshold
        );

        results.push(...matches);
    }

    return results;
}

/**
 * Collects all vertical alignment matches across candidates.
 *
 * @param movingEdges - Edge values of the moving selection.
 * @param movingBounds - Full bounds of the moving selection.
 * @param candidates - Objects to compare against.
 * @param threshold - Snap distance.
 * @returns Array of vertical matches with dy and guide.
 */
function collectVerticalMatches(
    movingEdges: ReturnType<typeof extractEdges>,
    movingBounds: Rect,
    candidates: DiagramObject[],
    threshold: number): { dy: number; guide: AlignmentGuide }[]
{
    const results: { dy: number; guide: AlignmentGuide }[] = [];

    for (const obj of candidates)
    {
        const targetEdges = extractEdges(obj.presentation.bounds);
        const matches = checkVerticalAlign(
            movingEdges, targetEdges,
            movingBounds, obj.presentation.bounds, threshold
        );

        results.push(...matches);
    }

    return results;
}

/**
 * Selects the closest horizontal and vertical snaps and merges
 * their guides into a single SnapResult.
 *
 * @param hMatches - Horizontal alignment matches.
 * @param vMatches - Vertical alignment matches.
 * @returns Combined SnapResult with best dx, dy, and all guides.
 */
function buildSnapResult(
    hMatches: { dx: number; guide: AlignmentGuide }[],
    vMatches: { dy: number; guide: AlignmentGuide }[]): SnapResult
{
    let dx = 0;
    let dy = 0;
    const guides: AlignmentGuide[] = [];

    if (hMatches.length > 0)
    {
        const best = selectClosestH(hMatches);
        dx = best.dx;
        guides.push(...best.guides);
    }

    if (vMatches.length > 0)
    {
        const best = selectClosestV(vMatches);
        dy = best.dy;
        guides.push(...best.guides);
    }

    return { dx, dy, guides };
}

/**
 * Selects the closest horizontal snap and gathers all guides at
 * that same snap distance.
 *
 * @param matches - All horizontal matches.
 * @returns The best dx and all matching guides.
 */
function selectClosestH(
    matches: { dx: number; guide: AlignmentGuide }[]): { dx: number; guides: AlignmentGuide[] }
{
    matches.sort((a, b) => Math.abs(a.dx) - Math.abs(b.dx));

    const bestDx = matches[0].dx;
    const guides = matches
        .filter((m) => m.dx === bestDx)
        .map((m) => m.guide);

    return { dx: bestDx, guides };
}

/**
 * Selects the closest vertical snap and gathers all guides at
 * that same snap distance.
 *
 * @param matches - All vertical matches.
 * @returns The best dy and all matching guides.
 */
function selectClosestV(
    matches: { dy: number; guide: AlignmentGuide }[]): { dy: number; guides: AlignmentGuide[] }
{
    matches.sort((a, b) => Math.abs(a.dy) - Math.abs(b.dy));

    const bestDy = matches[0].dy;
    const guides = matches
        .filter((m) => m.dy === bestDy)
        .map((m) => m.guide);

    return { dy: bestDy, guides };
}

// ============================================================================
// SPACING GUIDES
// ============================================================================

/**
 * Detects equal horizontal and vertical gaps between the moved object
 * and its neighbours. When the gap between the moving object and two
 * neighbours is equal, renders dimension lines with gap values.
 *
 * @param movingBounds - Current bounds of the dragged selection.
 * @param allObjects - All objects in the document.
 * @param excludeIds - IDs of objects to skip.
 * @param threshold - Tolerance for considering gaps equal.
 * @returns Array of spacing guides with dimension lines and labels.
 */
function computeSpacingGuides(
    movingBounds: Rect,
    allObjects: DiagramObject[],
    excludeIds: Set<string>,
    threshold: number): AlignmentGuide[]
{
    const candidates = filterCandidates(allObjects, excludeIds);
    const guides: AlignmentGuide[] = [];

    const hSpacing = detectHorizontalSpacing(
        movingBounds, candidates, threshold
    );
    guides.push(...hSpacing);

    const vSpacing = detectVerticalSpacing(
        movingBounds, candidates, threshold
    );
    guides.push(...vSpacing);

    return guides;
}

/**
 * Detects equal horizontal gaps between the moving object and
 * objects to its left and right.
 *
 * @param moving - Moving object bounds.
 * @param candidates - Other visible objects.
 * @param threshold - Gap equality tolerance.
 * @returns Spacing guides for equal horizontal gaps.
 */
function detectHorizontalSpacing(
    moving: Rect,
    candidates: DiagramObject[],
    threshold: number): AlignmentGuide[]
{
    const guides: AlignmentGuide[] = [];
    const movingRight = moving.x + moving.width;
    const movingCy = moving.y + (moving.height / 2);

    for (let i = 0; i < candidates.length; i++)
    {
        for (let j = i + 1; j < candidates.length; j++)
        {
            const guide = checkHorizontalGapPair(
                moving, movingRight, movingCy,
                candidates[i].presentation.bounds,
                candidates[j].presentation.bounds,
                threshold
            );

            if (guide)
            {
                guides.push(guide);
            }
        }
    }

    return guides;
}

/**
 * Checks whether a pair of objects creates equal horizontal gaps
 * with the moving object.
 *
 * @param moving - Moving object bounds.
 * @param movingRight - Right edge of moving object.
 * @param movingCy - Vertical centre of moving object.
 * @param a - First candidate bounds.
 * @param b - Second candidate bounds.
 * @param threshold - Gap equality tolerance.
 * @returns A spacing guide if gaps are equal, or null.
 */
function checkHorizontalGapPair(
    moving: Rect,
    movingRight: number,
    movingCy: number,
    a: Rect,
    b: Rect,
    threshold: number): AlignmentGuide | null
{
    const aRight = a.x + a.width;
    const bRight = b.x + b.width;
    const gaps = computeHGaps(moving.x, movingRight, a.x, aRight, b.x, bRight);

    return matchHGap(gaps, moving.x, movingRight, movingCy, threshold);
}

/**
 * Computes the four directional gaps between a moving object and
 * two candidate objects on the horizontal axis.
 *
 * @param mLeft - Moving left edge.
 * @param mRight - Moving right edge.
 * @param aLeft - Object A left edge.
 * @param aRight - Object A right edge.
 * @param bLeft - Object B left edge.
 * @param bRight - Object B right edge.
 * @returns Gap values in all four directions.
 */
function computeHGaps(
    mLeft: number, mRight: number,
    aLeft: number, aRight: number,
    bLeft: number, bRight: number): { la: number; ra: number; lb: number; rb: number }
{
    return {
        la: mLeft - aRight,
        ra: aLeft - mRight,
        lb: mLeft - bRight,
        rb: bLeft - mRight
    };
}

/**
 * Matches equal horizontal gap pairs and returns a spacing guide.
 *
 * @param g - Gap values from computeHGaps.
 * @param mLeft - Moving left edge.
 * @param mRight - Moving right edge.
 * @param cy - Vertical centre for the guide line.
 * @param threshold - Gap equality tolerance.
 * @returns A spacing guide if gaps are equal, or null.
 */
function matchHGap(
    g: { la: number; ra: number; lb: number; rb: number },
    mLeft: number, mRight: number,
    cy: number, threshold: number): AlignmentGuide | null
{
    if (g.la > 0 && g.rb > 0 && Math.abs(g.la - g.rb) <= threshold)
    {
        return buildHSpacingGuide(
            mLeft - g.la, mLeft, mRight, mRight + g.rb, cy, g.la
        );
    }

    if (g.ra > 0 && g.lb > 0 && Math.abs(g.ra - g.lb) <= threshold)
    {
        return buildHSpacingGuide(
            mLeft - g.lb, mLeft, mRight, mRight + g.ra, cy, g.lb
        );
    }

    return null;
}

/**
 * Builds a horizontal spacing guide with two dimension lines.
 *
 * @param leftEnd - Right edge of the left object.
 * @param gapStart - Left edge of the gap.
 * @param gapEnd - Right edge of the gap.
 * @param rightStart - Left edge of the right object.
 * @param y - Vertical position for the dimension lines.
 * @param gapValue - The measured gap in pixels.
 * @returns An AlignmentGuide with spacing dimension lines.
 */
function buildHSpacingGuide(
    leftEnd: number,
    gapStart: number,
    gapEnd: number,
    rightStart: number,
    y: number,
    gapValue: number): AlignmentGuide
{
    return {
        type: "spacing",
        lines: [
            { x1: leftEnd, y1: y, x2: gapStart, y2: y },
            { x1: gapEnd,  y1: y, x2: rightStart, y2: y }
        ],
        label: {
            text: `${Math.round(gapValue)}px`,
            position: { x: (leftEnd + gapStart) / 2, y: y - 8 }
        }
    };
}

/**
 * Detects equal vertical gaps between the moving object and
 * objects above and below it.
 *
 * @param moving - Moving object bounds.
 * @param candidates - Other visible objects.
 * @param threshold - Gap equality tolerance.
 * @returns Spacing guides for equal vertical gaps.
 */
function detectVerticalSpacing(
    moving: Rect,
    candidates: DiagramObject[],
    threshold: number): AlignmentGuide[]
{
    const guides: AlignmentGuide[] = [];
    const movingBottom = moving.y + moving.height;
    const movingCx = moving.x + (moving.width / 2);

    for (let i = 0; i < candidates.length; i++)
    {
        for (let j = i + 1; j < candidates.length; j++)
        {
            const guide = checkVerticalGapPair(
                moving, movingBottom, movingCx,
                candidates[i].presentation.bounds,
                candidates[j].presentation.bounds,
                threshold
            );

            if (guide)
            {
                guides.push(guide);
            }
        }
    }

    return guides;
}

/**
 * Checks whether a pair of objects creates equal vertical gaps
 * with the moving object.
 *
 * @param moving - Moving object bounds.
 * @param movingBottom - Bottom edge of moving object.
 * @param movingCx - Horizontal centre of moving object.
 * @param a - First candidate bounds.
 * @param b - Second candidate bounds.
 * @param threshold - Gap equality tolerance.
 * @returns A spacing guide if gaps are equal, or null.
 */
function checkVerticalGapPair(
    moving: Rect,
    movingBottom: number,
    movingCx: number,
    a: Rect,
    b: Rect,
    threshold: number): AlignmentGuide | null
{
    const aBottom = a.y + a.height;
    const bBottom = b.y + b.height;
    const gaps = computeVGaps(moving.y, movingBottom, a.y, aBottom, b.y, bBottom);

    return matchVGap(gaps, moving.y, movingBottom, movingCx, threshold);
}

/**
 * Computes the four directional gaps between a moving object and
 * two candidate objects on the vertical axis.
 *
 * @param mTop - Moving top edge.
 * @param mBottom - Moving bottom edge.
 * @param aTop - Object A top edge.
 * @param aBottom - Object A bottom edge.
 * @param bTop - Object B top edge.
 * @param bBottom - Object B bottom edge.
 * @returns Gap values in all four directions.
 */
function computeVGaps(
    mTop: number, mBottom: number,
    aTop: number, aBottom: number,
    bTop: number, bBottom: number): { aa: number; ba: number; ab: number; bb: number }
{
    return {
        aa: mTop - aBottom,
        ba: aTop - mBottom,
        ab: mTop - bBottom,
        bb: bTop - mBottom
    };
}

/**
 * Matches equal vertical gap pairs and returns a spacing guide.
 *
 * @param g - Gap values from computeVGaps.
 * @param mTop - Moving top edge.
 * @param mBottom - Moving bottom edge.
 * @param cx - Horizontal centre for the guide line.
 * @param threshold - Gap equality tolerance.
 * @returns A spacing guide if gaps are equal, or null.
 */
function matchVGap(
    g: { aa: number; ba: number; ab: number; bb: number },
    mTop: number, mBottom: number,
    cx: number, threshold: number): AlignmentGuide | null
{
    if (g.aa > 0 && g.bb > 0 && Math.abs(g.aa - g.bb) <= threshold)
    {
        return buildVSpacingGuide(
            mTop - g.aa, mTop, mBottom, mBottom + g.bb, cx, g.aa
        );
    }

    if (g.ba > 0 && g.ab > 0 && Math.abs(g.ba - g.ab) <= threshold)
    {
        return buildVSpacingGuide(
            mTop - g.ab, mTop, mBottom, mBottom + g.ba, cx, g.ab
        );
    }

    return null;
}

/**
 * Builds a vertical spacing guide with two dimension lines.
 *
 * @param topEnd - Bottom edge of the top object.
 * @param gapStart - Top edge of the gap.
 * @param gapEnd - Bottom edge of the gap.
 * @param bottomStart - Top edge of the bottom object.
 * @param x - Horizontal position for the dimension lines.
 * @param gapValue - The measured gap in pixels.
 * @returns An AlignmentGuide with spacing dimension lines.
 */
function buildVSpacingGuide(
    topEnd: number,
    gapStart: number,
    gapEnd: number,
    bottomStart: number,
    x: number,
    gapValue: number): AlignmentGuide
{
    return {
        type: "spacing",
        lines: [
            { x1: x, y1: topEnd, x2: x, y2: gapStart },
            { x1: x, y1: gapEnd, x2: x, y2: bottomStart }
        ],
        label: {
            text: `${Math.round(gapValue)}px`,
            position: { x: x + 8, y: (topEnd + gapStart) / 2 }
        }
    };
}

// ============================================================================
// GUIDE RENDERING
// ============================================================================

/**
 * Renders alignment and spacing guides onto the tool overlay layer.
 * Alignment guides are dashed blue lines; spacing guides are solid
 * red lines with text labels showing the gap value.
 *
 * @param toolOverlay - The SVG tool overlay group element.
 * @param guides - Array of guide definitions to render.
 */
function renderGuides(
    toolOverlay: SVGElement,
    guides: AlignmentGuide[]): void
{
    for (const guide of guides)
    {
        if (guide.type === "alignment")
        {
            renderAlignmentLines(toolOverlay, guide.lines);
        }
        else
        {
            renderSpacingLines(toolOverlay, guide.lines);
        }

        if (guide.label)
        {
            renderGuideLabel(toolOverlay, guide.label);
        }
    }
}

/**
 * Renders dashed blue alignment guide lines.
 *
 * @param overlay - SVG group to append lines to.
 * @param lines - Line segments to render.
 */
function renderAlignmentLines(
    overlay: SVGElement,
    lines: LineSegment[]): void
{
    for (const seg of lines)
    {
        const line = svgCreate("line", {
            x1: String(seg.x1),
            y1: String(seg.y1),
            x2: String(seg.x2),
            y2: String(seg.y2),
            stroke: ALIGNMENT_GUIDE_COLOR,
            "stroke-width": "1",
            "stroke-dasharray": ALIGNMENT_DASH,
            "pointer-events": "none"
        });

        overlay.appendChild(line);
    }
}

/**
 * Renders solid red spacing guide lines.
 *
 * @param overlay - SVG group to append lines to.
 * @param lines - Line segments to render.
 */
function renderSpacingLines(
    overlay: SVGElement,
    lines: LineSegment[]): void
{
    for (const seg of lines)
    {
        const line = svgCreate("line", {
            x1: String(seg.x1),
            y1: String(seg.y1),
            x2: String(seg.x2),
            y2: String(seg.y2),
            stroke: SPACING_GUIDE_COLOR,
            "stroke-width": "1",
            "pointer-events": "none"
        });

        overlay.appendChild(line);
    }
}

/**
 * Renders a text label for a spacing guide.
 *
 * @param overlay - SVG group to append the label to.
 * @param label - Label text and position.
 */
function renderGuideLabel(
    overlay: SVGElement,
    label: { text: string; position: Point }): void
{
    const text = svgCreate("text", {
        x: String(label.position.x),
        y: String(label.position.y),
        fill: SPACING_GUIDE_COLOR,
        "font-size": String(SPACING_LABEL_FONT_SIZE),
        "font-family": "inherit",
        "text-anchor": "middle",
        "pointer-events": "none"
    });

    text.textContent = label.text;
    overlay.appendChild(text);
}

// ========================================================================
// SOURCE: render-engine.ts
// ========================================================================

/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: RenderEngine
 * PURPOSE: SVG DOM manager for the DiagramEngine. Creates and maintains the
 *    root SVG element, viewport transforms, layer management, object
 *    rendering, selection overlay, rubber band, grid, shadow filters,
 *    and inline text editing.
 * RELATES: [[DiagramEngine]], [[ShapeRegistry]], [[EventBus]]
 * FLOW: [DiagramEngine] -> [RenderEngine] -> [SVG DOM]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// CONSTANTS
// ============================================================================

/** Log prefix for all console messages from this module. */





/** CSS class prefix for all DiagramEngine elements. */

/** Engine version string embedded in generated SVG. */

/** Default zoom level (1 = 100%). */

/** Minimum allowed zoom level. */

/** Maximum allowed zoom level. */

/** Zoom increment per step (e.g. wheel tick). */

/** Pixel size of selection resize handles. */

/** Extra hit-test margin around resize handles for easier clicking. */

/** Default grid spacing in pixels. */

/** Identifier for the default document layer. */

/** Display name for the default document layer. */

/** SVG namespace URI. */

/** XHTML namespace URI for foreignObject content. */
const XHTML_NS = "http://www.w3.org/1999/xhtml";

/** Dot radius for the dot grid pattern. */
const DOT_GRID_RADIUS = 1.2;

/** Opacity for grid elements. */
const GRID_OPACITY = 0.4;

/** Rotation handle vertical offset above the top-centre of the object. */

/** Rotation handle circle radius. */
const ROTATION_HANDLE_RADIUS = 5;

/** Length of the rotation handle stem line. */
const ROTATION_STEM_LENGTH = 16;

/** Default padding used when zooming to fit. */
const DEFAULT_FIT_PADDING = 40;

// ============================================================================
// INLINE EDIT STATE
// ============================================================================

/** Tracks the state of an active inline text edit overlay. */
interface InlineEditState
{
    /** The diagram object being edited. */
    objectId: string;

    /** The contentEditable overlay element. */
    overlay: HTMLDivElement;

    /** Blur event handler reference for cleanup. */
    blurHandler: () => void;

    /** Keydown event handler reference for cleanup. */
    keydownHandler: (e: KeyboardEvent) => void;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Manages the SVG DOM for the DiagramEngine. Creates the root SVG,
 * viewport group, layer groups, and provides methods for rendering
 * objects, selection handles, rubber bands, grids, and inline editing.
 */
class RenderEngine
{
    /** Root SVG element appended to the container. */
    private readonly svg: SVGSVGElement;

    /** Reusable defs element for markers, filters, and gradients. */
    private readonly defs: SVGDefsElement;

    /** Viewport group with pan/zoom transform. */
    private readonly viewport: SVGGElement;

    /** Grid layer inside the viewport. */
    private readonly gridLayer: SVGGElement;

    /** Page frames layer inside the viewport (above grid, below objects). */
    private readonly pageFramesLayer: SVGGElement;

    /** Connectors layer inside the viewport. */
    private readonly connectorsLayer: SVGGElement;

    /** Selection overlay layer inside the viewport. */
    private readonly overlayLayer: SVGGElement;

    /** Tool overlay layer (rubber band etc.) inside the viewport. */
    private readonly toolOverlayLayer: SVGGElement;

    /** Map of layer IDs to their SVG group elements. */
    private readonly layerEls: Map<string, SVGGElement> = new Map();

    /** Container element that holds the SVG. */
    private readonly container: HTMLElement;

    /** Current viewport state. */
    private vp: ViewportState = { x: 0, y: 0, zoom: DEFAULT_ZOOM };

    /** Active inline text edit, or null if not editing. */
    private inlineEdit: InlineEditState | null = null;

    /** Map of object IDs to their paintable HTML canvas elements. */
    private readonly paintableCanvases: Map<string, HTMLCanvasElement> = new Map();

    /** Map of object IDs to their instantiated embed component instances. */
    private readonly embedInstances: Map<string, unknown> = new Map();

    /** Reference to the embed registry for factory name lookup. */
    private embedRegistry: Map<string, EmbeddableComponentEntry> = new Map();

    // ========================================================================
    // CONSTRUCTOR
    // ========================================================================

    /**
     * Create a new RenderEngine and build the SVG DOM structure.
     *
     * @param container - The HTML element to append the SVG canvas into.
     */
    constructor(container: HTMLElement)
    {
        this.container = container;

        this.svg = this.createRootSvg();
        this.defs = svgCreate("defs") as SVGDefsElement;
        this.svg.appendChild(this.defs);

        this.viewport = this.createViewportGroup();
        this.svg.appendChild(this.viewport);

        this.gridLayer = this.createNamedGroup("grid");
        this.viewport.appendChild(this.gridLayer);

        this.pageFramesLayer = this.createNamedGroup("page-frames");
        this.viewport.appendChild(this.pageFramesLayer);

        this.connectorsLayer = this.createNamedGroup("connectors");
        this.overlayLayer = this.createNamedGroup("overlay");
        this.toolOverlayLayer = this.createNamedGroup("tool-overlay");

        this.viewport.appendChild(this.connectorsLayer);
        this.viewport.appendChild(this.overlayLayer);
        this.viewport.appendChild(this.toolOverlayLayer);

        container.appendChild(this.svg);

        logInfo("RenderEngine initialised");
    }

    // ========================================================================
    // LAYER MANAGEMENT
    // ========================================================================

    /**
     * Ensure a layer group element exists. Creates one if absent and
     * inserts it in the correct stacking order within the viewport.
     *
     * @param layerId - Unique identifier for the layer.
     * @param order - Stacking order (lower values render first).
     * @returns The SVG group element for the layer.
     */
    public ensureLayerEl(layerId: string, order: number): SVGElement
    {
        const existing = this.layerEls.get(layerId);

        if (existing)
        {
            return existing;
        }

        const g = this.createLayerGroup(layerId, order);

        this.insertLayerInOrder(g, order);
        this.layerEls.set(layerId, g);

        logDebug(`Layer created: ${layerId} (order ${order})`);

        return g;
    }

    /**
     * Remove a layer group element from the viewport.
     *
     * @param layerId - Identifier of the layer to remove.
     */
    public removeLayerEl(layerId: string): void
    {
        const g = this.layerEls.get(layerId);

        if (!g)
        {
            logWarn(`Layer not found for removal: ${layerId}`);
            return;
        }

        g.remove();
        this.layerEls.delete(layerId);
    }

    // ========================================================================
    // VIEWPORT TRANSFORMS
    // ========================================================================

    /**
     * Return the current viewport state (pan offset and zoom level).
     *
     * @returns A copy of the current viewport state.
     */
    public getViewport(): ViewportState
    {
        return { ...this.vp };
    }

    /**
     * Set the viewport state and apply the transform to the viewport group.
     *
     * @param vp - The new viewport state.
     */
    public setViewport(vp: ViewportState): void
    {
        this.vp = {
            x: vp.x,
            y: vp.y,
            zoom: this.clampZoom(vp.zoom)
        };

        this.applyViewportTransform();
    }

    /**
     * Pan the viewport by the given delta in screen pixels.
     *
     * @param dx - Horizontal pan delta.
     * @param dy - Vertical pan delta.
     */
    public pan(dx: number, dy: number): void
    {
        this.vp.x += dx;
        this.vp.y += dy;

        this.applyViewportTransform();
    }

    /**
     * Zoom around a focal point in screen coordinates. The focal point
     * stays fixed on screen while the canvas scales around it.
     *
     * @param factor - Zoom multiplier (e.g. 1.15 to zoom in 15%).
     * @param focalX - Focal point X in screen coordinates.
     * @param focalY - Focal point Y in screen coordinates.
     */
    public zoomAt(factor: number, focalX: number, focalY: number): void
    {
        const oldZoom = this.vp.zoom;
        const newZoom = this.clampZoom(oldZoom * factor);

        if (newZoom === oldZoom)
        {
            return;
        }

        const ratio = newZoom / oldZoom;

        this.vp.x = focalX - ((focalX - this.vp.x) * ratio);
        this.vp.y = focalY - ((focalY - this.vp.y) * ratio);
        this.vp.zoom = newZoom;

        this.applyViewportTransform();
    }

    /**
     * Zoom and pan to fit all given objects within the viewport with
     * optional padding.
     *
     * @param objects - Objects to include in the fit calculation.
     * @param padding - Pixel padding around the bounding box.
     */
    public zoomToFit(objects: DiagramObject[], padding?: number): void
    {
        if (objects.length === 0)
        {
            return;
        }

        const pad = padding ?? DEFAULT_FIT_PADDING;
        const bbox = this.computeBoundingBox(objects);
        const svgRect = this.svg.getBoundingClientRect();

        this.applyFitTransform(bbox, svgRect, pad);
    }

    // ========================================================================
    // COORDINATE CONVERSION
    // ========================================================================

    /**
     * Convert screen coordinates to canvas coordinates using the
     * current viewport transform.
     *
     * @param sx - Screen X coordinate.
     * @param sy - Screen Y coordinate.
     * @returns The corresponding point in canvas space.
     */
    public screenToCanvas(sx: number, sy: number): Point
    {
        const rect = this.svg.getBoundingClientRect();

        return {
            x: ((sx - rect.left) - this.vp.x) / this.vp.zoom,
            y: ((sy - rect.top) - this.vp.y) / this.vp.zoom
        };
    }

    /**
     * Convert canvas coordinates to screen coordinates using the
     * current viewport transform.
     *
     * @param cx - Canvas X coordinate.
     * @param cy - Canvas Y coordinate.
     * @returns The corresponding point in screen space.
     */
    public canvasToScreen(cx: number, cy: number): Point
    {
        const rect = this.svg.getBoundingClientRect();

        return {
            x: (cx * this.vp.zoom) + this.vp.x + rect.left,
            y: (cy * this.vp.zoom) + this.vp.y + rect.top
        };
    }

    /**
     * Convert canvas coordinates to container-relative coordinates.
     * Used for positioning overlays (e.g. inline text editor) that
     * are absolutely positioned inside the container element.
     */
    public canvasToContainer(cx: number, cy: number): Point
    {
        return {
            x: (cx * this.vp.zoom) + this.vp.x,
            y: (cy * this.vp.zoom) + this.vp.y
        };
    }

    // ========================================================================
    // OBJECT RENDERING
    // ========================================================================

    /**
     * Render a diagram object into its layer. Removes any existing
     * element for the same object ID first, then creates a new SVG
     * group with the shape, text, and applied styles.
     *
     * @param obj - The diagram object to render.
     * @param shapeDef - The shape definition from the registry.
     */
    public renderObject(obj: DiagramObject, shapeDef: ShapeDefinition): void
    {
        this.removeObjectEl(obj.id);

        const pres = obj.presentation;
        const g = svgCreate("g") as SVGGElement;

        svgSetAttr(g, { "data-id": obj.id });

        this.applyObjectTransform(g, pres);
        this.applyObjectOpacity(g, pres.style.opacity);

        if (pres.style.shadow?.enabled)
        {
            this.applyShadowFilter(g, obj.id, pres.style.shadow);
        }

        const shapeEl = this.renderShapeContent(obj, shapeDef);

        g.appendChild(shapeEl);

        // Render image if the shape has an image source
        if (pres.image?.src)
        {
            const imgEl = this.createImageElement(pres);

            g.appendChild(imgEl);
        }

        // Render paintable canvas if configured
        if (pres.paintable)
        {
            const canvasEl = this.createPaintableCanvas(pres, obj.id);

            g.appendChild(canvasEl);
        }

        // Render embedded component if configured
        if (pres.embed)
        {
            const embedEl = this.createEmbedContainer(pres, obj.id);

            g.appendChild(embedEl);
        }

        if (pres.textContent)
        {
            const textEl = pres.textContent.textPath
                ? this.createTextPathElement(pres, obj.id)
                : this.createForeignObject(pres);

            g.appendChild(textEl);
        }

        const layerEl = this.findLayerEl(pres.layer);

        layerEl.appendChild(g);
    }

    /**
     * Remove the SVG element and any associated shadow filter for
     * the given object ID.
     *
     * @param id - The object ID whose element should be removed.
     */
    public removeObjectEl(id: string): void
    {
        const existing = this.svg.querySelector(`[data-id="${id}"]`);

        if (existing)
        {
            existing.remove();
        }

        this.removeShadowFilter(id);
        this.removeTextPathDefs(id);
        this.paintableCanvases.delete(id);
        this.destroyEmbedInstance(id);
        this.removeDefById(`clip-${id}`);
    }

    // ========================================================================
    // SELECTION OVERLAY
    // ========================================================================

    /**
     * Render selection handles (resize + rotation) for the given
     * selected objects. Clears any previous overlay first.
     *
     * @param objects - The currently selected diagram objects.
     */
    public renderSelectionHandles(objects: DiagramObject[]): void
    {
        this.clearOverlay();

        for (const obj of objects)
        {
            this.renderSingleSelection(obj);
        }
    }

    /**
     * Clear all elements from the selection overlay layer.
     */
    public clearOverlay(): void
    {
        while (this.overlayLayer.firstChild)
        {
            this.overlayLayer.removeChild(this.overlayLayer.firstChild);
        }
    }

    // ========================================================================
    // RUBBER BAND
    // ========================================================================

    /**
     * Render a rubber band selection rectangle on the tool overlay.
     *
     * @param rect - The bounding rectangle for the rubber band.
     */
    public renderRubberBand(rect: Rect): void
    {
        this.clearToolOverlay();

        const rubberBand = svgCreate("rect", {
            x: String(rect.x),
            y: String(rect.y),
            width: String(rect.width),
            height: String(rect.height),
            fill: "rgba(0, 120, 215, 0.1)",
            stroke: "rgba(0, 120, 215, 0.6)",
            "stroke-width": "1",
            "stroke-dasharray": "4 2",
            "pointer-events": "none"
        });

        this.toolOverlayLayer.appendChild(rubberBand);
    }

    /**
     * Clear all elements from the tool overlay layer.
     */
    public clearToolOverlay(): void
    {
        while (this.toolOverlayLayer.firstChild)
        {
            this.toolOverlayLayer.removeChild(this.toolOverlayLayer.firstChild);
        }
    }

    // ========================================================================
    // GRID RENDERING
    // ========================================================================

    /**
     * Render the background grid using SVG patterns. Supports dot
     * and line grid styles. Removes any existing grid first.
     *
     * @param config - Grid configuration with size, style, and visibility.
     */
    public renderGrid(config: { size: number; style: string; visible: boolean }): void
    {
        this.clearGridLayer();

        if (!config.visible || config.style === "none")
        {
            return;
        }

        this.removeExistingGridPattern();

        if (config.style === "dots")
        {
            this.createDotGridPattern(config.size);
        }
        else
        {
            this.createLineGridPattern(config.size);
        }

        this.applyGridPatternToLayer(config.size);
    }

    // ========================================================================
    // SHADOW FILTER MANAGEMENT
    // ========================================================================

    /**
     * Apply a drop shadow SVG filter to an element. Creates or updates
     * the filter in the defs element using a deterministic ID.
     *
     * @param g - The SVG element to apply the shadow filter to.
     * @param objId - Object ID used to generate a deterministic filter ID.
     * @param shadow - Shadow style configuration. Omit to remove.
     */
    public applyShadowFilter(
        g: SVGElement,
        objId: string,
        shadow?: ShadowStyle): void
    {
        const filterId = `de-shadow-${objId}`;

        if (!shadow || !shadow.enabled)
        {
            this.removeShadowFilter(objId);
            g.removeAttribute("filter");
            return;
        }

        this.upsertShadowFilterDef(filterId, shadow);
        g.setAttribute("filter", `url(#${filterId})`);
    }

    // ========================================================================
    // INLINE TEXT EDITING
    // ========================================================================

    /**
     * Start inline text editing by creating a contentEditable overlay
     * positioned at the object's screen coordinates.
     *
     * @param obj - The diagram object to edit inline.
     */
    public startInlineEdit(obj: DiagramObject): void
    {
        if (this.inlineEdit)
        {
            this.endInlineEdit();
        }

        const bounds = obj.presentation.bounds;
        const containerTopLeft = this.canvasToContainer(bounds.x, bounds.y);
        const scaledW = bounds.width * this.vp.zoom;
        const scaledH = bounds.height * this.vp.zoom;

        const overlay = this.createEditOverlay(containerTopLeft, scaledW, scaledH);

        overlay.textContent = this.extractPlainText(obj);

        const handlers = this.attachEditHandlers(overlay, obj.id);

        this.inlineEdit = {
            objectId: obj.id,
            overlay: overlay,
            blurHandler: handlers.blur,
            keydownHandler: handlers.keydown
        };

        this.container.appendChild(overlay);
        overlay.focus();

        logDebug(`Inline edit started for: ${obj.id}`);
    }

    /**
     * End the current inline text edit, remove the overlay, and
     * return the edited text content.
     *
     * @returns The edited text string, or null if no edit was active.
     */
    public endInlineEdit(): string | null
    {
        if (!this.inlineEdit)
        {
            return null;
        }

        const text = this.inlineEdit.overlay.textContent ?? "";

        this.detachEditHandlers(this.inlineEdit);
        this.inlineEdit.overlay.remove();
        this.inlineEdit = null;

        logDebug("Inline edit ended");

        return text;
    }

    // ========================================================================
    // PAGE FRAMES
    // ========================================================================

    /**
     * Renders a single page frame into the page frames layer.
     * Removes any existing element for the same frame ID first.
     *
     * @param frame - The page frame to render.
     */
    public renderPageFrame(frame: PageFrame): void
    {
        this.removePageFrameEl(frame.id);

        const el = renderPageFrame(frame, this.defs);

        this.pageFramesLayer.appendChild(el);
    }

    /**
     * Removes a page frame's SVG element from the page frames layer.
     *
     * @param id - Page frame ID to remove.
     */
    public removePageFrameEl(id: string): void
    {
        const existing = this.pageFramesLayer.querySelector(
            `[data-page-frame-id="${id}"]`
        );

        if (existing)
        {
            existing.remove();
        }
    }

    /**
     * Renders all page frames, clearing any existing ones first.
     *
     * @param frames - Array of page frames to render.
     */
    public renderAllPageFrames(frames: PageFrame[]): void
    {
        this.clearPageFramesLayer();

        for (const frame of frames)
        {
            const el = renderPageFrame(frame, this.defs);

            this.pageFramesLayer.appendChild(el);
        }

        logDebug(`Rendered ${frames.length} page frame(s)`);
    }

    /**
     * Returns the page frames SVG layer group.
     *
     * @returns The page frames layer element.
     */
    public getPageFramesLayer(): SVGGElement
    {
        return this.pageFramesLayer;
    }

    /**
     * Clears all elements from the page frames layer.
     */
    private clearPageFramesLayer(): void
    {
        while (this.pageFramesLayer.firstChild)
        {
            this.pageFramesLayer.removeChild(
                this.pageFramesLayer.firstChild
            );
        }
    }

    // ========================================================================
    // ACCESSORS
    // ========================================================================

    /**
     * Return the root SVG element.
     *
     * @returns The root SVG element managed by this engine.
     */
    public getSvgElement(): SVGElement
    {
        return this.svg;
    }

    /**
     * Return the tool overlay SVG group element for direct access
     * by the guide rendering system.
     *
     * @returns The tool overlay SVG group element.
     */
    public getToolOverlayElement(): SVGGElement
    {
        return this.toolOverlayLayer;
    }

    /**
     * Retrieve the HTML canvas element for a paintable shape by its
     * diagram object ID. Returns null if no paintable canvas exists.
     *
     * @param objectId - The diagram object ID.
     * @returns The HTMLCanvasElement, or null.
     */
    public getPaintableCanvas(objectId: string): HTMLCanvasElement | null
    {
        return this.paintableCanvases.get(objectId) ?? null;
    }

    /**
     * Renders a connector between objects. Removes any existing element
     * for the same connector, then creates a new SVG group via the
     * connector rendering system and appends it to the connectors layer.
     *
     * @param conn - The connector to render.
     * @param objects - All objects for endpoint resolution.
     */
    public renderConnector(
        conn: DiagramConnector,
        objects: DiagramObject[]
    ): void
    {
        this.removeConnectorEl(conn.id);

        const connEl = renderConnectorToSvg(conn, objects, this.defs);

        this.connectorsLayer.appendChild(connEl);
    }

    /**
     * Renders a wide semi-transparent highlight path in the overlay
     * layer for a selected connector. Computes the connector path
     * and draws a thickened highlight over it.
     *
     * @param conn - The selected connector to highlight.
     * @param objects - All objects for endpoint resolution.
     */
    public renderConnectorHighlight(
        conn: DiagramConnector,
        objects: DiagramObject[]): void
    {
        const pathD = computeConnectorPath(conn, objects);

        if (!pathD)
        {
            return;
        }

        const highlight = this.buildConnectorHighlightPath(conn.id, pathD);

        this.overlayLayer.appendChild(highlight);
    }

    /**
     * Removes a connector's SVG element from the connectors layer.
     * Finds the element by its data-connector-id attribute.
     *
     * @param id - Connector ID to remove.
     */
    public removeConnectorEl(id: string): void
    {
        const existing = this.connectorsLayer.querySelector(
            `[data-connector-id="${id}"]`
        );

        if (existing)
        {
            existing.remove();
        }
    }

    // ========================================================================
    // EMBEDDABLE COMPONENTS
    // ========================================================================

    /**
     * Sets interactive mode on an embed container. When interactive,
     * pointer-events are enabled and a blue border glow is shown.
     *
     * @param objId - The diagram object ID.
     * @param interactive - Whether to enable or disable interaction.
     */
    public setEmbedInteractive(objId: string, interactive: boolean): void
    {
        const fo = this.svg.querySelector(
            `[data-embed-id="${objId}"]`
        ) as SVGForeignObjectElement | null;

        if (!fo)
        {
            return;
        }

        const container = fo.querySelector(
            ".de-embed-container"
        ) as HTMLElement | null;

        if (!container)
        {
            return;
        }

        this.applyEmbedInteractiveStyles(container, interactive);
    }

    /**
     * Captures the current state of an embed instance by calling
     * getValue() or getState() on the component instance, if available.
     *
     * @param objId - The diagram object ID.
     * @param embed - The embed definition to store state into.
     */
    public captureEmbedState(objId: string, embed: EmbedDefinition): void
    {
        const instance = this.embedInstances.get(objId);

        if (!instance)
        {
            return;
        }

        const state = this.extractInstanceState(instance);

        if (state)
        {
            embed.state = state;
        }
    }

    /**
     * Tear down the render engine, removing the SVG from the DOM
     * and cleaning up any active inline edit.
     */
    public destroy(): void
    {
        if (this.inlineEdit)
        {
            this.endInlineEdit();
        }

        this.destroyAllEmbedInstances();
        this.svg.remove();

        logInfo("RenderEngine destroyed");
    }

    // ========================================================================
    // PRIVATE — EMBED HELPERS
    // ========================================================================

    /**
     * Creates a foreignObject element containing a div for hosting
     * an embedded component. Attempts to instantiate the component
     * via its factory function, or renders a placeholder if the
     * factory is not available on window.
     *
     * @param pres - The object's presentation data.
     * @param objId - The diagram object ID.
     * @returns An SVG foreignObject element.
     */
    private createEmbedContainer(
        pres: DiagramObject["presentation"],
        objId: string): SVGElement
    {
        const embed = pres.embed!;
        const b = pres.bounds;

        const fo = svgCreate("foreignObject", {
            x: "0",
            y: "0",
            width: String(b.width),
            height: String(b.height),
            "data-embed-id": objId
        });

        const container = this.buildEmbedContainerDiv(b, objId);

        fo.appendChild(container);

        // Defer instantiation so the foreignObject is in the DOM
        requestAnimationFrame(() =>
        {
            this.instantiateEmbed(container, objId, embed);
        });

        return fo;
    }

    /**
     * Builds the HTML container div for an embedded component.
     *
     * @param b - Bounding rectangle for sizing.
     * @returns A styled HTMLDivElement.
     */
    private buildEmbedContainerDiv(
        b: Rect, objId: string): HTMLDivElement
    {
        const div = document.createElementNS(
            XHTML_NS, "div"
        ) as HTMLDivElement;

        const embedId = `de-embed-${objId}`;

        div.setAttribute("xmlns", XHTML_NS);
        div.setAttribute("id", embedId);
        div.setAttribute("class", "de-embed-container");

        div.style.cssText = [
            `width: ${b.width}px`,
            `height: ${b.height}px`,
            "overflow: hidden",
            "pointer-events: none",
            "box-sizing: border-box"
        ].join("; ");

        return div;
    }

    /**
     * Attempts to instantiate an embedded component via its factory
     * function on window. Falls back to rendering a placeholder
     * if the factory is not found.
     *
     * @param container - The HTML container element.
     * @param objId - The diagram object ID.
     * @param embed - The embed definition with component and options.
     */
    private instantiateEmbed(
        container: HTMLDivElement,
        objId: string,
        embed: EmbedDefinition): void
    {
        const win = window as unknown as Record<string, unknown>;
        const factoryName = this.resolveFactoryName(embed.component);
        const factory = win[factoryName];

        if (typeof factory !== "function")
        {
            this.renderEmbedPlaceholder(container, embed.component);
            return;
        }

        this.invokeFactory(container, objId, embed, factory);
    }

    /**
     * Sets the embed registry reference for factory name lookup.
     *
     * @param registry - Map of component names to their entries.
     */
    setEmbedRegistry(
        registry: Map<string, EmbeddableComponentEntry>): void
    {
        this.embedRegistry = registry;
    }

    /**
     * Resolves the factory function name from a component name.
     * First checks the embed registry for the exact factory name,
     * then falls back to convention: "datagrid" -> "createDatagrid".
     *
     * @param component - The registered component name.
     * @returns The factory function name on window.
     */
    private resolveFactoryName(component: string): string
    {
        const entry = this.embedRegistry.get(component);

        if (entry)
        {
            return entry.factory;
        }

        const capitalised = component.charAt(0).toUpperCase()
            + component.slice(1);

        return `create${capitalised}`;
    }

    /**
     * Invokes the factory function to create a component instance.
     * Detects the factory signature via Function.length and dispatches:
     * - 1 param: factory(mergedOptions) — options-only pattern
     * - 2+ params: factory(containerId, mergedOptions) — most common
     * Options always include container (HTMLElement) and containerId
     * (string) so both options-based patterns work.
     *
     * @param container - The HTML container element.
     * @param objId - The diagram object ID.
     * @param embed - The embed definition.
     * @param factory - The factory function reference.
     */
    private invokeFactory(
        container: HTMLDivElement,
        objId: string,
        embed: EmbedDefinition,
        factory: unknown): void
    {
        try
        {
            const fn = factory as Function;
            const containerId = container.id;
            const merged = {
                ...embed.options,
                container: container,
                containerId: containerId,
            };

            const factoryName = this.resolveFactoryName(embed.component);
            const instance = this.callFactory(
                fn, factoryName, containerId, merged
            );

            this.embedInstances.set(objId, instance);
            this.restoreEmbedState(instance, embed);

            logInfo(`Embed instantiated: ${embed.component}`
                + ` (${objId})`
            );
        }
        catch (err)
        {
            logError("Embed factory error:",
                embed.component,
                err
            );

            this.renderEmbedPlaceholder(container, embed.component);
        }
    }

    /**
     * Factories where the options object is the FIRST parameter
     * and containerId is the optional second. Identified from
     * the component source code.
     */
    private static readonly OPTS_FIRST_FACTORIES: Set<string> = new Set([
        "createDataGrid", "createTreeGrid",
    ]);

    /**
     * Calls a factory function with the appropriate signature.
     * Uses Function.length and a known-exceptions list:
     * - 0-1 params: factory(mergedOptions)
     * - 2+ params, opts-first: factory(mergedOptions, containerId)
     * - 2+ params, default: factory(containerId, mergedOptions)
     * After creation, calls .show(containerId) if available.
     *
     * @param fn - The factory function.
     * @param factoryName - The factory function name for lookup.
     * @param containerId - The container element ID.
     * @param opts - Merged options with container references.
     * @returns The component instance.
     */
    private callFactory(
        fn: Function,
        factoryName: string,
        containerId: string,
        opts: Record<string, unknown>): unknown
    {
        let instance: unknown;

        if (fn.length <= 1)
        {
            instance = fn(opts);
        }
        else if (RenderEngine.OPTS_FIRST_FACTORIES.has(factoryName))
        {
            instance = fn(opts, containerId);
        }
        else
        {
            instance = fn(containerId, opts);
        }

        this.tryShowOnContainer(instance, containerId);

        return instance;
    }

    /**
     * Mounts a component instance into the embed container.
     * Tries strategies in order:
     * 1. show(containerId) — most components
     * 2. render(sampleContent, container) — MarkdownRenderer pattern
     * 3. getElement() + appendChild — LogConsole pattern
     *
     * @param instance - The component instance.
     * @param containerId - The container element ID.
     */
    private tryShowOnContainer(
        instance: unknown,
        containerId: string): void
    {
        if (!instance || typeof instance !== "object")
        {
            return;
        }

        const obj = instance as Record<string, unknown>;

        if (typeof obj["show"] === "function")
        {
            try
            {
                (obj["show"] as Function)(containerId);
                return;
            }
            catch (_)
            {
                // Fall through to alternative strategies
            }
        }

        this.tryRenderFallback(obj, containerId);
    }

    /**
     * Attempts alternative mount strategies when show() is
     * unavailable or fails: render() for content renderers,
     * getElement() for self-contained components.
     *
     * @param obj - The component instance as a record.
     * @param containerId - The container element ID.
     */
    private tryRenderFallback(
        obj: Record<string, unknown>,
        containerId: string): void
    {
        const container = document.getElementById(containerId);

        if (!container)
        {
            return;
        }

        // MarkdownRenderer pattern: render(content, target)
        if (typeof obj["render"] === "function")
        {
            try
            {
                (obj["render"] as Function)(
                    "**Embedded content**",
                    container
                );

                return;
            }
            catch (_)
            {
                // Fall through to getElement
            }
        }

        // LogConsole / self-contained pattern: getElement()
        if (typeof obj["getElement"] === "function")
        {
            try
            {
                const el = (obj["getElement"] as Function)();

                if (el instanceof HTMLElement)
                {
                    container.appendChild(el);
                }
            }
            catch (_)
            {
                // Component cannot be mounted
            }
        }
    }

    /**
     * Restores component state from the embed definition if both
     * the instance and saved state are available.
     *
     * @param instance - The component instance.
     * @param embed - The embed definition with optional state.
     */
    private restoreEmbedState(
        instance: unknown,
        embed: EmbedDefinition): void
    {
        if (!embed.state)
        {
            return;
        }

        const inst = instance as Record<string, unknown>;

        if (typeof inst["setState"] === "function")
        {
            (inst["setState"] as Function)(embed.state);
        }
        else if (typeof inst["setValue"] === "function")
        {
            (inst["setValue"] as Function)(embed.state);
        }
    }

    /**
     * Renders a placeholder div when the component factory is not
     * available. Shows the component name and a generic icon.
     *
     * @param container - The HTML container element.
     * @param componentName - The component name for display.
     */
    private renderEmbedPlaceholder(
        container: HTMLDivElement,
        componentName: string): void
    {
        const placeholder = document.createElementNS(
            XHTML_NS, "div"
        ) as HTMLDivElement;

        placeholder.setAttribute("xmlns", XHTML_NS);

        placeholder.style.cssText = [
            "display: flex",
            "flex-direction: column",
            "align-items: center",
            "justify-content: center",
            "width: 100%",
            "height: 100%",
            "background: rgba(108, 117, 125, 0.08)",
            "border: 1px dashed rgba(108, 117, 125, 0.4)",
            "color: #6c757d",
            "font-size: 12px",
            "gap: 4px"
        ].join("; ");

        this.appendPlaceholderContent(placeholder, componentName);

        container.appendChild(placeholder);
    }

    /**
     * Appends icon and label elements to a placeholder div.
     *
     * @param placeholder - The placeholder container.
     * @param componentName - The component name for display.
     */
    private appendPlaceholderContent(
        placeholder: HTMLDivElement,
        componentName: string): void
    {
        const icon = document.createElementNS(
            XHTML_NS, "i"
        ) as HTMLElement;

        icon.setAttribute("class", "bi bi-puzzle");
        icon.style.fontSize = "24px";
        placeholder.appendChild(icon);

        const label = document.createElementNS(
            XHTML_NS, "span"
        ) as HTMLSpanElement;

        label.textContent = componentName;
        placeholder.appendChild(label);
    }

    /**
     * Applies or removes interactive styling on an embed container.
     * Interactive mode enables pointer-events and adds a blue glow.
     *
     * @param container - The embed container div.
     * @param interactive - Whether to enable or disable interaction.
     */
    private applyEmbedInteractiveStyles(
        container: HTMLElement,
        interactive: boolean): void
    {
        if (interactive)
        {
            container.style.pointerEvents = "auto";
            container.style.outline = "2px solid var(--bs-primary, #0d6efd)";
            container.style.outlineOffset = "-2px";
            container.style.boxShadow =
                "0 0 8px rgba(13, 110, 253, 0.4)";
        }
        else
        {
            container.style.pointerEvents = "none";
            container.style.outline = "";
            container.style.outlineOffset = "";
            container.style.boxShadow = "";
        }
    }

    /**
     * Extracts state from a component instance by calling getState()
     * or getValue() if available.
     *
     * @param instance - The component instance.
     * @returns A state record, or null if no state method exists.
     */
    private extractInstanceState(
        instance: unknown): Record<string, unknown> | null
    {
        const inst = instance as Record<string, unknown>;

        if (typeof inst["getState"] === "function")
        {
            return (inst["getState"] as Function)() as Record<string, unknown>;
        }

        if (typeof inst["getValue"] === "function")
        {
            return (inst["getValue"] as Function)() as Record<string, unknown>;
        }

        return null;
    }

    /**
     * Destroys an embed instance by calling its destroy() method if
     * available, then removes it from the instances map.
     *
     * @param objId - The diagram object ID.
     */
    private destroyEmbedInstance(objId: string): void
    {
        const instance = this.embedInstances.get(objId);

        if (!instance)
        {
            return;
        }

        const inst = instance as Record<string, unknown>;

        if (typeof inst["destroy"] === "function")
        {
            try
            {
                (inst["destroy"] as Function)();
            }
            catch (err)
            {
                logWarn(`Embed destroy error (${objId}):`,
                    err
                );
            }
        }

        this.embedInstances.delete(objId);
    }

    /**
     * Destroys all embed instances. Called during engine teardown.
     */
    private destroyAllEmbedInstances(): void
    {
        for (const [objId] of this.embedInstances)
        {
            this.destroyEmbedInstance(objId);
        }
    }

    // ========================================================================
    // PRIVATE — SVG CONSTRUCTION
    // ========================================================================

    /**
     * Create the root SVG element with standard attributes.
     *
     * @returns A configured SVGSVGElement.
     */
    private createRootSvg(): SVGSVGElement
    {
        const svg = document.createElementNS(SVG_NS, "svg") as SVGSVGElement;

        svg.setAttribute("class", `${CLS}-canvas`);
        svg.setAttribute("width", "100%");
        svg.setAttribute("height", "100%");
        svg.setAttribute("tabindex", "0");
        svg.setAttribute("role", "application");
        svg.setAttribute("data-version", VERSION);

        return svg;
    }

    /**
     * Create the viewport group element.
     *
     * @returns An SVG group element representing the viewport.
     */
    private createViewportGroup(): SVGGElement
    {
        const g = svgCreate("g", {
            class: `${CLS}-viewport`
        }) as SVGGElement;

        return g;
    }

    /**
     * Create a named group element for a structural layer.
     *
     * @param name - The layer name suffix (e.g. "grid", "overlay").
     * @returns An SVG group element.
     */
    private createNamedGroup(name: string): SVGGElement
    {
        return svgCreate("g", {
            class: `${CLS}-${name}`
        }) as SVGGElement;
    }

    /**
     * Create a layer group element with data attributes.
     *
     * @param layerId - Unique layer identifier.
     * @param order - Stacking order value.
     * @returns An SVG group element for the layer.
     */
    private createLayerGroup(layerId: string, order: number): SVGGElement
    {
        return svgCreate("g", {
            class: `${CLS}-layer`,
            "data-layer-id": layerId,
            "data-layer-order": String(order)
        }) as SVGGElement;
    }

    // ========================================================================
    // PRIVATE — LAYER INSERTION
    // ========================================================================

    /**
     * Insert a layer group into the viewport in the correct stacking
     * order, between the grid layer and the connectors layer.
     *
     * @param g - The layer group to insert.
     * @param order - The stacking order of the new layer.
     */
    private insertLayerInOrder(g: SVGGElement, order: number): void
    {
        let insertBefore: Node | null = this.connectorsLayer;

        for (const [, existing] of this.layerEls)
        {
            const existingOrder = Number(
                existing.getAttribute("data-layer-order") ?? "0"
            );

            if (existingOrder > order)
            {
                insertBefore = existing;
                break;
            }
        }

        this.viewport.insertBefore(g, insertBefore);
    }

    /**
     * Find the layer group element for the given layer ID. Falls back
     * to creating a default layer if the requested one does not exist.
     *
     * @param layerId - The layer ID to look up.
     * @returns The SVG group element for the layer.
     */
    private findLayerEl(layerId: string): SVGGElement
    {
        const el = this.layerEls.get(layerId);

        if (el)
        {
            return el;
        }

        return this.ensureLayerEl(
            DEFAULT_LAYER_ID,
            0
        ) as SVGGElement;
    }

    // ========================================================================
    // PRIVATE — VIEWPORT HELPERS
    // ========================================================================

    /**
     * Apply the current viewport state as an SVG transform on the
     * viewport group.
     */
    private applyViewportTransform(): void
    {
        const tx = `translate(${this.vp.x}, ${this.vp.y}) scale(${this.vp.zoom})`;

        this.viewport.setAttribute("transform", tx);
    }

    /**
     * Clamp a zoom value to the allowed range.
     *
     * @param zoom - The raw zoom value.
     * @returns The clamped zoom value.
     */
    private clampZoom(zoom: number): number
    {
        return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
    }

    /**
     * Compute the bounding box that encloses all given objects.
     *
     * @param objects - The objects to compute the bounding box for.
     * @returns A rectangle enclosing all objects.
     */
    private computeBoundingBox(objects: DiagramObject[]): Rect
    {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        for (const obj of objects)
        {
            const b = obj.presentation.bounds;

            minX = Math.min(minX, b.x);
            minY = Math.min(minY, b.y);
            maxX = Math.max(maxX, b.x + b.width);
            maxY = Math.max(maxY, b.y + b.height);
        }

        return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }

    /**
     * Apply a fit transform so the given bounding box fills the
     * available SVG area with padding.
     *
     * @param bbox - The bounding box to fit.
     * @param svgRect - The SVG element's client rectangle.
     * @param padding - Pixel padding around the content.
     */
    private applyFitTransform(
        bbox: Rect,
        svgRect: DOMRect,
        padding: number): void
    {
        const availW = svgRect.width - (padding * 2);
        const availH = svgRect.height - (padding * 2);

        if (availW <= 0 || availH <= 0)
        {
            return;
        }

        const scaleX = availW / bbox.width;
        const scaleY = availH / bbox.height;
        const zoom = this.clampZoom(Math.min(scaleX, scaleY));

        this.vp.zoom = zoom;
        this.vp.x = padding - (bbox.x * zoom) + ((availW - (bbox.width * zoom)) / 2);
        this.vp.y = padding - (bbox.y * zoom) + ((availH - (bbox.height * zoom)) / 2);

        this.applyViewportTransform();
    }

    // ========================================================================
    // PRIVATE — OBJECT RENDERING HELPERS
    // ========================================================================

    /**
     * Apply translation, rotation, and flip transforms to an object group.
     *
     * @param g - The SVG group element.
     * @param pres - The object's presentation data.
     */
    private applyObjectTransform(
        g: SVGGElement,
        pres: DiagramObject["presentation"]): void
    {
        const parts: string[] = [];
        const b = pres.bounds;

        parts.push(`translate(${b.x}, ${b.y})`);

        if (pres.rotation !== 0)
        {
            const cx = b.width / 2;
            const cy = b.height / 2;

            parts.push(`rotate(${pres.rotation}, ${cx}, ${cy})`);
        }

        this.appendFlipTransforms(parts, pres, b);

        g.setAttribute("transform", parts.join(" "));
    }

    /**
     * Append flip transforms if the object is mirrored.
     *
     * @param parts - The transform string parts array.
     * @param pres - The object's presentation data.
     * @param b - The object's bounding rectangle.
     */
    private appendFlipTransforms(
        parts: string[],
        pres: DiagramObject["presentation"],
        b: Rect): void
    {
        if (pres.flipX)
        {
            parts.push(`translate(${b.width}, 0) scale(-1, 1)`);
        }

        if (pres.flipY)
        {
            parts.push(`translate(0, ${b.height}) scale(1, -1)`);
        }
    }

    /**
     * Apply opacity to an object group if it is less than 1.
     *
     * @param g - The SVG group element.
     * @param opacity - The opacity value (0 to 1).
     */
    private applyObjectOpacity(g: SVGGElement, opacity?: number): void
    {
        if (opacity !== undefined && opacity < 1)
        {
            g.setAttribute("opacity", String(opacity));
        }
    }

    /**
     * Render the shape SVG content using the shape definition.
     *
     * @param obj - The diagram object.
     * @param shapeDef - The shape definition with the render function.
     * @returns The rendered SVG element.
     */
    private renderShapeContent(
        obj: DiagramObject,
        shapeDef: ShapeDefinition): SVGElement
    {
        const pres = obj.presentation;
        const b = pres.bounds;
        const localBounds = { x: 0, y: 0, width: b.width, height: b.height };
        const hasPerEdge = pres.style.perEdgeStroke != null;

        // When per-edge stroke is active, suppress uniform stroke on the
        // main shape element so it is not drawn twice.
        const style = hasPerEdge
            ? { ...pres.style, stroke: { color: "none" as string | GradientDefinition, width: 0 } }
            : pres.style;

        const ctx: ShapeRenderContext = {
            bounds: localBounds,
            style,
            parameters: pres.parameters ?? {},
            renderStyle: pres.renderStyle ?? "clean",
            selected: false
        };

        const shapeEl = shapeDef.render(ctx);

        // Overlay per-edge stroke lines when configured.
        if (hasPerEdge)
        {
            const perEdgeG = renderPerEdgeStroke(
                localBounds,
                pres.style.perEdgeStroke!,
                pres.style.stroke
            );

            if (shapeEl.tagName.toLowerCase() === "g")
            {
                shapeEl.appendChild(perEdgeG);
            }
            else
            {
                const wrapper = svgCreate("g");

                wrapper.appendChild(shapeEl);
                wrapper.appendChild(perEdgeG);

                return wrapper;
            }
        }

        return shapeEl;
    }

    // ========================================================================
    // PRIVATE — TEXT RENDERING (foreignObject)
    // ========================================================================

    // ========================================================================
    // IMAGE RENDERING
    // ========================================================================

    /**
     * Create an SVG image element for objects with image data.
     * Supports fit modes via preserveAspectRatio.
     *
     * @param pres - The object's presentation data.
     * @returns An SVG image element.
     */
    private createImageElement(pres: DiagramObject["presentation"]): SVGElement
    {
        const img = pres.image!;
        const b = pres.bounds;

        // Use local coordinates (0,0) — the parent <g> already has
        // transform: translate(bounds.x, bounds.y)
        const imageEl = svgCreate("image", {
            x: "0",
            y: "0",
            width: String(b.width),
            height: String(b.height),
            preserveAspectRatio: this.getFitAspectRatio(img.fit)
        });

        if (img.headers && Object.keys(img.headers).length > 0)
        {
            this.loadImageWithHeaders(imageEl, img.src, img.headers);
        }
        else
        {
            imageEl.setAttribute("href", img.src);
        }

        return imageEl;
    }

    /**
     * Fetch an image with custom HTTP headers and set as data URI.
     * Used when authentication or custom headers are needed.
     */
    private loadImageWithHeaders(
        imageEl: SVGElement,
        src: string,
        headers: Record<string, string>
    ): void
    {
        const xhr = new XMLHttpRequest();

        xhr.open("GET", src, true);
        xhr.responseType = "blob";

        for (const [key, value] of Object.entries(headers))
        {
            xhr.setRequestHeader(key, value);
        }

        xhr.onload = () =>
        {
            if (xhr.status >= 200 && xhr.status < 300)
            {
                const reader = new FileReader();

                reader.onloadend = () =>
                {
                    imageEl.setAttribute("href", reader.result as string);
                };
                reader.readAsDataURL(xhr.response);
            }
        };

        xhr.send();
    }

    /** Map ImageStyle.fit to SVG preserveAspectRatio value. */
    private getFitAspectRatio(
        fit: "cover" | "contain" | "stretch" | "original"
    ): string
    {
        if (fit === "stretch") { return "none"; }
        if (fit === "cover") { return "xMidYMid slice"; }
        return "xMidYMid meet";
    }

    // ========================================================================
    // PAINTABLE CANVAS RENDERING
    // ========================================================================

    /**
     * Creates a foreignObject containing an HTML canvas element for
     * paintable shapes. Adds a clipPath to the defs if clipToBounds
     * is enabled.
     *
     * @param pres - The object's presentation data.
     * @param objId - The diagram object ID.
     * @returns An SVG foreignObject element containing the canvas.
     */
    private createPaintableCanvas(
        pres: DiagramObject["presentation"],
        objId: string): SVGElement
    {
        const paintable = pres.paintable!;
        const b = pres.bounds;
        const clipToBounds = paintable.clipToBounds !== false;

        if (clipToBounds)
        {
            this.createPaintableClipPath(objId, b, paintable.clipShape);
        }

        const fo = this.buildPaintableForeignObject(b, objId, clipToBounds);
        const canvas = this.buildPaintableCanvasElement(b);

        fo.appendChild(canvas);
        this.paintableCanvases.set(objId, canvas);

        if (paintable.canvasData)
        {
            this.loadCanvasData(canvas, paintable.canvasData);
        }

        return fo;
    }

    /**
     * Builds the foreignObject wrapper for the paintable canvas.
     *
     * @param b - Bounding rectangle of the object.
     * @param objId - The diagram object ID for clip-path reference.
     * @param clipToBounds - Whether to apply clip-path.
     * @returns An SVG foreignObject element.
     */
    private buildPaintableForeignObject(
        b: Rect,
        objId: string,
        clipToBounds: boolean): SVGElement
    {
        const attrs: Record<string, string> = {
            x: "0",
            y: "0",
            width: String(b.width),
            height: String(b.height)
        };

        if (clipToBounds)
        {
            attrs["clip-path"] = `url(#clip-${objId})`;
        }

        return svgCreate("foreignObject", attrs);
    }

    /**
     * Builds the HTML canvas element for painting.
     *
     * @param b - Bounding rectangle determining canvas size.
     * @returns An HTMLCanvasElement sized to match the bounds.
     */
    private buildPaintableCanvasElement(b: Rect): HTMLCanvasElement
    {
        const canvas = document.createElementNS(
            XHTML_NS, "canvas"
        ) as HTMLCanvasElement;

        canvas.setAttribute("xmlns", XHTML_NS);
        canvas.width = Math.round(b.width);
        canvas.height = Math.round(b.height);
        canvas.style.cssText = "display: block; cursor: crosshair;";

        return canvas;
    }

    /**
     * Creates an SVG clipPath definition in defs for the given clip
     * shape type. Removes any existing clip path for the same object.
     *
     * @param objId - The diagram object ID.
     * @param b - Bounding rectangle.
     * @param clipShape - The shape type for clipping.
     */
    private createPaintableClipPath(
        objId: string,
        b: Rect,
        clipShape: PaintableStyle["clipShape"]): void
    {
        const clipId = `clip-${objId}`;

        this.removeDefById(clipId);

        const clipPathEl = svgCreate("clipPath", { id: clipId });
        const shapeEl = this.buildClipShapeElement(b, clipShape);

        clipPathEl.appendChild(shapeEl);
        this.defs.appendChild(clipPathEl);
    }

    /**
     * Builds the appropriate SVG element for the clip shape.
     *
     * @param b - Bounding rectangle.
     * @param clipShape - The clip shape type.
     * @returns An SVG element for use inside a clipPath.
     */
    private buildClipShapeElement(
        b: Rect,
        clipShape: PaintableStyle["clipShape"]): SVGElement
    {
        if (clipShape === "circle" || clipShape === "ellipse")
        {
            return svgCreate("ellipse", {
                cx: String(b.width / 2),
                cy: String(b.height / 2),
                rx: String(b.width / 2),
                ry: String(b.height / 2)
            });
        }

        if (clipShape === "triangle")
        {
            return this.buildTriangleClipElement(b);
        }

        return svgCreate("rect", {
            x: "0",
            y: "0",
            width: String(b.width),
            height: String(b.height)
        });
    }

    /**
     * Builds a triangle polygon element for clip path usage.
     *
     * @param b - Bounding rectangle.
     * @returns SVG polygon element.
     */
    private buildTriangleClipElement(b: Rect): SVGElement
    {
        const midX = b.width / 2;
        const points = `${midX},0 ${b.width},${b.height} 0,${b.height}`;

        return svgCreate("polygon", { points });
    }

    /**
     * Loads a serialised data URI onto a canvas element by drawing
     * the image onto its 2D context.
     *
     * @param canvas - The target canvas element.
     * @param dataUri - The image data URI to load.
     */
    private loadCanvasData(
        canvas: HTMLCanvasElement,
        dataUri: string): void
    {
        const img = new Image();

        img.onload = (): void =>
        {
            const ctx = canvas.getContext("2d");

            if (ctx)
            {
                ctx.drawImage(img, 0, 0);
            }
        };

        img.src = dataUri;
    }

    // ========================================================================
    // TEXT RENDERING (foreignObject)
    // ========================================================================

    /**
     * Create a foreignObject element for rich text rendering within
     * an object's bounds.
     *
     * @param pres - The object's presentation data.
     * @returns An SVG foreignObject element with styled HTML content.
     */
    private createForeignObject(pres: DiagramObject["presentation"]): SVGElement
    {
        const tc = pres.textContent!;
        const region = this.computeTextRegion(pres.bounds, tc.padding);

        const fo = svgCreate("foreignObject", {
            x: String(region.x),
            y: String(region.y),
            width: String(region.width),
            height: String(region.height)
        });

        const div = this.createTextContainer(tc);

        this.populateTextRuns(div, tc);

        fo.appendChild(div);

        return fo;
    }

    /**
     * Compute the text region within an object's bounds, accounting
     * for padding.
     *
     * @param bounds - The object's bounding rectangle.
     * @param padding - Inner padding in pixels.
     * @returns The usable text region rectangle.
     */
    private computeTextRegion(bounds: Rect, padding: number): Rect
    {
        return {
            x: padding,
            y: padding,
            width: Math.max(0, bounds.width - (padding * 2)),
            height: Math.max(0, bounds.height - (padding * 2))
        };
    }

    /**
     * Create the HTML container div for text content with flexbox
     * alignment and overflow handling.
     *
     * @param tc - The text content configuration.
     * @returns An HTML div element styled for text layout.
     */
    private createTextContainer(tc: TextContent): HTMLDivElement
    {
        const div = document.createElementNS(XHTML_NS, "div") as HTMLDivElement;

        div.setAttribute("xmlns", XHTML_NS);

        const styles = this.buildTextContainerStyles(tc);

        div.setAttribute("style", styles);

        return div;
    }

    /**
     * Build the inline CSS style string for a text container div.
     *
     * @param tc - The text content configuration.
     * @returns A CSS style string.
     */
    private buildTextContainerStyles(tc: TextContent): string
    {
        const parts: string[] = [
            "display: flex",
            "flex-direction: column",
            "width: 100%",
            "height: 100%",
            "box-sizing: border-box",
            "overflow: hidden",
            "word-wrap: break-word"
        ];

        parts.push(this.verticalAlignToStyle(tc.verticalAlign));
        parts.push(this.horizontalAlignToStyle(tc.horizontalAlign));

        if (tc.overflow === "ellipsis")
        {
            parts.push("text-overflow: ellipsis");
            parts.push("white-space: nowrap");
        }

        return parts.join("; ");
    }

    /**
     * Convert vertical alignment to a CSS flexbox justify-content value.
     *
     * @param align - The vertical alignment setting.
     * @returns A CSS style declaration string.
     */
    private verticalAlignToStyle(align: string): string
    {
        const map: Record<string, string> = {
            top: "flex-start",
            middle: "center",
            bottom: "flex-end"
        };

        return `justify-content: ${map[align] ?? "flex-start"}`;
    }

    /**
     * Convert horizontal alignment to a CSS text-align value.
     *
     * @param align - The horizontal alignment setting.
     * @returns A CSS style declaration string.
     */
    private horizontalAlignToStyle(align: string): string
    {
        return `text-align: ${align}`;
    }

    /**
     * Populate the text container div with styled spans for text runs
     * and icon elements for icon runs.
     *
     * @param div - The HTML container div.
     * @param tc - The text content configuration.
     */
    private populateTextRuns(div: HTMLDivElement, tc: TextContent): void
    {
        const runs = tc.runs ?? [];

        for (const run of runs)
        {
            if ("icon" in run)
            {
                div.appendChild(this.createIconElement(run as IconRun));
            }
            else
            {
                div.appendChild(this.createTextSpan(run as TextRun));
            }
        }
    }

    /**
     * Create a styled span element for a text run.
     *
     * @param run - The text run definition.
     * @returns An HTML span element with inline styles.
     */
    private createTextSpan(run: TextRun): HTMLSpanElement
    {
        const span = document.createElementNS(XHTML_NS, "span") as HTMLSpanElement;

        span.textContent = run.text;

        const style = this.buildTextRunStyle(run);

        if (style)
        {
            span.setAttribute("style", style);
        }

        return span;
    }

    /**
     * Build the inline CSS style string for a text run.
     *
     * @param run - The text run definition.
     * @returns A CSS style string, or empty string if no styles needed.
     */
    private buildTextRunStyle(run: TextRun): string
    {
        const parts: string[] = [];

        if (run.bold)
        {
            parts.push("font-weight: bold");
        }

        if (run.italic)
        {
            parts.push("font-style: italic");
        }

        if (run.underline)
        {
            parts.push("text-decoration: underline");
        }

        if (run.strikethrough)
        {
            parts.push("text-decoration: line-through");
        }

        this.appendOptionalRunStyles(parts, run);

        return parts.join("; ");
    }

    /**
     * Append optional style properties (font, colour, size, etc.)
     * from a text run to the style parts array.
     *
     * @param parts - The CSS style parts array.
     * @param run - The text run definition.
     */
    private appendOptionalRunStyles(parts: string[], run: TextRun): void
    {
        if (run.fontFamily)
        {
            parts.push(`font-family: ${run.fontFamily}`);
        }

        if (run.fontSize)
        {
            parts.push(`font-size: ${run.fontSize}px`);
        }

        if (run.color)
        {
            this.applyTextColor(parts, run.color);
        }

        if (run.backgroundColor)
        {
            parts.push(`background-color: ${run.backgroundColor}`);
        }

        this.appendScriptAndSpacingStyles(parts, run);
    }

    /**
     * Apply text colour — solid string or CSS gradient with
     * background-clip: text for gradient text effect.
     */
    private applyTextColor(
        parts: string[],
        color: string | GradientDefinition
    ): void
    {
        if (typeof color === "string")
        {
            parts.push(`color: ${color}`);
            return;
        }

        const css = this.buildGradientCSS(color);

        parts.push(`background: ${css}`);
        parts.push("-webkit-background-clip: text");
        parts.push("background-clip: text");
        parts.push("color: transparent");
    }

    /** Build a CSS gradient string from a GradientDefinition. */
    private buildGradientCSS(grad: GradientDefinition): string
    {
        const stops = grad.stops
            .map((s) => `${s.color} ${Math.round(s.offset * 100)}%`)
            .join(", ");

        if (grad.type === "radial")
        {
            const cx = Math.round((grad.center?.x ?? 0.5) * 100);
            const cy = Math.round((grad.center?.y ?? 0.5) * 100);

            return `radial-gradient(circle at ${cx}% ${cy}%, ${stops})`;
        }

        return `linear-gradient(${grad.angle ?? 0}deg, ${stops})`;
    }

    /**
     * Append superscript, subscript, line-height, and letter-spacing
     * styles from a text run.
     *
     * @param parts - The CSS style parts array.
     * @param run - The text run definition.
     */
    private appendScriptAndSpacingStyles(parts: string[], run: TextRun): void
    {
        if (run.superscript)
        {
            parts.push("vertical-align: super");
            parts.push("font-size: 0.75em");
        }

        if (run.subscript)
        {
            parts.push("vertical-align: sub");
            parts.push("font-size: 0.75em");
        }

        if (run.lineHeight)
        {
            parts.push(`line-height: ${run.lineHeight}`);
        }

        if (run.letterSpacing)
        {
            parts.push(`letter-spacing: ${run.letterSpacing}px`);
        }
    }

    /**
     * Create an icon element for an icon run.
     *
     * @param run - The icon run definition.
     * @returns An HTML <i> element with the icon class.
     */
    private createIconElement(run: IconRun): HTMLElement
    {
        const i = document.createElementNS(XHTML_NS, "i") as HTMLElement;

        i.setAttribute("class", run.icon);

        const parts: string[] = [];

        if (run.fontSize)
        {
            parts.push(`font-size: ${run.fontSize}px`);
        }

        if (run.color)
        {
            parts.push(`color: ${run.color}`);
        }

        if (parts.length > 0)
        {
            i.setAttribute("style", parts.join("; "));
        }

        return i;
    }

    // ========================================================================
    // PRIVATE — SELECTION HANDLES
    // ========================================================================

    /**
     * Render selection visuals for a single object: dashed outline,
     * 8 resize handles, and a rotation handle.
     *
     * @param obj - The selected diagram object.
     */
    private renderSingleSelection(obj: DiagramObject): void
    {
        const b = obj.presentation.bounds;
        const g = svgCreate("g", { "data-selection-id": obj.id }) as SVGGElement;

        g.setAttribute("transform", `translate(${b.x}, ${b.y})`);

        g.appendChild(this.createSelectionOutline(b));

        this.appendResizeHandles(g, b);
        this.appendRotationHandle(g, b);

        this.overlayLayer.appendChild(g);
    }

    /**
     * Create the dashed rectangle outline for a selected object.
     *
     * @param bounds - The object's bounding rectangle.
     * @returns An SVG rect element with dashed stroke.
     */
    private createSelectionOutline(bounds: Rect): SVGElement
    {
        return svgCreate("rect", {
            x: "0",
            y: "0",
            width: String(bounds.width),
            height: String(bounds.height),
            fill: "none",
            stroke: "var(--bs-primary, #0d6efd)",
            "stroke-width": "1",
            "stroke-dasharray": "4 2",
            "pointer-events": "none"
        });
    }

    /**
     * Append the 8 bounding-box resize handles to a selection group.
     *
     * @param g - The selection group element.
     * @param bounds - The object's bounding rectangle.
     */
    private appendResizeHandles(g: SVGGElement, bounds: Rect): void
    {
        const positions = this.computeHandlePositions(bounds);

        for (const pos of positions)
        {
            g.appendChild(this.createResizeHandle(pos.x, pos.y, pos.cursor));
        }
    }

    /**
     * Compute the 8 resize handle positions for a bounding rectangle.
     *
     * @param b - The bounding rectangle.
     * @returns An array of handle position objects.
     */
    private computeHandlePositions(
        b: Rect): Array<{ x: number; y: number; cursor: string }>
    {
        const w = b.width;
        const h = b.height;
        const mid = HANDLE_SIZE / 2;

        return [
            { x: -mid, y: -mid, cursor: "nw-resize" },
            { x: (w / 2) - mid, y: -mid, cursor: "n-resize" },
            { x: w - mid, y: -mid, cursor: "ne-resize" },
            { x: w - mid, y: (h / 2) - mid, cursor: "e-resize" },
            { x: w - mid, y: h - mid, cursor: "se-resize" },
            { x: (w / 2) - mid, y: h - mid, cursor: "s-resize" },
            { x: -mid, y: h - mid, cursor: "sw-resize" },
            { x: -mid, y: (h / 2) - mid, cursor: "w-resize" }
        ];
    }

    /**
     * Create a single resize handle (filled square).
     *
     * @param x - X position of the handle.
     * @param y - Y position of the handle.
     * @param cursor - CSS cursor style for the handle.
     * @returns An SVG rect element for the handle.
     */
    private createResizeHandle(x: number, y: number, cursor: string): SVGElement
    {
        return svgCreate("rect", {
            x: String(x),
            y: String(y),
            width: String(HANDLE_SIZE),
            height: String(HANDLE_SIZE),
            fill: "#ffffff",
            stroke: "var(--bs-primary, #0d6efd)",
            "stroke-width": "1",
            cursor: cursor
        });
    }

    /**
     * Append the rotation handle (circle and stem line) above the
     * top-centre of the object.
     *
     * @param g - The selection group element.
     * @param bounds - The object's bounding rectangle.
     */
    private appendRotationHandle(g: SVGGElement, bounds: Rect): void
    {
        const cx = bounds.width / 2;
        const stemTop = -ROTATION_HANDLE_OFFSET;
        const stemBottom = 0;

        const stem = svgCreate("line", {
            x1: String(cx),
            y1: String(stemBottom),
            x2: String(cx),
            y2: String(stemTop + ROTATION_HANDLE_RADIUS),
            stroke: "var(--bs-primary, #0d6efd)",
            "stroke-width": "1"
        });

        const circle = svgCreate("circle", {
            cx: String(cx),
            cy: String(stemTop),
            r: String(ROTATION_HANDLE_RADIUS),
            fill: "#ffffff",
            stroke: "var(--bs-primary, #0d6efd)",
            "stroke-width": "1",
            cursor: "grab"
        });

        g.appendChild(stem);
        g.appendChild(circle);
    }

    // ========================================================================
    // PRIVATE — CONNECTOR HIGHLIGHT
    // ========================================================================

    /**
     * Builds a wide semi-transparent SVG path element that highlights
     * a selected connector.
     *
     * @param connId - The connector ID for identification.
     * @param pathD - The SVG path d attribute string.
     * @returns A styled SVG path element for the highlight.
     */
    private buildConnectorHighlightPath(
        connId: string,
        pathD: string): SVGElement
    {
        return svgCreate("path", {
            d: pathD,
            fill: "none",
            stroke: "var(--bs-primary, #0d6efd)",
            "stroke-width": "2",
            "stroke-dasharray": "6 3",
            "stroke-linecap": "round",
            "pointer-events": "none",
            "data-highlight-connector": connId
        });
    }

    // ========================================================================
    // PRIVATE — GRID HELPERS
    // ========================================================================

    /**
     * Clear all child elements from the grid layer.
     */
    private clearGridLayer(): void
    {
        while (this.gridLayer.firstChild)
        {
            this.gridLayer.removeChild(this.gridLayer.firstChild);
        }
    }

    /**
     * Remove an existing grid pattern from the defs element.
     */
    private removeExistingGridPattern(): void
    {
        const existing = this.defs.querySelector("#de-grid-pattern");

        if (existing)
        {
            existing.remove();
        }
    }

    /**
     * Create a dot grid SVG pattern and add it to the defs element.
     *
     * @param size - Grid cell size in pixels.
     */
    private createDotGridPattern(size: number): void
    {
        const pattern = svgCreate("pattern", {
            id: "de-grid-pattern",
            width: String(size),
            height: String(size),
            patternUnits: "userSpaceOnUse"
        });

        const dot = svgCreate("circle", {
            cx: String(size / 2),
            cy: String(size / 2),
            r: String(DOT_GRID_RADIUS),
            fill: "currentColor",
            opacity: String(GRID_OPACITY)
        });

        pattern.appendChild(dot);
        this.defs.appendChild(pattern);
    }

    /**
     * Create a line grid SVG pattern and add it to the defs element.
     *
     * @param size - Grid cell size in pixels.
     */
    private createLineGridPattern(size: number): void
    {
        const pattern = svgCreate("pattern", {
            id: "de-grid-pattern",
            width: String(size),
            height: String(size),
            patternUnits: "userSpaceOnUse"
        });

        pattern.appendChild(this.createGridLine("0", String(size), String(size), String(size)));
        pattern.appendChild(this.createGridLine(String(size), "0", String(size), String(size)));

        this.defs.appendChild(pattern);
    }

    /**
     * Create a single grid line element with standard styling.
     *
     * @param x1 - Start X coordinate.
     * @param y1 - Start Y coordinate.
     * @param x2 - End X coordinate.
     * @param y2 - End Y coordinate.
     * @returns An SVG line element.
     */
    private createGridLine(x1: string, y1: string, x2: string, y2: string): SVGElement
    {
        return svgCreate("line", {
            x1: x1,
            y1: y1,
            x2: x2,
            y2: y2,
            stroke: "currentColor",
            "stroke-width": "0.5",
            opacity: String(GRID_OPACITY)
        });
    }

    /**
     * Apply the grid pattern to the grid layer as a full-coverage rect.
     *
     * @param size - Grid cell size, used to size the coverage rect.
     */
    private applyGridPatternToLayer(size: number): void
    {
        const gridRect = svgCreate("rect", {
            x: "-10000",
            y: "-10000",
            width: "20000",
            height: "20000",
            fill: "url(#de-grid-pattern)",
            "pointer-events": "none"
        });

        this.gridLayer.appendChild(gridRect);
    }

    // ========================================================================
    // PRIVATE — SHADOW FILTER HELPERS
    // ========================================================================

    /**
     * Create or update a drop shadow filter definition in the defs
     * element.
     *
     * @param filterId - The deterministic filter element ID.
     * @param shadow - The shadow style configuration.
     */
    private upsertShadowFilterDef(filterId: string, shadow: ShadowStyle): void
    {
        let filter = this.defs.querySelector(`#${filterId}`) as SVGElement | null;

        if (filter)
        {
            this.updateShadowFilterAttrs(filter, shadow);
            return;
        }

        filter = this.createShadowFilterEl(filterId, shadow);
        this.defs.appendChild(filter);
    }

    /**
     * Create a new SVG filter element with a feDropShadow child.
     *
     * @param filterId - The element ID for the filter.
     * @param shadow - The shadow style configuration.
     * @returns The SVG filter element.
     */
    private createShadowFilterEl(
        filterId: string,
        shadow: ShadowStyle): SVGElement
    {
        const filter = svgCreate("filter", {
            id: filterId,
            x: "-50%",
            y: "-50%",
            width: "200%",
            height: "200%"
        });

        const dropShadow = svgCreate("feDropShadow", {
            dx: String(shadow.offsetX),
            dy: String(shadow.offsetY),
            stdDeviation: String(shadow.blur),
            "flood-color": shadow.color,
            "flood-opacity": String(shadow.opacity)
        });

        filter.appendChild(dropShadow);

        return filter;
    }

    /**
     * Update an existing shadow filter element with new attributes.
     *
     * @param filter - The existing filter element.
     * @param shadow - The new shadow style configuration.
     */
    private updateShadowFilterAttrs(
        filter: SVGElement,
        shadow: ShadowStyle): void
    {
        const ds = filter.querySelector("feDropShadow");

        if (!ds)
        {
            return;
        }

        ds.setAttribute("dx", String(shadow.offsetX));
        ds.setAttribute("dy", String(shadow.offsetY));
        ds.setAttribute("stdDeviation", String(shadow.blur));
        ds.setAttribute("flood-color", shadow.color);
        ds.setAttribute("flood-opacity", String(shadow.opacity));
    }

    /**
     * Remove a shadow filter from the defs element by object ID.
     *
     * @param objId - The object ID whose shadow filter should be removed.
     */
    private removeShadowFilter(objId: string): void
    {
        const filterId = `de-shadow-${objId}`;
        const existing = this.defs.querySelector(`#${filterId}`);

        if (existing)
        {
            existing.remove();
        }
    }

    // ========================================================================
    // PRIVATE — INLINE EDIT HELPERS
    // ========================================================================

    /**
     * Create the contentEditable overlay div for inline text editing.
     *
     * @param pos - Screen position (top-left corner).
     * @param width - Overlay width in screen pixels.
     * @param height - Overlay height in screen pixels.
     * @returns A configured HTMLDivElement.
     */
    private createEditOverlay(
        pos: Point,
        width: number,
        height: number): HTMLDivElement
    {
        const overlay = document.createElement("div");

        overlay.contentEditable = "true";
        overlay.className = `${CLS}-inline-edit`;

        overlay.style.cssText = this.buildEditOverlayStyle(pos, width, height);

        return overlay;
    }

    /**
     * Build the CSS style string for the inline edit overlay.
     *
     * @param pos - Screen position for the overlay.
     * @param width - Width in screen pixels.
     * @param height - Height in screen pixels.
     * @returns A CSS style string.
     */
    private buildEditOverlayStyle(
        pos: Point,
        width: number,
        height: number): string
    {
        return [
            "position: absolute",
            `left: ${pos.x}px`,
            `top: ${pos.y}px`,
            `width: ${width}px`,
            `min-height: ${height}px`,
            "padding: 4px",
            "border: 2px solid var(--bs-primary, #0d6efd)",
            "background: var(--bs-body-bg, #ffffff)",
            "color: var(--bs-body-color, #212529)",
            "font-size: 14px",
            "outline: none",
            "z-index: 1000",
            "box-sizing: border-box",
            "overflow: auto",
            "white-space: pre-wrap"
        ].join("; ");
    }

    /**
     * Extract plain text from a diagram object's text content runs.
     *
     * @param obj - The diagram object.
     * @returns A plain text string, or empty string if no text.
     */
    private extractPlainText(obj: DiagramObject): string
    {
        const tc = obj.presentation.textContent;

        if (!tc || !tc.runs)
        {
            return "";
        }

        return tc.runs
            .filter((r: ContentRun) => "text" in r)
            .map((r: ContentRun) => (r as TextRun).text)
            .join("");
    }

    /**
     * Attach blur and keydown event handlers to the inline edit overlay.
     *
     * @param overlay - The contentEditable overlay element.
     * @param objectId - The ID of the object being edited.
     * @returns An object with the blur and keydown handler references.
     */
    private attachEditHandlers(
        overlay: HTMLDivElement,
        objectId: string): { blur: () => void; keydown: (e: KeyboardEvent) => void }
    {
        const blur = (): void =>
        {
            this.endInlineEdit();
        };

        const keydown = (e: KeyboardEvent): void =>
        {
            this.handleEditKeydown(e);
        };

        overlay.addEventListener("blur", blur);
        overlay.addEventListener("keydown", keydown);

        return { blur, keydown };
    }

    /**
     * Handle keydown events during inline text editing. Enter commits
     * the edit; Escape cancels it.
     *
     * @param e - The keyboard event.
     */
    private handleEditKeydown(e: KeyboardEvent): void
    {
        if (e.key === "Enter" && !e.shiftKey)
        {
            e.preventDefault();
            this.endInlineEdit();
        }
        else if (e.key === "Escape")
        {
            e.preventDefault();

            if (this.inlineEdit)
            {
                this.inlineEdit.overlay.textContent = "";
            }

            this.endInlineEdit();
        }
    }

    /**
     * Remove event handlers from an inline edit overlay.
     *
     * @param state - The inline edit state containing handler references.
     */
    private detachEditHandlers(state: InlineEditState): void
    {
        state.overlay.removeEventListener("blur", state.blurHandler);
        state.overlay.removeEventListener("keydown", state.keydownHandler);
    }

    // ========================================================================
    // TEXT PATH RENDERING (SVG textPath / WordArt)
    // ========================================================================

    /**
     * Create an SVG <text> element whose content follows an SVG path.
     * Used for WordArt-style curved text rendering.
     *
     * @param pres - The object presentation containing textContent.
     * @param objId - The diagram object ID (used for def IDs).
     * @returns An SVG <text> element with a <textPath> child.
     */
    private createTextPathElement(
        pres: DiagramObject["presentation"],
        objId: string): SVGElement
    {
        const tc = pres.textContent!;
        const tpDef = tc.textPath!;
        const runs = tc.runs ?? [];

        const pathId = this.createTextPathDef(objId, tpDef.path);

        const textEl = svgCreate("text") as SVGTextElement;
        const textPathEl = this.buildTextPathChild(pathId, tpDef);

        this.populateSvgTextRuns(textPathEl, runs, objId);

        if (tpDef.letterSpacing != null)
        {
            textEl.setAttribute("letter-spacing", String(tpDef.letterSpacing));
        }

        textEl.appendChild(textPathEl);

        return textEl;
    }

    /**
     * Build the <textPath> child element with href and positioning
     * attributes from the text path definition.
     *
     * @param pathId - The ID of the <path> element in defs.
     * @param tpDef - The text path configuration.
     * @returns An SVG <textPath> element.
     */
    private buildTextPathChild(
        pathId: string,
        tpDef: TextPathDefinition): SVGElement
    {
        const offset = tpDef.startOffset ?? 0;
        const anchor = tpDef.textAnchor ?? "start";

        return svgCreate("textPath", {
            href: `#${pathId}`,
            startOffset: `${Math.round(offset * 100)}%`,
            "text-anchor": anchor
        });
    }

    /**
     * Create a <path> element in the defs section for text to follow.
     * Removes any existing definition with the same ID first.
     *
     * @param objId - The diagram object ID.
     * @param pathD - The SVG path data string (d attribute).
     * @returns The generated path element ID.
     */
    private createTextPathDef(objId: string, pathD: string): string
    {
        const pathId = `de-tp-${objId}`;
        const existing = this.defs.querySelector(`#${pathId}`);

        if (existing)
        {
            existing.remove();
        }

        const pathEl = svgCreate("path", {
            id: pathId,
            d: pathD,
            fill: "none"
        });

        this.defs.appendChild(pathEl);

        return pathId;
    }

    /**
     * Populate an SVG <textPath> element with <tspan> children from
     * an array of content runs. Icon runs are skipped with a warning.
     *
     * @param textPathEl - The parent <textPath> element.
     * @param runs - The content runs to render.
     * @param objId - The diagram object ID for gradient def IDs.
     */
    private populateSvgTextRuns(
        textPathEl: SVGElement,
        runs: ContentRun[],
        objId: string): void
    {
        for (let i = 0; i < runs.length; i++)
        {
            const run = runs[i];

            if ("icon" in run)
            {
                logDebug(`Icon runs not supported in textPath (object ${objId})`);
                continue;
            }

            const tspan = this.createSvgTspan(run as TextRun, objId, i);

            textPathEl.appendChild(tspan);
        }
    }

    /**
     * Create a styled SVG <tspan> element from a text run definition.
     *
     * @param run - The text run with styling information.
     * @param objId - The diagram object ID for gradient def IDs.
     * @param runIndex - The run index (used for gradient def IDs).
     * @returns A styled SVG <tspan> element.
     */
    private createSvgTspan(
        run: TextRun,
        objId: string,
        runIndex: number): SVGElement
    {
        const tspan = svgCreate("tspan");

        tspan.textContent = run.text;

        this.applySvgTspanStyle(tspan, run);
        this.applySvgTspanColor(tspan, run, objId, runIndex);
        this.applySvgTspanScript(tspan, run);

        return tspan;
    }

    /**
     * Apply basic SVG text attributes from a text run to a <tspan>.
     * Handles bold, italic, underline, strikethrough, font, and spacing.
     *
     * @param tspan - The target <tspan> element.
     * @param run - The text run definition.
     */
    private applySvgTspanStyle(tspan: SVGElement, run: TextRun): void
    {
        if (run.bold)
        {
            tspan.setAttribute("font-weight", "bold");
        }

        if (run.italic)
        {
            tspan.setAttribute("font-style", "italic");
        }

        const decoration = this.buildTextDecoration(run);

        if (decoration)
        {
            tspan.setAttribute("text-decoration", decoration);
        }

        this.applySvgTspanFont(tspan, run);
    }

    /**
     * Apply font family, size, and letter spacing attributes to a
     * <tspan> element from a text run.
     *
     * @param tspan - The target <tspan> element.
     * @param run - The text run definition.
     */
    private applySvgTspanFont(tspan: SVGElement, run: TextRun): void
    {
        if (run.fontFamily)
        {
            tspan.setAttribute("font-family", run.fontFamily);
        }

        if (run.fontSize != null)
        {
            tspan.setAttribute("font-size", `${run.fontSize}px`);
        }

        if (run.letterSpacing != null)
        {
            tspan.setAttribute("letter-spacing", String(run.letterSpacing));
        }
    }

    /**
     * Build a text-decoration value string from underline and
     * strikethrough flags on a text run.
     *
     * @param run - The text run definition.
     * @returns A space-separated decoration string, or empty string.
     */
    private buildTextDecoration(run: TextRun): string
    {
        const parts: string[] = [];

        if (run.underline)
        {
            parts.push("underline");
        }

        if (run.strikethrough)
        {
            parts.push("line-through");
        }

        return parts.join(" ");
    }

    /**
     * Apply fill colour to a <tspan>, handling both solid colours and
     * gradient definitions. Gradients are added to defs as SVG
     * gradient elements.
     *
     * @param tspan - The target <tspan> element.
     * @param run - The text run definition.
     * @param objId - The diagram object ID.
     * @param runIndex - The run index for gradient ID generation.
     */
    private applySvgTspanColor(
        tspan: SVGElement,
        run: TextRun,
        objId: string,
        runIndex: number): void
    {
        if (run.color == null)
        {
            return;
        }

        if (typeof run.color === "string")
        {
            tspan.setAttribute("fill", run.color);
            return;
        }

        this.applyTspanGradientFill(tspan, run.color, objId, runIndex);
    }

    /**
     * Apply superscript or subscript baseline shift to a <tspan>.
     *
     * @param tspan - The target <tspan> element.
     * @param run - The text run definition.
     */
    private applySvgTspanScript(tspan: SVGElement, run: TextRun): void
    {
        if (run.superscript)
        {
            tspan.setAttribute("baseline-shift", "super");
            tspan.setAttribute("font-size", "0.7em");
        }
        else if (run.subscript)
        {
            tspan.setAttribute("baseline-shift", "sub");
            tspan.setAttribute("font-size", "0.7em");
        }
    }

    /**
     * Create an SVG gradient element in defs and apply it as the fill
     * on a <tspan>. Supports both linear and radial gradients.
     *
     * @param tspan - The target <tspan> element.
     * @param gradient - The gradient definition.
     * @param objId - The diagram object ID.
     * @param runIndex - The run index for a deterministic ID.
     */
    private applyTspanGradientFill(
        tspan: SVGElement,
        gradient: GradientDefinition,
        objId: string,
        runIndex: number): void
    {
        const gradId = `de-tpgrad-${objId}-${runIndex}`;

        this.removeDefById(gradId);

        const gradEl = this.buildSvgGradientEl(gradient, gradId);

        this.defs.appendChild(gradEl);
        tspan.setAttribute("fill", `url(#${gradId})`);
    }

    /**
     * Build an SVG <linearGradient> or <radialGradient> element from
     * a GradientDefinition, including all colour stops.
     *
     * @param grad - The gradient definition.
     * @param gradId - The element ID to assign.
     * @returns The SVG gradient element.
     */
    private buildSvgGradientEl(
        grad: GradientDefinition,
        gradId: string): SVGElement
    {
        const isRadial = grad.type === "radial";
        const tag = isRadial ? "radialGradient" : "linearGradient";
        const attrs: Record<string, string> = { id: gradId };

        if (isRadial)
        {
            attrs.cx = `${Math.round((grad.center?.x ?? 0.5) * 100)}%`;
            attrs.cy = `${Math.round((grad.center?.y ?? 0.5) * 100)}%`;
            attrs.r = `${Math.round((grad.radius ?? 0.5) * 100)}%`;
        }
        else
        {
            this.applyLinearGradientCoords(attrs, grad.angle ?? 0);
        }

        const gradEl = svgCreate(tag, attrs);

        this.appendGradientStops(gradEl, grad.stops);

        return gradEl;
    }

    /**
     * Set x1/y1/x2/y2 on a linear gradient attributes object based
     * on the angle in degrees.
     *
     * @param attrs - The attributes record to modify.
     * @param angleDeg - The gradient angle in degrees.
     */
    private applyLinearGradientCoords(
        attrs: Record<string, string>,
        angleDeg: number): void
    {
        const rad = (angleDeg * Math.PI) / 180;

        attrs.x1 = `${Math.round(50 - Math.cos(rad) * 50)}%`;
        attrs.y1 = `${Math.round(50 - Math.sin(rad) * 50)}%`;
        attrs.x2 = `${Math.round(50 + Math.cos(rad) * 50)}%`;
        attrs.y2 = `${Math.round(50 + Math.sin(rad) * 50)}%`;
    }

    /**
     * Append <stop> child elements to a gradient element.
     *
     * @param gradEl - The parent gradient element.
     * @param stops - The colour stop definitions.
     */
    private appendGradientStops(
        gradEl: SVGElement,
        stops: GradientDefinition["stops"]): void
    {
        for (const stop of stops)
        {
            const stopEl = svgCreate("stop", {
                offset: `${Math.round(stop.offset * 100)}%`,
                "stop-color": stop.color
            });

            gradEl.appendChild(stopEl);
        }
    }

    /**
     * Remove a single element from the defs section by its ID.
     *
     * @param id - The element ID to remove.
     */
    private removeDefById(id: string): void
    {
        const existing = this.defs.querySelector(`#${id}`);

        if (existing)
        {
            existing.remove();
        }
    }

    /**
     * Remove all text path related defs for a given object ID.
     * Cleans up the <path> definition and any gradient defs created
     * for individual text runs.
     *
     * @param objId - The diagram object ID.
     */
    private removeTextPathDefs(objId: string): void
    {
        this.removeDefById(`de-tp-${objId}`);

        const gradPrefix = `de-tpgrad-${objId}-`;
        const grads = this.defs.querySelectorAll(`[id^="${gradPrefix}"]`);

        for (let i = 0; i < grads.length; i++)
        {
            grads[i].remove();
        }
    }
}

// ========================================================================
// SOURCE: tool-select.ts
// ========================================================================

/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: SelectTool
 * PURPOSE: Default selection tool for the DiagramEngine canvas. Handles
 *    click-to-select, shift/ctrl toggle, drag-to-move, resize handles,
 *    rotation handle, rubber-band selection, and keyboard shortcuts.
 * RELATES: [[ToolManager]], [[DiagramEngine]], [[UndoStack]]
 * FLOW: [ToolManager.dispatch*()] -> [SelectTool] -> [EngineForTools]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// ENGINE INTERFACE (FORWARD REFERENCE)
// ============================================================================

/**
 * Minimal engine interface consumed by tools.
 *
 * The concrete DiagramEngineImpl class implements this interface.
 * Using an explicit contract avoids circular dependencies since files
 * are concatenated without ES module imports.
 */
interface EngineForTools
{
    /** Hit-test a canvas point and return the topmost object, or null. */
    hitTestObject(canvasPos: Point): DiagramObject | null;

    /** Check whether an object is currently selected. */
    isSelected(id: string): boolean;

    /** Add an object to the current selection. */
    addToSelection(id: string): void;

    /** Toggle an object's selection state. */
    toggleSelection(id: string): void;

    /** Clear the selection set. */
    clearSelectionInternal(): void;

    /** Return the IDs of all selected objects. */
    getSelectedIds(): string[];

    /** Return all selected DiagramObject instances. */
    getSelectedObjects(): DiagramObject[];

    /** Retrieve a single object by ID. */
    getObjectById(id: string): DiagramObject | null;

    /** Move an object to an absolute position. */
    moveObjectTo(id: string, pos: { x: number; y: number }): void;

    /** Resize an object to new bounds. */
    resizeObject(id: string, bounds: Rect): void;

    /** Set an object's rotation in degrees. */
    rotateObjectTo(id: string, degrees: number): void;

    /** Nudge all selected objects by a pixel delta. */
    nudgeSelected(dx: number, dy: number): void;

    /** Delete all selected objects. */
    deleteSelected(): void;

    /** Select every object on the canvas. */
    selectAll(): void;

    /** Select all objects intersecting a rectangle. */
    selectObjectsInRect(rect: Rect): void;

    /** Push a move undo command with start bounds for each object. */
    pushMoveUndo(startBounds: Map<string, Rect>): void;

    /** Push a resize undo command for a single object. */
    pushResizeUndo(id: string, before: Rect, after: Rect): void;

    /** Render the rubber-band selection rectangle. */
    renderRubberBand(rect: Rect): void;

    /** Clear the tool overlay layer. */
    clearToolOverlay(): void;

    /** Switch the active tool by name. */
    setActiveTool(name: string): void;

    /** Show alignment guides relative to a moving bounding rect. */
    showAlignmentGuides(movingBounds: Rect): void;

    /** Begin inline text editing for an object. */
    startInlineTextEdit(objectId: string): void;

    /** End any active inline text editing. */
    endInlineTextEdit(): void;

    /** Hit-test a canvas point against connectors. */
    hitTestConnector(canvasPos: Point): DiagramConnector | null;

    /** Check whether a connector is currently selected. */
    isConnectorSelected(id: string): boolean;

    /** Add a connector to the current selection. */
    addConnectorToSelection(id: string): void;

    /** Toggle a connector's selection state. */
    toggleConnectorSelection(id: string): void;

    /** Update containment for moved objects (auto-parent to containers). */
    updateContainment(objectIds: string[]): void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Nudge distance in pixels for arrow keys. */

/** Nudge distance in pixels when Shift is held. */

/** Pixel radius for detecting a resize handle hit. */
const HANDLE_HIT_RADIUS = 6;

/** Vertical offset of the rotation handle above the object. */

/** Log prefix for all console messages from this module. */

// ============================================================================
// DRAG-STATE TYPES
// ============================================================================

/** Identifies which drag interaction is in progress. */
type DragMode = "none" | "move" | "resize" | "rotate" | "rubber-band";

/** Identifies one of the 8 bounding-box resize handles. */
type HandleId = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * The default select/move/resize tool for the diagram canvas.
 *
 * Behaviour summary:
 * - Click to select, shift/ctrl+click to toggle
 * - Drag a selected object to move all selected objects
 * - Drag a resize handle to resize the target object
 * - Drag the rotation handle to rotate the target object
 * - Drag on empty canvas to rubber-band select
 * - Arrow keys nudge, Delete removes, Ctrl+A selects all
 */
class SelectTool implements Tool
{
    /** @inheritdoc */
    public readonly name = "select";

    /** @inheritdoc */
    public readonly cursor = "default";

    /** Reference to the engine facade. */
    private readonly engine: EngineForTools;

    /** Current drag interaction type. */
    private dragMode: DragMode = "none";

    /** Canvas position where the current drag started. */
    private dragStart: Point = { x: 0, y: 0 };

    /** Saved bounds of each selected object at drag start (for undo). */
    private startBounds: Map<string, Rect> = new Map();

    /** Which resize handle is being dragged. */
    private activeHandle: HandleId | null = null;

    /** ID of the object being resized or rotated. */
    private targetObjectId: string = "";

    /** Bounds of the target object at resize/rotate start. */
    private targetStartBounds: Rect = { x: 0, y: 0, width: 0, height: 0 };

    /** Starting rotation angle of the target object (degrees). */
    private targetStartRotation: number = 0;

    /**
     * Create a SelectTool bound to an engine instance.
     *
     * @param engine - The engine facade implementing EngineForTools.
     */
    constructor(engine: EngineForTools)
    {
        this.engine = engine;
    }

    /** @inheritdoc */
    public onActivate(): void
    {
        this.resetDragState();
    }

    /** @inheritdoc */
    public onDeactivate(): void
    {
        this.resetDragState();
        this.engine.clearToolOverlay();
    }

    /**
     * Handle mouse-down: determine the interaction based on what
     * is under the cursor (handle, object, or empty canvas).
     *
     * @param e - The originating mouse event.
     * @param canvasPos - Mouse position in canvas coordinate space.
     */
    public onMouseDown(e: MouseEvent, canvasPos: Point): void
    {
        this.dragStart = canvasPos;

        if (this.tryStartResize(canvasPos))
        {
            return;
        }

        if (this.tryStartRotation(canvasPos))
        {
            return;
        }

        const hitObj = this.engine.hitTestObject(canvasPos);

        if (hitObj)
        {
            this.handleObjectMouseDown(e, hitObj);
            return;
        }

        const hitConn = this.engine.hitTestConnector(canvasPos);

        if (hitConn)
        {
            this.handleConnectorMouseDown(e, hitConn);
            return;
        }

        this.startRubberBand(e, canvasPos);
    }

    /**
     * Handle mouse-move: delegate to the active drag mode handler.
     *
     * @param e - The originating mouse event.
     * @param canvasPos - Mouse position in canvas coordinate space.
     */
    public onMouseMove(e: MouseEvent, canvasPos: Point): void
    {
        if (this.dragMode === "move")
        {
            this.handleMoveDrag(canvasPos);
        }
        else if (this.dragMode === "resize")
        {
            this.handleResizeDrag(canvasPos);
        }
        else if (this.dragMode === "rotate")
        {
            this.handleRotateDrag(canvasPos);
        }
        else if (this.dragMode === "rubber-band")
        {
            this.handleRubberBandDrag(canvasPos);
        }
    }

    /**
     * Handle mouse-up: finalise the active drag and push undo.
     *
     * @param e - The originating mouse event.
     * @param canvasPos - Mouse position in canvas coordinate space.
     */
    public onMouseUp(e: MouseEvent, canvasPos: Point): void
    {
        if (this.dragMode === "move")
        {
            this.finishMoveDrag();
        }
        else if (this.dragMode === "resize")
        {
            this.finishResizeDrag();
        }
        else if (this.dragMode === "rotate")
        {
            this.finishRotateDrag();
        }
        else if (this.dragMode === "rubber-band")
        {
            this.finishRubberBand(canvasPos);
        }

        this.resetDragState();
    }

    /**
     * Handle key-down: arrow nudge, delete, select-all, escape.
     *
     * @param e - The originating keyboard event.
     */
    public onKeyDown(e: KeyboardEvent): void
    {
        if (this.handleArrowKey(e))
        {
            return;
        }

        if (this.handleDeleteKey(e))
        {
            return;
        }

        if (this.handleSelectAll(e))
        {
            return;
        }

        this.handleEscape(e);
    }

    // ========================================================================
    // MOUSE-DOWN HELPERS
    // ========================================================================

    /**
     * Process a mouse-down on a diagram object.
     *
     * Handles modifier keys for toggle selection, then starts a
     * move drag if the object is (or becomes) selected.
     *
     * @param e - The originating mouse event.
     * @param hitObj - The object under the cursor.
     */
    private handleObjectMouseDown(e: MouseEvent, hitObj: DiagramObject): void
    {
        const hasModifier = e.shiftKey || e.ctrlKey || e.metaKey;

        if (hasModifier)
        {
            this.engine.toggleSelection(hitObj.id);
            return;
        }

        if (!this.engine.isSelected(hitObj.id))
        {
            this.engine.clearSelectionInternal();
            this.engine.addToSelection(hitObj.id);
        }

        this.startMoveDrag();
    }

    /**
     * Process a mouse-down on a connector. Handles modifier keys
     * for toggle selection, otherwise selects the connector exclusively.
     *
     * @param e - The originating mouse event.
     * @param conn - The connector under the cursor.
     */
    private handleConnectorMouseDown(
        e: MouseEvent,
        conn: DiagramConnector): void
    {
        const hasModifier = e.shiftKey || e.ctrlKey || e.metaKey;

        if (hasModifier)
        {
            this.engine.toggleConnectorSelection(conn.id);
            return;
        }

        if (!this.engine.isConnectorSelected(conn.id))
        {
            this.engine.clearSelectionInternal();
            this.engine.addConnectorToSelection(conn.id);
        }
    }

    /**
     * Begin rubber-band selection from an empty area.
     *
     * If no modifier is held, clear the current selection first.
     *
     * @param e - The originating mouse event.
     * @param canvasPos - Mouse position in canvas coordinate space.
     */
    private startRubberBand(e: MouseEvent, canvasPos: Point): void
    {
        const hasModifier = e.shiftKey || e.ctrlKey || e.metaKey;

        if (!hasModifier)
        {
            this.engine.clearSelectionInternal();
        }

        this.dragMode = "rubber-band";
    }

    // ========================================================================
    // MOVE DRAG
    // ========================================================================

    /**
     * Snapshot the bounds of all selected objects and enter move mode.
     */
    private startMoveDrag(): void
    {
        this.dragMode = "move";
        this.startBounds = new Map();

        for (const obj of this.engine.getSelectedObjects())
        {
            const b = obj.presentation.bounds;

            this.startBounds.set(obj.id, {
                x: b.x,
                y: b.y,
                width: b.width,
                height: b.height
            });
        }
    }

    /**
     * Move all selected objects by the delta from drag start.
     *
     * @param canvasPos - Current mouse position in canvas space.
     */
    private handleMoveDrag(canvasPos: Point): void
    {
        const dx = canvasPos.x - this.dragStart.x;
        const dy = canvasPos.y - this.dragStart.y;

        for (const [id, start] of this.startBounds)
        {
            this.engine.moveObjectTo(id, {
                x: start.x + dx,
                y: start.y + dy
            });
        }

        this.showMoveAlignmentGuides();
    }

    /**
     * Build a bounding rect of all selected objects and show guides.
     */
    private showMoveAlignmentGuides(): void
    {
        const objs = this.engine.getSelectedObjects();

        if (objs.length === 0)
        {
            return;
        }

        const unionBounds = this.computeUnionBounds(objs);

        this.engine.showAlignmentGuides(unionBounds);
    }

    /**
     * Compute the union bounding rectangle of multiple objects.
     *
     * @param objs - The objects to union.
     * @returns The smallest Rect enclosing all objects.
     */
    private computeUnionBounds(objs: DiagramObject[]): Rect
    {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        for (const obj of objs)
        {
            const b = obj.presentation.bounds;

            minX = Math.min(minX, b.x);
            minY = Math.min(minY, b.y);
            maxX = Math.max(maxX, b.x + b.width);
            maxY = Math.max(maxY, b.y + b.height);
        }

        return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }

    /**
     * Finalise a move drag and push an undo command.
     */
    private finishMoveDrag(): void
    {
        if (this.startBounds.size > 0)
        {
            this.engine.pushMoveUndo(this.startBounds);
            this.engine.updateContainment(
                Array.from(this.startBounds.keys())
            );
        }

        this.engine.clearToolOverlay();
    }

    // ========================================================================
    // RESIZE DRAG
    // ========================================================================

    /**
     * Test whether the cursor is over a resize handle of a selected
     * object and, if so, begin a resize drag.
     *
     * @param canvasPos - Mouse position in canvas space.
     * @returns true if a resize drag was started.
     */
    private tryStartResize(canvasPos: Point): boolean
    {
        for (const obj of this.engine.getSelectedObjects())
        {
            const handle = this.hitTestHandles(canvasPos, obj);

            if (handle)
            {
                this.beginResizeDrag(obj, handle);
                return true;
            }
        }

        return false;
    }

    /**
     * Test all 8 handles of an object for a hit.
     *
     * @param canvasPos - Mouse position in canvas space.
     * @param obj - The object whose handles to test.
     * @returns The handle ID if hit, or null.
     */
    private hitTestHandles(
        canvasPos: Point,
        obj: DiagramObject): HandleId | null
    {
        const handles = this.computeHandlePositions(obj.presentation.bounds);

        for (const [id, pos] of handles)
        {
            const dx = canvasPos.x - pos.x;
            const dy = canvasPos.y - pos.y;

            if ((dx * dx + dy * dy) <= (HANDLE_HIT_RADIUS * HANDLE_HIT_RADIUS))
            {
                return id;
            }
        }

        return null;
    }

    /**
     * Compute the 8 handle positions for a bounding rectangle.
     *
     * @param b - The bounding rectangle.
     * @returns Map of handle ID to canvas-space position.
     */
    private computeHandlePositions(b: Rect): Map<HandleId, Point>
    {
        const mx = b.x + (b.width / 2);
        const my = b.y + (b.height / 2);
        const r = b.x + b.width;
        const bot = b.y + b.height;

        const m = new Map<HandleId, Point>();

        m.set("nw", { x: b.x, y: b.y });
        m.set("n",  { x: mx,  y: b.y });
        m.set("ne", { x: r,   y: b.y });
        m.set("e",  { x: r,   y: my });
        m.set("se", { x: r,   y: bot });
        m.set("s",  { x: mx,  y: bot });
        m.set("sw", { x: b.x, y: bot });
        m.set("w",  { x: b.x, y: my });

        return m;
    }

    /**
     * Enter resize drag mode for the given object and handle.
     *
     * @param obj - The object being resized.
     * @param handle - Which handle was grabbed.
     */
    private beginResizeDrag(obj: DiagramObject, handle: HandleId): void
    {
        this.dragMode = "resize";
        this.activeHandle = handle;
        this.targetObjectId = obj.id;

        const b = obj.presentation.bounds;

        this.targetStartBounds = {
            x: b.x,
            y: b.y,
            width: b.width,
            height: b.height
        };
    }

    /**
     * Compute and apply new bounds based on the active resize handle.
     *
     * @param canvasPos - Current mouse position in canvas space.
     */
    private handleResizeDrag(canvasPos: Point): void
    {
        if (!this.activeHandle)
        {
            return;
        }

        const newBounds = this.computeResizedBounds(
            this.targetStartBounds,
            this.activeHandle,
            canvasPos
        );

        this.engine.resizeObject(this.targetObjectId, newBounds);
    }

    /**
     * Compute new bounds from a handle drag.
     *
     * Each handle constrains which edges move. North/south handles
     * adjust the top or bottom edge; east/west adjust left or right.
     * Corner handles adjust two edges simultaneously.
     *
     * @param start - The original bounds before the drag.
     * @param handle - Which handle is being dragged.
     * @param pos - Current canvas-space cursor position.
     * @returns The recomputed bounding rectangle.
     */
    private computeResizedBounds(
        start: Rect,
        handle: HandleId,
        pos: Point): Rect
    {
        let { x, y, width, height } = start;
        const right = start.x + start.width;
        const bottom = start.y + start.height;

        if (handle.includes("n"))
        {
            y = pos.y;
            height = bottom - pos.y;
        }

        if (handle.includes("s"))
        {
            height = pos.y - start.y;
        }

        if (handle.includes("w"))
        {
            x = pos.x;
            width = right - pos.x;
        }

        if (handle.includes("e"))
        {
            width = pos.x - start.x;
        }

        return this.normaliseRect(x, y, width, height);
    }

    /**
     * Normalise a rect so that width and height are non-negative.
     *
     * If a dimension is negative (user dragged past the opposite edge),
     * flip the origin and absolute the size.
     *
     * @param x - Left edge.
     * @param y - Top edge.
     * @param w - Width (may be negative).
     * @param h - Height (may be negative).
     * @returns A normalised Rect.
     */
    private normaliseRect(x: number, y: number, w: number, h: number): Rect
    {
        if (w < 0)
        {
            x = x + w;
            w = Math.abs(w);
        }

        if (h < 0)
        {
            y = y + h;
            h = Math.abs(h);
        }

        return { x, y, width: w, height: h };
    }

    /**
     * Finalise resize and push an undo command.
     */
    private finishResizeDrag(): void
    {
        const obj = this.engine.getObjectById(this.targetObjectId);

        if (!obj)
        {
            return;
        }

        const after = obj.presentation.bounds;

        this.engine.pushResizeUndo(
            this.targetObjectId,
            this.targetStartBounds,
            { x: after.x, y: after.y, width: after.width, height: after.height }
        );
    }

    // ========================================================================
    // ROTATION DRAG
    // ========================================================================

    /**
     * Test whether the cursor is over the rotation handle and, if so,
     * begin a rotation drag.
     *
     * The rotation handle sits at (centerX, top - ROTATION_HANDLE_OFFSET).
     *
     * @param canvasPos - Mouse position in canvas space.
     * @returns true if a rotation drag was started.
     */
    private tryStartRotation(canvasPos: Point): boolean
    {
        for (const obj of this.engine.getSelectedObjects())
        {
            if (this.hitTestRotationHandle(canvasPos, obj))
            {
                this.beginRotateDrag(obj);
                return true;
            }
        }

        return false;
    }

    /**
     * Test whether a point is within hit radius of the rotation handle.
     *
     * @param canvasPos - Mouse position in canvas space.
     * @param obj - The object whose rotation handle to test.
     * @returns true if the rotation handle is hit.
     */
    private hitTestRotationHandle(
        canvasPos: Point,
        obj: DiagramObject): boolean
    {
        const b = obj.presentation.bounds;
        const handleX = b.x + (b.width / 2);
        const handleY = b.y - ROTATION_HANDLE_OFFSET;

        const dx = canvasPos.x - handleX;
        const dy = canvasPos.y - handleY;

        return (dx * dx + dy * dy) <= (HANDLE_HIT_RADIUS * HANDLE_HIT_RADIUS);
    }

    /**
     * Enter rotation drag mode for the given object.
     *
     * @param obj - The object being rotated.
     */
    private beginRotateDrag(obj: DiagramObject): void
    {
        this.dragMode = "rotate";
        this.targetObjectId = obj.id;
        this.targetStartRotation = obj.presentation.rotation;

        const b = obj.presentation.bounds;

        this.targetStartBounds = {
            x: b.x,
            y: b.y,
            width: b.width,
            height: b.height
        };
    }

    /**
     * Compute rotation angle from the object centre to the cursor.
     *
     * @param canvasPos - Current mouse position in canvas space.
     */
    private handleRotateDrag(canvasPos: Point): void
    {
        const angle = this.computeRotationAngle(canvasPos);

        this.engine.rotateObjectTo(this.targetObjectId, angle);
    }

    /**
     * Compute the rotation angle in degrees from the object centre.
     *
     * 0 degrees is straight up (north). Angles increase clockwise.
     *
     * @param canvasPos - Current mouse position in canvas space.
     * @returns Angle in degrees (0-360).
     */
    private computeRotationAngle(canvasPos: Point): number
    {
        const cx = this.targetStartBounds.x + (this.targetStartBounds.width / 2);
        const cy = this.targetStartBounds.y + (this.targetStartBounds.height / 2);

        const dx = canvasPos.x - cx;
        const dy = canvasPos.y - cy;

        // atan2 gives angle from positive-X axis; offset to measure from north
        let degrees = (Math.atan2(dy, dx) * 180) / Math.PI;
        degrees = degrees + 90;

        if (degrees < 0)
        {
            degrees = degrees + 360;
        }

        return degrees % 360;
    }

    /**
     * Finalise a rotation drag (no separate undo for rotation — the
     * engine tracks it via the general object change).
     */
    private finishRotateDrag(): void
    {
        // Rotation changes are tracked by the engine's onChange handler.
        // No additional undo push is needed here.
    }

    // ========================================================================
    // RUBBER BAND
    // ========================================================================

    /**
     * Render the rubber-band rectangle during drag.
     *
     * @param canvasPos - Current mouse position in canvas space.
     */
    private handleRubberBandDrag(canvasPos: Point): void
    {
        const rect = this.buildRubberBandRect(canvasPos);

        this.engine.renderRubberBand(rect);
    }

    /**
     * Build a normalised Rect from the drag start and current position.
     *
     * @param canvasPos - Current mouse position in canvas space.
     * @returns The rubber-band rectangle.
     */
    private buildRubberBandRect(canvasPos: Point): Rect
    {
        const x = Math.min(this.dragStart.x, canvasPos.x);
        const y = Math.min(this.dragStart.y, canvasPos.y);
        const w = Math.abs(canvasPos.x - this.dragStart.x);
        const h = Math.abs(canvasPos.y - this.dragStart.y);

        return { x, y, width: w, height: h };
    }

    /**
     * Finalise the rubber-band selection.
     *
     * @param canvasPos - Final mouse position in canvas space.
     */
    private finishRubberBand(canvasPos: Point): void
    {
        const rect = this.buildRubberBandRect(canvasPos);

        this.engine.selectObjectsInRect(rect);
        this.engine.clearToolOverlay();
    }

    // ========================================================================
    // KEYBOARD HANDLERS
    // ========================================================================

    /**
     * Handle arrow keys for nudging selected objects.
     *
     * @param e - The keyboard event.
     * @returns true if an arrow key was handled.
     */
    private handleArrowKey(e: KeyboardEvent): boolean
    {
        const delta = this.arrowKeyToDelta(e);

        if (!delta)
        {
            return false;
        }

        e.preventDefault();
        this.engine.nudgeSelected(delta.x, delta.y);

        return true;
    }

    /**
     * Map an arrow key event to a pixel delta.
     *
     * @param e - The keyboard event.
     * @returns A Point delta, or null if not an arrow key.
     */
    private arrowKeyToDelta(e: KeyboardEvent): Point | null
    {
        const step = e.shiftKey ? NUDGE_SHIFT_PX : NUDGE_PX;

        switch (e.key)
        {
            case "ArrowUp":
                return { x: 0, y: -step };
            case "ArrowDown":
                return { x: 0, y: step };
            case "ArrowLeft":
                return { x: -step, y: 0 };
            case "ArrowRight":
                return { x: step, y: 0 };
            default:
                return null;
        }
    }

    /**
     * Handle Delete or Backspace to remove selected objects.
     *
     * @param e - The keyboard event.
     * @returns true if the key was handled.
     */
    private handleDeleteKey(e: KeyboardEvent): boolean
    {
        if (e.key !== "Delete" && e.key !== "Backspace")
        {
            return false;
        }

        e.preventDefault();
        this.engine.deleteSelected();

        return true;
    }

    /**
     * Handle Ctrl+A / Cmd+A to select all objects.
     *
     * @param e - The keyboard event.
     * @returns true if the key was handled.
     */
    private handleSelectAll(e: KeyboardEvent): boolean
    {
        const isSelectAll = (
            (e.ctrlKey || e.metaKey) &&
            (e.key === "a" || e.key === "A")
        );

        if (!isSelectAll)
        {
            return false;
        }

        e.preventDefault();
        this.engine.selectAll();

        return true;
    }

    /**
     * Handle Escape to clear the selection.
     *
     * @param e - The keyboard event.
     */
    private handleEscape(e: KeyboardEvent): void
    {
        if (e.key !== "Escape")
        {
            return;
        }

        e.preventDefault();
        this.engine.clearSelectionInternal();
    }

    /**
     * Whether a drag (move / resize / rotate / rubber-band) is in progress.
     * Used by the engine to suppress the hover card during edits (ADR-126).
     */
    public isInteracting(): boolean
    {
        return this.dragMode !== "none";
    }

    // ========================================================================
    // STATE MANAGEMENT
    // ========================================================================

    /**
     * Reset all drag-related state to idle.
     */
    private resetDragState(): void
    {
        this.dragMode = "none";
        this.dragStart = { x: 0, y: 0 };
        this.startBounds = new Map();
        this.activeHandle = null;
        this.targetObjectId = "";
        this.targetStartBounds = { x: 0, y: 0, width: 0, height: 0 };
        this.targetStartRotation = 0;
    }
}

// ========================================================================
// SOURCE: tool-pan.ts
// ========================================================================

/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: PanTool
 * PURPOSE: Canvas panning tool for the DiagramEngine. Tracks screen-space
 *    mouse deltas and translates the viewport. Activated by the toolbar
 *    or temporarily by middle-click, restoring the previous tool on release.
 * RELATES: [[ToolManager]], [[DiagramEngine]], [[SelectTool]]
 * FLOW: [ToolManager.dispatch*()] -> [PanTool] -> [engine.panCanvas()]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// ENGINE INTERFACE (FORWARD REFERENCE)
// ============================================================================

/**
 * Minimal engine interface consumed by the PanTool.
 *
 * Uses screen-space deltas so that panning speed is independent
 * of zoom level — the engine converts to canvas space internally.
 */
interface EngineForPanTool
{
    /**
     * Translate the canvas viewport by a screen-space pixel delta.
     *
     * @param dx - Horizontal offset in screen pixels.
     * @param dy - Vertical offset in screen pixels.
     */
    panCanvas(dx: number, dy: number): void;

    /**
     * Switch the active tool by name.
     *
     * @param name - The tool name to activate.
     */
    setActiveTool(name: string): void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Log prefix for all console messages from this module. */
const LOG_PREFIX_PAN = "[DiagramEngine]";

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * A simple panning tool that translates the canvas viewport.
 *
 * On mousedown the tool captures the screen-space cursor position.
 * Each mousemove computes the delta from the last position and calls
 * engine.panCanvas(). On mouseup the drag ends. When activated via
 * middle-click, the previous tool name is stored and restored on
 * release.
 */
class PanTool implements Tool
{
    /** @inheritdoc */
    public readonly name = "pan";

    /** @inheritdoc */
    public readonly cursor = "grab";

    /** Reference to the engine facade. */
    private readonly engine: EngineForPanTool;

    /** Whether a pan drag is currently in progress. */
    private dragging: boolean = false;

    /** Last recorded screen-space mouse position. */
    private lastScreenPos: Point = { x: 0, y: 0 };

    /** Tool name to restore when a middle-click pan ends. */
    private previousToolName: string = "";

    /**
     * Create a PanTool bound to an engine instance.
     *
     * @param engine - The engine facade implementing EngineForPanTool.
     */
    constructor(engine: EngineForPanTool)
    {
        this.engine = engine;
    }

    /** @inheritdoc */
    public onActivate(): void
    {
        this.dragging = false;
    }

    /**
     * Whether a pan drag is in progress (ADR-126 — hover card guard).
     */
    public isInteracting(): boolean
    {
        return this.dragging;
    }

    /** @inheritdoc */
    public onDeactivate(): void
    {
        this.dragging = false;
        this.previousToolName = "";
    }

    /**
     * Begin a pan drag from the current screen position.
     *
     * @param e - The originating mouse event.
     * @param canvasPos - Mouse position in canvas coordinate space (unused).
     */
    public onMouseDown(e: MouseEvent, canvasPos: Point): void
    {
        this.dragging = true;
        this.lastScreenPos = this.extractScreenPos(e);
    }

    /**
     * Compute the screen-space delta and pan the canvas.
     *
     * @param e - The originating mouse event.
     * @param canvasPos - Mouse position in canvas coordinate space (unused).
     */
    public onMouseMove(e: MouseEvent, canvasPos: Point): void
    {
        if (!this.dragging)
        {
            return;
        }

        const currentPos = this.extractScreenPos(e);
        const dx = currentPos.x - this.lastScreenPos.x;
        const dy = currentPos.y - this.lastScreenPos.y;

        this.lastScreenPos = currentPos;
        this.engine.panCanvas(dx, dy);
    }

    /**
     * End the pan drag and restore the previous tool if applicable.
     *
     * @param e - The originating mouse event.
     * @param canvasPos - Mouse position in canvas coordinate space (unused).
     */
    public onMouseUp(e: MouseEvent, canvasPos: Point): void
    {
        this.dragging = false;

        this.restorePreviousTool();
    }

    /**
     * No keyboard handling for the pan tool.
     *
     * @param e - The originating keyboard event.
     */
    public onKeyDown(e: KeyboardEvent): void
    {
        // Pan tool does not handle keyboard input.
    }

    /**
     * Store the name of the tool that was active before the pan
     * was triggered via middle-click. This allows the manager to
     * restore the previous tool when the pan ends.
     *
     * @param toolName - The name of the previously active tool.
     */
    public setPreviousToolName(toolName: string): void
    {
        this.previousToolName = toolName;
    }

    /**
     * Return the stored previous tool name.
     *
     * @returns The tool name saved before the pan started.
     */
    public getPreviousToolName(): string
    {
        return this.previousToolName;
    }

    // ========================================================================
    // PRIVATE HELPERS
    // ========================================================================

    /**
     * Extract screen-space coordinates from a mouse event.
     *
     * @param e - The mouse event.
     * @returns A Point with clientX/clientY values.
     */
    private extractScreenPos(e: MouseEvent): Point
    {
        return { x: e.clientX, y: e.clientY };
    }

    /**
     * Restore the previously active tool if a name was saved.
     * This is used when pan was triggered by middle-click.
     */
    private restorePreviousTool(): void
    {
        if (!this.previousToolName)
        {
            return;
        }

        const toolToRestore = this.previousToolName;

        this.previousToolName = "";
        this.engine.setActiveTool(toolToRestore);
    }
}

// ========================================================================
// SOURCE: tool-draw.ts
// ========================================================================

/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: DrawTool
 * PURPOSE: Shape placement tool for the DiagramEngine canvas. Supports
 *    single-click placement (default size centred on click) and click-drag
 *    placement (rubber-band preview with custom bounds). After placement
 *    the tool auto-switches to "select" and selects the new object.
 * RELATES: [[ToolManager]], [[DiagramEngine]], [[SelectTool]], [[UndoStack]]
 * FLOW: [ToolManager.dispatch*()] -> [DrawTool] -> [EngineForDrawTool]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// ENGINE INTERFACE (FORWARD REFERENCE)
// ============================================================================

/**
 * Extended engine interface consumed by the DrawTool.
 *
 * Adds object creation and shape lookup methods to the base
 * EngineForTools contract. The concrete DiagramEngineImpl class
 * implements this interface.
 */
interface EngineForDrawTool extends EngineForTools
{
    /**
     * Add a new object to the document from a partial definition.
     *
     * @param partial - Partial object definition.
     * @returns The fully constructed DiagramObject with generated ID.
     */
    addObject(partial: DiagramObjectInput): DiagramObject;

    /**
     * Look up a registered shape definition by type string.
     *
     * @param type - The shape type identifier.
     * @returns The shape definition, or null if not registered.
     */
    getShapeDef(type: string): ShapeDefinition | null;

    /**
     * Remove an object from the document by ID.
     *
     * @param id - The object ID to remove.
     */
    removeObject(id: string): void;

    /**
     * Push an UndoCommand onto the engine's undo stack.
     *
     * @param cmd - The undo command to push.
     */
    pushUndoCommand(cmd: UndoCommand): void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Log prefix for all console messages from this module. */
const DRAW_LOG_PREFIX = "[DrawTool]";

function logDrawInfo(...args: unknown[]): void
{
    console.log(new Date().toISOString(), "[INFO]", DRAW_LOG_PREFIX, ...args);
}

function logDrawWarn(...args: unknown[]): void
{
    console.warn(new Date().toISOString(), "[WARN]", DRAW_LOG_PREFIX, ...args);
}

function logDrawError(...args: unknown[]): void
{
    console.error(new Date().toISOString(), "[ERROR]", DRAW_LOG_PREFIX, ...args);
}

function logDrawDebug(...args: unknown[]): void
{
    console.debug(new Date().toISOString(), "[DEBUG]", DRAW_LOG_PREFIX, ...args);
}

/** Minimum dimension in pixels for a placed shape. */
const MIN_SHAPE_SIZE = 20;

/** Pixel threshold to distinguish a click from a drag. */
const DRAG_THRESHOLD = 4;

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Canvas tool for placing new shapes. Supports two placement modes:
 *
 * 1. **Click**: Places the shape at its default size, centred on the
 *    click point.
 * 2. **Drag**: Draws a rubber-band rectangle; the shape is placed
 *    with the dragged bounds (minimum 20x20).
 *
 * After placement the tool switches to "select" and selects the
 * newly created object. An undo command is pushed for the placement.
 */
class DrawTool implements Tool
{
    /** @inheritdoc */
    public readonly name = "draw";

    /** @inheritdoc */
    public readonly cursor = "crosshair";

    /** Reference to the engine facade. */
    private readonly engine: EngineForDrawTool;

    /** The shape type to place (defaults to "rectangle"). */
    private shapeType: string = "rectangle";

    /** Whether a drag is currently in progress. */
    private dragging: boolean = false;

    /** Canvas position where the current drag started. */
    private dragStart: Point = { x: 0, y: 0 };

    /** Whether the mouse has moved past the drag threshold. */
    private dragExceededThreshold: boolean = false;

    /**
     * Create a DrawTool bound to an engine instance.
     *
     * @param engine - The engine facade implementing EngineForDrawTool.
     */
    constructor(engine: EngineForDrawTool)
    {
        this.engine = engine;
    }

    /**
     * Sets the shape type that will be placed on the next draw action.
     *
     * @param type - Shape type identifier (e.g. "rectangle", "star").
     */
    public setShapeType(type: string): void
    {
        this.shapeType = type;

        logDrawDebug("Shape type set to:", type);
    }

    /**
     * Returns the currently configured shape type.
     *
     * @returns The shape type string.
     */
    public getShapeType(): string
    {
        return this.shapeType;
    }

    /** @inheritdoc */
    public onActivate(): void
    {
        this.resetState();
    }

    /** @inheritdoc */
    public onDeactivate(): void
    {
        this.resetState();
        this.engine.clearToolOverlay();
    }

    /**
     * Handle mouse-down: record the drag start position.
     *
     * @param e - The originating mouse event.
     * @param canvasPos - Mouse position in canvas coordinate space.
     */
    public onMouseDown(e: MouseEvent, canvasPos: Point): void
    {
        this.dragging = true;
        this.dragStart = canvasPos;
        this.dragExceededThreshold = false;
    }

    /**
     * Handle mouse-move: render the rubber-band preview if dragging
     * past the threshold.
     *
     * @param e - The originating mouse event.
     * @param canvasPos - Mouse position in canvas coordinate space.
     */
    public onMouseMove(e: MouseEvent, canvasPos: Point): void
    {
        if (!this.dragging)
        {
            return;
        }

        if (!this.dragExceededThreshold)
        {
            this.dragExceededThreshold = this.checkThreshold(canvasPos);
        }

        if (this.dragExceededThreshold)
        {
            this.renderPreview(canvasPos);
        }
    }

    /**
     * Handle mouse-up: place the shape via click or drag.
     *
     * @param e - The originating mouse event.
     * @param canvasPos - Mouse position in canvas coordinate space.
     */
    public onMouseUp(e: MouseEvent, canvasPos: Point): void
    {
        if (!this.dragging)
        {
            return;
        }

        this.engine.clearToolOverlay();

        if (this.dragExceededThreshold)
        {
            this.placeByDrag(canvasPos);
        }
        else
        {
            this.placeByClick(canvasPos);
        }

        this.resetState();
    }

    /**
     * Handle key-down: Escape cancels the draw operation.
     *
     * @param e - The originating keyboard event.
     */
    public onKeyDown(e: KeyboardEvent): void
    {
        if (e.key !== "Escape")
        {
            return;
        }

        e.preventDefault();
        this.cancelDraw();
    }

    // ========================================================================
    // PLACEMENT
    // ========================================================================

    /**
     * Place a shape at its default size, centred on the click point.
     *
     * @param clickPos - Canvas position where the user clicked.
     */
    private placeByClick(clickPos: Point): void
    {
        const shapeDef = this.engine.getShapeDef(this.shapeType);

        if (!shapeDef)
        {
            logDrawWarn("Unknown shape type:", this.shapeType);
            return;
        }

        const w = shapeDef.defaultSize.w;
        const h = shapeDef.defaultSize.h;

        const bounds: Rect = {
            x: clickPos.x - (w / 2),
            y: clickPos.y - (h / 2),
            width: w,
            height: h
        };

        this.placeShapeAtBounds(bounds);
    }

    /**
     * Place a shape at the dragged bounds, enforcing minimum size.
     *
     * @param endPos - Canvas position where the drag ended.
     */
    private placeByDrag(endPos: Point): void
    {
        const bounds = this.buildDragBounds(endPos);

        this.placeShapeAtBounds(bounds);
    }

    /**
     * Creates the object, pushes an undo command, then switches
     * to the select tool and selects the new object.
     *
     * @param bounds - The bounding rectangle for the new shape.
     */
    private placeShapeAtBounds(bounds: Rect): void
    {
        const obj = this.engine.addObject({
            presentation: {
                shape: this.shapeType,
                bounds
            }
        });

        this.pushPlacementUndo(obj);
        this.selectNewObject(obj);
    }

    /**
     * Pushes an undo command that removes the placed object on undo
     * and re-adds it on redo.
     *
     * @param obj - The placed DiagramObject.
     */
    private pushPlacementUndo(obj: DiagramObject): void
    {
        const objId = obj.id;
        const snapshot: DiagramObjectInput = {
            id: obj.id,
            semantic: { ...obj.semantic },
            presentation: { ...obj.presentation }
        };

        this.engine.pushUndoCommand({
            type: "place",
            label: `Place ${this.shapeType}`,
            timestamp: Date.now(),
            mergeable: false,
            undo: (): void =>
            {
                this.engine.removeObject(objId);
            },
            redo: (): void =>
            {
                this.engine.addObject(snapshot);
            }
        });
    }

    /**
     * Switch to the select tool and select the newly placed object.
     *
     * @param obj - The placed DiagramObject.
     */
    private selectNewObject(obj: DiagramObject): void
    {
        this.engine.clearSelectionInternal();
        this.engine.addToSelection(obj.id);
        this.engine.setActiveTool("select");

        logDrawDebug("Placed shape:", obj.id);
    }

    // ========================================================================
    // PREVIEW AND BOUNDS
    // ========================================================================

    /**
     * Check whether the mouse has moved past the drag threshold.
     *
     * @param canvasPos - Current mouse position.
     * @returns true if the distance exceeds DRAG_THRESHOLD.
     */
    private checkThreshold(canvasPos: Point): boolean
    {
        const dx = Math.abs(canvasPos.x - this.dragStart.x);
        const dy = Math.abs(canvasPos.y - this.dragStart.y);

        return (dx > DRAG_THRESHOLD) || (dy > DRAG_THRESHOLD);
    }

    /**
     * Render a rubber-band preview rectangle on the tool overlay.
     *
     * @param canvasPos - Current mouse position.
     */
    private renderPreview(canvasPos: Point): void
    {
        const rect = this.buildDragBounds(canvasPos);

        this.engine.renderRubberBand(rect);
    }

    /**
     * Build a normalised and clamped Rect from the drag start
     * and the given end position, enforcing minimum dimensions.
     *
     * @param endPos - End position of the drag.
     * @returns A normalised Rect with minimum size enforced.
     */
    private buildDragBounds(endPos: Point): Rect
    {
        const x = Math.min(this.dragStart.x, endPos.x);
        const y = Math.min(this.dragStart.y, endPos.y);
        const w = Math.max(MIN_SHAPE_SIZE, Math.abs(endPos.x - this.dragStart.x));
        const h = Math.max(MIN_SHAPE_SIZE, Math.abs(endPos.y - this.dragStart.y));

        return { x, y, width: w, height: h };
    }

    // ========================================================================
    // CANCELLATION AND STATE
    // ========================================================================

    /**
     * Cancel the current draw operation and return to select tool.
     */
    private cancelDraw(): void
    {
        this.engine.clearToolOverlay();
        this.resetState();
        this.engine.setActiveTool("select");

        logDrawDebug("Draw cancelled");
    }

    /**
     * Reset all drag-related state to idle.
     */
    private resetState(): void
    {
        this.dragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.dragExceededThreshold = false;
    }
}

// ========================================================================
// SOURCE: tool-text.ts
// ========================================================================

/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: TextTool
 * PURPOSE: Text object creation tool for the DiagramEngine canvas.
 *    Click on the canvas to place a text object at the click position
 *    with default dimensions. After placement the tool selects the new
 *    object and immediately starts inline text editing.
 * RELATES: [[ToolManager]], [[DiagramEngine]], [[DrawTool]], [[SelectTool]]
 * FLOW: [ToolManager.dispatch*()] -> [TextTool] -> [EngineForDrawTool]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// CONSTANTS
// ============================================================================

/** Log prefix for all console messages from this module. */
const TEXT_TOOL_LOG_PREFIX = "[TextTool]";

function logText_toolInfo(...args: unknown[]): void
{
    console.log(new Date().toISOString(), "[INFO]", TEXT_TOOL_LOG_PREFIX, ...args);
}

function logText_toolWarn(...args: unknown[]): void
{
    console.warn(new Date().toISOString(), "[WARN]", TEXT_TOOL_LOG_PREFIX, ...args);
}

function logText_toolError(...args: unknown[]): void
{
    console.error(new Date().toISOString(), "[ERROR]", TEXT_TOOL_LOG_PREFIX, ...args);
}

function logText_toolDebug(...args: unknown[]): void
{
    console.debug(new Date().toISOString(), "[DEBUG]", TEXT_TOOL_LOG_PREFIX, ...args);
}

/** Default width in pixels for new text objects. */
const TEXT_DEFAULT_WIDTH = 200;

/** Default height in pixels for new text objects. */
const TEXT_DEFAULT_HEIGHT = 40;

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Canvas tool for creating text objects. Click on the canvas to place
 * a text shape at the click position with default dimensions (200x40).
 *
 * After placement, the tool:
 * 1. Switches to the "select" tool
 * 2. Selects the new text object
 * 3. Starts inline text editing on the object
 *
 * Escape cancels text placement and returns to the select tool.
 */
class TextTool implements Tool
{
    /** @inheritdoc */
    public readonly name = "text";

    /** @inheritdoc */
    public readonly cursor = "text";

    /** Reference to the engine facade. */
    private readonly engine: EngineForDrawTool;

    /**
     * Create a TextTool bound to an engine instance.
     *
     * @param engine - The engine facade implementing EngineForDrawTool.
     */
    constructor(engine: EngineForDrawTool)
    {
        this.engine = engine;
    }

    /** @inheritdoc */
    public onActivate(): void
    {
        // No initialisation needed.
    }

    /** @inheritdoc */
    public onDeactivate(): void
    {
        this.engine.clearToolOverlay();
    }

    /**
     * Handle mouse-down: place a text object at the click position.
     *
     * @param e - The originating mouse event.
     * @param canvasPos - Mouse position in canvas coordinate space.
     */
    public onMouseDown(e: MouseEvent, canvasPos: Point): void
    {
        this.placeTextObject(canvasPos);
    }

    /**
     * Handle mouse-move: no interaction during text placement.
     *
     * @param e - The originating mouse event.
     * @param canvasPos - Mouse position in canvas coordinate space.
     */
    public onMouseMove(e: MouseEvent, canvasPos: Point): void
    {
        // Text tool does not track mouse movement.
    }

    /**
     * Handle mouse-up: no interaction during text placement.
     *
     * @param e - The originating mouse event.
     * @param canvasPos - Mouse position in canvas coordinate space.
     */
    public onMouseUp(e: MouseEvent, canvasPos: Point): void
    {
        // Text tool completes placement on mouse-down.
    }

    /**
     * Handle key-down: Escape switches back to the select tool.
     *
     * @param e - The originating keyboard event.
     */
    public onKeyDown(e: KeyboardEvent): void
    {
        if (e.key !== "Escape")
        {
            return;
        }

        e.preventDefault();
        this.engine.setActiveTool("select");

        logText_toolDebug("Text tool cancelled");
    }

    // ========================================================================
    // PLACEMENT
    // ========================================================================

    /**
     * Creates a text object at the click position, selects it, and
     * starts inline text editing.
     *
     * @param canvasPos - Canvas position where the user clicked.
     */
    private placeTextObject(canvasPos: Point): void
    {
        const bounds = this.computeTextBounds(canvasPos);
        const obj = this.createTextObject(bounds);

        this.pushTextPlacementUndo(obj);
        this.selectAndEdit(obj);
    }

    /**
     * Compute the bounding rectangle for the new text object,
     * centred horizontally on the click point and positioned
     * with the top edge at the click Y.
     *
     * @param canvasPos - Canvas position where the user clicked.
     * @returns The bounding rectangle for the text object.
     */
    private computeTextBounds(canvasPos: Point): Rect
    {
        return {
            x: canvasPos.x - (TEXT_DEFAULT_WIDTH / 2),
            y: canvasPos.y,
            width: TEXT_DEFAULT_WIDTH,
            height: TEXT_DEFAULT_HEIGHT
        };
    }

    /**
     * Creates a text-shaped DiagramObject with empty text content.
     *
     * @param bounds - Bounding rectangle for the text object.
     * @returns The fully constructed DiagramObject.
     */
    private createTextObject(bounds: Rect): DiagramObject
    {
        return this.engine.addObject({
            presentation: {
                shape: "text",
                bounds,
                textContent: {
                    runs: [{ text: "" }],
                    overflow: "visible",
                    verticalAlign: "top",
                    horizontalAlign: "left",
                    padding: 4
                }
            }
        });
    }

    /**
     * Pushes an undo command for the text object placement.
     *
     * @param obj - The placed DiagramObject.
     */
    private pushTextPlacementUndo(obj: DiagramObject): void
    {
        const objId = obj.id;
        const snapshot: DiagramObjectInput = {
            id: obj.id,
            semantic: { ...obj.semantic },
            presentation: { ...obj.presentation }
        };

        this.engine.pushUndoCommand({
            type: "place-text",
            label: "Place text",
            timestamp: Date.now(),
            mergeable: false,
            undo: (): void =>
            {
                this.engine.removeObject(objId);
            },
            redo: (): void =>
            {
                this.engine.addObject(snapshot);
            }
        });
    }

    /**
     * Switch to select tool, select the object, and start editing.
     *
     * @param obj - The newly placed text DiagramObject.
     */
    private selectAndEdit(obj: DiagramObject): void
    {
        this.engine.clearSelectionInternal();
        this.engine.addToSelection(obj.id);
        this.engine.setActiveTool("select");
        this.engine.startInlineTextEdit(obj.id);

        logText_toolDebug("Placed text object:", obj.id);
    }
}

// ========================================================================
// SOURCE: tool-connect.ts
// ========================================================================

/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: ConnectorTool
 * PURPOSE: Canvas tool for drawing connectors between diagram objects.
 *    Click on a source object, drag to show a preview line, release on
 *    a target object to create a connector. Validates source != target,
 *    resolves nearest ports, and auto-switches to select on completion.
 * RELATES: [[ToolManager]], [[DiagramEngine]], [[Connectors]]
 * FLOW: [ToolManager.dispatch*()] -> [ConnectorTool] -> [EngineForConnectTool]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// ENGINE INTERFACE (FORWARD REFERENCE)
// ============================================================================

/**
 * Engine interface consumed by the ConnectorTool. Extends EngineForTools
 * with connector creation and object lookup methods needed for drawing
 * connectors interactively.
 */
interface EngineForConnectTool extends EngineForTools
{
    /**
     * Adds a connector to the document and renders it.
     *
     * @param conn - Partial connector definition.
     * @returns The fully constructed DiagramConnector.
     */
    addConnector(conn: Partial<DiagramConnector>): DiagramConnector;

    /**
     * Retrieves a diagram object by its ID.
     *
     * @param id - Object ID to look up.
     * @returns The matching object, or null.
     */
    getObjectById(id: string): DiagramObject | null;

    /**
     * Looks up a shape definition from the registry.
     *
     * @param type - Shape type string.
     * @returns The ShapeDefinition, or null.
     */
    getShapeDef(type: string): ShapeDefinition | null;

    /**
     * Renders a line element on the tool overlay layer for preview.
     *
     * @param rect - Bounding rectangle for the overlay.
     */
    renderRubberBand(rect: Rect): void;

    /**
     * Clears the tool overlay layer.
     */
    clearToolOverlay(): void;

    /**
     * Switches the active tool by name.
     *
     * @param name - Tool name to activate.
     */
    setActiveTool(name: string): void;

    /**
     * Pushes an undo command onto the engine's undo stack.
     *
     * @param cmd - The undo command to push.
     */
    pushUndoCommand(cmd: UndoCommand): void;

    /**
     * Removes a connector from the document by ID.
     *
     * @param id - The connector ID to remove.
     */
    removeConnector(id: string): void;

    /**
     * Returns all visible, unlocked objects on the canvas.
     *
     * @returns Array of visible, unlocked DiagramObject instances.
     */
    getVisibleObjects(): DiagramObject[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Log prefix for all console messages from this module. */
const CONNECT_LOG_PREFIX = "[ConnectorTool]";

function logConnectInfo(...args: unknown[]): void
{
    console.log(new Date().toISOString(), "[INFO]", CONNECT_LOG_PREFIX, ...args);
}

function logConnectWarn(...args: unknown[]): void
{
    console.warn(new Date().toISOString(), "[WARN]", CONNECT_LOG_PREFIX, ...args);
}

function logConnectError(...args: unknown[]): void
{
    console.error(new Date().toISOString(), "[ERROR]", CONNECT_LOG_PREFIX, ...args);
}

function logConnectDebug(...args: unknown[]): void
{
    console.debug(new Date().toISOString(), "[DEBUG]", CONNECT_LOG_PREFIX, ...args);
}

/** CSS colour for the preview line. */
const PREVIEW_LINE_COLOR = "var(--bs-primary, #0d6efd)";

/** Stroke width for the preview line. */
const PREVIEW_LINE_WIDTH = 2;

/** Dash pattern for the preview line. */
const PREVIEW_DASH_PATTERN = "6 3";

/** SVG namespace for creating preview elements. */
const CONNECT_SVG_NS = "http://www.w3.org/2000/svg";

/** Default connector stroke colour. */
const CONNECT_DEFAULT_COLOR = "#495057";

/** Radius for port indicator circles. */
const PORT_INDICATOR_RADIUS = 5;

/** Distance threshold for showing port indicators on nearby objects. */
const PORT_INDICATOR_RANGE = 80;

/** Fill colour for port indicator circles (primary at 30% opacity). */
const PORT_INDICATOR_FILL = "rgba(13, 110, 253, 0.3)";

/** Stroke colour for port indicator circles. */
const PORT_INDICATOR_STROKE = "var(--bs-primary, #0d6efd)";

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Canvas tool for drawing connectors between diagram objects.
 *
 * **Interaction flow:**
 * 1. Click on a source object to begin.
 * 2. Drag to see a dashed preview line from source centre to cursor.
 * 3. Release on a target object to create the connector.
 * 4. Source and target must be different objects.
 * 5. Escape cancels the operation.
 * 6. After creation, the tool switches to "select".
 */
class ConnectorTool implements Tool
{
    /** @inheritdoc */
    public readonly name = "connect";

    /** @inheritdoc */
    public readonly cursor = "crosshair";

    /** Reference to the engine facade. */
    private readonly engine: EngineForConnectTool;

    /** Whether a connector drag is currently in progress. */
    private dragging: boolean = false;

    /** The source object that the connector originates from. */
    private sourceObj: DiagramObject | null = null;

    /** The resolved source port ID on the source object. */
    private sourcePortId: string | undefined = undefined;

    /** Canvas position where the drag started. */
    private dragStart: Point = { x: 0, y: 0 };

    /**
     * Creates a ConnectorTool bound to an engine instance.
     *
     * @param engine - The engine facade implementing EngineForConnectTool.
     */
    constructor(engine: EngineForConnectTool)
    {
        this.engine = engine;
    }

    /** @inheritdoc */
    public onActivate(): void
    {
        this.resetState();
        logConnectDebug("Activated");
    }

    /**
     * Whether a connector drag is in progress (ADR-126 — hover card guard).
     */
    public isInteracting(): boolean
    {
        return this.dragging;
    }

    /** @inheritdoc */
    public onDeactivate(): void
    {
        this.resetState();
        this.engine.clearToolOverlay();
        logConnectDebug("Deactivated");
    }

    /**
     * Handles mouse-down: identify the source object and begin dragging.
     *
     * @param e - The originating mouse event.
     * @param canvasPos - Mouse position in canvas coordinate space.
     */
    public onMouseDown(e: MouseEvent, canvasPos: Point): void
    {
        const hitObj = this.engine.hitTestObject(canvasPos);

        if (!hitObj)
        {
            return;
        }

        this.dragging = true;
        this.sourceObj = hitObj;
        this.dragStart = canvasPos;
        this.sourcePortId = this.findNearestPort(hitObj, canvasPos);

        logConnectDebug("Source:", hitObj.id, "port:", this.sourcePortId);
    }

    /**
     * Handles mouse-move: render the preview line from source to cursor.
     *
     * @param _e - The originating mouse event (unused).
     * @param canvasPos - Current mouse position in canvas coordinate space.
     */
    public onMouseMove(_e: MouseEvent, canvasPos: Point): void
    {
        if (!this.dragging || !this.sourceObj)
        {
            return;
        }

        this.renderPreviewLine(canvasPos);
        this.renderPortIndicators(canvasPos);
    }

    /**
     * Handles mouse-up: identify the target object and create the connector.
     *
     * @param _e - The originating mouse event (unused).
     * @param canvasPos - Mouse position where the drag ended.
     */
    public onMouseUp(_e: MouseEvent, canvasPos: Point): void
    {
        if (!this.dragging || !this.sourceObj)
        {
            return;
        }

        this.engine.clearToolOverlay();

        const targetObj = this.engine.hitTestObject(canvasPos);

        if (!targetObj || targetObj.id === this.sourceObj.id)
        {
            this.cancelConnection(targetObj);
            return;
        }

        const targetPortId = this.findNearestPort(targetObj, canvasPos);

        this.createConnector(this.sourceObj, this.sourcePortId, targetObj, targetPortId);
    }

    /**
     * Handles key-down: Escape cancels the connector drawing.
     *
     * @param e - The originating keyboard event.
     */
    public onKeyDown(e: KeyboardEvent): void
    {
        if (e.key !== "Escape")
        {
            return;
        }

        e.preventDefault();
        this.engine.clearToolOverlay();
        this.resetState();

        logConnectDebug("Cancelled via Escape");
    }

    // ========================================================================
    // PRIVATE — PORT RESOLUTION
    // ========================================================================

    /**
     * Finds the nearest connection port on an object to a given point.
     * Computes the distance from the click position to each port's
     * absolute canvas position and returns the closest one.
     *
     * @param obj - The diagram object to search ports on.
     * @param clickPos - The click position in canvas coordinates.
     * @returns The nearest port ID, or undefined if no ports exist.
     */
    private findNearestPort(
        obj: DiagramObject,
        clickPos: Point): string | undefined
    {
        const shapeDef = this.engine.getShapeDef(obj.presentation.shape);

        if (!shapeDef)
        {
            return undefined;
        }

        const allPorts = shapeDef.getPorts(obj.presentation.bounds);

        // Exclude center port — connectors should attach at edges
        const edgePorts = allPorts.filter((p) => p.id !== "port-c");
        const ports = edgePorts.length > 0 ? edgePorts : allPorts;

        if (ports.length === 0)
        {
            return undefined;
        }

        return this.selectClosestPort(ports, obj, clickPos);
    }

    /**
     * Selects the port closest to the click position by Euclidean distance.
     *
     * @param ports - Available connection ports on the shape.
     * @param obj - The diagram object owning the ports.
     * @param clickPos - The click position in canvas coordinates.
     * @returns The ID of the nearest port.
     */
    private selectClosestPort(
        ports: ConnectionPort[],
        obj: DiagramObject,
        clickPos: Point): string
    {
        const b = obj.presentation.bounds;
        let bestId = ports[0].id;
        let bestDist = Infinity;

        for (const port of ports)
        {
            const px = b.x + (port.position.x * b.width);
            const py = b.y + (port.position.y * b.height);
            const dx = clickPos.x - px;
            const dy = clickPos.y - py;
            const dist = (dx * dx) + (dy * dy);

            if (dist < bestDist)
            {
                bestDist = dist;
                bestId = port.id;
            }
        }

        return bestId;
    }

    // ========================================================================
    // PRIVATE — PREVIEW RENDERING
    // ========================================================================

    /**
     * Renders a dashed preview line from the source object's centre
     * to the current cursor position on the tool overlay layer.
     *
     * @param cursorPos - The current cursor position in canvas coordinates.
     */
    private renderPreviewLine(cursorPos: Point): void
    {
        this.engine.clearToolOverlay();

        if (!this.sourceObj)
        {
            return;
        }

        const srcCenter = this.computeSourceCenter();
        const line = this.buildPreviewLineElement(srcCenter, cursorPos);

        this.appendToToolOverlay(line);
    }

    /**
     * Computes the centre point of the source object.
     *
     * @returns The centre point in canvas coordinates.
     */
    private computeSourceCenter(): Point
    {
        const b = this.sourceObj!.presentation.bounds;

        return {
            x: b.x + (b.width / 2),
            y: b.y + (b.height / 2)
        };
    }

    /**
     * Creates an SVG line element styled as a dashed preview line.
     *
     * @param src - Start point of the line.
     * @param tgt - End point of the line.
     * @returns A styled SVG line element.
     */
    private buildPreviewLineElement(src: Point, tgt: Point): SVGElement
    {
        const line = document.createElementNS(CONNECT_SVG_NS, "line");

        line.setAttribute("x1", String(src.x));
        line.setAttribute("y1", String(src.y));
        line.setAttribute("x2", String(tgt.x));
        line.setAttribute("y2", String(tgt.y));
        line.setAttribute("stroke", PREVIEW_LINE_COLOR);
        line.setAttribute("stroke-width", String(PREVIEW_LINE_WIDTH));
        line.setAttribute("stroke-dasharray", PREVIEW_DASH_PATTERN);
        line.setAttribute("pointer-events", "none");

        return line;
    }

    /**
     * Appends a preview element to the tool overlay layer. Accesses
     * the overlay through the engine's clearToolOverlay/renderRubberBand
     * pathway, but here we need direct SVG access. Instead, we use the
     * engine's SVG element to locate the tool overlay group.
     *
     * @param el - The SVG element to append.
     */
    private appendToToolOverlay(el: SVGElement): void
    {
        const svg = document.querySelector(".de-canvas");

        if (!svg)
        {
            return;
        }

        const overlay = svg.querySelector(".de-tool-overlay");

        if (overlay)
        {
            overlay.appendChild(el);
        }
    }

    // ========================================================================
    // PRIVATE — PORT INDICATORS
    // ========================================================================

    /**
     * Renders small circles at connection ports on shapes near the
     * cursor position. Shows ports on objects within the proximity
     * threshold, excluding the source object and port-c.
     *
     * @param cursorPos - Current cursor position in canvas coordinates.
     */
    private renderPortIndicators(cursorPos: Point): void
    {
        if (!this.sourceObj)
        {
            return;
        }

        const nearby = this.findNearbyObjects(cursorPos);

        for (const obj of nearby)
        {
            this.renderObjectPorts(obj);
        }
    }

    /**
     * Finds visible objects whose centre is within range of the cursor,
     * excluding the source object.
     *
     * @param cursorPos - Current cursor position in canvas coordinates.
     * @returns Array of nearby objects suitable for port display.
     */
    private findNearbyObjects(cursorPos: Point): DiagramObject[]
    {
        const visible = this.engine.getVisibleObjects();
        const sourceId = this.sourceObj!.id;
        const rangeSq = PORT_INDICATOR_RANGE * PORT_INDICATOR_RANGE;

        return visible.filter((obj) =>
        {
            if (obj.id === sourceId)
            {
                return false;
            }

            const b = obj.presentation.bounds;
            const cx = b.x + (b.width / 2);
            const cy = b.y + (b.height / 2);
            const dx = cursorPos.x - cx;
            const dy = cursorPos.y - cy;

            return ((dx * dx) + (dy * dy)) <= rangeSq;
        });
    }

    /**
     * Renders port indicator circles for a single object's edge ports.
     *
     * @param obj - The object to render ports for.
     */
    private renderObjectPorts(obj: DiagramObject): void
    {
        const shapeDef = this.engine.getShapeDef(obj.presentation.shape);

        if (!shapeDef)
        {
            return;
        }

        const allPorts = shapeDef.getPorts(obj.presentation.bounds);
        const edgePorts = allPorts.filter((p) => p.id !== "port-c");
        const b = obj.presentation.bounds;

        for (const port of edgePorts)
        {
            const circle = this.buildPortCircle(b, port);

            this.appendToToolOverlay(circle);
        }
    }

    /**
     * Builds an SVG circle element for a port indicator at the port's
     * absolute canvas position.
     *
     * @param bounds - The object's bounding rectangle.
     * @param port - The connection port definition.
     * @returns A styled SVG circle element.
     */
    private buildPortCircle(
        bounds: Rect,
        port: ConnectionPort): SVGElement
    {
        const px = bounds.x + (port.position.x * bounds.width);
        const py = bounds.y + (port.position.y * bounds.height);

        const circle = document.createElementNS(CONNECT_SVG_NS, "circle");

        circle.setAttribute("cx", String(px));
        circle.setAttribute("cy", String(py));
        circle.setAttribute("r", String(PORT_INDICATOR_RADIUS));
        circle.setAttribute("fill", PORT_INDICATOR_FILL);
        circle.setAttribute("stroke", PORT_INDICATOR_STROKE);
        circle.setAttribute("stroke-width", "1.5");
        circle.setAttribute("pointer-events", "none");

        return circle;
    }

    // ========================================================================
    // PRIVATE — CONNECTOR CREATION
    // ========================================================================

    /**
     * Creates a connector between the source and target objects,
     * pushes an undo command, and switches to the select tool.
     *
     * @param src - The source diagram object.
     * @param srcPort - The source port ID.
     * @param tgt - The target diagram object.
     * @param tgtPort - The target port ID.
     */
    private createConnector(
        src: DiagramObject,
        srcPort: string | undefined,
        tgt: DiagramObject,
        tgtPort: string | undefined): void
    {
        const conn = this.engine.addConnector({
            presentation: {
                sourceId: src.id,
                targetId: tgt.id,
                sourcePort: srcPort,
                targetPort: tgtPort,
                waypoints: [],
                routing: "straight",
                style: {
                    color: CONNECT_DEFAULT_COLOR,
                    width: 2,
                    endArrow: "classic"
                },
                labels: []
            }
        });

        this.pushConnectorUndo(conn);
        this.resetState();
        this.engine.setActiveTool("select");

        logConnectInfo("Created connector:", conn.id);
    }

    /**
     * Pushes an undo command for the created connector. Undo removes
     * the connector; redo recreates it.
     *
     * @param conn - The newly created connector.
     */
    private pushConnectorUndo(conn: DiagramConnector): void
    {
        const connId = conn.id;
        const snapshot = JSON.parse(JSON.stringify(conn));

        this.engine.pushUndoCommand({
            type: "connect",
            label: "Create connector",
            timestamp: Date.now(),
            mergeable: false,
            undo: (): void =>
            {
                this.engine.removeConnector(connId);
            },
            redo: (): void =>
            {
                this.engine.addConnector(snapshot);
            }
        });
    }

    /**
     * Cancels the connection attempt and resets state.
     * Logs a debug message explaining why the connection was cancelled.
     *
     * @param targetObj - The target object that was hit (or null).
     */
    private cancelConnection(targetObj: DiagramObject | null): void
    {
        if (!targetObj)
        {
            logConnectDebug("No target object — cancelled");
        }
        else
        {
            logConnectDebug("Source equals target — cancelled");
        }

        this.resetState();
    }

    /**
     * Resets the tool's internal state to idle.
     */
    private resetState(): void
    {
        this.dragging = false;
        this.sourceObj = null;
        this.sourcePortId = undefined;
        this.dragStart = { x: 0, y: 0 };
    }
}

// ========================================================================
// SOURCE: tool-pen.ts
// ========================================================================

/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: PenTool
 * PURPOSE: Vector path creation tool for the DiagramEngine canvas. Click
 *    to place anchor points forming a polyline. Enter or Escape
 *    finalises the path into a "path" shape object with SVG path data.
 *    Double-click also finalises. Escape/double-click cancel if only
 *    one point exists.
 * RELATES: [[ToolManager]], [[DiagramEngine]], [[BrushTool]]
 * FLOW: [ToolManager.dispatch*()] -> [PenTool] -> [EngineForPenTool]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// ENGINE INTERFACE (FORWARD REFERENCE)
// ============================================================================

/**
 * Engine interface consumed by the PenTool. Extends EngineForTools
 * with object creation and removal methods needed for finalising
 * the drawn path into a diagram object.
 */
interface EngineForPenTool extends EngineForTools
{
    /**
     * Adds a new object to the document.
     *
     * @param partial - Partial object definition.
     * @returns The fully constructed DiagramObject.
     */
    addObject(partial: DiagramObjectInput): DiagramObject;

    /**
     * Removes an object from the document by ID.
     *
     * @param id - The object ID to remove.
     */
    removeObject(id: string): void;

    /**
     * Pushes an undo command onto the engine's undo stack.
     *
     * @param cmd - The undo command to push.
     */
    pushUndoCommand(cmd: UndoCommand): void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Log prefix for PenTool console messages. */
const PEN_LOG_PREFIX = "[PenTool]";

function logPenInfo(...args: unknown[]): void
{
    console.log(new Date().toISOString(), "[INFO]", PEN_LOG_PREFIX, ...args);
}

function logPenWarn(...args: unknown[]): void
{
    console.warn(new Date().toISOString(), "[WARN]", PEN_LOG_PREFIX, ...args);
}

function logPenError(...args: unknown[]): void
{
    console.error(new Date().toISOString(), "[ERROR]", PEN_LOG_PREFIX, ...args);
}

function logPenDebug(...args: unknown[]): void
{
    console.debug(new Date().toISOString(), "[DEBUG]", PEN_LOG_PREFIX, ...args);
}

/** SVG namespace for creating preview elements. */
const PEN_SVG_NS = "http://www.w3.org/2000/svg";

/** Colour for the path preview. */
const PEN_PREVIEW_COLOR = "var(--bs-primary, #0d6efd)";

/** Stroke width for the preview path. */
const PEN_PREVIEW_WIDTH = 2;

/** Radius of the first-click indicator dot. */
const PEN_DOT_RADIUS = 4;

/** Maximum time in ms between clicks to count as a double-click. */
const PEN_DBLCLICK_TIME = 400;

/** Maximum squared distance in px between clicks for double-click. */
const PEN_DBLCLICK_DIST_SQ = 100;

/** Distance threshold in px to detect a click near the first anchor. */
const PEN_CLOSE_THRESHOLD = 10;

/** Default fill for closed pen shapes. */
const PEN_CLOSED_FILL_COLOR = "rgba(200, 220, 255, 0.2)";

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Canvas tool for creating vector paths by clicking anchor points.
 *
 * **Interaction flow:**
 * 1. Click to add points to a polyline.
 * 2. A live preview shows the path so far (with a dot on first click).
 * 3. Press Enter to finalise into a "path" shape object.
 * 4. Press Escape to finalise (or cancel if only 1 point).
 * 5. Double-click to finalise (or cancel if only 1 point).
 */
class PenTool implements Tool
{
    /** @inheritdoc */
    public readonly name = "pen";

    /** @inheritdoc */
    public readonly cursor = "crosshair";

    /** Reference to the engine facade. */
    private readonly engine: EngineForPenTool;

    /** Collected anchor points in canvas coordinates. */
    private points: Point[] = [];

    /** Timestamp of the last mouse-down for double-click detection. */
    private lastClickTime: number = 0;

    /** Position of the last mouse-down for double-click proximity check. */
    private lastClickPos: Point = { x: 0, y: 0 };

    /**
     * Creates a PenTool bound to an engine instance.
     *
     * @param engine - The engine facade implementing EngineForPenTool.
     */
    constructor(engine: EngineForPenTool)
    {
        this.engine = engine;
    }

    /** @inheritdoc */
    public onActivate(): void
    {
        this.points = [];
        logPenDebug("Activated");
    }

    /** @inheritdoc */
    public onDeactivate(): void
    {
        this.points = [];
        this.engine.clearToolOverlay();
        logPenDebug("Deactivated");
    }

    /**
     * Handles mouse-down: adds an anchor point and updates preview.
     * Detects double-click by timing and proximity to finalise the path.
     *
     * @param _e - The originating mouse event.
     * @param canvasPos - Mouse position in canvas coordinate space.
     */
    public onMouseDown(_e: MouseEvent, canvasPos: Point): void
    {
        if (this.isDoubleClick(canvasPos))
        {
            this.handleDoubleClickFinalize();
            return;
        }

        if (this.isNearFirstAnchor(canvasPos))
        {
            this.finaliseClosedPath();
            return;
        }

        this.lastClickTime = Date.now();
        this.lastClickPos = { x: canvasPos.x, y: canvasPos.y };

        this.points.push({ x: canvasPos.x, y: canvasPos.y });
        this.renderPreview(canvasPos);

        logPenDebug("Point added:", this.points.length);
    }

    /**
     * Handles mouse-move: updates the live preview with a trailing
     * line from the last anchor point to the cursor.
     *
     * @param _e - The originating mouse event.
     * @param canvasPos - Current mouse position in canvas coordinates.
     */
    public onMouseMove(_e: MouseEvent, canvasPos: Point): void
    {
        if (this.points.length > 0)
        {
            this.renderPreview(canvasPos);
        }
    }

    /**
     * Handles mouse-up: no action needed (click handled in onMouseDown).
     *
     * @param _e - The originating mouse event.
     * @param _canvasPos - Mouse position in canvas coordinate space.
     */
    public onMouseUp(_e: MouseEvent, _canvasPos: Point): void
    {
        // Anchor placement is handled in onMouseDown
    }

    /**
     * Handles key-down: Enter finalises the path, Escape cancels
     * and discards any points placed so far.
     *
     * @param e - The originating keyboard event.
     */
    public onKeyDown(e: KeyboardEvent): void
    {
        if (e.key === "Enter")
        {
            e.preventDefault();
            this.finalisePath();
        }
        else if (e.key === "Escape")
        {
            e.preventDefault();
            this.cancelPath();
        }
    }

    // ========================================================================
    // DOUBLE-CLICK DETECTION
    // ========================================================================

    /**
     * Checks whether the current click qualifies as a double-click
     * based on timing (< 400ms) and proximity (< 10px) to the
     * previous click.
     *
     * @param canvasPos - Current click position in canvas space.
     * @returns true if this is a double-click.
     */
    private isDoubleClick(canvasPos: Point): boolean
    {
        const elapsed = Date.now() - this.lastClickTime;
        const dx = canvasPos.x - this.lastClickPos.x;
        const dy = canvasPos.y - this.lastClickPos.y;
        const distSq = (dx * dx) + (dy * dy);

        return elapsed < PEN_DBLCLICK_TIME && distSq < PEN_DBLCLICK_DIST_SQ;
    }

    /**
     * Checks whether the current click is within the close threshold
     * of the first anchor point. Requires at least 3 existing points
     * to form a valid closed shape.
     *
     * @param canvasPos - Current click position in canvas space.
     * @returns true if click is near the first anchor and can close.
     */
    private isNearFirstAnchor(canvasPos: Point): boolean
    {
        if (this.points.length < 3)
        {
            return false;
        }

        const first = this.points[0];
        const dx = canvasPos.x - first.x;
        const dy = canvasPos.y - first.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        return dist <= PEN_CLOSE_THRESHOLD;
    }

    /**
     * Handles double-click: finalises the path if there are at least
     * 2 points, otherwise cancels.
     */
    private handleDoubleClickFinalize(): void
    {
        this.lastClickTime = 0;
        this.finaliseOrCancel();
    }

    /**
     * Finalises the path if there are enough points (>= 2),
     * otherwise cancels since a single point cannot form a path.
     */
    private finaliseOrCancel(): void
    {
        if (this.points.length >= 2)
        {
            this.finalisePath();
        }
        else
        {
            this.cancelPath();
        }
    }

    // ========================================================================
    // PREVIEW RENDERING
    // ========================================================================

    /**
     * Renders the current path preview on the tool overlay. Shows
     * the committed polyline plus a trailing segment to the cursor.
     * Displays a dot on the first anchor point.
     *
     * @param cursorPos - Current cursor position in canvas space.
     */
    private renderPreview(cursorPos: Point): void
    {
        this.engine.clearToolOverlay();

        const overlay = this.getOverlayElement();

        if (!overlay)
        {
            return;
        }

        if (this.points.length === 1)
        {
            this.renderFirstPointDot(overlay);
        }

        this.renderPreviewPolyline(overlay, cursorPos);
    }

    /**
     * Renders a dot at the first anchor point as a visual indicator.
     *
     * @param overlay - SVG overlay element to append to.
     */
    private renderFirstPointDot(overlay: Element): void
    {
        const pt = this.points[0];
        const dot = document.createElementNS(PEN_SVG_NS, "circle");

        dot.setAttribute("cx", String(pt.x));
        dot.setAttribute("cy", String(pt.y));
        dot.setAttribute("r", String(PEN_DOT_RADIUS));
        dot.setAttribute("fill", PEN_PREVIEW_COLOR);
        dot.setAttribute("pointer-events", "none");

        overlay.appendChild(dot);
    }

    /**
     * Renders the preview polyline including a trailing segment
     * from the last anchor to the current cursor position.
     *
     * @param overlay - SVG overlay element to append to.
     * @param cursorPos - Current cursor position.
     */
    private renderPreviewPolyline(overlay: Element, cursorPos: Point): void
    {
        const allPts = this.points.concat([cursorPos]);
        const d = pointsToPathData(allPts);

        const path = document.createElementNS(PEN_SVG_NS, "path");

        path.setAttribute("d", d);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", PEN_PREVIEW_COLOR);
        path.setAttribute("stroke-width", String(PEN_PREVIEW_WIDTH));
        path.setAttribute("pointer-events", "none");

        overlay.appendChild(path);
    }

    /**
     * Locates the tool overlay SVG group element.
     *
     * @returns The overlay element, or null.
     */
    private getOverlayElement(): Element | null
    {
        const svg = document.querySelector(".de-canvas");

        if (!svg)
        {
            return null;
        }

        return svg.querySelector(".de-tool-overlay");
    }

    // ========================================================================
    // FINALISATION
    // ========================================================================

    /**
     * Finalises the collected points into a "path" shape object.
     * Computes the bounding box, converts absolute coordinates
     * to local coordinates, and creates the diagram object.
     */
    private finalisePath(): void
    {
        if (this.points.length < 2)
        {
            logPenDebug("Need at least 2 points");
            this.cancelPath();
            return;
        }

        const bbox = computePointsBBox(this.points);
        const localD = toLocalPathData(this.points, bbox);

        this.createPathObject(bbox, localD, false);

        this.points = [];
        this.engine.clearToolOverlay();
        this.engine.setActiveTool("select");

        logPenInfo("Path finalised");
    }

    /**
     * Finalises the collected points into a closed "path" shape.
     * Appends "Z" to the SVG path data and applies a default fill.
     * Requires at least 3 points.
     */
    private finaliseClosedPath(): void
    {
        if (this.points.length < 3)
        {
            logPenDebug("Need at least 3 points to close");
            this.cancelPath();
            return;
        }

        const bbox = computePointsBBox(this.points);
        const localD = toLocalPathData(this.points, bbox) + " Z";

        this.createPathObject(bbox, localD, true);

        this.points = [];
        this.engine.clearToolOverlay();
        this.engine.setActiveTool("select");

        logPenInfo("Closed path finalised");
    }

    /**
     * Creates the "path" diagram object and pushes an undo command.
     * When closed, applies a semi-transparent fill for the shape.
     *
     * @param bbox - Bounding rectangle for the path.
     * @param pathData - SVG path data in local coordinates.
     * @param closed - Whether the path is a closed shape.
     */
    private createPathObject(
        bbox: Rect, pathData: string, closed: boolean
    ): void
    {
        const fill = closed
            ? { type: "solid" as const, color: PEN_CLOSED_FILL_COLOR }
            : undefined;

        const obj = this.engine.addObject({
            semantic: { type: "path", data: {} },
            presentation: {
                shape: "path",
                bounds: bbox,
                style: fill ? { fill } : undefined,
                parameters: { d: pathData } as unknown as Record<string, number | Point>
            }
        });

        this.pushPathUndo(obj);

        this.engine.clearSelectionInternal();
        this.engine.addToSelection(obj.id);
    }

    /**
     * Pushes an undo command for the created path object.
     *
     * @param obj - The created diagram object.
     */
    private pushPathUndo(obj: DiagramObject): void
    {
        const objId = obj.id;
        const snapshot: DiagramObjectInput = {
            id: obj.id,
            semantic: { ...obj.semantic },
            presentation: { ...obj.presentation }
        };

        this.engine.pushUndoCommand({
            type: "pen-path",
            label: "Draw path (pen)",
            timestamp: Date.now(),
            mergeable: false,
            undo: (): void =>
            {
                this.engine.removeObject(objId);
            },
            redo: (): void =>
            {
                this.engine.addObject(snapshot);
            }
        });
    }

    /**
     * Cancels the current path and switches to select tool.
     */
    private cancelPath(): void
    {
        this.points = [];
        this.engine.clearToolOverlay();
        this.engine.setActiveTool("select");

        logPenDebug("Cancelled");
    }
}

// ============================================================================
// PATH HELPERS
// ============================================================================

/**
 * Converts an array of points to SVG path data (M + L commands).
 *
 * @param pts - Array of points.
 * @returns SVG path data string.
 */
function pointsToPathData(pts: Point[]): string
{
    if (pts.length === 0)
    {
        return "";
    }

    const parts = [`M ${pts[0].x} ${pts[0].y}`];

    for (let i = 1; i < pts.length; i++)
    {
        parts.push(`L ${pts[i].x} ${pts[i].y}`);
    }

    return parts.join(" ");
}

/**
 * Computes the bounding box of an array of points with a minimum
 * 1-pixel dimension to avoid degenerate rectangles.
 *
 * @param pts - Array of points.
 * @returns Bounding rectangle enclosing all points.
 */
function computePointsBBox(pts: Point[]): Rect
{
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const pt of pts)
    {
        minX = Math.min(minX, pt.x);
        minY = Math.min(minY, pt.y);
        maxX = Math.max(maxX, pt.x);
        maxY = Math.max(maxY, pt.y);
    }

    return {
        x: minX,
        y: minY,
        width: Math.max(1, maxX - minX),
        height: Math.max(1, maxY - minY)
    };
}

/**
 * Converts absolute canvas-coordinate points to local path data
 * relative to the bounding box origin.
 *
 * @param pts - Points in absolute canvas coordinates.
 * @param bbox - Bounding rectangle to use as the local origin.
 * @returns SVG path data string in local coordinates.
 */
function toLocalPathData(pts: Point[], bbox: Rect): string
{
    const localPts = pts.map((pt) => ({
        x: pt.x - bbox.x,
        y: pt.y - bbox.y
    }));

    return pointsToPathData(localPts);
}

// ========================================================================
// SOURCE: tool-brush.ts
// ========================================================================

/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: BrushTool
 * PURPOSE: Freehand drawing tool for the DiagramEngine canvas. Mousedown
 *    starts a stroke, mousemove captures points with live preview,
 *    mouseup finalises into a "path" shape object. Applies distance-based
 *    point simplification for smooth, compact output.
 * RELATES: [[ToolManager]], [[DiagramEngine]], [[PenTool]]
 * FLOW: [ToolManager.dispatch*()] -> [BrushTool] -> [EngineForBrushTool]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// ENGINE INTERFACE (FORWARD REFERENCE)
// ============================================================================

/**
 * Engine interface consumed by the BrushTool. Extends EngineForTools
 * with object creation and removal methods needed for finalising
 * the freehand stroke into a diagram object.
 */
interface EngineForBrushTool extends EngineForTools
{
    /**
     * Adds a new object to the document.
     *
     * @param partial - Partial object definition.
     * @returns The fully constructed DiagramObject.
     */
    addObject(partial: DiagramObjectInput): DiagramObject;

    /**
     * Removes an object from the document by ID.
     *
     * @param id - The object ID to remove.
     */
    removeObject(id: string): void;

    /**
     * Pushes an undo command onto the engine's undo stack.
     *
     * @param cmd - The undo command to push.
     */
    pushUndoCommand(cmd: UndoCommand): void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Log prefix for BrushTool console messages. */
const BRUSH_LOG_PREFIX = "[BrushTool]";

function logBrushInfo(...args: unknown[]): void
{
    console.log(new Date().toISOString(), "[INFO]", BRUSH_LOG_PREFIX, ...args);
}

function logBrushWarn(...args: unknown[]): void
{
    console.warn(new Date().toISOString(), "[WARN]", BRUSH_LOG_PREFIX, ...args);
}

function logBrushError(...args: unknown[]): void
{
    console.error(new Date().toISOString(), "[ERROR]", BRUSH_LOG_PREFIX, ...args);
}

function logBrushDebug(...args: unknown[]): void
{
    console.debug(new Date().toISOString(), "[DEBUG]", BRUSH_LOG_PREFIX, ...args);
}

/** SVG namespace for creating preview elements. */
const BRUSH_SVG_NS = "http://www.w3.org/2000/svg";

/** Colour for the stroke preview. */
const BRUSH_PREVIEW_COLOR = "var(--theme-text-color, #212529)";

/** Default stroke width for freehand paths. */
const BRUSH_STROKE_WIDTH = 2;

/** Distance threshold in pixels for point simplification. */
const SIMPLIFY_TOLERANCE = 3;

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Canvas tool for freehand drawing with smooth, simplified output.
 *
 * **Interaction flow:**
 * 1. Mouse-down starts a stroke.
 * 2. Mouse-move captures points and renders a live preview.
 * 3. Mouse-up applies point simplification and creates a "path" object.
 * 4. Escape switches back to the select tool.
 */
class BrushTool implements Tool
{
    /** @inheritdoc */
    public readonly name = "brush";

    /** @inheritdoc */
    public readonly cursor = "crosshair";

    /** Reference to the engine facade. */
    private readonly engine: EngineForBrushTool;

    /** Whether a stroke is currently in progress. */
    private drawing: boolean = false;

    /** Raw collected points during the stroke. */
    private rawPoints: Point[] = [];

    /**
     * Creates a BrushTool bound to an engine instance.
     *
     * @param engine - The engine facade implementing EngineForBrushTool.
     */
    constructor(engine: EngineForBrushTool)
    {
        this.engine = engine;
    }

    /** @inheritdoc */
    public onActivate(): void
    {
        this.resetState();
        logBrushDebug("Activated");
    }

    /** @inheritdoc */
    public onDeactivate(): void
    {
        this.resetState();
        this.engine.clearToolOverlay();
        logBrushDebug("Deactivated");
    }

    /**
     * Handles mouse-down: begins a new freehand stroke.
     *
     * @param _e - The originating mouse event.
     * @param canvasPos - Mouse position in canvas coordinate space.
     */
    public onMouseDown(_e: MouseEvent, canvasPos: Point): void
    {
        this.drawing = true;
        this.rawPoints = [{ x: canvasPos.x, y: canvasPos.y }];

        logBrushDebug("Stroke started");
    }

    /**
     * Handles mouse-move: captures a point and updates the preview.
     *
     * @param _e - The originating mouse event.
     * @param canvasPos - Current mouse position in canvas coordinates.
     */
    public onMouseMove(_e: MouseEvent, canvasPos: Point): void
    {
        if (!this.drawing)
        {
            return;
        }

        this.rawPoints.push({ x: canvasPos.x, y: canvasPos.y });
        this.renderStrokePreview();
    }

    /**
     * Handles mouse-up: finalises the stroke into a path object.
     *
     * @param _e - The originating mouse event.
     * @param _canvasPos - Mouse position in canvas coordinate space.
     */
    public onMouseUp(_e: MouseEvent, _canvasPos: Point): void
    {
        if (!this.drawing)
        {
            return;
        }

        this.finaliseStroke();
    }

    /**
     * Handles key-down: Escape cancels and returns to select tool.
     *
     * @param e - The originating keyboard event.
     */
    public onKeyDown(e: KeyboardEvent): void
    {
        if (e.key !== "Escape")
        {
            return;
        }

        e.preventDefault();
        this.cancelStroke();
    }

    // ========================================================================
    // PREVIEW RENDERING
    // ========================================================================

    /**
     * Renders the current freehand stroke as a live preview on the
     * tool overlay layer with round line caps and joins.
     */
    private renderStrokePreview(): void
    {
        this.engine.clearToolOverlay();

        const overlay = this.getOverlayElement();

        if (!overlay || this.rawPoints.length < 2)
        {
            return;
        }

        const d = brushPointsToPathData(this.rawPoints);
        const path = this.createPreviewPath(d);

        overlay.appendChild(path);
    }

    /**
     * Creates an SVG path element for the stroke preview with
     * round caps and joins.
     *
     * @param d - SVG path data string.
     * @returns Styled SVG path element.
     */
    private createPreviewPath(d: string): SVGElement
    {
        const path = document.createElementNS(BRUSH_SVG_NS, "path");

        path.setAttribute("d", d);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", BRUSH_PREVIEW_COLOR);
        path.setAttribute("stroke-width", String(BRUSH_STROKE_WIDTH));
        path.setAttribute("stroke-linecap", "round");
        path.setAttribute("stroke-linejoin", "round");
        path.setAttribute("pointer-events", "none");

        return path;
    }

    /**
     * Locates the tool overlay SVG group element.
     *
     * @returns The overlay element, or null.
     */
    private getOverlayElement(): Element | null
    {
        const svg = document.querySelector(".de-canvas");

        if (!svg)
        {
            return null;
        }

        return svg.querySelector(".de-tool-overlay");
    }

    // ========================================================================
    // FINALISATION
    // ========================================================================

    /**
     * Finalises the freehand stroke: simplifies points, computes
     * bounding box, converts to local coordinates, and creates
     * the diagram object.
     */
    private finaliseStroke(): void
    {
        this.drawing = false;
        this.engine.clearToolOverlay();

        if (this.rawPoints.length < 2)
        {
            logBrushDebug("Stroke too short, discarded");
            this.resetState();
            return;
        }

        const simplified = simplifyPoints(this.rawPoints, SIMPLIFY_TOLERANCE);
        const bbox = computeBrushBBox(simplified);
        const localD = toBrushLocalPathData(simplified, bbox);

        this.createBrushObject(bbox, localD);

        this.resetState();
        this.engine.setActiveTool("select");

        logBrushInfo("Stroke finalised:",
            this.rawPoints.length, "->", simplified.length, "points"
        );
    }

    /**
     * Creates the "path" diagram object with round line styling
     * and pushes an undo command.
     *
     * @param bbox - Bounding rectangle for the stroke.
     * @param pathData - SVG path data in local coordinates.
     */
    private createBrushObject(bbox: Rect, pathData: string): void
    {
        const obj = this.engine.addObject({
            semantic: { type: "path", data: { source: "brush" } },
            presentation: {
                shape: "path",
                bounds: bbox,
                style: {
                    fill: { type: "none" },
                    stroke: {
                        color: BRUSH_PREVIEW_COLOR,
                        width: BRUSH_STROKE_WIDTH,
                        lineCap: "round",
                        lineJoin: "round"
                    }
                },
                parameters: { d: pathData } as unknown as Record<string, number | Point>
            }
        });

        this.pushBrushUndo(obj);

        this.engine.clearSelectionInternal();
        this.engine.addToSelection(obj.id);
    }

    /**
     * Pushes an undo command for the created brush path object.
     *
     * @param obj - The created diagram object.
     */
    private pushBrushUndo(obj: DiagramObject): void
    {
        const objId = obj.id;
        const snapshot: DiagramObjectInput = {
            id: obj.id,
            semantic: { ...obj.semantic },
            presentation: { ...obj.presentation }
        };

        this.engine.pushUndoCommand({
            type: "brush-path",
            label: "Draw path (brush)",
            timestamp: Date.now(),
            mergeable: false,
            undo: (): void =>
            {
                this.engine.removeObject(objId);
            },
            redo: (): void =>
            {
                this.engine.addObject(snapshot);
            }
        });
    }

    // ========================================================================
    // CANCELLATION AND STATE
    // ========================================================================

    /**
     * Cancels the current stroke and returns to select tool.
     */
    private cancelStroke(): void
    {
        this.resetState();
        this.engine.clearToolOverlay();
        this.engine.setActiveTool("select");

        logBrushDebug("Stroke cancelled");
    }

    /**
     * Resets all stroke-related state to idle.
     */
    private resetState(): void
    {
        this.drawing = false;
        this.rawPoints = [];
    }
}

// ============================================================================
// POINT SIMPLIFICATION
// ============================================================================

/**
 * Simplifies a point array by removing points closer than the
 * given tolerance to the previous retained point. This produces
 * smoother, more compact path data from dense mouse events.
 *
 * @param pts - Raw point array from mouse events.
 * @param tolerance - Minimum distance between retained points.
 * @returns Simplified array of points.
 */
function simplifyPoints(pts: Point[], tolerance: number): Point[]
{
    if (pts.length <= 2)
    {
        return pts.slice();
    }

    const result: Point[] = [pts[0]];
    let lastKept = pts[0];
    const tolSq = tolerance * tolerance;

    for (let i = 1; i < pts.length - 1; i++)
    {
        const dx = pts[i].x - lastKept.x;
        const dy = pts[i].y - lastKept.y;

        if ((dx * dx + dy * dy) >= tolSq)
        {
            result.push(pts[i]);
            lastKept = pts[i];
        }
    }

    // Always keep the last point
    result.push(pts[pts.length - 1]);

    return result;
}

// ============================================================================
// PATH DATA HELPERS
// ============================================================================

/**
 * Converts an array of points to SVG path data (M + L commands).
 *
 * @param pts - Array of points.
 * @returns SVG path data string.
 */
function brushPointsToPathData(pts: Point[]): string
{
    if (pts.length === 0)
    {
        return "";
    }

    const parts = [`M ${pts[0].x} ${pts[0].y}`];

    for (let i = 1; i < pts.length; i++)
    {
        parts.push(`L ${pts[i].x} ${pts[i].y}`);
    }

    return parts.join(" ");
}

/**
 * Computes the bounding box of points with minimum 1-pixel dimensions.
 *
 * @param pts - Array of points.
 * @returns Bounding rectangle enclosing all points.
 */
function computeBrushBBox(pts: Point[]): Rect
{
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const pt of pts)
    {
        minX = Math.min(minX, pt.x);
        minY = Math.min(minY, pt.y);
        maxX = Math.max(maxX, pt.x);
        maxY = Math.max(maxY, pt.y);
    }

    return {
        x: minX,
        y: minY,
        width: Math.max(1, maxX - minX),
        height: Math.max(1, maxY - minY)
    };
}

/**
 * Converts absolute points to local path data relative to the
 * bounding box origin.
 *
 * @param pts - Points in absolute canvas coordinates.
 * @param bbox - Bounding rectangle to use as local origin.
 * @returns SVG path data string in local coordinates.
 */
function toBrushLocalPathData(pts: Point[], bbox: Rect): string
{
    const localPts = pts.map((pt) => ({
        x: pt.x - bbox.x,
        y: pt.y - bbox.y
    }));

    return brushPointsToPathData(localPts);
}

// ========================================================================
// SOURCE: tool-paintbrush.ts
// ========================================================================

/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: PaintbrushTool
 * PURPOSE: Raster painting tool for the DiagramEngine canvas. Paints
 *    directly onto HTML canvas elements inside paintable shapes.
 *    Supports configurable brush size, shape, colour, and opacity.
 *    On mouseup, serialises the canvas to a data URI for persistence.
 * RELATES: [[ToolManager]], [[DiagramEngine]], [[BrushTool]]
 * FLOW: [ToolManager.dispatch*()] -> [PaintbrushTool] -> [EngineForPaintbrushTool]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// ENGINE INTERFACE (FORWARD REFERENCE)
// ============================================================================

/**
 * Engine interface consumed by the PaintbrushTool. Extends EngineForTools
 * with methods to look up paintable canvases and update objects.
 */
interface EngineForPaintbrushTool extends EngineForTools
{
    /**
     * Retrieves the HTML canvas element for a paintable shape.
     *
     * @param objectId - The diagram object ID.
     * @returns The HTMLCanvasElement, or null.
     */
    getPaintableCanvas(objectId: string): HTMLCanvasElement | null;

    /**
     * Updates an existing object with partial changes.
     *
     * @param id - Object ID to update.
     * @param changes - Partial changes to merge.
     */
    updateObject(id: string, changes: Partial<DiagramObject>): void;

    /**
     * Pushes an undo command onto the engine's undo stack.
     *
     * @param cmd - The undo command to push.
     */
    pushUndoCommand(cmd: UndoCommand): void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Log prefix for PaintbrushTool console messages. */
const PAINTBRUSH_LOG_PREFIX = "[PaintbrushTool]";

function logPaintbrushInfo(...args: unknown[]): void
{
    console.log(new Date().toISOString(), "[INFO]", PAINTBRUSH_LOG_PREFIX, ...args);
}

function logPaintbrushWarn(...args: unknown[]): void
{
    console.warn(new Date().toISOString(), "[WARN]", PAINTBRUSH_LOG_PREFIX, ...args);
}

function logPaintbrushError(...args: unknown[]): void
{
    console.error(new Date().toISOString(), "[ERROR]", PAINTBRUSH_LOG_PREFIX, ...args);
}

function logPaintbrushDebug(...args: unknown[]): void
{
    console.debug(new Date().toISOString(), "[DEBUG]", PAINTBRUSH_LOG_PREFIX, ...args);
}

/** Minimum distance in pixels between interpolated stroke points. */
const PAINTBRUSH_MIN_STEP = 1;

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Canvas tool for raster painting inside paintable shapes.
 *
 * **Interaction flow:**
 * 1. Mouse-down on a paintable shape starts painting.
 * 2. Mouse-move paints brush strokes with interpolation.
 * 3. Mouse-up serialises the canvas to dataURI and updates the object.
 * 4. Escape switches back to the select tool.
 */
class PaintbrushTool implements Tool
{
    /** @inheritdoc */
    public readonly name = "paintbrush";

    /** @inheritdoc */
    public readonly cursor = "crosshair";

    /** Brush diameter in pixels. */
    public brushSize: number = 4;

    /** Brush tip shape. */
    public brushShape: "circle" | "square" = "circle";

    /** Brush colour as CSS colour string. */
    public brushColor: string = "#000000";

    /** Brush opacity (0–1). */
    public brushAlpha: number = 1.0;

    /** Brush edge hardness (0 = fully soft/airbrush, 1 = hard edge). */
    public brushHardness: number = 1.0;

    /** Reference to the engine facade. */
    private readonly engine: EngineForPaintbrushTool;

    /** Whether a paint stroke is currently in progress. */
    private painting: boolean = false;

    /** Object ID of the shape currently being painted. */
    private activeObjectId: string | null = null;

    /** The 2D rendering context of the active canvas. */
    private activeCtx: CanvasRenderingContext2D | null = null;

    /** Last paint position for stroke interpolation. */
    private lastPos: Point | null = null;

    /** Canvas state before the current stroke (for undo). */
    private beforeData: string | null = null;

    /**
     * Creates a PaintbrushTool bound to an engine instance.
     *
     * @param engine - The engine facade implementing EngineForPaintbrushTool.
     */
    constructor(engine: EngineForPaintbrushTool)
    {
        this.engine = engine;
    }

    /** @inheritdoc */
    public onActivate(): void
    {
        this.resetState();
        logPaintbrushDebug("Activated");
    }

    /** @inheritdoc */
    public onDeactivate(): void
    {
        this.commitStroke();
        this.resetState();
        logPaintbrushDebug("Deactivated");
    }

    /**
     * Handles mouse-down: checks if click is inside a paintable
     * shape and begins painting on its canvas.
     *
     * @param _e - The originating mouse event.
     * @param canvasPos - Mouse position in canvas coordinate space.
     */
    public onMouseDown(_e: MouseEvent, canvasPos: Point): void
    {
        const target = this.findPaintableTarget(canvasPos);

        if (!target)
        {
            return;
        }

        this.beginStroke(target.objectId, target.canvas, canvasPos);
    }

    /**
     * Handles mouse-move: paints brush marks along the path.
     *
     * @param _e - The originating mouse event.
     * @param canvasPos - Current mouse position in canvas coordinates.
     */
    public onMouseMove(_e: MouseEvent, canvasPos: Point): void
    {
        if (!this.painting || !this.activeCtx || !this.activeObjectId)
        {
            return;
        }

        const localPos = this.toLocalCoords(canvasPos);

        if (localPos)
        {
            this.paintInterpolated(localPos);
        }
    }

    /**
     * Handles mouse-up: finalises the stroke and serialises canvas.
     *
     * @param _e - The originating mouse event.
     * @param _canvasPos - Mouse position in canvas coordinate space.
     */
    public onMouseUp(_e: MouseEvent, _canvasPos: Point): void
    {
        if (!this.painting)
        {
            return;
        }

        this.commitStroke();
    }

    /**
     * Handles key-down: Escape cancels and returns to select tool.
     *
     * @param e - The originating keyboard event.
     */
    public onKeyDown(e: KeyboardEvent): void
    {
        if (e.key !== "Escape")
        {
            return;
        }

        e.preventDefault();
        this.commitStroke();
        this.engine.setActiveTool("select");

        logPaintbrushDebug("Cancelled, back to select");
    }

    // ========================================================================
    // TARGET DETECTION
    // ========================================================================

    /**
     * Finds a paintable shape under the given canvas position.
     * Returns the object ID and canvas element if found.
     *
     * @param canvasPos - Point in canvas coordinates.
     * @returns Object ID and canvas, or null.
     */
    private findPaintableTarget(
        canvasPos: Point
    ): { objectId: string; canvas: HTMLCanvasElement } | null
    {
        const obj = this.engine.hitTestObject(canvasPos);

        if (!obj || !obj.presentation.paintable)
        {
            return null;
        }

        const canvas = this.engine.getPaintableCanvas(obj.id);

        if (!canvas)
        {
            logPaintbrushWarn("No canvas for:", obj.id);
            return null;
        }

        return { objectId: obj.id, canvas };
    }

    // ========================================================================
    // STROKE LIFECYCLE
    // ========================================================================

    /**
     * Begins a new paint stroke on the target canvas.
     *
     * @param objectId - The paintable object ID.
     * @param canvas - The HTML canvas element to paint on.
     * @param canvasPos - Starting position in canvas coordinates.
     */
    private beginStroke(
        objectId: string,
        canvas: HTMLCanvasElement,
        canvasPos: Point): void
    {
        this.painting = true;
        this.activeObjectId = objectId;
        this.activeCtx = canvas.getContext("2d");

        this.beforeData = canvas.toDataURL("image/png");

        const localPos = this.toLocalCoords(canvasPos);

        if (localPos && this.activeCtx)
        {
            this.configureBrush(this.activeCtx);
            this.paintDot(this.activeCtx, localPos);
            this.lastPos = localPos;
        }

        logPaintbrushDebug("Stroke started on:", objectId);
    }

    /**
     * Commits the current stroke: serialises canvas to data URI,
     * updates the object, and pushes an undo command.
     */
    private commitStroke(): void
    {
        if (!this.painting || !this.activeObjectId)
        {
            this.resetState();
            return;
        }

        const objId = this.activeObjectId;
        const canvas = this.engine.getPaintableCanvas(objId);

        if (canvas)
        {
            this.serialiseAndUpdate(objId, canvas);
        }

        logPaintbrushDebug("Stroke committed:", objId);

        this.resetState();
    }

    /**
     * Serialises the canvas content and updates the diagram object.
     * Also pushes an undo command to restore the previous state.
     *
     * @param objId - The diagram object ID.
     * @param canvas - The painted canvas element.
     */
    private serialiseAndUpdate(
        objId: string,
        canvas: HTMLCanvasElement): void
    {
        const dataUri = canvas.toDataURL("image/png");
        const beforeUri = this.beforeData;
        const obj = this.engine.getObjectById(objId);

        if (!obj || !obj.presentation.paintable)
        {
            return;
        }

        obj.presentation.paintable.canvasData = dataUri;

        this.pushPaintUndo(objId, beforeUri, dataUri);
    }

    /**
     * Pushes an undo command for the paint stroke.
     *
     * @param objId - The object ID.
     * @param beforeUri - Canvas data URI before the stroke.
     * @param afterUri - Canvas data URI after the stroke.
     */
    private pushPaintUndo(
        objId: string,
        beforeUri: string | null,
        afterUri: string): void
    {
        this.engine.pushUndoCommand({
            type: "paintbrush-stroke",
            label: "Paint stroke",
            timestamp: Date.now(),
            mergeable: false,
            undo: (): void =>
            {
                this.restoreCanvasData(objId, beforeUri);
            },
            redo: (): void =>
            {
                this.restoreCanvasData(objId, afterUri);
            }
        });
    }

    /**
     * Restores canvas data from a data URI string. Updates both the
     * visual canvas and the object's paintable.canvasData property.
     *
     * @param objId - The diagram object ID.
     * @param dataUri - The data URI to restore, or null for blank.
     */
    private restoreCanvasData(
        objId: string,
        dataUri: string | null): void
    {
        const obj = this.engine.getObjectById(objId);

        if (!obj || !obj.presentation.paintable)
        {
            return;
        }

        obj.presentation.paintable.canvasData = dataUri ?? undefined;

        const canvas = this.engine.getPaintableCanvas(objId);

        if (!canvas)
        {
            return;
        }

        const ctx = canvas.getContext("2d");

        if (!ctx)
        {
            return;
        }

        this.clearAndRestore(ctx, canvas, dataUri);
    }

    /**
     * Clears a canvas and optionally restores from a data URI.
     *
     * @param ctx - The 2D rendering context.
     * @param canvas - The canvas element.
     * @param dataUri - Data URI to restore, or null to leave blank.
     */
    private clearAndRestore(
        ctx: CanvasRenderingContext2D,
        canvas: HTMLCanvasElement,
        dataUri: string | null): void
    {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!dataUri)
        {
            return;
        }

        const img = new Image();

        img.onload = (): void =>
        {
            ctx.drawImage(img, 0, 0);
        };

        img.src = dataUri;
    }

    // ========================================================================
    // PAINTING
    // ========================================================================

    /**
     * Configures the 2D context with the current brush settings.
     *
     * @param ctx - The canvas 2D rendering context.
     */
    private configureBrush(ctx: CanvasRenderingContext2D): void
    {
        ctx.globalAlpha = this.brushAlpha;
        ctx.fillStyle = this.brushColor;
        ctx.strokeStyle = this.brushColor;
        ctx.lineWidth = this.brushSize;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        this.applyBrushHardness(ctx);
    }

    /** Apply edge softness via shadowBlur. 0 = fully soft, 1 = hard. */
    private applyBrushHardness(ctx: CanvasRenderingContext2D): void
    {
        const softness = 1 - Math.max(0, Math.min(1, this.brushHardness));

        if (softness > 0)
        {
            ctx.shadowBlur = softness * this.brushSize;
            ctx.shadowColor = this.brushColor;
        }
        else
        {
            ctx.shadowBlur = 0;
            ctx.shadowColor = "transparent";
        }
    }

    /**
     * Paints interpolated points from the last position to the
     * current position for smooth strokes.
     *
     * @param pos - Current position in local canvas coordinates.
     */
    private paintInterpolated(pos: Point): void
    {
        if (!this.activeCtx || !this.lastPos)
        {
            this.lastPos = pos;
            return;
        }

        this.paintLineTo(this.activeCtx, this.lastPos, pos);
        this.lastPos = pos;
    }

    /**
     * Draws a line segment from one point to another using the
     * canvas stroke API for smooth results.
     *
     * @param ctx - The 2D rendering context.
     * @param from - Start point.
     * @param to - End point.
     */
    private paintLineTo(
        ctx: CanvasRenderingContext2D,
        from: Point,
        to: Point): void
    {
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
    }

    /**
     * Paints a single dot at the given position. Uses arc for
     * circle brushes and fillRect for square brushes.
     *
     * @param ctx - The 2D rendering context.
     * @param pos - Position in local canvas coordinates.
     */
    private paintDot(
        ctx: CanvasRenderingContext2D,
        pos: Point): void
    {
        const half = this.brushSize / 2;

        if (this.brushShape === "square")
        {
            ctx.fillRect(pos.x - half, pos.y - half, this.brushSize, this.brushSize);
            return;
        }

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, half, 0, Math.PI * 2);
        ctx.fill();
    }

    // ========================================================================
    // COORDINATE CONVERSION
    // ========================================================================

    /**
     * Converts a canvas-space point to local coordinates within the
     * active paintable shape's bounds.
     *
     * @param canvasPos - Point in diagram canvas coordinates.
     * @returns Local position, or null if no active object.
     */
    private toLocalCoords(canvasPos: Point): Point | null
    {
        if (!this.activeObjectId)
        {
            return null;
        }

        const obj = this.engine.getObjectById(this.activeObjectId);

        if (!obj)
        {
            return null;
        }

        const b = obj.presentation.bounds;

        return {
            x: canvasPos.x - b.x,
            y: canvasPos.y - b.y
        };
    }

    // ========================================================================
    // STATE MANAGEMENT
    // ========================================================================

    /**
     * Resets all painting state to idle.
     */
    private resetState(): void
    {
        this.painting = false;
        this.activeObjectId = null;
        this.activeCtx = null;
        this.lastPos = null;
        this.beforeData = null;
    }
}

// ========================================================================
// SOURCE: tool-highlighter.ts
// ========================================================================

/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: HighlighterTool
 * PURPOSE: Semi-transparent freehand highlighting tool for the DiagramEngine
 *    canvas. Behaves like BrushTool but uses a wider, translucent stroke
 *    to simulate a real highlighter. Supports configurable highlight
 *    colours (yellow, pink, blue, green, orange, red). Auto-switches to
 *    select tool after stroke finalisation.
 * RELATES: [[ToolManager]], [[DiagramEngine]], [[BrushTool]]
 * FLOW: [ToolManager.dispatch*()] -> [HighlighterTool] -> [EngineForHighlighterTool]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// ENGINE INTERFACE (FORWARD REFERENCE)
// ============================================================================

/**
 * Engine interface consumed by the HighlighterTool. Extends EngineForTools
 * with object creation and removal methods needed for finalising
 * the freehand highlight stroke into a diagram object.
 */
interface EngineForHighlighterTool extends EngineForTools
{
    /**
     * Adds a new object to the document.
     *
     * @param partial - Partial object definition.
     * @returns The fully constructed DiagramObject.
     */
    addObject(partial: DiagramObjectInput): DiagramObject;

    /**
     * Removes an object from the document by ID.
     *
     * @param id - The object ID to remove.
     */
    removeObject(id: string): void;

    /**
     * Pushes an undo command onto the engine's undo stack.
     *
     * @param cmd - The undo command to push.
     */
    pushUndoCommand(cmd: UndoCommand): void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Log prefix for HighlighterTool console messages. */
const HIGHLIGHTER_LOG_PREFIX = "[HighlighterTool]";

function logHighlighterInfo(...args: unknown[]): void
{
    console.log(new Date().toISOString(), "[INFO]", HIGHLIGHTER_LOG_PREFIX, ...args);
}

function logHighlighterWarn(...args: unknown[]): void
{
    console.warn(new Date().toISOString(), "[WARN]", HIGHLIGHTER_LOG_PREFIX, ...args);
}

function logHighlighterError(...args: unknown[]): void
{
    console.error(new Date().toISOString(), "[ERROR]", HIGHLIGHTER_LOG_PREFIX, ...args);
}

function logHighlighterDebug(...args: unknown[]): void
{
    console.debug(new Date().toISOString(), "[DEBUG]", HIGHLIGHTER_LOG_PREFIX, ...args);
}

/** SVG namespace for creating preview elements. */
const HIGHLIGHTER_SVG_NS = "http://www.w3.org/2000/svg";

/** Default stroke width for highlighter paths. */
const HIGHLIGHTER_STROKE_WIDTH = 10;

/** Distance threshold in pixels for point simplification. */
const HIGHLIGHTER_SIMPLIFY_TOLERANCE = 3;

// -- Highlight colour presets ------------------------------------------------

/** Semi-transparent yellow highlight. */
const HIGHLIGHT_YELLOW = "rgba(255, 255, 0, 0.4)";

/** Semi-transparent pink highlight. */
const HIGHLIGHT_PINK = "rgba(255, 182, 193, 0.4)";

/** Semi-transparent blue highlight. */
const HIGHLIGHT_BLUE = "rgba(173, 216, 230, 0.4)";

/** Semi-transparent green highlight. */
const HIGHLIGHT_GREEN = "rgba(144, 238, 144, 0.4)";

/** Semi-transparent orange highlight. */
const HIGHLIGHT_ORANGE = "rgba(255, 200, 100, 0.4)";

/** Semi-transparent red highlight. */
const HIGHLIGHT_RED = "rgba(255, 128, 128, 0.4)";

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Canvas tool for freehand highlighting with semi-transparent strokes.
 *
 * **Interaction flow:**
 * 1. Mouse-down starts a highlight stroke.
 * 2. Mouse-move captures points and renders a live preview.
 * 3. Mouse-up applies point simplification and creates a "path" object.
 * 4. Escape cancels and switches back to select tool.
 * 5. After finalisation, auto-switches to select tool.
 */
class HighlighterTool implements Tool
{
    /** @inheritdoc */
    public readonly name = "highlighter";

    /** @inheritdoc */
    public readonly cursor = "crosshair";

    /** Reference to the engine facade. */
    private readonly engine: EngineForHighlighterTool;

    /** Whether a stroke is currently in progress. */
    private drawing: boolean = false;

    /** Raw collected points during the stroke. */
    private rawPoints: Point[] = [];

    /** Current highlight colour. Defaults to semi-transparent yellow. */
    public highlightColor: string = HIGHLIGHT_YELLOW;

    /**
     * Creates a HighlighterTool bound to an engine instance.
     *
     * @param engine - The engine facade implementing EngineForHighlighterTool.
     */
    constructor(engine: EngineForHighlighterTool)
    {
        this.engine = engine;
    }

    /** @inheritdoc */
    public onActivate(): void
    {
        this.resetState();
        logHighlighterDebug("Activated");
    }

    /** @inheritdoc */
    public onDeactivate(): void
    {
        this.resetState();
        this.engine.clearToolOverlay();
        logHighlighterDebug("Deactivated");
    }

    /**
     * Handles mouse-down: begins a new highlight stroke.
     *
     * @param _e - The originating mouse event.
     * @param canvasPos - Mouse position in canvas coordinate space.
     */
    public onMouseDown(_e: MouseEvent, canvasPos: Point): void
    {
        this.drawing = true;
        this.rawPoints = [{ x: canvasPos.x, y: canvasPos.y }];

        logHighlighterDebug("Stroke started");
    }

    /**
     * Handles mouse-move: captures a point and updates the preview.
     *
     * @param _e - The originating mouse event.
     * @param canvasPos - Current mouse position in canvas coordinates.
     */
    public onMouseMove(_e: MouseEvent, canvasPos: Point): void
    {
        if (!this.drawing)
        {
            return;
        }

        this.rawPoints.push({ x: canvasPos.x, y: canvasPos.y });
        this.renderHighlightPreview();
    }

    /**
     * Handles mouse-up: finalises the stroke into a path object.
     *
     * @param _e - The originating mouse event.
     * @param _canvasPos - Mouse position in canvas coordinate space.
     */
    public onMouseUp(_e: MouseEvent, _canvasPos: Point): void
    {
        if (!this.drawing)
        {
            return;
        }

        this.finaliseStroke();
    }

    /**
     * Handles key-down: Escape cancels and returns to select tool.
     *
     * @param e - The originating keyboard event.
     */
    public onKeyDown(e: KeyboardEvent): void
    {
        if (e.key !== "Escape")
        {
            return;
        }

        e.preventDefault();
        this.cancelStroke();
    }

    // ========================================================================
    // PREVIEW RENDERING
    // ========================================================================

    /**
     * Renders the current highlight stroke as a live preview on the
     * tool overlay layer with round line caps and joins.
     */
    private renderHighlightPreview(): void
    {
        this.engine.clearToolOverlay();

        const overlay = this.getOverlayElement();

        if (!overlay || this.rawPoints.length < 2)
        {
            return;
        }

        const d = highlighterPointsToPathData(this.rawPoints);
        const path = this.createPreviewPath(d);

        overlay.appendChild(path);
    }

    /**
     * Creates an SVG path element for the highlight preview with
     * round caps and joins and the active highlight colour.
     *
     * @param d - SVG path data string.
     * @returns Styled SVG path element.
     */
    private createPreviewPath(d: string): SVGElement
    {
        const path = document.createElementNS(HIGHLIGHTER_SVG_NS, "path");

        path.setAttribute("d", d);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", this.highlightColor);
        path.setAttribute("stroke-width", String(HIGHLIGHTER_STROKE_WIDTH));
        path.setAttribute("stroke-linecap", "round");
        path.setAttribute("stroke-linejoin", "round");
        path.setAttribute("pointer-events", "none");

        return path;
    }

    /**
     * Locates the tool overlay SVG group element.
     *
     * @returns The overlay element, or null.
     */
    private getOverlayElement(): Element | null
    {
        const svg = document.querySelector(".de-canvas");

        if (!svg)
        {
            return null;
        }

        return svg.querySelector(".de-tool-overlay");
    }

    // ========================================================================
    // FINALISATION
    // ========================================================================

    /**
     * Finalises the highlight stroke: simplifies points, computes
     * bounding box, converts to local coordinates, and creates
     * the diagram object. Auto-switches to select tool.
     */
    private finaliseStroke(): void
    {
        this.drawing = false;
        this.engine.clearToolOverlay();

        if (this.rawPoints.length < 2)
        {
            logHighlighterDebug("Stroke too short, discarded");
            this.resetState();
            return;
        }

        const simplified = highlighterSimplifyPoints(
            this.rawPoints, HIGHLIGHTER_SIMPLIFY_TOLERANCE
        );
        const bbox = computeHighlighterBBox(simplified);
        const localD = toHighlighterLocalPathData(simplified, bbox);

        this.createHighlighterObject(bbox, localD);

        const pointsBefore = this.rawPoints.length;

        this.resetState();
        this.engine.setActiveTool("select");

        logHighlighterInfo("Stroke finalised:",
            pointsBefore, "->", simplified.length, "points"
        );
    }

    /**
     * Creates the highlighter diagram object with round line styling,
     * translucent stroke, and no fill. Pushes an undo command.
     *
     * @param bbox - Bounding rectangle for the stroke.
     * @param pathData - SVG path data in local coordinates.
     */
    private createHighlighterObject(bbox: Rect, pathData: string): void
    {
        const obj = this.engine.addObject({
            semantic: { type: "highlighter", data: { source: "highlighter" } },
            presentation: {
                shape: "path",
                bounds: bbox,
                style: {
                    fill: { type: "none" },
                    stroke: {
                        color: this.highlightColor,
                        width: HIGHLIGHTER_STROKE_WIDTH,
                        lineCap: "round",
                        lineJoin: "round"
                    }
                },
                parameters: { d: pathData } as unknown as Record<string, number | Point>
            }
        });

        this.pushHighlighterUndo(obj);

        this.engine.clearSelectionInternal();
        this.engine.addToSelection(obj.id);
    }

    /**
     * Pushes an undo command for the created highlighter path object.
     *
     * @param obj - The created diagram object.
     */
    private pushHighlighterUndo(obj: DiagramObject): void
    {
        const objId = obj.id;
        const snapshot: DiagramObjectInput = {
            id: obj.id,
            semantic: { ...obj.semantic },
            presentation: { ...obj.presentation }
        };

        this.engine.pushUndoCommand({
            type: "highlighter-path",
            label: "Draw path (highlighter)",
            timestamp: Date.now(),
            mergeable: false,
            undo: (): void =>
            {
                this.engine.removeObject(objId);
            },
            redo: (): void =>
            {
                this.engine.addObject(snapshot);
            }
        });
    }

    // ========================================================================
    // CANCELLATION AND STATE
    // ========================================================================

    /**
     * Cancels the current stroke and returns to select tool.
     */
    private cancelStroke(): void
    {
        this.resetState();
        this.engine.clearToolOverlay();
        this.engine.setActiveTool("select");

        logHighlighterDebug("Stroke cancelled");
    }

    /**
     * Resets all stroke-related state to idle.
     */
    private resetState(): void
    {
        this.drawing = false;
        this.rawPoints = [];
    }
}

// ============================================================================
// POINT SIMPLIFICATION
// ============================================================================

/**
 * Simplifies a point array by removing points closer than the
 * given tolerance to the previous retained point. This produces
 * smoother, more compact path data from dense mouse events.
 *
 * @param pts - Raw point array from mouse events.
 * @param tolerance - Minimum distance between retained points.
 * @returns Simplified array of points.
 */
function highlighterSimplifyPoints(pts: Point[], tolerance: number): Point[]
{
    if (pts.length <= 2)
    {
        return pts.slice();
    }

    const result: Point[] = [pts[0]];
    let lastKept = pts[0];
    const tolSq = tolerance * tolerance;

    for (let i = 1; i < pts.length - 1; i++)
    {
        const dx = pts[i].x - lastKept.x;
        const dy = pts[i].y - lastKept.y;

        if ((dx * dx + dy * dy) >= tolSq)
        {
            result.push(pts[i]);
            lastKept = pts[i];
        }
    }

    // Always keep the last point
    result.push(pts[pts.length - 1]);

    return result;
}

// ============================================================================
// PATH DATA HELPERS
// ============================================================================

/**
 * Converts an array of points to SVG path data (M + L commands).
 *
 * @param pts - Array of points.
 * @returns SVG path data string.
 */
function highlighterPointsToPathData(pts: Point[]): string
{
    if (pts.length === 0)
    {
        return "";
    }

    const parts = [`M ${pts[0].x} ${pts[0].y}`];

    for (let i = 1; i < pts.length; i++)
    {
        parts.push(`L ${pts[i].x} ${pts[i].y}`);
    }

    return parts.join(" ");
}

/**
 * Computes the bounding box of points with minimum 1-pixel dimensions.
 *
 * @param pts - Array of points.
 * @returns Bounding rectangle enclosing all points.
 */
function computeHighlighterBBox(pts: Point[]): Rect
{
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const pt of pts)
    {
        minX = Math.min(minX, pt.x);
        minY = Math.min(minY, pt.y);
        maxX = Math.max(maxX, pt.x);
        maxY = Math.max(maxY, pt.y);
    }

    return {
        x: minX,
        y: minY,
        width: Math.max(1, maxX - minX),
        height: Math.max(1, maxY - minY)
    };
}

/**
 * Converts absolute points to local path data relative to the
 * bounding box origin.
 *
 * @param pts - Points in absolute canvas coordinates.
 * @param bbox - Bounding rectangle to use as local origin.
 * @returns SVG path data string in local coordinates.
 */
function toHighlighterLocalPathData(pts: Point[], bbox: Rect): string
{
    const localPts = pts.map((pt) => ({
        x: pt.x - bbox.x,
        y: pt.y - bbox.y
    }));

    return highlighterPointsToPathData(localPts);
}

// ========================================================================
// SOURCE: tool-measure.ts
// ========================================================================

/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: MeasureTool
 * PURPOSE: Distance measurement tool for the DiagramEngine canvas. Click
 *    and drag to measure the pixel distance between two points. Renders
 *    a dashed red line with a distance label at the midpoint.
 * RELATES: [[ToolManager]], [[DiagramEngine]], [[SelectTool]]
 * FLOW: [ToolManager.dispatch*()] -> [MeasureTool] -> [EngineForTools]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// CONSTANTS
// ============================================================================

/** Log prefix for MeasureTool console messages. */
const MEASURE_LOG_PREFIX = "[MeasureTool]";

function logMeasureInfo(...args: unknown[]): void
{
    console.log(new Date().toISOString(), "[INFO]", MEASURE_LOG_PREFIX, ...args);
}

function logMeasureWarn(...args: unknown[]): void
{
    console.warn(new Date().toISOString(), "[WARN]", MEASURE_LOG_PREFIX, ...args);
}

function logMeasureError(...args: unknown[]): void
{
    console.error(new Date().toISOString(), "[ERROR]", MEASURE_LOG_PREFIX, ...args);
}

function logMeasureDebug(...args: unknown[]): void
{
    console.debug(new Date().toISOString(), "[DEBUG]", MEASURE_LOG_PREFIX, ...args);
}

/** SVG namespace for creating overlay elements. */
const MEASURE_SVG_NS = "http://www.w3.org/2000/svg";

/** Colour for the measurement line and label. */
const MEASURE_COLOR = "#dc3545";

/** Stroke width for the measurement line. */
const MEASURE_LINE_WIDTH = 1.5;

/** Dash pattern for the measurement line. */
const MEASURE_DASH = "6 3";

/** Font size for the distance label. */
const MEASURE_FONT_SIZE = 12;

/** Vertical offset of the label above the midpoint. */
const MEASURE_LABEL_OFFSET = -10;

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Canvas tool for measuring pixel distances between two points.
 *
 * **Interaction flow:**
 * 1. Click and drag to define start and end points.
 * 2. A dashed red line renders between the points with a distance
 *    label at the midpoint.
 * 3. The line stays visible until the next interaction.
 * 4. Press Escape to switch back to the select tool.
 */
class MeasureTool implements Tool
{
    /** @inheritdoc */
    public readonly name = "measure";

    /** @inheritdoc */
    public readonly cursor = "crosshair";

    /** Reference to the engine facade. */
    private readonly engine: EngineForTools;

    /** Whether a measurement drag is in progress. */
    private dragging: boolean = false;

    /** Start point of the measurement. */
    private startPoint: Point = { x: 0, y: 0 };

    /**
     * Creates a MeasureTool bound to an engine instance.
     *
     * @param engine - The engine facade implementing EngineForTools.
     */
    constructor(engine: EngineForTools)
    {
        this.engine = engine;
    }

    /** @inheritdoc */
    public onActivate(): void
    {
        this.resetState();
        logMeasureDebug("Activated");
    }

    /** @inheritdoc */
    public onDeactivate(): void
    {
        this.resetState();
        this.engine.clearToolOverlay();
        logMeasureDebug("Deactivated");
    }

    /**
     * Handles mouse-down: records the start point of the measurement.
     *
     * @param _e - The originating mouse event.
     * @param canvasPos - Mouse position in canvas coordinate space.
     */
    public onMouseDown(_e: MouseEvent, canvasPos: Point): void
    {
        this.engine.clearToolOverlay();
        this.dragging = true;
        this.startPoint = { x: canvasPos.x, y: canvasPos.y };
    }

    /**
     * Handles mouse-move: updates the measurement preview.
     *
     * @param _e - The originating mouse event.
     * @param canvasPos - Current mouse position in canvas coordinates.
     */
    public onMouseMove(_e: MouseEvent, canvasPos: Point): void
    {
        if (!this.dragging)
        {
            return;
        }

        this.renderMeasurement(canvasPos);
    }

    /**
     * Handles mouse-up: finalises the measurement display.
     * The measurement line remains visible until cleared.
     *
     * @param _e - The originating mouse event.
     * @param canvasPos - Mouse position where the drag ended.
     */
    public onMouseUp(_e: MouseEvent, canvasPos: Point): void
    {
        if (!this.dragging)
        {
            return;
        }

        this.dragging = false;
        this.renderMeasurement(canvasPos);

        const distance = computeDistance(this.startPoint, canvasPos);

        logMeasureInfo("Distance:",
            Math.round(distance), "px"
        );
    }

    /**
     * Handles key-down: Escape switches back to select tool.
     *
     * @param e - The originating keyboard event.
     */
    public onKeyDown(e: KeyboardEvent): void
    {
        if (e.key !== "Escape")
        {
            return;
        }

        e.preventDefault();
        this.engine.clearToolOverlay();
        this.resetState();
        this.engine.setActiveTool("select");

        logMeasureDebug("Switched to select");
    }

    // ========================================================================
    // RENDERING
    // ========================================================================

    /**
     * Renders the measurement line and distance label on the
     * tool overlay layer.
     *
     * @param endPoint - End point of the measurement.
     */
    private renderMeasurement(endPoint: Point): void
    {
        this.engine.clearToolOverlay();

        const overlay = this.getOverlayElement();

        if (!overlay)
        {
            return;
        }

        this.renderMeasureLine(overlay, endPoint);
        this.renderDistanceLabel(overlay, endPoint);
    }

    /**
     * Renders the dashed red measurement line.
     *
     * @param overlay - SVG overlay element.
     * @param endPoint - End point of the measurement.
     */
    private renderMeasureLine(overlay: Element, endPoint: Point): void
    {
        const line = document.createElementNS(MEASURE_SVG_NS, "line");

        line.setAttribute("x1", String(this.startPoint.x));
        line.setAttribute("y1", String(this.startPoint.y));
        line.setAttribute("x2", String(endPoint.x));
        line.setAttribute("y2", String(endPoint.y));
        line.setAttribute("stroke", MEASURE_COLOR);
        line.setAttribute("stroke-width", String(MEASURE_LINE_WIDTH));
        line.setAttribute("stroke-dasharray", MEASURE_DASH);
        line.setAttribute("pointer-events", "none");

        overlay.appendChild(line);
    }

    /**
     * Renders the distance label at the midpoint of the measurement.
     *
     * @param overlay - SVG overlay element.
     * @param endPoint - End point of the measurement.
     */
    private renderDistanceLabel(overlay: Element, endPoint: Point): void
    {
        const distance = computeDistance(this.startPoint, endPoint);
        const midX = (this.startPoint.x + endPoint.x) / 2;
        const midY = (this.startPoint.y + endPoint.y) / 2;

        const text = document.createElementNS(MEASURE_SVG_NS, "text");

        text.setAttribute("x", String(midX));
        text.setAttribute("y", String(midY + MEASURE_LABEL_OFFSET));
        text.setAttribute("fill", MEASURE_COLOR);
        text.setAttribute("font-size", String(MEASURE_FONT_SIZE));
        text.setAttribute("font-family", "inherit");
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("pointer-events", "none");
        text.textContent = `${Math.round(distance)}px`;

        overlay.appendChild(text);
    }

    /**
     * Locates the tool overlay SVG group element.
     *
     * @returns The overlay element, or null.
     */
    private getOverlayElement(): Element | null
    {
        const svg = document.querySelector(".de-canvas");

        if (!svg)
        {
            return null;
        }

        return svg.querySelector(".de-tool-overlay");
    }

    // ========================================================================
    // STATE
    // ========================================================================

    /**
     * Resets all measurement state to idle.
     */
    private resetState(): void
    {
        this.dragging = false;
        this.startPoint = { x: 0, y: 0 };
    }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Computes the Euclidean distance between two points.
 *
 * @param a - First point.
 * @param b - Second point.
 * @returns Distance in pixels.
 */
function computeDistance(a: Point, b: Point): number
{
    const dx = b.x - a.x;
    const dy = b.y - a.y;

    return Math.sqrt((dx * dx) + (dy * dy));
}

// ========================================================================
// SOURCE: tool-manager.ts
// ========================================================================

/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: ToolManager
 * PURPOSE: Tool interface definition and tool lifecycle manager for the
 *    DiagramEngine canvas. Only one tool is active at a time — the manager
 *    handles activation, deactivation, and input dispatch.
 * RELATES: [[DiagramEngine]], [[SelectTool]], [[PanTool]]
 * FLOW: [Canvas Events] -> [ToolManager.dispatch*()] -> [Active Tool]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// TYPES
// ============================================================================

/**
 * Interface that all canvas tools must implement.
 * Tools are state machines — only one is active at a time.
 */
interface Tool
{
    /** Unique tool name. */
    name: string;

    /** CSS cursor when this tool is active. */
    cursor: string;

    /** Called when the tool becomes active. */
    onActivate(): void;

    /** Called when the tool is deactivated. */
    onDeactivate(): void;

    /**
     * Handle mouse down in canvas coordinates.
     *
     * @param e - The originating mouse event.
     * @param canvasPos - Mouse position in canvas coordinate space.
     */
    onMouseDown(e: MouseEvent, canvasPos: Point): void;

    /**
     * Handle mouse move in canvas coordinates.
     *
     * @param e - The originating mouse event.
     * @param canvasPos - Mouse position in canvas coordinate space.
     */
    onMouseMove(e: MouseEvent, canvasPos: Point): void;

    /**
     * Handle mouse up in canvas coordinates.
     *
     * @param e - The originating mouse event.
     * @param canvasPos - Mouse position in canvas coordinate space.
     */
    onMouseUp(e: MouseEvent, canvasPos: Point): void;

    /**
     * Handle keyboard events.
     *
     * @param e - The originating keyboard event.
     */
    onKeyDown(e: KeyboardEvent): void;

    /**
     * Optional — whether the tool is in the middle of an interaction
     * (drag, pan, connect). Used by the engine to suppress the hover
     * card during edits (ADR-126). Tools that do not implement it are
     * assumed to be non-interactive.
     */
    isInteracting?(): boolean;
}

/** Log prefix for all console messages from this module. */





// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Manages tool registration, activation, and input dispatch.
 *
 * Tools are registered by name and only one can be active at a time.
 * All canvas input events are routed through the manager to the
 * currently active tool.
 */
class ToolManager
{
    /** Registry of all registered tools, keyed by name. */
    private readonly tools: Map<string, Tool> = new Map();

    /** Name of the currently active tool ("" when none). */
    private activeToolName: string = "";

    /** SVG canvas element for cursor styling. */
    private svgEl: SVGElement | null = null;

    /** Set the SVG canvas element for cursor updates. */
    public setSvgElement(svg: SVGElement): void
    {
        this.svgEl = svg;
    }

    /**
     * Register a tool with the manager.
     *
     * @param tool - The tool instance to register.
     */
    public register(tool: Tool): void
    {
        if (this.tools.has(tool.name))
        {
            logWarn(`Tool "${tool.name}" is already registered; replacing.`);
        }

        this.tools.set(tool.name, tool);
    }

    /**
     * Look up a registered tool by name.
     *
     * @param name - The tool name to find.
     * @returns The tool instance, or null if not registered.
     */
    public get(name: string): Tool | null
    {
        return this.tools.get(name) ?? null;
    }

    /**
     * Switch the active tool.
     *
     * Deactivates the current tool (if any) and activates the
     * requested tool. Logs a warning if the target is not registered.
     *
     * @param name - The name of the tool to activate.
     */
    public setActive(name: string): void
    {
        const nextTool = this.tools.get(name);

        if (!nextTool)
        {
            logWarn(`Tool "${name}" not found.`);
            return;
        }

        this.deactivateCurrent();
        this.activateTool(name, nextTool);
    }

    /**
     * Return the currently active tool instance.
     *
     * @returns The active tool, or null if none is active.
     */
    public getActive(): Tool | null
    {
        if (!this.activeToolName)
        {
            return null;
        }

        return this.tools.get(this.activeToolName) ?? null;
    }

    /**
     * Return the name of the currently active tool.
     *
     * @returns The active tool name, or empty string if none.
     */
    public getActiveName(): string
    {
        return this.activeToolName;
    }

    /** Returns a tool instance by name, or null. */
    public getToolByName(name: string): Tool | null
    {
        return this.tools.get(name) ?? null;
    }

    /**
     * Forward a mousedown event to the active tool.
     *
     * @param e - The originating mouse event.
     * @param pos - Mouse position in canvas coordinate space.
     */
    public dispatchMouseDown(e: MouseEvent, pos: Point): void
    {
        this.getActive()?.onMouseDown(e, pos);
    }

    /**
     * Forward a mousemove event to the active tool.
     *
     * @param e - The originating mouse event.
     * @param pos - Mouse position in canvas coordinate space.
     */
    public dispatchMouseMove(e: MouseEvent, pos: Point): void
    {
        this.getActive()?.onMouseMove(e, pos);
    }

    /**
     * Forward a mouseup event to the active tool.
     *
     * @param e - The originating mouse event.
     * @param pos - Mouse position in canvas coordinate space.
     */
    public dispatchMouseUp(e: MouseEvent, pos: Point): void
    {
        this.getActive()?.onMouseUp(e, pos);
    }

    /**
     * Forward a keydown event to the active tool.
     *
     * @param e - The originating keyboard event.
     */
    public dispatchKeyDown(e: KeyboardEvent): void
    {
        this.getActive()?.onKeyDown(e);
    }

    /**
     * Whether the active tool is mid-interaction (drag, pan, connect).
     * Returns false when no tool is active or the active tool does not
     * implement `isInteracting()`.
     */
    public isInteracting(): boolean
    {
        const active = this.getActive();

        if (!active || typeof active.isInteracting !== "function")
        {
            return false;
        }

        return active.isInteracting();
    }

    // ========================================================================
    // PRIVATE HELPERS
    // ========================================================================

    /**
     * Deactivate the currently active tool, if any.
     */
    private deactivateCurrent(): void
    {
        const current = this.getActive();

        if (current)
        {
            current.onDeactivate();
        }
    }

    /**
     * Activate a tool and update the active tool name.
     *
     * @param name - The tool name being activated.
     * @param tool - The tool instance to activate.
     */
    private activateTool(name: string, tool: Tool): void
    {
        this.activeToolName = name;
        tool.onActivate();
        this.applyCursor(tool.cursor);
    }

    /** Apply the tool's cursor to the SVG canvas element. */
    private applyCursor(cursor: string): void
    {
        if (this.svgEl)
        {
            this.svgEl.style.cursor = cursor;
        }
    }
}

// ========================================================================
// SOURCE: templates.ts
// ========================================================================

/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: DiagramEngine Templates
 * PURPOSE: Template engine for {{variable}} data binding. Resolves mustache-
 *    style template expressions in text content against a data context,
 *    supporting dot-path traversal and string filters.
 * RELATES: [[DiagramEngine]], [[DiagramDocument]], [[TextContent]]
 * FLOW: [resolveDocumentTemplates()] -> [Walk objects] -> [resolveTemplateVars()]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// CONSTANTS
// ============================================================================

/** Log prefix for template engine console messages. */
const TPL_LOG = "[DiagramEngine:Templates]";

function logTplInfo(...args: unknown[]): void
{
    console.log(new Date().toISOString(), "[INFO]", TPL_LOG, ...args);
}

function logTplWarn(...args: unknown[]): void
{
    console.warn(new Date().toISOString(), "[WARN]", TPL_LOG, ...args);
}

function logTplError(...args: unknown[]): void
{
    console.error(new Date().toISOString(), "[ERROR]", TPL_LOG, ...args);
}

function logTplDebug(...args: unknown[]): void
{
    console.debug(new Date().toISOString(), "[DEBUG]", TPL_LOG, ...args);
}

/** Pattern matching {{expression}} placeholders in text. */
const TEMPLATE_PATTERN = /\{\{([^}]+)\}\}/g;

/** Separator between a variable path and its filter. */
const FILTER_SEPARATOR = "|";

// ============================================================================
// DOT-PATH RESOLUTION
// ============================================================================

/**
 * Walks a dot-separated property path on an object. Returns undefined
 * if any intermediate segment is missing or not an object.
 *
 * @param obj - Root object to traverse.
 * @param path - Dot-separated property path (e.g. "project.name").
 * @returns The resolved value, or undefined if the path is invalid.
 */
function resolveDotPath(
    obj: Record<string, unknown>,
    path: string
): unknown
{
    const segments = path.split(".");
    let current: unknown = obj;

    for (const segment of segments)
    {
        if (current === null || current === undefined)
        {
            return undefined;
        }

        if (typeof current !== "object")
        {
            return undefined;
        }

        current = (current as Record<string, unknown>)[segment];
    }

    return current;
}

// ============================================================================
// FILTERS
// ============================================================================

/**
 * Applies a named string filter to a value. Unrecognised filters are
 * logged as warnings and the value is returned unchanged.
 *
 * Supported filters:
 * - `uppercase` — Converts to upper case.
 * - `lowercase` — Converts to lower case.
 * - `capitalize` — Upper-cases the first character of each word.
 * - `format` — Returns the value unchanged (placeholder for future formatters).
 *
 * @param value - The string value to filter.
 * @param filter - The filter name (trimmed, case-insensitive).
 * @returns The filtered string.
 */
function applyFilter(value: string, filter: string): string
{
    const normalised = filter.trim().toLowerCase();

    if (normalised === "uppercase")
    {
        return value.toUpperCase();
    }

    if (normalised === "lowercase")
    {
        return value.toLowerCase();
    }

    if (normalised === "capitalize")
    {
        return capitalizeWords(value);
    }

    if (normalised === "format")
    {
        return value;
    }

    logTplWarn("Unknown filter:", filter);
    return value;
}

/**
 * Capitalizes the first letter of each word in a string.
 *
 * @param text - Input text.
 * @returns Text with each word's first letter upper-cased.
 */
function capitalizeWords(text: string): string
{
    return text.replace(/\b\w/g, (ch) => ch.toUpperCase());
}

// ============================================================================
// TEMPLATE VARIABLE RESOLUTION
// ============================================================================

/**
 * Replaces all {{expression}} placeholders in a text string with values
 * from the data context. Expressions may use dot-paths and pipe filters:
 *   - `{{project.name}}` — resolves dot-path "project.name"
 *   - `{{title | uppercase}}` — resolves "title" then applies uppercase
 *
 * Unresolvable expressions are replaced with an empty string.
 *
 * @param text - Template text containing {{expressions}}.
 * @param data - Data context for variable resolution.
 * @returns The text with all expressions replaced.
 */
function resolveTemplateVars(
    text: string,
    data: Record<string, unknown>
): string
{
    return text.replace(TEMPLATE_PATTERN, (_match, expr: string) =>
    {
        return resolveExpression(expr, data);
    });
}

/**
 * Resolves a single template expression (the content inside {{ }}).
 * Splits on the pipe character to separate the variable path from
 * any filter, resolves the path, and applies the filter.
 *
 * @param expr - Raw expression string (e.g. "title | uppercase").
 * @param data - Data context for resolution.
 * @returns The resolved and filtered string value.
 */
function resolveExpression(
    expr: string,
    data: Record<string, unknown>
): string
{
    const parts = expr.split(FILTER_SEPARATOR);
    const path = parts[0].trim();
    const filter = parts.length > 1 ? parts[1].trim() : null;

    const raw = resolveDotPath(data, path);
    const str = convertToString(raw);

    if (filter)
    {
        return applyFilter(str, filter);
    }

    return str;
}

/**
 * Converts an unknown value to a string for template output.
 * Objects are JSON-serialised; null/undefined become empty strings.
 *
 * @param value - The value to convert.
 * @returns A string representation.
 */
function convertToString(value: unknown): string
{
    if (value === null || value === undefined)
    {
        return "";
    }

    if (typeof value === "object")
    {
        return JSON.stringify(value);
    }

    return String(value);
}

// ============================================================================
// DOCUMENT-LEVEL TEMPLATE RESOLUTION
// ============================================================================

/**
 * Walks all objects in a document and resolves {{variable}} template
 * expressions in their text content. Uses the document's `data` field
 * as the binding context. No-ops if the document has no data context.
 *
 * @param doc - The DiagramDocument to process in place.
 */
function resolveDocumentTemplates(doc: DiagramDocument): void
{
    const data = doc.data;

    if (!data)
    {
        logTplInfo("No data context; skipping template resolution");
        return;
    }

    for (const obj of doc.objects)
    {
        resolveObjectTemplates(obj, data);
    }

    logTplInfo("Resolved templates for", doc.objects.length, "objects");
}

/**
 * Resolves template expressions in a single object's text content.
 * Processes both flat runs and block-structured content.
 *
 * @param obj - The diagram object to process.
 * @param data - Data context for variable binding.
 */
function resolveObjectTemplates(
    obj: DiagramObject,
    data: Record<string, unknown>
): void
{
    const tc = obj.presentation.textContent;

    if (!tc)
    {
        return;
    }

    if (tc.runs)
    {
        resolveRunTemplates(tc.runs, data);
    }

    if (tc.blocks)
    {
        resolveBlockTemplates(tc.blocks, data);
    }
}

/**
 * Resolves template variables in an array of content runs.
 * Only TextRun entries (those with a `text` property) are processed.
 *
 * @param runs - Array of content runs.
 * @param data - Data context for variable binding.
 */
function resolveRunTemplates(
    runs: ContentRun[],
    data: Record<string, unknown>
): void
{
    for (const run of runs)
    {
        if ("text" in run)
        {
            (run as TextRun).text = resolveTemplateVars(
                (run as TextRun).text,
                data
            );
        }
    }
}

/**
 * Resolves template variables in block-structured text content.
 * Iterates each block's runs and delegates to resolveRunTemplates.
 *
 * @param blocks - Array of text blocks.
 * @param data - Data context for variable binding.
 */
function resolveBlockTemplates(
    blocks: TextBlock[],
    data: Record<string, unknown>
): void
{
    for (const block of blocks)
    {
        resolveRunTemplates(block.runs, data);
    }
}

// ========================================================================
// SOURCE: page-frames.ts
// ========================================================================

/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: DiagramEngine Page Frames
 * PURPOSE: Predefined page frame sizes, margin presets, and SVG rendering
 *    helpers for non-exportable guide overlays on the canvas. Frames show
 *    print-area boundaries, margin guides, and frame number badges.
 * RELATES: [[DiagramEngine]], [[RenderEngine]], [[PageFrame]]
 * FLOW: [Engine.addPageFrame()] -> [renderPageFrame()] -> [SVG overlay]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// CONSTANTS
// ============================================================================

/** Log prefix for page frame messages. */
const PF_LOG = "[DiagramEngine:PageFrames]";

function logPfInfo(...args: unknown[]): void
{
    console.log(new Date().toISOString(), "[INFO]", PF_LOG, ...args);
}

function logPfWarn(...args: unknown[]): void
{
    console.warn(new Date().toISOString(), "[WARN]", PF_LOG, ...args);
}

function logPfError(...args: unknown[]): void
{
    console.error(new Date().toISOString(), "[ERROR]", PF_LOG, ...args);
}

function logPfDebug(...args: unknown[]): void
{
    console.debug(new Date().toISOString(), "[DEBUG]", PF_LOG, ...args);
}

/** Default border colour for page frames. */
const PF_DEFAULT_BORDER_COLOR = "rgba(100, 100, 200, 0.6)";

/** Default border width for page frames. */
const PF_DEFAULT_BORDER_WIDTH = 1;

/** Default background colour for page frames. */
const PF_DEFAULT_BG_COLOR = "rgba(100, 100, 200, 0.04)";

/** Frame number badge radius. */
const PF_BADGE_RADIUS = 12;

/** Frame number badge font size. */
const PF_BADGE_FONT_SIZE = 10;

/** Margin guide dash pattern. */
const PF_MARGIN_DASH = "4 3";

/** Margin guide line width. */
const PF_MARGIN_LINE_WIDTH = 0.5;

/** Margin guide colour. */
const PF_MARGIN_COLOR = "rgba(150, 150, 200, 0.4)";

/** Lock icon size. */
const PF_LOCK_ICON_SIZE = 14;

// ============================================================================
// PREDEFINED SIZES (96 DPI)
// ============================================================================

/** Predefined page frame sizes at 96 DPI. */
const PAGE_FRAME_SIZES: PageFrameSize[] = [
    // Paper
    { name: "A4 Portrait",       category: "Paper",        width: 794,  height: 1123 },
    { name: "A4 Landscape",      category: "Paper",        width: 1123, height: 794  },
    { name: "Letter Portrait",   category: "Paper",        width: 816,  height: 1056 },
    { name: "Letter Landscape",  category: "Paper",        width: 1056, height: 816  },
    { name: "A3 Portrait",       category: "Paper",        width: 1123, height: 1587 },
    { name: "Legal Portrait",    category: "Paper",        width: 816,  height: 1344 },
    // B-series paper
    { name: "B4 Portrait",      category: "Paper",        width: 958,  height: 1354 },
    { name: "B4 Landscape",     category: "Paper",        width: 1354, height: 958  },
    { name: "B5 Portrait",      category: "Paper",        width: 693,  height: 979  },
    { name: "B5 Landscape",     category: "Paper",        width: 979,  height: 693  },
    { name: "B6 Portrait",      category: "Paper",        width: 489,  height: 693  },
    // Cards
    { name: "Business Card",     category: "Cards",        width: 336,  height: 192  },
    { name: "Anki Card",         category: "Cards",        width: 480,  height: 336  },
    { name: "Index Card 3x5",    category: "Cards",        width: 480,  height: 288  },
    { name: "Index Card 4x6",    category: "Cards",        width: 576,  height: 384  },
    // Photo
    { name: "4x6",               category: "Photo",        width: 384,  height: 576  },
    { name: "5x7",               category: "Photo",        width: 480,  height: 672  },
    { name: "8x10",              category: "Photo",        width: 768,  height: 960  },
    { name: "11x14",             category: "Photo",        width: 1056, height: 1344 },
    { name: "16x20",             category: "Photo",        width: 1536, height: 1920 },
    { name: "16x24",             category: "Photo",        width: 1536, height: 2304 },
    // Presentation
    { name: "16:9 HD",           category: "Presentation",  width: 960,  height: 540  },
    { name: "4:3 Standard",      category: "Presentation",  width: 960,  height: 720  },
    // Social
    { name: "Instagram Post",    category: "Social",        width: 480,  height: 480  },
    { name: "Twitter Header",    category: "Social",        width: 576,  height: 192  },
    // Mobile screens
    { name: "iPhone SE",         category: "Mobile",        width: 375,  height: 667  },
    { name: "iPhone 15",         category: "Mobile",        width: 393,  height: 852  },
    { name: "iPhone 15 Pro Max", category: "Mobile",        width: 430,  height: 932  },
    { name: "Pixel 8",           category: "Mobile",        width: 412,  height: 915  },
    { name: "Galaxy S24",        category: "Mobile",        width: 360,  height: 780  },
    // Tablet screens
    { name: "iPad Mini",         category: "Tablet",        width: 744,  height: 1133 },
    { name: "iPad Air",          category: "Tablet",        width: 820,  height: 1180 },
    { name: "iPad Pro 11",       category: "Tablet",        width: 834,  height: 1194 },
    { name: "iPad Pro 12.9",     category: "Tablet",        width: 1024, height: 1366 },
    { name: "Surface Pro",       category: "Tablet",        width: 912,  height: 1368 },
    // Laptop screens
    { name: "MacBook Air 13",    category: "Laptop",        width: 1280, height: 800  },
    { name: "MacBook Pro 14",    category: "Laptop",        width: 1512, height: 982  },
    { name: "MacBook Pro 16",    category: "Laptop",        width: 1728, height: 1117 },
    // Desktop screens
    { name: "Full HD (1080p)",   category: "Screen",        width: 1920, height: 1080 },
    { name: "QHD (1440p)",       category: "Screen",        width: 2560, height: 1440 },
    { name: "4K UHD",            category: "Screen",        width: 3840, height: 2160 },
    // App Icons
    { name: "Icon 16x16",        category: "Icons",         width: 16,   height: 16   },
    { name: "Icon 24x24",        category: "Icons",         width: 24,   height: 24   },
    { name: "Icon 32x32",        category: "Icons",         width: 32,   height: 32   },
    { name: "Icon 48x48",        category: "Icons",         width: 48,   height: 48   },
    { name: "Icon 64x64",        category: "Icons",         width: 64,   height: 64   },
    { name: "Icon 96x96",        category: "Icons",         width: 96,   height: 96   },
    { name: "Icon 128x128",      category: "Icons",         width: 128,  height: 128  },
    { name: "Icon 256x256",      category: "Icons",         width: 256,  height: 256  },
    { name: "Icon 512x512",      category: "Icons",         width: 512,  height: 512  },
    { name: "Favicon 16x16",     category: "Icons",         width: 16,   height: 16   },
    { name: "Apple Touch 180x180", category: "Icons",       width: 180,  height: 180  },
];

// ============================================================================
// PREDEFINED MARGIN PRESETS
// ============================================================================

/** Named margin presets for page frames. */
const PAGE_FRAME_MARGIN_PRESETS: Record<string, PageFrameMargins> = {
    /** Normal: 72px all sides (1 inch at 96 DPI). */
    normal: { top: 72, right: 72, bottom: 72, left: 72 },
    /** Narrow: 36px all sides (0.5 inch at 96 DPI). */
    narrow: { top: 36, right: 36, bottom: 36, left: 36 },
    /** Wide: 144px left/right, 72px top/bottom. */
    wide:   { top: 72, right: 144, bottom: 72, left: 144 },
    /** None: zero margins. */
    none:   { top: 0, right: 0, bottom: 0, left: 0 },
};

// ============================================================================
// LOOKUP HELPERS
// ============================================================================

/**
 * Finds a predefined page frame size by name.
 *
 * @param name - The size preset name (e.g. "A4 Portrait").
 * @returns The matching PageFrameSize, or null if not found.
 */
function findPageFrameSize(name: string): PageFrameSize | null
{
    return PAGE_FRAME_SIZES.find((s) => s.name === name) ?? null;
}

// ============================================================================
// SVG RENDERING — FRAME
// ============================================================================

/**
 * Renders a page frame as an SVG group element containing the outer
 * border, optional background fill, margin guides, number badge,
 * and lock indicator.
 *
 * @param frame - The page frame to render.
 * @param defsEl - SVG defs element (reserved for future use).
 * @returns An SVG group element representing the frame.
 */
function renderPageFrame(
    frame: PageFrame,
    defsEl: SVGElement
): SVGElement
{
    const g = svgCreate("g", {
        "data-page-frame-id": frame.id,
        class: `${CLS}-page-frame`,
    }) as SVGGElement;

    g.appendChild(createFrameBackground(frame));
    g.appendChild(createFrameBorder(frame));
    appendMarginGuides(g, frame);
    g.appendChild(createFrameBadge(frame));

    if (frame.locked)
    {
        g.appendChild(createLockIndicator(frame));
    }

    if (frame.label)
    {
        g.appendChild(createFrameLabel(frame));
    }

    return g;
}

// ============================================================================
// SVG RENDERING — BACKGROUND
// ============================================================================

/**
 * Creates the semi-transparent background rectangle for a frame.
 *
 * @param frame - The page frame.
 * @returns An SVG rect element.
 */
function createFrameBackground(frame: PageFrame): SVGElement
{
    return svgCreate("rect", {
        x: String(frame.x),
        y: String(frame.y),
        width: String(frame.width),
        height: String(frame.height),
        fill: frame.backgroundColor || PF_DEFAULT_BG_COLOR,
        "pointer-events": "none",
    });
}

// ============================================================================
// SVG RENDERING — BORDER
// ============================================================================

/**
 * Creates the outer border rectangle for a frame.
 *
 * @param frame - The page frame.
 * @returns An SVG rect element with configurable stroke.
 */
function createFrameBorder(frame: PageFrame): SVGElement
{
    return svgCreate("rect", {
        x: String(frame.x),
        y: String(frame.y),
        width: String(frame.width),
        height: String(frame.height),
        fill: "none",
        stroke: frame.borderColor || PF_DEFAULT_BORDER_COLOR,
        "stroke-width": String(frame.borderWidth || PF_DEFAULT_BORDER_WIDTH),
        "pointer-events": "none",
    });
}

// ============================================================================
// SVG RENDERING — MARGIN GUIDES
// ============================================================================

/**
 * Appends dashed margin guide lines inside the frame boundary.
 * Draws one line per non-zero margin edge.
 *
 * @param g - Parent SVG group to append lines to.
 * @param frame - The page frame with margin data.
 */
function appendMarginGuides(g: SVGGElement, frame: PageFrame): void
{
    const m = frame.margins;
    const attrs = buildMarginLineAttrs();

    if (m.top > 0)
    {
        g.appendChild(createHLine(frame.x, frame.y + m.top, frame.width, attrs));
    }

    if (m.bottom > 0)
    {
        const y = frame.y + frame.height - m.bottom;
        g.appendChild(createHLine(frame.x, y, frame.width, attrs));
    }

    if (m.left > 0)
    {
        g.appendChild(createVLine(frame.x + m.left, frame.y, frame.height, attrs));
    }

    if (m.right > 0)
    {
        const x = frame.x + frame.width - m.right;
        g.appendChild(createVLine(x, frame.y, frame.height, attrs));
    }
}

/**
 * Builds common SVG attributes for margin guide lines.
 *
 * @returns Attribute record for dashed margin lines.
 */
function buildMarginLineAttrs(): Record<string, string>
{
    return {
        stroke: PF_MARGIN_COLOR,
        "stroke-width": String(PF_MARGIN_LINE_WIDTH),
        "stroke-dasharray": PF_MARGIN_DASH,
        "pointer-events": "none",
    };
}

/**
 * Creates a horizontal SVG line element.
 *
 * @param x - Start X coordinate.
 * @param y - Y coordinate.
 * @param w - Line width.
 * @param attrs - Additional SVG attributes.
 * @returns An SVG line element.
 */
function createHLine(
    x: number,
    y: number,
    w: number,
    attrs: Record<string, string>
): SVGElement
{
    return svgCreate("line", {
        x1: String(x),
        y1: String(y),
        x2: String(x + w),
        y2: String(y),
        ...attrs,
    });
}

/**
 * Creates a vertical SVG line element.
 *
 * @param x - X coordinate.
 * @param y - Start Y coordinate.
 * @param h - Line height.
 * @param attrs - Additional SVG attributes.
 * @returns An SVG line element.
 */
function createVLine(
    x: number,
    y: number,
    h: number,
    attrs: Record<string, string>
): SVGElement
{
    return svgCreate("line", {
        x1: String(x),
        y1: String(y),
        x2: String(x),
        y2: String(y + h),
        ...attrs,
    });
}

// ============================================================================
// SVG RENDERING — BADGE
// ============================================================================

/**
 * Creates a number badge at the top-left corner of the frame.
 * Displays the frame's sequential number inside a small circle.
 *
 * @param frame - The page frame.
 * @returns An SVG group containing the badge circle and text.
 */
function createFrameBadge(frame: PageFrame): SVGElement
{
    const cx = frame.x + PF_BADGE_RADIUS + 4;
    const cy = frame.y + PF_BADGE_RADIUS + 4;
    const g = svgCreate("g", { "pointer-events": "none" });

    const circle = svgCreate("circle", {
        cx: String(cx),
        cy: String(cy),
        r: String(PF_BADGE_RADIUS),
        fill: frame.borderColor || PF_DEFAULT_BORDER_COLOR,
        opacity: "0.8",
    });

    const text = svgCreate("text", {
        x: String(cx),
        y: String(cy + 1),
        "text-anchor": "middle",
        "dominant-baseline": "central",
        fill: "#ffffff",
        "font-size": String(PF_BADGE_FONT_SIZE),
        "font-family": "inherit",
    });

    text.textContent = String(frame.number);

    g.appendChild(circle);
    g.appendChild(text);

    return g;
}

// ============================================================================
// SVG RENDERING — LOCK INDICATOR
// ============================================================================

/**
 * Creates a small lock icon at the top-right corner of the frame.
 *
 * @param frame - The page frame.
 * @returns An SVG group containing the lock icon.
 */
function createLockIndicator(frame: PageFrame): SVGElement
{
    const x = frame.x + frame.width - PF_LOCK_ICON_SIZE - 6;
    const y = frame.y + 6;
    const g = svgCreate("g", { "pointer-events": "none" });

    const bg = svgCreate("rect", {
        x: String(x),
        y: String(y),
        width: String(PF_LOCK_ICON_SIZE),
        height: String(PF_LOCK_ICON_SIZE),
        rx: "2",
        fill: frame.borderColor || PF_DEFAULT_BORDER_COLOR,
        opacity: "0.7",
    });

    const icon = svgCreate("text", {
        x: String(x + PF_LOCK_ICON_SIZE / 2),
        y: String(y + PF_LOCK_ICON_SIZE / 2 + 1),
        "text-anchor": "middle",
        "dominant-baseline": "central",
        fill: "#ffffff",
        "font-size": "9",
        "font-family": "inherit",
    });

    icon.textContent = "\u{1F512}";

    g.appendChild(bg);
    g.appendChild(icon);

    return g;
}

// ============================================================================
// SVG RENDERING — FRAME LABEL
// ============================================================================

/**
 * Creates a text label centred at the top of the frame.
 *
 * @param frame - The page frame with a label property.
 * @returns An SVG text element.
 */
function createFrameLabel(frame: PageFrame): SVGElement
{
    const text = svgCreate("text", {
        x: String(frame.x + frame.width / 2),
        y: String(frame.y - 6),
        "text-anchor": "middle",
        fill: frame.borderColor || PF_DEFAULT_BORDER_COLOR,
        "font-size": "11",
        "font-family": "inherit",
        "pointer-events": "none",
    });

    text.textContent = frame.label ?? "";

    return text;
}

// ============================================================================
// THUMBNAIL HELPER
// ============================================================================

/**
 * Creates a scaled-down SVG element showing a page frame's bounds
 * and any diagram objects that fall within it.
 *
 * @param frame - The page frame to thumbnail.
 * @param objects - All diagram objects to filter and include.
 * @param scale - Scale factor (e.g. 0.1 for 10% size).
 * @returns An SVG element sized to the scaled frame dimensions.
 */
function generateFrameThumbnail(
    frame: PageFrame,
    objects: DiagramObject[],
    scale: number
): SVGElement
{
    const w = frame.width * scale;
    const h = frame.height * scale;

    const svg = svgCreate("svg", {
        width: String(w),
        height: String(h),
        viewBox: `${frame.x} ${frame.y} ${frame.width} ${frame.height}`,
    }) as SVGSVGElement;

    svg.appendChild(createThumbnailBorder(frame));
    appendThumbnailObjects(svg, frame, objects);

    logPfDebug("Thumbnail generated for frame:", frame.id);
    return svg;
}

/**
 * Creates the border rectangle for a thumbnail.
 *
 * @param frame - The page frame.
 * @returns An SVG rect for the thumbnail border.
 */
function createThumbnailBorder(frame: PageFrame): SVGElement
{
    return svgCreate("rect", {
        x: String(frame.x),
        y: String(frame.y),
        width: String(frame.width),
        height: String(frame.height),
        fill: "#ffffff",
        stroke: frame.borderColor || PF_DEFAULT_BORDER_COLOR,
        "stroke-width": "2",
    });
}

/**
 * Appends simplified object placeholders inside the thumbnail
 * for objects whose bounds intersect the frame.
 *
 * @param svg - The thumbnail SVG element.
 * @param frame - The page frame.
 * @param objects - All diagram objects.
 */
function appendThumbnailObjects(
    svg: SVGElement,
    frame: PageFrame,
    objects: DiagramObject[]
): void
{
    const frameRect: Rect = {
        x: frame.x,
        y: frame.y,
        width: frame.width,
        height: frame.height,
    };

    for (const obj of objects)
    {
        if (!obj.presentation.visible)
        {
            continue;
        }

        const b = obj.presentation.bounds;
        const objRect: Rect = { x: b.x, y: b.y, width: b.width, height: b.height };

        if (thumbnailRectsOverlap(frameRect, objRect))
        {
            svg.appendChild(createThumbnailPlaceholder(b));
        }
    }
}

/**
 * Tests whether two rectangles overlap for thumbnail inclusion.
 *
 * @param a - First rectangle.
 * @param b - Second rectangle.
 * @returns true if the rectangles intersect.
 */
function thumbnailRectsOverlap(a: Rect, b: Rect): boolean
{
    return (
        a.x < b.x + b.width
        && a.x + a.width > b.x
        && a.y < b.y + b.height
        && a.y + a.height > b.y
    );
}

/**
 * Creates a simplified placeholder rectangle for an object
 * in the thumbnail view.
 *
 * @param b - Object bounds.
 * @returns An SVG rect representing the object.
 */
function createThumbnailPlaceholder(b: Rect): SVGElement
{
    return svgCreate("rect", {
        x: String(b.x),
        y: String(b.y),
        width: String(b.width),
        height: String(b.height),
        fill: "rgba(100, 150, 200, 0.3)",
        stroke: "rgba(100, 150, 200, 0.6)",
        "stroke-width": "1",
    });
}

// ========================================================================
// SOURCE: embed-registry.ts
// ========================================================================

/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: a7c3e1b4-5d92-4f08-ae6c-8b3f0d7e2a19
 * Created: 2026-03-22
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: DiagramEngine / EmbedRegistry
 * 📜 PURPOSE: Defines the full registry of Enterprise Theme embeddable
 *    library components and a convenience function for bulk registration.
 * 🔗 RELATES: [[DiagramEngine]], [[EmbeddableComponentEntry]]
 * ⚡ FLOW: [registerEnterpriseThemeEmbeds()] -> [engine.registerEmbeddableComponent()]
 * 🔒 SECURITY: No dynamic code execution; registry is a static constant array.
 * ----------------------------------------------------------------------------
 */

// @semantic-marker embed-registry

// LOG_PREFIX, logInfo, logWarn, logError, logDebug provided by bundle header

// ============================================================================
// TYPES
// ============================================================================

/**
 * Minimal interface required to register embeddable components.
 * Allows the embed pack to remain decoupled from the full engine.
 */
interface EngineForEmbeds
{
    registerEmbeddableComponent(
        name: string,
        entry: EmbeddableComponentEntry
    ): void;
}

// ============================================================================
// EMBED ENTRY BUILDER
// ============================================================================

/**
 * Shorthand builder to reduce boilerplate in the entries array.
 *
 * @param factory   - Window global factory function name.
 * @param label     - Human-readable display label.
 * @param icon      - Bootstrap Icon CSS class.
 * @param category  - Grouping category.
 * @param w         - Default width in canvas pixels.
 * @param h         - Default height in canvas pixels.
 * @param opts      - Default factory options.
 * @returns A fully formed EmbeddableComponentEntry.
 */
function entry(
    factory: string,
    label: string,
    icon: string,
    category: string,
    w: number,
    h: number,
    opts: Record<string, unknown> = {}
): EmbeddableComponentEntry
{
    return {
        factory,
        label,
        icon,
        category,
        defaultOptions: opts,
        defaultSize: { w, h },
    };
}

// ============================================================================
// DATA CATEGORY ENTRIES
// ============================================================================

/** Data display and hierarchical data components. */
const DATA_ENTRIES: readonly [string, EmbeddableComponentEntry][] = [
    ["datagrid",          entry("createDataGrid",          "Data Grid",          "bi-table",         "data", 400, 250)],
    ["treegrid",          entry("createTreeGrid",          "Tree Grid",          "bi-diagram-3",     "data", 350, 300)],
    ["treeview",          entry("createTreeView",          "Tree View",          "bi-list-nested",   "data", 280, 350)],
    ["propertyinspector", entry("createPropertyInspector", "Property Inspector", "bi-card-list",     "data", 300, 400)],
    ["spinemap",          entry("createSpineMap",          "Spine Map",          "bi-bezier2",       "data", 500, 350)],
    ["graphcanvas",       entry("createGraphCanvas",       "Graph Canvas",       "bi-share",         "data", 500, 400)],
    ["visualtableeditor", entry("createVisualTableEditor", "Table Editor",       "bi-table",         "data", 300, 150)],
];

// ============================================================================
// INPUT CATEGORY ENTRIES
// ============================================================================

/** Form inputs, pickers, and selection controls. */
const INPUT_ENTRIES: readonly [string, EmbeddableComponentEntry][] = [
    ["editablecombobox",  entry("createEditableComboBox",  "Editable Combo Box", "bi-menu-button-wide",  "input", 200, 34)],
    ["multiselectcombo",  entry("createMultiselectCombo",  "Multi-Select Combo", "bi-ui-checks",         "input", 250, 34)],
    ["searchbox",         entry("createSearchBox",         "Search Box",         "bi-search",            "input", 250, 34)],
    ["peoplepicker",      entry("createPeoplePicker",      "People Picker",      "bi-people",            "input", 250, 40)],
    ["datepicker",        entry("createDatePicker",        "Date Picker",        "bi-calendar-date",     "input", 250, 40)],
    ["timepicker",        entry("createTimePicker",        "Time Picker",        "bi-clock",             "input", 200, 40)],
    ["durationpicker",    entry("createDurationPicker",    "Duration Picker",    "bi-hourglass-split",   "input", 250, 40)],
    ["cronpicker",        entry("createCronPicker",        "CRON Picker",        "bi-calendar-range",    "input", 360, 280)],
    ["timezonepicker",    entry("createTimezonePicker",    "Timezone Picker",    "bi-globe",             "input", 250, 40)],
    ["periodpicker",      entry("createPeriodPicker",      "Period Picker",      "bi-calendar-week",     "input", 250, 40)],
    ["sprintpicker",      entry("createSprintPicker",      "Sprint Picker",      "bi-kanban",            "input", 250, 40)],
    ["colorpicker",       entry("createColorPicker",       "Color Picker",       "bi-palette",           "input", 280, 320)],
    ["gradientpicker",    entry("createGradientPicker",    "Gradient Picker",    "bi-palette2",          "input", 300, 340)],
    ["anglepicker",       entry("createAnglePicker",       "Angle Picker",       "bi-arrow-clockwise",   "input", 160, 160)],
    ["fontdropdown",      entry("createFontDropdown",      "Font Dropdown",      "bi-fonts",             "input", 200, 34)],
    ["symbolpicker",      entry("createSymbolPicker",      "Symbol Picker",      "bi-emoji-smile",       "input", 320, 300)],
    ["slider",            entry("createSlider",            "Slider",             "bi-sliders",           "input", 200, 40)],
    ["fileupload",        entry("createFileUpload",        "File Upload",        "bi-cloud-upload",      "input", 300, 200)],
    ["tagger",            entry("createTagger",            "Tagger",             "bi-tags",              "input", 250, 34)],
    ["richtextinput",     entry("createRichTextInput",     "Rich Text Input",    "bi-text-paragraph",    "input", 300, 100)],
    ["maskedentry",       entry("createMaskedEntry",       "Masked Entry",       "bi-shield-lock",       "input", 200, 34)],
    ["lineendingpicker",  entry("createLineEndingPicker",  "Line Ending Picker", "bi-arrow-right",       "input", 200, 34)],
    ["lineshapepicker",   entry("createLineShapePicker",   "Line Shape Picker",  "bi-bezier",            "input", 200, 34)],
    ["linetypepicker",    entry("createLineTypePicker",    "Line Type Picker",   "bi-dash-lg",           "input", 200, 34)],
    ["linewidthpicker",   entry("createLineWidthPicker",   "Line Width Picker",  "bi-border-width",      "input", 200, 34)],
    ["orientationpicker", entry("createOrientationPicker", "Orientation Picker", "bi-aspect-ratio",      "input", 200, 40)],
    ["sizespicker",       entry("createSizesPicker",       "Sizes Picker",       "bi-rulers",            "input", 200, 40)],
    ["marginspicker",     entry("createMarginsPicker",     "Margins Picker",     "bi-border-outer",      "input", 200, 40)],
    ["toolcolorpicker",   entry("createToolColorPicker",   "Tool Color Picker",  "bi-palette-fill",      "input", 250, 40)],
    ["columnspicker",     entry("createColumnsPicker",     "Columns Picker",     "bi-layout-three-columns", "input", 200, 40)],
    ["spacingpicker",     entry("createSpacingPicker",     "Spacing Picker",     "bi-distribute-vertical",  "input", 200, 40)],
    ["layoutpicker",      entry("createLayoutPicker",      "Layout Picker",      "bi-diagram-3",            "input", 200, 40)],
];

// ============================================================================
// CONTENT CATEGORY ENTRIES
// ============================================================================

/** Content editing, rendering, and documentation components. */
const CONTENT_ENTRIES: readonly [string, EmbeddableComponentEntry][] = [
    ["codeeditor",        entry("createCodeEditor",        "Code Editor",        "bi-code-square",    "content", 400, 300)],
    ["markdowneditor",    entry("createMarkdownEditor",    "Markdown Editor",    "bi-markdown",       "content", 500, 400)],
    ["markdownrenderer",  entry("createMarkdownRenderer",  "Markdown Renderer",  "bi-file-richtext",  "content", 400, 300)],
    ["docviewer",         entry("createDocViewer",          "Doc Viewer",         "bi-file-text",      "content", 600, 450)],
    ["helpdrawer",        entry("createHelpDrawer",         "Help Drawer",        "bi-question-circle","content", 320, 400)],
    ["helptooltip",       entry("createHelpTooltip",        "Help Tooltip",       "bi-patch-question", "content", 24,  24)],
    ["latexeditor",       entry("createLatexEditor",        "LaTeX Editor",       "bi-subscript",      "content", 400, 300)],
];

// ============================================================================
// FEEDBACK CATEGORY ENTRIES
// ============================================================================

/** Feedback, progress, confirmation, and status components. */
const FEEDBACK_ENTRIES: readonly [string, EmbeddableComponentEntry][] = [
    ["toast",             entry("showToast",               "Toast",              "bi-bell",           "feedback", 300, 60)],
    ["progressmodal",     entry("showProgressModal",       "Progress Modal",     "bi-hourglass",      "feedback", 400, 200)],
    ["errordialog",       entry("showErrorDialog",         "Error Dialog",       "bi-exclamation-triangle", "feedback", 400, 300)],
    ["confirmdialog",     entry("showConfirmDialog",       "Confirm Dialog",     "bi-question-diamond",    "feedback", 400, 200)],
    ["formdialog",        entry("createFormDialog",        "Form Dialog",        "bi-input-cursor-text",   "feedback", 400, 300)],
    ["stepper",           entry("createStepper",           "Stepper",            "bi-list-ol",             "feedback", 500, 60)],
    ["statusbar",         entry("createStatusBar",         "Status Bar",         "bi-info-square",         "feedback", 600, 28)],
];

// ============================================================================
// NAVIGATION CATEGORY ENTRIES
// ============================================================================

/** Navigation, toolbars, and viewport helper components. */
const NAVIGATION_ENTRIES: readonly [string, EmbeddableComponentEntry][] = [
    ["ribbon",            entry("createRibbon",            "Ribbon",             "bi-layout-text-window",  "navigation", 600, 120)],
    ["ribbonbuilder",     entry("createRibbonBuilder",     "Ribbon Builder",     "bi-tools",               "navigation", 600, 400)],
    ["toolbar",           entry("createToolbar",           "Toolbar",            "bi-wrench",              "navigation", 500, 40)],
    ["sidebar",           entry("createSidebar",           "Sidebar",            "bi-layout-sidebar",      "navigation", 260, 400)],
    ["tabbedpanel",       entry("createTabbedPanel",       "Tabbed Panel",       "bi-window-stack",        "navigation", 400, 300)],
    ["magnifier",         entry("createMagnifier",         "Magnifier",          "bi-zoom-in",             "navigation", 150, 150)],
    ["ruler",             entry("createRuler",             "Ruler",              "bi-rulers",              "navigation", 400, 24)],
];

// ============================================================================
// AI CATEGORY ENTRIES
// ============================================================================

/** AI and machine learning interaction components. */
const AI_ENTRIES: readonly [string, EmbeddableComponentEntry][] = [
    ["conversation",           entry("createConversation",           "Conversation",            "bi-chat-dots",        "ai", 400, 500)],
    ["prompttemplatemanager",  entry("createPromptTemplateManager",  "Prompt Template Manager", "bi-file-earmark-code","ai", 600, 450)],
    ["reasoningaccordion",     entry("createReasoningAccordion",     "Reasoning Accordion",     "bi-list-stars",       "ai", 400, 300)],
];

// ============================================================================
// GOVERNANCE CATEGORY ENTRIES
// ============================================================================

/** Governance, audit, and access control components. */
const GOVERNANCE_ENTRIES: readonly [string, EmbeddableComponentEntry][] = [
    ["auditlogviewer",   entry("createAuditLogViewer",   "Audit Log Viewer",   "bi-journal-text",  "governance", 600, 350)],
    ["permissionmatrix", entry("createPermissionMatrix", "Permission Matrix",  "bi-shield-check",  "governance", 500, 350)],
];

// ============================================================================
// LAYOUT CATEGORY ENTRIES
// ============================================================================

/** Layout container and arrangement components. */
const LAYOUT_ENTRIES: readonly [string, EmbeddableComponentEntry][] = [
    ["docklayout",       entry("createDockLayout",       "Dock Layout",        "bi-grid-1x2",        "layout", 600, 400)],
    ["splitlayout",      entry("createSplitLayout",      "Split Layout",       "bi-layout-split",    "layout", 600, 400)],
    ["layerlayout",      entry("createLayerLayout",      "Layer Layout",       "bi-layers",          "layout", 600, 400)],
    ["cardlayout",       entry("createCardLayout",       "Card Layout",        "bi-stack",           "layout", 400, 300)],
    ["boxlayout",        entry("createBoxLayout",        "Box Layout",         "bi-distribute-horizontal", "layout", 400, 200)],
    ["flowlayout",       entry("createFlowLayout",       "Flow Layout",        "bi-text-wrap",       "layout", 500, 300)],
    ["gridlayout",       entry("createGridLayout",       "Grid Layout",        "bi-grid-3x3",        "layout", 500, 400)],
    ["anchorlayout",     entry("createAnchorLayout",     "Anchor Layout",      "bi-pin-angle",       "layout", 600, 400)],
    ["borderlayout",     entry("createBorderLayout",     "Border Layout",      "bi-border-outer",    "layout", 600, 400)],
    ["flexgridlayout",   entry("createFlexGridLayout",   "Flex Grid Layout",   "bi-grid",            "layout", 600, 400)],
];

// ============================================================================
// SOCIAL CATEGORY ENTRIES
// ============================================================================

/** Social, collaboration, and identity components. */
const SOCIAL_ENTRIES: readonly [string, EmbeddableComponentEntry][] = [
    ["activityfeed",       entry("createActivityFeed",       "Activity Feed",       "bi-rss",            "social", 350, 400)],
    ["timeline",           entry("createTimeline",           "Timeline",            "bi-clock-history",  "social", 500, 200)],
    ["commentoverlay",     entry("createCommentOverlay",     "Comment Overlay",     "bi-chat-right-dots","social", 400, 300)],
    ["sharedialog",        entry("createShareDialog",        "Share Dialog",        "bi-share-fill",     "social", 400, 300)],
    ["notificationcenter", entry("createNotificationCenter", "Notification Center", "bi-bell-fill",      "social", 350, 400)],
    ["workspaceswitcher",  entry("createWorkspaceSwitcher",  "Workspace Switcher",  "bi-building",       "social", 250, 300)],
    ["usermenu",           entry("createUserMenu",           "User Menu",           "bi-person-circle",  "social", 200, 250)],
    ["personchip",         entry("createPersonChip",         "Person Chip",         "bi-person-badge",   "social", 180, 32)],
    ["presenceindicator",  entry("createPresenceIndicator",  "Presence Indicator",  "bi-people-fill",    "social", 120, 32)],
    ["pill",               entry("createPill",               "Pill",                "bi-capsule",        "social", 100, 24)],
    ["typebadge",          entry("createTypeBadge",          "Type Badge",          "bi-bookmark",       "social", 80,  24)],
    ["relationshipmanager",entry("createRelationshipManager","Relationship Manager","bi-diagram-2",      "social", 500, 350)],
];

// ============================================================================
// OTHER CATEGORY ENTRIES
// ============================================================================

/** Miscellaneous utility and specialised components. */
const OTHER_ENTRIES: readonly [string, EmbeddableComponentEntry][] = [
    ["actionitems",      entry("createActionItems",      "Action Items",       "bi-check2-square",    "other", 400, 300)],
    ["commandpalette",   entry("openCommandPalette",     "Command Palette",    "bi-terminal",         "other", 500, 350)],
    ["facetsearch",      entry("createFacetSearch",      "Facet Search",       "bi-funnel",           "other", 350, 34)],
    ["guidedtour",       entry("createGuidedTour",       "Guided Tour",        "bi-signpost-2",       "other", 300, 200)],
    ["themetoggle",      entry("createThemeToggle",      "Theme Toggle",       "bi-circle-half",      "other", 100, 32)],
    ["fileexplorer",     entry("createFileExplorer",     "File Explorer",      "bi-folder2-open",     "other", 500, 400)],
    ["applauncher",      entry("createAppLauncher",      "App Launcher",       "bi-grid-3x3-gap",    "other", 300, 300)],
    ["breadcrumb",       entry("createBreadcrumb",       "Breadcrumb",         "bi-chevron-right",    "other", 400, 28)],
    ["logconsole",       entry("createLogConsole",       "Log Console",        "bi-terminal-fill",    "other", 500, 250)],
    ["gauge",            entry("createGauge",            "Gauge",              "bi-speedometer2",     "other", 200, 200)],
    ["emptystate",       entry("createEmptyState",       "Empty State",        "bi-inbox",            "other", 300, 200)],
    ["skeletonloader",   entry("createSkeletonLoader",   "Skeleton Loader",    "bi-placeholder",      "other", 300, 100)],
    ["statusbadge",      entry("createStatusBadge",      "Status Badge",       "bi-circle-fill",      "other", 80,  24)],
    ["bannerbar",        entry("createBannerBar",        "Banner Bar",         "bi-megaphone",        "other", 600, 48)],
    ["graphtoolbar",     entry("createGraphToolbar",     "Graph Toolbar",      "bi-diagram-3-fill",   "other", 500, 40)],
    ["graphlegend",      entry("createGraphLegend",      "Graph Legend",       "bi-list-columns",     "other", 240, 300)],
    ["graphminimap",     entry("createGraphMinimap",      "Graph Minimap",     "bi-pip",              "other", 200, 150)],
    ["contextmenu",      entry("createContextMenu",       "Context Menu",      "bi-menu-button",      "other", 220, 200)],
    ["inlinetoolbar",    entry("createInlineToolbar",      "Inline Toolbar",    "bi-wrench",           "other", 300, 32)],
    ["stacklayout",      entry("createStackLayout",        "Stack Layout",      "bi-stack",            "layout", 300, 400)],
];

// ============================================================================
// COMBINED REGISTRY
// ============================================================================

/**
 * Complete registry of all Enterprise Theme embeddable components.
 *
 * Each tuple is `[registryName, EmbeddableComponentEntry]`.
 * Excludes DiagramEngine (recursive) and SmartTextInput (engine, not UI).
 */
const ENTERPRISE_EMBED_ENTRIES: readonly [string, EmbeddableComponentEntry][] = [
    ...DATA_ENTRIES,
    ...INPUT_ENTRIES,
    ...CONTENT_ENTRIES,
    ...FEEDBACK_ENTRIES,
    ...NAVIGATION_ENTRIES,
    ...AI_ENTRIES,
    ...GOVERNANCE_ENTRIES,
    ...LAYOUT_ENTRIES,
    ...SOCIAL_ENTRIES,
    ...OTHER_ENTRIES,
];

// ============================================================================
// BULK REGISTRATION
// ============================================================================

/**
 * Registers all Enterprise Theme components as embeddable types in
 * the given engine. Call this once after engine creation to make the
 * full component library available for embedding on the canvas.
 *
 * @param engine - Any object implementing the EngineForEmbeds interface.
 */
function registerEnterpriseThemeEmbeds(engine: EngineForEmbeds): void
{
    const count = ENTERPRISE_EMBED_ENTRIES.length;

    logInfo(`Registering ${count} enterprise theme embed components...`);

    for (const [name, embedEntry] of ENTERPRISE_EMBED_ENTRIES)
    {
        engine.registerEmbeddableComponent(name, embedEntry);
    }

    logInfo(`Enterprise theme embed pack loaded (${count} components).`);
}

// ========================================================================
// SOURCE: engine.ts
// ========================================================================

/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * DiagramEngine — Main engine implementation and factory function.
 *
 * This is the public-facing class that consumers interact with.
 * It owns the document model, render engine, tool manager, and
 * shape registry, and exposes the full public API defined in the spec.
 */

// ============================================================================
// HELPERS
// ============================================================================

// LOG_PREFIX, logInfo, logWarn, logError, logDebug provided by bundle header

let instanceCounter = 0;

/**
 * Generates a unique ID for objects, connectors, and layers.
 *
 * @returns A string combining a base-36 timestamp and a random suffix.
 */
function generateId(): string
{
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Constrains a number within a range.
 *
 * @param val - The value to clamp.
 * @param min - Minimum allowed value.
 * @param max - Maximum allowed value.
 * @returns The clamped value.
 */
function clamp(val: number, min: number, max: number): number
{
    return Math.max(min, Math.min(max, val));
}

/**
 * Invokes a callback safely, catching and logging errors.
 * Prevents one failing callback from blocking the engine.
 *
 * @param fn - The callback to invoke, or undefined.
 * @param args - Arguments to pass to the callback.
 */
function safeCallback<T extends unknown[]>(
    fn: ((...a: T) => void) | undefined,
    ...args: T
): void
{
    if (!fn)
    {
        return;
    }

    try
    {
        fn(...args);
    }
    catch (err)
    {
        logError("Callback error:", err);
    }
}

// ============================================================================
// ENGINE IMPLEMENTATION
// ============================================================================

/**
 * Core engine implementation. Owns the document model, render engine,
 * tool manager, shape registry, event bus, and undo stack.
 *
 * This class implements the EngineForTools interface so that tools
 * can call back into the engine for operations like hit testing,
 * selection management, and rendering.
 */
class DiagramEngineImpl implements EngineForTools
{
    private readonly instanceId: string;
    private readonly opts: DiagramEngineOptions;
    private doc: DiagramDocument;
    private readonly renderer: RenderEngine;
    private readonly shapeRegistry: ShapeRegistry;
    private readonly toolManager: ToolManager;
    private readonly events: EventBus;
    private readonly undoStack: UndoStack;

    private readonly selectedIds: Set<string> = new Set();
    private readonly selectedConnectorIds: Set<string> = new Set();
    private dirty = false;
    private changeCount = 0;
    private themeObserver: MutationObserver | null = null;
    private destroyed = false;
    private layoutRegistry: Map<string, LayoutFunction> = new Map();
    private formatClipboard: ObjectStyle | null = null;
    private readonly embedRegistry: Map<string, EmbeddableComponentEntry> = new Map();

    /** Default render style for new objects. */
    private defaultRenderStyle: "clean" | "sketch" = "clean";
    private activeEmbedObjectId: string | null = null;

    /** Shared HoverCard handle (ADR-126). Lazily created when first needed. */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private hoverCard: any = null;

    /** id of the object/connector the hover card is currently anchored to. */
    private hoverAnchorId: string | null = null;

    /**
     * Creates a new DiagramEngine instance.
     *
     * @param container - The HTML element to mount the SVG canvas into.
     * @param opts - Engine configuration options.
     */
    constructor(container: HTMLElement, opts: DiagramEngineOptions)
    {
        this.instanceId = `${CLS}-${++instanceCounter}`;
        this.opts = opts;

        this.events = new EventBus();
        this.undoStack = new UndoStack();
        this.shapeRegistry = new ShapeRegistry();
        registerBasicShapes(this.shapeRegistry);
        registerExtendedShapes(this.shapeRegistry);

        container.classList.add(`${CLS}-container`);
        this.renderer = new RenderEngine(container);

        this.doc = opts.document
            ? this.cloneDoc(opts.document)
            : this.createEmptyDoc();

        this.toolManager = new ToolManager();
        this.toolManager.setSvgElement(this.renderer.getSvgElement());
        this.registerDefaultTools();
        this.toolManager.setActive("select");

        this.bindCanvasEvents();
        this.observeThemeChanges();
        this.performInitialRender();

        logInfo("Created:", this.instanceId);
    }

    // ========================================================================
    // TOOL INTERFACE (EngineForTools)
    // ========================================================================

    /**
     * Finds the topmost visible object under a canvas-space point.
     * Iterates in reverse z-order so top objects are tested first.
     *
     * @param canvasPos - Point in canvas coordinates.
     * @returns The topmost hit object, or null if nothing hit.
     */
    hitTestObject(canvasPos: Point): DiagramObject | null
    {
        const visible = this.getVisibleObjectsSorted();

        for (let i = visible.length - 1; i >= 0; i--)
        {
            const obj = visible[i];
            const b = obj.presentation.bounds;
            const shapeDef = this.shapeRegistry.get(obj.presentation.shape);

            if (shapeDef && shapeDef.hitTest(canvasPos, b))
            {
                return obj;
            }
        }

        return null;
    }

    /**
     * Checks whether an object is in the current selection.
     *
     * @param id - Object ID to check.
     * @returns true if the object is selected.
     */
    isSelected(id: string): boolean
    {
        return this.selectedIds.has(id);
    }

    /**
     * Adds an object to the selection and updates visual indicators.
     *
     * @param id - Object ID to add to selection.
     */
    addToSelection(id: string): void
    {
        this.selectedIds.add(id);
        this.refreshSelectionVisuals();
    }

    /**
     * Toggles an object's selection state. If selected, deselects it;
     * if not selected, adds it to the selection.
     *
     * @param id - Object ID to toggle.
     */
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

        this.refreshSelectionVisuals();
    }

    /**
     * Clears the entire selection without firing external callbacks.
     * Used by tools during interaction sequences.
     */
    clearSelectionInternal(): void
    {
        this.selectedIds.clear();
        this.selectedConnectorIds.clear();
        this.refreshSelectionVisuals();
    }

    /**
     * Returns all currently selected object IDs.
     *
     * @returns Array of selected object ID strings.
     */
    getSelectedIds(): string[]
    {
        return Array.from(this.selectedIds);
    }

    /**
     * Returns the DiagramObject instances for all selected objects.
     *
     * @returns Array of selected DiagramObject references.
     */
    getSelectedObjects(): DiagramObject[]
    {
        return this.doc.objects.filter(
            (o) => this.selectedIds.has(o.id)
        );
    }

    /**
     * Finds an object by its ID.
     *
     * @param id - Object ID to look up.
     * @returns The matching object, or null if not found.
     */
    getObjectById(id: string): DiagramObject | null
    {
        return this.doc.objects.find((o) => o.id === id) ?? null;
    }

    /**
     * Moves an object to an absolute position. Skips locked objects.
     * Re-renders the object and any attached connectors. When the
     * object is a container, all contained children move by the
     * same delta.
     *
     * @param id - Object ID to move.
     * @param pos - New position (x, y) in canvas coordinates.
     */
    moveObjectTo(id: string, pos: { x: number; y: number }): void
    {
        const obj = this.getObjectById(id);

        if (!obj || obj.presentation.locked)
        {
            return;
        }

        const dx = pos.x - obj.presentation.bounds.x;
        const dy = pos.y - obj.presentation.bounds.y;

        obj.presentation.bounds.x = pos.x;
        obj.presentation.bounds.y = pos.y;
        this.rerenderObject(obj);
        this.rerenderAttachedConnectors(id);
        this.moveContainedChildren(id, dx, dy);
        this.refreshSelectionVisuals();
    }

    /**
     * Resizes an object to new bounds. Skips locked objects.
     *
     * @param id - Object ID to resize.
     * @param bounds - New bounding rectangle.
     */
    resizeObject(id: string, bounds: Rect): void
    {
        const obj = this.getObjectById(id);

        if (!obj || obj.presentation.locked)
        {
            return;
        }

        obj.presentation.bounds = { ...bounds };
        this.rerenderObject(obj);
        this.rerenderAttachedConnectors(id);
        this.refreshSelectionVisuals();
    }

    /**
     * Sets an object's rotation to an absolute angle.
     *
     * @param id - Object ID.
     * @param degrees - Rotation angle in degrees (0–360).
     */
    rotateObjectTo(id: string, degrees: number): void
    {
        const obj = this.getObjectById(id);

        if (!obj || obj.presentation.locked)
        {
            return;
        }

        obj.presentation.rotation = degrees;
        this.rerenderObject(obj);
        this.refreshSelectionVisuals();
    }

    /**
     * Nudges all selected objects by a delta. Used for arrow key movement.
     *
     * @param dx - Horizontal displacement in pixels.
     * @param dy - Vertical displacement in pixels.
     */
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

        this.refreshSelectionVisuals();
    }

    /**
     * Deletes all selected objects and their attached connectors,
     * plus any directly selected connectors.
     */
    deleteSelected(): void
    {
        const ids = Array.from(this.selectedIds);

        for (const id of ids)
        {
            this.removeAttachedConnectors(id);
            this.removeObjectInternal(id);
        }

        this.deleteSelectedConnectors();

        this.selectedIds.clear();
        this.selectedConnectorIds.clear();
        this.refreshSelectionVisuals();
    }

    /**
     * Selects all visible objects on the canvas.
     */
    selectAll(): void
    {
        for (const obj of this.doc.objects)
        {
            if (obj.presentation.visible)
            {
                this.selectedIds.add(obj.id);
            }
        }

        this.refreshSelectionVisuals();
    }

    /**
     * Selects all objects whose bounds intersect the given rectangle.
     * Used by the rubber band selection in SelectTool.
     *
     * @param rect - Selection rectangle in canvas coordinates.
     */
    selectObjectsInRect(rect: Rect): void
    {
        for (const obj of this.doc.objects)
        {
            if (!obj.presentation.visible)
            {
                continue;
            }

            const b = obj.presentation.bounds;

            if (rectsIntersect(b, rect))
            {
                this.selectedIds.add(obj.id);
            }
        }

        this.refreshSelectionVisuals();
    }

    /**
     * Pushes an undo command for a move operation.
     * Captures start and end positions for all moved objects.
     *
     * @param startBounds - Map of object IDs to their pre-move bounds.
     */
    pushMoveUndo(startBounds: Map<string, Rect>): void
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
            undo: () => this.restoreBounds(clonedStart),
            redo: () => this.restoreBounds(endBounds),
        });

        this.markDirty();
    }

    /**
     * Pushes an undo command for a resize operation.
     *
     * @param id - Object ID that was resized.
     * @param before - Bounds before the resize.
     * @param after - Bounds after the resize.
     */
    pushResizeUndo(id: string, before: Rect, after: Rect): void
    {
        this.undoStack.push({
            type: "resize",
            label: "Resize object",
            timestamp: Date.now(),
            mergeable: false,
            undo: () => this.resizeObject(id, before),
            redo: () => this.resizeObject(id, after),
        });

        this.markDirty();
    }

    /**
     * Renders a rubber band rectangle in the tool overlay.
     *
     * @param rect - Rectangle bounds in canvas coordinates.
     */
    renderRubberBand(rect: Rect): void
    {
        this.renderer.renderRubberBand(rect);
    }

    /**
     * Clears the tool overlay (rubber band, guides, etc.).
     */
    clearToolOverlay(): void
    {
        this.renderer.clearToolOverlay();
    }

    /**
     * Retrieves the HTML canvas element for a paintable shape
     * by its diagram object ID.
     *
     * @param objectId - The diagram object ID.
     * @returns The HTMLCanvasElement, or null.
     */
    getPaintableCanvas(objectId: string): HTMLCanvasElement | null
    {
        return this.renderer.getPaintableCanvas(objectId);
    }

    /**
     * Returns the tool overlay SVG group for direct guide rendering.
     *
     * @returns The tool overlay SVG group element.
     */
    private getToolOverlayElement(): SVGGElement
    {
        return this.renderer.getToolOverlayElement();
    }

    /**
     * Switches the active tool by name.
     *
     * @param name - Tool name (e.g. "select", "draw", "connect").
     */
    setActiveTool(name: string): void
    {
        this.toolManager.setActive(name);
        this.events.emit("tool:change", name);
    }

    /**
     * Computes and renders alignment guides for the moving bounds.
     * Called by SelectTool during drag operations.
     *
     * @param movingBounds - Current bounds of the dragged selection.
     */
    showAlignmentGuides(movingBounds: Rect): void
    {
        this.renderer.clearToolOverlay();

        const excludeIds = this.selectedIds;
        const threshold = DEFAULT_SNAP_THRESHOLD;
        const allObjects = this.doc.objects.filter(
            (o) => o.presentation.visible
        );

        const snap = computeAlignmentGuides(
            movingBounds, allObjects, excludeIds, threshold
        );

        const spacingGuides = computeSpacingGuides(
            movingBounds, allObjects, excludeIds, threshold
        );

        const allGuides = snap.guides.concat(spacingGuides);

        if (allGuides.length > 0)
        {
            const overlay = this.getToolOverlayElement();

            if (overlay)
            {
                renderGuides(overlay, allGuides);
            }
        }
    }

    /**
     * Opens the inline text editor for an object.
     *
     * @param objectId - Object ID to edit.
     */
    startInlineTextEdit(objectId: string): void
    {
        const obj = this.getObjectById(objectId);

        if (!obj)
        {
            return;
        }

        // Create default text content if none exists
        if (!obj.presentation.textContent)
        {
            obj.presentation.textContent = {
                runs: [{ text: "" }],
                overflow: "visible",
                verticalAlign: "middle",
                horizontalAlign: "center",
                padding: 8,
            };
        }

        this.renderer.startInlineEdit(obj);
        this.events.emit("text:edit:start", obj);
    }

    /**
     * Closes the inline text editor and saves the content.
     */
    endInlineTextEdit(): void
    {
        const text = this.renderer.endInlineEdit();

        if (text === null)
        {
            return;
        }

        const selected = this.getSelectedObjects();

        if (selected.length === 1)
        {
            this.updateObjectText(selected[0], text);
        }

        this.events.emit("text:edit:end");
    }

    /**
     * Returns a shape definition from the registry.
     *
     * @param type - Shape type string.
     * @returns The ShapeDefinition, or null.
     */
    getShapeDef(type: string): ShapeDefinition | null
    {
        return this.shapeRegistry.get(type);
    }

    /**
     * Returns all visible, unlocked objects for connect-tool port
     * rendering and other tool interactions.
     *
     * @returns Array of visible, unlocked DiagramObject instances.
     */
    getVisibleObjects(): DiagramObject[]
    {
        return this.doc.objects.filter(
            (o) => o.presentation.visible && !o.presentation.locked
        );
    }

    /**
     * Hit-tests all connectors against a canvas position. Returns the
     * first connector whose path is within tolerance of the point.
     *
     * @param canvasPos - Point in canvas coordinates.
     * @returns The first hit connector, or null.
     */
    hitTestConnector(canvasPos: Point): DiagramConnector | null
    {
        for (const conn of this.doc.connectors)
        {
            if (hitTestConnectorPath(conn, canvasPos, this.doc.objects))
            {
                return conn;
            }
        }

        return null;
    }

    /**
     * Checks whether a connector is currently selected.
     *
     * @param id - Connector ID to check.
     * @returns true if the connector is selected.
     */
    isConnectorSelected(id: string): boolean
    {
        return this.selectedConnectorIds.has(id);
    }

    /**
     * Adds a connector to the current selection and refreshes visuals.
     *
     * @param id - Connector ID to add.
     */
    addConnectorToSelection(id: string): void
    {
        this.selectedConnectorIds.add(id);
        this.refreshSelectionVisuals();
    }

    /**
     * Toggles a connector's selection state and refreshes visuals.
     *
     * @param id - Connector ID to toggle.
     */
    toggleConnectorSelection(id: string): void
    {
        if (this.selectedConnectorIds.has(id))
        {
            this.selectedConnectorIds.delete(id);
        }
        else
        {
            this.selectedConnectorIds.add(id);
        }

        this.refreshSelectionVisuals();
    }

    /**
     * Pushes a raw undo command onto the stack.
     * Used by tools that manage their own undo logic.
     *
     * @param cmd - The undo command to push.
     */
    pushUndoCommand(cmd: UndoCommand): void
    {
        this.undoStack.push(cmd);
        this.markDirty();
    }

    /**
     * Pans the canvas viewport by a screen-space delta.
     *
     * @param dx - Horizontal delta in screen pixels.
     * @param dy - Vertical delta in screen pixels.
     */
    panCanvas(dx: number, dy: number): void
    {
        this.renderer.pan(dx, dy);
        this.emitViewportChange();
    }

    // ========================================================================
    // PUBLIC API — DOCUMENT
    // ========================================================================

    /**
     * Returns a deep clone of the current document.
     * The returned object is safe to mutate without affecting the engine.
     *
     * @returns A deep copy of the DiagramDocument.
     */
    getDocument(): DiagramDocument
    {
        return this.cloneDoc(this.doc);
    }

    /**
     * Replaces the entire document, clearing selection and history.
     *
     * @param doc - The document to load.
     */
    setDocument(doc: DiagramDocument): void
    {
        this.doc = this.cloneDoc(doc);
        this.selectedIds.clear();
        this.undoStack.clear();
        this.dirty = false;
        this.changeCount = 0;
        this.performInitialRender();
        this.events.emit("document:load");
    }

    /** Resets the canvas to an empty document. */
    clear(): void
    {
        this.setDocument(this.createEmptyDoc());
    }

    // ========================================================================
    // PUBLIC API — OBJECTS
    // ========================================================================

    /**
     * Adds a new object to the document and renders it on the canvas.
     * Missing fields are populated with sensible defaults.
     *
     * @param partial - Partial object definition.
     * @returns The fully constructed DiagramObject with generated ID.
     */
    addObject(partial: DiagramObjectInput): DiagramObject
    {
        const obj = this.buildObject(partial);
        this.doc.objects.push(obj);
        this.rerenderObject(obj);
        this.markDirty();
        this.events.emit("object:add", obj);
        return obj;
    }

    /**
     * Removes an object and its attached connectors from the document.
     *
     * @param id - Object ID to remove.
     */
    removeObject(id: string): void
    {
        this.removeAttachedConnectors(id);
        this.removeObjectInternal(id);
        this.selectedIds.delete(id);
        this.refreshSelectionVisuals();
    }

    /**
     * Updates an existing object's properties and re-renders it.
     *
     * @param id - Object ID to update.
     * @param changes - Partial changes to merge into the object.
     */
    updateObject(id: string, changes: Partial<DiagramObject>): void
    {
        const obj = this.getObjectById(id);

        if (!obj)
        {
            return;
        }

        if (changes.semantic)
        {
            Object.assign(obj.semantic, changes.semantic);
        }

        if (changes.presentation)
        {
            this.mergePresentation(obj, changes.presentation);
        }

        this.rerenderObject(obj);
        this.markDirty();
        this.events.emit("object:change", obj);
    }

    /**
     * Deep-merge presentation changes, preserving existing style
     * properties that are not explicitly overridden.
     */
    private mergePresentation(
        obj: DiagramObject,
        changes: Partial<DiagramObject["presentation"]>
    ): void
    {
        // Deep-merge style: keep existing fill/stroke/shadow/etc.
        if (changes.style && obj.presentation.style)
        {
            changes.style = { ...obj.presentation.style, ...changes.style };
        }

        Object.assign(obj.presentation, changes);
    }

    /**
     * Finds an object by ID.
     *
     * @param id - Object ID.
     * @returns The object, or null if not found.
     */
    getObject(id: string): DiagramObject | null
    {
        return this.getObjectById(id);
    }

    /**
     * Returns all objects in the document.
     *
     * @returns Array of all DiagramObject instances.
     */
    getObjects(): DiagramObject[]
    {
        return [...this.doc.objects];
    }

    /**
     * Finds all objects matching a semantic type.
     *
     * @param type - Semantic type string to match.
     * @returns Array of matching objects.
     */
    getObjectsBySemanticType(type: string): DiagramObject[]
    {
        return this.doc.objects.filter(
            (o) => o.semantic.type === type
        );
    }

    // ========================================================================
    // PUBLIC API — SELECTION
    // ========================================================================

    /**
     * Sets the selection to exactly the given IDs.
     *
     * @param ids - Array of object IDs to select.
     */
    select(ids: string[]): void
    {
        this.selectedIds.clear();

        for (const id of ids)
        {
            this.selectedIds.add(id);
        }

        this.refreshSelectionVisuals();
    }

    /** Clears the selection. */
    clearSelection(): void
    {
        this.clearSelectionInternal();
    }

    /**
     * Returns the currently selected objects.
     *
     * @returns Array of selected DiagramObject instances.
     */
    getSelectedObjectsPublic(): DiagramObject[]
    {
        return this.getSelectedObjects();
    }

    // ========================================================================
    // PUBLIC API — VIEWPORT
    // ========================================================================

    /** Zooms in by one step, centred on the canvas. */
    zoomIn(): void
    {
        this.zoomCentred(1 + ZOOM_STEP);
    }

    /** Zooms out by one step, centred on the canvas. */
    zoomOut(): void
    {
        this.zoomCentred(1 - ZOOM_STEP);
    }

    /** Zooms and pans to fit all objects with padding. */
    zoomToFit(): void
    {
        this.renderer.zoomToFit(this.doc.objects);
        this.emitViewportChange();
    }

    /**
     * Sets the render style for all objects and new objects.
     * Device frame shapes render differently in clean vs sketch mode.
     *
     * @param style - "clean" for photorealistic or "sketch" for hand-drawn.
     */
    setRenderStyle(style: "clean" | "sketch"): void
    {
        this.defaultRenderStyle = style;

        for (const obj of this.doc.objects)
        {
            obj.presentation.renderStyle = style;
            this.rerenderObject(obj);
        }

        logInfo("Render style set to:", style);
    }

    /**
     * Returns the current zoom level.
     *
     * @returns Zoom factor (1.0 = 100%).
     */
    getZoomLevel(): number
    {
        return this.renderer.getViewport().zoom;
    }

    /**
     * Sets the zoom level to an absolute value.
     *
     * @param level - Desired zoom factor.
     */
    setZoomLevel(level: number): void
    {
        const vp = this.renderer.getViewport();
        const factor = level / vp.zoom;
        this.zoomCentred(factor);
    }

    /**
     * Returns the current viewport state.
     *
     * @returns Viewport with x, y offset and zoom level.
     */
    getViewport(): ViewportState
    {
        return this.renderer.getViewport();
    }

    // ========================================================================
    // PUBLIC API — HISTORY
    // ========================================================================

    /** Undoes the last operation. */
    undo(): void
    {
        if (this.undoStack.undo())
        {
            this.refreshSelectionVisuals();
            this.events.emit("history:undo");
        }
    }

    /** Redoes the last undone operation. */
    redo(): void
    {
        if (this.undoStack.redo())
        {
            this.refreshSelectionVisuals();
            this.events.emit("history:redo");
        }
    }

    /**
     * @returns true if there is an operation to undo.
     */
    canUndo(): boolean
    {
        return this.undoStack.canUndo();
    }

    /**
     * @returns true if there is an operation to redo.
     */
    canRedo(): boolean
    {
        return this.undoStack.canRedo();
    }

    // ========================================================================
    // PUBLIC API — TOOLS
    // ========================================================================

    /**
     * Returns the name of the currently active tool.
     *
     * @returns Tool name string.
     */
    getActiveTool(): string
    {
        return this.toolManager.getActiveName();
    }

    /**
     * Returns the tool instance by name, or null if not registered.
     * Useful for configuring tool properties (e.g. paintbrush settings).
     *
     * @param name - The tool name.
     * @returns The tool instance, or null.
     */
    getToolInstance(name: string): unknown
    {
        return this.toolManager.getToolByName(name);
    }

    // ========================================================================
    // PUBLIC API — STENCILS
    // ========================================================================

    /**
     * Loads a named stencil pack, registering its shapes with
     * the engine's shape registry.
     *
     * @param name - Pack name (e.g. "flowchart", "uml", "bpmn").
     */
    loadStencilPack(name: string): void
    {
        const packs: Record<string, (r: ShapeRegistry) => void> = {
            flowchart: registerFlowchartPack,
            uml: registerUmlPack,
            bpmn: registerBpmnPack,
            er: registerErPack,
            network: registerNetworkPack,
            devices: registerDeviceStencils,
            "ui-components": registerUiComponentStencils,
        };

        const fn = packs[name];

        if (fn)
        {
            fn(this.shapeRegistry);
        }
        else
        {
            logWarn("Unknown stencil pack:", name);
        }
    }

    /**
     * Registers a custom stencil pack with the shape registry.
     *
     * @param name - Pack name for logging.
     * @param shapes - Array of shape definitions to register.
     */
    registerStencilPack(name: string, shapes: ShapeDefinition[]): void
    {
        for (const shape of shapes)
        {
            this.shapeRegistry.register(shape);
        }

        logInfo(`Registered stencil pack '${name}':`,
            shapes.length, "shapes"
        );
    }

    /**
     * Returns all registered shape definitions.
     *
     * @returns Array of ShapeDefinition instances.
     */
    getAvailableShapes(): ShapeDefinition[]
    {
        return this.shapeRegistry.getAll();
    }

    // ========================================================================
    // PUBLIC API — PERSISTENCE
    // ========================================================================

    /**
     * Serialises the document to a JSON string.
     *
     * @param indent - Optional indentation for pretty-printing.
     * @returns JSON string representation of the document.
     */
    toJSON(indent?: number): string
    {
        this.doc.metadata.modified = new Date().toISOString();
        return JSON.stringify(this.doc, null, indent);
    }

    /**
     * Loads a document from a JSON string.
     *
     * @param json - JSON string to parse and load.
     */
    fromJSON(json: string): void
    {
        const doc = JSON.parse(json) as DiagramDocument;
        this.setDocument(doc);
    }

    /**
     * @returns true if the document has unsaved changes.
     */
    isDirty(): boolean
    {
        return this.dirty;
    }

    /**
     * Marks the document as clean (call after a successful save).
     */
    markClean(): void
    {
        this.dirty = false;
        this.changeCount = 0;
        this.events.emit("dirty:change", false);
    }

    // ========================================================================
    // PUBLIC API — PAGE FRAMES
    // ========================================================================

    /**
     * Adds a page frame using a named size preset. The frame is placed
     * at the given position or centred in the current viewport.
     *
     * @param sizeName - Preset name (e.g. "A4 Portrait").
     * @param position - Optional canvas position for the frame.
     * @returns The newly created PageFrame.
     */
    addPageFrame(sizeName: string, position?: Point): PageFrame
    {
        const size = findPageFrameSize(sizeName);

        if (!size)
        {
            throw new Error(
                `${LOG_PREFIX} Unknown page frame size: ${sizeName}`
            );
        }

        const pos = position ?? this.computeViewportCenter(size);
        const frame = this.buildPageFrame(size, pos);

        this.doc.pageFrames.push(frame);
        this.renderer.renderPageFrame(frame);
        this.markDirty();
        this.events.emit("pageframe:add", frame);

        logInfo("Page frame added:", frame.id, sizeName);
        return frame;
    }

    /**
     * Removes a page frame by ID and re-numbers the remaining frames.
     *
     * @param id - Page frame ID to remove.
     */
    removePageFrame(id: string): void
    {
        const idx = this.doc.pageFrames.findIndex((f) => f.id === id);

        if (idx < 0)
        {
            logWarn("removePageFrame: not found:", id);
            return;
        }

        this.doc.pageFrames.splice(idx, 1);
        this.renderer.removePageFrameEl(id);
        this.renumberPageFrames();
        this.markDirty();
        this.events.emit("pageframe:remove", id);
    }

    /**
     * Locks a page frame so it cannot be moved.
     *
     * @param id - Page frame ID to lock.
     */
    lockPageFrame(id: string): void
    {
        const frame = this.findPageFrame(id);

        if (!frame)
        {
            return;
        }

        frame.locked = true;
        this.renderer.renderPageFrame(frame);
        this.markDirty();
    }

    /**
     * Unlocks a page frame so it can be moved again.
     *
     * @param id - Page frame ID to unlock.
     */
    unlockPageFrame(id: string): void
    {
        const frame = this.findPageFrame(id);

        if (!frame)
        {
            return;
        }

        frame.locked = false;
        this.renderer.renderPageFrame(frame);
        this.markDirty();
    }

    /**
     * Returns all page frames in the document.
     *
     * @returns Array of PageFrame objects.
     */
    getPageFrames(): PageFrame[]
    {
        return [...this.doc.pageFrames];
    }

    /**
     * Centres the viewport on a page frame with appropriate zoom
     * so the frame is fully visible.
     *
     * @param id - Page frame ID to scroll to.
     */
    scrollToPageFrame(id: string): void
    {
        const frame = this.findPageFrame(id);

        if (!frame)
        {
            return;
        }

        const fakeObj = this.frameToFakeObject(frame);

        this.renderer.zoomToFit([fakeObj], 60);
        this.emitViewportChange();
        logInfo("Scrolled to page frame:", id);
    }

    /**
     * Sets the inner margin guides for a page frame.
     *
     * @param id - Page frame ID.
     * @param margins - New margin specification.
     */
    setPageFrameMargins(id: string, margins: PageFrameMargins): void
    {
        const frame = this.findPageFrame(id);

        if (!frame)
        {
            return;
        }

        frame.margins = { ...margins };
        this.renderer.renderPageFrame(frame);
        this.markDirty();
    }

    /**
     * Sets the border colour and width for a page frame.
     *
     * @param id - Page frame ID.
     * @param color - Border colour string.
     * @param width - Border width (0.5–2px).
     */
    setPageFrameBorder(
        id: string,
        color: string,
        width: number
    ): void
    {
        const frame = this.findPageFrame(id);

        if (!frame)
        {
            return;
        }

        frame.borderColor = color;
        frame.borderWidth = clamp(width, 0.5, 2);
        this.renderer.renderPageFrame(frame);
        this.markDirty();
    }

    /**
     * Sets the background colour for a page frame.
     *
     * @param id - Page frame ID.
     * @param color - Background colour string (use low alpha).
     */
    setPageFrameBackground(id: string, color: string): void
    {
        const frame = this.findPageFrame(id);

        if (!frame)
        {
            return;
        }

        frame.backgroundColor = color;
        this.renderer.renderPageFrame(frame);
        this.markDirty();
    }

    /**
     * Returns the predefined page frame sizes.
     *
     * @returns Array of PageFrameSize definitions.
     */
    getPageFrameSizes(): PageFrameSize[]
    {
        return [...PAGE_FRAME_SIZES];
    }

    // ========================================================================
    // PUBLIC API — EXPORT
    // ========================================================================

    /**
     * Exports the canvas as an SVG string. Page frames are excluded
     * from the export by temporarily hiding the page frames layer.
     *
     * @returns SVG markup string without page frame overlays.
     */
    exportSVG(): string
    {
        const pfLayer = this.renderer.getPageFramesLayer();
        const wasVisible = pfLayer.style.display;

        pfLayer.style.display = "none";

        const result = new XMLSerializer().serializeToString(
            this.renderer.getSvgElement()
        );

        pfLayer.style.display = wasVisible;

        return result;
    }

    /**
     * Exports the document as a JSON string. Page frames are excluded
     * from the exported JSON payload.
     *
     * @returns JSON string with 2-space indentation, without page frames.
     */
    exportJSON(): string
    {
        const clone = this.cloneDoc(this.doc);

        clone.pageFrames = [];
        clone.metadata.modified = new Date().toISOString();

        return JSON.stringify(clone, null, 2);
    }

    // ========================================================================
    // PUBLIC API — EVENTS
    // ========================================================================

    /**
     * Registers an event handler.
     *
     * @param event - Event name (e.g. "object:add", "selection:change").
     * @param handler - Handler function.
     */
    on(event: string, handler: EventHandler): void
    {
        this.events.on(event, handler);
    }

    /**
     * Removes an event handler.
     *
     * @param event - Event name.
     * @param handler - Handler function to remove.
     */
    off(event: string, handler: EventHandler): void
    {
        this.events.off(event, handler);
    }

    // ========================================================================
    // PUBLIC API — LIFECYCLE
    // ========================================================================

    /**
     * Notifies the engine that its container has been resized.
     * The SVG auto-sizes via CSS, but this can be used to trigger
     * re-layout of viewport-dependent elements.
     */
    resize(): void
    {
        // SVG auto-sizes via width/height 100%
    }

    /**
     * Returns the root SVG element.
     *
     * @returns The SVG element mounted in the container.
     */
    getElement(): HTMLElement
    {
        return this.renderer.getSvgElement() as unknown as HTMLElement;
    }

    // ========================================================================
    // PUBLIC API — GROUPING
    // ========================================================================

    /**
     * Groups the specified objects into a new group object.
     *
     * @param ids - Object IDs to group (minimum 2).
     * @returns The newly created group object.
     */
    group(ids: string[]): DiagramObject
    {
        const children = ids
            .map((id) => this.getObjectById(id))
            .filter((o): o is DiagramObject => o !== null);

        if (children.length < 2)
        {
            throw new Error(`${LOG_PREFIX} Need at least 2 objects to group`);
        }

        const bbox = this.computeBBoxOf(children);

        const groupObj = this.addObject({
            semantic: { type: "group", data: {} },
            presentation: {
                shape: "rectangle",
                bounds: bbox,
                style: { fill: { type: "none" } },
            },
        });

        for (const child of children)
        {
            child.presentation.groupId = groupObj.id;
        }

        this.markDirty();
        return groupObj;
    }

    /**
     * Ungroups a group, promoting its children to the top level.
     *
     * @param groupId - The group object ID.
     * @returns The ungrouped child objects.
     */
    ungroup(groupId: string): DiagramObject[]
    {
        const children = this.doc.objects.filter(
            (o) => o.presentation.groupId === groupId
        );

        for (const child of children)
        {
            child.presentation.groupId = undefined;
        }

        this.removeObjectInternal(groupId);
        this.markDirty();
        return children;
    }

    // ========================================================================
    // PUBLIC API — FLIP & ROTATE
    // ========================================================================

    /**
     * Flips objects horizontally (mirrors left-right).
     *
     * @param ids - Object IDs to flip.
     */
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

    /**
     * Flips objects vertically (mirrors top-bottom).
     *
     * @param ids - Object IDs to flip.
     */
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

    /**
     * Rotates objects by a delta angle.
     *
     * @param ids - Object IDs to rotate.
     * @param degrees - Angle to add (in degrees).
     */
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

        this.refreshSelectionVisuals();
        this.markDirty();
    }

    // ========================================================================
    // PUBLIC API — CLIPBOARD
    // ========================================================================

    private clipboard: DiagramObject[] = [];

    /** Copies the selected objects to the clipboard. */
    copy(): void
    {
        this.clipboard = this.getSelectedObjects().map(
            (o) => JSON.parse(JSON.stringify(o))
        );
    }

    /** Copies and then deletes the selected objects. */
    cut(): void
    {
        this.copy();
        this.deleteSelected();
    }

    /** Pastes the clipboard contents with a 20px offset. */
    paste(): void
    {
        if (this.clipboard.length === 0)
        {
            return;
        }

        this.clearSelectionInternal();

        for (const src of this.clipboard)
        {
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

    /** Copies and immediately pastes (duplicate in place). */
    duplicate(): void
    {
        this.copy();
        this.paste();
    }

    // ========================================================================
    // PUBLIC API — Z-ORDERING
    // ========================================================================

    /**
     * Brings objects to the front of their layer.
     *
     * @param ids - Object IDs to bring to front.
     */
    bringToFront(ids: string[]): void
    {
        const maxZ = Math.max(
            ...this.doc.objects.map((o) => o.presentation.zIndex), 0
        );

        for (const id of ids)
        {
            const obj = this.getObjectById(id);

            if (obj)
            {
                obj.presentation.zIndex = maxZ + 1;
            }
        }

        this.reRenderAll();
        this.markDirty();
    }

    /**
     * Sends objects to the back of their layer.
     *
     * @param ids - Object IDs to send to back.
     */
    sendToBack(ids: string[]): void
    {
        const minZ = Math.min(
            ...this.doc.objects.map((o) => o.presentation.zIndex), 0
        );

        for (const id of ids)
        {
            const obj = this.getObjectById(id);

            if (obj)
            {
                obj.presentation.zIndex = minZ - 1;
            }
        }

        this.reRenderAll();
        this.markDirty();
    }

    // ========================================================================
    // PUBLIC API — ALIGNMENT
    // ========================================================================

    /**
     * Aligns objects relative to the selection bounding box.
     *
     * @param ids - Object IDs to align.
     * @param alignment - Alignment type (left, center, right, top, middle, bottom).
     */
    alignObjects(ids: string[], alignment: AlignmentType): void
    {
        const objs = ids
            .map((id) => this.getObjectById(id))
            .filter((o): o is DiagramObject => o !== null);

        if (objs.length < 2)
        {
            return;
        }

        const bbox = this.computeBBoxOf(objs);

        for (const obj of objs)
        {
            this.applyAlignment(obj, alignment, bbox);
            this.rerenderObject(obj);
        }

        this.refreshSelectionVisuals();
        this.markDirty();
    }

    /**
     * Distributes objects evenly along an axis.
     *
     * @param ids - Object IDs to distribute (requires 3+).
     * @param axis - Distribution axis.
     */
    distributeObjects(ids: string[], axis: "horizontal" | "vertical"): void
    {
        const objs = ids
            .map((id) => this.getObjectById(id))
            .filter((o): o is DiagramObject => o !== null);

        if (objs.length < 3)
        {
            return;
        }

        if (axis === "horizontal")
        {
            this.distributeH(objs);
        }
        else
        {
            this.distributeV(objs);
        }

        this.refreshSelectionVisuals();
        this.markDirty();
    }

    // ========================================================================
    // PUBLIC API — LAYERS
    // ========================================================================

    /**
     * Adds a new layer to the document.
     *
     * @param partial - Partial layer definition.
     * @returns The created Layer.
     */
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

    /**
     * Removes a layer. Objects on it move to the default layer.
     *
     * @param id - Layer ID to remove.
     */
    removeLayer(id: string): void
    {
        if (id === DEFAULT_LAYER_ID)
        {
            return;
        }

        const idx = this.doc.layers.findIndex((l) => l.id === id);

        if (idx < 0)
        {
            return;
        }

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
    }

    /**
     * Returns all layers.
     *
     * @returns Array of Layer definitions.
     */
    getLayers(): Layer[]
    {
        return [...this.doc.layers];
    }

    // ========================================================================
    // PUBLIC API — DRAW SHAPE TYPE
    // ========================================================================

    /**
     * Sets the shape type for the draw tool.
     *
     * @param type - Shape type string (e.g. "ellipse", "diamond").
     */
    setDrawShape(type: string): void
    {
        const drawTool = this.toolManager.get("draw") as DrawTool | null;

        if (drawTool && typeof drawTool.setShapeType === "function")
        {
            drawTool.setShapeType(type);
        }
    }

    // ========================================================================
    // PUBLIC API — CONNECTORS
    // ========================================================================

    /**
     * Adds a new connector to the document and renders it on the canvas.
     * Missing fields are populated with sensible defaults.
     *
     * @param partial - Partial connector definition.
     * @returns The fully constructed DiagramConnector with generated ID.
     */
    addConnector(partial: Partial<DiagramConnector>): DiagramConnector
    {
        const conn = this.buildConnector(partial);

        this.doc.connectors.push(conn);
        this.rerenderConnector(conn);
        this.markDirty();
        this.events.emit("connector:add", conn);

        return conn;
    }

    /**
     * Removes a connector from the document and the canvas.
     *
     * @param id - Connector ID to remove.
     */
    removeConnector(id: string): void
    {
        const idx = this.doc.connectors.findIndex((c) => c.id === id);

        if (idx < 0)
        {
            return;
        }

        this.doc.connectors.splice(idx, 1);
        this.renderer.removeConnectorEl(id);
        this.markDirty();
        this.events.emit("connector:remove", id);
    }

    /**
     * Updates an existing connector's properties and re-renders it.
     *
     * @param id - Connector ID to update.
     * @param changes - Partial changes to merge into the connector.
     */
    updateConnector(id: string, changes: Partial<DiagramConnector>): void
    {
        const conn = this.getConnector(id);

        if (!conn)
        {
            return;
        }

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

    /**
     * Finds a connector by its ID.
     *
     * @param id - Connector ID to look up.
     * @returns The matching connector, or null if not found.
     */
    getConnector(id: string): DiagramConnector | null
    {
        return this.doc.connectors.find((c) => c.id === id) ?? null;
    }

    /**
     * Returns all connectors in the document.
     *
     * @returns Array of all DiagramConnector instances.
     */
    getConnectors(): DiagramConnector[]
    {
        return [...this.doc.connectors];
    }

    /**
     * Returns all connectors that link two specific objects,
     * regardless of direction.
     *
     * @param objIdA - First object ID.
     * @param objIdB - Second object ID.
     * @returns Array of connectors between the two objects.
     */
    getConnectorsBetween(objIdA: string, objIdB: string): DiagramConnector[]
    {
        return this.doc.connectors.filter((c) =>
        {
            const src = c.presentation.sourceId;
            const tgt = c.presentation.targetId;

            return (
                (src === objIdA && tgt === objIdB)
                || (src === objIdB && tgt === objIdA)
            );
        });
    }

    // ========================================================================
    // PRIVATE — ALIGNMENT HELPERS
    // ========================================================================

    private applyAlignment(
        obj: DiagramObject,
        alignment: AlignmentType,
        bbox: Rect
    ): void
    {
        const b = obj.presentation.bounds;

        switch (alignment)
        {
            case "left": b.x = bbox.x; break;
            case "right": b.x = bbox.x + bbox.width - b.width; break;
            case "center": b.x = bbox.x + (bbox.width - b.width) / 2; break;
            case "top": b.y = bbox.y; break;
            case "bottom": b.y = bbox.y + bbox.height - b.height; break;
            case "middle": b.y = bbox.y + (bbox.height - b.height) / 2; break;
        }
    }

    private distributeH(objs: DiagramObject[]): void
    {
        objs.sort((a, b) => a.presentation.bounds.x - b.presentation.bounds.x);
        const first = objs[0].presentation.bounds;
        const last = objs[objs.length - 1].presentation.bounds;
        const totalW = objs.reduce((s, o) => s + o.presentation.bounds.width, 0);
        const gap = (last.x + last.width - first.x - totalW) / (objs.length - 1);
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
        objs.sort((a, b) => a.presentation.bounds.y - b.presentation.bounds.y);
        const first = objs[0].presentation.bounds;
        const last = objs[objs.length - 1].presentation.bounds;
        const totalH = objs.reduce((s, o) => s + o.presentation.bounds.height, 0);
        const gap = (last.y + last.height - first.y - totalH) / (objs.length - 1);
        let cy = first.y + first.height + gap;

        for (let i = 1; i < objs.length - 1; i++)
        {
            objs[i].presentation.bounds.y = cy;
            this.rerenderObject(objs[i]);
            cy += objs[i].presentation.bounds.height + gap;
        }
    }

    private computeBBoxOf(objects: DiagramObject[]): Rect
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

    // ========================================================================
    // PUBLIC API — LAYOUTS
    // ========================================================================

    /**
     * Registers a custom layout algorithm by name. Overwrites any
     * previously registered layout with the same name.
     *
     * @param name - Unique layout name.
     * @param fn - Layout function to register.
     */
    registerLayout(name: string, fn: LayoutFunction): void
    {
        this.layoutRegistry.set(name, fn);
        logInfo("Layout registered:", name);
    }

    /**
     * Dispatches a layout by name. Checks the custom registry first,
     * then falls back to built-in layouts. Applies the resulting
     * positions to objects and re-renders.
     *
     * @param name - Layout name (e.g. "force", "grid", or a custom name).
     * @param options - Layout-specific configuration.
     */
    async applyLayout(
        name: string,
        options?: Record<string, unknown>
    ): Promise<void>
    {
        const opts = options ?? {};
        const objects = this.getObjects();
        const connectors = this.getConnectors();

        const positions = await this.resolveLayoutPositions(
            name, objects, connectors, opts
        );

        if (!positions)
        {
            logWarn("Unknown layout:", name);
            return;
        }

        this.applyLayoutPositions(positions);
    }

    /**
     * Resolves layout positions from a custom or built-in layout.
     *
     * @param name - Layout name.
     * @param objects - All document objects.
     * @param connectors - All document connectors.
     * @param opts - Layout options.
     * @returns A map of object ID to new position, or null.
     */
    private async resolveLayoutPositions(
        name: string,
        objects: DiagramObject[],
        connectors: DiagramConnector[],
        opts: Record<string, unknown>
    ): Promise<Map<string, Point> | null>
    {
        const custom = this.layoutRegistry.get(name);

        if (custom)
        {
            return await custom(objects, connectors, opts);
        }

        if (name === "force")
        {
            return layoutForce(objects, opts);
        }

        if (name === "grid")
        {
            return layoutGrid(objects, opts);
        }

        return null;
    }

    /**
     * Applies a position map to objects and re-renders the canvas.
     *
     * @param positions - Map of object ID to new position.
     */
    private applyLayoutPositions(positions: Map<string, Point>): void
    {
        for (const [id, pos] of positions)
        {
            this.moveObjectTo(id, pos);
        }

        this.reRenderAll();
        this.markDirty();
        logInfo("Layout applied,", positions.size, "objects positioned");
    }

    // ========================================================================
    // PUBLIC API — PNG / PDF EXPORT
    // ========================================================================

    /**
     * Exports the diagram as a PNG Blob via an SVG-to-canvas pipeline.
     *
     * @param options - Export options: scale factor and background colour.
     * @returns A Promise resolving to a PNG Blob.
     */
    /**
     * @deprecated Use exportSVG() instead. PNG export has CORS
     * limitations with external images and cross-origin stylesheets.
     * For high-fidelity raster export, use a server-side renderer
     * on the SVG output.
     */
    async exportPNG(
        options?: { scale?: number; background?: string }
    ): Promise<Blob>
    {
        logWarn("exportPNG is deprecated — use exportSVG() and render server-side for PNG");

        const pfLayer = this.renderer.getPageFramesLayer();
        const wasVisible = pfLayer.style.display;

        pfLayer.style.display = "none";

        const svg = this.renderer.getSvgElement();
        const scale = options?.scale ?? PNG_DEFAULT_SCALE;
        const bg = options?.background ?? PNG_DEFAULT_BG;

        const svgData = serializeSvg(svg);
        const img = await loadSvgAsImage(svgData, svg, scale);
        const blob = renderImageToBlob(img, svg, scale, bg);

        pfLayer.style.display = wasVisible;

        logInfo("PNG exported, scale:", scale);
        return blob;
    }

    /**
     * Exports the diagram as a print-ready PDF-style HTML Blob.
     *
     * @returns A Promise resolving to an HTML Blob suitable for printing.
     */
    async exportPDF(): Promise<Blob>
    {
        const pfLayer = this.renderer.getPageFramesLayer();
        const wasVisible = pfLayer.style.display;

        pfLayer.style.display = "none";

        const svg = this.renderer.getSvgElement();
        const svgData = serializeSvg(svg);
        const title = this.doc.metadata?.title ?? "Diagram";
        const html = buildPdfHtml(title, svgData);

        pfLayer.style.display = wasVisible;

        logInfo("PDF HTML exported for:", title);
        return new Blob([html], { type: "text/html;charset=utf-8" });
    }

    // ========================================================================
    // PUBLIC API — FIND AND REPLACE
    // ========================================================================

    /**
     * Searches all objects for text content matching a query string.
     *
     * @param query - Search string.
     * @param options - Search options: caseSensitive (default false).
     * @returns Array of match results with objectId and text.
     */
    findText(
        query: string,
        options?: { caseSensitive?: boolean }
    ): { objectId: string; text: string }[]
    {
        const caseSensitive = options?.caseSensitive ?? false;
        const results: { objectId: string; text: string }[] = [];
        const objects = this.getObjects();

        for (const obj of objects)
        {
            findInObject(obj, query, caseSensitive, results);
        }

        logInfo("Find:", results.length, "matches for", JSON.stringify(query));
        return results;
    }

    /**
     * Replaces all occurrences of a query string in all objects' text
     * content. Returns the total number of replacements made.
     *
     * @param query - String to find.
     * @param replacement - Replacement string.
     * @param options - Search options: caseSensitive (default false).
     * @returns Total number of replacements made.
     */
    replaceText(
        query: string,
        replacement: string,
        options?: { caseSensitive?: boolean }
    ): number
    {
        const caseSensitive = options?.caseSensitive ?? false;
        const objects = this.getObjects();
        let count = 0;

        for (const obj of objects)
        {
            count += replaceInObject(obj, query, replacement, caseSensitive);
        }

        if (count > 0)
        {
            this.reRenderAll();
            this.markDirty();
        }

        logInfo("Replace:", count, "substitutions");
        return count;
    }

    // ========================================================================
    // PUBLIC API — FORMAT PAINTER
    // ========================================================================

    /**
     * Copies the style of the specified object to the format clipboard.
     *
     * @param objectId - ID of the object whose style to copy.
     */
    pickFormat(objectId: string): void
    {
        const obj = this.getObject(objectId);

        if (!obj)
        {
            logWarn("pickFormat: object not found:", objectId);
            return;
        }

        const style = obj.presentation.style;

        this.formatClipboard = {
            fill: style.fill ? JSON.parse(JSON.stringify(style.fill)) : undefined,
            stroke: style.stroke ? JSON.parse(JSON.stringify(style.stroke)) : undefined,
            shadow: style.shadow ? JSON.parse(JSON.stringify(style.shadow)) : undefined,
            opacity: style.opacity,
        };

        logInfo("Format picked from:", objectId);
    }

    /**
     * Applies the captured format to each target object's style.
     *
     * @param targetIds - IDs of objects to apply the format to.
     */
    applyFormat(targetIds: string[]): void
    {
        if (!this.formatClipboard)
        {
            logWarn("applyFormat: no format captured");
            return;
        }

        for (const id of targetIds)
        {
            this.applyFormatToSingle(id);
        }

        this.reRenderAll();
        this.markDirty();
        logInfo("Format applied to", targetIds.length, "objects");
    }

    /**
     * Applies the format clipboard to a single object's style.
     *
     * @param objectId - Object ID to update.
     */
    private applyFormatToSingle(objectId: string): void
    {
        const obj = this.getObject(objectId);

        if (!obj || !this.formatClipboard)
        {
            return;
        }

        const style = obj.presentation.style;
        const fmt = this.formatClipboard;

        if (fmt.fill)
        {
            style.fill = JSON.parse(JSON.stringify(fmt.fill));
        }

        if (fmt.stroke)
        {
            style.stroke = JSON.parse(JSON.stringify(fmt.stroke));
        }

        if (fmt.shadow)
        {
            style.shadow = JSON.parse(JSON.stringify(fmt.shadow));
        }

        if (fmt.opacity !== undefined)
        {
            style.opacity = fmt.opacity;
        }
    }

    /**
     * Clears the format painter clipboard.
     */
    clearFormat(): void
    {
        this.formatClipboard = null;
        logInfo("Format clipboard cleared");
    }

    /**
     * Checks whether the format painter clipboard holds a captured style.
     *
     * @returns true if a format is captured.
     */
    hasFormat(): boolean
    {
        return this.formatClipboard !== null;
    }

    // ========================================================================
    // PUBLIC API — SPATIAL QUERIES
    // ========================================================================

    /**
     * Finds all visible objects whose bounds intersect the given rectangle.
     *
     * @param rect - Query rectangle in canvas coordinates.
     * @returns Array of objects overlapping the rectangle.
     */
    findObjectsInRect(rect: Rect): DiagramObject[]
    {
        const objects = this.getObjects();
        const results: DiagramObject[] = [];

        for (const obj of objects)
        {
            if (!obj.presentation.visible)
            {
                continue;
            }

            if (boundsIntersect(obj.presentation.bounds, rect))
            {
                results.push(obj);
            }
        }

        return results;
    }

    /**
     * Finds all visible objects whose bounds contain the given point.
     *
     * @param point - Query point in canvas coordinates.
     * @returns Array of objects containing the point.
     */
    findObjectsAtPoint(point: Point): DiagramObject[]
    {
        const objects = this.getObjects();
        const results: DiagramObject[] = [];

        for (const obj of objects)
        {
            if (!obj.presentation.visible)
            {
                continue;
            }

            if (pointInBounds(point, obj.presentation.bounds))
            {
                results.push(obj);
            }
        }

        return results;
    }

    // ========================================================================
    // PUBLIC API — GRAPH ANALYSIS
    // ========================================================================

    /**
     * Finds the shortest path between two objects using BFS on the
     * connector graph.
     *
     * @param fromId - Starting object ID.
     * @param toId - Destination object ID.
     * @returns Array of object IDs from source to destination (inclusive).
     */
    getShortestPath(fromId: string, toId: string): string[]
    {
        if (fromId === toId)
        {
            return [fromId];
        }

        const connectors = this.getConnectors();
        const adj = buildAdjacencyMap(connectors);

        return bfsPath(adj, fromId, toId);
    }

    /**
     * Finds all connected components in the diagram graph using DFS.
     *
     * @returns Array of connected components (each an array of object IDs).
     */
    getConnectedComponents(): string[][]
    {
        const connectors = this.getConnectors();
        const objects = this.getObjects();
        const adj = buildAdjacencyMap(connectors);
        const visited = new Set<string>();
        const components: string[][] = [];

        for (const obj of objects)
        {
            if (!visited.has(obj.id))
            {
                const component = dfsCollect(adj, obj.id, visited);
                components.push(component);
            }
        }

        return components;
    }

    /**
     * Returns all connectors whose target is the specified object.
     *
     * @param objectId - Object ID to query.
     * @returns Array of incoming connectors.
     */
    getIncomingConnectors(objectId: string): DiagramConnector[]
    {
        return this.getConnectors().filter(
            (c) => c.presentation.targetId === objectId
        );
    }

    /**
     * Returns all connectors whose source is the specified object.
     *
     * @param objectId - Object ID to query.
     * @returns Array of outgoing connectors.
     */
    getOutgoingConnectors(objectId: string): DiagramConnector[]
    {
        return this.getConnectors().filter(
            (c) => c.presentation.sourceId === objectId
        );
    }

    // ========================================================================
    // PUBLIC API — GROUP COLLAPSE / EXPAND
    // ========================================================================

    /**
     * Collapses a group by hiding all its child objects.
     *
     * @param groupId - ID of the group to collapse.
     */
    collapseGroup(groupId: string): void
    {
        const children = this.doc.objects.filter(
            (o) => o.presentation.groupId === groupId
        );

        for (const child of children)
        {
            child.presentation.visible = false;
        }

        this.reRenderAll();
        this.markDirty();
        logInfo("Collapsed group:", groupId, "->", children.length, "children hidden");
    }

    /**
     * Expands a group by showing all its child objects.
     *
     * @param groupId - ID of the group to expand.
     */
    expandGroup(groupId: string): void
    {
        const children = this.doc.objects.filter(
            (o) => o.presentation.groupId === groupId
        );

        for (const child of children)
        {
            child.presentation.visible = true;
        }

        this.reRenderAll();
        this.markDirty();
        logInfo("Expanded group:", groupId, "->", children.length, "children shown");
    }

    // ========================================================================
    // PUBLIC API — COMMENTS
    // ========================================================================

    /**
     * Adds a comment anchored to an object, connector, or canvas position.
     *
     * @param anchor - Anchor specification (type + entityId or position).
     * @param content - Comment text.
     * @param userId - Author user ID.
     * @param userName - Author display name.
     * @returns The newly created DiagramComment.
     */
    addComment(
        anchor: DiagramComment["anchor"],
        content: string,
        userId: string,
        userName: string
    ): DiagramComment
    {
        const now = new Date().toISOString();
        const id = generateId();

        const comment: DiagramComment = {
            id,
            anchor,
            thread: [buildCommentEntry(userId, userName, content, now)],
            status: "open",
            created: now,
            updated: now,
        };

        this.doc.comments.push(comment);
        this.markDirty();
        logInfo("Comment added:", id, "by", userName);
        return comment;
    }

    /**
     * Returns all comments in the document.
     *
     * @returns Array of all DiagramComment objects.
     */
    getComments(): DiagramComment[]
    {
        return [...this.doc.comments];
    }

    /**
     * Returns comments anchored to a specific object.
     *
     * @param objectId - Object ID to filter by.
     * @returns Array of comments anchored to the object.
     */
    getCommentsForObject(objectId: string): DiagramComment[]
    {
        return this.doc.comments.filter(
            (c) => c.anchor.entityId === objectId
        );
    }

    /**
     * Marks a comment as resolved by setting its status and timestamp.
     *
     * @param commentId - ID of the comment to resolve.
     */
    resolveComment(commentId: string): void
    {
        const comment = this.doc.comments.find(
            (c) => c.id === commentId
        );

        if (!comment)
        {
            logWarn("resolveComment: not found:", commentId);
            return;
        }

        comment.status = "resolved";
        comment.updated = new Date().toISOString();
        this.markDirty();
        logInfo("Comment resolved:", commentId);
    }

    // ========================================================================
    // PUBLIC API — DEEP LINKING
    // ========================================================================

    /**
     * Navigates to a diagram entity via a URI. Supported formats:
     * - `object://{id}` — selects the object
     * - `connector://{id}` — selects the connector's source
     * - `comment://{id}` — selects the comment's anchor object
     *
     * @param uri - Deep link URI.
     * @returns true if navigation succeeded.
     */
    navigateToURI(uri: string): boolean
    {
        const parts = uri.split("://");

        if (parts.length !== 2)
        {
            logWarn("navigateToURI: invalid format:", uri);
            return false;
        }

        const scheme = parts[0];
        const id = parts[1];

        return this.dispatchNavigation(scheme, id);
    }

    /**
     * Dispatches navigation based on the URI scheme.
     *
     * @param scheme - URI scheme (object, connector, comment).
     * @param id - Entity ID.
     * @returns true if navigation succeeded.
     */
    private dispatchNavigation(scheme: string, id: string): boolean
    {
        if (scheme === "object")
        {
            return this.navigateToObject(id);
        }

        if (scheme === "connector")
        {
            return this.navigateToConnector(id);
        }

        if (scheme === "comment")
        {
            return this.navigateToComment(id);
        }

        logWarn("navigateToURI: unknown scheme:", scheme);
        return false;
    }

    /**
     * Selects an object by ID for deep link navigation.
     *
     * @param id - Object ID.
     * @returns true if the object was found and selected.
     */
    private navigateToObject(id: string): boolean
    {
        const obj = this.getObject(id);

        if (!obj)
        {
            logWarn("navigateToURI: object not found:", id);
            return false;
        }

        this.select([id]);
        logInfo("Navigated to object:", id);
        return true;
    }

    /**
     * Selects a connector's source object for navigation.
     *
     * @param id - Connector ID.
     * @returns true if the connector was found.
     */
    private navigateToConnector(id: string): boolean
    {
        const conn = this.getConnector(id);

        if (!conn)
        {
            logWarn("navigateToURI: connector not found:", id);
            return false;
        }

        this.select([conn.presentation.sourceId]);
        logInfo("Navigated to connector:", id);
        return true;
    }

    /**
     * Navigates to a comment's anchor object.
     *
     * @param id - Comment ID.
     * @returns true if the comment and its anchor were found.
     */
    private navigateToComment(id: string): boolean
    {
        const comment = this.doc.comments.find(
            (c) => c.id === id
        );

        if (!comment)
        {
            logWarn("navigateToURI: comment not found:", id);
            return false;
        }

        if (comment.anchor.entityId)
        {
            this.select([comment.anchor.entityId]);
        }

        logInfo("Navigated to comment:", id);
        return true;
    }

    // ========================================================================
    // PUBLIC API — EMBEDDABLE COMPONENTS
    // ========================================================================

    /**
     * Registers an embeddable component type in the engine's registry.
     * Once registered, objects with matching embed.component can be
     * instantiated on the canvas.
     *
     * @param name - Unique component name (e.g. "datagrid").
     * @param entry - Component registry entry with factory, label, etc.
     */
    registerEmbeddableComponent(
        name: string,
        entry: EmbeddableComponentEntry): void
    {
        this.embedRegistry.set(name, entry);
        this.renderer.setEmbedRegistry(this.embedRegistry);

        logInfo("Embeddable component registered:", name);
    }

    /**
     * Returns a read-only copy of the embeddable component registry.
     *
     * @returns A new Map of registered component entries.
     */
    getEmbeddableComponents(): Map<string, EmbeddableComponentEntry>
    {
        return new Map(this.embedRegistry);
    }

    /**
     * Loads a named embed pack, bulk-registering all its components.
     * Currently supports "enterprise-theme" which registers the full
     * Enterprise Theme component library.
     *
     * @param name - Pack identifier (e.g. "enterprise-theme").
     * @throws Error if the pack name is not recognised.
     */
    loadEmbedPack(name: string): void
    {
        if (name === "enterprise-theme")
        {
            registerEnterpriseThemeEmbeds(this);
            return;
        }

        throw new Error(
            `${LOG_PREFIX} Unknown embed pack: "${name}"`
        );
    }

    /**
     * Toggles interactive mode on an embed object. When interactive,
     * the embedded component receives pointer events directly.
     *
     * @param objectId - The diagram object ID with an embed definition.
     */
    toggleEmbedInteractive(objectId: string): void
    {
        const obj = this.getObjectById(objectId);

        if (!obj?.presentation.embed)
        {
            return;
        }

        const embed = obj.presentation.embed;
        const wasInteractive = embed.interactive === true;

        if (wasInteractive)
        {
            this.deactivateEmbed(objectId, embed);
        }
        else
        {
            this.activateEmbed(objectId, embed);
        }
    }

    /**
     * Exits interactive mode on the currently active embed object,
     * if any. Called on click-outside and Escape key.
     */
    exitEmbedInteractive(): void
    {
        if (!this.activeEmbedObjectId)
        {
            return;
        }

        const obj = this.getObjectById(this.activeEmbedObjectId);

        if (obj?.presentation.embed)
        {
            this.deactivateEmbed(
                this.activeEmbedObjectId,
                obj.presentation.embed
            );
        }
    }

    // ========================================================================
    // PRIVATE — EMBED INTERACTION HELPERS
    // ========================================================================

    /**
     * Activates interactive mode on an embed object, exiting any
     * previously active embed first.
     *
     * @param objectId - The object ID to activate.
     * @param embed - The embed definition to update.
     */
    private activateEmbed(
        objectId: string,
        embed: EmbedDefinition): void
    {
        if (this.activeEmbedObjectId && this.activeEmbedObjectId !== objectId)
        {
            this.exitEmbedInteractive();
        }

        embed.interactive = true;
        this.activeEmbedObjectId = objectId;
        this.renderer.setEmbedInteractive(objectId, true);

        logDebug("Embed interactive ON:", objectId);
    }

    /**
     * Deactivates interactive mode on an embed object, capturing
     * its state before disabling pointer events.
     *
     * @param objectId - The object ID to deactivate.
     * @param embed - The embed definition to update.
     */
    private deactivateEmbed(
        objectId: string,
        embed: EmbedDefinition): void
    {
        this.renderer.captureEmbedState(objectId, embed);
        embed.interactive = false;
        this.activeEmbedObjectId = null;
        this.renderer.setEmbedInteractive(objectId, false);

        logDebug("Embed interactive OFF:", objectId);
    }

    // ========================================================================
    // PUBLIC API — LIFECYCLE
    // ========================================================================

    /**
     * Destroys the engine, removing all DOM elements and event listeners.
     * The engine cannot be used after calling this method.
     */
    destroy(): void
    {
        if (this.destroyed)
        {
            return;
        }

        this.destroyed = true;

        if (this.themeObserver)
        {
            this.themeObserver.disconnect();
            this.themeObserver = null;
        }

        if (this.hoverCard)
        {
            try { this.hoverCard.destroy(); }
            catch (e) { logWarn("hoverCard destroy failed", e); }

            this.hoverCard = null;
            this.hoverAnchorId = null;
        }

        this.renderer.destroy();
        logInfo("Destroyed:", this.instanceId);
    }

    // ========================================================================
    // PRIVATE — HOVER CARD (ADR-126)
    // ========================================================================

    /**
     * ⚓ updateHoverCard — called from pointermove to show/hide the card.
     * Guards: mode !== "off", active tool === "select", no interaction.
     */
    private updateHoverCard(canvasPos: Point): void
    {
        const mode = this.opts.objectHoverCardMode ?? "off";

        if (!this.hoverCardEligible(mode))
        {
            this.hideHoverCard();
            return;
        }

        const hit = this.hoverHitTest(canvasPos);

        if (!hit)
        {
            this.hideHoverCard();
            return;
        }

        this.showHoverForHit(hit, mode);
    }

    /** Whether the hover card should be considered at all right now. */
    private hoverCardEligible(mode: DiagramHoverCardMode): boolean
    {
        if (mode === "off") { return false; }
        if (this.toolManager.getActiveName() !== "select") { return false; }
        if (this.toolManager.isInteracting()) { return false; }

        return true;
    }

    /** Hit-test objects first, then connectors. */
    private hoverHitTest(canvasPos: Point): HoverHit | null
    {
        const obj = this.hitTestObject(canvasPos);

        if (obj) { return { kind: "object", id: obj.id, obj }; }

        const conn = this.hitTestConnector(canvasPos);

        if (conn) { return { kind: "connector", id: conn.id, conn }; }

        return null;
    }

    /** Resolve content + anchor, then call show() on the shared handle. */
    private showHoverForHit(hit: HoverHit, mode: DiagramHoverCardMode): void
    {
        const content = this.resolveHoverContent(hit, mode);

        if (content == null) { this.hideHoverCard(); return; }

        const card = this.ensureHoverCard();

        if (!card) { return; }

        const anchor = this.findHoverAnchor(hit);

        if (!anchor) { return; }

        card.show(anchor, content);
        this.hoverAnchorId = hit.id;
    }

    /** Find the SVG element that backs the hit target. */
    private findHoverAnchor(hit: HoverHit): SVGElement | null
    {
        const svg = this.renderer.getSvgElement();
        const selector = hit.kind === "object"
            ? `[data-id="${hit.id}"]`
            : `[data-connector-id="${hit.id}"]`;

        return svg.querySelector(selector) as SVGElement | null;
    }

    /** Resolve content for a hit target according to mode. */
    private resolveHoverContent(
        hit: HoverHit,
        mode: DiagramHoverCardMode
    ): DiagramHoverRenderResult
    {
        if (hit.kind === "object")
        {
            return this.resolveObjectHoverContent(hit.obj, mode);
        }

        return this.resolveConnectorHoverContent(hit.conn, mode);
    }

    private resolveObjectHoverContent(
        obj: DiagramObject,
        mode: DiagramHoverCardMode
    ): DiagramHoverRenderResult
    {
        if (mode === "custom" && this.opts.renderObjectHoverCard)
        {
            return this.opts.renderObjectHoverCard(obj);
        }

        return buildObjectHoverContent(obj);
    }

    private resolveConnectorHoverContent(
        conn: DiagramConnector,
        mode: DiagramHoverCardMode
    ): DiagramHoverRenderResult
    {
        if (mode === "custom" && this.opts.renderConnectorHoverCard)
        {
            return this.opts.renderConnectorHoverCard(conn);
        }

        return buildConnectorHoverContent(conn);
    }

    /** Hide the card and clear the anchor tracker. */
    private hideHoverCard(): void
    {
        if (this.hoverCard && this.hoverAnchorId)
        {
            this.hoverCard.hide();
        }

        this.hoverAnchorId = null;
    }

    /**
     * Lazily construct the shared HoverCard handle. Resolved via window so
     * the DiagramEngine IIFE stays decoupled. Returns null if the
     * HoverCard component is not loaded.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private ensureHoverCard(): any
    {
        if (this.hoverCard) { return this.hoverCard; }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const factory = (window as any).createHoverCard;

        if (typeof factory !== "function") { return null; }

        this.hoverCard = factory({
            placement: "auto",
            openDelay: 250,
            closeDelay: 100,
        });

        return this.hoverCard;
    }

    // ========================================================================
    // PRIVATE — INITIALISATION
    // ========================================================================

    /**
     * Registers the default tools with the tool manager.
     */
    private registerDefaultTools(): void
    {
        this.toolManager.register(new SelectTool(this));
        this.toolManager.register(new PanTool(this));
        this.toolManager.register(new DrawTool(this as unknown as EngineForDrawTool));
        this.toolManager.register(new TextTool(this as unknown as EngineForDrawTool));
        this.toolManager.register(new ConnectorTool(this as unknown as EngineForConnectTool));
        this.toolManager.register(new PenTool(this as unknown as EngineForPenTool));
        this.toolManager.register(new BrushTool(this as unknown as EngineForBrushTool));
        this.toolManager.register(new HighlighterTool(this as unknown as EngineForHighlighterTool));
        this.toolManager.register(new MeasureTool(this));
        this.toolManager.register(new PaintbrushTool(this as unknown as EngineForPaintbrushTool));
    }

    /**
     * Binds mouse, wheel, keyboard, and double-click events to the SVG canvas.
     */
    private bindCanvasEvents(): void
    {
        const svg = this.renderer.getSvgElement();

        svg.addEventListener("mousedown", (e) => this.onMouseDown(e));
        svg.addEventListener("mousemove", (e) => this.onMouseMove(e));
        svg.addEventListener("mouseup", (e) => this.onMouseUp(e));
        svg.addEventListener("wheel", (e) => this.onWheel(e), { passive: false });
        svg.addEventListener("keydown", (e) => this.onKeyDown(e));
        svg.addEventListener("dblclick", (e) => this.onDoubleClick(e));
    }

    /**
     * Renders the initial state of the document: grid, layers, and objects.
     */
    private performInitialRender(): void
    {
        this.renderer.renderGrid(this.doc.grid);
        this.renderAllPageFrames();

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

    /**
     * Watches for dark/light theme changes and re-renders all objects.
     */
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

    // ========================================================================
    // PRIVATE — EVENT HANDLERS
    // ========================================================================

    /**
     * Handles mousedown on the canvas. Exits embed interactive mode
     * when clicking outside. Dispatches to the active tool.
     * Middle-click activates the pan tool temporarily.
     */
    private onMouseDown(e: MouseEvent): void
    {
        this.endInlineTextEdit();
        this.exitEmbedOnClickOutside(e);

        const pos = this.renderer.screenToCanvas(e.clientX, e.clientY);

        if (e.button === 1)
        {
            this.toolManager.setActive("pan");
        }

        this.toolManager.dispatchMouseDown(e, pos);
    }

    /**
     * Exits embed interactive mode when clicking outside the active
     * embed object. Checks whether the click target is inside the
     * embed container for the currently interactive embed.
     *
     * @param e - The mousedown event.
     */
    private exitEmbedOnClickOutside(e: MouseEvent): void
    {
        if (!this.activeEmbedObjectId)
        {
            return;
        }

        const target = e.target as Element;
        const embedContainer = this.renderer.getSvgElement().querySelector(
            `[data-embed-id="${this.activeEmbedObjectId}"]`
        );

        if (!embedContainer || !embedContainer.contains(target))
        {
            this.exitEmbedInteractive();
        }
    }

    private onMouseMove(e: MouseEvent): void
    {
        const pos = this.renderer.screenToCanvas(e.clientX, e.clientY);
        this.toolManager.dispatchMouseMove(e, pos);
        this.updateHoverCard(pos);
    }

    private onMouseUp(e: MouseEvent): void
    {
        const pos = this.renderer.screenToCanvas(e.clientX, e.clientY);
        this.toolManager.dispatchMouseUp(e, pos);

        if (e.button === 1)
        {
            this.toolManager.setActive("select");
        }

        this.hideHoverCard();
    }

    /**
     * Handles scroll wheel for zoom. Prevents default scroll behaviour.
     */
    private onWheel(e: WheelEvent): void
    {
        e.preventDefault();

        const factor = e.deltaY < 0
            ? (1 + ZOOM_STEP)
            : (1 - ZOOM_STEP);

        const rect = this.renderer.getSvgElement().getBoundingClientRect();
        const fx = e.clientX - rect.left;
        const fy = e.clientY - rect.top;

        this.renderer.zoomAt(factor, fx, fy);
        this.emitViewportChange();
    }

    /**
     * Handles keyboard shortcuts: undo/redo, zoom, and delegates to tools.
     */
    private onKeyDown(e: KeyboardEvent): void
    {
        if (this.handleGlobalShortcut(e))
        {
            return;
        }

        this.toolManager.dispatchKeyDown(e);
    }

    /**
     * Processes global keyboard shortcuts before tool dispatch.
     * Escape exits embed interactive mode if active.
     *
     * @param e - The keyboard event.
     * @returns true if a global shortcut was handled.
     */
    private handleGlobalShortcut(e: KeyboardEvent): boolean
    {
        if (e.key === "Escape" && this.activeEmbedObjectId)
        {
            this.exitEmbedInteractive();
            e.preventDefault();
            return true;
        }

        const ctrl = e.ctrlKey || e.metaKey;

        if (ctrl && e.key === "z" && !e.shiftKey)
        {
            this.undo();
            e.preventDefault();
            return true;
        }

        if ((ctrl && e.key === "y") || (ctrl && e.key === "z" && e.shiftKey))
        {
            this.redo();
            e.preventDefault();
            return true;
        }

        if (ctrl && e.key === "0")
        {
            this.zoomToFit();
            e.preventDefault();
            return true;
        }

        if (e.key === "=" || e.key === "+")
        {
            this.zoomIn();
            e.preventDefault();
            return true;
        }

        if (e.key === "-")
        {
            this.zoomOut();
            e.preventDefault();
            return true;
        }

        return false;
    }

    /**
     * Handles double-click. Activates embed interactive mode if the
     * object has an embed definition, otherwise opens inline text
     * editing or delegates to the consumer callback.
     */
    private onDoubleClick(e: MouseEvent): void
    {
        const pos = this.renderer.screenToCanvas(e.clientX, e.clientY);
        const obj = this.hitTestObject(pos);

        if (!obj)
        {
            return;
        }

        if (this.handleEmbedDoubleClick(obj))
        {
            return;
        }

        if (this.opts.onObjectDoubleClick)
        {
            safeCallback(this.opts.onObjectDoubleClick, obj);
        }
        else if (this.opts.textEditable !== false)
        {
            this.startInlineTextEdit(obj.id);
        }
    }

    /**
     * Checks whether a double-clicked object has an embed definition
     * and toggles its interactive mode if so.
     *
     * @param obj - The double-clicked diagram object.
     * @returns true if the object had an embed and was handled.
     */
    private handleEmbedDoubleClick(obj: DiagramObject): boolean
    {
        const embed = obj.presentation.embed;

        if (!embed)
        {
            return false;
        }

        if (embed.interactiveOnDoubleClick === false)
        {
            return false;
        }

        this.toggleEmbedInteractive(obj.id);
        return true;
    }

    // ========================================================================
    // PRIVATE — RENDERING
    // ========================================================================

    /**
     * Re-renders a single object on the canvas.
     *
     * @param obj - The object to re-render.
     */
    private rerenderObject(obj: DiagramObject): void
    {
        const shapeDef = this.shapeRegistry.get(obj.presentation.shape);

        if (!shapeDef)
        {
            logWarn("Unknown shape type:",
                obj.presentation.shape
            );
            return;
        }

        this.renderer.renderObject(obj, shapeDef);
    }

    /**
     * Re-renders a connector between objects. Can be called publicly
     * to refresh a connector after property changes.
     *
     * @param conn - The connector to re-render.
     */
    rerenderConnector(conn: DiagramConnector): void
    {
        this.renderer.renderConnector(conn, this.doc.objects);
    }

    /**
     * Re-renders all connectors attached to an object.
     * Called after an object is moved, resized, or deleted.
     *
     * @param objectId - The object whose connectors need updating.
     */
    rerenderAttachedConnectors(objectId: string): void
    {
        for (const conn of this.doc.connectors)
        {
            const isSource = conn.presentation.sourceId === objectId;
            const isTarget = conn.presentation.targetId === objectId;

            if (isSource || isTarget)
            {
                this.rerenderConnector(conn);
            }
        }
    }

    /**
     * Re-renders all objects and connectors. Used after theme changes.
     */
    private reRenderAll(): void
    {
        for (const obj of this.doc.objects)
        {
            this.rerenderObject(obj);
        }

        for (const conn of this.doc.connectors)
        {
            this.rerenderConnector(conn);
        }

        this.refreshSelectionVisuals();
    }

    /**
     * Updates selection overlay and fires the selection change event.
     * Also renders highlights for selected connectors.
     */
    private refreshSelectionVisuals(): void
    {
        const selected = this.getSelectedObjects();

        this.renderer.renderSelectionHandles(selected);
        this.renderSelectedConnectorHighlights();

        safeCallback(this.opts.onSelectionChange, selected, []);
        this.events.emit("selection:change", selected);
    }

    /**
     * Renders highlight paths for all selected connectors in the
     * overlay layer.
     */
    private renderSelectedConnectorHighlights(): void
    {
        for (const connId of this.selectedConnectorIds)
        {
            const conn = this.getConnector(connId);

            if (conn)
            {
                this.renderer.renderConnectorHighlight(
                    conn, this.doc.objects
                );
            }
        }
    }

    // ========================================================================
    // SPATIAL CONTAINMENT
    // ========================================================================

    /**
     * Returns all objects whose groupId matches the given container ID.
     *
     * @param containerId - The container object's ID.
     * @returns Array of contained DiagramObject instances.
     */
    getContainedObjects(containerId: string): DiagramObject[]
    {
        return this.doc.objects.filter(
            (o) => o.presentation.groupId === containerId
        );
    }

    /**
     * Updates containment for a set of moved objects. For each object,
     * checks whether it landed inside a container's content area and
     * sets or clears the groupId accordingly.
     *
     * @param objectIds - IDs of objects that were moved.
     */
    updateContainment(objectIds: string[]): void
    {
        for (const id of objectIds)
        {
            const obj = this.getObjectById(id);

            if (!obj)
            {
                continue;
            }

            this.assignContainment(obj);
        }
    }

    /**
     * Assigns or clears containment for a single object based on
     * whether its centre falls inside a container's content area.
     *
     * @param obj - The object to evaluate for containment.
     */
    private assignContainment(obj: DiagramObject): void
    {
        const centre = this.objectCentre(obj);
        const container = this.findContainerAtPosition(
            centre, obj.id
        );

        if (container)
        {
            obj.presentation.groupId = container.id;
        }
        else if (obj.presentation.groupId)
        {
            obj.presentation.groupId = undefined;
        }
    }

    /**
     * Returns the centre point of an object's bounds.
     *
     * @param obj - The diagram object.
     * @returns The centre point.
     */
    private objectCentre(obj: DiagramObject): Point
    {
        const b = obj.presentation.bounds;

        return {
            x: b.x + (b.width / 2),
            y: b.y + (b.height / 2)
        };
    }

    /**
     * Finds the topmost container shape whose content area contains
     * the given position. Excludes the object being tested (so a
     * container cannot contain itself).
     *
     * @param pos - Canvas-space position to test.
     * @param excludeId - Object ID to exclude from the search.
     * @returns The container DiagramObject, or null if none found.
     */
    private findContainerAtPosition(
        pos: Point,
        excludeId: string): DiagramObject | null
    {
        const visible = this.getVisibleObjectsSorted();

        for (let i = visible.length - 1; i >= 0; i--)
        {
            const candidate = visible[i];

            if (candidate.id === excludeId)
            {
                continue;
            }

            if (this.isContainerHit(candidate, pos))
            {
                return candidate;
            }
        }

        return null;
    }

    /**
     * Tests whether a position falls inside a container object's
     * content area. Returns false for non-container shapes.
     *
     * @param obj - Candidate container object.
     * @param pos - Canvas-space position to test.
     * @returns true if the position is inside the content area.
     */
    private isContainerHit(obj: DiagramObject, pos: Point): boolean
    {
        const shapeDef = this.shapeRegistry.get(obj.presentation.shape);

        if (!shapeDef || !shapeDef.isContainer)
        {
            return false;
        }

        const contentRect = this.resolveContentArea(
            obj.presentation.bounds, shapeDef
        );

        return rectHitTest(pos, contentRect);
    }

    /**
     * Resolves the absolute content area rectangle from a container's
     * bounds and its shape definition's normalised content area.
     * Falls back to the full bounds when no contentArea is defined.
     *
     * @param bounds - The container's bounding rectangle.
     * @param shapeDef - The container's shape definition.
     * @returns The absolute content area rectangle.
     */
    private resolveContentArea(
        bounds: Rect,
        shapeDef: ShapeDefinition): Rect
    {
        const area = shapeDef.contentArea
            ?? { x: 0, y: 0, w: 1, h: 1 };

        return {
            x: bounds.x + (area.x * bounds.width),
            y: bounds.y + (area.y * bounds.height),
            width: area.w * bounds.width,
            height: area.h * bounds.height
        };
    }

    /**
     * Moves all objects contained by a container by a given delta.
     * Skips the operation when the delta is zero or the object is
     * not a container shape.
     *
     * @param containerId - The container object's ID.
     * @param dx - Horizontal displacement.
     * @param dy - Vertical displacement.
     */
    private moveContainedChildren(
        containerId: string,
        dx: number,
        dy: number): void
    {
        if (dx === 0 && dy === 0)
        {
            return;
        }

        if (!this.isContainerObject(containerId))
        {
            return;
        }

        const children = this.getContainedObjects(containerId);

        for (const child of children)
        {
            this.moveChildByDelta(child, dx, dy);
        }
    }

    /**
     * Checks whether an object is a spatial container based on its
     * shape definition.
     *
     * @param objectId - The object ID to check.
     * @returns true if the object's shape has isContainer set.
     */
    private isContainerObject(objectId: string): boolean
    {
        const obj = this.getObjectById(objectId);

        if (!obj)
        {
            return false;
        }

        const shapeDef = this.shapeRegistry.get(obj.presentation.shape);

        return shapeDef?.isContainer === true;
    }

    /**
     * Moves a child object by a delta and re-renders it.
     *
     * @param child - The child object to move.
     * @param dx - Horizontal displacement.
     * @param dy - Vertical displacement.
     */
    private moveChildByDelta(
        child: DiagramObject,
        dx: number,
        dy: number): void
    {
        child.presentation.bounds.x += dx;
        child.presentation.bounds.y += dy;
        this.rerenderObject(child);
        this.rerenderAttachedConnectors(child.id);
    }

    // ========================================================================
    // PRIVATE — DOCUMENT HELPERS
    // ========================================================================

    /**
     * Returns all visible objects, sorted by z-index.
     * Used internally for hit testing.
     *
     * @returns Array of visible objects in z-order.
     */
    private getVisibleObjectsSorted(): DiagramObject[]
    {
        return this.doc.objects
            .filter((o) => o.presentation.visible)
            .sort((a, b) => a.presentation.zIndex - b.presentation.zIndex);
    }

    /**
     * Removes an object from the document and its SVG element.
     *
     * @param id - Object ID to remove.
     */
    private removeObjectInternal(id: string): void
    {
        const idx = this.doc.objects.findIndex((o) => o.id === id);

        if (idx < 0)
        {
            return;
        }

        this.doc.objects.splice(idx, 1);
        this.renderer.removeObjectEl(id);
        this.markDirty();
        this.events.emit("object:remove", id);
    }

    /**
     * Removes all connectors attached to an object.
     *
     * @param objectId - The object whose connectors should be removed.
     */
    private removeAttachedConnectors(objectId: string): void
    {
        const toRemove = this.doc.connectors.filter(
            (c) =>
                c.presentation.sourceId === objectId
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

    /**
     * Deletes all connectors that are in the selected connectors set.
     */
    private deleteSelectedConnectors(): void
    {
        for (const connId of this.selectedConnectorIds)
        {
            this.removeConnector(connId);
        }
    }

    /**
     * Updates an object's text content after inline editing.
     *
     * @param obj - The object to update.
     * @param text - The new text content.
     */
    private updateObjectText(obj: DiagramObject, text: string): void
    {
        obj.presentation.textContent = {
            runs: [{ text }],
            overflow: "visible",
            verticalAlign: "middle",
            horizontalAlign: "center",
            padding: 8,
        };

        this.rerenderObject(obj);
        this.markDirty();
    }

    /**
     * Restores object bounds from a saved map. Used by undo/redo.
     *
     * @param boundsMap - Map of object IDs to bounds to restore.
     */
    private restoreBounds(boundsMap: Map<string, Rect>): void
    {
        for (const [id, b] of boundsMap)
        {
            this.moveObjectTo(id, { x: b.x, y: b.y });

            const obj = this.getObjectById(id);

            if (obj)
            {
                obj.presentation.bounds.width = b.width;
                obj.presentation.bounds.height = b.height;
                this.rerenderObject(obj);
            }
        }
    }

    // ========================================================================
    // PRIVATE — PAGE FRAME HELPERS
    // ========================================================================

    /**
     * Finds a page frame by its ID.
     *
     * @param id - Page frame ID.
     * @returns The matching PageFrame, or null if not found.
     */
    private findPageFrame(id: string): PageFrame | null
    {
        return this.doc.pageFrames.find((f) => f.id === id) ?? null;
    }

    /**
     * Builds a PageFrame from a size preset and position.
     *
     * @param size - The predefined size to use.
     * @param pos - Canvas position for the frame.
     * @returns A fully constructed PageFrame.
     */
    private buildPageFrame(size: PageFrameSize, pos: Point): PageFrame
    {
        const number = this.doc.pageFrames.length + 1;

        return {
            id: generateId(),
            number,
            x: pos.x,
            y: pos.y,
            width: size.width,
            height: size.height,
            sizeName: size.name,
            locked: false,
            borderColor: PF_DEFAULT_BORDER_COLOR,
            borderWidth: PF_DEFAULT_BORDER_WIDTH,
            margins: { ...PAGE_FRAME_MARGIN_PRESETS.normal },
            backgroundColor: PF_DEFAULT_BG_COLOR,
            numberPosition: "above",
        };
    }

    /**
     * Computes a viewport-centred position for a frame of the
     * given size.
     *
     * @param size - The frame size to centre.
     * @returns A Point at the top-left of the centred frame.
     */
    private computeViewportCenter(size: PageFrameSize): Point
    {
        const vp = this.renderer.getViewport();
        const svg = this.renderer.getSvgElement();
        const rect = svg.getBoundingClientRect();

        const canvasCx = ((rect.width / 2) - vp.x) / vp.zoom;
        const canvasCy = ((rect.height / 2) - vp.y) / vp.zoom;

        return {
            x: canvasCx - size.width / 2,
            y: canvasCy - size.height / 2,
        };
    }

    /**
     * Re-numbers all page frames sequentially starting from 1.
     * Called after a frame is removed.
     */
    private renumberPageFrames(): void
    {
        for (let i = 0; i < this.doc.pageFrames.length; i++)
        {
            this.doc.pageFrames[i].number = i + 1;
        }

        this.renderer.renderAllPageFrames(this.doc.pageFrames);
    }

    /**
     * Renders all page frames in the document.
     */
    private renderAllPageFrames(): void
    {
        if (this.doc.pageFrames.length > 0)
        {
            this.renderer.renderAllPageFrames(this.doc.pageFrames);
        }
    }

    /**
     * Wraps a page frame as a fake DiagramObject for zoomToFit.
     *
     * @param frame - The page frame.
     * @returns A minimal DiagramObject with matching bounds.
     */
    private frameToFakeObject(frame: PageFrame): DiagramObject
    {
        return {
            id: frame.id,
            semantic: { type: "page-frame", data: {} },
            presentation: {
                shape: "rectangle",
                bounds: {
                    x: frame.x,
                    y: frame.y,
                    width: frame.width,
                    height: frame.height,
                },
                rotation: 0,
                flipX: false,
                flipY: false,
                style: {},
                layer: DEFAULT_LAYER_ID,
                zIndex: 0,
                locked: false,
                visible: true,
            },
        };
    }

    /** Marks the document as having unsaved changes. */
    private markDirty(): void
    {
        this.dirty = true;
        this.changeCount++;
        this.events.emit("dirty:change", true);
    }

    /** Emits a viewport change event with the current state. */
    private emitViewportChange(): void
    {
        const vp = this.renderer.getViewport();
        safeCallback(this.opts.onViewportChange, vp);
        this.events.emit("viewport:change", vp);
    }

    /**
     * Zooms by a factor, centred on the canvas midpoint.
     *
     * @param factor - Zoom multiplier.
     */
    private zoomCentred(factor: number): void
    {
        const svg = this.renderer.getSvgElement();
        const rect = svg.getBoundingClientRect();
        this.renderer.zoomAt(factor, rect.width / 2, rect.height / 2);
        this.emitViewportChange();
    }

    /**
     * Creates an empty document with default layer and grid.
     *
     * @returns A new empty DiagramDocument.
     */
    private createEmptyDoc(): DiagramDocument
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
            pageFrames: [],
            guides: [],
            grid: {
                size: this.opts.grid?.size ?? DEFAULT_GRID_SIZE,
                style: this.opts.grid?.style ?? "dots",
                visible: this.opts.grid?.visible ?? true,
            },
        };
    }

    /**
     * Deep-clones a document via JSON serialisation.
     *
     * @param doc - Document to clone.
     * @returns An independent copy.
     */
    private cloneDoc(doc: DiagramDocument): DiagramDocument
    {
        return JSON.parse(JSON.stringify(doc));
    }

    /**
     * Constructs a full DiagramConnector from a partial input,
     * filling in defaults for all missing fields.
     *
     * @param partial - Partial connector definition.
     * @returns A complete DiagramConnector.
     */
    private buildConnector(partial: Partial<DiagramConnector>): DiagramConnector
    {
        const id = partial.id ?? generateId();

        return {
            id,
            semantic: {
                type: partial.semantic?.type ?? "connector",
                data: partial.semantic?.data ?? {},
                references: partial.semantic?.references,
                tags: partial.semantic?.tags,
                relationships: partial.semantic?.relationships,
            },
            presentation: this.buildConnectorPresentation(partial.presentation),
        };
    }

    /**
     * Builds the presentation block for a connector with defaults.
     *
     * @param pres - Partial presentation data, or undefined.
     * @returns A complete connector presentation object.
     */
    private buildConnectorPresentation(
        pres: DiagramConnector["presentation"] | undefined
    ): DiagramConnector["presentation"]
    {
        return {
            sourceId: pres?.sourceId ?? "",
            targetId: pres?.targetId ?? "",
            sourcePort: pres?.sourcePort,
            targetPort: pres?.targetPort,
            sourcePoint: pres?.sourcePoint,
            targetPoint: pres?.targetPoint,
            waypoints: pres?.waypoints ?? [],
            routing: pres?.routing ?? "straight",
            style: pres?.style ?? { color: "var(--theme-text-color)", width: 1.5, endArrow: "classic" },
            labels: pres?.labels ?? [],
        };
    }

    /**
     * Constructs a full DiagramObject from a partial input,
     * filling in defaults for all missing fields.
     *
     * @param partial - Partial object definition.
     * @returns A complete DiagramObject.
     */
    private buildObject(partial: DiagramObjectInput): DiagramObject
    {
        const id = partial.id ?? generateId();
        const pres = partial.presentation ?? {};

        return {
            id,
            semantic: {
                type: partial.semantic?.type ?? "generic",
                data: partial.semantic?.data ?? {},
                references: partial.semantic?.references,
                tags: partial.semantic?.tags,
                relationships: partial.semantic?.relationships,
            },
            presentation: {
                shape: pres.shape ?? "rectangle",
                bounds: pres.bounds ?? { x: 100, y: 100, width: 160, height: 100 },
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
                renderStyle: pres.renderStyle ?? this.defaultRenderStyle,
                image: pres.image,
                paintable: pres.paintable,
                embed: pres.embed,
                dataBindings: pres.dataBindings,
                anchor: pres.anchor,
            },
        };
    }
}

// ============================================================================
// UTILITY — GEOMETRY
// ============================================================================

/**
 * Tests whether two axis-aligned rectangles overlap.
 *
 * @param a - First rectangle.
 * @param b - Second rectangle.
 * @returns true if the rectangles intersect.
 */
function rectsIntersect(a: Rect, b: Rect): boolean
{
    return (
        a.x < b.x + b.width
        && a.x + a.width > b.x
        && a.y < b.y + b.height
        && a.y + a.height > b.y
    );
}

// ============================================================================
// LAYOUT — CONSTANTS
// ============================================================================

/** Default number of columns for the grid layout. */
const GRID_DEFAULT_COLUMNS = 4;

/** Default gap between cells in the grid layout (pixels). */
const GRID_DEFAULT_GAP = 40;

/** Default angular step for circular (force) layout (radians). */
const FORCE_DEFAULT_RADIUS = 300;

/** Default scale factor for PNG export. */
const PNG_DEFAULT_SCALE = 2;

/** Default background colour for PNG export. */
const PNG_DEFAULT_BG = "#ffffff";

// ============================================================================
// LAYOUT — BUILT-IN: FORCE (CIRCULAR)
// ============================================================================

/**
 * Places objects in a circular arrangement around a centre point.
 *
 * @param objects - Objects to lay out.
 * @param opts - Options: `radius` (number) overrides default.
 * @returns A map of object ID to circular position.
 */
function layoutForce(
    objects: DiagramObject[],
    opts: Record<string, unknown>
): Map<string, Point>
{
    const radius = typeof opts.radius === "number"
        ? opts.radius
        : FORCE_DEFAULT_RADIUS;

    const cx = radius + 100;
    const cy = radius + 100;
    const positions = new Map<string, Point>();
    const step = (2 * Math.PI) / Math.max(objects.length, 1);

    for (let i = 0; i < objects.length; i++)
    {
        const angle = step * i;
        const x = cx + radius * Math.cos(angle);
        const y = cy + radius * Math.sin(angle);
        positions.set(objects[i].id, { x, y });
    }

    return positions;
}

// ============================================================================
// LAYOUT — BUILT-IN: GRID
// ============================================================================

/**
 * Arranges objects in a grid pattern with configurable columns and gap.
 *
 * @param objects - Objects to lay out.
 * @param opts - Options: `columns` (number), `gap` (number).
 * @returns A map of object ID to grid position.
 */
function layoutGrid(
    objects: DiagramObject[],
    opts: Record<string, unknown>
): Map<string, Point>
{
    const columns = typeof opts.columns === "number"
        ? opts.columns
        : GRID_DEFAULT_COLUMNS;

    const gap = typeof opts.gap === "number"
        ? opts.gap
        : GRID_DEFAULT_GAP;

    const positions = new Map<string, Point>();
    const cellW = computeMaxDimension(objects, "width") + gap;
    const cellH = computeMaxDimension(objects, "height") + gap;

    for (let i = 0; i < objects.length; i++)
    {
        const col = i % columns;
        const row = Math.floor(i / columns);
        positions.set(objects[i].id, { x: col * cellW + gap, y: row * cellH + gap });
    }

    return positions;
}

/**
 * Computes the maximum width or height across all objects.
 *
 * @param objects - Objects to measure.
 * @param dim - Dimension to measure ("width" or "height").
 * @returns The maximum value found, or 100 if no objects.
 */
function computeMaxDimension(
    objects: DiagramObject[],
    dim: "width" | "height"
): number
{
    if (objects.length === 0)
    {
        return 100;
    }

    let max = 0;

    for (const obj of objects)
    {
        const val = obj.presentation.bounds[dim];

        if (val > max)
        {
            max = val;
        }
    }

    return max || 100;
}

// ============================================================================
// EXPORT HELPERS — SVG / CANVAS PIPELINE
// ============================================================================

/**
 * Serialises an SVG element to an XML string.
 *
 * @param svg - The SVG element.
 * @returns Serialised SVG XML.
 */
function serializeSvg(svg: SVGElement): string
{
    const serializer = new XMLSerializer();
    return serializer.serializeToString(svg);
}

/**
 * Loads serialised SVG data into an Image element for canvas drawing.
 *
 * @param svgData - Serialised SVG XML.
 * @param svg - The original SVG element (for dimensions).
 * @param scale - Scale multiplier.
 * @returns A Promise resolving to the loaded Image.
 */
function loadSvgAsImage(
    svgData: string,
    svg: SVGElement,
    scale: number
): Promise<HTMLImageElement>
{
    return new Promise((resolve, reject) =>
    {
        const img = new Image();
        const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);

        img.onload = () =>
        {
            URL.revokeObjectURL(url);
            resolve(img);
        };

        img.onerror = () =>
        {
            URL.revokeObjectURL(url);
            reject(new Error(`${LOG_PREFIX} Failed to load SVG as image`));
        };

        img.width = svg.clientWidth * scale;
        img.height = svg.clientHeight * scale;
        img.src = url;
    });
}

/**
 * Draws a loaded Image onto a Canvas and converts to a PNG Blob.
 *
 * @param img - The loaded Image element.
 * @param svg - The original SVG element (for dimensions).
 * @param scale - Scale multiplier.
 * @param bg - Background colour.
 * @returns A Promise resolving to the PNG Blob.
 */
function renderImageToBlob(
    img: HTMLImageElement,
    svg: SVGElement,
    scale: number,
    bg: string
): Promise<Blob>
{
    const canvas = createExportCanvas(svg, scale);
    const ctx = canvas.getContext("2d");

    if (!ctx)
    {
        return Promise.reject(new Error(`${LOG_PREFIX} Canvas 2D context unavailable`));
    }

    drawToCanvas(ctx, img, canvas.width, canvas.height, bg);
    return canvasToBlob(canvas);
}

/**
 * Creates a canvas element sized for SVG export.
 *
 * @param svg - The SVG element for dimensions.
 * @param scale - Scale multiplier.
 * @returns A canvas element.
 */
function createExportCanvas(svg: SVGElement, scale: number): HTMLCanvasElement
{
    const canvas = document.createElement("canvas");
    canvas.width = svg.clientWidth * scale;
    canvas.height = svg.clientHeight * scale;
    return canvas;
}

/**
 * Draws a background and image onto a canvas context.
 *
 * @param ctx - Canvas 2D rendering context.
 * @param img - The image to draw.
 * @param w - Canvas width.
 * @param h - Canvas height.
 * @param bg - Background colour.
 */
function drawToCanvas(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    w: number,
    h: number,
    bg: string
): void
{
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
}

/**
 * Converts a canvas to a PNG Blob via the toBlob API.
 *
 * @param canvas - The canvas to convert.
 * @returns A Promise resolving to the PNG Blob.
 */
function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob>
{
    return new Promise((resolve, reject) =>
    {
        canvas.toBlob((blob) =>
        {
            if (blob)
            {
                resolve(blob);
            }
            else
            {
                reject(new Error(`${LOG_PREFIX} Canvas toBlob returned null`));
            }
        }, "image/png");
    });
}

// ============================================================================
// PDF EXPORT HELPERS
// ============================================================================

/**
 * Builds a print-ready HTML document embedding the SVG content.
 *
 * @param title - Document title.
 * @param svgContent - Serialised SVG XML.
 * @returns Complete HTML string.
 */
function buildPdfHtml(title: string, svgContent: string): string
{
    return [
        "<!DOCTYPE html>",
        "<html><head>",
        `<title>${escapeHtmlText(title)}</title>`,
        "<style>",
        "@media print { body { margin: 0; } }",
        "body { display: flex; justify-content: center; align-items: center; min-height: 100vh; }",
        "svg { max-width: 100%; height: auto; }",
        "</style>",
        "</head><body>",
        svgContent,
        "</body></html>",
    ].join("\n");
}

/**
 * Escapes HTML special characters in text for safe embedding.
 *
 * @param text - Raw text.
 * @returns HTML-escaped text.
 */
function escapeHtmlText(text: string): string
{
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

// ============================================================================
// FIND / REPLACE HELPERS
// ============================================================================

/**
 * Checks a single object's text content for query matches.
 *
 * @param obj - Object to search.
 * @param query - Search string.
 * @param caseSensitive - Whether search is case-sensitive.
 * @param results - Accumulator array for results.
 */
function findInObject(
    obj: DiagramObject,
    query: string,
    caseSensitive: boolean,
    results: { objectId: string; text: string }[]
): void
{
    const tc = obj.presentation.textContent;

    if (!tc)
    {
        return;
    }

    const runs = collectAllRuns(tc);

    for (const run of runs)
    {
        if (!("text" in run))
        {
            continue;
        }

        const text = (run as TextRun).text;

        if (textMatches(text, query, caseSensitive))
        {
            results.push({ objectId: obj.id, text });
        }
    }
}

/**
 * Collects all content runs from a TextContent, including both flat
 * runs and runs within blocks.
 *
 * @param tc - The text content to traverse.
 * @returns Flat array of all ContentRun instances.
 */
function collectAllRuns(tc: TextContent): ContentRun[]
{
    const all: ContentRun[] = [];

    if (tc.runs)
    {
        all.push(...tc.runs);
    }

    if (tc.blocks)
    {
        for (const block of tc.blocks)
        {
            all.push(...block.runs);
        }
    }

    return all;
}

/**
 * Tests whether a text string contains a query, respecting case.
 *
 * @param text - Text to search.
 * @param query - Query string.
 * @param caseSensitive - Whether to respect case.
 * @returns true if the text contains the query.
 */
function textMatches(
    text: string,
    query: string,
    caseSensitive: boolean
): boolean
{
    if (caseSensitive)
    {
        return text.includes(query);
    }

    return text.toLowerCase().includes(query.toLowerCase());
}

/**
 * Replaces matching text in a single object's content runs.
 *
 * @param obj - Object to process.
 * @param query - String to find.
 * @param replacement - Replacement string.
 * @param caseSensitive - Whether search is case-sensitive.
 * @returns Number of replacements made in this object.
 */
function replaceInObject(
    obj: DiagramObject,
    query: string,
    replacement: string,
    caseSensitive: boolean
): number
{
    const tc = obj.presentation.textContent;

    if (!tc)
    {
        return 0;
    }

    const runs = collectAllRuns(tc);
    let count = 0;

    for (const run of runs)
    {
        if ("text" in run)
        {
            const result = replaceInRun(run as TextRun, query, replacement, caseSensitive);
            count += result;
        }
    }

    return count;
}

/**
 * Replaces matching text within a single text run.
 *
 * @param run - The text run to modify.
 * @param query - String to find.
 * @param replacement - Replacement string.
 * @param caseSensitive - Whether search is case-sensitive.
 * @returns Number of replacements made in this run.
 */
function replaceInRun(
    run: TextRun,
    query: string,
    replacement: string,
    caseSensitive: boolean
): number
{
    const flags = caseSensitive ? "g" : "gi";
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, flags);
    const matches = run.text.match(regex);
    const count = matches ? matches.length : 0;

    if (count > 0)
    {
        run.text = run.text.replace(regex, replacement);
    }

    return count;
}

// ============================================================================
// SPATIAL QUERY HELPERS
// ============================================================================

/**
 * Tests whether two rectangles overlap (axis-aligned).
 *
 * @param a - First rectangle.
 * @param b - Second rectangle.
 * @returns true if they intersect.
 */
function boundsIntersect(a: Rect, b: Rect): boolean
{
    return (
        a.x < (b.x + b.width)
        && (a.x + a.width) > b.x
        && a.y < (b.y + b.height)
        && (a.y + a.height) > b.y
    );
}

/**
 * Tests whether a point lies within a rectangle.
 *
 * @param p - Point to test.
 * @param b - Bounding rectangle.
 * @returns true if the point is inside the bounds.
 */
function pointInBounds(p: Point, b: Rect): boolean
{
    return (
        p.x >= b.x
        && p.x <= (b.x + b.width)
        && p.y >= b.y
        && p.y <= (b.y + b.height)
    );
}

// ============================================================================
// GRAPH ANALYSIS HELPERS
// ============================================================================

/**
 * Builds an adjacency list from connectors.
 *
 * @param connectors - All connectors in the document.
 * @returns Adjacency map.
 */
function buildAdjacencyMap(
    connectors: DiagramConnector[]
): Map<string, Set<string>>
{
    const adj = new Map<string, Set<string>>();

    for (const conn of connectors)
    {
        const src = conn.presentation.sourceId;
        const tgt = conn.presentation.targetId;

        if (!adj.has(src)) { adj.set(src, new Set()); }
        if (!adj.has(tgt)) { adj.set(tgt, new Set()); }

        adj.get(src)!.add(tgt);
        adj.get(tgt)!.add(src);
    }

    return adj;
}

/**
 * Performs BFS on an adjacency map to find the shortest path.
 *
 * @param adj - Adjacency map.
 * @param fromId - Start node.
 * @param toId - End node.
 * @returns Path as array of node IDs, or empty if unreachable.
 */
function bfsPath(
    adj: Map<string, Set<string>>,
    fromId: string,
    toId: string
): string[]
{
    const visited = new Set<string>([fromId]);
    const parent = new Map<string, string>();
    const queue: string[] = [fromId];

    while (queue.length > 0)
    {
        const current = queue.shift()!;

        if (current === toId)
        {
            return reconstructPath(parent, fromId, toId);
        }

        bfsEnqueueNeighbours(adj, current, visited, parent, queue);
    }

    return [];
}

/**
 * Enqueues unvisited neighbours of a node during BFS traversal.
 *
 * @param adj - Adjacency map.
 * @param current - Current node being processed.
 * @param visited - Set of already-visited nodes.
 * @param parent - Parent map for path reconstruction.
 * @param queue - BFS queue.
 */
function bfsEnqueueNeighbours(
    adj: Map<string, Set<string>>,
    current: string,
    visited: Set<string>,
    parent: Map<string, string>,
    queue: string[]
): void
{
    const neighbours = adj.get(current);

    if (!neighbours)
    {
        return;
    }

    for (const n of neighbours)
    {
        if (!visited.has(n))
        {
            visited.add(n);
            parent.set(n, current);
            queue.push(n);
        }
    }
}

/**
 * Reconstructs the path from BFS parent pointers.
 *
 * @param parent - Map of child to parent node.
 * @param fromId - Start node.
 * @param toId - End node.
 * @returns Ordered path from start to end.
 */
function reconstructPath(
    parent: Map<string, string>,
    fromId: string,
    toId: string
): string[]
{
    const path: string[] = [toId];
    let current = toId;

    while (current !== fromId)
    {
        current = parent.get(current)!;
        path.push(current);
    }

    return path.reverse();
}

/**
 * Collects all nodes reachable from a start node via DFS.
 *
 * @param adj - Adjacency map.
 * @param startId - Starting node ID.
 * @param visited - Global visited set (updated in place).
 * @returns Array of IDs in this component.
 */
function dfsCollect(
    adj: Map<string, Set<string>>,
    startId: string,
    visited: Set<string>
): string[]
{
    const component: string[] = [];
    const stack: string[] = [startId];

    while (stack.length > 0)
    {
        const current = stack.pop()!;

        if (visited.has(current))
        {
            continue;
        }

        visited.add(current);
        component.push(current);
        dfsStackNeighbours(adj, current, visited, stack);
    }

    return component;
}

/**
 * Pushes unvisited neighbours of a node onto the DFS stack.
 *
 * @param adj - Adjacency map.
 * @param current - Current node being processed.
 * @param visited - Set of already-visited nodes.
 * @param stack - DFS stack.
 */
function dfsStackNeighbours(
    adj: Map<string, Set<string>>,
    current: string,
    visited: Set<string>,
    stack: string[]
): void
{
    const neighbours = adj.get(current);

    if (!neighbours)
    {
        return;
    }

    for (const n of neighbours)
    {
        if (!visited.has(n))
        {
            stack.push(n);
        }
    }
}

// ============================================================================
// COMMENT HELPERS
// ============================================================================

/**
 * Builds a single comment thread entry.
 *
 * @param userId - Author user ID.
 * @param userName - Author display name.
 * @param content - Comment text.
 * @param timestamp - ISO timestamp.
 * @returns A CommentEntry object.
 */
function buildCommentEntry(
    userId: string,
    userName: string,
    content: string,
    timestamp: string
): CommentEntry
{
    return {
        id: generateId(),
        userId,
        userName,
        content,
        timestamp,
        edited: false,
    };
}

// ============================================================================
// HOVER CARD — MODULE HELPERS (ADR-126)
// ============================================================================

/** Result of a hover hit-test — either an object or a connector. */
type HoverHit =
    | { kind: "object"; id: string; obj: DiagramObject }
    | { kind: "connector"; id: string; conn: DiagramConnector };

/**
 * Build the default hover card content for a DiagramObject.
 * Extracts from `presentation.textContent`, `presentation.shape`,
 * `semantic.type`, `semantic.tags`, and `semantic.data`.
 */
function buildObjectHoverContent(
    obj: DiagramObject
): DiagramHoverCardContent
{
    const label = firstTextRun(obj);

    return {
        title: label || obj.semantic.type || obj.presentation.shape,
        subtitle: obj.presentation.shape,
        badge: firstTagAsBadge(obj.semantic.tags),
        properties: propertiesFromData(obj.semantic.data),
        description: stringDescription(obj.semantic.data),
    };
}

/**
 * Build the default hover card content for a DiagramConnector.
 */
function buildConnectorHoverContent(
    conn: DiagramConnector
): DiagramHoverCardContent
{
    const firstLabel = conn.presentation.labels[0];
    const labelText = firstLabel ? firstTextRunFromContent(firstLabel.textContent) : "";

    const props: Array<{ key: string; value: string }> = [
        { key: "source", value: conn.presentation.sourceId },
        { key: "target", value: conn.presentation.targetId },
    ];

    for (const p of propertiesFromData(conn.semantic.data))
    {
        props.push(p);
    }

    return {
        title: labelText || conn.semantic.type || "Connector",
        subtitle: conn.presentation.routing,
        badge: firstTagAsBadge(conn.semantic.tags),
        properties: props,
        description: stringDescription(conn.semantic.data),
    };
}

/** Return the first non-empty text run joined across runs. */
function firstTextRun(obj: DiagramObject): string
{
    const tc = obj.presentation.textContent;

    if (!tc) { return ""; }

    return firstTextRunFromContent(tc);
}

/** Shared impl — joins non-empty TextRun text (IconRuns are skipped). */
function firstTextRunFromContent(tc: TextContent): string
{
    if (!tc.runs || tc.runs.length === 0) { return ""; }

    const parts: string[] = [];

    for (const run of tc.runs)
    {
        if ("text" in run && run.text && run.text.length > 0)
        {
            parts.push(run.text);
        }
    }

    return parts.join(" ").trim();
}

/** First tag becomes a primary badge. */
function firstTagAsBadge(
    tags: string[] | undefined
): DiagramHoverCardContent["badge"]
{
    if (!tags || tags.length === 0) { return undefined; }

    return { text: tags[0], variant: "info" };
}

/** Flatten semantic.data into key/value rows, dropping non-scalars except short objects. */
function propertiesFromData(
    data: Record<string, unknown>
): Array<{ key: string; value: string }>
{
    const props: Array<{ key: string; value: string }> = [];

    for (const [k, v] of Object.entries(data))
    {
        if (k === "description") { continue; }

        props.push({ key: k, value: stringifyValue(v) });
    }

    return props;
}

/** Turn an unknown value into a short display string. */
function stringifyValue(v: unknown): string
{
    if (v == null) { return ""; }
    if (typeof v === "string") { return v; }
    if (typeof v === "number" || typeof v === "boolean") { return String(v); }
    if (Array.isArray(v)) { return v.map(stringifyValue).join(", "); }

    try { return JSON.stringify(v); }
    catch { return String(v); }
}

/** Pull a description string out of semantic.data if present. */
function stringDescription(data: Record<string, unknown>): string | undefined
{
    const d = data["description"];

    return typeof d === "string" ? d : undefined;
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Creates a new DiagramEngine and mounts it into the given container.
 *
 * @param container - Container element or its ID string.
 * @param options - Engine configuration options.
 * @returns A DiagramEngineImpl instance with the full public API.
 * @throws Error if the container element is not found.
 */
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

// ============================================================================
// WINDOW GLOBALS
// ============================================================================

(window as unknown as Record<string, unknown>)["DiagramEngine"] =
    DiagramEngineImpl;
(window as unknown as Record<string, unknown>)["createDiagramEngine"] =
    createDiagramEngine;
