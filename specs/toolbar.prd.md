<!-- AGENT: Product Requirements Document for the Toolbar component — dockable/floating action bar with regions, overflow, and orientation support. -->

# Toolbar Component — Product Requirements

**Status:** Draft
**Component name:** Toolbar
**Folder:** `./components/toolbar/`
**Spec author:** Agent
**Date:** 2026-02-12

---

## 1. Overview

### 1.1 What Is It

A programmable action bar component for grouping tools and actions into labelled regions. Inspired by the Microsoft Office Ribbon but adapted to the enterprise Bootstrap 5 aesthetic — no tabs, no backstage view. The toolbar is a single strip of tool buttons organised into titled regions separated by dividers, with automatic overflow handling when space is constrained.

The toolbar supports:

- **Docked** or **floating** positioning, with **drag-to-dock** snapping.
- **Horizontal** or **vertical** orientation in either mode.
- **Resize** in the direction of orientation only.
- **Regions** — named groups of related tools separated by thin dividers with optional titles.
- **Tool types** — standard buttons, toggle buttons, **split buttons** (button + dropdown arrow), and **gallery controls** (visual grid pickers).
- **Overflow** — excess tools collapse into a dropdown menu.
- **Tooltips** — every tool shows a descriptive tooltip on hover.
- **Keyboard shortcut badges** — Office-style KeyTips revealed on Alt press for rapid keyboard access.
- **Layout persistence** — save and restore toolbar position, orientation, and overflow state.
- **Full programmability** — all aspects (regions, tools, icons, tooltips, sizes, colours, fonts, orientation, visibility) are configurable via the API.

### 1.2 Why Build It

Enterprise SaaS applications frequently need action toolbars for:

- Document editors (bold, italic, insert table, etc.)
- Diagramming tools (select, draw, zoom, align, distribute)
- Admin dashboards (filter, export, refresh, bulk actions)
- Data grids (add row, delete, sort, group, column picker)
- Media management (crop, rotate, resize, metadata)

No existing open-source library provides a Bootstrap 5 compatible, vanilla TypeScript, dockable/floating toolbar with regions, overflow, and accessibility. Building custom ensures alignment with the project's zero-dependency, IIFE-wrapped, Bootstrap-themed architecture.

### 1.3 Design Inspiration

| Source | Key Pattern Adopted |
|--------|---------------------|
| Microsoft Office Ribbon | Regions with titles, icon+label tools, overflow collapse, split buttons, gallery pickers, KeyTips |
| VS Code View Toolbar | Icon-only compact tools, "..." overflow menu, context-sensitive visibility |
| Google Docs Toolbar | Single-row fixed toolbar, icon prominence, grouped controls |
| PatternFly Overflow Menu | Priority-based overflow, "never overflow" / "always overflow" flags |
| WAI-ARIA Toolbar Pattern | `role="toolbar"`, roving tabindex, `aria-orientation` |

### 1.4 Open Source Evaluation

| Library | Verdict | Reason |
|---------|---------|--------|
| Metro UI CSS (Ribbon) | Not recommended | 54MB framework, not Bootstrap-compatible, no overflow or docking |
| Syncfusion EJ2 Toolbar | Not recommended | Commercial licence for >$1M revenue; not truly open source |
| PriorityNav.js | Useful reference | MIT, 5KB, excellent overflow pattern; too narrow for full toolbar |
| jsPanel4 | Useful reference | MIT, vanilla JS, Bootstrap themes; panel docking/floating patterns |
| Bootstrap 5 `.btn-toolbar` | Foundation | Native grouping with `.btn-group`; no overflow, no docking |

**Decision:** Build custom. Use Bootstrap 5 `.btn-group` CSS patterns as a styling foundation, implement Priority+ overflow inspired by PriorityNav.js and PatternFly, and implement docking/floating using patterns established in the Sidebar component.

---

## 2. Use Cases

| Use Case | Orientation | Mode | Example |
|----------|-------------|------|---------|
| Document editor toolbar | Horizontal | Docked top | Bold, Italic, Font, Alignment, Insert |
| Diagram tool palette | Vertical | Docked left | Select, Rectangle, Circle, Line, Text |
| Data grid actions | Horizontal | Docked top | Add, Delete, Filter, Export, Refresh |
| Floating format bar | Horizontal | Floating | Text style tools near selection |
| Admin quick actions | Vertical | Floating | Deploy, Restart, Logs, SSH |

---

## 3. Anatomy

### 3.1 Horizontal Toolbar

```
+--[Region A Title]------+---[Region B Title]---------+---[More v]--+
| [i][i][i] | [sep] [i][i][i][i] | [sep] [i][i] | [...] |
+-------------------------+-----------------------------+-------------+
```

### 3.2 Vertical Toolbar

```
+-----+
| [i] |
| [i] | Region A
| [i] |
|-----|
| [i] | Region B
| [i] |
|-----|
|[...]| Overflow
+-----+
```

### 3.3 Element Breakdown

| Element | Required | Description |
|---------|----------|-------------|
| Root container | Yes | `role="toolbar"` with `aria-label` |
| Region | Yes (1+) | Named group of related tools |
| Region title | Optional | Small text label above/beside the region |
| Region divider | Auto | Thin line between regions |
| Tool button | Yes (1+) | Icon button with tooltip, optional label |
| Split button | Optional | Button with attached dropdown arrow for variant actions |
| Gallery control | Optional | Visual grid picker for colours, styles, or icons |
| Tool separator | Optional | Thin line between individual tools within a region |
| Overflow button | Auto | "..." button that reveals hidden tools in a dropdown |
| Resize handle | Optional | Drag strip for orientation-axis resize |
| KeyTip badge | Auto | Letter badge shown on Alt press for keyboard shortcut access |

---

## 4. API

### 4.1 Types

```typescript
/** Toolbar orientation. */
type ToolbarOrientation = "horizontal" | "vertical";

/** Toolbar positioning mode. */
type ToolbarMode = "docked" | "floating";

/** Docking edge. Horizontal: top/bottom. Vertical: left/right. */
type ToolbarDockPosition = "top" | "bottom" | "left" | "right";

/** Tool button style variant. */
type ToolStyle = "icon" | "icon-label" | "label";

/** Tool overflow priority. */
type ToolOverflowPriority = "never" | "high" | "low" | "always";

/** Gallery item layout direction. */
type GalleryLayout = "grid" | "list";
```

### 4.2 Interfaces

