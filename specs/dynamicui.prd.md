<!-- AGENT: PRD for the Dynamic UI layer — capability manifests, Surface contract, CanvasDocument, wiring engine, intent resolver, and the DynamicCanvas host that assembles live components on demand. -->

# Dynamic UI

**Status:** Draft
**Layer name:** Dynamic UI
**Folders:** `./runtime/`, `./components/dynamiccanvas/`, `./components/workspaceshell/`, `./components/chatdock/`, `./components/stickynote/`, `./components/annotation/`
**Spec author:** Agent + User
**Date:** 2026-08-03
**Raw brainstorm:** `./specs/dynamicui.raw.md`
**Plan / progress:** `./specs/dynamicui.plan.md`

---

## 1. Overview

### 1.1 What Is It

A **Dynamic UI** is a user interface with no fixed screen. Components are brought onto a canvas as the user's context demands, wired to each other so that interacting with one updates the others, and removed when they stop being relevant. Natural language is the primary steering surface; the canvas is the working surface.

This PRD specifies the **layer that makes such an interface buildable out of the box** from this component library. It does not specify an application.

Three tiers:

| Tier | Meaning | Owned by |
|---|---|---|
| **Workspace** | A named container of canvases, e.g. one per project. Ordering, pins, favourites. | `WorkspaceShell` |
| **Canvas** | A live scene of mounted, wired components with a document behind it. | `DynamicCanvas` + `runtime/` |
| **Component** | An existing library component, mounted and driven through a uniform contract. | `components/*` |

### 1.2 The Boundary (CRITICAL)

**This repository ships the runtime and the contract. The consuming application ships the intelligence and the persistence.**

| In scope (this repo) | Out of scope (consuming app) |
|---|---|
| `CanvasDocument` JSON schema + validator | Any LLM or model call |
| Capability manifest format + defaults for all components | Server-side storage of documents |
| `DynamicCanvas` host runtime | Authentication and authorisation decisions |
| Wiring engine (declarative bindings) | Data fetching / query execution |
| Intent resolver | Business-domain intent vocabulary extensions |
| Host adapter **interfaces** | Host adapter **implementations** |

Everything intelligent enters through a callback the host supplies. This boundary is not stylistic — it is what makes the layer testable, and a dynamic UI that cannot be tested cannot be shipped.

### 1.3 Non-Goals

- **No generative HTML.** The model never emits markup, CSS, or code. It emits a validated `CanvasDocument` and patches to it. This removes `eval`, `innerHTML`, and dynamic script loading from the threat model entirely, consistent with the library's existing `textContent`-only discipline.
- **No collaborative read-write editing in v1.** Read-only sharing plus comments only. Real-time co-editing is a CRDT problem; deferred.
- **No replacement of DiagramEngine.** DiagramEngine remains the vector-drawing surface. The Dynamic UI layer harvests three assets from it (registry, viewport math, event bus) and otherwise stays independent.
- **No heavyweight dependency for a lightweight affordance.** Sticky notes and annotations are plain components. Loading a 25k-line diagram engine to place ten notes is a design failure, not a shortcut. See §9.5.

### 1.4 Core Design Principles

1. **Declarative, not generative.** The scene is a document. Documents can be validated, diffed, versioned, replayed, golden-file tested, and reviewed by a human.
2. **If it renders, it is a component; if it decides, it is runtime.** This mirrors the headless-engine split already established for DiagramEngine (ADR-082).
3. **Convention enforces the model.** A component's capability manifest lives in the component's own folder, and a structural test fails the build when it is missing. Obligations that live only in prose get skipped.
4. **Additive only.** No existing public API is renamed, removed, or given a changed signature. Standing policy under ADR-139.
5. **Performance is a feature.** Every component declares a weight; the canvas keeps a mount budget and virtualizes beyond it.
6. **Explain every automatic decision.** The resolver's choices are surfaced with scores and reasons, and are always overridable.
7. **Client-side permission hints are UX, never a security boundary.**

---

## 2. Architecture

### 2.1 Folder Layout

```
runtime/                    headless — no DOM, no rendering
    document/               CanvasDocument schema, validator, patch fold
    wiring/                 binding graph, propagation, cycle detection
    resolver/               intent → component scoring and explanation
    registry/               allowlisted factory registry, manifest aggregation
    lifecycle/              mount/unmount, virtualization, weight budget
    adapters/               host contract type definitions (types only)

components/
    dynamiccanvas/          the rendered canvas surface; drives the runtime
    workspaceshell/         workspace chrome — canvas tabs, pins, history
    chatdock/               bottom-hovering chat surface
    stickynote/             first-class canvas citizen
    annotation/             callout / arrow / highlight overlay
    <existing>/             each gains <name>.manifest.ts
```

Each `runtime/*` subfolder follows the component-folder convention: one concern per folder, self-contained, with colocated tests.

### 2.2 Dependency Direction

```
                  ┌─────────────────────────────┐
                  │      Consuming Application  │
                  │  (LLM, storage, auth, data) │
                  └──────────────┬──────────────┘
                                 │ implements host adapters
                  ┌──────────────▼──────────────┐
                  │  components/dynamiccanvas   │  renders
                  │  components/workspaceshell  │
                  │  components/chatdock        │
                  └──────────────┬──────────────┘
                                 │ drives
                  ┌──────────────▼──────────────┐
                  │          runtime/           │  decides
                  │ document · wiring · resolver│
                  │ registry · lifecycle        │
                  └──────────────┬──────────────┘
                                 │ mounts via allowlisted factories
                  ┌──────────────▼──────────────┐
                  │      components/<name>      │
                  │   + <name>.manifest.ts      │
                  └─────────────────────────────┘
```

