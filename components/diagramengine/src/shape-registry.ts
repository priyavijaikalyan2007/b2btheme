/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: DiagramEngine — ShapeRegistry
 * 📜 PURPOSE: Central registry for shape definitions, plus shared SVG helper
 *    functions used by all shape implementations (port generation, resize
 *    handles, fill/stroke application, SVG element creation, hit testing).
 * 🔗 RELATES: [[DiagramEngine]], [[ShapeDefinition]], [[ShapesBasic]]
 * ⚡ FLOW: [Shape modules] -> [ShapeRegistry.register()] -> [Engine.get()]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

const LOG_PREFIX = "[ShapeRegistry]";

/** SVG namespace URI for element creation. */
const SVG_NS = "http://www.w3.org/2000/svg";

/** Default fill colour when no fill style is specified. */
const DEFAULT_FILL = "var(--theme-surface-raised-bg)";

/** Default stroke colour when no stroke style is specified. */
const DEFAULT_STROKE = "var(--theme-border-color)";

/** Default stroke width when no stroke style is specified. */
const DEFAULT_STROKE_WIDTH = 1.5;

// ============================================================================
// SVG ELEMENT HELPERS
// ============================================================================

/**
 * Creates an SVG element in the correct namespace.
 *
 * @param tag - SVG tag name (e.g. "rect", "ellipse", "g").
 * @param attrs - Optional attribute key/value pairs to set.
 * @returns The created SVG element.
 */
export function svgCreate(tag: string, attrs?: Record<string, string>): SVGElement
{
    const el = document.createElementNS(SVG_NS, tag);

    if (attrs)
    {
        svgSetAttr(el, attrs);
    }

    return el;
}

/**
 * Sets multiple attributes on an SVG element.
 *
 * @param el - Target SVG element.
 * @param attrs - Attribute key/value pairs to apply.
 * @returns void
 */
export function svgSetAttr(el: SVGElement, attrs: Record<string, string>): void
{
    const keys = Object.keys(attrs);

    for (const key of keys)
    {
        el.setAttribute(key, attrs[key]);
    }
}

// ============================================================================
// FILL AND STROKE APPLICATION
// ============================================================================

/**
 * Applies a fill style to an SVG element. Handles solid colours,
 * linear/radial gradients (appended via a defs fragment), and "none".
 * When fill is undefined, applies the theme surface-raised-bg default.
 *
 * @param el - Target SVG element to receive the fill.
 * @param fill - Fill style specification, or undefined for default.
 * @returns void
 */
export function applyFillToSvg(el: SVGElement, fill?: FillStyle): void
{
    if (!fill)
    {
        el.setAttribute("fill", DEFAULT_FILL);
        return;
    }

    if (fill.type === "none")
    {
        el.setAttribute("fill", "none");
        return;
    }

    if (fill.type === "solid")
    {
        el.setAttribute("fill", fill.color || DEFAULT_FILL);
        return;
    }

    if (fill.type === "gradient" && fill.gradient)
    {
        applyGradientFill(el, fill.gradient);
        return;
    }

    // Fallback for pattern or unrecognised types
    el.setAttribute("fill", fill.color || DEFAULT_FILL);
}

/**
 * Creates an SVG gradient definition and applies it to the element.
 * Appends a <defs> block as a sibling so the gradient is available.
 *
 * @param el - Target SVG element.
 * @param gradient - Gradient definition with type, stops, and parameters.
 * @returns void
 */
function applyGradientFill(el: SVGElement, gradient: GradientDefinition): void
{
    const gradientId = "grad-" + Math.random().toString(36).substring(2, 10);
    const defs = svgCreate("defs");
    const gradEl = buildGradientElement(gradient, gradientId);

    defs.appendChild(gradEl);

    el.parentNode?.insertBefore(defs, el);
    el.setAttribute("fill", `url(#${gradientId})`);
}

