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
| `icon` | `string` | — | A Bootstrap icon name (`"crosshair"`), or a full class string (`"fa-solid fa-user"`, `"fluent-ui-people-team-16-regular"`). See "Icons" below |
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

## Icons

`icon` takes a Bootstrap Icons name, as before, or a full class string. A
value with a space, or one that starts with an icon-pack prefix
(`fluent-ui-`, `fluent-emoji-`, `aws-`, `azure-`, `gcp-`), is used as given.
Anything else gets `bi bi-` in front. GraphCanvas uses the same rule, so one
stored value works on a graph node and its badge.

```js
createTypeBadge({ typeKey: "org.person", icon: "fa-solid fa-user" });
createTypeBadge({ typeKey: "org.team",   icon: "fluent-ui-people-team-16-regular" });
createTypeBadge({ typeKey: "work.doc",   icon: "fluent-ui-document-16-color" });
createTypeBadge({ typeKey: "goal.okr",   icon: "crosshair" });   // unchanged
```

- **Stylesheets:** load the one that defines the class. Font Awesome needs its
  two-class form (`"fa-solid fa-user"`). For the packs, see `docs/ICON_PACKS.md`.
- **Size:** the `sm`, `md` and `lg` sizes size every icon family. Use the `16-`
  Fluent classes.
- **Colour:** a monochrome icon follows the badge's icon colour. A colour icon
  keeps its own palette.

## Over A2UI

TypeBadge is in the A2UI catalog (ADR-243), mounted with `mountTypeBadge`. `color` must be hex, and `icon` one word (a Bootstrap icon name or a pack class) or a Font Awesome pair such as `"fa-solid fa-user"`. An agent cannot send any other list of classes. Clicking a clickable badge, or pressing Enter or Space on it, sends `onClick` with `{ typeKey }`.

## Global

```javascript
window.createTypeBadge(options)
window.mountTypeBadge(containerId, options)
```
