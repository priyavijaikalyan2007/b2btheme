/*
 * ----------------------------------------------------------------------------
 * COMPONENT: TimePicker
 * PURPOSE: A time picker with spinner columns for hours, minutes, optional
 *    seconds, AM/PM toggle, configurable format, and optional timezone selector.
 * RELATES: [[EnterpriseTheme]], [[CustomComponents]]
 * FLOW: [Consumer App] -> [createTimePicker()] -> [DOM input + spinner dropdown]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Represents a time value with hours, minutes, and optional seconds.
 */
export interface TimeValue
{
    /** Hours (0-23). */
    hours: number;

    /** Minutes (0-59). */
    minutes: number;

    /** Seconds (0-59). Omitted when seconds are not shown. */
    seconds?: number;
}

/**
 * Configuration options for the TimePicker component.
 */
export interface TimePickerOptions
{
    /** Initial time value. Defaults to current time. */
    value?: TimeValue;

    /** Clock mode: "12" for 12-hour with AM/PM, "24" for 24-hour. Default: "24". */
    clockMode?: "12" | "24";

    /** Show seconds spinner column. Default: true. */
    showSeconds?: boolean;

    /** Time display format. Default: "HH:mm:ss" (24h) or "hh:mm:ss A" (12h). */
    format?: string;

    /** Minute step interval (1, 5, 15, 30). Default: 1. */
    minuteStep?: number;

    /** Second step interval. Default: 1. */
    secondStep?: number;

    /** Earliest selectable time. */
    minTime?: TimeValue;

    /** Latest selectable time. */
    maxTime?: TimeValue;

    /** Show the "Now" button in the dropdown footer. Default: true. */
    showNowButton?: boolean;

    /** Show the timezone selector. Default: false. */
    showTimezone?: boolean;

    /** Initial timezone (IANA string). Default: "UTC". Use "local" for browser timezone. */
    timezone?: string;

    /** Show format hint below input. Default: true. */
    showFormatHint?: boolean;

    /** Custom format hint text. Defaults to the value of format. */
    formatHint?: string;

    /** Show format help icon. Default: true. */
    showFormatHelp?: boolean;

    /** Custom help tooltip text. */
    formatHelpText?: string;

    /** When true, the component is disabled. Default: false. */
    disabled?: boolean;

    /** When true, input is not editable but dropdown works. Default: false. */
    readonly?: boolean;

    /** Placeholder text. Default: format string. */
    placeholder?: string;

    /** Size variant. Default: "default". */
    size?: "mini" | "sm" | "default" | "lg";

    /** Fired when the user selects a time. */
    onSelect?: (time: TimeValue) => void;

    /** Fired when the time value changes. */
    onChange?: (time: TimeValue | null) => void;

    /** Fired when the timezone changes. */
    onTimezoneChange?: (timezone: string) => void;

    /** Fired when the dropdown opens. */
    onOpen?: () => void;

    /** Fired when the dropdown closes. */
    onClose?: () => void;

    /** Override default key combos. Keys are action names, values are combo strings. */
    keyBindings?: Partial<Record<string, string>>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[TimePicker]";

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

const NUMERIC_ENTRY_TIMEOUT_MS = 1500;
const INVALID_STATE_DURATION_MS = 2000;

const DEFAULT_KEY_BINDINGS: Record<string, string> =
{
    // Input-level bindings
    inputOpen: "ArrowDown",
    inputEnter: "Enter",
    inputEscape: "Escape",
    // Dropdown spinner bindings
    spinnerUp: "ArrowUp",
    spinnerDown: "ArrowDown",
    spinnerLeft: "ArrowLeft",
    spinnerRight: "ArrowRight",
    spinnerPageUp: "PageUp",
    spinnerPageDown: "PageDown",
    spinnerHome: "Home",
    spinnerEnd: "End",
    spinnerEnter: "Enter",
    spinnerEscape: "Escape",
    spinnerNow: "n",
    spinnerNowUpper: "N",
    // Timezone input bindings
    tzInputOpen: "ArrowDown",
    tzInputUp: "ArrowUp",
    tzInputEnter: "Enter",
    tzInputEscape: "Escape",
    // Timezone search bindings
    tzSearchDown: "ArrowDown",
    tzSearchUp: "ArrowUp",
    tzSearchEnter: "Enter",
    tzSearchEscape: "Escape",
};

let instanceCounter = 0;

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
// PRIVATE HELPERS -- TIME UTILITIES
// ============================================================================

function cloneTime(t: TimeValue): TimeValue
{
    return {
        hours: t.hours,
        minutes: t.minutes,
        seconds: t.seconds,
    };
}

function timeToMinutes(t: TimeValue): number
{
    return (t.hours * 60) + t.minutes;
}

function timeToSeconds(t: TimeValue): number
{
    return (t.hours * 3600) + (t.minutes * 60) + (t.seconds ?? 0);
}

function isTimeBefore(a: TimeValue, b: TimeValue): boolean
{
    return timeToSeconds(a) < timeToSeconds(b);
}

function isTimeAfter(a: TimeValue, b: TimeValue): boolean
{
    return timeToSeconds(a) > timeToSeconds(b);
}

function getCurrentTimeValue(): TimeValue
{
    const now = new Date();
    return {
        hours: now.getHours(),
        minutes: now.getMinutes(),
        seconds: now.getSeconds(),
    };
}

function padTwo(n: number): string
{
    return n < 10 ? "0" + n : String(n);
}

/**
 * Wraps a value within a range, inclusive of min and max.
 */
function wrapValue(value: number, min: number, max: number): number
{
    if (value > max)
    {
        return min;
    }
    if (value < min)
    {
        return max;
    }
    return value;
}

/**
 * Snaps a value to the nearest valid step within a range.
 */
function snapToStep(value: number, step: number, max: number): number
{
    const snapped = Math.round(value / step) * step;
    if (snapped > max)
    {
        return 0;
    }
    return snapped;
}

// ============================================================================
// PRIVATE HELPERS -- FORMAT / PARSE
// ============================================================================

function formatTime(
    time: TimeValue, format: string, clockMode: "12" | "24"
): string
{
    let h = time.hours;
    let period = "AM";

    if (clockMode === "12")
    {
        period = h >= 12 ? "PM" : "AM";
        h = h % 12;
        if (h === 0)
        {
            h = 12;
        }
    }

    let result = format;
    result = result.replace("HH", padTwo(time.hours));
    result = result.replace(/(?<!H)H(?!H)/, String(time.hours));
    result = result.replace("hh", padTwo(h));
    result = result.replace(/(?<!h)h(?!h)/, String(h));
    result = result.replace("mm", padTwo(time.minutes));
    result = result.replace(/(?<!m)m(?!m)/, String(time.minutes));
    result = result.replace("ss", padTwo(time.seconds ?? 0));
    result = result.replace(/(?<!s)s(?!s)/, String(time.seconds ?? 0));
    result = result.replace(/(?<![a-zA-Z])A(?![a-zA-Z])/, period);
    result = result.replace(/(?<![a-zA-Z])a(?![a-zA-Z])/, period.toLowerCase());

    return result;
}

function parseTime(
    text: string, format: string, clockMode: "12" | "24"
): TimeValue | null
{
    let hours = -1;
    let minutes = -1;
    let seconds = 0;
    let period: string | null = null;

    let pattern = format;
    const captures: string[] = [];

    const tokenMap: [string, string][] = [
        ["HH", "(\\d{2})"],
        ["hh", "(\\d{2})"],
        ["mm", "(\\d{2})"],
        ["ss", "(\\d{2})"],
        ["H", "(\\d{1,2})"],
        ["h", "(\\d{1,2})"],
        ["m", "(\\d{1,2})"],
        ["s", "(\\d{1,2})"],
        ["A", "([AP]M)"],
        ["a", "([ap]m)"],
    ];

    for (const [token, regex] of tokenMap)
    {
        const idx = pattern.indexOf(token);
        if (idx !== -1)
        {
            captures.push(token);
            pattern = pattern.replace(token, regex);
        }
    }

    // Escape remaining special characters that could interfere
    pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, (match) =>
    {
        // Don't escape capture groups we already placed
        if (match === "(" || match === ")" || match === "\\" || match === "[" || match === "]")
        {
            return match;
        }
        return "\\" + match;
    });

