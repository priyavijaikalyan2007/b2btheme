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
| Up / Down Arrow | Move a focused divider 10px in a vertical stack |
| Left / Right Arrow | Move a focused divider 10px in a horizontal stack |
| Tab | Move focus between panel headers and dividers |

## Pointer and touch

- **Drag a divider** to resize the expanded panels on each side of it. `onResize` reports the sizes on each move.
- **A swipe across the divider still scrolls.** In a vertical stack the divider takes a vertical drag, and a horizontal swipe that starts on it scrolls (`touch-action: pan-x`). In a horizontal stack it is the other way (`pan-y`).
- **A canceled drag changes nothing.** The browser cancels a drag when it takes the gesture for a scroll or when a call arrives. The panels go back to their sizes from before the drag, and `onResize` reports those sizes once.
- **Double click or double tap a divider** to collapse or expand a panel beside it, as in SplitLayout. When only one of the two can collapse, it is that one. When both can, it is the smaller one, and a collapsed panel counts as the smallest. When neither can, nothing happens.
- **Tap or click a header** to collapse or expand its panel.
- **Under a coarse pointer** the divider's target is 44 CSS pixels across. The visible line stays 4px.
- **The hover color** on a header or a divider shows only on a device with hover.
- **Without a drag:** the arrow keys move a focused divider (#232), and `setSizes`, `collapsePanel` and `expandPanel` do it from code.

## States

| State | What a person sees |
|---|---|
| Idle | Panels with their headers, and 4px dividers between them. |
| Hover | The header or the divider changes color, on a device with hover. |
| Focused | A focus ring on the header or the divider. |
| Dragging | The divider in the primary color until the pointer lifts or the drag is canceled. |
| Collapsed | Only the panel's header shows. In a horizontal stack it is a 32px strip. |

The layout has no loading, empty, disabled or read-only state. Each panel's content shows its own.

## Accessibility

- Panels have `role="region"` with `aria-label` from the panel title
- Panel headers have `role="button"` with `aria-expanded`
- Headers are focusable via `tabindex="0"` (when collapsible)
- Dividers have `role="separator"` with `aria-orientation`, and `aria-valuenow` gives the size of the panel before the divider as a percentage
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
