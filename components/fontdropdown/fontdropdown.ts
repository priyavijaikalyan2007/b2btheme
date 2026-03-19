/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: FontDropdown
 * 📜 PURPOSE: A dropdown that displays font names rendered in their own
 *    typeface, with search filtering, recently-used tracking, and a curated
 *    library of ~50 Google Fonts lazy-loaded from the Google Fonts CDN.
 * 🔗 RELATES: [[EnterpriseTheme]], [[CustomComponents]], [[EditableComboBox]]
 * ⚡ FLOW: [Consumer App] -> [createFontDropdown()] -> [DOM trigger + dropdown]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// S1: INTERFACES
// ============================================================================

/** A single font entry in the dropdown. */
export interface FontItem
{
    /** Display name shown in the dropdown (e.g. "Arial"). */
    label: string;
    /** CSS font-family value (e.g. "Arial, sans-serif"). */
    value: string;
    /** Category for grouping: "sans-serif", "serif", "monospace", "display". */
    category?: string;
    /** Whether this font requires Google Fonts CDN loading. */
    googleFont?: boolean;
}

/** Configuration options for FontDropdown. */
export interface FontDropdownOptions
{
    /** Custom font list; defaults to curated Google + system fonts if omitted. */
    fonts?: FontItem[];
    /** Initially selected font value. */
    value?: string;
    /** Placeholder text when no font is selected. */
    placeholder?: string;
    /** Show recently-used fonts section. Default: false. */
    showRecent?: boolean;
    /** Maximum number of recent fonts to remember. Default: 5. */
    maxRecent?: number;
    /** Optional preview text shown beside each font name. */
    previewText?: string;
    /** Size variant. */
    size?: "mini" | "sm" | "default" | "lg";
    /** Disable the dropdown. */
    disabled?: boolean;
    /** Max visible items before scrolling. Default: 8. */
    maxVisibleItems?: number;
    /** Group fonts by category headers. Default: true for default fonts. */
    groupByCategory?: boolean;
    /** Fires when the selected font changes. */
    onChange?: (font: FontItem) => void;
    /** Fires when the dropdown opens. */
    onOpen?: () => void;
    /** Fires when the dropdown closes. */
    onClose?: () => void;
    /** Override default keyboard bindings. */
    keyBindings?: Partial<Record<string, string>>;
}

// ============================================================================
// S2: CONSTANTS
// ============================================================================

const LOG_PREFIX = "[FontDropdown]";
const CLS = "fontdropdown";
const DEFAULT_MAX_VISIBLE = 8;
const DEFAULT_MAX_RECENT = 5;
const ITEM_HEIGHT_PX = 34;
const RECENT_STORAGE_KEY = "fontdropdown-recent";
let instanceCounter = 0;

const DEFAULT_KEY_BINDINGS: Record<string, string> =
{
    openOrMoveDown: "ArrowDown",
    openOrMoveUp: "ArrowUp",
    confirmSelection: "Enter",
    closeDropdown: "Escape",
    jumpToFirst: "Home",
    jumpToLast: "End",
    pageDown: "PageDown",
    pageUp: "PageUp",
};

const CATEGORY_ORDER = ["sans-serif", "serif", "monospace", "display"];

const CATEGORY_LABELS: Record<string, string> =
{
    "sans-serif": "Sans Serif",
    "serif": "Serif",
    "monospace": "Monospace",
    "display": "Display",
};

// ============================================================================
// S2A: GOOGLE FONT LOADER
// ============================================================================
// Lazy-loads Google Fonts CSS from the CDN. Preview subsets use &text= to
// minimise payload (~200 bytes/font). Full loads fetch all weights.

const loadedFontUrls = new Set<string>();

function ensurePreconnect(): void
{
    const origins = [
        "https://fonts.googleapis.com",
        "https://fonts.gstatic.com",
    ];
    for (const origin of origins)
    {
        if (document.querySelector(`link[rel="preconnect"][href="${origin}"]`))
        {
            continue;
        }
        const link = document.createElement("link");
        link.rel = "preconnect";
        link.href = origin;
        if (origin.includes("gstatic")) { link.crossOrigin = "anonymous"; }
        document.head.appendChild(link);
    }
}

function injectFontLink(url: string): void
{
    if (loadedFontUrls.has(url)) { return; }
    loadedFontUrls.add(url);
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = url;
    document.head.appendChild(link);
}

