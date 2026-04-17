/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * Repository: pvk2007/theme
 * File GUID: f3a89c2e-7d14-4b8f-a651-2c9e0f3b8d74
 * Created: 2026-04-16
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: LayoutPicker
 * PURPOSE: Visually rich dropdown for selecting graph layout algorithms
 *    with inline SVG thumbnails showing schematic node-edge diagrams.
 * PURPOSE: 25 built-in algorithms across 9 categories, custom registration,
 *    category grouping, keyboard navigation, size variants (sm/md/lg).
 * RELATES: [[EnterpriseTheme]], [[CustomComponents]], [[ColumnsPicker]],
 *    [[MarginsPicker]], [[DiagramEngine]], [[RibbonBuilder]]
 * FLOW: [Consumer App] -> [createLayoutPicker()] -> [Dropdown with SVG previews]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// S1: INTERFACES
// ============================================================================

/** A canonical graph layout algorithm entry. */
export interface LayoutAlgorithm
{
    id: string;
    label: string;
    category: LayoutCategory;
    description: string;
}

/** Layout algorithm category. */
export type LayoutCategory =
    | "smart"
    | "hierarchical"
    | "tree"
    | "force"
    | "radial"
    | "circular"
    | "linear"
    | "grid"
    | "custom";

/** Configuration for createLayoutPicker(). */
export interface LayoutPickerOptions
{
    /** Container element or ID string. */
    container: HTMLElement | string;
    /** Initial selected algorithm ID. */
    value?: string;
    /** Array of algorithm IDs to include (default: all). */
    algorithms?: string[];
    /** Group items by category with headers (default: false). */
    groupByCategory?: boolean;
    /** Show category colour accent on thumbnails (default: true). */
    showCategoryAccent?: boolean;
    /** Callback fired when selection changes. */
    onChange?: (algorithm: LayoutAlgorithm) => void;
    /** Compact ribbon-mode trigger (22px, no thumbnail). Default: false. */
    ribbonMode?: boolean;
    /** Custom algorithms to register beyond the built-in set. */
    customAlgorithms?: CustomAlgorithmDefinition[];
}

/** Definition for a custom algorithm supplied by the consuming app. */
export interface CustomAlgorithmDefinition
{
    id: string;
    label: string;
    category: LayoutCategory;
    description: string;
    /** Custom SVG thumbnail builder (receives the 48×48 SVG element). */
    thumbnail?: (svg: SVGSVGElement) => void;
}

/** Public API returned by createLayoutPicker(). */
export interface LayoutPickerAPI
{
    getValue(): LayoutAlgorithm | null;
    setValue(algorithmId: string): void;
    setAlgorithms(algorithmIds: string[]): void;
    registerAlgorithm(def: CustomAlgorithmDefinition): void;
    show(): void;
    hide(): void;
    destroy(): void;
    getElement(): HTMLElement;
}

// ============================================================================
// S2: CONSTANTS & LOGGING
// ============================================================================

const LOG_PREFIX = "[LayoutPicker]";
const _lu = (typeof (window as any).createLogUtility === "function")
    ? (window as any).createLogUtility().getLogger(LOG_PREFIX.slice(1, -1))
    : null;
function logInfo(...a: unknown[]): void { _lu ? _lu.info(...a) : console.log(new Date().toISOString(), "[INFO]", LOG_PREFIX, ...a); }
function logWarn(...a: unknown[]): void { _lu ? _lu.warn(...a) : console.warn(new Date().toISOString(), "[WARN]", LOG_PREFIX, ...a); }
function logError(...a: unknown[]): void { _lu ? _lu.error(...a) : console.error(new Date().toISOString(), "[ERROR]", LOG_PREFIX, ...a); }
function logDebug(...a: unknown[]): void { _lu ? _lu.debug(...a) : console.debug(new Date().toISOString(), "[DEBUG]", LOG_PREFIX, ...a); }

const CLS = "layoutpicker";
const SVG_NS = "http://www.w3.org/2000/svg";
let instanceCounter = 0;
const THUMB_SIZE = 48;

// ============================================================================
// S3: CANONICAL ALGORITHM REGISTRY
// ============================================================================
// ⚓ AlgorithmRegistry — 25 canonical graph layout algorithms across 9 categories

/** Category display order for grouped view. */
const CATEGORY_ORDER: LayoutCategory[] = [
    "smart", "hierarchical", "tree", "force",
    "radial", "circular", "linear", "grid", "custom",
];

/** Categories whose edges render with arrow markers. */
const DIRECTED_CATEGORIES = new Set<string>([
    "hierarchical", "tree", "linear",
]);

