<!-- AGENT: Component documentation for Annotation — callout, arrow and highlight overlays for the dynamic canvas. -->

# Annotation

Callout, arrow and highlight overlays for the dynamic canvas. Plain inline SVG — no canvas context, no observer, no engine — so an annotation stays trivial under the canvas mount budget.

Like [StickyNote](../stickynote/README.md), Annotation was written **after** the Surface contract (ADR-141) and only against its public API, making it `surface`-conformant from its first commit rather than by retrofit.

## Features

- **Three kinds** — `callout` (boxed text with a tail), `arrow`, `highlight` (translucent wash)
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
| `anchor` | `AnnotationAnchor` | `{ kind: "canvas" }` | What the annotation is attached to |
| `onChange` | `(state) => void` | — | Fires when label, kind or colour changes |
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
| `getElement()` | Root element, or `null` once destroyed. |
| `destroy()` | Tears down. Idempotent. |

## Channels

| Channel | Payload | Legacy option | Fires when |
|---------|---------|---------------|------------|
| `change` | `{ kind, label, color }` | `onChange` | Label, kind or colour changes |
| `anchor` | `AnnotationAnchor` | `onAnchorChange` | `setAnchor` is called |

## Accessibility

An annotation carrying a label gets `role="img"` and an `aria-label`. An unlabelled one — a purely decorative highlight — is marked `aria-hidden`, because announcing an unnamed graphic is noise rather than information.

The root is `pointer-events: none`, so an overlay drawn across a grid never intercepts a click meant for a row.

## Why not one shared SVG layer?

An earlier design pooled every annotation into a single overlay so that *n* annotations cost one element tree. That was dropped: it would have made annotations second-class citizens with their own coordinate system, unable to be mounted, virtualized, wired or restored like any other node. One small inline SVG per annotation keeps them ordinary canvas citizens at trivial cost, which matters more than the element count.

## Security

Labels are user content, set through `textContent` only. No SVG markup is ever assembled from a string.

## Related

- [DynamicCanvas](../dynamiccanvas/README.md) — the surface annotations are mounted onto
- [StickyNote](../stickynote/README.md) — editable notes
- `specs/dynamicui.prd.md` §15.2, ADR-141, ADR-142
