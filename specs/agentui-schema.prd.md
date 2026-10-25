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

**Status:** Approved 2026-10-24; amended 2026-10-25 with planning research (see §14)
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
| D4 | Option schemas are generated from the existing `<Name>Options` TypeScript interfaces. **Tool (2026-10-25):** our TypeScript-checker classifier gates the input, and **typia 12.2.1** (build-only, pinned) emits the data schemas (§4). |
| D5 | One adapter, with A2UI as the shared payload language for all three host classes. |
| D6 | A2UI v0.9.1 on the wire first; v1.0 added later as a second codec. Names are v1.0-legal from day one. |
| D7 | The catalog namespace is `https://static.outcrop.us/`, CNAMEd by the owner to the primary CDN base. |
| D8 | Four-class option classification; anything unclassified fails the build. |
| D9 | A CRITICAL AGENTS.md section lands **in the same commit** as the gate it describes. |
| D10 | Root-level `A2UI.md` (#18) and `MCPUI.md` (#19), referenced from AGENTS.md. |
| D11 | Additive only. No existing contract changes. |
| D12 | Catalog naming and independent catalog versioning, guarded by a breaking-change diff. |
| D13 | `https://static.outcrop.us` is the public origin for **every** protocol artefact: the catalog, and the assets the MCP renderer view loads. No emitted file names `static.knobby.io`. |

### 1.4 Measured starting point (2026-10-24)

- 101 manifests in `components/*/*.manifest.ts`: **94 `display`, 1 `field`, 6 `surface`**. Count: `grep -ho 'conformance: *"[a-z]*"' components/*/*.manifest.ts | sort | uniq -c`.
- All 101 component folders export an `interface <Name>Options`.
- No JSON Schema generator is installed. `typescript` 5.9.3 is.
- Classifier prototype over all 101 interfaces: 1,230 data members, 419 function, 35 element, 10 too-broad, 21 mixing data with a function; of the data members, 24 contain a nested function and 43 a nested too-broad type.

---

## 2. Scope

### 2.1 In scope

1. The `protocol` manifest field and the four-class option classifier (§3).
2. Per-component option schema generation (§4).
3. A2UI catalog generation (§5).
4. MCP renderer descriptor generation (§6).
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
| **Event callback** | function-typed, and named by some `emits[].legacyOption`; **or** the ADR-134 `onChange` of a component whose options carry `value`. One `onChange` may be both: a single callback in two roles, not a double claim | an A2UI `Action`-typed catalog property (§5.4); for `onChange`, the write-back of the two-way `value` binding |
| **Provider callback** | function-typed, declared in `protocol.providers` | an `on<Request>` `Action` property plus a `<request>Result` data prop for the answer (§5.5) |
| **Host-only** | declared in `protocol.hostOnly` with a reason | absent from the catalog; the reason is published in the build report |

The classifier assigns data props and event callbacks automatically. Provider and host-only members are always declared by a person, because a classifier cannot tell "asks the host for data" from "decorates a DOM node".

**Serialisable**, for this rule, means the schema generator can express the type without `{}` or an empty schema. Functions, `HTMLElement`, `Element`, `Node`, `Date`, `Map`, `Set` and class instances are not serialisable. A member typed too broadly to describe (`unknown`, `Record<string, unknown>`) is never emitted as an unconstrained schema, because an agent cannot use a property it cannot see the shape of. It gets an explicit schema in `protocol.schemas` (§3.2) instead. Narrowing the public TypeScript type is not the fix, because that would break consumers (D11). Measured 2026-10-24: one component declares `value?: unknown`.

**Rules the classifier applies, decided from the 2026-10-25 trial run:**

- **Instance types are functions.** An object type whose every property is a method (for example `DockSlotComponent`) is a component instance, not data.
- **`Date` is data,** emitted as `{ "type": "string", "format": "date-time" }`. The #18 adapter converts ISO 8601 strings and `Date` values in both directions. DatePicker, the only `field` component today, has `value?: Date`.
- **Mixed members** (a union of data and function or element arms, such as `string | (() => string)`) are data props whose schema covers **only the data arms**. The non-data arms must be declared in `protocol.hostOnly` under the member's name, so the narrowing is written down rather than silent.
- **Nested hazards.** A data member whose type contains a function, element or too-broad type at any depth (for example DataGrid `columns[].renderer`) must declare each such path in `protocol.hostOnly` (§3.2 path syntax). **This is the gate that makes the schema tool safe.** Every tool the trial tested drops or garbles nested functions silently, so nothing undeclared may reach the tool.

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
     * Options, or parts of options, with no protocol equivalent. The value is
     * the reason, written as what the member needs that JSON cannot carry.
     *
     * Key syntax: an option name (`renderCell`), or a path into a data
     * option using `.prop` and `[]` for array items (`columns[].renderer`).
     * A bare option name on a MIXED member means "its non-data arms".
     */
    readonly hostOnly?: Readonly<Record<string, string>>;

    /**
     * Explicit JSON Schemas for data props whose TypeScript type is too broad
     * to generate from (`unknown`, `Record<string, unknown>`), keyed by option
     * name. Replaces the generated schema for that member only.
     */
    readonly schemas?: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
}

