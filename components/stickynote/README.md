<!-- AGENT: Component documentation for StickyNote — a pinnable note for the dynamic canvas, and the first component built against the Surface contract rather than retrofitted onto it. -->

# StickyNote

A pinnable note for the dynamic canvas — the knowledge worker's margin scribble. Deliberately plain DOM: a note costs a `<textarea>` and nothing more, so fifty of them stay cheap.

StickyNote was written **after** the Surface contract (ADR-141) and only against its public API. It is `surface`-conformant from its first commit rather than by retrofit, which makes it the proof that the contract needs no private hooks.

## Features

- **Editable note** — plain text, with an optional read-only mode
- **Five-colour palette** — yellow, blue, green, pink, grey
- **Collapsible** — folds to its grip bar without unmounting
- **Three anchor modes** — canvas coordinates, another node, or a data entity
- **Surface contract** — `setData` / `on` / `getState` / `setState` / `destroy`
- **Field aliases** — `getValue` / `setValue`, so DynamicFormSwitcher can drive it (ADR-134)
- **Trivial weight** — no canvas context, observer, or worker

## Assets

| Asset | Path |
|-------|------|
| CSS | `components/stickynote/stickynote.css` |
| JS | `components/stickynote/stickynote.js` |
| Manifest | `components/stickynote/stickynote.manifest.ts` |

No third-party dependencies.

## Quick Start

```html
<link rel="stylesheet" href="components/stickynote/stickynote.css">
<script src="components/stickynote/stickynote.js"></script>

<div id="note-host" style="width: 220px; height: 180px;"></div>
```

```javascript
const note = createStickyNote("note-host", {
    text: "Ask about Q3 attribution",
    color: "yellow",
    anchor: { kind: "entity", entityId: "table:orders" },
    onChange: (text) => console.log("Note now reads:", text),
});
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `text` | `string` | `""` | Initial note text |
| `value` | `string` | — | Alias for `text` (ADR-134 convention) |
| `color` | `"yellow" \| "blue" \| "green" \| "pink" \| "grey"` | `"yellow"` | Palette colour; unknown values fall back to yellow |
| `collapsed` | `boolean` | `false` | Start folded to the grip bar |
| `readOnly` | `boolean` | `false` | Render but disallow editing |
| `anchor` | `NoteAnchor` | `{ kind: "canvas" }` | What the note is attached to |
| `ariaLabel` | `string` | `"Sticky note"` | Accessible name for the editing surface |
| `onChange` | `(text: string) => void` | — | Fires on every text change |
| `onAnchorChange` | `(anchor) => void` | — | Fires when the anchor changes |

## API

| Method | Description |
|--------|-------------|
| `setData(slot, value)` | Fills the `"text"` slot. Non-strings are coerced. |
| `on(channel, handler)` | Subscribes to `"change"` or `"anchor"`. Returns an unsubscribe function. |
| `getState()` | Returns `{ text, color, collapsed }` — JSON-serialisable. |
| `setState(state)` | Restores state. Partial input allowed. |
| `getValue()` / `setValue(text)` | Field aliases for the note text. |
| `getAnchor()` / `setAnchor(anchor)` | Reads and re-attaches the anchor. |
| `getElement()` | Root element, or `null` once destroyed. |
| `destroy()` | Tears down. Idempotent. |

## Channels

| Channel | Payload | Legacy option | Fires when |
|---------|---------|---------------|------------|
| `change` | `string` | `onChange` | Text changes, from typing or `setData` |
| `anchor` | `NoteAnchor` | `onAnchorChange` | `setAnchor` is called |

Constructor callbacks fire **first**, then channel subscribers. One throwing subscriber cannot starve the rest.

## Anchoring

```javascript
note.setAnchor({ kind: "canvas" });                            // free-floating
note.setAnchor({ kind: "node", nodeId: "grid-1" });            // moves with a node
note.setAnchor({ kind: "entity", entityId: "table:orders" });  // follows the entity
```

The `entity` mode is the interesting one: a note anchored to `table:orders` surfaces on **any** canvas in the workspace where that entity appears, travelling with the data rather than the layout. An unrecognised anchor throws a literate error rather than being silently ignored.

## Dark Mode

Note colours stay literal rather than using theme tokens, because a note's colour is data the author chose and must read the same for everyone. Text is fixed to a dark ink for contrast on every swatch; dark mode tempers the border so a wall of notes is not blinding against a dark canvas.

## Security

Note text is user content and is only ever assigned through `textarea.value`. No markup is ever assembled from a string, so a note containing `<img onerror=…>` renders as literal characters.

## Related

- [DynamicCanvas](../dynamiccanvas/README.md) — the surface notes are mounted onto
- [Annotation](../annotation/README.md) — callouts, arrows and highlights
- `specs/dynamicui.prd.md` §15.1, ADR-141, ADR-142
