/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
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
export class MeasureTool implements Tool
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
