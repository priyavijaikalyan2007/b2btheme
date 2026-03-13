/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: AnglePicker
 * 📜 PURPOSE: A circular dial input for selecting angles (0-359 degrees) with
 *    pointer drag, keyboard control, and optional shadow preview. Supports
 *    inline and dropdown display modes.
 * 🔗 RELATES: [[EnterpriseTheme]], [[CustomComponents]], [[LineTypePicker]],
 *    [[ColorPicker]], [[GraphCanvas]]
 * ⚡ FLOW: [Consumer App] -> [createAnglePicker()] -> [SVG dial + optional dropdown]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// S1: INTERFACES
// ============================================================================

/** Configuration options for AnglePicker. */
export interface AnglePickerOptions
{
    /** Initial angle in degrees (0-359). Default: 0. */
    value?: number;
    /** Display mode. Default: "inline". */
    mode?: "inline" | "dropdown";
    /** Size variant. Default: "md". */
    size?: "sm" | "md" | "lg";
    /** Arrow key step in degrees. Default: 1. */
    step?: number;
    /** Shift+drag / Shift+arrow snap increment. Default: 15. */
    snapStep?: number;
    /** Show tick marks on the dial. Default: true. */
    showTicks?: boolean;
    /** Tick label display: "none", "degrees", "compass". Default: "none". */
    tickLabels?: "none" | "degrees" | "compass";
    /** Show editable numeric input at center. Default: true. */
    showInput?: boolean;
    /** Show live shadow preview square. Default: false. */
    showPreview?: boolean;
    /** Shadow preview distance in px. Default: 6. */
    previewDistance?: number;
    /** Shadow preview blur in px. Default: 8. */
    previewBlur?: number;
    /** Shadow preview color. Default: "rgba(0,0,0,0.4)". */
    previewColor?: string;
    /** Disable the picker. Default: false. */
    disabled?: boolean;
    /** Callback fired on angle change. */
    onChange?: (angle: number) => void;
    /** Callback fired when dropdown opens (dropdown mode only). */
    onOpen?: () => void;
    /** Callback fired when dropdown closes (dropdown mode only). */
    onClose?: () => void;
}

/** Size configuration for dial geometry. */
interface SizeConfig
{
    diameter: number;
    trackRadius: number;
    knobRadius: number;
    triggerWidth: number;
}

// ============================================================================
// S2: CONSTANTS
// ============================================================================

const LOG_PREFIX = "[AnglePicker]";
const CLS = "anglepicker";
let instanceCounter = 0;

const SVG_NS = "http://www.w3.org/2000/svg";

const SIZE_MAP: Record<string, SizeConfig> =
{
    sm: { diameter: 80, trackRadius: 30, knobRadius: 5, triggerWidth: 48 },
    md: { diameter: 120, trackRadius: 46, knobRadius: 7, triggerWidth: 64 },
    lg: { diameter: 160, trackRadius: 62, knobRadius: 9, triggerWidth: 80 },
};

const TICK_COUNT = 24;
const TICK_INTERVAL_DEG = 15;
const MAJOR_TICK_LENGTH = 10;
const SEMI_MAJOR_TICK_LENGTH = 7;
const MINOR_TICK_LENGTH = 4;
const MAJOR_ANGLES = [0, 90, 180, 270];
const SEMI_MAJOR_ANGLES = [45, 135, 225, 315];

const DEG_LABELS: Record<number, string> =
    { 0: "0\u00B0", 90: "90\u00B0", 180: "180\u00B0", 270: "270\u00B0" };
const COMPASS_LABELS: Record<number, string> =
    { 0: "E", 90: "S", 180: "W", 270: "N" };

const DEFAULT_KEY_BINDINGS: Record<string, string> =
{
    decreaseAngle: "ArrowLeft",
    decreaseAngleAlt: "ArrowDown",
    increaseAngle: "ArrowRight",
    increaseAngleAlt: "ArrowUp",
    jumpToStart: "Home",
    jumpToEnd: "End",
    closeDropdown: "Escape",
    confirmInput: "Enter",
};

// ============================================================================
// S3: DOM HELPERS
// ============================================================================

function createElement(
    tag: string, classes: string[], text?: string
): HTMLElement
{
    const el = document.createElement(tag);
    if (classes.length > 0) { el.classList.add(...classes); }
    if (text) { el.textContent = text; }
    return el;
}

