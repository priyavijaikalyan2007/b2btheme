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
export interface Rect
{
    x: number;
    y: number;
    width: number;
    height: number;
}

/** 2D point in canvas coordinate space. */
export interface Point
{
    x: number;
    y: number;
}

// ============================================================================
// STYLES — FILLS
// ============================================================================

/** Linear or radial gradient definition for fills and strokes. */
export interface GradientDefinition
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
export interface PatternDefinition
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
export interface FillStyle
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
export interface StrokeStyle
{
    color: string | GradientDefinition;
    width: number;
    dashPattern?: number[];
    lineCap?: "butt" | "round" | "square";
    lineJoin?: "miter" | "round" | "bevel";
}

/** Individual edge stroke for per-edge control on rectangular shapes. */
export interface EdgeStroke
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
export interface PerEdgeStroke
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

// ============================================================================
// STYLES — COMPOSITE
// ============================================================================

/** Complete visual style for a diagram object. */
export interface ObjectStyle
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
export interface TextRun
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
export interface IconRun
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
export type ContentRun = TextRun | IconRun;

/**
 * Block-level text element for structured content such as
 * paragraphs, headings, and lists.
 */
export interface TextBlock
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
export interface TextContent
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
}

// ============================================================================
// SEMANTIC DATA
// ============================================================================

/** Reference to an external resource linked from a diagram entity. */
export interface ResourceReference
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
export interface SemanticData
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
export interface ImageStyle
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
}

// ============================================================================
// DATA BINDING
// ============================================================================

/** Binding from an object property to a template expression. */
export interface DataBinding
{
    property: string;
    expression: string;
}

/** Constraint that pins an object to a canvas edge (for title blocks). */
export interface AnchorConstraint
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
export interface DiagramObject
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
export type ArrowType =
    | "none" | "block" | "classic" | "open"
    | "diamond" | "oval" | "dash" | "cross"
    | "er-one" | "er-many" | "er-one-or-many"
    | "er-zero-or-one" | "er-zero-or-many" | "er-mandatory-one";

/** Connector routing algorithm. */
export type RoutingStyle =
    | "straight" | "orthogonal" | "curved"
    | "segment" | "manhattan" | "elbow" | "entity";

/** Connector-specific stroke style with arrow markers. */
export interface ConnectorStyle extends StrokeStyle
{
    startArrow?: ArrowType;
    endArrow?: ArrowType;
    shadow?: ShadowStyle;
}

/** A positioned label on a connector. */
export interface ConnectorLabel
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
export interface PageFrameSize
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
export interface PageFrameMargins
{
    top: number;
    right: number;
    bottom: number;
    left: number;
}

/** A page frame — a non-exportable guide overlay on the canvas. */
export interface PageFrame
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

/** A persistent guide line on the canvas, dragged from a ruler. */
export interface RulerGuide
{
    id: string;
    orientation: "horizontal" | "vertical";
    position: number;
}

/** A comment anchored to an entity or canvas position. */
export interface DiagramComment
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
export interface CommentEntry
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
export interface DiagramDocument
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
export interface ConnectionPort
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
export interface TextRegion
{
    id: string;
    bounds: Rect;
}

/** Context passed to a shape's render function. */
export interface ShapeRenderContext
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
export interface ResizeHandle
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
export interface ShapeDefinition
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
}

// ============================================================================
// ENGINE CONFIGURATION
// ============================================================================

/** Current viewport state (pan offset and zoom level). */
export interface ViewportState
{
    x: number;
    y: number;
    zoom: number;
}

/** Snapping and guide configuration. */
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

/** Alignment operations for multi-select alignment. */
export type AlignmentType =
    | "left" | "center" | "right"
    | "top" | "middle" | "bottom";

/**
 * Deep-partial input type for addObject().
 * Allows callers to provide only the fields they care about;
 * the engine fills in sensible defaults for everything else.
 */
export interface DiagramObjectInput
{
    id?: string;
    semantic?: Partial<SemanticData>;
    presentation?: Partial<DiagramObject["presentation"]>;
}

/** A structured mutation for collaboration broadcasting. */
export interface Operation
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
export type LayoutFunction = (
    objects: DiagramObject[],
    connectors: DiagramConnector[],
    options: Record<string, unknown>
) => Map<string, Point> | Promise<Map<string, Point>>;

/**
 * Configuration options for createDiagramEngine().
 * All options are optional — sensible defaults are applied.
 */
export interface DiagramEngineOptions
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
