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

// ============================================================================
// S2: CONSTANTS
// ============================================================================

const LOG_PREFIX = "[Timeline]";

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
 * Falls back to a common subset if Intl.supportedValuesOf is unavailable.
 */
function getIANATimezones(): string[]
{
    try
    {
        return (Intl as any).supportedValuesOf("timeZone");
    }
    catch
    {
        return [
            "UTC",
            "America/New_York", "America/Chicago",
            "America/Denver", "America/Los_Angeles",
            "America/Toronto", "America/Sao_Paulo",
            "Europe/London", "Europe/Paris", "Europe/Berlin",
            "Europe/Moscow",
            "Asia/Tokyo", "Asia/Shanghai", "Asia/Kolkata",
            "Asia/Dubai", "Asia/Singapore",
            "Australia/Sydney",
            "Pacific/Auckland",
        ];
    }
}

/**
 * Resolves a container element by ID with validation.
 */
function resolveContainer(containerId: string): HTMLElement | null
{
    if (!containerId)
    {
        console.error(LOG_PREFIX, "No container ID provided");
        return null;
    }

    const el = document.getElementById(containerId);

    if (!el)
    {
        console.error(LOG_PREFIX, "Container not found:", containerId);
        return null;
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
export class Timeline
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
    private instanceId: number;

    // -- DOM references --
    private rootEl: HTMLElement | null = null;
    private headerEl: HTMLElement | null = null;
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

    /**
     * Creates a new Timeline instance.
     *
     * @param options - Configuration options for the timeline.
     */
    constructor(options: TimelineOptions)
    {
        this.instanceId = ++instanceCounter;

        console.log(LOG_PREFIX, `Creating instance #${this.instanceId}`);

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

        this.boundHandleItemClick = this.handleItemClick.bind(this);

        this.loadItems(options.items ?? []);
        this.loadGroups(options.groups ?? []);

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

        console.log(LOG_PREFIX, `Instance #${this.instanceId} shown`);
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

        console.log(LOG_PREFIX, `Instance #${this.instanceId} hidden`);
    }

    /**
     * Destroys the timeline, cleaning up all DOM, listeners, and timers.
     */
    public destroy(): void
    {
        console.log(LOG_PREFIX, `Destroying instance #${this.instanceId}`);

        this.stopNowMarkerTimer();
        this.destroyIntersectionObserver();
        this.destroyResizeObserver();
        this.detachPanHandlers();
        this.closeTimezoneDropdown();

        if (this.rootEl)
        {
            this.rootEl.removeEventListener("click", this.boundHandleItemClick);

            if (this.rootEl.parentElement)
            {
                this.rootEl.parentElement.removeChild(this.rootEl);
            }
        }

        this.rootEl = null;
        this.headerEl = null;
        this.axisEl = null;
        this.bodyEl = null;
        this.nowMarkerEl = null;
        this.timezoneSelectorEl = null;
        this.tickFormatter = null;
        this.dateFormatter = null;
        this.monthYearFormatter = null;
        this.items.clear();
        this.groups.clear();

        console.log(LOG_PREFIX, `Instance #${this.instanceId} destroyed`);
    }

    // -- Item API --

    /**
     * Adds a single item to the timeline.
     */
    public addItem(item: TimelineItem): void
    {
        this.items.set(item.id, { ...item });

        console.log(LOG_PREFIX, "Item added:", item.id);

        this.render();
    }

    /**
     * Adds multiple items to the timeline.
     */
    public addItems(items: TimelineItem[]): void
    {
        for (const item of items)
        {
            this.items.set(item.id, { ...item });
        }

        console.log(LOG_PREFIX, `${items.length} items added`);

        this.render();
    }

    /**
     * Removes an item by ID.
     */
    public removeItem(id: string): void
    {
        if (!this.items.has(id))
        {
            console.warn(LOG_PREFIX, "Item not found:", id);
            return;
        }

        this.items.delete(id);

        if (this.selectedItemId === id)
        {
            this.selectedItemId = null;
        }

        console.log(LOG_PREFIX, "Item removed:", id);

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
            console.warn(LOG_PREFIX, "Item not found for update:", id);
            return;
        }

        this.items.set(id, { ...existing, ...updates, id });

        console.log(LOG_PREFIX, "Item updated:", id);

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

        if (this.onItemSelect)
        {
            this.onItemSelect(selectedItem ? { ...selectedItem } : null);
        }

        console.log(LOG_PREFIX, "Selection changed:", id ?? "none");
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

        console.log(LOG_PREFIX, "Group added:", group.id);

        this.render();
    }

    /**
     * Removes a group by ID. Items in the group are not removed.
     */
    public removeGroup(id: string): void
    {
        if (!this.groups.has(id))
        {
            console.warn(LOG_PREFIX, "Group not found:", id);
            return;
        }

        this.groups.delete(id);

        console.log(LOG_PREFIX, "Group removed:", id);

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
            console.warn(LOG_PREFIX, "Group not found for update:", id);
            return;
        }

        this.groups.set(id, { ...existing, ...updates, id });

        console.log(LOG_PREFIX, "Group updated:", id);

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
            console.warn(LOG_PREFIX, "Group not found:", id);
            return;
        }

        group.collapsed = !group.collapsed;

        if (this.onGroupToggle)
        {
            this.onGroupToggle({ ...group }, group.collapsed);
        }

        console.log(
            LOG_PREFIX, "Group toggled:", id,
            group.collapsed ? "collapsed" : "expanded"
        );

        this.render();
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

        console.log(LOG_PREFIX, "All groups collapsed");

        this.render();
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

        console.log(LOG_PREFIX, "All groups expanded");

        this.render();
    }

    // -- Viewport API --

    /**
     * Sets a new time viewport and re-renders.
     */
    public setViewport(start: Date, end: Date): void
    {
        this.opts.start = new Date(start);
        this.opts.end = new Date(end);

        if (this.onViewportChange)
        {
            this.onViewportChange(
                new Date(this.opts.start),
                new Date(this.opts.end)
            );
        }

        console.log(LOG_PREFIX, "Viewport changed");

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
        }

        console.log(LOG_PREFIX, disabled ? "Disabled" : "Enabled");
    }

    // -- Timezone API --

    /**
     * Changes the display timezone and re-renders all labels.
     */
    public setTimezone(tz: string): void
    {
        if (!isValidTimezone(tz))
        {
            console.warn(LOG_PREFIX, "Invalid timezone:", tz);
            return;
        }

        const previous = this.timezone;
        this.timezone = tz;

        this.rebuildFormatters();

        if (this.onTimezoneChange && previous !== tz)
        {
            this.onTimezoneChange(tz);
        }

        console.log(LOG_PREFIX, "Timezone changed to:", tz);

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

        console.log(LOG_PREFIX, "Tick interval changed to:", interval);

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

        // Clear existing content
        this.rootEl.innerHTML = "";

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
        this.headerEl = header;
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
        dropdown.appendChild(list);

        const allTimezones = getIANATimezones();

        this.populateTimezoneList(list, allTimezones, "");

        search.addEventListener("input", () =>
        {
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

    /**
     * Returns groups sorted by their order property.
     */
    private getSortedGroups(): TimelineGroup[]
    {
        return Array.from(this.groups.values()).sort(
            (a, b) => (a.order ?? 0) - (b.order ?? 0)
        );
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
export function createTimeline(options: TimelineOptions): Timeline
{
    return new Timeline(options);
}

// -- Global Exports --
// Make available on window for non-module consumers.
if (typeof window !== "undefined")
{
    (window as any)["Timeline"] = Timeline;
    (window as any)["createTimeline"] = createTimeline;
}
