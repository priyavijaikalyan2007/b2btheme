/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: TreeGrid
 * 📜 PURPOSE: Enterprise tree grid with expandable rows, multi-column data and
 *    full ARIA support for the treegrid role.
 * 🔗 RELATES: [[DataGrid]], [[TreeView]], [[EnterpriseTheme]]
 * ⚡ FLOW: [createTreeGrid] -> [flatten rows] -> [render] -> [ARIA wiring]
 * ----------------------------------------------------------------------------
 */

// ============================================================================
// S1: Types, Interfaces, Constants
// ============================================================================

/**
 * Selection mode for the tree grid.
 */
export type TreeGridSelectionMode = "single" | "multi" | "none";

/**
 * Sort direction for columns.
 */
export type TreeGridSortDirection = "asc" | "desc";

/**
 * Drop position for drag-and-drop operations.
 */
export type DropPosition = "before" | "inside" | "after";

/**
 * Editor type for inline editing.
 */
export type TreeGridEditorType = "text" | "number" | "select" | "date" | "custom";

/**
 * Column definition for the tree grid.
 */
export interface TreeGridColumn
{
    id: string;
    label: string;
    width?: number;
    minWidth?: number;
    maxWidth?: number;
    resizable?: boolean;
    sortable?: boolean;
    sortDirection?: TreeGridSortDirection;
    /** Custom comparator for sorting. Receives raw cell values; return negative/zero/positive. */
    comparator?: (a: unknown, b: unknown) => number;
    valueAccessor?: (data: Record<string, unknown>) => unknown;
    renderer?: (cell: HTMLElement, node: TreeGridNode, value: unknown) => void;
    editable?: boolean;
    editorType?: TreeGridEditorType;
    editorOptions?: Array<{ value: string; label: string }>;
    align?: "left" | "center" | "right";
    hidden?: boolean;
    cssClass?: string;
    aggregate?: (values: unknown[]) => unknown;
}

/**
 * Tree node with associated data for grid columns.
 */
export interface TreeGridNode
{
    id: string;
    label: string;
    icon?: string;
    /** The row's values for the data columns, keyed by column id. */
    data?: Record<string, unknown>;
    children?: TreeGridNode[] | null;
    expanded?: boolean;
    lazy?: boolean;
    selectable?: boolean;
    draggable?: boolean;
    disabled?: boolean;
    tooltip?: string;
}

/**
 * Context menu item definition.
 */
export interface TreeGridContextMenuItem
{
    id: string;
    label: string;
    icon?: string;
    shortcutHint?: string;
    disabled?: boolean;
    separator?: boolean;
}

/**
 * Configuration options for the TreeGrid component.
 */
export interface TreeGridOptions
{
    containerId: string;
    /** Required. The grid's accessible name, set as aria-label on the treegrid element. */
    label: string;
    /** Required. The root nodes; each may nest children. An empty array shows emptyMessage. */
    nodes: TreeGridNode[];
    /** Required. The data columns shown to the right of the tree column; may be empty. */
    columns: TreeGridColumn[];
    /** Header text of the tree (first) column. Default "Name". */
    treeColumnLabel?: string;
    /** Initial width of the tree column in pixels. Default 300. */
    treeColumnWidth?: number;
    /** Minimum width in pixels the tree column can be resized to. Default 120. */
    treeColumnMinWidth?: number;
    /** Whether the user can drag the tree column's header edge to resize it. Default true. */
    treeColumnResizable?: boolean;
    /** "single" (default), "multi" (Ctrl/Cmd+click toggles, Shift+click ranges, Ctrl+A all) or "none". */
    selectionMode?: TreeGridSelectionMode;
    /** Lets the user drag rows onto other rows (before, inside or after) and fires onDrop. Default false. */
    enableDragDrop?: boolean;
    /** Lets the user drag data column headers to reorder the columns. Default false. */
    enableColumnReorder?: boolean;
    /** When true, the grid does not sort internally. The app must sort
     *  the data in the onColumnSort callback and call refresh(). */
    externalSort?: boolean;
    /** Shows contextMenuItems on right-click of a row. Default false. */
    enableContextMenu?: boolean;
    /** Adds a header button that opens a checklist to show or hide data columns. Default false. */
    showColumnPicker?: boolean;
    /** The right-click menu items, used when enableContextMenu is true; no menu opens when empty. Default none. */
    contextMenuItems?: TreeGridContextMenuItem[];
    /** Indent in pixels per tree level in the tree column. Default 20. */
    indentPx?: number;
    /** Zebra-stripes alternate rows. Rows are striped at render unless false; re-striping after expand/collapse
     *  happens only when true. */
    rowStriping?: boolean;
    /** Not applied yet; the header is always sticky (treegrid.scss). */
    stickyHeader?: boolean;
    /** Row height in pixels for virtual scrolling (sets each virtual row's height) and scrollToNode; normal
     *  rows keep the stylesheet height. Default 32. */
    rowHeight?: number;
    /** CSS height of the grid root, such as "400px". Default "100%". */
    height?: string;
    /** CSS width of the grid root. Default "100%". */
    width?: string;
    /** Extra CSS class added to the grid root. Default none. */
    cssClass?: string;
    /** Text shown when there are no nodes. Default "No data to display". */
    emptyMessage?: string;
    /** "auto" (default) renders only the visible rows above 5000 nodes; "enabled" always does; "disabled" never. */
    virtualScrolling?: "auto" | "enabled" | "disabled";
    /** Extra rows rendered above and below the viewport when virtual scrolling. Default 50. */
    scrollBuffer?: number;
    onRowSelect?: (node: TreeGridNode, selected: boolean) => void;
    onSelectionChange?: (nodes: TreeGridNode[]) => void;
    onRowActivate?: (node: TreeGridNode) => void;
    onRowToggle?: (node: TreeGridNode, expanded: boolean) => void;
    onLoadChildren?: (node: TreeGridNode) => Promise<TreeGridNode[]>;
    onColumnResize?: (column: TreeGridColumn, newWidth: number) => void;
    onColumnReorder?: (columns: TreeGridColumn[]) => void;
    onColumnSort?: (column: TreeGridColumn, direction: TreeGridSortDirection) => void;
    onEditStart?: (node: TreeGridNode, column: TreeGridColumn, currentValue: unknown) => boolean | void;
    onEditCommit?: (node: TreeGridNode, column: TreeGridColumn, oldValue: unknown, newValue: unknown) => void;
    onEditCancel?: (node: TreeGridNode, column: TreeGridColumn) => void;
    onContextMenuAction?: (actionId: string, node: TreeGridNode) => void;
    onDragValidate?: (sources: TreeGridNode[], target: TreeGridNode, position: DropPosition) => boolean;
    onDrop?: (sources: TreeGridNode[], target: TreeGridNode, position: DropPosition) => void;
    onExternalDrop?: (dataTransfer: DataTransfer, target: TreeGridNode, position: DropPosition) => void;
    onRefreshComplete?: () => void;

    /** Override default key combos. Keys are action names, values are combo strings. */
    keyBindings?: Partial<Record<string, string>>;
}

/**
 * Internal visible entry with level and position metadata.
 */
interface VisibleEntry
{
    node: TreeGridNode;
    level: number;
    index: number;
    setSize: number;
    posInSet: number;
}

/**
 * Focus coordinate for cell-based navigation.
 */
interface FocusCoord
{
    row: number;
    col: number;
}

/**
 * Virtual scrolling state (Phase 5).
 */
interface VirtualScrollState
{
    startIndex: number;
    endIndex: number;
    topSpacer: HTMLElement;
    bottomSpacer: HTMLElement;
    viewportEl: HTMLElement;
    renderedRows: Map<number, HTMLElement>;
    recyclePool: HTMLElement[];
    scrollPending: boolean;
    rafHandle: number;
}

// Constants
const LOG_PREFIX = "[TreeGrid]";
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

const DEFAULT_ROW_HEIGHT = 32;
const DEFAULT_TREE_COL_WIDTH = 300;
const DEFAULT_TREE_COL_MIN_WIDTH = 120;
const DEFAULT_COL_WIDTH = 180;
const DEFAULT_COL_MIN_WIDTH = 60;
const DEFAULT_INDENT_PX = 20;
const DEFAULT_SCROLL_BUFFER = 50;
const VIRTUAL_THRESHOLD = 5000;
const DND_MIME = "application/x-treegrid";
const Z_CONTEXT_MENU = 1050;

let instanceCounter = 0;

/** Default keyboard bindings for grid navigation actions (KEYBOARD.md S3). */
const DEFAULT_KEY_BINDINGS: Record<string, string> = {
    "moveUp": "ArrowUp",
    "moveDown": "ArrowDown",
    "moveLeft": "ArrowLeft",
    "moveRight": "ArrowRight",
    "expand": "ArrowRight",
    "collapse": "ArrowLeft",
    "toggleSelect": " ",
    "editCell": "Enter",
    "rename": "F2",
    "home": "Home",
    "end": "End",
    "delete": "Delete",
    "selectAll": "Ctrl+a",
};

// ============================================================================
// S2: DOM Helpers
// ============================================================================

/**
 * Creates an HTML element with optional CSS classes and text content.
 * Uses textContent exclusively for XSS safety.
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
 * Sets an attribute on an element.
 */
function setAttr(el: HTMLElement, name: string, value: string | number | boolean): void
{
    el.setAttribute(name, String(value));
}

/**
 * Removes an attribute from an element.
 */
function removeAttr(el: HTMLElement, name: string): void
{
    el.removeAttribute(name);
}

/**
 * Clamps a value between min and max.
 */
// `clamp` LEFT ON 2026-10-21 (UNUSED-1): a one-line helper with no
// caller in this module.

// ============================================================================
// S3: Internal Helpers
// ============================================================================

/**
 * Filters columns to return only visible (non-hidden) columns.
 */
function getVisibleColumns(columns: TreeGridColumn[]): TreeGridColumn[]
{
    return columns.filter((col) => !col.hidden);
}

/**
 * Retrieves cell value using column's valueAccessor or node.data[column.id].
 */
function getCellValue(node: TreeGridNode, column: TreeGridColumn): unknown
{
    if (column.valueAccessor)
    {
        const data = node.data || {};
        return column.valueAccessor(data);
    }
    if (node.data && column.id in node.data)
    {
        return node.data[column.id];
    }
    return undefined;
}

/**
 * Formats a cell value for display as a string.
 */
function formatCellValue(value: unknown): string
{
    if (value === null || value === undefined)
    {
        return "";
    }
    if (typeof value === "string")
    {
        return value;
    }
    if (typeof value === "number" || typeof value === "boolean")
    {
        return String(value);
    }
    return JSON.stringify(value);
}

/**
 * Checks if a node is a parent (has children or is lazy-loadable).
 */
function isNodeParent(node: TreeGridNode): boolean
{
    return (node.children !== null && node.children !== undefined) || node.lazy === true;
}

/**
 * Sorts an array of nodes by column value and direction.
 * Returns a new sorted array without mutating the original.
 */
/**
 * Default comparator: type-aware (numbers numerically, strings lexicographically).
 * Nulls/undefined sort to the end regardless of direction.
 */
function defaultCompare(a: unknown, b: unknown): number
{
    if (a == null && b == null)
    {
        return 0;
    }
    if (a == null)
    {
        return 1;
    }
    if (b == null)
    {
        return -1;
    }
    if (typeof a === "number" && typeof b === "number")
    {
        return a - b;
    }
    const strA = String(a).toLowerCase();
    const strB = String(b).toLowerCase();
    if (strA < strB)
    {
        return -1;
    }
    if (strA > strB)
    {
        return 1;
    }
    return 0;
}

function sortNodes(
    nodes: TreeGridNode[],
    column: TreeGridColumn,
    direction: TreeGridSortDirection
): TreeGridNode[]
{
    const cmp = column.comparator ?? defaultCompare;
    const copy = [...nodes];
    copy.sort((a, b) =>
    {
        const valA = getCellValue(a, column);
        const valB = getCellValue(b, column);
        const result = cmp(valA, valB);
        return direction === "asc" ? result : -result;
    });
    return copy;
}

// ============================================================================
// S4: TreeGrid Class Shell + Constructor
// ============================================================================

/**
 * TreeGrid component with multi-column data display and ARIA support.
 */
/**
 * The TreeGrid surface a factory caller receives.
 *
 * PAT-1. `implements` below is what keeps this in step with the
 * class: remove a member there and the typecheck fails here. Adding
 * one to the class does NOT add it here, which is the point — a new
 * method is API when somebody writes it into this interface.
 */
export interface TreeGridHandle
{
    refresh(): void;
    destroy(): void;
    addNode(node: TreeGridNode, parentId: string | null): void;
    removeNode(nodeId: string): void;
    updateNode(nodeId: string, updates: Partial<TreeGridNode>): void;
    setNodes(nodes: TreeGridNode[]): void;
    getNode(nodeId: string): TreeGridNode | undefined;
    setColumns(columns: TreeGridColumn[]): void;
    showColumn(columnId: string): void;
    hideColumn(columnId: string): void;
    updateColumn(columnId: string, updates: Partial<TreeGridColumn>): void;
    getColumns(): TreeGridColumn[];
    getSelectedNodes(): TreeGridNode[];
    selectNode(nodeId: string): void;
    deselectNode(nodeId: string): void;
    clearSelection(): void;
    expandNode(nodeId: string): void;
    collapseNode(nodeId: string): void;
    expandAll(): void;
    collapseAll(): void;
    focusCell(row: number, col: number): void;
    scrollToNode(nodeId: string): void;
    getElement(): HTMLElement | null;
    getId(): string;

    /** The surface contract (additive): TreeGrid has no data slots, so this throws. Use setNodes() and friends. */
    setData(slot: string, value: unknown): void;
    /**
     * Subscribes to "selection", "activate", "editCommit", "contextMenuAction" or "drop"; any other channel
     * throws. Each fires after its legacy callback, and without it. Returns the unsubscribe.
     */
    on(channel: string, handler: (payload: unknown) => void): () => void;
    /** { expanded, selection }: the ids of the expanded nodes and of the selected nodes. */
    getState(): Record<string, unknown>;
    /**
     * Silently (no callback, no channel) expands exactly state.expanded and selects exactly state.selection, when
     * present. An unloaded lazy node starts its async load and joins expanded when it completes.
     */
    setState(state: Record<string, unknown>): void;
}

/** The channels on() accepts (surface contract, B6). */
const SURFACE_CHANNELS = ["selection", "activate", "editCommit", "contextMenuAction", "drop"] as const;
type SurfaceChannel = typeof SURFACE_CHANNELS[number];

/**
 * A JSON-safe copy of a node for a channel payload: every field except children and data, which may be large or
 * hold non-JSON values.
 */
function toNodeSummary(node: TreeGridNode): Record<string, unknown>
{
    const { children: _children, data: _data, ...summary } = node;
    return summary;
}

export class TreeGrid implements TreeGridHandle
{
    /*
     * FN-3. EVERY FIELD WITH A FIXED STARTING VALUE DECLARES IT HERE.
     *
     * The constructor used to be 60 lines, and 45 of them were
     * `this.x = new Set()` / `= null` / `= false` — assignments that
     * depend on nothing, in a method whose job is to depend on the
     * options. Extracting them into an `initState()` helper was the
     * obvious move and `strict` forbids it: TypeScript does not follow
     * assignment into a called method, so every field would have needed
     * a `!` and the type system would have been told to stop checking.
     *
     * A declaration initialiser is where an unconditional starting
     * value belongs anyway. What is left in the constructor is what
     * actually reads `options`.
     */
    private options: TreeGridOptions;
    private columns: TreeGridColumn[];
    private roots: TreeGridNode[];
    private expandedIds = new Set<string>();
    private selectedIds = new Set<string>();
    private loadingIds = new Set<string>();
    private focusCoord: FocusCoord = { row: -1, col: 0 };
    private sortColumnId: string | null = null;
    private sortDirection: TreeGridSortDirection | null = null;
    private isEditing = false;
    private destroyed = false;

