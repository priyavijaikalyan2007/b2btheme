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
| **6** | Conformance suite + structural gate, with a shrinking exemption list | Next |
| **7** | Pilot — three components end to end, proving the retrofit shape | Not started |
| **8** | Manifest authoring — remaining folders, at `display` conformance | Not started |
| **9** | Surface retrofit burn-down, promoting each manifest to `surface` | Not started |
| **10** | Registry extraction from DiagramEngine + re-bundle + build aggregation | Not started |
| **11** | `components/dynamiccanvas` — packer, viewport, chrome, virtualization | Not started |
| **12** | `components/workspaceshell` + `components/chatdock` | Not started |
| **13** | `components/stickynote` + `components/annotation` (public API only) | Not started |
| **14** | Demo — scripted host, `demo/dynamic-ui.html`, inspector, resolver explorer | Not started |
| **15** | Documentation — guide, contract, manifest, migration; generated README tables | Not started |
| **16** | Governance — AGENTS.md, SECURITY_GUIDELINES.md, PERFORMANCE.md, TESTING.md, ADRs | Not started |

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

### Phase 6 — Conformance Suite

The primary gate. Generic, generated from manifests, run over every registered component. Assertions per §16.1 of the PRD, including the legacy-surface regression net that makes the additive guarantee verifiable.

### Phase 7 — Manifest Authoring

118 component folders gain `<name>.manifest.ts`. Seeded from the 105 existing embed-registry entries (factory, label, icon, category, defaultSize, defaultOptions already present); the semantic fields — `affords`, `emits`, `accepts`, `actions`, `stateKeys` — are authored per component.

### Phase 8 — Surface Retrofit

Burn-down against the conformance suite. Uneven by difficulty:

- `destroy()` — 113/118 already present; harden for idempotency; add to the 5 missing where meaningful
- `on()` — mechanical and identical per component: internal emitter, constructor callback becomes subscriber zero
- `setData()` — ~30 data-bearing components; the 33-strong field fleet delegates to `setValue`
- `getState()`/`setState()` — bounded by declared `stateKeys`

Reconcile the three existing `on()` implementations: DiagramEngine and GraphMinimap widen `void` → `Unsubscribe`, keeping `off()`; SmartTextInput is already canonical.

### Phases 9–15

Per the PRD sections referenced in the table above.

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
  returned nothing, which is how it was found. Replaced with the ` ` escape so
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

## Current Stats

_Last verified 2026-08-03._

| Metric | Value |
|---|---|
| Runtime modules | **6 of 6 complete** — headless runtime done |
| Runtime tests | 169 passing across 5 suites |
| Strict typecheck | Clean over all 8 runtime source files |
| Full suite | 4291 passing across 129 files (last full run) |
| Components with manifests | 0 of 118 |
| Components at `surface` conformance | 0 of 118 |
| Existing files modified | 1 (`vitest.config.ts`) |
| ADRs landed | ADR-140 … ADR-143 |
