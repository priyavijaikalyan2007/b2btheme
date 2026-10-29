/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: LogConsole
 * 📜 PURPOSE: Reusable in-app logging console for displaying high-level user
 *    actions and system events. Supports level filtering, export, dark/light
 *    themes, rAF-batched rendering, FIFO eviction, and full color/font
 *    customization. Designed for embedding as a TabbedPanel tab or standalone.
 * 🔗 RELATES: [[EnterpriseTheme]], [[CustomComponents]], [[TabbedPanel]],
 *    [[StatusBar]]
 * ⚡ FLOW: [Consumer App] -> [createLogConsole()] -> [Embeddable log panel]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// S1: TYPES, INTERFACES, CONSTANTS
// ============================================================================

/** Log severity levels. */
export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR" | "SUCCESS";

/** A single log entry. */
export interface LogEntry
{
    /** Timestamp string, e.g. "10:53:04.123". */
    timestamp: string;

    /** Severity level — drives badge colour and filter membership. */
    level: LogLevel;

    /** Primary human-readable message text. */
    message: string;
}

/** Per-level colour overrides. */
export interface LogConsoleLevelColors
{
    DEBUG?: string;
    INFO?: string;
    WARN?: string;
    ERROR?: string;
    SUCCESS?: string;
}

/** Configuration options for the LogConsole component. */
export interface LogConsoleOptions
{
    /** Entries to show from the start, oldest first; each also reaches onEntry. */
    entries?: LogEntry[];

    /** Maximum entries kept in memory and DOM. Default: 500. */
    maxEntries?: number;

    /** Colour scheme. Default: "dark". */
    /**
     * Ignored: colours follow the design tokens.
     * @deprecated Ignored — colours now resolve from design tokens automatically.
     */
    theme?: "dark" | "light";

    /** Show header bar with filter chips, Clear, Export. Default: true. */
    showHeader?: boolean;

    /** Auto-scroll to newest entry. Default: true. */
    autoScroll?: boolean;

    /** Filename prefix for text export downloads. Default: "logs". */
    exportFilenamePrefix?: string;

    /** Per-level badge colours (overrides theme defaults). */
    levelColors?: LogConsoleLevelColors;

    /** Font family for all text. Default: monospace stack. */
    fontFamily?: string;

    /** Font size. Default: "12px". */
    fontSize?: string;

    /** Root background colour (overrides theme). */
    backgroundColor?: string;

    /** Primary text colour (overrides theme). */
    textColor?: string;

    /** Header bar background colour (overrides theme). */
    headerBackgroundColor?: string;

    /** Entry bottom-border colour (overrides theme). */
    entryBorderColor?: string;

    /** Muted/secondary text colour (overrides theme). */
    mutedTextColor?: string;

    /** CSS height for the root element. Default: "100%". */
    height?: string;

    /** Additional CSS class(es) on the root element. */
    cssClass?: string;

    /** Contained mode — relative positioning for parent embedding. Default: false. */
    contained?: boolean;

    /** Called after clear() completes. */
    onClear?: () => void;

    /** Called after export, receives the exported text. */
    onExport?: (text: string) => void;

    /** Called after each entry is added. */
    onEntry?: (entry: LogEntry) => void;
}

// ============================================================================
// S2: CONSTANTS
// ============================================================================

const LOG_PREFIX = "[LogConsole]";

/**
 * Pick a foreground that stays readable on an arbitrary background.
 *
 * ADR-153. Caller-supplied colours cannot be vetted at build time, and a
 * fixed `#fff` fails on anything pale — a yellow tag rendered white-on-yellow
 * at 1.9:1. Choosing by relative luminance guarantees at least 4.5 against
 * one of the two extremes for any input.
 *
 * Duplicated per component on purpose: each is bundled as a standalone IIFE
 * and cannot import a shared module.
 */
function readableOn(background: string): string
{
    const hex = background.trim().replace("#", "");

    if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(hex))
    {
        return "#ffffff";   // not a hex we can read; keep the previous default
    }

    const full = hex.length === 3
        ? hex.split("").map(function (c) { return c + c; }).join("")
        : hex;

    const channel = function (v: number): number
    {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };

    const r = channel(parseInt(full.slice(0, 2), 16));
    const g = channel(parseInt(full.slice(2, 4), 16));
    const b = channel(parseInt(full.slice(4, 6), 16));
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    // Contrast against white is (1.05)/(L+0.05); against black
    // (L+0.05)/0.05. They cross at L ~= 0.179.
    //
    // DEBT-VR-11: this returned `#0f172a`, which is NOT an extreme —
    // L = 0.0088, not 0. Swept over the greyscale, the best of white
    // and #0f172a bottoms out at 4.23 on #7b7b7b, so the guarantee
    // above was false for every mid-tone fill. Measured on the live
    // timeline: #1c7ed6 gave 4.25, #845ef7 gave 4.26. With true black
    // the worst case over the whole range is 4.61.
    return luminance > 0.179 ? "#000000" : "#ffffff";
}


