/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: FileExplorer
 * 📜 PURPOSE: Two-pane file navigation with tree sidebar, breadcrumbs,
 *    grid/list/detail views, sorting, multi-selection, context menu,
 *    inline rename, and drag-and-drop — all callback-driven.
 * 🔗 RELATES: [[SplitLayout]], [[TreeView]], [[EnterpriseTheme]]
 * ⚡ FLOW: [Consumer] -> [new FileExplorer()] -> [show()] -> [DOM explorer]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// INTERFACES
// ============================================================================

/** Represents a file or folder node. */
export interface FileNode
{
    id: string;
    name: string;
    type: "file" | "folder";
    icon?: string;
    size?: number;
    modified?: Date;
    mimeType?: string;
    parentId?: string;
    children?: FileNode[];
    data?: Record<string, unknown>;
}

/** A context menu item. */
export interface FileContextMenuItem
{
    id: string;
    label: string;
    icon?: string;
    action: (files: FileNode[]) => void;
    disabled?: boolean;
    separatorAfter?: boolean;
    shortcut?: string;
}

/** Configuration options for FileExplorer. */
export interface FileExplorerOptions
{
    roots: FileNode[];
    viewMode?: "grid" | "list" | "detail";
    showBreadcrumbs?: boolean;
    showToolbar?: boolean;
    showTreePane?: boolean;
    treePaneWidth?: number;
    treePaneMinWidth?: number;
    treePaneMaxWidth?: number;
    selectable?: "single" | "multi";
    contextMenuItems?: FileContextMenuItem[];
    height?: string;
    cssClass?: string;
    showStatusLine?: boolean;
    sortField?: "name" | "modified" | "size" | "type";
    sortDirection?: "asc" | "desc";
    onNavigate?: (folder: FileNode) => void;
    onSelect?: (files: FileNode[]) => void;
    onOpen?: (file: FileNode) => void;
    onRename?: (file: FileNode, newName: string) => Promise<boolean>;
    onDelete?: (files: FileNode[]) => Promise<boolean>;
    onMove?: (files: FileNode[], targetFolder: FileNode) => Promise<boolean>;
    onCreateFolder?: (parent: FileNode, name: string) => Promise<FileNode | null>;
    onLoadChildren?: (folder: FileNode) => Promise<FileNode[]>;
    onUpload?: (folder: FileNode, files: FileList) => Promise<void>;
    /** Override default key combos. Keys are action names, values are combo strings. */
    keyBindings?: Partial<Record<string, string>>;
}

// ============================================================================
// CONSTANTS & TYPES
// ============================================================================

const LOG_PREFIX = "[FileExplorer]";
function logInfo(...args: unknown[]): void
{
    console.log(new Date().toISOString(), "[INFO]", LOG_PREFIX, ...args);
}

function logWarn(...args: unknown[]): void
{
    console.warn(new Date().toISOString(), "[WARN]", LOG_PREFIX, ...args);
}

function logError(...args: unknown[]): void
{
    console.error(new Date().toISOString(), "[ERROR]", LOG_PREFIX, ...args);
}

function logDebug(...args: unknown[]): void
{
    console.debug(new Date().toISOString(), "[DEBUG]", LOG_PREFIX, ...args);
}

let instanceCounter = 0;

const DEFAULT_KEY_BINDINGS: Record<string, string> = {
    "moveUp": "ArrowUp",
    "moveDown": "ArrowDown",
    "expand": "ArrowRight",
    "collapse": "ArrowLeft",
    "open": "Enter",
    "rename": "F2",
    "delete": "Delete",
    "escape": "Escape",
    "selectAll": "Ctrl+a",
};

type SortField = "name" | "modified" | "size" | "type";
type ViewMode = "grid" | "list" | "detail";

/** File extension → Bootstrap Icons class mapping. */
const ICON_MAP: Record<string, string> = {
    ".pdf": "bi-file-earmark-pdf",
    ".doc": "bi-file-earmark-word", ".docx": "bi-file-earmark-word",
    ".xls": "bi-file-earmark-spreadsheet", ".xlsx": "bi-file-earmark-spreadsheet",
    ".csv": "bi-file-earmark-spreadsheet",
    ".ppt": "bi-file-earmark-slides", ".pptx": "bi-file-earmark-slides",
    ".png": "bi-file-earmark-image", ".jpg": "bi-file-earmark-image",
    ".jpeg": "bi-file-earmark-image", ".gif": "bi-file-earmark-image",
    ".svg": "bi-file-earmark-image", ".webp": "bi-file-earmark-image",
    ".mp4": "bi-file-earmark-play", ".avi": "bi-file-earmark-play",
    ".mov": "bi-file-earmark-play", ".webm": "bi-file-earmark-play",
    ".mp3": "bi-file-earmark-music", ".wav": "bi-file-earmark-music",
    ".ogg": "bi-file-earmark-music", ".flac": "bi-file-earmark-music",
    ".js": "bi-file-earmark-code", ".ts": "bi-file-earmark-code",
    ".py": "bi-file-earmark-code", ".java": "bi-file-earmark-code",
    ".go": "bi-file-earmark-code", ".rs": "bi-file-earmark-code",
    ".c": "bi-file-earmark-code", ".cpp": "bi-file-earmark-code",
    ".html": "bi-file-earmark-code", ".css": "bi-file-earmark-code",
    ".txt": "bi-file-earmark-text", ".log": "bi-file-earmark-text",
    ".md": "bi-file-earmark-richtext",
    ".zip": "bi-file-earmark-zip", ".tar": "bi-file-earmark-zip",
    ".gz": "bi-file-earmark-zip", ".rar": "bi-file-earmark-zip",
    ".7z": "bi-file-earmark-zip",
    ".json": "bi-file-earmark-code",
    ".xml": "bi-file-earmark-code", ".yaml": "bi-file-earmark-code",
    ".yml": "bi-file-earmark-code"
};

// ============================================================================
// HELPERS
// ============================================================================

function createElement(
    tag: string, classes: string[], text?: string): HTMLElement
{
    const el = document.createElement(tag);
    if (classes.length > 0) { el.classList.add(...classes); }
    if (text) { el.textContent = text; }
    return el;
}

function setAttr(el: HTMLElement, name: string, value: string): void
{
    el.setAttribute(name, value);
}

/** Get icon class for a file node. */
function getFileIcon(node: FileNode): string
{
    if (node.icon) { return node.icon; }
    if (node.type === "folder") { return "bi-folder-fill"; }
    const ext = getExtension(node.name);
    return ICON_MAP[ext] || "bi-file-earmark";
}

/** Extract lowercase extension from filename. */
function getExtension(name: string): string
{
    const dot = name.lastIndexOf(".");
    return dot >= 0 ? name.substring(dot).toLowerCase() : "";
}

/** Format bytes to human-readable string. */
function formatSize(bytes: number | undefined): string
{
    if (bytes === undefined || bytes === null) { return "--"; }
    if (bytes < 1024) { return bytes + " B"; }
    if (bytes < 1024 * 1024)
    {
        return (bytes / 1024).toFixed(1) + " KB";
    }
    if (bytes < 1024 * 1024 * 1024)
    {
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    }
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
}

