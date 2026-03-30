/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: Gauge
 * 📜 PURPOSE: A visual measure component modeled after the ASN.1 Gauge type.
 *    Supports tile (square), ring (circular SVG), and bar (linear) shapes
 *    with value and time modes, configurable colour thresholds, and
 *    auto-tick countdown for time mode.
 * 🔗 RELATES: [[EnterpriseTheme]], [[CustomComponents]], [[GaugeStyles]]
 * ⚡ FLOW: [Consumer App] -> [createGauge()] -> [DOM gauge element]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// S1: TYPES AND INTERFACES
// ============================================================================

/** Gauge visual shape. */
export type GaugeShape = "tile" | "ring" | "bar";

/** Gauge data mode. */
export type GaugeMode = "value" | "time";

/** Predefined gauge sizes. */
export type GaugeSize = "xs" | "sm" | "md" | "lg" | "xl";

/** Bar orientation (bar shape only). */
export type BarOrientation = "horizontal" | "vertical";

/**
 * A colour threshold that activates when the gauge percentage
 * crosses the given value.
 */
export interface GaugeThreshold
{
    /** Percentage (0-100) at which this threshold activates. */
    value: number;

    /** CSS colour string (hex, rgb, hsl, named). */
    color: string;

    /** Optional human-readable label (e.g., "Warning"). */
    label?: string;
}

/**
 * Configuration options for the Gauge component.
 */
export interface GaugeOptions
{
    /** Visual shape of the gauge. Required. */
    shape: GaugeShape;

    /** Data mode: "value" for numeric, "time" for countdown. Default: "value". */
    mode?: GaugeMode;

    // -- Value mode fields --

    /** Current value. Default: 0. */
    value?: number;

    /** Minimum value. Default: 0. */
    min?: number;

    /** Maximum value. Default: 100. */
    max?: number;

    /** Unit label (e.g., "GiB", "licenses", "%"). */
    unit?: string;

    // -- Time mode fields --

    /** Target date for countdown. Required when mode is "time". */
    targetDate?: Date | string;

    /** Enable auto-tick timer. Default: true when targetDate is set. */
    autoTick?: boolean;

    // -- Display --

    /** Gauge title/name (shown in tile footer or ring/bar label). */
    title?: string;

    /** Subtitle text (shown below value in tile). */
    subtitle?: string;

    /** Predefined size or explicit pixel value. Omit for fluid. */
    size?: GaugeSize | number;

    /** Bar orientation. Default: "horizontal". */
    orientation?: BarOrientation;

    // -- Thresholds --

    /** Colour thresholds sorted ascending by value. */
    thresholds?: GaugeThreshold[];

    /** If true, lower percentage = worse (e.g., remaining). Default: false. */
    invertThresholds?: boolean;

    /** Colour when value exceeds max. Default: "#dc3545". */
    overLimitColor?: string;

    /** Label for over-limit state. Default: "Over Limit". */
    overLimitLabel?: string;

    /** Colour when target date has passed. Default: "#dc3545". */
    overdueColor?: string;

    /** Label for overdue state. Default: "Overdue". */
    overdueLabel?: string;

    // -- Formatting --

    /** Custom value formatter. Overrides default formatting. */
    formatValue?: (value: number, max: number, unit: string) => string;

    // -- Styling --

    /** Additional CSS classes on the root element. */
    cssClass?: string;

    /** Accessible label for screen readers. Auto-generated if omitted. */
    ariaLabel?: string;

    /** Background colour override (tile shape). */
    backgroundColor?: string;

    /** Text colour override. */
    textColor?: string;

    // -- Callbacks --

    /** Fires when value or time changes. */
    onChange?: (gauge: Gauge) => void;

    /** Fires when gauge crosses into over-limit state. */
    onOverLimit?: () => void;

    /** Fires when gauge crosses into overdue state. */
    onOverdue?: () => void;
}

// ============================================================================
// S1b: CONSTANTS
// ============================================================================

const LOG_PREFIX = "[Gauge]";