    // Surface contract channel subscribers, one Set per declared channel (B6)
    private readonly channelHandlers = new Map<string, Set<(payload: unknown) => void>>(
        SURFACE_CHANNELS.map((channel) => [channel, new Set()]));

    // DOM references
    private containerEl: HTMLElement | null = null;
    private rootEl: HTMLElement | null = null;
    private headerEl: HTMLElement | null = null;
    private bodyEl: HTMLElement | null = null;
    private contextMenuEl: HTMLElement | null = null;
    private columnPickerEl: HTMLElement | null = null;

    // Row tracking
    private rowMap = new Map<string, HTMLElement>();

    // Bound handlers. Arrow initialisers capture `this` the same way the
    // constructor's wrappers did, and keep the binding beside the field.
    private boundOnDocumentClick =
        (e: MouseEvent): void => { this.onDocumentClick(e); };
    private boundOnDocumentKeydown =
        (e: KeyboardEvent): void => { this.onDocumentKeydown(e); };
    private boundOnBodyScroll =
        (e: Event): void => { this.onBodyScroll(e); };

    // Column width tracking
    private treeColWidth: number;
    private columnWidths = new Map<string, number>();

    // Node indexing
    private nodeMap = new Map<string, TreeGridNode>();
    private parentMap = new Map<string, string>();

    // Cached visible nodes
    private visibleNodes: VisibleEntry[] = [];
    private visibleIndexMap = new Map<string, number>();
    private visibleDirty = true;

    // Virtual scrolling (Phase 5)
    private virtualState: VirtualScrollState | null = null;

    // Selection tracking
    private lastSelectedId: string | null = null;

    // Column resize state
    private resizeColId: string | null = null;
    private resizeStartX = 0;
    private resizeStartWidth = 0;
    private resizeCell: HTMLElement | null = null;
    private boundOnResizeMove: ((e: PointerEvent) => void) | null = null;
    private boundOnResizeEnd: ((e: PointerEvent) => void) | null = null;

    // Column reorder state
    private reorderSourceId: string | null = null;

    // Cell editing state
    private editNodeId: string | null = null;
    private editColumnId: string | null = null;
    private editEditorEl: HTMLElement | null = null;

    // PERF: CSS-based column widths
    private columnStyleEl: HTMLStyleElement | null = null;
    private instanceId: number;

    /**
     * Constructs a new TreeGrid instance.
     */
    constructor(options: TreeGridOptions)
    {
        instanceCounter++;
        logInfo(`Creating instance #${instanceCounter}`);
        this.instanceId = instanceCounter;

        this.options = this.deepCopyOptions(options);
        this.columns = this.deepCopyColumns(options.columns);
        this.roots = this.options.nodes;
        this.treeColWidth = options.treeColumnWidth ?? DEFAULT_TREE_COL_WIDTH;

        this.resolveColumnDefaults();
        this.initExpandedIds();
        this.rebuildNodeIndex();
        this.render();
    }

    /**
     * Deep-copies the options object.
     */
    private deepCopyOptions(options: TreeGridOptions): TreeGridOptions
    {
        return { ...options };
    }

    /**
     * Deep-copies the columns array.
     */
    private deepCopyColumns(columns: TreeGridColumn[]): TreeGridColumn[]
    {
        return columns.map((col) => ({ ...col }));
    }

    /**
     * Resolves default values for columns and stores widths.
     */
    private resolveColumnDefaults(): void
    {
        for (const col of this.columns)
        {
            if (col.width === undefined)
            {
                col.width = DEFAULT_COL_WIDTH;
            }
            if (col.minWidth === undefined)
            {
                col.minWidth = DEFAULT_COL_MIN_WIDTH;
            }
            if (col.resizable === undefined)
            {
                col.resizable = true;
            }
            if (col.sortable === undefined)
            {
                col.sortable = false;
            }
            if (col.editable === undefined)
            {
                col.editable = false;
            }
            if (col.hidden === undefined)
            {
                col.hidden = false;
            }
            this.columnWidths.set(col.id, col.width);
        }
    }

    /**
     * Initializes expandedIds from nodes with expanded: true.
     */
    private initExpandedIds(): void
    {
        const stack: TreeGridNode[] = [...this.roots];
        while (stack.length > 0)
        {
            const node = stack.pop()!;
            if (node.expanded === true)
            {
                this.expandedIds.add(node.id);
            }
            if (node.children)
            {
                stack.push(...node.children);
            }
        }
    }

    // ============================================================================
    // S4b: Node Index Maps
    // ============================================================================

    /**
     * Rebuilds the node and parent index maps via iterative DFS.
     */
    private rebuildNodeIndex(): void
    {
        this.nodeMap.clear();
        this.parentMap.clear();
        const stack: Array<{ node: TreeGridNode; parentId: string | null }> = [];
        for (let i = this.roots.length - 1; i >= 0; i--)
        {
            stack.push({ node: this.roots[i], parentId: null });
        }
        while (stack.length > 0)
        {
            const { node, parentId } = stack.pop()!;
            this.nodeMap.set(node.id, node);
            if (parentId !== null)
            {
                this.parentMap.set(node.id, parentId);
            }
            if (node.children)
            {
                for (let i = node.children.length - 1; i >= 0; i--)
                {
                    stack.push({ node: node.children[i], parentId: node.id });
                }
            }
        }
    }

    /**
     * Inserts a node into the index maps.
     */
    private insertIntoIndex(node: TreeGridNode, parentId: string | null): void
    {
        this.nodeMap.set(node.id, node);
        if (parentId !== null)
        {
            this.parentMap.set(node.id, parentId);
        }
        if (node.children)
        {
            for (const child of node.children)
            {
                this.insertIntoIndex(child, node.id);
            }
        }
    }

    /**
     * Removes a node from the index maps recursively.
     */
    private removeFromIndex(nodeId: string): void
    {
        const node = this.nodeMap.get(nodeId);
        if (!node)
        {
            return;
        }
        if (node.children)
        {
            for (const child of node.children)
            {
                this.removeFromIndex(child.id);
            }
        }
        this.nodeMap.delete(nodeId);
        this.parentMap.delete(nodeId);
    }

    /**
     * Checks if ancestorId is an ancestor of nodeId.
     */
    private isAncestorOf(ancestorId: string, nodeId: string): boolean
    {
        let current = nodeId;
        while (this.parentMap.has(current))
        {
            current = this.parentMap.get(current)!;
            if (current === ancestorId)
            {
                return true;
            }
        }
        return false;
    }

    // ============================================================================
    // S4c: Cached Visible Array
    // ============================================================================

    /**
     * Returns the cached visible nodes array, rebuilding if dirty.
     */
    private getVisibleNodes(): VisibleEntry[]
    {
        if (!this.visibleDirty)
        {
            return this.visibleNodes;
        }
        this.visibleNodes = [];
        this.visibleIndexMap.clear();
        let globalIndex = 0;
        const stack: Array<{ node: TreeGridNode; level: number; siblingList: TreeGridNode[] }> = [];
        for (let i = this.roots.length - 1; i >= 0; i--)
        {
            stack.push({ node: this.roots[i], level: 1, siblingList: this.roots });
        }
        while (stack.length > 0)
        {
            const { node, level, siblingList } = stack.pop()!;
            const setSize = siblingList.length;
            const posInSet = siblingList.indexOf(node) + 1;
            const entry: VisibleEntry = { node, level, index: globalIndex, setSize, posInSet };
            this.visibleNodes.push(entry);
            this.visibleIndexMap.set(node.id, globalIndex);
            globalIndex++;
            const isExpanded = this.expandedIds.has(node.id);
            if (isExpanded && node.children && node.children.length > 0)
            {
                for (let i = node.children.length - 1; i >= 0; i--)
                {
                    stack.push({ node: node.children[i], level: level + 1, siblingList: node.children });
                }
            }
        }
        this.visibleDirty = false;
        return this.visibleNodes;
    }

    /**
     * Invalidates the visible cache.
     */
    private invalidateVisibleCache(): void
    {
        this.visibleDirty = true;
    }

    // ============================================================================
    // S5: Lifecycle
    // ============================================================================

    /**
     * Renders the tree grid into the container.
     */
    private render(): void
    {
        const container = document.getElementById(this.options.containerId);

        // ERR-1. This used to log and return, which left a handle whose
        // every method operated on a grid that was never in the document.
        if (!container)
        {
            throw new Error(
                `${LOG_PREFIX} Container "${this.options.containerId}" was not found. `
                + "Insert the element before creating the grid.");
        }
        this.containerEl = container;
        this.rootEl = this.buildRoot();
        container.appendChild(this.rootEl);
        document.addEventListener("click", this.boundOnDocumentClick);
        document.addEventListener("keydown", this.boundOnDocumentKeydown);
    }

    /**
     * Refreshes the tree grid, preserving scroll and focus.
     */
    public refresh(): void
    {
        if (this.destroyed || !this.bodyEl)
        {
            return;
        }
        const scrollTop = this.bodyEl.scrollTop;
        this.rowMap.clear();
        this.invalidateVisibleCache();
        if (this.rootEl && this.containerEl)
        {
            this.containerEl.removeChild(this.rootEl);
        }
        this.rootEl = this.buildRoot();
        if (this.containerEl)
        {
            this.containerEl.appendChild(this.rootEl);
        }
        if (this.bodyEl)
        {
            this.bodyEl.scrollTop = scrollTop;
        }
        if (this.options.onRefreshComplete)
        {
            this.options.onRefreshComplete();
        }
    }

    /**
     * Destroys the tree grid, removing DOM and listeners.
     */
    public destroy(): void
    {
        if (this.destroyed)
        {
            return;
        }
        logInfo("Destroying instance");
        for (const handlers of this.channelHandlers.values())
        {
            handlers.clear();
        }
        document.removeEventListener("click", this.boundOnDocumentClick);
        document.removeEventListener("keydown", this.boundOnDocumentKeydown);
        if (this.bodyEl)
        {
            this.bodyEl.removeEventListener("scroll", this.boundOnBodyScroll);
        }
        if (this.columnStyleEl)
        {
            this.columnStyleEl.remove();
            this.columnStyleEl = null;
        }
        this.dismissColumnPicker();
        this.dismissContextMenu();
        if (this.rootEl && this.containerEl)
        {
            this.containerEl.removeChild(this.rootEl);
        }
        this.rowMap.clear();
        this.nodeMap.clear();
        this.parentMap.clear();
        this.visibleNodes = [];
        this.visibleIndexMap.clear();
        this.destroyed = true;
    }

    // ============================================================================
    // S6: DOM Building
    // ============================================================================

    /**
     * Builds the root tree grid element.
     */
    private buildRoot(): HTMLElement
    {
        const root = createElement("div", ["treegrid", `treegrid-inst-${this.instanceId}`]);
        setAttr(root, "role", "treegrid");
        setAttr(root, "aria-label", this.options.label);
        if (this.options.cssClass)
        {
            root.classList.add(this.options.cssClass);
        }
        const height = this.options.height ?? "100%";
        const width = this.options.width ?? "100%";
        root.style.height = height;
        root.style.width = width;
        this.headerEl = this.buildHeader();
        this.buildBody();
        this.attachBodyListeners();
        this.attachResizeListeners();
        this.attachHeaderDragListeners();
        this.attachSortListeners();
        this.updateColumnStyles();
        const headerGroup = createElement("div", ["treegrid-header-group"]);
        setAttr(headerGroup, "role", "rowgroup");
        headerGroup.appendChild(this.headerEl);
        root.appendChild(headerGroup);
        root.appendChild(this.bodyEl!);
        return root;
    }

    /**
     * Builds the header row with tree column and data columns.
     */
    private buildHeader(): HTMLElement
    {
        const header = createElement("div", ["treegrid-header"]);
        setAttr(header, "role", "row");
        const treeCell = this.buildHeaderTreeCell();
        header.appendChild(treeCell);
        const visibleCols = getVisibleColumns(this.columns);
        for (const col of visibleCols)
        {
            const dataCell = this.buildHeaderDataCell(col);
            header.appendChild(dataCell);
        }
        if (this.options.showColumnPicker)
        {
            const pickerCell = createElement(
                "div", ["treegrid-header-cell", "treegrid-picker-cell"]
            );
            setAttr(pickerCell, "role", "columnheader");
            pickerCell.appendChild(this.buildColumnPickerButton());
            header.appendChild(pickerCell);
        }
        return header;
    }

    /**
     * Builds the tree column header cell.
     */
    private buildHeaderTreeCell(): HTMLElement
    {
        const cell = createElement("div", ["treegrid-header-cell", "treegrid-tree-col"]);
        setAttr(cell, "role", "columnheader");
        setAttr(cell, "data-column-id", "__tree__");
        cell.style.position = "sticky";
        cell.style.left = "0";
        cell.style.zIndex = "3";
        const label = this.options.treeColumnLabel ?? "Name";
        const labelSpan = createElement("span", ["treegrid-header-label"], label);
        cell.appendChild(labelSpan);
        const resizable = this.options.treeColumnResizable ?? true;
        if (resizable)
        {
            const handle = createElement("div", ["treegrid-resize-handle"]);
            setAttr(handle, "draggable", "false");
            cell.appendChild(handle);
        }
        return cell;
    }

    /**
     * Builds a data column header cell.
     */
    private buildHeaderDataCell(column: TreeGridColumn): HTMLElement
    {
        const cell = createElement("div", ["treegrid-header-cell"]);
        setAttr(cell, "role", "columnheader");
        setAttr(cell, "data-column-id", column.id);
        const labelSpan = createElement("span", ["treegrid-header-label"], column.label);
        cell.appendChild(labelSpan);
        if (column.sortable)
        {
            const sortIcon = createElement("span", ["treegrid-sort-icon"]);
            cell.appendChild(sortIcon);
        }
        if (column.resizable)
        {
            const handle = createElement("div", ["treegrid-resize-handle"]);
            setAttr(handle, "draggable", "false");
            cell.appendChild(handle);
        }
        return cell;
    }

    /**
     * Builds the body element and renders tree content.
     */
    private buildBody(): HTMLElement
    {
        this.bodyEl = createElement("div", ["treegrid-body"]);
        // Canvas anchors name this region rather than counting it (ADR-162).
        this.bodyEl.setAttribute("data-dui-region", "treegrid:body");
        setAttr(this.bodyEl, "role", "rowgroup");
        this.bodyEl.addEventListener("scroll", this.boundOnBodyScroll);
        this.renderTree();
        return this.bodyEl;
    }

    /**
     * Renders the tree content, routing to virtual or non-virtual rendering.
     */
    private renderTree(): void
    {
        if (!this.bodyEl)
        {
            return;
        }
        const virtualMode = this.options.virtualScrolling ?? "auto";
        const totalNodes = this.nodeMap.size;
        const shouldUseVirtual =
            virtualMode === "enabled" || (virtualMode === "auto" && totalNodes > VIRTUAL_THRESHOLD);
        if (shouldUseVirtual)
        {
            this.buildBodyVirtual();
        }
        else
        {
            this.buildBodyContent();
        }
        // Reapply inline column widths to the newly created cells.
        this.updateColumnStyles();
    }

    /**
     * Builds the body content with all visible rows.
     */
    private buildBodyContent(): void
    {
        if (!this.bodyEl)
        {
            return;
        }
        this.bodyEl.textContent = "";
        const visibleEntries = this.getVisibleNodes();
        if (visibleEntries.length === 0)
        {
            const emptyEl = this.buildEmptyState();
            this.bodyEl.appendChild(emptyEl);
            return;
        }
        for (const entry of visibleEntries)
        {
            const rowEl = this.buildRow(entry);
            // Render aggregate values for parent nodes
            if (entry.node.children && entry.node.children.length > 0)
            {
                this.renderAggregateRow(rowEl, entry.node);
            }
            this.bodyEl.appendChild(rowEl);
        }
        this.applyRowStriping();
    }