/** Get human-readable file type string. */
function getFileType(node: FileNode): string
{
    if (node.type === "folder") { return "Folder"; }
    if (node.mimeType)
    {
        const parts = node.mimeType.split("/");
        return parts[1] ? parts[1].toUpperCase() : parts[0];
    }
    const ext = getExtension(node.name);
    return ext ? ext.substring(1).toUpperCase() : "File";
}

/** Format a Date to YYYY-MM-DD HH:mm. */
function formatDate(d: Date | undefined): string
{
    if (!d) { return "--"; }
    const dt = d instanceof Date ? d : new Date(d);
    const pad = (n: number): string => n < 10 ? "0" + n : "" + n;
    return dt.getFullYear() + "-" + pad(dt.getMonth() + 1) + "-" +
        pad(dt.getDate()) + " " + pad(dt.getHours()) + ":" +
        pad(dt.getMinutes());
}

// ============================================================================
// CLASS: FileExplorer
// ============================================================================

export class FileExplorer
{
    private opts: FileExplorerOptions;
    private id: string;
    private destroyed = false;

    // Data
    private nodeMap = new Map<string, FileNode>();
    private parentMap = new Map<string, string>();
    private currentFolderId: string = "";
    private selection = new Set<string>();
    private lastClickedId: string | null = null;

    // Sort
    private sortField: SortField = "name";
    private sortDir: "asc" | "desc" = "asc";
    private viewMode: ViewMode = "detail";

    // DOM
    private root: HTMLElement | null = null;
    private toolbar: HTMLElement | null = null;
    private splitEl: HTMLElement | null = null;
    private treeContainer: HTMLElement | null = null;
    private contentPane: HTMLElement | null = null;
    private breadcrumbsEl: HTMLElement | null = null;
    private listingEl: HTMLElement | null = null;
    private statusEl: HTMLElement | null = null;
    private liveRegion: HTMLElement | null = null;
    private contextMenu: HTMLElement | null = null;

    // Virtual root folder for multi-root support
    private virtualRoot: FileNode;

    // Rename state
    private renameNodeId: string | null = null;

    // Bound handlers for cleanup
    private boundContentClick: ((e: MouseEvent) => void) | null = null;
    private boundContentDblClick: ((e: MouseEvent) => void) | null = null;
    private boundContentKeydown: ((e: KeyboardEvent) => void) | null = null;
    private boundContentContext: ((e: MouseEvent) => void) | null = null;
    private boundDocClick: ((e: MouseEvent) => void) | null = null;

    constructor(options: FileExplorerOptions)
    {
        this.opts = Object.assign(
        {
            viewMode: "detail" as ViewMode,
            showBreadcrumbs: true,
            showToolbar: true,
            showTreePane: true,
            treePaneWidth: 250,
            treePaneMinWidth: 150,
            treePaneMaxWidth: 500,
            selectable: "multi",
            height: "500px",
            showStatusLine: true,
            sortField: "name" as SortField,
            sortDirection: "asc"
        }, options);

        this.id = "fileexplorer-" + (++instanceCounter);
        this.viewMode = this.opts.viewMode as ViewMode;
        this.sortField = this.opts.sortField as SortField;
        this.sortDir = this.opts.sortDirection as "asc" | "desc";

        // Build virtual root
        this.virtualRoot = {
            id: "__root__",
            name: "Home",
            type: "folder",
            children: this.opts.roots
        };

        this.indexNodes(this.virtualRoot);
        this.currentFolderId = this.virtualRoot.id;
        this.buildDOM();

        logInfo("Initialized with",
            this.opts.roots.length, "roots");
    }

    // ====================================================================
    // INDEX MANAGEMENT
    // ====================================================================

    /** Recursively index all nodes for O(1) lookup. */
    private indexNodes(node: FileNode, parentId?: string): void
    {
        this.nodeMap.set(node.id, node);
        if (parentId) { this.parentMap.set(node.id, parentId); }
        if (node.children)
        {
            for (const child of node.children)
            {
                this.indexNodes(child, node.id);
            }
        }
    }

    // ====================================================================
    // LIFECYCLE
    // ====================================================================

    show(containerId: string): void
    {
        if (this.destroyed) { return; }
        const container = document.getElementById(containerId);
        if (!container)
        {
            logError("Container not found:", containerId);
            return;
        }
        container.appendChild(this.root!);
        this.attachListeners();
        this.renderContent();
        logInfo("Shown in", containerId);
    }

    hide(): void
    {
        if (this.destroyed || !this.root) { return; }
        this.closeContextMenu();
        this.detachListeners();
        if (this.root.parentElement)
        {
            this.root.parentElement.removeChild(this.root);
        }
    }

    destroy(): void
    {
        if (this.destroyed) { return; }
        this.hide();
        this.destroyed = true;
        this.root = null;
        this.nodeMap.clear();
        this.parentMap.clear();
        this.selection.clear();
        logInfo("Destroyed");
    }

    getElement(): HTMLElement | null { return this.root; }

    // ====================================================================
    // PUBLIC API
    // ====================================================================

    navigate(folderId: string): void
    {
        if (this.destroyed) { return; }
        const folder = this.nodeMap.get(folderId);
        if (!folder || folder.type !== "folder")
        {
            logWarn("Folder ID not found:", folderId);
            return;
        }
        this.currentFolderId = folderId;
        this.selection.clear();
        this.lastClickedId = null;
        this.renderContent();
        this.updateTreeSelection(folderId);
        const items = this.getCurrentChildren();
        this.announce("Navigated to " + folder.name +
            ", " + items.length + " items");
        logInfo("Navigated to", folder.name,
            "(id:", folderId + ")");
        if (this.opts.onNavigate) { this.opts.onNavigate(folder); }
    }

    getSelectedFiles(): FileNode[]
    {
        return Array.from(this.selection)
            .map(id => this.nodeMap.get(id))
            .filter(Boolean) as FileNode[];
    }

    refresh(): void
    {
        if (this.destroyed) { return; }
        this.renderContent();
    }

    setViewMode(mode: ViewMode): void
    {
        if (this.destroyed) { return; }
        this.viewMode = mode;
        this.renderContent();
        this.updateToolbarViewButtons();
        this.announce("Switched to " + mode + " view");
        logInfo("View mode changed to", mode);
    }

    getViewMode(): string { return this.viewMode; }

    getCurrentFolder(): FileNode
    {
        return this.nodeMap.get(this.currentFolderId) || this.virtualRoot;
    }

    getPath(): FileNode[]
    {
        const path: FileNode[] = [];
        let id: string | undefined = this.currentFolderId;
        while (id)
        {
            const node = this.nodeMap.get(id);
            if (node) { path.unshift(node); }
            id = this.parentMap.get(id);
        }
        return path;
    }

    addFile(file: FileNode, parentId: string): void
    {
        if (this.destroyed) { return; }
        const parent = this.nodeMap.get(parentId);
        if (!parent) { return; }
        if (!parent.children) { parent.children = []; }
        parent.children.push(file);
        file.parentId = parentId;
        this.indexNodes(file, parentId);
        if (parentId === this.currentFolderId) { this.renderContent(); }
    }

