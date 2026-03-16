/*
 * ----------------------------------------------------------------------------
 * COMPONENT: DiagramEngine Phase 6 Extensions
 * PURPOSE: Layout algorithms, PNG/PDF export, find/replace, format painter,
 *    spatial queries, graph analysis, group collapse/expand, comments,
 *    and deep linking. Methods are defined as standalone functions and
 *    assigned to DiagramEngineImpl.prototype for runtime availability.
 * RELATES: [[DiagramEngine]], [[RenderEngine]], [[Templates]]
 * FLOW: [Consumer API] -> [Phase6 Methods] -> [Engine internals]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// CONSTANTS
// ============================================================================

/** Log prefix for phase 6 console messages. */
const P6_LOG = "[DiagramEngine:P6]";

/** Default number of columns for the grid layout. */
const GRID_DEFAULT_COLUMNS = 4;

/** Default gap between cells in the grid layout (pixels). */
const GRID_DEFAULT_GAP = 40;

/** Default angular step for circular (force) layout (radians). */
const FORCE_DEFAULT_RADIUS = 300;

/** Default scale factor for PNG export. */
const PNG_DEFAULT_SCALE = 2;

/** Default background colour for PNG export. */
const PNG_DEFAULT_BG = "#ffffff";

// ============================================================================
// INTERNAL TYPE
// ============================================================================

/**
 * Accessor for engine internals. Enables runtime access to private
 * fields that TypeScript compiles to plain properties.
 */
type P6Internals = DiagramEngineImpl & {
    doc: DiagramDocument;
    markDirty(): void;
    reRenderAll(): void;
    renderer: { getSvgElement(): SVGElement };
};

/** Style properties captured by the format painter. */
interface CapturedFormat
{
    fill?: FillStyle;
    stroke?: StrokeStyle;
    shadow?: ShadowStyle;
    opacity?: number;
}

// ============================================================================
// MODULE STATE
// ============================================================================

/** Registered custom layout functions, keyed by name. */
const layoutRegistry = new Map<string, LayoutFunction>();

/** Format painter clipboard. */
let formatClipboard: CapturedFormat | null = null;

// ============================================================================
// LAYOUT — REGISTRATION
// ============================================================================

/**
 * Registers a custom layout algorithm by name. Overwrites any
 * previously registered layout with the same name.
 *
 * @param engine - The engine instance (unused but required by pattern).
 * @param name - Unique layout name.
 * @param fn - Layout function to register.
 */
function engineRegisterLayout(
    engine: any,
    name: string,
    fn: LayoutFunction
): void
{
    layoutRegistry.set(name, fn);
    console.log(P6_LOG, "Layout registered:", name);
}

// ============================================================================
// LAYOUT — DISPATCH
// ============================================================================

/**
 * Dispatches a layout by name. Checks the custom registry first, then
 * falls back to built-in layouts. Applies the resulting positions to
 * objects and re-renders.
 *
 * @param engine - The engine instance.
 * @param name - Layout name (e.g. "force", "grid", or a custom name).
 * @param options - Layout-specific configuration.
 */
async function engineApplyLayout(
    engine: any,
    name: string,
    options?: Record<string, unknown>
): Promise<void>
{
    const opts = options ?? {};
    const objects = engine.getObjects();
    const connectors = engine.getConnectors();

    const positions = await resolveLayoutPositions(
        name, objects, connectors, opts
    );

    if (!positions)
    {
        console.warn(P6_LOG, "Unknown layout:", name);
        return;
    }

    applyPositions(engine, positions);
}

/**
 * Resolves layout positions from a custom or built-in layout.
 * Returns null if no matching layout is found.
 *
 * @param name - Layout name.
 * @param objects - All document objects.
 * @param connectors - All document connectors.
 * @param opts - Layout options.
 * @returns A map of object ID to new position, or null.
 */
async function resolveLayoutPositions(
    name: string,
    objects: DiagramObject[],
    connectors: DiagramConnector[],
    opts: Record<string, unknown>
): Promise<Map<string, Point> | null>
{
    const custom = layoutRegistry.get(name);

    if (custom)
    {
        return await custom(objects, connectors, opts);
    }

    if (name === "force")
    {
        return layoutForce(objects, opts);
    }

    if (name === "grid")
    {
        return layoutGrid(objects, opts);
    }

    return null;
}

/**
 * Applies a position map to the engine's objects and re-renders.
 *
 * @param engine - The engine instance.
 * @param positions - Map of object ID to new position.
 */
function applyPositions(
    engine: any,
    positions: Map<string, Point>
): void
{
    const self = engine as any;

    for (const [id, pos] of positions)
    {
        engine.moveObjectTo(id, pos);
    }

    self.reRenderAll();
    self.markDirty();
    console.log(P6_LOG, "Layout applied,", positions.size, "objects positioned");
}

// ============================================================================
// LAYOUT — BUILT-IN: FORCE (CIRCULAR)
// ============================================================================

/**
 * Places objects in a circular arrangement around a centre point.
 * The radius scales with object count for visual balance.
 *
 * @param objects - Objects to lay out.
 * @param opts - Options: `radius` (number) overrides default.
 * @returns A map of object ID to circular position.
 */
