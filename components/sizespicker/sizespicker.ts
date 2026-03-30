/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * Repository: pvk2007/theme
 * File GUID: a3f7e9c1-5d24-4b8a-9e6f-1c8d3a7b5e02
 * Created: 2026-03-24
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: SizesPicker
 * PURPOSE: Dropdown listing page/frame sizes with proportional page thumbnails
 *    and dimensions. Trigger button + dropdown panel appended to body.
 *    Items are grouped by category with SVG page rectangles.
 * RELATES: [[EnterpriseTheme]], [[CustomComponents]], [[DiagramEngine]],
 *    [[RibbonBuilder]], [[MarginsPicker]], [[OrientationPicker]]
 * FLOW: [Consumer App] -> [createSizesPicker()] -> [trigger + dropdown panel]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// S1: INTERFACES
// ============================================================================

/** A single page/frame size preset. */
export interface SizePreset
{
    name: string;
    width: number;
    height: number;
    category?: string;
    displayWidth?: string;
    displayHeight?: string;
}

/** Configuration options for SizesPicker. */
export interface SizesPickerOptions
{
    /** Container element or ID. */
    container: HTMLElement | string;

    /** Initial selected preset name. Default: "Letter". */
    value?: string;

    /** Custom size definitions. Overrides defaults if provided. */
    sizes?: SizePreset[];

    /** Filter to one category. */
    category?: string;

    /** Show "More Paper Sizes..." link at bottom. Default: true. */
    showCustom?: boolean;

    /** Callback when a size is selected. */
    onChange?: (size: SizePreset) => void;

    /** Callback when "More Paper Sizes..." is clicked. */
    onCustom?: () => void;

    /** Render as ribbon-compatible dropdown. Default: true. */
    ribbonMode?: boolean;
}

/** Public API for the SizesPicker component. */
export interface SizesPickerAPI
{
    getValue(): SizePreset;
    setValue(sizeName: string): void;
    setSizes(sizes: SizePreset[]): void;
    show(): void;
    hide(): void;
    destroy(): void;
    getElement(): HTMLElement;
}

// ============================================================================
// S2: CONSTANTS
// ============================================================================

const LOG_PREFIX = "[SizesPicker]";
const _lu = (typeof (window as any).createLogUtility === "function") ? (window as any).createLogUtility().getLogger(LOG_PREFIX.slice(1, -1)) : null;
function logInfo(...a: unknown[]): void { _lu ? _lu.info(...a) : console.log(new Date().toISOString(), "[INFO]", LOG_PREFIX, ...a); }
function logWarn(...a: unknown[]): void { _lu ? _lu.warn(...a) : console.warn(new Date().toISOString(), "[WARN]", LOG_PREFIX, ...a); }
function logError(...a: unknown[]): void { _lu ? _lu.error(...a) : console.error(new Date().toISOString(), "[ERROR]", LOG_PREFIX, ...a); }
function logDebug(...a: unknown[]): void { _lu ? _lu.debug(...a) : console.debug(new Date().toISOString(), "[DEBUG]", LOG_PREFIX, ...a); }
function logTrace(...a: unknown[]): void { _lu ? _lu.trace(...a) : console.debug(new Date().toISOString(), "[TRACE]", LOG_PREFIX, ...a); }

const CLS = "sizespicker";
const SVG_NS = "http://www.w3.org/2000/svg";
const THUMB_MAX_HEIGHT = 40;
let instanceCounter = 0;

