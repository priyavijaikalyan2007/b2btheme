/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: Slider
 * 📜 PURPOSE: Range input component with single-value and dual-thumb range modes,
 *             tick marks, value labels, keyboard navigation, and size variants.
 * 🔗 RELATES: [[EnterpriseTheme]], [[Magnifier]], [[ColorPicker]]
 * ⚡ FLOW: [Consumer App] -> [createSlider()] -> [DOM Slider Element]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// S1: INTERFACES
// ============================================================================

/** Configuration options for the Slider component. */
export interface SliderOptions
{
    /** Slider mode. Default: "single". */
    mode?: "single" | "range";
    /** Minimum value. Default: 0. */
    min?: number;
    /** Maximum value. Default: 100. */
    max?: number;
    /** Step increment. Default: 1. */
    step?: number;
    /** Current value (single mode). Default: 50. */
    value?: number;
    /** Low value (range mode). Default: 25. */
    valueLow?: number;
    /** High value (range mode). Default: 75. */
    valueHigh?: number;
    /** Label text above the slider. */
    label?: string;
    /** Show the current value label. Default: true. */
    showValue?: boolean;
    /** Show tick marks along the track. Default: false. */
    showTicks?: boolean;
    /** Interval between tick marks. Defaults to step. */
    tickInterval?: number;
    /** Custom value formatter. */
    formatValue?: (v: number) => string;
    /** Disable the slider. Default: false. */
    disabled?: boolean;
    /** Orientation. Default: "horizontal". */
    orientation?: "horizontal" | "vertical";
    /** Size variant. Default: "default". */
    size?: "mini" | "sm" | "default" | "lg";
    /** Fired when value changes. */
    onChange?: (value: number | { low: number; high: number }) => void;
    /** Fired when drag starts. */
    onSlideStart?: () => void;
    /** Fired when drag ends. */
    onSlideEnd?: () => void;
}

/** Public handle returned by createSlider(). */
export interface SliderHandle
{
    getValue(): number;
    getRange(): { low: number; high: number };
    setValue(v: number): void;
    setRange(low: number, high: number): void;
    setMin(v: number): void;
    setMax(v: number): void;
    setStep(v: number): void;
    enable(): void;
    disable(): void;
    getElement(): HTMLElement;
    destroy(): void;
}

// ============================================================================
// S2: CONSTANTS
// ============================================================================

const LOG_PREFIX = "[Slider]";
const CLS = "slider";
let instanceCounter = 0;

const KEY_LEFT = "ArrowLeft";
const KEY_RIGHT = "ArrowRight";
const KEY_UP = "ArrowUp";
const KEY_DOWN = "ArrowDown";
const KEY_HOME = "Home";
const KEY_END = "End";
const KEY_PAGE_UP = "PageUp";
const KEY_PAGE_DOWN = "PageDown";
const PAGE_STEP_MULTIPLIER = 10;

// ============================================================================
// S3: DOM HELPERS
// ============================================================================

/** Create an element with optional CSS classes and text. */
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

/** Set multiple attributes on an element. */
function setAttr(
    el: HTMLElement, attrs: Record<string, string>
): void
{
    for (const key of Object.keys(attrs))
    {
        el.setAttribute(key, attrs[key]);
    }
}

/** Invoke callback safely, catching and logging errors. */
function safeCallback<T extends unknown[]>(
    fn: ((...a: T) => void) | undefined, ...args: T
): void
{
    if (!fn) { return; }

    try
    {
        fn(...args);
    }
    catch (err)
    {
        console.error(LOG_PREFIX, "callback error:", err);
    }
}

/** Clamp a number between min and max. */
function clamp(val: number, min: number, max: number): number
{
    return Math.min(Math.max(val, min), max);
}

/** Snap a value to the nearest step. */
function snapToStep(val: number, min: number, step: number): number
{
    if (step <= 0) { return val; }

    const steps = Math.round((val - min) / step);

    return min + (steps * step);
}

/** Convert a pixel position percentage to a value. */
function pctToValue(pct: number, min: number, max: number): number
{
    return min + (pct * (max - min));
}

