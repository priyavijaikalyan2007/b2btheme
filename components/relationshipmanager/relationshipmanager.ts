/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: RelationshipManager
 * 📜 PURPOSE: Component for creating, viewing, and managing typed
 *             relationships between entities. Embeddable in any resource
 *             detail view as a "Relationships" section.
 * 🔗 RELATES: [[TypeBadge]], [[SearchBox]], [[ConfirmDialog]], [[GraphCanvas]]
 * ⚡ FLOW: [Consumer] -> [createRelationshipManager()] -> [RM handle]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[RelationshipManager]";

const _lu = (typeof (window as any).createLogUtility === "function") ? (window as any).createLogUtility().getLogger(LOG_PREFIX.slice(1, -1)) : null;
function logInfo(...a: unknown[]): void { _lu ? _lu.info(...a) : console.log(new Date().toISOString(), "[INFO]", LOG_PREFIX, ...a); }
function logWarn(...a: unknown[]): void { _lu ? _lu.warn(...a) : console.warn(new Date().toISOString(), "[WARN]", LOG_PREFIX, ...a); }
function logError(...a: unknown[]): void { _lu ? _lu.error(...a) : console.error(new Date().toISOString(), "[ERROR]", LOG_PREFIX, ...a); }
function logDebug(...a: unknown[]): void { _lu ? _lu.debug(...a) : console.debug(new Date().toISOString(), "[DEBUG]", LOG_PREFIX, ...a); }
function logTrace(...a: unknown[]): void { _lu ? _lu.trace(...a) : console.debug(new Date().toISOString(), "[TRACE]", LOG_PREFIX, ...a); }

const DEBOUNCE_MS = 300;
const AI_PROVENANCE = "ai_inferred";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/** Summary of a relationship definition from the ontology schema. */
export interface RelationshipDefinitionSummary
{
    key: string;
    displayName: string;
    inverseName: string;
    targetTypeKeys: string[] | null;
    sourceTypeKeys: string[] | null;
    cardinality: string;
    propertiesSchema?: Record<string, unknown>;
}

/**
 * Sort mode for relationship groups (by group display name).
 * Implements the CategorizedDataInlineToolbar pattern (ADR-128).
 */
export type RelationshipSortMode = "asc" | "desc" | null;

/** Collapse state aggregate across all groups. */
export type RelationshipCollapseState = "all-collapsed" | "all-expanded" | "mixed";

/** A single relationship instance. */
export interface RelationshipInstance
{
    id: string;
    relationshipKey: string;
    relationshipDisplayName: string;
    direction: "outbound" | "inbound";
    otherResourceId: string;
    otherResourceDisplayName: string;
    otherResourceType: string;
    properties: Record<string, unknown>;
    provenance: string;
    confidence?: number;
    createdAt: string;
    createdBy?: string;
}

/** Request to create a new relationship. */
export interface CreateRelationshipRequest
{
    targetResourceId: string;
    relationshipKey: string;
    properties?: Record<string, unknown>;
}

/** Search result from resource search. */
export interface ResourceSearchResult
{
    id: string;
    displayName: string;
    typeKey: string;
    icon?: string;
    color?: string;
}

/** Configuration for RelationshipManager. */
export interface RelationshipManagerOptions
{
    container: HTMLElement;
    resourceId: string;
    resourceType: string;
    resourceDisplayName: string;
    relationshipDefinitions: RelationshipDefinitionSummary[];
    relationships: RelationshipInstance[];
    readOnly?: boolean;
    /** Show the Add button. Default: inferred from onCreateRelationship presence. */
    showAddButton?: boolean;
    allowedRelationshipKeys?: string[];
    showProvenance?: boolean;
    showConfidence?: boolean;
    groupByType?: boolean;
    onCreateRelationship?: (req: CreateRelationshipRequest) => Promise<void>;
    onDeleteRelationship?: (relationshipId: string) => Promise<void>;
    onEditProperties?: (id: string, props: Record<string, unknown>) => Promise<void>;
    onNavigate?: (resourceId: string) => void;
    onConfirmInferred?: (relationshipId: string) => Promise<void>;
    onDismissInferred?: (relationshipId: string) => Promise<void>;
    onSearchResources?: (query: string, typeKeys: string[]) => Promise<ResourceSearchResult[]>;

