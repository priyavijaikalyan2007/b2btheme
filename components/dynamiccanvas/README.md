<!-- AGENT: Component documentation for DynamicCanvas — the rendered surface of the Dynamic UI layer. -->

# DynamicCanvas

The rendered surface of the Dynamic UI layer. Mounts live components onto an infinite, pannable canvas from a `CanvasDocument`, wires them to each other, and virtualizes anything off screen.

**It renders; the runtime decides.** Placement comes from the packer, mounting from lifecycle, delivery from the wiring engine, and component identity from the allowlisted registry. DynamicCanvas owns the DOM and nothing else.

## Requires the runtime bundle

DynamicCanvas consumes the Dynamic UI runtime as a **window global**, not an import — the same external-globals pattern the library uses for Chart.js and CodeMirror (ADR-028). Load it first:

```html
<script src="runtime/runtime.js"></script>
<script src="components/dynamiccanvas/dynamiccanvas.js"></script>
```

Without it the canvas throws a literate error naming the missing script.

## Quick Start

```html
<link rel="stylesheet" href="components/dynamiccanvas/dynamiccanvas.css">
<div id="canvas-host" style="width: 100%; height: 600px;"></div>
```

```javascript
// Register the components this canvas may mount. Allowlist-only: a component
// that was never registered can never be mounted, however plausible its name.
EnterpriseRuntime.registerComponents([DATAGRID_MANIFEST, TREEVIEW_MANIFEST]);

const canvas = createDynamicCanvas("canvas-host", {
    mountCap: 24,
    weightBudget: 1_500_000,
    onPatch: (patch) => host.onPersist("canvas-1", patch),
    onExplain: (nodeId) => showResolverBreakdown(nodeId),
});

canvas.load(await host.onLoad("canvas-1"));
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mountCap` | `number` | `24` | Maximum simultaneously mounted nodes |
| `weightBudget` | `number` | `1500000` | Maximum total mounted weight, in JS bytes |
| `decayTurns` | `number` | `12` | Turns a node may go untouched before collapsing to a chip |
| `scope` | `object` | `window` | Global scope used for allowlisted factory lookup |
| `onPatch` | `(patch) => void` | — | Fires when the canvas authors a patch of its own (drag, pin, close) |
| `onExplain` | `(nodeId) => void` | — | Fires when a node's "why?" affordance is activated |

## API

| Method | Description |
|--------|-------------|
| `load(patches)` | Replaces the document by folding a patch log |
| `apply(patch)` | Applies one patch and re-renders |
| `getDocument()` | The current materialised document |
| `getSurface(nodeId)` | The live Surface for a mounted node, or `null` |
| `getMountedIds()` | Node ids currently mounted |
| `getChipIds()` | Node ids collapsed to chips by decay |
| `panBy(dx, dy)` / `setZoom(z)` / `getViewport()` | Viewport control |
| `startPlacement(spec?)` | Arms placement: the next click places a component where the user points |
| `cancelPlacement()` / `isPlacing()` | Disarms, and reports whether a placement is armed |
| `clear()` | Removes every node via a patch |
| `destroy()` | Tears down. Idempotent. |

## Click to place

An application says **what** to place. The canvas works out **where** from the pointer, records it in the document, and restores it later.

```javascript
canvas.startPlacement({
    component: "annotation",
    options: { kind: "callout", expanded: true },
    onPlaced: function (id, anchor) { console.log(id, anchor); },
});
```

The next click inside the canvas completes the gesture; Escape or `cancelPlacement()` abandons it. Placement is one-shot, not a mode that sticks. The click does not reach the component underneath — clicking a grid row to annotate it must not also select that row.

What gets recorded depends on where the click landed:

| Clicked | Anchor | Placement |
|---------|--------|-----------|
| Inside a node | `{ kind: "node", nodeId, spot, within? }` | `intent` — the anchor positions it |
| Bare canvas | `{ kind: "canvas" }` | `fixed`, at the world coordinates clicked |

`spot` is a **fraction of the target's scrollable content**, not of its visible box, so a mark placed on the thirtieth row stays on the thirtieth row after the reader scrolls and after the frame is resized. `within` names which scrolling region the fraction was measured against — index 0 is the node's own body, and a component that scrolls internally contributes further regions in DOM order.

The application never converts a screen coordinate into an anchor. It persists the emitted patch and hands it back to `load()`; everything geometric is the canvas's problem.

**What a geometric anchor does not survive: reflow.** A geometric anchor points at a *position*, not at *content*. Re-wrap a document at a different width and the same fraction covers different text. Use a content anchor for that, described below.

**`region` names the scrolling region; `within` is the deprecated index** (ADR-162). A component marks each region it creates with `data-dui-region="<component>:<region>"` and lists the names in its manifest's `regions`, so an anchor can say `region: "docviewer:content"` instead of counting. The index moved: `isScrollable()` requires an element to be overflowing when it is tested, so a styled region whose content happens to fit drops out of the list and every later index shifts, inside one session (DEBT-DUI-5).

