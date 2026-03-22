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
export interface EngineForPaintbrushTool extends EngineForTools
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
export class PaintbrushTool implements Tool
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
        console.debug(PAINTBRUSH_LOG_PREFIX, "Activated");
    }

    /** @inheritdoc */
    public onDeactivate(): void
    {
        this.commitStroke();
        this.resetState();
        console.debug(PAINTBRUSH_LOG_PREFIX, "Deactivated");
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

        console.debug(PAINTBRUSH_LOG_PREFIX, "Cancelled, back to select");
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
            console.warn(PAINTBRUSH_LOG_PREFIX, "No canvas for:", obj.id);
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

        console.debug(PAINTBRUSH_LOG_PREFIX, "Stroke started on:", objectId);
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

        console.debug(PAINTBRUSH_LOG_PREFIX, "Stroke committed:", objId);

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
