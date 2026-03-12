/*
 * ----------------------------------------------------------------------------
 * Copyright (c) 2026 PVK2007. All rights reserved.
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: Ruler
 * 📜 PURPOSE: Canvas-based calibrated ruler with cursor tracking, multiple
 *             unit systems (px, cm, mm, in, unit), and DPI awareness.
 * 🔗 RELATES: [[EnterpriseTheme]], [[RulerSpec]]
 * ⚡ FLOW: [Consumer App] -> [createRuler()] -> [Canvas 2D Rendering]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// S1 — INTERFACES
// ============================================================================

/** Configuration options for the Ruler component. */
export interface RulerOptions
{
    /** Ruler orientation. Default: "horizontal". */
    orientation?: "horizontal" | "vertical";
    /** Side where tick marks appear. Default: depends on orientation. */
    markingSide?: "top" | "bottom" | "left" | "right";
    /** Measurement unit. Default: "px". */
    unit?: "px" | "unit" | "cm" | "mm" | "in";
    /** For "unit" mode: CSS pixels per unit. Default: 1. */
    unitScale?: number;
    /** Ruler length in CSS px. Default: container width/height. */
    length?: number;
    /** Override auto-calculated major tick interval (in current unit). */
    majorInterval?: number;
    /** Show the cursor tracking line. Default: true. */
    showCursor?: boolean;
    /** Cursor line colour. Default: "#e03131" (red). */
    cursorColor?: string;
    /** Offset in CSS px where 0 starts. Default: 0. */
    origin?: number;
    /** Disable interaction. Default: false. */
    disabled?: boolean;
}

/** Tick subdivision configuration for a unit system. */
interface TickConfig
{
    /** Major tick interval in the unit. */
    major: number;
    /** Minor tick interval in the unit. */
    minor: number;
    /** Sub-minor tick interval in the unit. */
    sub: number;
}

// ============================================================================
// S2 — CONSTANTS
// ============================================================================

/** Log prefix for all console messages from this component. */
const LOG_PREFIX = "[Ruler]";

/** Base CSS class for the wrapper element. */
const CLS = "ruler";

/** Fallback tick/label colour (#495057 = gray-700 equivalent). */
const COLOR_TICK_FALLBACK = "#495057";

/** Fallback cursor line colour. */
const COLOR_CURSOR_FALLBACK = "#e03131";

/** Fallback background colour (#f8f9fa = gray-100 equivalent). */
const COLOR_BG_FALLBACK = "#f8f9fa";

/** Resolve a CSS custom property from the document root. */
function resolveThemeColor(prop: string, fallback: string): string
{
    const val = getComputedStyle(document.documentElement)
        .getPropertyValue(prop).trim();
    return val || fallback;
}

/** Major tick height in CSS px. */
const TICK_MAJOR = 14;

/** Minor tick height in CSS px. */
const TICK_MINOR = 8;

/** Sub-minor tick height in CSS px. */
const TICK_SUB = 4;

/** Baseline stroke width. */
const BASELINE_WIDTH = 1;

/** Label font size in CSS px. */
const LABEL_FONT_SIZE = 9;

/** Label offset from tick top in CSS px. */
const LABEL_OFFSET = 3;

/** Fallback DPI when measurement fails. */
const FALLBACK_DPI = 96;

/** Default tick configurations per unit type. */
const DEFAULT_TICK_CONFIGS: Record<string, TickConfig> =
{
    px: { major: 100, minor: 50, sub: 10 },
    unit: { major: 1, minor: 0.5, sub: 0.1 },
    "in": { major: 1, minor: 0.5, sub: 0.25 },
    cm: { major: 1, minor: 0.5, sub: 0.1 },
    mm: { major: 10, minor: 5, sub: 1 }
};

// ============================================================================
// S3 — DOM HELPERS
// ============================================================================

/** Create an element with optional class name. */
function createElement(tag: string, className?: string): HTMLElement
{
    const el = document.createElement(tag);
    if (className)
    {
        el.className = className;
    }
    return el;
}

