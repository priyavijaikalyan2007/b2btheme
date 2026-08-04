<!-- AGENT: Conceptual guide to the Dynamic UI layer — the three tiers, the document format, wiring, anchoring, and the six-function host contract. Start here before SURFACE_CONTRACT.md or CAPABILITY_MANIFEST.md. -->

# Dynamic UI Guide

A **dynamic UI** has no fixed screen. Components arrive on a canvas as the user's context demands, wired to each other so interacting with one updates the others, and leave when they stop being relevant.

This guide explains what the library ships, what your application must supply, and how the pieces fit. For the full specification see `specs/dynamicui.prd.md`.

---

## 1. The boundary (read this first)

> **This repository ships the runtime and the contract. Your application ships the intelligence and the persistence.**

| In the library | In your application |
|---|---|
| `CanvasDocument` schema and validator | Any model or LLM call |
| Capability manifests for every component | Server-side storage |
| `DynamicCanvas` host runtime | Authentication and authorisation |
| Wiring engine | Data fetching and query execution |
| Intent resolver | Your domain's data shapes |
| Host adapter **interfaces** | Host adapter **implementations** |

Everything intelligent enters through a callback you supply. The library never calls a model, never writes to storage, and never decides whether a user may do something.

That boundary is why `demo/dynamic-ui-host.js` can replace the model with a lookup table and have everything else keep working. It is the smallest complete host, and the best starting point for an integration.

### The model never emits code

The model emits a **validated JSON document**, never markup, CSS, or JavaScript. This is not a stylistic preference:

- `eval`, `innerHTML`, and dynamic script loading leave the threat model entirely.
- The scene can be validated, diffed, versioned, replayed, and reviewed by a human.
- History, branching, and undo fall out of the document rather than needing machinery.
- Golden-file tests become possible, which is what makes the layer shippable at all.

---

## 2. The three tiers

| Tier | What it is | Component |
|---|---|---|
| **Workspace** | A named container of canvases — one per project, say | `WorkspaceShell` |
| **Canvas** | A live scene of mounted, wired components | `DynamicCanvas` |
| **Component** | Any library component, mounted through a uniform contract | `components/*` |

---

## 3. The document

A canvas is a **fold of an append-only patch log**. Nothing is stored as mutable state.

```javascript
const doc = EnterpriseRuntime.fold(patches);           // current state
const asOfTurn12 = EnterpriseRuntime.foldTo(patches, 12);   // history scrubbing
const forked = EnterpriseRuntime.branch(patches, 12);       // branching
```

Three properties follow for free:

- **Turn linkage.** A turn that changes nothing emits an empty patch and does not advance the revision, so many turns can map to one canvas state.
- **History scrubbing.** Restoring turn *N* is folding to revision *N*.
- **Branching.** Forking at turn *N* is copying the log prefix.

### Provenance, not rows

A node records **how its data was obtained**, never the data itself:

```javascript
source: {
    query: { table: "orders", limit: 100 },   // opaque to the runtime
    dataMode: "live"                          // or "frozen"
}
```

`live` re-runs the query on restore, so a canvas reflects current reality. Because that means a restored canvas may not show what the user saw, **pinned and shared canvases opt into `frozen`** and carry a snapshot.

A practical consequence: with `dataMode: "live"` the document contains **no user data at all**, which materially simplifies retention and privacy.

---

## 4. Wiring — bindings, not broadcast

A canvas-wide event bus where everything sees everything is unbounded and untestable at twenty components. Instead the document carries explicit bindings over typed channels:

```javascript
{
    id: "b1",
    from: { node: "tree",  channel: "selection" },
    to:   { node: "grid",  slot: "rows" },
    cardinality: "replace",
    transform: "tableColumns"
}
```

The runtime type-checks the binding against both manifests, orders delivery topologically, and rejects cycles **at validation time** — `a → b` alongside `b → a` is easy to author and must fail loudly, not spin at runtime.

### Cardinality policies

This is what decides whether a new component appears or an existing one updates:

| Policy | Behaviour | Use |
|---|---|---|
| `replace` | One target, retargeted to the latest payload | Master-detail |
| `fanout` | One target per emitted item, capped | Side-by-side comparison |
| `merge` | One target receiving the whole set | Comparison views |

Selecting two rows and getting a second inspector is `fanout`. The user can change the policy from the node's chrome, and because that writes a patch, their choice survives a reload.

### Transforms are named, never inline

```javascript
EnterpriseRuntime.registerTransform("tableColumns", (selection) => /* … */);
```

A document may only *reference* a transform by name. It can never carry an expression, so a model-authored scene cannot smuggle executable code. An unregistered name fails validation rather than silently delivering the wrong shape.

---

## 5. Resolution — intent in, component out