function layoutForce(
    objects: DiagramObject[],
    opts: Record<string, unknown>
): Map<string, Point>
{
    const radius = typeof opts.radius === "number"
        ? opts.radius
        : FORCE_DEFAULT_RADIUS;

    const cx = radius + 100;
    const cy = radius + 100;
    const positions = new Map<string, Point>();
    const step = (2 * Math.PI) / Math.max(objects.length, 1);

    for (let i = 0; i < objects.length; i++)
    {
        const angle = step * i;
        const x = cx + radius * Math.cos(angle);
        const y = cy + radius * Math.sin(angle);
        positions.set(objects[i].id, { x, y });
    }

    return positions;
}

// ============================================================================
// LAYOUT — BUILT-IN: GRID
// ============================================================================

/**
 * Arranges objects in a grid pattern with configurable columns and gap.
 *
 * @param objects - Objects to lay out.
 * @param opts - Options: `columns` (number), `gap` (number).
 * @returns A map of object ID to grid position.
 */
function layoutGrid(
    objects: DiagramObject[],
    opts: Record<string, unknown>
): Map<string, Point>
{
    const columns = typeof opts.columns === "number"
        ? opts.columns
        : GRID_DEFAULT_COLUMNS;

    const gap = typeof opts.gap === "number"
        ? opts.gap
        : GRID_DEFAULT_GAP;

    const positions = new Map<string, Point>();
    const cellW = computeMaxDimension(objects, "width") + gap;
    const cellH = computeMaxDimension(objects, "height") + gap;

    for (let i = 0; i < objects.length; i++)
    {
        const col = i % columns;
        const row = Math.floor(i / columns);
        positions.set(objects[i].id, { x: col * cellW + gap, y: row * cellH + gap });
    }

    return positions;
}

/**
 * Computes the maximum width or height across all objects.
 *
 * @param objects - Objects to measure.
 * @param dim - Dimension to measure ("width" or "height").
 * @returns The maximum value found, or 100 if no objects.
 */
function computeMaxDimension(
    objects: DiagramObject[],
    dim: "width" | "height"
): number
{
    if (objects.length === 0)
    {
        return 100;
    }

    let max = 0;

    for (const obj of objects)
    {
        const val = obj.presentation.bounds[dim];

        if (val > max)
        {
            max = val;
        }
    }

    return max || 100;
}

// ============================================================================
// EXPORT — PNG
// ============================================================================

/**
 * Exports the diagram as a PNG Blob via an SVG to Image to Canvas
 * pipeline. The SVG is serialised, loaded into an Image element,
 * drawn onto a Canvas, and converted to a Blob.
 *
 * @param engine - The engine instance.
 * @param options - Export options: scale factor and background colour.
 * @returns A Promise resolving to a PNG Blob.
 */
async function engineExportPNG(
    engine: any,
    options?: { scale?: number; background?: string }
): Promise<Blob>
{
    const self = engine as any;
    const svg = self.renderer.getSvgElement();
    const scale = options?.scale ?? PNG_DEFAULT_SCALE;
    const bg = options?.background ?? PNG_DEFAULT_BG;

    const svgData = serializeSvg(svg);
    const img = await loadSvgAsImage(svgData, svg, scale);
    const blob = renderImageToBlob(img, svg, scale, bg);

    console.log(P6_LOG, "PNG exported, scale:", scale);
    return blob;
}

/**
 * Serialises an SVG element to an XML string.
 *
 * @param svg - The SVG element.
 * @returns Serialised SVG XML.
 */
function serializeSvg(svg: SVGElement): string
{
    const serializer = new XMLSerializer();
    return serializer.serializeToString(svg);
}

/**
 * Loads serialised SVG data into an Image element for canvas drawing.
 *
 * @param svgData - Serialised SVG XML.
 * @param svg - The original SVG element (for dimensions).
 * @param scale - Scale multiplier.
 * @returns A Promise resolving to the loaded Image.
 */
function loadSvgAsImage(
    svgData: string,
    svg: SVGElement,
    scale: number
): Promise<HTMLImageElement>
{
    return new Promise((resolve, reject) =>
    {
        const img = new Image();
        const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);

        img.onload = () =>
        {
            URL.revokeObjectURL(url);
            resolve(img);
        };

        img.onerror = () =>
        {
            URL.revokeObjectURL(url);
            reject(new Error(`${P6_LOG} Failed to load SVG as image`));
        };

        img.width = svg.clientWidth * scale;
        img.height = svg.clientHeight * scale;
        img.src = url;
    });
}

/**
 * Draws a loaded Image onto a Canvas and converts to a PNG Blob.
 *
 * @param img - The loaded Image element.
 * @param svg - The original SVG element (for dimensions).
 * @param scale - Scale multiplier.
 * @param bg - Background colour.
 * @returns A Promise resolving to the PNG Blob.
 */
