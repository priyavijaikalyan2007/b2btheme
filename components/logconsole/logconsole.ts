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
    /** Maximum entries kept in memory and DOM. Default: 500. */
    maxEntries?: number;

    /** Colour scheme. Default: "dark". */
    /** @deprecated Ignored — colours now resolve from design tokens automatically. */
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

/** Resolve theme tokens from design token CSS custom properties. */
function resolveThemeTokens(): ThemeTokens
{
    return {
        bg:          resolveThemeColor("--theme-surface-bg",        "#f8fafc"),
        text:        resolveThemeColor("--theme-text-primary",      "#1e293b"),
        entryBorder: resolveThemeColor("--theme-border-subtle",     "#e2e8f0"),
        headerBg:    resolveThemeColor("--theme-surface-raised-bg", "#f1f5f9"),
        muted:       resolveThemeColor("--theme-text-muted",        "#64748b"),
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
export class LogConsole
{
    // --- Configuration ---
    private readonly opts: LogConsoleOptions;
    private readonly consoleId: string;
    private readonly maxEntries: number;
    private readonly autoScroll: boolean;
    private readonly theme: ThemeTokens;
    private readonly levelColors: Record<LogLevel, string>;

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
        this.activeFilters = new Set(ALL_LEVELS);

        this.buildRoot();
        console.debug(LOG_PREFIX, "Initialised:", this.consoleId);
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
        console.debug(LOG_PREFIX, "Cleared");

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
        console.debug(LOG_PREFIX, "Downloaded:", filename);

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
        console.debug(LOG_PREFIX, "Destroyed:", this.consoleId);
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
            chip.style.color = "#fff";
        }
        else
        {
            chip.style.backgroundColor = "transparent";
            chip.style.color = color;
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
        el.style.color = this.levelColors[level];
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
export function createLogConsole(options?: LogConsoleOptions): LogConsole
{
    const console = new LogConsole(options);
    return console;
}

// ============================================================================
// S18: GLOBAL EXPORTS
// ============================================================================

(window as any).LogConsole = LogConsole;
(window as any).createLogConsole = createLogConsole;
