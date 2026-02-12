<!-- AGENT: Documentation for the Toolbar component — dockable/floating action bar with regions, overflow, and orientation support. -->

# Toolbar

A programmable action bar component for grouping tools and actions into labelled regions. Inspired by the Microsoft Office Ribbon but adapted to the enterprise Bootstrap 5 aesthetic — single strip, no tabs.

## Features

- **Docked** or **floating** positioning with **drag-to-dock** snapping
- **Horizontal** or **vertical** orientation in either mode
- **Regions** — named groups of related tools separated by dividers
- **Tool types** — standard buttons, toggle buttons, split buttons, gallery controls
- **Overflow** — Priority+ algorithm collapses excess tools into a dropdown menu
- **KeyTips** — Office-style keyboard shortcut badges revealed on Alt press
- **Layout persistence** — save and restore toolbar position, orientation, and state
- **Resize** — drag handle along the orientation axis
- **Tooltips** — Bootstrap 5 native tooltips on every tool
- **Full keyboard accessibility** — WAI-ARIA toolbar pattern with roving tabindex

## Assets

| Asset | Path |
|-------|------|
| CSS | `dist/components/toolbar/toolbar.css` |
| JS | `dist/components/toolbar/toolbar.js` |
| Types | `dist/components/toolbar/toolbar.d.ts` |

**Requires:** Bootstrap CSS (for SCSS variables), Bootstrap Icons CSS, Bootstrap JS (optional, for tooltips). Does **not** require a JavaScript framework.

## Quick Start

```html
<link rel="stylesheet" href="dist/components/toolbar/toolbar.css">
<script src="dist/components/toolbar/toolbar.js"></script>
<script>
    var toolbar = createToolbar({
        label: "Document formatting",
        regions: [
            {
                id: "formatting",
                title: "Formatting",
                items: [
                    { id: "bold", icon: "bi-type-bold", tooltip: "Bold", toggle: true },
                    { id: "italic", icon: "bi-type-italic", tooltip: "Italic", toggle: true },
                    { type: "separator" },
                    { id: "align-left", icon: "bi-text-left", tooltip: "Align left" }
                ]
            }
        ]
    });
</script>
```

## API

### Constructor

```typescript
const toolbar = new Toolbar(options: ToolbarOptions);
```

Creates the toolbar DOM but does not attach to the page.

### ToolbarOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | `string` | auto | Unique identifier |
| `label` | `string` | required | ARIA label for accessibility |
| `regions` | `ToolbarRegion[]` | required | Regions containing tool items |
| `orientation` | `"horizontal" \| "vertical"` | `"horizontal"` | Toolbar orientation |
| `mode` | `"docked" \| "floating"` | `"docked"` | Positioning mode |
| `dockPosition` | `"top" \| "bottom" \| "left" \| "right"` | `"top"` | Dock edge |
| `style` | `"icon" \| "icon-label" \| "label"` | `"icon"` | Default tool display style |
| `toolSize` | `number` | `32` | Tool button size in pixels |
| `iconSize` | `number` | `16` | Icon size in pixels |
| `overflow` | `boolean` | `true` | Enable overflow menu |
| `resizable` | `boolean` | `true` | Enable resize handle |
| `minSize` | `number` | `120` | Minimum size in orientation axis (px) |
| `maxSize` | `number` | viewport | Maximum size in orientation axis (px) |
| `draggable` | `boolean` | `true` | Enable floating drag |
| `dragToDock` | `boolean` | `true` | Enable drag-to-dock snapping |
| `dragToDockThreshold` | `number` | `40` | Dock zone threshold in px |
| `keyTips` | `boolean` | `true` | Enable KeyTip badges on Alt press |
| `persistLayout` | `boolean` | `false` | Enable localStorage persistence |
| `persistKey` | `string` | `"toolbar-layout-"` | localStorage key prefix |
| `floatX` | `number` | `100` | Initial floating X position |
| `floatY` | `number` | `100` | Initial floating Y position |
| `onToolClick` | `function` | — | Global tool click handler |
| `onResize` | `function` | — | Called when toolbar is resized |
| `onModeChange` | `function` | — | Called when mode changes |
| `onOrientationChange` | `function` | — | Called when orientation changes |

