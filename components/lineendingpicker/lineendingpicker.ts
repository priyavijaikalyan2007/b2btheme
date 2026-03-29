/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: LineEndingPicker
 * 📜 PURPOSE: A dropdown picker that displays line ending (arrowhead / marker)
 *    styles with inline SVG previews, letting users select marker shapes for
 *    the start or end of lines in graph/drawing tools.  Aligned with maxGraph
 *    native arrow types for direct interop with GraphCanvasMx.
 * 🔗 RELATES: [[EnterpriseTheme]], [[CustomComponents]], [[LineTypePicker]],
 *    [[LineWidthPicker]], [[GraphCanvas]], [[GraphCanvasMx]]
 * ⚡ FLOW: [Consumer App] -> [createLineEndingPicker()] -> [DOM trigger + dropdown]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// S1: INTERFACES
// ============================================================================

/** A single line-ending entry in the dropdown. */
export interface LineEndingItem
{
    /** Display name (e.g. "Classic"). */
    label: string;
    /** Marker identifier aligned with maxGraph arrow types. */
    value: string;
}

/** Configuration options for LineEndingPicker. */
export interface LineEndingPickerOptions
{
    /** Custom endings list; defaults to 12 standard markers if omitted. */
    endings?: LineEndingItem[];
    /** Initially selected ending value. */
    value?: string;
    /** Which end of the line receives the marker. Default: "end". */
    mode?: "start" | "end";
    /** Preview stroke width in pixels. Default: 2. */
    previewStrokeWidth?: number;
    /** Size variant. */
    size?: "mini" | "sm" | "default" | "lg";
    /** Disable the picker. */
    disabled?: boolean;
    /** Max visible items before scrolling. Default: 8. */
    maxVisibleItems?: number;
    /** Append ER notation endings when no custom endings are provided. */
    showERNotation?: boolean;
    /** Fires when the selected ending changes. */
    onChange?: (ending: LineEndingItem) => void;
    /** Fires when the dropdown opens. */
    onOpen?: () => void;
    /** Fires when the dropdown closes. */
    onClose?: () => void;
}

// ============================================================================
// S2: CONSTANTS
// ============================================================================

const LOG_PREFIX = "[LineEndingPicker]";
function logInfo(...args: unknown[]): void
{
    console.log(new Date().toISOString(), "[INFO]", LOG_PREFIX, ...args);
}

function logWarn(...args: unknown[]): void
{
    console.warn(new Date().toISOString(), "[WARN]", LOG_PREFIX, ...args);
}

function logError(...args: unknown[]): void
{
    console.error(new Date().toISOString(), "[ERROR]", LOG_PREFIX, ...args);
}

function logDebug(...args: unknown[]): void
{
    console.debug(new Date().toISOString(), "[DEBUG]", LOG_PREFIX, ...args);
}

const CLS = "lineendingpicker";
const DEFAULT_MAX_VISIBLE = 8;
const ITEM_HEIGHT_PX = 34;
const SVG_NS = "http://www.w3.org/2000/svg";
const DEFAULT_STROKE_WIDTH = 2;
const PREVIEW_WIDTH = 80;
const PREVIEW_HEIGHT = 20;
let instanceCounter = 0;

/** Standard maxGraph-aligned line endings. */
const DEFAULT_ENDINGS: LineEndingItem[] =
[
    { value: "none",         label: "None" },
    { value: "block",        label: "Block" },
    { value: "block-open",   label: "Block (Open)" },
    { value: "classic",      label: "Classic" },
    { value: "classic-open", label: "Classic (Open)" },
    { value: "open",         label: "Open" },
    { value: "diamond",      label: "Diamond" },
    { value: "diamond-open", label: "Diamond (Open)" },
    { value: "oval",         label: "Circle" },
    { value: "oval-open",    label: "Circle (Open)" },
    { value: "dash",         label: "Dash" },
    { value: "cross",        label: "Cross" },
];

/** Entity-Relationship diagram line endings. */
const ER_ENDINGS: LineEndingItem[] =
[
    { value: "er-one",           label: "One" },
    { value: "er-mandatory-one", label: "Mandatory One" },
    { value: "er-many",          label: "Many (Crow's Foot)" },
    { value: "er-one-to-many",   label: "One to Many" },
    { value: "er-zero-to-one",   label: "Zero to One" },
    { value: "er-zero-to-many",  label: "Zero to Many" },
];

