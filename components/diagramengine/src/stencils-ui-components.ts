/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: DiagramEngine — UiComponentStencils
 * PURPOSE: Balsamiq-quality wireframe stencil shapes for all embeddable
 *    library components. Tier A (25) get fully custom SVG render functions;
 *    Tier B (35) get enhanced generic variants; Tier C (33) get improved
 *    basic rendering. Plus 15 Bootstrap 5 and 12 HTML primitive shapes.
 * RELATES: [[DiagramEngine]], [[ShapeRegistry]], [[EmbedRegistry]]
 * FLOW: [registerUiComponentStencils()] -> [ShapeRegistry.register()] -> [Engine]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// CONSTANTS
// ============================================================================

const UI_LOG_PREFIX = "[UiComponentStencils]";
function logUiInfo(...args: unknown[]): void
{
    console.log(new Date().toISOString(), "[INFO]", UI_LOG_PREFIX, ...args);
}

function logUiWarn(...args: unknown[]): void
{
    console.warn(new Date().toISOString(), "[WARN]", UI_LOG_PREFIX, ...args);
}

function logUiError(...args: unknown[]): void
{
    console.error(new Date().toISOString(), "[ERROR]", UI_LOG_PREFIX, ...args);
}

function logUiDebug(...args: unknown[]): void
{
    console.debug(new Date().toISOString(), "[DEBUG]", UI_LOG_PREFIX, ...args);
}

const UI_CATEGORY = "ui-components";

/** Total number of ui-component stencil shapes registered. */
const UI_SHAPE_COUNT = 95;

// --- Colour palette ---
const C_BG        = "#ffffff";
const C_BORDER    = "#dee2e6";
const C_HEADER_BG = "#f8f9fa";
const C_TEXT       = "#212529";
const C_TEXT_SEC   = "#6c757d";
const C_TEXT_MUT   = "#adb5bd";
const C_PRIMARY    = "#0d6efd";
const C_SUCCESS    = "#198754";
const C_WARNING    = "#ffc107";
const C_DANGER     = "#dc3545";
const C_CODE_BG    = "#1e1e1e";
const C_CODE_TEXT  = "#d4d4d4";
const C_STRIPE     = "#f8f9fa";
const C_TABLE_LINE = "#e9ecef";
const C_INPUT_BG   = "#f8f9fa";
const C_CHAT_USER  = "#e8f4fd";
const C_ACTIVE_BG  = "#e7f1ff";

// ============================================================================
// OUTLINE + TEXT REGION HELPERS
// ============================================================================

/**
 * Returns the SVG path data for a rectangle outline.
 */