/** Set multiple attributes on an element. */
function setAttr(el: HTMLElement, attrs: Record<string, string>): void
{
    for (const [key, value] of Object.entries(attrs))
    {
        el.setAttribute(key, value);
    }
}

// ============================================================================
// S4 — RULER CLASS
// ============================================================================

/** Canvas-based calibrated ruler with cursor tracking. */
export class Ruler
{
    private containerId: string;
    private options: Required<RulerOptions>;
    private wrapperEl: HTMLElement | null = null;
    private canvasEl: HTMLCanvasElement | null = null;
    private ctx: CanvasRenderingContext2D | null = null;
    private dpi: number = FALLBACK_DPI;
    private dpr: number = 1;
    private cursorPos: number = -1;
    private boundMouseMove: ((e: MouseEvent) => void) | null = null;
    private boundMouseLeave: (() => void) | null = null;

    constructor(containerId: string, options: RulerOptions = {})
    {
        this.containerId = containerId;
        this.options = this.resolveOptions(options);
        this.init();
    }

    // ====================================================================
    // PUBLIC API
    // ====================================================================

    // @entrypoint
    /** Returns the wrapper element, or null if destroyed. */
    public getElement(): HTMLElement | null
    {
        return this.wrapperEl;
    }

    /** Change the measurement unit and re-render. */
    public setUnit(unit: "px" | "unit" | "cm" | "mm" | "in"): void
    {
        this.options.unit = unit;
        console.log(LOG_PREFIX, "Unit changed to", unit);
        this.render();
    }

    /** Change the orientation and re-render. */
    public setOrientation(orientation: "horizontal" | "vertical"): void
    {
        this.options.orientation = orientation;
        this.options.markingSide = this.defaultMarkingSide(orientation);
        this.updateOrientationClass();
        console.log(LOG_PREFIX, "Orientation changed to", orientation);
        this.resize();
    }

    /** Change the origin offset and re-render. */
    public setOrigin(origin: number): void
    {
        this.options.origin = origin;
        console.log(LOG_PREFIX, "Origin changed to", origin);
        this.render();
    }

    /** Set cursor position in CSS pixels along the ruler axis. */
    public setCursorPosition(px: number): void
    {
        this.cursorPos = px;
        this.render();
    }

    /** Re-measure DPI and re-render. */
    public calibrate(): void
    {
        this.dpi = this.measureDpi();
        console.log(LOG_PREFIX, "Calibrated DPI:", this.dpi);
        this.render();
    }

    /** Recalculate canvas size from container and re-render. */
    public resize(): void
    {
        if (!this.canvasEl || !this.wrapperEl)
        {
            return;
        }
        this.sizeCanvas();
        this.render();
    }

    /** Clean up all resources and remove DOM elements. */
    public destroy(): void
    {
        this.unbindEvents();
        if (this.wrapperEl && this.wrapperEl.parentNode)
        {
            this.wrapperEl.parentNode.removeChild(this.wrapperEl);
        }
        this.wrapperEl = null;
        this.canvasEl = null;
        this.ctx = null;
        console.log(LOG_PREFIX, "Destroyed");
    }

    // ====================================================================
    // PRIVATE: INITIALISATION
    // ====================================================================

    /** Initialise the ruler: build DOM, measure DPI, render. */
    private init(): void
    {
        const container = document.getElementById(this.containerId);
        if (!container)
        {
            console.error(LOG_PREFIX, "Container not found:", this.containerId);
            return;
        }

        this.dpr = window.devicePixelRatio || 1;
        this.dpi = this.measureDpi();
        this.buildDom(container);
        this.sizeCanvas();
        this.bindEvents();
        this.render();
        console.log(LOG_PREFIX, "Initialised", { dpi: this.dpi, dpr: this.dpr });
    }

