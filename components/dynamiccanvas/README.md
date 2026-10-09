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

**What this does not survive: reflow.** A geometric anchor points at a *position*, not at *content*. Re-wrap a document at a different width and the same fraction covers different text (DEBT-DUI-1). The same is true along the other axis: `within` names the **Nth** scrolling region, and the count changes whenever a region stops overflowing, so the index can move within a single session (DEBT-DUI-5).

**`{ kind: "entity", entityId }` is NOT yet the answer, whatever this paragraph used to say.** It is validated and then ignored: `dynamiccanvas.ts` contains no reference to `"entity"`, `anchorTarget()` returns `null` for it, and the overlay is packed as though it were unanchored. It renders, it reports nothing, and it is attached to nothing — so a caller cannot tell it apart from no anchor at all. **Do not use it expecting content anchoring.** Making it real is designed in `specs/2026-10-10-durable-anchors.prd.md` and not yet built.

Until then, spot anchors are the only working kind, and they are reliable exactly as far as §"Behaviour worth knowing" describes: through scrolling and resizing, not through reflow.

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
