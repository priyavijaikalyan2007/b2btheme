<!-- AGENT: Product Requirements Document for the Sidebar component — dockable, floatable, resizable panel with tab grouping. -->

# Sidebar Component

**Status:** Draft
**Component name:** Sidebar
**Folder:** `./components/sidebar/`
**Spec author:** Agent
**Date:** 2026-02-12

---

## 1. Overview

### 1.1 What Is It

A dockable, floatable, resizable sidebar panel component that acts as a container for other components. The sidebar can dock to the left or right viewport edge, float anywhere with drag-based positioning, collapse to a 40px icon strip with a rotated title, resize via drag handles, and group into tabs when multiple sidebars share the same dock edge. Drag-to-dock is supported: dragging a floating sidebar near a viewport edge snaps it into docked mode.

The sidebar uses `.sidebar-container` as its root CSS class to avoid collision with the existing `.sidebar` nav styling in `custom.scss`.

### 1.2 Why Build It

Enterprise SaaS applications frequently need persistent side panels for:

- File explorer and navigation trees (like VS Code's file explorer)
- Tool palettes and property inspectors (like GIMP or Figma)
- Solution explorers and project views (like Visual Studio)
- Context-sensitive detail panels (master-detail layouts)
- Settings and configuration panels

Without a dedicated component, developers build bespoke side panels with inconsistent docking, resizing, z-index, and accessibility behaviour. A reusable, programmable sidebar solves all these problems.

### 1.3 Design Inspiration

| Source | Key Pattern Adopted |
|--------|---------------------|
| VS Code File Explorer | Docked side panel, tab grouping, collapse to icon strip |
| GIMP Tool Palette | Floatable, draggable, resizable tool windows |
| Visual Studio Solution Explorer | Docked panel with auto-hide (collapse), dock-to-edge |
| JetBrains IDEs | Tab-based panel switching at dock edges |

---

## 2. Anatomy

### 2.1 Docked Expanded

```
┌─────────────────────────┐
│ Tab A │ Tab B │          │  ← Tab bar (only when grouped)
├─────────────────────────┤
│ [icon] Title        [-][↗][×] │  ← Title bar
├─────────────────────────┤
│                         │
│   Content area          │  ← Consumer appends here
│   (scrollable)          │
│                         │
├─────────────────────────┤
│ ║                       │  ← Resize handle (4px drag strip)
└─────────────────────────┘
```

### 2.2 Docked Collapsed

```
┌──┐
│  │  ← 40px strip
│ T│  ← Rotated title
│ i│
│ t│
│ l│
│ e│
│  │
└──┘
```

### 2.3 Floating

```
┌─────────────────────────┐
│ [icon] Title        [-][⬓][×] │  ← Title bar (drag handle)
├─────────────────────────┤
│                         │
│   Content area          │
│   (scrollable)          │
│                         │
├─────────────────────────┤
│ Resize handles on all edges    │
└─────────────────────────┘
```

---

## 3. API

### 3.1 Types

```typescript
type SidebarDockPosition = "left" | "right";
type SidebarMode = "docked" | "floating" | "collapsed";
```

### 3.2 Interfaces

```typescript
interface SidebarOptions
{
    /** Unique identifier. Auto-generated if omitted. */
    id?: string;

    /** Title text displayed in the title bar. */
    title: string;

    /** Optional Bootstrap Icons class for the title bar icon. */
    icon?: string;

    /** Initial mode. Default: "docked". */
    mode?: "docked" | "floating";

    /** Dock edge when mode is "docked". Default: "left". */
    dockPosition?: SidebarDockPosition;

    /** Panel width in pixels. Default: 280. */
    width?: number;

    /** Minimum resize width in pixels. Default: 180. */
    minWidth?: number;

    /** Maximum resize width in pixels. Default: 600. */
    maxWidth?: number;

    /** Panel height when floating, in pixels. Default: 400. */
    height?: number;

    /** Minimum floating height in pixels. Default: 200. */
    minHeight?: number;

    /** Maximum floating height in pixels. Default: 800. */
    maxHeight?: number;

    /** Initial floating X position in pixels. */
    floatX?: number;

    /** Initial floating Y position in pixels. */
    floatY?: number;

    /** Start collapsed. Default: false. */
    collapsed?: boolean;

    /** Width when collapsed in pixels. Default: 40. */
    collapsedWidth?: number;

    /** Background colour (CSS value). */
    backgroundColor?: string;

    /** Opacity (0-1). */
    opacity?: number;

    /** Border colour (CSS value). */
    borderColor?: string;

    /** Border width (CSS value). */
    borderWidth?: string;

    /** CSS z-index override. */
    zIndex?: number;

    /** Additional CSS class(es) for the root element. */
    cssClass?: string;

    /** Enable resize handles. Default: true. */
    resizable?: boolean;

    /** Enable floating drag. Default: true. */
    draggable?: boolean;

    /** Enable collapse functionality. Default: true. */
    collapsible?: boolean;

    /** Show title bar. Default: true. */
    showTitleBar?: boolean;

    /** Called when mode changes (docked/floating/collapsed). */
    onModeChange?: (mode: SidebarMode, sidebar: Sidebar) => void;

    /** Called after resize completes. */
    onResize?: (width: number, height: number, sidebar: Sidebar) => void;

    /** Called when collapse state changes. */
    onCollapseToggle?: (collapsed: boolean, sidebar: Sidebar) => void;

    /** Called before close. Return false to cancel. */
    onBeforeClose?: (sidebar: Sidebar) => boolean;

    /** Called after close/destroy. */
    onClose?: (sidebar: Sidebar) => void;
}
```

### 3.3 Class: Sidebar

| Method | Description |
|--------|-------------|
| `constructor(options)` | Creates the sidebar DOM but does not attach to the page. |
| `show()` | Appends to `document.body`, registers with SidebarManager. |
| `hide()` | Removes from DOM without destroying state. |
| `destroy()` | Hides, unregisters, and releases all references. |
| `dock(position)` | Switches to docked mode at the given edge. |
| `float(x?, y?)` | Switches to floating mode at optional coordinates. |
| `collapse()` | Collapses to 40px icon strip. |
| `expand()` | Expands from collapsed state. |
| `toggleCollapse()` | Toggles between collapsed and expanded. |
| `setTitle(title)` | Updates the title bar text. |
| `setIcon(iconClass)` | Updates the title bar icon. |
| `setWidth(w)` | Programmatic width change (clamped to min/max). |
| `setHeight(h)` | Programmatic height change (clamped to min/max). |
| `getContentElement()` | Returns the content `<div>` for appending children. |
| `getMode()` | Returns current mode ("docked", "floating", or "collapsed"). |
| `getDockPosition()` | Returns current dock position ("left" or "right"). |
| `getWidth()` | Returns current width in pixels. |
| `getHeight()` | Returns current height in pixels. |
| `isVisible()` | Returns whether the sidebar is currently in the DOM. |
| `isCollapsed()` | Returns whether the sidebar is collapsed. |

### 3.4 Class: SidebarManager

| Method | Description |
|--------|-------------|
| `getInstance(options?)` | Singleton accessor (lazy creation). |
| `register(sidebar)` | Registers a sidebar for tab grouping and dock management. |
| `unregister(sidebar)` | Removes a sidebar from management. |
| `getSidebars(position?)` | Returns all registered sidebars, optionally filtered by dock position. |
| `getActiveTab(position)` | Returns the active sidebar at a dock position. |
| `setActiveTab(sidebar)` | Activates a specific sidebar tab. |

### 3.5 Globals

```typescript
window.Sidebar = Sidebar;
window.SidebarManager = SidebarManager;
window.createSidebar = createSidebar;
window.createDockedSidebar = createDockedSidebar;
window.createFloatingSidebar = createFloatingSidebar;
```

- `createSidebar(options)` — Creates and shows a sidebar.
- `createDockedSidebar(options)` — Creates a docked sidebar (defaults mode to "docked").
- `createFloatingSidebar(options)` — Creates a floating sidebar (defaults mode to "floating").

---

## 4. Behaviour

### 4.1 Lifecycle

1. **Construction** — Builds the DOM tree but does not attach to the page.
2. **show()** — Appends to `<body>`, registers with `SidebarManager`, updates CSS custom properties.
3. **hide()** — Removes from DOM, updates CSS custom properties. Does not destroy state.
4. **destroy()** — Calls hide, unregisters from `SidebarManager`, fires `onClose`, nulls all references.

### 4.2 Docked Mode

- `position: fixed; top: 0; bottom: var(--statusbar-height, 0px)`.
- Left: `left: 0`. Right: `right: 0`.
- Full viewport height minus the status bar.
- Resize handle on the inner edge only (right edge for left-docked, left edge for right-docked).
- Sets CSS custom properties on `<html>`: `--sidebar-left-width` or `--sidebar-right-width`.

### 4.3 Floating Mode

- `position: fixed` with explicit `top`/`left` coordinates.
- Draggable via title bar using pointer events.
- Resize handles on all edges and corners.
- Does not set sidebar width CSS custom properties.

### 4.4 Collapse

- CSS `transition: width 300ms ease`.
- Collapses to `collapsedWidth` (default 40px).
- Shows a vertical strip with rotated title (`writing-mode: vertical-rl; transform: rotate(180deg)`) and icon.
- Clicking the collapsed strip expands the sidebar.
- Retains dock position for re-expansion.
- Updates CSS custom properties to reflect collapsed width.

### 4.5 Tab Grouping

When multiple sidebars dock to the same edge:

1. `SidebarManager` builds a tab bar (`role="tablist"`) at the top of that edge's dock zone.
2. Tabs use `role="tab"` with `aria-selected`. Content uses `role="tabpanel"` with `aria-labelledby`.
3. Only one tab panel is visible at a time.
4. Clicking a tab activates that sidebar and hides others at the same position.

### 4.6 Drag-to-Dock

During floating drag:

1. If pointer enters within 40px of viewport left or right edge, a translucent drop-zone indicator appears.
2. Releasing within the zone triggers `dock()` at that edge.
3. Drop zone indicators are managed by `SidebarManager`.

### 4.7 Resize

- Custom 4px drag strip element (not CSS `resize` property).
- Uses `setPointerCapture` for reliable cross-element tracking.
- Horizontal-only when docked; multi-axis when floating.
- Arrow keys adjust by 10px for keyboard accessibility.
- Clamped to `minWidth`/`maxWidth` and `minHeight`/`maxHeight`.

### 4.8 CSS Custom Properties

On `show()`, `dock()`, `collapse()`, `expand()`, and `setWidth()`, the component updates:

- `--sidebar-left-width` — total width of docked left sidebars.
- `--sidebar-right-width` — total width of docked right sidebars.

Consumers can use `margin-left: var(--sidebar-left-width, 0px)` to adjust main content.

---

## 5. Styling

### 5.1 CSS Classes

| Class | Description |
|-------|-------------|
| `.sidebar-container` | Root element — `position: fixed` |
| `.sidebar-docked` | Mode modifier — docked to viewport edge |
| `.sidebar-floating` | Mode modifier — free-positioned |
| `.sidebar-collapsed` | Mode modifier — collapsed to icon strip |
| `.sidebar-left` / `.sidebar-right` | Dock edge modifiers |
| `.sidebar-titlebar` | Title bar — drag handle in floating mode |
| `.sidebar-titlebar-icon` | Icon element in title bar |
| `.sidebar-titlebar-text` | Text element in title bar |
| `.sidebar-titlebar-actions` | Button container (collapse/float/close) |
| `.sidebar-collapse-btn` | Collapse button |
| `.sidebar-float-btn` | Float/dock toggle button |
| `.sidebar-close-btn` | Close button |
| `.sidebar-content` | Scrollable content area (`overflow: auto`) |
| `.sidebar-resize-handle` | Resize drag strip base class |
| `.sidebar-resize-handle-h` | Horizontal resize handle |
| `.sidebar-resize-handle-v` | Vertical resize handle |
| `.sidebar-resize-handle-corner` | Corner resize handle |
| `.sidebar-collapsed-strip` | 40px vertical strip when collapsed |
| `.sidebar-collapsed-title` | Rotated text in collapsed strip |
| `.sidebar-collapsed-icon` | Icon in collapsed strip |
| `.sidebar-tab-bar` | Tab container (managed by SidebarManager) |
| `.sidebar-tab` | Individual tab button |
| `.sidebar-tab-active` | Active tab state |
| `.sidebar-dock-zone` | Drop zone indicator base class |
| `.sidebar-dock-zone-left` / `-right` | Edge-specific drop zones |
| `.sidebar-dock-zone-active` | Drop zone when pointer is within range |

### 5.2 Theme Integration

- Background: `$gray-100` (light sidebar) or configurable via `backgroundColor`
- Title bar background: `$gray-800` (dark header)
- Title bar text: `$gray-100`
- Content area: `$white`
- Border: `1px solid $gray-300`
- Tab bar: `$gray-200` background
- Collapsed strip: `$gray-800` background, `$gray-100` text

### 5.3 Z-Index

| Element | Z-Index | Rationale |
|---------|---------|-----------|
| Docked sidebar | 1035 | Above Bootstrap fixed nav (1030), below StatusBar (1040) |
| Floating sidebar | 1036 | Above docked sidebars, below StatusBar (1040) |
| Drop zone overlays | 1037 | Above floating sidebars during drag |
| StatusBar | 1040 | Always on top of sidebars |
| Bootstrap modals | 1050+ | Above everything |

---

## 6. DOM Structure

### 6.1 Docked Expanded

```html
<div class="sidebar-container sidebar-docked sidebar-left" role="complementary" aria-label="...">
    <div class="sidebar-tab-bar" role="tablist">  <!-- only when grouped -->
        <button class="sidebar-tab sidebar-tab-active" role="tab" aria-selected="true">Tab A</button>
        <button class="sidebar-tab" role="tab" aria-selected="false">Tab B</button>
    </div>
    <div class="sidebar-titlebar" role="heading" aria-level="2">
        <i class="bi sidebar-titlebar-icon"></i>
        <span class="sidebar-titlebar-text">Title</span>
        <div class="sidebar-titlebar-actions">
            <button class="sidebar-collapse-btn" aria-expanded="true" aria-label="Collapse sidebar">
                <i class="bi bi-chevron-bar-left"></i>
            </button>
            <button class="sidebar-float-btn" aria-label="Float sidebar">
                <i class="bi bi-box-arrow-up-right"></i>
            </button>
            <button class="sidebar-close-btn" aria-label="Close sidebar">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>
    </div>
    <div class="sidebar-content" role="tabpanel" aria-labelledby="...">
        <!-- Consumer content -->
    </div>
    <div class="sidebar-resize-handle sidebar-resize-handle-h"
         role="separator" aria-orientation="vertical"
         aria-valuenow="280" aria-valuemin="180" aria-valuemax="600"
         tabindex="0">
    </div>
</div>
```

### 6.2 Docked Collapsed

```html
<div class="sidebar-container sidebar-docked sidebar-collapsed sidebar-left" role="complementary">
    <div class="sidebar-collapsed-strip">
        <i class="bi sidebar-collapsed-icon"></i>
        <span class="sidebar-collapsed-title">Title</span>
    </div>
</div>
```

---

## 7. Accessibility

- Root element: `role="complementary"` with descriptive `aria-label`.
- Title bar: `role="heading"` with `aria-level="2"`.
- Collapse button: `aria-expanded="true|false"`, descriptive `aria-label`.
- Tab bar: `role="tablist"`, tabs: `role="tab"` + `aria-selected`, panels: `role="tabpanel"` + `aria-labelledby`.
- Resize handle: `role="separator"`, `aria-orientation="vertical"`, `aria-valuenow/min/max`, arrow key support (10px increments).
- No focus trapping (persistent panel, not modal).
- `touch-action: none` on drag surfaces to prevent scroll interference.
- All title bar buttons are keyboard-accessible (Tab/Enter/Space).
- Sufficient colour contrast meets WCAG AA.

---

## 8. Dependencies

- **Bootstrap 5 CSS** — for `$gray-*` variables in SCSS.
- **Bootstrap Icons** — for title bar action icons and optional sidebar icon.
- No JavaScript framework dependencies.

---

## 9. Open Questions

None at this time.
