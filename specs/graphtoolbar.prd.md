<!-- AGENT: PRD for the GraphToolbar Extension — factory function that creates a preconfigured Toolbar for graph visualization applications. -->

# GraphToolbar Extension — Product Requirements

**Status:** Draft
**Component name:** GraphToolbar
**Folder:** `./components/graphtoolbar/`
**Spec author:** Agent
**Date:** 2026-02-20

---

## 1. Overview

### 1.1 What Is It

A factory function that creates a preconfigured Toolbar instance for graph visualization applications. GraphToolbar is **not** a new component class — it is a thin wrapper around the existing Toolbar component (ADR-030) that assembles a standardized set of regions, buttons, dropdowns, inputs, and labels commonly needed by graph-centric tools such as diagramming editors, knowledge graph explorers, and network topology viewers.

The factory accepts a `GraphToolbarOptions` object that controls which tool groups are visible, which layout algorithms are offered, which export formats are available, and which callbacks fire on user interaction. It returns a `GraphToolbarHandle` — a lightweight facade that exposes convenience methods for updating zoom labels, toggle states, and tool enabled states without requiring the consumer to interact with the underlying Toolbar API directly.

**Key design principle:** GraphToolbar owns no DOM or event logic of its own. Every button, dropdown, label, and input is a standard Toolbar item type (`ToolItem`, `ToolDropdownItem`, `ToolInputItem`, `ToolLabelItem`). The factory simply constructs the `ToolbarOptions` configuration object and delegates entirely to `createToolbar()`.

### 1.2 Why Build It

Graph visualization applications — diagramming tools, mind-mapping editors, network topology dashboards, entity-relationship modelers — share a remarkably consistent toolbar pattern:

- Undo/Redo/Delete for graph editing operations.
- A layout algorithm selector with an apply button.
- Zoom in, zoom out, zoom-to-fit, and a zoom percentage display.
- Toggle controls for grid snap and minimap visibility.
- An export menu offering PNG, SVG, and JSON (or similar) formats.
- A search input for finding nodes and edges.

Without a shared factory, every graph application in the ecosystem would independently assemble these same Toolbar regions, duplicating dozens of lines of configuration, inventing inconsistent tool IDs, and diverging on icon and label choices. GraphToolbar eliminates this duplication and guarantees a consistent user experience across Diagrams, Thinker, Strukture, and future graph apps.

### 1.3 Design Inspiration

| Source | Key Pattern Adopted |
|--------|---------------------|
| draw.io toolbar | Undo/Redo group, zoom controls with percentage label, layout selector, export menu |
| Lucidchart toolbar | Grouped regions (editing, view, export), compact icon buttons, dropdown-based layout |
| Figma toolbar | Zoom percentage as interactive label, grid/snap toggle, minimap toggle |
| yEd Graph Editor toolbar | Layout algorithm dropdown with Apply button, extensive layout presets |
| Gephi toolbar | Graph-specific tool groups (layout, statistics, filters), zoom slider |
| Mermaid Live Editor controls | Export to PNG/SVG/JSON, zoom controls, simple layout selection |

### 1.4 Relationship to Toolbar Component

GraphToolbar is a **consumer** of Toolbar, not a subclass or extension of it. The relationship is:

```
GraphToolbarOptions  ->  createGraphToolbar()  ->  ToolbarOptions  ->  createToolbar()  ->  Toolbar instance
                                                                                              |
GraphToolbarHandle  <----------- wraps ---------------------------------------------------------+
```

All Toolbar capabilities (docking, floating, overflow, KeyTips, resize, layout persistence) are available because the underlying object is a genuine Toolbar instance. GraphToolbar adds zero DOM, zero event listeners, and zero CSS beyond what Toolbar already provides. The SCSS file is minimal — only a handful of overrides and additions specific to graph toolbar visual refinements.

---

## 2. Use Cases

| Use Case | Graph App | Key Regions Used |
|----------|-----------|------------------|
| Diagramming editor | Diagrams | All regions: actions, layout, view, export, search |
| Mind map builder | Thinker | Actions (undo/redo), view (zoom), export; no layout dropdown |
| Entity-relationship modeler | Strukture | All regions; custom layout algorithms (ER-specific) |
| Network topology viewer | (future) | View only (zoom, minimap); no actions or layout (read-only) |
| Knowledge graph explorer | (future) | Search, view, export; minimal actions |

