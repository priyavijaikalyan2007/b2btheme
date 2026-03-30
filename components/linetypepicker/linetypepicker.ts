/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: LineTypePicker
 * 📜 PURPOSE: A dropdown picker that displays line dash patterns with inline
 *    SVG previews, letting users select stroke styles for graph/drawing tools.
 * 🔗 RELATES: [[EnterpriseTheme]], [[CustomComponents]], [[FontDropdown]],
 *    [[LineWidthPicker]], [[GraphCanvas]]
 * ⚡ FLOW: [Consumer App] -> [createLineTypePicker()] -> [DOM trigger + dropdown]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// S1: INTERFACES
// ============================================================================

/** A single line-type entry in the dropdown. */
export interface LineTypeItem
{
    /** Display name (e.g. "Dashed"). */
    label: string;
    /** Semantic identifier (e.g. "dashed"). Used for serialization. */
    value: string;
    /** SVG stroke-dasharray string (e.g. "6 4"). Empty string = solid. */
    dashArray: string;
}

/** Configuration options for LineTypePicker. */
export interface LineTypePickerOptions
{
    /** Custom type list; defaults to 12 common dash patterns if omitted. */
    types?: LineTypeItem[];
    /** Initially selected type name (e.g. "dashed"). */
    value?: string;
    /** Preview stroke width in pixels. Default: 2. */
    previewStrokeWidth?: number;
    /** Size variant. */
    size?: "mini" | "sm" | "default" | "lg";
    /** Disable the picker. */
    disabled?: boolean;
    /** Max visible items before scrolling. Default: 8. */
    maxVisibleItems?: number;
    /** Fires when the selected type changes. */
    onChange?: (type: LineTypeItem) => void;
    /** Fires when the dropdown opens. */
    onOpen?: () => void;
    /** Fires when the dropdown closes. */
    onClose?: () => void;
}

// ============================================================================
// S2: CONSTANTS
// ============================================================================

const LOG_PREFIX = "[LineTypePicker]";
const _lu = (typeof (window as any).createLogUtility === "function") ? (window as any).createLogUtility().getLogger(LOG_PREFIX.slice(1, -1)) : null;
function logInfo(...a: unknown[]): void { _lu ? _lu.info(...a) : console.log(new Date().toISOString(), "[INFO]", LOG_PREFIX, ...a); }
function logWarn(...a: unknown[]): void { _lu ? _lu.warn(...a) : console.warn(new Date().toISOString(), "[WARN]", LOG_PREFIX, ...a); }
function logError(...a: unknown[]): void { _lu ? _lu.error(...a) : console.error(new Date().toISOString(), "[ERROR]", LOG_PREFIX, ...a); }
function logDebug(...a: unknown[]): void { _lu ? _lu.debug(...a) : console.debug(new Date().toISOString(), "[DEBUG]", LOG_PREFIX, ...a); }
function logTrace(...a: unknown[]): void { _lu ? _lu.trace(...a) : console.debug(new Date().toISOString(), "[TRACE]", LOG_PREFIX, ...a); }

const CLS = "linetypepicker";
const DEFAULT_MAX_VISIBLE = 8;
const ITEM_HEIGHT_PX = 34;
const SVG_NS = "http://www.w3.org/2000/svg";
const DEFAULT_STROKE_WIDTH = 2;
const PREVIEW_WIDTH = 80;
const PREVIEW_HEIGHT = 20;
let instanceCounter = 0;

