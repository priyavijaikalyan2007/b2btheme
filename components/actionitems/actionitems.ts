/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: ActionItems
 * 📜 PURPOSE: A rich, stateful action item list with status lifecycle tracking,
 *    person assignments, priority badges, due dates, comment slots, tags,
 *    hierarchical numbering, inline editing, section-based grouping,
 *    drag-and-drop reordering, nesting, keyboard navigation, multi-select,
 *    bulk operations, faceted filtering, sorting, clipboard, and export.
 *    Phases 1 (Core), 2 (Rich Features), 3 (Interactions), and
 *    4 (Filtering, Sorting, Export) of the spec.
 * 🔗 RELATES: [[PersonChip]], [[Pill]], [[EnterpriseTheme]]
 * ⚡ FLOW: [Consumer] -> [createActionItems()] -> [ActionItemsHandle]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// S1: TYPES, INTERFACES, AND CONSTANTS
// ============================================================================

/** Log prefix for all console messages from this component. */
const LOG_PREFIX = "[ActionItems]";

const _lu = (typeof (window as any).createLogUtility === "function") ? (window as any).createLogUtility().getLogger(LOG_PREFIX.slice(1, -1)) : null;
function logInfo(...a: unknown[]): void { _lu ? _lu.info(...a) : console.log(new Date().toISOString(), "[INFO]", LOG_PREFIX, ...a); }
function logWarn(...a: unknown[]): void { _lu ? _lu.warn(...a) : console.warn(new Date().toISOString(), "[WARN]", LOG_PREFIX, ...a); }
function logError(...a: unknown[]): void { _lu ? _lu.error(...a) : console.error(new Date().toISOString(), "[ERROR]", LOG_PREFIX, ...a); }
function logDebug(...a: unknown[]): void { _lu ? _lu.debug(...a) : console.debug(new Date().toISOString(), "[DEBUG]", LOG_PREFIX, ...a); }
function logTrace(...a: unknown[]): void { _lu ? _lu.trace(...a) : console.debug(new Date().toISOString(), "[TRACE]", LOG_PREFIX, ...a); }

/** CSS class root prefix for all component selectors. */
const CLS = "actionitems";

/** Ordered status values for cycling. */
const STATUS_CYCLE: ActionItemStatus[] = ["not-started", "in-progress", "done"];

/** Status display labels. */
const STATUS_LABELS: Record<ActionItemStatus, string> =
{
    "not-started": "Not Started",
    "in-progress": "In Progress",
    "done": "Done",
    "archived": "Archived",
};

/** Status icons rendered as text in the status indicator button. */
const STATUS_ICONS: Record<ActionItemStatus, string> =
{
    "not-started": "\u2B21",
    "in-progress": "\u25D0",
    "done": "\u2713",
    "archived": "\u2298",
};

/** Priority display labels. */
const PRIORITY_LABELS: Record<ActionItemPriority, string> =
{
    "high": "High",
    "medium": "Medium",
    "low": "Low",
};

/** Millisecond thresholds for relative time formatting. */
const MS_MINUTE = 60_000;
const MS_HOUR = 3_600_000;
const MS_DAY = 86_400_000;

/** Sort option display labels for the sort dropdown. */
const SORT_LABELS: Record<SortOption, string> =
{
    "order": "Manual order",
    "created-asc": "Created (oldest)",
    "created-desc": "Created (newest)",
    "modified": "Last modified",
    "priority-desc": "Priority (high first)",
    "priority-asc": "Priority (low first)",
    "due-date-asc": "Due date (soonest)",
    "due-date-desc": "Due date (latest)",
    "assignee-asc": "Assignee (A-Z)",
    "assignee-desc": "Assignee (Z-A)",
};

/** Next monotonic index counter — shared across all instances. */
let nextGlobalIndex = 1;

// ============================================================================
// S2: PUBLIC TYPES
// ============================================================================

/** A person reference for assignments and attribution. */
export interface ActionItemPerson
{
    /** Unique person identifier. */
    id: string;

    /** Display name. */
    name: string;

    /** Avatar URL (optional). */
    avatarUrl?: string;
}

/** Priority levels for action items. */
export type ActionItemPriority = "high" | "medium" | "low";

/** Lifecycle states for action items. */
export type ActionItemStatus = "not-started" | "in-progress" | "done" | "archived";

/** A tag/label attached to an action item. */
export interface ActionItemTag
{
    /** Tag identifier. */
    id: string;

    /** Display label. */
    label: string;

    /** Tag colour (used by the Pill component or fallback span). */
    color?: string;
}

/** A single action item with full metadata. */
export interface ActionItem
{
    /** Unique immutable identifier. */
    id: string;

    /** Monotonically increasing creation index (immutable). */
    index: number;

    /** Display order within the list. Mutable via drag-and-drop. */
    order: number;

    /** The action item text content. */
    content: string;

    /** Current lifecycle state. */
    status: ActionItemStatus;

    /** Optional priority level. */
    priority?: ActionItemPriority;

    /** Optional due date (ISO 8601 date string). */
    dueDate?: string;

    /** Currently assigned person (undefined = unassigned). */
    assignee?: ActionItemPerson;

    /** Tags/labels attached to this item. */
    tags: ActionItemTag[];

    /** Parent item ID for nesting. Undefined = top-level. */
    parentId?: string;

    /** ISO 8601 creation timestamp. */
    createdAt: string;

    /** ISO 8601 last modification timestamp. */
    updatedAt: string;

    /** Person who last modified this item. */
    updatedBy?: ActionItemPerson;

    /** Person who created this item. */
    createdBy?: ActionItemPerson;

    /** Number of comments on this item. */
    commentCount: number;
}

/** Sort option for the list. */
export type SortOption =
    | "order"
    | "created-asc"
    | "created-desc"
    | "modified"
    | "priority-desc"
    | "priority-asc"
    | "due-date-asc"
    | "due-date-desc"
    | "assignee-asc"
    | "assignee-desc";

/** Filter specification for faceted filtering. */
export interface ActionItemFilter
{
    /** Filter by status values. */
    statuses?: ActionItemStatus[];

    /** Filter by assignee IDs. Empty string = unassigned. */
    assigneeIds?: string[];

    /** Filter by priority values. */
    priorities?: (ActionItemPriority | "none")[];

    /** Filter by due date facets. */
    dueDateFacets?: ("overdue" | "today" | "this-week" | "no-date")[];

    /** Filter by tag IDs. */
    tagIds?: string[];
}

/** Full configuration for the ActionItems component. */
export interface ActionItemsOptions
{
    /** Container element or ID string. */
    container: string | HTMLElement;

    /** Initial items to render. */
    items?: ActionItem[];

    /** Display mode. Default: "full". */
    mode?: "full" | "compact";

    /** Group items by status with section headers. Default: true. */
    groupByStatus?: boolean;

    /** Show priority badges. Default: true. */
    showPriority?: boolean;

    /** Show due date display. Default: true. */
    showDueDates?: boolean;

    /** Show comment count badge and comment slot. Default: true. */
    showComments?: boolean;

    /** Show tags/labels on items. Default: true. */
    showTags?: boolean;

    /** Allow sub-item nesting. Default: true. */
    allowNesting?: boolean;

    /** Allow inline creation of new items. Default: true. */
    allowCreate?: boolean;

    /** Default sort. Default: "order". */
    defaultSort?: SortOption;

    /** Placeholder text for new items. */
    placeholder?: string;

    /** Message for empty state. */
    emptyMessage?: string;

    // ── Event callbacks ──

    /** Fired when a new item is created. */
    onItemCreate?: (item: ActionItem) => void;

    /** Fired when any item property changes. */
    onItemUpdate?: (itemId: string, changes: Partial<ActionItem>) => void;

    /** Fired when an item is deleted. */
    onItemDelete?: (itemId: string) => void;

    /** Fired when an item's status changes. */
    onStatusChange?: (
        itemId: string,
        oldStatus: ActionItemStatus,
        newStatus: ActionItemStatus
    ) => void;

    /** Fired when the user edits item content. */
    onContentEdit?: (itemId: string, newContent: string) => void;

    /** Fired when the comment slot for an item is toggled. */
    onCommentToggle?: (itemId: string, expanded: boolean) => void;

    /** Fired to render comments into the comment slot. */
    onRenderCommentSlot?: (itemId: string, container: HTMLElement) => void;

    /** Fired when the user clicks the assignee chip to request assignment. */
    onAssignmentRequest?: (
        itemId: string,
        currentAssignee?: ActionItemPerson
    ) => void;

    /** Fired when priority changes. */
    onPriorityChange?: (itemId: string, priority?: ActionItemPriority) => void;

    /** Fired when due date changes. */
    onDueDateChange?: (itemId: string, dueDate?: string) => void;

    /** Fired on selection changes. */
    onSelectionChange?: (selectedIds: string[]) => void;

    /** Fired on tag change (add/remove). */
    onTagChange?: (itemId: string, tags: ActionItemTag[]) => void;

    // ── Phase 3 callbacks ──

    /** Fired when an item is reordered via drag-and-drop. */
    onItemReorder?: (
        itemId: string,
        newOrder: number,
        newParentId?: string
    ) => void;

    /** Fired on bulk status change. */
    onBulkStatusChange?: (
        itemIds: string[],
        newStatus: ActionItemStatus
    ) => void;

    /** Fired on bulk delete request. */
    onBulkDelete?: (itemIds: string[]) => void;

    /** Fired on bulk assign request. */
    onBulkAssign?: (
        itemIds: string[],
        currentAssignee?: ActionItemPerson
    ) => void;

    // ── Phase 4 callbacks ──

    /** Fired on export request. */
    onExport?: (
        format: "json" | "markdown",
        items: ActionItem[]
    ) => void;

    /** Allow drag-and-drop reordering. Default: true. */
    allowReorder?: boolean;
}

/** Public API handle returned by the factory function. */
export interface ActionItemsHandle
{
    /** Add a new item to the list. */
    addItem(item: Partial<ActionItem>): ActionItem;

    /** Remove an item by ID. */
    removeItem(itemId: string): void;

    /** Update an item's properties. */
    updateItem(itemId: string, changes: Partial<ActionItem>): void;

    /** Set the assignee for an item. */
    setAssignee(itemId: string, person?: ActionItemPerson): void;

    /** Set the comment count for an item. */
    setCommentCount(itemId: string, count: number): void;

    /** Get all items. */
    getItems(): ActionItem[];

    /** Get a single item by ID. */
    getItem(itemId: string): ActionItem | null;

    /** Get items filtered by status. */
    getItemsByStatus(status: ActionItemStatus): ActionItem[];

    /** Get selected item IDs. */
    getSelectedIds(): string[];

    /** Set selection programmatically. */
    setSelection(ids: string[]): void;

    /** Clear selection. */
    clearSelection(): void;

    /** Expand or collapse a status section. */
    toggleSection(status: ActionItemStatus, expanded: boolean): void;

    /** Apply a filter. */
    setFilter(filter: ActionItemFilter): void;

    /** Clear all filters. */
    clearFilters(): void;

    /** Set the sort order. */
    setSort(sort: SortOption): void;

    /** Export items in the specified format. */
    export(format: "json" | "markdown"): string;

    /** Import items from markdown checklist format. */
    importMarkdown(markdown: string): ActionItem[];

    /** Scroll to a specific item. */
    scrollToItem(itemId: string): void;

    /** Get the root DOM element. */
    getElement(): HTMLElement;

    /** Destroy the component and clean up. */
    destroy(): void;
}

// ============================================================================
// S3: DOM HELPERS
// ============================================================================

/**
 * Creates an HTML element with optional CSS classes and text content.
 * Uses textContent exclusively for XSS safety.
 *
 * @param tag - HTML tag name
 * @param classes - Array of CSS class names
 * @param text - Optional text content
 * @returns The created element
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
 * Sets an attribute on an HTML element.
 *
 * @param el - Target element
 * @param name - Attribute name
 * @param value - Attribute value
 */
function setAttr(el: HTMLElement, name: string, value: string): void
{
    el.setAttribute(name, value);
}

/**
 * Removes an attribute from an HTML element.
 *
 * @param el - Target element
 * @param name - Attribute name
 */
function removeAttr(el: HTMLElement, name: string): void
{
    el.removeAttribute(name);
}

// ============================================================================
// S4: UTILITY FUNCTIONS
// ============================================================================

/**
 * Generates a unique identifier for new action items.
 *
 * @returns A unique string ID
 */
function generateId(): string
{
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);

    return `ai-${timestamp}-${random}`;
}

/**
 * Returns the current ISO 8601 timestamp.
 *
 * @returns ISO 8601 date string
 */
function nowISO(): string
{
    return new Date().toISOString();
}

/**
 * Formats a date as a relative time string.
 * Returns "just now", "5 min ago", "2 hours ago", "yesterday", or "Mar 14".
 *
 * @param isoDate - ISO 8601 date string
 * @returns Human-readable relative time
 */
function formatRelativeTime(isoDate: string): string
{
    const date = new Date(isoDate);
    const now = Date.now();
    const diff = now - date.getTime();

    if (diff < MS_MINUTE)
    {
        return "just now";
    }

    if (diff < MS_HOUR)
    {
        const minutes = Math.floor(diff / MS_MINUTE);
        return `${minutes} min ago`;
    }

    if (diff < MS_DAY)
    {
        const hours = Math.floor(diff / MS_HOUR);
        return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    }

    if (diff < (MS_DAY * 2))
    {
        return "yesterday";
    }

    return formatShortDate(date);
}

/**
 * Formats a date as "Mon DD" (e.g. "Mar 14").
 *
 * @param date - Date object to format
 * @returns Short date string
 */
function formatShortDate(date: Date): string
{
    const months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];

    return `${months[date.getMonth()]} ${date.getDate()}`;
}

/**
 * Formats a due date for display with "Due" prefix.
 *
 * @param isoDate - ISO 8601 date string
 * @returns Formatted due date string like "Due Mar 20"
 */
function formatDueDate(isoDate: string): string
{
    const date = new Date(isoDate);

    return `Due ${formatShortDate(date)}`;
}

/**
 * Determines whether a due date is overdue (before today).
 *
 * @param isoDate - ISO 8601 date string
 * @returns True if the date is in the past
 */
function isOverdue(isoDate: string): boolean
{
    const dueDate = new Date(isoDate);
    const today = new Date();

    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);

    return dueDate.getTime() < today.getTime();
}

/**
 * Determines whether a due date is today.
 *
 * @param isoDate - ISO 8601 date string
 * @returns True if the date is today
 */
function isDueToday(isoDate: string): boolean
{
    const dueDate = new Date(isoDate);
    const today = new Date();

    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);

    return dueDate.getTime() === today.getTime();
}

/**
 * Determines whether a due date falls within the current week.
 *
 * @param isoDate - ISO 8601 date string
 * @returns True if the date is within this week
 */
function isDueThisWeek(isoDate: string): boolean
{
    const dueDate = new Date(isoDate);
    const today = new Date();

    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);

    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    return (dueDate.getTime() >= startOfWeek.getTime()) &&
        (dueDate.getTime() <= endOfWeek.getTime());
}

/**
 * Calculates a fractional order value between two items.
 * Used for drag-and-drop insertion without renumbering.
 *
 * @param before - Order of the item before the insertion point
 * @param after - Order of the item after the insertion point
 * @returns Fractional order value between the two
 */
function fractionalOrder(before: number, after: number): number
{
    return (before + after) / 2;
}

/**
 * Returns the next available order value for inserting at the end of a list.
 * Finds the maximum order among provided items and adds 1.
 *
 * @param items - Array of items with order values
 * @returns Next order value
 */
function getNextOrder(items: ActionItem[]): number
{
    if (items.length === 0)
    {
        return 1;
    }

    const maxOrder = Math.max(...items.map(i => i.order));

    return maxOrder + 1;
}

/**
 * Sorts items by the specified sort option.
 *
 * @param items - Items to sort (sorted in-place)
 * @param sort - Sort option key
 * @returns The sorted array (same reference)
 */