---

## 3. Anatomy

### 3.1 Full Toolbar (All Regions Visible)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [↶ Undo][↷ Redo][🗑 Del] │ [Hierarchical ▾][▶ Apply] │ [−][100%][+][⊞ Fit][# Grid][🗺 Map] │ [Export ▾] │ [🔍 Search...] │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────┘
 ↑ Graph Actions               ↑ Layout                    ↑ View                                 ↑ Export   ↑ Search
```

### 3.2 Minimal Toolbar (Read-Only Viewer)

```
┌──────────────────────────────────────────────────────┐
│ [−][100%][+][⊞ Fit][🗺 Map] │ [Export ▾]             │
└──────────────────────────────────────────────────────┘
 ↑ View                         ↑ Export
```

### 3.3 Element Breakdown

| Element | Region | Toolbar Item Type | Required | Tool ID |
|---------|--------|-------------------|----------|---------|
| Undo button | Graph Actions | `ToolItem` | Optional (default: shown) | `gt-undo` |
| Redo button | Graph Actions | `ToolItem` | Optional (default: shown) | `gt-redo` |
| Delete button | Graph Actions | `ToolItem` | Optional (default: shown) | `gt-delete` |
| Layout dropdown | Layout | `ToolDropdownItem` | Optional (default: shown) | `gt-layout-select` |
| Apply Layout button | Layout | `ToolItem` | Optional (default: shown) | `gt-layout-apply` |
| Zoom Out button | View | `ToolItem` | Optional (default: shown) | `gt-zoom-out` |
| Zoom label | View | `ToolLabelItem` | Optional (default: shown) | `gt-zoom-label` |
| Zoom In button | View | `ToolItem` | Optional (default: shown) | `gt-zoom-in` |
| Zoom to Fit button | View | `ToolItem` | Optional (default: shown) | `gt-zoom-fit` |
| Grid Snap toggle | View | `ToolItem` (toggle) | Optional (default: shown) | `gt-grid-snap` |
| Minimap toggle | View | `ToolItem` (toggle) | Optional (default: shown) | `gt-minimap` |
| Export dropdown | Export | `ToolDropdownItem` | Optional (default: shown) | `gt-export` |
| Search input | Search | `ToolInputItem` | Optional (default: shown) | `gt-search` |

All tool IDs use the `gt-` prefix to avoid collision with application-defined tools if the consumer adds custom regions to the same Toolbar instance.

---

## 4. API

### 4.1 Interfaces

```typescript
/** A layout algorithm option for the layout selector dropdown. */
interface GraphToolbarLayout
{
    /** Unique identifier (used as dropdown option value). */
    id: string;

    /** Human-readable display label. */
    label: string;

    /** Bootstrap Icons class (reserved for future icon display). */
    icon?: string;
}

/** Configuration options for createGraphToolbar(). */
interface GraphToolbarOptions
{
    /** Layout algorithm choices for the layout dropdown.
     *  Default: Hierarchical, Force-Directed, Circular, Tree, Grid, Custom. */
    layouts?: GraphToolbarLayout[];

    /** Initially selected layout algorithm ID. Default: "hierarchical". */
    defaultLayout?: string;

    /** Show the Undo button. Default: true. */
    showUndo?: boolean;

    /** Show the Redo button. Default: true. */
    showRedo?: boolean;

    /** Show the Delete Selected button. Default: true. */
    showDelete?: boolean;

    /** Show the Layout selector region. Default: true. */
    showLayoutSelector?: boolean;

    /** Show zoom controls (zoom in, zoom out, zoom to fit, zoom label). Default: true. */
    showZoomControls?: boolean;

    /** Show the Grid Snap toggle button. Default: true. */
    showGridSnap?: boolean;

    /** Show the Minimap toggle button. Default: true. */
    showMinimap?: boolean;

    /** Show the Export dropdown. Default: true. */
    showExport?: boolean;

    /** Show the Search input. Default: true. */
    showSearch?: boolean;

    /** Export format options offered in the Export dropdown.
     *  Default: ["png", "svg", "json"]. */
    exportFormats?: Array<"png" | "svg" | "json" | "pdf">;

    /** Initial zoom percentage. Default: 100. */
    initialZoom?: number;