const DEFAULT_KEY_BINDINGS: Record<string, string> =
{
    openOrMoveDown: "ArrowDown",
    openOrMoveUp: "ArrowUp",
    confirmSelection: "Enter",
    closeDropdown: "Escape",
    jumpToFirst: "Home",
    jumpToLast: "End",
};

// ============================================================================
// S3: DOM HELPERS
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
    el: HTMLElement, attrs: Record<string, string>
): void
{
    for (const key of Object.keys(attrs))
    {
        el.setAttribute(key, attrs[key]);
    }
}

function safeCallback<T extends unknown[]>(
    fn: ((...a: T) => void) | undefined, ...args: T
): void
{
    if (!fn) { return; }
    try { fn(...args); }
    catch (err) { logError("callback error:", err); }
}

// ── SVG primitive builders ──

function createPath(doc: Document, d: string): SVGPathElement
{
    const path = doc.createElementNS(SVG_NS, "path") as SVGPathElement;
    path.setAttribute("d", d);
    return path;
}

function createCircle(
    doc: Document, cx: number, cy: number, r: number
): SVGCircleElement
{
    const circle = doc.createElementNS(
        SVG_NS, "circle"
    ) as SVGCircleElement;
    circle.setAttribute("cx", String(cx));
    circle.setAttribute("cy", String(cy));
    circle.setAttribute("r", String(r));
    return circle;
}

function createGroup(doc: Document): SVGGElement
{
    return doc.createElementNS(SVG_NS, "g") as SVGGElement;
}

// ── SVG marker shape dispatchers ──

/** Create the SVG shape element for a marker type (dispatcher). */
function createMarkerShape(
    endingValue: string,
    doc: Document
): SVGElement | null
{
    if (endingValue === "none") { return null; }
    if (endingValue.startsWith("er-"))
    {
        return createERMarker(endingValue, doc);
    }
    return createStandardMarker(endingValue, doc);
}

/** Create SVG shape for one of the 12 standard marker types. */
function createStandardMarker(
    endingValue: string,
    doc: Document
): SVGElement | null
{
    switch (endingValue)
    {
        case "block":
        case "block-open":
            return createPath(doc, "M 0 0 L 12 6 L 0 12 Z");
        case "classic":
        case "classic-open":
            return createPath(doc, "M 0 0 L 12 6 L 0 12 L 3 6 Z");
        case "open":
            return createPath(doc, "M 0 1 L 10 6 L 0 11");
        case "diamond":
        case "diamond-open":
            return createPath(doc, "M 0 6 L 6 0 L 12 6 L 6 12 Z");
        case "oval":
        case "oval-open":
            return createCircle(doc, 6, 6, 5);
        case "dash":
            return createPath(doc, "M 0 0 L 0 12");
        case "cross":
            return createPath(doc, "M 0 0 L 8 8 M 0 8 L 8 0");
        default:
            return null;
    }
}

/** Create SVG shape for one of the 6 ER notation marker types. */
function createERMarker(
    endingValue: string,
    doc: Document
): SVGElement | null
{
    switch (endingValue)
    {
        case "er-one":
            return createPath(doc, "M 6 0 L 6 12");
        case "er-mandatory-one":
            return createERMandatoryOne(doc);
        case "er-many":
            return createERCrowsFoot(doc);
        case "er-one-to-many":
            return createEROneToMany(doc);
        case "er-zero-to-one":
            return createERZeroToOne(doc);
        case "er-zero-to-many":
            return createERZeroToMany(doc);
        default:
            return null;
    }
}

/** ER: double vertical bars (mandatory one). */
function createERMandatoryOne(doc: Document): SVGGElement
{
    const g = createGroup(doc);
    g.appendChild(createPath(doc, "M 4 0 L 4 12"));
    g.appendChild(createPath(doc, "M 8 0 L 8 12"));
    return g;
}

/** ER: crow's foot (three lines radiating from left). */
function createERCrowsFoot(doc: Document): SVGGElement
{
    const g = createGroup(doc);
    g.appendChild(createPath(doc, "M 0 6 L 12 0"));
    g.appendChild(createPath(doc, "M 0 6 L 12 6"));
    g.appendChild(createPath(doc, "M 0 6 L 12 12"));
    return g;
}

