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
    /**
     * The reverse-direction label, when the definition has one.
     *
     * OPTIONAL, corrected 2026-10-23. It was declared required and is
     * read NOWHERE in this component — the only other mentions are two
     * test fixtures. Declaring it required never made it arrive: the
     * apps team's API drops a null rather than sending one, so a
     * renderer called `.replace` on `undefined` the first time a tenant
     * created a definition with no inverse. A required field nothing
     * reads is a promise extracted from the caller for no benefit.
     */
    inverseName?: string;
    targetTypeKeys: string[] | null;
    sourceTypeKeys: string[] | null;
    cardinality: string;
    /**
     * The form shown at step 3 of the Add flow, one field per key. Each entry
     * is read as `{ title?: string; type?: "string" | "number" | "boolean" }`;
     * a definition without it creates the relationship as soon as the user
     * picks a target.
     */
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
    /** Extra values, shown as "key: value" text after the date. Required; pass {} for none. */
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
    /**
     * The type badge's colour, as #RGB or #RRGGBB hex. A colour in any other
     * form gives the badge an unusable background.
     * @pattern ^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$
     */
    color?: string;
}

/** What onSearchTargets asks for: the text the user typed and the definition's target types. */
export interface ResourceSearchRequest
{
    query: string;
    typeKeys: string[];
}

/** Configuration for RelationshipManager. */
export interface RelationshipManagerOptions
{
    container: HTMLElement;
    /** The id of the resource whose relationships are shown. Context only: the component does not render it. */
    resourceId: string;
    /** The type of that resource. Context only: the component does not render it. */
    resourceType: string;
    /** The name of that resource, written to the log. The header reads "Relationships (N)", not this name. */
    resourceDisplayName: string;
    /**
     * The relationship types the user can add, listed at step 1 of the Add
     * flow. Each definition's targetTypeKeys go to the target search.
     */
    relationshipDefinitions: RelationshipDefinitionSummary[];
    /**
     * The relationships shown, grouped by relationshipDisplayName; those with
     * provenance "ai_inferred" form an "AI Suggested" group with Confirm and
     * Dismiss buttons. The component never changes this list itself: answer
     * each create, delete, confirm or dismiss by writing the new list.
     */
    relationships: RelationshipInstance[];
    /** Hide the Add button and each row's delete button. Default: false. */
    readOnly?: boolean;
    /**
     * Show the Add button. Default: inferred from onCreateRelationship
     * presence. Over A2UI no callback is passed, so set this to true to let
     * the user add relationships.
     */
    showAddButton?: boolean;
    /** The definition keys offered at step 1 of the Add flow. Default: every definition. */
    allowedRelationshipKeys?: string[];
    /** Show each relationship's provenance as a badge. Default: true. */
    showProvenance?: boolean;
    /**
     * Nothing reads this option: the confidence badge always shows for
     * AI-inferred relationships that carry a confidence.
     */
    showConfidence?: boolean;
    /** Group the relationships by type under collapsible headers. Default: true. */
    groupByType?: boolean;
    onCreateRelationship?: (req: CreateRelationshipRequest) => Promise<void>;
    onDeleteRelationship?: (relationshipId: string) => Promise<void>;
    onEditProperties?: (id: string, props: Record<string, unknown>) => Promise<void>;
    onNavigate?: (resourceId: string) => void;
    onConfirmInferred?: (relationshipId: string) => Promise<void>;
    onDismissInferred?: (relationshipId: string) => Promise<void>;
    onSearchResources?: (query: string, typeKeys: string[]) => Promise<ResourceSearchResult[]>;
    /**
     * The target search at step 2 of the Add flow, as one request object
     * (additive, readiness step 2 B7): the same search as onSearchResources,
     * which takes two parameters. Pass one or the other; passing both throws.
     */
    onSearchTargets?: (request: ResourceSearchRequest) => Promise<ResourceSearchResult[]>;

    // -- CategorizedDataInlineToolbar pattern (ADR-128) --
    /**
     * Mount an InlineToolbar in the panel header offering sort asc/desc by
     * group name, expand-all, and collapse-all. Default: false (opt-in).
     * Throws when window.createInlineToolbar is not loaded.
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

    /** The component's root element, or null after destroy() (additive, readiness step 2 B7). */
    getElement(): HTMLElement | null;

