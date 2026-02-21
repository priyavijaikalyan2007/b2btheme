/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: TreeView
 * 📜 PURPOSE: A highly configurable, generic tree view component for
 *    representing multi-tree structured data (org hierarchies, folder trees,
 *    resource explorers). Supports lazy loading, multi-select, drag and drop
 *    (internal + cross-tree + external), context menu, inline rename, search
 *    with mark highlighting, starred/favourites, sort modes, extensible node
 *    types, badges, toolbar, and WAI-ARIA tree pattern keyboard navigation.
 * 🔗 RELATES: [[EnterpriseTheme]], [[CustomComponents]], [[TreeViewStyles]]
 * ⚡ FLOW: [Consumer App] -> [createTreeView()] -> [DOM tree element]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// S1: TYPES, INTERFACES, AND CONSTANTS
// ============================================================================

/** Extensible node kind. Built-in kinds plus any custom string. */
export type TreeNodeKind = "root" | "folder" | "leaf" | "virtual-root" | string;

/** Sort mode for sibling ordering. */
export type TreeSortMode = "alpha-asc" | "alpha-desc" | "newest" | "oldest" | "custom";

/** Selection behaviour. */
export type TreeSelectionMode = "single" | "multi" | "none";

/** Drop position relative to a target node. */
export type DropPosition = "before" | "inside" | "after";

/**
 * Describes the behaviour and appearance of a node kind.
 * Registered via options.nodeTypes.
 */
export interface TreeNodeTypeDescriptor
{
    /** Kind identifier matching TreeNode.kind. */
    kind: string;

    /** Default Bootstrap Icons class for this kind. */
    icon?: string;

    /** Whether this kind can have children. Default: false. */
    isParent?: boolean;

    /** Whether nodes of this kind can be renamed inline. Default: true. */
    renamable?: boolean;

    /** Whether nodes of this kind can be dragged. Default: true. */
    draggable?: boolean;

    /** Whether nodes of this kind accept drops. Default: true for parents. */
    droppable?: boolean;

    /** Context menu items specific to this kind. */
    contextMenuItems?: TreeContextMenuItem[];

    /** Additional CSS class added to the node row. */
    cssClass?: string;
}

/**
 * A badge displayed after the node label.
 */
export interface TreeBadge
{
    /** Badge text content. */
    text: string;

    /** Bootstrap badge colour variant. Default: "secondary". */
    variant?: "primary" | "secondary" | "success" | "danger" | "warning" | "info";

    /** Native tooltip text. */
    tooltip?: string;
}

/**
 * Represents a single node in the tree.
 * The consumer owns this data; the TreeView reads but never mutates it
 * (except for expanded state tracking which is internal).
 */
export interface TreeNode
{
    /** Unique identifier across the entire tree. */
    id: string;

    /** Display text. */
    label: string;

    /** Node kind — must match a key in options.nodeTypes if provided. */
    kind: string;

    /** Bootstrap Icons class override (takes precedence over type descriptor). */
    icon?: string;

    /** Child nodes. null means lazy-loadable; undefined/[] means no children. */
    children?: TreeNode[] | null;

    /** When true and children is null, expand triggers onLoadChildren. */
    lazy?: boolean;

    /** Whether this node starts expanded. Default: false. */
    expanded?: boolean;

    /** When true, this node cannot be selected, expanded, or interacted with. */
    disabled?: boolean;

    /** Whether this node appears in the starred group. */
    starred?: boolean;

    /** Native tooltip text for the node row. */
    tooltip?: string;

    /** Badges displayed after the label. */
    badges?: TreeBadge[];

    /** Arbitrary consumer data passed back in callbacks. */
    data?: unknown;
}

/**
 * A toolbar action button displayed in the tree toolbar.
 */
export interface TreeToolbarAction
{
    /** Unique action identifier. */
    id: string;

    /** Bootstrap Icons class. */
    icon?: string;

    /** Button label text (shown if no icon). */
    label?: string;

    /** Native tooltip text (required for icon-only buttons). */
    tooltip: string;

    /** Whether the button is disabled. */
    disabled?: boolean;

    /** Click handler. */
    onClick: () => void;
}

/**
 * A context menu item for right-click menus.
 */
export interface TreeContextMenuItem
{
    /** Unique item identifier. */
    id: string;

    /** Display label. */
    label: string;

    /** Bootstrap Icons class. */
    icon?: string;

    /** Keyboard shortcut hint text (display only). */
    shortcutHint?: string;

    /** Whether this item is disabled. */
    disabled?: boolean;

    /** When true, renders a separator line instead of a clickable item. */
    separator?: boolean;
}

/**
 * Full configuration for the TreeView component.
 */
export interface TreeViewOptions
{
    /** DOM element ID for the container. */
    containerId: string;

    /** Root-level tree nodes. */
    roots: TreeNode[];

    /** Registry of node type descriptors keyed by kind. */
    nodeTypes?: Record<string, TreeNodeTypeDescriptor>;

    /** Selection mode. Default: "single". */
    selectionMode?: TreeSelectionMode;

    /** Sort mode for siblings. Default: "alpha-asc". */
    sortMode?: TreeSortMode;

    /** Custom sort comparator (used when sortMode is "custom"). */
    sortComparator?: (a: TreeNode, b: TreeNode) => number;

    /** Show the starred/favourites group at the top. Default: false. */
    showStarred?: boolean;

    /** Label for the starred group header. Default: "Starred". */
    starredLabel?: string;

    /** Show the search box in the toolbar. Default: false. */
    showSearch?: boolean;

    /** Debounce delay for search input in milliseconds. Default: 300. */
    searchDebounceMs?: number;

    /** Toolbar action buttons. */
    toolbarActions?: TreeToolbarAction[];

    /** Enable drag and drop. Default: false. */
    enableDragDrop?: boolean;

    /** Enable F2 inline rename. Default: false. */
    enableInlineRename?: boolean;

    /** Enable right-click context menu. Default: false. */
    enableContextMenu?: boolean;

    /** Per-level indent in pixels. Default: 20. */
    indentPx?: number;

    /** Component height CSS value. Default: "100%". */
    height?: string;

    /** Component width CSS value. Default: "100%". */
    width?: string;

    /** Additional CSS class on the root element. */
    cssClass?: string;

    /** Message shown when the tree is empty. Default: "No items to display". */
    emptyMessage?: string;

    // -- Callbacks --

    /** Fired when a node is selected or deselected. */
    onSelect?: (node: TreeNode, selected: boolean) => void;

    /** Fired when the full selection set changes. */
    onSelectionChange?: (nodes: TreeNode[]) => void;

    /** Fired when a node is double-clicked or Enter is pressed. */
    onActivate?: (node: TreeNode) => void;

    /** Fired when a node is expanded or collapsed. */
    onToggle?: (node: TreeNode, expanded: boolean) => void;

    /** Async loader for lazy children. Return child nodes. */
    onLoadChildren?: (node: TreeNode) => Promise<TreeNode[]>;

    /** Inline rename handler. Return true to accept, false to reject. */
    onRename?: (node: TreeNode, newLabel: string) => Promise<boolean> | boolean;

    /** Fired when a node's star state is toggled. */
    onStarToggle?: (node: TreeNode, starred: boolean) => void;

    /** Validate a drag operation before allowing drop. Return true to allow. */
    onDragValidate?: (
        sources: TreeNode[], target: TreeNode, position: DropPosition
    ) => boolean;

    /** Fired when nodes are dropped onto a target. */
    onDrop?: (
        sources: TreeNode[], target: TreeNode, position: DropPosition
    ) => void;

    /** Fired when external content is dropped onto the tree. */
    onExternalDrop?: (
        dataTransfer: DataTransfer, target: TreeNode, position: DropPosition
    ) => void;

    /** Fired when a context menu action is selected. */
    onContextMenuAction?: (actionId: string, node: TreeNode) => void;

    /** Fired after programmatic refresh completes. */
    onRefreshComplete?: () => void;

    /** Custom node renderer. Return an element to replace the default row content, or null. */
    nodeRenderer?: (node: TreeNode, level: number) => HTMLElement | null;

    /** Custom search filter. Return true to include the node. */
    filterPredicate?: (searchText: string, node: TreeNode) => boolean;

    // -- Virtual scrolling options

    /** Row height in pixels for virtual scrolling. Default: 28. */
    rowHeight?: number;

    /** Enable virtual scrolling explicitly.
     *  "auto" = enabled when visible nodes > 5000. Default: "auto". */
    virtualScrolling?: "auto" | "enabled" | "disabled";

    /** Rows to render above/below the viewport as buffer. Default: 50. */
    scrollBuffer?: number;

    // -- Async search options

    /** Server-side search handler. Bypasses client search for large trees. */
    onSearchAsync?: (query: string) => Promise<string[]>;

    /** Node count above which onSearchAsync is preferred. Default: 5000. */
    searchAsyncThreshold?: number;

    /** Override default key combos. Keys are action names, values are combo strings. */
    keyBindings?: Partial<Record<string, string>>;
}

// ============================================================================
// S1 (continued): CONSTANTS
// ============================================================================

const LOG_PREFIX = "[TreeView]";

/** MIME type for cross-tree drag data. */
const DND_MIME = "application/x-treeview";

/** Default indent per level in pixels. */
const DEFAULT_INDENT = 20;

/** Default search debounce in milliseconds. */
const DEFAULT_SEARCH_DEBOUNCE = 300;

/** Context menu z-index — above all fixed layout elements, below modals. */
const Z_INDEX_CONTEXT_MENU = 1050;

/** Click disambiguation threshold for drag in pixels. */
const DRAG_THRESHOLD_PX = 5;

/** Default row height for virtual scrolling in pixels. */
const DEFAULT_ROW_HEIGHT = 28;

/** Default buffer rows above/below viewport for virtual scrolling. */
const DEFAULT_SCROLL_BUFFER = 50;

/** Visible-node threshold for auto-enabling virtual scrolling. */
const VIRTUAL_THRESHOLD = 5000;

/** Default threshold for async search. */
const DEFAULT_SEARCH_ASYNC_THRESHOLD = 5000;

/** Nodes per animation frame in chunked search. */
const SEARCH_CHUNK_SIZE = 5000;

/** Instance counter for unique ID generation. */
let instanceCounter = 0;

/** Default keyboard bindings for tree navigation actions (KEYBOARD.md S3). */
const DEFAULT_KEY_BINDINGS: Record<string, string> = {
    "moveUp": "ArrowUp",
    "moveDown": "ArrowDown",
    "expand": "ArrowRight",
    "collapse": "ArrowLeft",
    "toggleSelect": " ",
    "edit": "Enter",
    "rename": "F2",
    "delete": "Delete",
    "home": "Home",
    "end": "End",
};

/**
 * A single entry in the cached flat visible-nodes array.
 * Pre-computed during cache rebuild for O(1) lookups.
 */
interface VisibleEntry
{
    /** Reference to the TreeNode. */
    node: TreeNode;

    /** Depth level (1 = root). */
    level: number;

    /** Index in the visibleNodes array. */
    index: number;
}

/**
 * Internal state for the virtual scrolling renderer.
 */
interface VirtualScrollState
{
    /** Index of the first rendered row in visibleNodes[]. */
    startIndex: number;

    /** Index of the last rendered row (exclusive) in visibleNodes[]. */
    endIndex: number;

    /** Spacer div above rendered rows. */
    topSpacer: HTMLElement;

    /** Spacer div below rendered rows. */
    bottomSpacer: HTMLElement;

    /** The virtual viewport container div. */
    viewportEl: HTMLElement;

    /** Pool of recycled row DOM elements. */
    rowPool: HTMLElement[];

    /** Whether a scroll rAF is pending. */
    scrollPending: boolean;

    /** The rAF handle for cancellation. */
    rafHandle: number;

    /** Set of node IDs pinned (not recyclable during rename/drag). */
    pinnedIds: Set<string>;
}

// ============================================================================
// S2: DOM HELPERS
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
 * Sets an attribute on an HTML element.
 */
function setAttr(el: HTMLElement, name: string, value: string): void
{
    el.setAttribute(name, value);
}

/**
 * Removes an attribute from an HTML element.
 */
function removeAttr(el: HTMLElement, name: string): void
{
    el.removeAttribute(name);
}

/**
 * Clamps a number between min and max.
 */
function clamp(value: number, min: number, max: number): number
{
    return Math.max(min, Math.min(max, value));
}

// ============================================================================
// S3: INTERNAL HELPERS
// ============================================================================

/**
 * Default search filter: case-insensitive substring match on label.
 */
function defaultFilterPredicate(searchText: string, node: TreeNode): boolean
{
    return node.label.toLowerCase().includes(searchText.toLowerCase());
}

/**
 * Wraps matched portions of a label in <mark> elements.
 * Returns a DocumentFragment with text nodes and <mark> elements.
 */
function highlightMatch(label: string, searchText: string): DocumentFragment
{
    const fragment = document.createDocumentFragment();

    if (!searchText)
    {
        fragment.appendChild(document.createTextNode(label));
        return fragment;
    }

    const lowerLabel = label.toLowerCase();
    const lowerSearch = searchText.toLowerCase();
    let cursor = 0;

    while (cursor < label.length)
    {
        const matchIndex = lowerLabel.indexOf(lowerSearch, cursor);

        if (matchIndex === -1)
        {
            fragment.appendChild(
                document.createTextNode(label.substring(cursor))
            );
            break;
        }

        if (matchIndex > cursor)
        {
            fragment.appendChild(
                document.createTextNode(label.substring(cursor, matchIndex))
            );
        }

        const mark = createElement("mark", ["treeview-match"]);
        mark.textContent = label.substring(
            matchIndex, matchIndex + searchText.length
        );
        fragment.appendChild(mark);

        cursor = matchIndex + searchText.length;
    }

    return fragment;
}

/**
 * Sorts siblings in-place according to a sort mode.
 * Always places parent-capable nodes (folders) before leaf nodes.
 */
function sortNodes(
    nodes: TreeNode[],
    mode: TreeSortMode,
    typeMap: Map<string, TreeNodeTypeDescriptor>,
    comparator?: (a: TreeNode, b: TreeNode) => number
): TreeNode[]
{
    const isParent = (n: TreeNode): boolean =>
    {
        const desc = typeMap.get(n.kind);
        return !!(desc?.isParent) ||
               (n.children !== undefined && n.children !== null);
    };

    const sorted = [...nodes];

    sorted.sort((a, b) =>
    {
        // Folders first
        const aFolder = isParent(a) ? 0 : 1;
        const bFolder = isParent(b) ? 0 : 1;

        if (aFolder !== bFolder)
        {
            return aFolder - bFolder;
        }

        switch (mode)
        {
            case "alpha-asc":
                return a.label.localeCompare(b.label);

            case "alpha-desc":
                return b.label.localeCompare(a.label);

            case "newest":
                return 0; // Consumer-defined ordering preserved

            case "oldest":
                return 0;

            case "custom":
                return comparator ? comparator(a, b) : 0;

            default:
                return a.label.localeCompare(b.label);
        }
    });

    return sorted;
}

