<!-- AGENT: Implementation plan and progress tracker for the Dynamic UI layer. Update the status column as phases complete. -->

# Dynamic UI — Implementation Plan

**PRD:** `./specs/dynamicui.prd.md`
**Raw brainstorm:** `./specs/dynamicui.raw.md`
**Started:** 2026-08-03

---

## Principles

1. **TDD throughout.** Tests before implementation, per the V-V-P-T-I-R-V-C loop in `AGENTS.md`.
2. **Headless first.** `runtime/` is built and fully tested before any rendering surface exists.
3. **Additive only.** No existing public API is renamed, removed, or re-signatured. Verified by the legacy-surface assertion in the conformance suite.
4. **The gate is a test, not a doc.** The structural test enforces manifests; prose documents it.
5. **Contract proven by dogfooding.** StickyNote and Annotation are built last, using only public API.

---

## Phase Plan

| Phase | Scope | Status |
|---|---|---|
| **0** | Foundations — shared types: manifest schema, Surface contract, data shapes, intent verbs | Complete |
| **1** | `runtime/document` — CanvasDocument schema, validator, patch fold, branching | Complete |
| **2** | `runtime/wiring` — binding graph, propagation, cycle detection, cardinality policies, transforms | Complete |
| **3** | `runtime/resolver` — scoring, explainability, host overrides | Complete |
| **4** | `runtime/registry` — allowlist resolution, manifest validation | Complete |
| **5** | `runtime/lifecycle` — mount/unmount, weight budget, demotion, decay | Complete |
| **6** | Conformance suite + structural gate, with a shrinking exemption list | Complete |
| **7** | Pilot — three components end to end, proving the retrofit shape | Complete |
| **8** | Manifest authoring — remaining folders, at `display` conformance | Complete (94 of 110) |
| **9** | Surface retrofit burn-down, promoting each manifest to `surface` | Tier started (2 of 94) |
| **10** | Runtime bundle + build wiring (registry extraction deferred) | Complete |
| **11** | `components/dynamiccanvas` — packer, viewport, chrome, virtualization | Complete |
| **12** | `components/workspaceshell` + `components/chatdock` | Complete |
| **13** | `components/stickynote` + `components/annotation` (public API only) | Complete |
| **14** | Demo — scripted host, `demo/dynamic-ui.html`, inspector, resolver explorer | Complete |
| **15** | Documentation — guide, contract, manifest, migration; generated README tables | Complete (generated tables deferred) |
| **16** | Governance — AGENTS.md, SECURITY_GUIDELINES.md, PERFORMANCE.md, TESTING.md, ADRs | Complete |

### Phase ordering constraint (CRITICAL)

The structural gate and the manifests are mutually circular if sequenced naively:
the gate fails any component lacking a manifest, and the registry validator rejects a
`surface` manifest whose `stateKeys` are empty — which is every component before its
retrofit. Landing the gate before the manifests would red `npm test` and keep it red
for the whole campaign.

The order above breaks the circle:

1. **Gate lands first but exempts everything.** The suite ships with an explicit
   exemption list seeded with every un-migrated component. Exemptions are **logged
   on every run**, never silent, so the remaining work is always visible.
2. **Manifests are authored at `display`**, which passes the validator today.
3. **Retrofit happens per component**, removing it from the exemption list.
4. **The manifest is promoted to `surface`** only once its suite passes.

The exemption list shrinking to empty is the completion condition for Phase 9.

---

## Phase Detail

### Phase 0 — Foundations

`runtime/types/` — the vocabulary every other phase imports.

- `DataShape`, `IntentVerb` unions
- `CapabilityManifest`, `Affordance`, `ChannelSpec`, `SlotSpec`, `ActionSpec`, `WeightSpec`
- `Surface`, `Unsubscribe`, conformance levels
- `CanvasDocument`, `CanvasNode`, `Binding`, `Placement`, `Anchor`, `DataSource`
- `CanvasPatch`, `PatchOp`
- `DynamicUIHost` adapter interface

No behaviour. Types plus a small number of runtime constants (verb list, shape list) that the validator needs.

