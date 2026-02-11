/*
 * ----------------------------------------------------------------------------
 * COMPONENT: TimezonePicker
 * PURPOSE: A searchable dropdown selector for IANA timezones with grouped
 *    regions, UTC offset display, and live current-time preview.
 * RELATES: [[EnterpriseTheme]], [[CustomComponents]], [[TimePicker]]
 * FLOW: [Consumer App] -> [createTimezonePicker()] -> [DOM input + dropdown]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Configuration options for the TimezonePicker component.
 */
export interface TimezonePickerOptions
{
    /** Initial timezone (IANA string). Default: "UTC". Use "local" for browser timezone. */
    timezone?: string;

    /** Show live time preview in the dropdown footer. Default: true. */
    showTimePreview?: boolean;

    /** Show format hint below input. Default: true. */
    showFormatHint?: boolean;

    /** Show format help icon and tooltip. Default: true. */
    showFormatHelp?: boolean;

    /** Custom help tooltip text. */
    formatHelpText?: string;

    /** When true, the component is disabled. Default: false. */
    disabled?: boolean;

    /** When true, input is not editable but dropdown works. Default: false. */
    readonly?: boolean;

    /** Size variant. Default: "default". */
    size?: "sm" | "default" | "lg";

    /** Placeholder text. Default: "Select a timezone...". */
    placeholder?: string;

    /** Fired when the user selects a timezone from the dropdown. */
    onSelect?: (timezone: string) => void;

    /** Fired when the timezone value changes (select or programmatic). */
    onChange?: (timezone: string) => void;

    /** Fired when the dropdown opens. */
    onOpen?: () => void;

