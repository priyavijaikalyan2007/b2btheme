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
const MAX_ZOOM = 4.0;
const ZOOM_STEP = 0.15;
const HANDLE_SIZE = 8;
const HANDLE_HIT_MARGIN = 4;
const DEFAULT_GRID_SIZE = 20;
const DEFAULT_LAYER_ID = "default";
const DEFAULT_LAYER_NAME = "Default";
const ROTATION_HANDLE_OFFSET = 25;
const NUDGE_PX = 1;
const NUDGE_SHIFT_PX = 10;


// ========================================================================
// SOURCE: types.ts
// ========================================================================

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
    color?: string;
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
interface Comment
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
    comments: Comment[];

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
            console.error(
                `${LOG_PREFIX} Handler for "${event}" threw an error:`,
                error
            );
        }
    }
}

// ========================================================================
// SOURCE: undo-stack.ts
// ========================================================================

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
            console.error(
                `${LOG_PREFIX} Undo failed for "${cmd.label}":`,
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
            console.error(
                `${LOG_PREFIX} Redo failed for "${cmd.label}":`,
                error
            );
        }
    }
}

// ========================================================================
// SOURCE: shape-registry.ts
// ========================================================================

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
        const stopEl = svgCreate("stop", {
            offset: String(stop.offset),
            "stop-color": stop.color
        });

        gradEl.appendChild(stopEl);
    }
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
        {
            id: "port-n",
            position: { x: 0.5, y: 0 },
            direction: "north",
            maxConnections: 0
        },
        {
            id: "port-s",
            position: { x: 0.5, y: 1 },
            direction: "south",
            maxConnections: 0
        },
        {
            id: "port-e",
            position: { x: 1, y: 0.5 },
            direction: "east",
            maxConnections: 0
        },
        {
            id: "port-w",
            position: { x: 0, y: 0.5 },
            direction: "west",
            maxConnections: 0
        }
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
            console.error(LOG_PREFIX, "Cannot register shape without a type");
            return;
        }

        console.debug(LOG_PREFIX, "Registered shape:", shape.type);
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

    applyFillToSvg(rect, ctx.style.fill);
    applyStrokeToSvg(rect, ctx.style.stroke);

    g.appendChild(rect);

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

    applyFillToSvg(ellipse, ctx.style.fill);
    applyStrokeToSvg(ellipse, ctx.style.stroke);

    g.appendChild(ellipse);

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

    applyFillToSvg(path, ctx.style.fill);
    applyStrokeToSvg(path, ctx.style.stroke);

    g.appendChild(path);

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

    applyFillToSvg(path, ctx.style.fill);
    applyStrokeToSvg(path, ctx.style.stroke);

    g.appendChild(path);

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

    console.log(BASIC_LOG_PREFIX, "Registered 5 basic shapes");
}

// ========================================================================
// SOURCE: shapes-extended.ts
// ========================================================================

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

    applyFillToSvg(path, ctx.style.fill);
    applyStrokeToSvg(path, ctx.style.stroke);

    g.appendChild(path);

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

    applyFillToSvg(path, ctx.style.fill);
    applyStrokeToSvg(path, ctx.style.stroke);

    g.appendChild(path);

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

    applyFillToSvg(path, ctx.style.fill);
    applyStrokeToSvg(path, ctx.style.stroke);

    g.appendChild(path);

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

    applyFillToSvg(path, ctx.style.fill);
    applyStrokeToSvg(path, ctx.style.stroke);

    g.appendChild(path);

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

    applyFillToSvg(path, ctx.style.fill);
    applyStrokeToSvg(path, ctx.style.stroke);

    g.appendChild(path);

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

    applyFillToSvg(path, ctx.style.fill);
    applyStrokeToSvg(path, ctx.style.stroke);

    g.appendChild(path);

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

    applyFillToSvg(path, ctx.style.fill);
    applyStrokeToSvg(path, ctx.style.stroke);

    g.appendChild(path);

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

    applyFillToSvg(path, ctx.style.fill);
    applyStrokeToSvg(path, ctx.style.stroke);

    g.appendChild(path);

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

    applyFillToSvg(path, ctx.style.fill);
    applyStrokeToSvg(path, ctx.style.stroke);

    g.appendChild(path);

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
// REGISTRATION
// ============================================================================