Runtime never imports a component. Components never import runtime. The registry is the only meeting point, and it holds strings, not references.

### 2.3 Bundling Constraint

The repository compiles vanilla TypeScript to IIFE-wrapped globals and **cannot use ES module imports across component boundaries**. Consequences:

- `runtime/` builds as its own concatenated bundle following the ADR-083 precedent (`scripts/bundle-runtime.sh`, mirroring `bundle-diagramengine.sh`), exposing `window.EnterpriseRuntime`.
- The 105-entry embed registry currently inside `components/diagramengine/src/embed-registry.ts` is **extracted** into `runtime/registry/` and re-exposed as a window global. DiagramEngine is then re-bundled to consume it rather than own it. This is "extract and re-bundle", not "extract".
- Manifests are aggregated at build time into `dist/capability-manifest.json` and `window.EnterpriseCapabilityManifest`.

### 2.4 CDN Surface

New paths, additive under ADR-139:

| Asset | Path |
|---|---|
| Runtime bundle | `runtime/runtime.js` |
| Aggregated manifest | `capability-manifest.json` |
| Canvas component | `components/dynamiccanvas/dynamiccanvas.{js,css}` |
| Workspace shell | `components/workspaceshell/workspaceshell.{js,css}` |
| Chat dock | `components/chatdock/chatdock.{js,css}` |

No `dist/` prefix, per the existing CDN contract.

---

## 3. Capability Manifest

### 3.1 Purpose

The manifest is the semantic layer above a raw component. It answers: what can this thing display, what does it emit, what will it accept, what actions does it offer, and what does it cost?

### 3.2 Location and Convention

Every component folder gains `<name>.manifest.ts`. Manifests are **not** centralised. Rationale: the repository's own churn data shows central aggregation files are the merge-conflict hotspots — `history.jsonl` (156 changes), `COMPONENT_REFERENCE.md` (109), `concepts.yaml` (106), `COMPONENT_INDEX.md` (46). A central manifest would join that list and serialise every parallel contributor. Distributed authorship, build-time aggregation.

### 3.3 Schema

```typescript
export interface CapabilityManifest
{
    /** Registry key. Matches the component folder name. */
    readonly name: string;

    /** Window global factory name. Allowlist entry — see §8. */
    readonly factory: string;

    /** Human-readable label and Bootstrap Icon class. */
    readonly label: string;
    readonly icon: string;

    /** Grouping for pickers and the Component Studio. */
    readonly category: string;

    /** What this component can render. Drives resolver scoring. */
    readonly affords: readonly Affordance[];

    /** Typed channels this component emits. */
    readonly emits: readonly ChannelSpec[];

    /** Typed slots this component accepts. */
    readonly accepts: readonly SlotSpec[];

    /** Declared, dispatchable actions. See §11. */
    readonly actions: readonly ActionSpec[];

    /** Keys returned by getState(), for restore. See §4.4. */
    readonly stateKeys: readonly string[];

    /** Cost model for the mount budget. See §9.5. */
    readonly weight: WeightSpec;

    /** Default canvas size and options at mount time. */
    readonly defaultSize: { readonly w: number; readonly h: number };
    readonly defaultOptions: Readonly<Record<string, unknown>>;

    /** Conformance level. Gated by the suite, not self-declared. */
    readonly conformance: "surface" | "field" | "display";

    /** Deterministic tie-break for equal resolver scores. Higher wins. */
    readonly priority: number;
}

export interface Affordance
{
    /** The data shape this affordance handles. */
    readonly shape: DataShape;

    /** Intent verbs this affordance serves well. */
    readonly intents: readonly IntentVerb[];

    /** Comfortable cardinality range. Outside it, score decays. */
    readonly cardinality: { readonly min: number; readonly max: number };

    /** Comfortable field/column count, where meaningful. */
    readonly density?: { readonly min: number; readonly max: number };

    /** Minimum viewport the affordance needs to be usable. */
    readonly minViewport: { readonly w: number; readonly h: number };
}

export type DataShape =
    | "scalar" | "record" | "collection" | "hierarchy"
    | "graph"  | "timeseries" | "document" | "media"
    | "geo"    | "diff";

export type IntentVerb =
    | "browse" | "inspect" | "compare" | "monitor"
    | "edit"   | "author"  | "navigate" | "summarize"
    | "relate" | "schedule";

export interface ChannelSpec
{
    /** Channel name, e.g. "selection". Namespaced by node id at runtime. */
    readonly name: string;
    /** Payload shape, for binding type-checking. */
    readonly payload: DataShape;
    /** True when the channel can emit more than one item. */
    readonly multi: boolean;
}

export interface SlotSpec
{
    readonly name: string;
    readonly payload: DataShape;
    /** Handle method invoked to fill the slot. Default "setData". */
    readonly setter?: string;
    readonly required: boolean;
}

export interface WeightSpec
{
    /** Minified JS bytes, filled by the build. */
    readonly js: number;
    /** Rough mount cost class, used by the budget. */
    readonly mountCost: "trivial" | "light" | "moderate" | "heavy";
    /** True when the component holds a canvas, worker, or observer. */
    readonly holdsResources: boolean;
}
```

### 3.4 Example