/**
 * Builds the SVG gradient element (linear or radial) with colour stops.
 *
 * @param gradient - Gradient definition.
 * @param id - Unique ID for the gradient element.
 * @returns The constructed SVG gradient element.
 */
function buildGradientElement(gradient: GradientDefinition, id: string): SVGElement
{
    const isLinear = (gradient.type === "linear");
    const tag = isLinear ? "linearGradient" : "radialGradient";
    const gradEl = svgCreate(tag, { id });

    if (isLinear)
    {
        applyLinearGradientAttrs(gradEl, gradient.angle);
    }
    else
    {
        applyRadialGradientAttrs(gradEl, gradient);
    }

    appendGradientStops(gradEl, gradient.stops);

    return gradEl;
}

/**
 * Sets x1/y1/x2/y2 attributes for a linear gradient based on angle.
 *
 * @param gradEl - The linearGradient SVG element.
 * @param angle - Angle in degrees (0 = left to right).
 * @returns void
 */
function applyLinearGradientAttrs(gradEl: SVGElement, angle?: number): void
{
    const radians = ((angle || 0) * Math.PI) / 180;
    const x2 = Math.cos(radians).toFixed(4);
    const y2 = Math.sin(radians).toFixed(4);

    svgSetAttr(gradEl, {
        x1: "0", y1: "0",
        x2, y2
    });
}

/**
 * Sets cx/cy/r attributes for a radial gradient.
 *
 * @param gradEl - The radialGradient SVG element.
 * @param gradient - Gradient definition with optional centre and radius.
 * @returns void
 */
function applyRadialGradientAttrs(
    gradEl: SVGElement,
    gradient: GradientDefinition): void
{
    const cx = gradient.center ? String(gradient.center.x) : "0.5";
    const cy = gradient.center ? String(gradient.center.y) : "0.5";
    const r = gradient.radius ? String(gradient.radius) : "0.5";

    svgSetAttr(gradEl, { cx, cy, r });
}

/**
 * Appends colour stop elements to a gradient.
 *
 * @param gradEl - Parent gradient element.
 * @param stops - Array of offset/color stop definitions.
 * @returns void
 */
function appendGradientStops(
    gradEl: SVGElement,
    stops: { offset: number; color: string }[]): void
{
    for (const stop of stops)
    {
        const parsed = parseStopColor(stop.color);
        const attrs: Record<string, string> = {
            offset: String(stop.offset),
            "stop-color": parsed.color
        };

        if (parsed.opacity < 1)
        {
            attrs["stop-opacity"] = String(parsed.opacity);
        }

        gradEl.appendChild(svgCreate("stop", attrs));
    }
}

/**
 * Parse a colour string into a stop-color and stop-opacity pair.
 * Handles rgba(), rgb(), hex, and named colours.
 */
function parseStopColor(color: string): { color: string; opacity: number }
{
    const rgbaMatch = color.match(
        /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/
    );

    if (rgbaMatch)
    {
        const r = rgbaMatch[1];
        const g = rgbaMatch[2];
        const b = rgbaMatch[3];
        const a = parseFloat(rgbaMatch[4]);

        return { color: `rgb(${r}, ${g}, ${b})`, opacity: a };
    }

    return { color, opacity: 1 };
}

/**
 * Applies a stroke style to an SVG element. Handles solid colours,
 * dash patterns, line cap, and line join. When stroke is undefined,
 * applies the theme border-color default at width 1.5.
 *
 * @param el - Target SVG element to receive the stroke.
 * @param stroke - Stroke style specification, or undefined for default.
 * @returns void
 */
export function applyStrokeToSvg(el: SVGElement, stroke?: StrokeStyle): void
{
    if (!stroke)
    {
        el.setAttribute("stroke", DEFAULT_STROKE);
        el.setAttribute("stroke-width", String(DEFAULT_STROKE_WIDTH));
        return;
    }

    applyStrokeColor(el, stroke.color);
    el.setAttribute("stroke-width", String(stroke.width));

    if (stroke.dashPattern && stroke.dashPattern.length > 0)
    {
        el.setAttribute("stroke-dasharray", stroke.dashPattern.join(" "));
    }

    if (stroke.lineCap)
    {
        el.setAttribute("stroke-linecap", stroke.lineCap);
    }

    if (stroke.lineJoin)
    {
        el.setAttribute("stroke-linejoin", stroke.lineJoin);
    }
}