/**
 * Registers all eleven extended shapes (hexagon, star, cross,
 * parallelogram, arrow-right, chevron, callout, donut, image,
 * icon, path) with the given shape registry.
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

    console.log(EXTENDED_LOG_PREFIX, "Registered 11 extended shapes");
}

// ========================================================================
// SOURCE: connectors.ts
// ========================================================================

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
const DEFAULT_CONNECTOR_COLOR = "var(--theme-text-color)";

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

    console.debug(CONNECTOR_LOG_PREFIX, "Created arrow marker:", markerId);

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
 * object by ID, finds the specified port (or uses the object centre),
 * and converts the normalised port position to absolute coordinates.
 *
 * @param objId - The object ID the endpoint attaches to.
 * @param portId - Optional port ID within the object's shape.
 * @param fallbackPoint - Optional fallback point for freestanding endpoints.
 * @param objects - All objects in the document for lookup.
 * @returns The resolved point, or null if the object cannot be found.
 */
function resolveEndpoint(
    objId: string,
    portId: string | undefined,
    fallbackPoint: Point | undefined,
    objects: DiagramObject[]): Point | null
{
    const obj = objects.find((o) => o.id === objId);

    if (!obj)
    {
        return fallbackPoint ?? null;
    }

    if (!portId)
    {
        return computeObjectCenter(obj);
    }

    return resolvePortPosition(obj, portId);
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
        "port-n": { x: 0.5, y: 0 },
        "port-s": { x: 0.5, y: 1 },
        "port-e": { x: 1, y: 0.5 },
        "port-w": { x: 0, y: 0.5 }
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
 * @param conn - The connector to compute a path for.
 * @param objects - All objects in the document for endpoint resolution.
 * @returns The SVG path d attribute string, or empty string on failure.
 */
function computeConnectorPath(
    conn: DiagramConnector,
    objects: DiagramObject[]): string
{
    const pres = conn.presentation;
    const src = resolveEndpoint(pres.sourceId, pres.sourcePort, pres.sourcePoint, objects);
    const tgt = resolveEndpoint(pres.targetId, pres.targetPort, pres.targetPoint, objects);

    if (!src || !tgt)
    {
        console.warn(CONNECTOR_LOG_PREFIX, "Cannot resolve endpoints for:", conn.id);
        return "";
    }

    return routePath(pres.routing, src, tgt, pres, objects);
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

    applyConnectorStroke(path, style);
    applyArrowMarkers(path, style, defsEl);

    return path;
}

/**
 * Applies stroke styling (colour, width, dash pattern) to a
 * connector path element.
 *
 * @param path - The SVG path element.
 * @param style - The connector style settings.
 */
function applyConnectorStroke(path: SVGElement, style: ConnectorStyle): void
{
    const color = typeof style.color === "string"
        ? style.color
        : DEFAULT_CONNECTOR_COLOR;

    path.setAttribute("stroke", color);
    path.setAttribute("stroke-width", String(style.width ?? DEFAULT_CONNECTOR_WIDTH));

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
    const pres = conn.presentation;
    const src = resolveEndpoint(pres.sourceId, pres.sourcePort, pres.sourcePoint, objects);
    const tgt = resolveEndpoint(pres.targetId, pres.targetPort, pres.targetPoint, objects);

    if (!src || !tgt)
    {
        return null;
    }

    return { src, tgt };
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

        this.connectorsLayer = this.createNamedGroup("connectors");
        this.overlayLayer = this.createNamedGroup("overlay");
        this.toolOverlayLayer = this.createNamedGroup("tool-overlay");

        this.viewport.appendChild(this.connectorsLayer);
        this.viewport.appendChild(this.overlayLayer);
        this.viewport.appendChild(this.toolOverlayLayer);

        container.appendChild(this.svg);

        console.log(`${LOG_PREFIX} RenderEngine initialised`);
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

        console.debug(`${LOG_PREFIX} Layer created: ${layerId} (order ${order})`);

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
            console.warn(`${LOG_PREFIX} Layer not found for removal: ${layerId}`);
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

        if (pres.textContent)
        {
            const textEl = this.createForeignObject(pres);

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
        const screenTopLeft = this.canvasToScreen(bounds.x, bounds.y);
        const scaledW = bounds.width * this.vp.zoom;
        const scaledH = bounds.height * this.vp.zoom;

        const overlay = this.createEditOverlay(screenTopLeft, scaledW, scaledH);

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

        console.debug(`${LOG_PREFIX} Inline edit started for: ${obj.id}`);
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

        console.debug(`${LOG_PREFIX} Inline edit ended`);

        return text;
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

        this.svg.remove();

        console.log(`${LOG_PREFIX} RenderEngine destroyed`);
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

        const ctx: ShapeRenderContext = {
            bounds: { x: 0, y: 0, width: b.width, height: b.height },
            style: pres.style,
            parameters: pres.parameters ?? {},
            renderStyle: pres.renderStyle ?? "clean",
            selected: false
        };

        return shapeDef.render(ctx);
    }

    // ========================================================================
    // PRIVATE — TEXT RENDERING (foreignObject)
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
            parts.push(`color: ${run.color}`);
        }

        if (run.backgroundColor)
        {
            parts.push(`background-color: ${run.backgroundColor}`);
        }

        this.appendScriptAndSpacingStyles(parts, run);
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
}

