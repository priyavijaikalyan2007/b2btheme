/*
 * ----------------------------------------------------------------------------
 * COMPONENT: SearchBox
 * PURPOSE: Debounced search input with search icon, clear button, and optional
 *    suggestions dropdown. Suitable for app shells, sidebars, and toolbars.
 * RELATES: [[EnterpriseTheme]], [[CustomComponents]], [[Toolbar]], [[Sidebar]]
 * FLOW: [Consumer App] -> [createSearchBox()] -> [DOM search widget]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

/**
 * Configuration options for the SearchBox component.
 * All visual and behavioural aspects are controlled through these options.
 */
export interface SearchBoxOptions
{
    /** Placeholder text. Default: "Search...". */
    placeholder?: string;

    /** Debounce delay in ms. Default: 300. */
    debounceMs?: number;

    /** Called after debounce with current query string. */
    onSearch?: (query: string) => void;

    /** Called when Enter is pressed. */
    onSubmit?: (query: string) => void;

    /** Static list or async function returning suggestions. */
    suggestions?: string[] | ((query: string) => Promise<string[]>);

    /** Min chars before showing suggestions. Default: 2. */
    minChars?: number;

    /** Size variant. Default: "md". */
    size?: "mini" | "sm" | "md" | "lg";

    /** Disabled state. Default: false. */
    disabled?: boolean;

    /** Additional CSS class. */
    cssClass?: string;

    /** Override default key combos. */
    keyBindings?: Partial<Record<string, string>>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[SearchBox]";

/** Default debounce delay in milliseconds */
const DEFAULT_DEBOUNCE = 300;

/** Minimum characters before showing suggestions */
const DEFAULT_MIN_CHARS = 2;

/** Z-index for the suggestions dropdown */
const DROPDOWN_Z_INDEX = 1050;

/** Delay in ms before closing suggestions on blur */
const BLUR_CLOSE_DELAY = 150;

/** SearchBox instance counter for unique ID generation */
let instanceCounter = 0;

/** Default key bindings for search keyboard actions. */
const DEFAULT_KEY_BINDINGS: Record<string, string> = {
    clear: "Escape",
    submit: "Enter",
    nextSuggestion: "ArrowDown",
    prevSuggestion: "ArrowUp",
};

// ============================================================================
// PRIVATE HELPERS -- DOM
// ============================================================================

/**
 * Creates an HTML element with optional CSS classes and text content.
 *
 * @param tag - The HTML tag name
 * @param classes - CSS class names to add
 * @param text - Optional text content
 * @returns The created element
 */
function createElement(
    tag: string, classes: string[], text?: string
): HTMLElement
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
 * Sets an attribute on an HTML element.
 *
 * @param el - Target element
 * @param name - Attribute name
 * @param value - Attribute value
 */
function setAttr(el: HTMLElement, name: string, value: string): void
{
    el.setAttribute(name, value);
}

// ============================================================================
// PRIVATE HELPERS -- DEBOUNCE
// ============================================================================

/**
 * Returns a debounced wrapper around the supplied function. The wrapped
 * function delays invocation until the specified interval has elapsed
 * since the last call.
 *
 * @param fn - The function to debounce
 * @param ms - Debounce interval in milliseconds
 * @returns Debounced function
 */
function debounce(fn: (q: string) => void, ms: number): (q: string) => void
{
    let timer = 0;

    return (q: string): void =>
    {
        clearTimeout(timer);
        timer = window.setTimeout(() => fn(q), ms);
    };
}

// ============================================================================
// PUBLIC API -- SearchBox
// ============================================================================

// @entrypoint
/**
 * SearchBox renders a debounced search input with an optional suggestions
 * dropdown. It provides search icon, clear button, loading spinner, and
 * full keyboard navigation for suggestions. Suitable for embedding in
 * app shells, sidebars, and toolbars.
 *
 * @example
 * const sb = new SearchBox({
 *     placeholder: "Search items...",
 *     onSearch: (q) => console.log("Searching:", q),
 *     suggestions: ["Apple", "Banana", "Cherry"]
 * });
 * sb.show("search-container");
 */
export class SearchBox
{
    private readonly instanceId: string;
    private readonly options: Required<Pick<SearchBoxOptions,
        "placeholder" | "debounceMs" | "minChars" | "size" | "disabled"
    >> & SearchBoxOptions;