/**
 * Collects all matching nodes and their ancestor IDs for search expansion.
 * Returns { matchIds, ancestorIds }.
 */
function findMatchesAndAncestors(
    roots: TreeNode[],
    predicate: (node: TreeNode) => boolean
): { matchIds: Set<string>; ancestorIds: Set<string> }
{
    const matchIds = new Set<string>();
    const ancestorIds = new Set<string>();

    function walk(node: TreeNode, ancestors: string[]): boolean
    {
        let hasMatch = false;

        if (predicate(node))
        {
            matchIds.add(node.id);
            hasMatch = true;
        }

        if (node.children)
        {
            for (const child of node.children)
            {
                if (walk(child, [...ancestors, node.id]))
                {
                    hasMatch = true;
                }
            }
        }

        if (hasMatch)
        {
            for (const aid of ancestors)
            {
                ancestorIds.add(aid);
            }
        }

        return hasMatch;
    }

    for (const root of roots)
    {
        walk(root, []);
    }

    return { matchIds, ancestorIds };
}

/**
 * Flattens a tree into a visible node list (only expanded parents' children).
 * Used for keyboard navigation ordering and Shift+Click range selection.
 */
function flattenVisible(
    roots: TreeNode[],
    expandedIds: Set<string>
): TreeNode[]
{
    const result: TreeNode[] = [];

    function walk(node: TreeNode): void
    {
        result.push(node);

        if (expandedIds.has(node.id) && node.children)
        {
            for (const child of node.children)
            {
                walk(child);
            }
        }
    }

    for (const root of roots)
    {
        walk(root);
    }

    return result;
}

/**
 * Finds a node by ID recursively.
 */
function findNodeById(roots: TreeNode[], id: string): TreeNode | undefined
{
    for (const root of roots)
    {
        if (root.id === id)
        {
            return root;
        }

        if (root.children)
        {
            const found = findNodeById(root.children, id);
            if (found)
            {
                return found;
            }
        }
    }

    return undefined;
}

/**
 * Finds the parent of a node by child ID.
 */
function findParent(
    roots: TreeNode[], childId: string
): TreeNode | undefined
{
    for (const root of roots)
    {
        if (root.children)
        {
            for (const child of root.children)
            {
                if (child.id === childId)
                {
                    return root;
                }

                const found = findParent(root.children, childId);
                if (found)
                {
                    return found;
                }
            }
        }
    }

    return undefined;
}

/**
 * Checks whether ancestor contains descendant.
 */
function isDescendant(ancestor: TreeNode, descendantId: string): boolean
{
    if (!ancestor.children)
    {
        return false;
    }

    for (const child of ancestor.children)
    {
        if (child.id === descendantId || isDescendant(child, descendantId))
        {
            return true;
        }
    }

    return false;
}

/**
 * Collects all starred nodes from the tree.
 */
function collectStarred(roots: TreeNode[]): TreeNode[]
{
    const result: TreeNode[] = [];

    function walk(node: TreeNode): void
    {
        if (node.starred)
        {
            result.push(node);
        }

        if (node.children)
        {
            for (const child of node.children)
            {
                walk(child);
            }
        }
    }

    for (const root of roots)
    {
        walk(root);
    }

    return result;
}

// ============================================================================
// S4: CLASS SHELL, CONSTRUCTOR, STATE FIELDS
// ============================================================================

/**
 * TreeView renders a hierarchical tree structure with full interaction support:
 * expand/collapse, selection, keyboard navigation, drag-and-drop, context menu,
 * inline rename, search filtering, starred favourites, and extensible node types.
 *
 * @example
 * const tree = new TreeView({
 *     containerId: "my-tree",
 *     roots: [
 *         { id: "1", label: "Documents", kind: "folder", children: [
 *             { id: "2", label: "report.pdf", kind: "leaf" }
 *         ]}
 *     ],
 *     onSelect: (node, selected) => console.log(node.label, selected)
 * });
 */
export class TreeView
{
    // -- Configuration
    private readonly instanceId: string;
    private options: TreeViewOptions;
    private readonly typeMap: Map<string, TreeNodeTypeDescriptor>;

    // -- Data
    private roots: TreeNode[] = [];

    // -- State
    private expandedIds = new Set<string>();
    private selectedIds = new Set<string>();
    private loadingIds = new Set<string>();
    private focusedNodeId: string | null = null;
    private lastSelectedId: string | null = null;
    private searchText = "";
    private searchMatchIds = new Set<string>();
    private searchAncestorIds = new Set<string>();
    private currentSortMode: TreeSortMode;
    private isRenaming = false;
    private destroyed = false;

    // -- DOM references
    private containerEl: HTMLElement | null = null;
    private rootEl: HTMLElement | null = null;
    private toolbarEl: HTMLElement | null = null;
    private searchInputEl: HTMLInputElement | null = null;
    private listContainerEl: HTMLElement | null = null;
    private treeListEl: HTMLElement | null = null;
    private emptyEl: HTMLElement | null = null;
    private contextMenuEl: HTMLElement | null = null;
    private starredGroupEl: HTMLElement | null = null;

    // -- Node index: O(1) lookups by ID
    private nodeMap = new Map<string, TreeNode>();
    private parentMap = new Map<string, string>();

    // -- Cached flat visible array: O(1) navigation
    private visibleNodes: VisibleEntry[] = [];
    private visibleIndexMap = new Map<string, number>();
    private visibleDirty = true;

    // -- Virtual scrolling
    private isVirtual = false;
    private virtualState: VirtualScrollState | null = null;

    // -- Node DOM map: nodeId → row HTMLElement
    private nodeRowMap = new Map<string, HTMLElement>();
    private nodeItemMap = new Map<string, HTMLElement>();

    // -- Search debounce and generation counter (for stale result detection)
    private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
    private searchGeneration = 0;

    // -- Drag state
    private dragSourceIds: string[] = [];
    private currentDropTarget: HTMLElement | null = null;
    private currentDropPosition: DropPosition | null = null;

    // -- Context menu state
    private contextMenuNodeId: string | null = null;
    private contextMenuFocusedIndex = -1;

    // -- Bound handlers for cleanup
    private readonly boundOnDocumentClick: (e: MouseEvent) => void;
    private readonly boundOnDocumentKeydown: (e: KeyboardEvent) => void;
    private readonly boundOnContextMenu: (e: MouseEvent) => void;

    constructor(options: TreeViewOptions)
    {
        instanceCounter += 1;
        this.instanceId = `treeview-${instanceCounter}`;

        this.options = { ...options };
        this.roots = [...options.roots];
        this.currentSortMode = options.sortMode || "alpha-asc";

        // Build type descriptor map
        this.typeMap = new Map<string, TreeNodeTypeDescriptor>();
        if (options.nodeTypes)
        {
            for (const [kind, desc] of Object.entries(options.nodeTypes))
            {
                this.typeMap.set(kind, desc);
            }
        }

        // Initialise expanded state from data
        this.initExpandedState(this.roots);

        // Build node index for O(1) lookups
        this.rebuildNodeIndex();

        // Bind document-level handlers
        this.boundOnDocumentClick = (e: MouseEvent) =>
            this.onDocumentClick(e);
        this.boundOnDocumentKeydown = (e: KeyboardEvent) =>
            this.onDocumentKeydown(e);
        this.boundOnContextMenu = (e: MouseEvent) =>
            this.onContextMenuEvent(e);

        console.log(LOG_PREFIX, "Initialising", this.instanceId);

        this.render();
    }

    /**
     * Recursively initialise expanded IDs from node data.
     */
    private initExpandedState(nodes: TreeNode[]): void
    {
        for (const node of nodes)
        {
            if (node.expanded)
            {
                this.expandedIds.add(node.id);
            }

            if (node.children)
            {
                this.initExpandedState(node.children);
            }
        }
    }

    // ========================================================================
    // S4b: NODE INDEX — O(1) lookups by ID
    // ========================================================================

    /**
     * Rebuilds nodeMap and parentMap via iterative DFS.
     * Called on construction and setRoots(). O(N) one-time pass.
     */
    private rebuildNodeIndex(): void
    {
        this.nodeMap.clear();
        this.parentMap.clear();

        const stack: Array<{ node: TreeNode; parentId: string }> = [];

        for (let i = this.roots.length - 1; i >= 0; i--)
        {
            stack.push({ node: this.roots[i], parentId: "" });
        }

        while (stack.length > 0)
        {
            const { node, parentId } = stack.pop()!;
            this.nodeMap.set(node.id, node);
            this.parentMap.set(node.id, parentId);

            if (node.children)
            {
                for (let i = node.children.length - 1; i >= 0; i--)
                {
                    stack.push({
                        node: node.children[i],
                        parentId: node.id
                    });
                }
            }
        }
    }

    /**
     * Incrementally inserts a node and its descendants into the index.
     * Used by addNode() to avoid a full rebuild.
     */
    private insertIntoIndex(
        node: TreeNode, parentId: string
    ): void
    {
        const stack: Array<{ n: TreeNode; pid: string }> = [
            { n: node, pid: parentId }
        ];

        while (stack.length > 0)
        {
            const { n, pid } = stack.pop()!;
            this.nodeMap.set(n.id, n);
            this.parentMap.set(n.id, pid);

            if (n.children)
            {
                for (let i = n.children.length - 1; i >= 0; i--)
                {
                    stack.push({ n: n.children[i], pid: n.id });
                }
            }
        }
    }

    /**
     * Removes a node and its descendants from the index.
     * Used by removeNode() to avoid a full rebuild.
     */
    private removeFromIndex(nodeId: string): void
    {
        const node = this.nodeMap.get(nodeId);

        if (!node)
        {
            return;
        }

        const stack: TreeNode[] = [node];

        while (stack.length > 0)
        {
            const n = stack.pop()!;
            this.nodeMap.delete(n.id);
            this.parentMap.delete(n.id);

            if (n.children)
            {
                for (const child of n.children)
                {
                    stack.push(child);
                }
            }
        }
    }

    /**
     * Checks whether candidateAncestorId is an ancestor of nodeId
     * by walking up via parentMap. O(depth).
     */
    private isAncestorOf(
        candidateAncestorId: string, nodeId: string
    ): boolean
    {
        let current = this.parentMap.get(nodeId);

        while (current !== undefined && current !== "")
        {
            if (current === candidateAncestorId)
            {
                return true;
            }

            current = this.parentMap.get(current);
        }

        return false;
    }

    // ========================================================================
    // S4c: CACHED FLAT VISIBLE ARRAY — O(1) navigation
    // ========================================================================

    /**
     * Returns the cached flat visible-nodes array, rebuilding if stale.
     * Lazy: only recomputes when visibleDirty is true.
     */
    private getVisibleNodes(): VisibleEntry[]
    {
        if (!this.visibleDirty)
        {
            return this.visibleNodes;
        }

        this.visibleNodes = [];
        this.visibleIndexMap.clear();

        const stack: Array<{ node: TreeNode; level: number }> = [];

        for (let i = this.roots.length - 1; i >= 0; i--)
        {
            stack.push({ node: this.roots[i], level: 1 });
        }

        while (stack.length > 0)
        {
            const { node, level } = stack.pop()!;

            if (!this.shouldShowNode(node))
            {
                continue;
            }

            const entry: VisibleEntry = {
                node,
                level,
                index: this.visibleNodes.length
            };
            this.visibleNodes.push(entry);
            this.visibleIndexMap.set(node.id, entry.index);

            if (this.expandedIds.has(node.id) && node.children)
            {
                const sorted = sortNodes(
                    node.children,
                    this.currentSortMode,
                    this.typeMap,
                    this.options.sortComparator
                );

                for (let i = sorted.length - 1; i >= 0; i--)
                {
                    stack.push({ node: sorted[i], level: level + 1 });
                }
            }
        }

        this.visibleDirty = false;
        return this.visibleNodes;
    }

    /**
     * Marks the visible-nodes cache as stale.
     * The next call to getVisibleNodes() will rebuild it.
     */
    private invalidateVisibleCache(): void
    {
        this.visibleDirty = true;
    }

    // ========================================================================
    // S5: LIFECYCLE — render(), destroy(), refresh()
    // ========================================================================

    /**
     * Renders the complete tree into the container element.
     */
    private render(): void
    {
        this.containerEl = document.getElementById(
            this.options.containerId
        );

        if (!this.containerEl)
        {
            console.error(
                LOG_PREFIX,
                "Container not found:",
                this.options.containerId
            );
            return;
        }

        // Build root element
        this.rootEl = this.buildRoot();
        this.containerEl.innerHTML = "";
        this.containerEl.appendChild(this.rootEl);

        // Attach document-level listeners
        document.addEventListener("click", this.boundOnDocumentClick, true);
        document.addEventListener(
            "keydown", this.boundOnDocumentKeydown, true
        );

        if (this.options.enableContextMenu)
        {
            this.rootEl.addEventListener(
                "contextmenu", this.boundOnContextMenu
            );
        }

        console.log(LOG_PREFIX, "Rendered", this.instanceId);
    }

    /**
     * Destroys the component: removes DOM, event listeners, and state.
     */
    public destroy(): void
    {
        if (this.destroyed)
        {
            return;
        }

        this.destroyed = true;
        this.dismissContextMenu();

        document.removeEventListener(
            "click", this.boundOnDocumentClick, true
        );
        document.removeEventListener(
            "keydown", this.boundOnDocumentKeydown, true
        );

        if (this.searchDebounceTimer)
        {
            clearTimeout(this.searchDebounceTimer);
        }

        // Cancel any in-flight async/chunked search
        this.searchGeneration++;

        this.cleanupVirtualState();
        this.nodeRowMap.clear();
        this.nodeItemMap.clear();
        this.nodeMap.clear();
        this.parentMap.clear();
        this.visibleNodes = [];
        this.visibleIndexMap.clear();
        this.expandedIds.clear();
        this.selectedIds.clear();
        this.loadingIds.clear();

        if (this.rootEl && this.containerEl)
        {
            this.containerEl.removeChild(this.rootEl);
        }

        this.rootEl = null;
        this.containerEl = null;

        console.log(LOG_PREFIX, "Destroyed", this.instanceId);
    }

