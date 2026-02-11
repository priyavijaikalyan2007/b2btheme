/*
 * ----------------------------------------------------------------------------
 * COMPONENT: DurationPicker
 * PURPOSE: A spinner-based duration input supporting configurable unit
 *    patterns, ISO 8601 parsing/output, shorthand input, and carry mode.
 * RELATES: [[EnterpriseTheme]], [[CustomComponents]]
 * FLOW: [Consumer App] -> [createDurationPicker()] -> [DOM input + spinner dropdown]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

/**
 * Unit identifiers for duration patterns.
 */
export type DurationUnit = "y" | "q" | "mo" | "fn" | "w" | "d" | "h" | "m" | "s";

/**
 * A duration pattern is a hyphen-separated string of unit identifiers.
 * Examples: "d-h-m", "h-m-s", "y-mo", "w", "m-s"
 */
export type DurationPattern = string;

/**
 * Represents a duration value as a map of unit to numeric value.
 * Only units present in the configured pattern will have entries.
 */
export interface DurationValue
{
    /** Years. */
    y?: number;
    /** Quarters. */
    q?: number;
    /** Months. */
    mo?: number;
    /** Fortnights. */
    fn?: number;
    /** Weeks. */
    w?: number;
    /** Days. */
    d?: number;
    /** Hours. */
    h?: number;
    /** Minutes. */
    m?: number;
    /** Seconds. */
    s?: number;
}

/**
 * Configuration options for the DurationPicker component.
 */
export interface DurationPickerOptions
{
    /** The unit pattern determining which spinner columns are shown.
     *  A hyphen-separated string of unit identifiers.
     *  Default: "h-m". */
    pattern?: DurationPattern;

    /** Initial duration value. Defaults to all zeros. */
    value?: DurationValue;

    /** Step increment for each unit. Default: 1 for all units. */
    unitSteps?: Partial<Record<DurationUnit, number>>;

    /** Maximum value for each unit. Uses natural range defaults if not specified. */
    unitMax?: Partial<Record<DurationUnit, number>>;

    /** When true, overflowing a subordinate unit carries into the next larger unit. Default: false. */
    carry?: boolean;

    /** Hide leading zero-value units in the display. Default: true. */
    hideZeroLeading?: boolean;

    /** Custom display formatter. Receives the DurationValue, returns a display string. */
    displayFormat?: (value: DurationValue) => string;

    /** Show the "Clear" button in the dropdown footer. Default: true. */
    showClearButton?: boolean;

    /** Show the ISO 8601 format hint below the input. Default: true. */
    showFormatHint?: boolean;

    /** Show the format help icon and tooltip. Default: true. */
    showFormatHelp?: boolean;

    /** Custom help text for the format tooltip. */
    formatHelpText?: string;

    /** When true, the input is disabled. Default: false. */
    disabled?: boolean;

    /** When true, the input is not editable by typing but dropdown works. Default: false. */
    readonly?: boolean;

    /** Placeholder text when duration is zero. */
    placeholder?: string;

    /** Size variant. Default: "default". */
    size?: "sm" | "default" | "lg";

    /** Callback fired when the duration value changes. */
    onChange?: (value: DurationValue) => void;

    /** Callback fired when the dropdown opens. */
    onOpen?: () => void;

