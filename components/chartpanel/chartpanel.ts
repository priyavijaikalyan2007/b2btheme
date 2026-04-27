/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: ChartPanel
 * PURPOSE: Theme-aware Chart.js wrapper. Bar, line, area, sparkline kinds.
 *    Reads `window.Chart` (ADR-028 / ADR-130 external-globals pattern);
 *    no Chart.js bundled inside. Re-themes on `data-bs-theme` toggle via
 *    MutationObserver. Includes loading/error/empty states and a screen-
 *    reader fallback table.
 * RELATES: [[EnterpriseTheme]], [[CustomComponents]], [[ADR-130]],
 *    [[CodeEditor (ADR-028 precedent)]]
 * FLOW: [Consumer] -> [createChartPanel()] -> [DOM root + canvas + Chart.js]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// PUBLIC TYPES
// ============================================================================

export type ChartPanelKind = "bar" | "line" | "area" | "sparkline";

export type ChartPanelState = "ready" | "loading" | "error" | "empty";

export type ChartPanelIntent =
    | "primary" | "success" | "warning" | "danger" | "info" | "neutral";

export interface ChartPanelSeries
{
    id: string;
    label: string;
    /** y-values; one per category */
    data: number[];
    /** Maps to a --theme-* token. If omitted, the wrapper cycles a
     *  stable palette across seriesIndex. */
    intent?: ChartPanelIntent;
}

export interface ChartPanelYAxis
{
    min?: number;
    max?: number;
    integer?: boolean;
    label?: string;
    format?: (v: number) => string;
    grid?: boolean;
}

export interface ChartPanelXAxis
{
    label?: string;
    grid?: boolean;
    rotate?: 0 | 45 | 90;
}

export interface ChartPanelOptions
{
    container: HTMLElement;
    kind: ChartPanelKind;

    categories: string[];
    series: ChartPanelSeries[];

    yAxis?: ChartPanelYAxis;
    xAxis?: ChartPanelXAxis;

    showLegend?: boolean;
    showValueLabels?: boolean;
    smoothing?: "none" | "monotone";

    state?: ChartPanelState;
    errorText?: string;
    emptyText?: string;

    /** REQUIRED. Chart is not decorative. */
    ariaLabel: string;
    /** Default true. Renders a visually-hidden <table> for SR users. */
    fallbackTable?: boolean;

    cssClass?: string;
    id?: string;
}

export interface ChartPanelHandle
{
    setData(categories: string[], series: ChartPanelSeries[]): void;
    setState(state: ChartPanelState, errorText?: string): void;
    resize(): void;
    exportPNG(): Promise<Blob>;
    getRootElement(): HTMLElement | null;
    destroy(): void;
}

// ============================================================================
// MINIMAL CHART.JS SHAPE (we only call a tiny surface)
// ============================================================================

interface ChartLike
{
    update: (mode?: string) => void;
    resize: () => void;
    destroy: () => void;
    canvas: HTMLCanvasElement;
}

interface ChartCtor
{
    new (canvas: HTMLCanvasElement, config: unknown): ChartLike;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[ChartPanel]";
const RESIZE_DEBOUNCE_MS = 100;

const PALETTE_INTENTS: ChartPanelIntent[] =
    ["primary", "info", "success", "warning", "danger", "neutral"];

/** Hard-coded fallbacks used when CSS vars are unavailable (jsdom, very
 *  early in page load, etc.). Mirrors the light defaults from
 *  src/scss/_dark-mode.scss. */
const FALLBACK_INTENT_HEX: Record<ChartPanelIntent, string> =
{
    primary: "#2563eb",
    success: "#15803d",
    warning: "#eab308",
    danger:  "#dc2626",
    info:    "#0284c7",
    neutral: "#6b7280",
};

const INTENT_TO_VAR: Record<ChartPanelIntent, string> =
{
    primary: "--theme-primary",
    success: "--theme-success",
    warning: "--theme-warning",
    danger:  "--theme-danger",
    info:    "--theme-primary", // No --theme-info; primary is closest
    neutral: "--theme-text-muted",
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
            })().getLogger("ChartPanel")
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

// ============================================================================
// THEME RESOLUTION
// ============================================================================

function getChartCtor(): ChartCtor | null
{
    const v = (window as unknown as Record<string, unknown>)["Chart"];
    if (typeof v === "function")
    {
        return v as ChartCtor;
    }
    return null;
}

