<!--
SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
SPDX-FileCopyrightText: 2026 Outcrop Inc
SPDX-License-Identifier: MIT
Repository: enterprise-bootstrap-theme
File GUID: 7d41c8b2-05ea-4f36-9b17-2c6de8a41f09
Created: 2026
-->

<!-- AGENT: Design for durable canvas anchors. Addresses DEBT-DUI-1 and DEBT-DUI-5 together. AWAITING APPROVAL — nothing here is built. -->

# Durable anchors — identify the content, not the coordinate

**Status:** DESIGN, awaiting approval. No code written.
**Addresses:** DEBT-DUI-1, DEBT-DUI-5
**Touches:** `runtime/src/types.ts`, `components/dynamiccanvas/dynamiccanvas.ts`,
`components/annotation/`, the capability manifest, the fleet conformance gate

---

## 1. The two entries are one defect

They were filed separately and read as unrelated. They are the same bug seen
from two sides. `Anchor` has a `node` variant with two locator fields, and
**neither identifies content**:

| Field | What it names | Dies when |
|---|---|---|
| `spot` | a fraction of the content box | the content **reflows** — same fraction, different text (DEBT-DUI-1) |
| `within` | the **Nth** scrolling region, DOM order | the set of scrolling regions changes (DEBT-DUI-5) |

A mark says *where it was*, and then the thing it was marking moves. Any fix
that addresses one and not the other leaves the anchor durable along one axis
and fragile along the other, which is worse than the present state because it
reads as solved.

## 2. What the measurements say

Taken 2026-10-09 while re-measuring the parked entries, and they are the
reason this is a defect rather than a theoretical weakness.

**`within` is not "stable for a given component version", as DEBT-DUI-5
claimed.** `isScrollable()` in `dynamiccanvas.ts` requires an element to be
**currently overflowing** as well as to carry a scrolling overflow style:

```ts
if (el.scrollHeight <= el.clientHeight
    && el.scrollWidth <= el.clientWidth) { return false; }
```

So a styled region whose content happens to fit is **absent from the list**,
and every later index shifts up. The index therefore moves when *content*
changes — same component, same version, same session. A mark recorded against
region 2 silently re-anchors to a different region the moment an earlier
sibling's content shrinks below its box.

**The "one region per component in practice" premise is false.** 21 components
style more than one scrolling region: `ribbonbuilder` (5), then `tabbedpanel`,
`ribbon`, `prompttemplatemanager`, `markdowneditor`, `docviewer` and
`applauncher` at 3 each.

## 3. The prescribed remedy does not exist

This is the finding that reshapes the design, and it should be read before
anything below.

DEBT-DUI-1 says the fix is content anchoring "surfaced through the existing
`{ kind: "entity" }` anchor". `components/dynamiccanvas/README.md` goes
further and tells consumers so:

> Anchoring to content — a text quote, a row id — is what
> `{ kind: "entity", entityId }` is for, and it is the right anchor for
> anything that reflows or virtualizes.

**`dynamiccanvas.ts` contains no reference to `"entity"`.** The string does not
appear in the file. What actually happens to an entity-anchored node:

1. `runtime/src/document.ts` validates `entityId` is an identifier. It passes.
2. `anchorTarget()` returns `null`, because it tests `kind === "node"`.
3. No spot refinement runs. The overlay is packed as if unanchored.

It renders, it reports no error, and it is attached to nothing. A caller
cannot distinguish "anchored to entity X" from "not anchored" — which is the
shape ADR-148 exists to prevent, reached through documentation rather than
through a fabricated return value. **The README is the most dangerous part:
it recommends the broken path as the cure for the known one.**

Three separate anchor unions also exist — the runtime's, `annotation.ts`'s,
and `diagramengine.ts`'s — and `annotation.setAnchor()` accepts an entity
anchor and stores it. Only `diagramengine` resolves `entityId`, against its
own object model, by its own code.

## 4. What a durable anchor has to do

1. **Survive reflow.** Re-wrap at a different width; the mark stays on the
   same content.
2. **Survive a region count change.** A sibling region stops overflowing; the
   mark stays in its own region.
3. **Degrade honestly.** When the content is gone, say so. Never silently
   re-anchor to whatever now occupies the coordinate — that is the current
   behaviour and it is the one genuinely unsafe outcome.