```typescript
// components/datagrid/datagrid.manifest.ts
export const DATAGRID_MANIFEST: CapabilityManifest =
{
    name: "datagrid",
    factory: "createDataGrid",
    label: "Data Grid",
    icon: "bi-table",
    category: "data",
    affords: [
        {
            shape: "collection",
            intents: ["browse", "compare", "edit"],
            cardinality: { min: 2, max: 100000 },
            density: { min: 2, max: 60 },
            minViewport: { w: 320, h: 200 },
        },
    ],
    emits: [
        { name: "selection", payload: "record", multi: true },
        { name: "sort",      payload: "record", multi: false },
        { name: "activate",  payload: "record", multi: false },
    ],
    accepts: [
        { name: "rows", payload: "collection", setter: "setData", required: true },
    ],
    actions: [
        { id: "export", label: "Export", destructive: false, requires: [] },
    ],
    stateKeys: ["scrollTop", "sort", "selection", "columnWidths"],
    weight: { js: 41_200, mountCost: "moderate", holdsResources: false },
    defaultSize: { w: 400, h: 250 },
    defaultOptions: {},
    conformance: "surface",
    priority: 50,
};
```

### 3.5 Aggregation

`scripts/build-manifest.js` walks `components/*/`, imports each `*.manifest.ts`, fills `weight.js` from the built bundle sizes, validates against the schema, and emits `dist/capability-manifest.json`. A missing or invalid manifest fails the build.

---

## 4. Surface Contract

### 4.1 Definition

```typescript
export interface Surface
{
    /** Feed a declared slot. Idempotent for equal input. */
    setData(slot: string, value: unknown): void;

    /** Subscribe to a declared channel. Returns an unsubscribe function. */
    on(channel: string, handler: (payload: unknown) => void): Unsubscribe;

    /** Serialisable view state, limited to manifest stateKeys. */
    getState(): Record<string, unknown>;

    /** Restore view state produced by getState(). Partial input allowed. */
    setState(state: Record<string, unknown>): void;

    /** Tear down listeners and remove DOM. MUST be idempotent. */
    destroy(): void;
}

export type Unsubscribe = () => void;
```

### 4.2 Relationship to ADR-134

ADR-134 defines the **field** contract (`getValue` / `setValue` / `destroy`, plus `value` and `onChange` options) and explicitly excludes DataGrid, TreeView, ChartPanel, DiagramEngine, layout containers, and navigation chrome as "out of scope by design".

Those exclusions are precisely the components a canvas must mount. The Surface contract therefore sits **beside** the field contract, and **supersedes ADR-134's exclusion table for canvas purposes**. This is a governance change, recorded as its own ADR, not a quiet extension. Rules:

- A field-conforming component satisfies `setData("value", v)` and `getState()` trivially by delegating to `setValue`/`getValue`. The retrofit for the 33-component field fleet is nearly free.
- Layout containers and navigation chrome remain excluded from *field* semantics but gain Surface conformance at the `display` level, since the canvas must still mount and destroy them.
- ADR-134's conformance list gains a follow-up entry recording the widening.

### 4.3 Conformance Levels

| Level | Requires | Applies to |
|---|---|---|
| `display` | `destroy` | Renderers and chrome with no data or events |
| `field` | `display` + `getValue`/`setValue`/`onChange` (ADR-134) | Value-bearing controls |
| `surface` | `display` + `setData` + `on` + `getState`/`setState` | Everything the canvas wires |

The level is **verified by the conformance suite, never self-declared**. A manifest claiming `surface` while failing the suite fails the build.

### 4.4 What "State" Means

State is *what is needed to restore the view*, not everything the component knows. The manifest declares the keys; `getState()` must return only those keys; every value must be JSON-serialisable. This bounds an otherwise unbounded problem and makes the round-trip test mechanical.

### 4.5 Additive Guarantee

The Surface contract adds methods to handles. It changes no constructor, no option name, and no existing method signature. Constructor callbacks continue to work byte-for-byte:

```javascript
// unchanged forever
createDataGrid("host", { onSelect: fn });

// new, additive
const off = grid.on("selection", fn);
```

Internally the constructor callback becomes subscriber zero on the new emitter, preserving firing order. See §17 for the full compatibility analysis.

---

## 5. CanvasDocument

### 5.1 Shape

```typescript
export interface CanvasDocument
{
    readonly schemaVersion: 1;
    readonly id: string;
    readonly workspaceId: string;
    readonly title: string;

    /** Mounted components, keyed by node id. */
    readonly nodes: Readonly<Record<string, CanvasNode>>;

    /** Declarative wiring between nodes. */
    readonly bindings: readonly Binding[];

    /** Viewport state — pan offset and zoom. */
    readonly viewport: { readonly x: number; readonly y: number; readonly zoom: number };

    /** Turn that produced this revision. Links canvas to conversation. */
    readonly turnId: string;

    /** Monotonic revision, incremented per applied patch. */
    readonly revision: number;
}

export interface CanvasNode
{
    readonly id: string;

    /** Registry key. Resolved allowlist-only. */
    readonly component: string;

    /** Placement — intent or explicit. See §9.2. */
    readonly placement: Placement;

    /** Options passed to the factory at mount. */
    readonly options: Readonly<Record<string, unknown>>;

    /** How this node obtains its data. Never the data itself. See §5.3. */
    readonly source: DataSource | null;

    /** View state from Surface.getState(). */
    readonly state: Readonly<Record<string, unknown>>;

    /** Anchoring. See §10. */
    readonly anchor: Anchor;

    /** Provenance and decay. See §9.6. */
    readonly provenance: { readonly turnId: string; readonly lastTouched: number };

    /** True when the user has pinned this node against decay. */
    readonly pinned: boolean;

    /** Permission hints for affordance rendering only. See §11.3. */
    readonly grants: readonly string[];
}
```

### 5.2 Patches, Not Replacements

A canvas evolves per turn. The document is materialised by folding an append-only patch log:

```typescript
export interface CanvasPatch
{
    readonly turnId: string;
    readonly revision: number;
    readonly ops: readonly PatchOp[];
}

export type PatchOp =
    | { readonly op: "addNode";     readonly node: CanvasNode }
    | { readonly op: "removeNode";  readonly id: string }
    | { readonly op: "updateNode";  readonly id: string; readonly changes: Partial<CanvasNode> }
    | { readonly op: "addBinding";  readonly binding: Binding }
    | { readonly op: "removeBinding"; readonly id: string }
    | { readonly op: "setViewport"; readonly viewport: CanvasDocument["viewport"] };
```

This gives three properties for free:

- **Turn linkage.** The many-turns-to-one-canvas relationship from the brainstorm is automatic: a turn that emits an empty patch simply does not advance the revision.
- **History scrubbing.** Restoring turn *N* is folding the log to revision *N*.
- **Branching.** Forking at turn *N* is copying the log prefix into a new canvas or workspace.

### 5.3 Provenance, Not Rows

`CanvasNode.source` records **how the data was obtained**, never the data:

```typescript
export interface DataSource
{
    /** Opaque to the runtime; meaningful to the host's onResolve. */
    readonly query: Readonly<Record<string, unknown>>;

    /** Live replays the query on restore; frozen uses the snapshot. */
    readonly dataMode: "live" | "frozen";

    /** Populated only when dataMode is "frozen". */
    readonly snapshot?: unknown;
}
```

Default is `live`. Restoring turn 12 tomorrow re-runs the query, so the canvas reflects current reality. Because that means a restored canvas may not show what the user saw, **pinned and shared canvases opt into `frozen`**, capturing the snapshot at pin/share time. This is the explicit resolution of the open question in the raw brainstorm (line 63).

Documents contain no user data when `dataMode` is `live`, which materially simplifies the host's storage and retention posture.

### 5.4 Validation

`runtime/document/validator` validates every incoming document and patch against the schema **before** any mount. A scene document is untrusted input regardless of origin. Failures render a literate error (per `LITERATE_ERRORS.md`) naming the offending path, and never partially apply.

---

## 6. Wiring Engine

### 6.1 Bindings, Not Broadcast

A canvas-wide broadcast pump — every component seeing every event and deciding for itself — is unbounded, untestable, and quadratic at twenty components. Instead the document carries explicit bindings over typed channels declared in the manifests.

```typescript
export interface Binding
{
    readonly id: string;

    /** Source node id and emitted channel name. */
    readonly from: { readonly node: string; readonly channel: string };

    /** Target node id and accepted slot name. */
    readonly to: { readonly node: string; readonly slot: string };

    /** What happens when the source emits more than one item. §6.3 */
    readonly cardinality: CardinalityPolicy;

    /** Optional named, pure transform from the transform registry. */
    readonly transform?: string;
}

export type CardinalityPolicy = "replace" | "fanout" | "merge";
```

Bindings are type-checked at validation time: `from.channel`'s payload shape must be accepted by `to.slot`, or the document is rejected with a literate error naming both manifests.

### 6.2 Propagation

The binding set forms a directed graph over nodes. On emit, the engine:

1. Marks the source node dirty and computes the affected subgraph.
2. Topologically orders it.
3. Propagates in order, invoking each target's declared setter once per tick.
4. Tracks visited nodes per tick so that a cycle terminates rather than looping.

Cycles are detected at **validation** time and rejected, and again defensively at runtime. `A.selection → B.subject` and `B.selection → A.subject` is a real and easily authored loop; it must fail loudly at document validation, not silently at 100% CPU.

Propagation is synchronous within a tick and batched across a microtask, so a multi-select emitting per-row does not fan out *n* times.

### 6.3 Cardinality Policies

This is the mechanism behind "select two rows and a second inspector appears". Structure change is declared, not inferred:

| Policy | Behaviour | Use |
|---|---|---|
| `replace` | One target node, retargeted to the latest payload. Default. | Master-detail |
| `fanout` | One target node per emitted item, capped by `maxFanout` (default 6). Removing an item destroys its node. | Side-by-side inspection |
| `merge` | One target node receiving the full set; requires the target to afford `cardinality.max > 1`. | Comparison views |

The model chooses the policy when it authors the binding. The user can change it from the node's chrome, which writes an `updateNode` patch — so a user preference becomes part of the document and survives restore.

### 6.4 Transforms

Transforms are **named entries in a registry**, never expressions and never code in the document. The runtime ships a small set (`pluck`, `first`, `count`, `toIds`, `groupBy`); hosts register their own via `registerTransform(name, fn)`. A document referencing an unregistered transform fails validation. This keeps arbitrary code execution out of the model-authored surface entirely.

---

## 7. Intent Resolver

### 7.1 Role

The host provides **intent plus data shape**; the resolver picks the component. This keeps the model out of the business of knowing 118 component names and their competence boundaries, and it gives apps a single override point.

```typescript
export interface ResolveRequest
{
    readonly intent: IntentVerb;
    readonly shape: DataShape;
    readonly cardinality: number;
    readonly fieldCount?: number;
    readonly viewport: { readonly w: number; readonly h: number };
    /** Optional explicit hint from the host or model. */
    readonly prefer?: string;
}

export interface ResolveResult
{
    readonly chosen: string;
    readonly candidates: readonly ScoredCandidate[];
}

export interface ScoredCandidate
{
    readonly component: string;
    readonly score: number;
    /** Human-readable contributions, for the "why?" affordance. */
    readonly reasons: readonly { readonly factor: string; readonly delta: number }[];
}
```

### 7.2 Scoring

For each affordance of each registered component whose `shape` matches:

```
score = 1.00 × intentAffinity      // verb present in affordance.intents
      + 0.60 × cardinalityFit      // 1.0 inside range, decaying log-linearly outside
      + 0.35 × densityFit          // as above, when density is declared
      + 0.30 × viewportFit         // 0 when below minViewport — hard exclusion
      + 0.50 × appOverride         // host-registered preference for (shape, intent)
      + 0.25 × userHistory         // prior explicit overrides by this user
      − 0.20 × weightPenalty       // normalised weight.js, favours the lighter option
```

Shape mismatch excludes the candidate entirely. A viewport below `minViewport` excludes it. Ties break by manifest `priority`, then by name — **deterministic, always**.

Weights live in one exported constant so tuning is a single reviewable diff.

### 7.3 Explainability (Required)

The resolver's chief risk is opaque failure. Mitigation is a hard requirement, not a nicety:

- `ResolveResult` always carries the full ranked candidate list with per-factor reasons.
- The canvas renders a "shown as Data Grid — why?" affordance on every resolved node, opening a HoverCard (ADR-125) with the score breakdown.
- Every node offers "show as…", listing the runner-up candidates. Choosing one writes an `updateNode` patch and records a `userHistory` signal.

### 7.4 Golden Corpus

`runtime/resolver/__fixtures__/corpus.json` maps `(shape, intent, cardinality, fieldCount)` tuples to expected components. Tuning weights without regressing the corpus is the acceptance test. The corpus starts at ~120 cases covering every declared affordance.

### 7.5 Host Overrides

```typescript
registerPresentationPreference(
    { shape: "collection", intent: "browse" },
    { prefer: "fileexplorer", weight: 0.8 });
```

Mirrors `registerDynamicFormFieldProvider` from ADR-134 deliberately — same idiom, so it reads as familiar rather than novel.

---

## 8. Registry and Security

### 8.1 Allowlist-Only Resolution (CRITICAL)

ADR-134's `resolveFactoryName()` falls back to scanning `window` for a matching factory. That is acceptable for developer-authored form definitions. It is **not** acceptable for a model-authored document, where it becomes arbitrary-global-invocation from an untrusted string.

**The canvas resolves factories allowlist-only, against the aggregated manifest registry. Never by scanning `window`.** An unrecognised component name produces a literate error naming the missing component and the registration call; it never triggers a lookup.

### 8.2 Threat Model Summary

| Vector | Mitigation |
|---|---|
| Model emits malicious component name | Allowlist-only registry resolution (§8.1) |
| Model emits code or markup | Documents carry no code; transforms are registry-named (§6.4) |
| Model emits a wiring loop | Cycle detection at validation (§6.2) |
| Model emits an unbounded fanout | `maxFanout` cap (§6.3) |
| Document claims elevated permissions | `grants` are display hints only; the backend re-authorises every action (§11.3) |
| Restored document leaks stale private data | `live` default stores no rows; `frozen` is explicit and opt-in (§5.3) |

To be added to `SECURITY_GUIDELINES.md` as a Dynamic UI section.

---

## 9. DynamicCanvas

### 9.1 Responsibilities

Mount and unmount nodes, resolve placement, own the viewport (pan/zoom), render per-node chrome, enforce the weight budget, and drive decay. It renders; `runtime/` decides.

### 9.2 Placement — Intent, Then Coordinates

The model must never pick pixel coordinates. Nodes carry placement *intent*; a deterministic packer resolves it:

```typescript
export type Placement =
    | { readonly kind: "intent"; readonly region: Region; readonly size: SizeHint }
    | { readonly kind: "fixed";  readonly x: number; readonly y: number;
        readonly w: number; readonly h: number; readonly z: number };

export type Region   = "main" | "side" | "detail" | "strip" | "overlay";
export type SizeHint = "compact" | "standard" | "wide" | "tall" | "full";
```

The packer is a deterministic top-left-origin shelf packer over the infinite canvas. Given the same document it always produces the same layout, which is what makes placement testable.

**The moment a user drags or resizes a node it is promoted to `fixed`** and the packer flows around it as an obstacle. This is the Miro/PostHog hybrid: automatic until the user expresses an opinion, then never overridden. It also dissolves the "component bumping" question from the brainstorm — packed nodes never overlap by construction, and fixed nodes are respected as obstacles.

### 9.3 Viewport

Infinite canvas with a top-left origin extending right and down. Pan and zoom harvest the viewport math from DiagramEngine rather than reimplementing it. Canvas-level commands (`clear`, `pan to`, `fit`) are exposed both as toolbar buttons and as host-invokable methods, so an application may wire them to natural language without the runtime knowing anything about language.

### 9.4 Node Chrome

Each mounted node renders a thin chrome: title, the "why?" affordance (§7.3), a "show as…" menu, pin toggle, declared actions (§11), and a close control. Chrome is the only surface the runtime imposes on a component; the component owns everything inside its box.

### 9.5 Weight Budget and Virtualization (CRITICAL)

Performance is a usability feature, and a canvas that degrades at ten sticky notes has failed.

- Every manifest declares `weight` (§3.3).
- The canvas maintains a **mount budget** — a total weight ceiling plus a live-node cap, both configurable.
- Nodes outside the viewport plus a margin are **demoted**: `getState()` is captured, `destroy()` is called, and a lightweight placeholder of the same footprint takes its place. Scrolling back re-mounts and calls `setState()`.
- Eviction is LRU-by-`lastTouched`, weighted by `weight.js`, and skips pinned nodes.
- `holdsResources: true` components (canvas contexts, observers, workers) demote first.

This is why sticky notes and annotations are plain components, not diagram-engine objects: ten notes must cost ten cheap DOM subtrees.

### 9.6 Decay

