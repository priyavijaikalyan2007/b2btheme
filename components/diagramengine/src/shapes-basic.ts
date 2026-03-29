/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: DiagramEngine — BasicShapes
 * 📜 PURPOSE: Five fundamental shape definitions (rectangle, ellipse, diamond,
 *    triangle, text) that form the core shape library. Each shape provides
 *    render, hitTest, ports, handles, text regions, and outline path.
 * 🔗 RELATES: [[DiagramEngine]], [[ShapeRegistry]], [[ShapeDefinition]]
 * ⚡ FLOW: [registerBasicShapes()] -> [ShapeRegistry.register()] -> [Engine]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

const BASIC_LOG_PREFIX = "[BasicShapes]";

function logBasicInfo(...args: unknown[]): void
{
    console.log(new Date().toISOString(), "[INFO]", BASIC_LOG_PREFIX, ...args);
}

function logBasicWarn(...args: unknown[]): void
{
    console.warn(new Date().toISOString(), "[WARN]", BASIC_LOG_PREFIX, ...args);
}

function logBasicError(...args: unknown[]): void
{
    console.error(new Date().toISOString(), "[ERROR]", BASIC_LOG_PREFIX, ...args);
}

function logBasicDebug(...args: unknown[]): void
{
    console.debug(new Date().toISOString(), "[DEBUG]", BASIC_LOG_PREFIX, ...args);
}

/** Category identifier for all basic shapes in the stencil palette. */
const BASIC_CATEGORY = "basic";

/** Inset in pixels for text regions to clear stroke area. */
const TEXT_INSET = 6;

// ============================================================================
// RECTANGLE
// ============================================================================

/**
 * Renders a rectangle SVG element with fill and stroke applied.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the rectangle.
 */
function renderRectangle(ctx: ShapeRenderContext): SVGElement
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
 * Returns inset text regions for a rectangle, leaving margin for stroke.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single inset text region.
 */
function rectTextRegions(bounds: Rect): TextRegion[]
{
    return [
        {
            id: "text-main",
            bounds: insetRect(bounds, TEXT_INSET)
        }
    ];
}

/**
 * Returns the SVG path data for a rectangle outline.
 *
 * @param bounds - Current bounding rectangle.
 * @returns SVG path data string.
 */