    // -- CategorizedDataInlineToolbar pattern (ADR-128) --
    /**
     * Mount an InlineToolbar in the panel header offering sort asc/desc by
     * group name, expand-all, and collapse-all. Default: false (opt-in).
     * No-op when window.createInlineToolbar is not available.
     */
    showInlineToolbar?: boolean;
    /** Initial sort mode applied to group keys. Default: null (insertion order). */
    initialSortMode?: RelationshipSortMode;
    /** Whether all groups start collapsed. Default: "none". */
    initialCollapsed?: "all" | "none";
    /** Fired when sort mode changes via toolbar or setSortMode. */
    onSortModeChange?: (mode: RelationshipSortMode) => void;
    /** Fired when expandAll/collapseAll runs (toolbar or imperative). */
    onCollapseStateChange?: (state: RelationshipCollapseState) => void;
}

/** Public API for RelationshipManager. */
export interface RelationshipManager
{
    setRelationships(relationships: RelationshipInstance[]): void;
    addRelationship(relationship: RelationshipInstance): void;
    removeRelationship(relationshipId: string): void;
    setReadOnly(readOnly: boolean): void;
    expandAll(): void;
    collapseAll(): void;
    /** Set group sort mode; null = insertion order. ADR-128. */
    setSortMode(mode: RelationshipSortMode): void;
    /** Read current group sort mode. */
    getSortMode(): RelationshipSortMode;
    refresh(): void;
    destroy(): void;
}

/** Handle shape we expect from window.createInlineToolbar (ADR-128 resilience). */
interface InlineToolbarHandleShape
{
    setItemActive(id: string, active: boolean): void;
    destroy(): void;
}

// ============================================================================
// DOM HELPERS
// ============================================================================

function htmlEl(
    tag: string,
    attrs?: Record<string, string>,
    text?: string
): HTMLElement
{
    const el = document.createElement(tag);
    if (attrs)
    {
        for (const [k, v] of Object.entries(attrs))
        {
            el.setAttribute(k, v);
        }
    }
    if (text) { el.textContent = text; }
    return el;
}

// ============================================================================
// RELATIONSHIP MANAGER IMPLEMENTATION
// ============================================================================

class RelationshipManagerImpl implements RelationshipManager
{
    private opts: RelationshipManagerOptions;
    private relationships: RelationshipInstance[];
    private readOnly: boolean;
    private collapsedGroups: Set<string> = new Set();
    private sortMode: RelationshipSortMode = null;
    private toolbarHandle: InlineToolbarHandleShape | null = null;

    // DOM refs
    private root: HTMLElement | null = null;
    private listEl: HTMLElement | null = null;
    private addBtnEl: HTMLElement | null = null;
    private addPanelEl: HTMLElement | null = null;
    private addPanelOpen = false;

    // Add flow state
    private addStep = 0;
    private selectedRelDef: RelationshipDefinitionSummary | null = null;
    private selectedTarget: ResourceSearchResult | null = null;
    private searchDebounceTimer: number | null = null;

    constructor(opts: RelationshipManagerOptions)
    {
        this.opts = opts;
        this.relationships = [...opts.relationships];
        this.readOnly = opts.readOnly === true;
        this.sortMode = opts.initialSortMode ?? null;
        this.buildRoot();
        if (opts.initialCollapsed === "all")
        {
            for (const key of this.groupRelationships().keys())
            {
                this.collapsedGroups.add(key);
            }
        }
        this.rebuild();
        logInfo("Created for:", opts.resourceDisplayName);
    }

    // ====================================================================
    // PUBLIC API
    // ====================================================================

    /** Replace all relationships and re-render. */
    public setRelationships(relationships: RelationshipInstance[]): void
    {
        this.relationships = [...relationships];
        this.rebuild();
    }

    /** Append a single relationship and re-render. */
    public addRelationship(relationship: RelationshipInstance): void
    {
        this.relationships.push(relationship);
        this.rebuild();
    }

    /** Remove a relationship by ID and re-render. */
    public removeRelationship(relationshipId: string): void
    {
        this.relationships = this.relationships.filter((r) => r.id !== relationshipId);
        this.rebuild();
    }

    /** Toggle read-only mode and re-render. */
    public setReadOnly(readOnly: boolean): void
    {
        this.readOnly = readOnly;
        this.rebuild();
    }

    /** Expand all collapsed groups. */
    public expandAll(): void
    {
        this.collapsedGroups.clear();
        this.rebuild();
        this.emitCollapseState();
    }