    // ============================================================================
    // S7: Row Rendering
    // ============================================================================

    /**
     * Builds a single row element for a visible entry.
     */
    private buildRow(entry: VisibleEntry): HTMLElement
    {
        const { node, level, index, setSize, posInSet } = entry;
        const row = createElement("div", ["treegrid-row"]);
        setAttr(row, "role", "row");
        setAttr(row, "data-node-id", node.id);
        setAttr(row, "aria-level", level);
        setAttr(row, "aria-setsize", setSize);
        setAttr(row, "aria-posinset", posInSet);
        if (isNodeParent(node))
        {
            const isExpanded = this.expandedIds.has(node.id);
            setAttr(row, "aria-expanded", isExpanded);
        }
        if (this.selectedIds.has(node.id))
        {
            row.classList.add("treegrid-row-selected");
            setAttr(row, "aria-selected", "true");
        }
        if (this.options.enableDragDrop && node.draggable !== false)
        {
            row.setAttribute("draggable", "true");
        }
        if (this.options.rowStriping !== false && index % 2 === 1)
        {
            row.classList.add("treegrid-row-striped");
        }
        const treeCell = this.buildTreeCell(entry);
        row.appendChild(treeCell);
        const dataCells = this.buildDataCells(entry);
        for (const cell of dataCells)
        {
            row.appendChild(cell);
        }
        this.rowMap.set(node.id, row);
        return row;
    }

    /**
     * Builds the tree column cell for a row.
     */
    private buildTreeCell(entry: VisibleEntry): HTMLElement
    {
        const { node, level } = entry;
        const cell = createElement("div", ["treegrid-cell", "treegrid-tree-col"]);
        setAttr(cell, "role", "gridcell");
        cell.style.position = "sticky";
        cell.style.left = "0";
        cell.style.zIndex = "1";
        const isFocused = this.focusCoord.row === entry.index && this.focusCoord.col === 0;
        setAttr(cell, "tabindex", isFocused ? "0" : "-1");
        const indentSpacer = this.buildIndentSpacer(level);
        cell.appendChild(indentSpacer);
        if (isNodeParent(node))
        {
            const isExpanded = this.expandedIds.has(node.id);
            const toggleBtn = this.buildToggleButton(node, isExpanded);
            cell.appendChild(toggleBtn);
        }
        else
        {
            const spacer = this.buildToggleSpacer();
            cell.appendChild(spacer);
        }
        if (node.icon)
        {
            const icon = this.buildNodeIcon(node);
            cell.appendChild(icon);
        }
        const label = this.buildNodeLabel(node);
        cell.appendChild(label);
        return cell;
    }

    /**
     * Builds an indent spacer for a given level.
     */
    private buildIndentSpacer(level: number): HTMLElement
    {
        const spacer = createElement("span", ["treegrid-indent-spacer"]);
        const indentPx = this.options.indentPx ?? DEFAULT_INDENT_PX;
        const width = (level - 1) * indentPx;
        spacer.style.width = `${width}px`;
        return spacer;
    }

    /**
     * Builds a toggle button for expandable nodes.
     */
    private buildToggleButton(node: TreeGridNode, isExpanded: boolean): HTMLElement
    {
        const btn = createElement("button", ["treegrid-toggle"]);
        setAttr(btn, "type", "button");
        setAttr(btn, "aria-label", isExpanded ? "Collapse" : "Expand");
        if (this.loadingIds.has(node.id))
        {
            const spinner = createElement("i", ["spinner-border", "spinner-border-sm"]);
            btn.appendChild(spinner);
        }
        else
        {
            const iconClass = isExpanded ? "bi bi-chevron-down" : "bi bi-chevron-right";
            const icon = createElement("i", iconClass.split(" "));
            btn.appendChild(icon);
        }
        return btn;
    }

    /**
     * Builds a spacer for leaf nodes (no toggle button).
     */
    private buildToggleSpacer(): HTMLElement
    {
        return createElement("span", ["treegrid-toggle-spacer"]);
    }

    /**
     * Builds an icon element for a node.
     */
    private buildNodeIcon(node: TreeGridNode): HTMLElement
    {
        const iconSpan = createElement("span", ["treegrid-icon"]);
        const iconClass = node.icon ? `bi ${node.icon}` : "";
        const icon = createElement("i", iconClass ? iconClass.split(" ") : []);
        iconSpan.appendChild(icon);
        return iconSpan;
    }

    /**
     * Builds a label element for a node.
     */
    private buildNodeLabel(node: TreeGridNode): HTMLElement
    {
        return createElement("span", ["treegrid-label"], node.label);
    }

    /**
     * Builds data cells for all visible columns.
     */
    private buildDataCells(entry: VisibleEntry): HTMLElement[]
    {
        const cells: HTMLElement[] = [];
        const visibleCols = getVisibleColumns(this.columns);
        for (let i = 0; i < visibleCols.length; i++)
        {
            const col = visibleCols[i];
            const cell = this.buildDataCell(entry, col, i + 1);
            cells.push(cell);
        }
        return cells;
    }

    /**
     * Builds a single data cell for a column.
     */
    private buildDataCell(entry: VisibleEntry, column: TreeGridColumn, colIndex: number): HTMLElement
    {
        const cell = createElement("div", ["treegrid-cell"]);
        setAttr(cell, "role", "gridcell");
        if (column.align)
        {
            cell.style.textAlign = column.align;
        }
        const isFocused = this.focusCoord.row === entry.index && this.focusCoord.col === colIndex;
        setAttr(cell, "tabindex", isFocused ? "0" : "-1");
        if (column.cssClass)
        {
            cell.classList.add(column.cssClass);
        }
        const value = getCellValue(entry.node, column);
        if (column.renderer)
        {
            column.renderer(cell, entry.node, value);
        }
        else
        {
            const valueSpan = createElement("span", ["treegrid-cell-value"], formatCellValue(value));
            cell.appendChild(valueSpan);
        }
        return cell;
    }

    /**
     * Builds the empty state element.
     */
    private buildEmptyState(): HTMLElement
    {
        const msg = this.options.emptyMessage ?? "No data to display";
        return createElement("div", ["treegrid-empty"], msg);
    }

    // ========================================================================
    // S8: SELECTION
    // ========================================================================

    /**
     * Handles a click on a row for selection purposes.
     */
    private onRowClick(node: TreeGridNode, e: MouseEvent): void
    {
        if (node.disabled || node.selectable === false)
        {
            return;
        }

        const mode = this.options.selectionMode ?? "single";

        if (mode === "none")
        {
            return;
        }

        if (mode === "multi" && e.shiftKey && this.lastSelectedId)
        {
            this.rangeSelect(this.lastSelectedId, node.id);
        }
        else if (mode === "multi" && (e.ctrlKey || e.metaKey))
        {
            this.toggleSelect(node.id);
        }
        else
        {
            this.singleSelect(node.id);
        }
    }

    /**
     * Selects a single node, deselecting all others.
     */
    private singleSelect(nodeId: string): void
    {
        this.clearSelectionVisuals();
        this.selectedIds.clear();
        this.selectedIds.add(nodeId);
        this.lastSelectedId = nodeId;
        this.applySelectionVisual(nodeId, true);
        this.fireSelectionCallbacks(nodeId, true);
    }

    /**
     * Toggles selection state of a single node (Ctrl+Click).
     */
    private toggleSelect(nodeId: string): void
    {
        const wasSelected = this.selectedIds.has(nodeId);

        if (wasSelected)
        {
            this.selectedIds.delete(nodeId);
        }
        else
        {
            this.selectedIds.add(nodeId);
        }

        this.lastSelectedId = nodeId;
        this.applySelectionVisual(nodeId, !wasSelected);
        this.fireSelectionCallbacks(nodeId, !wasSelected);
    }

    /**
     * Selects a range of visible nodes between anchor and target (Shift+Click).
     */
    private rangeSelect(anchorId: string, targetId: string): void
    {
        const visible = this.getVisibleNodes();
        const anchorIdx = this.visibleIndexMap.get(anchorId);
        const targetIdx = this.visibleIndexMap.get(targetId);

        if (anchorIdx === undefined || targetIdx === undefined)
        {
            return;
        }

        this.clearSelectionVisuals();
        this.selectedIds.clear();

        const start = Math.min(anchorIdx, targetIdx);
        const end = Math.max(anchorIdx, targetIdx);

        for (let i = start; i <= end; i++)
        {
            const entry = visible[i];
            if (entry.node.selectable !== false && !entry.node.disabled)
            {
                this.selectedIds.add(entry.node.id);
                this.applySelectionVisual(entry.node.id, true);
            }
        }

        this.fireSelectionChange();
    }

    /**
     * Applies or removes the selected visual state on a row.
     */
    private applySelectionVisual(
        nodeId: string, selected: boolean
    ): void
    {
        const row = this.rowMap.get(nodeId);
        if (!row)
        {
            return;
        }

        if (selected)
        {
            row.classList.add("treegrid-row-selected");
            setAttr(row, "aria-selected", "true");
        }
        else
        {
            row.classList.remove("treegrid-row-selected");
            removeAttr(row, "aria-selected");
        }
    }

    /**
     * Removes selection visuals from all rows.
     */
    private clearSelectionVisuals(): void
    {
        for (const nodeId of this.selectedIds)
        {
            this.applySelectionVisual(nodeId, false);
        }
    }

    /**
     * Fires onRowSelect and onSelectionChange callbacks.
     */
    private fireSelectionCallbacks(
        nodeId: string, selected: boolean
    ): void
    {
        const node = this.nodeMap.get(nodeId);

        if (node && this.options.onRowSelect)
        {
            this.options.onRowSelect(node, selected);
        }

        this.fireSelectionChange();
    }

    /**
     * Fires the onSelectionChange callback with all selected nodes, then the "selection" channel.
     */
    private fireSelectionChange(): void
    {
        const nodes: TreeGridNode[] = [];

        for (const id of this.selectedIds)
        {
            const node = this.nodeMap.get(id);
            if (node)
            {
                nodes.push(node);
            }
        }

        if (this.options.onSelectionChange)
        {
            this.options.onSelectionChange(nodes);
        }

        this.emitChannel("selection", () => nodes.map(toNodeSummary));
    }

    // ========================================================================
    // S9: EXPAND / COLLAPSE + LAZY LOADING
    // ========================================================================

    /**
     * Toggles the expanded state of a parent node.
     */
    private toggleNode(nodeId: string): void
    {
        if (this.expandedIds.has(nodeId))
        {
            this.collapseNodeInternal(nodeId);
        }
        else
        {
            this.expandNodeInternal(nodeId);
        }
    }

    /**
     * Expands a node. Triggers lazy loading if needed.
     */
    private expandNodeInternal(nodeId: string): void
    {
        const node = this.nodeMap.get(nodeId);
        if (!node || !isNodeParent(node))
        {
            return;
        }

        // Lazy load path
        if (node.lazy && node.children === null)
        {
            this.startLazyLoad(node);
            return;
        }

        this.expandedIds.add(nodeId);
        this.invalidateVisibleCache();
        this.expandNodeIncremental(nodeId);
        this.fireToggleCallback(node, true);
    }

    /**
     * Collapses a node.
     */
    private collapseNodeInternal(nodeId: string): void
    {
        const node = this.nodeMap.get(nodeId);
        if (!node)
        {
            return;
        }

        this.expandedIds.delete(nodeId);
        this.invalidateVisibleCache();
        this.collapseNodeIncremental(nodeId);
        this.fireToggleCallback(node, false);
    }

    /**
     * Starts async lazy-load for a node's children.
     */
    private startLazyLoad(node: TreeGridNode): void
    {
        if (!this.options.onLoadChildren || this.loadingIds.has(node.id))
        {
            return;
        }

        this.loadingIds.add(node.id);
        this.rebuildRowVisual(node.id);

        this.options.onLoadChildren(node).then((children) =>
        {
            this.completeLazyLoad(node, children);
        }).catch((err) =>
        {
            logError("Lazy load failed:", node.id, err);
            this.loadingIds.delete(node.id);
            this.rebuildRowVisual(node.id);
        });
    }

    /**
     * Completes lazy load by attaching children and expanding.
     */
    private completeLazyLoad(
        node: TreeGridNode, children: TreeGridNode[]
    ): void
    {
        node.children = children;
        node.lazy = false;
        this.loadingIds.delete(node.id);

        for (const child of children)
        {
            this.insertIntoIndex(child, node.id);
        }

        this.expandedIds.add(node.id);
        this.invalidateVisibleCache();
        this.expandNodeIncremental(node.id);
        this.fireToggleCallback(node, true);
        logInfo("Lazy loaded:", node.id, children.length, "children");
    }

    /**
     * Rebuilds the visual for a single row (e.g. loading spinner).
     */
    private rebuildRowVisual(nodeId: string): void
    {
        const row = this.rowMap.get(nodeId);
        if (!row)
        {
            return;
        }

        const idx = this.visibleIndexMap.get(nodeId);
        if (idx === undefined)
        {
            return;
        }

        const entry = this.visibleNodes[idx];
        const newRow = this.buildRow(entry);
        row.replaceWith(newRow);
    }

    /**
     * Fires the onRowToggle callback.
     */
    private fireToggleCallback(
        node: TreeGridNode, expanded: boolean
    ): void
    {
        if (this.options.onRowToggle)
        {
            this.options.onRowToggle(node, expanded);
        }

        logInfo(expanded ? "Expanded:" : "Collapsed:", node.label);
    }

    // ========================================================================
    // S9b: INCREMENTAL EXPAND / COLLAPSE
    // ========================================================================

    /**
     * Incrementally expands a node by inserting child rows into the DOM
     * instead of doing a full rebuild. Falls back to renderTree() for
     * virtual scrolling mode.
     */
    private expandNodeIncremental(nodeId: string): void
    {
        // Virtual mode: just update viewport height and re-render viewport
        if (this.virtualState)
        {
            this.renderTree();
            return;
        }

        if (!this.bodyEl)
        {
            return;
        }

        const parentRow = this.rowMap.get(nodeId);
        if (!parentRow)
        {
            this.renderTree();
            return;
        }

        // Rebuild the visible cache to include new children
        const visible = this.getVisibleNodes();
        const parentIdx = this.visibleIndexMap.get(nodeId);
        if (parentIdx === undefined)
        {
            this.renderTree();
            return;
        }

        // Collect child entries: all entries after parent until we hit
        // an entry at the same or lesser level
        const parentLevel = visible[parentIdx].level;
        const childEntries: VisibleEntry[] = [];
        for (let i = parentIdx + 1; i < visible.length; i++)
        {
            if (visible[i].level <= parentLevel)
            {
                break;
            }
            childEntries.push(visible[i]);
        }

        // Insert child rows after parent row
        let insertAfter: HTMLElement = parentRow;
        for (const entry of childEntries)
        {
            const rowEl = this.buildRow(entry);
            if (entry.node.children && entry.node.children.length > 0)
            {
                this.renderAggregateRow(rowEl, entry.node);
            }
            insertAfter.after(rowEl);
            insertAfter = rowEl;
        }

        // Update parent toggle visual
        this.updateToggleVisual(nodeId, true);

        // Re-stripe from parent onwards
        this.applyRowStripingRange(parentIdx);

        // Apply column widths to newly inserted rows
        this.updateColumnStyles();
    }