function renderImageToBlob(
    img: HTMLImageElement,
    svg: SVGElement,
    scale: number,
    bg: string
): Promise<Blob>
{
    const canvas = createExportCanvas(svg, scale);
    const ctx = canvas.getContext("2d");

    if (!ctx)
    {
        return Promise.reject(new Error(`${P6_LOG} Canvas 2D context unavailable`));
    }

    drawToCanvas(ctx, img, canvas.width, canvas.height, bg);
    return canvasToBlob(canvas);
}

/**
 * Creates a canvas element sized for SVG export.
 *
 * @param svg - The SVG element for dimensions.
 * @param scale - Scale multiplier.
 * @returns A canvas element.
 */
function createExportCanvas(svg: SVGElement, scale: number): HTMLCanvasElement
{
    const canvas = document.createElement("canvas");
    canvas.width = svg.clientWidth * scale;
    canvas.height = svg.clientHeight * scale;
    return canvas;
}

/**
 * Draws a background and image onto a canvas context.
 *
 * @param ctx - Canvas 2D rendering context.
 * @param img - The image to draw.
 * @param w - Canvas width.
 * @param h - Canvas height.
 * @param bg - Background colour.
 */
function drawToCanvas(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    w: number,
    h: number,
    bg: string
): void
{
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
}

/**
 * Converts a canvas to a PNG Blob via the toBlob API.
 *
 * @param canvas - The canvas to convert.
 * @returns A Promise resolving to the PNG Blob.
 */
function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob>
{
    return new Promise((resolve, reject) =>
    {
        canvas.toBlob((blob) =>
        {
            if (blob)
            {
                resolve(blob);
            }
            else
            {
                reject(new Error(`${P6_LOG} Canvas toBlob returned null`));
            }
        }, "image/png");
    });
}

// ============================================================================
// EXPORT — PDF
// ============================================================================

/**
 * Exports the diagram as a print-ready PDF Blob. Generates an HTML
 * document with the embedded SVG and converts it to a Blob.
 *
 * @param engine - The engine instance.
 * @returns A Promise resolving to a PDF-ready HTML Blob.
 */
async function engineExportPDF(
    engine: any
): Promise<Blob>
{
    const self = engine as any;
    const svg = self.renderer.getSvgElement();
    const svgData = serializeSvg(svg);
    const title = self.doc.metadata?.title ?? "Diagram";
    const html = buildPdfHtml(title, svgData);

    console.log(P6_LOG, "PDF HTML exported for:", title);
    return new Blob([html], { type: "text/html;charset=utf-8" });
}

/**
 * Builds a print-ready HTML document embedding the SVG content.
 *
 * @param title - Document title.
 * @param svgContent - Serialised SVG XML.
 * @returns Complete HTML string.
 */
function buildPdfHtml(title: string, svgContent: string): string
{
    return [
        "<!DOCTYPE html>",
        "<html><head>",
        `<title>${escapeHtmlText(title)}</title>`,
        "<style>",
        "@media print { body { margin: 0; } }",
        "body { display: flex; justify-content: center; align-items: center; min-height: 100vh; }",
        "svg { max-width: 100%; height: auto; }",
        "</style>",
        "</head><body>",
        svgContent,
        "</body></html>",
    ].join("\n");
}

/**
 * Escapes HTML special characters in text for safe embedding.
 *
 * @param text - Raw text.
 * @returns HTML-escaped text.
 */