Your host supplies an intent and a data shape; the resolver picks the component. This keeps the model out of the business of knowing 118 component names.

```javascript
const result = EnterpriseRuntime.resolve({
    intent: "browse",      // browse inspect compare monitor edit
                           // author navigate summarize relate schedule
    shape: "collection",   // scalar record collection hierarchy graph
                           // timeseries document media geo diff
    cardinality: 4_200,
    viewport: { w: 1200, h: 800 }
});

result.chosen;       // "datagrid"
result.candidates;   // every viable option, scored, with reasons
```

**Every resolution explains itself.** The result always carries the full ranked list with per-factor contributions, and the canvas renders that behind each node's "why?" affordance plus a "show as…" override. An automatic choice is never opaque and never final; overrides are recorded and shift future scoring.

Applications can nudge resolution without forking it:

```javascript
EnterpriseRuntime.registerPresentationPreference(
    { shape: "collection", intent: "browse" },
    { prefer: "fileexplorer", weight: 0.8 });
```

---

## 6. Anchoring

Any node attaches in one of three ways:

```javascript
{ kind: "canvas" }                              // free-floating
{ kind: "node",   nodeId: "grid-1" }            // moves with another node
{ kind: "entity", entityId: "table:orders" }    // follows the data
```

`entity` is the powerful one: a note anchored to `table:orders` surfaces on **any** canvas in the workspace where that entity appears, travelling with the data rather than the layout.

---

## 7. Placement and virtualization

**The model never picks pixels.** It authors intent — `region: "main", size: "wide"` — and a deterministic packer resolves it. The same document always produces the same layout.

The moment a user drags or resizes a node it is promoted to `fixed` coordinates and the packer treats it as an obstacle to flow around. **The canvas never overrides a position the user chose.**

Off-screen nodes are demoted: state captured, component destroyed, placeholder left behind. Promotion restores in three parts, and missing any one shows stale data:

1. `setState()` restores the view,
2. `onPromoted()` lets the wiring engine replay bound **data**,
3. a decayed node's retained state makes chips lossless.

Nodes untouched for *N* turns collapse to a **chip** at the canvas edge rather than being destroyed — bounded, but never lossy. Pinned nodes never decay and are never evicted.

---

## 8. Actions, CRUD, and permissions

Components declare their actions; the runtime never executes them:

```javascript
actionDispatcher: async ({ nodeId, actionId, payload }) =>
{
    // Your authorisation and your API call.
    return { ok: true };
}
```

Destructive actions route through `ConfirmDialog`. The canvas applies an optimistic patch and rolls back on rejection.

On permissions, do all three:

1. The backend filters what is not viewable — it never reaches the document.
2. `node.grants` lets the canvas render disabled affordances **without a round-trip**.
3. The backend re-authorises every action anyway.

> **`grants` is a UX affordance and never a security boundary.** Any implementation treating it as authoritative is a defect.

---

## 9. The host contract

Six functions. An application that implements these gets a dynamic UI.

```typescript
interface DynamicUIHost
{
    onResolve(ctx): Promise<CanvasPatch>;         // where the model lives
    onFetch(source, nodeId): Promise<unknown>;    // where queries live
    onPersist(canvasId, patch): Promise<void>;    // where storage lives
    onLoad(canvasId, revision?): Promise<CanvasPatch[]>;
    actionDispatcher: ActionDispatcher;           // where authorisation lives
    capabilitiesProvider?: () => CapabilityManifest[];
}
```

---

## 10. Getting started

```html
<!-- The runtime MUST load before any component that consumes it. -->
<script src="runtime/runtime.js"></script>
<script src="components/datagrid/datagrid.js"></script>
<script src="components/dynamiccanvas/dynamiccanvas.js"></script>
```

```javascript
// Allowlist-only: an unregistered component can never be mounted.
EnterpriseRuntime.registerComponents([DATAGRID_MANIFEST, TREEVIEW_MANIFEST]);

const canvas = createDynamicCanvas("canvas-host", {
    onPatch:   (patch) => myHost.onPersist("canvas-1", patch),
    onExplain: (nodeId) => showWhy(nodeId)
});

canvas.load(await myHost.onLoad("canvas-1"));
```

Then read `demo/dynamic-ui-host.js` — it is a complete, working host in one file.

---

## Related

- [SURFACE_CONTRACT.md](SURFACE_CONTRACT.md) — making a component canvas-capable
- [CAPABILITY_MANIFEST.md](CAPABILITY_MANIFEST.md) — authoring a manifest
- [DYNAMIC_UI_MIGRATION.md](DYNAMIC_UI_MIGRATION.md) — what changes for existing consumers (nothing)
- `specs/dynamicui.prd.md` — the full specification
- ADR-140 through ADR-144