function setAttr(
    el: HTMLElement | SVGElement, attrs: Record<string, string>
): void
{
    for (const key of Object.keys(attrs))
    {
        el.setAttribute(key, attrs[key]);
    }
}

function createSvgElement(
    tag: string, attrs: Record<string, string>
): SVGElement
{
    const el = document.createElementNS(SVG_NS, tag);
    for (const key of Object.keys(attrs))
    {
        el.setAttribute(key, attrs[key]);
    }
    return el;
}

function safeCallback<T extends unknown[]>(
    fn: ((...a: T) => void) | undefined, ...args: T
): void
{
    if (!fn) { return; }
    try { fn(...args); }
    catch (err) { console.error(LOG_PREFIX, "callback error:", err); }
}

// ============================================================================
// S4: MATH HELPERS
// ============================================================================

/** Normalize angle to 0-359 integer range. */
function normalizeAngle(angle: number): number
{
    const wrapped = ((angle % 360) + 360) % 360;
    return Math.round(wrapped) % 360;
}

/** Convert degrees to radians. */
function degToRad(deg: number): number
{
    return (deg * Math.PI) / 180;
}

/** Get x,y position on a circle at a given angle and radius from center. */
function pointOnCircle(
    cx: number, cy: number, radius: number, angleDeg: number
): { x: number; y: number }
{
    const rad = degToRad(angleDeg);
    return {
        x: cx + (radius * Math.cos(rad)),
        y: cy + (radius * Math.sin(rad)),
    };
}

/** Compute clockwise angle in degrees from pointer position relative to center. */
function angleFromPointer(
    cx: number, cy: number, px: number, py: number
): number
{
    const dx = px - cx;
    const dy = py - cy;
    const rad = Math.atan2(dy, dx);
    return normalizeAngle((rad * 180) / Math.PI);
}

/** Snap an angle to the nearest multiple of step. */
function snapAngle(angle: number, step: number): number
{
    return normalizeAngle(Math.round(angle / step) * step);
}

/** Determine tick length by angle. */
function tickLength(angleDeg: number): number
{
    if (MAJOR_ANGLES.includes(angleDeg)) { return MAJOR_TICK_LENGTH; }
    if (SEMI_MAJOR_ANGLES.includes(angleDeg)) { return SEMI_MAJOR_TICK_LENGTH; }
    return MINOR_TICK_LENGTH;
}

/** Determine tick CSS class suffix by angle. */
function tickClass(angleDeg: number): string
{
    if (MAJOR_ANGLES.includes(angleDeg)) { return `${CLS}-tick--major`; }
    if (SEMI_MAJOR_ANGLES.includes(angleDeg)) { return `${CLS}-tick--semi`; }
    return `${CLS}-tick`;
}

// ============================================================================
// S5: CLASS
// ============================================================================

export class AnglePicker
{
    private readonly instanceId: string;
    private opts: Required<Omit<AnglePickerOptions, "onChange" | "onOpen" | "onClose">>
        & Pick<AnglePickerOptions, "onChange" | "onOpen" | "onClose">;
    private angle: number = 0;
    private sizeConfig: SizeConfig;
    private isDragging: boolean = false;
    private isOpen: boolean = false;
    private destroyed: boolean = false;

    // DOM refs
    private rootEl: HTMLElement | null = null;
    private svgEl: SVGElement | null = null;
    private needleEl: SVGElement | null = null;
    private knobEl: SVGElement | null = null;
    private inputEl: HTMLInputElement | null = null;
    private previewEl: HTMLElement | null = null;
    private triggerEl: HTMLElement | null = null;
    private dropdownEl: HTMLElement | null = null;

    // Bound handlers for cleanup
    private readonly boundDocClick: (e: MouseEvent) => void;
    private readonly boundDocKey: (e: KeyboardEvent) => void;

    constructor(containerId: string, options?: AnglePickerOptions)
    {
        this.instanceId = `${CLS}-${++instanceCounter}`;
        this.opts = this.resolveOptions(options);
        this.angle = normalizeAngle(this.opts.value);
        this.sizeConfig = SIZE_MAP[this.opts.size];
        this.boundDocClick = (e: MouseEvent) => this.onDocumentClick(e);
        this.boundDocKey = (e: KeyboardEvent) => this.onDocumentKey(e);
        this.render(containerId);
        console.log(LOG_PREFIX, "created", this.instanceId);
    }

