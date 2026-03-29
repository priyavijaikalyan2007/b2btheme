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
export class TextTool implements Tool
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
