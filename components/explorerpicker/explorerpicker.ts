/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: ExplorerPicker
 * 📜 PURPOSE: Resource-selection widget with tree browsing, search, quick-access
 *    sections, and ontology-driven icon resolution. Supports single & multi
 *    selection, lazy-load, virtual scrolling, and keyboard navigation.
 * 🔗 RELATES: [[EnterpriseTheme]], [[TreeView]], [[FormDialog]]
 * ⚡ FLOW: [Consumer] -> [createExplorerPicker(opts)] -> [ExplorerPicker widget]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// DATA TYPES
// ============================================================================

/** Node types in the Explorer tree. */
export type ExplorerNodeType = "ORG_UNIT" | "FOLDER" | "ASSET_REF" | "LINK";

/** A node returned by the Explorer API. */
export interface ExplorerNode
{
    id: string;
    name: string;
    nodeType: ExplorerNodeType;
    resourceId: string | null;
    resourceType: string | null;
    sourceId: string | null;
    url: string | null;
    linkType: string | null;
    hasChildren: boolean;
    icon?: string;
    parentId: string | null;
    /** Server-provided breadcrumb (search results). */
    breadcrumb?: string;
}

/** Enriched selection returned by onConfirm / onSelectionChange. */
export interface ExplorerPickerSelection
{
    nodeId: string;
    resourceId: string | null;
    name: string;
    nodeType: ExplorerNodeType;
    resourceType: string | null;
    sourceId: string | null;
    breadcrumb: string;
    url: string | null;
}

/** Ontology type catalog entry. */
export interface OntologyTypeEntry
{
    key: string;
    icon: string;
    color?: string;
    parentTypeKey?: string | null;
    isExternal?: boolean;
}

/** Serialisable snapshot for state export / restore. */
export interface ExplorerPickerState
{
    expandedNodeIds: string[];
    selectedNodeIds: string[];
    searchQuery: string;
    scrollTop: number;
    focusedNodeId: string | null;
}

/** Configuration options for ExplorerPicker. */
export interface ExplorerPickerOptions
{
    container: HTMLElement | string;
    mode?: "single" | "multi";
    selectionTarget?: "resource" | "container" | "any";
    resourceTypeFilter?: string[];
    excludeNodeIds?: string[];
    hideSystemFolders?: boolean;
    initialExpandedNodeId?: string;
    preSelectedNodeIds?: string[];
    apiBase?: string;
    fetchFn?: typeof fetch;
    showRecentItems?: boolean;
    showStarredItems?: boolean;
    quickAccessLimit?: number;
    searchPlaceholder?: string;
    emptySearchMessage?: string;
    emptyTreeMessage?: string;
    height?: string;
    cssClass?: string;
    iconResolver?: (node: ExplorerNode) => string | undefined;
    ontologyApiBase?: string;
    ontologyFetchFn?: typeof fetch;
    ontologyTypes?: OntologyTypeEntry[];
    onConfirm: (selections: ExplorerPickerSelection[]) => void;
    onCancel?: () => void;
    onSelectionChange?: (selections: ExplorerPickerSelection[]) => void;
    onError?: (error: Error, context: string) => void;
    confirmButtonText?: string | ((count: number) => string);
    cancelButtonText?: string;
    /** Static nodes for testing without API calls. */
    staticNodes?: ExplorerNode[];
}

// ============================================================================
// LOGGING
// ============================================================================

const LOG_PREFIX = "[ExplorerPicker]";
const _lu = (typeof (window as unknown as Record<string, unknown>)["createLogUtility"] === "function")
    ? ((window as unknown as Record<string, unknown>)["createLogUtility"] as Function)().getLogger("ExplorerPicker")
    : null;
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
    _lu ? _lu.debug(...a) : console.debug(new Date().toISOString(), "[DEBUG]", LOG_PREFIX, ...a);
}

// ============================================================================
// DOM HELPERS
// ============================================================================

function createElement(
    tag: string, classes: string[], text?: string): HTMLElement
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