    /**
     * Re-renders the entire tree from current data.
     */
    public refresh(): void
    {
        if (this.destroyed || !this.containerEl)
        {
            return;
        }

        // Preserve scroll position
        const scrollTop = this.listContainerEl?.scrollTop || 0;

        this.invalidateVisibleCache();
        this.nodeRowMap.clear();
        this.nodeItemMap.clear();

        // Remove old root
        if (this.rootEl && this.containerEl)
        {
            this.containerEl.removeChild(this.rootEl);
        }

        this.rootEl = this.buildRoot();
        this.containerEl.appendChild(this.rootEl);

        // Re-attach context menu listener
        if (this.options.enableContextMenu && this.rootEl)
        {
            this.rootEl.addEventListener(
                "contextmenu", this.boundOnContextMenu
            );
        }

        // Restore scroll
        if (this.listContainerEl)
        {
            this.listContainerEl.scrollTop = scrollTop;
        }

        // Restore focus
        if (this.focusedNodeId)
        {
            const row = this.nodeRowMap.get(this.focusedNodeId);
            if (row)
            {
                row.focus();
            }
        }

        if (this.options.onRefreshComplete)
        {
            this.options.onRefreshComplete();
        }

        console.log(LOG_PREFIX, "Refreshed", this.instanceId);
    }

    // ========================================================================
    // S6: DOM BUILDING — buildRoot, buildToolbar, buildSearch, buildTree
    // ========================================================================

    /**
     * Builds the root container element with toolbar, tree list, and context menu.
     */
    private buildRoot(): HTMLElement
    {
        const root = createElement("div", ["treeview"]);
        setAttr(root, "data-treeview-id", this.instanceId);

        if (this.options.cssClass)
        {
            root.classList.add(this.options.cssClass);
        }

        if (this.options.height)
        {
            root.style.height = this.options.height;
        }

        if (this.options.width)
        {
            root.style.width = this.options.width;
        }

        // Toolbar
        const hasToolbar = (this.options.toolbarActions &&
            this.options.toolbarActions.length > 0) ||
            this.options.showSearch;

        if (hasToolbar)
        {
            this.toolbarEl = this.buildToolbar();
            root.appendChild(this.toolbarEl);
        }

        // List container
        this.listContainerEl = createElement("div", [
            "treeview-list-container"
        ]);
        root.appendChild(this.listContainerEl);

        // Build tree content
        this.renderTree();

        // Context menu (hidden)
        if (this.options.enableContextMenu)
        {
            this.contextMenuEl = this.buildContextMenuContainer();
            root.appendChild(this.contextMenuEl);
        }

        return root;
    }

    /**
     * Builds the toolbar with action buttons and optional search input.
     */
    private buildToolbar(): HTMLElement
    {
        const toolbar = createElement("div", ["treeview-toolbar"]);
        setAttr(toolbar, "role", "toolbar");
        setAttr(toolbar, "aria-label", "Tree actions");

        // Action buttons
        if (this.options.toolbarActions)
        {
            for (const action of this.options.toolbarActions)
            {
                const btn = this.buildToolbarButton(action);
                toolbar.appendChild(btn);
            }
        }

        // Search
        if (this.options.showSearch)
        {
            const searchContainer = this.buildSearchBox();
            toolbar.appendChild(searchContainer);
        }

        return toolbar;
    }

    /**
     * Builds a single toolbar action button.
     */
    private buildToolbarButton(action: TreeToolbarAction): HTMLElement
    {
        const btn = createElement("button", [
            "treeview-toolbar-btn", "btn", "btn-sm", "btn-outline-secondary"
        ]);
        setAttr(btn, "type", "button");
        setAttr(btn, "title", action.tooltip);
        setAttr(btn, "data-action-id", action.id);

        if (action.disabled)
        {
            setAttr(btn, "disabled", "true");
        }

        if (action.icon)
        {
            const icon = createElement("i", [action.icon]);
            btn.appendChild(icon);
        }

        if (action.label)
        {
            if (action.icon)
            {
                btn.appendChild(document.createTextNode(" "));
            }
            btn.appendChild(document.createTextNode(action.label));
        }

        btn.addEventListener("click", (e) =>
        {
            e.preventDefault();
            e.stopPropagation();

            if (!action.disabled)
            {
                action.onClick();
            }
        });

        return btn;
    }

    /**
     * Builds the search input box.
     */
    private buildSearchBox(): HTMLElement
    {
        const container = createElement("div", ["treeview-search"]);

        const icon = createElement("i", [
            "bi", "bi-search", "treeview-search-icon"
        ]);
        container.appendChild(icon);

        this.searchInputEl = document.createElement("input");
        this.searchInputEl.type = "text";
        this.searchInputEl.className = "treeview-search-input form-control form-control-sm";
        this.searchInputEl.placeholder = "Search...";
        setAttr(this.searchInputEl, "role", "searchbox");
        setAttr(this.searchInputEl, "aria-label", "Search tree");

        this.searchInputEl.addEventListener("input", () =>
        {
            this.onSearchInput();
        });

        this.searchInputEl.addEventListener("keydown", (e) =>
        {
            if (e.key === "Escape")
            {
                this.clearSearch();
                this.searchInputEl?.blur();
                e.preventDefault();
                e.stopPropagation();
            }
        });

        container.appendChild(this.searchInputEl);

        return container;
    }

    /**
     * Builds the tree list and starred group inside the list container.
     */
    private buildTreeContent(): void
    {
        if (!this.listContainerEl)
        {
            return;
        }

        this.listContainerEl.innerHTML = "";

        // Starred group
        if (this.options.showStarred)
        {
            this.starredGroupEl = this.buildStarredGroup();
            this.listContainerEl.appendChild(this.starredGroupEl);
        }

        // Sort roots
        const sortedRoots = sortNodes(
            this.roots,
            this.currentSortMode,
            this.typeMap,
            this.options.sortComparator
        );

        // Main tree list
        this.treeListEl = createElement("ul", ["treeview-list"]);
        setAttr(this.treeListEl, "role", "tree");

        if (this.options.selectionMode === "multi")
        {
            setAttr(this.treeListEl, "aria-multiselectable", "true");
        }

        // Render nodes
        let hasNodes = false;
        for (const node of sortedRoots)
        {
            if (this.shouldShowNode(node))
            {
                const li = this.buildNodeItem(node, 1);
                this.treeListEl.appendChild(li);
                hasNodes = true;
            }
        }

        this.listContainerEl.appendChild(this.treeListEl);

        // Empty state
        if (!hasNodes)
        {
            this.emptyEl = createElement("div", ["treeview-empty"]);
            this.emptyEl.textContent = this.options.emptyMessage ||
                "No items to display";
            this.listContainerEl.appendChild(this.emptyEl);
        }
    }

    // ========================================================================
    // S6b: VIRTUAL SCROLLING
    // ========================================================================

    /**
     * Determines whether virtual scrolling should be active.
     */
    private determineVirtualMode(): boolean
    {
        const setting = this.options.virtualScrolling || "auto";

        if (setting === "disabled")
        {
            return false;
        }

        if (setting === "enabled")
        {
            return true;
        }

        // "auto": enable when visible nodes exceed threshold
        return this.getVisibleNodes().length > VIRTUAL_THRESHOLD;
    }

    /**
     * Routes rendering to virtual or non-virtual path.
     */
    private renderTree(): void
    {
        this.isVirtual = this.determineVirtualMode();

        if (this.isVirtual)
        {
            this.buildTreeContentVirtual();
        }
        else
        {
            this.buildTreeContent();
        }
    }

    /**
     * Builds the virtual scrolling tree DOM with flat div rows.
     */
    private buildTreeContentVirtual(): void
    {
        if (!this.listContainerEl)
        {
            return;
        }

        // Clean up previous virtual state
        this.cleanupVirtualState();
        this.nodeRowMap.clear();
        this.nodeItemMap.clear();
        this.listContainerEl.innerHTML = "";

        const visible = this.getVisibleNodes();
        const rowHeight = this.options.rowHeight || DEFAULT_ROW_HEIGHT;

        // Build starred group (non-virtual, above viewport)
        if (this.options.showStarred)
        {
            this.buildStarredGroup();
            if (this.starredGroupEl)
            {
                this.listContainerEl.appendChild(this.starredGroupEl);
            }
        }

        // Viewport container with total height
        const viewport = createElement("div", [
            "treeview-virtual-viewport"
        ]);
        setAttr(viewport, "role", "tree");

        if (this.options.selectionMode === "multi")
        {
            setAttr(viewport, "aria-multiselectable", "true");
        }

        viewport.style.height = `${visible.length * rowHeight}px`;
        viewport.style.position = "relative";

        // Spacers
        const topSpacer = createElement("div", [
            "treeview-virtual-spacer"
        ]);
        const bottomSpacer = createElement("div", [
            "treeview-virtual-spacer"
        ]);

        viewport.appendChild(topSpacer);
        viewport.appendChild(bottomSpacer);
        this.listContainerEl.appendChild(viewport);

        // Initialise virtual state
        this.virtualState = {
            startIndex: 0,
            endIndex: 0,
            topSpacer,
            bottomSpacer,
            viewportEl: viewport,
            rowPool: [],
            scrollPending: false,
            rafHandle: 0,
            pinnedIds: new Set()
        };

        // Attach scroll handler
        this.listContainerEl.addEventListener(
            "scroll", () => this.onVirtualScroll()
        );

        // Attach delegated event listeners
        this.attachVirtualEventDelegation(viewport);

        // Initial render
        this.renderVisibleWindow();

        // Show empty state if needed
        if (visible.length === 0)
        {
            this.emptyEl = createElement("div", ["treeview-empty"]);
            this.emptyEl.textContent = this.options.emptyMessage ||
                "No items to display";
            this.listContainerEl.appendChild(this.emptyEl);
        }
    }

    /**
     * Calculates the viewport window and renders visible rows.
     */
    private renderVisibleWindow(): void
    {
        if (!this.virtualState || !this.listContainerEl)
        {
            return;
        }

        const visible = this.getVisibleNodes();
        const rowHeight = this.options.rowHeight || DEFAULT_ROW_HEIGHT;
        const buffer = this.options.scrollBuffer || DEFAULT_SCROLL_BUFFER;

        // Update total height in case visible count changed
        this.virtualState.viewportEl.style.height =
            `${visible.length * rowHeight}px`;

        const scrollTop = this.listContainerEl.scrollTop;
        const viewH = this.listContainerEl.clientHeight;

        const firstIdx = Math.floor(scrollTop / rowHeight);
        const lastIdx = Math.ceil((scrollTop + viewH) / rowHeight);

        const start = Math.max(0, firstIdx - buffer);
        const end = Math.min(visible.length, lastIdx + buffer);

        this.applyRowDiff(start, end);
    }

    /**
     * Applies a diff between the old rendered range and the new range.
     * Recycles DOM elements from the pool.
     */
    private applyRowDiff(newStart: number, newEnd: number): void
    {
        if (!this.virtualState)
        {
            return;
        }

        const vs = this.virtualState;
        const visible = this.getVisibleNodes();
        const rowHeight = this.options.rowHeight || DEFAULT_ROW_HEIGHT;

        // Collect rows leaving the window → return to pool
        this.recycleOutOfRangeRows(newStart, newEnd);

        // Update spacers
        vs.topSpacer.style.height = `${newStart * rowHeight}px`;
        vs.bottomSpacer.style.height =
            `${Math.max(0, visible.length - newEnd) * rowHeight}px`;

        // Add rows entering the window
        this.renderNewRows(newStart, newEnd);

        vs.startIndex = newStart;
        vs.endIndex = newEnd;
    }

    /**
     * Returns out-of-range row elements to the pool.
     */
    private recycleOutOfRangeRows(
        newStart: number, newEnd: number
    ): void
    {
        if (!this.virtualState)
        {
            return;
        }

        const vs = this.virtualState;
        const viewport = vs.viewportEl;

        // Walk all rows currently in the DOM
        const rows = viewport.querySelectorAll(
            ".treeview-virtual-row"
        );

        for (const row of rows)
        {
            const nodeId = row.getAttribute("data-node-id");
            if (!nodeId)
            {
                continue;
            }

            // Check if pinned
            if (vs.pinnedIds.has(nodeId))
            {
                continue;
            }

            const idx = this.visibleIndexMap.get(nodeId);

            if (idx === undefined || idx < newStart || idx >= newEnd)
            {
                viewport.removeChild(row);
                vs.rowPool.push(row as HTMLElement);
                this.nodeRowMap.delete(nodeId);
            }
        }
    }

    /**
     * Renders rows that are in the new range but not yet in the DOM.
     */
    private renderNewRows(newStart: number, newEnd: number): void
    {
        if (!this.virtualState)
        {
            return;
        }

        const vs = this.virtualState;
        const visible = this.getVisibleNodes();
        const rowHeight = this.options.rowHeight || DEFAULT_ROW_HEIGHT;

        for (let i = newStart; i < newEnd; i++)
        {
            const entry = visible[i];

            if (!entry)
            {
                continue;
            }

            // Skip if already rendered
            if (this.nodeRowMap.has(entry.node.id))
            {
                continue;
            }

            // Get or create a row element
            const row = vs.rowPool.length > 0
                ? vs.rowPool.pop()!
                : this.buildVirtualRowTemplate();

            this.populateVirtualRow(row, entry);

            // Position the row
            row.style.position = "absolute";
            row.style.top = `${i * rowHeight}px`;
            row.style.width = "100%";
            row.style.height = `${rowHeight}px`;

            // Insert before bottom spacer
            vs.viewportEl.insertBefore(row, vs.bottomSpacer);
            this.nodeRowMap.set(entry.node.id, row);
        }
    }

    /**
     * Creates a reusable virtual row template with the standard child structure.
     */
    private buildVirtualRowTemplate(): HTMLElement
    {
        const row = createElement("div", ["treeview-virtual-row"]);
        setAttr(row, "tabindex", "-1");

        // Fixed child structure: indent, toggle, icon, label, badges, star
        row.appendChild(createElement("span", ["treeview-node-indent"]));
        row.appendChild(createElement("span", [
            "treeview-node-toggle-spacer"
        ]));
        row.appendChild(createElement("span", ["treeview-node-icon"]));
        row.appendChild(createElement("span", ["treeview-node-label"]));
        row.appendChild(createElement("span", ["treeview-node-badges"]));
        row.appendChild(createElement("span", ["treeview-node-star"]));

        return row;
    }