// ========================================================================
// SOURCE: tool-select.ts
// ========================================================================

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

        console.debug(DRAW_LOG_PREFIX, "Shape type set to:", type);
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
            console.warn(DRAW_LOG_PREFIX, "Unknown shape type:", this.shapeType);
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

        console.debug(DRAW_LOG_PREFIX, "Placed shape:", obj.id);
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

        console.debug(DRAW_LOG_PREFIX, "Draw cancelled");
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

        console.debug(TEXT_TOOL_LOG_PREFIX, "Text tool cancelled");
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

        console.debug(TEXT_TOOL_LOG_PREFIX, "Placed text object:", obj.id);
    }
}

// ========================================================================
// SOURCE: tool-connect.ts
// ========================================================================

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
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Log prefix for all console messages from this module. */
const CONNECT_LOG_PREFIX = "[ConnectorTool]";

/** CSS colour for the preview line. */
const PREVIEW_LINE_COLOR = "var(--bs-primary, #0d6efd)";

/** Stroke width for the preview line. */
const PREVIEW_LINE_WIDTH = 2;

/** Dash pattern for the preview line. */
const PREVIEW_DASH_PATTERN = "6 3";

/** SVG namespace for creating preview elements. */
const CONNECT_SVG_NS = "http://www.w3.org/2000/svg";