/** ER: bar + crow's foot (one-to-many). */
function createEROneToMany(doc: Document): SVGGElement
{
    const g = createGroup(doc);
    g.appendChild(createPath(doc, "M 0 6 L 12 0"));
    g.appendChild(createPath(doc, "M 0 6 L 12 6"));
    g.appendChild(createPath(doc, "M 0 6 L 12 12"));
    g.appendChild(createPath(doc, "M 12 0 L 12 12"));
    return g;
}

/** ER: circle + bar (zero-to-one). */
function createERZeroToOne(doc: Document): SVGGElement
{
    const g = createGroup(doc);
    g.appendChild(createCircle(doc, 4, 6, 3));
    g.appendChild(createPath(doc, "M 10 0 L 10 12"));
    return g;
}

/** ER: circle + crow's foot (zero-to-many). */
function createERZeroToMany(doc: Document): SVGGElement
{
    const g = createGroup(doc);
    g.appendChild(createCircle(doc, 3, 6, 3));
    g.appendChild(createPath(doc, "M 6 6 L 14 0"));
    g.appendChild(createPath(doc, "M 6 6 L 14 6"));
    g.appendChild(createPath(doc, "M 6 6 L 14 12"));
    return g;
}

// ── SVG marker dimension lookup ──

/** Return width, height, refX, refY for standard markers. */
function getStandardDimensions(
    endingValue: string
): { w: number; h: number; refX: number; refY: number }
{
    switch (endingValue)
    {
        case "block":
        case "block-open":
        case "classic":
        case "classic-open":
            return { w: 12, h: 12, refX: 12, refY: 6 };
        case "open":
            return { w: 10, h: 12, refX: 10, refY: 6 };
        case "diamond":
        case "diamond-open":
            return { w: 12, h: 12, refX: 6, refY: 6 };
        case "oval":
        case "oval-open":
            return { w: 12, h: 12, refX: 6, refY: 6 };
        case "dash":
            return { w: 4, h: 12, refX: 0, refY: 6 };
        case "cross":
            return { w: 8, h: 8, refX: 4, refY: 4 };
        default:
            return { w: 12, h: 12, refX: 6, refY: 6 };
    }
}

/** Return width, height, refX, refY for ER markers. */
function getERDimensions(
    endingValue: string
): { w: number; h: number; refX: number; refY: number }
{
    switch (endingValue)
    {
        case "er-one":
            return { w: 12, h: 12, refX: 6, refY: 6 };
        case "er-mandatory-one":
            return { w: 12, h: 12, refX: 6, refY: 6 };
        case "er-many":
            return { w: 12, h: 12, refX: 0, refY: 6 };
        case "er-one-to-many":
            return { w: 14, h: 12, refX: 0, refY: 6 };
        case "er-zero-to-one":
            return { w: 14, h: 12, refX: 4, refY: 6 };
        case "er-zero-to-many":
            return { w: 16, h: 12, refX: 3, refY: 6 };
        default:
            return { w: 12, h: 12, refX: 6, refY: 6 };
    }
}

/** Return width, height, refX, refY for any marker type (dispatcher). */
function getMarkerDimensions(
    endingValue: string
): { w: number; h: number; refX: number; refY: number }
{
    if (endingValue.startsWith("er-"))
    {
        return getERDimensions(endingValue);
    }
    return getStandardDimensions(endingValue);
}

// ── SVG marker fill/stroke ──

/** Determine if a marker value is an "open" (stroke-only) variant. */
function isOpenVariant(endingValue: string): boolean
{
    return endingValue.endsWith("-open") ||
        endingValue === "open" ||
        endingValue === "dash" ||
        endingValue === "cross" ||
        endingValue.startsWith("er-");
}

/** Apply fill/stroke to a single SVG element. */
function applyFillToElement(
    el: SVGElement, open: boolean
): void
{
    if (open)
    {
        el.setAttribute("fill", "none");
        el.setAttribute("stroke", "currentColor");
        el.setAttribute("stroke-width", "1.5");
    }
    else
    {
        el.setAttribute("fill", "currentColor");
    }
}

/** Apply fill/stroke based on whether the marker is filled or open. */
function applyMarkerFill(
    shapeEl: SVGElement, endingValue: string
): void
{
    const open = isOpenVariant(endingValue);
    if (shapeEl.tagName === "g")
    {
        const children = shapeEl.childNodes;
        for (let i = 0; i < children.length; i++)
        {
            applyFillToElement(children[i] as SVGElement, open);
        }
    }
    else
    {
        applyFillToElement(shapeEl, open);
    }
}