    /**
     * Populates an existing virtual row element with node data.
     */
    private populateVirtualRow(
        row: HTMLElement, entry: VisibleEntry
    ): void
    {
        const { node, level } = entry;
        const indentPx = this.options.indentPx || DEFAULT_INDENT;
        const typeDesc = this.typeMap.get(node.kind);
        const isParent = this.isNodeParent(node);
        const isExpanded = this.expandedIds.has(node.id);
        const isSelected = this.selectedIds.has(node.id);
        const isLoading = this.loadingIds.has(node.id);

        // ARIA attributes
        setAttr(row, "role", "treeitem");
        setAttr(row, "aria-level", String(level));
        setAttr(row, "data-node-id", node.id);
        setAttr(row, "tabindex",
            this.focusedNodeId === node.id ? "0" : "-1");

        if (isParent)
        {
            setAttr(row, "aria-expanded", String(isExpanded));
        }
        else
        {
            row.removeAttribute("aria-expanded");
        }

        setAttr(row, "aria-selected", String(isSelected));

        // State classes
        row.className = "treeview-virtual-row";

        if (isSelected)
        {
            row.classList.add("treeview-node-selected");
        }

        if (this.focusedNodeId === node.id)
        {
            row.classList.add("treeview-node-focused");
        }

        if (isLoading)
        {
            row.classList.add("treeview-node-loading");
        }

        if (node.disabled)
        {
            row.classList.add("treeview-node-disabled");
        }

        if (typeDesc?.cssClass)
        {
            row.classList.add(typeDesc.cssClass);
        }

        this.populateVirtualRowChildren(row, node, level, entry);
    }

    /**
     * Updates the child elements of a virtual row (indent, toggle,
     * icon, label, badges, star).
     */
    private populateVirtualRowChildren(
        row: HTMLElement, node: TreeNode,
        level: number, entry: VisibleEntry
    ): void
    {
        const indentPx = this.options.indentPx || DEFAULT_INDENT;
        const typeDesc = this.typeMap.get(node.kind);
        const isParent = this.isNodeParent(node);
        const isExpanded = this.expandedIds.has(node.id);
        const isLoading = this.loadingIds.has(node.id);
        const children = row.children;

        // [0] Indent
        const indent = children[0] as HTMLElement;
        indent.style.width = `${(level - 1) * indentPx}px`;

        // [1] Toggle
        this.updateVirtualToggle(
            children[1] as HTMLElement, isParent, isExpanded, isLoading
        );

        // [2] Icon
        this.updateVirtualIcon(
            children[2] as HTMLElement, node, typeDesc
        );

        // [3] Label
        this.updateVirtualLabel(children[3] as HTMLElement, node);

        // [4] Badges
        this.updateVirtualBadges(children[4] as HTMLElement, node);

        // [5] Star
        this.updateVirtualStar(children[5] as HTMLElement, node);
    }

    /**
     * Updates the toggle element in a virtual row.
     */
    private updateVirtualToggle(
        el: HTMLElement, isParent: boolean,
        isExpanded: boolean, isLoading: boolean
    ): void
    {
        el.innerHTML = "";

        if (!isParent)
        {
            el.className = "treeview-node-toggle-spacer";
            return;
        }

        el.className = "treeview-node-toggle";

        if (isLoading)
        {
            const spinner = this.buildLoadingSpinner();
            el.appendChild(spinner);
        }
        else
        {
            el.appendChild(createElement("i", [
                "bi",
                isExpanded ? "bi-chevron-down" : "bi-chevron-right"
            ]));
        }

        if (isExpanded)
        {
            el.classList.add("treeview-node-toggle-expanded");
        }
    }

    /**
     * Updates the icon element in a virtual row.
     */
    private updateVirtualIcon(
        el: HTMLElement, node: TreeNode,
        typeDesc: TreeNodeTypeDescriptor | undefined
    ): void
    {
        el.innerHTML = "";
        const iconClass = node.icon || typeDesc?.icon;

        if (iconClass)
        {
            el.appendChild(createElement("i", [iconClass]));
            el.style.display = "";
        }
        else
        {
            el.style.display = "none";
        }
    }

    /**
     * Updates the label element in a virtual row.
     */
    private updateVirtualLabel(
        el: HTMLElement, node: TreeNode
    ): void
    {
        el.innerHTML = "";

        if (this.searchText && this.searchMatchIds.has(node.id))
        {
            el.appendChild(
                highlightMatch(node.label, this.searchText)
            );
        }
        else
        {
            el.textContent = node.label;
        }
    }

    /**
     * Updates the badges container in a virtual row.
     */
    private updateVirtualBadges(
        el: HTMLElement, node: TreeNode
    ): void
    {
        el.innerHTML = "";

        if (!node.badges || node.badges.length === 0)
        {
            el.style.display = "none";
            return;
        }

        el.style.display = "";

        for (const badge of node.badges)
        {
            const badgeEl = createElement("span", [
                "treeview-badge", "badge",
                `bg-${badge.variant || "secondary"}`
            ], badge.text);

            if (badge.tooltip)
            {
                setAttr(badgeEl, "title", badge.tooltip);
            }

            el.appendChild(badgeEl);
        }
    }

    /**
     * Updates the star toggle element in a virtual row.
     */
    private updateVirtualStar(
        el: HTMLElement, node: TreeNode
    ): void
    {
        el.innerHTML = "";

        if (!this.options.showStarred)
        {
            el.style.display = "none";
            return;
        }

        el.style.display = "";
        el.className = "treeview-node-star";

        el.appendChild(createElement("i", [
            "bi", node.starred ? "bi-star-fill" : "bi-star"
        ]));

        if (node.starred)
        {
            el.classList.add("treeview-node-starred");
        }

        setAttr(el, "title", node.starred ? "Unstar" : "Star");
        setAttr(el, "role", "button");
        setAttr(el, "tabindex", "-1");
    }

    /**
     * rAF-throttled scroll handler for virtual scrolling.
     */
    private onVirtualScroll(): void
    {
        if (!this.virtualState || this.virtualState.scrollPending)
        {
            return;
        }

        this.virtualState.scrollPending = true;
        this.virtualState.rafHandle = requestAnimationFrame(() =>
        {
            if (this.virtualState)
            {
                this.virtualState.scrollPending = false;
            }

            this.renderVisibleWindow();
        });
    }

    /**
     * Attaches delegated event listeners on the virtual viewport.
     */
    private attachVirtualEventDelegation(
        viewport: HTMLElement
    ): void
    {
        viewport.addEventListener("click", (e) =>
        {
            this.onVirtualRowClick(e);
        });

        viewport.addEventListener("dblclick", (e) =>
        {
            this.onVirtualRowDblClick(e);
        });
    }

    /**
     * Handles delegated click on a virtual row.
     */
    private onVirtualRowClick(e: MouseEvent): void
    {
        const row = (e.target as HTMLElement).closest(
            ".treeview-virtual-row"
        ) as HTMLElement;

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
        if (!node || node.disabled)
        {
            return;
        }

        // Check if toggle was clicked
        const target = e.target as HTMLElement;
        if (target.closest(".treeview-node-toggle"))
        {
            e.preventDefault();
            e.stopPropagation();
            this.toggleNode(nodeId);
            return;
        }

        // Check if star was clicked
        if (target.closest(".treeview-node-star"))
        {
            e.preventDefault();
            e.stopPropagation();
            this.toggleStar(node);
            return;
        }

        // Regular click — handle selection
        this.setFocus(nodeId);
        this.onNodeClick(node, e);
    }

    /**
     * Handles delegated double-click on a virtual row.
     */
    private onVirtualRowDblClick(e: MouseEvent): void
    {
        const row = (e.target as HTMLElement).closest(
            ".treeview-virtual-row"
        ) as HTMLElement;

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

        if (this.options.onActivate)
        {
            this.options.onActivate(node);
        }
    }

    /**
     * Scrolls to a node in virtual mode.
     */
    private scrollToNodeVirtual(nodeId: string): void
    {
        if (!this.listContainerEl)
        {
            return;
        }

        // Expand ancestors
        this.expandAncestors(nodeId);
        this.invalidateVisibleCache();

        const visible = this.getVisibleNodes();
        const idx = this.visibleIndexMap.get(nodeId);

        if (idx === undefined)
        {
            return;
        }

        const rowHeight = this.options.rowHeight || DEFAULT_ROW_HEIGHT;
        const viewH = this.listContainerEl.clientHeight;

        this.listContainerEl.scrollTop =
            (idx * rowHeight) - (viewH / 2) + (rowHeight / 2);

        this.renderVisibleWindow();
        this.setFocus(nodeId);
    }

    /**
     * Expands all ancestors of a node.
     */
    private expandAncestors(nodeId: string): void
    {
        let current = this.parentMap.get(nodeId);

        while (current !== undefined && current !== "")
        {
            this.expandedIds.add(current);
            current = this.parentMap.get(current);
        }
    }

    /**
     * Cleans up virtual scrolling state.
     */
    private cleanupVirtualState(): void
    {
        if (this.virtualState)
        {
            cancelAnimationFrame(this.virtualState.rafHandle);
            this.virtualState.rowPool = [];
            this.virtualState = null;
        }

        this.isVirtual = false;
    }

    // ========================================================================
    // S7: NODE RENDERING
    // ========================================================================

    /**
     * Builds a single tree node <li> with its row and children.
     */
    private buildNodeItem(node: TreeNode, level: number): HTMLElement
    {
        const li = createElement("li", ["treeview-node"]);
        setAttr(li, "role", "treeitem");
        setAttr(li, "aria-level", String(level));
        setAttr(li, "data-node-id", node.id);

        if (node.disabled)
        {
            setAttr(li, "aria-disabled", "true");
            li.classList.add("treeview-node-disabled");
        }

        const isParent = this.isNodeParent(node);
        const isExpanded = this.expandedIds.has(node.id);
        const isSelected = this.selectedIds.has(node.id);
        const isLoading = this.loadingIds.has(node.id);

        if (isParent)
        {
            setAttr(li, "aria-expanded", String(isExpanded));
        }

        if (isSelected)
        {
            setAttr(li, "aria-selected", "true");
        }

        // Custom renderer
        if (this.options.nodeRenderer)
        {
            const custom = this.options.nodeRenderer(node, level);
            if (custom)
            {
                li.appendChild(custom);
                this.nodeItemMap.set(node.id, li);
                return li;
            }
        }

        // Build node row
        const row = this.buildNodeRow(node, level, isParent, isExpanded,
            isSelected, isLoading);
        li.appendChild(row);

        // Children
        if (isParent && isExpanded && node.children && node.children.length > 0)
        {
            const childrenUl = this.buildChildrenList(
                node.children, level + 1
            );
            li.appendChild(childrenUl);
        }

        this.nodeItemMap.set(node.id, li);

        return li;
    }

    /**
     * Builds the clickable row content for a node.
     */
    private buildNodeRow(
        node: TreeNode, level: number, isParent: boolean,
        isExpanded: boolean, isSelected: boolean, isLoading: boolean
    ): HTMLElement
    {
        const row = createElement("div", ["treeview-node-row"]);
        setAttr(row, "tabindex", "-1");
        setAttr(row, "data-node-id", node.id);

        this.applyRowStateClasses(row, node, isSelected, isLoading);

        // Indent
        const indent = createElement("span", ["treeview-node-indent"]);
        indent.style.width =
            `${(level - 1) * (this.options.indentPx || DEFAULT_INDENT)}px`;
        row.appendChild(indent);

        // Structural children: toggle, icon, label, badges, star
        row.appendChild(
            this.buildNodeToggleEl(node, isParent, isExpanded, isLoading)
        );
        this.appendNodeIcon(row, node);
        row.appendChild(this.buildNodeLabelEl(node));

        if (node.badges && node.badges.length > 0)
        {
            row.appendChild(this.buildNodeBadgesEl(node.badges));
        }

        if (this.options.showStarred)
        {
            row.appendChild(this.buildNodeStarEl(node));
        }

        this.attachRowListeners(row, node);
        this.nodeRowMap.set(node.id, row);

        return row;
    }

    /**
     * Applies tooltip, type-specific class, and state classes to a node row.
     */
    private applyRowStateClasses(
        row: HTMLElement, node: TreeNode,
        isSelected: boolean, isLoading: boolean
    ): void
    {
        if (node.tooltip)
        {
            setAttr(row, "title", node.tooltip);
        }

        const typeDesc = this.typeMap.get(node.kind);
        if (typeDesc?.cssClass)
        {
            row.classList.add(typeDesc.cssClass);
        }

        if (isSelected)
        {
            row.classList.add("treeview-node-selected");
        }

        if (this.focusedNodeId === node.id)
        {
            setAttr(row, "tabindex", "0");
            row.classList.add("treeview-node-focused");
        }

        if (isLoading)
        {
            row.classList.add("treeview-node-loading");
        }
    }

    /**
     * Builds the toggle button (chevron / spinner) or spacer for leaf nodes.
     */
    private buildNodeToggleEl(
        node: TreeNode, isParent: boolean,
        isExpanded: boolean, isLoading: boolean
    ): HTMLElement
    {
        if (!isParent)
        {
            return createElement("span", ["treeview-node-toggle-spacer"]);
        }

        const toggle = createElement("button", ["treeview-node-toggle"]);
        setAttr(toggle, "type", "button");
        setAttr(toggle, "tabindex", "-1");
        setAttr(toggle, "aria-hidden", "true");

        const child = isLoading
            ? this.buildLoadingSpinner()
            : createElement("i", [
                "bi", isExpanded ? "bi-chevron-down" : "bi-chevron-right"
            ]);
        toggle.appendChild(child);

        if (isExpanded)
        {
            toggle.classList.add("treeview-node-toggle-expanded");
        }

        toggle.addEventListener("click", (e) =>
        {
            e.preventDefault();
            e.stopPropagation();
            this.toggleNode(node.id);
        });

        return toggle;
    }

    /**
     * Creates a Bootstrap spinner-border-sm element for loading state.
     */
    private buildLoadingSpinner(): HTMLElement
    {
        const spinner = createElement("span", [
            "spinner-border", "spinner-border-sm",
            "treeview-node-spinner"
        ]);
        setAttr(spinner, "role", "status");
        spinner.appendChild(
            createElement("span", ["visually-hidden"], "Loading...")
        );

        return spinner;
    }

    /**
     * Appends the node icon element to the row if an icon class is available.
     */
    private appendNodeIcon(
        row: HTMLElement, node: TreeNode
    ): void
    {
        const typeDesc = this.typeMap.get(node.kind);
        const iconClass = node.icon || typeDesc?.icon;

        if (iconClass)
        {
            const icon = createElement("span", ["treeview-node-icon"]);
            icon.appendChild(createElement("i", [iconClass]));
            row.appendChild(icon);
        }
    }

    /**
     * Builds the label span, applying search highlight marks when active.
     */
    private buildNodeLabelEl(node: TreeNode): HTMLElement
    {
        const label = createElement("span", ["treeview-node-label"]);

        if (this.searchText && this.searchMatchIds.has(node.id))
        {
            label.appendChild(
                highlightMatch(node.label, this.searchText)
            );
        }
        else
        {
            label.textContent = node.label;
        }

        return label;
    }