function escapeHtmlText(text: string): string
{
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

// ============================================================================
// FIND AND REPLACE
// ============================================================================

/**
 * Searches all objects for text content matching a query string.
 * Returns an array of matches with object IDs and matched text.
 *
 * @param engine - The engine instance.
 * @param query - Search string.
 * @param options - Search options: caseSensitive (default false).
 * @returns Array of match results with objectId and text.
 */
function engineFindText(
    engine: any,
    query: string,
    options?: { caseSensitive?: boolean }
): { objectId: string; text: string }[]
{
    const caseSensitive = options?.caseSensitive ?? false;
    const results: { objectId: string; text: string }[] = [];
    const objects = engine.getObjects();

    for (const obj of objects)
    {
        findInObject(obj, query, caseSensitive, results);
    }

    console.log(P6_LOG, "Find:", results.length, "matches for", JSON.stringify(query));
    return results;
}

/**
 * Checks a single object's text content for query matches.
 *
 * @param obj - Object to search.
 * @param query - Search string.
 * @param caseSensitive - Whether search is case-sensitive.
 * @param results - Accumulator array for results.
 */
function findInObject(
    obj: DiagramObject,
    query: string,
    caseSensitive: boolean,
    results: { objectId: string; text: string }[]
): void
{
    const tc = obj.presentation.textContent;

    if (!tc)
    {
        return;
    }

    const runs = collectAllRuns(tc);

    for (const run of runs)
    {
        if (!("text" in run))
        {
            continue;
        }

        const text = (run as TextRun).text;

        if (textMatches(text, query, caseSensitive))
        {
            results.push({ objectId: obj.id, text });
        }
    }
}

/**
 * Collects all content runs from a TextContent, including both flat
 * runs and runs within blocks.
 *
 * @param tc - The text content to traverse.
 * @returns Flat array of all ContentRun instances.
 */
function collectAllRuns(tc: TextContent): ContentRun[]
{
    const all: ContentRun[] = [];

    if (tc.runs)
    {
        all.push(...tc.runs);
    }

    if (tc.blocks)
    {
        for (const block of tc.blocks)
        {
            all.push(...block.runs);
        }
    }

    return all;
}

/**
 * Tests whether a text string contains a query, respecting case.
 *
 * @param text - Text to search.
 * @param query - Query string.
 * @param caseSensitive - Whether to respect case.
 * @returns true if the text contains the query.
 */
function textMatches(
    text: string,
    query: string,
    caseSensitive: boolean
): boolean
{
    if (caseSensitive)
    {
        return text.includes(query);
    }

    return text.toLowerCase().includes(query.toLowerCase());
}

/**
 * Replaces all occurrences of a query string in all objects' text
 * content. Returns the total number of replacements made.
 *
 * @param engine - The engine instance.
 * @param query - String to find.
 * @param replacement - Replacement string.
 * @param options - Search options: caseSensitive (default false).
 * @returns Total number of replacements made.
 */
function engineReplaceText(
    engine: any,
    query: string,
    replacement: string,
    options?: { caseSensitive?: boolean }
): number
{
    const caseSensitive = options?.caseSensitive ?? false;
    const objects = engine.getObjects();
    let count = 0;

    for (const obj of objects)
    {
        count += replaceInObject(obj, query, replacement, caseSensitive);
    }

    if (count > 0)
    {
        (engine as any).reRenderAll();
        (engine as any).markDirty();
    }

    console.log(P6_LOG, "Replace:", count, "substitutions");
    return count;
}

/**
 * Replaces matching text in a single object's content runs.
 *
 * @param obj - Object to process.
 * @param query - String to find.
 * @param replacement - Replacement string.
 * @param caseSensitive - Whether search is case-sensitive.
 * @returns Number of replacements made in this object.
 */
function replaceInObject(
    obj: DiagramObject,
    query: string,
    replacement: string,
    caseSensitive: boolean
): number
{
    const tc = obj.presentation.textContent;

    if (!tc)
    {
        return 0;
    }

    const runs = collectAllRuns(tc);
    let count = 0;

    for (const run of runs)
    {
        if ("text" in run)
        {
            const result = replaceInRun(run as TextRun, query, replacement, caseSensitive);
            count += result;
        }
    }

    return count;
}

/**
 * Replaces matching text within a single text run. Builds a
 * case-insensitive or exact regex to find all occurrences.
 *
 * @param run - The text run to modify.
 * @param query - String to find.
 * @param replacement - Replacement string.
 * @param caseSensitive - Whether search is case-sensitive.
 * @returns Number of replacements made in this run.
 */
function replaceInRun(
    run: TextRun,
    query: string,
    replacement: string,
    caseSensitive: boolean
): number
{
    const flags = caseSensitive ? "g" : "gi";
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, flags);
    const matches = run.text.match(regex);
    const count = matches ? matches.length : 0;

    if (count > 0)
    {
        run.text = run.text.replace(regex, replacement);
    }

    return count;
}

// ============================================================================
// FORMAT PAINTER
// ============================================================================

/**
 * Copies the style of the specified object to the format clipboard.
 *
 * @param engine - The engine instance.
 * @param objectId - ID of the object whose style to copy.
 */
function enginePickFormat(
    engine: any,
    objectId: string
): void
{
    const obj = engine.getObject(objectId);

    if (!obj)
    {
        console.warn(P6_LOG, "pickFormat: object not found:", objectId);
        return;
    }

    const style = obj.presentation.style;

    formatClipboard = {
        fill: style.fill ? JSON.parse(JSON.stringify(style.fill)) : undefined,
        stroke: style.stroke ? JSON.parse(JSON.stringify(style.stroke)) : undefined,
        shadow: style.shadow ? JSON.parse(JSON.stringify(style.shadow)) : undefined,
        opacity: style.opacity,
    };

    console.log(P6_LOG, "Format picked from:", objectId);
}

/**
 * Applies the captured format to each target object's style.
 *
 * @param engine - The engine instance.
 * @param targetIds - IDs of objects to apply the format to.
 */
function engineApplyFormat(
    engine: any,
    targetIds: string[]
): void
{
    if (!formatClipboard)
    {
        console.warn(P6_LOG, "applyFormat: no format captured");
        return;
    }

    for (const id of targetIds)
    {
        applyFormatToObject(engine, id);
    }

    (engine as any).reRenderAll();
    (engine as any).markDirty();
    console.log(P6_LOG, "Format applied to", targetIds.length, "objects");
}

/**
 * Applies the format clipboard to a single object's style.
 *
 * @param engine - The engine instance.
 * @param objectId - Object ID to update.
 */
function applyFormatToObject(
    engine: any,
    objectId: string
): void
{
    const obj = engine.getObject(objectId);

    if (!obj || !formatClipboard)
    {
        return;
    }

    const style = obj.presentation.style;

    if (formatClipboard.fill)
    {
        style.fill = JSON.parse(JSON.stringify(formatClipboard.fill));
    }

    if (formatClipboard.stroke)
    {
        style.stroke = JSON.parse(JSON.stringify(formatClipboard.stroke));
    }

    if (formatClipboard.shadow)
    {
        style.shadow = JSON.parse(JSON.stringify(formatClipboard.shadow));
    }

    if (formatClipboard.opacity !== undefined)
    {
        style.opacity = formatClipboard.opacity;
    }
}