/** Master list of 25 built-in layout algorithms. */
const LAYOUT_ALGORITHMS: LayoutAlgorithm[] =
[
    { id: "smart",            label: "Smart (Auto)",     category: "smart",        description: "Auto-detects diagram type and applies best algorithm" },
    { id: "ai-driven",        label: "AI-Driven",        category: "smart",        description: "Uses AI to determine optimal layout" },
    { id: "elk-layered-tb",   label: "ELK Layered \u2193",category: "hierarchical", description: "Top-to-bottom layered layout" },
    { id: "elk-layered-lr",   label: "ELK Layered \u2192",category: "hierarchical", description: "Left-to-right layered layout" },
    { id: "elk-tree",         label: "ELK Tree",         category: "tree",         description: "Hierarchical tree layout (org charts)" },
    { id: "elk-force",        label: "ELK Force",        category: "force",        description: "Force-directed layout (network graphs)" },
    { id: "elk-stress",       label: "ELK Stress",       category: "force",        description: "Stress-minimisation (uniform edge lengths)" },
    { id: "elk-radial",       label: "ELK Radial",       category: "radial",       description: "Centre-focused radial layout" },
    { id: "dagre-tb",         label: "Dagre \u2193",     category: "hierarchical", description: "Top-to-bottom directed graph" },
    { id: "dagre-lr",         label: "Dagre \u2192",     category: "hierarchical", description: "Left-to-right directed graph" },
    { id: "dagre-bt",         label: "Dagre \u2191",     category: "hierarchical", description: "Bottom-to-top directed graph" },
    { id: "dagre-rl",         label: "Dagre \u2190",     category: "hierarchical", description: "Right-to-left directed graph" },
    { id: "hierarchical",     label: "Hierarchical",     category: "hierarchical", description: "General hierarchical/sitemap layout" },
    { id: "organic",          label: "Organic (Force)",   category: "force",        description: "Force-based organic layout" },
    { id: "circle",           label: "Circle",           category: "circular",     description: "Nodes arranged in a circle" },
    { id: "compact-tree",     label: "Compact Tree",     category: "tree",         description: "Compact tree with minimal spacing" },
    { id: "radial-tree",      label: "Radial Tree",      category: "radial",       description: "Radial layout from centre node outward" },
    { id: "partition",        label: "Partition",         category: "grid",         description: "Grid-based partitioning layout" },
    { id: "stack-horizontal", label: "Stack \u2192",     category: "linear",       description: "Horizontal stacking (left to right)" },
    { id: "stack-vertical",   label: "Stack \u2193",     category: "linear",       description: "Vertical stacking (top to bottom)" },
    { id: "grid",             label: "Grid",             category: "grid",         description: "Simple grid arrangement" },
    { id: "force",            label: "Force",            category: "force",        description: "Generic force-directed layout" },
    { id: "radial",           label: "Radial",           category: "radial",       description: "Generic radial layout" },
    { id: "dagre",            label: "Dagre",            category: "hierarchical", description: "Default Dagre layout" },
    { id: "group-by-namespace",label: "Group by Namespace",category: "custom",     description: "Groups nodes by namespace/category" },
];

// ============================================================================
// S3b: THUMBNAIL COORDINATE DATA
// ============================================================================

/** Pre-computed node/edge positions for each standard algorithm's thumbnail. */
interface ThumbDatum
{
    nodes: [number, number][];
    edges: [number, number][];
}