    /** Collapse all groups. */
    public collapseAll(): void
    {
        const groups = this.groupRelationships();
        for (const key of groups.keys()) { this.collapsedGroups.add(key); }
        this.rebuild();
        this.emitCollapseState();
    }

    /** Set group sort mode (asc | desc | null). ADR-128. */
    public setSortMode(mode: RelationshipSortMode): void
    {
        if (this.sortMode === mode) { return; }
        this.sortMode = mode;
        this.syncToolbarSortButtons();
        this.rebuild();
        if (typeof this.opts.onSortModeChange === "function")
        {
            try { this.opts.onSortModeChange(mode); }
            catch (e) { logError("onSortModeChange threw:", e); }
        }
    }

    /** Read current group sort mode. */
    public getSortMode(): RelationshipSortMode
    {
        return this.sortMode;
    }

    /** Force a re-render of the entire list. */
    public refresh(): void
    {
        this.rebuild();
    }

    /** Clean up timers and remove from DOM. */
    public destroy(): void
    {
        if (this.searchDebounceTimer) { clearTimeout(this.searchDebounceTimer); }
        if (this.toolbarHandle)
        {
            try { this.toolbarHandle.destroy(); }
            catch (e) { logWarn("InlineToolbar destroy threw:", e); }
            this.toolbarHandle = null;
        }
        if (this.root?.parentNode) { this.root.parentNode.removeChild(this.root); }
        this.root = null;
        this.listEl = null;
        this.addBtnEl = null;
        this.addPanelEl = null;
        logInfo("Destroyed.");
    }

    /** Compute aggregate collapse state across visible groups. ADR-128. */
    private computeCollapseState(): RelationshipCollapseState
    {
        const groups = this.groupRelationships();
        const total = groups.size;
        if (total === 0) { return "all-expanded"; }
        const collapsed = this.collapsedGroups.size;
        if (collapsed === 0) { return "all-expanded"; }
        if (collapsed >= total) { return "all-collapsed"; }
        return "mixed";
    }

    private emitCollapseState(): void
    {
        if (typeof this.opts.onCollapseStateChange !== "function") { return; }
        try { this.opts.onCollapseStateChange(this.computeCollapseState()); }
        catch (e) { logError("onCollapseStateChange threw:", e); }
    }

    private syncToolbarSortButtons(): void
    {
        if (!this.toolbarHandle) { return; }
        try
        {
            this.toolbarHandle.setItemActive("rm-sort-asc", this.sortMode === "asc");
            this.toolbarHandle.setItemActive("rm-sort-desc", this.sortMode === "desc");
        }
        catch (e) { logWarn("Toolbar setItemActive threw:", e); }
    }

    // ====================================================================
    // ADD BUTTON VISIBILITY
    // ====================================================================

    /** Whether the add-relationship capability is enabled. */
    private canCreate(): boolean
    {
        return this.opts.showAddButton
            ?? (typeof this.opts.onCreateRelationship === "function");
    }

    /** Show or hide the add button based on readOnly + canCreate. */
    private syncAddBtnVisibility(): void
    {
        if (!this.addBtnEl) { return; }
        const show = !this.readOnly && this.canCreate();
        this.addBtnEl.style.display = show ? "" : "none";
    }

    // ====================================================================
    // SCAFFOLD
    // ====================================================================

    private buildRoot(): void
    {
        this.root = htmlEl("div", { class: "rm-root" });
        this.root.appendChild(this.buildHeader());
        this.listEl = htmlEl("div", { class: "rm-list" });
        this.root.appendChild(this.listEl);
        this.addPanelEl = htmlEl("div", { class: "rm-add-panel" });
        this.addPanelEl.style.display = "none";
        this.root.appendChild(this.addPanelEl);
        this.opts.container.appendChild(this.root);
    }

    private buildHeader(): HTMLElement
    {
        const header = htmlEl("div", { class: "rm-header" });
        const title = htmlEl("span", { class: "rm-header-title" });
        title.textContent = `Relationships (${this.relationships.length})`;
        header.appendChild(title);

        this.mountInlineToolbar(header);

        this.addBtnEl = htmlEl("button", {
            class: "rm-add-btn",
            type: "button",
            "aria-label": "Add relationship"
        }, "+ Add");
        this.addBtnEl.addEventListener("click", () => { this.openAddPanel(); });
        header.appendChild(this.addBtnEl);
        this.syncAddBtnVisibility();

        return header;
    }