### Phase 1 — Document

- Schema validation with literate errors naming the offending path
- Patch fold: `fold(patches) -> CanvasDocument`, deterministic
- `foldTo(patches, revision)` for history scrubbing
- `branch(patches, revision)` for forking
- Rejection of malformed input without partial application

### Phase 2 — Wiring

- Binding graph construction from a document
- Topological propagation with per-tick visited tracking
- Cycle detection at validation time (reject) and defensively at runtime
- Cardinality policies: `replace`, `fanout` (capped), `merge`
- Named transform registry; unregistered transform fails validation
- Microtask batching

### Phase 3 — Resolver

- Scoring per §7.2 with weights in one exported constant
- Hard exclusions: shape mismatch, viewport below minimum
- Deterministic tie-break: priority, then name
- `ResolveResult` always carries full ranked candidates with per-factor reasons
- Host overrides via `registerPresentationPreference`
- Golden corpus fixtures

### Phase 4 — Registry

- Allowlist-only factory resolution; explicit test that `window` is never scanned
- Manifest registration, lookup, and validation
- Literate error for unknown components

### Phase 5 — Lifecycle

- Mount/unmount against the allowlisted registry
- Weight budget with LRU-by-`lastTouched` eviction
- Demotion: capture `getState()`, `destroy()`, placeholder; re-mount with `setState()`
- `holdsResources` demoted first; pinned never evicted
- Decay to chip after N untouched turns

### Phase 6 — Conformance Suite and Structural Gate

The primary gate. Generic, generated from manifests, run over every registered component,
with assertions per PRD §16.1 — including the legacy-surface regression net that makes the
additive guarantee verifiable rather than merely asserted.

Ships with an exemption list seeded with every un-migrated component, **logged on every
run** so the outstanding work is always visible. See the ordering constraint above.

### Phase 7 — Pilot

Three components taken end to end — manifest, retrofit, suite passing, promotion — before
touching the rest. Chosen to cover every conformance level plus the one interesting edge:

| Component | Level | Why this one |
|---|---|---|
| DataGrid | `surface` | Data-bearing, real `stateKeys`, the canonical canvas citizen |
| DatePicker | `field` | `setData("value")` delegating to ADR-134's existing `setValue` |
| MarkdownRenderer | `display` | Has no `destroy()` today — exercises the missing-lifecycle path |

If the suite catches real failures on these three and the retrofit shape is identical
across them, the campaign parallelises. If not, that is learned after three components
rather than after forty.

### Phase 8 — Manifest Authoring

Remaining component folders gain `<name>.manifest.ts` at `display` conformance. Seeded from
the 105 existing embed-registry entries, which already carry factory, label, icon, category,
`defaultSize`, and `defaultOptions`; the semantic fields — `affords`, `emits`, `accepts`,
`actions`, `stateKeys` — are authored per component.

### Phase 9 — Surface Retrofit

Burn-down against the conformance suite, promoting each manifest to `surface` as it passes.
Uneven by difficulty:

- `destroy()` — 113/118 already present; harden for idempotency; add to the five missing
  where meaningful (ConfirmDialog, Toast, MarkdownRenderer, TypeBadge, ThemeInit)
- `on()` — mechanical and identical per component: internal emitter, with the constructor
  callback becoming subscriber zero so firing order is preserved
- `setData()` — ~30 data-bearing components; the 33-strong field fleet delegates to `setValue`
- `getState()`/`setState()` — bounded by declared `stateKeys`

Only **DiagramEngine** needs its `on()` widened from `void` to `Unsubscribe` (keeping `off()`,
routed through one shared removal path). SmartTextInput is already canonical. GraphMinimap
needs no change — see PRD §17.1.

Completion condition: the exemption list is empty.

### Phases 10–16

Per the PRD sections referenced in the phase table above.

---

## Checkpoint Notes

_Appended as phases complete. Each entry records what landed, the verified test count, and any decision worth carrying forward._

### 2026-08-03 — Phases 0–4