    /**
     * Builds the badges container with Bootstrap badge elements.
     */
    private buildNodeBadgesEl(badges: TreeBadge[]): HTMLElement
    {
        const container = createElement("span", ["treeview-node-badges"]);

        for (const badge of badges)
        {
            const el = createElement("span", [
                "treeview-badge", "badge",
                `bg-${badge.variant || "secondary"}`
            ], badge.text);

            if (badge.tooltip)
            {
                setAttr(el, "title", badge.tooltip);
            }

            container.appendChild(el);
        }

        return container;
    }

    /**
     * Builds the star toggle element for favourites.
     */
    private buildNodeStarEl(node: TreeNode): HTMLElement
    {
        const star = createElement("span", ["treeview-node-star"]);
        const starIcon = createElement("i", [
            "bi", node.starred ? "bi-star-fill" : "bi-star"
        ]);
        star.appendChild(starIcon);

        if (node.starred)
        {
            star.classList.add("treeview-node-starred");
        }

        setAttr(star, "title", node.starred ? "Unstar" : "Star");
        setAttr(star, "role", "button");
        setAttr(star, "tabindex", "-1");

        star.addEventListener("click", (e) =>
        {
            e.preventDefault();
            e.stopPropagation();
            this.toggleStar(node);
        });

        return star;
    }

    /**
     * Builds a <ul> children list for expanded parent nodes.
     */
    private buildChildrenList(
        children: TreeNode[], level: number
    ): HTMLElement
    {
        const sortedChildren = sortNodes(
            children,
            this.currentSortMode,
            this.typeMap,
            this.options.sortComparator
        );

        const ul = createElement("ul", ["treeview-children"]);
        setAttr(ul, "role", "group");

        for (const child of sortedChildren)
        {
            if (this.shouldShowNode(child))
            {
                const li = this.buildNodeItem(child, level);
                ul.appendChild(li);
            }
        }

        return ul;
    }

    /**
     * Attaches click, double-click event listeners to a node row.
     */
    private attachRowListeners(row: HTMLElement, node: TreeNode): void
    {
        row.addEventListener("click", (e) =>
        {
            if (node.disabled)
            {
                return;
            }

            e.preventDefault();
            this.onNodeClick(node, e);
        });

        row.addEventListener("dblclick", (e) =>
        {
            if (node.disabled)
            {
                return;
            }

            e.preventDefault();

            if (this.options.onActivate)
            {
                this.options.onActivate(node);
            }
        });

        // Drag and drop
        if (this.options.enableDragDrop)
        {
            this.attachDragListeners(row, node);
        }
    }

    /**
     * Determines whether a node is a parent (can have children).
     */
    private isNodeParent(node: TreeNode): boolean
    {
        const desc = this.typeMap.get(node.kind);
        if (desc?.isParent)
        {
            return true;
        }

        // Has children array (even if empty) or is lazy-loadable
        return node.children !== undefined || node.lazy === true;
    }

    /**
     * Determines whether a node should be shown given search state.
     */
    private shouldShowNode(node: TreeNode): boolean
    {
        if (!this.searchText)
        {
            return true;
        }

        return this.searchMatchIds.has(node.id) ||
               this.searchAncestorIds.has(node.id);
    }

    // ========================================================================
    // S8: SELECTION
    // ========================================================================

    /**
     * Handles click on a node row — manages selection state.
     */
    private onNodeClick(node: TreeNode, e: MouseEvent): void
    {
        const mode = this.options.selectionMode || "single";

        if (mode === "none")
        {
            this.setFocus(node.id);
            return;
        }

        if (mode === "multi" && e.shiftKey && this.lastSelectedId)
        {
            // Range select
            this.rangeSelect(this.lastSelectedId, node.id);
        }
        else if (mode === "multi" && (e.ctrlKey || e.metaKey))
        {
            // Toggle select
            this.toggleSelect(node.id);
        }
        else
        {
            // Single select
            this.singleSelect(node.id);
        }

        this.setFocus(node.id);
    }

    /**
     * Selects a single node, deselecting all others.
     */
    private singleSelect(nodeId: string): void
    {
        const wasSelected = this.selectedIds.has(nodeId);

        this.clearSelectionVisuals();
        this.selectedIds.clear();

        if (!wasSelected)
        {
            this.selectedIds.add(nodeId);
            this.applySelectionVisual(nodeId, true);
            this.lastSelectedId = nodeId;
        }
        else
        {
            this.lastSelectedId = null;
        }

        this.fireSelectionChange();
    }

    /**
     * Toggles selection on a single node (Ctrl+Click).
     */
    private toggleSelect(nodeId: string): void
    {
        if (this.selectedIds.has(nodeId))
        {
            this.selectedIds.delete(nodeId);
            this.applySelectionVisual(nodeId, false);
        }
        else
        {
            this.selectedIds.add(nodeId);
            this.applySelectionVisual(nodeId, true);
            this.lastSelectedId = nodeId;
        }

        this.fireSelectionChange();
    }

    /**
     * Range-selects from anchor to target in visible order (Shift+Click).
     */
    private rangeSelect(anchorId: string, targetId: string): void
    {
        const visible = this.getVisibleNodes();
        const anchorIdx = this.visibleIndexMap.get(anchorId) ?? -1;
        const targetIdx = this.visibleIndexMap.get(targetId) ?? -1;

        if (anchorIdx === -1 || targetIdx === -1)
        {
            return;
        }

        const start = Math.min(anchorIdx, targetIdx);
        const end = Math.max(anchorIdx, targetIdx);

        this.clearSelectionVisuals();
        this.selectedIds.clear();

        for (let i = start; i <= end; i++)
        {
            const n = visible[i].node;
            if (!n.disabled)
            {
                this.selectedIds.add(n.id);
                this.applySelectionVisual(n.id, true);
            }
        }

        this.fireSelectionChange();
    }

    /**
     * Applies or removes the selected visual on a node row.
     */
    private applySelectionVisual(
        nodeId: string, selected: boolean
    ): void
    {
        const row = this.nodeRowMap.get(nodeId);
        if (!row)
        {
            return;
        }

        const li = this.nodeItemMap.get(nodeId);

        if (selected)
        {
            row.classList.add("treeview-node-selected");
            if (li)
            {
                setAttr(li, "aria-selected", "true");
            }
        }
        else
        {
            row.classList.remove("treeview-node-selected");
            if (li)
            {
                removeAttr(li, "aria-selected");
            }
        }

        // Fire individual callback
        const node = this.nodeMap.get(nodeId);
        if (node && this.options.onSelect)
        {
            this.options.onSelect(node, selected);
        }
    }

    /**
     * Clears selection visuals from all nodes.
     */
    private clearSelectionVisuals(): void
    {
        for (const nodeId of this.selectedIds)
        {
            const row = this.nodeRowMap.get(nodeId);
            if (row)
            {
                row.classList.remove("treeview-node-selected");
            }

            const li = this.nodeItemMap.get(nodeId);
            if (li)
            {
                removeAttr(li, "aria-selected");
            }
        }
    }

    /**
     * Fires the onSelectionChange callback.
     */
    private fireSelectionChange(): void
    {
        if (!this.options.onSelectionChange)
        {
            return;
        }

        const nodes: TreeNode[] = [];
        for (const id of this.selectedIds)
        {
            const node = this.nodeMap.get(id);
            if (node)
            {
                nodes.push(node);
            }
        }

        this.options.onSelectionChange(nodes);
    }

    /**
     * Sets visual focus on a node row.
     */
    private setFocus(nodeId: string): void
    {
        // Remove previous focus
        if (this.focusedNodeId)
        {
            const prevRow = this.nodeRowMap.get(this.focusedNodeId);
            if (prevRow)
            {
                prevRow.classList.remove("treeview-node-focused");
                setAttr(prevRow, "tabindex", "-1");
            }
        }

        this.focusedNodeId = nodeId;
        const row = this.nodeRowMap.get(nodeId);
        if (row)
        {
            row.classList.add("treeview-node-focused");
            setAttr(row, "tabindex", "0");
            row.focus();
        }
    }

    // ========================================================================
    // S9: EXPAND / COLLAPSE + LAZY LOADING
    // ========================================================================

    /**
     * Toggles expansion state of a node.
     */
    private toggleNode(nodeId: string): void
    {
        const node = this.nodeMap.get(nodeId);
        if (!node || node.disabled)
        {
            return;
        }

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
     * Expands a node, loading children lazily if needed.
     */
    private expandNodeInternal(nodeId: string): void
    {
        const node = this.nodeMap.get(nodeId);
        if (!node)
        {
            return;
        }

        // Lazy load
        if (node.lazy && node.children === null && this.options.onLoadChildren)
        {
            if (this.loadingIds.has(nodeId))
            {
                return; // Already loading
            }

            this.loadingIds.add(nodeId);
            this.updateNodeVisual(nodeId);

            console.log(LOG_PREFIX, "Loading children for", node.label);

            this.options.onLoadChildren(node)
                .then((children) =>
                {
                    node.children = children;
                    node.lazy = false;
                    this.loadingIds.delete(nodeId);
                    this.expandedIds.add(nodeId);

                    // Index newly loaded children
                    for (const child of children)
                    {
                        this.insertIntoIndex(child, nodeId);
                    }

                    this.invalidateVisibleCache();
                    this.rebuildNodeSubtree(nodeId);

                    if (this.options.onToggle)
                    {
                        this.options.onToggle(node, true);
                    }
                })
                .catch((err) =>
                {
                    console.error(
                        LOG_PREFIX,
                        "Failed to load children for",
                        node.label,
                        err
                    );
                    this.loadingIds.delete(nodeId);
                    this.updateNodeVisual(nodeId);
                });

            return;
        }

        this.expandedIds.add(nodeId);
        this.invalidateVisibleCache();
        this.rebuildNodeSubtree(nodeId);

        if (this.options.onToggle)
        {
            this.options.onToggle(node, true);
        }
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

        // If currently loading, cancel by removing from loading set
        if (this.loadingIds.has(nodeId))
        {
            this.loadingIds.delete(nodeId);
        }

        this.expandedIds.delete(nodeId);
        this.invalidateVisibleCache();
        this.rebuildNodeSubtree(nodeId);

        if (this.options.onToggle)
        {
            this.options.onToggle(node, false);
        }
    }

    /**
     * Rebuilds the DOM subtree for a single node (after expand/collapse/load).
     */
    private rebuildNodeSubtree(nodeId: string): void
    {
        const li = this.nodeItemMap.get(nodeId);
        if (!li)
        {
            return;
        }

        const node = this.nodeMap.get(nodeId);
        if (!node)
        {
            return;
        }

        // Determine level from aria-level
        const level = parseInt(
            li.getAttribute("aria-level") || "1", 10
        );

        // Remove old row and children maps for this subtree
        this.removeSubtreeMaps(nodeId);

        // Clear li content
        li.innerHTML = "";

        // Rebuild
        const isParent = this.isNodeParent(node);
        const isExpanded = this.expandedIds.has(nodeId);
        const isSelected = this.selectedIds.has(nodeId);
        const isLoading = this.loadingIds.has(nodeId);

        if (isParent)
        {
            setAttr(li, "aria-expanded", String(isExpanded));
        }

        const row = this.buildNodeRow(
            node, level, isParent, isExpanded, isSelected, isLoading
        );
        li.appendChild(row);

        if (isParent && isExpanded && node.children &&
            node.children.length > 0)
        {
            const childrenUl = this.buildChildrenList(
                node.children, level + 1
            );
            li.appendChild(childrenUl);
        }
    }

    /**
     * Updates the visual state of a single node row (e.g. loading spinner).
     */
    private updateNodeVisual(nodeId: string): void
    {
        this.rebuildNodeSubtree(nodeId);
    }

    /**
     * Removes map entries for a node and all its descendants.
     */
    private removeSubtreeMaps(nodeId: string): void
    {
        const node = this.nodeMap.get(nodeId);
        if (!node)
        {
            return;
        }

        this.nodeRowMap.delete(nodeId);
        // Keep nodeItemMap — the li is being reused

        if (node.children)
        {
            for (const child of node.children)
            {
                this.removeSubtreeMapsRecursive(child.id);
            }
        }
    }

    /**
     * Recursively removes map entries for descendants.
     */
    private removeSubtreeMapsRecursive(nodeId: string): void
    {
        this.nodeRowMap.delete(nodeId);
        this.nodeItemMap.delete(nodeId);

        const node = this.nodeMap.get(nodeId);
        if (node?.children)
        {
            for (const child of node.children)
            {
                this.removeSubtreeMapsRecursive(child.id);
            }
        }
    }

    // ========================================================================
    // S10: KEYBOARD NAVIGATION (WAI-ARIA TREE PATTERN)
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
     * Handles keyboard navigation at the document level.
     * Guards focus scope and delegates to key dispatch.
     */
    private onDocumentKeydown(e: KeyboardEvent): void
    {
        if (!this.rootEl?.contains(document.activeElement) ||
            this.isRenaming)
        {
            return;
        }

        if (this.contextMenuEl &&
            this.contextMenuEl.style.display !== "none")
        {
            this.onContextMenuKeydown(e);
            return;
        }

        if (document.activeElement === this.searchInputEl)
        {
            return;
        }

        const nodeId = this.focusedNodeId;
        const node = nodeId ? this.nodeMap.get(nodeId) : null;

        if (!node)
        {
            return;
        }

        this.dispatchTreeKey(e, node);
    }

    /**
     * Dispatches a keyboard event to the appropriate tree action.
     * Checks overridable bindings first, then modifier/type-ahead.
     */
    private dispatchTreeKey(
        e: KeyboardEvent, node: TreeNode
    ): void
    {
        if (this.dispatchNavKey(e, node))
        {
            return;
        }

        this.handleModifierKey(e, node);
    }

    /**
     * Attempts to match e against navigation key bindings.
     * Returns true if a binding matched and was handled.
     */
    private dispatchNavKey(
        e: KeyboardEvent, node: TreeNode
    ): boolean
    {
        if (this.matchesKeyCombo(e, "moveDown"))
        {
            e.preventDefault();
            this.focusNextNode(node.id);
            return true;
        }
        if (this.matchesKeyCombo(e, "moveUp"))
        {
            e.preventDefault();
            this.focusPreviousNode(node.id);
            return true;
        }
        if (this.matchesKeyCombo(e, "expand"))
        {
            e.preventDefault();
            this.onArrowRight(node);
            return true;
        }
        if (this.matchesKeyCombo(e, "collapse"))
        {
            e.preventDefault();
            this.onArrowLeft(node);
            return true;
        }
        if (this.matchesKeyCombo(e, "home"))
        {
            e.preventDefault();
            this.focusFirstNode();
            return true;
        }
        if (this.matchesKeyCombo(e, "end"))
        {
            e.preventDefault();
            this.focusLastNode();
            return true;
        }
        if (this.matchesKeyCombo(e, "toggleSelect"))
        {
            e.preventDefault();
            this.onNodeClick(
                node, e as unknown as MouseEvent
            );
            return true;
        }
        if (this.matchesKeyCombo(e, "edit"))
        {
            e.preventDefault();
            this.options.onActivate?.(node);
            return true;
        }
        if (e.key === "*")
        {
            e.preventDefault();
            this.expandSiblings(node.id);
            return true;
        }
        return false;
    }

    /**
     * Handles modifier keys (F2 rename, Ctrl+A select-all)
     * and single-character type-ahead navigation.
     */
    private handleModifierKey(
        e: KeyboardEvent, node: TreeNode
    ): void
    {
        if (this.matchesKeyCombo(e, "rename")
            && this.options.enableInlineRename)
        {
            e.preventDefault();
            this.startRename(node.id);
            return;
        }

        if (e.key === "a" &&
            (e.ctrlKey || e.metaKey) &&
            this.options.selectionMode === "multi")
        {
            e.preventDefault();
            this.selectAll();
            return;
        }

        // Type-ahead: single character jumps to next match
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey &&
            !e.altKey)
        {
            this.typeAheadNavigate(e.key);
        }
    }

