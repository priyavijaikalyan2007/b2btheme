/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: DiagramEngine — NetworkStencils
 * PURPOSE: Network, BPMN, and ER shape definitions for infrastructure,
 *    business process, and entity-relationship diagrams. Includes server,
 *    cloud, firewall, bpmn-task, bpmn-start-event, bpmn-end-event,
 *    bpmn-gateway, er-entity, and er-relationship shapes.
 * RELATES: [[DiagramEngine]], [[ShapeRegistry]], [[ShapeDefinition]]
 * FLOW: [registerNetworkPack()] -> [ShapeRegistry.register()] -> [Engine]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

const NET_LOG_PREFIX = "[NetworkStencils]";
function logNetInfo(...args: unknown[]): void
{
    console.log(new Date().toISOString(), "[INFO]", NET_LOG_PREFIX, ...args);
}

function logNetWarn(...args: unknown[]): void
{
    console.warn(new Date().toISOString(), "[WARN]", NET_LOG_PREFIX, ...args);
}

function logNetError(...args: unknown[]): void
{
    console.error(new Date().toISOString(), "[ERROR]", NET_LOG_PREFIX, ...args);
}

function logNetDebug(...args: unknown[]): void
{
    console.debug(new Date().toISOString(), "[DEBUG]", NET_LOG_PREFIX, ...args);
}

const BPMN_LOG_PREFIX = "[BpmnStencils]";
function logBpmnInfo(...args: unknown[]): void
{
    console.log(new Date().toISOString(), "[INFO]", BPMN_LOG_PREFIX, ...args);
}

function logBpmnWarn(...args: unknown[]): void
{
    console.warn(new Date().toISOString(), "[WARN]", BPMN_LOG_PREFIX, ...args);
}

function logBpmnError(...args: unknown[]): void
{
    console.error(new Date().toISOString(), "[ERROR]", BPMN_LOG_PREFIX, ...args);
}

function logBpmnDebug(...args: unknown[]): void
{
    console.debug(new Date().toISOString(), "[DEBUG]", BPMN_LOG_PREFIX, ...args);
}

const ER_LOG_PREFIX = "[ErStencils]";

function logErInfo(...args: unknown[]): void
{
    console.log(new Date().toISOString(), "[INFO]", ER_LOG_PREFIX, ...args);
}

function logErWarn(...args: unknown[]): void
{
    console.warn(new Date().toISOString(), "[WARN]", ER_LOG_PREFIX, ...args);
}

function logErError(...args: unknown[]): void
{
    console.error(new Date().toISOString(), "[ERROR]", ER_LOG_PREFIX, ...args);
}

function logErDebug(...args: unknown[]): void
{
    console.debug(new Date().toISOString(), "[DEBUG]", ER_LOG_PREFIX, ...args);
}

/** Category identifiers for stencil palette grouping. */
const NET_CATEGORY = "network";
const BPMN_CATEGORY = "bpmn";
const ER_CATEGORY = "er";

/** Inset in pixels for text regions to clear stroke area. */
const NET_TEXT_INSET = 6;

// ============================================================================
// SHARED HELPERS
// ============================================================================

/**
 * Creates an inset copy of a rectangle, shrinking each edge.
 *
 * @param bounds - Original bounding rectangle.
 * @param inset - Number of pixels to inset on each side.
 * @returns A new Rect inset from the original.
 */
function netInsetRect(bounds: Rect, inset: number): Rect
{
    const doubleInset = inset * 2;

    return {
        x: bounds.x + inset,
        y: bounds.y + inset,
        width: Math.max(0, bounds.width - doubleInset),
        height: Math.max(0, bounds.height - doubleInset)
    };
}

/**
 * Returns the SVG path data for a rectangle outline.
 *
 * @param bounds - Current bounding rectangle.
 * @returns SVG path data string.
 */