    /**
     * Incrementally collapses a node by removing descendant rows from
     * the DOM instead of doing a full rebuild.
     */
    private collapseNodeIncremental(nodeId: string): void
    {
        // Virtual mode: just update viewport height and re-render viewport
        if (this.virtualState)
        {
            this.renderTree();
            return;
        }

        if (!this.bodyEl)
        {
            return;
        }

        // Collect all visible descendant IDs before cache invalidation
        const oldVisible = this.visibleNodes;
        const parentIdx = this.visibleIndexMap.get(nodeId);
        if (parentIdx === undefined)
        {
            this.renderTree();
            return;
        }

        const parentLevel = oldVisible[parentIdx].level;
        const descendantIds: string[] = [];
        for (let i = parentIdx + 1; i < oldVisible.length; i++)
        {
            if (oldVisible[i].level <= parentLevel)
            {
                break;
            }
            descendantIds.push(oldVisible[i].node.id);
        }

        // Remove descendant rows from DOM and rowMap
        for (const descId of descendantIds)
        {
            const row = this.rowMap.get(descId);
            if (row)
            {
                row.remove();
                this.rowMap.delete(descId);
            }
        }

        // Rebuild visible cache (now without collapsed descendants)
        this.getVisibleNodes();
        const newParentIdx = this.visibleIndexMap.get(nodeId);

        // Update parent toggle visual
        this.updateToggleVisual(nodeId, false);

        // Re-stripe from parent onwards
        if (newParentIdx !== undefined)
        {
            this.applyRowStripingRange(newParentIdx);
        }

        // Re-apply column widths after row removal
        this.updateColumnStyles();
    }

    /**
     * Updates the toggle button icon and aria-expanded for a node row.
     */
    private updateToggleVisual(nodeId: string, expanded: boolean): void
    {
        const row = this.rowMap.get(nodeId);
        if (!row)
        {
            return;
        }

        setAttr(row, "aria-expanded", expanded);

        const toggle = row.querySelector(".treegrid-toggle") as HTMLElement;
        if (toggle)
        {
            const icon = toggle.querySelector("i");
            if (icon)
            {
                icon.className = expanded ? "bi bi-chevron-down" : "bi bi-chevron-right";
            }
        }
    }

    /**
     * Re-applies row striping from a given visible index to the end.
     * More efficient than re-striping all rows.
     */
    private applyRowStripingRange(startIndex: number): void
    {
        if (!this.options.rowStriping || !this.bodyEl)
        {
            return;
        }

        const rows = this.bodyEl.querySelectorAll(".treegrid-row");
        for (let i = startIndex; i < rows.length; i++)
        {
            const row = rows[i] as HTMLElement;
            row.classList.remove("treegrid-row-striped");
            if (i % 2 === 1)
            {
                row.classList.add("treegrid-row-striped");
            }
        }
    }

    // ========================================================================
    // S10: KEYBOARD NAVIGATION (WAI-ARIA Treegrid 2D Pattern)
    // ========================================================================

    /**
     * Resolves the key combo string for a named action.
     * Consumer overrides take precedence over defaults.
     */
    private resolveKeyCombo(action: string): string
    {
        return this.options.keyBindings?.[action]
            ?? DEFAULT_KEY_BINDINGS[action] ?? "";
    }

    /**
     * Tests whether a KeyboardEvent matches the combo for a named action.
     * Combo format: "Ctrl+Shift+ArrowUp", "F2", " ", etc.
     */
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

    /**
     * Handles keydown events for 2D cell navigation.
     */
    private onDocumentKeydown(e: KeyboardEvent): void
    {
        logTrace("keydown handler:", { key: e.key.length > 1 ? e.key : "(char)", ctrl: e.ctrlKey });
        if (this.destroyed || !this.rootEl)
        {
            return;
        }

        if (!this.rootEl.contains(e.target as Node))
        {
            return;
        }

        if (this.isEditing)
        {
            return;
        }

        this.dispatchGridKey(e);
    }

    /**
     * Routes key events to specific handler methods via key bindings.
     */
    private dispatchGridKey(e: KeyboardEvent): void
    {
        if (this.matchesKeyCombo(e, "moveDown"))
        {
            e.preventDefault();
            this.focusDown();
        }
        else if (this.matchesKeyCombo(e, "moveUp"))
        {
            e.preventDefault();
            this.focusUp();
        }
        else if (this.matchesKeyCombo(e, "moveRight"))
        {
            e.preventDefault();
            this.focusRight();
        }
        else if (this.matchesKeyCombo(e, "moveLeft"))
        {
            e.preventDefault();
            this.focusLeft();
        }
        else if (this.matchesKeyCombo(e, "home"))
        {
            e.preventDefault();
            this.focusHome(e.ctrlKey);
        }
        else if (this.matchesKeyCombo(e, "end"))
        {
            e.preventDefault();
            this.focusEnd(e.ctrlKey);
        }
        else if (this.matchesKeyCombo(e, "toggleSelect"))
        {
            e.preventDefault();
            this.handleSpaceKey();
        }
        else if (this.matchesKeyCombo(e, "editCell"))
        {
            e.preventDefault();
            this.handleEnterKey();
        }
        else if (this.matchesKeyCombo(e, "rename"))
        {
            e.preventDefault();
            this.handleF2Key();
        }
        else if (this.matchesKeyCombo(e, "selectAll"))
        {
            e.preventDefault();
            this.selectAllNodes();
        }
    }

    /**
     * Selects all visible nodes when in multi-selection mode.
     */
    private selectAllNodes(): void
    {
        if (this.options.selectionMode !== "multi")
        {
            return;
        }
        const visible = this.getVisibleNodes();
        for (const entry of visible)
        {
            this.selectedIds.add(entry.node.id);
            this.applySelectionVisual(entry.node.id, true);
        }
        this.fireSelectionChange();
    }

    /**
     * Moves focus to the next visible row, same column.
     */
    private focusDown(): void
    {
        const visible = this.getVisibleNodes();
        const newRow = this.focusCoord.row + 1;

        if (newRow < visible.length)
        {
            this.setFocusCell(newRow, this.focusCoord.col);
        }
    }

    /**
     * Moves focus to the previous visible row, same column.
     */
    private focusUp(): void
    {
        const newRow = this.focusCoord.row - 1;

        if (newRow >= 0)
        {
            this.setFocusCell(newRow, this.focusCoord.col);
        }
    }

    /**
     * Arrow Right: tree col → expand or move right; data col → move right.
     */
    private focusRight(): void
    {
        const visible = this.getVisibleNodes();
        const entry = visible[this.focusCoord.row];

        if (!entry)
        {
            return;
        }

        if (this.focusCoord.col === 0)
        {
            this.handleTreeColRight(entry);
        }
        else
        {
            this.moveColRight();
        }
    }

    /**
     * Handles ArrowRight in the tree column.
     */
    private handleTreeColRight(entry: VisibleEntry): void
    {
        const node = entry.node;

        if (isNodeParent(node) && !this.expandedIds.has(node.id))
        {
            this.expandNodeInternal(node.id);
            return;
        }

        this.moveColRight();
    }

    /**
     * Moves focus one column to the right.
     */
    private moveColRight(): void
    {
        const maxCol = getVisibleColumns(this.columns).length;

        if (this.focusCoord.col < maxCol)
        {
            this.setFocusCell(this.focusCoord.row, this.focusCoord.col + 1);
        }
    }

    /**
     * Arrow Left: data col → move left; tree col → collapse or move to parent.
     */
    private focusLeft(): void
    {
        if (this.focusCoord.col > 0)
        {
            this.setFocusCell(this.focusCoord.row, this.focusCoord.col - 1);
            return;
        }

        this.handleTreeColLeft();
    }

    /**
     * Handles ArrowLeft in the tree column.
     */
    private handleTreeColLeft(): void
    {
        const visible = this.getVisibleNodes();
        const entry = visible[this.focusCoord.row];

        if (!entry)
        {
            return;
        }

        const node = entry.node;

        // If expanded parent, collapse it
        if (isNodeParent(node) && this.expandedIds.has(node.id))
        {
            this.collapseNodeInternal(node.id);
            return;
        }

        // Move to parent row
        const parentId = this.parentMap.get(node.id);
        if (parentId && parentId !== "")
        {
            const parentIdx = this.visibleIndexMap.get(parentId);
            if (parentIdx !== undefined)
            {
                this.setFocusCell(parentIdx, 0);
            }
        }
    }

    /**
     * Home: focus first cell; Ctrl+Home: first row same column.
     */
    private focusHome(ctrl: boolean): void
    {
        if (ctrl)
        {
            this.setFocusCell(0, this.focusCoord.col);
        }
        else
        {
            this.setFocusCell(0, 0);
        }
    }

    /**
     * End: focus last cell; Ctrl+End: last row same column.
     */
    private focusEnd(ctrl: boolean): void
    {
        const visible = this.getVisibleNodes();
        const lastRow = visible.length - 1;

        if (lastRow < 0)
        {
            return;
        }

        if (ctrl)
        {
            this.setFocusCell(lastRow, this.focusCoord.col);
        }
        else
        {
            const maxCol = getVisibleColumns(this.columns).length;
            this.setFocusCell(lastRow, maxCol);
        }
    }

    /**
     * Space key toggles row selection.
     */
    private handleSpaceKey(): void
    {
        const visible = this.getVisibleNodes();
        const entry = visible[this.focusCoord.row];

        if (!entry)
        {
            return;
        }

        this.toggleSelect(entry.node.id);
    }

    /**
     * Enter activates the focused row or starts editing.
     */
    private handleEnterKey(): void
    {
        const visible = this.getVisibleNodes();
        const entry = visible[this.focusCoord.row];

        if (!entry)
        {
            return;
        }

        // If on tree column, activate node
        if (this.focusCoord.col === 0)
        {
            if (this.options.onRowActivate)
            {
                this.options.onRowActivate(entry.node);
            }
            this.emitChannel("activate", () => toNodeSummary(entry.node));
            return;
        }

        // If on data column, try start editing (Phase 4 stub)
        this.tryStartEditing(entry.node.id, this.focusCoord.col);
    }

    /**
     * F2 starts editing the focused cell (Phase 4 stub).
     */
    private handleF2Key(): void
    {
        const visible = this.getVisibleNodes();
        const entry = visible[this.focusCoord.row];

        if (!entry)
        {
            return;
        }

        this.tryStartEditing(entry.node.id, this.focusCoord.col);
    }

    // ========================================================================
    // S14: CELL EDITING
    // ========================================================================

    /**
     * Tries to start editing a cell. Validates column is editable.
     */
    private tryStartEditing(nodeId: string, colIndex: number): void
    {
        if (this.isEditing)
        {
            logInfo("tryStartEditing: already editing, skipped");
            return;
        }
        // Tree column (col 0) is not editable
        if (colIndex === 0)
        {
            logInfo("tryStartEditing: tree column, skipped");
            return;
        }
        const visibleCols = getVisibleColumns(this.columns);
        const colIdx = colIndex - 1;
        if (colIdx < 0 || colIdx >= visibleCols.length)
        {
            logWarn(`tryStartEditing: col index out of range (${colIdx}, visible=${visibleCols.length})`);
            return;
        }
        const column = visibleCols[colIdx];
        if (!column.editable)
        {
            logInfo(`tryStartEditing: column "${column.id}" not editable`);
            return;
        }
        logInfo(`tryStartEditing: starting edit on node=${nodeId}, column=${column.id}`);
        this.startEditing(nodeId, column);
    }

    /**
     * Starts editing a cell. Creates the appropriate editor.
     */
    private startEditing(nodeId: string, column: TreeGridColumn): void
    {
        const node = this.nodeMap.get(nodeId);
        if (!node)
        {
            return;
        }

        const currentValue = getCellValue(node, column);

        // Fire onEditStart callback; if it returns false, cancel
        if (this.options.onEditStart)
        {
            const result = this.options.onEditStart(node, column, currentValue);
            if (result === false)
            {
                return;
            }
        }

        // Find the cell element
        const cellEl = this.findCellElement(nodeId, column.id);
        if (!cellEl)
        {
            return;
        }

        this.isEditing = true;
        this.editNodeId = nodeId;
        this.editColumnId = column.id;

        cellEl.classList.add("treegrid-cell-editing");
        cellEl.textContent = "";

        const editor = this.createEditor(column, currentValue);
        this.editEditorEl = editor;
        cellEl.appendChild(editor);
        editor.focus();

        this.attachEditorKeyListeners(editor, column);

        logInfo(`Edit start: node=${nodeId}, column=${column.id}`);
    }

    /**
     * Finds a data cell element by node ID and column ID.
     */
    private findCellElement(nodeId: string, columnId: string): HTMLElement | null
    {
        const rowEl = this.rowMap.get(nodeId);
        if (!rowEl)
        {
            return null;
        }
        const visibleCols = getVisibleColumns(this.columns);
        const colIdx = visibleCols.findIndex((c) => c.id === columnId);
        if (colIdx < 0)
        {
            return null;
        }
        // Cell index in row: 0 = tree col, 1..N = data cols
        const cells = rowEl.querySelectorAll(".treegrid-cell");
        const cellIndex = colIdx + 1;
        if (cellIndex < cells.length)
        {
            return cells[cellIndex] as HTMLElement;
        }
        return null;
    }

    /**
     * Creates the appropriate editor element based on column editorType.
     */
    private createEditor(column: TreeGridColumn, currentValue: unknown): HTMLElement
    {
        const editorType = column.editorType ?? "text";
        switch (editorType)
        {
            case "number":
                return this.createNumberEditor(currentValue);
            case "select":
                return this.createSelectEditor(column, currentValue);
            case "date":
                return this.createDateEditor(currentValue);
            default:
                return this.createTextEditor(currentValue);
        }
    }

    /**
     * Creates a text input editor.
     */
    private createTextEditor(currentValue: unknown): HTMLInputElement
    {
        const input = document.createElement("input");
        input.type = "text";
        input.className = "treegrid-editor form-control form-control-sm";
        input.value = formatCellValue(currentValue);
        return input;
    }

    /**
     * Creates a number input editor.
     */
    private createNumberEditor(currentValue: unknown): HTMLInputElement
    {
        const input = document.createElement("input");
        input.type = "number";
        input.className = "treegrid-editor form-control form-control-sm";
        const num = typeof currentValue === "number" ? currentValue : parseFloat(String(currentValue ?? ""));
        input.value = isNaN(num) ? "" : String(num);
        return input;
    }

    /**
     * Creates a select dropdown editor.
     */
    private createSelectEditor(column: TreeGridColumn, currentValue: unknown): HTMLSelectElement
    {
        const select = document.createElement("select");
        select.className = "treegrid-editor form-select form-select-sm";
        const strVal = formatCellValue(currentValue);
        const options = column.editorOptions ?? [];
        for (const opt of options)
        {
            const optEl = document.createElement("option");
            optEl.value = opt.value;
            optEl.textContent = opt.label;
            if (opt.value === strVal)
            {
                optEl.selected = true;
            }
            select.appendChild(optEl);
        }
        return select;
    }

    /**
     * Creates a date input editor.
     */
    private createDateEditor(currentValue: unknown): HTMLInputElement
    {
        const input = document.createElement("input");
        input.type = "date";
        input.className = "treegrid-editor form-control form-control-sm";
        input.value = formatCellValue(currentValue);
        return input;
    }

    /**
     * Attaches key listeners to an editor element.
     * Enter = commit, Escape = cancel, Tab = commit + move next.
     */
    private attachEditorKeyListeners(editor: HTMLElement, _column: TreeGridColumn): void
    {
        editor.addEventListener("keydown", (e: Event) =>
        {
            logTrace("keydown handler");
            const ke = e as KeyboardEvent;
            switch (ke.key)
            {
                case "Enter":
                    ke.preventDefault();
                    ke.stopPropagation();
                    this.commitEdit();
                    break;
                case "Escape":
                    ke.preventDefault();
                    ke.stopPropagation();
                    this.cancelEdit();
                    break;
                case "Tab":
                    ke.preventDefault();
                    ke.stopPropagation();
                    this.commitEdit();
                    this.moveFocusToNextEditableCell();
                    break;
            }
        });

        // Commit on blur (clicking outside)
        editor.addEventListener("blur", () =>
        {
            // Use setTimeout to allow Tab/Enter handlers to fire first
            setTimeout(() =>
            {
                if (this.isEditing && this.editEditorEl === editor)
                {
                    this.commitEdit();
                }
            }, 0);
        });
    }

