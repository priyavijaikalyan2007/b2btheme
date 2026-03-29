/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * Repository: pvk2007/theme
 * File GUID: d4e2a1c7-8f3b-4a9e-b6d1-7c5e3f2a9b84
 * Created: 2026-03-24
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: MarginsPicker
 * PURPOSE: Dropdown showing page margin presets with SVG page thumbnails
 *    illustrating margin boundaries, preset name, and exact values.
 *    Modelled after Microsoft Word's Margins dropdown.
 * RELATES: [[EnterpriseTheme]], [[CustomComponents]], [[RibbonBuilder]],
 *    [[DiagramEngine]], [[SizesPicker]], [[OrientationPicker]]
 * FLOW: [Consumer App] -> [createMarginsPicker()] -> [Dropdown preset list]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// S1: INTERFACES
// ============================================================================

/** A single margin preset definition. Values are in inches. */
export interface MarginPreset
{
    /** Display name for this preset (e.g. "Normal", "Narrow"). */
    name: string;

    /** Top margin in inches. */
    top: number;

    /** Bottom margin in inches. */
    bottom: number;

    /** Left margin in inches (ignored when inside/outside are set). */
    left: number;

    /** Right margin in inches (ignored when inside/outside are set). */
    right: number;

    /** Inside margin for mirrored layouts (optional). */
    inside?: number;

    /** Outside margin for mirrored layouts (optional). */
    outside?: number;

    /** Optional Bootstrap icon override. */
    icon?: string;
}

/** Configuration options for MarginsPicker. */
export interface MarginsPickerOptions
{
    /** Container element or ID. */
    container: HTMLElement | string;

    /** Initial selected preset name. Default: "Normal". */
    value?: string;

    /** Custom preset definitions. Overrides defaults if provided. */
    presets?: MarginPreset[];

    /** Show "Custom Margins..." link at bottom. Default: true. */
    showCustom?: boolean;

    /** Callback when a preset is selected. */
    onChange?: (preset: MarginPreset) => void;

    /** Callback when "Custom Margins..." is clicked. */
    onCustom?: () => void;

    /** Render as ribbon-compatible dropdown. Default: true. */
    ribbonMode?: boolean;
}

/** Public API surface for the MarginsPicker component. */
export interface MarginsPickerAPI
{
    getValue(): MarginPreset;
    setValue(presetName: string): void;
    setPresets(presets: MarginPreset[]): void;
    show(): void;
    hide(): void;
    destroy(): void;
    getElement(): HTMLElement;
}

// ============================================================================
// S2: CONSTANTS
// ============================================================================

const LOG_PREFIX = "[MarginsPicker]";
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

const CLS = "marginspicker";
const SVG_NS = "http://www.w3.org/2000/svg";
let instanceCounter = 0;

/** SVG page thumbnail dimensions. */
const THUMB_W = 40;
const THUMB_H = 52;

/** Maximum margin value used for proportional scaling (inches). */
const MAX_MARGIN_INCHES = 2.5;

const DEFAULT_PRESETS: MarginPreset[] =
[
    { name: "Normal", top: 1, bottom: 1, left: 1, right: 1 },
    { name: "Narrow", top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 },
    { name: "Moderate", top: 1, bottom: 1, left: 0.75, right: 0.75 },
    { name: "Wide", top: 1, bottom: 1, left: 2, right: 2 },
    { name: "Mirrored", top: 1, bottom: 1, left: 1.25, right: 1, inside: 1.25, outside: 1 },
    { name: "None", top: 0, bottom: 0, left: 0, right: 0 },
];

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

function safeCallback<T extends unknown[]>(
    fn: ((...a: T) => void) | undefined, ...args: T
): void
{
    if (!fn) { return; }
    try { fn(...args); }
    catch (err) { logError("callback error:", err); }
}

// ============================================================================
// S4: SVG THUMBNAIL HELPERS
// ============================================================================

/** Scale an inch value to SVG pixels proportionally. */
function marginToPx(inches: number, maxPx: number): number
{
    const clamped = Math.min(inches, MAX_MARGIN_INCHES);
    return Math.round((clamped / MAX_MARGIN_INCHES) * maxPx * 0.4);
}

