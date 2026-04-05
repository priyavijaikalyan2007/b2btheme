<!-- AGENT: Feature request for the ExplorerPicker CDN component. Written for the UI/components team to intake and build. -->

# Feature Request: ExplorerPicker CDN Component

**Date:** April 2, 2026
**Status:** Requested
**Requestor:** Platform Engineering Team
**For:** UI / Components Team (CDN component implementation)
**Priority:** High — Blocks Phase 1 of Cross-App Creation & Linking (`specs/cross-app-creation.prd.md`)

---

## 1. Summary

We need a new CDN component called **ExplorerPicker** — a reusable resource selection widget that renders the Explorer tree in "picker mode." Users browse or search the tree to select one or more resources, then confirm their selection. Think of it like a file picker dialog, but for Knobby resources.

This component is the primary UX for the "Link to..." and "Create From..." workflows described in `specs/cross-app-creation.prd.md`. It will be used in at least 5 contexts:

| Context | Rendering Mode | Selection Mode |
|---------|---------------|----------------|
| "Link to..." dialog (all 4 apps) | Modal (via FormDialog) | Single or multi |
| "Create From..." destination picker | Modal (via FormDialog) | Single (folder/org unit only) |
| Browser plugin sidebar | Inline panel | Single |
| Details panel "Related" tab → "Link" button | Modal (via FormDialog) | Multi |
| Future: Ontology Visualizer → "Add node" | Inline popover | Single |

---

## 2. Design References

These products have similar "resource picker" patterns:

| Product | What to Borrow |
|---------|---------------|
| **Google Drive file picker** | Tree + search + breadcrumbs + recent items section |
| **SharePoint document picker** | Tree navigation with lazy-loaded folders, resource type icons |
| **Slack channel picker** | Search-first with tree fallback, keyboard navigation |
| **Figma "Move to project" dialog** | Clean modal with tree, search bar at top, breadcrumb trail |
| **GitHub "Move issue to project" dialog** | Simple tree with search, recently used items at top |

**Key UX principle:** Search is the primary interaction, tree browsing is secondary. Most users know what they're looking for — they type a few characters and pick from filtered results. The tree is for browsing when you don't know the name.

---

## 3. Component Specification

### 3.1 CDN Slug & Files

```
https://static.knobby.io/components/explorer-picker/explorer-picker.css
https://static.knobby.io/components/explorer-picker/explorer-picker.js
```

### 3.2 Window Factory

```typescript
window.createExplorerPicker?: (options: ExplorerPickerOptions) => ExplorerPicker;
```

### 3.3 Configuration Options

