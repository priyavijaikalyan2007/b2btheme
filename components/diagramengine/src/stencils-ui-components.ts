/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: DiagramEngine — UiComponentStencils
 * PURPOSE: Ninety-three static SVG placeholder shape definitions for all
 *    embeddable library components. Each renders a lightweight preview
 *    (border, label, icon, and variant-specific detail) when the real
 *    component factory is not loaded.
 * RELATES: [[DiagramEngine]], [[ShapeRegistry]], [[EmbedRegistry]]
 * FLOW: [registerUiComponentStencils()] -> [ShapeRegistry.register()] -> [Engine]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// CONSTANTS
// ============================================================================

const UI_LOG_PREFIX = "[UiComponentStencils]";
const UI_CATEGORY = "ui-components";
const UI_BORDER_COLOR = "#dee2e6";
const UI_BG_COLOR = "#ffffff";
const UI_HEADER_BG = "#f8f9fa";
const UI_TEXT_COLOR = "#495057";
const UI_ICON_COLOR = "#6c757d";
const UI_TABLE_LINE = "#e9ecef";
const UI_INPUT_BG = "#f8f9fa";

/** Total number of ui-component stencil shapes registered. */
const UI_SHAPE_COUNT = 93;

// ============================================================================
// OUTLINE + TEXT REGION HELPERS
// ============================================================================

/**
 * Returns the SVG path data for a rectangle outline.
 *
 * @param bounds - Current bounding rectangle.
 * @returns SVG path data string.
 */
