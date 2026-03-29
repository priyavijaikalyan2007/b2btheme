/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: DiagramEngine — ExtendedShapes
 * PURPOSE: Ten additional shape definitions (hexagon, star, cross,
 *    parallelogram, arrow-right, chevron, callout, donut, image, icon)
 *    that extend the basic shape library. Each shape provides render,
 *    hitTest, ports, handles, text regions, and outline path.
 * RELATES: [[DiagramEngine]], [[ShapeRegistry]], [[ShapeDefinition]]
 * FLOW: [registerExtendedShapes()] -> [ShapeRegistry.register()] -> [Engine]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

const EXTENDED_LOG_PREFIX = "[ExtendedShapes]";

function logExtendedInfo(...args: unknown[]): void
{
    console.log(new Date().toISOString(), "[INFO]", EXTENDED_LOG_PREFIX, ...args);
}

function logExtendedWarn(...args: unknown[]): void
{
    console.warn(new Date().toISOString(), "[WARN]", EXTENDED_LOG_PREFIX, ...args);
}

function logExtendedError(...args: unknown[]): void
{
    console.error(new Date().toISOString(), "[ERROR]", EXTENDED_LOG_PREFIX, ...args);
}

function logExtendedDebug(...args: unknown[]): void
{
    console.debug(new Date().toISOString(), "[DEBUG]", EXTENDED_LOG_PREFIX, ...args);
}

/** Category identifier for extended shapes in the stencil palette. */
const EXTENDED_CATEGORY = "extended";

/** Inset in pixels for text regions to clear stroke area. */
const EXT_TEXT_INSET = 6;

// ============================================================================
// SHARED HELPERS
// ============================================================================

/**
 * Creates an inset copy of a rectangle, shrinking each edge by the
 * given number of pixels.
 *
 * @param bounds - Original bounding rectangle.
 * @param inset - Number of pixels to inset on each side.
 * @returns A new Rect inset from the original.
 */
function extInsetRect(bounds: Rect, inset: number): Rect
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
 * Tests whether a point lies inside a convex or concave polygon
 * using the ray-casting algorithm. Counts crossings of a horizontal
 * ray from the point to +infinity.
 *
 * @param point - The point to test.
 * @param vertices - Array of polygon vertices in order.
 * @returns true if the point is inside the polygon.
 */
function polygonHitTest(point: Point, vertices: Point[]): boolean
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
 * Converts an array of points into an SVG path data string.
 *
 * @param vertices - Array of polygon vertices.
 * @returns SVG path data string with M, L, and Z commands.
 */
function verticesToPathData(vertices: Point[]): string
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

// ============================================================================
// HEXAGON
// ============================================================================

/**
 * Computes the six vertices of a regular hexagon with 25% inset
 * on the left and right sides.
 *
 * @param bounds - Bounding rectangle containing the hexagon.
 * @returns Array of six Point values forming the hexagon.
 */
function hexagonVertices(bounds: Rect): Point[]
{
    const x = bounds.x;
    const y = bounds.y;
    const w = bounds.width;
    const h = bounds.height;
    const inset = w * 0.25;

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
 * Renders a hexagon SVG path with fill and stroke applied.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the hexagon path.
 */
function renderHexagon(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const d = verticesToPathData(hexagonVertices(ctx.bounds));
    const path = svgCreate("path", { d });

    g.appendChild(path);
    applyFillToSvg(path, ctx.style.fill);
    applyStrokeToSvg(path, ctx.style.stroke);

    return g;
}

/**
 * Returns inset text regions for a hexagon.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single inset text region.
 */
function hexagonTextRegions(bounds: Rect): TextRegion[]
{
    const insetX = bounds.width * 0.25;

    return [
        {
            id: "text-main",
            bounds: {
                x: bounds.x + insetX,
                y: bounds.y + EXT_TEXT_INSET,
                width: bounds.width - (2 * insetX),
                height: bounds.height - (2 * EXT_TEXT_INSET)
            }
        }
    ];
}

/**
 * Builds the hexagon ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for hexagons.
 */
function buildHexagonShape(): ShapeDefinition
{
    return {
        type: "hexagon",
        category: EXTENDED_CATEGORY,
        label: "Hexagon",
        icon: "bi-hexagon",
        defaultSize: { w: 120, h: 100 },
        minSize: { w: 30, h: 20 },
        render: renderHexagon,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) =>
            polygonHitTest(point, hexagonVertices(bounds)),
        getTextRegions: (bounds: Rect) => hexagonTextRegions(bounds),
        getOutlinePath: (bounds: Rect) =>
            verticesToPathData(hexagonVertices(bounds))
    };
}

// ============================================================================
// STAR
// ============================================================================

/**
 * Computes the vertices of a 5-point star using outer and inner radii.
 * The star has 10 vertices alternating between outer and inner rings.
 *
 * @param bounds - Bounding rectangle containing the star.
 * @returns Array of ten Point values forming the star.
 */