function resolveCssVar(name: string, fallback: string): string
{
    try
    {
        const v = getComputedStyle(document.documentElement)
            .getPropertyValue(name).trim();
        return v.length > 0 ? v : fallback;
    }
    catch
    {
        return fallback;
    }
}

function resolveIntentColour(intent: ChartPanelIntent): string
{
    return resolveCssVar(INTENT_TO_VAR[intent], FALLBACK_INTENT_HEX[intent]);
}

interface ThemeColours
{
    text: string;
    textMuted: string;
    border: string;
    grid: string;
    surfaceRaised: string;
}

function readThemeColours(): ThemeColours
{
    return {
        text:           resolveCssVar("--theme-text-primary",   "#0f172a"),
        textMuted:      resolveCssVar("--theme-text-muted",     "#6b7280"),
        border:         resolveCssVar("--theme-border-color",   "#cbd5e1"),
        grid:           resolveCssVar("--theme-border-subtle",  "#e2e8f0"),
        surfaceRaised:  resolveCssVar("--theme-surface-raised-bg", "#ffffff"),
    };
}

// ============================================================================
// CONFIG BUILDERS (broken up for readability + 30-line rule)
// ============================================================================

function pickIntentForIndex(
    s: ChartPanelSeries, idx: number
): ChartPanelIntent
{
    if (s.intent)
    {
        return s.intent;
    }
    return PALETTE_INTENTS[idx % PALETTE_INTENTS.length];
}

function buildDataset(
    s: ChartPanelSeries, idx: number, kind: ChartPanelKind,
    smoothing: "none" | "monotone"
): Record<string, unknown>
{
    const intent = pickIntentForIndex(s, idx);
    const colour = resolveIntentColour(intent);
    const isLineLike = kind === "line" || kind === "area"
        || kind === "sparkline";
    return {
        label: s.label,
        data: s.data,
        backgroundColor: colour,
        borderColor: colour,
        borderWidth: isLineLike ? 2 : 0,
        fill: kind === "area",
        tension: smoothing === "monotone" ? 0.35 : 0,
        pointRadius: kind === "sparkline" ? 0 : 2,
        pointHoverRadius: kind === "sparkline" ? 0 : 4,
    };
}

function buildYTicks(
    opts: ChartPanelOptions, theme: ThemeColours
): Record<string, unknown>
{
    const fmt = opts.yAxis?.format;
    return {
        color: theme.textMuted,
        stepSize: opts.yAxis?.integer ? 1 : undefined,
        callback: fmt ? (v: unknown) => fmt(Number(v)) : undefined,
    };
}

function buildScales(
    opts: ChartPanelOptions, theme: ThemeColours
): Record<string, Record<string, unknown>>
{
    const isSpark = opts.kind === "sparkline";
    return {
        x: {
            display: !isSpark,
            grid: { display: opts.xAxis?.grid ?? false, color: theme.grid },
            ticks: {
                color: theme.textMuted,
                maxRotation: opts.xAxis?.rotate ?? 0,
                minRotation: opts.xAxis?.rotate ?? 0,
            },
        },
        y: {
            display: !isSpark,
            min: opts.yAxis?.min,
            max: opts.yAxis?.max,
            grid: { display: opts.yAxis?.grid ?? true, color: theme.grid },
            ticks: buildYTicks(opts, theme),
        },
    };
}

function buildPlugins(
    opts: ChartPanelOptions, theme: ThemeColours
): Record<string, unknown>
{
    const wantLegend = opts.showLegend ?? (opts.series.length > 1);
    const isSpark = opts.kind === "sparkline";
    return {
        legend: {
            display: !isSpark && wantLegend,
            labels: { color: theme.text },
        },
        tooltip: {
            enabled: true,  // helpful even on sparkline
            backgroundColor: theme.surfaceRaised,
            borderColor:     theme.border,
            borderWidth: 1,
            titleColor: theme.text,
            bodyColor:  theme.text,
        },
    };
}

function buildChartConfig(
    opts: ChartPanelOptions, theme: ThemeColours, animate: boolean
): unknown
{
    const smoothing = opts.smoothing ?? "monotone";
    const datasets = opts.series.map((s, i) =>
        buildDataset(s, i, opts.kind, smoothing));
    const cjsType = (opts.kind === "bar") ? "bar" : "line";
    return {
        type: cjsType,
        data: { labels: opts.categories, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: animate ? undefined : false,
            scales: buildScales(opts, theme),
            plugins: buildPlugins(opts, theme),
        },
    };
}

// ============================================================================
// PUBLIC CLASS
// ============================================================================