const _lu = (typeof window.createLogUtility === "function")
    ? window.createLogUtility().getLogger(LOG_PREFIX.slice(1, -1))
    : null;
const LOCAL_HOSTS = /^(localhost|127\.0\.0\.1|\[::1\]|.+\.localhost)$/;
// LOG-6. Read per call, never captured. A const freezes the flag at script
// evaluation, so a console toggle on a live page did nothing. The semantics
// match isGlobalFlagSet in logutility.ts: unset means "decide from the host"
// for debug and "off" for trace. See FRONTEND_LOGGING.md section 1.3.
function _dbg(): boolean
{
    const f = window.__ebt_debug_logging;
    return f === undefined ? LOCAL_HOSTS.test(location.hostname) : !!f;
}
function _trc(): boolean { return !!window.__ebt_trace_logging; }
function logInfo(...a: unknown[]): void
{
    _lu ? _lu.info(...a) : console.log(new Date().toISOString(), "[INFO]", LOG_PREFIX, ...a);
}
function logWarn(...a: unknown[]): void
{
    _lu ? _lu.warn(...a) : console.warn(new Date().toISOString(), "[WARN]", LOG_PREFIX, ...a);
}
function logError(...a: unknown[]): void
{
    _lu ? _lu.error(...a) : console.error(new Date().toISOString(), "[ERROR]", LOG_PREFIX, ...a);
}
function logDebug(...a: unknown[]): void
{
    _lu ? _lu.debug(...a) : _dbg() && console.debug(new Date().toISOString(), "[DEBUG]", LOG_PREFIX, ...a);
}
function logTrace(...a: unknown[]): void
{
    _lu ? _lu.trace(...a) : _trc() && console.debug(new Date().toISOString(), "[TRACE]", LOG_PREFIX, ...a);
}

// LOG-4a DECLARES ALL FIVE SHIMS IN EVERY COMPONENT, used or not, so a
// developer adding a log line never has to wire one up. `noUnusedLocals`
// is on (UNUSED-1), and this reference is what says that uniformity is
// deliberate rather than an oversight. Deleting a shim to silence the
// compiler is the wrong repair: `dynamicVerboseShims` holds the logDebug
// and logTrace population as a floor, and the preamble is the contract
// FRONTEND_LOGGING.md section 1.1 states.
void [logInfo, logWarn, logError, logDebug, logTrace];

const ALL_LEVELS: LogLevel[] = ["DEBUG", "INFO", "WARN", "ERROR", "SUCCESS"];

interface ThemeTokens
{
    bg: string;
    text: string;
    entryBorder: string;
    headerBg: string;
    muted: string;
}

/** Resolve a CSS custom property from :root, with fallback. */
function resolveThemeColor(prop: string, fallback: string): string
{
    const val = getComputedStyle(document.documentElement)
        .getPropertyValue(prop).trim();
    return val || fallback;
}

/** Resolve level colours from design tokens. */
function resolveDefaultLevelColors(): Record<LogLevel, string>
{
    return {
        DEBUG:   resolveThemeColor("--theme-text-muted",  "#94a3b8"),
        INFO:    resolveThemeColor("--theme-primary",     "#3b82f6"),
        WARN:    resolveThemeColor("--theme-warning",     "#f59e0b"),
        ERROR:   resolveThemeColor("--theme-danger",      "#ef4444"),
        SUCCESS: resolveThemeColor("--theme-success",     "#22c55e"),
    };
}

/**
 * The TEXT counterpart of each level colour.
 *
 * DEBT-VR-11. A `--theme-<role>` token is the colour a control is
 * PAINTED with, and the level badge was using it as a foreground: WARN
 * rendered $yellow-500 on the console's white surface at 2.15, SUCCESS
 * $green-600 at 2.47, against a 4.5 floor. The fill is still right for
 * the active chip's background and border, so the two roles are two
 * maps rather than one value used twice.
 *
 * These stay as `var()` rather than being resolved, because an inline
 * `var()` is re-read on every repaint and so follows the theme.
 */