function setAttr(el: HTMLElement, name: string, value: string): void
{
    el.setAttribute(name, value);
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_API_BASE = "/api/v1/explorer";
const DEFAULT_ONTOLOGY_BASE = "/api/v1/ontology";
const DEFAULT_HEIGHT = "400px";
const DEFAULT_QUICK_ACCESS_LIMIT = 5;
const DEFAULT_SEARCH_DEBOUNCE = 300;
const DEFAULT_SEARCH_PAGE_SIZE = 20;
const VIRTUAL_SCROLL_THRESHOLD = 200;
const VIRTUAL_SCROLL_BUFFER = 20;
const NODE_ROW_HEIGHT = 32;

let instanceCounter = 0;

/** Legacy linkType → Bootstrap Icons fallback. */
const LINK_TYPE_ICONS: Record<string, string> =
{
    google_docs: "bi-file-earmark-text",
    sharepoint: "bi-file-earmark-richtext",
    confluence: "bi-journal-text",
    github: "bi-github",
};

// ============================================================================
// ICON RESOLUTION HELPERS
// ============================================================================

/** Get structural icon for ORG_UNIT / FOLDER nodes. */
function getStructuralIcon(
    node: ExplorerNode, expanded: boolean): string
{
    if (node.nodeType === "ORG_UNIT")
    {
        return "bi-building";
    }
    if (node.nodeType === "FOLDER")
    {
        return expanded ? "bi-folder2-open" : "bi-folder";
    }
    return "bi-file-earmark";
}

/** Clamp HSL lightness to >=60% for dark mode readability. */
function clampColorLightness(hex: string): string
{
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;

    if (l >= 0.6)
    {
        return hex;
    }
    return lightenHexTo60(r, g, b, max, min);
}

/** Convert RGB to HSL, set L=60%, convert back. */
function lightenHexTo60(
    r: number, g: number, b: number,
    max: number, min: number): string
{
    const d = max - min;
    let h = 0;
    let s = 0;
    if (d > 0)
    {
        s = d / (1 - Math.abs(2 * 0.6 - 1));
        if (max === r) { h = ((g - b) / d + 6) % 6; }
        else if (max === g) { h = (b - r) / d + 2; }
        else { h = (r - g) / d + 4; }
        h /= 6;
    }
    return hslToHex(h, Math.min(s, 1), 0.6);
}

/** HSL (0-1 range) to hex string. */
function hslToHex(h: number, s: number, l: number): string
{
    const a = s * Math.min(l, 1 - l);
    const f = (n: number): string =>
    {
        const k = (n + h * 12) % 12;
        const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * Math.max(0, Math.min(1, c)))
            .toString(16).padStart(2, "0");
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

// ============================================================================
// EXPLORER PICKER IMPLEMENTATION
// ============================================================================

export class ExplorerPickerImpl
{
    // ── Options & Identity ──────────────────────────────────────────────
    private opts: Required<Pick<ExplorerPickerOptions,
        "mode" | "selectionTarget" | "apiBase" | "height" | "showRecentItems" |
        "showStarredItems" | "quickAccessLimit" | "onConfirm">> & ExplorerPickerOptions;
    private instanceId: string;

    // ── DOM References ──────────────────────────────────────────────────
    private rootEl: HTMLElement | null = null;
    private searchInput: HTMLInputElement | null = null;
    private searchClearBtn: HTMLElement | null = null;
    private bodyEl: HTMLElement | null = null;
    private treeEl: HTMLElement | null = null;
    private recentSection: HTMLElement | null = null;
    private starredSection: HTMLElement | null = null;
    private resultsSection: HTMLElement | null = null;
    private breadcrumbEl: HTMLElement | null = null;
    private confirmBtn: HTMLButtonElement | null = null;
    private cancelBtn: HTMLButtonElement | null = null;
    private loadingEl: HTMLElement | null = null;
    private errorEl: HTMLElement | null = null;
    private liveEl: HTMLElement | null = null;
    private containerEl: HTMLElement | null = null;

    // ── State ───────────────────────────────────────────────────────────
    private nodeMap: Map<string, ExplorerNode> = new Map();
    private childrenMap: Map<string, string[]> = new Map();
    private expandedSet: Set<string> = new Set();
    private selectedSet: Set<string> = new Set();
    private loadedSet: Set<string> = new Set();
    private excludeSet: Set<string> = new Set();
    private rootNodeIds: string[] = [];
    private focusedNodeId: string | null = null;
    private searchQuery = "";
    private searchResults: ExplorerNode[] = [];
    private searchCursor: string | null = null;
    private searchGeneration = 0;
    private isSearchMode = false;
    private recentItems: ExplorerNode[] = [];
    private starredItems: ExplorerNode[] = [];
    private ontologyTypes: Map<string, OntologyTypeEntry> = new Map();
    private abortController: AbortController | null = null;
    private debounceTimer: ReturnType<typeof setTimeout> | null = null;
    private isLoadingData = false;
    private destroyed = false;
    private mounted = false;

    // ── Virtual Scroll ──────────────────────────────────────────────────
    private flatVisibleNodes: string[] = [];
    private virtualScrollActive = false;
    private scrollTop = 0;

    // ── Bound Handlers ──────────────────────────────────────────────────
    private boundKeyHandler: ((e: KeyboardEvent) => void) | null = null;

    constructor(options: ExplorerPickerOptions)
    {
        instanceCounter++;
        this.instanceId = `explorerpicker-${instanceCounter}`;
        this.opts = this.mergeDefaults(options);
        if (options.excludeNodeIds)
        {
            options.excludeNodeIds.forEach(id => this.excludeSet.add(id));
        }
        if (options.preSelectedNodeIds)
        {
            options.preSelectedNodeIds.forEach(id => this.selectedSet.add(id));
        }
        this.buildDom();
        this.resolveAndMount(options.container);
    }

    // ── Default Merging ─────────────────────────────────────────────────

    private mergeDefaults(
        opts: ExplorerPickerOptions): typeof this.opts
    {
        return {
            ...opts,
            mode: opts.mode ?? "single",
            selectionTarget: opts.selectionTarget ?? "resource",
            apiBase: opts.apiBase ?? DEFAULT_API_BASE,
            height: opts.height ?? DEFAULT_HEIGHT,
            showRecentItems: opts.showRecentItems ?? true,
            showStarredItems: opts.showStarredItems ?? true,
            quickAccessLimit: opts.quickAccessLimit ?? DEFAULT_QUICK_ACCESS_LIMIT,
            onConfirm: opts.onConfirm,
        };
    }

    // ── Container Resolution ────────────────────────────────────────────

    private resolveAndMount(container: HTMLElement | string): void
    {
        if (typeof container === "string")
        {
            const el = document.getElementById(container);
            if (!el)
            {
                logError("Container not found:", container);
                return;
            }
            this.containerEl = el;
        }
        else
        {
            this.containerEl = container;
        }
        this.show();
    }

    // ════════════════════════════════════════════════════════════════════
    // DOM BUILDING
    // ════════════════════════════════════════════════════════════════════

    private buildDom(): void
    {
        this.rootEl = createElement("div", ["explorerpicker"]);
        setAttr(this.rootEl, "role", "region");
        setAttr(this.rootEl, "aria-label", "Resource picker");
        if (this.opts.height)
        {
            this.rootEl.style.height = this.opts.height;
        }
        if (this.opts.cssClass)
        {
            this.rootEl.classList.add(...this.opts.cssClass.split(" "));
        }

        this.buildSearchBar();
        this.buildBody();
        this.buildBreadcrumb();
        this.buildFooter();
        this.buildOverlays();
    }

    private buildSearchBar(): void
    {
        const bar = createElement("div", ["explorerpicker-search"]);
        const icon = createElement("i", [
            "bi-search", "explorerpicker-search-icon"]);
        const input = document.createElement("input");
        input.type = "text";
        input.classList.add(
            "form-control", "explorerpicker-search-input");
        input.placeholder = this.getSearchPlaceholder();
        setAttr(input, "role", "searchbox");
        setAttr(input, "aria-label", "Search resources");
        this.searchInput = input;

        const clear = createElement(
            "button", ["explorerpicker-search-clear"]);
        clear.innerHTML = '<i class="bi-x-lg"></i>';
        clear.style.display = "none";
        setAttr(clear, "aria-label", "Clear search");
        this.searchClearBtn = clear;

        bar.appendChild(icon);
        bar.appendChild(input);
        bar.appendChild(clear);
        this.rootEl!.appendChild(bar);
    }

    private getSearchPlaceholder(): string
    {
        if (this.opts.searchPlaceholder)
        {
            return this.opts.searchPlaceholder;
        }
        return this.opts.selectionTarget === "container"
            ? "Search folders..." : "Search resources...";
    }

    private buildBody(): void
    {
        this.bodyEl = createElement("div", ["explorerpicker-body"]);

        this.recentSection = this.buildSection(
            "Recent", "explorerpicker-section-recent");
        this.starredSection = this.buildSection(
            "Starred", "explorerpicker-section-starred");

        const browseSection = this.buildSection(
            "Browse", "explorerpicker-section-browse");
        this.treeEl = createElement("ul", ["explorerpicker-tree"]);
        setAttr(this.treeEl, "role", "tree");
        setAttr(this.treeEl, "aria-label", "Resource tree");
        browseSection.querySelector(
            ".explorerpicker-section-items")!
            .appendChild(this.treeEl);

        this.resultsSection = this.buildSection(
            "Results", "explorerpicker-section-results");
        this.resultsSection.style.display = "none";

        this.bodyEl.appendChild(this.recentSection);
        this.bodyEl.appendChild(this.starredSection);
        this.bodyEl.appendChild(browseSection);
        this.bodyEl.appendChild(this.resultsSection);
        this.rootEl!.appendChild(this.bodyEl);
    }

    private buildSection(
        label: string, cssClass: string): HTMLElement
    {
        const section = createElement(
            "div", ["explorerpicker-section", cssClass]);
        setAttr(section, "role", "group");
        setAttr(section, "aria-label", label);
        const header = createElement(
            "div", ["explorerpicker-section-header"], label);
        const items = createElement(
            "div", ["explorerpicker-section-items"]);
        section.appendChild(header);
        section.appendChild(items);
        return section;
    }

    private buildBreadcrumb(): void
    {
        this.breadcrumbEl = createElement(
            "div", ["explorerpicker-breadcrumb"]);
        setAttr(this.breadcrumbEl, "role", "navigation");
        setAttr(this.breadcrumbEl, "aria-label", "Selection path");
        this.rootEl!.appendChild(this.breadcrumbEl);
    }

    private buildFooter(): void
    {
        const footer = createElement("div", ["explorerpicker-footer"]);
        if (this.opts.onCancel)
        {
            this.cancelBtn = document.createElement("button");
            this.cancelBtn.classList.add(
                "btn", "btn-outline-secondary",
                "explorerpicker-btn-cancel");
            this.cancelBtn.textContent =
                this.opts.cancelButtonText ?? "Cancel";
            footer.appendChild(this.cancelBtn);
        }

        this.confirmBtn = document.createElement("button");
        this.confirmBtn.classList.add(
            "btn", "btn-primary",
            "explorerpicker-btn-confirm");
        this.confirmBtn.disabled = true;
        setAttr(this.confirmBtn, "aria-disabled", "true");
        this.updateConfirmText();
        footer.appendChild(this.confirmBtn);
        this.rootEl!.appendChild(footer);
    }

    private buildOverlays(): void
    {
        this.loadingEl = createElement(
            "div", ["explorerpicker-loading"]);
        this.loadingEl.style.display = "none";
        this.buildSkeletonRows();

        this.errorEl = createElement(
            "div", ["explorerpicker-error"]);
        this.errorEl.style.display = "none";

        this.liveEl = createElement(
            "div", ["explorerpicker-live"]);
        setAttr(this.liveEl, "aria-live", "polite");
        setAttr(this.liveEl, "aria-atomic", "true");
        this.liveEl.style.position = "absolute";
        this.liveEl.style.width = "1px";
        this.liveEl.style.height = "1px";
        this.liveEl.style.overflow = "hidden";
        this.liveEl.style.clip = "rect(0,0,0,0)";

        this.rootEl!.appendChild(this.loadingEl);
        this.rootEl!.appendChild(this.errorEl);
        this.rootEl!.appendChild(this.liveEl);
    }

    private buildSkeletonRows(): void
    {
        for (let i = 0; i < 4; i++)
        {
            const row = createElement(
                "div", ["explorerpicker-skeleton-row"]);
            row.style.paddingLeft = `${16 + i * 12}px`;
            const bar = createElement(
                "div", ["explorerpicker-skeleton-bar"]);
            row.appendChild(bar);
            this.loadingEl!.appendChild(row);
        }
    }

    // ════════════════════════════════════════════════════════════════════
    // LIFECYCLE
    // ════════════════════════════════════════════════════════════════════

    /** Render into a container. */
    public show(container?: HTMLElement | string): void
    {
        if (this.destroyed)
        {
            logWarn("Cannot show destroyed picker");
            return;
        }
        const target = this.resolveContainer(container);
        if (!target)
        {
            return;
        }
        this.containerEl = target;
        target.appendChild(this.rootEl!);
        this.attachListeners();
        this.mounted = true;
        logInfo("Mounted", this.instanceId);
        this.loadInitialData();
    }

    /** Remove from DOM without destroying. */
    public hide(): void
    {
        if (this.rootEl && this.rootEl.parentElement)
        {
            this.detachListeners();
            this.rootEl.parentElement.removeChild(this.rootEl);
            this.mounted = false;
        }
    }

    /** Fully destroy the picker. */
    public destroy(): void
    {
        if (this.destroyed)
        {
            return;
        }
        this.destroyed = true;
        this.abortInflight();
        this.clearDebounce();
        this.hide();
        this.nodeMap.clear();
        this.childrenMap.clear();
        this.expandedSet.clear();
        this.selectedSet.clear();
        this.loadedSet.clear();
        this.excludeSet.clear();
        this.ontologyTypes.clear();
        this.rootNodeIds = [];
        this.searchResults = [];
        this.recentItems = [];
        this.starredItems = [];
        this.flatVisibleNodes = [];
        this.rootEl = null;
        this.searchInput = null;
        this.bodyEl = null;
        this.treeEl = null;
        this.containerEl = null;
        logInfo("Destroyed", this.instanceId);
    }

    private resolveContainer(
        container?: HTMLElement | string): HTMLElement | null
    {
        if (!container)
        {
            return this.containerEl;
        }
        if (typeof container === "string")
        {
            const el = document.getElementById(container);
            if (!el)
            {
                logError("Container not found:", container);
            }
            return el;
        }
        return container;
    }

    // ════════════════════════════════════════════════════════════════════
    // EVENT LISTENERS
    // ════════════════════════════════════════════════════════════════════

    private attachListeners(): void
    {
        this.searchInput?.addEventListener("input", this.onSearchInput);
        this.searchClearBtn?.addEventListener("click", this.onSearchClear);
        this.confirmBtn?.addEventListener("click", this.onConfirmClick);
        this.cancelBtn?.addEventListener("click", this.onCancelClick);
        this.bodyEl?.addEventListener("click", this.onBodyClick);
        this.bodyEl?.addEventListener("dblclick", this.onBodyDblClick);
        this.bodyEl?.addEventListener("scroll", this.onBodyScroll);
        this.breadcrumbEl?.addEventListener("click", this.onBreadcrumbClick);
        this.boundKeyHandler = this.onKeyDown.bind(this);
        this.rootEl?.addEventListener("keydown", this.boundKeyHandler);
    }

    private detachListeners(): void
    {
        this.searchInput?.removeEventListener("input", this.onSearchInput);
        this.searchClearBtn?.removeEventListener("click", this.onSearchClear);
        this.confirmBtn?.removeEventListener("click", this.onConfirmClick);
        this.cancelBtn?.removeEventListener("click", this.onCancelClick);
        this.bodyEl?.removeEventListener("click", this.onBodyClick);
        this.bodyEl?.removeEventListener("dblclick", this.onBodyDblClick);
        this.bodyEl?.removeEventListener("scroll", this.onBodyScroll);
        this.breadcrumbEl?.removeEventListener("click", this.onBreadcrumbClick);
        if (this.boundKeyHandler)
        {
            this.rootEl?.removeEventListener(
                "keydown", this.boundKeyHandler);
        }
    }

    // ── Search Input ────────────────────────────────────────────────────

    private onSearchInput = (): void =>
    {
        const query = this.searchInput?.value.trim() ?? "";
        this.searchQuery = query;
        this.updateSearchClearVisibility();

        if (!query)
        {
            this.exitSearchMode();
            return;
        }
        this.clearDebounce();
        this.debounceTimer = setTimeout(
            () => this.executeSearch(query), DEFAULT_SEARCH_DEBOUNCE);
    };

    private onSearchClear = (): void =>
    {
        if (this.searchInput)
        {
            this.searchInput.value = "";
        }
        this.searchQuery = "";
        this.updateSearchClearVisibility();
        this.exitSearchMode();
        this.searchInput?.focus();
    };

    private updateSearchClearVisibility(): void
    {
        if (this.searchClearBtn)
        {
            this.searchClearBtn.style.display =
                this.searchQuery ? "" : "none";
        }
    }

    // ── Body Clicks ─────────────────────────────────────────────────────

    private onBodyClick = (e: Event): void =>
    {
        this.routeBodyClick(e.target as HTMLElement);
    };

    private routeBodyClick(target: HTMLElement): void
    {
        const routes: [string, (el: HTMLElement) => void][] = [
            [".explorerpicker-toggle",
                el => this.handleToggleClick(el)],
            [".explorerpicker-node-row",
                el => this.handleNodeRowClick(el)],
            [".explorerpicker-result-item",
                el => this.handleResultClick(el)],
            [".explorerpicker-quick-item",
                el => this.handleQuickItemClick(el)],
            [".explorerpicker-load-more",
                () => this.loadMoreSearchResults()],
            [".explorerpicker-retry",
                () => this.refresh()],
            [".explorerpicker-section-header",
                el => this.toggleSectionCollapse(el)],
        ];
        for (const [sel, fn] of routes)
        {
            const el = target.closest(
                sel) as HTMLElement | null;
            if (el)
            {
                fn(el);
                return;
            }
        }
    }

    private onBodyDblClick = (e: Event): void =>
    {
        if (this.opts.mode !== "single")
        {
            return;
        }
        const target = e.target as HTMLElement;
        const nodeRow = target.closest(
            ".explorerpicker-node-row") as HTMLElement | null;
        const resultItem = target.closest(
            ".explorerpicker-result-item") as HTMLElement | null;
        const row = nodeRow ?? resultItem;
        if (!row)
        {
            return;
        }
        const nodeId = row.dataset.nodeId;
        if (!nodeId || !this.isNodeSelectable(nodeId))
        {
            return;
        }
        this.selectSingle(nodeId);
        this.fireConfirm();
    };

    private onBodyScroll = (): void =>
    {
        if (!this.virtualScrollActive || !this.bodyEl)
        {
            return;
        }
        this.scrollTop = this.bodyEl.scrollTop;
        this.renderVirtualWindow();
    };

    // ── Breadcrumb Clicks ───────────────────────────────────────────────

    private onBreadcrumbClick = (e: Event): void =>
    {
        const crumb = (e.target as HTMLElement).closest(
            ".explorerpicker-crumb") as HTMLElement | null;
        if (!crumb)
        {
            return;
        }
        const nodeId = crumb.dataset.nodeId;
        if (nodeId)
        {
            this.expandNode(nodeId);
            this.scrollToNode(nodeId);
        }
    };

    // ── Confirm / Cancel ────────────────────────────────────────────────

    private onConfirmClick = (): void =>
    {
        if (this.selectedSet.size === 0)
        {
            return;
        }
        this.fireConfirm();
    };

    private onCancelClick = (): void =>
    {
        this.opts.onCancel?.();
    };

    // ════════════════════════════════════════════════════════════════════
    // TREE CLICK HANDLERS
    // ════════════════════════════════════════════════════════════════════

    private handleToggleClick(toggle: HTMLElement): void
    {
        const nodeId = toggle.closest(
            ".explorerpicker-node")?.getAttribute("data-node-id");
        if (!nodeId)
        {
            return;
        }
        if (this.expandedSet.has(nodeId))
        {
            this.collapseNode(nodeId);
        }
        else
        {
            this.expandNode(nodeId);
        }
    }

    private handleNodeRowClick(row: HTMLElement): void
    {
        const nodeId = row.dataset.nodeId;
        if (!nodeId || !this.isNodeSelectable(nodeId))
        {
            return;
        }
        this.toggleSelection(nodeId);
        this.setFocusedNode(nodeId);
        this.updateBreadcrumb(nodeId);
    }

    private handleResultClick(item: HTMLElement): void
    {
        const nodeId = item.dataset.nodeId;
        if (!nodeId || !this.isNodeSelectable(nodeId))
        {
            return;
        }
        this.toggleSelection(nodeId);
    }

    private handleQuickItemClick(item: HTMLElement): void
    {
        const nodeId = item.dataset.nodeId;
        if (!nodeId || !this.isNodeSelectable(nodeId))
        {
            return;
        }
        this.toggleSelection(nodeId);
    }

    private toggleSectionCollapse(header: HTMLElement): void
    {
        const section = header.parentElement;
        if (!section)
        {
            return;
        }
        section.classList.toggle("explorerpicker-section-collapsed");
    }

    // ════════════════════════════════════════════════════════════════════
    // SELECTION LOGIC
    // ════════════════════════════════════════════════════════════════════

    private toggleSelection(nodeId: string): void
    {
        if (this.opts.mode === "single")
        {
            this.selectSingle(nodeId);
        }
        else
        {
            this.toggleMulti(nodeId);
        }
        this.updateConfirmState();
        this.fireSelectionChange();
        this.renderSelectionState();
    }

    private selectSingle(nodeId: string): void
    {
        if (this.selectedSet.has(nodeId) && this.selectedSet.size === 1)
        {
            this.selectedSet.clear();
        }
        else
        {
            this.selectedSet.clear();
            this.selectedSet.add(nodeId);
        }
        this.announceSelection(nodeId);
    }

    private toggleMulti(nodeId: string): void
    {
        if (this.selectedSet.has(nodeId))
        {
            this.selectedSet.delete(nodeId);
        }
        else
        {
            this.selectedSet.add(nodeId);
        }
        this.announceSelection(nodeId);
    }

    private isNodeSelectable(nodeId: string): boolean
    {
        if (this.excludeSet.has(nodeId))
        {
            return false;
        }
        const node = this.nodeMap.get(nodeId);
        if (!node)
        {
            return false;
        }
        return this.isTypeSelectable(node);
    }

    private isTypeSelectable(node: ExplorerNode): boolean
    {
        const target = this.opts.selectionTarget;
        if (target === "any")
        {
            return true;
        }
        if (target === "container")
        {
            return node.nodeType === "ORG_UNIT" ||
                   node.nodeType === "FOLDER";
        }
        return node.nodeType === "ASSET_REF" ||
               node.nodeType === "LINK";
    }

    /**
     * Whether a node should appear visually dimmed.
     * Excluded nodes are always dimmed. In container mode, assets
     * are dimmed. Structural containers (ORG_UNIT/FOLDER) are
     * never dimmed in resource mode — they serve as navigation.
     */
    private shouldDimNode(node: ExplorerNode): boolean
    {
        if (this.excludeSet.has(node.id))
        {
            return true;
        }
        const target = this.opts.selectionTarget;
        if (target === "any")
        {
            return false;
        }
        if (target === "container")
        {
            return node.nodeType === "ASSET_REF" ||
                   node.nodeType === "LINK";
        }
        // resource mode: containers are NOT dimmed (navigation)
        return false;
    }

    private updateConfirmState(): void
    {
        if (!this.confirmBtn)
        {
            return;
        }
        const hasSelection = this.selectedSet.size > 0;
        this.confirmBtn.disabled = !hasSelection;
        setAttr(this.confirmBtn, "aria-disabled",
            hasSelection ? "false" : "true");
        this.updateConfirmText();
    }

    private updateConfirmText(): void
    {
        if (!this.confirmBtn)
        {
            return;
        }
        const count = this.selectedSet.size;
        if (typeof this.opts.confirmButtonText === "function")
        {
            this.confirmBtn.textContent =
                this.opts.confirmButtonText(count);
            return;
        }
        if (typeof this.opts.confirmButtonText === "string")
        {
            this.confirmBtn.textContent = this.opts.confirmButtonText;
            return;
        }
        this.confirmBtn.textContent = this.getDefaultConfirmText(count);
    }

    private getDefaultConfirmText(count: number): string
    {
        if (this.opts.selectionTarget === "container")
        {
            return "Select Folder";
        }
        return count > 0
            ? `Select (${count} selected)` : "Select";
    }

    private renderSelectionState(): void
    {
        if (!this.rootEl)
        {
            return;
        }
        const rows = this.rootEl.querySelectorAll(
            "[data-node-id]");
        rows.forEach(row =>
        {
            const id = (row as HTMLElement).dataset.nodeId!;
            const selected = this.selectedSet.has(id);
            row.classList.toggle(
                "explorerpicker-node-row-selected", selected);
            this.updateCheckbox(row as HTMLElement, selected);
            this.updateAriaSelected(row as HTMLElement, selected);
        });
    }

    private updateCheckbox(
        row: HTMLElement, checked: boolean): void
    {
        const cb = row.querySelector(
            ".explorerpicker-checkbox");
        if (cb)
        {
            cb.classList.toggle(
                "explorerpicker-checkbox-checked", checked);
        }
    }

    private updateAriaSelected(
        el: HTMLElement, selected: boolean): void
    {
        const attr = this.opts.mode === "multi"
            ? "aria-checked" : "aria-selected";
        el.setAttribute(attr, String(selected));
    }

    // ════════════════════════════════════════════════════════════════════
    // API DATA LAYER
    // ════════════════════════════════════════════════════════════════════

    private async loadInitialData(): Promise<void>
    {
        if (this.opts.staticNodes)
        {
            this.loadPresetOntology();
            this.populateFromNodes(this.opts.staticNodes);
            this.renderTree();
            this.updateConfirmState();
            return;
        }
        await this.loadFromApi();
    }

    private async loadFromApi(): Promise<void>
    {
        this.showLoading(true);
        this.abortInflight();
        this.abortController = new AbortController();
        try
        {
            await Promise.all([
                this.fetchTree(),
                this.fetchOntology(),
                this.fetchQuickAccess(),
            ]);
            this.renderTree();
            this.renderQuickAccess();
            if (this.opts.initialExpandedNodeId)
            {
                await this.expandToNode(
                    this.opts.initialExpandedNodeId);
            }
            this.updateConfirmState();
        }
        catch (err)
        {
            this.handleLoadError(err);
        }
        finally
        {
            this.showLoading(false);
        }
    }

    private handleLoadError(err: unknown): void
    {
        if (!this.isAbortError(err))
        {
            this.showError(
                "Unable to load resources.", "loadInitialData");
            if (err instanceof Error)
            {
                this.opts.onError?.(err, "loadInitialData");
            }
        }
    }

    private async fetchTree(): Promise<void>
    {
        const params = this.buildFilterParams();
        const url = `${this.opts.apiBase}/tree${params}`;
        const data = await this.apiFetch<ExplorerNode[]>(url);
        if (data)
        {
            this.populateFromNodes(data);
        }
    }

    private async fetchChildren(nodeId: string): Promise<void>
    {
        if (this.loadedSet.has(nodeId))
        {
            return;
        }
        const params = this.buildFilterParams();
        const url = `${this.opts.apiBase}/nodes/${nodeId}/children${params}`;
        const data = await this.apiFetch<ExplorerNode[]>(url);
        if (data)
        {
            this.addChildNodes(nodeId, data);
            this.loadedSet.add(nodeId);
        }
    }

    /** Load ontology types from options (sync, no API call). */
    private loadPresetOntology(): void
    {
        if (this.opts.ontologyTypes)
        {
            this.opts.ontologyTypes.forEach(
                t => this.ontologyTypes.set(t.key, t));
        }
    }

    private async fetchOntology(): Promise<void>
    {
        if (this.opts.ontologyTypes)
        {
            this.opts.ontologyTypes.forEach(
                t => this.ontologyTypes.set(t.key, t));
            return;
        }
        await this.fetchOntologyFromApi();
    }

    private async fetchOntologyFromApi(): Promise<void>
    {
        try
        {
            const base = this.opts.ontologyApiBase
                ?? DEFAULT_ONTOLOGY_BASE;
            const fetchFn = this.opts.ontologyFetchFn
                ?? this.getFetchFn();
            const resp = await fetchFn(`${base}/schema/types`, {
                signal: this.abortController?.signal,
            });
            if (!resp.ok)
            {
                logWarn("Ontology fetch failed:", resp.status);
                return;
            }
            const data = await resp.json() as OntologyTypeEntry[];
            data.forEach(t => this.ontologyTypes.set(t.key, t));
        }
        catch (err)
        {
            if (!this.isAbortError(err))
            {
                logWarn("Ontology fetch failed, using fallbacks");
            }
        }
    }

    private async fetchQuickAccess(): Promise<void>
    {
        const promises: Promise<void>[] = [];
        if (this.opts.showRecentItems)
        {
            promises.push(this.fetchRecent());
        }
        if (this.opts.showStarredItems)
        {
            promises.push(this.fetchStarred());
        }
        await Promise.all(promises);
    }

    private async fetchRecent(): Promise<void>
    {
        try
        {
            const data = await this.apiFetch<ExplorerNode[]>(
                `${this.opts.apiBase}/recent`);
            if (data)
            {
                this.recentItems = data.slice(
                    0, this.opts.quickAccessLimit);
                data.forEach(n => this.nodeMap.set(n.id, n));
            }
        }
        catch (err)
        {
            logDebug("Recent items fetch failed");
        }
    }

    private async fetchStarred(): Promise<void>
    {
        try
        {
            const data = await this.apiFetch<ExplorerNode[]>(
                `${this.opts.apiBase}/starred`);
            if (data)
            {
                this.starredItems = data.slice(
                    0, this.opts.quickAccessLimit);
                data.forEach(n => this.nodeMap.set(n.id, n));
            }
        }
        catch (err)
        {
            logDebug("Starred items fetch failed");
        }
    }

    private async apiFetch<T>(url: string): Promise<T | null>
    {
        const fetchFn = this.getFetchFn();
        const resp = await fetchFn(url, {
            signal: this.abortController?.signal,
        });
        if (!resp.ok)
        {
            throw new Error(
                `API error ${resp.status}: ${url}`);
        }
        return resp.json() as Promise<T>;
    }

    private getFetchFn(): typeof fetch
    {
        return this.opts.fetchFn ?? window.fetch.bind(window);
    }

    private buildFilterParams(): string
    {
        if (!this.opts.resourceTypeFilter?.length)
        {
            return "";
        }
        return `?assetTypes=${encodeURIComponent(
            this.opts.resourceTypeFilter.join(","))}`;
    }

    private abortInflight(): void
    {
        if (this.abortController)
        {
            this.abortController.abort();
            this.abortController = null;
        }
    }

    private isAbortError(err: unknown): boolean
    {
        return err instanceof DOMException &&
               err.name === "AbortError";
    }

    // ── Data Population ─────────────────────────────────────────────────

    private populateFromNodes(nodes: ExplorerNode[]): void
    {
        this.rootNodeIds = [];
        nodes.forEach(node =>
        {
            this.nodeMap.set(node.id, node);
            if (!node.parentId)
            {
                this.rootNodeIds.push(node.id);
            }
            else
            {
                this.addToChildrenMap(node.parentId, node.id);
            }
        });
    }

    private addChildNodes(
        parentId: string, children: ExplorerNode[]): void
    {
        const childIds: string[] = [];
        children.forEach(child =>
        {
            this.nodeMap.set(child.id, child);
            childIds.push(child.id);
        });
        this.childrenMap.set(parentId, childIds);
    }

    private addToChildrenMap(
        parentId: string, childId: string): void
    {
        const existing = this.childrenMap.get(parentId) ?? [];
        if (!existing.includes(childId))
        {
            existing.push(childId);
        }
        this.childrenMap.set(parentId, existing);
    }

    // ════════════════════════════════════════════════════════════════════
    // TREE RENDERING
    // ════════════════════════════════════════════════════════════════════

    private renderTree(): void
    {
        if (!this.treeEl)
        {
            return;
        }
        this.treeEl.innerHTML = "";

        if (this.rootNodeIds.length === 0)
        {
            this.renderEmptyTree();
            return;
        }

        this.computeFlatVisibleNodes();
        if (this.flatVisibleNodes.length > VIRTUAL_SCROLL_THRESHOLD)
        {
            this.activateVirtualScroll();
        }
        else
        {
            this.deactivateVirtualScroll();
            this.renderAllNodes();
        }
    }

    private renderAllNodes(): void
    {
        this.rootNodeIds.forEach((id, idx) =>
        {
            const li = this.buildNodeElement(id, 1, idx,
                this.rootNodeIds.length);
            this.treeEl!.appendChild(li);
        });
    }

    private buildNodeElement(
        nodeId: string, level: number,
        posInSet: number, setSize: number): HTMLElement
    {
        const node = this.nodeMap.get(nodeId)!;
        const li = createElement("li", ["explorerpicker-node"]);
        setAttr(li, "role", "treeitem");
        setAttr(li, "data-node-id", nodeId);
        setAttr(li, "aria-level", String(level));
        setAttr(li, "aria-setsize", String(setSize));
        setAttr(li, "aria-posinset", String(posInSet + 1));

        const expanded = this.expandedSet.has(nodeId);
        if (node.hasChildren)
        {
            setAttr(li, "aria-expanded", String(expanded));
        }

        const row = this.buildNodeRow(node, level, expanded);
        li.appendChild(row);

        if (expanded && node.hasChildren)
        {
            const childUl = this.buildChildList(
                nodeId, level + 1);
            li.appendChild(childUl);
        }
        return li;
    }

    private buildNodeRow(
        node: ExplorerNode, level: number,
        expanded: boolean): HTMLElement
    {
        const row = createElement("div", ["explorerpicker-node-row"]);
        setAttr(row, "data-node-id", node.id);
        row.style.paddingLeft = `${(level - 1) * 20 + 8}px`;

        this.applyRowState(row, node);
        this.appendToggle(row, node, expanded);
        this.appendCheckbox(row, node);
        this.appendIcon(row, node, expanded);
        this.appendLabel(row, node);
        this.appendTypeBadge(row, node);
        this.setupRowTabindex(row, node.id);

        return row;
    }

    private applyRowState(
        row: HTMLElement, node: ExplorerNode): void
    {
        if (this.selectedSet.has(node.id))
        {
            row.classList.add("explorerpicker-node-row-selected");
        }
        if (this.shouldDimNode(node))
        {
            row.classList.add("explorerpicker-node-row-dimmed");
        }
        if (this.excludeSet.has(node.id))
        {
            setAttr(row, "title", "Cannot link to itself");
        }
        if (this.focusedNodeId === node.id)
        {
            row.classList.add("explorerpicker-node-row-focused");
        }
    }

    private appendToggle(
        row: HTMLElement, node: ExplorerNode,
        expanded: boolean): void
    {
        const toggle = createElement(
            "button", ["explorerpicker-toggle"]);
        setAttr(toggle, "aria-label",
            expanded ? "Collapse" : "Expand");
        setAttr(toggle, "tabindex", "-1");
        if (node.hasChildren)
        {
            toggle.innerHTML = expanded
                ? '<i class="bi-chevron-down"></i>'
                : '<i class="bi-chevron-right"></i>';
        }
        else
        {
            toggle.style.visibility = "hidden";
        }
        row.appendChild(toggle);
    }

    private appendCheckbox(
        row: HTMLElement, node: ExplorerNode): void
    {
        if (this.opts.mode !== "multi")
        {
            return;
        }
        const cb = createElement(
            "span", ["explorerpicker-checkbox"]);
        if (this.selectedSet.has(node.id))
        {
            cb.classList.add("explorerpicker-checkbox-checked");
        }
        const attr = "aria-checked";
        setAttr(row, attr,
            String(this.selectedSet.has(node.id)));
        row.appendChild(cb);
    }

    private appendIcon(
        row: HTMLElement, node: ExplorerNode,
        expanded: boolean): void
    {
        const iconClass = this.resolveIcon(node, expanded);
        const iconEl = createElement(
            "i", [iconClass, "explorerpicker-icon"]);
        const color = this.resolveIconColor(node);
        if (color)
        {
            iconEl.style.color = color;
        }
        row.appendChild(iconEl);

        if (this.isExternalType(node))
        {
            const badge = createElement(
                "span", ["explorerpicker-external-badge"]);
            badge.innerHTML = '<i class="bi-box-arrow-up-right"></i>';
            row.appendChild(badge);
        }
    }

    private appendLabel(
        row: HTMLElement, node: ExplorerNode): void
    {
        const label = createElement(
            "span", ["explorerpicker-label"], node.name);
        row.appendChild(label);
    }

    private appendTypeBadge(
        row: HTMLElement, node: ExplorerNode): void
    {
        if (!node.resourceType)
        {
            return;
        }
        const badge = createElement(
            "span", ["explorerpicker-type-badge"],
            node.resourceType);
        row.appendChild(badge);
    }

    private setupRowTabindex(
        row: HTMLElement, nodeId: string): void
    {
        const isFocused = this.focusedNodeId === nodeId;
        setAttr(row, "tabindex", isFocused ? "0" : "-1");
    }

    private buildChildList(
        parentId: string, level: number): HTMLElement
    {
        const ul = createElement(
            "ul", ["explorerpicker-children"]);
        setAttr(ul, "role", "group");
        const children = this.childrenMap.get(parentId) ?? [];
        children.forEach((childId, idx) =>
        {
            const li = this.buildNodeElement(
                childId, level, idx, children.length);
            ul.appendChild(li);
        });
        return ul;
    }

    private renderEmptyTree(): void
    {
        const msg = this.opts.emptyTreeMessage ?? "No resources found.";
        const empty = createElement(
            "div", ["explorerpicker-empty"], msg);
        this.treeEl!.appendChild(
            createElement("li", [])
        ).appendChild(empty);
    }

    // ════════════════════════════════════════════════════════════════════
    // ICON RESOLUTION (§5.3.4)
    // ════════════════════════════════════════════════════════════════════

    private resolveIcon(
        node: ExplorerNode, expanded: boolean): string
    {
        if (node.nodeType === "ORG_UNIT" || node.nodeType === "FOLDER")
        {
            return getStructuralIcon(node, expanded);
        }
        return this.resolveAssetIcon(node);
    }

    private resolveAssetIcon(node: ExplorerNode): string
    {
        if (this.opts.iconResolver)
        {
            const custom = this.opts.iconResolver(node);
            if (custom)
            {
                return custom;
            }
        }
        if (node.icon)
        {
            return node.icon;
        }
        if (node.resourceType)
        {
            const entry = this.ontologyTypes.get(node.resourceType);
            if (entry)
            {
                return entry.icon;
            }
        }
        if (node.linkType && LINK_TYPE_ICONS[node.linkType])
        {
            return LINK_TYPE_ICONS[node.linkType];
        }
        return node.nodeType === "LINK"
            ? "bi-link-45deg" : "bi-file-earmark";
    }

    private resolveIconColor(node: ExplorerNode): string | null
    {
        if (node.nodeType === "ORG_UNIT" || node.nodeType === "FOLDER")
        {
            return null;
        }
        if (!node.resourceType)
        {
            return null;
        }
        const entry = this.ontologyTypes.get(node.resourceType);
        if (!entry?.color)
        {
            return null;
        }
        return this.applyDarkModeColorFix(entry.color);
    }

    private applyDarkModeColorFix(hex: string): string
    {
        const isDark = document.documentElement.getAttribute(
            "data-bs-theme") === "dark";
        if (isDark && hex.startsWith("#") && hex.length === 7)
        {
            return clampColorLightness(hex);
        }
        return hex;
    }

    private isExternalType(node: ExplorerNode): boolean
    {
        if (!node.resourceType)
        {
            return false;
        }
        const entry = this.ontologyTypes.get(node.resourceType);
        return entry?.isExternal === true;
    }

    /** Check if node's resourceType matches filter (with hierarchy). */
    private matchesTypeFilter(node: ExplorerNode): boolean
    {
        const filter = this.opts.resourceTypeFilter;
        if (!filter?.length)
        {
            return true;
        }
        if (node.nodeType === "ORG_UNIT" || node.nodeType === "FOLDER")
        {
            return true;
        }
        if (!node.resourceType)
        {
            return false;
        }
        if (filter.includes(node.resourceType))
        {
            return true;
        }
        return this.matchesTypeHierarchy(node.resourceType, filter);
    }

    private matchesTypeHierarchy(
        typeKey: string, filter: string[]): boolean
    {
        let current = typeKey;
        const visited = new Set<string>();
        while (current)
        {
            if (visited.has(current))
            {
                break;
            }
            visited.add(current);
            const entry = this.ontologyTypes.get(current);
            if (!entry?.parentTypeKey)
            {
                break;
            }
            if (filter.includes(entry.parentTypeKey))
            {
                return true;
            }
            current = entry.parentTypeKey;
        }
        return false;
    }

    // ════════════════════════════════════════════════════════════════════
    // SEARCH
    // ════════════════════════════════════════════════════════════════════

    private async executeSearch(query: string): Promise<void>
    {
        this.searchGeneration++;
        const gen = this.searchGeneration;
        this.searchResults = [];
        this.searchCursor = null;
        this.enterSearchMode();
        this.showSearchSpinner(true);
        try
        {
            const data = await this.fetchSearchResults(
                query, null);
            if (gen === this.searchGeneration)
            {
                this.applySearchData(data, query);
            }
        }
        catch (err)
        {
            if (!this.isAbortError(err) &&
                gen === this.searchGeneration)
            {
                this.showSearchError(query);
            }
        }
        finally
        {
            this.showSearchSpinner(false);
        }
    }

    private applySearchData(
        data: { results: ExplorerNode[];
            cursor: string | null } | null,
        query: string): void
    {
        if (data)
        {
            this.searchResults = data.results;
            this.searchCursor = data.cursor;
            data.results.forEach(
                n => this.nodeMap.set(n.id, n));
        }
        this.renderSearchResults(query);
        this.announceSearchResults(query);
    }

    private async fetchSearchResults(
        query: string,
        cursor: string | null): Promise<{
            results: ExplorerNode[];
            cursor: string | null;
        } | null>
    {
        let url = `${this.opts.apiBase}/search?q=${
            encodeURIComponent(query)}&pageSize=${
            DEFAULT_SEARCH_PAGE_SIZE}`;
        if (cursor)
        {
            url += `&cursor=${encodeURIComponent(cursor)}`;
        }
        if (this.opts.resourceTypeFilter?.length)
        {
            url += `&types=${encodeURIComponent(
                this.opts.resourceTypeFilter.join(","))}`;
        }
        const fetchFn = this.getFetchFn();
        const resp = await fetchFn(url, {
            signal: this.abortController?.signal,
        });
        if (!resp.ok)
        {
            throw new Error(`Search failed: ${resp.status}`);
        }
        return resp.json();
    }

    private async loadMoreSearchResults(): Promise<void>
    {
        if (!this.searchCursor)
        {
            return;
        }
        const gen = this.searchGeneration;
        try
        {
            const data = await this.fetchSearchResults(
                this.searchQuery, this.searchCursor);
            if (gen !== this.searchGeneration || !data)
            {
                return;
            }
            this.searchResults.push(...data.results);
            this.searchCursor = data.cursor;
            data.results.forEach(
                n => this.nodeMap.set(n.id, n));
            this.renderSearchResults(this.searchQuery);
        }
        catch (err)
        {
            logError("Load more failed:", err);
        }
    }

    private enterSearchMode(): void
    {
        this.isSearchMode = true;
        this.showBrowseSections(false);
        if (this.resultsSection)
        {
            this.resultsSection.style.display = "";
        }
    }

    private exitSearchMode(): void
    {
        this.isSearchMode = false;
        this.searchResults = [];
        this.searchCursor = null;
        this.showBrowseSections(true);
        if (this.resultsSection)
        {
            this.resultsSection.style.display = "none";
        }
        this.renderTree();
    }

    private showBrowseSections(visible: boolean): void
    {
        const display = visible ? "" : "none";
        if (this.recentSection)
        {
            this.recentSection.style.display = display;
        }
        if (this.starredSection)
        {
            this.starredSection.style.display = display;
        }
        const browse = this.rootEl?.querySelector(
            ".explorerpicker-section-browse") as HTMLElement;
        if (browse)
        {
            browse.style.display = display;
        }
    }

    private renderSearchResults(query: string): void
    {
        if (!this.resultsSection)
        {
            return;
        }
        const items = this.resultsSection.querySelector(
            ".explorerpicker-section-items")!;
        items.innerHTML = "";
        this.updateResultsHeader();
        if (this.searchResults.length === 0)
        {
            this.renderEmptySearch(items as HTMLElement);
            return;
        }
        this.appendResultsList(items as HTMLElement, query);
    }

    private updateResultsHeader(): void
    {
        if (!this.resultsSection)
        {
            return;
        }
        const header = this.resultsSection.querySelector(
            ".explorerpicker-section-header");
        if (header)
        {
            header.textContent =
                `Results (${this.searchResults.length})`;
        }
    }

    private appendResultsList(
        container: HTMLElement, query: string): void
    {
        const listEl = createElement(
            "div", ["explorerpicker-results"]);
        setAttr(listEl, "role", "listbox");
        setAttr(listEl, "aria-label", "Search results");
        this.searchResults.forEach(node =>
        {
            const item = this.buildResultItem(node, query);
            listEl.appendChild(item);
        });
        container.appendChild(listEl);
        if (this.searchCursor)
        {
            this.appendLoadMore(container);
        }
    }

    private buildResultItem(
        node: ExplorerNode, query: string): HTMLElement
    {
        const item = createElement(
            "div", ["explorerpicker-result-item"]);
        setAttr(item, "role", "option");
        setAttr(item, "data-node-id", node.id);
        setAttr(item, "tabindex", "-1");

        const selected = this.selectedSet.has(node.id);
        if (selected)
        {
            item.classList.add("explorerpicker-node-row-selected");
        }
        setAttr(item, "aria-selected", String(selected));

        if (!this.isNodeSelectable(node.id))
        {
            item.classList.add("explorerpicker-node-row-dimmed");
        }

        this.appendResultCheckbox(item, node);
        this.appendResultIcon(item, node);
        this.appendResultLabel(item, node, query);
        this.appendResultPath(item, node);
        return item;
    }

    private appendResultCheckbox(
        item: HTMLElement, node: ExplorerNode): void
    {
        if (this.opts.mode !== "multi")
        {
            return;
        }
        const cb = createElement(
            "span", ["explorerpicker-checkbox"]);
        if (this.selectedSet.has(node.id))
        {
            cb.classList.add("explorerpicker-checkbox-checked");
        }
        item.appendChild(cb);
    }

    private appendResultIcon(
        item: HTMLElement, node: ExplorerNode): void
    {
        const iconClass = this.resolveAssetIcon(node);
        const iconEl = createElement(
            "i", [iconClass, "explorerpicker-icon"]);
        const color = this.resolveIconColor(node);
        if (color)
        {
            iconEl.style.color = color;
        }
        item.appendChild(iconEl);
    }

    private appendResultLabel(
        item: HTMLElement, node: ExplorerNode,
        query: string): void
    {
        const label = createElement(
            "span", ["explorerpicker-label"]);
        label.innerHTML = this.highlightMatch(node.name, query);
        item.appendChild(label);
    }

    private appendResultPath(
        item: HTMLElement, node: ExplorerNode): void
    {
        const path = node.breadcrumb ?? node.resourceType ?? "";
        if (path)
        {
            const pathEl = createElement(
                "span", ["explorerpicker-result-path"], path);
            item.appendChild(pathEl);
        }
    }

    private highlightMatch(text: string, query: string): string
    {
        if (!query)
        {
            return this.escapeHtml(text);
        }
        const escaped = this.escapeHtml(text);
        const pattern = new RegExp(
            `(${this.escapeRegex(query)})`, "gi");
        return escaped.replace(pattern,
            '<mark class="explorerpicker-highlight">$1</mark>');
    }

    private escapeHtml(text: string): string
    {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    private escapeRegex(text: string): string
    {
        return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    private renderEmptySearch(container: HTMLElement): void
    {
        const msg = this.opts.emptySearchMessage ??
            "No results found.";
        const empty = createElement(
            "div", ["explorerpicker-empty"]);
        const icon = createElement(
            "i", ["bi-search", "explorerpicker-empty-icon"]);
        const text = createElement(
            "span", [], msg);
        empty.appendChild(icon);
        empty.appendChild(text);
        container.appendChild(empty);
    }

    private appendLoadMore(container: HTMLElement): void
    {
        const link = createElement(
            "button", ["explorerpicker-load-more"],
            "Load more results");
        setAttr(link, "type", "button");
        container.appendChild(link);
    }

    private showSearchSpinner(show: boolean): void
    {
        if (!this.searchClearBtn)
        {
            return;
        }
        if (show)
        {
            this.searchClearBtn.innerHTML =
                '<span class="spinner-border spinner-border-sm"></span>';
            this.searchClearBtn.style.display = "";
        }
        else
        {
            this.searchClearBtn.innerHTML =
                '<i class="bi-x-lg"></i>';
            this.updateSearchClearVisibility();
        }
    }

    private showSearchError(query: string): void
    {
        if (!this.resultsSection)
        {
            return;
        }
        const items = this.resultsSection.querySelector(
            ".explorerpicker-section-items")!;
        items.innerHTML = "";
        const err = createElement(
            "div", ["explorerpicker-error-inline"],
            `Search failed for "${query}". `);
        const retry = createElement(
            "button", ["explorerpicker-retry"], "Retry");
        setAttr(retry, "type", "button");
        retry.addEventListener("click", () =>
        {
            this.executeSearch(query);
        });
        err.appendChild(retry);
        items.appendChild(err);
    }

    // ════════════════════════════════════════════════════════════════════
    // QUICK-ACCESS RENDERING
    // ════════════════════════════════════════════════════════════════════

    private renderQuickAccess(): void
    {
        this.renderQuickAccessSection(
            this.recentSection, this.recentItems, false);
        this.renderQuickAccessSection(
            this.starredSection, this.starredItems, true);
        this.hideEmptyQuickAccess();
    }

    private renderQuickAccessSection(
        section: HTMLElement | null,
        items: ExplorerNode[],
        isStarred: boolean): void
    {
        if (!section)
        {
            return;
        }
        const container = section.querySelector(
            ".explorerpicker-section-items")!;
        container.innerHTML = "";
        items.forEach(node =>
        {
            const row = this.buildQuickItem(node, isStarred);
            container.appendChild(row);
        });
    }

    private buildQuickItem(
        node: ExplorerNode, isStarred: boolean): HTMLElement
    {
        const row = createElement(
            "div", ["explorerpicker-quick-item"]);
        setAttr(row, "data-node-id", node.id);

        if (isStarred)
        {
            const star = createElement(
                "i", ["bi-star-fill",
                    "explorerpicker-quick-item-star"]);
            row.appendChild(star);
        }

        const iconClass = this.resolveIcon(node, false);
        const iconEl = createElement(
            "i", [iconClass, "explorerpicker-quick-item-icon"]);
        row.appendChild(iconEl);

        const name = createElement(
            "span", ["explorerpicker-quick-item-name"],
            node.name);
        row.appendChild(name);

        if (node.resourceType)
        {
            const badge = createElement(
                "span", ["explorerpicker-quick-item-type"],
                node.resourceType);
            row.appendChild(badge);
        }
        return row;
    }

    private hideEmptyQuickAccess(): void
    {
        if (this.recentSection && this.recentItems.length === 0)
        {
            this.recentSection.style.display = "none";
        }
        if (this.starredSection && this.starredItems.length === 0)
        {
            this.starredSection.style.display = "none";
        }
        if (!this.opts.showRecentItems && this.recentSection)
        {
            this.recentSection.style.display = "none";
        }
        if (!this.opts.showStarredItems && this.starredSection)
        {
            this.starredSection.style.display = "none";
        }
    }

    // ════════════════════════════════════════════════════════════════════
    // BREADCRUMB
    // ════════════════════════════════════════════════════════════════════

    private updateBreadcrumb(nodeId: string): void
    {
        if (!this.breadcrumbEl)
        {
            return;
        }
        this.breadcrumbEl.innerHTML = "";
        const chain = this.getAncestorChain(nodeId);
        chain.forEach((id, idx) =>
        {
            if (idx > 0)
            {
                const sep = createElement(
                    "span", ["explorerpicker-crumb-separator"],
                    " > ");
                this.breadcrumbEl!.appendChild(sep);
            }
            const node = this.nodeMap.get(id);
            const crumb = createElement(
                "span", ["explorerpicker-crumb"],
                node?.name ?? id);
            setAttr(crumb, "data-node-id", id);
            this.breadcrumbEl!.appendChild(crumb);
        });
    }

    private getAncestorChain(nodeId: string): string[]
    {
        const chain: string[] = [];
        let current: string | null = nodeId;
        const visited = new Set<string>();
        while (current && !visited.has(current))
        {
            visited.add(current);
            chain.unshift(current);
            const node = this.nodeMap.get(current);
            current = node?.parentId ?? null;
        }
        return chain;
    }

    /** Build breadcrumb string for a node. */
    private computeBreadcrumb(nodeId: string): string
    {
        const chain = this.getAncestorChain(nodeId);
        return chain
            .map(id => this.nodeMap.get(id)?.name ?? id)
            .join(" > ");
    }

    // ════════════════════════════════════════════════════════════════════
    // EXPAND / COLLAPSE
    // ════════════════════════════════════════════════════════════════════

    public async expandNode(nodeId: string): Promise<void>
    {
        if (this.expandedSet.has(nodeId))
        {
            return;
        }
        const node = this.nodeMap.get(nodeId);
        if (!node?.hasChildren)
        {
            return;
        }

        this.expandedSet.add(nodeId);

        if (!this.loadedSet.has(nodeId))
        {
            this.showNodeSpinner(nodeId, true);
            try
            {
                await this.fetchChildren(nodeId);
            }
            catch (err)
            {
                this.expandedSet.delete(nodeId);
                logError("Expand failed:", nodeId, err);
                return;
            }
            finally
            {
                this.showNodeSpinner(nodeId, false);
            }
        }

        this.renderTree();
        const children = this.childrenMap.get(nodeId) ?? [];
        this.announce(
            `${node.name} expanded, ${children.length} children.`);
    }

    public collapseNode(nodeId: string): void
    {
        if (!this.expandedSet.has(nodeId))
        {
            return;
        }
        this.expandedSet.delete(nodeId);
        this.renderTree();
        const node = this.nodeMap.get(nodeId);
        this.announce(`${node?.name ?? nodeId} collapsed.`);
    }

    private async expandToNode(nodeId: string): Promise<void>
    {
        const chain = this.getAncestorChain(nodeId);
        for (const id of chain)
        {
            if (id !== nodeId)
            {
                await this.expandNode(id);
            }
        }
        this.scrollToNode(nodeId);
    }

    private showNodeSpinner(
        nodeId: string, show: boolean): void
    {
        const toggle = this.rootEl?.querySelector(
            `[data-node-id="${nodeId}"] .explorerpicker-toggle`
        );
        if (!toggle)
        {
            return;
        }
        if (show)
        {
            toggle.innerHTML =
                '<span class="spinner-border spinner-border-sm"></span>';
            toggle.classList.add("explorerpicker-toggle-loading");
        }
        else
        {
            toggle.innerHTML = '<i class="bi-chevron-down"></i>';
            toggle.classList.remove("explorerpicker-toggle-loading");
        }
    }

    // ════════════════════════════════════════════════════════════════════
    // VIRTUAL SCROLLING
    // ════════════════════════════════════════════════════════════════════

    private computeFlatVisibleNodes(): void
    {
        this.flatVisibleNodes = [];
        this.walkFlatNodes(this.rootNodeIds);
    }

    private walkFlatNodes(nodeIds: string[]): void
    {
        for (const id of nodeIds)
        {
            this.flatVisibleNodes.push(id);
            if (this.expandedSet.has(id))
            {
                const children =
                    this.childrenMap.get(id) ?? [];
                this.walkFlatNodes(children);
            }
        }
    }

    private activateVirtualScroll(): void
    {
        this.virtualScrollActive = true;
        if (!this.treeEl)
        {
            return;
        }
        const totalHeight =
            this.flatVisibleNodes.length * NODE_ROW_HEIGHT;
        this.treeEl.style.height = `${totalHeight}px`;
        this.treeEl.style.position = "relative";
        this.renderVirtualWindow();
    }

    private deactivateVirtualScroll(): void
    {
        this.virtualScrollActive = false;
        if (this.treeEl)
        {
            this.treeEl.style.height = "";
            this.treeEl.style.position = "";
        }
    }

    private renderVirtualWindow(): void
    {
        if (!this.treeEl || !this.bodyEl)
        {
            return;
        }
        const [startIdx, endIdx] = this.calcVirtualRange();
        this.treeEl.innerHTML = "";
        for (let i = startIdx; i < endIdx; i++)
        {
            this.renderVirtualRow(i);
        }
    }

    private calcVirtualRange(): [number, number]
    {
        const vpHeight = this.bodyEl!.clientHeight;
        const start = Math.max(0, Math.floor(
            this.scrollTop / NODE_ROW_HEIGHT)
            - VIRTUAL_SCROLL_BUFFER);
        const visible = Math.ceil(vpHeight / NODE_ROW_HEIGHT);
        const end = Math.min(this.flatVisibleNodes.length,
            start + visible + VIRTUAL_SCROLL_BUFFER * 2);
        return [start, end];
    }

    private renderVirtualRow(index: number): void
    {
        const nodeId = this.flatVisibleNodes[index];
        const node = this.nodeMap.get(nodeId);
        if (!node)
        {
            return;
        }
        const level = this.getNodeLevel(nodeId);
        const row = this.buildNodeRow(node, level,
            this.expandedSet.has(nodeId));
        row.style.position = "absolute";
        row.style.top = `${index * NODE_ROW_HEIGHT}px`;
        row.style.width = "100%";
        this.treeEl!.appendChild(row);
    }

    private getNodeLevel(nodeId: string): number
    {
        let level = 1;
        let current = this.nodeMap.get(nodeId);
        while (current?.parentId)
        {
            level++;
            current = this.nodeMap.get(current.parentId);
        }
        return level;
    }

    // ════════════════════════════════════════════════════════════════════
    // KEYBOARD NAVIGATION
    // ════════════════════════════════════════════════════════════════════

    private onKeyDown(e: KeyboardEvent): void
    {
        if (this.handleGlobalKeys(e))
        {
            return;
        }
        if (this.isSearchInputFocused())
        {
            this.handleSearchKeys(e);
            return;
        }
        this.handleTreeKeys(e);
    }

    private handleGlobalKeys(e: KeyboardEvent): boolean
    {
        if (e.key === "/" && !this.isSearchInputFocused())
        {
            e.preventDefault();
            this.searchInput?.focus();
            return true;
        }
        if (e.key === "Escape")
        {
            if (this.isSearchMode)
            {
                this.onSearchClear();
                return true;
            }
            this.opts.onCancel?.();
            return true;
        }
        return false;
    }

    private handleSearchKeys(e: KeyboardEvent): void
    {
        if (e.key === "ArrowDown")
        {
            e.preventDefault();
            this.focusFirstVisibleNode();
        }
        else if (e.key === "Enter")
        {
            e.preventDefault();
            this.selectFirstResult();
        }
    }

    private handleTreeKeys(e: KeyboardEvent): void
    {
        const handlers: Record<string, () => void> =
        {
            ArrowDown: () => this.moveFocus(1),
            ArrowUp: () => this.moveFocus(-1),
            ArrowRight: () => this.expandFocused(),
            ArrowLeft: () => this.collapseFocused(),
            Home: () => this.focusFirst(),
            End: () => this.focusLast(),
            Enter: () => this.activateFocused(),
            " ": () => this.toggleFocused(),
        };
        const handler = handlers[e.key];
        if (handler)
        {
            e.preventDefault();
            handler();
        }
    }

    private isSearchInputFocused(): boolean
    {
        return document.activeElement === this.searchInput;
    }

    private moveFocus(direction: number): void
    {
        const nodes = this.getNavigableNodes();
        if (nodes.length === 0)
        {
            return;
        }
        const idx = this.focusedNodeId
            ? nodes.indexOf(this.focusedNodeId) : -1;
        const next = Math.max(0, Math.min(
            nodes.length - 1, idx + direction));
        this.setFocusedNode(nodes[next]);
        this.scrollFocusedIntoView();
    }

    private getNavigableNodes(): string[]
    {
        if (this.isSearchMode)
        {
            return this.searchResults.map(n => n.id);
        }
        return this.flatVisibleNodes.length > 0
            ? this.flatVisibleNodes
            : this.computeNavigableFromDom();
    }

    private computeNavigableFromDom(): string[]
    {
        this.computeFlatVisibleNodes();
        return this.flatVisibleNodes;
    }

    private focusFirstVisibleNode(): void
    {
        const nodes = this.getNavigableNodes();
        if (nodes.length > 0)
        {
            this.setFocusedNode(nodes[0]);
            this.scrollFocusedIntoView();
        }
    }

    private focusFirst(): void
    {
        const nodes = this.getNavigableNodes();
        if (nodes.length > 0)
        {
            this.setFocusedNode(nodes[0]);
            this.scrollFocusedIntoView();
        }
    }

    private focusLast(): void
    {
        const nodes = this.getNavigableNodes();
        if (nodes.length > 0)
        {
            this.setFocusedNode(nodes[nodes.length - 1]);
            this.scrollFocusedIntoView();
        }
    }

    private expandFocused(): void
    {
        if (!this.focusedNodeId)
        {
            return;
        }
        const node = this.nodeMap.get(this.focusedNodeId);
        if (!node?.hasChildren)
        {
            return;
        }
        if (this.expandedSet.has(this.focusedNodeId))
        {
            const children =
                this.childrenMap.get(this.focusedNodeId) ?? [];
            if (children.length > 0)
            {
                this.setFocusedNode(children[0]);
                this.scrollFocusedIntoView();
            }
        }
        else
        {
            this.expandNode(this.focusedNodeId);
        }
    }

    private collapseFocused(): void
    {
        if (!this.focusedNodeId)
        {
            return;
        }
        if (this.expandedSet.has(this.focusedNodeId))
        {
            this.collapseNode(this.focusedNodeId);
        }
        else
        {
            const node = this.nodeMap.get(this.focusedNodeId);
            if (node?.parentId)
            {
                this.setFocusedNode(node.parentId);
                this.scrollFocusedIntoView();
            }
        }
    }

    private activateFocused(): void
    {
        if (!this.focusedNodeId)
        {
            return;
        }
        if (!this.isNodeSelectable(this.focusedNodeId))
        {
            return;
        }
        this.toggleSelection(this.focusedNodeId);
    }

    private toggleFocused(): void
    {
        this.activateFocused();
    }

    private selectFirstResult(): void
    {
        const nodes = this.getNavigableNodes();
        if (nodes.length > 0 && this.isNodeSelectable(nodes[0]))
        {
            this.toggleSelection(nodes[0]);
        }
    }

    private setFocusedNode(nodeId: string): void
    {
        const prev = this.focusedNodeId;
        this.focusedNodeId = nodeId;
        if (prev)
        {
            this.updateFocusVisual(prev, false);
        }
        this.updateFocusVisual(nodeId, true);
        this.updateBreadcrumb(nodeId);
    }

    private updateFocusVisual(
        nodeId: string, focused: boolean): void
    {
        const row = this.rootEl?.querySelector(
            `[data-node-id="${nodeId}"]`) as HTMLElement | null;
        if (!row)
        {
            return;
        }
        row.classList.toggle(
            "explorerpicker-node-row-focused", focused);
        setAttr(row, "tabindex", focused ? "0" : "-1");
        if (focused)
        {
            row.focus();
        }
    }

    private scrollFocusedIntoView(): void
    {
        if (!this.focusedNodeId)
        {
            return;
        }
        const row = this.rootEl?.querySelector(
            `[data-node-id="${this.focusedNodeId}"]`
        ) as HTMLElement | null;
        if (row?.scrollIntoView)
        {
            row.scrollIntoView({ block: "nearest" });
        }
    }

    // ════════════════════════════════════════════════════════════════════
    // ANNOUNCEMENTS & LIVE REGION
    // ════════════════════════════════════════════════════════════════════

    private announce(message: string): void
    {
        if (this.liveEl)
        {
            this.liveEl.textContent = message;
        }
    }

    private announceSelection(nodeId: string): void
    {
        const node = this.nodeMap.get(nodeId);
        const selected = this.selectedSet.has(nodeId);
        const action = selected ? "selected" : "deselected";
        const count = this.selectedSet.size;
        this.announce(
            `${node?.name ?? nodeId} ${action}. ${count} resource${
                count !== 1 ? "s" : ""} selected.`);
    }

    private announceSearchResults(query: string): void
    {
        const count = this.searchResults.length;
        if (count === 0)
        {
            this.announce(`No results found for ${query}.`);
        }
        else
        {
            this.announce(`${count} results for ${query}.`);
        }
    }

    // ════════════════════════════════════════════════════════════════════
    // LOADING & ERROR STATES
    // ════════════════════════════════════════════════════════════════════

    private showLoading(show: boolean): void
    {
        this.isLoadingData = show;
        if (this.loadingEl)
        {
            this.loadingEl.style.display = show ? "" : "none";
        }
    }

    private showError(
        message: string, context: string): void
    {
        if (!this.errorEl)
        {
            return;
        }
        this.errorEl.style.display = "";
        this.errorEl.innerHTML = "";
        const text = createElement("span", [], message + " ");
        const retry = createElement(
            "button", ["explorerpicker-retry"], "Retry");
        setAttr(retry, "type", "button");
        this.errorEl.appendChild(text);
        this.errorEl.appendChild(retry);
        this.announce(
            `${message} Activate retry to try again.`);
        logError(context, message);
    }

    private hideError(): void
    {
        if (this.errorEl)
        {
            this.errorEl.style.display = "none";
        }
    }

    // ════════════════════════════════════════════════════════════════════
    // UTILITY
    // ════════════════════════════════════════════════════════════════════

    private clearDebounce(): void
    {
        if (this.debounceTimer)
        {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
    }

    private fireConfirm(): void
    {
        const selections = this.getSelection();
        logInfo("Confirm:", selections.length, "items");
        this.opts.onConfirm(selections);
    }

    private fireSelectionChange(): void
    {
        if (this.opts.onSelectionChange)
        {
            this.opts.onSelectionChange(this.getSelection());
        }
    }

    // ════════════════════════════════════════════════════════════════════
    // PUBLIC API
    // ════════════════════════════════════════════════════════════════════

    /** Programmatically set search query and trigger search. */
    public setSearchQuery(query: string): void
    {
        if (this.searchInput)
        {
            this.searchInput.value = query;
        }
        this.searchQuery = query;
        this.updateSearchClearVisibility();
        if (query)
        {
            this.executeSearch(query);
        }
        else
        {
            this.exitSearchMode();
        }
    }

    /** Clear the current selection. */
    public clearSelection(): void
    {
        this.selectedSet.clear();
        this.updateConfirmState();
        this.fireSelectionChange();
        this.renderSelectionState();
    }

    /** Get current selection as enriched objects. */
    public getSelection(): ExplorerPickerSelection[]
    {
        const result: ExplorerPickerSelection[] = [];
        this.selectedSet.forEach(id =>
        {
            const node = this.nodeMap.get(id);
            if (!node)
            {
                return;
            }
            result.push({
                nodeId: node.id,
                resourceId: node.resourceId,
                name: node.name,
                nodeType: node.nodeType,
                resourceType: node.resourceType,
                sourceId: node.sourceId,
                breadcrumb: this.computeBreadcrumb(node.id),
                url: node.url,
            });
        });
        return result;
    }

    /** Scroll a node into view and briefly highlight it. */
    public scrollToNode(nodeId: string): void
    {
        const row = this.rootEl?.querySelector(
            `[data-node-id="${nodeId}"]`) as HTMLElement | null;
        if (!row)
        {
            return;
        }
        if (row.scrollIntoView)
        {
            row.scrollIntoView({ block: "nearest" });
        }
        row.classList.add("explorerpicker-node-row-flash");
        setTimeout(() =>
        {
            row.classList.remove("explorerpicker-node-row-flash");
        }, 1000);
    }

    /** Refresh all data from the API. */
    public async refresh(): Promise<void>
    {
        this.hideError();
        this.nodeMap.clear();
        this.childrenMap.clear();
        this.loadedSet.clear();
        this.rootNodeIds = [];
        this.recentItems = [];
        this.starredItems = [];
        await this.loadInitialData();
    }

    /** Whether the picker is currently loading. */
    public isLoading(): boolean
    {
        return this.isLoadingData;
    }

    /** Return the root DOM element. */
    public getElement(): HTMLElement | null
    {
        return this.rootEl;
    }

    // ════════════════════════════════════════════════════════════════════
    // STATE EXPORT / RESTORE
    // ════════════════════════════════════════════════════════════════════

    /** Export current UI state for persistence. */
    public exportState(): ExplorerPickerState
    {
        return {
            expandedNodeIds: Array.from(this.expandedSet),
            selectedNodeIds: Array.from(this.selectedSet),
            searchQuery: this.searchQuery,
            scrollTop: this.bodyEl?.scrollTop ?? 0,
            focusedNodeId: this.focusedNodeId,
        };
    }

    /** Restore a previously exported state. */
    public async restoreState(
        state: ExplorerPickerState): Promise<void>
    {
        for (const id of state.expandedNodeIds)
        {
            if (this.nodeMap.has(id))
            {
                await this.expandNode(id);
            }
        }
        this.restoreSelections(state);
        this.applyRestoredState(state);
    }

    private restoreSelections(
        state: ExplorerPickerState): void
    {
        this.selectedSet.clear();
        state.selectedNodeIds.forEach(id =>
        {
            if (this.nodeMap.has(id))
            {
                this.selectedSet.add(id);
            }
        });
    }

    private applyRestoredState(
        state: ExplorerPickerState): void
    {
        if (state.searchQuery)
        {
            this.setSearchQuery(state.searchQuery);
        }
        if (state.focusedNodeId &&
            this.nodeMap.has(state.focusedNodeId))
        {
            this.setFocusedNode(state.focusedNodeId);
        }
        this.updateConfirmState();
        this.renderSelectionState();
        if (this.bodyEl && state.scrollTop > 0)
        {
            this.bodyEl.scrollTop = state.scrollTop;
        }
    }
}

// ============================================================================
// FACTORY
// ============================================================================

/** Create and render an ExplorerPicker. */
export function createExplorerPicker(
    options: ExplorerPickerOptions): ExplorerPickerImpl
{
    logInfo("Creating ExplorerPicker");
    return new ExplorerPickerImpl(options);
}

// ============================================================================
// WINDOW GLOBALS
// ============================================================================

(window as unknown as Record<string, unknown>)["ExplorerPickerImpl"] =
    ExplorerPickerImpl;
(window as unknown as Record<string, unknown>)["createExplorerPicker"] =
    createExplorerPicker;
