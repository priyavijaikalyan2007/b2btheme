/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: FacetSearch
 * 📜 PURPOSE: Facet-aware search bar with structured key:value query parsing,
 *    inline chips, context-sensitive autocomplete, async value loading,
 *    recent search history, and full ARIA combobox pattern.
 * 🔗 RELATES: [[EnterpriseTheme]], [[CustomComponents]]
 * ⚡ FLOW: [Consumer] -> [new FacetSearch()] -> [show()] -> [DOM search bar]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// INTERFACES
// ============================================================================

/** Value type for a facet definition. */
export type FacetValueType = "text" | "enum" | "date" | "number" | "boolean";

/** Size variant for the search bar. */
export type FacetSearchSize = "sm" | "default" | "lg";

/** Defines a single searchable facet. */
export interface FacetDefinition
{
    key: string;
    label: string;
    valueType: FacetValueType;
    values?: string[];
    loadValues?: (query: string) => Promise<string[]>;
    icon?: string;
    multiple?: boolean;
    defaultOperator?: ":" | "!:" | ">" | "<" | ">=" | "<=";
    operators?: string[];
    color?: string;
    valuePlaceholder?: string;
}

/** A single parsed facet from the query string. */
export interface ParsedFacet
{
    key: string;
    operator: string;
    value: string;
    negated: boolean;
}

/** Structured result of parsing the search bar input. */
export interface FacetSearchQuery
{
    text: string;
    facets: ParsedFacet[];
    raw: string;
}