const THUMBNAIL_DATA: Record<string, ThumbDatum> =
{
    "elk-layered-tb":
    {
        nodes: [[24, 8], [14, 24], [34, 24], [24, 40]],
        edges: [[0, 1], [0, 2], [1, 3], [2, 3]],
    },
    "elk-layered-lr":
    {
        nodes: [[8, 24], [24, 14], [24, 34], [40, 24]],
        edges: [[0, 1], [0, 2], [1, 3], [2, 3]],
    },
    "elk-tree":
    {
        nodes: [[24, 6], [12, 20], [36, 20], [6, 34], [18, 34], [30, 34], [42, 34]],
        edges: [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6]],
    },
    "elk-force":
    {
        nodes: [[10, 14], [38, 10], [24, 24], [8, 38], [40, 36]],
        edges: [[0, 2], [1, 2], [2, 3], [2, 4], [0, 3], [1, 4]],
    },
    "elk-stress":
    {
        nodes: [[12, 12], [36, 12], [24, 24], [12, 36], [36, 36]],
        edges: [[0, 1], [0, 2], [1, 2], [2, 3], [2, 4], [3, 4]],
    },
    "elk-radial":
    {
        nodes: [[24, 24], [24, 6], [41, 15], [35, 38], [13, 38], [7, 15]],
        edges: [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5]],
    },
    "dagre-tb":
    {
        nodes: [[24, 6], [12, 22], [36, 22], [18, 38], [30, 38]],
        edges: [[0, 1], [0, 2], [1, 3], [2, 4]],
    },
    "dagre-lr":
    {
        nodes: [[6, 24], [22, 12], [22, 36], [38, 18], [38, 30]],
        edges: [[0, 1], [0, 2], [1, 3], [2, 4]],
    },
    "dagre-bt":
    {
        nodes: [[24, 42], [12, 26], [36, 26], [18, 10], [30, 10]],
        edges: [[0, 1], [0, 2], [1, 3], [2, 4]],
    },
    "dagre-rl":
    {
        nodes: [[42, 24], [26, 12], [26, 36], [10, 18], [10, 30]],
        edges: [[0, 1], [0, 2], [1, 3], [2, 4]],
    },
    "hierarchical":
    {
        nodes: [[24, 6], [14, 20], [34, 20], [8, 36], [24, 36], [40, 36]],
        edges: [[0, 1], [0, 2], [1, 3], [1, 4], [2, 4], [2, 5]],
    },
    "organic":
    {
        nodes: [[10, 12], [18, 8], [14, 22], [34, 30], [42, 34], [36, 42]],
        edges: [[0, 1], [0, 2], [1, 2], [3, 4], [3, 5], [4, 5], [2, 3]],
    },
    "circle":
    {
        nodes: [[24, 8], [38, 16], [38, 32], [24, 40], [10, 32], [10, 16]],
        edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]],
    },
    "compact-tree":
    {
        nodes: [[24, 8], [16, 20], [32, 20], [10, 32], [22, 32], [26, 32], [38, 32]],
        edges: [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6]],
    },
    "radial-tree":
    {
        nodes: [[24, 24], [24, 8], [38, 32], [10, 32], [34, 4], [14, 4], [44, 40], [4, 40]],
        edges: [[0, 1], [0, 2], [0, 3], [1, 4], [1, 5], [2, 6], [3, 7]],
    },
    "partition":
    {
        nodes: [[12, 12], [24, 12], [36, 12], [12, 30], [24, 30], [36, 30]],
        edges: [],
    },
    "stack-horizontal":
    {
        nodes: [[8, 24], [19, 24], [30, 24], [41, 24]],
        edges: [[0, 1], [1, 2], [2, 3]],
    },
    "stack-vertical":
    {
        nodes: [[24, 6], [24, 18], [24, 30], [24, 42]],
        edges: [[0, 1], [1, 2], [2, 3]],
    },
    "grid":
    {
        nodes: [[12, 14], [24, 14], [36, 14], [12, 34], [24, 34], [36, 34]],
        edges: [],
    },
    "force":
    {
        nodes: [[24, 8], [40, 18], [36, 38], [12, 38], [8, 18]],
        edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0], [0, 2]],
    },
    "radial":
    {
        nodes: [[24, 24], [24, 6], [40, 15], [40, 33], [24, 42], [8, 33], [8, 15]],
        edges: [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6]],
    },
    "dagre":
    {
        nodes: [[24, 8], [24, 24], [24, 40]],
        edges: [[0, 1], [1, 2]],
    },
};

// ============================================================================
// S4: DOM HELPERS
// ============================================================================

function createElement(
    tag: string, classes: string[], text?: string
): HTMLElement
{
    const el = document.createElement(tag);

    if (classes.length > 0)
    {
        el.classList.add(...classes);
    }

    if (text)
    {
        el.textContent = text;
    }

    return el;
}

function setAttr(
    el: HTMLElement | SVGElement, attrs: Record<string, string>
): void
{
    for (const key of Object.keys(attrs))
    {
        el.setAttribute(key, attrs[key]);
    }
}

function createSvgElement(
    tag: string, attrs: Record<string, string>
): SVGElement
{
    const el = document.createElementNS(SVG_NS, tag);

    for (const key of Object.keys(attrs))
    {
        el.setAttribute(key, attrs[key]);
    }

    return el;
}

function resolveContainer(
    container: HTMLElement | string
): HTMLElement | null
{
    if (typeof container === "string")
    {
        return document.getElementById(container);
    }

    return container;
}

// ============================================================================
// S5: SVG THUMBNAIL BUILDER
// ============================================================================
// ⚓ ThumbnailBuilder — data-driven 48×48 SVG previews keyed off algorithm.id

/** Return the CSS custom property value for a category accent colour. */
function getCategoryAccent(category: LayoutCategory): string
{
    switch (category)
    {
        case "smart":        return "var(--theme-primary)";
        case "hierarchical": return "var(--theme-info)";
        case "tree":         return "var(--theme-success)";
        case "force":        return "var(--theme-warning)";
        case "radial":       return "var(--theme-purple, #7c3aed)";
        case "circular":     return "var(--theme-purple, #7c3aed)";
        case "linear":       return "var(--theme-text-secondary)";
        case "grid":         return "var(--theme-text-secondary)";
        case "custom":       return "var(--theme-text-muted)";
        default:             return "var(--theme-primary)";
    }
}

/** Create a blank 48×48 SVG element. */
function createThumbSvg(): SVGElement
{
    return createSvgElement("svg", {
        "width": String(THUMB_SIZE),
        "height": String(THUMB_SIZE),
        "viewBox": `0 0 ${THUMB_SIZE} ${THUMB_SIZE}`,
        "class": `${CLS}-thumb`,
        "aria-hidden": "true",
    });
}

