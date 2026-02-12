<!-- AGENT: Documentation for the Sidebar component — dockable, floatable, resizable panel with tab grouping. -->

# Sidebar

A dockable, floatable, resizable sidebar panel component that acts as a container for other components. Supports docking to left/right viewport edges, free-positioned floating with drag-based positioning, collapsing to a 40px icon strip, resizing via drag handles, tab grouping when multiple sidebars share the same dock edge, and drag-to-dock with visual drop zones.

## Assets

| Asset | Path |
|-------|------|
| CSS | `dist/components/sidebar/sidebar.css` |
| JS | `dist/components/sidebar/sidebar.js` |
| Types | `dist/components/sidebar/sidebar.d.ts` |

## Requirements

- **Bootstrap CSS** — for SCSS variables (`$gray-*`, `$font-size-*`, etc.)
- **Bootstrap Icons CSS** — for title bar action icons and optional sidebar icon
- Does **not** require Bootstrap JS.

## Usage (Script Tag)

```html
<link rel="stylesheet" href="dist/components/sidebar/sidebar.css">
<script src="dist/components/sidebar/sidebar.js"></script>
<script>
    // Docked sidebar
    var explorer = createDockedSidebar({
        title: "Explorer",
        icon: "bi-folder",
        dockPosition: "left",
        width: 280
    });
    explorer.getContentElement().innerHTML = "<p style='padding:1rem'>Content here</p>";

    // Floating sidebar
    var tools = createFloatingSidebar({
        title: "Tools",
        icon: "bi-tools",
        floatX: 400,
        floatY: 100,
        width: 300,
        height: 400
    });
</script>
```

## Usage (ES Module)

```js
import { createSidebar, createDockedSidebar } from "./dist/components/sidebar/sidebar.js";

const sb = createDockedSidebar({
    title: "Explorer",
    icon: "bi-folder",
    dockPosition: "left",
    onModeChange: (mode, sidebar) => console.log("Mode:", mode),
    onResize: (w, h) => console.log("Resized:", w, h)
});
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | `string` | auto | Unique identifier |
| `title` | `string` | **required** | Title bar text |
| `icon` | `string` | — | Bootstrap Icons class (e.g., `"bi-folder"`) |
| `mode` | `"docked" \| "floating"` | `"docked"` | Initial mode |
| `dockPosition` | `"left" \| "right"` | `"left"` | Dock edge |
| `width` | `number` | `280` | Panel width in pixels |
| `minWidth` | `number` | `180` | Minimum resize width |
| `maxWidth` | `number` | `600` | Maximum resize width |
| `height` | `number` | `400` | Floating height in pixels |
| `minHeight` | `number` | `200` | Minimum floating height |
| `maxHeight` | `number` | `800` | Maximum floating height |
| `floatX` | `number` | `100` | Initial floating X position |
| `floatY` | `number` | `100` | Initial floating Y position |
| `collapsed` | `boolean` | `false` | Start collapsed |
| `collapsedWidth` | `number` | `40` | Width when collapsed |
| `backgroundColor` | `string` | — | CSS background colour override |
| `opacity` | `number` | — | Opacity (0-1) |
| `borderColor` | `string` | — | CSS border colour override |
| `borderWidth` | `string` | — | CSS border width override |
| `zIndex` | `number` | — | CSS z-index override |
| `cssClass` | `string` | — | Additional CSS classes |
| `resizable` | `boolean` | `true` | Enable resize handles |
| `draggable` | `boolean` | `true` | Enable floating drag |
| `collapsible` | `boolean` | `true` | Enable collapse |
| `showTitleBar` | `boolean` | `true` | Show title bar |
| `onModeChange` | `function` | — | Mode change callback |
| `onResize` | `function` | — | Resize complete callback |
| `onCollapseToggle` | `function` | — | Collapse toggle callback |
| `onBeforeClose` | `function` | — | Before close callback (return false to cancel) |
| `onClose` | `function` | — | After close callback |

## API

### Sidebar

| Method | Returns | Description |
|--------|---------|-------------|
| `show()` | `void` | Append to DOM and register |
| `hide()` | `void` | Remove from DOM (preserves state) |
| `destroy()` | `void` | Hide, unregister, and release references |
| `dock(position)` | `void` | Switch to docked mode |
| `float(x?, y?)` | `void` | Switch to floating mode |
| `collapse()` | `void` | Collapse to icon strip |
| `expand()` | `void` | Expand from collapsed |
| `toggleCollapse()` | `void` | Toggle collapse state |
| `setTitle(title)` | `void` | Update title text |
| `setIcon(iconClass)` | `void` | Update title icon |
| `setWidth(w)` | `void` | Set width (clamped) |
| `setHeight(h)` | `void` | Set height (clamped, floating only) |
| `getContentElement()` | `HTMLElement` | Content div for appending children |
| `getMode()` | `string` | Current mode |
| `getDockPosition()` | `string` | Current dock position |
| `getWidth()` | `number` | Current width |
| `getHeight()` | `number` | Current height |
| `isVisible()` | `boolean` | Whether sidebar is in the DOM |
| `isCollapsed()` | `boolean` | Whether sidebar is collapsed |

### SidebarManager

| Method | Returns | Description |
|--------|---------|-------------|
| `getInstance()` | `SidebarManager` | Singleton accessor |
| `register(sidebar)` | `void` | Register for tab grouping |
| `unregister(sidebar)` | `void` | Remove from management |
| `getSidebars(position?)` | `Sidebar[]` | Query registered sidebars |
| `getActiveTab(position)` | `Sidebar` | Active sidebar at a dock position |
| `setActiveTab(sidebar)` | `void` | Activate a specific tab |

### Convenience Functions

| Function | Description |
|----------|-------------|
| `createSidebar(options)` | Create and show a sidebar |
| `createDockedSidebar(options)` | Create a docked sidebar (mode defaults to "docked") |
| `createFloatingSidebar(options)` | Create a floating sidebar (mode defaults to "floating") |

## CSS Custom Properties

The component sets these properties on `<html>` for layout integration:

| Property | Description |
|----------|-------------|
| `--sidebar-left-width` | Total width of docked left sidebar(s) |
| `--sidebar-right-width` | Total width of docked right sidebar(s) |

Consumers can offset main content with:

```css
.main-content {
    margin-left: var(--sidebar-left-width, 0px);
    margin-right: var(--sidebar-right-width, 0px);
}
```

## Tab Grouping

When multiple sidebars dock to the same edge, they automatically form a tab group. Only one sidebar is visible at a time; the others are hidden. A tab bar appears at the top of the dock zone.

## Drag-to-Dock

In floating mode, dragging the sidebar near a viewport edge (within 40px) shows a translucent drop-zone indicator. Releasing within the zone docks the sidebar to that edge.

## Z-Index Layering

| Element | Z-Index |
|---------|---------|
| Docked sidebar | 1035 |
| Floating sidebar | 1036 |
| Drop zone overlays | 1037 |
| StatusBar | 1040 |
| Bootstrap modals | 1050+ |

## Accessibility

- Root: `role="complementary"` with descriptive `aria-label`
- Title bar: `role="heading"` with `aria-level="2"`
- Collapse button: `aria-expanded="true|false"`
- Tab bar: `role="tablist"`, tabs: `role="tab"` + `aria-selected`
- Resize handle: `role="separator"`, `aria-valuenow/min/max`, arrow keys (10px steps)
- Collapsed strip: keyboard-accessible (Enter/Space to expand)
- No focus trapping (persistent panel, not modal)