function starVertices(bounds: Rect): Point[]
{
    const cx = bounds.x + (bounds.width / 2);
    const cy = bounds.y + (bounds.height / 2);
    const outerRx = bounds.width / 2;
    const outerRy = bounds.height / 2;
    const innerRatio = 0.38;
    const innerRx = outerRx * innerRatio;
    const innerRy = outerRy * innerRatio;

    return buildStarPoints(cx, cy, outerRx, outerRy, innerRx, innerRy);
}

/**
 * Generates the 10 alternating outer/inner points of a 5-point star.
 *
 * @param cx - Centre X coordinate.
 * @param cy - Centre Y coordinate.
 * @param outerRx - Outer horizontal radius.
 * @param outerRy - Outer vertical radius.
 * @param innerRx - Inner horizontal radius.
 * @param innerRy - Inner vertical radius.
 * @returns Array of ten Point values.
 */
function buildStarPoints(
    cx: number,
    cy: number,
    outerRx: number,
    outerRy: number,
    innerRx: number,
    innerRy: number): Point[]
{
    const points: Point[] = [];
    const angleStep = Math.PI / 5;
    const startAngle = -Math.PI / 2;

    for (let i = 0; i < 10; i++)
    {
        const angle = startAngle + (i * angleStep);
        const isOuter = (i % 2 === 0);
        const rx = isOuter ? outerRx : innerRx;
        const ry = isOuter ? outerRy : innerRy;

        points.push({
            x: cx + (rx * Math.cos(angle)),
            y: cy + (ry * Math.sin(angle))
        });
    }

    return points;
}

/**
 * Renders a 5-point star SVG path with fill and stroke applied.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the star path.
 */
function renderStar(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const d = verticesToPathData(starVertices(ctx.bounds));
    const path = svgCreate("path", { d });

    g.appendChild(path);
    applyFillToSvg(path, ctx.style.fill);
    applyStrokeToSvg(path, ctx.style.stroke);

    return g;
}

/**
 * Returns inset text regions for a star, positioned centrally.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single centred text region.
 */
function starTextRegions(bounds: Rect): TextRegion[]
{
    const insetFactor = 0.3;

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
 * Builds the star ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for 5-point stars.
 */
function buildStarShape(): ShapeDefinition
{
    return {
        type: "star",
        category: EXTENDED_CATEGORY,
        label: "Star",
        icon: "bi-star",
        defaultSize: { w: 100, h: 100 },
        minSize: { w: 30, h: 30 },
        render: renderStar,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) =>
            polygonHitTest(point, starVertices(bounds)),
        getTextRegions: (bounds: Rect) => starTextRegions(bounds),
        getOutlinePath: (bounds: Rect) =>
            verticesToPathData(starVertices(bounds))
    };
}

// ============================================================================
// CROSS
// ============================================================================

/**
 * Computes the 12 vertices of a plus/cross shape with arms that are
 * one-third of the total width and height.
 *
 * @param bounds - Bounding rectangle containing the cross.
 * @returns Array of twelve Point values forming the cross.
 */
function crossVertices(bounds: Rect): Point[]
{
    const x = bounds.x;
    const y = bounds.y;
    const w = bounds.width;
    const h = bounds.height;
    const armW = w / 3;
    const armH = h / 3;

    return [
        { x: x + armW,         y },
        { x: x + (2 * armW),   y },
        { x: x + (2 * armW),   y: y + armH },
        { x: x + w,            y: y + armH },
        { x: x + w,            y: y + (2 * armH) },
        { x: x + (2 * armW),   y: y + (2 * armH) },
        { x: x + (2 * armW),   y: y + h },
        { x: x + armW,         y: y + h },
        { x: x + armW,         y: y + (2 * armH) },
        { x,                   y: y + (2 * armH) },
        { x,                   y: y + armH },
        { x: x + armW,         y: y + armH }
    ];
}

/**
 * Renders a cross/plus SVG path with fill and stroke applied.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the cross path.
 */
function renderCross(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const d = verticesToPathData(crossVertices(ctx.bounds));
    const path = svgCreate("path", { d });

    g.appendChild(path);
    applyFillToSvg(path, ctx.style.fill);
    applyStrokeToSvg(path, ctx.style.stroke);

    return g;
}

/**
 * Returns text regions for a cross, positioned in the central area.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single centred text region.
 */
function crossTextRegions(bounds: Rect): TextRegion[]
{
    const armW = bounds.width / 3;
    const armH = bounds.height / 3;

    return [
        {
            id: "text-main",
            bounds: {
                x: bounds.x + armW,
                y: bounds.y + armH,
                width: armW,
                height: armH
            }
        }
    ];
}

/**
 * Builds the cross ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for plus/cross shapes.
 */