```typescript
/** A single tool (action button) within a region. */
interface ToolItem
{
    /** Unique identifier for this tool. */
    id: string;

    /** Bootstrap Icons class (e.g., "bi-bold"). */
    icon?: string;

    /** Text label (shown beside icon in "icon-label" style, or alone in "label" style). */
    label?: string;

    /** Tooltip text shown on hover. Required for accessibility when label is hidden. */
    tooltip: string;

    /** Display style. Default: inherits from region or toolbar. */
    style?: ToolStyle;

    /** Whether the tool is a toggle (stays pressed). Default: false. */
    toggle?: boolean;

    /** Initial toggle state. Default: false. */
    active?: boolean;

    /** Disabled state. Default: false. */
    disabled?: boolean;

    /** Hidden state. Default: false. */
    hidden?: boolean;

    /** Overflow priority. Default: "low". */
    overflowPriority?: ToolOverflowPriority;

    /** Click handler. Receives the tool item and current active state. */
    onClick?: (tool: ToolItem, active: boolean) => void;

    /** KeyTip letter(s) for keyboard shortcut badge (shown on Alt press). */
    keyTip?: string;

    /** Additional CSS class(es) for the button element. */
    cssClass?: string;

    /** Arbitrary data attached to this tool for consumer use. */
    data?: Record<string, unknown>;
}

/** A split button — primary action button with an attached dropdown arrow for variants. */
interface SplitButtonItem
{
    /** Must be "split-button" to distinguish from ToolItem. */
    type: "split-button";

    /** Unique identifier for this split button. */
    id: string;

    /** Bootstrap Icons class for the primary button. */
    icon?: string;

    /** Text label for the primary button. */
    label?: string;

    /** Tooltip for the primary button. */
    tooltip: string;

    /** Display style. Default: inherits from region or toolbar. */
    style?: ToolStyle;

    /** Whether the primary button is a toggle. Default: false. */
    toggle?: boolean;

    /** Initial toggle state. Default: false. */
    active?: boolean;

    /** Disabled state. Default: false. */
    disabled?: boolean;

    /** Hidden state. Default: false. */
    hidden?: boolean;

    /** Overflow priority. Default: "low". */
    overflowPriority?: ToolOverflowPriority;

    /** Click handler for the primary button. */
    onClick?: (tool: SplitButtonItem, active: boolean) => void;

    /** Dropdown menu items. */
    menuItems: SplitMenuItem[];

    /** KeyTip letter(s) for keyboard shortcut badge. */
    keyTip?: string;

    /** Additional CSS class(es). */
    cssClass?: string;

    /** Arbitrary consumer data. */
    data?: Record<string, unknown>;
}

/** A single item within a split button's dropdown menu. */
interface SplitMenuItem
{
    /** Unique identifier. */
    id: string;

    /** Bootstrap Icons class. */
    icon?: string;

    /** Menu item label (required — always shown in dropdown). */
    label: string;

    /** Disabled state. Default: false. */
    disabled?: boolean;

    /** Click handler. */
    onClick?: (item: SplitMenuItem) => void;
}

/** A gallery control — visual grid/list picker for colours, styles, icons, etc. */
interface GalleryItem
{
    /** Must be "gallery" to distinguish from ToolItem. */
    type: "gallery";

    /** Unique identifier for this gallery. */
    id: string;

    /** Tooltip for the gallery trigger button. */
    tooltip: string;

    /** Bootstrap Icons class for the collapsed trigger button. */
    icon?: string;

    /** Text label for the trigger button. */
    label?: string;

    /** Display style for the trigger button. Default: inherits. */
    style?: ToolStyle;

    /** Gallery popup layout. Default: "grid". */
    layout?: GalleryLayout;

    /** Number of columns in grid layout. Default: 4. */
    columns?: number;

    /** Gallery option items. */
    options: GalleryOption[];

    /** Currently selected option ID. */
    selectedId?: string;

    /** Disabled state. Default: false. */
    disabled?: boolean;

    /** Hidden state. Default: false. */
    hidden?: boolean;

    /** Overflow priority. Default: "low". */
    overflowPriority?: ToolOverflowPriority;

    /** Called when a gallery option is selected. */
    onSelect?: (option: GalleryOption, gallery: GalleryItem) => void;

    /** KeyTip letter(s) for keyboard shortcut badge. */
    keyTip?: string;

    /** Additional CSS class(es). */
    cssClass?: string;
}

/** A single option within a gallery picker. */
interface GalleryOption
{
    /** Unique identifier. */
    id: string;

    /** Display label (used in list layout and as tooltip in grid layout). */
    label: string;

    /** Bootstrap Icons class. Shown in grid cells or list items. */
    icon?: string;

    /** CSS colour value. For colour-swatch galleries, fills the grid cell. */
    color?: string;

    /** HTML preview content (e.g., styled text for font/style pickers). Sanitised before insertion. */
    preview?: string;

    /** Disabled state. Default: false. */
    disabled?: boolean;
}

/** A separator between tools within a region. */
interface ToolSeparator
{
    /** Must be "separator" to distinguish from ToolItem. */
    type: "separator";
}

/** Serialisable toolbar layout state for persistence. */
interface ToolbarLayoutState
{
    /** Toolbar ID. */
    id: string;

    /** Current mode. */
    mode: ToolbarMode;

    /** Current orientation. */
    orientation: ToolbarOrientation;

    /** Dock position (if docked). */
    dockPosition?: ToolbarDockPosition;

    /** Floating coordinates (if floating). */
    floatX?: number;
    floatY?: number;

    /** Current size in orientation axis (px). */
    size?: number;

    /** IDs of tools currently in the overflow menu. */
    overflowedToolIds?: string[];

    /** IDs of hidden regions. */
    hiddenRegionIds?: string[];

    /** Timestamp of when the state was saved (ISO 8601). */
    savedAt: string;
}

/** A region (group) of related tools. */
interface ToolbarRegion
{
    /** Unique identifier for this region. */
    id: string;

    /** Region title text. Displayed as a small label. */
    title?: string;

    /** Whether to show the region title. Default: true if title is set. */
    showTitle?: boolean;

    /** Tool items, split buttons, galleries, and separators within this region. */
    items: Array<ToolItem | SplitButtonItem | GalleryItem | ToolSeparator>;

    /** Default tool style for items in this region. */
    style?: ToolStyle;

    /** Hidden state — hides the entire region. Default: false. */
    hidden?: boolean;

    /** Additional CSS class(es) for the region element. */
    cssClass?: string;
}

/** Configuration options for the Toolbar component. */
interface ToolbarOptions
{
    /** Unique identifier. Auto-generated if omitted. */
    id?: string;

    /** Descriptive label for accessibility. Required. */
    label: string;

    /** Regions containing tool items. */
    regions: ToolbarRegion[];

    /** Toolbar orientation. Default: "horizontal". */
    orientation?: ToolbarOrientation;

    /** Positioning mode. Default: "docked". */
    mode?: ToolbarMode;

    /** Dock edge. Default: "top" for horizontal, "left" for vertical. */
    dockPosition?: ToolbarDockPosition;

    /** Default tool style for all items. Default: "icon". */
    style?: ToolStyle;

    /** Tool button size in pixels (width and height). Default: 32. */
    toolSize?: number;

    /** Icon size within tool buttons in pixels. Default: 16. */
    iconSize?: number;

    /** Enable overflow menu for excess tools. Default: true. */
    overflow?: boolean;

    /** Enable resize handle. Default: true. */
    resizable?: boolean;

    /** Minimum size in orientation axis (px). Default: 120. */
    minSize?: number;

    /** Maximum size in orientation axis (px). Default: none (viewport). */
    maxSize?: number;

    /** Enable floating drag via the grip area. Default: true when floating. */
    draggable?: boolean;

    /** Enable drag-to-dock: dragging near a viewport edge snaps to docked mode. Default: true. */
    dragToDock?: boolean;

    /** Distance in pixels from viewport edge to trigger dock zone. Default: 40. */
    dragToDockThreshold?: number;

    /** Enable keyboard shortcut badges (KeyTips) on Alt press. Default: true. */
    keyTips?: boolean;

    /** Enable layout persistence via saveLayout/restoreLayout. Default: false. */
    persistLayout?: boolean;

    /** Storage key prefix for layout persistence. Default: "toolbar-layout-". */
    persistKey?: string;

    /** Initial floating X position (px). */
    floatX?: number;

    /** Initial floating Y position (px). */
    floatY?: number;

    /** Background colour (CSS value). */
    backgroundColor?: string;

    /** Text / icon colour (CSS value). */
    textColor?: string;

    /** Border colour (CSS value). */
    borderColor?: string;

    /** Font family (CSS value). */
    fontFamily?: string;

    /** Font size for labels and titles (CSS value). */
    fontSize?: string;

    /** CSS z-index override. */
    zIndex?: number;

    /** Additional CSS class(es) for the root element. */
    cssClass?: string;

    /** Called when a tool is clicked. Global handler; per-tool onClick takes precedence. */
    onToolClick?: (tool: ToolItem, active: boolean) => void;

    /** Called when the toolbar is resized. */
    onResize?: (size: number) => void;

    /** Called when mode changes (docked/floating). */
    onModeChange?: (mode: ToolbarMode) => void;

    /** Called when orientation changes. */
    onOrientationChange?: (orientation: ToolbarOrientation) => void;
}
```

