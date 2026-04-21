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
export interface EngineForPanTool
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
export class PanTool implements Tool
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