/**
 * Clears the format painter clipboard.
 */
function engineClearFormat(): void
{
    formatClipboard = null;
    console.log(P6_LOG, "Format clipboard cleared");
}

/**
 * Checks whether the format painter clipboard holds a captured style.
 *
 * @returns true if a format is captured.
 */
function engineHasFormat(): boolean
{
    return formatClipboard !== null;
}

// ============================================================================
// SPATIAL QUERIES
// ============================================================================

/**
 * Finds all visible objects whose bounds intersect the given rectangle.
 *
 * @param engine - The engine instance.
 * @param rect - Query rectangle in canvas coordinates.
 * @returns Array of objects overlapping the rectangle.
 */
function engineFindObjectsInRect(
    engine: any,
    rect: Rect
): DiagramObject[]
{
    const objects = engine.getObjects();
    const results: DiagramObject[] = [];

    for (const obj of objects)
    {
        if (!obj.presentation.visible)
        {
            continue;
        }

        if (boundsIntersect(obj.presentation.bounds, rect))
        {
            results.push(obj);
        }
    }

    return results;
}

/**
 * Tests whether two rectangles overlap (axis-aligned).
 *
 * @param a - First rectangle.
 * @param b - Second rectangle.
 * @returns true if they intersect.
 */
function boundsIntersect(a: Rect, b: Rect): boolean
{
    return (
        a.x < (b.x + b.width)
        && (a.x + a.width) > b.x
        && a.y < (b.y + b.height)
        && (a.y + a.height) > b.y
    );
}

/**
 * Finds all visible objects whose bounds contain the given point.
 *
 * @param engine - The engine instance.
 * @param point - Query point in canvas coordinates.
 * @returns Array of objects containing the point.
 */
function engineFindObjectsAtPoint(
    engine: any,
    point: Point
): DiagramObject[]
{
    const objects = engine.getObjects();
    const results: DiagramObject[] = [];

    for (const obj of objects)
    {
        if (!obj.presentation.visible)
        {
            continue;
        }

        if (pointInBounds(point, obj.presentation.bounds))
        {
            results.push(obj);
        }
    }

    return results;
}

/**
 * Tests whether a point lies within a rectangle.
 *
 * @param p - Point to test.
 * @param b - Bounding rectangle.
 * @returns true if the point is inside the bounds.
 */
function pointInBounds(p: Point, b: Rect): boolean
{
    return (
        p.x >= b.x
        && p.x <= (b.x + b.width)
        && p.y >= b.y
        && p.y <= (b.y + b.height)
    );
}

// ============================================================================
// GRAPH ANALYSIS — ADJACENCY
// ============================================================================

/**
 * Builds an adjacency list from connectors. Each key is an object ID
 * and its value is a set of directly connected object IDs.
 *
 * @param connectors - All connectors in the document.
 * @returns Adjacency map.
 */
function buildAdjacencyMap(
    connectors: DiagramConnector[]
): Map<string, Set<string>>
{
    const adj = new Map<string, Set<string>>();

    for (const conn of connectors)
    {
        const src = conn.presentation.sourceId;
        const tgt = conn.presentation.targetId;

        if (!adj.has(src)) { adj.set(src, new Set()); }
        if (!adj.has(tgt)) { adj.set(tgt, new Set()); }

        adj.get(src)!.add(tgt);
        adj.get(tgt)!.add(src);
    }

    return adj;
}

// ============================================================================
// GRAPH ANALYSIS — SHORTEST PATH (BFS)
// ============================================================================

/**
 * Finds the shortest path between two objects using BFS on the
 * connector graph. Returns an array of object IDs forming the path,
 * or an empty array if no path exists.
 *
 * @param engine - The engine instance.
 * @param fromId - Starting object ID.
 * @param toId - Destination object ID.
 * @returns Array of object IDs from source to destination (inclusive).
 */
function engineGetShortestPath(
    engine: any,
    fromId: string,
    toId: string
): string[]
{
    if (fromId === toId)
    {
        return [fromId];
    }

    const connectors = engine.getConnectors();
    const adj = buildAdjacencyMap(connectors);

    return bfsPath(adj, fromId, toId);
}

/**
 * Performs BFS on an adjacency map to find the shortest path.
 *
 * @param adj - Adjacency map.
 * @param fromId - Start node.
 * @param toId - End node.
 * @returns Path as array of node IDs, or empty if unreachable.
 */
function bfsPath(
    adj: Map<string, Set<string>>,
    fromId: string,
    toId: string
): string[]
{
    const visited = new Set<string>([fromId]);
    const parent = new Map<string, string>();
    const queue: string[] = [fromId];

    while (queue.length > 0)
    {
        const current = queue.shift()!;

        if (current === toId)
        {
            return reconstructPath(parent, fromId, toId);
        }

        bfsEnqueueNeighbours(adj, current, visited, parent, queue);
    }

    return [];
}