    // ── Public API ──

    /** Get current angle (0-359). */
    public getValue(): number
    {
        return this.angle;
    }

    /** Set angle programmatically. */
    public setValue(angle: number): void
    {
        this.angle = normalizeAngle(angle);
        this.updateVisuals();
    }

    /** Open dropdown (dropdown mode only). */
    public open(): void
    {
        if (this.opts.mode === "dropdown" && !this.isOpen)
        {
            this.openDropdown();
        }
    }

    /** Close dropdown (dropdown mode only). */
    public close(): void
    {
        if (this.opts.mode === "dropdown" && this.isOpen)
        {
            this.closeDropdown();
        }
    }

    /** Enable the picker. */
    public enable(): void
    {
        if (!this.rootEl) { return; }
        this.opts.disabled = false;
        this.rootEl.classList.remove(`${CLS}--disabled`);
    }

    /** Disable the picker. */
    public disable(): void
    {
        if (!this.rootEl) { return; }
        this.opts.disabled = true;
        this.rootEl.classList.add(`${CLS}--disabled`);
        if (this.isOpen) { this.closeDropdown(); }
    }

    /** Get the root DOM element. */
    public getElement(): HTMLElement
    {
        return this.rootEl as HTMLElement;
    }

    /** Tear down and remove from DOM. */
    public destroy(): void
    {
        if (this.destroyed) { return; }
        this.destroyed = true;
        this.removeGlobalListeners();
        if (this.rootEl && this.rootEl.parentElement)
        {
            this.rootEl.parentElement.removeChild(this.rootEl);
        }
        this.rootEl = null;
        console.log(LOG_PREFIX, "destroyed", this.instanceId);
    }

    // ── Private: option resolution ──

    private resolveOptions(options?: AnglePickerOptions): typeof this.opts
    {
        return {
            value: options?.value ?? 0,
            mode: options?.mode ?? "inline",
            size: options?.size ?? "md",
            step: options?.step ?? 1,
            snapStep: options?.snapStep ?? 15,
            showTicks: options?.showTicks ?? true,
            tickLabels: options?.tickLabels ?? "none",
            showInput: options?.showInput ?? true,
            showPreview: options?.showPreview ?? false,
            previewDistance: options?.previewDistance ?? 6,
            previewBlur: options?.previewBlur ?? 8,
            previewColor: options?.previewColor ?? "rgba(0,0,0,0.4)",
            disabled: options?.disabled ?? false,
            onChange: options?.onChange,
            onOpen: options?.onOpen,
            onClose: options?.onClose,
        };
    }

    // ── Private: top-level render ──

    private render(containerId: string): void
    {
        const container = document.getElementById(containerId);
        if (!container)
        {
            console.warn(LOG_PREFIX, "container not found:", containerId);
            return;
        }
        this.rootEl = this.buildRoot();
        container.appendChild(this.rootEl);
    }

    private buildRoot(): HTMLElement
    {
        const root = createElement("div", [CLS]);
        root.id = this.instanceId;
        root.classList.add(`${CLS}--${this.opts.size}`);
        root.classList.add(`${CLS}--${this.opts.mode}`);
        if (this.opts.disabled) { root.classList.add(`${CLS}--disabled`); }

        if (this.opts.mode === "dropdown")
        {
            this.buildDropdownMode(root);
        }
        else
        {
            this.buildInlineMode(root);
        }
        return root;
    }

    private buildInlineMode(root: HTMLElement): void
    {
        const dialWrap = this.buildDialWrapper();
        root.appendChild(dialWrap);
        if (this.opts.showPreview)
        {
            this.previewEl = this.buildPreview();
            root.appendChild(this.previewEl);
        }
        this.updateVisuals();
    }

    private buildDropdownMode(root: HTMLElement): void
    {
        this.triggerEl = this.buildTrigger();
        this.dropdownEl = this.buildDropdownContainer();
        root.appendChild(this.triggerEl);
        root.appendChild(this.dropdownEl);
        this.updateVisuals();
    }

    // ── Private: dial wrapper (contains SVG + overlaid input) ──

    private buildDialWrapper(): HTMLElement
    {
        const wrap = createElement("div", [`${CLS}-dial-wrap`]);
        const d = this.sizeConfig.diameter;
        wrap.style.width = `${d}px`;
        wrap.style.height = `${d}px`;
        wrap.style.position = "relative";

        this.svgEl = this.buildSvg();
        wrap.appendChild(this.svgEl as unknown as Node);

        if (this.opts.showInput)
        {
            this.inputEl = this.buildCenterInput();
            wrap.appendChild(this.inputEl);
        }
        return wrap;
    }

