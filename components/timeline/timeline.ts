/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: Timeline
 * 📜 PURPOSE: A horizontal event timeline component for visualising point
 *    events (pins at a moment) and span events (blocks with start→end)
 *    on a time axis. Supports row packing, grouping, collapse-to-presence-band,
 *    selection/click, viewport callbacks, now marker, size variants,
 *    configurable IANA timezone display, explicit tick intervals, and
 *    drag-to-pan with pointer events.
 * 🔗 RELATES: [[EnterpriseTheme]], [[CustomComponents]], [[TimelineStyles]]
 * ⚡ FLOW: [Consumer App] -> [createTimeline()] -> [DOM timeline element]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// S1: TYPES AND INTERFACES
// ============================================================================

/** Event type — point (single moment) or span (duration). */
export type TimelineItemType = "point" | "span";

/** Size variant for the timeline component. */
export type TimelineSize = "sm" | "md" | "lg";

/** Named tick interval presets for the time axis. */
export type TickIntervalPreset =
    "1min" | "5min" | "10min" | "15min" | "30min" |
    "1h" | "3h" | "6h" | "12h" | "1d";

/**
 * Sort mode for timeline groups (by group label).
 * Implements the CategorizedDataInlineToolbar pattern (ADR-128).
 */
// ADR-128
export type TimelineSortMode = "asc" | "desc" | null;

/** Collapse state aggregate across all groups. ADR-128. */
// ADR-128
export type TimelineCollapseState =
    "all-collapsed" | "all-expanded" | "mixed";

/**
 * A single timeline item — either a point event at a moment in time
 * or a span event with a start and end time.
 */
export interface TimelineItem
{
    /** Unique identifier for this item. */
    id: string;

    /** Whether this is a point or span event. */
    type: TimelineItemType;

    /** Start time for the event. */
    start: Date;

    /** End time (required for spans, ignored for points). */
    end?: Date;

    /** Display label for the event. */
    label: string;

    /** Tooltip text shown on hover (native title attribute). */
    tooltip?: string;

    /** CSS colour value for the event. */
    color?: string;

    /** Additional CSS class on the item element. */
    cssClass?: string;

    /** Group ID this item belongs to. */
    group?: string;

    /** Arbitrary user data passed back in callbacks. */
    data?: unknown;
}

/**
 * A grouping of timeline items with an optional collapsible label.
 */
export interface TimelineGroup
{
    /** Unique identifier for this group. */
    id: string;

    /** Display label for the group. */
    label: string;

    /** Whether the group can be collapsed. Default true. */
    collapsible?: boolean;

    /** Whether the group is currently collapsed. Default false. */
    collapsed?: boolean;

    /** Sort order (lower = higher). */
    order?: number;

    /** Additional CSS class on the group element. */
    cssClass?: string;
}

/**
 * Configuration options for the Timeline component.
 */
export interface TimelineOptions
{
    /** DOM element ID for the container. */
    containerId: string;

    /** Viewport start time. */
    start: Date;

    /** Viewport end time. */
    end: Date;

    /** Initial items to render. */
    items?: TimelineItem[];

    /** Groups for organising items. */
    groups?: TimelineGroup[];

    /** Maximum visible rows before scrolling. Default 8. */
    maxVisibleRows?: number;

    /** Show the time axis header. Default true. */
    showHeader?: boolean;

    /** Show group labels on the left. Default true. */
    showGroupLabels?: boolean;

    /** Show the "now" marker (red vertical line). Default false. */
    showNowMarker?: boolean;

    /** Point marker size in pixels. Default 10. */
    pointSize?: number;

    /** Span block height in pixels. Default 24. */
    spanHeight?: number;

    /** Gap between rows in pixels. Default 4. */
    rowGap?: number;

    /** Width of group label column in pixels. Default 120. */
    groupLabelWidth?: number;

    /** Height of collapsed presence band in pixels. Default 6. */
    collapsedBandHeight?: number;

    /** Colour of collapsed presence band. Default "#adb5bd". */
    collapsedBandColor?: string;

    /** Size variant. Default "md". */
    size?: TimelineSize;

    /** CSS height value. */
    height?: string;

    /** CSS width value. Default "100%". */
    width?: string;

    /** Additional CSS class on the root element. */
    cssClass?: string;

    /** Initially selected item ID. */
    selectedItemId?: string | null;

    /** Disable all interactions. Default false. */
    disabled?: boolean;

    /** IANA timezone for display (e.g. "America/New_York", "UTC").
     *  Default: browser local timezone. */
    timezone?: string;

    /** Show a timezone selector badge/dropdown in the header. Default false. */
    showTimezoneSelector?: boolean;

    /** Tick interval in ms, a named preset, or "auto". Default "auto". */
    tickInterval?: number | TickIntervalPreset | "auto";

    /** Enable horizontal drag-to-pan on body and axis. Default false. */
    pannable?: boolean;

    /** Fires when an item is clicked. */
    onItemClick?: (item: TimelineItem) => void;

    /** Fires when an item is selected or deselected. */
    onItemSelect?: (item: TimelineItem | null) => void;

    /** Fires when items become visible in the scroll viewport. */
    onItemVisible?: (items: TimelineItem[]) => void;

    /** Fires when the time viewport changes. */
    onViewportChange?: (start: Date, end: Date) => void;

    /** Fires when a group is collapsed or expanded. */
    onGroupToggle?: (group: TimelineGroup, collapsed: boolean) => void;

    /** Fires when the display timezone changes. */
    onTimezoneChange?: (timezone: string) => void;

    /** Override default key combos. Keys are action names, values are
     *  combo strings like "+" or "Ctrl+0". */
    keyBindings?: Partial<Record<string, string>>;

    // -- CategorizedDataInlineToolbar pattern (ADR-128) --
    /**
     * Mount an InlineToolbar in a header strip above the axis offering
     * sort asc/desc by group label, expand-all, and collapse-all.
     * Default: false (opt-in). No-op when window.createInlineToolbar
     * is not available.
     */
    // ADR-128
    showInlineToolbar?: boolean;
    /** Initial sort mode applied to group labels. Default: null (insertion order). */
    // ADR-128
    initialSortMode?: TimelineSortMode;
    /** Whether all groups start collapsed. Default: "none". */
    // ADR-128
    initialCollapsed?: "all" | "none";
    /** Fired when sort mode changes via toolbar or setSortMode. */
    // ADR-128
    onSortModeChange?: (mode: TimelineSortMode) => void;
    /** Fired when expandAll/collapseAll runs (toolbar or imperative). */
    // ADR-128
    onCollapseStateChange?: (state: TimelineCollapseState) => void;
}

/** Handle shape we expect from window.createInlineToolbar (ADR-128 resilience). */
// ADR-128
interface InlineToolbarHandleShape
{
    setItemActive(id: string, active: boolean): void;
    destroy(): void;
}

/**
 * Internal representation of a row assignment for an item.
 */
interface RowAssignment
{
    itemId: string;
    row: number;
    leftPercent: number;
    widthPercent: number;
}

/**
 * A merged time range for presence band rendering.
 */
interface MergedRange
{
    start: number;
    end: number;
    color: string;
}

/**
 * A foreground that is readable on an arbitrary caller-supplied fill.
 *
 * DEBT-VR-11. A timeline span's colour is DATA — the caller sets it per
 * item — so no fixed label colour can be right for every input. White
 * on $success measured 3.29 against a 4.5 floor. Choosing by relative
 * luminance guarantees at least 4.5 against one of the two extremes for
 * any input.
 *
 * Duplicated per component on purpose: each is bundled as a standalone
 * IIFE and cannot import a shared module. Same body as `tagger`,
 * `actionitems`, `facetsearch` and `logconsole`.
 *
 * @param background - The fill the text will sit on, as a hex string.
 * @returns `#0f172a` or `#ffffff`, whichever carries on that fill.
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

// ============================================================================
// S2: CONSTANTS
// ============================================================================

const LOG_PREFIX = "[Timeline]";

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

let instanceCounter = 0;

/** SVG namespace for creating SVG elements. */
const SVG_NS = "http://www.w3.org/2000/svg";

/** Default values for optional configuration. */
const DEFAULT_MAX_VISIBLE_ROWS = 8;
const DEFAULT_POINT_SIZE = 10;
const DEFAULT_SPAN_HEIGHT = 24;
const DEFAULT_ROW_GAP = 4;
const DEFAULT_GROUP_LABEL_WIDTH = 120;
const DEFAULT_COLLAPSED_BAND_HEIGHT = 6;
const DEFAULT_COLLAPSED_BAND_COLOR = "#adb5bd";
const DEFAULT_SIZE: TimelineSize = "md";
const DEFAULT_WIDTH = "100%";

/** Default keyboard bindings per KEYBOARD.md §6 (Planning). */
const DEFAULT_KEY_BINDINGS: Record<string, string> = {
    "zoomIn": "+",
    "zoomOut": "-",
    "resetZoom": "0",
    "scrollToToday": "t",
};

/** Zoom factor for keyboard zoom in/out. */
const KEYBOARD_ZOOM_FACTOR = 0.25;

/** Minimum pixel spacing between tick marks. */
const MIN_TICK_SPACING = 60;

/** Millisecond constants for tick interval calculations. */
const MS_MINUTE = 60_000;
const MS_HOUR = 3_600_000;
const MS_DAY = 86_400_000;

/**
 * Tick interval presets in ascending order.
 * The first interval whose pixel spacing exceeds MIN_TICK_SPACING wins.
 */
const TICK_INTERVALS: number[] = [
    MS_MINUTE,              // 1 min
    5 * MS_MINUTE,          // 5 min
    10 * MS_MINUTE,         // 10 min
    15 * MS_MINUTE,         // 15 min
    30 * MS_MINUTE,         // 30 min
    MS_HOUR,                // 1 h
    3 * MS_HOUR,            // 3 h
    6 * MS_HOUR,            // 6 h
    12 * MS_HOUR,           // 12 h
    MS_DAY,                 // 1 d
    7 * MS_DAY,             // 7 d
    30 * MS_DAY,            // 30 d
];

/** Map of named presets to millisecond values. */
const TICK_PRESET_MAP: Record<TickIntervalPreset, number> =
{
    "1min":  MS_MINUTE,
    "5min":  5 * MS_MINUTE,
    "10min": 10 * MS_MINUTE,
    "15min": 15 * MS_MINUTE,
    "30min": 30 * MS_MINUTE,
    "1h":    MS_HOUR,
    "3h":    3 * MS_HOUR,
    "6h":    6 * MS_HOUR,
    "12h":   12 * MS_HOUR,
    "1d":    MS_DAY,
};