function defaultLevelTextColors(): Record<LogLevel, string>
{
    return {
        DEBUG:   "var(--theme-text-muted)",
        INFO:    "var(--theme-primary-text)",
        WARN:    "var(--theme-warning-text)",
        ERROR:   "var(--theme-danger-text)",
        SUCCESS: "var(--theme-success-text)",
    };
}

/** Resolve theme tokens from design token CSS custom properties. */
function resolveThemeTokens(): ThemeTokens
{
    // DEBT-VR-11. These used to be RESOLVED to concrete hex values here,
    // once, at construction. Every one of them is then written into an
    // inline style, so a console built in light mode kept light-mode
    // text after the page flipped to dark: measured, the message colour
    // and the surface beneath it were the SAME value, a contrast ratio
    // of 1.00 — text rendered in the colour of its own background.
    //
    // A `var()` in an inline style is re-resolved by the browser on
    // every repaint, so the console follows the theme with no listener
    // and no re-render. The fallbacks are the ones the resolver used, so
    // a host that has not loaded custom.css sees what it saw before.
    //
    // `resolveThemeColor` is still used for the LEVEL colours, which are
    // fed to `readableOn` and therefore have to be real numbers.
    return {
        bg:          "var(--theme-surface-bg, #f8fafc)",
        text:        "var(--theme-text-primary, #1e293b)",
        entryBorder: "var(--theme-border-subtle, #e2e8f0)",
        headerBg:    "var(--theme-surface-raised-bg, #f1f5f9)",
        muted:       "var(--theme-text-muted, #64748b)",
    };
}

const DEFAULT_FONT_FAMILY =
    "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace";

let instanceCounter = 0;

// ============================================================================
// S3: DOM HELPERS
// ============================================================================

/**
 * Creates an HTML element with optional CSS classes and text content.
 */
function createElement(
    tag: string, classes: string[], text?: string
): HTMLElement
{
    const el = document.createElement(tag);
    if (classes.length > 0) { el.classList.add(...classes); }
    if (text) { el.textContent = text; }
    return el;
}

/**
 * Sets multiple attributes on an element from a record.
 */
function setAttr(
    el: HTMLElement, attrs: Record<string, string>
): void
{
    for (const key of Object.keys(attrs))
    {
        el.setAttribute(key, attrs[key]);
    }
}

/**
 * Generates a zero-padded HH:MM:SS.mmm timestamp from the current time.
 */
function nowTimestamp(): string
{
    const d = new Date();
    const h = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");
    const s = String(d.getSeconds()).padStart(2, "0");
    const ms = String(d.getMilliseconds()).padStart(3, "0");
    return `${h}:${m}:${s}.${ms}`;
}

// ============================================================================
// S4: PUBLIC CLASS
// ============================================================================

// @entrypoint
/**
 * LogConsole renders a scrollable, level-filterable log feed for displaying
 * high-level user actions and system events. Supports dark/light themes,
 * per-level colour customisation, Clear/Export actions, rAF-batched DOM
 * updates, and FIFO eviction.
 *
 * @example
 * const log = createLogConsole({ theme: "dark", maxEntries: 500 });
 * someContainer.appendChild(log.getElement());
 * log.info("Application started");
 * log.warn("Retry attempt 2/3");
 */
/**
 * The LogConsole surface a factory caller receives.
 *
 * PAT-1. `implements` below is what keeps this in step with the
 * class: remove a member there and the typecheck fails here. Adding
 * one to the class does NOT add it here, which is the point — a new
 * method is API when somebody writes it into this interface.
 */
export interface LogConsoleHandle
{
    debug(message: string): void;
    info(message: string): void;
    warn(message: string): void;
    error(message: string): void;
    success(message: string): void;
    log(entry: LogEntry): void;
    clear(): void;
    exportAsText(): string;
    downloadAsText(): void;
    setFilter(levels: LogLevel[]): void;
    getFilter(): LogLevel[];
    getElement(): HTMLElement;
    destroy(): void;
}

export class LogConsole implements LogConsoleHandle
{
    // --- Configuration ---
    private readonly opts: LogConsoleOptions;
    private readonly consoleId: string;
    private readonly maxEntries: number;
    private readonly autoScroll: boolean;
    private readonly theme: ThemeTokens;
    private readonly levelColors: Record<LogLevel, string>;

    /** Foreground counterpart of `levelColors`. See DEBT-VR-11. */
    private readonly levelTextColors: Record<LogLevel, string>;

    // --- State ---
    private entries: LogEntry[] = [];
    private activeFilters: Set<LogLevel>;
    private entryCount = 0;