/**
 * Applies stroke colour, handling both string and gradient colours.
 *
 * @param el - Target SVG element.
 * @param color - Solid colour string or gradient definition.
 * @returns void
 */
function applyStrokeColor(el: SVGElement, color: string | GradientDefinition): void
{
    if (typeof color === "string")
    {
        el.setAttribute("stroke", color);
    }
    else
    {
        // Gradient stroke — create inline gradient and reference by URL
        const gradientId = "stroke-grad-" + Math.random().toString(36).substring(2, 10);
        const defs = svgCreate("defs");
        const gradEl = buildGradientElement(color, gradientId);

        defs.appendChild(gradEl);
        el.parentNode?.insertBefore(defs, el);
        el.setAttribute("stroke", `url(#${gradientId})`);
    }
}

// ============================================================================
// PER-EDGE STROKE RENDERING
// ============================================================================

/**
 * Side coordinate definitions for per-edge stroke lines.
 * Each side maps to two endpoints forming a line along that edge.
 */
const EDGE_SIDES: ReadonlyArray<{
    key: keyof PerEdgeStroke;
    coords: (b: Rect) => { x1: number; y1: number; x2: number; y2: number };
}> = [
    {
        key: "top",
        coords: (b) => ({ x1: b.x, y1: b.y, x2: b.x + b.width, y2: b.y })
    },
    {
        key: "right",
        coords: (b) => ({ x1: b.x + b.width, y1: b.y, x2: b.x + b.width, y2: b.y + b.height })
    },
    {
        key: "bottom",
        coords: (b) => ({ x1: b.x, y1: b.y + b.height, x2: b.x + b.width, y2: b.y + b.height })
    },
    {
        key: "left",
        coords: (b) => ({ x1: b.x, y1: b.y, x2: b.x, y2: b.y + b.height })
    },
];

/**
 * Renders per-edge stroke lines as an SVG group.
 *
 * Each enabled side of the bounding rectangle is drawn as a
 * separate `<line>` element with its own colour, width, and dash
 * pattern. Gradient colours produce inline `<linearGradient>` defs.
 *
 * @param bounds - Local-coordinate bounding rectangle.
 * @param perEdge - Per-edge stroke configuration.
 * @param fallback - Fallback stroke style for sides without overrides.
 * @returns SVG group containing the per-edge lines.
 */
export function renderPerEdgeStroke(
    bounds: Rect,
    perEdge: PerEdgeStroke,
    fallback?: StrokeStyle
): SVGGElement
{
    const g = svgCreate("g") as SVGGElement;
    const defs = svgCreate("defs");
    let hasDefs = false;

    for (const side of EDGE_SIDES)
    {
        const edge = perEdge[side.key];

        if (!edge || edge.visible === false)
        {
            continue;
        }

        const c = side.coords(bounds);
        const line = svgCreate("line", {
            x1: String(c.x1),
            y1: String(c.y1),
            x2: String(c.x2),
            y2: String(c.y2)
        });

        const color = edge.color ?? fallback?.color ?? DEFAULT_STROKE;
        const width = edge.width ?? fallback?.width ?? DEFAULT_STROKE_WIDTH;
        const dash = edge.dashPattern ?? fallback?.dashPattern;

        applyEdgeStrokeColor(line, color, side.key, defs, c);
        if (typeof color !== "string") { hasDefs = true; }

        line.setAttribute("stroke-width", String(width));

        if (dash && dash.length > 0)
        {
            line.setAttribute("stroke-dasharray", dash.join(" "));
        }

        g.appendChild(line);
    }

    if (hasDefs)
    {
        g.insertBefore(defs, g.firstChild);
    }

    return g;
}

