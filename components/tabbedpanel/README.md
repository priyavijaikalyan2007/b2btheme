<!-- AGENT: Documentation for the TabbedPanel component — dockable, collapsible tabbed panel with configurable tab bar position. -->

# TabbedPanel

A dockable, collapsible, resizable tabbed panel component for grouping related content into tabs. Supports docking to top/bottom viewport edges, free-positioned floating with drag-based positioning, collapsing to a 32px strip, resizing via drag handles, configurable tab bar position (top/left/bottom/right), and drag-to-dock with visual drop zones.

## Assets

| Asset | Path |
|-------|------|
| CSS | `components/tabbedpanel/tabbedpanel.css` |
| JS | `components/tabbedpanel/tabbedpanel.js` |
| Types | `components/tabbedpanel/tabbedpanel.d.ts` |

## Requirements

- **Bootstrap CSS** — for SCSS variables (`$gray-*`, `$font-size-*`, etc.)
- **Bootstrap Icons CSS** — for tab icons and action buttons
- Does **not** require Bootstrap JS.

## Quick Start

```html
<link rel="stylesheet" href="components/tabbedpanel/tabbedpanel.css">
<script src="components/tabbedpanel/tabbedpanel.js"></script>
<script>
    var panel = createTabbedPanel({
        tabs: [
            { id: "terminal", title: "Terminal", icon: "bi-terminal" },
            { id: "output", title: "Output", icon: "bi-journal-text" },
            { id: "problems", title: "Problems", icon: "bi-exclamation-triangle" }
        ],
        dockPosition: "bottom",
        height: 250,
        onTabSelect: function(tabId) { console.log("Selected:", tabId); }
    });
</script>
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | `string` | auto | Unique identifier |
| `tabs` | `TabDefinition[]` | `[]` | Initial tab definitions |
| `tabBarPosition` | `"top" \| "left" \| "bottom" \| "right"` | `"top"` | Tab bar position within the panel |
| `tabTitleMode` | `"icon" \| "text" \| "icon-text"` | `"icon-text"` | Tab display style |
| `mode` | `"docked" \| "floating"` | `"docked"` | Positioning mode |
| `dockPosition` | `"top" \| "bottom"` | `"bottom"` | Dock edge |
| `collapsible` | `boolean` | `true` | Enable collapse to strip |
| `resizable` | `boolean` | `true` | Enable resize handles |
| `draggable` | `boolean` | `true` | Enable floating drag |
| `height` | `number` | `250` | Panel height (docked/floating) |
| `minHeight` | `number` | `100` | Minimum resize height |
| `maxHeight` | `number` | `600` | Maximum resize height |
| `width` | `number` | `500` | Floating width |
| `minWidth` | `number` | `300` | Minimum floating width |
| `maxWidth` | `number` | `1200` | Maximum floating width |
| `collapsedHeight` | `number` | `32` | Height when collapsed |
| `title` | `string` | — | Panel title (shown in title bar and collapsed strip). When omitted, the active tab's title is used as fallback. |
| `showTitleBar` | `boolean` | auto | Show title bar (defaults to true for floating, false for docked) |
| `collapsed` | `boolean` | `false` | Start collapsed |
| `floatX` | `number` | `100` | Initial floating X position |
| `floatY` | `number` | `100` | Initial floating Y position |
| `background` | `string` | — | CSS background colour override |
| `foreground` | `string` | — | CSS text colour override |
| `fontFamily` | `string` | — | CSS font family override |
| `fontSize` | `string` | — | CSS font size override |
| `cssClass` | `string` | — | Additional CSS classes |
| `zIndex` | `number` | — | CSS z-index override |
| `onTabSelect` | `function` | — | Tab selection callback |
| `onTabDeselect` | `function` | — | Tab deselection callback |
| `onTabClose` | `function` | — | Tab close callback (return false to cancel) |
| `onCollapse` | `function` | — | Collapse/expand callback |
| `onResize` | `function` | — | Resize complete callback |
| `onModeChange` | `function` | — | Mode change callback |
| `onBeforeClose` | `function` | — | Before close callback (return false to cancel) |
| `onClose` | `function` | — | After close callback |

## TabDefinition

```typescript
interface TabDefinition {
    id: string;          // Unique tab identifier
    title: string;       // Display title
    icon?: string;       // Bootstrap Icons class (e.g., "bi-terminal")
    closable?: boolean;  // Show close button (default: false)
    content?: HTMLElement | string;  // Initial tab content
    cssClass?: string;   // Additional CSS class for the tab panel
    data?: Record<string, unknown>;  // User data passed to callbacks
    disabled?: boolean;  // Disabled state (default: false)
}
```

## API

### Tab Management

| Method | Returns | Description |
|--------|---------|-------------|
| `addTab(tab)` | `void` | Add a tab dynamically |
| `removeTab(tabId)` | `void` | Remove a tab (fires onTabClose) |
| `selectTab(tabId)` | `void` | Activate a tab |
| `getActiveTabId()` | `string \| null` | Current active tab ID |
| `getTabCount()` | `number` | Number of tabs |
| `getTabDefinition(tabId)` | `TabDefinition \| undefined` | Get tab config |
| `getTabContentElement(tabId)` | `HTMLElement \| null` | Get tab panel DOM element |
| `setTabTitle(tabId, title)` | `void` | Update tab title text |
| `setTabIcon(tabId, icon)` | `void` | Update tab icon class |
| `setTabDisabled(tabId, disabled)` | `void` | Enable or disable a tab |

### Mode & Position

| Method | Returns | Description |
|--------|---------|-------------|
| `dock(position)` | `void` | Switch to docked mode at top or bottom |
| `float(x?, y?)` | `void` | Switch to floating mode |
| `getMode()` | `string` | Current mode |
| `getDockPosition()` | `string` | Current dock position |

### Collapse

| Method | Returns | Description |
|--------|---------|-------------|
| `collapse()` | `void` | Collapse to strip |
| `expand()` | `void` | Expand from strip |
| `toggleCollapse()` | `void` | Toggle collapse state |
| `isCollapsed()` | `boolean` | Whether collapsed |

### Size

| Method | Returns | Description |
|--------|---------|-------------|
| `setHeight(h)` | `void` | Set panel height |
| `setWidth(w)` | `void` | Set panel width (floating) |
| `getHeight()` | `number` | Current height |
| `getWidth()` | `number` | Current width |

### Lifecycle

| Method | Returns | Description |
|--------|---------|-------------|
| `show(container?)` | `void` | Mount and display |
| `hide()` | `void` | Remove from DOM, keep state |
| `destroy()` | `void` | Full cleanup |
| `isVisible()` | `boolean` | Whether visible |
| `getId()` | `string` | Panel identifier |
| `getRootElement()` | `HTMLElement` | Root DOM element |
| `setTitle(title)` | `void` | Update panel title |
| `getTitle()` | `string` | Resolved title (explicit title > active tab title > `"Panel"`) |

### Convenience Functions

```typescript
createTabbedPanel(options, container?)       // Create, show, and return
createDockedTabbedPanel(options, container?)  // Shorthand for docked mode
createFloatingTabbedPanel(options, container?) // Shorthand for floating mode
```

### Global Exports

```
window.TabbedPanel
window.TabbedPanelManager
window.createTabbedPanel
window.createDockedTabbedPanel
window.createFloatingTabbedPanel
```

## CSS Custom Properties

When docked, the panel sets a CSS custom property on `<html>`:

| Property | Set When |
|----------|----------|
| `--tabbedpanel-top-height` | Docked top |
| `--tabbedpanel-bottom-height` | Docked bottom |

Properties are cleared when the panel is hidden or undocked.

## Keyboard Accessibility

| Key | Action |
|-----|--------|
| Tab | Move focus into the tab bar |
| Arrow Left/Right | Navigate between tabs (horizontal bar) |
| Arrow Up/Down | Navigate between tabs (vertical bar) |
| Home / End | First / last tab |
| Enter / Space | Activate tab, expand collapsed strip |
| Escape | Collapse panel |
| Arrow keys on resize handle | Resize by 10px per press |

## Examples

### Docked bottom with icon-text tabs

```javascript
var panel = createTabbedPanel({
    tabs: [
        { id: "terminal", title: "Terminal", icon: "bi-terminal" },
        { id: "output", title: "Output", icon: "bi-journal-text" },
        { id: "problems", title: "Problems", icon: "bi-exclamation-triangle", closable: true }
    ],
    dockPosition: "bottom",
    height: 250,
    onTabSelect: function(tabId) { console.log("Selected:", tabId); }
});
// Add content to a tab
var termEl = panel.getTabContentElement("terminal");
termEl.style.padding = "0.5rem";
termEl.textContent = "$ npm run build";
```

### Floating panel with title bar

```javascript
var props = createFloatingTabbedPanel({
    title: "Properties",
    tabs: [
        { id: "props", title: "Properties", icon: "bi-sliders" },
        { id: "events", title: "Events", icon: "bi-lightning" },
        { id: "styles", title: "Styles", icon: "bi-palette" }
    ],
    floatX: 400,
    floatY: 120,
    width: 360,
    height: 300
});
```

### Dynamic tab management

```javascript
// Add a tab at runtime
panel.addTab({
    id: "debug-console",
    title: "Debug Console",
    icon: "bi-bug",
    closable: true
});

// Prevent tab close with confirmation
var panel = createTabbedPanel({
    tabs: [ /* ... */ ],
    onTabClose: function(tabId) {
        return confirm("Close " + tabId + "?");
    }
});

// Remove a tab
panel.removeTab("debug-console");
```

### Collapse and expand

```javascript
panel.collapse();   // Collapse to 32px strip
panel.expand();     // Restore full size
panel.toggleCollapse();

panel.onCollapse = function(collapsed) {
    console.log(collapsed ? "Panel collapsed" : "Panel expanded");
};
```

### Tab bar position variants

```javascript
// Tab bar on the left (vertical)
createTabbedPanel({
    tabBarPosition: "left",
    tabTitleMode: "icon",
    tabs: [ /* ... */ ]
});

// Tab bar on the bottom
createTabbedPanel({
    tabBarPosition: "bottom",
    tabs: [ /* ... */ ]
});
```

### Drag-to-dock

```javascript
// Start floating, drag to top/bottom edge to dock
var panel = createFloatingTabbedPanel({
    title: "Dockable Panel",
    tabs: [ /* ... */ ],
    onModeChange: function(mode) {
        console.log("Mode changed to:", mode);
    }
});
```

See `specs/tabbedpanel.prd.md` for the complete specification.
