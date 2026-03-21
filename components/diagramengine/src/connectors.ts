/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Connectors
 * PURPOSE: Connector rendering and routing system for the DiagramEngine.
 *    Provides arrow marker management, path computation with multiple
 *    routing algorithms, connector SVG rendering, and label positioning.
 * RELATES: [[DiagramEngine]], [[RenderEngine]], [[ConnectorTool]]
 * FLOW: [DiagramEngine] -> [Connectors] -> [SVG DOM]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// CONSTANTS
// ============================================================================

/** Log prefix for all console messages from this module. */
const CONNECTOR_LOG_PREFIX = "[Connectors]";

/** SVG namespace URI for element creation. */
const CONNECTOR_SVG_NS = "http://www.w3.org/2000/svg";

/** XHTML namespace URI for foreignObject content. */
const CONNECTOR_XHTML_NS = "http://www.w3.org/1999/xhtml";

/** Default arrow marker size in pixels. */
const MARKER_SIZE = 10;

/** Half of the marker size, used for centring calculations. */
const MARKER_HALF = MARKER_SIZE / 2;

/** Marker reference X position (tip of the arrow). */
const MARKER_REF_X = MARKER_SIZE;

/** Default connector stroke width. */
const DEFAULT_CONNECTOR_WIDTH = 1.5;

/** Default connector stroke colour (CSS variable). */
const DEFAULT_CONNECTOR_COLOR = "var(--theme-text-color)";

/** Offset margin for manhattan routing around object bounds. */
const MANHATTAN_MARGIN = 20;

/** Label position parameter: start of the path. */
const LABEL_POS_START = 0.15;

/** Label position parameter: middle of the path. */
const LABEL_POS_MIDDLE = 0.5;

/** Label position parameter: end of the path. */
const LABEL_POS_END = 0.85;

/** Default label padding in pixels. */
const LABEL_DEFAULT_PADDING = 4;

// ============================================================================
// ARROW MARKER MANAGEMENT
// ============================================================================

/**
 * Ensures an SVG marker definition exists for the given arrow type.
 * Creates the marker in the defs element if not already present.
 * Returns the marker ID for use in marker-start/marker-end attributes.
 *
 * @param defsEl - The SVG defs element to insert markers into.
 * @param arrowType - The arrow type to create a marker for.
 * @returns The marker element ID string.
 */
export function ensureArrowMarker(
    defsEl: SVGElement,
    arrowType: ArrowType): string
{
    const markerId = `de-arrow-${arrowType}`;
    const existing = defsEl.querySelector(`#${markerId}`);

    if (existing)
    {
        return markerId;
    }

    const marker = createMarkerElement(markerId, arrowType);

    defsEl.appendChild(marker);

    console.debug(CONNECTOR_LOG_PREFIX, "Created arrow marker:", markerId);

    return markerId;
}

/**
 * Creates an SVG marker element with the correct geometry for the
 * given arrow type.
 *
 * @param markerId - The ID to assign to the marker element.
 * @param arrowType - The arrow type determining the path geometry.
 * @returns A configured SVG marker element.
 */
function createMarkerElement(markerId: string, arrowType: ArrowType): SVGElement
{
    const marker = document.createElementNS(CONNECTOR_SVG_NS, "marker");

    marker.setAttribute("id", markerId);
    marker.setAttribute("markerWidth", String(MARKER_SIZE));
    marker.setAttribute("markerHeight", String(MARKER_SIZE));
    marker.setAttribute("refX", String(MARKER_REF_X));
    marker.setAttribute("refY", String(MARKER_HALF));
    marker.setAttribute("orient", "auto-start-reverse");
    marker.setAttribute("markerUnits", "strokeWidth");

    const path = buildMarkerPath(arrowType);

    marker.appendChild(path);

    return marker;
}

/**
 * Builds the SVG path element with geometry specific to the arrow type.
 *
 * @param arrowType - The arrow type to build geometry for.
 * @returns An SVG path element with the correct d attribute and fill.
 */