const _lu = (typeof (window as any).createLogUtility === "function") ? (window as any).createLogUtility().getLogger(LOG_PREFIX.slice(1, -1)) : null;
function logInfo(...a: unknown[]): void { _lu ? _lu.info(...a) : console.log(new Date().toISOString(), "[INFO]", LOG_PREFIX, ...a); }
function logWarn(...a: unknown[]): void { _lu ? _lu.warn(...a) : console.warn(new Date().toISOString(), "[WARN]", LOG_PREFIX, ...a); }
function logError(...a: unknown[]): void { _lu ? _lu.error(...a) : console.error(new Date().toISOString(), "[ERROR]", LOG_PREFIX, ...a); }
function logDebug(...a: unknown[]): void { _lu ? _lu.debug(...a) : console.debug(new Date().toISOString(), "[DEBUG]", LOG_PREFIX, ...a); }
function logTrace(...a: unknown[]): void { _lu ? _lu.trace(...a) : console.debug(new Date().toISOString(), "[TRACE]", LOG_PREFIX, ...a); }

let instanceCounter = 0;

/** Size preset pixel values. */
const SIZE_MAP: Record<GaugeSize, number> = {
    xs: 80,
    sm: 120,
    md: 180,
    lg: 260,
    xl: 360,
};

/** Default thresholds for normal mode (higher % = better). */
const DEFAULT_THRESHOLDS: GaugeThreshold[] = [
    { value: 70, color: "#2b8a3e", label: "Good" },
    { value: 30, color: "#e67700", label: "Warning" },
    { value: 10, color: "#d9480f", label: "Danger" },
    { value: 0,  color: "#c92a2a", label: "Critical" },
];

/** Default over-limit / overdue colour. */
const DEFAULT_OVER_COLOR = "#dc3545";

/**
 * Auto-tick interval thresholds. Each entry says:
 * "if remaining ms is below `threshold`, tick every `interval` ms."
 */
const TICK_INTERVALS: Array<{ threshold: number; interval: number }> = [
    { threshold: 300_000,       interval: 1_000 },       // <5 min → 1s
    { threshold: 7_200_000,     interval: 60_000 },      // <2 h   → 1m
    { threshold: 86_400_000,    interval: 300_000 },     // <1 d   → 5m
    { threshold: Infinity,      interval: 3_600_000 },   // else   → 1h
];

/** SVG ring constants (viewBox 0 0 100 100). */
const RING_RADIUS = 45;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const RING_STROKE_WIDTH = 8;

/** SVG namespace. */
const SVG_NS = "http://www.w3.org/2000/svg";

// ============================================================================
// S2: DOM HELPERS
// ============================================================================

/**
 * Creates an HTML element with optional CSS classes and text.
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
 * Sets an attribute on an element.
 */
function setAttr(
    el: HTMLElement | SVGElement, name: string, value: string
): void
{
    el.setAttribute(name, value);
}

/**
 * Creates an SVG element with attributes.
 */
function createSVGElement(
    tag: string, attrs: Record<string, string>
): SVGElement
{
    const el = document.createElementNS(SVG_NS, tag);

    for (const [key, val] of Object.entries(attrs))
    {
        el.setAttribute(key, val);
    }

    return el;
}

/**
 * Clamps a number between min and max.
 */
function clamp(value: number, min: number, max: number): number
{
    return Math.max(min, Math.min(max, value));
}

// ============================================================================
// S3: FORMATTING HELPERS
// ============================================================================

/**
 * Formats milliseconds into a human-readable remaining time string.
 *
 * Positive ms → "10d", "2d 5h", "1h 23m", "5m 12s", "45s"
 * Negative ms → uses absolute value (caller handles "Overdue:" prefix)
 */
function formatTimeRemaining(ms: number): string
{
    const abs = Math.abs(ms);
    const seconds = Math.floor(abs / 1_000);
    const minutes = Math.floor(abs / 60_000);
    const hours = Math.floor(abs / 3_600_000);
    const days = Math.floor(abs / 86_400_000);

    if (days >= 1)
    {
        const remHours = Math.floor((abs % 86_400_000) / 3_600_000);
        return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
    }

    if (hours >= 1)
    {
        const remMinutes = Math.floor((abs % 3_600_000) / 60_000);
        return remMinutes > 0 ? `${hours}h ${remMinutes}m` : `${hours}h`;
    }

    if (minutes >= 1)
    {
        const remSeconds = Math.floor((abs % 60_000) / 1_000);
        return remSeconds > 0 ? `${minutes}m ${remSeconds}s` : `${minutes}m`;
    }

    return `${seconds}s`;
}

/**
 * Returns the appropriate setInterval delay based on remaining time.
 */