    // --- DOM ---
    private rootEl: HTMLElement | null = null;
    private headerEl: HTMLElement | null = null;
    private bodyEl: HTMLElement | null = null;
    private emptyEl: HTMLElement | null = null;
    private chipEls: Map<LogLevel, HTMLElement> = new Map();

    // --- rAF batching ---
    private pendingEntries: LogEntry[] = [];
    private rafId: number | null = null;

    constructor(options?: LogConsoleOptions)
    {
        this.opts = options || {};
        this.consoleId = this.opts.cssClass
            ? `logconsole-${++instanceCounter}`
            : `logconsole-${++instanceCounter}`;
        this.maxEntries = this.opts.maxEntries ?? 500;
        this.autoScroll = this.opts.autoScroll ?? true;
        this.theme = this.resolveTheme();
        this.levelColors = this.resolveLevelColors();
        this.levelTextColors = this.resolveLevelTextColors();
        this.activeFilters = new Set(ALL_LEVELS);

        this.buildRoot();

        // Additive (readiness step 2 B6): an agent can only hand a log over as data.
        for (const entry of this.opts.entries ?? []) { this.log(entry); }

        logDebug("Initialised:", this.consoleId);
    }

    // ====================================================================
    // S5: PUBLIC — SHORTHAND LOGGING
    // ====================================================================

    /** Logs a DEBUG-level message. */
    public debug(message: string): void
    {
        this.log({ timestamp: nowTimestamp(), level: "DEBUG", message });
    }

    /** Logs an INFO-level message. */
    public info(message: string): void
    {
        this.log({ timestamp: nowTimestamp(), level: "INFO", message });
    }

    /** Logs a WARN-level message. */
    public warn(message: string): void
    {
        this.log({ timestamp: nowTimestamp(), level: "WARN", message });
    }

    /** Logs an ERROR-level message. */
    public error(message: string): void
    {
        this.log({ timestamp: nowTimestamp(), level: "ERROR", message });
    }

    /** Logs a SUCCESS-level message. */
    public success(message: string): void
    {
        this.log({ timestamp: nowTimestamp(), level: "SUCCESS", message });
    }

    // ====================================================================
    // S6: PUBLIC — STRUCTURED LOGGING
    // ====================================================================

    /** Adds a structured log entry. Batched via requestAnimationFrame. */
    public log(entry: LogEntry): void
    {
        this.entries.push(entry);
        this.pendingEntries.push(entry);
        this.scheduleFlush();
        this.evictIfNeeded();

        if (this.opts.onEntry)
        {
            this.opts.onEntry(entry);
        }
    }

    // ====================================================================
    // S7: PUBLIC — ACTIONS
    // ====================================================================

    /** Clears all entries from memory and DOM. */
    public clear(): void
    {
        this.entries = [];
        this.pendingEntries = [];
        this.entryCount = 0;

        if (this.bodyEl)
        {
            this.clearBodyDOM();
        }
        this.updateEmptyState();
        logDebug("Cleared");

        if (this.opts.onClear) { this.opts.onClear(); }
    }

    /** Returns all entries (unfiltered) as formatted text. */
    public exportAsText(): string
    {
        return this.entries.map((e) => this.formatEntryText(e)).join("\n");
    }

    /** Triggers a browser download of all entries as a .txt file. */
    public downloadAsText(): void
    {
        const text = this.exportAsText();
        const prefix = this.opts.exportFilenamePrefix || "logs";
        const filename = `${prefix}-${this.fileTimestamp()}.txt`;

        this.triggerDownload(filename, text);
        logDebug("Downloaded:", filename);

        if (this.opts.onExport) { this.opts.onExport(text); }
    }

    // ====================================================================
    // S8: PUBLIC — LEVEL FILTER
    // ====================================================================

    /** Sets which log levels are visible. */
    public setFilter(levels: LogLevel[]): void
    {
        this.activeFilters = new Set(levels);
        this.applyFilterToDOM();
        this.updateChipStates();
        this.updateEmptyState();
    }

    /** Returns the currently visible log levels. */
    public getFilter(): LogLevel[]
    {
        return Array.from(this.activeFilters);
    }

    // ====================================================================
    // S9: PUBLIC — LIFECYCLE
    // ====================================================================

    /** Returns the root DOM element for embedding. */
    public getElement(): HTMLElement
    {
        return this.rootEl!;
    }

    /** Destroys the component, releasing all DOM and state. */
    public destroy(): void
    {
        if (this.rafId !== null)
        {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }

        if (this.rootEl && this.rootEl.parentNode)
        {
            this.rootEl.parentNode.removeChild(this.rootEl);
        }

        this.rootEl = null;
        this.headerEl = null;
        this.bodyEl = null;
        this.emptyEl = null;
        this.chipEls.clear();
        this.entries = [];
        this.pendingEntries = [];
        logDebug("Destroyed:", this.consoleId);
    }