function buildMarkerPath(arrowType: ArrowType): SVGElement
{
    const path = document.createElementNS(CONNECTOR_SVG_NS, "path");
    const geometry = getArrowGeometry(arrowType);

    path.setAttribute("d", geometry.d);
    path.setAttribute("fill", geometry.fill);

    if (geometry.stroke)
    {
        path.setAttribute("stroke", geometry.stroke);
        path.setAttribute("stroke-width", "1");
    }

    return path;
}

/**
 * Returns the SVG path data and fill settings for each arrow type.
 * Uses a pre-built lookup table for concise dispatch.
 *
 * @param arrowType - The arrow type.
 * @returns An object with d (path data), fill, and optional stroke.
 */
function getArrowGeometry(
    arrowType: ArrowType
): { d: string; fill: string; stroke?: string }
{
    const table = buildArrowGeometryTable();
    const fallback = { d: `M 0 0 L ${MARKER_SIZE} ${MARKER_HALF} L 0 ${MARKER_SIZE} Z`, fill: "currentColor" };

    return table[arrowType] ?? fallback;
}

/**
 * Builds the lookup table mapping arrow types to their SVG geometry.
 *
 * @returns A record of arrow type to path data and fill settings.
 */
function buildArrowGeometryTable(): Record<string, { d: string; fill: string; stroke?: string }>
{
    const s = MARKER_SIZE;
    const h = MARKER_HALF;
    const cur = "currentColor";

    return {
        block: { d: `M 0 0 L ${s} ${h} L 0 ${s} Z`, fill: cur },
        classic: { d: `M 0 0 L ${s} ${h} L 0 ${s} L 2 ${h} Z`, fill: cur },
        open: { d: `M 0 0 L ${s} ${h} L 0 ${s}`, fill: "none", stroke: cur },
        diamond: { d: `M 0 ${h} L ${h} 0 L ${s} ${h} L ${h} ${s} Z`, fill: cur },
        oval: { d: `M ${h} 0 A ${h} ${h} 0 1 1 ${h} ${s} A ${h} ${h} 0 1 1 ${h} 0 Z`, fill: cur },
        dash: { d: `M ${h} 0 L ${h} ${s}`, fill: "none", stroke: cur },
        cross: { d: `M 0 0 L ${s} ${s} M ${s} 0 L 0 ${s}`, fill: "none", stroke: cur },
    };
}

// ============================================================================
// ENDPOINT RESOLUTION
// ============================================================================

/**
 * Resolves a connector endpoint to a canvas-space point. Looks up the
 * object by ID, finds the specified port (or computes the nearest
 * edge point towards the other endpoint), and converts the position
 * to absolute coordinates.
 *
 * @param objId - The object ID the endpoint attaches to.
 * @param portId - Optional port ID within the object's shape.
 * @param fallbackPoint - Optional fallback point for freestanding endpoints.
 * @param objects - All objects in the document for lookup.
 * @param otherPoint - The other endpoint's position for nearest-edge calculation.
 * @returns The resolved point, or null if the object cannot be found.
 */
export function resolveEndpoint(
    objId: string,
    portId: string | undefined,
    fallbackPoint: Point | undefined,
    objects: DiagramObject[],
    otherPoint?: Point): Point | null
{
    const obj = objects.find((o) => o.id === objId);

    if (!obj)
    {
        return fallbackPoint ?? null;
    }

    if (!portId)
    {
        if (otherPoint)
        {
            return computeNearestEdgePoint(obj.presentation.bounds, otherPoint);
        }

        return computeObjectCenter(obj);
    }

    return resolvePortPosition(obj, portId);
}

/**
 * Computes the point on the nearest edge (N/S/E/W midpoint) of an
 * object's bounding rectangle closest to the given target point.
 *
 * @param bounds - The object's bounding rectangle.
 * @param target - The point to measure distance towards.
 * @returns The midpoint of the nearest edge.
 */
function computeNearestEdgePoint(bounds: Rect, target: Point): Point
{
    const cx = bounds.x + (bounds.width / 2);
    const cy = bounds.y + (bounds.height / 2);

    const edges: { point: Point; dist: number }[] = [
        { point: { x: cx, y: bounds.y },                       dist: 0 },
        { point: { x: cx, y: bounds.y + bounds.height },       dist: 0 },
        { point: { x: bounds.x + bounds.width, y: cy },        dist: 0 },
        { point: { x: bounds.x, y: cy },                       dist: 0 },
    ];

    for (const edge of edges)
    {
        edge.dist = pointDistanceSquared(edge.point, target);
    }

    edges.sort((a, b) => a.dist - b.dist);

    return edges[0].point;
}