    /**
     * Mount InlineToolbar with sort + collapse defaults if opted in.
     * Resolves window.createInlineToolbar defensively (ADR-128 / ADR-125 pattern).
     */
    private mountInlineToolbar(header: HTMLElement): void
    {
        if (this.opts.showInlineToolbar !== true) { return; }
        const win = window as unknown as Record<string, unknown>;
        const factory = win.createInlineToolbar as
            ((opts: Record<string, unknown>) => InlineToolbarHandleShape) | undefined;
        if (typeof factory !== "function")
        {
            logWarn("showInlineToolbar requested but window.createInlineToolbar is unavailable.");
            return;
        }
        const slot = htmlEl("span", { class: "rm-header-toolbar" });
        header.appendChild(slot);
        try
        {
            this.toolbarHandle = factory({
                container: slot,
                size: "sm",
                items: [
                    {
                        id: "rm-sort-asc",
                        icon: "sort-alpha-down",
                        tooltip: "Sort group names A→Z",
                        type: "toggle",
                        active: this.sortMode === "asc",
                        onClick: () => { this.handleToolbarSort("asc"); }
                    },
                    {
                        id: "rm-sort-desc",
                        icon: "sort-alpha-up",
                        tooltip: "Sort group names Z→A",
                        type: "toggle",
                        active: this.sortMode === "desc",
                        onClick: () => { this.handleToolbarSort("desc"); }
                    },
                    { id: "rm-sep", icon: "", tooltip: "", type: "separator" },
                    {
                        id: "rm-expand-all",
                        icon: "arrows-expand",
                        tooltip: "Expand all groups",
                        onClick: () => { this.expandAll(); }
                    },
                    {
                        id: "rm-collapse-all",
                        icon: "arrows-collapse",
                        tooltip: "Collapse all groups",
                        onClick: () => { this.collapseAll(); }
                    }
                ]
            });
        }
        catch (e)
        {
            logError("InlineToolbar factory threw:", e);
            this.toolbarHandle = null;
        }
    }

    /** Toolbar sort button click — toggles asc/desc/null. */
    private handleToolbarSort(mode: "asc" | "desc"): void
    {
        const next: RelationshipSortMode = (this.sortMode === mode) ? null : mode;
        this.setSortMode(next);
    }

    // ====================================================================
    // DATA GROUPING
    // ====================================================================

    private groupRelationships(): Map<string, RelationshipInstance[]>
    {
        const groups = new Map<string, RelationshipInstance[]>();
        const aiGroup: RelationshipInstance[] = [];

        for (const rel of this.relationships)
        {
            if (rel.provenance === AI_PROVENANCE)
            {
                aiGroup.push(rel);
                continue;
            }
            const key = rel.relationshipDisplayName;
            if (!groups.has(key)) { groups.set(key, []); }
            groups.get(key)!.push(rel);
        }

        const sorted = this.applySortToGroups(groups);
        if (aiGroup.length > 0)
        {
            sorted.set("AI Suggested", aiGroup);
        }
        return sorted;
    }

    /** Apply current sortMode to a Map's key iteration order. ADR-128. */
    private applySortToGroups(
        groups: Map<string, RelationshipInstance[]>
    ): Map<string, RelationshipInstance[]>
    {
        if (this.sortMode === null) { return groups; }
        const keys = Array.from(groups.keys());
        keys.sort((a, b) => a.localeCompare(b));
        if (this.sortMode === "desc") { keys.reverse(); }
        const out = new Map<string, RelationshipInstance[]>();
        for (const k of keys) { out.set(k, groups.get(k)!); }
        return out;
    }

    // ====================================================================
    // LIST RENDERING
    // ====================================================================

    private rebuild(): void
    {
        if (!this.listEl) { return; }
        this.updateHeaderCount();
        this.syncAddBtnVisibility();
        this.renderList();
    }

    private updateHeaderCount(): void
    {
        if (!this.root) { return; }
        const title = this.root.querySelector(".rm-header-title");
        if (title)
        {
            title.textContent = `Relationships (${this.relationships.length})`;
        }
    }

    private renderList(): void
    {
        if (!this.listEl) { return; }
        this.listEl.innerHTML = "";

        if (this.relationships.length === 0)
        {
            this.listEl.appendChild(this.buildEmptyState());
            return;
        }

        if (this.opts.groupByType !== false)
        {
            const groups = this.groupRelationships();
            for (const [key, items] of groups)
            {
                this.listEl.appendChild(this.renderGroup(key, items));
            }
        }
        else
        {
            for (const rel of this.relationships)
            {
                this.listEl.appendChild(this.buildRelItem(rel));
            }
        }
    }