/** Resolve effective left/right margins, handling mirrored presets. */
function effectiveLeftRight(
    preset: MarginPreset
): { left: number; right: number }
{
    const left = (preset.inside !== undefined) ? preset.inside : preset.left;
    const right = (preset.outside !== undefined) ? preset.outside : preset.right;
    return { left, right };
}

/** Build a small page thumbnail SVG showing margin boundaries. */
function buildThumbnailSvg(preset: MarginPreset): SVGElement
{
    const svg = createSvgElement("svg", {
        "width": String(THUMB_W),
        "height": String(THUMB_H),
        "viewBox": `0 0 ${THUMB_W} ${THUMB_H}`,
        "class": `${CLS}-thumb`,
        "aria-hidden": "true",
    });

    appendPageRect(svg);
    appendMarginGuides(svg, preset);
    appendContentRect(svg, preset);
    return svg;
}

/** Draw the outer page border rectangle. */
function appendPageRect(svg: SVGElement): void
{
    const rect = createSvgElement("rect", {
        "x": "0.5", "y": "0.5",
        "width": String(THUMB_W - 1),
        "height": String(THUMB_H - 1),
        "fill": "var(--theme-surface-bg, #ffffff)",
        "stroke": "#dee2e6",
        "stroke-width": "1",
    });
    svg.appendChild(rect);
}

/** Draw dashed margin boundary lines. */
function appendMarginGuides(
    svg: SVGElement, preset: MarginPreset
): void
{
    const { left, right } = effectiveLeftRight(preset);
    const mTop = marginToPx(preset.top, THUMB_H);
    const mBottom = marginToPx(preset.bottom, THUMB_H);
    const mLeft = marginToPx(left, THUMB_W);
    const mRight = marginToPx(right, THUMB_W);

    const guideAttrs = {
        "stroke": "#adb5bd",
        "stroke-width": "0.5",
        "stroke-dasharray": "2 2",
    };

    appendDashedLine(svg, mLeft, 0, mLeft, THUMB_H, guideAttrs);
    appendDashedLine(svg, THUMB_W - mRight, 0, THUMB_W - mRight, THUMB_H, guideAttrs);
    appendDashedLine(svg, 0, mTop, THUMB_W, mTop, guideAttrs);
    appendDashedLine(svg, 0, THUMB_H - mBottom, THUMB_W, THUMB_H - mBottom, guideAttrs);
}

/** Draw a single dashed line in the SVG. */
function appendDashedLine(
    svg: SVGElement,
    x1: number, y1: number,
    x2: number, y2: number,
    attrs: Record<string, string>
): void
{
    const line = createSvgElement("line", {
        "x1": String(x1), "y1": String(y1),
        "x2": String(x2), "y2": String(y2),
        ...attrs,
    });
    svg.appendChild(line);
}

/** Draw the inner content area rectangle. */
function appendContentRect(
    svg: SVGElement, preset: MarginPreset
): void
{
    const { left, right } = effectiveLeftRight(preset);
    const mTop = marginToPx(preset.top, THUMB_H);
    const mBottom = marginToPx(preset.bottom, THUMB_H);
    const mLeft = marginToPx(left, THUMB_W);
    const mRight = marginToPx(right, THUMB_W);

    const x = mLeft;
    const y = mTop;
    const w = Math.max(THUMB_W - mLeft - mRight, 2);
    const h = Math.max(THUMB_H - mTop - mBottom, 2);

    const rect = createSvgElement("rect", {
        "x": String(x), "y": String(y),
        "width": String(w), "height": String(h),
        "fill": "var(--theme-hover-bg, #f8f9fa)",
        "stroke": "none",
    });
    svg.appendChild(rect);
}

// ============================================================================
// S5: ITEM RENDERING HELPERS
// ============================================================================

/** Format a margin value for display (e.g. 1 -> '1"', 0.75 -> '0.75"'). */
function formatInches(value: number): string
{
    return `${value}"`;
}

/** Build the text detail block for a preset item. */
function buildItemDetails(preset: MarginPreset): HTMLElement
{
    const details = createElement("div", [`${CLS}-item-details`]);
    const nameEl = createElement("div", [`${CLS}-item-name`], preset.name);
    details.appendChild(nameEl);

    const vals = buildValueLines(preset);
    details.appendChild(vals);
    return details;
}