    removeFile(fileId: string): void
    {
        if (this.destroyed) { return; }
        this.selection.delete(fileId);
        const parentId = this.parentMap.get(fileId);
        if (parentId)
        {
            const parent = this.nodeMap.get(parentId);
            if (parent && parent.children)
            {
                parent.children = parent.children.filter(
                    c => c.id !== fileId);
            }
        }
        this.nodeMap.delete(fileId);
        this.parentMap.delete(fileId);
        if (parentId === this.currentFolderId) { this.renderContent(); }
    }

    updateFile(fileId: string, changes: Partial<FileNode>): void
    {
        if (this.destroyed) { return; }
        const node = this.nodeMap.get(fileId);
        if (!node) { return; }
        Object.assign(node, changes);
        const parentId = this.parentMap.get(fileId);
        if (parentId === this.currentFolderId) { this.renderContent(); }
    }

    setSort(field: SortField, direction: "asc" | "desc"): void
    {
        if (this.destroyed) { return; }
        this.sortField = field;
        this.sortDir = direction;
        this.renderContent();
        this.announce("Sorted by " + field + ", " + direction);
    }

    // ====================================================================
    // DOM BUILDING
    // ====================================================================

    private buildDOM(): void
    {
        this.root = createElement("div", ["fileexplorer"]);
        setAttr(this.root, "role", "region");
        setAttr(this.root, "aria-label", "File Explorer");
        if (this.opts.height)
        {
            this.root.style.height = this.opts.height;
        }
        if (this.opts.cssClass)
        {
            this.root.classList.add(this.opts.cssClass);
        }

        if (this.opts.showToolbar) { this.buildToolbar(); }
        this.buildSplitLayout();
        this.buildLiveRegion();
    }

    private buildToolbar(): void
    {
        this.toolbar = createElement("div", ["fileexplorer-toolbar"]);
        setAttr(this.toolbar, "role", "toolbar");
        setAttr(this.toolbar, "aria-label", "File explorer actions");

        // View mode buttons
        const views: Array<{mode: ViewMode; icon: string; label: string}> = [
            { mode: "grid", icon: "bi-grid-3x3-gap", label: "Grid view" },
            { mode: "list", icon: "bi-list-ul", label: "List view" },
            { mode: "detail", icon: "bi-list-columns-reverse",
              label: "Detail view" }
        ];
        for (const v of views)
        {
            const btn = this.buildToolbarBtn(v.icon, v.label);
            setAttr(btn, "data-view-mode", v.mode);
            if (v.mode === this.viewMode)
            {
                btn.classList.add("fileexplorer-toolbar-btn-active");
            }
            btn.addEventListener("click", () => this.setViewMode(v.mode));
            this.toolbar.appendChild(btn);
        }

        // Separator
        this.toolbar.appendChild(
            createElement("span", ["fileexplorer-toolbar-separator"]));

        // Sort dropdown
        this.buildSortDropdown();

        // Spacer
        const spacer = createElement("span", ["fileexplorer-toolbar-spacer"]);
        this.toolbar.appendChild(spacer);

        // New folder button
        if (this.opts.onCreateFolder)
        {
            const newBtn = this.buildToolbarBtn(
                "bi-folder-plus", "New Folder");
            newBtn.addEventListener("click", () => this.handleCreateFolder());
            this.toolbar.appendChild(newBtn);
        }

        // Upload button
        if (this.opts.onUpload)
        {
            const upBtn = this.buildToolbarBtn("bi-upload", "Upload");
            upBtn.addEventListener("click", () => this.handleUpload());
            this.toolbar.appendChild(upBtn);
        }

        this.root!.appendChild(this.toolbar);
    }

    private buildToolbarBtn(
        iconClass: string, label: string): HTMLElement
    {
        const btn = createElement("button", ["fileexplorer-toolbar-btn"]);
        setAttr(btn, "type", "button");
        setAttr(btn, "title", label);
        setAttr(btn, "aria-label", label);
        const icon = createElement("i", ["bi", iconClass]);
        setAttr(icon, "aria-hidden", "true");
        btn.appendChild(icon);
        return btn;
    }

    private buildSortDropdown(): void
    {
        if (!this.toolbar) { return; }
        const fields: Array<{f: SortField; l: string}> = [
            { f: "name", l: "Name" },
            { f: "modified", l: "Modified" },
            { f: "size", l: "Size" },
            { f: "type", l: "Type" }
        ];

        const select = document.createElement("select");
        select.classList.add("fileexplorer-sort-select");
        setAttr(select, "aria-label", "Sort by");
        for (const f of fields)
        {
            const opt = document.createElement("option");
            opt.value = f.f;
            opt.textContent = f.l;
            if (f.f === this.sortField) { opt.selected = true; }
            select.appendChild(opt);
        }
        select.addEventListener("change", () =>
        {
            this.sortField = select.value as SortField;
            this.renderContent();
        });
        this.toolbar.appendChild(select);

        // Direction toggle
        const dirBtn = this.buildToolbarBtn(
            this.sortDir === "asc" ? "bi-sort-alpha-down" :
                "bi-sort-alpha-up", "Toggle sort direction");
        setAttr(dirBtn, "data-sort-dir", "true");
        dirBtn.addEventListener("click", () =>
        {
            this.sortDir = this.sortDir === "asc" ? "desc" : "asc";
            const icon = dirBtn.querySelector("i");
            if (icon)
            {
                icon.className = "bi " + (this.sortDir === "asc" ?
                    "bi-sort-alpha-down" : "bi-sort-alpha-up");
            }
            this.renderContent();
        });
        this.toolbar.appendChild(dirBtn);
    }

    private buildSplitLayout(): void
    {
        // Build a simple two-pane layout inline (avoids hard dependency)
        this.splitEl = createElement("div", ["fileexplorer-split"]);

        if (this.opts.showTreePane)
        {
            this.treeContainer = createElement("div",
                ["fileexplorer-tree-pane"]);
            this.treeContainer.style.width =
                (this.opts.treePaneWidth || 250) + "px";
            this.treeContainer.style.minWidth =
                (this.opts.treePaneMinWidth || 150) + "px";
            this.treeContainer.style.maxWidth =
                (this.opts.treePaneMaxWidth || 500) + "px";
            this.splitEl.appendChild(this.treeContainer);

            // Divider
            const divider = createElement("div",
                ["fileexplorer-divider"]);
            this.buildDividerDrag(divider);
            this.splitEl.appendChild(divider);

            this.buildTreeContent();
        }

        this.contentPane = createElement("div",
            ["fileexplorer-content-pane"]);

        if (this.opts.showBreadcrumbs)
        {
            this.breadcrumbsEl = createElement("nav",
                ["fileexplorer-breadcrumbs"]);
            setAttr(this.breadcrumbsEl, "role", "navigation");
            setAttr(this.breadcrumbsEl, "aria-label", "Breadcrumb");
            this.contentPane.appendChild(this.breadcrumbsEl);
        }

        this.listingEl = createElement("div", ["fileexplorer-listing"]);
        setAttr(this.listingEl, "tabindex", "0");
        this.contentPane.appendChild(this.listingEl);

        if (this.opts.showStatusLine)
        {
            this.statusEl = createElement("div", ["fileexplorer-status"]);
            setAttr(this.statusEl, "role", "status");
            this.contentPane.appendChild(this.statusEl);
        }

        this.splitEl.appendChild(this.contentPane);
        this.root!.appendChild(this.splitEl);
    }

