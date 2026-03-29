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
export interface EngineForDrawTool extends EngineForTools
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
export class DrawTool implements Tool
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