/** Minimum pixel movement to distinguish drag from click. */
const DRAG_THRESHOLD_PX = 5;

/** Minimum width in percent for overlap detection of point events. */
const POINT_MIN_WIDTH_PERCENT = 0.5;

/** Gap percent between items for row packing overlap detection. */
const ITEM_GAP_PERCENT = 0.15;

/** Now marker auto-update interval (ms). */
const NOW_MARKER_UPDATE_INTERVAL = 60_000;

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
 * Sets an attribute on an HTML or SVG element.
 */
function setAttr(
    el: HTMLElement | SVGElement, name: string, value: string
): void
{
    el.setAttribute(name, value);
}

/**
 * Creates an SVG element with the given attributes.
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

// ============================================================================
// S4: UTILITY HELPERS
// ============================================================================

/**
 * Maps a Date to a percentage position within the viewport.
 *
 * @param time    - The date to position.
 * @param vpStart - Viewport start time in ms.
 * @param vpEnd   - Viewport end time in ms.
 * @returns Percentage (0-100), may be outside range for clipped items.
 */
function timeToPercent(time: number, vpStart: number, vpEnd: number): number
{
    const range = vpEnd - vpStart;

    if (range <= 0)
    {
        return 0;
    }

    return ((time - vpStart) / range) * 100;
}

/**
 * Clamps a percentage to the visible viewport range [0, 100].
 */
function clampPercent(value: number): number
{
    return Math.max(0, Math.min(100, value));
}

/**
 * Determines whether an item is visible within the viewport.
 */
function isItemVisible(
    item: TimelineItem, vpStart: number, vpEnd: number
): boolean
{
    const itemStart = item.start.getTime();
    const itemEnd = item.type === "span" && item.end
        ? item.end.getTime()
        : itemStart;

    return (itemEnd >= vpStart) && (itemStart <= vpEnd);
}

/**
 * Computes the left percent and width percent for an item within the viewport.
 */
function computeItemPosition(
    item: TimelineItem, vpStart: number, vpEnd: number, pointSize: number
): { leftPercent: number; widthPercent: number }
{
    const startMs = item.start.getTime();

    if (item.type === "point")
    {
        const center = timeToPercent(startMs, vpStart, vpEnd);
        return {
            leftPercent: center,
            widthPercent: Math.max(POINT_MIN_WIDTH_PERCENT, pointSize * 0.01),
        };
    }

    const endMs = item.end ? item.end.getTime() : startMs;
    const left = clampPercent(timeToPercent(startMs, vpStart, vpEnd));
    const right = clampPercent(timeToPercent(endMs, vpStart, vpEnd));

    return {
        leftPercent: left,
        widthPercent: Math.max(0.1, right - left),
    };
}

/**
 * Packs items into rows using greedy interval scheduling.
 *
 * Items are sorted by start time, then longer spans first.
 * Each item is assigned to the first row where it does not overlap.
 *
 * @returns Array of RowAssignment objects.
 */
function packRows(
    items: TimelineItem[],
    vpStart: number,
    vpEnd: number,
    pointSize: number
): RowAssignment[]
{
    const visible = items.filter(
        (item) => isItemVisible(item, vpStart, vpEnd)
    );

    // Sort by start time, then longer spans first
    visible.sort((a, b) =>
    {
        const diff = a.start.getTime() - b.start.getTime();

        if (diff !== 0)
        {
            return diff;
        }

        const aDuration = getDuration(a);
        const bDuration = getDuration(b);

        return bDuration - aDuration;
    });

    const assignments: RowAssignment[] = [];

    // Track end position of last item in each row
    const rowEnds: number[] = [];

    for (const item of visible)
    {
        const pos = computeItemPosition(item, vpStart, vpEnd, pointSize);
        const itemEnd = pos.leftPercent + pos.widthPercent + ITEM_GAP_PERCENT;
        let assignedRow = -1;

        for (let r = 0; r < rowEnds.length; r++)
        {
            if (pos.leftPercent >= rowEnds[r])
            {
                assignedRow = r;
                break;
            }
        }

        if (assignedRow === -1)
        {
            assignedRow = rowEnds.length;
            rowEnds.push(0);
        }

        rowEnds[assignedRow] = itemEnd;

        assignments.push({
            itemId: item.id,
            row: assignedRow,
            leftPercent: pos.leftPercent,
            widthPercent: pos.widthPercent,
        });
    }

    return assignments;
}

/**
 * Returns the duration in milliseconds for an item (0 for points).
 */
function getDuration(item: TimelineItem): number
{
    if (item.type === "span" && item.end)
    {
        return item.end.getTime() - item.start.getTime();
    }

    return 0;
}

/**
 * Merges overlapping time ranges from span items for presence band rendering.
 *
 * @param items - Span items to merge.
 * @param defaultColor - Fallback colour for the band.
 * @returns Array of merged ranges sorted by start time.
 */
function mergeRanges(
    items: TimelineItem[], defaultColor: string
): MergedRange[]
{
    const spans = items.filter(
        (item) => item.type === "span" && item.end
    );

    if (spans.length === 0)
    {
        return [];
    }

    spans.sort((a, b) => a.start.getTime() - b.start.getTime());

    const merged: MergedRange[] = [];
    let current: MergedRange = {
        start: spans[0].start.getTime(),
        end: spans[0].end!.getTime(),
        color: spans[0].color || defaultColor,
    };

    for (let i = 1; i < spans.length; i++)
    {
        const s = spans[i].start.getTime();
        const e = spans[i].end!.getTime();

        if (s <= current.end)
        {
            current.end = Math.max(current.end, e);
        }
        else
        {
            merged.push(current);
            current = {
                start: s,
                end: e,
                color: spans[i].color || defaultColor,
            };
        }
    }

    merged.push(current);

    return merged;
}

/**
 * Selects the best tick interval for the time axis based on viewport
 * duration and available container width.
 *
 * @returns Interval in milliseconds.
 */
function selectTickInterval(
    vpStart: number, vpEnd: number, containerWidth: number
): number
{
    const viewportMs = vpEnd - vpStart;

    if (viewportMs <= 0 || containerWidth <= 0)
    {
        return MS_HOUR;
    }

    for (const interval of TICK_INTERVALS)
    {
        const tickCount = viewportMs / interval;
        const spacing = containerWidth / tickCount;

        if (spacing >= MIN_TICK_SPACING)
        {
            return interval;
        }
    }

    return TICK_INTERVALS[TICK_INTERVALS.length - 1];
}

/**
 * Tests whether a timezone string is a valid IANA timezone.
 */
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

/**
 * Returns the list of IANA timezones supported by this browser.
 * FALLBACK-8. This used to answer with a curated list of eighteen zones
 * when Intl.supportedValuesOf was unavailable. That list was presented as
 * the IANA set and is not it, so a user searching for their own zone was
 * told it does not exist. A short wrong answer is worse than no answer.
 */
function getIANATimezones(): string[]
{
    try
    {
        return Intl.supportedValuesOf("timeZone");
    }
    catch (e)
    {
        const err = new Error(
            "Timeline cannot list time zones, because "
            + "Intl.supportedValuesOf is unavailable in this runtime. "
            + "Pass an explicit timezone list instead of relying on the "
            + "platform.");
        (err as Error & { cause?: unknown }).cause = e;
        throw err;
    }
}

/**
 * Resolves a container element by ID with validation.
 */
function resolveContainer(containerId: string): HTMLElement | null
{
    if (!containerId)
    {
        logError("No container ID provided");
        return null;
    }

    const el = document.getElementById(containerId);

    if (!el)
    {
        // ERR-1. This logged and carried on, so the caller got a
        // handle to a component that was never mounted.
        throw new Error(
            `${LOG_PREFIX} Container "${containerId}" was not found. `
            + "Insert the element before showing it.");
    }

    return el;
}

// ============================================================================
// S5: TIMELINE CLASS
// ============================================================================

/**
 * Timeline component — renders point and span events on a horizontal
 * time axis with row packing, grouping, collapsing, selection, and
 * viewport visibility callbacks.
 */
/**
 * The Timeline surface a factory caller receives.
 *
 * PAT-1. `implements` below is what keeps this in step with the
 * class: remove a member there and the typecheck fails here. Adding
 * one to the class does NOT add it here, which is the point — a new
 * method is API when somebody writes it into this interface.
 */
export interface TimelineHandle
{
    show(container?: HTMLElement): void;
    hide(): void;
    destroy(): void;
    addItem(item: TimelineItem): void;
    addItems(items: TimelineItem[]): void;
    removeItem(id: string): void;
    updateItem(id: string, updates: Partial<TimelineItem>): void;
    getItems(): TimelineItem[];
    selectItem(id: string | null): void;
    getSelectedItem(): TimelineItem | null;
    addGroup(group: TimelineGroup): void;
    removeGroup(id: string): void;
    updateGroup(id: string, updates: Partial<TimelineGroup>): void;
    toggleGroup(id: string): void;
    collapseAll(): void;
    expandAll(): void;
    setSortMode(mode: TimelineSortMode): void;
    getSortMode(): TimelineSortMode;
    setViewport(start: Date, end: Date): void;
    getViewport(): { start: Date; end: Date };
    scrollToDate(date: Date): void;
    setDisabled(disabled: boolean): void;
    setTimezone(tz: string): void;
    getTimezone(): string;
    setTickInterval(interval: number | TickIntervalPreset | "auto"): void;
    getTickInterval(): number | TickIntervalPreset | "auto";
    setData(slot: string, value: unknown): void;
    on(channel: string, handler: (payload: unknown) => void): () => void;
    getState(): Record<string, unknown>;
    setState(state: Record<string, unknown>): void;
}

export class Timeline implements TimelineHandle
{
    // -- Configuration --
    private opts: Required<
        Pick<TimelineOptions,
            "start" | "end" | "maxVisibleRows" | "showHeader" |
            "showGroupLabels" | "showNowMarker" | "pointSize" |
            "spanHeight" | "rowGap" | "groupLabelWidth" |
            "collapsedBandHeight" | "collapsedBandColor" | "size" |
            "disabled"
        >
    >;

    private containerId: string;

    // -- State --
    private items: Map<string, TimelineItem> = new Map();
    private groups: Map<string, TimelineGroup> = new Map();
    private selectedItemId: string | null = null;

    // -- Surface channel (additive, readiness step 3) --
    private readonly selectHandlers = new Set<(payload: unknown) => void>();
    /** True while setState restores state, which fires no callback. */
    private restoring = false;
    private instanceId: number;