function buildCrossShape(): ShapeDefinition
{
    return {
        type: "cross",
        category: EXTENDED_CATEGORY,
        label: "Cross",
        icon: "bi-plus-lg",
        defaultSize: { w: 100, h: 100 },
        minSize: { w: 30, h: 30 },
        render: renderCross,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) =>
            polygonHitTest(point, crossVertices(bounds)),
        getTextRegions: (bounds: Rect) => crossTextRegions(bounds),
        getOutlinePath: (bounds: Rect) =>
            verticesToPathData(crossVertices(bounds))
    };
}

// ============================================================================
// PARALLELOGRAM
// ============================================================================

/**
 * Computes the four vertices of a parallelogram with 20% horizontal
 * skew. The top edge is shifted right relative to the bottom edge.
 *
 * @param bounds - Bounding rectangle containing the parallelogram.
 * @returns Array of four Point values.
 */
function parallelogramVertices(bounds: Rect): Point[]
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
 * Renders a parallelogram SVG path with fill and stroke applied.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the parallelogram path.
 */
function renderParallelogram(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const d = verticesToPathData(parallelogramVertices(ctx.bounds));
    const path = svgCreate("path", { d });

    g.appendChild(path);
    applyFillToSvg(path, ctx.style.fill);
    applyStrokeToSvg(path, ctx.style.stroke);

    return g;
}

/**
 * Returns text regions for a parallelogram, inset to avoid the
 * slanted edges.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single inset text region.
 */
function parallelogramTextRegions(bounds: Rect): TextRegion[]
{
    const skew = bounds.width * 0.2;

    return [
        {
            id: "text-main",
            bounds: {
                x: bounds.x + skew,
                y: bounds.y + EXT_TEXT_INSET,
                width: bounds.width - (2 * skew),
                height: bounds.height - (2 * EXT_TEXT_INSET)
            }
        }
    ];
}

/**
 * Builds the parallelogram ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for parallelograms.
 */
function buildParallelogramShape(): ShapeDefinition
{
    return {
        type: "parallelogram",
        category: EXTENDED_CATEGORY,
        label: "Parallelogram",
        icon: "bi-parallelogram",
        defaultSize: { w: 140, h: 80 },
        minSize: { w: 40, h: 20 },
        render: renderParallelogram,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) =>
            polygonHitTest(point, parallelogramVertices(bounds)),
        getTextRegions: (bounds: Rect) => parallelogramTextRegions(bounds),
        getOutlinePath: (bounds: Rect) =>
            verticesToPathData(parallelogramVertices(bounds))
    };
}

// ============================================================================
// ARROW-RIGHT
// ============================================================================

/**
 * Computes the seven vertices of a block arrow pointing right.
 * The stem occupies the middle third vertically and extends 60%
 * of the width; the head takes the remaining 40%.
 *
 * @param bounds - Bounding rectangle containing the arrow.
 * @returns Array of seven Point values.
 */
function arrowRightVertices(bounds: Rect): Point[]
{
    const x = bounds.x;
    const y = bounds.y;
    const w = bounds.width;
    const h = bounds.height;
    const stemFrac = 0.6;
    const stemTop = y + (h / 3);
    const stemBot = y + (2 * h / 3);
    const headX = x + (w * stemFrac);
    const midY = y + (h / 2);

    return [
        { x,     y: stemTop },
        { x: headX, y: stemTop },
        { x: headX, y },
        { x: x + w, y: midY },
        { x: headX, y: y + h },
        { x: headX, y: stemBot },
        { x,     y: stemBot }
    ];
}

/**
 * Renders a right-pointing block arrow with fill and stroke.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the arrow path.
 */
function renderArrowRight(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const d = verticesToPathData(arrowRightVertices(ctx.bounds));
    const path = svgCreate("path", { d });

    g.appendChild(path);
    applyFillToSvg(path, ctx.style.fill);
    applyStrokeToSvg(path, ctx.style.stroke);

    return g;
}

/**
 * Returns text regions for a block arrow, positioned in the stem.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single text region in the stem area.
 */
function arrowRightTextRegions(bounds: Rect): TextRegion[]
{
    const stemFrac = 0.6;

    return [
        {
            id: "text-main",
            bounds: {
                x: bounds.x + EXT_TEXT_INSET,
                y: bounds.y + (bounds.height / 3),
                width: (bounds.width * stemFrac) - (2 * EXT_TEXT_INSET),
                height: bounds.height / 3
            }
        }
    ];
}

/**
 * Builds the arrow-right ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for right-pointing block arrows.
 */
function buildArrowRightShape(): ShapeDefinition
{
    return {
        type: "arrow-right",
        category: EXTENDED_CATEGORY,
        label: "Arrow Right",
        icon: "bi-arrow-right-square",
        defaultSize: { w: 140, h: 80 },
        minSize: { w: 40, h: 20 },
        render: renderArrowRight,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) =>
            polygonHitTest(point, arrowRightVertices(bounds)),
        getTextRegions: (bounds: Rect) => arrowRightTextRegions(bounds),
        getOutlinePath: (bounds: Rect) =>
            verticesToPathData(arrowRightVertices(bounds))
    };
}