    /**
     * The surface contract (additive): replaces the rows from the "relationships" slot silently (no callback,
     * no channel). An open Add panel keeps its step, chosen type, typed query and results; collapsed groups,
     * the sort and the list's scroll stay. Any other slot, or a value that is not an array of relationships
     * with ids, throws.
     */
    setData(slot: string, value: unknown): void;

    /**
     * Subscribes to "createRelationship" ({ targetResourceId, relationshipKey, properties }),
     * "deleteRelationship", "confirmInferred" or "dismissInferred" (the relationship id), or "navigate" (the
     * other resource's id); any other channel throws. Each fires after its legacy callback, and without it;
     * createRelationship fires once onCreateRelationship's promise settles, or at once without it, which also
     * closes the Add panel. Payloads are plain JSON copies. Returns the unsubscribe.
     */
    on(channel: string, handler: (payload: unknown) => void): () => void;

    /** { sortMode, collapsed }: "asc", "desc" or null, and the collapsed group names. */
    getState(): Record<string, unknown>;

    /**
     * Silently (no onSortModeChange, no onCollapseStateChange, no channel) restores the keys given. An unknown
     * sortMode, or a collapsed that is not an array of group names, throws.
     */
    setState(state: Record<string, unknown>): void;
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
// SURFACE CONTRACT HELPERS (readiness step 2 B7)
// ============================================================================

/** The channels on() accepts (surface contract, B7). */
const SURFACE_CHANNELS = [
    "createRelationship", "deleteRelationship", "navigate", "confirmInferred", "dismissInferred",
] as const;
type SurfaceChannel = typeof SURFACE_CHANNELS[number];

/** The sort modes setState accepts, as getSortMode() reports them. */
const SORT_MODES: readonly RelationshipSortMode[] = ["asc", "desc", null];

/** True for a non-null object that is not an array. */
function isPlainRecord(value: unknown): value is Record<string, unknown>
{
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** A plain-JSON copy for a channel payload, sharing nothing with the component's state. */
function toJsonCopy<T>(value: T): T
{
    return JSON.parse(JSON.stringify(value)) as T;
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
    // `addPanelOpen` LEFT ON 2026-10-21 (UNUSED-1): it mirrored
    // `addPanelEl.style.display` and nothing read it.
    // The same answer SearchBox's `isLoading` got -- a field
    // that mirrors live DOM state has no reader because the
    // DOM is the state.

    // Add flow state
    private addStep = 0;
    private selectedRelDef: RelationshipDefinitionSummary | null = null;
    private selectedTarget: ResourceSearchResult | null = null;
    private searchDebounceTimer: number | null = null;

    /** Surface contract channel subscribers, one Set per declared channel (B7). */
    private readonly channelHandlers = new Map<string, Set<(payload: unknown) => void>>(
        SURFACE_CHANNELS.map((channel) => [channel, new Set()]));

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
        for (const handlers of this.channelHandlers.values()) { handlers.clear(); }
        logInfo("Destroyed.");
    }

    /** The component's root element, or null after destroy(). */
    public getElement(): HTMLElement | null
    {
        return this.root;
    }

    // ====================================================================
    // SURFACE CONTRACT (additive, readiness step 2 B7)
    // ====================================================================

    /**
     * Replaces the rows from the "relationships" slot silently: no callback
     * and no channel. An agent rewrites the list after each event (B7-1), so
     * what the user is in the middle of stays: an open Add panel keeps its
     * step, chosen type, typed query and results (the list re-renders
     * without it), collapsed groups and the sort stay, and the list keeps
     * its scroll, which clearing and refilling it would reset.
     *
     * @param slot - Must be "relationships"
     * @param value - The whole list, each row as RelationshipInstance describes it
     */
    public setData(slot: string, value: unknown): void
    {
        if (slot !== "relationships")
        {
            throw new Error(
                `${LOG_PREFIX} setData: unknown slot "${slot}". `
                + 'This component declares one slot, "relationships".');
        }

        if (!Array.isArray(value))
        {
            throw new Error(
                `${LOG_PREFIX} setData("relationships"): expected an array of relationships, got `
                + `${value === null ? "null" : typeof value}. Pass the whole list.`);
        }

        const missing = value.findIndex((row) => !isPlainRecord(row) || typeof row.id !== "string");

        if (missing >= 0)
        {
            throw new Error(
                `${LOG_PREFIX} setData("relationships"): relationship ${missing} is not a relationship with a `
                + "string id. Each entry is a RelationshipInstance.");
        }

        this.renderKeepingScroll(() => { this.relationships = [...(value as RelationshipInstance[])]; });
        logDebug("setData(relationships):", this.relationships.length, "relationships");
    }

    /**
     * Subscribes to a declared channel.
     *
     * @param channel - One of SURFACE_CHANNELS
     * @param handler - Receives each payload
     * @returns The unsubscribe
     */
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

    /**
     * The view state: the group sort mode and the collapsed group names
     * ("AI Suggested" included).
     *
     * @returns A JSON-serialisable record of the declared stateKeys
     */
    public getState(): Record<string, unknown>
    {
        return { sortMode: this.sortMode, collapsed: [...this.collapsedGroups] };
    }

    /**
     * Restores state captured by getState() silently: unlike setSortMode,
     * expandAll and collapseAll, no onSortModeChange, no
     * onCollapseStateChange and no channel. Keys left out (or undefined) are
     * left alone. A collapsed name with no group today is kept, so that
     * group starts collapsed when its rows arrive.
     *
     * @param state - A partial getState() record
     */
    public setState(state: Record<string, unknown>): void
    {
        const { sortMode, collapsed } = state;

        if (sortMode !== undefined && !SORT_MODES.includes(sortMode as RelationshipSortMode))
        {
            throw new Error(
                `${LOG_PREFIX} setState: sortMode must be "asc", "desc" or null, got ${JSON.stringify(sortMode)}.`);
        }

        if (collapsed !== undefined
            && !(Array.isArray(collapsed) && collapsed.every((key) => typeof key === "string")))
        {
            throw new Error(`${LOG_PREFIX} setState: collapsed must be an array of group names.`);
        }

        this.renderKeepingScroll(() =>
        {
            if (sortMode !== undefined)
            {
                this.sortMode = sortMode as RelationshipSortMode;
                this.syncToolbarSortButtons();
            }

            if (collapsed !== undefined) { this.collapsedGroups = new Set(collapsed as string[]); }
        });
    }

    /**
     * Delivers a channel payload to each subscriber, isolated by try/catch.
     * The caller has already invoked the legacy callback. Each subscriber
     * gets its own fresh copy, built only when somebody listens.
     *
     * @param channel - The declared channel
     * @param buildPayload - Builds a plain-JSON payload
     */
    private emitChannel(channel: SurfaceChannel, buildPayload: () => unknown): void
    {
        for (const handler of this.channelHandlers.get(channel)!)
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
     * Applies a silent change and re-renders the list, keeping its scroll:
     * renderList() empties the list before refilling it, which resets it.
     *
     * @param change - Mutates the component's state; fires nothing
     */
    private renderKeepingScroll(change: () => void): void
    {
        const scrollTop = this.listEl?.scrollTop ?? 0;

        change();
        this.rebuild();

        if (this.listEl) { this.listEl.scrollTop = scrollTop; }
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
        // Canvas anchors name this region rather than counting it (ADR-162).
        this.listEl.setAttribute(
            "data-dui-region", "relationshipmanager:list");
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
        const factory = window["createTypeBadge"] as
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
        const tail: string[] = [rel.createdAt.substring(0, 10)];

        // Inline edge properties
        for (const [k, v] of Object.entries(rel.properties))
        {
            tail.push(`${k}: ${String(v)}`);
        }

        meta.appendChild(
            document.createTextNode(`${rel.otherResourceType} \u00b7 `));

        // THE PROVENANCE WAS PUSHED INTO THE TEXT LINE AS A BARE
        // UPPERCASED STRING, and `buildProvenanceBadge` -- which
        // wraps it in the `.rm-provenance` span the SCSS styles --
        // had no caller. The README calls the option "Show
        // provenance BADGES". The compiler had been reporting the
        // builder as unused since it was written (UNUSED-1).
        //
        // The rendered TEXT is unchanged, so anything reading
        // `textContent` reads what it did before; only the span and
        // its styling are new.
        if (this.opts.showProvenance !== false)
        {
            meta.appendChild(this.buildProvenanceBadge(rel.provenance));
            meta.appendChild(document.createTextNode(" \u00b7 "));
        }

        meta.appendChild(document.createTextNode(tail.join(" \u00b7 ")));
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
        this.emitChannel("confirmInferred", () => id);
    }

    private handleDismissInferred(id: string): void
    {
        this.opts.onDismissInferred?.(id);
        this.emitChannel("dismissInferred", () => id);
    }

    private handleDelete(id: string): void
    {
        const confirmDialog = window["showConfirmDialog"] as
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
                if (confirmed) { this.confirmDelete(id); }
            });
        }
        else
        {
            if (confirm("Delete this relationship?"))
            {
                this.confirmDelete(id);
            }
        }
    }

    /** The user said yes to deleting `id`: the legacy callback, then the channel. */
    private confirmDelete(id: string): void
    {
        this.opts.onDeleteRelationship?.(id);
        this.emitChannel("deleteRelationship", () => id);
    }

    private handleNavigate(resourceId: string): void
    {
        this.opts.onNavigate?.(resourceId);
        this.emitChannel("navigate", () => resourceId);
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
        this.addStep = 1;
        this.selectedRelDef = null;
        this.selectedTarget = null;
        this.renderAddPanel();
    }

    private closeAddPanel(): void
    {
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
            logTrace("input handler");
            this.runSearch(input.value);
        });
        wrap.appendChild(input);

        const resultsEl = htmlEl("div", { class: "rm-search-results" });
        resultsEl.setAttribute(
            "data-dui-region", "relationshipmanager:search-results");
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
            if (this.opts.onSearchResources)
            {
                this.opts.onSearchResources(query, typeKeys).then((results) =>
                {
                    this.renderSearchResults(results);
                });
                return;
            }
            // The single-object variant (B7). Over A2UI the agent answers it,
            // and a request it never answers rejects; the adapter has already
            // reported that on the surface, so the results stay as they were.
            this.opts.onSearchTargets?.({ query, typeKeys }).then((results) =>
            {
                this.renderSearchResults(results);
            }, (err: unknown) => { logError("onSearchTargets rejected:", err); });
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
        const factory = window["createTypeBadge"] as
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

        if (this.opts.onCreateRelationship)
        {
            this.opts.onCreateRelationship(request).then(() =>
            {
                this.closeAddPanel();
                logInfo("Relationship created:", request.relationshipKey);
                this.emitChannel("createRelationship", () => toJsonCopy(request));
            });
            return;
        }

        // No callback to wait for (over A2UI): the subscriber hears the
        // request, and the agent answers by writing the new relationships.
        // With no subscriber either, nothing happens, as before (B7).
        if (this.channelHandlers.get("createRelationship")!.size > 0)
        {
            this.emitChannel("createRelationship", () => toJsonCopy(request));
            this.closeAddPanel();
            logInfo("Relationship requested:", request.relationshipKey);
        }
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
    // ERR-2. AGENTS.md: a missing option throws, it does not
    // get a silent default. This used to reach the field and
    // crash a frame later with a TypeError that names the line
    // rather than the thing the caller left out. Absent means
    // undefined, so an empty array or a zero is present.
    if (options.resourceId === undefined)
    {
        throw new Error(
            `${LOG_PREFIX} options.resourceId is required. `
            + "Pass it when creating the RelationshipManager.");
    }

    if (options.resourceType === undefined)
    {
        throw new Error(
            `${LOG_PREFIX} options.resourceType is required. `
            + "Pass it when creating the RelationshipManager.");
    }

    if (options.resourceDisplayName === undefined)
    {
        throw new Error(
            `${LOG_PREFIX} options.resourceDisplayName is required. `
            + "Pass it when creating the RelationshipManager.");
    }

    if (options.relationshipDefinitions === undefined)
    {
        throw new Error(
            `${LOG_PREFIX} options.relationshipDefinitions is required. `
            + "Pass it when creating the RelationshipManager.");
    }
    if (options.relationships === undefined)
    {
        throw new Error(
            `${LOG_PREFIX} options.relationships is required. `
            + "Pass it when creating the RelationshipManager.");
    }

    // The two forms of the target search are one search; with both, neither
    // could be chosen without silently ignoring the other (B7).
    if (options.onSearchResources && options.onSearchTargets)
    {
        throw new Error(
            `${LOG_PREFIX} options.onSearchResources and options.onSearchTargets are both set. `
            + "They are the same target search; pass one of them.");
    }

    // ERR-1. A caller that named a container asked for that container.
    // `options.container.appendChild` on a null container used to throw
    // "Cannot read properties of null", which names the line that broke
    // rather than the thing the caller got wrong.
    if (!options.container)
    {
        throw new Error(
            `${LOG_PREFIX} options.container was not an element. `
            + "Pass the element to mount into, and check it for null before you do.");
    }

    return new RelationshipManagerImpl(options);
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

window.createRelationshipManager = createRelationshipManager;