// ── SVG marker assembly ──

/** Set markerWidth, markerHeight, refX, refY on a marker element. */
function applyMarkerDimensions(
    marker: SVGMarkerElement, endingValue: string
): void
{
    const dims = getMarkerDimensions(endingValue);
    marker.setAttribute("markerWidth", String(dims.w));
    marker.setAttribute("markerHeight", String(dims.h));
    marker.setAttribute("refX", String(dims.refX));
    marker.setAttribute("refY", String(dims.refY));
}

/** Build the SVG marker <defs> content for a given ending value. */
function buildMarkerDef(
    endingValue: string,
    markerId: string,
    doc: Document
): SVGMarkerElement | null
{
    if (endingValue === "none") { return null; }

    const marker = doc.createElementNS(SVG_NS, "marker") as SVGMarkerElement;
    marker.setAttribute("id", markerId);
    marker.setAttribute("orient", "auto-start-reverse");
    marker.setAttribute("markerUnits", "userSpaceOnUse");
    marker.setAttribute("overflow", "visible");

    const shapeEl = createMarkerShape(endingValue, doc);
    if (!shapeEl) { return null; }

    applyMarkerDimensions(marker, endingValue);
    applyMarkerFill(shapeEl, endingValue);
    marker.appendChild(shapeEl);
    return marker;
}

// ── SVG preview rendering ──

/** Append <defs> with marker definition to the SVG. */
function appendMarkerDefs(
    svg: SVGSVGElement,
    endingValue: string,
    markerId: string
): void
{
    const markerEl = buildMarkerDef(endingValue, markerId, document);
    if (!markerEl) { return; }
    const defs = document.createElementNS(SVG_NS, "defs");
    defs.appendChild(markerEl);
    svg.appendChild(defs);
}

/** Append the horizontal preview line with the marker reference. */
function appendPreviewLine(
    svg: SVGSVGElement,
    endingValue: string,
    strokeWidth: number,
    width: number,
    height: number,
    mode: "start" | "end",
    markerId: string
): void
{
    const pad = 4;
    const markerPad = 16;
    const x1 = mode === "start" ? markerPad : pad;
    const x2 = mode === "end" ? width - markerPad : width - pad;

    const line = document.createElementNS(SVG_NS, "line");
    line.setAttribute("x1", String(x1));
    line.setAttribute("y1", String(height / 2));
    line.setAttribute("x2", String(x2));
    line.setAttribute("y2", String(height / 2));
    line.setAttribute("stroke", "currentColor");
    line.setAttribute("stroke-width", String(strokeWidth));
    line.setAttribute("stroke-linecap", "butt");

    if (endingValue !== "none")
    {
        const attr = mode === "start" ? "marker-start" : "marker-end";
        line.setAttribute(attr, `url(#${markerId})`);
    }

    svg.appendChild(line);
}

/** Create an SVG element showing a line with a marker at the specified end. */
function createEndingPreview(
    endingValue: string,
    strokeWidth: number,
    width: number,
    height: number,
    mode: "start" | "end",
    markerId: string
): SVGSVGElement
{
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("width", String(width));
    svg.setAttribute("height", String(height));
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("overflow", "visible");
    svg.setAttribute("aria-hidden", "true");
    svg.classList.add(`${CLS}-svg`);

    appendMarkerDefs(svg, endingValue, markerId);
    appendPreviewLine(svg, endingValue, strokeWidth, width, height, mode, markerId);
    return svg;
}

// ============================================================================
// S4: CLASS
// ============================================================================

export class LineEndingPicker
{
    private readonly instanceId: string;
    private opts: LineEndingPickerOptions;
    private endings: LineEndingItem[];
    private erStartIndex: number;
    private strokeWidth: number;
    private mode: "start" | "end";
    private selectedEnding: LineEndingItem | null = null;
    private highlightedIndex = -1;
    private isOpen = false;
    private destroyed = false;

    // DOM refs
    private rootEl: HTMLElement | null = null;
    private triggerEl: HTMLElement | null = null;
    private triggerPreviewWrap: HTMLElement | null = null;
    private triggerLabel: HTMLElement | null = null;
    private dropdownEl: HTMLElement | null = null;
    private listEl: HTMLElement | null = null;

    // Bound handlers for cleanup
    private readonly boundDocClick: (e: MouseEvent) => void;
    private readonly boundDocKey: (e: KeyboardEvent) => void;