    // Debounced search callback
    private readonly debouncedSearch: (q: string) => void;

    // DOM references
    private rootEl: HTMLElement | null = null;
    private inputEl: HTMLInputElement | null = null;
    private clearBtn: HTMLElement | null = null;
    private spinnerEl: HTMLElement | null = null;
    private suggestionsEl: HTMLElement | null = null;
    private liveRegionEl: HTMLElement | null = null;

    // State
    private highlightedIndex = -1;
    private currentSuggestions: string[] = [];
    private suggestionsVisible = false;
    private isLoading = false;

    // Bound event handlers for cleanup
    private boundOnInput: ((e: Event) => void) | null = null;
    private boundOnKeydown: ((e: KeyboardEvent) => void) | null = null;
    private boundOnBlur: ((e: FocusEvent) => void) | null = null;
    private boundOnDocumentClick: ((e: MouseEvent) => void) | null = null;

    constructor(options: SearchBoxOptions)
    {
        instanceCounter += 1;
        this.instanceId = `searchbox-${instanceCounter}`;

        this.options = {
            placeholder: "Search...",
            debounceMs: DEFAULT_DEBOUNCE,
            minChars: DEFAULT_MIN_CHARS,
            size: "md",
            disabled: false,
            ...options,
        };

        this.debouncedSearch = debounce(
            (q: string) => this.executeSearch(q),
            this.options.debounceMs
        );

        this.buildDOM();

        if (this.options.disabled)
        {
            this.applyDisabledState(true);
        }

        console.log(`${LOG_PREFIX} Initialised:`, this.instanceId);
        console.debug(`${LOG_PREFIX} Options:`, this.options);
    }

    // ========================================================================
    // PUBLIC -- LIFECYCLE
    // ========================================================================

    /**
     * Appends the search box to the specified container and attaches
     * event listeners.
     *
     * @param containerId - The DOM element ID of the container
     */
    public show(containerId: string): void
    {
        if (!this.rootEl)
        {
            console.error(`${LOG_PREFIX} DOM not built; cannot show.`);
            return;
        }

        const container = document.getElementById(containerId);

        if (!container)
        {
            console.error(
                `${LOG_PREFIX} Container not found:`, containerId
            );
            return;
        }

        container.appendChild(this.rootEl);
        this.attachListeners();

        console.debug(`${LOG_PREFIX} Shown in:`, containerId);
    }

    /**
     * Removes the search box from the DOM without destroying state.
     */
    public hide(): void
    {
        this.detachListeners();
        this.hideSuggestions();
        this.rootEl?.remove();

        console.debug(`${LOG_PREFIX} Hidden:`, this.instanceId);
    }

    /**
     * Full cleanup: removes from DOM, detaches listeners, releases
     * all internal references.
     */
    public destroy(): void
    {
        this.hide();

        this.rootEl = null;
        this.inputEl = null;
        this.clearBtn = null;
        this.spinnerEl = null;
        this.suggestionsEl = null;
        this.liveRegionEl = null;
        this.boundOnInput = null;
        this.boundOnKeydown = null;
        this.boundOnBlur = null;
        this.boundOnDocumentClick = null;

        console.debug(`${LOG_PREFIX} Destroyed:`, this.instanceId);
    }

    // ========================================================================
    // PUBLIC -- ACCESSORS
    // ========================================================================

    /**
     * Returns the root DOM element.
     *
     * @returns The root element or null if destroyed
     */
    public getElement(): HTMLElement | null
    {
        return this.rootEl;
    }

    /**
     * Returns the current input value.
     *
     * @returns The search query string
     */
    public getValue(): string
    {
        return this.inputEl?.value ?? "";
    }

    /**
     * Sets the input value and triggers a search.
     *
     * @param value - The value to set
     */
    public setValue(value: string): void
    {
        if (!this.inputEl)
        {
            return;
        }

        this.inputEl.value = value;
        this.updateClearButton();
        this.debouncedSearch(value);
    }