const DEFAULT_TYPES: LineTypeItem[] =
[
    { label: "Solid",       value: "solid",        dashArray: "" },
    { label: "Dotted",      value: "dotted",       dashArray: "2 2" },
    { label: "Dashed",      value: "dashed",       dashArray: "6 4" },
    { label: "Dash-Dot",    value: "dash-dot",     dashArray: "6 4 2 4" },
    { label: "Long Dash",   value: "long-dash",    dashArray: "12 4" },
    { label: "Short Dash",  value: "short-dash",   dashArray: "4 2" },
    { label: "Double Dot",  value: "double-dot",   dashArray: "2 2 6 2" },
    { label: "Double Dash", value: "double-dash",  dashArray: "6 2 6 2" },
    { label: "Narrow Dot",  value: "narrow-dot",   dashArray: "1 2" },
    { label: "Narrow Dash", value: "narrow-dash",  dashArray: "3 2" },
    { label: "Wide Dot",    value: "wide-dot",     dashArray: "2 6" },
    { label: "Wide Dash",   value: "wide-dash",    dashArray: "8 6" },
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

/** Create an SVG element showing a line with the given dash pattern. */
function createDashPreview(
    dashArray: string,
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

    const line = document.createElementNS(SVG_NS, "line");
    line.setAttribute("x1", "0");
    line.setAttribute("y1", String(height / 2));
    line.setAttribute("x2", String(width));
    line.setAttribute("y2", String(height / 2));
    line.setAttribute("stroke", "currentColor");
    line.setAttribute("stroke-width", String(strokeWidth));
    if (dashArray)
    {
        line.setAttribute("stroke-dasharray", dashArray);
    }
    line.setAttribute("stroke-linecap", "butt");

    svg.appendChild(line);
    return svg;
}

// ============================================================================
// S4: CLASS
// ============================================================================

export class LineTypePicker
{
    private readonly instanceId: string;
    private opts: LineTypePickerOptions;
    private types: LineTypeItem[];
    private strokeWidth: number;
    private selectedType: LineTypeItem | null = null;
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

    constructor(containerId: string, options: LineTypePickerOptions)
    {
        this.instanceId = `${CLS}-${++instanceCounter}`;
        this.opts = { ...options };
        this.types = options.types
            ? [...options.types]
            : [...DEFAULT_TYPES];
        this.strokeWidth = options.previewStrokeWidth ?? DEFAULT_STROKE_WIDTH;
        this.boundDocClick = (e: MouseEvent) => this.onDocumentClick(e);
        this.boundDocKey = (e: KeyboardEvent) => this.onDocumentKey(e);
        if (options.value !== undefined)
        {
            this.selectedType = this.findType(options.value);
        }
        this.render(containerId);
        logInfo("created", this.instanceId);
    }

    // ── Public API ──

    /** Get the currently selected semantic type name (e.g. "dashed"). */
    public getValue(): string
    {
        return this.selectedType?.value ?? "";
    }

    /** Get the full selected LineTypeItem or null. */
    public getSelectedType(): LineTypeItem | null
    {
        return this.selectedType;
    }

    /** Programmatically select a type by name (also accepts dasharray for compat). */
    public setValue(value: string): void
    {
        const item = this.findType(value);
        if (item) { this.selectType(item, false); }
    }

    /** Replace the available types list. */
    public setTypes(types: LineTypeItem[]): void
    {
        this.types = [...types];
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

    // ── Private: rendering ──

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
            "aria-label": "Line type selector",
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
        if (this.selectedType)
        {
            const svg = createDashPreview(
                this.selectedType.dashArray,
                this.strokeWidth,
                PREVIEW_WIDTH,
                PREVIEW_HEIGHT
            );
            this.triggerPreviewWrap.appendChild(svg);
            this.triggerLabel.textContent = this.selectedType.label;
            this.triggerLabel.classList.remove(`${CLS}-trigger-placeholder`);
        }
        else
        {
            this.triggerLabel.textContent = "Select type\u2026";
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
            "aria-label": "Line types",
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

    // ── Private: list rendering ──

    private renderListItems(): void
    {
        if (!this.listEl) { return; }
        while (this.listEl.firstChild)
        {
            this.listEl.removeChild(this.listEl.firstChild);
        }
        this.highlightedIndex = -1;
        for (let i = 0; i < this.types.length; i++)
        {
            this.listEl.appendChild(this.buildTypeItem(this.types[i], i));
        }
    }

    private buildTypeItem(item: LineTypeItem, index: number): HTMLElement
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
        if (this.selectedType && this.selectedType.value === item.value)
        {
            li.classList.add(`${CLS}-item-selected`);
            setAttr(li, { "aria-selected": "true" });
        }
        this.appendItemContent(li, item);
        li.addEventListener("click", () => this.selectType(item, true));
        li.addEventListener("mouseenter", () => this.setHighlight(index));
        return li;
    }

    private appendItemContent(
        li: HTMLElement, item: LineTypeItem
    ): void
    {
        const previewWrap = createElement("div", [`${CLS}-item-preview`]);
        const svg = createDashPreview(
            item.dashArray,
            this.strokeWidth,
            PREVIEW_WIDTH,
            PREVIEW_HEIGHT
        );
        previewWrap.appendChild(svg);
        const label = createElement("span", [`${CLS}-item-label`], item.label);
        li.appendChild(previewWrap);
        li.appendChild(label);
    }

    // ── Private: dropdown state ──

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

    // ── Private: selection ──

    private selectType(item: LineTypeItem, fireEvent: boolean): void
    {
        this.selectedType = item;
        this.updateTriggerDisplay();
        if (this.isOpen) { this.closeDropdown(); }
        if (fireEvent) { safeCallback(this.opts.onChange, item); }
    }

    // ── Private: highlight navigation ──

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

    private getHighlightedType(): LineTypeItem | null
    {
        if (this.highlightedIndex < 0 ||
            this.highlightedIndex >= this.types.length)
        {
            return null;
        }
        return this.types[this.highlightedIndex];
    }

    // ── Private: keyboard ──

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
            const t = this.getHighlightedType();
            if (t) { this.selectType(t, true); }
        }
        else if (e.key === DEFAULT_KEY_BINDINGS.jumpToFirst)
        {
            e.preventDefault();
            this.setHighlight(0);
        }
        else if (e.key === DEFAULT_KEY_BINDINGS.jumpToLast)
        {
            e.preventDefault();
            if (this.types.length > 0)
            {
                this.setHighlight(this.types.length - 1);
            }
        }
    }

    // ── Private: global listeners ──

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

    // ── Private: helpers ──

    private findType(value: string): LineTypeItem | null
    {
        return this.types.find(t => t.value === value)
            || this.types.find(t => t.dashArray === value)
            || null;
    }
}

// ============================================================================
// S5: FACTORY & GLOBAL EXPORTS
// ============================================================================

/** Create a LineTypePicker and mount it in the given container. */
export function createLineTypePicker(
    containerId: string, options: LineTypePickerOptions
): LineTypePicker
{
    return new LineTypePicker(containerId, options);
}

(window as unknown as Record<string, unknown>)["LineTypePicker"] = LineTypePicker;
(window as unknown as Record<string, unknown>)["createLineTypePicker"] = createLineTypePicker;