function loadPreviewBatch(fonts: FontItem[]): void
{
    const googleFonts = fonts.filter(f => f.googleFont);
    if (googleFonts.length === 0) { return; }
    ensurePreconnect();
    const families = googleFonts
        .map(f => `family=${encodeURIComponent(f.label)}`)
        .join("&");
    const url = `https://fonts.googleapis.com/css2?${families}`
        + "&text=AaBbCcDdEeFfGg0123&display=swap";
    injectFontLink(url);
}

function loadFullFont(fontLabel: string): void
{
    ensurePreconnect();
    const encoded = encodeURIComponent(fontLabel);
    const url = `https://fonts.googleapis.com/css2`
        + `?family=${encoded}:wght@100..900&display=swap`;
    injectFontLink(url);
}

// ============================================================================
// S2B: CURATED FONT LIST
// ============================================================================
// Selected by: reputable foundries, multiple weights (400+700+italic min),
// high x-height, open apertures, clear l/1/I distinction, screen legibility.

function gfont(label: string, category: string): FontItem
{
    const fallback = category === "monospace" ? "monospace"
        : category === "serif" ? "serif" : "sans-serif";
    return {
        label,
        value: `'${label}', ${fallback}`,
        category,
        googleFont: true,
    };
}

function sfont(
    label: string, fallback: string, category: string
): FontItem
{
    return { label, value: `${label}, ${fallback}`, category };
}

function buildGoogleSansSerif(): FontItem[]
{
    return [
        gfont("Inter", "sans-serif"),
        gfont("Open Sans", "sans-serif"),
        gfont("Roboto", "sans-serif"),
        gfont("Lato", "sans-serif"),
        gfont("Montserrat", "sans-serif"),
        gfont("Poppins", "sans-serif"),
        gfont("Nunito", "sans-serif"),
        gfont("Source Sans 3", "sans-serif"),
        gfont("Work Sans", "sans-serif"),
        gfont("Raleway", "sans-serif"),
        gfont("DM Sans", "sans-serif"),
        gfont("IBM Plex Sans", "sans-serif"),
        gfont("Noto Sans", "sans-serif"),
        gfont("Fira Sans", "sans-serif"),
        gfont("Atkinson Hyperlegible", "sans-serif"),
        gfont("PT Sans", "sans-serif"),
        gfont("Outfit", "sans-serif"),
        gfont("Plus Jakarta Sans", "sans-serif"),
    ];
}

function buildGoogleSerif(): FontItem[]
{
    return [
        gfont("Merriweather", "serif"),
        gfont("Playfair Display", "serif"),
        gfont("Lora", "serif"),
        gfont("Source Serif 4", "serif"),
        gfont("Noto Serif", "serif"),
        gfont("PT Serif", "serif"),
        gfont("Libre Baskerville", "serif"),
        gfont("EB Garamond", "serif"),
        gfont("Crimson Text", "serif"),
        gfont("IBM Plex Serif", "serif"),
        gfont("Bitter", "serif"),
        gfont("Spectral", "serif"),
    ];
}

function buildGoogleMonospace(): FontItem[]
{
    return [
        gfont("JetBrains Mono", "monospace"),
        gfont("Fira Code", "monospace"),
        gfont("Source Code Pro", "monospace"),
        gfont("IBM Plex Mono", "monospace"),
        gfont("Roboto Mono", "monospace"),
        gfont("Space Mono", "monospace"),
        gfont("Inconsolata", "monospace"),
        gfont("DM Mono", "monospace"),
    ];
}

function buildGoogleDisplay(): FontItem[]
{
    return [
        gfont("Oswald", "display"),
        gfont("Bebas Neue", "display"),
        gfont("Archivo", "display"),
        gfont("Sora", "display"),
        gfont("Lexend", "display"),
        gfont("Fredoka", "display"),
        gfont("Rubik", "display"),
        gfont("Cabin", "display"),
        gfont("Barlow", "display"),
        gfont("Josefin Sans", "display"),
    ];
}