// @entrypoint
// ⚓ ChartPanel
// @dependency: window.Chart (Chart.js >=4.4 <5; loaded by host app per ADR-130)
export class ChartPanel implements ChartPanelHandle
{
    private readonly instanceId: string;
    private opts: ChartPanelOptions;

    private rootEl: HTMLElement | null = null;
    private canvasEl: HTMLCanvasElement | null = null;
    private overlayEl: HTMLElement | null = null;
    private tableEl: HTMLTableElement | null = null;

    private chart: ChartLike | null = null;
    private themeObserver: MutationObserver | null = null;
    private resizeObserver: ResizeObserver | null = null;
    private resizeTimer: ReturnType<typeof setTimeout> | null = null;
    private destroyed = false;

    constructor(options: ChartPanelOptions)
    {
        instanceCounter += 1;
        this.instanceId = `chartpanel-${instanceCounter}`;
        this.opts =
        {
            state: "ready",
            fallbackTable: true,
            emptyText: "No data",
            ...options,
        };
        this.build();
        this.opts.container.appendChild(this.rootEl as HTMLElement);
        logInfo("Initialised:", this.instanceId,
            "kind:", this.opts.kind);
        logDebug("Series:", this.opts.series.map(s => s.id));
    }

    // ------------------------------------------------------------------------
    // PUBLIC API
    // ------------------------------------------------------------------------

    public getRootElement(): HTMLElement | null
    {
        return this.rootEl;
    }

    public setData(
        categories: string[], series: ChartPanelSeries[]
    ): void
    {
        const sameShape = this.sameSeriesIds(series);
        this.opts.categories = categories;
        this.opts.series = series;
        this.refreshFallbackTable();
        if (!this.chart || !sameShape)
        {
            this.rebuildChart(true);
            return;
        }
        // Same series IDs: in-place update without animation.
        this.chart.canvas; // touch to silence noUnused
        const cfg = buildChartConfig(this.opts, readThemeColours(),
            false) as { data: { labels: string[];
                datasets: Array<Record<string, unknown>> } };
        // Mutate the chart's existing config in place (Chart.js reads it
        // by reference) so that update("none") picks up the new values.
        const existing = (this.chart as unknown as
            { config: { data: { labels: string[];
                datasets: Array<Record<string, unknown>> } } }).config;
        existing.data.labels = cfg.data.labels;
        existing.data.datasets = cfg.data.datasets;
        this.chart.update("none");
    }

    public setState(state: ChartPanelState, errorText?: string): void
    {
        this.opts.state = state;
        if (state === "error")
        {
            this.opts.errorText = errorText;
        }
        this.refreshState();
    }

    public resize(): void
    {
        if (this.chart)
        {
            this.chart.resize();
        }
    }

    public exportPNG(): Promise<Blob>
    {
        return new Promise((resolve, reject) =>
        {
            if (!this.canvasEl)
            {
                reject(new Error(
                    "ChartPanel: cannot export PNG before chart is rendered"
                ));
                return;
            }
            this.canvasEl.toBlob(b =>
            {
                if (b)
                {
                    resolve(b);
                }
                else
                {
                    reject(new Error("ChartPanel: PNG export returned null"));
                }
            }, "image/png");
        });
    }

    public destroy(): void
    {
        if (this.destroyed)
        {
            return;
        }
        this.destroyed = true;
        this.tearDownObservers();
        this.destroyChartOnly();
        if (this.rootEl && this.rootEl.parentNode)
        {
            this.rootEl.remove();
        }
        this.rootEl = null;
        this.canvasEl = null;
        this.overlayEl = null;
        this.tableEl = null;
        logDebug("Destroyed:", this.instanceId);
    }

