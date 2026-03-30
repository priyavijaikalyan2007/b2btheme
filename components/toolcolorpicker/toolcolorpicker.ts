/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: ToolColorPicker
 * 📜 PURPOSE: A visual colour picker that displays colours as tool icons
 *    (pens, markers, pencils, highlighters, brushes). The tool shape is
 *    configurable and each colour renders as the tool icon filled with
 *    that colour.
 * 🔗 RELATES: [[EnterpriseTheme]], [[CustomComponents]], [[AnglePicker]],
 *    [[ColorPicker]], [[DiagramEngine]]
 * ⚡ FLOW: [Consumer] -> [createToolColorPicker()] -> [SVG tool icons grid/row]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// S1: INTERFACES
// ============================================================================

/** A single colour entry with hex value, label, and optional alpha. */
export interface ToolColor
{
    hex: string;
    label: string;
    alpha?: number;
}

/** Tool shape type — determines the SVG icon shape. */
export type ToolType = "pen" | "marker" | "pencil" | "highlighter" | "brush";

/** Configuration options for ToolColorPicker. */
export interface ToolColorPickerOptions
{
    /** Container element or element ID. */
    container: HTMLElement | string;

    /** Tool type determines the icon shape. Default: "pen". */
    tool?: ToolType;

    /** Available colours. Defaults to the built-in pack for the tool type. */
    colors?: ToolColor[];

    /** Currently selected colour hex. Default: first colour. */
    value?: string;

    /** Callback when a colour is selected. */
    onChange?: (color: ToolColor) => void;

    /** Layout mode. Default: "row". */
    layout?: "row" | "grid";

    /** Grid columns when layout is "grid". Default: 6. */
    gridColumns?: number;

    /** Show colour name tooltip on hover. Default: true. */
    showTooltips?: boolean;
}

/** Public API for the ToolColorPicker instance. */
export interface ToolColorPickerAPI
{
    getValue(): ToolColor;
    setValue(hex: string): void;
    setColors(colors: ToolColor[]): void;
    setTool(tool: ToolType): void;
    destroy(): void;
    getElement(): HTMLElement | null;
}

// ============================================================================
// S2: CONSTANTS
// ============================================================================

const LOG_PREFIX = "[ToolColorPicker]";
const _lu = (typeof (window as any).createLogUtility === "function") ? (window as any).createLogUtility().getLogger(LOG_PREFIX.slice(1, -1)) : null;
function logInfo(...a: unknown[]): void { _lu ? _lu.info(...a) : console.log(new Date().toISOString(), "[INFO]", LOG_PREFIX, ...a); }
function logWarn(...a: unknown[]): void { _lu ? _lu.warn(...a) : console.warn(new Date().toISOString(), "[WARN]", LOG_PREFIX, ...a); }
function logError(...a: unknown[]): void { _lu ? _lu.error(...a) : console.error(new Date().toISOString(), "[ERROR]", LOG_PREFIX, ...a); }
function logDebug(...a: unknown[]): void { _lu ? _lu.debug(...a) : console.debug(new Date().toISOString(), "[DEBUG]", LOG_PREFIX, ...a); }
function logTrace(...a: unknown[]): void { _lu ? _lu.trace(...a) : console.debug(new Date().toISOString(), "[TRACE]", LOG_PREFIX, ...a); }

const CLS = "toolcolorpicker";
const SVG_NS = "http://www.w3.org/2000/svg";
const ICON_W = 24;
const ICON_H = 36;
let instanceCounter = 0;

// ============================================================================
// S3: BUILT-IN COLOR PACKS
// ============================================================================

/** Solid pen colours — opaque, vivid. */
export const PEN_COLORS: ToolColor[] =
[
    { hex: "#000000", label: "Black" },
    { hex: "#dc3545", label: "Red" },
    { hex: "#0d6efd", label: "Blue" },
    { hex: "#198754", label: "Green" },
    { hex: "#6f42c1", label: "Purple" },
    { hex: "#fd7e14", label: "Orange" },
    { hex: "#495057", label: "Dark Gray" },
];

