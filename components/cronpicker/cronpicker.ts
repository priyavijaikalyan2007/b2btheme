/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: CronPicker
 * PURPOSE: A visual builder for extended 6-field CRON expressions with presets,
 *    mode-based field editors, human-readable descriptions, and bidirectional
 *    raw expression editing.
 * RELATES: [[EnterpriseTheme]], [[CustomComponents]]
 * FLOW: [Consumer App] -> [createCronPicker()] -> [DOM inline builder]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Represents a named CRON preset with a label and expression value.
 */
export interface CronPreset
{
    /** Display label for the preset. */
    label: string;

    /** CRON expression value. */
    value: string;
}

/**
 * Editing mode for a single CRON field.
 */
type CronFieldMode = "every" | "specific" | "range" | "step";

/**
 * Parsed state of a single CRON field.
 */
interface CronFieldState
{
    mode: CronFieldMode;
    specificValues: number[];
    rangeFrom: number;
    rangeTo: number;
    stepStart: number;
    stepInterval: number;
}

/**
 * Domain definition for a CRON field.
 */
interface CronFieldDef
{
    label: string;
    min: number;
    max: number;
    names?: string[];
}

/**
 * Configuration options for the CronPicker component.
 */
export interface CronPickerOptions
{
    /** Initial CRON expression. Default: "0 * * * * *" (every minute). */
    value?: string;

    /** Show the presets dropdown. Default: true. */
    showPresets?: boolean;

    /** Show the human-readable description. Default: true. */
    showDescription?: boolean;

    /** Show the raw expression input. Default: true. */
    showRawExpression?: boolean;

    /** Allow editing the raw expression input. Default: true. */
    allowRawEdit?: boolean;

    /** Show the format hint. Default: true. */
    showFormatHint?: boolean;

    /** Custom presets to display. Uses default presets when not provided. */
    presets?: CronPreset[];

    /** When true, the component is disabled. Default: false. */
    disabled?: boolean;

    /** When true, inputs are read-only. Default: false. */
    readonly?: boolean;

    /** Size variant. Default: "default". */
    size?: "sm" | "default" | "lg";

    /** Fired when the CRON expression changes. */
    onChange?: (value: string) => void;

    /** Fired when a preset is selected. */
    onPresetSelect?: (preset: CronPreset) => void;