// ============================================================================
// CHEVRON
// ============================================================================

/**
 * Computes the six vertices of a chevron (pentagon with a notch
 * on the left side). The notch depth is 20% of width.
 *
 * @param bounds - Bounding rectangle containing the chevron.
 * @returns Array of six Point values.
 */
function chevronVertices(bounds: Rect): Point[]
{
    const x = bounds.x;
    const y = bounds.y;
    const w = bounds.width;
    const h = bounds.height;
    const notch = w * 0.2;
    const midY = y + (h / 2);

    return [
        { x: x + notch, y },
        { x: x + w,     y },
        { x: x + w,     y: y + h },
        { x: x + notch, y: y + h },
        { x,             y: midY },
        { x: x + notch, y }
    ];
}

/**
 * Renders a chevron SVG path with fill and stroke applied.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the chevron path.
 */
function renderChevron(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const d = verticesToPathData(chevronVertices(ctx.bounds));
    const path = svgCreate("path", { d });

    g.appendChild(path);
    applyFillToSvg(path, ctx.style.fill);
    applyStrokeToSvg(path, ctx.style.stroke);

    return g;
}

/**
 * Returns text regions for a chevron, inset from the notch.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single inset text region.
 */
function chevronTextRegions(bounds: Rect): TextRegion[]
{
    const notch = bounds.width * 0.2;

    return [
        {
            id: "text-main",
            bounds: {
                x: bounds.x + notch + EXT_TEXT_INSET,
                y: bounds.y + EXT_TEXT_INSET,
                width: bounds.width - notch - (2 * EXT_TEXT_INSET),
                height: bounds.height - (2 * EXT_TEXT_INSET)
            }
        }
    ];
}

/**
 * Builds the chevron ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for chevron shapes.
 */
function buildChevronShape(): ShapeDefinition
{
    return {
        type: "chevron",
        category: EXTENDED_CATEGORY,
        label: "Chevron",
        icon: "bi-chevron-right",
        defaultSize: { w: 140, h: 60 },
        minSize: { w: 40, h: 20 },
        render: renderChevron,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) =>
            polygonHitTest(point, chevronVertices(bounds)),
        getTextRegions: (bounds: Rect) => chevronTextRegions(bounds),
        getOutlinePath: (bounds: Rect) =>
            verticesToPathData(chevronVertices(bounds))
    };
}

// ============================================================================
// CALLOUT
// ============================================================================

/** Height of the callout tail pointer in pixels. */
const CALLOUT_TAIL_HEIGHT = 12;

/** Width of the callout tail pointer in pixels. */
const CALLOUT_TAIL_WIDTH = 16;

/**
 * Computes the vertices of a callout shape: a rectangle with a
 * triangular tail pointer at the bottom-left.
 *
 * @param bounds - Bounding rectangle containing the callout.
 * @returns Array of Point values forming the callout outline.
 */
function calloutVertices(bounds: Rect): Point[]
{
    const x = bounds.x;
    const y = bounds.y;
    const w = bounds.width;
    const h = bounds.height;
    const bodyH = h - CALLOUT_TAIL_HEIGHT;
    const tailX = x + (w * 0.2);

    return [
        { x,                      y },
        { x: x + w,               y },
        { x: x + w,               y: y + bodyH },
        { x: tailX + CALLOUT_TAIL_WIDTH, y: y + bodyH },
        { x: tailX,               y: y + h },
        { x: tailX,               y: y + bodyH },
        { x,                      y: y + bodyH }
    ];
}

/**
 * Renders a callout SVG path with fill and stroke applied.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the callout path.
 */
function renderCallout(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const d = verticesToPathData(calloutVertices(ctx.bounds));
    const path = svgCreate("path", { d });

    g.appendChild(path);
    applyFillToSvg(path, ctx.style.fill);
    applyStrokeToSvg(path, ctx.style.stroke);

    return g;
}

/**
 * Returns text regions for a callout, restricted to the body area
 * above the tail pointer.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single text region in the body.
 */
function calloutTextRegions(bounds: Rect): TextRegion[]
{
    const bodyH = bounds.height - CALLOUT_TAIL_HEIGHT;

    return [
        {
            id: "text-main",
            bounds: extInsetRect({
                x: bounds.x,
                y: bounds.y,
                width: bounds.width,
                height: bodyH
            }, EXT_TEXT_INSET)
        }
    ];
}

/**
 * Builds the callout ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for callout shapes.
 */