    private buildDividerDrag(divider: HTMLElement): void
    {
        let startX = 0;
        let startWidth = 0;

        const onMove = (e: PointerEvent): void =>
        {
            if (!this.treeContainer) { return; }
            const delta = e.clientX - startX;
            const newW = Math.max(
                this.opts.treePaneMinWidth || 150,
                Math.min(
                    this.opts.treePaneMaxWidth || 500,
                    startWidth + delta));
            this.treeContainer.style.width = newW + "px";
        };

        const onUp = (): void =>
        {
            divider.releasePointerCapture(0);
            document.removeEventListener(
                "pointermove", onMove as EventListener);
            document.removeEventListener("pointerup", onUp);
        };

        divider.addEventListener("pointerdown", (e: PointerEvent) =>
        {
            e.preventDefault();
            startX = e.clientX;
            startWidth = this.treeContainer
                ? this.treeContainer.offsetWidth : 250;
            divider.setPointerCapture(e.pointerId);
            document.addEventListener(
                "pointermove", onMove as EventListener);
            document.addEventListener("pointerup", onUp);
        });
    }

    private buildTreeContent(): void
    {
        if (!this.treeContainer) { return; }

        const buildItem = (
            node: FileNode, depth: number): HTMLElement =>
        {
            const row = createElement("div", ["fileexplorer-tree-item"]);
            row.style.paddingLeft = (depth * 16 + 4) + "px";
            setAttr(row, "data-id", node.id);
            setAttr(row, "role", "treeitem");

            const hasSubfolders = node.children
                && node.children.some(c => c.type === "folder");
            if (hasSubfolders)
            {
                const chevron = createElement("i",
                    ["bi", "bi-chevron-right",
                     "fileexplorer-tree-chevron"]);
                setAttr(chevron, "aria-hidden", "true");
                row.appendChild(chevron);
            }
            else
            {
                const sp = createElement("span",
                    ["fileexplorer-tree-spacer"]);
                row.appendChild(sp);
            }

            const icon = createElement("i",
                ["bi", "bi-folder-fill", "fileexplorer-tree-icon"]);
            setAttr(icon, "aria-hidden", "true");
            row.appendChild(icon);

            const label = createElement("span",
                ["fileexplorer-tree-label"], node.name);
            row.appendChild(label);

            row.addEventListener("click", (e) =>
            {
                e.stopPropagation();
                this.navigate(node.id);
                this.highlightTreeItem(node.id);
                this.toggleTreeExpand(row, node);
            });

            return row;
        };

        const buildSubtree = (
            node: FileNode, depth: number, container: HTMLElement): void =>
        {
            const folders = (node.children || []).filter(
                c => c.type === "folder");
            for (const f of folders)
            {
                const item = buildItem(f, depth);
                container.appendChild(item);

                if (f.children && f.children.some(
                    c => c.type === "folder"))
                {
                    const sub = createElement("div",
                        ["fileexplorer-tree-children"]);
                    sub.style.display = "none";
                    buildSubtree(f, depth + 1, sub);
                    container.appendChild(sub);
                }
            }
        };

        const tree = createElement("div", ["fileexplorer-tree"]);
        setAttr(tree, "role", "tree");
        setAttr(tree, "aria-label", "Folder tree");

        // Add root folders
        buildSubtree(this.virtualRoot, 0, tree);
        this.treeContainer.appendChild(tree);
    }

    private toggleTreeExpand(row: HTMLElement, node: FileNode): void
    {
        const chevron = row.querySelector(".fileexplorer-tree-chevron");
        const next = row.nextElementSibling;
        if (!next || !next.classList.contains(
            "fileexplorer-tree-children")) { return; }

        const isOpen = next.getAttribute("style")?.includes(
            "display: none") ?? true;
        (next as HTMLElement).style.display = isOpen ? "" : "none";
        if (chevron)
        {
            chevron.classList.toggle("bi-chevron-right", !isOpen);
            chevron.classList.toggle("bi-chevron-down", isOpen);
        }
    }

    private highlightTreeItem(id: string): void
    {
        if (!this.treeContainer) { return; }
        const items = this.treeContainer.querySelectorAll(
            ".fileexplorer-tree-item");
        for (const item of items)
        {
            item.classList.toggle("fileexplorer-tree-item-active",
                item.getAttribute("data-id") === id);
        }
    }

    private updateTreeSelection(folderId: string): void
    {
        this.highlightTreeItem(folderId);
    }

    private buildLiveRegion(): void
    {
        this.liveRegion = createElement("div", ["visually-hidden"]);
        setAttr(this.liveRegion, "role", "status");
        setAttr(this.liveRegion, "aria-live", "polite");
        setAttr(this.liveRegion, "aria-atomic", "true");
        this.root!.appendChild(this.liveRegion);
    }

    private updateToolbarViewButtons(): void
    {
        if (!this.toolbar) { return; }
        const btns = this.toolbar.querySelectorAll(
            "[data-view-mode]");
        for (const btn of btns)
        {
            btn.classList.toggle("fileexplorer-toolbar-btn-active",
                btn.getAttribute("data-view-mode") === this.viewMode);
        }
    }

    // ====================================================================
    // CONTENT RENDERING
    // ====================================================================

    private renderContent(): void
    {
        if (!this.listingEl) { return; }
        this.renderBreadcrumbs();
        this.renderListing();
        this.renderStatusLine();
    }

    private renderBreadcrumbs(): void
    {
        if (!this.breadcrumbsEl) { return; }
        this.breadcrumbsEl.innerHTML = "";

        const path = this.getPath();
        for (let i = 0; i < path.length; i++)
        {
            const node = path[i];
            const isLast = i === path.length - 1;

            if (i === 0)
            {
                // Home icon
                const homeIcon = createElement("i",
                    ["bi", "bi-house", "fileexplorer-breadcrumb-home"]);
                setAttr(homeIcon, "aria-hidden", "true");
                if (!isLast)
                {
                    const link = createElement("a",
                        ["fileexplorer-breadcrumb-item"]);
                    setAttr(link, "href", "#");
                    link.appendChild(homeIcon);
                    link.addEventListener("click", (e) =>
                    {
                        e.preventDefault();
                        this.navigate(node.id);
                    });
                    this.breadcrumbsEl.appendChild(link);
                }
                else
                {
                    const span = createElement("span",
                        ["fileexplorer-breadcrumb-current"]);
                    span.appendChild(homeIcon);
                    const text = createElement("span", [], " Home");
                    span.appendChild(text);
                    this.breadcrumbsEl.appendChild(span);
                    continue;
                }
            }
            else if (isLast)
            {
                const span = createElement("span",
                    ["fileexplorer-breadcrumb-current"], node.name);
                this.breadcrumbsEl.appendChild(span);
            }
            else
            {
                const link = createElement("a",
                    ["fileexplorer-breadcrumb-item"], node.name);
                setAttr(link, "href", "#");
                link.addEventListener("click", (e) =>
                {
                    e.preventDefault();
                    this.navigate(node.id);
                });
                this.breadcrumbsEl.appendChild(link);
            }

            if (!isLast)
            {
                const sep = createElement("i",
                    ["bi", "bi-chevron-right",
                     "fileexplorer-breadcrumb-separator"]);
                setAttr(sep, "aria-hidden", "true");
                this.breadcrumbsEl.appendChild(sep);
            }
        }
    }