    /**
     * Focuses the next visible node in tree order.
     */
    private focusNextNode(currentId: string): void
    {
        const visible = this.getVisibleNodes();
        const idx = this.visibleIndexMap.get(currentId) ?? -1;

        if (idx >= 0 && idx < visible.length - 1)
        {
            const next = visible[idx + 1].node;
            this.setFocus(next.id);
        }
    }

    /**
     * Focuses the previous visible node in tree order.
     */
    private focusPreviousNode(currentId: string): void
    {
        const visible = this.getVisibleNodes();
        const idx = this.visibleIndexMap.get(currentId) ?? -1;

        if (idx > 0)
        {
            const prev = visible[idx - 1].node;
            this.setFocus(prev.id);
        }
    }

    /**
     * Arrow Right: if collapsed parent, expand; if expanded, move to first child;
     * if leaf, do nothing.
     */
    private onArrowRight(node: TreeNode): void
    {
        if (this.isNodeParent(node))
        {
            if (!this.expandedIds.has(node.id))
            {
                this.expandNodeInternal(node.id);
            }
            else if (node.children && node.children.length > 0)
            {
                // Move focus to first child
                const sorted = sortNodes(
                    node.children,
                    this.currentSortMode,
                    this.typeMap,
                    this.options.sortComparator
                );
                if (sorted.length > 0)
                {
                    this.setFocus(sorted[0].id);
                }
            }
        }
    }

    /**
     * Arrow Left: if expanded parent, collapse; otherwise move to parent.
     */
    private onArrowLeft(node: TreeNode): void
    {
        if (this.isNodeParent(node) && this.expandedIds.has(node.id))
        {
            this.collapseNodeInternal(node.id);
        }
        else
        {
            // Move to parent
            const parentId = this.parentMap.get(node.id);
            if (parentId)
            {
                this.setFocus(parentId);
            }
        }
    }

    /**
     * Focuses the first visible node.
     */
    private focusFirstNode(): void
    {
        const visible = this.getVisibleNodes();
        if (visible.length > 0)
        {
            this.setFocus(visible[0].node.id);
        }
    }

    /**
     * Focuses the last visible node.
     */
    private focusLastNode(): void
    {
        const visible = this.getVisibleNodes();
        if (visible.length > 0)
        {
            this.setFocus(visible[visible.length - 1].node.id);
        }
    }

    /**
     * Expands all siblings of the focused node (asterisk key).
     */
    private expandSiblings(nodeId: string): void
    {
        const parentId = this.parentMap.get(nodeId);
        const parentNode = parentId ? this.nodeMap.get(parentId) : undefined;
        const siblings = parentNode ? parentNode.children : this.roots;

        if (!siblings)
        {
            return;
        }

        for (const sib of siblings)
        {
            if (this.isNodeParent(sib) && !this.expandedIds.has(sib.id))
            {
                this.expandNodeInternal(sib.id);
            }
        }
    }

    /**
     * Selects all visible nodes (Ctrl+A).
     */
    private selectAll(): void
    {
        const visible = this.getVisibleNodes();

        this.clearSelectionVisuals();
        this.selectedIds.clear();

        for (const entry of visible)
        {
            if (!entry.node.disabled)
            {
                this.selectedIds.add(entry.node.id);
                this.applySelectionVisual(entry.node.id, true);
            }
        }

        this.fireSelectionChange();
    }

    /**
     * Type-ahead: jump to next node starting with the typed character.
     */
    private typeAheadNavigate(char: string): void
    {
        const visible = this.getVisibleNodes();
        const lowerChar = char.toLowerCase();
        const currentIdx = this.focusedNodeId
            ? (this.visibleIndexMap.get(this.focusedNodeId) ?? -1)
            : -1;

        // Search from current position forward, wrapping
        for (let i = 1; i <= visible.length; i++)
        {
            const idx = (currentIdx + i) % visible.length;
            const entry = visible[idx];

            if (entry.node.label.toLowerCase().startsWith(lowerChar))
            {
                this.setFocus(entry.node.id);
                return;
            }
        }
    }

    // ========================================================================
    // S11: INLINE RENAME
    // ========================================================================

    /**
     * Starts inline rename for a node — swaps the label span with an input.
     */
    private startRename(nodeId: string): void
    {
        const node = this.nodeMap.get(nodeId);
        if (!node)
        {
            return;
        }

        // Check if node type allows rename
        const desc = this.typeMap.get(node.kind);
        if (desc && desc.renamable === false)
        {
            return;
        }

        const row = this.nodeRowMap.get(nodeId);
        if (!row)
        {
            return;
        }

        const labelEl = row.querySelector(
            ".treeview-node-label"
        ) as HTMLElement;
        if (!labelEl)
        {
            return;
        }

        this.isRenaming = true;
        const originalLabel = node.label;

        // Create input
        const input = document.createElement("input");
        input.type = "text";
        input.value = originalLabel;
        input.className = "treeview-rename-input form-control form-control-sm";
        input.style.width = `${Math.max(labelEl.offsetWidth + 20, 80)}px`;

        // Replace label with input
        labelEl.textContent = "";
        labelEl.appendChild(input);
        labelEl.classList.add("treeview-node-renaming");

        input.focus();
        input.select();

        const commitRename = async (): Promise<void> =>
        {
            const newLabel = input.value.trim();

            if (!newLabel || newLabel === originalLabel)
            {
                cancelRename();
                return;
            }

            if (this.options.onRename)
            {
                const accepted = await this.options.onRename(node, newLabel);
                if (!accepted)
                {
                    cancelRename();
                    return;
                }
            }

            // Accept rename
            node.label = newLabel;
            this.isRenaming = false;
            labelEl.classList.remove("treeview-node-renaming");
            labelEl.textContent = newLabel;
            input.remove();

            console.log(
                LOG_PREFIX, "Renamed", originalLabel, "→", newLabel
            );
        };

        const cancelRename = (): void =>
        {
            this.isRenaming = false;
            labelEl.classList.remove("treeview-node-renaming");
            labelEl.textContent = originalLabel;
            input.remove();

            // Restore focus to row
            row.focus();
        };

        input.addEventListener("keydown", (e) =>
        {
            if (e.key === "Enter")
            {
                e.preventDefault();
                e.stopPropagation();
                commitRename();
            }
            else if (e.key === "Escape")
            {
                e.preventDefault();
                e.stopPropagation();
                cancelRename();
            }
        });

        input.addEventListener("blur", () =>
        {
            // Commit on blur (unless already committed/cancelled)
            if (this.isRenaming)
            {
                commitRename();
            }
        });
    }

    // ========================================================================
    // S12: CONTEXT MENU
    // ========================================================================

    /**
     * Builds the hidden context menu container.
     */
    private buildContextMenuContainer(): HTMLElement
    {
        const menu = createElement("div", ["treeview-context-menu"]);
        setAttr(menu, "role", "menu");
        setAttr(menu, "aria-label", "Context menu");
        menu.style.display = "none";
        menu.style.position = "absolute";
        menu.style.zIndex = String(Z_INDEX_CONTEXT_MENU);

        return menu;
    }

    /**
     * Handles right-click context menu event.
     */
    private onContextMenuEvent(e: MouseEvent): void
    {
        e.preventDefault();
        e.stopPropagation();

        const row = (e.target as HTMLElement).closest(
            ".treeview-node-row"
        ) as HTMLElement;

        if (!row)
        {
            this.dismissContextMenu();
            return;
        }

        const nodeId = row.getAttribute("data-node-id");
        if (!nodeId)
        {
            return;
        }

        const node = this.nodeMap.get(nodeId);
        if (!node || node.disabled)
        {
            return;
        }

        // Focus and select the node
        this.singleSelect(nodeId);
        this.setFocus(nodeId);

        this.showContextMenu(node, e.clientX, e.clientY);
    }

    /**
     * Shows the context menu at the specified position.
     * Builds items, positions, and focuses the first enabled item.
     */
    private showContextMenu(
        node: TreeNode, x: number, y: number
    ): void
    {
        if (!this.contextMenuEl)
        {
            return;
        }

        this.contextMenuNodeId = node.id;
        this.contextMenuFocusedIndex = -1;

        const items =
            this.typeMap.get(node.kind)?.contextMenuItems || [];

        if (items.length === 0)
        {
            return;
        }

        this.contextMenuEl.innerHTML = "";

        for (let i = 0; i < items.length; i++)
        {
            this.contextMenuEl.appendChild(
                this.buildContextMenuItemEl(items[i], i, node)
            );
        }

        this.positionContextMenu(x, y);
        this.focusFirstContextMenuItem();
    }

    /**
     * Builds a single context menu item (button or separator).
     */
    private buildContextMenuItemEl(
        item: TreeContextMenuItem, index: number,
        node: TreeNode
    ): HTMLElement
    {
        if (item.separator)
        {
            const sep = createElement("div", [
                "treeview-context-separator"
            ]);
            setAttr(sep, "role", "separator");
            return sep;
        }

        const btn = createElement("button", ["treeview-context-item"]);
        setAttr(btn, "role", "menuitem");
        setAttr(btn, "type", "button");
        setAttr(btn, "data-action-id", item.id);
        setAttr(btn, "data-menu-index", String(index));

        this.applyContextMenuItemContent(btn, item);
        this.attachContextMenuItemClick(btn, item, node);

        return btn;
    }

    /**
     * Applies disabled state, icon, label text, and shortcut hint
     * to a context menu button.
     */
    private applyContextMenuItemContent(
        btn: HTMLElement, item: TreeContextMenuItem
    ): void
    {
        if (item.disabled)
        {
            setAttr(btn, "disabled", "true");
            setAttr(btn, "aria-disabled", "true");
        }

        if (item.icon)
        {
            btn.appendChild(createElement("i", [item.icon]));
            btn.appendChild(document.createTextNode(" "));
        }

        btn.appendChild(document.createTextNode(item.label));

        if (item.shortcutHint)
        {
            btn.appendChild(createElement("span", [
                "treeview-context-shortcut"
            ], item.shortcutHint));
        }
    }

    /**
     * Attaches the click handler that fires the context menu action
     * callback and dismisses the menu.
     */
    private attachContextMenuItemClick(
        btn: HTMLElement, item: TreeContextMenuItem,
        node: TreeNode
    ): void
    {
        btn.addEventListener("click", (e) =>
        {
            e.preventDefault();
            e.stopPropagation();

            if (!item.disabled && this.options.onContextMenuAction)
            {
                this.options.onContextMenuAction(item.id, node);
            }

            this.dismissContextMenu();
        });
    }

    /**
     * Positions the context menu at (x, y) and adjusts for viewport overflow.
     */
    private positionContextMenu(x: number, y: number): void
    {
        if (!this.contextMenuEl)
        {
            return;
        }

        this.contextMenuEl.style.display = "block";
        this.contextMenuEl.style.left = `${x}px`;
        this.contextMenuEl.style.top = `${y}px`;

        requestAnimationFrame(() =>
        {
            if (!this.contextMenuEl)
            {
                return;
            }

            const rect = this.contextMenuEl.getBoundingClientRect();

            if (rect.right > window.innerWidth)
            {
                this.contextMenuEl.style.left =
                    `${x - rect.width}px`;
            }

            if (rect.bottom > window.innerHeight)
            {
                this.contextMenuEl.style.top =
                    `${y - rect.height}px`;
            }
        });
    }

    /**
     * Focuses the first non-disabled item in the context menu.
     */
    private focusFirstContextMenuItem(): void
    {
        if (!this.contextMenuEl)
        {
            return;
        }

        const firstBtn = this.contextMenuEl.querySelector(
            ".treeview-context-item:not([disabled])"
        ) as HTMLElement;

        if (firstBtn)
        {
            firstBtn.focus();
            this.contextMenuFocusedIndex = 0;
        }
    }

    /**
     * Handles keyboard navigation within the context menu.
     */
    private onContextMenuKeydown(e: KeyboardEvent): void
    {
        if (!this.contextMenuEl)
        {
            return;
        }

        const items = Array.from(
            this.contextMenuEl.querySelectorAll(
                ".treeview-context-item:not([disabled])"
            )
        ) as HTMLElement[];

        switch (e.key)
        {
            case "ArrowDown":
                e.preventDefault();
                e.stopPropagation();
                this.contextMenuFocusedIndex = Math.min(
                    this.contextMenuFocusedIndex + 1,
                    items.length - 1
                );
                items[this.contextMenuFocusedIndex]?.focus();
                break;

            case "ArrowUp":
                e.preventDefault();
                e.stopPropagation();
                this.contextMenuFocusedIndex = Math.max(
                    this.contextMenuFocusedIndex - 1, 0
                );
                items[this.contextMenuFocusedIndex]?.focus();
                break;

            case "Home":
                e.preventDefault();
                e.stopPropagation();
                this.contextMenuFocusedIndex = 0;
                items[0]?.focus();
                break;

            case "End":
                e.preventDefault();
                e.stopPropagation();
                this.contextMenuFocusedIndex = items.length - 1;
                items[items.length - 1]?.focus();
                break;

            case "Enter":
            case " ":
                e.preventDefault();
                e.stopPropagation();
                items[this.contextMenuFocusedIndex]?.click();
                break;

            case "Escape":
                e.preventDefault();
                e.stopPropagation();
                this.dismissContextMenu();

                // Restore focus to the node that triggered the menu
                if (this.contextMenuNodeId)
                {
                    this.setFocus(this.contextMenuNodeId);
                }
                break;
        }
    }

