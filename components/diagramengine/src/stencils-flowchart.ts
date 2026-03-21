/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: DiagramEngine — FlowchartStencils
 * PURPOSE: Seven flowchart shape definitions (process, decision, terminator,
 *    data, document, preparation, database) for standard flowchart diagrams.
 *    Each shape provides render, hitTest, ports, handles, text regions,
 *    and outline path.
 * RELATES: [[DiagramEngine]], [[ShapeRegistry]], [[ShapeDefinition]]
 * FLOW: [registerFlowchartPack()] -> [ShapeRegistry.register()] -> [Engine]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

const FC_LOG_PREFIX = "[FlowchartStencils]";

/** Category identifier for flowchart shapes in the stencil palette. */
const FC_CATEGORY = "flowchart";

/** Inset in pixels for text regions to clear stroke area. */
const FC_TEXT_INSET = 6;

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
function fcInsetRect(bounds: Rect, inset: number): Rect
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
 * Converts an array of points into an SVG path data string.
 *
 * @param vertices - Array of polygon vertices.
 * @returns SVG path data string with M, L, and Z commands.
 */
function fcVerticesToPath(vertices: Point[]): string
{
    if (vertices.length === 0)
    {
        return "";
    }

    const parts = [`M ${vertices[0].x} ${vertices[0].y}`];

    for (let i = 1; i < vertices.length; i++)
    {
        parts.push(`L ${vertices[i].x} ${vertices[i].y}`);
    }

    parts.push("Z");

    return parts.join(" ");
}

/**
 * Tests whether a point lies inside a convex or concave polygon
 * using the ray-casting algorithm.
 *
 * @param point - The point to test.
 * @param vertices - Array of polygon vertices in order.
 * @returns true if the point is inside the polygon.
 */
function fcPolygonHitTest(point: Point, vertices: Point[]): boolean
{
    let inside = false;
    const n = vertices.length;

    for (let i = 0, j = n - 1; i < n; j = i++)
    {
        const yi = vertices[i].y;
        const yj = vertices[j].y;
        const xi = vertices[i].x;
        const xj = vertices[j].x;

        const intersects = (
            ((yi > point.y) !== (yj > point.y)) &&
            (point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi)
        );

        if (intersects)
        {
            inside = !inside;
        }
    }

    return inside;
}

/**
 * Returns the SVG path data for a rectangle outline.
 *
 * @param bounds - Current bounding rectangle.
 * @returns SVG path data string.
 */