/** Convert a value to a percentage of the range. */
function valueToPct(val: number, min: number, max: number): number
{
    if (max === min) { return 0; }

    return (val - min) / (max - min);
}

// ============================================================================
// S4: SLIDER CLASS
// ============================================================================

class SliderImpl
{
    private readonly instanceId: number;
    private opts: Required<Pick<SliderOptions, "min" | "max" | "step">> & SliderOptions;
    private mode: "single" | "range";
    private value: number;
    private valueLow: number;
    private valueHigh: number;
    private isDisabled: boolean;
    private destroyed = false;
    private orientation: "horizontal" | "vertical";

    // DOM
    private rootEl: HTMLElement;
    private trackWrap: HTMLElement;
    private trackEl: HTMLElement;
    private fillEl: HTMLElement;
    private thumbEl: HTMLElement;
    private thumbLowEl: HTMLElement | null = null;
    private thumbHighEl: HTMLElement | null = null;
    private valueLabelEl: HTMLElement | null = null;
    private tickContainer: HTMLElement | null = null;

    // Drag state
    private activeThumb: "single" | "low" | "high" | null = null;

    constructor(options: SliderOptions)
    {
        this.instanceId = ++instanceCounter;
        this.opts = {
            min: 0,
            max: 100,
            step: 1,
            ...options,
        };
        this.mode = this.opts.mode ?? "single";
        this.orientation = this.opts.orientation ?? "horizontal";
        this.isDisabled = this.opts.disabled ?? false;
        this.value = clamp(this.opts.value ?? 50, this.opts.min, this.opts.max);
        this.valueLow = clamp(this.opts.valueLow ?? 25, this.opts.min, this.opts.max);
        this.valueHigh = clamp(this.opts.valueHigh ?? 75, this.opts.min, this.opts.max);

        this.rootEl = this.buildRoot();
        this.trackWrap = this.rootEl.querySelector(`.${CLS}-track-wrap`) as HTMLElement;
        this.trackEl = this.rootEl.querySelector(`.${CLS}-track`) as HTMLElement;
        this.fillEl = this.rootEl.querySelector(`.${CLS}-fill`) as HTMLElement;
        this.thumbEl = this.rootEl.querySelector(`.${CLS}-thumb`) as HTMLElement;

        if (this.mode === "range")
        {
            this.thumbLowEl = this.rootEl.querySelector(`.${CLS}-thumb-low`) as HTMLElement;
            this.thumbHighEl = this.rootEl.querySelector(`.${CLS}-thumb-high`) as HTMLElement;
        }

        this.updatePositions();
        console.log(LOG_PREFIX, "created instance", this.instanceId);
    }

    // ── Public API ──

    /** Return current value (single mode). */
    public getValue(): number
    {
        return this.value;
    }

    /** Return range values. */
    public getRange(): { low: number; high: number }
    {
        return { low: this.valueLow, high: this.valueHigh };
    }

    /** Set value (single mode). */
    public setValue(v: number): void
    {
        this.value = clamp(snapToStep(v, this.opts.min, this.opts.step), this.opts.min, this.opts.max);
        this.updatePositions();
    }

    /** Set range values. */
    public setRange(low: number, high: number): void
    {
        this.valueLow = clamp(snapToStep(low, this.opts.min, this.opts.step), this.opts.min, this.opts.max);
        this.valueHigh = clamp(snapToStep(high, this.opts.min, this.opts.step), this.opts.min, this.opts.max);

        if (this.valueLow > this.valueHigh)
        {
            this.valueLow = this.valueHigh;
        }

        this.updatePositions();
    }

    /** Update minimum value. */
    public setMin(v: number): void
    {
        this.opts.min = v;
        this.clampCurrentValues();
        this.rebuildTicks();
        this.updatePositions();
    }

    /** Update maximum value. */
    public setMax(v: number): void
    {
        this.opts.max = v;
        this.clampCurrentValues();
        this.rebuildTicks();
        this.updatePositions();
    }

    /** Update step value. */
    public setStep(v: number): void
    {
        this.opts.step = v;
        this.rebuildTicks();
    }