function computeTickInterval(remainingMs: number): number
{
    const abs = Math.abs(remainingMs);

    for (const entry of TICK_INTERVALS)
    {
        if (abs < entry.threshold)
        {
            return entry.interval;
        }
    }

    return TICK_INTERVALS[TICK_INTERVALS.length - 1].interval;
}

/**
 * Finds the first threshold that matches a percentage in a sorted array.
 *
 * @param percentage - Current gauge percentage (0-100).
 * @param sorted     - Pre-sorted threshold array.
 * @param comparator - Returns true when the threshold matches.
 */
function findMatchingThreshold(
    percentage: number,
    sorted: GaugeThreshold[],
    comparator: (pct: number, tv: number) => boolean
): GaugeThreshold
{
    for (const t of sorted)
    {
        if (comparator(percentage, t.value))
        {
            return t;
        }
    }

    return sorted[sorted.length - 1];
}

/**
 * Evaluates which threshold applies to the given percentage.
 *
 * Normal mode (higher is better): descending sort, first pct >= threshold.
 * Inverted mode (lower is worse): ascending sort, first pct <= threshold.
 */
function evaluateThreshold(
    percentage: number,
    thresholds: GaugeThreshold[],
    inverted: boolean
): GaugeThreshold | null
{
    if (thresholds.length === 0)
    {
        return null;
    }

    const sorted = [...thresholds];

    if (inverted)
    {
        sorted.sort((a, b) => a.value - b.value);
        return findMatchingThreshold(percentage, sorted,
            (pct, tv) => pct <= tv);
    }

    sorted.sort((a, b) => b.value - a.value);
    return findMatchingThreshold(percentage, sorted,
        (pct, tv) => pct >= tv);
}

/**
 * Formats a value for display. Uses custom formatter if provided.
 */
function formatDisplayValue(
    value: number,
    max: number,
    unit: string,
    formatter?: (v: number, m: number, u: string) => string
): string
{
    if (formatter)
    {
        return formatter(value, max, unit);
    }

    const valStr = unit ? `${value} ${unit}` : String(value);
    return valStr;
}

/**
 * Formats the subtitle for value mode.
 */
function formatSubtitle(
    max: number, unit: string, subtitle?: string
): string
{
    if (subtitle)
    {
        return subtitle;
    }

    return unit ? `of ${max} ${unit}` : `of ${max}`;
}

// ============================================================================
// S4: GAUGE CLASS
// ============================================================================

/**
 * Gauge renders a visual measure component supporting tile, ring, and bar
 * shapes with value and time modes, configurable thresholds, and optional
 * auto-tick countdown.
 */
export class Gauge
{
    private readonly instanceId: string;
    private readonly opts: GaugeOptions;
    private readonly mode: GaugeMode;
    private readonly shape: GaugeShape;

    // State
    private currentValue: number = 0;
    private currentPercentage: number = 0;
    private visible: boolean = false;
    private destroyed: boolean = false;
    private wasOverLimit: boolean = false;
    private wasOverdue: boolean = false;

    // Timer
    private tickTimer: ReturnType<typeof setInterval> | null = null;
    private currentTickInterval: number = 0;

    // DOM references
    private rootEl: HTMLElement | null = null;
    private valueDisplayEl: HTMLElement | null = null;
    private subtitleEl: HTMLElement | null = null;
    private titleEl: HTMLElement | null = null;

    // Ring-specific SVG references
    private ringFillEl: SVGElement | null = null;

    // Bar-specific reference
    private barFillEl: HTMLElement | null = null;

    // ---- Constructor ----

    /**
     * Creates a new Gauge instance and builds its DOM.
     *
     * @param options - Configuration for the gauge (shape, mode, thresholds, etc.).
     */
    constructor(options: GaugeOptions)
    {
        instanceCounter += 1;
        this.instanceId = `gauge-${instanceCounter}`;

        this.opts = { ...options };
        this.shape = options.shape;
        this.mode = options.mode || "value";

        this.initDefaults();
        this.currentValue = this.mode === "time"
            ? this.calculateTimeValue()
            : (this.opts.value ?? 0);
        this.currentPercentage = this.computePercentage();

        this.buildDOM();

        logInfo("Initialised:", this.instanceId,
            `shape=${this.shape}`, `mode=${this.mode}`);
        logDebug("Options:", this.opts);
    }