    /**
     * Focuses the search input.
     */
    public focus(): void
    {
        this.inputEl?.focus();
    }

    /**
     * Clears the input value, hides the clear button, and fires
     * onSearch with an empty string.
     */
    public clearValue(): void
    {
        if (!this.inputEl)
        {
            return;
        }

        this.inputEl.value = "";
        this.updateClearButton();
        this.hideSuggestions();
        this.executeSearch("");
    }

    /**
     * Toggles the disabled state of the search box.
     *
     * @param disabled - Whether the search box should be disabled
     */
    public setDisabled(disabled: boolean): void
    {
        this.options.disabled = disabled;
        this.applyDisabledState(disabled);
    }

    // ========================================================================
    // PRIVATE -- KEY BINDING HELPERS
    // ========================================================================

    /**
     * Resolves the key combo string for the given action name.
     *
     * @param action - The action name to resolve
     * @returns The combo string
     */
    private resolveKeyCombo(action: string): string
    {
        return this.options.keyBindings?.[action]
            ?? DEFAULT_KEY_BINDINGS[action] ?? "";
    }

    /**
     * Tests whether a keyboard event matches the combo for an action.
     *
     * @param e - The keyboard event
     * @param action - The action name to test
     * @returns True if the event matches
     */
    private matchesKeyCombo(
        e: KeyboardEvent, action: string
    ): boolean
    {
        const combo = this.resolveKeyCombo(action);

        if (!combo)
        {
            return false;
        }

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
    // PRIVATE -- DOM CONSTRUCTION
    // ========================================================================

    /**
     * Builds the complete search box DOM tree.
     */
    private buildDOM(): void
    {
        this.rootEl = this.buildRoot();

        const inputWrap = this.buildInputWrap();
        this.rootEl.appendChild(inputWrap);

        this.suggestionsEl = this.buildSuggestionsPanel();
        this.rootEl.appendChild(this.suggestionsEl);

        this.liveRegionEl = this.buildLiveRegion();
        this.rootEl.appendChild(this.liveRegionEl);
    }

    /**
     * Builds the root container element with ARIA attributes and
     * size/custom CSS classes.
     *
     * @returns The root div element
     */
    private buildRoot(): HTMLElement
    {
        const sizeClass = `searchbox-${this.options.size}`;
        const classes = ["searchbox", sizeClass];

        if (this.options.cssClass)
        {
            classes.push(...this.options.cssClass.split(" "));
        }

        const root = createElement("div", classes);
        setAttr(root, "role", "search");

        return root;
    }

    /**
     * Builds the flex row container holding the icon, input,
     * spinner, and clear button.
     *
     * @returns The input wrapper element
     */
    private buildInputWrap(): HTMLElement
    {
        const wrap = createElement("div", ["searchbox-input-wrap"]);

        const icon = this.buildSearchIcon();
        wrap.appendChild(icon);

        this.inputEl = this.buildInput();
        wrap.appendChild(this.inputEl);

        this.spinnerEl = this.buildSpinner();
        wrap.appendChild(this.spinnerEl);

        this.clearBtn = this.buildClearButton();
        wrap.appendChild(this.clearBtn);

        return wrap;
    }

    /**
     * Builds the search icon element.
     *
     * @returns The icon element
     */
    private buildSearchIcon(): HTMLElement
    {
        const icon = createElement(
            "i", ["bi", "bi-search", "searchbox-icon"]
        );
        setAttr(icon, "aria-hidden", "true");

        return icon;
    }

    /**
     * Builds the text input element with ARIA attributes.
     *
     * @returns The input element
     */
    private buildInput(): HTMLInputElement
    {
        const input = document.createElement("input");
        input.classList.add("searchbox-input");

        setAttr(input, "type", "text");
        setAttr(input, "role", "searchbox");
        setAttr(input, "aria-label", "Search");
        setAttr(input, "aria-autocomplete", "list");
        setAttr(input, "aria-expanded", "false");
        setAttr(input, "aria-controls", `${this.instanceId}-listbox`);
        setAttr(input, "placeholder", this.options.placeholder);
        setAttr(input, "autocomplete", "off");

        return input;
    }

    /**
     * Builds the loading spinner element, hidden by default.
     *
     * @returns The spinner element
     */
    private buildSpinner(): HTMLElement
    {
        const spinner = createElement("span", ["searchbox-spinner"]);
        spinner.style.display = "none";

        return spinner;
    }

    /**
     * Builds the clear button element with an x-lg icon, hidden by
     * default.
     *
     * @returns The clear button element
     */
    private buildClearButton(): HTMLElement
    {
        const btn = createElement("button", ["searchbox-clear"]);
        setAttr(btn, "type", "button");
        setAttr(btn, "aria-label", "Clear search");
        btn.style.display = "none";

        const icon = createElement("i", ["bi", "bi-x-lg"]);
        setAttr(icon, "aria-hidden", "true");
        btn.appendChild(icon);

        return btn;
    }

    /**
     * Builds the suggestions dropdown panel, hidden by default.
     *
     * @returns The suggestions panel element
     */
    private buildSuggestionsPanel(): HTMLElement
    {
        const panel = createElement("div", ["searchbox-suggestions"]);
        setAttr(panel, "role", "listbox");
        setAttr(panel, "id", `${this.instanceId}-listbox`);
        panel.style.display = "none";

        return panel;
    }

    /**
     * Builds the ARIA live region for screen reader announcements.
     *
     * @returns The live region element
     */
    private buildLiveRegion(): HTMLElement
    {
        const region = createElement("div", ["searchbox-live"]);
        setAttr(region, "role", "status");
        setAttr(region, "aria-live", "polite");
        setAttr(region, "aria-atomic", "true");

        // Visually hidden but accessible to screen readers
        region.style.position = "absolute";
        region.style.width = "1px";
        region.style.height = "1px";
        region.style.overflow = "hidden";
        region.style.clip = "rect(0, 0, 0, 0)";

        return region;
    }

    // ========================================================================
    // PRIVATE -- EVENT LISTENERS
    // ========================================================================

    /**
     * Attaches all event listeners for input, keyboard, blur, clear
     * button, and outside click handling.
     */
    private attachListeners(): void
    {
        if (!this.inputEl || !this.clearBtn)
        {
            return;
        }

        this.boundOnInput = () => this.onInput();
        this.boundOnKeydown = (e: KeyboardEvent) => this.onKeydown(e);
        this.boundOnBlur = () => this.onBlur();
        this.boundOnDocumentClick = (e: MouseEvent) =>
        {
            this.onDocumentClick(e);
        };

        this.inputEl.addEventListener("input", this.boundOnInput);
        this.inputEl.addEventListener("keydown", this.boundOnKeydown);
        this.inputEl.addEventListener("blur", this.boundOnBlur);

        // <- Handles: clear button click
        this.clearBtn.addEventListener("click", () => this.onClearClick());

        document.addEventListener("click", this.boundOnDocumentClick);
    }

    /**
     * Detaches all event listeners registered by attachListeners.
     */
    private detachListeners(): void
    {
        if (this.inputEl && this.boundOnInput)
        {
            this.inputEl.removeEventListener("input", this.boundOnInput);
        }

        if (this.inputEl && this.boundOnKeydown)
        {
            this.inputEl.removeEventListener(
                "keydown", this.boundOnKeydown
            );
        }

        if (this.inputEl && this.boundOnBlur)
        {
            this.inputEl.removeEventListener("blur", this.boundOnBlur);
        }

        if (this.boundOnDocumentClick)
        {
            document.removeEventListener(
                "click", this.boundOnDocumentClick
            );
        }
    }

    // ========================================================================
    // PRIVATE -- EVENT HANDLERS
    // ========================================================================

    /**
     * Handles input events: updates the clear button visibility,
     * triggers the debounced search, and fetches suggestions.
     */
    private onInput(): void
    {
        const query = this.inputEl?.value ?? "";

        this.updateClearButton();
        this.debouncedSearch(query);

        if (query.length >= this.options.minChars && this.options.suggestions)
        {
            this.fetchSuggestions(query);
        }
        else
        {
            this.hideSuggestions();
        }
    }

    /**
     * Handles keydown events for Escape, Enter, ArrowDown, and
     * ArrowUp key bindings.
     *
     * @param e - The keyboard event
     */
    private onKeydown(e: KeyboardEvent): void
    {
        if (this.matchesKeyCombo(e, "clear"))
        {
            e.preventDefault();
            this.handleEscapeKey();
            return;
        }

        if (this.matchesKeyCombo(e, "submit"))
        {
            e.preventDefault();
            this.handleEnterKey();
            return;
        }

        if (this.matchesKeyCombo(e, "nextSuggestion"))
        {
            e.preventDefault();
            this.handleArrowDown();
            return;
        }

        if (this.matchesKeyCombo(e, "prevSuggestion"))
        {
            e.preventDefault();
            this.handleArrowUp();
        }
    }

    /**
     * Handles Escape: if suggestions are open, close them; otherwise
     * clear the input.
     */
    private handleEscapeKey(): void
    {
        if (this.suggestionsVisible)
        {
            this.hideSuggestions();
        }
        else
        {
            this.clearValue();
            this.inputEl?.focus();
        }
    }

    /**
     * Handles Enter: if a suggestion is highlighted, select it;
     * otherwise fire onSubmit.
     */
    private handleEnterKey(): void
    {
        if (this.suggestionsVisible && this.highlightedIndex >= 0)
        {
            this.selectSuggestion(this.highlightedIndex);
        }
        else if (this.options.onSubmit)
        {
            this.options.onSubmit(this.getValue());
        }
    }

    /**
     * Handles ArrowDown: opens suggestions if closed and input has
     * enough characters, or moves highlight down if open.
     */
    private handleArrowDown(): void
    {
        const query = this.getValue();

        if (!this.suggestionsVisible)
        {
            if (query.length >= this.options.minChars
                && this.options.suggestions)
            {
                this.fetchSuggestions(query);
            }
            return;
        }

        if (this.highlightedIndex < this.currentSuggestions.length - 1)
        {
            this.highlightSuggestion(this.highlightedIndex + 1);
        }
    }

    /**
     * Handles ArrowUp: moves highlight up in the suggestions list.
     */
    private handleArrowUp(): void
    {
        if (!this.suggestionsVisible)
        {
            return;
        }

        if (this.highlightedIndex > 0)
        {
            this.highlightSuggestion(this.highlightedIndex - 1);
        }
    }

    /**
     * Handles the clear button click: clears input and refocuses.
     */
    private onClearClick(): void
    {
        this.clearValue();
        this.inputEl?.focus();
    }

    /**
     * Handles blur events: closes suggestions after a short delay to
     * allow click events on suggestion items to fire first.
     */
    private onBlur(): void
    {
        window.setTimeout(() => this.hideSuggestions(), BLUR_CLOSE_DELAY);
    }

    /**
     * Handles clicks outside the search box: closes suggestions.
     *
     * @param e - The mouse event
     */
    private onDocumentClick(e: MouseEvent): void
    {
        if (!this.rootEl)
        {
            return;
        }

        const target = e.target as Node;

        if (!this.rootEl.contains(target))
        {
            this.hideSuggestions();
        }
    }

    // ========================================================================
    // PRIVATE -- SUGGESTIONS
    // ========================================================================

    /**
     * Fetches suggestions based on the query. Handles both static
     * arrays and async functions.
     *
     * @param query - The search query string
     */
    private fetchSuggestions(query: string): void
    {
        const source = this.options.suggestions;

        if (!source)
        {
            return;
        }

        if (Array.isArray(source))
        {
            const filtered = this.filterStaticSuggestions(source, query);
            this.renderSuggestions(filtered);
            this.showSuggestions();
            return;
        }

        // Async function source
        this.fetchAsyncSuggestions(source, query);
    }

    /**
     * Filters a static array of suggestions by case-insensitive
     * substring match.
     *
     * @param items - The full list of suggestions
     * @param query - The filter query
     * @returns Filtered suggestions
     */
    private filterStaticSuggestions(
        items: string[], query: string
    ): string[]
    {
        const lowerQuery = query.toLowerCase();

        return items.filter(
            (item) => item.toLowerCase().includes(lowerQuery)
        );
    }

    /**
     * Calls the async suggestions function, shows the spinner during
     * loading, and renders results when complete.
     *
     * @param fn - The async suggestions provider
     * @param query - The search query
     */
    private async fetchAsyncSuggestions(
        fn: (query: string) => Promise<string[]>,
        query: string
    ): Promise<void>
    {
        this.showSpinner();

        try
        {
            const results = await fn(query);
            this.renderSuggestions(results);
            this.showSuggestions();
        }
        catch (error)
        {
            console.error(
                `${LOG_PREFIX} Failed to fetch suggestions:`, error
            );
            this.hideSuggestions();
        }
        finally
        {
            this.hideSpinner();
        }
    }

    /**
     * Builds suggestion item elements in the dropdown panel.
     *
     * @param items - The suggestion strings to render
     */
    private renderSuggestions(items: string[]): void
    {
        if (!this.suggestionsEl)
        {
            return;
        }

        // Clear existing suggestions
        this.suggestionsEl.textContent = "";
        this.currentSuggestions = items;
        this.highlightedIndex = -1;

        for (let i = 0; i < items.length; i++)
        {
            const item = this.buildSuggestionItem(items[i], i);
            this.suggestionsEl.appendChild(item);
        }

        this.announceResults(items.length);
    }

    /**
     * Builds a single suggestion item element with ARIA attributes.
     *
     * @param text - The suggestion text
     * @param index - The suggestion index
     * @returns The suggestion element
     */
    private buildSuggestionItem(
        text: string, index: number
    ): HTMLElement
    {
        const item = createElement(
            "div", ["searchbox-suggestion"], text
        );
        setAttr(item, "role", "option");
        setAttr(item, "id", `${this.instanceId}-opt-${index}`);
        setAttr(item, "aria-selected", "false");

        // <- Handles: suggestion mousedown to select before blur fires
        item.addEventListener("mousedown", (e) =>
        {
            e.preventDefault();
            this.onSuggestionClick(index);
        });

        return item;
    }

    /**
     * Displays the suggestions dropdown.
     */
    private showSuggestions(): void
    {
        if (!this.suggestionsEl || this.currentSuggestions.length === 0)
        {
            this.hideSuggestions();
            return;
        }

        this.suggestionsEl.style.display = "";
        this.suggestionsVisible = true;

        if (this.inputEl)
        {
            setAttr(this.inputEl, "aria-expanded", "true");
        }
    }

    /**
     * Hides the suggestions dropdown and resets highlight state.
     */
    private hideSuggestions(): void
    {
        if (!this.suggestionsEl)
        {
            return;
        }

        this.suggestionsEl.style.display = "none";
        this.suggestionsVisible = false;
        this.highlightedIndex = -1;

        if (this.inputEl)
        {
            setAttr(this.inputEl, "aria-expanded", "false");
            this.inputEl.removeAttribute("aria-activedescendant");
        }
    }

    /**
     * Highlights a suggestion at the given index and updates ARIA
     * attributes for screen readers.
     *
     * @param index - The suggestion index to highlight
     */
    private highlightSuggestion(index: number): void
    {
        if (!this.suggestionsEl)
        {
            return;
        }

        const items = this.suggestionsEl.querySelectorAll(
            ".searchbox-suggestion"
        );

        this.clearSuggestionHighlights(items);

        this.highlightedIndex = index;
        const target = items[index] as HTMLElement | undefined;

        if (target)
        {
            this.applySuggestionHighlight(target, index);
        }
    }

    /**
     * Removes highlight from all suggestion items.
     *
     * @param items - The list of suggestion elements
     */
    private clearSuggestionHighlights(
        items: NodeListOf<Element>
    ): void
    {
        items.forEach((item) =>
        {
            item.classList.remove("searchbox-suggestion-highlighted");
            item.setAttribute("aria-selected", "false");
        });
    }

    /**
     * Applies highlight styling and ARIA attributes to a single
     * suggestion item.
     *
     * @param target - The suggestion element to highlight
     * @param index - The suggestion index
     */
    private applySuggestionHighlight(
        target: HTMLElement, index: number
    ): void
    {
        target.classList.add("searchbox-suggestion-highlighted");
        target.setAttribute("aria-selected", "true");
        target.scrollIntoView({ block: "nearest" });

        if (this.inputEl)
        {
            setAttr(
                this.inputEl, "aria-activedescendant",
                `${this.instanceId}-opt-${index}`
            );
        }
    }

    /**
     * Selects a suggestion at the given index: sets the input value,
     * hides suggestions, and fires the search callback.
     *
     * @param index - The suggestion index to select
     */
    private selectSuggestion(index: number): void
    {
        const value = this.currentSuggestions[index];

        if (value === undefined || !this.inputEl)
        {
            return;
        }

        this.inputEl.value = value;
        this.updateClearButton();
        this.hideSuggestions();
        this.executeSearch(value);
        this.inputEl.focus();

        console.debug(
            `${LOG_PREFIX} Suggestion selected:`, value
        );
    }

    /**
     * Handles a click on a suggestion item.
     *
     * @param index - The clicked suggestion index
     */
    private onSuggestionClick(index: number): void
    {
        this.selectSuggestion(index);
    }

    // ========================================================================
    // PRIVATE -- UI UPDATES
    // ========================================================================

    /**
     * Shows or hides the clear button based on whether the input has
     * a value.
     */
    private updateClearButton(): void
    {
        if (!this.clearBtn)
        {
            return;
        }

        const hasValue = (this.inputEl?.value ?? "").length > 0;
        this.clearBtn.style.display = hasValue ? "" : "none";
    }

    /**
     * Applies or removes the disabled state from the search box.
     *
     * @param disabled - Whether to disable the search box
     */
    private applyDisabledState(disabled: boolean): void
    {
        if (!this.rootEl || !this.inputEl)
        {
            return;
        }

        if (disabled)
        {
            this.rootEl.classList.add("searchbox-disabled");
            this.inputEl.disabled = true;
        }
        else
        {
            this.rootEl.classList.remove("searchbox-disabled");
            this.inputEl.disabled = false;
        }
    }

    /**
     * Shows the loading spinner.
     */
    private showSpinner(): void
    {
        if (this.spinnerEl)
        {
            this.spinnerEl.style.display = "";
            this.isLoading = true;
        }
    }

    /**
     * Hides the loading spinner.
     */
    private hideSpinner(): void
    {
        if (this.spinnerEl)
        {
            this.spinnerEl.style.display = "none";
            this.isLoading = false;
        }
    }

    /**
     * Announces the number of suggestion results to screen readers
     * via the ARIA live region.
     *
     * @param count - The number of results
     */
    private announceResults(count: number): void
    {
        if (!this.liveRegionEl)
        {
            return;
        }

        if (count === 0)
        {
            this.liveRegionEl.textContent = "No suggestions available.";
        }
        else if (count === 1)
        {
            this.liveRegionEl.textContent = "1 suggestion available.";
        }
        else
        {
            this.liveRegionEl.textContent =
                `${count} suggestions available.`;
        }
    }

    /**
     * Executes the search callback with the current query.
     *
     * @param query - The search query string
     */
    private executeSearch(query: string): void
    {
        if (this.options.onSearch)
        {
            this.options.onSearch(query);
        }
    }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Creates a SearchBox and shows it in the specified container in a
 * single call.
 *
 * @param containerId - The DOM element ID of the container
 * @param options - SearchBox configuration
 * @returns The created SearchBox instance
 */
export function createSearchBox(
    containerId: string, options: SearchBoxOptions
): SearchBox
{
    const searchBox = new SearchBox(options);
    searchBox.show(containerId);
    return searchBox;
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

if (typeof window !== "undefined")
{
    (window as unknown as Record<string, unknown>)["SearchBox"] = SearchBox;
    (window as unknown as Record<string, unknown>)["createSearchBox"] = createSearchBox;
}
