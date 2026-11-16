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

    /**
     * Returns all visible, unlocked objects on the canvas.
     *
     * @returns Array of visible, unlocked DiagramObject instances.
     */
    getVisibleObjects(): DiagramObject[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Log prefix for all console messages from this module. */
const CONNECT_LOG_PREFIX = "[ConnectorTool]";

/** Namespaced logging helpers. See FRONTEND_LOGGING.md section 1.1. */
const { debug: logConnectDebug, info: logConnectInfo } = makeLogger(CONNECT_LOG_PREFIX);

/** CSS colour for the preview line. */
const PREVIEW_LINE_COLOR = "var(--bs-primary, #0d6efd)";

/** Stroke width for the preview line. */
const PREVIEW_LINE_WIDTH = 2;

/** Dash pattern for the preview line. */
const PREVIEW_DASH_PATTERN = "6 3";

/** SVG namespace for creating preview elements. */
const CONNECT_SVG_NS = "http://www.w3.org/2000/svg";

/** Default connector stroke colour. */
const CONNECT_DEFAULT_COLOR = "#495057";

/** Radius for port indicator circles. */
const PORT_INDICATOR_RADIUS = 5;

/** Distance threshold for showing port indicators on nearby objects. */
const PORT_INDICATOR_RANGE = 80;

/** Fill colour for port indicator circles (primary at 30% opacity). */
const PORT_INDICATOR_FILL = "rgba(13, 110, 253, 0.3)";

/** Stroke colour for port indicator circles. */
const PORT_INDICATOR_STROKE = "var(--bs-primary, #0d6efd)";

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
 * 7. A press or a lift may also land outside an object, beside one of
 *    its connection points: up to 22 screen pixels for a finger, and 12
 *    for a mouse or a pen.
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

    // `dragStart` LEFT ON 2026-10-21 (UNUSED-1): the preview line
    // runs "from source centre to cursor", as this file's own
    // header says, so the grab point was never part of it.

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
        logConnectDebug("Activated");
    }

    /**
     * Whether a connector drag is in progress (ADR-126 — hover card guard).
     */
    public isInteracting(): boolean
    {
        return this.dragging;
    }

    /** @inheritdoc */
    public onDeactivate(): void
    {
        this.resetState();
        this.engine.clearToolOverlay();
        logConnectDebug("Deactivated");
    }

    /**
     * Handles mouse-down: identify the source object and begin dragging.
     *
     * @param e - The originating mouse event.
     * @param canvasPos - Mouse position in canvas coordinate space.
     */
    public onMouseDown(e: MouseEvent, canvasPos: Point): void
    {
        const source = this.findConnectionEnd(canvasPos, (e as PointerEvent).pointerType);

        if (!source)
        {
            return;
        }

        this.dragging = true;
        this.sourceObj = source.obj;
        this.sourcePortId = source.portId;

        logConnectDebug("Source:", source.obj.id, "port:", this.sourcePortId);
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
        this.renderPortIndicators(canvasPos);
    }

    /**
     * Handles mouse-up: identify the target object and create the connector.
     *
     * @param e - The originating mouse event.
     * @param canvasPos - Mouse position where the drag ended.
     */
    public onMouseUp(e: MouseEvent, canvasPos: Point): void
    {
        if (!this.dragging || !this.sourceObj)
        {
            return;
        }

        this.engine.clearToolOverlay();

        const target = this.findConnectionEnd(canvasPos, (e as PointerEvent).pointerType);

        if (!target || target.obj.id === this.sourceObj.id)
        {
            this.cancelConnection(target ? target.obj : null);
            return;
        }

        this.createConnector(this.sourceObj, this.sourcePortId, target.obj, target.portId);
    }

    /**
     * The press stopped without a lift. Drop the preview. The tool stays
     * active.
     */
    public onCancel(): void
    {
        this.engine.clearToolOverlay();
        this.resetState();
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

        logConnectDebug("Cancelled via Escape");
    }

    // ========================================================================
    // PRIVATE — PORT RESOLUTION
    // ========================================================================

    /**
     * Finds the object and port at one end of a connector. A press on an
     * object takes its nearest port. A press beside an object takes a
     * connection point within its target: 22 screen pixels for a
     * finger, and 12 for a mouse or a pen.
     *
     * @param pos - The press or lift position in canvas coordinates.
     * @param pointerType - The pointer type of the press or lift.
     * @returns The object and port, or null.
     */
    private findConnectionEnd(
        pos: Point,
        pointerType: string): { obj: DiagramObject; portId: string | undefined } | null
    {
        const obj = this.engine.hitTestObject(pos);

        if (obj)
        {
            return { obj, portId: this.findNearestPort(obj, pos) };
        }

        return this.hitTestPortTarget(pos, pointerType);
    }

    /**
     * Finds the edge port nearest a point, within the pointer's target,
     * on any visible object.
     *
     * @param pos - The point in canvas coordinates.
     * @param pointerType - The pointer type of the press or lift.
     * @returns The object and port, or null when none is in reach.
     */
    private hitTestPortTarget(
        pos: Point,
        pointerType: string): { obj: DiagramObject; portId: string } | null
    {
        const radius = targetRadius(pointerType, this.engine.getZoomLevel(), PORT_INDICATOR_RADIUS);
        let best: { obj: DiagramObject; portId: string } | null = null;
        let bestSq = radius * radius;

        for (const obj of this.engine.getVisibleObjects())
        {
            const shapeDef = this.engine.getShapeDef(obj.presentation.shape);

            if (!shapeDef)
            {
                continue;
            }

            const b = obj.presentation.bounds;

            for (const port of shapeDef.getPorts(b))
            {
                const dx = pos.x - (b.x + (port.position.x * b.width));
                const dy = pos.y - (b.y + (port.position.y * b.height));
                const dSq = (dx * dx) + (dy * dy);

                if ((port.id !== "port-c") && (dSq <= bestSq))
                {
                    best = { obj, portId: port.id };
                    bestSq = dSq;
                }
            }
        }

        return best;
    }

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

        const allPorts = shapeDef.getPorts(obj.presentation.bounds);

        // Exclude center port — connectors should attach at edges
        const edgePorts = allPorts.filter((p) => p.id !== "port-c");
        const ports = edgePorts.length > 0 ? edgePorts : allPorts;

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
    // PRIVATE — PORT INDICATORS
    // ========================================================================

    /**
     * Renders small circles at connection ports on shapes near the
     * cursor position. Shows ports on objects within the proximity
     * threshold, excluding the source object and port-c.
     *
     * @param cursorPos - Current cursor position in canvas coordinates.
     */
    private renderPortIndicators(cursorPos: Point): void
    {
        if (!this.sourceObj)
        {
            return;
        }

        const nearby = this.findNearbyObjects(cursorPos);

        for (const obj of nearby)
        {
            this.renderObjectPorts(obj);
        }
    }

    /**
     * Finds visible objects whose centre is within range of the cursor,
     * excluding the source object.
     *
     * @param cursorPos - Current cursor position in canvas coordinates.
     * @returns Array of nearby objects suitable for port display.
     */
    private findNearbyObjects(cursorPos: Point): DiagramObject[]
    {
        const visible = this.engine.getVisibleObjects();
        const sourceId = this.sourceObj!.id;
        const rangeSq = PORT_INDICATOR_RANGE * PORT_INDICATOR_RANGE;

        return visible.filter((obj) =>
        {
            if (obj.id === sourceId)
            {
                return false;
            }

            const b = obj.presentation.bounds;
            const cx = b.x + (b.width / 2);
            const cy = b.y + (b.height / 2);
            const dx = cursorPos.x - cx;
            const dy = cursorPos.y - cy;

            return ((dx * dx) + (dy * dy)) <= rangeSq;
        });
    }

    /**
     * Renders port indicator circles for a single object's edge ports.
     *
     * @param obj - The object to render ports for.
     */
    private renderObjectPorts(obj: DiagramObject): void
    {
        const shapeDef = this.engine.getShapeDef(obj.presentation.shape);

        if (!shapeDef)
        {
            return;
        }

        const allPorts = shapeDef.getPorts(obj.presentation.bounds);
        const edgePorts = allPorts.filter((p) => p.id !== "port-c");
        const b = obj.presentation.bounds;

        for (const port of edgePorts)
        {
            const circle = this.buildPortCircle(b, port);

            this.appendToToolOverlay(circle);
        }
    }

    /**
     * Builds an SVG circle element for a port indicator at the port's
     * absolute canvas position.
     *
     * @param bounds - The object's bounding rectangle.
     * @param port - The connection port definition.
     * @returns A styled SVG circle element.
     */
    private buildPortCircle(
        bounds: Rect,
        port: ConnectionPort): SVGElement
    {
        const px = bounds.x + (port.position.x * bounds.width);
        const py = bounds.y + (port.position.y * bounds.height);

        const circle = document.createElementNS(CONNECT_SVG_NS, "circle");

        circle.setAttribute("cx", String(px));
        circle.setAttribute("cy", String(py));
        circle.setAttribute("r", String(PORT_INDICATOR_RADIUS));
        circle.setAttribute("fill", PORT_INDICATOR_FILL);
        circle.setAttribute("stroke", PORT_INDICATOR_STROKE);
        circle.setAttribute("stroke-width", "1.5");
        circle.setAttribute("pointer-events", "none");

        return circle;
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
                    width: 2,
                    endArrow: "classic"
                },
                labels: []
            }
        });

        this.pushConnectorUndo(conn);
        this.resetState();
        this.engine.setActiveTool("select");

        logConnectInfo("Created connector:", conn.id);
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
            logConnectDebug("No target object — cancelled");
        }
        else
        {
            logConnectDebug("Source equals target — cancelled");
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
    }
}
