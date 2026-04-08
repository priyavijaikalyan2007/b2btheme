<!-- AGENT: Product Requirements Document for the ExplorerPicker component — resource selection picker with tree browsing, search, and quick-access sections for cross-app linking workflows. -->

# ExplorerPicker — Product Requirements Document

**Status:** Draft
**Component name:** ExplorerPicker
**Folder:** `./components/explorerpicker/`
**Spec author:** Agent
**Date:** 2026-04-05
**Intake:** `specs/explorerpicker.req.md` (Platform Engineering request, 2026-04-02)
**Blocks:** Phase 1 of Cross-App Creation & Linking (`specs/cross-app-creation.prd.md`)

---

## 1. Overview

### 1.1 What Is It

A reusable resource-selection widget that renders an Explorer tree in "picker mode." Users browse the organisational hierarchy or search by name to select one or more resources, then confirm their selection. The component is **self-contained** — a single CSS + JS file pair deployable via CDN with no runtime dependency on other library components.

Think of it as a file-picker dialog, but for Explorer resources (diagrams, checklists, brainstorm sessions, external links, folders, and org units). The component is brand-agnostic — it works in any application that exposes the Explorer API contract.

### 1.2 Why Build It

Five cross-app workflows require users to select Explorer resources:

| Context | Rendering | Selection |
|---------|-----------|-----------|
| "Link to..." dialog (all 4 apps) | Modal via FormDialog | Single or multi |
| "Create From..." destination picker | Modal via FormDialog | Single (container only) |
| Browser plugin sidebar | Inline panel | Single |
| Details panel "Related" tab → "Link" | Modal via FormDialog | Multi |
| Future: Ontology Visualiser → "Add node" | Inline popover | Single |

Without a shared picker, each app would implement its own tree-selection UI — leading to inconsistent UX, duplicated code, and integration fragility.

### 1.3 Design Inspiration

| Source | Key Pattern Adopted |
|--------|---------------------|
| Google Drive file picker | Tree + search + breadcrumbs + recent items section |
| SharePoint document picker | Tree navigation with lazy-loaded folders, resource type icons |
| Slack channel picker | Search-first with tree fallback, keyboard navigation |
| Figma "Move to project" dialog | Clean modal with tree, search bar at top, breadcrumb trail |
| GitHub "Move issue to project" dialog | Simple tree with search, recently used items at top |

**Key UX principle:** The picker supports two equally important interaction patterns:

1. **Search** — The user knows *what* they are looking for but not necessarily *where* it lives. They type a few characters, scan results with breadcrumb paths for disambiguation, and pick. Breadcrumbs under each search result are essential — in large organisations, multiple resources often share similar names and the path is the only way to tell them apart.
2. **Tree browsing** — The user knows *where* the resource lives in the organisational hierarchy. They expand the tree to the right folder/org unit and pick directly. This is especially common for "Create From..." destination selection where the user is choosing a container.

Both paths converge at the same selection + confirm flow.

### 1.4 Architecture Decision: Self-Contained Component

The existing TreeView component (5,160 lines) provides lazy loading, virtual scrolling, multi-select, keyboard nav, search, and starred items. However, ExplorerPicker must work as a **standalone CDN script** in contexts where TreeView may not be loaded (browser plugins, third-party integrations, Office/Google Docs sidebars).

**Decision:** ExplorerPicker inlines a purpose-built tree renderer borrowing patterns from TreeView but scoped to selection-only concerns. It does **not** include drag-and-drop, inline rename, or context menus — features that are irrelevant to a picker.

### 1.5 Scale Considerations

As applications are adopted by hyperscale enterprises (50,000+ employees), the number of resources visible to any given user can grow to 5,000–10,000+ nodes. The picker must handle this gracefully:

- **Lazy loading** is the primary scaling mechanism — only root nodes load initially; children load on expand. This keeps the initial payload small regardless of total tree size.
- **Flat-list virtual scrolling** for the visible (expanded) portion of the tree. When the user expands deeply nested subtrees, the visible list can grow to thousands of rows. The tree uses a windowed rendering approach (similar to TreeView's virtual scrolling): only DOM nodes within the viewport ± a buffer are materialised. Scroll position is mapped to the flat visible-node array.
- **Search pagination** with a "Load more results" control at the bottom of search results. The initial page fetches 20 results; each "Load more" fetches the next page.
- **O(1) node lookups** via `nodeMap` (Map) and `childrenMap` (Map) — no recursive tree walks for selection, breadcrumb computation, or expand/collapse.

This keeps the component self-contained (~2,000–3,000 lines) and deployable as a single `<script>` tag.

---

## 2. Anatomy

### 2.1 Browse Mode (Default)

```
┌─────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────┐    │
│  │  🔍  Search resources...                    ✕   │    │  ← Search input (always visible)
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ── Recent ─────────────────────────────────────────    │  ← Quick-access section (collapsible)
│  📊 System Architecture          diagrams.diagram       │
│  ✅ Onboarding Checklist         checklists.template    │
│  💡 Q2 Planning Brainstorm       thinker.session        │
│                                                         │
│  ── Starred ────────────────────────────────────────    │  ← Starred section (collapsible)
│  ⭐ Platform Team Diagrams        FOLDER                │
│                                                         │
│  ── Browse ─────────────────────────────────────────    │  ← Tree section (scrollable)
│  ▼ 🏢 Engineering                                       │
│    ▼ 🏢 Platform Team                                   │
│      ▸ 📁 Architecture Diagrams                         │
│      ☑ 📊 System Architecture    ← selected             │
│      ☐ ✅ Onboarding Checklist                          │
│    ▸ 🏢 Product Team                                    │
│  ▸ 🏢 Marketing                                        │
│  ▸ 📁 Unassigned                                       │
│                                                         │
│  ── Breadcrumb ─────────────────────────────────────    │  ← Path of focused/selected node
│  Engineering > Platform Team > System Architecture      │
│                                                         │
│  ┌─────────────┐  ┌─────────────────────────────┐      │
│  │   Cancel     │  │   Select (1 selected)   ✓   │      │  ← Action buttons
│  └─────────────┘  └─────────────────────────────┘      │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Search Mode (Active Query)

When the user types in the search input, the tree + quick-access sections are replaced by flat results:

```
┌─────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────┐    │
│  │  🔍  archit                                 ✕   │    │  ← Active search
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ── Results (3) ────────────────────────────────────    │
│  ☑ 📊 System Architecture                              │
│       Engineering > Platform Team                       │  ← Breadcrumb per result
│  ☐ 📊 Data Architecture                                │
│       Engineering > Data Team                           │
│  ☐ 📄 Architecture Decision Records                    │
│       Engineering > Platform Team > Docs                │
│                                                         │
│  ── Breadcrumb ─────────────────────────────────────    │
│  Engineering > Platform Team > System Architecture      │
│                                                         │
│  ┌─────────────┐  ┌─────────────────────────────┐      │
│  │   Cancel     │  │   Select (1 selected)   ✓   │      │
│  └─────────────┘  └─────────────────────────────┘      │
└─────────────────────────────────────────────────────────┘
```

### 2.3 Container Selection Mode (`selectionTarget: 'container'`)

Only ORG_UNIT and FOLDER nodes are selectable; assets are dimmed:

```
┌─────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────┐    │
│  │  🔍  Search folders...                      ✕   │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ── Select destination ─────────────────────────────    │
│  ▼ 🏢 Engineering                    ← selectable       │
│    ▼ 🏢 Platform Team                ← selectable       │
│      📁 Architecture Diagrams        ← selectable       │
│        📊 System Architecture        ← dimmed (asset)   │
│    ▸ 🏢 Product Team                 ← selectable       │
│  ▸ 🏢 Marketing                      ← selectable       │
│                                                         │
│  ┌─────────────┐  ┌─────────────────────────────┐      │
│  │   Cancel     │  │   Select Folder         ✓   │      │
│  └─────────────┘  └─────────────────────────────┘      │
└─────────────────────────────────────────────────────────┘
```

### 2.4 DOM Structure

```
div.explorerpicker                               ← root
├── div.explorerpicker-search                     ← search bar row
│   ├── i.bi-search                                ← search icon
│   ├── input[type=text]                           ← search input
│   └── button.explorerpicker-search-clear        ← clear / spinner
├── div.explorerpicker-body                       ← scrollable middle area
│   ├── div.explorerpicker-section (Recent)       ← quick-access: recent
│   │   ├── div.explorerpicker-section-header
│   │   └── div.explorerpicker-section-items
│   │       └── div.explorerpicker-quick-item *N
│   ├── div.explorerpicker-section (Starred)      ← quick-access: starred
│   │   └── ...
│   ├── div.explorerpicker-section (Browse)       ← tree section
│   │   ├── div.explorerpicker-section-header
│   │   └── ul.explorerpicker-tree[role=tree]
│   │       └── li.explorerpicker-node[role=treeitem] *N
│   │           ├── div.explorerpicker-node-row
│   │           │   ├── button.explorerpicker-toggle  ← expand/collapse arrow
│   │           │   ├── span.explorerpicker-checkbox   ← multi-select only
│   │           │   ├── i.explorerpicker-icon          ← node type icon
│   │           │   ├── span.explorerpicker-label      ← node name
│   │           │   └── span.explorerpicker-type-badge ← resource type label
│   │           └── ul.explorerpicker-children         ← nested children
│   └── div.explorerpicker-section (Results)      ← search results (replaces tree)
│       ├── div.explorerpicker-section-header
│       └── div.explorerpicker-results
│           └── div.explorerpicker-result-item *N
│               ├── span.explorerpicker-checkbox
│               ├── i.explorerpicker-icon
│               ├── span.explorerpicker-label
│               └── span.explorerpicker-result-path   ← breadcrumb
├── div.explorerpicker-breadcrumb                 ← selection breadcrumb bar
│   └── span.explorerpicker-crumb *N              ← clickable path segments
├── div.explorerpicker-footer                     ← action buttons
│   ├── button.explorerpicker-btn-cancel          ← Cancel (omitted if no onCancel)
│   └── button.explorerpicker-btn-confirm         ← Select / Select Folder
├── div.explorerpicker-loading                    ← skeleton loader overlay
├── div.explorerpicker-error                      ← error banner
└── div.explorerpicker-live[aria-live=polite]     ← screen reader announcements
```

---

## 3. API

### 3.1 Data Types

```typescript
/**
 * Node types in the Explorer tree.
 */
export type ExplorerNodeType = "ORG_UNIT" | "FOLDER" | "ASSET_REF" | "LINK";

/**
 * A node returned by the Explorer API.
 * The picker consumes these and does not mutate them.
 */
export interface ExplorerNode
{
    /** Unique node ID from the explorer service. */
    id: string;

    /** Display name. */
    name: string;

    /** Node type. */
    nodeType: ExplorerNodeType;

    /**
     * Resource registry ID (ASSET_REF and LINK nodes).
     * Null for ORG_UNIT and FOLDER.
     */
    resourceId: string | null;

    /**
     * Resource type slug from resource registry.
     * e.g. "diagrams.diagram", "checklists.template".
     * Null for ORG_UNIT and FOLDER.
     */
    resourceType: string | null;

    /**
     * App-specific source ID (e.g. diagram UUID).
     * Null for ORG_UNIT and FOLDER.
     */
    sourceId: string | null;

    /** URL for LINK nodes. Null for other types. */
    url: string | null;

    /**
     * Legacy link type slug for LINK nodes (e.g. "google_docs", "sharepoint").
     * Used as fallback for icon resolution when ontology type is not found.
     * Null for non-LINK nodes.
     */
    linkType: string | null;

    /** Whether this node has children that can be lazy-loaded. */
    hasChildren: boolean;

    /** Icon class override from the API. Optional — auto-resolved via ontology. */
    icon?: string;

    /** Parent node ID. Null for root-level nodes. */
    parentId: string | null;
}

/**
 * The shape returned by onConfirm and onSelectionChange.
 * Enriched version of ExplorerNode with computed breadcrumb.
 */
export interface ExplorerPickerSelection
{
    /** The explorer node ID. */
    nodeId: string;

    /** The resource_registry ID (null for FOLDER nodes). */
    resourceId: string | null;

    /** Display name of the selected node. */
    name: string;

    /** Node type. */
    nodeType: ExplorerNodeType;

    /**
     * Resource type from resource_registry (e.g. "diagrams.diagram").
     * Null for FOLDER/ORG_UNIT nodes.
     */
    resourceType: string | null;

    /**
     * App-specific source ID from resource_registry.
     * Null for FOLDER/ORG_UNIT nodes.
     */
    sourceId: string | null;

    /**
     * Human-readable breadcrumb path.
     * e.g. "Engineering > Platform Team > Architecture Diagrams"
     */
    breadcrumb: string;

    /** URL for LINK nodes. Null for other types. */
    url: string | null;
}
```

### 3.2 Ontology Type Entry

```typescript
/**
 * A single entry from the ontology type catalog.
 * Used for icon/colour resolution and resourceTypeFilter hierarchy matching.
 * Can be fetched at runtime or pre-loaded via options.ontologyTypes.
 */
export interface OntologyTypeEntry
{
    /** Type key, e.g. "diagrams.diagram", "external.document.google_doc". */
    key: string;

    /** Bootstrap Icons class, e.g. "bi-diagram-3". */
    icon: string;

    /** Hex colour for the icon, e.g. "#2563EB". Optional. */
    color?: string;

    /** Parent type key for hierarchy matching. Null for root types. */
    parentTypeKey?: string | null;

    /** Whether this type represents an external resource. */
    isExternal?: boolean;
}
```

### 3.3 State Shape (Export / Restore)

```typescript
/**
 * Serialisable snapshot of picker UI state.
 * Used by exportState() / restoreState() for session continuity.
 */
export interface ExplorerPickerState
{
    /** IDs of currently expanded nodes. */
    expandedNodeIds: string[];

    /** IDs of currently selected nodes. */
    selectedNodeIds: string[];

    /** Current search query (empty string if not in search mode). */
    searchQuery: string;

    /** Scroll offset (pixels) of the body area. */
    scrollTop: number;

    /** ID of the node with keyboard focus, if any. */
    focusedNodeId: string | null;
}
```

### 3.4 Configuration Options

```typescript
export interface ExplorerPickerOptions
{
    // ── Container ──────────────────────────────────────────────────────
    /**
     * DOM element or element ID to render the picker into.
     * HTMLElement: used directly (ideal for FormDialog customContent).
     * string: resolved via document.getElementById (standard component pattern).
     */
    container: HTMLElement | string;

    // ── Mode ───────────────────────────────────────────────────────────
    /** Single-select returns one item; multi-select enables checkboxes. */
    mode?: "single" | "multi";

    /**
     * What the user is picking. Controls which node types are selectable:
     * - "resource": ASSET_REF and LINK nodes only (default).
     * - "container": ORG_UNIT and FOLDER nodes only (for destination picking).
     * - "any": All node types are selectable.
     */
    selectionTarget?: "resource" | "container" | "any";

    // ── Filtering ──────────────────────────────────────────────────────
    /**
     * Only show ASSET_REF nodes whose resourceType matches one of these.
     * ORG_UNIT and FOLDER are always shown (they are structural containers).
     *
     * Supports ontology type hierarchy: passing an abstract parent type
     * (e.g. "external.document") matches ALL its subtypes
     * (external.document.google_doc, external.document.word, etc.)
     * via the parent_type_key hierarchy from ontology type definitions.
     *
     * Example: ["diagrams.diagram", "checklists.template"]
     * Example: ["external.document"] — matches all document subtypes
     */
    resourceTypeFilter?: string[];

    /**
     * Node IDs that cannot be selected.
     * Nodes are visible but dimmed. Hovering shows a tooltip ("Cannot link to itself").
     * Primary use: prevent linking a resource to itself.
     */
    excludeNodeIds?: string[];

    /**
     * Hide system folders (Trash, Personal, Unassigned) from the tree.
     * Default: true.
     */
    hideSystemFolders?: boolean;

    // ── Initial State ──────────────────────────────────────────────────
    /**
     * Start with this node expanded and scrolled into view.
     * The picker calls batch-children to load the ancestor chain on init.
     */
    initialExpandedNodeId?: string;

    /**
     * Pre-selected node IDs (multi-select mode).
     * The picker highlights these on render; they can be deselected.
     */
    preSelectedNodeIds?: string[];

    // ── Data Fetching ──────────────────────────────────────────────────
    /**
     * Base URL for Explorer API calls.
     * Default: "/api/v1/explorer".
     *
     * The picker calls these endpoints internally:
     *   GET  {apiBase}/tree?assetTypes={filter}
     *   GET  {apiBase}/nodes/{id}/children?assetTypes={filter}
     *   GET  {apiBase}/search?q=...&types={filter}&pageSize=20&cursor={cursor}
     *   POST {apiBase}/nodes/batch-children
     *   GET  {apiBase}/recent
     *   GET  {apiBase}/starred
     *
     * Override this for browser plugin use (full URL with origin).
     */
    apiBase?: string;

    /**
     * Custom fetch function for API calls.
     * Default: window.fetch.
     * Override for browser plugin auth (inject Bearer token), testing, etc.
     */
    fetchFn?: typeof fetch;

    // ── Quick-Access Sections ──────────────────────────────────────────
    /**
     * Show a "Recent Items" section above the tree.
     * Default: true.
     */
    showRecentItems?: boolean;

    /**
     * Show a "Starred" section above the tree.
     * Default: true.
     */
    showStarredItems?: boolean;

    /**
     * Max items in each quick-access section.
     * Default: 5.
     */
    quickAccessLimit?: number;

    // ── Appearance ─────────────────────────────────────────────────────
    /**
     * Search input placeholder.
     * Default: "Search resources..." (or "Search folders..." in container mode).
     */
    searchPlaceholder?: string;

    /** Empty state message when search returns no results. */
    emptySearchMessage?: string;

    /** Empty state message when the tree has no nodes. */
    emptyTreeMessage?: string;

    /**
     * Height of the picker. Default: "400px".
     * Set to "100%" for inline/sidebar rendering.
     */
    height?: string;

    /** Additional CSS class(es) on the root element. */
    cssClass?: string;

    /**
     * Optional callback to resolve a Bootstrap Icons class for a node.
     * Takes highest priority in the icon resolution chain (see §5.3.4):
     *   iconResolver → ontology type icon → linkType legacy → fallback.
     * Return undefined to fall through to the next resolution step.
     */
    iconResolver?: (node: ExplorerNode) => string | undefined;

    // ── Ontology API ───────────────────────────────────────────────────
    /**
     * Base URL for the ontology type catalog API.
     * Default: "/api/v1/ontology".
     *
     * The picker calls:
     *   GET {ontologyApiBase}/schema/types
     *
     * This is separate from apiBase because the ontology API may be on a
     * different service. For browser plugins, ensure this endpoint is
     * accessible (CORS/proxy) or provide icons via iconResolver.
     */
    ontologyApiBase?: string;

    /**
     * Custom fetch function for ontology API calls.
     * Default: window.fetch.
     * Separate from fetchFn because the ontology API may require
     * different auth or be on a different origin.
     */
    ontologyFetchFn?: typeof fetch;

    /**
     * Pre-loaded ontology type catalog.
     * If provided, the picker skips the GET /ontology/schema/types call entirely.
     * Useful for browser plugins or contexts where the ontology API is not
     * directly reachable — the consuming app loads the catalog via its own
     * API layer and passes it in.
     *
     * Each entry: { key, icon, color?, parent_type_key?, is_external? }
     */
    ontologyTypes?: OntologyTypeEntry[];

    // ── Callbacks ──────────────────────────────────────────────────────
    /**
     * Called when the user confirms (clicks "Select" or double-clicks in single-select).
     * Receives enriched selection objects with breadcrumbs.
     */
    onConfirm: (selections: ExplorerPickerSelection[]) => void;

    /**
     * Called when the user cancels (clicks "Cancel" or presses Escape).
     * If omitted, the Cancel button is not rendered (inline/sidebar mode).
     */
    onCancel?: () => void;

    /**
     * Called whenever the selection changes (before confirm).
     * Useful for enabling/disabling external buttons or showing previews.
     */
    onSelectionChange?: (selections: ExplorerPickerSelection[]) => void;

    /**
     * Called when an API request fails.
     * The picker shows an inline error banner regardless; this callback is for
     * consumer-side logging or analytics.
     */
    onError?: (error: Error, context: string) => void;

    // ── Confirm Button ─────────────────────────────────────────────────
    /**
     * Custom text for the confirm button.
     * Default: "Select (N selected)" for resource/any mode,
     *          "Select Folder" for container mode.
     * Receives the current selection count for dynamic text.
     */
    confirmButtonText?: string | ((count: number) => string);

    /**
     * Custom text for the cancel button.
     * Default: "Cancel".
     */
    cancelButtonText?: string;
}
```

### 3.5 Instance API

```typescript
export interface ExplorerPicker
{
    /** Programmatically set the search query and trigger search. */
    setSearchQuery(query: string): void;

    /** Clear the current selection. */
    clearSelection(): void;

    /** Get the current selection without confirming. */
    getSelection(): ExplorerPickerSelection[];

    /** Expand a specific node in the tree. */
    expandNode(nodeId: string): void;

    /** Collapse a specific node in the tree. */
    collapseNode(nodeId: string): void;

    /** Scroll a node into view and briefly highlight it. */
    scrollToNode(nodeId: string): void;

    /** Refresh all data from the API. */
    refresh(): Promise<void>;

    /** Remove from DOM, detach listeners, null references. */
    destroy(): void;

    /** Whether the picker is currently loading data. */
    isLoading(): boolean;

    /** Return the root DOM element. */
    getElement(): HTMLElement | null;

    /** Render into a container (containerId string or HTMLElement). */
    show(container?: HTMLElement | string): void;

    /** Remove from DOM without destroying. */
    hide(): void;

    // ── State Export / Restore ──────────────────────────────────────────
    /**
     * Export the current UI state as a serialisable object.
     * Includes: expanded nodes, selected nodes, scroll position, search query.
     * Apps can persist this (e.g. sessionStorage) and restore it later
     * to give users continuity across navigation or page reloads.
     */
    exportState(): ExplorerPickerState;

    /**
     * Restore a previously exported UI state.
     * Re-expands nodes, re-selects nodes, restores scroll position and search.
     * Nodes that no longer exist in the tree are silently skipped.
     */
    restoreState(state: ExplorerPickerState): Promise<void>;
}
```

### 3.6 Factory Function & Globals

```typescript
/**
 * Convenience factory: creates an ExplorerPicker and renders it immediately.
 */
export function createExplorerPicker(
    options: ExplorerPickerOptions
): ExplorerPicker;

// Window globals (IIFE wrapper exposes these):
(window as unknown as Record<string, unknown>)["ExplorerPicker"] = ExplorerPicker;
(window as unknown as Record<string, unknown>)["createExplorerPicker"] = createExplorerPicker;
```

The factory resolves `options.container`:
- If it is an `HTMLElement`, use it directly.
- If it is a `string`, call `document.getElementById(container)`.
- If resolution fails, log an error and return a no-op instance.

---

## 4. Behaviour

### 4.1 Lifecycle

1. **Construction** — Builds DOM tree, sets up internal state maps, attaches no listeners yet.
2. **show(container?)** — Appends root element to the container, attaches event listeners, fires initial data fetch (`GET /tree` + `GET /ontology/schema/types` + optional `GET /recent` + `GET /starred`).
3. **hide()** — Removes root element from DOM, detaches global listeners (document clicks, resize).
4. **destroy()** — Calls `hide()`, clears all Maps/Sets, nulls DOM references, aborts in-flight fetches.

### 4.2 Internal State

| State | Type | Purpose |
|-------|------|---------|
| `nodeMap` | `Map<string, ExplorerNode>` | O(1) node lookup by ID |
| `childrenMap` | `Map<string, string[]>` | Parent ID → ordered child IDs |
| `expandedSet` | `Set<string>` | Currently expanded node IDs |
| `selectedSet` | `Set<string>` | Currently selected node IDs |
| `focusedNodeId` | `string \| null` | Node with keyboard focus (roving tabindex) |
| `loadedSet` | `Set<string>` | Node IDs whose children have been fetched |
| `searchQuery` | `string` | Current search input value |
| `searchResults` | `ExplorerNode[]` | Current search result list (accumulated across pages) |
| `searchCursor` | `string \| null` | Pagination cursor for next search page (null = no more pages) |
| `recentItems` | `ExplorerNode[]` | Cached recent items |
| `starredItems` | `ExplorerNode[]` | Cached starred items |
| `isSearchMode` | `boolean` | Whether search results are displayed |
| `rootNodeIds` | `string[]` | Top-level node IDs (supports multi-root trees with virtual root wrapper) |
| `ontologyTypes` | `Map<string, OntologyTypeEntry>` | Cached ontology type catalog (icon, color, parent_type_key, is_external) |
| `abortController` | `AbortController \| null` | Abort in-flight API requests |

### 4.3 Data Fetching

All API calls go through a private `apiFetch(path, options?)` method that:
1. Prepends `apiBase` to the path.
2. Uses `fetchFn` (default `window.fetch`).
3. Passes `AbortController.signal` for cancellation.
4. Parses JSON, validates response shape.
5. On error: shows inline error banner, calls `onError` callback, returns null.

| Trigger | Endpoint | Caching |
|---------|----------|---------|
| Initial render | `GET {apiBase}/tree?assetTypes={filter}` | Session-duration (stored in `nodeMap`) |
| Expand node | `GET {apiBase}/nodes/{id}/children?assetTypes={filter}` | Per-node (skip if `loadedSet` has ID) |
| Search typing (300ms debounce) | `GET {apiBase}/search?q={query}&types={filter}&pageSize=20&cursor={cursor}` | No cache (results change). Response **must** include a `breadcrumb` string per result (see §4.5.1). |
| Recent items | `GET {apiBase}/recent` | Session-duration |
| Starred items | `GET {apiBase}/starred` | Session-duration |
| `initialExpandedNodeId` | `POST {apiBase}/nodes/batch-children` | Populate ancestor chain on init |
| Ontology type catalog | `GET /api/v1/ontology/schema/types` | Session-duration (separate from Explorer API) |
| `refresh()` | Clears tree/starred caches, re-fetches (ontology cache preserved) | — |

**Race condition prevention:** Each search call increments a `searchGeneration` counter. When results arrive, stale responses (generation mismatch) are discarded. Pattern borrowed from PeoplePicker.

### 4.4 Tree Interaction

| Interaction | Behaviour |
|-------------|-----------|
| Click expand arrow (▸) | If children not loaded: show spinner on arrow, fetch via API, expand. If loaded: toggle expand/collapse. |
| Click node row | **Single mode:** replaces selection. **Multi mode:** toggles checkbox. |
| Double-click node row | **Single mode:** confirms selection immediately (calls `onConfirm`). **Multi mode:** toggles checkbox. |
| Click breadcrumb segment | Expands tree to that ancestor and scrolls it into view. |

### 4.5 Search Interaction

| Interaction | Behaviour |
|-------------|-----------|
| Type in search box | Debounce 300ms, then `GET /search?pageSize=20`. Replace tree with flat results. Each result shows its breadcrumb path for disambiguation. |
| Clear search (✕ button or backspace to empty) | Return to tree view, preserving expand/selection state. |
| Click search result | Same as tree click (select/toggle). |
| Enter in search box | Select the first result. |
| Scroll to bottom of results | If more pages available, show "Load more results" link. Click fetches next page (`cursor` param) and appends to results. |
| No results | Show empty state with `emptySearchMessage` and `bi-search` illustration. |

#### 4.5.1 Search Response Contract

The `GET {apiBase}/search` endpoint **must** return a `breadcrumb` string per result. The picker cannot reliably compute breadcrumbs for search results — results may reference nodes deep in unexpanded subtrees whose ancestor chains are not in `nodeMap`. Requiring N+1 API calls to fetch ancestors per result would create unacceptable latency.

**Required response shape per result:**

```typescript
{
    id: string;
    name: string;
    nodeType: ExplorerNodeType;
    resourceId: string | null;
    resourceType: string | null;
    sourceId: string | null;
    url: string | null;
    linkType: string | null;
    breadcrumb: string;           // ← REQUIRED — e.g. "Engineering > Platform Team"
    hasChildren: boolean;
    parentId: string | null;
}
```

**Fallback:** If the backend cannot deliver breadcrumbs in v1, the picker degrades gracefully by displaying the `resourceType` label (e.g. "diagrams.diagram") in place of the breadcrumb path. This is functional but significantly worse for disambiguation.

### 4.6 Selection Rules

| Rule | Behaviour |
|------|-----------|
| Click non-selectable node (e.g. asset in container mode) | No-op — node stays dimmed. |
| Click excluded node (`excludeNodeIds`) | No-op — tooltip "Cannot link to itself". |
| Pre-selected nodes | Highlighted on render with checkmarks. Can be deselected. |
| Confirm with zero selections | "Select" button is disabled. |
| `onSelectionChange` | Fires on every selection change (add or remove). |

### 4.7 Loading States

| State | UX |
|-------|----|
| Initial tree loading | Skeleton loader: 4 indented placeholder rows mimicking tree structure. |
| Expanding a node | Small spinner replaces the expand arrow for that node. |
| Search in progress | Spinner replaces the ✕ clear button in the search input. |
| Confirming selection | "Select" button shows spinner and is disabled. |

### 4.8 Error Handling

| Error | UX |
|-------|----|
| Tree load fails (network/5xx) | Inline error banner below search: "Unable to load resources. [Retry]" |
| Search fails | Error message in results area with retry link. |
| Node expand fails | Toast-style inline message, node remains collapsed. |
| All errors | `onError` callback fires (if provided) with error + context string. |

---

## 5. Styling

### 5.1 CSS Classes (`.explorerpicker-` prefix)

| Class | Element |
|-------|---------|
| `.explorerpicker` | Root container |
| `.explorerpicker-search` | Search bar row |
| `.explorerpicker-search-input` | Search text input |
| `.explorerpicker-search-icon` | Left search icon |
| `.explorerpicker-search-clear` | Clear / spinner button |
| `.explorerpicker-body` | Scrollable middle area |
| `.explorerpicker-section` | Section wrapper (Recent, Starred, Browse, Results) |
| `.explorerpicker-section-header` | Section heading |
| `.explorerpicker-section-items` | Section content |
| `.explorerpicker-quick-item` | Quick-access row (recent/starred) |
| `.explorerpicker-quick-item-star` | Star icon prefix on starred items (`bi-star-fill`, muted) |
| `.explorerpicker-quick-item-icon` | Quick-access item icon |
| `.explorerpicker-quick-item-name` | Quick-access item name |
| `.explorerpicker-quick-item-type` | Quick-access item type badge |
| `.explorerpicker-tree` | Tree `<ul>` |
| `.explorerpicker-node` | Tree `<li>` |
| `.explorerpicker-node-row` | Clickable row within a node |
| `.explorerpicker-node-row-selected` | Selected state |
| `.explorerpicker-node-row-focused` | Keyboard focus state |
| `.explorerpicker-node-row-dimmed` | Non-selectable (container mode / excluded) |
| `.explorerpicker-toggle` | Expand/collapse arrow button |
| `.explorerpicker-toggle-loading` | Spinner state on expand |
| `.explorerpicker-checkbox` | Multi-select checkbox |
| `.explorerpicker-checkbox-checked` | Checked checkbox |
| `.explorerpicker-icon` | Node type icon |
| `.explorerpicker-external-badge` | External-link badge overlay on icon (for `is_external` types) |
| `.explorerpicker-label` | Node name text |
| `.explorerpicker-type-badge` | Resource type label |
| `.explorerpicker-children` | Nested children `<ul>` |
| `.explorerpicker-result-item` | Search result row |
| `.explorerpicker-result-path` | Breadcrumb text under search result |
| `.explorerpicker-highlight` | `<mark>` for search match highlighting |
| `.explorerpicker-breadcrumb` | Breadcrumb bar |
| `.explorerpicker-crumb` | Breadcrumb segment (clickable) |
| `.explorerpicker-crumb-separator` | Breadcrumb ">" separator |
| `.explorerpicker-footer` | Action buttons row |
| `.explorerpicker-btn-cancel` | Cancel button |
| `.explorerpicker-btn-confirm` | Select button |
| `.explorerpicker-loading` | Skeleton loader overlay |
| `.explorerpicker-error` | Error banner |
| `.explorerpicker-live` | Screen reader live region |

### 5.2 Theme Integration

| Token | Usage |
|-------|-------|
| `$gray-50` | Tree background, panel background |
| `$gray-100` | Row hover, section separator background |
| `$gray-200` | Keyboard focus highlight |
| `$gray-300` | Borders (search input, section separators) |
| `$gray-500` | Section header text, type badge text |
| `$gray-600` | Breadcrumb text, result path text |
| `$gray-900` | Node names, search text |
| `$primary` | Selected row highlight background, confirm button, checked checkbox |
| `$font-size-sm` | Section headers, type badges, breadcrumbs |
| `$font-size-base` | Node names, search input |
| `$font-weight-medium` | Section headers (500) |
| `$input-focus-box-shadow` | Search input focus ring |

Never use `$white` or `$black` directly. SCSS import: `@import '../../src/scss/variables';`.

### 5.3 Node Type Icons

#### 5.3.1 Structural Node Icons (Built-in)

These are hardcoded — structural node types never change:

| Node Type | Icon |
|-----------|------|
| ORG_UNIT | `bi-building` |
| FOLDER (collapsed) | `bi-folder` |
| FOLDER (expanded) | `bi-folder2-open` |

#### 5.3.2 Ontology-Resolved Icons (ASSET_REF and LINK Nodes)

For ASSET_REF and LINK nodes, icons and colours are resolved dynamically from the **ontology type catalog** via the node's `resourceType`:

1. Fetch the type catalog once per session: `GET /api/v1/ontology/schema/types`.
2. Look up the node's `resourceType` key (e.g. `diagrams.diagram`, `external.document.google_doc`).
3. Use the type definition's `icon` (Bootstrap Icons class) and `color` (hex) for rendering.
4. If the type has `is_external: true`, display a small external-link badge overlay (`.explorerpicker-external-badge`) on the icon.

This approach uses the 161+ ontology type definitions as the canonical icon source, rather than hardcoding icons per resource or link type. The catalog is cached for the session duration.

**Important:** The ontology type catalog is fetched from `/api/v1/ontology/schema/types` — this is a **separate API** from the Explorer API. It is **not** affected by the `apiBase` or `fetchFn` options. For browser plugin contexts, the consuming app must ensure the ontology endpoint is accessible (e.g. via CORS or a proxy), or provide icons via the `iconResolver` callback.

#### 5.3.3 Ontology Type Hierarchy for resourceTypeFilter

The `resourceTypeFilter` option supports hierarchical matching via `parent_type_key`:

- Passing `"external.document"` matches `external.document.google_doc`, `external.document.word`, `external.document.notion`, etc.
- The picker walks the type catalog's `parent_type_key` chain to determine if a node's `resourceType` is a descendant of any filter entry.
- Exact matches are checked first, then parent hierarchy — so passing `["external.document.google_doc"]` only matches that specific subtype.

#### 5.3.4 Icon Resolution Order

The icon for any ASSET_REF or LINK node is resolved in this priority order:

1. **`iconResolver` callback** (from options) — if provided and returns a string, use it.
2. **Ontology type `icon`** — look up `resourceType` in the cached type catalog.
3. **`linkType` legacy mapping** — for LINK nodes, map `linkType` to a Bootstrap Icons class (backward compatibility).
4. **Fallback icon** — `bi-file-earmark` for unknown ASSET_REF, `bi-link-45deg` for unknown LINK.

#### 5.3.5 Legacy linkType Mapping (Fallback)

Used only when the ontology type catalog does not have an entry for a LINK node's `resourceType`:

| linkType | Icon |
|----------|------|
| `google_docs` | `bi-file-earmark-text` |
| `sharepoint` | `bi-file-earmark-richtext` |
| `confluence` | `bi-journal-text` |
| `github` | `bi-github` |
| *(unknown)* | `bi-link-45deg` |

#### 5.3.6 Icon Colour

When the ontology type definition includes a `color` field, the icon element receives an inline `style="color: {color}"`. If no colour is defined, the icon inherits `$gray-600`.

**Dark mode adjustment:** Ontology colours are typically chosen for light backgrounds and may have poor contrast on dark surfaces. In dark mode, the picker applies a **lightness floor**: if the HSL lightness of the ontology colour is below 60%, it is clamped to 60%. This is implemented as a small runtime HSL transform in the icon render function (not CSS-only, since the colour is dynamic). This ensures readable icons without requiring every ontology type to define a separate dark-mode colour.

### 5.4 Dark Mode

The component inherits dark mode from the platform's theme toggle (Phase 5 tokens). All colour references use SCSS variables that are remapped by the dark mode layer. No component-level dark mode logic is needed.

---

## 6. Keyboard Interaction

Per KEYBOARD.md §3 (Data Views: Trees & Lists):

| Context | Key | Action |
|---------|-----|--------|
| Tree | `ArrowDown` | Move focus to next visible node |
| Tree | `ArrowUp` | Move focus to previous visible node |
| Tree | `ArrowRight` | Expand focused node (if collapsed); else move to first child |
| Tree | `ArrowLeft` | Collapse focused node (if expanded); else move to parent |
| Tree | `Home` | Move focus to first node |
| Tree | `End` | Move focus to last visible node |
| Tree | `Enter` | **Single mode:** select + confirm. **Multi mode:** toggle checkbox. |
| Tree | `Space` | Toggle checkbox (multi-select) or select (single-select) |
| Tree | `Escape` | If search is active: clear search. Else: call `onCancel`. |
| Search | `Escape` | Clear search query, return to tree view |
| Search | `Enter` | Select first search result |
| Search | `ArrowDown` | Move focus to first search result |
| Search results | `ArrowDown` / `ArrowUp` | Navigate between results |
| Search results | `Enter` | Select focused result |
| Search results | `Space` | Toggle checkbox (multi-select) |
| Global | `/` | Focus search input (if not already focused) |
| Global | `Tab` | Move focus between search, tree/results, breadcrumb, buttons |

### 6.1 Focus Management

- On initial render: focus the search input.
- After clearing search: focus the first tree node.
- After selecting via Enter in single mode: do not auto-confirm — user must click "Select" or double-click. This prevents accidental confirmation while keyboard-navigating.
- Roving tabindex pattern: only the focused node has `tabindex="0"`; all others are `tabindex="-1"`.

---

## 7. Accessibility

| Element | ARIA Attributes |
|---------|-----------------|
| Root container | `role="region"`, `aria-label="Resource picker"` |
| Search input | `role="searchbox"`, `aria-label="Search resources"`, `aria-controls` (results ID) |
| Tree `<ul>` | `role="tree"`, `aria-label="Resource tree"` |
| Tree `<li>` | `role="treeitem"`, `aria-expanded`, `aria-selected` (single) or `aria-checked` (multi), `aria-level`, `aria-setsize`, `aria-posinset` |
| Search results list | `role="listbox"`, `aria-label="Search results"` |
| Search result item | `role="option"`, `aria-selected` |
| Breadcrumb | `role="navigation"`, `aria-label="Selection path"` |
| Confirm button | `aria-disabled` when no selection |
| Quick-access sections | `role="group"`, `aria-label="Recent items"` / `"Starred items"` |
| Live region | `aria-live="polite"`, `aria-atomic="true"` |

### 7.1 Screen Reader Announcements

| Event | Announcement |
|-------|-------------|
| Selection change | "System Architecture selected. 2 resources selected." |
| Search results loaded | "3 results for archit." |
| No results | "No results found for archit." |
| Node expanded | "Platform Team expanded, 4 children." |
| Node collapsed | "Platform Team collapsed." |
| Error | "Unable to load resources. Activate retry to try again." |

### 7.2 Motion

Expand/collapse animations (`max-height` transition) respect `prefers-reduced-motion: reduce` — when active, transitions are instant.

---

## 8. Integration Patterns

### 8.1 Modal via FormDialog

```typescript
const formDialog = window.createFormDialog({
    title: "Link to Resource",
    size: "large",
    fields: [],
    customContent: (container: HTMLElement) =>
    {
        const picker = window.createExplorerPicker({
            container,
            mode: "multi",
            selectionTarget: "resource",
            excludeNodeIds: [currentNodeId],
            height: "100%",
            searchPlaceholder: "Search for resources to link...",
            onConfirm: (selections) =>
            {
                formDialog.close();
                createRelationships(selections);
            },
            onCancel: () =>
            {
                formDialog.close();
            },
        });
    },
    hideDefaultButtons: true,
});

formDialog.open();
```

### 8.2 Browser Plugin Sidebar

```typescript
const picker = window.createExplorerPicker({
    container: document.getElementById("plugin-sidebar")!,
    mode: "single",
    selectionTarget: "resource",
    height: "100%",
    apiBase: "https://api.example.com/api/v1/explorer",
    fetchFn: authenticatedFetch,
    showRecentItems: true,
    showStarredItems: true,
    onConfirm: (selections) =>
    {
        linkCurrentPageToResource(selections[0]);
    },
    // No onCancel — sidebar has no cancel semantics
});
```

### 8.3 Inline Popover

```typescript
const picker = window.createExplorerPicker({
    container: popoverContentEl,
    mode: "single",
    selectionTarget: "resource",
    height: "300px",
    showRecentItems: false,
    showStarredItems: false,
    onConfirm: (selections) =>
    {
        addNodeToVisualiser(selections[0]);
        popover.close();
    },
    onCancel: () =>
    {
        popover.close();
    },
});
```

---

## 9. Dependencies

| Dependency | Required | Notes |
|------------|----------|-------|
| Bootstrap 5 CSS | Yes | `btn`, `form-control` base styles |
| Bootstrap 5 JS | No | No Bootstrap JS plugins used |
| Bootstrap Icons | Yes | Node type icons (`bi-building`, `bi-folder`, etc.) |
| Enterprise Theme CSS | Yes | Theme variable overrides, dark mode |
| No other library components | — | Self-contained; no runtime dependency on TreeView, SearchBox, etc. |

The component inlines its own tree rendering, search debouncing, skeleton placeholders, and empty states. This is intentional — ExplorerPicker must be deployable as a standalone `<script>` + `<link>` in environments (browser plugins, third-party integrations) where the full component library is not available.

---

## 10. Implementation Plan

### Phase 1: Core Shell & Tree Rendering (~800 lines)
- Project scaffolding: `components/explorerpicker/explorerpicker.ts` + `.scss` + `README.md`
- `ExplorerPickerOptions` interface, `ExplorerPicker` class, `createExplorerPicker` factory
- Container resolution (HTMLElement or string)
- DOM skeleton: search bar, body, breadcrumb, footer
- Static tree rendering from mock data (no API calls)
- Single-select and multi-select (checkbox toggle)
- Multi-root tree support with virtual root wrapper
- Confirm / Cancel buttons with disabled state, configurable text
- `show()`, `hide()`, `destroy()` lifecycle
- SCSS: all classes from §5.1, theme tokens from §5.2

### Phase 2: API Data Layer (~400 lines)
- `apiFetch()` private method with `fetchFn`, `apiBase`, `AbortController`
- `GET /tree` on initial render → populate `nodeMap`, `childrenMap`, `rootNodeIds`
- Lazy expand: `GET /nodes/{id}/children` on first expand
- `loadedSet` caching to avoid re-fetching expanded nodes
- `initialExpandedNodeId` via `POST /nodes/batch-children`
- `refresh()` method
- Skeleton loader during initial load
- Error banner with retry

### Phase 3: Search (~400 lines)
- Debounced search input (300ms)
- `GET /search` API call with `searchGeneration` counter
- Search mode: replace tree with flat results + per-result breadcrumb paths
- Cursor-based pagination: "Load more results" link at bottom of results
- `<mark>` highlighting on matching text
- Spinner in search input during fetch
- Clear search: restore tree view with preserved expand/selection state
- Empty search state

### Phase 4: Quick-Access Sections (~200 lines)
- `GET /recent` for recent items
- `GET /starred` for starred items
- Collapsible section headers
- Quick-access item click → select item
- `showRecentItems`, `showStarredItems`, `quickAccessLimit` options

### Phase 5: Ontology Integration (~250 lines)
- Fetch ontology type catalog on init: `GET {ontologyApiBase}/schema/types`
- Cache in `ontologyTypes` Map (key → { icon, color, parent_type_key, is_external })
- Icon resolution chain: iconResolver → ontology → linkType legacy → fallback
- Ontology-driven colour on icon elements
- External-link badge overlay for `is_external: true` types
- `resourceTypeFilter` hierarchy matching via `parent_type_key` walk
- Graceful degradation: if ontology fetch fails, fall back to legacy mapping + fallbacks

### Phase 6: Selection Polish (~300 lines)
- Breadcrumb bar: computed from ancestor chain in `nodeMap`
- Clickable breadcrumb segments → expand tree to ancestor
- `selectionTarget: "container"` mode: dim asset nodes
- `excludeNodeIds` → dimmed + tooltip
- `resourceTypeFilter` → hide non-matching ASSET_REF nodes (with ontology hierarchy)
- `preSelectedNodeIds` → highlight on render
- `onSelectionChange` firing on every add/remove
- Double-click to confirm in single-select mode

### Phase 7: Virtual Scrolling (~300 lines)
- Flat visible-node array computed from expanded tree state
- Windowed DOM rendering: materialise only viewport ± buffer rows
- Scroll event handler maps scroll offset to flat array index
- `aria-level`, `aria-setsize`, `aria-posinset` maintained in flat mode
- Threshold-based activation: only engages when visible node count exceeds ~200

### Phase 8: Accessibility & Keyboard (~300 lines)
- Full keyboard navigation per §6
- Roving tabindex with focus management
- ARIA roles per §7
- Live region announcements per §7.1
- `prefers-reduced-motion` respect
- Tab order: search → tree/results → breadcrumb → buttons

### Phase 9: State Export / Restore (~150 lines)
- `exportState()` → `ExplorerPickerState` (expanded, selected, scroll, search, focus)
- `restoreState()` → re-expand, re-select, restore scroll and search
- Silently skip nodes that no longer exist in the tree

### Phase 10: Tests
- Unit tests for tree rendering, selection logic, search, keyboard nav
- Tests for `selectionTarget` modes, `excludeNodeIds`, `resourceTypeFilter`
- Tests for API data layer (mock fetch)
- Tests for lifecycle (`show`, `hide`, `destroy`)
- Tests for FormDialog integration pattern
- Accessibility audit (ARIA attributes present, keyboard nav works)

### Phase 11: Demo Page, README & Index Updates
- `demo/explorerpicker.html` demo page
- `components/explorerpicker/README.md`
- Update `COMPONENT_INDEX.md`, `MASTER_COMPONENT_LIST.md`
- Update `docs/COMPONENT_REFERENCE.md`
- DiagramEngine stencil shape registration

---

## 11. Acceptance Criteria

| # | Criterion | How to Verify |
|---|-----------|---------------|
| 1 | Tree renders with lazy-loaded children on expand | Click ▸ on a folder → children appear after API call |
| 2 | Search replaces tree with filtered results including breadcrumbs | Type "arch" → see matching resources with paths |
| 3 | Single-select: clicking a node selects it, clicking another replaces | Click A → selected. Click B → A deselected, B selected. |
| 4 | Multi-select: clicking toggles checkboxes | Click A → checked. Click B → checked. Click A → unchecked. |
| 5 | Confirm button disabled when no selection | Load picker → "Select" button is disabled |
| 6 | Confirm returns correct `ExplorerPickerSelection` shape | Confirm → breadcrumb is human-readable path string |
| 7 | `excludeNodeIds` dims those nodes | Pass current node ID → that node is dimmed and unclickable |
| 8 | `selectionTarget: "container"` dims asset nodes | Only ORG_UNIT and FOLDER are selectable |
| 9 | `resourceTypeFilter` hides non-matching assets | Filter to `["diagrams.diagram"]` → only diagrams visible |
| 10 | Keyboard navigation works | Tab into tree → arrow keys → Enter to select |
| 11 | `initialExpandedNodeId` expands tree on render | Pass deep node ID → tree opens to it, scrolls into view |
| 12 | Works inside FormDialog `customContent` | Render in FormDialog → fills content area, buttons work |
| 13 | Works with custom `apiBase` and `fetchFn` | Pass full URL + auth fetch → picker loads from custom endpoint |
| 14 | Loading states render | Throttle network → skeleton on load, spinner on expand |
| 15 | Error state shows retry | Block API → error banner with working "Retry" button |
| 16 | ARIA roles and screen reader announcements | axe DevTools → zero violations |
| 17 | Self-contained: works with only its own JS + CSS | Load only explorerpicker.js + .css → picker renders correctly |
| 18 | `container` accepts both HTMLElement and string | Both patterns work without error |
| 19 | Search results show breadcrumb paths | Each result displays ancestor path for disambiguation |
| 20 | Search pagination works | Scroll to bottom → "Load more" → next page appends |
| 21 | `exportState()` / `restoreState()` round-trips | Export, destroy, recreate, restore → same UI state |
| 22 | Virtual scrolling engages for large trees | Expand tree with 500+ visible nodes → only ~200 DOM elements |
| 23 | Multi-root tree renders correctly | API returns 3 root ORG_UNITs → all 3 render at top level |
| 24 | `confirmButtonText` / `cancelButtonText` customisation | Pass custom strings → buttons show custom text |
| 25 | Ontology-resolved icons render for ASSET_REF/LINK nodes | Node with `resourceType: "diagrams.diagram"` → shows icon from ontology catalog |
| 26 | Ontology icon colour applied | Node with ontology `color: "#2563EB"` → icon styled with that colour |
| 27 | External-link badge on `is_external` types | LINK node with `is_external: true` → small badge overlay visible |
| 28 | `resourceTypeFilter` hierarchy matching | Filter `["external.document"]` → shows `external.document.google_doc`, `.word`, etc. |
| 29 | Graceful degradation without ontology API | Block ontology endpoint → icons fall back to linkType mapping / fallback |
| 30 | `ontologyApiBase` / `ontologyFetchFn` work | Pass custom ontology URL → catalog loads from override |

---

## 12. Out of Scope

| Feature | Reason |
|---------|--------|
| Drag-and-drop reordering | Picker is read-only — no tree mutations |
| Inline rename/delete | Selection only — CRUD is in the main Explorer sidebar |
| Context menus | Single purpose (select) — no right-click actions |
| File upload / drag from desktop | Cloud-only platform |
| Relationship type selection | Handled by consuming dialog (FormDialog dropdown) |
| Creating new folders/resources | Separate workflow |
| Full TreeView feature set (drag-drop, inline rename, context menus) | Picker is read-only selection — these are main Explorer sidebar concerns |

---

## 13. Resolved Questions

These questions were raised during drafting and have been resolved:

| # | Question | Resolution |
|---|----------|------------|
| 1 | Recent items endpoint | Support **both** `GET /recent` and `GET /starred` as separate sections. The backend team should provide a dedicated `/recent` endpoint. |
| 2 | Search pagination | **Yes** — paginated search with cursor-based "Load more results." Initial page is 20 results. |
| 3 | Multi-root trees | **Yes** — the Explorer tree can have multiple root-level ORG_UNITs. The picker uses a virtual root wrapper (like FileExplorer) internally. |
| 4 | Selection persistence across search | **Yes** — selections persist across tree/search mode switches. `selectedSet` is independent of view mode. |
| 5 | Confirm button text | **Configurable** via `confirmButtonText` and `cancelButtonText` options. Defaults: "Select (N selected)" / "Select Folder" / "Cancel". |
| 6 | State continuity | **exportState()** / **restoreState()** allow apps to persist and restore the picker's UI state (expanded nodes, selection, scroll position, search query) across navigation or page reloads. |
| 7 | Search result breadcrumb source | The `GET /search` endpoint **must** return a `breadcrumb` string per result. The picker cannot compute these from loaded tree data (unexpanded subtrees). Fallback: show `resourceType` label if breadcrumb is missing. See §4.5.1. |
| 8 | Starred vs. recent visual treatment | Starred items get a `bi-star-fill` icon prefix (small, muted) to distinguish them from recent items. Same row layout otherwise. |
| 9 | Ontology colour in dark mode | Component-level lightness floor: HSL lightness clamped to ≥60% in dark mode via runtime transform. See §5.3.6. |
| 10 | Ontology API in browser plugins | Support both `ontologyFetchFn` (for different auth) and `ontologyTypes` option (pre-loaded catalog, skips API call). See §3.4. |

## 14. Open Questions

No open questions remain. All have been resolved (see §13).