/**
 * Computes the squared Euclidean distance between two points.
 * Uses squared distance to avoid an unnecessary sqrt call.
 *
 * @param a - First point.
 * @param b - Second point.
 * @returns The squared distance.
 */
function pointDistanceSquared(a: Point, b: Point): number
{
    const dx = a.x - b.x;
    const dy = a.y - b.y;

    return (dx * dx) + (dy * dy);
}

/**
 * Computes the centre point of an object's bounding rectangle.
 *
 * @param obj - The diagram object.
 * @returns The centre point in canvas coordinates.
 */
function computeObjectCenter(obj: DiagramObject): Point
{
    const b = obj.presentation.bounds;

    return {
        x: b.x + (b.width / 2),
        y: b.y + (b.height / 2)
    };
}

/**
 * Resolves a specific port's position to canvas coordinates.
 * Falls back to the object centre if the port is not found.
 *
 * @param obj - The diagram object containing the port.
 * @param portId - The port identifier to resolve.
 * @returns The port position in canvas coordinates.
 */
function resolvePortPosition(obj: DiagramObject, portId: string): Point
{
    const b = obj.presentation.bounds;
    const portNorm = findPortNormPosition(portId);

    return {
        x: b.x + (portNorm.x * b.width),
        y: b.y + (portNorm.y * b.height)
    };
}

/**
 * Maps a port ID to its normalised position. Uses the standard
 * four-port layout (N, S, E, W at midpoints).
 *
 * @param portId - The port identifier string.
 * @returns The normalised position (0-1) on the object bounds.
 */
function findPortNormPosition(portId: string): { x: number; y: number }
{
    const portMap: Record<string, { x: number; y: number }> = {
        "port-n":  { x: 0.5, y: 0 },
        "port-ne": { x: 1,   y: 0 },
        "port-e":  { x: 1,   y: 0.5 },
        "port-se": { x: 1,   y: 1 },
        "port-s":  { x: 0.5, y: 1 },
        "port-sw": { x: 0,   y: 1 },
        "port-w":  { x: 0,   y: 0.5 },
        "port-nw": { x: 0,   y: 0 },
        "port-c":  { x: 0.5, y: 0.5 }
    };

    return portMap[portId] ?? { x: 0.5, y: 0.5 };
}

// ============================================================================
// PATH COMPUTATION — ROUTING ALGORITHMS
// ============================================================================

/**
 * Computes the SVG path d attribute for a connector based on its
 * routing style and endpoint positions.
 *
 * Uses a two-pass resolution strategy so each endpoint can choose
 * the nearest edge towards the other endpoint (edge-to-edge routing).
 *
 * @param conn - The connector to compute a path for.
 * @param objects - All objects in the document for endpoint resolution.
 * @returns The SVG path d attribute string, or empty string on failure.
 */
export function computeConnectorPath(
    conn: DiagramConnector,
    objects: DiagramObject[]): string
{
    const pres = conn.presentation;
    const endpoints = resolveEndpointPair(pres, objects);

    if (!endpoints)
    {
        console.warn(CONNECTOR_LOG_PREFIX, "Cannot resolve endpoints for:", conn.id);
        return "";
    }

    return routePath(pres.routing, endpoints.src, endpoints.tgt, pres, objects);
}

/**
 * Resolves both endpoints of a connector using a two-pass approach.
 * Pass 1: resolve each endpoint using the other's centre as a
 * rough target for nearest-edge calculation.
 * Pass 2: re-resolve each endpoint using the other's pass-1
 * position for accurate edge-to-edge results.
 *
 * @param pres - The connector's presentation data.
 * @param objects - All objects in the document.
 * @returns An object with src and tgt points, or null if resolution fails.
 */
