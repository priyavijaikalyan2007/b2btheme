<!--
SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
SPDX-FileCopyrightText: 2026 Outcrop Inc
SPDX-License-Identifier: MIT
Repository: enterprise-bootstrap-theme
File GUID: 93ac1574-ac0e-4d26-aedb-990272745332
Created: 2026
-->

<!-- AGENT: PRD for Agent UI sub-project 0 — generated option schemas, the four-class option classification, the A2UI catalog and MCP descriptor generators, and the required-level conformance gate. Epic: GitHub #16, this sub-project: #17. -->

# Agent UI 0: Option Schemas, Protocol Generators, Conformance Gate

**Status:** Draft, awaiting review
**Tracking:** epic [#16](https://github.com/priyavijaikalyan2007/b2btheme/issues/16), this sub-project [#17](https://github.com/priyavijaikalyan2007/b2btheme/issues/17)
**Followed by:** #18 (A2UI adapter and catalog), #19 (MCP Apps renderer view)
**Spec author:** Agent + User
**Date:** 2026-10-24
**Plan / progress:** `./specs/agentui-schema.plan.md` (written after this spec is approved)

---

## 1. Overview

### 1.1 Goal of the epic

Every component in this library, today's and every future one, must be fully usable by AI agents over **A2UI** (Google) and **MCP Apps** (`io.modelcontextprotocol/ui`). A component a contributor adds must either gain protocol support or fail the build.

### 1.2 What this sub-project delivers

The foundation both protocols need and the library lacks: a **machine-readable schema for every component's options**, and the generators and gate built on it. It ships build tooling and data files. **It ships no runtime code.** The adapter that consumes these files is #18.

### 1.3 Epic decisions this spec relies on

Full rationale is in the #16 issue body.

| # | Decision |
|---|---|
| D1 | Three host classes: external AI hosts via MCP Apps, agent frameworks via A2UI, and first-party apps (knobby.io is the first). |
| D2 | **Nothing in the library may assume knobby.io.** Any consumer, including ones the owner does not control, uses the same public surface. |
| D3 | "Fully usable" means full round trip: render, feed data, read values and events back, invoke declared actions. |
| D4 | Option schemas are generated from the existing `<Name>Options` TypeScript interfaces. |
| D5 | One adapter, with A2UI as the shared payload language for all three host classes. |
| D6 | A2UI v0.9.1 on the wire first; v1.0 added later as a second codec. Names are v1.0-legal from day one. |
| D7 | The catalog namespace is `https://static.outcrop.us/`, CNAMEd by the owner to the primary CDN base. |
| D8 | Four-class option classification; anything unclassified fails the build. |
| D9 | A CRITICAL AGENTS.md section lands **in the same commit** as the gate it describes. |
| D10 | Root-level `A2UI.md` (#18) and `MCPUI.md` (#19), referenced from AGENTS.md. |
| D11 | Additive only. No existing contract changes. |
| D12 | Catalog naming and independent catalog versioning, guarded by a breaking-change diff. |

### 1.4 Measured starting point (2026-10-24)

- 101 manifests in `components/*/*.manifest.ts`: **94 `display`, 1 `field`, 6 `surface`**. Count: `grep -ho 'conformance: *"[a-z]*"' components/*/*.manifest.ts | sort | uniq -c`.
- All 101 component folders export an `interface <Name>Options`.
- No JSON Schema generator is installed. `typescript` is.

---

## 2. Scope

### 2.1 In scope

1. The `protocol` manifest field and the four-class option classifier (§3).
2. Per-component option schema generation (§4).
3. A2UI catalog generation (§5).
4. MCP descriptor generation (§6).
5. The required-level rule and its ratchet (§7).
6. Structure check `[29]`, new audit counts, an ADR, and the documentation listed in §12.

### 2.2 Out of scope (owned elsewhere)

| Item | Owner |
|---|---|
| Custom-element wrappers, codec, binding runtime, round-trip tests | #18 |
| `A2UI.md` | #18 |
| The MCP Apps renderer view, theme bridge, CSP enforcement at runtime, server helper | #19 |
| `MCPUI.md` | #19 |
| Promoting individual components that do not already verify | sub-issues of #17, one per component (§7.3) |
| DNS / CNAME for `static.outcrop.us` | the owner |

---

## 3. Option classification

### 3.1 The four classes

Every member of every `<Name>Options` interface belongs to exactly one class.

| Class | Recognised by | Over the protocol |
|---|---|---|
| **Data prop** | type is JSON-serialisable | a catalog property; bindable to a data-model path |
| **Event callback** | function-typed, and named by some `emits[].legacyOption` | an A2UI `Action`-typed catalog property (§5.4) |
| **Provider callback** | function-typed, declared in `protocol.providers` | an `Action` property for the request plus a data prop for the response (§5.5) |
| **Host-only** | declared in `protocol.hostOnly` with a reason | absent from the catalog; the reason is published in the build report |

The classifier assigns data props and event callbacks automatically. Provider and host-only members are always declared by a person, because a classifier cannot tell "asks the host for data" from "decorates a DOM node".

**Serialisable**, for this rule, means the schema generator can express the type without `{}` or an empty schema. Functions, `HTMLElement`, `Element`, `Node`, `Date`, `Map`, `Set`, class instances and `unknown` are not serialisable. `unknown` must be declared host-only or narrowed in the interface. It is never emitted as an unconstrained schema, because an agent cannot use a property it cannot see the shape of.

The container key named by `containerOption` (and `containerId` for `containerAs: "id"`) is host-only implicitly. It needs no declaration, since the adapter supplies it.

### 3.2 The manifest field

Added to `runtime/src/types.ts`. **Optional**, so every existing manifest stays valid (D11).

```typescript
/** How this component appears to agent protocols (A2UI, MCP Apps). ADR-219. */
export interface ProtocolSpec
{
    /**
     * Catalog name when the derived one collides (§5.1). Must be a UAX #31
     * identifier. Absent means the factory name without its `create` prefix.
     */
    readonly name?: string;

    /** Function-typed options that ask the host for data, keyed by option name. */
    readonly providers?: Readonly<Record<string, ProviderSpec>>;

    /**
     * Options with no protocol equivalent, keyed by option name. The value is
     * the reason, written as what the member needs that JSON cannot carry.
     */
    readonly hostOnly?: Readonly<Record<string, string>>;
}

export interface ProviderSpec
{
    /** Catalog name of the request, e.g. "search". UAX #31. */
    readonly request: string;

    /** Data-prop name the agent binds the answer to, e.g. "searchResults". */
    readonly response: string;
}

// CapabilityManifest gains:
readonly protocol?: ProtocolSpec;
```

The schema of `response` is derived from the provider callback's return type, with `Promise<T>` unwrapped to `T`. The request's payload is derived from the callback's parameters.

### 3.3 Classification failures

Each of these is a build error (§8) for any component not on the migration list (§3.4):

- A function-, element- or `unknown`-typed member that is in no class.
- A member declared in two classes, for example both `hostOnly` and an `emits` `legacyOption`.
- A `providers` or `hostOnly` key that names no member of the interface. That is stale data, and it would hide a rename.
- A `hostOnly` reason shorter than 20 characters. "n/a" is not a reason.
- A data prop with no JSDoc description. The description is what the agent reads (§5.6).

### 3.4 Migration of the existing fleet

Most of today's 101 components have `on*` callbacks that no `emits` entry names, and data props with no JSDoc, so the strict rule would fail the whole fleet on its first run. That is handled the same way as levels (§7.2):

- The first run is in report mode. Every component with at least one §3.3 failure is written, dated, into `PENDING_CLASSIFICATION` in the gate file. The list may shrink and never grow.
- A component on that list is **excluded from the catalog, loudly**: it is named in the build summary and in `dist/agentui-report.json` with its unresolved members. It is never emitted with a partial schema. An agent that cannot see a component is told nothing false. An agent that saw half a component would be.
- A component not on the list, which includes every new component, gets the strict rule from day one.

### 3.5 Consequence, stated up front

A component whose core behaviour depends on a host-only member (for example, cells that only render through a DOM callback) cannot be fully usable until it gains a serialisable alternative. The build report lists these components under a heading of their own. They are not a gate failure in #17, because the gate cannot judge "core", but each one gets a sub-issue (§7.3).

---

## 4. Option schema generation

- **Tool:** `ts-json-schema-generator`, a dev dependency pinned to an exact version. It is build-time only and never served, so it adds nothing to any bundle. The exact version is chosen in the plan, with a spike against the five most type-complex `Options` interfaces (§13, item 2).
- **Input:** each manifest's `<Name>Options`, resolved through the component's own `.ts` file.
- **Output:** `dist/schemas/<name>.options.json`, JSON Schema draft 2020-12, **data props and provider responses only**. Callbacks and host-only members are not in the file.
- **JSDoc mapping:** the description becomes `description`; `@default`, `@minimum`, `@maximum`, `@minItems`, `@maxItems`, `@pattern` and `@format` map to the keywords of the same name.
- **Validation:** each schema must validate its manifest's `defaultOptions`. A mismatch means one of them is wrong, and the error names both.

---

## 5. A2UI catalog generation

### 5.1 Naming

- The catalog name is the manifest `factory` without its `create` prefix: `createDataGrid` becomes `DataGrid`. `protocol.name` overrides it.
- It must match UAX #31 (`^[\p{XID_Start}_][\p{XID_Continue}]*$`), which is legal in v0.9.1 and required in v1.0.
- **Collisions fail the gate:** two of our components with the same name, or one of ours with a name in the A2UI basic catalog (`Text`, `Image`, `Icon`, `Video`, `AudioPlayer`, `Row`, `Column`, `List`, `Card`, `Tabs`, `Modal`, `Divider`, `Button`, `TextField`, `CheckBox`, `ChoicePicker`, `Slider`, `DateTimeInput`). The fix is a written `protocol.name`, never an automatic suffix.

### 5.2 Identity

- `catalogId` and `$id` are `https://static.outcrop.us/theme/a2ui/catalog/v<N>.json`.
- `N` is the **catalog's** major version, independent of both the library version and the A2UI protocol version.
- The base URL is one constant in the generator. The file is served from the CDN at the same path, so the ID is fetchable for people and tools, even though A2UI renderers never fetch it.

### 5.3 Versioning and the breaking-change diff

- The last published catalog is committed at `specs/agentui/published/catalog-v<N>.json`, the baseline.
- The gate diffs the freshly generated catalog against the baseline. **Breaking** changes are:
  - a component removed or renamed
  - a property removed or renamed
  - a property's type changed
  - a property becoming required
  - an `Action` property removed
  - a provider request or response removed
- A breaking change fails the gate unless `N` was incremented in the same change.
- When `N` increments, `v<N-1>.json` **stays published**, because hosts we cannot see have hard-coded its ID. Retiring an old catalog is a separate, deliberate decision, outside this spec.
- Additive changes keep `N` and update the baseline in the same commit.

### 5.4 Entry shape

Each component entry is a JSON Schema object with:

- `component: { const: "<Name>" }`
- one property per data prop. Its schema is `oneOf` the generated prop schema or the v0.9.1 data-binding type, so the agent may send a literal or a path.
- one optional property per `emits` channel and per manifest `actions[]` entry, named `on<PascalCaseName>` and typed as the v0.9.1 `Action` type. The agent supplies the event name and context it wants back. The channel payload is delivered in the action context under the reserved key `payload`. How the codec does that is #18's job; that the key is `payload` is fixed here so the catalog never has to change for it.
- for `field`-level components, `value` is two-way: a bound path receives user changes, which matches how A2UI's own `TextField` binds.
- `description` (§5.6).

The exact v0.9.1 type names for the binding and `Action` definitions are taken from the vendored v0.9.1 common-types schema, never retyped by hand (§13, item 3).

### 5.5 Providers

A provider becomes two catalog properties:

- `on<Request>`, of type `Action`, fired with the request parameters as `payload`
- `<response>`, a data prop the agent binds to the path it will answer at with `updateDataModel`

This needs nothing beyond v0.9.1. v1.0's `callAgentFunction` is a better fit and arrives with the v1.0 codec.

### 5.6 Agent guidance, generated

- **Catalog `instructions`:** a fixed preamble (what the library is, how binding works, that `payload` carries channel data), followed by one line per component.
- **Component `description`:** the `label`, then each affordance rendered as text ("browse, compare or edit a collection of 2 to 100,000 records"), then a summary of the component's actions.
- **Property `description`:** the JSDoc text.

None of this is hand-written per component. A component with a poor description has a poor manifest or poor JSDoc, and those are the places to fix it.

---

## 6. MCP descriptor generation

| File | Contents | Consumed by |
|---|---|---|
| `dist/mcp/renderer.meta.json` | `_meta.ui` for the renderer resource: `csp.resourceDomains` naming the **versioned** CDN path, `https://fonts.googleapis.com` and `https://fonts.gstatic.com`; `prefersBorder` | #19's view and server helper |
| `dist/mcp/tools.json` | per component, an `inputSchema` fragment (the option schema from §4) a server author can embed in their own tool definitions | third-party MCP server authors |

- **The CDN path must be versioned.** A push deploys, so a `ui://` page that loads an unversioned path changes code running inside Claude and ChatGPT on every push. The generator reads the versioned path from the same source the CDN build uses, and it refuses to emit an unversioned one.
- No `connectDomains`. Components that fetch on their own route those calls through `tools/call` in #19. Allowing the fetch would hand the view network access the host's user never saw declared.

---

## 7. Required level and the ratchet

### 7.1 The rule

The conformance suite computes a **required level** from what it observes on a real mount:

| Evidence | Required level |
|---|---|
| The handle exposes `getValue` and `setValue`, or the generated schema has a `value` data prop | `field` |
| The manifest declares any `emits`, `accepts` or `protocol.providers` | `surface` |
| Otherwise | `display` |

`declared < required` fails, alongside the existing `declared > verified` failure.

This **amends SURFACE_CONTRACT.md §1**, which currently calls under-declaring "a smaller problem". Under D3 it is a defect, because an agent cannot read a value from a component declared `display`. The amendment is recorded as **ADR-219**, and the document is updated in the same change.

### 7.2 The ratchet

1. **Measure first.** Run the suite in report mode. Write the list of components where `declared < required`, dated, into the gate file as `BELOW_REQUIRED`.
2. `BELOW_REQUIRED` follows the `EXEMPT` rules: it may shrink and never grow, and a comment above it says so. A component not on the list gets the strict rule from day one, so every new component does.
3. `componentsBelowRequiredLevel` is added to `scripts/audit-counts.mjs`. It equals the list length, is held as a floor by check `[20]`, and must reach 0.

### 7.3 Promotion

- A component on the list that **already verifies** at its required level gets a manifest-only change and leaves the list.
- A component that **does not** gets a sub-issue under #17. The sub-issue is written as what was tried and what happened, never as a prediction (AGENTS.md, "A testable blocker is still only a claim").

---

## 8. Errors

- Every build error uses the LITERATE_ERRORS.md shape: what happened, where (component, member, file), and how to fix it. Example:

  > `DataGrid` option `renderCell` is function-typed and unclassified. Over A2UI or MCP it would vanish without a trace. Declare it in `protocol.providers` (if it asks the host for data) or `protocol.hostOnly` with a reason, in `components/datagrid/datagrid.manifest.ts`.

- **Collect, then fail once.** One run reports every violation across the fleet, then exits non-zero.
- **No partial output.** Generators write to a temporary directory and rename into `dist/` only when every check has passed. A failed build leaves the previous artefacts untouched and writes no new ones. A half-written catalog is the fallback this repository prohibits, delivered by a deploy.

---

## 9. Observability

- **Build summary**, one line: components, data props, event callbacks, providers, host-only members, and components below their required level.
- **Build report**, `dist/agentui-report.json`: every host-only member with its reason, and every component listed under §3.5, and every component on `PENDING_CLASSIFICATION` with its unresolved members.
- **Audit counts** in `scripts/audit-counts.mjs`, held by `[20]`. Each declares its file set and pattern in code, per AGENTS.md:

  | Count | Starts at | Rule |
  |---|---|---|
  | `unclassifiedOptions` | measured on the first run, dated | may only fall; target 0 |
  | `protocolPropsMissingJsdoc` | measured on the first run, dated | may only fall; target 0 |
  | `componentsBelowRequiredLevel` | length of `BELOW_REQUIRED` | may only fall; target 0 |

  A new component that adds an unclassified member raises the count, and `[20]` fails, so the counts enforce the strict rule for new work even while the migration lists are non-empty.

- **Runtime telemetry:** none here. #18 and #19 specify it, through FRONTEND_LOGGING.md.

---

## 10. Testing

TDD per TESTING.md: tests are written and seen to fail before the implementation.

| Layer | What | Where |
|---|---|---|
| Unit | classifier: each class, each §3.3 failure, implicit container key | `scripts/agentui/*.test.ts` |
| Unit | naming: derivation, override, internal and basic-catalog collisions | same |
| Unit | catalog diff: a table of additive and breaking cases, plus "breaking with bump passes" | same |
| Unit | schema validates `defaultOptions`; a mismatch names both sides | same |
| Unit | atomic output: an injected failure leaves `dist/` byte-identical | same |
| Fleet | the generators run over all 101 components | `npm test` and CI |
| Structure | **check `[29]`** reads the **emitted** `dist/` files (not the generator's in-memory data), validates the catalog against the vendored v0.9.1 catalog meta-schema, and checks that every mountable component has an entry or a report line | `test-local.sh` |

- Unit tests use **synthetic fixture components**, not the real fleet, so a fleet change never silently changes what a unit test proves.
- **Every gate check is mutation-proven.** For each one, the plan names the mutation that must turn it red: for example, deleting a `hostOnly` entry, renaming a prop without a bump, or declaring `display` on a component with `getValue`. A check that has never been seen failing has not been shown to work.
- `[29]` deliberately does not reuse the generator's code, which is the lesson of `[19]`: a check that shares an oracle with the thing it checks passes by construction.

---

## 11. Security

- Everything emitted is public. The existing `defaultOptions` fixture-vocabulary guard is extended to the schemas, the catalog text and `tools.json`.
- No secrets, internal hostnames or knobby.io references in any emitted file (D2). `[29]` checks for `knobby`.
- The emitted text enters agents' context. It is authored by us, which makes it trusted. Inbound agent payloads are the real attack surface; AIML_SECURITY.md governs them in #18 and #19.
- `ts-json-schema-generator` and the vendored A2UI meta-schemas follow the pinning rule. The meta-schemas are data, vendored with their source commit recorded. They are not fetched at build time.

---

## 12. Contract impact and deliverables

### 12.1 Contract impact (D11)

| Existing contract | Effect |
|---|---|
| Factories (`createDataGrid` …), signatures, handles, options, legacy callbacks | **unchanged** |
| `CapabilityManifest` | gains optional `protocol`; existing manifests stay valid |
| `dist/capability-manifest.json` | gains `protocol` where declared |
| Manifest `conformance` values | some rise, to what the suite verifies |
| Existing CDN bundles | unchanged; #17 adds data files only |
| New public artefacts | `dist/schemas/*`, `dist/a2ui/catalog/v1.json`, `dist/mcp/*` (documented in `CDN_CONTRACT.md` and `docs/CDN_INTEGRATION_GUIDE.md` in the same change) |

### 12.2 Documentation, landing in the same commit as the gate

- **AGENTS.md**: a new section, *(CRITICAL) Agent-Protocol-Capable Components*, stating:
  - every option is classified, and unclassified members fail the build
  - protocol-visible props need JSDoc
  - the required level is computed, not declared
  - the catalog is versioned, and breaking it needs a bump
  - the checklist items for a new component

  Links to `A2UI.md` and `MCPUI.md` are added by #18 and #19 when those files exist, so AGENTS.md never points at a missing file.
- **SURFACE_CONTRACT.md §1**: the under-declaring amendment (ADR-219).
- **docs/CAPABILITY_MANIFEST.md**: a new section for `protocol`, plus a checklist line.
- **CDN_CONTRACT.md** and **docs/CDN_INTEGRATION_GUIDE.md**: the new `dist/` artefacts and the catalog ID policy.
- **agentknowledge**: ADR-219 in `decisions.yaml`, an `AgentProtocolSchema` concept in `concepts.yaml`, and a `history.jsonl` line written with a JSON serializer.
- **CHANGELOG.md** and **CONVERSATION.md**.

### 12.3 Files

| Action | Path |
|---|---|
| Modify | `runtime/src/types.ts`: `ProtocolSpec`, `ProviderSpec`, `CapabilityManifest.protocol` |
| Modify | `runtime/fleet-conformance.test.ts`: required level, `BELOW_REQUIRED`, `PENDING_CLASSIFICATION` |
| Create | `scripts/agentui/classify.ts`, `schema.ts`, `catalog.ts`, `catalog-diff.ts`, `mcp-descriptors.ts`, `generate.ts`, plus tests |
| Create | `scripts/agentui/vendor/a2ui-v0_9_1/` (meta-schemas, with a recorded source commit) |
| Create | `specs/agentui/published/catalog-v1.json` (baseline, first written at first publish) |
| Modify | `build.sh`: run the generator after the manifest aggregation |
| Modify | `scripts/audit-counts.mjs`: three counts |
| Modify | `test-local.sh`: check `[29]` |
| Modify | `components/*/*.manifest.ts`: `protocol` where needed; promoted levels |
| Modify | `components/*/*.ts`: JSDoc on undocumented data props |
| Modify | docs listed in §12.2 |

---

## 13. Open items, resolved in the plan before any code

1. **Mixed catalogs in v0.9.1.** Can one v0.9.1 surface mix components from the basic catalog with ours? Per-component `catalogId` resolution is confirmed only in the v1.0 text. If v0.9.1 cannot mix them, agents need layout and text primitives from our own catalog, and that becomes a scope item for #18. It does not change this spec's catalog shape.
2. **Generator coverage spike.** Run `ts-json-schema-generator` against the five most type-complex `Options` interfaces, chosen by member count and generic use, and record what it cannot express. The result is a finding, not a fallback. An inexpressible member is narrowed in the interface or declared host-only.
3. **v0.9.1 catalog ID inconsistency.** The v0.9.1 spec text, the shipped `catalog.json` and the MCP guide disagree on the basic catalog's ID (`v0_9_1/…` vs `v0_9/…`). Before the collision list and the vendored meta-schemas are pinned, confirm which one `@a2ui/web_core` 0.14.0 matches against.
4. **Versioned CDN path source.** Confirm where the CDN build defines the versioned path, so §6 reads it from there rather than restating it.

**Owner action, not blocking the spec:** the CNAME for `static.outcrop.us` must resolve before the first catalog publish.