/** Build the two rows of Top/Bottom, Left/Right values. */
function buildValueLines(preset: MarginPreset): HTMLElement
{
    const wrap = createElement("div", [`${CLS}-item-values`]);
    const isMirrored = (preset.inside !== undefined);

    const row1 = buildValueRow(
        "Top", formatInches(preset.top),
        "Bottom", formatInches(preset.bottom)
    );
    wrap.appendChild(row1);

    if (isMirrored)
    {
        const row2 = buildValueRow(
            "Inside", formatInches(preset.inside!),
            "Outside", formatInches(preset.outside!)
        );
        wrap.appendChild(row2);
    }
    else
    {
        const row2 = buildValueRow(
            "Left", formatInches(preset.left),
            "Right", formatInches(preset.right)
        );
        wrap.appendChild(row2);
    }
    return wrap;
}

/** Build a single value row with two label-value pairs. */
function buildValueRow(
    label1: string, val1: string,
    label2: string, val2: string
): HTMLElement
{
    const row = createElement("div", [`${CLS}-item-row`]);
    row.appendChild(createElement("span", [`${CLS}-item-label`], `${label1}:`));
    row.appendChild(createElement("span", [`${CLS}-item-val`], val1));
    row.appendChild(createElement("span", [`${CLS}-item-label`], `${label2}:`));
    row.appendChild(createElement("span", [`${CLS}-item-val`], val2));
    return row;
}

// ============================================================================
// S6: MAIN CLASS
// ============================================================================

export class MarginsPicker implements MarginsPickerAPI
{
    private readonly instanceId: string;
    private presets: MarginPreset[];
    private selectedName: string;
    private showCustom: boolean;
    private destroyed: boolean = false;
    private isOpen: boolean = false;

    // Callbacks
    private onChange?: (preset: MarginPreset) => void;
    private onCustom?: () => void;

    // DOM refs
    private rootEl: HTMLElement | null = null;
    private triggerEl: HTMLElement | null = null;
    private panelEl: HTMLElement | null = null;
    private listEl: HTMLElement | null = null;

    // Bound handlers for cleanup
    private readonly boundDocClick: (e: MouseEvent) => void;
    private readonly boundDocKey: (e: KeyboardEvent) => void;

    constructor(options: MarginsPickerOptions)
    {
        this.instanceId = `${CLS}-${++instanceCounter}`;
        this.presets = options.presets ?? [...DEFAULT_PRESETS];
        this.selectedName = options.value ?? "Normal";
        this.showCustom = options.showCustom ?? true;
        this.onChange = options.onChange;
        this.onCustom = options.onCustom;
        this.boundDocClick = (e: MouseEvent) => this.onDocumentClick(e);
        this.boundDocKey = (e: KeyboardEvent) => this.onDocumentKey(e);
        this.mount(options.container);
        logInfo("created", this.instanceId);
    }

    // ── Public API ──

    /** Return the currently selected preset. */
    public getValue(): MarginPreset
    {
        const found = this.presets.find(p => p.name === this.selectedName);
        return found ?? this.presets[0];
    }

    /** Select a preset by name. */
    public setValue(presetName: string): void
    {
        const found = this.presets.find(p => p.name === presetName);
        if (!found)
        {
            logWarn("preset not found:", presetName);
            return;
        }
        this.selectedName = presetName;
        this.refreshSelection();
    }

    /** Replace the entire preset list and re-render. */
    public setPresets(presets: MarginPreset[]): void
    {
        this.presets = [...presets];
        if (!this.presets.find(p => p.name === this.selectedName))
        {
            this.selectedName = this.presets[0]?.name ?? "";
        }
        this.rebuildList();
    }

    /** Open the dropdown panel. */
    public show(): void
    {
        if (this.isOpen || this.destroyed) { return; }
        this.openPanel();
    }

    /** Close the dropdown panel. */
    public hide(): void
    {
        if (!this.isOpen) { return; }
        this.closePanel();
    }