function resolveEndpointPair(
    pres: DiagramConnector["presentation"],
    objects: DiagramObject[]
): { src: Point; tgt: Point } | null
{
    const srcCenter = resolveEndpoint(
        pres.sourceId, pres.sourcePort, pres.sourcePoint, objects
    );
    const tgtCenter = resolveEndpoint(
        pres.targetId, pres.targetPort, pres.targetPoint, objects
    );

    if (!srcCenter || !tgtCenter)
    {
        return null;
    }

    const src = resolveEndpoint(
        pres.sourceId, pres.sourcePort, pres.sourcePoint, objects, tgtCenter
    );
    const tgt = resolveEndpoint(
        pres.targetId, pres.targetPort, pres.targetPoint, objects, srcCenter
    );

    if (!src || !tgt)
    {
        return null;
    }

    return { src, tgt };
}

/**
 * Dispatches to the appropriate routing algorithm based on the
 * routing style.
 *
 * @param routing - The routing algorithm to use.
 * @param src - Source point in canvas coordinates.
 * @param tgt - Target point in canvas coordinates.
 * @param pres - The connector presentation data.
 * @param objects - All objects for bounds lookups.
 * @returns The SVG path d attribute string.
 */
function routePath(
    routing: RoutingStyle,
    src: Point,
    tgt: Point,
    pres: DiagramConnector["presentation"],
    objects: DiagramObject[]): string
{
    switch (routing)
    {
        case "orthogonal":
        case "elbow":
            return orthogonalPath(src, tgt);

        case "manhattan":
        case "entity":
            return computeManhattanPath(src, tgt, pres, objects);

        case "curved":
            return curvedPath(src, tgt);

        default:
            return straightPath(src, tgt);
    }
}

/**
 * Computes a straight line path between two points.
 *
 * @param src - Source point.
 * @param tgt - Target point.
 * @returns SVG path d attribute for a straight line.
 */
export function straightPath(src: Point, tgt: Point): string
{
    return `M ${src.x} ${src.y} L ${tgt.x} ${tgt.y}`;
}

/**
 * Computes an orthogonal (right-angle) path between two points.
 * Routes through the horizontal midpoint for clean right-angle segments.
 *
 * @param src - Source point.
 * @param tgt - Target point.
 * @returns SVG path d attribute with right-angle segments.
 */
export function orthogonalPath(src: Point, tgt: Point): string
{
    const midX = (src.x + tgt.x) / 2;

    return `M ${src.x} ${src.y} L ${midX} ${src.y} L ${midX} ${tgt.y} L ${tgt.x} ${tgt.y}`;
}

/**
 * Computes a smooth cubic Bezier curve between two points.
 * Control points are placed at 40% of the horizontal distance.
 *
 * @param src - Source point.
 * @param tgt - Target point.
 * @returns SVG path d attribute for a curved connector.
 */
function curvedPath(src: Point, tgt: Point): string
{
    const dx = (tgt.x - src.x) * 0.4;

    return `M ${src.x} ${src.y} C ${src.x + dx} ${src.y}, ${tgt.x - dx} ${tgt.y}, ${tgt.x} ${tgt.y}`;
}

/**
 * Orchestrates manhattan routing by resolving source and target
 * object bounds and delegating to the core algorithm.
 *
 * @param src - Source point.
 * @param tgt - Target point.
 * @param pres - Connector presentation data for object ID lookup.
 * @param objects - All objects for bounds resolution.
 * @returns SVG path d attribute with manhattan routing.
 */
function computeManhattanPath(
    src: Point,
    tgt: Point,
    pres: DiagramConnector["presentation"],
    objects: DiagramObject[]): string
{
    const srcObj = objects.find((o) => o.id === pres.sourceId);
    const tgtObj = objects.find((o) => o.id === pres.targetId);

    const srcBounds = srcObj?.presentation.bounds ?? { x: src.x, y: src.y, width: 0, height: 0 };
    const tgtBounds = tgtObj?.presentation.bounds ?? { x: tgt.x, y: tgt.y, width: 0, height: 0 };

    return manhattanPath(src, tgt, srcBounds, tgtBounds);
}