    // ====================================================================
    // S10: PRIVATE — CONFIGURATION RESOLUTION
    // ====================================================================

    /** Resolves theme tokens from design-token CSS custom properties. */
    private resolveTheme(): ThemeTokens
    {
        const base = resolveThemeTokens();

        if (this.opts.backgroundColor)    { base.bg = this.opts.backgroundColor; }
        if (this.opts.textColor)          { base.text = this.opts.textColor; }
        if (this.opts.headerBackgroundColor) { base.headerBg = this.opts.headerBackgroundColor; }
        if (this.opts.entryBorderColor)   { base.entryBorder = this.opts.entryBorderColor; }
        if (this.opts.mutedTextColor)     { base.muted = this.opts.mutedTextColor; }

        // DEBT-VR-11. A caller who pins `backgroundColor` has taken the
        // surface out of the theme's hands, and the text tokens above
        // still follow the theme — so a console given a terminal black
        // rendered THEME-COLOURED text on it. In light mode that is
        // `--theme-text-primary`, #0f172a, which is the exact colour the
        // demo pins as its background: measured 1.00, text in the colour
        // of its own background.
        //
        // Pinning the surface and not the foreground is not a request
        // for unreadable text; it is a caller who said one thing and
        // left the other to us. Derive it.
        if (this.opts.backgroundColor && !this.opts.textColor)
        {
            base.text = readableOn(this.opts.backgroundColor);
        }

        if (this.opts.backgroundColor && !this.opts.mutedTextColor)
        {
            // Muted has to stay distinguishable from body text while
            // still clearing the floor, so it is the SAME extreme at
            // reduced opacity rather than a different hue. 0.72 of white
            // on #0f172a measures 10.1; of black on #f8fafc, 12.5.
            const ink = readableOn(this.opts.backgroundColor);
            base.muted = ink === "#ffffff"
                ? "rgba(255, 255, 255, 0.72)"
                : "rgba(0, 0, 0, 0.72)";
        }

        return base;
    }

    /** Merges default level colours (from design tokens) with any overrides. */
    private resolveLevelColors(): Record<LogLevel, string>
    {
        const base = resolveDefaultLevelColors();
        const overrides = this.opts.levelColors;
        if (!overrides) { return base; }

        for (const lvl of ALL_LEVELS)
        {
            if (overrides[lvl]) { base[lvl] = overrides[lvl]!; }
        }
        return base;
    }

    /**
     * Merges the default level TEXT colours with any overrides.
     *
     * A caller who overrides a level colour has chosen one value for
     * both roles, and that is their call to make. The split only
     * governs what this component picks for itself.
     */
    private resolveLevelTextColors(): Record<LogLevel, string>
    {
        const base = defaultLevelTextColors();
        const overrides = this.opts.levelColors;
        if (!overrides) { return base; }

        for (const lvl of ALL_LEVELS)
        {
            if (overrides[lvl]) { base[lvl] = overrides[lvl]!; }
        }
        return base;
    }

    // ====================================================================
    // S11: PRIVATE — DOM BUILDING
    // ====================================================================

    /** Builds the root element and all children. */
    private buildRoot(): void
    {
        this.rootEl = createElement("div", ["logconsole"]);
        setAttr(this.rootEl, { "id": this.consoleId });
        this.applyRootStyles(this.rootEl);

        if (this.opts.cssClass)
        {
            this.rootEl.classList.add(...this.opts.cssClass.split(" "));
        }

        if (this.opts.showHeader !== false)
        {
            this.headerEl = this.buildHeader();
            this.rootEl.appendChild(this.headerEl);
        }

        this.buildBody();
    }

    /** Builds the scrollable body area and empty-state placeholder. */
    private buildBody(): void
    {
        this.bodyEl = createElement("div", ["logconsole-body"]);
        // Canvas anchors name this region rather than counting it (ADR-162).
        this.bodyEl.setAttribute("data-dui-region", "logconsole:body");
        setAttr(this.bodyEl, {
            "role": "log",
            "aria-live": "polite",
            "aria-label": "Log entries",
        });
        this.applyBodyStyles(this.bodyEl);
        this.rootEl!.appendChild(this.bodyEl);

        this.emptyEl = createElement(
            "div", ["logconsole-empty"], "No log entries"
        );
        this.applyEmptyStyles(this.emptyEl);
        this.bodyEl.appendChild(this.emptyEl);
    }