/** Marker colours — semi-transparent, saturated. */
export const MARKER_COLORS: ToolColor[] =
[
    { hex: "#dc3545", label: "Red", alpha: 0.6 },
    { hex: "#0d6efd", label: "Blue", alpha: 0.6 },
    { hex: "#198754", label: "Green", alpha: 0.6 },
    { hex: "#6f42c1", label: "Purple", alpha: 0.6 },
    { hex: "#ffc107", label: "Yellow", alpha: 0.6 },
    { hex: "#fd7e14", label: "Orange", alpha: 0.6 },
];

/** Highlighter colours — very transparent, bright. */
export const HIGHLIGHTER_COLORS: ToolColor[] =
[
    { hex: "#ffc107", label: "Yellow", alpha: 0.4 },
    { hex: "#20c997", label: "Teal", alpha: 0.4 },
    { hex: "#e83e8c", label: "Pink", alpha: 0.4 },
    { hex: "#0dcaf0", label: "Cyan", alpha: 0.4 },
    { hex: "#6f42c1", label: "Purple", alpha: 0.4 },
    { hex: "#fd7e14", label: "Orange", alpha: 0.4 },
];

/** Pencil colours — muted, textured feel. */
export const PENCIL_COLORS: ToolColor[] =
[
    { hex: "#495057", label: "Graphite" },
    { hex: "#212529", label: "Dark" },
    { hex: "#6c757d", label: "Medium" },
    { hex: "#adb5bd", label: "Light" },
    { hex: "#3d5a80", label: "Steel Blue" },
    { hex: "#8b4513", label: "Sienna" },
];

/** Brush colours — full palette, opaque. */
export const BRUSH_COLORS: ToolColor[] =
[
    { hex: "#000000", label: "Black" },
    { hex: "#dc3545", label: "Red" },
    { hex: "#0d6efd", label: "Blue" },
    { hex: "#198754", label: "Green" },
    { hex: "#ffc107", label: "Yellow" },
    { hex: "#6f42c1", label: "Purple" },
    { hex: "#fd7e14", label: "Orange" },
    { hex: "#e83e8c", label: "Pink" },
];

/** Map tool type to its default colour pack. */
const DEFAULT_COLORS: Record<ToolType, ToolColor[]> =
{
    pen: PEN_COLORS,
    marker: MARKER_COLORS,
    pencil: PENCIL_COLORS,
    highlighter: HIGHLIGHTER_COLORS,
    brush: BRUSH_COLORS,
};

// ============================================================================
// S4: DOM HELPERS
// ============================================================================

