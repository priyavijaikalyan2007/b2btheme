<!-- AGENT: Documentation for the Toolbar component — dockable/floating action bar with regions, overflow, and orientation support. -->

# Toolbar

A programmable action bar component for grouping tools and actions into labelled regions. Inspired by the Microsoft Office Ribbon but adapted to the enterprise Bootstrap 5 aesthetic — single strip, no tabs.

## Features

- **Docked** or **floating** positioning with **drag-to-dock** snapping
- **Horizontal** or **vertical** orientation in either mode
- **Regions** — named groups of related tools separated by dividers
- **Tool types** — standard buttons, toggle buttons, split buttons, gallery controls
- **Overflow** — Priority+ algorithm collapses excess tools into inline dropdown menus (dual buttons for left/right region groups)
- **KeyTips** — Office-style keyboard shortcut badges revealed on Alt press
- **Layout persistence** — save and restore toolbar position, orientation, and state
- **Resize** — drag handle along the orientation axis
- **Tooltips** — Bootstrap 5 native tooltips on every tool
- **Full keyboard accessibility** — WAI-ARIA toolbar pattern with roving tabindex

## Assets

| Asset | Path |
|-------|------|
| CSS | `components/toolbar/toolbar.css` |
| JS | `components/toolbar/toolbar.js` |
| Types | `components/toolbar/toolbar.d.ts` |

**Requires:** Bootstrap CSS (for SCSS variables), Bootstrap Icons CSS, Bootstrap JS (optional, for tooltips). Does **not** require a JavaScript framework.

## Quick Start

```html
<link rel="stylesheet" href="components/toolbar/toolbar.css">
<script src="components/toolbar/toolbar.js"></script>
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
| `title` | `string \| ToolbarTitle` | — | Visible title at the left edge (text, icon, custom colours) |
| `regions` | `ToolbarRegion[]` | required | Regions containing tool items |
| `rightContent` | `HTMLElement` | — | Custom HTML rendered right-aligned, after all regions |
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
| `setTitle(cfg)` | Sets, updates, or removes (`null`) the visible title |
| `getTitle()` | Returns the current title config or `null` |
| `setRightContent(el)` | Sets or removes (`null`) the right-content slot |
| `getRightContent()` | Returns the right-content container or `null` |
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

## Title

The toolbar can display a non-interactive title at the left edge (or top, in vertical orientation). Pass a string for text-only, or a `ToolbarTitle` object for full control.

```typescript
// Text-only
createToolbar({ label: "My App", title: "My App", regions: [...] });

// Icon + text with custom colours
createToolbar({
    label: "My App",
    title: {
        text: "My App",
        icon: "bi-app",
        backgroundColor: "#1864ab",
        color: "#ffffff"
    },
    regions: [...]
});
```

### ToolbarTitle

| Property | Type | Description |
|----------|------|-------------|
| `text` | `string` | Display text |
| `icon` | `string` | Bootstrap Icons class (e.g., `"bi-app"`) |
| `backgroundColor` | `string` | Background colour (CSS value) |
| `color` | `string` | Text / icon colour (CSS value) |
| `cssClass` | `string` | Additional CSS class(es) |
| `width` | `string` | Fixed width (CSS value, e.g. `"200px"`, `"12rem"`) |

Use `setTitle()` to update or remove at runtime:

```js
toolbar.setTitle({ text: "New Title", icon: "bi-star" });
toolbar.setTitle(null);  // remove
```

## Region Alignment

Regions can be aligned to the left (default) or right side of the toolbar. Right-aligned regions are pushed to the trailing edge with flexible space between the two groups.

```typescript
createToolbar({
    label: "My App",
    title: { text: "My App", icon: "bi-app", backgroundColor: "#1864ab", color: "#fff", width: "200px" },
    regions: [
        {
            id: "editing",
            title: "Editing",
            items: [
                { id: "cut", icon: "bi-scissors", tooltip: "Cut" },
                { id: "copy", icon: "bi-clipboard", tooltip: "Copy" },
                { id: "paste", icon: "bi-clipboard-check", tooltip: "Paste" }
            ]
        },
        {
            id: "user",
            title: "User",
            align: "right",
            items: [
                { id: "settings", icon: "bi-gear", tooltip: "Settings" },
                { id: "help", icon: "bi-question-circle", tooltip: "Help" }
            ]
        }
    ]
});
```

In vertical orientation, `"left"` maps to top and `"right"` maps to bottom.

### ToolbarRegion

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `id` | `string` | required | Unique identifier |
| `title` | `string` | — | Region title text |
| `showTitle` | `boolean` | `true` | Show/hide region title |
| `items` | `Array` | required | Tool items, split buttons, galleries, separators |
| `style` | `ToolStyle` | — | Default tool style for this region |
| `hidden` | `boolean` | `false` | Hidden state |
| `cssClass` | `string` | — | Additional CSS class(es) |
| `align` | `"left" \| "right"` | `"left"` | Alignment within the toolbar |

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

### Input

```typescript
{
    type: "input",
    id: "search",
    placeholder: "Search...",
    icon: "bi-search",
    width: "200px",
    onInput: function(value) { console.log("Searching:", value); },
    onSubmit: function(value) { console.log("Submit:", value); }
}
```

### Dropdown

```typescript
{
    type: "dropdown",
    id: "zoom",
    tooltip: "Zoom level",
    value: "100",
    width: "80px",
    options: [
        { value: "50", label: "50%" },
        { value: "100", label: "100%" },
        { value: "200", label: "200%" }
    ],
    onChange: function(value) { console.log("Zoom:", value); }
}
```

### Label

```typescript
{
    type: "label",
    id: "status",
    text: "Ready",
    icon: "bi-check-circle",
    color: "#40c057"
}
```

### Separator

```typescript
{ type: "separator" }
```

### Checkbox

```typescript
{
    type: "checkbox",
    id: "show-grid",
    label: "Show Grid",
    tooltip: "Toggle grid visibility",
    checked: true,
    onChange: function(checked) { console.log("Grid:", checked); }
}
```

### Toggle Switch

```typescript
{
    type: "switch",
    id: "live-preview",
    label: "Live Preview",
    tooltip: "Toggle live preview",
    checked: false,
    onChange: function(checked) { console.log("Preview:", checked); }
}
```

### Number Spinner

```typescript
{
    type: "number",
    id: "font-size",
    tooltip: "Font size",
    value: 14,
    min: 8,
    max: 72,
    step: 1,
    width: "80px",
    suffix: "px",
    onChange: function(value) { console.log("Size:", value); }
}
```

### Color Picker

```typescript
{
    type: "color",
    id: "fg-color",
    tooltip: "Foreground color",
    value: "#333333",
    showLabel: true,
    onChange: function(value) { console.log("Color:", value); },
    onInput: function(value) { /* live drag updates */ }
}
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

## Overflow

When tools exceed the available space, the Priority+ algorithm hides excess tools into a dropdown menu. The overflow button ("...") appears inline, right after the last visible tool in each group.

- **Left-only regions**: One overflow button at the end of the left group
- **Left + right regions**: Two independent overflow buttons — one per group, each showing only its group's hidden tools
- **Priority order**: `always` (always overflow) > `low` > `high` > `never` (never overflow)

Set `overflowPriority` on each tool to control which tools collapse first:

```typescript
{ id: "cut", icon: "bi-scissors", tooltip: "Cut", overflowPriority: "never" }
{ id: "help", icon: "bi-question-circle", tooltip: "Help", overflowPriority: "low" }
```

Disable overflow with `overflow: false` in toolbar options.

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