    /** Callback fired when the dropdown closes. */
    onClose?: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[DurationPicker]";

let instanceCounter = 0;

/**
 * Ordered list of all units from largest to smallest.
 */
const UNIT_ORDER: DurationUnit[] = ["y", "q", "mo", "fn", "w", "d", "h", "m", "s"];

/**
 * Human-readable labels for each unit.
 */
const UNIT_LABELS: Record<DurationUnit, string> =
{
    y: "Years",
    q: "Quarters",
    mo: "Months",
    fn: "Fortnights",
    w: "Weeks",
    d: "Days",
    h: "Hours",
    m: "Minutes",
    s: "Seconds",
};

/**
 * Short suffixes for display format.
 */
const UNIT_SUFFIXES: Record<DurationUnit, string> =
{
    y: "y",
    q: "q",
    mo: "mo",
    fn: "fn",
    w: "w",
    d: "d",
    h: "h",
    m: "m",
    s: "s",
};

/**
 * Seconds equivalent for each unit, used for toTotalSeconds() conversion.
 */
const UNIT_SECONDS: Record<DurationUnit, number> =
{
    y: 365 * 24 * 3600,
    q: 91 * 24 * 3600,
    mo: 30 * 24 * 3600,
    fn: 14 * 24 * 3600,
    w: 7 * 24 * 3600,
    d: 24 * 3600,
    h: 3600,
    m: 60,
    s: 1,
};

/**
 * Maximum duration in seconds (1 year).
 */
const MAX_DURATION_SECONDS = 365 * 24 * 3600;

/**
 * Standalone maximums for each unit (capped at ~1 year equivalent).
 */
const STANDALONE_MAX: Record<DurationUnit, number> =
{
    y: 1,
    q: 4,
    mo: 12,
    fn: 26,
    w: 52,
    d: 365,
    h: 8760,
    m: 525600,
    s: 31536000,
};

/**
 * Subordinate maximums: the range when this unit is beneath a larger unit.
 * Keyed by [subordinateUnit][parentUnit].
 */
const SUBORDINATE_MAX: Partial<Record<DurationUnit, Partial<Record<DurationUnit, number>>>> =
{
    q:  { y: 3 },
    mo: { y: 11, q: 2 },
    fn: { y: 25 },
    w:  { y: 51 },
    d:  { w: 6, mo: 30, y: 364 },
    h:  { d: 23, w: 167, mo: 719 },
    m:  { h: 59, d: 1439 },
    s:  { m: 59, h: 3599 },
};

// ============================================================================
// PRIVATE HELPERS -- DOM
// ============================================================================

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

function setAttr(el: HTMLElement, name: string, value: string): void
{
    el.setAttribute(name, value);
}

// ============================================================================
// PRIVATE HELPERS -- UNIT UTILITIES
// ============================================================================

/**
 * Parses a pattern string like "d-h-m" into an ordered array of DurationUnit.
 */
function parsePattern(pattern: string): DurationUnit[]
{
    return pattern.split("-") as DurationUnit[];
}

/**
 * Returns the maximum for a unit within a given pattern, respecting
 * subordinate relationships and user-defined unitMax overrides.
 */
function getUnitMax(
    unit: DurationUnit,
    units: DurationUnit[],
    unitMaxOverrides?: Partial<Record<DurationUnit, number>>
): number
{
    if (unitMaxOverrides && unitMaxOverrides[unit] !== undefined)
    {
        return unitMaxOverrides[unit]!;
    }

    const idx = units.indexOf(unit);
    if (idx <= 0)
    {
        return STANDALONE_MAX[unit];
    }

    // Find the nearest larger unit in the pattern
    const parentUnit = units[idx - 1];
    const subMap = SUBORDINATE_MAX[unit];
    if (subMap && subMap[parentUnit] !== undefined)
    {
        return subMap[parentUnit]!;
    }

    return STANDALONE_MAX[unit];
}

/**
 * Pads a number to at least 2 digits with leading zeros.
 */
function padValue(n: number): string
{
    return n < 10 ? "0" + n : String(n);
}

// ============================================================================
// PRIVATE HELPERS -- ISO 8601 PARSING
// ============================================================================

/**
 * Parses an ISO 8601 duration string (e.g., "P2DT4H30M") into a DurationValue.
 * Returns null if the string cannot be parsed.
 */
function parseISO8601(iso: string): DurationValue | null
{
    const trimmed = iso.trim().toUpperCase();
    if (!trimmed.startsWith("P"))
    {
        return null;
    }

    const regex = /^P(?:(\d+(?:\.\d+)?)Y)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)W)?(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/;
    const match = trimmed.match(regex);
    if (!match)
    {
        return null;
    }

    // Ensure at least one component is present
    const hasAny = match.slice(1).some(g => g !== undefined);
    if (!hasAny)
    {
        return null;
    }

    return buildISOResult(match);
}

/**
 * Builds a DurationValue from ISO regex match groups.
 */
function buildISOResult(match: RegExpMatchArray): DurationValue
{
    const result: DurationValue = {};

    if (match[1] !== undefined) { result.y = parseFloat(match[1]); }
    if (match[2] !== undefined) { result.mo = parseFloat(match[2]); }
    if (match[3] !== undefined) { result.w = parseFloat(match[3]); }
    if (match[4] !== undefined) { result.d = parseFloat(match[4]); }
    if (match[5] !== undefined) { result.h = parseFloat(match[5]); }
    if (match[6] !== undefined) { result.m = parseFloat(match[6]); }
    if (match[7] !== undefined) { result.s = parseFloat(match[7]); }

    return result;
}

/**
 * Parses shorthand input like "2d 4h 30m" or "1y 6mo" into a DurationValue.
 * Returns null if parsing fails.
 */
function parseShorthand(input: string): DurationValue | null
{
    const trimmed = input.trim().toLowerCase();
    if (trimmed.length === 0)
    {
        return null;
    }

    const result: DurationValue = {};
    const tokenRegex = /(\d+(?:\.\d+)?)\s*(y|q|mo|fn|w|d|h|m|s)/g;
    let matched = false;
    let lastIndex = 0;
    let tokenMatch: RegExpExecArray | null;

    while ((tokenMatch = tokenRegex.exec(trimmed)) !== null)
    {
        matched = true;
        lastIndex = tokenRegex.lastIndex;
        const num = parseFloat(tokenMatch[1]);
        const unit = tokenMatch[2] as DurationUnit;
        result[unit] = (result[unit] || 0) + num;
    }

    if (!matched)
    {
        return null;
    }

    // Verify no extraneous characters remain
    const remaining = trimmed.slice(lastIndex).trim();
    if (remaining.length > 0)
    {
        return null;
    }

    return result;
}

/**
 * Converts a DurationValue into total seconds, then redistributes
 * those seconds into the specified pattern units.
 */
function convertToPatternUnits(
    raw: DurationValue, units: DurationUnit[]
): DurationValue | null
{
    let totalSeconds = durationToSeconds(raw);
    if (totalSeconds < 0)
    {
        return null;
    }
    if (totalSeconds > MAX_DURATION_SECONDS)
    {
        console.warn(`${LOG_PREFIX} Duration exceeds 1 year; clamped.`);
        totalSeconds = MAX_DURATION_SECONDS;
    }

    return secondsToPatternValue(totalSeconds, units);
}

/**
 * Converts a DurationValue to total seconds.
 */
function durationToSeconds(val: DurationValue): number
{
    let total = 0;
    for (const unit of UNIT_ORDER)
    {
        if (val[unit] !== undefined && val[unit] !== 0)
        {
            total += val[unit]! * UNIT_SECONDS[unit];
        }
    }
    return total;
}

/**
 * Distributes a total number of seconds into the given pattern units,
 * largest unit first.
 */