    /**
     * Reads the editor value and commits the edit.
     */
    private commitEdit(): void
    {
        if (!this.isEditing || !this.editNodeId || !this.editColumnId)
        {
            return;
        }

        const node = this.nodeMap.get(this.editNodeId);
        const col = this.columns.find((c) => c.id === this.editColumnId);
        if (!node || !col)
        {
            this.cancelEdit();
            return;
        }

        const oldValue = getCellValue(node, col);
        let newValue: unknown = "";

        if (this.editEditorEl)
        {
            newValue = this.readEditorValue(col);
        }

        // Update node data
        if (!node.data)
        {
            node.data = {};
        }
        node.data[col.id] = newValue;

        logInfo(`Edit commit: node=${this.editNodeId}, column=${col.id}, old=${oldValue}, new=${newValue}`);

        // Fire callback
        if (this.options.onEditCommit)
        {
            this.options.onEditCommit(node, col, oldValue, newValue);
        }
        this.emitChannel("editCommit", () => ({ nodeId: node.id, columnId: col.id, oldValue, newValue }));

        this.finishEditing();
        this.restoreCellContent(node, col);
    }

    /**
     * Reads the current value from the editor element.
     */
    private readEditorValue(column: TreeGridColumn): unknown
    {
        const editorType = column.editorType ?? "text";
        if (!this.editEditorEl)
        {
            return "";
        }
        if (editorType === "number")
        {
            const val = (this.editEditorEl as HTMLInputElement).value;
            const num = parseFloat(val);
            return isNaN(num) ? null : num;
        }
        if (editorType === "select")
        {
            return (this.editEditorEl as HTMLSelectElement).value;
        }
        return (this.editEditorEl as HTMLInputElement).value;
    }

    /**
     * Cancels the current edit without saving.
     */
    private cancelEdit(): void
    {
        if (!this.isEditing || !this.editNodeId || !this.editColumnId)
        {
            return;
        }

        const node = this.nodeMap.get(this.editNodeId);
        const col = this.columns.find((c) => c.id === this.editColumnId);

        logInfo(`Edit cancel: node=${this.editNodeId}, column=${this.editColumnId}`);

        if (this.options.onEditCancel && node && col)
        {
            this.options.onEditCancel(node, col);
        }

        this.finishEditing();

        if (node && col)
        {
            this.restoreCellContent(node, col);
        }
    }

    /**
     * Cleans up editing state.
     */
    private finishEditing(): void
    {
        if (this.editNodeId && this.editColumnId)
        {
            const cellEl = this.findCellElement(this.editNodeId, this.editColumnId);
            if (cellEl)
            {
                cellEl.classList.remove("treegrid-cell-editing");
            }
        }

        this.isEditing = false;
        this.editNodeId = null;
        this.editColumnId = null;
        this.editEditorEl = null;
    }

    /**
     * Restores cell content after editing ends.
     */
    private restoreCellContent(node: TreeGridNode, column: TreeGridColumn): void
    {
        const cellEl = this.findCellElement(node.id, column.id);
        if (!cellEl)
        {
            return;
        }
        cellEl.textContent = "";
        const value = getCellValue(node, column);
        if (column.renderer)
        {
            column.renderer(cellEl, node, value);
        }
        else
        {
            const valueSpan = createElement("span", ["treegrid-cell-value"], formatCellValue(value));
            cellEl.appendChild(valueSpan);
        }
    }

    /**
     * Moves focus to the next editable cell after Tab in editor.
     * Scans right along columns, then wraps to next row.
     */
    private moveFocusToNextEditableCell(): void
    {
        const visible = this.getVisibleNodes();
        const visibleCols = getVisibleColumns(this.columns);
        let row = this.focusCoord.row;
        let col = this.focusCoord.col;

        // Start scanning from next column
        col++;

        while (row < visible.length)
        {
            while (col <= visibleCols.length)
            {
                if (col > 0)
                {
                    const dataColIdx = col - 1;
                    if (dataColIdx < visibleCols.length && visibleCols[dataColIdx].editable)
                    {
                        this.setFocusCell(row, col);
                        this.tryStartEditing(visible[row].node.id, col);
                        return;
                    }
                }
                col++;
            }
            row++;
            col = 1; // Start at first data column
        }
    }

    /**
     * Sets focus on a specific cell and updates visual state.
     */
    private setFocusCell(row: number, col: number): void
    {
        const visible = this.getVisibleNodes();

        if (row < 0 || row >= visible.length)
        {
            return;
        }

        // Remove focus from previous cell
        this.removeCellFocus();

        this.focusCoord = { row, col };

        // Apply focus to new cell
        const cellEl = this.getCellElement(row, col);

        if (cellEl)
        {
            setAttr(cellEl, "tabindex", "0");
            cellEl.classList.add("treegrid-cell-focused");
            cellEl.focus();
        }

        this.ensureCellVisible(row, col);
    }

    /**
     * Removes visual focus from the currently focused cell.
     */
    private removeCellFocus(): void
    {
        const cellEl = this.getCellElement(
            this.focusCoord.row, this.focusCoord.col
        );

        if (cellEl)
        {
            setAttr(cellEl, "tabindex", "-1");
            cellEl.classList.remove("treegrid-cell-focused");
        }
    }

    /**
     * Gets the DOM element for a cell at (row, col).
     */
    private getCellElement(row: number, col: number): HTMLElement | null
    {
        const visible = this.getVisibleNodes();

        if (row < 0 || row >= visible.length)
        {
            return null;
        }

        const nodeId = visible[row].node.id;
        const rowEl = this.rowMap.get(nodeId);

        if (!rowEl)
        {
            return null;
        }

        const cells = rowEl.querySelectorAll(".treegrid-cell");
        return (cells[col] as HTMLElement) ?? null;
    }

    /**
     * Scrolls the body so the target cell is visible.
     */
    private ensureCellVisible(row: number, col: number): void
    {
        if (!this.bodyEl)
        {
            return;
        }

        const cellEl = this.getCellElement(row, col);

        if (!cellEl)
        {
            return;
        }

        cellEl.scrollIntoView({ block: "nearest", inline: "nearest" });
    }

    // ========================================================================
    // S10b: ROW CLICK DELEGATION
    // ========================================================================

    /**
     * Attaches delegated click listeners to the body for row interaction.
     */
    private attachBodyListeners(): void
    {
        if (!this.bodyEl)
        {
            return;
        }

        this.bodyEl.addEventListener("click", (e) =>
        {
            this.onBodyClick(e);
        });

        this.bodyEl.addEventListener("dblclick", (e) =>
        {
            this.onBodyDblClick(e);
        });

        // Delegated DnD handlers
        if (this.options.enableDragDrop)
        {
            this.bodyEl.addEventListener("dragstart", (e) =>
            {
                const row = (e.target as HTMLElement).closest(".treegrid-row") as HTMLElement;
                if (!row)
                {
                    return;
                }
                const nodeId = row.getAttribute("data-node-id");
                const node = nodeId ? this.nodeMap.get(nodeId) : undefined;
                if (node)
                {
                    this.onRowDragStart(e, row, node);
                }
            });
            this.bodyEl.addEventListener("dragover", (e) =>
            {
                logTrace("dragover handler");
                const row = (e.target as HTMLElement).closest(".treegrid-row") as HTMLElement;
                if (row)
                {
                    this.onRowDragOver(e, row);
                }
            });
            this.bodyEl.addEventListener("dragleave", (e) =>
            {
                const row = (e.target as HTMLElement).closest(".treegrid-row") as HTMLElement;
                if (row)
                {
                    this.clearDropIndicators(row);
                }
            });
            this.bodyEl.addEventListener("drop", (e) =>
            {
                const row = (e.target as HTMLElement).closest(".treegrid-row") as HTMLElement;
                if (row)
                {
                    this.onRowDrop(e, row);
                }
            });
            this.bodyEl.addEventListener("dragend", (e) =>
            {
                const row = (e.target as HTMLElement).closest(".treegrid-row") as HTMLElement;
                if (row)
                {
                    this.onRowDragEnd(row);
                }
            });
        }

        // Delegated context menu
        this.attachContextMenuListeners();
    }

    /**
     * Handles delegated click events on the body.
     */
    private onBodyClick(e: MouseEvent): void
    {
        const target = e.target as HTMLElement;

        // Toggle button click
        const toggleBtn = target.closest(".treegrid-toggle") as HTMLElement;
        if (toggleBtn)
        {
            const row = toggleBtn.closest(".treegrid-row") as HTMLElement;
            const nodeId = row?.getAttribute("data-node-id");
            if (nodeId)
            {
                this.toggleNode(nodeId);
            }
            return;
        }

        // Row/cell click for selection and focus
        const cell = target.closest(".treegrid-cell") as HTMLElement;
        const row = target.closest(".treegrid-row") as HTMLElement;

        if (!row)
        {
            return;
        }

        const nodeId = row.getAttribute("data-node-id");
        if (!nodeId)
        {
            return;
        }

        const node = this.nodeMap.get(nodeId);
        if (!node)
        {
            return;
        }

        // Determine column index from cell position
        const colIndex = cell ? this.getCellIndex(row, cell) : 0;
        const visIdx = this.visibleIndexMap.get(nodeId);

        if (visIdx !== undefined)
        {
            this.setFocusCell(visIdx, colIndex);
        }

        this.onRowClick(node, e);
    }

    /**
     * Handles delegated double-click events on the body.
     */
    private onBodyDblClick(e: MouseEvent): void
    {
        logInfo("DblClick on body, target:", (e.target as HTMLElement).className);
        const row = (e.target as HTMLElement).closest(
            ".treegrid-row"
        ) as HTMLElement;

        if (!row)
        {
            logWarn("DblClick: no row found");
            return;
        }

        const nodeId = row.getAttribute("data-node-id");
        if (!nodeId)
        {
            logWarn("DblClick: no data-node-id");
            return;
        }

        const cell = (e.target as HTMLElement).closest(
            ".treegrid-cell"
        ) as HTMLElement;
        const colIndex = cell ? this.getCellIndex(row, cell) : 0;
        logInfo(`DblClick: nodeId=${nodeId}, colIndex=${colIndex}`);

        // Double-click on tree column: activate
        if (colIndex === 0)
        {
            const node = this.nodeMap.get(nodeId);
            if (node && this.options.onRowActivate)
            {
                this.options.onRowActivate(node);
            }
            if (node)
            {
                this.emitChannel("activate", () => toNodeSummary(node));
            }
            return;
        }

        // Double-click on data column: try edit
        this.tryStartEditing(nodeId, colIndex);
    }

    /**
     * Gets the cell index (0-based) within a row.
     */
    private getCellIndex(row: HTMLElement, cell: HTMLElement): number
    {
        const cells = row.querySelectorAll(".treegrid-cell");

        for (let i = 0; i < cells.length; i++)
        {
            if (cells[i] === cell)
            {
                return i;
            }
        }

        return 0;
    }

    // ========================================================================
    // Event Handlers (document-level)
    // ========================================================================

    /**
     * Handles document-level clicks for context menu dismissal.
     */
    private onDocumentClick(e: MouseEvent): void
    {
        // Context menu dismissal
        if (this.contextMenuEl && !this.contextMenuEl.contains(e.target as Node))
        {
            this.dismissContextMenu();
        }
        // Column picker dismissal
        if (this.columnPickerEl && !this.columnPickerEl.contains(e.target as Node)
            && !(e.target as HTMLElement).closest(".treegrid-column-picker-btn"))
        {
            this.dismissColumnPicker();
        }
    }

    /**
     * Dismisses the context menu if visible.
     */
    private dismissContextMenu(): void
    {
        if (this.contextMenuEl && this.contextMenuEl.parentElement)
        {
            this.contextMenuEl.parentElement.removeChild(this.contextMenuEl);
        }

        this.contextMenuEl = null;
    }

    /**
     * Handles body scroll — syncs header horizontal position and drives virtual scrolling.
     */
    private onBodyScroll(_e: Event): void
    {
        logTrace("scroll handler");
        // Sync header horizontal scroll with body
        if (this.headerEl && this.bodyEl)
        {
            this.headerEl.scrollLeft = this.bodyEl.scrollLeft;
        }

        if (!this.virtualState || this.virtualState.scrollPending)
        {
            return;
        }
        this.virtualState.scrollPending = true;
        this.virtualState.rafHandle = requestAnimationFrame(() =>
        {
            this.onVirtualScroll();
        });
    }

    // ========================================================================
    // S11: COLUMN RESIZE
    // ========================================================================

    /**
     * Attaches resize handle listeners to all header cells.
     * Called once after header is built.
     */
    private attachResizeListeners(): void
    {
        if (!this.headerEl)
        {
            logWarn("attachResizeListeners: no headerEl");
            return;
        }
        const handles = this.headerEl.querySelectorAll(".treegrid-resize-handle");
        logInfo(`attachResizeListeners: found ${handles.length} resize handles`);
        for (let i = 0; i < handles.length; i++)
        {
            const handle = handles[i] as HTMLElement;
            handle.addEventListener("pointerdown", (e) =>
            {
                this.onResizeStart(e);
            });
        }
    }

    /**
     * Starts a column resize operation.
     */
    private onResizeStart(e: PointerEvent): void
    {
        e.preventDefault();
        e.stopPropagation();

        const handle = e.target as HTMLElement;
        const headerCell = handle.closest(".treegrid-header-cell") as HTMLElement;
        if (!headerCell)
        {
            return;
        }

        const colId = headerCell.getAttribute("data-column-id");
        if (!colId)
        {
            return;
        }

        this.resizeColId = colId;
        this.resizeStartX = e.clientX;
        this.resizeStartWidth = this.getColumnWidth(colId);
        this.resizeCell = headerCell;

        // Temporarily disable draggable on the parent cell to prevent the
        // browser's native drag system from hijacking pointer events.
        if (headerCell.getAttribute("draggable") === "true")
        {
            headerCell.setAttribute("draggable", "false");
        }

        if (this.rootEl)
        {
            this.rootEl.classList.add("treegrid-resizing");
        }

        handle.setPointerCapture(e.pointerId);
        this.boundOnResizeMove = (ev: PointerEvent) => this.onResizeMove(ev);
        this.boundOnResizeEnd = (ev: PointerEvent) => this.onResizeEnd(ev);
        handle.addEventListener("pointermove", this.boundOnResizeMove);
        handle.addEventListener("pointerup", this.boundOnResizeEnd);

        logInfo(`Resize start: column=${colId}, width=${this.resizeStartWidth}`);
    }

    /**
     * Gets the current width for a column ID.
     */
    private getColumnWidth(colId: string): number
    {
        if (colId === "__tree__")
        {
            return this.treeColWidth;
        }
        return this.columnWidths.get(colId) ?? DEFAULT_COL_WIDTH;
    }

    /**
     * Gets the minimum width for a column ID.
     */
    private getColumnMinWidth(colId: string): number
    {
        if (colId === "__tree__")
        {
            return this.options.treeColumnMinWidth ?? DEFAULT_TREE_COL_MIN_WIDTH;
        }
        const col = this.columns.find((c) => c.id === colId);
        return col?.minWidth ?? DEFAULT_COL_MIN_WIDTH;
    }

    /**
     * Gets the maximum width for a column ID (0 = no max).
     */
    private getColumnMaxWidth(colId: string): number
    {
        if (colId === "__tree__")
        {
            return 0;
        }
        const col = this.columns.find((c) => c.id === colId);
        return col?.maxWidth ?? 0;
    }

    /**
     * Handles pointer move during column resize.
     */
    private onResizeMove(e: PointerEvent): void
    {
        logTrace("pointermove handler:", { x: e.clientX, y: e.clientY });
        if (!this.resizeColId)
        {
            return;
        }
        const delta = e.clientX - this.resizeStartX;
        const minW = this.getColumnMinWidth(this.resizeColId);
        const maxW = this.getColumnMaxWidth(this.resizeColId);
        let newWidth = this.resizeStartWidth + delta;
        newWidth = Math.max(newWidth, minW);
        if (maxW > 0)
        {
            newWidth = Math.min(newWidth, maxW);
        }
        this.setColumnWidth(this.resizeColId, newWidth);
        this.updateColumnStyles();
    }