/**
 * Enqueues unvisited neighbours of a node during BFS traversal.
 *
 * @param adj - Adjacency map.
 * @param current - Current node being processed.
 * @param visited - Set of already-visited nodes.
 * @param parent - Parent map for path reconstruction.
 * @param queue - BFS queue.
 */
function bfsEnqueueNeighbours(
    adj: Map<string, Set<string>>,
    current: string,
    visited: Set<string>,
    parent: Map<string, string>,
    queue: string[]
): void
{
    const neighbours = adj.get(current);

    if (!neighbours)
    {
        return;
    }

    for (const n of neighbours)
    {
        if (!visited.has(n))
        {
            visited.add(n);
            parent.set(n, current);
            queue.push(n);
        }
    }
}

/**
 * Reconstructs the path from BFS parent pointers.
 *
 * @param parent - Map of child to parent node.
 * @param fromId - Start node.
 * @param toId - End node.
 * @returns Ordered path from start to end.
 */
function reconstructPath(
    parent: Map<string, string>,
    fromId: string,
    toId: string
): string[]
{
    const path: string[] = [toId];
    let current = toId;

    while (current !== fromId)
    {
        current = parent.get(current)!;
        path.push(current);
    }

    return path.reverse();
}

// ============================================================================
// GRAPH ANALYSIS — CONNECTED COMPONENTS (DFS)
// ============================================================================

/**
 * Finds all connected components in the diagram graph using DFS.
 * Each component is an array of object IDs that are reachable from
 * each other via connectors.
 *
 * @param engine - The engine instance.
 * @returns Array of connected components (each an array of object IDs).
 */
function engineGetConnectedComponents(
    engine: any
): string[][]
{
    const connectors = engine.getConnectors();
    const objects = engine.getObjects();
    const adj = buildAdjacencyMap(connectors);
    const visited = new Set<string>();
    const components: string[][] = [];

    for (const obj of objects)
    {
        if (!visited.has(obj.id))
        {
            const component = dfsCollect(adj, obj.id, visited);
            components.push(component);
        }
    }

    return components;
}

/**
 * Collects all nodes reachable from a start node via DFS.
 *
 * @param adj - Adjacency map.
 * @param startId - Starting node ID.
 * @param visited - Global visited set (updated in place).
 * @returns Array of IDs in this component.
 */
function dfsCollect(
    adj: Map<string, Set<string>>,
    startId: string,
    visited: Set<string>
): string[]
{
    const component: string[] = [];
    const stack: string[] = [startId];

    while (stack.length > 0)
    {
        const current = stack.pop()!;

        if (visited.has(current))
        {
            continue;
        }

        visited.add(current);
        component.push(current);
        dfsStackNeighbours(adj, current, visited, stack);
    }

    return component;
}

/**
 * Pushes unvisited neighbours of a node onto the DFS stack.
 *
 * @param adj - Adjacency map.
 * @param current - Current node being processed.
 * @param visited - Set of already-visited nodes.
 * @param stack - DFS stack.
 */
function dfsStackNeighbours(
    adj: Map<string, Set<string>>,
    current: string,
    visited: Set<string>,
    stack: string[]
): void
{
    const neighbours = adj.get(current);

    if (!neighbours)
    {
        return;
    }

    for (const n of neighbours)
    {
        if (!visited.has(n))
        {
            stack.push(n);
        }
    }
}

// ============================================================================
// GRAPH ANALYSIS — DIRECTIONAL CONNECTORS
// ============================================================================

/**
 * Returns all connectors whose target is the specified object.
 *
 * @param engine - The engine instance.
 * @param objectId - Object ID to query.
 * @returns Array of incoming connectors.
 */
function engineGetIncomingConnectors(
    engine: any,
    objectId: string
): DiagramConnector[]
{
    return engine.getConnectors().filter(
        (c: DiagramConnector) => c.presentation.targetId === objectId
    );
}

/**
 * Returns all connectors whose source is the specified object.
 *
 * @param engine - The engine instance.
 * @param objectId - Object ID to query.
 * @returns Array of outgoing connectors.
 */
function engineGetOutgoingConnectors(
    engine: any,
    objectId: string
): DiagramConnector[]
{
    return engine.getConnectors().filter(
        (c: DiagramConnector) => c.presentation.sourceId === objectId
    );
}

// ============================================================================
// GROUP COLLAPSE / EXPAND
// ============================================================================

/**
 * Collapses a group by hiding all its child objects. The group object
 * itself remains visible as a placeholder.
 *
 * @param engine - The engine instance.
 * @param groupId - ID of the group to collapse.
 */
function engineCollapseGroup(
    engine: any,
    groupId: string
): void
{
    const self = engine as any;
    const children = engine.getObjects().filter(
        (o: DiagramObject) => o.presentation.groupId === groupId
    );

    for (const child of children)
    {
        child.presentation.visible = false;
    }

    self.reRenderAll();
    self.markDirty();
    console.log(P6_LOG, "Collapsed group:", groupId, "->", children.length, "children hidden");
}