Headless runtime core: `types`, `constants`, `errors`, `document`, `wiring`, `resolver`, `registry`.
**Verified:** 131 runtime tests passing; full suite 4291 tests across 129 files, no regressions.
Only existing file touched is `vitest.config.ts` (added `runtime/**` to include and coverage globs).

Decisions worth carrying forward:

- **Tests import `runtime/src/*` directly** rather than a concatenated bundle, unlike the DiagramEngine
  precedent. Vitest resolves ES modules natively, so this gives a fast red/green loop. The bundle
  becomes a build artefact with its own freshness check in Phase 9, rather than the thing under test.
- **Validation collects every issue** instead of stopping at the first, and each names a JSON path.
  Cycle detection only runs once structural validation is clean, so a malformed document does not
  produce a confusing cycle report on top of its real errors.
- **`removeNode` keeps the document valid by construction** — it drops bindings referencing the node
  and re-anchors nodes anchored to it, so an author cannot leave dangling references behind.
- **Resolver reasons are accumulated during scoring, never reconstructed.** A test asserts the reasons
  sum to the reported score, which makes explanation drift a build failure rather than a UX bug.
- **Priority and name are tie-breaks outside the score**, not scoring factors. This keeps the
  reasons-sum-to-score invariant true while still making ties deterministic.
- **`lookupFactory` reads exactly one property** off the supplied scope. Tests assert that a global
  named plausibly but unregistered is never reachable, and that near-miss names are not searched.

### 2026-08-03 — Review hardening

Four defects found and fixed by review before Phase 5 started. Recorded because each
was invisible to the passing tests:

- **A literal NUL byte was embedded in `wiring.ts`** as the composite-key separator.
  It worked at runtime but made the file opaque to `grep` — every search silently
  returned nothing, which is how it was found. Replaced with the `\u0000` escape so
  the source stays plain ASCII, and the validator now rejects control characters in
  identifiers, which is the invariant the separator was relying on all along.
- **Key parsing removed entirely.** `subscribe()` split the composite key to recover
  the node and channel. Subscription now carries its endpoint explicitly, so no
  separator choice can ever be load-bearing.
- **Demote-while-updating would have shown stale data.** A bound source emitting while
  its target was demoted had its write dropped, and `setState()` restores view state,
  not bound data — so promotion would show whatever the node held when it left. The
  wiring engine now caches the last value per (node, slot) and exposes `replay()`.
- **Phase order was circular.** The structural gate would have failed every component
  lacking a manifest while the validator rejected `surface` manifests with empty
  `stateKeys` — i.e. every component before its retrofit. `npm test` would have gone
  red and stayed red for the whole campaign. Order corrected; see the constraint above.

Also corrected a factual error in the PRD: GraphMinimap does **not** need the `on()`
widening. Its `on()` at line 92 is a declaration inside `GraphCanvasHandle` describing
a dependency it consumes, not its own handle method — and GraphCanvas exposes no `on()`
at all. Only DiagramEngine changes.

**Verified:** 142 runtime tests; `tsc --noEmit --strict` over all seven runtime modules
exits clean. ADR-140 through ADR-143 landed while the work is in flight, since they are
what stop a future component from being built non-canvas-capable.

---

### 2026-08-03 — Phase 5, headless runtime complete

`lifecycle` landed: mount planning, weight budget, demotion with lossless state capture,
and decay to chips. **Verified:** 169 runtime tests; `tsc --strict` clean over all eight
runtime source files.

Decisions worth carrying forward:

- **Lifecycle is where validation-before-mount is enforced.** `fold()` is deliberately
  total and never validates, so a corrupted patch log from `onLoad` folds into a
  plausible-looking document. `sync()` validates the document *and* resolves every
  component against the registry allowlist before touching a single mount, so a
  rejected document leaves the canvas exactly as it was.
- **Promotion is a three-part restore**, and missing any part shows the user stale data:
  `setState()` for view state, `onPromoted()` so wiring can `replay()` bound data, and
  the chip's retained state so decay is recoverable. View state alone is not enough.