function buildCalloutShape(): ShapeDefinition
{
    return {
        type: "callout",
        category: EXTENDED_CATEGORY,
        label: "Callout",
        icon: "bi-chat-square",
        defaultSize: { w: 160, h: 100 },
        minSize: { w: 40, h: 40 },
        render: renderCallout,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) =>
            polygonHitTest(point, calloutVertices(bounds)),
        getTextRegions: (bounds: Rect) => calloutTextRegions(bounds),
        getOutlinePath: (bounds: Rect) =>
            verticesToPathData(calloutVertices(bounds))
    };
}

// ============================================================================
// DONUT
// ============================================================================

/** Inner ring radius as a fraction of the outer radius. */
const DONUT_INNER_RATIO = 0.5;

/**
 * Renders a donut (ring) shape using two concentric ellipses
 * with an evenodd fill rule to create the hole.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the donut compound path.
 */
function renderDonut(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const d = donutPathData(ctx.bounds);
    const path = svgCreate("path", { d, "fill-rule": "evenodd" });

    g.appendChild(path);
    applyFillToSvg(path, ctx.style.fill);
    applyStrokeToSvg(path, ctx.style.stroke);

    return g;
}

/**
 * Builds the SVG path data for a donut shape: two concentric
 * ellipses drawn in opposite winding directions.
 *
 * @param bounds - Bounding rectangle of the donut.
 * @returns SVG path data string with evenodd-compatible winding.
 */
function donutPathData(bounds: Rect): string
{
    const cx = bounds.x + (bounds.width / 2);
    const cy = bounds.y + (bounds.height / 2);
    const outerRx = bounds.width / 2;
    const outerRy = bounds.height / 2;
    const innerRx = outerRx * DONUT_INNER_RATIO;
    const innerRy = outerRy * DONUT_INNER_RATIO;

    const outer = buildEllipseArcPath(cx, cy, outerRx, outerRy);
    const inner = buildEllipseArcPath(cx, cy, innerRx, innerRy);

    return `${outer} ${inner}`;
}

/**
 * Builds a closed ellipse path using two arc commands.
 *
 * @param cx - Centre X.
 * @param cy - Centre Y.
 * @param rx - Horizontal radius.
 * @param ry - Vertical radius.
 * @returns SVG path data for a complete ellipse.
 */
function buildEllipseArcPath(
    cx: number,
    cy: number,
    rx: number,
    ry: number): string
{
    return (
        `M ${cx - rx} ${cy} ` +
        `A ${rx} ${ry} 0 1 1 ${cx + rx} ${cy} ` +
        `A ${rx} ${ry} 0 1 1 ${cx - rx} ${cy} Z`
    );
}

/**
 * Tests whether a point lies inside the donut ring. The point must
 * be inside the outer ellipse but outside the inner ellipse.
 *
 * @param point - Point in canvas coordinates.
 * @param bounds - Bounding rectangle of the donut.
 * @returns true if the point is inside the ring (not the hole).
 */
function donutHitTest(point: Point, bounds: Rect): boolean
{
    const cx = bounds.x + (bounds.width / 2);
    const cy = bounds.y + (bounds.height / 2);
    const outerRx = bounds.width / 2;
    const outerRy = bounds.height / 2;

    const outerInside = isInsideEllipse(point, cx, cy, outerRx, outerRy);

    if (!outerInside)
    {
        return false;
    }

    const innerRx = outerRx * DONUT_INNER_RATIO;
    const innerRy = outerRy * DONUT_INNER_RATIO;

    return !isInsideEllipse(point, cx, cy, innerRx, innerRy);
}

/**
 * Tests whether a point lies inside an ellipse using the standard
 * equation: ((px-cx)/rx)^2 + ((py-cy)/ry)^2 <= 1.
 *
 * @param point - The point to test.
 * @param cx - Ellipse centre X.
 * @param cy - Ellipse centre Y.
 * @param rx - Horizontal radius.
 * @param ry - Vertical radius.
 * @returns true if the point is inside the ellipse.
 */
function isInsideEllipse(
    point: Point,
    cx: number,
    cy: number,
    rx: number,
    ry: number): boolean
{
    if (rx === 0 || ry === 0)
    {
        return false;
    }

    const dx = (point.x - cx) / rx;
    const dy = (point.y - cy) / ry;

    return ((dx * dx) + (dy * dy)) <= 1;
}

/**
 * Returns text regions for a donut, positioned in the top half
 * of the ring to avoid the hole.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single text region.
 */
function donutTextRegions(bounds: Rect): TextRegion[]
{
    const insetFactor = 0.15;

    return [
        {
            id: "text-main",
            bounds: {
                x: bounds.x + (bounds.width * insetFactor),
                y: bounds.y + EXT_TEXT_INSET,
                width: bounds.width * (1 - (2 * insetFactor)),
                height: (bounds.height / 2) - EXT_TEXT_INSET
            }
        }
    ];
}