    private renderListing(): void
    {
        if (!this.listingEl) { return; }
        this.listingEl.innerHTML = "";

        const items = this.getSortedItems();
        if (items.length === 0)
        {
            this.renderEmptyState();
            return;
        }

        logDebug("Rendering", items.length,
            "items in", this.viewMode, "view");

        switch (this.viewMode)
        {
            case "grid":
                this.renderGridView(items);
                break;
            case "list":
                this.renderListView(items);
                break;
            case "detail":
                this.renderDetailView(items);
                break;
        }
    }

    private renderEmptyState(): void
    {
        if (!this.listingEl) { return; }
        const empty = createElement("div", ["fileexplorer-empty"]);
        const icon = createElement("i",
            ["bi", "bi-folder2-open", "fileexplorer-empty-icon"]);
        setAttr(icon, "aria-hidden", "true");
        empty.appendChild(icon);

        const msg = createElement("div",
            ["fileexplorer-empty-message"], "This folder is empty");
        empty.appendChild(msg);

        if (this.opts.onCreateFolder)
        {
            const link = createElement("a",
                ["fileexplorer-empty-action"], "Create a folder");
            setAttr(link, "href", "#");
            link.addEventListener("click", (e) =>
            {
                e.preventDefault();
                this.handleCreateFolder();
            });
            empty.appendChild(link);
        }

        this.listingEl.appendChild(empty);
        this.announce("This folder is empty");
    }

    // ====================================================================
    // GRID VIEW
    // ====================================================================

    private renderGridView(items: FileNode[]): void
    {
        if (!this.listingEl) { return; }
        const grid = createElement("div", ["fileexplorer-grid"]);
        setAttr(grid, "role", "grid");
        setAttr(grid, "aria-label", "Files and folders");
        if (this.opts.selectable === "multi")
        {
            setAttr(grid, "aria-multiselectable", "true");
        }

        for (const item of items)
        {
            const card = this.buildGridItem(item);
            grid.appendChild(card);
        }
        this.listingEl.appendChild(grid);
    }

    private buildGridItem(node: FileNode): HTMLElement
    {
        const card = createElement("div", ["fileexplorer-grid-item"]);
        setAttr(card, "data-id", node.id);
        setAttr(card, "role", "gridcell");
        setAttr(card, "tabindex", "-1");
        setAttr(card, "aria-selected",
            this.selection.has(node.id) ? "true" : "false");

        if (this.selection.has(node.id))
        {
            card.classList.add("fileexplorer-grid-item-selected");
        }

        const iconClass = getFileIcon(node);
        const icon = createElement("i",
            ["bi", iconClass, "fileexplorer-grid-icon"]);
        if (node.type === "folder")
        {
            icon.classList.add("fileexplorer-icon-folder");
        }
        setAttr(icon, "aria-hidden", "true");
        card.appendChild(icon);

        const name = createElement("span",
            ["fileexplorer-grid-name"], node.name);
        setAttr(name, "title", node.name);
        card.appendChild(name);

        return card;
    }

    // ====================================================================
    // LIST VIEW
    // ====================================================================

    private renderListView(items: FileNode[]): void
    {
        if (!this.listingEl) { return; }
        const list = createElement("div", ["fileexplorer-list"]);
        setAttr(list, "role", "listbox");
        setAttr(list, "aria-label", "Files and folders");
        if (this.opts.selectable === "multi")
        {
            setAttr(list, "aria-multiselectable", "true");
        }

        for (const item of items)
        {
            const row = this.buildListRow(item);
            list.appendChild(row);
        }
        this.listingEl.appendChild(list);
    }

    private buildListRow(node: FileNode): HTMLElement
    {
        const row = createElement("div", ["fileexplorer-list-row"]);
        setAttr(row, "data-id", node.id);
        setAttr(row, "role", "option");
        setAttr(row, "tabindex", "-1");
        setAttr(row, "aria-selected",
            this.selection.has(node.id) ? "true" : "false");

        if (this.selection.has(node.id))
        {
            row.classList.add("fileexplorer-list-row-selected");
        }

        const iconClass = getFileIcon(node);
        const icon = createElement("i",
            ["bi", iconClass, "fileexplorer-icon"]);
        if (node.type === "folder")
        {
            icon.classList.add("fileexplorer-icon-folder");
        }
        setAttr(icon, "aria-hidden", "true");
        row.appendChild(icon);

        const name = createElement("span",
            ["fileexplorer-name"], node.name);
        setAttr(name, "title", node.name);
        row.appendChild(name);

        if (node.type === "file")
        {
            const size = createElement("span",
                ["fileexplorer-size"], formatSize(node.size));
            row.appendChild(size);
        }

        return row;
    }

    // ====================================================================
    // DETAIL VIEW
    // ====================================================================

    private renderDetailView(items: FileNode[]): void
    {
        if (!this.listingEl) { return; }
        const detail = createElement("div", ["fileexplorer-detail"]);
        setAttr(detail, "role", "listbox");
        setAttr(detail, "aria-label", "Files and folders");
        if (this.opts.selectable === "multi")
        {
            setAttr(detail, "aria-multiselectable", "true");
        }

        // Header row
        detail.appendChild(this.buildDetailHeader());

        // Data rows
        for (const item of items)
        {
            const row = this.buildDetailRow(item);
            detail.appendChild(row);
        }
        this.listingEl.appendChild(detail);
    }

    private buildDetailHeader(): HTMLElement
    {
        const header = createElement("div",
            ["fileexplorer-detail-header"]);

        const columns: Array<{f: SortField; l: string; cls: string}> = [
            { f: "name", l: "Name", cls: "fileexplorer-detail-cell-name" },
            { f: "modified", l: "Modified",
              cls: "fileexplorer-detail-cell-date" },
            { f: "size", l: "Size", cls: "fileexplorer-detail-cell-size" },
            { f: "type", l: "Type", cls: "fileexplorer-detail-cell-type" }
        ];

        for (const col of columns)
        {
            const cell = createElement("div",
                ["fileexplorer-detail-header-cell", col.cls]);
            setAttr(cell, "role", "columnheader");

            const sortState = col.f === this.sortField
                ? (this.sortDir === "asc" ? "ascending" : "descending")
                : "none";
            setAttr(cell, "aria-sort", sortState);

            const label = createElement("span", [], col.l);
            cell.appendChild(label);

            if (col.f === this.sortField)
            {
                const arrow = createElement("i",
                    ["bi", this.sortDir === "asc" ?
                        "bi-caret-up-fill" : "bi-caret-down-fill",
                     "fileexplorer-detail-header-sort"]);
                setAttr(arrow, "aria-hidden", "true");
                cell.appendChild(arrow);
            }

            cell.addEventListener("click", () =>
            {
                this.handleColumnSort(col.f);
            });
            cell.style.cursor = "pointer";
            header.appendChild(cell);
        }

        return header;
    }

