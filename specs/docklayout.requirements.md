# DockLayout Component — Library Requirements

> **For:** Component library at theme.priyavijai-kalyan2007.workers.dev
> **Purpose:** A coding agent should be able to implement the DockLayout component and contained mode from these requirements alone.

**Goal:** Add a CSS Grid-based layout coordinator component (`DockLayout`) to the component library that arranges Toolbar, Sidebar, TabbedPanel, and StatusBar components into a 5-zone application shell. Requires adding a `contained` mode to existing components so they participate in parent layout flow instead of using `position: fixed`.

**Architecture:** DockLayout creates a CSS Grid with 5 named areas (toolbar, left sidebar, center content, right sidebar, bottom panel, status bar). Existing components gain a `contained: boolean` option that disables fixed positioning. When components are passed to DockLayout, it automatically sets `contained: true` and places them in the appropriate grid cells.

---

## Part 1: Contained Mode (changes to existing components)

### 1.1 Overview

Add a new constructor option to **Sidebar**, **Toolbar**, **StatusBar**, and **TabbedPanel**:

```typescript
contained?: boolean  // default: false
```

This is fully backwards compatible. Existing apps that don't use DockLayout are unaffected.

### 1.2 Behavior when `contained: false` (default — no change)

Current behavior is preserved exactly:
- `position: fixed` on viewport edges
- Manages own z-index
- Viewport-relative coordinates

### 1.3 Behavior when `contained: true`

All components:
- Use `position: relative` instead of `position: fixed`
- Set `width: 100%; height: 100%` to fill their parent container
- Do NOT snap to viewport edges
- Still publish CSS custom properties (unchanged)
- Still support resize, collapse, and all existing features
- `show(container)` appends to the provided container element

#### 1.3.1 Sidebar (contained)

- Fills its parent element's full height
- Width is controlled by the sidebar's `width` option and resize handle
- Resize handle works as before but is constrained to parent bounds
- Fires `onResize(width, height, sidebar)` when user drags resize handle
- On collapse: width becomes `collapsedWidth` (default 40px), fires `onCollapseToggle`
- Does NOT set `top`, `left`, `right`, `bottom` — parent controls position via grid

#### 1.3.2 Toolbar (contained)

- Renders horizontally in its parent element
- Height is intrinsic (auto-sized to content)
- Width fills parent (100%)
- Does NOT set `top`, `left`, `right` — parent controls position via grid

#### 1.3.3 StatusBar (contained)

- Renders in its parent element
- Height is intrinsic based on `size` option (sm: 24px, md: 28px, lg: 34px)
- Width fills parent (100%)
- Does NOT set `bottom`, `left`, `right` — parent controls position via grid

#### 1.3.4 TabbedPanel (contained)

- Renders in its parent element
- Height is controlled by the panel's `height` option and resize handle
- Resize handle adjusts height (drag up to grow, down to shrink)
- Fires `onResize(width, height, panel)` when user drags resize handle
- On collapse: height becomes `collapsedHeight` (default 32px), fires `onCollapse`
- Does NOT set `bottom`, `left`, `right` — parent controls position via grid

### 1.4 CSS Custom Properties (unchanged)

All components continue to publish their CSS variables regardless of `contained` mode:

| Component | Variable | Example |
|-----------|----------|---------|
| Toolbar | `--toolbar-top-size` | `42px` |
| Sidebar (left) | `--sidebar-left-width` | `260px` |
| Sidebar (right) | `--sidebar-right-width` | `320px` |
| TabbedPanel (bottom) | `--tabbedpanel-bottom-height` | `250px` |
| StatusBar | `--statusbar-height` | `24px` |

---

## Part 2: DockLayout Component

### 2.1 Files

```
components/docklayout/
├── docklayout.js      # Component source
├── docklayout.css     # Grid layout styles
└── docklayout.d.ts    # TypeScript declarations (optional)
```

CDN paths:
```
https://theme.priyavijai-kalyan2007.workers.dev/components/docklayout/docklayout.js
https://theme.priyavijai-kalyan2007.workers.dev/components/docklayout/docklayout.css
```

### 2.2 Factory Function

```typescript
createDockLayout(options: DockLayoutOptions): DockLayout
```

### 2.3 DockLayoutOptions