    /**
     * Normalises input options and applies defaults.
     */
    private initDefaults(): void
    {
        if (this.opts.targetDate && typeof this.opts.targetDate === "string")
        {
            this.opts.targetDate = new Date(this.opts.targetDate);
        }

        if (this.opts.min === undefined) { this.opts.min = 0; }
        if (this.opts.max === undefined) { this.opts.max = 100; }

        if (!this.opts.thresholds)
        {
            this.opts.thresholds = [...DEFAULT_THRESHOLDS];
        }
    }

    // ---- Lifecycle ----

    /**
     * Appends the gauge to a container and makes it visible.
     *
     * @param container - Element ID string or HTMLElement. Defaults to document.body.
     */
    public show(container?: string | HTMLElement): void
    {
        if (this.destroyed)
        {
            logWarn("Cannot show destroyed gauge.");
            return;
        }

        if (this.visible || !this.rootEl)
        {
            if (this.visible) { logWarn("Already visible."); }
            if (!this.rootEl) { logError("DOM not built."); }
            return;
        }

        const target = this.resolveContainer(container);
        target.appendChild(this.rootEl);
        this.visible = true;
        this.updateDisplay();
        this.initAutoTickIfNeeded();

        logDebug("Shown in container.");
    }

    /**
     * Starts auto-tick if conditions are met (time mode, enabled, has target).
     */
    private initAutoTickIfNeeded(): void
    {
        if (this.mode === "time" && this.opts.autoTick !== false
            && this.opts.targetDate)
        {
            this.startAutoTick();
        }
    }

    /**
     * Removes from DOM without destroying state.
     */
    public hide(): void
    {
        if (!this.visible || !this.rootEl)
        {
            return;
        }

        this.stopAutoTick();
        this.rootEl.remove();
        this.visible = false;

        logDebug("Hidden.");
    }

    /**
     * Hides and releases all references and timers.
     */
    public destroy(): void
    {
        if (this.destroyed)
        {
            return;
        }

        this.hide();
        this.rootEl = null;
        this.valueDisplayEl = null;
        this.subtitleEl = null;
        this.titleEl = null;
        this.ringFillEl = null;
        this.barFillEl = null;
        this.destroyed = true;

        logDebug("Destroyed:", this.instanceId);
    }

    // ---- Public Value API ----

    /**
     * Updates the gauge value and refreshes the display.
     */
    public setValue(value: number): void
    {
        if (this.destroyed)
        {
            logWarn("Cannot update destroyed gauge.");
            return;
        }

        this.currentValue = value;
        this.currentPercentage = this.computePercentage();
        this.updateDisplay();
        this.checkOverCallbacks();

        if (this.opts.onChange)
        {
            try { this.opts.onChange(this); }
            catch (err) { logError("onChange error:", err); }
        }
    }

    /**
     * Updates the target date and restarts auto-tick if enabled.
     */
    public setTargetDate(date: Date | string): void
    {
        if (this.destroyed)
        {
            logWarn("Cannot update destroyed gauge.");
            return;
        }

        this.opts.targetDate = typeof date === "string" ? new Date(date) : date;
        this.currentValue = this.calculateTimeValue();
        this.currentPercentage = this.computePercentage();
        this.updateDisplay();

        if (this.opts.autoTick !== false && this.visible)
        {
            this.startAutoTick();
        }
    }

    /**
     * Replaces the threshold configuration and refreshes display.
     */
    public setThresholds(thresholds: GaugeThreshold[]): void
    {
        this.opts.thresholds = [...thresholds];
        this.updateDisplay();
    }

    /** Returns the current value. */
    public getValue(): number { return this.currentValue; }

    /** Returns the current percentage (0-100, may exceed 100 if over-limit). */
    public getPercentage(): number { return this.currentPercentage; }

    /** Returns true if value exceeds max (value mode). */
    public isOverLimit(): boolean
    {
        return this.mode === "value"
            && this.currentValue > (this.opts.max ?? 100);
    }

    /** Returns true if target date has passed (time mode). */
    public isOverdue(): boolean
    {
        if (this.mode !== "time" || !this.opts.targetDate)
        {
            return false;
        }

        const target = this.opts.targetDate instanceof Date
            ? this.opts.targetDate
            : new Date(this.opts.targetDate);
        return Date.now() > target.getTime();
    }

    /** Returns visibility state. */
    public isVisible(): boolean { return this.visible; }