    constructor(containerId: string, options: LineEndingPickerOptions)
    {
        this.instanceId = `${CLS}-${++instanceCounter}`;
        this.opts = { ...options };
        this.endings = this.resolveEndings(options);
        this.erStartIndex = this.computeERStartIndex(options);
        this.strokeWidth = options.previewStrokeWidth ?? DEFAULT_STROKE_WIDTH;
        this.mode = options.mode ?? "end";
        this.boundDocClick = (e: MouseEvent) => this.onDocumentClick(e);
        this.boundDocKey = (e: KeyboardEvent) => this.onDocumentKey(e);
        if (options.value !== undefined)
        {
            this.selectedEnding = this.findEnding(options.value);
        }
        this.render(containerId);
        logInfo("created", this.instanceId);
    }

    // -- Public API --

    /** Get the currently selected ending value string. */
    public getValue(): string
    {
        return this.selectedEnding?.value ?? "none";
    }

    /** Get the full selected LineEndingItem or null. */
    public getSelectedEnding(): LineEndingItem | null
    {
        return this.selectedEnding;
    }

    /** Programmatically select an ending by value. */
    public setValue(value: string): void
    {
        const item = this.findEnding(value);
        if (item) { this.selectEnding(item, false); }
    }

    /** Replace the available endings list. */
    public setEndings(endings: LineEndingItem[]): void
    {
        this.endings = [...endings];
        this.erStartIndex = -1;
        if (this.isOpen) { this.renderListItems(); }
    }

    /** Get the current mode ("start" or "end"). */
    public getMode(): "start" | "end"
    {
        return this.mode;
    }

    /** Set the mode and re-render the trigger display. */
    public setMode(mode: "start" | "end"): void
    {
        this.mode = mode;
        this.updateTriggerDisplay();
        logInfo("mode changed to", mode);
    }

    /** Open the dropdown. */
    public open(): void
    {
        if (!this.isOpen) { this.openDropdown(); }
    }

    /** Close the dropdown. */
    public close(): void
    {
        if (this.isOpen) { this.closeDropdown(); }
    }

    /** Enable the picker. */
    public enable(): void
    {
        if (!this.rootEl) { return; }
        this.rootEl.classList.remove(`${CLS}-disabled`);
        this.opts.disabled = false;
    }

    /** Disable the picker. */
    public disable(): void
    {
        if (!this.rootEl) { return; }
        this.rootEl.classList.add(`${CLS}-disabled`);
        this.opts.disabled = true;
        if (this.isOpen) { this.closeDropdown(); }
    }

    /** Return the root DOM element. */
    public getElement(): HTMLElement | null
    {
        return this.rootEl;
    }

    /** Tear down all DOM and listeners. */
    public destroy(): void
    {
        if (this.destroyed) { return; }
        this.destroyed = true;
        this.removeGlobalListeners();
        if (this.rootEl && this.rootEl.parentElement)
        {
            this.rootEl.parentElement.removeChild(this.rootEl);
        }
        this.rootEl = null;
        logInfo("destroyed", this.instanceId);
    }

    // -- Private: endings resolution --

    private resolveEndings(
        options: LineEndingPickerOptions
    ): LineEndingItem[]
    {
        if (options.endings)
        {
            return [...options.endings];
        }
        const endings = [...DEFAULT_ENDINGS];
        if (options.showERNotation)
        {
            endings.push(...ER_ENDINGS);
        }
        return endings;
    }

    private computeERStartIndex(
        options: LineEndingPickerOptions
    ): number
    {
        if (options.endings) { return -1; }
        if (options.showERNotation)
        {
            return DEFAULT_ENDINGS.length;
        }
        return -1;
    }

    // -- Private: rendering --

    private render(containerId: string): void
    {
        const container = document.getElementById(containerId);
        if (!container)
        {
            logWarn("container not found:", containerId);
            return;
        }
        this.rootEl = this.buildWrapper();
        container.appendChild(this.rootEl);
    }

    private buildWrapper(): HTMLElement
    {
        const wrap = createElement("div", [CLS]);
        wrap.id = this.instanceId;
        this.applySizeClass(wrap);
        if (this.opts.disabled) { wrap.classList.add(`${CLS}-disabled`); }
        this.triggerEl = this.buildTrigger();
        this.dropdownEl = this.buildDropdown();
        wrap.appendChild(this.triggerEl);
        wrap.appendChild(this.dropdownEl);
        return wrap;
    }