function buildSystemFonts(): FontItem[]
{
    return [
        sfont("Arial", "sans-serif", "sans-serif"),
        sfont("Calibri", "sans-serif", "sans-serif"),
        sfont("Helvetica", "sans-serif", "sans-serif"),
        sfont("Tahoma", "sans-serif", "sans-serif"),
        sfont("'Trebuchet MS'", "sans-serif", "sans-serif"),
        sfont("Verdana", "sans-serif", "sans-serif"),
        sfont("Cambria", "serif", "serif"),
        sfont("Georgia", "serif", "serif"),
        sfont("Palatino", "serif", "serif"),
        sfont("'Times New Roman'", "serif", "serif"),
        sfont("Consolas", "monospace", "monospace"),
        sfont("'Courier New'", "monospace", "monospace"),
        sfont("'Lucida Console'", "monospace", "monospace"),
        sfont("'Comic Sans MS'", "cursive", "display"),
        sfont("Impact", "sans-serif", "display"),
    ];
}

function buildDefaultFontList(): FontItem[]
{
    return [
        ...buildGoogleSansSerif(),
        ...buildGoogleSerif(),
        ...buildGoogleMonospace(),
        ...buildGoogleDisplay(),
        ...buildSystemFonts(),
    ];
}

const DEFAULT_FONTS: FontItem[] = buildDefaultFontList();

// ============================================================================
// S3: DOM HELPERS
// ============================================================================

function createElement(tag: string, classes: string[], text?: string): HTMLElement
{
    const el = document.createElement(tag);
    if (classes.length > 0) { el.classList.add(...classes); }
    if (text) { el.textContent = text; }
    return el;
}

function setAttr(el: HTMLElement, attrs: Record<string, string>): void
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

function highlightMatch(
    label: string, search: string
): DocumentFragment
{
    const frag = document.createDocumentFragment();
    if (!search)
    {
        frag.appendChild(document.createTextNode(label));
        return frag;
    }
    const lower = label.toLowerCase();
    const idx = lower.indexOf(search.toLowerCase());
    if (idx < 0)
    {
        frag.appendChild(document.createTextNode(label));
        return frag;
    }
    if (idx > 0)
    {
        frag.appendChild(document.createTextNode(label.slice(0, idx)));
    }
    const mark = createElement("mark", [`${CLS}-match`]);
    mark.textContent = label.slice(idx, idx + search.length);
    frag.appendChild(mark);
    if (idx + search.length < label.length)
    {
        frag.appendChild(
            document.createTextNode(label.slice(idx + search.length))
        );
    }
    return frag;
}

// ============================================================================
// S4: CLASS
// ============================================================================

export class FontDropdown
{
    private readonly instanceId: string;
    private opts: FontDropdownOptions;
    private fonts: FontItem[];
    private recentValues: string[] = [];
    private filteredFonts: FontItem[] = [];
    private selectedFont: FontItem | null = null;
    private highlightedIndex = -1;
    private isOpen = false;
    private destroyed = false;
    private previewsLoaded = false;

    // DOM refs
    private rootEl: HTMLElement | null = null;
    private triggerEl: HTMLElement | null = null;
    private triggerLabel: HTMLElement | null = null;
    private dropdownEl: HTMLElement | null = null;
    private searchEl: HTMLInputElement | null = null;
    private listEl: HTMLElement | null = null;

    // Bound handlers for cleanup
    private readonly boundDocClick: (e: MouseEvent) => void;
    private readonly boundDocKey: (e: KeyboardEvent) => void;

    constructor(containerId: string, options: FontDropdownOptions)
    {
        this.instanceId = `${CLS}-${++instanceCounter}`;
        this.opts = { ...options };
        this.fonts = options.fonts
            ? [...options.fonts] : [...DEFAULT_FONTS];
        this.filteredFonts = [...this.fonts];
        this.boundDocClick = (e: MouseEvent) => this.onDocumentClick(e);
        this.boundDocKey = (e: KeyboardEvent) => this.onDocumentKey(e);
        if (options.showRecent) { this.recentValues = this.loadRecent(); }
        if (options.value)
        {
            this.selectedFont = this.findFont(options.value);
        }
        this.render(containerId);
        this.loadSelectedFontIfGoogle();
        console.log(LOG_PREFIX, "created", this.instanceId);
    }

    // ── Public API ──

    public getValue(): string
    {
        return this.selectedFont?.value ?? "";
    }

    public getSelectedFont(): FontItem | null
    {
        return this.selectedFont;
    }

    public setValue(value: string): void
    {
        const font = this.findFont(value);
        if (font) { this.selectFont(font, false); }
    }