/** Build the thumbnail SVG for a given algorithm. */
function buildThumbnailSvg(
    algorithmId: string,
    category: LayoutCategory,
    customThumb?: (svg: SVGSVGElement) => void
): SVGElement
{
    const svg = createThumbSvg();

    if (customThumb)
    {
        customThumb(svg as unknown as SVGSVGElement);
        return svg;
    }

    if (algorithmId === "smart")        { appendSmartIcon(svg); return svg; }
    if (algorithmId === "ai-driven")    { appendSparkleIcon(svg); return svg; }
    if (algorithmId === "group-by-namespace") { appendGroupIcon(svg); return svg; }

    const data = THUMBNAIL_DATA[algorithmId];

    if (!data) { appendFallbackIcon(svg); return svg; }

    const directed = DIRECTED_CATEGORIES.has(category);

    if (directed) { appendArrowMarker(svg); }

    appendEdges(svg, data, directed);
    appendNodes(svg, data);
    return svg;
}

/** Append circle nodes to the SVG. */
function appendNodes(svg: SVGElement, data: ThumbDatum): void
{
    for (const [cx, cy] of data.nodes)
    {
        svg.appendChild(createSvgElement("circle", {
            "cx": String(cx),
            "cy": String(cy),
            "r": "3",
            "class": `${CLS}-node`,
        }));
    }
}

/** Append edge lines to the SVG. */
function appendEdges(
    svg: SVGElement, data: ThumbDatum, directed: boolean
): void
{
    for (const [fromIdx, toIdx] of data.edges)
    {
        const [x1, y1] = data.nodes[fromIdx];
        const [x2, y2] = data.nodes[toIdx];
        const attrs: Record<string, string> = {
            "x1": String(x1), "y1": String(y1),
            "x2": String(x2), "y2": String(y2),
            "class": `${CLS}-edge`,
        };

        if (directed)
        {
            attrs["marker-end"] = `url(#${CLS}-arrow)`;
        }

        svg.appendChild(createSvgElement("line", attrs));
    }
}

/** Append a reusable arrowhead marker definition. */
function appendArrowMarker(svg: SVGElement): void
{
    const defs = createSvgElement("defs", {});
    const marker = createSvgElement("marker", {
        "id": `${CLS}-arrow`,
        "markerWidth": "6", "markerHeight": "6",
        "refX": "5", "refY": "3",
        "orient": "auto", "markerUnits": "strokeWidth",
    });

    marker.appendChild(createSvgElement("path", {
        "d": "M0,0 L6,3 L0,6 Z",
        "class": `${CLS}-arrow`,
    }));

    defs.appendChild(marker);
    svg.appendChild(defs);
}

/** Smart algorithm: gear icon with orbiting nodes. */
function appendSmartIcon(svg: SVGElement): void
{
    appendGearPath(svg);
    appendOrbitDots(svg, [[10, 10], [38, 12], [34, 40]]);
    appendDashedEdges(svg, [24, 24], [[10, 10], [38, 12], [34, 40]]);
}

/** AI-driven algorithm: sparkle icon with orbiting nodes. */
function appendSparkleIcon(svg: SVGElement): void
{
    svg.appendChild(createSvgElement("path", {
        "d": "M24,12 L26,21 L35,24 L26,27 L24,36 L22,27 L13,24 L22,21 Z",
        "class": `${CLS}-special-icon`,
    }));

    appendOrbitDots(svg, [[10, 10], [38, 14], [32, 40]]);
    appendDashedEdges(svg, [24, 24], [[10, 10], [38, 14], [32, 40]]);
}

/** Group-by-namespace: two boxes with dots inside. */
function appendGroupIcon(svg: SVGElement): void
{
    svg.appendChild(createSvgElement("rect", {
        "x": "4", "y": "6", "width": "18", "height": "36",
        "class": `${CLS}-group-rect`,
    }));

    svg.appendChild(createSvgElement("rect", {
        "x": "26", "y": "6", "width": "18", "height": "36",
        "class": `${CLS}-group-rect`,
    }));

    appendGroupDots(svg);
    appendGroupEdges(svg);
}

/** Draw dots inside the two group rectangles. */
function appendGroupDots(svg: SVGElement): void
{
    const dots: [number, number][] = [[10, 18], [16, 30], [32, 18], [38, 30]];

    for (const [cx, cy] of dots)
    {
        svg.appendChild(createSvgElement("circle", {
            "cx": String(cx), "cy": String(cy), "r": "3",
            "class": `${CLS}-node`,
        }));
    }
}

/** Draw cross-group edges in the group-by-namespace thumbnail. */
function appendGroupEdges(svg: SVGElement): void
{
    svg.appendChild(createSvgElement("line", {
        "x1": "16", "y1": "30", "x2": "32", "y2": "18",
        "class": `${CLS}-edge`,
    }));
}

/** Draw a simplified gear icon centred at (24, 24). */
function appendGearPath(svg: SVGElement): void
{
    svg.appendChild(createSvgElement("circle", {
        "cx": "24", "cy": "24", "r": "7",
        "class": `${CLS}-special-icon`,
    }));

    svg.appendChild(createSvgElement("circle", {
        "cx": "24", "cy": "24", "r": "3",
        "class": `${CLS}-gear-hole`,
    }));

    appendGearTeeth(svg);
}

