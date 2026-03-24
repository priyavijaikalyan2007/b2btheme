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
 *    and dimensions. Items are grouped by category with SVG page rectangles.
 * RELATES: [[EnterpriseTheme]], [[CustomComponents]], [[DiagramEngine]],
 *    [[RibbonBuilder]]
 * FLOW: [Consumer App] -> [createSizesPicker()] -> [dropdown with size items]
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
export interface SizesPicker
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
    catch (err) { console.error(LOG_PREFIX, "callback error:", err); }
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

class SizesPickerImpl
{
    private readonly instanceId: string;
    private sizes: SizePreset[];
    private selected: SizePreset;
    private isVisible: boolean = true;
    private destroyed: boolean = false;
    private thumbScale: number = 1;

    private readonly showCustom: boolean;
    private readonly category: string | undefined;
    private readonly onChange: ((size: SizePreset) => void) | undefined;
    private readonly onCustom: (() => void) | undefined;

    private rootEl: HTMLElement | null = null;
    private listEl: HTMLElement | null = null;
    private containerEl: HTMLElement | null = null;

    constructor(options: SizesPickerOptions)
    {
        this.instanceId = `${CLS}-${++instanceCounter}`;
        this.showCustom = options.showCustom !== false;
        this.category = options.category;
        this.onChange = options.onChange;
        this.onCustom = options.onCustom;

        this.sizes = this.resolveSizes(options);
        this.thumbScale = computeThumbScale(this.sizes);
        this.selected = this.resolveInitialValue(options.value);

        this.render(options.container);
        console.log(LOG_PREFIX, "created", this.instanceId);
    }

    // ── Public API ──

    public getValue(): SizePreset
    {
        return { ...this.selected };
    }

    public setValue(sizeName: string): void
    {
        const found = this.sizes.find(
            (s) => s.name.toLowerCase() === sizeName.toLowerCase()
        );
        if (!found)
        {
            console.warn(LOG_PREFIX, "size not found:", sizeName);
            return;
        }
        this.selected = found;
        this.updateSelection();
    }

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
    }

    /** Position the panel below its container using fixed coordinates. */
    private positionPanel(): void
    {
        if (!this.containerEl || !this.rootEl) { return; }

        const rect = this.containerEl.getBoundingClientRect();
        this.rootEl.style.position = "fixed";
        this.rootEl.style.left = rect.left + "px";
        this.rootEl.style.top = (rect.bottom + 2) + "px";
        this.rootEl.style.minWidth = rect.width + "px";
        this.rootEl.style.zIndex = "1050";
    }

    public show(): void
    {
        if (this.rootEl)
        {
            if (this.rootEl.parentElement !== document.body)
            {
                document.body.appendChild(this.rootEl);
            }
            this.rootEl.style.display = "";
            this.positionPanel();
            this.isVisible = true;
        }
    }

    public hide(): void
    {
        if (this.rootEl)
        {
            this.rootEl.style.display = "none";
            this.isVisible = false;
        }
    }

    public destroy(): void
    {
        if (this.destroyed) { return; }
        this.destroyed = true;
        if (this.rootEl && this.rootEl.parentElement)
        {
            this.rootEl.parentElement.removeChild(this.rootEl);
        }
        this.rootEl = null;
        this.listEl = null;
        console.log(LOG_PREFIX, "destroyed", this.instanceId);
    }

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

    // ── Private: rendering ──

    private render(container: HTMLElement | string): void
    {
        const parentEl = resolveContainer(container);
        if (!parentEl)
        {
            console.warn(LOG_PREFIX, "container not found:", container);
            return;
        }
        this.containerEl = parentEl;
        this.rootEl = this.buildRoot();
        // Panel is appended to document.body on show, not to container
    }

    private buildRoot(): HTMLElement
    {
        const root = createElement("div", [CLS]);
        root.id = this.instanceId;
        setAttr(root, { "role": "listbox", "aria-label": "Page sizes" });

        this.listEl = createElement("div", [`${CLS}-list`]);
        this.appendGroupedItems(this.listEl);
        root.appendChild(this.listEl);

        if (this.showCustom)
        {
            root.appendChild(this.buildCustomLink());
        }
        return root;
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
        link.addEventListener("click", () => safeCallback(this.onCustom));
        link.addEventListener("keydown", (e) =>
        {
            if (e.key === "Enter" || e.key === " ")
            {
                e.preventDefault();
                safeCallback(this.onCustom);
            }
        });
        return link;
    }

    // ── Private: selection ──

    private onItemClick(preset: SizePreset): void
    {
        this.selected = preset;
        this.updateSelection();
        safeCallback(this.onChange, { ...preset });
    }

    private onItemKeydown(e: KeyboardEvent, preset: SizePreset): void
    {
        if (e.key === "Enter" || e.key === " ")
        {
            e.preventDefault();
            this.onItemClick(preset);
        }
    }

    private updateSelection(): void
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

    private rebuildList(): void
    {
        if (!this.listEl) { return; }
        this.listEl.innerHTML = "";
        this.appendGroupedItems(this.listEl);
    }
}

// ============================================================================
// S7: FACTORY & GLOBAL EXPORTS
// ============================================================================

/** Create a SizesPicker and mount it in the given container. */
export function createSizesPicker(
    options: SizesPickerOptions
): SizesPicker
{
    return new SizesPickerImpl(options) as unknown as SizesPicker;
}

(window as unknown as Record<string, unknown>)["createSizesPicker"] = createSizesPicker;