    /** Applies root-level inline styles from resolved theme. */
    private applyRootStyles(el: HTMLElement): void
    {
        const font = this.opts.fontFamily || DEFAULT_FONT_FAMILY;
        const size = this.opts.fontSize || "12px";
        const height = this.opts.height || "100%";

        el.style.fontFamily = font;
        el.style.fontSize = size;
        el.style.backgroundColor = this.theme.bg;
        el.style.color = this.theme.text;
        el.style.height = height;
        el.style.display = "flex";
        el.style.flexDirection = "column";
        el.style.overflow = "hidden";

        if (this.opts.contained)
        {
            el.style.position = "relative";
        }
    }

    /** Applies body scroll-area styles. */
    private applyBodyStyles(el: HTMLElement): void
    {
        el.style.flex = "1 1 0";
        el.style.overflowY = "auto";
        el.style.overflowX = "hidden";
        el.style.minHeight = "0";
    }

    /** Applies empty-state placeholder styles. */
    private applyEmptyStyles(el: HTMLElement): void
    {
        el.style.padding = "12px 10px";
        el.style.color = this.theme.muted;
        el.style.fontStyle = "italic";
        el.style.textAlign = "center";
    }

    // ====================================================================
    // S12: PRIVATE — HEADER BUILDING
    // ====================================================================

    /** Builds the header bar with filter chips and action buttons. */
    private buildHeader(): HTMLElement
    {
        const header = createElement("div", ["logconsole-header"]);
        this.applyHeaderStyles(header);

        const filters = createElement("div", ["logconsole-filters"]);
        this.applyFiltersContainerStyles(filters);
        this.buildFilterChips(filters);
        header.appendChild(filters);

        const actions = createElement("div", ["logconsole-actions"]);
        this.applyActionsContainerStyles(actions);
        this.buildActionButtons(actions);
        header.appendChild(actions);

        return header;
    }

    /** Applies header bar styles. */
    private applyHeaderStyles(el: HTMLElement): void
    {
        el.style.display = "flex";
        el.style.alignItems = "center";
        el.style.justifyContent = "space-between";
        el.style.padding = "4px 8px";
        el.style.backgroundColor = this.theme.headerBg;
        el.style.borderBottom = `1px solid ${this.theme.entryBorder}`;
        el.style.flexShrink = "0";
        el.style.gap = "6px";
    }

    /** Styles the filter chips container. */
    private applyFiltersContainerStyles(el: HTMLElement): void
    {
        el.style.display = "flex";
        el.style.alignItems = "center";
        el.style.gap = "4px";
        el.style.flexWrap = "wrap";
    }

    /** Builds filter chip buttons for each log level. */
    private buildFilterChips(container: HTMLElement): void
    {
        for (const level of ALL_LEVELS)
        {
            const chip = this.buildChip(level);
            this.chipEls.set(level, chip);
            container.appendChild(chip);
        }
    }

    /** Builds a single filter chip for a level. */
    private buildChip(level: LogLevel): HTMLElement
    {
        const chip = createElement("button", ["logconsole-chip"], level);
        setAttr(chip, { "type": "button", "data-level": level });
        this.applyChipStyles(chip, level, true);

        chip.addEventListener("click", () =>
        {
            this.toggleFilter(level);
        });

        return chip;
    }

    /** Applies chip visual styles based on active state. */
    private applyChipStyles(
        chip: HTMLElement, level: LogLevel, active: boolean
    ): void
    {
        const color = this.levelColors[level];
        chip.style.padding = "1px 6px";
        chip.style.fontSize = "10px";
        chip.style.fontWeight = "600";
        chip.style.fontFamily = "inherit";
        chip.style.cursor = "pointer";
        chip.style.border = `1px solid ${color}`;
        chip.style.lineHeight = "1.4";

        if (active)
        {
            chip.style.backgroundColor = color;
            chip.style.color = readableOn(color);
        }
        else
        {
            chip.style.backgroundColor = "transparent";
            chip.style.color = this.levelTextColors[level];
        }
    }

    /** Styles the action buttons container. */
    private applyActionsContainerStyles(el: HTMLElement): void
    {
        el.style.display = "flex";
        el.style.alignItems = "center";
        el.style.gap = "4px";
        el.style.flexShrink = "0";
    }

    /** Builds Clear and Export action buttons. */
    private buildActionButtons(container: HTMLElement): void
    {
        const clearBtn = this.buildActionBtn("Clear", "bi-trash");
        clearBtn.addEventListener("click", () => this.clear());
        container.appendChild(clearBtn);

        const exportBtn = this.buildActionBtn("Export", "bi-download");
        exportBtn.addEventListener("click", () => this.downloadAsText());
        container.appendChild(exportBtn);
    }