function uiRectOutlinePath(bounds: Rect): string
{
    const { x, y, width: w, height: h } = bounds;
    return `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
}

/**
 * Returns a single full-bounds text region with a small inset.
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
// SHARED SVG DRAWING HELPERS
// ============================================================================

/** Draw a rectangle (optionally rounded). */
function uiRect(
    g: SVGElement, x: number, y: number, w: number, h: number,
    fill: string, stroke: string, rx?: number): void
{
    const attrs: Record<string, string> = {
        x: String(x), y: String(y),
        width: String(w), height: String(h),
        fill, stroke, "stroke-width": "1"
    };

    if (rx) { attrs.rx = String(rx); attrs.ry = String(rx); }
    g.appendChild(svgCreate("rect", attrs));
}

/** Draw a text label. */
function uiText(
    g: SVGElement, x: number, y: number, text: string,
    opts?: { size?: number; weight?: number; fill?: string; anchor?: string }): void
{
    const sz = opts?.size ?? 10;
    const attrs: Record<string, string> = {
        x: String(x), y: String(y),
        "font-size": String(sz),
        "font-family": "system-ui, -apple-system, sans-serif",
        fill: opts?.fill ?? C_TEXT
    };

    if (opts?.weight) { attrs["font-weight"] = String(opts.weight); }
    if (opts?.anchor) { attrs["text-anchor"] = opts.anchor; }
    const el = svgCreate("text", attrs);
    el.textContent = text;
    g.appendChild(el);
}

/** Draw a horizontal divider line. */
function uiDivider(g: SVGElement, x: number, y: number, w: number): void
{
    g.appendChild(svgCreate("line", {
        x1: String(x), y1: String(y),
        x2: String(x + w), y2: String(y),
        stroke: C_BORDER, "stroke-width": "1"
    }));
}

/** Draw a placeholder icon character. */
function uiIcon(
    g: SVGElement, x: number, y: number, char: string,
    opts?: { size?: number; fill?: string }): void
{
    uiText(g, x, y, char, {
        size: opts?.size ?? 12,
        fill: opts?.fill ?? C_TEXT_SEC
    });
}

/** Draw placeholder dots. */
function uiDots(g: SVGElement, x: number, y: number): void
{
    uiText(g, x, y, "\u00B7\u00B7\u00B7", { size: 10, fill: C_TEXT_MUT });
}

/** Draw a button outline with label. */
function uiButton(
    g: SVGElement, x: number, y: number, w: number, h: number,
    label: string, opts?: { fill?: string; textFill?: string }): void
{
    const fill = opts?.fill ?? C_BG;
    const textFill = opts?.textFill ?? C_TEXT;
    uiRect(g, x, y, w, h, fill, C_BORDER, 3);
    uiText(g, x + w / 2, y + h / 2 + 3, label, {
        size: 9, anchor: "middle", fill: textFill, weight: 500
    });
}

/** Draw a close X button (small). */
function uiCloseX(g: SVGElement, x: number, y: number): void
{
    uiText(g, x, y, "\u00D7", { size: 14, fill: C_TEXT_SEC });
}

/** Draw a circle. */
function uiCircle(
    g: SVGElement, cx: number, cy: number, r: number,
    fill: string, stroke: string, sw?: number): void
{
    g.appendChild(svgCreate("circle", {
        cx: String(cx), cy: String(cy), r: String(r),
        fill, stroke, "stroke-width": String(sw ?? 1)
    }));
}

/** Draw a horizontal line. */
function uiLine(
    g: SVGElement, x1: number, y1: number, x2: number, y2: number,
    stroke?: string, width?: number): void
{
    g.appendChild(svgCreate("line", {
        x1: String(x1), y1: String(y1),
        x2: String(x2), y2: String(y2),
        stroke: stroke ?? C_BORDER, "stroke-width": String(width ?? 1)
    }));
}

/** Draw a dialog window chrome: title bar + body area. */
function uiDialogChrome(
    g: SVGElement, b: Rect, title: string): number
{
    const hdrH = 28;
    uiRect(g, b.x, b.y, b.width, b.height, C_BG, C_BORDER, 3);
    uiRect(g, b.x, b.y, b.width, hdrH, C_HEADER_BG, C_BORDER, 0);
    uiDivider(g, b.x, b.y + hdrH, b.width);
    uiText(g, b.x + 10, b.y + 18, title, { size: 11, weight: 600 });
    uiCloseX(g, b.x + b.width - 18, b.y + 18);
    return b.y + hdrH;
}

/** Draw a titled header bar and return the y below it. */
function uiHeaderBar(
    g: SVGElement, x: number, y: number, w: number,
    title: string, icon?: string): number
{
    const hdrH = 24;
    uiRect(g, x, y, w, hdrH, C_HEADER_BG, C_BORDER, 0);
    if (icon) { uiIcon(g, x + 6, y + 16, icon); }
    const tx = icon ? x + 20 : x + 8;
    uiText(g, tx, y + 16, title, { size: 10, weight: 600 });
    return y + hdrH;
}

// ============================================================================
// TIER A — CUSTOM RENDER FUNCTIONS (25 components)
// ============================================================================

// --- DataGrid ---------------------------------------------------------------

function renderDataGridColumns(
    g: SVGElement, x: number, y: number, w: number,
    cols: string[]): number[]
{
    const colW = w / cols.length;
    const positions: number[] = [];

    for (let i = 0; i < cols.length; i++)
    {
        const cx = x + i * colW;
        positions.push(cx);
        uiText(g, cx + 6, y + 14, cols[i], { size: 10, weight: 600 });
        if (i > 0) { uiLine(g, cx, y, cx, y + 20); }
    }

    return positions;
}

function renderDataGridRows(
    g: SVGElement, x: number, y: number, w: number,
    colCount: number, rowCount: number): void
{
    const colW = w / colCount;
    const rowH = 18;

    for (let r = 0; r < rowCount; r++)
    {
        const ry = y + r * rowH;
        if (r % 2 === 1) { uiRect(g, x, ry, w, rowH, C_STRIPE, "none", 0); }
        uiDivider(g, x, ry, w);
        for (let c = 0; c < colCount; c++) { uiDots(g, x + c * colW + 6, ry + 13); }
    }
}

function renderDataGrid(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    const cols = ["ID", "Name", "Status", "Date"];

    uiRect(g, b.x, b.y, b.width, b.height, C_BG, C_BORDER, 2);
    uiRect(g, b.x, b.y, b.width, 22, C_HEADER_BG, "none", 0);
    renderDataGridColumns(g, b.x, b.y, b.width, cols);
    uiDivider(g, b.x, b.y + 22, b.width);

    const bodyH = b.height - 22;
    const rowCount = Math.min(Math.floor(bodyH / 18), 8);
    renderDataGridRows(g, b.x, b.y + 22, b.width, cols.length, rowCount);
    return g;
}

// --- TreeGrid ---------------------------------------------------------------

function renderTreeGridRows(
    g: SVGElement, x: number, y: number, w: number, colW: number): void
{
    const rows = [
        { indent: 0, arrow: "\u25BE", label: "Project" },
        { indent: 1, arrow: " ", label: "index.ts" },
        { indent: 1, arrow: " ", label: "app.ts" },
        { indent: 0, arrow: "\u25B8", label: "Assets" },
    ];
    const rowH = 18;

    for (let i = 0; i < rows.length; i++)
    {
        const ry = y + i * rowH;
        if (i % 2 === 1) { uiRect(g, x, ry, w, rowH, C_STRIPE, "none", 0); }
        uiDivider(g, x, ry, w);
        const indent = 6 + rows[i].indent * 14;
        uiText(g, x + indent, ry + 13, rows[i].arrow, { size: 8, fill: C_TEXT_SEC });
        uiText(g, x + indent + 12, ry + 13, rows[i].label, { size: 10 });
        uiDots(g, x + colW + 6, ry + 13);
        uiDots(g, x + colW * 2 + 6, ry + 13);
    }
}

function renderTreeGrid(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    const cols = ["Name", "Type", "Size"];
    const colW = b.width / cols.length;

    uiRect(g, b.x, b.y, b.width, b.height, C_BG, C_BORDER, 2);
    uiRect(g, b.x, b.y, b.width, 22, C_HEADER_BG, "none", 0);
    renderDataGridColumns(g, b.x, b.y, b.width, cols);
    uiDivider(g, b.x, b.y + 22, b.width);
    renderTreeGridRows(g, b.x, b.y + 22, b.width, colW);
    return g;
}

// --- TreeView ---------------------------------------------------------------

function renderTreeViewItems(g: SVGElement, x: number, y: number): void
{
    const items = [
        { indent: 0, icon: "\u25BE", name: "\uD83D\uDCC1 Project", bold: true },
        { indent: 1, icon: "\u25BE", name: "\uD83D\uDCC1 src", bold: true },
        { indent: 2, icon: " ", name: "\uD83D\uDCC4 index.ts", bold: false },
        { indent: 2, icon: " ", name: "\uD83D\uDCC4 app.ts", bold: false },
        { indent: 1, icon: " ", name: "\uD83D\uDCC4 README.md", bold: false },
    ];
    const rowH = 20;

    for (let i = 0; i < items.length; i++)
    {
        const iy = y + i * rowH;
        const indent = x + 6 + items[i].indent * 16;
        uiText(g, indent, iy + 14, items[i].icon, { size: 8, fill: C_TEXT_SEC });
        const w = items[i].bold ? 600 : undefined;
        uiText(g, indent + 12, iy + 14, items[i].name, { size: 10, weight: w });
    }
}

function renderTreeView(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    uiRect(g, b.x, b.y, b.width, b.height, C_BG, C_BORDER, 2);
    const headY = uiHeaderBar(g, b.x, b.y, b.width, "Explorer", "\u2302");
    renderTreeViewItems(g, b.x, headY);
    return g;
}

// --- PropertyInspector ------------------------------------------------------

function renderPropertyRows(g: SVGElement, x: number, y: number, w: number): void
{
    const props = [
        ["Name", "Widget"], ["Type", "Button"],
        ["Width", "200px"], ["Height", "40px"],
        ["Visible", "true"], ["Style", "primary"],
    ];
    const rowH = 20;
    const colW = w * 0.4;

    for (let i = 0; i < props.length; i++)
    {
        const ry = y + i * rowH;
        if (i % 2 === 1) { uiRect(g, x, ry, w, rowH, C_STRIPE, "none", 0); }
        uiDivider(g, x, ry, w);
        uiText(g, x + 6, ry + 14, props[i][0], { size: 10, fill: C_TEXT_SEC });
        uiText(g, x + colW, ry + 14, props[i][1], { size: 10 });
        uiLine(g, x + colW - 4, ry, x + colW - 4, ry + rowH);
    }
}

function renderPropertyInspector(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    uiRect(g, b.x, b.y, b.width, b.height, C_BG, C_BORDER, 2);
    const headY = uiHeaderBar(g, b.x, b.y, b.width, "Properties", "\u2261");
    renderPropertyRows(g, b.x, headY, b.width);
    return g;
}

// --- HoverCard --------------------------------------------------------------

function renderHoverCardStencil(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    // Anchor placeholder — dashed rectangle at top-left representing the
    // hovered element. Not part of the component; shows the card's context.
    const anchorW = 72;
    const anchorH = 28;
    const anchorX = b.x + 8;
    const anchorY = b.y + 6;
    g.appendChild(svgCreate("rect", {
        x: String(anchorX), y: String(anchorY),
        width: String(anchorW), height: String(anchorH),
        fill: "none", stroke: C_TEXT_MUT,
        "stroke-width": "1", "stroke-dasharray": "3,2"
    }));
    uiText(g, anchorX + anchorW / 2, anchorY + anchorH / 2 + 3,
        "anchor", { size: 9, fill: C_TEXT_MUT, anchor: "middle" });

    // Card frame — offset below the anchor.
    const cardX = b.x + 8;
    const cardY = anchorY + anchorH + 10;
    const cardW = b.width - 16;
    const cardH = b.height - (cardY - b.y) - 8;
    uiRect(g, cardX, cardY, cardW, cardH, C_BG, C_BORDER, 2);

    // Header — colored dot + title + subtitle.
    const pad = 10;
    const dotCx = cardX + pad + 5;
    const dotCy = cardY + pad + 6;
    g.appendChild(svgCreate("circle", {
        cx: String(dotCx), cy: String(dotCy), r: "5",
        fill: C_PRIMARY
    }));
    uiText(g, cardX + pad + 18, dotCy + 3, "Users",
        { size: 11, weight: 600 });
    uiText(g, cardX + pad + 18, dotCy + 16, "entity",
        { size: 9, fill: C_TEXT_SEC });

    // Badge — success pill near top-right.
    const badgeW = 38;
    const badgeH = 14;
    const badgeX = cardX + cardW - badgeW - pad;
    const badgeY = cardY + pad;
    uiRect(g, badgeX, badgeY, badgeW, badgeH, C_SUCCESS, "none", 2);
    uiText(g, badgeX + badgeW / 2, badgeY + 10,
        "active", { size: 8, fill: "#fff", anchor: "middle", weight: 600 });

    // Three property rows.
    const propY0 = dotCy + 30;
    const rowH = 14;
    const props = [
        ["COUNT", "1024"],
        ["TIER", "gold"],
        ["REGION", "us-west"],
    ];
    const keyX = cardX + pad;
    const valX = cardX + pad + 70;

    for (let i = 0; i < props.length; i++)
    {
        const ry = propY0 + i * rowH;
        uiText(g, keyX, ry, props[i][0],
            { size: 8, fill: C_TEXT_SEC, weight: 600 });
        uiText(g, valX, ry, props[i][1], { size: 9 });
    }

    // Description — two faint lines.
    const descY = propY0 + props.length * rowH + 8;
    uiLine(g, cardX + pad, descY, cardX + cardW - pad, descY);
    uiText(g, cardX + pad, descY + 10,
        "Primary tenant directory.", { size: 9, fill: C_TEXT_SEC });

    return g;
}

// --- SearchBox --------------------------------------------------------------

function renderSearchBox(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    uiRect(g, b.x, b.y, b.width, b.height, C_BG, C_BORDER, 14);
    uiIcon(g, b.x + 10, b.y + b.height / 2 + 4, "\u2315", { size: 14 });
    uiText(g, b.x + 28, b.y + b.height / 2 + 4, "Search\u2026", {
        size: 10, fill: C_TEXT_MUT
    });
    return g;
}

// --- EditableComboBox -------------------------------------------------------

function renderEditableComboBox(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    uiRect(g, b.x, b.y, b.width, b.height, C_BG, C_BORDER, 2);
    uiText(g, b.x + 8, b.y + b.height / 2 + 4, "Select\u2026", {
        size: 10, fill: C_TEXT_MUT
    });
    uiLine(g, b.x + b.width - 24, b.y + 2, b.x + b.width - 24, b.y + b.height - 2);
    uiIcon(g, b.x + b.width - 17, b.y + b.height / 2 + 4, "\u25BE", { size: 11 });
    return g;
}

// --- DatePicker -------------------------------------------------------------

function renderDatePicker(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    uiRect(g, b.x, b.y, b.width, b.height, C_BG, C_BORDER, 2);
    uiIcon(g, b.x + 8, b.y + b.height / 2 + 4, "\uD83D\uDCC5", { size: 12 });
    uiText(g, b.x + 26, b.y + b.height / 2 + 4, "2026-03-23", { size: 10 });
    uiLine(g, b.x + b.width - 24, b.y + 2, b.x + b.width - 24, b.y + b.height - 2);
    uiIcon(g, b.x + b.width - 17, b.y + b.height / 2 + 4, "\u25BE", { size: 11 });
    return g;
}

// --- Slider -----------------------------------------------------------------

function renderSlider(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    const trackY = b.y + b.height / 2;
    const trackX1 = b.x + 24;
    const trackX2 = b.x + b.width - 24;
    const thumbX = (trackX1 + trackX2) / 2;

    uiText(g, b.x + 4, trackY + 4, "0", { size: 9, fill: C_TEXT_SEC });
    uiLine(g, trackX1, trackY, trackX2, trackY, C_BORDER, 3);
    uiLine(g, trackX1, trackY, thumbX, trackY, C_PRIMARY, 3);
    uiCircle(g, thumbX, trackY, 6, C_BG, C_PRIMARY);
    uiText(g, b.x + b.width - 20, trackY + 4, "100", {
        size: 9, fill: C_TEXT_SEC, anchor: "end"
    });
    uiText(g, thumbX, trackY - 10, "50", { size: 8, fill: C_TEXT_SEC, anchor: "middle" });
    return g;
}

// --- ColorPicker ------------------------------------------------------------

function renderColorSwatches(g: SVGElement, x: number, y: number, w: number): void
{
    const colors = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"];
    const sw = Math.min(20, (w - 12) / colors.length);

    for (let i = 0; i < colors.length; i++)
    {
        uiRect(g, x + 6 + i * (sw + 2), y, sw, sw, colors[i], C_BORDER, 2);
    }
}

function renderColorPicker(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    uiRect(g, b.x, b.y, b.width, b.height, C_BG, C_BORDER, 2);
    const headY = uiHeaderBar(g, b.x, b.y, b.width, "Color Picker", "\u25C9");

    const swatchSize = Math.min(b.width - 20, b.height * 0.4);
    uiRect(g, b.x + 10, headY + 8, swatchSize, swatchSize * 0.6,
        "#3b82f6", C_BORDER, 2);

    const belowSwatch = headY + 8 + swatchSize * 0.6 + 12;
    uiText(g, b.x + 10, belowSwatch, "#3b82f6", { size: 11, fill: C_TEXT });
    renderColorSwatches(g, b.x, belowSwatch + 14, b.width);
    return g;
}

// --- CodeEditor -------------------------------------------------------------

function renderCodeLines(g: SVGElement, x: number, y: number, w: number): void
{
    const lines = [
        { num: "1", text: "function greet(name) {", color: "#569cd6" },
        { num: "2", text: '  const msg = "Hello";', color: "#ce9178" },
        { num: "3", text: "  console.log(msg);", color: C_CODE_TEXT },
        { num: "4", text: "  return msg + name;", color: C_CODE_TEXT },
        { num: "5", text: "}", color: "#569cd6" },
        { num: "6", text: "", color: C_CODE_TEXT },
        { num: "7", text: "// call it", color: "#6a9955" },
        { num: "8", text: 'greet("World");', color: C_CODE_TEXT },
    ];
    const lineH = 15;

    for (let i = 0; i < lines.length; i++)
    {
        const ly = y + i * lineH + 12;
        uiText(g, x + 6, ly, lines[i].num, { size: 9, fill: "#858585" });
        if (lines[i].text)
        {
            uiText(g, x + 28, ly, lines[i].text, { size: 9, fill: lines[i].color });
        }
    }
}

function renderCodeEditor(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    uiRect(g, b.x, b.y, b.width, b.height, C_CODE_BG, C_BORDER, 2);
    uiRect(g, b.x, b.y, b.width, 22, "#2d2d2d", "none", 0);
    uiText(g, b.x + 8, b.y + 15, "editor.ts", { size: 9, fill: "#cccccc" });
    uiText(g, b.x + b.width - 60, b.y + 15, "TypeScript", {
        size: 8, fill: "#858585"
    });
    uiLine(g, b.x + 24, b.y + 22, b.x + 24, b.y + b.height, "#333333");
    renderCodeLines(g, b.x, b.y + 22, b.width);
    return g;
}

// --- MarkdownEditor ---------------------------------------------------------

function renderMdToolbar(g: SVGElement, x: number, y: number, w: number): void
{
    const buttons = ["B", "I", "H", "\u2261", "\u2197"];
    const btnW = 22;

    uiRect(g, x, y, w, 24, C_HEADER_BG, "none", 0);
    for (let i = 0; i < buttons.length; i++)
    {
        uiText(g, x + 8 + i * (btnW + 2), y + 16, buttons[i], {
            size: 11, weight: 600, fill: C_TEXT_SEC
        });
    }

    uiDivider(g, x, y + 24, w);
}

function renderMdContent(g: SVGElement, x: number, y: number, w: number): void
{
    uiText(g, x + 8, y + 18, "# Heading", { size: 12, weight: 700 });
    uiText(g, x + 8, y + 36, "Paragraph text here with", { size: 10 });
    uiText(g, x + 8, y + 50, "multiple lines of content.", { size: 10 });
    uiText(g, x + 8, y + 68, "\u2022 List item one", { size: 10 });
    uiText(g, x + 8, y + 82, "\u2022 List item two", { size: 10 });
    uiText(g, x + 8, y + 100, "> Blockquote text", {
        size: 10, fill: C_TEXT_SEC
    });
}

function renderMarkdownEditor(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    uiRect(g, b.x, b.y, b.width, b.height, C_BG, C_BORDER, 2);
    renderMdToolbar(g, b.x, b.y, b.width);
    renderMdContent(g, b.x, b.y + 24, b.width);
    return g;
}

// --- DocViewer --------------------------------------------------------------

function renderDocContent(g: SVGElement, x: number, y: number, w: number): void
{
    uiText(g, x + 16, y + 24, "Document Title", { size: 14, weight: 700 });
    uiDivider(g, x + 16, y + 32, w - 32);
    const lineY = y + 48;

    for (let i = 0; i < 5; i++)
    {
        const lw = w * (i === 4 ? 0.5 : 0.85) - 32;
        uiLine(g, x + 16, lineY + i * 14, x + 16 + lw, lineY + i * 14, C_TEXT_MUT, 2);
    }

    uiText(g, x + 16, lineY + 84, "Section 2", { size: 11, weight: 600 });
    for (let i = 0; i < 3; i++)
    {
        const lw = w * (i === 2 ? 0.4 : 0.8) - 32;
        uiLine(g, x + 16, lineY + 100 + i * 14, x + 16 + lw, lineY + 100 + i * 14,
            C_TEXT_MUT, 2);
    }
}

function renderDocViewer(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    uiRect(g, b.x, b.y, b.width, b.height, C_BG, C_BORDER, 2);
    const headY = uiHeaderBar(g, b.x, b.y, b.width, "Doc Viewer", "\u2338");
    renderDocContent(g, b.x, headY, b.width);
    return g;
}

// --- LatexEditor ------------------------------------------------------------

function renderLatexEquation(
    g: SVGElement, x: number, y: number, w: number): void
{
    uiText(g, x + 12, y + 22, "E = mc\u00B2", { size: 16, weight: 700 });
    uiText(g, x + 12, y + 44, "\u222B\u2080\u00B9 f(x) dx", { size: 12 });
    uiText(g, x + 12, y + 64, "\u03B1\u00B2 + \u03B2\u00B2 = \u03B3\u00B2",
        { size: 12 });
}

function renderLatexEditor(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    uiRect(g, b.x, b.y, b.width, b.height, C_BG, C_BORDER, 2);
    uiRect(g, b.x, b.y, b.width, 24, C_HEADER_BG, "none", 0);
    uiText(g, b.x + 8, b.y + 16, "B", { size: 10, weight: 700 });
    uiText(g, b.x + 24, b.y + 16, "Size", { size: 9, fill: C_TEXT_SEC });
    uiText(g, b.x + 52, b.y + 16, "\u25A1", { size: 10, fill: C_TEXT_SEC });
    uiDivider(g, b.x, b.y + 24, b.width);
    renderLatexEquation(g, b.x, b.y + 24, b.width);
    return g;
}

// --- Toast ------------------------------------------------------------------

function renderToast(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    const accent = C_SUCCESS;

    uiRect(g, b.x, b.y, b.width, b.height, C_BG, accent, 4);
    uiLine(g, b.x, b.y, b.x, b.y + b.height, accent, 3);
    uiIcon(g, b.x + 12, b.y + b.height / 2 + 5, "\u2713", {
        size: 14, fill: accent
    });
    uiText(g, b.x + 30, b.y + b.height / 2 + 4, "Operation completed", {
        size: 10
    });
    uiCloseX(g, b.x + b.width - 18, b.y + b.height / 2 + 5);
    return g;
}

// --- Stepper ----------------------------------------------------------------

function renderStepperCircles(
    g: SVGElement, x: number, y: number, w: number,
    steps: string[], active: number): void
{
    const count = steps.length;
    const spacing = w / (count + 1);
    const r = 10;

    for (let i = 0; i < count; i++)
    {
        const cx = x + spacing * (i + 1);
        const isComplete = i < active;
        const isActive = i === active;
        const fill = isComplete ? C_PRIMARY : isActive ? C_PRIMARY : C_BG;
        const stroke = isComplete || isActive ? C_PRIMARY : C_BORDER;
        const textFill = isComplete || isActive ? C_BG : C_TEXT_SEC;

        if (i < count - 1)
        {
            const nextCx = x + spacing * (i + 2);
            const lineCol = isComplete ? C_PRIMARY : C_BORDER;
            uiLine(g, cx + r + 2, y, nextCx - r - 2, y, lineCol, 2);
        }

        uiCircle(g, cx, y, r, fill, stroke);
        uiText(g, cx, y + 4, String(i + 1), {
            size: 9, anchor: "middle", fill: textFill, weight: 600
        });
        uiText(g, cx, y + 24, steps[i], {
            size: 9, anchor: "middle", fill: isActive ? C_PRIMARY : C_TEXT_SEC
        });
    }
}

function renderStepper(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    const steps = ["Cart", "Shipping", "Payment", "Done"];
    renderStepperCircles(g, b.x, b.y + b.height / 2 - 8, b.width, steps, 1);
    return g;
}

// --- ConfirmDialog ----------------------------------------------------------

function renderConfirmDialog(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    const bodyY = uiDialogChrome(g, b, "Confirm Action");

    uiText(g, b.x + 20, bodyY + 30, "Are you sure you want to", { size: 10 });
    uiText(g, b.x + 20, bodyY + 46, "proceed with this action?", { size: 10 });

    const btnY = b.y + b.height - 40;
    const btnW = 70;
    uiButton(g, b.x + b.width - 160, btnY, btnW, 26, "Cancel");
    uiButton(g, b.x + b.width - 82, btnY, btnW, 26, "OK", {
        fill: C_PRIMARY, textFill: C_BG
    });
    return g;
}

// --- ErrorDialog ------------------------------------------------------------

function renderErrorDialog(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    const bodyY = uiDialogChrome(g, b, "Error");

    uiIcon(g, b.x + 20, bodyY + 36, "\u26A0", { size: 24, fill: C_DANGER });
    uiText(g, b.x + 50, bodyY + 30, "An error has occurred.", {
        size: 11, weight: 600
    });
    uiText(g, b.x + 50, bodyY + 48, "Please try again later.", {
        size: 10, fill: C_TEXT_SEC
    });

    const btnY = b.y + b.height - 40;
    uiButton(g, b.x + b.width - 82, btnY, 70, 26, "OK", {
        fill: C_DANGER, textFill: C_BG
    });
    return g;
}

// --- FormDialog -------------------------------------------------------------

function renderFormFields(g: SVGElement, x: number, y: number, w: number): void
{
    const fields = ["Name", "Email", "Message"];
    const fieldW = w - 40;

    for (let i = 0; i < fields.length; i++)
    {
        const fy = y + i * 38;
        uiText(g, x + 20, fy + 14, fields[i], { size: 10, weight: 500 });
        uiRect(g, x + 20, fy + 18, fieldW, 22, C_INPUT_BG, C_BORDER, 2);
    }
}

function renderFormDialog(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    const bodyY = uiDialogChrome(g, b, "Form");
    renderFormFields(g, b.x, bodyY + 8, b.width);

    const btnY = b.y + b.height - 40;
    const btnW = 70;
    uiButton(g, b.x + b.width - 160, btnY, btnW, 26, "Cancel");
    uiButton(g, b.x + b.width - 82, btnY, btnW, 26, "Submit", {
        fill: C_PRIMARY, textFill: C_BG
    });
    return g;
}

// --- Toolbar ----------------------------------------------------------------

function renderToolbarButtons(g: SVGElement, x: number, y: number, h: number): void
{
    const items = [
        { icon: "+", label: "New" },
        { icon: "\u270E", label: "Edit" },
        { icon: "\u2717", label: "Delete" },
        { sep: true },
        { icon: "\u21BB", label: "Refresh" },
    ];
    let cx = x + 6;

    for (const item of items)
    {
        if ((item as { sep?: boolean }).sep)
        {
            uiLine(g, cx + 2, y + 4, cx + 2, y + h - 4, C_BORDER);
            cx += 8;
            continue;
        }

        const btnItem = item as { icon: string; label: string };
        uiIcon(g, cx + 4, y + h / 2 + 1, btnItem.icon, { size: 10 });
        uiText(g, cx + 16, y + h / 2 + 3, btnItem.label, { size: 9 });
        cx += 56;
    }
}

function renderToolbar(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    uiRect(g, b.x, b.y, b.width, b.height, C_HEADER_BG, C_BORDER, 2);
    renderToolbarButtons(g, b.x, b.y, b.height);
    return g;
}

// --- Sidebar ----------------------------------------------------------------

function renderSidebarItems(
    g: SVGElement, x: number, y: number, w: number): void
{
    const items = [
        { icon: "\u2302", label: "Dashboard", active: true },
        { icon: "\u2630", label: "Projects", active: false },
        { icon: "\u2611", label: "Tasks", active: false },
        { icon: "\u2699", label: "Settings", active: false },
    ];
    const itemH = 28;

    for (let i = 0; i < items.length; i++)
    {
        const iy = y + i * itemH;
        if (items[i].active)
        {
            uiRect(g, x, iy, w, itemH, C_ACTIVE_BG, "none", 0);
            uiLine(g, x, iy, x, iy + itemH, C_PRIMARY, 3);
        }

        const fill = items[i].active ? C_PRIMARY : C_TEXT_SEC;
        uiIcon(g, x + 12, iy + 18, items[i].icon, { size: 12, fill });
        uiText(g, x + 30, iy + 18, items[i].label, {
            size: 10, fill: items[i].active ? C_TEXT : C_TEXT_SEC
        });
    }
}

function renderSidebar(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    uiRect(g, b.x, b.y, b.width, b.height, C_BG, C_BORDER, 2);
    const headY = uiHeaderBar(g, b.x, b.y, b.width, "Navigation", "\u2630");
    renderSidebarItems(g, b.x, headY + 4, b.width);
    return g;
}

// --- NavRail ----------------------------------------------------------------

function renderNavRailHeader(
    g: SVGElement, x: number, y: number, w: number): number
{
    uiRect(g, x, y, w, 44, C_HEADER_BG, "none", 0);
    uiRect(g, x + 10, y + 8, 28, 28, C_PRIMARY, "none", 0);
    uiText(g, x + 24, y + 26, "K", {
        size: 12, weight: 700, fill: "#ffffff", anchor: "middle",
    });
    uiText(g, x + 46, y + 20, "Knobby IO", { size: 10, weight: 600 });
    uiText(g, x + 46, y + 34, "Pro plan", {
        size: 8, fill: C_TEXT_MUT,
    });
    uiDivider(g, x, y + 44, w);
    return y + 44;
}

function renderNavRailSearch(
    g: SVGElement, x: number, y: number, w: number): number
{
    uiRect(g, x + 8, y + 6, w - 16, 24, C_INPUT_BG, C_BORDER, 2);
    uiIcon(g, x + 16, y + 22, "\u2315", { size: 10, fill: C_TEXT_MUT });
    uiText(g, x + 30, y + 22, "Jump to...", { size: 9, fill: C_TEXT_MUT });
    return y + 36;
}

function renderNavRailCategory(
    g: SVGElement, x: number, y: number, w: number,
    label: string, items: Array<{ icon: string; text: string; active?: boolean; badge?: boolean }>
): number
{
    uiText(g, x + 12, y + 12, label, {
        size: 8, weight: 700, fill: C_TEXT_MUT,
    });
    let iy = y + 20;

    for (const it of items)
    {
        if (it.active)
        {
            uiRect(g, x, iy, w, 22, C_ACTIVE_BG, "none", 0);
            uiLine(g, x, iy, x, iy + 22, C_PRIMARY, 3);
        }
        const iconFill = it.active ? C_PRIMARY : C_TEXT_SEC;
        uiIcon(g, x + 14, iy + 15, it.icon, { size: 11, fill: iconFill });
        uiText(g, x + 30, iy + 15, it.text, {
            size: 10, fill: it.active ? C_TEXT : C_TEXT_SEC,
            weight: it.active ? 600 : undefined,
        });

        if (it.badge)
        {
            uiRect(g, x + w - 20, iy + 7, 10, 10, "#dc2626", "none", 0);
            uiText(g, x + w - 15, iy + 15, "1", {
                size: 8, weight: 700, fill: "#ffffff", anchor: "middle",
            });
        }
        iy += 22;
    }

    return iy + 6;
}

function renderNavRail(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    uiRect(g, b.x, b.y, b.width, b.height, C_BG, C_BORDER, 2);

    let y = renderNavRailHeader(g, b.x, b.y, b.width);
    y = renderNavRailSearch(g, b.x, y, b.width);

    y = renderNavRailCategory(g, b.x, y, b.width, "WORKSPACE", [
        { icon: "\u2302", text: "Overview", active: true },
        { icon: "\u2261", text: "Settings" },
    ]);

    y = renderNavRailCategory(g, b.x, y, b.width, "PEOPLE", [
        { icon: "\u265F", text: "Users", badge: true },
        { icon: "\u2692", text: "Roles" },
    ]);

    y = renderNavRailCategory(g, b.x, y, b.width, "PLATFORM", [
        { icon: "\u2637", text: "Types" },
        { icon: "\u2630", text: "Resources" },
    ]);

    return g;
}

// --- TabbedPanel ------------------------------------------------------------

function renderTabbedTabs(
    g: SVGElement, x: number, y: number, w: number,
    tabs: string[]): void
{
    let tx = x + 4;
    for (let i = 0; i < tabs.length; i++)
    {
        const tabW = tabs[i].length * 7 + 16;
        const isActive = i === 0;

        if (isActive)
        {
            uiRect(g, tx, y, tabW, 26, C_BG, "none", 0);
            uiLine(g, tx + 2, y + 25, tx + tabW - 2, y + 25, C_PRIMARY, 2);
        }

        uiText(g, tx + 8, y + 17, tabs[i], {
            size: 10, weight: isActive ? 600 : undefined,
            fill: isActive ? C_PRIMARY : C_TEXT_SEC
        });
        tx += tabW + 2;
    }
}

function renderTabbedPanel(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    const tabs = ["General", "Advanced", "About"];

    uiRect(g, b.x, b.y, b.width, b.height, C_BG, C_BORDER, 2);
    uiRect(g, b.x, b.y, b.width, 28, C_HEADER_BG, "none", 0);
    renderTabbedTabs(g, b.x, b.y, b.width, tabs);
    uiDivider(g, b.x, b.y + 28, b.width);

    for (let i = 0; i < 4; i++)
    {
        const lw = b.width * (i === 3 ? 0.4 : 0.7) - 20;
        uiLine(g, b.x + 12, b.y + 48 + i * 16, b.x + 12 + lw,
            b.y + 48 + i * 16, C_TABLE_LINE, 2);
    }

    return g;
}

// --- Ribbon -----------------------------------------------------------------

function renderRibbonGroups(
    g: SVGElement, x: number, y: number, w: number, h: number): void
{
    const groupW = (w - 16) / 3;

    for (let i = 0; i < 3; i++)
    {
        const gx = x + 4 + i * (groupW + 4);
        uiRect(g, gx, y + 4, groupW, h - 18, "none", C_TABLE_LINE, 2);
        const labels = ["Clipboard", "Font", "Paragraph"];
        uiText(g, gx + groupW / 2, y + h - 6, labels[i], {
            size: 8, fill: C_TEXT_MUT, anchor: "middle"
        });

        for (let j = 0; j < 3; j++)
        {
            uiRect(g, gx + 6 + j * 22, y + 10, 18, 18, C_HEADER_BG, C_BORDER, 2);
        }
    }
}

function renderRibbon(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    const tabs = ["Home", "Insert", "View"];

    uiRect(g, b.x, b.y, b.width, b.height, C_BG, C_BORDER, 2);
    uiRect(g, b.x, b.y, b.width, 24, C_HEADER_BG, "none", 0);
    renderTabbedTabs(g, b.x, b.y - 2, b.width, tabs);
    uiDivider(g, b.x, b.y + 24, b.width);
    renderRibbonGroups(g, b.x, b.y + 24, b.width, b.height - 24);
    return g;
}

// --- Breadcrumb -------------------------------------------------------------

function renderBreadcrumb(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    const items = ["Home", "Products", "Detail"];
    let cx = b.x + 8;
    const cy = b.y + b.height / 2 + 4;

    for (let i = 0; i < items.length; i++)
    {
        const isLast = i === items.length - 1;
        const fill = isLast ? C_TEXT : C_PRIMARY;
        const w = isLast ? 600 : undefined;
        uiText(g, cx, cy, items[i], { size: 10, fill, weight: w });
        cx += items[i].length * 6.5 + 4;
        if (!isLast) { uiText(g, cx, cy, "/", { size: 10, fill: C_TEXT_MUT }); cx += 12; }
    }

    return g;
}

// --- StatusBar --------------------------------------------------------------

function renderStatusBar(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    uiRect(g, b.x, b.y, b.width, b.height, C_HEADER_BG, C_BORDER, 0);
    const cy = b.y + b.height / 2 + 4;
    uiText(g, b.x + 8, cy, "Ready", { size: 9, fill: C_TEXT_SEC });
    uiText(g, b.x + b.width - 8, cy, "UTF-8  |  Ln 42 Col 8", {
        size: 9, fill: C_TEXT_SEC, anchor: "end"
    });
    return g;
}

// --- Conversation -----------------------------------------------------------

function renderChatBubbles(g: SVGElement, x: number, y: number, w: number): void
{
    const msgs = [
        { align: "left", text: "How do I create a component?", bg: C_HEADER_BG },
        { align: "right", text: "Use buildComponent() with a", bg: C_CHAT_USER },
        { align: "left", text: "Can you show an example?", bg: C_HEADER_BG },
    ];
    let cy = y + 8;

    for (const msg of msgs)
    {
        const bw = Math.min(w * 0.7, msg.text.length * 6.5 + 16);
        const bx = msg.align === "right" ? x + w - bw - 8 : x + 8;
        uiRect(g, bx, cy, bw, 22, msg.bg, C_BORDER, 8);
        uiText(g, bx + 8, cy + 15, msg.text, { size: 9 });
        cy += 30;
    }
}

function renderChatInput(g: SVGElement, x: number, y: number, w: number): void
{
    const inputY = y - 30;
    uiDivider(g, x, inputY - 4, w);
    uiRect(g, x + 8, inputY, w - 50, 24, C_INPUT_BG, C_BORDER, 12);
    uiText(g, x + 20, inputY + 16, "Type a message\u2026", {
        size: 9, fill: C_TEXT_MUT
    });
    uiButton(g, x + w - 36, inputY, 28, 24, "\u2191", {
        fill: C_PRIMARY, textFill: C_BG
    });
}

function renderConversation(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    uiRect(g, b.x, b.y, b.width, b.height, C_BG, C_BORDER, 2);
    const headY = uiHeaderBar(g, b.x, b.y, b.width, "Chat", "\u2026");
    renderChatBubbles(g, b.x, headY, b.width);
    renderChatInput(g, b.x, b.y + b.height, b.width);
    return g;
}

// --- ActivityFeed -----------------------------------------------------------

function renderFeedItems(g: SVGElement, x: number, y: number, w: number): void
{
    const items = [
        { name: "Alice", action: "created a new project", time: "2m ago" },
        { name: "Bob", action: "updated the design", time: "15m ago" },
        { name: "Carol", action: "left a comment", time: "1h ago" },
        { name: "Dave", action: "merged PR #42", time: "3h ago" },
    ];
    const itemH = 32;

    for (let i = 0; i < items.length; i++)
    {
        const iy = y + i * itemH;
        uiLine(g, x + 14, iy, x + 14, iy + itemH, C_TABLE_LINE);
        uiCircle(g, x + 14, iy + 10, 4, C_PRIMARY, C_PRIMARY);
        uiCircle(g, x + 36, iy + 10, 8, C_HEADER_BG, C_BORDER);
        uiText(g, x + 36, iy + 13, items[i].name[0], {
            size: 8, anchor: "middle", fill: C_TEXT_SEC
        });
        uiText(g, x + 50, iy + 10, items[i].name, { size: 10, weight: 600 });
        uiText(g, x + 50, iy + 24, items[i].action, { size: 9, fill: C_TEXT_SEC });
        uiText(g, x + w - 8, iy + 10, items[i].time, {
            size: 8, fill: C_TEXT_MUT, anchor: "end"
        });
    }
}

function renderActivityFeed(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    uiRect(g, b.x, b.y, b.width, b.height, C_BG, C_BORDER, 2);
    const headY = uiHeaderBar(g, b.x, b.y, b.width, "Activity", "\u2261");
    renderFeedItems(g, b.x, headY + 8, b.width);
    return g;
}

// --- Timeline ---------------------------------------------------------------

function renderTimelineMarkers(
    g: SVGElement, x: number, y: number, w: number): void
{
    const months = ["Jan", "Feb", "Mar", "Apr", "May"];
    const spacing = w / (months.length + 1);
    const lineY = y;

    uiLine(g, x + 10, lineY, x + w - 10, lineY, C_BORDER, 2);

    for (let i = 0; i < months.length; i++)
    {
        const mx = x + spacing * (i + 1);
        const active = i === 2;
        const fill = active ? C_PRIMARY : C_BG;
        const stroke = active ? C_PRIMARY : C_BORDER;
        uiCircle(g, mx, lineY, 5, fill, stroke);
        uiText(g, mx, lineY - 14, months[i], {
            size: 9, anchor: "middle", fill: active ? C_PRIMARY : C_TEXT_SEC
        });
        uiText(g, mx, lineY + 18, "2026", {
            size: 8, anchor: "middle", fill: C_TEXT_MUT
        });
    }
}

function renderTimeline(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    renderTimelineMarkers(g, b.x, b.y + b.height / 2, b.width);
    return g;
}

// ============================================================================
// TIER A SHAPE MAP — name -> render function
// ============================================================================

type TierAEntry = [string, string, string, number, number,
    (ctx: ShapeRenderContext) => SVGElement];

const TIER_A_SHAPES: TierAEntry[] = [
    // Data
    ["datagrid",          "Data Grid",          "\u2637", 400, 250, renderDataGrid],
    ["treegrid",          "Tree Grid",          "\u2637", 350, 300, renderTreeGrid],
    ["treeview",          "Tree View",          "\u2261", 280, 350, renderTreeView],
    ["propertyinspector", "Property Inspector", "\u2261", 300, 400, renderPropertyInspector],
    ["hovercard",         "Hover Card",         "\u24D8", 300, 220, renderHoverCardStencil],
    // Input
    ["searchbox",         "Search Box",         "\u2315", 250, 34,  renderSearchBox],
    ["editablecombobox",  "Editable Combo Box", "\u25BE", 200, 34,  renderEditableComboBox],
    ["datepicker",        "Date Picker",        "\u2636", 250, 40,  renderDatePicker],
    ["slider",            "Slider",             "\u2500", 200, 40,  renderSlider],
    ["colorpicker",       "Color Picker",       "\u25C9", 280, 320, renderColorPicker],
    // Content
    ["codeeditor",        "Code Editor",        "\u2329", 400, 300, renderCodeEditor],
    ["markdowneditor",    "Markdown Editor",    "\u2193", 500, 400, renderMarkdownEditor],
    ["docviewer",         "Doc Viewer",         "\u2338", 600, 450, renderDocViewer],
    ["latexeditor",       "LaTeX Editor",       "\u2211", 400, 300, renderLatexEditor],
    // Feedback
    ["toast",             "Toast",              "\u2407", 300, 60,  renderToast],
    ["stepper",           "Stepper",            "\u2460", 500, 60,  renderStepper],
    ["confirmdialog",     "Confirm Dialog",     "\u003F", 400, 200, renderConfirmDialog],
    ["errordialog",       "Error Dialog",       "\u26A0", 400, 300, renderErrorDialog],
    ["formdialog",        "Form Dialog",        "\u270E", 400, 300, renderFormDialog],
    // Navigation
    ["toolbar",           "Toolbar",            "\u2692", 500, 40,  renderToolbar],
    ["sidebar",           "Sidebar",            "\u2759", 260, 400, renderSidebar],
    ["navrail",           "NavRail",            "\u2630", 240, 420, renderNavRail],
    ["tabbedpanel",       "Tabbed Panel",       "\u2610", 400, 300, renderTabbedPanel],
    ["ribbon",            "Ribbon",             "\u2630", 600, 120, renderRibbon],
    ["breadcrumb",        "Breadcrumb",         "\u203A", 400, 28,  renderBreadcrumb],
    ["statusbar",         "Status Bar",         "\u2139", 600, 28,  renderStatusBar],
    // AI + Social
    ["conversation",      "Conversation",       "\u2026", 400, 500, renderConversation],
    ["activityfeed",      "Activity Feed",      "\u2261", 350, 400, renderActivityFeed],
    ["timeline",          "Timeline",           "\u2261", 500, 200, renderTimeline],
];

// ============================================================================
// TIER B + C — ENHANCED GENERIC VARIANT RENDERERS
// ============================================================================

// --- Enhanced variant: table ------------------------------------------------

function renderEnhancedTable(
    g: SVGElement, x: number, y: number, w: number, h: number,
    cols: string[]): void
{
    const colW = w / cols.length;
    const hdrH = 20;

    uiRect(g, x, y, w, hdrH, C_HEADER_BG, "none", 0);
    for (let i = 0; i < cols.length; i++)
    {
        uiText(g, x + i * colW + 4, y + 14, cols[i], { size: 9, weight: 600 });
        if (i > 0) { uiLine(g, x + i * colW, y, x + i * colW, y + h); }
    }
    uiDivider(g, x, y + hdrH, w);

    const rows = Math.min(Math.floor((h - hdrH) / 16), 6);
    for (let r = 0; r < rows; r++)
    {
        const ry = y + hdrH + r * 16;
        if (r % 2 === 1) { uiRect(g, x, ry, w, 16, C_STRIPE, "none", 0); }
        if (r > 0) { uiDivider(g, x, ry, w); }
        for (let c = 0; c < cols.length; c++) { uiDots(g, x + c * colW + 4, ry + 12); }
    }
}

// --- Enhanced variant: input with icon + text -------------------------------

function renderEnhancedInput(
    g: SVGElement, x: number, y: number, w: number, h: number,
    iconChar: string, placeholder: string): void
{
    const inputH = Math.min(h, 24);
    uiRect(g, x, y, w, inputH, C_INPUT_BG, C_BORDER, 2);
    uiIcon(g, x + 6, y + inputH / 2 + 4, iconChar, { size: 11 });
    uiText(g, x + 22, y + inputH / 2 + 3, placeholder, {
        size: 9, fill: C_TEXT_MUT
    });
}

// --- Enhanced variant: panel with header + content --------------------------

function renderEnhancedPanel(
    g: SVGElement, x: number, y: number, w: number, h: number,
    title: string, contentFn?: (g: SVGElement, cx: number, cy: number, cw: number, ch: number) => void): void
{
    const hdrH = Math.min(22, h * 0.25);
    uiRect(g, x, y, w, hdrH, C_HEADER_BG, "none", 0);
    uiText(g, x + 6, y + hdrH - 6, title, { size: 9, weight: 600, fill: C_TEXT_SEC });
    uiDivider(g, x, y + hdrH, w);

    if (contentFn)
    {
        contentFn(g, x, y + hdrH, w, h - hdrH);
    }
}

// --- Enhanced variant: list with items --------------------------------------

function renderEnhancedList(
    g: SVGElement, x: number, y: number, w: number, h: number,
    iconChar: string, items: string[]): void
{
    const lineH = Math.min(20, h / (items.length + 1));

    for (let i = 0; i < items.length && (i * lineH) < h; i++)
    {
        const ly = y + i * lineH;
        uiIcon(g, x + 4, ly + lineH - 4, iconChar, { size: 9 });
        uiText(g, x + 18, ly + lineH - 4, items[i], { size: 9 });
        if (i > 0) { uiDivider(g, x, ly, w); }
    }
}

// --- Enhanced variant: card --------------------------------------------------

function renderEnhancedCard(
    g: SVGElement, x: number, y: number, w: number, h: number,
    iconChar: string, label: string): void
{
    uiRect(g, x, y, w, h, C_BG, C_BORDER, 3);
    uiIcon(g, x + 6, y + h / 2 + 4, iconChar, { size: 11 });
    uiText(g, x + 22, y + h / 2 + 3, label, { size: 9 });
}

// --- Enhanced variant: default with centered icon + text --------------------

function renderEnhancedDefault(
    g: SVGElement, x: number, y: number, w: number, h: number,
    iconChar: string, label: string): void
{
    uiIcon(g, x + w / 2, y + h / 2 - 4, iconChar, {
        size: 20, fill: C_TEXT_SEC
    });
    uiText(g, x + w / 2, y + h / 2 + 16, label, {
        size: 9, fill: C_TEXT_MUT, anchor: "middle"
    });
}

// --- Enhanced variant: button -----------------------------------------------

function renderEnhancedButton(
    g: SVGElement, x: number, y: number, w: number, h: number,
    label: string, primary?: boolean): void
{
    const btnW = Math.min(80, w * 0.6);
    const btnH = Math.min(24, h);
    const bx = x + (w - btnW) / 2;
    const by = y + (h - btnH) / 2;
    uiButton(g, bx, by, btnW, btnH, label, primary ? {
        fill: C_PRIMARY, textFill: C_BG
    } : undefined);
}

// --- Enhanced variant: chat -------------------------------------------------

function renderEnhancedChat(
    g: SVGElement, x: number, y: number, w: number, h: number): void
{
    const bH = Math.min(18, h * 0.28);
    const bW1 = w * 0.6;
    const bW2 = w * 0.5;

    uiRect(g, x, y, bW1, bH, C_HEADER_BG, C_TABLE_LINE, 6);
    uiDots(g, x + 8, y + bH - 4);
    uiRect(g, x + w - bW2, y + bH + 4, bW2, bH, C_CHAT_USER, C_TABLE_LINE, 6);
    uiDots(g, x + w - bW2 + 8, y + bH * 2);
}

// ============================================================================
// TIER B RENDER DISPATCH — per-component custom content
// ============================================================================

/**
 * Tier B component-specific content functions, keyed by shape name.
 * Each draws specialized detail inside the generic placeholder.
 */
function getTierBContent(name: string):
    ((g: SVGElement, x: number, y: number, w: number, h: number) => void) | null
{
    switch (name)
    {
        case "multiselectcombo":
            return (g, x, y, w, h) =>
            {
                renderEnhancedInput(g, x, y, w, h, "\u2611", "Select items\u2026");
                const pillY = y + 2;
                uiRect(g, x + w - 70, pillY, 28, 14, C_ACTIVE_BG, C_PRIMARY, 7);
                uiText(g, x + w - 64, pillY + 11, "Tag", { size: 7, fill: C_PRIMARY });
                uiRect(g, x + w - 38, pillY, 28, 14, C_ACTIVE_BG, C_PRIMARY, 7);
                uiText(g, x + w - 32, pillY + 11, "Tag", { size: 7, fill: C_PRIMARY });
            };

        case "peoplepicker":
            return (g, x, y, w, h) =>
                renderEnhancedInput(g, x, y, w, h, "\u263A", "Add people\u2026");

        case "timepicker":
            return (g, x, y, w, h) =>
                renderEnhancedInput(g, x, y, w, h, "\u231A", "12:00 PM");

        case "durationpicker":
            return (g, x, y, w, h) =>
                renderEnhancedInput(g, x, y, w, h, "\u231B", "2h 30m");

        case "cronpicker":
            return (g, x, y, w, h) =>
                renderEnhancedPanel(g, x, y, w, h, "CRON Expression", (g2, cx, cy, cw) =>
                {
                    uiText(g2, cx + 8, cy + 20, "0 */5 * * *", {
                        size: 12, fill: C_TEXT, weight: 600
                    });
                    uiText(g2, cx + 8, cy + 36, "Every 5 minutes", {
                        size: 9, fill: C_TEXT_SEC
                    });
                });

        case "timezonepicker":
            return (g, x, y, w, h) =>
                renderEnhancedInput(g, x, y, w, h, "\u2609", "UTC-5 (EST)");

        case "periodpicker":
            return (g, x, y, w, h) =>
                renderEnhancedInput(g, x, y, w, h, "\u2636", "Q1 2026");

        case "sprintpicker":
            return (g, x, y, w, h) =>
                renderEnhancedInput(g, x, y, w, h, "\u25A3", "Sprint 4");

        case "gradientpicker":
            return (g, x, y, w, h) =>
                renderEnhancedPanel(g, x, y, w, h, "Gradient", (g2, cx, cy, cw) =>
                {
                    const barW = cw - 16;
                    uiRect(g2, cx + 8, cy + 8, barW, 20, C_PRIMARY, C_BORDER, 2);
                    uiRect(g2, cx + 8, cy + 8, barW / 2, 20, "#6610f2", "none", 0);
                });

        case "anglepicker":
            return (g, x, y, w, h) =>
            {
                const cx = x + w / 2;
                const cy = y + h / 2;
                const r = Math.min(w, h) * 0.35;
                uiCircle(g, cx, cy, r, C_BG, C_BORDER);
                uiLine(g, cx, cy, cx + r * 0.8, cy - r * 0.3, C_PRIMARY, 2);
                uiCircle(g, cx, cy, 3, C_PRIMARY, C_PRIMARY);
                uiText(g, cx, cy + r + 14, "45\u00B0", {
                    size: 9, fill: C_TEXT_SEC, anchor: "middle"
                });
            };

        case "fontdropdown":
            return (g, x, y, w, h) =>
                renderEnhancedInput(g, x, y, w, h, "Aa", "Inter");

        case "symbolpicker":
            return (g, x, y, w, h) =>
                renderEnhancedPanel(g, x, y, w, h, "Symbols", (g2, cx, cy, cw) =>
                {
                    const syms = ["\u2605", "\u2665", "\u266A", "\u2708",
                        "\u2622", "\u263C", "\u2603", "\u2602", "\u2764"];
                    const cols = 3;
                    const sz = 20;
                    for (let i = 0; i < syms.length; i++)
                    {
                        const col = i % cols;
                        const row = Math.floor(i / cols);
                        uiRect(g2, cx + 8 + col * (sz + 4), cy + 4 + row * (sz + 4),
                            sz, sz, C_HEADER_BG, C_BORDER, 2);
                        uiText(g2, cx + 14 + col * (sz + 4), cy + 18 + row * (sz + 4),
                            syms[i], { size: 11 });
                    }
                });

        case "fileupload":
            return (g, x, y, w, h) =>
            {
                renderEnhancedDefault(g, x, y, w, h, "\u2191", "");
                uiText(g, x + w / 2, y + h / 2 + 4, "Drop files here", {
                    size: 10, fill: C_TEXT_SEC, anchor: "middle"
                });
                uiText(g, x + w / 2, y + h / 2 + 20, "or click to browse", {
                    size: 9, fill: C_TEXT_MUT, anchor: "middle"
                });
            };

        case "tagger":
            return (g, x, y, w, h) =>
            {
                renderEnhancedInput(g, x, y, w, h, "\u2756", "Add tag\u2026");
                uiRect(g, x + w - 56, y + 4, 24, 14, C_ACTIVE_BG, C_PRIMARY, 7);
                uiText(g, x + w - 50, y + 15, "v1", { size: 7, fill: C_PRIMARY });
                uiRect(g, x + w - 28, y + 4, 20, 14, C_ACTIVE_BG, C_PRIMARY, 7);
                uiText(g, x + w - 24, y + 15, "ui", { size: 7, fill: C_PRIMARY });
            };

        case "richtextinput":
            return (g, x, y, w, h) =>
            {
                const tbH = 20;
                uiRect(g, x, y, w, tbH, C_HEADER_BG, "none", 0);
                const btns = ["B", "I", "U", "\u2261"];
                for (let i = 0; i < btns.length; i++)
                {
                    uiText(g, x + 8 + i * 20, y + 14, btns[i], {
                        size: 10, weight: 600, fill: C_TEXT_SEC
                    });
                }
                uiDivider(g, x, y + tbH, w);
                uiDots(g, x + 8, y + tbH + 16);
            };

        case "maskedentry":
            return (g, x, y, w, h) =>
                renderEnhancedInput(g, x, y, w, h, "\u2022", "\u2022\u2022\u2022\u2022-\u2022\u2022\u2022\u2022");

        case "lineendingpicker":
            return (g, x, y, w, h) =>
            {
                renderEnhancedInput(g, x, y, w, h, "\u2192", "Arrow");
                uiLine(g, x + w - 60, y + h / 2, x + w - 30, y + h / 2, C_TEXT_SEC, 2);
                uiText(g, x + w - 32, y + h / 2 + 4, "\u25B6", { size: 8, fill: C_TEXT_SEC });
            };

        case "lineshapepicker":
            return (g, x, y, w, h) =>
            {
                renderEnhancedInput(g, x, y, w, h, "\u223F", "Curved");
                g.appendChild(svgCreate("path", {
                    d: `M ${x + w - 70} ${y + h / 2 + 4} Q ${x + w - 50} ${y + 2} ${x + w - 30} ${y + h / 2 + 4}`,
                    fill: "none", stroke: C_TEXT_SEC, "stroke-width": "2"
                }));
            };

        case "linetypepicker":
            return (g, x, y, w, h) =>
            {
                renderEnhancedInput(g, x, y, w, h, "\u2504", "Dashed");
                g.appendChild(svgCreate("line", {
                    x1: String(x + w - 70), y1: String(y + h / 2),
                    x2: String(x + w - 30), y2: String(y + h / 2),
                    stroke: C_TEXT_SEC, "stroke-width": "2",
                    "stroke-dasharray": "4 3"
                }));
            };

        case "linewidthpicker":
            return (g, x, y, w, h) =>
            {
                renderEnhancedInput(g, x, y, w, h, "\u2501", "Medium");
                uiLine(g, x + w - 70, y + h / 2 - 3, x + w - 30, y + h / 2 - 3, C_TEXT_SEC, 1);
                uiLine(g, x + w - 70, y + h / 2 + 3, x + w - 30, y + h / 2 + 3, C_TEXT_SEC, 3);
            };

        case "magnifier":
            return (g, x, y, w, h) =>
            {
                const cx = x + w / 2;
                const cy = y + h / 2 - 6;
                const r = Math.min(w, h) * 0.25;
                uiCircle(g, cx, cy, r, C_BG, C_TEXT_SEC);
                uiLine(g, cx + r * 0.7, cy + r * 0.7,
                    cx + r * 1.3, cy + r * 1.3, C_TEXT_SEC, 3);
                uiText(g, cx, cy + 4, "+", { size: 14, fill: C_TEXT_SEC, anchor: "middle" });
            };

        case "ruler":
            return (g, x, y, w, h) =>
            {
                uiRect(g, x, y, w, h, C_HEADER_BG, C_BORDER, 0);
                const tickCount = Math.floor(w / 30);
                for (let i = 0; i <= tickCount; i++)
                {
                    const tx = x + i * 30;
                    const big = i % 3 === 0;
                    uiLine(g, tx, y + h, tx, y + h - (big ? h * 0.6 : h * 0.3), C_TEXT_SEC);
                    if (big) { uiText(g, tx + 2, y + 10, String(i * 30), { size: 7, fill: C_TEXT_MUT }); }
                }
            };

        case "prompttemplatemanager":
            return (g, x, y, w, h) =>
                renderEnhancedPanel(g, x, y, w, h, "Templates", (g2, cx, cy, cw) =>
                {
                    const items = ["Summarize", "Translate", "Code Review"];
                    for (let i = 0; i < items.length; i++)
                    {
                        const iy = cy + i * 24 + 4;
                        uiText(g2, cx + 8, iy + 14, items[i], { size: 10 });
                        uiText(g2, cx + cw - 30, iy + 14, "\u270E", { size: 9, fill: C_TEXT_SEC });
                        uiText(g2, cx + cw - 14, iy + 14, "\u2717", { size: 9, fill: C_DANGER });
                        if (i > 0) { uiDivider(g2, cx, iy, cw); }
                    }
                });

        case "reasoningaccordion":
            return (g, x, y, w, h) =>
            {
                const sections = [
                    { label: "Step 1: Analysis", open: true },
                    { label: "Step 2: Reasoning", open: false },
                    { label: "Step 3: Conclusion", open: false },
                ];
                let sy = y;
                for (const sec of sections)
                {
                    const secH = sec.open ? 60 : 22;
                    uiRect(g, x, sy, w, secH, C_BG, C_BORDER, 0);
                    uiText(g, x + 6, sy + 15, sec.open ? "\u25BE" : "\u25B8", {
                        size: 9, fill: C_TEXT_SEC
                    });
                    uiText(g, x + 18, sy + 15, sec.label, { size: 10, weight: 600 });
                    if (sec.open) { uiDots(g, x + 18, sy + 36); uiDots(g, x + 18, sy + 50); }
                    sy += secH;
                }
            };

        case "auditlogviewer":
            return (g, x, y, w, h) =>
                renderEnhancedTable(g, x, y, w, h, ["Timestamp", "User", "Action"]);

        case "permissionmatrix":
            return (g, x, y, w, h) =>
            {
                const cols = ["Permission", "Admin", "Editor", "Viewer"];
                const colW = w / cols.length;
                uiRect(g, x, y, w, 20, C_HEADER_BG, "none", 0);
                for (let i = 0; i < cols.length; i++)
                {
                    uiText(g, x + i * colW + 4, y + 14, cols[i], { size: 9, weight: 600 });
                }
                uiDivider(g, x, y + 20, w);
                const perms = ["Read", "Write", "Delete"];
                const checks = [
                    [true, true, true],
                    [true, true, false],
                    [true, false, false],
                ];
                for (let r = 0; r < perms.length; r++)
                {
                    const ry = y + 20 + r * 18;
                    uiText(g, x + 4, ry + 14, perms[r], { size: 9 });
                    for (let c = 0; c < 3; c++)
                    {
                        const mark = checks[r][c] ? "\u2611" : "\u2610";
                        const fill = checks[r][c] ? C_SUCCESS : C_TEXT_MUT;
                        uiText(g, x + (c + 1) * colW + colW / 2, ry + 14, mark, {
                            size: 11, fill, anchor: "middle"
                        });
                    }
                }
            };

        case "sharedialog":
            return (g, x, y, w, h) =>
                renderEnhancedPanel(g, x, y, w, h, "Share", (g2, cx, cy, cw) =>
                {
                    renderEnhancedInput(g2, cx + 6, cy + 6, cw - 12, 20, "\u263A", "Add people\u2026");
                    const users = ["Alice (Owner)", "Bob (Editor)", "Carol (Viewer)"];
                    for (let i = 0; i < users.length; i++)
                    {
                        uiCircle(g2, cx + 18, cy + 40 + i * 22, 7, C_HEADER_BG, C_BORDER);
                        uiText(g2, cx + 30, cy + 44 + i * 22, users[i], { size: 9 });
                    }
                });

        case "notificationcenter":
            return (g, x, y, w, h) =>
                renderEnhancedList(g, x, y, w, h, "\u2407", [
                    "New comment on PR #42",
                    "Build succeeded",
                    "Alice mentioned you",
                    "Sprint review tomorrow",
                ]);

        case "workspaceswitcher":
            return (g, x, y, w, h) =>
                renderEnhancedPanel(g, x, y, w, h, "Workspaces", (g2, cx, cy, cw) =>
                {
                    const ws = ["Engineering", "Design", "Marketing"];
                    for (let i = 0; i < ws.length; i++)
                    {
                        const wy = cy + 6 + i * 28;
                        uiRect(g2, cx + 6, wy, cw - 12, 24, i === 0 ? C_ACTIVE_BG : C_BG,
                            C_BORDER, 3);
                        uiText(g2, cx + 14, wy + 16, ws[i], { size: 10 });
                    }
                });

        case "usermenu":
            return (g, x, y, w, h) =>
            {
                uiCircle(g, x + w / 2, y + 24, 14, C_HEADER_BG, C_BORDER);
                uiText(g, x + w / 2, y + 28, "JD", {
                    size: 10, anchor: "middle", weight: 600, fill: C_TEXT_SEC
                });
                const items = ["Profile", "Settings", "Sign Out"];
                for (let i = 0; i < items.length; i++)
                {
                    const iy = y + 48 + i * 24;
                    uiText(g, x + 12, iy + 14, items[i], { size: 10 });
                    if (i < items.length - 1) { uiDivider(g, x + 4, iy + 22, w - 8); }
                }
            };

        case "fileexplorer":
            return (g, x, y, w, h) =>
            {
                const splitX = w * 0.35;
                renderEnhancedPanel(g, x, y, splitX, h, "Folders", (g2, cx, cy, cw) =>
                {
                    const folders = ["\u25BE \uD83D\uDCC1 src", "  \uD83D\uDCC1 lib", "  \uD83D\uDCC1 test", "\u25B8 \uD83D\uDCC1 docs"];
                    for (let i = 0; i < folders.length; i++)
                    {
                        uiText(g2, cx + 4, cy + 14 + i * 18, folders[i], { size: 9 });
                    }
                });
                uiLine(g, x + splitX, y, x + splitX, y + h, C_BORDER);
                renderEnhancedPanel(g, x + splitX, y, w - splitX, h, "Files", (g2, cx, cy, cw) =>
                {
                    const files = ["\uD83D\uDCC4 index.ts", "\uD83D\uDCC4 app.ts", "\uD83D\uDCC4 style.scss"];
                    for (let i = 0; i < files.length; i++)
                    {
                        uiText(g2, cx + 4, cy + 14 + i * 18, files[i], { size: 9 });
                    }
                });
            };

        case "applauncher":
            return (g, x, y, w, h) =>
            {
                const apps = ["Mail", "Chat", "Docs", "Sheet", "Slide", "Drive", "Cal", "Meet", "Maps"];
                const cols = 3;
                const cellW = (w - 16) / cols;
                const cellH = (h - 8) / 3;
                for (let i = 0; i < apps.length; i++)
                {
                    const col = i % cols;
                    const row = Math.floor(i / cols);
                    const ax = x + 8 + col * cellW;
                    const ay = y + 4 + row * cellH;
                    uiRect(g, ax + 4, ay + 4, cellW - 8, cellH - 16, C_HEADER_BG, C_BORDER, 4);
                    uiText(g, ax + cellW / 2, ay + cellH - 6, apps[i], {
                        size: 8, anchor: "middle", fill: C_TEXT_SEC
                    });
                }
            };

        case "logconsole":
            return (g, x, y, w, h) =>
            {
                uiRect(g, x, y, w, h, C_CODE_BG, C_BORDER, 0);
                const lines = [
                    "[12:01:03] INFO  Server started on :8080",
                    "[12:01:05] INFO  Connected to database",
                    "[12:01:07] WARN  Slow query (230ms)",
                    "[12:01:09] ERROR Connection timeout",
                ];
                const colors = [C_CODE_TEXT, C_CODE_TEXT, C_WARNING, C_DANGER];
                for (let i = 0; i < lines.length; i++)
                {
                    uiText(g, x + 6, y + 14 + i * 16, lines[i], {
                        size: 9, fill: colors[i]
                    });
                }
            };

        case "gauge":
            return (g, x, y, w, h) =>
            {
                const cx = x + w / 2;
                const cy = y + h * 0.55;
                const r = Math.min(w, h) * 0.35;
                g.appendChild(svgCreate("path", {
                    d: `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`,
                    fill: "none", stroke: C_BORDER, "stroke-width": "6",
                    "stroke-linecap": "round"
                }));
                g.appendChild(svgCreate("path", {
                    d: `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx} ${cy - r}`,
                    fill: "none", stroke: C_SUCCESS, "stroke-width": "6",
                    "stroke-linecap": "round"
                }));
                uiCircle(g, cx, cy, 4, C_TEXT, C_TEXT);
                uiText(g, cx, cy + 20, "72%", {
                    size: 14, weight: 700, anchor: "middle"
                });
                uiText(g, cx - r, cy + 12, "0", { size: 8, fill: C_TEXT_MUT });
                uiText(g, cx + r, cy + 12, "100", {
                    size: 8, fill: C_TEXT_MUT, anchor: "end"
                });
            };

        case "emptystate":
            return (g, x, y, w, h) =>
            {
                uiIcon(g, x + w / 2 - 4, y + h * 0.35, "\u2300", {
                    size: 28, fill: C_TEXT_MUT
                });
                uiText(g, x + w / 2, y + h * 0.55, "No data yet", {
                    size: 11, anchor: "middle", fill: C_TEXT_SEC
                });
                uiText(g, x + w / 2, y + h * 0.65, "Get started by adding items", {
                    size: 9, anchor: "middle", fill: C_TEXT_MUT
                });
                uiButton(g, x + w / 2 - 35, y + h * 0.72, 70, 24, "Add Item", {
                    fill: C_PRIMARY, textFill: C_BG
                });
            };

        default:
            return null;
    }
}

// ============================================================================
// TIER C — PER-COMPONENT VISUAL IMPROVEMENTS
// ============================================================================

/**
 * Tier C component-specific content functions, keyed by shape name.
 * Each draws improved detail inside the generic placeholder.
 */
function getTierCContent(name: string):
    ((g: SVGElement, x: number, y: number, w: number, h: number) => void) | null
{
    switch (name)
    {
        // --- Layout components: show structural lines ---
        case "docklayout":
            return (g, x, y, w, h) =>
            {
                uiRect(g, x, y, w * 0.25, h, C_HEADER_BG, C_BORDER, 0);
                uiText(g, x + 4, y + 14, "Left", { size: 8, fill: C_TEXT_MUT });
                uiRect(g, x + w * 0.25, y, w * 0.75, h * 0.7, C_BG, C_BORDER, 0);
                uiText(g, x + w * 0.3, y + 14, "Center", { size: 8, fill: C_TEXT_MUT });
                uiRect(g, x + w * 0.25, y + h * 0.7, w * 0.75, h * 0.3, C_HEADER_BG, C_BORDER, 0);
                uiText(g, x + w * 0.3, y + h * 0.7 + 14, "Bottom", { size: 8, fill: C_TEXT_MUT });
            };

        case "splitlayout":
            return (g, x, y, w, h) =>
            {
                uiRect(g, x, y, w / 2 - 2, h, C_BG, C_BORDER, 0);
                uiText(g, x + 8, y + h / 2, "Panel A", { size: 9, fill: C_TEXT_MUT });
                uiRect(g, x + w / 2 + 2, y, w / 2 - 2, h, C_BG, C_BORDER, 0);
                uiText(g, x + w / 2 + 10, y + h / 2, "Panel B", { size: 9, fill: C_TEXT_MUT });
                uiLine(g, x + w / 2 - 1, y, x + w / 2 - 1, y + h, C_TEXT_MUT, 3);
            };

        case "layerlayout":
            return (g, x, y, w, h) =>
            {
                for (let i = 2; i >= 0; i--)
                {
                    const off = i * 8;
                    uiRect(g, x + off, y + off, w - off * 2, h - off * 2,
                        i === 0 ? C_BG : C_HEADER_BG, C_BORDER, 2);
                }
                uiText(g, x + w / 2, y + h / 2 + 4, "Layer 1", {
                    size: 9, fill: C_TEXT_MUT, anchor: "middle"
                });
            };

        case "cardlayout":
            return (g, x, y, w, h) =>
            {
                const cols = 2;
                const rows = 2;
                const cw = (w - 12) / cols;
                const ch = (h - 12) / rows;
                for (let r = 0; r < rows; r++)
                {
                    for (let c = 0; c < cols; c++)
                    {
                        uiRect(g, x + 4 + c * (cw + 4), y + 4 + r * (ch + 4),
                            cw, ch, C_BG, C_BORDER, 3);
                    }
                }
            };

        case "boxlayout":
            return (g, x, y, w, h) =>
            {
                const count = 3;
                const bw = (w - 16) / count;
                for (let i = 0; i < count; i++)
                {
                    uiRect(g, x + 4 + i * (bw + 4), y + 4, bw, h - 8,
                        C_HEADER_BG, C_BORDER, 2);
                    uiText(g, x + 4 + i * (bw + 4) + bw / 2, y + h / 2, String(i + 1), {
                        size: 10, fill: C_TEXT_MUT, anchor: "middle"
                    });
                }
            };

        case "flowlayout":
            return (g, x, y, w, h) =>
            {
                const items = 7;
                const iw = 40;
                const ih = 28;
                let cx = x + 4;
                let cy = y + 4;
                for (let i = 0; i < items; i++)
                {
                    if (cx + iw > x + w - 4) { cx = x + 4; cy += ih + 4; }
                    uiRect(g, cx, cy, iw, ih, C_HEADER_BG, C_BORDER, 2);
                    cx += iw + 4;
                }
            };

        case "gridlayout":
            return (g, x, y, w, h) =>
            {
                const cols = 3;
                const rows = 3;
                const cw = w / cols;
                const rh = h / rows;
                for (let c = 1; c < cols; c++) { uiLine(g, x + c * cw, y, x + c * cw, y + h, C_TABLE_LINE); }
                for (let r = 1; r < rows; r++) { uiLine(g, x, y + r * rh, x + w, y + r * rh, C_TABLE_LINE); }
            };

        case "anchorlayout":
            return (g, x, y, w, h) =>
            {
                uiRect(g, x + w * 0.1, y + h * 0.1, w * 0.3, h * 0.25, C_HEADER_BG, C_BORDER, 2);
                uiRect(g, x + w * 0.6, y + h * 0.1, w * 0.3, h * 0.25, C_HEADER_BG, C_BORDER, 2);
                uiRect(g, x + w * 0.2, y + h * 0.55, w * 0.6, h * 0.3, C_HEADER_BG, C_BORDER, 2);
                uiText(g, x + w / 2, y + h / 2, "\u2693", { size: 14, fill: C_TEXT_MUT, anchor: "middle" });
            };

        case "borderlayout":
            return (g, x, y, w, h) =>
            {
                uiRect(g, x, y, w, h * 0.15, C_HEADER_BG, C_BORDER, 0);
                uiText(g, x + w / 2, y + h * 0.1, "N", { size: 8, fill: C_TEXT_MUT, anchor: "middle" });
                uiRect(g, x, y + h * 0.85, w, h * 0.15, C_HEADER_BG, C_BORDER, 0);
                uiText(g, x + w / 2, y + h * 0.92, "S", { size: 8, fill: C_TEXT_MUT, anchor: "middle" });
                uiRect(g, x, y + h * 0.15, w * 0.2, h * 0.7, C_HEADER_BG, C_BORDER, 0);
                uiText(g, x + w * 0.1, y + h / 2, "W", { size: 8, fill: C_TEXT_MUT, anchor: "middle" });
                uiRect(g, x + w * 0.8, y + h * 0.15, w * 0.2, h * 0.7, C_HEADER_BG, C_BORDER, 0);
                uiText(g, x + w * 0.9, y + h / 2, "E", { size: 8, fill: C_TEXT_MUT, anchor: "middle" });
                uiText(g, x + w / 2, y + h / 2, "Center", { size: 9, fill: C_TEXT_MUT, anchor: "middle" });
            };

        case "flexgridlayout":
            return (g, x, y, w, h) =>
            {
                const widths = [0.4, 0.6];
                let cx = x;
                for (let c = 0; c < 2; c++)
                {
                    const cw = w * widths[c];
                    for (let r = 0; r < 3; r++)
                    {
                        const rh = h / 3;
                        uiRect(g, cx + 2, y + r * rh + 2, cw - 4, rh - 4,
                            C_HEADER_BG, C_BORDER, 2);
                    }
                    cx += w * widths[c];
                }
            };

        // --- Small UI atoms ---
        case "personchip":
            return (g, x, y, w, h) =>
            {
                uiRect(g, x, y, w, h, C_BG, C_BORDER, h / 2);
                uiCircle(g, x + h / 2, y + h / 2, h / 2 - 3, C_HEADER_BG, C_BORDER);
                uiText(g, x + h / 2, y + h / 2 + 3, "J", {
                    size: 9, anchor: "middle", fill: C_TEXT_SEC
                });
                uiText(g, x + h + 4, y + h / 2 + 3, "Jane Doe", { size: 9 });
            };

        case "presenceindicator":
            return (g, x, y, w, h) =>
            {
                uiCircle(g, x + 8, y + h / 2, 5, C_SUCCESS, C_SUCCESS);
                uiText(g, x + 18, y + h / 2 + 4, "Online", {
                    size: 9, fill: C_SUCCESS
                });
            };

        case "pill":
            return (g, x, y, w, h) =>
            {
                uiRect(g, x, y, w, h, C_ACTIVE_BG, C_PRIMARY, h / 2);
                uiText(g, x + w / 2, y + h / 2 + 3, "Label", {
                    size: 9, fill: C_PRIMARY, anchor: "middle"
                });
            };

        case "typebadge":
            return (g, x, y, w, h) =>
            {
                uiRect(g, x, y, w, h, C_PRIMARY, C_PRIMARY, 3);
                uiText(g, x + w / 2, y + h / 2 + 3, "Type", {
                    size: 8, fill: C_BG, anchor: "middle", weight: 600
                });
            };

        case "statusbadge":
            return (g, x, y, w, h) =>
            {
                uiCircle(g, x + 8, y + h / 2, 4, C_SUCCESS, C_SUCCESS);
                uiText(g, x + 16, y + h / 2 + 3, "Active", {
                    size: 9, fill: C_TEXT
                });
            };

        case "helptooltip":
            return (g, x, y, w, h) =>
            {
                uiCircle(g, x + w / 2, y + h / 2, Math.min(w, h) / 2 - 1,
                    C_HEADER_BG, C_BORDER);
                uiText(g, x + w / 2, y + h / 2 + 4, "?", {
                    size: 12, anchor: "middle", weight: 700, fill: C_TEXT_SEC
                });
            };

        case "helpdrawer":
            return (g, x, y, w, h) =>
                renderEnhancedPanel(g, x, y, w, h, "? Help", (g2, cx, cy, cw, ch) =>
                {
                    uiText(g2, cx + 8, cy + 18, "Getting Started", { size: 11, weight: 600 });
                    for (let i = 0; i < 4; i++)
                    {
                        const lw = cw * (i === 3 ? 0.5 : 0.8) - 16;
                        uiLine(g2, cx + 8, cy + 30 + i * 14, cx + 8 + lw,
                            cy + 30 + i * 14, C_TEXT_MUT, 2);
                    }
                });

        case "bannerbar":
            return (g, x, y, w, h) =>
            {
                uiRect(g, x, y, w, h, "#fff3cd", C_WARNING, 0);
                uiIcon(g, x + 12, y + h / 2 + 5, "\u26A0", { size: 14, fill: "#856404" });
                uiText(g, x + 30, y + h / 2 + 4, "Important: System maintenance tonight", {
                    size: 10, fill: "#856404"
                });
                uiCloseX(g, x + w - 18, y + h / 2 + 5);
            };

        case "graphtoolbar":
            return (g, x, y, w, h) =>
            {
                uiRect(g, x, y, w, h, C_HEADER_BG, C_BORDER, 2);
                const icons = ["\u25AD", "\u25CB", "\u2192", "\u270E", "T", "\u2500", "|", "\u2315", "\u2302"];
                let ix = x + 6;
                for (const ic of icons)
                {
                    if (ic === "|") { uiLine(g, ix, y + 4, ix, y + h - 4, C_BORDER); ix += 6; continue; }
                    uiText(g, ix + 6, y + h / 2 + 4, ic, { size: 11, fill: C_TEXT_SEC });
                    ix += 24;
                }
            };

        case "skeletonloader":
            return (g, x, y, w, h) =>
            {
                uiRect(g, x + 4, y + 4, w * 0.3, 14, C_TABLE_LINE, "none", 4);
                uiRect(g, x + 4, y + 24, w - 8, 12, C_TABLE_LINE, "none", 4);
                uiRect(g, x + 4, y + 42, w * 0.8, 12, C_TABLE_LINE, "none", 4);
                uiRect(g, x + 4, y + 60, w * 0.6, 12, C_TABLE_LINE, "none", 4);
                uiRect(g, x + 4, y + 78, w * 0.9, 12, C_TABLE_LINE, "none", 4);
            };

        case "progressmodal":
            return (g, x, y, w, h) =>
            {
                const bodyY = uiDialogChrome(g, { x, y, width: w, height: h } as Rect, "Processing\u2026");
                const barY = bodyY + h * 0.3;
                const barW = w - 40;
                uiRect(g, x + 20, barY, barW, 12, C_TABLE_LINE, C_BORDER, 6);
                uiRect(g, x + 20, barY, barW * 0.65, 12, C_PRIMARY, C_PRIMARY, 6);
                uiText(g, x + w / 2, barY + 28, "65%", {
                    size: 11, anchor: "middle", fill: C_TEXT_SEC
                });
            };

        case "guidedtour":
            return (g, x, y, w, h) =>
            {
                uiRect(g, x, y + 10, w, h - 10, C_BG, C_BORDER, 4);
                // tooltip arrow
                g.appendChild(svgCreate("polygon", {
                    points: `${x + 20},${y} ${x + 30},${y + 10} ${x + 10},${y + 10}`,
                    fill: C_BG, stroke: C_BORDER, "stroke-width": "1"
                }));
                uiText(g, x + 12, y + 30, "Step 1 of 5", {
                    size: 9, fill: C_TEXT_MUT
                });
                uiText(g, x + 12, y + 48, "Click here to get started", {
                    size: 10, weight: 600
                });
                uiButton(g, x + w - 58, y + h - 28, 46, 20, "Next", {
                    fill: C_PRIMARY, textFill: C_BG
                });
            };

        case "commandpalette":
            return (g, x, y, w, h) =>
            {
                uiRect(g, x, y, w, h, C_BG, C_BORDER, 4);
                renderEnhancedInput(g, x + 8, y + 8, w - 16, 24, "\u2315", "Type a command\u2026");
                const cmds = ["\u2302 Go to File", "\u2699 Open Settings", "\u2637 Toggle Panel"];
                for (let i = 0; i < cmds.length; i++)
                {
                    const iy = y + 40 + i * 24;
                    if (i === 0) { uiRect(g, x + 4, iy, w - 8, 22, C_ACTIVE_BG, "none", 2); }
                    uiText(g, x + 12, iy + 16, cmds[i], { size: 10 });
                }
            };

        case "actionitems":
            return (g, x, y, w, h) =>
            {
                const items = [
                    { checked: true, text: "Review pull request" },
                    { checked: true, text: "Update documentation" },
                    { checked: false, text: "Deploy to staging" },
                    { checked: false, text: "Run integration tests" },
                ];
                for (let i = 0; i < items.length; i++)
                {
                    const iy = y + i * 22;
                    const mark = items[i].checked ? "\u2611" : "\u2610";
                    const fill = items[i].checked ? C_SUCCESS : C_TEXT_SEC;
                    uiText(g, x + 6, iy + 16, mark, { size: 12, fill });
                    uiText(g, x + 22, iy + 16, items[i].text, {
                        size: 10, fill: items[i].checked ? C_TEXT_MUT : C_TEXT
                    });
                }
            };

        case "visualtableeditor":
            return (g, x, y, w, h) =>
            {
                // Header row
                uiRect(g, x, y, w, 22, C_PRIMARY, "none");
                const cols = 4;
                const cw = w / cols;
                for (let c = 0; c < cols; c++)
                {
                    uiText(g, x + c * cw + 6, y + 15, "Col " + (c + 1), {
                        size: 9, fill: C_ACTIVE_BG, weight: 600,
                    });
                    if (c > 0) { uiLine(g, x + c * cw, y, x + c * cw, y + h, C_BORDER, 1); }
                }
                // Data rows
                const rows = Math.min(4, Math.floor((h - 22) / 20));
                for (let r = 0; r < rows; r++)
                {
                    const ry = y + 22 + r * 20;
                    uiLine(g, x, ry, x + w, ry, C_BORDER, 1);
                    for (let c = 0; c < cols; c++)
                    {
                        uiText(g, x + c * cw + 6, ry + 14, "data", { size: 9 });
                    }
                }
                uiRect(g, x, y, w, h, "none", C_BORDER, 1);
            };

        case "facetsearch":
            return (g, x, y, w, h) =>
            {
                renderEnhancedInput(g, x, y, w, h, "\u2315", "Search with filters\u2026");
                uiRect(g, x + w - 90, y + 4, 32, 14, C_ACTIVE_BG, C_PRIMARY, 7);
                uiText(g, x + w - 84, y + 15, "Type", { size: 7, fill: C_PRIMARY });
                uiRect(g, x + w - 52, y + 4, 40, 14, C_ACTIVE_BG, C_PRIMARY, 7);
                uiText(g, x + w - 46, y + 15, "Status", { size: 7, fill: C_PRIMARY });
            };

        case "themetoggle":
            return (g, x, y, w, h) =>
            {
                const cy = y + h / 2;
                uiRect(g, x, cy - 8, w, 16, C_HEADER_BG, C_BORDER, 8);
                uiCircle(g, x + 12, cy, 6, C_BG, C_BORDER);
                uiText(g, x + 6, cy + 4, "\u2600", { size: 8, fill: C_WARNING });
                uiText(g, x + w - 14, cy + 4, "\u263E", { size: 8, fill: C_TEXT_MUT });
            };

        case "markdownrenderer":
            return (g, x, y, w, h) =>
                renderEnhancedPanel(g, x, y, w, h, "Preview", (g2, cx, cy, cw) =>
                {
                    uiText(g2, cx + 8, cy + 18, "Heading", { size: 13, weight: 700 });
                    uiLine(g2, cx + 8, cy + 24, cx + cw - 8, cy + 24, C_TABLE_LINE, 1);
                    for (let i = 0; i < 3; i++)
                    {
                        const lw = cw * (i === 2 ? 0.5 : 0.8) - 16;
                        uiLine(g2, cx + 8, cy + 38 + i * 14, cx + 8 + lw,
                            cy + 38 + i * 14, C_TEXT_MUT, 2);
                    }
                });

        case "commentoverlay":
            return (g, x, y, w, h) =>
                renderEnhancedChat(g, x, y, w, h);

        case "relationshipmanager":
            return (g, x, y, w, h) =>
                renderEnhancedTable(g, x, y, w, h, ["From", "Relation", "To"]);

        case "ribbonbuilder":
            return (g, x, y, w, h) =>
            {
                const splitX = w * 0.3;
                renderEnhancedPanel(g, x, y, splitX, h, "Structure", (g2, cx, cy, cw) =>
                {
                    const nodes = ["\u25BE Tab: Home", "  \u25BE Clipboard", "    Cut", "    Copy"];
                    for (let i = 0; i < nodes.length; i++)
                    {
                        uiText(g2, cx + 4, cy + 14 + i * 18, nodes[i], { size: 9 });
                    }
                });
                uiLine(g, x + splitX, y, x + splitX, y + h, C_BORDER);
                renderEnhancedPanel(g, x + splitX, y, w - splitX, h, "Preview");
            };

        case "spinemap":
            return (g, x, y, w, h) =>
            {
                const cx = x + w / 2;
                uiLine(g, cx, y + 20, cx, y + h - 20, C_TEXT_MUT, 2);
                const nodes = [
                    { side: "left", ty: 0.2, label: "Topic A" },
                    { side: "right", ty: 0.4, label: "Topic B" },
                    { side: "left", ty: 0.6, label: "Topic C" },
                    { side: "right", ty: 0.8, label: "Topic D" },
                ];
                for (const n of nodes)
                {
                    const ny = y + h * n.ty;
                    uiCircle(g, cx, ny, 4, C_PRIMARY, C_PRIMARY);
                    const bx = n.side === "left" ? cx - w * 0.4 : cx + 10;
                    uiLine(g, cx, ny, bx, ny, C_TEXT_MUT, 1);
                    uiRect(g, bx, ny - 10, w * 0.3, 20, C_HEADER_BG, C_BORDER, 3);
                    uiText(g, bx + 6, ny + 4, n.label, { size: 9 });
                }
            };

        case "graphcanvas":
            return (g, x, y, w, h) =>
            {
                // Simple node-edge diagram
                const n1x = x + w * 0.2;
                const n1y = y + h * 0.3;
                const n2x = x + w * 0.7;
                const n2y = y + h * 0.2;
                const n3x = x + w * 0.5;
                const n3y = y + h * 0.7;

                uiLine(g, n1x + 20, n1y, n2x, n2y, C_TEXT_MUT, 1);
                uiLine(g, n2x, n2y + 15, n3x + 15, n3y, C_TEXT_MUT, 1);
                uiLine(g, n1x + 10, n1y + 15, n3x, n3y, C_TEXT_MUT, 1);

                uiRect(g, n1x - 20, n1y - 12, 40, 24, C_ACTIVE_BG, C_PRIMARY, 4);
                uiText(g, n1x, n1y + 4, "A", { size: 10, anchor: "middle", weight: 600 });
                uiRect(g, n2x - 20, n2y - 12, 40, 24, C_ACTIVE_BG, C_PRIMARY, 4);
                uiText(g, n2x, n2y + 4, "B", { size: 10, anchor: "middle", weight: 600 });
                uiRect(g, n3x - 20, n3y - 12, 40, 24, C_ACTIVE_BG, C_PRIMARY, 4);
                uiText(g, n3x, n3y + 4, "C", { size: 10, anchor: "middle", weight: 600 });
            };

        case "metriccard":
            return (g, x, y, w, h) =>
            {
                // KPI card preview: eyebrow label, big value, trend, sparkline.
                uiText(g, x + 10, y + 16, "ACTIVE USERS", {
                    size: 8, weight: 600, fill: C_TEXT_MUT
                });
                uiText(g, x + 10, y + 42, "1,284", {
                    size: 22, weight: 700, fill: C_TEXT
                });
                uiText(g, x + 10, y + 58, "\u2191 +52 this week", {
                    size: 9, fill: C_SUCCESS
                });
                // Mini sparkline along the bottom
                const sx = x + 10;
                const sy = y + h - 12;
                const sw = w - 20;
                const spark = [0.7, 0.5, 0.6, 0.3, 0.45, 0.2, 0.35, 0.1];
                let prevX = sx;
                let prevY = sy - spark[0] * 14;
                for (let i = 1; i < spark.length; i++)
                {
                    const cx = sx + (sw * i) / (spark.length - 1);
                    const cy = sy - spark[i] * 14;
                    uiLine(g, prevX, prevY, cx, cy, C_SUCCESS, 1.5);
                    prevX = cx;
                    prevY = cy;
                }
            };

        case "chartpanel":
            return (g, x, y, w, h) =>
            {
                // Bar-chart preview: axis frame + bars + faint gridlines.
                const padL = 24;
                const padB = 16;
                const padT = 8;
                const padR = 8;
                const ax = x + padL;
                const ay = y + padT;
                const aw = w - padL - padR;
                const ah = h - padT - padB;
                // Y-axis gridlines
                for (let i = 1; i <= 3; i++)
                {
                    const gy = ay + (ah * i) / 4;
                    uiLine(g, ax, gy, ax + aw, gy, C_TABLE_LINE, 1);
                }
                // Axes
                uiLine(g, ax, ay, ax, ay + ah, C_BORDER, 1);
                uiLine(g, ax, ay + ah, ax + aw, ay + ah, C_BORDER, 1);
                // Bars
                const heights = [0.35, 0.55, 0.45, 0.7, 0.6, 0.85];
                const gap = 4;
                const bw = (aw - gap * (heights.length + 1)) / heights.length;
                for (let i = 0; i < heights.length; i++)
                {
                    const bx = ax + gap + i * (bw + gap);
                    const bh = ah * heights[i];
                    uiRect(g, bx, ay + ah - bh, bw, bh, C_PRIMARY, C_PRIMARY, 0);
                }
            };

        default:
            return null;
    }
}

// ============================================================================
// GENERIC PLACEHOLDER RENDERER (for Tier B/C fallback)
// ============================================================================

/**
 * Renders a generic placeholder with icon, label, and optional content.
 */
function renderGenericPlaceholder(
    ctx: ShapeRenderContext,
    label: string,
    icon: string,
    contentFn: ((g: SVGElement, x: number, y: number, w: number, h: number) => void) | null): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    uiRect(g, b.x, b.y, b.width, b.height, C_BG, C_BORDER, 3);
    uiIcon(g, b.x + 8, b.y + 18, icon, { size: 12 });
    uiText(g, b.x + 24, b.y + 18, label, { size: 11, fill: C_TEXT });

    if (contentFn)
    {
        const detailY = b.y + 28;
        const detailH = Math.max(0, b.height - 34);
        if (detailH > 8)
        {
            contentFn(g, b.x + 6, detailY, b.width - 12, detailH);
        }
    }

    return g;
}

// ============================================================================
// SHAPE BUILDERS
// ============================================================================

/**
 * Builds a ShapeDefinition with a custom Tier A render function.
 */
function buildCustomUiShape(
    name: string, label: string, icon: string,
    w: number, h: number,
    renderFn: (ctx: ShapeRenderContext) => SVGElement,
    category?: string): ShapeDefinition
{
    return {
        type: name,
        category: category || UI_CATEGORY,
        label,
        icon,
        defaultSize: { w, h },
        minSize: { w: Math.min(w, 80), h: Math.min(h, 30) },
        render: renderFn,
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => uiDefaultTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => uiRectOutlinePath(bounds)
    };
}

/**
 * Builds a ShapeDefinition using the generic placeholder with
 * component-specific content.
 */
function buildGenericUiShape(
    name: string, label: string, icon: string,
    w: number, h: number,
    contentFn: ((g: SVGElement, x: number, y: number, w: number, h: number) => void) | null): ShapeDefinition
{
    return {
        type: name,
        category: UI_CATEGORY,
        label,
        icon,
        defaultSize: { w, h },
        minSize: { w: Math.min(w, 80), h: Math.min(h, 30) },
        render: (ctx: ShapeRenderContext) =>
            renderGenericPlaceholder(ctx, label, icon, contentFn),
        getHandles: (bounds: Rect) => createBoundingBoxHandles(bounds),
        getPorts: (bounds: Rect) => createDefaultPorts(bounds),
        hitTest: (point: Point, bounds: Rect) => rectHitTest(point, bounds),
        getTextRegions: (bounds: Rect) => uiDefaultTextRegions(bounds),
        getOutlinePath: (bounds: Rect) => uiRectOutlinePath(bounds)
    };
}

// ============================================================================
// TIER B SHAPE TUPLES: [name, label, icon, w, h]
// ============================================================================

type UiGenericTuple = [string, string, string, number, number];

const TIER_B_SHAPES: UiGenericTuple[] = [
    ["multiselectcombo",  "Multi-Select Combo",     "\u2611", 250, 34],
    ["peoplepicker",      "People Picker",          "\u263A", 250, 40],
    ["timepicker",        "Time Picker",            "\u231A", 200, 40],
    ["durationpicker",    "Duration Picker",        "\u231B", 250, 40],
    ["cronpicker",        "CRON Picker",            "\u2637", 360, 280],
    ["timezonepicker",    "Timezone Picker",        "\u2609", 250, 40],
    ["periodpicker",      "Period Picker",          "\u2636", 250, 40],
    ["sprintpicker",      "Sprint Picker",          "\u25A3", 250, 40],
    ["gradientpicker",    "Gradient Picker",        "\u25C9", 300, 340],
    ["anglepicker",       "Angle Picker",           "\u21BB", 160, 160],
    ["fontdropdown",      "Font Dropdown",          "Aa",     200, 34],
    ["symbolpicker",      "Symbol Picker",          "\u263C", 320, 300],
    ["fileupload",        "File Upload",            "\u2191", 300, 200],
    ["tagger",            "Tagger",                 "\u2756", 250, 34],
    ["richtextinput",     "Rich Text Input",        "\u00B6", 300, 100],
    ["maskedentry",       "Masked Entry",           "\u2022", 200, 34],
    ["lineendingpicker",  "Line Ending Picker",     "\u2192", 200, 34],
    ["lineshapepicker",   "Line Shape Picker",      "\u223F", 200, 34],
    ["linetypepicker",    "Line Type Picker",       "\u2504", 200, 34],
    ["linewidthpicker",   "Line Width Picker",      "\u2501", 200, 34],
    ["magnifier",         "Magnifier",              "\u2315", 150, 150],
    ["ruler",             "Ruler",                  "\u2500", 400, 24],
    ["prompttemplatemanager", "Prompt Template Manager", "\u2338", 600, 450],
    ["reasoningaccordion","Reasoning Accordion",    "\u2261", 400, 300],
    ["auditlogviewer",    "Audit Log Viewer",       "\u2637", 600, 350],
    ["permissionmatrix",  "Permission Matrix",      "\u2611", 500, 350],
    ["sharedialog",       "Share Dialog",           "\u2197", 400, 300],
    ["notificationcenter","Notification Center",    "\u2407", 350, 400],
    ["workspaceswitcher", "Workspace Switcher",     "\u2302", 250, 300],
    ["usermenu",          "User Menu",              "\u263A", 200, 250],
    ["fileexplorer",      "File Explorer",          "\u2302", 500, 400],
    ["applauncher",       "App Launcher",           "\u2637", 300, 300],
    ["logconsole",        "Log Console",            "\u2328", 500, 250],
    ["gauge",             "Gauge",                  "\u25D4", 200, 200],
    ["emptystate",        "Empty State",            "\u2300", 300, 200],
    ["orientationpicker", "Orientation Picker",     "\u21C5", 200, 40],
    ["sizespicker",       "Sizes Picker",           "\u2B1C", 200, 40],
    ["marginspicker",     "Margins Picker",         "\u25A3", 200, 40],
    ["toolcolorpicker",   "Tool Color Picker",      "\u270F", 250, 40],
    ["columnspicker",     "Columns Picker",         "\u2503", 200, 40],
    ["spacingpicker",     "Spacing Picker",         "\u2261", 200, 40],
];

// ============================================================================
// TIER C SHAPE TUPLES: [name, label, icon, w, h]
// ============================================================================

const TIER_C_SHAPES: UiGenericTuple[] = [
    // Data
    ["spinemap",          "Spine Map",              "\u2734", 500, 350],
    ["graphcanvas",       "Graph Canvas",           "\u2609", 500, 400],
    // Content
    ["markdownrenderer",  "Markdown Renderer",      "\u2193", 400, 300],
    ["helpdrawer",        "Help Drawer",            "?",      320, 400],
    ["helptooltip",       "Help Tooltip",           "?",      24,  24],
    // Feedback
    ["progressmodal",     "Progress Modal",         "\u231B", 400, 200],
    // Navigation
    ["ribbonbuilder",     "Ribbon Builder",         "\u2692", 600, 400],
    // Social
    ["commentoverlay",    "Comment Overlay",        "\u2026", 400, 300],
    ["personchip",        "Person Chip",            "\u263A", 180, 32],
    ["presenceindicator", "Presence Indicator",     "\u25CF", 120, 32],
    ["pill",              "Pill",                   "\u25CF", 100, 24],
    ["typebadge",         "Type Badge",             "\u2690", 80,  24],
    ["statusbadge",       "Status Badge",           "\u25CF", 80,  24],
    ["metriccard",        "Metric Card",            "\u2261", 220, 120],
    ["chartpanel",        "Chart Panel",            "\u250C", 360, 220],
    ["relationshipmanager","Relationship Manager",  "\u2637", 500, 350],
    // Layout
    ["docklayout",        "Dock Layout",            "\u2610", 600, 400],
    ["splitlayout",       "Split Layout",           "\u2502", 600, 400],
    ["layerlayout",       "Layer Layout",           "\u25A3", 600, 400],
    ["cardlayout",        "Card Layout",            "\u25A1", 400, 300],
    ["boxlayout",         "Box Layout",             "\u25A1", 400, 200],
    ["flowlayout",        "Flow Layout",            "\u21C0", 500, 300],
    ["gridlayout",        "Grid Layout",            "\u2637", 500, 400],
    ["anchorlayout",      "Anchor Layout",          "\u2693", 600, 400],
    ["borderlayout",      "Border Layout",          "\u25A3", 600, 400],
    ["flexgridlayout",    "Flex Grid Layout",       "\u2637", 600, 400],
    // Other
    ["actionitems",       "Action Items",           "\u2611", 400, 300],
    ["commandpalette",    "Command Palette",        "\u2328", 500, 350],
    ["facetsearch",       "Facet Search",           "\u2295", 350, 34],
    ["guidedtour",        "Guided Tour",            "\u2690", 300, 200],
    ["themetoggle",       "Theme Toggle",           "\u25D0", 100, 32],
    ["skeletonloader",    "Skeleton Loader",        "\u2591", 300, 100],
    ["bannerbar",         "Banner Bar",             "\u2691", 600, 48],
    ["graphtoolbar",      "Graph Toolbar",          "\u2692", 500, 40],
    ["graphlegend",       "Graph Legend",           "\u2261", 240, 300],
    ["graphminimap",      "Graph Minimap",          "\u25A3", 200, 150],
    ["contextmenu",       "Context Menu",           "\u2630", 220, 200],
    ["inlinetoolbar",     "Inline Toolbar",         "\u2261", 300, 32],
    ["stacklayout",       "Stack Layout",           "\u2B13", 300, 400],
    ["visualtableeditor", "Visual Table Editor",    "\u2637", 400, 250],
];

// ============================================================================
// BOOTSTRAP 5 BASE COMPONENT STENCILS
// ============================================================================

/** Bootstrap component category name. */
const BS_CATEGORY = "bootstrap";

/** Render a Bootstrap Card stencil. */
function renderBsCard(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    uiRect(g, b.x, b.y, b.width, b.height, C_BG, C_BORDER, 4);
    uiRect(g, b.x, b.y, b.width, 36, C_HEADER_BG, C_BORDER);
    uiText(g, b.x + 12, b.y + 23, "Card Title", { weight: 600 });
    uiDivider(g, b.x, b.y + 36, b.width);
    uiText(g, b.x + 12, b.y + 56, "Card body content goes here.", { size: 10, fill: C_TEXT_MUT });
    uiText(g, b.x + 12, b.y + 72, "Additional text and details.", { size: 10, fill: C_TEXT_MUT });

    return g;
}

/** Render a Bootstrap Button stencil. */
function renderBsButton(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    uiRect(g, b.x, b.y, b.width, b.height, C_PRIMARY, C_PRIMARY, 4);
    uiText(g, b.x + b.width / 2, b.y + b.height / 2 + 4, "Button", { fill: "#ffffff", anchor: "middle", weight: 600 });

    return g;
}

/** Render a Bootstrap Accordion stencil. */
function renderBsAccordion(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    const itemH = 36;

    uiRect(g, b.x, b.y, b.width, b.height, C_BG, C_BORDER, 4);

    for (let i = 0; i < 3; i++)
    {
        const y = b.y + i * itemH;
        const expanded = i === 0;

        uiRect(g, b.x, y, b.width, itemH, expanded ? "#e7f1ff" : C_HEADER_BG, C_BORDER);
        uiText(g, b.x + 12, y + 23, `Accordion Item #${i + 1}`, { weight: 600, fill: expanded ? C_PRIMARY : C_TEXT });
        uiText(g, b.x + b.width - 20, y + 23, expanded ? "\u25B2" : "\u25BC", { size: 10, fill: C_TEXT_SEC });
    }

    uiText(g, b.x + 16, b.y + itemH + 16, "Expanded content area with details.", { size: 10, fill: C_TEXT_MUT });

    return g;
}