    /** Initial grid snap toggle state. Default: false (off). */
    gridSnapEnabled?: boolean;

    /** Initial minimap toggle state. Default: false (off). */
    minimapEnabled?: boolean;

    /** Pass-through options for the underlying Toolbar instance.
     *  Allows consumers to override mode, orientation, dockPosition,
     *  style, toolSize, cssClass, and all other ToolbarOptions fields. */
    toolbarOptions?: Partial<ToolbarOptions>;

    // ── Callbacks ──

    /** Called when the Undo button is clicked. */
    onUndo?: () => void;

    /** Called when the Redo button is clicked. */
    onRedo?: () => void;

    /** Called when the Delete Selected button is clicked. */
    onDelete?: () => void;

    /** Called when the layout dropdown selection changes. */
    onLayoutChange?: (layoutId: string) => void;

    /** Called when the Apply Layout button is clicked.
     *  Receives the currently selected layout algorithm ID. */
    onApplyLayout?: (layoutId: string) => void;

    /** Called when the Zoom In button is clicked. */
    onZoomIn?: () => void;

    /** Called when the Zoom Out button is clicked. */
    onZoomOut?: () => void;

    /** Called when the Zoom to Fit button is clicked. */
    onZoomToFit?: () => void;

    /** Called when the zoom level changes programmatically (via setZoomLabel).
     *  Note: The factory does not own zoom logic — the consumer calls
     *  setZoomLabel() and this callback is informational only. */
    onZoomChange?: (zoom: number) => void;

    /** Called when the Grid Snap toggle is clicked. */
    onGridSnapToggle?: (enabled: boolean) => void;

    /** Called when the Minimap toggle is clicked. */
    onMinimapToggle?: (enabled: boolean) => void;

    /** Called when an export format is selected from the Export dropdown. */
    onExport?: (format: string) => void;

    /** Called on each keystroke in the Search input. */
    onSearch?: (query: string) => void;

    /** Called when Enter is pressed in the Search input. */
    onSearchSubmit?: (query: string) => void;
}

/** Handle returned by createGraphToolbar(). Provides convenience
 *  methods for controlling the graph toolbar's dynamic state. */
interface GraphToolbarHandle
{
    /** The underlying Toolbar instance. Consumers can use this
     *  for advanced Toolbar API calls (addRegion, addTool,
     *  dock, float, saveLayout, etc.). */
    toolbar: Toolbar;

    /** Update the zoom percentage label text.
     *  @param zoom — Zoom percentage (e.g., 100, 150, 50). */
    setZoomLabel(zoom: number): void;

    /** Programmatically set the Grid Snap toggle state.
     *  Updates aria-pressed and visual active state. */
    setGridSnapState(enabled: boolean): void;

    /** Programmatically set the Minimap toggle state.
     *  Updates aria-pressed and visual active state. */
    setMinimapState(enabled: boolean): void;

    /** Enable or disable the Undo button.
     *  Typically called when undo stack is empty/non-empty. */
    setUndoEnabled(enabled: boolean): void;

    /** Enable or disable the Redo button.
     *  Typically called when redo stack is empty/non-empty. */
    setRedoEnabled(enabled: boolean): void;

    /** Enable or disable the Delete button.
     *  Typically called when selection is empty/non-empty. */
    setDeleteEnabled(enabled: boolean): void;

    /** Set the currently selected layout algorithm in the dropdown.
     *  @param layoutId — Must match a layout ID in the layouts array. */
    setLayout(layoutId: string): void;