Every node carries `provenance.lastTouched`. After a configurable number of turns without interaction or rebinding, an unpinned node **collapses to a chip** docked at the canvas edge rather than being destroyed. Clicking the chip restores it. Nothing is ever silently lost, and the canvas does not grow without bound — the "ruthless removal" from the brainstorm, made recoverable.

---

## 10. Anchoring

Any node may anchor in one of three modes:

```typescript
export type Anchor =
    | { readonly kind: "canvas"; }                            // free-floating at its placement
    | {                                                       // moves and demotes with its host
        readonly kind: "node";
        readonly nodeId: string;
        readonly spot?: { readonly x: number; readonly y: number };
        readonly within?: number;
      }
    | { readonly kind: "entity"; readonly entityId: string; };// follows a domain entity
```

`entity` is the powerful one: a note anchored to `table:orders` surfaces on **any** canvas in the workspace where that entity appears, and travels with the entity rather than the layout. DiagramEngine's existing entity-anchored comments are precedent for the model.

Anchoring applies to every component, not just notes — pinning a MetricCard to an entity is equally valid.

### 10.1 Marking a place within a node (ADR-145, added 2026-08-09)

`spot` is a fraction of the target's scrollable **content**, not of its visible box, so a mark holds its place through scrolling and resizing. `within` names which scrolling region the fraction was measured against — index 0 is the node's frame body, and a component that scrolls internally contributes further regions in DOM order. Both are validated by `validateDocument`; a NaN fraction places a mark at no coordinates rather than raising.

The **gesture** ships with the canvas, not the application: `startPlacement(spec)` arms it, and the user's next click resolves the target and the fraction and emits an ordinary patch. This was originally specified the other way round — the field in the library, the gesture in the app — on the reasoning that the repo ships capability rather than application behaviour. That was wrong. Recording where a click landed is coordinate translation against the canvas's own zoom, pan and scroll state, and every consuming application would re-derive the same arithmetic. Persisting the document remains the application's job.

**Limit.** A geometric anchor survives scrolling and resizing but **not reflow**: re-wrap a document at a different width and the same fraction covers different text. Content anchoring — a text-quote or offset selector surfaced through the entity anchor — is the answer and is not built.

---

## 11. Actions, CRUD, and RBAC

### 11.1 Declared Actions

A dynamic UI is read-write, but never through arbitrary mutation. Components declare what they offer:

```typescript
export interface ActionSpec
{
    readonly id: string;
    readonly label: string;
    readonly icon?: string;
    /** Routes through ConfirmDialog before dispatch. */
    readonly destructive: boolean;
    /** Permission keys required. Compared against node.grants for display. */
    readonly requires: readonly string[];
}
```

### 11.2 Dispatch

Actions never execute in the runtime. They route to the host:

```typescript
type ActionDispatcher = (
    req: { nodeId: string; actionId: string; payload: unknown }
) => Promise<ActionResult>;
```

Destructive actions pass through the existing `ConfirmDialog`. The canvas applies an optimistic patch and rolls back on rejection, surfacing the host's message via a literate error.

### 11.3 RBAC — All Three Layers

1. The backend filters what is not viewable. Non-viewable data never reaches the document.
2. `node.grants` lets the canvas render disabled or read-only affordances **without a round-trip**, so the user sees what they cannot do before attempting it.
3. The backend re-authorises every action and may still reject.

**`grants` is a UX affordance and never a security boundary.** Any implementation treating it as authoritative is a defect. Stated here, in `SECURITY_GUIDELINES.md`, and in the guide.

---

## 12. WorkspaceShell and ChatDock

### 12.1 WorkspaceShell

Chrome for the workspace tier: canvas tabs with reorder and pin, favourites, a canvas history scrubber, and the workspace browser. Persistence is entirely the host's via `onPersist`; the shell holds no storage.

Naming note: `WorkspaceSwitcher` already exists as a **tenant/organisation** switcher. It is a different concept wearing the same word, and ADR-136's rename policy makes renaming the existing component expensive. The two coexist, and both READMEs must disambiguate explicitly.

### 12.2 ChatDock

The chat surface docks to the **bottom**, hovering over the canvas, which slides behind it — not a pinned sidebar. A control summons a history overlay on the right; selecting a turn scrubs the canvas to that revision (§5.2); branching from a turn forks the patch log into a new canvas or workspace.

ChatDock is a presentation surface only. It renders turns and emits submissions. It contains no model integration, and it composes the existing `Conversation` component for turn rendering rather than duplicating it.

---

## 13. Sharing and Collaboration

Sharing falls out of the document model:

- A **snapshot** is an immutable document version with `dataMode: "frozen"`.
- **Read-only sharing** is a reference to that version — nearly free, and the existing `ShareDialog` provides the UI.
- **Comments** on a shared canvas use the existing `CommentOverlay`, anchored per §10.
- **Read-write sharing is deferred.** It is a CRDT problem and does not belong in v1.

Read-only plus comments is a complete collaboration story for v1, not a placeholder.

---

## 14. Host Adapters

The complete surface an application must implement. Everything intelligent lives here:

```typescript
export interface DynamicUIHost
{
    /** Turn an intent + context into a patch. Where the model lives. */
    onResolve(req: ResolveContext): Promise<CanvasPatch>;

    /** Execute a node's declared data source. Where queries live. */
    onFetch(source: DataSource, nodeId: string): Promise<unknown>;

    /** Persist a patch. Where storage lives. */
    onPersist(canvasId: string, patch: CanvasPatch): Promise<void>;

    /** Load a canvas at a revision. */
    onLoad(canvasId: string, revision?: number): Promise<CanvasPatch[]>;

    /** Execute a declared action. Where authorisation lives. */
    actionDispatcher: ActionDispatcher;

    /** Optional: narrow or extend the component allowlist. */
    capabilitiesProvider?: () => readonly CapabilityManifest[];
}
```