/**
 * Computes a manhattan-routed path that avoids overlapping object
 * bounds. Routes with a margin around the source and target objects
 * using right-angle segments only.
 *
 * @param src - Source point in canvas coordinates.
 * @param tgt - Target point in canvas coordinates.
 * @param srcBounds - Bounding rectangle of the source object.
 * @param tgtBounds - Bounding rectangle of the target object.
 * @returns SVG path d attribute with manhattan routing.
 */
export function manhattanPath(
    src: Point,
    tgt: Point,
    srcBounds: Rect,
    tgtBounds: Rect): string
{
    const srcExit = computeExitPoint(src, srcBounds);
    const tgtEntry = computeEntryPoint(tgt, tgtBounds);

    return buildManhattanSegments(src, srcExit, tgtEntry, tgt);
}

/**
 * Computes the exit point from the source object with margin.
 *
 * @param src - The source port position.
 * @param bounds - The source object's bounding rectangle.
 * @returns A point offset from the object edge by the margin.
 */
function computeExitPoint(src: Point, bounds: Rect): Point
{
    const cx = bounds.x + (bounds.width / 2);

    if (src.y <= bounds.y)
    {
        return { x: src.x, y: bounds.y - MANHATTAN_MARGIN };
    }

    if (src.y >= bounds.y + bounds.height)
    {
        return { x: src.x, y: bounds.y + bounds.height + MANHATTAN_MARGIN };
    }

    if (src.x >= cx)
    {
        return { x: bounds.x + bounds.width + MANHATTAN_MARGIN, y: src.y };
    }

    return { x: bounds.x - MANHATTAN_MARGIN, y: src.y };
}

/**
 * Computes the entry point into the target object with margin.
 *
 * @param tgt - The target port position.
 * @param bounds - The target object's bounding rectangle.
 * @returns A point offset from the object edge by the margin.
 */
function computeEntryPoint(tgt: Point, bounds: Rect): Point
{
    const cx = bounds.x + (bounds.width / 2);

    if (tgt.y <= bounds.y)
    {
        return { x: tgt.x, y: bounds.y - MANHATTAN_MARGIN };
    }

    if (tgt.y >= bounds.y + bounds.height)
    {
        return { x: tgt.x, y: bounds.y + bounds.height + MANHATTAN_MARGIN };
    }

    if (tgt.x >= cx)
    {
        return { x: bounds.x + bounds.width + MANHATTAN_MARGIN, y: tgt.y };
    }

    return { x: bounds.x - MANHATTAN_MARGIN, y: tgt.y };
}

/**
 * Builds the SVG path segments connecting source exit, intermediate
 * waypoints, and target entry using only right-angle segments.
 *
 * @param src - Source port point.
 * @param srcExit - Exit point with margin from source.
 * @param tgtEntry - Entry point with margin to target.
 * @param tgt - Target port point.
 * @returns SVG path d attribute string.
 */
function buildManhattanSegments(
    src: Point,
    srcExit: Point,
    tgtEntry: Point,
    tgt: Point): string
{
    const midY = (srcExit.y + tgtEntry.y) / 2;

    const parts = [
        `M ${src.x} ${src.y}`,
        `L ${srcExit.x} ${srcExit.y}`,
        `L ${srcExit.x} ${midY}`,
        `L ${tgtEntry.x} ${midY}`,
        `L ${tgtEntry.x} ${tgtEntry.y}`,
        `L ${tgt.x} ${tgt.y}`
    ];

    return parts.join(" ");
}

// ============================================================================
// LABEL POSITIONING
// ============================================================================

/**
 * Interpolates a point along a straight line between two endpoints.
 *
 * @param src - Start point of the line.
 * @param tgt - End point of the line.
 * @param t - Parameter from 0 (source) to 1 (target).
 * @returns The interpolated point on the line.
 */
export function getPointOnPath(src: Point, tgt: Point, t: number): Point
{
    return {
        x: src.x + ((tgt.x - src.x) * t),
        y: src.y + ((tgt.y - src.y) * t)
    };
}

/**
 * Converts a named label position to a numeric parameter value.
 *
 * @param position - Named position or numeric value (0-1).
 * @returns The numeric parameter for path interpolation.
 */