### 4.3 Class: Toolbar

| Method | Description |
|--------|-------------|
| `constructor(options)` | Creates the toolbar DOM but does not attach to the page. |
| `show()` | Appends to `document.body`, sets CSS custom properties. |
| `hide()` | Removes from DOM without destroying state. |
| `destroy()` | Hides, releases all references and event listeners. |
| `dock(position)` | Switches to docked mode at the given edge. |
| `float(x?, y?)` | Switches to floating mode at optional coordinates. |
| `setOrientation(o)` | Changes orientation (horizontal/vertical). Rebuilds layout. |
| `addRegion(region, index?)` | Adds a region at optional position. |
| `removeRegion(regionId)` | Removes a region by ID. |
| `getRegion(regionId)` | Returns the region configuration. |
| `addTool(regionId, tool, index?)` | Adds a tool to a region at optional position. |
| `removeTool(toolId)` | Removes a tool by ID from any region. |
| `getTool(toolId)` | Returns the tool configuration. |
| `setToolState(toolId, state)` | Updates tool properties (active, disabled, hidden, icon, label, tooltip). |
| `getToolState(toolId)` | Returns current tool state. |
| `setStyle(style)` | Changes the default tool display style. |
| `setToolSize(size)` | Changes tool button size (px). |
| `recalculateOverflow()` | Forces overflow recalculation. |
| `setGallerySelection(galleryId, optionId)` | Programmatically select a gallery option. |
| `getGallerySelection(galleryId)` | Returns the currently selected gallery option ID. |
| `setSplitMenuItems(splitId, items)` | Updates the dropdown menu items of a split button. |
| `showKeyTips()` | Programmatically activates KeyTip badge display. |
| `hideKeyTips()` | Hides KeyTip badges. |
| `saveLayout()` | Serialises current layout state to `localStorage`. Returns the `ToolbarLayoutState`. |
| `restoreLayout()` | Reads layout state from `localStorage` and applies it. Returns `true` if state was found and applied. |
| `getLayoutState()` | Returns the current `ToolbarLayoutState` without persisting. |
| `applyLayoutState(state)` | Applies a `ToolbarLayoutState` object (e.g., from server-side storage). |
| `getMode()` | Returns current mode ("docked" or "floating"). |
| `getOrientation()` | Returns current orientation. |
| `getDockPosition()` | Returns current dock position. |
| `isVisible()` | Returns whether the toolbar is in the DOM. |
| `getElement()` | Returns the root DOM element. |

### 4.4 Convenience Functions

| Function | Description |
|----------|-------------|
| `createToolbar(options)` | Create, show, and return a Toolbar instance. |
| `createDockedToolbar(options)` | Shorthand — defaults mode to "docked". |
| `createFloatingToolbar(options)` | Shorthand — defaults mode to "floating". |

### 4.5 Global Exports

```
window.Toolbar
window.createToolbar
window.createDockedToolbar
window.createFloatingToolbar
```

---

## 5. Behaviour

### 5.1 Lifecycle

1. **Construction** — Builds the DOM tree from `options.regions` but does not attach to the page.
2. **show()** — Appends to `<body>`, measures available space, calculates overflow, sets CSS custom properties.
3. **hide()** — Removes from DOM, clears CSS custom properties. State is preserved.
4. **destroy()** — Calls hide, removes all event listeners, nulls references.

### 5.2 Overflow (Priority+ Pattern)

When the toolbar's content exceeds the available space along the orientation axis:

1. Measure total tool width (or height for vertical).
2. Compare against container size minus the overflow button width.
3. Starting from the **last** tool, move tools with `overflowPriority: "always"` into the overflow menu first.
4. Then move `"low"` priority tools (right-to-left for horizontal, bottom-to-top for vertical).
5. Then `"high"` priority tools.
6. Tools with `overflowPriority: "never"` are never moved.
7. If overflow menu has items, show the "..." overflow button. If empty, hide it.
8. When a region's visible tools all overflow, the region title and divider are also hidden.
9. Overflow dropdown mirrors the region structure: region titles as non-interactive headers, tools as menu items with icon and label.