function secondsToPatternValue(
    totalSeconds: number, units: DurationUnit[]
): DurationValue
{
    const result: DurationValue = {};
    let remaining = Math.round(totalSeconds);

    for (const unit of units)
    {
        const unitSec = UNIT_SECONDS[unit];
        const count = Math.floor(remaining / unitSec);
        result[unit] = count;
        remaining -= count * unitSec;
    }

    return result;
}

// ============================================================================
// PRIVATE HELPERS -- DISPLAY FORMAT
// ============================================================================

/**
 * Formats a DurationValue into the default shorthand display (e.g., "2d 4h 30m").
 * Respects hideZeroLeading option.
 */
function formatDurationDisplay(
    value: DurationValue,
    units: DurationUnit[],
    hideZeroLeading: boolean
): string
{
    const parts: string[] = [];
    let foundNonZero = false;

    for (const unit of units)
    {
        const v = value[unit] || 0;
        if (v !== 0)
        {
            foundNonZero = true;
        }
        if (!foundNonZero && v === 0 && hideZeroLeading)
        {
            continue;
        }
        parts.push(`${v}${UNIT_SUFFIXES[unit]}`);
    }

    if (parts.length === 0)
    {
        const lastUnit = units[units.length - 1];
        return `0${UNIT_SUFFIXES[lastUnit]}`;
    }

    return parts.join(" ");
}

/**
 * Generates the ISO 8601 representation of a DurationValue.
 */
function toISO8601(value: DurationValue): string
{
    let datePart = "";
    let timePart = "";

    if (value.y) { datePart += `${value.y}Y`; }
    if (value.mo) { datePart += `${value.mo}M`; }
    if (value.w) { datePart += `${value.w}W`; }
    if (value.fn) { datePart += `${value.fn * 14}D`; }
    if (value.q) { datePart += `${value.q * 3}M`; }
    if (value.d) { datePart += `${value.d}D`; }
    if (value.h) { timePart += `${value.h}H`; }
    if (value.m) { timePart += `${value.m}M`; }
    if (value.s) { timePart += `${value.s}S`; }

    if (!datePart && !timePart)
    {
        return "PT0S";
    }

    let result = "P" + datePart;
    if (timePart)
    {
        result += "T" + timePart;
    }

    return result;
}

// ============================================================================
// PUBLIC API
// ============================================================================

// @entrypoint
/**
 * DurationPicker renders a spinner-based duration input with configurable
 * unit patterns, ISO 8601 support, and carry mode.
 *
 * @example
 * const picker = new DurationPicker("duration-container");
 * picker.getValue(); // Returns DurationValue
 * picker.toISO();    // Returns "PT0S"
 */
export class DurationPicker
{
    private readonly containerId: string;
    private readonly instanceId: string;
    private options: Required<
        Pick<DurationPickerOptions,
            "pattern" | "carry" | "hideZeroLeading" | "showClearButton"
            | "showFormatHint" | "showFormatHelp" | "disabled" | "readonly" | "size"
        >
    > & DurationPickerOptions;

    // Parsed pattern units
    private readonly units: DurationUnit[];

    // State
    private currentValue: DurationValue = {};
    private previousValue: DurationValue = {};
    private isOpen = false;
    private focusedColumnIndex = 0;
    private numericBuffer = "";
    private numericBufferTimer: ReturnType<typeof setTimeout> | null = null;

    // DOM references
    private wrapperEl: HTMLElement | null = null;
    private inputEl: HTMLInputElement | null = null;
    private dropdownEl: HTMLElement | null = null;
    private spinnersEl: HTMLElement | null = null;
    private hintTextEl: HTMLElement | null = null;
    private helpTooltipEl: HTMLElement | null = null;
    private liveRegionEl: HTMLElement | null = null;

    // Bound event handlers
    private readonly boundOnDocumentClick: (e: MouseEvent) => void;
    private readonly boundOnInputKeydown: (e: KeyboardEvent) => void;
    private readonly boundOnDropdownKeydown: (e: KeyboardEvent) => void;

    constructor(containerId: string, options?: DurationPickerOptions)
    {
        instanceCounter++;
        this.instanceId = `durationpicker-${instanceCounter}`;
        this.containerId = containerId;

        this.options = {
            pattern: "h-m",
            carry: false,
            hideZeroLeading: true,
            showClearButton: true,
            showFormatHint: true,
            showFormatHelp: true,
            disabled: false,
            readonly: false,
            size: "default",
            ...options,
        };

        this.units = parsePattern(this.options.pattern);
        this.initializeValue(this.options.value);
        this.previousValue = { ...this.currentValue };

        this.boundOnDocumentClick = (e) => this.onDocumentClick(e);
        this.boundOnInputKeydown = (e) => this.onInputKeydown(e);
        this.boundOnDropdownKeydown = (e) => this.onDropdownKeydown(e);

        this.render();
        console.log(`${LOG_PREFIX} Initialised:`, this.instanceId);
    }

    // ========================================================================
    // PUBLIC METHODS
    // ========================================================================

    public getValue(): DurationValue
    {
        const result: DurationValue = {};
        for (const unit of this.units)
        {
            result[unit] = this.currentValue[unit] || 0;
        }
        return result;
    }

    public getFormattedValue(): string
    {
        if (this.options.displayFormat)
        {
            return this.options.displayFormat(this.getValue());
        }
        return formatDurationDisplay(
            this.currentValue, this.units, this.options.hideZeroLeading
        );
    }

    public toISO(): string
    {
        return toISO8601(this.getValue());
    }

    public toTotalSeconds(): number
    {
        return durationToSeconds(this.getValue());
    }