    /** Tear down and remove from DOM. */
    public destroy(): void
    {
        if (this.destroyed) { return; }
        this.destroyed = true;
        this.removeGlobalListeners();
        if (this.panelEl && this.panelEl.parentElement)
        {
            this.panelEl.parentElement.removeChild(this.panelEl);
        }
        if (this.rootEl && this.rootEl.parentElement)
        {
            this.rootEl.parentElement.removeChild(this.rootEl);
        }
        this.rootEl = null;
        logInfo("destroyed", this.instanceId);
    }

    /** Get the root DOM element. */
    public getElement(): HTMLElement
    {
        return this.rootEl as HTMLElement;
    }

    // ── Private: mounting ──

    private mount(container: HTMLElement | string): void
    {
        const parent = resolveContainer(container);
        if (!parent)
        {
            logWarn("container not found:", container);
            return;
        }
        this.rootEl = this.buildRoot();
        parent.appendChild(this.rootEl);
    }

    private buildRoot(): HTMLElement
    {
        const root = createElement("div", [CLS]);
        root.id = this.instanceId;

        this.triggerEl = this.buildTrigger();
        root.appendChild(this.triggerEl);

        this.panelEl = this.buildPanel();
        // Panel is appended to document.body on open, not to root
        return root;
    }

    // ── Private: trigger button ──

    private buildTrigger(): HTMLElement
    {
        const trigger = createElement("button", [`${CLS}-trigger`]);
        setAttr(trigger, {
            "type": "button",
            "aria-expanded": "false",
            "aria-haspopup": "listbox",
            "aria-label": "Margins",
        });

        const label = createElement("span", [`${CLS}-trigger-label`]);
        label.textContent = this.selectedName;
        trigger.appendChild(label);

        const caret = createElement("i", ["bi", "bi-chevron-down", `${CLS}-trigger-caret`]);
        trigger.appendChild(caret);

        trigger.addEventListener("click", () => this.onTriggerClick());
        return trigger;
    }

    private updateTriggerLabel(): void
    {
        if (!this.triggerEl) { return; }
        const label = this.triggerEl.querySelector(`.${CLS}-trigger-label`);
        if (label) { label.textContent = this.selectedName; }
    }

    // ── Private: dropdown panel ──

    private buildPanel(): HTMLElement
    {
        const panel = createElement("div", [`${CLS}-panel`]);
        panel.style.display = "none";
        setAttr(panel, { "role": "listbox", "aria-label": "Margin presets" });

        this.listEl = createElement("div", [`${CLS}-list`]);
        this.appendPresetItems(this.listEl);
        panel.appendChild(this.listEl);

        if (this.showCustom)
        {
            panel.appendChild(this.buildCustomLink());
        }
        return panel;
    }

    private appendPresetItems(list: HTMLElement): void
    {
        for (const preset of this.presets)
        {
            list.appendChild(this.buildPresetItem(preset));
        }
    }

    private buildPresetItem(preset: MarginPreset): HTMLElement
    {
        const item = createElement("div", [`${CLS}-item`]);
        setAttr(item, {
            "role": "option",
            "tabindex": "0",
            "data-preset": preset.name,
            "aria-selected": String(preset.name === this.selectedName),
        });

        if (preset.name === this.selectedName)
        {
            item.classList.add(`${CLS}-item--selected`);
        }

        const thumb = buildThumbnailSvg(preset);
        item.appendChild(thumb as unknown as Node);

        const details = buildItemDetails(preset);
        item.appendChild(details);

        item.addEventListener("click", () => this.onItemClick(preset));
        item.addEventListener("keydown", (e) => this.onItemKeydown(e, preset));
        return item;
    }

    private buildCustomLink(): HTMLElement
    {
        const link = createElement("div", [`${CLS}-custom`]);
        link.textContent = "Custom Margins\u2026";
        setAttr(link, { "role": "button", "tabindex": "0" });
        link.addEventListener("click", () => this.onCustomClick());
        link.addEventListener("keydown", (e) =>
        {
            if (e.key === "Enter" || e.key === " ")
            {
                e.preventDefault();
                this.onCustomClick();
            }
        });
        return link;
    }

    // ── Private: list rebuild ──