```typescript
interface ExplorerPickerOptions {
    // ── Container ──────────────────────────────────────────────────────
    /** DOM element to render the picker into. */
    container: HTMLElement;

    // ── Mode ───────────────────────────────────────────────────────────
    /** Single-select returns one item; multi-select allows checkboxes. */
    mode: 'single' | 'multi';

    /**
     * What the user is picking. Controls which node types are selectable:
     * - 'resource': Any ASSET_REF or LINK node (default)
     * - 'container': Only ORG_UNIT or FOLDER nodes (for "pick a destination")
     * - 'any': All node types are selectable
     */
    selectionTarget?: 'resource' | 'container' | 'any';

    // ── Filtering ──────────────────────────────────────────────────────
    /**
     * Filter: only show ASSET_REF nodes whose resource_type matches.
     * ORG_UNIT and FOLDER nodes are always shown (they're containers).
     *
     * Supports ontology type hierarchy: passing an abstract parent type
     * (e.g., 'external.document') matches ALL its subtypes
     * (external.document.google_doc, external.document.word, etc.).
     * This uses the parent_type_key hierarchy from ontology type definitions.
     *
     * Example: ['diagrams.diagram', 'checklists.template']
     * Example: ['external.document'] — matches all document subtypes
     */
    resourceTypeFilter?: string[];

    /**
     * Exclude these resource IDs from being selectable.
     * Use this to prevent linking a resource to itself.
     */
    excludeResourceIds?: string[];

    /**
     * Exclude system folders (Trash, Personal, Unassigned) from the tree.
     * Default: true (system folders are hidden).
     */
    hideSystemFolders?: boolean;

    // ── Initial State ──────────────────────────────────────────────────
    /**
     * Start with this node expanded and scrolled into view.
     * Useful when the user is linking FROM a resource — start at its location.
     */
    initialExpandedNodeId?: string;

    /**
     * Pre-selected node IDs (multi-select mode only).
     * The picker will highlight these nodes on render.
     */
    preSelectedNodeIds?: string[];

    // ── Data Fetching ──────────────────────────────────────────────────
    /**
     * Base URL for Explorer API calls. Default: '/api/v1/explorer'.
     * The picker calls these endpoints internally:
     *   GET {apiBase}/tree
     *   GET {apiBase}/nodes/{id}/children
     *   GET {apiBase}/search?q=...
     *   POST {apiBase}/nodes/batch-children
     *
     * Override this for browser plugin use (full URL with origin).
     */
    apiBase?: string;

    /**
     * Custom fetch function for API calls.
     * Default: window.fetch. Override for browser plugin auth (inject Bearer token).
     */
    fetchFn?: typeof fetch;

    // ── Sections ───────────────────────────────────────────────────────
    /**
     * Show a "Recent Items" section above the tree with the user's
     * recently accessed resources. Default: true.
     */
    showRecentItems?: boolean;

    /**
     * Show a "Starred" section above the tree with the user's
     * starred items. Default: true.
     */
    showStarredItems?: boolean;

    /**
     * Maximum number of recent/starred items to show. Default: 5.
     */
    quickAccessLimit?: number;

    // ── Appearance ─────────────────────────────────────────────────────
    /**
     * Placeholder text for the search input. Default: 'Search resources...'
     */
    searchPlaceholder?: string;

    /**
     * Empty state message when search returns no results.
     * Default: 'No resources found matching your search.'
     */
    emptySearchMessage?: string;

    /**
     * Empty state message when the tree has no nodes.
     * Default: 'No resources available.'
     */
    emptyTreeMessage?: string;

    /**
     * Height of the picker container. Default: '400px'.
     * Set to '100%' for inline/sidebar rendering.
     */
    height?: string;

    // ── Callbacks ──────────────────────────────────────────────────────
    /**
     * Called when the user confirms their selection (clicks "Select" button
     * or double-clicks in single-select mode).
     */
    onConfirm: (selections: ExplorerPickerSelection[]) => void;

    /**
     * Called when the user cancels (clicks "Cancel" or presses Escape).
     * Optional — if not provided, the picker doesn't render a Cancel button
     * (useful for inline/sidebar rendering where cancel isn't applicable).
     */
    onCancel?: () => void;

    /**
     * Called when the selection changes (before confirm).
     * Useful for enabling/disabling external "OK" buttons or showing previews.
     */
    onSelectionChange?: (selections: ExplorerPickerSelection[]) => void;
}
```

### 3.4 Selection Shape

```typescript
interface ExplorerPickerSelection {
    /** The explorer node ID. */
    nodeId: string;

    /** The resource_registry ID (null for FOLDER nodes). */
    resourceId: string | null;

    /** Display name of the selected node. */
    name: string;

    /** Node type: 'ORG_UNIT', 'FOLDER', 'ASSET_REF', or 'LINK'. */
    nodeType: 'ORG_UNIT' | 'FOLDER' | 'ASSET_REF' | 'LINK';

    /**
     * Resource type from resource_registry (e.g., 'diagrams.diagram').
     * Null for FOLDER/ORG_UNIT nodes.
     */
    resourceType: string | null;

    /**
     * App-specific source ID from resource_registry (e.g., the Diagram's UUID).
     * Null for FOLDER/ORG_UNIT nodes.
     */
    sourceId: string | null;

    /**
     * Human-readable breadcrumb path.
     * e.g., "Engineering > Platform Team > Architecture Diagrams"
     */
    breadcrumb: string;

    /** URL for LINK nodes. Null for other types. */
    url: string | null;
}
```

### 3.5 Instance API (Runtime Control)

```typescript
interface ExplorerPicker {
    /** Programmatically set the search query. */
    setSearchQuery(query: string): void;

    /** Programmatically clear the current selection. */
    clearSelection(): void;

    /** Get the current selection without confirming. */
    getSelection(): ExplorerPickerSelection[];

    /** Expand a specific node in the tree. */
    expandNode(nodeId: string): void;

    /** Collapse a specific node in the tree. */
    collapseNode(nodeId: string): void;

    /** Scroll a node into view and highlight it briefly. */
    scrollToNode(nodeId: string): void;

    /** Refresh the tree data from the API. */
    refresh(): Promise<void>;

    /** Destroy the picker and clean up event listeners. */
    destroy(): void;

    /** Whether the picker is currently loading data. */
    isLoading(): boolean;
}
```

---

