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

## Global

```javascript
window.createTypeBadge(options)
```