    private buildDetailRow(node: FileNode): HTMLElement
    {
        const row = createElement("div", ["fileexplorer-detail-row"]);
        setAttr(row, "data-id", node.id);
        setAttr(row, "role", "option");
        setAttr(row, "tabindex", "-1");
        setAttr(row, "aria-selected",
            this.selection.has(node.id) ? "true" : "false");

        if (this.selection.has(node.id))
        {
            row.classList.add("fileexplorer-detail-row-selected");
        }

        // Name cell
        const nameCell = createElement("div",
            ["fileexplorer-detail-cell",
             "fileexplorer-detail-cell-name"]);
        const iconClass = getFileIcon(node);
        const icon = createElement("i",
            ["bi", iconClass, "fileexplorer-icon"]);
        if (node.type === "folder")
        {
            icon.classList.add("fileexplorer-icon-folder");
        }
        setAttr(icon, "aria-hidden", "true");
        nameCell.appendChild(icon);

        const name = createElement("span",
            ["fileexplorer-name"], node.name);
        setAttr(name, "title", node.name);
        nameCell.appendChild(name);
        row.appendChild(nameCell);

        // Modified cell
        const modCell = createElement("div",
            ["fileexplorer-detail-cell",
             "fileexplorer-detail-cell-date"],
            formatDate(node.modified));
        row.appendChild(modCell);

        // Size cell
        const sizeCell = createElement("div",
            ["fileexplorer-detail-cell",
             "fileexplorer-detail-cell-size"],
            node.type === "folder" ? "--" : formatSize(node.size));
        row.appendChild(sizeCell);

        // Type cell
        const typeCell = createElement("div",
            ["fileexplorer-detail-cell",
             "fileexplorer-detail-cell-type"],
            getFileType(node));
        row.appendChild(typeCell);

        return row;
    }

    // ====================================================================
    // SORTING
    // ====================================================================

    private getCurrentChildren(): FileNode[]
    {
        const folder = this.nodeMap.get(this.currentFolderId);
        return folder ? (folder.children || []) : [];
    }

    private getSortedItems(): FileNode[]
    {
        const children = this.getCurrentChildren();
        const folders = children.filter(c => c.type === "folder");
        const files = children.filter(c => c.type === "file");

        const cmp = this.buildSortComparator();
        folders.sort(cmp);
        files.sort(cmp);

        return folders.concat(files);
    }

    private buildSortComparator():
        (a: FileNode, b: FileNode) => number
    {
        const dir = this.sortDir === "asc" ? 1 : -1;
        const field = this.sortField;

        return (a: FileNode, b: FileNode): number =>
        {
            switch (field)
            {
                case "name":
                    return dir * a.name.localeCompare(
                        b.name, undefined, { sensitivity: "base" });
                case "modified":
                {
                    const at = a.modified
                        ? a.modified.getTime() : 0;
                    const bt = b.modified
                        ? b.modified.getTime() : 0;
                    return dir * (at - bt);
                }
                case "size":
                    return dir * ((a.size || 0) - (b.size || 0));
                case "type":
                    return dir * getFileType(a).localeCompare(
                        getFileType(b));
                default:
                    return 0;
            }
        };
    }

    private handleColumnSort(field: SortField): void
    {
        if (field === this.sortField)
        {
            if (this.sortDir === "asc")
            {
                this.sortDir = "desc";
            }
            else
            {
                // Reset
                this.sortField = "name";
                this.sortDir = "asc";
            }
        }
        else
        {
            this.sortField = field;
            this.sortDir = "asc";
        }
        this.renderContent();
    }

    // ====================================================================
    // STATUS LINE
    // ====================================================================

    private renderStatusLine(): void
    {
        if (!this.statusEl) { return; }
        const items = this.getCurrentChildren();
        const folders = items.filter(c => c.type === "folder").length;
        const files = items.filter(c => c.type === "file").length;
        const parts: string[] = [];
        if (folders > 0) { parts.push(folders + " folder" +
            (folders > 1 ? "s" : "")); }
        if (files > 0) { parts.push(files + " file" +
            (files > 1 ? "s" : "")); }
        const total = parts.join(", ") || "Empty";

        const selCount = this.selection.size;
        const selText = selCount > 0
            ? " | " + selCount + " selected" : "";
        this.statusEl.textContent = total + selText;
    }

    // ====================================================================
    // SELECTION
    // ====================================================================

    private handleItemClick(id: string, e: MouseEvent): void
    {
        const multiMode = this.opts.selectable === "multi";

        if (multiMode && e.ctrlKey)
        {
            // Toggle selection
            if (this.selection.has(id))
            {
                this.selection.delete(id);
            }
            else
            {
                this.selection.add(id);
            }
        }
        else if (multiMode && e.shiftKey && this.lastClickedId)
        {
            // Range selection
            this.selectRange(this.lastClickedId, id);
        }
        else
        {
            // Single selection
            this.selection.clear();
            this.selection.add(id);
        }

        this.lastClickedId = id;
        this.updateSelectionVisuals();
        this.renderStatusLine();

        if (this.opts.onSelect)
        {
            this.opts.onSelect(this.getSelectedFiles());
        }
    }

    private selectRange(fromId: string, toId: string): void
    {
        const items = this.getSortedItems();
        const fromIdx = items.findIndex(i => i.id === fromId);
        const toIdx = items.findIndex(i => i.id === toId);
        if (fromIdx < 0 || toIdx < 0) { return; }

        const start = Math.min(fromIdx, toIdx);
        const end = Math.max(fromIdx, toIdx);
        this.selection.clear();
        for (let i = start; i <= end; i++)
        {
            this.selection.add(items[i].id);
        }
    }

    private updateSelectionVisuals(): void
    {
        if (!this.listingEl) { return; }

        // Grid items
        const gridItems = this.listingEl.querySelectorAll(
            ".fileexplorer-grid-item");
        for (const el of gridItems)
        {
            const id = el.getAttribute("data-id") || "";
            el.classList.toggle(
                "fileexplorer-grid-item-selected",
                this.selection.has(id));
            setAttr(el as HTMLElement, "aria-selected",
                this.selection.has(id) ? "true" : "false");
        }

        // List rows
        const listRows = this.listingEl.querySelectorAll(
            ".fileexplorer-list-row");
        for (const el of listRows)
        {
            const id = el.getAttribute("data-id") || "";
            el.classList.toggle(
                "fileexplorer-list-row-selected",
                this.selection.has(id));
            setAttr(el as HTMLElement, "aria-selected",
                this.selection.has(id) ? "true" : "false");
        }

        // Detail rows
        const detailRows = this.listingEl.querySelectorAll(
            ".fileexplorer-detail-row");
        for (const el of detailRows)
        {
            const id = el.getAttribute("data-id") || "";
            el.classList.toggle(
                "fileexplorer-detail-row-selected",
                this.selection.has(id));
            setAttr(el as HTMLElement, "aria-selected",
                this.selection.has(id) ? "true" : "false");
        }
    }