    try
    {
        const re = new RegExp("^" + pattern + "$", "i");
        const match = text.trim().match(re);
        if (!match)
        {
            return null;
        }

        for (let i = 0; i < captures.length; i++)
        {
            const val = match[i + 1];
            switch (captures[i])
            {
                case "HH":
                case "H":
                    hours = parseInt(val, 10);
                    break;
                case "hh":
                case "h":
                    hours = parseInt(val, 10);
                    break;
                case "mm":
                case "m":
                    minutes = parseInt(val, 10);
                    break;
                case "ss":
                case "s":
                    seconds = parseInt(val, 10);
                    break;
                case "A":
                case "a":
                    period = val.toUpperCase();
                    break;
            }
        }
    }
    catch
    {
        return null;
    }

    if (hours < 0 || minutes < 0)
    {
        return null;
    }

    // Convert 12-hour to 24-hour
    if (clockMode === "12" && period)
    {
        if (period === "PM" && hours < 12)
        {
            hours += 12;
        }
        if (period === "AM" && hours === 12)
        {
            hours = 0;
        }
    }

    if (hours > 23 || minutes > 59 || seconds > 59)
    {
        return null;
    }

    return { hours, minutes, seconds };
}

function generateFormatExample(
    format: string, clockMode: "12" | "24"
): string
{
    const now = getCurrentTimeValue();
    return formatTime(now, format, clockMode);
}

// ============================================================================
// PRIVATE HELPERS -- TIMEZONE
// ============================================================================

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

function getTimezoneRegion(tz: string): string
{
    if (tz === "UTC")
    {
        return "Common";
    }
    const prefix = tz.split("/")[0];
    return TIMEZONE_REGIONS[prefix] ?? "Other";
}

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

// ============================================================================
// PUBLIC API
// ============================================================================

// @entrypoint
/**
 * TimePicker renders a time selector with spinner columns for each time unit.
 *
 * @example
 * const picker = new TimePicker("time-container");
 * picker.getValue(); // Returns selected TimeValue or null
 */
export class TimePicker
{
    private readonly containerId: string;
    private readonly instanceId: string;
    private options: Required<Pick<TimePickerOptions,
        "clockMode" | "showSeconds" | "format" | "minuteStep" | "secondStep"
        | "showNowButton" | "showTimezone" | "showFormatHint" | "showFormatHelp"
        | "disabled" | "readonly" | "size"
    >> & TimePickerOptions;

    // State
    private selectedTime: TimeValue | null = null;
    private previousTime: TimeValue | null = null;
    private timezone: string = "UTC";
    private isOpen = false;
    private isTzOpen = false;
    private focusedSpinnerIndex = 0;
    private numericBuffer = "";
    private numericTimer: ReturnType<typeof setTimeout> | null = null;
    private invalidTimer: ReturnType<typeof setTimeout> | null = null;
    private tzHighlightedIndex = -1;

    // DOM references
    private wrapperEl: HTMLElement | null = null;
    private inputEl: HTMLInputElement | null = null;
    private dropdownEl: HTMLElement | null = null;
    private spinnersEl: HTMLElement | null = null;
    private spinnerEls: HTMLElement[] = [];
    private hintEl: HTMLElement | null = null;
    private helpTooltipEl: HTMLElement | null = null;
    private tzInputEl: HTMLInputElement | null = null;
    private tzDropdownEl: HTMLElement | null = null;
    private tzSearchEl: HTMLInputElement | null = null;
    private tzListEl: HTMLElement | null = null;
    private tzOptionEls: HTMLElement[] = [];

    // Cached timezone data
    private allTimezones: string[] = [];
    private timezoneOffsets: Map<string, string> = new Map();

    // Bound event handlers
    private readonly boundOnDocumentClick: (e: MouseEvent) => void;
    private readonly boundOnInputKeydown: (e: KeyboardEvent) => void;
    private readonly boundOnDropdownKeydown: (e: KeyboardEvent) => void;

    constructor(containerId: string, options?: TimePickerOptions)
    {
        instanceCounter++;
        this.instanceId = `timepicker-${instanceCounter}`;
        this.containerId = containerId;

        const clockMode = options?.clockMode ?? "24";
        const showSeconds = options?.showSeconds ?? true;
        const defaultFormat = this.resolveDefaultFormat(clockMode, showSeconds);

        this.options = {
            clockMode,
            showSeconds,
            format: options?.format ?? defaultFormat,
            minuteStep: options?.minuteStep ?? 1,
            secondStep: options?.secondStep ?? 1,
            showNowButton: options?.showNowButton ?? true,
            showTimezone: options?.showTimezone ?? false,
            showFormatHint: options?.showFormatHint ?? true,
            showFormatHelp: options?.showFormatHelp ?? true,
            disabled: options?.disabled ?? false,
            readonly: options?.readonly ?? false,
            size: options?.size ?? "default",
            ...options,
        };

        // Resolve timezone
        this.timezone = resolveTimezone(this.options.timezone ?? "UTC");

        // Validate minuteStep
        if (this.options.minuteStep < 1 || this.options.minuteStep > 59)
        {
            console.warn(`${LOG_PREFIX} Invalid minuteStep; defaulting to 1`);
            this.options.minuteStep = 1;
        }
        if (60 % this.options.minuteStep !== 0)
        {
            console.warn(
                `${LOG_PREFIX} minuteStep ${this.options.minuteStep} does not divide 60 evenly; wrapping may skip values`
            );
        }

        // Set initial time
        const initialTime = this.options.value
            ? cloneTime(this.options.value)
            : getCurrentTimeValue();
        this.selectedTime = this.normalizeTime(initialTime);
        this.clampTime();
        this.previousTime = this.selectedTime
            ? cloneTime(this.selectedTime)
            : null;

        // Cache timezone data
        if (this.options.showTimezone)
        {
            this.cacheTimezoneData();
        }

        // Bind handlers
        this.boundOnDocumentClick = (e) => this.onDocumentClick(e);
        this.boundOnInputKeydown = (e) => this.onInputKeydown(e);
        this.boundOnDropdownKeydown = (e) => this.onDropdownKeydown(e);

        this.render();
        console.log(`${LOG_PREFIX} Initialised:`, this.instanceId);
    }

    // ========================================================================
    // PUBLIC METHODS
    // ========================================================================