    /** Builds a single action button with icon and label. */
    private buildActionBtn(
        label: string, iconClass: string
    ): HTMLElement
    {
        const btn = createElement("button", ["logconsole-action-btn"]);
        setAttr(btn, { "type": "button" });
        this.applyActionBtnStyles(btn);

        const icon = createElement("i", [iconClass]);
        icon.style.marginRight = "3px";
        icon.style.fontSize = "11px";
        btn.appendChild(icon);

        const text = document.createTextNode(label);
        btn.appendChild(text);

        return btn;
    }

    /** Styles an action button. */
    private applyActionBtnStyles(btn: HTMLElement): void
    {
        btn.style.padding = "2px 8px";
        btn.style.fontSize = "11px";
        btn.style.fontFamily = "inherit";
        btn.style.cursor = "pointer";
        btn.style.backgroundColor = "transparent";
        btn.style.color = this.theme.muted;
        btn.style.border = `1px solid ${this.theme.entryBorder}`;
        btn.style.lineHeight = "1.4";
    }

    // ====================================================================
    // S13: PRIVATE — ENTRY RENDERING
    // ====================================================================

    /** Schedules a rAF flush if not already pending. */
    private scheduleFlush(): void
    {
        if (this.rafId !== null) { return; }

        this.rafId = requestAnimationFrame(() =>
        {
            // THE ORDER OF THESE THREE LINES IS LOAD-BEARING. Nothing in
            // this repository routes a trace back into a LogConsole:
            // LogUtility.trace() reaches console.debug and stops, and only
            // event() calls into this component. But FRONTEND_LOGGING.md
            // section 7 invites a host to override console methods, and a
            // host that feeds console.debug into a LogConsole closes the
            // loop. Tracing BEFORE clearing rafId bounds that loop: the
            // re-entrant log() lands in pendingEntries, its scheduleFlush()
            // sees a non-null rafId and returns, and flushPending() below
            // writes the entry out in this same frame. Clearing rafId
            // first would schedule a fresh frame from inside the frame and
            // never stop.
            logTrace("frame flush running:", { pending: this.pendingEntries.length });
            this.rafId = null;
            this.flushPending();
        });
    }

    /** Flushes all pending entries to the DOM in one batch. */
    private flushPending(): void
    {
        if (!this.bodyEl || this.pendingEntries.length === 0) { return; }

        const frag = document.createDocumentFragment();

        for (const entry of this.pendingEntries)
        {
            frag.appendChild(this.buildEntryRow(entry));
            this.entryCount++;
        }

        this.pendingEntries = [];
        this.bodyEl.appendChild(frag);
        this.updateEmptyState();

        if (this.autoScroll)
        {
            this.bodyEl.scrollTop = this.bodyEl.scrollHeight;
        }
    }

    /** Builds a single entry row element. */
    private buildEntryRow(entry: LogEntry): HTMLElement
    {
        const row = createElement("div", ["logconsole-entry"]);
        setAttr(row, { "data-level": entry.level });
        this.applyEntryRowStyles(row);

        row.appendChild(this.buildTimestampCell(entry.timestamp));
        row.appendChild(this.buildLevelBadge(entry.level));
        row.appendChild(this.buildMessageCell(entry.message));

        if (!this.activeFilters.has(entry.level))
        {
            row.style.display = "none";
        }

        return row;
    }

    /** Applies inline styles to an entry row. */
    private applyEntryRowStyles(row: HTMLElement): void
    {
        row.style.display = "flex";
        row.style.alignItems = "baseline";
        row.style.padding = "2px 10px";
        row.style.borderBottom = `1px solid ${this.theme.entryBorder}`;
        row.style.gap = "8px";
        row.style.lineHeight = "1.5";
    }

    /** Builds the timestamp cell. */
    private buildTimestampCell(ts: string): HTMLElement
    {
        const el = createElement("span", ["logconsole-timestamp"], ts);
        el.style.color = this.theme.muted;
        el.style.flexShrink = "0";
        el.style.whiteSpace = "nowrap";
        return el;
    }

    /** Builds the level badge cell. */
    private buildLevelBadge(level: LogLevel): HTMLElement
    {
        const el = createElement("span", ["logconsole-level"], level);
        el.style.color = this.levelTextColors[level];
        el.style.fontWeight = "600";
        el.style.flexShrink = "0";
        el.style.width = "56px";
        el.style.textAlign = "right";
        return el;
    }