    /** Clean up the underlying Toolbar instance. */
    destroy(): void;
}
```

### 4.2 Methods

| Method | Description |
|--------|-------------|
| `createGraphToolbar(options, containerId?)` | Factory function. Builds a `ToolbarOptions` configuration from `GraphToolbarOptions`, calls `createToolbar()`, and returns a `GraphToolbarHandle`. If `containerId` is provided, the toolbar is appended to that element instead of `document.body`. |

### 4.3 Global Exports

```
window.createGraphToolbar
window.GraphToolbarHandle   (type only — no constructor exposed)
```

### 4.4 Default Layout Algorithms

When `options.layouts` is not provided, the factory uses this default set:

| ID | Label |
|----|-------|
| `hierarchical` | Hierarchical |
| `force-directed` | Force-Directed |
| `circular` | Circular |
| `tree` | Tree |
| `grid` | Grid |
| `custom` | Custom |

### 4.5 Default Export Formats

When `options.exportFormats` is not provided, the factory uses `["png", "svg", "json"]`. The Export dropdown renders these as:

| Value | Label |
|-------|-------|
| `png` | Export as PNG |
| `svg` | Export as SVG |
| `json` | Export as JSON |
| `pdf` | Export as PDF |

---

## 5. Behaviour

### 5.1 Factory Construction Flow

1. **Merge defaults.** Apply default values for all optional fields not provided by the consumer.
2. **Build regions array.** For each enabled tool group, construct a `ToolbarRegion` with the appropriate items:
   - **Graph Actions** (align: `"left"`) — Undo, Redo, Delete buttons.
   - **Layout** (align: `"left"`) — Layout dropdown, Apply Layout button.
   - **View** (align: `"left"`) — Zoom Out, Zoom Label, Zoom In, Zoom to Fit, Grid Snap toggle, Minimap toggle.
   - **Export** (align: `"right"`) — Export dropdown.
   - **Search** (align: `"right"`) — Search input.
3. **Merge toolbar options.** Combine the generated regions with `options.toolbarOptions` overrides. The factory sets sensible defaults:
   - `label`: `"Graph toolbar"` (ARIA).
   - `orientation`: `"horizontal"`.
   - `mode`: `"docked"`.
   - `dockPosition`: `"top"`.
   - `style`: `"icon"`.
   - `overflow`: `true`.
4. **Create toolbar.** Call `createToolbar(toolbarOptions)`.
5. **Build handle.** Wrap the Toolbar instance in a `GraphToolbarHandle` with convenience methods.
6. **Return handle.**

### 5.2 Undo/Redo/Delete State Management

The factory **does not** own undo/redo stacks. The consumer is responsible for:

1. Calling `handle.setUndoEnabled(false)` when the undo stack is empty.
2. Calling `handle.setRedoEnabled(false)` when the redo stack is empty.
3. Calling `handle.setDeleteEnabled(false)` when no graph elements are selected.

The factory wires `onClick` handlers on these buttons to invoke `onUndo`, `onRedo`, and `onDelete` callbacks. The consumer performs the actual operation and updates the button enabled state.

### 5.3 Zoom State Management

The factory **does not** own zoom logic. The consumer is responsible for:

1. Intercepting `onZoomIn` / `onZoomOut` / `onZoomToFit` callbacks.
2. Computing the new zoom level.
3. Calling `handle.setZoomLabel(newZoom)` to update the displayed percentage.

The zoom label is a `ToolLabelItem` with initial text set to `"{initialZoom}%"`.

### 5.4 Layout Selector

The layout dropdown is a `ToolDropdownItem` populated from `options.layouts`. When the selection changes:

1. The `onLayoutChange` callback fires with the new layout ID.
2. The consumer may optionally auto-apply or wait for the user to click Apply Layout.

When Apply Layout is clicked:

1. The factory reads the current dropdown value.
2. The `onApplyLayout` callback fires with that layout ID.

### 5.5 Grid Snap and Minimap Toggles

Both are standard `ToolItem` buttons with `toggle: true`:

- **Grid Snap:** icon `bi-grid-3x3`, initial active state from `gridSnapEnabled`.
- **Minimap:** icon `bi-map`, initial active state from `minimapEnabled`.

On click, the `onClick` handler fires the corresponding callback (`onGridSnapToggle`, `onMinimapToggle`) with the new boolean state.

Programmatic state changes via `setGridSnapState()` / `setMinimapState()` call `toolbar.setToolState()` to update `active`, `aria-pressed`, and the visual `.toolbar-tool-active` class.

### 5.6 Export Dropdown

The export dropdown is a `ToolDropdownItem` with options derived from `exportFormats`. When a selection is made, the `onChange` handler fires `onExport(format)`. After the callback fires, the dropdown resets to a neutral display (the first option or a placeholder) — export is a one-shot action, not a persistent selection.

### 5.7 Search Input

The search input is a `ToolInputItem` with:

- `placeholder`: `"Search nodes..."`.
- `icon`: `"bi-search"`.
- `width`: `"180px"`.

The `onInput` handler fires `onSearch(query)` on each keystroke. The `onSubmit` handler fires `onSearchSubmit(query)` when Enter is pressed.

### 5.8 Toolbar Overflow Behaviour

All items participate in the standard Toolbar overflow system. Overflow priorities:

| Item | Priority | Rationale |
|------|----------|-----------|
| Undo, Redo | `"high"` | Core editing actions, should remain visible |
| Delete | `"low"` | Can be accessed via keyboard (Delete key) |
| Layout dropdown | `"low"` | Less frequently used |
| Apply Layout | `"low"` | Companion to layout dropdown |
| Zoom In, Zoom Out | `"high"` | Core view actions |
| Zoom label | `"low"` | Informational, not interactive |
| Zoom to Fit | `"low"` | Useful but not critical |
| Grid Snap toggle | `"low"` | Infrequent toggle |
| Minimap toggle | `"low"` | Infrequent toggle |
| Export dropdown | `"low"` | Occasional action |
| Search input | `"low"` | Can overflow to menu |

### 5.9 Disabled Region Handling

When a `show*` option is `false`, the corresponding region is not included in the `ToolbarRegion[]` array. If all items in a group are disabled (e.g., `showUndo`, `showRedo`, `showDelete` are all `false`), the entire Graph Actions region is omitted.

---

## 6. Styling

### 6.1 CSS Classes

| Class | Description |
|-------|-------------|
| `.graphtoolbar` | Additional CSS class applied to the Toolbar root element for targeting |

The GraphToolbar factory passes `cssClass: "graphtoolbar"` in the `ToolbarOptions`. All visual styling is handled by the existing `.toolbar-*` class hierarchy. The `.graphtoolbar` class exists solely for consumer CSS targeting if needed.

### 6.2 SCSS File

The SCSS file (`graphtoolbar.scss`) is minimal — it imports the project variables and defines only refinements specific to graph toolbar usage:

```scss
@import '../../src/scss/variables';