    // -- DOM references --
    private rootEl: HTMLElement | null = null;
    // `headerEl` and `toolbarHeaderEl` LEFT ON 2026-10-21 (UNUSED-1):
    // both were assigned at build and nulled at destroy, and nothing
    // in between read either. The DOM is the state.
    private axisEl: HTMLElement | null = null;
    private bodyEl: HTMLElement | null = null;
    private nowMarkerEl: HTMLElement | null = null;

    // -- Observers and timers --
    private intersectionObserver: IntersectionObserver | null = null;
    private nowMarkerTimer: ReturnType<typeof setInterval> | null = null;
    private resizeObserver: ResizeObserver | null = null;

    // -- Timezone --
    private timezone: string;
    private tickFormatter: Intl.DateTimeFormat | null = null;
    private dateFormatter: Intl.DateTimeFormat | null = null;
    private monthYearFormatter: Intl.DateTimeFormat | null = null;
    private showTimezoneSelector: boolean;
    private timezoneSelectorEl: HTMLElement | null = null;
    private boundCloseTimezoneDropdown: ((e: MouseEvent) => void) | null = null;

    // -- Tick interval --
    private tickIntervalOption: number | TickIntervalPreset | "auto";

    // -- Drag/pan state --
    private pannable: boolean;
    private isPanning: boolean = false;
    private panMoved: boolean = false;
    private panStartX: number = 0;
    private panStartVpStart: number = 0;
    private panStartVpEnd: number = 0;
    private panRafId: number = 0;
    private boundPanStart: ((e: PointerEvent) => void) | null = null;
    private boundWheelPan: ((e: WheelEvent) => void) | null = null;

    // -- Callbacks --
    private onItemClick?: (item: TimelineItem) => void;
    private onItemSelect?: (item: TimelineItem | null) => void;
    private onItemVisible?: (items: TimelineItem[]) => void;
    private onViewportChange?: (start: Date, end: Date) => void;
    private onGroupToggle?: (group: TimelineGroup, collapsed: boolean) => void;
    private onTimezoneChange?: (timezone: string) => void;

    // -- Bound handlers for cleanup --
    private boundHandleItemClick: (e: Event) => void;

    // -- Custom style properties --
    private cssClass: string;
    private height: string;
    private width: string;

    // -- Keyboard bindings --
    private keyBindingsOverride?: Partial<Record<string, string>>;
    private initialViewportDuration: number = 0;

    // -- CategorizedDataInlineToolbar (ADR-128) --
    // ADR-128
    private showInlineToolbar: boolean = false;
    // ADR-128
    private sortMode: TimelineSortMode = null;
    // ADR-128
    private toolbarHandle: InlineToolbarHandleShape | null = null;
    // ADR-128
    // ADR-128
    private onSortModeChange?: (mode: TimelineSortMode) => void;
    // ADR-128
    private onCollapseStateChange?: (state: TimelineCollapseState) => void;

    /**
     * Creates a new Timeline instance.
     *
     * @param options - Configuration options for the timeline.
     */
    constructor(options: TimelineOptions)
    {
        this.instanceId = ++instanceCounter;

        logInfo(`Creating instance #${this.instanceId}`);

        this.containerId = options.containerId;

        this.opts = {
            start: new Date(options.start),
            end: new Date(options.end),
            maxVisibleRows: options.maxVisibleRows ?? DEFAULT_MAX_VISIBLE_ROWS,
            showHeader: options.showHeader ?? true,
            showGroupLabels: options.showGroupLabels ?? true,
            showNowMarker: options.showNowMarker ?? false,
            pointSize: options.pointSize ?? DEFAULT_POINT_SIZE,
            spanHeight: options.spanHeight ?? DEFAULT_SPAN_HEIGHT,
            rowGap: options.rowGap ?? DEFAULT_ROW_GAP,
            groupLabelWidth: options.groupLabelWidth ?? DEFAULT_GROUP_LABEL_WIDTH,
            collapsedBandHeight: options.collapsedBandHeight ?? DEFAULT_COLLAPSED_BAND_HEIGHT,
            collapsedBandColor: options.collapsedBandColor ?? DEFAULT_COLLAPSED_BAND_COLOR,
            size: options.size ?? DEFAULT_SIZE,
            disabled: options.disabled ?? false,
        };

        this.cssClass = options.cssClass ?? "";
        this.height = options.height ?? "";
        this.width = options.width ?? DEFAULT_WIDTH;

        // Timezone: default to browser local
        this.timezone = options.timezone
            ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
        this.showTimezoneSelector = options.showTimezoneSelector ?? false;
        this.tickIntervalOption = options.tickInterval ?? "auto";
        this.pannable = options.pannable ?? false;

        this.rebuildFormatters();

        this.onItemClick = options.onItemClick;
        this.onItemSelect = options.onItemSelect;
        this.onItemVisible = options.onItemVisible;
        this.onViewportChange = options.onViewportChange;
        this.onGroupToggle = options.onGroupToggle;
        this.onTimezoneChange = options.onTimezoneChange;

        this.keyBindingsOverride = options.keyBindings;
        this.initialViewportDuration =
            options.end.getTime() - options.start.getTime();

        // ADR-128: CategorizedDataInlineToolbar wiring
        this.showInlineToolbar = options.showInlineToolbar === true;
        this.sortMode = options.initialSortMode ?? null;
        this.onSortModeChange = options.onSortModeChange;
        this.onCollapseStateChange = options.onCollapseStateChange;

        this.boundHandleItemClick = this.handleItemClick.bind(this);

        this.loadItems(options.items ?? []);
        this.loadGroups(options.groups ?? []);

        // ADR-128: respect initialCollapsed across loaded groups
        if (options.initialCollapsed === "all")
        {
            for (const group of this.groups.values())
            {
                if (group.collapsible !== false)
                {
                    group.collapsed = true;
                }
            }
        }

        if (options.selectedItemId)
        {
            this.selectedItemId = options.selectedItemId;
        }

        this.buildDOM();
        this.render();
        this.show();

        this.setupResizeObserver();

        if (this.opts.showNowMarker)
        {
            this.startNowMarkerTimer();
        }
    }

    // -- Lifecycle Methods --

    /**
     * Appends the timeline to its container element.
     */
    public show(container?: HTMLElement): void
    {
        const target = container || resolveContainer(this.containerId);

        if (!target || !this.rootEl)
        {
            return;
        }

        if (!target.contains(this.rootEl))
        {
            target.appendChild(this.rootEl);
        }

        logInfo(`Instance #${this.instanceId} shown`);
    }

    /**
     * Removes the timeline from the DOM without destroying state.
     */
    public hide(): void
    {
        if (this.rootEl && this.rootEl.parentElement)
        {
            this.rootEl.parentElement.removeChild(this.rootEl);
        }

        logInfo(`Instance #${this.instanceId} hidden`);
    }

    /**
     * Destroys the timeline, cleaning up all DOM, listeners, and timers.
     */
    public destroy(): void
    {
        logInfo(`Destroying instance #${this.instanceId}`);

        this.stopNowMarkerTimer();
        this.destroyIntersectionObserver();
        this.destroyResizeObserver();
        this.detachPanHandlers();
        this.closeTimezoneDropdown();
        // ADR-128
        this.teardownInlineToolbar();

        if (this.rootEl)
        {
            this.rootEl.removeEventListener("click", this.boundHandleItemClick);

            if (this.rootEl.parentElement)
            {
                this.rootEl.parentElement.removeChild(this.rootEl);
            }
        }

        this.rootEl = null;
        this.axisEl = null;
        this.bodyEl = null;
        this.nowMarkerEl = null;
        this.timezoneSelectorEl = null;
        this.tickFormatter = null;
        this.dateFormatter = null;
        this.monthYearFormatter = null;
        this.items.clear();
        this.groups.clear();
        this.selectHandlers.clear();

        logInfo(`Instance #${this.instanceId} destroyed`);
    }

    // -- Item API --

    /**
     * Refuse a span declared without an end (ADR-200, ERR-1).
     *
     * (CRITICAL) A SPAN WITH NO END RENDERED AS A 0.1% HAIRLINE.
     * `TimelineItem.end` is documented "required for spans, ignored
     * for points", and `renderItem` branches on `type` alone, so a
     * span missing its end went down `renderSpanItem` and got a
     * `widthPercent` of 0.1 — a bar too narrow to see, holding a
     * label nothing can read, with no marker and no error. MEASURED:
     * `class="timeline-item timeline-item-span"`, `width: 0.1%`.
     *
     * The block that covered it was named
     * `spanWithoutEnd_TreatedAsPoint`, and the component does not
     * treat it as a point. `end` is optional on the shared interface
     * because points do not have one, so TypeScript cannot enforce
     * the rule the comment states, and this library is consumed from
     * plain JavaScript over a CDN (DEBT-TEST-1b).
     *
     * @param item - The item being taken in.
     */
    private refuseMalformedSpan(item: TimelineItem): void
    {
        if (item.type === "span" && item.end === undefined)
        {
            throw new Error(
                `${LOG_PREFIX} item "${item.id}" is a span with no end. `
                + "A span needs start and end; use type \"point\" for a "
                + "single instant.");
        }
    }

    /**
     * Adds a single item to the timeline.
     */
    public addItem(item: TimelineItem): void
    {
        this.refuseMalformedSpan(item);
        this.items.set(item.id, { ...item });

        logInfo("Item added:", item.id);

        this.render();
    }

    /**
     * Adds multiple items to the timeline.
     */
    public addItems(items: TimelineItem[]): void
    {
        for (const item of items)
        {
            this.refuseMalformedSpan(item);
            this.items.set(item.id, { ...item });
        }

        logInfo(`${items.length} items added`);

        this.render();
    }

    /**
     * Removes an item by ID.
     */
    public removeItem(id: string): void
    {
        if (!this.items.has(id))
        {
            logWarn("Item not found:", id);
            return;
        }

        this.items.delete(id);

        if (this.selectedItemId === id)
        {
            this.selectedItemId = null;
        }

        logInfo("Item removed:", id);

        this.render();
    }

    /**
     * Updates an existing item with partial data.
     */
    public updateItem(id: string, updates: Partial<TimelineItem>): void
    {
        const existing = this.items.get(id);

        if (!existing)
        {
            logWarn("Item not found for update:", id);
            return;
        }

        this.items.set(id, { ...existing, ...updates, id });

        logInfo("Item updated:", id);

        this.render();
    }

    /**
     * Returns a deep copy of all items.
     */
    public getItems(): TimelineItem[]
    {
        return Array.from(this.items.values()).map(
            (item) => ({ ...item })
        );
    }

