<!-- AGENT: Documentation for the Breadcrumb Navigation component — hierarchical path display. -->

# Breadcrumb Navigation

Hierarchical path display with clickable segments, optional terminal dropdown actions, and overflow truncation for deep hierarchies. Extends Bootstrap 5 breadcrumb base styles.

## Assets

| Asset | Path |
|-------|------|
| CSS | `components/breadcrumb/breadcrumb.css` |
| JS | `components/breadcrumb/breadcrumb.js` |
| Types | `components/breadcrumb/breadcrumb.d.ts` |

## Requirements

- **Bootstrap CSS** — for `.breadcrumb` / `.breadcrumb-item` base classes and SCSS variables
- **Bootstrap Icons** — per-item and action icons (`bi-*` classes)
- Does **not** require Bootstrap JS.

## Quick Start

```html
<link rel="stylesheet" href="components/breadcrumb/breadcrumb.css">
<script src="components/breadcrumb/breadcrumb.js"></script>
<script>
    var bc = createBreadcrumb({
        container: document.getElementById("my-breadcrumb"),
        items: [
            { label: "Home", icon: "bi-house-fill" },
            { label: "Projects" },
            { label: "Acme Corp" }
        ],
        onItemClick: function(item, index) {
            console.log("Navigate to:", item.label);
        }
    });
</script>
```

## API

### `createBreadcrumb(options): BreadcrumbHandle`

Factory function — creates and mounts a breadcrumb instance.

### BreadcrumbOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `container` | `HTMLElement` | **required** | Mount target element |
| `items` | `BreadcrumbItem[]` | `[]` | Initial path segments |
| `actions` | `BreadcrumbAction[]` | `[]` | Terminal segment dropdown actions |
| `maxVisible` | `number` | `5` | Max visible items; 0 = no truncation |
| `separator` | `string` | `"/"` | Divider character between segments |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Size variant |
| `cssClass` | `string` | — | Additional CSS class(es) on root |
| `onItemClick` | `(item, index) => void` | — | Click callback for segments |
| `onActionClick` | `(actionId, item) => void` | — | Click callback for actions |

### BreadcrumbItem

| Property | Type | Description |
|----------|------|-------------|
| `label` | `string` | Display text (required) |
| `href` | `string` | Navigation URL (renders `<a>` instead of `<button>`) |
| `icon` | `string` | Bootstrap Icons class (e.g. `"bi-house-fill"`) |
| `data` | `unknown` | Arbitrary payload for callbacks |

### BreadcrumbAction

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique identifier (required) |
| `label` | `string` | Display text (required) |
| `icon` | `string` | Bootstrap Icons class |
| `separator` | `boolean` | Show divider line above this action |
| `disabled` | `boolean` | Grey out and prevent click |

### BreadcrumbHandle

| Method | Returns | Description |
|--------|---------|-------------|
| `setItems(items)` | `void` | Replace all segments |
| `addItem(item)` | `void` | Append a new segment |
| `removeItem(index)` | `void` | Remove segment by index |
| `getItems()` | `BreadcrumbItem[]` | Return copy of current items |
| `setActions(actions)` | `void` | Replace terminal dropdown actions |
| `getElement()` | `HTMLElement` | Return root `<nav>` element |
| `destroy()` | `void` | Remove DOM and event listeners |

## Overflow Truncation

When the number of items exceeds `maxVisible`, middle segments collapse into an ellipsis (`…`) that opens a dropdown listing the hidden items:

```javascript
var bc = createBreadcrumb({
    container: el,
    maxVisible: 5,
    items: [
        { label: "Root" },
        { label: "Level 1" },
        { label: "Level 2" },
        { label: "Level 3" },
        { label: "Level 4" },
        { label: "Level 5" },
        { label: "Level 6" },
        { label: "Current" }
    ]
});
// Renders: Root > … > Level 4 > Level 5 > Level 6 > Current
```

## Terminal Actions

Add a dropdown menu to the last segment for contextual actions:

```javascript
var bc = createBreadcrumb({
    container: el,
    items: [
        { label: "Home" },
        { label: "Settings" }
    ],
    actions: [
        { id: "edit", label: "Edit", icon: "bi-pencil" },
        { id: "delete", label: "Delete", icon: "bi-trash", separator: true }
    ],
    onActionClick: function(actionId, item) {
        console.log("Action:", actionId, "on", item.label);
    }
});
```

## Size Variants

| Variant | Class | Font Size |
|---------|-------|-----------|
| Small | `breadcrumb-nav-sm` | 0.75rem |
| Medium | *(default)* | `$breadcrumb-font-size` (0.8125rem) |
| Large | `breadcrumb-nav-lg` | 1rem |

## Keyboard

| Key | Action |
|-----|--------|
| `Tab` | Focus breadcrumb items sequentially |
| `Enter` / `Space` | Activate focused item or action |
| `Escape` | Close any open dropdown |
| `Arrow Down` / `Arrow Up` | Navigate within open dropdown |
| `Alt + D` | Focus breadcrumb (global, per KEYBOARD.md) |

## Accessibility

- Root element: `<nav aria-label="Breadcrumb">`
- Active (terminal) item: `aria-current="page"`
- Dropdown triggers: `aria-haspopup="true"`, `aria-expanded`
- Menu items: `role="menu"` / `role="menuitem"`
- Icons: `aria-hidden="true"`

## CSS Custom Properties

| Property | Default | Description |
|----------|---------|-------------|
| `--breadcrumb-nav-divider` | `"/"` | Separator character |
