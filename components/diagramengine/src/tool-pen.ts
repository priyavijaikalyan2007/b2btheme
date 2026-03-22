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
export interface EngineForPenTool extends EngineForTools
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
export class PenTool implements Tool
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
            console.debug(PEN_LOG_PREFIX, "Need at least 2 points");
            this.cancelPath();
            return;
        }

        const bbox = computePointsBBox(this.points);
        const localD = toLocalPathData(this.points, bbox);

        this.createPathObject(bbox, localD, false);

        this.points = [];
        this.engine.clearToolOverlay();
        this.engine.setActiveTool("select");

        console.log(PEN_LOG_PREFIX, "Path finalised");
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
            console.debug(PEN_LOG_PREFIX, "Need at least 3 points to close");
            this.cancelPath();
            return;
        }

        const bbox = computePointsBBox(this.points);
        const localD = toLocalPathData(this.points, bbox) + " Z";

        this.createPathObject(bbox, localD, true);

        this.points = [];
        this.engine.clearToolOverlay();
        this.engine.setActiveTool("select");

        console.log(PEN_LOG_PREFIX, "Closed path finalised");
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