export interface ProviderSpec
{
    /**
     * Catalog name of the request, e.g. "search". UAX #31. Every catalog
     * name derives from it: `on<Request>` and `<request>Result` (§5.5).
     */
    readonly request: string;
}

// CapabilityManifest gains:
readonly protocol?: ProtocolSpec;
```

The schema of `<request>Result` is derived from the provider callback's return type, with `Promise<T>` unwrapped to `T`. The callback's single parameter is the request, which the component writes under `eventData` (§5.4), a binding-only prop with no schema of its own. A provider callback with more than one parameter is a build error: declare it host-only, or give the component an additive single-object variant.

`ProtocolSpec` and `ProviderSpec` take no other keys. Manifest validation rejects an unknown key (for example the removed `bindAs`, or a provider's old `params`/`response`), because every catalog name is derived and nothing would read it.

### 3.3 Classification failures

Each of these is a build error (§8) for any component not on the migration list (§3.4):

- A function-, element- or `unknown`-typed member that is in no class.
- A member declared in two classes, for example both `hostOnly` and an `emits` `legacyOption`. An `onChange` that is both an `emits` `legacyOption` and the ADR-134 write-back is one callback in two roles (§3.1), not a double claim.
- A data member with a nested hazard path that no `hostOnly` key declares.
- A `providers`, `hostOnly` or `schemas` key that names no member or path of the interface. That is stale data, and it would hide a rename.
- A `hostOnly` reason shorter than 20 characters. "n/a" is not a reason.
- A data prop whose generated schema is unconstrained (`{}` or `true`) and has no `protocol.schemas` entry.
- A data prop with no JSDoc description. The description is what the agent reads (§5.6).

### 3.4 Migration of the existing fleet

Most of today's 101 components have `on*` callbacks that no `emits` entry names, and data props with no JSDoc, so the strict rule would fail the whole fleet on its first run. That is handled the same way as levels (§7.2):

- The first run is in report mode. Every component with at least one §3.3 failure is written, dated, into `PENDING_CLASSIFICATION` in `scripts/agentui/migration.mjs`. The list may shrink and never grow.
- A component on that list is **excluded from the catalog, loudly**: it is named in the build summary and in `dist/agentui-report.json` with its unresolved members. It is never emitted with a partial schema. An agent that cannot see a component is told nothing false. An agent that saw half a component would be.
- A component not on the list, which includes every new component, gets the strict rule from day one.
- **The list excuses the backlog kinds only.** For a listed component, only the codes check `[20]` already ratchets are excused: `unclassified`, `undeclared-mixed`, `undeclared-hazard` and `too-broad` (counted as `unclassifiedOptions`) and `missing-jsdoc` (`protocolPropsMissingJsdoc`). Every other code fails the build for a listed component too: `stale-declaration`, `short-reason`, `provider-arity`, `double-classified`, and `value-below-field` unless `BELOW_REQUIRED` excuses it. One table in `generate.mjs` (`BACKLOG_COUNTS`) defines both what is excused and what is counted, so the two cannot drift. A listed component with none of the excused codes left is a stale entry and fails the build until it is removed.
- **The list length is pinned.** `componentsPendingClassification` in `scripts/audit-counts.mjs` equals the list length and is a `[20]` ceiling, so adding a name fails `npm test`.

### 3.5 Consequence, stated up front

A component whose core behaviour depends on a host-only member (for example, cells that only render through a DOM callback) cannot be fully usable until it gains a serialisable alternative. The build report lists these components under a heading of their own. They are not a gate failure in #17, because the gate cannot judge "core", but each one gets a sub-issue (§7.3).

---

## 4. Option schema generation

- **Pipeline.** The classifier (§3) runs first and decides what is data. For each component the build generates an alias that `Pick`s only the members the classifier calls data. **typia 12.2.1** then emits a schema for that alias. A data member with declared nested hazards is passed in as it is. typia drops the declared function parts, which is now the intended result because each one is written down in `protocol.hostOnly`. Nothing undeclared reaches typia, so typia's quiet behaviours can only touch inputs that are already approved.
- **Post-checks.** After emission:
  - every member the classifier called data must appear in the schema's top-level `properties`. A missing one fails the build with its name. That catches a tool silently emptying a schema, the ExplorerPicker failure the trial found in another tool.
  - every top-level data member the classifier found JSDoc for must carry a `description`. typia 12.2.1 **ignores JSDoc written on the same line as the member** (`/** Rows. */ pageSize?: number;`), including inline tags such as `@minimum`, but reads JSDoc on the line above (verified 2026-10-25). A missing description fails the build and tells the author to move the comment onto its own line. Nested types' descriptions are not parity-checked: a missing nested description weakens guidance but cannot misdescribe a value.
- **Why typia** (trial of 2026-10-25, against `ts-json-schema-generator`, `typescript-json-schema`, `ts-to-zod` → Zod 4, and others):
  - it never invents an empty or "never" schema
  - its failures on nested DOM types are loud, and they matched the classifier's findings exactly
  - it emits a boolean `deprecated`
  - it is the only actively maintained candidate with a TypeScript 7 path (typia 15)
- **Invocation.** A build-only dev dependency, pinned exactly, run programmatically: one `ts.Program` from the repo `tsconfig.json`, emitted with typia's transformer (`typia/lib/transform`) on generated entry files of the form `export default typia.json.schema<Alias, "3.1">()`. No `ts-patch`, and no change to the repo's tsconfig. Generated aliases import each type by module path, never by bare name, which avoids the `RibbonOptions` / RibbonBuilder clash the trial found.
- **Normalisation.** typia emits OpenAPI 3.1 (the 2020-12 dialect). A post-step rewrites `#/components/schemas/<X>` to `#/$defs/<X>`, sets `$schema` to draft 2020-12, and closes objects (`additionalProperties: false`) where typia leaves them open. The step is mechanical and unit-tested; it adds no knowledge of its own.
- **Output:** `dist/schemas/<name>.options.json`, data props and each provider's `<request>Result` only. Callbacks and host-only members are absent.
- **JSDoc.** The description becomes `description`. typia does not map JSDoc `@default`. The repository has none: defaults are written as prose ("Default: 25"), which carries through in the description the agent reads. `@minimum`, `@maximum` and similar tags do map.
- **Validation:** each schema must validate its manifest's `defaultOptions`. A mismatch means one of them is wrong, and the error names both.
- **A typia diagnostic is a build error** reported with the component name. It is never retried with different settings.
- **TypeScript 7.** When the repository moves to TS 7, typia moves to the 15.x line (`ttsc`). typia 15 inlines DOM types silently where 12 fails loudly, so the move is safe **only** with the §3.1 nested-hazard gate in force. That is recorded here so the upgrade is not done as a version bump alone.