    /** Resolve user options with defaults. */
    private resolveOptions(opts: RulerOptions): Required<RulerOptions>
    {
        const orientation = opts.orientation ?? "horizontal";
        return {
            orientation,
            markingSide: opts.markingSide ?? this.defaultMarkingSide(orientation),
            unit: opts.unit ?? "px",
            unitScale: opts.unitScale ?? 1,
            length: opts.length ?? 0,
            majorInterval: opts.majorInterval ?? 0,
            showCursor: opts.showCursor ?? true,
            cursorColor: opts.cursorColor ?? COLOR_CURSOR_FALLBACK,
            origin: opts.origin ?? 0,
            disabled: opts.disabled ?? false
        };
    }

    /** Return the default marking side for a given orientation. */
    private defaultMarkingSide(
        orientation: "horizontal" | "vertical"
    ): "top" | "bottom" | "left" | "right"
    {
        return orientation === "horizontal" ? "bottom" : "right";
    }

    // ====================================================================
    // PRIVATE: DOM CONSTRUCTION
    // ====================================================================

    /** Build the wrapper and canvas elements. */
    private buildDom(container: HTMLElement): void
    {
        const orientCls = this.orientationClass();
        const disabledCls = this.options.disabled ? `${CLS}-disabled` : "";
        this.wrapperEl = createElement(
            "div",
            `${CLS} ${orientCls} ${disabledCls}`.trim()
        );
        setAttr(this.wrapperEl, { "aria-label": "Ruler" });

        this.canvasEl = document.createElement("canvas");
        this.canvasEl.className = `${CLS}-canvas`;
        this.wrapperEl.appendChild(this.canvasEl);

        this.ctx = this.canvasEl.getContext("2d");
        container.appendChild(this.wrapperEl);
    }

    /** Return the CSS class for the current orientation. */
    private orientationClass(): string
    {
        return `${CLS}-${this.options.orientation}`;
    }

    /** Update orientation CSS classes on the wrapper. */
    private updateOrientationClass(): void
    {
        if (!this.wrapperEl)
        {
            return;
        }
        this.wrapperEl.className = this.wrapperEl.className
            .replace(/ruler-horizontal|ruler-vertical/, "")
            .trim();
        this.wrapperEl.classList.add(this.orientationClass());
    }

    // ====================================================================
    // PRIVATE: CANVAS SIZING
    // ====================================================================

    /** Set canvas dimensions to match wrapper, accounting for DPR. */
    private sizeCanvas(): void
    {
        if (!this.canvasEl || !this.wrapperEl)
        {
            return;
        }
        const w = this.wrapperEl.clientWidth;
        const h = this.wrapperEl.clientHeight;
        this.canvasEl.width = w * this.dpr;
        this.canvasEl.height = h * this.dpr;
        this.canvasEl.style.width = `${w}px`;
        this.canvasEl.style.height = `${h}px`;
    }

    // ====================================================================
    // PRIVATE: DPI MEASUREMENT
    // ====================================================================

    /** Measure physical DPI using a hidden 1-inch element. */
    private measureDpi(): number
    {
        const el = document.createElement("div");
        el.style.cssText = "position:absolute;width:1in;height:1in;left:-100%;top:-100%;";
        document.body.appendChild(el);
        const dpi = el.offsetWidth;
        document.body.removeChild(el);
        return dpi || FALLBACK_DPI;
    }

    // ====================================================================
    // PRIVATE: RENDERING — MAIN
    // ====================================================================

    /** Full render pass: background, baseline, ticks, cursor. */
    private render(): void
    {
        if (!this.ctx || !this.canvasEl)
        {
            return;
        }

        const w = this.canvasEl.width / this.dpr;
        const h = this.canvasEl.height / this.dpr;

        this.ctx.save();
        this.ctx.scale(this.dpr, this.dpr);

        this.drawBackground(this.ctx, w, h);
        this.drawBaseline(this.ctx, w, h);
        this.drawTicks(this.ctx, w, h);
        this.drawCursorLine(this.ctx, w, h);

        this.ctx.restore();
    }

    // ====================================================================
    // PRIVATE: RENDERING — BACKGROUND
    // ====================================================================