    // -- Selection API --

    /**
     * Programmatically selects an item by ID, or deselects if null.
     */
    public selectItem(id: string | null): void
    {
        const previousId = this.selectedItemId;

        this.selectedItemId = id;

        this.updateSelectionDOM(previousId, id);

        const selectedItem = id ? this.items.get(id) ?? null : null;

        if (this.onItemSelect && !this.restoring)
        {
            this.onItemSelect(selectedItem ? { ...selectedItem } : null);
        }

        logInfo("Selection changed:", id ?? "none");
    }

    /**
     * Returns the currently selected item, or null.
     */
    public getSelectedItem(): TimelineItem | null
    {
        if (!this.selectedItemId)
        {
            return null;
        }

        const item = this.items.get(this.selectedItemId);

        return item ? { ...item } : null;
    }

    // -- Group API --

    /**
     * Adds a group to the timeline.
     */
    public addGroup(group: TimelineGroup): void
    {
        this.groups.set(group.id, { ...group });

        logInfo("Group added:", group.id);

        this.render();
    }

    /**
     * Removes a group by ID. Items in the group are not removed.
     */
    public removeGroup(id: string): void
    {
        if (!this.groups.has(id))
        {
            logWarn("Group not found:", id);
            return;
        }

        this.groups.delete(id);

        logInfo("Group removed:", id);

        this.render();
    }

    /**
     * Updates a group with partial data.
     */
    public updateGroup(id: string, updates: Partial<TimelineGroup>): void
    {
        const existing = this.groups.get(id);

        if (!existing)
        {
            logWarn("Group not found for update:", id);
            return;
        }

        this.groups.set(id, { ...existing, ...updates, id });

        logInfo("Group updated:", id);

        this.render();
    }

    /**
     * Toggles the collapsed state of a group.
     */
    public toggleGroup(id: string): void
    {
        const group = this.groups.get(id);

        if (!group)
        {
            logWarn("Group not found:", id);
            return;
        }

        group.collapsed = !group.collapsed;

        if (this.onGroupToggle)
        {
            this.onGroupToggle({ ...group }, group.collapsed);
        }

        logInfo("Group toggled:", id,
            group.collapsed ? "collapsed" : "expanded"
        );

        this.render();
        // ADR-128
        this.emitCollapseState();
    }

    /**
     * Collapses all collapsible groups.
     */
    public collapseAll(): void
    {
        for (const group of this.groups.values())
        {
            if (group.collapsible !== false)
            {
                group.collapsed = true;
            }
        }

        logInfo("All groups collapsed");

        this.render();
        // ADR-128
        this.emitCollapseState();
    }

    /**
     * Expands all groups.
     */
    public expandAll(): void
    {
        for (const group of this.groups.values())
        {
            group.collapsed = false;
        }

        logInfo("All groups expanded");

        this.render();
        // ADR-128
        this.emitCollapseState();
    }

    // -- CategorizedDataInlineToolbar API (ADR-128) --

    /** Set group sort mode (asc | desc | null). ADR-128. */
    // ADR-128
    public setSortMode(mode: TimelineSortMode): void
    {
        if (this.sortMode === mode) { return; }
        this.sortMode = mode;
        this.syncToolbarSortButtons();
        this.render();
        if (typeof this.onSortModeChange === "function" && !this.restoring)
        {
            try { this.onSortModeChange(mode); }
            catch (e) { logError("onSortModeChange threw:", e); }
        }
    }

    /** Read current group sort mode. ADR-128. */
    // ADR-128
    public getSortMode(): TimelineSortMode
    {
        return this.sortMode;
    }

    // -- Surface contract (additive, readiness step 3) --

    /**
     * Replaces the items ("items") or the groups ("groups") in place. A
     * selection whose item is gone is cleared; a group keeps its collapsed
     * state unless the new one sets it. Fires nothing.
     */
    public setData(slot: string, value: unknown): void
    {
        if (slot === "items")
        {
            const items = value as TimelineItem[];

            items.forEach((item) => this.refuseMalformedSpan(item));
            this.items.clear();
            this.loadItems(items);

            if (this.selectedItemId !== null && !this.items.has(this.selectedItemId))
            {
                this.selectedItemId = null;
            }
        }
        else if (slot === "groups")
        {
            const collapsed = new Map([...this.groups.values()].map((g) => [g.id, g.collapsed]));

            this.groups.clear();
            this.loadGroups((value as TimelineGroup[]).map((g) =>
                (g.collapsed === undefined && collapsed.has(g.id) ? { ...g, collapsed: collapsed.get(g.id) } : g)));
        }
        else
        {
            throw new Error(`${LOG_PREFIX} setData("${slot}"): the slots are "items" and "groups".`);
        }

        this.render();
    }

    /** Subscribes to "select", which hears the clicked item after onItemClick; returns the unsubscribe. */
    public on(channel: string, handler: (payload: unknown) => void): () => void
    {
        if (channel !== "select")
        {
            throw new Error(`${LOG_PREFIX} on("${channel}"): the only channel is "select".`);
        }

        this.selectHandlers.add(handler);

        return () => { this.selectHandlers.delete(handler); };
    }

    /** The selection, the visible range (ISO strings), the timezone, the group order and the collapsed groups. */
    public getState(): Record<string, unknown>
    {
        return {
            selectedItemId: this.selectedItemId,
            start: this.opts.start.toISOString(),
            end: this.opts.end.toISOString(),
            timezone: this.timezone,
            sortMode: this.sortMode,
            collapsedGroups: [...this.groups.values()].filter((g) => g.collapsed).map((g) => g.id),
        };
    }

    /** Restores state captured by getState(), or any subset of it, firing no callback. */
    public setState(state: Record<string, unknown>): void
    {
        this.restoring = true;

        try
        {
            this.restoreState(state);
        }
        finally
        {
            this.restoring = false;
        }
    }

    /** Applies each key setState was given, through the public setters the callbacks of which are silenced. */
    private restoreState(state: Record<string, unknown>): void
    {
        if ("start" in state || "end" in state)
        {
            this.setViewport(new Date((state.start ?? this.opts.start) as string | Date),
                new Date((state.end ?? this.opts.end) as string | Date));
        }

        if (typeof state.timezone === "string") { this.setTimezone(state.timezone); }

        if ("sortMode" in state) { this.setSortMode(state.sortMode as TimelineSortMode); }

        if (Array.isArray(state.collapsedGroups))
        {
            const ids = new Set(state.collapsedGroups as string[]);

            this.groups.forEach((g) => { g.collapsed = ids.has(g.id); });
            this.render();
        }

        if ("selectedItemId" in state) { this.selectItem(state.selectedItemId as string | null); }
    }

    /** Calls every "select" handler with a JSON copy of the item without data (host-only). */
    private emitSelect(item: TimelineItem): void
    {
        const { data: _data, ...rest } = item;
        const payload = JSON.parse(JSON.stringify(rest)) as unknown;

        for (const handler of this.selectHandlers)
        {
            try
            {
                handler(payload);
            }
            catch (err)
            {
                logError("Channel \"select\" handler threw:", err);
            }
        }
    }

    // -- Viewport API --

    /**
     * Sets a new time viewport and re-renders.
     */
    public setViewport(start: Date, end: Date): void
    {
        this.opts.start = new Date(start);
        this.opts.end = new Date(end);

        if (this.onViewportChange && !this.restoring)
        {
            this.onViewportChange(
                new Date(this.opts.start),
                new Date(this.opts.end)
            );
        }

        logInfo("Viewport changed");

        this.render();
    }

    /**
     * Returns the current viewport start and end dates.
     */
    public getViewport(): { start: Date; end: Date }
    {
        return {
            start: new Date(this.opts.start),
            end: new Date(this.opts.end),
        };
    }

    /**
     * Centres the viewport on a given date, preserving the viewport duration.
     */
    public scrollToDate(date: Date): void
    {
        const duration = this.opts.end.getTime() - this.opts.start.getTime();
        const centerMs = date.getTime();

        this.setViewport(
            new Date(centerMs - (duration / 2)),
            new Date(centerMs + (duration / 2))
        );
    }

    // -- Enable / Disable --

    /**
     * Enables or disables the timeline.
     */
    public setDisabled(disabled: boolean): void
    {
        this.opts.disabled = disabled;

        if (this.rootEl)
        {
            this.rootEl.classList.toggle("timeline--disabled", disabled);
            if (disabled) { this.rootEl.setAttribute("aria-disabled", "true"); }
            else { this.rootEl.removeAttribute("aria-disabled"); }
        }

        logInfo(disabled ? "Disabled" : "Enabled");
    }

    // -- Timezone API --

    /**
     * Changes the display timezone and re-renders all labels.
     */
    public setTimezone(tz: string): void
    {
        if (!isValidTimezone(tz))
        {
            logWarn("Invalid timezone:", tz);
            return;
        }

        const previous = this.timezone;
        this.timezone = tz;

        this.rebuildFormatters();

        if (this.onTimezoneChange && previous !== tz && !this.restoring)
        {
            this.onTimezoneChange(tz);
        }

        logInfo("Timezone changed to:", tz);

        this.render();
    }

    /**
     * Returns the current display timezone.
     */
    public getTimezone(): string
    {
        return this.timezone;
    }

    // -- Tick Interval API --

    /**
     * Changes the tick interval and re-renders.
     */
    public setTickInterval(
        interval: number | TickIntervalPreset | "auto"
    ): void
    {
        this.tickIntervalOption = interval;

        logInfo("Tick interval changed to:", interval);

        this.render();
    }

    /**
     * Returns the current tick interval setting.
     */
    public getTickInterval(): number | TickIntervalPreset | "auto"
    {
        return this.tickIntervalOption;
    }

    // -- DOM Building --

    /**
     * Builds the root DOM structure for the timeline.
     */
    private buildDOM(): void
    {
        const root = createElement("div", ["timeline"]);
        setAttr(root, "role", "region");
        setAttr(root, "aria-label", "Event Timeline");

        if (this.opts.size !== "md")
        {
            root.classList.add(`timeline--${this.opts.size}`);
        }

        if (this.opts.disabled)
        {
            root.classList.add("timeline--disabled");
            root.setAttribute("aria-disabled", "true");
        }

        if (this.pannable)
        {
            root.classList.add("timeline--pannable");
        }

        if (this.cssClass)
        {
            root.classList.add(...this.cssClass.split(" ").filter(Boolean));
        }

        this.applyDimensions(root);

        setAttr(root, "tabindex", "0");
        root.addEventListener("click", this.boundHandleItemClick);
        root.addEventListener("keydown", (e) =>
        {
            this.handleKeydown(e);
        });

        this.rootEl = root;
    }