**Triggers for recalculation:**
- Window `resize` event (debounced 150ms).
- `addTool()`, `removeTool()`, `setToolState()` (hidden changes).
- `setOrientation()`, `dock()`, `float()`, resize handle drag.

### 5.3 Docked Mode

| Dock Position | CSS Positioning | Axis |
|--------------|-----------------|------|
| top | `position: fixed; top: var(--bannerbar-height, 0px); left: 0; width: 100%` | Horizontal |
| bottom | `position: fixed; bottom: var(--statusbar-height, 0px); left: 0; width: 100%` | Horizontal |
| left | `position: fixed; top: var(--bannerbar-height, 0px); left: 0; height: 100%` | Vertical |
| right | `position: fixed; top: var(--bannerbar-height, 0px); right: 0; height: 100%` | Vertical |

- Respects `--bannerbar-height`, `--statusbar-height`, `--sidebar-left-width`, `--sidebar-right-width` CSS custom properties from sibling components.
- Sets `--toolbar-<position>-size` on `<html>` for layout integration (e.g., `--toolbar-top-size: 40px`).
- Dock position must be compatible with orientation: top/bottom require horizontal, left/right require vertical. Mismatched combinations auto-correct the orientation.

### 5.4 Floating Mode

- `position: fixed` with explicit `top`/`left` coordinates.
- Draggable via a grip area (left edge for horizontal, top edge for vertical).
- Grip area: 8px wide/tall drag strip with a dotted grip pattern.
- Uses `setPointerCapture` for reliable cross-element tracking.
- Constrained to viewport bounds.
- Does not set layout CSS custom properties.

### 5.4.1 Drag-to-Dock

During floating drag, when `dragToDock` is enabled (default):

1. If the pointer enters within `dragToDockThreshold` (default 40px) of a viewport edge, a translucent dock-zone indicator appears at that edge.
2. The dock zone edge is determined by proximity:
   - Near top edge → `.toolbar-dock-zone-top` (horizontal dock).
   - Near bottom edge → `.toolbar-dock-zone-bottom` (horizontal dock).
   - Near left edge → `.toolbar-dock-zone-left` (vertical dock).
   - Near right edge → `.toolbar-dock-zone-right` (vertical dock).
3. Releasing the pointer within the zone triggers `dock()` at that edge. Orientation auto-corrects to match.
4. Moving the pointer away from the edge hides the dock zone indicator.
5. Dock zone indicators are semi-transparent overlays managed by the Toolbar instance (not a shared manager, unlike Sidebar — each toolbar owns its own zones).

### 5.5 Resize

- Resize handle appears at the **end** of the toolbar in the orientation axis direction.
- Horizontal toolbar: resize handle on the right edge (changes width).
- Vertical toolbar: resize handle on the bottom edge (changes height).
- Cross-axis dimension is fixed (determined by `toolSize` and padding).
- Uses `setPointerCapture` for drag tracking.
- Clamped to `minSize`/`maxSize`.
- Arrow keys adjust by 10px for keyboard accessibility.
- Triggers overflow recalculation after resize.

### 5.6 Orientation Change

When `setOrientation()` is called:

1. Store current tool state and region configuration.
2. Swap the orientation class on the root element.
3. If docked and the new orientation is incompatible with the dock position, auto-correct:
   - horizontal → left/right becomes top.
   - vertical → top/bottom becomes left.
4. Rebuild internal layout (flex direction, divider orientation).
5. Recalculate overflow.

### 5.7 Tool Toggle

Tools with `toggle: true` maintain an `active` boolean state:

- Click toggles between active/inactive.
- Active tools receive the `.toolbar-tool-active` class.
- Toggle state is passed to `onClick` handler.
- `setToolState(id, { active: true/false })` provides programmatic control.

### 5.8 Tool Separators

`{ type: "separator" }` items render as thin lines between tools within a region:

- Horizontal: vertical line (1px wide, tool height minus padding).
- Vertical: horizontal line (1px tall, tool width minus padding).
- Separators never appear in the overflow menu.

### 5.9 Split Buttons

A split button renders as two adjacent elements sharing a single visual container:

1. **Primary button** — standard tool button (icon, optional label). Click fires `onClick`.
2. **Dropdown arrow** — small chevron-down button (`bi-chevron-down`). Click opens a dropdown menu.

Behaviour:
- The primary button and dropdown arrow are visually joined (no gap, shared border).
- The dropdown menu uses the standard Bootstrap dropdown pattern (`position: absolute`, click-outside closes).
- Arrow keys navigate menu items. Escape closes the menu and returns focus to the arrow button.
- When a split button overflows, it appears in the overflow menu as a submenu: the primary action is the top item, followed by a divider and the menu items.
- Toggle support: if `toggle: true`, the primary button maintains active state independently of the dropdown.
- Both parts share the same `toolSize` as regular tools.

### 5.10 Gallery Controls

A gallery control renders as a trigger button that opens a popup picker panel:

1. **Trigger button** — standard-sized tool button with icon/label. Shows a small chevron-down indicator.
2. **Gallery popup** — positioned below (horizontal toolbar) or beside (vertical toolbar) the trigger.

Gallery popup behaviour:
- **Grid layout** (default): Options arranged in a CSS grid with configurable columns (default 4).
  - Colour swatches: filled squares showing `option.color`.
  - Icon options: icon-sized cells showing `option.icon`.
  - Preview options: cells showing `option.preview` (sanitised HTML).
- **List layout**: Options arranged vertically with icon + label, similar to a dropdown menu.
- Hovering an option shows a visual highlight. The currently selected option has a check mark or border indicator.
- Clicking an option fires `onSelect`, updates `selectedId`, closes the popup, and updates the trigger button icon/preview to reflect the selection.
- Keyboard: Arrow keys navigate the grid/list. Enter/Space selects. Escape closes.
- When a gallery overflows, it appears in the overflow menu as a submenu item that opens the gallery popup.

Gallery popup sizing:
- Grid: `columns * cellSize + padding`. Cell size matches `toolSize` (default 32px) for icon/colour galleries, or larger (64px) for preview galleries.
- List: standard dropdown width (min 160px, max 280px).
- Max height: 240px with `overflow-y: auto`.

### 5.11 Keyboard Shortcut Badges (KeyTips)

When `keyTips` is enabled (default) and the user presses **Alt**:

1. Small letter badges appear over each visible tool button, split button, and gallery trigger.
2. Badges display the `keyTip` value from the tool's configuration.
3. Pressing the displayed letter activates that tool (equivalent to a click).
4. If the activated tool is a split button or gallery, its dropdown/popup opens and new badges appear over its items.
5. **Escape** dismisses badges and returns to normal mode.
6. Any non-matching keypress dismisses badges.
7. Clicking anywhere dismisses badges.

KeyTip assignment:
- Consumers assign `keyTip` strings to tools via the `ToolItem.keyTip`, `SplitButtonItem.keyTip`, or `GalleryItem.keyTip` property.
- If not specified, no badge is shown for that tool.
- KeyTips should be unique within the toolbar. If duplicates exist, the first match wins and a console warning is logged.
- KeyTips are case-insensitive (displayed uppercase).

KeyTip badge styling:
- Small rounded badge (16px x 16px) with `$gray-900` background and `$white` text.
- Positioned at the bottom-centre of the tool button.
- `z-index` above the toolbar overflow dropdown.
- 200ms fade-in transition.

### 5.12 Layout Persistence

When `persistLayout` is enabled:

**Saving** (`saveLayout()`):
1. Captures current `mode`, `orientation`, `dockPosition`, `floatX`, `floatY`, `size`, overflowed tool IDs, and hidden region IDs into a `ToolbarLayoutState` object.
2. Serialises to JSON and writes to `localStorage` under key `{persistKey}{toolbar.id}`.
3. Returns the state object for consumers who want server-side persistence.

**Restoring** (`restoreLayout()`):
1. Reads from `localStorage` under the same key.
2. Validates the stored state (checks required fields, ignores corrupt data).
3. Applies mode, orientation, dock position, floating coordinates, and size.
4. Returns `true` if state was found and applied, `false` otherwise.

**Auto-save**: If `persistLayout` is true, the toolbar auto-saves layout state after these events:
- `dock()`, `float()`, `setOrientation()`, resize complete, `hide()`.
- Debounced to avoid excessive writes (500ms).

**`applyLayoutState(state)`**: Accepts an externally provided `ToolbarLayoutState` (e.g., fetched from a server API). This decouples persistence from `localStorage` — consumers can use any storage backend.

**Security**: Only serialisable primitive values are stored. No functions, DOM references, or executable content.

---

## 6. DOM Structure

### 6.1 Horizontal Docked

```html
<div class="toolbar toolbar-horizontal toolbar-docked toolbar-docked-top"
     role="toolbar" aria-label="Document formatting" aria-orientation="horizontal">

    <!-- Grip (floating only) -->

    <div class="toolbar-region" data-region-id="formatting">
        <span class="toolbar-region-title">Formatting</span>
        <div class="toolbar-region-items">
            <button class="toolbar-tool" data-tool-id="bold"
                    type="button" tabindex="0"
                    aria-label="Bold" aria-pressed="false">
                <i class="bi bi-type-bold toolbar-tool-icon"></i>
            </button>
            <button class="toolbar-tool" data-tool-id="italic"
                    type="button" tabindex="-1"
                    aria-label="Italic" aria-pressed="false">
                <i class="bi bi-type-italic toolbar-tool-icon"></i>
            </button>
            <div class="toolbar-separator" role="separator"></div>
            <button class="toolbar-tool" data-tool-id="align-left"
                    type="button" tabindex="-1"
                    aria-label="Align left">
                <i class="bi bi-text-left toolbar-tool-icon"></i>
            </button>
        </div>
    </div>

    <div class="toolbar-divider" role="separator"></div>

    <div class="toolbar-region" data-region-id="insert">
        <span class="toolbar-region-title">Insert</span>
        <div class="toolbar-region-items">
            <button class="toolbar-tool" data-tool-id="table"
                    type="button" tabindex="-1"
                    aria-label="Insert table">
                <i class="bi bi-table toolbar-tool-icon"></i>
            </button>
        </div>
    </div>

    <!-- Overflow -->
    <div class="toolbar-overflow">
        <button class="toolbar-overflow-btn" type="button"
                aria-haspopup="true" aria-expanded="false"
                aria-label="More tools" tabindex="-1">
            <i class="bi bi-three-dots toolbar-tool-icon"></i>
        </button>
        <div class="toolbar-overflow-menu" role="menu">
            <!-- Populated dynamically -->
        </div>
    </div>

    <!-- Resize handle -->
    <div class="toolbar-resize-handle"
         role="separator" aria-orientation="vertical"
         aria-valuenow="400" aria-valuemin="120" aria-valuemax="1200"
         tabindex="0">
    </div>
</div>
```

### 6.2 Split Button

```html
<div class="toolbar-split" data-tool-id="paste">
    <button class="toolbar-split-primary toolbar-tool" type="button"
            tabindex="-1" aria-label="Paste" aria-pressed="false">
        <i class="bi bi-clipboard toolbar-tool-icon"></i>
    </button>
    <button class="toolbar-split-arrow" type="button"
            tabindex="-1" aria-haspopup="true" aria-expanded="false"
            aria-label="Paste options">
        <i class="bi bi-chevron-down"></i>
    </button>
    <div class="toolbar-split-menu" role="menu">
        <button class="toolbar-split-menu-item" role="menuitem" data-item-id="paste-plain">
            <i class="bi bi-file-text"></i>
            <span>Paste as plain text</span>
        </button>
        <button class="toolbar-split-menu-item" role="menuitem" data-item-id="paste-special">
            <i class="bi bi-file-earmark-code"></i>
            <span>Paste special</span>
        </button>
    </div>
</div>
```

### 6.3 Gallery Control

```html
<div class="toolbar-gallery" data-tool-id="font-color">
    <button class="toolbar-gallery-trigger toolbar-tool" type="button"
            tabindex="-1" aria-haspopup="true" aria-expanded="false"
            aria-label="Font colour">
        <i class="bi bi-palette toolbar-tool-icon"></i>
        <i class="bi bi-chevron-down toolbar-gallery-chevron"></i>
    </button>
    <div class="toolbar-gallery-popup" role="listbox" aria-label="Font colour options">
        <div class="toolbar-gallery-grid" style="grid-template-columns: repeat(4, 1fr);">
            <button class="toolbar-gallery-option toolbar-gallery-option-selected"
                    role="option" aria-selected="true" data-option-id="red"
                    title="Red">
                <span class="toolbar-gallery-swatch" style="background-color: #dc2626;"></span>
            </button>
            <button class="toolbar-gallery-option"
                    role="option" aria-selected="false" data-option-id="blue"
                    title="Blue">
                <span class="toolbar-gallery-swatch" style="background-color: #1c7ed6;"></span>
            </button>
            <!-- More options... -->
        </div>
    </div>
</div>
```