## 4. Layout & Anatomy

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
│  ── Breadcrumb ─────────────────────────────────────    │  ← Shows path of current selection
│  Engineering > Platform Team > System Architecture      │
│                                                         │
│  ┌─────────────┐  ┌─────────────────────────────┐      │
│  │   Cancel     │  │   Select (1 selected)   ✓   │      │  ← Action buttons
│  └─────────────┘  └─────────────────────────────┘      │
└─────────────────────────────────────────────────────────┘
```

### 4.1 Search Mode (Active Search Query)

When the user types in the search input, the tree section is replaced by search results:

```
┌─────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────┐    │
│  │  🔍  archit                                 ✕   │    │  ← Active search
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ── Results (3) ────────────────────────────────────    │
│  ☑ 📊 System Architecture                              │
│       Engineering > Platform Team                       │  ← Breadcrumb under each result
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

### 4.2 Container Selection Mode (selectionTarget: 'container')

When picking a destination folder/org unit, only containers are selectable:

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

---

## 5. Behavior Specification

### 5.1 Tree Interaction

| Interaction | Behavior |
|------------|----------|
| **Click expand arrow (▸)** | Lazy-loads children via `GET /nodes/{id}/children`, expands node |
| **Click node name** | Selects/deselects the node (single: replaces; multi: toggles checkbox) |
| **Double-click node** | In single-select mode: confirms selection immediately. In multi-select: toggles. |
| **Click breadcrumb segment** | Expands tree to that ancestor and scrolls it into view |
| **Arrow keys (up/down)** | Move focus through visible tree nodes |
| **Arrow keys (left/right)** | Collapse/expand focused node |
| **Enter** | Select focused node (single) or toggle checkbox (multi) |
| **Space** | Toggle checkbox (multi-select mode) |
| **Escape** | If search is active: clear search. Otherwise: trigger `onCancel`. |

### 5.2 Search Interaction

| Interaction | Behavior |
|------------|----------|
| **Type in search box** | Debounce 300ms, then call `GET /search?q={query}`. Show results replacing tree. |
| **Clear search (✕ button or backspace to empty)** | Return to tree view, preserving expansion state |
| **Click search result** | Select it (same as tree click) |
| **Enter in search box** | Select the first result |
| **No results** | Show `emptySearchMessage` with an illustration |

### 5.3 Selection Rules

| Rule | Behavior |
|------|----------|
| Selecting a non-selectable node (e.g., asset in container mode) | No-op — node stays dimmed |
| Selecting an excluded node (`excludeResourceIds`) | No-op — node shows tooltip "Cannot link to itself" |
| Max selection | No limit in multi-select mode. `onSelectionChange` fires on every change. |
| Pre-selected nodes | Highlighted on render with checkmarks. Can be deselected. |
| Confirm with zero selections | "Select" button is disabled |

### 5.4 Data Fetching

| Action | API Call | Caching |
|--------|----------|---------|
| Initial render | `GET {apiBase}/tree?assetTypes={filter}` | Cache for session duration |
| Expand node | `GET {apiBase}/nodes/{id}/children?assetTypes={filter}` | Cache per node ID |
| Search | `GET {apiBase}/search?q={query}&types={filter}&pageSize=20` | No cache (results change) |
| Recent items | `GET {apiBase}/starred` (starred items as proxy for "recent") | Cache for session duration |
| Breadcrumb for selection | Computed from loaded tree ancestors (no additional API call) | |
| Ontology type catalog | `GET /api/v1/ontology/schema/types` | Cache for session duration |

The ontology type catalog is fetched once on first render to resolve icons, colors, and `parent_type_key` hierarchy for `resourceTypeFilter` matching. This call goes to the ontology API (not `{apiBase}`), so it is NOT affected by `apiBase` or `fetchFn` overrides — the browser plugin should handle this separately if needed.

### 5.5 Loading States

| State | UX |
|-------|-----|
| Initial tree loading | Skeleton loader (3-4 tree-shaped placeholder rows) |
| Expanding a node | Small spinner on the expand arrow |
| Search in progress | Spinner in the search input's right side, replacing the ✕ button |
| Confirming selection | "Select" button shows loading spinner and is disabled |

### 5.6 Error Handling

| Error | UX |
|-------|-----|
| API call fails (network/500) | Inline error banner below search: "Unable to load resources. [Retry]" |
| Search returns error | Error message in results area with retry link |
| Node expansion fails | Toast notification, node remains collapsed |

---

## 6. Accessibility

| Requirement | Implementation |
|-------------|---------------|
| **Keyboard navigation** | Full tree keyboard nav (arrow keys, Enter, Space, Escape) |
| **ARIA roles** | `role="tree"`, `role="treeitem"`, `aria-expanded`, `aria-selected`, `aria-checked` (multi) |
| **Search label** | `aria-label="Search resources"` on the search input |
| **Focus management** | Focus moves to first tree node after search clears. Focus moves to search on `/` key. |
| **Screen reader** | Selection count announced on change: "2 resources selected" |
| **Color contrast** | All text meets WCAG 2.1 AA (4.5:1 ratio) |
| **Reduced motion** | Expand/collapse animation respects `prefers-reduced-motion` |