    private buildEmptyState(): HTMLElement
    {
        const el = htmlEl("div", { class: "rm-empty" });
        el.textContent = "No relationships yet.";
        return el;
    }

    private renderGroup(key: string, items: RelationshipInstance[]): HTMLElement
    {
        const group = htmlEl("div", { class: "rm-group" });
        const isAi = key === "AI Suggested";
        group.appendChild(this.buildGroupHeader(key, items.length, isAi));

        const body = htmlEl("div", { class: "rm-group-body" });
        if (this.collapsedGroups.has(key))
        {
            body.style.display = "none";
        }
        for (const rel of items)
        {
            body.appendChild(this.buildRelItem(rel));
        }
        group.appendChild(body);
        return group;
    }

    private buildGroupHeader(
        key: string,
        count: number,
        isAi: boolean
    ): HTMLElement
    {
        const header = htmlEl("div", { class: "rm-group-header" });
        header.style.cursor = "pointer";

        const collapsed = this.collapsedGroups.has(key);
        const arrow = htmlEl("span", { class: "rm-group-arrow" });
        arrow.textContent = collapsed ? "\u25b8" : "\u25be";
        header.appendChild(arrow);

        const label = htmlEl("span", { class: "rm-group-label" });
        label.textContent = `${key} (${count})`;
        header.appendChild(label);

        if (isAi)
        {
            const sparkle = htmlEl("span", { class: "rm-ai-badge" });
            sparkle.textContent = "\u2728";
            header.appendChild(sparkle);
        }

        header.addEventListener("click", () =>
        {
            this.toggleGroup(key);
        });
        return header;
    }

    private buildRelItem(rel: RelationshipInstance): HTMLElement
    {
        const item = htmlEl("div", { class: "rm-item" });
        const top = htmlEl("div", { class: "rm-item-top" });

        top.appendChild(this.buildTypeBadgeForRel(rel));

        const name = htmlEl("span", { class: "rm-item-name" });
        name.textContent = rel.otherResourceDisplayName;
        top.appendChild(name);

        if (rel.provenance === AI_PROVENANCE && rel.confidence != null)
        {
            top.appendChild(this.buildConfidenceBadge(rel.confidence));
        }

        item.appendChild(top);
        item.appendChild(this.buildRelItemMeta(rel));
        item.appendChild(this.buildRelItemActions(rel));
        return item;
    }

    private buildTypeBadgeForRel(rel: RelationshipInstance): HTMLElement
    {
        const factory = (window as unknown as Record<string, unknown>)["createTypeBadge"] as
            ((opts: Record<string, unknown>) => HTMLElement) | undefined;
        if (factory)
        {
            return factory({
                typeKey: rel.otherResourceType,
                size: "sm",
                variant: "subtle"
            });
        }
        const span = htmlEl("span", { class: "rm-type-fallback" });
        span.textContent = rel.otherResourceType;
        return span;
    }

    private buildConfidenceBadge(confidence: number): HTMLElement
    {
        const badge = htmlEl("span", { class: "rm-confidence" });
        badge.textContent = `${Math.round(confidence * 100)}%`;
        return badge;
    }

    private buildRelItemMeta(rel: RelationshipInstance): HTMLElement
    {
        const meta = htmlEl("div", { class: "rm-item-meta" });
        const parts: string[] = [rel.otherResourceType];

        if (this.opts.showProvenance !== false)
        {
            parts.push(rel.provenance.toUpperCase());
        }
        parts.push(rel.createdAt.substring(0, 10));

        // Inline edge properties
        for (const [k, v] of Object.entries(rel.properties))
        {
            parts.push(`${k}: ${String(v)}`);
        }

        meta.textContent = parts.join(" \u00b7 ");
        return meta;
    }