### 6.4 KeyTip Badges

```html
<!-- Badges are appended as siblings to tool buttons when Alt is pressed -->
<span class="toolbar-keytip" aria-hidden="true">B</span>
```

### 6.5 Dock Zone Indicators (Drag-to-Dock)

```html
<!-- Appended to <body> during floating drag when near an edge -->
<div class="toolbar-dock-zone toolbar-dock-zone-top toolbar-dock-zone-active"
     aria-hidden="true"></div>
```

### 6.6 Overflow Menu Structure

```html
<div class="toolbar-overflow-menu" role="menu">
    <span class="toolbar-overflow-region-title">Formatting</span>
    <button class="toolbar-overflow-item" role="menuitem" data-tool-id="underline">
        <i class="bi bi-type-underline"></i>
        <span>Underline</span>
    </button>
    <div class="toolbar-overflow-divider" role="separator"></div>
    <span class="toolbar-overflow-region-title">Insert</span>
    <button class="toolbar-overflow-item" role="menuitem" data-tool-id="image">
        <i class="bi bi-image"></i>
        <span>Insert image</span>
    </button>
</div>
```

---

## 7. CSS Classes

| Class | Description |
|-------|-------------|
| `.toolbar` | Root container — `position: fixed` |
| `.toolbar-horizontal` | Horizontal orientation modifier |
| `.toolbar-vertical` | Vertical orientation modifier |
| `.toolbar-docked` | Docked mode modifier |
| `.toolbar-docked-top` / `-bottom` / `-left` / `-right` | Dock position modifiers |
| `.toolbar-floating` | Floating mode modifier |
| `.toolbar-grip` | Drag grip strip (floating mode only) |
| `.toolbar-region` | Region container |
| `.toolbar-region-title` | Region title label |
| `.toolbar-region-items` | Flex container for tools within a region |
| `.toolbar-divider` | Vertical/horizontal line between regions |
| `.toolbar-tool` | Individual tool button |
| `.toolbar-tool-icon` | Icon element within a tool |
| `.toolbar-tool-label` | Text label within a tool (icon-label style) |
| `.toolbar-tool-active` | Active/pressed toggle state |
| `.toolbar-tool-disabled` | Disabled tool state |
| `.toolbar-separator` | Thin line between tools within a region |
| `.toolbar-split` | Split button container (primary + arrow) |
| `.toolbar-split-primary` | Primary action button within a split button |
| `.toolbar-split-arrow` | Dropdown arrow button within a split button |
| `.toolbar-split-menu` | Dropdown menu for split button |
| `.toolbar-split-menu-item` | Menu item in split button dropdown |
| `.toolbar-gallery` | Gallery control container |
| `.toolbar-gallery-trigger` | Gallery trigger button |
| `.toolbar-gallery-chevron` | Small chevron indicator on gallery trigger |
| `.toolbar-gallery-popup` | Gallery popup panel |
| `.toolbar-gallery-grid` | CSS grid container for gallery options |
| `.toolbar-gallery-list` | List container for gallery options (list layout) |
| `.toolbar-gallery-option` | Individual gallery option button |
| `.toolbar-gallery-option-selected` | Currently selected gallery option |
| `.toolbar-gallery-swatch` | Colour swatch element within a gallery option |
| `.toolbar-overflow` | Overflow container |
| `.toolbar-overflow-btn` | "..." overflow trigger button |
| `.toolbar-overflow-menu` | Dropdown menu for overflowed tools |
| `.toolbar-overflow-item` | Menu item in overflow dropdown |
| `.toolbar-overflow-region-title` | Region header in overflow dropdown |
| `.toolbar-overflow-divider` | Divider in overflow dropdown |
| `.toolbar-keytip` | KeyTip letter badge overlay |
| `.toolbar-keytips-active` | Root modifier when KeyTip mode is active |
| `.toolbar-dock-zone` | Dock zone indicator (drag-to-dock) |
| `.toolbar-dock-zone-top` / `-bottom` / `-left` / `-right` | Edge-specific dock zones |
| `.toolbar-dock-zone-active` | Dock zone when pointer is within threshold |
| `.toolbar-resize-handle` | Resize drag strip |

---

## 8. Styling

### 8.1 Theme Integration

| Property | Value | Source |
|----------|-------|--------|
| Background | `$gray-100` | Light, non-distracting |
| Border | `1px solid $gray-300` | Consistent with cards and panels |
| Tool button default | `transparent` background | Clean, icon-forward |
| Tool button hover | `$gray-200` background | Subtle highlight |
| Tool button active (toggle) | `$blue-100` background, `$blue-700` icon colour | Matches `$primary` family |
| Tool button disabled | `$gray-400` icon colour, 0.5 opacity | Standard disabled pattern |
| Region title | `$gray-500`, `$font-size-sm` (0.8rem), `$font-weight-semibold` | Subdued but readable |
| Divider colour | `$gray-300` | Matches border |
| Overflow menu | `$white` background, `$gray-300` border | Standard dropdown pattern |
| Overflow item hover | `$gray-100` background | Matches Bootstrap dropdown |
| Grip pattern | `$gray-400` dotted | Subtle drag affordance |
| Split button arrow | `$gray-500` icon, `$gray-200` hover bg | Distinct from primary |
| Split button divider | `1px solid $gray-300` | Visual separation between primary and arrow |
| Gallery popup | `$white` background, `$gray-300` border, `box-shadow` | Standard dropdown elevation |
| Gallery swatch | 28x28px, `1px solid $gray-300` border | Clean colour preview |
| Gallery option hover | `$gray-100` background | Subtle highlight |
| Gallery option selected | `2px solid $blue-600` border | Clear selection indicator |
| KeyTip badge | `$gray-900` bg, `$white` text, 10px font, 16x16px | High contrast, compact |
| Dock zone indicator | `rgba($blue-600, 0.15)` background, `2px dashed $blue-400` border | Translucent drop target |

### 8.2 Tool Sizes

All tool buttons within a toolbar share the same height and width for visual consistency.

| Size | Button (px) | Icon (px) | Use Case |
|------|------------|-----------|----------|
| Small (sm) | 28 | 14 | Compact toolbars, secondary actions |
| Medium (default) | 32 | 16 | Standard toolbars |
| Large (lg) | 40 | 20 | Touch-friendly, primary toolbars |

The `toolSize` and `iconSize` options allow custom pixel values beyond these presets.

### 8.3 Dimensions

| Orientation | Cross-axis size | Calculation |
|-------------|----------------|-------------|
| Horizontal | Height | `toolSize + 2 * padding (4px) + region-title-height (if shown, ~16px) + border (2px)` |
| Vertical | Width | `toolSize + 2 * padding (4px) + border (2px)` |