    /** Returns the root DOM element. */
    public getElement(): HTMLElement | null { return this.rootEl; }

    // ---- Private: DOM Construction ----

    /**
     * Builds the gauge DOM based on shape.
     */
    private buildDOM(): void
    {
        switch (this.shape)
        {
            case "tile":
                this.rootEl = this.buildTile();
                break;
            case "ring":
                this.rootEl = this.buildRing();
                break;
            case "bar":
                this.rootEl = this.buildBar();
                break;
            default:
                logError("Unknown shape:", this.shape);
                this.rootEl = this.buildTile();
        }

        this.applySizeToRoot();
        this.applyCustomStyles();
        this.setAriaAttributes();
    }

    /**
     * Builds the tile (square) DOM structure.
     */
    private buildTile(): HTMLElement
    {
        const root = createElement("div", ["gauge", "gauge-tile"]);
        setAttr(root, "id", this.instanceId);

        const content = createElement("div", ["gauge-tile-content"]);
        this.valueDisplayEl = createElement("span", ["gauge-tile-value"]);
        this.subtitleEl = createElement("span", ["gauge-tile-subtitle"]);

        content.appendChild(this.valueDisplayEl);
        content.appendChild(this.subtitleEl);
        root.appendChild(content);

        if (this.opts.title)
        {
            this.titleEl = createElement(
                "div", ["gauge-tile-title"], this.opts.title
            );
            root.appendChild(this.titleEl);
        }

        return root;
    }

    /**
     * Builds the ring (circular SVG) DOM structure.
     */
    private buildRing(): HTMLElement
    {
        const root = createElement("div", ["gauge", "gauge-ring"]);
        setAttr(root, "id", this.instanceId);

        root.appendChild(this.buildRingSVG());
        root.appendChild(this.buildRingCenter());

        return root;
    }

    /**
     * Builds the SVG element with track and fill circles for the ring.
     */
    private buildRingSVG(): SVGElement
    {
        const svg = createSVGElement("svg", { "viewBox": "0 0 100 100" });
        const r = String(RING_RADIUS);

        const track = createSVGElement("circle", {
            "class": "gauge-ring-track", "cx": "50", "cy": "50", "r": r,
        });

        this.ringFillEl = createSVGElement("circle", {
            "class": "gauge-ring-fill", "cx": "50", "cy": "50", "r": r,
            "stroke-dasharray": String(RING_CIRCUMFERENCE),
            "stroke-dashoffset": String(RING_CIRCUMFERENCE),
        });

        svg.appendChild(track);
        svg.appendChild(this.ringFillEl);
        return svg;
    }

    /**
     * Builds the centre text overlay for the ring.
     */
    private buildRingCenter(): HTMLElement
    {
        const center = createElement("div", ["gauge-ring-center"]);
        this.valueDisplayEl = createElement("span", ["gauge-ring-value"]);
        center.appendChild(this.valueDisplayEl);

        if (this.opts.title)
        {
            this.subtitleEl = createElement(
                "span", ["gauge-ring-label"], this.opts.title
            );
            center.appendChild(this.subtitleEl);
        }

        return center;
    }

    /**
     * Builds the bar (linear) DOM structure.
     */
    private buildBar(): HTMLElement
    {
        const isVert = (this.opts.orientation === "vertical");
        const orientClass = isVert ? "gauge-bar-vertical" : "gauge-bar-horizontal";
        const root = createElement("div", ["gauge", "gauge-bar", orientClass]);
        setAttr(root, "id", this.instanceId);

        if (this.opts.title)
        {
            this.titleEl = createElement(
                "span", ["gauge-bar-label"], this.opts.title
            );
            root.appendChild(this.titleEl);
        }

        const track = createElement("div", ["gauge-bar-track"]);
        this.barFillEl = createElement("div", ["gauge-bar-fill"]);
        track.appendChild(this.barFillEl);
        root.appendChild(track);

        this.valueDisplayEl = createElement("span", ["gauge-bar-value"]);
        root.appendChild(this.valueDisplayEl);

        return root;
    }

    /**
     * Applies size classes or explicit pixel dimensions to the root.
     */
    private applySizeToRoot(): void
    {
        if (!this.rootEl)
        {
            return;
        }

        if (this.opts.size === undefined)
        {
            this.rootEl.classList.add("gauge-fluid");
            return;
        }

        if (typeof this.opts.size === "string")
        {
            this.rootEl.classList.add(`gauge-${this.opts.size}`);
            return;
        }

        this.applyExplicitSize(this.opts.size);
    }