function rectOutlinePath(bounds: Rect): string
{
    const x = bounds.x;
    const y = bounds.y;
    const w = bounds.width;
    const h = bounds.height;

    return `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
}

/**
 * Builds the rectangle ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for rectangles.
 */
export function buildRectangleShape(): ShapeDefinition
{
    return {
        type: "rectangle",
        category: BASIC_CATEGORY,
        label: "Rectangle",
        icon: "bi-square",
        defaultSize: { w: 120, h: 80 },
        minSize: { w: 20, h: 20 },
        render: renderRectangle,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => rectTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => rectOutlinePath(bounds)
    };
}

// ============================================================================
// ELLIPSE
// ============================================================================

/**
 * Renders an ellipse SVG element with fill and stroke applied.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the ellipse.
 */
function renderEllipse(ctx: ShapeRenderContext): SVGElement
{
    const cx = ctx.bounds.x + (ctx.bounds.width / 2);
    const cy = ctx.bounds.y + (ctx.bounds.height / 2);
    const rx = ctx.bounds.width / 2;
    const ry = ctx.bounds.height / 2;

    const g = svgCreate("g");
    const ellipse = svgCreate("ellipse", {
        cx: String(cx),
        cy: String(cy),
        rx: String(rx),
        ry: String(ry)
    });

    g.appendChild(ellipse);
    applyFillToSvg(ellipse, ctx.style.fill);
    applyStrokeToSvg(ellipse, ctx.style.stroke);

    return g;
}

/**
 * Tests whether a point lies inside an ellipse using the standard
 * ellipse equation: ((px-cx)/rx)^2 + ((py-cy)/ry)^2 <= 1.
 *
 * @param point - Point in canvas coordinates.
 * @param bounds - Bounding rectangle of the ellipse.
 * @returns true if the point is inside the ellipse.
 */
function ellipseHitTest(point: Point, bounds: Rect): boolean
{
    const cx = bounds.x + (bounds.width / 2);
    const cy = bounds.y + (bounds.height / 2);
    const rx = bounds.width / 2;
    const ry = bounds.height / 2;

    if (rx === 0 || ry === 0)
    {
        return false;
    }

    const dx = (point.x - cx) / rx;
    const dy = (point.y - cy) / ry;

    return ((dx * dx) + (dy * dy)) <= 1;
}

/**
 * Returns text regions for an ellipse, inset further than rectangle
 * to account for the curved boundary.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single inset text region.
 */
function ellipseTextRegions(bounds: Rect): TextRegion[]
{
    // Inscribed rectangle within ellipse is ~70.7% of each axis
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
 * Builds an SVG path approximation of an ellipse using four arc commands.
 *
 * @param bounds - Current bounding rectangle.
 * @returns SVG path data string.
 */
function ellipseOutlinePath(bounds: Rect): string
{
    const cx = bounds.x + (bounds.width / 2);
    const cy = bounds.y + (bounds.height / 2);
    const rx = bounds.width / 2;
    const ry = bounds.height / 2;

    return (
        `M ${cx - rx} ${cy} ` +
        `A ${rx} ${ry} 0 1 1 ${cx + rx} ${cy} ` +
        `A ${rx} ${ry} 0 1 1 ${cx - rx} ${cy} Z`
    );
}

/**
 * Builds the ellipse ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for ellipses.
 */
export function buildEllipseShape(): ShapeDefinition
{
    return {
        type: "ellipse",
        category: BASIC_CATEGORY,
        label: "Ellipse",
        icon: "bi-circle",
        defaultSize: { w: 120, h: 80 },
        minSize: { w: 20, h: 20 },
        render: renderEllipse,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => ellipseHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => ellipseTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => ellipseOutlinePath(bounds)
    };
}

// ============================================================================
// DIAMOND
// ============================================================================

/**
 * Builds the SVG path data for a diamond (rotated square) shape.
 *
 * @param bounds - Bounding rectangle containing the diamond.
 * @returns SVG path data string with 4 vertices at edge midpoints.
 */
function diamondPathData(bounds: Rect): string
{
    const cx = bounds.x + (bounds.width / 2);
    const cy = bounds.y + (bounds.height / 2);
    const top = bounds.y;
    const right = bounds.x + bounds.width;
    const bottom = bounds.y + bounds.height;
    const left = bounds.x;

    return `M ${cx} ${top} L ${right} ${cy} L ${cx} ${bottom} L ${left} ${cy} Z`;
}

/**
 * Renders a diamond SVG path element with fill and stroke applied.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the diamond path.
 */
function renderDiamond(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const path = svgCreate("path", {
        d: diamondPathData(ctx.bounds)
    });

    g.appendChild(path);
    applyFillToSvg(path, ctx.style.fill);
    applyStrokeToSvg(path, ctx.style.stroke);

    return g;
}

/**
 * Tests whether a point lies inside a diamond using the taxicab
 * (Manhattan) distance formula: |dx/half_w| + |dy/half_h| <= 1.
 *
 * @param point - Point in canvas coordinates.
 * @param bounds - Bounding rectangle of the diamond.
 * @returns true if the point is inside the diamond.
 */
function diamondHitTest(point: Point, bounds: Rect): boolean
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
 * Returns text regions for a diamond, heavily inset to fit within
 * the diagonal boundaries.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single inset text region.
 */
function diamondTextRegions(bounds: Rect): TextRegion[]
{
    // Inscribed rectangle within a diamond is 50% of each axis
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
 * Builds the diamond ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for diamonds.
 */
export function buildDiamondShape(): ShapeDefinition
{
    return {
        type: "diamond",
        category: BASIC_CATEGORY,
        label: "Diamond",
        icon: "bi-diamond",
        defaultSize: { w: 100, h: 100 },
        minSize: { w: 30, h: 30 },
        render: renderDiamond,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => diamondHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => diamondTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => diamondPathData(bounds)
    };
}

// ============================================================================
// TRIANGLE
// ============================================================================

/**
 * Computes the three vertices of an equilateral-ish triangle that
 * fits within the given bounding rectangle. Top-centre, bottom-left,
 * bottom-right.
 *
 * @param bounds - Bounding rectangle containing the triangle.
 * @returns Object with top, bottomLeft, and bottomRight Point values.
 */
function triangleVertices(bounds: Rect):
    { top: Point; bottomLeft: Point; bottomRight: Point }
{
    return {
        top: {
            x: bounds.x + (bounds.width / 2),
            y: bounds.y
        },
        bottomLeft: {
            x: bounds.x,
            y: bounds.y + bounds.height
        },
        bottomRight: {
            x: bounds.x + bounds.width,
            y: bounds.y + bounds.height
        }
    };
}

/**
 * Builds the SVG path data for a triangle shape.
 *
 * @param bounds - Bounding rectangle containing the triangle.
 * @returns SVG path data string with 3 vertices.
 */
function trianglePathData(bounds: Rect): string
{
    const v = triangleVertices(bounds);

    return `M ${v.top.x} ${v.top.y} L ${v.bottomRight.x} ${v.bottomRight.y} L ${v.bottomLeft.x} ${v.bottomLeft.y} Z`;
}

/**
 * Renders a triangle SVG path element with fill and stroke applied.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the triangle path.
 */
function renderTriangle(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const path = svgCreate("path", {
        d: trianglePathData(ctx.bounds)
    });

    g.appendChild(path);
    applyFillToSvg(path, ctx.style.fill);
    applyStrokeToSvg(path, ctx.style.stroke);

    return g;
}

/**
 * Tests whether a point lies inside a triangle using the half-plane
 * (sign of cross-product) method. A point is inside if it lies on
 * the same side of all three edges.
 *
 * @param point - Point in canvas coordinates.
 * @param bounds - Bounding rectangle of the triangle.
 * @returns true if the point is inside the triangle.
 */
function triangleHitTest(point: Point, bounds: Rect): boolean
{
    const v = triangleVertices(bounds);

    const d1 = crossProduct2D(point, v.top, v.bottomRight);
    const d2 = crossProduct2D(point, v.bottomRight, v.bottomLeft);
    const d3 = crossProduct2D(point, v.bottomLeft, v.top);

    const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
    const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);

    return !(hasNeg && hasPos);
}

/**
 * Computes the 2D cross product sign for three points. Used by
 * triangleHitTest to determine which side of an edge a point is on.
 *
 * @param p - The test point.
 * @param a - First vertex of the edge.
 * @param b - Second vertex of the edge.
 * @returns The cross product value (positive, negative, or zero).
 */
function crossProduct2D(p: Point, a: Point, b: Point): number
{
    return ((a.x - p.x) * (b.y - p.y)) - ((a.y - p.y) * (b.x - p.x));
}

/**
 * Returns text regions for a triangle, positioned in the lower-centre
 * area where the triangle is widest.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single inset text region.
 */
function triangleTextRegions(bounds: Rect): TextRegion[]
{
    // Place text in the lower 60% of the triangle, centred horizontally
    const insetX = bounds.width * 0.2;
    const topOffset = bounds.height * 0.4;

    return [
        {
            id: "text-main",
            bounds: {
                x: bounds.x + insetX,
                y: bounds.y + topOffset,
                width: bounds.width - (2 * insetX),
                height: bounds.height - topOffset - TEXT_INSET
            }
        }
    ];
}

/**
 * Builds the triangle ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for triangles.
 */
export function buildTriangleShape(): ShapeDefinition
{
    return {
        type: "triangle",
        category: BASIC_CATEGORY,
        label: "Triangle",
        icon: "bi-triangle",
        defaultSize: { w: 100, h: 90 },
        minSize: { w: 20, h: 20 },
        render: renderTriangle,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => triangleHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => triangleTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => trianglePathData(bounds)
    };
}

// ============================================================================
// TEXT
// ============================================================================

/**
 * Renders an invisible container rectangle for a text-only shape.
 * The rectangle has transparent fill and no stroke — it serves purely
 * as a bounding box for text content.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the invisible rectangle.
 */
function renderText(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const rect = svgCreate("rect", {
        x: String(ctx.bounds.x),
        y: String(ctx.bounds.y),
        width: String(ctx.bounds.width),
        height: String(ctx.bounds.height),
        fill: "transparent",
        stroke: "none"
    });

    g.appendChild(rect);

    return g;
}

/**
 * Returns text regions for a text shape, using nearly the full
 * bounds with minimal inset.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single text region.
 */
function textTextRegions(bounds: Rect): TextRegion[]
{
    const inset = 2;

    return [
        {
            id: "text-main",
            bounds: insetRect(bounds, inset)
        }
    ];
}

/**
 * Builds the text ShapeDefinition. Text shapes have no connection
 * ports since they are purely decorative labels.
 *
 * @returns A complete ShapeDefinition for text containers.
 */
export function buildTextShape(): ShapeDefinition
{
    return {
        type: "text",
        category: BASIC_CATEGORY,
        label: "Text",
        icon: "bi-fonts",
        defaultSize: { w: 160, h: 40 },
        minSize: { w: 30, h: 20 },
        render: renderText,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: () => [],
        hitTest: (point: Point, bounds: Rect) => rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => textTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => rectOutlinePath(bounds)
    };
}

// ============================================================================
// SHARED HELPERS
// ============================================================================

/**
 * Creates an inset copy of a rectangle, shrinking each edge by the
 * given number of pixels. Returns a zero-size rect if inset exceeds
 * the available space.
 *
 * @param bounds - Original bounding rectangle.
 * @param inset - Number of pixels to inset on each side.
 * @returns A new Rect inset from the original.
 */
function insetRect(bounds: Rect, inset: number): Rect
{
    const doubleInset = inset * 2;

    return {
        x: bounds.x + inset,
        y: bounds.y + inset,
        width: Math.max(0, bounds.width - doubleInset),
        height: Math.max(0, bounds.height - doubleInset)
    };
}

// ============================================================================
// REGISTRATION
// ============================================================================

/**
 * Registers all five basic shapes (rectangle, ellipse, diamond,
 * triangle, text) with the given shape registry.
 *
 * @param registry - The ShapeRegistry instance to populate.
 * @returns void
 */
export function registerBasicShapes(registry: ShapeRegistry): void
{
    registry.register(buildRectangleShape());
    registry.register(buildEllipseShape());
    registry.register(buildDiamondShape());
    registry.register(buildTriangleShape());
    registry.register(buildTextShape());

    logBasicInfo("Registered 5 basic shapes");
}