    /** Fill the canvas with the background colour. */
    private drawBackground(
        ctx: CanvasRenderingContext2D, w: number, h: number
    ): void
    {
        ctx.fillStyle = resolveThemeColor(
            "--theme-surface-raised-bg", COLOR_BG_FALLBACK
        );
        ctx.fillRect(0, 0, w, h);
    }

    // ====================================================================
    // PRIVATE: RENDERING — BASELINE
    // ====================================================================

    /** Draw the baseline edge along the marking side. */
    private drawBaseline(
        ctx: CanvasRenderingContext2D, w: number, h: number
    ): void
    {
        ctx.strokeStyle = resolveThemeColor("--theme-text-secondary", COLOR_TICK_FALLBACK);
        ctx.lineWidth = BASELINE_WIDTH;
        ctx.beginPath();

        const pos = this.baselinePosition(w, h);
        if (this.isHorizontal())
        {
            ctx.moveTo(0, pos);
            ctx.lineTo(w, pos);
        }
        else
        {
            ctx.moveTo(pos, 0);
            ctx.lineTo(pos, h);
        }
        ctx.stroke();
    }

    /** Calculate baseline Y (horizontal) or X (vertical) position. */
    private baselinePosition(w: number, h: number): number
    {
        if (this.isHorizontal())
        {
            return this.isMarkingNear() ? 0 : h;
        }
        return this.isMarkingNear() ? 0 : w;
    }

    // ====================================================================
    // PRIVATE: RENDERING — TICKS
    // ====================================================================

    /** Draw all tick marks across the ruler length. */
    private drawTicks(
        ctx: CanvasRenderingContext2D, w: number, h: number
    ): void
    {
        const rulerLen = this.rulerLength(w, h);
        const cfg = this.tickConfig();
        const pxPerUnit = this.pxPerUnit();
        const subPx = cfg.sub * pxPerUnit;

        if (subPx <= 0)
        {
            return;
        }

        const origin = this.options.origin;
        this.iterateTicks(ctx, w, h, rulerLen, cfg, pxPerUnit, subPx, origin);
    }

    /** Iterate over tick positions and dispatch drawing. */
    private iterateTicks(
        ctx: CanvasRenderingContext2D,
        w: number,
        h: number,
        rulerLen: number,
        cfg: TickConfig,
        pxPerUnit: number,
        subPx: number,
        origin: number
    ): void
    {
        const startPx = -(origin % subPx);
        for (let px = startPx; px <= rulerLen; px += subPx)
        {
            const unitVal = (px + origin) / pxPerUnit;
            const tickH = this.classifyTick(unitVal, cfg);
            this.drawSingleTick(ctx, px, tickH, w, h);

            if (tickH === TICK_MAJOR)
            {
                const label = this.formatLabel(unitVal);
                this.drawLabel(ctx, px, label, w, h);
            }
        }
    }

    /** Classify the tick height based on unit value alignment. */
    private classifyTick(unitVal: number, cfg: TickConfig): number
    {
        if (this.isMultipleOf(unitVal, cfg.major))
        {
            return TICK_MAJOR;
        }
        if (this.isMultipleOf(unitVal, cfg.minor))
        {
            return TICK_MINOR;
        }
        return TICK_SUB;
    }

    /** Check if a value is a multiple of a divisor (with tolerance). */
    private isMultipleOf(value: number, divisor: number): boolean
    {
        if (divisor === 0)
        {
            return false;
        }
        const remainder = Math.abs(value % divisor);
        const tolerance = divisor * 0.001;
        return remainder < tolerance || (divisor - remainder) < tolerance;
    }

    // ====================================================================
    // PRIVATE: RENDERING — SINGLE TICK
    // ====================================================================

