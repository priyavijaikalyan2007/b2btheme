/*
 * ----------------------------------------------------------------------------
 * COMPONENT: DiagramEngine — Guides
 * PURPOSE: Visual guide system for alignment and spacing detection during
 *    drag operations. Computes snap deltas and guide lines for object
 *    alignment (edges, centres) and equal spacing between neighbours.
 * RELATES: [[DiagramEngine]], [[SelectTool]], [[RenderEngine]]
 * FLOW: [SelectTool.showMoveAlignmentGuides()] -> [computeAlignmentGuides()]
 *       -> [renderGuides()]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// CONSTANTS
// ============================================================================

/** Log prefix for guide system messages. */
const GUIDES_LOG_PREFIX = "[Guides]";

/** Default snap threshold in canvas pixels. */
const DEFAULT_SNAP_THRESHOLD = 5;

/** Colour for alignment guide lines. */
const ALIGNMENT_GUIDE_COLOR = "var(--bs-primary, #0d6efd)";

/** Colour for spacing guide lines. */
const SPACING_GUIDE_COLOR = "#dc3545";

/** Dash pattern for alignment guide lines. */
const ALIGNMENT_DASH = "4 3";

/** Font size for spacing labels. */
const SPACING_LABEL_FONT_SIZE = 11;

// ============================================================================
// TYPES
// ============================================================================