- **Mount ordering is fully deterministic** — pinned, then resource-light before
  resource-holding, then most-recently-touched, then id. The final id tie-break exists
  so an identical document always produces an identical mount plan, which is what makes
  the budget testable.
- **`getState()` is called defensively.** One component throwing during capture must not
  block the rest of the canvas from reconciling.

---

### 2026-08-03 — Phase 6, conformance gate

`conformance` (the checker) and `fleet-conformance.test.ts` (the gate) landed.
**Verified:** 203 runtime tests; 118 component directories discovered; gate green with the
full fleet exempt.

Decisions worth carrying forward:

- **The checker's own tests are adversarial.** For every assertion it makes there is a test
  proving it FAILS a component that breaks that assertion. A gate that cannot fail is not a
  gate, and two checks were toothless until those tests existed (below).
- **The failure path was verified end to end**, not assumed: removing one component from the
  exemption list made the gate fail with a literate message naming the component and the
  remedy, and restoring it went green again.
- **`state-serialisable` was initially unfalsifiable.** It compared `JSON.stringify` output
  before and after a round trip — but both sides discard functions identically, so the
  comparison always agreed. Replaced with a structural walk that reports the offending path.
- **The gate must load modules lazily.** An eager `import.meta.glob` over `components/*/*.ts`
  also matched every sibling `.test.ts` and executed it, re-running the entire suite inside
  the gate. Lazy loaders touch only what is checked.
- **Untriggered channels are warnings, not silent passes.** Verifying that a channel reaches
  `on()` needs component-specific glue to cause an emission. Where that glue is absent the
  finding is recorded as a warning rather than skipped, so coverage gaps stay visible.
- **`legacyOption` on `ChannelSpec`** is what makes the additive guarantee testable: it names
  the pre-existing constructor callback, so the suite can assert it still fires.

---

### 2026-08-03 — Phase 7, pilot

Three components taken end to end. **Verified:** 4370 tests across 132 files, no regressions —
DataGrid's existing suite passes unchanged, which is the additive guarantee holding empirically
rather than by assertion.

| Component | Level | Code change needed |
|---|---|---|
| DataGrid | `surface` | Full retrofit — `on`/`setData`/`getState`/`setState` |
| DatePicker | `field` | **None** — already ADR-134 conformant |
| EmptyState | `display` | **None** — canonical factory, idempotent destroy |

The pilot paid for itself four times over:

- **MarkdownRenderer is not a component.** It was the planned `display` case; it turned out to be
  a stateless service — `createMarkdownRenderer(opts)` returns `{render, toHtml}` with no host, no
  DOM ownership, no lifecycle. That revealed a whole missing category. `NOT_MOUNTABLE` now records
  permanent, rationale-bearing exclusions (services, element builders, boot scripts, modal
  surfaces), distinct from `EXEMPT` which means "migration pending". A test asserts every exclusion
  carries a rationale and that the two lists are disjoint, so it cannot become a dumping ground.
  EmptyState replaced it as the `display` pilot.
- **The checker broke on every class-based component.** It extracted handle methods and called them
  detached, losing `this`. Closure-based fakes in the meta-tests never caught it; both real pilot
  components failed instantly. Fixed with a `this`-preserving `call()`, plus a class-based fake
  added to the meta-tests as a permanent regression net.
- **Mount failures were undiagnosable.** "Factory threw or returned no handle" with the error
  swallowed. Now reports the message and three stack frames — which is how the next bug was found
  in one run instead of by bisection.
- **A manifest can lie, and the suite catches it.** DataGrid declared it accepts a `collection`,
  but its `setRows` required the internal `{ id, data }` envelope. Rather than weaken the claim,
  `setData` now normalises plain records into that envelope — the adapter layer earning its keep.

Two smaller decisions:

- **Manifests are excluded from the component build.** They import types from `runtime/src`, which
  is outside the component build's `rootDir`. They are build-time metadata, not shipped code, so
  `tsconfig.json` excludes them and `tsconfig.runtime.json` type-checks them instead.
- **Glue may decline a channel.** `trigger` returning `false` records a visible warning rather than
  a false pass — DataGrid's `activate` fires only from a row double-click and has no programmatic
  entry point.