const DEFAULT_SIZES: SizePreset[] =
[
    { name: "Letter", width: 816, height: 1056, category: "Paper", displayWidth: '8.5"', displayHeight: '11"' },
    { name: "Legal", width: 816, height: 1344, category: "Paper", displayWidth: '8.5"', displayHeight: '14"' },
    { name: "A4", width: 794, height: 1123, category: "Paper", displayWidth: '8.27"', displayHeight: '11.69"' },
    { name: "A5", width: 559, height: 794, category: "Paper", displayWidth: '5.83"', displayHeight: '8.27"' },
    { name: "B5 (JIS)", width: 693, height: 979, category: "Paper", displayWidth: '7.17"', displayHeight: '10.12"' },
    { name: "Executive", width: 696, height: 1008, category: "Paper", displayWidth: '7.25"', displayHeight: '10.5"' },
    { name: "Full HD", width: 1920, height: 1080, category: "Screen", displayWidth: "1920", displayHeight: "1080" },
    { name: "iPhone 15", width: 393, height: 852, category: "Mobile", displayWidth: "393", displayHeight: "852" },
    { name: "iPad Air", width: 820, height: 1180, category: "Tablet", displayWidth: "820", displayHeight: "1180" },
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

function safeCallback<T extends unknown[]>(
    fn: ((...a: T) => void) | undefined, ...args: T
): void
{
    if (!fn) { return; }
    try { fn(...args); }
    catch (err) { logError("callback error:", err); }
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
// S4: SVG THUMBNAIL HELPER
// ============================================================================

/** Compute the scale factor so the tallest size fits in THUMB_MAX_HEIGHT. */
function computeThumbScale(sizes: SizePreset[]): number
{
    const maxHeight = Math.max(...sizes.map((s) => s.height));
    if (maxHeight <= 0) { return 1; }
    return THUMB_MAX_HEIGHT / maxHeight;
}

/** Render a proportional page thumbnail SVG for a given size. */
function renderPageThumbnail(
    preset: SizePreset, scale: number
): SVGElement
{
    const w = Math.max(Math.round(preset.width * scale), 8);
    const h = Math.max(Math.round(preset.height * scale), 12);
    const svgW = w + 2;
    const svgH = h + 2;

    const svg = createSvgElement("svg", {
        "width": String(svgW),
        "height": String(svgH),
        "viewBox": `0 0 ${svgW} ${svgH}`,
        "class": `${CLS}-thumb`,
        "aria-hidden": "true",
    });

    const rect = createSvgElement("rect", {
        "x": "1", "y": "1",
        "width": String(w),
        "height": String(h),
        "fill": "#ffffff",
        "stroke": "#dee2e6",
        "stroke-width": "1",
    });

    svg.appendChild(rect);
    return svg;
}

// ============================================================================
// S5: SIZE GROUPING
// ============================================================================

/** Group sizes by category, preserving insertion order. */
function groupByCategory(
    sizes: SizePreset[]
): Map<string, SizePreset[]>
{
    const groups = new Map<string, SizePreset[]>();
    for (const size of sizes)
    {
        const cat = size.category || "Other";
        if (!groups.has(cat))
        {
            groups.set(cat, []);
        }
        (groups.get(cat) as SizePreset[]).push(size);
    }
    return groups;
}

// ============================================================================
// S6: COMPONENT IMPLEMENTATION
// ============================================================================

export class SizesPicker implements SizesPickerAPI
{
    private readonly instanceId: string;
    private sizes: SizePreset[];
    private selected: SizePreset;
    private destroyed: boolean = false;
    private isOpen: boolean = false;
    private thumbScale: number = 1;

    private readonly showCustom: boolean;
    private readonly category: string | undefined;
    private onChange?: (size: SizePreset) => void;
    private onCustom?: (() => void) | undefined;

    // DOM refs
    private rootEl: HTMLElement | null = null;
    private triggerEl: HTMLElement | null = null;
    private panelEl: HTMLElement | null = null;
    private listEl: HTMLElement | null = null;

    // Bound handlers for cleanup
    private readonly boundDocClick: (e: MouseEvent) => void;
    private readonly boundDocKey: (e: KeyboardEvent) => void;

    constructor(options: SizesPickerOptions)
    {
        this.instanceId = `${CLS}-${++instanceCounter}`;
        this.showCustom = options.showCustom !== false;
        this.category = options.category;
        this.onChange = options.onChange;
        this.onCustom = options.onCustom;
        this.boundDocClick = (e: MouseEvent) => this.onDocumentClick(e);
        this.boundDocKey = (e: KeyboardEvent) => this.onDocumentKey(e);

        this.sizes = this.resolveSizes(options);
        this.thumbScale = computeThumbScale(this.sizes);
        this.selected = this.resolveInitialValue(options.value);

        this.mount(options.container);
        logInfo("created", this.instanceId);
    }

    // ── Public API ──

    /** Return the currently selected size preset (copy). */
    public getValue(): SizePreset
    {
        return { ...this.selected };
    }

    /** Select a size by name (case-insensitive). */
    public setValue(sizeName: string): void
    {
        const found = this.sizes.find(
            (s) => s.name.toLowerCase() === sizeName.toLowerCase()
        );
        if (!found)
        {
            logWarn("size not found:", sizeName);
            return;
        }
        this.selected = found;
        this.refreshSelection();
        this.updateTriggerLabel();
    }

    /** Replace the entire size list and re-render. */
    public setSizes(sizes: SizePreset[]): void
    {
        this.sizes = this.filterByCategory(sizes);
        this.thumbScale = computeThumbScale(this.sizes);

        const stillExists = this.sizes.find(
            (s) => s.name === this.selected.name
        );
        if (!stillExists && this.sizes.length > 0)
        {
            this.selected = this.sizes[0];
        }
        this.rebuildList();
        this.updateTriggerLabel();
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
        this.panelEl = null;
        this.listEl = null;
        logInfo("destroyed", this.instanceId);
    }

    /** Get the root DOM element. */
    public getElement(): HTMLElement
    {
        return this.rootEl as HTMLElement;
    }

    // ── Private: options resolution ──

    private resolveSizes(options: SizesPickerOptions): SizePreset[]
    {
        const raw = options.sizes || DEFAULT_SIZES;
        return this.filterByCategory(raw);
    }

    private filterByCategory(sizes: SizePreset[]): SizePreset[]
    {
        if (!this.category) { return [...sizes]; }
        return sizes.filter(
            (s) => (s.category || "").toLowerCase() === this.category!.toLowerCase()
        );
    }

    private resolveInitialValue(valueName?: string): SizePreset
    {
        if (valueName)
        {
            const found = this.sizes.find(
                (s) => s.name.toLowerCase() === valueName.toLowerCase()
            );
            if (found) { return found; }
        }
        return this.sizes.length > 0 ? this.sizes[0] : DEFAULT_SIZES[0];
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
            "aria-label": "Page size",
        });

        const label = createElement("span", [`${CLS}-trigger-label`]);
        label.textContent = this.selected.name;
        trigger.appendChild(label);

        const caret = createElement("i", [
            "bi", "bi-chevron-down", `${CLS}-trigger-caret`,
        ]);
        trigger.appendChild(caret);

        trigger.addEventListener("click", () => this.onTriggerClick());
        return trigger;
    }

    private updateTriggerLabel(): void
    {
        if (!this.triggerEl) { return; }
        const label = this.triggerEl.querySelector(`.${CLS}-trigger-label`);
        if (label) { label.textContent = this.selected.name; }
    }

    // ── Private: dropdown panel ──

    private buildPanel(): HTMLElement
    {
        const panel = createElement("div", [`${CLS}-panel`]);
        panel.style.display = "none";
        setAttr(panel, { "role": "listbox", "aria-label": "Page sizes" });

        this.listEl = createElement("div", [`${CLS}-list`]);
        this.appendGroupedItems(this.listEl);
        panel.appendChild(this.listEl);

        if (this.showCustom)
        {
            panel.appendChild(this.buildCustomLink());
        }
        return panel;
    }

    private appendGroupedItems(listEl: HTMLElement): void
    {
        const groups = groupByCategory(this.sizes);
        for (const [category, items] of groups)
        {
            listEl.appendChild(this.buildCategoryHeader(category));
            for (const preset of items)
            {
                listEl.appendChild(this.buildItem(preset));
            }
        }
    }

    private buildCategoryHeader(category: string): HTMLElement
    {
        const header = createElement(
            "div", [`${CLS}-category`], category
        );
        setAttr(header, { "role": "presentation" });
        return header;
    }

    private buildItem(preset: SizePreset): HTMLElement
    {
        const item = createElement("div", [`${CLS}-item`]);
        setAttr(item, {
            "role": "option",
            "data-size-name": preset.name,
            "aria-selected": String(preset.name === this.selected.name),
            "tabindex": "0",
        });

        if (preset.name === this.selected.name)
        {
            item.classList.add(`${CLS}-item--active`);
        }

        item.appendChild(this.buildItemContent(preset));
        item.addEventListener("click", () => this.onItemClick(preset));
        item.addEventListener("keydown", (e) => this.onItemKeydown(e, preset));
        return item;
    }

    private buildItemContent(preset: SizePreset): DocumentFragment
    {
        const frag = document.createDocumentFragment();
        const thumb = renderPageThumbnail(preset, this.thumbScale);
        frag.appendChild(thumb as unknown as Node);

        const info = createElement("div", [`${CLS}-info`]);
        info.appendChild(createElement("span", [`${CLS}-name`], preset.name));
        info.appendChild(createElement(
            "span", [`${CLS}-dims`], this.formatDimensions(preset)
        ));
        frag.appendChild(info);
        return frag;
    }

    private formatDimensions(preset: SizePreset): string
    {
        const w = preset.displayWidth || String(preset.width);
        const h = preset.displayHeight || String(preset.height);
        return `${w} x ${h}`;
    }

    private buildCustomLink(): HTMLElement
    {
        const link = createElement(
            "div", [`${CLS}-custom`], "More Paper Sizes\u2026"
        );
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
        this.appendGroupedItems(this.listEl);
    }

    private refreshSelection(): void
    {
        if (!this.listEl) { return; }
        const items = this.listEl.querySelectorAll(`.${CLS}-item`);
        for (const item of items)
        {
            const name = item.getAttribute("data-size-name");
            const isActive = name === this.selected.name;
            item.classList.toggle(`${CLS}-item--active`, isActive);
            item.setAttribute("aria-selected", String(isActive));
        }
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
        if (!this.panelEl) { return; }
        const sel = this.panelEl.querySelector(
            `.${CLS}-item--active`
        ) as HTMLElement | null;
        if (sel) { sel.focus(); }
    }

    // ── Private: event handlers ──

    private onTriggerClick(): void
    {
        if (this.isOpen) { this.closePanel(); }
        else { this.openPanel(); }
    }

    private onItemClick(preset: SizePreset): void
    {
        this.selected = preset;
        this.refreshSelection();
        this.updateTriggerLabel();
        this.closePanel();
        safeCallback(this.onChange, { ...preset });
    }

    private onItemKeydown(e: KeyboardEvent, preset: SizePreset): void
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
        const inRoot = this.rootEl.contains(target);
        const inPanel = this.panelEl && this.panelEl.contains(target);
        if (!inRoot && !inPanel)
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

/** Create a SizesPicker and mount it in the given container. */
export function createSizesPicker(
    options: SizesPickerOptions
): SizesPickerAPI
{
    return new SizesPicker(options);
}

(window as unknown as Record<string, unknown>)["SizesPicker"] = SizesPicker;
(window as unknown as Record<string, unknown>)["createSizesPicker"] = createSizesPicker;