function resolveLabelPosition(position: "start" | "middle" | "end" | number): number
{
    if (typeof position === "number")
    {
        return position;
    }

    switch (position)
    {
        case "start": return LABEL_POS_START;
        case "middle": return LABEL_POS_MIDDLE;
        case "end": return LABEL_POS_END;
        default: return LABEL_POS_MIDDLE;
    }
}

// ============================================================================
// CONNECTOR RENDERING
// ============================================================================

/**
 * Creates a complete SVG group element for a connector, including
 * the path line, arrow markers, and any labels.
 *
 * @param conn - The connector to render.
 * @param objects - All objects in the document for endpoint resolution.
 * @param defsEl - The SVG defs element for marker definitions.
 * @returns An SVG group element representing the connector.
 */
export function renderConnectorToSvg(
    conn: DiagramConnector,
    objects: DiagramObject[],
    defsEl: SVGElement): SVGElement
{
    const g = document.createElementNS(CONNECTOR_SVG_NS, "g");

    g.setAttribute("data-connector-id", conn.id);
    g.setAttribute("class", "de-connector");

    const pathD = computeConnectorPath(conn, objects);

    if (!pathD)
    {
        return g;
    }

    const pathEl = createConnectorPath(conn, pathD, defsEl);

    g.appendChild(pathEl);

    appendConnectorLabels(g, conn, objects);

    return g;
}

/**
 * Creates the SVG path element for a connector with stroke styles
 * and arrow markers applied.
 *
 * @param conn - The connector for style information.
 * @param pathD - The computed SVG path d attribute.
 * @param defsEl - The defs element for marker creation.
 * @returns A styled SVG path element.
 */
function createConnectorPath(
    conn: DiagramConnector,
    pathD: string,
    defsEl: SVGElement): SVGElement
{
    const path = document.createElementNS(CONNECTOR_SVG_NS, "path");
    const style = conn.presentation.style;

    path.setAttribute("d", pathD);
    path.setAttribute("fill", "none");

    applyConnectorStroke(path, style, defsEl);
    applyArrowMarkers(path, style, defsEl);

    return path;
}

/**
 * Applies stroke styling (colour, width, dash pattern) to a
 * connector path element.
 *
 * @param path - The SVG path element.
 * @param style - The connector style settings.
 */
function applyConnectorStroke(
    path: SVGElement,
    style: ConnectorStyle,
    defsEl?: SVGElement
): void
{
    if (typeof style.color === "string")
    {
        path.setAttribute("stroke", style.color);
    }
    else if (style.color && typeof style.color === "object" && defsEl)
    {
        applyGradientStrokeToConnector(path, style.color, defsEl);
    }
    else
    {
        path.setAttribute("stroke", DEFAULT_CONNECTOR_COLOR);
    }

    path.setAttribute("stroke-width", String(style.width ?? DEFAULT_CONNECTOR_WIDTH));

    if (style.lineCap)
    {
        path.setAttribute("stroke-linecap", style.lineCap);
    }

    if (style.lineJoin)
    {
        path.setAttribute("stroke-linejoin", style.lineJoin);
    }

    if (style.dashPattern && style.dashPattern.length > 0)
    {
        path.setAttribute("stroke-dasharray", style.dashPattern.join(" "));
    }
}

/**
 * Applies a gradient stroke colour to a connector path element.
 * Inserts the gradient definition into the shared defs element.
 *
 * @param path - The SVG path element.
 * @param gradient - The gradient definition.
 * @param defsEl - The shared SVG defs element.
 */
function applyGradientStrokeToConnector(
    path: SVGElement,
    gradient: GradientDefinition,
    defsEl: SVGElement
): void
{
    const gradientId = "conn-stroke-" + Math.random().toString(36).substring(2, 10);
    const gradEl = buildGradientElement(gradient, gradientId);

    defsEl.appendChild(gradEl);
    path.setAttribute("stroke", `url(#${gradientId})`);
}

/**
 * Applies start and end arrow markers to a connector path element.
 * Creates the marker definitions in defs if they do not exist.
 *
 * @param path - The SVG path element.
 * @param style - The connector style with arrow type settings.
 * @param defsEl - The SVG defs element for marker creation.
 */