`within` stays and still resolves by index, because host documents already contain those integers. When an anchor carries both, `region` wins; when the named region is gone, the canvas falls back to the index, then to the body, and logs once. A fresh capture records both, so a renamed region leaves the index behind as a fallback.

Seven regions in the fleet are still index-addressed, and the reason is written in `scripts/check-region-names.mjs`. Five are a `pre` inside rendered content, which the content creates — numbering those would reproduce the problem the names exist to solve.

**`{ kind: "entity", entityId, selector? }` survives reflow, and it needs a resolver from you** (ADR-161). The canvas cannot find your content by itself, so a host application implements `onResolveAnchor(anchor, nodeId)` and returns the element that holds the content now. `DynamicUIHost` requires that function. On this component the matching option is optional, because demo pages and the Layout Studio mount the canvas and are not host applications.

```js
const canvas = createDynamicCanvas("canvas-host", {
    onResolveAnchor: (anchor) =>
        document.querySelector(`[data-row-id="${anchor.entityId}"]`),
});
```

Three rules are worth knowing before you write one.

The resolver is **synchronous**. Overlay positions are refined on every scroll frame, and a promise cannot be awaited that often without either blocking the scroll or lagging the content. The canvas calls your resolver once per render, reuses the element it got for as long as that element stays in the DOM, and asks again when the element disconnects.

The canvas verifies what you return. The element must be inside a mounted frame **of this canvas**, and not inside the anchored node's own frame. Anything else is refused, because positioning a note against a rectangle it has no relationship to is worse than not placing it.

**Unresolved content orphans the note. It is never hidden and never removed.** When your resolver returns `null`, when no resolver is configured, or when the element has gone, the note gets `dyncanvas-overlay-orphaned`, a warning glyph and a visually hidden sentence saying the content cannot be found. A comment must not disappear because the data it discussed was deleted — the person who wrote it decides what happens to it. An orphan is a statement about now, not a verdict: if your resolver finds the content on a later pass, the state clears.

Two states that look similar are not the same. `dyncanvas-overlay-hidden` means the content exists and is scrolled out of view. `dyncanvas-overlay-orphaned` means the content could not be found at all. A note whose content is in a component that is merely demoted by virtualization is in neither state: it follows that component, and it is remounted with it.

One limit to plan around: an orphaned note keeps its last resolved position only while the canvas is open. After a reload nothing records where the content used to be, so the packer places it by its stored placement. Narrowing that gap means recording a region name and a `spot` as a *hint* on a content anchor, so the packer has somewhere better than the stored placement to put an orphan. That is approach C in `specs/2026-10-10-durable-anchors.prd.md`, and it is not built. Approach B, the region names themselves, shipped on 11 October 2026 (ADR-162).

Spot anchors are unchanged and still do not survive reflow. Use a content anchor for anything that reflows or virtualizes.

## Behaviour worth knowing

**Layout intent, then coordinates.** A model authors `region: "main", size: "wide"` and never a pixel. The packer resolves that deterministically — pinned nodes first, then by node id — so an identical document always produces an identical layout.

**Dragging is a commitment.** The moment a user drags a frame, that node is promoted from layout intent to `fixed` coordinates and written back into the document as a patch. The packer then treats it as an obstacle and flows around it. The canvas never overrides a position the user chose.

**Virtualization is automatic.** Nodes outside the viewport plus a margin are demoted: their state is captured, they are destroyed, and their frame is left in place. Scrolling back re-mounts them and replays any data that arrived while they were away — `setState()` restores the view, but only the wiring engine's replay cache can restore the *data*.

**Decay is recoverable.** A node left untouched for `decayTurns` collapses to a chip on the canvas edge rather than being destroyed. Clicking the chip restores it with its state intact. Pinned nodes never decay and are never evicted.

**Marks follow their content.** A spot-anchored overlay is repositioned against its target's live content box, and hidden — not destroyed — when the content it marks scrolls out of view. Scrolling repositions only that target's marks; it never re-packs or re-mounts anything.

**A failed mount is legible.** If a component's factory throws, the frame renders a literate error naming the component and the likely cause, rather than sitting empty.

## Security

Components are resolved **allowlist-only** through the registry (ADR-143). The global scope is never scanned for a plausibly-named factory. Every label — component names, error text — is assigned via `textContent`; no markup is assembled from a string.

## Not a canvas citizen

DynamicCanvas is registered `NOT_MOUNTABLE` in the fleet conformance gate: it is the host surface, not something another canvas mounts. Nesting a canvas inside a canvas is not a v1 capability.

## Related

- [StickyNote](../stickynote/README.md), [Annotation](../annotation/README.md) — canvas citizens
- `specs/dynamicui.prd.md` §9, ADR-140 through ADR-145