---

### 2026-08-03 — Phase 8, fleet manifests

93 of 110 in-scope components now carry `display`-level manifests and pass the gate.
8 are permanently excluded; 17 remain exempt, each with its blocker recorded inline in
`EXEMPT` so the next session knows exactly what each needs.
**Verified:** 4460 tests across 132 files; both typecheck configs clean.

The headline finding, which changes ADR-134's standing:

- **ADR-134's canonical factory signature is a minority in practice.** An audit of all 118
  components found only **35** use `create(containerId, options)`. **72** take
  `(options, containerId)`, and of those, **45** actually take a single `(options)` with the
  host element inside it. Changing that many public signatures would break the additive
  guarantee outright, so the convention is now recorded as DATA — `factoryStyle` plus
  `containerOption` on the manifest — and the runtime honours all three. This is worth an ADR
  of its own and a correction to ADR-134's stated convention for new components.

Also:

- **Generation got 78 of 100 components passing on the first run**, then 102 after
  `options-only` was added and required options were supplied. The remaining failures were
  all genuinely per-component, which is the evidence that the campaign is mechanical.
- **A real defect surfaced in SplitLayout**: `destroy()` throws reading `persistKey` when
  called before full initialisation. Recorded in `EXEMPT` rather than papered over.
- **`display` level is deliberately shallow.** These manifests declare no affordances,
  channels, or slots — they assert only that the canvas can mount and tear the component
  down. They do not yet participate in resolution. Phase 9 promotes them.

---

### 2026-08-03 — Fixture leak, SplitLayout defect, governance

Three follow-ups after review, before starting the surface tier.

- **Test fixtures had leaked into shipped data.** The Phase 8 generator wrote mount fixtures
  into `defaultOptions` — but that field is aggregated into `dist/capability-manifest.json`
  and published, and it is what the canvas passes when a host supplies nothing. A PersonChip
  mounted with no options would have rendered "Sample Person" to a real user. Five manifests
  were affected (chartpanel, datagrid, docviewer, personchip, stepper). Fixtures moved to
  `<name>.conformance.ts` under `options`, and a guard test now rejects fixture vocabulary in
  `defaultOptions` so it cannot recur.
- **SplitLayout's defect is fixed, not just recorded.** Its constructor early-returned on
  fewer than two panes while still handing back a live object, leaving `this.options`
  undefined so `hide()`/`destroy()` threw during teardown. Assigning before the guard turns a
  crash-on-teardown into a logged warning at construction. SplitLayout is now migrated,
  bringing the count to 94.
- **Governance no longer contradicts the gate.** AGENTS.md gains a `(CRITICAL)` Surface
  contract section: the three levels, the manifest rules, the corrected factory-signature
  guidance, the additive `emitChannel` pattern, and a new-component checklist. ADR-144 records
  the factory-order audit and why the convention became data rather than a migration.

**Verified:** 4555 tests across 132 files; both typecheck configs clean.

---

### 2026-08-03 — Surface tier and packer

Sequencing change, on review: promote a small tier to `surface` with real affordances
*before* building the canvas, rather than retrofitting all 94 first. Two reasons —
`stateKeys` cannot be specified correctly until a real demote/promote cycle has exercised
it, and the canvas needs something to resolve, since all 92 generated manifests declare
`affords: []`. **This is sequencing, not scope reduction**: "retrofit all" still stands.

- **TreeView promoted to `surface`** — the second full retrofit, and the shape was identical
  to DataGrid's: channel map, `emitChannel` with the legacy callback as subscriber zero,
  `setData`/`getState`/`setState`. That repetition across two very different components is
  the evidence the campaign parallelises.
- **Affordances added to 12 components** at their existing level. Key realisation:
  **affordances and conformance level are orthogonal**. The resolver scores `affords`
  regardless of level, so a `display` component can be resolved and mounted — it just cannot
  be wired. That makes a working canvas demo reachable without retrofitting everything first.