    /**
     * Applies height and width CSS styles to the root element.
     */
    private applyDimensions(root: HTMLElement): void
    {
        if (this.height)
        {
            root.style.height = this.height;
        }

        if (this.width)
        {
            root.style.width = this.width;
        }
    }

    // -- Rendering --

    /**
     * Master render — clears and rebuilds the header, body, and markers.
     */
    private render(): void
    {
        if (!this.rootEl)
        {
            return;
        }

        this.destroyIntersectionObserver();

        // Tear down any prior InlineToolbar before clearing the DOM (ADR-128)
        this.teardownInlineToolbar();

        // Clear existing content
        this.rootEl.innerHTML = "";

        // ADR-128: optional toolbar strip above the axis header
        this.mountInlineToolbar();

        if (this.opts.showHeader)
        {
            this.renderHeader();
        }

        this.renderBody();

        if (this.opts.showNowMarker)
        {
            this.renderNowMarker();
        }

        if (this.pannable)
        {
            this.attachPanHandlers();
        }

        this.setupIntersectionObserver();
    }

    /**
     * Renders the time axis header with tick marks.
     */
    private renderHeader(): void
    {
        const header = createElement("div", ["timeline-header"]);

        if (this.opts.showGroupLabels)
        {
            const spacer = createElement("div", ["timeline-header-spacer"]);
            spacer.style.width = `${this.opts.groupLabelWidth}px`;

            if (this.showTimezoneSelector)
            {
                this.renderTimezoneBadge(spacer);
            }

            header.appendChild(spacer);
        }

        const axis = createElement("div", ["timeline-axis"]);
        this.axisEl = axis;

        this.renderTicks(axis);

        header.appendChild(axis);
        this.rootEl!.appendChild(header);
    }

    /**
     * Renders tick marks within the axis container.
     */
    private renderTicks(axis: HTMLElement): void
    {
        const vpStart = this.opts.start.getTime();
        const vpEnd = this.opts.end.getTime();
        const axisWidth = axis.offsetWidth || 600;

        const interval = this.resolveTickInterval(
            vpStart, vpEnd, axisWidth
        );

        // Find the first tick at a clean interval boundary
        const firstTick = Math.ceil(vpStart / interval) * interval;

        for (let t = firstTick; t <= vpEnd; t += interval)
        {
            const pct = timeToPercent(t, vpStart, vpEnd);
            const tick = createElement("div", ["timeline-tick"]);
            tick.style.left = `${pct}%`;

            const label = this.formatTickLabel(new Date(t), interval);
            tick.textContent = label;

            axis.appendChild(tick);
        }
    }

    /**
     * Renders the scrollable body containing groups and items.
     */
    private renderBody(): void
    {
        const body = createElement("div", ["timeline-body"]);
        // Canvas anchors name this region rather than counting it (ADR-162).
        body.setAttribute("data-dui-region", "timeline:body");
        const rowHeight = this.opts.spanHeight + this.opts.rowGap;
        const maxHeight = this.opts.maxVisibleRows * rowHeight;
        body.style.maxHeight = `${maxHeight}px`;

        this.bodyEl = body;

        const sortedGroups = this.getSortedGroups();
        const vpStart = this.opts.start.getTime();
        const vpEnd = this.opts.end.getTime();

        if (sortedGroups.length === 0)
        {
            this.renderUngroupedItems(body, vpStart, vpEnd);
        }
        else
        {
            for (const group of sortedGroups)
            {
                this.renderGroup(body, group, vpStart, vpEnd);
            }

            this.renderUngroupedOverflow(body, vpStart, vpEnd, sortedGroups);
        }

        this.rootEl!.appendChild(body);
    }

    /**
     * Renders items that have no group assignment (default group).
     */
    private renderUngroupedItems(
        body: HTMLElement, vpStart: number, vpEnd: number
    ): void
    {
        const allItems = Array.from(this.items.values());
        const assignments = packRows(
            allItems, vpStart, vpEnd, this.opts.pointSize
        );

        this.renderRows(body, allItems, assignments);
    }

    /**
     * Renders ungrouped items as a default group if groups exist
     * but some items lack a group assignment.
     */
    private renderUngroupedOverflow(
        body: HTMLElement,
        vpStart: number,
        vpEnd: number,
        existingGroups: TimelineGroup[]
    ): void
    {
        const groupIds = new Set(existingGroups.map((g) => g.id));

        const ungrouped = Array.from(this.items.values()).filter(
            (item) => !item.group || !groupIds.has(item.group)
        );

        if (ungrouped.length === 0)
        {
            return;
        }

        const defaultGroup: TimelineGroup = {
            id: "__ungrouped__",
            label: "Other",
            collapsible: false,
        };

        this.renderGroup(body, defaultGroup, vpStart, vpEnd);
    }

    /**
     * Renders a single group with its label and content.
     */
    private renderGroup(
        body: HTMLElement,
        group: TimelineGroup,
        vpStart: number,
        vpEnd: number
    ): void
    {
        const groupEl = createElement("div", ["timeline-group"]);

        if (group.cssClass)
        {
            groupEl.classList.add(group.cssClass);
        }

        if (group.collapsed)
        {
            groupEl.classList.add("timeline-group--collapsed");
        }

        setAttr(groupEl, "data-group-id", group.id);

        if (this.opts.showGroupLabels)
        {
            this.renderGroupLabel(groupEl, group);
        }

        const groupItems = this.getGroupItems(group.id);
        const content = createElement("div", ["timeline-group-content"]);

        if (group.collapsed)
        {
            this.renderCollapsedContent(content, groupItems, vpStart, vpEnd);
        }
        else
        {
            this.renderExpandedContent(content, groupItems, vpStart, vpEnd);
        }

        groupEl.appendChild(content);
        body.appendChild(groupEl);
    }

    /**
     * Renders the group label with optional collapse toggle.
     */
    private renderGroupLabel(
        groupEl: HTMLElement, group: TimelineGroup
    ): void
    {
        const label = createElement("div", ["timeline-group-label"]);
        label.style.width = `${this.opts.groupLabelWidth}px`;

        if (group.collapsible !== false)
        {
            const toggle = createElement("button", ["timeline-group-toggle"]);
            setAttr(toggle, "type", "button");
            setAttr(toggle, "aria-label", `Toggle ${group.label}`);

            const icon = createElement("i", [
                "bi",
                group.collapsed ? "bi-chevron-right" : "bi-chevron-down",
            ]);

            toggle.appendChild(icon);

            toggle.addEventListener("click", (e) =>
            {
                e.stopPropagation();
                this.toggleGroup(group.id);
            });

            label.appendChild(toggle);
        }

        const text = createElement(
            "span", ["timeline-group-label-text"], group.label
        );
        setAttr(text, "title", group.label);

        label.appendChild(text);
        groupEl.appendChild(label);
    }

    /**
     * Renders expanded group content — packed rows with positioned items.
     */
    private renderExpandedContent(
        content: HTMLElement,
        items: TimelineItem[],
        vpStart: number,
        vpEnd: number
    ): void
    {
        const assignments = packRows(
            items, vpStart, vpEnd, this.opts.pointSize
        );

        this.renderRows(content, items, assignments);
    }

    /**
     * Renders collapsed group content — presence band and point dots.
     */
    private renderCollapsedContent(
        content: HTMLElement,
        items: TimelineItem[],
        vpStart: number,
        vpEnd: number
    ): void
    {
        const band = createElement("div", ["timeline-presence-band"]);
        band.style.height = `${this.opts.collapsedBandHeight}px`;

        // Render merged span ranges
        const ranges = mergeRanges(items, this.opts.collapsedBandColor);

        for (const range of ranges)
        {
            this.renderPresenceRange(band, range, vpStart, vpEnd);
        }

        // Render point dots above the band
        const points = items.filter((item) => item.type === "point");

        for (const point of points)
        {
            this.renderPresenceDot(band, point, vpStart, vpEnd);
        }

        content.appendChild(band);
    }

    /**
     * Renders a single merged range bar within the presence band.
     */
    private renderPresenceRange(
        band: HTMLElement,
        range: MergedRange,
        vpStart: number,
        vpEnd: number
    ): void
    {
        const left = clampPercent(timeToPercent(range.start, vpStart, vpEnd));
        const right = clampPercent(timeToPercent(range.end, vpStart, vpEnd));
        const width = Math.max(0.2, right - left);

        const rangeEl = createElement("div", ["timeline-presence-range"]);
        rangeEl.style.left = `${left}%`;
        rangeEl.style.width = `${width}%`;
        rangeEl.style.backgroundColor = range.color;

        band.appendChild(rangeEl);
    }

    /**
     * Renders a point dot within the presence band.
     */
    private renderPresenceDot(
        band: HTMLElement,
        point: TimelineItem,
        vpStart: number,
        vpEnd: number
    ): void
    {
        if (!isItemVisible(point, vpStart, vpEnd))
        {
            return;
        }

        const pct = timeToPercent(
            point.start.getTime(), vpStart, vpEnd
        );

        const dot = createElement("div", ["timeline-presence-dot"]);
        dot.style.left = `${pct}%`;

        if (point.color)
        {
            dot.style.setProperty("--timeline-dot-color", point.color);
        }

        if (point.tooltip)
        {
            setAttr(dot, "title", point.tooltip);
        }

        band.appendChild(dot);
    }

    /**
     * Renders rows of items from row assignments.
     */
    private renderRows(
        container: HTMLElement,
        items: TimelineItem[],
        assignments: RowAssignment[]
    ): void
    {
        const itemMap = new Map(items.map((item) => [item.id, item]));
        const maxRow = assignments.reduce(
            (max, a) => Math.max(max, a.row), -1
        );

        const rowHeight = this.opts.spanHeight + this.opts.rowGap;

        // Set container min-height for all rows
        container.style.minHeight = `${(maxRow + 1) * rowHeight}px`;

        for (const assignment of assignments)
        {
            const item = itemMap.get(assignment.itemId);

            if (!item)
            {
                continue;
            }

            this.renderItem(container, item, assignment);
        }
    }

    /**
     * Renders a single item (point or span) at its assigned position.
     */
    private renderItem(
        container: HTMLElement,
        item: TimelineItem,
        assignment: RowAssignment
    ): void
    {
        if (item.type === "span")
        {
            this.renderSpanItem(container, item, assignment);
        }
        else
        {
            this.renderPointItem(container, item, assignment);
        }
    }

