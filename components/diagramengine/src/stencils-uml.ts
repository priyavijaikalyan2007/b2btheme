/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: DiagramEngine — UmlStencils
 * PURPOSE: Five UML shape definitions (class, actor, note, package, component)
 *    for standard UML diagrams. Each shape provides render, hitTest, ports,
 *    handles, text regions, and outline path.
 * RELATES: [[DiagramEngine]], [[ShapeRegistry]], [[ShapeDefinition]]
 * FLOW: [registerUmlPack()] -> [ShapeRegistry.register()] -> [Engine]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

const UML_LOG_PREFIX = "[UmlStencils]";

/** Category identifier for UML shapes in the stencil palette. */
const UML_CATEGORY = "uml";

/** Inset in pixels for text regions to clear stroke area. */
const UML_TEXT_INSET = 6;

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
function umlInsetRect(bounds: Rect, inset: number): Rect
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
function umlRectOutlinePath(bounds: Rect): string
{
    const x = bounds.x;
    const y = bounds.y;
    const w = bounds.width;
    const h = bounds.height;

    return `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
}

// ============================================================================
// UML-CLASS (3-compartment rectangle)
// ============================================================================

/**
 * Renders the outer rectangle of a UML class shape.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG rect element with fill and stroke applied.
 */
function renderClassRect(ctx: ShapeRenderContext): SVGElement
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
 * Renders the two horizontal divider lines that split the UML class
 * into three compartments: name (top third), attributes (middle),
 * and methods (bottom).
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing two divider lines.
 */
function renderClassDividers(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const x = ctx.bounds.x;
    const w = ctx.bounds.width;
    const h = ctx.bounds.height;
    const y1 = ctx.bounds.y + (h / 3);
    const y2 = ctx.bounds.y + (2 * h / 3);

    const line1 = svgCreate("line", {
        x1: String(x), y1: String(y1),
        x2: String(x + w), y2: String(y1)
    });

    const line2 = svgCreate("line", {
        x1: String(x), y1: String(y2),
        x2: String(x + w), y2: String(y2)
    });

    applyStrokeToSvg(line1, ctx.style.stroke);
    applyStrokeToSvg(line2, ctx.style.stroke);

    g.appendChild(line1);
    g.appendChild(line2);

    return g;
}

/**
 * Renders a complete UML class shape with outer rectangle and
 * two divider lines creating three compartments.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the class shape elements.
 */
function renderUmlClass(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");

    g.appendChild(renderClassRect(ctx));
    g.appendChild(renderClassDividers(ctx));

    return g;
}

/**
 * Returns three text regions for the UML class compartments:
 * name (top), attributes (middle), and methods (bottom).
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with three text regions for each compartment.
 */
function umlClassTextRegions(bounds: Rect): TextRegion[]
{
    const compH = bounds.height / 3;
    const inset = UML_TEXT_INSET;

    return [
        {
            id: "text-name",
            bounds: {
                x: bounds.x + inset,
                y: bounds.y + inset,
                width: bounds.width - (2 * inset),
                height: compH - (2 * inset)
            }
        },
        {
            id: "text-attributes",
            bounds: {
                x: bounds.x + inset,
                y: bounds.y + compH + inset,
                width: bounds.width - (2 * inset),
                height: compH - (2 * inset)
            }
        },
        {
            id: "text-methods",
            bounds: {
                x: bounds.x + inset,
                y: bounds.y + (2 * compH) + inset,
                width: bounds.width - (2 * inset),
                height: compH - (2 * inset)
            }
        }
    ];
}

/**
 * Builds the UML class ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for UML class shapes.
 */
function buildUmlClassShape(): ShapeDefinition
{
    return {
        type: "uml-class",
        category: UML_CATEGORY,
        label: "Class",
        icon: "bi-grid-3-gaps",
        defaultSize: { w: 160, h: 120 },
        minSize: { w: 60, h: 60 },
        render: renderUmlClass,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => umlClassTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => umlRectOutlinePath(bounds)
    };
}

// ============================================================================
// UML-ACTOR (stick figure)
// ============================================================================

/** Ratio of head radius to total height. */
const ACTOR_HEAD_RATIO = 0.15;

/** Ratio of body length to total height. */
const ACTOR_BODY_RATIO = 0.3;

/** Ratio of arm span to total width. */
const ACTOR_ARM_SPAN = 0.8;

/**
 * Renders the circular head of a stick figure actor.
 *
 * @param cx - Centre X of the figure.
 * @param headCy - Centre Y of the head circle.
 * @param headR - Radius of the head circle.
 * @param ctx - Shape render context for styling.
 * @returns SVG circle element for the head.
 */
function renderActorHead(
    cx: number,
    headCy: number,
    headR: number,
    ctx: ShapeRenderContext): SVGElement
{
    const circle = svgCreate("circle", {
        cx: String(cx),
        cy: String(headCy),
        r: String(headR)
    });

    applyFillToSvg(circle, { type: "none" });
    applyStrokeToSvg(circle, ctx.style.stroke);

    return circle;
}

/**
 * Renders the body, arms, and legs of the stick figure actor.
 *
 * @param cx - Centre X of the figure.
 * @param bounds - Bounding rectangle of the actor.
 * @param headR - Radius of the head circle.
 * @param ctx - Shape render context for styling.
 * @returns SVG group containing body, arm, and leg lines.
 */
function renderActorBody(
    cx: number,
    bounds: Rect,
    headR: number,
    ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const h = bounds.height;
    const w = bounds.width;
    const headBottom = bounds.y + (2 * headR);
    const bodyEnd = headBottom + (h * ACTOR_BODY_RATIO);
    const armY = headBottom + (h * ACTOR_BODY_RATIO * 0.4);
    const armHalf = (w * ACTOR_ARM_SPAN) / 2;
    const footY = bounds.y + h;

    const lines = [
        { x1: cx, y1: headBottom, x2: cx, y2: bodyEnd },
        { x1: cx - armHalf, y1: armY, x2: cx + armHalf, y2: armY },
        { x1: cx, y1: bodyEnd, x2: cx - armHalf, y2: footY },
        { x1: cx, y1: bodyEnd, x2: cx + armHalf, y2: footY }
    ];

    for (const ln of lines)
    {
        const line = svgCreate("line", {
            x1: String(ln.x1), y1: String(ln.y1),
            x2: String(ln.x2), y2: String(ln.y2)
        });

        applyStrokeToSvg(line, ctx.style.stroke);
        g.appendChild(line);
    }

    return g;
}

/**
 * Renders a complete UML actor (stick figure) shape.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing head circle and body lines.
 */
function renderUmlActor(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const cx = ctx.bounds.x + (ctx.bounds.width / 2);
    const headR = ctx.bounds.height * ACTOR_HEAD_RATIO;
    const headCy = ctx.bounds.y + headR;

    g.appendChild(renderActorHead(cx, headCy, headR, ctx));
    g.appendChild(renderActorBody(cx, ctx.bounds, headR, ctx));

    return g;
}

/**
 * Returns text regions for an actor, placed below the figure.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single text region below the figure.
 */
function umlActorTextRegions(bounds: Rect): TextRegion[]
{
    return [
        {
            id: "text-main",
            bounds: {
                x: bounds.x,
                y: bounds.y + (bounds.height * 0.85),
                width: bounds.width,
                height: bounds.height * 0.15
            }
        }
    ];
}

/**
 * Builds the UML actor ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for stick figure actors.
 */
function buildUmlActorShape(): ShapeDefinition
{
    return {
        type: "uml-actor",
        category: UML_CATEGORY,
        label: "Actor",
        icon: "bi-person",
        defaultSize: { w: 60, h: 100 },
        minSize: { w: 30, h: 50 },
        render: renderUmlActor,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => umlActorTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => umlRectOutlinePath(bounds)
    };
}

// ============================================================================
// UML-NOTE (rectangle with folded corner)
// ============================================================================

/** Size of the folded corner triangle as a ratio of the shorter side. */
const NOTE_FOLD_RATIO = 0.2;

/**
 * Builds the SVG path data for a note shape with a folded top-right
 * corner created by a diagonal line.
 *
 * @param bounds - Bounding rectangle containing the note.
 * @returns SVG path data string.
 */
function notePathData(bounds: Rect): string
{
    const x = bounds.x;
    const y = bounds.y;
    const w = bounds.width;
    const h = bounds.height;
    const fold = Math.min(w, h) * NOTE_FOLD_RATIO;

    return (
        `M ${x} ${y} ` +
        `L ${x + w - fold} ${y} ` +
        `L ${x + w} ${y + fold} ` +
        `L ${x + w} ${y + h} ` +
        `L ${x} ${y + h} Z`
    );
}

/**
 * Builds the SVG path data for the fold triangle in the top-right
 * corner of the note shape.
 *
 * @param bounds - Bounding rectangle containing the note.
 * @returns SVG path data string for the fold triangle.
 */
function noteFoldPath(bounds: Rect): string
{
    const w = bounds.width;
    const h = bounds.height;
    const fold = Math.min(w, h) * NOTE_FOLD_RATIO;
    const x = bounds.x;
    const y = bounds.y;

    return (
        `M ${x + w - fold} ${y} ` +
        `L ${x + w - fold} ${y + fold} ` +
        `L ${x + w} ${y + fold}`
    );
}

/**
 * Renders a UML note shape with folded corner.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the note body and fold.
 */
function renderUmlNote(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");

    const body = svgCreate("path", {
        d: notePathData(ctx.bounds)
    });

    applyFillToSvg(body, ctx.style.fill);
    applyStrokeToSvg(body, ctx.style.stroke);
    g.appendChild(body);

    const fold = svgCreate("path", {
        d: noteFoldPath(ctx.bounds),
        fill: "none"
    });

    applyStrokeToSvg(fold, ctx.style.stroke);
    g.appendChild(fold);

    return g;
}

/**
 * Returns text regions for a note shape, inset from all edges
 * including the folded corner.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single inset text region.
 */
function umlNoteTextRegions(bounds: Rect): TextRegion[]
{
    const fold = Math.min(bounds.width, bounds.height) * NOTE_FOLD_RATIO;
    const inset = UML_TEXT_INSET;

    return [
        {
            id: "text-main",
            bounds: {
                x: bounds.x + inset,
                y: bounds.y + fold + inset,
                width: bounds.width - (2 * inset),
                height: Math.max(0, bounds.height - fold - (2 * inset))
            }
        }
    ];
}

/**
 * Builds the UML note ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for note shapes.
 */
function buildUmlNoteShape(): ShapeDefinition
{
    return {
        type: "uml-note",
        category: UML_CATEGORY,
        label: "Note",
        icon: "bi-sticky",
        defaultSize: { w: 120, h: 100 },
        minSize: { w: 40, h: 40 },
        render: renderUmlNote,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => umlNoteTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => notePathData(bounds)
    };
}

// ============================================================================
// UML-PACKAGE (rectangle with tab)
// ============================================================================

/** Height ratio of the tab relative to total height. */
const PKG_TAB_HEIGHT_RATIO = 0.15;

/** Width ratio of the tab relative to total width. */
const PKG_TAB_WIDTH_RATIO = 0.4;

/**
 * Builds the SVG path data for a package shape with a small tab
 * protruding from the top-left corner.
 *
 * @param bounds - Bounding rectangle containing the package.
 * @returns SVG path data string.
 */
function packagePathData(bounds: Rect): string
{
    const x = bounds.x;
    const y = bounds.y;
    const w = bounds.width;
    const h = bounds.height;
    const tabW = w * PKG_TAB_WIDTH_RATIO;
    const tabH = h * PKG_TAB_HEIGHT_RATIO;

    return (
        `M ${x} ${y} ` +
        `L ${x + tabW} ${y} ` +
        `L ${x + tabW} ${y + tabH} ` +
        `L ${x + w} ${y + tabH} ` +
        `L ${x + w} ${y + h} ` +
        `L ${x} ${y + h} Z`
    );
}

/**
 * Renders a UML package shape with tab at top-left.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing the package path.
 */
function renderUmlPackage(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const path = svgCreate("path", {
        d: packagePathData(ctx.bounds)
    });

    applyFillToSvg(path, ctx.style.fill);
    applyStrokeToSvg(path, ctx.style.stroke);

    g.appendChild(path);

    return g;
}

/**
 * Returns text regions for a package, positioned below the tab.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single text region below the tab.
 */
function umlPackageTextRegions(bounds: Rect): TextRegion[]
{
    const tabH = bounds.height * PKG_TAB_HEIGHT_RATIO;
    const inset = UML_TEXT_INSET;

    return [
        {
            id: "text-main",
            bounds: {
                x: bounds.x + inset,
                y: bounds.y + tabH + inset,
                width: bounds.width - (2 * inset),
                height: Math.max(0, bounds.height - tabH - (2 * inset))
            }
        }
    ];
}

/**
 * Builds the UML package ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for package shapes.
 */
function buildUmlPackageShape(): ShapeDefinition
{
    return {
        type: "uml-package",
        category: UML_CATEGORY,
        label: "Package",
        icon: "bi-box",
        defaultSize: { w: 160, h: 120 },
        minSize: { w: 60, h: 50 },
        render: renderUmlPackage,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => umlPackageTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => packagePathData(bounds)
    };
}

// ============================================================================
// UML-COMPONENT (rectangle with two small rectangles on left edge)
// ============================================================================

/** Width of the small connector rectangles on the left edge. */
const COMP_TAB_W = 12;

/** Height of each small connector rectangle. */
const COMP_TAB_H = 8;

/**
 * Renders the main body rectangle of a UML component.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG rect element with fill and stroke.
 */
function renderComponentBody(ctx: ShapeRenderContext): SVGElement
{
    const offset = COMP_TAB_W / 2;
    const rect = svgCreate("rect", {
        x: String(ctx.bounds.x + offset),
        y: String(ctx.bounds.y),
        width: String(ctx.bounds.width - offset),
        height: String(ctx.bounds.height)
    });

    applyFillToSvg(rect, ctx.style.fill);
    applyStrokeToSvg(rect, ctx.style.stroke);

    return rect;
}

/**
 * Renders the two small connector rectangles on the left edge
 * of the UML component shape.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing two small rectangles.
 */
function renderComponentTabs(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const x = ctx.bounds.x;
    const h = ctx.bounds.height;
    const tab1Y = ctx.bounds.y + (h * 0.25) - (COMP_TAB_H / 2);
    const tab2Y = ctx.bounds.y + (h * 0.65) - (COMP_TAB_H / 2);

    const tabs = [tab1Y, tab2Y];

    for (const tabY of tabs)
    {
        const rect = svgCreate("rect", {
            x: String(x),
            y: String(tabY),
            width: String(COMP_TAB_W),
            height: String(COMP_TAB_H)
        });

        applyFillToSvg(rect, ctx.style.fill);
        applyStrokeToSvg(rect, ctx.style.stroke);

        g.appendChild(rect);
    }

    return g;
}

/**
 * Renders a complete UML component shape with body rectangle
 * and two connector tabs on the left edge.
 *
 * @param ctx - Shape render context with bounds and style.
 * @returns SVG group containing body and tab elements.
 */
function renderUmlComponent(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");

    g.appendChild(renderComponentBody(ctx));
    g.appendChild(renderComponentTabs(ctx));

    return g;
}

/**
 * Returns text regions for a component, inset from all edges
 * including the left-side tab area.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with a single inset text region.
 */
function umlComponentTextRegions(bounds: Rect): TextRegion[]
{
    const offset = COMP_TAB_W;
    const inset = UML_TEXT_INSET;

    return [
        {
            id: "text-main",
            bounds: {
                x: bounds.x + offset + inset,
                y: bounds.y + inset,
                width: Math.max(0, bounds.width - offset - (2 * inset)),
                height: bounds.height - (2 * inset)
            }
        }
    ];
}

/**
 * Builds the UML component ShapeDefinition.
 *
 * @returns A complete ShapeDefinition for component shapes.
 */
function buildUmlComponentShape(): ShapeDefinition
{
    return {
        type: "uml-component",
        category: UML_CATEGORY,
        label: "Component",
        icon: "bi-puzzle",
        defaultSize: { w: 140, h: 100 },
        minSize: { w: 60, h: 40 },
        render: renderUmlComponent,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => umlComponentTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => umlRectOutlinePath(bounds)
    };
}

// ============================================================================
// REGISTRATION
// ============================================================================

/**
 * Registers all five UML shapes (class, actor, note, package,
 * component) with the given shape registry.
 *
 * @param registry - The ShapeRegistry instance to populate.
 * @returns void
 */
export function registerUmlPack(registry: ShapeRegistry): void
{
    registry.register(buildUmlClassShape());
    registry.register(buildUmlActorShape());
    registry.register(buildUmlNoteShape());
    registry.register(buildUmlPackageShape());
    registry.register(buildUmlComponentShape());

    console.log(UML_LOG_PREFIX, "Registered 5 UML shapes");
}
