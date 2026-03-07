/*
 * ----------------------------------------------------------------------------
 * COMPONENT: LineEndingPicker
 * PURPOSE: A dropdown picker that displays line ending (arrowhead / marker)
 *    styles with inline SVG previews, letting users select marker shapes for
 *    the start or end of lines in graph/drawing tools.
 * RELATES: [[EnterpriseTheme]], [[CustomComponents]], [[LineTypePicker]],
 *    [[LineWidthPicker]], [[GraphCanvas]]
 * FLOW: [Consumer App] -> [createLineEndingPicker()] -> [DOM trigger + dropdown]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// S1: INTERFACES
// ============================================================================

/** A single line-ending entry in the dropdown. */
export interface LineEndingItem
{
    /** Display name (e.g. "Arrow"). */
    label: string;
    /** Marker identifier (e.g. "arrow", "diamond-open"). */
    value: string;
}

/** Configuration options for LineEndingPicker. */
export interface LineEndingPickerOptions
{
    /** Custom endings list; defaults to 9 common markers if omitted. */
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
const CLS = "lineendingpicker";
const DEFAULT_MAX_VISIBLE = 8;
const ITEM_HEIGHT_PX = 34;
const SVG_NS = "http://www.w3.org/2000/svg";
const DEFAULT_STROKE_WIDTH = 2;
const PREVIEW_WIDTH = 80;
const PREVIEW_HEIGHT = 20;
let instanceCounter = 0;

const DEFAULT_ENDINGS: LineEndingItem[] =
[
    { label: "None",         value: "none" },
    { label: "Narrow Arrow", value: "arrow-narrow" },
    { label: "Arrow",        value: "arrow" },
    { label: "Wide Arrow",   value: "arrow-wide" },
    { label: "Open Arrow",   value: "arrow-open" },
    { label: "Diamond",      value: "diamond" },
    { label: "Diamond Open", value: "diamond-open" },
    { label: "Circle",       value: "circle" },
    { label: "Circle Open",  value: "circle-open" },
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
    catch (err) { console.error(LOG_PREFIX, "callback error:", err); }
}

// ── SVG marker builders ──

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

/** Create the SVG shape element (path or circle) for a marker type. */
function createMarkerShape(
    endingValue: string,
    doc: Document
): SVGElement | null
{
    switch (endingValue)
    {
        case "arrow-narrow":
            return createPath(doc, "M 0 0 L 10 5 L 0 10");
        case "arrow":
            return createPath(doc, "M 0 0 L 12 6 L 0 12 Z");
        case "arrow-wide":
            return createPath(doc, "M 0 0 L 14 8 L 0 16 Z");
        case "arrow-open":
            return createPath(doc, "M 0 0 L 12 6 L 0 12");
        case "diamond":
        case "diamond-open":
            return createPath(doc, "M 0 6 L 6 0 L 12 6 L 6 12 Z");
        case "circle":
        case "circle-open":
            return createCircle(doc, 5, 5, 4);
        default:
            return null;
    }
}

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

/** Return width, height, refX, refY for each marker type (userSpaceOnUse). */
function getMarkerDimensions(
    endingValue: string
): { w: number; h: number; refX: number; refY: number }
{
    switch (endingValue)
    {
        case "arrow-narrow":
            return { w: 10, h: 10, refX: 10, refY: 5 };
        case "arrow":
        case "arrow-open":
            return { w: 12, h: 12, refX: 12, refY: 6 };
        case "arrow-wide":
            return { w: 14, h: 16, refX: 14, refY: 8 };
        case "diamond":
        case "diamond-open":
            return { w: 12, h: 12, refX: 6, refY: 6 };
        case "circle":
        case "circle-open":
            return { w: 10, h: 10, refX: 5, refY: 5 };
        default:
            return { w: 12, h: 12, refX: 6, refY: 6 };
    }
}

/** Apply fill/stroke based on whether the marker is filled or open. */
function applyMarkerFill(
    shapeEl: SVGElement, endingValue: string
): void
{
    const isOpen = endingValue.endsWith("-open") ||
        endingValue === "arrow-narrow";
    if (isOpen)
    {
        shapeEl.setAttribute("fill", "none");
        shapeEl.setAttribute("stroke", "currentColor");
        shapeEl.setAttribute("stroke-width", "1.5");
    }
    else
    {
        shapeEl.setAttribute("fill", "currentColor");
    }
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

// ============================================================================
// S4: CLASS
// ============================================================================

export class LineEndingPicker
{
    private readonly instanceId: string;
    private opts: LineEndingPickerOptions;
    private endings: LineEndingItem[];
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
        this.endings = options.endings
            ? [...options.endings]
            : [...DEFAULT_ENDINGS];
        this.strokeWidth = options.previewStrokeWidth ?? DEFAULT_STROKE_WIDTH;
        this.mode = options.mode ?? "end";
        this.boundDocClick = (e: MouseEvent) => this.onDocumentClick(e);
        this.boundDocKey = (e: KeyboardEvent) => this.onDocumentKey(e);
        if (options.value !== undefined)
        {
            this.selectedEnding = this.findEnding(options.value);
        }
        this.render(containerId);
        console.log(LOG_PREFIX, "created", this.instanceId);
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
        console.log(LOG_PREFIX, "mode changed to", mode);
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
        console.log(LOG_PREFIX, "destroyed", this.instanceId);
    }

    // -- Private: rendering --

    private render(containerId: string): void
    {
        const container = document.getElementById(containerId);
        if (!container)
        {
            console.warn(LOG_PREFIX, "container not found:", containerId);
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
        else
        {
            this.triggerLabel.textContent = "Select ending\u2026";
            this.triggerLabel.classList.add(`${CLS}-trigger-placeholder`);
        }
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
            this.listEl.appendChild(
                this.buildEndingItem(this.endings[i], i)
            );
        }
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
        else if (e.key === DEFAULT_KEY_BINDINGS.jumpToFirst)
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
