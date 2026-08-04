<!-- AGENT: Field-by-field reference for authoring components/<name>/<name>.manifest.ts. -->

# Capability Manifest

The semantic layer above a raw component: what it can display, what it emits, what it accepts, what it costs. Defined by **ADR-142**.

Every component folder carries `<name>.manifest.ts` exporting one `CapabilityManifest`. The build aggregates them into `dist/capability-manifest.json`.

---

## Why colocated, not central

A single registry file would be the merge-conflict hotspot for every parallel contributor. That is not speculation — this repository's own churn data shows the top-churn files are all central aggregation points (`history.jsonl` at 156 changes, `COMPONENT_REFERENCE.md` at 109, `concepts.yaml` at 106).

Distributed authorship, build-time aggregation. It also means the obligation is visible in review: a component folder without a manifest has a conspicuous gap.

---

## A complete example

```typescript
import type { CapabilityManifest } from "../../runtime/src/types";

export const DATAGRID_MANIFEST: CapabilityManifest =
{
    name: "datagrid",                       // must match the folder name
    factory: "createDataGrid",              // the window global
    factoryStyle: "options-first",          // see §3
    label: "Data Grid",
    icon: "bi-table",
    category: "data",

    affords: [
        {
            shape: "collection",
            intents: ["browse", "compare", "edit"],
            cardinality: { min: 2, max: 100_000 },
            density: { min: 2, max: 60 },
            minViewport: { w: 320, h: 200 },
        },
    ],

    emits: [
        { name: "selection", payload: "record", multi: true,
          legacyOption: "onRowSelect" },
    ],

    accepts: [
        { name: "rows", payload: "collection", required: true },
    ],

    actions: [
        { id: "export", label: "Export CSV", destructive: false, requires: [] },
    ],

    stateKeys: ["sort", "page", "pageSize", "selection"],

    weight: { js: 33_889, mountCost: "moderate", holdsResources: false },

    defaultSize: { w: 400, h: 250 },
    defaultOptions: { columns: [] },        // SHIPPED — see §6

    conformance: "surface",                 // verified, not trusted
    priority: 70,
};
```

---

## 1. `affords` — what drives resolution

Each affordance says: *for this data shape, serving these intents, at this scale, in at least this much space, I am a good choice.*

**Data shapes:** `scalar` · `record` · `collection` · `hierarchy` · `graph` · `timeseries` · `document` · `media` · `geo` · `diff`

**Intent verbs:** `browse` · `inspect` · `compare` · `monitor` · `edit` · `author` · `navigate` · `summarize` · `relate` · `schedule`

- A shape mismatch **excludes** the component entirely.
- A viewport below `minViewport` **excludes** it.
- Cardinality and density outside range **decay** the score rather than excluding — a near miss still beats a wild one.

`affords: []` is legitimate and means "mountable but never automatically resolved." Most components migrated at `display` level start here.

> **Affordances and conformance level are orthogonal.** The resolver scores `affords` regardless of level, so a `display` component can be resolved and mounted — it simply cannot be wired.

Give a component several affordances when it genuinely serves several shapes. The best-scoring one wins.

---

## 2. `emits` and `accepts` — the wiring surface

```typescript
emits:   [{ name, payload, multi, legacyOption? }]
accepts: [{ name, payload, required, setter? }]
```

The runtime type-checks every binding against both ends, so a binding from a `record` channel into a `hierarchy` slot fails validation with a message naming both manifests.

- `multi` — true when the channel can emit more than one item at a time.
- `legacyOption` — names the pre-existing constructor callback that delivers the same event. **This is what makes the additive guarantee testable**; omit it only when the channel is genuinely new.
- `setter` — a custom handle method to fill the slot, when `setData` is not the natural entry point.

---

## 3. `factoryStyle` — argument order as data

ADR-134 declares `create(containerId, options)` canonical, and **new components must use it**. But an audit found only 35 of 118 existing components do (ADR-144), so the convention is recorded rather than enforced retroactively:

| Value | Signature |
|---|---|
| `"container-first"` (default) | `create(containerId, options)` |
| `"options-first"` | `create(options, containerId)` |
| `"options-only"` | `create(options)` with the host **element** inside |

For `options-only`, name the option key holding the element:

```typescript
factoryStyle: "options-only",
containerOption: "container",
```

Declaring the wrong style produces a mount failure, which the conformance gate catches on the component's first run.

---

## 4. `stateKeys` — the restore contract

The keys `getState()` returns. Must be JSON-serialisable. This is what the canvas persists and replays when a virtualized node comes back.

A `surface` manifest with empty `stateKeys` is rejected: the canvas could not restore the component after demoting it, so the user would silently lose their place.

---

## 5. `weight` — the cost model

```typescript
weight: { js: 33_889, mountCost: "moderate", holdsResources: false }
```

- `js` — minified bytes. **Overwritten by the build**; the authored value is a placeholder.
- `mountCost` — `trivial` · `light` · `moderate` · `heavy`.
- `holdsResources` — true when the component owns a canvas context, worker, or observer. These are **demoted first** under budget pressure.

Be honest here. Understating cost does not make a component cheaper; it makes the canvas mount too many of them and degrade.

---

## 6. `defaultOptions` is SHIPPED DATA

This field is aggregated into `dist/capability-manifest.json`, published to consumers, and passed to the factory when a host supplies nothing.

**Never put test fixtures here.** A `PersonChip` whose `defaultOptions` carried `{ name: "Sample Person" }` would show that to a real user. Mount fixtures belong in `<name>.conformance.ts` under `options`.

A guard test rejects fixture vocabulary (`sample`, `fixture`, `lorem ipsum`, `example.com`, `about:blank`, …) in `defaultOptions`.

---

## 7. `priority` and ties

Used only to break a scoring tie, descending, before falling back to alphabetical name order. It is **not** a scoring factor — keeping it outside the score preserves the invariant that a candidate's reasons sum exactly to its score.

Roughly: `70` for a primary data surface, `50` default, `25–40` for a specialised or decorative component.

---

## 8. Checklist

- [ ] `name` matches the folder name exactly.
- [ ] `factory` matches the real window global.
- [ ] `factoryStyle` matches the real signature (and `containerOption` if options-only).
- [ ] `defaultOptions` are production defaults — no fixtures.
- [ ] `stateKeys` non-empty if `conformance: "surface"`.
- [ ] `legacyOption` set on every channel that has a pre-existing callback.
- [ ] Component removed from `EXEMPT` in the gate.
- [ ] `npm test` passes.

---

## Related

- [SURFACE_CONTRACT.md](SURFACE_CONTRACT.md) — the contract a manifest describes
- [DYNAMIC_UI_GUIDE.md](DYNAMIC_UI_GUIDE.md) — concepts and the host contract
- `runtime/src/types.ts` — the authoritative type
- ADR-142 (manifests), ADR-144 (factory styles)