    /** Enable the slider. */
    public enable(): void
    {
        this.isDisabled = false;
        this.rootEl.classList.remove(`${CLS}-disabled`);
        this.setThumbTabIndex("0");
    }

    /** Disable the slider. */
    public disable(): void
    {
        this.isDisabled = true;
        this.rootEl.classList.add(`${CLS}-disabled`);
        this.setThumbTabIndex("-1");
    }

    /** Return root DOM element. */
    public getElement(): HTMLElement
    {
        return this.rootEl;
    }

    /** Destroy the component. */
    public destroy(): void
    {
        if (this.destroyed) { return; }

        this.destroyed = true;
        this.rootEl.remove();
        console.log(LOG_PREFIX, "destroyed instance", this.instanceId);
    }

    // ── DOM Construction ──

    /** Build the complete slider DOM. */
    private buildRoot(): HTMLElement
    {
        const root = createElement("div", [CLS]);

        this.applySizeClass(root);
        this.applyOrientationClass(root);

        if (this.isDisabled)
        {
            root.classList.add(`${CLS}-disabled`);
        }

        if (this.opts.label)
        {
            root.appendChild(this.buildLabel());
        }

        root.appendChild(this.buildTrackSection());

        if (this.opts.showValue !== false)
        {
            root.appendChild(this.buildValueLabel());
        }

        return root;
    }

    /** Apply size CSS class to root. */
    private applySizeClass(root: HTMLElement): void
    {
        const size = this.opts.size ?? "default";

        if (size !== "default")
        {
            root.classList.add(`${CLS}-${size}`);
        }
    }

    /** Apply orientation CSS class to root. */
    private applyOrientationClass(root: HTMLElement): void
    {
        if (this.orientation === "vertical")
        {
            root.classList.add(`${CLS}-vertical`);
        }
    }

    /** Build the label element. */
    private buildLabel(): HTMLElement
    {
        return createElement("label", [`${CLS}-label`], this.opts.label);
    }

    /** Build the track section with track, fill, and thumb(s). */
    private buildTrackSection(): HTMLElement
    {
        const wrap = createElement("div", [`${CLS}-track-wrap`]);
        const track = createElement("div", [`${CLS}-track`]);
        const fill = createElement("div", [`${CLS}-fill`]);

        wrap.appendChild(track);
        wrap.appendChild(fill);

        if (this.mode === "range")
        {
            wrap.appendChild(this.buildThumb("low"));
            wrap.appendChild(this.buildThumb("high"));
        }
        else
        {
            wrap.appendChild(this.buildThumb("single"));
        }

        if (this.opts.showTicks)
        {
            wrap.appendChild(this.buildTicks());
        }

        wrap.addEventListener("pointerdown", (e) => this.onTrackPointerDown(e));

        return wrap;
    }

    /** Build a thumb element. */
    private buildThumb(role: "single" | "low" | "high"): HTMLElement
    {
        const classes = [`${CLS}-thumb`];

        if (role === "low") { classes.push(`${CLS}-thumb-low`); }
        if (role === "high") { classes.push(`${CLS}-thumb-high`); }

        const thumb = createElement("div", classes);
        const tabIdx = this.isDisabled ? "-1" : "0";

        setAttr(thumb, {
            tabindex: tabIdx,
            role: "slider",
            "aria-valuemin": String(this.opts.min),
            "aria-valuemax": String(this.opts.max),
            "aria-valuenow": String(this.getThumbValue(role)),
            "aria-orientation": this.orientation,
        });

        if (this.opts.label)
        {
            setAttr(thumb, { "aria-label": this.opts.label });
        }

        thumb.addEventListener("keydown", (e) => this.onThumbKeydown(e, role));

        return thumb;
    }

    /** Build tick marks container. */
    private buildTicks(): HTMLElement
    {
        const container = createElement("div", [`${CLS}-ticks`]);
        this.tickContainer = container;
        this.populateTicks(container);
        return container;
    }