/**
 * Builds the outline path for the donut (outer ellipse only).
 *
 * @param bounds - Current bounding rectangle.
 * @returns SVG path data for the outer ellipse.
 */
function donutOutlinePath(bounds: Rect): string
{
    const cx = bounds.x + (bounds.width / 2);
    const cy = bounds.y + (bounds.height / 2);
    const rx = bounds.width / 2;
    const ry = bounds.height / 2;

    return buildEllipseArcPath(cx, cy, rx, ry);
}

/**
 * Builds the donut ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for donut/ring shapes.
 */
function buildDonutShape(): ShapeDefinition
{
    return {
        type: "donut",
        category: EXTENDED_CATEGORY,
        label: "Donut",
        icon: "bi-record-circle",
        defaultSize: { w: 100, h: 100 },
        minSize: { w: 40, h: 40 },
        render: renderDonut,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) =>
            donutHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => donutTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => donutOutlinePath(bounds)
    };
}

// ============================================================================
// IMAGE
// ============================================================================

/**
 * Renders an image placeholder shape: a rectangle with a centred
 * image icon glyph indicating that an image can be placed here.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the placeholder rectangle and icon.
 */
function renderImage(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");

    const rect = buildImageRect(ctx);
    g.appendChild(rect);

    const icon = buildImageIcon(ctx.bounds);
    g.appendChild(icon);

    return g;
}

/**
 * Builds the background rectangle for the image placeholder.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG rect element with fill and stroke applied.
 */
function buildImageRect(ctx: ShapeRenderContext): SVGElement
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
 * Builds the centred image icon glyph for the placeholder.
 *
 * @param bounds - Bounding rectangle of the shape.
 * @returns SVG text element displaying an image icon.
 */
function buildImageIcon(bounds: Rect): SVGElement
{
    const cx = bounds.x + (bounds.width / 2);
    const cy = bounds.y + (bounds.height / 2);
    const fontSize = Math.min(bounds.width, bounds.height) * 0.3;

    const text = svgCreate("text", {
        x: String(cx),
        y: String(cy),
        "text-anchor": "middle",
        "dominant-baseline": "central",
        "font-family": "bootstrap-icons",
        "font-size": String(fontSize),
        fill: "var(--theme-text-muted)",
        "pointer-events": "none"
    });

    // Bootstrap Icons "image" codepoint: U+F430
    text.textContent = "\uF430";

    return text;
}

/**
 * Returns text regions for an image shape. Images use the full
 * bounds for text overlay (caption).
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single text region.
 */
function imageTextRegions(bounds: Rect): TextRegion[]
{
    return [
        {
            id: "text-main",
            bounds: extInsetRect(bounds, EXT_TEXT_INSET)
        }
    ];
}

/**
 * Returns the SVG path data for a rectangle outline (image shape).
 *
 * @param bounds - Current bounding rectangle.
 * @returns SVG path data string.
 */
function imageOutlinePath(bounds: Rect): string
{
    const x = bounds.x;
    const y = bounds.y;
    const w = bounds.width;
    const h = bounds.height;

    return `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
}

/**
 * Builds the image ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for image placeholder shapes.
 */
function buildImageShape(): ShapeDefinition
{
    return {
        type: "image",
        category: EXTENDED_CATEGORY,
        label: "Image",
        icon: "bi-image",
        defaultSize: { w: 160, h: 120 },
        minSize: { w: 40, h: 40 },
        render: renderImage,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) =>
            rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => imageTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => imageOutlinePath(bounds)
    };
}

// ============================================================================
// ICON
// ============================================================================

/**
 * Renders a single icon glyph centred in its bounds. The icon
 * character is taken from the shape parameters or defaults to a
 * star icon. The glyph is rendered as SVG text using the
 * bootstrap-icons font.
 *
 * @param ctx - Shape render context with bounds, style, and params.
 * @returns SVG group containing the icon glyph.
 */
function renderIcon(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");

    const bg = buildIconBackground(ctx);
    g.appendChild(bg);

    const text = buildIconGlyph(ctx);
    g.appendChild(text);

    return g;
}

/**
 * Builds the transparent background rectangle for the icon shape.
 *
 * @param ctx - Shape render context.
 * @returns SVG rect element for hit-test area.
 */
function buildIconBackground(ctx: ShapeRenderContext): SVGElement
{
    return svgCreate("rect", {
        x: String(ctx.bounds.x),
        y: String(ctx.bounds.y),
        width: String(ctx.bounds.width),
        height: String(ctx.bounds.height),
        fill: "transparent",
        stroke: "none"
    });
}

/**
 * Builds the centred icon glyph text element.
 *
 * @param ctx - Shape render context with parameters.
 * @returns SVG text element displaying the icon glyph.
 */
function buildIconGlyph(ctx: ShapeRenderContext): SVGElement
{
    const cx = ctx.bounds.x + (ctx.bounds.width / 2);
    const cy = ctx.bounds.y + (ctx.bounds.height / 2);
    const fontSize = Math.min(ctx.bounds.width, ctx.bounds.height) * 0.6;

    // Default glyph: star (U+F586)
    const glyph = String(ctx.parameters["glyph"] ?? "\uF586");
    const fontFamily = String(ctx.parameters["fontFamily"] ?? "bootstrap-icons");

    const fillColor = ctx.style.fill?.color || "var(--theme-text-color)";

    const text = svgCreate("text", {
        x: String(cx),
        y: String(cy),
        "text-anchor": "middle",
        "dominant-baseline": "central",
        "font-family": fontFamily,
        "font-size": String(fontSize),
        fill: fillColor,
        "pointer-events": "none"
    });

    text.textContent = glyph;

    return text;
}

/**
 * Returns text regions for an icon shape. Text appears below the
 * icon in the lower portion of the bounds.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single text region.
 */
function iconTextRegions(bounds: Rect): TextRegion[]
{
    const textHeight = Math.max(0, bounds.height * 0.25);

    return [
        {
            id: "text-main",
            bounds: {
                x: bounds.x,
                y: bounds.y + bounds.height - textHeight,
                width: bounds.width,
                height: textHeight
            }
        }
    ];
}

/**
 * Returns the SVG path data for the icon shape outline (rectangle).
 *
 * @param bounds - Current bounding rectangle.
 * @returns SVG path data string.
 */
function iconOutlinePath(bounds: Rect): string
{
    const x = bounds.x;
    const y = bounds.y;
    const w = bounds.width;
    const h = bounds.height;

    return `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
}

