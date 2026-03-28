<!-- AGENT: Documentation for the InlineToolbar component — compact inline button row. -->

# InlineToolbar

A compact inline toolbar that renders INSIDE a container element as a flex row. Designed for sidebars, panel headers, and other embedded contexts where a full docked toolbar is inappropriate.

## Assets

| Asset | Path |
|-------|------|
| CSS | `components/inlinetoolbar/inlinetoolbar.css` |
| JS | `components/inlinetoolbar/inlinetoolbar.js` |
| Types | `components/inlinetoolbar/inlinetoolbar.d.ts` |

## Requirements

- **Bootstrap Icons** — for icon rendering (`bi bi-*` classes)
- Does **not** require Bootstrap JS.

## Quick Start

```html
<link rel="stylesheet" href="components/inlinetoolbar/inlinetoolbar.css">
<script src="components/inlinetoolbar/inlinetoolbar.js"></script>
<script>
    var toolbar = createInlineToolbar({
        container: document.getElementById("sidebar-header"),
        items: [
            { id: "filter", icon: "funnel", tooltip: "Filter", type: "toggle" },
            { id: "sep1", icon: "", tooltip: "", type: "separator" },
            { id: "expand", icon: "arrows-expand", tooltip: "Expand All" },
            { id: "collapse", icon: "arrows-collapse", tooltip: "Collapse All" },
            { id: "refresh", icon: "arrow-clockwise", tooltip: "Refresh",
              onClick: function(item) { console.log("Refresh clicked"); } }
        ],
        size: "sm",
        compact: true
    });
</script>
```

## API

### Global Functions

| Function | Returns | Description |
|----------|---------|-------------|
| `createInlineToolbar(options)` | `InlineToolbar` | Create toolbar inside container |

### InlineToolbarOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `container` | `HTMLElement` | **required** | Parent element to render inside |
| `items` | `InlineToolbarItem[]` | **required** | Toolbar items |
| `size` | `string` | `"sm"` | `xs` (24px), `sm` (28px), `md` (32px) |
| `align` | `string` | `"left"` | `left`, `center`, `right` |
| `compact` | `boolean` | `false` | Reduce gaps for tight spaces |

### InlineToolbarItem

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | `string` | **required** | Unique item identifier |
| `icon` | `string` | **required** | Bootstrap icon name (without `bi-` prefix) |
| `tooltip` | `string` | **required** | Tooltip text (rendered as `title` attribute) |
| `type` | `string` | `"button"` | `button`, `toggle`, `separator` |
| `active` | `boolean` | `false` | Initial toggle state |
| `disabled` | `boolean` | `false` | Disable the item |
| `onClick` | `function` | -- | `(item, active) => void` |

### InlineToolbar Handle

| Method | Description |
|--------|-------------|
| `setItemDisabled(id, disabled)` | Enable or disable an item |
| `setItemActive(id, active)` | Set toggle active state |
| `show()` | Show the toolbar |
| `hide()` | Hide the toolbar |
| `destroy()` | Remove from DOM and clean up |
| `getElement()` | Return root element |

## Features

- Renders inline (no fixed/absolute positioning)
- Icon buttons with hover highlight
- Toggle buttons with active state (accent background)
- Separators (1px vertical dividers)
- Three sizes: xs (24px), sm (28px), md (32px)
- Compact mode with reduced gaps
- Theme-aware via CSS custom properties (light/dark mode)

## Accessibility

- Toolbar: `role="toolbar"`, `aria-label="Inline toolbar"`
- Buttons: `aria-label` set from tooltip text
- Icons: `aria-hidden="true"`
- Focus: visible focus ring via `outline` on `:focus-visible`
- Disabled: `disabled` attribute + `pointer-events: none`

See `specs/explorer-inline-toolbar.req.md` for the original requirement.