    /**
     * Sets the width for a column ID.
     */
    private setColumnWidth(colId: string, width: number): void
    {
        if (colId === "__tree__")
        {
            this.treeColWidth = width;
        }
        else
        {
            this.columnWidths.set(colId, width);
        }
    }

    /**
     * Applies column widths via inline styles on every header cell and body cell.
     * Inline styles guarantee highest CSS specificity — no nth-child selector
     * fragility. For grids with <500 visible rows the DOM writes are trivial.
     */
    private updateColumnStyles(): void
    {
        const visibleCols = getVisibleColumns(this.columns);
        const widths: number[] = [this.treeColWidth];
        for (const col of visibleCols)
        {
            widths.push(this.columnWidths.get(col.id) ?? DEFAULT_COL_WIDTH);
        }

        // Apply to header cells
        if (this.headerEl)
        {
            const cells = this.headerEl.querySelectorAll(".treegrid-header-cell");
            for (let i = 0; i < cells.length && i < widths.length; i++)
            {
                const cell = cells[i] as HTMLElement;
                const w = `${widths[i]}px`;
                cell.style.width = w;
                cell.style.minWidth = w;
                cell.style.maxWidth = w;
            }
        }

        // Apply to body row cells
        if (this.bodyEl)
        {
            const rows = this.bodyEl.querySelectorAll(
                ".treegrid-row, .treegrid-virtual-row"
            );
            for (let r = 0; r < rows.length; r++)
            {
                const cells = rows[r].querySelectorAll(".treegrid-cell");
                for (let i = 0; i < cells.length && i < widths.length; i++)
                {
                    const cell = cells[i] as HTMLElement;
                    const w = `${widths[i]}px`;
                    cell.style.width = w;
                    cell.style.minWidth = w;
                    cell.style.maxWidth = w;
                }
            }
        }
    }

    /**
     * Ends a column resize operation.
     */
    private onResizeEnd(e: PointerEvent): void
    {
        const handle = e.target as HTMLElement;
        handle.releasePointerCapture(e.pointerId);
        if (this.boundOnResizeMove)
        {
            handle.removeEventListener("pointermove", this.boundOnResizeMove);
        }
        if (this.boundOnResizeEnd)
        {
            handle.removeEventListener("pointerup", this.boundOnResizeEnd);
        }

        if (this.rootEl)
        {
            this.rootEl.classList.remove("treegrid-resizing");
        }

        // Re-enable draggable on the cell if column reorder is active
        if (this.resizeCell && this.options.enableColumnReorder
            && !this.resizeCell.classList.contains("treegrid-tree-col"))
        {
            this.resizeCell.setAttribute("draggable", "true");
        }

        const colId = this.resizeColId;
        this.resizeColId = null;
        this.resizeCell = null;
        this.boundOnResizeMove = null;
        this.boundOnResizeEnd = null;

        if (!colId)
        {
            return;
        }

        const newWidth = this.getColumnWidth(colId);
        logInfo(`Resize end: column=${colId}, width=${newWidth}`);

        this.fireResizeCallback(colId, newWidth);
    }

    /**
     * Fires the onColumnResize callback.
     */
    private fireResizeCallback(colId: string, width: number): void
    {
        if (!this.options.onColumnResize)
        {
            return;
        }
        if (colId === "__tree__")
        {
            // Tree column resize — create a pseudo column object
            const pseudoCol: TreeGridColumn = { id: "__tree__", label: this.options.treeColumnLabel ?? "Name" };
            this.options.onColumnResize(pseudoCol, width);
            return;
        }
        const col = this.columns.find((c) => c.id === colId);
        if (col)
        {
            this.options.onColumnResize(col, width);
        }
    }

    // ========================================================================
    // S12: COLUMN REORDER (Drag & Drop on Header Cells)
    // ========================================================================

    /**
     * Attaches drag listeners to data column header cells for reorder.
     * Tree column is excluded from reorder.
     */
    private attachHeaderDragListeners(): void
    {
        if (!this.headerEl || !this.options.enableColumnReorder)
        {
            return;
        }
        const cells = this.headerEl.querySelectorAll(".treegrid-header-cell:not(.treegrid-tree-col)");
        for (let i = 0; i < cells.length; i++)
        {
            const cell = cells[i] as HTMLElement;
            cell.setAttribute("draggable", "true");

            cell.addEventListener("dragstart", (e) =>
            {
                this.onHeaderDragStart(e, cell);
            });
            cell.addEventListener("dragover", (e) =>
            {
                this.onHeaderDragOver(e, cell);
            });
            cell.addEventListener("dragleave", (_e) =>
            {
                this.onHeaderDragLeave(cell);
            });
            cell.addEventListener("drop", (e) =>
            {
                this.onHeaderDrop(e, cell);
            });
            cell.addEventListener("dragend", () =>
            {
                this.onHeaderDragEnd(cell);
            });
        }
    }

    /**
     * Handles drag start on a header cell.
     */
    private onHeaderDragStart(e: DragEvent, cell: HTMLElement): void
    {
        // Cancel drag when a column resize is in progress
        if (this.resizeColId)
        {
            e.preventDefault();
            return;
        }
        const colId = cell.getAttribute("data-column-id");
        if (!colId || colId === "__tree__")
        {
            e.preventDefault();
            return;
        }
        this.reorderSourceId = colId;
        cell.classList.add("treegrid-header-cell-dragging");
        if (e.dataTransfer)
        {
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", colId);
        }
        logInfo(`Column drag start: ${colId}`);
    }

    /**
     * Handles drag over a header cell (shows drop indicator).
     */
    private onHeaderDragOver(e: DragEvent, cell: HTMLElement): void
    {
        logTrace("dragover handler:", { x: e.clientX, y: e.clientY });
        if (!this.reorderSourceId)
        {
            return;
        }
        const targetColId = cell.getAttribute("data-column-id");
        if (!targetColId || targetColId === "__tree__" || targetColId === this.reorderSourceId)
        {
            return;
        }
        e.preventDefault();
        if (e.dataTransfer)
        {
            e.dataTransfer.dropEffect = "move";
        }

        // Show drop indicator (before or after based on mouse position)
        const rect = cell.getBoundingClientRect();
        const midX = rect.left + rect.width / 2;
        cell.classList.remove("treegrid-col-drop-before", "treegrid-col-drop-after");
        if (e.clientX < midX)
        {
            cell.classList.add("treegrid-col-drop-before");
        }
        else
        {
            cell.classList.add("treegrid-col-drop-after");
        }
    }

    /**
     * Clears drop indicators on drag leave.
     */
    private onHeaderDragLeave(cell: HTMLElement): void
    {
        cell.classList.remove("treegrid-col-drop-before", "treegrid-col-drop-after");
    }

    /**
     * Handles drop on a header cell (reorders columns).
     */
    private onHeaderDrop(e: DragEvent, cell: HTMLElement): void
    {
        e.preventDefault();
        cell.classList.remove("treegrid-col-drop-before", "treegrid-col-drop-after");

        if (!this.reorderSourceId)
        {
            return;
        }

        const targetColId = cell.getAttribute("data-column-id");
        if (!targetColId || targetColId === "__tree__" || targetColId === this.reorderSourceId)
        {
            this.reorderSourceId = null;
            return;
        }

        // Determine insert position
        const rect = cell.getBoundingClientRect();
        const midX = rect.left + rect.width / 2;
        const insertAfter = e.clientX >= midX;

        this.reorderColumn(this.reorderSourceId, targetColId, insertAfter);
        this.reorderSourceId = null;
    }

    /**
     * Reorders a column by moving it next to a target column.
     */
    private reorderColumn(sourceId: string, targetId: string, insertAfter: boolean): void
    {
        const sourceIdx = this.columns.findIndex((c) => c.id === sourceId);
        const targetIdx = this.columns.findIndex((c) => c.id === targetId);
        if (sourceIdx < 0 || targetIdx < 0)
        {
            return;
        }

        const [col] = this.columns.splice(sourceIdx, 1);
        let newIdx = this.columns.findIndex((c) => c.id === targetId);
        if (insertAfter)
        {
            newIdx++;
        }
        this.columns.splice(newIdx, 0, col);

        logInfo(`Column reorder: ${sourceId} -> ${insertAfter ? "after" : "before"} ${targetId}`);

        this.rebuildHeaderAndBody();
        this.fireReorderCallback();
    }

    /**
     * Cleans up drag state on drag end.
     */
    private onHeaderDragEnd(cell: HTMLElement): void
    {
        cell.classList.remove("treegrid-header-cell-dragging");
        this.reorderSourceId = null;
        // Clear all drop indicators
        if (this.headerEl)
        {
            const cells = this.headerEl.querySelectorAll(".treegrid-header-cell");
            for (let i = 0; i < cells.length; i++)
            {
                cells[i].classList.remove("treegrid-col-drop-before", "treegrid-col-drop-after");
            }
        }
    }

    /**
     * Rebuilds header and body after column reorder.
     */
    private rebuildHeaderAndBody(): void
    {
        if (!this.rootEl)
        {
            return;
        }
        // Remove old header and body
        if (this.headerEl)
        {
            this.rootEl.removeChild(this.headerEl);
        }
        if (this.bodyEl)
        {
            this.rootEl.removeChild(this.bodyEl);
        }

        // Clear stale state before rebuild
        this.rowMap.clear();
        this.invalidateVisibleCache();
        this.focusCoord = { row: -1, col: 0 };
        this.columnPickerEl = null;

        // Rebuild
        this.headerEl = this.buildHeader();
        this.buildBody();
        this.attachBodyListeners();
        this.attachResizeListeners();
        this.attachHeaderDragListeners();
        this.attachSortListeners();
        this.rootEl.appendChild(this.headerEl);
        this.rootEl.appendChild(this.bodyEl!);
        this.updateColumnStyles();
    }

    /**
     * Fires the onColumnReorder callback.
     */
    private fireReorderCallback(): void
    {
        if (this.options.onColumnReorder)
        {
            this.options.onColumnReorder([...this.columns]);
        }
    }

    // ========================================================================
    // S13: COLUMN SORT
    // ========================================================================

    /**
     * Attaches click listeners to sortable header cells.
     */
    private attachSortListeners(): void
    {
        if (!this.headerEl)
        {
            return;
        }
        const cells = this.headerEl.querySelectorAll(".treegrid-header-cell");
        for (let i = 0; i < cells.length; i++)
        {
            const cell = cells[i] as HTMLElement;
            const colId = cell.getAttribute("data-column-id");
            if (!colId || colId === "__tree__")
            {
                continue;
            }
            const col = this.columns.find((c) => c.id === colId);
            if (col?.sortable)
            {
                cell.style.cursor = "pointer";
                cell.addEventListener("click", (e) =>
                {
                    // Ignore if click was on resize handle
                    if ((e.target as HTMLElement).classList.contains("treegrid-resize-handle"))
                    {
                        return;
                    }
                    this.onSortClick(colId);
                });
            }
        }
    }

    /**
     * Handles click on a sortable header cell.
     * Toggles between asc -> desc -> none.
     */
    private onSortClick(colId: string): void
    {
        if (this.sortColumnId === colId)
        {
            if (this.sortDirection === "asc")
            {
                this.sortDirection = "desc";
            }
            else
            {
                // desc -> clear sort
                this.sortColumnId = null;
                this.sortDirection = null;
            }
        }
        else
        {
            this.sortColumnId = colId;
            this.sortDirection = "asc";
        }

        logInfo(`Sort: column=${colId}, direction=${this.sortDirection ?? "none"}`);

        // Update visual indicators regardless of sort mode
        this.updateSortIndicators();
        this.fireSortCallback();

        // In external sort mode, the app is responsible for sorting the data
        // in the onColumnSort callback and then calling refresh().
        if (this.options.externalSort)
        {
            return;
        }

        if (this.sortColumnId && this.sortDirection)
        {
            this.sortAllChildren();
        }

        this.invalidateVisibleCache();
        this.renderTree();
    }

    /**
     * Recursively sorts children at every level, preserving hierarchy.
     */
    private sortAllChildren(): void
    {
        if (!this.sortColumnId || !this.sortDirection)
        {
            return;
        }
        const col = this.columns.find((c) => c.id === this.sortColumnId);
        if (!col)
        {
            return;
        }
        this.sortChildrenRecursive(this.roots, col, this.sortDirection);
    }

    /**
     * Sorts an array of children in place and recurses.
     */
    private sortChildrenRecursive(
        nodes: TreeGridNode[],
        column: TreeGridColumn,
        direction: TreeGridSortDirection
    ): void
    {
        const sorted = sortNodes(nodes, column, direction);
        nodes.splice(0, nodes.length, ...sorted);
        for (const node of nodes)
        {
            if (node.children && node.children.length > 0)
            {
                this.sortChildrenRecursive(node.children, column, direction);
            }
        }
    }

    /**
     * Updates sort indicator icons in all header cells.
     */
    private updateSortIndicators(): void
    {
        if (!this.headerEl)
        {
            return;
        }
        const cells = this.headerEl.querySelectorAll(".treegrid-header-cell");
        for (let i = 0; i < cells.length; i++)
        {
            const cell = cells[i] as HTMLElement;
            const colId = cell.getAttribute("data-column-id");
            const sortIcon = cell.querySelector(".treegrid-sort-icon") as HTMLElement;
            if (!sortIcon)
            {
                continue;
            }

            // Update ARIA
            removeAttr(cell, "aria-sort");
            sortIcon.textContent = "";

            if (colId === this.sortColumnId && this.sortDirection)
            {
                if (this.sortDirection === "asc")
                {
                    setAttr(cell, "aria-sort", "ascending");
                    sortIcon.textContent = "\u25B2";
                }
                else
                {
                    setAttr(cell, "aria-sort", "descending");
                    sortIcon.textContent = "\u25BC";
                }
            }
        }
    }

    /**
     * Fires the onColumnSort callback.
     */
    private fireSortCallback(): void
    {
        if (!this.options.onColumnSort || !this.sortColumnId || !this.sortDirection)
        {
            return;
        }
        const col = this.columns.find((c) => c.id === this.sortColumnId);
        if (col)
        {
            this.options.onColumnSort(col, this.sortDirection);
        }
    }

    // ========================================================================
    // S6b: VIRTUAL SCROLLING
    // ========================================================================

    /**
     * Builds the virtual scrolling viewport with spacers.
     */
    private buildBodyVirtual(): void
    {
        if (!this.bodyEl)
        {
            return;
        }
        this.cleanupVirtualState();
        this.bodyEl.textContent = "";

        const visible = this.getVisibleNodes();
        if (visible.length === 0)
        {
            const emptyEl = this.buildEmptyState();
            this.bodyEl.appendChild(emptyEl);
            return;
        }

        const rowHeight = this.options.rowHeight ?? DEFAULT_ROW_HEIGHT;
        const totalHeight = visible.length * rowHeight;

        const viewport = createElement("div", ["treegrid-virtual-viewport"]);
        viewport.style.height = `${totalHeight}px`;

        const topSpacer = createElement("div", ["treegrid-virtual-spacer"]);
        topSpacer.style.height = "0px";
        viewport.appendChild(topSpacer);

        const bottomSpacer = createElement("div", ["treegrid-virtual-spacer"]);
        bottomSpacer.style.height = "0px";
        viewport.appendChild(bottomSpacer);

        this.bodyEl.appendChild(viewport);

        this.virtualState = {
            startIndex: 0,
            endIndex: 0,
            topSpacer,
            bottomSpacer,
            viewportEl: viewport,
            renderedRows: new Map(),
            recyclePool: [],
            scrollPending: false,
            rafHandle: 0
        };

        this.onVirtualScroll();
        logInfo(`Virtual scrolling enabled: ${visible.length} rows`);
    }