    // ====================================================================
    // CONTEXT MENU
    // ====================================================================

    private showContextMenu(x: number, y: number): void
    {
        if (!this.opts.contextMenuItems ||
            this.opts.contextMenuItems.length === 0) { return; }

        this.closeContextMenu();

        this.contextMenu = createElement("div",
            ["fileexplorer-context-menu"]);
        setAttr(this.contextMenu, "role", "menu");

        for (const item of this.opts.contextMenuItems)
        {
            const btn = createElement("button",
                ["fileexplorer-context-item"]);
            setAttr(btn, "type", "button");
            setAttr(btn, "role", "menuitem");
            if (item.disabled) { btn.setAttribute("disabled", ""); }

            if (item.icon)
            {
                const icon = createElement("i",
                    ["bi", item.icon, "fileexplorer-context-item-icon"]);
                setAttr(icon, "aria-hidden", "true");
                btn.appendChild(icon);
            }

            const label = createElement("span",
                ["fileexplorer-context-item-label"], item.label);
            btn.appendChild(label);

            if (item.shortcut)
            {
                const hint = createElement("span",
                    ["fileexplorer-context-item-shortcut"],
                    item.shortcut);
                btn.appendChild(hint);
            }

            btn.addEventListener("click", () =>
            {
                this.closeContextMenu();
                item.action(this.getSelectedFiles());
            });

            this.contextMenu.appendChild(btn);

            if (item.separatorAfter)
            {
                this.contextMenu.appendChild(
                    createElement("div",
                        ["fileexplorer-context-separator"]));
            }
        }

        this.contextMenu.style.left = x + "px";
        this.contextMenu.style.top = y + "px";
        this.root!.appendChild(this.contextMenu);

        // Click outside to close
        setTimeout(() =>
        {
            this.boundDocClick = (e: MouseEvent) =>
            {
                if (this.contextMenu &&
                    !this.contextMenu.contains(e.target as Node))
                {
                    this.closeContextMenu();
                }
            };
            document.addEventListener("mousedown", this.boundDocClick);
        }, 0);
    }

    private closeContextMenu(): void
    {
        if (this.contextMenu)
        {
            this.contextMenu.remove();
            this.contextMenu = null;
        }
        if (this.boundDocClick)
        {
            document.removeEventListener("mousedown", this.boundDocClick);
            this.boundDocClick = null;
        }
    }

    // ====================================================================
    // INLINE RENAME
    // ====================================================================

    private startRename(nodeId: string): void
    {
        if (!this.opts.onRename || !this.listingEl) { return; }
        const node = this.nodeMap.get(nodeId);
        if (!node) { return; }

        this.renameNodeId = nodeId;

        // Find the name element
        const row = this.listingEl.querySelector(
            `[data-id="${nodeId}"]`);
        if (!row) { return; }

        const nameEl = row.querySelector(
            ".fileexplorer-name, .fileexplorer-grid-name") as
            HTMLElement | null;
        if (!nameEl) { return; }

        const input = document.createElement("input");
        input.type = "text";
        input.classList.add("fileexplorer-rename-input");
        input.value = node.name;
        setAttr(input, "aria-label", "Rename file");

        nameEl.textContent = "";
        nameEl.appendChild(input);
        input.focus();
        input.select();

        const commit = async (): Promise<void> =>
        {
            const newName = input.value.trim();
            if (!newName || newName === node.name)
            {
                this.cancelRename(nodeId);
                return;
            }
            const ok = await this.opts.onRename!(node, newName);
            if (ok)
            {
                node.name = newName;
                this.announce("Renamed to " + newName);
            }
            this.renameNodeId = null;
            this.renderContent();
        };

        input.addEventListener("keydown", (e) =>
        {
            if (e.key === "Enter") { e.preventDefault(); commit(); }
            if (e.key === "Escape")
            {
                e.preventDefault();
                this.cancelRename(nodeId);
            }
        });
        input.addEventListener("blur", () => commit());
    }

    private cancelRename(nodeId: string): void
    {
        this.renameNodeId = null;
        this.renderContent();
    }

    // ====================================================================
    // TOOLBAR ACTIONS
    // ====================================================================

    private async handleCreateFolder(): Promise<void>
    {
        if (!this.opts.onCreateFolder) { return; }
        const folder = this.getCurrentFolder();
        const newFolder = await this.opts.onCreateFolder(
            folder, "New Folder");
        if (newFolder)
        {
            this.addFile(newFolder, folder.id);
            this.startRename(newFolder.id);
        }
    }

    private handleUpload(): void
    {
        if (!this.opts.onUpload) { return; }
        const input = document.createElement("input");
        input.type = "file";
        input.multiple = true;
        input.addEventListener("change", () =>
        {
            if (input.files && input.files.length > 0)
            {
                this.opts.onUpload!(
                    this.getCurrentFolder(), input.files);
            }
        });
        input.click();
    }

    // ====================================================================
    // EVENT LISTENERS
    // ====================================================================

    private attachListeners(): void
    {
        if (!this.listingEl) { return; }

        this.boundContentClick = (e) => this.onContentClick(e);
        this.boundContentDblClick = (e) => this.onContentDblClick(e);
        this.boundContentKeydown = (e) => this.onContentKeydown(e);
        this.boundContentContext = (e) => this.onContentContext(e);

        this.listingEl.addEventListener("click", this.boundContentClick);
        this.listingEl.addEventListener(
            "dblclick", this.boundContentDblClick);
        this.listingEl.addEventListener(
            "keydown", this.boundContentKeydown);
        this.listingEl.addEventListener(
            "contextmenu", this.boundContentContext);
    }

    private detachListeners(): void
    {
        if (this.listingEl)
        {
            if (this.boundContentClick)
            {
                this.listingEl.removeEventListener(
                    "click", this.boundContentClick);
            }
            if (this.boundContentDblClick)
            {
                this.listingEl.removeEventListener(
                    "dblclick", this.boundContentDblClick);
            }
            if (this.boundContentKeydown)
            {
                this.listingEl.removeEventListener(
                    "keydown", this.boundContentKeydown);
            }
            if (this.boundContentContext)
            {
                this.listingEl.removeEventListener(
                    "contextmenu", this.boundContentContext);
            }
        }
        this.closeContextMenu();
    }

    // ====================================================================
    // KEY BINDING HELPERS
    // ====================================================================

    private resolveKeyCombo(action: string): string
    {
        return this.opts.keyBindings?.[action]
            ?? DEFAULT_KEY_BINDINGS[action] ?? "";
    }

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

    // ====================================================================
    // EVENT HANDLERS
    // ====================================================================