    // ── Private: SVG construction ──

    private buildSvg(): SVGElement
    {
        const d = this.sizeConfig.diameter;
        const svg = createSvgElement("svg", {
            "width": String(d),
            "height": String(d),
            "viewBox": `0 0 ${d} ${d}`,
            "class": `${CLS}-dial`,
            "role": "slider",
            "aria-valuenow": String(this.angle),
            "aria-valuemin": "0",
            "aria-valuemax": "359",
            "aria-label": "Angle picker",
            "tabindex": "0",
        });

        this.appendSvgChildren(svg, d / 2, d / 2);
        this.attachPointerHandlers(svg);
        this.attachKeyboardHandlers(svg);
        return svg;
    }

    /** Appends track, ticks, labels, needle, and knob to the SVG. */
    private appendSvgChildren(
        svg: SVGElement, cx: number, cy: number
    ): void
    {
        svg.appendChild(this.buildTrackCircle(cx, cy));
        if (this.opts.showTicks) { this.appendTicks(svg, cx, cy); }
        if (this.opts.tickLabels !== "none") { this.appendLabels(svg, cx, cy); }
        this.needleEl = this.buildNeedle(cx, cy);
        svg.appendChild(this.needleEl);
        this.knobEl = this.buildKnob(cx, cy);
        svg.appendChild(this.knobEl);
    }

    private buildTrackCircle(cx: number, cy: number): SVGElement
    {
        return createSvgElement("circle", {
            "cx": String(cx),
            "cy": String(cy),
            "r": String(this.sizeConfig.trackRadius),
            "class": `${CLS}-track`,
            "fill": "none",
            "stroke": "currentColor",
            "stroke-width": "1.5",
        });
    }

    private buildNeedle(cx: number, cy: number): SVGElement
    {
        const pt = pointOnCircle(cx, cy, this.sizeConfig.trackRadius, this.angle);
        return createSvgElement("line", {
            "x1": String(cx),
            "y1": String(cy),
            "x2": String(pt.x),
            "y2": String(pt.y),
            "class": `${CLS}-needle`,
            "stroke": "currentColor",
            "stroke-width": "1.5",
        });
    }

    private buildKnob(cx: number, cy: number): SVGElement
    {
        const pt = pointOnCircle(cx, cy, this.sizeConfig.trackRadius, this.angle);
        return createSvgElement("circle", {
            "cx": String(pt.x),
            "cy": String(pt.y),
            "r": String(this.sizeConfig.knobRadius),
            "class": `${CLS}-knob`,
            "fill": "currentColor",
        });
    }

    // ── Private: ticks ──

    private appendTicks(svg: SVGElement, cx: number, cy: number): void
    {
        for (let i = 0; i < TICK_COUNT; i++)
        {
            const angleDeg = i * TICK_INTERVAL_DEG;
            svg.appendChild(this.buildTick(cx, cy, angleDeg));
        }
    }

    private buildTick(
        cx: number, cy: number, angleDeg: number
    ): SVGElement
    {
        const r = this.sizeConfig.trackRadius;
        const len = tickLength(angleDeg);
        const outer = pointOnCircle(cx, cy, r, angleDeg);
        const inner = pointOnCircle(cx, cy, r - len, angleDeg);
        const cls = tickClass(angleDeg);
        return createSvgElement("line", {
            "x1": String(inner.x),
            "y1": String(inner.y),
            "x2": String(outer.x),
            "y2": String(outer.y),
            "class": cls,
            "stroke": "currentColor",
            "stroke-width": "1",
        });
    }

    // ── Private: tick labels ──

    private appendLabels(svg: SVGElement, cx: number, cy: number): void
    {
        const labelMap = this.opts.tickLabels === "compass"
            ? COMPASS_LABELS
            : DEG_LABELS;
        for (const angleDegStr of Object.keys(labelMap))
        {
            const angleDeg = Number(angleDegStr);
            const label = labelMap[angleDeg];
            svg.appendChild(this.buildTickLabel(cx, cy, angleDeg, label));
        }
    }