    private buildRelItemActions(rel: RelationshipInstance): HTMLElement
    {
        const actions = htmlEl("div", { class: "rm-item-actions" });

        if (rel.provenance === AI_PROVENANCE)
        {
            actions.appendChild(this.buildAiActions(rel));
        }

        // Navigate button
        const navBtn = htmlEl("button", {
            class: "rm-action-btn",
            type: "button",
            "aria-label": "Navigate to resource",
            title: "Navigate"
        }, "\u2197");
        navBtn.addEventListener("click", () =>
        {
            this.handleNavigate(rel.otherResourceId);
        });
        actions.appendChild(navBtn);

        // More menu (delete)
        if (!this.readOnly)
        {
            const moreBtn = htmlEl("button", {
                class: "rm-action-btn rm-more-btn",
                type: "button",
                "aria-label": "More actions",
                title: "More"
            }, "\u22ef");
            moreBtn.addEventListener("click", () =>
            {
                this.handleDelete(rel.id);
            });
            actions.appendChild(moreBtn);
        }

        return actions;
    }

    private buildAiActions(rel: RelationshipInstance): HTMLElement
    {
        const wrap = htmlEl("span", { class: "rm-ai-actions" });

        const confirmBtn = htmlEl("button", {
            class: "rm-action-btn rm-confirm-btn",
            type: "button",
            title: "Confirm"
        }, "\u2713 Confirm");
        confirmBtn.addEventListener("click", () =>
        {
            this.handleConfirmInferred(rel.id);
        });
        wrap.appendChild(confirmBtn);

        const dismissBtn = htmlEl("button", {
            class: "rm-action-btn rm-dismiss-btn",
            type: "button",
            title: "Dismiss"
        }, "\u2717 Dismiss");
        dismissBtn.addEventListener("click", () =>
        {
            this.handleDismissInferred(rel.id);
        });
        wrap.appendChild(dismissBtn);

        return wrap;
    }

    private buildProvenanceBadge(provenance: string): HTMLElement
    {
        const badge = htmlEl("span", { class: "rm-provenance" });
        badge.textContent = provenance.toUpperCase();
        return badge;
    }

    // ====================================================================
    // INTERACTIONS
    // ====================================================================

    private toggleGroup(key: string): void
    {
        if (this.collapsedGroups.has(key))
        {
            this.collapsedGroups.delete(key);
        }
        else
        {
            this.collapsedGroups.add(key);
        }
        this.rebuild();
    }

    private handleConfirmInferred(id: string): void
    {
        this.opts.onConfirmInferred?.(id);
    }

    private handleDismissInferred(id: string): void
    {
        this.opts.onDismissInferred?.(id);
    }

    private handleDelete(id: string): void
    {
        const confirmDialog = (window as unknown as Record<string, unknown>)["showConfirmDialog"] as
            ((opts: Record<string, unknown>) => Promise<boolean>) | undefined;
        if (confirmDialog)
        {
            confirmDialog({
                title: "Delete Relationship",
                message: "Are you sure you want to delete this relationship?",
                confirmLabel: "Delete",
                variant: "danger"
            }).then((confirmed: boolean) =>
            {
                if (confirmed) { this.opts.onDeleteRelationship?.(id); }
            });
        }
        else
        {
            if (confirm("Delete this relationship?"))
            {
                this.opts.onDeleteRelationship?.(id);
            }
        }
    }

    private handleNavigate(resourceId: string): void
    {
        this.opts.onNavigate?.(resourceId);
    }

    // ====================================================================
    // ADD FLOW — 3-STEP INLINE PANEL
    // ====================================================================

    private openAddPanel(): void
    {
        if (!this.canCreate())
        {
            logWarn("openAddPanel called but add capability is disabled.");
            return;
        }
        this.addPanelOpen = true;
        this.addStep = 1;
        this.selectedRelDef = null;
        this.selectedTarget = null;
        this.renderAddPanel();
    }

    private closeAddPanel(): void
    {
        this.addPanelOpen = false;
        this.addStep = 0;
        if (this.addPanelEl) { this.addPanelEl.style.display = "none"; }
    }

    private renderAddPanel(): void
    {
        if (!this.addPanelEl) { return; }
        this.addPanelEl.innerHTML = "";
        this.addPanelEl.style.display = "block";

        const header = htmlEl("div", { class: "rm-add-header" });
        const stepLabel = htmlEl("span", { class: "rm-add-step" });
        stepLabel.textContent = `Step ${this.addStep} of 3`;
        header.appendChild(stepLabel);

        const cancelBtn = htmlEl("button", {
            class: "rm-action-btn",
            type: "button"
        }, "Cancel");
        cancelBtn.addEventListener("click", () => { this.closeAddPanel(); });
        header.appendChild(cancelBtn);
        this.addPanelEl.appendChild(header);

        switch (this.addStep)
        {
            case 1: this.renderStep1(); break;
            case 2: this.renderStep2(); break;
            case 3: this.renderStep3(); break;
        }
    }