    public setValue(value: DurationValue): void
    {
        this.initializeValue(value);
        this.clampAllUnits();
        this.updateInput();
        this.updateHint();
        if (this.isOpen)
        {
            this.renderSpinners();
        }
        this.options.onChange?.(this.getValue());
        console.debug(`${LOG_PREFIX} setValue:`, value);
    }

    public setFromISO(iso: string): void
    {
        const parsed = parseISO8601(iso);
        if (!parsed)
        {
            console.warn(`${LOG_PREFIX} Invalid ISO 8601 string: "${iso}"`);
            return;
        }

        const converted = convertToPatternUnits(parsed, this.units);
        if (!converted)
        {
            console.warn(`${LOG_PREFIX} Cannot map ISO to pattern: "${iso}"`);
            return;
        }

        this.currentValue = converted;
        this.clampAllUnits();
        this.updateInput();
        this.updateHint();
        if (this.isOpen)
        {
            this.renderSpinners();
        }
        this.options.onChange?.(this.getValue());
        console.debug(`${LOG_PREFIX} setFromISO:`, iso);
    }

    public open(): void
    {
        if (this.options.disabled || this.isOpen)
        {
            return;
        }
        this.showDropdown();
    }

    public close(): void
    {
        if (this.isOpen)
        {
            this.hideDropdown();
        }
    }

    public clear(): void
    {
        for (const unit of this.units)
        {
            this.currentValue[unit] = 0;
        }
        this.updateInput();
        this.updateHint();
        if (this.isOpen)
        {
            this.renderSpinners();
        }
        this.options.onChange?.(this.getValue());
        this.announceLive("Duration cleared");
        console.debug(`${LOG_PREFIX} Cleared`);
    }

    public enable(): void
    {
        this.options.disabled = false;
        if (this.inputEl)
        {
            this.inputEl.disabled = false;
        }
        this.wrapperEl?.classList.remove("durationpicker-disabled");
    }

    public disable(): void
    {
        this.options.disabled = true;
        if (this.inputEl)
        {
            this.inputEl.disabled = true;
        }
        this.wrapperEl?.classList.add("durationpicker-disabled");
        if (this.isOpen)
        {
            this.hideDropdown();
        }
    }

    public destroy(): void
    {
        document.removeEventListener("click", this.boundOnDocumentClick);
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

    private initializeValue(value?: DurationValue): void
    {
        for (const unit of this.units)
        {
            this.currentValue[unit] = (value && value[unit]) ? value[unit]! : 0;
        }
    }

    private clampAllUnits(): void
    {
        for (const unit of this.units)
        {
            const max = getUnitMax(unit, this.units, this.options.unitMax);
            const val = this.currentValue[unit] || 0;
            this.currentValue[unit] = Math.max(0, Math.min(val, max));
        }
    }

    // ========================================================================
    // PRIVATE -- RENDERING
    // ========================================================================

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

        this.wrapperEl = createElement("div", ["durationpicker"]);
        setAttr(this.wrapperEl, "id", this.instanceId);
        this.applySizeClass();
        this.applyDisabledClass();

        const inputGroup = this.buildInputGroup();
        this.wrapperEl.appendChild(inputGroup);

        if (this.options.showFormatHint)
        {
            const hint = this.buildFormatHint();
            this.wrapperEl.appendChild(hint);
        }

        this.dropdownEl = this.buildDropdown();
        this.wrapperEl.appendChild(this.dropdownEl);

        this.liveRegionEl = this.buildLiveRegion();
        this.wrapperEl.appendChild(this.liveRegionEl);

        container.appendChild(this.wrapperEl);
        document.addEventListener("click", this.boundOnDocumentClick);
    }

    private applySizeClass(): void
    {
        if (this.options.size === "sm")
        {
            this.wrapperEl!.classList.add("durationpicker-sm");
        }
        else if (this.options.size === "lg")
        {
            this.wrapperEl!.classList.add("durationpicker-lg");
        }
    }

    private applyDisabledClass(): void
    {
        if (this.options.disabled)
        {
            this.wrapperEl!.classList.add("durationpicker-disabled");
        }
    }

    // ========================================================================
    // PRIVATE -- INPUT GROUP
    // ========================================================================

    private buildInputGroup(): HTMLElement
    {
        const group = createElement("div", ["input-group"]);

        this.inputEl = document.createElement("input");
        this.inputEl.type = "text";
        this.inputEl.className = "form-control durationpicker-input";
        setAttr(this.inputEl, "autocomplete", "off");
        setAttr(this.inputEl, "role", "combobox");
        setAttr(this.inputEl, "aria-haspopup", "dialog");
        setAttr(this.inputEl, "aria-expanded", "false");
        setAttr(this.inputEl, "aria-controls", `${this.instanceId}-dropdown`);

        if (this.options.showFormatHint)
        {
            setAttr(
                this.inputEl,
                "aria-describedby",
                `${this.instanceId}-format-hint`
            );
        }

        this.setInputPlaceholder();
        this.applyInputStates();
        this.updateInput();

        this.inputEl.addEventListener("keydown", this.boundOnInputKeydown);
        this.inputEl.addEventListener("click", () =>
        {
            if (!this.options.disabled)
            {
                this.showDropdown();
            }
        });
        this.inputEl.addEventListener("blur", () =>
        {
            this.onInputBlur();
        });

        group.appendChild(this.inputEl);

        const toggleBtn = this.buildToggleButton();
        group.appendChild(toggleBtn);

        return group;
    }

    private setInputPlaceholder(): void
    {
        const placeholder = this.options.placeholder
            || this.buildZeroPlaceholder();
        setAttr(this.inputEl!, "placeholder", placeholder);
    }

