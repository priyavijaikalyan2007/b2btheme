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

/** Instance counter for unique ID generation. */
let instanceCounter = 0;

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

    // -- Node DOM map: nodeId → row HTMLElement
    private nodeRowMap = new Map<string, HTMLElement>();
    private nodeItemMap = new Map<string, HTMLElement>();

    // -- Search debounce
    private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

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

        this.nodeRowMap.clear();
        this.nodeItemMap.clear();
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
        this.buildTreeContent();

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
        const visible = flattenVisible(this.roots, this.expandedIds);
        const anchorIdx = visible.findIndex(n => n.id === anchorId);
        const targetIdx = visible.findIndex(n => n.id === targetId);

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
            const node = visible[i];
            if (!node.disabled)
            {
                this.selectedIds.add(node.id);
                this.applySelectionVisual(node.id, true);
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
        const node = findNodeById(this.roots, nodeId);
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
            const node = findNodeById(this.roots, id);
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
        const node = findNodeById(this.roots, nodeId);
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
        const node = findNodeById(this.roots, nodeId);
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
        const node = findNodeById(this.roots, nodeId);
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

        const node = findNodeById(this.roots, nodeId);
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
        const node = findNodeById(this.roots, nodeId);
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

        const node = findNodeById(this.roots, nodeId);
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
        const node = nodeId ? findNodeById(this.roots, nodeId) : null;

        if (!node)
        {
            return;
        }

        this.dispatchTreeKey(e, node);
    }

    /**
     * Dispatches a keyboard event to the appropriate tree key handler.
     * Simple navigation keys use getTreeKeyHandler; modifier keys and
     * type-ahead are handled by handleModifierKey.
     */
    private dispatchTreeKey(
        e: KeyboardEvent, node: TreeNode
    ): void
    {
        const handler = this.getTreeKeyHandler(e.key);

        if (handler)
        {
            e.preventDefault();
            handler(node, e);
            return;
        }

        this.handleModifierKey(e, node);
    }

    /**
     * Returns a handler function for standard tree navigation keys,
     * or null if the key is not a simple navigation action.
     */
    private getTreeKeyHandler(
        key: string
    ): ((node: TreeNode, e: KeyboardEvent) => void) | null
    {
        switch (key)
        {
            case "ArrowDown":
                return (n) => this.focusNextNode(n.id);
            case "ArrowUp":
                return (n) => this.focusPreviousNode(n.id);
            case "ArrowRight":
                return (n) => this.onArrowRight(n);
            case "ArrowLeft":
                return (n) => this.onArrowLeft(n);
            case "Home":
                return () => this.focusFirstNode();
            case "End":
                return () => this.focusLastNode();
            case " ":
                return (n, e) =>
                    this.onNodeClick(n, e as unknown as MouseEvent);
            case "Enter":
                return (n) => this.options.onActivate?.(n);
            case "*":
                return (n) => this.expandSiblings(n.id);
            default:
                return null;
        }
    }

    /**
     * Handles modifier keys (F2 rename, Ctrl+A select-all)
     * and single-character type-ahead navigation.
     */
    private handleModifierKey(
        e: KeyboardEvent, node: TreeNode
    ): void
    {
        if (e.key === "F2" && this.options.enableInlineRename)
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
        const visible = flattenVisible(this.roots, this.expandedIds);
        const idx = visible.findIndex(n => n.id === currentId);

        if (idx >= 0 && idx < visible.length - 1)
        {
            const next = visible[idx + 1];
            this.setFocus(next.id);
        }
    }

    /**
     * Focuses the previous visible node in tree order.
     */
    private focusPreviousNode(currentId: string): void
    {
        const visible = flattenVisible(this.roots, this.expandedIds);
        const idx = visible.findIndex(n => n.id === currentId);

        if (idx > 0)
        {
            const prev = visible[idx - 1];
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
            const parent = findParent(this.roots, node.id);
            if (parent)
            {
                this.setFocus(parent.id);
            }
        }
    }

    /**
     * Focuses the first visible node.
     */
    private focusFirstNode(): void
    {
        const visible = flattenVisible(this.roots, this.expandedIds);
        if (visible.length > 0)
        {
            this.setFocus(visible[0].id);
        }
    }

    /**
     * Focuses the last visible node.
     */
    private focusLastNode(): void
    {
        const visible = flattenVisible(this.roots, this.expandedIds);
        if (visible.length > 0)
        {
            this.setFocus(visible[visible.length - 1].id);
        }
    }

    /**
     * Expands all siblings of the focused node (asterisk key).
     */
    private expandSiblings(nodeId: string): void
    {
        const parent = findParent(this.roots, nodeId);
        const siblings = parent ? parent.children : this.roots;

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
        const visible = flattenVisible(this.roots, this.expandedIds);

        this.clearSelectionVisuals();
        this.selectedIds.clear();

        for (const node of visible)
        {
            if (!node.disabled)
            {
                this.selectedIds.add(node.id);
                this.applySelectionVisual(node.id, true);
            }
        }

        this.fireSelectionChange();
    }

    /**
     * Type-ahead: jump to next node starting with the typed character.
     */
    private typeAheadNavigate(char: string): void
    {
        const visible = flattenVisible(this.roots, this.expandedIds);
        const lowerChar = char.toLowerCase();
        const currentIdx = this.focusedNodeId
            ? visible.findIndex(n => n.id === this.focusedNodeId)
            : -1;

        // Search from current position forward, wrapping
        for (let i = 1; i <= visible.length; i++)
        {
            const idx = (currentIdx + i) % visible.length;
            const node = visible[idx];

            if (node.label.toLowerCase().startsWith(lowerChar))
            {
                this.setFocus(node.id);
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
        const node = findNodeById(this.roots, nodeId);
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

        const node = findNodeById(this.roots, nodeId);
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
                const srcNode = findNodeById(this.roots, id);
                if (srcNode)
                {
                    sourceNodes.push(srcNode);
                }
            }

            // Don't allow dropping onto self or descendants
            for (const src of sourceNodes)
            {
                if (src.id === node.id || isDescendant(src, node.id))
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

                const srcNode = findNodeById(this.roots, id);
                if (srcNode && isDescendant(srcNode, node.id))
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
                    const srcNode = findNodeById(this.roots, id);
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
     * Executes the search filter and rebuilds the tree.
     */
    private executeSearch(): void
    {
        const text = this.searchInputEl?.value?.trim() || "";
        this.searchText = text;

        if (!text)
        {
            this.searchMatchIds.clear();
            this.searchAncestorIds.clear();
        }
        else
        {
            const predicate = this.options.filterPredicate ||
                defaultFilterPredicate;

            const result = findMatchesAndAncestors(
                this.roots,
                (node) => predicate(text, node)
            );

            this.searchMatchIds = result.matchIds;
            this.searchAncestorIds = result.ancestorIds;

            // Auto-expand ancestors of matches
            for (const ancestorId of result.ancestorIds)
            {
                this.expandedIds.add(ancestorId);
            }
        }

        this.buildTreeContent();

        console.log(
            LOG_PREFIX, "Search:", text || "(cleared)",
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
        this.buildTreeContent();

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
     */
    public addNode(
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
        }
        else
        {
            const parent = findNodeById(this.roots, parentId);
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

        this.refresh();
        console.log(LOG_PREFIX, "Added node:", node.label);
    }

    /**
     * Removes a node and all its descendants.
     */
    public removeNode(nodeId: string): void
    {
        const removeFrom = (nodes: TreeNode[]): boolean =>
        {
            for (let i = 0; i < nodes.length; i++)
            {
                if (nodes[i].id === nodeId)
                {
                    nodes.splice(i, 1);
                    return true;
                }

                if (nodes[i].children)
                {
                    if (removeFrom(nodes[i].children!))
                    {
                        return true;
                    }
                }
            }

            return false;
        };

        if (removeFrom(this.roots))
        {
            this.selectedIds.delete(nodeId);
            this.expandedIds.delete(nodeId);

            if (this.focusedNodeId === nodeId)
            {
                this.focusedNodeId = null;
            }

            this.refresh();
            console.log(LOG_PREFIX, "Removed node:", nodeId);
        }
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
        const node = findNodeById(this.roots, nodeId);
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
        return findNodeById(this.roots, nodeId);
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
        this.buildTreeContent();
    }

    /**
     * Collapses all nodes in the tree.
     */
    public collapseAll(): void
    {
        this.expandedIds.clear();
        this.buildTreeContent();
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
            const node = findNodeById(this.roots, id);
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
        // Expand ancestors
        const expandAncestors = (
            nodes: TreeNode[], targetId: string
        ): boolean =>
        {
            for (const node of nodes)
            {
                if (node.id === targetId)
                {
                    return true;
                }

                if (node.children)
                {
                    if (expandAncestors(node.children, targetId))
                    {
                        this.expandedIds.add(node.id);
                        return true;
                    }
                }
            }

            return false;
        };

        expandAncestors(this.roots, nodeId);

        // Rebuild tree to show expanded ancestors
        this.buildTreeContent();

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
        this.buildTreeContent();

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

        this.buildTreeContent();
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