/** Render a Bootstrap Modal stencil. */
function renderBsModal(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    uiRect(g, b.x + 2, b.y + 2, b.width, b.height, "rgba(0,0,0,0.1)", "none", 6);
    uiRect(g, b.x, b.y, b.width, b.height, C_BG, C_BORDER, 6);
    uiRect(g, b.x, b.y, b.width, 40, C_HEADER_BG, C_BORDER);
    uiText(g, b.x + 16, b.y + 26, "Modal Title", { weight: 600 });
    uiCloseX(g, b.x + b.width - 24, b.y + 14);
    uiDivider(g, b.x, b.y + 40, b.width);
    uiText(g, b.x + 16, b.y + 65, "Modal body content.", { size: 10, fill: C_TEXT_MUT });
    uiDivider(g, b.x, b.y + b.height - 50, b.width);
    uiButton(g, b.x + b.width - 150, b.y + b.height - 38, 60, 26, "Close");
    uiButton(g, b.x + b.width - 80, b.y + b.height - 38, 60, 26, "Save", { fill: C_PRIMARY, textFill: "#ffffff" });

    return g;
}

/** Render a Bootstrap Nav/Tabs stencil. */
function renderBsNav(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    uiRect(g, b.x, b.y, b.width, b.height, C_BG, C_BORDER);

    const tabs = ["Home", "Profile", "Contact"];
    let tx = b.x + 4;

    for (let i = 0; i < tabs.length; i++)
    {
        const active = i === 0;
        const tw = 60;

        uiRect(g, tx, b.y + 4, tw, b.height - 8, active ? C_BG : "none", active ? C_PRIMARY : "none", 3);
        uiText(g, tx + tw / 2, b.y + b.height / 2 + 4, tabs[i], { anchor: "middle", fill: active ? C_PRIMARY : C_TEXT_SEC, size: 10 });
        tx += tw + 4;
    }

    return g;
}

