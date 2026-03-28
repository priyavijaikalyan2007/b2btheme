<!-- AGENT: Documentation for the ContextMenu component — theme-aware accessible context menu. -->

# ContextMenu

A theme-aware, accessible context menu component with icons, keyboard shortcuts, separators, sub-menus, checked/radio states, and viewport edge detection. Designed for right-click (desktop) or programmatic invocation across all applications.

## Assets

| Asset | Path |
|-------|------|
| CSS | `components/contextmenu/contextmenu.css` |
| JS | `components/contextmenu/contextmenu.js` |
| Types | `components/contextmenu/contextmenu.d.ts` |

## Requirements

- **Bootstrap CSS** — for SCSS variables
- **Bootstrap Icons** — item icons (`bi-*` classes)
- Does **not** require Bootstrap JS.

## Quick Start

```html
<link rel="stylesheet" href="components/contextmenu/contextmenu.css">
<script src="components/contextmenu/contextmenu.js"></script>
<script>
    document.addEventListener("contextmenu", function(e) {
        e.preventDefault();
        createContextMenu({
            x: e.clientX,
            y: e.clientY,
            items: [
                { id: "cut", label: "Cut", icon: "scissors", shortcut: "Ctrl+X" },
                { id: "copy", label: "Copy", icon: "files", shortcut: "Ctrl+C" },
                { id: "paste", label: "Paste", icon: "clipboard", shortcut: "Ctrl+V" },
                { id: "sep1", label: "", type: "separator" },
                { id: "delete", label: "Delete", icon: "trash", shortcut: "Del", danger: true }
            ],
            onClose: function() { console.log("Menu closed"); }
        });
    });
</script>
```

## API

### Global Functions

| Function | Returns | Description |
|----------|---------|-------------|
| `createContextMenu(options)` | `ContextMenu` | Create and display a context menu |

### ContextMenuOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `items` | `ContextMenuItem[]` | **required** | Menu items |
| `x` | `number` | **required** | Horizontal position (px) |
| `y` | `number` | **required** | Vertical position (px) |
| `theme` | `string` | `"auto"` | `light`, `dark`, or `auto` |
| `minWidth` | `number` | `200` | Minimum width (px) |
| `maxWidth` | `number` | `320` | Maximum width (px) |
| `onClose` | `function` | — | Called when menu closes |
| `autoClose` | `boolean` | `true` | Close on outside click |
| `closeOnEscape` | `boolean` | `true` | Close on Escape key |
| `animation` | `string` | `"fade"` | `fade`, `scale`, or `none` |

### ContextMenuItem

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | `string` | **required** | Unique identifier |
| `label` | `string` | **required** | Display text |
| `icon` | `string` | — | Bootstrap icon name (without `bi-` prefix) |
| `shortcut` | `string` | — | Keyboard shortcut hint |
| `disabled` | `boolean` | `false` | Disables the item |
| `checked` | `boolean` | — | Checkmark state |
| `active` | `boolean` | — | Radio-style active state |
| `type` | `string` | `"item"` | `item`, `separator`, `header`, `submenu` |
| `danger` | `boolean` | `false` | Red styling for destructive actions |
| `children` | `ContextMenuItem[]` | — | Sub-menu items (for `type: "submenu"`) |
| `onClick` | `function` | — | Click handler receiving the item |

### ContextMenu (Handle)

| Method | Returns | Description |
|--------|---------|-------------|
| `close()` | `void` | Close the menu |
| `isOpen()` | `boolean` | Whether the menu is visible |
| `updateItems(items)` | `void` | Replace menu items |
| `destroy()` | `void` | Tear down permanently |

## Features

- **Theme-aware** — follows system light/dark mode via CSS custom properties; explicit `light`/`dark` override available
- **Keyboard navigation** — Arrow Up/Down to navigate, Enter to select, Escape to close, Right to open sub-menu, Left to close sub-menu
- **Sub-menus** — nested menus with hover delay and arrow indicator
- **Viewport edge detection** — flips up/left when near viewport edges
- **Checked/radio states** — checkmark icon with `aria-checked`
- **Disabled items** — 50% opacity, no pointer events, `aria-disabled`
- **Danger items** — red text and icon for destructive actions
- **Headers** — bold, non-clickable section labels
- **Separators** — horizontal dividers with `role="separator"`
- **Animation** — fade-in (150ms), scale, or none
- **Icons** — Bootstrap Icons with 20px icon column
- **Shortcuts** — right-aligned muted shortcut hints

## Accessibility

- Container: `role="menu"`, `aria-label="Context menu"`
- Items: `role="menuitem"`, `tabindex="-1"`
- Separators: `role="separator"`
- Disabled items: `aria-disabled="true"`
- Sub-menu triggers: `aria-haspopup="menu"`
- Checked items: `aria-checked="true"` or `"false"`
- Focus management: first non-disabled item focused on open
- Focus visible: 2px inset primary ring

## Visual Design

- Border radius: 8px
- Box shadow: `0 4px 16px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.05)`
- Item height: 32px
- Icon column: 20px wide
- Shortcut column: right-aligned, muted
- Hover: theme-aware hover background
- z-index: 1080

See `specs/explorer-context-menu.req.md` for the full specification.