function createElement(
    tag: string, classes: string[], text?: string
): HTMLElement
{
    const el = document.createElement(tag);
    if (classes.length > 0) { el.classList.add(...classes); }
    if (text) { el.textContent = text; }
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

function safeCallback<T extends unknown[]>(
    fn: ((...a: T) => void) | undefined, ...args: T
): void
{
    if (!fn) { return; }
    try { fn(...args); }
    catch (err) { logError("callback error:", err); }
}

/** Resolve a container reference to an HTMLElement. */
function resolveContainer(ref: HTMLElement | string): HTMLElement | null
{
    if (typeof ref === "string")
    {
        return document.getElementById(ref);
    }
    return ref;
}

/** Convert hex + optional alpha to an rgba string. */
function hexToRgba(hex: string, alpha?: number): string
{
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const a = alpha ?? 1;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
}

// ============================================================================
// S5: SVG TOOL ICON BUILDERS
// ============================================================================

/**
 * Build a pen SVG icon — thin triangular nib, cylindrical body.
 * Colour fills the body. Nib has the same colour as a metallic tip.
 */
function buildPenSvg(fillColor: string): SVGElement
{
    const svg = createSvgElement("svg", {
        "width": String(ICON_W), "height": String(ICON_H),
        "viewBox": "0 0 24 36", "class": `${CLS}-icon`,
    });

    // Pen body — rectangular with slight taper
    const body = createSvgElement("path", {
        "d": "M8,4 L16,4 L16,24 L8,24 Z",
        "fill": fillColor,
        "stroke": "var(--theme-border-color, #adb5bd)",
        "stroke-width": "0.5",
    });

    // Pen nib — triangular point
    const nib = createSvgElement("path", {
        "d": "M8,24 L16,24 L12,34 Z",
        "fill": fillColor,
        "stroke": "var(--theme-border-color, #adb5bd)",
        "stroke-width": "0.5",
    });

    // Pen clip — small rectangle on top
    const clip = createSvgElement("rect", {
        "x": "10", "y": "1", "width": "4", "height": "4",
        "rx": "0.5",
        "fill": "var(--theme-text-muted, #6c757d)",
    });

    svg.appendChild(body);
    svg.appendChild(nib);
    svg.appendChild(clip);
    return svg;
}

/**
 * Build a marker SVG icon — thick chisel-tip, rectangular body.
 * Colour fills the body with the given alpha.
 */
function buildMarkerSvg(fillColor: string): SVGElement
{
    const svg = createSvgElement("svg", {
        "width": String(ICON_W), "height": String(ICON_H),
        "viewBox": "0 0 24 36", "class": `${CLS}-icon`,
    });

    // Marker body — wide rectangle
    const body = createSvgElement("path", {
        "d": "M5,3 L19,3 Q20,3 20,4 L20,22 L4,22 L4,4 Q4,3 5,3 Z",
        "fill": fillColor,
        "stroke": "var(--theme-border-color, #adb5bd)",
        "stroke-width": "0.5",
    });

    // Chisel tip — wide flat angle
    const tip = createSvgElement("path", {
        "d": "M4,22 L20,22 L17,32 L7,32 Z",
        "fill": fillColor,
        "stroke": "var(--theme-border-color, #adb5bd)",
        "stroke-width": "0.5",
    });

    // Cap ridge line
    const ridge = createSvgElement("line", {
        "x1": "4", "y1": "7", "x2": "20", "y2": "7",
        "stroke": "var(--theme-border-color, #adb5bd)",
        "stroke-width": "0.5",
    });

    svg.appendChild(body);
    svg.appendChild(tip);
    svg.appendChild(ridge);
    return svg;
}

/**
 * Build a pencil SVG icon — hexagonal pencil with eraser top,
 * sharpened point at bottom. Colour fills the body section.
 */
function buildPencilSvg(fillColor: string): SVGElement
{
    const svg = createSvgElement("svg", {
        "width": String(ICON_W), "height": String(ICON_H),
        "viewBox": "0 0 24 36", "class": `${CLS}-icon`,
    });

    // Eraser — pink rounded top
    const eraser = createSvgElement("rect", {
        "x": "8", "y": "1", "width": "8", "height": "5",
        "rx": "1",
        "fill": "#e8a0b4",
        "stroke": "var(--theme-border-color, #adb5bd)",
        "stroke-width": "0.5",
    });

    // Metal ferrule — band between eraser and body
    const ferrule = createSvgElement("rect", {
        "x": "7", "y": "6", "width": "10", "height": "3",
        "fill": "var(--theme-text-muted, #adb5bd)",
        "stroke": "var(--theme-border-color, #adb5bd)",
        "stroke-width": "0.3",
    });

    // Pencil body — hexagonal sides approximated
    const body = createSvgElement("path", {
        "d": "M7,9 L17,9 L17,26 L7,26 Z",
        "fill": fillColor,
        "stroke": "var(--theme-border-color, #adb5bd)",
        "stroke-width": "0.5",
    });

    // Sharpened point — exposed wood + graphite tip
    const wood = createSvgElement("path", {
        "d": "M7,26 L17,26 L12,34 Z",
        "fill": "#d4a574",
        "stroke": "var(--theme-border-color, #adb5bd)",
        "stroke-width": "0.5",
    });

    // Graphite tip
    const tip = createSvgElement("path", {
        "d": "M10,30 L14,30 L12,34 Z",
        "fill": "#495057",
    });

    svg.appendChild(eraser);
    svg.appendChild(ferrule);
    svg.appendChild(body);
    svg.appendChild(wood);
    svg.appendChild(tip);
    return svg;
}

/**
 * Build a highlighter SVG icon — wide flat tip, thick body.
 * Colour fills with alpha to convey translucency.
 */
function buildHighlighterSvg(fillColor: string): SVGElement
{
    const svg = createSvgElement("svg", {
        "width": String(ICON_W), "height": String(ICON_H),
        "viewBox": "0 0 24 36", "class": `${CLS}-icon`,
    });

    // Highlighter body — wide rounded rectangle
    const body = createSvgElement("path", {
        "d": "M4,3 L20,3 Q21,3 21,4 L21,20 L3,20 L3,4 Q3,3 4,3 Z",
        "fill": fillColor,
        "stroke": "var(--theme-border-color, #adb5bd)",
        "stroke-width": "0.5",
    });

    // Grip section — slightly narrower
    const grip = createSvgElement("rect", {
        "x": "5", "y": "20", "width": "14", "height": "6",
        "fill": "var(--theme-text-muted, #6c757d)",
        "stroke": "var(--theme-border-color, #adb5bd)",
        "stroke-width": "0.3",
    });

    // Wide flat tip
    const tip = createSvgElement("path", {
        "d": "M5,26 L19,26 L17,34 L7,34 Z",
        "fill": fillColor,
        "stroke": "var(--theme-border-color, #adb5bd)",
        "stroke-width": "0.5",
    });

    svg.appendChild(body);
    svg.appendChild(grip);
    svg.appendChild(tip);
    return svg;
}

/**
 * Build a brush SVG icon — round bristles at bottom, thin handle.
 * Colour fills the bristles.
 */
function buildBrushSvg(fillColor: string): SVGElement
{
    const svg = createSvgElement("svg", {
        "width": String(ICON_W), "height": String(ICON_H),
        "viewBox": "0 0 24 36", "class": `${CLS}-icon`,
    });

    // Handle — thin wooden stick
    const handle = createSvgElement("rect", {
        "x": "10", "y": "1", "width": "4", "height": "16",
        "rx": "1",
        "fill": "#d4a574",
        "stroke": "var(--theme-border-color, #adb5bd)",
        "stroke-width": "0.5",
    });

    // Ferrule — metal band
    const ferrule = createSvgElement("rect", {
        "x": "8", "y": "17", "width": "8", "height": "4",
        "fill": "var(--theme-text-muted, #adb5bd)",
        "stroke": "var(--theme-border-color, #adb5bd)",
        "stroke-width": "0.3",
    });

    // Bristles — rounded oval shape
    const bristles = createSvgElement("path", {
        "d": "M6,21 L18,21 Q20,28 16,34 Q12,36 8,34 Q4,28 6,21 Z",
        "fill": fillColor,
        "stroke": "var(--theme-border-color, #adb5bd)",
        "stroke-width": "0.5",
    });

    svg.appendChild(handle);
    svg.appendChild(ferrule);
    svg.appendChild(bristles);
    return svg;
}

/** Map tool type to its SVG builder function. */
const TOOL_SVG_BUILDERS: Record<ToolType, (fill: string) => SVGElement> =
{
    pen: buildPenSvg,
    marker: buildMarkerSvg,
    pencil: buildPencilSvg,
    highlighter: buildHighlighterSvg,
    brush: buildBrushSvg,
};

// ============================================================================
// S6: CORE COMPONENT LOGIC
// ============================================================================

/** Build a single tool colour swatch button. */
function buildSwatchButton(
    color: ToolColor, tool: ToolType, isSelected: boolean,
    showTooltip: boolean, onClick: () => void
): HTMLElement
{
    const btn = createElement("button", [`${CLS}-swatch`]);
    setAttr(btn, {
        type: "button",
        "aria-label": color.label,
        "data-hex": color.hex,
    });

    if (showTooltip)
    {
        btn.title = color.label;
    }

    if (isSelected)
    {
        btn.classList.add(`${CLS}-swatch--selected`);
    }

    const fillColor = hexToRgba(color.hex, color.alpha);
    const svgBuilder = TOOL_SVG_BUILDERS[tool];
    const icon = svgBuilder(fillColor);
    btn.appendChild(icon as unknown as Node);

    btn.addEventListener("click", onClick);
    return btn;
}

/** Build the full swatch container (grid or row). */
function buildSwatchContainer(
    colors: ToolColor[], tool: ToolType, selectedHex: string,
    layout: "row" | "grid", gridColumns: number,
    showTooltips: boolean, onSelect: (color: ToolColor) => void
): HTMLElement
{
    const wrap = createElement("div", [`${CLS}-swatches`]);
    wrap.classList.add(`${CLS}-swatches--${layout}`);

    if (layout === "grid")
    {
        wrap.style.gridTemplateColumns = `repeat(${gridColumns}, 1fr)`;
    }

    appendSwatches(wrap, colors, tool, selectedHex, showTooltips, onSelect);
    return wrap;
}

/** Append individual swatch buttons to the container. */
function appendSwatches(
    container: HTMLElement, colors: ToolColor[], tool: ToolType,
    selectedHex: string, showTooltips: boolean,
    onSelect: (color: ToolColor) => void
): void
{
    for (const color of colors)
    {
        const isSelected = (color.hex.toLowerCase() === selectedHex.toLowerCase());
        const btn = buildSwatchButton(
            color, tool, isSelected, showTooltips,
            () => onSelect(color)
        );
        container.appendChild(btn);
    }
}

// ============================================================================
// S7: FACTORY
// ============================================================================

/**
 * Create a ToolColorPicker and mount it in the given container.
 * Returns the public API object.
 */
export function createToolColorPicker(
    options: ToolColorPickerOptions
): ToolColorPickerAPI
{
    const id = `${CLS}-${++instanceCounter}`;
    const container = resolveContainer(options.container);

    if (!container)
    {
        logWarn("container not found:", options.container);
        return buildNullApi();
    }

    const state = initState(options);
    const rootEl = buildRoot(id, state);
    container.appendChild(rootEl);

    logInfo("created", id, "tool:", state.tool);

    return buildApi(id, state, rootEl, container);
}

// ============================================================================
// S8: STATE
// ============================================================================

interface PickerState
{
    tool: ToolType;
    colors: ToolColor[];
    selectedHex: string;
    layout: "row" | "grid";
    gridColumns: number;
    showTooltips: boolean;
    onChange?: (color: ToolColor) => void;
}

/** Initialise the mutable state from options. */
function initState(options: ToolColorPickerOptions): PickerState
{
    const tool = options.tool ?? "pen";
    const colors = options.colors ?? DEFAULT_COLORS[tool];
    const selectedHex = options.value ?? (colors.length > 0 ? colors[0].hex : "");

    return {
        tool,
        colors,
        selectedHex,
        layout: options.layout ?? "row",
        gridColumns: options.gridColumns ?? 6,
        showTooltips: options.showTooltips ?? true,
        onChange: options.onChange,
    };
}

// ============================================================================
// S9: ROOT BUILD
// ============================================================================

/** Build the root element containing the swatch container. */
function buildRoot(instanceId: string, state: PickerState): HTMLElement
{
    const root = createElement("div", [CLS]);
    root.id = instanceId;
    setAttr(root, { "role": "radiogroup", "aria-label": "Tool colour picker" });

    const swatches = buildSwatchContainer(
        state.colors, state.tool, state.selectedHex,
        state.layout, state.gridColumns, state.showTooltips,
        (color) => handleSelect(state, root, color)
    );
    root.appendChild(swatches);
    return root;
}

/** Handle a swatch selection. Updates state and re-renders selection. */
function handleSelect(
    state: PickerState, root: HTMLElement, color: ToolColor
): void
{
    state.selectedHex = color.hex;
    updateSelectionVisuals(root, color.hex);
    safeCallback(state.onChange, color);
}

/** Update the selected visual state on swatch buttons. */
function updateSelectionVisuals(root: HTMLElement, hex: string): void
{
    const buttons = root.querySelectorAll(`.${CLS}-swatch`);

    for (const btn of buttons)
    {
        const btnHex = btn.getAttribute("data-hex") ?? "";
        const isMatch = (btnHex.toLowerCase() === hex.toLowerCase());

        if (isMatch)
        {
            btn.classList.add(`${CLS}-swatch--selected`);
        }
        else
        {
            btn.classList.remove(`${CLS}-swatch--selected`);
        }
    }
}

/** Rebuild the inner swatch container (used after tool/color changes). */
function rebuildSwatches(
    state: PickerState, root: HTMLElement
): void
{
    const existing = root.querySelector(`.${CLS}-swatches`);
    if (existing)
    {
        root.removeChild(existing);
    }

    const swatches = buildSwatchContainer(
        state.colors, state.tool, state.selectedHex,
        state.layout, state.gridColumns, state.showTooltips,
        (color) => handleSelect(state, root, color)
    );
    root.appendChild(swatches);
}

// ============================================================================
// S10: API BUILDER
// ============================================================================

/** Build the public API object for a live picker instance. */
function buildApi(
    instanceId: string, state: PickerState,
    rootEl: HTMLElement, container: HTMLElement
): ToolColorPickerAPI
{
    let destroyed = false;

    return {
        getValue(): ToolColor
        {
            return findColorByHex(state.colors, state.selectedHex);
        },

        setValue(hex: string): void
        {
            if (destroyed) { return; }
            state.selectedHex = hex;
            updateSelectionVisuals(rootEl, hex);
        },

        setColors(colors: ToolColor[]): void
        {
            if (destroyed) { return; }
            state.colors = colors;
            if (!findExact(colors, state.selectedHex) && colors.length > 0)
            {
                state.selectedHex = colors[0].hex;
            }
            rebuildSwatches(state, rootEl);
            logInfo("colors updated:", colors.length);
        },

        setTool(tool: ToolType): void
        {
            if (destroyed) { return; }
            state.tool = tool;
            rebuildSwatches(state, rootEl);
            logInfo("tool changed to:", tool);
        },

        destroy(): void
        {
            if (destroyed) { return; }
            destroyed = true;
            if (rootEl.parentElement)
            {
                rootEl.parentElement.removeChild(rootEl);
            }
            logInfo("destroyed", instanceId);
        },

        getElement(): HTMLElement | null
        {
            return destroyed ? null : rootEl;
        },
    };
}

/** Build a no-op API for when the container is missing. */
function buildNullApi(): ToolColorPickerAPI
{
    const nullColor: ToolColor = { hex: "#000000", label: "None" };

    return {
        getValue: () => nullColor,
        setValue: () => { /* no-op */ },
        setColors: () => { /* no-op */ },
        setTool: () => { /* no-op */ },
        destroy: () => { /* no-op */ },
        getElement: () => null,
    };
}

// ============================================================================
// S11: UTILITY HELPERS
// ============================================================================

/** Find a ToolColor by hex in an array, falling back to first. */
function findColorByHex(colors: ToolColor[], hex: string): ToolColor
{
    const match = findExact(colors, hex);
    return match ?? (colors.length > 0 ? colors[0] : { hex, label: "Unknown" });
}

/** Find exact hex match in an array. */
function findExact(colors: ToolColor[], hex: string): ToolColor | undefined
{
    return colors.find(
        (c) => c.hex.toLowerCase() === hex.toLowerCase()
    );
}

// ============================================================================
// S12: STATIC COLOR PACK PROPERTIES
// ============================================================================

createToolColorPicker.PEN_COLORS = PEN_COLORS;
createToolColorPicker.MARKER_COLORS = MARKER_COLORS;
createToolColorPicker.HIGHLIGHTER_COLORS = HIGHLIGHTER_COLORS;
createToolColorPicker.PENCIL_COLORS = PENCIL_COLORS;
createToolColorPicker.BRUSH_COLORS = BRUSH_COLORS;

// ============================================================================
// S13: WINDOW GLOBAL
// ============================================================================

(window as unknown as Record<string, unknown>)["createToolColorPicker"] = createToolColorPicker;
