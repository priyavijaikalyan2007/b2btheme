/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: Tagger
 * 📜 PURPOSE: Combined freeform and controlled-vocabulary tag input with
 *    autocomplete, colored chips, taxonomy categories, and validation.
 * 🔗 RELATES: [[EnterpriseTheme]], [[CustomComponents]]
 * ⚡ FLOW: [Consumer] -> [new Tagger()] -> [show()] -> [DOM tagger]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// INTERFACES
// ============================================================================

/** Defines a taxonomy category with allowed tag values. */
export interface TagCategory
{
    id: string;
    label: string;
    color?: string;
    values: string[];
    allowFreeform?: boolean;
    icon?: string;
    maxTags?: number;
}

/** Represents a single applied tag. */
export interface TagItem
{
    value: string;
    category?: string;
    color?: string;
    data?: Record<string, unknown>;
}

/** Configuration options for the Tagger component. */
export interface TaggerOptions
{
    tags?: TagItem[];
    taxonomy?: TagCategory[];
    allowFreeform?: boolean;
    maxTags?: number;
    placeholder?: string;
    colorMode?: "category" | "hash" | "none";
    validator?: (value: string) => boolean | string;
    duplicateMode?: "reject" | "ignore";
    showCategoryBadge?: boolean;
    size?: "sm" | "default" | "lg";
    disabled?: boolean;
    readonly?: boolean;
    cssClass?: string;
    maxDropdownItems?: number;
    minFilterLength?: number;
    filterDebounceMs?: number;
    onAdd?: (tag: TagItem) => void;
    onRemove?: (tag: TagItem) => void;
    onChange?: (tags: TagItem[]) => void;
    onValidationError?: (value: string, error: string) => void;