/** Render a Bootstrap Alert stencil. */
function renderBsAlert(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    uiRect(g, b.x, b.y, b.width, b.height, "#cfe2ff", "#084298", 4);
    uiText(g, b.x + 12, b.y + 18, "\u24D8", { fill: "#084298", size: 14 });
    uiText(g, b.x + 32, b.y + 18, "Alert message — important information here.", { size: 10, fill: "#084298" });

    return g;
}

/** Render a Bootstrap Badge stencil. */
function renderBsBadge(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    uiRect(g, b.x, b.y, b.width, b.height, C_PRIMARY, C_PRIMARY, 10);
    uiText(g, b.x + b.width / 2, b.y + b.height / 2 + 4, "Badge", { fill: "#ffffff", anchor: "middle", size: 10, weight: 600 });

    return g;
}

/** Render a Bootstrap List Group stencil. */
function renderBsListGroup(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    const items = ["List item one", "List item two", "List item three", "List item four"];
    const itemH = Math.min(32, b.height / items.length);

    uiRect(g, b.x, b.y, b.width, b.height, C_BG, C_BORDER, 4);

    for (let i = 0; i < items.length; i++)
    {
        const iy = b.y + i * itemH;
        const active = i === 0;

        if (active) { uiRect(g, b.x, iy, b.width, itemH, C_PRIMARY, "none"); }
        if (i > 0) { uiDivider(g, b.x, iy, b.width); }
        uiText(g, b.x + 12, iy + itemH / 2 + 4, items[i], { size: 10, fill: active ? "#ffffff" : C_TEXT });
    }

    return g;
}