    /**
     * Dismisses (hides) the context menu.
     */
    private dismissContextMenu(): void
    {
        if (this.contextMenuEl)
        {
            this.contextMenuEl.style.display = "none";
            this.contextMenuEl.innerHTML = "";
        }

        this.contextMenuNodeId = null;
        this.contextMenuFocusedIndex = -1;
    }

    /**
     * Handles clicks outside the context menu to dismiss it.
     */
    private onDocumentClick(e: MouseEvent): void
    {
        if (!this.contextMenuEl)
        {
            return;
        }

        if (this.contextMenuEl.style.display === "none")
        {
            return;
        }

        if (!this.contextMenuEl.contains(e.target as Node))
        {
            this.dismissContextMenu();
        }
    }

    // ========================================================================
    // S13: DRAG AND DROP (HTML5 DnD API)
    // ========================================================================

    /**
     * Attaches HTML5 drag and drop listeners to a node row.
     */
    private attachDragListeners(row: HTMLElement, node: TreeNode): void
    {
        // Check if node type allows dragging
        const desc = this.typeMap.get(node.kind);
        const canDrag = desc?.draggable !== false && !node.disabled;

        if (canDrag)
        {
            setAttr(row, "draggable", "true");

            row.addEventListener("dragstart", (e) =>
            {
                this.onDragStart(e, node);
            });

            row.addEventListener("dragend", () =>
            {
                this.onDragEnd();
            });
        }

        // Drop target listeners (always attached for external drops)
        row.addEventListener("dragover", (e) =>
        {
            this.onDragOver(e, row, node);
        });

        row.addEventListener("dragleave", (e) =>
        {
            this.onDragLeave(e, row);
        });

        row.addEventListener("drop", (e) =>
        {
            this.onDrop(e, node);
        });
    }

    /**
     * Handles dragstart: stores source node IDs in dataTransfer.
     */
    private onDragStart(e: DragEvent, node: TreeNode): void
    {
        if (!e.dataTransfer)
        {
            return;
        }

        // Collect drag sources: selected nodes if multi-select, else just this node
        if (this.selectedIds.has(node.id) && this.selectedIds.size > 1)
        {
            this.dragSourceIds = Array.from(this.selectedIds);
        }
        else
        {
            this.dragSourceIds = [node.id];
        }

        // Set data for cross-tree interop
        const payload = JSON.stringify({
            treeId: this.instanceId,
            nodeIds: this.dragSourceIds
        });

        e.dataTransfer.setData(DND_MIME, payload);
        e.dataTransfer.setData("text/plain", node.label);
        e.dataTransfer.effectAllowed = "move";

        // Add dragging class to source rows
        for (const id of this.dragSourceIds)
        {
            const srcRow = this.nodeRowMap.get(id);
            if (srcRow)
            {
                srcRow.classList.add("treeview-node-dragging");
            }
        }

        console.log(
            LOG_PREFIX, "Drag started:",
            this.dragSourceIds.length, "node(s)"
        );
    }

    /**
     * Handles dragend: cleans up drag state.
     */
    private onDragEnd(): void
    {
        for (const id of this.dragSourceIds)
        {
            const srcRow = this.nodeRowMap.get(id);
            if (srcRow)
            {
                srcRow.classList.remove("treeview-node-dragging");
            }
        }

        this.clearDropIndicators();
        this.dragSourceIds = [];
    }

    /**
     * Handles dragover: determines drop position and shows indicator.
     */
    private onDragOver(
        e: DragEvent, row: HTMLElement, node: TreeNode
    ): void
    {
        if (!e.dataTransfer)
        {
            return;
        }

        // Check if this node accepts drops
        const desc = this.typeMap.get(node.kind);
        const isParentNode = this.isNodeParent(node);

        // Determine drop position from mouse Y in row thirds
        const rect = row.getBoundingClientRect();
        const relY = e.clientY - rect.top;
        const third = rect.height / 3;

        let position: DropPosition;
        if (relY < third)
        {
            position = "before";
        }
        else if (relY > third * 2 || !isParentNode)
        {
            position = isParentNode ? "after" : "before";
        }
        else
        {
            position = "inside";
        }

        // For parent nodes that accept drops, default to "inside"
        if (isParentNode && (desc?.droppable !== false))
        {
            // Keep calculated position
        }
        else if (!isParentNode)
        {
            // Leaf nodes: only before/after
            position = relY < rect.height / 2 ? "before" : "after";
        }

        // Validate drop
        const hasTreeData = e.dataTransfer.types.includes(DND_MIME);
        let isValid = true;

        if (hasTreeData && this.options.onDragValidate)
        {
            const sourceNodes: TreeNode[] = [];
            for (const id of this.dragSourceIds)
            {
                const srcNode = this.nodeMap.get(id);
                if (srcNode)
                {
                    sourceNodes.push(srcNode);
                }
            }

            // Don't allow dropping onto self or descendants
            for (const src of sourceNodes)
            {
                if (src.id === node.id ||
                    this.isAncestorOf(src.id, node.id))
                {
                    isValid = false;
                    break;
                }
            }

            if (isValid)
            {
                isValid = this.options.onDragValidate(
                    sourceNodes, node, position
                );
            }
        }
        else if (hasTreeData)
        {
            // Default validation: don't drop on self or descendants
            for (const id of this.dragSourceIds)
            {
                if (id === node.id)
                {
                    isValid = false;
                    break;
                }

                const srcNode = this.nodeMap.get(id);
                if (srcNode &&
                    this.isAncestorOf(srcNode.id, node.id))
                {
                    isValid = false;
                    break;
                }
            }
        }

        if (isValid)
        {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";

            // Update drop indicators
            this.clearDropIndicators();
            this.currentDropTarget = row;
            this.currentDropPosition = position;

            row.classList.add(`treeview-drop-${position}`);
        }
    }

    /**
     * Handles dragleave: removes drop indicators.
     */
    private onDragLeave(e: DragEvent, row: HTMLElement): void
    {
        // Only clear if actually leaving the row
        const relatedTarget = e.relatedTarget as HTMLElement;
        if (relatedTarget && row.contains(relatedTarget))
        {
            return;
        }

        row.classList.remove(
            "treeview-drop-before",
            "treeview-drop-inside",
            "treeview-drop-after"
        );

        if (this.currentDropTarget === row)
        {
            this.currentDropTarget = null;
            this.currentDropPosition = null;
        }
    }

    /**
     * Handles drop: fires callbacks for internal or external drops.
     */
    private onDrop(e: DragEvent, targetNode: TreeNode): void
    {
        e.preventDefault();
        e.stopPropagation();

        if (!e.dataTransfer || !this.currentDropPosition)
        {
            this.clearDropIndicators();
            return;
        }

        const position = this.currentDropPosition;

        // Check for tree data
        const treeData = e.dataTransfer.getData(DND_MIME);

        if (treeData)
        {
            try
            {
                const payload = JSON.parse(treeData);
                const sourceNodeIds: string[] = payload.nodeIds || [];

                // Collect source nodes (may be from this tree or another)
                const sourceNodes: TreeNode[] = [];
                for (const id of sourceNodeIds)
                {
                    const srcNode = this.nodeMap.get(id);
                    if (srcNode)
                    {
                        sourceNodes.push(srcNode);
                    }
                }

                if (sourceNodes.length > 0 && this.options.onDrop)
                {
                    this.options.onDrop(sourceNodes, targetNode, position);
                    console.log(
                        LOG_PREFIX, "Dropped",
                        sourceNodes.length, "node(s) onto",
                        targetNode.label, "position:", position
                    );
                }
            }
            catch (err)
            {
                console.error(LOG_PREFIX, "Failed to parse drag data", err);
            }
        }
        else if (this.options.onExternalDrop)
        {
            // External drop (files, URLs, etc.)
            this.options.onExternalDrop(
                e.dataTransfer, targetNode, position
            );
            console.log(
                LOG_PREFIX, "External drop onto",
                targetNode.label, "position:", position
            );
        }

        this.clearDropIndicators();
    }

    /**
     * Clears all drop position indicators.
     */
    private clearDropIndicators(): void
    {
        if (this.currentDropTarget)
        {
            this.currentDropTarget.classList.remove(
                "treeview-drop-before",
                "treeview-drop-inside",
                "treeview-drop-after"
            );
        }

        this.currentDropTarget = null;
        this.currentDropPosition = null;
    }

    // ========================================================================
    // S14: SEARCH / FILTER
    // ========================================================================

    /**
     * Handles search input with debouncing.
     */
    private onSearchInput(): void
    {
        if (this.searchDebounceTimer)
        {
            clearTimeout(this.searchDebounceTimer);
        }

        const debounceMs = this.options.searchDebounceMs ||
            DEFAULT_SEARCH_DEBOUNCE;

        this.searchDebounceTimer = setTimeout(() =>
        {
            this.executeSearch();
        }, debounceMs);
    }

    /**
     * Routes search to sync, chunked, or async strategy based on tree size.
     * < threshold: synchronous. >= threshold + onSearchAsync: server-side.
     * >= threshold without onSearchAsync: client-side chunked via rAF.
     */
    private executeSearch(): void
    {
        const text = this.searchInputEl?.value?.trim() || "";
        this.searchText = text;

        if (!text)
        {
            this.searchMatchIds.clear();
            this.searchAncestorIds.clear();
            this.renderTree();
            console.log(LOG_PREFIX, "Search cleared");
            return;
        }

        const threshold = this.options.searchAsyncThreshold ||
            DEFAULT_SEARCH_ASYNC_THRESHOLD;
        const nodeCount = this.nodeMap.size;

        if (this.options.onSearchAsync && nodeCount >= threshold)
        {
            this.executeSearchAsync(text);
        }
        else if (nodeCount >= threshold)
        {
            this.executeSearchChunked(text);
        }
        else
        {
            this.executeSearchSync(text);
        }
    }

    /**
     * Synchronous search for small trees (< threshold nodes).
     */
    private executeSearchSync(text: string): void
    {
        const predicate = this.options.filterPredicate ||
            defaultFilterPredicate;

        const result = findMatchesAndAncestors(
            this.roots,
            (node) => predicate(text, node)
        );

        this.searchMatchIds = result.matchIds;
        this.searchAncestorIds = result.ancestorIds;
        this.expandSearchAncestors(result.ancestorIds);
        this.renderTree();
        this.logSearchResult(text);
    }

    /**
     * Server-side async search via onSearchAsync callback.
     * Receives matching node IDs, then computes ancestors via parentMap.
     */
    private executeSearchAsync(text: string): void
    {
        const searchId = ++this.searchGeneration;

        this.options.onSearchAsync!(text).then((matchIds) =>
        {
            // Stale result — a newer search has been triggered
            if (searchId !== this.searchGeneration)
            {
                return;
            }

            this.searchMatchIds = new Set(matchIds);
            this.searchAncestorIds =
                this.computeAncestorsFromMatches(matchIds);

            this.expandSearchAncestors(this.searchAncestorIds);
            this.renderTree();
            this.logSearchResult(text);
        }).catch((err) =>
        {
            console.error(LOG_PREFIX, "Async search failed:", err);
        });
    }

    /**
     * Client-side chunked search for large trees without server-side handler.
     * Processes CHUNK_SIZE nodes per rAF frame to keep UI responsive.
     */
    private executeSearchChunked(text: string): void
    {
        const searchId = ++this.searchGeneration;
        const predicate = this.options.filterPredicate ||
            defaultFilterPredicate;

        const matchIds = new Set<string>();
        const allNodes = Array.from(this.nodeMap.values());
        const total = allNodes.length;
        let offset = 0;

        const processChunk = (): void =>
        {
            if (searchId !== this.searchGeneration)
            {
                return;
            }

            const end = Math.min(offset + SEARCH_CHUNK_SIZE, total);

            for (let i = offset; i < end; i++)
            {
                if (predicate(text, allNodes[i]))
                {
                    matchIds.add(allNodes[i].id);
                }
            }

            offset = end;

            if (offset < total)
            {
                requestAnimationFrame(processChunk);
                return;
            }

            // All chunks processed — apply results
            this.searchMatchIds = matchIds;
            this.searchAncestorIds =
                this.computeAncestorsFromMatches(
                    Array.from(matchIds)
                );

            this.expandSearchAncestors(this.searchAncestorIds);
            this.renderTree();
            this.logSearchResult(text);
        };

        requestAnimationFrame(processChunk);
    }

    /**
     * Computes ancestor IDs for a set of match IDs using parentMap.
     * O(matches * avgDepth) instead of O(N) tree walk.
     */
    private computeAncestorsFromMatches(
        matchIds: string[]
    ): Set<string>
    {
        const ancestors = new Set<string>();

        for (const matchId of matchIds)
        {
            let current = this.parentMap.get(matchId);

            while (current && current !== "")
            {
                if (ancestors.has(current))
                {
                    break; // Already traced this path
                }

                ancestors.add(current);
                current = this.parentMap.get(current);
            }
        }

        return ancestors;
    }

    /**
     * Expands all ancestor nodes of search matches so results are visible.
     */
    private expandSearchAncestors(ancestorIds: Set<string>): void
    {
        for (const ancestorId of ancestorIds)
        {
            this.expandedIds.add(ancestorId);
        }
    }

    /**
     * Logs search result count.
     */
    private logSearchResult(text: string): void
    {
        console.log(
            LOG_PREFIX, "Search:", text,
            "matches:", this.searchMatchIds.size
        );
    }

    // ========================================================================
    // S15: SORT
    // ========================================================================

    /**
     * Changes the sort mode and re-renders.
     */
    public setSort(mode: TreeSortMode): void
    {
        this.currentSortMode = mode;
        this.renderTree();

        console.log(LOG_PREFIX, "Sort mode:", mode);
    }

    // ========================================================================
    // S16: STARRED / FAVOURITES
    // ========================================================================