/**
 * Expands a group by showing all its child objects.
 *
 * @param engine - The engine instance.
 * @param groupId - ID of the group to expand.
 */
function engineExpandGroup(
    engine: any,
    groupId: string
): void
{
    const self = engine as any;
    const children = engine.getObjects().filter(
        (o: DiagramObject) => o.presentation.groupId === groupId
    );

    for (const child of children)
    {
        child.presentation.visible = true;
    }

    self.reRenderAll();
    self.markDirty();
    console.log(P6_LOG, "Expanded group:", groupId, "->", children.length, "children shown");
}

// ============================================================================
// COMMENTS
// ============================================================================

/**
 * Adds a comment anchored to an object, connector, or canvas position.
 *
 * @param engine - The engine instance.
 * @param anchor - Anchor specification (type + entityId or position).
 * @param content - DiagramComment text.
 * @param userId - Author user ID.
 * @param userName - Author display name.
 * @returns The newly created DiagramComment.
 */
function engineAddComment(
    engine: any,
    anchor: DiagramComment["anchor"],
    content: string,
    userId: string,
    userName: string
): DiagramComment
{
    const self = engine as any;
    const now = new Date().toISOString();
    const id = generateId();

    const comment: DiagramComment = {
        id,
        anchor,
        thread: [buildCommentEntry(userId, userName, content, now)],
        status: "open",
        created: now,
        updated: now,
    };

    self.doc.comments.push(comment);
    self.markDirty();
    console.log(P6_LOG, "DiagramComment added:", id, "by", userName);
    return comment;
}

/**
 * Builds a single comment thread entry.
 *
 * @param userId - Author user ID.
 * @param userName - Author display name.
 * @param content - DiagramComment text.
 * @param timestamp - ISO timestamp.
 * @returns A CommentEntry object.
 */
function buildCommentEntry(
    userId: string,
    userName: string,
    content: string,
    timestamp: string
): CommentEntry
{
    return {
        id: generateId(),
        userId,
        userName,
        content,
        timestamp,
        edited: false,
    };
}

/**
 * Returns all comments in the document.
 *
 * @param engine - The engine instance.
 * @returns Array of all DiagramComment objects.
 */
function engineGetComments(
    engine: any
): DiagramComment[]
{
    const self = engine as any;
    return [...self.doc.comments];
}

/**
 * Returns comments anchored to a specific object.
 *
 * @param engine - The engine instance.
 * @param objectId - Object ID to filter by.
 * @returns Array of comments anchored to the object.
 */
function engineGetCommentsForObject(
    engine: any,
    objectId: string
): DiagramComment[]
{
    const self = engine as any;

    return self.doc.comments.filter(
        (c: DiagramComment) => c.anchor.entityId === objectId
    );
}

/**
 * Marks a comment as resolved by setting its status to "resolved"
 * and updating its timestamp.
 *
 * @param engine - The engine instance.
 * @param commentId - ID of the comment to resolve.
 */
function engineResolveComment(
    engine: any,
    commentId: string
): void
{
    const self = engine as any;
    const comment = self.doc.comments.find((c: DiagramComment) => c.id === commentId);

    if (!comment)
    {
        console.warn(P6_LOG, "resolveComment: not found:", commentId);
        return;
    }

    comment.status = "resolved";
    comment.updated = new Date().toISOString();
    self.markDirty();
    console.log(P6_LOG, "DiagramComment resolved:", commentId);
}

// ============================================================================
// DEEP LINKING
// ============================================================================

/**
 * Navigates to a diagram entity via a URI. Supported URI formats:
 * - `object://{id}` — selects and centres the object
 * - `connector://{id}` — selects and centres the connector's midpoint
 * - `comment://{id}` — selects the comment's anchor object
 *
 * @param engine - The engine instance.
 * @param uri - Deep link URI.
 * @returns true if navigation succeeded.
 */
function engineNavigateToURI(
    engine: any,
    uri: string
): boolean
{
    const parts = uri.split("://");

    if (parts.length !== 2)
    {
        console.warn(P6_LOG, "navigateToURI: invalid format:", uri);
        return false;
    }

    const scheme = parts[0];
    const id = parts[1];

    return dispatchNavigation(engine, scheme, id);
}

/**
 * Dispatches navigation based on the URI scheme.
 *
 * @param engine - The engine instance.
 * @param scheme - URI scheme (object, connector, comment).
 * @param id - Entity ID.
 * @returns true if navigation succeeded.
 */
function dispatchNavigation(
    engine: any,
    scheme: string,
    id: string
): boolean
{
    if (scheme === "object")
    {
        return navigateToObject(engine, id);
    }

    if (scheme === "connector")
    {
        return navigateToConnector(engine, id);
    }

    if (scheme === "comment")
    {
        return navigateToComment(engine, id);
    }

    console.warn(P6_LOG, "navigateToURI: unknown scheme:", scheme);
    return false;
}

/**
 * Selects an object by ID for deep link navigation.
 *
 * @param engine - The engine instance.
 * @param id - Object ID.
 * @returns true if the object was found and selected.
 */