    private buildTickLabel(
        cx: number, cy: number, angleDeg: number, label: string
    ): SVGElement
    {
        const labelRadius = this.sizeConfig.trackRadius + 14;
        const pt = pointOnCircle(cx, cy, labelRadius, angleDeg);
        const text = createSvgElement("text", {
            "x": String(pt.x),
            "y": String(pt.y),
            "class": `${CLS}-tick-label`,
            "text-anchor": "middle",
            "dominant-baseline": "central",
            "fill": "currentColor",
            "font-size": "10",
        });
        text.textContent = label;
        return text;
    }

    // ── Private: center input ──

    private buildCenterInput(): HTMLInputElement
    {
        const input = document.createElement("input");
        input.type = "text";
        input.classList.add(`${CLS}-input`);
        setAttr(input, {
            "aria-label": "Angle in degrees",
            "autocomplete": "off",
        });
        this.positionCenterInput(input);
        input.value = `${this.angle}\u00B0`;
        input.addEventListener("focus", () => this.onInputFocus());
        input.addEventListener("blur", () => this.onInputBlur());
        input.addEventListener("keydown", (e) => this.onInputKeydown(e));
        return input;
    }

    private positionCenterInput(input: HTMLInputElement): void
    {
        const d = this.sizeConfig.diameter;
        const inputSize = Math.round(d * 0.35);
        input.style.position = "absolute";
        input.style.left = `${(d - inputSize) / 2}px`;
        input.style.top = `${(d - inputSize) / 2}px`;
        input.style.width = `${inputSize}px`;
        input.style.height = `${inputSize}px`;
    }

    private onInputFocus(): void
    {
        if (this.inputEl)
        {
            this.inputEl.value = String(this.angle);
            this.inputEl.select();
        }
    }

    private onInputBlur(): void
    {
        if (!this.inputEl) { return; }
        const parsed = parseInt(this.inputEl.value, 10);
        if (!isNaN(parsed))
        {
            this.setAngle(normalizeAngle(parsed), true);
        }
        this.inputEl.value = `${this.angle}\u00B0`;
    }

    private onInputKeydown(e: KeyboardEvent): void
    {
        if (e.key === DEFAULT_KEY_BINDINGS.confirmInput)
        {
            e.preventDefault();
            if (this.inputEl) { this.inputEl.blur(); }
        }
    }

    // ── Private: shadow preview ──

    private buildPreview(): HTMLElement
    {
        const el = createElement("div", [`${CLS}-preview`]);
        this.updatePreviewShadow(el);
        return el;
    }

    private updatePreviewShadow(el?: HTMLElement): void
    {
        const target = el || this.previewEl;
        if (!target) { return; }
        const dist = this.opts.previewDistance;
        const blur = this.opts.previewBlur;
        const color = this.opts.previewColor;
        const rad = degToRad(this.angle);
        const dx = Math.round(dist * Math.cos(rad));
        const dy = Math.round(dist * Math.sin(rad));
        target.style.boxShadow = `${dx}px ${dy}px ${blur}px ${color}`;
    }

    // ── Private: trigger (dropdown mode) ──

    private buildTrigger(): HTMLElement
    {
        const trigger = createElement("div", [`${CLS}-trigger`]);
        const tw = this.sizeConfig.triggerWidth;
        trigger.style.width = `${tw}px`;
        trigger.style.height = `${tw}px`;
        setAttr(trigger, {
            "role": "button",
            "aria-expanded": "false",
            "aria-haspopup": "dialog",
            "tabindex": "0",
            "aria-label": "Angle picker",
        });
        this.appendTriggerContent(trigger);
        trigger.addEventListener("click", () => this.onTriggerClick());
        trigger.addEventListener("keydown", (e) => this.onTriggerKeydown(e));
        return trigger;
    }

    private appendTriggerContent(trigger: HTMLElement): void
    {
        const label = createElement("span", [`${CLS}-trigger-label`]);
        label.textContent = `${this.angle}\u00B0`;
        const caret = createElement("i", [
            "bi", "bi-chevron-down", `${CLS}-trigger-caret`,
        ]);
        trigger.appendChild(label);
        trigger.appendChild(caret);
    }

    private updateTriggerLabel(): void
    {
        if (!this.triggerEl) { return; }
        const label = this.triggerEl.querySelector(`.${CLS}-trigger-label`);
        if (label) { label.textContent = `${this.angle}\u00B0`; }
    }

    // ── Private: dropdown container ──