    /**
     * Applies an explicit pixel size to the root element.
     *
     * @param pixels - Pixel dimension to apply.
     */
    private applyExplicitSize(pixels: number): void
    {
        if (!this.rootEl)
        {
            return;
        }

        const px = `${pixels}px`;

        if (this.shape === "tile" || this.shape === "ring")
        {
            this.rootEl.style.width = px;
            this.rootEl.style.height = px;
        }
        else if (this.opts.orientation === "vertical")
        {
            this.rootEl.style.height = px;
        }
        else
        {
            this.rootEl.style.width = px;
        }
    }

    /**
     * Applies optional custom colour overrides.
     */
    private applyCustomStyles(): void
    {
        if (!this.rootEl)
        {
            return;
        }

        if (this.opts.textColor)
        {
            this.rootEl.style.color = this.opts.textColor;
        }

        if (this.opts.cssClass)
        {
            this.rootEl.classList.add(...this.opts.cssClass.split(" "));
        }
    }

    /**
     * Sets ARIA attributes on the root element.
     */
    private setAriaAttributes(): void
    {
        if (!this.rootEl)
        {
            return;
        }

        const role = (this.mode === "time") ? "timer" : "meter";
        setAttr(this.rootEl, "role", role);
        setAttr(this.rootEl, "aria-valuemin",
            String(this.opts.min ?? 0));
        setAttr(this.rootEl, "aria-valuemax",
            String(this.opts.max ?? 100));

        this.updateAriaAttributes();
    }

    // ---- Private: Display Update ----

    /**
     * Recalculates and redraws the gauge display.
     */
    private updateDisplay(): void
    {
        if (!this.rootEl)
        {
            return;
        }

        this.currentPercentage = this.computePercentage();
        const color = this.getCurrentColor();
        const isOver = this.isOverLimit() || this.isOverdue();

        // Update state class
        this.rootEl.classList.toggle("gauge-overlimit", this.isOverLimit());
        this.rootEl.classList.toggle("gauge-overdue", this.isOverdue());

        // Dispatch to shape-specific updater
        switch (this.shape)
        {
            case "tile":
                this.updateTileDisplay(color, isOver);
                break;
            case "ring":
                this.updateRingDisplay(color);
                break;
            case "bar":
                this.updateBarDisplay(color);
                break;
        }

        this.updateAriaAttributes();
    }

    /**
     * Updates the tile display.
     */
    private updateTileDisplay(color: string, isOver: boolean): void
    {
        if (!this.rootEl || !this.valueDisplayEl)
        {
            return;
        }

        // Set background colour
        this.rootEl.style.backgroundColor =
            this.opts.backgroundColor || color;

        // Value text
        this.valueDisplayEl.textContent = this.getFormattedValue(isOver);

        // Subtitle
        if (this.subtitleEl)
        {
            this.subtitleEl.textContent = this.getSubtitleText(isOver);
        }
    }

    /**
     * Updates the ring display.
     */
    private updateRingDisplay(color: string): void
    {
        if (!this.ringFillEl || !this.valueDisplayEl)
        {
            return;
        }

        // Calculate stroke-dashoffset from percentage
        const pct = clamp(this.currentPercentage, 0, 100);
        const offset = RING_CIRCUMFERENCE * (1 - pct / 100);
        this.ringFillEl.setAttribute(
            "stroke-dashoffset", String(offset)
        );
        this.ringFillEl.setAttribute("stroke", color);

        // Centre value text
        const isOver = this.isOverLimit() || this.isOverdue();
        this.valueDisplayEl.textContent = this.getFormattedValue(isOver);

        // Update value colour for ring (text inherits from parent)
        this.valueDisplayEl.style.color = color;
    }

    /**
     * Updates the bar display.
     */
    private updateBarDisplay(color: string): void
    {
        if (!this.barFillEl || !this.valueDisplayEl)
        {
            return;
        }

        const pct = clamp(this.currentPercentage, 0, 100);
        const isVert = (this.opts.orientation === "vertical");

        if (isVert)
        {
            this.barFillEl.style.height = `${pct}%`;
            this.barFillEl.style.width = "";
        }
        else
        {
            this.barFillEl.style.width = `${pct}%`;
            this.barFillEl.style.height = "";
        }

        this.barFillEl.style.backgroundColor = color;

        // Value text
        const isOver = this.isOverLimit() || this.isOverdue();
        this.valueDisplayEl.textContent = this.getFormattedValue(isOver);
    }