---

## 7. Styling & Theming

The component should inherit the platform's existing design tokens:

| Token | Usage |
|-------|-------|
| `--knobby-text-primary` | Node names, search text |
| `--knobby-text-secondary` | Breadcrumbs, resource type labels |
| `--knobby-bg-surface` | Tree background |
| `--knobby-bg-hover` | Row hover state |
| `--knobby-bg-selected` | Selected node highlight |
| `--knobby-border-default` | Section separators, search input border |
| `--knobby-accent-primary` | Checkbox checked state, "Select" button |
| `--knobby-icon-*` | Node type icons |

### 7.1 Node Type Icons

#### Built-in icons (structural node types)

| Node Type | Icon | Source |
|-----------|------|--------|
| ORG_UNIT | `bi-building` | Bootstrap Icons |
| FOLDER | `bi-folder` / `bi-folder-open` (expanded) | Bootstrap Icons |

#### Ontology-resolved icons (ASSET_REF and LINK nodes)

For ASSET_REF and LINK nodes, icons and colors are resolved from the **ontology type definitions** via the node's `resource_type` from `resource_registry`:

1. Look up the `resource_type` key in the ontology type catalog (e.g., `diagrams.diagram`, `external.document.google_doc`)
2. Use the type definition's `icon` and `color` fields for rendering
3. If the type has `is_external: true`, display a small external-link badge overlay

This approach uses the 161+ ontology external types (see `ontology/types/external.yaml`) as the canonical source instead of hardcoding icons per link type. The ontology type catalog is fetched once per session from `GET /api/v1/ontology/schema/types?namespace=external` and cached.

**Fallback icons** (when ontology type is not found or node has no resource_type):

| Context | Icon |
|---------|------|
| ASSET_REF (unknown type) | `bi-file-earmark` |
| LINK (unknown type) | `bi-link-45deg` |

**Backward compatibility**: The existing `link_type` field on LINK nodes (e.g., `google_docs`, `sharepoint`) is still available for legacy icon mapping. The resolution order is: ontology type `icon` → `link_type` legacy mapping → fallback icon.

The component should accept an optional `iconResolver?: (node: ExplorerNode) => string` callback for custom icon resolution that takes precedence over ontology lookup.

---

## 8. Integration with FormDialog

The most common usage will be inside a FormDialog modal. Here's the expected integration pattern:

```typescript
// Consumer code (e.g., diagrams-app-main.ts)
const formDialog = window.createFormDialog({
    title: 'Link to Resource',
    size: 'large',          // 800px wide — gives picker room
    fields: [],             // No FormDialog fields — picker is the entire content
    customContent: (container) => {
        // Render the picker inside the FormDialog's custom content area
        const picker = window.createExplorerPicker({
            container,
            mode: 'multi',
            selectionTarget: 'resource',
            excludeResourceIds: [currentResourceId],
            height: '100%',
            searchPlaceholder: 'Search for resources to link...',
            onConfirm: (selections) => {
                // Create ontology edges for each selection
                formDialog.close();
                createRelationships(selections);
            },
            onCancel: () => {
                formDialog.close();
            },
            onSelectionChange: (selections) => {
                // Optional: update dialog title with count
            },
        });
    },
    hideDefaultButtons: true, // Picker has its own Cancel/Select buttons
});

formDialog.open();
```

---

## 9. Integration with Browser Plugin

For browser plugin use, the picker renders in the extension's sidebar panel with custom auth:

```typescript
const picker = window.createExplorerPicker({
    container: document.getElementById('plugin-sidebar'),
    mode: 'single',
    selectionTarget: 'resource',
    height: '100%',
    apiBase: 'https://api.knobby.io/api/v1/explorer',
    fetchFn: authenticatedFetch,   // Injects Bearer token
    showRecentItems: true,
    showStarredItems: true,
    onConfirm: (selections) => {
        linkCurrentPageToResource(selections[0]);
    },
    // No onCancel — sidebar doesn't have cancel semantics
});
```

---

## 10. Dependencies

| Dependency | Status | Notes |
|-----------|--------|-------|
| TreeView (§6.1) | Exists | Core tree rendering — may be used internally or re-implemented for selection-specific needs |
| SearchBox (§13.5) | Exists | Search input with debounce, clear button |
| SkeletonLoader (§12.4) | Exists | Loading placeholder |
| EmptyState (§12.5) | Exists | "No results" illustration |
| FormDialog (§2.4) | Exists | Modal container (consumer-side, not a dependency of the picker itself) |
| Bootstrap Icons | Exists | Node type iconography |

