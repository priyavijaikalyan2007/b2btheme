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
export interface EngineForBrushTool extends EngineForTools
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
export class BrushTool implements Tool
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