// GraphToolbar — minimal overrides for graph-specific toolbar styling.
// All core styling is provided by the Toolbar component's SCSS.

.graphtoolbar
{
    // Zoom label — slightly bolder to stand out as a live indicator.
    .toolbar-label
    {
        font-weight: 600;
        min-width: 48px;
        text-align: center;
    }
}
```

### 6.3 Theme Integration

GraphToolbar inherits all Toolbar theme values:

| Property | Value | Source |
|----------|-------|--------|
| Background | `$gray-100` | Toolbar default |
| Border | `1px solid $gray-300` | Toolbar default |
| Tool button hover | `$gray-200` | Toolbar default |
| Toggle active | `$blue-100` bg, `$blue-700` icon | Toolbar default |
| Dropdown | Standard Bootstrap/Toolbar dropdown | Toolbar default |
| Input | Standard Toolbar input styling | Toolbar default |
| Label | `$gray-700` text | Toolbar default |

### 6.4 Icons

| Tool | Bootstrap Icon Class |
|------|---------------------|
| Undo | `bi-arrow-counterclockwise` |
| Redo | `bi-arrow-clockwise` |
| Delete | `bi-trash` |
| Apply Layout | `bi-play-fill` |
| Zoom In | `bi-plus-lg` |
| Zoom Out | `bi-dash-lg` |
| Zoom to Fit | `bi-fullscreen` |
| Grid Snap | `bi-grid-3x3` |
| Minimap | `bi-map` |
| Export (dropdown) | `bi-download` |
| Search (input icon) | `bi-search` |

---

## 7. Keyboard Interaction

### 7.1 Inherited Toolbar Keyboard Patterns

GraphToolbar inherits the full Toolbar keyboard model (WAI-ARIA Toolbar Pattern):

| Key | Action |
|-----|--------|
| **Tab** | Moves focus into the toolbar (to the last-focused or first enabled tool) |
| **Shift+Tab** | Moves focus out of the toolbar |
| **Right Arrow** | Next tool (horizontal orientation) |
| **Left Arrow** | Previous tool (horizontal orientation) |
| **Home** | First tool in toolbar |
| **End** | Last tool in toolbar |
| **Enter / Space** | Activate focused tool, open dropdown, toggle button |
| **Escape** | Close open dropdown or overlay |
| **Alt** | Toggle KeyTip badge display |

### 7.2 Graph-Specific Keyboard Shortcuts

The factory registers `document`-level keyboard listeners for graph-specific shortcuts. These fire the same callbacks as the corresponding toolbar buttons:

| Shortcut | Action | Callback |
|----------|--------|----------|
| **Ctrl+Z** | Undo | `onUndo` |
| **Ctrl+Y** / **Ctrl+Shift+Z** | Redo | `onRedo` |
| **Delete** | Delete selected | `onDelete` |
| **Ctrl+=** / **Ctrl+Plus** | Zoom in | `onZoomIn` |
| **Ctrl+-** / **Ctrl+Minus** | Zoom out | `onZoomOut` |
| **Ctrl+0** | Zoom to fit | `onZoomToFit` |

**Guard conditions:**

- Shortcuts do not fire when focus is inside the search input (to allow normal text editing).
- Shortcuts do not fire when a modal dialog is open (detected by checking for a visible `.modal-backdrop`).
- Shortcuts respect the corresponding `show*` option — e.g., Ctrl+Z does nothing if `showUndo` is `false`.
- The `destroy()` method removes all document-level listeners.

---

## 8. Accessibility

### 8.1 Inherited ARIA

All Toolbar ARIA patterns apply to GraphToolbar without modification:

| Element | Attribute | Value |
|---------|-----------|-------|
| Root | `role="toolbar"` | Required |
| Root | `aria-label` | `"Graph toolbar"` (or consumer override via `toolbarOptions.label`) |
| Root | `aria-orientation` | `"horizontal"` (default) |
| Toggle buttons (Grid Snap, Minimap) | `aria-pressed` | `"true"` or `"false"` |
| Disabled buttons (Undo, Redo, Delete) | `aria-disabled` | `"true"` |
| Layout dropdown | Native `<select>` semantics | Standard form control |
| Export dropdown | Native `<select>` semantics | Standard form control |
| Search input | `aria-label` | `"Search nodes and edges"` |

### 8.2 Live Region for Zoom Label

The zoom label (`gt-zoom-label`) is marked as an ARIA live region so screen readers announce zoom level changes:

```html
<span class="toolbar-label" aria-live="polite" aria-atomic="true">100%</span>
```

When `setZoomLabel()` is called, the text content updates and the live region announces the new value.

### 8.3 Toggle State Announcements

Grid Snap and Minimap toggle buttons use `aria-pressed` (managed by the Toolbar component). Screen readers announce the toggle state change on activation.

---

## 9. Dependencies

| Dependency | Type | Purpose |
|------------|------|---------|
| Toolbar component | Required | The underlying component that GraphToolbar wraps |
| Bootstrap 5 CSS | Required | Theme variables, form control styling |
| Bootstrap Icons | Required | Icons for all tool buttons |

No additional dependencies. GraphToolbar does not import EditableComboBox, ProgressModal, or any other component.

---

## 10. Implementation Notes

### 10.1 File Structure

| File | Purpose |
|------|---------|
| `specs/graphtoolbar.prd.md` | This specification |
| `components/graphtoolbar/graphtoolbar.ts` | TypeScript source (~180-220 lines) |
| `components/graphtoolbar/graphtoolbar.scss` | Minimal SCSS overrides (~20-30 lines) |
| `components/graphtoolbar/README.md` | Consumer documentation |

### 10.2 Code Structure

The TypeScript source follows this structure:

```
S1: TYPES, INTERFACES, CONSTANTS
    - GraphToolbarLayout, GraphToolbarOptions, GraphToolbarHandle interfaces
    - LOG_PREFIX = "[GraphToolbar]"
    - DEFAULT_LAYOUTS array
    - EXPORT_FORMAT_LABELS map

