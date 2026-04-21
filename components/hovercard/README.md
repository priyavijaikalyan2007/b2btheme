<!-- AGENT: Documentation for the HoverCard component — informational floating card for rich-on-hover previews. -->

# HoverCard

Informational floating card that surfaces dense detail on pointer hover or keyboard focus. A single, themable primitive that replaces ad-hoc per-component tooltip implementations (`title=` attributes, private `.gc-tooltip` DOMs) with a Bootstrap-styled card (title, icon, badge, properties, description, footer).

HoverCard is the **informational** sibling of ContextMenu. It yields to ContextMenu on the browser's native `contextmenu` event, does not capture pointer events, and is not part of the anchor's tab order.

**Spec**: `specs/hovercard.prd.md` · **ADR**: ADR-125.

## Assets

| Asset | Path |
|-------|------|
| CSS | `components/hovercard/hovercard.css` |
| JS | `components/hovercard/hovercard.js` |
| Types | `components/hovercard/hovercard.d.ts` |

## Requirements

- **Bootstrap CSS** — badge variants, spacing tokens
- **Bootstrap Icons** (optional) — `bi-*` classes for the card icon
- No Bootstrap JS required.

## Quick Start

```html
<link rel="stylesheet" href="components/hovercard/hovercard.css">
<script src="components/hovercard/hovercard.js"></script>
<script>
    // One shared handle across many anchors (recommended for lists/grids/graphs).
    const shared = createHoverCard();

    attachHoverCard(document.getElementById("user-row"),
        () => ({
            title: "Jane Doe",
            subtitle: "admin",
            icon: "bi-person-circle",
            iconColor: "#2563eb",
            badge: { text: "active", variant: "success" },
            properties: [
                { key: "email",  value: "jane@example.com" },
                { key: "region", value: "us-west-2" }
            ],
            description: "Primary admin for the tenant."
        }),
        { shared });
</script>
```

## API

### Global Functions

| Function | Returns | Description |
|----------|---------|-------------|
| `createHoverCard(options?)` | `HoverCardHandle` | Create a reusable hover card instance. |
| `attachHoverCard(anchor, getContent, options?)` | `() => void` | Wire an element's hover/focus events to a card; returns a detach function. No-ops on touch-primary devices. |

### HoverCardOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `container` | `HTMLElement` | `document.body` | Portal root for the card element. |
| `placement` | `"auto" \| "top" \| "bottom" \| "left" \| "right"` | `"auto"` | Preferred side. Auto tries bottom → top → right → left. |
| `align` | `"start" \| "center" \| "end"` | `"center"` | Cross-axis alignment. |
| `offset` | `number` | `8` | Gap between anchor edge and card edge (px). |
| `openDelay` | `number` | `250` | Delay before opening (ms). |
| `closeDelay` | `number` | `100` | Delay before closing (ms). |
| `maxProperties` | `number` | `5` | Maximum property rows; overflow becomes `+N more`. |
| `maxHeight` | `number \| string` | `320` | Hard ceiling on card height. Numbers are px; strings accept any CSS value (`"50vh"`). |
| `overflowHint` | `"fade" \| "none"` | `"fade"` | Fade-out mask at the bottom when content exceeds `maxHeight`. |
| `className` | `string` | — | Extra class on the root element. |
| `onShow` | `(anchor) => void` | — | Fires when the card becomes visible. |
| `onHide` | `() => void` | — | Fires when the card hides. |

### HoverCardContent (declarative path)

| Field | Type | Description |
|-------|------|-------------|
| `title` | `string` | Header title. Omitted when absent. |
| `subtitle` | `string` | Dimmer secondary line. |
| `icon` | `string` | Bootstrap Icons class (e.g. `"bi-diagram-3"`). |
| `iconColor` | `string` | CSS color for the icon / colored dot. |
| `badge` | `{ text, variant? }` | Status pill. Variants: `success`, `warning`, `danger`, `info`, `secondary`. |
| `properties` | `Array<{ key, value }>` | Key/value rows. First `maxProperties` rendered. |
| `description` | `string` | Multi-line description (3-line CSS clamp). |
| `footer` | `string \| HTMLElement` | Optional footer row. |

