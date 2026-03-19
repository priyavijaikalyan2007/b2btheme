/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: MultiselectCombo
 * 📜 PURPOSE: Multi-select combo box with chips, checkboxes, filtering,
 *    grouping, Select All, and configurable display modes.
 * 🔗 RELATES: [[EnterpriseTheme]], [[CustomComponents]]
 * ⚡ FLOW: [Consumer] -> [new MultiselectCombo()] -> [show()] -> [DOM]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Represents a single item in the multi-select combo box.
 */
export interface ComboItem
{
    /** Programmatic value used for identification and selection state. */
    value: string;

    /** Display text shown in the dropdown and on chips. */
    label: string;

    /** Optional grouping label. Items with the same group render under a group header. */
    group?: string;

    /** Optional Bootstrap Icons class displayed before the label. */
    icon?: string;

    /** When true, this item is shown but cannot be selected. Default: false. */
    disabled?: boolean;

    /** Arbitrary consumer data attached to this item. Not rendered. */
    data?: Record<string, unknown>;
}

/**
 * Configuration options for the MultiselectCombo component.
 */
export interface MultiselectComboOptions
{
    /** The items to display in the dropdown. */
    items: ComboItem[];

    /** Initial selected values (array of ComboItem.value strings). Default: []. */
    selected?: string[];

    /** Placeholder text shown when no items are selected. Default: "Select...". */
    placeholder?: string;

    /** Maximum number of items that can be selected. 0 = unlimited. Default: 0. */
    maxSelections?: number;

    /** Show the Select All / Deselect All checkbox. Default: true. */
    showSelectAll?: boolean;

    /** true = show removable chips. false = show count badge. Default: true. */
    showChips?: boolean;

    /** Show the remove (x) button on each chip. Default: true. */
    chipRemovable?: boolean;

    /** Maximum visible chips before "+N more" badge. Default: 5. */
    maxChipsVisible?: number;

    /** Placeholder text in the dropdown filter input. Default: "Filter items...". */
    filterPlaceholder?: string;

    /** Text shown when the filter yields no matches. Default: "No results found". */
    noResultsText?: string;

    /** Show the filter search input inside the dropdown. Default: true. */
    showFilter?: boolean;

    /** When true, the component is disabled. Default: false. */
    disabled?: boolean;

    /** When true, selections cannot be changed but dropdown can open. Default: false. */
    readonly?: boolean;

    /** Size variant. Default: "default". */
    size?: "sm" | "default" | "lg";

    /** Additional CSS class(es) on the root element. */
    cssClass?: string;

    /** Called when a single item is selected. */
    onSelect?: (item: ComboItem) => void;

    /** Called when a single item is deselected. */
    onDeselect?: (item: ComboItem) => void;

    /** Called after any selection change with the full array of selected values. */
    onChange?: (selectedValues: string[]) => void;

    /** Called when the filter text changes. */
    onFilterChange?: (query: string) => void;

    /** Called when the dropdown opens. */
    onOpen?: () => void;

    /** Called when the dropdown closes. */
    onClose?: () => void;

    /** Override default key combos. Keys are action names, values are combo strings. */
    keyBindings?: Partial<Record<string, string>>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Component log prefix for console messages. */
const LOG_PREFIX = "[MultiselectCombo]";

/** Maximum height of the dropdown listbox in pixels. */
const DROPDOWN_MAX_HEIGHT = 280;

/** Debounce delay in milliseconds for large lists (500+ items). */
const FILTER_DEBOUNCE_MS = 150;

/** Threshold above which filtering is debounced. */
const DEBOUNCE_THRESHOLD = 500;

/** Default maximum chips visible before overflow badge. */
const DEFAULT_MAX_CHIPS = 5;

/** Unique ID counter to prevent DOM collisions between instances. */
let instanceCounter = 0;

/** Default key bindings for keyboard navigation actions. */
const DEFAULT_KEY_BINDINGS: Record<string, string> = {
    openDropdown: "ArrowDown",
    openWithEnter: "Enter",
    openWithSpace: " ",
    moveDown: "ArrowDown",
    moveUp: "ArrowUp",
    toggleItem: "Enter",
    toggleItemSpace: " ",
    closeDropdown: "Escape",
    commitAndTab: "Tab",
    removeLastChip: "Backspace",
    jumpToFirst: "Home",
    jumpToLast: "End",
    selectAll: "Ctrl+a",
};

// ============================================================================
// PRIVATE HELPERS — DOM
// ============================================================================

/**
 * Creates an HTML element with optional classes and text content.
 * Uses textContent exclusively for XSS safety.
 */
function createElement(
    tag: string,
    classes: string[],
    text?: string): HTMLElement
{
    const el = document.createElement(tag);

    if (classes.length > 0)
    {
        el.classList.add(...classes);
    }

    if (text)
    {
        el.textContent = text;
    }

    return el;
}

/**
 * Sets an attribute on an element.
 */
function setAttr(el: HTMLElement, name: string, value: string): void
{
    el.setAttribute(name, value);
}

// ============================================================================
// PRIVATE HELPERS — DATA
// ============================================================================

/**
 * Extracts unique groups from items in the order they first appear.
 */
function extractGroups(items: ComboItem[]): string[]
{
    const seen = new Set<string>();
    const groups: string[] = [];

    for (const item of items)
    {
        if (item.group && !seen.has(item.group))
        {
            seen.add(item.group);
            groups.push(item.group);
        }
    }

    return groups;
}

/**
 * Default filter: case-insensitive substring match against the item label.
 */
function defaultFilter(query: string, item: ComboItem): boolean
{
    return item.label.toLowerCase().includes(query.toLowerCase());
}

/**
 * Reorders items so ungrouped items come first, followed by each group's items.
 * This ensures the highlight index matches the visual rendering order.
 */
function orderByGroup(items: ComboItem[]): ComboItem[]
{
    const groups = extractGroups(items);
    const ungrouped = items.filter(i => !i.group);
    const result: ComboItem[] = [...ungrouped];

    for (const g of groups)
    {
        result.push(...items.filter(i => i.group === g));
    }

    return result;
}

// ============================================================================
// PUBLIC API
// ============================================================================

// @entrypoint

/**
 * MultiselectCombo combines a chips-based input area with a checkboxed
 * dropdown list for selecting multiple items. Supports filtering, grouping,
 * Select All, max selections, and chip or count-badge display modes.
 *
 * @example
 * const combo = new MultiselectCombo({
 *     items: [
 *         { value: "a", label: "Apple" },
 *         { value: "b", label: "Banana" },
 *         { value: "c", label: "Cherry" }
 *     ],
 *     placeholder: "Pick fruits..."
 * });
 * combo.show("my-container");
 */
export class MultiselectCombo
{
    // -- Configuration
    private readonly instanceId: string;
    private options: MultiselectComboOptions;