function navigateToObject(
    engine: any,
    id: string
): boolean
{
    const obj = engine.getObject(id);

    if (!obj)
    {
        console.warn(P6_LOG, "navigateToURI: object not found:", id);
        return false;
    }

    engine.select([id]);
    console.log(P6_LOG, "Navigated to object:", id);
    return true;
}

/**
 * Selects an object connected to a connector for navigation.
 *
 * @param engine - The engine instance.
 * @param id - Connector ID.
 * @returns true if the connector was found.
 */
function navigateToConnector(
    engine: any,
    id: string
): boolean
{
    const conn = engine.getConnector(id);

    if (!conn)
    {
        console.warn(P6_LOG, "navigateToURI: connector not found:", id);
        return false;
    }

    engine.select([conn.presentation.sourceId]);
    console.log(P6_LOG, "Navigated to connector:", id);
    return true;
}

/**
 * Navigates to a comment's anchor object.
 *
 * @param engine - The engine instance.
 * @param id - DiagramComment ID.
 * @returns true if the comment and its anchor were found.
 */
function navigateToComment(
    engine: any,
    id: string
): boolean
{
    const self = engine as any;
    const comment = self.doc.comments.find((c: DiagramComment) => c.id === id);

    if (!comment)
    {
        console.warn(P6_LOG, "navigateToURI: comment not found:", id);
        return false;
    }

    if (comment.anchor.entityId)
    {
        engine.select([comment.anchor.entityId]);
    }

    console.log(P6_LOG, "Navigated to comment:", id);
    return true;
}

// ============================================================================
// PROTOTYPE AUGMENTATION
// ============================================================================

/* eslint-disable @typescript-eslint/no-explicit-any */

const p6 = DiagramEngineImpl.prototype as any;

// Layout
p6.registerLayout = function(
    this: any, name: string, fn: LayoutFunction
): void
{
    engineRegisterLayout(this, name, fn);
};

p6.applyLayout = function(
    this: any, name: string, options?: Record<string, unknown>
): Promise<void>
{
    return engineApplyLayout(this, name, options);
};

// Export
p6.exportPNG = function(
    this: any, options?: { scale?: number; background?: string }
): Promise<Blob>
{
    return engineExportPNG(this, options);
};

p6.exportPDF = function(
    this: any
): Promise<Blob>
{
    return engineExportPDF(this);
};

// Find and replace
p6.findText = function(
    this: any,
    query: string,
    options?: { caseSensitive?: boolean }
): { objectId: string; text: string }[]
{
    return engineFindText(this, query, options);
};

p6.replaceText = function(
    this: any,
    query: string,
    replacement: string,
    options?: { caseSensitive?: boolean }
): number
{
    return engineReplaceText(this, query, replacement, options);
};

// Format painter
p6.pickFormat = function(
    this: any, objectId: string
): void
{
    enginePickFormat(this, objectId);
};

p6.applyFormat = function(
    this: any, targetIds: string[]
): void
{
    engineApplyFormat(this, targetIds);
};

p6.clearFormat = function(): void
{
    engineClearFormat();
};

p6.hasFormat = function(): boolean
{
    return engineHasFormat();
};

// Spatial queries
p6.findObjectsInRect = function(
    this: any, rect: Rect
): DiagramObject[]
{
    return engineFindObjectsInRect(this, rect);
};

p6.findObjectsAtPoint = function(
    this: any, point: Point
): DiagramObject[]
{
    return engineFindObjectsAtPoint(this, point);
};

// Graph analysis
p6.getShortestPath = function(
    this: any, fromId: string, toId: string
): string[]
{
    return engineGetShortestPath(this, fromId, toId);
};

p6.getConnectedComponents = function(
    this: any
): string[][]
{
    return engineGetConnectedComponents(this);
};

p6.getIncomingConnectors = function(
    this: any, objectId: string
): DiagramConnector[]
{
    return engineGetIncomingConnectors(this, objectId);
};

p6.getOutgoingConnectors = function(
    this: any, objectId: string
): DiagramConnector[]
{
    return engineGetOutgoingConnectors(this, objectId);
};

// Group collapse/expand
p6.collapseGroup = function(
    this: any, groupId: string
): void
{
    engineCollapseGroup(this, groupId);
};

p6.expandGroup = function(
    this: any, groupId: string
): void
{
    engineExpandGroup(this, groupId);
};

// Comments
p6.addComment = function(
    this: any,
    anchor: DiagramComment["anchor"],
    content: string,
    userId: string,
    userName: string
): DiagramComment
{
    return engineAddComment(this, anchor, content, userId, userName);
};

p6.getComments = function(
    this: any
): DiagramComment[]
{
    return engineGetComments(this);
};

p6.getCommentsForObject = function(
    this: any, objectId: string
): DiagramComment[]
{
    return engineGetCommentsForObject(this, objectId);
};

p6.resolveComment = function(
    this: any, commentId: string
): void
{
    engineResolveComment(this, commentId);
};

// Deep linking
p6.navigateToURI = function(
    this: any, uri: string
): boolean
{
    return engineNavigateToURI(this, uri);
};

/* eslint-enable @typescript-eslint/no-explicit-any */