/** Render a Bootstrap Table stencil. */
function renderBsTable(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    const cols = ["#", "First", "Last", "Handle"];
    const colW = b.width / cols.length;
    const rowH = 28;

    uiRect(g, b.x, b.y, b.width, b.height, C_BG, C_BORDER);

    for (let c = 0; c < cols.length; c++)
    {
        uiText(g, b.x + c * colW + 8, b.y + 18, cols[c], { weight: 600, size: 10 });
    }

    uiDivider(g, b.x, b.y + rowH, b.width);

    for (let r = 1; r <= 3; r++)
    {
        const ry = b.y + r * rowH;

        if (r % 2 === 0) { uiRect(g, b.x, ry, b.width, rowH, C_HEADER_BG, "none"); }
        uiText(g, b.x + 8, ry + 18, String(r), { size: 10, fill: C_TEXT_MUT });
        uiText(g, b.x + colW + 8, ry + 18, r === 1 ? "Mark" : r === 2 ? "Jacob" : "Larry", { size: 10 });
        uiText(g, b.x + colW * 2 + 8, ry + 18, r === 1 ? "Otto" : r === 2 ? "Lee" : "Bird", { size: 10 });
        uiText(g, b.x + colW * 3 + 8, ry + 18, "@mdo", { size: 10, fill: C_TEXT_MUT });
    }

    return g;
}