    public getValue(): TimeValue | null
    {
        if (!this.selectedTime)
        {
            return null;
        }
        return cloneTime(this.selectedTime);
    }

    public getFormattedValue(): string
    {
        if (!this.selectedTime)
        {
            return "";
        }
        return formatTime(
            this.selectedTime,
            this.options.format,
            this.options.clockMode
        );
    }

    public getTimezone(): string
    {
        return this.timezone;
    }

    public setValue(time: TimeValue | null): void
    {
        if (time)
        {
            this.selectedTime = this.normalizeTime(cloneTime(time));
            this.clampTime();
        }
        else
        {
            this.selectedTime = null;
        }
        this.updateInput();
        if (this.isOpen)
        {
            this.renderSpinners();
        }
        this.options.onChange?.(this.getValue());
        console.debug(`${LOG_PREFIX} setValue:`, time);
    }

    public setTimezone(tz: string): void
    {
        const resolved = resolveTimezone(tz);
        this.timezone = resolved;
        if (this.tzInputEl)
        {
            this.tzInputEl.value = resolved;
        }
        this.options.onTimezoneChange?.(resolved);
        console.debug(`${LOG_PREFIX} setTimezone:`, resolved);
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

    public enable(): void
    {
        this.options.disabled = false;
        if (this.inputEl)
        {
            this.inputEl.disabled = false;
        }
        this.wrapperEl?.classList.remove("timepicker-disabled");
    }

    public disable(): void
    {
        this.options.disabled = true;
        if (this.inputEl)
        {
            this.inputEl.disabled = true;
        }
        this.wrapperEl?.classList.add("timepicker-disabled");
        if (this.isOpen)
        {
            this.hideDropdown();
        }
    }

    public setMinTime(time: TimeValue | null): void
    {
        this.options.minTime = time ?? undefined;
        this.clampTime();
        this.updateInput();
        if (this.isOpen)
        {
            this.renderSpinners();
        }
    }

    public setMaxTime(time: TimeValue | null): void
    {
        this.options.maxTime = time ?? undefined;
        this.clampTime();
        this.updateInput();
        if (this.isOpen)
        {
            this.renderSpinners();
        }
    }

    public destroy(): void
    {
        document.removeEventListener("click", this.boundOnDocumentClick);
        if (this.numericTimer)
        {
            clearTimeout(this.numericTimer);
        }
        if (this.invalidTimer)
        {
            clearTimeout(this.invalidTimer);
        }
        if (this.wrapperEl)
        {
            this.wrapperEl.remove();
            this.wrapperEl = null;
        }
        console.debug(`${LOG_PREFIX} Destroyed:`, this.instanceId);
    }

    // ========================================================================
    // PRIVATE -- INITIALISATION HELPERS
    // ========================================================================

    private resolveDefaultFormat(
        clockMode: "12" | "24", showSeconds: boolean
    ): string
    {
        if (clockMode === "12")
        {
            return showSeconds ? "hh:mm:ss A" : "hh:mm A";
        }
        return showSeconds ? "HH:mm:ss" : "HH:mm";
    }

    private normalizeTime(time: TimeValue): TimeValue
    {
        const h = Math.max(0, Math.min(23, Math.floor(time.hours)));
        const m = snapToStep(
            Math.max(0, Math.min(59, Math.floor(time.minutes))),
            this.options.minuteStep,
            59
        );
        const s = this.options.showSeconds
            ? snapToStep(
                Math.max(0, Math.min(59, Math.floor(time.seconds ?? 0))),
                this.options.secondStep,
                59
            )
            : 0;
        return { hours: h, minutes: m, seconds: s };
    }

    private clampTime(): void
    {
        if (!this.selectedTime)
        {
            return;
        }
        if (this.options.minTime && isTimeBefore(this.selectedTime, this.options.minTime))
        {
            console.warn(`${LOG_PREFIX} Value before minTime; clamped.`);
            this.selectedTime = cloneTime(this.options.minTime);
        }
        if (this.options.maxTime && isTimeAfter(this.selectedTime, this.options.maxTime))
        {
            console.warn(`${LOG_PREFIX} Value after maxTime; clamped.`);
            this.selectedTime = cloneTime(this.options.maxTime);
        }
    }

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

        this.wrapperEl = createElement("div", ["timepicker"]);
        setAttr(this.wrapperEl, "id", this.instanceId);

        if (this.options.size === "mini")
        {
            this.wrapperEl.classList.add("timepicker-mini");
        }
        else if (this.options.size === "sm")
        {
            this.wrapperEl.classList.add("timepicker-sm");
        }
        else if (this.options.size === "lg")
        {
            this.wrapperEl.classList.add("timepicker-lg");
        }
        if (this.options.disabled)
        {
            this.wrapperEl.classList.add("timepicker-disabled");
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

        // Time dropdown (hidden)
        this.dropdownEl = this.buildDropdown();
        this.wrapperEl.appendChild(this.dropdownEl);

        // Timezone dropdown (hidden, optional)
        if (this.options.showTimezone)
        {
            this.tzDropdownEl = this.buildTimezoneDropdown();
            this.wrapperEl.appendChild(this.tzDropdownEl);
        }

        container.appendChild(this.wrapperEl);
        document.addEventListener("click", this.boundOnDocumentClick);
    }

    // ========================================================================
    // PRIVATE -- INPUT GROUP
    // ========================================================================

    private buildInputGroup(): HTMLElement
    {
        const group = createElement("div", ["input-group"]);

        this.inputEl = document.createElement("input");
        this.inputEl.type = "text";
        this.inputEl.className = "form-control timepicker-input";
        setAttr(this.inputEl, "role", "combobox");
        setAttr(this.inputEl, "autocomplete", "off");
        setAttr(this.inputEl, "aria-haspopup", "dialog");
        setAttr(this.inputEl, "aria-expanded", "false");
        setAttr(
            this.inputEl,
            "aria-controls", `${this.instanceId}-dropdown`
        );

        if (this.options.showFormatHint)
        {
            setAttr(
                this.inputEl,
                "aria-describedby",
                `${this.instanceId}-format-hint`
            );
        }

        const placeholder = this.options.placeholder ?? this.options.format;
        setAttr(this.inputEl, "placeholder", placeholder);

        if (this.options.disabled)
        {
            this.inputEl.disabled = true;
        }
        if (this.options.readonly)
        {
            this.inputEl.readOnly = true;
        }

        this.updateInput();

        this.inputEl.addEventListener(
            "keydown", this.boundOnInputKeydown
        );
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

        // Clock icon toggle button
        const toggleBtn = createElement(
            "button",
            ["btn", "btn-outline-secondary", "timepicker-toggle"]
        );
        setAttr(toggleBtn, "type", "button");
        setAttr(toggleBtn, "tabindex", "-1");
        setAttr(toggleBtn, "aria-label", "Open time picker");

        const icon = createElement("i", ["bi", "bi-clock"]);
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

        group.appendChild(toggleBtn);

        // Timezone input (optional)
        if (this.options.showTimezone)
        {
            this.buildTimezoneInputIntoGroup(group);
        }

        return group;
    }

    private buildTimezoneInputIntoGroup(group: HTMLElement): void
    {
        this.tzInputEl = document.createElement("input");
        this.tzInputEl.type = "text";
        this.tzInputEl.className = "form-control timepicker-tz-input";
        this.tzInputEl.readOnly = true;
        this.tzInputEl.value = this.timezone;
        setAttr(this.tzInputEl, "role", "combobox");
        setAttr(this.tzInputEl, "aria-haspopup", "listbox");
        setAttr(this.tzInputEl, "aria-expanded", "false");
        setAttr(
            this.tzInputEl,
            "aria-controls", `${this.instanceId}-tz-listbox`
        );

        this.tzInputEl.addEventListener("click", () =>
        {
            if (!this.options.disabled)
            {
                this.toggleTimezoneDropdown();
            }
        });
        this.tzInputEl.addEventListener("keydown", (e) =>
        {
            this.onTzInputKeydown(e);
        });

        group.appendChild(this.tzInputEl);

        const tzToggle = createElement(
            "button",
            ["btn", "btn-outline-secondary", "timepicker-tz-toggle"]
        );
        setAttr(tzToggle, "type", "button");
        setAttr(tzToggle, "tabindex", "-1");
        setAttr(tzToggle, "aria-label", "Select timezone");

        const chevron = createElement("i", ["bi", "bi-chevron-down"]);
        tzToggle.appendChild(chevron);
        tzToggle.addEventListener("mousedown", (e) =>
        {
            e.preventDefault();
            if (!this.options.disabled)
            {
                this.toggleTimezoneDropdown();
            }
        });

        group.appendChild(tzToggle);
    }

    // ========================================================================
    // PRIVATE -- FORMAT HINT
    // ========================================================================

    private buildFormatHint(): HTMLElement
    {
        const hint = createElement("div", ["timepicker-hint"]);
        setAttr(hint, "id", `${this.instanceId}-format-hint`);

        const hintText = this.options.formatHint ?? this.options.format;
        const span = createElement(
            "span",
            ["timepicker-hint-text", "text-muted", "small"],
            hintText
        );
        hint.appendChild(span);

        if (this.options.showFormatHelp)
        {
            this.buildFormatHelpIntoHint(hint);
        }

        return hint;
    }

    private buildFormatHelpIntoHint(hint: HTMLElement): void
    {
        const helpBtn = createElement(
            "button", ["timepicker-help-icon"]
        );
        setAttr(helpBtn, "type", "button");
        setAttr(helpBtn, "aria-label", "Time format help");
        const helpIcon = createElement(
            "i", ["bi", "bi-question-circle"]
        );
        helpBtn.appendChild(helpIcon);
        hint.appendChild(helpBtn);

        const tooltip = createElement(
            "div", ["timepicker-help-tooltip"]
        );
        setAttr(tooltip, "role", "tooltip");
        const helpText = this.options.formatHelpText
            ?? `Enter a time in the format ${this.options.format} `
            + `(e.g., ${generateFormatExample(
                this.options.format, this.options.clockMode
            )})`;
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
        const dropdown = createElement("div", ["timepicker-dropdown"]);
        setAttr(dropdown, "id", `${this.instanceId}-dropdown`);
        setAttr(dropdown, "role", "dialog");
        setAttr(dropdown, "aria-modal", "true");
        setAttr(dropdown, "aria-label", "Choose time");
        dropdown.style.display = "none";

        dropdown.addEventListener(
            "keydown", this.boundOnDropdownKeydown
        );

        return dropdown;
    }

    private renderDropdownContent(): void
    {
        if (!this.dropdownEl)
        {
            return;
        }
        // Clear existing content safely
        while (this.dropdownEl.firstChild)
        {
            this.dropdownEl.removeChild(this.dropdownEl.firstChild);
        }

        // Spinners
        this.spinnersEl = this.buildSpinners();
        this.dropdownEl.appendChild(this.spinnersEl);

        // Footer
        const footer = this.buildFooter();
        this.dropdownEl.appendChild(footer);
    }

    // ========================================================================
    // PRIVATE -- SPINNERS
    // ========================================================================

    private buildSpinners(): HTMLElement
    {
        const container = createElement("div", ["timepicker-spinners"]);
        this.spinnerEls = [];

        // Hours spinner
        const hoursSpinner = this.buildSpinnerColumn(
            "hours", this.getHoursLabel(), this.getHoursValue(),
            this.getHoursMin(), this.getHoursMax()
        );
        container.appendChild(hoursSpinner);
        this.spinnerEls.push(hoursSpinner);

        // Separator
        container.appendChild(
            createElement("div", ["timepicker-separator"], ":")
        );

        // Minutes spinner
        const minutesSpinner = this.buildSpinnerColumn(
            "minutes", "Minutes", this.selectedTime?.minutes ?? 0,
            0, 59
        );
        container.appendChild(minutesSpinner);
        this.spinnerEls.push(minutesSpinner);

        // Seconds spinner (optional)
        if (this.options.showSeconds)
        {
            container.appendChild(
                createElement("div", ["timepicker-separator"], ":")
            );
            const secondsSpinner = this.buildSpinnerColumn(
                "seconds", "Seconds", this.selectedTime?.seconds ?? 0,
                0, 59
            );
            container.appendChild(secondsSpinner);
            this.spinnerEls.push(secondsSpinner);
        }

        // AM/PM spinner (12-hour mode only)
        if (this.options.clockMode === "12")
        {
            const ampmValue = (this.selectedTime?.hours ?? 0) >= 12 ? 1 : 0;
            const ampmSpinner = this.buildAmPmSpinner(ampmValue);
            container.appendChild(ampmSpinner);
            this.spinnerEls.push(ampmSpinner);
        }

        return container;
    }

    private renderSpinners(): void
    {
        if (!this.dropdownEl)
        {
            return;
        }
        this.renderDropdownContent();
    }

    private getHoursLabel(): string
    {
        return "Hours";
    }

    private getHoursValue(): number
    {
        const h = this.selectedTime?.hours ?? 0;
        if (this.options.clockMode === "12")
        {
            const h12 = h % 12;
            return h12 === 0 ? 12 : h12;
        }
        return h;
    }

    private getHoursMin(): number
    {
        return this.options.clockMode === "12" ? 1 : 0;
    }

    private getHoursMax(): number
    {
        return this.options.clockMode === "12" ? 12 : 23;
    }

    private buildSpinnerColumn(
        type: string, label: string, value: number,
        min: number, max: number
    ): HTMLElement
    {
        const spinner = createElement("div", ["timepicker-spinner"]);
        setAttr(spinner, "role", "spinbutton");
        setAttr(spinner, "aria-label", label);
        setAttr(spinner, "aria-valuenow", String(value));
        setAttr(spinner, "aria-valuemin", String(min));
        setAttr(spinner, "aria-valuemax", String(max));
        setAttr(spinner, "tabindex", "0");
        setAttr(spinner, "data-type", type);

        // Up button
        const upBtn = createElement(
            "button", ["timepicker-spinner-up"]
        );
        setAttr(upBtn, "type", "button");
        setAttr(upBtn, "tabindex", "-1");
        setAttr(upBtn, "aria-label", `Increase ${label.toLowerCase()}`);
        upBtn.appendChild(createElement("i", ["bi", "bi-chevron-up"]));
        upBtn.addEventListener("mousedown", (e) =>
        {
            e.preventDefault();
            this.incrementSpinner(type, 1);
        });
        spinner.appendChild(upBtn);

        // Track with prev/current/next values
        const track = this.buildSpinnerTrack(type, value, min, max);
        spinner.appendChild(track);

        // Down button
        const downBtn = createElement(
            "button", ["timepicker-spinner-down"]
        );
        setAttr(downBtn, "type", "button");
        setAttr(downBtn, "tabindex", "-1");
        setAttr(downBtn, "aria-label", `Decrease ${label.toLowerCase()}`);
        downBtn.appendChild(
            createElement("i", ["bi", "bi-chevron-down"])
        );
        downBtn.addEventListener("mousedown", (e) =>
        {
            e.preventDefault();
            this.incrementSpinner(type, -1);
        });
        spinner.appendChild(downBtn);

        // Label
        spinner.appendChild(
            createElement("div", ["timepicker-spinner-label"], label)
        );

        return spinner;
    }

    private buildSpinnerTrack(
        type: string, value: number, min: number, max: number
    ): HTMLElement
    {
        const track = createElement("div", ["timepicker-spinner-track"]);
        const step = this.getStepForType(type);

        // Previous value
        let prevVal = value - step;
        if (prevVal < min)
        {
            prevVal = max - ((min - prevVal - 1) % (max - min + 1));
        }
        const prevEl = createElement(
            "div",
            ["timepicker-spinner-value", "timepicker-spinner-adjacent"],
            padTwo(prevVal)
        );
        prevEl.addEventListener("mousedown", (e) =>
        {
            e.preventDefault();
            this.incrementSpinner(type, -1);
        });
        track.appendChild(prevEl);

        // Current value
        const currentEl = createElement(
            "div",
            ["timepicker-spinner-value", "timepicker-spinner-selected"],
            padTwo(value)
        );
        track.appendChild(currentEl);

        // Next value
        let nextVal = value + step;
        if (nextVal > max)
        {
            nextVal = min + ((nextVal - max - 1) % (max - min + 1));
        }
        const nextEl = createElement(
            "div",
            ["timepicker-spinner-value", "timepicker-spinner-adjacent"],
            padTwo(nextVal)
        );
        nextEl.addEventListener("mousedown", (e) =>
        {
            e.preventDefault();
            this.incrementSpinner(type, 1);
        });
        track.appendChild(nextEl);

        return track;
    }

    private buildAmPmSpinner(value: number): HTMLElement
    {
        const spinner = createElement(
            "div", ["timepicker-spinner", "timepicker-spinner-ampm"]
        );
        setAttr(spinner, "role", "spinbutton");
        setAttr(spinner, "aria-label", "AM or PM");
        setAttr(spinner, "aria-valuenow", String(value));
        setAttr(spinner, "aria-valuemin", "0");
        setAttr(spinner, "aria-valuemax", "1");
        setAttr(spinner, "tabindex", "0");
        setAttr(spinner, "data-type", "ampm");

        // Up button
        const upBtn = createElement(
            "button", ["timepicker-spinner-up"]
        );
        setAttr(upBtn, "type", "button");
        setAttr(upBtn, "tabindex", "-1");
        setAttr(upBtn, "aria-label", "Toggle AM/PM");
        upBtn.appendChild(createElement("i", ["bi", "bi-chevron-up"]));
        upBtn.addEventListener("mousedown", (e) =>
        {
            e.preventDefault();
            this.toggleAmPm();
        });
        spinner.appendChild(upBtn);

        // Track
        const track = createElement("div", ["timepicker-spinner-track"]);
        const labels = ["AM", "PM"];
        const otherIdx = value === 0 ? 1 : 0;

        const adjEl = createElement(
            "div",
            ["timepicker-spinner-value", "timepicker-spinner-adjacent"],
            labels[otherIdx]
        );
        adjEl.addEventListener("mousedown", (e) =>
        {
            e.preventDefault();
            this.toggleAmPm();
        });
        track.appendChild(adjEl);

        track.appendChild(createElement(
            "div",
            ["timepicker-spinner-value", "timepicker-spinner-selected"],
            labels[value]
        ));

        // Empty slot for visual balance
        track.appendChild(createElement(
            "div",
            ["timepicker-spinner-value", "timepicker-spinner-adjacent"]
        ));

        spinner.appendChild(track);

        // Down button
        const downBtn = createElement(
            "button", ["timepicker-spinner-down"]
        );
        setAttr(downBtn, "type", "button");
        setAttr(downBtn, "tabindex", "-1");
        setAttr(downBtn, "aria-label", "Toggle AM/PM");
        downBtn.appendChild(
            createElement("i", ["bi", "bi-chevron-down"])
        );
        downBtn.addEventListener("mousedown", (e) =>
        {
            e.preventDefault();
            this.toggleAmPm();
        });
        spinner.appendChild(downBtn);

        // Label
        spinner.appendChild(
            createElement("div", ["timepicker-spinner-label"], "AM/PM")
        );

        return spinner;
    }

    private getStepForType(type: string): number
    {
        if (type === "minutes")
        {
            return this.options.minuteStep;
        }
        if (type === "seconds")
        {
            return this.options.secondStep;
        }
        return 1;
    }

    // ========================================================================
    // PRIVATE -- FOOTER
    // ========================================================================

    private buildFooter(): HTMLElement
    {
        const footer = createElement("div", ["timepicker-footer"]);

        if (this.options.showNowButton)
        {
            const nowBtn = createElement(
                "button",
                ["btn", "btn-sm", "btn-link", "timepicker-now-btn"],
                "Now"
            );
            setAttr(nowBtn, "type", "button");
            setAttr(nowBtn, "aria-label", "Set to current time");

            if (this.isNowDisabled())
            {
                (nowBtn as HTMLButtonElement).disabled = true;
            }

            nowBtn.addEventListener("click", () =>
            {
                this.setToNow();
            });

            footer.appendChild(nowBtn);
        }

        return footer;
    }

    private isNowDisabled(): boolean
    {
        const now = getCurrentTimeValue();
        if (this.options.minTime && isTimeBefore(now, this.options.minTime))
        {
            return true;
        }
        if (this.options.maxTime && isTimeAfter(now, this.options.maxTime))
        {
            return true;
        }
        return false;
    }

    // ========================================================================
    // PRIVATE -- TIMEZONE DROPDOWN
    // ========================================================================

    private buildTimezoneDropdown(): HTMLElement
    {
        const dropdown = createElement("div", ["timepicker-tz-dropdown"]);
        setAttr(dropdown, "id", `${this.instanceId}-tz-listbox`);
        setAttr(dropdown, "role", "listbox");
        setAttr(dropdown, "aria-label", "Timezones");
        dropdown.style.display = "none";

        // Search input
        const searchWrapper = createElement("div", ["timepicker-tz-search"]);
        this.tzSearchEl = document.createElement("input");
        this.tzSearchEl.type = "text";
        this.tzSearchEl.className = "form-control form-control-sm";
        setAttr(this.tzSearchEl, "placeholder", "Search timezones...");
        setAttr(this.tzSearchEl, "aria-label", "Search timezones");
        this.tzSearchEl.addEventListener("input", () =>
        {
            this.filterTimezones();
        });
        this.tzSearchEl.addEventListener("keydown", (e) =>
        {
            this.onTzSearchKeydown(e);
        });
        searchWrapper.appendChild(this.tzSearchEl);
        dropdown.appendChild(searchWrapper);

        // Timezone list
        this.tzListEl = createElement("div", ["timepicker-tz-list"]);
        this.renderTimezoneList();
        dropdown.appendChild(this.tzListEl);

        return dropdown;
    }

    private renderTimezoneList(): void
    {
        if (!this.tzListEl)
        {
            return;
        }
        while (this.tzListEl.firstChild)
        {
            this.tzListEl.removeChild(this.tzListEl.firstChild);
        }
        this.tzOptionEls = [];

        // Common group first
        this.tzListEl.appendChild(
            this.buildTzGroupHeader("Common")
        );
        for (const tz of COMMON_TIMEZONES)
        {
            const option = this.buildTzOption(tz);
            this.tzListEl.appendChild(option);
            this.tzOptionEls.push(option);
        }

        // Group remaining by region
        const grouped = this.groupTimezonesByRegion();
        for (const [region, tzList] of grouped)
        {
            if (region === "Common")
            {
                continue;
            }
            this.tzListEl.appendChild(
                this.buildTzGroupHeader(region)
            );
            for (const tz of tzList)
            {
                if (COMMON_TIMEZONES.includes(tz))
                {
                    continue;
                }
                const option = this.buildTzOption(tz);
                this.tzListEl.appendChild(option);
                this.tzOptionEls.push(option);
            }
        }
    }

    private buildTzGroupHeader(label: string): HTMLElement
    {
        const header = createElement(
            "div", ["timepicker-tz-group-header"], label
        );
        setAttr(header, "aria-hidden", "true");
        return header;
    }

    private buildTzOption(tz: string): HTMLElement
    {
        const offset = this.timezoneOffsets.get(tz) ?? "";
        const display = offset ? `${tz} (${offset})` : tz;
        const option = createElement(
            "div", ["timepicker-tz-option"], display
        );
        setAttr(option, "role", "option");
        setAttr(option, "data-tz", tz);

        if (tz === this.timezone)
        {
            option.classList.add("timepicker-tz-option-selected");
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

    private filterTimezones(): void
    {
        const query = this.tzSearchEl?.value.toLowerCase() ?? "";
        let anyVisible = false;

        for (const optionEl of this.tzOptionEls)
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

        // Show/hide group headers
        if (this.tzListEl)
        {
            const headers = this.tzListEl.querySelectorAll(
                ".timepicker-tz-group-header"
            );
            headers.forEach((header) =>
            {
                (header as HTMLElement).style.display = anyVisible ? "" : "none";
            });
        }

        this.tzHighlightedIndex = -1;
    }

    private selectTimezone(tz: string): void
    {
        this.timezone = tz;
        if (this.tzInputEl)
        {
            this.tzInputEl.value = tz;
        }
        this.hideTimezoneDropdown();
        this.options.onTimezoneChange?.(tz);
        console.debug(`${LOG_PREFIX} Timezone selected:`, tz);
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

        // Close other open timepicker dropdowns
        document.querySelectorAll(
            ".timepicker-dropdown[style*='display: block']"
        ).forEach((el) =>
        {
            (el as HTMLElement).style.display = "none";
        });

        this.isOpen = true;
        this.focusedSpinnerIndex = 0;
        this.numericBuffer = "";

        this.renderDropdownContent();
        this.dropdownEl.style.display = "block";
        setAttr(this.inputEl!, "aria-expanded", "true");

        this.positionDropdown();

        // Focus the first spinner
        requestAnimationFrame(() =>
        {
            this.focusSpinner(0);
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
        setAttr(this.inputEl!, "aria-expanded", "false");
        this.options.onClose?.();
        console.debug(`${LOG_PREFIX} Dropdown closed`);
    }

    private positionDropdown(): void
    {
        if (!this.dropdownEl || !this.wrapperEl)
        {
            return;
        }
        const rect = this.wrapperEl.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const dropHeight = this.dropdownEl.offsetHeight || 250;
        const openAbove = spaceBelow < dropHeight && rect.top > spaceBelow;

        this.dropdownEl.style.position = "fixed";
        this.dropdownEl.style.left = `${rect.left}px`;

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

    private toggleTimezoneDropdown(): void
    {
        if (this.isTzOpen)
        {
            this.hideTimezoneDropdown();
        }
        else
        {
            this.showTimezoneDropdown();
        }
    }

    private showTimezoneDropdown(): void
    {
        if (!this.tzDropdownEl || this.isTzOpen)
        {
            return;
        }
        this.isTzOpen = true;
        this.tzDropdownEl.style.display = "block";
        if (this.tzInputEl)
        {
            setAttr(this.tzInputEl, "aria-expanded", "true");
        }
        this.tzHighlightedIndex = -1;

        // Reset search
        if (this.tzSearchEl)
        {
            this.tzSearchEl.value = "";
            this.filterTimezones();
        }

        requestAnimationFrame(() =>
        {
            this.tzSearchEl?.focus();
        });
    }

    private hideTimezoneDropdown(): void
    {
        if (!this.tzDropdownEl || !this.isTzOpen)
        {
            return;
        }
        this.isTzOpen = false;
        this.tzDropdownEl.style.display = "none";
        if (this.tzInputEl)
        {
            setAttr(this.tzInputEl, "aria-expanded", "false");
        }
    }

    // ========================================================================
    // PRIVATE -- SPINNER LOGIC
    // ========================================================================

    private incrementSpinner(type: string, direction: number): void
    {
        if (!this.selectedTime)
        {
            return;
        }

        const time = cloneTime(this.selectedTime);

        if (type === "hours")
        {
            this.incrementHours(time, direction);
        }
        else if (type === "minutes")
        {
            this.incrementMinutes(time, direction);
        }
        else if (type === "seconds")
        {
            this.incrementSeconds(time, direction);
        }

        this.selectedTime = time;
        this.updateInput();
        this.renderDropdownContent();
        this.focusSpinner(this.focusedSpinnerIndex);
        this.options.onChange?.(this.getValue());
    }

    private incrementHours(time: TimeValue, direction: number): void
    {
        if (this.options.clockMode === "12")
        {
            let h12 = time.hours % 12;
            if (h12 === 0)
            {
                h12 = 12;
            }
            const isPm = time.hours >= 12;
            h12 += direction;
            h12 = wrapValue(h12, 1, 12);
            time.hours = isPm ? (h12 === 12 ? 12 : h12 + 12) : (h12 === 12 ? 0 : h12);
        }
        else
        {
            time.hours = wrapValue(time.hours + direction, 0, 23);
        }
    }

    private incrementMinutes(time: TimeValue, direction: number): void
    {
        const step = this.options.minuteStep;
        let newVal = time.minutes + (direction * step);
        if (newVal > 59)
        {
            newVal = 0;
        }
        else if (newVal < 0)
        {
            newVal = 60 - step;
        }
        time.minutes = newVal;
    }

    private incrementSeconds(time: TimeValue, direction: number): void
    {
        const step = this.options.secondStep;
        let newVal = (time.seconds ?? 0) + (direction * step);
        if (newVal > 59)
        {
            newVal = 0;
        }
        else if (newVal < 0)
        {
            newVal = 60 - step;
        }
        time.seconds = newVal;
    }

    private toggleAmPm(): void
    {
        if (!this.selectedTime)
        {
            return;
        }
        if (this.selectedTime.hours >= 12)
        {
            this.selectedTime.hours -= 12;
        }
        else
        {
            this.selectedTime.hours += 12;
        }
        this.updateInput();
        this.renderDropdownContent();
        this.focusSpinner(this.focusedSpinnerIndex);
        this.options.onChange?.(this.getValue());
    }

    private setToNow(): void
    {
        const now = this.normalizeTime(getCurrentTimeValue());

        if (this.options.minTime && isTimeBefore(now, this.options.minTime))
        {
            return;
        }
        if (this.options.maxTime && isTimeAfter(now, this.options.maxTime))
        {
            return;
        }

        this.selectedTime = now;
        this.previousTime = cloneTime(now);
        this.updateInput();
        this.hideDropdown();
        this.inputEl?.focus();
        this.options.onSelect?.(cloneTime(now));
        this.options.onChange?.(cloneTime(now));
        console.debug(`${LOG_PREFIX} Set to now:`, now);
    }

    private focusSpinner(index: number): void
    {
        if (index < 0 || index >= this.spinnerEls.length)
        {
            return;
        }
        this.focusedSpinnerIndex = index;
        this.spinnerEls[index]?.focus();
    }

    private setSpinnerValueDirect(type: string, value: number): void
    {
        if (!this.selectedTime)
        {
            return;
        }

        if (type === "hours")
        {
            this.setDirectHours(value);
        }
        else if (type === "minutes")
        {
            this.selectedTime.minutes = Math.min(59, Math.max(0, value));
        }
        else if (type === "seconds")
        {
            this.selectedTime.seconds = Math.min(59, Math.max(0, value));
        }

        this.updateInput();
        this.renderDropdownContent();
        this.focusSpinner(this.focusedSpinnerIndex);
        this.options.onChange?.(this.getValue());
    }

    private setDirectHours(value: number): void
    {
        if (!this.selectedTime)
        {
            return;
        }

        if (this.options.clockMode === "12")
        {
            const clamped = Math.min(12, Math.max(1, value));
            const isPm = this.selectedTime.hours >= 12;
            if (clamped === 12)
            {
                this.selectedTime.hours = isPm ? 12 : 0;
            }
            else
            {
                this.selectedTime.hours = isPm ? clamped + 12 : clamped;
            }
        }
        else
        {
            this.selectedTime.hours = Math.min(23, Math.max(0, value));
        }
    }

    private setSpinnerToMin(type: string): void
    {
        if (type === "hours")
        {
            this.setSpinnerValueDirect(
                type, this.options.clockMode === "12" ? 1 : 0
            );
        }
        else
        {
            this.setSpinnerValueDirect(type, 0);
        }
    }

    private setSpinnerToMax(type: string): void
    {
        if (type === "hours")
        {
            this.setSpinnerValueDirect(
                type, this.options.clockMode === "12" ? 12 : 23
            );
        }
        else
        {
            this.setSpinnerValueDirect(type, 59);
        }
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
        if (this.selectedTime)
        {
            this.inputEl.value = formatTime(
                this.selectedTime,
                this.options.format,
                this.options.clockMode
            );
        }
        else
        {
            this.inputEl.value = "";
        }
    }

    private onInputBlur(): void
    {
        if (!this.inputEl || this.isOpen)
        {
            return;
        }
        const text = this.inputEl.value.trim();
        if (text === "")
        {
            this.selectedTime = null;
            this.options.onChange?.(null);
            return;
        }

        const parsed = parseTime(
            text, this.options.format, this.options.clockMode
        );
        if (parsed)
        {
            this.applyParsedTime(parsed);
        }
        else
        {
            this.handleInvalidInput(text);
        }
    }

    private applyParsedTime(parsed: TimeValue): void
    {
        const normalized = this.normalizeTime(parsed);

        // Check range
        if (this.options.minTime && isTimeBefore(normalized, this.options.minTime))
        {
            this.handleInvalidInput("out of range");
            return;
        }
        if (this.options.maxTime && isTimeAfter(normalized, this.options.maxTime))
        {
            this.handleInvalidInput("out of range");
            return;
        }

        this.selectedTime = normalized;
        this.previousTime = cloneTime(normalized);
        this.updateInput();
        this.options.onChange?.(cloneTime(normalized));
    }

    private handleInvalidInput(text: string): void
    {
        console.warn(
            `${LOG_PREFIX} Invalid time input: "${text}"; reverting.`
        );
        this.wrapperEl?.classList.add("timepicker-invalid");

        if (this.invalidTimer)
        {
            clearTimeout(this.invalidTimer);
        }
        this.invalidTimer = setTimeout(() =>
        {
            this.wrapperEl?.classList.remove("timepicker-invalid");
        }, INVALID_STATE_DURATION_MS);

        if (this.previousTime)
        {
            this.selectedTime = cloneTime(this.previousTime);
        }
        this.updateInput();
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
            "timepicker-help-tooltip-visible"
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
            "timepicker-help-tooltip-visible"
        );
    }

    private hideHelpTooltip(): void
    {
        this.helpTooltipEl?.classList.remove(
            "timepicker-help-tooltip-visible"
        );
    }

    // ========================================================================
    // PRIVATE -- KEY BINDING HELPERS
    // ========================================================================

    private resolveKeyCombo(action: string): string
    {
        return this.options.keyBindings?.[action]
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

    // ========================================================================
    // PRIVATE -- EVENT HANDLERS
    // ========================================================================

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
            if (this.isTzOpen)
            {
                this.hideTimezoneDropdown();
            }
        }
    }

    private onInputKeydown(e: KeyboardEvent): void
    {
        if (this.options.disabled)
        {
            return;
        }

        if (this.matchesKeyCombo(e, "inputOpen"))
        {
            e.preventDefault();
            this.showDropdown();
        }
        else if (this.matchesKeyCombo(e, "inputEnter"))
        {
            e.preventDefault();
            this.onInputBlur();
        }
        else if (this.matchesKeyCombo(e, "inputEscape") && this.isOpen)
        {
            e.preventDefault();
            this.hideDropdown();
        }
    }

    private onDropdownKeydown(e: KeyboardEvent): void
    {
        const spinnerEl = this.spinnerEls[this.focusedSpinnerIndex];
        const type = spinnerEl?.getAttribute("data-type") ?? "hours";

        if (this.matchesDropdownNavKey(e, type)) { return; }
        if (this.matchesDropdownActionKey(e, type)) { return; }
        this.handleNumericEntry(e, type);
    }

    private matchesDropdownNavKey(
        e: KeyboardEvent, type: string
    ): boolean
    {
        if (this.matchesKeyCombo(e, "spinnerUp"))
        {
            e.preventDefault();
            type === "ampm" ? this.toggleAmPm() : this.incrementSpinner(type, -1);
            return true;
        }
        if (this.matchesKeyCombo(e, "spinnerDown"))
        {
            e.preventDefault();
            type === "ampm" ? this.toggleAmPm() : this.incrementSpinner(type, 1);
            return true;
        }
        if (this.matchesKeyCombo(e, "spinnerLeft"))
        {
            e.preventDefault(); this.moveFocusSpinner(-1); return true;
        }
        if (this.matchesKeyCombo(e, "spinnerRight"))
        {
            e.preventDefault(); this.moveFocusSpinner(1); return true;
        }
        if (this.matchesKeyCombo(e, "spinnerPageUp"))
        {
            e.preventDefault(); this.incrementSpinner(type, -10); return true;
        }
        if (this.matchesKeyCombo(e, "spinnerPageDown"))
        {
            e.preventDefault(); this.incrementSpinner(type, 10); return true;
        }
        if (this.matchesKeyCombo(e, "spinnerHome"))
        {
            e.preventDefault(); this.setSpinnerToMin(type); return true;
        }
        if (this.matchesKeyCombo(e, "spinnerEnd"))
        {
            e.preventDefault(); this.setSpinnerToMax(type); return true;
        }
        return false;
    }

    private matchesDropdownActionKey(
        e: KeyboardEvent, _type: string
    ): boolean
    {
        if (this.matchesKeyCombo(e, "spinnerEnter"))
        {
            e.preventDefault(); this.commitAndClose(); return true;
        }
        if (this.matchesKeyCombo(e, "spinnerEscape"))
        {
            e.preventDefault();
            this.hideDropdown();
            this.inputEl?.focus();
            return true;
        }
        if (e.key === "Tab")
        {
            this.onDropdownTab(e); return true;
        }
        if (this.matchesKeyCombo(e, "spinnerNow")
            || this.matchesKeyCombo(e, "spinnerNowUpper"))
        {
            e.preventDefault(); this.setToNow(); return true;
        }
        return false;
    }

    private onDropdownTab(e: KeyboardEvent): void
    {
        if (e.shiftKey)
        {
            // Move backward
            if (this.focusedSpinnerIndex > 0)
            {
                e.preventDefault();
                this.moveFocusSpinner(-1);
            }
            else
            {
                // Let default tab take focus out
                this.hideDropdown();
            }
        }
        else
        {
            // Move forward
            if (this.focusedSpinnerIndex < this.spinnerEls.length - 1)
            {
                e.preventDefault();
                this.moveFocusSpinner(1);
            }
            else
            {
                // Last column: close and let focus move naturally
                this.hideDropdown();
            }
        }
    }

    private moveFocusSpinner(direction: number): void
    {
        const newIndex = this.focusedSpinnerIndex + direction;
        if (newIndex >= 0 && newIndex < this.spinnerEls.length)
        {
            this.numericBuffer = "";
            this.focusSpinner(newIndex);
        }
    }

    private handleNumericEntry(e: KeyboardEvent, type: string): void
    {
        if (type === "ampm")
        {
            return;
        }
        if (!/^[0-9]$/.test(e.key))
        {
            return;
        }
        e.preventDefault();

        this.numericBuffer += e.key;

        // Reset timer
        if (this.numericTimer)
        {
            clearTimeout(this.numericTimer);
        }
        this.numericTimer = setTimeout(() =>
        {
            this.numericBuffer = "";
        }, NUMERIC_ENTRY_TIMEOUT_MS);

        const value = parseInt(this.numericBuffer, 10);
        this.setSpinnerValueDirect(type, value);

        // Auto-advance after 2 digits
        if (this.numericBuffer.length >= 2)
        {
            this.numericBuffer = "";
            if (this.focusedSpinnerIndex < this.spinnerEls.length - 1)
            {
                this.moveFocusSpinner(1);
            }
        }
    }

    private commitAndClose(): void
    {
        if (this.selectedTime)
        {
            this.previousTime = cloneTime(this.selectedTime);
            this.options.onSelect?.(cloneTime(this.selectedTime));
        }
        this.hideDropdown();
        this.inputEl?.focus();
        console.debug(`${LOG_PREFIX} Time committed:`, this.selectedTime);
    }

    // ========================================================================
    // PRIVATE -- TIMEZONE EVENT HANDLERS
    // ========================================================================

    private onTzInputKeydown(e: KeyboardEvent): void
    {
        if (this.matchesKeyCombo(e, "tzInputOpen"))
        {
            e.preventDefault();
            if (!this.isTzOpen)
            {
                this.showTimezoneDropdown();
            }
            else
            {
                this.moveTzHighlight(1);
            }
        }
        else if (this.matchesKeyCombo(e, "tzInputUp"))
        {
            e.preventDefault();
            this.moveTzHighlight(-1);
        }
        else if (this.matchesKeyCombo(e, "tzInputEnter"))
        {
            e.preventDefault();
            if (this.isTzOpen && this.tzHighlightedIndex >= 0)
            {
                this.selectHighlightedTz();
            }
        }
        else if (this.matchesKeyCombo(e, "tzInputEscape"))
        {
            e.preventDefault();
            this.hideTimezoneDropdown();
        }
    }

    private onTzSearchKeydown(e: KeyboardEvent): void
    {
        if (this.matchesKeyCombo(e, "tzSearchDown"))
        {
            e.preventDefault();
            this.moveTzHighlight(1);
        }
        else if (this.matchesKeyCombo(e, "tzSearchUp"))
        {
            e.preventDefault();
            this.moveTzHighlight(-1);
        }
        else if (this.matchesKeyCombo(e, "tzSearchEnter"))
        {
            e.preventDefault();
            this.selectHighlightedTz();
        }
        else if (this.matchesKeyCombo(e, "tzSearchEscape"))
        {
            e.preventDefault();
            this.hideTimezoneDropdown();
        }
    }

    private moveTzHighlight(direction: number): void
    {
        const visibleOptions = this.getVisibleTzOptions();
        if (visibleOptions.length === 0)
        {
            return;
        }

        // Clear previous highlight
        if (this.tzHighlightedIndex >= 0 && this.tzHighlightedIndex < this.tzOptionEls.length)
        {
            this.tzOptionEls[this.tzHighlightedIndex]?.classList.remove(
                "timepicker-tz-option-highlighted"
            );
        }

        // Find next visible index
        let currentVisibleIdx = -1;
        if (this.tzHighlightedIndex >= 0)
        {
            currentVisibleIdx = visibleOptions.indexOf(
                this.tzOptionEls[this.tzHighlightedIndex]
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
        newEl.classList.add("timepicker-tz-option-highlighted");
        newEl.scrollIntoView({ block: "nearest" });
        this.tzHighlightedIndex = this.tzOptionEls.indexOf(newEl);
    }

    private getVisibleTzOptions(): HTMLElement[]
    {
        return this.tzOptionEls.filter(
            (el) => el.style.display !== "none"
        );
    }

    private selectHighlightedTz(): void
    {
        if (this.tzHighlightedIndex < 0 || this.tzHighlightedIndex >= this.tzOptionEls.length)
        {
            return;
        }
        const el = this.tzOptionEls[this.tzHighlightedIndex];
        const tz = el.getAttribute("data-tz");
        if (tz)
        {
            this.selectTimezone(tz);
        }
    }
}

// ============================================================================
// CONVENIENCE FUNCTION
// ============================================================================

/**
 * Creates a TimePicker in a single call.
 */
export function createTimePicker(
    containerId: string,
    options?: TimePickerOptions
): TimePicker
{
    return new TimePicker(containerId, options);
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

if (typeof window !== "undefined")
{
    (window as any)["TimePicker"] = TimePicker;
    (window as any)["createTimePicker"] = createTimePicker;
}
