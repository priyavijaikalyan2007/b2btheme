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
export interface EngineForTools
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
const NUDGE_PX = 1;

/** Nudge distance in pixels when Shift is held. */
const NUDGE_SHIFT_PX = 10;

/** Pixel radius for detecting a resize handle hit. */
const HANDLE_HIT_RADIUS = 6;

/** Vertical offset of the rotation handle above the object. */
const ROTATION_HANDLE_OFFSET = 25;

/** Log prefix for all console messages from this module. */
const LOG_PREFIX = "[DiagramEngine]";

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
export class SelectTool implements Tool
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