/** Render a Bootstrap Form stencil. */
function renderBsForm(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    uiRect(g, b.x, b.y, b.width, b.height, C_BG, C_BORDER, 4);
    uiText(g, b.x + 12, b.y + 20, "Email address", { size: 10, weight: 600 });
    uiRect(g, b.x + 12, b.y + 26, b.width - 24, 28, C_HEADER_BG, C_BORDER, 3);
    uiText(g, b.x + 20, b.y + 44, "name@example.com", { size: 10, fill: C_TEXT_MUT });
    uiText(g, b.x + 12, b.y + 72, "Password", { size: 10, weight: 600 });
    uiRect(g, b.x + 12, b.y + 78, b.width - 24, 28, C_HEADER_BG, C_BORDER, 3);
    uiText(g, b.x + 20, b.y + 96, "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", { size: 10, fill: C_TEXT_MUT });
    uiButton(g, b.x + 12, b.y + 118, 80, 28, "Submit", { fill: C_PRIMARY, textFill: "#ffffff" });

    return g;
}

/** Render a Bootstrap Pagination stencil. */
function renderBsPagination(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    const items = ["\u2039", "1", "2", "3", "4", "\u203A"];
    const iw = 32;
    const sx = b.x + (b.width - items.length * iw) / 2;

    for (let i = 0; i < items.length; i++)
    {
        const active = items[i] === "2";

        uiRect(g, sx + i * iw, b.y, iw, b.height, active ? C_PRIMARY : C_BG, C_BORDER);
        uiText(g, sx + i * iw + iw / 2, b.y + b.height / 2 + 4, items[i], { anchor: "middle", size: 11, fill: active ? "#ffffff" : C_TEXT });
    }

    return g;
}