### Methods

| Method | Description |
|--------|-------------|
| `show()` | Appends to `document.body`, sets CSS custom properties |
| `hide()` | Removes from DOM without destroying state |
| `destroy()` | Hides, releases all references and event listeners |
| `dock(position)` | Switches to docked mode at the given edge |
| `float(x?, y?)` | Switches to floating mode at optional coordinates |
| `setOrientation(o)` | Changes orientation (horizontal/vertical) |
| `addRegion(region, index?)` | Adds a region at optional position |
| `removeRegion(regionId)` | Removes a region by ID |
| `getRegion(regionId)` | Returns the region configuration |
| `addTool(regionId, tool, index?)` | Adds a tool to a region |
| `removeTool(toolId)` | Removes a tool by ID |
| `getTool(toolId)` | Returns the tool configuration |
| `setToolState(toolId, state)` | Updates tool properties |
| `getToolState(toolId)` | Returns current tool state |
| `setStyle(style)` | Changes default tool display style |
| `setToolSize(size)` | Changes tool button size |
| `recalculateOverflow()` | Forces overflow recalculation |
| `setGallerySelection(galleryId, optionId)` | Selects a gallery option |
| `getGallerySelection(galleryId)` | Returns selected gallery option ID |
| `setSplitMenuItems(splitId, items)` | Updates split button menu items |
| `showKeyTips()` | Shows KeyTip badges |
| `hideKeyTips()` | Hides KeyTip badges |
| `saveLayout()` | Saves layout state to localStorage |
| `restoreLayout()` | Restores layout state from localStorage |
| `getLayoutState()` | Returns current layout state |
| `applyLayoutState(state)` | Applies a layout state object |
| `getMode()` | Returns current mode |
| `getOrientation()` | Returns current orientation |
| `getDockPosition()` | Returns current dock position |
| `isVisible()` | Returns visibility state |
| `getElement()` | Returns the root DOM element |

### Convenience Functions

```typescript
createToolbar(options)         // Create, show, and return
createDockedToolbar(options)   // Shorthand for docked mode
createFloatingToolbar(options) // Shorthand for floating mode
```

### Global Exports

```
window.Toolbar
window.createToolbar
window.createDockedToolbar
window.createFloatingToolbar
```

## Tool Types

### Standard Tool

```typescript
{ id: "bold", icon: "bi-type-bold", tooltip: "Bold", toggle: true }
```

### Split Button

```typescript
{
    type: "split-button",
    id: "paste",
    icon: "bi-clipboard",
    tooltip: "Paste",
    menuItems: [
        { id: "paste-plain", icon: "bi-file-text", label: "Paste as plain text" },
        { id: "paste-special", icon: "bi-file-earmark-code", label: "Paste special" }
    ]
}
```

### Gallery Control

```typescript
{
    type: "gallery",
    id: "font-color",
    icon: "bi-palette",
    tooltip: "Font colour",
    layout: "grid",
    columns: 4,
    options: [
        { id: "red", label: "Red", color: "#dc2626" },
        { id: "blue", label: "Blue", color: "#1c7ed6" }
    ],
    onSelect: function(option, gallery) { console.log("Selected:", option.id); }
}
```

### Separator

```typescript
{ type: "separator" }
```

## CSS Custom Properties

When docked, the toolbar sets a CSS custom property on `<html>`:

| Property | Set When |
|----------|----------|
| `--toolbar-top-size` | Docked top |
| `--toolbar-bottom-size` | Docked bottom |
| `--toolbar-left-size` | Docked left |
| `--toolbar-right-size` | Docked right |

Properties are cleared when the toolbar is hidden or undocked.

## Keyboard Accessibility

| Key | Action |
|-----|--------|
| Tab | Move focus into toolbar |
| Arrow keys | Navigate between tools |
| Home / End | First / last tool |
| Enter / Space | Activate tool |
| Escape | Close dropdown / gallery / overflow / KeyTips |
| Alt | Toggle KeyTip badges |

See `specs/toolbar.prd.md` for the complete specification.