Six functions. An application that implements these six gets a dynamic UI.

---

## 15. New Components

Both are built **last in the pass, using only the public contract**. If either needs a private hook, the contract is wrong and we find out before any consumer does.

### 15.1 StickyNote

Plain DOM note: text, colour from the palette, resize, all three anchor modes. `mountCost: "trivial"`. No engine, no canvas element, no observer.

### 15.2 Annotation

Callout, arrow, and highlight overlays anchored per §10.

**Amended during implementation.** This section specified one shared SVG layer, so that *n* annotations cost one element tree. That was dropped: pooling would have made annotations second-class citizens with their own coordinate system, unable to be mounted, virtualized, wired or restored like any other node. One small inline SVG per annotation keeps them ordinary canvas citizens at trivial cost, which matters more than the element count. Two further corrections from browser testing (ADR-145): the pin is permanent and the card opens beside it, because rebuilding the element under the pointer produced a self-sustaining expand/collapse flicker; and the expanded card is a `<textarea>`, never `contenteditable`, because a paste into contenteditable inserts markup and would breach the textContent-only discipline.

Both require manifests, Layout Studio stencils, Component Studio entries, READMEs, and demo coverage like any other component.

---

## 16. Testing Strategy

Written before implementation, per the mandated TDD loop.

### 16.1 The Conformance Suite (Primary Gate)

One generic suite, generated from the manifests, run over every registered component. This is what turns "retrofit 113 components" from 113 design problems into a mechanical burn-down that parallelises across agents.

Per component, at its declared conformance level:

| Assertion | Level |
|---|---|
| Factory exists on `window` and matches the manifest | all |
| Mounts into a detached host without throwing | all |
| `destroy()` removes all DOM and detaches all listeners | all |
| `destroy()` is idempotent — second call is a no-op | all |
| **Legacy surface: constructor callbacks still fire, in order** | all |
| Every declared `emits` channel is observable via `on()` | surface |
| `on()` returns a working `Unsubscribe` | surface |
| Every declared `accepts` slot is fillable via its setter | surface |
| `getState()` returns only declared `stateKeys`, JSON-serialisable | surface |
| `setState(getState())` round-trips without visual change | surface |
| Round-trips through `createDynamicFormSwitcher` | field |

### 16.2 Structural Gate

`test:structure` (`test-local.sh`, already part of `npm test`) enumerates `components/*/` and fails when a directory lacks a valid manifest or its conformance suite does not pass. **A new component that is not canvas-capable cannot land.** This is the enforcement mechanism; the AGENTS.md prose is documentation of it, not the gate itself.

### 16.3 Runtime Suites

- **Document** — schema validation, patch fold determinism, fold-to-revision, branching, rejection of malformed input.
- **Wiring** — propagation order, cycle rejection at validation, all three cardinality policies, fanout cap, transform allowlisting, microtask batching.
- **Resolver** — the golden corpus (§7.4), determinism of tie-breaks, hard exclusions, override precedence, reason completeness.
- **Registry** — allowlist enforcement, explicit assertion that `window` scanning never occurs.
- **Lifecycle** — demotion and re-mount state fidelity, budget eviction order, pinned nodes never evicted, `holdsResources` demoted first.
- **Canvas** — packer determinism, fixed-node obstacle avoidance, promotion on drag, decay to chip and restore.

### 16.4 Integration

Full scripted sessions driven through a stub host, asserting the resulting document after each turn against golden files. These double as the demo's canned sessions (§18), so the demo cannot drift from the tests.

---

## 17. Migration and Compatibility

**No breaking change. Nothing moves from constructor to initialisation.** Constructor callbacks are permanent public API.

Four deltas, all documented in `docs/DYNAMIC_UI_MIGRATION.md`:

| # | Delta | Impact |
|---|---|---|
| 1 | `on()` return type on **DiagramEngine** widens from `void` to `Unsubscribe`. `off()` stays permanently. | None — every existing caller ignores the return value. |
| 2 | Subscriber exceptions are isolated per handler. | A throwing `onSelect` surfaces differently; strictly more robust. |
| 3 | `destroy()` hardened to be idempotent everywhere. | Only affects code relying on a second `destroy()` throwing. |
| 4 | Passing both `onSelect` and `on("selection")` delivers to both. | Intended; documented. |

### 17.1 Audit of Existing `on()` Implementations

Only three components declare an `on()` at all, and only one is an actual handle method needing change:

| Component | Site | Nature | Action |
|---|---|---|---|
| DiagramEngine | `diagramengine.ts:1147`, `:26709` | Real handle method returning `void` | Widen to `Unsubscribe`; keep `off()` |
| SmartTextInput | `smarttextinput.ts:1540` | Real handle method, already returns `Unsubscribe` | None — already canonical |
| GraphMinimap | `graphminimap.ts:92` | **Declaration inside `GraphCanvasHandle`**, describing a dependency it consumes — not its own handle | None |

GraphMinimap needs no change: it declares the shape it expects of a GraphCanvas passed to it,
and TypeScript accepts a function returning a value where a `void` return is declared, so a
widened implementation still satisfies the interface. (GraphCanvas itself exposes no `on()`
today, so the declaration is duck-typed against an optional capability.)

The widening must route `off()` and the returned unsubscribe closure through **one** removal
path, or the two detach mechanisms will drift.

### 17.2 Verifiability

The additive claim is made **verifiable** by the legacy-surface assertion in the conformance suite (§16.1), which runs on every component. Consumers who never touch the canvas do nothing and observe nothing.