    private applySizeClass(el: HTMLElement): void
    {
        if (this.opts.size === "mini") { el.classList.add(`${CLS}-mini`); }
        else if (this.opts.size === "sm") { el.classList.add(`${CLS}-sm`); }
        else if (this.opts.size === "lg") { el.classList.add(`${CLS}-lg`); }
    }

    private buildTrigger(): HTMLElement
    {
        const trigger = createElement("div", [`${CLS}-trigger`]);
        setAttr(trigger, {
            "role": "combobox",
            "aria-expanded": "false",
            "aria-haspopup": "listbox",
            "tabindex": "0",
            "aria-label": "Line ending selector",
        });
        this.triggerPreviewWrap = createElement("div", [
            `${CLS}-trigger-preview`,
        ]);
        this.triggerLabel = createElement("span", [`${CLS}-trigger-label`]);
        this.updateTriggerDisplay();
        const caret = createElement("i", [
            "bi", "bi-chevron-down", `${CLS}-trigger-caret`,
        ]);
        trigger.appendChild(this.triggerPreviewWrap);
        trigger.appendChild(this.triggerLabel);
        trigger.appendChild(caret);
        trigger.addEventListener("click", () => this.onTriggerClick());
        trigger.addEventListener("keydown", (e) => this.onTriggerKeydown(e));
        return trigger;
    }

    private updateTriggerDisplay(): void
    {
        if (!this.triggerPreviewWrap || !this.triggerLabel) { return; }
        this.clearChildNodes(this.triggerPreviewWrap);
        if (this.selectedEnding)
        {
            this.renderTriggerPreview();
        }
        else
        {
            this.triggerLabel.textContent = "Select ending\u2026";
            this.triggerLabel.classList.add(`${CLS}-trigger-placeholder`);
        }
    }

    private renderTriggerPreview(): void
    {
        if (!this.triggerPreviewWrap || !this.triggerLabel) { return; }
        if (!this.selectedEnding) { return; }
        const mid = `lep-marker-${this.instanceId}-trigger`;
        const svg = createEndingPreview(
            this.selectedEnding.value,
            this.strokeWidth,
            PREVIEW_WIDTH,
            PREVIEW_HEIGHT,
            this.mode,
            mid
        );
        this.triggerPreviewWrap.appendChild(svg);
        this.triggerLabel.textContent = this.selectedEnding.label;
        this.triggerLabel.classList.remove(`${CLS}-trigger-placeholder`);
    }

    private clearChildNodes(el: HTMLElement): void
    {
        while (el.firstChild)
        {
            el.removeChild(el.firstChild);
        }
    }

    private buildDropdown(): HTMLElement
    {
        const dd = createElement("div", [`${CLS}-dropdown`]);
        dd.style.display = "none";
        this.listEl = createElement("ul", [`${CLS}-list`]);
        setAttr(this.listEl, {
            "role": "listbox",
            "aria-label": "Line endings",
        });
        this.setListMaxHeight();
        dd.appendChild(this.listEl);
        return dd;
    }

    private setListMaxHeight(): void
    {
        if (!this.listEl) { return; }
        const max = this.opts.maxVisibleItems || DEFAULT_MAX_VISIBLE;
        this.listEl.style.maxHeight = `${max * ITEM_HEIGHT_PX}px`;
    }

    // -- Private: list rendering --

    private renderListItems(): void
    {
        if (!this.listEl) { return; }
        this.clearChildNodes(this.listEl as HTMLElement);
        this.highlightedIndex = -1;
        for (let i = 0; i < this.endings.length; i++)
        {
            this.appendERSeparatorIfNeeded(i);
            this.listEl.appendChild(
                this.buildEndingItem(this.endings[i], i)
            );
        }
    }

    /** Insert a group separator and label before the ER endings group. */
    private appendERSeparatorIfNeeded(index: number): void
    {
        if (!this.listEl) { return; }
        if (this.erStartIndex < 0) { return; }
        if (index !== this.erStartIndex) { return; }
        const sep = createElement("li", [`${CLS}-group-separator`]);
        sep.setAttribute("role", "separator");
        sep.setAttribute("aria-hidden", "true");
        this.listEl.appendChild(sep);
        const label = createElement(
            "li", [`${CLS}-group-label`], "ER Notation"
        );
        label.setAttribute("role", "presentation");
        label.setAttribute("aria-hidden", "true");
        this.listEl.appendChild(label);
    }