    /** Override default key combos. Keys are action names, values are combo strings. */
    keyBindings?: Partial<Record<string, string>>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[CronPicker]";

const FIELD_DEFS: CronFieldDef[] = [
    { label: "Second", min: 0, max: 59 },
    { label: "Minute", min: 0, max: 59 },
    { label: "Hour", min: 0, max: 23 },
    { label: "Day of Month", min: 1, max: 31 },
    {
        label: "Month", min: 1, max: 12,
        names: [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
        ],
    },
    {
        label: "Day of Week", min: 0, max: 6,
        names: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    },
];

const DEFAULT_PRESETS: CronPreset[] = [
    { label: "Every second", value: "* * * * * *" },
    { label: "Every minute", value: "0 * * * * *" },
    { label: "Every hour", value: "0 0 * * * *" },
    { label: "Daily at midnight", value: "0 0 0 * * *" },
    { label: "Daily at noon", value: "0 0 12 * * *" },
    { label: "Weekdays at 9am", value: "0 0 9 * * 1-5" },
    { label: "Weekly on Monday", value: "0 0 0 * * 1" },
    { label: "Monthly on the 1st", value: "0 0 0 1 * *" },
    { label: "Yearly on Jan 1", value: "0 0 0 1 1 *" },
];

const MODE_LABELS: Record<CronFieldMode, string> = {
    every: "Every",
    specific: "Specific",
    range: "Range",
    step: "Step",
};

const DEFAULT_KEY_BINDINGS: Record<string, string> =
{
    // Raw expression input binding
    rawEnter: "Enter",
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
// PRIVATE HELPERS -- CRON PARSING
// ============================================================================

/**
 * Creates a default field state for a CRON field.
 */
function defaultFieldState(fieldIndex: number): CronFieldState
{
    const def = FIELD_DEFS[fieldIndex];
    return {
        mode: "every",
        specificValues: [],
        rangeFrom: def.min,
        rangeTo: def.max,
        stepStart: 0,
        stepInterval: 1,
    };
}

/**
 * Parses a single CRON field token into a CronFieldState.
 * Handles: *, N, N,M,O, N-M, * /N, N/M
 */
function parseFieldToken(
    token: string, fieldIndex: number
): CronFieldState
{
    const def = FIELD_DEFS[fieldIndex];
    const state = defaultFieldState(fieldIndex);

    // Every
    if (token === "*")
    {
        state.mode = "every";
        return state;
    }

    // Step: */N or N/M
    if (token.includes("/"))
    {
        state.mode = "step";
        const parts = token.split("/");
        const start = parts[0] === "*" ? 0 : parseInt(parts[0], 10);
        const interval = parseInt(parts[1], 10);
        state.stepStart = isNaN(start) ? 0 : clampValue(start, def.min, def.max);
        state.stepInterval = isNaN(interval) ? 1 : Math.max(1, interval);
        return state;
    }

    // Range: N-M
    if (token.includes("-") && !token.includes(","))
    {
        state.mode = "range";
        const parts = token.split("-");
        const from = parseInt(parts[0], 10);
        const to = parseInt(parts[1], 10);
        state.rangeFrom = isNaN(from) ? def.min : clampValue(from, def.min, def.max);
        state.rangeTo = isNaN(to) ? def.max : clampValue(to, def.min, def.max);
        return state;
    }

    // Specific: N or N,M,O (may contain ranges like 1-5,7)
    state.mode = "specific";
    state.specificValues = parseSpecificValues(token, def.min, def.max);
    return state;
}

/**
 * Parses a comma-separated list of values and ranges into an array of numbers.
 */
function parseSpecificValues(
    token: string, min: number, max: number
): number[]
{
    const values: number[] = [];
    const parts = token.split(",");

    for (const part of parts)
    {
        if (part.includes("-"))
        {
            const rangeParts = part.split("-");
            const from = parseInt(rangeParts[0], 10);
            const to = parseInt(rangeParts[1], 10);
            if (!isNaN(from) && !isNaN(to))
            {
                for (let i = from; i <= to; i++)
                {
                    if (i >= min && i <= max && !values.includes(i))
                    {
                        values.push(i);
                    }
                }
            }
        }
        else
        {
            const v = parseInt(part, 10);
            if (!isNaN(v) && v >= min && v <= max && !values.includes(v))
            {
                values.push(v);
            }
        }
    }

    values.sort((a, b) => a - b);
    return values;
}

/**
 * Clamps a numeric value within min and max bounds.
 */
function clampValue(value: number, min: number, max: number): number
{
    return Math.max(min, Math.min(max, value));
}

/**
 * Converts a CronFieldState back to its CRON token string.
 */
function fieldStateToToken(
    state: CronFieldState, fieldIndex: number
): string
{
    const def = FIELD_DEFS[fieldIndex];

    switch (state.mode)
    {
        case "every":
            return "*";

        case "specific":
        {
            if (state.specificValues.length === 0)
            {
                return "*";
            }
            return state.specificValues.join(",");
        }

        case "range":
            return `${state.rangeFrom}-${state.rangeTo}`;

        case "step":
        {
            const start = state.stepStart;
            const prefix = (start === 0 || start === def.min)
                ? "*"
                : String(start);
            return `${prefix}/${state.stepInterval}`;
        }

        default:
            return "*";
    }
}

/**
 * Parses a full 6-field CRON expression into an array of CronFieldStates.
 * Returns null if the expression is malformed.
 */
function parseCronExpression(expr: string): CronFieldState[] | null
{
    const tokens = expr.trim().split(/\s+/);
    if (tokens.length !== 6)
    {
        return null;
    }

    const states: CronFieldState[] = [];
    for (let i = 0; i < 6; i++)
    {
        states.push(parseFieldToken(tokens[i], i));
    }
    return states;
}

/**
 * Converts an array of field states back to a CRON expression string.
 */
function fieldStatesToExpression(states: CronFieldState[]): string
{
    return states.map((s, i) => fieldStateToToken(s, i)).join(" ");
}

// ============================================================================
// PRIVATE HELPERS -- DESCRIPTION GENERATOR
// ============================================================================

const MONTH_NAMES = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

const DAY_NAMES = [
    "Sunday", "Monday", "Tuesday", "Wednesday",
    "Thursday", "Friday", "Saturday",
];

/**
 * Generates a human-readable English description of a CRON expression.
 */
function generateDescription(states: CronFieldState[]): string
{
    const parts: string[] = [];

    // Time portion (second, minute, hour)
    const timePart = describeTime(states[0], states[1], states[2]);
    if (timePart)
    {
        parts.push(timePart);
    }

    // Day of month
    const domPart = describeDayOfMonth(states[3]);
    if (domPart)
    {
        parts.push(domPart);
    }

    // Month
    const monthPart = describeMonth(states[4]);
    if (monthPart)
    {
        parts.push(monthPart);
    }

    // Day of week
    const dowPart = describeDayOfWeek(states[5]);
    if (dowPart)
    {
        parts.push(dowPart);
    }

    if (parts.length === 0)
    {
        return "Every second";
    }

    return parts.join(" ");
}

/**
 * Describes the time portion (second, minute, hour) of a CRON expression.
 */
function describeTime(
    sec: CronFieldState, min: CronFieldState, hr: CronFieldState
): string
{
    // All wildcard — every second
    if (sec.mode === "every" && min.mode === "every" && hr.mode === "every")
    {
        return "Every second";
    }

    // sec=0, min=every, hr=every — every minute
    if (isFixedZero(sec) && min.mode === "every" && hr.mode === "every")
    {
        return "Every minute";
    }

    // sec=0, min=0, hr=every — every hour
    if (isFixedZero(sec) && isFixedZero(min) && hr.mode === "every")
    {
        return "Every hour";
    }

    // Step patterns
    if (sec.mode === "step")
    {
        return `Every ${sec.stepInterval} seconds`;
    }
    if (min.mode === "step" && isFixedZero(sec))
    {
        return `Every ${min.stepInterval} minutes`;
    }
    if (hr.mode === "step" && isFixedZero(sec) && isFixedZero(min))
    {
        return `Every ${hr.stepInterval} hours`;
    }
    if (hr.mode === "step" && isFixedZero(sec))
    {
        const minDesc = describeFieldValue(min, 1);
        return `At minute ${minDesc} of every ${hr.stepInterval} hours`;
    }

    // Specific time
    if (sec.mode !== "every" && min.mode !== "every" && hr.mode !== "every")
    {
        const timeStr = buildTimeString(sec, min, hr);
        return `At ${timeStr}`;
    }

    // Partial specifics
    const pieces: string[] = [];
    if (hr.mode !== "every")
    {
        pieces.push(`at hour ${describeFieldValue(hr, 2)}`);
    }
    if (min.mode !== "every")
    {
        pieces.push(`at minute ${describeFieldValue(min, 1)}`);
    }
    if (sec.mode !== "every")
    {
        pieces.push(`at second ${describeFieldValue(sec, 0)}`);
    }

    return pieces.length > 0
        ? pieces.join(", ").replace(/^a/, "A")
        : "";
}

/**
 * Checks if a field state represents a single fixed value of 0.
 */
function isFixedZero(state: CronFieldState): boolean
{
    return (state.mode === "specific"
        && state.specificValues.length === 1
        && state.specificValues[0] === 0);
}

/**
 * Builds a time string like "09:30:00" from field states.
 */
function buildTimeString(
    sec: CronFieldState, min: CronFieldState, hr: CronFieldState
): string
{
    const h = padTwo(getFirstValue(hr, 2));
    const m = padTwo(getFirstValue(min, 1));
    const s = padTwo(getFirstValue(sec, 0));
    return `${h}:${m}:${s}`;
}

/**
 * Zero-pads a number to 2 digits.
 */
function padTwo(n: number): string
{
    return n < 10 ? "0" + n : String(n);
}

/**
 * Gets the first numeric value from a field state.
 */
function getFirstValue(state: CronFieldState, fieldIndex: number): number
{
    if (state.mode === "specific" && state.specificValues.length > 0)
    {
        return state.specificValues[0];
    }
    if (state.mode === "range")
    {
        return state.rangeFrom;
    }
    return FIELD_DEFS[fieldIndex].min;
}

/**
 * Describes a single field's value for use in description text.
 */
function describeFieldValue(
    state: CronFieldState, fieldIndex: number
): string
{
    const def = FIELD_DEFS[fieldIndex];

    switch (state.mode)
    {
        case "specific":
        {
            return state.specificValues
                .map(v => formatFieldValue(v, fieldIndex))
                .join(", ");
        }
        case "range":
        {
            const from = formatFieldValue(state.rangeFrom, fieldIndex);
            const to = formatFieldValue(state.rangeTo, fieldIndex);
            return `${from} through ${to}`;
        }
        case "step":
        {
            const start = state.stepStart;
            const prefix = (start === 0 || start === def.min)
                ? ""
                : ` starting at ${formatFieldValue(start, fieldIndex)}`;
            return `every ${state.stepInterval}${prefix}`;
        }
        default:
            return "every";
    }
}

/**
 * Formats a numeric value using field-specific display names where available.
 */
function formatFieldValue(value: number, fieldIndex: number): string
{
    const def = FIELD_DEFS[fieldIndex];
    if (def.names)
    {
        const idx = value - def.min;
        if (idx >= 0 && idx < def.names.length)
        {
            return def.names[idx];
        }
    }
    return String(value);
}

/**
 * Describes the day-of-month field.
 */
function describeDayOfMonth(state: CronFieldState): string
{
    if (state.mode === "every")
    {
        return "";
    }
    return `on day ${describeFieldValue(state, 3)}`;
}

/**
 * Describes the month field.
 */
function describeMonth(state: CronFieldState): string
{
    if (state.mode === "every")
    {
        return "";
    }
    return `of ${describeFieldValue(state, 4)}`;
}

/**
 * Describes the day-of-week field.
 */
function describeDayOfWeek(state: CronFieldState): string
{
    if (state.mode === "every")
    {
        return "";
    }
    return `on ${describeFieldValue(state, 5)}`;
}

// ============================================================================
// PUBLIC API
// ============================================================================

// @entrypoint
/**
 * CronPicker renders an inline visual builder for 6-field CRON expressions.
 *
 * @example
 * const picker = new CronPicker("cron-container");
 * picker.getValue(); // "0 * * * * *"
 */
export class CronPicker
{
    private readonly containerId: string;
    private readonly instanceId: string;
    private options: Required<Pick<CronPickerOptions,
        "showPresets" | "showDescription" | "showRawExpression"
        | "allowRawEdit" | "showFormatHint" | "disabled" | "readonly" | "size"
    >> & CronPickerOptions;

    // State — one CronFieldState per CRON field
    private fieldStates: CronFieldState[] = [];
    private presets: CronPreset[];

    // DOM references
    private wrapperEl: HTMLElement | null = null;
    private presetSelectEl: HTMLSelectElement | null = null;
    private fieldRowEls: HTMLElement[] = [];
    private descriptionEl: HTMLElement | null = null;
    private rawInputEl: HTMLInputElement | null = null;
    private hintEl: HTMLElement | null = null;

    constructor(containerId: string, options?: CronPickerOptions)
    {
        instanceCounter++;
        this.instanceId = `cronpicker-${instanceCounter}`;
        this.containerId = containerId;

        this.options = {
            showPresets: options?.showPresets ?? true,
            showDescription: options?.showDescription ?? true,
            showRawExpression: options?.showRawExpression ?? true,
            allowRawEdit: options?.allowRawEdit ?? true,
            showFormatHint: options?.showFormatHint ?? true,
            disabled: options?.disabled ?? false,
            readonly: options?.readonly ?? false,
            size: options?.size ?? "default",
            ...options,
        };

        this.presets = this.options.presets ?? DEFAULT_PRESETS;

        // Parse initial expression
        const initial = this.options.value ?? "0 * * * * *";
        this.fieldStates = parseCronExpression(initial)
            ?? this.createDefaultStates();

        this.render();
        console.log(`${LOG_PREFIX} Initialised:`, this.instanceId);
    }

    // ========================================================================
    // PUBLIC METHODS
    // ========================================================================

    /**
     * Returns the current CRON expression string.
     */
    public getValue(): string
    {
        return fieldStatesToExpression(this.fieldStates);
    }

    /**
     * Returns the human-readable description of the current expression.
     */
    public getDescription(): string
    {
        return generateDescription(this.fieldStates);
    }

    /**
     * Sets the CRON expression programmatically and updates the UI.
     */
    public setValue(cron: string): void
    {
        const parsed = parseCronExpression(cron);
        if (!parsed)
        {
            console.warn(`${LOG_PREFIX} Invalid CRON expression:`, cron);
            return;
        }
        this.fieldStates = parsed;
        this.syncUIFromState();
        this.options.onChange?.(this.getValue());
        console.debug(`${LOG_PREFIX} setValue:`, cron);
    }

    /**
     * Resets the component to the default expression.
     */
    public clear(): void
    {
        this.fieldStates = parseCronExpression("0 * * * * *")
            ?? this.createDefaultStates();
        this.syncUIFromState();
        this.options.onChange?.(this.getValue());
        console.debug(`${LOG_PREFIX} Cleared to default`);
    }

    /**
     * Enables the component.
     */
    public enable(): void
    {
        this.options.disabled = false;
        this.wrapperEl?.classList.remove("cronpicker-disabled");
        this.setAllInputsDisabled(false);
    }

    /**
     * Disables the component.
     */
    public disable(): void
    {
        this.options.disabled = true;
        this.wrapperEl?.classList.add("cronpicker-disabled");
        this.setAllInputsDisabled(true);
    }

    /**
     * Removes the component from the DOM and cleans up.
     */
    public destroy(): void
    {
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
     * Creates default field states (every minute: 0 * * * * *).
     */
    private createDefaultStates(): CronFieldState[]
    {
        const states: CronFieldState[] = [];
        for (let i = 0; i < 6; i++)
        {
            states.push(defaultFieldState(i));
        }
        // Second = specific 0
        states[0].mode = "specific";
        states[0].specificValues = [0];
        return states;
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

        this.wrapperEl = createElement("div", ["cronpicker"]);
        setAttr(this.wrapperEl, "id", this.instanceId);

        if (this.options.size === "sm")
        {
            this.wrapperEl.classList.add("cronpicker-sm");
        }
        else if (this.options.size === "lg")
        {
            this.wrapperEl.classList.add("cronpicker-lg");
        }
        if (this.options.disabled)
        {
            this.wrapperEl.classList.add("cronpicker-disabled");
        }

        // Presets dropdown
        if (this.options.showPresets)
        {
            this.wrapperEl.appendChild(this.buildPresets());
        }

        // Field builder rows
        const fieldsContainer = createElement("div", ["cronpicker-fields"]);
        this.fieldRowEls = [];
        for (let i = 0; i < 6; i++)
        {
            const row = this.buildFieldRow(i);
            fieldsContainer.appendChild(row);
            this.fieldRowEls.push(row);
        }
        this.wrapperEl.appendChild(fieldsContainer);

        // Description
        if (this.options.showDescription)
        {
            this.descriptionEl = this.buildDescription();
            this.wrapperEl.appendChild(this.descriptionEl);
        }

        // Raw expression input
        if (this.options.showRawExpression)
        {
            this.wrapperEl.appendChild(this.buildRawExpression());
        }

        // Format hint
        if (this.options.showFormatHint)
        {
            this.hintEl = this.buildFormatHint();
            this.wrapperEl.appendChild(this.hintEl);
        }

        container.appendChild(this.wrapperEl);
    }

    // ========================================================================
    // PRIVATE -- PRESETS
    // ========================================================================

    /**
     * Builds the presets dropdown section.
     */
    private buildPresets(): HTMLElement
    {
        const wrapper = createElement("div", ["cronpicker-presets"]);

        const label = createElement(
            "label", ["form-label", "cronpicker-presets-label"], "Preset"
        );
        setAttr(label, "for", `${this.instanceId}-preset`);
        wrapper.appendChild(label);

        this.presetSelectEl = document.createElement("select");
        this.presetSelectEl.className = "form-select form-select-sm";
        setAttr(this.presetSelectEl, "id", `${this.instanceId}-preset`);

        // Default empty option
        const emptyOpt = document.createElement("option");
        emptyOpt.value = "";
        emptyOpt.textContent = "Choose a preset...";
        this.presetSelectEl.appendChild(emptyOpt);

        for (const preset of this.presets)
        {
            const opt = document.createElement("option");
            opt.value = preset.value;
            opt.textContent = preset.label;
            this.presetSelectEl.appendChild(opt);
        }

        if (this.options.disabled)
        {
            this.presetSelectEl.disabled = true;
        }

        this.presetSelectEl.addEventListener("change", () =>
        {
            this.onPresetChange();
        });

        wrapper.appendChild(this.presetSelectEl);
        return wrapper;
    }

    /**
     * Handles preset dropdown change events.
     */
    private onPresetChange(): void
    {
        if (!this.presetSelectEl)
        {
            return;
        }
        const value = this.presetSelectEl.value;
        if (!value)
        {
            return;
        }

        const parsed = parseCronExpression(value);
        if (!parsed)
        {
            return;
        }

        this.fieldStates = parsed;
        this.syncUIFromState();

        const preset = this.presets.find(p => p.value === value);
        if (preset)
        {
            this.options.onPresetSelect?.(preset);
        }
        this.options.onChange?.(this.getValue());
        console.debug(`${LOG_PREFIX} Preset selected:`, value);
    }

    // ========================================================================
    // PRIVATE -- FIELD ROWS
    // ========================================================================

    /**
     * Builds a single field row with label, mode buttons, and value editor.
     */
    private buildFieldRow(fieldIndex: number): HTMLElement
    {
        const def = FIELD_DEFS[fieldIndex];
        const state = this.fieldStates[fieldIndex];

        const row = createElement("div", ["cronpicker-field"]);
        setAttr(row, "data-field-index", String(fieldIndex));

        // Header with label and mode buttons
        const header = createElement("div", ["cronpicker-field-header"]);

        const label = createElement(
            "div", ["cronpicker-field-label"], def.label
        );
        header.appendChild(label);

        const modeGroup = this.buildModeButtons(fieldIndex, state.mode);
        header.appendChild(modeGroup);

        row.appendChild(header);

        // Value editor
        const valueEl = this.buildValueEditor(fieldIndex, state);
        row.appendChild(valueEl);

        return row;
    }

    /**
     * Builds the mode selector button group for a field.
     */
    private buildModeButtons(
        fieldIndex: number, activeMode: CronFieldMode
    ): HTMLElement
    {
        const group = createElement("div", ["cronpicker-field-mode"]);
        setAttr(group, "role", "radiogroup");
        setAttr(
            group, "aria-label",
            `${FIELD_DEFS[fieldIndex].label} mode`
        );

        const modes: CronFieldMode[] = ["every", "specific", "range", "step"];
        for (const mode of modes)
        {
            const btn = createElement(
                "button", ["cronpicker-mode-btn"], MODE_LABELS[mode]
            );
            setAttr(btn, "type", "button");
            setAttr(
                btn, "aria-pressed",
                mode === activeMode ? "true" : "false"
            );

            if (mode === activeMode)
            {
                btn.classList.add("cronpicker-mode-btn-active");
            }
            if (this.options.disabled || this.options.readonly)
            {
                (btn as HTMLButtonElement).disabled = true;
            }

            btn.addEventListener("click", () =>
            {
                this.onModeChange(fieldIndex, mode);
            });

            group.appendChild(btn);
        }

        return group;
    }

    /**
     * Builds the value editor for a field based on its current mode.
     */
    private buildValueEditor(
        fieldIndex: number, state: CronFieldState
    ): HTMLElement
    {
        const wrapper = createElement("div", ["cronpicker-field-value"]);

        switch (state.mode)
        {
            case "every":
                wrapper.appendChild(this.buildEveryEditor());
                break;
            case "specific":
                wrapper.appendChild(
                    this.buildSpecificEditor(fieldIndex, state)
                );
                break;
            case "range":
                wrapper.appendChild(
                    this.buildRangeEditor(fieldIndex, state)
                );
                break;
            case "step":
                wrapper.appendChild(
                    this.buildStepEditor(fieldIndex, state)
                );
                break;
        }

        return wrapper;
    }

    /**
     * Builds the "every" mode editor (just a text label).
     */
    private buildEveryEditor(): HTMLElement
    {
        return createElement(
            "span", ["text-muted", "small"], "Every value"
        );
    }

    /**
     * Builds the "specific" mode editor as a chip grid.
     */
    private buildSpecificEditor(
        fieldIndex: number, state: CronFieldState
    ): HTMLElement
    {
        const def = FIELD_DEFS[fieldIndex];
        const grid = createElement("div", ["cronpicker-multi-select"]);
        setAttr(grid, "role", "group");
        setAttr(
            grid, "aria-label",
            `Select ${def.label.toLowerCase()} values`
        );

        for (let v = def.min; v <= def.max; v++)
        {
            const isSelected = state.specificValues.includes(v);
            const displayText = def.names
                ? def.names[v - def.min]
                : String(v);

            const chip = createElement(
                "button", ["cronpicker-value-chip"], displayText
            );
            setAttr(chip, "type", "button");
            setAttr(chip, "role", "checkbox");
            setAttr(chip, "aria-checked", isSelected ? "true" : "false");
            setAttr(chip, "data-value", String(v));

            if (isSelected)
            {
                chip.classList.add("cronpicker-value-chip-selected");
            }
            if (this.options.disabled || this.options.readonly)
            {
                (chip as HTMLButtonElement).disabled = true;
            }

            chip.addEventListener("click", () =>
            {
                this.onChipToggle(fieldIndex, v);
            });

            grid.appendChild(chip);
        }

        return grid;
    }

    /**
     * Builds the "range" mode editor with from and to inputs.
     */
    private buildRangeEditor(
        fieldIndex: number, state: CronFieldState
    ): HTMLElement
    {
        const def = FIELD_DEFS[fieldIndex];
        const wrapper = createElement("div", ["cronpicker-range-inputs"]);

        const fromInput = this.createNumberInput(
            `${def.label} from`,
            state.rangeFrom,
            def.min,
            def.max
        );
        fromInput.addEventListener("change", () =>
        {
            const val = parseInt(fromInput.value, 10);
            if (!isNaN(val))
            {
                this.fieldStates[fieldIndex].rangeFrom = clampValue(
                    val, def.min, def.max
                );
                this.onFieldChange();
            }
        });

        const toInput = this.createNumberInput(
            `${def.label} to`,
            state.rangeTo,
            def.min,
            def.max
        );
        toInput.addEventListener("change", () =>
        {
            const val = parseInt(toInput.value, 10);
            if (!isNaN(val))
            {
                this.fieldStates[fieldIndex].rangeTo = clampValue(
                    val, def.min, def.max
                );
                this.onFieldChange();
            }
        });

        wrapper.appendChild(
            createElement("span", ["small", "text-muted"], "From")
        );
        wrapper.appendChild(fromInput);
        wrapper.appendChild(
            createElement("span", ["small", "text-muted"], "to")
        );
        wrapper.appendChild(toInput);

        return wrapper;
    }

    /**
     * Builds the "step" mode editor with start and interval inputs.
     */
    private buildStepEditor(
        fieldIndex: number, state: CronFieldState
    ): HTMLElement
    {
        const def = FIELD_DEFS[fieldIndex];
        const wrapper = createElement("div", ["cronpicker-step-inputs"]);

        const startInput = this.createNumberInput(
            `${def.label} start`,
            state.stepStart,
            def.min,
            def.max
        );
        startInput.addEventListener("change", () =>
        {
            const val = parseInt(startInput.value, 10);
            if (!isNaN(val))
            {
                this.fieldStates[fieldIndex].stepStart = clampValue(
                    val, def.min, def.max
                );
                this.onFieldChange();
            }
        });

        const intervalInput = this.createNumberInput(
            `${def.label} interval`,
            state.stepInterval,
            1,
            def.max
        );
        intervalInput.addEventListener("change", () =>
        {
            const val = parseInt(intervalInput.value, 10);
            if (!isNaN(val))
            {
                this.fieldStates[fieldIndex].stepInterval = Math.max(1, val);
                this.onFieldChange();
            }
        });

        wrapper.appendChild(
            createElement("span", ["small", "text-muted"], "Start at")
        );
        wrapper.appendChild(startInput);
        wrapper.appendChild(
            createElement("span", ["small", "text-muted"], "every")
        );
        wrapper.appendChild(intervalInput);

        return wrapper;
    }

    /**
     * Creates a small number input element.
     */
    private createNumberInput(
        label: string, value: number, min: number, max: number
    ): HTMLInputElement
    {
        const input = document.createElement("input");
        input.type = "number";
        input.className = "form-control form-control-sm";
        input.value = String(value);
        setAttr(input, "min", String(min));
        setAttr(input, "max", String(max));
        setAttr(input, "aria-label", label);
        input.style.width = "4.5rem";

        if (this.options.disabled || this.options.readonly)
        {
            input.disabled = true;
        }

        return input;
    }

    // ========================================================================
    // PRIVATE -- DESCRIPTION
    // ========================================================================

    /**
     * Builds the human-readable description block.
     */
    private buildDescription(): HTMLElement
    {
        const desc = createElement("div", ["cronpicker-description"]);
        setAttr(desc, "aria-live", "polite");
        desc.textContent = generateDescription(this.fieldStates);
        return desc;
    }

    // ========================================================================
    // PRIVATE -- RAW EXPRESSION
    // ========================================================================

    /**
     * Builds the raw expression input section.
     */
    private buildRawExpression(): HTMLElement
    {
        const wrapper = createElement("div", ["cronpicker-raw"]);

        const label = createElement(
            "label",
            ["form-label", "small", "text-muted"],
            "CRON Expression"
        );
        setAttr(label, "for", `${this.instanceId}-raw`);
        wrapper.appendChild(label);

        this.rawInputEl = document.createElement("input");
        this.rawInputEl.type = "text";
        this.rawInputEl.className = "form-control cronpicker-raw-input";
        setAttr(this.rawInputEl, "id", `${this.instanceId}-raw`);
        setAttr(this.rawInputEl, "aria-label", "CRON expression");
        setAttr(this.rawInputEl, "autocomplete", "off");
        setAttr(this.rawInputEl, "spellcheck", "false");
        this.rawInputEl.value = fieldStatesToExpression(this.fieldStates);

        if (!this.options.allowRawEdit || this.options.readonly)
        {
            this.rawInputEl.readOnly = true;
        }
        if (this.options.disabled)
        {
            this.rawInputEl.disabled = true;
        }

        // Bidirectional sync: raw → visual on blur or Enter
        this.rawInputEl.addEventListener("blur", () =>
        {
            this.onRawExpressionBlur();
        });
        this.rawInputEl.addEventListener("keydown", (e) =>
        {
            if (this.matchesKeyCombo(e, "rawEnter"))
            {
                e.preventDefault();
                this.onRawExpressionBlur();
            }
        });

        wrapper.appendChild(this.rawInputEl);
        return wrapper;
    }

    /**
     * Builds the format hint text showing field order.
     */
    private buildFormatHint(): HTMLElement
    {
        const hint = createElement(
            "div",
            ["cronpicker-hint", "small", "text-muted"],
            "second  minute  hour  day  month  weekday"
        );
        return hint;
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

    /**
     * Handles mode button clicks for a field.
     * Switches the field to the selected mode and rebuilds its editor.
     */
    private onModeChange(
        fieldIndex: number, mode: CronFieldMode
    ): void
    {
        if (this.options.disabled || this.options.readonly)
        {
            return;
        }
        this.fieldStates[fieldIndex].mode = mode;

        // Reset specific values when switching to specific mode
        if (mode === "specific")
        {
            this.fieldStates[fieldIndex].specificValues = [];
        }

        this.rebuildFieldRow(fieldIndex);
        this.onFieldChange();
    }

    /**
     * Handles chip toggle clicks in specific mode.
     */
    private onChipToggle(fieldIndex: number, value: number): void
    {
        if (this.options.disabled || this.options.readonly)
        {
            return;
        }
        const state = this.fieldStates[fieldIndex];
        const idx = state.specificValues.indexOf(value);

        if (idx >= 0)
        {
            state.specificValues.splice(idx, 1);
        }
        else
        {
            state.specificValues.push(value);
            state.specificValues.sort((a, b) => a - b);
        }

        this.rebuildFieldRow(fieldIndex);
        this.onFieldChange();
    }

    /**
     * Called whenever any visual field changes. Updates description,
     * raw input, preset dropdown, and fires onChange.
     */
    private onFieldChange(): void
    {
        const expr = fieldStatesToExpression(this.fieldStates);

        // Update raw input
        if (this.rawInputEl)
        {
            this.rawInputEl.value = expr;
        }

        // Update description
        this.updateDescription();

        // Update preset dropdown to match (or deselect)
        this.syncPresetDropdown(expr);

        // Clear invalid state
        this.wrapperEl?.classList.remove("cronpicker-invalid");

        this.options.onChange?.(expr);
    }

    /**
     * Handles blur on the raw expression input.
     * Parses the input and updates the visual builder if valid.
     */
    private onRawExpressionBlur(): void
    {
        if (!this.rawInputEl)
        {
            return;
        }
        const expr = this.rawInputEl.value.trim();
        if (!expr)
        {
            return;
        }

        const parsed = parseCronExpression(expr);
        if (!parsed)
        {
            console.warn(
                `${LOG_PREFIX} Invalid CRON expression: "${expr}"`
            );
            this.wrapperEl?.classList.add("cronpicker-invalid");
            return;
        }

        this.wrapperEl?.classList.remove("cronpicker-invalid");
        this.fieldStates = parsed;
        this.rebuildAllFieldRows();
        this.updateDescription();
        this.syncPresetDropdown(expr);
        this.options.onChange?.(expr);
    }

    // ========================================================================
    // PRIVATE -- UI SYNC
    // ========================================================================

    /**
     * Rebuilds a single field row after a state change.
     */
    private rebuildFieldRow(fieldIndex: number): void
    {
        const oldRow = this.fieldRowEls[fieldIndex];
        if (!oldRow || !oldRow.parentNode)
        {
            return;
        }
        const newRow = this.buildFieldRow(fieldIndex);
        oldRow.parentNode.replaceChild(newRow, oldRow);
        this.fieldRowEls[fieldIndex] = newRow;
    }

    /**
     * Rebuilds all six field rows.
     */
    private rebuildAllFieldRows(): void
    {
        for (let i = 0; i < 6; i++)
        {
            this.rebuildFieldRow(i);
        }
    }

    /**
     * Updates the description element with the current expression.
     */
    private updateDescription(): void
    {
        if (this.descriptionEl)
        {
            this.descriptionEl.textContent = generateDescription(
                this.fieldStates
            );
        }
    }

    /**
     * Syncs the preset dropdown to match the current expression,
     * or deselects if no preset matches.
     */
    private syncPresetDropdown(expr: string): void
    {
        if (!this.presetSelectEl)
        {
            return;
        }
        const matchingPreset = this.presets.find(p => p.value === expr);
        this.presetSelectEl.value = matchingPreset ? matchingPreset.value : "";
    }

    /**
     * Fully syncs the UI from the current field states.
     * Called after setValue, clear, or preset changes.
     */
    private syncUIFromState(): void
    {
        this.rebuildAllFieldRows();
        this.updateDescription();

        if (this.rawInputEl)
        {
            this.rawInputEl.value = fieldStatesToExpression(this.fieldStates);
        }

        this.syncPresetDropdown(
            fieldStatesToExpression(this.fieldStates)
        );

        this.wrapperEl?.classList.remove("cronpicker-invalid");
    }

    /**
     * Sets disabled state on all interactive inputs within the component.
     */
    private setAllInputsDisabled(disabled: boolean): void
    {
        if (!this.wrapperEl)
        {
            return;
        }
        const inputs = this.wrapperEl.querySelectorAll(
            "input, select, button"
        );
        inputs.forEach((el) =>
        {
            (el as HTMLInputElement).disabled = disabled;
        });
    }
}

// ============================================================================
// CONVENIENCE FUNCTION
// ============================================================================

/**
 * Creates a CronPicker in a single call.
 */
export function createCronPicker(
    containerId: string,
    options?: CronPickerOptions
): CronPicker
{
    return new CronPicker(containerId, options);
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

if (typeof window !== "undefined")
{
    (window as any)["CronPicker"] = CronPicker;
    (window as any)["createCronPicker"] = createCronPicker;
}