    /** Draw a single tick line at the given position. */
    private drawSingleTick(
        ctx: CanvasRenderingContext2D,
        pos: number,
        tickH: number,
        w: number,
        h: number
    ): void
    {
        ctx.strokeStyle = resolveThemeColor("--theme-text-secondary", COLOR_TICK_FALLBACK);
        ctx.lineWidth = 1;
        ctx.beginPath();

        const coords = this.tickCoords(pos, tickH, w, h);
        ctx.moveTo(coords.x1, coords.y1);
        ctx.lineTo(coords.x2, coords.y2);
        ctx.stroke();
    }

    /** Compute start/end coordinates for a tick mark. */
    private tickCoords(
        pos: number,
        tickH: number,
        w: number,
        h: number
    ): { x1: number; y1: number; x2: number; y2: number }
    {
        if (this.isHorizontal())
        {
            return this.horizontalTickCoords(pos, tickH, h);
        }
        return this.verticalTickCoords(pos, tickH, w);
    }

    /** Tick coordinates for horizontal orientation. */
    private horizontalTickCoords(
        pos: number, tickH: number, h: number
    ): { x1: number; y1: number; x2: number; y2: number }
    {
        if (this.isMarkingNear())
        {
            return { x1: pos, y1: 0, x2: pos, y2: tickH };
        }
        return { x1: pos, y1: h - tickH, x2: pos, y2: h };
    }

    /** Tick coordinates for vertical orientation. */
    private verticalTickCoords(
        pos: number, tickH: number, w: number
    ): { x1: number; y1: number; x2: number; y2: number }
    {
        if (this.isMarkingNear())
        {
            return { x1: 0, y1: pos, x2: tickH, y2: pos };
        }
        return { x1: w - tickH, y1: pos, x2: w, y2: pos };
    }

    // ====================================================================
    // PRIVATE: RENDERING — LABELS
    // ====================================================================

    /** Draw a text label at a major tick position. */
    private drawLabel(
        ctx: CanvasRenderingContext2D,
        pos: number,
        text: string,
        w: number,
        h: number
    ): void
    {
        ctx.fillStyle = resolveThemeColor("--theme-text-secondary", COLOR_TICK_FALLBACK);
        ctx.font = `${LABEL_FONT_SIZE}px sans-serif`;

        if (this.isHorizontal())
        {
            this.drawHorizontalLabel(ctx, pos, text, h);
        }
        else
        {
            this.drawVerticalLabel(ctx, pos, text, w);
        }
    }

    /** Draw label text for horizontal ruler. */
    private drawHorizontalLabel(
        ctx: CanvasRenderingContext2D,
        pos: number,
        text: string,
        h: number
    ): void
    {
        ctx.textAlign = "center";
        if (this.isMarkingNear())
        {
            ctx.textBaseline = "top";
            ctx.fillText(text, pos, TICK_MAJOR + LABEL_OFFSET);
        }
        else
        {
            ctx.textBaseline = "bottom";
            ctx.fillText(text, pos, h - TICK_MAJOR - LABEL_OFFSET);
        }
    }