    private renderStep1(): void
    {
        const wrap = htmlEl("div", { class: "rm-step-content" });
        const label = htmlEl("div", { class: "rm-step-label" });
        label.textContent = "Select relationship type:";
        wrap.appendChild(label);

        const defs = this.getFilteredDefinitions();
        const list = htmlEl("div", { class: "rm-step-list" });
        for (const def of defs)
        {
            list.appendChild(this.buildRelDefItem(def));
        }
        wrap.appendChild(list);
        this.addPanelEl!.appendChild(wrap);
    }

    private getFilteredDefinitions(): RelationshipDefinitionSummary[]
    {
        let defs = this.opts.relationshipDefinitions;
        if (this.opts.allowedRelationshipKeys)
        {
            const allowed = new Set(this.opts.allowedRelationshipKeys);
            defs = defs.filter((d) => allowed.has(d.key));
        }
        return defs;
    }

    private buildRelDefItem(def: RelationshipDefinitionSummary): HTMLElement
    {
        const item = htmlEl("div", { class: "rm-def-item" });
        item.style.cursor = "pointer";

        const arrow = htmlEl("span", { class: "rm-def-arrow" });
        arrow.textContent = "\u2192";
        item.appendChild(arrow);

        const name = htmlEl("span", { class: "rm-def-name" });
        name.textContent = def.displayName;
        item.appendChild(name);

        if (def.targetTypeKeys)
        {
            const targets = htmlEl("span", { class: "rm-def-targets" });
            targets.textContent = `(\u2192 ${def.targetTypeKeys.join(", ")})`;
            item.appendChild(targets);
        }

        item.addEventListener("click", () => { this.onStep1Select(def); });
        return item;
    }

    private onStep1Select(def: RelationshipDefinitionSummary): void
    {
        this.selectedRelDef = def;
        this.addStep = 2;
        this.renderAddPanel();
    }

    private renderStep2(): void
    {
        const wrap = htmlEl("div", { class: "rm-step-content" });
        const label = htmlEl("div", { class: "rm-step-label" });
        label.textContent = `${this.selectedRelDef!.displayName} \u2192 Search target:`;
        wrap.appendChild(label);

        const input = htmlEl("input", {
            type: "text",
            class: "rm-search-input",
            placeholder: "Search resources..."
        }) as HTMLInputElement;
        input.addEventListener("input", () =>
        {
            this.runSearch(input.value);
        });
        wrap.appendChild(input);

        const resultsEl = htmlEl("div", { class: "rm-search-results" });
        resultsEl.setAttribute("data-role", "results");
        wrap.appendChild(resultsEl);

        this.addPanelEl!.appendChild(wrap);
        input.focus();
    }

    private runSearch(query: string): void
    {
        if (this.searchDebounceTimer) { clearTimeout(this.searchDebounceTimer); }
        if (query.length < 2) { return; }

        this.searchDebounceTimer = window.setTimeout(() =>
        {
            const typeKeys = this.selectedRelDef?.targetTypeKeys ?? [];
            this.opts.onSearchResources?.(query, typeKeys).then((results) =>
            {
                this.renderSearchResults(results);
            });
        }, DEBOUNCE_MS);
    }

    private renderSearchResults(results: ResourceSearchResult[]): void
    {
        const container = this.addPanelEl?.querySelector("[data-role='results']");
        if (!container) { return; }
        container.innerHTML = "";

        if (results.length === 0)
        {
            container.appendChild(htmlEl("div", { class: "rm-no-results" }, "No results found."));
            return;
        }

        for (const result of results)
        {
            container.appendChild(this.buildSearchResultItem(result));
        }
    }

    private buildSearchResultItem(result: ResourceSearchResult): HTMLElement
    {
        const item = htmlEl("div", { class: "rm-search-item" });
        item.style.cursor = "pointer";

        item.appendChild(this.buildTypeBadgeForSearch(result));

        const name = htmlEl("span", { class: "rm-search-name" });
        name.textContent = result.displayName;
        item.appendChild(name);

        item.addEventListener("click", () => { this.onStep2Select(result); });
        return item;
    }

