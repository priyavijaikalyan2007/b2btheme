/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: LineShapePicker
 * 📜 PURPOSE: A dropdown picker that displays line shape/routing patterns with
 *    inline SVG previews, letting users select connector shapes for
 *    graph/drawing tools aligned with maxGraph edge routing styles.
 * 🔗 RELATES: [[EnterpriseTheme]], [[CustomComponents]], [[LineTypePicker]],
 *    [[LineWidthPicker]], [[GraphCanvas]]
 * ⚡ FLOW: [Consumer App] -> [createLineShapePicker()] -> [DOM trigger + dropdown]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// S1: INTERFACES
// ============================================================================

/** A single line-shape entry in the dropdown. */
export interface LineShapeItem
{
    /** Display name (e.g. "Curved"). */
    label: string;
    /** Shape identifier (e.g. "curved"). */
    value: string;
}

/** Configuration options for LineShapePicker. */
export interface LineShapePickerOptions
{
    /** Custom shape list; defaults to 6 maxGraph routing styles if omitted. */
    shapes?: LineShapeItem[];
    /** Initially selected shape value. */
    value?: string;
    /** Preview stroke width in pixels. Default: 2. */
    previewStrokeWidth?: number;
    /** Size variant. */
    size?: "mini" | "sm" | "default" | "lg";
    /** Disable the picker. */
    disabled?: boolean;
    /** Max visible items before scrolling. Default: 8. */
    maxVisibleItems?: number;
    /** Fires when the selected shape changes. */
    onChange?: (shape: LineShapeItem) => void;
    /** Fires when the dropdown opens. */
    onOpen?: () => void;
    /** Fires when the dropdown closes. */
    onClose?: () => void;
}

// ============================================================================
// S2: CONSTANTS
// ============================================================================

const LOG_PREFIX = "[LineShapePicker]";
const _lu = (typeof (window as any).createLogUtility === "function") ? (window as any).createLogUtility().getLogger(LOG_PREFIX.slice(1, -1)) : null;
function logInfo(...a: unknown[]): void { _lu ? _lu.info(...a) : console.log(new Date().toISOString(), "[INFO]", LOG_PREFIX, ...a); }
function logWarn(...a: unknown[]): void { _lu ? _lu.warn(...a) : console.warn(new Date().toISOString(), "[WARN]", LOG_PREFIX, ...a); }
function logError(...a: unknown[]): void { _lu ? _lu.error(...a) : console.error(new Date().toISOString(), "[ERROR]", LOG_PREFIX, ...a); }
function logDebug(...a: unknown[]): void { _lu ? _lu.debug(...a) : console.debug(new Date().toISOString(), "[DEBUG]", LOG_PREFIX, ...a); }
function logTrace(...a: unknown[]): void { _lu ? _lu.trace(...a) : console.debug(new Date().toISOString(), "[TRACE]", LOG_PREFIX, ...a); }

const CLS = "lineshapepicker";
const DEFAULT_MAX_VISIBLE = 8;
const ITEM_HEIGHT_PX = 34;
const SVG_NS = "http://www.w3.org/2000/svg";
const DEFAULT_STROKE_WIDTH = 2;
const PREVIEW_WIDTH = 80;
const PREVIEW_HEIGHT = 20;
let instanceCounter = 0;