    private buildZeroPlaceholder(): string
    {
        const parts = this.units.map(u => `0${UNIT_SUFFIXES[u]}`);
        return parts.join(" ");
    }

    private applyInputStates(): void
    {
        if (this.options.disabled)
        {
            this.inputEl!.disabled = true;
        }
        if (this.options.readonly)
        {
            this.inputEl!.readOnly = true;
        }
    }

    private buildToggleButton(): HTMLElement
    {
        const toggleBtn = createElement(
            "button",
            ["btn", "btn-outline-secondary", "durationpicker-toggle"]
        );
        setAttr(toggleBtn, "type", "button");
        setAttr(toggleBtn, "tabindex", "-1");
        setAttr(toggleBtn, "aria-label", "Open duration picker");

        const icon = createElement("i", ["bi", "bi-hourglass-split"]);
        toggleBtn.appendChild(icon);

        toggleBtn.addEventListener("mousedown", (e) =>
        {
            e.preventDefault();
            if (this.options.disabled)
            {
                return;
            }
            if (this.isOpen)
            {
                this.hideDropdown();
            }
            else
            {
                this.showDropdown();
            }
        });

        return toggleBtn;
    }

    // ========================================================================
    // PRIVATE -- FORMAT HINT
    // ========================================================================

    private buildFormatHint(): HTMLElement
    {
        const hint = createElement("div", ["durationpicker-hint"]);
        setAttr(hint, "id", `${this.instanceId}-format-hint`);

        this.hintTextEl = createElement(
            "span",
            ["durationpicker-hint-text", "text-muted", "small"],
            this.toISO()
        );
        hint.appendChild(this.hintTextEl);

        if (this.options.showFormatHelp)
        {
            this.buildFormatHelp(hint);
        }

        return hint;
    }