    private buildEndingItem(
        item: LineEndingItem, index: number
    ): HTMLElement
    {
        const li = createElement("li", [`${CLS}-item`]);
        const optId = `${this.instanceId}-opt-${index}`;
        setAttr(li, {
            "id": optId,
            "role": "option",
            "aria-selected": "false",
            "data-index": String(index),
            "data-value": item.value,
        });
        if (this.selectedEnding && this.selectedEnding.value === item.value)
        {
            li.classList.add(`${CLS}-item-selected`);
            setAttr(li, { "aria-selected": "true" });
        }
        this.appendItemContent(li, item, index);
        li.addEventListener("click", () => this.selectEnding(item, true));
        li.addEventListener("mouseenter", () => this.setHighlight(index));
        return li;
    }

    private appendItemContent(
        li: HTMLElement, item: LineEndingItem, index: number
    ): void
    {
        const previewWrap = createElement("div", [`${CLS}-item-preview`]);
        const mid = `lep-marker-${this.instanceId}-${index}`;
        const svg = createEndingPreview(
            item.value,
            this.strokeWidth,
            PREVIEW_WIDTH,
            PREVIEW_HEIGHT,
            this.mode,
            mid
        );
        previewWrap.appendChild(svg);
        const label = createElement(
            "span", [`${CLS}-item-label`], item.label
        );
        li.appendChild(previewWrap);
        li.appendChild(label);
    }

    // -- Private: dropdown state --

    private openDropdown(): void
    {
        if (this.opts.disabled || !this.dropdownEl) { return; }
        this.dropdownEl.style.display = "";
        this.isOpen = true;
        this.positionDropdown();
        this.renderListItems();
        if (this.triggerEl)
        {
            setAttr(this.triggerEl, { "aria-expanded": "true" });
        }
        this.addGlobalListeners();
        safeCallback(this.opts.onOpen);
    }

    private closeDropdown(): void
    {
        if (!this.dropdownEl) { return; }
        this.dropdownEl.style.display = "none";
        this.isOpen = false;
        this.highlightedIndex = -1;
        if (this.triggerEl)
        {
            setAttr(this.triggerEl, { "aria-expanded": "false" });
            this.triggerEl.focus();
        }
        this.removeGlobalListeners();
        safeCallback(this.opts.onClose);
    }

    private positionDropdown(): void
    {
        if (!this.dropdownEl || !this.rootEl) { return; }
        const rect = this.rootEl.getBoundingClientRect();
        const max = this.opts.maxVisibleItems || DEFAULT_MAX_VISIBLE;
        const ddHeight = max * ITEM_HEIGHT_PX + 8;
        const spaceBelow = window.innerHeight - rect.bottom;
        const openAbove = spaceBelow < ddHeight && rect.top > spaceBelow;
        this.dropdownEl.style.position = "fixed";
        this.dropdownEl.style.left = `${rect.left}px`;
        this.dropdownEl.style.width = `${rect.width}px`;
        if (openAbove)
        {
            this.dropdownEl.style.top = "";
            this.dropdownEl.style.bottom =
                `${window.innerHeight - rect.top + 2}px`;
        }
        else
        {
            this.dropdownEl.style.bottom = "";
            this.dropdownEl.style.top = `${rect.bottom + 2}px`;
        }
        this.clampToViewport();
    }

    private clampToViewport(): void
    {
        if (!this.dropdownEl) { return; }
        requestAnimationFrame(() =>
        {
            if (!this.dropdownEl) { return; }
            const pr = this.dropdownEl.getBoundingClientRect();
            if (pr.right > window.innerWidth)
            {
                this.dropdownEl.style.left =
                    `${window.innerWidth - pr.width - 4}px`;
            }
            if (pr.left < 0) { this.dropdownEl.style.left = "4px"; }
        });
    }

    // -- Private: selection --

    private selectEnding(
        item: LineEndingItem, fireEvent: boolean
    ): void
    {
        this.selectedEnding = item;
        this.updateTriggerDisplay();
        if (this.isOpen) { this.closeDropdown(); }
        if (fireEvent) { safeCallback(this.opts.onChange, item); }
    }

    // -- Private: highlight navigation --