---

## 5. A2UI catalog generation

### 5.1 Naming

- The catalog name is the manifest `factory` without its `create` prefix: `createDataGrid` becomes `DataGrid`. `protocol.name` overrides it.
- It must match UAX #31 (`^[\p{XID_Start}_][\p{XID_Continue}]*$`), which is legal in v0.9.1 and required in v1.0.
- **Our catalog re-exports the A2UI basic catalog.** A v0.9.1 surface has exactly one `catalogId` (`a2ui_protocol.md:179`), and `updateComponents` has no per-component catalog. So agents can compose screens (Row, Column, Text, …) only if our catalog contains those primitives. Each basic component appears as `{ "type": "object", "allOf": [{ "$ref": "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json#/components/<Name>" }] }`. A bare `$ref` derives an empty strict object in `@a2ui/web_core` and rejects every property, so the `allOf` form is required. The basic catalog's functions are re-exported the same way (`anyFunction`).
- **Collisions fail the gate:** two of our components with the same name, or one of ours with a name in the A2UI basic catalog (`Text`, `Image`, `Icon`, `Video`, `AudioPlayer`, `Row`, `Column`, `List`, `Card`, `Tabs`, `Modal`, `Divider`, `Button`, `TextField`, `CheckBox`, `ChoicePicker`, `Slider`, `DateTimeInput`). The fix is a written `protocol.name`, never an automatic suffix.

