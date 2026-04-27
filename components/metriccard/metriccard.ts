/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: MetricCard
 * PURPOSE: Single-value KPI card for dashboard "KPI strips". Shows one
 *    prominent value with a label, optional trend delta, optional inline
 *    sparkline, optional secondary stat, and four lifecycle states
 *    (ready | loading | error | empty). Async-source friendly.
 * RELATES: [[EnterpriseTheme]], [[CustomComponents]], [[ADR-129]]
 * FLOW: [Consumer] -> [createMetricCard()] -> [DOM card element]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// TYPES
// ============================================================================

/** Lifecycle state for the card. */
export type MetricCardState = "ready" | "loading" | "error" | "empty";

/** Trend arrow direction. */
export type MetricCardTrendDirection = "up" | "down" | "flat";

/** Semantic intent for trend colour. */
export type MetricCardTrendIntent = "positive" | "negative" | "neutral";

/** Card density. */
export type MetricCardSize = "sm" | "md";

/** Trend annotation under the value. */
export interface MetricCardTrend
{
    direction: MetricCardTrendDirection;
    text: string;
    /**
     * Override the auto-derived intent. Defaults: up=positive,
     * down=negative, flat=neutral. Override for cases like "errors
     * increased" (direction up + intent negative).
     */
    intent?: MetricCardTrendIntent;
}

/** Configuration options for the MetricCard component. */
export interface MetricCardOptions
{
    /** Mount point. Required. */
    container: HTMLElement;

    /** Small uppercase eyebrow, e.g. "ACTIVE USERS". */
    label: string;

    /** Big number, formatted. Async sources can pass a placeholder
     *  and call setState("loading") until the value resolves. */
    value: string | number;

    /** Bootstrap Icons class (e.g. "bi-people"), rendered top-right. */
    icon?: string;

    /** Trend annotation (arrow + text). */
    trend?: MetricCardTrend;

    /** Secondary stat below the value, e.g. "of 10 GB cap". */
    secondary?: string;

    /** Inline sparkline (24px tall). Single-element arrays render
     *  a flat baseline. Empty array omits the sparkline entirely. */
    sparkline?: number[];

    /** Navigates on click; turns the card root into <a href>. */
    href?: string;

    /** Click handler; turns the card root into <button> (when href
     *  is not also set). */
    onClick?: (evt: MouseEvent) => void;

    /** Lifecycle state. Default "ready". */
    state?: MetricCardState;

    /** Error text shown under the em-dash when state is "error". */
    errorText?: string;

    /** Card density. Default "md". */
    size?: MetricCardSize;

    /** Override the auto-generated "<label>: <value>" aria-label. */
    ariaLabel?: string;

    /** Extra CSS class(es) on the root. */
    cssClass?: string;

    /** DOM id on the root. */
    id?: string;
}

/** Imperative handle returned by createMetricCard / new MetricCard. */
export interface MetricCardHandle
{
    setValue(value: string | number): void;
    setTrend(trend: MetricCardTrend | null): void;
    setSecondary(text: string | null): void;
    setState(state: MetricCardState, errorText?: string): void;
    getRootElement(): HTMLElement | null;
    destroy(): void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[MetricCard]";
const SVG_NS = "http://www.w3.org/2000/svg";
const SPARK_W = 80;
const SPARK_H = 24;
const SPARK_PAD = 1;
const EM_DASH = "\u2014";

const TREND_INTENT_CLASS: Record<MetricCardTrendIntent, string> =
{
    positive: "metriccard-trend-positive",
    negative: "metriccard-trend-negative",
    neutral: "metriccard-trend-neutral",
};

const SPARKLINE_INTENT_CLASS: Record<MetricCardTrendIntent, string> =
{
    positive: "metriccard-sparkline-positive",
    negative: "metriccard-sparkline-negative",
    neutral: "metriccard-sparkline-neutral",
};

const TREND_ARROW: Record<MetricCardTrendDirection, string> =
{
    up:   "\u2191",
    down: "\u2193",
    flat: "\u2192",
};

let instanceCounter = 0;

// ============================================================================
// LOGGING
// ============================================================================

const _lu =
    (typeof (window as unknown as Record<string, unknown>)
        ["createLogUtility"] === "function")
        ? ((window as unknown as Record<string, unknown>)
            ["createLogUtility"] as () => {
                getLogger: (n: string) => Record<string,
                    (...a: unknown[]) => void>;
            })().getLogger("MetricCard")
        : null;

function logInfo(...a: unknown[]): void
{
    _lu ? _lu.info(...a)
        : console.log(new Date().toISOString(), "[INFO]", LOG_PREFIX, ...a);
}

function logDebug(...a: unknown[]): void
{
    _lu ? _lu.debug(...a)
        : console.debug(new Date().toISOString(), "[DEBUG]", LOG_PREFIX, ...a);
}

function logError(...a: unknown[]): void
{
    _lu ? _lu.error(...a)
        : console.error(new Date().toISOString(), "[ERROR]", LOG_PREFIX, ...a);
}

// ============================================================================
// DOM HELPERS
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
    if (text !== undefined)
    {
        el.textContent = text;
    }
    return el;
}