    /** Draw label text for vertical ruler. */
    private drawVerticalLabel(
        ctx: CanvasRenderingContext2D,
        pos: number,
        text: string,
        w: number
    ): void
    {
        ctx.save();
        if (this.isMarkingNear())
        {
            ctx.translate(TICK_MAJOR + LABEL_OFFSET, pos);
        }
        else
        {
            ctx.translate(w - TICK_MAJOR - LABEL_OFFSET, pos);
        }
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, 0, 0);
        ctx.restore();
    }

    // ====================================================================
    // PRIVATE: RENDERING — CURSOR
    // ====================================================================

    /** Draw the cursor tracking line if enabled and position is set. */
    private drawCursorLine(
        ctx: CanvasRenderingContext2D, w: number, h: number
    ): void
    {
        if (!this.options.showCursor || this.cursorPos < 0)
        {
            return;
        }

        ctx.strokeStyle = this.options.cursorColor;
        ctx.lineWidth = 1;
        ctx.beginPath();

        if (this.isHorizontal())
        {
            ctx.moveTo(this.cursorPos, 0);
            ctx.lineTo(this.cursorPos, h);
        }
        else
        {
            ctx.moveTo(0, this.cursorPos);
            ctx.lineTo(w, this.cursorPos);
        }
        ctx.stroke();
    }

    // ====================================================================
    // PRIVATE: UNIT CONVERSION & TICK CONFIG
    // ====================================================================

    /** Return CSS pixels per one unit of the current measurement system. */
    private pxPerUnit(): number
    {
        switch (this.options.unit)
        {
            case "in":
                return this.dpi;
            case "cm":
                return this.dpi / 2.54;
            case "mm":
                return this.dpi / 25.4;
            case "unit":
                return this.options.unitScale;
            default:
                return 1;
        }
    }

    /** Get the tick subdivision config for the current unit. */
    private tickConfig(): TickConfig
    {
        const mi = this.options.majorInterval;
        if (mi > 0)
        {
            return { major: mi, minor: mi / 2, sub: mi / 10 };
        }
        return DEFAULT_TICK_CONFIGS[this.options.unit] ?? DEFAULT_TICK_CONFIGS["px"];
    }

    /** Format a numeric unit value as a label string. */
    private formatLabel(unitVal: number): string
    {
        const rounded = Math.round(unitVal * 100) / 100;
        if (Number.isInteger(rounded))
        {
            return String(rounded);
        }
        return rounded.toFixed(1);
    }

    // ====================================================================
    // PRIVATE: ORIENTATION HELPERS
    // ====================================================================

    /** True if the ruler is horizontal. */
    private isHorizontal(): boolean
    {
        return this.options.orientation === "horizontal";
    }

    /** True if markingSide is top (horizontal) or left (vertical). */
    private isMarkingNear(): boolean
    {
        const side = this.options.markingSide;
        return side === "top" || side === "left";
    }

    /** Determine the ruler drawing length from canvas size. */
    private rulerLength(w: number, h: number): number
    {
        if (this.options.length > 0)
        {
            return this.options.length;
        }
        return this.isHorizontal() ? w : h;
    }

    // ====================================================================
    // PRIVATE: EVENT BINDING
    // ====================================================================

    /** Bind mousemove and mouseleave for cursor tracking. */
    private bindEvents(): void
    {
        if (!this.canvasEl || !this.options.showCursor)
        {
            return;
        }

        this.boundMouseMove = (e: MouseEvent) => this.handleMouseMove(e);
        this.boundMouseLeave = () => this.handleMouseLeave();

        this.canvasEl.addEventListener("mousemove", this.boundMouseMove);
        this.canvasEl.addEventListener("mouseleave", this.boundMouseLeave);
    }

    /** Unbind mouse event listeners. */
    private unbindEvents(): void
    {
        if (!this.canvasEl)
        {
            return;
        }
        if (this.boundMouseMove)
        {
            this.canvasEl.removeEventListener("mousemove", this.boundMouseMove);
        }
        if (this.boundMouseLeave)
        {
            this.canvasEl.removeEventListener("mouseleave", this.boundMouseLeave);
        }
    }

    /** Handle mousemove: update cursor position and re-render. */
    private handleMouseMove(e: MouseEvent): void
    {
        if (!this.canvasEl || this.options.disabled)
        {
            return;
        }
        const rect = this.canvasEl.getBoundingClientRect();
        this.cursorPos = this.isHorizontal()
            ? e.clientX - rect.left
            : e.clientY - rect.top;
        this.render();
    }

    /** Handle mouseleave: clear cursor and re-render. */
    private handleMouseLeave(): void
    {
        this.cursorPos = -1;
        this.render();
    }
}

// ============================================================================
// S5 — FACTORY & GLOBAL EXPORTS
// ============================================================================

// @entrypoint
/** Create a Ruler instance attached to the given container. */
export function createRuler(
    containerId: string, options: RulerOptions = {}
): Ruler
{
    return new Ruler(containerId, options);
}

(window as unknown as Record<string, unknown>)["Ruler"] = Ruler;
(window as unknown as Record<string, unknown>)["createRuler"] = createRuler;