    private setHighlight(index: number): void
    {
        if (!this.listEl) { return; }
        const items = this.listEl.querySelectorAll(`.${CLS}-item`);
        items.forEach(el => el.classList.remove(`${CLS}-item-highlighted`));
        this.highlightedIndex = index;
        const target = items[index];
        if (!target) { return; }
        target.classList.add(`${CLS}-item-highlighted`);
        target.scrollIntoView({ block: "nearest" });
    }

    private moveHighlight(delta: number): void
    {
        if (!this.listEl) { return; }
        const items = this.listEl.querySelectorAll(`.${CLS}-item`);
        const count = items.length;
        if (count === 0) { return; }
        let next = this.highlightedIndex + delta;
        if (next < 0) { next = count - 1; }
        else if (next >= count) { next = 0; }
        this.setHighlight(next);
    }

    private getHighlightedEnding(): LineEndingItem | null
    {
        if (this.highlightedIndex < 0 ||
            this.highlightedIndex >= this.endings.length)
        {
            return null;
        }
        return this.endings[this.highlightedIndex];
    }

    // -- Private: keyboard --

    private onTriggerClick(): void
    {
        if (this.opts.disabled) { return; }
        if (this.isOpen) { this.closeDropdown(); }
        else { this.openDropdown(); }
    }

    private onTriggerKeydown(e: KeyboardEvent): void
    {
        if (this.opts.disabled) { return; }
        if (e.key === DEFAULT_KEY_BINDINGS.openOrMoveDown ||
            e.key === DEFAULT_KEY_BINDINGS.openOrMoveUp ||
            e.key === " ")
        {
            e.preventDefault();
            this.openDropdown();
        }
    }

    private onDocumentClick(e: MouseEvent): void
    {
        if (!this.rootEl || !this.isOpen) { return; }
        if (!this.rootEl.contains(e.target as Node))
        {
            this.closeDropdown();
        }
    }

    private onDocumentKey(e: KeyboardEvent): void
    {
        if (!this.isOpen) { return; }
        if (e.key === "Escape")
        {
            e.stopPropagation();
            this.closeDropdown();
            return;
        }
        this.handleNavigationKeys(e);
    }

    private handleNavigationKeys(e: KeyboardEvent): void
    {
        if (e.key === DEFAULT_KEY_BINDINGS.openOrMoveDown)
        {
            e.preventDefault();
            this.moveHighlight(1);
        }
        else if (e.key === DEFAULT_KEY_BINDINGS.openOrMoveUp)
        {
            e.preventDefault();
            this.moveHighlight(-1);
        }
        else if (e.key === DEFAULT_KEY_BINDINGS.confirmSelection)
        {
            e.preventDefault();
            const t = this.getHighlightedEnding();
            if (t) { this.selectEnding(t, true); }
        }
        else
        {
            this.handleJumpKeys(e);
        }
    }

    /** Handles Home/End jump-to-first/last navigation. */
    private handleJumpKeys(e: KeyboardEvent): void
    {
        if (e.key === DEFAULT_KEY_BINDINGS.jumpToFirst)
        {
            e.preventDefault();
            this.setHighlight(0);
        }
        else if (e.key === DEFAULT_KEY_BINDINGS.jumpToLast)
        {
            e.preventDefault();
            if (this.endings.length > 0)
            {
                this.setHighlight(this.endings.length - 1);
            }
        }
    }

    // -- Private: global listeners --

    private addGlobalListeners(): void
    {
        document.addEventListener("mousedown", this.boundDocClick, true);
        document.addEventListener("keydown", this.boundDocKey, true);
    }

    private removeGlobalListeners(): void
    {
        document.removeEventListener("mousedown", this.boundDocClick, true);
        document.removeEventListener("keydown", this.boundDocKey, true);
    }

    // -- Private: helpers --

    private findEnding(value: string): LineEndingItem | null
    {
        return this.endings.find(e => e.value === value) || null;
    }
}

// ============================================================================
// S5: FACTORY & GLOBAL EXPORTS
// ============================================================================

/** Create a LineEndingPicker and mount it in the given container. */
export function createLineEndingPicker(
    containerId: string, options: LineEndingPickerOptions
): LineEndingPicker
{
    return new LineEndingPicker(containerId, options);
}

(window as unknown as Record<string, unknown>)["LineEndingPicker"] = LineEndingPicker;
(window as unknown as Record<string, unknown>)["createLineEndingPicker"] = createLineEndingPicker;