/** Draw 6 small teeth around the gear circle. */
function appendGearTeeth(svg: SVGElement): void
{
    const r = 10;

    for (let i = 0; i < 6; i++)
    {
        const angle = (i * 60) * (Math.PI / 180);
        const x1 = 24 + 7 * Math.cos(angle);
        const y1 = 24 + 7 * Math.sin(angle);
        const x2 = 24 + r * Math.cos(angle);
        const y2 = 24 + r * Math.sin(angle);

        svg.appendChild(createSvgElement("line", {
            "x1": String(Math.round(x1 * 10) / 10),
            "y1": String(Math.round(y1 * 10) / 10),
            "x2": String(Math.round(x2 * 10) / 10),
            "y2": String(Math.round(y2 * 10) / 10),
            "class": `${CLS}-gear-tooth`,
        }));
    }
}

/** Draw small orbit dots at the given positions. */
function appendOrbitDots(
    svg: SVGElement, positions: [number, number][]
): void
{
    for (const [cx, cy] of positions)
    {
        svg.appendChild(createSvgElement("circle", {
            "cx": String(cx), "cy": String(cy), "r": "2.5",
            "class": `${CLS}-node`,
        }));
    }
}

/** Draw dashed lines from centre to orbit positions. */
function appendDashedEdges(
    svg: SVGElement,
    centre: [number, number],
    targets: [number, number][]
): void
{
    for (const [tx, ty] of targets)
    {
        svg.appendChild(createSvgElement("line", {
            "x1": String(centre[0]), "y1": String(centre[1]),
            "x2": String(tx), "y2": String(ty),
            "class": `${CLS}-dashed-edge`,
        }));
    }
}

/** Fallback thumbnail for unknown algorithms. */
function appendFallbackIcon(svg: SVGElement): void
{
    const dots: [number, number][] = [[16, 16], [32, 16], [24, 32]];

    for (const [cx, cy] of dots)
    {
        svg.appendChild(createSvgElement("circle", {
            "cx": String(cx), "cy": String(cy), "r": "3",
            "class": `${CLS}-node`,
        }));
    }
}

// ============================================================================
// S6: FACTORY FUNCTION
// ============================================================================
// ⚓ createLayoutPicker — public factory returning LayoutPickerAPI