    private rebuildList(): void
    {
        if (!this.listEl) { return; }
        this.listEl.innerHTML = "";
        this.appendPresetItems(this.listEl);
        this.updateTriggerLabel();
    }

    private refreshSelection(): void
    {
        if (!this.listEl) { return; }
        const items = this.listEl.querySelectorAll(`.${CLS}-item`);
        for (const item of items)
        {
            const name = item.getAttribute("data-preset");
            const isSelected = (name === this.selectedName);
            item.classList.toggle(`${CLS}-item--selected`, isSelected);
            item.setAttribute("aria-selected", String(isSelected));
        }
        this.updateTriggerLabel();
    }

    // ── Private: open/close panel ──

    /** Position the panel below the trigger using fixed coordinates. */
    private positionPanel(): void
    {
        if (!this.triggerEl || !this.panelEl) { return; }

        const rect = this.triggerEl.getBoundingClientRect();
        this.panelEl.style.position = "fixed";
        this.panelEl.style.left = rect.left + "px";
        this.panelEl.style.top = (rect.bottom + 2) + "px";
        this.panelEl.style.minWidth = rect.width + "px";
        this.panelEl.style.zIndex = "1050";
    }

    private openPanel(): void
    {
        if (!this.panelEl || !this.rootEl) { return; }
        this.isOpen = true;
        if (this.panelEl.parentElement !== document.body)
        {
            document.body.appendChild(this.panelEl);
        }
        this.panelEl.style.display = "block";
        this.rootEl.classList.add(`${CLS}--open`);
        if (this.triggerEl)
        {
            setAttr(this.triggerEl, { "aria-expanded": "true" });
        }
        this.positionPanel();
        this.addGlobalListeners();
        this.focusSelected();
        logDebug("panel opened");
    }

    private closePanel(): void
    {
        if (!this.panelEl) { return; }
        this.isOpen = false;
        this.panelEl.style.display = "none";
        this.rootEl?.classList.remove(`${CLS}--open`);
        if (this.triggerEl)
        {
            setAttr(this.triggerEl, { "aria-expanded": "false" });
            this.triggerEl.focus();
        }
        this.removeGlobalListeners();
        logDebug("panel closed");
    }

    private focusSelected(): void
    {
        if (!this.listEl) { return; }
        const sel = this.listEl.querySelector(`.${CLS}-item--selected`) as HTMLElement | null;
        if (sel) { sel.focus(); }
    }

    // ── Private: event handlers ──

    private onTriggerClick(): void
    {
        if (this.isOpen) { this.closePanel(); }
        else { this.openPanel(); }
    }

    private onItemClick(preset: MarginPreset): void
    {
        this.selectedName = preset.name;
        this.refreshSelection();
        this.closePanel();
        safeCallback(this.onChange, preset);
    }

    private onItemKeydown(e: KeyboardEvent, preset: MarginPreset): void
    {
        if (e.key === "Enter" || e.key === " ")
        {
            e.preventDefault();
            this.onItemClick(preset);
        }
        if (e.key === "Escape")
        {
            e.preventDefault();
            this.closePanel();
        }
    }

    private onCustomClick(): void
    {
        this.closePanel();
        safeCallback(this.onCustom);
    }

    private onDocumentClick(e: MouseEvent): void
    {
        if (!this.rootEl || !this.isOpen) { return; }
        const target = e.target as Node;
        if (!this.rootEl.contains(target) && !(this.panelEl && this.panelEl.contains(target)))
        {
            this.closePanel();
        }
    }

    private onDocumentKey(e: KeyboardEvent): void
    {
        if (!this.isOpen) { return; }
        if (e.key === "Escape")
        {
            e.stopPropagation();
            this.closePanel();
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
}

// ============================================================================
// S7: FACTORY & GLOBAL EXPORTS
// ============================================================================

/** Create a MarginsPicker and mount it in the given container. */
export function createMarginsPicker(
    options: MarginsPickerOptions
): MarginsPickerAPI
{
    return new MarginsPicker(options);
}

(window as unknown as Record<string, unknown>)["MarginsPicker"] = MarginsPicker;
(window as unknown as Record<string, unknown>)["createMarginsPicker"] = createMarginsPicker;