    /**
     * Handles the virtual scroll update via rAF.
     */
    private onVirtualScroll(): void
    {
        if (!this.virtualState || !this.bodyEl)
        {
            return;
        }
        this.virtualState.scrollPending = false;

        const rowHeight = this.options.rowHeight ?? DEFAULT_ROW_HEIGHT;
        const buffer = this.options.scrollBuffer ?? DEFAULT_SCROLL_BUFFER;
        const scrollTop = this.bodyEl.scrollTop;
        const clientHeight = this.bodyEl.clientHeight;
        const visible = this.getVisibleNodes();
        const totalCount = visible.length;

        let newStart = Math.floor(scrollTop / rowHeight) - buffer;
        let newEnd = Math.ceil((scrollTop + clientHeight) / rowHeight) + buffer;
        newStart = Math.max(0, newStart);
        newEnd = Math.min(totalCount, newEnd);

        this.applyVirtualRowDiff(newStart, newEnd, visible);
    }

    /**
     * Applies incremental row diff for virtual scrolling with DOM recycling.
     * Out-of-range rows are pushed to the recycle pool instead of being
     * destroyed. New rows are popped from the pool and repopulated.
     */
    private applyVirtualRowDiff(
        newStart: number,
        newEnd: number,
        visible: VisibleEntry[]
    ): void
    {
        if (!this.virtualState)
        {
            return;
        }

        const vs = this.virtualState;
        const rowHeight = this.options.rowHeight ?? DEFAULT_ROW_HEIGHT;
        const totalCount = visible.length;
        const visibleCols = getVisibleColumns(this.columns);
        const expectedCellCount = 1 + visibleCols.length; // tree cell + data cells

        // Move out-of-range rows to recycle pool
        for (const [idx, row] of vs.renderedRows)
        {
            if (idx < newStart || idx >= newEnd)
            {
                row.style.display = "none";
                vs.recyclePool.push(row);
                vs.renderedRows.delete(idx);
            }
        }

        // Fill in new rows from pool or fresh build
        for (let i = newStart; i < newEnd; i++)
        {
            if (vs.renderedRows.has(i))
            {
                continue;
            }
            const entry = visible[i];
            if (!entry)
            {
                continue;
            }

            let rowEl: HTMLElement;
            const poolRow = vs.recyclePool.pop();
            if (poolRow && poolRow.children.length === expectedCellCount)
            {
                rowEl = poolRow;
                rowEl.style.display = "";
                this.populateVirtualRow(rowEl, entry, i, visibleCols);
            }
            else
            {
                // Pool row has wrong structure or pool empty — build fresh
                if (poolRow)
                {
                    poolRow.remove();
                }
                rowEl = this.buildRow(entry);
                rowEl.style.position = "absolute";
                rowEl.style.width = "100%";
                rowEl.style.height = `${rowHeight}px`;
                vs.viewportEl.appendChild(rowEl);
            }

            rowEl.style.top = `${i * rowHeight}px`;
            rowEl.setAttribute("data-virt-index", String(i));
            vs.renderedRows.set(i, rowEl);
        }

        vs.startIndex = newStart;
        vs.endIndex = newEnd;

        // Update spacers
        vs.topSpacer.style.height = `${newStart * rowHeight}px`;
        vs.bottomSpacer.style.height = `${Math.max(0, (totalCount - newEnd) * rowHeight)}px`;
    }

    /**
     * Repopulates an existing virtual row element with data from a new entry.
     * Avoids creating/destroying DOM nodes — only updates attributes and content.
     */
    private populateVirtualRow(
        row: HTMLElement,
        entry: VisibleEntry,
        globalIndex: number,
        visibleCols: TreeGridColumn[]
    ): void
    {
        const { node, level, setSize, posInSet } = entry;

        // Update row attributes
        row.setAttribute("data-node-id", node.id);
        setAttr(row, "aria-level", level);
        setAttr(row, "aria-setsize", setSize);
        setAttr(row, "aria-posinset", posInSet);

        // Selection state
        if (this.selectedIds.has(node.id))
        {
            row.classList.add("treegrid-row-selected");
            setAttr(row, "aria-selected", "true");
        }
        else
        {
            row.classList.remove("treegrid-row-selected");
            row.removeAttribute("aria-selected");
        }

        // Expanded state
        if (isNodeParent(node))
        {
            setAttr(row, "aria-expanded", this.expandedIds.has(node.id));
        }
        else
        {
            row.removeAttribute("aria-expanded");
        }

        // Draggable
        if (this.options.enableDragDrop && node.draggable !== false)
        {
            row.setAttribute("draggable", "true");
        }
        else
        {
            row.removeAttribute("draggable");
        }

        // Striping
        row.classList.remove("treegrid-row-striped", "treegrid-row-dragging",
            "treegrid-drop-before", "treegrid-drop-inside", "treegrid-drop-after");
        if (this.options.rowStriping !== false && globalIndex % 2 === 1)
        {
            row.classList.add("treegrid-row-striped");
        }

        // Populate tree cell (first child)
        this.populateTreeCell(row.children[0] as HTMLElement, entry);

        // Populate data cells
        for (let c = 0; c < visibleCols.length; c++)
        {
            const cell = row.children[c + 1] as HTMLElement;
            if (cell)
            {
                this.populateDataCell(cell, node, visibleCols[c]);
            }
        }

        // Update rowMap
        this.rowMap.set(node.id, row);
    }

    /**
     * Repopulates a tree cell by clearing and rebuilding its children.
     * The cell element and its sticky position styles are preserved.
     */
    private populateTreeCell(cell: HTMLElement, entry: VisibleEntry): void
    {
        cell.textContent = "";
        const { node, level } = entry;
        const isFocused = this.focusCoord.row === entry.index && this.focusCoord.col === 0;
        setAttr(cell, "tabindex", isFocused ? "0" : "-1");

        const indentSpacer = this.buildIndentSpacer(level);
        cell.appendChild(indentSpacer);

        if (isNodeParent(node))
        {
            const isExpanded = this.expandedIds.has(node.id);
            const toggleBtn = this.buildToggleButton(node, isExpanded);
            cell.appendChild(toggleBtn);
        }
        else
        {
            const spacer = this.buildToggleSpacer();
            cell.appendChild(spacer);
        }

        if (node.icon)
        {
            const icon = this.buildNodeIcon(node);
            cell.appendChild(icon);
        }

        const label = this.buildNodeLabel(node);
        cell.appendChild(label);
    }

    /**
     * Repopulates a data cell element with value from a node.
     * Preserves the cell element; rebuilds inner content.
     */
    private populateDataCell(
        cell: HTMLElement,
        node: TreeGridNode,
        col: TreeGridColumn
    ): void
    {
        cell.textContent = "";
        if (col.align)
        {
            cell.style.textAlign = col.align;
        }
        else
        {
            cell.style.textAlign = "";
        }

        // Reset css class
        cell.className = "treegrid-cell";
        if (col.cssClass)
        {
            cell.classList.add(col.cssClass);
        }

        const value = getCellValue(node, col);
        if (col.renderer)
        {
            col.renderer(cell, node, value);
        }
        else
        {
            const valueSpan = createElement("span", ["treegrid-cell-value"], formatCellValue(value));
            cell.appendChild(valueSpan);
        }
    }

    /**
     * Cleans up virtual scrolling state.
     */
    private cleanupVirtualState(): void
    {
        if (!this.virtualState)
        {
            return;
        }
        if (this.virtualState.rafHandle)
        {
            cancelAnimationFrame(this.virtualState.rafHandle);
        }
        for (const row of this.virtualState.renderedRows.values())
        {
            row.remove();
        }
        for (const row of this.virtualState.recyclePool)
        {
            row.remove();
        }
        this.virtualState = null;
    }

    // ========================================================================
    // S15: SUMMARY / AGGREGATE ROWS
    // ========================================================================

    /**
     * Computes aggregate values for a parent node's children.
     */
    private computeAggregates(node: TreeGridNode): Map<string, unknown>
    {
        const result = new Map<string, unknown>();
        if (!node.children || node.children.length === 0)
        {
            return result;
        }

        const visibleCols = getVisibleColumns(this.columns);
        for (const col of visibleCols)
        {
            if (!col.aggregate)
            {
                continue;
            }
            const values: unknown[] = [];
            for (const child of node.children)
            {
                values.push(getCellValue(child, col));
            }
            result.set(col.id, col.aggregate(values));
        }

        return result;
    }

    /**
     * Renders aggregate values into data cells of a parent row.
     */
    private renderAggregateRow(rowEl: HTMLElement, node: TreeGridNode): void
    {
        const aggregates = this.computeAggregates(node);
        if (aggregates.size === 0)
        {
            return;
        }

        const cells = rowEl.querySelectorAll(".treegrid-cell");
        const visibleCols = getVisibleColumns(this.columns);
        for (let i = 1; i < cells.length; i++)
        {
            const colIdx = i - 1;
            if (colIdx >= visibleCols.length)
            {
                break;
            }
            const col = visibleCols[colIdx];
            const aggValue = aggregates.get(col.id);
            if (aggValue !== undefined)
            {
                const cell = cells[i] as HTMLElement;
                cell.textContent = "";
                cell.classList.add("treegrid-cell-aggregate");
                const valueSpan = createElement("span", ["treegrid-cell-value"], formatCellValue(aggValue));
                cell.appendChild(valueSpan);
            }
        }
    }

    // ========================================================================
    // S16: ROW STRIPING
    // ========================================================================

    /**
     * Applies zebra-stripe classes to visible rows.
     */
    private applyRowStriping(): void
    {
        if (!this.options.rowStriping || !this.bodyEl)
        {
            return;
        }
        const rows = this.bodyEl.querySelectorAll(".treegrid-row");
        for (let i = 0; i < rows.length; i++)
        {
            const row = rows[i] as HTMLElement;
            row.classList.remove("treegrid-row-striped");
            if (i % 2 === 1)
            {
                row.classList.add("treegrid-row-striped");
            }
        }
    }

    // ========================================================================
    // S17: DRAG AND DROP (Row-Level)
    // ========================================================================

    /**
     * Handles drag start on a row.
     */
    private onRowDragStart(e: DragEvent, row: HTMLElement, node: TreeGridNode): void
    {
        row.classList.add("treegrid-row-dragging");
        if (e.dataTransfer)
        {
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData(DND_MIME, node.id);
        }
    }

    /**
     * Determines drop position based on mouse Y within row.
     */
    private getDropPosition(e: DragEvent, row: HTMLElement): DropPosition
    {
        const rect = row.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const height = rect.height;
        if (y < height * 0.25)
        {
            return "before";
        }
        if (y > height * 0.75)
        {
            return "after";
        }
        return "inside";
    }

    /**
     * Handles drag over a row (shows drop indicator).
     */
    private onRowDragOver(e: DragEvent, row: HTMLElement): void
    {
        e.preventDefault();
        if (e.dataTransfer)
        {
            e.dataTransfer.dropEffect = "move";
        }
        this.clearDropIndicators(row);
        const pos = this.getDropPosition(e, row);
        if (pos === "before")
        {
            row.classList.add("treegrid-drop-before");
        }
        else if (pos === "after")
        {
            row.classList.add("treegrid-drop-after");
        }
        else
        {
            row.classList.add("treegrid-drop-inside");
        }
    }

    /**
     * Clears drop indicator classes from a row.
     */
    private clearDropIndicators(row: HTMLElement): void
    {
        row.classList.remove("treegrid-drop-before", "treegrid-drop-inside", "treegrid-drop-after");
    }

    /**
     * Handles drop on a row.
     */
    private onRowDrop(e: DragEvent, row: HTMLElement): void
    {
        e.preventDefault();
        this.clearDropIndicators(row);

        const targetId = row.getAttribute("data-node-id");
        if (!targetId)
        {
            return;
        }
        const target = this.nodeMap.get(targetId);
        if (!target)
        {
            return;
        }

        const pos = this.getDropPosition(e, row);

        // Check for internal drag
        const sourceId = e.dataTransfer?.getData(DND_MIME);
        if (sourceId)
        {
            const source = this.nodeMap.get(sourceId);
            if (!source)
            {
                return;
            }

            // Prevent dropping on self or ancestor
            if (sourceId === targetId || this.isAncestorOf(sourceId, targetId))
            {
                return;
            }

            // Validate via callback
            if (this.options.onDragValidate)
            {
                const valid = this.options.onDragValidate([source], target, pos);
                if (!valid)
                {
                    return;
                }
            }

            if (this.options.onDrop)
            {
                this.options.onDrop([source], target, pos);
            }
            this.emitChannel("drop", () => ({ sourceIds: [source.id], targetId: target.id, position: pos }));

            logInfo(`DnD: ${sourceId} -> ${pos} ${targetId}`);
            return;
        }

        // External drop
        if (this.options.onExternalDrop && e.dataTransfer)
        {
            this.options.onExternalDrop(e.dataTransfer, target, pos);
        }
    }

    /**
     * Handles drag end on a row (cleanup).
     */
    private onRowDragEnd(row: HTMLElement): void
    {
        row.classList.remove("treegrid-row-dragging");
    }

    // ========================================================================
    // S18: CONTEXT MENU
    // ========================================================================

    /**
     * Attaches context menu listeners to body rows.
     */
    private attachContextMenuListeners(): void
    {
        if (!this.options.enableContextMenu || !this.bodyEl)
        {
            return;
        }
        this.bodyEl.addEventListener("contextmenu", (e) =>
        {
            this.onContextMenu(e);
        });
    }

    /**
     * Handles right-click context menu on a row.
     */
    private onContextMenu(e: MouseEvent): void
    {
        const row = (e.target as HTMLElement).closest(".treegrid-row") as HTMLElement;
        if (!row)
        {
            return;
        }
        const nodeId = row.getAttribute("data-node-id");
        if (!nodeId)
        {
            return;
        }

        e.preventDefault();
        this.dismissContextMenu();

        const items = this.options.contextMenuItems;
        if (!items || items.length === 0)
        {
            return;
        }

        const menu = this.buildContextMenu(items, nodeId);
        menu.style.position = "fixed";
        menu.style.left = `${e.clientX}px`;
        menu.style.top = `${e.clientY}px`;
        document.body.appendChild(menu);
        this.contextMenuEl = menu;

        // Focus first item
        const firstItem = menu.querySelector(".treegrid-context-item:not([disabled])") as HTMLElement;
        if (firstItem)
        {
            firstItem.focus();
        }
    }

    /**
     * Builds the context menu DOM.
     */
    private buildContextMenu(items: TreeGridContextMenuItem[], nodeId: string): HTMLElement
    {
        const menu = createElement("div", ["treegrid-context-menu"]);
        setAttr(menu, "role", "menu");
        menu.style.zIndex = String(Z_CONTEXT_MENU);

        for (const item of items)
        {
            if (item.separator)
            {
                const sep = createElement("div", ["treegrid-context-separator"]);
                menu.appendChild(sep);
                continue;
            }

            const btn = createElement("button", ["treegrid-context-item"]);
            setAttr(btn, "role", "menuitem");
            setAttr(btn, "type", "button");

            if (item.icon)
            {
                const icon = createElement("i", [item.icon]);
                btn.appendChild(icon);
            }

            const labelSpan = document.createTextNode(item.label);
            btn.appendChild(labelSpan);

            if (item.shortcutHint)
            {
                const shortcut = createElement("span", ["treegrid-context-shortcut"], item.shortcutHint);
                btn.appendChild(shortcut);
            }

            if (item.disabled)
            {
                btn.setAttribute("disabled", "true");
            }
            else
            {
                btn.addEventListener("click", () =>
                {
                    this.onContextMenuAction(item.id, nodeId);
                });
            }

            menu.appendChild(btn);
        }

        // Keyboard nav in context menu
        menu.addEventListener("keydown", (e) =>
        {
            this.onContextMenuKeydown(e);
        });

        return menu;
    }