    /** Populate tick mark elements into a container. */
    private populateTicks(container: HTMLElement): void
    {
        container.innerHTML = "";
        const interval = this.opts.tickInterval ?? this.opts.step;
        const { min, max } = this.opts;

        for (let v = min; v <= max; v += interval)
        {
            const pct = valueToPct(v, min, max) * 100;
            const tick = createElement("div", [`${CLS}-tick`]);

            if (this.orientation === "vertical")
            {
                tick.style.bottom = `${pct}%`;
            }
            else
            {
                tick.style.left = `${pct}%`;
            }

            container.appendChild(tick);
        }
    }

    /** Rebuild tick marks (after min/max/step change). */
    private rebuildTicks(): void
    {
        if (this.tickContainer)
        {
            this.populateTicks(this.tickContainer);
        }
    }

    /** Build the value display label. */
    private buildValueLabel(): HTMLElement
    {
        const el = createElement("div", [`${CLS}-value-label`]);
        this.valueLabelEl = el;
        this.updateValueLabel();
        return el;
    }

    // ── Position Updates ──

    /** Update all thumb/fill positions and labels. */
    private updatePositions(): void
    {
        if (this.mode === "range")
        {
            this.updateRangePositions();
        }
        else
        {
            this.updateSinglePosition();
        }

        this.updateValueLabel();
        this.updateAriaValues();
    }

    /** Update positions for single-thumb mode. */
    private updateSinglePosition(): void
    {
        const pct = valueToPct(this.value, this.opts.min, this.opts.max) * 100;

        if (this.orientation === "vertical")
        {
            this.thumbEl.style.bottom = `${pct}%`;
            this.fillEl.style.bottom = "0";
            this.fillEl.style.height = `${pct}%`;
        }
        else
        {
            this.thumbEl.style.left = `${pct}%`;
            this.fillEl.style.left = "0";
            this.fillEl.style.width = `${pct}%`;
        }
    }

    /** Update positions for range (dual-thumb) mode. */
    private updateRangePositions(): void
    {
        const pctLow = valueToPct(this.valueLow, this.opts.min, this.opts.max) * 100;
        const pctHigh = valueToPct(this.valueHigh, this.opts.min, this.opts.max) * 100;

        if (this.orientation === "vertical")
        {
            this.updateRangeVertical(pctLow, pctHigh);
        }
        else
        {
            this.updateRangeHorizontal(pctLow, pctHigh);
        }
    }

    /** Update horizontal range thumb and fill positions. */
    private updateRangeHorizontal(pctLow: number, pctHigh: number): void
    {
        if (this.thumbLowEl)
        {
            this.thumbLowEl.style.left = `${pctLow}%`;
        }

        if (this.thumbHighEl)
        {
            this.thumbHighEl.style.left = `${pctHigh}%`;
        }

        this.fillEl.style.left = `${pctLow}%`;
        this.fillEl.style.width = `${pctHigh - pctLow}%`;
    }

    /** Update vertical range thumb and fill positions. */
    private updateRangeVertical(pctLow: number, pctHigh: number): void
    {
        if (this.thumbLowEl)
        {
            this.thumbLowEl.style.bottom = `${pctLow}%`;
        }

        if (this.thumbHighEl)
        {
            this.thumbHighEl.style.bottom = `${pctHigh}%`;
        }

        this.fillEl.style.bottom = `${pctLow}%`;
        this.fillEl.style.height = `${pctHigh - pctLow}%`;
    }

    /** Update the value label text. */
    private updateValueLabel(): void
    {
        if (!this.valueLabelEl) { return; }

        if (this.mode === "range")
        {
            const lo = this.formatVal(this.valueLow);
            const hi = this.formatVal(this.valueHigh);
            this.valueLabelEl.textContent = `${lo} – ${hi}`;
        }
        else
        {
            this.valueLabelEl.textContent = this.formatVal(this.value);
        }
    }

    /** Format a value using the custom formatter or default. */
    private formatVal(v: number): string
    {
        if (this.opts.formatValue)
        {
            return this.opts.formatValue(v);
        }

        return String(v);
    }