function setAttr(el: Element, name: string, value: string): void
{
    el.setAttribute(name, value);
}

function svgEl(tag: string, classes: string[]): SVGElement
{
    const el = document.createElementNS(SVG_NS, tag) as SVGElement;
    if (classes.length > 0)
    {
        el.setAttribute("class", classes.join(" "));
    }
    return el;
}

// ============================================================================
// PURE HELPERS
// ============================================================================

/** Auto-derived intent from direction when no explicit override. */
function deriveIntent(t: MetricCardTrend): MetricCardTrendIntent
{
    if (t.intent)
    {
        return t.intent;
    }
    if (t.direction === "up")
    {
        return "positive";
    }
    if (t.direction === "down")
    {
        return "negative";
    }
    return "neutral";
}

/** Choose the root tag based on click semantics (ADR-129). */
function rootTagFor(opts: MetricCardOptions): "a" | "button" | "div"
{
    if (opts.href)
    {
        return "a";
    }
    if (opts.onClick)
    {
        return "button";
    }
    return "div";
}

/** Format a sparkline polyline points string. */
function buildSparklinePoints(values: number[]): string
{
    if (values.length === 1)
    {
        const y = SPARK_H / 2;
        return `${SPARK_PAD},${y} ${SPARK_W - SPARK_PAD},${y}`;
    }
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const usableW = SPARK_W - 2 * SPARK_PAD;
    const usableH = SPARK_H - 2 * SPARK_PAD;
    const stepX = usableW / (values.length - 1);
    const pts: string[] = [];
    for (let i = 0; i < values.length; i += 1)
    {
        const x = SPARK_PAD + i * stepX;
        const y = SPARK_PAD + usableH * (1 - (values[i] - min) / range);
        pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
    }
    return pts.join(" ");
}

// ============================================================================
// PUBLIC API
// ============================================================================

// @entrypoint
// ⚓ MetricCard
/**
 * Single-value KPI card for dashboard strips. See ADR-129 for design
 * rationale (states, click semantics, theme tokens).
 */
export class MetricCard implements MetricCardHandle
{
    private readonly instanceId: string;
    private opts: MetricCardOptions;

    private rootEl: HTMLElement | null = null;
    private labelEl: HTMLElement | null = null;
    private valueEl: HTMLElement | null = null;
    private iconEl: HTMLElement | null = null;
    private trendEl: HTMLElement | null = null;
    private secondaryEl: HTMLElement | null = null;
    private sparklineEl: SVGElement | null = null;
    private skeletonEl: HTMLElement | null = null;
    private errorEl: HTMLElement | null = null;

    private boundClick: ((e: MouseEvent) => void) | null = null;
    private destroyed = false;

    constructor(options: MetricCardOptions)
    {
        instanceCounter += 1;
        this.instanceId = `metriccard-${instanceCounter}`;
        this.opts =
        {
            size: "md",
            state: "ready",
            ...options,
        };
        this.build();
        this.opts.container.appendChild(this.rootEl as HTMLElement);
        logInfo("Initialised:", this.instanceId);
        logDebug("Options:", { label: this.opts.label, value: this.opts.value });
    }

    // ------------------------------------------------------------------------
    // PUBLIC -- HANDLE METHODS
    // ------------------------------------------------------------------------

    public getRootElement(): HTMLElement | null
    {
        return this.rootEl;
    }

    public setValue(value: string | number): void
    {
        this.opts.value = value;
        this.renderValueText();
        this.refreshAriaLabel();
    }

    public setTrend(trend: MetricCardTrend | null): void
    {
        this.opts.trend = trend ?? undefined;
        this.removeTrendEl();
        if (trend && this.opts.state !== "loading")
        {
            this.appendTrend();
        }
    }

    public setSecondary(text: string | null): void
    {
        this.opts.secondary = text ?? undefined;
        this.removeSecondaryEl();
        if (text)
        {
            this.appendSecondary();
        }
    }

    public setState(state: MetricCardState, errorText?: string): void
    {
        this.opts.state = state;
        if (state === "error")
        {
            this.opts.errorText = errorText;
        }
        else
        {
            this.opts.errorText = undefined;
        }
        this.applyStateAttr();
        this.renderValueText();
        this.refreshLoadingSkeleton();
        this.refreshErrorEl();
        this.refreshTrendVisibility();
    }