    private buildFormatHelp(hint: HTMLElement): void
    {
        const helpBtn = createElement(
            "button", ["durationpicker-help-icon"]
        );
        setAttr(helpBtn, "type", "button");
        setAttr(helpBtn, "aria-label", "Duration format help");

        const helpIcon = createElement("i", ["bi", "bi-question-circle"]);
        helpBtn.appendChild(helpIcon);
        hint.appendChild(helpBtn);

        const tooltip = createElement(
            "div", ["durationpicker-help-tooltip"]
        );
        setAttr(tooltip, "role", "tooltip");

        const helpText = this.options.formatHelpText
            || "Enter a duration as ISO 8601 (e.g., PT4H30M) or shorthand (e.g., 4h 30m).";
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

    private buildDropdown(): HTMLElement
    {
        const dropdown = createElement("div", ["durationpicker-dropdown"]);
        setAttr(dropdown, "id", `${this.instanceId}-dropdown`);
        setAttr(dropdown, "role", "dialog");
        setAttr(dropdown, "aria-modal", "true");
        setAttr(dropdown, "aria-label", "Choose duration");
        dropdown.style.display = "none";

        dropdown.addEventListener("keydown", this.boundOnDropdownKeydown);

        return dropdown;
    }

    private buildLiveRegion(): HTMLElement
    {
        const region = createElement("div", ["durationpicker-live-region"]);
        setAttr(region, "aria-live", "polite");
        setAttr(region, "aria-atomic", "true");
        region.style.position = "absolute";
        region.style.width = "1px";
        region.style.height = "1px";
        region.style.overflow = "hidden";
        region.style.clip = "rect(0, 0, 0, 0)";
        return region;
    }

    private renderDropdownContent(): void
    {
        if (!this.dropdownEl)
        {
            return;
        }

        // Clear previous content using DOM methods (no innerHTML)
        while (this.dropdownEl.firstChild)
        {
            this.dropdownEl.removeChild(this.dropdownEl.firstChild);
        }

        this.spinnersEl = createElement("div", ["durationpicker-spinners"]);
        this.renderSpinners();
        this.dropdownEl.appendChild(this.spinnersEl);

        if (this.options.showClearButton)
        {
            const footer = this.buildFooter();
            this.dropdownEl.appendChild(footer);
        }
    }

    // ========================================================================
    // PRIVATE -- SPINNERS
    // ========================================================================

    private renderSpinners(): void
    {
        if (!this.spinnersEl)
        {
            return;
        }

        while (this.spinnersEl.firstChild)
        {
            this.spinnersEl.removeChild(this.spinnersEl.firstChild);
        }

        for (let i = 0; i < this.units.length; i++)
        {
            const spinner = this.buildSpinnerColumn(i);
            this.spinnersEl.appendChild(spinner);
        }
    }

    private buildSpinnerColumn(columnIndex: number): HTMLElement
    {
        const unit = this.units[columnIndex];
        const unitMax = getUnitMax(unit, this.units, this.options.unitMax);
        const currentVal = this.currentValue[unit] || 0;

        const col = createElement("div", ["durationpicker-spinner"]);
        setAttr(col, "role", "spinbutton");
        setAttr(col, "aria-label", UNIT_LABELS[unit]);
        setAttr(col, "aria-valuenow", String(currentVal));
        setAttr(col, "aria-valuemin", "0");
        setAttr(col, "aria-valuemax", String(unitMax));
        setAttr(col, "tabindex", columnIndex === this.focusedColumnIndex ? "0" : "-1");
        setAttr(col, "data-column-index", String(columnIndex));

        const upBtn = this.buildArrowButton("up", unit);
        col.appendChild(upBtn);

        const track = this.buildSpinnerTrack(currentVal, unitMax);
        col.appendChild(track);

        const downBtn = this.buildArrowButton("down", unit);
        col.appendChild(downBtn);

        const label = createElement(
            "div", ["durationpicker-spinner-label"], UNIT_LABELS[unit]
        );
        col.appendChild(label);

        return col;
    }

    private buildArrowButton(
        direction: "up" | "down", unit: DurationUnit
    ): HTMLElement
    {
        const isUp = direction === "up";
        const cls = isUp ? "durationpicker-spinner-up" : "durationpicker-spinner-down";
        const ariaLabel = isUp
            ? `Increase ${UNIT_LABELS[unit].toLowerCase()}`
            : `Decrease ${UNIT_LABELS[unit].toLowerCase()}`;
        const iconCls = isUp ? "bi-chevron-up" : "bi-chevron-down";

        const btn = createElement("button", [cls]);
        setAttr(btn, "type", "button");
        setAttr(btn, "tabindex", "-1");
        setAttr(btn, "aria-label", ariaLabel);

        const icon = createElement("i", ["bi", iconCls]);
        btn.appendChild(icon);

        btn.addEventListener("click", (e) =>
        {
            e.stopPropagation();
            const colIndex = this.getColumnIndexFromButton(btn);
            this.focusedColumnIndex = colIndex;
            const step = this.getUnitStep(this.units[colIndex]);
            if (isUp)
            {
                this.incrementUnit(colIndex, step);
            }
            else
            {
                this.decrementUnit(colIndex, step);
            }
        });

        return btn;
    }

    private getColumnIndexFromButton(btn: HTMLElement): number
    {
        const spinnerEl = btn.parentElement;
        if (spinnerEl)
        {
            const idx = spinnerEl.getAttribute("data-column-index");
            if (idx !== null)
            {
                return parseInt(idx, 10);
            }
        }
        return 0;
    }

    private buildSpinnerTrack(
        currentVal: number, unitMax: number
    ): HTMLElement
    {
        const track = createElement("div", ["durationpicker-spinner-track"]);

        const prevVal = currentVal > 0 ? currentVal - 1 : unitMax;
        const nextVal = currentVal < unitMax ? currentVal + 1 : 0;

        const prevEl = createElement(
            "div",
            ["durationpicker-spinner-value", "durationpicker-spinner-adjacent"],
            padValue(prevVal)
        );
        track.appendChild(prevEl);

        const selectedEl = createElement(
            "div",
            ["durationpicker-spinner-value", "durationpicker-spinner-selected"],
            padValue(currentVal)
        );
        track.appendChild(selectedEl);

        const nextEl = createElement(
            "div",
            ["durationpicker-spinner-value", "durationpicker-spinner-adjacent"],
            padValue(nextVal)
        );
        track.appendChild(nextEl);

        return track;
    }

    // ========================================================================
    // PRIVATE -- FOOTER
    // ========================================================================

    private buildFooter(): HTMLElement
    {
        const footer = createElement("div", ["durationpicker-footer"]);

        const clearBtn = createElement(
            "button",
            ["btn", "btn-sm", "btn-link", "durationpicker-clear-btn"],
            "Clear"
        );
        setAttr(clearBtn, "type", "button");
        setAttr(clearBtn, "aria-label", "Clear duration");

        clearBtn.addEventListener("click", () =>
        {
            this.clear();
            this.hideDropdown();
        });

        footer.appendChild(clearBtn);
        return footer;
    }

    // ========================================================================
    // PRIVATE -- DROPDOWN OPEN / CLOSE
    // ========================================================================

    private showDropdown(): void
    {
        if (this.isOpen || !this.dropdownEl)
        {
            return;
        }

        this.closeOtherDropdowns();

        this.isOpen = true;
        this.previousValue = { ...this.currentValue };
        this.focusedColumnIndex = 0;

        this.renderDropdownContent();
        this.dropdownEl.style.display = "block";
        setAttr(this.inputEl!, "aria-expanded", "true");
        this.positionDropdown();

        requestAnimationFrame(() =>
        {
            this.focusCurrentSpinner();
        });

        this.options.onOpen?.();
        console.debug(`${LOG_PREFIX} Dropdown opened`);
    }

    private hideDropdown(): void
    {
        if (!this.isOpen || !this.dropdownEl)
        {
            return;
        }

        this.isOpen = false;
        this.dropdownEl.style.display = "none";
        this.dropdownEl.classList.remove("durationpicker-dropdown-above");
        setAttr(this.inputEl!, "aria-expanded", "false");

        this.options.onClose?.();
        console.debug(`${LOG_PREFIX} Dropdown closed`);
    }

    private closeOtherDropdowns(): void
    {
        document.querySelectorAll(
            ".durationpicker-dropdown[style*='display: block']"
        ).forEach((el) =>
        {
            (el as HTMLElement).style.display = "none";
        });
    }

    private positionDropdown(): void
    {
        if (!this.dropdownEl || !this.wrapperEl)
        {
            return;
        }

        const rect = this.wrapperEl.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const ddHeight = this.dropdownEl.offsetHeight || 200;

        if (spaceBelow < ddHeight && rect.top > ddHeight)
        {
            this.dropdownEl.classList.add("durationpicker-dropdown-above");
        }
        else
        {
            this.dropdownEl.classList.remove("durationpicker-dropdown-above");
        }
    }

    // ========================================================================
    // PRIVATE -- SPINNER VALUE CHANGES
    // ========================================================================

    private incrementUnit(columnIndex: number, step: number): void
    {
        const unit = this.units[columnIndex];
        const max = getUnitMax(unit, this.units, this.options.unitMax);
        let val = (this.currentValue[unit] || 0) + step;

        if (this.options.carry && columnIndex > 0)
        {
            if (val > max)
            {
                val = 0;
                this.incrementUnit(columnIndex - 1, 1);
            }
        }
        else
        {
            val = Math.min(val, max);
        }

        this.currentValue[unit] = val;
        this.onValueChanged();
    }

    private decrementUnit(columnIndex: number, step: number): void
    {
        const unit = this.units[columnIndex];
        const max = getUnitMax(unit, this.units, this.options.unitMax);
        let val = (this.currentValue[unit] || 0) - step;

        if (this.options.carry && columnIndex > 0)
        {
            if (val < 0)
            {
                const parentVal = this.currentValue[this.units[columnIndex - 1]] || 0;
                if (parentVal > 0)
                {
                    val = max;
                    this.decrementUnit(columnIndex - 1, 1);
                }
                else
                {
                    val = 0;
                }
            }
        }
        else
        {
            val = Math.max(val, 0);
        }

        this.currentValue[unit] = val;
        this.onValueChanged();
    }

    private setUnitValue(columnIndex: number, newVal: number): void
    {
        const unit = this.units[columnIndex];
        const max = getUnitMax(unit, this.units, this.options.unitMax);
        this.currentValue[unit] = Math.max(0, Math.min(newVal, max));
        this.onValueChanged();
    }

    private getUnitStep(unit: DurationUnit): number
    {
        if (this.options.unitSteps && this.options.unitSteps[unit] !== undefined)
        {
            return this.options.unitSteps[unit]!;
        }
        return 1;
    }

    private onValueChanged(): void
    {
        this.updateInput();
        this.updateHint();
        this.renderSpinners();
        this.options.onChange?.(this.getValue());

        requestAnimationFrame(() =>
        {
            this.focusCurrentSpinner();
        });
    }

    // ========================================================================
    // PRIVATE -- INPUT
    // ========================================================================

    private updateInput(): void
    {
        if (!this.inputEl)
        {
            return;
        }
        this.inputEl.value = this.getFormattedValue();
        this.inputEl.classList.remove("durationpicker-invalid");
    }

    private updateHint(): void
    {
        if (this.hintTextEl)
        {
            this.hintTextEl.textContent = this.toISO();
        }
    }

    // ========================================================================
    // PRIVATE -- MANUAL INPUT PARSING
    // ========================================================================

    private onInputBlur(): void
    {
        if (!this.inputEl || this.isOpen)
        {
            return;
        }

        const text = this.inputEl.value.trim();
        if (text === "" || this.isAllZeroDisplay(text))
        {
            this.clear();
            return;
        }

        this.parseAndApplyInput(text);
    }

    private isAllZeroDisplay(text: string): boolean
    {
        return /^(0\w+\s*)+$/.test(text.trim());
    }

    private parseAndApplyInput(text: string): void
    {
        // Try ISO 8601 first
        let parsed = parseISO8601(text);
        if (!parsed)
        {
            parsed = parseShorthand(text);
        }

        if (!parsed)
        {
            this.rejectInput(text);
            return;
        }

        const converted = convertToPatternUnits(parsed, this.units);
        if (!converted)
        {
            this.rejectInput(text);
            return;
        }

        this.currentValue = converted;
        this.clampAllUnits();
        this.previousValue = { ...this.currentValue };
        this.updateInput();
        this.updateHint();
        this.options.onChange?.(this.getValue());
    }

    private rejectInput(text: string): void
    {
        console.warn(
            `${LOG_PREFIX} Invalid duration input: "${text}"; reverting.`
        );
        this.currentValue = { ...this.previousValue };
        this.updateInput();
        this.updateHint();
        this.inputEl?.classList.add("durationpicker-invalid");
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
            "durationpicker-help-tooltip-visible"
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
        this.helpTooltipEl?.classList.add("durationpicker-help-tooltip-visible");
    }

    private hideHelpTooltip(): void
    {
        this.helpTooltipEl?.classList.remove("durationpicker-help-tooltip-visible");
    }

    // ========================================================================
    // PRIVATE -- FOCUS MANAGEMENT
    // ========================================================================

    private focusCurrentSpinner(): void
    {
        if (!this.spinnersEl)
        {
            return;
        }
        const spinners = this.spinnersEl.querySelectorAll(
            ".durationpicker-spinner"
        );

        spinners.forEach((sp, idx) =>
        {
            setAttr(
                sp as HTMLElement,
                "tabindex",
                idx === this.focusedColumnIndex ? "0" : "-1"
            );
        });

        const target = spinners[this.focusedColumnIndex] as HTMLElement;
        target?.focus();
    }

    private announceLive(message: string): void
    {
        if (this.liveRegionEl)
        {
            this.liveRegionEl.textContent = message;
        }
    }

    // ========================================================================
    // PRIVATE -- EVENT HANDLERS
    // ========================================================================

    private onDocumentClick(e: MouseEvent): void
    {
        if (!this.isOpen || !this.wrapperEl)
        {
            return;
        }
        if (!this.wrapperEl.contains(e.target as Node))
        {
            this.hideDropdown();
        }
    }

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
                this.showDropdown();
                break;
            case "Enter":
                e.preventDefault();
                if (!this.isOpen)
                {
                    this.onInputBlur();
                }
                break;
            case "Escape":
                if (this.isOpen)
                {
                    e.preventDefault();
                    this.hideDropdown();
                }
                break;
        }
    }

    private onDropdownKeydown(e: KeyboardEvent): void
    {
        switch (e.key)
        {
            case "ArrowUp":
                e.preventDefault();
                this.handleSpinnerArrowUp();
                break;
            case "ArrowDown":
                e.preventDefault();
                this.handleSpinnerArrowDown();
                break;
            case "ArrowLeft":
                e.preventDefault();
                this.handleSpinnerArrowLeft();
                break;
            case "ArrowRight":
                e.preventDefault();
                this.handleSpinnerArrowRight();
                break;
            case "PageUp":
                e.preventDefault();
                this.handleSpinnerPageUp();
                break;
            case "PageDown":
                e.preventDefault();
                this.handleSpinnerPageDown();
                break;
            case "Home":
                e.preventDefault();
                this.handleSpinnerHome();
                break;
            case "End":
                e.preventDefault();
                this.handleSpinnerEnd();
                break;
            case "Enter":
                e.preventDefault();
                this.handleSpinnerEnter();
                break;
            case "Escape":
                e.preventDefault();
                this.handleSpinnerEscape();
                break;
            case "Delete":
            case "Backspace":
                e.preventDefault();
                this.handleSpinnerDelete();
                break;
            case "Tab":
                this.handleSpinnerTab(e);
                break;
            default:
                this.handleNumericEntry(e);
                break;
        }
    }

    // ========================================================================
    // PRIVATE -- KEYBOARD HANDLERS
    // ========================================================================

    private handleSpinnerArrowUp(): void
    {
        const step = this.getUnitStep(this.units[this.focusedColumnIndex]);
        this.incrementUnit(this.focusedColumnIndex, step);
    }

    private handleSpinnerArrowDown(): void
    {
        const step = this.getUnitStep(this.units[this.focusedColumnIndex]);
        this.decrementUnit(this.focusedColumnIndex, step);
    }

    private handleSpinnerArrowLeft(): void
    {
        if (this.focusedColumnIndex > 0)
        {
            this.focusedColumnIndex--;
            this.focusCurrentSpinner();
        }
    }

    private handleSpinnerArrowRight(): void
    {
        if (this.focusedColumnIndex < this.units.length - 1)
        {
            this.focusedColumnIndex++;
            this.focusCurrentSpinner();
        }
    }

    private handleSpinnerPageUp(): void
    {
        const step = this.getUnitStep(this.units[this.focusedColumnIndex]);
        this.incrementUnit(this.focusedColumnIndex, step * 10);
    }

    private handleSpinnerPageDown(): void
    {
        const step = this.getUnitStep(this.units[this.focusedColumnIndex]);
        this.decrementUnit(this.focusedColumnIndex, step * 10);
    }

    private handleSpinnerHome(): void
    {
        this.setUnitValue(this.focusedColumnIndex, 0);
    }

    private handleSpinnerEnd(): void
    {
        const unit = this.units[this.focusedColumnIndex];
        const max = getUnitMax(unit, this.units, this.options.unitMax);
        this.setUnitValue(this.focusedColumnIndex, max);
    }

    private handleSpinnerEnter(): void
    {
        this.previousValue = { ...this.currentValue };
        this.hideDropdown();
        this.inputEl?.focus();
    }

    private handleSpinnerEscape(): void
    {
        this.currentValue = { ...this.previousValue };
        this.updateInput();
        this.updateHint();
        this.hideDropdown();
        this.inputEl?.focus();
    }

    private handleSpinnerDelete(): void
    {
        this.setUnitValue(this.focusedColumnIndex, 0);
    }

    private handleSpinnerTab(e: KeyboardEvent): void
    {
        if (e.shiftKey)
        {
            if (this.focusedColumnIndex > 0)
            {
                e.preventDefault();
                this.focusedColumnIndex--;
                this.focusCurrentSpinner();
            }
            else
            {
                this.previousValue = { ...this.currentValue };
                this.hideDropdown();
            }
        }
        else
        {
            if (this.focusedColumnIndex < this.units.length - 1)
            {
                e.preventDefault();
                this.focusedColumnIndex++;
                this.focusCurrentSpinner();
            }
            else
            {
                this.previousValue = { ...this.currentValue };
                this.hideDropdown();
            }
        }
    }

    private handleNumericEntry(e: KeyboardEvent): void
    {
        if (e.key.length !== 1 || !/^\d$/.test(e.key))
        {
            return;
        }

        e.preventDefault();
        this.numericBuffer += e.key;

        if (this.numericBufferTimer !== null)
        {
            clearTimeout(this.numericBufferTimer);
        }

        this.numericBufferTimer = setTimeout(() =>
        {
            this.applyNumericBuffer();
        }, 800);

        // Apply intermediate value
        const intermediateVal = parseInt(this.numericBuffer, 10);
        const unit = this.units[this.focusedColumnIndex];
        const max = getUnitMax(unit, this.units, this.options.unitMax);

        if (intermediateVal > max)
        {
            this.applyNumericBuffer();
        }
        else
        {
            this.setUnitValue(this.focusedColumnIndex, intermediateVal);
        }
    }

    private applyNumericBuffer(): void
    {
        if (this.numericBufferTimer !== null)
        {
            clearTimeout(this.numericBufferTimer);
            this.numericBufferTimer = null;
        }

        if (this.numericBuffer.length > 0)
        {
            const val = parseInt(this.numericBuffer, 10);
            this.setUnitValue(this.focusedColumnIndex, val);
            this.numericBuffer = "";
        }
    }
}

// ============================================================================
// CONVENIENCE FUNCTION
// ============================================================================

/**
 * Creates a DurationPicker in a single call.
 */
export function createDurationPicker(
    containerId: string,
    options?: DurationPickerOptions
): DurationPicker
{
    return new DurationPicker(containerId, options);
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

if (typeof window !== "undefined")
{
    (window as any)["DurationPicker"] = DurationPicker;
    (window as any)["createDurationPicker"] = createDurationPicker;
}