    /** Update ARIA valuenow on thumb(s). */
    private updateAriaValues(): void
    {
        if (this.mode === "range")
        {
            this.thumbLowEl?.setAttribute("aria-valuenow", String(this.valueLow));
            this.thumbHighEl?.setAttribute("aria-valuenow", String(this.valueHigh));
        }
        else
        {
            this.thumbEl.setAttribute("aria-valuenow", String(this.value));
        }
    }

    // ── Pointer Events ──

    /** Handle pointerdown on the track area. */
    private onTrackPointerDown(e: PointerEvent): void
    {
        if (this.isDisabled) { return; }

        e.preventDefault();
        const val = this.pointerToSnappedValue(e);

        this.activeThumb = this.resolveClosestThumb(val);
        this.applyThumbValue(val);
        this.beginDrag(e);
    }

    /** Convert a pointer event to a snapped slider value. */
    private pointerToSnappedValue(e: PointerEvent): number
    {
        const pct = this.getPointerPct(e);
        const rawVal = pctToValue(pct, this.opts.min, this.opts.max);
        const snapped = snapToStep(rawVal, this.opts.min, this.opts.step);

        return clamp(snapped, this.opts.min, this.opts.max);
    }

    /** Attach pointermove/pointerup listeners for drag tracking. */
    private beginDrag(e: PointerEvent): void
    {
        const target = e.target as HTMLElement;
        target.setPointerCapture(e.pointerId);

        const onMove = (ev: PointerEvent): void =>
        {
            this.onPointerMove(ev);
        };

        const onUp = (): void =>
        {
            target.removeEventListener("pointermove", onMove);
            target.removeEventListener("pointerup", onUp);
            this.activeThumb = null;
            safeCallback(this.opts.onSlideEnd);
        };

        target.addEventListener("pointermove", onMove);
        target.addEventListener("pointerup", onUp);

        safeCallback(this.opts.onSlideStart);
    }

    /** Handle pointermove during drag. */
    private onPointerMove(e: PointerEvent): void
    {
        const pct = this.getPointerPct(e);
        const rawVal = pctToValue(pct, this.opts.min, this.opts.max);
        const snapped = snapToStep(rawVal, this.opts.min, this.opts.step);
        const val = clamp(snapped, this.opts.min, this.opts.max);

        this.applyThumbValue(val);
    }

    /** Calculate pointer position as a percentage of the track. */
    private getPointerPct(e: PointerEvent): number
    {
        const rect = this.trackWrap.getBoundingClientRect();

        if (this.orientation === "vertical")
        {
            return clamp(1 - ((e.clientY - rect.top) / rect.height), 0, 1);
        }

        return clamp((e.clientX - rect.left) / rect.width, 0, 1);
    }

    /** Determine which thumb is closest to a value (range mode). */
    private resolveClosestThumb(val: number): "single" | "low" | "high"
    {
        if (this.mode !== "range") { return "single"; }

        const distLow = Math.abs(val - this.valueLow);
        const distHigh = Math.abs(val - this.valueHigh);

        return distLow <= distHigh ? "low" : "high";
    }

    /** Apply a value to the active thumb with constraint enforcement. */
    private applyThumbValue(val: number): void
    {
        if (this.activeThumb === "low")
        {
            this.valueLow = Math.min(val, this.valueHigh);
        }
        else if (this.activeThumb === "high")
        {
            this.valueHigh = Math.max(val, this.valueLow);
        }
        else
        {
            this.value = val;
        }

        this.updatePositions();
        this.fireChange();
    }

    // ── Keyboard Navigation ──

    /** Handle keydown on a thumb element. */
    private onThumbKeydown(e: KeyboardEvent, role: "single" | "low" | "high"): void
    {
        if (this.isDisabled) { return; }

        const delta = this.getKeyDelta(e);

        if (delta === null) { return; }

        e.preventDefault();
        this.activeThumb = role;
        const current = this.getThumbValue(role);
        const newVal = clamp(
            snapToStep(current + delta, this.opts.min, this.opts.step),
            this.opts.min,
            this.opts.max
        );

        this.applyThumbValue(newVal);
        this.activeThumb = null;
    }