/**
 * Builds the icon ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for icon glyph shapes.
 */
function buildIconShape(): ShapeDefinition
{
    return {
        type: "icon",
        category: EXTENDED_CATEGORY,
        label: "Icon",
        icon: "bi-emoji-smile",
        defaultSize: { w: 60, h: 60 },
        minSize: { w: 24, h: 24 },
        render: renderIcon,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: () => [],
        hitTest: (point: Point, bounds: Rect) =>
            rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => iconTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => iconOutlinePath(bounds)
    };
}

// ============================================================================
// PATH (vector pen/brush output)
// ============================================================================

/**
 * Renders a path shape using SVG path data stored in the
 * parameters.d property. Used by PenTool and BrushTool to
 * store their output as diagram objects.
 *
 * @param ctx - Shape render context with bounds and parameters.
 * @returns SVG group containing the path element.
 */
function renderPath(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const d = String(
        (ctx.parameters as unknown as Record<string, string>)["d"] ?? ""
    );

    if (!d)
    {
        return g;
    }

    const path = svgCreate("path", {
        d,
        "vector-effect": "non-scaling-stroke"
    });

    g.appendChild(path);
    applyFillToSvg(path, ctx.style.fill);
    applyStrokeToSvg(path, ctx.style.stroke);

    return g;
}

/**
 * Returns the outline path data for a path shape (rectangular bbox).
 *
 * @param bounds - Current bounding rectangle.
 * @returns SVG path data for the bounding rectangle.
 */