/**
 * Applies stroke colour to a per-edge line element.
 *
 * For gradient colours, appends a `<linearGradient>` to the
 * supplied defs element so the gradient is available when
 * the line references it.
 *
 * @param el - The SVG line element.
 * @param color - Solid colour string or gradient definition.
 * @param sideKey - Side identifier used in the gradient ID.
 * @param defs - Shared defs element for gradient definitions.
 */
function applyEdgeStrokeColor(
    el: SVGElement,
    color: string | GradientDefinition,
    sideKey: string,
    defs: SVGElement,
    coords: { x1: number; y1: number; x2: number; y2: number }
): void
{
    if (typeof color === "string")
    {
        el.setAttribute("stroke", color);
    }
    else
    {
        const gradientId = `edge-grad-${sideKey}-${Math.random().toString(36).substring(2, 10)}`;
        const gradEl = buildEdgeGradientElement(color, gradientId, coords);

        defs.appendChild(gradEl);
        el.setAttribute("stroke", `url(#${gradientId})`);
    }
}

/**
 * Build a gradient element for a per-edge stroke line.
 * Uses userSpaceOnUse with the line's actual coordinates to avoid
 * the degenerate bounding box problem on zero-width/height lines.
 */
function buildEdgeGradientElement(
    gradient: GradientDefinition,
    id: string,
    coords: { x1: number; y1: number; x2: number; y2: number }
): SVGElement
{
    const gradEl = svgCreate("linearGradient", {
        id,
        gradientUnits: "userSpaceOnUse",
        x1: String(coords.x1),
        y1: String(coords.y1),
        x2: String(coords.x2),
        y2: String(coords.y2)
    });

    appendGradientStops(gradEl, gradient.stops);

    return gradEl;
}

// ============================================================================
// PORT AND HANDLE GENERATORS
// ============================================================================

/**
 * Creates the four default connection ports at the north, south, east,
 * and west midpoints of a bounding rectangle.
 *
 * @param bounds - Bounding rectangle of the shape.
 * @returns Array of four ConnectionPort definitions.
 */
export function createDefaultPorts(bounds: Rect): ConnectionPort[]
{
    return [
        { id: "port-n",  position: { x: 0.5, y: 0 },   direction: "north", maxConnections: 0 },
        { id: "port-ne", position: { x: 1,   y: 0 },   direction: "any",   maxConnections: 0 },
        { id: "port-e",  position: { x: 1,   y: 0.5 },  direction: "east",  maxConnections: 0 },
        { id: "port-se", position: { x: 1,   y: 1 },   direction: "any",   maxConnections: 0 },
        { id: "port-s",  position: { x: 0.5, y: 1 },   direction: "south", maxConnections: 0 },
        { id: "port-sw", position: { x: 0,   y: 1 },   direction: "any",   maxConnections: 0 },
        { id: "port-w",  position: { x: 0,   y: 0.5 },  direction: "west",  maxConnections: 0 },
        { id: "port-nw", position: { x: 0,   y: 0 },   direction: "any",   maxConnections: 0 },
        { id: "port-c",  position: { x: 0.5, y: 0.5 },  direction: "any",   maxConnections: 0 },
    ];
}

/**
 * Creates the eight standard resize handles at the corners and edge
 * midpoints of a bounding rectangle.
 *
 * @param bounds - Bounding rectangle of the shape.
 * @returns Array of eight ResizeHandle definitions.
 */
export function createBoundingBoxHandles(bounds: Rect): ResizeHandle[]
{
    const x = bounds.x;
    const y = bounds.y;
    const w = bounds.width;
    const h = bounds.height;

    return buildCornerHandles(x, y, w, h)
        .concat(buildEdgeHandles(x, y, w, h));
}

/**
 * Builds the four corner resize handles (nw, ne, sw, se).
 *
 * @param x - Left edge of bounds.
 * @param y - Top edge of bounds.
 * @param w - Width of bounds.
 * @param h - Height of bounds.
 * @returns Array of four corner ResizeHandle definitions.
 */