    /** Map a keyboard event to a value delta, or null. */
    private getKeyDelta(e: KeyboardEvent): number | null
    {
        const isVert = this.orientation === "vertical";
        const arrowDelta = this.getArrowDelta(e.key, isVert);

        if (arrowDelta !== null)
        {
            return arrowDelta;
        }

        return this.getSpecialKeyDelta(e.key);
    }

    /** Return delta for arrow keys, or null. */
    private getArrowDelta(key: string, isVert: boolean): number | null
    {
        const step = this.opts.step;

        if (key === KEY_RIGHT || (isVert && key === KEY_UP))
        {
            return step;
        }

        if (key === KEY_LEFT || (isVert && key === KEY_DOWN))
        {
            return -step;
        }

        if ((!isVert && key === KEY_UP) || key === KEY_PAGE_UP)
        {
            return step * PAGE_STEP_MULTIPLIER;
        }

        if ((!isVert && key === KEY_DOWN) || key === KEY_PAGE_DOWN)
        {
            return -(step * PAGE_STEP_MULTIPLIER);
        }

        return null;
    }

    /** Return delta for Home/End keys, or null. */
    private getSpecialKeyDelta(key: string): number | null
    {
        const range = this.opts.max - this.opts.min;

        if (key === KEY_HOME)
        {
            return -range;
        }

        if (key === KEY_END)
        {
            return range;
        }

        return null;
    }

    // ── Helpers ──

    /** Get the value associated with a given thumb role. */
    private getThumbValue(role: "single" | "low" | "high"): number
    {
        if (role === "low") { return this.valueLow; }
        if (role === "high") { return this.valueHigh; }
        return this.value;
    }

    /** Clamp current values to min/max after bounds change. */
    private clampCurrentValues(): void
    {
        this.value = clamp(this.value, this.opts.min, this.opts.max);
        this.valueLow = clamp(this.valueLow, this.opts.min, this.opts.max);
        this.valueHigh = clamp(this.valueHigh, this.opts.min, this.opts.max);

        if (this.valueLow > this.valueHigh)
        {
            this.valueLow = this.valueHigh;
        }
    }

    /** Set tabindex on all thumb elements. */
    private setThumbTabIndex(idx: string): void
    {
        this.thumbEl?.setAttribute("tabindex", idx);
        this.thumbLowEl?.setAttribute("tabindex", idx);
        this.thumbHighEl?.setAttribute("tabindex", idx);
    }

    /** Fire the onChange callback with current value(s). */
    private fireChange(): void
    {
        if (this.mode === "range")
        {
            safeCallback(
                this.opts.onChange,
                { low: this.valueLow, high: this.valueHigh }
            );
        }
        else
        {
            safeCallback(this.opts.onChange, this.value);
        }
    }
}

// ============================================================================
// S5: FACTORY FUNCTION
// ============================================================================

/**
 * Create a Slider component and mount it into a container.
 * @param containerId - ID of the DOM element to mount into.
 * @param options     - Slider configuration options.
 * @returns A SliderHandle for programmatic control.
 */
export function createSlider(
    containerId: string, options?: SliderOptions
): SliderHandle
{
    const impl = new SliderImpl(options ?? {});

    const container = document.getElementById(containerId);

    if (container)
    {
        container.appendChild(impl.getElement());
    }
    else
    {
        console.warn(LOG_PREFIX, "container not found:", containerId);
    }

    return {
        getValue: () => impl.getValue(),
        getRange: () => impl.getRange(),
        setValue: (v) => impl.setValue(v),
        setRange: (lo, hi) => impl.setRange(lo, hi),
        setMin: (v) => impl.setMin(v),
        setMax: (v) => impl.setMax(v),
        setStep: (v) => impl.setStep(v),
        enable: () => impl.enable(),
        disable: () => impl.disable(),
        getElement: () => impl.getElement(),
        destroy: () => impl.destroy(),
    };
}

// ── Window Global ──
(window as unknown as Record<string, unknown>)["createSlider"] = createSlider;