    public setFonts(fonts: FontItem[]): void
    {
        this.fonts = [...fonts];
        this.filteredFonts = [...this.fonts];
        this.previewsLoaded = false;
        if (this.isOpen) { this.renderListItems(""); }
    }

    public open(): void
    {
        if (!this.isOpen) { this.openDropdown(); }
    }

    public close(): void
    {
        if (this.isOpen) { this.closeDropdown(); }
    }

    public enable(): void
    {
        if (!this.rootEl) { return; }
        this.rootEl.classList.remove(`${CLS}-disabled`);
        this.opts.disabled = false;
    }

    public disable(): void
    {
        if (!this.rootEl) { return; }
        this.rootEl.classList.add(`${CLS}-disabled`);
        this.opts.disabled = true;
        if (this.isOpen) { this.closeDropdown(); }
    }

    public getElement(): HTMLElement | null
    {
        return this.rootEl;
    }

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

    // ── Private: rendering ──

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
        if (this.opts.disabled)
        {
            wrap.classList.add(`${CLS}-disabled`);
        }
        this.triggerEl = this.buildTrigger();
        this.dropdownEl = this.buildDropdown();
        wrap.appendChild(this.triggerEl);
        wrap.appendChild(this.dropdownEl);
        return wrap;
    }

    private applySizeClass(el: HTMLElement): void
    {
        if (this.opts.size === "mini")
        {
            el.classList.add(`${CLS}-mini`);
        }
        else if (this.opts.size === "sm")
        {
            el.classList.add(`${CLS}-sm`);
        }
        else if (this.opts.size === "lg")
        {
            el.classList.add(`${CLS}-lg`);
        }
    }

    private buildTrigger(): HTMLElement
    {
        const trigger = createElement("div", [`${CLS}-trigger`]);
        setAttr(trigger, {
            "role": "combobox", "aria-expanded": "false",
            "aria-haspopup": "listbox", "tabindex": "0",
            "aria-label": "Font selector",
        });
        this.triggerLabel = createElement(
            "span", [`${CLS}-trigger-label`]
        );
        this.updateTriggerLabel();
        const caret = createElement(
            "i", ["bi", "bi-chevron-down", `${CLS}-trigger-caret`]
        );
        trigger.appendChild(this.triggerLabel);
        trigger.appendChild(caret);
        trigger.addEventListener("click", () => this.onTriggerClick());
        trigger.addEventListener(
            "keydown", (e) => this.onTriggerKeydown(e)
        );
        return trigger;
    }

    private updateTriggerLabel(): void
    {
        if (!this.triggerLabel) { return; }
        if (this.selectedFont)
        {
            this.triggerLabel.textContent = this.selectedFont.label;
            this.triggerLabel.style.fontFamily = this.selectedFont.value;
            this.triggerLabel.classList.remove(
                `${CLS}-trigger-placeholder`
            );
        }
        else
        {
            this.triggerLabel.textContent =
                this.opts.placeholder || "Select font\u2026";
            this.triggerLabel.style.fontFamily = "";
            this.triggerLabel.classList.add(
                `${CLS}-trigger-placeholder`
            );
        }
    }

    private buildDropdown(): HTMLElement
    {
        const dd = createElement("div", [`${CLS}-dropdown`]);
        dd.style.display = "none";
        const searchWrap = createElement(
            "div", [`${CLS}-search-wrap`]
        );
        this.searchEl = document.createElement("input");
        this.searchEl.type = "text";
        this.searchEl.className = `${CLS}-search`;
        setAttr(this.searchEl, {
            "placeholder": "Search fonts\u2026",
            "autocomplete": "off",
            "aria-label": "Filter fonts",
        });
        this.searchEl.addEventListener(
            "input", () => this.onSearchInput()
        );
        this.searchEl.addEventListener(
            "keydown", (e) => this.onSearchKeydown(e)
        );
        searchWrap.appendChild(this.searchEl);
        this.listEl = createElement("ul", [`${CLS}-list`]);
        setAttr(this.listEl, {
            "role": "listbox", "aria-label": "Fonts",
        });
        this.setListMaxHeight();
        dd.appendChild(searchWrap);
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

    private renderListItems(searchText: string): void
    {
        if (!this.listEl) { return; }
        while (this.listEl.firstChild)
        {
            this.listEl.removeChild(this.listEl.firstChild);
        }
        this.highlightedIndex = -1;
        let flatIndex = 0;
        flatIndex = this.renderRecentSection(searchText, flatIndex);
        if (this.shouldGroupByCategory())
        {
            flatIndex = this.renderCategorized(searchText, flatIndex);
        }
        else
        {
            flatIndex = this.renderAllFlat(searchText, flatIndex);
        }
        if (flatIndex === 0) { this.renderNoMatches(); }
    }

    private shouldGroupByCategory(): boolean
    {
        if (this.opts.groupByCategory === false) { return false; }
        if (this.opts.groupByCategory === true) { return true; }
        return this.fonts.some(f => f.category !== undefined);
    }

    private renderRecentSection(
        searchText: string, startIndex: number
    ): number
    {
        if (!this.opts.showRecent || !this.listEl) { return startIndex; }
        const recents = this.getRecentFonts(searchText);
        if (recents.length === 0) { return startIndex; }
        this.listEl.appendChild(
            createElement("li", [`${CLS}-group-header`], "Recently Used")
        );
        let idx = startIndex;
        for (const font of recents)
        {
            this.listEl.appendChild(
                this.buildFontItem(font, idx, searchText)
            );
            idx++;
        }
        this.appendSeparator();
        return idx;
    }

    private renderCategorized(
        searchText: string, startIndex: number
    ): number
    {
        let idx = startIndex;
        for (const cat of CATEGORY_ORDER)
        {
            idx = this.renderCategoryGroup(cat, searchText, idx);
        }
        return idx;
    }

    private renderCategoryGroup(
        category: string, searchText: string, startIndex: number
    ): number
    {
        if (!this.listEl) { return startIndex; }
        const catFonts = this.filterFonts(searchText)
            .filter(f => f.category === category);
        if (catFonts.length === 0) { return startIndex; }
        const label = CATEGORY_LABELS[category] || category;
        this.listEl.appendChild(
            createElement("li", [`${CLS}-group-header`], label)
        );
        let idx = startIndex;
        for (const font of catFonts)
        {
            this.listEl.appendChild(
                this.buildFontItem(font, idx, searchText)
            );
            idx++;
        }
        return idx;
    }

    private renderAllFlat(
        searchText: string, startIndex: number
    ): number
    {
        if (!this.listEl) { return startIndex; }
        const filtered = this.filterFonts(searchText);
        if (filtered.length === 0) { return startIndex; }
        if (this.opts.showRecent && startIndex > 0)
        {
            this.listEl.appendChild(
                createElement(
                    "li", [`${CLS}-group-header`], "All Fonts"
                )
            );
        }
        let idx = startIndex;
        for (const font of filtered)
        {
            this.listEl.appendChild(
                this.buildFontItem(font, idx, searchText)
            );
            idx++;
        }
        return idx;
    }

    private appendSeparator(): void
    {
        if (!this.listEl) { return; }
        const sep = createElement("li", [`${CLS}-separator`]);
        setAttr(sep, { "role": "separator" });
        this.listEl.appendChild(sep);
    }

    private buildFontItem(
        font: FontItem, index: number, searchText: string
    ): HTMLElement
    {
        const li = createElement("li", [`${CLS}-item`]);
        const optId = `${this.instanceId}-opt-${index}`;
        setAttr(li, {
            "id": optId, "role": "option",
            "aria-selected": "false",
            "data-index": String(index),
            "data-value": font.value,
        });
        li.style.fontFamily = font.value;
        if (this.selectedFont
            && this.selectedFont.value === font.value)
        {
            li.classList.add(`${CLS}-item-selected`);
            setAttr(li, { "aria-selected": "true" });
        }
        this.appendItemContent(li, font, searchText);
        li.addEventListener(
            "click", () => this.selectFont(font, true)
        );
        li.addEventListener(
            "mouseenter", () => this.setHighlight(index)
        );
        return li;
    }

    private appendItemContent(
        li: HTMLElement, font: FontItem, searchText: string
    ): void
    {
        const labelFrag = highlightMatch(font.label, searchText);
        li.appendChild(labelFrag);
        if (this.opts.previewText)
        {
            const preview = createElement(
                "span", [`${CLS}-item-preview`]
            );
            preview.textContent = ` \u2014 ${this.opts.previewText}`;
            li.appendChild(preview);
        }
    }

    private renderNoMatches(): void
    {
        if (!this.listEl) { return; }
        const li = createElement(
            "li", [`${CLS}-no-matches`], "No matching fonts"
        );
        setAttr(li, { "role": "presentation" });
        this.listEl.appendChild(li);
    }

    // ── Private: filtering ──

    private filterFonts(searchText: string): FontItem[]
    {
        if (!searchText) { return this.fonts; }
        const lower = searchText.toLowerCase();
        return this.fonts.filter(
            f => f.label.toLowerCase().includes(lower)
        );
    }

    private getRecentFonts(searchText: string): FontItem[]
    {
        const recentItems: FontItem[] = [];
        for (const val of this.recentValues)
        {
            const font = this.fonts.find(f => f.value === val);
            if (!font) { continue; }
            if (!searchText
                || font.label.toLowerCase()
                    .includes(searchText.toLowerCase()))
            {
                recentItems.push(font);
            }
        }
        return recentItems;
    }

    private findFont(value: string): FontItem | null
    {
        return this.fonts.find(
            f => f.value === value || f.label === value
        ) || null;
    }

    // ── Private: dropdown state ──

    private openDropdown(): void
    {
        if (this.opts.disabled || !this.dropdownEl || !this.searchEl)
        {
            return;
        }
        this.dropdownEl.style.display = "";
        this.isOpen = true;
        this.positionDropdown();
        this.searchEl.value = "";
        this.renderListItems("");
        this.searchEl.focus();
        if (this.triggerEl)
        {
            setAttr(this.triggerEl, { "aria-expanded": "true" });
        }
        this.addGlobalListeners();
        this.loadGoogleFontPreviews();
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
        const ddHeight = (max * ITEM_HEIGHT_PX) + 42;
        const spaceBelow = window.innerHeight - rect.bottom;
        const openAbove = spaceBelow < ddHeight
            && rect.top > spaceBelow;
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
            if (pr.left < 0)
            {
                this.dropdownEl.style.left = "4px";
            }
        });
    }

    // ── Private: selection ──

    private selectFont(font: FontItem, fireEvent: boolean): void
    {
        this.selectedFont = font;
        this.updateTriggerLabel();
        if (font.googleFont) { loadFullFont(font.label); }
        if (this.opts.showRecent) { this.pushRecent(font.value); }
        if (this.isOpen) { this.closeDropdown(); }
        if (fireEvent) { safeCallback(this.opts.onChange, font); }
    }

    // ── Private: Google Font loading ──

    private loadGoogleFontPreviews(): void
    {
        if (this.previewsLoaded) { return; }
        this.previewsLoaded = true;
        loadPreviewBatch(this.fonts);
    }

    private loadSelectedFontIfGoogle(): void
    {
        if (this.selectedFont?.googleFont)
        {
            loadFullFont(this.selectedFont.label);
        }
    }

    // ── Private: highlight navigation ──

    private setHighlight(index: number): void
    {
        if (!this.listEl) { return; }
        const items = this.listEl.querySelectorAll(`.${CLS}-item`);
        items.forEach(
            el => el.classList.remove(`${CLS}-item-highlighted`)
        );
        this.highlightedIndex = index;
        const target = this.getItemByIndex(index);
        if (!target) { return; }
        target.classList.add(`${CLS}-item-highlighted`);
        setAttr(target as HTMLElement, {
            "id": `${this.instanceId}-active`,
        });
        if (this.searchEl)
        {
            setAttr(this.searchEl, {
                "aria-activedescendant":
                    `${this.instanceId}-active`,
            });
        }
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

    private moveHighlightByPage(dir: number): void
    {
        const max = this.opts.maxVisibleItems || DEFAULT_MAX_VISIBLE;
        this.moveHighlight(dir * max);
    }

    private getItemByIndex(index: number): Element | null
    {
        if (!this.listEl) { return null; }
        const items = this.listEl.querySelectorAll(`.${CLS}-item`);
        return (index >= 0 && index < items.length)
            ? items[index] : null;
    }

    private getHighlightedFont(): FontItem | null
    {
        const el = this.getItemByIndex(
            this.highlightedIndex
        ) as HTMLElement | null;
        if (!el) { return null; }
        const value = el.getAttribute("data-value") || "";
        return this.findFont(value);
    }

    // ── Private: keyboard ──

    private resolveKey(action: string): string
    {
        return this.opts.keyBindings?.[action]
            ?? DEFAULT_KEY_BINDINGS[action] ?? "";
    }

    private matchesKey(e: KeyboardEvent, action: string): boolean
    {
        const combo = this.resolveKey(action);
        if (!combo) { return false; }
        const parts = combo.split("+");
        const key = parts[parts.length - 1];
        return e.key === key;
    }

    private onTriggerClick(): void
    {
        if (this.opts.disabled) { return; }
        if (this.isOpen) { this.closeDropdown(); }
        else { this.openDropdown(); }
    }

    private onTriggerKeydown(e: KeyboardEvent): void
    {
        if (this.opts.disabled) { return; }
        if (this.matchesKey(e, "openOrMoveDown")
            || this.matchesKey(e, "openOrMoveUp"))
        {
            e.preventDefault();
            this.openDropdown();
        }
        else if (e.key === " ")
        {
            e.preventDefault();
            this.openDropdown();
        }
    }

    private onSearchKeydown(e: KeyboardEvent): void
    {
        const actions: Record<string, () => void> =
        {
            openOrMoveDown:    () => this.moveHighlight(1),
            openOrMoveUp:      () => this.moveHighlight(-1),
            confirmSelection:  () => this.confirmHighlighted(),
            closeDropdown:     () => this.closeDropdown(),
            jumpToFirst:       () => this.setHighlight(0),
            jumpToLast:        () => this.jumpToLast(),
            pageDown:          () => this.moveHighlightByPage(1),
            pageUp:            () => this.moveHighlightByPage(-1),
        };
        this.dispatchKeyAction(e, actions);
    }

    private dispatchKeyAction(
        e: KeyboardEvent,
        actions: Record<string, () => void>
    ): void
    {
        for (const [action, handler] of Object.entries(actions))
        {
            if (this.matchesKey(e, action))
            {
                e.preventDefault();
                handler();
                return;
            }
        }
    }

    private confirmHighlighted(): void
    {
        const font = this.getHighlightedFont();
        if (font) { this.selectFont(font, true); }
    }

    private jumpToLast(): void
    {
        if (!this.listEl) { return; }
        const items = this.listEl.querySelectorAll(`.${CLS}-item`);
        if (items.length > 0)
        {
            this.setHighlight(items.length - 1);
        }
    }

    private onSearchInput(): void
    {
        const text = this.searchEl?.value ?? "";
        this.renderListItems(text);
    }

    // ── Private: global listeners ──

    private addGlobalListeners(): void
    {
        document.addEventListener(
            "mousedown", this.boundDocClick, true
        );
        document.addEventListener(
            "keydown", this.boundDocKey, true
        );
    }

    private removeGlobalListeners(): void
    {
        document.removeEventListener(
            "mousedown", this.boundDocClick, true
        );
        document.removeEventListener(
            "keydown", this.boundDocKey, true
        );
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
        }
    }

    // ── Private: recent fonts (localStorage) ──

    private loadRecent(): string[]
    {
        try
        {
            const raw = localStorage.getItem(RECENT_STORAGE_KEY);
            if (raw) { return JSON.parse(raw) as string[]; }
        }
        catch (err)
        {
            console.warn(LOG_PREFIX, "failed to load recent:", err);
        }
        return [];
    }

    private saveRecent(): void
    {
        try
        {
            localStorage.setItem(
                RECENT_STORAGE_KEY,
                JSON.stringify(this.recentValues)
            );
        }
        catch (err)
        {
            console.warn(LOG_PREFIX, "failed to save recent:", err);
        }
    }

    private pushRecent(value: string): void
    {
        this.recentValues = this.recentValues.filter(
            v => v !== value
        );
        this.recentValues.unshift(value);
        const max = this.opts.maxRecent || DEFAULT_MAX_RECENT;
        if (this.recentValues.length > max)
        {
            this.recentValues.length = max;
        }
        this.saveRecent();
    }
}

// ============================================================================
// S5: FACTORY & GLOBAL EXPORTS
// ============================================================================

/** Create a FontDropdown and mount it in the given container. */
export function createFontDropdown(
    containerId: string, options: FontDropdownOptions
): FontDropdown
{
    return new FontDropdown(containerId, options);
}

(window as unknown as Record<string, unknown>)["FontDropdown"] =
    FontDropdown;
(window as unknown as Record<string, unknown>)["createFontDropdown"] =
    createFontDropdown;
