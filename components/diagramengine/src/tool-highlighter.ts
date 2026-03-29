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
export interface EngineForHighlighterTool extends EngineForTools
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
export const HIGHLIGHT_YELLOW = "rgba(255, 255, 0, 0.4)";

/** Semi-transparent pink highlight. */
export const HIGHLIGHT_PINK = "rgba(255, 182, 193, 0.4)";

/** Semi-transparent blue highlight. */
export const HIGHLIGHT_BLUE = "rgba(173, 216, 230, 0.4)";

/** Semi-transparent green highlight. */
export const HIGHLIGHT_GREEN = "rgba(144, 238, 144, 0.4)";

/** Semi-transparent orange highlight. */
export const HIGHLIGHT_ORANGE = "rgba(255, 200, 100, 0.4)";

/** Semi-transparent red highlight. */
export const HIGHLIGHT_RED = "rgba(255, 128, 128, 0.4)";

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
export class HighlighterTool implements Tool
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
