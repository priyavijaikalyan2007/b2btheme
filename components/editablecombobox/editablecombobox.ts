/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: EditableComboBox
 * 📜 PURPOSE: A combined text input and dropdown list that allows free text
 *    entry or selection from a filterable list of options.
 * 🔗 RELATES: [[EnterpriseTheme]], [[CustomComponents]]
 * ⚡ FLOW: [Consumer App] -> [createEditableComboBox()] -> [DOM input + listbox]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Represents a single item in the combo box dropdown.
 */
export interface ComboBoxItem
{
    /** The display text shown in the dropdown and committed to the input on selection. */
    label: string;

    /** An optional programmatic value distinct from the display label. */
    value?: string;

    /** When true, this item is shown but cannot be selected. Default: false. */
    disabled?: boolean;

    /** Optional grouping label. Items with the same group are displayed under a group header. */
    group?: string;
}

/**
 * Configuration options for the EditableComboBox component.
 */
export interface ComboBoxOptions
{
    /** The items to display in the dropdown. */
    items: ComboBoxItem[];

    /** Placeholder text shown when the input is empty. */
    placeholder?: string;

    /** Initial value of the input. If it matches an item, that item is selected. */
    value?: string;

    /** When true, only values from the item list are accepted. Default: false. */
    restrictToItems?: boolean;

    /** Maximum number of visible items before the dropdown scrolls. Default: 8. */
    maxVisibleItems?: number;

    /** Minimum characters before filtering begins. Default: 0. */
    minFilterLength?: number;

    /** When true, the input and toggle are disabled. Default: false. */
    disabled?: boolean;

    /** When true, the input is not editable but the dropdown can still open. Default: false. */
    readonly?: boolean;

    /** Size variant. Default: "default". */
    size?: "mini" | "sm" | "default" | "lg";

    /** Custom filter function. Receives the search text and an item; returns true to include. */
    filterFn?: (searchText: string, item: ComboBoxItem) => boolean;

    /** Override default key combos. Keys are action names, values are combo strings. */
    keyBindings?: Partial<Record<string, string>>;

    /** Callback fired when the user selects an item from the dropdown. */
    onSelect?: (item: ComboBoxItem) => void;

    /** Callback fired whenever the input value changes (typing or selection). */
    onChange?: (value: string) => void;

    /** Callback fired when the dropdown opens. */
    onOpen?: () => void;