    private onContentClick(e: MouseEvent): void
    {
        const target = this.findItemElement(e.target as HTMLElement);
        if (target)
        {
            const id = target.getAttribute("data-id");
            if (id) { this.handleItemClick(id, e); }
        }
        else
        {
            // Click on empty area
            this.selection.clear();
            this.updateSelectionVisuals();
            this.renderStatusLine();
            if (this.opts.onSelect)
            {
                this.opts.onSelect([]);
            }
        }
    }

    private onContentDblClick(e: MouseEvent): void
    {
        const target = this.findItemElement(e.target as HTMLElement);
        if (!target) { return; }
        const id = target.getAttribute("data-id");
        if (!id) { return; }

        const node = this.nodeMap.get(id);
        if (!node) { return; }

        if (node.type === "folder")
        {
            this.navigate(node.id);
        }
        else if (this.opts.onOpen)
        {
            this.opts.onOpen(node);
        }
    }

    private onContentKeydown(e: KeyboardEvent): void
    {
        if (this.handleKeyOpen(e)) { return; }
        if (this.handleKeyRename(e)) { return; }
        if (this.handleKeyDelete(e)) { return; }
        if (this.handleKeyEscape(e)) { return; }
        if (this.handleKeySelectAll(e)) { return; }
        if (this.handleKeyNav(e)) { return; }
        this.handleKeyBackspace(e);
    }

    private handleKeyOpen(e: KeyboardEvent): boolean
    {
        if (!this.matchesKeyCombo(e, "open")) { return false; }
        const selected = this.getSelectedFiles();
        if (selected.length !== 1) { return true; }
        const node = selected[0];
        if (node.type === "folder") { this.navigate(node.id); }
        else if (this.opts.onOpen) { this.opts.onOpen(node); }
        return true;
    }

    private handleKeyRename(e: KeyboardEvent): boolean
    {
        if (!this.matchesKeyCombo(e, "rename")) { return false; }
        e.preventDefault();
        const sel = this.getSelectedFiles();
        if (sel.length === 1) { this.startRename(sel[0].id); }
        return true;
    }

    private handleKeyDelete(e: KeyboardEvent): boolean
    {
        if (!this.matchesKeyCombo(e, "delete")) { return false; }
        const sel = this.getSelectedFiles();
        if (sel.length > 0 && this.opts.onDelete)
        {
            this.opts.onDelete(sel).then(ok =>
            {
                if (!ok) { return; }
                for (const f of sel) { this.removeFile(f.id); }
                this.announce(sel.length + " items deleted");
            });
        }
        return true;
    }

    private handleKeyEscape(e: KeyboardEvent): boolean
    {
        if (!this.matchesKeyCombo(e, "escape")) { return false; }
        if (this.renameNodeId)
        {
            this.cancelRename(this.renameNodeId);
        }
        else
        {
            this.closeContextMenu();
            this.selection.clear();
            this.updateSelectionVisuals();
            this.renderStatusLine();
        }
        return true;
    }

    private handleKeySelectAll(e: KeyboardEvent): boolean
    {
        if (!this.matchesKeyCombo(e, "selectAll")) { return false; }
        if (this.opts.selectable !== "multi") { return false; }
        e.preventDefault();
        const items = this.getCurrentChildren();
        this.selection.clear();
        for (const item of items) { this.selection.add(item.id); }
        this.updateSelectionVisuals();
        this.renderStatusLine();
        if (this.opts.onSelect)
        {
            this.opts.onSelect(this.getSelectedFiles());
        }
        return true;
    }

    private handleKeyNav(e: KeyboardEvent): boolean
    {
        if (this.matchesKeyCombo(e, "moveDown"))
        {
            e.preventDefault();
            this.navigateItemFocus(1);
            return true;
        }
        if (this.matchesKeyCombo(e, "moveUp"))
        {
            e.preventDefault();
            this.navigateItemFocus(-1);
            return true;
        }
        return false;
    }

    private handleKeyBackspace(e: KeyboardEvent): void
    {
        if (e.key !== "Backspace") { return; }
        const parentId = this.parentMap.get(this.currentFolderId);
        if (parentId)
        {
            e.preventDefault();
            this.navigate(parentId);
        }
    }

    private onContentContext(e: MouseEvent): void
    {
        e.preventDefault();
        const target = this.findItemElement(e.target as HTMLElement);
        if (target)
        {
            const id = target.getAttribute("data-id");
            if (id && !this.selection.has(id))
            {
                this.selection.clear();
                this.selection.add(id);
                this.lastClickedId = id;
                this.updateSelectionVisuals();
                this.renderStatusLine();
            }
        }

        const rect = this.root!.getBoundingClientRect();
        this.showContextMenu(
            e.clientX - rect.left, e.clientY - rect.top);
    }

    /** Find the closest item element from an event target. */
    private findItemElement(el: HTMLElement): HTMLElement | null
    {
        return el.closest(
            ".fileexplorer-grid-item, " +
            ".fileexplorer-list-row, " +
            ".fileexplorer-detail-row") as HTMLElement | null;
    }

    /** Navigate focus between items in the listing. */
    private navigateItemFocus(direction: number): void
    {
        if (!this.listingEl) { return; }
        const items = this.listingEl.querySelectorAll(
            "[data-id]");
        if (items.length === 0) { return; }

        const currentId = this.lastClickedId ||
            (this.selection.size > 0
                ? Array.from(this.selection)[0] : null);

        let idx = -1;
        if (currentId)
        {
            for (let i = 0; i < items.length; i++)
            {
                if (items[i].getAttribute("data-id") === currentId)
                {
                    idx = i;
                    break;
                }
            }
        }

        let nextIdx = idx + direction;
        if (nextIdx < 0) { nextIdx = 0; }
        if (nextIdx >= items.length) { nextIdx = items.length - 1; }

        const nextId = items[nextIdx].getAttribute("data-id");
        if (nextId)
        {
            this.selection.clear();
            this.selection.add(nextId);
            this.lastClickedId = nextId;
            this.updateSelectionVisuals();
            this.renderStatusLine();
            (items[nextIdx] as HTMLElement).scrollIntoView(
                { block: "nearest" });
            if (this.opts.onSelect)
            {
                this.opts.onSelect(this.getSelectedFiles());
            }
        }
    }

    // ====================================================================
    // HELPERS
    // ====================================================================

    private announce(msg: string): void
    {
        if (!this.liveRegion) { return; }
        this.liveRegion.textContent = "";
        requestAnimationFrame(() =>
        {
            if (this.liveRegion)
            {
                this.liveRegion.textContent = msg;
            }
        });
    }
}

// ============================================================================
// FACTORY + GLOBAL EXPORTS
// ============================================================================

/** Create and return a FileExplorer instance. */
export function createFileExplorer(
    containerId: string, options: FileExplorerOptions): FileExplorer
{
    const fe = new FileExplorer(options);
    fe.show(containerId);
    return fe;
}

(window as unknown as Record<string, unknown>)["FileExplorer"] =
    FileExplorer;
(window as unknown as Record<string, unknown>)["createFileExplorer"] =
    createFileExplorer;