function netRectOutlinePath(bounds: Rect): string
{
    const x = bounds.x;
    const y = bounds.y;
    const w = bounds.width;
    const h = bounds.height;

    return `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
}

// ============================================================================
// SERVER (rack server)
// ============================================================================

/** Number of horizontal divider lines in the server rack. */
const SERVER_ROWS = 3;

/**
 * Renders the outer rectangle of a server rack shape.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG rect element with fill and stroke applied.
 */
function renderServerRect(ctx: ShapeRenderContext): SVGElement
{
    const rect = svgCreate("rect", {
        x: String(ctx.bounds.x),
        y: String(ctx.bounds.y),
        width: String(ctx.bounds.width),
        height: String(ctx.bounds.height)
    });

    applyFillToSvg(rect, ctx.style.fill);
    applyStrokeToSvg(rect, ctx.style.stroke);

    return rect;
}

/**
 * Renders the horizontal divider lines inside the server rack.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the divider lines.
 */
function renderServerDividers(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const x = ctx.bounds.x;
    const w = ctx.bounds.width;
    const h = ctx.bounds.height;
    const rowH = h / SERVER_ROWS;

    for (let i = 1; i < SERVER_ROWS; i++)
    {
        const y = ctx.bounds.y + (i * rowH);
        const line = svgCreate("line", {
            x1: String(x), y1: String(y),
            x2: String(x + w), y2: String(y)
        });

        applyStrokeToSvg(line, ctx.style.stroke);
        g.appendChild(line);
    }

    return g;
}

/**
 * Renders a complete server rack shape with outer rectangle and
 * horizontal divider lines.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the server elements.
 */
function renderServer(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");

    g.appendChild(renderServerRect(ctx));
    g.appendChild(renderServerDividers(ctx));

    return g;
}

/**
 * Builds the server ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for server rack shapes.
 */
function buildServerShape(): ShapeDefinition
{
    return {
        type: "server",
        category: NET_CATEGORY,
        label: "Server",
        icon: "bi-hdd-rack",
        defaultSize: { w: 80, h: 120 },
        minSize: { w: 40, h: 60 },
        render: renderServer,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => [{ id: "text-main", bounds: netInsetRect(bounds, NET_TEXT_INSET) }],
        getOutlinePath: (bounds: Rect) => netRectOutlinePath(bounds)
    };
}

// ============================================================================
// CLOUD
// ============================================================================

/**
 * Builds the SVG path data for an organic cloud shape composed
 * of multiple cubic bezier curves.
 *
 * @param bounds - Bounding rectangle containing the cloud.
 * @returns SVG path data string using cubic bezier commands.
 */
function cloudPathData(bounds: Rect): string
{
    const x = bounds.x;
    const y = bounds.y;
    const w = bounds.width;
    const h = bounds.height;

    return (
        `M ${x + w * 0.25} ${y + h * 0.7} ` +
        `C ${x} ${y + h * 0.7} ${x} ${y + h * 0.35} ${x + w * 0.2} ${y + h * 0.35} ` +
        `C ${x + w * 0.15} ${y + h * 0.1} ${x + w * 0.35} ${y} ${x + w * 0.5} ${y + h * 0.1} ` +
        `C ${x + w * 0.6} ${y} ${x + w * 0.8} ${y + h * 0.05} ${x + w * 0.85} ${y + h * 0.25} ` +
        `C ${x + w} ${y + h * 0.25} ${x + w} ${y + h * 0.55} ${x + w * 0.85} ${y + h * 0.65} ` +
        `C ${x + w * 0.85} ${y + h * 0.8} ${x + w * 0.7} ${y + h * 0.85} ${x + w * 0.6} ${y + h * 0.75} ` +
        `C ${x + w * 0.5} ${y + h * 0.9} ${x + w * 0.3} ${y + h * 0.85} ${x + w * 0.25} ${y + h * 0.7} Z`
    );
}

/**
 * Renders a cloud shape with organic bezier curves.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the cloud path.
 */
function renderCloud(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const path = svgCreate("path", {
        d: cloudPathData(ctx.bounds)
    });

    g.appendChild(path);
    applyFillToSvg(path, ctx.style.fill);
    applyStrokeToSvg(path, ctx.style.stroke);

    return g;
}

/**
 * Returns inset text regions for a cloud shape.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single centred text region.
 */
function cloudTextRegions(bounds: Rect): TextRegion[]
{
    const insetFactor = 0.2;

    return [
        {
            id: "text-main",
            bounds: {
                x: bounds.x + (bounds.width * insetFactor),
                y: bounds.y + (bounds.height * 0.25),
                width: bounds.width * (1 - (2 * insetFactor)),
                height: bounds.height * 0.45
            }
        }
    ];
}

/**
 * Builds the cloud ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for cloud shapes.
 */
function buildCloudShape(): ShapeDefinition
{
    return {
        type: "cloud",
        category: NET_CATEGORY,
        label: "Cloud",
        icon: "bi-cloud",
        defaultSize: { w: 140, h: 100 },
        minSize: { w: 60, h: 40 },
        render: renderCloud,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => cloudTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => cloudPathData(bounds)
    };
}

// ============================================================================
// FIREWALL (rectangle with brick pattern)
// ============================================================================

/** Number of brick rows in the firewall. */
const FW_ROWS = 4;

/** Number of brick columns per row. */
const FW_COLS = 3;

/**
 * Renders the outer rectangle of a firewall shape.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG rect element with fill and stroke applied.
 */
function renderFirewallRect(ctx: ShapeRenderContext): SVGElement
{
    const rect = svgCreate("rect", {
        x: String(ctx.bounds.x),
        y: String(ctx.bounds.y),
        width: String(ctx.bounds.width),
        height: String(ctx.bounds.height)
    });

    applyFillToSvg(rect, ctx.style.fill);
    applyStrokeToSvg(rect, ctx.style.stroke);

    return rect;
}

/**
 * Renders the brick pattern (horizontal rows and staggered vertical
 * lines) inside the firewall shape.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the brick pattern lines.
 */
function renderFirewallBricks(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const x = ctx.bounds.x;
    const y = ctx.bounds.y;
    const w = ctx.bounds.width;
    const h = ctx.bounds.height;
    const rowH = h / FW_ROWS;
    const colW = w / FW_COLS;

    renderFirewallHorizontals(g, x, y, w, rowH, ctx);
    renderFirewallVerticals(g, x, y, rowH, colW, ctx);

    return g;
}

/**
 * Renders horizontal divider lines for the brick pattern.
 *
 * @param g - SVG group to append lines to.
 * @param x - Left edge X.
 * @param y - Top edge Y.
 * @param w - Total width.
 * @param rowH - Height of each row.
 * @param ctx - Shape render context for styling.
 */
function renderFirewallHorizontals(
    g: SVGElement,
    x: number,
    y: number,
    w: number,
    rowH: number,
    ctx: ShapeRenderContext): void
{
    for (let i = 1; i < FW_ROWS; i++)
    {
        const lineY = y + (i * rowH);
        const line = svgCreate("line", {
            x1: String(x), y1: String(lineY),
            x2: String(x + w), y2: String(lineY)
        });

        applyStrokeToSvg(line, ctx.style.stroke);
        g.appendChild(line);
    }
}

/**
 * Renders staggered vertical lines for the brick pattern.
 * Even rows are offset by half a column width.
 *
 * @param g - SVG group to append lines to.
 * @param x - Left edge X.
 * @param y - Top edge Y.
 * @param rowH - Height of each row.
 * @param colW - Width of each column.
 * @param ctx - Shape render context for styling.
 */
function renderFirewallVerticals(
    g: SVGElement,
    x: number,
    y: number,
    rowH: number,
    colW: number,
    ctx: ShapeRenderContext): void
{
    for (let row = 0; row < FW_ROWS; row++)
    {
        const offset = (row % 2 === 0) ? 0 : colW / 2;
        const rowY = y + (row * rowH);

        for (let col = 1; col < FW_COLS; col++)
        {
            const lineX = x + (col * colW) + offset;

            if (lineX > x && lineX < (x + (FW_COLS * colW)))
            {
                const line = svgCreate("line", {
                    x1: String(lineX), y1: String(rowY),
                    x2: String(lineX), y2: String(rowY + rowH)
                });

                applyStrokeToSvg(line, ctx.style.stroke);
                g.appendChild(line);
            }
        }
    }
}

/**
 * Renders a complete firewall shape with rectangle and brick pattern.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the firewall elements.
 */
function renderFirewall(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");

    g.appendChild(renderFirewallRect(ctx));
    g.appendChild(renderFirewallBricks(ctx));

    return g;
}

/**
 * Builds the firewall ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for firewall shapes.
 */
function buildFirewallShape(): ShapeDefinition
{
    return {
        type: "firewall",
        category: NET_CATEGORY,
        label: "Firewall",
        icon: "bi-bricks",
        defaultSize: { w: 100, h: 80 },
        minSize: { w: 40, h: 30 },
        render: renderFirewall,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => [{ id: "text-main", bounds: netInsetRect(bounds, NET_TEXT_INSET) }],
        getOutlinePath: (bounds: Rect) => netRectOutlinePath(bounds)
    };
}

// ============================================================================
// BPMN-TASK (rounded rectangle)
// ============================================================================

/** Corner radius for BPMN task rounded rectangle. */
const BPMN_TASK_RADIUS = 8;

/**
 * Renders a BPMN task as a rounded rectangle with fill and stroke.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the rounded rectangle.
 */
function renderBpmnTask(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const rect = svgCreate("rect", {
        x: String(ctx.bounds.x),
        y: String(ctx.bounds.y),
        width: String(ctx.bounds.width),
        height: String(ctx.bounds.height),
        rx: String(BPMN_TASK_RADIUS),
        ry: String(BPMN_TASK_RADIUS)
    });

    g.appendChild(rect);
    applyFillToSvg(rect, ctx.style.fill);
    applyStrokeToSvg(rect, ctx.style.stroke);

    return g;
}

/**
 * Builds the BPMN task outline path as a rectangle (simplified).
 *
 * @param bounds - Current bounding rectangle.
 * @returns SVG path data string.
 */
function bpmnTaskOutlinePath(bounds: Rect): string
{
    const x = bounds.x;
    const y = bounds.y;
    const w = bounds.width;
    const h = bounds.height;
    const r = BPMN_TASK_RADIUS;

    return (
        `M ${x + r} ${y} ` +
        `L ${x + w - r} ${y} ` +
        `A ${r} ${r} 0 0 1 ${x + w} ${y + r} ` +
        `L ${x + w} ${y + h - r} ` +
        `A ${r} ${r} 0 0 1 ${x + w - r} ${y + h} ` +
        `L ${x + r} ${y + h} ` +
        `A ${r} ${r} 0 0 1 ${x} ${y + h - r} ` +
        `L ${x} ${y + r} ` +
        `A ${r} ${r} 0 0 1 ${x + r} ${y} Z`
    );
}

/**
 * Builds the BPMN task ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for BPMN task shapes.
 */
function buildBpmnTaskShape(): ShapeDefinition
{
    return {
        type: "bpmn-task",
        category: BPMN_CATEGORY,
        label: "Task",
        icon: "bi-card-text",
        defaultSize: { w: 120, h: 80 },
        minSize: { w: 40, h: 30 },
        render: renderBpmnTask,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => [{ id: "text-main", bounds: netInsetRect(bounds, NET_TEXT_INSET) }],
        getOutlinePath: (bounds: Rect) => bpmnTaskOutlinePath(bounds)
    };
}

// ============================================================================
// BPMN-START-EVENT (green circle)
// ============================================================================

/**
 * Renders a BPMN start event as a circle with a green stroke.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the start event circle.
 */
function renderBpmnStartEvent(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const cx = ctx.bounds.x + (ctx.bounds.width / 2);
    const cy = ctx.bounds.y + (ctx.bounds.height / 2);
    const r = Math.min(ctx.bounds.width, ctx.bounds.height) / 2;

    const circle = svgCreate("circle", {
        cx: String(cx),
        cy: String(cy),
        r: String(r)
    });

    applyFillToSvg(circle, ctx.style.fill);

    // Use green stroke for start events unless overridden
    const stroke = ctx.style.stroke || { color: "#28a745", width: 2 };
    applyStrokeToSvg(circle, stroke);

    g.appendChild(circle);

    return g;
}

/**
 * Builds the SVG path data for a circle outline.
 *
 * @param bounds - Bounding rectangle of the circle.
 * @returns SVG path data for the circle.
 */
function bpmnCircleOutlinePath(bounds: Rect): string
{
    const cx = bounds.x + (bounds.width / 2);
    const cy = bounds.y + (bounds.height / 2);
    const r = Math.min(bounds.width, bounds.height) / 2;

    return (
        `M ${cx - r} ${cy} ` +
        `A ${r} ${r} 0 1 1 ${cx + r} ${cy} ` +
        `A ${r} ${r} 0 1 1 ${cx - r} ${cy} Z`
    );
}

/**
 * Returns inset text regions for a circle shape.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single centred text region.
 */
function bpmnCircleTextRegions(bounds: Rect): TextRegion[]
{
    const insetFactor = 0.146;

    return [
        {
            id: "text-main",
            bounds: {
                x: bounds.x + (bounds.width * insetFactor),
                y: bounds.y + (bounds.height * insetFactor),
                width: bounds.width * (1 - (2 * insetFactor)),
                height: bounds.height * (1 - (2 * insetFactor))
            }
        }
    ];
}

/**
 * Tests whether a point lies inside a circle using the standard
 * equation: (dx)^2 + (dy)^2 <= r^2.
 *
 * @param point - Point in canvas coordinates.
 * @param bounds - Bounding rectangle of the circle.
 * @returns true if the point is inside the circle.
 */
function bpmnCircleHitTest(point: Point, bounds: Rect): boolean
{
    const cx = bounds.x + (bounds.width / 2);
    const cy = bounds.y + (bounds.height / 2);
    const r = Math.min(bounds.width, bounds.height) / 2;

    if (r === 0)
    {
        return false;
    }

    const dx = point.x - cx;
    const dy = point.y - cy;

    return ((dx * dx) + (dy * dy)) <= (r * r);
}

/**
 * Builds the BPMN start event ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for start event circles.
 */
function buildBpmnStartEventShape(): ShapeDefinition
{
    return {
        type: "bpmn-start-event",
        category: BPMN_CATEGORY,
        label: "Start Event",
        icon: "bi-circle",
        defaultSize: { w: 50, h: 50 },
        minSize: { w: 24, h: 24 },
        render: renderBpmnStartEvent,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => bpmnCircleHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => bpmnCircleTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => bpmnCircleOutlinePath(bounds)
    };
}

// ============================================================================
// BPMN-END-EVENT (thick red circle)
// ============================================================================

/**
 * Renders a BPMN end event as a circle with a thick red stroke.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the end event circle.
 */
function renderBpmnEndEvent(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const cx = ctx.bounds.x + (ctx.bounds.width / 2);
    const cy = ctx.bounds.y + (ctx.bounds.height / 2);
    const r = Math.min(ctx.bounds.width, ctx.bounds.height) / 2;

    const circle = svgCreate("circle", {
        cx: String(cx),
        cy: String(cy),
        r: String(r)
    });

    applyFillToSvg(circle, ctx.style.fill);

    // Use thick red stroke for end events unless overridden
    const stroke = ctx.style.stroke || { color: "#dc3545", width: 3 };
    applyStrokeToSvg(circle, stroke);

    g.appendChild(circle);

    return g;
}

/**
 * Builds the BPMN end event ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for end event circles.
 */
function buildBpmnEndEventShape(): ShapeDefinition
{
    return {
        type: "bpmn-end-event",
        category: BPMN_CATEGORY,
        label: "End Event",
        icon: "bi-record-circle",
        defaultSize: { w: 50, h: 50 },
        minSize: { w: 24, h: 24 },
        render: renderBpmnEndEvent,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => bpmnCircleHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => bpmnCircleTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => bpmnCircleOutlinePath(bounds)
    };
}

// ============================================================================
// BPMN-GATEWAY (diamond)
// ============================================================================

/**
 * Builds the SVG path data for a BPMN gateway diamond shape.
 *
 * @param bounds - Bounding rectangle containing the diamond.
 * @returns SVG path data string.
 */
function bpmnGatewayPathData(bounds: Rect): string
{
    const cx = bounds.x + (bounds.width / 2);
    const cy = bounds.y + (bounds.height / 2);

    return (
        `M ${cx} ${bounds.y} ` +
        `L ${bounds.x + bounds.width} ${cy} ` +
        `L ${cx} ${bounds.y + bounds.height} ` +
        `L ${bounds.x} ${cy} Z`
    );
}

/**
 * Renders a BPMN gateway diamond shape with fill and stroke.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the gateway diamond path.
 */
function renderBpmnGateway(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const path = svgCreate("path", {
        d: bpmnGatewayPathData(ctx.bounds)
    });

    g.appendChild(path);
    applyFillToSvg(path, ctx.style.fill);
    applyStrokeToSvg(path, ctx.style.stroke);

    return g;
}

/**
 * Tests whether a point lies inside the gateway diamond using
 * the taxicab distance formula.
 *
 * @param point - Point in canvas coordinates.
 * @param bounds - Bounding rectangle of the diamond.
 * @returns true if the point is inside the diamond.
 */
function bpmnGatewayHitTest(point: Point, bounds: Rect): boolean
{
    const cx = bounds.x + (bounds.width / 2);
    const cy = bounds.y + (bounds.height / 2);
    const halfW = bounds.width / 2;
    const halfH = bounds.height / 2;

    if (halfW === 0 || halfH === 0)
    {
        return false;
    }

    const dx = Math.abs(point.x - cx) / halfW;
    const dy = Math.abs(point.y - cy) / halfH;

    return (dx + dy) <= 1;
}

/**
 * Returns inset text regions for a gateway diamond.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single centred text region.
 */
function bpmnGatewayTextRegions(bounds: Rect): TextRegion[]
{
    const insetFactor = 0.25;

    return [
        {
            id: "text-main",
            bounds: {
                x: bounds.x + (bounds.width * insetFactor),
                y: bounds.y + (bounds.height * insetFactor),
                width: bounds.width * (1 - (2 * insetFactor)),
                height: bounds.height * (1 - (2 * insetFactor))
            }
        }
    ];
}

/**
 * Builds the BPMN gateway ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for gateway diamond shapes.
 */
function buildBpmnGatewayShape(): ShapeDefinition
{
    return {
        type: "bpmn-gateway",
        category: BPMN_CATEGORY,
        label: "Gateway",
        icon: "bi-diamond",
        defaultSize: { w: 60, h: 60 },
        minSize: { w: 30, h: 30 },
        render: renderBpmnGateway,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => bpmnGatewayHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => bpmnGatewayTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => bpmnGatewayPathData(bounds)
    };
}

// ============================================================================
// ER-ENTITY (plain rectangle)
// ============================================================================

/**
 * Renders an ER entity as a plain rectangle with fill and stroke.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the entity rectangle.
 */
function renderErEntity(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const rect = svgCreate("rect", {
        x: String(ctx.bounds.x),
        y: String(ctx.bounds.y),
        width: String(ctx.bounds.width),
        height: String(ctx.bounds.height)
    });

    g.appendChild(rect);
    applyFillToSvg(rect, ctx.style.fill);
    applyStrokeToSvg(rect, ctx.style.stroke);

    return g;
}

/**
 * Builds the ER entity ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for ER entity shapes.
 */
function buildErEntityShape(): ShapeDefinition
{
    return {
        type: "er-entity",
        category: ER_CATEGORY,
        label: "Entity",
        icon: "bi-square",
        defaultSize: { w: 120, h: 60 },
        minSize: { w: 40, h: 30 },
        render: renderErEntity,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => [{ id: "text-main", bounds: netInsetRect(bounds, NET_TEXT_INSET) }],
        getOutlinePath: (bounds: Rect) => netRectOutlinePath(bounds)
    };
}

// ============================================================================
// ER-RELATIONSHIP (diamond)
// ============================================================================

/**
 * Builds the SVG path data for an ER relationship diamond.
 *
 * @param bounds - Bounding rectangle containing the diamond.
 * @returns SVG path data string.
 */
function erRelationshipPathData(bounds: Rect): string
{
    const cx = bounds.x + (bounds.width / 2);
    const cy = bounds.y + (bounds.height / 2);

    return (
        `M ${cx} ${bounds.y} ` +
        `L ${bounds.x + bounds.width} ${cy} ` +
        `L ${cx} ${bounds.y + bounds.height} ` +
        `L ${bounds.x} ${cy} Z`
    );
}

/**
 * Renders an ER relationship diamond with fill and stroke.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the relationship diamond path.
 */
function renderErRelationship(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const path = svgCreate("path", {
        d: erRelationshipPathData(ctx.bounds)
    });

    g.appendChild(path);
    applyFillToSvg(path, ctx.style.fill);
    applyStrokeToSvg(path, ctx.style.stroke);

    return g;
}

/**
 * Tests whether a point lies inside the ER relationship diamond
 * using the taxicab distance formula.
 *
 * @param point - Point in canvas coordinates.
 * @param bounds - Bounding rectangle of the diamond.
 * @returns true if the point is inside the diamond.
 */
function erRelationshipHitTest(point: Point, bounds: Rect): boolean
{
    const cx = bounds.x + (bounds.width / 2);
    const cy = bounds.y + (bounds.height / 2);
    const halfW = bounds.width / 2;
    const halfH = bounds.height / 2;

    if (halfW === 0 || halfH === 0)
    {
        return false;
    }

    const dx = Math.abs(point.x - cx) / halfW;
    const dy = Math.abs(point.y - cy) / halfH;

    return (dx + dy) <= 1;
}

/**
 * Returns inset text regions for an ER relationship diamond.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single centred text region.
 */
function erRelationshipTextRegions(bounds: Rect): TextRegion[]
{
    const insetFactor = 0.25;

    return [
        {
            id: "text-main",
            bounds: {
                x: bounds.x + (bounds.width * insetFactor),
                y: bounds.y + (bounds.height * insetFactor),
                width: bounds.width * (1 - (2 * insetFactor)),
                height: bounds.height * (1 - (2 * insetFactor))
            }
        }
    ];
}

/**
 * Builds the ER relationship ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for ER relationship shapes.
 */
function buildErRelationshipShape(): ShapeDefinition
{
    return {
        type: "er-relationship",
        category: ER_CATEGORY,
        label: "Relationship",
        icon: "bi-diamond",
        defaultSize: { w: 100, h: 80 },
        minSize: { w: 40, h: 30 },
        render: renderErRelationship,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => erRelationshipHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => erRelationshipTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => erRelationshipPathData(bounds)
    };
}

// ============================================================================
// REGISTRATION — NETWORK
// ============================================================================

/**
 * Registers all three network shapes (server, cloud, firewall)
 * with the given shape registry.
 *
 * @param registry - The ShapeRegistry instance to populate.
 * @returns void
 */
export function registerNetworkPack(registry: ShapeRegistry): void
{
    registry.register(buildServerShape());
    registry.register(buildCloudShape());
    registry.register(buildFirewallShape());

    logNetInfo("Registered 3 network shapes");
}

// ============================================================================
// REGISTRATION — BPMN
// ============================================================================

/**
 * Registers all four BPMN shapes (task, start-event, end-event,
 * gateway) with the given shape registry.
 *
 * @param registry - The ShapeRegistry instance to populate.
 * @returns void
 */
export function registerBpmnPack(registry: ShapeRegistry): void
{
    registry.register(buildBpmnTaskShape());
    registry.register(buildBpmnStartEventShape());
    registry.register(buildBpmnEndEventShape());
    registry.register(buildBpmnGatewayShape());

    logBpmnInfo("Registered 4 BPMN shapes");
}

// ============================================================================
// REGISTRATION — ER
// ============================================================================

/**
 * Registers both ER shapes (entity, relationship) with the given
 * shape registry.
 *
 * @param registry - The ShapeRegistry instance to populate.
 * @returns void
 */
export function registerErPack(registry: ShapeRegistry): void
{
    registry.register(buildErEntityShape());
    registry.register(buildErRelationshipShape());

    logErInfo("Registered 2 ER shapes");
}
