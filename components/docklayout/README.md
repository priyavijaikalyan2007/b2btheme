<!-- AGENT: Documentation for the DockLayout component — CSS Grid layout coordinator for enterprise application shells. -->

# DockLayout

A CSS Grid-based layout coordinator that arranges Toolbar, Sidebar, TabbedPanel, StatusBar, and content into a 5-zone application shell. Inspired by Java Swing's `BorderLayout` — child components are automatically positioned and resized without manual pixel-positioning.

## Assets

| Asset | Path |
|-------|------|
| CSS | `components/docklayout/docklayout.css` |
| JS | `components/docklayout/docklayout.js` |
| Types | `components/docklayout/docklayout.d.ts` |

## Requirements

- **Bootstrap CSS** — for SCSS variables (`$gray-*`, `$font-size-*`, etc.)
- Component CSS/JS for each slot component used (Toolbar, Sidebar, TabbedPanel, StatusBar)
- Does **not** require Bootstrap JS.

## Quick Start

```html
<link rel="stylesheet" href="components/docklayout/docklayout.css">
<link rel="stylesheet" href="components/toolbar/toolbar.css">
<link rel="stylesheet" href="components/sidebar/sidebar.css">
<link rel="stylesheet" href="components/statusbar/statusbar.css">

<script src="components/toolbar/toolbar.js"></script>
<script src="components/sidebar/sidebar.js"></script>
<script src="components/statusbar/statusbar.js"></script>
<script src="components/docklayout/docklayout.js"></script>

<div id="my-content">
    <h1>Hello World</h1>
</div>

<script>
    var toolbar = new Toolbar({
        label: "My App",
        mode: "docked",
        dockPosition: "top",
        regions: [{ id: "main", tools: [{ id: "save", label: "Save", icon: "bi-floppy" }] }]
    });

    var sidebar = new Sidebar({
        title: "Explorer",
        dockPosition: "left",
        width: 260
    });

    var statusBar = new StatusBar({
        size: "sm",
        regions: [{ id: "status", label: "Ready" }]
    });

    var layout = createDockLayout({
        toolbar: toolbar,
        leftSidebar: sidebar,
        statusBar: statusBar,
        content: document.getElementById("my-content")
    });
</script>
```

## How It Works

DockLayout creates a CSS Grid with 6 named areas:

```
┌─────────────────────────────────────┐
│              toolbar                │  auto height
├──────┬──────────────────┬───────────┤
│      │                  │           │
│ left │     center       │   right   │  1fr (fills remaining)
│      │                  │           │
├──────┴──────────────────┴───────────┤
│              bottom                 │  auto height
├─────────────────────────────────────┤
│              status                 │  auto height
└─────────────────────────────────────┘
```

When a component is passed to DockLayout, it automatically:
1. Calls `component.setContained(true)` — switches from `position: fixed` to `position: relative`
2. Calls `component.show(gridCell)` — mounts inside the grid cell
3. Hooks resize/collapse listeners — updates grid template dynamically
4. Observes toolbar cell via `ResizeObserver` — recalculates grid when toolbar height changes (e.g., Ribbon collapse/expand)

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | `string` | auto | Custom element ID |
| `container` | `HTMLElement \| string` | `document.body` | Mount target |
| `toolbar` | `Toolbar` | — | Top row, spans full width |
| `leftSidebar` | `Sidebar` | — | Left column |
| `rightSidebar` | `Sidebar` | — | Right column |
| `bottomPanel` | `TabbedPanel` | — | Bottom row, above status bar |
| `statusBar` | `StatusBar` | — | Bottom-most row |
| `content` | `HTMLElement \| string` | — | Center cell element or CSS selector |
| `cssClass` | `string` | — | Additional CSS classes on root |
| `height` | `string` | `"100vh"` | Height CSS value |
| `width` | `string` | `"100vw"` | Width CSS value |
| `onLayoutChange` | `(layout: LayoutState) => void` | — | Fired on any resize/collapse/slot change |

## Public API

| Method | Returns | Description |
|--------|---------|-------------|
| `show()` | `void` | Append to container, display layout |
| `hide()` | `void` | Remove from DOM (preserves state) |
| `destroy()` | `void` | Full cleanup, destroy all child components |
| `setToolbar(toolbar)` | `void` | Set or remove (`null`) the toolbar |
| `setLeftSidebar(sidebar)` | `void` | Set or remove the left sidebar |
| `setRightSidebar(sidebar)` | `void` | Set or remove the right sidebar |
| `setBottomPanel(panel)` | `void` | Set or remove the bottom panel |
| `setStatusBar(statusBar)` | `void` | Set or remove the status bar |
| `setContent(element)` | `void` | Set or replace center content |
| `getLayoutState()` | `LayoutState` | Current dimensions of all slots |
| `getContentElement()` | `HTMLElement` | The center grid cell element |
| `getRootElement()` | `HTMLElement` | The root grid container |
| `isVisible()` | `boolean` | Whether the layout is displayed |

## LayoutState

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

## Contained Mode

DockLayout automatically sets `contained: true` on child components. This switches them from viewport-fixed positioning to parent-relative positioning. All existing component features (resize, collapse, callbacks) continue to work.

Components that support contained mode:
- **Sidebar** — width controlled by resize handle, fills parent height
- **Toolbar** — auto height, fills parent width
- **StatusBar** — fixed height based on size, fills parent width
- **TabbedPanel** — height controlled by resize handle, fills parent width
- **BannerBar** — fixed to top of container instead of viewport

## Dynamic Slot Management

```js
// Add a bottom panel later
var chatPanel = new TabbedPanel({
    dockPosition: "bottom",
    height: 250,
    tabs: [{ id: "chat", title: "Chat", icon: "bi-chat" }]
});
layout.setBottomPanel(chatPanel);

// Remove it later
layout.setBottomPanel(null);
```

## Integration with Content Components

Content placed in the center cell automatically fills it via CSS:

```css
.dock-layout-center > * {
    width: 100%;
    height: 100%;
}
```

Components like TreeGrid, TreeView, Conversation, and Timeline work naturally in the center cell. For MarkdownEditor, pass `contained: true` to use `height: "100%"` instead of the default `"70vh"`.

## Global Exports

When loaded via `<script>` tag:

- `window.DockLayout` — DockLayout class
- `window.createDockLayout` — Factory function (creates and shows)

## CSS Classes

| Class | Element | Description |
|-------|---------|-------------|
| `.dock-layout` | Root | CSS Grid container |
| `.dock-layout-toolbar` | Cell | Toolbar slot |
| `.dock-layout-left` | Cell | Left sidebar slot |
| `.dock-layout-center` | Cell | Center content area |
| `.dock-layout-right` | Cell | Right sidebar slot |
| `.dock-layout-bottom` | Cell | Bottom panel slot |
| `.dock-layout-status` | Cell | Status bar slot |