/** A line segment between two points. */
export interface LineSegment
{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

/** A visual guide line with optional label. */
export interface AlignmentGuide
{
    type: "alignment" | "spacing";
    lines: LineSegment[];
    label?: { text: string; position: Point };
}

/** Result of snap computation: delta to apply and guides to render. */
export interface SnapResult
{
    dx: number;
    dy: number;
    guides: AlignmentGuide[];
}

// ============================================================================
// ALIGNMENT EDGES
// ============================================================================

/**
 * Extracts the five alignment values (left, right, top, bottom, centerX,
 * centerY) from a bounding rectangle.
 *
 * @param b - The bounding rectangle.
 * @returns Object with edge and centre positions.
 */
function extractEdges(b: Rect): {
    left: number;
    right: number;
    top: number;
    bottom: number;
    cx: number;
    cy: number;
}
{
    return {
        left: b.x,
        right: b.x + b.width,
        top: b.y,
        bottom: b.y + b.height,
        cx: b.x + (b.width / 2),
        cy: b.y + (b.height / 2)
    };
}

// ============================================================================
// HORIZONTAL ALIGNMENT
// ============================================================================

/**
 * Checks horizontal edge alignment (left, right, centre) between the
 * moving bounds and a target object. Returns any guides within threshold.
 *
 * @param moving - Edges of the moving selection.
 * @param target - Edges of the comparison object.
 * @param movingBounds - Full bounds of the moving selection.
 * @param targetBounds - Full bounds of the comparison object.
 * @param threshold - Snap distance in pixels.
 * @returns Array of matching alignment guides with dx snap values.
 */
function checkHorizontalAlign(
    moving: ReturnType<typeof extractEdges>,
    target: ReturnType<typeof extractEdges>,
    movingBounds: Rect,
    targetBounds: Rect,
    threshold: number): { dx: number; guide: AlignmentGuide }[]
{
    const results: { dx: number; guide: AlignmentGuide }[] = [];
    const pairs = buildHorizontalPairs(moving, target);

    for (const pair of pairs)
    {
        const delta = pair.targetVal - pair.movingVal;

        if (Math.abs(delta) <= threshold)
        {
            const line = buildVerticalGuideLine(
                pair.targetVal, movingBounds, targetBounds
            );

            results.push({
                dx: delta,
                guide: { type: "alignment", lines: [line] }
            });
        }
    }

    return results;
}

/**
 * Builds the horizontal alignment pairs to compare.
 *
 * @param m - Moving object edges.
 * @param t - Target object edges.
 * @returns Array of value pairs to check.
 */
function buildHorizontalPairs(
    m: ReturnType<typeof extractEdges>,
    t: ReturnType<typeof extractEdges>): { movingVal: number; targetVal: number }[]
{
    return [
        { movingVal: m.left,  targetVal: t.left },
        { movingVal: m.right, targetVal: t.right },
        { movingVal: m.cx,    targetVal: t.cx },
        { movingVal: m.left,  targetVal: t.right },
        { movingVal: m.right, targetVal: t.left }
    ];
}

/**
 * Creates a vertical guide line spanning the Y range of two bounds.
 *
 * @param x - The X coordinate for the vertical line.
 * @param a - First bounding rectangle.
 * @param b - Second bounding rectangle.
 * @returns A vertical LineSegment spanning both objects.
 */
function buildVerticalGuideLine(x: number, a: Rect, b: Rect): LineSegment
{
    const minY = Math.min(a.y, b.y);
    const maxY = Math.max(a.y + a.height, b.y + b.height);

    return { x1: x, y1: minY, x2: x, y2: maxY };
}

// ============================================================================
// VERTICAL ALIGNMENT
// ============================================================================

/**
 * Checks vertical edge alignment (top, bottom, centre) between the
 * moving bounds and a target object. Returns any guides within threshold.
 *
 * @param moving - Edges of the moving selection.
 * @param target - Edges of the comparison object.
 * @param movingBounds - Full bounds of the moving selection.
 * @param targetBounds - Full bounds of the comparison object.
 * @param threshold - Snap distance in pixels.
 * @returns Array of matching alignment guides with dy snap values.
 */
function checkVerticalAlign(
    moving: ReturnType<typeof extractEdges>,
    target: ReturnType<typeof extractEdges>,
    movingBounds: Rect,
    targetBounds: Rect,
    threshold: number): { dy: number; guide: AlignmentGuide }[]
{
    const results: { dy: number; guide: AlignmentGuide }[] = [];
    const pairs = buildVerticalPairs(moving, target);

    for (const pair of pairs)
    {
        const delta = pair.targetVal - pair.movingVal;

        if (Math.abs(delta) <= threshold)
        {
            const line = buildHorizontalGuideLine(
                pair.targetVal, movingBounds, targetBounds
            );

            results.push({
                dy: delta,
                guide: { type: "alignment", lines: [line] }
            });
        }
    }

    return results;
}

/**
 * Builds the vertical alignment pairs to compare.
 *
 * @param m - Moving object edges.
 * @param t - Target object edges.
 * @returns Array of value pairs to check.
 */
function buildVerticalPairs(
    m: ReturnType<typeof extractEdges>,
    t: ReturnType<typeof extractEdges>): { movingVal: number; targetVal: number }[]
{
    return [
        { movingVal: m.top,    targetVal: t.top },
        { movingVal: m.bottom, targetVal: t.bottom },
        { movingVal: m.cy,     targetVal: t.cy },
        { movingVal: m.top,    targetVal: t.bottom },
        { movingVal: m.bottom, targetVal: t.top }
    ];
}

/**
 * Creates a horizontal guide line spanning the X range of two bounds.
 *
 * @param y - The Y coordinate for the horizontal line.
 * @param a - First bounding rectangle.
 * @param b - Second bounding rectangle.
 * @returns A horizontal LineSegment spanning both objects.
 */
function buildHorizontalGuideLine(y: number, a: Rect, b: Rect): LineSegment
{
    const minX = Math.min(a.x, b.x);
    const maxX = Math.max(a.x + a.width, b.x + b.width);

    return { x1: minX, y1: y, x2: maxX, y2: y };
}

// ============================================================================
// COMPUTE ALIGNMENT GUIDES
// ============================================================================

/**
 * Computes alignment guides and snap delta for a moving selection
 * against all other objects on the canvas. Checks edge and centre
 * alignment in both axes and returns the closest snap with guides.
 *
 * @param movingBounds - Current bounds of the dragged selection.
 * @param allObjects - All objects in the document.
 * @param excludeIds - IDs of objects to skip (the selection itself).
 * @param threshold - Snap distance in canvas pixels.
 * @returns SnapResult with dx/dy snap deltas and guide lines.
 */
export function computeAlignmentGuides(
    movingBounds: Rect,
    allObjects: DiagramObject[],
    excludeIds: Set<string>,
    threshold: number): SnapResult
{
    const movingEdges = extractEdges(movingBounds);
    const candidates = filterCandidates(allObjects, excludeIds);

    const hResults = collectHorizontalMatches(
        movingEdges, movingBounds, candidates, threshold
    );
    const vResults = collectVerticalMatches(
        movingEdges, movingBounds, candidates, threshold
    );

    return buildSnapResult(hResults, vResults);
}

/**
 * Filters objects to exclude the moving selection.
 *
 * @param allObjects - All document objects.
 * @param excludeIds - IDs to exclude.
 * @returns Filtered array of candidate objects.
 */
function filterCandidates(
    allObjects: DiagramObject[],
    excludeIds: Set<string>): DiagramObject[]
{
    return allObjects.filter(
        (o) => !excludeIds.has(o.id) && o.presentation.visible
    );
}

/**
 * Collects all horizontal alignment matches across candidates.
 *
 * @param movingEdges - Edge values of the moving selection.
 * @param movingBounds - Full bounds of the moving selection.
 * @param candidates - Objects to compare against.
 * @param threshold - Snap distance.
 * @returns Array of horizontal matches with dx and guide.
 */
function collectHorizontalMatches(
    movingEdges: ReturnType<typeof extractEdges>,
    movingBounds: Rect,
    candidates: DiagramObject[],
    threshold: number): { dx: number; guide: AlignmentGuide }[]
{
    const results: { dx: number; guide: AlignmentGuide }[] = [];

    for (const obj of candidates)
    {
        const targetEdges = extractEdges(obj.presentation.bounds);
        const matches = checkHorizontalAlign(
            movingEdges, targetEdges,
            movingBounds, obj.presentation.bounds, threshold
        );

        results.push(...matches);
    }

    return results;
}

/**
 * Collects all vertical alignment matches across candidates.
 *
 * @param movingEdges - Edge values of the moving selection.
 * @param movingBounds - Full bounds of the moving selection.
 * @param candidates - Objects to compare against.
 * @param threshold - Snap distance.
 * @returns Array of vertical matches with dy and guide.
 */
function collectVerticalMatches(
    movingEdges: ReturnType<typeof extractEdges>,
    movingBounds: Rect,
    candidates: DiagramObject[],
    threshold: number): { dy: number; guide: AlignmentGuide }[]
{
    const results: { dy: number; guide: AlignmentGuide }[] = [];

    for (const obj of candidates)
    {
        const targetEdges = extractEdges(obj.presentation.bounds);
        const matches = checkVerticalAlign(
            movingEdges, targetEdges,
            movingBounds, obj.presentation.bounds, threshold
        );

        results.push(...matches);
    }

    return results;
}

/**
 * Selects the closest horizontal and vertical snaps and merges
 * their guides into a single SnapResult.
 *
 * @param hMatches - Horizontal alignment matches.
 * @param vMatches - Vertical alignment matches.
 * @returns Combined SnapResult with best dx, dy, and all guides.
 */
function buildSnapResult(
    hMatches: { dx: number; guide: AlignmentGuide }[],
    vMatches: { dy: number; guide: AlignmentGuide }[]): SnapResult
{
    let dx = 0;
    let dy = 0;
    const guides: AlignmentGuide[] = [];

    if (hMatches.length > 0)
    {
        const best = selectClosestH(hMatches);
        dx = best.dx;
        guides.push(...best.guides);
    }

    if (vMatches.length > 0)
    {
        const best = selectClosestV(vMatches);
        dy = best.dy;
        guides.push(...best.guides);
    }

    return { dx, dy, guides };
}

/**
 * Selects the closest horizontal snap and gathers all guides at
 * that same snap distance.
 *
 * @param matches - All horizontal matches.
 * @returns The best dx and all matching guides.
 */
function selectClosestH(
    matches: { dx: number; guide: AlignmentGuide }[]): { dx: number; guides: AlignmentGuide[] }
{
    matches.sort((a, b) => Math.abs(a.dx) - Math.abs(b.dx));

    const bestDx = matches[0].dx;
    const guides = matches
        .filter((m) => m.dx === bestDx)
        .map((m) => m.guide);

    return { dx: bestDx, guides };
}

/**
 * Selects the closest vertical snap and gathers all guides at
 * that same snap distance.
 *
 * @param matches - All vertical matches.
 * @returns The best dy and all matching guides.
 */
function selectClosestV(
    matches: { dy: number; guide: AlignmentGuide }[]): { dy: number; guides: AlignmentGuide[] }
{
    matches.sort((a, b) => Math.abs(a.dy) - Math.abs(b.dy));

    const bestDy = matches[0].dy;
    const guides = matches
        .filter((m) => m.dy === bestDy)
        .map((m) => m.guide);

    return { dy: bestDy, guides };
}

// ============================================================================
// SPACING GUIDES
// ============================================================================

/**
 * Detects equal horizontal and vertical gaps between the moved object
 * and its neighbours. When the gap between the moving object and two
 * neighbours is equal, renders dimension lines with gap values.
 *
 * @param movingBounds - Current bounds of the dragged selection.
 * @param allObjects - All objects in the document.
 * @param excludeIds - IDs of objects to skip.
 * @param threshold - Tolerance for considering gaps equal.
 * @returns Array of spacing guides with dimension lines and labels.
 */
export function computeSpacingGuides(
    movingBounds: Rect,
    allObjects: DiagramObject[],
    excludeIds: Set<string>,
    threshold: number): AlignmentGuide[]
{
    const candidates = filterCandidates(allObjects, excludeIds);
    const guides: AlignmentGuide[] = [];

    const hSpacing = detectHorizontalSpacing(
        movingBounds, candidates, threshold
    );
    guides.push(...hSpacing);

    const vSpacing = detectVerticalSpacing(
        movingBounds, candidates, threshold
    );
    guides.push(...vSpacing);

    return guides;
}

/**
 * Detects equal horizontal gaps between the moving object and
 * objects to its left and right.
 *
 * @param moving - Moving object bounds.
 * @param candidates - Other visible objects.
 * @param threshold - Gap equality tolerance.
 * @returns Spacing guides for equal horizontal gaps.
 */
function detectHorizontalSpacing(
    moving: Rect,
    candidates: DiagramObject[],
    threshold: number): AlignmentGuide[]
{
    const guides: AlignmentGuide[] = [];
    const movingRight = moving.x + moving.width;
    const movingCy = moving.y + (moving.height / 2);

    for (let i = 0; i < candidates.length; i++)
    {
        for (let j = i + 1; j < candidates.length; j++)
        {
            const guide = checkHorizontalGapPair(
                moving, movingRight, movingCy,
                candidates[i].presentation.bounds,
                candidates[j].presentation.bounds,
                threshold
            );

            if (guide)
            {
                guides.push(guide);
            }
        }
    }

    return guides;
}

/**
 * Checks whether a pair of objects creates equal horizontal gaps
 * with the moving object.
 *
 * @param moving - Moving object bounds.
 * @param movingRight - Right edge of moving object.
 * @param movingCy - Vertical centre of moving object.
 * @param a - First candidate bounds.
 * @param b - Second candidate bounds.
 * @param threshold - Gap equality tolerance.
 * @returns A spacing guide if gaps are equal, or null.
 */
function checkHorizontalGapPair(
    moving: Rect,
    movingRight: number,
    movingCy: number,
    a: Rect,
    b: Rect,
    threshold: number): AlignmentGuide | null
{
    const aRight = a.x + a.width;
    const bRight = b.x + b.width;
    const gaps = computeHGaps(moving.x, movingRight, a.x, aRight, b.x, bRight);

    return matchHGap(gaps, moving.x, movingRight, movingCy, threshold);
}

/**
 * Computes the four directional gaps between a moving object and
 * two candidate objects on the horizontal axis.
 *
 * @param mLeft - Moving left edge.
 * @param mRight - Moving right edge.
 * @param aLeft - Object A left edge.
 * @param aRight - Object A right edge.
 * @param bLeft - Object B left edge.
 * @param bRight - Object B right edge.
 * @returns Gap values in all four directions.
 */
function computeHGaps(
    mLeft: number, mRight: number,
    aLeft: number, aRight: number,
    bLeft: number, bRight: number): { la: number; ra: number; lb: number; rb: number }
{
    return {
        la: mLeft - aRight,
        ra: aLeft - mRight,
        lb: mLeft - bRight,
        rb: bLeft - mRight
    };
}

/**
 * Matches equal horizontal gap pairs and returns a spacing guide.
 *
 * @param g - Gap values from computeHGaps.
 * @param mLeft - Moving left edge.
 * @param mRight - Moving right edge.
 * @param cy - Vertical centre for the guide line.
 * @param threshold - Gap equality tolerance.
 * @returns A spacing guide if gaps are equal, or null.
 */
function matchHGap(
    g: { la: number; ra: number; lb: number; rb: number },
    mLeft: number, mRight: number,
    cy: number, threshold: number): AlignmentGuide | null
{
    if (g.la > 0 && g.rb > 0 && Math.abs(g.la - g.rb) <= threshold)
    {
        return buildHSpacingGuide(
            mLeft - g.la, mLeft, mRight, mRight + g.rb, cy, g.la
        );
    }

    if (g.ra > 0 && g.lb > 0 && Math.abs(g.ra - g.lb) <= threshold)
    {
        return buildHSpacingGuide(
            mLeft - g.lb, mLeft, mRight, mRight + g.ra, cy, g.lb
        );
    }

    return null;
}

/**
 * Builds a horizontal spacing guide with two dimension lines.
 *
 * @param leftEnd - Right edge of the left object.
 * @param gapStart - Left edge of the gap.
 * @param gapEnd - Right edge of the gap.
 * @param rightStart - Left edge of the right object.
 * @param y - Vertical position for the dimension lines.
 * @param gapValue - The measured gap in pixels.
 * @returns An AlignmentGuide with spacing dimension lines.
 */
function buildHSpacingGuide(
    leftEnd: number,
    gapStart: number,
    gapEnd: number,
    rightStart: number,
    y: number,
    gapValue: number): AlignmentGuide
{
    return {
        type: "spacing",
        lines: [
            { x1: leftEnd, y1: y, x2: gapStart, y2: y },
            { x1: gapEnd,  y1: y, x2: rightStart, y2: y }
        ],
        label: {
            text: `${Math.round(gapValue)}px`,
            position: { x: (leftEnd + gapStart) / 2, y: y - 8 }
        }
    };
}

/**
 * Detects equal vertical gaps between the moving object and
 * objects above and below it.
 *
 * @param moving - Moving object bounds.
 * @param candidates - Other visible objects.
 * @param threshold - Gap equality tolerance.
 * @returns Spacing guides for equal vertical gaps.
 */
function detectVerticalSpacing(
    moving: Rect,
    candidates: DiagramObject[],
    threshold: number): AlignmentGuide[]
{
    const guides: AlignmentGuide[] = [];
    const movingBottom = moving.y + moving.height;
    const movingCx = moving.x + (moving.width / 2);

    for (let i = 0; i < candidates.length; i++)
    {
        for (let j = i + 1; j < candidates.length; j++)
        {
            const guide = checkVerticalGapPair(
                moving, movingBottom, movingCx,
                candidates[i].presentation.bounds,
                candidates[j].presentation.bounds,
                threshold
            );

            if (guide)
            {
                guides.push(guide);
            }
        }
    }

    return guides;
}

/**
 * Checks whether a pair of objects creates equal vertical gaps
 * with the moving object.
 *
 * @param moving - Moving object bounds.
 * @param movingBottom - Bottom edge of moving object.
 * @param movingCx - Horizontal centre of moving object.
 * @param a - First candidate bounds.
 * @param b - Second candidate bounds.
 * @param threshold - Gap equality tolerance.
 * @returns A spacing guide if gaps are equal, or null.
 */
function checkVerticalGapPair(
    moving: Rect,
    movingBottom: number,
    movingCx: number,
    a: Rect,
    b: Rect,
    threshold: number): AlignmentGuide | null
{
    const aBottom = a.y + a.height;
    const bBottom = b.y + b.height;
    const gaps = computeVGaps(moving.y, movingBottom, a.y, aBottom, b.y, bBottom);

    return matchVGap(gaps, moving.y, movingBottom, movingCx, threshold);
}

/**
 * Computes the four directional gaps between a moving object and
 * two candidate objects on the vertical axis.
 *
 * @param mTop - Moving top edge.
 * @param mBottom - Moving bottom edge.
 * @param aTop - Object A top edge.
 * @param aBottom - Object A bottom edge.
 * @param bTop - Object B top edge.
 * @param bBottom - Object B bottom edge.
 * @returns Gap values in all four directions.
 */
function computeVGaps(
    mTop: number, mBottom: number,
    aTop: number, aBottom: number,
    bTop: number, bBottom: number): { aa: number; ba: number; ab: number; bb: number }
{
    return {
        aa: mTop - aBottom,
        ba: aTop - mBottom,
        ab: mTop - bBottom,
        bb: bTop - mBottom
    };
}

/**
 * Matches equal vertical gap pairs and returns a spacing guide.
 *
 * @param g - Gap values from computeVGaps.
 * @param mTop - Moving top edge.
 * @param mBottom - Moving bottom edge.
 * @param cx - Horizontal centre for the guide line.
 * @param threshold - Gap equality tolerance.
 * @returns A spacing guide if gaps are equal, or null.
 */
function matchVGap(
    g: { aa: number; ba: number; ab: number; bb: number },
    mTop: number, mBottom: number,
    cx: number, threshold: number): AlignmentGuide | null
{
    if (g.aa > 0 && g.bb > 0 && Math.abs(g.aa - g.bb) <= threshold)
    {
        return buildVSpacingGuide(
            mTop - g.aa, mTop, mBottom, mBottom + g.bb, cx, g.aa
        );
    }

    if (g.ba > 0 && g.ab > 0 && Math.abs(g.ba - g.ab) <= threshold)
    {
        return buildVSpacingGuide(
            mTop - g.ab, mTop, mBottom, mBottom + g.ba, cx, g.ab
        );
    }

    return null;
}

/**
 * Builds a vertical spacing guide with two dimension lines.
 *
 * @param topEnd - Bottom edge of the top object.
 * @param gapStart - Top edge of the gap.
 * @param gapEnd - Bottom edge of the gap.
 * @param bottomStart - Top edge of the bottom object.
 * @param x - Horizontal position for the dimension lines.
 * @param gapValue - The measured gap in pixels.
 * @returns An AlignmentGuide with spacing dimension lines.
 */
function buildVSpacingGuide(
    topEnd: number,
    gapStart: number,
    gapEnd: number,
    bottomStart: number,
    x: number,
    gapValue: number): AlignmentGuide
{
    return {
        type: "spacing",
        lines: [
            { x1: x, y1: topEnd, x2: x, y2: gapStart },
            { x1: x, y1: gapEnd, x2: x, y2: bottomStart }
        ],
        label: {
            text: `${Math.round(gapValue)}px`,
            position: { x: x + 8, y: (topEnd + gapStart) / 2 }
        }
    };
}

// ============================================================================
// GUIDE RENDERING
// ============================================================================

/**
 * Renders alignment and spacing guides onto the tool overlay layer.
 * Alignment guides are dashed blue lines; spacing guides are solid
 * red lines with text labels showing the gap value.
 *
 * @param toolOverlay - The SVG tool overlay group element.
 * @param guides - Array of guide definitions to render.
 */
export function renderGuides(
    toolOverlay: SVGElement,
    guides: AlignmentGuide[]): void
{
    for (const guide of guides)
    {
        if (guide.type === "alignment")
        {
            renderAlignmentLines(toolOverlay, guide.lines);
        }
        else
        {
            renderSpacingLines(toolOverlay, guide.lines);
        }

        if (guide.label)
        {
            renderGuideLabel(toolOverlay, guide.label);
        }
    }
}

/**
 * Renders dashed blue alignment guide lines.
 *
 * @param overlay - SVG group to append lines to.
 * @param lines - Line segments to render.
 */
function renderAlignmentLines(
    overlay: SVGElement,
    lines: LineSegment[]): void
{
    for (const seg of lines)
    {
        const line = svgCreate("line", {
            x1: String(seg.x1),
            y1: String(seg.y1),
            x2: String(seg.x2),
            y2: String(seg.y2),
            stroke: ALIGNMENT_GUIDE_COLOR,
            "stroke-width": "1",
            "stroke-dasharray": ALIGNMENT_DASH,
            "pointer-events": "none"
        });

        overlay.appendChild(line);
    }
}

/**
 * Renders solid red spacing guide lines.
 *
 * @param overlay - SVG group to append lines to.
 * @param lines - Line segments to render.
 */
function renderSpacingLines(
    overlay: SVGElement,
    lines: LineSegment[]): void
{
    for (const seg of lines)
    {
        const line = svgCreate("line", {
            x1: String(seg.x1),
            y1: String(seg.y1),
            x2: String(seg.x2),
            y2: String(seg.y2),
            stroke: SPACING_GUIDE_COLOR,
            "stroke-width": "1",
            "pointer-events": "none"
        });

        overlay.appendChild(line);
    }
}

/**
 * Renders a text label for a spacing guide.
 *
 * @param overlay - SVG group to append the label to.
 * @param label - Label text and position.
 */
function renderGuideLabel(
    overlay: SVGElement,
    label: { text: string; position: Point }): void
{
    const text = svgCreate("text", {
        x: String(label.position.x),
        y: String(label.position.y),
        fill: SPACING_GUIDE_COLOR,
        "font-size": String(SPACING_LABEL_FONT_SIZE),
        "font-family": "inherit",
        "text-anchor": "middle",
        "pointer-events": "none"
    });

    text.textContent = label.text;
    overlay.appendChild(text);
}