    /** Fired when the dropdown closes. */
    onClose?: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[TimezonePicker]";

const COMMON_TIMEZONES = [
    "UTC",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "Europe/London",
    "Europe/Paris",
    "Asia/Tokyo",
];

const TIMEZONE_REGIONS: Record<string, string> = {
    "UTC": "Common",
    "America": "Americas",
    "US": "Americas",
    "Canada": "Americas",
    "Europe": "Europe",
    "Asia": "Asia",
    "Africa": "Africa",
    "Pacific": "Pacific",
    "Australia": "Pacific",
    "Atlantic": "Atlantic",
    "Indian": "Indian",
    "Antarctica": "Antarctica",
    "Arctic": "Arctic",
};

let instanceCounter = 0;

// ============================================================================
// PRIVATE HELPERS -- DOM
// ============================================================================

/**
 * Creates an HTML element with the given tag, CSS classes, and optional text.
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
 */
function setAttr(el: HTMLElement, name: string, value: string): void
{
    el.setAttribute(name, value);
}

// ============================================================================
// PRIVATE HELPERS -- TIMEZONE UTILITIES
// ============================================================================

/**
 * Retrieves all IANA timezone identifiers from the browser.
 * Falls back to a common list if the API is not available.
 */
function getIANATimezones(): string[]
{
    try
    {
        return (Intl as any).supportedValuesOf("timeZone") as string[];
    }
    catch
    {
        console.warn(
            `${LOG_PREFIX} Intl.supportedValuesOf not available; using common timezones`
        );
        return [...COMMON_TIMEZONES];
    }
}

/**
 * Returns the short UTC offset string for a timezone (e.g., "GMT-5").
 */
function getTimezoneOffset(tz: string): string
{
    try
    {
        const formatter = new Intl.DateTimeFormat("en-US", {
            timeZone: tz,
            timeZoneName: "shortOffset",
        });
        const parts = formatter.formatToParts(new Date());
        const tzPart = parts.find(p => p.type === "timeZoneName");
        return tzPart?.value ?? "";
    }
    catch
    {
        return "";
    }
}

/**
 * Tests whether a timezone string is valid by attempting to construct
 * an Intl.DateTimeFormat with it.
 */
function isValidTimezone(tz: string): boolean
{
    try
    {
        Intl.DateTimeFormat(undefined, { timeZone: tz });
        return true;
    }
    catch
    {
        return false;
    }
}

/**
 * Maps a timezone identifier to its geographic region group name.
 */
function getTimezoneRegion(tz: string): string
{
    if (tz === "UTC")
    {
        return "Common";
    }
    const prefix = tz.split("/")[0];
    return TIMEZONE_REGIONS[prefix] ?? "Other";
}

/**
 * Resolves a timezone string, handling the special "local" keyword
 * and falling back to UTC for invalid values.
 */
function resolveTimezone(tz: string): string
{
    if (tz === "local")
    {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
    if (isValidTimezone(tz))
    {
        return tz;
    }
    console.warn(
        `${LOG_PREFIX} Invalid timezone "${tz}"; falling back to UTC`
    );
    return "UTC";
}

/**
 * Formats the current time in a given timezone as HH:MM:SS.
 */
function formatCurrentTime(tz: string): string
{
    try
    {
        const formatter = new Intl.DateTimeFormat("en-GB", {
            timeZone: tz,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
        });
        return formatter.format(new Date());
    }
    catch
    {
        return "--:--:--";
    }
}

// ============================================================================
// PUBLIC API
// ============================================================================

// @entrypoint
/**
 * TimezonePicker renders a searchable timezone dropdown with grouped regions,
 * UTC offset display, and optional live time preview.
 *
 * @example
 * const picker = new TimezonePicker("tz-container");
 * picker.getValue(); // "UTC"
 */
export class TimezonePicker
{
    private readonly containerId: string;
    private readonly instanceId: string;
    private options: Required<Pick<TimezonePickerOptions,
        "showTimePreview" | "showFormatHint" | "showFormatHelp"
        | "disabled" | "readonly" | "size"
    >> & TimezonePickerOptions;

    // State
    private timezone: string = "UTC";
    private isOpen = false;
    private highlightedIndex = -1;

    // DOM references
    private wrapperEl: HTMLElement | null = null;
    private inputEl: HTMLInputElement | null = null;
    private dropdownEl: HTMLElement | null = null;
    private searchEl: HTMLInputElement | null = null;
    private listEl: HTMLElement | null = null;
    private optionEls: HTMLElement[] = [];
    private hintEl: HTMLElement | null = null;
    private helpTooltipEl: HTMLElement | null = null;
    private timePreviewEl: HTMLElement | null = null;

    // Cached timezone data
    private allTimezones: string[] = [];
    private timezoneOffsets: Map<string, string> = new Map();

    // Live time preview timer
    private previewTimer: ReturnType<typeof setInterval> | null = null;

    // Bound event handlers for cleanup
    private readonly boundOnDocumentClick: (e: MouseEvent) => void;
    private readonly boundOnInputKeydown: (e: KeyboardEvent) => void;

    constructor(containerId: string, options?: TimezonePickerOptions)
    {
        instanceCounter++;
        this.instanceId = `timezonepicker-${instanceCounter}`;
        this.containerId = containerId;

        this.options = {
            showTimePreview: options?.showTimePreview ?? true,
            showFormatHint: options?.showFormatHint ?? true,
            showFormatHelp: options?.showFormatHelp ?? true,
            disabled: options?.disabled ?? false,
            readonly: options?.readonly ?? false,
            size: options?.size ?? "default",
            ...options,
        };

        // Resolve initial timezone
        this.timezone = resolveTimezone(this.options.timezone ?? "UTC");

        // Cache timezone data
        this.cacheTimezoneData();

        // Bind handlers
        this.boundOnDocumentClick = (e) => this.onDocumentClick(e);
        this.boundOnInputKeydown = (e) => this.onInputKeydown(e);

        this.render();
        console.log(`${LOG_PREFIX} Initialised:`, this.instanceId);
    }

    // ========================================================================
    // PUBLIC METHODS
    // ========================================================================

    /**
     * Returns the currently selected IANA timezone string.
     */
    public getValue(): string
    {
        return this.timezone;
    }

    /**
     * Sets the timezone programmatically.
     */
    public setValue(tz: string): void
    {
        const resolved = resolveTimezone(tz);
        this.timezone = resolved;
        this.updateInput();
        this.updateHint();
        this.options.onChange?.(resolved);
        console.debug(`${LOG_PREFIX} setValue:`, resolved);
    }

    /**
     * Returns the current UTC offset string (e.g., "GMT-5").
     */
    public getOffset(): string
    {
        return this.timezoneOffsets.get(this.timezone) ?? getTimezoneOffset(this.timezone);
    }

    /**
     * Opens the dropdown programmatically.
     */
    public open(): void
    {
        if (this.options.disabled || this.isOpen)
        {
            return;
        }
        this.showDropdown();
    }

    /**
     * Closes the dropdown programmatically.
     */
    public close(): void
    {
        if (this.isOpen)
        {
            this.hideDropdown();
        }
    }

    /**
     * Enables the component.
     */
    public enable(): void
    {
        this.options.disabled = false;
        if (this.inputEl)
        {
            this.inputEl.disabled = false;
        }
        this.wrapperEl?.classList.remove("timezonepicker-disabled");
    }

    /**
     * Disables the component and closes any open dropdown.
     */
    public disable(): void
    {
        this.options.disabled = true;
        if (this.inputEl)
        {
            this.inputEl.disabled = true;
        }
        this.wrapperEl?.classList.add("timezonepicker-disabled");
        if (this.isOpen)
        {
            this.hideDropdown();
        }
    }

    /**
     * Removes the component from the DOM and cleans up listeners and timers.
     */
    public destroy(): void
    {
        document.removeEventListener("click", this.boundOnDocumentClick);
        this.stopPreviewTimer();
        if (this.wrapperEl)
        {
            this.wrapperEl.remove();
            this.wrapperEl = null;
        }
        console.debug(`${LOG_PREFIX} Destroyed:`, this.instanceId);
    }

    // ========================================================================
    // PRIVATE -- INITIALISATION
    // ========================================================================

    /**
     * Fetches all IANA timezones and caches their UTC offsets.
     */
    private cacheTimezoneData(): void
    {
        this.allTimezones = getIANATimezones();
        for (const tz of this.allTimezones)
        {
            this.timezoneOffsets.set(tz, getTimezoneOffset(tz));
        }
    }

    // ========================================================================
    // PRIVATE -- RENDERING
    // ========================================================================

    /**
     * Renders the full component into the target container.
     */
    private render(): void
    {
        const container = document.getElementById(this.containerId);
        if (!container)
        {
            console.error(
                `${LOG_PREFIX} Container not found:`, this.containerId
            );
            return;
        }

        this.wrapperEl = createElement("div", ["timezonepicker"]);
        setAttr(this.wrapperEl, "id", this.instanceId);

        if (this.options.size === "sm")
        {
            this.wrapperEl.classList.add("timezonepicker-sm");
        }
        else if (this.options.size === "lg")
        {
            this.wrapperEl.classList.add("timezonepicker-lg");
        }
        if (this.options.disabled)
        {
            this.wrapperEl.classList.add("timezonepicker-disabled");
        }

        // Input group
        const inputGroup = this.buildInputGroup();
        this.wrapperEl.appendChild(inputGroup);

        // Format hint
        if (this.options.showFormatHint)
        {
            this.hintEl = this.buildFormatHint();
            this.wrapperEl.appendChild(this.hintEl);
        }

        // Dropdown (hidden)
        this.dropdownEl = this.buildDropdown();
        this.wrapperEl.appendChild(this.dropdownEl);

        container.appendChild(this.wrapperEl);
        document.addEventListener("click", this.boundOnDocumentClick);
    }

    // ========================================================================
    // PRIVATE -- INPUT GROUP
    // ========================================================================

    /**
     * Builds the input group containing the text input and toggle button.
     */
    private buildInputGroup(): HTMLElement
    {
        const group = createElement("div", ["input-group"]);

        this.inputEl = document.createElement("input");
        this.inputEl.type = "text";
        this.inputEl.className = "form-control timezonepicker-input";
        this.inputEl.readOnly = true;
        setAttr(this.inputEl, "role", "combobox");
        setAttr(this.inputEl, "autocomplete", "off");
        setAttr(this.inputEl, "aria-haspopup", "listbox");
        setAttr(this.inputEl, "aria-expanded", "false");
        setAttr(
            this.inputEl,
            "aria-controls", `${this.instanceId}-listbox`
        );

        if (this.options.showFormatHint)
        {
            setAttr(
                this.inputEl,
                "aria-describedby",
                `${this.instanceId}-format-hint`
            );
        }

        const placeholder = this.options.placeholder ?? "Select a timezone...";
        setAttr(this.inputEl, "placeholder", placeholder);

        if (this.options.disabled)
        {
            this.inputEl.disabled = true;
        }

        this.updateInput();

        this.inputEl.addEventListener(
            "keydown", this.boundOnInputKeydown
        );
        this.inputEl.addEventListener("click", () =>
        {
            if (!this.options.disabled)
            {
                this.toggleDropdown();
            }
        });

        group.appendChild(this.inputEl);

        // Chevron toggle button
        const toggleBtn = createElement(
            "button",
            ["btn", "btn-outline-secondary", "timezonepicker-toggle"]
        );
        setAttr(toggleBtn, "type", "button");
        setAttr(toggleBtn, "tabindex", "-1");
        setAttr(toggleBtn, "aria-label", "Open timezone selector");

        const icon = createElement("i", ["bi", "bi-chevron-down"]);
        toggleBtn.appendChild(icon);
        toggleBtn.addEventListener("mousedown", (e) =>
        {
            e.preventDefault();
            if (!this.options.disabled)
            {
                this.toggleDropdown();
            }
        });

        group.appendChild(toggleBtn);
        return group;
    }

    // ========================================================================
    // PRIVATE -- FORMAT HINT
    // ========================================================================

    /**
     * Builds the format hint row below the input showing the IANA identifier.
     */
    private buildFormatHint(): HTMLElement
    {
        const hint = createElement("div", ["timezonepicker-hint"]);
        setAttr(hint, "id", `${this.instanceId}-format-hint`);

        const span = createElement(
            "span",
            ["timezonepicker-hint-text", "text-muted", "small"],
            this.timezone
        );
        hint.appendChild(span);

        if (this.options.showFormatHelp)
        {
            this.buildFormatHelpIntoHint(hint);
        }

        return hint;
    }

    /**
     * Adds the help icon and tooltip to the format hint row.
     */
    private buildFormatHelpIntoHint(hint: HTMLElement): void
    {
        const helpBtn = createElement(
            "button", ["timezonepicker-help-icon"]
        );
        setAttr(helpBtn, "type", "button");
        setAttr(helpBtn, "aria-label", "Timezone format help");
        const helpIcon = createElement(
            "i", ["bi", "bi-question-circle"]
        );
        helpBtn.appendChild(helpIcon);
        hint.appendChild(helpBtn);

        const tooltip = createElement(
            "div", ["timezonepicker-help-tooltip"]
        );
        setAttr(tooltip, "role", "tooltip");
        const helpText = this.options.formatHelpText
            ?? "Select an IANA timezone identifier (e.g., America/New_York). "
            + "The offset shown is the current UTC offset for that zone.";
        tooltip.textContent = helpText;
        hint.appendChild(tooltip);
        this.helpTooltipEl = tooltip;

        helpBtn.addEventListener("click", (e) =>
        {
            e.stopPropagation();
            this.toggleHelpTooltip();
        });
        helpBtn.addEventListener("mouseenter", () =>
        {
            this.showHelpTooltip();
        });
        helpBtn.addEventListener("mouseleave", () =>
        {
            this.hideHelpTooltip();
        });
    }

    // ========================================================================
    // PRIVATE -- DROPDOWN
    // ========================================================================

    /**
     * Builds the dropdown panel containing search, timezone list, and time preview.
     */
    private buildDropdown(): HTMLElement
    {
        const dropdown = createElement("div", ["timezonepicker-dropdown"]);
        setAttr(dropdown, "id", `${this.instanceId}-listbox`);
        setAttr(dropdown, "role", "listbox");
        setAttr(dropdown, "aria-label", "Timezones");
        dropdown.style.display = "none";

        // Search input
        const searchWrapper = createElement("div", ["timezonepicker-search"]);
        this.searchEl = document.createElement("input");
        this.searchEl.type = "text";
        this.searchEl.className = "form-control form-control-sm";
        setAttr(this.searchEl, "placeholder", "Search timezones...");
        setAttr(this.searchEl, "aria-label", "Search timezones");
        this.searchEl.addEventListener("input", () =>
        {
            this.filterTimezones();
        });
        this.searchEl.addEventListener("keydown", (e) =>
        {
            this.onSearchKeydown(e);
        });
        searchWrapper.appendChild(this.searchEl);
        dropdown.appendChild(searchWrapper);

        // Timezone list
        this.listEl = createElement("div", ["timezonepicker-list"]);
        this.renderTimezoneList();
        dropdown.appendChild(this.listEl);

        // Time preview footer (optional)
        if (this.options.showTimePreview)
        {
            this.timePreviewEl = createElement(
                "div", ["timezonepicker-time-preview"]
            );
            this.updateTimePreview();
            dropdown.appendChild(this.timePreviewEl);
        }

        return dropdown;
    }

    // ========================================================================
    // PRIVATE -- TIMEZONE LIST
    // ========================================================================

    /**
     * Populates the timezone list with grouped options.
     * Common timezones appear first, followed by all others grouped by region.
     */
    private renderTimezoneList(): void
    {
        if (!this.listEl)
        {
            return;
        }
        while (this.listEl.firstChild)
        {
            this.listEl.removeChild(this.listEl.firstChild);
        }
        this.optionEls = [];

        // Common group first
        this.listEl.appendChild(
            this.buildGroupHeader("Common")
        );
        for (const tz of COMMON_TIMEZONES)
        {
            const option = this.buildTzOption(tz);
            this.listEl.appendChild(option);
            this.optionEls.push(option);
        }

        // Remaining timezones grouped by region
        const grouped = this.groupTimezonesByRegion();
        for (const [region, tzList] of grouped)
        {
            if (region === "Common")
            {
                continue;
            }
            this.listEl.appendChild(
                this.buildGroupHeader(region)
            );
            for (const tz of tzList)
            {
                if (COMMON_TIMEZONES.includes(tz))
                {
                    continue;
                }
                const option = this.buildTzOption(tz);
                this.listEl.appendChild(option);
                this.optionEls.push(option);
            }
        }
    }

    /**
     * Creates a group header element for a timezone region.
     */
    private buildGroupHeader(label: string): HTMLElement
    {
        const header = createElement(
            "div", ["timezonepicker-group-header"], label
        );
        setAttr(header, "aria-hidden", "true");
        return header;
    }

    /**
     * Creates an individual timezone option element.
     */
    private buildTzOption(tz: string): HTMLElement
    {
        const offset = this.timezoneOffsets.get(tz) ?? "";
        const display = offset ? `${tz} (${offset})` : tz;
        const option = createElement(
            "div", ["timezonepicker-option"], display
        );
        setAttr(option, "role", "option");
        setAttr(option, "data-tz", tz);

        if (tz === this.timezone)
        {
            option.classList.add("timezonepicker-option-selected");
            setAttr(option, "aria-selected", "true");
        }
        else
        {
            setAttr(option, "aria-selected", "false");
        }

        option.addEventListener("mousedown", (e) =>
        {
            e.preventDefault();
            this.selectTimezone(tz);
        });

        return option;
    }

    /**
     * Groups all cached timezones by geographic region.
     */
    private groupTimezonesByRegion(): Map<string, string[]>
    {
        const grouped = new Map<string, string[]>();
        for (const tz of this.allTimezones)
        {
            const region = getTimezoneRegion(tz);
            if (!grouped.has(region))
            {
                grouped.set(region, []);
            }
            grouped.get(region)!.push(tz);
        }
        return grouped;
    }

    // ========================================================================
    // PRIVATE -- FILTERING
    // ========================================================================

    /**
     * Filters the timezone list based on the search input value.
     * Hides group headers when no options are visible.
     */
    private filterTimezones(): void
    {
        const query = this.searchEl?.value.toLowerCase() ?? "";
        let anyVisible = false;

        for (const optionEl of this.optionEls)
        {
            const tz = optionEl.getAttribute("data-tz") ?? "";
            const offset = this.timezoneOffsets.get(tz) ?? "";
            const searchText = `${tz} ${offset}`.toLowerCase();
            const isMatch = searchText.includes(query);
            (optionEl as HTMLElement).style.display = isMatch ? "" : "none";
            if (isMatch)
            {
                anyVisible = true;
            }
        }

        // Show/hide group headers based on visibility
        if (this.listEl)
        {
            const headers = this.listEl.querySelectorAll(
                ".timezonepicker-group-header"
            );
            headers.forEach((header) =>
            {
                (header as HTMLElement).style.display = anyVisible ? "" : "none";
            });
        }

        this.highlightedIndex = -1;
    }

    // ========================================================================
    // PRIVATE -- SELECTION
    // ========================================================================

    /**
     * Selects a timezone, updates the display, and fires callbacks.
     */
    private selectTimezone(tz: string): void
    {
        this.timezone = tz;
        this.updateInput();
        this.updateHint();
        this.hideDropdown();
        this.options.onSelect?.(tz);
        this.options.onChange?.(tz);
        console.debug(`${LOG_PREFIX} Timezone selected:`, tz);
    }

    // ========================================================================
    // PRIVATE -- DROPDOWN OPEN / CLOSE
    // ========================================================================

    /**
     * Toggles the dropdown open or closed.
     */
    private toggleDropdown(): void
    {
        if (this.isOpen)
        {
            this.hideDropdown();
        }
        else
        {
            this.showDropdown();
        }
    }

    /**
     * Opens the dropdown, resets the search, positions it, and starts
     * the time preview timer.
     */
    private showDropdown(): void
    {
        if (!this.dropdownEl || this.isOpen)
        {
            return;
        }

        // Close other open timezonepicker dropdowns
        document.querySelectorAll(
            ".timezonepicker-dropdown[style*='display: block']"
        ).forEach((el) =>
        {
            (el as HTMLElement).style.display = "none";
        });

        this.isOpen = true;
        this.highlightedIndex = -1;

        // Reset search and re-render list to reflect current selection
        if (this.searchEl)
        {
            this.searchEl.value = "";
        }
        this.renderTimezoneList();
        this.dropdownEl.style.display = "block";
        setAttr(this.inputEl!, "aria-expanded", "true");

        this.positionDropdown();
        this.startPreviewTimer();

        // Scroll selected option into view
        this.scrollSelectedIntoView();

        requestAnimationFrame(() =>
        {
            this.searchEl?.focus();
        });

        this.options.onOpen?.();
        console.debug(`${LOG_PREFIX} Dropdown opened`);
    }

    /**
     * Closes the dropdown and stops the time preview timer.
     */
    private hideDropdown(): void
    {
        if (!this.isOpen || !this.dropdownEl)
        {
            return;
        }
        this.isOpen = false;
        this.dropdownEl.style.display = "none";
        this.dropdownEl.classList.remove("timezonepicker-dropdown-above");
        setAttr(this.inputEl!, "aria-expanded", "false");
        this.stopPreviewTimer();
        this.options.onClose?.();
        console.debug(`${LOG_PREFIX} Dropdown closed`);
    }

    /**
     * Positions the dropdown above or below the input based on available space.
     */
    private positionDropdown(): void
    {
        if (!this.dropdownEl || !this.wrapperEl)
        {
            return;
        }
        const rect = this.wrapperEl.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const dropHeight = this.dropdownEl.offsetHeight || 300;

        if (spaceBelow < dropHeight && rect.top > dropHeight)
        {
            this.dropdownEl.classList.add("timezonepicker-dropdown-above");
        }
        else
        {
            this.dropdownEl.classList.remove("timezonepicker-dropdown-above");
        }
    }

    /**
     * Scrolls the currently selected timezone option into view.
     */
    private scrollSelectedIntoView(): void
    {
        const selectedEl = this.optionEls.find(
            (el) => el.classList.contains("timezonepicker-option-selected")
        );
        if (selectedEl)
        {
            selectedEl.scrollIntoView({ block: "nearest" });
        }
    }

    // ========================================================================
    // PRIVATE -- TIME PREVIEW
    // ========================================================================

    /**
     * Starts the live time preview interval timer.
     */
    private startPreviewTimer(): void
    {
        if (!this.options.showTimePreview || !this.timePreviewEl)
        {
            return;
        }
        this.updateTimePreview();
        this.previewTimer = setInterval(() =>
        {
            this.updateTimePreview();
        }, 1000);
    }

    /**
     * Stops the live time preview interval timer.
     */
    private stopPreviewTimer(): void
    {
        if (this.previewTimer)
        {
            clearInterval(this.previewTimer);
            this.previewTimer = null;
        }
    }

    /**
     * Updates the time preview element with the current time in the
     * selected timezone.
     */
    private updateTimePreview(): void
    {
        if (!this.timePreviewEl)
        {
            return;
        }
        const timeStr = formatCurrentTime(this.timezone);
        this.timePreviewEl.textContent = `Current time: ${timeStr}`;
    }

    // ========================================================================
    // PRIVATE -- INPUT DISPLAY
    // ========================================================================

    /**
     * Updates the input field to show the selected timezone and offset.
     */
    private updateInput(): void
    {
        if (!this.inputEl)
        {
            return;
        }
        const offset = this.timezoneOffsets.get(this.timezone)
            ?? getTimezoneOffset(this.timezone);
        this.inputEl.value = offset
            ? `${this.timezone} (${offset})`
            : this.timezone;
    }

    /**
     * Updates the format hint text to show the current IANA identifier.
     */
    private updateHint(): void
    {
        if (!this.hintEl)
        {
            return;
        }
        const span = this.hintEl.querySelector(".timezonepicker-hint-text");
        if (span)
        {
            span.textContent = this.timezone;
        }
    }

    // ========================================================================
    // PRIVATE -- HELP TOOLTIP
    // ========================================================================

    private toggleHelpTooltip(): void
    {
        if (!this.helpTooltipEl)
        {
            return;
        }
        const visible = this.helpTooltipEl.classList.contains(
            "timezonepicker-help-tooltip-visible"
        );
        if (visible)
        {
            this.hideHelpTooltip();
        }
        else
        {
            this.showHelpTooltip();
        }
    }

    private showHelpTooltip(): void
    {
        this.helpTooltipEl?.classList.add(
            "timezonepicker-help-tooltip-visible"
        );
    }

    private hideHelpTooltip(): void
    {
        this.helpTooltipEl?.classList.remove(
            "timezonepicker-help-tooltip-visible"
        );
    }

    // ========================================================================
    // PRIVATE -- KEYBOARD NAVIGATION
    // ========================================================================

    /**
     * Moves the keyboard highlight up or down through visible options.
     */
    private moveHighlight(direction: number): void
    {
        const visibleOptions = this.getVisibleOptions();
        if (visibleOptions.length === 0)
        {
            return;
        }

        // Clear previous highlight
        if (this.highlightedIndex >= 0 && this.highlightedIndex < this.optionEls.length)
        {
            this.optionEls[this.highlightedIndex]?.classList.remove(
                "timezonepicker-option-highlighted"
            );
        }

        // Find next visible index
        let currentVisibleIdx = -1;
        if (this.highlightedIndex >= 0)
        {
            currentVisibleIdx = visibleOptions.indexOf(
                this.optionEls[this.highlightedIndex]
            );
        }
        let newVisibleIdx = currentVisibleIdx + direction;
        if (newVisibleIdx < 0)
        {
            newVisibleIdx = visibleOptions.length - 1;
        }
        if (newVisibleIdx >= visibleOptions.length)
        {
            newVisibleIdx = 0;
        }

        const newEl = visibleOptions[newVisibleIdx];
        newEl.classList.add("timezonepicker-option-highlighted");
        newEl.scrollIntoView({ block: "nearest" });
        this.highlightedIndex = this.optionEls.indexOf(newEl);
    }

    /**
     * Returns only the currently visible (non-hidden) option elements.
     */
    private getVisibleOptions(): HTMLElement[]
    {
        return this.optionEls.filter(
            (el) => el.style.display !== "none"
        );
    }

    /**
     * Selects the currently highlighted timezone option.
     */
    private selectHighlighted(): void
    {
        if (this.highlightedIndex < 0 || this.highlightedIndex >= this.optionEls.length)
        {
            return;
        }
        const el = this.optionEls[this.highlightedIndex];
        const tz = el.getAttribute("data-tz");
        if (tz)
        {
            this.selectTimezone(tz);
        }
    }

    // ========================================================================
    // PRIVATE -- EVENT HANDLERS
    // ========================================================================

    /**
     * Closes the dropdown when clicking outside the component.
     */
    private onDocumentClick(e: MouseEvent): void
    {
        if (!this.wrapperEl)
        {
            return;
        }
        if (!this.wrapperEl.contains(e.target as Node))
        {
            if (this.isOpen)
            {
                this.hideDropdown();
            }
        }
    }

    /**
     * Handles keyboard events on the main input field.
     */
    private onInputKeydown(e: KeyboardEvent): void
    {
        if (this.options.disabled)
        {
            return;
        }

        switch (e.key)
        {
            case "ArrowDown":
            case "Down":
                e.preventDefault();
                if (!this.isOpen)
                {
                    this.showDropdown();
                }
                else
                {
                    this.moveHighlight(1);
                }
                break;
            case "ArrowUp":
                e.preventDefault();
                this.moveHighlight(-1);
                break;
            case "Enter":
                e.preventDefault();
                if (this.isOpen && this.highlightedIndex >= 0)
                {
                    this.selectHighlighted();
                }
                break;
            case "Escape":
                e.preventDefault();
                this.hideDropdown();
                break;
        }
    }

    /**
     * Handles keyboard events in the dropdown search field.
     */
    private onSearchKeydown(e: KeyboardEvent): void
    {
        switch (e.key)
        {
            case "ArrowDown":
                e.preventDefault();
                this.moveHighlight(1);
                break;
            case "ArrowUp":
                e.preventDefault();
                this.moveHighlight(-1);
                break;
            case "Enter":
                e.preventDefault();
                this.selectHighlighted();
                break;
            case "Escape":
                e.preventDefault();
                this.hideDropdown();
                this.inputEl?.focus();
                break;
        }
    }
}

// ============================================================================
// CONVENIENCE FUNCTION
// ============================================================================

/**
 * Creates a TimezonePicker in a single call.
 */
export function createTimezonePicker(
    containerId: string,
    options?: TimezonePickerOptions
): TimezonePicker
{
    return new TimezonePicker(containerId, options);
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

if (typeof window !== "undefined")
{
    (window as any)["TimezonePicker"] = TimezonePicker;
    (window as any)["createTimezonePicker"] = createTimezonePicker;
}
