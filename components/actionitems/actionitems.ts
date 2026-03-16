/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: ActionItems
 * 📜 PURPOSE: A rich, stateful action item list with status lifecycle tracking,
 *    person assignments, priority badges, due dates, comment slots, tags,
 *    hierarchical numbering, inline editing, and section-based grouping.
 *    Phases 1 (Core) and 2 (Rich Features) of the spec.
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
            "allowCreate" | "defaultSort" | "placeholder" | "emptyMessage">
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

        console.log(LOG_PREFIX, "Initialised with", this.items.length, "items");
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
                console.error(LOG_PREFIX, "Container not found:", container);
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

        this.renderHeader();
        this.renderBody();
        this.renderFooter();

        this.containerEl.innerHTML = "";
        this.containerEl.appendChild(this.rootEl);
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

        this.rootEl.appendChild(header);
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
        }
        else if (this.options.groupByStatus)
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
        const statusOrder: ActionItemStatus[] = ["not-started", "in-progress", "done"];

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
        const tree = buildNumberedTree(this.items, [status], this.currentSort);
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
        const nonArchived: ActionItemStatus[] = ["not-started", "in-progress", "done"];
        const tree = buildNumberedTree(this.items, nonArchived, this.currentSort);
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
        const nonArchived: ActionItemStatus[] = ["not-started", "in-progress", "done"];
        const filtered = this.items.filter(i => nonArchived.includes(i.status));
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

        if (numbered.depth > 0)
        {
            row.classList.add(`${CLS}-sub-item`);
            row.style.paddingLeft = `${numbered.depth * 24}px`;
        }

        if (this.selectedIds.has(numbered.item.id))
        {
            row.classList.add(`${CLS}-selected`);
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

            if (input.value.trim() === "")
            {
                this.createNewItemAfter(itemId);
            }
        }
        else if (e.key === "Escape")
        {
            e.preventDefault();
            this.cancelEdit(itemId);
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

        console.log(LOG_PREFIX, "Created new item:", newItem.id);

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
        // Don't change selection if clicking interactive elements
        const target = e.target as HTMLElement;

        if (this.isInteractiveTarget(target))
        {
            return;
        }

        if (e.ctrlKey || e.metaKey)
        {
            this.toggleSelection(itemId);
        }
        else
        {
            this.setSelectionSingle(itemId);
        }
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
    // S7.16: PUBLIC API METHODS
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

        console.log(LOG_PREFIX, "Added item:", newItem.id);

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
            console.warn(LOG_PREFIX, "Item not found for removal:", itemId);
            return;
        }

        this.removeItemAndChildren(itemId);
        this.fireItemDelete(itemId);
        this.render();

        console.log(LOG_PREFIX, "Removed item:", itemId);
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
            console.warn(LOG_PREFIX, "Item not found for update:", itemId);
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
        this.rootEl = null;

        console.log(LOG_PREFIX, "Destroyed");
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
        getElement: () => instance.getElement(),
        destroy: () => instance.destroy(),
    };
}

// ============================================================================
// S9: WINDOW GLOBALS
// ============================================================================

(window as unknown as Record<string, unknown>)["ActionItems"] = ActionItems;
(window as unknown as Record<string, unknown>)["createActionItems"] = createActionItems;