### 8.4 Z-Index

| Element | Z-Index | Rationale |
|---------|---------|-----------|
| Docked toolbar | 1032 | Above Bootstrap fixed nav (1030), below Sidebar (1035) |
| Floating toolbar | 1033 | Above docked toolbar, below Sidebar (1035) |
| Overflow / split / gallery dropdown | 1034 | Above floating toolbar, below Sidebar (1035) |
| KeyTip badges | 1034 | Same layer as dropdowns (mutually exclusive) |
| Dock zone indicators | 1034 | Same layer as dropdowns (only during drag) |
| Sidebar (docked) | 1035 | Above toolbar |
| StatusBar | 1040 | Above sidebar |
| BannerBar | 1045 | Above status bar |
| Bootstrap Modal | 1050+ | Above everything |

---

## 9. CSS Custom Properties

The toolbar sets CSS custom properties on `<html>` when docked:

| Property | Set When | Example Value |
|----------|----------|---------------|
| `--toolbar-top-size` | Docked top | `48px` |
| `--toolbar-bottom-size` | Docked bottom | `48px` |
| `--toolbar-left-size` | Docked left | `40px` |
| `--toolbar-right-size` | Docked right | `40px` |

Consumers can use these for layout offsets (e.g., `padding-top: var(--toolbar-top-size, 0px)`).

Properties are cleared when the toolbar is hidden or undocked.

---

## 10. Keyboard Accessibility

Follows the [WAI-ARIA Toolbar Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/).

### 10.1 Navigation

| Key | Action |
|-----|--------|
| **Tab** | Moves focus into toolbar (to last-focused or first enabled tool) |
| **Shift+Tab** | Moves focus out of toolbar |
| **Right Arrow** | Next tool (horizontal) |
| **Left Arrow** | Previous tool (horizontal) |
| **Down Arrow** | Next tool (vertical) / open dropdown when on split arrow or gallery |
| **Up Arrow** | Previous tool (vertical) |
| **Home** | First tool in toolbar |
| **End** | Last tool in toolbar |
| **Enter / Space** | Activate focused tool / select gallery option |
| **Escape** | Close dropdown/gallery/overflow/keytips |
| **Alt** | Toggle KeyTip badge display |

### 10.2 Roving Tabindex

Only one tool in the toolbar has `tabindex="0"` at a time (the currently focused tool). All others have `tabindex="-1"`. Arrow keys move focus and update tabindex values.

### 10.3 ARIA Attributes

| Element | Attribute | Value |
|---------|-----------|-------|
| Root | `role="toolbar"` | Required |
| Root | `aria-label` | Descriptive label (from `options.label`) |
| Root | `aria-orientation` | `"horizontal"` or `"vertical"` |
| Tool button | `type="button"` | Prevents form submission |
| Toggle tool | `aria-pressed` | `"true"` or `"false"` |
| Disabled tool | `aria-disabled` | `"true"` |
| Overflow button | `aria-haspopup` | `"true"` |
| Overflow button | `aria-expanded` | `"true"` or `"false"` |
| Overflow menu | `role="menu"` | Standard menu pattern |
| Overflow item | `role="menuitem"` | Standard menu item |
| Split button arrow | `aria-haspopup` | `"true"` |
| Split button arrow | `aria-expanded` | `"true"` or `"false"` |
| Split button menu | `role="menu"` | Standard menu pattern |
| Split button menu item | `role="menuitem"` | Standard menu item |
| Gallery trigger | `aria-haspopup` | `"true"` |
| Gallery trigger | `aria-expanded` | `"true"` or `"false"` |
| Gallery popup | `role="listbox"` | Selection list pattern |
| Gallery option | `role="option"` | Selectable option |
| Gallery option | `aria-selected` | `"true"` or `"false"` |
| KeyTip badge | `aria-hidden` | `"true"` (visual only, not for screen readers) |
| Dock zone | `aria-hidden` | `"true"` (visual indicator only) |
| Resize handle | `role="separator"` | Resize affordance |
| Resize handle | `aria-valuenow` / `min` / `max` | Current and limit sizes |

### 10.4 Resize Keyboard

| Key | Action |
|-----|--------|
| **Left/Right Arrow** | Resize horizontal toolbar by 10px |
| **Up/Down Arrow** | Resize vertical toolbar by 10px |

### 10.5 Split Button Keyboard

| Key | Action |
|-----|--------|
| **Enter / Space** on primary | Activates the primary action |
| **Enter / Space / Down Arrow** on arrow | Opens the dropdown menu |
| **Up / Down Arrow** in menu | Navigates menu items |
| **Enter / Space** on menu item | Activates the menu item, closes menu |
| **Escape** in menu | Closes menu, returns focus to arrow button |

### 10.6 Gallery Keyboard

| Key | Action |
|-----|--------|
| **Enter / Space / Down Arrow** on trigger | Opens the gallery popup |
| **Arrow keys** in grid | Navigates options (Left/Right within row, Up/Down across rows) |
| **Arrow keys** in list | Up/Down navigates options |
| **Enter / Space** on option | Selects option, closes popup |
| **Escape** in popup | Closes popup, returns focus to trigger |

### 10.7 KeyTip Keyboard

| Key | Action |
|-----|--------|
| **Alt** | Activates KeyTip mode — badges appear |
| **Letter key** matching a badge | Activates that tool |
| **Escape** | Dismisses KeyTip badges |
| **Any non-matching key** | Dismisses KeyTip badges |
| **Alt** (while badges shown) | Dismisses KeyTip badges |

---

## 11. Tooltip Behaviour

- Every tool button shows a tooltip on hover after a 500ms delay.
- Tooltips use Bootstrap 5's native tooltip system (`data-bs-toggle="tooltip"`).
- Tooltip text comes from `tool.tooltip`.
- Tooltip placement: below for horizontal toolbars, right for vertical toolbars.
- Tooltips are not shown for tools in the overflow menu (labels are visible there).
- If Bootstrap JS is not loaded, tooltips degrade gracefully to the `title` attribute.

---

## 12. Integration with Existing Components

### 12.1 BannerBar

Docked toolbars respect `--bannerbar-height`:

- Top-docked: `top: var(--bannerbar-height, 0px)`.
- Left/right-docked: `top: var(--bannerbar-height, 0px)`.

### 12.2 StatusBar

- Bottom-docked: `bottom: var(--statusbar-height, 0px)`.

### 12.3 Sidebar

