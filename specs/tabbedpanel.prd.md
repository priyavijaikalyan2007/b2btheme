<!-- AGENT: Product requirements document for the TabbedPanel component — collapsible, resizable, dockable tabbed panel. -->

# TabbedPanel Component — Product Requirements

**Status:** Draft
**Component name:** TabbedPanel
**Folder:** `./components/tabbedpanel/`
**Spec author:** Agent
**Date:** 2026-02-15

---

## 1. Overview

### 1.1 What Is It

A dockable, floatable, collapsible, resizable tabbed panel component that manages dynamic tab content areas. The TabbedPanel docks to the top or bottom viewport edge, floats anywhere with drag-based positioning, collapses to a 32px horizontal strip with one click, resizes via pointer-capture drag handles, and supports runtime tab addition and removal. The tab bar position is configurable to any edge of the panel (top, left, bottom, right), and tab titles can display icons, text, or both.

The TabbedPanel is the horizontal complement to the Sidebar component. Where Sidebar docks to left and right viewport edges, TabbedPanel docks to top and bottom edges. Together they form a complete four-edge panel system inspired by VS Code's layout model.

### 1.2 Why Build It

Enterprise SaaS applications frequently need persistent bottom or top panels for:

- Terminal and console output (like VS Code's integrated terminal)
- Debug consoles and log viewers (like browser DevTools)
- Build output and task runners (like VS Code's Problems/Output/Terminal tabs)
- Search results and find-in-files (like VS Code's Search panel)
- Property inspectors and data previews (like Figma's bottom panel)
- Test runners and coverage viewers (like JetBrains' Run/Debug panels)

Without a dedicated component, developers build bespoke bottom panels with inconsistent docking, resizing, tab management, z-index, and accessibility behaviour. A reusable, programmable tabbed panel solves all these problems.

### 1.3 Design Inspiration

| Source | Key Pattern Adopted |
|--------|---------------------|
| VS Code Bottom Panel | Docked bottom panel with tabs (Terminal, Problems, Output, Debug Console), collapse to strip, resize handle |
| Browser DevTools | Dockable top/bottom/floating panel with dynamic tabs, resizable, collapsible |
| JetBrains IDE Tool Windows | Bottom-docked panels with tab bar, auto-hide, content switching |
| Figma Bottom Panel | Property inspector panel docked to bottom, resizable, tab-based |
| Visual Studio Output Window | Bottom panel with output channel tabs, collapse, dock/float toggle |

### 1.4 Relationship to Sidebar

| Concern | Sidebar | TabbedPanel |
|---------|---------|-------------|
| Dock edges | Left, Right | Top, Bottom |
| Collapse direction | Horizontal (to 40px vertical strip) | Vertical (to 32px horizontal strip) |
| Tab management | External (via SidebarManager grouping) | Internal (built-in tab bar) |
| CSS custom properties | `--sidebar-left-width`, `--sidebar-right-width` | `--tabbedpanel-top-height`, `--tabbedpanel-bottom-height` |
| Content model | Single content area per sidebar | Multiple tab panels, one active at a time |
| Manager | SidebarManager (tab grouping, dock zones) | TabbedPanelManager (CSS properties, dock zones, stacking) |

### 1.5 Open Source Evaluation

| Library | Verdict | Reason |
|---------|---------|--------|
| jsPanel4 | Useful reference | MIT, vanilla JS, panel floating/docking; no built-in tab bar or collapse strip |
| Golden Layout | Not recommended | 200KB+, complex configuration, jQuery dependency in older versions |
| Allotment (React) | Not recommended | React-only, no vanilla JS API, no tab management |
| Bootstrap 5 Nav Tabs | Foundation | Native tab styling; no docking, resizing, collapsing, or dynamic management |

**Decision:** Build custom. Use Bootstrap 5 tab styling patterns as a visual foundation. Reuse pointer-capture drag and resize patterns from the Sidebar component. Implement tab management natively with WAI-ARIA tabpanel pattern.

---

## 2. Use Cases

| Use Case | Dock Position | Tab Bar Position | Example |
|----------|---------------|------------------|---------|
| Integrated terminal | Bottom | Top | Terminal, Problems, Output, Debug Console tabs |
| Browser DevTools | Bottom | Top | Elements, Console, Network, Sources tabs |
| Inspector panel | Top | Bottom | Properties, Styles, Layout tabs |
| Floating log viewer | Floating | Top | Application logs with filter tabs |
| Build output | Bottom | Top | Build, Test, Lint output channels |
| Data preview | Bottom | Left | Table, JSON, Chart preview tabs |

---

## 3. Anatomy

### 3.1 Docked Bottom — Tab Bar Top (Default)

```
┌──────────────────────────────────────────────────────┐
│ ═══ resize handle ═══                                │  ← 4px drag strip
├──────────────────────────────────────────────────────┤
│ [Tab A] [Tab B] [Tab C] [+]            [-][↗][×]   │  ← Tab bar + actions
├──────────────────────────────────────────────────────┤
│                                                      │
│   Tab content area                                   │  ← Active panel
│   (vertical scroll auto)                             │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### 3.2 Docked Top — Tab Bar Bottom

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│   Tab content area                                   │  ← Active panel
│   (vertical scroll auto)                             │
│                                                      │
├──────────────────────────────────────────────────────┤
│ [Tab A] [Tab B] [Tab C] [+]            [-][↗][×]   │  ← Tab bar + actions
├──────────────────────────────────────────────────────┤
│ ═══ resize handle ═══                                │  ← 4px drag strip
└──────────────────────────────────────────────────────┘
```

### 3.3 Floating

```
┌──────────────────────────────────────────────────────┐
│ [icon] Title                           [-][⬓][×]   │  ← Title bar (drag handle)
├──────────────────────────────────────────────────────┤
│ [Tab A] [Tab B] [Tab C] [+]                         │  ← Tab bar
├──────────────────────────────────────────────────────┤
│                                                      │
│   Tab content area                                   │  ← Active panel
│   (vertical scroll auto)                             │
│                                                      │
├──────────────────────────────────────────────────────┤
│ Resize handles on all edges and corners              │
└──────────────────────────────────────────────────────┘
```

### 3.4 Collapsed Strip

```
┌──────────────────────────────────────────────────────┐
│ [▲] Terminal  |  Tab A  Tab B  Tab C                 │  ← 32px collapsed strip
└──────────────────────────────────────────────────────┘
```

### 3.5 Tab Bar Left

```
┌────┬─────────────────────────────────────────────────┐
│    │ ═══ resize handle ═══                           │
│Tab ├─────────────────────────────────────────────────┤
│ A  │                                                 │
│    │   Tab content area                              │
│Tab │   (vertical scroll auto)                        │
│ B  │                                                 │
│    │                                                 │
│Tab │                                                 │
│ C  │                                                 │
└────┴─────────────────────────────────────────────────┘
```

### 3.6 Tab Bar Right

```
┌─────────────────────────────────────────────────┬────┐
│ ═══ resize handle ═══                           │    │
├─────────────────────────────────────────────────┤Tab │
│                                                 │ A  │
│   Tab content area                              │    │
│   (vertical scroll auto)                        │Tab │
│                                                 │ B  │
│                                                 │    │
│                                                 │Tab │
│                                                 │ C  │
└─────────────────────────────────────────────────┴────┘
```

### 3.7 Element Breakdown

| Element | Required | Description |
|---------|----------|-------------|
| Root container | Yes | `role="complementary"` with `aria-label` |
| Resize handle | Configurable | 4px drag strip for resizing |
| Title bar | Configurable | Drag handle in floating mode; optional in docked mode |
| Tab bar | Yes | `role="tablist"` containing tab buttons |
| Tab button | Yes (1+) | `role="tab"` with icon, label, and optional close button |
| Tab close button | Optional per tab | Small X button on closable tabs |
| Tab content area | Yes | Container for active tab panel |
| Tab panel | Yes (1+) | `role="tabpanel"` with `aria-labelledby`; only active panel visible |
| Collapsed strip | Auto | 32px horizontal strip when collapsed |
| Action buttons | Yes | Collapse, float/dock toggle, close buttons |

---

## 4. API

### 4.1 Types

```typescript
/** Panel positioning mode. */
export type TabbedPanelMode = "docked" | "floating";

/** Docking edge (horizontal edges only — vertical edges are Sidebar territory). */
export type TabbedPanelDockPosition = "top" | "bottom";

/** Position of the tab bar relative to the panel content area. */
export type TabBarPosition = "top" | "left" | "bottom" | "right";

/** How tab titles are rendered. */
export type TabTitleMode = "icon" | "text" | "icon-text";
```

### 4.2 Interfaces

```typescript
/** Definition of a single tab within the panel. */
interface TabDefinition
{
    /** Unique identifier for this tab. */
    id: string;

    /** Tab title text displayed in the tab bar. */
    title: string;

    /** Optional Bootstrap Icons class for the tab icon. */
    icon?: string;

    /** Whether the tab shows a close (X) button. Default: true. */
    closable?: boolean;

    /** Initial content — an HTMLElement to append, or an HTML string (sanitised). */
    content?: HTMLElement | string;

    /** Additional CSS class(es) applied to the tab panel element. */
    cssClass?: string;

    /** Arbitrary data attached to this tab for consumer use. */
    data?: Record<string, unknown>;

    /** Whether the tab is disabled (visible but not selectable). Default: false. */
    disabled?: boolean;
}

/** Configuration options for the TabbedPanel component. */
interface TabbedPanelOptions
{
    /** Unique identifier. Auto-generated if omitted. */
    id?: string;

    /** Initial tabs. Default: empty array (no tabs). */
    tabs?: TabDefinition[];

    /** Position of the tab bar relative to the content area. Default: "top". */
    tabBarPosition?: TabBarPosition;

    /** How tab titles are rendered. Default: "icon-text". */
    tabTitleMode?: TabTitleMode;

    /** Positioning mode. Default: "docked". */
    mode?: TabbedPanelMode;

    /** Dock edge when mode is "docked". Default: "bottom". */
    dockPosition?: TabbedPanelDockPosition;

    /** Enable collapse functionality. Default: true. */
    collapsible?: boolean;

    /** Enable resize handle. Default: true. */
    resizable?: boolean;

    /** Enable floating drag via title bar. Default: true. */
    draggable?: boolean;

    /** Panel height in pixels (docked mode). Default: 250. */
    height?: number;

    /** Minimum resize height in pixels. Default: 100. */
    minHeight?: number;

    /** Maximum resize height in pixels. Default: 600. */
    maxHeight?: number;

    /** Panel width in pixels (floating mode). Default: 500. */
    width?: number;

    /** Minimum floating width in pixels. Default: 300. */
    minWidth?: number;

    /** Maximum floating width in pixels. Default: 1200. */
    maxWidth?: number;

    /** Height when collapsed in pixels. Default: 32. */
    collapsedHeight?: number;

    /** Title text displayed in the title bar (floating mode) and collapsed strip. */
    title?: string;

    /** Show the title bar. Default: true when floating, false when docked. */
    showTitleBar?: boolean;

    /** Start collapsed. Default: false. */
    collapsed?: boolean;

    /** Initial floating X position in pixels. */
    floatX?: number;

    /** Initial floating Y position in pixels. */
    floatY?: number;

    /** Background colour (CSS value). */
    background?: string;

    /** Foreground / text colour (CSS value). */
    foreground?: string;

    /** Font family (CSS value). */
    fontFamily?: string;

    /** Font size (CSS value). */
    fontSize?: string;

    /** Additional CSS class(es) for the root element. */
    cssClass?: string;

    /** CSS z-index override. */
    zIndex?: number;

    /** Called when a tab is selected. */
    onTabSelect?: (tabId: string, panel: TabbedPanel) => void;

    /** Called when a tab is deselected (before the new tab activates). */
    onTabDeselect?: (tabId: string, panel: TabbedPanel) => void;

    /** Called when a tab close button is clicked. Return false to prevent closing. */
    onTabClose?: (tabId: string, panel: TabbedPanel) => boolean | void;

    /** Called when collapse state changes. */
    onCollapse?: (collapsed: boolean, panel: TabbedPanel) => void;

    /** Called after resize completes. */
    onResize?: (width: number, height: number, panel: TabbedPanel) => void;

    /** Called when mode changes (docked/floating). */
    onModeChange?: (mode: TabbedPanelMode, panel: TabbedPanel) => void;

    /** Called before the panel is closed/destroyed. Return false to cancel. */
    onBeforeClose?: (panel: TabbedPanel) => boolean;

    /** Called after the panel is closed/destroyed. */
    onClose?: (panel: TabbedPanel) => void;
}
```

### 4.3 Class: TabbedPanel

| Method | Description |
|--------|-------------|
| `constructor(options)` | Creates the panel DOM tree but does not attach to the page. |
| `show()` | Appends to `document.body`, registers with `TabbedPanelManager`, updates CSS custom properties. |
| `hide()` | Removes from DOM without destroying state. Updates CSS custom properties. |
| `destroy()` | Hides, unregisters from `TabbedPanelManager`, fires `onClose`, nulls all references. |
| `addTab(tab, index?)` | Adds a tab at the specified position (default: end). Selects it if it is the only tab. |
| `removeTab(tabId)` | Removes a tab by ID. If the removed tab was active, selects the nearest sibling. |
| `selectTab(tabId)` | Activates a tab by ID. Fires `onTabDeselect` then `onTabSelect`. |
| `getActiveTabId()` | Returns the ID of the currently active tab, or `null` if no tabs exist. |
| `getTabCount()` | Returns the total number of tabs. |
| `getTabDefinition(tabId)` | Returns a copy of the `TabDefinition` for the given tab ID, or `null`. |
| `getTabContentElement(tabId)` | Returns the content `<div>` (`role="tabpanel"`) for the given tab, for appending children. |
| `setTabTitle(tabId, title)` | Updates the title text of an existing tab. |
| `setTabIcon(tabId, iconClass)` | Updates the icon of an existing tab. |
| `setTabDisabled(tabId, disabled)` | Enables or disables a tab. A disabled active tab is deselected and the nearest enabled sibling is selected. |
| `dock(position)` | Switches to docked mode at the given edge ("top" or "bottom"). |
| `float(x?, y?)` | Switches to floating mode at optional coordinates. |
| `collapse()` | Collapses to the 32px horizontal strip. |
| `expand()` | Expands from collapsed state. |
| `toggleCollapse()` | Toggles between collapsed and expanded. |
| `setTitle(title)` | Updates the title bar and collapsed strip text. |
| `setHeight(h)` | Programmatic height change (clamped to min/max). |
| `setWidth(w)` | Programmatic width change (clamped to min/max, floating mode only). |
| `getId()` | Returns the panel's unique identifier. |
| `getMode()` | Returns current mode ("docked" or "floating"). |
| `getDockPosition()` | Returns current dock position ("top" or "bottom"). |
| `isVisible()` | Returns whether the panel is currently in the DOM. |
| `isCollapsed()` | Returns whether the panel is collapsed. |
| `getRootElement()` | Returns the root DOM element. |
| `getTitle()` | Returns the current title text. |
| `getWidth()` | Returns current width in pixels. |
| `getHeight()` | Returns current height in pixels. |

### 4.4 Class: TabbedPanelManager

| Method | Description |
|--------|-------------|
| `getInstance()` | Singleton accessor (lazy creation). |
| `register(panel)` | Registers a panel for dock management and CSS custom property coordination. |
| `unregister(panel)` | Removes a panel from management. |
| `getPanels(position?)` | Returns all registered panels, optionally filtered by dock position. |
| `getActivePanel(position)` | Returns the frontmost panel at a dock position. |
| `updateCustomProperties()` | Recalculates and sets `--tabbedpanel-top-height` and `--tabbedpanel-bottom-height` on `<html>`. |
| `showDockZones()` | Creates and shows dock zone indicators during floating drag. |
| `hideDockZones()` | Removes dock zone indicators. |

### 4.5 Convenience Functions

| Function | Description |
|----------|-------------|
| `createTabbedPanel(options)` | Creates, shows, and returns a TabbedPanel instance. |
| `createDockedTabbedPanel(options)` | Shorthand — defaults mode to "docked". |
| `createFloatingTabbedPanel(options)` | Shorthand — defaults mode to "floating". |

### 4.6 Global Exports

```typescript
window.TabbedPanel = TabbedPanel;
window.TabbedPanelManager = TabbedPanelManager;
window.createTabbedPanel = createTabbedPanel;
window.createDockedTabbedPanel = createDockedTabbedPanel;
window.createFloatingTabbedPanel = createFloatingTabbedPanel;
```

---

## 5. Behaviour

### 5.1 Lifecycle

1. **Construction** — Builds the DOM tree from `options.tabs` but does not attach to the page. If `options.tabs` is provided and non-empty, the first enabled tab is selected.
2. **show()** — Appends to `<body>`, registers with `TabbedPanelManager`, updates CSS custom properties.
3. **hide()** — Removes from DOM, updates CSS custom properties. State is preserved.
4. **destroy()** — Calls `hide()`, fires `onBeforeClose` (if it returns `false`, aborts), unregisters from `TabbedPanelManager`, fires `onClose`, nulls all references and event listeners.

### 5.2 Docked Mode

| Dock Position | CSS Positioning |
|--------------|-----------------|
| bottom | `position: fixed; bottom: var(--statusbar-height, 0px); left: var(--sidebar-left-width, 0px); right: var(--sidebar-right-width, 0px);` |
| top | `position: fixed; top: calc(var(--bannerbar-height, 0px) + var(--toolbar-top-size, 0px)); left: var(--sidebar-left-width, 0px); right: var(--sidebar-right-width, 0px);` |

- Full width between the left and right sidebars.
- Resize handle on the inner edge only (top edge for bottom-docked, bottom edge for top-docked).
- Sets CSS custom properties on `<html>`: `--tabbedpanel-top-height` or `--tabbedpanel-bottom-height`.

### 5.3 Floating Mode

- `position: fixed` with explicit `top`/`left` coordinates.
- Draggable via title bar using pointer events.
- Resize handles on all four edges and four corners.
- Does not set panel height CSS custom properties.
- Constrained to viewport bounds during drag.

### 5.4 Collapse

- CSS `transition: height 300ms ease`.
- Collapses to `collapsedHeight` (default 32px).
- Shows a horizontal strip with an expand chevron icon, the panel title, and a summary of tab titles.
- Clicking the collapsed strip expands the panel.
- Retains dock position and active tab for re-expansion.
- Updates CSS custom properties to reflect collapsed height.
- The collapsed strip displays the active tab title or, if a title is set, the panel title.

### 5.5 Tab Management

#### 5.5.1 Adding Tabs

`addTab(tab, index?)`:

1. Validates the `tab.id` is unique. If duplicate, logs a warning and returns without adding.
2. Creates a tab button element in the tab bar at the specified position (default: end).
3. Creates a tab panel element in the content area.
4. If `tab.content` is an `HTMLElement`, appends it to the panel. If it is a string, sets it as `textContent` (not `innerHTML`, for security).
5. If this is the only tab, selects it automatically.
6. Updates ARIA attributes (`aria-controls`, `aria-labelledby`).

#### 5.5.2 Removing Tabs

`removeTab(tabId)`:

1. Fires `onTabClose` callback. If it returns `false`, aborts removal.
2. If the removed tab is currently active, selects the nearest enabled sibling (prefer the tab to the right, then left).
3. Removes the tab button and tab panel elements from the DOM.
4. If no tabs remain, the content area shows an empty state.

#### 5.5.3 Selecting Tabs

`selectTab(tabId)`:

1. If the tab is disabled, logs a warning and returns without selecting.
2. Fires `onTabDeselect` for the currently active tab (if any).
3. Removes `.tabbedpanel-tab-active` from the previous tab button. Sets `aria-selected="false"`.
4. Hides the previous tab panel (`display: none`).
5. Adds `.tabbedpanel-tab-active` to the new tab button. Sets `aria-selected="true"`.
6. Shows the new tab panel (`display: block`).
7. Fires `onTabSelect` for the newly selected tab.

#### 5.5.4 Disabling Tabs

`setTabDisabled(tabId, disabled)`:

1. Adds or removes `.tabbedpanel-tab-disabled` and sets `aria-disabled`.
2. If the disabled tab is currently active, selects the nearest enabled sibling.
3. If no enabled tabs remain, no tab is active and the content area shows an empty state.

### 5.6 Tab Bar Position

The `tabBarPosition` option controls where the tab bar renders relative to the content area:

| Position | Layout | Tab Text Direction |
|----------|--------|--------------------|
| top | Tab bar above content (default) | Horizontal, left-to-right |
| bottom | Tab bar below content | Horizontal, left-to-right |
| left | Tab bar to the left of content | Vertical, `writing-mode: vertical-lr` |
| right | Tab bar to the right of content | Vertical, `writing-mode: vertical-lr` |

When the tab bar is positioned left or right, the panel uses a horizontal flex layout (tab bar and content side by side). When positioned top or bottom, the panel uses a vertical flex layout.

### 5.7 Tab Title Mode

The `tabTitleMode` option controls what is shown in each tab button:

| Mode | Rendering |
|------|-----------|
| `icon` | Icon only. `aria-label` set to the tab title for accessibility. |
| `text` | Text only. No icon element rendered. |
| `icon-text` | Icon followed by text label (default). |

If a tab has no `icon` set and the mode is `icon` or `icon-text`, only the text is shown for that tab regardless of the mode setting.

### 5.8 Drag-to-Dock

During floating drag (when `draggable` is enabled):

1. If the pointer enters within 40px of the top or bottom viewport edge, a translucent drop-zone indicator appears.
2. Releasing within the zone triggers `dock()` at that edge.
3. Moving the pointer away from the edge hides the dock zone indicator.
4. Drop zone indicators are managed by `TabbedPanelManager`.
5. Only top and bottom edges trigger dock zones (left and right edges are Sidebar territory).

### 5.9 Resize

- Custom 4px drag strip element (not CSS `resize` property).
- Uses `setPointerCapture` for reliable cross-element tracking.
- Docked mode: vertical-only resize. Bottom-docked: drag handle on top edge (drag up to grow, down to shrink). Top-docked: drag handle on bottom edge (drag down to grow, up to shrink).
- Floating mode: resize handles on all four edges and four corners. Vertical handles adjust height. Horizontal handles adjust width. Corner handles adjust both.
- Arrow keys adjust by 10px for keyboard accessibility.
- Clamped to `minHeight`/`maxHeight` and `minWidth`/`maxWidth`.
- Updates CSS custom properties after resize.
- Fires `onResize` callback after resize completes.

### 5.10 Multiple Panels at Same Edge

When multiple TabbedPanels dock to the same edge:

1. `TabbedPanelManager` stacks them vertically at that edge.
2. The most recently docked panel is positioned innermost (closer to the main content).
3. Each panel's height contributes to the total CSS custom property value.
4. The total `--tabbedpanel-bottom-height` (or `--tabbedpanel-top-height`) is the sum of all panels docked to that edge.

---

## 6. DOM Structure

### 6.1 Docked Bottom — Tab Bar Top (Default)

```html
<div class="tabbedpanel tabbedpanel-docked tabbedpanel-bottom tabbedpanel-tabbar-top"
     role="complementary" aria-label="Bottom panel">

    <!-- Resize handle (top edge for bottom-docked) -->
    <div class="tabbedpanel-resize-handle-v"
         role="separator" aria-orientation="horizontal"
         aria-valuenow="250" aria-valuemin="100" aria-valuemax="600"
         tabindex="0">
    </div>

    <!-- Tab bar -->
    <div class="tabbedpanel-tabbar" role="tablist" aria-label="Panel tabs">
        <button class="tabbedpanel-tab tabbedpanel-tab-active"
                role="tab" id="tab-terminal" tabindex="0"
                aria-selected="true" aria-controls="panel-terminal">
            <i class="bi bi-terminal tabbedpanel-tab-icon"></i>
            <span class="tabbedpanel-tab-label">Terminal</span>
            <button class="tabbedpanel-tab-close" aria-label="Close Terminal tab"
                    tabindex="-1">
                <i class="bi bi-x"></i>
            </button>
        </button>
        <button class="tabbedpanel-tab"
                role="tab" id="tab-problems" tabindex="-1"
                aria-selected="false" aria-controls="panel-problems">
            <i class="bi bi-exclamation-triangle tabbedpanel-tab-icon"></i>
            <span class="tabbedpanel-tab-label">Problems</span>
            <button class="tabbedpanel-tab-close" aria-label="Close Problems tab"
                    tabindex="-1">
                <i class="bi bi-x"></i>
            </button>
        </button>
        <div class="tabbedpanel-titlebar-actions">
            <button class="tabbedpanel-collapse-btn"
                    aria-expanded="true" aria-label="Collapse panel">
                <i class="bi bi-chevron-bar-down"></i>
            </button>
            <button class="tabbedpanel-float-btn" aria-label="Float panel">
                <i class="bi bi-box-arrow-up-right"></i>
            </button>
            <button class="tabbedpanel-close-btn" aria-label="Close panel">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>
    </div>

    <!-- Content area -->
    <div class="tabbedpanel-content">
        <div class="tabbedpanel-panel tabbedpanel-panel-active"
             role="tabpanel" id="panel-terminal"
             aria-labelledby="tab-terminal" tabindex="0">
            <!-- Consumer content for Terminal tab -->
        </div>
        <div class="tabbedpanel-panel"
             role="tabpanel" id="panel-problems"
             aria-labelledby="tab-problems" tabindex="0"
             hidden>
            <!-- Consumer content for Problems tab -->
        </div>
    </div>
</div>
```

### 6.2 Docked Top — Tab Bar Bottom

```html
<div class="tabbedpanel tabbedpanel-docked tabbedpanel-top tabbedpanel-tabbar-bottom"
     role="complementary" aria-label="Top panel">

    <!-- Content area -->
    <div class="tabbedpanel-content">
        <div class="tabbedpanel-panel tabbedpanel-panel-active"
             role="tabpanel" id="panel-inspector"
             aria-labelledby="tab-inspector" tabindex="0">
            <!-- Consumer content -->
        </div>
    </div>

    <!-- Tab bar -->
    <div class="tabbedpanel-tabbar" role="tablist" aria-label="Panel tabs">
        <button class="tabbedpanel-tab tabbedpanel-tab-active"
                role="tab" id="tab-inspector" tabindex="0"
                aria-selected="true" aria-controls="panel-inspector">
            <i class="bi bi-search tabbedpanel-tab-icon"></i>
            <span class="tabbedpanel-tab-label">Inspector</span>
        </button>
        <div class="tabbedpanel-titlebar-actions">
            <button class="tabbedpanel-collapse-btn"
                    aria-expanded="true" aria-label="Collapse panel">
                <i class="bi bi-chevron-bar-up"></i>
            </button>
            <button class="tabbedpanel-float-btn" aria-label="Float panel">
                <i class="bi bi-box-arrow-up-right"></i>
            </button>
            <button class="tabbedpanel-close-btn" aria-label="Close panel">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>
    </div>

    <!-- Resize handle (bottom edge for top-docked) -->
    <div class="tabbedpanel-resize-handle-v"
         role="separator" aria-orientation="horizontal"
         aria-valuenow="250" aria-valuemin="100" aria-valuemax="600"
         tabindex="0">
    </div>
</div>
```

### 6.3 Floating

```html
<div class="tabbedpanel tabbedpanel-floating"
     role="complementary" aria-label="Properties panel"
     style="top: 100px; left: 200px; width: 500px; height: 250px;">

    <!-- Title bar (drag handle) -->
    <div class="tabbedpanel-titlebar" role="heading" aria-level="2">
        <i class="bi bi-gear tabbedpanel-titlebar-icon"></i>
        <span class="tabbedpanel-titlebar-text">Properties</span>
        <div class="tabbedpanel-titlebar-actions">
            <button class="tabbedpanel-collapse-btn"
                    aria-expanded="true" aria-label="Collapse panel">
                <i class="bi bi-dash"></i>
            </button>
            <button class="tabbedpanel-dock-btn" aria-label="Dock panel">
                <i class="bi bi-pip"></i>
            </button>
            <button class="tabbedpanel-close-btn" aria-label="Close panel">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>
    </div>

    <!-- Tab bar -->
    <div class="tabbedpanel-tabbar" role="tablist" aria-label="Panel tabs">
        <button class="tabbedpanel-tab tabbedpanel-tab-active"
                role="tab" id="tab-props" tabindex="0"
                aria-selected="true" aria-controls="panel-props">
            <span class="tabbedpanel-tab-label">Properties</span>
        </button>
        <button class="tabbedpanel-tab"
                role="tab" id="tab-styles" tabindex="-1"
                aria-selected="false" aria-controls="panel-styles">
            <span class="tabbedpanel-tab-label">Styles</span>
        </button>
    </div>

    <!-- Content area -->
    <div class="tabbedpanel-content">
        <div class="tabbedpanel-panel tabbedpanel-panel-active"
             role="tabpanel" id="panel-props"
             aria-labelledby="tab-props" tabindex="0">
            <!-- Consumer content -->
        </div>
        <div class="tabbedpanel-panel"
             role="tabpanel" id="panel-styles"
             aria-labelledby="tab-styles" tabindex="0"
             hidden>
            <!-- Consumer content -->
        </div>
    </div>

    <!-- Resize handles (all edges and corners for floating) -->
    <div class="tabbedpanel-resize-handle-v tabbedpanel-resize-top" role="separator"
         aria-orientation="horizontal" tabindex="0"></div>
    <div class="tabbedpanel-resize-handle-v tabbedpanel-resize-bottom" role="separator"
         aria-orientation="horizontal" tabindex="0"></div>
    <div class="tabbedpanel-resize-handle-h tabbedpanel-resize-left" role="separator"
         aria-orientation="vertical" tabindex="0"></div>
    <div class="tabbedpanel-resize-handle-h tabbedpanel-resize-right" role="separator"
         aria-orientation="vertical" tabindex="0"></div>
    <div class="tabbedpanel-resize-handle-corner tabbedpanel-resize-nw"></div>
    <div class="tabbedpanel-resize-handle-corner tabbedpanel-resize-ne"></div>
    <div class="tabbedpanel-resize-handle-corner tabbedpanel-resize-sw"></div>
    <div class="tabbedpanel-resize-handle-corner tabbedpanel-resize-se"></div>
</div>
```

### 6.4 Collapsed Strip

```html
<div class="tabbedpanel tabbedpanel-docked tabbedpanel-bottom tabbedpanel-collapsed"
     role="complementary" aria-label="Bottom panel (collapsed)">
    <div class="tabbedpanel-collapsed-strip">
        <button class="tabbedpanel-collapsed-expand" aria-expanded="false"
                aria-label="Expand panel">
            <i class="bi bi-chevron-up tabbedpanel-collapsed-icon"></i>
        </button>
        <span class="tabbedpanel-collapsed-title">Terminal</span>
        <span class="tabbedpanel-collapsed-tabs">
            <span class="tabbedpanel-collapsed-tab-name">Terminal</span>
            <span class="tabbedpanel-collapsed-tab-name">Problems</span>
            <span class="tabbedpanel-collapsed-tab-name">Output</span>
        </span>
    </div>
</div>
```

### 6.5 Dock Zone Indicators (Drag-to-Dock)

```html
<!-- Appended to <body> during floating drag when near top/bottom edge -->
<div class="tabbedpanel-dock-zone tabbedpanel-dock-zone-bottom"
     aria-hidden="true"></div>
```

---

## 7. CSS Classes

| Class | Description |
|-------|-------------|
| `.tabbedpanel` | Root element — `position: fixed` |
| `.tabbedpanel-docked` | Mode modifier — docked to viewport edge |
| `.tabbedpanel-floating` | Mode modifier — free-positioned |
| `.tabbedpanel-collapsed` | State modifier — collapsed to 32px strip |
| `.tabbedpanel-top` | Dock position — docked to top edge |
| `.tabbedpanel-bottom` | Dock position — docked to bottom edge |
| `.tabbedpanel-tabbar` | Tab bar container |
| `.tabbedpanel-tabbar-top` | Tab bar positioned above content |
| `.tabbedpanel-tabbar-bottom` | Tab bar positioned below content |
| `.tabbedpanel-tabbar-left` | Tab bar positioned to the left of content |
| `.tabbedpanel-tabbar-right` | Tab bar positioned to the right of content |
| `.tabbedpanel-tab` | Individual tab button |
| `.tabbedpanel-tab-active` | Active (selected) tab state |
| `.tabbedpanel-tab-disabled` | Disabled tab state |
| `.tabbedpanel-tab-icon` | Icon element within a tab button |
| `.tabbedpanel-tab-label` | Text label element within a tab button |
| `.tabbedpanel-tab-close` | Close (X) button within a closable tab |
| `.tabbedpanel-mode-icon` | Tab title mode modifier — icon only |
| `.tabbedpanel-mode-text` | Tab title mode modifier — text only |
| `.tabbedpanel-mode-icon-text` | Tab title mode modifier — icon and text |
| `.tabbedpanel-content` | Container wrapping all tab panels |
| `.tabbedpanel-panel` | Individual tab panel (content pane) |
| `.tabbedpanel-panel-active` | Currently visible tab panel |
| `.tabbedpanel-titlebar` | Title bar — drag handle in floating mode |
| `.tabbedpanel-titlebar-icon` | Icon element in title bar |
| `.tabbedpanel-titlebar-text` | Text element in title bar |
| `.tabbedpanel-titlebar-actions` | Button container (collapse/float-dock/close) |
| `.tabbedpanel-collapse-btn` | Collapse button in title bar or tab bar |
| `.tabbedpanel-float-btn` | Float toggle button (docked mode) |
| `.tabbedpanel-dock-btn` | Dock toggle button (floating mode) |
| `.tabbedpanel-close-btn` | Close button |
| `.tabbedpanel-resize-handle-v` | Vertical resize handle (adjusts height) |
| `.tabbedpanel-resize-handle-h` | Horizontal resize handle (adjusts width, floating only) |
| `.tabbedpanel-resize-handle-corner` | Corner resize handle (adjusts both, floating only) |
| `.tabbedpanel-resize-top` | Resize handle on top edge |
| `.tabbedpanel-resize-bottom` | Resize handle on bottom edge |
| `.tabbedpanel-resize-left` | Resize handle on left edge |
| `.tabbedpanel-resize-right` | Resize handle on right edge |
| `.tabbedpanel-resize-nw` | Northwest corner resize handle |
| `.tabbedpanel-resize-ne` | Northeast corner resize handle |
| `.tabbedpanel-resize-sw` | Southwest corner resize handle |
| `.tabbedpanel-resize-se` | Southeast corner resize handle |
| `.tabbedpanel-collapsed-strip` | 32px horizontal strip when collapsed |
| `.tabbedpanel-collapsed-expand` | Expand button in collapsed strip |
| `.tabbedpanel-collapsed-icon` | Chevron icon in collapsed strip |
| `.tabbedpanel-collapsed-title` | Title text in collapsed strip |
| `.tabbedpanel-collapsed-tabs` | Tab name summary in collapsed strip |
| `.tabbedpanel-collapsed-tab-name` | Individual tab name in collapsed strip |
| `.tabbedpanel-dock-zone` | Drop zone indicator base class (drag-to-dock) |
| `.tabbedpanel-dock-zone-top` | Top edge drop zone |
| `.tabbedpanel-dock-zone-bottom` | Bottom edge drop zone |
| `.tabbedpanel-dock-zone-active` | Drop zone when pointer is within range |

---

## 8. Styling

### 8.1 Theme Integration

| Property | Value | Source |
|----------|-------|--------|
| Background | `$gray-100` | Light, non-distracting panel background |
| Border | `1px solid $gray-300` | Consistent with cards, sidebars, and toolbars |
| Tab bar background | `$gray-200` | Subtle differentiation from content area |
| Tab button default | `transparent` background | Clean, uncluttered |
| Tab button hover | `$gray-300` background | Subtle highlight |
| Tab button active | `$white` background, `1px solid $gray-300` bottom border removed | Connected-to-content effect |
| Tab button disabled | `$gray-400` text colour, 0.5 opacity | Standard disabled pattern |
| Tab close button | `$gray-500` colour, `$gray-300` hover background | Subdued until interacted with |
| Tab icon | `$gray-600` default, `$gray-800` when active | Muted default, prominent when selected |
| Title bar background | `$gray-800` | Dark header (matches Sidebar) |
| Title bar text | `$gray-100` | Light on dark header |
| Content area background | `$white` | Clean content background |
| Resize handle | `$gray-300` background, `$gray-400` on hover | Subtle drag affordance |
| Collapsed strip background | `$gray-200` | Matches tab bar |
| Collapsed strip text | `$gray-700` | Readable on light strip |
| Dock zone indicator | `rgba($blue-600, 0.15)` background, `2px dashed $blue-400` border | Translucent drop target |

### 8.2 Dimensions

| Element | Size | Notes |
|---------|------|-------|
| Tab bar height (horizontal) | 36px | Includes padding and tab height |
| Tab button padding | 8px 12px | Comfortable click target |
| Tab icon size | 16px | Matches Bootstrap Icons standard |
| Tab close button | 16px x 16px | Compact, within tab button |
| Title bar height | 32px | Floating mode only (default) |
| Resize handle thickness | 4px | Visible drag strip |
| Collapsed strip height | 32px | Minimal but readable |
| Minimum content area | 64px | Ensures usable content space below tab bar |

### 8.3 Z-Index

| Element | Z-Index | Rationale |
|---------|---------|-----------|
| Docked TabbedPanel | 1035 | Same level as docked Sidebar — they dock to different edges |
| Floating TabbedPanel | 1036 | Above docked panels |
| Dock zone indicators | 1037 | Above floating panels during drag |
| StatusBar | 1040 | Always on top of panels |
| BannerBar | 1045 | Above status bar |
| Bootstrap modals | 1050+ | Above everything |

---

## 9. CSS Custom Properties

### 9.1 Properties Set by TabbedPanel

On `show()`, `dock()`, `collapse()`, `expand()`, `setHeight()`, and `destroy()`, the component updates CSS custom properties on `<html>`:

| Property | Set When | Example Value |
|----------|----------|---------------|
| `--tabbedpanel-top-height` | Docked top (expanded or collapsed) | `250px` or `32px` |
| `--tabbedpanel-bottom-height` | Docked bottom (expanded or collapsed) | `250px` or `32px` |

Properties are cleared when the panel is hidden, destroyed, or switched to floating mode.

When multiple panels dock to the same edge, the property value is the sum of all panel heights at that edge.

### 9.2 Properties Respected by TabbedPanel

| Property | Effect |
|----------|--------|
| `--bannerbar-height` | Top-docked panel offsets below the banner bar |
| `--statusbar-height` | Bottom-docked panel offsets above the status bar |
| `--sidebar-left-width` | Panel left edge aligns to sidebar right edge |
| `--sidebar-right-width` | Panel right edge aligns to sidebar left edge |
| `--toolbar-top-size` | Top-docked panel offsets below the top toolbar |

---

## 10. Layout Integration

### 10.1 Bottom-Docked Panel

```
┌─────────────────────────────────────────────────────────────────────┐
│ BannerBar (--bannerbar-height)                                      │
├──────┬──────────────────────────────────────────────────────┬───────┤
│      │ Toolbar (--toolbar-top-size)                        │       │
│ Side │                                                     │ Side  │
│ bar  │                                                     │ bar   │
│ Left │              Main Content                           │ Right │
│      │                                                     │       │
│      ├──────────────────────────────────────────────────────┤       │
│      │ TabbedPanel Bottom (--tabbedpanel-bottom-height)    │       │
├──────┴──────────────────────────────────────────────────────┴───────┤
│ StatusBar (--statusbar-height)                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 10.2 Top-Docked Panel

```
┌─────────────────────────────────────────────────────────────────────┐
│ BannerBar (--bannerbar-height)                                      │
├──────┬──────────────────────────────────────────────────────┬───────┤
│      │ Toolbar (--toolbar-top-size)                        │       │
│ Side ├──────────────────────────────────────────────────────┤ Side  │
│ bar  │ TabbedPanel Top (--tabbedpanel-top-height)          │ bar   │
│ Left ├──────────────────────────────────────────────────────┤ Right │
│      │                                                     │       │
│      │              Main Content                           │       │
│      │                                                     │       │
├──────┴──────────────────────────────────────────────────────┴───────┤
│ StatusBar (--statusbar-height)                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 10.3 Consumers

Consumers can use these properties for main content layout:

```css
.main-content {
    margin-top: calc(
        var(--bannerbar-height, 0px)
        + var(--toolbar-top-size, 0px)
        + var(--tabbedpanel-top-height, 0px)
    );
    margin-bottom: calc(
        var(--statusbar-height, 0px)
        + var(--tabbedpanel-bottom-height, 0px)
    );
    margin-left: var(--sidebar-left-width, 0px);
    margin-right: var(--sidebar-right-width, 0px);
}
```

---

## 11. Accessibility

### 11.1 ARIA Roles and Attributes

Follows the [WAI-ARIA Tabs Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/).

| Element | Attribute | Value |
|---------|-----------|-------|
| Root | `role="complementary"` | Landmark region |
| Root | `aria-label` | Descriptive label (e.g., "Bottom panel") |
| Tab bar | `role="tablist"` | Tab container |
| Tab bar | `aria-label` | "Panel tabs" |
| Tab button | `role="tab"` | Tab control |
| Tab button (active) | `aria-selected="true"` | Selected state |
| Tab button (inactive) | `aria-selected="false"` | Deselected state |
| Tab button | `aria-controls` | ID of the associated tab panel |
| Tab button (disabled) | `aria-disabled="true"` | Disabled state |
| Tab panel | `role="tabpanel"` | Tab content area |
| Tab panel | `aria-labelledby` | ID of the associated tab button |
| Tab panel | `tabindex="0"` | Focusable content area |
| Collapse button | `aria-expanded="true\|false"` | Collapse state |
| Collapse button | `aria-label` | "Collapse panel" or "Expand panel" |
| Resize handle | `role="separator"` | Resize affordance |
| Resize handle | `aria-orientation` | `"horizontal"` (adjusts height) or `"vertical"` (adjusts width) |
| Resize handle | `aria-valuenow` / `aria-valuemin` / `aria-valuemax` | Current and limit sizes |
| Title bar | `role="heading"` | Heading for floating panel |
| Title bar | `aria-level="2"` | Heading level |
| Dock zone | `aria-hidden="true"` | Visual indicator only |
| Tab close button | `aria-label` | "Close [tab title] tab" |

### 11.2 Keyboard Navigation

#### Tab Bar Navigation (Roving Tabindex)

| Key | Action |
|-----|--------|
| **Tab** | Moves focus into the tab bar (to the active tab) |
| **Shift+Tab** | Moves focus out of the tab bar |
| **Right Arrow** | Next tab (horizontal tab bar) |
| **Left Arrow** | Previous tab (horizontal tab bar) |
| **Down Arrow** | Next tab (vertical tab bar, left/right positioned) |
| **Up Arrow** | Previous tab (vertical tab bar, left/right positioned) |
| **Home** | First tab |
| **End** | Last tab |
| **Enter / Space** | Activate focused tab |
| **Delete** | Close focused tab (if closable) |

Only one tab in the tab bar has `tabindex="0"` at a time (the currently active tab). All others have `tabindex="-1"`. Arrow keys move focus and update tabindex values. Disabled tabs are skipped during arrow key navigation.

#### Tab Panel Focus

| Key | Action |
|-----|--------|
| **Tab** (from tab bar) | Moves focus into the active tab panel content |
| **Ctrl+Shift+Tab** (from panel content) | Returns focus to the tab bar |

#### Resize Handle Keyboard

| Key | Action |
|-----|--------|
| **Up Arrow** | Grow panel height by 10px (bottom-docked) or shrink (top-docked) |
| **Down Arrow** | Shrink panel height by 10px (bottom-docked) or grow (top-docked) |
| **Left Arrow** | Shrink panel width by 10px (floating, horizontal handles) |
| **Right Arrow** | Grow panel width by 10px (floating, horizontal handles) |

#### Collapse Keyboard

| Key | Action |
|-----|--------|
| **Enter / Space** on collapse button | Toggle collapse |
| **Enter / Space** on collapsed strip | Expand panel |

### 11.3 Focus Management

- No focus trapping (persistent panel, not modal).
- `touch-action: none` on drag surfaces and resize handles to prevent scroll interference.
- All action buttons are keyboard-accessible (Tab/Enter/Space).
- `focus-visible` outlines on all interactive elements.
- Sufficient colour contrast meets WCAG AA.

---

## 12. Edge Cases

| # | Scenario | Behaviour |
|---|----------|-----------|
| 1 | Zero tabs on construction | Panel renders with an empty content area. Tab bar is visible but contains no tabs. |
| 2 | All tabs closed at runtime | Content area shows an empty state. No tab is active. Tab bar remains visible. |
| 3 | Close the active tab | Nearest enabled sibling is selected (prefer right, then left). If none remain, empty state. |
| 4 | Disable the active tab | Nearest enabled sibling is selected. If no enabled tabs remain, no tab is active. |
| 5 | Select a disabled tab programmatically | Warning logged. No tab change occurs. |
| 6 | Add tab with duplicate ID | Warning logged. Tab is not added. |
| 7 | Remove a non-existent tab | Warning logged. No action taken. |
| 8 | Content overflow in tab panel | `overflow-y: auto` provides vertical scrollbar. `overflow-x: hidden` by default. |
| 9 | Rapid tab switching | Each `selectTab` call is synchronous. Intermediate tab panel shows are not visible. No animation jank. |
| 10 | Tab close prevented by callback | `onTabClose` returns `false` — tab remains open and active. |
| 11 | Tab content is a string | Set as `textContent`, not `innerHTML`, to prevent XSS. |
| 12 | Tab content is an HTMLElement | Appended directly. Consumer retains ownership of the element. |
| 13 | Resize below minHeight | Clamped to `minHeight`. Visual feedback (handle cursor) stops moving. |
| 14 | Resize above maxHeight | Clamped to `maxHeight`. Visual feedback stops. |
| 15 | Simultaneous resize and collapse | Collapse takes priority. Resize operation is cancelled. |
| 16 | Collapse while floating | Panel collapses to `collapsedHeight` in place. Width unchanged. |
| 17 | Float while collapsed | Panel switches to floating mode and remains collapsed. |
| 18 | Dock while floating and collapsed | Panel docks and remains collapsed. |
| 19 | Floating panel dragged outside viewport | Constrained to viewport bounds. At least 32px of the title bar remains visible on all edges. |
| 20 | Window resize makes docked panel taller than viewport | Panel height clamped to available viewport space minus status bar and banner bar. |
| 21 | Multiple panels docked to same edge | Stacked vertically. Total height reported via CSS custom property. |
| 22 | Destroy during resize drag | Resize is cancelled (`releasePointerCapture`), panel is destroyed cleanly. |
| 23 | Destroy during floating drag | Drag is cancelled, panel is destroyed cleanly. |
| 24 | Show called twice | Second call is a no-op if already in the DOM. Warning logged. |
| 25 | Hide called when not visible | No-op. No error. |
| 26 | Tab icon missing in icon mode | Falls back to text-only rendering for that tab. |
| 27 | Tab bar overflows with many tabs | Horizontal scroll with overflow indicators (chevrons) on the tab bar. Tabs do not wrap. |
| 28 | setHeight called on floating panel | Height is updated. Width is unchanged. |
| 29 | setWidth called on docked panel | Warning logged. Width is determined by dock position (full width between sidebars). |
| 30 | onBeforeClose returns false | Destroy is aborted. Panel remains visible. |

---

## 13. Demo Requirements

Six demonstrations in the demo site:

### 13.1 Demo: Docked Bottom Terminal

A bottom-docked panel with four tabs: Terminal, Problems, Output, Debug Console. Tab bar at top. Demonstrates tab switching, tab close buttons, and dynamic terminal content.

### 13.2 Demo: Docked Top Inspector

A top-docked panel with three tabs: Properties, Styles, Layout. Tab bar at bottom. Demonstrates alternative tab bar positioning and docked top layout.

### 13.3 Demo: Floating Properties Panel

A floating panel positioned at (100, 100) with two tabs: Properties, Events. Demonstrates floating mode, title bar drag, and resize handles on all edges.

### 13.4 Demo: Collapse and Expand

A bottom-docked panel that demonstrates collapse to 32px strip and expand. Includes controls to programmatically toggle collapse state. Shows the collapsed strip with tab name summary.

### 13.5 Demo: Dynamic Tab Management

Interactive controls to add tabs, remove tabs, rename tabs, enable/disable tabs, and change tab icons at runtime. Includes a counter display showing current tab count.

### 13.6 Demo: Drag-to-Dock

A floating panel that can be dragged to the top or bottom viewport edge to dock. Demonstrates dock zone indicators, mode change callbacks, and the round-trip from floating to docked and back.

---

## 14. Dependencies

- **Bootstrap 5 CSS** — for `$gray-*` variables in SCSS.
- **Bootstrap Icons** — for tab icons, title bar action icons, and collapse/expand icons.
- No JavaScript framework dependencies.

---

## 15. Files

| File | Purpose |
|------|---------|
| `specs/tabbedpanel.prd.md` | This specification |
| `components/tabbedpanel/tabbedpanel.ts` | TypeScript source |
| `components/tabbedpanel/tabbedpanel.scss` | Styles |
| `components/tabbedpanel/README.md` | Documentation |

---

## 16. Implementation Notes

### 16.1 Tab Bar Overflow (Horizontal Scrolling)

When the number of tabs exceeds the available tab bar width:

1. The tab bar container has `overflow-x: auto` with `scrollbar-width: none` (hide scrollbar).
2. Chevron buttons (`.tabbedpanel-tabbar-scroll-left`, `.tabbedpanel-tabbar-scroll-right`) appear at the edges to indicate scroll direction.
3. Clicking a chevron scrolls the tab bar by one tab width.
4. Selecting a tab that is partially or fully off-screen auto-scrolls it into view.
5. The chevrons hide when the tab bar is fully scrolled to that edge.

### 16.2 Content Security

- Tab content provided as a string is set via `textContent`, never `innerHTML`.
- Tab content provided as an `HTMLElement` is appended directly. The consumer is responsible for sanitising any user-generated HTML within that element.
- No `eval()`, `Function()`, or inline event handlers.

### 16.3 Pointer Capture for Drag and Resize

Reuse the same `setPointerCapture` / `releasePointerCapture` pattern established in the Sidebar component for reliable cross-element tracking during floating drag and resize operations.

### 16.4 Performance

- Use `requestAnimationFrame` for drag and resize visual updates to avoid layout thrashing.
- Cache tab element references in a `Map<string, HTMLElement>` for O(1) lookup.
- Tab panel content is not destroyed when switching tabs — panels use `display: none` / `display: block` toggling to preserve consumer state.
- Debounce window resize handler (150ms) when recalculating docked panel dimensions.

### 16.5 Logging

All log statements use the `LOG_PREFIX = "[TabbedPanel]"` pattern:

```typescript
const LOG_PREFIX = "[TabbedPanel]";

console.log(LOG_PREFIX, "Panel shown:", this.id);
console.warn(LOG_PREFIX, "Duplicate tab ID:", tabId);
console.error(LOG_PREFIX, "Tab not found:", tabId);
```

### 16.6 Tab Panel Visibility

Tab panels use `display: none` to hide inactive panels rather than `visibility: hidden`. This ensures:

- Inactive panels do not participate in layout calculations.
- Screen readers do not announce hidden panel content.
- The `hidden` HTML attribute is set on inactive panels for semantic correctness.

### 16.7 CSS Transitions

| Transition | Property | Duration | Easing |
|-----------|----------|----------|--------|
| Collapse / expand | `height` | 300ms | `ease` |
| Tab bar active indicator | `background-color`, `border-color` | 150ms | `ease` |
| Tab close button opacity | `opacity` | 150ms | `ease` |
| Dock zone indicator | `opacity` | 200ms | `ease` |

No transitions on resize drag — immediate feedback during pointer tracking.

---

## 17. Future Considerations (Out of Scope for v1)

These features are explicitly deferred:

- **Tab reordering via drag-and-drop** — dragging tabs to reorder within the tab bar.
- **Tab pinning** — pinning tabs to the left side of the tab bar (icon-only, not closable).
- **Tab overflow menu** — collapsing excess tabs into a dropdown (v1 uses horizontal scroll).
- **Tab detach** — dragging a tab out of the panel to create a new floating panel.
- **Split view** — splitting the content area to show two tab panels side by side.
- **Session persistence** — saving and restoring tab state across page reloads via `localStorage`.
- **Tab context menu** — right-click menu on tabs (Close, Close Others, Close All, Pin).

---

## 18. Open Questions

None at this time.