function applyArrowMarkers(
    path: SVGElement,
    style: ConnectorStyle,
    defsEl: SVGElement): void
{
    if (style.startArrow && style.startArrow !== "none")
    {
        const markerId = ensureArrowMarker(defsEl, style.startArrow);

        path.setAttribute("marker-start", `url(#${markerId})`);
    }

    if (style.endArrow && style.endArrow !== "none")
    {
        const markerId = ensureArrowMarker(defsEl, style.endArrow);

        path.setAttribute("marker-end", `url(#${markerId})`);
    }
}

/**
 * Appends label elements to a connector group. Each label is
 * positioned along the connector path according to its position
 * property.
 *
 * @param g - The connector's SVG group element.
 * @param conn - The connector with label definitions.
 * @param objects - All objects for endpoint resolution.
 */
function appendConnectorLabels(
    g: SVGElement,
    conn: DiagramConnector,
    objects: DiagramObject[]): void
{
    if (!conn.presentation.labels || conn.presentation.labels.length === 0)
    {
        return;
    }

    const endpoints = resolveConnectorEndpoints(conn, objects);

    if (!endpoints)
    {
        return;
    }

    for (const label of conn.presentation.labels)
    {
        const labelEl = createLabelElement(label, endpoints.src, endpoints.tgt);

        g.appendChild(labelEl);
    }
}

/**
 * Resolves both source and target endpoints for a connector.
 * Delegates to the two-pass resolveEndpointPair for edge-to-edge
 * accuracy.
 *
 * @param conn - The connector to resolve endpoints for.
 * @param objects - All objects in the document.
 * @returns An object with src and tgt points, or null if resolution fails.
 */
function resolveConnectorEndpoints(
    conn: DiagramConnector,
    objects: DiagramObject[]
): { src: Point; tgt: Point } | null
{
    return resolveEndpointPair(conn.presentation, objects);
}

/**
 * Creates an SVG foreignObject element for a connector label,
 * positioned at the correct point along the connector path.
 *
 * @param label - The connector label definition.
 * @param src - Source endpoint of the connector.
 * @param tgt - Target endpoint of the connector.
 * @returns An SVG foreignObject element containing the label text.
 */
function createLabelElement(
    label: ConnectorLabel,
    src: Point,
    tgt: Point): SVGElement
{
    const t = resolveLabelPosition(label.position);
    const pos = getPointOnPath(src, tgt, t);
    const padding = label.padding ?? LABEL_DEFAULT_PADDING;

    const fo = document.createElementNS(CONNECTOR_SVG_NS, "foreignObject");

    fo.setAttribute("x", String(pos.x - 40));
    fo.setAttribute("y", String(pos.y - 12));
    fo.setAttribute("width", "80");
    fo.setAttribute("height", "24");
    fo.setAttribute("class", "de-connector-label");

    const div = buildLabelDiv(label, padding);

    fo.appendChild(div);

    return fo;
}

/**
 * Builds the HTML div container for a connector label with styling.
 *
 * @param label - The connector label definition.
 * @param padding - Inner padding for the label.
 * @returns An HTML div element with the label text content.
 */
function buildLabelDiv(label: ConnectorLabel, padding: number): HTMLDivElement
{
    const div = document.createElementNS(CONNECTOR_XHTML_NS, "div") as HTMLDivElement;

    div.setAttribute("xmlns", CONNECTOR_XHTML_NS);

    const styles = [
        "text-align: center",
        "font-size: 11px",
        "line-height: 1.2",
        "white-space: nowrap",
        "overflow: hidden",
        "text-overflow: ellipsis",
        `padding: ${padding}px`
    ];

    div.setAttribute("style", styles.join("; "));

    const text = extractLabelText(label);

    div.textContent = text;

    return div;
}

/**
 * Extracts plain text from a label's TextContent runs.
 *
 * @param label - The connector label.
 * @returns The concatenated plain text string.
 */
function extractLabelText(label: ConnectorLabel): string
{
    const runs = label.textContent.runs ?? [];

    return runs
        .filter((r): r is TextRun => "text" in r)
        .map((r) => r.text)
        .join("");
}