    /** Override default key combos. Keys are action names, values are combo strings. */
    keyBindings?: Partial<Record<string, string>>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[Tagger]";
const HASH_PALETTE = [
    "#1c7ed6", "#2b8a3e", "#e67700", "#c92a2a",
    "#862e9c", "#0b7285", "#5c940d", "#d9480f",
    "#364fc7", "#087f5b", "#9c36b5", "#e03131"
];
let instanceCounter = 0;

/** Default key bindings for keyboard navigation actions. */
const DEFAULT_KEY_BINDINGS: Record<string, string> = {
    moveDown: "ArrowDown",
    moveUp: "ArrowUp",
    confirmTag: "Enter",
    closeSuggestions: "Escape",
    removeLastTag: "Backspace",
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

function tagKey(value: string, category?: string): string
{
    return `${category || ""}:${value}`;
}

function hashColor(value: string): string
{
    let hash = 5381;

    for (let i = 0; i < value.length; i++)
    {
        hash = ((hash << 5) + hash) + value.charCodeAt(i);
        hash = hash & hash;
    }

    return HASH_PALETTE[Math.abs(hash) % HASH_PALETTE.length];
}

function highlightMatch(
    el: HTMLElement, text: string, search: string): void
{
    const lower = text.toLowerCase();
    const idx = lower.indexOf(search.toLowerCase());

    if (idx === -1) { el.textContent = text; return; }

    el.textContent = "";

    if (idx > 0)
    {
        el.appendChild(document.createTextNode(text.substring(0, idx)));
    }

    const mark = document.createElement("mark");
    mark.classList.add("tagger-highlight");
    mark.textContent = text.substring(idx, idx + search.length);
    el.appendChild(mark);

    const rest = text.substring(idx + search.length);
    if (rest) { el.appendChild(document.createTextNode(rest)); }
}

// ============================================================================
// PUBLIC API
// ============================================================================

export class Tagger
{
    // -- Configuration
    private readonly instanceId: string;
    private options: TaggerOptions;

    // -- Data
    private tags: TagItem[] = [];
    private tagMap = new Map<string, TagItem>();
    private categoryMap = new Map<string, TagCategory>();

    // -- State
    private destroyed = false;
    private highlightIndex = -1;
    private dropdownOpen = false;
    private flatSuggestions: Array<{ value: string; category?: string }> = [];

    // -- DOM
    private rootEl!: HTMLElement;
    private wrapEl!: HTMLElement;
    private inputEl!: HTMLInputElement;
    private dropdownEl!: HTMLElement;
    private errorEl!: HTMLElement;
    private liveRegionEl!: HTMLElement;

    // -- Timers
    private filterTimer: ReturnType<typeof setTimeout> | null = null;
    private errorTimer: ReturnType<typeof setTimeout> | null = null;

    // -- Bound handlers
    private readonly boundOnDocClick: (e: MouseEvent) => void;

    constructor(options: TaggerOptions)
    {
        instanceCounter++;
        this.instanceId = `tagger-${instanceCounter}`;
        this.options = { ...options };
        this.initCategoryMap();
        this.initTags(options.tags || []);
        this.boundOnDocClick = (e) => this.onDocClick(e);
        this.rootEl = this.buildRoot();

        console.log(`${LOG_PREFIX} Initialised: ${this.instanceId}`);
    }

    // ========================================================================
    // KEY BINDING HELPERS
    // ========================================================================

    /**
     * Resolves the combo string for a named action,
     * checking user overrides first, then defaults.
     */
    private resolveKeyCombo(action: string): string
    {
        return this.options.keyBindings?.[action]
            ?? DEFAULT_KEY_BINDINGS[action] ?? "";
    }

    /**
     * Returns true when the keyboard event matches the
     * resolved combo for the given action name.
     */
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

    // ========================================================================
    // PUBLIC — LIFECYCLE
    // ========================================================================

    public show(containerId: string): void
    {
        if (this.guardDestroyed("show")) { return; }
        const c = document.getElementById(containerId);

        if (!c)
        {
            console.error(`${LOG_PREFIX} Container not found: ${containerId}`);
            return;
        }

        c.appendChild(this.rootEl);
        document.addEventListener("click", this.boundOnDocClick);
    }

    public hide(): void
    {
        if (this.guardDestroyed("hide")) { return; }
        document.removeEventListener("click", this.boundOnDocClick);
        this.closeDropdown();
        this.rootEl.remove();
    }

    public destroy(): void
    {
        if (this.destroyed) { return; }
        this.hide();
        this.clearTimers();
        this.destroyed = true;
        console.debug(`${LOG_PREFIX} Destroyed: ${this.instanceId}`);
    }

    public getElement(): HTMLElement { return this.rootEl; }

    // ========================================================================
    // PUBLIC — TAGS
    // ========================================================================

    public getTags(): TagItem[]
    {
        return this.tags.map(t => ({ ...t }));
    }

    public setTags(tags: TagItem[]): void
    {
        if (this.guardMutation("setTags")) { return; }
        this.tags = [];
        this.tagMap.clear();

        for (const t of tags) { this.pushTag(t); }

        this.renderChips();
        this.options.onChange?.(this.getTags());
    }

    public addTag(tag: TagItem): boolean
    {
        if (this.guardMutation("addTag")) { return false; }

        const trimmed = { ...tag, value: tag.value.trim() };
        if (!trimmed.value) { return false; }

        const error = this.validateTag(trimmed);
        if (error) { this.showError(trimmed.value, error); return false; }

        this.pushTag(trimmed);
        this.addChipDOM(trimmed);
        this.options.onAdd?.(trimmed);
        this.options.onChange?.(this.getTags());
        this.announce(this.formatTagAnnounce(trimmed, "added"));
        console.log(`${LOG_PREFIX} Tag "${trimmed.value}" added`);
        return true;
    }

    public removeTag(value: string, category?: string): boolean
    {
        if (this.guardMutation("removeTag")) { return false; }
        const key = tagKey(value, category);
        const tag = this.tagMap.get(key);

        if (!tag) { return false; }

        this.tags = this.tags.filter(t => tagKey(t.value, t.category) !== key);
        this.tagMap.delete(key);
        this.removeChipDOM(value, category);
        this.options.onRemove?.(tag);
        this.options.onChange?.(this.getTags());
        this.announce(`Tag ${value} removed`);
        console.log(`${LOG_PREFIX} Tag "${value}" removed`);
        return true;
    }

    public clearTags(): void
    {
        if (this.guardMutation("clearTags")) { return; }
        this.tags = [];
        this.tagMap.clear();
        this.renderChips();
        this.options.onChange?.(this.getTags());
    }

    public hasTag(value: string, category?: string): boolean
    {
        return this.tagMap.has(tagKey(value, category));
    }

    public getTagsByCategory(categoryId: string): TagItem[]
    {
        return this.tags.filter(t => t.category === categoryId);
    }

    public focus(): void { this.inputEl?.focus(); }

    public enable(): void
    {
        this.options.disabled = false;
        this.rootEl.classList.remove("tagger-disabled");
        this.inputEl.disabled = false;
    }

    public disable(): void
    {
        this.options.disabled = true;
        this.rootEl.classList.add("tagger-disabled");
        this.inputEl.disabled = true;
        this.closeDropdown();
    }

    // ========================================================================
    // DATA INIT
    // ========================================================================

    private initCategoryMap(): void
    {
        this.categoryMap.clear();

        for (const cat of (this.options.taxonomy || []))
        {
            this.categoryMap.set(cat.id, cat);
        }
    }

    private initTags(tags: TagItem[]): void
    {
        for (const t of tags) { this.pushTag(t); }
    }

    private pushTag(tag: TagItem): void
    {
        const key = tagKey(tag.value, tag.category);

        if (this.tagMap.has(key)) { return; }

        this.tags.push(tag);
        this.tagMap.set(key, tag);
    }

    // ========================================================================
    // VALIDATION
    // ========================================================================

    private validateTag(tag: TagItem): string | null
    {
        if (this.tagMap.has(tagKey(tag.value, tag.category)))
        {
            return this.handleDuplicate(tag);
        }

        if (this.options.maxTags && this.tags.length >= this.options.maxTags)
        {
            return "Maximum tags reached";
        }

        if (tag.category)
        {
            const catErr = this.checkCategoryMax(tag);
            if (catErr) { return catErr; }
        }

        if (this.options.validator)
        {
            const result = this.options.validator(tag.value);

            if (typeof result === "string") { return result; }
            if (result === false) { return "Invalid tag"; }
        }

        return null;
    }

    private handleDuplicate(tag: TagItem): string | null
    {
        if (this.options.duplicateMode === "ignore") { return ""; }
        this.flashChip(tag.value, tag.category);
        return "Tag already exists";
    }

    private checkCategoryMax(tag: TagItem): string | null
    {
        const cat = this.categoryMap.get(tag.category!);

        if (cat?.maxTags && this.getTagsByCategory(tag.category!).length >= cat.maxTags)
        {
            return `Maximum tags for ${cat.label} reached`;
        }

        return null;
    }

    // ========================================================================
    // BUILDING — ROOT
    // ========================================================================

    private buildRoot(): HTMLElement
    {
        const root = createElement("div", ["tagger"]);
        setAttr(root, "id", this.instanceId);

        if (this.options.size === "sm") { root.classList.add("tagger-sm"); }
        if (this.options.size === "lg") { root.classList.add("tagger-lg"); }
        if (this.options.disabled) { root.classList.add("tagger-disabled"); }
        if (this.options.readonly) { root.classList.add("tagger-readonly"); }
        if (this.options.cssClass) { root.classList.add(...this.options.cssClass.split(" ")); }

        this.wrapEl = this.buildWrap();
        root.appendChild(this.wrapEl);

        this.dropdownEl = this.buildDropdown();
        root.appendChild(this.dropdownEl);

        this.errorEl = createElement("div", ["tagger-error"]);
        setAttr(this.errorEl, "role", "alert");
        this.errorEl.style.display = "none";
        root.appendChild(this.errorEl);

        this.liveRegionEl = createElement("div", ["visually-hidden"]);
        setAttr(this.liveRegionEl, "aria-live", "polite");
        setAttr(this.liveRegionEl, "aria-atomic", "true");
        root.appendChild(this.liveRegionEl);

        return root;
    }

    // ========================================================================
    // BUILDING — WRAP & INPUT
    // ========================================================================

    private buildWrap(): HTMLElement
    {
        const wrap = createElement("div", ["tagger-wrap"]);
        setAttr(wrap, "role", "group");
        setAttr(wrap, "aria-label", "Tags");

        for (const tag of this.tags)
        {
            wrap.appendChild(this.buildChip(tag));
        }

        if (!this.options.readonly)
        {
            this.inputEl = this.buildInput();
            wrap.appendChild(this.inputEl);
        }
        else
        {
            this.inputEl = document.createElement("input");
            this.inputEl.type = "hidden";
        }

        wrap.addEventListener("click", (e) => this.onWrapClick(e));
        return wrap;
    }

    private buildInput(): HTMLInputElement
    {
        const input = document.createElement("input");
        input.type = "text";
        input.classList.add("tagger-input");
        setAttr(input, "role", "combobox");
        setAttr(input, "aria-expanded", "false");
        setAttr(input, "aria-controls", `${this.instanceId}-dropdown`);
        setAttr(input, "aria-activedescendant", "");
        setAttr(input, "aria-autocomplete", "list");
        setAttr(input, "aria-haspopup", "listbox");
        setAttr(input, "autocomplete", "off");
        input.placeholder = this.options.placeholder || "Add tag...";

        if (this.options.disabled) { input.disabled = true; }

        input.addEventListener("input", () => this.onInputChange());
        input.addEventListener("keydown", (e) => this.onInputKeydown(e));
        input.addEventListener("focus", () => this.onInputFocus());
        input.addEventListener("blur", () => this.onInputBlur());
        input.addEventListener("paste", (e) => this.onPaste(e));
        return input;
    }

    // ========================================================================
    // BUILDING — DROPDOWN
    // ========================================================================

    private buildDropdown(): HTMLElement
    {
        const dd = createElement("div", ["tagger-dropdown"]);
        setAttr(dd, "id", `${this.instanceId}-dropdown`);
        setAttr(dd, "role", "listbox");
        setAttr(dd, "aria-label", "Tag suggestions");
        dd.style.display = "none";

        dd.addEventListener("click", (e) => this.onDropdownClick(e));
        return dd;
    }

    // ========================================================================
    // BUILDING — CHIPS
    // ========================================================================

    private buildChip(tag: TagItem): HTMLElement
    {
        const cat = tag.category ? this.categoryMap.get(tag.category) : undefined;
        const chip = createElement("span", ["tagger-chip"]);
        setAttr(chip, "data-value", tag.value);
        setAttr(chip, "title", tag.value);
        if (tag.category) { setAttr(chip, "data-category", tag.category); }
        if (!tag.category) { chip.classList.add("tagger-chip-freeform"); }

        this.applyChipColor(chip, tag, cat);

        if (cat && this.options.showCategoryBadge !== false)
        {
            chip.appendChild(this.buildChipBadge(cat));
        }

        chip.appendChild(this.buildChipLabel(tag.value));

        if (!this.options.readonly && !this.options.disabled)
        {
            chip.appendChild(this.buildChipRemoveBtn(tag.value));
        }

        return chip;
    }

    private applyChipColor(
        chip: HTMLElement, tag: TagItem, cat?: TagCategory): void
    {
        const mode = this.options.colorMode || "category";

        if (tag.color)
        {
            chip.style.borderLeftColor = tag.color;
            return;
        }

        if (mode === "category" && cat?.color)
        {
            chip.style.borderLeftColor = cat.color;
        }
        else if (mode === "hash")
        {
            chip.style.borderLeftColor = hashColor(tag.value);
        }
    }

    private buildChipBadge(cat: TagCategory): HTMLElement
    {
        const badge = createElement("span", ["tagger-chip-badge"], cat.label);

        if (cat.color)
        {
            badge.style.backgroundColor = cat.color;
        }

        return badge;
    }

    private buildChipLabel(text: string): HTMLElement
    {
        return createElement("span", ["tagger-chip-label"], text);
    }

    private buildChipRemoveBtn(value: string): HTMLElement
    {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.classList.add("tagger-chip-remove");
        setAttr(btn, "aria-label", `Remove tag ${value}`);
        btn.tabIndex = -1;
        btn.appendChild(createElement("i", ["bi", "bi-x"]));
        return btn;
    }

    // ========================================================================
    // CHIP DOM OPERATIONS
    // ========================================================================

    private renderChips(): void
    {
        const oldChips = this.wrapEl.querySelectorAll(".tagger-chip");
        oldChips.forEach(c => c.remove());

        const frag = document.createDocumentFragment();

        for (const tag of this.tags)
        {
            frag.appendChild(this.buildChip(tag));
        }

        this.wrapEl.insertBefore(frag, this.inputEl);
    }

    private addChipDOM(tag: TagItem): void
    {
        const chip = this.buildChip(tag);
        this.wrapEl.insertBefore(chip, this.inputEl);
    }

    private removeChipDOM(value: string, category?: string): void
    {
        const sel = this.buildChipSelector(value, category);
        const chip = this.wrapEl.querySelector(sel);
        chip?.remove();
    }

    private flashChip(value: string, category?: string): void
    {
        const sel = this.buildChipSelector(value, category);
        const chip = this.wrapEl.querySelector(sel);
        if (!chip) { return; }

        chip.classList.add("tagger-chip-flash");
        setTimeout(() => chip.classList.remove("tagger-chip-flash"), 300);
    }

    private buildChipSelector(value: string, category?: string): string
    {
        let sel = `.tagger-chip[data-value="${CSS.escape(value)}"]`;
        if (category) { sel += `[data-category="${CSS.escape(category)}"]`; }
        return sel;
    }

    // ========================================================================
    // DROPDOWN — RENDERING
    // ========================================================================

    private renderDropdown(): void
    {
        const filterText = this.inputEl.value.trim().toLowerCase();
        this.dropdownEl.innerHTML = "";
        this.flatSuggestions = [];
        this.highlightIndex = -1;

        const taxonomy = this.options.taxonomy || [];

        for (const cat of taxonomy)
        {
            this.renderCategoryGroup(cat, filterText);
        }

        if (this.shouldShowCreate(filterText))
        {
            this.renderCreateRow(filterText);
        }

        if (this.flatSuggestions.length === 0)
        {
            this.renderNoResults();
        }

        this.openDropdown();
    }

    private renderCategoryGroup(cat: TagCategory, filter: string): void
    {
        const matches = cat.values.filter(v =>
            v.toLowerCase().includes(filter));

        if (matches.length === 0) { return; }

        const group = createElement("div", ["tagger-dropdown-group"]);
        setAttr(group, "role", "group");
        setAttr(group, "aria-label", cat.label);

        group.appendChild(this.buildDropdownHeader(cat));

        for (const val of matches)
        {
            const idx = this.flatSuggestions.length;
            group.appendChild(this.buildDropdownItem(val, cat, filter, idx));
            this.flatSuggestions.push({ value: val, category: cat.id });
        }

        this.dropdownEl.appendChild(group);
    }

    private buildDropdownHeader(cat: TagCategory): HTMLElement
    {
        const header = createElement("div", ["tagger-dropdown-header"]);

        if (cat.color)
        {
            const dot = createElement("span", ["tagger-dropdown-header-dot"]);
            dot.style.backgroundColor = cat.color;
            header.appendChild(dot);
        }

        header.appendChild(document.createTextNode(cat.label));
        return header;
    }

    private buildDropdownItem(
        value: string, cat: TagCategory,
        filter: string, idx: number): HTMLElement
    {
        const item = createElement("div", ["tagger-dropdown-item"]);
        setAttr(item, "role", "option");
        setAttr(item, "id", `${this.instanceId}-opt-${idx}`);
        setAttr(item, "aria-selected", "false");
        setAttr(item, "data-value", value);
        setAttr(item, "data-category", cat.id);
        setAttr(item, "data-idx", String(idx));

        const isAdded = this.hasTag(value, cat.id);

        if (isAdded)
        {
            item.classList.add("tagger-dropdown-item-added");
            item.appendChild(createElement("i", ["bi", "bi-check", "tagger-dropdown-check"]));
        }

        const label = createElement("span", []);
        highlightMatch(label, value, filter);
        item.appendChild(label);

        return item;
    }

    private shouldShowCreate(filter: string): boolean
    {
        if (!filter) { return false; }
        if (this.options.allowFreeform === false) { return false; }

        const exactMatch = (this.options.taxonomy || []).some(cat =>
            cat.values.some(v => v.toLowerCase() === filter));

        return !exactMatch;
    }

    private renderCreateRow(filter: string): void
    {
        const divider = createElement("div", ["tagger-dropdown-divider"]);
        setAttr(divider, "role", "separator");
        this.dropdownEl.appendChild(divider);

        const idx = this.flatSuggestions.length;
        const row = createElement("div", ["tagger-dropdown-create"]);
        setAttr(row, "role", "option");
        setAttr(row, "id", `${this.instanceId}-opt-${idx}`);
        setAttr(row, "aria-selected", "false");
        setAttr(row, "data-idx", String(idx));

        row.appendChild(document.createTextNode('Create "'));
        const strong = document.createElement("strong");
        strong.textContent = this.inputEl.value.trim();
        row.appendChild(strong);
        row.appendChild(document.createTextNode('"'));

        const hint = createElement("span", ["tagger-dropdown-create-hint"], "Enter");
        row.appendChild(hint);

        this.dropdownEl.appendChild(row);
        this.flatSuggestions.push({ value: this.inputEl.value.trim() });
    }

    private renderNoResults(): void
    {
        const msg = createElement("div", ["tagger-dropdown-empty"],
            "No matching tags");
        this.dropdownEl.appendChild(msg);
    }

    // ========================================================================
    // DROPDOWN — OPEN/CLOSE
    // ========================================================================

    private openDropdown(): void
    {
        if (this.flatSuggestions.length === 0 &&
            !this.dropdownEl.querySelector(".tagger-dropdown-empty"))
        {
            return;
        }

        this.dropdownEl.style.display = "";
        this.dropdownOpen = true;
        setAttr(this.inputEl, "aria-expanded", "true");
        this.positionDropdown();
    }

    private positionDropdown(): void
    {
        if (!this.dropdownEl || !this.wrapEl)
        {
            return;
        }

        const rect = this.wrapEl.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const ddHeight = this.dropdownEl.offsetHeight || 280;
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

    private closeDropdown(): void
    {
        this.dropdownEl.style.display = "none";
        this.dropdownOpen = false;
        this.highlightIndex = -1;
        setAttr(this.inputEl, "aria-expanded", "false");
        setAttr(this.inputEl, "aria-activedescendant", "");
    }

    // ========================================================================
    // HIGHLIGHT
    // ========================================================================

    private setHighlight(index: number): void
    {
        const items = this.dropdownEl.querySelectorAll("[data-idx]");
        items.forEach(el => el.classList.remove("tagger-dropdown-item-highlighted"));

        if (index >= 0 && index < items.length)
        {
            const el = items[index];
            el.classList.add("tagger-dropdown-item-highlighted");
            setAttr(el as HTMLElement, "aria-selected", "true");
            setAttr(this.inputEl, "aria-activedescendant", el.id);
            el.scrollIntoView({ block: "nearest" });
        }

        this.highlightIndex = index;
    }

    private moveHighlight(delta: number): void
    {
        const count = this.flatSuggestions.length;
        if (count === 0) { return; }

        let next = this.highlightIndex + delta;

        if (next < 0) { next = count - 1; }
        if (next >= count) { next = 0; }

        this.setHighlight(next);
    }

    // ========================================================================
    // EVENT HANDLERS
    // ========================================================================

    private onInputChange(): void
    {
        const debounce = this.options.filterDebounceMs ?? 150;

        if (this.filterTimer) { clearTimeout(this.filterTimer); }

        this.filterTimer = setTimeout(() =>
        {
            this.renderDropdown();
            this.filterTimer = null;
        }, debounce);
    }

    private onInputKeydown(e: KeyboardEvent): void
    {
        if (this.matchesKeyCombo(e, "moveDown"))
        {
            e.preventDefault();
            if (!this.dropdownOpen) { this.renderDropdown(); }
            this.moveHighlight(1);
        }
        else if (this.matchesKeyCombo(e, "moveUp"))
        {
            e.preventDefault();
            if (!this.dropdownOpen) { this.renderDropdown(); }
            this.moveHighlight(-1);
        }
        else if (this.matchesKeyCombo(e, "confirmTag"))
        {
            e.preventDefault();
            this.handleEnter();
        }
        else if (this.matchesKeyCombo(e, "closeSuggestions"))
        {
            this.handleEscape();
        }
        else if (this.matchesKeyCombo(e, "removeLastTag"))
        {
            this.handleBackspace();
        }
    }

    private handleEnter(): void
    {
        if (this.dropdownOpen && this.highlightIndex >= 0)
        {
            this.selectSuggestion(this.highlightIndex);
        }
        else if (this.inputEl.value.trim() &&
            this.options.allowFreeform !== false)
        {
            this.addTag({ value: this.inputEl.value.trim() });
            this.clearInput();
        }
    }

    private handleEscape(): void
    {
        if (this.dropdownOpen)
        {
            this.closeDropdown();
            this.inputEl.value = "";
        }
    }

    private handleBackspace(): void
    {
        if (this.inputEl.value !== "") { return; }
        if (this.tags.length === 0) { return; }

        const last = this.tags[this.tags.length - 1];
        this.removeTag(last.value, last.category);
    }

    private onInputFocus(): void
    {
        this.rootEl.classList.add("tagger-focused");
        const minLen = this.options.minFilterLength ?? 0;

        if (this.inputEl.value.length >= minLen)
        {
            this.renderDropdown();
        }
    }

    private onInputBlur(): void
    {
        this.rootEl.classList.remove("tagger-focused");
    }

    private onWrapClick(e: Event): void
    {
        const remove = (e.target as HTMLElement).closest(".tagger-chip-remove");

        if (remove)
        {
            const chip = remove.closest(".tagger-chip") as HTMLElement;
            if (!chip) { return; }
            const value = chip.getAttribute("data-value") || "";
            const category = chip.getAttribute("data-category") || undefined;
            this.removeTag(value, category);
            this.focus();
            return;
        }

        this.focus();
    }

    private onDropdownClick(e: Event): void
    {
        const item = (e.target as HTMLElement).closest("[data-idx]") as HTMLElement;
        if (!item) { return; }
        e.preventDefault();

        const idx = parseInt(item.getAttribute("data-idx") || "-1", 10);
        if (idx >= 0) { this.selectSuggestion(idx); }
    }

    private onDocClick(e: MouseEvent): void
    {
        if (!this.rootEl.contains(e.target as Node))
        {
            this.closeDropdown();
        }
    }

    private onPaste(e: ClipboardEvent): void
    {
        const text = e.clipboardData?.getData("text") || "";

        if (!text.includes(",")) { return; }

        e.preventDefault();
        const parts = text.split(",").map(s => s.trim()).filter(Boolean);
        let added = 0;

        for (const part of parts)
        {
            if (this.addTag({ value: part })) { added++; }
        }

        console.log(`${LOG_PREFIX} Pasted ${added} tags`);
    }

    // ========================================================================
    // SUGGESTION SELECTION
    // ========================================================================

    private selectSuggestion(index: number): void
    {
        const suggestion = this.flatSuggestions[index];
        if (!suggestion) { return; }

        if (suggestion.category &&
            this.hasTag(suggestion.value, suggestion.category))
        {
            this.removeTag(suggestion.value, suggestion.category);
        }
        else
        {
            this.addTag({ value: suggestion.value, category: suggestion.category });
        }

        this.clearInput();
    }

    private clearInput(): void
    {
        this.inputEl.value = "";
        this.closeDropdown();
    }

    // ========================================================================
    // ERROR DISPLAY
    // ========================================================================

    private showError(value: string, error: string): void
    {
        if (!error) { return; }

        this.errorEl.textContent = error;
        this.errorEl.style.display = "";
        this.options.onValidationError?.(value, error);
        console.warn(`${LOG_PREFIX} Tag "${value}" rejected: ${error}`);

        if (this.errorTimer) { clearTimeout(this.errorTimer); }

        this.errorTimer = setTimeout(() =>
        {
            this.errorEl.style.display = "none";
            this.errorTimer = null;
        }, 3000);
    }

    // ========================================================================
    // UTILITIES
    // ========================================================================

    private guardDestroyed(method: string): boolean
    {
        if (this.destroyed)
        {
            console.warn(`${LOG_PREFIX} Cannot ${method}: component destroyed`);
            return true;
        }

        return false;
    }

    private guardMutation(method: string): boolean
    {
        if (this.guardDestroyed(method)) { return true; }

        if (this.options.disabled || this.options.readonly)
        {
            console.warn(`${LOG_PREFIX} ${method}() ignored: component is ${
                this.options.disabled ? "disabled" : "readonly"}`);
            return true;
        }

        return false;
    }

    private announce(message: string): void
    {
        if (!this.liveRegionEl) { return; }
        this.liveRegionEl.textContent = "";

        requestAnimationFrame(() =>
        {
            this.liveRegionEl.textContent = message;
        });
    }

    private formatTagAnnounce(tag: TagItem, action: string): string
    {
        if (tag.category)
        {
            const cat = this.categoryMap.get(tag.category);
            return `Tag ${cat?.label || tag.category} ${tag.value} ${action}`;
        }

        return `Tag ${tag.value} ${action}`;
    }

    private clearTimers(): void
    {
        if (this.filterTimer) { clearTimeout(this.filterTimer); }
        if (this.errorTimer) { clearTimeout(this.errorTimer); }
    }
}

// ============================================================================
// CONVENIENCE FUNCTION
// ============================================================================

export function createTagger(
    containerId: string,
    options?: TaggerOptions): Tagger
{
    const instance = new Tagger(options || {});
    instance.show(containerId);
    return instance;
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

if (typeof window !== "undefined")
{
    (window as unknown as Record<string, unknown>)["Tagger"] = Tagger;
    (window as unknown as Record<string, unknown>)["createTagger"] = createTagger;
}