function sortItems(items: ActionItem[], sort: SortOption): ActionItem[]
{
    const comparators: Record<SortOption, (a: ActionItem, b: ActionItem) => number> =
    {
        "order": (a, b) => a.order - b.order,
        "created-asc": (a, b) => a.createdAt.localeCompare(b.createdAt),
        "created-desc": (a, b) => b.createdAt.localeCompare(a.createdAt),
        "modified": (a, b) => b.updatedAt.localeCompare(a.updatedAt),
        "priority-desc": (a, b) => priorityWeight(b) - priorityWeight(a),
        "priority-asc": (a, b) => priorityWeight(a) - priorityWeight(b),
        "due-date-asc": (a, b) => compareDueDate(a, b, true),
        "due-date-desc": (a, b) => compareDueDate(a, b, false),
        "assignee-asc": (a, b) => compareAssignee(a, b, true),
        "assignee-desc": (a, b) => compareAssignee(a, b, false),
    };

    items.sort(comparators[sort]);

    return items;
}

/**
 * Returns a numeric weight for priority sorting.
 * Higher weight = higher priority.
 *
 * @param item - Action item to evaluate
 * @returns Numeric weight
 */
function priorityWeight(item: ActionItem): number
{
    if (!item.priority)
    {
        return 0;
    }

    const weights: Record<ActionItemPriority, number> =
    {
        "high": 3,
        "medium": 2,
        "low": 1,
    };

    return weights[item.priority];
}

/**
 * Compares two items by due date for sorting.
 *
 * @param a - First item
 * @param b - Second item
 * @param ascending - Sort direction
 * @returns Comparison result
 */
function compareDueDate(
    a: ActionItem, b: ActionItem, ascending: boolean
): number
{
    if (!a.dueDate && !b.dueDate)
    {
        return 0;
    }

    if (!a.dueDate)
    {
        return 1;
    }

    if (!b.dueDate)
    {
        return -1;
    }

    const result = a.dueDate.localeCompare(b.dueDate);

    return ascending ? result : -result;
}

/**
 * Compares two items by assignee name for sorting.
 *
 * @param a - First item
 * @param b - Second item
 * @param ascending - Sort direction
 * @returns Comparison result
 */
function compareAssignee(
    a: ActionItem, b: ActionItem, ascending: boolean
): number
{
    const nameA = a.assignee?.name ?? "";
    const nameB = b.assignee?.name ?? "";
    const result = nameA.localeCompare(nameB);

    return ascending ? result : -result;
}

/**
 * Builds a complete ActionItem from partial data, filling in defaults.
 *
 * @param partial - Partial item data from the consumer
 * @param existingItems - Existing items for order calculation
 * @returns Complete ActionItem
 */
function buildItemFromPartial(
    partial: Partial<ActionItem>,
    existingItems: ActionItem[]
): ActionItem
{
    const now = nowISO();

    return {
        id: partial.id ?? generateId(),
        index: partial.index ?? nextGlobalIndex++,
        order: partial.order ?? getNextOrder(existingItems),
        content: partial.content ?? "",
        status: partial.status ?? "not-started",
        priority: partial.priority,
        dueDate: partial.dueDate,
        assignee: partial.assignee,
        tags: partial.tags ?? [],
        parentId: partial.parentId,
        createdAt: partial.createdAt ?? now,
        updatedAt: partial.updatedAt ?? now,
        updatedBy: partial.updatedBy,
        createdBy: partial.createdBy,
        commentCount: partial.commentCount ?? 0,
    };
}

// ============================================================================
// S4B: FILTER MATCHING
// ============================================================================

/**
 * Checks whether an item matches the active filter criteria.
 * All specified facets must match (AND logic across facet groups).
 *
 * @param item - Action item to test
 * @param filter - Active filter specification
 * @returns True if the item passes all filters
 */
function matchesFilter(
    item: ActionItem,
    filter: ActionItemFilter
): boolean
{
    if (!matchesStatusFilter(item, filter))
    {
        return false;
    }

    if (!matchesPriorityFilter(item, filter))
    {
        return false;
    }

    if (!matchesAssigneeFilter(item, filter))
    {
        return false;
    }

    return matchesDueDateFilter(item, filter) &&
        matchesTagFilter(item, filter);
}

/**
 * Checks the status facet of the filter.
 *
 * @param item - Item to test
 * @param filter - Active filter
 * @returns True if status matches or no status filter is set
 */
function matchesStatusFilter(
    item: ActionItem,
    filter: ActionItemFilter
): boolean
{
    if (!filter.statuses || filter.statuses.length === 0)
    {
        return true;
    }

    return filter.statuses.includes(item.status);
}

/**
 * Checks the priority facet of the filter.
 *
 * @param item - Item to test
 * @param filter - Active filter
 * @returns True if priority matches or no priority filter is set
 */
function matchesPriorityFilter(
    item: ActionItem,
    filter: ActionItemFilter
): boolean
{
    if (!filter.priorities || filter.priorities.length === 0)
    {
        return true;
    }

    const itemPriority = item.priority ?? "none";

    return filter.priorities.includes(itemPriority);
}

/**
 * Checks the assignee facet of the filter.
 *
 * @param item - Item to test
 * @param filter - Active filter
 * @returns True if assignee matches or no assignee filter is set
 */
function matchesAssigneeFilter(
    item: ActionItem,
    filter: ActionItemFilter
): boolean
{
    if (!filter.assigneeIds || filter.assigneeIds.length === 0)
    {
        return true;
    }

    const itemAssigneeId = item.assignee?.id ?? "";

    return filter.assigneeIds.includes(itemAssigneeId);
}

/**
 * Checks the due date facet of the filter.
 *
 * @param item - Item to test
 * @param filter - Active filter
 * @returns True if due date matches or no due date filter is set
 */
function matchesDueDateFilter(
    item: ActionItem,
    filter: ActionItemFilter
): boolean
{
    if (!filter.dueDateFacets || filter.dueDateFacets.length === 0)
    {
        return true;
    }

    return filter.dueDateFacets.some(facet =>
        matchesSingleDueDateFacet(item, facet)
    );
}

/**
 * Tests a single due date facet against an item.
 *
 * @param item - Item to test
 * @param facet - Due date facet to match
 * @returns True if the item matches the facet
 */
function matchesSingleDueDateFacet(
    item: ActionItem,
    facet: "overdue" | "today" | "this-week" | "no-date"
): boolean
{
    if (facet === "no-date")
    {
        return !item.dueDate;
    }

    if (!item.dueDate)
    {
        return false;
    }

    if (facet === "overdue")
    {
        return isOverdue(item.dueDate);
    }

    if (facet === "today")
    {
        return isDueToday(item.dueDate);
    }

    return isDueThisWeek(item.dueDate);
}

/**
 * Checks the tag facet of the filter.
 *
 * @param item - Item to test
 * @param filter - Active filter
 * @returns True if tags match or no tag filter is set
 */
function matchesTagFilter(
    item: ActionItem,
    filter: ActionItemFilter
): boolean
{
    if (!filter.tagIds || filter.tagIds.length === 0)
    {
        return true;
    }

    const itemTagIds = new Set(item.tags.map(t => t.id));

    return filter.tagIds.some(tagId => itemTagIds.has(tagId));
}

// ============================================================================
// S4C: MARKDOWN PARSING AND SERIALISATION
// ============================================================================

/**
 * Parses a markdown checklist string into partial action item data.
 * Format: `- [ ] text @assignee #priority`
 *
 * @param markdown - Markdown string to parse
 * @returns Array of partial items with content, status, priority, depth
 */
function parseMarkdownChecklist(
    markdown: string
): Array<{ content: string; status: ActionItemStatus; priority?: ActionItemPriority; depth: number; assigneeHint?: string }>
{
    const lines = markdown.split("\n");
    const result: Array<{
        content: string;
        status: ActionItemStatus;
        priority?: ActionItemPriority;
        depth: number;
        assigneeHint?: string;
    }> = [];

    for (const line of lines)
    {
        const parsed = parseMarkdownLine(line);

        if (parsed)
        {
            result.push(parsed);
        }
    }

    return result;
}

/**
 * Parses a single markdown checklist line.
 *
 * @param line - A single line of markdown
 * @returns Parsed data or null if not a checklist item
 */
function parseMarkdownLine(
    line: string
): { content: string; status: ActionItemStatus; priority?: ActionItemPriority; depth: number; assigneeHint?: string } | null
{
    const match = line.match(/^(\s*)- \[([ xX])\]\s+(.+)$/);

    if (!match)
    {
        return null;
    }

    const indent = match[1].length;
    const checked = match[2].toLowerCase() === "x";
    let text = match[3].trim();

    const result: {
        content: string;
        status: ActionItemStatus;
        priority?: ActionItemPriority;
        depth: number;
        assigneeHint?: string;
    } = {
        content: text,
        status: checked ? "done" : "not-started",
        depth: Math.floor(indent / 2),
    };

    result.priority = extractPriorityFromText(text);
    result.assigneeHint = extractAssigneeFromText(text);
    result.content = stripMarkdownMetadata(text);

    return result;
}

/**
 * Extracts a priority hint from markdown text.
 * Matches #high, #medium, #low.
 *
 * @param text - Checklist item text
 * @returns Priority if found, undefined otherwise
 */
