# TypeBadge

Small inline chip/badge that visually identifies an ontology type via icon, color, and label.

## Usage

```html
<link rel="stylesheet" href="components/typebadge/typebadge.css" />
<script src="components/typebadge/typebadge.js"></script>
```

```javascript
const badge = createTypeBadge({
    typeKey: "strategy.okr",
    icon: "crosshair",
    color: "#C0392B",
    size: "sm",
    variant: "subtle"
});
document.getElementById("container").appendChild(badge);
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `typeKey` | `string` | — | Ontology type key, e.g. `"strategy.okr"` |
| `displayName` | `string` | extracted from typeKey | Override display text |
| `icon` | `string` | — | Bootstrap icon name (without `bi bi-` prefix) |
| `color` | `string` | `"#475569"` | Hex color |
| `size` | `"sm" \| "md" \| "lg"` | `"sm"` | Size variant (20/28/32px height) |
| `variant` | `"filled" \| "outlined" \| "subtle"` | `"subtle"` | Visual variant |
| `showNamespace` | `boolean` | `false` | Show namespace prefix in label |
| `clickable` | `boolean` | `false` | Enable click/keyboard activation |
| `onClick` | `() => void` | — | Click callback |

## Sizes

- **sm** — 20px height, 11px font
- **md** — 28px height, 12px font
- **lg** — 32px height, 13px font

## Variants

- **filled** — Solid background = type color, white text
- **outlined** — Transparent background, colored border and text
- **subtle** — 10% opacity background, colored text

## Mounting with a handle

`createTypeBadge` returns a bare element for you to place. `mountTypeBadge(containerId, options)` creates the same badge inside the element with that id and returns a handle:

| Method | Returns | Description |
|--------|---------|-------------|
| `getElement()` | `HTMLElement` | The badge element |
| `on(channel, handler)` | `() => void` | Subscribes to `"click"` (`{ typeKey }`), heard after `onClick`, even when no `onClick` was passed; returns the unsubscribe |
| `getState()` / `setState(state)` | `{}` / `void` | Nothing to restore |
| `setData(slot, value)` | `void` | Throws: the badge has no data slots |
| `destroy()` | `void` | Removes the badge |

## Over A2UI

TypeBadge is in the A2UI catalog (ADR-243), mounted with `mountTypeBadge`. `color` must be hex and `icon` a Bootstrap icon name. Clicking a clickable badge, or pressing Enter or Space on it, sends `onClick` with `{ typeKey }`.

## Global

```javascript
window.createTypeBadge(options)
window.mountTypeBadge(containerId, options)
```