function pathOutline(bounds: Rect): string
{
    const x = bounds.x;
    const y = bounds.y;
    const w = bounds.width;
    const h = bounds.height;

    return `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
}

/**
 * Builds the path ShapeDefinition. The path shape reads its SVG
 * path data from parameters.d and uses bounding-box hit testing.
 *
 * @returns A complete ShapeDefinition for vector path shapes.
 */
function buildPathShape(): ShapeDefinition
{
    return {
        type: "path",
        category: EXTENDED_CATEGORY,
        label: "Path",
        icon: "bi-vector-pen",
        defaultSize: { w: 100, h: 100 },
        minSize: { w: 4, h: 4 },
        render: renderPath,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: () => [],
        hitTest: (point: Point, bounds: Rect) =>
            rectHitTest(point, bounds),
        getTextRegions: () => [],
        getOutlinePath: (bounds: Rect) => pathOutline(bounds)
    };
}

// ============================================================================
// PAINTABLE CANVAS
// ============================================================================

/** Category identifier for drawing shapes in the stencil palette. */
const DRAWING_CATEGORY = "drawing";

/**
 * Renders a paintable canvas shape: a thin dashed outline indicating
 * the paint area boundary. The actual HTML canvas is added by the
 * render engine via foreignObject.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the boundary outline.
 */
function renderPaintable(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const outline = buildPaintableOutline(ctx);

    g.appendChild(outline);

    return g;
}

/**
 * Builds the thin dashed outline element for the paintable shape
 * based on the clip shape specified in the parameters.
 *
 * @param ctx - Shape render context.
 * @returns SVG element representing the boundary outline.
 */
function buildPaintableOutline(ctx: ShapeRenderContext): SVGElement
{
    const clipShape = String(
        (ctx.parameters as unknown as Record<string, string>)["clipShape"] ?? "rectangle"
    );

    const attrs = computePaintableOutlineAttrs(ctx.bounds, clipShape);

    return svgCreate(attrs.tag, attrs.props);
}

/**
 * Computes the SVG element tag and attributes for the paintable
 * outline based on the clip shape type.
 *
 * @param b - Local bounding rectangle.
 * @param clipShape - The clip shape type string.
 * @returns Object with tag name and attribute record.
 */
function computePaintableOutlineAttrs(
    b: Rect,
    clipShape: string): { tag: string; props: Record<string, string> }
{
    const baseProps: Record<string, string> = {
        fill: "none",
        stroke: "var(--theme-text-muted, #6c757d)",
        "stroke-width": "0.5",
        "stroke-dasharray": "4 3",
        "pointer-events": "none"
    };

    if (clipShape === "circle" || clipShape === "ellipse")
    {
        return buildEllipseOutlineAttrs(b, baseProps);
    }

    if (clipShape === "triangle")
    {
        return buildTriangleOutlineAttrs(b, baseProps);
    }

    return buildRectOutlineAttrs(b, baseProps);
}

/**
 * Builds rect outline attributes for the paintable shape.
 *
 * @param b - Bounding rectangle.
 * @param baseProps - Shared style attributes.
 * @returns Tag and props for an SVG rect.
 */
function buildRectOutlineAttrs(
    b: Rect,
    baseProps: Record<string, string>
): { tag: string; props: Record<string, string> }
{
    return {
        tag: "rect",
        props: {
            ...baseProps,
            x: String(b.x),
            y: String(b.y),
            width: String(b.width),
            height: String(b.height)
        }
    };
}

/**
 * Builds ellipse outline attributes for the paintable shape.
 *
 * @param b - Bounding rectangle.
 * @param baseProps - Shared style attributes.
 * @returns Tag and props for an SVG ellipse.
 */
function buildEllipseOutlineAttrs(
    b: Rect,
    baseProps: Record<string, string>
): { tag: string; props: Record<string, string> }
{
    return {
        tag: "ellipse",
        props: {
            ...baseProps,
            cx: String(b.x + (b.width / 2)),
            cy: String(b.y + (b.height / 2)),
            rx: String(b.width / 2),
            ry: String(b.height / 2)
        }
    };
}

/**
 * Builds triangle outline attributes for the paintable shape.
 *
 * @param b - Bounding rectangle.
 * @param baseProps - Shared style attributes.
 * @returns Tag and props for an SVG polygon.
 */
function buildTriangleOutlineAttrs(
    b: Rect,
    baseProps: Record<string, string>
): { tag: string; props: Record<string, string> }
{
    const midX = b.x + (b.width / 2);
    const points = `${midX},${b.y} ${b.x + b.width},${b.y + b.height} ${b.x},${b.y + b.height}`;

    return {
        tag: "polygon",
        props: { ...baseProps, points }
    };
}

/**
 * Builds the paintable canvas ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for paintable canvas shapes.
 */
function buildPaintableShape(): ShapeDefinition
{
    return {
        type: "paintable",
        category: DRAWING_CATEGORY,
        label: "Paintable Canvas",
        icon: "bi-brush",
        defaultSize: { w: 200, h: 200 },
        minSize: { w: 40, h: 40 },
        render: renderPaintable,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: () => [],
        hitTest: (point: Point, bounds: Rect) =>
            rectHitTest(point, bounds),
        getTextRegions: () => [],
        getOutlinePath: (bounds: Rect) => paintableOutlinePath(bounds)
    };
}

/**
 * Returns the SVG path data for the paintable shape outline.
 *
 * @param bounds - Current bounding rectangle.
 * @returns SVG path data string.
 */
function paintableOutlinePath(bounds: Rect): string
{
    const x = bounds.x;
    const y = bounds.y;
    const w = bounds.width;
    const h = bounds.height;

    return `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
}

// ============================================================================
// REGISTRATION
// ============================================================================

/**
 * Registers all twelve extended shapes (hexagon, star, cross,
 * parallelogram, arrow-right, chevron, callout, donut, image,
 * icon, path, paintable) with the given shape registry.
 *
 * @param registry - The ShapeRegistry instance to populate.
 * @returns void
 */
export function registerExtendedShapes(registry: ShapeRegistry): void
{
    registry.register(buildHexagonShape());
    registry.register(buildStarShape());
    registry.register(buildCrossShape());
    registry.register(buildParallelogramShape());
    registry.register(buildArrowRightShape());
    registry.register(buildChevronShape());
    registry.register(buildCalloutShape());
    registry.register(buildDonutShape());
    registry.register(buildImageShape());
    registry.register(buildIconShape());
    registry.register(buildPathShape());
    registry.register(buildPaintableShape());

    logExtendedInfo("Registered 12 extended shapes");
}