```typescript
interface DockLayoutOptions {
    // Identity
    id?: string;                          // Custom element ID (auto-generated if omitted)

    // Container
    container?: HTMLElement | string;      // Mount target (default: document.body)

    // Slots — all optional, empty slots collapse to 0 size
    toolbar?: Toolbar;                     // Top row — spans full width
    leftSidebar?: Sidebar;                // Left column — between toolbar and bottom panel
    rightSidebar?: Sidebar;               // Right column — between toolbar and bottom panel
    bottomPanel?: TabbedPanel;            // Bottom row — spans full width, above status bar
    statusBar?: StatusBar;                // Very bottom row — spans full width

    // Center content
    content?: HTMLElement | string;        // Center cell element or CSS selector

    // Styling
    cssClass?: string;                    // Additional CSS classes on root element

    // Callbacks
    onLayoutChange?: (layout: LayoutState) => void;  // Fired on any resize/collapse event
}
```

### 2.4 DockLayout Instance Methods

```typescript
interface DockLayout {
    // Lifecycle
    show(): void;                          // Append to container, display layout
    hide(): void;                          // Remove from DOM (preserves state)
    destroy(): void;                       // Full cleanup, destroy all child components

    // Slot management — allows changing components after creation
    setToolbar(toolbar: Toolbar | null): void;
    setLeftSidebar(sidebar: Sidebar | null): void;
    setRightSidebar(sidebar: Sidebar | null): void;
    setBottomPanel(panel: TabbedPanel | null): void;
    setStatusBar(statusBar: StatusBar | null): void;
    setContent(element: HTMLElement): void;

    // State
    getLayoutState(): LayoutState;         // Current dimensions of all slots
    getContentElement(): HTMLElement;       // Returns the center grid cell element
    getRootElement(): HTMLElement;          // Returns the root grid container
    isVisible(): boolean;
}
```

### 2.5 LayoutState

```typescript
interface LayoutState {
    toolbar: { height: number } | null;
    leftSidebar: { width: number; collapsed: boolean } | null;
    rightSidebar: { width: number; collapsed: boolean } | null;
    bottomPanel: { height: number; collapsed: boolean } | null;
    statusBar: { height: number } | null;
    content: { width: number; height: number };
}
```

### 2.6 CSS Grid Structure

```css
.dock-layout {
    display: grid;
    grid-template-areas:
        "toolbar  toolbar  toolbar"
        "left     center   right"
        "bottom   bottom   bottom"
        "status   status   status";
    grid-template-columns: auto 1fr auto;
    grid-template-rows: auto 1fr auto auto;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
}

/* Grid cell assignments */
.dock-layout-toolbar   { grid-area: toolbar; }
.dock-layout-left      { grid-area: left; }
.dock-layout-center    { grid-area: center; overflow: hidden; position: relative; }
.dock-layout-right     { grid-area: right; }
.dock-layout-bottom    { grid-area: bottom; }
.dock-layout-status    { grid-area: status; }
```

### 2.7 DOM Structure

DockLayout generates this HTML:

```html
<div class="dock-layout" id="{id}">
    <div class="dock-layout-toolbar">
        <!-- Toolbar component mounted here (or empty if no toolbar) -->
    </div>
    <div class="dock-layout-left">
        <!-- Left Sidebar component mounted here (or empty) -->
    </div>
    <div class="dock-layout-center">
        <!-- Content element moved here -->
    </div>
    <div class="dock-layout-right">
        <!-- Right Sidebar component mounted here (or empty) -->
    </div>
    <div class="dock-layout-bottom">
        <!-- TabbedPanel component mounted here (or empty) -->
    </div>
    <div class="dock-layout-status">
        <!-- StatusBar component mounted here (or empty) -->
    </div>
</div>
```

### 2.8 Behavioral Requirements

#### 2.8.1 Auto-contained mode

When a component is passed to DockLayout (via constructor or `set*()` methods), DockLayout **automatically sets `contained: true`** on the component before mounting it. Apps should not need to set `contained` manually.

#### 2.8.2 Empty slot collapse

If a slot has no component assigned:
- The grid cell's wrapper `<div>` is still present but has no content
- CSS ensures empty cells collapse to zero size:
  - Empty sidebar columns: `grid-template-columns` uses `0` instead of `auto`
  - Empty bottom/status rows: `grid-template-rows` uses `0` instead of `auto`

