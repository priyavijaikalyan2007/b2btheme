<!-- AGENT: Documentation for the StackLayout component — vertically stacked collapsible panels with draggable dividers. -->

# StackLayout

A vertically stacked panel layout where each panel has a collapsible header (with icon, title, and chevron toggle) and a content area. Draggable dividers between panels allow resizing. When a panel is collapsed, only its 28px header is visible and the remaining panels expand proportionally.

## Assets

| Asset | Path |
|-------|------|
| CSS | `components/stacklayout/stacklayout.css` |
| JS | `components/stacklayout/stacklayout.js` |
| Types | `components/stacklayout/stacklayout.d.ts` |

## Requirements

- **Bootstrap CSS** -- for SCSS variables (`$gray-*`, `$primary`, spacing tokens).
- Does **not** require Bootstrap JS.
- Optional: **Bootstrap Icons** for panel header icons.

## Quick Start

```html
<link rel="stylesheet" href="components/stacklayout/stacklayout.css">
<script src="components/stacklayout/stacklayout.js"></script>
<script>
    var propsEl = document.createElement("div");
    propsEl.textContent = "Properties content";

    var relsEl = document.createElement("div");
    relsEl.textContent = "Relationships content";

    var stack = createStackLayout({
        container: document.getElementById("sidebar-content"),
        panels: [
            { id: "properties", title: "Properties", icon: "bi-gear", content: propsEl },
            { id: "relationships", title: "Relationships", icon: "bi-diagram-3", content: relsEl, collapsed: true },
        ],
        resizable: true,
        onResize: function(sizes) { console.log("Sizes:", sizes); },
        onCollapse: function(id, collapsed) { console.log(id, collapsed); },
    });
</script>
```

## Options (StackLayoutOptions)

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `container` | `HTMLElement` | **required** | Container element to render into |
| `panels` | `StackedPanelConfig[]` | **required** | Panel definitions, in order |
| `resizable` | `boolean` | `true` | Whether dividers are draggable |
| `orientation` | `"vertical"` | `"vertical"` | Stack direction (vertical only for now) |
| `onResize` | `function` | -- | Called with panel size percentages after resize |
| `onCollapse` | `function` | -- | Called when a panel is collapsed or expanded |

## Panel Config (StackedPanelConfig)

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | `string` | **required** | Unique panel identifier |
| `title` | `string` | **required** | Header title text |
| `icon` | `string` | -- | Bootstrap Icons class (e.g. `"bi-gear"`) |
| `content` | `HTMLElement` | **required** | Content element |
| `collapsed` | `boolean` | `false` | Start collapsed |
| `collapsible` | `boolean` | `true` | Whether panel can be collapsed |
| `minHeight` | `number` | `50` | Minimum panel height in pixels |

## API

| Method | Returns | Description |
|--------|---------|-------------|
| `getPanel(id)` | `PanelHandle \| null` | Get a panel sub-handle |
| `collapsePanel(id)` | `void` | Collapse a panel by ID |
| `expandPanel(id)` | `void` | Expand a panel by ID |
| `setSizes(percentages)` | `void` | Set expanded panel sizes as percentages |
| `destroy()` | `void` | Remove from DOM, clean up |
| `getElement()` | `HTMLElement` | Root DOM element |

### Panel Handle

Returned by `getPanel(id)`:

| Method | Description |
|--------|-------------|
| `setContent(el)` | Replace panel content |
| `collapse()` | Collapse this panel |
| `expand()` | Expand this panel |

### Global Export

```
window.createStackLayout
```

## Keyboard Accessibility

| Key | Action |
|-----|--------|
| Enter / Space | Toggle collapse on focused panel header |
| Tab | Move focus between panel headers and dividers |

## Accessibility

- Panels have `role="region"` with `aria-label` from the panel title
- Panel headers have `role="button"` with `aria-expanded`
- Headers are focusable via `tabindex="0"` (when collapsible)
- Dividers have `role="separator"` with `aria-orientation="horizontal"`
- Dividers are focusable via `tabindex="0"` (when resizable)

## Visual Layout

```
+---------------------+
| > Properties    [-] |  <-- Collapsible header with chevron
|                     |
|  Name: Deploy Plan  |  <-- Panel 1 content
|  Type: Checklist    |
|                     |
+- - - - - - - - - - -+  <-- 4px draggable divider
| > Relationships [-] |  <-- Collapsible header
|                     |
|  derived_from (1)   |  <-- Panel 2 content
|  owned_by (1)       |
|                     |
+---------------------+
```

When a panel is collapsed, only its 28px header row is visible. The remaining expanded panels redistribute to fill available space.

## Composition with Sidebar

```javascript
var rightSidebar = createDockedSidebar({ position: "right", width: 380 });
var stack = createStackLayout({
    container: rightSidebar.getContentElement(),
    panels: [
        { id: "properties", title: "Properties", content: propsEl },
        { id: "relationships", title: "Relationships", content: relsEl, collapsed: true },
    ],
    resizable: true,
});
```

See `specs/stackable-sidebars.req.md` for the full requirement document.