    private buildDropdownContainer(): HTMLElement
    {
        const dd = createElement("div", [`${CLS}-dropdown`]);
        dd.style.display = "none";
        const dialWrap = this.buildDialWrapper();
        dd.appendChild(dialWrap);
        if (this.opts.showPreview)
        {
            this.previewEl = this.buildPreview();
            dd.appendChild(this.previewEl);
        }
        return dd;
    }

    // ── Private: dropdown open/close ──

    private openDropdown(): void
    {
        if (this.opts.disabled || !this.dropdownEl) { return; }
        this.isOpen = true;
        this.dropdownEl.style.display = "";
        this.rootEl?.classList.add(`${CLS}--open`);
        if (this.triggerEl)
        {
            setAttr(this.triggerEl, { "aria-expanded": "true" });
        }
        this.positionDropdown();
        this.addGlobalListeners();
        this.focusDial();
        safeCallback(this.opts.onOpen);
        console.debug(LOG_PREFIX, "dropdown opened");
    }

    private closeDropdown(): void
    {
        if (!this.dropdownEl) { return; }
        this.isOpen = false;
        this.dropdownEl.style.display = "none";
        this.rootEl?.classList.remove(`${CLS}--open`);
        if (this.triggerEl)
        {
            setAttr(this.triggerEl, { "aria-expanded": "false" });
            this.triggerEl.focus();
        }
        this.removeGlobalListeners();
        safeCallback(this.opts.onClose);
        console.debug(LOG_PREFIX, "dropdown closed");
    }

    private focusDial(): void
    {
        if (this.svgEl)
        {
            (this.svgEl as unknown as HTMLElement).focus();
        }
    }

    private positionDropdown(): void
    {
        if (!this.dropdownEl || !this.rootEl) { return; }
        const rect = this.rootEl.getBoundingClientRect();
        const d = this.sizeConfig.diameter;
        const ddHeight = d + 32;
        const spaceBelow = window.innerHeight - rect.bottom;
        const openAbove = (spaceBelow < ddHeight) && (rect.top > spaceBelow);
        this.dropdownEl.style.position = "fixed";
        this.dropdownEl.style.left = `${rect.left}px`;
        this.applyDropdownVertical(rect, openAbove);
        this.clampDropdownToViewport();
    }

    private applyDropdownVertical(
        rect: DOMRect, openAbove: boolean
    ): void
    {
        if (!this.dropdownEl) { return; }
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
    }

    private clampDropdownToViewport(): void
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

    // ── Private: pointer event handlers ──

    private attachPointerHandlers(svg: SVGElement): void
    {
        svg.addEventListener("pointerdown", (e) => this.onPointerDown(e));
        svg.addEventListener("pointermove", (e) => this.onPointerMove(e));
        svg.addEventListener("pointerup", (e) => this.onPointerUp(e));
    }

    private onPointerDown(e: PointerEvent): void
    {
        if (this.opts.disabled) { return; }
        e.preventDefault();
        const svg = e.currentTarget as SVGElement;
        svg.setPointerCapture(e.pointerId);
        this.isDragging = true;
        this.updateAngleFromPointer(e);
    }

    private onPointerMove(e: PointerEvent): void
    {
        if (!this.isDragging) { return; }
        e.preventDefault();
        this.updateAngleFromPointer(e);
    }

    private onPointerUp(e: PointerEvent): void
    {
        if (!this.isDragging) { return; }
        const svg = e.currentTarget as SVGElement;
        svg.releasePointerCapture(e.pointerId);
        this.isDragging = false;
    }

    private updateAngleFromPointer(e: PointerEvent): void
    {
        if (!this.svgEl) { return; }
        const rect = (this.svgEl as unknown as Element).getBoundingClientRect();
        const cx = rect.left + (rect.width / 2);
        const cy = rect.top + (rect.height / 2);
        let angle = angleFromPointer(cx, cy, e.clientX, e.clientY);
        if (e.shiftKey)
        {
            angle = snapAngle(angle, this.opts.snapStep);
        }
        this.setAngle(angle, true);
    }

    // ── Private: keyboard event handlers ──

    private attachKeyboardHandlers(svg: SVGElement): void
    {
        svg.addEventListener("keydown", (e) => this.onDialKeydown(e));
    }