4. **Not require every component to participate before any of it works.**
   16 components are still `EXEMPT` from the conformance gate; a design that
   needs fleet-wide adoption to deliver anything ships to nobody.

## 5. Three approaches

### A — Content selectors, host-resolved *(recommended)*

Replace the opaque `entityId` with a resolvable descriptor, and make the host
resolve it, because only the host knows what its content *is*:

```ts
| {
    readonly kind: "entity";
    readonly entityId: string;
    /** Opaque to the runtime; passed to the host's resolver verbatim. */
    readonly selector?: Readonly<Record<string, unknown>>;
  }
```

with a resolver on the canvas options, mirroring the existing `onFetch`
provenance pattern:

```ts
onResolveAnchor?: (a: EntityAnchor) => HTMLElement | null;
```

**Recommended because** it matches how this canvas already handles everything
it cannot know — `DataSource.query` is "opaque to the runtime; meaningful to
the host's onFetch". Content identity is the same kind of fact. It also
completes a promise the README has already made, rather than inventing a
fourth anchor concept.

**Degradation is explicit:** resolver returns `null` → the mark is marked
unresolved and hidden, exactly as off-screen marks are hidden today. It is
never re-placed by coordinate.

**Cost:** hosts that want content anchoring must write a resolver. Hosts that
do not are unaffected.

### B — Component-owned region descriptors

DEBT-DUI-5's own prescription. Each scrolling region declares a stable name it
owns, and `within` becomes that name:

```html
<div class="docviewer-body" data-dui-region="body">
```

`within?: number` becomes `within?: string`, resolved by query rather than by
index. The manifest declares each component's region names, and the
conformance gate asserts that every scrollable region has one.

**Fixes DUI-5 completely and DUI-1 not at all** — a named region still holds
a geometric fraction inside it.

**Cost:** touches all 21 multi-region components and the gate.

### C — Both, B underneath A

A names the content; B names the region the content lives in. A full anchor
becomes "region `body`, entity `row-4823`", and the geometric `spot` degrades
from the locator to a *hint* used only to break ties and to place a mark
before the resolver has answered.

**This is the end state.** It is also two pieces of work, and A alone is
useful without B while B alone is not useful without A.

## 6. Recommendation

**Build A first, design B alongside it, ship B per-component afterwards.**

A is self-contained, needs no component changes, and makes the README true.
B is fleet work gated on the conformance suite and can land component by
component without blocking anything.

## 7. The constraint most likely to be forgotten

**`within` is a persisted integer.** Any host that has saved a canvas has
integers in its documents. Changing the field's type is a breaking change to
the document format, so:

- `within?: number` **stays**, deprecated, and keeps resolving by index.
- `region?: string` is added alongside it.
- When both are present, `region` wins.
- An integer-only anchor keeps today's behaviour exactly, including its
  fragility. It does not silently become something else.

The repository carries no persisted fixtures with `within` — it appears only
in `document.test.ts` and in the live code path — so the migration surface is
entirely host-side and we cannot see it. **That is the argument for additive
change rather than a version bump:** we do not know who would break.

## 8. Fleet implication, stated and not solved

Approach B needs the conformance gate to assert that every scrollable region
declares a descriptor, or adoption is zero. That assertion will not pass for
the 16 `EXEMPT` components, and raising those is DEBT-DUI-4 — separate work,
deliberately not folded in here.

## 9. Open questions for review

1. **Is `onResolveAnchor` the right seam**, or should the host hand the canvas
   a resolver per *node* rather than one per canvas? One per canvas matches
   `onFetch`; one per node matches the fact that different mounted components
   identify content differently.
2. **Should an unresolved anchor hide the mark or show it as orphaned?**
   Hiding matches the current off-screen behaviour. Showing it — greyed, with
   its last known position — tells the user something was lost rather than
   quietly dropping their annotation. §4.3 argues for honesty; this is the
   point where honesty and tidiness disagree.
3. **Does the apps team need this**, and on what timescale? It is the only
   consumer, it is currently occupied with the TenantSwitcher migration, and
   nothing here should start before that is known.

## 10. Before any of this is built

**Correct `components/dynamiccanvas/README.md` now, independently of this
design.** It currently recommends an anchor kind that silently does nothing.
That is a one-paragraph fix and should not wait for approval of the rest.
