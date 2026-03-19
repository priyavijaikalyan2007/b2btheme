/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
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
export interface EngineForConnectTool extends EngineForTools
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
export class ConnectorTool implements Tool
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