    /**
     * Updates ARIA value and label attributes.
     */
    private updateAriaAttributes(): void
    {
        if (!this.rootEl)
        {
            return;
        }

        setAttr(this.rootEl, "aria-valuenow",
            String(Math.round(this.currentValue)));

        const label = this.opts.ariaLabel
            || this.buildAriaLabel();
        setAttr(this.rootEl, "aria-label", label);
    }

    /**
     * Builds an auto-generated ARIA label.
     */
    private buildAriaLabel(): string
    {
        const title = this.opts.title || "Gauge";

        if (this.mode === "time")
        {
            if (this.isOverdue())
            {
                const label = this.opts.overdueLabel || "Overdue";
                return `${title}: ${label}`;
            }

            return `${title}: ${formatTimeRemaining(this.currentValue)} remaining`;
        }

        const unit = this.opts.unit || "";
        const max = this.opts.max ?? 100;

        if (this.isOverLimit())
        {
            const label = this.opts.overLimitLabel || "Over Limit";
            return `${title}: ${label}`;
        }

        return `${title}: ${this.currentValue} ${unit} of ${max} ${unit}`.trim();
    }

    // ---- Private: Value Formatting ----

    /**
     * Returns the formatted primary value text.
     */
    private getFormattedValue(isOver: boolean): string
    {
        if (this.mode === "time")
        {
            return this.getTimeDisplayText(isOver);
        }

        if (isOver && this.isOverLimit())
        {
            return this.opts.overLimitLabel || "Over Limit";
        }

        return formatDisplayValue(
            this.currentValue,
            this.opts.max ?? 100,
            this.opts.unit || "",
            this.opts.formatValue
        );
    }

    /**
     * Returns the formatted time display text.
     */
    private getTimeDisplayText(isOver: boolean): string
    {
        const remaining = this.calculateTimeValue();
        const timeStr = formatTimeRemaining(remaining);

        if (isOver && remaining < 0)
        {
            const label = this.opts.overdueLabel || "Overdue";
            return `${label}: ${timeStr}`;
        }

        return timeStr;
    }

    /**
     * Returns the subtitle text.
     */
    private getSubtitleText(isOver: boolean): string
    {
        if (this.opts.subtitle)
        {
            return this.opts.subtitle;
        }

        if (this.mode === "time")
        {
            if (this.opts.targetDate)
            {
                const target = this.opts.targetDate instanceof Date
                    ? this.opts.targetDate
                    : new Date(this.opts.targetDate);
                return target.toLocaleDateString();
            }

            return "";
        }

        // Value mode
        if (isOver && this.isOverLimit())
        {
            const over = this.currentValue - (this.opts.max ?? 100);
            const unit = this.opts.unit || "";
            return unit ? `${over} ${unit} over` : `${over} over`;
        }

        return formatSubtitle(
            this.opts.max ?? 100,
            this.opts.unit || ""
        );
    }

    // ---- Private: Computation ----

    /**
     * Computes the current percentage from value and min/max.
     */
    private computePercentage(): number
    {
        const min = this.opts.min ?? 0;
        const max = this.opts.max ?? 100;
        const range = max - min;

        if (range <= 0)
        {
            return 0;
        }

        return ((this.currentValue - min) / range) * 100;
    }

    /**
     * Returns remaining milliseconds to targetDate (negative if overdue).
     */
    private calculateTimeValue(): number
    {
        if (!this.opts.targetDate)
        {
            return 0;
        }

        const target = this.opts.targetDate instanceof Date
            ? this.opts.targetDate
            : new Date(this.opts.targetDate);
        return target.getTime() - Date.now();
    }

    /**
     * Returns the current threshold colour.
     */
    private getCurrentColor(): string
    {
        // Over-limit / overdue → distinct colour
        if (this.isOverLimit())
        {
            return this.opts.overLimitColor || DEFAULT_OVER_COLOR;
        }

        if (this.isOverdue())
        {
            return this.opts.overdueColor || DEFAULT_OVER_COLOR;
        }

        // Evaluate threshold
        const thresholds = this.opts.thresholds || DEFAULT_THRESHOLDS;
        const inverted = this.opts.invertThresholds || false;
        const pct = clamp(this.currentPercentage, 0, 100);
        const threshold = evaluateThreshold(pct, thresholds, inverted);

        if (threshold)
        {
            return threshold.color;
        }

        // Fallback grey
        return "#868e96";
    }