    /** Builds the message text cell. */
    private buildMessageCell(message: string): HTMLElement
    {
        const el = createElement("span", ["logconsole-message"], message);
        el.style.flex = "1 1 0";
        el.style.wordBreak = "break-word";
        el.style.minWidth = "0";
        return el;
    }

    // ====================================================================
    // S14: PRIVATE — EVICTION
    // ====================================================================

    /** Evicts oldest entries when exceeding maxEntries. */
    private evictIfNeeded(): void
    {
        const excess = this.entries.length - this.maxEntries;
        if (excess <= 0) { return; }

        this.entries.splice(0, excess);
        this.removeOldestRows(excess);
    }

    /** Removes the oldest N entry rows from the DOM. */
    private removeOldestRows(count: number): void
    {
        if (!this.bodyEl) { return; }

        const rows = this.bodyEl.querySelectorAll(".logconsole-entry");
        const toRemove = Math.min(count, rows.length);

        for (let i = 0; i < toRemove; i++)
        {
            rows[i].parentNode!.removeChild(rows[i]);
        }
        this.entryCount -= toRemove;
    }

    // ====================================================================
    // S15: PRIVATE — FILTER LOGIC
    // ====================================================================

    /** Toggles a single level in the active filter set. */
    private toggleFilter(level: LogLevel): void
    {
        if (this.activeFilters.has(level))
        {
            this.activeFilters.delete(level);
        }
        else
        {
            this.activeFilters.add(level);
        }

        this.applyFilterToDOM();
        this.updateChipStates();
        this.updateEmptyState();
    }

    /** Shows/hides all entry rows based on active filters. */
    private applyFilterToDOM(): void
    {
        if (!this.bodyEl) { return; }

        const rows = this.bodyEl.querySelectorAll(".logconsole-entry");

        for (const row of rows)
        {
            const level = row.getAttribute("data-level") as LogLevel;
            (row as HTMLElement).style.display =
                this.activeFilters.has(level) ? "flex" : "none";
        }
    }

    /** Updates chip visual state to reflect current filter. */
    private updateChipStates(): void
    {
        for (const level of ALL_LEVELS)
        {
            const chip = this.chipEls.get(level);
            if (!chip) { continue; }
            const active = this.activeFilters.has(level);
            this.applyChipStyles(chip, level, active);
        }
    }

    /** Shows or hides the empty-state placeholder. */
    private updateEmptyState(): void
    {
        if (!this.emptyEl || !this.bodyEl) { return; }

        const rows = this.bodyEl.querySelectorAll(".logconsole-entry");
        const anyVisible = Array.from(rows).some(
            (r) => (r as HTMLElement).style.display !== "none"
        );

        if (rows.length === 0)
        {
            this.emptyEl.textContent = "No log entries";
            this.emptyEl.style.display = "";
        }
        else if (!anyVisible)
        {
            this.emptyEl.textContent = "No matching log entries";
            this.emptyEl.style.display = "";
        }
        else
        {
            this.emptyEl.style.display = "none";
        }
    }

    // ====================================================================
    // S16: PRIVATE — HELPERS
    // ====================================================================

    /** Formats a single entry as a text line for export. */
    private formatEntryText(entry: LogEntry): string
    {
        const lvl = entry.level.padEnd(7);
        return `[${entry.timestamp}] [${lvl}] ${entry.message}`;
    }

    /** Generates an ISO-ish timestamp suitable for filenames. */
    private fileTimestamp(): string
    {
        return new Date().toISOString()
            .replace(/[:.]/g, "-")
            .slice(0, 19);
    }

    /** Triggers a browser file download. */
    private triggerDownload(filename: string, content: string): void
    {
        const blob = new Blob([content], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /** Removes all entry rows and empty placeholder from body. */
    private clearBodyDOM(): void
    {
        while (this.bodyEl!.firstChild)
        {
            this.bodyEl!.removeChild(this.bodyEl!.firstChild);
        }

        if (this.emptyEl)
        {
            this.bodyEl!.appendChild(this.emptyEl);
        }
    }
}

// ============================================================================
// S17: FACTORY FUNCTIONS
// ============================================================================

/**
 * Creates a LogConsole component and returns it.
 * The caller is responsible for attaching `getElement()` to the DOM.
 */
export function createLogConsole(options?: LogConsoleOptions): LogConsoleHandle
{
    const console = new LogConsole(options);
    return console;
}

// ============================================================================
// S18: GLOBAL EXPORTS
// ============================================================================

window.createLogConsole = createLogConsole;
