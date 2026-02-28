/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: PeoplePicker
 * 📜 PURPOSE: Searchable person selector with frequent contacts, async API
 *    lookup, and PersonChip integration. Supports single-select and
 *    multi-select modes with chips, keyboard navigation, and overflow badge.
 * 🔗 RELATES: [[EnterpriseTheme]], [[PersonChip]], [[Tagger]], [[UserMenu]]
 * ⚡ FLOW: [Consumer] -> [createPeoplePicker()] -> [PeoplePicker DOM widget]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// INTERFACES
// ============================================================================

/** Data for a single person in the picker. */
export interface PersonData
{
    id: string;
    name: string;
    email?: string;
    avatarUrl?: string;
    role?: string;
    status?: "online" | "offline" | "busy" | "away";
    metadata?: Record<string, string>;
}

/** Configuration options for the PeoplePicker component. */
export interface PeoplePickerOptions
{
    multiple?: boolean;
    maxSelections?: number;
    selected?: PersonData[];
    frequentContacts?: PersonData[];
    onSearch?: (query: string) => Promise<PersonData[]>;
    searchUrl?: string;
    debounceMs?: number;
    minSearchChars?: number;
    placeholder?: string;
    maxChipsVisible?: number;
    noResultsText?: string;
    size?: "sm" | "md" | "lg";
    cssClass?: string;
    disabled?: boolean;
    readonly?: boolean;
    onSelect?: (person: PersonData) => void;
    onDeselect?: (person: PersonData) => void;
    onChange?: (selected: PersonData[]) => void;
    onOpen?: () => void;
    onClose?: () => void;
    onSearchError?: (error: Error) => void;
    keyBindings?: Partial<Record<string, string>>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[PeoplePicker]";
const DEFAULT_DEBOUNCE = 300;
const DEFAULT_MIN_CHARS = 2;
const DEFAULT_MAX_CHIPS = 5;
const DEFAULT_PLACEHOLDER = "Search people...";
const DEFAULT_NO_RESULTS = "No results found";

let instanceCounter = 0;

/** Deterministic palette for initials — copied from PersonChip (IIFE constraint). */
const INITIALS_COLORS: string[] = [
    "#1c7ed6", "#2b8a3e", "#e67700", "#862e9c",
    "#c92a2a", "#0b7285", "#5c940d", "#d6336c",
];

/** Default key bindings for keyboard navigation. */
const DEFAULT_KEY_BINDINGS: Record<string, string> = {
    moveDown: "ArrowDown",
    moveUp: "ArrowUp",
    confirm: "Enter",
    close: "Escape",
    removeLast: "Backspace",
    jumpFirst: "Home",
    jumpLast: "End",
};

// ============================================================================
// DOM HELPERS
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
// INITIALS HELPERS (copied from PersonChip — IIFE constraint)
// ============================================================================

function getInitialsFromName(name: string): string
{
    const parts = name.trim().split(/\s+/);

    if (parts.length >= 2)
    {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    return (parts[0] || "?").substring(0, 2).toUpperCase();
}

function getInitialsColor(name: string): string
{
    let hash = 0;

    for (let i = 0; i < name.length; i++)
    {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    return INITIALS_COLORS[Math.abs(hash) % INITIALS_COLORS.length];
}

// ============================================================================
// PERSONCHIP RUNTIME BRIDGE
// ============================================================================

/**
 * Try to create a PersonChip via the global factory.
 * Returns the DOM element, or null if PersonChip JS is not loaded.
 */
function tryCreatePersonChip(
    person: PersonData, size: "sm" | "md" | "lg"): HTMLElement | null
{
    const factory = (window as unknown as Record<string, unknown>)[
        "createPersonChip"
    ] as ((opts: Record<string, unknown>) => { getElement: () => HTMLElement }) | undefined;

    if (!factory) { return null; }

    try
    {
        const chip = factory({
            name: person.name,
            email: person.email,
            avatarUrl: person.avatarUrl,
            role: person.role,
            status: person.status,
            size: size,
        });

        return chip.getElement();
    }
    catch (err)
    {
        console.warn(LOG_PREFIX, "PersonChip creation failed, using fallback", err);
        return null;
    }
}

/**
 * Build a simple fallback element when PersonChip JS is not available.
 */
function buildFallbackChip(person: PersonData): HTMLElement
{
    const wrap = createElement("span", ["peoplepicker-fallback"]);
    wrap.style.display = "inline-flex";
    wrap.style.alignItems = "center";
    wrap.style.gap = "6px";

    const avatar = buildFallbackAvatar(person);
    wrap.appendChild(avatar);

    const nameEl = createElement("span", [], person.name);
    nameEl.style.whiteSpace = "nowrap";
    nameEl.style.overflow = "hidden";
    nameEl.style.textOverflow = "ellipsis";
    nameEl.style.maxWidth = "160px";
    wrap.appendChild(nameEl);

    return wrap;
}

function buildFallbackAvatar(person: PersonData): HTMLElement
{
    if (person.avatarUrl)
    {
        const img = document.createElement("img");
        img.src = person.avatarUrl;
        img.alt = getInitialsFromName(person.name);
        img.style.width = "20px";
        img.style.height = "20px";
        img.style.borderRadius = "50%";
        img.style.objectFit = "cover";
        return img;
    }

    const span = createElement("span", [], getInitialsFromName(person.name));
    span.style.display = "inline-flex";
    span.style.alignItems = "center";
    span.style.justifyContent = "center";
    span.style.width = "20px";
    span.style.height = "20px";
    span.style.borderRadius = "50%";
    span.style.backgroundColor = getInitialsColor(person.name);
    span.style.color = "#fff";
    span.style.fontSize = "0.6rem";
    span.style.fontWeight = "600";
    return span;
}

// ============================================================================
// CLASS: PeoplePicker
// ============================================================================

export class PeoplePicker
{
    private readonly instanceId: string;
    private options: PeoplePickerOptions;

    // -- Data
    private selected: PersonData[] = [];
    private selectedMap = new Map<string, PersonData>();
    private frequentContacts: PersonData[] = [];
    private searchResults: PersonData[] = [];

    // -- State
    private destroyed = false;
    private dropdownOpen = false;
    private highlightIndex = -1;
    private searchGeneration = 0;
    private isSearching = false;

    // -- Flat rows for keyboard nav
    private flatRows: PersonData[] = [];

    // -- DOM
    private rootEl!: HTMLElement;
    private inputAreaEl!: HTMLElement;
    private chipsEl!: HTMLElement;
    private inputEl!: HTMLInputElement;
    private spinnerEl!: HTMLElement;
    private dropdownEl!: HTMLElement;
    private frequentSectionEl!: HTMLElement;
    private frequentListEl!: HTMLElement;
    private resultsSectionEl!: HTMLElement;
    private resultsListEl!: HTMLElement;
    private noResultsEl!: HTMLElement;
    private liveRegionEl!: HTMLElement;
    private singleDisplayEl: HTMLElement | null = null;

    // -- Timers
    private debounceTimer: ReturnType<typeof setTimeout> | null = null;

    // -- Bound handlers
    private readonly boundOnDocClick: (e: MouseEvent) => void;

    constructor(options: PeoplePickerOptions)
    {
        instanceCounter++;
        this.instanceId = `pp-${instanceCounter}`;
        this.options = { ...options };
        this.frequentContacts = (options.frequentContacts || []).slice();
        this.initSelected(options.selected || []);
        this.boundOnDocClick = (e) => this.onDocClick(e);
        this.rootEl = this.buildRoot();

        console.log(`${LOG_PREFIX} Initialised: ${this.instanceId}`);
    }

    // ========================================================================
    // KEY BINDING HELPERS
    // ========================================================================

    private resolveKeyCombo(action: string): string
    {
        return this.options.keyBindings?.[action]
            ?? DEFAULT_KEY_BINDINGS[action] ?? "";
    }

    private matchesKeyCombo(e: KeyboardEvent, action: string): boolean
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

    public getElement(): HTMLElement { return this.rootEl; }

    public destroy(): void
    {
        if (this.destroyed) { return; }
        document.removeEventListener("click", this.boundOnDocClick);
        this.closeDropdown();
        this.clearTimers();
        this.rootEl.remove();
        this.dropdownEl.remove();
        this.destroyed = true;
        console.debug(`${LOG_PREFIX} Destroyed: ${this.instanceId}`);
    }

    // ========================================================================
    // PUBLIC — SELECTION
    // ========================================================================

    public getSelected(): PersonData[]
    {
        return this.selected.map(p => ({ ...p }));
    }

    public setSelected(people: PersonData[]): void
    {
        if (this.guardMutation("setSelected")) { return; }
        this.selected = [];
        this.selectedMap.clear();

        for (const p of people) { this.pushSelected(p); }

        this.renderChips();
        this.options.onChange?.(this.getSelected());
    }

    public addPerson(person: PersonData): void
    {
        if (this.guardMutation("addPerson")) { return; }
        if (this.selectedMap.has(person.id)) { return; }
        if (this.isAtMax()) { return; }

        this.pushSelected(person);
        this.renderChips();
        this.options.onSelect?.(person);
        this.options.onChange?.(this.getSelected());
        this.announce(`${person.name} selected`);
        console.log(`${LOG_PREFIX} Selected: ${person.name}`);
    }

    public removePerson(id: string): void
    {
        if (this.guardMutation("removePerson")) { return; }
        const person = this.selectedMap.get(id);
        if (!person) { return; }

        this.selected = this.selected.filter(p => p.id !== id);
        this.selectedMap.delete(id);
        this.renderChips();
        this.options.onDeselect?.(person);
        this.options.onChange?.(this.getSelected());
        this.announce(`${person.name} removed`);
        console.log(`${LOG_PREFIX} Deselected: ${person.name}`);
    }

    public clearSelection(): void
    {
        if (this.guardMutation("clearSelection")) { return; }
        this.selected = [];
        this.selectedMap.clear();
        this.renderChips();
        this.options.onChange?.(this.getSelected());
    }

    public hasSelection(id: string): boolean
    {
        return this.selectedMap.has(id);
    }

    // ========================================================================
    // PUBLIC — STATE
    // ========================================================================

    public enable(): void
    {
        this.options.disabled = false;
        this.rootEl.classList.remove("peoplepicker-disabled");
        this.inputEl.disabled = false;
    }

    public disable(): void
    {
        this.options.disabled = true;
        this.rootEl.classList.add("peoplepicker-disabled");
        this.inputEl.disabled = true;
        this.closeDropdown();
    }

    public setReadonly(flag: boolean): void
    {
        this.options.readonly = flag;

        if (flag)
        {
            this.rootEl.classList.add("peoplepicker-readonly");
            this.closeDropdown();
        }
        else
        {
            this.rootEl.classList.remove("peoplepicker-readonly");
        }

        this.renderChips();
    }

    public setFrequentContacts(contacts: PersonData[]): void
    {
        this.frequentContacts = contacts.slice();
        this.renderFrequentSection();
    }

    public focus(): void
    {
        this.inputEl?.focus();
    }

    // ========================================================================
    // DATA INIT
    // ========================================================================

    private initSelected(people: PersonData[]): void
    {
        for (const p of people) { this.pushSelected(p); }
    }

    private pushSelected(person: PersonData): void
    {
        if (this.selectedMap.has(person.id)) { return; }
        this.selected.push(person);
        this.selectedMap.set(person.id, person);
    }

    private isAtMax(): boolean
    {
        const max = this.options.maxSelections || 0;
        return max > 0 && this.selected.length >= max;
    }

    private isMultiple(): boolean
    {
        return this.options.multiple !== false;
    }

    // ========================================================================
    // BUILDING — ROOT
    // ========================================================================

    private buildRoot(): HTMLElement
    {
        const root = createElement("div", ["peoplepicker"]);
        setAttr(root, "id", this.instanceId);
        setAttr(root, "role", "combobox");
        setAttr(root, "aria-haspopup", "listbox");
        setAttr(root, "aria-expanded", "false");
        setAttr(root, "aria-owns", `${this.instanceId}-listbox`);

        this.applySizeClass(root);
        this.applyStateClasses(root);

        if (this.options.cssClass)
        {
            root.classList.add(...this.options.cssClass.split(" "));
        }

        this.inputAreaEl = this.buildInputArea();
        root.appendChild(this.inputAreaEl);

        this.dropdownEl = this.buildDropdown();
        // Append dropdown to document.body to avoid containing-block traps
        // (transforms, will-change) that break position:fixed when the picker
        // is inside dialogs or animated containers.
        document.body.appendChild(this.dropdownEl);

        this.liveRegionEl = createElement("div", ["visually-hidden"]);
        setAttr(this.liveRegionEl, "aria-live", "polite");
        setAttr(this.liveRegionEl, "aria-atomic", "true");
        root.appendChild(this.liveRegionEl);

        return root;
    }

    private applySizeClass(root: HTMLElement): void
    {
        const size = this.options.size || "md";
        root.classList.add(`peoplepicker-${size}`);
    }

    private applyStateClasses(root: HTMLElement): void
    {
        if (this.options.disabled) { root.classList.add("peoplepicker-disabled"); }
        if (this.options.readonly) { root.classList.add("peoplepicker-readonly"); }
    }

    // ========================================================================
    // BUILDING — INPUT AREA
    // ========================================================================

    private buildInputArea(): HTMLElement
    {
        const area = createElement("div", ["peoplepicker-input-area"]);
        area.addEventListener("click", (e) => this.onInputAreaClick(e));

        this.chipsEl = createElement("div", ["peoplepicker-chips"]);
        setAttr(this.chipsEl, "role", "list");
        area.appendChild(this.chipsEl);

        this.inputEl = this.buildInput();
        this.chipsEl.appendChild(this.inputEl);

        this.spinnerEl = this.buildSpinner();
        area.appendChild(this.spinnerEl);

        this.renderChips();
        return area;
    }

    private buildInput(): HTMLInputElement
    {
        const input = document.createElement("input");
        input.type = "text";
        input.classList.add("peoplepicker-input");
        setAttr(input, "role", "searchbox");
        setAttr(input, "aria-autocomplete", "list");
        setAttr(input, "aria-controls", `${this.instanceId}-listbox`);
        setAttr(input, "autocomplete", "off");
        input.placeholder = this.options.placeholder || DEFAULT_PLACEHOLDER;

        if (this.options.disabled) { input.disabled = true; }

        input.addEventListener("input", () => this.onInputChange());
        input.addEventListener("keydown", (e) => this.onInputKeydown(e));
        input.addEventListener("focus", () => this.onInputFocus());
        input.addEventListener("blur", () => this.onInputBlur());
        return input;
    }

    private buildSpinner(): HTMLElement
    {
        const spinner = createElement("span", ["peoplepicker-spinner"]);
        spinner.appendChild(createElement("i", ["bi", "bi-arrow-repeat"]));
        spinner.style.display = "none";
        return spinner;
    }

    // ========================================================================
    // BUILDING — DROPDOWN
    // ========================================================================

    private buildDropdown(): HTMLElement
    {
        const dd = createElement("div", ["peoplepicker-dropdown"]);
        dd.style.display = "none";
        dd.style.position = "fixed";

        this.frequentSectionEl = this.buildSection("Frequent");
        this.frequentListEl = createElement("div", ["peoplepicker-listbox"]);
        setAttr(this.frequentListEl, "id", `${this.instanceId}-listbox`);
        setAttr(this.frequentListEl, "role", "listbox");
        this.frequentSectionEl.appendChild(this.frequentListEl);
        dd.appendChild(this.frequentSectionEl);

        this.resultsSectionEl = this.buildSection("Results");
        this.resultsSectionEl.style.display = "none";
        this.resultsListEl = createElement("div", ["peoplepicker-listbox-results"]);
        setAttr(this.resultsListEl, "role", "listbox");
        this.resultsSectionEl.appendChild(this.resultsListEl);
        dd.appendChild(this.resultsSectionEl);

        this.noResultsEl = createElement("div", ["peoplepicker-no-results"],
            this.options.noResultsText || DEFAULT_NO_RESULTS);
        this.noResultsEl.style.display = "none";
        dd.appendChild(this.noResultsEl);

        dd.addEventListener("click", (e) => this.onDropdownClick(e));
        return dd;
    }

    private buildSection(label: string): HTMLElement
    {
        const section = createElement("div", ["peoplepicker-section"]);
        const header = createElement("div", ["peoplepicker-section-header"], label);
        section.appendChild(header);
        return section;
    }

    // ========================================================================
    // CHIP RENDERING
    // ========================================================================

    private renderChips(): void
    {
        this.clearChips();

        if (!this.isMultiple())
        {
            this.renderSingleSelect();
            return;
        }

        this.renderMultiChips();
    }

    private clearChips(): void
    {
        const oldChips = this.chipsEl.querySelectorAll(
            ".peoplepicker-chip, .peoplepicker-overflow-badge, .peoplepicker-single-display"
        );
        oldChips.forEach(c => c.remove());

        if (this.singleDisplayEl)
        {
            this.singleDisplayEl = null;
        }

        this.inputEl.style.display = "";
    }

    private renderMultiChips(): void
    {
        const max = this.options.maxChipsVisible ?? DEFAULT_MAX_CHIPS;
        const frag = document.createDocumentFragment();
        const visibleCount = Math.min(this.selected.length, max);

        for (let i = 0; i < visibleCount; i++)
        {
            frag.appendChild(this.buildChipWrapper(this.selected[i]));
        }

        if (this.selected.length > max)
        {
            const overflow = createElement("span", ["peoplepicker-overflow-badge"],
                `+${this.selected.length - max} more`);
            frag.appendChild(overflow);
        }

        this.chipsEl.insertBefore(frag, this.inputEl);
    }

    private renderSingleSelect(): void
    {
        if (this.selected.length === 0)
        {
            this.inputEl.style.display = "";
            return;
        }

        this.inputEl.style.display = "none";
        const person = this.selected[0];
        this.singleDisplayEl = this.buildSingleDisplay(person);
        this.chipsEl.insertBefore(this.singleDisplayEl, this.inputEl);
    }

    private buildChipWrapper(person: PersonData): HTMLElement
    {
        const wrapper = createElement("span", ["peoplepicker-chip"]);
        setAttr(wrapper, "data-person-id", person.id);

        const chipEl = this.buildPersonElement(person, "sm");
        wrapper.appendChild(chipEl);

        if (!this.options.readonly && !this.options.disabled)
        {
            wrapper.appendChild(this.buildChipRemoveBtn(person));
        }

        return wrapper;
    }

    private buildChipRemoveBtn(person: PersonData): HTMLElement
    {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.classList.add("peoplepicker-chip-remove");
        setAttr(btn, "aria-label", `Remove ${person.name}`);
        btn.tabIndex = -1;
        btn.appendChild(createElement("i", ["bi", "bi-x"]));
        return btn;
    }

    private buildSingleDisplay(person: PersonData): HTMLElement
    {
        const wrap = createElement("div", ["peoplepicker-single-display"]);

        const chipEl = this.buildPersonElement(person, "md");
        wrap.appendChild(chipEl);

        if (!this.options.readonly && !this.options.disabled)
        {
            const clearBtn = document.createElement("button");
            clearBtn.type = "button";
            clearBtn.classList.add("peoplepicker-single-clear");
            setAttr(clearBtn, "aria-label", `Clear selection: ${person.name}`);
            clearBtn.tabIndex = -1;
            clearBtn.appendChild(createElement("i", ["bi", "bi-x"]));
            wrap.appendChild(clearBtn);
        }

        return wrap;
    }

    // ========================================================================
    // PERSON ELEMENT FACTORY
    // ========================================================================

    private buildPersonElement(
        person: PersonData, size: "sm" | "md" | "lg"): HTMLElement
    {
        const el = tryCreatePersonChip(person, size);
        if (el) { return el; }
        return buildFallbackChip(person);
    }

    // ========================================================================
    // DROPDOWN ROW RENDERING
    // ========================================================================

    private renderFrequentSection(): void
    {
        this.frequentListEl.textContent = "";

        if (this.frequentContacts.length === 0)
        {
            this.frequentSectionEl.style.display = "none";
            return;
        }

        this.frequentSectionEl.style.display = "";

        for (const person of this.frequentContacts)
        {
            this.frequentListEl.appendChild(this.buildRow(person));
        }
    }

    private renderResultsSection(): void
    {
        this.resultsListEl.textContent = "";

        if (this.searchResults.length === 0)
        {
            this.resultsSectionEl.style.display = "none";
            return;
        }

        this.resultsSectionEl.style.display = "";

        for (const person of this.searchResults)
        {
            this.resultsListEl.appendChild(this.buildRow(person));
        }
    }

    private buildRow(person: PersonData): HTMLElement
    {
        const row = createElement("div", ["peoplepicker-row"]);
        setAttr(row, "role", "option");
        setAttr(row, "data-person-id", person.id);

        const isSelected = this.selectedMap.has(person.id);

        if (isSelected)
        {
            row.classList.add("peoplepicker-row-selected");
        }

        if (this.isAtMax() && !isSelected)
        {
            row.classList.add("peoplepicker-row-dimmed");
        }

        const chipEl = this.buildPersonElement(person, "md");
        row.appendChild(chipEl);

        const check = createElement("i", ["bi", "bi-check", "peoplepicker-row-check"]);
        row.appendChild(check);

        return row;
    }

    private rebuildFlatRows(): void
    {
        this.flatRows = [];

        if (this.frequentSectionEl.style.display !== "none")
        {
            for (const p of this.frequentContacts)
            {
                this.flatRows.push(p);
            }
        }

        if (this.resultsSectionEl.style.display !== "none")
        {
            for (const p of this.searchResults)
            {
                if (!this.flatRows.some(f => f.id === p.id))
                {
                    this.flatRows.push(p);
                }
            }
        }

        this.assignRowIds();
    }

    private assignRowIds(): void
    {
        const allRows = this.dropdownEl.querySelectorAll(".peoplepicker-row");

        for (let i = 0; i < allRows.length; i++)
        {
            setAttr(allRows[i] as HTMLElement, "id",
                `${this.instanceId}-opt-${i}`);
            setAttr(allRows[i] as HTMLElement, "data-idx", String(i));
        }
    }

    // ========================================================================
    // DROPDOWN OPEN/CLOSE
    // ========================================================================

    private openDropdown(): void
    {
        this.renderFrequentSection();
        this.renderResultsSection();
        this.rebuildFlatRows();
        this.updateNoResults();

        if (this.flatRows.length === 0 &&
            this.noResultsEl.style.display === "none")
        {
            return;
        }

        this.dropdownEl.style.display = "";
        this.dropdownOpen = true;
        setAttr(this.rootEl, "aria-expanded", "true");
        this.positionDropdown();
        this.options.onOpen?.();
    }

    private closeDropdown(): void
    {
        if (!this.dropdownOpen) { return; }
        this.dropdownEl.style.display = "none";
        this.dropdownOpen = false;
        this.highlightIndex = -1;
        setAttr(this.rootEl, "aria-expanded", "false");
        setAttr(this.inputEl, "aria-activedescendant", "");
        this.options.onClose?.();
    }

    /** Open dropdown after search results arrive, or reposition if already open. */
    private ensureDropdownVisible(): void
    {
        if (this.dropdownOpen)
        {
            this.positionDropdown();
            return;
        }

        if (this.searchResults.length > 0)
        {
            this.openDropdown();
        }
    }

    private positionDropdown(): void
    {
        if (!this.dropdownEl || !this.rootEl)
        {
            return;
        }

        const rect = this.rootEl.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const ddHeight = this.dropdownEl.offsetHeight || 300;
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

    private updateNoResults(): void
    {
        const hasFrequent = this.frequentContacts.length > 0 &&
            this.frequentSectionEl.style.display !== "none";
        const hasResults = this.searchResults.length > 0 &&
            this.resultsSectionEl.style.display !== "none";
        const query = this.inputEl.value.trim();
        const minChars = this.options.minSearchChars ?? DEFAULT_MIN_CHARS;

        if (!hasFrequent && !hasResults && query.length >= minChars)
        {
            this.noResultsEl.style.display = "";
        }
        else
        {
            this.noResultsEl.style.display = "none";
        }
    }

    // ========================================================================
    // HIGHLIGHT
    // ========================================================================

    private setHighlight(index: number): void
    {
        const rows = this.dropdownEl.querySelectorAll(".peoplepicker-row");
        rows.forEach(el =>
        {
            el.classList.remove("peoplepicker-row-highlighted");
            setAttr(el as HTMLElement, "aria-selected", "false");
        });

        if (index >= 0 && index < rows.length)
        {
            const el = rows[index];
            el.classList.add("peoplepicker-row-highlighted");
            setAttr(el as HTMLElement, "aria-selected", "true");
            setAttr(this.inputEl, "aria-activedescendant", el.id);
            el.scrollIntoView({ block: "nearest" });
        }
        else
        {
            setAttr(this.inputEl, "aria-activedescendant", "");
        }

        this.highlightIndex = index;
    }

    private moveHighlight(delta: number): void
    {
        const count = this.flatRows.length;
        if (count === 0) { return; }

        let next = this.highlightIndex + delta;
        if (next < 0) { next = count - 1; }
        if (next >= count) { next = 0; }

        this.setHighlight(next);
    }

    // ========================================================================
    // ASYNC SEARCH
    // ========================================================================

    private async executeSearch(query: string): Promise<void>
    {
        const gen = ++this.searchGeneration;
        this.showSpinner();

        try
        {
            const results = await this.fetchResults(query);

            if (gen !== this.searchGeneration) { return; }

            this.searchResults = results;
            this.renderResultsSection();
            this.rebuildFlatRows();
            this.updateNoResults();
            this.ensureDropdownVisible();
        }
        catch (err)
        {
            if (gen !== this.searchGeneration) { return; }

            this.searchResults = [];
            this.renderResultsSection();
            this.updateNoResults();
            this.options.onSearchError?.(err as Error);
            console.warn(LOG_PREFIX, "Search error:", err);
        }
        finally
        {
            if (gen === this.searchGeneration)
            {
                this.hideSpinner();
            }
        }
    }

    private async fetchResults(query: string): Promise<PersonData[]>
    {
        if (this.options.onSearch)
        {
            return this.options.onSearch(query);
        }

        if (this.options.searchUrl)
        {
            return this.fetchFromUrl(query);
        }

        return [];
    }

    private async fetchFromUrl(query: string): Promise<PersonData[]>
    {
        const base = this.options.searchUrl!;
        const sep = base.includes("?") ? "&" : "?";
        const url = base + sep + "q=" + encodeURIComponent(query);

        const resp = await fetch(url);

        if (!resp.ok)
        {
            throw new Error(`Search request failed: ${resp.status}`);
        }

        return resp.json();
    }

    private showSpinner(): void
    {
        this.isSearching = true;
        this.spinnerEl.style.display = "";
    }

    private hideSpinner(): void
    {
        this.isSearching = false;
        this.spinnerEl.style.display = "none";
    }

    // ========================================================================
    // EVENT HANDLERS
    // ========================================================================

    private onInputChange(): void
    {
        const query = this.inputEl.value.trim();
        const minChars = this.options.minSearchChars ?? DEFAULT_MIN_CHARS;

        if (this.debounceTimer) { clearTimeout(this.debounceTimer); }

        if (query.length < minChars)
        {
            this.searchResults = [];
            this.resultsSectionEl.style.display = "none";

            if (this.dropdownOpen)
            {
                this.renderFrequentSection();
                this.rebuildFlatRows();
                this.updateNoResults();
            }

            return;
        }

        const debounce = this.options.debounceMs ?? DEFAULT_DEBOUNCE;

        this.debounceTimer = setTimeout(() =>
        {
            this.executeSearch(query);
            this.debounceTimer = null;
        }, debounce);
    }

    private onInputKeydown(e: KeyboardEvent): void
    {
        if (this.matchesKeyCombo(e, "moveDown"))
        {
            e.preventDefault();
            if (!this.dropdownOpen) { this.openDropdown(); }
            this.moveHighlight(1);
        }
        else if (this.matchesKeyCombo(e, "moveUp"))
        {
            e.preventDefault();
            if (this.dropdownOpen) { this.moveHighlight(-1); }
        }
        else if (this.matchesKeyCombo(e, "confirm"))
        {
            e.preventDefault();
            this.handleEnter();
        }
        else if (this.matchesKeyCombo(e, "close"))
        {
            this.handleEscape();
        }
        else if (this.matchesKeyCombo(e, "removeLast"))
        {
            this.handleBackspace();
        }
        else
        {
            this.handleJumpOrTab(e);
        }
    }

    /** Handle Home/End jump and Tab close for keyboard navigation. */
    private handleJumpOrTab(e: KeyboardEvent): void
    {
        if (this.matchesKeyCombo(e, "jumpFirst") && this.dropdownOpen)
        {
            e.preventDefault();
            this.setHighlight(0);
        }
        else if (this.matchesKeyCombo(e, "jumpLast") && this.dropdownOpen)
        {
            e.preventDefault();
            this.setHighlight(this.flatRows.length - 1);
        }
        else if (e.key === "Tab")
        {
            this.closeDropdown();
        }
    }

    private handleEnter(): void
    {
        if (!this.dropdownOpen || this.highlightIndex < 0) { return; }
        this.selectRow(this.highlightIndex);
    }

    private handleEscape(): void
    {
        if (this.dropdownOpen)
        {
            this.closeDropdown();
        }
        else
        {
            this.inputEl.value = "";
        }
    }

    private handleBackspace(): void
    {
        if (this.inputEl.value !== "") { return; }
        if (this.selected.length === 0) { return; }

        const last = this.selected[this.selected.length - 1];
        this.removePerson(last.id);
    }

    private onInputFocus(): void
    {
        this.rootEl.classList.add("peoplepicker-focused");

        if (!this.dropdownOpen &&
            (this.frequentContacts.length > 0 || this.searchResults.length > 0))
        {
            this.openDropdown();
        }
    }

    private onInputBlur(): void
    {
        this.rootEl.classList.remove("peoplepicker-focused");
    }

    private onInputAreaClick(e: Event): void
    {
        if (this.options.disabled || this.options.readonly) { return; }

        const target = e.target as HTMLElement;

        if (this.handleChipRemoveClick(target)) { return; }
        if (this.handleSingleClearClick(target)) { return; }

        this.focus();
    }

    /** Handle click on a chip's remove button. Returns true if handled. */
    private handleChipRemoveClick(target: HTMLElement): boolean
    {
        const removeBtn = target.closest(".peoplepicker-chip-remove");
        if (!removeBtn) { return false; }

        const chip = removeBtn.closest(".peoplepicker-chip") as HTMLElement;
        if (!chip) { return false; }

        const personId = chip.getAttribute("data-person-id") || "";
        this.removePerson(personId);
        this.focus();
        return true;
    }

    /** Handle click on single-select clear or display. Returns true if handled. */
    private handleSingleClearClick(target: HTMLElement): boolean
    {
        const isClear = target.closest(".peoplepicker-single-clear");
        const isDisplay = target.closest(".peoplepicker-single-display");

        if (isClear || isDisplay)
        {
            this.clearSelection();
            this.focus();
            return true;
        }
        return false;
    }

    private onDropdownClick(e: Event): void
    {
        const row = (e.target as HTMLElement).closest(
            ".peoplepicker-row") as HTMLElement;
        if (!row) { return; }
        e.preventDefault();

        const idx = parseInt(row.getAttribute("data-idx") || "-1", 10);
        if (idx >= 0) { this.selectRow(idx); }
    }

    private onDocClick(e: MouseEvent): void
    {
        const target = e.target as Node;
        if (!this.rootEl.contains(target) &&
            !this.dropdownEl.contains(target))
        {
            this.closeDropdown();
        }
    }

    // ========================================================================
    // ROW SELECTION
    // ========================================================================

    private selectRow(index: number): void
    {
        const person = this.flatRows[index];
        if (!person) { return; }

        if (this.selectedMap.has(person.id))
        {
            this.removePerson(person.id);
            this.refreshDropdownRows();
            return;
        }

        if (this.isAtMax()) { return; }

        this.pushSelected(person);
        this.renderChips();
        this.options.onSelect?.(person);
        this.options.onChange?.(this.getSelected());
        this.announce(`${person.name} selected`);
        console.log(`${LOG_PREFIX} Selected: ${person.name}`);

        if (!this.isMultiple())
        {
            this.closeDropdown();
            this.inputEl.value = "";
        }
        else
        {
            this.refreshDropdownRows();
            this.inputEl.value = "";
            this.focus();
        }
    }

    private refreshDropdownRows(): void
    {
        this.renderFrequentSection();
        this.renderResultsSection();
        this.rebuildFlatRows();
        this.highlightIndex = -1;
    }

    // ========================================================================
    // UTILITIES
    // ========================================================================

    private guardDestroyed(method: string): boolean
    {
        if (this.destroyed)
        {
            console.warn(
                `${LOG_PREFIX} Cannot ${method}: component destroyed`);
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

    private clearTimers(): void
    {
        if (this.debounceTimer) { clearTimeout(this.debounceTimer); }
    }
}

// ============================================================================
// FACTORY
// ============================================================================

export function createPeoplePicker(
    containerId: string,
    options?: PeoplePickerOptions): PeoplePicker
{
    const instance = new PeoplePicker(options || {});
    instance.show(containerId);
    return instance;
}

// ============================================================================
// WINDOW EXPORTS
// ============================================================================

if (typeof window !== "undefined")
{
    (window as unknown as Record<string, unknown>)["PeoplePicker"] = PeoplePicker;
    (window as unknown as Record<string, unknown>)["createPeoplePicker"] = createPeoplePicker;
}