    /**
     * Checks and fires over-limit / overdue callbacks if state changed.
     */
    private checkOverCallbacks(): void
    {
        const overLimit = this.isOverLimit();
        const overdue = this.isOverdue();

        if (overLimit && !this.wasOverLimit && this.opts.onOverLimit)
        {
            try { this.opts.onOverLimit(); }
            catch (err)
            {
                logError("onOverLimit error:", err);
            }
        }

        if (overdue && !this.wasOverdue && this.opts.onOverdue)
        {
            try { this.opts.onOverdue(); }
            catch (err)
            {
                logError("onOverdue error:", err);
            }
        }

        this.wasOverLimit = overLimit;
        this.wasOverdue = overdue;
    }

    // ---- Private: Time Mode Auto-tick ----

    /**
     * Starts or restarts the auto-tick timer.
     */
    private startAutoTick(): void
    {
        this.stopAutoTick();

        const remaining = this.calculateTimeValue();
        this.currentTickInterval = computeTickInterval(remaining);

        this.tickTimer = setInterval(() =>
        {
            this.onTick();
        }, this.currentTickInterval);

        logDebug("Auto-tick started:",
            `interval=${this.currentTickInterval}ms`);
    }

    /**
     * Stops the auto-tick timer.
     */
    private stopAutoTick(): void
    {
        if (this.tickTimer !== null)
        {
            clearInterval(this.tickTimer);
            this.tickTimer = null;
            this.currentTickInterval = 0;
        }
    }

    /**
     * Handles each tick of the auto-tick timer.
     */
    private onTick(): void
    {
        if (this.destroyed || !this.visible)
        {
            this.stopAutoTick();
            return;
        }

        const remaining = this.calculateTimeValue();
        this.currentValue = remaining;
        this.currentPercentage = this.computePercentage();
        this.updateDisplay();
        this.checkOverCallbacks();

        // Adapt interval if boundary crossed
        const newInterval = computeTickInterval(remaining);

        if (newInterval !== this.currentTickInterval)
        {
            this.startAutoTick();
        }

        if (this.opts.onChange)
        {
            try { this.opts.onChange(this); }
            catch (err)
            {
                logError("onChange error:", err);
            }
        }
    }

    // ---- Private: Utility ----

    /**
     * Resolves a container parameter to an HTMLElement.
     */
    private resolveContainer(
        container?: string | HTMLElement
    ): HTMLElement
    {
        if (!container)
        {
            return document.body;
        }

        if (typeof container === "string")
        {
            const el = document.getElementById(container);

            if (!el)
            {
                logWarn("Container not found:",
                    container, "— using document.body.");
                return document.body;
            }

            return el;
        }

        return container;
    }
}

// ============================================================================
// S5: CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Creates a gauge, shows it in the given container, and returns the instance.
 */
export function createGauge(
    options: GaugeOptions,
    container?: string | HTMLElement
): Gauge
{
    const gauge = new Gauge(options);
    gauge.show(container);
    return gauge;
}

/**
 * Shorthand for creating a tile gauge.
 */
export function createTileGauge(
    options: Omit<GaugeOptions, "shape">,
    container?: string | HTMLElement
): Gauge
{
    return createGauge({ ...options, shape: "tile" }, container);
}

/**
 * Shorthand for creating a ring gauge.
 */
export function createRingGauge(
    options: Omit<GaugeOptions, "shape">,
    container?: string | HTMLElement
): Gauge
{
    return createGauge({ ...options, shape: "ring" }, container);
}

/**
 * Shorthand for creating a bar gauge.
 */
export function createBarGauge(
    options: Omit<GaugeOptions, "shape">,
    container?: string | HTMLElement
): Gauge
{
    return createGauge({ ...options, shape: "bar" }, container);
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

if (typeof window !== "undefined")
{
    (window as any)["Gauge"] = Gauge;
    (window as any)["createGauge"] = createGauge;
    (window as any)["createTileGauge"] = createTileGauge;
    (window as any)["createRingGauge"] = createRingGauge;
    (window as any)["createBarGauge"] = createBarGauge;
}