Conforms to ADR-139 (additive-only, no hard pinning).

---

## 18. Demo

### 18.1 The Constraint

Demonstrating a dynamic UI with no backend and no model. The answer follows from §1.2: **the demo implements `DynamicUIHost` with a lookup table.** Canned sessions map utterances to patches. Everything below the model is real — real resolver, real bindings, real components, real persistence against `localStorage`. Only the intelligence is stubbed, so the demo *proves* the boundary holds and doubles as the reference host implementation for integrators.

### 18.2 `demo/dynamic-ui.html`

A scripted session exercising the whole model:

1. *"show me the tables in the sales database"* → resolver picks TreeView; node mounts in `main`.
2. *"details for orders"* → DataGrid mounts in `detail`, bound to the tree's `selection` with `replace`.
3. User selects two rows → policy switched to `fanout`; a second inspector appears. Demonstrates §6.3 by direct interaction.
4. *"chart revenue by month"* → ChartPanel; demonstrates `timeseries` + `monitor` resolution.
5. Drop a StickyNote anchored to `table:orders`; navigate to another canvas and watch it follow (§10).
6. Drag a node → promotion to `fixed`, packer flows around it (§9.2).
7. Pin the canvas → `dataMode` flips to `frozen` (§5.3).
8. Scrub history back three turns → canvas rewinds; branch from there into a new canvas (§5.2).

### 18.3 Companion Panels

Both are genuine tools, not decoration:

- **Document inspector** — the live `CanvasDocument` and its patch stream beside the canvas, making the model legible.
- **Resolver explorer** — pick a shape, intent, and cardinality; see ranked candidates with score breakdowns. The concrete form of §7.3.

### 18.4 Repository Conventions

Entries in `demo/index.html` and `demo/all-components.html` for StickyNote and Annotation; Component Studio entries for all five new components; Layout Studio stencils for each. `demo/studio/canvas-studio.html` — design-time hand-authoring of documents — is noted as a later phase, not this pass.

---

## 19. Documentation

| Document | Contents |
|---|---|
| `docs/DYNAMIC_UI_GUIDE.md` | Conceptual spine: the three tiers, the document, bindings, anchoring, host adapters, worked integration |
| `docs/SURFACE_CONTRACT.md` | Contract reference; how to make a component canvas-capable |
| `docs/CAPABILITY_MANIFEST.md` | Manifest authoring reference and field-by-field semantics |
| `docs/DYNAMIC_UI_MIGRATION.md` | Adoption guide plus the four compatibility deltas (§17) |
| `docs/APPS_TEAM_USAGE_GUIDE.md` | Updated — new CDN paths, the aggregated manifest, canvas-ready components |
| `CDN_CONTRACT.md` | Updated — `runtime/` and `capability-manifest.json` |
| Per-component `README.md` | **Generated** canvas-capability table (§19.1) |

### 19.1 Generated, Not Hand-Written

Because the manifest is machine-readable and `scripts/generate-docs.js` already exists, each component README's capability table is generated from its manifest and cannot drift. `COMPONENT_INDEX.md` gains a canvas-ready column for free from the same source.

---

## 20. Governance Updates

| File | Change |
|---|---|
| `AGENTS.md` | New `(CRITICAL)` section — "Canvas-Capable Components — Surface Contract", parallel to the DynamicFormSwitcher section. New-component checklist grows to require a manifest and a passing conformance suite. |
| `SECURITY_GUIDELINES.md` | Dynamic UI section — allowlist-only resolution, documents as untrusted input, `grants` are not a boundary (§8.2, §11.3). |
| `PERFORMANCE.md` | Weight budget, virtualization, demotion policy (§9.5). |
| `TESTING.md` | Conformance suite as a required gate (§16). |
| `MASTER_COMPONENT_LIST.md` | Five new components added. |
| `KNOWLEDGE_ARCHITECTURE.md` | `runtime/` layer described. |
| `agentknowledge/*` | New concepts, entities, ADRs, history entries. |

The prose is documentation of the gate, not the gate. The gate is §16.2.

---

## 21. Open Questions

1. **Intent vocabulary extensibility.** Ten verbs (§3.3) cover the surveyed cases. Should hosts be able to register domain verbs, or does that fragment the resolver corpus?
2. **Manifest versioning.** When an affordance changes, do documents referencing the old shape migrate, or pin to a manifest version?
3. **Cross-canvas bindings.** Entity anchoring crosses canvases; should bindings? Currently no — a binding is canvas-local.
4. **Chip decay threshold.** Turn-count default is arbitrary; needs usage data to tune.
5. **Layout Studio stencil for `DynamicCanvas`.** A wireframe of a thing with no fixed layout is semantically odd, and the stencil-count tests are hard-coded. Convention question rather than a technical one.

---

## 22. ADR Set

| ADR | Title |
|---|---|
| ADR-140 | Dynamic UI layer boundary — runtime ships contract, app ships intelligence |
| ADR-141 | Surface contract — widening ADR-134's exclusion table for canvas-mounted components |
| ADR-142 | Capability manifests colocated per component, aggregated at build time |
| ADR-143 | Allowlist-only factory resolution for model-authored documents |
| ADR-144 | CanvasDocument — declarative patch log, provenance not rows, live/frozen data modes |
| ADR-145 | Declarative bindings with cardinality policies over broadcast eventing |
| ADR-146 | Intent resolver with mandatory explainability and golden corpus |
| ADR-147 | Weight budget and virtualization — no heavyweight dependency for a lightweight affordance |
| ADR-148 | Embed registry extracted from DiagramEngine into `runtime/registry` |