    /**
     * Renders a span event as a positioned block with label.
     */
    private renderSpanItem(
        container: HTMLElement,
        item: TimelineItem,
        assignment: RowAssignment
    ): void
    {
        const rowHeight = this.opts.spanHeight + this.opts.rowGap;
        const el = createElement("div", [
            "timeline-item", "timeline-item-span",
        ]);

        setAttr(el, "data-item-id", item.id);
        setAttr(el, "tabindex", "0");
        setAttr(el, "role", "button");
        setAttr(el, "aria-label", item.label);

        el.style.left = `${assignment.leftPercent}%`;
        el.style.width = `${assignment.widthPercent}%`;
        el.style.top = `${assignment.row * rowHeight}px`;
        el.style.height = `${this.opts.spanHeight}px`;

        if (item.color)
        {
            el.style.setProperty("--timeline-item-color", item.color);
            el.style.setProperty(
                "--timeline-item-text-color", readableOn(item.color));
        }

        if (item.tooltip)
        {
            setAttr(el, "title", item.tooltip);
        }

        if (item.cssClass)
        {
            el.classList.add(item.cssClass);
        }

        if (item.id === this.selectedItemId)
        {
            el.classList.add("timeline-item--selected");
        }

        const label = createElement(
            "span", ["timeline-item-label"], item.label
        );
        el.appendChild(label);

        container.appendChild(el);
    }

    /**
     * Renders a point event as a positioned SVG diamond marker.
     */
    private renderPointItem(
        container: HTMLElement,
        item: TimelineItem,
        assignment: RowAssignment
    ): void
    {
        const rowHeight = this.opts.spanHeight + this.opts.rowGap;
        const size = this.opts.pointSize;

        const el = createElement("div", [
            "timeline-item", "timeline-item-point",
        ]);

        setAttr(el, "data-item-id", item.id);
        setAttr(el, "tabindex", "0");
        setAttr(el, "role", "button");
        setAttr(el, "aria-label", item.label);

        el.style.left = `${assignment.leftPercent}%`;
        el.style.top = `${(assignment.row * rowHeight) + ((this.opts.spanHeight - size) / 2)}px`;
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;

        if (item.tooltip)
        {
            setAttr(el, "title", item.tooltip);
        }

        if (item.cssClass)
        {
            el.classList.add(item.cssClass);
        }

        if (item.id === this.selectedItemId)
        {
            el.classList.add("timeline-item--selected");
        }

        const svg = this.buildPointSVG(item, size);
        el.appendChild(svg);

        container.appendChild(el);
    }

    /**
     * Builds an SVG diamond marker for a point event.
     */
    private buildPointSVG(item: TimelineItem, size: number): SVGElement
    {
        const svg = createSVGElement("svg", {
            viewBox: `0 0 ${size} ${size}`,
            width: String(size),
            height: String(size),
            class: "timeline-point-marker",
        });

        const half = size / 2;
        const color = item.color || "#0d6efd";

        // Diamond shape: top-center, right-center, bottom-center, left-center
        const diamond = createSVGElement("polygon", {
            points: `${half},0 ${size},${half} ${half},${size} 0,${half}`,
            fill: color,
        });

        svg.appendChild(diamond);

        return svg;
    }

    /**
     * Renders the "now" marker as a red vertical line.
     */
    private renderNowMarker(): void
    {
        const now = Date.now();
        const vpStart = this.opts.start.getTime();
        const vpEnd = this.opts.end.getTime();

        if (now < vpStart || now > vpEnd)
        {
            return;
        }

        const pct = timeToPercent(now, vpStart, vpEnd);
        const marker = createElement("div", ["timeline-now-marker"]);

        // Account for group label width offset
        if (this.opts.showGroupLabels)
        {
            marker.style.left = `calc(${this.opts.groupLabelWidth}px + ${pct}% * (100% - ${this.opts.groupLabelWidth}px) / 100%)`;
        }
        else
        {
            marker.style.left = `${pct}%`;
        }

        this.nowMarkerEl = marker;
        this.rootEl!.appendChild(marker);
    }

    // -- Selection DOM Update --

    /**
     * Updates the selection CSS class on item elements without full re-render.
     */
    private updateSelectionDOM(
        previousId: string | null, newId: string | null
    ): void
    {
        if (!this.rootEl)
        {
            return;
        }

        if (previousId)
        {
            const prevEl = this.rootEl.querySelector(
                `[data-item-id="${previousId}"]`
            );
            if (prevEl)
            {
                prevEl.classList.remove("timeline-item--selected");
            }
        }

        if (newId)
        {
            const newEl = this.rootEl.querySelector(
                `[data-item-id="${newId}"]`
            );
            if (newEl)
            {
                newEl.classList.add("timeline-item--selected");
            }
        }
    }

    // -- Event Handlers --

    /**
     * Handles click events on timeline items using event delegation.
     */
    private handleItemClick(e: Event): void
    {
        if (this.opts.disabled)
        {
            return;
        }

        // Suppress click that follows a drag
        if (this.panMoved)
        {
            this.panMoved = false;
            return;
        }

        const target = e.target as HTMLElement;
        const itemEl = target.closest("[data-item-id]") as HTMLElement | null;

        if (!itemEl)
        {
            return;
        }

        const itemId = itemEl.getAttribute("data-item-id");

        if (!itemId)
        {
            return;
        }

        const item = this.items.get(itemId);

        if (!item)
        {
            return;
        }

        // Fire click callback
        if (this.onItemClick)
        {
            this.onItemClick({ ...item });
        }

        this.emitSelect(item);

        // Toggle selection
        const newSelection = (this.selectedItemId === itemId) ? null : itemId;

        this.selectItem(newSelection);
    }

    // -- Tick Interval Resolution --

    /**
     * Resolves the effective tick interval in milliseconds.
     * Delegates to selectTickInterval when set to "auto".
     */
    private resolveTickInterval(
        vpStart: number, vpEnd: number, axisWidth: number
    ): number
    {
        if (this.tickIntervalOption === "auto")
        {
            return selectTickInterval(vpStart, vpEnd, axisWidth);
        }

        if (typeof this.tickIntervalOption === "string")
        {
            return TICK_PRESET_MAP[this.tickIntervalOption] ?? MS_HOUR;
        }

        return this.tickIntervalOption;
    }

    // -- Timezone Formatting --

    /**
     * Rebuilds cached Intl.DateTimeFormat instances for the current timezone.
     */
    private rebuildFormatters(): void
    {
        this.tickFormatter = null;
        this.dateFormatter = null;
        this.monthYearFormatter = null;
    }

    /**
     * Formats a tick label using Intl.DateTimeFormat for timezone support.
     */
    private formatTickLabel(date: Date, intervalMs: number): string
    {
        // Sub-hour intervals: tick marks only, no text labels
        if (intervalMs < MS_HOUR)
        {
            return "";
        }

        if (intervalMs < MS_DAY)
        {
            return this.formatTimeLabel(date);
        }

        if (intervalMs < 30 * MS_DAY)
        {
            return this.formatDateLabel(date);
        }

        return this.formatMonthYearLabel(date);
    }

    /**
     * Formats a time-of-day label (HH:mm) in the configured timezone.
     */
    private formatTimeLabel(date: Date): string
    {
        if (!this.tickFormatter)
        {
            this.tickFormatter = new Intl.DateTimeFormat("en-GB", {
                timeZone: this.timezone,
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
            });
        }

        return this.tickFormatter.format(date);
    }

    /**
     * Formats a date label (MMM dd) in the configured timezone.
     */
    private formatDateLabel(date: Date): string
    {
        if (!this.dateFormatter)
        {
            this.dateFormatter = new Intl.DateTimeFormat("en-US", {
                timeZone: this.timezone,
                month: "short",
                day: "numeric",
            });
        }

        return this.dateFormatter.format(date);
    }

    /**
     * Formats a month-year label (MMM yyyy) in the configured timezone.
     */
    private formatMonthYearLabel(date: Date): string
    {
        if (!this.monthYearFormatter)
        {
            this.monthYearFormatter = new Intl.DateTimeFormat("en-US", {
                timeZone: this.timezone,
                month: "short",
                year: "numeric",
            });
        }

        return this.monthYearFormatter.format(date);
    }

    // -- Timezone Selector UI --

    /**
     * Returns a short display name for the current timezone.
     */
    private getShortTimezoneName(): string
    {
        try
        {
            const fmt = new Intl.DateTimeFormat("en-US", {
                timeZone: this.timezone,
                timeZoneName: "short",
            });
            const parts = fmt.formatToParts(new Date());
            const tzPart = parts.find((p) => p.type === "timeZoneName");
            return tzPart?.value ?? this.timezone;
        }
        catch
        {
            return this.timezone;
        }
    }

    /**
     * Renders a timezone badge button in the header spacer.
     */
    private renderTimezoneBadge(container: HTMLElement): void
    {
        const badge = createElement(
            "button", ["timeline-tz-badge"],
            this.getShortTimezoneName()
        );
        setAttr(badge, "type", "button");
        setAttr(badge, "aria-label",
            `Current timezone: ${this.timezone}`);
        setAttr(badge, "title", `Timezone: ${this.timezone}`);

        badge.addEventListener("click", (e) =>
        {
            e.stopPropagation();
            this.toggleTimezoneDropdown(badge);
        });

        container.appendChild(badge);
    }

    /**
     * Toggles the timezone dropdown open/closed.
     */
    private toggleTimezoneDropdown(anchor: HTMLElement): void
    {
        if (this.timezoneSelectorEl)
        {
            this.closeTimezoneDropdown();
            return;
        }

        this.openTimezoneDropdown(anchor);
    }

    /**
     * Opens the timezone dropdown below the badge.
     */
    private openTimezoneDropdown(anchor: HTMLElement): void
    {
        const dropdown = createElement("div", ["timeline-tz-dropdown"]);

        const search = document.createElement("input");
        search.className = "timeline-tz-search";
        search.type = "text";
        search.placeholder = "Search timezones...";
        dropdown.appendChild(search);

        const list = createElement("div", ["timeline-tz-list"]);
        list.setAttribute("data-dui-region", "timeline:tz-list");
        dropdown.appendChild(list);

        const allTimezones = getIANATimezones();

        this.populateTimezoneList(list, allTimezones, "");

        search.addEventListener("input", () =>
        {
            logTrace("input handler");
            this.populateTimezoneList(
                list, allTimezones, search.value
            );
        });

        // Position relative to anchor's parent (the spacer)
        const parent = anchor.parentElement;
        if (parent)
        {
            parent.style.position = "relative";
            parent.appendChild(dropdown);
        }

        this.timezoneSelectorEl = dropdown;

        // Close on outside click (next tick to avoid immediate close)
        requestAnimationFrame(() =>
        {
            this.boundCloseTimezoneDropdown = (e: MouseEvent) =>
            {
                const target = e.target as HTMLElement;
                if (!dropdown.contains(target) &&
                    target !== anchor)
                {
                    this.closeTimezoneDropdown();
                }
            };

            document.addEventListener(
                "click", this.boundCloseTimezoneDropdown
            );
        });

        search.focus();
    }

