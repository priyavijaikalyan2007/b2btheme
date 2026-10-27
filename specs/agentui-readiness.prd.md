<!--
SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
SPDX-FileCopyrightText: 2026 Outcrop Inc
SPDX-License-Identifier: MIT
Repository: enterprise-bootstrap-theme
File GUID: edef48c3-cae1-4f04-9a0c-d8a72bffe7a2
Created: 2026
-->

<!-- AGENT: PRD for Agent UI readiness step 1: the fleet-wide mechanisms every remaining component needs before it can join the A2UI catalog. Covers the onChange-to-value mapping (#39), agent-facing descriptions (#37), host-only actions (#31 narrowed), and the testing bar for joining the catalog. Epic: GitHub #16. -->

# Agent UI readiness, step 1: fleet-wide mechanisms

**Status:** Approved 2026-10-27
**Tracking:** epic [#16](https://github.com/priyavijaikalyan2007/b2btheme/issues/16). Closes [#39](https://github.com/priyavijaikalyan2007/b2btheme/issues/39) and [#37](https://github.com/priyavijaikalyan2007/b2btheme/issues/37); re-scopes [#31](https://github.com/priyavijaikalyan2007/b2btheme/issues/31); prepares [#20](https://github.com/priyavijaikalyan2007/b2btheme/issues/20).
**Depends on:** #17 and #18 (catalog v1, adapter v1), and PR #40 (browser tests for every catalog component), which must merge first.
**Spec author:** Agent + User
**Date:** 2026-10-27
**Plan / progress:** `./specs/agentui-readiness.plan.md` (written after this spec is approved)

---

## 1. Overview

### 1.1 The programme this step starts

The user asked for every remaining component to be made A2UI-ready. On 2026-10-27 that means:

| Group | Count | Blocked by |
|---|---|---|
| Manifested components on `PENDING_CLASSIFICATION` (#20) | 93 | 546 unclassified options, 373 data props without JSDoc |
| …below their required conformance level (#21–#26) | 6 | handle work: `setData`, `on`, `getState`/`setState` |
| …with a manifest action (#31, gate G1) | 1 | DataGrid's `export` |
| …whose `onChange` is not the value (#39) | 18 | no way to declare the mapping |
| …layouts that host child elements | 11 | A2UI children cannot reach them |
| Components with no manifest | 24 | no manifest |
| Thin catalog descriptions (#37) | all | descriptions are built from the label |

The user approved five steps, in this order. Each step gets its own spec, plan and PRs:

1. **Fleet-wide mechanisms (this spec).**
2. **The #20 sweep,** in batches by category, one PR per batch.
3. **The six below-required components (#21–#26),** with additive handle methods.
4. **Layouts:** a separate design for hosting A2UI child components.
5. **The 24 components with no manifest:** manifests for those an agent would sensibly render; the page-level ones are recorded as out of scope, with reasons.

### 1.2 What this step delivers

Four mechanisms. Steps 2–5 depend on all of them:

1. **`protocol.change`** declares what a component's `onChange` means relative to `value`. The build checks it statically, and the adapter applies it (§3).
2. **`agent.useWhen` / `agent.avoidWhen`** are agent-facing descriptions, required before a component joins the catalog (§4).
3. **`protocol.hostOnlyActions`** keeps a manifest action out of the catalog, with a reason (§5).
4. **The testing bar:** a generated real-browser render test for every catalog component, hand-written gesture tests for interactive ones, and a coverage gate (§6).

### 1.3 Decisions (user, 2026-10-27)

| # | Decision |
|---|---|
| R1 | Scope is all five steps above, in that order. |
| R2 | #39: **the manifest declares the mapping.** No component code changes, and no adapter inference. Rejected: new `onValueChange` callbacks in 19 components; dropping two-way where mismatched (ToolColorPicker would lose two-way `value` in catalog v1). |
| R3 | #37: **two required sentences, `useWhen` and `avoidWhen`.** `avoidWhen` names the alternative. Rejected: one `purpose` sentence (nothing forces "use X instead"); README extraction (written for humans, can't be gated). |
| R4 | #31: **mark DataGrid's `export` host-only.** The export happens in the browser, and an agent can't receive a file. The action bar waits for an action an agent can use. Rejected: building the action bar now; an action bar that calls handle methods locally. |
| R5 | Testing bar: **a generated browser render test for every catalog component, plus hand-written gesture tests for every component with a two-way `value` or events.** Rejected: render test only; hand-written tests for all. |

### 1.4 Constraints

- **Non-breaking (user, 2026-10-27).** No existing `create<Name>()` option, callback signature, handle method or return value changes. Every component IIFE in `dist/` stays byte-identical. Agent-UI work is an enhancement, not a breaking change.
- **No fallbacks.** The adapter never guesses a mapping. An undeclared mismatch is a build failure, not a runtime coercion.
- **Catalog v1 compatibility** follows the #17 diff rule (`scripts/agentui/catalog-diff.mjs`). Descriptions are not a contract (`descriptionsDiffer` is reported separately and is not breaking). Widening a prop schema is additive.
- **The migration lists only shrink.** No name is added to `PENDING_CLASSIFICATION` or `BELOW_REQUIRED`.

### 1.5 Facts this design rests on (verified 2026-10-27)

- The build treats a component as two-way when its options have `value` and a function `onChange` (`scripts/agentui/resolve.mjs`, `twoWayValue`). The adapter's element writes the change callback's first argument to the path bound to `value` (`a2ui/src/element.ts`, `#onUserValue`).
- The classifier records each function member's arity, but not its parameter types (`scripts/agentui/classify.mjs`, `classifyMember`).
- **A survey of all 101 manifests:** 38 have both `value` and `onChange`. In 19 of them, `onChange`'s first parameter is not assignable to `value`:

  | Shape | Components |
  |---|---|
  | Item payload | toolcolorpicker, fontdropdown, lineendingpicker, lineshapepicker, linetypepicker, linewidthpicker, marginspicker, sizespicker, spacingpicker, columnspicker, layoutpicker |
  | `T \| null` | datepicker, periodpicker, sprintpicker, timepicker |
  | Wider | slider |
  | Not a value | gauge, annotation, dynamicformswitcher |
- **All four `T | null` pickers' handles already accept `null`** in `setValue`.
- In a real browser, a ToolColorPicker pick writes `{"hex":…,"label":…}` to the bound path. The adapter then reports `VALIDATION_FAILED` at that path (PR #40, test marked `test.fail`).
- G3's two-way test (`a2ui/fleet-adapter.test.ts`) calls the injected change option with a correct `sampleValue`, so it never sees the real payload.
- DataGrid's `export` is the only manifest action in the fleet. No manifest declares `protocol.providers`.
- `describeComponent` (`scripts/agentui/catalog.mjs`) builds the description from the label, the `affords` sentences, and an "Actions: …" sentence.

---

## 2. Scope

### 2.1 In scope

- The three manifest fields, their types in `runtime/src/types.ts`, their manifest validation, and their checks in the resolver.
- Adapter support for `protocol.change`.
- Catalog generation: descriptions, the cleared-is-absent text, host-only actions left out.
- Two-sentence agent descriptions for the 8 components already in the catalog.
- `protocol.change: { valueFrom: "hex" }` for ToolColorPicker. This fixes #39's live defect.
- The testing infrastructure in §6. PR #40's tests and the existing per-component tests move into it.
- Docs, ADR-222, and issue updates (§7).

### 2.2 Out of scope

- Moving any pending component into the catalog (step 2). DataGrid's `export` declaration and the pending pickers' `change` declarations land with their batches.
- Any component source change.
- The #31 action bar, providers, layouts' child components, and manifests for the 24 components without one.

---

## 3. `protocol.change`: what `onChange` means (#39)

### 3.1 The declaration

```ts
/** How a two-way component's onChange relates to its value (ADR-222). */
export type ChangeSpec =
    | { readonly valueFrom: string }   // the value is this property of the payload
    | { readonly cleared: null }       // the payload is the value, or null when the user clears it
    | "event";                         // onChange is an ordinary event; value is one-way

export interface ProtocolSpec
{
    // …existing fields…
    readonly change?: ChangeSpec;
}
```

| Declaration | `twoWayValue` | Written to the bound path on a user edit | Catalog `value` schema |
|---|---|---|---|
| absent | true | the payload | unchanged |
| `{ valueFrom: "p" }` | true | `payload.p` | unchanged |
| `{ cleared: null }` | true | the payload; when the payload is `null`, the bound path is **deleted** (§3.4) | unchanged; the description says that cleared is an absent path |
| `"event"` | **false** | nothing; `onChange` must be an emits channel's `legacyOption` | unchanged, and the "Two-way" text is dropped |

`valueFrom` names **one property**, not a path. Every surveyed item payload carries its value one level down. Paths can be added later without breaking anything.

### 3.2 Build checks

- **The classifier** adds `params: string[]` (each parameter's type as text, for messages) and keeps the TypeScript types available to the resolver through the classifier context. It also records whether the handle's `setValue` accepts `null`. The handle is read from the factory's return type.
- **The resolver** adds two violation codes:

  | Code | When |
  |---|---|
  | `change-mismatch` | After applying the declared mapping, `onChange`'s first parameter is not assignable to `value`. For `cleared: null`, the check is on the parameter without `null`, and the handle's `setValue` must accept `null`. For `valueFrom`, the property must exist on every arm of the payload type. |
  | `stale-declaration` (existing code) | `protocol.change` on a component without both `value` and a function `onChange`. |

  The `change-mismatch` message names the manifest and lists the three forms with one example each.
- `change-mismatch` is **not** a pending-excusable code for components already in the catalog. Pending components are excused it (it joins `PENDING_EXCUSABLE_CODES`) until their batch.
- `"event"` makes `onChange` an ordinary function member. If no emits channel names it as `legacyOption`, the existing `unclassified` violation fires.

### 3.3 Adapter

- The descriptor carries `change: { valueFrom } | { cleared: null }` when declared. `"event"` produces no `changeOption` and no `payloadInValue`.
- `#onUserValue` maps the payload before writing it: `payload[valueFrom]` or `null`. With no mapping declared, the payload is written as it is; the build has already proved its type.
- The echo check (`#isEcho`) compares the **mapped** value.
- For a `{ cleared: null }` component, after mount, an absent bound `value` means "cleared". It is applied as `setValue(null)` rather than reported as `OUTCROP_BINDING_LOST`. Before mount, an absent value still waits, as for every bound prop. Components without `cleared` still report a deleted bound value as a lost binding.

### 3.4 Catalog, and why "cleared" is "absent"

- **Amendment (plan Task 4, 2026-10-27):** the approved design wrote `null` to the bound path and added a `{ "type": "null" }` arm to the catalog. **An A2UI data model cannot hold `null`.**
  - `@a2ui/web_core`'s `DataModel.set(path, null)` deletes the key, and A2UI's `updateDataModel` likewise uses "no value" to mean delete.
  - So a written `null` would have arrived as an absent path, and the element would then have reported its own write as `OUTCROP_BINDING_LOST`.
- **The design that fits A2UI: cleared is an absent path, in both directions.**
  - When the user clears the field, the adapter deletes the bound path.
  - When the agent deletes the bound path, the component is cleared with `setValue(null)`.
- The catalog schema is unchanged. The `value` description gains: "When the user clears it, the path is deleted; delete the path to clear it."
- Plan Task 1 had added a `catalog-diff` rule treating a `null` arm as additive. With no `null` arm, the rule had no user, so it was removed and `catalog-diff.mjs` is unchanged from `main`.
- In step 1, only ToolColorPicker declares `change` (`valueFrom`), and its catalog entry does not change.

---

## 4. `agent.useWhen` / `agent.avoidWhen`: descriptions (#37)

### 4.1 The declaration

```ts
export interface AgentDescription
{
    /** When to choose this component. One sentence, 30–240 characters. */
    readonly useWhen: string;
    /** When to choose something else, naming it. One sentence, 30–240 characters. */
    readonly avoidWhen: string;
}

export interface CapabilityManifest
{
    // …existing fields…
    readonly agent?: AgentDescription;
}
```

`agent` is top-level rather than under `protocol`, so the Dynamic UI canvas and the MCP descriptors can use the same text.

### 4.2 The catalog description

`describeComponent` emits, in order:
1. `"<label>."`
2. `useWhen`
3. `avoidWhen`
4. the existing `affords` sentences, unchanged
5. the "Actions: …" sentence, **listing only actions that are not host-only** (§5)

The MCP descriptors use the same function.

### 4.3 Build check: `agent-description`

A catalog component violates `agent-description` when:
- `agent` is missing, or either sentence is missing;
- either sentence is under 30 or over 240 characters, or doesn't end with `.`;
- either sentence, case-folded and stripped of punctuation, equals the label;
- `avoidWhen` doesn't contain the exact PascalCase name of at least one **other** component in the built catalog, ours or basic.

The last rule runs after catalog assembly, so a rename or removal of the named component also fails. Pending components are excused this code until their batch.

### 4.4 The eight current components

Step 1 writes both sentences for ChatDock, GraphLegend, OrientationPicker, Ruler, SkeletonLoader, StickyNote, ToolColorPicker and WorkspaceShell. Each `avoidWhen` names the closest basic or catalog alternative, for example ChoicePicker for OrientationPicker, or TextField for StickyNote.

---

## 5. `protocol.hostOnlyActions` (#31 narrowed)

### 5.1 The declaration

```ts
export interface ProtocolSpec
{
    // …existing fields…
    /** Manifest actions with no protocol equivalent, keyed by action id; the value is the reason. */
    readonly hostOnlyActions?: Readonly<Record<string, string>>;
}
```

It is a separate field from `hostOnly`, because `hostOnly` keys are option names and paths, and a component may have an option named `actions`.

### 5.2 Build

- Gate G1 fails only for a catalog component's action that is not host-only. The adapter supports none, so every catalog action must be declared. The message names `hostOnlyActions` and #31.
- A host-only action gets no `on<Id>` catalog prop and is left out of the description's "Actions:" sentence. It is listed in `dist/agentui-report.json` under `hostOnly`, as `actions.<id>`, with its reason.
- Checks reuse existing codes:
  - a key that isn't a manifest action id: `stale-declaration`;
  - a reason under 20 characters: `short-reason`.

### 5.3 Rollout

DataGrid's declaration lands with its step 2 batch:

> "Export writes a CSV file in the browser; an agent can neither receive nor deliver a file."

#31 is re-scoped to the action bar, to be built when a component has an action an agent can use.

---

## 6. The testing bar

### 6.1 Generated render test: `tests/a2ui-catalog-render.spec.ts`

- One test per component of ours in the built catalog (not the basic ones), generated at collection time from `dist/a2ui/catalog/v1.json`.
- **Surface:** every data prop gets a schema-valid sample from `a2ui/sample-values.ts`; action props and `eventData` are left unset.
- **Rendered** under `@a2ui/lit` through the harness in `tests/a2ui/`.
- **Asserts:**
  - the custom element contains visible, non-empty content (a bounding box larger than zero);
  - `errors == []`;
  - no console errors.
- **Overrides:** a component that can't render from generic samples gets an entry in one `OVERRIDES` map in that file, with its reason in a comment. The test fails until the entry exists; it never skips.

### 6.2 Gesture tests: `tests/a2ui-components/<batch>.spec.ts`

- The page helpers move from `tests/a2ui-adapter.spec.ts` to `tests/a2ui/adapter-page.ts`: `open`, `send`, `surface`, `dm`, `errors`, `actions`.
- The per-component tests (Ruler, OrientationPicker, StickyNote, and PR #40's five) move to `tests/a2ui-components/catalog-v1.spec.ts`. The adapter spec keeps adapter-level tests: theme injection, error codes, and React.
- **`expectCatalogValid(component, prop, value)`** validates a written-back value against that prop's catalog schema, in Node, with the checker's precompiled per-component validators.
- **Every test title starts with the catalog component name.**
- **ToolColorPicker's test** drops `test.fail` once `valueFrom` lands, and asserts `expectCatalogValid("ToolColorPicker", "value", …)`.

### 6.3 Coverage gate

A unit test reads the built catalog and the gesture specs. Every component of ours with a two-way `value` or any `on<Event>` prop must start some test title in `tests/a2ui-components/`. Otherwise it fails, naming the component.

### 6.4 G3

The jsdom two-way test stays as a plumbing test. It applies the declared `change` mapping to its injected sample, so `valueFrom` and `cleared: null` are covered at unit level.

### 6.5 CI

`test:e2e:a2ui` includes `tests/a2ui-catalog-render.spec.ts` and `tests/a2ui-components/`.

---

## 7. Docs, verification and issues

### 7.1 Docs (same PR)

- **AGENTS.md "Agent-Protocol-Capable Components":** the three fields, the new violation codes, and the testing bar.
- **A2UI.md:** contributor rules for `change`, `agent` and `hostOnlyActions`.
- **`docs/A2UI_INTEGRATION_GUIDE.md`:** a `null` value means the user cleared the field.
- **ADR-222** in `agentknowledge/decisions.yaml`: all three mechanisms, with the rejected alternatives from §1.3.
- CHANGELOG; concepts `ChangeSpec`, `AgentDescription` and `HostOnlyActions`; a history entry.

### 7.2 Verification before the PR

- `npm test` and `npm run test:e2e:a2ui` are green.
- **`catalog-diff` against the committed v1 baseline** shows only description changes for the 8 components.
- **A `dist/` diff against `main`** shows changes only in:
  - `a2ui/adapter/v1.js`;
  - the catalog;
  - `agentui-report.json` and the MCP descriptors;
  - `capability-manifest.json`, which carries the new manifest fields;
  - docs pages;
  - build metadata.

  Every `components/*/*.js` IIFE is byte-identical.
- Mutation checks:
  - removing ToolColorPicker's `valueFrom` fails the build with `change-mismatch`;
  - deleting an `avoidWhen` fails it with `agent-description`;
  - deleting a gesture test fails the coverage gate.

### 7.3 Issues

- #39 and #37 close.
- #31 is re-scoped (§5.3).
- #20's per-component checklist gains "write `agent.useWhen`/`avoidWhen`; declare `protocol.change` if `onChange` isn't the value; add a gesture test if interactive."

---

## 8. Risks

| Risk | Mitigation |
|---|---|
| An agent misreads an absent value as "never set" | The `value` description says that cleared is an absent path, and the agent can read the user's clear from the `onChange` action. |
| Generic samples can't render some components | The `OVERRIDES` map, with the reason recorded beside each entry; the test never skips silently. |
| The `avoidWhen` name rule is gamed by naming any component | Review catches it; the rule guarantees an alternative is named, not that it's the right one. |
| Type assignability is too strict for structurally equal types written differently | The check uses the checker's `isTypeAssignableTo`, which is structural, as the survey did. |