Content can also be an `HTMLElement` (appended as-is) or a `string` (placed via `textContent` — never `innerHTML`). Both escape-hatch paths replace the declarative body entirely.

### HoverCardHandle

| Method | Description |
|--------|-------------|
| `show(anchor, content)` | Open (after `openDelay`) or update in-place. |
| `hide()` | Close (after `closeDelay`). |
| `update(content)` | Replace content without moving the card. |
| `reposition()` | Recompute position against current anchor. |
| `isOpen()` | Visibility query. |
| `getElement()` | Returns root `HTMLElement` (for tests). Throws if destroyed. |
| `destroy()` | Remove all listeners + DOM. |

### Dismissal Triggers

The card hides on any of:

- `hide()` / `destroy()` called explicitly.
- `Escape` keypress.
- `scroll` on any scroll ancestor of the anchor.
- `resize` on window.
- Browser's native `contextmenu` DOM event (yields to ContextMenu, native or ours).
- Custom `hovercard:yield` event on `document` (opt-in broadcast channel).
- Anchor element detached from the DOM.

### Accessibility

- Root: `role="tooltip"`, `aria-live="polite"`.
- `attachHoverCard` sets/clears `aria-describedby` on the anchor.
- `pointer-events: none` — card never captures events or participates in the tab order.
- Keyboard focus on an anchor surfaces the card with identical delay + content as pointer hover.
- `prefers-reduced-motion: reduce` disables the fade transition.

### Z-index

`1005` — above the legacy `.gc-tooltip` tier (1000), below modals (1050+), floating Toolbar popups (1060), and ContextMenu (1080).

### Performance

- One DOM node per `HoverCardHandle`. Use `attachHoverCard(anchor, fn, { shared })` to wire many anchors to a single card (critical for graphs with hundreds of nodes).
- No reflow on `mousemove`: position is computed once per `show()` / `reposition()`.
- Passive `scroll` / `resize` listeners, removed on hide.

## GraphCanvas Integration (ADR-125)

GraphCanvas adopts HoverCard automatically when both components are loaded. The default `tooltipMode` is `"builtin"`.

```javascript
createGraphCanvas({
    container: document.getElementById("graph"),
    nodes: [
        { id: "n1", label: "Users", type: "entity",
          icon: "bi-people", color: "#2563eb", status: "active",
          description: "All tenant users.",
          properties: { count: 1024 } }
    ],
    edges: [],

    tooltipMode: "builtin",            // "builtin" | "custom" | "off"

    // Only used when tooltipMode === "custom"
    renderNodeTooltip: (n) => ({ title: `Custom ${n.label}` }),
    renderEdgeTooltip: (e) => null,    // null → suppress the card for that edge
});
```

`GraphNode` and `GraphEdge` gain an optional `description?: string` field; all other fields (`label`, `color`, `icon`, `status`, `properties`, `sublabel`, `namespace`) flow into the default card.

## Examples

### Attaching to a list of rows (one shared card)

```javascript
const shared = createHoverCard({ placement: "right" });

document.querySelectorAll(".user-row").forEach((row) => {
    attachHoverCard(row,
        () => ({
            title: row.dataset.name,
            icon: "bi-person",
            properties: [{ key: "email", value: row.dataset.email }]
        }),
        { shared });
});
```

### Fully custom body (escape hatch)

```javascript
const handle = createHoverCard();
const customNode = document.createElement("div");
customNode.innerHTML = `<strong>Custom</strong> markup you control`;
handle.show(anchorEl, customNode);
```

### Large content that would otherwise overflow

```javascript
const handle = createHoverCard({
    maxHeight: "50vh",       // let it grow on tall viewports
    overflowHint: "fade"     // show a subtle fade when clipped
});
```

## Non-Goals

- **Interactive content** (links, buttons, forms). Use ContextMenu or PropertyInspector for that.
- **Scrollable content.** The card is `pointer-events: none`; scrolling would strand users. Overflow is clipped with a fade mask.
- **Touch long-press.** ContextMenu owns long-press; HoverCard no-ops on `hover: none` devices.
- **Replacing Bootstrap's text-only `title=` tooltip** — HoverCard is the card-shaped alternative when you need more than a single line.