- **Packer landed** (`runtime/src/packer.ts`, 15 tests): layout intent resolved to
  coordinates, deterministically. Pinned first then by node id, so an identical document
  always yields an identical layout — which is what makes placement assertable. Hand-placed
  `fixed` nodes are honoured exactly and act as obstacles the packer flows around, never
  overridden.

**Verified:** 4570 tests across 133 files; both typecheck configs clean.

---

### 2026-08-03 — Phases 10-11, runtime bundle and canvas

Phase 10 turned out to gate phase 11, not just the demo. DynamicCanvas is shipped component
code, so it cannot import across the components `rootDir` — it consumes the runtime as
`window.EnterpriseRuntime`, the same external-globals pattern already used for Chart.js and
CodeMirror (ADR-028). Structural types are declared locally in the component for the same
reason the library cannot share types across components today.

**Verified:** 4608 tests across 134 files; both typecheck configs clean; the generated
bundle typechecks standalone under `strict`.

Concatenation surfaced three problems, each fixed at the source rather than worked around:

- **A sed line-range swallowed declarations.** `/^import /,/^} from ".*";$/d` spans from an
  import to a *later* closing brace, taking any declaration between two import blocks with
  it. Replaced with `scripts/strip-module-syntax.py`.
- **`resolver.ts` declared a top-level `const history`**, which shadows `window.history` once
  everything shares one scope. Renamed `userChoices`.
- **`document.ts` and `registry.ts` each defined `isObject`/`isName`/`isNumber`** — duplicate
  declarations in one scope, and genuine copy-paste duplication in the source. Extracted to
  `predicates.ts`, which also made the two different `isName` semantics explicit
  (identifier-strength vs merely non-empty).

`runtime/bundle.test.ts` (38 tests) now tests the *artefact* rather than the modules: no
leftover module syntax, no duplicate top-level function, no top-level binding shadowing a DOM
global, every advertised name actually declared, and the bundle not stale relative to the
bundler's file list. Those are failure modes the module suites structurally cannot see.

`wrap-iife.sh` and `minify-js.sh` now cover `dist/runtime` as well — without the wrapper every
internal helper in an 11-module bundle becomes a page-level global.

**DynamicCanvas** renders what the runtime decides: packs via the packer, mounts via
lifecycle, delivers via the wiring engine, resolves identity allowlist-only. Dragging a frame
promotes it from layout intent to fixed coordinates, so the packer flows around it and never
overrides the user. Decayed nodes render as restorable chips; a failed mount renders a
literate error in place rather than an empty frame. It is `NOT_MOUNTABLE` — the canvas host,
not a canvas citizen.

---

### 2026-08-03 — Phase 13, the contract proves itself

StickyNote and Annotation built last and **only against the public Surface contract**, as
planned. Both are `surface`-conformant from their first commit rather than by retrofit.

**Verified:** 4666 tests across 136 files. StickyNote 29 tests, Annotation 25 — the latter
passed on the first run.

The result is the answer to the question the phase existed to ask: **the contract needed no
private hooks.** Neither component required a change to the runtime, the conformance checker,
or the manifest schema. `setData` / `on` / `getState` / `setState` / `destroy` plus the
`emitChannel` legacy-first pattern was sufficient to write a new canvas citizen from scratch.

Both exercise all three anchor modes, which nothing else did. `entity` anchoring is the one
worth noting: a note anchored to `table:orders` surfaces on any canvas where that entity
appears, travelling with the data rather than the layout.

One deliberate deviation from PRD §15.2, recorded here because the PRD says otherwise: the
spec proposed pooling annotations into **one shared SVG layer** so that *n* annotations cost
one element tree. That was dropped. Pooling would have made annotations second-class citizens
with their own coordinate system, unable to be mounted, virtualized, wired or restored like
any other node. One small inline SVG per annotation keeps them ordinary canvas citizens at
`mountCost: "trivial"`, which matters more than the element count.

---

### 2026-08-03 — Phase 14, demo and end-to-end proof

`demo/dynamic-ui.html` plus `demo/dynamic-ui-host.js`, linked from the demo index.
**Verified:** 4676 tests across 137 files.