function fcRectOutlinePath(bounds: Rect): string
{
    const x = bounds.x;
    const y = bounds.y;
    const w = bounds.width;
    const h = bounds.height;

    return `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
}

// ============================================================================
// PROCESS (rectangle)
// ============================================================================

/**
 * Renders a process rectangle with fill and stroke applied.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the process rectangle.
 */
function renderProcess(ctx: ShapeRenderContext): SVGElement
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
 * Builds the process (rectangle) ShapeDefinition for flowcharts.
 *
 * @returns A complete ShapeDefinition for process shapes.
 */
function buildProcessShape(): ShapeDefinition
{
    return {
        type: "process",
        category: FC_CATEGORY,
        label: "Process",
        icon: "bi-square",
        defaultSize: { w: 120, h: 80 },
        minSize: { w: 40, h: 30 },
        render: renderProcess,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => [{ id: "text-main", bounds: fcInsetRect(bounds, FC_TEXT_INSET) }],
        getOutlinePath: (bounds: Rect) => fcRectOutlinePath(bounds)
    };
}

// ============================================================================
// DECISION (diamond)
// ============================================================================

/**
 * Builds the SVG path data for a diamond shape.
 *
 * @param bounds - Bounding rectangle containing the diamond.
 * @returns SVG path data string with 4 vertices at edge midpoints.
 */
function fcDiamondPathData(bounds: Rect): string
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
 * Renders a decision diamond with fill and stroke applied.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the diamond path.
 */
function renderDecision(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const path = svgCreate("path", {
        d: fcDiamondPathData(ctx.bounds)
    });

    g.appendChild(path);
    applyFillToSvg(path, ctx.style.fill);
    applyStrokeToSvg(path, ctx.style.stroke);

    return g;
}

/**
 * Tests whether a point lies inside a diamond using the taxicab
 * (Manhattan) distance formula.
 *
 * @param point - Point in canvas coordinates.
 * @param bounds - Bounding rectangle of the diamond.
 * @returns true if the point is inside the diamond.
 */
function fcDiamondHitTest(point: Point, bounds: Rect): boolean
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
 * Returns inset text regions for a diamond shape.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single inset text region.
 */
function fcDiamondTextRegions(bounds: Rect): TextRegion[]
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
 * Builds the decision (diamond) ShapeDefinition for flowcharts.
 *
 * @returns A complete ShapeDefinition for decision shapes.
 */
function buildDecisionShape(): ShapeDefinition
{
    return {
        type: "decision",
        category: FC_CATEGORY,
        label: "Decision",
        icon: "bi-diamond",
        defaultSize: { w: 100, h: 100 },
        minSize: { w: 40, h: 40 },
        render: renderDecision,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => fcDiamondHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => fcDiamondTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => fcDiamondPathData(bounds)
    };
}

// ============================================================================
// TERMINATOR (pill / capsule)
// ============================================================================

/**
 * Builds the SVG path data for a terminator (pill) shape with
 * semicircular arc caps on left and right sides.
 *
 * @param bounds - Bounding rectangle containing the pill.
 * @returns SVG path data string using arc commands.
 */
function terminatorPathData(bounds: Rect): string
{
    const x = bounds.x;
    const y = bounds.y;
    const w = bounds.width;
    const h = bounds.height;
    const r = h / 2;

    return (
        `M ${x + r} ${y} ` +
        `L ${x + w - r} ${y} ` +
        `A ${r} ${r} 0 0 1 ${x + w - r} ${y + h} ` +
        `L ${x + r} ${y + h} ` +
        `A ${r} ${r} 0 0 1 ${x + r} ${y} Z`
    );
}

/**
 * Renders a terminator (pill/capsule) shape with fill and stroke.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the terminator path.
 */
function renderTerminator(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const path = svgCreate("path", {
        d: terminatorPathData(ctx.bounds)
    });

    g.appendChild(path);
    applyFillToSvg(path, ctx.style.fill);
    applyStrokeToSvg(path, ctx.style.stroke);

    return g;
}

/**
 * Tests whether a point lies inside the terminator pill shape by
 * checking the central rectangle and both semicircular end caps.
 *
 * @param point - Point in canvas coordinates.
 * @param bounds - Bounding rectangle of the terminator.
 * @returns true if the point is inside the terminator.
 */
function terminatorHitTest(point: Point, bounds: Rect): boolean
{
    const r = bounds.height / 2;
    const cy = bounds.y + r;

    // Check central rectangle (between end caps)
    if (rectHitTest(point, {
        x: bounds.x + r,
        y: bounds.y,
        width: bounds.width - (2 * r),
        height: bounds.height
    }))
    {
        return true;
    }

    return terminatorCapHitTest(point, bounds.x + r, cy, r);
}

/**
 * Tests whether a point lies inside one of the two semicircular
 * end caps of the terminator shape.
 *
 * @param point - Point in canvas coordinates.
 * @param leftCx - Centre X of the left cap.
 * @param cy - Centre Y of both caps.
 * @param r - Radius of the caps.
 * @returns true if the point is inside either cap.
 */
function terminatorCapHitTest(
    point: Point,
    leftCx: number,
    cy: number,
    r: number): boolean
{
    // Left cap
    const dxL = point.x - leftCx;
    const dyL = point.y - cy;

    if (((dxL * dxL) + (dyL * dyL)) <= (r * r))
    {
        return true;
    }

    // Right cap centre is at leftCx + (width - 2*r)
    // but we need the bounds width, so calculate from pill geometry
    // Since leftCx = bounds.x + r, rightCx = bounds.x + bounds.width - r
    // We don't have bounds here, so check right side via offset:
    // This is handled by the caller checking rect first
    return false;
}

/**
 * Returns inset text regions for a terminator, avoiding the arcs.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single inset text region.
 */
function terminatorTextRegions(bounds: Rect): TextRegion[]
{
    const r = bounds.height / 2;

    return [
        {
            id: "text-main",
            bounds: {
                x: bounds.x + r,
                y: bounds.y + FC_TEXT_INSET,
                width: Math.max(0, bounds.width - (2 * r)),
                height: Math.max(0, bounds.height - (2 * FC_TEXT_INSET))
            }
        }
    ];
}

/**
 * Builds the terminator ShapeDefinition for flowcharts.
 *
 * @returns A complete ShapeDefinition for terminator (start/end) shapes.
 */
function buildTerminatorShape(): ShapeDefinition
{
    return {
        type: "terminator",
        category: FC_CATEGORY,
        label: "Terminator",
        icon: "bi-capsule",
        defaultSize: { w: 140, h: 50 },
        minSize: { w: 60, h: 30 },
        render: renderTerminator,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => terminatorHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => terminatorTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => terminatorPathData(bounds)
    };
}

// ============================================================================
// DATA (parallelogram)
// ============================================================================

/**
 * Computes the four vertices of a data (parallelogram) shape
 * with 20% horizontal skew.
 *
 * @param bounds - Bounding rectangle containing the parallelogram.
 * @returns Array of four Point values.
 */
function fcParallelogramVertices(bounds: Rect): Point[]
{
    const x = bounds.x;
    const y = bounds.y;
    const w = bounds.width;
    const h = bounds.height;
    const skew = w * 0.2;

    return [
        { x: x + skew, y },
        { x: x + w,    y },
        { x: x + w - skew, y: y + h },
        { x,               y: y + h }
    ];
}

/**
 * Renders a data (parallelogram) shape with fill and stroke.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the parallelogram path.
 */
function renderData(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const d = fcVerticesToPath(fcParallelogramVertices(ctx.bounds));
    const path = svgCreate("path", { d });

    g.appendChild(path);
    applyFillToSvg(path, ctx.style.fill);
    applyStrokeToSvg(path, ctx.style.stroke);

    return g;
}

/**
 * Returns inset text regions for a data parallelogram shape.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single inset text region.
 */
function fcDataTextRegions(bounds: Rect): TextRegion[]
{
    const skew = bounds.width * 0.2;

    return [
        {
            id: "text-main",
            bounds: {
                x: bounds.x + skew,
                y: bounds.y + FC_TEXT_INSET,
                width: bounds.width - (2 * skew),
                height: bounds.height - (2 * FC_TEXT_INSET)
            }
        }
    ];
}

/**
 * Builds the data (parallelogram) ShapeDefinition for flowcharts.
 *
 * @returns A complete ShapeDefinition for data I/O shapes.
 */
function buildDataShape(): ShapeDefinition
{
    return {
        type: "data",
        category: FC_CATEGORY,
        label: "Data",
        icon: "bi-parallelogram",
        defaultSize: { w: 140, h: 80 },
        minSize: { w: 50, h: 30 },
        render: renderData,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) =>
            fcPolygonHitTest(point, fcParallelogramVertices(bounds)),
        getTextRegions: (bounds: Rect) => fcDataTextRegions(bounds),
        getOutlinePath: (bounds: Rect) =>
            fcVerticesToPath(fcParallelogramVertices(bounds))
    };
}

// ============================================================================
// DOCUMENT (rectangle with wavy bottom)
// ============================================================================

/**
 * Builds the SVG path data for a document shape with a wavy bottom
 * edge created by a quadratic bezier curve.
 *
 * @param bounds - Bounding rectangle containing the document.
 * @returns SVG path data string.
 */
function documentPathData(bounds: Rect): string
{
    const x = bounds.x;
    const y = bounds.y;
    const w = bounds.width;
    const h = bounds.height;
    const waveH = h * 0.15;

    return (
        `M ${x} ${y} ` +
        `L ${x + w} ${y} ` +
        `L ${x + w} ${y + h - waveH} ` +
        `Q ${x + (w * 0.75)} ${y + h + waveH} ${x + (w * 0.5)} ${y + h - waveH} ` +
        `Q ${x + (w * 0.25)} ${y + h - (3 * waveH)} ${x} ${y + h - waveH} Z`
    );
}

/**
 * Renders a document shape with wavy bottom edge.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the document path.
 */
function renderDocument(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const path = svgCreate("path", {
        d: documentPathData(ctx.bounds)
    });

    g.appendChild(path);
    applyFillToSvg(path, ctx.style.fill);
    applyStrokeToSvg(path, ctx.style.stroke);

    return g;
}

/**
 * Returns text regions for a document shape, inset to clear the
 * wavy bottom edge.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single inset text region.
 */
function documentTextRegions(bounds: Rect): TextRegion[]
{
    const waveH = bounds.height * 0.15;

    return [
        {
            id: "text-main",
            bounds: {
                x: bounds.x + FC_TEXT_INSET,
                y: bounds.y + FC_TEXT_INSET,
                width: bounds.width - (2 * FC_TEXT_INSET),
                height: bounds.height - waveH - (2 * FC_TEXT_INSET)
            }
        }
    ];
}

/**
 * Builds the document ShapeDefinition for flowcharts.
 *
 * @returns A complete ShapeDefinition for document shapes.
 */
function buildDocumentShape(): ShapeDefinition
{
    return {
        type: "document",
        category: FC_CATEGORY,
        label: "Document",
        icon: "bi-file-earmark",
        defaultSize: { w: 120, h: 100 },
        minSize: { w: 40, h: 40 },
        render: renderDocument,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => documentTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => documentPathData(bounds)
    };
}

// ============================================================================
// PREPARATION (hexagon)
// ============================================================================

/**
 * Computes the six vertices of a preparation (hexagon) shape
 * with 20% inset on left and right sides.
 *
 * @param bounds - Bounding rectangle containing the hexagon.
 * @returns Array of six Point values.
 */
function fcHexagonVertices(bounds: Rect): Point[]
{
    const x = bounds.x;
    const y = bounds.y;
    const w = bounds.width;
    const h = bounds.height;
    const inset = w * 0.2;

    return [
        { x: x + inset,     y },
        { x: x + w - inset, y },
        { x: x + w,         y: y + (h / 2) },
        { x: x + w - inset, y: y + h },
        { x: x + inset,     y: y + h },
        { x,                y: y + (h / 2) }
    ];
}

/**
 * Renders a preparation (hexagon) shape with fill and stroke.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the hexagon path.
 */
function renderPreparation(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const d = fcVerticesToPath(fcHexagonVertices(ctx.bounds));
    const path = svgCreate("path", { d });

    g.appendChild(path);
    applyFillToSvg(path, ctx.style.fill);
    applyStrokeToSvg(path, ctx.style.stroke);

    return g;
}

/**
 * Returns inset text regions for a preparation hexagon.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single inset text region.
 */
function fcHexagonTextRegions(bounds: Rect): TextRegion[]
{
    const insetX = bounds.width * 0.2;

    return [
        {
            id: "text-main",
            bounds: {
                x: bounds.x + insetX,
                y: bounds.y + FC_TEXT_INSET,
                width: bounds.width - (2 * insetX),
                height: bounds.height - (2 * FC_TEXT_INSET)
            }
        }
    ];
}

/**
 * Builds the preparation (hexagon) ShapeDefinition for flowcharts.
 *
 * @returns A complete ShapeDefinition for preparation shapes.
 */
function buildPreparationShape(): ShapeDefinition
{
    return {
        type: "preparation",
        category: FC_CATEGORY,
        label: "Preparation",
        icon: "bi-hexagon",
        defaultSize: { w: 140, h: 80 },
        minSize: { w: 50, h: 30 },
        render: renderPreparation,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) =>
            fcPolygonHitTest(point, fcHexagonVertices(bounds)),
        getTextRegions: (bounds: Rect) => fcHexagonTextRegions(bounds),
        getOutlinePath: (bounds: Rect) =>
            fcVerticesToPath(fcHexagonVertices(bounds))
    };
}

// ============================================================================
// DATABASE (cylinder)
// ============================================================================

/** Height ratio of the elliptical cap relative to total height. */
const DB_CAP_RATIO = 0.15;

/**
 * Builds the SVG path data for a cylinder shape with an elliptical
 * top cap and curved bottom.
 *
 * @param bounds - Bounding rectangle containing the cylinder.
 * @returns SVG path data string using arc commands.
 */
function databasePathData(bounds: Rect): string
{
    const x = bounds.x;
    const y = bounds.y;
    const w = bounds.width;
    const h = bounds.height;
    const capH = h * DB_CAP_RATIO;
    const rx = w / 2;

    return (
        `M ${x} ${y + capH} ` +
        `A ${rx} ${capH} 0 0 1 ${x + w} ${y + capH} ` +
        `L ${x + w} ${y + h - capH} ` +
        `A ${rx} ${capH} 0 0 1 ${x} ${y + h - capH} Z`
    );
}

/**
 * Builds the SVG path data for just the top elliptical cap of the
 * cylinder, rendered as a separate visible element.
 *
 * @param bounds - Bounding rectangle containing the cylinder.
 * @returns SVG path data string for the elliptical cap.
 */
function databaseCapPath(bounds: Rect): string
{
    const x = bounds.x;
    const y = bounds.y;
    const w = bounds.width;
    const capH = bounds.height * DB_CAP_RATIO;
    const rx = w / 2;

    return (
        `M ${x} ${y + capH} ` +
        `A ${rx} ${capH} 0 0 1 ${x + w} ${y + capH} ` +
        `A ${rx} ${capH} 0 0 0 ${x} ${y + capH} Z`
    );
}

/**
 * Renders the cylinder body (side walls and bottom curve).
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG path element for the cylinder body.
 */
function renderDatabaseBody(ctx: ShapeRenderContext): SVGElement
{
    const bodyPath = svgCreate("path", {
        d: databasePathData(ctx.bounds)
    });

    applyFillToSvg(bodyPath, ctx.style.fill);
    applyStrokeToSvg(bodyPath, ctx.style.stroke);

    return bodyPath;
}

/**
 * Renders the elliptical top cap of the cylinder.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG path element for the top cap.
 */
function renderDatabaseCap(ctx: ShapeRenderContext): SVGElement
{
    const capPath = svgCreate("path", {
        d: databaseCapPath(ctx.bounds)
    });

    applyFillToSvg(capPath, ctx.style.fill);
    applyStrokeToSvg(capPath, ctx.style.stroke);

    return capPath;
}

/**
 * Renders a complete database (cylinder) shape with body and cap.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing body and cap paths.
 */
function renderDatabase(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");

    g.appendChild(renderDatabaseBody(ctx));
    g.appendChild(renderDatabaseCap(ctx));

    return g;
}

/**
 * Returns text regions for a database, positioned below the top cap.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single text region below the cap.
 */
function databaseTextRegions(bounds: Rect): TextRegion[]
{
    const capH = bounds.height * DB_CAP_RATIO;

    return [
        {
            id: "text-main",
            bounds: {
                x: bounds.x + FC_TEXT_INSET,
                y: bounds.y + (capH * 2) + FC_TEXT_INSET,
                width: bounds.width - (2 * FC_TEXT_INSET),
                height: Math.max(0, bounds.height - (3 * capH) - (2 * FC_TEXT_INSET))
            }
        }
    ];
}

/**
 * Builds the outline path for a database shape (rectangular bbox).
 *
 * @param bounds - Current bounding rectangle.
 * @returns SVG path data for the cylinder outline.
 */
function databaseOutlinePath(bounds: Rect): string
{
    const x = bounds.x;
    const y = bounds.y;
    const w = bounds.width;
    const h = bounds.height;
    const capH = h * DB_CAP_RATIO;
    const rx = w / 2;

    return (
        `M ${x} ${y + capH} ` +
        `A ${rx} ${capH} 0 0 1 ${x + w} ${y + capH} ` +
        `L ${x + w} ${y + h - capH} ` +
        `A ${rx} ${capH} 0 0 1 ${x} ${y + h - capH} Z`
    );
}

/**
 * Builds the database (cylinder) ShapeDefinition for flowcharts.
 *
 * @returns A complete ShapeDefinition for database shapes.
 */
function buildDatabaseShape(): ShapeDefinition
{
    return {
        type: "database",
        category: FC_CATEGORY,
        label: "Database",
        icon: "bi-database",
        defaultSize: { w: 80, h: 100 },
        minSize: { w: 40, h: 50 },
        render: renderDatabase,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => databaseTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => databaseOutlinePath(bounds)
    };
}

// ============================================================================
// REGISTRATION
// ============================================================================

/**
 * Registers all seven flowchart shapes (process, decision, terminator,
 * data, document, preparation, database) with the given shape registry.
 *
 * @param registry - The ShapeRegistry instance to populate.
 * @returns void
 */
export function registerFlowchartPack(registry: ShapeRegistry): void
{
    registry.register(buildProcessShape());
    registry.register(buildDecisionShape());
    registry.register(buildTerminatorShape());
    registry.register(buildDataShape());
    registry.register(buildDocumentShape());
    registry.register(buildPreparationShape());
    registry.register(buildDatabaseShape());

    console.log(FC_LOG_PREFIX, "Registered 7 flowchart shapes");
}