/** Render a Bootstrap Dropdown stencil. */
function renderBsDropdown(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    uiRect(g, b.x, b.y, 100, 30, C_PRIMARY, C_PRIMARY, 4);
    uiText(g, b.x + 40, b.y + 20, "Dropdown \u25BE", { fill: "#ffffff", anchor: "middle", size: 10, weight: 600 });

    uiRect(g, b.x, b.y + 34, 160, b.height - 34, C_BG, C_BORDER, 4);
    const menuItems = ["Action", "Another action", "Something else"];

    for (let i = 0; i < menuItems.length; i++)
    {
        const iy = b.y + 34 + 4 + i * 28;

        if (i === 0) { uiRect(g, b.x + 4, iy, 152, 24, C_PRIMARY, "none", 3); }
        uiText(g, b.x + 16, iy + 16, menuItems[i], { size: 10, fill: i === 0 ? "#ffffff" : C_TEXT });
    }

    return g;
}

/** Render a Bootstrap Progress stencil. */
function renderBsProgress(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    const pct = 0.65;

    uiRect(g, b.x, b.y + b.height / 2 - 10, b.width, 20, C_HEADER_BG, "none", 10);
    uiRect(g, b.x, b.y + b.height / 2 - 10, b.width * pct, 20, C_PRIMARY, "none", 10);
    uiText(g, b.x + b.width * pct / 2, b.y + b.height / 2 + 4, "65%", { fill: "#ffffff", anchor: "middle", size: 10, weight: 600 });

    return g;
}