The demo host is a **lookup table, not a model** — which is the point. If the boundary in
ADR-140 is real, substituting a lookup table for the model should leave everything else
working: real resolver, real bindings, real components, real persistence. It does. An
application replaces one function, `resolveUtterance()`, with a model call and changes
nothing else. The file is therefore both the demo and the reference host implementation.

Alongside the canvas the page carries two panels that are genuine tools rather than
decoration: a live **document and patch-log inspector**, so the model is legible as it
builds up; and a **resolver explainer** wired to each node's "why?" affordance, showing the
ranked candidates with per-factor scores.

`runtime/integration.test.ts` (10 tests) is the stronger artefact. It drives the whole layer
the way the demo does — register manifests, apply a patch, mount **real** TreeView and
DataGrid instances, select a real tree node, and assert the payload arrives in the grid
through a real binding. Every unit suite stubs the pieces either side of the one under test,
so none of them can catch a seam that only fails when two real subsystems meet.

Writing the demo immediately found such a seam: the tree emits **tree nodes** while the grid
needs **that table's column rows**. Rather than reshape either component, the demo registers
a named transform (`tableColumns`) and the binding references it by name. That is the
transform registry earning its place — and a reminder that the document can only ever name a
transform, never carry an expression (ADR-143), so a scene document cannot smuggle code.

---

### 2026-08-03 — Phases 15-16, documentation and governance

**Verified:** 4676 tests across 137 files.

Documentation:

- `docs/DYNAMIC_UI_GUIDE.md` — the conceptual spine: the boundary, the three tiers, the
  document as a fold of patches, bindings and cardinality policies, resolution with
  mandatory explanation, anchoring, placement and virtualization, permissions, and the
  six-function host contract.
- `docs/DYNAMIC_UI_MIGRATION.md` — the compatibility answer. Headline: **nothing breaks and
  there is no migration to perform.** Documents the four behavioural deltas, the full `on()`
  audit, and why factory signatures were deliberately not normalised.

Governance now matches the live gate rather than contradicting it:

- `SECURITY_GUIDELINES.md` — scene documents as untrusted input, allowlist-only resolution,
  documents-carry-data-never-code, the bounded-by-construction table, and the rule that
  `grants` is a UX affordance and never a security boundary.
- `PERFORMANCE.md` — the weight budget, virtualization as default rather than optimisation,
  and the no-heavyweight-dependency-for-a-lightweight-affordance rule that StickyNote and
  Annotation exist to honour.
- `TESTING.md` — the conformance gate's three states, and three lessons worth keeping:
  write checks that can actually fail, test the artefact as well as the modules, and never
  put fixtures in shipped data.
- `agentknowledge/` — 8 new concepts, history entry appended. (Three pre-existing malformed
  lines in `history.jsonl` from February and March were left alone: the file is append-only.)
- `CHANGELOG.md` — Added / Changed / Fixed for the whole layer.

---

### 2026-08-03 — Studio obligations discharged

`AGENTS.md` requires every new component to register a Layout Studio stencil and a Component
Studio entry. I had flagged this as unmet; it is now done.

- **Three Tier A stencils** in `stencils-ui-components.ts`: DynamicCanvas (framed nodes with
  title chrome, one pinned, a binding arrow between two of them, and the decay chip rail —
  the things that distinguish a canvas from a dashboard), StickyNote (folded corner and grip
  bar so it reads as a note rather than a panel), and Annotation (callout box with a tail).
- **The hard-coded stencil counts moved**, as expected: 112 → 115 ui-component shapes, and
  two combined-pack totals. Recorded because these assertions are a known coupling point
  that catches every stencil addition.
- **Component Studio** gains StickyNote and Annotation.

**DynamicCanvas is deliberately NOT in the Component Studio.** It needs the runtime global
and a registered manifest set before it renders anything; dropped into a studio with neither,
it would be an empty box. It is exercised by `demo/dynamic-ui.html`, which supplies both.

**Verified:** 4676 tests across 137 files; both typecheck configs clean.

---