    /**
     * Populates the timezone list with filtered items.
     */
    private populateTimezoneList(
        list: HTMLElement, timezones: string[], filter: string
    ): void
    {
        while (list.firstChild)
        {
            list.removeChild(list.firstChild);
        }

        const query = filter.toLowerCase();
        const filtered = filter
            ? timezones.filter((tz) => tz.toLowerCase().includes(query))
            : timezones;

        for (const tz of filtered.slice(0, 50))
        {
            list.appendChild(this.createTimezoneItem(tz));
        }
    }

    /**
     * Creates a single timezone dropdown item element.
     */
    private createTimezoneItem(tz: string): HTMLElement
    {
        const item = createElement("div", ["timeline-tz-item"]);
        item.textContent = tz.replace(/_/g, " ");
        setAttr(item, "data-tz", tz);

        if (tz === this.timezone)
        {
            item.classList.add("timeline-tz-item--active");
        }

        item.addEventListener("click", () =>
        {
            this.setTimezone(tz);
            this.closeTimezoneDropdown();
        });

        return item;
    }

    /**
     * Closes the timezone dropdown and removes the document listener.
     */
    private closeTimezoneDropdown(): void
    {
        if (this.timezoneSelectorEl)
        {
            this.timezoneSelectorEl.remove();
            this.timezoneSelectorEl = null;
        }

        if (this.boundCloseTimezoneDropdown)
        {
            document.removeEventListener(
                "click", this.boundCloseTimezoneDropdown
            );
            this.boundCloseTimezoneDropdown = null;
        }
    }

    // -- Drag-to-Pan --

    /**
     * Attaches pointer event handlers for drag-to-pan.
     */
    private attachPanHandlers(): void
    {
        this.boundPanStart = (e: PointerEvent) =>
        {
            this.handlePanStart(e);
        };

        this.boundWheelPan = (e: WheelEvent) =>
        {
            this.handleWheelPan(e);
        };

        if (this.bodyEl)
        {
            this.bodyEl.addEventListener(
                "pointerdown", this.boundPanStart
            );
            this.bodyEl.addEventListener(
                "wheel", this.boundWheelPan, { passive: false }
            );
        }

        if (this.axisEl)
        {
            this.axisEl.addEventListener(
                "pointerdown", this.boundPanStart
            );
            this.axisEl.addEventListener(
                "wheel", this.boundWheelPan, { passive: false }
            );
        }
    }

    /**
     * Begins a pan operation on pointer down.
     */
    private handlePanStart(e: PointerEvent): void
    {
        if (e.button !== 0 || this.opts.disabled)
        {
            return;
        }

        // Do not pan when clicking directly on an item
        const target = e.target as HTMLElement;

        if (target.closest("[data-item-id]"))
        {
            return;
        }

        this.isPanning = true;
        this.panMoved = false;
        this.panStartX = e.clientX;
        this.panStartVpStart = this.opts.start.getTime();
        this.panStartVpEnd = this.opts.end.getTime();

        const panTarget = e.currentTarget as HTMLElement;
        panTarget.setPointerCapture(e.pointerId);
        panTarget.style.cursor = "grabbing";

        const boundMove = (ev: PointerEvent) =>
        {
            this.handlePanMove(ev);
        };

        const boundEnd = (ev: PointerEvent) =>
        {
            this.handlePanEnd(ev, panTarget);
            panTarget.removeEventListener("pointermove", boundMove);
            panTarget.removeEventListener("pointerup", boundEnd);
        };

        panTarget.addEventListener("pointermove", boundMove);
        panTarget.addEventListener("pointerup", boundEnd);
    }

    /**
     * Handles pointer movement during pan — shifts viewport.
     */
    private handlePanMove(e: PointerEvent): void
    {
        logTrace("pointermove handler:", { x: e.clientX, y: e.clientY });
        if (!this.isPanning)
        {
            return;
        }

        const dx = e.clientX - this.panStartX;

        if (!this.panMoved && Math.abs(dx) < DRAG_THRESHOLD_PX)
        {
            return;
        }

        this.panMoved = true;

        const vpDuration = this.panStartVpEnd - this.panStartVpStart;
        const containerWidth = this.axisEl?.offsetWidth || 600;
        const msPerPixel = vpDuration / containerWidth;
        const shiftMs = -(dx * msPerPixel);

        this.opts.start = new Date(this.panStartVpStart + shiftMs);
        this.opts.end = new Date(this.panStartVpEnd + shiftMs);

        if (this.panRafId)
        {
            cancelAnimationFrame(this.panRafId);
        }

        this.panRafId = requestAnimationFrame(() =>
        {
            this.render();
            this.firePanViewportChange();
        });
    }

    /**
     * Ends a pan operation and cleans up.
     */
    private handlePanEnd(
        e: PointerEvent, panTarget: HTMLElement
    ): void
    {
        this.isPanning = false;
        panTarget.releasePointerCapture(e.pointerId);
        panTarget.style.cursor = "";

        if (this.panRafId)
        {
            cancelAnimationFrame(this.panRafId);
            this.panRafId = 0;
        }
    }

    /**
     * Handles mouse wheel for horizontal panning.
     * Horizontal scroll (deltaX) or Shift+vertical scroll both pan.
     */
    private handleWheelPan(e: WheelEvent): void
    {
        logTrace("wheel handler:", { dx: e.deltaX, dy: e.deltaY });
        if (this.opts.disabled)
        {
            return;
        }

        const deltaX = e.shiftKey ? e.deltaY : e.deltaX;

        if (Math.abs(deltaX) < 1)
        {
            return;
        }

        e.preventDefault();

        const vpStart = this.opts.start.getTime();
        const vpEnd = this.opts.end.getTime();
        const vpDuration = vpEnd - vpStart;
        const containerWidth = this.axisEl?.offsetWidth || 600;
        const msPerPixel = vpDuration / containerWidth;
        const shiftMs = deltaX * msPerPixel;

        this.opts.start = new Date(vpStart + shiftMs);
        this.opts.end = new Date(vpEnd + shiftMs);

        this.render();
        this.firePanViewportChange();
    }

    /**
     * Fires the onViewportChange callback after a pan operation.
     */
    private firePanViewportChange(): void
    {
        if (this.onViewportChange)
        {
            this.onViewportChange(
                new Date(this.opts.start),
                new Date(this.opts.end)
            );
        }
    }

    /**
     * Removes all pan-related event listeners.
     */
    private detachPanHandlers(): void
    {
        if (this.boundPanStart && this.bodyEl)
        {
            this.bodyEl.removeEventListener(
                "pointerdown", this.boundPanStart
            );
        }

        if (this.boundPanStart && this.axisEl)
        {
            this.axisEl.removeEventListener(
                "pointerdown", this.boundPanStart
            );
        }

        if (this.boundWheelPan && this.bodyEl)
        {
            this.bodyEl.removeEventListener(
                "wheel", this.boundWheelPan
            );
        }

        if (this.boundWheelPan && this.axisEl)
        {
            this.axisEl.removeEventListener(
                "wheel", this.boundWheelPan
            );
        }

        this.boundPanStart = null;
        this.boundWheelPan = null;
    }

    // -- Helpers --

    /**
     * Loads items from an array into the internal Map.
     */
    private loadItems(items: TimelineItem[]): void
    {
        for (const item of items)
        {
            this.refuseMalformedSpan(item);
            this.items.set(item.id, { ...item });
        }
    }

    /**
     * Loads groups from an array into the internal Map.
     */
    private loadGroups(groups: TimelineGroup[]): void
    {
        for (const group of groups)
        {
            this.groups.set(group.id, {
                collapsible: true,
                collapsed: false,
                ...group,
            });
        }
    }

    /**
     * Returns items belonging to a specific group.
     */
    private getGroupItems(groupId: string): TimelineItem[]
    {
        return Array.from(this.items.values()).filter(
            (item) => item.group === groupId
        );
    }

    // -- CategorizedDataInlineToolbar internals (ADR-128) --

    /**
     * Mount the optional InlineToolbar in a header strip above the axis.
     * Resolves window.createInlineToolbar defensively (ADR-128).
     */
    // ADR-128
    private mountInlineToolbar(): void
    {
        if (!this.showInlineToolbar) { return; }
        if (!this.rootEl) { return; }

        const win = window;
        const factory = win.createInlineToolbar as
            ((opts: Record<string, unknown>) => InlineToolbarHandleShape) | undefined;
        if (typeof factory !== "function")
        {
            // FALLBACK-14. This used to warn and return, so a page that
            // asked for the toolbar got a header strip with nothing in
            // it and a line in a console nobody reads. `showInlineToolbar`
            // is a capability the CALLER named, which AGENTS.md puts in
            // the row that throws rather than renders a reduced version.
            throw new Error(
                `${LOG_PREFIX} showInlineToolbar is true, and `
                + "window.createInlineToolbar is not loaded. Load the "
                + "InlineToolbar component before this one, or leave "
                + "showInlineToolbar off.");
        }

        const headerStrip = createElement("div", ["timeline-toolbar-header"]);
        const slot = createElement("span", ["timeline-toolbar-slot"]);
        headerStrip.appendChild(slot);
        this.rootEl.appendChild(headerStrip);

        try
        {
            this.toolbarHandle = factory({
                container: slot,
                size: "sm",
                items: this.buildToolbarItems(),
            });
        }
        catch (e)
        {
            // FALLBACK-14. The old body logged and set the handle to
            // null, so the toolbar silently did not exist and the
            // original error never reached the caller. `cause` keeps it.
            // `cause` is ES2022 and this build targets ES2020, so the
            // second Error argument is assigned rather than passed.
            const err = new Error(
                `${LOG_PREFIX} the InlineToolbar factory threw while `
                + "building the toolbar. The error it raised is attached "
                + "as `cause`.");
            (err as Error & { cause?: unknown }).cause = e;
            throw err;
        }
    }