const DEFAULT_SHAPES: LineShapeItem[] =
[
    { label: "Straight",        value: "straight" },
    { label: "Orthogonal",      value: "orthogonal" },
    { label: "Segment (Bezier)", value: "segment" },
    { label: "Manhattan",       value: "manhattan" },
    { label: "Elbow",           value: "elbow" },
    { label: "Entity Relation", value: "entity" },
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

/** Build the SVG path `d` attribute for a given shape type. */
function buildShapePath(
    shapeValue: string, w: number, h: number
): string
{
    const midY = h / 2;
    switch (shapeValue)
    {
        case "orthogonal":
            return buildOrthogonalPath(w, h, midY);
        case "segment":
            return buildSegmentPath(w, h);
        case "manhattan":
            return buildManhattanPath(w, h, midY);
        case "elbow":
            return buildElbowPath(w, h);
        case "entity":
            return buildEntityPath(w, h, midY);
        default: // straight
            return `M 4 ${midY} L ${w - 4} ${midY}`;
    }
}

/** Orthogonal: staircase with rounded corners via quadratic curves. */
function buildOrthogonalPath(
    w: number, h: number, midY: number
): string
{
    const x1 = 4;
    const x2 = w * 0.35;
    const x3 = w * 0.65;
    const x4 = w - 4;
    const y1 = h - 3;
    const y2 = 3;
    const r = 3;
    return [
        `M ${x1} ${y1}`,
        `L ${x2 - r} ${y1}`,
        `Q ${x2} ${y1} ${x2} ${y1 - r}`,
        `L ${x2} ${midY + r}`,
        `Q ${x2} ${midY} ${x2 + r} ${midY}`,
        `L ${x3 - r} ${midY}`,
        `Q ${x3} ${midY} ${x3} ${midY - r}`,
        `L ${x3} ${y2 + r}`,
        `Q ${x3} ${y2} ${x3 + r} ${y2}`,
        `L ${x4} ${y2}`,
    ].join(" ");
}

/** Segment (Bezier): smooth S-curve showing draggable waypoint nature. */
function buildSegmentPath(w: number, h: number): string
{
    return `M 4 ${h - 3} C ${w * 0.35} ${h - 3} ${w * 0.25} ${3} ${w * 0.5} ${h / 2} S ${w * 0.75} ${h - 3} ${w - 4} ${3}`;
}

/** Manhattan: sharp orthogonal staircase, no rounding. */
function buildManhattanPath(
    w: number, h: number, midY: number
): string
{
    const x1 = 4;
    const x2 = w * 0.35;
    const x3 = w * 0.65;
    const x4 = w - 4;
    const y1 = h - 3;
    const y2 = 3;
    return [
        `M ${x1} ${y1}`,
        `L ${x2} ${y1}`,
        `L ${x2} ${midY}`,
        `L ${x3} ${midY}`,
        `L ${x3} ${y2}`,
        `L ${x4} ${y2}`,
    ].join(" ");
}

/** Elbow: single right-angle bend. */
function buildElbowPath(w: number, h: number): string
{
    return `M 4 ${h - 3} L ${w / 2} ${h - 3} L ${w / 2} ${3} L ${w - 4} ${3}`;
}

/** Entity Relation: out, perpendicular midpoint turn, back out. */
function buildEntityPath(
    w: number, h: number, midY: number
): string
{
    const x1 = 4;
    const xM = w / 2;
    const x4 = w - 4;
    const y1 = h - 3;
    const y2 = 3;
    return [
        `M ${x1} ${midY}`,
        `L ${xM} ${midY}`,
        `L ${xM} ${y1}`,
        `M ${xM} ${midY}`,
        `L ${xM} ${y2}`,
        `M ${xM} ${midY}`,
        `L ${x4} ${midY}`,
    ].join(" ");
}

/** Create an SVG element showing a line with the given shape. */
function createShapePreview(
    shapeValue: string,
    strokeWidth: number,
    width: number,
    height: number
): SVGSVGElement
{
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("width", String(width));
    svg.setAttribute("height", String(height));
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("aria-hidden", "true");
    svg.classList.add(`${CLS}-svg`);

    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", buildShapePath(shapeValue, width, height));
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", String(strokeWidth));
    path.setAttribute("fill", "none");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");

    svg.appendChild(path);
    return svg;
}

// ============================================================================
// S4: CLASS
// ============================================================================

export class LineShapePicker
{
    private readonly instanceId: string;
    private opts: LineShapePickerOptions;
    private shapes: LineShapeItem[];
    private strokeWidth: number;
    private selectedShape: LineShapeItem | null = null;
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

    constructor(containerId: string, options: LineShapePickerOptions)
    {
        this.instanceId = `${CLS}-${++instanceCounter}`;
        this.opts = { ...options };
        this.shapes = options.shapes
            ? [...options.shapes]
            : [...DEFAULT_SHAPES];
        this.strokeWidth = options.previewStrokeWidth ?? DEFAULT_STROKE_WIDTH;
        this.boundDocClick = (e: MouseEvent) => this.onDocumentClick(e);
        this.boundDocKey = (e: KeyboardEvent) => this.onDocumentKey(e);
        if (options.value !== undefined)
        {
            this.selectedShape = this.findShape(options.value);
        }
        this.render(containerId);
        logInfo("created", this.instanceId);
    }

    // -- Public API --

    /** Get the currently selected shape value string. */
    public getValue(): string
    {
        return this.selectedShape?.value ?? "";
    }

    /** Get the full selected LineShapeItem or null. */
    public getSelectedShape(): LineShapeItem | null
    {
        return this.selectedShape;
    }

    /** Programmatically select a shape by value. */
    public setValue(value: string): void
    {
        const item = this.findShape(value);
        if (item) { this.selectShape(item, false); }
    }

    /** Replace the available shapes list. */
    public setShapes(shapes: LineShapeItem[]): void
    {
        this.shapes = [...shapes];
        if (this.isOpen) { this.renderListItems(); }
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
            "aria-label": "Line shape selector",
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
        // Clear previous SVG
        while (this.triggerPreviewWrap.firstChild)
        {
            this.triggerPreviewWrap.removeChild(
                this.triggerPreviewWrap.firstChild
            );
        }
        if (this.selectedShape)
        {
            const svg = createShapePreview(
                this.selectedShape.value,
                this.strokeWidth,
                PREVIEW_WIDTH,
                PREVIEW_HEIGHT
            );
            this.triggerPreviewWrap.appendChild(svg);
            this.triggerLabel.textContent = this.selectedShape.label;
            this.triggerLabel.classList.remove(`${CLS}-trigger-placeholder`);
        }
        else
        {
            this.triggerLabel.textContent = "Select shape\u2026";
            this.triggerLabel.classList.add(`${CLS}-trigger-placeholder`);
        }
    }

    private buildDropdown(): HTMLElement
    {
        const dd = createElement("div", [`${CLS}-dropdown`]);
        dd.style.display = "none";
        this.listEl = createElement("ul", [`${CLS}-list`]);
        setAttr(this.listEl, {
            "role": "listbox",
            "aria-label": "Line shapes",
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
        while (this.listEl.firstChild)
        {
            this.listEl.removeChild(this.listEl.firstChild);
        }
        this.highlightedIndex = -1;
        for (let i = 0; i < this.shapes.length; i++)
        {
            this.listEl.appendChild(this.buildShapeItem(this.shapes[i], i));
        }
    }

    private buildShapeItem(item: LineShapeItem, index: number): HTMLElement
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
        if (this.selectedShape && this.selectedShape.value === item.value)
        {
            li.classList.add(`${CLS}-item-selected`);
            setAttr(li, { "aria-selected": "true" });
        }
        this.appendItemContent(li, item);
        li.addEventListener("click", () => this.selectShape(item, true));
        li.addEventListener("mouseenter", () => this.setHighlight(index));
        return li;
    }

    private appendItemContent(
        li: HTMLElement, item: LineShapeItem
    ): void
    {
        const previewWrap = createElement("div", [`${CLS}-item-preview`]);
        const svg = createShapePreview(
            item.value,
            this.strokeWidth,
            PREVIEW_WIDTH,
            PREVIEW_HEIGHT
        );
        previewWrap.appendChild(svg);
        const label = createElement("span", [`${CLS}-item-label`], item.label);
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

        // Set fixed position BEFORE measuring so the dropdown
        // doesn't inflate the wrapper's height on first open
        this.dropdownEl.style.position = "fixed";

        const rect = this.rootEl.getBoundingClientRect();
        const max = this.opts.maxVisibleItems || DEFAULT_MAX_VISIBLE;
        const ddHeight = max * ITEM_HEIGHT_PX + 8;
        const spaceBelow = window.innerHeight - rect.bottom;
        const openAbove = spaceBelow < ddHeight && rect.top > spaceBelow;
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

    private selectShape(item: LineShapeItem, fireEvent: boolean): void
    {
        this.selectedShape = item;
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

    private getHighlightedShape(): LineShapeItem | null
    {
        if (this.highlightedIndex < 0 ||
            this.highlightedIndex >= this.shapes.length)
        {
            return null;
        }
        return this.shapes[this.highlightedIndex];
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

    /** Dispatches arrow / enter / home / end keys to the appropriate action. */
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
            const s = this.getHighlightedShape();
            if (s) { this.selectShape(s, true); }
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
            if (this.shapes.length > 0)
            {
                this.setHighlight(this.shapes.length - 1);
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

    private findShape(value: string): LineShapeItem | null
    {
        return this.shapes.find(s => s.value === value) || null;
    }
}

// ============================================================================
// S5: FACTORY & GLOBAL EXPORTS
// ============================================================================

/** Create a LineShapePicker and mount it in the given container. */
export function createLineShapePicker(
    containerId: string, options: LineShapePickerOptions
): LineShapePicker
{
    return new LineShapePicker(containerId, options);
}

(window as unknown as Record<string, unknown>)["LineShapePicker"] = LineShapePicker;
(window as unknown as Record<string, unknown>)["createLineShapePicker"] = createLineShapePicker;