/** Configuration options for FacetSearch. */
export interface FacetSearchOptions
{
    facets: FacetDefinition[];
    value?: string;
    placeholder?: string;
    showFacetChips?: boolean;
    showHistory?: boolean;
    maxHistory?: number;
    submitOnEnter?: boolean;
    clearOnSubmit?: boolean;
    size?: FacetSearchSize;
    disabled?: boolean;
    cssClass?: string;
    onSearch?: (query: FacetSearchQuery) => void;
    onChange?: (value: string) => void;
    onFacetAdd?: (key: string, value: string) => void;
    onFacetRemove?: (key: string) => void;
    onClear?: () => void;
    /** Override default key combos. Keys are action names, values are combo strings. */
    keyBindings?: Partial<Record<string, string>>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[FacetSearch]";
const _lu = (typeof (window as any).createLogUtility === "function") ? (window as any).createLogUtility().getLogger(LOG_PREFIX.slice(1, -1)) : null;
function logInfo(...a: unknown[]): void { _lu ? _lu.info(...a) : console.log(new Date().toISOString(), "[INFO]", LOG_PREFIX, ...a); }
function logWarn(...a: unknown[]): void { _lu ? _lu.warn(...a) : console.warn(new Date().toISOString(), "[WARN]", LOG_PREFIX, ...a); }
function logError(...a: unknown[]): void { _lu ? _lu.error(...a) : console.error(new Date().toISOString(), "[ERROR]", LOG_PREFIX, ...a); }
function logDebug(...a: unknown[]): void { _lu ? _lu.debug(...a) : console.debug(new Date().toISOString(), "[DEBUG]", LOG_PREFIX, ...a); }
function logTrace(...a: unknown[]): void { _lu ? _lu.trace(...a) : console.debug(new Date().toISOString(), "[TRACE]", LOG_PREFIX, ...a); }

const OPERATORS = [">=", "<=", "!:", ">", "<", ":"];
let instanceCounter = 0;

const DEFAULT_KEY_BINDINGS: Record<string, string> = {
    "moveDown": "ArrowDown",
    "moveUp": "ArrowUp",
    "enter": "Enter",
    "escape": "Escape",
    "backspace": "Backspace",
    "tab": "Tab",
    "home": "Home",
    "end": "End",
};

// ============================================================================
// HELPERS
// ============================================================================

function createElement(
    tag: string, classes: string[], text?: string): HTMLElement
{
    const el = document.createElement(tag);
    if (classes.length > 0) { el.classList.add(...classes); }
    if (text) { el.textContent = text; }
    return el;
}

function setAttr(el: HTMLElement, name: string, value: string): void
{
    el.setAttribute(name, value);
}

// ============================================================================
// PARSER — standalone pure function
// ============================================================================

/** Parse a raw query string into structured facets + free text. */
export function parseFacetQuery(
    raw: string, facetDefs: FacetDefinition[]): FacetSearchQuery
{
    const keyMap = new Map<string, FacetDefinition>();
    for (const fd of facetDefs)
    {
        keyMap.set(fd.key.toLowerCase(), fd);
    }

    const facets: ParsedFacet[] = [];
    const freeTextParts: string[] = [];
    const tokens = tokenize(raw);

    for (const token of tokens)
    {
        const parsed = parseToken(token, keyMap);
        if (parsed)
        {
            facets.push(parsed);
        }
        else
        {
            freeTextParts.push(token);
        }
    }

    return {
        text: freeTextParts.join(" ").trim(),
        facets,
        raw
    };
}

/** Tokenize raw input into space-separated tokens, respecting quotes. */
function tokenize(raw: string): string[]
{
    const tokens: string[] = [];
    let i = 0;
    let current = "";

    while (i < raw.length)
    {
        const ch = raw[i];
        if (ch === " " && current.length > 0)
        {
            tokens.push(current);
            current = "";
            i++;
        }
        else if (ch === " ")
        {
            i++;
        }
        else if (ch === '"')
        {
            current += readQuoted(raw, i);
            i = skipQuoted(raw, i);
        }
        else
        {
            current += ch;
            i++;
        }
    }

    if (current.length > 0) { tokens.push(current); }
    return tokens;
}

/** Read a quoted string starting at position i (including quotes). */
function readQuoted(raw: string, i: number): string
{
    let result = '"';
    let j = i + 1;
    while (j < raw.length)
    {
        if (raw[j] === '\\' && j + 1 < raw.length && raw[j + 1] === '"')
        {
            result += '\\"';
            j += 2;
        }
        else if (raw[j] === '"')
        {
            result += '"';
            j++;
            break;
        }
        else
        {
            result += raw[j];
            j++;
        }
    }
    return result;
}

/** Return position after a quoted string. */
function skipQuoted(raw: string, i: number): number
{
    let j = i + 1;
    while (j < raw.length)
    {
        if (raw[j] === '\\' && j + 1 < raw.length && raw[j + 1] === '"')
        {
            j += 2;
        }
        else if (raw[j] === '"')
        {
            return j + 1;
        }
        else
        {
            j++;
        }
    }
    return j;
}

/** Try to parse a single token as a facet. Returns null if not a facet. */
function parseToken(
    token: string,
    keyMap: Map<string, FacetDefinition>): ParsedFacet | null
{
    let negated = false;
    let t = token;

    if (t.startsWith("-") && t.length > 1)
    {
        negated = true;
        t = t.substring(1);
    }

    for (const op of OPERATORS)
    {
        const idx = t.indexOf(op);
        if (idx <= 0) { continue; }

        const key = t.substring(0, idx).toLowerCase();
        if (!keyMap.has(key)) { continue; }

        let value = t.substring(idx + op.length);
        value = stripQuotes(value);

        if (value.length === 0) { return null; }

        return { key, operator: op, value, negated };
    }

    return null;
}

/** Strip surrounding double quotes from a value. */
function stripQuotes(s: string): string
{
    if (s.length >= 2 && s[0] === '"' && s[s.length - 1] === '"')
    {
        return s.substring(1, s.length - 1).replace(/\\"/g, '"');
    }
    return s;
}

// ============================================================================
// DROPDOWN SUGGESTION TYPES
// ============================================================================

interface Suggestion
{
    type: "facet-key" | "facet-value" | "recent";
    label: string;
    hint?: string;
    icon?: string;
    facetKey?: string;
    value?: string;
}

// ============================================================================
// CLASS: FacetSearch
// ============================================================================

export class FacetSearch
{
    private opts: FacetSearchOptions;
    private id: string;
    private root: HTMLElement | null = null;
    private bar: HTMLElement | null = null;
    private chipContainer: HTMLElement | null = null;
    private input: HTMLInputElement | null = null;
    private clearBtn: HTMLElement | null = null;
    private dropdown: HTMLElement | null = null;
    private liveRegion: HTMLElement | null = null;
    private containerId: string = "";
    private destroyed = false;

    private facetMap: Map<string, FacetDefinition>;
    private chips: ParsedFacet[] = [];
    private recentSearches: string[] = [];
    private suggestions: Suggestion[] = [];
    private highlightIdx = -1;
    private dropdownOpen = false;
    private loadTimer: number | null = null;
    private parseTimer: number | null = null;
    private activeContext: "keys" | "values" | "recent" | null = null;
    private activeFacetKey: string | null = null;

    // -- bound handlers for cleanup --
    private boundInputHandler: ((e: Event) => void) | null = null;
    private boundKeydownHandler: ((e: KeyboardEvent) => void) | null = null;
    private boundFocusHandler: (() => void) | null = null;
    private boundBlurHandler: (() => void) | null = null;
    private boundClickOutside: ((e: MouseEvent) => void) | null = null;
    private boundDropdownClick: ((e: MouseEvent) => void) | null = null;

    constructor(options: FacetSearchOptions)
    {
        this.opts = Object.assign(
        {
            placeholder: "Search...",
            showFacetChips: true,
            showHistory: false,
            maxHistory: 10,
            submitOnEnter: true,
            clearOnSubmit: false,
            size: "default" as FacetSearchSize,
            disabled: false
        }, options);

        this.id = "facetsearch-" + (++instanceCounter);
        this.facetMap = new Map();
        for (const fd of this.opts.facets)
        {
            this.facetMap.set(fd.key.toLowerCase(), fd);
        }

        this.buildDOM();

        if (this.opts.value)
        {
            this.parseAndChipify(this.opts.value);
        }

        logInfo("Initialized with",
            this.opts.facets.length, "facet definitions");
    }

    // ====================================================================
    // LIFECYCLE
    // ====================================================================

    show(containerId: string): void
    {
        if (this.destroyed) { return; }
        const container = document.getElementById(containerId);
        if (!container)
        {
            logError("Container not found:", containerId);
            return;
        }
        this.containerId = containerId;
        container.appendChild(this.root!);
        this.attachListeners();
        logInfo("Shown in", containerId);
    }

    hide(): void
    {
        if (this.destroyed || !this.root) { return; }
        this.closeDropdown();
        this.detachListeners();
        if (this.root.parentElement)
        {
            this.root.parentElement.removeChild(this.root);
        }
    }

    destroy(): void
    {
        if (this.destroyed) { return; }
        this.hide();
        this.destroyed = true;
        this.root = null;
        this.bar = null;
        this.chipContainer = null;
        this.input = null;
        this.clearBtn = null;
        this.dropdown = null;
        this.liveRegion = null;
        this.chips = [];
        this.suggestions = [];
        if (this.loadTimer !== null) { clearTimeout(this.loadTimer); }
        if (this.parseTimer !== null) { clearTimeout(this.parseTimer); }
        logInfo("Destroyed");
    }

    getElement(): HTMLElement | null { return this.root; }

    // ====================================================================
    // PUBLIC API
    // ====================================================================

    getValue(): string
    {
        return this.buildRawFromChipsAndInput();
    }

    setValue(value: string): void
    {
        if (this.destroyed) { return; }
        this.chips = [];
        this.renderChips();
        this.parseAndChipify(value);
    }

    getQuery(): FacetSearchQuery
    {
        const raw = this.buildRawFromChipsAndInput();
        return parseFacetQuery(raw, this.opts.facets);
    }

    clear(): void
    {
        if (this.destroyed) { return; }
        this.chips = [];
        if (this.input) { this.input.value = ""; }
        this.renderChips();
        this.updateClearBtnVisibility();
        this.closeDropdown();
        this.announce("All filters cleared");
        if (this.opts.onClear) { this.opts.onClear(); }
    }

    focus(): void
    {
        if (this.input) { this.input.focus(); }
    }

    addFacet(key: string, value: string): void
    {
        if (this.destroyed || this.opts.disabled) { return; }
        const fd = this.facetMap.get(key.toLowerCase());
        if (!fd)
        {
            logWarn("Facet key not found:", key);
            return;
        }
        this.addChip(
        {
            key: fd.key,
            operator: fd.defaultOperator || ":",
            value,
            negated: false
        });
    }

    removeFacet(key: string): void
    {
        if (this.destroyed) { return; }
        this.removeChipByKey(key);
    }

    getFacets(): ParsedFacet[]
    {
        return this.chips.slice();
    }

    enable(): void
    {
        if (this.destroyed) { return; }
        this.opts.disabled = false;
        if (this.root) { this.root.classList.remove("facetsearch-disabled"); }
        if (this.input) { this.input.disabled = false; }
    }

    disable(): void
    {
        if (this.destroyed) { return; }
        this.opts.disabled = true;
        if (this.root) { this.root.classList.add("facetsearch-disabled"); }
        if (this.input) { this.input.disabled = true; }
        this.closeDropdown();
    }

    // ====================================================================
    // DOM BUILDING
    // ====================================================================

    private buildDOM(): void
    {
        this.root = createElement("div", ["facetsearch"]);
        setAttr(this.root, "role", "search");
        setAttr(this.root, "aria-label", "Search with filters");

        if (this.opts.size === "sm")
        {
            this.root.classList.add("facetsearch-sm");
        }
        else if (this.opts.size === "lg")
        {
            this.root.classList.add("facetsearch-lg");
        }
        if (this.opts.disabled)
        {
            this.root.classList.add("facetsearch-disabled");
        }
        if (this.opts.cssClass)
        {
            this.root.classList.add(this.opts.cssClass);
        }

        this.bar = createElement("div", ["facetsearch-bar"]);
        this.root.appendChild(this.bar);

        this.buildSearchIcon();
        this.buildChipContainer();
        this.buildInput();
        this.buildClearButton();
        this.buildDropdown();
        this.buildLiveRegion();
    }

    private buildSearchIcon(): void
    {
        const icon = createElement("i", ["bi", "bi-search", "facetsearch-icon"]);
        setAttr(icon, "aria-hidden", "true");
        this.bar!.appendChild(icon);
    }

    private buildChipContainer(): void
    {
        this.chipContainer = createElement("div", ["facetsearch-chips"]);
        setAttr(this.chipContainer, "role", "list");
        setAttr(this.chipContainer, "aria-label", "Active filters");
        this.bar!.appendChild(this.chipContainer);
    }

    private buildInput(): void
    {
        const input = document.createElement("input");
        input.type = "text";
        input.classList.add("facetsearch-input");
        setAttr(input, "role", "searchbox");
        setAttr(input, "aria-label", "Search");
        setAttr(input, "aria-expanded", "false");
        setAttr(input, "aria-controls", this.id + "-listbox");
        setAttr(input, "aria-activedescendant", "");
        setAttr(input, "aria-autocomplete", "list");
        setAttr(input, "aria-haspopup", "listbox");
        setAttr(input, "autocomplete", "off");
        input.placeholder = this.opts.placeholder || "Search...";
        if (this.opts.disabled) { input.disabled = true; }
        this.bar!.appendChild(input);
        this.input = input;
    }

    private buildClearButton(): void
    {
        this.clearBtn = createElement("button", ["facetsearch-clear"]);
        setAttr(this.clearBtn, "type", "button");
        setAttr(this.clearBtn, "aria-label", "Clear search");
        const icon = createElement("i", ["bi", "bi-x-lg"]);
        setAttr(icon, "aria-hidden", "true");
        this.clearBtn.appendChild(icon);
        this.clearBtn.style.display = "none";
        this.clearBtn.addEventListener("click", () => this.clear());
        this.bar!.appendChild(this.clearBtn);
    }

    private buildDropdown(): void
    {
        this.dropdown = createElement("div", ["facetsearch-dropdown"]);
        setAttr(this.dropdown, "id", this.id + "-listbox");
        setAttr(this.dropdown, "role", "listbox");
        setAttr(this.dropdown, "aria-label", "Search suggestions");
        this.dropdown.style.display = "none";
        this.root!.appendChild(this.dropdown);
    }

    private buildLiveRegion(): void
    {
        this.liveRegion = createElement("div", ["visually-hidden"]);
        setAttr(this.liveRegion, "role", "status");
        setAttr(this.liveRegion, "aria-live", "polite");
        setAttr(this.liveRegion, "aria-atomic", "true");
        this.root!.appendChild(this.liveRegion);
    }

    // ====================================================================
    // CHIP MANAGEMENT
    // ====================================================================

    private addChip(facet: ParsedFacet): void
    {
        const fd = this.facetMap.get(facet.key.toLowerCase());
        if (!fd) { return; }

        if (!fd.multiple)
        {
            this.chips = this.chips.filter(
                c => c.key.toLowerCase() !== facet.key.toLowerCase());
        }

        this.chips.push(facet);
        this.renderChips();
        this.updateClearBtnVisibility();

        const label = (facet.negated ? "-" : "") +
            facet.key + facet.operator + facet.value;
        this.announce("Added filter: " + label);
        logInfo("Facet added:", label);

        if (this.opts.onFacetAdd)
        {
            this.opts.onFacetAdd(facet.key, facet.value);
        }
        if (this.opts.onChange)
        {
            this.opts.onChange(this.getValue());
        }
    }

    private removeChipByKey(key: string): void
    {
        const before = this.chips.length;
        this.chips = this.chips.filter(
            c => c.key.toLowerCase() !== key.toLowerCase());
        if (this.chips.length < before)
        {
            this.renderChips();
            this.updateClearBtnVisibility();
            this.announce("Removed filter: " + key);
            logInfo("Facet removed:", key);
            if (this.opts.onFacetRemove)
            {
                this.opts.onFacetRemove(key);
            }
            if (this.opts.onChange)
            {
                this.opts.onChange(this.getValue());
            }
        }
    }

    private removeChipAtIndex(idx: number): void
    {
        if (idx < 0 || idx >= this.chips.length) { return; }
        const removed = this.chips.splice(idx, 1)[0];
        this.renderChips();
        this.updateClearBtnVisibility();
        this.announce("Removed filter: " + removed.key);
        if (this.opts.onFacetRemove)
        {
            this.opts.onFacetRemove(removed.key);
        }
        if (this.opts.onChange)
        {
            this.opts.onChange(this.getValue());
        }
    }

    private renderChips(): void
    {
        if (!this.chipContainer) { return; }
        while (this.chipContainer.firstChild) { this.chipContainer.removeChild(this.chipContainer.firstChild); }

        for (let i = 0; i < this.chips.length; i++)
        {
            const chip = this.buildChipElement(this.chips[i], i);
            this.chipContainer.appendChild(chip);
        }
    }

    private buildChipElement(
        facet: ParsedFacet, idx: number): HTMLElement
    {
        const chip = createElement("span", ["facetsearch-chip"]);
        setAttr(chip, "role", "listitem");
        setAttr(chip, "data-facet-key", facet.key);

        if (facet.negated)
        {
            chip.classList.add("facetsearch-chip-negated");
        }

        const fd = this.facetMap.get(facet.key.toLowerCase());
        if (fd && fd.color && !facet.negated)
        {
            chip.style.backgroundColor = fd.color;
            chip.style.borderColor = fd.color;
            chip.style.color = "#fff";
        }

        if (fd && fd.icon)
        {
            const iconClasses = fd.icon.split(" ").concat(
                "facetsearch-chip-icon");
            const icon = createElement("i", iconClasses);
            setAttr(icon, "aria-hidden", "true");
            chip.appendChild(icon);
        }

        const text = createElement("span", ["facetsearch-chip-text"]);
        const display = (facet.negated ? "-" : "") +
            facet.key + facet.operator + facet.value;
        text.textContent = display;
        setAttr(text, "title", display);
        chip.appendChild(text);

        if (!this.opts.disabled)
        {
            const removeBtn = this.buildChipRemove(facet.key, idx);
            chip.appendChild(removeBtn);
        }

        return chip;
    }

    private buildChipRemove(key: string, idx: number): HTMLElement
    {
        const btn = createElement("button", ["facetsearch-chip-remove"]);
        setAttr(btn, "type", "button");
        setAttr(btn, "aria-label", "Remove " + key + " filter");
        setAttr(btn, "tabindex", "-1");
        const icon = createElement("i", ["bi", "bi-x"]);
        setAttr(icon, "aria-hidden", "true");
        btn.appendChild(icon);
        btn.addEventListener("click", (e) =>
        {
            e.stopPropagation();
            this.removeChipAtIndex(idx);
            if (this.input) { this.input.focus(); }
        });
        return btn;
    }

    // ====================================================================
    // INPUT PARSING & CHIPIFICATION
    // ====================================================================

    private parseAndChipify(raw: string): void
    {
        if (!this.opts.showFacetChips)
        {
            if (this.input) { this.input.value = raw; }
            return;
        }

        const query = parseFacetQuery(raw, this.opts.facets);
        this.chips = query.facets;
        this.renderChips();
        if (this.input) { this.input.value = query.text; }
        this.updateClearBtnVisibility();
    }

    /** Re-parse input, extract new facets, leave free text. */
    private tryExtractFacets(): void
    {
        if (!this.input || !this.opts.showFacetChips) { return; }
        const text = this.input.value;
        const query = parseFacetQuery(text, this.opts.facets);

        if (query.facets.length > 0)
        {
            for (const f of query.facets) { this.addChip(f); }
            this.input.value = query.text;
        }
    }

    private buildRawFromChipsAndInput(): string
    {
        const parts: string[] = [];
        for (const c of this.chips)
        {
            const prefix = c.negated ? "-" : "";
            const val = c.value.includes(" ")
                ? '"' + c.value + '"' : c.value;
            parts.push(prefix + c.key + c.operator + val);
        }
        if (this.input && this.input.value.trim())
        {
            parts.push(this.input.value.trim());
        }
        return parts.join(" ");
    }

    // ====================================================================
    // AUTOCOMPLETE CONTEXT DETECTION
    // ====================================================================

    /** Determine what kind of suggestions to show. */
    private detectContext(): void
    {
        if (!this.input) { return; }
        const text = this.input.value;

        if (text.length === 0)
        {
            this.activeContext = this.opts.showHistory
                ? "recent" : "keys";
            this.activeFacetKey = null;
            return;
        }

        // Check if we're in a key:value context
        for (const op of OPERATORS)
        {
            const idx = text.lastIndexOf(op);
            if (idx <= 0) { continue; }

            // Find the token start (last space before operator)
            let tokenStart = text.lastIndexOf(" ", idx - 1) + 1;
            let key = text.substring(tokenStart, idx).toLowerCase();
            if (key.startsWith("-")) { key = key.substring(1); }

            if (this.facetMap.has(key))
            {
                this.activeContext = "values";
                this.activeFacetKey = key;
                return;
            }
        }

        this.activeContext = "keys";
        this.activeFacetKey = null;
    }

    // ====================================================================
    // DROPDOWN — SUGGESTIONS
    // ====================================================================

    private openDropdown(): void
    {
        if (!this.dropdown || this.opts.disabled) { return; }
        this.dropdownOpen = true;
        this.dropdown.style.display = "";
        if (this.input)
        {
            setAttr(this.input, "aria-expanded", "true");
        }
    }

    private closeDropdown(): void
    {
        if (!this.dropdown) { return; }
        this.dropdownOpen = false;
        this.dropdown.style.display = "none";
        this.highlightIdx = -1;
        this.suggestions = [];
        if (this.input)
        {
            setAttr(this.input, "aria-expanded", "false");
            setAttr(this.input, "aria-activedescendant", "");
        }
    }

    private updateSuggestions(): void
    {
        this.detectContext();

        if (this.activeContext === "values" && this.activeFacetKey)
        {
            this.showValueSuggestions();
        }
        else if (this.activeContext === "keys")
        {
            this.showKeySuggestions();
        }
        else if (this.activeContext === "recent")
        {
            this.showRecentSuggestions();
        }
        else
        {
            this.closeDropdown();
        }
    }

    private showKeySuggestions(): void
    {
        if (!this.input) { return; }
        const text = this.input.value.trim().toLowerCase();
        // Get the last partial token
        const lastSpace = text.lastIndexOf(" ");
        const partial = lastSpace >= 0
            ? text.substring(lastSpace + 1) : text;

        const filtered = this.opts.facets.filter(fd =>
        {
            const lk = fd.key.toLowerCase();
            const ll = fd.label.toLowerCase();
            return lk.startsWith(partial) || ll.startsWith(partial);
        });

        this.suggestions = filtered.map(fd => ({
            type: "facet-key" as const,
            label: fd.label,
            hint: fd.key + ":",
            icon: fd.icon,
            facetKey: fd.key
        }));

        this.renderDropdown();
    }

    private showValueSuggestions(): void
    {
        if (!this.activeFacetKey || !this.input) { return; }
        const fd = this.facetMap.get(this.activeFacetKey);
        if (!fd) { return; }

        const text = this.input.value;
        const partial = this.extractPartialValue(text);

        if (fd.loadValues)
        {
            this.scheduleAsyncLoad(fd, partial);
            return;
        }

        if (fd.values)
        {
            const lower = partial.toLowerCase();
            const matches = fd.values.filter(
                v => v.toLowerCase().includes(lower));
            this.suggestions = matches.map(v => ({
                type: "facet-value" as const,
                label: v,
                facetKey: fd.key,
                value: v
            }));
            this.renderDropdown();
        }
    }

    private showRecentSuggestions(): void
    {
        if (this.recentSearches.length === 0)
        {
            this.closeDropdown();
            return;
        }

        this.suggestions = this.recentSearches.map(s => ({
            type: "recent" as const,
            label: s,
            icon: "bi bi-clock-history"
        }));
        this.renderDropdown();
    }

    private scheduleAsyncLoad(
        fd: FacetDefinition, query: string): void
    {
        if (this.loadTimer !== null) { clearTimeout(this.loadTimer); }

        this.loadTimer = window.setTimeout(() =>
        {
            this.showLoadingIndicator(fd.label);
            fd.loadValues!(query)
                .then(values =>
                {
                    this.suggestions = values.map(v => ({
                        type: "facet-value" as const,
                        label: v,
                        facetKey: fd.key,
                        value: v
                    }));
                    this.renderDropdown();
                    this.announce(values.length + " values loaded");
                })
                .catch(err =>
                {
                    logError("Failed to load values:", err);
                    this.showLoadError();
                });
        }, 200);
    }

    private showLoadingIndicator(facetLabel: string): void
    {
        if (!this.dropdown) { return; }
        while (this.dropdown.firstChild) { this.dropdown.removeChild(this.dropdown.firstChild); }
        const section = createElement("div", ["facetsearch-dropdown-section"]);
        const header = createElement("span",
            ["facetsearch-dropdown-header"], facetLabel + " values");
        setAttr(header, "aria-hidden", "true");
        section.appendChild(header);

        const loading = createElement("div", ["facetsearch-dropdown-loading"]);
        setAttr(loading, "role", "status");
        const spinIcon = createElement("i",
            ["bi", "bi-arrow-repeat", "facetsearch-dropdown-loading-icon"]);
        setAttr(spinIcon, "aria-hidden", "true");
        loading.appendChild(spinIcon);
        const loadText = createElement("span", [], "Loading...");
        loading.appendChild(loadText);
        section.appendChild(loading);

        this.dropdown.appendChild(section);
        this.openDropdown();
    }

    private showLoadError(): void
    {
        if (!this.dropdown) { return; }
        while (this.dropdown.firstChild) { this.dropdown.removeChild(this.dropdown.firstChild); }
        const msg = createElement("div",
            ["facetsearch-dropdown-empty"], "Failed to load values");
        this.dropdown.appendChild(msg);
        this.openDropdown();
    }

    private extractPartialValue(text: string): string
    {
        for (const op of OPERATORS)
        {
            const idx = text.lastIndexOf(op);
            if (idx >= 0)
            {
                return text.substring(idx + op.length);
            }
        }
        return "";
    }

    // ====================================================================
    // DROPDOWN — RENDERING
    // ====================================================================

    private renderDropdown(): void
    {
        if (!this.dropdown) { return; }
        while (this.dropdown.firstChild) { this.dropdown.removeChild(this.dropdown.firstChild); }
        this.highlightIdx = -1;

        if (this.suggestions.length === 0)
        {
            this.renderEmptyDropdown();
            return;
        }

        const section = createElement("div", ["facetsearch-dropdown-section"]);
        const headerText = this.getDropdownHeaderText();
        if (headerText)
        {
            const header = createElement("span",
                ["facetsearch-dropdown-header"], headerText);
            setAttr(header, "aria-hidden", "true");
            section.appendChild(header);
        }

        for (let i = 0; i < this.suggestions.length; i++)
        {
            const item = this.buildDropdownItem(this.suggestions[i], i);
            section.appendChild(item);
        }

        this.dropdown.appendChild(section);
        this.openDropdown();
        this.announce(this.suggestions.length + " suggestions available");
    }

    private renderEmptyDropdown(): void
    {
        if (!this.dropdown) { return; }
        const msg = createElement("div",
            ["facetsearch-dropdown-empty"], "No matching suggestions");
        this.dropdown.appendChild(msg);
        this.openDropdown();
        this.announce("No matching suggestions");
    }

    private getDropdownHeaderText(): string | null
    {
        if (this.suggestions.length === 0) { return null; }
        const type = this.suggestions[0].type;
        if (type === "facet-key") { return "Facets"; }
        if (type === "facet-value" && this.activeFacetKey)
        {
            const fd = this.facetMap.get(this.activeFacetKey);
            return fd ? fd.label + " values" : null;
        }
        if (type === "recent") { return "Recent"; }
        return null;
    }

    private buildDropdownItem(
        suggestion: Suggestion, idx: number): HTMLElement
    {
        const item = createElement("div", ["facetsearch-dropdown-item"]);
        setAttr(item, "role", "option");
        setAttr(item, "id", this.id + "-option-" + idx);
        setAttr(item, "aria-selected", "false");

        if (suggestion.icon)
        {
            const iconClasses = suggestion.icon.split(" ").concat(
                "facetsearch-dropdown-item-icon");
            const icon = createElement("i", iconClasses);
            setAttr(icon, "aria-hidden", "true");
            item.appendChild(icon);
        }

        const label = createElement("span",
            ["facetsearch-dropdown-item-label"], suggestion.label);
        item.appendChild(label);

        if (suggestion.hint)
        {
            const hint = createElement("span",
                ["facetsearch-dropdown-item-hint"], suggestion.hint);
            item.appendChild(hint);
        }

        return item;
    }

    // ====================================================================
    // DROPDOWN — HIGHLIGHT
    // ====================================================================

    private setHighlight(idx: number): void
    {
        if (!this.dropdown) { return; }
        const items = this.dropdown.querySelectorAll(
            ".facetsearch-dropdown-item");
        for (let i = 0; i < items.length; i++)
        {
            items[i].classList.toggle(
                "facetsearch-dropdown-item-highlighted", i === idx);
            setAttr(items[i] as HTMLElement, "aria-selected",
                i === idx ? "true" : "false");
        }
        this.highlightIdx = idx;
        if (this.input && idx >= 0)
        {
            setAttr(this.input, "aria-activedescendant",
                this.id + "-option-" + idx);
        }
        else if (this.input)
        {
            setAttr(this.input, "aria-activedescendant", "");
        }
    }

    private moveHighlight(direction: number): void
    {
        if (this.suggestions.length === 0) { return; }
        let next = this.highlightIdx + direction;
        if (next < 0) { next = this.suggestions.length - 1; }
        if (next >= this.suggestions.length) { next = 0; }
        this.setHighlight(next);
    }

    // ====================================================================
    // SELECTION
    // ====================================================================

    private selectHighlighted(): void
    {
        if (this.highlightIdx < 0 ||
            this.highlightIdx >= this.suggestions.length) { return; }

        const suggestion = this.suggestions[this.highlightIdx];
        this.selectSuggestion(suggestion);
    }

    private selectSuggestion(suggestion: Suggestion): void
    {
        if (!this.input) { return; }

        if (suggestion.type === "facet-key" && suggestion.facetKey)
        {
            // Replace the partial token with key:
            this.replaceLastToken(suggestion.facetKey + ":");
            this.closeDropdown();
            this.updateSuggestions();
        }
        else if (suggestion.type === "facet-value" &&
            suggestion.facetKey && suggestion.value)
        {
            const fd = this.facetMap.get(suggestion.facetKey.toLowerCase());
            const op = fd?.defaultOperator || ":";
            this.addChip(
            {
                key: suggestion.facetKey,
                operator: op,
                value: suggestion.value,
                negated: false
            });
            this.removeLastTokenFromInput();
            this.closeDropdown();
            this.input.focus();
        }
        else if (suggestion.type === "recent")
        {
            this.parseAndChipify(suggestion.label);
            this.closeDropdown();
        }
    }

    /** Replace the last partial token in input with a new string. */
    private replaceLastToken(replacement: string): void
    {
        if (!this.input) { return; }
        const text = this.input.value;
        const lastSpace = text.lastIndexOf(" ");
        if (lastSpace >= 0)
        {
            this.input.value = text.substring(0, lastSpace + 1) + replacement;
        }
        else
        {
            this.input.value = replacement;
        }
    }

    /** Remove the last token (including key:value) from input. */
    private removeLastTokenFromInput(): void
    {
        if (!this.input) { return; }
        const text = this.input.value;
        const lastSpace = text.lastIndexOf(" ");
        if (lastSpace >= 0)
        {
            this.input.value = text.substring(0, lastSpace + 1);
        }
        else
        {
            this.input.value = "";
        }
    }

    // ====================================================================
    // EVENT LISTENERS
    // ====================================================================

    private attachListeners(): void
    {
        if (!this.input || !this.dropdown) { return; }

        this.boundInputHandler = () => this.handleInput();
        this.boundKeydownHandler = (e) => this.handleKeydown(e);
        this.boundFocusHandler = () => this.handleFocus();
        this.boundBlurHandler = () => this.handleBlur();
        this.boundClickOutside = (e) => this.handleClickOutside(e);
        this.boundDropdownClick = (e) => this.handleDropdownClick(e);

        this.input.addEventListener("input", this.boundInputHandler);
        this.input.addEventListener("keydown", this.boundKeydownHandler);
        this.input.addEventListener("focus", this.boundFocusHandler);
        this.input.addEventListener("blur", this.boundBlurHandler);
        document.addEventListener("mousedown", this.boundClickOutside);
        this.dropdown.addEventListener("mousedown", this.boundDropdownClick);
    }

    private detachListeners(): void
    {
        if (this.input && this.boundInputHandler)
        {
            this.input.removeEventListener("input", this.boundInputHandler);
        }
        if (this.input && this.boundKeydownHandler)
        {
            this.input.removeEventListener("keydown", this.boundKeydownHandler);
        }
        if (this.input && this.boundFocusHandler)
        {
            this.input.removeEventListener("focus", this.boundFocusHandler);
        }
        if (this.input && this.boundBlurHandler)
        {
            this.input.removeEventListener("blur", this.boundBlurHandler);
        }
        if (this.boundClickOutside)
        {
            document.removeEventListener("mousedown", this.boundClickOutside);
        }
        if (this.dropdown && this.boundDropdownClick)
        {
            this.dropdown.removeEventListener(
                "mousedown", this.boundDropdownClick);
        }
    }

    // ====================================================================
    // KEY BINDING RESOLUTION
    // ====================================================================

    private resolveKeyCombo(action: string): string
    {
        return this.opts.keyBindings?.[action]
            ?? DEFAULT_KEY_BINDINGS[action] ?? "";
    }

    private matchesKeyCombo(
        e: KeyboardEvent, action: string
    ): boolean
    {
        const combo = this.resolveKeyCombo(action);
        if (!combo) { return false; }
        const parts = combo.split("+");
        const key = parts[parts.length - 1];
        const needCtrl = parts.includes("Ctrl");
        const needShift = parts.includes("Shift");
        const needAlt = parts.includes("Alt");
        return e.key === key
            && e.ctrlKey === needCtrl
            && e.shiftKey === needShift
            && e.altKey === needAlt;
    }

    // ====================================================================
    // EVENT HANDLERS
    // ====================================================================

    private handleInput(): void
    {
        this.updateClearBtnVisibility();

        if (this.parseTimer !== null) { clearTimeout(this.parseTimer); }
        this.parseTimer = window.setTimeout(() =>
        {
            this.updateSuggestions();
        }, 50);

        if (this.opts.onChange)
        {
            this.opts.onChange(this.getValue());
        }
    }

    private handleKeydown(e: KeyboardEvent): void
    {
        if (this.matchesKeyCombo(e, "moveDown"))
        {
            e.preventDefault();
            if (!this.dropdownOpen) { this.updateSuggestions(); }
            else { this.moveHighlight(1); }
        }
        else if (this.matchesKeyCombo(e, "moveUp"))
        {
            e.preventDefault();
            if (!this.dropdownOpen) { this.updateSuggestions(); }
            else { this.moveHighlight(-1); }
        }
        else if (this.matchesKeyCombo(e, "enter"))
        {
            e.preventDefault();
            this.handleEnter();
        }
        else if (this.matchesKeyCombo(e, "escape"))
        {
            if (this.dropdownOpen)
            {
                e.preventDefault();
                this.closeDropdown();
            }
        }
        else if (this.matchesKeyCombo(e, "backspace"))
        {
            this.handleBackspace();
        }
        else if (this.matchesKeyCombo(e, "tab"))
        {
            if (this.dropdownOpen && this.highlightIdx >= 0)
            {
                this.selectHighlighted();
            }
            this.closeDropdown();
        }
        else if (this.matchesKeyCombo(e, "home"))
        {
            if (this.dropdownOpen && this.suggestions.length > 0)
            {
                e.preventDefault();
                this.setHighlight(0);
            }
        }
        else if (this.matchesKeyCombo(e, "end"))
        {
            if (this.dropdownOpen && this.suggestions.length > 0)
            {
                e.preventDefault();
                this.setHighlight(this.suggestions.length - 1);
            }
        }
    }

    private handleEnter(): void
    {
        if (this.dropdownOpen && this.highlightIdx >= 0)
        {
            this.selectHighlighted();
            return;
        }

        // Try to extract facets from current input
        this.tryExtractFacets();

        if (this.opts.submitOnEnter)
        {
            const query = this.getQuery();
            this.addToHistory(query.raw);
            logInfo("Search submitted:", query.raw);
            if (this.opts.onSearch) { this.opts.onSearch(query); }
            if (this.opts.clearOnSubmit) { this.clear(); }
        }

        this.closeDropdown();
    }

    private handleBackspace(): void
    {
        if (!this.input) { return; }

        if (this.input.selectionStart === 0 &&
            this.input.selectionEnd === 0 &&
            this.chips.length > 0)
        {
            this.removeChipAtIndex(this.chips.length - 1);
        }
    }

    private handleFocus(): void
    {
        if (this.root)
        {
            this.root.classList.add("facetsearch-focused");
        }
        this.updateSuggestions();
    }

    private handleBlur(): void
    {
        if (this.root)
        {
            this.root.classList.remove("facetsearch-focused");
        }
        // Delay to allow dropdown click to register
        setTimeout(() =>
        {
            if (!this.input || document.activeElement !== this.input)
            {
                this.closeDropdown();
            }
        }, 200);
    }

    private handleClickOutside(e: MouseEvent): void
    {
        if (this.root && !this.root.contains(e.target as Node))
        {
            this.closeDropdown();
        }
    }

    private handleDropdownClick(e: MouseEvent): void
    {
        e.preventDefault(); // Keep focus on input
        const target = (e.target as HTMLElement).closest(
            ".facetsearch-dropdown-item") as HTMLElement | null;
        if (!target) { return; }

        const id = target.getAttribute("id") || "";
        const match = id.match(/option-(\d+)$/);
        if (match)
        {
            const idx = parseInt(match[1], 10);
            if (idx >= 0 && idx < this.suggestions.length)
            {
                this.selectSuggestion(this.suggestions[idx]);
            }
        }
    }

    // ====================================================================
    // HISTORY
    // ====================================================================

    private addToHistory(raw: string): void
    {
        if (!this.opts.showHistory) { return; }
        const trimmed = raw.trim();
        if (!trimmed) { return; }

        const index = this.recentSearches.indexOf(trimmed);
        if (index >= 0) { this.recentSearches.splice(index, 1); }

        this.recentSearches.unshift(trimmed);

        const max = this.opts.maxHistory || 10;
        if (this.recentSearches.length > max)
        {
            this.recentSearches.pop();
        }
    }

    // ====================================================================
    // UI HELPERS
    // ====================================================================

    private updateClearBtnVisibility(): void
    {
        if (!this.clearBtn) { return; }
        const hasContent = this.chips.length > 0 ||
            (this.input && this.input.value.trim().length > 0);
        this.clearBtn.style.display = hasContent ? "" : "none";
    }

    private announce(msg: string): void
    {
        if (!this.liveRegion) { return; }
        this.liveRegion.textContent = "";
        requestAnimationFrame(() =>
        {
            if (this.liveRegion) { this.liveRegion.textContent = msg; }
        });
    }
}

// ============================================================================
// FACTORY + GLOBAL EXPORTS
// ============================================================================

/** Create, show, and return a FacetSearch instance. */
export function createFacetSearch(
    containerId: string, options: FacetSearchOptions): FacetSearch
{
    const fs = new FacetSearch(options);
    fs.show(containerId);
    return fs;
}

(window as unknown as Record<string, unknown>)["FacetSearch"] = FacetSearch;
(window as unknown as Record<string, unknown>)["createFacetSearch"] =
    createFacetSearch;
(window as unknown as Record<string, unknown>)["parseFacetQuery"] =
    parseFacetQuery;
