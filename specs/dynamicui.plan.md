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
| **5** | `runtime/lifecycle` — mount/unmount, weight budget, demotion, decay | In progress |
| **6** | Conformance suite — generic, manifest-driven, all levels | Not started |
| **7** | Manifest authoring — all 118 component folders | Not started |
| **8** | Surface retrofit — `on()` / `setData` / `getState` / `setState` burn-down | Not started |
| **9** | Registry extraction from DiagramEngine + re-bundle + build aggregation | Not started |
| **10** | `components/dynamiccanvas` — packer, viewport, chrome, virtualization | Not started |
| **11** | `components/workspaceshell` + `components/chatdock` | Not started |
| **12** | `components/stickynote` + `components/annotation` (public API only) | Not started |
| **13** | Demo — scripted host, `demo/dynamic-ui.html`, inspector, resolver explorer | Not started |
| **14** | Documentation — guide, contract, manifest, migration; generated README tables | Not started |
| **15** | Governance — AGENTS.md, SECURITY_GUIDELINES.md, PERFORMANCE.md, TESTING.md, ADRs | Not started |

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

---

## Current Stats

_Last verified 2026-08-03._

| Metric | Value |
|---|---|
| Runtime modules | 5 of 6 (`types`, `document`, `wiring`, `resolver`, `registry`; `lifecycle` pending) |
| Runtime tests | 131 passing |
| Full suite | 4291 passing across 129 files |
| Components with manifests | 0 of 118 |
| Components at `surface` conformance | 0 of 118 |
| Existing files modified | 1 (`vitest.config.ts`) |