DockLayout dynamically updates `grid-template-columns` and `grid-template-rows` when slots are added/removed.

#### 2.8.3 Sidebar resize integration

DockLayout listens to each sidebar's `onResize` callback:
- When left sidebar is resized to `W` px → update `grid-template-columns` to `{W}px 1fr {rightWidth}px`
- When right sidebar is resized → same pattern
- Center content reflows naturally via `1fr`

#### 2.8.4 Sidebar collapse integration

DockLayout listens to each sidebar's `onCollapseToggle` callback:
- When sidebar collapses → column width becomes `collapsedWidth` (default 40px)
- When sidebar expands → column width restores to sidebar's current `width`

#### 2.8.5 Bottom panel resize integration

DockLayout listens to TabbedPanel's `onResize` callback:
- Update the third `grid-template-rows` value to `{panelHeight}px`

#### 2.8.6 Bottom panel collapse integration

DockLayout listens to TabbedPanel's `onCollapse` callback:
- When collapsed → third row becomes `collapsedHeight` (default 32px)
- When expanded → third row restores to panel's current `height`

#### 2.8.7 Center content

The center cell (`.dock-layout-center`) provides:
- `overflow: hidden` — clips content that exceeds bounds
- `position: relative` — allows absolutely-positioned children (canvas, diagram editor, etc.)

Apps can use `layout.getContentElement()` to get the center cell and append their canvas/content into it. Or pass a `content` element in the constructor, which DockLayout moves into the center cell.

#### 2.8.8 Layout change callback

The `onLayoutChange` callback fires whenever:
- A sidebar is resized or collapsed/expanded
- The bottom panel is resized or collapsed/expanded
- A slot is added or removed via `set*()` methods

It receives the full `LayoutState` object.

---

## Part 3: Testing Requirements

### 3.1 Contained mode tests (per component)

For each of Sidebar, Toolbar, StatusBar, TabbedPanel:
- Component renders with `contained: true` without errors
- Component does NOT use `position: fixed` when contained
- Component fills its parent element
- Resize still works in contained mode
- Collapse still works in contained mode
- CSS custom properties are still published
- `contained: false` (default) behavior is unchanged

### 3.2 DockLayout tests

- Creates grid layout with all 5 slots populated
- Creates grid layout with subset of slots (e.g., toolbar + center only)
- Empty slots collapse to zero size
- Sidebar resize updates grid columns
- Sidebar collapse updates grid columns
- Bottom panel resize updates grid rows
- Bottom panel collapse updates grid rows
- `getContentElement()` returns the center cell
- `getLayoutState()` returns correct dimensions
- `onLayoutChange` fires on resize/collapse events
- `set*()` methods add/remove components dynamically
- `destroy()` cleans up all components and DOM

---

## Part 4: Example Usage

### Minimal (toolbar + content only)

```javascript
const toolbar = createDockedToolbar({
    label: 'My App',
    regions: [/* ... */],
    onToolClick: handleClick,
});

const layout = createDockLayout({
    toolbar,
    content: document.getElementById('app-content'),
});

layout.show();
```

### Full (all slots)

```javascript
const toolbar = createDockedToolbar({ label: 'Diagrams', regions: [...] });
const leftSidebar = createDockedSidebar({ title: 'Diagrams', dockPosition: 'left', width: 260 });
const rightSidebar = createDockedSidebar({ title: 'Properties', dockPosition: 'right', width: 320 });
const bottomPanel = createDockedTabbedPanel('bottom', { height: 250, tabs: [...] });
const statusBar = createStatusBar({ size: 'sm', regions: [...] });

const layout = createDockLayout({
    toolbar,
    leftSidebar,
    rightSidebar,
    bottomPanel,
    statusBar,
    content: document.getElementById('diagram-canvas'),
    onLayoutChange: (state) => {
        console.log('Center size:', state.content.width, state.content.height);
    },
});

layout.show();
```

### Dynamic slot changes

```javascript
// Add a bottom panel later
const chatPanel = createDockedTabbedPanel('bottom', {
    tabs: [{ id: 'chat', title: 'Chat', icon: 'bi-chat' }],
});
layout.setBottomPanel(chatPanel);

// Remove it later
layout.setBottomPanel(null);
```