**No new dependencies required.** The component should be self-contained within its CSS + JS files.

---

## 11. API Endpoints Used

The picker calls these existing Explorer API endpoints. **No new backend endpoints are needed.**

| Endpoint | Method | When Called | Response Used |
|----------|--------|------------|---------------|
| `/api/v1/explorer/tree` | GET | Initial render | Root-level nodes |
| `/api/v1/explorer/nodes/{id}/children` | GET | Node expand | Child nodes |
| `/api/v1/explorer/search` | GET | Search typing | Hits with breadcrumbs |
| `/api/v1/explorer/nodes/batch-children` | POST | Expand to `initialExpandedNodeId` | Ancestor chain children |
| `/api/v1/explorer/starred` | GET | Initial render (if `showStarredItems: true`) | Starred items |

All endpoints are authenticated via session cookie (web app) or Bearer token (`fetchFn` override for browser plugin).

---

## 12. Acceptance Criteria

| # | Criterion | How to Verify |
|---|-----------|---------------|
| 1 | Tree renders with lazy-loaded children on expand | Click ▸ on a folder → children appear |
| 2 | Search replaces tree with filtered results including breadcrumbs | Type "arch" → see matching resources with paths |
| 3 | Single-select mode: clicking a node selects it, clicking another replaces | Click node A → selected. Click node B → A deselected, B selected. |
| 4 | Multi-select mode: clicking toggles checkboxes | Click A → checked. Click B → checked. Click A → unchecked. |
| 5 | Confirm button disabled when no selection | Load picker → "Select" button is disabled |
| 6 | Confirm returns correct `ExplorerPickerSelection` shape with breadcrumb | Confirm → check that `breadcrumb` is human-readable path string |
| 7 | `excludeResourceIds` makes those nodes unselectable | Pass current resource ID → that node is dimmed and unclickable |
| 8 | `selectionTarget: 'container'` dims asset nodes | Only ORG_UNIT and FOLDER nodes are selectable |
| 9 | `resourceTypeFilter` hides non-matching asset nodes | Filter to `['diagrams.diagram']` → only diagrams visible in tree |
| 10 | Keyboard navigation works (arrows, Enter, Space, Escape) | Tab into tree → use arrow keys to navigate → Enter to select |
| 11 | `initialExpandedNodeId` expands tree to that node on render | Pass a deep node ID → tree opens to it and scrolls into view |
| 12 | Works inside FormDialog with `customContent` | Render in FormDialog → picker fills content area, buttons work |
| 13 | Works with custom `apiBase` and `fetchFn` | Pass full URL + auth fetch → picker loads from custom endpoint |
| 14 | Loading states (skeleton, spinner) render correctly | Throttle network → see skeleton on initial load, spinner on expand |
| 15 | Error state shows retry link | Block API → see error banner with working "Retry" button |
| 16 | ARIA roles and screen reader announcements present | Run axe DevTools → zero violations |

---

## 13. Out of Scope

These features are NOT part of this request:

| Feature | Why Out of Scope |
|---------|-----------------|
| Drag-and-drop reordering | The picker is read-only — no tree mutations |
| Inline rename/delete | The picker is for selection only — CRUD operations are in the main Explorer sidebar |
| Context menus | No right-click actions — the picker has a single purpose (select) |
| File upload / drag from desktop | Knobby is cloud-only; link to external storage URLs instead |
| Relationship type selection | Handled by the consuming dialog (FormDialog dropdown), not the picker |
| Creating new folders/resources | The picker browses existing resources — creation is a separate workflow |

---

## 14. Timeline & Coordination

| Milestone | What | Who |
|-----------|------|-----|
| **Design review** | UI team reviews this spec, proposes any changes to layout/interaction | UI Team |
| **Implementation** | Build `explorer-picker.css` + `explorer-picker.js` | UI Team |
| **Type definitions** | Platform team adds `ExplorerPickerOptions` / `ExplorerPicker` / `ExplorerPickerSelection` to `component-library.d.ts` | Platform Team |
| **Integration** | Platform team wires picker into "Link to..." dialog across all 4 apps | Platform Team |
| **Testing** | E2E tests for picker inside FormDialog and standalone | Both teams |

**Blocker for:** Phase 1 of Cross-App Creation & Linking (`specs/cross-app-creation.prd.md` Section 9.1, Steps 1.2-1.4)