/** Render a Bootstrap Spinner stencil. */
function renderBsSpinner(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    const r = Math.min(b.width, b.height) / 2 - 4;

    uiCircle(g, cx, cy, r, "none", C_PRIMARY, 3);
    uiText(g, cx, cy + r + 16, "Loading...", { anchor: "middle", size: 10, fill: C_TEXT_SEC });

    return g;
}

/** Render a Bootstrap Checkbox/Toggle stencil. */
function renderBsToggle(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    const trackW = 40;
    const trackH = 20;
    const tx = b.x + (b.width - trackW) / 2;
    const ty = b.y + (b.height - trackH) / 2;

    uiRect(g, tx, ty, trackW, trackH, C_PRIMARY, "none", 10);
    uiCircle(g, tx + trackW - 10, ty + 10, 8, "#ffffff", "none");

    return g;
}

// ============================================================================
// HTML PRIMITIVE SVG RENDER FUNCTIONS
// ============================================================================

/** Render an HTML Heading stencil. */
function renderHtmlHeading(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    uiRect(g, b.x, b.y, b.width, b.height, C_BG, C_BORDER);
    uiText(g, b.x + 8, b.y + b.height / 2 + 6, "Heading", {
        size: 16, weight: 700
    });

    return g;
}

/** Render an HTML Text (paragraph) stencil. */
function renderHtmlText(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    uiRect(g, b.x, b.y, b.width, b.height, C_BG, C_BORDER);
    uiText(g, b.x + 8, b.y + 16, "Paragraph text goes here and", {
        size: 10, fill: C_TEXT_SEC
    });
    uiText(g, b.x + 8, b.y + 30, "wraps to a second line.", {
        size: 10, fill: C_TEXT_SEC
    });
    uiText(g, b.x + 8, b.y + 44, "A third line of content.", {
        size: 10, fill: C_TEXT_MUT
    });

    return g;
}

/** Render an HTML Bold Text stencil. */
function renderHtmlBold(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    uiText(g, b.x + b.width / 2, b.y + b.height / 2 + 4,
        "Bold text", { weight: 700, anchor: "middle" });

    return g;
}

/** Render an HTML Small Text stencil. */
function renderHtmlSmall(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    uiText(g, b.x + b.width / 2, b.y + b.height / 2 + 3,
        "Small muted text", { size: 9, fill: C_TEXT_MUT, anchor: "middle" });

    return g;
}

/** Render an HTML Icon stencil. */
function renderHtmlIcon(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;

    uiIcon(g, cx - 4, cy + 5, "\u2605", { size: 18, fill: C_TEXT });

    return g;
}

/** Render an HTML Panel stencil. */
function renderHtmlPanel(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    uiRect(g, b.x, b.y, b.width, b.height, C_HEADER_BG, C_BORDER);
    g.appendChild(svgCreate("rect", {
        x: String(b.x + 4), y: String(b.y + 4),
        width: String(b.width - 8), height: String(b.height - 8),
        fill: "none", stroke: C_TEXT_MUT,
        "stroke-width": "1", "stroke-dasharray": "4 2"
    }));

    return g;
}

/** Render an HTML Divider stencil. */
function renderHtmlDivider(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    const cy = b.y + b.height / 2;

    uiLine(g, b.x, cy, b.x + b.width, cy, C_BORDER, 1);

    return g;
}

/** Render an HTML Link stencil. */
function renderHtmlLink(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    uiText(g, b.x + b.width / 2, b.y + b.height / 2 + 4,
        "Click here", { fill: C_PRIMARY, anchor: "middle" });
    uiLine(g, b.x + 20, b.y + b.height / 2 + 6,
        b.x + b.width - 20, b.y + b.height / 2 + 6, C_PRIMARY);

    return g;
}

/** Render an HTML Badge stencil. */
function renderHtmlBadge(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    uiRect(g, b.x, b.y, b.width, b.height, C_PRIMARY, C_PRIMARY, 10);
    uiText(g, b.x + b.width / 2, b.y + b.height / 2 + 4, "New", {
        fill: "#ffffff", anchor: "middle", size: 10, weight: 600
    });

    return g;
}

/** Render an HTML Image placeholder stencil. */
function renderHtmlImage(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;

    uiRect(g, b.x, b.y, b.width, b.height, "#e9ecef", C_BORDER);
    uiIcon(g, cx - 6, cy + 2, "\u2606", { size: 24, fill: C_TEXT_SEC });
    uiText(g, cx, cy + 20, "3:2", {
        size: 9, fill: C_TEXT_MUT, anchor: "middle"
    });

    return g;
}

/** Render an HTML List stencil. */
function renderHtmlList(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;
    const items = ["First item", "Second item", "Third item"];

    for (let i = 0; i < items.length; i++)
    {
        const y = b.y + 20 + i * 24;
        uiCircle(g, b.x + 12, y - 3, 3, C_TEXT_SEC, "none");
        uiText(g, b.x + 24, y, items[i], { size: 10 });
    }

    return g;
}

/** Render an HTML Blockquote stencil. */
function renderHtmlBlockquote(ctx: ShapeRenderContext): SVGElement
{
    const g = svgCreate("g");
    const b = ctx.bounds;

    uiRect(g, b.x, b.y, 4, b.height, C_PRIMARY, "none");
    uiText(g, b.x + 16, b.y + 24, "\u201CThe quick brown fox jumps", {
        size: 10, fill: C_TEXT
    });
    uiText(g, b.x + 16, b.y + 38, "over the lazy dog.\u201D", {
        size: 10, fill: C_TEXT
    });
    uiText(g, b.x + 16, b.y + 58, "\u2014 Anonymous", {
        size: 9, fill: C_TEXT_MUT
    });

    return g;
}

/** Bootstrap 5 component shapes. */
type BsShapeTuple = [string, string, string, number, number,
    (ctx: ShapeRenderContext) => SVGElement];

const BS_SHAPES: BsShapeTuple[] = [
    ["bs-card",       "Card",        "bi-card-heading",     300, 160, renderBsCard],
    ["bs-button",     "Button",      "bi-hand-index",       120, 36,  renderBsButton],
    ["bs-accordion",  "Accordion",   "bi-list-nested",      400, 200, renderBsAccordion],
    ["bs-modal",      "Modal",       "bi-window-stack",     400, 250, renderBsModal],
    ["bs-nav",        "Nav / Tabs",  "bi-ui-checks",        300, 40,  renderBsNav],
    ["bs-alert",      "Alert",       "bi-exclamation-triangle", 400, 40,  renderBsAlert],
    ["bs-badge",      "Badge",       "bi-bookmark-fill",    60,  24,  renderBsBadge],
    ["bs-list-group", "List Group",  "bi-list-ul",          250, 130, renderBsListGroup],
    ["bs-table",      "Table",       "bi-table",            400, 120, renderBsTable],
    ["bs-form",       "Form",        "bi-input-cursor-text", 300, 160, renderBsForm],
    ["bs-pagination", "Pagination",  "bi-three-dots",       200, 32,  renderBsPagination],
    ["bs-dropdown",   "Dropdown",    "bi-menu-button-wide", 160, 130, renderBsDropdown],
    ["bs-progress",   "Progress",    "bi-bar-chart-fill",   300, 30,  renderBsProgress],
    ["bs-spinner",    "Spinner",     "bi-arrow-clockwise",  60,  80,  renderBsSpinner],
    ["bs-toggle",     "Toggle",      "bi-toggle-on",        60,  40,  renderBsToggle],
];

/** Total count for logging. */
const BS_SHAPE_COUNT = BS_SHAPES.length;

/** HTML primitive shapes. */
type HtmlShapeTuple = [string, string, string, number, number,
    (ctx: ShapeRenderContext) => SVGElement];

const HTML_SHAPES: HtmlShapeTuple[] = [
    ["html-heading",    "Heading",    "bi-type-h1",     300, 40,  renderHtmlHeading],
    ["html-text",       "Text",       "bi-fonts",       300, 60,  renderHtmlText],
    ["html-bold",       "Bold Text",  "bi-type-bold",   200, 24,  renderHtmlBold],
    ["html-small",      "Small Text", "bi-type",        200, 20,  renderHtmlSmall],
    ["html-icon",       "Icon",       "bi-star",        32,  32,  renderHtmlIcon],
    ["html-panel",      "Panel",      "bi-square",      300, 200, renderHtmlPanel],
    ["html-divider",    "Divider",    "bi-dash-lg",     300, 8,   renderHtmlDivider],
    ["html-link",       "Link",       "bi-link-45deg",  120, 24,  renderHtmlLink],
    ["html-badge",      "Badge",      "bi-bookmark",    60,  22,  renderHtmlBadge],
    ["html-image",      "Image",      "bi-image",       300, 200, renderHtmlImage],
    ["html-list",       "List",       "bi-list-ul",     250, 120, renderHtmlList],
    ["html-blockquote", "Blockquote", "bi-quote",       350, 80,  renderHtmlBlockquote],
];

/** Total HTML shape count for logging. */
const HTML_SHAPE_COUNT = HTML_SHAPES.length;

/** Category key for HTML primitives. */
const HTML_CATEGORY = "html";

// ============================================================================
// REGISTRATION
// ============================================================================

/**
 * Registers all UI component stencil shapes with the given shape
 * registry. Includes enterprise theme components (Tier A/B/C) and
 * Bootstrap 5 base components.
 *
 * @param registry - The ShapeRegistry instance to populate.
 */
export function registerUiComponentStencils(registry: ShapeRegistry): void
{
    // --- Tier A: custom render functions ---
    for (const [name, label, icon, w, h, renderFn] of TIER_A_SHAPES)
    {
        registry.register(buildCustomUiShape(name, label, icon, w, h, renderFn));
    }

    // --- Tier B: enhanced generic with custom content ---
    for (const [name, label, icon, w, h] of TIER_B_SHAPES)
    {
        const contentFn = getTierBContent(name);
        registry.register(buildGenericUiShape(name, label, icon, w, h, contentFn));
    }

    // --- Tier C: improved basic with custom content ---
    for (const [name, label, icon, w, h] of TIER_C_SHAPES)
    {
        const contentFn = getTierCContent(name);
        registry.register(buildGenericUiShape(name, label, icon, w, h, contentFn));
    }

    // --- Bootstrap 5 base components ---
    for (const [name, label, icon, w, h, renderFn] of BS_SHAPES)
    {
        registry.register(buildCustomUiShape(
            name, label, icon, w, h, renderFn, BS_CATEGORY
        ));
    }

    // --- HTML primitives ---
    for (const [name, label, icon, w, h, renderFn] of HTML_SHAPES)
    {
        registry.register(buildCustomUiShape(
            name, label, icon, w, h, renderFn, HTML_CATEGORY
        ));
    }

    const total = TIER_A_SHAPES.length + TIER_B_SHAPES.length
        + TIER_C_SHAPES.length + BS_SHAPE_COUNT + HTML_SHAPE_COUNT;

    logUiInfo(`Registered ${total} ui-component stencil shapes ` +
        `(${TIER_A_SHAPES.length} Tier A, ${TIER_B_SHAPES.length} Tier B, ` +
        `${TIER_C_SHAPES.length} Tier C, ${BS_SHAPE_COUNT} Bootstrap, ` +
        `${HTML_SHAPE_COUNT} HTML)`
    );
}