    // -- State
    private items: ComboItem[] = [];
    private filteredItems: ComboItem[] = [];
    private selectedValues = new Set<string>();
    private isOpen = false;
    private highlightedIndex = -1;
    private filterQuery = "";
    private destroyed = false;
    private debounceTimer: ReturnType<typeof setTimeout> | null = null;

    // -- DOM references
    private rootEl!: HTMLElement;
    private inputAreaEl!: HTMLElement;
    private inputContentEl!: HTMLElement;
    private toggleEl!: HTMLElement;
    private dropdownEl!: HTMLElement;
    private filterInputEl: HTMLInputElement | null = null;
    private selectAllCheckEl: HTMLInputElement | null = null;
    private maxHintEl: HTMLElement | null = null;
    private listboxEl!: HTMLElement;
    private liveRegionEl!: HTMLElement;

    // -- Bound event handlers (for cleanup)
    private readonly boundOnDocumentClick: (e: MouseEvent) => void;

    constructor(options: MultiselectComboOptions)
    {
        instanceCounter++;
        this.instanceId = `msc-${instanceCounter}`;
        this.options = { ...options };
        this.items = [...options.items];
        this.filteredItems = orderByGroup(this.items);

        this.applyInitialSelection(options.selected);
        this.boundOnDocumentClick = (e: MouseEvent) => this.onDocumentClick(e);
        this.rootEl = this.buildRoot();

        console.log(`${LOG_PREFIX} Initialised: ${this.instanceId}`);
        console.debug(`${LOG_PREFIX} Options:`, {
            itemCount: this.items.length,
            selected: this.selectedValues.size,
            size: this.options.size || "default"
        });
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

    /**
     * Appends the component to the container identified by the given ID.
     */
    public show(containerId: string): void
    {
        if (this.guardDestroyed("show"))
        {
            return;
        }

        const container = document.getElementById(containerId);

        if (!container)
        {
            console.error(`${LOG_PREFIX} Container not found: ${containerId}`);
            return;
        }

        container.appendChild(this.rootEl);
        console.debug(`${LOG_PREFIX} Shown in: ${containerId}`);
    }

    /**
     * Removes the component from the DOM without destroying state.
     */
    public hide(): void
    {
        if (this.guardDestroyed("hide"))
        {
            return;
        }

        if (this.isOpen)
        {
            this.closeDropdown();
        }

        this.rootEl.remove();
        console.debug(`${LOG_PREFIX} Hidden`);
    }

    /**
     * Hides, removes all event listeners, and releases internal references.
     */
    public destroy(): void
    {
        if (this.destroyed)
        {
            return;
        }

        this.hide();
        document.removeEventListener("click", this.boundOnDocumentClick);

        if (this.debounceTimer !== null)
        {
            clearTimeout(this.debounceTimer);
        }

        this.destroyed = true;
        console.debug(`${LOG_PREFIX} Destroyed: ${this.instanceId}`);
    }

    /** Returns the root `.multiselectcombo` DOM element. */
    public getElement(): HTMLElement
    {
        return this.rootEl;
    }

    // ========================================================================
    // PUBLIC — SELECTION
    // ========================================================================

    /** Returns an array of currently selected `ComboItem.value` strings. */
    public getSelectedValues(): string[]
    {
        return Array.from(this.selectedValues);
    }

    /** Returns an array of currently selected `ComboItem` objects. */
    public getSelectedItems(): ComboItem[]
    {
        return this.items.filter(i => this.selectedValues.has(i.value));
    }

    /** Replaces the current selection with the given values. Fires `onChange`. */
    public setSelected(values: string[]): void
    {
        if (this.guardDestroyed("setSelected"))
        {
            return;
        }

        this.selectedValues.clear();
        const max = this.options.maxSelections || 0;
        let count = 0;

        for (const v of values)
        {
            if (max > 0 && count >= max)
            {
                console.warn(`${LOG_PREFIX} maxSelections (${max}) exceeded; truncating`);
                break;
            }

            if (this.findItemByValue(v))
            {
                this.selectedValues.add(v);
                count++;
            }
        }

        this.afterSelectionChange();
    }

    /** Selects all non-disabled items (respects `maxSelections`). Fires `onChange`. */
    public selectAll(): void
    {
        if (this.guardDestroyed("selectAll"))
        {
            return;
        }

        const max = this.options.maxSelections || 0;
        let count = this.selectedValues.size;

        for (const item of this.filteredItems)
        {
            if (item.disabled)
            {
                continue;
            }

            if (max > 0 && count >= max)
            {
                break;
            }

            if (!this.selectedValues.has(item.value))
            {
                this.selectedValues.add(item.value);
                count++;
            }
        }

        this.announce(`${this.selectedValues.size} items selected`);
        this.afterSelectionChange();
    }

    /** Clears all selections. Fires `onChange`. */
    public deselectAll(): void
    {
        if (this.guardDestroyed("deselectAll"))
        {
            return;
        }

        this.selectedValues.clear();
        this.announce("All items deselected");
        this.afterSelectionChange();
    }

    // ========================================================================
    // PUBLIC — ITEM MANAGEMENT
    // ========================================================================

    /** Adds a new item to the dropdown. Re-renders if dropdown is open. */
    public addItem(item: ComboItem): void
    {
        if (this.guardDestroyed("addItem"))
        {
            return;
        }

        this.items.push(item);
        this.refreshFilteredItems();

        if (this.isOpen)
        {
            this.renderItems();
        }
    }

    /** Removes an item by value. Deselects it first if selected. */
    public removeItem(value: string): void
    {
        if (this.guardDestroyed("removeItem"))
        {
            return;
        }

        this.items = this.items.filter(i => i.value !== value);
        this.selectedValues.delete(value);
        this.refreshFilteredItems();
        this.afterSelectionChange();
    }

    /** Replaces all items. Clears selections that no longer match any item. */
    public setItems(items: ComboItem[]): void
    {
        if (this.guardDestroyed("setItems"))
        {
            return;
        }

        this.items = [...items];
        const validValues = new Set(items.map(i => i.value));

        for (const v of this.selectedValues)
        {
            if (!validValues.has(v))
            {
                this.selectedValues.delete(v);
            }
        }

        this.refreshFilteredItems();
        this.afterSelectionChange();
    }

    // ========================================================================
    // PUBLIC — STATE CONTROL
    // ========================================================================

    /** Opens the dropdown programmatically. */
    public open(): void
    {
        if (!this.guardDestroyed("open") && !this.options.disabled)
        {
            this.openDropdown();
        }
    }

    /** Closes the dropdown programmatically. */
    public close(): void
    {
        if (!this.guardDestroyed("close"))
        {
            this.closeDropdown();
        }
    }

    /** Enables the component. */
    public enable(): void
    {
        if (this.guardDestroyed("enable"))
        {
            return;
        }

        this.options.disabled = false;
        this.rootEl.classList.remove("multiselectcombo-disabled");
        this.inputAreaEl.removeAttribute("aria-disabled");
        console.debug(`${LOG_PREFIX} Enabled`);
    }

    /** Disables the component. Closes dropdown if open. */
    public disable(): void
    {
        if (this.guardDestroyed("disable"))
        {
            return;
        }

        this.options.disabled = true;

        if (this.isOpen)
        {
            this.closeDropdown();
        }

        this.rootEl.classList.add("multiselectcombo-disabled");
        setAttr(this.inputAreaEl, "aria-disabled", "true");
        console.debug(`${LOG_PREFIX} Disabled`);
    }

    /** Sets focus to the input area. */
    public focus(): void
    {
        if (!this.guardDestroyed("focus"))
        {
            this.inputAreaEl.focus();
        }
    }

    // ========================================================================
    // BUILDING — ROOT
    // ========================================================================

    private buildRoot(): HTMLElement
    {
        const root = createElement("div", ["multiselectcombo"]);
        setAttr(root, "id", this.instanceId);
        setAttr(root, "role", "combobox");
        setAttr(root, "aria-haspopup", "listbox");
        setAttr(root, "aria-expanded", "false");
        setAttr(root, "aria-owns", `${this.instanceId}-listbox`);

        this.applySizeClass(root);
        this.applyOptionClasses(root);

        this.inputAreaEl = this.buildInputArea();
        this.dropdownEl = this.buildDropdown();
        this.liveRegionEl = this.buildLiveRegion();

        root.appendChild(this.inputAreaEl);
        root.appendChild(this.dropdownEl);
        root.appendChild(this.liveRegionEl);

        return root;
    }

    private applySizeClass(root: HTMLElement): void
    {
        if (this.options.size === "sm")
        {
            root.classList.add("multiselectcombo-sm");
        }
        else if (this.options.size === "lg")
        {
            root.classList.add("multiselectcombo-lg");
        }
    }

    private applyOptionClasses(root: HTMLElement): void
    {
        if (this.options.cssClass)
        {
            root.classList.add(...this.options.cssClass.split(" "));
        }

        if (this.options.disabled)
        {
            root.classList.add("multiselectcombo-disabled");
        }

        if (this.options.readonly)
        {
            root.classList.add("multiselectcombo-readonly");
        }
    }

    // ========================================================================
    // BUILDING — INPUT AREA
    // ========================================================================

    private buildInputArea(): HTMLElement
    {
        const area = createElement("div", ["multiselectcombo-input-area"]);
        setAttr(area, "tabindex", "0");
        setAttr(area, "aria-multiselectable", "true");
        setAttr(area, "aria-label", this.options.placeholder || "Select items");
        setAttr(area, "aria-activedescendant", "");

        this.inputContentEl = createElement("div", ["multiselectcombo-input-content"]);
        this.renderInputContents();
        area.appendChild(this.inputContentEl);

        this.toggleEl = this.buildToggle();
        area.appendChild(this.toggleEl);

        area.addEventListener("click", (e) => this.onInputAreaClick(e));
        area.addEventListener("keydown", (e) => this.handleInputAreaKeydown(e));

        return area;
    }

    private buildToggle(): HTMLElement
    {
        const btn = createElement("button", ["multiselectcombo-toggle"]);
        setAttr(btn, "type", "button");
        setAttr(btn, "tabindex", "-1");
        setAttr(btn, "aria-label", "Toggle dropdown");

        const icon = createElement("i", [
            "bi", "bi-chevron-down", "multiselectcombo-chevron"
        ]);
        btn.appendChild(icon);

        btn.addEventListener("mousedown", (e) =>
        {
            e.preventDefault();
            this.onToggleClick();
        });

        return btn;
    }

    // ========================================================================
    // BUILDING — INPUT CONTENTS (chips / count badge / placeholder)
    // ========================================================================

    private renderInputContents(): void
    {
        while (this.inputContentEl.firstChild)
        {
            this.inputContentEl.removeChild(this.inputContentEl.firstChild);
        }

        if (this.selectedValues.size === 0)
        {
            this.renderPlaceholder();
            return;
        }

        if (this.options.showChips !== false)
        {
            this.renderChips();
        }
        else
        {
            this.renderCountBadge();
        }
    }

    private renderPlaceholder(): void
    {
        const text = this.options.placeholder || "Select...";
        const el = createElement("span", ["multiselectcombo-placeholder"], text);
        this.inputContentEl.appendChild(el);
    }

    private renderChips(): void
    {
        const selected = this.getSelectedItems();
        const max = this.options.maxChipsVisible ?? DEFAULT_MAX_CHIPS;
        const visible = selected.slice(0, max);
        const overflow = selected.length - max;

        const list = createElement("div", ["multiselectcombo-chips"]);
        setAttr(list, "role", "list");

        for (const item of visible)
        {
            list.appendChild(this.buildChip(item));
        }

        if (overflow > 0)
        {
            list.appendChild(this.buildOverflowBadge(selected, max));
        }

        this.inputContentEl.appendChild(list);
    }

    private buildChip(item: ComboItem): HTMLElement
    {
        const chip = createElement("span", ["multiselectcombo-chip"]);
        setAttr(chip, "role", "listitem");

        const label = createElement("span", ["multiselectcombo-chip-label"], item.label);
        chip.appendChild(label);

        if (this.canRemoveChip())
        {
            chip.appendChild(this.buildChipRemoveBtn(item));
        }

        return chip;
    }

    private canRemoveChip(): boolean
    {
        return this.options.chipRemovable !== false
            && !this.options.disabled
            && !this.options.readonly;
    }

    private buildChipRemoveBtn(item: ComboItem): HTMLElement
    {
        const btn = createElement("button", ["multiselectcombo-chip-remove"]);
        setAttr(btn, "type", "button");
        setAttr(btn, "tabindex", "-1");
        setAttr(btn, "aria-label", `Remove ${item.label}`);

        const icon = createElement("i", ["bi", "bi-x"]);
        btn.appendChild(icon);

        btn.addEventListener("click", (e) =>
        {
            e.stopPropagation();
            this.deselectItem(item);
        });

        return btn;
    }

    private buildOverflowBadge(
        selected: ComboItem[],
        maxVisible: number): HTMLElement
    {
        const overflow = selected.length - maxVisible;
        const badge = createElement(
            "span",
            ["multiselectcombo-overflow-badge"],
            `+${overflow} more`
        );
        setAttr(badge, "role", "listitem");

        const hiddenLabels = selected.slice(maxVisible).map(i => i.label).join(", ");
        setAttr(badge, "title", hiddenLabels);

        return badge;
    }

    private renderCountBadge(): void
    {
        const count = this.selectedValues.size;
        const text = `${count} selected`;
        const el = createElement("span", ["multiselectcombo-count-badge"], text);

        const allLabels = this.getSelectedItems().map(i => i.label).join(", ");
        setAttr(el, "title", allLabels);

        this.inputContentEl.appendChild(el);
    }

    // ========================================================================
    // BUILDING — DROPDOWN
    // ========================================================================

    private buildDropdown(): HTMLElement
    {
        const dd = createElement("div", ["multiselectcombo-dropdown"]);
        dd.style.display = "none";

        if (this.options.showFilter !== false)
        {
            dd.appendChild(this.buildFilter());
        }

        if (this.options.showSelectAll !== false)
        {
            dd.appendChild(this.buildSelectAll());
        }

        this.maxHintEl = this.buildMaxHint();
        dd.appendChild(this.maxHintEl);

        this.listboxEl = this.buildListbox();
        dd.appendChild(this.listboxEl);

        return dd;
    }

    private buildFilter(): HTMLElement
    {
        const wrapper = createElement("div", ["multiselectcombo-filter"]);

        const icon = createElement("i", [
            "bi", "bi-search", "multiselectcombo-filter-icon"
        ]);
        wrapper.appendChild(icon);

        this.filterInputEl = document.createElement("input");
        this.filterInputEl.type = "text";
        this.filterInputEl.classList.add("multiselectcombo-filter-input");
        setAttr(this.filterInputEl, "role", "searchbox");
        setAttr(this.filterInputEl, "aria-label", "Filter items");
        setAttr(this.filterInputEl, "placeholder",
            this.options.filterPlaceholder || "Filter items...");
        setAttr(this.filterInputEl, "autocomplete", "off");

        this.filterInputEl.addEventListener("input", () => this.onFilterInput());
        this.filterInputEl.addEventListener("keydown",
            (e) => this.handleFilterKeydown(e));

        wrapper.appendChild(this.filterInputEl);

        return wrapper;
    }

    private buildSelectAll(): HTMLElement
    {
        const row = createElement("div", ["multiselectcombo-select-all"]);

        this.selectAllCheckEl = document.createElement("input");
        this.selectAllCheckEl.type = "checkbox";
        this.selectAllCheckEl.classList.add("multiselectcombo-select-all-check");
        this.selectAllCheckEl.tabIndex = -1;

        this.selectAllCheckEl.addEventListener("click", (e) =>
        {
            e.preventDefault();
        });

        const label = createElement("span", [], "Select All");
        row.appendChild(this.selectAllCheckEl);
        row.appendChild(label);

        row.addEventListener("click", () => this.handleSelectAllClick());

        return row;
    }

    private buildMaxHint(): HTMLElement
    {
        const max = this.options.maxSelections || 0;
        const text = max > 0 ? `Maximum of ${max} selections reached` : "";
        const el = createElement("div", ["multiselectcombo-max-hint"], text);
        el.style.display = "none";
        return el;
    }

    private buildListbox(): HTMLElement
    {
        const lb = createElement("div", ["multiselectcombo-listbox"]);
        setAttr(lb, "id", `${this.instanceId}-listbox`);
        setAttr(lb, "role", "listbox");
        setAttr(lb, "aria-multiselectable", "true");
        setAttr(lb, "aria-label", "Options");
        lb.style.maxHeight = `${DROPDOWN_MAX_HEIGHT}px`;

        this.listboxEl = lb;
        this.renderItems();

        return lb;
    }

    private buildLiveRegion(): HTMLElement
    {
        const el = createElement("div", ["visually-hidden"]);
        setAttr(el, "aria-live", "polite");
        setAttr(el, "aria-atomic", "true");
        return el;
    }

    // ========================================================================
    // RENDERING — LISTBOX ITEMS
    // ========================================================================

    private renderItems(): void
    {
        while (this.listboxEl.firstChild)
        {
            this.listboxEl.removeChild(this.listboxEl.firstChild);
        }

        this.highlightedIndex = -1;

        if (this.filteredItems.length === 0)
        {
            this.renderNoResults();
            return;
        }

        const groups = extractGroups(this.filteredItems);

        if (groups.length === 0)
        {
            this.renderFlatItems(this.filteredItems);
            return;
        }

        this.renderGroupedItems(groups);
    }

    private renderGroupedItems(groups: string[]): void
    {
        const ungrouped = this.filteredItems.filter(i => !i.group);

        if (ungrouped.length > 0)
        {
            this.renderFlatItems(ungrouped);
        }

        for (const groupName of groups)
        {
            const items = this.filteredItems.filter(i => i.group === groupName);

            if (items.length === 0)
            {
                continue;
            }

            const header = createElement(
                "div", ["multiselectcombo-group-header"], groupName
            );
            setAttr(header, "role", "group");
            setAttr(header, "aria-label", groupName);
            this.listboxEl.appendChild(header);

            this.renderFlatItems(items);
        }
    }

    private renderFlatItems(items: ComboItem[]): void
    {
        for (const item of items)
        {
            this.listboxEl.appendChild(this.buildItemRow(item));
        }
    }

    private buildItemRow(item: ComboItem): HTMLElement
    {
        const idx = this.filteredItems.indexOf(item);
        const row = createElement("div", ["multiselectcombo-item"]);
        const optId = `${this.instanceId}-opt-${idx}`;

        setAttr(row, "id", optId);
        setAttr(row, "role", "option");

        const checked = this.selectedValues.has(item.value);
        setAttr(row, "aria-selected", String(checked));
        setAttr(row, "aria-checked", String(checked));

        this.applyItemDisabledState(row, item, checked);
        this.buildItemRowContents(row, item, checked);

        row.addEventListener("click", () => this.toggleItem(item));

        return row;
    }

    private applyItemDisabledState(
        row: HTMLElement,
        item: ComboItem,
        checked: boolean): void
    {
        if (item.disabled)
        {
            row.classList.add("multiselectcombo-item-disabled");
            setAttr(row, "aria-disabled", "true");
        }

        if (this.isMaxReached() && !checked && !item.disabled)
        {
            row.classList.add("multiselectcombo-item-disabled");
        }
    }

    private buildItemRowContents(
        row: HTMLElement,
        item: ComboItem,
        checked: boolean): void
    {
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.classList.add("multiselectcombo-item-check");
        cb.checked = checked;
        cb.tabIndex = -1;
        cb.addEventListener("click", (e) => e.preventDefault());
        row.appendChild(cb);

        if (item.icon)
        {
            const iconWrap = createElement("span", ["multiselectcombo-item-icon"]);
            const i = createElement("i", item.icon.split(" "));
            iconWrap.appendChild(i);
            row.appendChild(iconWrap);
        }

        const label = createElement(
            "span", ["multiselectcombo-item-label"], item.label
        );
        row.appendChild(label);
    }

    private renderNoResults(): void
    {
        const text = this.options.noResultsText || "No results found";
        const el = createElement("div", ["multiselectcombo-no-results"], text);
        this.listboxEl.appendChild(el);
        this.announce(text);
    }

    // ========================================================================
    // UPDATING — AFTER SELECTION CHANGES
    // ========================================================================

    private afterSelectionChange(): void
    {
        this.renderInputContents();
        this.updateItemCheckboxes();
        this.updateSelectAllState();
        this.updateMaxReachedState();
        this.options.onChange?.(this.getSelectedValues());
    }

    private updateItemCheckboxes(): void
    {
        const rows = this.listboxEl.querySelectorAll(".multiselectcombo-item");

        rows.forEach((row) =>
        {
            const idx = this.parseItemIndex(row.id);

            if (idx < 0 || idx >= this.filteredItems.length)
            {
                return;
            }

            this.syncItemRow(row as HTMLElement, this.filteredItems[idx]);
        });
    }

    private parseItemIndex(id: string): number
    {
        const num = parseInt(id.replace(`${this.instanceId}-opt-`, ""), 10);
        return isNaN(num) ? -1 : num;
    }

    private syncItemRow(row: HTMLElement, item: ComboItem): void
    {
        const checked = this.selectedValues.has(item.value);
        const cb = row.querySelector<HTMLInputElement>(
            ".multiselectcombo-item-check"
        );

        if (cb)
        {
            cb.checked = checked;
        }

        setAttr(row, "aria-selected", String(checked));
        setAttr(row, "aria-checked", String(checked));

        const maxDisabled = this.isMaxReached() && !checked && !item.disabled;
        row.classList.toggle(
            "multiselectcombo-item-disabled", item.disabled || maxDisabled
        );
    }

    private updateSelectAllState(): void
    {
        if (!this.selectAllCheckEl)
        {
            return;
        }

        const selectable = this.filteredItems.filter(i => !i.disabled);
        const selectedCount = selectable
            .filter(i => this.selectedValues.has(i.value)).length;

        this.setSelectAllCheckbox(selectable.length, selectedCount);
    }

    private setSelectAllCheckbox(total: number, selected: number): void
    {
        if (!this.selectAllCheckEl)
        {
            return;
        }

        if (selected === 0)
        {
            this.selectAllCheckEl.checked = false;
            this.selectAllCheckEl.indeterminate = false;
            setAttr(this.selectAllCheckEl, "aria-checked", "false");
        }
        else if (selected === total)
        {
            this.selectAllCheckEl.checked = true;
            this.selectAllCheckEl.indeterminate = false;
            setAttr(this.selectAllCheckEl, "aria-checked", "true");
        }
        else
        {
            this.selectAllCheckEl.checked = false;
            this.selectAllCheckEl.indeterminate = true;
            setAttr(this.selectAllCheckEl, "aria-checked", "mixed");
        }
    }

    private updateMaxReachedState(): void
    {
        if (!this.maxHintEl)
        {
            return;
        }

        const show = this.isMaxReached();
        this.maxHintEl.style.display = show ? "" : "none";

        if (show)
        {
            this.announce(this.maxHintEl.textContent || "");
        }
    }

    // ========================================================================
    // DROPDOWN STATE
    // ========================================================================

    private openDropdown(): void
    {
        if (this.isOpen || this.options.disabled)
        {
            return;
        }

        this.isOpen = true;
        this.dropdownEl.style.display = "";
        setAttr(this.rootEl, "aria-expanded", "true");
        this.rootEl.classList.add("multiselectcombo-open");

        this.positionDropdown();
        this.renderItems();
        this.updateSelectAllState();
        this.updateMaxReachedState();

        document.addEventListener("click", this.boundOnDocumentClick);

        this.focusFilterOrArea();

        console.debug(`${LOG_PREFIX} Dropdown opened`);
        this.options.onOpen?.();
    }

    private focusFilterOrArea(): void
    {
        if (this.filterInputEl)
        {
            this.filterInputEl.value = "";
            this.filterQuery = "";
            this.filterInputEl.focus();
        }
    }

    private closeDropdown(): void
    {
        if (!this.isOpen)
        {
            return;
        }

        this.isOpen = false;
        this.highlightedIndex = -1;
        this.dropdownEl.style.display = "none";
        setAttr(this.rootEl, "aria-expanded", "false");
        setAttr(this.inputAreaEl, "aria-activedescendant", "");

        this.rootEl.classList.remove("multiselectcombo-open");

        document.removeEventListener("click", this.boundOnDocumentClick);

        this.filterQuery = "";
        this.refreshFilteredItems();

        console.debug(`${LOG_PREFIX} Dropdown closed`);
        this.options.onClose?.();
    }

    private positionDropdown(): void
    {
        // Set fixed position BEFORE measuring so the dropdown
        // doesn't inflate the wrapper's height on first open
        this.dropdownEl.style.position = "fixed";

        const rect = this.rootEl.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const openAbove = spaceBelow < DROPDOWN_MAX_HEIGHT
            && rect.top > spaceBelow;

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

    // ========================================================================
    // SELECTION MUTATIONS
    // ========================================================================

    private toggleItem(item: ComboItem): void
    {
        if (item.disabled || this.options.readonly)
        {
            return;
        }

        if (this.selectedValues.has(item.value))
        {
            this.deselectItem(item);
        }
        else
        {
            this.selectItem(item);
        }
    }

    private selectItem(item: ComboItem): void
    {
        if (this.isMaxReached())
        {
            return;
        }

        this.selectedValues.add(item.value);
        this.announce(`${item.label} selected`);
        this.options.onSelect?.(item);
        this.afterSelectionChange();
    }

    private deselectItem(item: ComboItem): void
    {
        this.selectedValues.delete(item.value);
        this.announce(`${item.label} removed`);
        this.options.onDeselect?.(item);
        this.afterSelectionChange();
    }

    private handleSelectAllClick(): void
    {
        if (this.options.readonly)
        {
            return;
        }

        const selectable = this.filteredItems.filter(i => !i.disabled);
        const allSelected = selectable.every(
            i => this.selectedValues.has(i.value)
        );

        if (allSelected)
        {
            this.deselectFilteredItems(selectable);
        }
        else
        {
            this.selectFilteredItems(selectable);
        }

        this.afterSelectionChange();
    }

    private selectFilteredItems(selectable: ComboItem[]): void
    {
        const max = this.options.maxSelections || 0;
        let count = this.selectedValues.size;

        for (const item of selectable)
        {
            if (max > 0 && count >= max)
            {
                break;
            }

            if (!this.selectedValues.has(item.value))
            {
                this.selectedValues.add(item.value);
                count++;
            }
        }

        this.announce(`${this.selectedValues.size} items selected`);
    }

    private deselectFilteredItems(selectable: ComboItem[]): void
    {
        for (const item of selectable)
        {
            this.selectedValues.delete(item.value);
        }

        this.announce("All items deselected");
    }

    private removeLastSelected(): void
    {
        const selected = this.getSelectedItems();

        if (selected.length === 0)
        {
            return;
        }

        this.deselectItem(selected[selected.length - 1]);
    }

    private handleCtrlA(): void
    {
        if (this.options.readonly)
        {
            return;
        }

        const selectable = this.filteredItems.filter(i => !i.disabled);
        const allSelected = selectable.every(
            i => this.selectedValues.has(i.value)
        );

        if (allSelected)
        {
            this.deselectAll();
        }
        else
        {
            this.selectAll();
        }
    }

    // ========================================================================
    // FILTERING
    // ========================================================================

    private onFilterInput(): void
    {
        const query = this.filterInputEl?.value || "";
        this.filterQuery = query;
        this.options.onFilterChange?.(query);

        if (this.items.length > DEBOUNCE_THRESHOLD)
        {
            this.filterDebounced(query);
        }
        else
        {
            this.applyFilterAndRender(query);
        }
    }

    private filterDebounced(query: string): void
    {
        if (this.debounceTimer !== null)
        {
            clearTimeout(this.debounceTimer);
        }

        this.debounceTimer = setTimeout(() =>
        {
            this.applyFilterAndRender(query);
            this.debounceTimer = null;
        }, FILTER_DEBOUNCE_MS);
    }

    private applyFilterAndRender(query: string): void
    {
        this.applyFilter(query);
        this.renderItems();
        this.updateSelectAllState();
    }

    private applyFilter(query: string): void
    {
        if (!query)
        {
            this.filteredItems = orderByGroup(this.items);
            return;
        }

        const matching = this.items.filter(item => defaultFilter(query, item));
        this.filteredItems = orderByGroup(matching);
    }

    private refreshFilteredItems(): void
    {
        this.applyFilter(this.filterQuery);

        if (this.isOpen)
        {
            this.renderItems();
            this.updateSelectAllState();
            this.updateMaxReachedState();
        }
    }

    // ========================================================================
    // KEYBOARD — INPUT AREA
    // ========================================================================

    private handleInputAreaKeydown(e: KeyboardEvent): void
    {
        if (this.options.disabled)
        {
            return;
        }

        if (!this.isOpen)
        {
            this.handleKeydownClosed(e);
            return;
        }

        this.handleKeydownOpen(e);
    }

    private handleKeydownClosed(e: KeyboardEvent): void
    {
        const isOpen = this.matchesKeyCombo(e, "openDropdown");
        const isEnter = this.matchesKeyCombo(e, "openWithEnter");
        const isSpace = this.matchesKeyCombo(e, "openWithSpace");

        if (isOpen || isEnter || isSpace)
        {
            e.preventDefault();
            this.openDropdown();

            if (isOpen)
            {
                this.setHighlight(this.findFirstNavigable());
            }
        }
    }

    private handleKeydownOpen(e: KeyboardEvent): void
    {
        if (this.handleOpenNavKeys(e)) { return; }
        this.handleOpenPositionKeys(e);
    }

    /**
     * Dispatches move, toggle, close, and tab keys when open.
     * Returns true if the event was handled.
     */
    private handleOpenNavKeys(e: KeyboardEvent): boolean
    {
        if (this.matchesKeyCombo(e, "selectAll"))
        {
            e.preventDefault(); this.handleCtrlA(); return true;
        }
        if (this.matchesKeyCombo(e, "moveDown"))
        {
            e.preventDefault(); this.moveHighlight(1); return true;
        }
        if (this.matchesKeyCombo(e, "moveUp"))
        {
            e.preventDefault(); this.moveHighlight(-1); return true;
        }
        if (this.matchesKeyCombo(e, "toggleItem")
            || this.matchesKeyCombo(e, "toggleItemSpace"))
        {
            e.preventDefault(); this.toggleHighlightedItem(); return true;
        }
        if (this.matchesKeyCombo(e, "closeDropdown"))
        {
            this.closeDropdown(); this.inputAreaEl.focus(); return true;
        }
        if (this.matchesKeyCombo(e, "commitAndTab"))
        {
            this.closeDropdown(); return true;
        }
        return false;
    }

    /**
     * Dispatches backspace, home, and end keys when open.
     */
    private handleOpenPositionKeys(e: KeyboardEvent): void
    {
        if (this.matchesKeyCombo(e, "removeLastChip"))
        {
            this.removeLastSelected();
        }
        else if (this.matchesKeyCombo(e, "jumpToFirst"))
        {
            e.preventDefault();
            this.setHighlight(this.findFirstNavigable());
        }
        else if (this.matchesKeyCombo(e, "jumpToLast"))
        {
            e.preventDefault();
            this.setHighlight(this.findLastNavigable());
        }
    }

    // ========================================================================
    // KEYBOARD — FILTER INPUT
    // ========================================================================

    private handleFilterKeydown(e: KeyboardEvent): void
    {
        if (this.handleFilterNavKeys(e)) { return; }
        this.handleFilterKeydownExtra(e);
    }

    /**
     * Dispatches core nav keys in the filter input.
     * Returns true if the event was handled.
     */
    private handleFilterNavKeys(e: KeyboardEvent): boolean
    {
        if (this.matchesKeyCombo(e, "selectAll"))
        {
            e.preventDefault(); this.handleCtrlA(); return true;
        }
        if (this.matchesKeyCombo(e, "moveDown"))
        {
            e.preventDefault(); this.moveHighlight(1); return true;
        }
        if (this.matchesKeyCombo(e, "moveUp"))
        {
            e.preventDefault(); this.moveHighlight(-1); return true;
        }
        if (this.matchesKeyCombo(e, "toggleItem"))
        {
            e.preventDefault(); this.toggleHighlightedItem(); return true;
        }
        if (this.matchesKeyCombo(e, "closeDropdown"))
        {
            this.closeDropdown(); this.inputAreaEl.focus(); return true;
        }
        if (this.matchesKeyCombo(e, "commitAndTab"))
        {
            this.closeDropdown(); return true;
        }
        return false;
    }

    private handleFilterKeydownExtra(e: KeyboardEvent): void
    {
        const isEmpty = !this.filterInputEl?.value;

        if (this.matchesKeyCombo(e, "removeLastChip") && isEmpty)
        {
            this.removeLastSelected();
        }
        else if (this.matchesKeyCombo(e, "jumpToFirst") && isEmpty)
        {
            e.preventDefault();
            this.setHighlight(this.findFirstNavigable());
        }
        else if (this.matchesKeyCombo(e, "jumpToLast") && isEmpty)
        {
            e.preventDefault();
            this.setHighlight(this.findLastNavigable());
        }
    }

    // ========================================================================
    // HIGHLIGHT NAVIGATION
    // ========================================================================

    private setHighlight(index: number): void
    {
        const prev = this.listboxEl.querySelector(
            ".multiselectcombo-item-highlighted"
        );

        if (prev)
        {
            prev.classList.remove("multiselectcombo-item-highlighted");
        }

        this.highlightedIndex = index;

        if (index < 0 || index >= this.filteredItems.length)
        {
            this.clearActivedescendant();
            return;
        }

        const optId = `${this.instanceId}-opt-${index}`;
        const el = this.listboxEl.querySelector(`#${optId}`);

        if (el)
        {
            el.classList.add("multiselectcombo-item-highlighted");
            el.scrollIntoView({ block: "nearest" });
        }

        this.setActivedescendant(optId);
    }

    private clearActivedescendant(): void
    {
        setAttr(this.inputAreaEl, "aria-activedescendant", "");

        if (this.filterInputEl)
        {
            setAttr(this.filterInputEl, "aria-activedescendant", "");
        }
    }

    private setActivedescendant(optId: string): void
    {
        setAttr(this.inputAreaEl, "aria-activedescendant", optId);

        if (this.filterInputEl)
        {
            setAttr(this.filterInputEl, "aria-activedescendant", optId);
        }
    }

    private moveHighlight(delta: number): void
    {
        if (this.filteredItems.length === 0)
        {
            return;
        }

        let idx = this.highlightedIndex + delta;
        const len = this.filteredItems.length;
        let attempts = 0;

        while (attempts < len)
        {
            if (idx < 0) { idx = len - 1; }
            else if (idx >= len) { idx = 0; }

            if (!this.filteredItems[idx].disabled)
            {
                break;
            }

            idx += delta > 0 ? 1 : -1;
            attempts++;
        }

        if (attempts < len)
        {
            this.setHighlight(idx);
        }
    }

    private findFirstNavigable(): number
    {
        return this.filteredItems.findIndex(i => !i.disabled);
    }

    private findLastNavigable(): number
    {
        for (let i = this.filteredItems.length - 1; i >= 0; i--)
        {
            if (!this.filteredItems[i].disabled)
            {
                return i;
            }
        }

        return -1;
    }

    private toggleHighlightedItem(): void
    {
        if (this.highlightedIndex < 0
            || this.highlightedIndex >= this.filteredItems.length)
        {
            return;
        }

        this.toggleItem(this.filteredItems[this.highlightedIndex]);
    }

    // ========================================================================
    // EVENT HANDLERS
    // ========================================================================

    private onInputAreaClick(e: MouseEvent): void
    {
        if (this.options.disabled)
        {
            return;
        }

        const target = e.target as HTMLElement;

        if (target.closest(".multiselectcombo-chip-remove"))
        {
            return;
        }

        if (this.isOpen)
        {
            this.closeDropdown();
        }
        else
        {
            this.openDropdown();
        }
    }

    private onToggleClick(): void
    {
        if (this.options.disabled)
        {
            return;
        }

        if (this.isOpen)
        {
            this.closeDropdown();
        }
        else
        {
            this.openDropdown();
        }
    }

    private onDocumentClick(e: MouseEvent): void
    {
        if (!this.rootEl.contains(e.target as Node))
        {
            this.closeDropdown();
        }
    }

    // ========================================================================
    // HELPERS
    // ========================================================================

    private isMaxReached(): boolean
    {
        const max = this.options.maxSelections || 0;
        return max > 0 && this.selectedValues.size >= max;
    }

    private findItemByValue(value: string): ComboItem | undefined
    {
        return this.items.find(i => i.value === value);
    }

    private applyInitialSelection(selected?: string[]): void
    {
        if (!selected)
        {
            return;
        }

        for (const v of selected)
        {
            if (this.findItemByValue(v))
            {
                this.selectedValues.add(v);
            }
        }
    }

    private announce(message: string): void
    {
        this.liveRegionEl.textContent = "";

        requestAnimationFrame(() =>
        {
            this.liveRegionEl.textContent = message;
        });
    }

    private guardDestroyed(method: string): boolean
    {
        if (this.destroyed)
        {
            console.warn(
                `${LOG_PREFIX} Cannot call ${method}() on destroyed instance`
            );
            return true;
        }

        return false;
    }
}

// ============================================================================
// CONVENIENCE FUNCTION
// ============================================================================

/**
 * Create, optionally show, and return a MultiselectCombo instance.
 */
export function createMultiselectCombo(
    options: MultiselectComboOptions,
    containerId?: string): MultiselectCombo
{
    const instance = new MultiselectCombo(options);

    if (containerId)
    {
        instance.show(containerId);
    }

    return instance;
}

// ============================================================================
// GLOBAL EXPORTS (for <script> tag usage)
// ============================================================================

if (typeof window !== "undefined")
{
    (window as unknown as Record<string, unknown>)["MultiselectCombo"] = MultiselectCombo;
    (window as unknown as Record<string, unknown>)["createMultiselectCombo"] = createMultiselectCombo;
}