    /**
     * Builds the starred group at the top of the tree.
     */
    private buildStarredGroup(): HTMLElement
    {
        const group = createElement("div", ["treeview-starred-group"]);
        const header = createElement("div", [
            "treeview-starred-header"
        ]);

        const icon = createElement("i", ["bi", "bi-star-fill"]);
        header.appendChild(icon);
        header.appendChild(document.createTextNode(
            ` ${this.options.starredLabel || "Starred"}`
        ));
        group.appendChild(header);

        const starredNodes = collectStarred(this.roots);

        if (starredNodes.length === 0)
        {
            const empty = createElement("div", [
                "treeview-starred-empty"
            ], "No starred items");
            group.appendChild(empty);
        }
        else
        {
            const list = createElement("ul", [
                "treeview-starred-list"
            ]);

            for (const node of starredNodes)
            {
                const li = createElement("li", [
                    "treeview-starred-item"
                ]);

                const row = createElement("div", [
                    "treeview-node-row", "treeview-starred-row"
                ]);
                setAttr(row, "data-node-id", node.id);
                setAttr(row, "tabindex", "-1");
                setAttr(row, "role", "button");

                // Icon
                const iconClass = node.icon ||
                    this.typeMap.get(node.kind)?.icon;
                if (iconClass)
                {
                    const nodeIcon = createElement("span", [
                        "treeview-node-icon"
                    ]);
                    nodeIcon.appendChild(createElement("i", [iconClass]));
                    row.appendChild(nodeIcon);
                }

                // Label
                const label = createElement("span", [
                    "treeview-node-label"
                ], node.label);
                row.appendChild(label);

                // Click scrolls to real node
                row.addEventListener("click", () =>
                {
                    this.scrollToNode(node.id);
                    this.singleSelect(node.id);
                    this.setFocus(node.id);
                });

                li.appendChild(row);
                list.appendChild(li);
            }

            group.appendChild(list);
        }

        return group;
    }

    /**
     * Toggles the starred state of a node.
     */
    private toggleStar(node: TreeNode): void
    {
        node.starred = !node.starred;

        if (this.options.onStarToggle)
        {
            this.options.onStarToggle(node, node.starred);
        }

        // Rebuild starred group and update the star icon
        if (this.options.showStarred && this.listContainerEl)
        {
            if (this.starredGroupEl)
            {
                this.starredGroupEl.remove();
            }

            this.starredGroupEl = this.buildStarredGroup();
            this.listContainerEl.insertBefore(
                this.starredGroupEl,
                this.listContainerEl.firstChild
            );
        }

        // Update star icon in node row
        const row = this.nodeRowMap.get(node.id);
        if (row)
        {
            const starEl = row.querySelector(
                ".treeview-node-star"
            ) as HTMLElement;

            if (starEl)
            {
                const starIcon = starEl.querySelector("i");
                if (starIcon)
                {
                    starIcon.className = node.starred
                        ? "bi bi-star-fill"
                        : "bi bi-star";
                }

                if (node.starred)
                {
                    starEl.classList.add("treeview-node-starred");
                    setAttr(starEl, "title", "Unstar");
                }
                else
                {
                    starEl.classList.remove("treeview-node-starred");
                    setAttr(starEl, "title", "Star");
                }
            }
        }

        console.log(
            LOG_PREFIX,
            node.starred ? "Starred" : "Unstarred",
            node.label
        );
    }

    // ========================================================================
    // S17: PUBLIC API
    // ========================================================================

    /**
     * Adds a node under a parent. If parentId is null, adds as a root.
     * Uses incremental DOM insertion instead of full rebuild.
     */
    public addNode(
        parentId: string | null,
        node: TreeNode,
        index?: number
    ): void
    {
        this.addNodeToModel(parentId, node, index);
        this.insertIntoIndex(node, parentId || "");
        this.invalidateVisibleCache();
        this.addNodeToDOM(parentId, node, index);
        console.log(LOG_PREFIX, "Added node:", node.label);
    }

    /**
     * Inserts a node into the data model (roots or parent.children).
     */
    private addNodeToModel(
        parentId: string | null,
        node: TreeNode,
        index?: number
    ): void
    {
        if (parentId === null)
        {
            if (index !== undefined)
            {
                this.roots.splice(index, 0, node);
            }
            else
            {
                this.roots.push(node);
            }
            return;
        }

        const parent = this.nodeMap.get(parentId);
        if (!parent)
        {
            console.warn(LOG_PREFIX, "Parent not found:", parentId);
            return;
        }

        if (!parent.children)
        {
            parent.children = [];
        }

        if (index !== undefined)
        {
            parent.children.splice(index, 0, node);
        }
        else
        {
            parent.children.push(node);
        }
    }

    /**
     * Performs incremental DOM insertion for a newly added node.
     * Virtual mode: re-renders viewport window.
     * Non-virtual mode: builds single <li> and inserts into parent <ul>.
     */
    private addNodeToDOM(
        parentId: string | null,
        node: TreeNode,
        index?: number
    ): void
    {
        if (this.isVirtual)
        {
            this.renderVisibleWindow();
            return;
        }

        // Non-virtual: incremental DOM insert
        const level = parentId
            ? this.getNodeLevel(parentId) + 1
            : 1;

        if (!this.shouldShowNode(node))
        {
            return;
        }

        const li = this.buildNodeItem(node, level);

        if (parentId === null)
        {
            this.insertRootNodeLi(li, index);
        }
        else
        {
            this.insertChildNodeLi(parentId, li, index);
        }
    }

    /**
     * Inserts a root-level <li> into the main tree <ul>.
     */
    private insertRootNodeLi(
        li: HTMLElement, index?: number
    ): void
    {
        if (!this.treeListEl)
        {
            return;
        }

        if (index !== undefined && index < this.treeListEl.children.length)
        {
            this.treeListEl.insertBefore(
                li, this.treeListEl.children[index]
            );
        }
        else
        {
            this.treeListEl.appendChild(li);
        }
    }

    /**
     * Inserts a child <li> into a parent node's children <ul>.
     * Creates the <ul> group if the parent was previously a leaf.
     */
    private insertChildNodeLi(
        parentId: string, li: HTMLElement, index?: number
    ): void
    {
        const parentLi = this.nodeItemMap.get(parentId);
        if (!parentLi)
        {
            return;
        }

        // Parent must be expanded to show child
        if (!this.expandedIds.has(parentId))
        {
            // Update parent toggle to show expand arrow
            this.rebuildNodeSubtree(parentId);
            return;
        }

        // Find or create the children <ul>
        let childrenUl = parentLi.querySelector(
            ":scope > .treeview-children"
        ) as HTMLElement | null;

        if (!childrenUl)
        {
            childrenUl = createElement("ul", ["treeview-children"]);
            setAttr(childrenUl, "role", "group");
            parentLi.appendChild(childrenUl);

            // Update parent toggle (was leaf, now has children)
            this.rebuildNodeSubtree(parentId);
            return;
        }

        if (index !== undefined && index < childrenUl.children.length)
        {
            childrenUl.insertBefore(
                li, childrenUl.children[index]
            );
        }
        else
        {
            childrenUl.appendChild(li);
        }
    }

    /**
     * Returns the nesting level of a node by walking parentMap.
     */
    private getNodeLevel(nodeId: string): number
    {
        let level = 1;
        let current = this.parentMap.get(nodeId);

        while (current && current !== "")
        {
            level++;
            current = this.parentMap.get(current);
        }

        return level;
    }

    /**
     * Removes a node and all its descendants.
     * Uses O(1) parentMap lookup and incremental DOM removal.
     */
    public removeNode(nodeId: string): void
    {
        if (!this.removeNodeFromModel(nodeId))
        {
            return;
        }

        // Order matters: DOM + state cleanup need nodeMap for child traversal,
        // so removeFromIndex must be last.
        this.cleanupRemovedNodeState(nodeId);
        this.removeNodeFromDOM(nodeId);
        this.removeFromIndex(nodeId);
        this.invalidateVisibleCache();
        console.log(LOG_PREFIX, "Removed node:", nodeId);
    }

    /**
     * Removes a node from the data model using O(1) parentMap lookup.
     * Returns true if the node was found and removed.
     */
    private removeNodeFromModel(nodeId: string): boolean
    {
        const parentId = this.parentMap.get(nodeId);
        if (parentId === undefined)
        {
            console.warn(LOG_PREFIX, "Node not in index:", nodeId);
            return false;
        }

        const siblings = parentId === ""
            ? this.roots
            : this.nodeMap.get(parentId)?.children;

        if (!siblings)
        {
            return false;
        }

        const idx = siblings.findIndex(n => n.id === nodeId);
        if (idx === -1)
        {
            return false;
        }

        siblings.splice(idx, 1);
        return true;
    }

    /**
     * Cleans up selection, expansion, and focus state for a removed node
     * and all its descendants.
     */
    private cleanupRemovedNodeState(nodeId: string): void
    {
        // Clean up the node itself
        this.selectedIds.delete(nodeId);
        this.expandedIds.delete(nodeId);

        if (this.focusedNodeId === nodeId)
        {
            this.focusedNodeId = null;
        }

        // Clean up descendants via nodeMap (before removeFromIndex)
        const node = this.nodeMap.get(nodeId);
        if (!node?.children)
        {
            return;
        }

        const stack: TreeNode[] = [...node.children];
        while (stack.length > 0)
        {
            const child = stack.pop()!;
            this.selectedIds.delete(child.id);
            this.expandedIds.delete(child.id);

            if (this.focusedNodeId === child.id)
            {
                this.focusedNodeId = null;
            }

            if (child.children)
            {
                for (const gc of child.children)
                {
                    stack.push(gc);
                }
            }
        }
    }

    /**
     * Performs incremental DOM removal for a deleted node.
     * Virtual mode: re-renders viewport window.
     * Non-virtual mode: removes single <li> from parent <ul>.
     */
    private removeNodeFromDOM(nodeId: string): void
    {
        if (this.isVirtual)
        {
            this.renderVisibleWindow();
            return;
        }

        // Non-virtual: incremental DOM removal
        const li = this.nodeItemMap.get(nodeId);
        if (li && li.parentElement)
        {
            li.parentElement.removeChild(li);
        }

        // Clean up row/item maps for this subtree
        this.removeSubtreeMaps(nodeId);
    }

    /**
     * Updates properties of an existing node.
     */
    public updateNode(
        nodeId: string,
        updates: Partial<Pick<TreeNode,
            "label" | "icon" | "badges" | "tooltip" | "disabled" |
            "starred" | "kind" | "data">>
    ): void
    {
        const node = this.nodeMap.get(nodeId);
        if (!node)
        {
            console.warn(LOG_PREFIX, "Node not found:", nodeId);
            return;
        }

        Object.assign(node, updates);
        this.rebuildNodeSubtree(nodeId);

        // Rebuild starred group if star state changed
        if ("starred" in updates && this.options.showStarred)
        {
            if (this.starredGroupEl && this.listContainerEl)
            {
                this.starredGroupEl.remove();
                this.starredGroupEl = this.buildStarredGroup();
                this.listContainerEl.insertBefore(
                    this.starredGroupEl,
                    this.listContainerEl.firstChild
                );
            }
        }
    }

    /**
     * Returns a node by ID, or undefined if not found.
     */
    public getNodeById(nodeId: string): TreeNode | undefined
    {
        return this.nodeMap.get(nodeId);
    }

    /**
     * Expands a specific node.
     */
    public expandNode(nodeId: string): void
    {
        this.expandNodeInternal(nodeId);
    }

    /**
     * Collapses a specific node.
     */
    public collapseNode(nodeId: string): void
    {
        this.collapseNodeInternal(nodeId);
    }

    /**
     * Expands all parent nodes in the tree.
     */
    public expandAll(): void
    {
        const expandRecursive = (nodes: TreeNode[]): void =>
        {
            for (const node of nodes)
            {
                if (this.isNodeParent(node))
                {
                    this.expandedIds.add(node.id);
                }

                if (node.children)
                {
                    expandRecursive(node.children);
                }
            }
        };

        expandRecursive(this.roots);
        this.renderTree();
    }

    /**
     * Collapses all nodes in the tree.
     */
    public collapseAll(): void
    {
        this.expandedIds.clear();
        this.renderTree();
    }

    /**
     * Selects a node programmatically.
     */
    public selectNode(nodeId: string): void
    {
        this.singleSelect(nodeId);
        this.setFocus(nodeId);
    }

    /**
     * Deselects all nodes.
     */
    public deselectAll(): void
    {
        this.clearSelectionVisuals();
        this.selectedIds.clear();
        this.lastSelectedId = null;
        this.fireSelectionChange();
    }

    /**
     * Returns the currently selected nodes.
     */
    public getSelectedNodes(): TreeNode[]
    {
        const nodes: TreeNode[] = [];

        for (const id of this.selectedIds)
        {
            const node = this.nodeMap.get(id);
            if (node)
            {
                nodes.push(node);
            }
        }

        return nodes;
    }

    /**
     * Scrolls to a node, expanding all ancestors to make it visible.
     */
    public scrollToNode(nodeId: string): void
    {
        if (this.isVirtual)
        {
            this.scrollToNodeVirtual(nodeId);
            return;
        }

        // Expand ancestors using parentMap
        this.expandAncestors(nodeId);
        this.invalidateVisibleCache();

        // Rebuild tree to show expanded ancestors
        this.renderTree();

        // Scroll to the node row
        requestAnimationFrame(() =>
        {
            const row = this.nodeRowMap.get(nodeId);
            if (row)
            {
                row.scrollIntoView({ block: "nearest", behavior: "smooth" });
            }
        });
    }

    /**
     * Replaces all root nodes and re-renders.
     */
    public setRoots(roots: TreeNode[]): void
    {
        this.roots = [...roots];
        this.expandedIds.clear();
        this.selectedIds.clear();
        this.focusedNodeId = null;
        this.lastSelectedId = null;

        this.initExpandedState(this.roots);
        this.rebuildNodeIndex();
        this.renderTree();

        console.log(LOG_PREFIX, "Roots replaced:", roots.length, "root(s)");
    }

    /**
     * Clears the search filter and shows all nodes.
     */
    public clearSearch(): void
    {
        this.searchText = "";
        this.searchMatchIds.clear();
        this.searchAncestorIds.clear();

        if (this.searchInputEl)
        {
            this.searchInputEl.value = "";
        }

        this.renderTree();
    }

    /**
     * Returns the root DOM element.
     */
    public getElement(): HTMLElement | null
    {
        return this.rootEl;
    }

    /**
     * Returns the instance ID.
     */
    public getId(): string
    {
        return this.instanceId;
    }

    /**
     * Returns the current roots data.
     */
    public getRoots(): TreeNode[]
    {
        return this.roots;
    }
}

// ============================================================================
// S18: CONVENIENCE FUNCTIONS + GLOBAL EXPORTS
// ============================================================================

/**
 * Creates a TreeView instance.
 *
 * @param options - TreeView configuration
 * @returns The created TreeView instance
 */
export function createTreeView(options: TreeViewOptions): TreeView
{
    return new TreeView(options);
}

// Global exports for script-tag usage
if (typeof window !== "undefined")
{
    (window as any)["TreeView"] = TreeView;
    (window as any)["createTreeView"] = createTreeView;
}