function uiRectOutlinePath(bounds: Rect): string
{
    const x = bounds.x;
    const y = bounds.y;
    const w = bounds.width;
    const h = bounds.height;

    return `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
}

/**
 * Returns a single full-bounds text region with a small inset.
 *
 * @param bounds - Current bounding rectangle.
 * @returns Array with one "content" text region.
 */
function uiDefaultTextRegions(bounds: Rect): TextRegion[]
{
    return [
        {
            id: "content",
            bounds: {
                x: bounds.x + 4,
                y: bounds.y + 4,
                width: Math.max(0, bounds.width - 8),
                height: Math.max(0, bounds.height - 8)
            }
        }
    ];
}

// ============================================================================
// VARIANT DETAIL RENDERERS
// ============================================================================

/**
 * Draws three horizontal grid lines suggesting a table/grid.
 *
 * @param g - Parent SVG group.
 * @param x - Left coordinate of the detail area.
 * @param y - Top coordinate of the detail area.
 * @param w - Width of the detail area.
 * @param h - Height of the detail area.
 */
function renderTableDetail(
    g: SVGElement,
    x: number,
    y: number,
    w: number,
    h: number): void
{
    const rows = 3;
    const rowH = h / (rows + 1);

    for (let i = 1; i <= rows; i++)
    {
        const lineY = y + (rowH * i);
        const line = svgCreate("line", {
            x1: String(x), y1: String(lineY),
            x2: String(x + w), y2: String(lineY),
            stroke: UI_TABLE_LINE, "stroke-width": "1"
        });

        g.appendChild(line);
    }

    const colX = x + (w * 0.35);
    const colLine = svgCreate("line", {
        x1: String(colX), y1: String(y),
        x2: String(colX), y2: String(y + h),
        stroke: UI_TABLE_LINE, "stroke-width": "1"
    });

    g.appendChild(colLine);
}

/**
 * Draws a single-line input outline.
 *
 * @param g - Parent SVG group.
 * @param x - Left coordinate of the detail area.
 * @param y - Top coordinate of the detail area.
 * @param w - Width of the detail area.
 */
function renderInputDetail(
    g: SVGElement,
    x: number,
    y: number,
    w: number): void
{
    const inputH = 20;
    const inputY = y + 2;

    const inputRect = svgCreate("rect", {
        x: String(x), y: String(inputY),
        width: String(w), height: String(inputH),
        rx: "2", ry: "2",
        fill: UI_INPUT_BG, stroke: UI_BORDER_COLOR, "stroke-width": "1"
    });

    g.appendChild(inputRect);
}

/**
 * Draws a panel header bar at the top of the detail area.
 *
 * @param g - Parent SVG group.
 * @param x - Left coordinate of the detail area.
 * @param y - Top coordinate of the detail area.
 * @param w - Width of the detail area.
 * @param h - Height of the detail area.
 */
function renderPanelDetail(
    g: SVGElement,
    x: number,
    y: number,
    w: number,
    h: number): void
{
    const headerH = Math.min(20, h * 0.3);

    const header = svgCreate("rect", {
        x: String(x), y: String(y),
        width: String(w), height: String(headerH),
        fill: UI_HEADER_BG
    });

    g.appendChild(header);

    const divider = svgCreate("line", {
        x1: String(x), y1: String(y + headerH),
        x2: String(x + w), y2: String(y + headerH),
        stroke: UI_BORDER_COLOR, "stroke-width": "1"
    });

    g.appendChild(divider);
}

/**
 * Draws a small button-like rectangle.
 *
 * @param g - Parent SVG group.
 * @param x - Left coordinate of the detail area.
 * @param y - Top coordinate of the detail area.
 * @param w - Width of the detail area.
 */
function renderButtonDetail(
    g: SVGElement,
    x: number,
    y: number,
    w: number): void
{
    const btnW = Math.min(60, w * 0.5);
    const btnH = 18;
    const btnX = x + ((w - btnW) / 2);

    const btn = svgCreate("rect", {
        x: String(btnX), y: String(y + 2),
        width: String(btnW), height: String(btnH),
        rx: "3", ry: "3",
        fill: "#0d6efd"
    });

    g.appendChild(btn);

    const label = svgCreate("text", {
        x: String(btnX + (btnW / 2)), y: String(y + 15),
        "font-size": "9", fill: "#ffffff", "text-anchor": "middle"
    });

    label.textContent = "OK";
    g.appendChild(label);
}

/**
 * Draws a small rounded card outline.
 *
 * @param g - Parent SVG group.
 * @param x - Left coordinate of the detail area.
 * @param y - Top coordinate of the detail area.
 * @param w - Width of the detail area.
 * @param h - Height of the detail area.
 */
function renderCardDetail(
    g: SVGElement,
    x: number,
    y: number,
    w: number,
    h: number): void
{
    const card = svgCreate("rect", {
        x: String(x), y: String(y),
        width: String(w), height: String(h),
        rx: "3", ry: "3",
        fill: "none", stroke: UI_TABLE_LINE, "stroke-width": "1"
    });

    g.appendChild(card);
}

/**
 * Draws horizontal lines suggesting a list or feed.
 *
 * @param g - Parent SVG group.
 * @param x - Left coordinate of the detail area.
 * @param y - Top coordinate of the detail area.
 * @param w - Width of the detail area.
 * @param h - Height of the detail area.
 */
function renderListDetail(
    g: SVGElement,
    x: number,
    y: number,
    w: number,
    h: number): void
{
    const lineCount = Math.min(4, Math.floor(h / 8));
    const lineGap = h / (lineCount + 1);

    const widths = [0.9, 0.7, 0.8, 0.6];

    for (let i = 1; i <= lineCount; i++)
    {
        const lineY = y + (lineGap * i);
        const lineW = w * widths[(i - 1) % widths.length];

        const line = svgCreate("line", {
            x1: String(x), y1: String(lineY),
            x2: String(x + lineW), y2: String(lineY),
            stroke: UI_TABLE_LINE, "stroke-width": "2"
        });

        g.appendChild(line);
    }
}

/**
 * Draws two small chat bubble outlines.
 *
 * @param g - Parent SVG group.
 * @param x - Left coordinate of the detail area.
 * @param y - Top coordinate of the detail area.
 * @param w - Width of the detail area.
 * @param h - Height of the detail area.
 */
function renderChatDetail(
    g: SVGElement,
    x: number,
    y: number,
    w: number,
    h: number): void
{
    const bubbleH = Math.min(14, h * 0.35);
    const bubbleW1 = w * 0.6;
    const bubbleW2 = w * 0.5;

    const b1 = svgCreate("rect", {
        x: String(x), y: String(y),
        width: String(bubbleW1), height: String(bubbleH),
        rx: "4", ry: "4",
        fill: UI_INPUT_BG, stroke: UI_TABLE_LINE, "stroke-width": "1"
    });

    g.appendChild(b1);

    const b2 = svgCreate("rect", {
        x: String(x + w - bubbleW2), y: String(y + bubbleH + 4),
        width: String(bubbleW2), height: String(bubbleH),
        rx: "4", ry: "4",
        fill: "#e8f4fd", stroke: UI_TABLE_LINE, "stroke-width": "1"
    });

    g.appendChild(b2);
}

/**
 * Dispatches to the appropriate variant detail renderer.
 *
 * @param g - Parent SVG group.
 * @param variant - Visual variant key.
 * @param x - Left coordinate of the detail area.
 * @param y - Top coordinate of the detail area.
 * @param w - Width of the detail area.
 * @param h - Height of the detail area.
 */
function renderVariantDetail(
    g: SVGElement,
    variant: string,
    x: number,
    y: number,
    w: number,
    h: number): void
{
    if (variant === "table") { renderTableDetail(g, x, y, w, h); }
    else if (variant === "input") { renderInputDetail(g, x, y, w); }
    else if (variant === "panel") { renderPanelDetail(g, x, y, w, h); }
    else if (variant === "button") { renderButtonDetail(g, x, y, w); }
    else if (variant === "card") { renderCardDetail(g, x, y, w, h); }
    else if (variant === "list") { renderListDetail(g, x, y, w, h); }
    else if (variant === "chat") { renderChatDetail(g, x, y, w, h); }
}

// ============================================================================
// GENERIC PLACEHOLDER RENDERER
// ============================================================================

/**
 * Renders a static SVG placeholder for a UI component shape.
 * Draws a bordered rectangle, icon character, label, and
 * variant-specific detail graphics.
 *
 * @param ctx - Shape render context with bounds.
 * @param label - Human-readable component label.
 * @param icon - Placeholder icon character (single char).
 * @param variant - Visual variant key for detail rendering.
 * @returns SVG group element.
 */
function renderUiPlaceholder(
    ctx: ShapeRenderContext,
    label: string,
    icon: string,
    variant: string): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    const bg = svgCreate("rect", {
        x: String(b.x), y: String(b.y),
        width: String(b.width), height: String(b.height),
        rx: "3", ry: "3",
        fill: UI_BG_COLOR, stroke: UI_BORDER_COLOR, "stroke-width": "1"
    });

    g.appendChild(bg);
    renderUiLabelAndIcon(g, b, label, icon);

    const detailY = b.y + 30;
    const detailH = Math.max(0, b.height - 38);

    if (detailH > 8 && variant !== "default")
    {
        renderVariantDetail(g, variant, b.x + 8, detailY, b.width - 16, detailH);
    }

    return g;
}

/**
 * Renders the icon character and label text at the top of a
 * placeholder shape.
 *
 * @param g - Parent SVG group.
 * @param b - Bounding rectangle.
 * @param label - Display label text.
 * @param icon - Single-character icon placeholder.
 */
function renderUiLabelAndIcon(
    g: SVGElement,
    b: Rect,
    label: string,
    icon: string): void
{
    const iconEl = svgCreate("text", {
        x: String(b.x + 8), y: String(b.y + 18),
        "font-size": "12", fill: UI_ICON_COLOR
    });

    iconEl.textContent = icon;
    g.appendChild(iconEl);

    const labelEl = svgCreate("text", {
        x: String(b.x + 24), y: String(b.y + 18),
        "font-size": "11", fill: UI_TEXT_COLOR
    });

    labelEl.textContent = label;
    g.appendChild(labelEl);
}

// ============================================================================
// SHAPE BUILDER
// ============================================================================

/**
 * Creates a ShapeDefinition for a UI component placeholder.
 *
 * @param name - Shape type matching the embed registry key.
 * @param label - Human-readable display label.
 * @param icon - Single-character icon placeholder.
 * @param w - Default width in canvas pixels.
 * @param h - Default height in canvas pixels.
 * @param variant - Visual variant key for detail rendering.
 * @returns A complete ShapeDefinition.
 */
function buildUiComponentShape(
    name: string,
    label: string,
    icon: string,
    w: number,
    h: number,
    variant: string
): ShapeDefinition
{
    return {
        type: name,
        category: UI_CATEGORY,
        label,
        icon,
        defaultSize: { w, h },
        minSize: { w: Math.min(w, 80), h: Math.min(h, 30) },
        render: (ctx: ShapeRenderContext) => renderUiPlaceholder(ctx, label, icon, variant),
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => uiDefaultTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => uiRectOutlinePath(bounds)
    };
}

// ============================================================================
// SHAPE ENTRY TUPLES: [name, label, icon, w, h, variant]
// ============================================================================

/** Shorthand type for shape definition tuples. */
type UiShapeTuple = [string, string, string, number, number, string];

// --- DATA ---
const UI_DATA_SHAPES: UiShapeTuple[] = [
    ["datagrid",          "Data Grid",          "\u2637", 400, 250, "table"],
    ["treegrid",          "Tree Grid",          "\u2637", 350, 300, "table"],
    ["treeview",          "Tree View",          "\u2261", 280, 350, "list"],
    ["propertyinspector", "Property Inspector", "\u2261", 300, 400, "list"],
    ["spinemap",          "Spine Map",          "\u2734", 500, 350, "default"],
    ["graphcanvas",       "Graph Canvas",       "\u2609", 500, 400, "default"],
];

// --- INPUT ---
const UI_INPUT_SHAPES: UiShapeTuple[] = [
    ["editablecombobox",  "Editable Combo Box", "\u25BE", 200, 34,  "input"],
    ["multiselectcombo",  "Multi-Select Combo", "\u2611", 250, 34,  "input"],
    ["searchbox",         "Search Box",         "\u2315", 250, 34,  "input"],
    ["peoplepicker",      "People Picker",      "\u263A", 250, 40,  "input"],
    ["datepicker",        "Date Picker",        "\u2636", 250, 40,  "input"],
    ["timepicker",        "Time Picker",        "\u231A", 200, 40,  "input"],
    ["durationpicker",    "Duration Picker",    "\u231B", 250, 40,  "input"],
    ["cronpicker",        "CRON Picker",        "\u2637", 360, 280, "panel"],
    ["timezonepicker",    "Timezone Picker",    "\u2609", 250, 40,  "input"],
    ["periodpicker",      "Period Picker",      "\u2636", 250, 40,  "input"],
    ["sprintpicker",      "Sprint Picker",      "\u25A3", 250, 40,  "input"],
    ["colorpicker",       "Color Picker",       "\u25C9", 280, 320, "panel"],
    ["gradientpicker",    "Gradient Picker",    "\u25C9", 300, 340, "panel"],
    ["anglepicker",       "Angle Picker",       "\u21BB", 160, 160, "default"],
    ["fontdropdown",      "Font Dropdown",      "\u0041", 200, 34,  "input"],
    ["symbolpicker",      "Symbol Picker",      "\u263C", 320, 300, "panel"],
    ["slider",            "Slider",             "\u2500", 200, 40,  "input"],
    ["fileupload",        "File Upload",        "\u2191", 300, 200, "panel"],
    ["tagger",            "Tagger",             "\u2756", 250, 34,  "input"],
    ["richtextinput",     "Rich Text Input",    "\u00B6", 300, 100, "input"],
    ["maskedentry",       "Masked Entry",       "\u2022", 200, 34,  "input"],
    ["lineendingpicker",  "Line Ending Picker", "\u2192", 200, 34,  "input"],
    ["lineshapepicker",   "Line Shape Picker",  "\u223F", 200, 34,  "input"],
    ["linetypepicker",    "Line Type Picker",   "\u2504", 200, 34,  "input"],
    ["linewidthpicker",   "Line Width Picker",  "\u2501", 200, 34,  "input"],
];

// --- CONTENT ---
const UI_CONTENT_SHAPES: UiShapeTuple[] = [
    ["codeeditor",        "Code Editor",        "\u2329", 400, 300, "panel"],
    ["markdowneditor",    "Markdown Editor",    "\u2193", 500, 400, "panel"],
    ["markdownrenderer",  "Markdown Renderer",  "\u2193", 400, 300, "panel"],
    ["docviewer",         "Doc Viewer",         "\u2338", 600, 450, "panel"],
    ["helpdrawer",        "Help Drawer",        "\u003F", 320, 400, "panel"],
    ["helptooltip",       "Help Tooltip",       "\u003F", 24,  24,  "card"],
];

// --- FEEDBACK ---
const UI_FEEDBACK_SHAPES: UiShapeTuple[] = [
    ["toast",             "Toast",              "\u2407", 300, 60,  "card"],
    ["progressmodal",     "Progress Modal",     "\u231B", 400, 200, "button"],
    ["errordialog",       "Error Dialog",       "\u26A0", 400, 300, "button"],
    ["confirmdialog",     "Confirm Dialog",     "\u003F", 400, 200, "button"],
    ["formdialog",        "Form Dialog",        "\u270E", 400, 300, "panel"],
    ["stepper",           "Stepper",            "\u2460", 500, 60,  "list"],
    ["statusbar",         "Status Bar",         "\u2139", 600, 28,  "input"],
];

// --- NAVIGATION ---
const UI_NAVIGATION_SHAPES: UiShapeTuple[] = [
    ["ribbon",            "Ribbon",             "\u2630", 600, 120, "panel"],
    ["ribbonbuilder",     "Ribbon Builder",     "\u2692", 600, 400, "panel"],
    ["toolbar",           "Toolbar",            "\u2692", 500, 40,  "input"],
    ["sidebar",           "Sidebar",            "\u2759", 260, 400, "panel"],
    ["tabbedpanel",       "Tabbed Panel",       "\u2610", 400, 300, "panel"],
    ["magnifier",         "Magnifier",          "\u2315", 150, 150, "default"],
    ["ruler",             "Ruler",              "\u2500", 400, 24,  "input"],
];

// --- AI ---
const UI_AI_SHAPES: UiShapeTuple[] = [
    ["conversation",           "Conversation",            "\u2026", 400, 500, "chat"],
    ["prompttemplatemanager",  "Prompt Template Manager", "\u2338", 600, 450, "panel"],
    ["reasoningaccordion",     "Reasoning Accordion",     "\u2261", 400, 300, "list"],
];

// --- GOVERNANCE ---
const UI_GOVERNANCE_SHAPES: UiShapeTuple[] = [
    ["auditlogviewer",   "Audit Log Viewer",   "\u2637", 600, 350, "table"],
    ["permissionmatrix", "Permission Matrix",  "\u2611", 500, 350, "table"],
];

// --- LAYOUT ---
const UI_LAYOUT_SHAPES: UiShapeTuple[] = [
    ["docklayout",       "Dock Layout",        "\u2610", 600, 400, "panel"],
    ["splitlayout",      "Split Layout",       "\u2502", 600, 400, "panel"],
    ["layerlayout",      "Layer Layout",       "\u25A3", 600, 400, "panel"],
    ["cardlayout",       "Card Layout",        "\u25A1", 400, 300, "panel"],
    ["boxlayout",        "Box Layout",         "\u25A1", 400, 200, "panel"],
    ["flowlayout",       "Flow Layout",        "\u21C0", 500, 300, "panel"],
    ["gridlayout",       "Grid Layout",        "\u2637", 500, 400, "panel"],
    ["anchorlayout",     "Anchor Layout",      "\u2693", 600, 400, "panel"],
    ["borderlayout",     "Border Layout",      "\u25A3", 600, 400, "panel"],
    ["flexgridlayout",   "Flex Grid Layout",   "\u2637", 600, 400, "panel"],
];

// --- SOCIAL ---
const UI_SOCIAL_SHAPES: UiShapeTuple[] = [
    ["activityfeed",       "Activity Feed",       "\u2261", 350, 400, "list"],
    ["timeline",           "Timeline",            "\u2261", 500, 200, "list"],
    ["commentoverlay",     "Comment Overlay",     "\u2026", 400, 300, "chat"],
    ["sharedialog",        "Share Dialog",        "\u2197", 400, 300, "panel"],
    ["notificationcenter", "Notification Center", "\u2407", 350, 400, "list"],
    ["workspaceswitcher",  "Workspace Switcher",  "\u2302", 250, 300, "panel"],
    ["usermenu",           "User Menu",           "\u263A", 200, 250, "list"],
    ["personchip",         "Person Chip",         "\u263A", 180, 32,  "card"],
    ["presenceindicator",  "Presence Indicator",  "\u25CF", 120, 32,  "card"],
    ["pill",               "Pill",                "\u25CF", 100, 24,  "card"],
    ["typebadge",          "Type Badge",          "\u2690", 80,  24,  "card"],
    ["relationshipmanager","Relationship Manager","\u2637", 500, 350, "table"],
];

// --- OTHER ---
const UI_OTHER_SHAPES: UiShapeTuple[] = [
    ["actionitems",      "Action Items",       "\u2611", 400, 300, "list"],
    ["commandpalette",   "Command Palette",    "\u2328", 500, 350, "panel"],
    ["facetsearch",      "Facet Search",       "\u2295", 350, 34,  "input"],
    ["guidedtour",       "Guided Tour",        "\u2690", 300, 200, "panel"],
    ["themetoggle",      "Theme Toggle",       "\u25D0", 100, 32,  "card"],
    ["fileexplorer",     "File Explorer",      "\u2302", 500, 400, "panel"],
    ["applauncher",      "App Launcher",       "\u2637", 300, 300, "panel"],
    ["breadcrumb",       "Breadcrumb",         "\u203A", 400, 28,  "input"],
    ["logconsole",       "Log Console",        "\u2328", 500, 250, "list"],
    ["gauge",            "Gauge",              "\u25D4", 200, 200, "default"],
    ["emptystate",       "Empty State",        "\u2300", 300, 200, "default"],
    ["skeletonloader",   "Skeleton Loader",    "\u2591", 300, 100, "list"],
    ["statusbadge",      "Status Badge",       "\u25CF", 80,  24,  "card"],
    ["bannerbar",        "Banner Bar",         "\u2691", 600, 48,  "input"],
    ["graphtoolbar",     "Graph Toolbar",      "\u2692", 500, 40,  "input"],
];

// ============================================================================
// BATCH REGISTRATION HELPER
// ============================================================================

/**
 * Registers an array of shape tuples with the given registry.
 *
 * @param registry - The ShapeRegistry instance to populate.
 * @param tuples - Array of shape definition tuples.
 */
function registerTuples(
    registry: ShapeRegistry,
    tuples: UiShapeTuple[]): void
{
    for (const [name, label, icon, w, h, variant] of tuples)
    {
        registry.register(buildUiComponentShape(name, label, icon, w, h, variant));
    }
}

// ============================================================================
// REGISTRATION
// ============================================================================

/**
 * Registers all ninety-three UI component placeholder shapes with
 * the given shape registry. Each shape renders a static SVG preview
 * matching the embeddable component's default dimensions.
 *
 * @param registry - The ShapeRegistry instance to populate.
 */
export function registerUiComponentStencils(registry: ShapeRegistry): void
{
    registerTuples(registry, UI_DATA_SHAPES);
    registerTuples(registry, UI_INPUT_SHAPES);
    registerTuples(registry, UI_CONTENT_SHAPES);
    registerTuples(registry, UI_FEEDBACK_SHAPES);
    registerTuples(registry, UI_NAVIGATION_SHAPES);
    registerTuples(registry, UI_AI_SHAPES);
    registerTuples(registry, UI_GOVERNANCE_SHAPES);
    registerTuples(registry, UI_LAYOUT_SHAPES);
    registerTuples(registry, UI_SOCIAL_SHAPES);
    registerTuples(registry, UI_OTHER_SHAPES);

    console.log(UI_LOG_PREFIX, `Registered ${UI_SHAPE_COUNT} ui-component stencil shapes`);
}