    /** Build the 5 default toolbar items (sort asc/desc, separator, expand/collapse). */
    // ADR-128
    private buildToolbarItems(): Array<Record<string, unknown>>
    {
        return [
            {
                id: "tl-sort-asc",
                icon: "sort-alpha-down",
                tooltip: "Sort group labels A\u2192Z",
                type: "toggle",
                active: this.sortMode === "asc",
                onClick: () => { this.handleToolbarSort("asc"); },
            },
            {
                id: "tl-sort-desc",
                icon: "sort-alpha-up",
                tooltip: "Sort group labels Z\u2192A",
                type: "toggle",
                active: this.sortMode === "desc",
                onClick: () => { this.handleToolbarSort("desc"); },
            },
            { id: "tl-sep", icon: "", tooltip: "", type: "separator" },
            {
                id: "tl-expand-all",
                icon: "arrows-expand",
                tooltip: "Expand all groups",
                onClick: () => { this.expandAll(); },
            },
            {
                id: "tl-collapse-all",
                icon: "arrows-collapse",
                tooltip: "Collapse all groups",
                onClick: () => { this.collapseAll(); },
            },
        ];
    }

    /** Toolbar sort button click — toggles asc/desc/null. ADR-128. */
    // ADR-128
    private handleToolbarSort(mode: "asc" | "desc"): void
    {
        const next: TimelineSortMode = (this.sortMode === mode) ? null : mode;
        this.setSortMode(next);
    }

    /** Tear down the current InlineToolbar handle and DOM strip. ADR-128. */
    // ADR-128
    private teardownInlineToolbar(): void
    {
        if (this.toolbarHandle)
        {
            try { this.toolbarHandle.destroy(); }
            catch (e) { logWarn("InlineToolbar destroy threw:", e); }
            this.toolbarHandle = null;
        }
    }

    /** Compute aggregate collapse state across visible groups. ADR-128. */
    // ADR-128
    private computeCollapseState(): TimelineCollapseState
    {
        const total = this.groups.size;
        if (total === 0) { return "all-expanded"; }
        let collapsed = 0;
        for (const group of this.groups.values())
        {
            if (group.collapsed === true) { collapsed += 1; }
        }
        if (collapsed === 0) { return "all-expanded"; }
        if (collapsed >= total) { return "all-collapsed"; }
        return "mixed";
    }

    /** Fire onCollapseStateChange if configured. ADR-128. */
    // ADR-128
    private emitCollapseState(): void
    {
        if (typeof this.onCollapseStateChange !== "function") { return; }
        try { this.onCollapseStateChange(this.computeCollapseState()); }
        catch (e) { logError("onCollapseStateChange threw:", e); }
    }

    /** Mirror the current sortMode into toolbar toggle button state. ADR-128. */
    // ADR-128
    private syncToolbarSortButtons(): void
    {
        if (!this.toolbarHandle) { return; }
        try
        {
            this.toolbarHandle.setItemActive("tl-sort-asc", this.sortMode === "asc");
            this.toolbarHandle.setItemActive("tl-sort-desc", this.sortMode === "desc");
        }
        catch (e) { logWarn("Toolbar setItemActive threw:", e); }
    }

    /**
     * Returns groups sorted by their order property, then by the active
     * label sort mode (asc/desc) when set via the InlineToolbar (ADR-128).
     * Sorts a copy — does not mutate the host's groups map order.
     */
    private getSortedGroups(): TimelineGroup[]
    {
        const list = Array.from(this.groups.values()).sort(
            (a, b) => (a.order ?? 0) - (b.order ?? 0)
        );

        return this.applySortToGroups(list);
    }

    /** Apply current sortMode to a group list copy. ADR-128. */
    // ADR-128
    private applySortToGroups(
        list: TimelineGroup[]
    ): TimelineGroup[]
    {
        if (this.sortMode === null) { return list; }
        const out = list.slice();
        out.sort((a, b) => a.label.localeCompare(b.label));
        if (this.sortMode === "desc") { out.reverse(); }
        return out;
    }

    // -- Intersection Observer (Viewport Visibility) --

    /**
     * Sets up the IntersectionObserver to detect items scrolling into view.
     */
    private setupIntersectionObserver(): void
    {
        if (!this.onItemVisible || !this.bodyEl)
        {
            return;
        }

        const visibleItems: Set<string> = new Set();

        this.intersectionObserver = new IntersectionObserver(
            (entries) =>
            {
                this.handleVisibilityChange(entries, visibleItems);
            },
            {
                root: this.bodyEl,
                threshold: 0.1,
            }
        );

        const itemEls = this.bodyEl.querySelectorAll("[data-item-id]");

        for (const el of itemEls)
        {
            this.intersectionObserver.observe(el);
        }
    }

    /**
     * Handles IntersectionObserver entries and fires onItemVisible.
     */
    private handleVisibilityChange(
        entries: IntersectionObserverEntry[],
        visibleItems: Set<string>
    ): void
    {
        let changed = false;

        for (const entry of entries)
        {
            const id = (entry.target as HTMLElement)
                .getAttribute("data-item-id");

            if (!id)
            {
                continue;
            }

            if (entry.isIntersecting)
            {
                if (!visibleItems.has(id))
                {
                    visibleItems.add(id);
                    changed = true;
                }
            }
            else
            {
                visibleItems.delete(id);
            }
        }

        if (changed && this.onItemVisible)
        {
            const items = Array.from(visibleItems)
                .map((id) => this.items.get(id))
                .filter((item): item is TimelineItem => item !== undefined)
                .map((item) => ({ ...item }));

            this.onItemVisible(items);
        }
    }

    /**
     * Destroys the IntersectionObserver.
     */
    private destroyIntersectionObserver(): void
    {
        if (this.intersectionObserver)
        {
            this.intersectionObserver.disconnect();
            this.intersectionObserver = null;
        }
    }

    // -- Resize Observer --

    /**
     * Sets up a ResizeObserver to re-render ticks when container resizes.
     */
    private setupResizeObserver(): void
    {
        if (!this.rootEl)
        {
            return;
        }

        this.resizeObserver = new ResizeObserver(() =>
        {
            this.render();
        });

        this.resizeObserver.observe(this.rootEl);
    }

    /**
     * Destroys the ResizeObserver.
     */
    private destroyResizeObserver(): void
    {
        if (this.resizeObserver)
        {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
    }

    // -- Now Marker Timer --

    /**
     * Starts the periodic now marker update timer.
     */
    private startNowMarkerTimer(): void
    {
        this.nowMarkerTimer = setInterval(() =>
        {
            this.updateNowMarker();
        }, NOW_MARKER_UPDATE_INTERVAL);
    }

    /**
     * Updates the position of the now marker.
     */
    private updateNowMarker(): void
    {
        if (!this.nowMarkerEl)
        {
            return;
        }

        const now = Date.now();
        const vpStart = this.opts.start.getTime();
        const vpEnd = this.opts.end.getTime();

        if (now < vpStart || now > vpEnd)
        {
            this.nowMarkerEl.style.display = "none";
            return;
        }

        const pct = timeToPercent(now, vpStart, vpEnd);
        this.nowMarkerEl.style.display = "";
        this.nowMarkerEl.style.left = `${pct}%`;
    }

    /**
     * Stops the now marker update timer.
     */
    private stopNowMarkerTimer(): void
    {
        if (this.nowMarkerTimer)
        {
            clearInterval(this.nowMarkerTimer);
            this.nowMarkerTimer = null;
        }
    }

    // -- Keyboard Handling --

    /** Dispatches keyboard events to timeline actions. */
    private handleKeydown(e: KeyboardEvent): void
    {
        logTrace("keydown handler:", { key: e.key.length > 1 ? e.key : "(char)", ctrl: e.ctrlKey });
        if (this.opts.disabled) { return; }
        if (e.target !== this.rootEl) { return; }

        if (this.matchesKeyCombo(e, "zoomIn"))
        {
            e.preventDefault();
            this.zoomViewport(-KEYBOARD_ZOOM_FACTOR);
        }
        else if (this.matchesKeyCombo(e, "zoomOut"))
        {
            e.preventDefault();
            this.zoomViewport(KEYBOARD_ZOOM_FACTOR);
        }
        else if (this.matchesKeyCombo(e, "resetZoom"))
        {
            e.preventDefault();
            this.resetViewportZoom();
        }
        else if (this.matchesKeyCombo(e, "scrollToToday"))
        {
            e.preventDefault();
            this.scrollToDate(new Date());
        }
    }

    /** Zooms the viewport by a fraction (negative = zoom in). */
    private zoomViewport(fraction: number): void
    {
        const startMs = this.opts.start.getTime();
        const endMs = this.opts.end.getTime();
        const duration = endMs - startMs;
        const delta = duration * fraction;

        this.setViewport(
            new Date(startMs - delta),
            new Date(endMs + delta)
        );
    }

    /** Resets the viewport to its initial duration, centred. */
    private resetViewportZoom(): void
    {
        const startMs = this.opts.start.getTime();
        const endMs = this.opts.end.getTime();
        const center = (startMs + endMs) / 2;
        const half = this.initialViewportDuration / 2;

        this.setViewport(
            new Date(center - half),
            new Date(center + half)
        );
    }

    /** Resolves the key combo string for a named action. */
    private resolveKeyCombo(action: string): string
    {
        return this.keyBindingsOverride?.[action]
            ?? DEFAULT_KEY_BINDINGS[action] ?? "";
    }

    /** Tests whether a KeyboardEvent matches a named action. */
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
}

// ============================================================================
// S6: CONVENIENCE FUNCTIONS AND GLOBAL EXPORTS
// ============================================================================

// @entrypoint

/**
 * Creates and returns a new Timeline instance.
 *
 * @param options - Configuration options for the timeline.
 * @returns The Timeline instance.
 */
export function createTimeline(options: TimelineOptions): TimelineHandle
{
    // ERR-2. AGENTS.md: a missing option throws, it does not
    // get a silent default. This used to reach the field and
    // crash a frame later with a TypeError that names the line
    // rather than the thing the caller left out. Absent means
    // undefined, so an empty array or a zero is present.
    if (options.start === undefined)
    {
        throw new Error(
            `${LOG_PREFIX} options.start is required. `
            + "Pass it when creating the Timeline.");
    }

    if (options.end === undefined)
    {
        throw new Error(
            `${LOG_PREFIX} options.end is required. `
            + "Pass it when creating the Timeline.");
    }

    return new Timeline(options);
}

// -- Global Exports --
// Make available on window for non-module consumers.
if (typeof window !== "undefined")
{
    window["createTimeline"] = createTimeline;
}