    private onDialKeydown(e: KeyboardEvent): void
    {
        if (this.opts.disabled) { return; }
        const step = e.shiftKey ? this.opts.snapStep : this.opts.step;
        const handled = this.handleDialKey(e.key, step);
        if (handled) { e.preventDefault(); }
    }

    private handleDialKey(key: string, step: number): boolean
    {
        const kb = DEFAULT_KEY_BINDINGS;
        if (key === kb.increaseAngle || key === kb.increaseAngleAlt)
        {
            this.setAngle(normalizeAngle(this.angle + step), true);
            return true;
        }
        if (key === kb.decreaseAngle || key === kb.decreaseAngleAlt)
        {
            this.setAngle(normalizeAngle(this.angle - step), true);
            return true;
        }
        if (key === kb.jumpToStart)
        {
            this.setAngle(0, true);
            return true;
        }
        if (key === kb.jumpToEnd)
        {
            this.setAngle(359, true);
            return true;
        }
        if (key === kb.closeDropdown && this.opts.mode === "dropdown")
        {
            this.closeDropdown();
            return true;
        }
        return false;
    }

    // ── Private: trigger event handlers ──

    private onTriggerClick(): void
    {
        if (this.opts.disabled) { return; }
        if (this.isOpen) { this.closeDropdown(); }
        else { this.openDropdown(); }
    }

    private onTriggerKeydown(e: KeyboardEvent): void
    {
        if (this.opts.disabled) { return; }
        if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")
        {
            e.preventDefault();
            if (!this.isOpen) { this.openDropdown(); }
        }
    }

    // ── Private: global document handlers ──

    private onDocumentClick(e: MouseEvent): void
    {
        if (!this.rootEl || !this.isOpen) { return; }
        if (!this.rootEl.contains(e.target as Node))
        {
            this.closeDropdown();
        }
    }

    private onDocumentKey(e: KeyboardEvent): void
    {
        if (!this.isOpen) { return; }
        if (e.key === "Tab")
        {
            this.closeDropdown();
            return;
        }
        if (e.key === "Escape")
        {
            e.stopPropagation();
            this.closeDropdown();
        }
    }

    private addGlobalListeners(): void
    {
        document.addEventListener("mousedown", this.boundDocClick, true);
        document.addEventListener("keydown", this.boundDocKey, true);
    }

    private removeGlobalListeners(): void
    {
        document.removeEventListener("mousedown", this.boundDocClick, true);
        document.removeEventListener("keydown", this.boundDocKey, true);
    }

    // ── Private: angle state management ──

    private setAngle(angle: number, fireEvent: boolean): void
    {
        const prev = this.angle;
        this.angle = normalizeAngle(angle);
        if (this.angle === prev) { return; }
        this.updateVisuals();
        if (fireEvent) { safeCallback(this.opts.onChange, this.angle); }
    }

    // ── Private: visual update ──

    private updateVisuals(): void
    {
        this.updateNeedleAndKnob();
        this.updateInputValue();
        this.updateAriaValue();
        this.updatePreviewShadow();
        this.updateTriggerLabel();
    }

    private updateNeedleAndKnob(): void
    {
        if (!this.needleEl || !this.knobEl) { return; }
        const d = this.sizeConfig.diameter;
        const cx = d / 2;
        const cy = d / 2;
        const pt = pointOnCircle(cx, cy, this.sizeConfig.trackRadius, this.angle);
        this.needleEl.setAttribute("x2", String(pt.x));
        this.needleEl.setAttribute("y2", String(pt.y));
        this.knobEl.setAttribute("cx", String(pt.x));
        this.knobEl.setAttribute("cy", String(pt.y));
    }

    private updateInputValue(): void
    {
        if (!this.inputEl) { return; }
        if (document.activeElement !== this.inputEl)
        {
            this.inputEl.value = `${this.angle}\u00B0`;
        }
    }

    private updateAriaValue(): void
    {
        if (!this.svgEl) { return; }
        this.svgEl.setAttribute("aria-valuenow", String(this.angle));
    }
}

// ============================================================================
// S6: FACTORY & GLOBAL EXPORTS
// ============================================================================

/** Create an AnglePicker and mount it in the given container. */
export function createAnglePicker(
    containerId: string, options?: AnglePickerOptions
): AnglePicker
{
    return new AnglePicker(containerId, options);
}

(window as unknown as Record<string, unknown>)["AnglePicker"] = AnglePicker;
(window as unknown as Record<string, unknown>)["createAnglePicker"] = createAnglePicker;