    private tearDownObservers(): void
    {
        if (this.themeObserver)
        {
            this.themeObserver.disconnect();
            this.themeObserver = null;
        }
        if (this.resizeObserver)
        {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        if (this.resizeTimer)
        {
            clearTimeout(this.resizeTimer);
            this.resizeTimer = null;
        }
    }

    // ------------------------------------------------------------------------
    // PRIVATE -- BUILD
    // ------------------------------------------------------------------------

    private build(): void
    {
        this.buildRoot();
        this.buildCanvas();
        this.buildFallbackTable();
        this.installObservers();
        this.refreshState();
    }

    private buildRoot(): void
    {
        const root = createElement("div", ["chartpanel"]);
        if (this.opts.cssClass)
        {
            root.classList.add(...this.opts.cssClass.split(" ")
                .filter(s => s.length > 0));
        }
        if (this.opts.id)
        {
            root.id = this.opts.id;
        }
        setAttr(root, "aria-label", this.opts.ariaLabel);
        setAttr(root, "role", "img");
        this.rootEl = root;
    }

    private buildCanvas(): void
    {
        const wrap = createElement("div", ["chartpanel-canvas-wrap"]);
        const canvas = document.createElement("canvas");
        canvas.classList.add("chartpanel-canvas");
        wrap.appendChild(canvas);
        (this.rootEl as HTMLElement).appendChild(wrap);
        this.canvasEl = canvas;
    }

    private buildFallbackTable(): void
    {
        if (this.opts.fallbackTable === false)
        {
            return;
        }
        const table = document.createElement("table");
        table.classList.add("chartpanel-sr-table");
        (this.rootEl as HTMLElement).appendChild(table);
        this.tableEl = table;
        this.refreshFallbackTable();
    }

    private refreshFallbackTable(): void
    {
        if (!this.tableEl) { return; }
        // Wipe and re-build the table; small surface, simple correctness.
        while (this.tableEl.firstChild)
        {
            this.tableEl.removeChild(this.tableEl.firstChild);
        }
        const thead = document.createElement("thead");
        const headRow = document.createElement("tr");
        headRow.appendChild(document.createElement("th"));
        for (const c of this.opts.categories)
        {
            const th = document.createElement("th");
            th.textContent = c;
            headRow.appendChild(th);
        }
        thead.appendChild(headRow);
        this.tableEl.appendChild(thead);
        const tbody = document.createElement("tbody");
        for (const s of this.opts.series)
        {
            const tr = document.createElement("tr");
            const labelCell = document.createElement("th");
            labelCell.scope = "row";
            labelCell.textContent = s.label;
            tr.appendChild(labelCell);
            for (const v of s.data)
            {
                const td = document.createElement("td");
                td.textContent = String(v);
                tr.appendChild(td);
            }
            tbody.appendChild(tr);
        }
        this.tableEl.appendChild(tbody);
    }

    // ------------------------------------------------------------------------
    // PRIVATE -- OBSERVERS
    // ------------------------------------------------------------------------

    private installObservers(): void
    {
        // Theme: watch <html>[data-bs-theme] (themetoggle.ts:219 writer).
        if (typeof MutationObserver === "function")
        {
            this.themeObserver = new MutationObserver(() =>
            {
                this.handleThemeChange();
            });
            this.themeObserver.observe(document.documentElement, {
                attributes: true,
                attributeFilter: ["data-bs-theme"],
            });
        }
        if (typeof ResizeObserver === "function")
        {
            this.resizeObserver = new ResizeObserver(() =>
            {
                this.scheduleResize();
            });
            this.resizeObserver.observe(this.opts.container);
        }
    }

    private scheduleResize(): void
    {
        if (this.resizeTimer)
        {
            clearTimeout(this.resizeTimer);
        }
        this.resizeTimer = setTimeout(() =>
        {
            this.resizeTimer = null;
            if (this.chart) { this.chart.resize(); }
        }, RESIZE_DEBOUNCE_MS);
    }

    private handleThemeChange(): void
    {
        if (this.destroyed || !this.chart)
        {
            return;
        }
        // Rebuild config in place; same data, new colours.
        const theme = readThemeColours();
        const cfg = buildChartConfig(this.opts, theme, false) as {
            data: Record<string, unknown>;
            options: Record<string, unknown>;
        };
        const existing = (this.chart as unknown as {
            config: { data: Record<string, unknown>;
                options: Record<string, unknown> };
        }).config;
        existing.data = cfg.data;
        existing.options = cfg.options;
        this.chart.update("none");
    }

    // ------------------------------------------------------------------------
    // PRIVATE -- STATE
    // ------------------------------------------------------------------------

    private refreshState(): void
    {
        if (!this.rootEl) { return; }
        const state = this.opts.state as ChartPanelState;
        setAttr(this.rootEl, "data-state", state);
        if (state === "loading")
        {
            setAttr(this.rootEl, "aria-busy", "true");
        }
        else
        {
            this.rootEl.removeAttribute("aria-busy");
        }
        this.removeOverlay();
        if (state === "ready")
        {
            this.rebuildChart(true);
            return;
        }
        // Non-ready state: drop the chart and show the overlay instead.
        this.destroyChartOnly();
        this.appendOverlay(state);
    }

    private appendOverlay(state: ChartPanelState): void
    {
        if (state === "ready") { return; }
        if (state === "loading")
        {
            const sk = createElement("div", ["chartpanel-skeleton"]);
            setAttr(sk, "aria-hidden", "true");
            (this.rootEl as HTMLElement).appendChild(sk);
            this.overlayEl = sk;
            return;
        }
        if (state === "empty")
        {
            const e = createElement("div", ["chartpanel-empty"],
                this.opts.emptyText ?? "No data");
            (this.rootEl as HTMLElement).appendChild(e);
            this.overlayEl = e;
            return;
        }
        // error
        const wrap = createElement("div", ["chartpanel-error"]);
        const icon = createElement("span", ["chartpanel-error-icon"], "!");
        setAttr(icon, "aria-hidden", "true");
        const msg = createElement("span", ["chartpanel-error-text"],
            this.opts.errorText ?? "Failed to render chart");
        wrap.appendChild(icon);
        wrap.appendChild(msg);
        (this.rootEl as HTMLElement).appendChild(wrap);
        this.overlayEl = wrap;
    }

    private removeOverlay(): void
    {
        if (this.overlayEl)
        {
            this.overlayEl.remove();
            this.overlayEl = null;
        }
    }

    // ------------------------------------------------------------------------
    // PRIVATE -- CHART INSTANCE LIFECYCLE
    // ------------------------------------------------------------------------

    private rebuildChart(animate: boolean): void
    {
        this.destroyChartOnly();
        const Ctor = getChartCtor();
        if (!Ctor)
        {
            this.renderMissingDependencyError();
            return;
        }
        if (!this.canvasEl)
        {
            return;
        }
        try
        {
            const cfg = buildChartConfig(this.opts,
                readThemeColours(), animate);
            this.chart = new Ctor(this.canvasEl, cfg);
        }
        catch (e)
        {
            logError("Chart construction failed:", e);
            this.renderRuntimeError(e);
        }
    }

    private destroyChartOnly(): void
    {
        if (this.chart)
        {
            try { this.chart.destroy(); }
            catch (e) { logError("Chart destroy failed:", e); }
            this.chart = null;
        }
    }

    private sameSeriesIds(series: ChartPanelSeries[]): boolean
    {
        if (series.length !== this.opts.series.length)
        {
            return false;
        }
        for (let i = 0; i < series.length; i += 1)
        {
            if (series[i].id !== this.opts.series[i].id)
            {
                return false;
            }
        }
        return true;
    }

    // ------------------------------------------------------------------------
    // PRIVATE -- ERROR RENDERING (literate; per LITERATE_ERRORS.md)
    // ------------------------------------------------------------------------

    private renderMissingDependencyError(): void
    {
        if (!this.rootEl) { return; }
        this.removeOverlay();
        const wrap = createElement("div", ["chartpanel-error",
            "chartpanel-error-missing-dep"]);
        const title = createElement("strong", [],
            "Chart.js is not loaded.");
        const detail = createElement("div", ["chartpanel-error-detail"],
            "ChartPanel requires window.Chart (Chart.js >= 4.4, < 5). " +
            "Add the Chart.js UMD <script> before chartpanel.js. " +
            "See ADR-130 in agentknowledge/decisions.yaml.");
        wrap.appendChild(title);
        wrap.appendChild(detail);
        this.rootEl.appendChild(wrap);
        this.overlayEl = wrap;
        logError("window.Chart is missing — Chart.js not loaded.");
    }

    private renderRuntimeError(e: unknown): void
    {
        if (!this.rootEl) { return; }
        this.removeOverlay();
        const msg = (e instanceof Error) ? e.message : String(e);
        const wrap = createElement("div", ["chartpanel-error"]);
        const title = createElement("strong", [],
            "ChartPanel failed to render.");
        const detail = createElement("div", ["chartpanel-error-detail"], msg);
        wrap.appendChild(title);
        wrap.appendChild(detail);
        this.rootEl.appendChild(wrap);
        this.overlayEl = wrap;
    }
}

// ============================================================================
// CONVENIENCE FACTORY
// ============================================================================

// @entrypoint
// ⚓ createChartPanel
export function createChartPanel(
    options: ChartPanelOptions
): ChartPanelHandle
{
    return new ChartPanel(options);
}

// ============================================================================
// GLOBAL EXPORTS (for IIFE consumers)
// ============================================================================

(window as unknown as Record<string, unknown>)["ChartPanel"] = ChartPanel;
(window as unknown as Record<string, unknown>)["createChartPanel"] =
    createChartPanel;