- Left-docked toolbar: `left: var(--sidebar-left-width, 0px)`.
- Right-docked toolbar: `right: var(--sidebar-right-width, 0px)`.
- Top-docked toolbar width accounts for sidebar widths.

### 12.4 Multiple Toolbars

Multiple toolbars can coexist. Each sets its own CSS custom property. Stacking (e.g., two top-docked toolbars) is not supported in v1 — the second toolbar overlaps the first. Consumers should use a single toolbar with multiple regions for complex tool sets.

---

## 13. Edge Cases

| Scenario | Behaviour |
|----------|-----------|
| All tools overflow | Only the "..." overflow button remains visible |
| Single tool with `never` priority | Always visible even if others overflow |
| Empty region (all tools hidden) | Region title and divider are hidden |
| Zero regions | Toolbar renders empty with just the grip (floating) or nothing (docked) |
| Orientation mismatch with dock | Auto-corrects orientation to match dock position |
| Window resize to very small | Overflow absorbs tools progressively; minimum size enforced |
| Tool added while overflowed | Triggers recalculation; new tool may go directly to overflow |
| Floating toolbar dragged off-screen | Constrained to viewport bounds |
| Destroy while overflow menu open | Closes menu, removes all DOM elements |
| Split button overflows | Appears in overflow menu as submenu (primary action + menu items) |
| Gallery overflows | Appears in overflow menu; clicking opens gallery popup from menu |
| Gallery with zero options | Trigger button renders disabled; popup does not open |
| Gallery `preview` with unsafe HTML | Sanitised via `textContent` or DOMPurify if available |
| Drag-to-dock near corner | Nearest edge wins (measured by perpendicular distance) |
| Drag-to-dock while another toolbar is docked there | Replaces the existing dock position |
| KeyTip with duplicate letters | First match wins; console warning logged |
| KeyTip on hidden/disabled tool | Badge not shown |
| KeyTip activated on split button | Opens dropdown; new badges appear on menu items |
| Layout restore with missing regions/tools | Applies position/mode; ignores stale tool/region references |
| localStorage unavailable | `saveLayout()` logs warning, returns state object; `restoreLayout()` returns false |
| Layout state from different toolbar version | Validated on restore; incompatible state is ignored with warning |

---

## 14. Files

| File | Purpose |
|------|---------|
| `specs/toolbar.prd.md` | This specification |
| `components/toolbar/toolbar.ts` | TypeScript source |
| `components/toolbar/toolbar.scss` | Styles |
| `components/toolbar/README.md` | Documentation |

---

## 15. Implementation Notes

### 15.1 Overflow Algorithm

Use `ResizeObserver` on the toolbar's region container to detect size changes. On each observation:

1. Temporarily show all tools (remove `display: none`).
2. Measure each tool's `offsetWidth` (or `offsetHeight` for vertical).
3. Calculate cumulative widths. When cumulative exceeds container minus overflow button width, mark remaining tools as overflowed based on priority.
4. Apply `display: none` to overflowed tools.
5. Rebuild the overflow menu dropdown.

This avoids layout thrashing by batching measurements and mutations.

### 15.2 Tooltip Initialisation

After `show()` and after any `addTool()`, initialise Bootstrap tooltips on new tool buttons:

```typescript
const tooltipTriggerList = root.querySelectorAll('[data-bs-toggle="tooltip"]');
tooltipTriggerList.forEach(el => new bootstrap.Tooltip(el));
```

If `bootstrap.Tooltip` is not available, fall back to native `title` attribute.

### 15.3 Pointer Capture for Drag and Resize

Reuse the same `setPointerCapture` / `releasePointerCapture` pattern established in the Sidebar component for reliable cross-element tracking during floating drag and resize operations.

### 15.4 Performance

- Debounce window resize handler (150ms).
- Use `requestAnimationFrame` for drag/resize visual updates.
- Minimise DOM reads during overflow calculation (batch all measurements before mutations).
- Cache tool element references in a `Map<string, HTMLElement>` for O(1) lookup.

### 15.5 Split Button Dropdown

Reuse the Bootstrap dropdown positioning pattern. The menu is `position: absolute` relative to the `.toolbar-split` container. Click-outside detection uses a single `document.addEventListener("pointerdown", ...)` listener registered once on `show()` and cleaned up on `destroy()`.

### 15.6 Gallery Popup Positioning

Gallery popups use the same positioning strategy as split button menus:
- Horizontal toolbar: popup opens below the trigger, aligned to its left edge.
- Vertical toolbar: popup opens to the right of the trigger, aligned to its top edge.
- If the popup would extend beyond the viewport, flip to the opposite side.
- Gallery option `preview` content is sanitised: if DOMPurify is available, use it; otherwise strip all tags and use `textContent`.

### 15.7 KeyTip Badge Positioning

KeyTip badges are absolutely positioned `<span>` elements appended as children of the toolbar root. Their positions are calculated from each tool button's `getBoundingClientRect()` relative to the toolbar's own rect. Badges are removed from DOM when KeyTip mode deactivates.

Alt key handling:
- Listen for `keydown` on `document`. On `Alt` press (without other modifiers), toggle KeyTip mode.
- Prevent browser default Alt behaviour (menu bar activation) with `e.preventDefault()` only when KeyTip mode activates.
- If the toolbar is not visible or has no tools with `keyTip` set, do not activate.

### 15.8 Layout Persistence Storage

```typescript
// Save
const state: ToolbarLayoutState = toolbar.getLayoutState();
localStorage.setItem(`${persistKey}${toolbar.id}`, JSON.stringify(state));

// Restore
const raw = localStorage.getItem(`${persistKey}${toolbar.id}`);
if (raw)
{
    try
    {
        const state = JSON.parse(raw) as ToolbarLayoutState;
        toolbar.applyLayoutState(state);
    }
    catch (e)
    {
        console.warn(LOG_PREFIX, "Failed to restore layout:", e);
    }
}
```

Wrap all `localStorage` access in try/catch for environments where storage is disabled or full.

### 15.9 Drag-to-Dock Zone Management

During floating drag (`pointermove`):
1. Calculate distance from pointer to each viewport edge.
2. If minimum distance < `dragToDockThreshold`, show the corresponding dock zone overlay.
3. Only one dock zone is active at a time (nearest edge).
4. On `pointerup` within an active zone, call `dock(position)`.
5. Dock zone overlays are created lazily on first drag and cached for reuse.

---

## 16. Future Considerations (Out of Scope for v1)

These features are explicitly deferred:

- **Toolbar tabs** (ribbon-style tab switching between tool sets).
- **Toolbar stacking** (multiple docked toolbars at the same edge).
- **Custom tool renderers** (consumer-provided DOM for a tool slot).