    public destroy(): void
    {
        if (this.destroyed)
        {
            return;
        }
        this.destroyed = true;
        this.removeClickListener();
        if (this.rootEl && this.rootEl.parentNode)
        {
            this.rootEl.remove();
        }
        this.rootEl = null;
        this.labelEl = null;
        this.valueEl = null;
        this.iconEl = null;
        this.trendEl = null;
        this.secondaryEl = null;
        this.sparklineEl = null;
        this.skeletonEl = null;
        this.errorEl = null;
        logDebug("Destroyed:", this.instanceId);
    }

    // ------------------------------------------------------------------------
    // PRIVATE -- BUILD
    // ------------------------------------------------------------------------

    private build(): void
    {
        this.buildRoot();
        this.buildHeader();
        this.buildBody();
        this.applyClickBehaviour();
        this.refreshAriaLabel();
        this.applyStateAttr();
        this.refreshLoadingSkeleton();
        this.refreshErrorEl();
        this.refreshTrendVisibility();
    }

    private buildRoot(): void
    {
        const tag = rootTagFor(this.opts);
        const root = document.createElement(tag);
        root.classList.add("metriccard", `metriccard-${this.opts.size}`);
        if (this.opts.href || this.opts.onClick)
        {
            root.classList.add("metriccard-clickable");
        }
        if (this.opts.cssClass)
        {
            root.classList.add(...this.opts.cssClass.split(" ")
                .filter(s => s.length > 0));
        }
        if (this.opts.id)
        {
            root.id = this.opts.id;
        }
        if (tag === "a")
        {
            setAttr(root, "href", this.opts.href as string);
        }
        else if (tag === "button")
        {
            setAttr(root, "type", "button");
        }
        this.rootEl = root;
    }

    private buildHeader(): void
    {
        const header = createElement("div", ["metriccard-header"]);
        this.labelEl = createElement(
            "span", ["metriccard-label"], this.opts.label
        );
        header.appendChild(this.labelEl);
        if (this.opts.icon)
        {
            this.iconEl = createElement("i", [
                "metriccard-icon", "bi", this.opts.icon,
            ]);
            setAttr(this.iconEl, "aria-hidden", "true");
            header.appendChild(this.iconEl);
        }
        (this.rootEl as HTMLElement).appendChild(header);
    }

    private buildBody(): void
    {
        const body = createElement("div", ["metriccard-body"]);
        this.valueEl = createElement("span", ["metriccard-value"]);
        body.appendChild(this.valueEl);
        this.renderValueText();
        if (this.opts.sparkline && this.opts.sparkline.length > 0)
        {
            this.appendSparkline(body);
        }
        if (this.opts.trend)
        {
            this.appendTrend(body);
        }
        if (this.opts.secondary)
        {
            this.appendSecondary(body);
        }
        (this.rootEl as HTMLElement).appendChild(body);
    }

    private appendSparkline(parent?: HTMLElement): void
    {
        const values = this.opts.sparkline as number[];
        const intent = this.opts.trend
            ? deriveIntent(this.opts.trend)
            : "neutral";
        const svg = svgEl("svg", [
            "metriccard-sparkline",
            SPARKLINE_INTENT_CLASS[intent],
        ]);
        setAttr(svg, "viewBox", `0 0 ${SPARK_W} ${SPARK_H}`);
        setAttr(svg, "width", String(SPARK_W));
        setAttr(svg, "height", String(SPARK_H));
        setAttr(svg, "preserveAspectRatio", "none");
        setAttr(svg, "aria-hidden", "true");
        const poly = svgEl("polyline", []);
        setAttr(poly, "points", buildSparklinePoints(values));
        setAttr(poly, "fill", "none");
        setAttr(poly, "stroke", "currentColor");
        setAttr(poly, "stroke-width", "1.5");
        setAttr(poly, "stroke-linejoin", "round");
        setAttr(poly, "stroke-linecap", "round");
        svg.appendChild(poly);
        const target = parent ?? this.findBody();
        target?.appendChild(svg);
        this.sparklineEl = svg;
    }

    private appendTrend(parent?: HTMLElement): void
    {
        const t = this.opts.trend as MetricCardTrend;
        const intent = deriveIntent(t);
        const trend = createElement("div", [
            "metriccard-trend",
            TREND_INTENT_CLASS[intent],
        ]);
        const arrow = createElement("span",
            ["metriccard-trend-arrow"], TREND_ARROW[t.direction]);
        setAttr(arrow, "aria-hidden", "true");
        const text = createElement("span",
            ["metriccard-trend-text"], t.text);
        trend.appendChild(arrow);
        trend.appendChild(text);
        const target = parent ?? this.findBody();
        target?.appendChild(trend);
        this.trendEl = trend;
    }

