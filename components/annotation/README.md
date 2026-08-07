<!-- AGENT: Component documentation for Annotation — callout, arrow and highlight overlays for the dynamic canvas. -->

# Annotation

Callout, arrow and highlight overlays for the dynamic canvas. Plain inline SVG — no canvas context, no observer, no engine — so an annotation stays trivial under the canvas mount budget.

Like [StickyNote](../stickynote/README.md), Annotation was written **after** the Surface contract (ADR-141) and only against its public API, making it `surface`-conformant from its first commit rather than by retrofit.

## An annotation is not a widget

This is the distinction that shapes everything below. A [StickyNote](../stickynote/README.md) is **unbound** — it floats on the canvas, occupies space, and behaves like any other node. An annotation is **bound to what it annotates**: it overlays its target, is never treated as an obstacle by the packer, and cannot rearrange the canvas.

It also **rests as a marker**, expanding on click or a 400ms hover dwell. Twenty expanded callouts would bury exactly the content they annotate; twenty markers do not.

```javascript
// Bound: overlays the grid, displaces nothing, rests as a marker.
{ anchor: { kind: "node", nodeId: "grid-1" } }

// Unbound: packed as an ordinary node, like a sticky note.
{ anchor: { kind: "canvas" } }

// Bound to a PLACE within the grid: 40% across, 25% down. Fractions rather
// than pixels, so the mark stays on the same cell when the grid is resized.
{ anchor: { kind: "node", nodeId: "grid-1", spot: { x: 0.4, y: 0.25 } } }
```

Omitting `spot` attaches to the target's top-right corner, which is the right default for "this whole thing" and the wrong one for "this cell". Supplying the gesture that *sets* `spot` from a click is the host application's job — the canvas exposes the field, not a point-here tool.

## Features

- **Three kinds** — `callout` (a boxed card), `arrow`, `highlight` (translucent wash)
- **Collapsed by default** — a small marker; expands on click or sustained hover
- **Editable in place** — the expanded callout is a text field, not a read-only label
- **Overlays its target** when node-anchored, without displacing anything
- **Anchors to a spot**, not just a corner — a fractional `spot` marks a place within the target
- **Five-colour palette** — amber, blue, green, red, grey
- **Three anchor modes** — canvas coordinates, another node, or a data entity
- **Surface contract** — `setData` / `on` / `getState` / `setState` / `destroy`
- **Click-through** — overlays never swallow clicks meant for content beneath
- **Accessible by default** — labelled overlays announce; unlabelled decorative ones are hidden

## Assets

| Asset | Path |
|-------|------|
| CSS | `components/annotation/annotation.css` |
| JS | `components/annotation/annotation.js` |
| Manifest | `components/annotation/annotation.manifest.ts` |

No third-party dependencies.

## Quick Start

```html
<link rel="stylesheet" href="components/annotation/annotation.css">
<script src="components/annotation/annotation.js"></script>

<div id="annot-host" style="width: 200px; height: 140px;"></div>
```

```javascript
const callout = createAnnotation("annot-host", {
    kind: "callout",
    label: "Revenue spike",
    color: "amber",
    anchor: { kind: "entity", entityId: "metric:revenue" },
});
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `kind` | `"callout" \| "arrow" \| "highlight"` | `"callout"` | Overlay shape; unknown values fall back to callout |
| `label` | `string` | `""` | Callout text, and the accessible name for every kind |
| `value` | `string` | — | Alias for `label` (ADR-134 convention) |
| `color` | `"amber" \| "blue" \| "green" \| "red" \| "grey"` | `"amber"` | Palette colour |
| `anchor` | `AnnotationAnchor` | `{ kind: "canvas" }` | What it annotates. A `node` anchor makes it an overlay. |
| `expanded` | `boolean` | `false` | Start expanded instead of as a marker |
| `expandOnHover` | `boolean` | `true` | Expand on a 400ms hover dwell as well as on click |
| `editable` | `boolean` | `true` | Expanded callouts are a text field; `false` renders read-only text |
| `onChange` | `(state) => void` | — | Fires when label, kind or colour changes |
| `onToggle` | `(expanded) => void` | — | Fires when it expands or collapses |
| `onAnchorChange` | `(anchor) => void` | — | Fires when the anchor changes |

## API

| Method | Description |
|--------|-------------|
| `setData(slot, value)` | Fills the `"label"` slot. |
| `on(channel, handler)` | Subscribes to `"change"` or `"anchor"`. Returns an unsubscribe function. |
| `getState()` | Returns `{ kind, label, color }` — JSON-serialisable. |
| `setState(state)` | Restores state and re-renders. Partial input allowed. |
| `getValue()` / `setValue(label)` | Field aliases for the label. |
| `getAnchor()` / `setAnchor(anchor)` | Reads and re-attaches the anchor. |
| `isExpanded()` / `setExpanded(v)` | Reads and sets the expansion state. |
| `getElement()` | Root element, or `null` once destroyed. |
| `destroy()` | Tears down. Idempotent. |

## Channels

| Channel | Payload | Legacy option | Fires when |
|---------|---------|---------------|------------|
| `change` | `{ kind, label, color }` | `onChange` | Label, kind or colour changes |
| `toggle` | `boolean` | `onToggle` | It expands or collapses |
| `anchor` | `AnnotationAnchor` | `onAnchorChange` | `setAnchor` is called |

## Accessibility

An annotation carrying a label gets `role="img"` and an `aria-label`. An unlabelled one — a purely decorative highlight — is marked `aria-hidden`, because announcing an unnamed graphic is noise rather than information.

The root is `pointer-events: none`, so an overlay drawn across a grid never intercepts a click meant for a row.

## Why a 400ms dwell

Short enough that deliberately resting on a marker feels immediate; long enough that sweeping the pointer across a canvas of twenty annotations opens none of them. It matches the HoverCard convention (ADR-125), and click always works regardless — `expandOnHover: false` leaves click as the only route where hover is unavailable.

## Why the pin never moves, and why there is no tail

The marker is the pointer's target: expanding it used to swap it for a callout, which pulled the element out from under the cursor, fired `pointerleave`, collapsed it, and put the marker back — a self-sustaining flicker. The pin is now permanent and the card opens *beside* it.

The card also has no tail. A tail claims to point at something, and a card that opens to the right while its tail points down is claiming something false. The pin already carries every bit of anchoring meaning the tail was drawing, so the card is a plain box.

## Why a textarea rather than `contenteditable`

Editing writes through `textContent` because the field's `value` is text by construction. `contenteditable` accepts a paste as **markup** — a single paste from a rich-text source would drive a hole straight through this library's textContent-only discipline. The cost is that the label is no longer page text, so tests read `input.value`, not `getByText`.

Editing updates the label in place without repainting, so the caret survives a keystroke.

## Why not one shared SVG layer?

An earlier design pooled every annotation into a single overlay so that *n* annotations cost one element tree. That was dropped: it would have made annotations second-class citizens with their own coordinate system, unable to be mounted, virtualized, wired or restored like any other node. One small inline SVG per annotation keeps them ordinary canvas citizens at trivial cost, which matters more than the element count.

## Security

Labels are user content, set through `textContent` only. No SVG markup is ever assembled from a string.

## Related

- [DynamicCanvas](../dynamiccanvas/README.md) — the surface annotations are mounted onto
- [StickyNote](../stickynote/README.md) — editable notes
- `specs/dynamicui.prd.md` §15.2, ADR-141, ADR-142