    /** Callback fired when the dropdown closes. */
    onClose?: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Component log prefix for console messages. */
const LOG_PREFIX = "[EditableComboBox]";

/** Default number of visible items before scrolling. */
const DEFAULT_MAX_VISIBLE = 8;

/** Approximate height of a single item in pixels, used for scroll calculations. */
const ITEM_HEIGHT_PX = 32;

/** Debounce delay in milliseconds for large lists (500+ items). */
const FILTER_DEBOUNCE_MS = 150;

/** Threshold above which filtering is debounced. */
const DEBOUNCE_THRESHOLD = 500;

/** Number of items to scroll per PageUp/PageDown press. */
const PAGE_SCROLL_COUNT = 10;

/** Unique ID counter to prevent DOM collisions between instances. */
let instanceCounter = 0;

/** Default key bindings for keyboard navigation actions. */
const DEFAULT_KEY_BINDINGS: Record<string, string> = {
    openOrMoveDown: "ArrowDown",
    openOrMoveUp: "ArrowUp",
    confirmSelection: "Enter",
    closeDropdown: "Escape",
    commitAndTab: "Tab",
    jumpToFirst: "Home",
    jumpToLast: "End",
    pageDown: "PageDown",
    pageUp: "PageUp",
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
// PRIVATE HELPERS — FILTERING
// ============================================================================

/**
 * Default filter: case-insensitive substring match against the item label.
 */
function defaultFilter(searchText: string, item: ComboBoxItem): boolean
{
    return item.label.toLowerCase().includes(searchText.toLowerCase());
}

/**
 * Wraps matched portions of a label in <mark> elements for visual highlighting.
 * Returns a DocumentFragment with text nodes and <mark> elements.
 */
function highlightMatch(label: string, searchText: string): DocumentFragment
{
    const fragment = document.createDocumentFragment();

    if (!searchText)
    {
        fragment.appendChild(document.createTextNode(label));
        return fragment;
    }

    const lowerLabel = label.toLowerCase();
    const lowerSearch = searchText.toLowerCase();
    let cursor = 0;

    while (cursor < label.length)
    {
        const matchIndex = lowerLabel.indexOf(lowerSearch, cursor);

        if (matchIndex === -1)
        {
            fragment.appendChild(document.createTextNode(label.substring(cursor)));
            break;
        }

        // Text before the match
        if (matchIndex > cursor)
        {
            fragment.appendChild(
                document.createTextNode(label.substring(cursor, matchIndex))
            );
        }

        // The matched portion
        const mark = createElement("mark", ["combobox-match"]);
        mark.textContent = label.substring(matchIndex, matchIndex + searchText.length);
        fragment.appendChild(mark);

        cursor = matchIndex + searchText.length;
    }

    return fragment;
}

/**
 * Extracts unique groups from items in the order they first appear.
 */
function extractGroups(items: ComboBoxItem[]): string[]
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

// ============================================================================
// PUBLIC API
// ============================================================================

// @entrypoint

/**
 * EditableComboBox combines a text input with a filterable dropdown list.
 * Users can type free text or select from the list.
 *
 * @example
 * const combo = new EditableComboBox("my-container", {
 *     items: [{ label: "Apple" }, { label: "Banana" }, { label: "Cherry" }],
 *     placeholder: "Pick a fruit...",
 *     onSelect: (item) => console.log("Selected:", item.label)
 * });
 */
export class EditableComboBox
{
    // -- Configuration
    private readonly containerId: string;
    private options: ComboBoxOptions;
    private readonly instanceId: string;

    // -- State
    private items: ComboBoxItem[] = [];
    private filteredItems: ComboBoxItem[] = [];
    private isOpen = false;
    private highlightedIndex = -1;
    private selectedItem: ComboBoxItem | null = null;
    private lastValidValue = "";
    private debounceTimer: ReturnType<typeof setTimeout> | null = null;

    // -- DOM references
    private wrapperEl: HTMLElement | null = null;
    private inputEl: HTMLInputElement | null = null;
    private toggleEl: HTMLElement | null = null;
    private listboxEl: HTMLElement | null = null;

    // -- Bound event handlers (for cleanup)
    private readonly boundOnDocumentClick: (e: MouseEvent) => void;

    constructor(containerId: string, options: ComboBoxOptions)
    {
        this.containerId = containerId;
        this.options = { ...options };
        this.items = [...options.items];
        this.filteredItems = [...this.items];

        instanceCounter++;
        this.instanceId = `combobox-${instanceCounter}`;

        // Bind document-level click handler for outside-click detection
        this.boundOnDocumentClick = (e: MouseEvent) => this.onDocumentClick(e);

        this.render();

        console.log(`${LOG_PREFIX} Initialised:`, this.instanceId);
        console.debug(`${LOG_PREFIX} Options:`, {
            itemCount: this.items.length,
            size: this.options.size || "default",
            restrictToItems: !!this.options.restrictToItems
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
    // PUBLIC METHODS
    // ========================================================================

    /** Returns the current text value of the input. */
    public getValue(): string
    {
        return this.inputEl?.value ?? "";
    }

    /** Returns the currently selected ComboBoxItem, or null if the input is free text. */
    public getSelectedItem(): ComboBoxItem | null
    {
        return this.selectedItem;
    }

    /** Sets the input value programmatically. If it matches an item, that item is selected. */
    public setValue(value: string): void
    {
        if (!this.inputEl)
        {
            return;
        }

        this.inputEl.value = value;
        this.selectedItem = this.findExactMatch(value);
        this.lastValidValue = value;

        console.debug(`${LOG_PREFIX} Value set programmatically:`, value);
        this.options.onChange?.(value);
    }

    /** Replaces the dropdown items. Resets the filter. */
    public setItems(items: ComboBoxItem[]): void
    {
        this.items = [...items];
        this.filteredItems = [...this.items];

        if (this.isOpen)
        {
            this.applyFilter(this.inputEl?.value ?? "");
            this.renderListItems();
        }

        console.debug(`${LOG_PREFIX} Items updated:`, items.length);
    }

    /** Opens the dropdown programmatically. */
    public open(): void
    {
        if (!this.options.disabled)
        {
            this.openDropdown();
        }
    }

    /** Closes the dropdown programmatically. */
    public close(): void
    {
        this.closeDropdown();
    }

    /** Enables the component. */
    public enable(): void
    {
        this.options.disabled = false;
        this.inputEl?.removeAttribute("disabled");
        this.toggleEl?.removeAttribute("disabled");
        this.wrapperEl?.classList.remove("combobox-disabled");

        console.debug(`${LOG_PREFIX} Enabled`);
    }

    /** Disables the component. */
    public disable(): void
    {
        this.options.disabled = true;

        if (this.isOpen)
        {
            this.closeDropdown();
        }

        this.inputEl?.setAttribute("disabled", "");
        this.toggleEl?.setAttribute("disabled", "");
        this.wrapperEl?.classList.add("combobox-disabled");

        console.debug(`${LOG_PREFIX} Disabled`);
    }

    /** Removes the component from the DOM and cleans up event listeners. */
    public destroy(): void
    {
        document.removeEventListener("click", this.boundOnDocumentClick);

        if (this.debounceTimer !== null)
        {
            clearTimeout(this.debounceTimer);
        }

        if (this.wrapperEl)
        {
            this.wrapperEl.remove();
            this.wrapperEl = null;
        }

        this.inputEl = null;
        this.toggleEl = null;
        this.listboxEl = null;

        console.debug(`${LOG_PREFIX} Destroyed:`, this.instanceId);
    }

    // ========================================================================
    // RENDERING
    // ========================================================================

    /**
     * Builds the complete DOM structure and appends it to the container.
     */
    private render(): void
    {
        const container = document.getElementById(this.containerId);
        if (!container)
        {
            console.error(`${LOG_PREFIX} Container element not found:`, this.containerId);
            return;
        }

        this.wrapperEl = this.buildWrapper();
        container.appendChild(this.wrapperEl);

        // Attach document-level listener for outside clicks
        document.addEventListener("click", this.boundOnDocumentClick);

        // Set initial value if provided
        if (this.options.value)
        {
            this.setValue(this.options.value);
        }
    }

    /**
     * Builds the outer wrapper with input-group, input, toggle, and listbox.
     */
    private buildWrapper(): HTMLElement
    {
        const wrapper = createElement("div", ["combobox"]);
        setAttr(wrapper, "id", this.instanceId);

        // Apply size variant class
        if (this.options.size === "mini")
        {
            wrapper.classList.add("combobox-mini");
        }
        else if (this.options.size === "sm")
        {
            wrapper.classList.add("combobox-sm");
        }
        else if (this.options.size === "lg")
        {
            wrapper.classList.add("combobox-lg");
        }

        // Input group
        const inputGroup = createElement("div", ["input-group"]);
        this.inputEl = this.buildInput();
        this.toggleEl = this.buildToggle();
        inputGroup.appendChild(this.inputEl);
        inputGroup.appendChild(this.toggleEl);
        wrapper.appendChild(inputGroup);

        // Listbox
        this.listboxEl = this.buildListbox();
        wrapper.appendChild(this.listboxEl);

        // Apply disabled state
        if (this.options.disabled)
        {
            this.inputEl.setAttribute("disabled", "");
            this.toggleEl.setAttribute("disabled", "");
            wrapper.classList.add("combobox-disabled");
        }

        // Apply readonly state
        if (this.options.readonly)
        {
            this.inputEl.setAttribute("readonly", "");
        }

        return wrapper;
    }

    /**
     * Builds the text input element with ARIA attributes and event listeners.
     */
    private buildInput(): HTMLInputElement
    {
        const input = document.createElement("input");
        input.type = "text";

        const inputClasses = ["form-control", "combobox-input"];
        if (this.options.size === "mini")
        {
            inputClasses.push("form-control-sm");
        }
        else if (this.options.size === "sm")
        {
            inputClasses.push("form-control-sm");
        }
        else if (this.options.size === "lg")
        {
            inputClasses.push("form-control-lg");
        }
        input.classList.add(...inputClasses);

        // ARIA attributes for combobox pattern
        setAttr(input, "role", "combobox");
        setAttr(input, "aria-label",
            this.options.placeholder ?? "Select an option");
        setAttr(input, "aria-expanded", "false");
        setAttr(input, "aria-controls", `${this.instanceId}-listbox`);
        setAttr(input, "aria-activedescendant", "");
        setAttr(input, "aria-autocomplete", "list");
        setAttr(input, "aria-haspopup", "listbox");
        setAttr(input, "autocomplete", "off");

        if (this.options.placeholder)
        {
            setAttr(input, "placeholder", this.options.placeholder);
        }

        // Event listeners
        input.addEventListener("input", () => this.onInput());
        input.addEventListener("keydown", (e) => this.onKeydown(e));
        input.addEventListener("focus", () => this.onFocus());
        input.addEventListener("blur", () => this.onBlur());

        return input;
    }

    /**
     * Builds the toggle button with the chevron icon.
     */
    private buildToggle(): HTMLElement
    {
        const btnClasses = ["btn", "btn-outline-secondary", "combobox-toggle"];
        if (this.options.size === "mini")
        {
            btnClasses.push("btn-sm");
        }
        else if (this.options.size === "sm")
        {
            btnClasses.push("btn-sm");
        }
        else if (this.options.size === "lg")
        {
            btnClasses.push("btn-lg");
        }

        const btn = createElement("button", btnClasses);
        setAttr(btn, "type", "button");
        setAttr(btn, "tabindex", "-1");
        setAttr(btn, "aria-label", "Toggle dropdown");

        const icon = createElement("i", ["bi", "bi-chevron-down", "combobox-chevron"]);
        btn.appendChild(icon);

        btn.addEventListener("mousedown", (e) =>
        {
            // Prevent the input from losing focus when clicking the toggle
            e.preventDefault();
            this.onToggleClick();
        });

        return btn;
    }

    /**
     * Builds the listbox (dropdown) element.
     */
    private buildListbox(): HTMLElement
    {
        const listbox = createElement("ul", ["combobox-listbox"]);
        setAttr(listbox, "id", `${this.instanceId}-listbox`);
        setAttr(listbox, "role", "listbox");
        setAttr(listbox, "aria-label", "Options");
        listbox.style.display = "none";

        // Calculate max-height from maxVisibleItems
        const maxVisible = this.options.maxVisibleItems ?? DEFAULT_MAX_VISIBLE;
        listbox.style.maxHeight = `${maxVisible * ITEM_HEIGHT_PX}px`;

        this.renderListItems();

        return listbox;
    }

    /**
     * Renders the list items into the listbox based on current filtered items.
     */
    private renderListItems(): void
    {
        if (!this.listboxEl)
        {
            return;
        }

        // Clear existing items
        this.listboxEl.innerHTML = "";
        this.highlightedIndex = -1;

        // Check for no matches
        if (this.filteredItems.length === 0)
        {
            const noMatches = createElement("li", ["combobox-no-matches"], "No matches found");
            setAttr(noMatches, "role", "status");
            this.listboxEl.appendChild(noMatches);
            return;
        }

        // Determine if items have groups
        const groups = extractGroups(this.filteredItems);
        const currentSearch = this.inputEl?.value ?? "";

        if (groups.length > 0)
        {
            this.renderGroupedItems(groups, currentSearch);
        }
        else
        {
            this.renderFlatItems(this.filteredItems, currentSearch);
        }
    }

    /**
     * Renders items grouped under headers.
     */
    private renderGroupedItems(groups: string[], searchText: string): void
    {
        // Items without a group come first
        const ungrouped = this.filteredItems.filter((item) => !item.group);
        if (ungrouped.length > 0)
        {
            this.renderFlatItems(ungrouped, searchText);
        }

        for (const groupName of groups)
        {
            const groupItems = this.filteredItems.filter((item) => item.group === groupName);

            if (groupItems.length === 0)
            {
                continue;
            }

            const header = createElement("li", ["combobox-group-header"], groupName);
            setAttr(header, "aria-hidden", "true");
            this.listboxEl!.appendChild(header);

            this.renderFlatItems(groupItems, searchText);
        }
    }

    /**
     * Renders a flat list of items with match highlighting.
     */
    private renderFlatItems(items: ComboBoxItem[], searchText: string): void
    {
        for (const item of items)
        {
            const globalIndex = this.filteredItems.indexOf(item);
            const li = createElement("li", ["combobox-item"]);
            const optionId = `${this.instanceId}-option-${globalIndex}`;

            setAttr(li, "id", optionId);
            setAttr(li, "role", "option");
            setAttr(li, "aria-selected", "false");

            if (item.label.length > 80)
            {
                setAttr(li, "title", item.label);
            }

            if (item.disabled)
            {
                li.classList.add("combobox-item-disabled");
                setAttr(li, "aria-disabled", "true");
            }

            // Mark as selected if it matches the current input value exactly
            if (this.selectedItem && item.label === this.selectedItem.label)
            {
                li.classList.add("combobox-item-selected");
            }

            // Highlight matched text
            const matchFragment = highlightMatch(item.label, searchText);
            li.appendChild(matchFragment);

            // Click handler
            li.addEventListener("mousedown", (e) =>
            {
                e.preventDefault();
                if (!item.disabled)
                {
                    this.selectItem(item);
                }
            });

            // Hover handler
            li.addEventListener("mouseenter", () =>
            {
                if (!item.disabled)
                {
                    this.setHighlight(globalIndex);
                }
            });

            this.listboxEl!.appendChild(li);
        }
    }

    // ========================================================================
    // DROPDOWN STATE
    // ========================================================================

    /**
     * Opens the dropdown and renders filtered items.
     */
    private openDropdown(): void
    {
        if (this.isOpen || !this.listboxEl || !this.wrapperEl)
        {
            return;
        }

        if (this.items.length === 0)
        {
            console.debug(`${LOG_PREFIX} No items to display; dropdown not opened`);
            return;
        }

        this.isOpen = true;
        this.listboxEl.style.display = "";
        this.inputEl?.setAttribute("aria-expanded", "true");
        this.wrapperEl.classList.add("combobox-open");

        // Render items first so the listbox has content for sizing
        this.renderListItems();

        // Position after a frame so the DOM has settled
        requestAnimationFrame(() =>
        {
            this.positionDropdown();
        });

        // If current value matches an item, scroll it into view
        this.scrollSelectedIntoView();

        console.debug(`${LOG_PREFIX} Dropdown opened`);
        this.options.onOpen?.();
    }

    /**
     * Closes the dropdown.
     */
    private closeDropdown(): void
    {
        if (!this.isOpen || !this.listboxEl || !this.wrapperEl)
        {
            return;
        }

        this.isOpen = false;
        this.highlightedIndex = -1;
        this.listboxEl.style.display = "none";
        this.inputEl?.setAttribute("aria-expanded", "false");
        this.inputEl?.setAttribute("aria-activedescendant", "");
        this.wrapperEl.classList.remove("combobox-open");

        console.debug(`${LOG_PREFIX} Dropdown closed`);
        this.options.onClose?.();
    }

    /**
     * Positions the dropdown using fixed positioning so it escapes
     * overflow:hidden containers (modals, scrollable panels).
     */
    private positionDropdown(): void
    {
        if (!this.wrapperEl || !this.listboxEl)
        {
            return;
        }

        const rect = this.wrapperEl.getBoundingClientRect();
        const maxVisible = this.options.maxVisibleItems ?? DEFAULT_MAX_VISIBLE;
        const ddHeight = maxVisible * ITEM_HEIGHT_PX;
        const spaceBelow = window.innerHeight - rect.bottom;
        const openAbove = spaceBelow < ddHeight && rect.top > spaceBelow;

        this.listboxEl.style.position = "fixed";
        this.listboxEl.style.left = `${rect.left}px`;
        this.listboxEl.style.width = `${rect.width}px`;

        if (openAbove)
        {
            this.listboxEl.style.top = "";
            this.listboxEl.style.bottom =
                `${window.innerHeight - rect.top}px`;
        }
        else
        {
            this.listboxEl.style.bottom = "";
            this.listboxEl.style.top = `${rect.bottom}px`;
        }

        this.clampToViewport();
    }

    private clampToViewport(): void
    {
        if (!this.listboxEl) { return; }
        requestAnimationFrame(() =>
        {
            if (!this.listboxEl) { return; }
            const pr = this.listboxEl.getBoundingClientRect();
            if (pr.right > window.innerWidth)
            {
                this.listboxEl.style.left =
                    `${window.innerWidth - pr.width - 4}px`;
            }
            if (pr.left < 0) { this.listboxEl.style.left = "4px"; }
        });
    }

    // ========================================================================
    // FILTERING
    // ========================================================================

    /**
     * Applies the filter to the item list based on the given search text.
     */
    private applyFilter(searchText: string): void
    {
        const minLength = this.options.minFilterLength ?? 0;

        if (searchText.length < minLength)
        {
            this.filteredItems = [...this.items];
            return;
        }

        const filterFn = this.options.filterFn ?? defaultFilter;
        this.filteredItems = this.items.filter((item) => filterFn(searchText, item));
    }

    /**
     * Runs the filter with optional debounce for large lists.
     */
    private filterAndRender(searchText: string): void
    {
        if (this.debounceTimer !== null)
        {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }

        if (this.items.length > DEBOUNCE_THRESHOLD)
        {
            this.debounceTimer = setTimeout(() =>
            {
                this.applyFilter(searchText);
                this.renderListItems();
            }, FILTER_DEBOUNCE_MS);
        }
        else
        {
            this.applyFilter(searchText);
            this.renderListItems();
        }
    }

    // ========================================================================
    // SELECTION
    // ========================================================================

    /**
     * Selects an item: sets the input value, updates state, and closes the dropdown.
     */
    private selectItem(item: ComboBoxItem): void
    {
        if (!this.inputEl)
        {
            return;
        }

        this.inputEl.value = item.label;
        this.selectedItem = item;
        this.lastValidValue = item.label;
        this.closeDropdown();
        this.inputEl.focus();

        // Reset filter so all items show next time
        this.filteredItems = [...this.items];

        console.debug(`${LOG_PREFIX} Item selected:`, item.label);
        this.options.onSelect?.(item);
        this.options.onChange?.(item.label);
    }

    /**
     * Finds an item whose label exactly matches the given value (case-sensitive).
     */
    private findExactMatch(value: string): ComboBoxItem | null
    {
        return this.items.find((item) => item.label === value) ?? null;
    }

    /**
     * Scrolls the currently selected item into view within the listbox.
     */
    private scrollSelectedIntoView(): void
    {
        if (!this.listboxEl || !this.selectedItem)
        {
            return;
        }

        const index = this.filteredItems.indexOf(this.selectedItem);

        if (index >= 0)
        {
            const optionEl = this.listboxEl.querySelector(
                `#${this.instanceId}-option-${index}`
            );
            optionEl?.scrollIntoView({ block: "nearest" });
        }
    }

    // ========================================================================
    // HIGHLIGHT NAVIGATION
    // ========================================================================

    /**
     * Sets the highlighted item by index. Updates ARIA and visual state.
     */
    private setHighlight(index: number): void
    {
        if (!this.listboxEl || !this.inputEl)
        {
            return;
        }

        // Remove previous highlight
        const prevEl = this.listboxEl.querySelector(".combobox-item-highlighted");
        prevEl?.classList.remove("combobox-item-highlighted");
        prevEl?.setAttribute("aria-selected", "false");

        this.highlightedIndex = index;

        if (index < 0 || index >= this.filteredItems.length)
        {
            this.inputEl.setAttribute("aria-activedescendant", "");
            return;
        }

        // Skip disabled items — search forward
        if (this.filteredItems[index].disabled)
        {
            this.moveHighlight(1);
            return;
        }

        const optionId = `${this.instanceId}-option-${index}`;
        const optionEl = this.listboxEl.querySelector(`#${optionId}`);

        if (optionEl)
        {
            optionEl.classList.add("combobox-item-highlighted");
            optionEl.setAttribute("aria-selected", "true");
            optionEl.scrollIntoView({ block: "nearest" });
        }

        this.inputEl.setAttribute("aria-activedescendant", optionId);
    }

    /**
     * Moves the highlight by the given delta, skipping disabled items.
     * Wraps around at list boundaries.
     */
    private moveHighlight(delta: number): void
    {
        if (this.filteredItems.length === 0)
        {
            return;
        }

        let newIndex = this.highlightedIndex + delta;
        const len = this.filteredItems.length;
        let attempts = 0;

        // Wrap around
        while (attempts < len)
        {
            if (newIndex < 0)
            {
                newIndex = len - 1;
            }
            else if (newIndex >= len)
            {
                newIndex = 0;
            }

            if (!this.filteredItems[newIndex].disabled)
            {
                break;
            }

            newIndex += delta > 0 ? 1 : -1;
            attempts++;
        }

        if (attempts < len)
        {
            this.setHighlight(newIndex);
        }
    }

    /**
     * Moves the highlight by a page (PAGE_SCROLL_COUNT items).
     */
    private moveHighlightByPage(direction: number): void
    {
        const delta = direction * PAGE_SCROLL_COUNT;
        let newIndex = this.highlightedIndex + delta;

        newIndex = Math.max(0, Math.min(newIndex, this.filteredItems.length - 1));

        this.setHighlight(newIndex);
    }

    // ========================================================================
    // EVENT HANDLERS
    // ========================================================================

    /**
     * Handles text input events: filters the dropdown and opens it if closed.
     */
    // <- Handles: input event on combobox-input
    private onInput(): void
    {
        const text = this.inputEl?.value ?? "";

        // Clear selection if text no longer matches
        if (this.selectedItem && text !== this.selectedItem.label)
        {
            this.selectedItem = null;
        }

        this.options.onChange?.(text);

        if (!this.isOpen)
        {
            this.openDropdown();
        }

        this.filterAndRender(text);
    }

    /**
     * Handles keydown events on the input for keyboard navigation.
     */
    // <- Handles: keydown event on combobox-input
    private onKeydown(e: KeyboardEvent): void
    {
        if (this.handleNavKeys(e)) { return; }
        this.handlePositionKeys(e);
    }

    /**
     * Dispatches arrow, enter, escape, and tab key actions.
     * Returns true if the event was handled.
     */
    private handleNavKeys(e: KeyboardEvent): boolean
    {
        if (this.matchesKeyCombo(e, "openOrMoveDown"))
        {
            e.preventDefault();
            this.handleArrowDown(e.altKey);
            return true;
        }
        if (this.matchesKeyCombo(e, "openOrMoveUp"))
        {
            e.preventDefault();
            this.handleArrowUp(e.altKey);
            return true;
        }
        if (this.matchesKeyCombo(e, "confirmSelection"))
        {
            this.handleEnter(e); return true;
        }
        if (this.matchesKeyCombo(e, "closeDropdown"))
        {
            this.handleEscape(); return true;
        }
        if (this.matchesKeyCombo(e, "commitAndTab"))
        {
            this.handleTab(); return true;
        }
        return false;
    }

    /**
     * Dispatches home, end, pageDown, and pageUp key actions.
     */
    private handlePositionKeys(e: KeyboardEvent): void
    {
        if (this.matchesKeyCombo(e, "jumpToFirst"))
        {
            this.handleJumpToFirst(e);
        }
        else if (this.matchesKeyCombo(e, "jumpToLast"))
        {
            this.handleJumpToLast(e);
        }
        else if (this.matchesKeyCombo(e, "pageDown"))
        {
            this.handlePageDown(e);
        }
        else if (this.matchesKeyCombo(e, "pageUp"))
        {
            this.handlePageUp(e);
        }
    }

    /**
     * Handles jumpToFirst: moves highlight to the first item.
     */
    private handleJumpToFirst(e: KeyboardEvent): void
    {
        if (this.isOpen)
        {
            e.preventDefault();
            this.setHighlight(0);
        }
    }

    /**
     * Handles jumpToLast: moves highlight to the last item.
     */
    private handleJumpToLast(e: KeyboardEvent): void
    {
        if (this.isOpen)
        {
            e.preventDefault();
            this.setHighlight(this.filteredItems.length - 1);
        }
    }

    /**
     * Handles pageDown: moves highlight down by a page.
     */
    private handlePageDown(e: KeyboardEvent): void
    {
        if (this.isOpen)
        {
            e.preventDefault();
            this.moveHighlightByPage(1);
        }
    }

    /**
     * Handles pageUp: moves highlight up by a page.
     */
    private handlePageUp(e: KeyboardEvent): void
    {
        if (this.isOpen)
        {
            e.preventDefault();
            this.moveHighlightByPage(-1);
        }
    }

    /**
     * Handles ArrowDown: opens dropdown or moves highlight down.
     */
    private handleArrowDown(altKey: boolean): void
    {
        if (!this.isOpen)
        {
            this.openDropdown();

            if (!altKey)
            {
                this.setHighlight(0);
            }
        }
        else if (!altKey)
        {
            this.moveHighlight(1);
        }
    }

    /**
     * Handles ArrowUp: opens dropdown or moves highlight up.
     */
    private handleArrowUp(altKey: boolean): void
    {
        if (!this.isOpen)
        {
            this.openDropdown();

            if (!altKey)
            {
                this.setHighlight(this.filteredItems.length - 1);
            }
        }
        else if (altKey)
        {
            this.commitHighlighted();
            this.closeDropdown();
        }
        else
        {
            this.moveHighlight(-1);
        }
    }

    /**
     * Handles Enter: selects highlighted item or closes dropdown.
     */
    private handleEnter(e: KeyboardEvent): void
    {
        if (!this.isOpen)
        {
            return;
        }

        e.preventDefault();

        if (this.highlightedIndex >= 0 && this.highlightedIndex < this.filteredItems.length)
        {
            this.selectItem(this.filteredItems[this.highlightedIndex]);
        }
        else
        {
            this.closeDropdown();
        }
    }

    /**
     * Handles Escape: closes the dropdown without changing the input.
     */
    private handleEscape(): void
    {
        if (this.isOpen)
        {
            this.closeDropdown();
        }
    }

    /**
     * Handles Tab: commits highlighted item (if any) and lets focus move naturally.
     */
    private handleTab(): void
    {
        if (this.isOpen)
        {
            this.commitHighlighted();
            this.closeDropdown();
        }
    }

    /**
     * Commits the currently highlighted item to the input without closing the dropdown.
     */
    private commitHighlighted(): void
    {
        if (this.highlightedIndex >= 0 && this.highlightedIndex < this.filteredItems.length)
        {
            const item = this.filteredItems[this.highlightedIndex];

            if (!item.disabled && this.inputEl)
            {
                this.inputEl.value = item.label;
                this.selectedItem = item;
                this.lastValidValue = item.label;

                this.options.onSelect?.(item);
                this.options.onChange?.(item.label);
            }
        }
    }

    /**
     * Handles focus on the input.
     */
    private onFocus(): void
    {
        console.debug(`${LOG_PREFIX} Input focused`);
    }

    /**
     * Handles blur on the input. Closes dropdown and validates restrictToItems.
     */
    private onBlur(): void
    {
        // Use a short delay to allow click events on list items to fire first
        setTimeout(() =>
        {
            if (this.isOpen)
            {
                this.closeDropdown();
            }

            this.validateRestriction();
        }, 150);
    }

    /**
     * Handles clicks on the toggle button: toggles the dropdown.
     */
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
            // Show all items when toggling open via button
            this.filteredItems = [...this.items];
            this.openDropdown();
        }
    }

    /**
     * Handles clicks outside the component to close the dropdown.
     */
    private onDocumentClick(e: MouseEvent): void
    {
        if (!this.wrapperEl || !this.isOpen)
        {
            return;
        }

        if (!this.wrapperEl.contains(e.target as Node))
        {
            this.closeDropdown();
            this.validateRestriction();
        }
    }

    // ========================================================================
    // VALIDATION
    // ========================================================================

    /**
     * If restrictToItems is enabled and the current input does not match any
     * item, revert to the last valid value.
     */
    private validateRestriction(): void
    {
        if (!this.options.restrictToItems || !this.inputEl)
        {
            return;
        }

        const currentValue = this.inputEl.value;
        const match = this.findExactMatch(currentValue);

        if (!match && currentValue !== "")
        {
            console.warn(
                `${LOG_PREFIX} Value "${currentValue}" does not match any item; ` +
                `reverting to "${this.lastValidValue}"`
            );
            this.inputEl.value = this.lastValidValue;
            this.selectedItem = this.findExactMatch(this.lastValidValue);
        }
    }
}

// ============================================================================
// CONVENIENCE FUNCTION
// ============================================================================

/**
 * Creates an EditableComboBox in a single call.
 *
 * @param containerId - The DOM element ID to render into
 * @param options - Configuration options
 * @returns The EditableComboBox instance for further programmatic control
 *
 * @example
 * const combo = createEditableComboBox("my-container", {
 *     items: [{ label: "Red" }, { label: "Green" }, { label: "Blue" }],
 *     placeholder: "Pick a colour...",
 *     onSelect: (item) => console.log("Selected:", item.label)
 * });
 */
export function createEditableComboBox(
    containerId: string,
    options: ComboBoxOptions): EditableComboBox
{
    return new EditableComboBox(containerId, options);
}

// ============================================================================
// GLOBAL EXPORTS (for <script> tag usage)
// ============================================================================

// Expose on window for consumers who load via <script> tag
if (typeof window !== "undefined")
{
    (window as unknown as Record<string, unknown>)["EditableComboBox"] = EditableComboBox;
    (window as unknown as Record<string, unknown>)["createEditableComboBox"] = createEditableComboBox;
}