    private appendSecondary(parent?: HTMLElement): void
    {
        const sec = createElement(
            "div", ["metriccard-secondary"], this.opts.secondary as string
        );
        const target = parent ?? this.findBody();
        target?.appendChild(sec);
        this.secondaryEl = sec;
    }

    private findBody(): HTMLElement | null
    {
        if (!this.rootEl) { return null; }
        return this.rootEl.querySelector(".metriccard-body");
    }

    // ------------------------------------------------------------------------
    // PRIVATE -- CLICK
    // ------------------------------------------------------------------------

    private applyClickBehaviour(): void
    {
        if (!this.opts.onClick || !this.rootEl)
        {
            return;
        }
        this.boundClick = (e: MouseEvent) =>
        {
            try
            {
                (this.opts.onClick as (e: MouseEvent) => void)(e);
            }
            catch (err)
            {
                logError("onClick callback error:", err);
            }
        };
        this.rootEl.addEventListener("click", this.boundClick);
    }

    private removeClickListener(): void
    {
        if (this.rootEl && this.boundClick)
        {
            this.rootEl.removeEventListener("click", this.boundClick);
        }
        this.boundClick = null;
    }

    // ------------------------------------------------------------------------
    // PRIVATE -- STATE / RENDER
    // ------------------------------------------------------------------------

    private applyStateAttr(): void
    {
        if (!this.rootEl) { return; }
        const state = this.opts.state as MetricCardState;
        setAttr(this.rootEl, "data-state", state);
        if (state === "loading")
        {
            setAttr(this.rootEl, "aria-busy", "true");
        }
        else
        {
            this.rootEl.removeAttribute("aria-busy");
        }
    }

    private renderValueText(): void
    {
        if (!this.valueEl) { return; }
        const state = this.opts.state as MetricCardState;
        if (state === "error" || state === "empty")
        {
            this.valueEl.textContent = EM_DASH;
            return;
        }
        this.valueEl.textContent = String(this.opts.value);
    }

    private refreshLoadingSkeleton(): void
    {
        if (!this.valueEl) { return; }
        const state = this.opts.state as MetricCardState;
        if (state === "loading" && !this.skeletonEl)
        {
            this.skeletonEl = createElement(
                "span", ["metriccard-skeleton"]
            );
            setAttr(this.skeletonEl, "aria-hidden", "true");
            // Sit alongside the value so geometry stays reserved.
            this.valueEl.parentElement?.insertBefore(
                this.skeletonEl, this.valueEl.nextSibling
            );
        }
        else if (state !== "loading" && this.skeletonEl)
        {
            this.skeletonEl.remove();
            this.skeletonEl = null;
        }
    }

    private refreshErrorEl(): void
    {
        if (!this.rootEl) { return; }
        if (this.opts.state === "error" && this.opts.errorText)
        {
            if (!this.errorEl)
            {
                this.errorEl = createElement(
                    "div", ["metriccard-error"], this.opts.errorText
                );
                this.findBody()?.appendChild(this.errorEl);
            }
            else
            {
                this.errorEl.textContent = this.opts.errorText;
            }
        }
        else if (this.errorEl)
        {
            this.errorEl.remove();
            this.errorEl = null;
        }
    }

    private refreshTrendVisibility(): void
    {
        if (!this.trendEl) { return; }
        if (this.opts.state === "loading")
        {
            this.trendEl.classList.add("metriccard-hidden");
        }
        else
        {
            this.trendEl.classList.remove("metriccard-hidden");
        }
    }

    private removeTrendEl(): void
    {
        if (this.trendEl)
        {
            this.trendEl.remove();
            this.trendEl = null;
        }
    }

    private removeSecondaryEl(): void
    {
        if (this.secondaryEl)
        {
            this.secondaryEl.remove();
            this.secondaryEl = null;
        }
    }

    private refreshAriaLabel(): void
    {
        if (!this.rootEl) { return; }
        if (this.opts.ariaLabel)
        {
            setAttr(this.rootEl, "aria-label", this.opts.ariaLabel);
            return;
        }
        setAttr(this.rootEl, "aria-label",
            `${this.opts.label}: ${this.opts.value}`);
    }
}

// ============================================================================
// CONVENIENCE FACTORY
// ============================================================================

// @entrypoint
// ⚓ createMetricCard
/** Construct a MetricCard. The card mounts itself into options.container. */
export function createMetricCard(
    options: MetricCardOptions
): MetricCardHandle
{
    return new MetricCard(options);
}

// ============================================================================
// GLOBAL EXPORTS (for IIFE consumers)
// ============================================================================

(window as unknown as Record<string, unknown>)["MetricCard"] = MetricCard;
(window as unknown as Record<string, unknown>)["createMetricCard"] =
    createMetricCard;