    private buildTypeBadgeForSearch(result: ResourceSearchResult): HTMLElement
    {
        const factory = (window as unknown as Record<string, unknown>)["createTypeBadge"] as
            ((opts: Record<string, unknown>) => HTMLElement) | undefined;
        if (factory)
        {
            return factory({
                typeKey: result.typeKey,
                icon: result.icon,
                color: result.color,
                size: "sm",
                variant: "subtle"
            });
        }
        const span = htmlEl("span", { class: "rm-type-fallback" });
        span.textContent = result.typeKey;
        return span;
    }

    private onStep2Select(result: ResourceSearchResult): void
    {
        this.selectedTarget = result;
        const hasProps = this.selectedRelDef?.propertiesSchema
            && Object.keys(this.selectedRelDef.propertiesSchema).length > 0;
        if (hasProps)
        {
            this.addStep = 3;
            this.renderAddPanel();
        }
        else
        {
            this.submitRelationship({});
        }
    }

    private renderStep3(): void
    {
        const wrap = htmlEl("div", { class: "rm-step-content" });
        const label = htmlEl("div", { class: "rm-step-label" });
        label.textContent =
            `${this.selectedRelDef!.displayName} \u2192 ${this.selectedTarget!.displayName}`;
        wrap.appendChild(label);

        const form = this.buildStep3Form();
        wrap.appendChild(form);
        this.addPanelEl!.appendChild(wrap);
    }

    private buildStep3Form(): HTMLElement
    {
        const form = htmlEl("form", { class: "rm-props-form" });
        form.addEventListener("submit", (e) =>
        {
            e.preventDefault();
            this.onStep3Submit(form);
        });

        const schema = this.selectedRelDef?.propertiesSchema ?? {};
        for (const [key, def] of Object.entries(schema))
        {
            form.appendChild(this.buildFormField(key, def as Record<string, unknown>));
        }

        const actions = htmlEl("div", { class: "rm-form-actions" });
        const cancelBtn = htmlEl("button", {
            class: "rm-action-btn",
            type: "button"
        }, "Cancel");
        cancelBtn.addEventListener("click", () => { this.closeAddPanel(); });
        actions.appendChild(cancelBtn);

        const createBtn = htmlEl("button", {
            class: "rm-action-btn rm-create-btn",
            type: "submit"
        }, "Create");
        actions.appendChild(createBtn);
        form.appendChild(actions);

        return form;
    }

    private buildFormField(
        key: string,
        def: Record<string, unknown>
    ): HTMLElement
    {
        const group = htmlEl("div", { class: "rm-form-group" });
        const fieldLabel = htmlEl("label", { class: "rm-form-label" });
        fieldLabel.textContent = (def["title"] as string) ?? key;
        group.appendChild(fieldLabel);

        const type = (def["type"] as string) ?? "string";
        let input: HTMLElement;

        if (type === "number")
        {
            input = htmlEl("input", {
                type: "number",
                name: key,
                class: "rm-form-input"
            });
        }
        else if (type === "boolean")
        {
            input = htmlEl("input", {
                type: "checkbox",
                name: key,
                class: "rm-form-check"
            });
        }
        else
        {
            input = htmlEl("input", {
                type: "text",
                name: key,
                class: "rm-form-input"
            });
        }
        group.appendChild(input);
        return group;
    }

    private onStep3Submit(form: HTMLElement): void
    {
        const formData = new FormData(form as HTMLFormElement);
        const props: Record<string, unknown> = {};
        formData.forEach((value, key) =>
        {
            props[key] = value;
        });
        this.submitRelationship(props);
    }

    private submitRelationship(properties: Record<string, unknown>): void
    {
        if (!this.selectedRelDef || !this.selectedTarget) { return; }

        const request: CreateRelationshipRequest = {
            targetResourceId: this.selectedTarget.id,
            relationshipKey: this.selectedRelDef.key,
            properties
        };

        this.opts.onCreateRelationship?.(request).then(() =>
        {
            this.closeAddPanel();
            logInfo("Relationship created:", request.relationshipKey);
        });
    }
}

// ============================================================================
// FACTORY
// ============================================================================

/** Create a RelationshipManager instance. */
// @entrypoint
export function createRelationshipManager(
    options: RelationshipManagerOptions
): RelationshipManager
{
    return new RelationshipManagerImpl(options);
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

(window as unknown as Record<string, unknown>).RelationshipManagerImpl = RelationshipManagerImpl;
(window as unknown as Record<string, unknown>).createRelationshipManager = createRelationshipManager;