function extractPriorityFromText(
    text: string
): ActionItemPriority | undefined
{
    const priorityMatch = text.match(/#(high|medium|low)\b/);

    if (priorityMatch)
    {
        return priorityMatch[1] as ActionItemPriority;
    }

    return undefined;
}

/**
 * Extracts an assignee hint from markdown text.
 * Matches @Name patterns.
 *
 * @param text - Checklist item text
 * @returns Assignee name if found, undefined otherwise
 */
function extractAssigneeFromText(text: string): string | undefined
{
    const assigneeMatch = text.match(/@(\w+)/);

    if (assigneeMatch)
    {
        return assigneeMatch[1];
    }

    return undefined;
}

/**
 * Strips @assignee and #priority tags from text.
 *
 * @param text - Checklist item text with metadata
 * @returns Clean text without metadata tags
 */
function stripMarkdownMetadata(text: string): string
{
    return text
        .replace(/@\w+/g, "")
        .replace(/#(high|medium|low)\b/g, "")
        .trim();
}

/**
 * Serialises an action item to a markdown checklist line.
 *
 * @param item - Item to serialise
 * @param indent - Indentation level
 * @returns Markdown checklist line
 */
function itemToMarkdownLine(
    item: ActionItem, indent: number
): string
{
    const spaces = "  ".repeat(indent);
    const check = item.status === "done" ? "x" : " ";
    let line = `${spaces}- [${check}] ${item.content}`;

    if (item.assignee)
    {
        line += ` @${item.assignee.name.replace(/\s+/g, "")}`;
    }

    if (item.priority)
    {
        line += ` #${item.priority}`;
    }

    return line;
}

/**
 * Computes the visible flat order of items for range selection.
 * Returns item IDs in their current display order.
 *
 * @param items - All items in the component
 * @param sort - Current sort option
 * @returns Array of item IDs in display order
 */
function getDisplayOrder(
    items: ActionItem[], sort: SortOption
): string[]
{
    const nonArchived: ActionItemStatus[] = [
        "not-started", "in-progress", "done",
    ];
    const tree = buildNumberedTree(items, nonArchived, sort);
    const flat = flattenNumberedTree(tree);

    return flat.map(n => n.item.id);
}

// ============================================================================
// S5: NUMBERING
// ============================================================================

/**
 * Hierarchical display number for an item (e.g. "1", "1.1", "1.1.2").
 * Calculated from the item's position among its siblings and ancestors.
 */
interface NumberedItem
{
    /** The item data. */
    item: ActionItem;

    /** Display number string, e.g. "1.2.3". */
    number: string;

    /** Nesting depth (0 = top-level). */
    depth: number;

    /** Child items with numbering. */
    children: NumberedItem[];
}

/**
 * Builds a numbered tree of items from a flat list.
 * Only includes items matching the given statuses.
 *
 * @param items - Flat array of all items
 * @param statuses - Status values to include
 * @param sort - Sort option
 * @returns Array of top-level numbered items with nested children
 */
function buildNumberedTree(
    items: ActionItem[],
    statuses: ActionItemStatus[],
    sort: SortOption
): NumberedItem[]
{
    const statusSet = new Set(statuses);
    const filtered = items.filter(i => statusSet.has(i.status));
    const sorted = sortItems([...filtered], sort);

    return buildTreeLevel(sorted, undefined, "", 0);
}

/**
 * Recursively builds one level of the numbered tree.
 *
 * @param allItems - All filtered and sorted items
 * @param parentId - Parent ID (undefined for top-level)
 * @param prefix - Numbering prefix (e.g. "1." for children of item 1)
 * @param depth - Current nesting depth
 * @returns Array of numbered items at this level
 */
function buildTreeLevel(
    allItems: ActionItem[],
    parentId: string | undefined,
    prefix: string,
    depth: number
): NumberedItem[]
{
    const siblings = allItems.filter(i => i.parentId === parentId);
    const result: NumberedItem[] = [];

    for (let i = 0; i < siblings.length; i++)
    {
        const num = `${prefix}${i + 1}`;
        const children = buildTreeLevel(allItems, siblings[i].id, `${num}.`, depth + 1);

        result.push({
            item: siblings[i],
            number: num,
            depth,
            children,
        });
    }

    return result;
}

/**
 * Flattens a numbered tree into a linear list for rendering.
 * Preserves depth information for indentation.
 *
 * @param tree - Nested numbered items
 * @returns Flat array in render order
 */
function flattenNumberedTree(tree: NumberedItem[]): NumberedItem[]
{
    const result: NumberedItem[] = [];

    for (const node of tree)
    {
        result.push(node);

        if (node.children.length > 0)
        {
            result.push(...flattenNumberedTree(node.children));
        }
    }

    return result;
}

// ============================================================================
// S6: PERSONCHIP AND PILL INTEGRATION
// ============================================================================

/**
 * Window type augmentation for optional component integrations.
 * PersonChip and Pill may be loaded as separate IIFE scripts.
 */
interface PersonChipFactory
{
    (options: {
        name: string;
        avatarUrl?: string;
        size?: string;
        clickable?: boolean;
    }): { getElement(): HTMLElement };
}

interface PillFactory
{
    (options: {
        label: string;
        color?: string;
        background?: string;
        foreground?: string;
    }): { getElement(): HTMLElement };
}

/**
 * Renders an assignee element — uses PersonChip if available, falls back to
 * a simple span element.
 *
 * @param assignee - Person data or undefined for unassigned
 * @param onClick - Click handler for assignment request
 * @returns DOM element representing the assignee
 */
function renderAssigneeChip(
    assignee: ActionItemPerson | undefined,
    onClick?: () => void
): HTMLElement
{
    const factory = (window as unknown as Record<string, unknown>)
        .createPersonChip as PersonChipFactory | undefined;

    if (factory && assignee)
    {
        return renderPersonChipIntegration(factory, assignee, onClick);
    }

    return renderAssigneeFallback(assignee, onClick);
}

/**
 * Renders an assignee using the PersonChip component integration.
 *
 * @param factory - PersonChip factory function from window global
 * @param assignee - Person data
 * @param onClick - Click handler
 * @returns PersonChip DOM element
 */
function renderPersonChipIntegration(
    factory: PersonChipFactory,
    assignee: ActionItemPerson,
    onClick?: () => void
): HTMLElement
{
    const chip = factory({
        name: assignee.name,
        avatarUrl: assignee.avatarUrl,
        size: "sm",
        clickable: true,
    });

    const el = chip.getElement();

    el.classList.add(`${CLS}-assignee`);

    if (onClick)
    {
        el.addEventListener("click", (e: Event) =>
        {
            e.stopPropagation();
            onClick();
        });
    }

    return el;
}

/**
 * Renders a simple span fallback for the assignee when PersonChip
 * is not available.
 *
 * @param assignee - Person data or undefined
 * @param onClick - Click handler
 * @returns Span element
 */
function renderAssigneeFallback(
    assignee: ActionItemPerson | undefined,
    onClick?: () => void
): HTMLElement
{
    const text = assignee ? assignee.name : "unassigned";
    const el = createElement("span", [`${CLS}-assignee`], text);

    if (!assignee)
    {
        el.classList.add(`${CLS}-assignee-ghost`);
    }

    setAttr(el, "role", "button");
    setAttr(el, "tabindex", "0");
    setAttr(el, "title", assignee ? `Assigned to ${assignee.name}` : "Click to assign");

    if (onClick)
    {
        el.addEventListener("click", (e: Event) =>
        {
            e.stopPropagation();
            onClick();
        });
    }

    return el;
}

/**
 * Renders a tag element — uses Pill if available, falls back to a coloured span.
 *
 * @param tag - Tag data
 * @returns DOM element representing the tag
 */
function renderTagElement(tag: ActionItemTag): HTMLElement
{
    const factory = (window as unknown as Record<string, unknown>)
        .createPill as PillFactory | undefined;

    if (factory)
    {
        return renderPillIntegration(factory, tag);
    }

    return renderTagFallback(tag);
}

/**
 * Renders a tag using the Pill component integration.
 *
 * @param factory - Pill factory function from window global
 * @param tag - Tag data
 * @returns Pill DOM element
 */
function renderPillIntegration(
    factory: PillFactory,
    tag: ActionItemTag
): HTMLElement
{
    const pill = factory({
        label: tag.label,
        color: tag.color,
    });

    const el = pill.getElement();

    el.classList.add(`${CLS}-tag`);

    return el;
}

/**
 * Renders a simple span fallback for a tag when Pill is not available.
 *
 * @param tag - Tag data
 * @returns Span element styled as a tag
 */
function renderTagFallback(tag: ActionItemTag): HTMLElement
{
    const el = createElement("span", [`${CLS}-tag`], tag.label);

    if (tag.color)
    {
        el.style.backgroundColor = tag.color;
        el.style.color = "#fff";
    }

    return el;
}

// ============================================================================
// S7: ACTIONITEMS CLASS
// ============================================================================

/**
 * Main ActionItems component class.
 * Manages state, rendering, and user interactions for the action item list.
 */
export class ActionItems
{
    /** Component configuration. */
    private readonly options: Required<
        Pick<ActionItemsOptions, "mode" | "groupByStatus" | "showPriority" |
            "showDueDates" | "showComments" | "showTags" | "allowNesting" |
            "allowCreate" | "allowReorder" | "defaultSort" | "placeholder" |
            "emptyMessage">
    > & ActionItemsOptions;

    /** All action items managed by this instance. */
    private items: ActionItem[] = [];

    /** Root DOM element. */
    private rootEl: HTMLElement | null = null;

    /** Container element provided by the consumer. */
    private containerEl: HTMLElement | null = null;

    /** Collapsed status sections. */
    private collapsedSections: Set<ActionItemStatus> = new Set();

    /** Whether archived items are visible. */
    private showArchived = false;

    /** Currently expanded comment slot item IDs. */
    private expandedComments: Set<string> = new Set();

    /** Currently selected item IDs. */
    private selectedIds: Set<string> = new Set();

    /** Current sort option. */
    private currentSort: SortOption;

    /** Map of item ID to editing state — stores original content for cancel. */
    private editingItems: Map<string, string> = new Map();

    /** Active filter specification. Null when no filter is applied. */
    private activeFilter: ActionItemFilter | null = null;

    /** Currently focused item ID for keyboard navigation. */
    private focusedItemId: string | null = null;

    /** Last selected item ID for Shift+click range selection. */
    private lastSelectedId: string | null = null;

    /** Drag-and-drop state tracking. */
    private dragState: {
        itemId: string;
        cloneEl: HTMLElement | null;
        startX: number;
        startY: number;
        active: boolean;
    } | null = null;

    /** Whether the filter panel is currently open. */
    private filterPanelOpen = false;

    /** Whether the sort dropdown is currently open. */
    private sortDropdownOpen = false;

    /** Bound event handler references for cleanup. */
    private boundHandlers: Array<{
        el: EventTarget;
        event: string;
        handler: EventListener;
    }> = [];

    /** Whether the component has been destroyed. */
    private destroyed = false;

    /**
     * Creates a new ActionItems instance.
     *
     * @param opts - Component configuration
     */
    constructor(opts: ActionItemsOptions)
    {
        this.options = {
            mode: "full",
            groupByStatus: true,
            showPriority: true,
            showDueDates: true,
            showComments: true,
            showTags: true,
            allowNesting: true,
            allowCreate: true,
            allowReorder: true,
            defaultSort: "order",
            placeholder: "Add action item...",
            emptyMessage: "No action items yet. Click the button below to add one.",
            ...opts,
        };

        this.currentSort = this.options.defaultSort;
        this.containerEl = this.resolveContainer(opts.container);

        if (!this.containerEl)
        {
            return;
        }

        this.initializeItems(opts.items ?? []);
        this.render();

        logInfo("Initialised with", this.items.length, "items");
    }

    // ========================================================================
    // S7.1: INITIALISATION
    // ========================================================================

    /**
     * Resolves the container from a string ID or HTMLElement reference.
     *
     * @param container - Container ID or element
     * @returns Resolved element or null
     */
    private resolveContainer(
        container: string | HTMLElement
    ): HTMLElement | null
    {
        if (typeof container === "string")
        {
            const el = document.getElementById(container);

            if (!el)
            {
                logError("Container not found:", container);
                return null;
            }

            return el;
        }

        return container;
    }

    /**
     * Initialises the items array from provided data.
     * Assigns monotonic index values and validates required fields.
     *
     * @param initialItems - Items provided in options
     */
    private initializeItems(initialItems: ActionItem[]): void
    {
        this.items = initialItems.map(item => ({
            ...item,
            tags: item.tags ?? [],
            commentCount: item.commentCount ?? 0,
        }));

        this.updateGlobalIndex();
    }

    /**
     * Updates the global index counter based on existing items.
     * Ensures new items receive a higher index than any existing item.
     */
    private updateGlobalIndex(): void
    {
        if (this.items.length === 0)
        {
            return;
        }

        const maxIndex = Math.max(...this.items.map(i => i.index));

        if (maxIndex >= nextGlobalIndex)
        {
            nextGlobalIndex = maxIndex + 1;
        }
    }

    // ========================================================================
    // S7.2: FULL RENDER
    // ========================================================================

    /**
     * Renders the entire component from scratch.
     * Called on initialisation and after significant state changes.
     */
    private render(): void
    {
        if (this.destroyed || !this.containerEl)
        {
            return;
        }

        this.cleanup();

        this.rootEl = createElement("div", [CLS]);
        setAttr(this.rootEl, "role", "list");
        setAttr(this.rootEl, "aria-label", "Action items");
        setAttr(this.rootEl, "tabindex", "0");

        if (this.options.mode === "compact")
        {
            this.rootEl.classList.add(`${CLS}-compact`);
        }

        this.renderHeader();
        this.renderFilterChips();
        this.renderBulkToolbar();
        this.renderBody();
        this.renderFooter();

        this.containerEl.innerHTML = "";
        this.containerEl.appendChild(this.rootEl);

        this.attachGlobalKeyHandler();
    }

    /**
     * Removes all bound event handlers and clears internal references.
     * Called before re-render and on destroy.
     */
    private cleanup(): void
    {
        for (const binding of this.boundHandlers)
        {
            binding.el.removeEventListener(binding.event, binding.handler);
        }

        this.boundHandlers = [];
    }

    // ========================================================================
    // S7.3: HEADER RENDERING
    // ========================================================================

    /**
     * Renders the component header with title and total item count.
     */
    private renderHeader(): void
    {
        if (!this.rootEl)
        {
            return;
        }

        const visibleCount = this.getVisibleItemCount();
        const header = createElement("div", [`${CLS}-header`]);

        const titleEl = createElement("div", [`${CLS}-header-title`]);
        const titleText = createElement("span", [`${CLS}-title-text`], "Action Items");
        const countBadge = createElement("span", [`${CLS}-count`], `(${visibleCount})`);

        titleEl.appendChild(titleText);
        titleEl.appendChild(countBadge);
        header.appendChild(titleEl);

        if (this.options.mode === "full")
        {
            const controls = this.renderHeaderControls();
            header.appendChild(controls);
        }

        this.rootEl.appendChild(header);
    }

    /**
     * Renders the filter and sort controls in the header.
     *
     * @returns Controls container element
     */
    private renderHeaderControls(): HTMLElement
    {
        const controls = createElement("div", [`${CLS}-header-controls`]);

        const filterBtn = this.renderFilterButton();
        controls.appendChild(filterBtn);

        const sortBtn = this.renderSortButton();
        controls.appendChild(sortBtn);

        return controls;
    }

    /**
     * Renders the filter toggle button in the header.
     *
     * @returns Filter button element
     */
    private renderFilterButton(): HTMLElement
    {
        const hasActive = this.activeFilter !== null;
        const classes = [`${CLS}-header-btn`];

        if (hasActive)
        {
            classes.push(`${CLS}-header-btn-active`);
        }

        const btn = createElement("button", classes, "Filter \u25BE");
        setAttr(btn, "type", "button");
        setAttr(btn, "aria-label", "Toggle filter panel");
        setAttr(btn, "aria-expanded", String(this.filterPanelOpen));

        const handler = (e: Event) =>
        {
            e.stopPropagation();
            this.toggleFilterPanel();
        };

        btn.addEventListener("click", handler);
        this.trackHandler(btn, "click", handler);

        if (this.filterPanelOpen)
        {
            const panel = this.renderFilterPanel();
            btn.style.position = "relative";
            btn.appendChild(panel);
        }

        return btn;
    }

    /**
     * Renders the sort dropdown button in the header.
     *
     * @returns Sort button element
     */
    private renderSortButton(): HTMLElement
    {
        const label = SORT_LABELS[this.currentSort] ?? "Sort";
        const btn = createElement(
            "button",
            [`${CLS}-header-btn`],
            `${label} \u25BE`
        );

        setAttr(btn, "type", "button");
        setAttr(btn, "aria-label", "Change sort order");
        setAttr(btn, "aria-expanded", String(this.sortDropdownOpen));

        const handler = (e: Event) =>
        {
            e.stopPropagation();
            this.toggleSortDropdown();
        };

        btn.addEventListener("click", handler);
        this.trackHandler(btn, "click", handler);

        if (this.sortDropdownOpen)
        {
            const dropdown = this.renderSortDropdown();
            btn.style.position = "relative";
            btn.appendChild(dropdown);
        }

        return btn;
    }

    /**
     * Returns the count of non-archived items for the header badge.
     *
     * @returns Number of visible items
     */
    private getVisibleItemCount(): number
    {
        return this.items.filter(i => i.status !== "archived").length;
    }

    // ========================================================================
    // S7.4: BODY RENDERING
    // ========================================================================

    /**
     * Renders the main body — either grouped by status or as a flat list.
     */
    private renderBody(): void
    {
        if (!this.rootEl)
        {
            return;
        }

        const body = createElement("div", [`${CLS}-body`]);

        if (this.items.length === 0)
        {
            body.appendChild(this.renderEmptyState());
        }
        else
        {
            this.populateBodyContent(body);
        }

        this.rootEl.appendChild(body);
    }

    /**
     * Populates the body with items in the appropriate layout mode.
     *
     * @param body - Body container element
     */
    private populateBodyContent(body: HTMLElement): void
    {
        if (this.options.mode === "compact")
        {
            this.renderCompactList(body);
            return;
        }

        if (this.options.groupByStatus)
        {
            this.renderGroupedSections(body);
        }
        else
        {
            this.renderFlatList(body);
        }

        this.renderArchivedToggle(body);
    }

    /**
     * Returns items that pass the current active filter.
     * If no filter is set, returns the full items array.
     *
     * @returns Filtered items array
     */
    private getFilteredItems(): ActionItem[]
    {
        if (!this.activeFilter)
        {
            return this.items;
        }

        return this.items.filter(item =>
            matchesFilter(item, this.activeFilter!)
        );
    }

    /**
     * Renders the empty state message when no items exist.
     *
     * @returns Empty state container element
     */
    private renderEmptyState(): HTMLElement
    {
        const empty = createElement(
            "div",
            [`${CLS}-empty`],
            this.options.emptyMessage
        );

        setAttr(empty, "role", "status");

        return empty;
    }

    /**
     * Renders items grouped by status in collapsible sections.
     * Sections: Not Started, In Progress, Done.
     *
     * @param body - Body container element
     */
    private renderGroupedSections(body: HTMLElement): void
    {
        const statusOrder: ActionItemStatus[] = [
            "not-started", "in-progress", "done",
        ];

        for (const status of statusOrder)
        {
            this.renderStatusSection(body, status);
        }
    }

    /**
     * Renders a single status section with header and item list.
     *
     * @param body - Body container element
     * @param status - Status to render
     */
    private renderStatusSection(
        body: HTMLElement,
        status: ActionItemStatus
    ): void
    {
        const filtered = this.getFilteredItems();
        const tree = buildNumberedTree(filtered, [status], this.currentSort);
        const flatItems = flattenNumberedTree(tree);

        if (flatItems.length === 0)
        {
            return;
        }

        const section = createElement("div", [`${CLS}-section`]);
        setAttr(section, "data-status", status);

        const collapsed = this.collapsedSections.has(status);
        const sectionHeader = this.renderSectionHeader(status, flatItems.length, collapsed);

        section.appendChild(sectionHeader);

        if (!collapsed)
        {
            const itemList = this.renderItemList(flatItems);
            section.appendChild(itemList);
        }

        body.appendChild(section);
    }

    /**
     * Renders a section header with chevron, status label, and item count.
     *
     * @param status - Status for this section
     * @param count - Number of items in the section
     * @param collapsed - Whether the section is collapsed
     * @returns Section header element
     */
    private renderSectionHeader(
        status: ActionItemStatus,
        count: number,
        collapsed: boolean
    ): HTMLElement
    {
        const header = createElement("div", [`${CLS}-section-header`]);
        const chevron = collapsed ? "\u25B6" : "\u25BC";
        const label = `${chevron} ${STATUS_LABELS[status]} (${count})`;

        header.textContent = label;
        setAttr(header, "role", "button");
        setAttr(header, "tabindex", "0");
        setAttr(header, "aria-expanded", String(!collapsed));

        const handler = () =>
        {
            this.toggleSectionState(status);
        };

        header.addEventListener("click", handler);
        this.trackHandler(header, "click", handler);

        return header;
    }

    /**
     * Toggles the collapsed state of a status section and re-renders.
     *
     * @param status - Status section to toggle
     */
    private toggleSectionState(status: ActionItemStatus): void
    {
        if (this.collapsedSections.has(status))
        {
            this.collapsedSections.delete(status);
        }
        else
        {
            this.collapsedSections.add(status);
        }

        this.render();
    }

    /**
     * Renders items as a flat unsectioned list.
     *
     * @param body - Body container element
     */
    private renderFlatList(body: HTMLElement): void
    {
        const nonArchived: ActionItemStatus[] = [
            "not-started", "in-progress", "done",
        ];
        const filtered = this.getFilteredItems();
        const tree = buildNumberedTree(filtered, nonArchived, this.currentSort);
        const flatItems = flattenNumberedTree(tree);
        const itemList = this.renderItemList(flatItems);

        body.appendChild(itemList);
    }

    /**
     * Renders items in compact mode — no grouping, no metadata, no sub-items.
     *
     * @param body - Body container element
     */
    private renderCompactList(body: HTMLElement): void
    {
        const nonArchived: ActionItemStatus[] = [
            "not-started", "in-progress", "done",
        ];
        const allItems = this.getFilteredItems();
        const filtered = allItems.filter(i =>
            nonArchived.includes(i.status) && !i.parentId
        );
        const sorted = sortItems([...filtered], this.currentSort);

        const list = createElement("div", [`${CLS}-list`, `${CLS}-compact`]);

        for (const item of sorted)
        {
            list.appendChild(this.renderCompactItem(item));
        }

        body.appendChild(list);
    }

    /**
     * Renders a single item in compact mode — status + assignee + content only.
     *
     * @param item - Action item data
     * @returns Compact item element
     */
    private renderCompactItem(item: ActionItem): HTMLElement
    {
        const row = createElement("div", [`${CLS}-item`, `${CLS}-item-compact`]);
        setAttr(row, "data-id", item.id);

        const statusBtn = this.renderStatusIndicator(item);
        row.appendChild(statusBtn);

        const chipEl = renderAssigneeChip(
            item.assignee,
            () => this.handleAssignmentRequest(item)
        );
        row.appendChild(chipEl);

        const contentEl = this.renderContentText(item);
        row.appendChild(contentEl);

        return row;
    }

    // ========================================================================
    // S7.5: ITEM LIST RENDERING
    // ========================================================================

    /**
     * Renders a list container with all provided numbered items.
     *
     * @param numberedItems - Flat array of numbered items in render order
     * @returns List container element
     */
    private renderItemList(numberedItems: NumberedItem[]): HTMLElement
    {
        const list = createElement("div", [`${CLS}-list`]);

        for (const numbered of numberedItems)
        {
            const itemEl = this.renderFullItem(numbered);
            list.appendChild(itemEl);
        }

        return list;
    }

    /**
     * Renders a single item in full mode with all metadata and features.
     *
     * @param numbered - Numbered item with display number and depth
     * @returns Complete item element
     */
    private renderFullItem(numbered: NumberedItem): HTMLElement
    {
        const item = numbered.item;
        const row = createElement("div", [`${CLS}-item`]);

        this.applyItemAttributes(row, numbered);
        this.buildItemMainRow(row, numbered);
        this.buildItemMetaRow(row, item);
        this.buildItemTagsRow(row, item);
        this.buildCommentSlot(row, item);
        this.attachItemClickHandler(row, item.id);

        return row;
    }

    /**
     * Sets data attributes, ARIA attributes, and depth-based styles on an item row.
     *
     * @param row - Item row element
     * @param numbered - Numbered item data with depth info
     */
    private applyItemAttributes(
        row: HTMLElement, numbered: NumberedItem
    ): void
    {
        setAttr(row, "data-id", numbered.item.id);
        setAttr(row, "role", "listitem");
        setAttr(row, "aria-level", String(numbered.depth + 1));
        setAttr(row, "tabindex", "-1");

        if (numbered.depth > 0)
        {
            row.classList.add(`${CLS}-sub-item`);
            row.style.paddingLeft = `${numbered.depth * 24}px`;
        }

        if (this.selectedIds.has(numbered.item.id))
        {
            row.classList.add(`${CLS}-selected`);
            row.classList.add(`${CLS}-item-selected`);
        }

        if (this.focusedItemId === numbered.item.id)
        {
            row.classList.add(`${CLS}-item-focused`);
        }
    }

    /**
     * Attaches a click handler to an item row for selection.
     *
     * @param row - Item row element
     * @param itemId - ID of the item
     */
    private attachItemClickHandler(
        row: HTMLElement, itemId: string
    ): void
    {
        const clickHandler = (e: Event) =>
        {
            this.handleItemClick(itemId, e as MouseEvent);
        };

        row.addEventListener("click", clickHandler);
        this.trackHandler(row, "click", clickHandler);
    }

    /**
     * Builds the main row of an item — status, number, assignee, content, priority.
     *
     * @param row - Parent row element
     * @param numbered - Numbered item data
     */
    private buildItemMainRow(
        row: HTMLElement,
        numbered: NumberedItem
    ): void
    {
        const item = numbered.item;
        const mainRow = createElement("div", [`${CLS}-main-row`]);

        if (this.options.allowReorder)
        {
            const dragHandle = this.renderDragHandle(item.id);
            mainRow.appendChild(dragHandle);
        }

        const statusBtn = this.renderStatusIndicator(item);
        mainRow.appendChild(statusBtn);

        const numberEl = createElement(
            "span",
            [`${CLS}-number`],
            `${numbered.number}.`
        );
        mainRow.appendChild(numberEl);

        const chipEl = renderAssigneeChip(
            item.assignee,
            () => this.handleAssignmentRequest(item)
        );
        mainRow.appendChild(chipEl);

        const contentEl = this.renderContentText(item);
        mainRow.appendChild(contentEl);

        if (this.options.showPriority && item.priority)
        {
            const priorityBadge = this.renderPriorityBadge(item.priority);
            mainRow.appendChild(priorityBadge);
        }

        row.appendChild(mainRow);
    }

    /**
     * Renders a drag handle (grip dots) for an item.
     *
     * @param itemId - ID of the item
     * @returns Drag handle element
     */
    private renderDragHandle(itemId: string): HTMLElement
    {
        const handle = createElement(
            "span",
            [`${CLS}-drag-handle`],
            "\u2807"
        );

        setAttr(handle, "role", "button");
        setAttr(handle, "tabindex", "-1");
        setAttr(handle, "aria-label", "Drag to reorder");
        setAttr(handle, "title", "Drag to reorder");
        setAttr(handle, "draggable", "true");

        this.attachDragHandlers(handle, itemId);

        return handle;
    }

    /**
     * Attaches drag event handlers to a drag handle element.
     *
     * @param handle - Drag handle DOM element
     * @param itemId - ID of the item being dragged
     */
    private attachDragHandlers(
        handle: HTMLElement, itemId: string
    ): void
    {
        const pointerdownHandler = (e: Event) =>
        {
            e.stopPropagation();
            this.startDrag(itemId, e as PointerEvent);
        };

        handle.addEventListener("pointerdown", pointerdownHandler);
        this.trackHandler(handle, "pointerdown", pointerdownHandler);
    }

    /**
     * Builds the metadata row — attribution, timestamp, due date.
     *
     * @param row - Parent row element
     * @param item - Action item data
     */
    private buildItemMetaRow(
        row: HTMLElement, item: ActionItem
    ): void
    {
        if (this.options.mode === "compact")
        {
            return;
        }

        const meta = createElement("div", [`${CLS}-meta`]);
        const parts: string[] = [];

        this.addAttributionPart(parts, item);
        this.addTimePart(parts, item);
        this.addDueDatePart(meta, parts, item);

        meta.textContent = "";

        const textNode = document.createTextNode(parts.join(" \u00B7 "));
        meta.appendChild(textNode);

        if (this.options.showDueDates && item.dueDate)
        {
            this.appendDueDateSpan(meta, item.dueDate);
        }

        row.appendChild(meta);
    }

    /**
     * Adds the attribution part to the metadata line.
     *
     * @param parts - Array of metadata string parts
     * @param item - Action item data
     */
    private addAttributionPart(
        parts: string[], item: ActionItem
    ): void
    {
        if (item.updatedBy && item.updatedAt !== item.createdAt)
        {
            parts.push(`Edited by ${item.updatedBy.name}`);
        }
        else if (item.createdBy)
        {
            parts.push(`Created by ${item.createdBy.name}`);
        }
    }

    /**
     * Adds the relative time part to the metadata line.
     *
     * @param parts - Array of metadata string parts
     * @param item - Action item data
     */
    private addTimePart(parts: string[], item: ActionItem): void
    {
        const timeStr = formatRelativeTime(item.updatedAt);
        parts.push(timeStr);
    }

    /**
     * Adds the due date text to the metadata parts array.
     * The actual styled span is appended separately.
     *
     * @param _meta - Meta container (unused in this method)
     * @param parts - Array of metadata string parts
     * @param item - Action item data
     */
    private addDueDatePart(
        _meta: HTMLElement, parts: string[], item: ActionItem
    ): void
    {
        if (!this.options.showDueDates || !item.dueDate)
        {
            return;
        }

        // Due date is rendered as a separate coloured span, not in the text join
    }

    /**
     * Appends a styled due date span to the metadata element.
     * Applies overdue (red) or due-today (amber) styling.
     *
     * @param meta - Meta container element
     * @param dueDateStr - ISO 8601 due date string
     */
    private appendDueDateSpan(
        meta: HTMLElement, dueDateStr: string
    ): void
    {
        const separator = document.createTextNode(" \u00B7 ");
        meta.appendChild(separator);

        const dueDateEl = createElement(
            "span",
            [`${CLS}-due-date`],
            formatDueDate(dueDateStr)
        );

        if (isOverdue(dueDateStr))
        {
            dueDateEl.classList.add(`${CLS}-overdue`);
        }
        else if (isDueToday(dueDateStr))
        {
            dueDateEl.classList.add(`${CLS}-due-today`);
        }

        meta.appendChild(dueDateEl);
    }

    /**
     * Builds the tags row if tags are present and enabled.
     *
     * @param row - Parent row element
     * @param item - Action item data
     */
    private buildItemTagsRow(
        row: HTMLElement, item: ActionItem
    ): void
    {
        if (!this.options.showTags || item.tags.length === 0)
        {
            return;
        }

        if (this.options.mode === "compact")
        {
            return;
        }

        const tagsRow = createElement("div", [`${CLS}-tags`]);

        for (const tag of item.tags)
        {
            tagsRow.appendChild(renderTagElement(tag));
        }

        this.appendCommentBadge(tagsRow, item);
        row.appendChild(tagsRow);
    }

    /**
     * Appends a comment count badge to the tags row if comments exist.
     *
     * @param container - Container to append to
     * @param item - Action item data
     */
    private appendCommentBadge(
        container: HTMLElement, item: ActionItem
    ): void
    {
        if (!this.options.showComments || item.commentCount <= 0)
        {
            return;
        }

        const badge = createElement(
            "span",
            [`${CLS}-comment-badge`],
            `\uD83D\uDCAC ${item.commentCount}`
        );

        setAttr(badge, "role", "button");
        setAttr(badge, "tabindex", "0");
        setAttr(badge, "title", `${item.commentCount} comment${item.commentCount > 1 ? "s" : ""}`);

        const handler = (e: Event) =>
        {
            e.stopPropagation();
            this.toggleCommentSlot(item.id);
        };

        badge.addEventListener("click", handler);
        this.trackHandler(badge, "click", handler);

        container.appendChild(badge);
    }

    /**
     * Builds the collapsible comment slot for an item.
     *
     * @param row - Parent row element
     * @param item - Action item data
     */
    private buildCommentSlot(
        row: HTMLElement, item: ActionItem
    ): void
    {
        if (!this.options.showComments || this.options.mode === "compact")
        {
            return;
        }

        this.renderStandaloneBadge(row, item);
        this.renderExpandedCommentSlot(row, item);
    }

    /**
     * Renders a standalone comment badge when no tags row exists.
     *
     * @param row - Parent row element
     * @param item - Action item data
     */
    private renderStandaloneBadge(
        row: HTMLElement, item: ActionItem
    ): void
    {
        if (item.tags.length === 0 && item.commentCount > 0)
        {
            const badgeRow = createElement("div", [`${CLS}-tags`]);
            this.appendCommentBadge(badgeRow, item);
            row.appendChild(badgeRow);
        }
    }

    /**
     * Renders the expanded comment slot container if comments are expanded.
     *
     * @param row - Parent row element
     * @param item - Action item data
     */
    private renderExpandedCommentSlot(
        row: HTMLElement, item: ActionItem
    ): void
    {
        if (!this.expandedComments.has(item.id))
        {
            return;
        }

        const slot = createElement("div", [`${CLS}-comments`]);
        setAttr(slot, "data-comment-slot", item.id);

        if (this.options.onRenderCommentSlot)
        {
            this.options.onRenderCommentSlot(item.id, slot);
        }

        row.appendChild(slot);
    }

    // ========================================================================
    // S7.6: STATUS INDICATOR
    // ========================================================================

    /**
     * Renders the status indicator button for an item.
     * Clicking cycles through statuses.
     *
     * @param item - Action item data
     * @returns Status indicator button element
     */
    private renderStatusIndicator(item: ActionItem): HTMLElement
    {
        const btn = createElement(
            "button",
            [`${CLS}-status-indicator`, `${CLS}-status-${item.status}`],
            STATUS_ICONS[item.status]
        );

        setAttr(btn, "type", "button");
        setAttr(btn, "role", "checkbox");
        setAttr(btn, "aria-checked", item.status === "done" ? "true" : "false");
        setAttr(btn, "aria-label", `Status: ${STATUS_LABELS[item.status]}`);
        setAttr(btn, "title", `Click to change status (current: ${STATUS_LABELS[item.status]})`);

        const handler = (e: Event) =>
        {
            e.stopPropagation();
            this.cycleItemStatus(item.id);
        };

        btn.addEventListener("click", handler);
        this.trackHandler(btn, "click", handler);

        return btn;
    }

    /**
     * Cycles an item's status through the standard progression.
     * not-started -> in-progress -> done -> not-started
     *
     * @param itemId - ID of the item to cycle
     */
    private cycleItemStatus(itemId: string): void
    {
        const item = this.findItem(itemId);

        if (!item)
        {
            return;
        }

        const currentIndex = STATUS_CYCLE.indexOf(item.status);
        const nextIndex = (currentIndex + 1) % STATUS_CYCLE.length;
        const oldStatus = item.status;
        const newStatus = STATUS_CYCLE[nextIndex];

        item.status = newStatus;
        item.updatedAt = nowISO();

        this.fireStatusChange(itemId, oldStatus, newStatus);
        this.render();
    }

    // ========================================================================
    // S7.7: CONTENT AND INLINE EDITING
    // ========================================================================

    /**
     * Renders the content text of an item. Click to enter edit mode.
     *
     * @param item - Action item data
     * @returns Content element (span or input)
     */
    private renderContentText(item: ActionItem): HTMLElement
    {
        if (this.editingItems.has(item.id))
        {
            return this.renderEditInput(item);
        }

        const contentEl = this.buildContentSpan(item);
        this.attachContentClickHandler(contentEl, item.id);

        return contentEl;
    }

    /**
     * Builds a content span element with appropriate styling classes.
     *
     * @param item - Action item data
     * @returns Styled span element
     */
    private buildContentSpan(item: ActionItem): HTMLElement
    {
        const contentEl = createElement(
            "span",
            [`${CLS}-content`],
            item.content || this.options.placeholder
        );

        if (!item.content)
        {
            contentEl.classList.add(`${CLS}-placeholder`);
        }

        if (item.status === "done")
        {
            contentEl.classList.add(`${CLS}-done-text`);
        }

        return contentEl;
    }

    /**
     * Attaches a click handler to a content span to enter edit mode.
     *
     * @param contentEl - Content span element
     * @param itemId - ID of the item
     */
    private attachContentClickHandler(
        contentEl: HTMLElement, itemId: string
    ): void
    {
        const handler = (e: Event) =>
        {
            e.stopPropagation();
            this.enterEditMode(itemId);
        };

        contentEl.addEventListener("click", handler);
        this.trackHandler(contentEl, "click", handler);
    }

    /**
     * Renders an input field for inline editing of item content.
     *
     * @param item - Action item being edited
     * @returns Input element
     */
    private renderEditInput(item: ActionItem): HTMLElement
    {
        const input = document.createElement("input");

        input.type = "text";
        input.value = item.content;
        input.classList.add(`${CLS}-edit-input`);
        setAttr(input, "aria-label", "Edit action item content");

        this.attachEditHandlers(input, item);

        // Auto-focus the input after it is added to the DOM
        requestAnimationFrame(() =>
        {
            input.focus();
            input.setSelectionRange(input.value.length, input.value.length);
        });

        return input;
    }

    /**
     * Attaches blur, keydown, and keyup handlers to an edit input.
     *
     * @param input - Input element
     * @param item - Action item being edited
     */
    private attachEditHandlers(
        input: HTMLInputElement, item: ActionItem
    ): void
    {
        const blurHandler = () =>
        {
            this.commitEdit(item.id, input.value);
        };

        const keydownHandler = (e: Event) =>
        {
            this.handleEditKeydown(e as KeyboardEvent, item.id, input);
        };

        input.addEventListener("blur", blurHandler);
        input.addEventListener("keydown", keydownHandler);

        this.trackHandler(input, "blur", blurHandler);
        this.trackHandler(input, "keydown", keydownHandler);
    }

    /**
     * Handles keyboard events during inline editing.
     *
     * @param e - Keyboard event
     * @param itemId - ID of the item being edited
     * @param input - Input element
     */
    private handleEditKeydown(
        e: KeyboardEvent, itemId: string, input: HTMLInputElement
    ): void
    {
        if (e.key === "Enter")
        {
            e.preventDefault();
            this.commitEdit(itemId, input.value);

            if (input.value.trim() !== "")
            {
                this.createNewItemAfter(itemId);
            }
        }
        else if (e.key === "Escape")
        {
            e.preventDefault();
            this.cancelEdit(itemId);
        }
        else if (e.key === "Tab" && !e.shiftKey)
        {
            const item = this.findItem(itemId);

            if (item && this.isLastItemInSection(item))
            {
                e.preventDefault();
                this.commitEdit(itemId, input.value);
                this.createNewItemAfter(itemId);
            }
        }
    }

    /**
     * Enters edit mode for an item, storing the original content for cancel.
     *
     * @param itemId - ID of the item to edit
     */
    private enterEditMode(itemId: string): void
    {
        const item = this.findItem(itemId);

        if (!item)
        {
            return;
        }

        this.editingItems.set(itemId, item.content);
        this.render();
    }

    /**
     * Commits an edit, updating the item's content and firing callbacks.
     *
     * @param itemId - ID of the edited item
     * @param newContent - New content value from the input
     */
    private commitEdit(itemId: string, newContent: string): void
    {
        if (!this.editingItems.has(itemId))
        {
            return;
        }

        const originalContent = this.editingItems.get(itemId) ?? "";

        this.editingItems.delete(itemId);

        const item = this.findItem(itemId);

        if (item)
        {
            this.applyContentChange(item, itemId, newContent.trim(), originalContent);
        }

        if (newContent.trim() === "" && originalContent === "")
        {
            this.removeEmptyItemOnBlur(itemId);
        }

        this.render();
    }

    /**
     * Applies a content change to an item if the value differs from original.
     *
     * @param item - Item to update
     * @param itemId - Item ID for callbacks
     * @param trimmed - Trimmed new content
     * @param original - Original content before editing
     */
    private applyContentChange(
        item: ActionItem, itemId: string,
        trimmed: string, original: string
    ): void
    {
        if (trimmed === original)
        {
            return;
        }

        item.content = trimmed;
        item.updatedAt = nowISO();

        this.fireContentEdit(itemId, trimmed);
        this.fireItemUpdate(itemId, { content: trimmed });
    }

    /**
     * Cancels an edit, reverting to the original content.
     *
     * @param itemId - ID of the item to cancel editing for
     */
    private cancelEdit(itemId: string): void
    {
        this.editingItems.delete(itemId);
        this.render();
    }

    // ========================================================================
    // S7.8: PRIORITY BADGE
    // ========================================================================

    /**
     * Renders a priority badge with coloured dot and label text.
     *
     * @param priority - Priority level
     * @returns Priority badge element
     */
    private renderPriorityBadge(
        priority: ActionItemPriority
    ): HTMLElement
    {
        const badge = createElement("span", [`${CLS}-priority`, `${CLS}-priority-${priority}`]);

        const dot = createElement("span", [`${CLS}-priority-dot`]);
        badge.appendChild(dot);

        const label = createElement("span", [], PRIORITY_LABELS[priority]);
        badge.appendChild(label);

        return badge;
    }

    // ========================================================================
    // S7.9: FOOTER AND ADD BUTTON
    // ========================================================================

    /**
     * Renders the component footer with the "Add action item" button
     * and the archived items toggle.
     */
    private renderFooter(): void
    {
        if (!this.rootEl || !this.options.allowCreate)
        {
            return;
        }

        const footer = createElement("div", [`${CLS}-footer`]);
        const addBtn = this.renderAddButton();

        footer.appendChild(addBtn);
        this.rootEl.appendChild(footer);
    }

    /**
     * Renders the "+ Add action item" button at the bottom of the list.
     *
     * @returns Add button element
     */
    private renderAddButton(): HTMLElement
    {
        const btn = createElement(
            "button",
            [`${CLS}-add`],
            `+ ${this.options.placeholder}`
        );

        setAttr(btn, "type", "button");
        setAttr(btn, "aria-label", "Add new action item");

        const handler = () =>
        {
            this.createNewItem();
        };

        btn.addEventListener("click", handler);
        this.trackHandler(btn, "click", handler);

        return btn;
    }

    /**
     * Renders the archived items toggle at the bottom of the body.
     * Only shows if there are archived items.
     *
     * @param body - Body container element
     */
    private renderArchivedToggle(body: HTMLElement): void
    {
        const archivedItems = this.items.filter(i => i.status === "archived");

        if (archivedItems.length === 0)
        {
            return;
        }

        const toggle = this.buildArchivedToggleButton(archivedItems.length);

        body.appendChild(toggle);

        if (this.showArchived)
        {
            this.renderArchivedSection(body, archivedItems);
        }
    }

    /**
     * Creates the archived items toggle button element.
     *
     * @param count - Number of archived items
     * @returns Toggle button element
     */
    private buildArchivedToggleButton(count: number): HTMLElement
    {
        const plural = count > 1 ? "s" : "";
        const prefix = this.showArchived ? "Hide" : "Show";
        const label = `${prefix} ${count} archived item${plural}`;

        const toggle = createElement("button", [`${CLS}-archived-toggle`], label);
        setAttr(toggle, "type", "button");

        const handler = () =>
        {
            this.showArchived = !this.showArchived;
            this.render();
        };

        toggle.addEventListener("click", handler);
        this.trackHandler(toggle, "click", handler);

        return toggle;
    }

    /**
     * Renders the archived items section when the toggle is expanded.
     *
     * @param body - Body container element
     * @param archivedItems - Array of archived items
     */
    private renderArchivedSection(
        body: HTMLElement,
        archivedItems: ActionItem[]
    ): void
    {
        const tree = buildNumberedTree(
            archivedItems.map((item, index) => ({ ...item, status: "archived" as ActionItemStatus, order: index })),
            ["archived"],
            this.currentSort
        );
        const flatItems = flattenNumberedTree(tree);
        const section = createElement("div", [`${CLS}-section`, `${CLS}-section-archived`]);

        for (const numbered of flatItems)
        {
            section.appendChild(this.renderFullItem(numbered));
        }

        body.appendChild(section);
    }

    // ========================================================================
    // S7.10: COMMENT SLOT
    // ========================================================================

    /**
     * Toggles the comment slot for an item.
     *
     * @param itemId - ID of the item to toggle comments for
     */
    private toggleCommentSlot(itemId: string): void
    {
        const wasExpanded = this.expandedComments.has(itemId);

        if (wasExpanded)
        {
            this.expandedComments.delete(itemId);
        }
        else
        {
            this.expandedComments.add(itemId);
        }

        this.fireCommentToggle(itemId, !wasExpanded);
        this.render();
    }

    // ========================================================================
    // S7.11: ITEM CREATION
    // ========================================================================

    /**
     * Creates a new action item with default values and enters edit mode.
     *
     * @returns The newly created item
     */
    private createNewItem(): ActionItem
    {
        const now = nowISO();
        const newItem: ActionItem =
        {
            id: generateId(),
            index: nextGlobalIndex++,
            order: getNextOrder(this.items),
            content: "",
            status: "not-started",
            tags: [],
            createdAt: now,
            updatedAt: now,
            commentCount: 0,
        };

        this.items.push(newItem);
        this.editingItems.set(newItem.id, "");
        this.fireItemCreate(newItem);
        this.render();

        logInfo("Created new item:", newItem.id);

        return newItem;
    }

    /**
     * Creates a new item positioned after the specified item.
     *
     * @param afterItemId - ID of the item after which to insert
     * @returns The newly created item
     */
    private createNewItemAfter(afterItemId: string): ActionItem
    {
        const afterItem = this.findItem(afterItemId);
        const now = nowISO();

        const newItem: ActionItem =
        {
            id: generateId(),
            index: nextGlobalIndex++,
            order: afterItem ? afterItem.order + 0.5 : getNextOrder(this.items),
            content: "",
            status: afterItem?.status ?? "not-started",
            parentId: afterItem?.parentId,
            tags: [],
            createdAt: now,
            updatedAt: now,
            commentCount: 0,
        };

        this.items.push(newItem);
        this.editingItems.set(newItem.id, "");
        this.fireItemCreate(newItem);
        this.render();

        return newItem;
    }

    // ========================================================================
    // S7.12: ITEM SELECTION
    // ========================================================================

    /**
     * Handles click events on an item row for selection.
     *
     * @param itemId - ID of the clicked item
     * @param e - Mouse event
     */
    private handleItemClick(itemId: string, e: MouseEvent): void
    {
        const target = e.target as HTMLElement;

        if (this.isInteractiveTarget(target))
        {
            return;
        }

        this.focusedItemId = itemId;

        if (e.shiftKey && this.lastSelectedId)
        {
            this.selectRange(this.lastSelectedId, itemId);
        }
        else if (e.ctrlKey || e.metaKey)
        {
            this.toggleSelection(itemId);
        }
        else
        {
            this.setSelectionSingle(itemId);
        }

        this.lastSelectedId = itemId;
    }

    /**
     * Selects a range of items between two IDs based on display order.
     *
     * @param fromId - Starting item ID
     * @param toId - Ending item ID
     */
    private selectRange(fromId: string, toId: string): void
    {
        const order = getDisplayOrder(
            this.getFilteredItems(), this.currentSort
        );
        const fromIdx = order.indexOf(fromId);
        const toIdx = order.indexOf(toId);

        if (fromIdx < 0 || toIdx < 0)
        {
            return;
        }

        const start = Math.min(fromIdx, toIdx);
        const end = Math.max(fromIdx, toIdx);

        this.selectedIds.clear();

        for (let i = start; i <= end; i++)
        {
            this.selectedIds.add(order[i]);
        }

        this.fireSelectionChange();
        this.render();
    }

    /**
     * Checks if a click target is an interactive element that handles its own events.
     *
     * @param target - Element that was clicked
     * @returns True if the target is interactive
     */
    private isInteractiveTarget(target: HTMLElement): boolean
    {
        const interactiveClasses = [
            `${CLS}-status-indicator`,
            `${CLS}-assignee`,
            `${CLS}-content`,
            `${CLS}-edit-input`,
            `${CLS}-comment-badge`,
        ];

        return interactiveClasses.some(cls => target.classList.contains(cls));
    }

    /**
     * Toggles selection of a single item (for Ctrl+Click).
     *
     * @param itemId - ID of the item to toggle
     */
    private toggleSelection(itemId: string): void
    {
        if (this.selectedIds.has(itemId))
        {
            this.selectedIds.delete(itemId);
        }
        else
        {
            this.selectedIds.add(itemId);
        }

        this.fireSelectionChange();
        this.render();
    }

    /**
     * Sets selection to a single item (for regular click).
     *
     * @param itemId - ID of the item to select
     */
    private setSelectionSingle(itemId: string): void
    {
        this.selectedIds.clear();
        this.selectedIds.add(itemId);

        this.fireSelectionChange();
        this.render();
    }

    // ========================================================================
    // S7.13: ASSIGNMENT HANDLING
    // ========================================================================

    /**
     * Handles an assignment request by firing the callback.
     *
     * @param item - Action item requesting assignment change
     */
    private handleAssignmentRequest(item: ActionItem): void
    {
        if (this.options.onAssignmentRequest)
        {
            this.options.onAssignmentRequest(item.id, item.assignee);
        }
    }

    // ========================================================================
    // S7.14: EVENT FIRING
    // ========================================================================

    /**
     * Fires the onItemCreate callback.
     *
     * @param item - Newly created item
     */
    private fireItemCreate(item: ActionItem): void
    {
        if (this.options.onItemCreate)
        {
            this.options.onItemCreate(item);
        }
    }

    /**
     * Fires the onItemUpdate callback.
     *
     * @param itemId - Updated item ID
     * @param changes - Changed properties
     */
    private fireItemUpdate(
        itemId: string, changes: Partial<ActionItem>
    ): void
    {
        if (this.options.onItemUpdate)
        {
            this.options.onItemUpdate(itemId, changes);
        }
    }

    /**
     * Fires the onItemDelete callback.
     *
     * @param itemId - Deleted item ID
     */
    private fireItemDelete(itemId: string): void
    {
        if (this.options.onItemDelete)
        {
            this.options.onItemDelete(itemId);
        }
    }

    /**
     * Fires the onStatusChange callback.
     *
     * @param itemId - Item whose status changed
     * @param oldStatus - Previous status
     * @param newStatus - New status
     */
    private fireStatusChange(
        itemId: string,
        oldStatus: ActionItemStatus,
        newStatus: ActionItemStatus
    ): void
    {
        if (this.options.onStatusChange)
        {
            this.options.onStatusChange(itemId, oldStatus, newStatus);
        }
    }

    /**
     * Fires the onContentEdit callback.
     *
     * @param itemId - Item whose content was edited
     * @param newContent - Updated content string
     */
    private fireContentEdit(itemId: string, newContent: string): void
    {
        if (this.options.onContentEdit)
        {
            this.options.onContentEdit(itemId, newContent);
        }
    }

    /**
     * Fires the onCommentToggle callback.
     *
     * @param itemId - Item whose comment slot was toggled
     * @param expanded - Whether the slot is now expanded
     */
    private fireCommentToggle(itemId: string, expanded: boolean): void
    {
        if (this.options.onCommentToggle)
        {
            this.options.onCommentToggle(itemId, expanded);
        }
    }

    /**
     * Fires the onSelectionChange callback.
     */
    private fireSelectionChange(): void
    {
        if (this.options.onSelectionChange)
        {
            this.options.onSelectionChange([...this.selectedIds]);
        }
    }

    /**
     * Fires the onItemReorder callback.
     *
     * @param itemId - Reordered item ID
     * @param newOrder - New order value
     * @param newParentId - New parent ID if nesting changed
     */
    private fireItemReorder(
        itemId: string,
        newOrder: number,
        newParentId?: string
    ): void
    {
        if (this.options.onItemReorder)
        {
            this.options.onItemReorder(itemId, newOrder, newParentId);
        }
    }

    /**
     * Fires the onBulkStatusChange callback.
     *
     * @param ids - Item IDs affected
     * @param newStatus - New status applied
     */
    private fireBulkStatusChange(
        ids: string[], newStatus: ActionItemStatus
    ): void
    {
        if (this.options.onBulkStatusChange)
        {
            this.options.onBulkStatusChange(ids, newStatus);
        }
    }

    /**
     * Fires the onBulkDelete callback.
     *
     * @param ids - Item IDs to delete
     */
    private fireBulkDelete(ids: string[]): void
    {
        if (this.options.onBulkDelete)
        {
            this.options.onBulkDelete(ids);
        }
    }

    /**
     * Fires the onBulkAssign callback.
     *
     * @param ids - Item IDs to assign
     */
    private fireBulkAssign(ids: string[]): void
    {
        if (this.options.onBulkAssign)
        {
            this.options.onBulkAssign(ids);
        }
    }

    // ========================================================================
    // S7.15: ITEM LOOKUP HELPERS
    // ========================================================================

    /**
     * Finds an item by ID in the items array.
     *
     * @param itemId - ID to search for
     * @returns The item or undefined
     */
    private findItem(itemId: string): ActionItem | undefined
    {
        return this.items.find(i => i.id === itemId);
    }

    /**
     * Tracks an event handler for cleanup on destroy or re-render.
     *
     * @param el - Target element
     * @param event - Event name
     * @param handler - Handler function
     */
    private trackHandler(
        el: EventTarget, event: string, handler: EventListener
    ): void
    {
        this.boundHandlers.push({ el, event, handler });
    }

    // ========================================================================
    // S7.16: DRAG-AND-DROP (Phase 3)
    // ========================================================================

    /**
     * Initiates a drag operation on an item.
     * Creates a translucent clone and attaches pointermove/pointerup via capture.
     *
     * @param itemId - ID of the item being dragged
     * @param e - Pointer event from the drag handle
     */
    private startDrag(itemId: string, e: PointerEvent): void
    {
        e.preventDefault();
        const handle = e.currentTarget as HTMLElement;
        handle.setPointerCapture(e.pointerId);

        this.dragState = {
            itemId,
            cloneEl: null,
            startX: e.clientX,
            startY: e.clientY,
            active: false,
        };

        const moveHandler = (ev: Event) =>
        {
            this.handleDragMove(ev as PointerEvent);
        };

        const upHandler = (ev: Event) =>
        {
            const pe = ev as PointerEvent;
            this.handleDragEnd(pe);
            handle.releasePointerCapture(pe.pointerId);
            handle.removeEventListener("pointermove", moveHandler);
            handle.removeEventListener("pointerup", upHandler);
        };

        handle.addEventListener("pointermove", moveHandler);
        handle.addEventListener("pointerup", upHandler);
    }

    /**
     * Handles mouse movement during a drag operation.
     * Shows a translucent clone once movement exceeds a threshold.
     *
     * @param e - Pointer move event
     */
    private handleDragMove(e: PointerEvent): void
    {
        if (!this.dragState)
        {
            return;
        }

        const dx = e.clientX - this.dragState.startX;
        const dy = e.clientY - this.dragState.startY;

        if (!this.dragState.active && (Math.abs(dx) > 4 || Math.abs(dy) > 4))
        {
            this.activateDragClone(e);
        }

        if (this.dragState.active && this.dragState.cloneEl)
        {
            this.updateDragClonePosition(e);
            this.updateDropIndicators(e);
        }
    }

    /**
     * Creates and shows the translucent drag clone.
     *
     * @param e - Pointer event at activation point
     */
    private activateDragClone(e: PointerEvent): void
    {
        if (!this.dragState || !this.rootEl)
        {
            return;
        }

        this.dragState.active = true;

        const sourceRow = this.rootEl.querySelector(
            `[data-id="${this.dragState.itemId}"]`
        ) as HTMLElement | null;

        if (!sourceRow)
        {
            return;
        }

        const clone = this.createDragCloneElement(sourceRow, e);

        document.body.appendChild(clone);
        this.dragState.cloneEl = clone;
        sourceRow.style.opacity = "0.3";
    }

    /**
     * Creates a positioned clone element for drag feedback.
     *
     * @param sourceRow - Source item element to clone
     * @param e - Pointer event for initial position
     * @returns Styled clone element
     */
    private createDragCloneElement(
        sourceRow: HTMLElement, e: PointerEvent
    ): HTMLElement
    {
        const clone = sourceRow.cloneNode(true) as HTMLElement;

        clone.classList.add(`${CLS}-drag-clone`);
        clone.style.position = "fixed";
        clone.style.width = `${sourceRow.offsetWidth}px`;
        clone.style.pointerEvents = "none";
        clone.style.zIndex = "9999";
        clone.style.opacity = "0.7";
        clone.style.left = `${e.clientX - 20}px`;
        clone.style.top = `${e.clientY - 10}px`;

        return clone;
    }

    /**
     * Updates the position of the drag clone to follow the cursor.
     *
     * @param e - Pointer move event
     */
    private updateDragClonePosition(e: PointerEvent): void
    {
        if (!this.dragState?.cloneEl)
        {
            return;
        }

        this.dragState.cloneEl.style.left = `${e.clientX - 20}px`;
        this.dragState.cloneEl.style.top = `${e.clientY - 10}px`;
    }

    /**
     * Shows drop indicator lines near the cursor during drag.
     * Clears previous indicators, then highlights the nearest drop target.
     *
     * @param e - Pointer event for position
     */
    private updateDropIndicators(e: PointerEvent): void
    {
        if (!this.rootEl)
        {
            return;
        }

        this.clearDropIndicators();

        const result = this.findClosestItemElement(e.clientY);

        if (result)
        {
            this.showDropIndicator(result.element, result.insertBefore);
        }
    }

    /**
     * Finds the closest item element to a vertical cursor position.
     *
     * @param clientY - Vertical position of the cursor
     * @returns Closest item and insertion direction, or null
     */
    private findClosestItemElement(
        clientY: number
    ): { element: HTMLElement; insertBefore: boolean } | null
    {
        if (!this.rootEl)
        {
            return null;
        }

        const items = this.rootEl.querySelectorAll(`.${CLS}-item`);
        let closestItem: HTMLElement | null = null;
        let insertBefore = true;
        let minDist = Infinity;

        for (const item of items)
        {
            const rect = (item as HTMLElement).getBoundingClientRect();
            const midY = rect.top + (rect.height / 2);
            const dist = Math.abs(clientY - midY);

            if (dist < minDist)
            {
                minDist = dist;
                closestItem = item as HTMLElement;
                insertBefore = clientY < midY;
            }
        }

        return closestItem
            ? { element: closestItem, insertBefore }
            : null;
    }

    /**
     * Shows a drop indicator line above or below a target item.
     *
     * @param targetItem - Item element near which to show indicator
     * @param above - If true, show above; otherwise below
     */
    private showDropIndicator(
        targetItem: HTMLElement, above: boolean
    ): void
    {
        const indicator = createElement(
            "div",
            [`${CLS}-drop-indicator`]
        );

        if (above)
        {
            targetItem.parentNode?.insertBefore(indicator, targetItem);
        }
        else
        {
            targetItem.parentNode?.insertBefore(
                indicator, targetItem.nextSibling
            );
        }
    }

    /**
     * Removes all drop indicator elements from the DOM.
     */
    private clearDropIndicators(): void
    {
        if (!this.rootEl)
        {
            return;
        }

        const indicators = this.rootEl.querySelectorAll(
            `.${CLS}-drop-indicator`
        );

        for (const ind of indicators)
        {
            ind.remove();
        }
    }

    /**
     * Handles the end of a drag operation.
     * Determines drop target and applies reorder/nesting.
     *
     * @param e - Pointer up event
     */
    private handleDragEnd(e: PointerEvent): void
    {
        if (!this.dragState)
        {
            return;
        }

        this.clearDropIndicators();
        this.removeDragClone();

        if (this.dragState.active && this.rootEl)
        {
            this.applyDrop(e);
        }

        this.restoreSourceOpacity();
        this.dragState = null;
        this.render();
    }

    /**
     * Removes the translucent drag clone from the document.
     */
    private removeDragClone(): void
    {
        if (this.dragState?.cloneEl)
        {
            this.dragState.cloneEl.remove();
            this.dragState.cloneEl = null;
        }
    }

    /**
     * Restores the opacity of the source item after drag ends.
     */
    private restoreSourceOpacity(): void
    {
        if (!this.dragState || !this.rootEl)
        {
            return;
        }

        const sourceRow = this.rootEl.querySelector(
            `[data-id="${this.dragState.itemId}"]`
        ) as HTMLElement | null;

        if (sourceRow)
        {
            sourceRow.style.opacity = "";
        }
    }

    /**
     * Applies the drop action — reorders the dragged item to its new position.
     * If dropped in a different section, also changes the item's status.
     *
     * @param e - Mouse event at drop point
     */
    private applyDrop(e: MouseEvent): void
    {
        if (!this.dragState || !this.rootEl)
        {
            return;
        }

        const target = this.findDropTarget(e);

        if (!target)
        {
            return;
        }

        const draggedItem = this.findItem(this.dragState.itemId);

        if (!draggedItem)
        {
            return;
        }

        this.applyDropReorder(draggedItem, target);
    }

    /**
     * Finds the target item and position for a drop.
     *
     * @param e - Mouse event at drop point
     * @returns Object with target item ID and position, or null
     */
    private findDropTarget(
        e: MouseEvent
    ): { targetId: string; insertBefore: boolean; sectionStatus?: ActionItemStatus } | null
    {
        const result = this.findClosestItemElement(e.clientY);

        if (!result)
        {
            return null;
        }

        const targetId = result.element.getAttribute("data-id") ?? "";
        const section = result.element.closest(`.${CLS}-section`);
        const sectionStatus = section?.getAttribute("data-status") as
            ActionItemStatus | undefined;

        return {
            targetId,
            insertBefore: result.insertBefore,
            sectionStatus,
        };
    }

    /**
     * Applies the reorder of the dragged item to the target position.
     *
     * @param draggedItem - Item being moved
     * @param target - Drop target details
     */
    private applyDropReorder(
        draggedItem: ActionItem,
        target: { targetId: string; insertBefore: boolean; sectionStatus?: ActionItemStatus }
    ): void
    {
        const targetItem = this.findItem(target.targetId);

        if (!targetItem || targetItem.id === draggedItem.id)
        {
            return;
        }

        if (target.sectionStatus && target.sectionStatus !== draggedItem.status)
        {
            const oldStatus = draggedItem.status;
            draggedItem.status = target.sectionStatus;
            this.fireStatusChange(draggedItem.id, oldStatus, target.sectionStatus);
        }

        const newOrder = this.calculateDropOrder(
            targetItem, target.insertBefore
        );

        draggedItem.order = newOrder;
        draggedItem.updatedAt = nowISO();

        this.fireItemReorder(draggedItem.id, newOrder, draggedItem.parentId);

        logInfo("Reordered item:", draggedItem.id, "to order:", newOrder);
    }

    /**
     * Calculates the new order value for a dropped item.
     *
     * @param targetItem - Item at the drop location
     * @param insertBefore - Whether to insert before or after target
     * @returns New fractional order value
     */
    private calculateDropOrder(
        targetItem: ActionItem, insertBefore: boolean
    ): number
    {
        const siblings = this.items
            .filter(i => i.status === targetItem.status && i.parentId === targetItem.parentId)
            .sort((a, b) => a.order - b.order);

        const targetIdx = siblings.findIndex(i => i.id === targetItem.id);

        if (insertBefore)
        {
            const prev = targetIdx > 0 ? siblings[targetIdx - 1] : null;
            const prevOrder = prev ? prev.order : 0;
            return fractionalOrder(prevOrder, targetItem.order);
        }

        const next = targetIdx < siblings.length - 1 ? siblings[targetIdx + 1] : null;
        const nextOrder = next ? next.order : targetItem.order + 1;

        return fractionalOrder(targetItem.order, nextOrder);
    }

    // ========================================================================
    // S7.17: NESTING / INDENT-OUTDENT (Phase 3)
    // ========================================================================

    /**
     * Indents an item, making it a child of the item above it.
     * The item above must be at the same or higher level.
     *
     * @param itemId - ID of the item to indent
     */
    private indentItem(itemId: string): void
    {
        if (!this.options.allowNesting)
        {
            return;
        }

        const item = this.findItem(itemId);

        if (!item)
        {
            return;
        }

        const potentialParent = this.findPotentialParent(item);

        if (!potentialParent)
        {
            logInfo("No parent found for indent:", itemId);
            return;
        }

        item.parentId = potentialParent.id;
        item.updatedAt = nowISO();

        this.fireItemUpdate(itemId, { parentId: potentialParent.id });
        this.fireItemReorder(itemId, item.order, potentialParent.id);
        this.render();
    }

    /**
     * Finds the item immediately above the given item that can serve as parent.
     *
     * @param item - Item to indent
     * @returns Potential parent item or undefined
     */
    private findPotentialParent(
        item: ActionItem
    ): ActionItem | undefined
    {
        const siblings = this.items
            .filter(i =>
                i.status === item.status &&
                i.parentId === item.parentId &&
                i.id !== item.id
            )
            .sort((a, b) => a.order - b.order);

        const myIndex = siblings.findIndex(i => i.order < item.order);
        const candidates = siblings.filter(i => i.order < item.order);

        if (candidates.length === 0)
        {
            return undefined;
        }

        return candidates[candidates.length - 1];
    }

    /**
     * Outdents an item, promoting it to its parent's level.
     *
     * @param itemId - ID of the item to outdent
     */
    private outdentItem(itemId: string): void
    {
        const item = this.findItem(itemId);

        if (!item || !item.parentId)
        {
            return;
        }

        const parent = this.findItem(item.parentId);
        const newParentId = parent?.parentId;

        item.parentId = newParentId;
        item.updatedAt = nowISO();

        this.fireItemUpdate(itemId, { parentId: newParentId });
        this.fireItemReorder(itemId, item.order, newParentId);
        this.render();
    }

    // ========================================================================
    // S7.18: KEYBOARD NAVIGATION (Phase 3)
    // ========================================================================

    /**
     * Attaches the global keyboard handler to the root element.
     * Handles navigation, editing, status cycling, and clipboard.
     */
    private attachGlobalKeyHandler(): void
    {
        if (!this.rootEl)
        {
            return;
        }

        const handler = (e: Event) =>
        {
            this.handleGlobalKeydown(e as KeyboardEvent);
        };

        this.rootEl.addEventListener("keydown", handler);
        this.trackHandler(this.rootEl, "keydown", handler);
    }

    /**
     * Routes global keydown events to the appropriate handler.
     *
     * @param e - Keyboard event
     */
    private handleGlobalKeydown(e: KeyboardEvent): void
    {
        if (this.isEditingActive())
        {
            return;
        }

        if (this.handleClipboardKeys(e))
        {
            return;
        }

        if (this.handleNavigationKeys(e))
        {
            return;
        }

        this.handleActionKeys(e);
    }

    /**
     * Checks whether any item is currently in edit mode.
     *
     * @returns True if an edit input is active
     */
    private isEditingActive(): boolean
    {
        return this.editingItems.size > 0;
    }

    /**
     * Handles arrow key navigation between items.
     *
     * @param e - Keyboard event
     * @returns True if the event was handled
     */
    private handleNavigationKeys(e: KeyboardEvent): boolean
    {
        if (e.key === "ArrowUp" || e.key === "ArrowDown")
        {
            e.preventDefault();

            if (e.ctrlKey && e.shiftKey)
            {
                this.moveItemInOrder(e.key === "ArrowUp" ? -1 : 1);
            }
            else
            {
                this.navigateFocus(e.key === "ArrowUp" ? -1 : 1);
            }

            return true;
        }

        return false;
    }

    /**
     * Handles action keys: Enter, Escape, Space, Tab, Delete, Backspace.
     *
     * @param e - Keyboard event
     */
    private handleActionKeys(e: KeyboardEvent): void
    {
        if (!this.focusedItemId)
        {
            return;
        }

        if (e.key === "Enter")
        {
            e.preventDefault();
            this.handleEnterKey();
        }
        else if (e.key === "Escape")
        {
            e.preventDefault();
            this.handleEscapeKey();
        }
        else if (e.key === " ")
        {
            e.preventDefault();
            this.cycleItemStatus(this.focusedItemId);
        }
        else if (e.key === "Tab")
        {
            this.handleTabKey(e);
        }
        else if (e.key === "Delete" || e.key === "Backspace")
        {
            this.handleDeleteKey(e);
        }
    }

    /**
     * Moves the keyboard focus up or down by the given direction.
     *
     * @param direction - -1 for up, +1 for down
     */
    private navigateFocus(direction: number): void
    {
        const order = getDisplayOrder(
            this.getFilteredItems(), this.currentSort
        );

        if (order.length === 0)
        {
            return;
        }

        if (!this.focusedItemId)
        {
            this.focusedItemId = order[0];
            this.render();
            this.scrollToFocusedItem();
            return;
        }

        const currentIdx = order.indexOf(this.focusedItemId);
        const newIdx = Math.max(
            0, Math.min(order.length - 1, currentIdx + direction)
        );

        this.focusedItemId = order[newIdx];
        this.render();
        this.scrollToFocusedItem();
    }

    /**
     * Scrolls the focused item into view within the component body.
     */
    private scrollToFocusedItem(): void
    {
        if (!this.focusedItemId || !this.rootEl)
        {
            return;
        }

        const el = this.rootEl.querySelector(
            `[data-id="${this.focusedItemId}"]`
        );

        if (el)
        {
            el.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
    }

    /**
     * Handles Enter key: edit focused item or create new below.
     */
    private handleEnterKey(): void
    {
        if (!this.focusedItemId)
        {
            return;
        }

        const item = this.findItem(this.focusedItemId);

        if (!item)
        {
            return;
        }

        if (item.content === "")
        {
            this.createNewItemAfter(item.id);
        }
        else
        {
            this.enterEditMode(item.id);
        }
    }

    /**
     * Handles Escape key: cancel edit or clear selection.
     */
    private handleEscapeKey(): void
    {
        if (this.selectedIds.size > 0)
        {
            this.selectedIds.clear();
            this.fireSelectionChange();
            this.render();
        }
        else
        {
            this.focusedItemId = null;
            this.render();
        }
    }

    /**
     * Handles Tab/Shift+Tab for indent/outdent of the focused item.
     *
     * @param e - Keyboard event
     */
    private handleTabKey(e: KeyboardEvent): void
    {
        if (!this.focusedItemId)
        {
            return;
        }

        const item = this.findItem(this.focusedItemId);

        if (!item)
        {
            return;
        }

        if (e.shiftKey)
        {
            e.preventDefault();
            this.outdentItem(this.focusedItemId);
        }
        else if (this.isLastItemInSection(item))
        {
            e.preventDefault();
            this.createNewItemAfter(this.focusedItemId);
        }
        else
        {
            e.preventDefault();
            this.indentItem(this.focusedItemId);
        }
    }

    /**
     * Checks if an item is the last in its status section.
     *
     * @param item - Item to check
     * @returns True if last in section
     */
    private isLastItemInSection(item: ActionItem): boolean
    {
        const siblings = this.items
            .filter(i => i.status === item.status)
            .sort((a, b) => a.order - b.order);

        return siblings.length > 0 &&
            siblings[siblings.length - 1].id === item.id;
    }

    /**
     * Handles Delete/Backspace on focused item — removes empty items.
     *
     * @param e - Keyboard event
     */
    private handleDeleteKey(e: KeyboardEvent): void
    {
        if (!this.focusedItemId)
        {
            return;
        }

        const item = this.findItem(this.focusedItemId);

        if (!item || item.content !== "")
        {
            return;
        }

        e.preventDefault();
        this.removeItemAndChildren(this.focusedItemId);
        this.fireItemDelete(this.focusedItemId);
        this.focusedItemId = null;
        this.render();
    }

    /**
     * Moves the focused item up or down in order within its section.
     *
     * @param direction - -1 for up, +1 for down
     */
    private moveItemInOrder(direction: number): void
    {
        if (!this.focusedItemId)
        {
            return;
        }

        const item = this.findItem(this.focusedItemId);

        if (!item)
        {
            return;
        }

        const siblings = this.items
            .filter(i => i.status === item.status && i.parentId === item.parentId)
            .sort((a, b) => a.order - b.order);

        const idx = siblings.findIndex(i => i.id === item.id);
        const targetIdx = idx + direction;

        if (targetIdx < 0 || targetIdx >= siblings.length)
        {
            return;
        }

        const target = siblings[targetIdx];
        const tempOrder = item.order;

        item.order = target.order;
        target.order = tempOrder;
        item.updatedAt = nowISO();

        this.fireItemReorder(item.id, item.order, item.parentId);
        this.render();
    }

    // ========================================================================
    // S7.19: CLIPBOARD (Phase 4)
    // ========================================================================

    /**
     * Handles clipboard keyboard shortcuts: Ctrl+C, Ctrl+X, Ctrl+V, Ctrl+A.
     *
     * @param e - Keyboard event
     * @returns True if the event was handled
     */
    private handleClipboardKeys(e: KeyboardEvent): boolean
    {
        if (!(e.ctrlKey || e.metaKey))
        {
            return false;
        }

        if (e.key === "c")
        {
            e.preventDefault();
            this.copySelectedAsMarkdown();
            return true;
        }

        if (e.key === "x")
        {
            e.preventDefault();
            this.cutSelected();
            return true;
        }

        if (e.key === "v")
        {
            e.preventDefault();
            this.pasteFromClipboard();
            return true;
        }

        if (e.key === "a")
        {
            e.preventDefault();
            this.selectAll();
            return true;
        }

        return false;
    }

    /**
     * Copies selected items as a markdown checklist to the clipboard.
     */
    private copySelectedAsMarkdown(): void
    {
        if (this.selectedIds.size === 0)
        {
            return;
        }

        const md = this.exportSelectedAsMarkdown();

        navigator.clipboard.writeText(md).then(
            () =>
            {
                logInfo("Copied", this.selectedIds.size, "items to clipboard");
            },
            (err) =>
            {
                logError("Clipboard write failed:", err);
            }
        );
    }

    /**
     * Builds markdown text from currently selected items.
     *
     * @returns Markdown checklist string
     */
    private exportSelectedAsMarkdown(): string
    {
        const selected = this.items.filter(i => this.selectedIds.has(i.id));
        const lines: string[] = [];

        for (const item of selected)
        {
            const depth = this.getItemDepth(item);
            lines.push(itemToMarkdownLine(item, depth));
        }

        return lines.join("\n");
    }

    /**
     * Computes the nesting depth of an item by walking up the parentId chain.
     *
     * @param item - Item to measure
     * @returns Nesting depth (0 = top-level)
     */
    private getItemDepth(item: ActionItem): number
    {
        let depth = 0;
        let current: ActionItem | undefined = item;

        while (current?.parentId)
        {
            depth++;
            current = this.findItem(current.parentId);
        }

        return depth;
    }

    /**
     * Cuts selected items — copies as markdown then deletes them.
     */
    private cutSelected(): void
    {
        this.copySelectedAsMarkdown();
        const idsToDelete = [...this.selectedIds];

        for (const id of idsToDelete)
        {
            this.removeItemAndChildren(id);
            this.fireItemDelete(id);
        }

        this.selectedIds.clear();
        this.fireSelectionChange();
        this.render();

        logInfo("Cut", idsToDelete.length, "items");
    }

    /**
     * Pastes markdown checklist text from the clipboard as new items.
     */
    private pasteFromClipboard(): void
    {
        navigator.clipboard.readText().then(
            (text) =>
            {
                if (text.trim())
                {
                    this.importMarkdownText(text);
                }
            },
            (err) =>
            {
                logError("Clipboard read failed:", err);
            }
        );
    }

    /**
     * Selects all visible (non-archived) items.
     */
    private selectAll(): void
    {
        const filtered = this.getFilteredItems();

        this.selectedIds.clear();

        for (const item of filtered)
        {
            if (item.status !== "archived")
            {
                this.selectedIds.add(item.id);
            }
        }

        this.fireSelectionChange();
        this.render();
    }

    // ========================================================================
    // S7.20: FILTER PANEL (Phase 4)
    // ========================================================================

    /**
     * Toggles the filter panel open/closed.
     */
    private toggleFilterPanel(): void
    {
        this.filterPanelOpen = !this.filterPanelOpen;
        this.sortDropdownOpen = false;
        this.render();
    }

    /**
     * Renders the filter panel dropdown with faceted checkboxes.
     *
     * @returns Filter panel element
     */
    private renderFilterPanel(): HTMLElement
    {
        const panel = createElement("div", [`${CLS}-filter-panel`]);

        this.addStatusFilterGroup(panel);
        this.addPriorityFilterGroup(panel);
        this.addAssigneeFilterGroup(panel);
        this.addUnassignedCheckbox(panel);
        this.addFilterPanelActions(panel);

        return panel;
    }

    /**
     * Adds the status filter checkbox group to the panel.
     *
     * @param panel - Filter panel container
     */
    private addStatusFilterGroup(panel: HTMLElement): void
    {
        const label = createElement("div", [`${CLS}-filter-label`], "Status");
        panel.appendChild(label);

        const statuses: ActionItemStatus[] = [
            "not-started", "in-progress", "done", "archived",
        ];

        for (const status of statuses)
        {
            const checked = this.activeFilter?.statuses?.includes(status) ?? false;
            const cb = this.renderFilterCheckbox(
                STATUS_LABELS[status], checked,
                () => this.toggleFilterFacet("statuses", status)
            );

            panel.appendChild(cb);
        }
    }

    /**
     * Adds the priority filter checkbox group to the panel.
     *
     * @param panel - Filter panel container
     */
    private addPriorityFilterGroup(panel: HTMLElement): void
    {
        const label = createElement("div", [`${CLS}-filter-label`], "Priority");
        panel.appendChild(label);

        const priorities: (ActionItemPriority | "none")[] = [
            "high", "medium", "low", "none",
        ];
        const priorityNames: Record<string, string> =
        {
            "high": "High",
            "medium": "Medium",
            "low": "Low",
            "none": "None",
        };

        for (const p of priorities)
        {
            const checked = this.activeFilter?.priorities?.includes(p) ?? false;
            const cb = this.renderFilterCheckbox(
                priorityNames[p], checked,
                () => this.toggleFilterFacet("priorities", p)
            );

            panel.appendChild(cb);
        }
    }

    /**
     * Adds the assignee filter list to the panel.
     *
     * @param panel - Filter panel container
     */
    private addAssigneeFilterGroup(panel: HTMLElement): void
    {
        const label = createElement("div", [`${CLS}-filter-label`], "Assignee");
        panel.appendChild(label);

        const assignees = this.getUniqueAssignees();

        for (const person of assignees)
        {
            const checked = this.activeFilter?.assigneeIds?.includes(person.id) ?? false;
            const cb = this.renderFilterCheckbox(
                person.name, checked,
                () => this.toggleFilterFacet("assigneeIds", person.id)
            );

            panel.appendChild(cb);
        }
    }

    /**
     * Adds the "Unassigned" checkbox to the filter panel.
     *
     * @param panel - Filter panel container
     */
    private addUnassignedCheckbox(panel: HTMLElement): void
    {
        const checked = this.activeFilter?.assigneeIds?.includes("") ?? false;
        const cb = this.renderFilterCheckbox(
            "Unassigned", checked,
            () => this.toggleFilterFacet("assigneeIds", "")
        );

        panel.appendChild(cb);
    }

    /**
     * Adds clear/apply action buttons to the filter panel.
     *
     * @param panel - Filter panel container
     */
    private addFilterPanelActions(panel: HTMLElement): void
    {
        const actions = createElement("div", [`${CLS}-filter-actions`]);

        const clearBtn = createElement("button", [`${CLS}-filter-clear-btn`], "Clear");
        setAttr(clearBtn, "type", "button");

        const clearHandler = (e: Event) =>
        {
            e.stopPropagation();
            this.clearActiveFilter();
        };

        clearBtn.addEventListener("click", clearHandler);
        this.trackHandler(clearBtn, "click", clearHandler);

        actions.appendChild(clearBtn);
        panel.appendChild(actions);
    }

    /**
     * Returns unique assignees from all items.
     *
     * @returns Array of unique persons
     */
    private getUniqueAssignees(): ActionItemPerson[]
    {
        const seen = new Set<string>();
        const result: ActionItemPerson[] = [];

        for (const item of this.items)
        {
            if (item.assignee && !seen.has(item.assignee.id))
            {
                seen.add(item.assignee.id);
                result.push(item.assignee);
            }
        }

        return result;
    }

    /**
     * Renders a single filter checkbox item.
     *
     * @param labelText - Checkbox label
     * @param checked - Current checked state
     * @param onToggle - Toggle callback
     * @returns Checkbox container element
     */
    private renderFilterCheckbox(
        labelText: string,
        checked: boolean,
        onToggle: () => void
    ): HTMLElement
    {
        const row = createElement("label", [`${CLS}-filter-checkbox`]);

        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = checked;

        const handler = (e: Event) =>
        {
            e.stopPropagation();
            onToggle();
        };

        input.addEventListener("change", handler);
        this.trackHandler(input, "change", handler);

        const text = document.createTextNode(` ${labelText}`);

        row.appendChild(input);
        row.appendChild(text);

        return row;
    }

    /**
     * Toggles a single facet value in the active filter.
     *
     * @param facetKey - Which facet to modify
     * @param value - Value to toggle
     */
    private toggleFilterFacet(
        facetKey: keyof ActionItemFilter,
        value: string
    ): void
    {
        if (!this.activeFilter)
        {
            this.activeFilter = {};
        }

        const current = (this.activeFilter[facetKey] as string[] | undefined) ?? [];

        if (current.includes(value))
        {
            (this.activeFilter[facetKey] as string[]) =
                current.filter(v => v !== value);
        }
        else
        {
            (this.activeFilter[facetKey] as string[]) = [...current, value];
        }

        this.cleanEmptyFilter();
        this.render();
    }

    /**
     * Resets the active filter if all facets are empty.
     */
    private cleanEmptyFilter(): void
    {
        if (!this.activeFilter)
        {
            return;
        }

        const hasAny = Object.values(this.activeFilter).some(
            v => Array.isArray(v) && v.length > 0
        );

        if (!hasAny)
        {
            this.activeFilter = null;
        }
    }

    /**
     * Clears all active filters and re-renders.
     */
    private clearActiveFilter(): void
    {
        this.activeFilter = null;
        this.filterPanelOpen = false;
        this.render();
    }

    // ========================================================================
    // S7.21: FILTER CHIPS (Phase 4)
    // ========================================================================

    /**
     * Renders active filter chips below the header.
     * Each chip shows a facet value and can be clicked to remove.
     */
    private renderFilterChips(): void
    {
        if (!this.rootEl || !this.activeFilter)
        {
            return;
        }

        const container = createElement("div", [`${CLS}-filter-chips`]);
        let chipCount = 0;

        chipCount += this.addStatusChips(container);
        chipCount += this.addPriorityChips(container);
        chipCount += this.addAssigneeChips(container);

        if (chipCount > 0)
        {
            this.rootEl.appendChild(container);
        }
    }

    /**
     * Adds status filter chips to the container.
     *
     * @param container - Chips container
     * @returns Number of chips added
     */
    private addStatusChips(container: HTMLElement): number
    {
        if (!this.activeFilter?.statuses)
        {
            return 0;
        }

        for (const status of this.activeFilter.statuses)
        {
            const chip = this.renderFilterChip(
                `Status: ${STATUS_LABELS[status]}`,
                () => this.toggleFilterFacet("statuses", status)
            );
            container.appendChild(chip);
        }

        return this.activeFilter.statuses.length;
    }

    /**
     * Adds priority filter chips to the container.
     *
     * @param container - Chips container
     * @returns Number of chips added
     */
    private addPriorityChips(container: HTMLElement): number
    {
        if (!this.activeFilter?.priorities)
        {
            return 0;
        }

        for (const priority of this.activeFilter.priorities)
        {
            const label = priority === "none" ? "None" : PRIORITY_LABELS[priority as ActionItemPriority];
            const chip = this.renderFilterChip(
                `Priority: ${label}`,
                () => this.toggleFilterFacet("priorities", priority)
            );
            container.appendChild(chip);
        }

        return this.activeFilter.priorities.length;
    }

    /**
     * Adds assignee filter chips to the container.
     *
     * @param container - Chips container
     * @returns Number of chips added
     */
    private addAssigneeChips(container: HTMLElement): number
    {
        if (!this.activeFilter?.assigneeIds)
        {
            return 0;
        }

        for (const id of this.activeFilter.assigneeIds)
        {
            const name = id === "" ? "Unassigned" : this.findAssigneeName(id);
            const chip = this.renderFilterChip(
                `Assignee: ${name}`,
                () => this.toggleFilterFacet("assigneeIds", id)
            );
            container.appendChild(chip);
        }

        return this.activeFilter.assigneeIds.length;
    }

    /**
     * Finds an assignee name by ID from the items.
     *
     * @param assigneeId - Person ID to look up
     * @returns Person name or "Unknown"
     */
    private findAssigneeName(assigneeId: string): string
    {
        for (const item of this.items)
        {
            if (item.assignee?.id === assigneeId)
            {
                return item.assignee.name;
            }
        }

        return "Unknown";
    }

    /**
     * Renders a single filter chip with a remove action.
     *
     * @param label - Chip display text
     * @param onRemove - Callback to remove this filter
     * @returns Chip element
     */
    private renderFilterChip(
        label: string, onRemove: () => void
    ): HTMLElement
    {
        const chip = createElement("span", [`${CLS}-filter-chip`]);
        const text = document.createTextNode(label);

        chip.appendChild(text);

        const closeBtn = createElement("button", [`${CLS}-filter-chip-close`], "\u00D7");
        setAttr(closeBtn, "type", "button");
        setAttr(closeBtn, "aria-label", `Remove filter: ${label}`);

        const handler = (e: Event) =>
        {
            e.stopPropagation();
            onRemove();
        };

        closeBtn.addEventListener("click", handler);
        this.trackHandler(closeBtn, "click", handler);

        chip.appendChild(closeBtn);

        return chip;
    }

    // ========================================================================
    // S7.22: SORT DROPDOWN (Phase 4)
    // ========================================================================

    /**
     * Toggles the sort dropdown open/closed.
     */
    private toggleSortDropdown(): void
    {
        this.sortDropdownOpen = !this.sortDropdownOpen;
        this.filterPanelOpen = false;
        this.render();
    }

    /**
     * Renders the sort dropdown with all sort options.
     *
     * @returns Sort dropdown element
     */
    private renderSortDropdown(): HTMLElement
    {
        const dropdown = createElement("div", [`${CLS}-sort-dropdown`]);

        const sortKeys = Object.keys(SORT_LABELS) as SortOption[];

        for (const key of sortKeys)
        {
            const option = this.renderSortOption(key);
            dropdown.appendChild(option);
        }

        return dropdown;
    }

    /**
     * Renders a single sort option in the dropdown.
     *
     * @param sortKey - Sort option key
     * @returns Sort option button element
     */
    private renderSortOption(sortKey: SortOption): HTMLElement
    {
        const classes = [`${CLS}-sort-option`];

        if (sortKey === this.currentSort)
        {
            classes.push(`${CLS}-sort-option-active`);
        }

        const option = createElement(
            "button",
            classes,
            SORT_LABELS[sortKey]
        );

        setAttr(option, "type", "button");

        const handler = (e: Event) =>
        {
            e.stopPropagation();
            this.currentSort = sortKey;
            this.sortDropdownOpen = false;
            this.render();
        };

        option.addEventListener("click", handler);
        this.trackHandler(option, "click", handler);

        return option;
    }

    // ========================================================================
    // S7.23: BULK TOOLBAR (Phase 3)
    // ========================================================================

    /**
     * Renders the bulk operations toolbar when 2+ items are selected.
     */
    private renderBulkToolbar(): void
    {
        if (!this.rootEl || this.selectedIds.size < 2)
        {
            return;
        }

        const toolbar = createElement("div", [`${CLS}-bulk-toolbar`]);

        const countLabel = createElement(
            "span",
            [`${CLS}-bulk-count`],
            `${this.selectedIds.size} selected`
        );

        toolbar.appendChild(countLabel);

        this.addBulkStatusDropdown(toolbar);
        this.addBulkAssignButton(toolbar);
        this.addBulkDeleteButton(toolbar);

        this.rootEl.appendChild(toolbar);
    }

    /**
     * Adds the status change dropdown to the bulk toolbar.
     *
     * @param toolbar - Bulk toolbar container
     */
    private addBulkStatusDropdown(toolbar: HTMLElement): void
    {
        const select = document.createElement("select");
        select.classList.add(`${CLS}-bulk-status-select`);

        const defaultOpt = document.createElement("option");
        defaultOpt.value = "";
        defaultOpt.textContent = "Change status...";
        defaultOpt.disabled = true;
        defaultOpt.selected = true;
        select.appendChild(defaultOpt);

        for (const status of STATUS_CYCLE)
        {
            const opt = document.createElement("option");
            opt.value = status;
            opt.textContent = STATUS_LABELS[status];
            select.appendChild(opt);
        }

        const handler = (e: Event) =>
        {
            e.stopPropagation();
            const newStatus = select.value as ActionItemStatus;

            if (newStatus)
            {
                this.bulkChangeStatus(newStatus);
            }
        };

        select.addEventListener("change", handler);
        this.trackHandler(select, "change", handler);

        toolbar.appendChild(select);
    }

    /**
     * Adds the assign button to the bulk toolbar.
     *
     * @param toolbar - Bulk toolbar container
     */
    private addBulkAssignButton(toolbar: HTMLElement): void
    {
        const btn = createElement(
            "button",
            [`${CLS}-bulk-btn`],
            "Assign"
        );

        setAttr(btn, "type", "button");

        const handler = (e: Event) =>
        {
            e.stopPropagation();
            this.fireBulkAssign([...this.selectedIds]);
        };

        btn.addEventListener("click", handler);
        this.trackHandler(btn, "click", handler);

        toolbar.appendChild(btn);
    }

    /**
     * Adds the delete button to the bulk toolbar.
     *
     * @param toolbar - Bulk toolbar container
     */
    private addBulkDeleteButton(toolbar: HTMLElement): void
    {
        const btn = createElement(
            "button",
            [`${CLS}-bulk-btn`, `${CLS}-bulk-btn-danger`],
            "Delete"
        );

        setAttr(btn, "type", "button");

        const handler = (e: Event) =>
        {
            e.stopPropagation();
            this.bulkDelete();
        };

        btn.addEventListener("click", handler);
        this.trackHandler(btn, "click", handler);

        toolbar.appendChild(btn);
    }

    /**
     * Changes status for all selected items.
     *
     * @param newStatus - New status to apply
     */
    private bulkChangeStatus(newStatus: ActionItemStatus): void
    {
        const ids = [...this.selectedIds];

        for (const id of ids)
        {
            const item = this.findItem(id);

            if (item)
            {
                const oldStatus = item.status;
                item.status = newStatus;
                item.updatedAt = nowISO();
                this.fireStatusChange(id, oldStatus, newStatus);
            }
        }

        this.fireBulkStatusChange(ids, newStatus);
        this.selectedIds.clear();
        this.fireSelectionChange();
        this.render();

        logInfo("Bulk status change:", ids.length, "items to", newStatus);
    }

    /**
     * Deletes all selected items after confirmation.
     */
    private bulkDelete(): void
    {
        const ids = [...this.selectedIds];
        const confirmed = window.confirm(
            `Delete ${ids.length} selected item${ids.length > 1 ? "s" : ""}?`
        );

        if (!confirmed)
        {
            return;
        }

        for (const id of ids)
        {
            this.removeItemAndChildren(id);
        }

        this.fireBulkDelete(ids);
        this.selectedIds.clear();
        this.fireSelectionChange();
        this.render();

        logInfo("Bulk deleted:", ids.length, "items");
    }

    // ========================================================================
    // S7.24: INLINE CREATION IMPROVEMENTS (Phase 3)
    // ========================================================================

    /**
     * Handles blur on empty items — removes them if still empty.
     * Called from commitEdit when content is empty.
     *
     * @param itemId - ID of the item that lost focus
     */
    private removeEmptyItemOnBlur(itemId: string): void
    {
        const item = this.findItem(itemId);

        if (!item || item.content.trim() !== "")
        {
            return;
        }

        this.removeItemAndChildren(itemId);
        this.fireItemDelete(itemId);

        logInfo("Removed empty item on blur:", itemId);
    }

    // ========================================================================
    // S7.25: EXPORT AND IMPORT (Phase 4)
    // ========================================================================

    /**
     * Exports all items (or filtered items) in the specified format.
     *
     * @param format - "json" or "markdown"
     * @returns Serialised string
     */
    public exportItems(format: "json" | "markdown"): string
    {
        const filtered = this.getFilteredItems();

        if (format === "json")
        {
            return JSON.stringify(filtered, null, 2);
        }

        return this.exportAllAsMarkdown(filtered);
    }

    /**
     * Exports items as a markdown checklist.
     *
     * @param items - Items to export
     * @returns Markdown string
     */
    private exportAllAsMarkdown(items: ActionItem[]): string
    {
        const lines: string[] = [];
        const topLevel = items
            .filter(i => !i.parentId)
            .sort((a, b) => a.order - b.order);

        for (const item of topLevel)
        {
            this.exportItemWithChildren(item, items, 0, lines);
        }

        return lines.join("\n");
    }

    /**
     * Recursively exports an item and its children as markdown.
     *
     * @param item - Current item
     * @param allItems - All items for child lookup
     * @param depth - Current indent depth
     * @param lines - Accumulator for output lines
     */
    private exportItemWithChildren(
        item: ActionItem,
        allItems: ActionItem[],
        depth: number,
        lines: string[]
    ): void
    {
        lines.push(itemToMarkdownLine(item, depth));

        const children = allItems
            .filter(i => i.parentId === item.id)
            .sort((a, b) => a.order - b.order);

        for (const child of children)
        {
            this.exportItemWithChildren(child, allItems, depth + 1, lines);
        }
    }

    /**
     * Imports a markdown checklist as new items.
     * Returns the array of newly created items.
     *
     * @param markdown - Markdown checklist text
     * @returns Array of created items
     */
    public importMarkdownText(markdown: string): ActionItem[]
    {
        const parsed = parseMarkdownChecklist(markdown);
        const created: ActionItem[] = [];
        const depthToParentId: Map<number, string> = new Map();

        for (const entry of parsed)
        {
            const parentId = entry.depth > 0
                ? depthToParentId.get(entry.depth - 1)
                : undefined;

            const newItem = this.createItemFromImport(entry, parentId);

            created.push(newItem);
            depthToParentId.set(entry.depth, newItem.id);
        }

        this.render();

        logInfo("Imported", created.length, "items from markdown");

        return created;
    }

    /**
     * Creates a single item from parsed markdown import data.
     *
     * @param entry - Parsed markdown line data
     * @param parentId - Parent item ID for nesting
     * @returns Newly created item
     */
    private createItemFromImport(
        entry: { content: string; status: ActionItemStatus; priority?: ActionItemPriority; assigneeHint?: string },
        parentId?: string
    ): ActionItem
    {
        const now = nowISO();
        const newItem: ActionItem =
        {
            id: generateId(),
            index: nextGlobalIndex++,
            order: getNextOrder(this.items),
            content: entry.content,
            status: entry.status,
            priority: entry.priority,
            parentId,
            tags: [],
            createdAt: now,
            updatedAt: now,
            commentCount: 0,
        };

        this.items.push(newItem);
        this.fireItemCreate(newItem);

        return newItem;
    }

    // ========================================================================
    // S7.26: PUBLIC API METHODS
    // ========================================================================

    /**
     * Adds a new item to the list from partial data.
     * Missing fields are filled with defaults.
     *
     * @param partial - Partial action item data
     * @returns The complete newly created item
     */
    public addItem(partial: Partial<ActionItem>): ActionItem
    {
        const newItem = buildItemFromPartial(partial, this.items);

        this.items.push(newItem);
        this.fireItemCreate(newItem);
        this.render();

        logInfo("Added item:", newItem.id);

        return newItem;
    }

    /**
     * Removes an item by ID and all its sub-items.
     *
     * @param itemId - ID of the item to remove
     */
    public removeItem(itemId: string): void
    {
        const item = this.findItem(itemId);

        if (!item)
        {
            logWarn("Item not found for removal:", itemId);
            return;
        }

        this.removeItemAndChildren(itemId);
        this.fireItemDelete(itemId);
        this.render();

        logInfo("Removed item:", itemId);
    }

    /**
     * Recursively removes an item and all its descendants.
     *
     * @param itemId - ID of the item to remove
     */
    private removeItemAndChildren(itemId: string): void
    {
        const children = this.items.filter(i => i.parentId === itemId);

        for (const child of children)
        {
            this.removeItemAndChildren(child.id);
        }

        this.items = this.items.filter(i => i.id !== itemId);
        this.editingItems.delete(itemId);
        this.selectedIds.delete(itemId);
        this.expandedComments.delete(itemId);
    }

    /**
     * Updates an item's properties by merging changes.
     *
     * @param itemId - ID of the item to update
     * @param changes - Partial properties to merge
     */
    public updateItem(
        itemId: string, changes: Partial<ActionItem>
    ): void
    {
        const item = this.findItem(itemId);

        if (!item)
        {
            logWarn("Item not found for update:", itemId);
            return;
        }

        Object.assign(item, changes, { updatedAt: nowISO() });
        this.fireItemUpdate(itemId, changes);
        this.render();
    }

    /**
     * Sets the assignee for an item.
     *
     * @param itemId - ID of the item
     * @param person - Person to assign, or undefined to unassign
     */
    public setAssignee(
        itemId: string, person?: ActionItemPerson
    ): void
    {
        this.updateItem(itemId, { assignee: person });
    }

    /**
     * Sets the comment count for an item.
     *
     * @param itemId - ID of the item
     * @param count - New comment count
     */
    public setCommentCount(itemId: string, count: number): void
    {
        const item = this.findItem(itemId);

        if (!item)
        {
            return;
        }

        item.commentCount = count;
        this.render();
    }

    /**
     * Returns a copy of all items.
     *
     * @returns Array of all action items
     */
    public getItems(): ActionItem[]
    {
        return [...this.items];
    }

    /**
     * Gets a single item by ID.
     *
     * @param itemId - ID to look up
     * @returns The item or null if not found
     */
    public getItem(itemId: string): ActionItem | null
    {
        return this.findItem(itemId) ?? null;
    }

    /**
     * Gets items filtered by status.
     *
     * @param status - Status to filter by
     * @returns Array of matching items
     */
    public getItemsByStatus(status: ActionItemStatus): ActionItem[]
    {
        return this.items.filter(i => i.status === status);
    }

    /**
     * Returns the currently selected item IDs.
     *
     * @returns Array of selected IDs
     */
    public getSelectedIds(): string[]
    {
        return [...this.selectedIds];
    }

    /**
     * Sets the selection to the specified IDs.
     *
     * @param ids - Array of item IDs to select
     */
    public setSelection(ids: string[]): void
    {
        this.selectedIds = new Set(ids);
        this.fireSelectionChange();
        this.render();
    }

    /**
     * Clears all selection.
     */
    public clearSelection(): void
    {
        this.selectedIds.clear();
        this.fireSelectionChange();
        this.render();
    }

    /**
     * Expands or collapses a status section.
     *
     * @param status - Status section to toggle
     * @param expanded - Whether to expand (true) or collapse (false)
     */
    public toggleSection(
        status: ActionItemStatus, expanded: boolean
    ): void
    {
        if (expanded)
        {
            this.collapsedSections.delete(status);
        }
        else
        {
            this.collapsedSections.add(status);
        }

        this.render();
    }

    /**
     * Applies a filter to the items list (visual only, items not removed).
     *
     * @param filter - Filter specification
     */
    public setFilter(filter: ActionItemFilter): void
    {
        this.activeFilter = filter;
        this.render();

        logInfo("Filter applied");
    }

    /**
     * Clears all active filters.
     */
    public clearFilters(): void
    {
        this.activeFilter = null;
        this.filterPanelOpen = false;
        this.render();

        logInfo("Filters cleared");
    }

    /**
     * Sets the sort order and re-renders.
     *
     * @param sort - Sort option to apply
     */
    public setSort(sort: SortOption): void
    {
        this.currentSort = sort;
        this.render();

        logInfo("Sort changed to:", sort);
    }

    /**
     * Exports items in the specified format.
     *
     * @param format - "json" or "markdown"
     * @returns Serialised string
     */
    public export(format: "json" | "markdown"): string
    {
        return this.exportItems(format);
    }

    /**
     * Imports items from a markdown checklist string.
     *
     * @param markdown - Markdown checklist text
     * @returns Array of newly created items
     */
    public importMarkdown(markdown: string): ActionItem[]
    {
        return this.importMarkdownText(markdown);
    }

    /**
     * Scrolls to a specific item by ID.
     *
     * @param itemId - ID of the item to scroll to
     */
    public scrollToItem(itemId: string): void
    {
        if (!this.rootEl)
        {
            return;
        }

        const el = this.rootEl.querySelector(`[data-id="${itemId}"]`);

        if (el)
        {
            el.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
    }

    /**
     * Returns the root DOM element of the component.
     *
     * @returns Root element
     */
    public getElement(): HTMLElement
    {
        if (!this.rootEl)
        {
            throw new Error(`${LOG_PREFIX} Component not initialised`);
        }

        return this.rootEl;
    }

    /**
     * Destroys the component, removing all DOM elements and event handlers.
     */
    public destroy(): void
    {
        this.cleanup();
        this.destroyed = true;

        if (this.containerEl)
        {
            this.containerEl.innerHTML = "";
        }

        this.items = [];
        this.editingItems.clear();
        this.selectedIds.clear();
        this.expandedComments.clear();
        this.collapsedSections.clear();
        this.activeFilter = null;
        this.focusedItemId = null;
        this.dragState = null;
        this.rootEl = null;

        logInfo("Destroyed");
    }
}

// ============================================================================
// S8: FACTORY FUNCTION
// ============================================================================

/**
 * Factory function to create an ActionItems component instance.
 * Returns a handle with the public API for external interaction.
 *
 * @param container - Container element or ID string
 * @param options - Component configuration
 * @returns ActionItemsHandle for interacting with the component
 */
export function createActionItems(
    container: string | HTMLElement,
    options: Omit<ActionItemsOptions, "container"> = {}
): ActionItemsHandle
{
    const fullOptions: ActionItemsOptions =
    {
        ...options,
        container,
    };

    const instance = new ActionItems(fullOptions);

    return buildHandle(instance);
}

/**
 * Builds the public API handle from an ActionItems instance.
 * Delegates all methods to the instance.
 *
 * @param instance - ActionItems class instance
 * @returns Public API handle
 */
function buildHandle(instance: ActionItems): ActionItemsHandle
{
    return {
        addItem: (item) => instance.addItem(item),
        removeItem: (id) => instance.removeItem(id),
        updateItem: (id, changes) => instance.updateItem(id, changes),
        setAssignee: (id, person) => instance.setAssignee(id, person),
        setCommentCount: (id, count) => instance.setCommentCount(id, count),
        getItems: () => instance.getItems(),
        getItem: (id) => instance.getItem(id),
        getItemsByStatus: (status) => instance.getItemsByStatus(status),
        getSelectedIds: () => instance.getSelectedIds(),
        setSelection: (ids) => instance.setSelection(ids),
        clearSelection: () => instance.clearSelection(),
        toggleSection: (status, expanded) => instance.toggleSection(status, expanded),
        setFilter: (filter) => instance.setFilter(filter),
        clearFilters: () => instance.clearFilters(),
        setSort: (sort) => instance.setSort(sort),
        export: (format) => instance.export(format),
        importMarkdown: (md) => instance.importMarkdown(md),
        scrollToItem: (id) => instance.scrollToItem(id),
        getElement: () => instance.getElement(),
        destroy: () => instance.destroy(),
    };
}

// ============================================================================
// S9: WINDOW GLOBALS
// ============================================================================

(window as unknown as Record<string, unknown>)["ActionItems"] = ActionItems;
(window as unknown as Record<string, unknown>)["createActionItems"] = createActionItems;