    /**
     * Handles a context menu action click.
     */
    private onContextMenuAction(actionId: string, nodeId: string): void
    {
        this.dismissContextMenu();
        const node = this.nodeMap.get(nodeId);
        if (node && this.options.onContextMenuAction)
        {
            this.options.onContextMenuAction(actionId, node);
        }
        if (node)
        {
            this.emitChannel("contextMenuAction", () => ({ actionId, nodeId }));
        }
        logInfo(`Context action: ${actionId} on ${nodeId}`);
    }

    /**
     * Handles keyboard navigation within the context menu.
     */
    private onContextMenuKeydown(e: KeyboardEvent): void
    {
        logTrace("keydown handler:", { key: e.key.length > 1 ? e.key : "(char)", ctrl: e.ctrlKey });
        if (!this.contextMenuEl)
        {
            return;
        }

        const items = Array.from(
            this.contextMenuEl.querySelectorAll(".treegrid-context-item:not([disabled])")
        ) as HTMLElement[];

        const current = document.activeElement as HTMLElement;
        const idx = items.indexOf(current);

        switch (e.key)
        {
            case "ArrowDown":
                e.preventDefault();
                if (idx < items.length - 1)
                {
                    items[idx + 1].focus();
                }
                else
                {
                    items[0].focus();
                }
                break;
            case "ArrowUp":
                e.preventDefault();
                if (idx > 0)
                {
                    items[idx - 1].focus();
                }
                else
                {
                    items[items.length - 1].focus();
                }
                break;
            case "Escape":
                e.preventDefault();
                this.dismissContextMenu();
                break;
            case "Enter":
                e.preventDefault();
                if (current && current.classList.contains("treegrid-context-item"))
                {
                    current.click();
                }
                break;
        }
    }

    // ========================================================================
    // S18b: COLUMN PICKER
    // ========================================================================

    /**
     * Builds the column picker gear button for the header.
     */
    private buildColumnPickerButton(): HTMLElement
    {
        const btn = createElement("button", ["treegrid-column-picker-btn"]);
        setAttr(btn, "type", "button");
        setAttr(btn, "title", "Column visibility");
        setAttr(btn, "aria-label", "Toggle column visibility");
        const icon = createElement("i", ["bi", "bi-gear"]);
        btn.appendChild(icon);

        btn.addEventListener("click", (e) =>
        {
            e.stopPropagation();
            this.toggleColumnPicker(btn);
        });

        return btn;
    }

    /**
     * Toggles the column picker dropdown open/closed.
     */
    private toggleColumnPicker(anchor: HTMLElement): void
    {
        logInfo("toggleColumnPicker called, current picker:", this.columnPickerEl ? "open" : "closed");
        if (this.columnPickerEl)
        {
            this.dismissColumnPicker();
            return;
        }

        const dropdown = createElement("div", ["treegrid-column-picker-dropdown"]);

        for (const col of this.columns)
        {
            const item = createElement("label", ["treegrid-column-picker-item"]);
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.checked = !col.hidden;
            checkbox.setAttribute("data-column-id", col.id);

            checkbox.addEventListener("change", () =>
            {
                this.onColumnPickerChange(col.id, checkbox.checked);
            });

            const labelText = createElement("span", [], col.label);
            item.appendChild(checkbox);
            item.appendChild(labelText);
            dropdown.appendChild(item);
        }

        // Position below the anchor button, relative to rootEl.
        // The header has overflow:hidden so we must attach to rootEl.
        const rect = anchor.getBoundingClientRect();
        const rootRect = this.rootEl?.getBoundingClientRect();
        if (rootRect)
        {
            dropdown.style.position = "absolute";
            dropdown.style.top = `${rect.bottom - rootRect.top}px`;
            dropdown.style.right = "0";
            dropdown.style.zIndex = "1050";
        }

        if (this.rootEl)
        {
            this.rootEl.style.position = "relative";
            this.rootEl.appendChild(dropdown);
        }
        this.columnPickerEl = dropdown;
        logInfo("Column picker opened");
    }

    /**
     * Handles a column picker checkbox change.
     */
    private onColumnPickerChange(colId: string, visible: boolean): void
    {
        if (visible)
        {
            this.showColumn(colId);
        }
        else
        {
            this.hideColumn(colId);
        }

        // rebuildHeaderAndBody() destroyed the picker dropdown.
        // Re-open it so the user can continue toggling columns.
        if (this.headerEl && this.options.showColumnPicker)
        {
            const btn = this.headerEl.querySelector(
                ".treegrid-column-picker-btn"
            ) as HTMLElement;
            if (btn)
            {
                this.toggleColumnPicker(btn);
            }
        }
    }

    /**
     * Dismisses the column picker dropdown.
     */
    private dismissColumnPicker(): void
    {
        if (this.columnPickerEl)
        {
            this.columnPickerEl.remove();
            this.columnPickerEl = null;
        }
    }

    // ========================================================================
    // S19: PUBLIC API
    // ========================================================================

    /**
     * Adds a node to the tree. If parentId is null, adds as root.
     */
    public addNode(node: TreeGridNode, parentId: string | null): void
    {
        if (parentId === null)
        {
            this.roots.push(node);
        }
        else
        {
            const parent = this.nodeMap.get(parentId);
            if (!parent)
            {
                logWarn(`addNode: parent ${parentId} not found`);
                return;
            }
            if (!parent.children)
            {
                parent.children = [];
            }
            parent.children.push(node);
        }
        this.insertIntoIndex(node, parentId);
        this.invalidateVisibleCache();
        this.renderTree();
        logInfo(`addNode: ${node.id} under ${parentId ?? "root"}`);
    }

    /**
     * Removes a node and its subtree from the tree.
     */
    public removeNode(nodeId: string): void
    {
        const node = this.nodeMap.get(nodeId);
        if (!node)
        {
            logWarn(`removeNode: ${nodeId} not found`);
            return;
        }

        const parentId = this.parentMap.get(nodeId);
        if (parentId)
        {
            const parent = this.nodeMap.get(parentId);
            if (parent?.children)
            {
                parent.children = parent.children.filter((c) => c.id !== nodeId);
            }
        }
        else
        {
            this.roots = this.roots.filter((r) => r.id !== nodeId);
        }

        this.removeFromIndex(nodeId);
        this.selectedIds.delete(nodeId);
        this.expandedIds.delete(nodeId);
        this.rowMap.delete(nodeId);
        this.invalidateVisibleCache();
        this.renderTree();
        logInfo(`removeNode: ${nodeId}`);
    }

    /**
     * Updates a node's properties.
     */
    public updateNode(nodeId: string, updates: Partial<TreeGridNode>): void
    {
        const node = this.nodeMap.get(nodeId);
        if (!node)
        {
            logWarn(`updateNode: ${nodeId} not found`);
            return;
        }
        Object.assign(node, updates);
        this.invalidateVisibleCache();
        this.renderTree();
    }

    /**
     * Replaces all nodes.
     */
    public setNodes(nodes: TreeGridNode[]): void
    {
        this.roots = nodes;
        this.rebuildNodeIndex();
        this.expandedIds.clear();
        this.selectedIds.clear();
        this.initExpandedIds();
        this.invalidateVisibleCache();
        this.renderTree();
    }

    /**
     * Gets a node by ID.
     */
    public getNode(nodeId: string): TreeGridNode | undefined
    {
        return this.nodeMap.get(nodeId);
    }

    /**
     * Sets new column definitions.
     */
    public setColumns(columns: TreeGridColumn[]): void
    {
        this.columns = columns.map((col) => ({ ...col }));
        this.columnWidths.clear();
        this.resolveColumnDefaults();
        this.rebuildHeaderAndBody();
    }

    /**
     * Shows a hidden column.
     */
    public showColumn(columnId: string): void
    {
        const col = this.columns.find((c) => c.id === columnId);
        if (col)
        {
            col.hidden = false;
            this.rebuildHeaderAndBody();
        }
    }

    /**
     * Hides a column.
     */
    public hideColumn(columnId: string): void
    {
        const col = this.columns.find((c) => c.id === columnId);
        if (col)
        {
            col.hidden = true;
            this.rebuildHeaderAndBody();
        }
    }

    /**
     * Updates a single column's properties at runtime.
     * Triggers header/body rebuild only when necessary.
     */
    public updateColumn(columnId: string, updates: Partial<TreeGridColumn>): void
    {
        const col = this.columns.find((c) => c.id === columnId);
        if (!col)
        {
            logWarn(`updateColumn: ${columnId} not found`);
            return;
        }

        const needsRebuild = "hidden" in updates || "label" in updates
            || "sortable" in updates || "resizable" in updates || "editorType" in updates
            || "editorOptions" in updates || "cssClass" in updates || "align" in updates;

        const needsWidthOnly = "width" in updates && !needsRebuild;

        Object.assign(col, updates);

        if ("width" in updates && updates.width !== undefined)
        {
            this.columnWidths.set(columnId, updates.width);
        }

        if (needsRebuild)
        {
            this.rebuildHeaderAndBody();
        }
        else if (needsWidthOnly)
        {
            this.updateColumnStyles();
        }

        logInfo(`updateColumn: ${columnId}`, updates);
    }

    /**
     * Returns a copy of the current column definitions.
     */
    public getColumns(): TreeGridColumn[]
    {
        return this.columns.map((c) => ({ ...c }));
    }

    /**
     * Returns the currently selected nodes.
     */
    public getSelectedNodes(): TreeGridNode[]
    {
        const result: TreeGridNode[] = [];
        for (const id of this.selectedIds)
        {
            const node = this.nodeMap.get(id);
            if (node)
            {
                result.push(node);
            }
        }
        return result;
    }

    /**
     * Selects a node programmatically.
     */
    public selectNode(nodeId: string): void
    {
        const node = this.nodeMap.get(nodeId);
        if (!node)
        {
            return;
        }
        this.selectedIds.add(nodeId);
        const row = this.rowMap.get(nodeId);
        if (row)
        {
            row.classList.add("treegrid-row-selected");
            setAttr(row, "aria-selected", "true");
        }
        this.fireSelectionChange();
    }

    /**
     * Deselects a node programmatically.
     */
    public deselectNode(nodeId: string): void
    {
        this.selectedIds.delete(nodeId);
        const row = this.rowMap.get(nodeId);
        if (row)
        {
            row.classList.remove("treegrid-row-selected");
            removeAttr(row, "aria-selected");
        }
        this.fireSelectionChange();
    }

    /**
     * Clears all selection.
     */
    public clearSelection(): void
    {
        this.clearSelectionVisuals();
        this.selectedIds.clear();
        this.fireSelectionChange();
    }

    /**
     * Expands a node programmatically.
     */
    public expandNode(nodeId: string): void
    {
        if (!this.expandedIds.has(nodeId))
        {
            this.expandNodeInternal(nodeId);
        }
    }

    /**
     * Collapses a node programmatically.
     */
    public collapseNode(nodeId: string): void
    {
        if (this.expandedIds.has(nodeId))
        {
            this.collapseNodeInternal(nodeId);
        }
    }

    /**
     * Expands all nodes.
     */
    public expandAll(): void
    {
        const stack: TreeGridNode[] = [...this.roots];
        while (stack.length > 0)
        {
            const node = stack.pop()!;
            if (node.children && node.children.length > 0)
            {
                this.expandedIds.add(node.id);
                stack.push(...node.children);
            }
        }
        this.invalidateVisibleCache();
        this.renderTree();
    }

    /**
     * Collapses all nodes.
     */
    public collapseAll(): void
    {
        this.expandedIds.clear();
        this.invalidateVisibleCache();
        this.renderTree();
    }

    /**
     * Sets focus on a specific cell.
     */
    public focusCell(row: number, col: number): void
    {
        this.setFocusCell(row, col);
    }

    /**
     * Scrolls to make a node visible.
     */
    public scrollToNode(nodeId: string): void
    {
        this.getVisibleNodes();
        const idx = this.visibleIndexMap.get(nodeId);
        if (idx === undefined || !this.bodyEl)
        {
            return;
        }
        const rowHeight = this.options.rowHeight ?? DEFAULT_ROW_HEIGHT;
        const targetTop = idx * rowHeight;
        this.bodyEl.scrollTop = targetTop;
    }

    // ── Surface contract (additive, readiness step 2 B6) ──

    /** TreeGrid has no data slots; use setNodes(), addNode(), updateNode() or removeNode(). */
    public setData(slot: string, _value: unknown): void
    {
        throw new Error(
            `${LOG_PREFIX} setData("${slot}"): TreeGrid has no data slots. `
            + "Use setNodes(), addNode(), updateNode() or removeNode().");
    }

    /** Subscribes to a declared channel; returns the unsubscribe. */
    public on(channel: string, handler: (payload: unknown) => void): () => void
    {
        const handlers = this.channelHandlers.get(channel);
        if (!handlers)
        {
            throw new Error(
                `${LOG_PREFIX} on("${channel}"): unknown channel. `
                + `The channels are ${SURFACE_CHANNELS.map((c) => `"${c}"`).join(", ")}.`);
        }

        handlers.add(handler);

        return (): void => { handlers.delete(handler); };
    }

    /** The ids of the expanded nodes and of the selected nodes. */
    public getState(): Record<string, unknown>
    {
        return { expanded: Array.from(this.expandedIds), selection: Array.from(this.selectedIds) };
    }

    /**
     * Restores state captured by getState() silently: no legacy callback and no channel fires. Unknown ids are
     * ignored, and selection becomes exactly the given ids. A lazy node not loaded yet starts its async load
     * instead, so its id joins getState().expanded, and onRowToggle fires, only when the load completes.
     */
    public setState(state: Record<string, unknown>): void
    {
        if (Array.isArray(state.expanded))
        {
            this.expandedIds.clear();
            for (const id of state.expanded as string[])
            {
                const node = this.nodeMap.get(id);
                if (node && node.lazy && node.children === null)
                {
                    this.startLazyLoad(node);
                }
                else if (node && isNodeParent(node))
                {
                    this.expandedIds.add(id);
                }
            }
        }

        if (Array.isArray(state.selection))
        {
            this.selectedIds = new Set((state.selection as string[]).filter((id) => this.nodeMap.has(id)));
        }

        this.invalidateVisibleCache();
        this.renderTree();
    }

    /**
     * Delivers a channel payload to each subscriber, isolated by try/catch. The caller has already invoked the
     * legacy callback. Each subscriber gets its own fresh copy, built only when somebody listens.
     */
    private emitChannel(channel: SurfaceChannel, buildPayload: () => unknown): void
    {
        const handlers = this.channelHandlers.get(channel)!;
        if (handlers.size === 0)
        {
            return;
        }

        for (const handler of handlers)
        {
            try
            {
                handler(buildPayload());
            }
            catch (err)
            {
                logError(`Channel "${channel}" handler threw`, err);
            }
        }
    }

    /**
     * Returns the root DOM element.
     */
    public getElement(): HTMLElement | null
    {
        return this.rootEl;
    }

    /**
     * Returns the component instance ID for debugging.
     */
    public getId(): string
    {
        return this.rootEl?.id ?? "";
    }

}

// ============================================================================
// Global Exports
// ============================================================================

/**
 * Factory function to create a TreeGrid instance.
 */
export function createTreeGrid(options: TreeGridOptions): TreeGridHandle
{
    // ERR-2. AGENTS.md: a missing option throws, it does not
    // get a silent default. This used to reach the field and
    // crash a frame later with a TypeError that names the line
    // rather than the thing the caller left out. Absent means
    // undefined, so an empty array or a zero is present.
    if (options.label === undefined)
    {
        throw new Error(
            `${LOG_PREFIX} options.label is required. `
            + "Pass it when creating the TreeGrid.");
    }
    if (options.nodes === undefined)
    {
        throw new Error(
            `${LOG_PREFIX} options.nodes is required. `
            + "Pass it when creating the TreeGrid.");
    }

    if (options.columns === undefined)
    {
        throw new Error(
            `${LOG_PREFIX} options.columns is required. `
            + "Pass it when creating the TreeGrid.");
    }

    return new TreeGrid(options);
}

if (typeof window !== "undefined")
{
    window["createTreeGrid"] = createTreeGrid;
}