function buildCornerHandles(x: number, y: number, w: number, h: number): ResizeHandle[]
{
    return [
        { id: "handle-nw", position: { x, y },             cursor: "nwse-resize", axis: "nw" },
        { id: "handle-ne", position: { x: x + w, y },      cursor: "nesw-resize", axis: "ne" },
        { id: "handle-sw", position: { x, y: y + h },      cursor: "nesw-resize", axis: "sw" },
        { id: "handle-se", position: { x: x + w, y: y + h }, cursor: "nwse-resize", axis: "se" }
    ];
}

/**
 * Builds the four edge midpoint resize handles (n, s, e, w).
 *
 * @param x - Left edge of bounds.
 * @param y - Top edge of bounds.
 * @param w - Width of bounds.
 * @param h - Height of bounds.
 * @returns Array of four edge ResizeHandle definitions.
 */
function buildEdgeHandles(x: number, y: number, w: number, h: number): ResizeHandle[]
{
    const midX = x + (w / 2);
    const midY = y + (h / 2);

    return [
        { id: "handle-n", position: { x: midX, y },      cursor: "ns-resize", axis: "n" },
        { id: "handle-s", position: { x: midX, y: y + h }, cursor: "ns-resize", axis: "s" },
        { id: "handle-e", position: { x: x + w, y: midY }, cursor: "ew-resize", axis: "e" },
        { id: "handle-w", position: { x, y: midY },       cursor: "ew-resize", axis: "w" }
    ];
}

// ============================================================================
// HIT TESTING
// ============================================================================

/**
 * Tests whether a point lies within an axis-aligned rectangle.
 *
 * @param point - The point to test in canvas coordinates.
 * @param bounds - The bounding rectangle to test against.
 * @returns true if the point is inside the rectangle.
 */
export function rectHitTest(point: Point, bounds: Rect): boolean
{
    return (
        (point.x >= bounds.x) &&
        (point.x <= bounds.x + bounds.width) &&
        (point.y >= bounds.y) &&
        (point.y <= bounds.y + bounds.height)
    );
}

// ============================================================================
// SHAPE REGISTRY
// ============================================================================

/**
 * Central registry for shape definitions. Shapes are registered by type
 * string and can be retrieved individually, as a full list, or filtered
 * by category. The engine and stencil palette use this registry to
 * resolve shape types and populate the shape chooser.
 */
export class ShapeRegistry
{
    /** Map of shape type to definition. */
    private readonly _shapes: Map<string, ShapeDefinition> = new Map();

    /**
     * Registers a shape definition. Overwrites any existing shape
     * with the same type string.
     *
     * @param shape - The shape definition to register.
     * @returns void
     */
    public register(shape: ShapeDefinition): void
    {
        if (!shape || !shape.type)
        {
            console.error(LOG_PREFIX, "Cannot register shape without a type");
            return;
        }

        console.debug(LOG_PREFIX, "Registered shape:", shape.type);
        this._shapes.set(shape.type, shape);
    }

    /**
     * Retrieves a shape definition by its type string.
     *
     * @param type - The unique type identifier of the shape.
     * @returns The shape definition, or null if not found.
     */
    public get(type: string): ShapeDefinition | null
    {
        return this._shapes.get(type) || null;
    }

    /**
     * Returns all registered shape definitions.
     *
     * @returns Array of all shape definitions.
     */
    public getAll(): ShapeDefinition[]
    {
        return Array.from(this._shapes.values());
    }

    /**
     * Returns all shapes belonging to a specific category.
     *
     * @param category - The category to filter by.
     * @returns Array of shape definitions in the given category.
     */
    public getByCategory(category: string): ShapeDefinition[]
    {
        const result: ShapeDefinition[] = [];

        for (const shape of this._shapes.values())
        {
            if (shape.category === category)
            {
                result.push(shape);
            }
        }

        return result;
    }
}