### 2026-08-04 — Phase 12, the workspace tier

`ChatDock` (25 tests) and `WorkspaceShell` (23 tests) complete the three-tier model.
Both are `surface`-conformant from their first commit, written against the public contract.
**Verified:** 4728 tests across 139 files; both typecheck configs clean.

Design decisions worth carrying forward:

- **ChatDock docks to the bottom, not the side.** A pinned side panel permanently costs a
  third of the working area to a control surface that is idle most of the time. The canvas is
  the work; chat is how you steer it.
- **Select and branch are separate controls**, in ChatDock on turns and in WorkspaceShell on
  tabs. Selecting *navigates* (rewind the canvas); branching *creates* (fork it). Folding both
  into one click would make an exploratory glance destructive. Same reasoning puts pin and
  close outside the tab body rather than inside it.
- **Both are presentation only.** Neither holds storage or model integration; every control
  emits and the host decides. That keeps the workspace tier as substitutable as the canvas.
- **`affords: []` on both.** Chrome is placed by the application, never reached for by the
  resolver to display data — but they are still `surface` because the canvas must feed,
  subscribe to, and restore them.
- **The scrubber is conditional**, rendering nothing until the host reports a real revision
  range. An inert slider is worse than no slider.
- **Naming collision documented, not resolved.** `WorkspaceSwitcher` switches *tenants*;
  `WorkspaceShell` switches *canvases within a workspace*. Genuinely different concepts that
  collided on one English word. ADR-136's rename policy makes renaming the existing component
  expensive, so both READMEs disambiguate explicitly instead.

Studio obligations discharged for both: Tier A stencils (ui-component count 115 → 117) and
Component Studio entries.

---

### 2026-08-04 — Close-out

Full `npm run build` verified end to end for the first time (the pieces had been checked
individually, the sequence had not). Exit 0.

That run surfaced a real gap: **`dist/capability-manifest.json` did not exist.** ADR-142
promises it and three docs reference it eight times over, but the aggregation step was never
written — documented behaviour with no implementation. `scripts/build-manifest.js` now
transpiles each manifest with the TypeScript compiler and imports it as a real ES module (no
string evaluation), fills `weight.js` from the **compiled bundle size** rather than the
authored placeholder, validates, and emits. 98 manifests, 65 KB. Wired into `npm run build`
after the compile steps so the sizes exist.

`CDN_CONTRACT.md` gains §2b for the Dynamic UI assets — deliberately *not* part of the
Keycloak parity surface, so they follow ordinary additive-only rules rather than the stricter
§4 protocol. It records the load-order dependency (`runtime.js` before `dynamiccanvas.js`)
and draws the line between what consumers may rely on (the `EnterpriseRuntime` surface, the
manifest schema) and what they may not (anything else in the bundle, which is IIFE-wrapped
precisely so it is unreachable).

`CONVERSATION.md` updated per AGENTS.md.

**Verified:** 4728 tests across 139 files; both typecheck configs clean; `npm run build`
exit 0.

### Known gap

**The layer has never run in a browser.** The integration suite mounts real components under
jsdom and the demo page is built, but nobody has loaded `demo/dynamic-ui.html` and clicked a
prompt. That is a different kind of verification from anything done here, and it is the
highest-value first action for the next session.

---

## Current Stats

_Last verified 2026-08-03._

| Metric | Value |
|---|---|
| Runtime modules | 7 (`types`, `document`, `wiring`, `resolver`, `registry`, `lifecycle`, `conformance`) |
| Runtime tests | 448 passing across 11 suites (197 gate, 38 bundle) |
| Strict typecheck | Clean via `npm run typecheck:runtime` (adds noUnusedLocals/Parameters) |
| Full suite | 4728 passing across 139 files |
| Components with manifests | **98** aggregated into `dist/capability-manifest.json` |
| Conformance levels | 6 `surface`, 1 `field`, 91 `display` |
| Existing component code modified | 3 (`datagrid.ts`, `treeview.ts`, `splitlayout.ts` fix) |
| ADRs landed | ADR-140 … ADR-144 |