/** Default connector stroke colour. */
const CONNECT_DEFAULT_COLOR = "var(--theme-text-color)";

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
        console.debug(CONNECT_LOG_PREFIX, "Activated");
    }

    /** @inheritdoc */
    public onDeactivate(): void
    {
        this.resetState();
        this.engine.clearToolOverlay();
        console.debug(CONNECT_LOG_PREFIX, "Deactivated");
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

        console.debug(CONNECT_LOG_PREFIX, "Source:", hitObj.id, "port:", this.sourcePortId);
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

        console.debug(CONNECT_LOG_PREFIX, "Cancelled via Escape");
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

        const ports = shapeDef.getPorts(obj.presentation.bounds);

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
                    width: 1.5,
                    endArrow: "classic"
                },
                labels: []
            }
        });

        this.pushConnectorUndo(conn);
        this.resetState();
        this.engine.setActiveTool("select");

        console.log(CONNECT_LOG_PREFIX, "Created connector:", conn.id);
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
            console.debug(CONNECT_LOG_PREFIX, "No target object — cancelled");
        }
        else
        {
            console.debug(CONNECT_LOG_PREFIX, "Source equals target — cancelled");
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

/*
 * ----------------------------------------------------------------------------
 * COMPONENT: PenTool
 * PURPOSE: Vector path creation tool for the DiagramEngine canvas. Click
 *    to place anchor points forming a polyline. Enter finalises the path
 *    into a "path" shape object with SVG path data. Escape cancels.
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

/** SVG namespace for creating preview elements. */
const PEN_SVG_NS = "http://www.w3.org/2000/svg";

/** Colour for the path preview. */
const PEN_PREVIEW_COLOR = "var(--bs-primary, #0d6efd)";

/** Stroke width for the preview path. */
const PEN_PREVIEW_WIDTH = 2;

/** Radius of the first-click indicator dot. */
const PEN_DOT_RADIUS = 4;

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
 * 4. Press Escape to cancel.
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
        console.debug(PEN_LOG_PREFIX, "Activated");
    }

    /** @inheritdoc */
    public onDeactivate(): void
    {
        this.points = [];
        this.engine.clearToolOverlay();
        console.debug(PEN_LOG_PREFIX, "Deactivated");
    }

    /**
     * Handles mouse-down: adds an anchor point and updates preview.
     *
     * @param _e - The originating mouse event.
     * @param canvasPos - Mouse position in canvas coordinate space.
     */
    public onMouseDown(_e: MouseEvent, canvasPos: Point): void
    {
        this.points.push({ x: canvasPos.x, y: canvasPos.y });
        this.renderPreview(canvasPos);

        console.debug(PEN_LOG_PREFIX, "Point added:", this.points.length);
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
     * Handles key-down: Enter finalises, Escape cancels.
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
            console.debug(PEN_LOG_PREFIX, "Need at least 2 points");
            this.cancelPath();
            return;
        }

        const bbox = computePointsBBox(this.points);
        const localD = toLocalPathData(this.points, bbox);

        this.createPathObject(bbox, localD);

        this.points = [];
        this.engine.clearToolOverlay();
        this.engine.setActiveTool("select");

        console.log(PEN_LOG_PREFIX, "Path finalised");
    }

    /**
     * Creates the "path" diagram object and pushes an undo command.
     *
     * @param bbox - Bounding rectangle for the path.
     * @param pathData - SVG path data in local coordinates.
     */
    private createPathObject(bbox: Rect, pathData: string): void
    {
        const obj = this.engine.addObject({
            semantic: { type: "path", data: {} },
            presentation: {
                shape: "path",
                bounds: bbox,
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

        console.debug(PEN_LOG_PREFIX, "Cancelled");
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
        console.debug(BRUSH_LOG_PREFIX, "Activated");
    }

    /** @inheritdoc */
    public onDeactivate(): void
    {
        this.resetState();
        this.engine.clearToolOverlay();
        console.debug(BRUSH_LOG_PREFIX, "Deactivated");
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

        console.debug(BRUSH_LOG_PREFIX, "Stroke started");
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
            console.debug(BRUSH_LOG_PREFIX, "Stroke too short, discarded");
            this.resetState();
            return;
        }

        const simplified = simplifyPoints(this.rawPoints, SIMPLIFY_TOLERANCE);
        const bbox = computeBrushBBox(simplified);
        const localD = toBrushLocalPathData(simplified, bbox);

        this.createBrushObject(bbox, localD);

        this.resetState();
        this.engine.setActiveTool("select");

        console.log(
            BRUSH_LOG_PREFIX, "Stroke finalised:",
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

        console.debug(BRUSH_LOG_PREFIX, "Stroke cancelled");
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
// SOURCE: tool-measure.ts
// ========================================================================

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
        console.debug(MEASURE_LOG_PREFIX, "Activated");
    }

    /** @inheritdoc */
    public onDeactivate(): void
    {
        this.resetState();
        this.engine.clearToolOverlay();
        console.debug(MEASURE_LOG_PREFIX, "Deactivated");
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

        console.log(
            MEASURE_LOG_PREFIX, "Distance:",
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

        console.debug(MEASURE_LOG_PREFIX, "Switched to select");
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

    /**
     * Register a tool with the manager.
     *
     * @param tool - The tool instance to register.
     */
    public register(tool: Tool): void
    {
        if (this.tools.has(tool.name))
        {
            console.warn(
                `${LOG_PREFIX} Tool "${tool.name}" is already registered; replacing.`
            );
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
            console.warn(`${LOG_PREFIX} Tool "${name}" not found.`);
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
    }
}

// ========================================================================
// SOURCE: engine.ts
// ========================================================================

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
        console.error(LOG_PREFIX, "Callback error:", err);
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
    private dirty = false;
    private changeCount = 0;
    private themeObserver: MutationObserver | null = null;
    private destroyed = false;

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
        this.registerDefaultTools();
        this.toolManager.setActive("select");

        this.bindCanvasEvents();
        this.observeThemeChanges();
        this.performInitialRender();

        console.log(LOG_PREFIX, "Created:", this.instanceId);
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
        const visible = this.getVisibleObjects();

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
     * Re-renders the object and any attached connectors.
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

        obj.presentation.bounds.x = pos.x;
        obj.presentation.bounds.y = pos.y;
        this.rerenderObject(obj);
        this.rerenderAttachedConnectors(id);
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
     * Deletes all selected objects and their attached connectors.
     */
    deleteSelected(): void
    {
        const ids = Array.from(this.selectedIds);

        for (const id of ids)
        {
            this.removeAttachedConnectors(id);
            this.removeObjectInternal(id);
        }

        this.selectedIds.clear();
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
     * Pans the canvas viewport by a screen-space delta.
     *
     * @param dx - Horizontal delta in screen pixels.
     * @param dy - Vertical delta in screen pixels.
     */
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
            Object.assign(obj.presentation, changes.presentation);
        }

        this.rerenderObject(obj);
        this.markDirty();
        this.events.emit("object:change", obj);
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

    // ========================================================================
    // PUBLIC API — STENCILS
    // ========================================================================

    /**
     * Loads a named stencil pack, registering its shapes.
     *
     * @param name - Pack name (e.g. "flowchart", "uml", "bpmn").
     */
    loadStencilPack(name: string): void
    {
        console.log(LOG_PREFIX, "Stencil pack loaded:", name);
        // Extended packs registered in Phase 5
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

        console.log(
            LOG_PREFIX,
            `Registered stencil pack '${name}':`,
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
    // PUBLIC API — EXPORT
    // ========================================================================

    /**
     * Exports the canvas as an SVG string.
     *
     * @returns SVG markup string.
     */
    exportSVG(): string
    {
        return new XMLSerializer().serializeToString(
            this.renderer.getSvgElement()
        );
    }

    /**
     * Exports the document as a pretty-printed JSON string.
     *
     * @returns JSON string with 2-space indentation.
     */
    exportJSON(): string
    {
        return this.toJSON(2);
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

        this.renderer.destroy();
        console.log(LOG_PREFIX, "Destroyed:", this.instanceId);
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
        this.toolManager.register(new MeasureTool(this));
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
     * Handles mousedown on the canvas. Dispatches to the active tool.
     * Middle-click activates the pan tool temporarily.
     */
    private onMouseDown(e: MouseEvent): void
    {
        this.endInlineTextEdit();

        const pos = this.renderer.screenToCanvas(e.clientX, e.clientY);

        if (e.button === 1)
        {
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
            this.toolManager.setActive("select");
        }
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
     *
     * @param e - The keyboard event.
     * @returns true if a global shortcut was handled.
     */
    private handleGlobalShortcut(e: KeyboardEvent): boolean
    {
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
     * Handles double-click. Opens inline text editing or delegates
     * to the consumer's onObjectDoubleClick callback.
     */
    private onDoubleClick(e: MouseEvent): void
    {
        const pos = this.renderer.screenToCanvas(e.clientX, e.clientY);
        const obj = this.hitTestObject(pos);

        if (!obj)
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
            console.warn(
                LOG_PREFIX,
                "Unknown shape type:",
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
     */
    private refreshSelectionVisuals(): void
    {
        const selected = this.getSelectedObjects();
        this.renderer.renderSelectionHandles(selected);
        safeCallback(this.opts.onSelectionChange, selected, []);
        this.events.emit("selection:change", selected);
    }

    // ========================================================================
    // PRIVATE — DOCUMENT HELPERS
    // ========================================================================

    /**
     * Returns all visible objects, sorted by z-index.
     *
     * @returns Array of visible objects in z-order.
     */
    private getVisibleObjects(): DiagramObject[]
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
                renderStyle: pres.renderStyle,
                image: pres.image,
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
function createDiagramEngine(
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