/** Create a LayoutPicker and return its public API. */
export function createLayoutPicker(
    options: LayoutPickerOptions
): LayoutPickerAPI
{
    const instanceId = `${CLS}-${++instanceCounter}`;
    const ribbonMode = options.ribbonMode === true;
    const groupByCategory = options.groupByCategory === true;
    const showAccent = options.showCategoryAccent !== false;

    // Custom algorithm tracking
    const customAlgos: LayoutAlgorithm[] = [];
    const customThumbs: Record<string, (svg: SVGSVGElement) => void> = {};
    let currentFilterIds: string[] | undefined = options.algorithms;
    let algorithms: LayoutAlgorithm[] = [];
    let selectedId: string = options.value || "";
    let isOpen = false;
    let destroyed = false;
    let focusedIndex = -1;

    // DOM references
    let rootEl: HTMLElement | null = null;
    let triggerEl: HTMLElement | null = null;
    let panelEl: HTMLElement | null = null;

    // Bound handlers
    const boundDocClick = (e: MouseEvent | TouchEvent): void => onDocumentClick(e);
    const boundDocKey = (e: KeyboardEvent): void => onDocumentKey(e);

    // Register custom algorithms from options
    registerCustomsFromOptions();

    // Build active list
    algorithms = buildActiveList(currentFilterIds);

    if (!selectedId && algorithms.length > 0)
    {
        selectedId = algorithms[0].id;
    }

    // Initialise DOM
    const containerEl = resolveContainer(options.container);

    if (!containerEl)
    {
        logWarn("container not found:", options.container);
        return buildNullApi();
    }

    rootEl = buildRoot();
    containerEl.appendChild(rootEl);
    logInfo("created, algorithms=%d, value=%s", algorithms.length, selectedId);

    // ── Custom registration ──

    function registerCustomsFromOptions(): void
    {
        if (!options.customAlgorithms) { return; }

        for (const def of options.customAlgorithms)
        {
            customAlgos.push({
                id: def.id, label: def.label,
                category: def.category, description: def.description,
            });

            if (def.thumbnail) { customThumbs[def.id] = def.thumbnail; }
        }
    }

    /** Merge built-in + custom algorithms, filtered by IDs. */
    function buildActiveList(
        filterIds?: string[]
    ): LayoutAlgorithm[]
    {
        const registry = new Map<string, LayoutAlgorithm>();

        for (const algo of LAYOUT_ALGORITHMS) { registry.set(algo.id, algo); }
        for (const algo of customAlgos) { registry.set(algo.id, algo); }

        if (!filterIds) { return Array.from(registry.values()); }

        return filterIds
            .filter((id) => registry.has(id))
            .map((id) => registry.get(id)!);
    }

    // ── Build DOM ──

    function buildRoot(): HTMLElement
    {
        const root = createElement("div", [CLS]);
        root.id = instanceId;

        if (ribbonMode) { root.classList.add(`${CLS}--ribbon`); }

        triggerEl = buildTrigger();
        panelEl = buildPanel();
        root.appendChild(triggerEl);
        return root;
    }

    function buildTrigger(): HTMLElement
    {
        const btn = createElement("button", [`${CLS}-trigger`]);

        setAttr(btn, {
            "type": "button",
            "aria-expanded": "false",
            "aria-haspopup": "listbox",
            "aria-label": "Layout algorithm",
        });

        if (!ribbonMode) { btn.appendChild(buildTriggerThumb()); }

        const label = createElement("span", [`${CLS}-trigger-label`]);
        label.textContent = getLabelForId(selectedId);
        btn.appendChild(label);

        const caret = createElement("i", [
            "bi", "bi-chevron-down", `${CLS}-trigger-caret`,
        ]);

        btn.appendChild(caret);
        btn.addEventListener("click", () => togglePanel());
        btn.addEventListener("keydown", (e) => onTriggerKey(e));
        return btn;
    }

    /** Build the small trigger thumbnail (24×24 display size). */
    function buildTriggerThumb(): HTMLElement
    {
        const wrap = createElement("span", [`${CLS}-trigger-thumb`]);
        const algo = algorithms.find((a) => a.id === selectedId);
        const cat = algo ? algo.category : "smart";
        const svg = buildThumbnailSvg(selectedId, cat, customThumbs[selectedId]);
        wrap.appendChild(svg as unknown as Node);
        return wrap;
    }

    function buildPanel(): HTMLElement
    {
        const panel = createElement("div", [`${CLS}-panel`]);

        setAttr(panel, {
            "role": "listbox",
            "aria-label": "Layout algorithms",
        });

        panel.style.display = "none";
        rebuildList(panel);
        return panel;
    }

    /** Rebuild the item list inside the panel. */
    function rebuildList(panel: HTMLElement): void
    {
        while (panel.firstChild) { panel.removeChild(panel.firstChild); }

        if (algorithms.length === 0)
        {
            appendEmptyMessage(panel);
            return;
        }

        if (groupByCategory) { buildGroupedList(panel); }
        else                 { buildFlatList(panel); }
    }

    function buildFlatList(panel: HTMLElement): void
    {
        for (let i = 0; i < algorithms.length; i++)
        {
            panel.appendChild(buildItem(algorithms[i], i));
        }
    }

    function buildGroupedList(panel: HTMLElement): void
    {
        const groups = groupAlgorithmsByCategory();
        let idx = 0;

        for (const cat of CATEGORY_ORDER)
        {
            const group = groups.get(cat);
            if (!group || group.length === 0) { continue; }

            panel.appendChild(buildCategoryHeader(cat));

            for (const algo of group)
            {
                panel.appendChild(buildItem(algo, idx++));
            }
        }
    }

    function groupAlgorithmsByCategory(): Map<LayoutCategory, LayoutAlgorithm[]>
    {
        const groups = new Map<LayoutCategory, LayoutAlgorithm[]>();

        for (const algo of algorithms)
        {
            if (!groups.has(algo.category))
            {
                groups.set(algo.category, []);
            }

            groups.get(algo.category)!.push(algo);
        }

        return groups;
    }

    /** Build a non-interactive category separator header. */
    function buildCategoryHeader(category: string): HTMLElement
    {
        const header = createElement("div", [`${CLS}-category`]);
        header.textContent = category.charAt(0).toUpperCase() + category.slice(1);
        setAttr(header, { "role": "separator", "aria-hidden": "true" });
        return header;
    }

    /** Build a single algorithm item row. */
    function buildItem(algo: LayoutAlgorithm, index: number): HTMLElement
    {
        const item = createElement("div", [`${CLS}-item`]);
        const isSelected = algo.id === selectedId;

        setAttr(item, {
            "role": "option",
            "aria-selected": String(isSelected),
            "data-algorithm": algo.id,
            "data-index": String(index),
            "tabindex": "-1",
        });

        if (isSelected) { item.classList.add(`${CLS}-item--selected`); }

        if (showAccent)
        {
            item.style.setProperty("--lp-accent", getCategoryAccent(algo.category));
        }

        appendItemContent(item, algo);
        item.addEventListener("click", () => selectAlgorithm(algo.id));
        return item;
    }

    /** Append thumbnail + text details to an item. */
    function appendItemContent(
        item: HTMLElement, algo: LayoutAlgorithm
    ): void
    {
        const svg = buildThumbnailSvg(algo.id, algo.category, customThumbs[algo.id]);
        item.appendChild(svg as unknown as Node);

        const details = createElement("div", [`${CLS}-item-details`]);
        const name = createElement("span", [`${CLS}-item-name`], algo.label);
        details.appendChild(name);

        if (!ribbonMode)
        {
            const desc = createElement("span", [`${CLS}-item-desc`], algo.description);
            details.appendChild(desc);
        }

        item.appendChild(details);
    }

    function appendEmptyMessage(panel: HTMLElement): void
    {
        const msg = createElement("div", [`${CLS}-empty`], "No algorithms available");
        panel.appendChild(msg);
    }

    function getLabelForId(id: string): string
    {
        const algo = algorithms.find((a) => a.id === id);
        return algo ? algo.label : id;
    }

    // ── Panel open / close ──

    function togglePanel(): void
    {
        if (isOpen) { closePanel(); }
        else        { openPanel(); }
    }

    function openPanel(): void
    {
        if (!panelEl || !triggerEl) { return; }

        isOpen = true;

        if (panelEl.parentElement !== document.body)
        {
            document.body.appendChild(panelEl);
        }

        panelEl.style.display = "block";
        triggerEl.setAttribute("aria-expanded", "true");
        rootEl?.classList.add(`${CLS}--open`);
        positionPanel();
        focusedIndex = findSelectedIndex();
        updateFocusHighlight();
        addGlobalListeners();
        logDebug("panel opened");
    }

    function closePanel(): void
    {
        if (!panelEl || !triggerEl) { return; }

        isOpen = false;
        panelEl.style.display = "none";
        triggerEl.setAttribute("aria-expanded", "false");
        rootEl?.classList.remove(`${CLS}--open`);
        removeGlobalListeners();
        triggerEl.focus();
        logDebug("panel closed");
    }

    function positionPanel(): void
    {
        if (!triggerEl || !panelEl) { return; }

        const rect = triggerEl.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const panelW = Math.min(320, vw - 8);

        panelEl.style.position = "fixed";
        panelEl.style.zIndex = "1050";
        panelEl.style.width = panelW + "px";
        panelEl.style.left = clampHorizontal(rect.left, panelW, vw) + "px";
        applyVerticalPlacement(rect, vh, 2);
    }

    function clampHorizontal(left: number, panelW: number, vw: number): number
    {
        if (left + panelW > vw - 4) { left = vw - panelW - 4; }
        if (left < 4) { left = 4; }
        return left;
    }

    function applyVerticalPlacement(rect: DOMRect, vh: number, gap: number): void
    {
        if (!panelEl) { return; }

        const spaceBelow = vh - rect.bottom - gap;
        const maxH = Math.min(500, Math.max(spaceBelow, rect.top - gap));

        if (spaceBelow < 200 && rect.top > spaceBelow)
        {
            panelEl.style.bottom = (vh - rect.top + gap) + "px";
            panelEl.style.top = "auto";
        }
        else
        {
            panelEl.style.top = (rect.bottom + gap) + "px";
            panelEl.style.bottom = "auto";
        }

        panelEl.style.maxHeight = maxH + "px";
    }

    // ── Selection ──

    function selectAlgorithm(id: string): void
    {
        const algo = algorithms.find((a) => a.id === id);

        if (!algo)
        {
            logWarn("algorithm not found:", id);
            return;
        }

        selectedId = id;
        updateTriggerDisplay();
        updateSelectedState();
        closePanel();
        logInfo("selected: %s (category=%s)", id, algo.category);
        fireOnChange(algo);
    }

    function fireOnChange(algo: LayoutAlgorithm): void
    {
        if (!options.onChange) { return; }

        try { options.onChange(algo); }
        catch (err) { logError("onChange error:", err); }
    }

    function updateTriggerDisplay(): void
    {
        if (!triggerEl) { return; }

        const label = triggerEl.querySelector(`.${CLS}-trigger-label`);

        if (label) { label.textContent = getLabelForId(selectedId); }

        updateTriggerThumb();
    }

    function updateTriggerThumb(): void
    {
        if (!triggerEl || ribbonMode) { return; }

        const oldThumb = triggerEl.querySelector(`.${CLS}-trigger-thumb`);

        if (oldThumb) { oldThumb.remove(); }

        const newThumb = buildTriggerThumb();
        triggerEl.insertBefore(newThumb, triggerEl.firstChild);
    }

    function updateSelectedState(): void
    {
        if (!panelEl) { return; }

        const items = panelEl.querySelectorAll(`.${CLS}-item`);

        items.forEach((item) =>
        {
            const id = item.getAttribute("data-algorithm");
            const isSel = id === selectedId;
            item.classList.toggle(`${CLS}-item--selected`, isSel);
            item.setAttribute("aria-selected", String(isSel));
        });
    }

    // ── Keyboard navigation ──

    function onTriggerKey(e: KeyboardEvent): void
    {
        if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")
        {
            e.preventDefault();
            if (!isOpen) { openPanel(); }
        }
    }

    function onDocumentClick(e: MouseEvent | TouchEvent): void
    {
        if (!isOpen) { return; }

        const target = e.target as Node;
        const inRoot = rootEl && rootEl.contains(target);
        const inPanel = panelEl && panelEl.contains(target);

        if (!inRoot && !inPanel) { closePanel(); }
    }

    function onDocumentKey(e: KeyboardEvent): void
    {
        if (!isOpen) { return; }

        const handler = KEY_HANDLERS[e.key];

        if (!handler) { return; }

        handler(e);
    }

    const KEY_HANDLERS: Record<string, (e: KeyboardEvent) => void> = {
        Escape:    (e) => { e.preventDefault(); closePanel(); },
        ArrowDown: (e) => { e.preventDefault(); moveFocus(1); },
        ArrowUp:   (e) => { e.preventDefault(); moveFocus(-1); },
        Home:      (e) => { e.preventDefault(); focusedIndex = 0; updateFocusHighlight(); },
        End:       (e) => { e.preventDefault(); focusedIndex = algorithms.length - 1; updateFocusHighlight(); },
        Enter:     (e) => { e.preventDefault(); confirmFocused(); },
        " ":       (e) => { e.preventDefault(); confirmFocused(); },
        Tab:       () => { closePanel(); },
    };

    function moveFocus(delta: number): void
    {
        const total = algorithms.length;

        if (total === 0) { return; }

        focusedIndex = ((focusedIndex + delta) + total) % total;
        updateFocusHighlight();
    }

    function updateFocusHighlight(): void
    {
        if (!panelEl) { return; }

        const items = panelEl.querySelectorAll(`.${CLS}-item`);

        items.forEach((el, i) =>
        {
            el.classList.toggle(`${CLS}-item--focused`, i === focusedIndex);

            if (i === focusedIndex) { (el as HTMLElement).focus(); }
        });
    }

    function confirmFocused(): void
    {
        if (focusedIndex >= 0 && focusedIndex < algorithms.length)
        {
            selectAlgorithm(algorithms[focusedIndex].id);
        }
    }

    function findSelectedIndex(): number
    {
        return Math.max(0, algorithms.findIndex((a) => a.id === selectedId));
    }

    // ── Global listeners ──

    function addGlobalListeners(): void
    {
        document.addEventListener("mousedown", boundDocClick, true);
        document.addEventListener("touchstart", boundDocClick, true);
        document.addEventListener("keydown", boundDocKey, true);
    }

    function removeGlobalListeners(): void
    {
        document.removeEventListener("mousedown", boundDocClick, true);
        document.removeEventListener("touchstart", boundDocClick, true);
        document.removeEventListener("keydown", boundDocKey, true);
    }

    // ── Null API for missing container ──

    function buildNullApi(): LayoutPickerAPI
    {
        const noop = (): void => {};

        return {
            getValue: () => null,
            setValue: noop,
            setAlgorithms: noop,
            registerAlgorithm: noop,
            show: noop,
            hide: noop,
            destroy: noop,
            getElement: () => document.createElement("div"),
        };
    }

    // ── Public API ──

    const api: LayoutPickerAPI =
    {
        getValue(): LayoutAlgorithm | null
        {
            return algorithms.find((a) => a.id === selectedId) || null;
        },

        setValue(algorithmId: string): void
        {
            const found = algorithms.find((a) => a.id === algorithmId);

            if (!found)
            {
                logWarn("algorithm not found:", algorithmId);
                return;
            }

            selectedId = algorithmId;
            updateTriggerDisplay();
            updateSelectedState();
        },

        setAlgorithms(algorithmIds: string[]): void
        {
            currentFilterIds = algorithmIds;
            algorithms = buildActiveList(algorithmIds);

            if (panelEl) { rebuildList(panelEl); }

            if (!algorithms.find((a) => a.id === selectedId) && algorithms.length > 0)
            {
                selectedId = algorithms[0].id;
                updateTriggerDisplay();
            }

            logDebug("setAlgorithms, count=%d", algorithms.length);
        },

        registerAlgorithm(def: CustomAlgorithmDefinition): void
        {
            customAlgos.push({
                id: def.id, label: def.label,
                category: def.category, description: def.description,
            });

            if (def.thumbnail) { customThumbs[def.id] = def.thumbnail; }

            algorithms = buildActiveList(currentFilterIds);

            if (panelEl) { rebuildList(panelEl); }

            logInfo("registered custom algorithm: %s", def.id);
        },

        show(): void
        {
            if (!isOpen) { openPanel(); }
        },

        hide(): void
        {
            if (isOpen) { closePanel(); }
        },

        destroy(): void
        {
            if (destroyed) { return; }

            destroyed = true;

            if (isOpen) { closePanel(); }

            removeGlobalListeners();

            if (panelEl && panelEl.parentElement)
            {
                panelEl.parentElement.removeChild(panelEl);
            }

            if (rootEl && rootEl.parentElement)
            {
                rootEl.parentElement.removeChild(rootEl);
            }

            rootEl = null;
            triggerEl = null;
            panelEl = null;
            logInfo("destroyed", instanceId);
        },

        getElement(): HTMLElement
        {
            return rootEl as HTMLElement;
        },
    };

    return api;
}

// ============================================================================
// S7: WINDOW GLOBALS
// ============================================================================

const LayoutPicker = { LAYOUT_ALGORITHMS, createLayoutPicker };
(window as unknown as Record<string, unknown>)["LayoutPicker"] = LayoutPicker;
(window as unknown as Record<string, unknown>)["createLayoutPicker"] = createLayoutPicker;