### 5.2 Identity

- `catalogId` and `$id` are `https://static.outcrop.us/a2ui/catalog/v<N>.json`. The CDN serves `dist/` at the domain root (`wrangler.jsonc` `assets.directory`), so the file at `dist/a2ui/catalog/v<N>.json` answers at exactly its ID.
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

Each component entry is a JSON Schema object. Every name in it is derived by one rule, with no exceptions and no override (user decision, 2026-10-25). Channel names are persisted Dynamic UI API (canvas documents reference them), so they are never renamed; the catalog derives its names from them:

| Concept | Catalog name | Rule |
|---|---|---|
| Data option | its option name | unchanged |
| Two-way field value | `value` | unchanged; when bound, user changes are written there |
| Event payloads | ONE prop per component: `eventData` | Binding-only. The component writes each event's payload to `<bound path>/<channel>`, and each provider request to `<bound path>/<request>`, BEFORE sending the matching action. Present only when the component has at least one event or provider that carries a payload. |
| Field `change` channel | no payload carrier | When a channel's `legacyOption` is `onChange` and the component is two-way (`twoWayValue`), its payload IS `value`. The action `onChange` exists; nothing is written under `eventData` for it. |
| Event action | `on<Channel>` | Casing: if `legacyOption` minus its `on` prefix equals the channel name case-insensitively, use the legacy option name verbatim (`bulkchange` + `onBulkChange` → `onBulkChange`; `signout` + `onSignOut` → `onSignOut`). Otherwise `on` + PascalCase(channel) (`selection` → `onSelection`). |
| Manifest `actions[]` entry | `on<Id>` (PascalCase) | If its `id` equals a channel name, it is the SAME event: one action prop, no duplicate. |
| Provider | `on<Request>` + `<request>Result` | `ProviderSpec` becomes `{ request }` only. The request payload goes under `eventData/<request>`. The agent answers by `updateDataModel` at the path bound to `<request>Result` (literal or binding; its schema is the provider's awaited return type). |
| `protocol.bindAs` | removed | No longer needed: nothing derived can collide with a data prop except `eventData` itself, which stays a PROP_COLLISION violation. |

So the entry has:

- `component: { const: "<Name>" }`
- one property per data prop. Its schema is `oneOf` the generated prop schema or the v0.9.1 data-binding type, so the agent may send a literal or a path.
- `eventData`, when needed: the v0.9.1 data-binding type only. Its description states the `<path>/<channel>` and `<path>/<request>` contract.
- one `on<Channel>` property of the v0.9.1 `Action` type per `emits` channel. The agent supplies the event name and context it wants back, and reads the payload through a path in that context. Its description says where the payload is: "Sent when "<channel>" emits. Its payload is at <eventData path>/<channel>.", or, for a two-way `change`, "Sent when the value changes. Read the new value through the path bound to `value`."

  This needs no reserved keys. v0.9.1 resolves action context lazily, at send time, after the component has written under the bound path, so the agent sees the new value. (A renderer-injected `payload` key was considered and rejected: it would collide with any agent-authored `payload` key.)
- one optional `on<PascalCaseId>` `Action` property per manifest `actions[]` entry whose `id` is not a channel name.
- for `field`-level components, `value` is two-way: a bound path receives user changes, which matches how A2UI's own `TextField` binds.
- `description` (§5.6).

Two generated names that coincide within one entry (`eventData`, an action prop or a `<request>Result` against a data prop, or two action props) fail the gate as `prop-collision`. There is no rename knob: the fix is a different provider `request` or action `id`, or declaring the data option host-only.

The binding and `Action` definitions are referenced from the vendored v0.9.1 `json/common_types.json` (`DataBinding`, `DynamicString`, `DynamicNumber`, `DynamicBoolean`, `Action`), never retyped by hand. The catalog **file** mirrors the vendored v0.9.1 basic catalog's layout exactly: the same top-level keys, `functions` as an object, and `$defs.anyComponent` / `$defs.anyFunction` as `oneOf` lists of local refs. (`$defs/Catalog` in `client_capabilities.json` describes the different, inline form used in capability messages, where `functions` is an array, so it is not the validator for a catalog file.) Confirmed at a2ui-project/a2ui commit `409ded2`.

### 5.5 Providers

A provider, `{ request }`, becomes two catalog properties:

- `on<Request>`, of type `Action`, sent after the component writes the request (the callback's single parameter) to `<eventData path>/<request>`
- `<request>Result`, a data prop (literal or binding) the agent binds to the path it will answer at with `updateDataModel`. Its schema is the callback's awaited return type.

It needs nothing beyond v0.9.1. v1.0's `callAgentFunction` is a better fit and arrives with the v1.0 codec.

### 5.6 Agent guidance, generated

- **Catalog `description`:** v0.9.1 catalog files have no `instructions` field (the vendored basic catalog's top level is `$schema`, `$id`, `title`, `description`, `catalogId`, `components`, `functions`, `$defs`). The v1.0 codec will move this text to `instructions`. The text is a fixed preamble (what the library is, how binding works, the single `eventData` pattern: each event's payload at `<path>/<channel>` and each request at `<path>/<request>`, written before the matching `on<…>` action; how to answer a request at `<request>Result`; and that a two-way `value`'s `onChange` carries no other payload), followed by one line per component.
- **Component `description`:** the `label`, then each affordance rendered as text ("browse, compare or edit a collection of 2 to 100,000 records"; "exactly 1 item" when the cardinality's min equals its max), then a summary of the component's actions.
- **Property `description`:** the JSDoc text.

None of this is hand-written per component. A component with a poor description has a poor manifest or poor JSDoc, and those are the places to fix it.

---

## 6. MCP descriptor generation

| File | Contents | Consumed by |
|---|---|---|
| `dist/mcp/renderer.meta.json` | `_meta.ui` for the renderer resource: `csp.resourceDomains` = `https://static.outcrop.us`, `https://fonts.googleapis.com`, `https://fonts.gstatic.com` | #19's view and server helper |

- **CSP names origins, not paths,** so #17 needs no version. The view's `<script>` and `<link>` tags carry the path, and that path must be pinned: a push deploys, so a `ui://` page loading an unversioned path would change code running inside Claude and ChatGPT on every push. **No versioned path exists today.** CDN_CONTRACT §1 serves unversioned URLs, and its `/v<major>/` snapshot tree was never built. That CDN-contract change is a dependency of #19, recorded there.
- **The origin is `static.outcrop.us`, not `static.knobby.io` (D13).** That keeps every emitted file host-neutral, and lets `[29]`'s `knobby` check (§11) hold.
- **No `connectDomains`.** Components that fetch on their own route those calls through `tools/call` in #19. Allowing the fetch would hand the view network access the host's user never saw declared.
- **No tool definitions.** Under D5 an MCP tool's *output* is an A2UI message, and its *input* is whatever the server author's domain needs. A component's option schema is not a tool `inputSchema`. Helpers for writing tools belong to #19's server helper.

---

## 7. Required level and the ratchet

### 7.1 The rule

The conformance suite computes a **required level** from what it observes on a real mount:

| Evidence | Required level |
|---|---|
| The handle exposes `getValue` and `setValue`, or the generated schema has a `value` data prop paired with the ADR-134 `onChange` write-back (a two-way `value`). A read-only `value`, such as a displayed metric, is ordinary data and does not count | `field` |
| The manifest declares any `emits`, `accepts` or `protocol.providers`. The ADR-134 `onChange` alone does not count: it is the `field` contract. | `surface` |
| Otherwise | `display` |

`declared < required` fails, alongside the existing `declared > verified` failure.

This **amends SURFACE_CONTRACT.md §1**, which currently calls under-declaring "a smaller problem". Under D3 it is a defect, because an agent cannot read a value from a component declared `display`. The amendment is recorded as **ADR-219**, and the document is updated in the same change.

**Sizing (measured 2026-10-24):** 113 component folders declare at least one `on*` callback option. Apart from a field's own `onChange`, each such callback needs an `emits` entry to be classified, and any `emits` makes the component `surface`. So most of the fleet ends at `surface`, not `field`. That is consistent with SURFACE_CONTRACT.md, which defines `display` as "no value and no events", but it is the largest cost in the epic, and the ratchet below exists to spread it out.

### 7.2 The ratchet

1. **Measure first.** Run the suite in report mode. Write the list of components where `declared < required`, dated, into `scripts/agentui/migration.mjs` as `BELOW_REQUIRED`. It lives beside `PENDING_CLASSIFICATION` because the gate test, the generator and `audit-counts.mjs` all read it, and one copy cannot drift.
2. `BELOW_REQUIRED` follows the `EXEMPT` rules: it may shrink and never grow, and a comment above it says so. A component not on the list gets the strict rule from day one, so every new component does.
3. `componentsBelowRequiredLevel` is added to `scripts/audit-counts.mjs`. It equals the list length, is held as a ceiling by check `[20]`, and must reach 0.

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
  | `componentsPendingClassification` | length of `PENDING_CLASSIFICATION` (93 on 2026-10-25) | may only fall; target 0; adding a name fails |

  A new component that adds an unclassified member raises the count, and `[20]` fails, so the counts enforce the strict rule for new work even while the migration lists are non-empty.

- **Runtime telemetry:** none here. #18 and #19 specify it, through FRONTEND_LOGGING.md.

---

## 10. Testing

TDD per TESTING.md: tests are written and seen to fail before the implementation.

| Layer | What | Where |
|---|---|---|
| Unit | classifier: each class, instance types, `Date`, mixed members, nested-hazard paths, each §3.3 failure, implicit container key | `scripts/agentui/*.test.ts` |
| Unit | normalisation: refs rewritten, `$schema` set, objects closed | same |
| Unit | naming: derivation, override, internal and basic-catalog collisions | same |
| Unit | catalog diff: a table of additive and breaking cases, plus "breaking with bump passes" | same |
| Unit | schema validates `defaultOptions`; a mismatch names both sides | same |
| Unit | atomic output: an injected failure leaves `dist/` byte-identical | same |
| Fleet | the generators run over all 101 components | `npm test` and CI |
| Structure | **check `[29]`** reads the **emitted** `dist/` files (not the generator's in-memory data), checks the catalog has exactly the vendored basic catalog's top-level layout, compiles every component entry under Ajv's 2020-12 mode with the vendored `common_types.json` and basic `catalog.json` registered, checks that every `$ref` resolves, and checks that every mountable component has an entry or a report line | `test-local.sh` |

- Unit tests use **synthetic fixture components**, not the real fleet, so a fleet change never silently changes what a unit test proves.
- **Every gate check is mutation-proven.** For each one, the plan names the mutation that must turn it red: for example, deleting a `hostOnly` entry, renaming a prop without a bump, or declaring `display` on a component with `getValue`. A check that has never been seen failing has not been shown to work.
- `[29]` deliberately does not reuse the generator's code, which is the lesson of `[19]`: a check that shares an oracle with the thing it checks passes by construction.

---

## 11. Security

- Everything emitted is public. The existing `defaultOptions` fixture-vocabulary guard is extended to check data-carrying values (`default`, `const`, `enum`, `example(s)`) in the schemas, the catalog and `renderer.meta.json` for unambiguous fixture literals. Keys, descriptions and diagnostics are excluded.
- No secrets, internal hostnames or knobby.io references in any emitted file (D2). `[29]` checks for `knobby`.
- The emitted text enters agents' context. It is authored by us, which makes it trusted. Inbound agent payloads are the real attack surface; AIML_SECURITY.md governs them in #18 and #19.
- `typia` and the vendored A2UI meta-schemas follow the pinning rule. The meta-schemas are data, vendored with their source commit recorded. They are not fetched at build time.

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
| New public artefacts | `dist/schemas/*`, `dist/a2ui/catalog/v1.json`, `dist/mcp/renderer.meta.json` (documented in `CDN_CONTRACT.md` and `docs/CDN_INTEGRATION_GUIDE.md` in the same change) |

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
| Create | `scripts/agentui/classify.mjs`, `schema.mjs`, `normalise.mjs`, `catalog.mjs`, `catalog-diff.mjs`, `mcp-descriptors.mjs`, `generate.mjs`, plus colocated `*.test.ts` (the repo's script convention: `.mjs` using the TypeScript compiler API, tests importing the `.mjs`) |
| Create | `scripts/agentui/vendor/a2ui-v0_9_1/`: `common_types.json` and `catalogs/basic/catalog.json`, with the source commit recorded |
| Create | `scripts/agentui/migration.mjs`: `PENDING_CLASSIFICATION` and `BELOW_REQUIRED`, read by the generator, the gate test and `audit-counts.mjs` alike |
| Create | `specs/agentui/published/catalog-v1.json` (baseline, first written at first publish) |
| Modify | `package.json`: `typia` 12.2.1 and `ajv` 8.20.0 as exactly pinned dev dependencies; a `build:agentui` script run after `build:manifest` in `build` |
| Modify | `scripts/audit-counts.mjs`: three counts |
| Modify | `test-local.sh`: check `[29]` |
| Modify | `components/*/*.manifest.ts`: `protocol` where needed; promoted levels |
| Modify | `components/*/*.ts`: JSDoc on undocumented data props |
| Modify | docs listed in §12.2 |

---

## 13. Open items

All four items open at approval were resolved by planning research on 2026-10-25. They are recorded on #17.

1. **Mixed catalogs in v0.9.1:** not allowed, so our catalog re-exports the basic primitives (§5.1).
2. **Generator coverage:** `ts-json-schema-generator` was rejected for silent failures; typia behind the classifier gate was adopted (§4).
3. **Basic catalog ID:** `https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json`, matched by exact string equality in `@a2ui/web_core` 0.14.0 (`message-processor.js:932`). The `v0_9_1` ID in the spec text fails with "Catalog not found".
4. **Versioned CDN path:** none exists. #17 needs only the origin; pinning moved to #19 (§6).

**Owner action, not blocking the spec:** the CNAME for `static.outcrop.us` must resolve before the first catalog publish.

---

## 14. Amendment log

| Date | Change | Why |
|---|---|---|
| 2026-10-25 | Tool: typia 12.2.1 behind the classifier gate, replacing ts-json-schema-generator (§4) | ts-json-schema-generator produced "never" and empty schemas silently, dropped union arms, and inlined DOM types up to 15 MB |
| 2026-10-25 | Nested-hazard, mixed-member, instance and `Date` rules; `hostOnly` path syntax (§3) | every tool trialled drops nested functions silently; the gate makes that unreachable |
| 2026-10-25 | Catalog re-exports the basic primitives (§5.1) | one catalog per surface in v0.9.1 |
| 2026-10-25 | Channel → bindable prop + Action, and provider `params`; no reserved `payload` key (§5.4–5.5) | a reserved key would collide with agent-authored context keys |
| 2026-10-25 | Versioned path moved to #19 (§6) | none exists; CSP needs only the origin |
| 2026-10-25 | Catalog ID drops `/theme/`; layout mirrors the basic catalog file; `description` not `instructions`; JSDoc parity post-check; single-parameter providers; migration lists in `migration.mjs` | found while writing the plan: dist is served at the root; v0.9.1 files have no `instructions`; typia ignores same-line JSDoc |
| 2026-10-25 | `prefersBorder` left to #19 (§6) | it describes the view's presentation, which #17 does not build |
| 2026-10-25 | Fixture guard in [29] scoped to shipped data values | a full-text scan rejected the legitimate ChatDock `placeholder` prop and its description; user decision |
| 2026-10-25 | `PENDING_CLASSIFICATION` excuses only the backlog codes `[20]` counts; every other code fails for a listed component; `componentsPendingClassification` pins the list length (§3.4, §9) | a stale `hostOnly` key on a pending component passed every gate (Task 12 mutation proof #1); controller decision on the review |
| 2026-10-25 | One `onChange` may be both an `emits` `legacyOption` and the two-way write-back (§3.1, §3.3) | one callback in two roles is not a double claim; StickyNote leaves `PENDING_CLASSIFICATION` (94 → 93); user decision |
| 2026-10-25 | `value` requires `field` only when two-way, paired with the ADR-134 `onChange` (§7.1) | a read-only `value` such as MetricCard's displayed metric is ordinary data at `display`; user decision |
| 2026-10-25 | `bindAs` convention: a channel whose name collides with a data prop binds as `<channel>Change` (StickyNote and Annotation: `anchor` → `anchorChange`) | StickyNote's `anchor` channel and `anchor` option would share one catalog prop name; user decision |
| 2026-10-25 | One naming rule for every catalog name, replacing the `bindAs` convention above: one binding-only `eventData` prop (payloads at `<path>/<channel>`, requests at `<path>/<request>`); a two-way `change` channel's payload is `value`; `on<Channel>` keeping a matching `legacyOption`'s casing; a manifest action with a channel's `id` is that event; provider = `{ request }` → `on<Request>` + `<request>Result`; `protocol.bindAs` removed; unknown `protocol` and provider keys rejected (§3.2, §5.4–5.6) | channel-named props, `<channel>Change`, a duplicated `change` channel, author-chosen provider names and miscased actions gave agents several shapes for one idea, and PermissionMatrix's `export` channel and action would both have become `onExport`; user decision |
| 2026-10-25 | Component descriptions say "exactly N item(s)" when a cardinality's min equals its max (§5.6) | "of 1 to 1 items" read as a defect; user decision |
| 2026-10-25 | v1 re-baselined before first publish: `specs/agentui/published/catalog-v1.json` deleted and regenerated with the naming rule, with `CATALOG_MAJOR` kept at 1. From the first push onward the breaking-change rule (§5.3) applies | the rule is breaking against the committed baseline, but nothing had been pushed, so v1 was not yet public; user decision |