S2: FACTORY FUNCTION
    - createGraphToolbar(options, containerId?) — builds regions, creates toolbar, returns handle

S3: HELPER FUNCTIONS
    - buildActionsRegion(options) — returns ToolbarRegion or null
    - buildLayoutRegion(options) — returns ToolbarRegion or null
    - buildViewRegion(options) — returns ToolbarRegion or null
    - buildExportRegion(options) — returns ToolbarRegion or null
    - buildSearchRegion(options) — returns ToolbarRegion or null

S4: KEYBOARD SHORTCUTS
    - registerShortcuts(options, handle) — attaches document listeners
    - unregisterShortcuts() — removes document listeners

S5: GLOBAL EXPORTS
    - window.createGraphToolbar = createGraphToolbar
```

### 10.3 Region Builder Pattern

Each `build*Region()` helper returns a `ToolbarRegion` or `null` (if all items in the region are disabled). The factory filters out null values before passing the regions array to `createToolbar()`. This keeps each builder under 25 lines and isolates the configuration logic for each tool group.

### 10.4 Export Dropdown Reset

The Export dropdown behaves as a one-shot action selector. After `onExport` fires, the factory resets the dropdown to a neutral state by calling `toolbar.setToolState("gt-export", { value: "" })` or equivalent. This prevents the dropdown from appearing to "remember" the last export format, which would be misleading since export is not a persistent mode.

### 10.5 Keyboard Shortcut Listener

A single `keydown` listener is registered on `document`. The handler checks `event.ctrlKey`, `event.key`, and focus context before dispatching to the appropriate callback. The listener reference is stored so that `destroy()` can call `document.removeEventListener()`.

### 10.6 Performance

- The factory runs once at initialization. There is no ongoing overhead beyond what the Toolbar component itself incurs.
- Keyboard shortcut handler performs O(1) key matching (switch statement).
- `setZoomLabel()` calls `toolbar.setToolState()` which updates a single DOM node's `textContent`.

### 10.7 Logging

All log statements use `LOG_PREFIX = "[GraphToolbar]"` and follow the patterns in LOGGING.md:

```typescript
console.log(LOG_PREFIX, "Creating graph toolbar with", regions.length, "regions");
console.warn(LOG_PREFIX, "Layout ID not found in layouts array:", layoutId);
```

---

## 11. Edge Cases

| Scenario | Behaviour |
|----------|-----------|
| All `show*` options are `false` | Factory logs a warning and creates an empty toolbar (no regions). Consumer can still add custom regions via `handle.toolbar.addRegion()`. |
| `layouts` array is empty | Layout dropdown is hidden. `showLayoutSelector` is effectively forced to `false`. Warning logged. |
| `exportFormats` array is empty | Export dropdown is hidden. `showExport` is effectively forced to `false`. Warning logged. |
| `defaultLayout` ID not in `layouts` array | Falls back to first layout in array. Warning logged. |
| `initialZoom` is 0 or negative | Clamped to 1%. Warning logged. |
| `setZoomLabel()` called with NaN | Label text set to `"—"`. Warning logged. |
| `setLayout()` called with unknown ID | No-op. Warning logged. |
| `destroy()` called multiple times | Second call is a no-op (idempotent). |
| Consumer adds custom regions to `handle.toolbar` | Fully supported. GraphToolbar regions coexist with consumer regions. |
| `toolbarOptions.regions` provided in override | Merged: GraphToolbar regions are prepended, consumer regions appended. |
| Ctrl+Z pressed while search input focused | Shortcut does not fire; normal browser undo in the input field. |
| Ctrl+Z pressed while modal is open | Shortcut does not fire. |

---

## 12. Future Considerations (Out of Scope for v1)

These features are explicitly deferred:

- **Zoom slider** — A continuous slider control for zoom level (requires a new Toolbar item type).
- **Selection count badge** — A live badge showing "N selected" in the toolbar.
- **History dropdown** — Undo/Redo buttons as split buttons with a history list.
- **Layout preview thumbnails** — Gallery-style layout picker with visual previews of each algorithm.
- **Custom tool injection points** — Named slots (e.g., "before-view", "after-export") for consumers to insert app-specific tools at defined positions.
- **Collaborative presence indicators** — User avatars in the toolbar showing who else is viewing the graph.

---

## 13. Open Questions

| # | Question | Status |
|---|----------|--------|
| 1 | Should the Export dropdown use `ToolDropdownItem` (native `<select>`) or a `SplitButtonItem` (custom dropdown with icons per format)? Native `<select>` is simpler but cannot show icons. | Leaning toward `ToolDropdownItem` for simplicity in v1. |
| 2 | Should keyboard shortcuts be opt-in (disabled by default) to avoid conflicts with host application shortcuts? | Leaning toward opt-in with a `enableKeyboardShortcuts` option, default `true`. |
| 3 | Should the factory support a `containerId` parameter, or should consumers always use `handle.toolbar.getElement()` and mount manually? | Including `containerId` for convenience. |
