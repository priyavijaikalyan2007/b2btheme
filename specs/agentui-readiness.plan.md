<!--
SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
SPDX-FileCopyrightText: 2026 Outcrop Inc
SPDX-License-Identifier: MIT
Repository: enterprise-bootstrap-theme
File GUID: 5d2a9b71-4c3e-4f8a-b6d0-7e1f2a3c9b84
Created: 2026
-->

<!-- AGENT: Implementation plan for Agent UI readiness step 1: protocol.change (#39), agent descriptions (#37), protocol.hostOnlyActions (#31 narrowed), and the catalog testing bar. Spec: specs/agentui-readiness.prd.md. -->

# Agent UI readiness, step 1: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the three manifest mechanisms and the testing bar that every remaining component needs before it joins the A2UI catalog. Fix #39's live ToolColorPicker defect on the way.

**Architecture:**
- **The classifier** (`scripts/agentui/classify.mjs`) gains a per-component *value fit*: what `onChange`'s first parameter can be mapped to. It is computed with the TypeScript checker and attached to the `onChange` member report.
- **The resolver** (`resolve.mjs`) compares the fit with the manifest's `protocol.change` and reports `change-mismatch`.
- **Catalog generation** (`catalog.mjs`) and the adapter descriptors carry the mapping; the adapter element (`a2ui/src/element.ts`) applies it on a user edit.
- **Agent descriptions** are checked after catalog assembly, in a new module, because the "names an alternative" rule needs the catalog.
- **Host-only actions** narrow gate G1.
- **Testing:** a generated Playwright render test and a coverage gate join the suite.

**Tech Stack:** Node ESM scripts, the TypeScript compiler API, Ajv 2020, vitest, Playwright (Chromium), `@a2ui/web_core` and `@a2ui/lit` 0.14.0.

## Global Constraints

- **Non-breaking (user, 2026-10-27).** No existing `create<Name>()` option, callback signature, handle method or return value changes. Every `dist/components/*/*.js` IIFE is byte-identical to `main`'s.
- **No fallbacks.** The adapter never infers a mapping. A missing classifier fact is a thrown literate error, never a default.
- **The migration lists only shrink:** no additions to `PENDING_CLASSIFICATION` or `BELOW_REQUIRED`.
- **New check [20] counts** are pinned exactly: a ceiling in `BASELINES` and a floor of the same value, each with a dated comment.
- **Agent sentences:** 30–240 characters each; each ends with `.`; neither equals the label (case-folded, punctuation stripped); `avoidWhen` names another catalog component in exact PascalCase.
- **Host-only reasons:** at least `MIN_REASON_LENGTH` (20) characters.
- **The catalog's `null` arm** wraps the literal arm: `{ anyOf: [<schema>, { "type": "null" }] }`, so `anyOf/0` (the adapter's validator pointer) accepts `null`.
- **Repo style:** Allman braces; functions of 30 lines or fewer; lines of 120 columns or fewer; SPDX and ⚓ markers. Test assertions use string matchers, never regex literals containing quotes.
- **Commits** end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. No session links in commits, PRs or issues. Push `feat/agentui-readiness` after each task.
- **Dependency:** PR #40 must merge first. This branch is stacked on it, and the PR targets `main`.

---

## Task 1: Confirm the catalog-diff classification of a `null` arm

**Files:**
- Test: `scripts/agentui/catalog-diff.test.ts`

**Interfaces:**
- Consumes: `diffCatalogs(previous, next)` → `{ breaking: string[], additive: string[] }`.
- Produces: a recorded fact for Task 4 and spec §3.4.

- [ ] **Step 1:** Add a test. The base catalog is a component whose `value` prop has `anyOf: [{type:"string"}, BINDING, CALL]`; the next has `anyOf: [{anyOf:[{type:"string"},{type:"null"}]}, BINDING, CALL]`. Expect `breaking` to equal `[]`.
- [ ] **Step 2:** Run `npx vitest run scripts/agentui/catalog-diff.test.ts`.
  - If it passes, keep the test as a regression guard.
  - If it fails, amend spec §3.4 to record the widening rule, add `diffCatalogs` support for "an arm that only widens is additive", and get the test green. Report the amendment in the PR.
- [ ] **Step 3:** Commit: `test(agentui): a null arm wrapped around a literal is an additive catalog change`.

## Task 2: Manifest types and validation

**Files:**
- Modify: `runtime/src/types.ts` (`ProtocolSpec`, `CapabilityManifest`)
- Modify: `runtime/src/registry.ts` (`PROTOCOL_KEYS`, `validateProtocol`, new `validateChange`, `validateAgent`)
- Test: `runtime/src/registry.test.ts`

**Interfaces:**
- Produces:

```ts
/** How a two-way component's onChange relates to its value (ADR-222). */
export type ChangeSpec =
    | { readonly valueFrom: string }
    | { readonly cleared: null }
    | "event";

/** Agent-facing description (ADR-222). The generator checks length and content. */
export interface AgentDescription
{
    /** When to choose this component. */
    readonly useWhen: string;
    /** When to choose something else, naming it. */
    readonly avoidWhen: string;
}
// ProtocolSpec gains: readonly change?: ChangeSpec; readonly hostOnlyActions?: Readonly<Record<string, string>>;
// CapabilityManifest gains: readonly agent?: AgentDescription;
```

- [ ] **Step 1: Failing tests** in `registry.test.ts`. Each one is a manifest built from the file's existing valid fixture plus one field, and each asserts the issue path that comes back:
  - `protocol.change: { valueFrom: "hex" }`, `{ cleared: null }` and `"event"` are valid.
  - `{ valueFrom: "" }` gives an issue at `protocol.change.valueFrom`.
  - `{ valueFrom: "a", cleared: null }`, `"two-way"` and `{ cleared: false }` give an issue at `protocol.change`.
  - `protocol.hostOnlyActions: { export: 1 }` gives an issue at `protocol.hostOnlyActions.export`.
  - `agent: { useWhen: "x", avoidWhen: "y" }` is valid here; length rules belong to the generator.
  - `agent: { useWhen: "x" }` gives an issue at `agent.avoidWhen`.
  - `agent: { useWhen: "x", avoidWhen: "y", extra: 1 }` gives an issue at `agent.extra`.
  - `agent: "x"` gives an issue at `agent`.
- [ ] **Step 2:** Run `npx vitest run runtime/src/registry.test.ts`. Expect FAIL.
- [ ] **Step 3: Implement.**
  - `PROTOCOL_KEYS` becomes `["name", "providers", "hostOnly", "schemas", "change", "hostOnlyActions"]`.
  - `validateProtocol` calls `validateChange(p.change, issues)` and `validateStringMap("protocol.hostOnlyActions", p.hostOnlyActions, "a reason string", issues)`.
  - `validateManifest` calls `validateAgent(m, issues)`.

```ts
/** Validates `protocol.change`: one of the three ChangeSpec forms (ADR-222). */
function validateChange(v: unknown, issues: ValidationIssue[]): void
{
    if (v === undefined || v === "event") { return; }

    const expected = "\"event\", { valueFrom: \"<property>\" } or { cleared: null }";

    if (!isObject(v) || Object.keys(v).length !== 1)
    {
        issues.push(typeIssue("protocol.change", expected, v));
        return;
    }

    if ("valueFrom" in v)
    {
        if (!isNonEmptyString(v.valueFrom)) { issues.push(typeIssue("protocol.change.valueFrom", "a property name", v.valueFrom)); }
        return;
    }

    if (!("cleared" in v) || v.cleared !== null) { issues.push(typeIssue("protocol.change", expected, v)); }
}

/** Validates `agent`: exactly useWhen and avoidWhen, both non-empty strings. */
function validateAgent(m: Record<string, unknown>, issues: ValidationIssue[]): void
{
    if (m.agent === undefined) { return; }

    if (!isObject(m.agent))
    {
        issues.push(typeIssue("agent", "an object with useWhen and avoidWhen", m.agent));
        return;
    }

    unknownKeys("agent", m.agent, AGENT_KEYS, issues);

    for (const key of AGENT_KEYS)
    {
        if (!isNonEmptyString(m.agent[key])) { issues.push(typeIssue(`agent.${key}`, "a non-empty sentence", m.agent[key])); }
    }
}

/** The keys `agent` carries. */
const AGENT_KEYS: readonly string[] = ["useWhen", "avoidWhen"];
```

- [ ] **Step 4:** Run the test again. Expect PASS. Then run `npx tsc --noEmit -p tsconfig.json`.
- [ ] **Step 5:** Commit: `feat(runtime): manifest fields protocol.change, protocol.hostOnlyActions and agent (ADR-222)`.

## Task 3: Classifier value fit and the resolver's `change-mismatch`

**Files:**
- Modify: `scripts/agentui/classify.mjs`:
  - `factoryOptionsType` also returns `handleType`;
  - `classifyMembers(ctx, optionsType, location, handleType)`;
  - new `valueFit`.
- Modify: `scripts/agentui/resolve.mjs`:
  - `VIOLATION.CHANGE_MISMATCH = "change-mismatch"`;
  - the `twoWayValue` rule;
  - `checkChange`;
  - the surface's `change`.
- Modify: `scripts/agentui/generate.mjs`:
  - `classifyFleet` passes `handleType`;
  - `BACKLOG_COUNTS.changeMismatches`;
  - `measureClassification` returns it.
- Modify: `scripts/audit-counts.mjs`: the `changeMismatches` ceiling and floor, and the measure.
- Modify: `scripts/agentui/fixtures/widget.ts`: add a picker factory with an item payload, and a nullable one.
- Test: `scripts/agentui/classify.test.ts`, `scripts/agentui/resolve.test.ts`, `scripts/agentui/generate.test.ts`.

**Interfaces:**
- The `onChange` member report gains `valueFit` when the options have `value` and `onChange` is a function:

```js
/** @typedef {{ param: string, direct: boolean, withoutNull: boolean, fromProperty: string[], setValueAcceptsNull: boolean }} ValueFit */
```

  | Field | Meaning |
  |---|---|
  | `param` | the first parameter's type as text, or `"(none)"` |
  | `direct` | the parameter is assignable to the non-nullable `value` type |
  | `withoutNull` | the parameter, minus `null` and `undefined`, is assignable |
  | `fromProperty` | the names of properties present on **every** arm of the parameter and assignable to `value` |
  | `setValueAcceptsNull` | some arm of the handle's `setValue` first parameter is `null` |

- `resolveSurface(manifest, members)` returns `{ …, change: ChangeSpec | null }`.
- `twoWayValue` is true when `value` exists, `onChange` is a function, and `protocol.change !== "event"`.

Steps:

- [ ] **Step 1: Fixture.** Add to `scripts/agentui/fixtures/widget.ts`:

```ts
export interface Swatch { hex: string; label: string }
export interface SwatchPickerOptions
{
    /** Selected hex. */
    value?: string;
    /** Fires with the chosen swatch. */
    onChange?: (swatch: Swatch) => void;
}
export function createSwatchPicker(options: SwatchPickerOptions): { setValue(hex: string): void }
{ void options; return { setValue: () => undefined }; }

export interface ClearableOptions
{
    /** Selected day. */
    value?: Date;
    /** Fires with the day, or null when cleared. */
    onChange?: (day: Date | null) => void;
}
export function createClearable(options: ClearableOptions): { setValue(day: Date | null): void }
{ void options; return { setValue: () => undefined }; }
```

- [ ] **Step 2: Failing classifier tests.** Read with `factoryOptionsType(ctx, file, "createSwatchPicker", 0)` and pass `handleType` through:
  - The swatch picker's `onChange.valueFit` is `{ direct: false, withoutNull: false, fromProperty: ["hex"], setValueAcceptsNull: false }`, and `param` contains `Swatch`.
  - The clearable's is `{ direct: false, withoutNull: true, fromProperty: [], setValueAcceptsNull: true }`.
  - The existing `widget` `onChange` (`(value: Date) => void` beside `value?: Date`) has `direct: true`.
  - A member other than `onChange` has no `valueFit`.
- [ ] **Step 3: Implement the classifier.**

```js
// factoryOptionsType: return { type: …, location: source, handleType: signature.getReturnType() };

export function classifyMembers(ctx, optionsType, location, handleType)
{
    const reports = ctx.checker.getPropertiesOfType(optionsType).map((symbol) => classifyMember(ctx, symbol, location));
    const fit = valueFit(ctx, optionsType, location, handleType);

    return fit ? reports.map((r) => (r.name === "onChange" ? { ...r, valueFit: fit } : r)) : reports;
}

/** What onChange's first parameter can be mapped to (ADR-222); null without value and a function onChange. */
function valueFit(ctx, optionsType, location, handleType)
{
    const c = ctx.checker;
    const typeOf = (s) => c.getNonNullableType(c.getTypeOfSymbolAtLocation(s, location));
    const value = optionsType.getProperty("value");
    const onChange = optionsType.getProperty("onChange");
    const signature = onChange && unionArms(typeOf(onChange)).flatMap((a) => a.getCallSignatures())[0];

    if (!value || !signature) { return null; }

    const target = typeOf(value);
    const first = signature.parameters[0];
    const param = first ? c.getTypeOfSymbolAtLocation(first, location) : null;

    return {
        param: param ? c.typeToString(param) : "(none)",
        direct: param !== null && c.isTypeAssignableTo(param, target),
        withoutNull: param !== null && c.isTypeAssignableTo(c.getNonNullableType(param), target),
        fromProperty: param ? assignableProperties(ctx, param, target) : [],
        setValueAcceptsNull: acceptsNull(ctx, handleType, location),
    };
}

/** Properties on every arm of `t` whose type is assignable to `target`. */
function assignableProperties(ctx, t, target)
{
    const arms = unionArms(t);
    const names = ctx.checker.getPropertiesOfType(arms[0]).map((p) => p.name);

    return names.filter((n) => arms.every((arm) =>
    {
        const p = arm.getProperty(n);
        return p !== undefined && ctx.checker.isTypeAssignableTo(ctx.checker.getTypeOfSymbol(p), target);
    }));
}

/** True when some arm of the handle's setValue first parameter is null. */
function acceptsNull(ctx, handleType, location)
{
    const setValue = handleType?.getProperty("setValue");
    const signature = setValue && ctx.checker.getTypeOfSymbolAtLocation(setValue, location).getCallSignatures()[0];
    const first = signature?.parameters[0];

    return first !== undefined
        && unionArms(ctx.checker.getTypeOfSymbolAtLocation(first, location)).some((a) => (a.flags & ts.TypeFlags.Null) !== 0);
}
```

  Update `generate.mjs`'s `classifyFleet` to destructure `handleType` and pass it on. Update the other callers: `classify.test.ts` helper `read`, and the survey-free tests.
- [ ] **Step 4: Failing resolver tests** in `resolve.test.ts`:
  - Add a helper: `fit(over = {})` returns `{ param: "string", direct: true, withoutNull: true, fromProperty: [], setValueAcceptsNull: false, ...over }`.
  - Update the four existing tests that build `member("onChange", "function")` beside `value` to pass `{ valueFit: fit() }`.
  - New tests:
    - No declaration with `direct: false`: `codes(...)` contains `"change-mismatch"`, and the message contains `protocol.change`.
    - `change: { valueFrom: "hex" }` with `fromProperty: ["hex"]`: no violation, and `surface.change` equals `{ valueFrom: "hex" }`.
    - `change: { valueFrom: "rgb" }` with `fromProperty: ["hex"]`: `change-mismatch`, and the message names `hex` as the property that would fit.
    - `change: { cleared: null }` with `withoutNull: true, setValueAcceptsNull: true`: no violation.
    - The same with `setValueAcceptsNull: false`: `change-mismatch`, and the message contains `setValue`.
    - `change: "event"`: `twoWayValue` is false. With no emits naming `onChange`, the codes contain `unclassified` for `onChange`. With `emits: [{ name: "change", payload: "record", multi: false, legacyOption: "onChange" }]`, there are no violations.
    - `change` declared with no `value` member: `stale-declaration`.
    - A two-way `onChange` member without `valueFit` throws an error containing `valueFit`.
- [ ] **Step 5: Implement the resolver.**

```js
// VIOLATION gains: CHANGE_MISMATCH: "change-mismatch",
// in resolveSurface:
const change = protocol.change ?? null;
const hasPair = ctx.byName.has("value") && ctx.byName.get("onChange")?.cls === MEMBER_CLASS.FUNCTION;
const twoWayValue = hasPair && change !== "event";
// … after checkValueLevel:
checkChange(ctx, change, hasPair, twoWayValue);
// return { …, change: twoWayValue ? change : null, … }   ("event" is expressed as twoWayValue false)

/** protocol.change against the classifier's value fit (ADR-222). */
function checkChange(ctx, change, hasPair, twoWayValue)
{
    if (change !== null && !hasPair)
    {
        violate(ctx, "change", VIOLATION.STALE_DECLARATION, "protocol.change is declared, but the options do not have both "
            + "`value` and a function `onChange`, so there is nothing to map. Remove it.");
        return;
    }

    if (!twoWayValue) { return; }

    const fit = ctx.byName.get("onChange").valueFit;

    if (fit === undefined)
    {
        throw new Error(`${ctx.manifest.name}: the classifier gave onChange no valueFit, so its write-back cannot be `
            + "checked. classifyMembers must be called with the factory's handle type.");
    }

    const problem = changeProblem(change, fit);

    if (problem) { violate(ctx, "onChange", VIOLATION.CHANGE_MISMATCH, `${problem} ${CHANGE_FORMS}`); }
}

const CHANGE_FORMS = "Declare protocol.change: { valueFrom: \"<property>\" } when the value is a property of the "
    + "payload, { cleared: null } when the payload is the value or null on clear, or \"event\" when onChange is "
    + "not a value change (value becomes one-way; name onChange in an emits channel).";

/** Why the declared mapping does not fit, or null when it does. */
function changeProblem(change, fit)
{
    if (change === null)
    {
        return fit.direct ? null : `passes ${fit.param}, which is not assignable to value, so the adapter would write `
            + "the wrong type to the path bound to value.";
    }

    if ("valueFrom" in change)
    {
        return fit.fromProperty.includes(change.valueFrom) ? null : `has no property "${change.valueFrom}" assignable to `
            + `value on every arm of ${fit.param}${fit.fromProperty.length ? `; ${fit.fromProperty.join(", ")} would fit` : ""}.`;
    }

    if (!fit.withoutNull) { return `passes ${fit.param}, which is not assignable to value even without null.`; }

    return fit.setValueAcceptsNull ? null : "is declared { cleared: null }, but the handle's setValue does not accept "
        + "null, so an agent clearing the value could not apply it.";
}
```

- [ ] **Step 6: Backlog count.**
  - `generate.mjs`: `BACKLOG_COUNTS` gains `changeMismatches: new Set([VIOLATION.CHANGE_MISMATCH])`, and `measureClassification` returns `changeMismatches`.
  - `audit-counts.mjs`: add `changeMismatches` to the ceiling table, the floor table, the zeroed counts and the measure. Set it to the measured value, expected **18** (the 19 surveyed minus toolcolorpicker, which Task 4 declares). Write a dated comment, `// ADR-222 (2026-10-27): pending components whose onChange is not their value (#39). Target 0. Pinned exactly by the floor.`
  - Until Task 4 lands, toolcolorpicker (in the catalog) fails the build. So **Tasks 3 and 4 are committed together**, at the end of Task 4.
- [ ] **Step 7:** Run `npx vitest run scripts/agentui/classify.test.ts scripts/agentui/resolve.test.ts scripts/agentui/generate.test.ts`. Expect PASS. Leave the work uncommitted for Task 4.

## Task 4: The catalog, descriptors and adapter apply `change`; ToolColorPicker declares `valueFrom`

**Files:**
- Modify: `scripts/agentui/catalog.mjs` (`dataProps`: the `null` arm)
- Modify: `scripts/agentui/adapter-descriptors.mjs` (`descriptorFor`: `change`)
- Modify: `a2ui/src/types.ts` (`AdapterDescriptor.change?`)
- Modify: `a2ui/src/element.ts` (`#onUserValue`)
- Modify: `a2ui/fleet-adapter.test.ts` (the two-way test applies the mapping)
- Modify: `components/toolcolorpicker/toolcolorpicker.manifest.ts`
- Modify: `tests/a2ui-adapter.spec.ts` (drop `test.fail`)
- Test: `scripts/agentui/catalog.test.ts`, `scripts/agentui/adapter-descriptors.test.ts`, `a2ui/src/element.test.ts`

**Interfaces:**
- `AdapterDescriptor.change?: { valueFrom: string } | { cleared: null }`. It is present only when declared and two-way.

- [ ] **Step 1: Failing tests.**
  - `catalog.test.ts`: a surface with `twoWayValue: true, change: { cleared: null }` gives a `value` prop whose `anyOf[0]` equals `{ anyOf: [<schema>, { type: "null" }] }`. With `change: { valueFrom: "hex" }`, `anyOf[0]` is the plain schema.
  - `adapter-descriptors.test.ts`: the descriptor carries `change` when the surface has it, and omits the key otherwise.
  - `element.test.ts`, following the file's existing two-way test pattern:
    - with `change: { valueFrom: "hex" }`, invoking the change option with `{ hex: "#00f", label: "Blue" }` writes `"#00f"` to the bound path;
    - with `change: { cleared: null }`, invoking it with `null` writes `null`;
    - an echo of the mapped value is not re-applied.
- [ ] **Step 2:** Run them. Expect FAIL.
- [ ] **Step 3: Implement.**

```js
// catalog.mjs dataProps: after computing `schema`
const literal = d.name === "value" && surface.twoWayValue && surface.change && "cleared" in surface.change
    ? { anyOf: [schema, { type: "null" }] } : schema;
return [d.name, { description: `${description ?? d.jsdoc}${twoWay}`, ...literalBindingOrCall(literal) }];

// adapter-descriptors.mjs descriptorFor:
...(surface.change ? { change: surface.change } : {}),
```

  In `element.ts` `#onUserValue`, compute `const mapped = mapChange(this.#env.descriptor.change, value);` right after the guard, and write `mapped` instead of `value`, including into `#lastWritten`. `{ cleared: null }` writes the payload unchanged, because its effect is in the schema, so the helper only needs the `valueFrom` branch:

```ts
/** Applies the manifest's declared change mapping (ADR-222); the build proved the types. */
function mapChange(change: AdapterDescriptor["change"], payload: unknown): unknown
{
    return change !== undefined && "valueFrom" in change ? (payload as Record<string, unknown>)[change.valueFrom] : payload;
}
```

  - `fleet-adapter.test.ts`: in the two-way test, when `d.change` has `valueFrom`, inject `{ [d.change.valueFrom]: edit }` and expect `edit` at `/p/value`. When `d.change` has `cleared`, add a second assertion that injecting `null` writes `null`. Add `change?` to the local `Descriptor` type.
  - `toolcolorpicker.manifest.ts`: add `protocol: { change: { valueFrom: "hex" } },` with a comment: `// onChange passes the ToolColor; value is its hex (#39, ADR-222).`
  - `tests/a2ui-adapter.spec.ts`: remove the `test.fail(...)` line and its comment.
- [ ] **Step 4: Verify.**
  - `npm run build`, then `npx vitest run scripts/agentui a2ui runtime/fleet-conformance.test.ts`.
  - `npx playwright test tests/a2ui-adapter.spec.ts -g ToolColorPicker` must now **pass**.
  - Check the count: `node -e "import('./scripts/agentui/generate.mjs').then(m=>console.log(m.measureClassification()))"` prints `changeMismatches: 18`.
- [ ] **Step 5: Mutation check.** Delete the `protocol` line from the ToolColorPicker manifest. `npm run build:manifest && npm run build:agentui` must fail with `change-mismatch` and the text `hex would fit`. Restore it.
- [ ] **Step 6:** Commit Tasks 3 and 4 together: `feat(agentui): protocol.change maps onChange to value, checked statically; fix ToolColorPicker write-back (#39)`. Push.

## Task 5: `protocol.hostOnlyActions` and the narrowed G1

**Files:**
- Modify: `scripts/agentui/resolve.mjs` (`resolveActions`, `checkStaleDeclarations`, the surface's `hostOnly`)
- Modify: `scripts/agentui/adapter-descriptors.mjs` (`unsupported` message)
- Modify: `scripts/agentui/catalog.mjs` (`describeComponent` takes the surface's actions)
- Test: `scripts/agentui/resolve.test.ts`, `scripts/agentui/adapter-descriptors.test.ts`, `scripts/agentui/catalog.test.ts`

**Interfaces:**
- `surface.actions` holds only actions that are **not** host-only.
- `surface.hostOnly` gains `"actions.<id>": reason` for each host-only action, so it appears in `agentui-report.json` with no change to the report writer.
- `describeComponent(manifest, surface)` lists `surface.actions` labels in its "Actions:" sentence.

- [ ] **Step 1: Failing tests.**
  - A manifest with `actions: [{ id: "export", … }]` and `protocol.hostOnlyActions: { export: REASON }` gives `surface.actions` equal to `[]` and `surface.hostOnly["actions.export"]` equal to `REASON`.
  - `hostOnlyActions: { exprt: REASON }` gives `stale-declaration`; `{ export: "short" }` gives `short-reason`.
  - `unsupported()` for a component with an undeclared action names `protocol.hostOnlyActions` and `#31`.
  - `describeComponent` with a host-only action has no "Actions:" sentence.
- [ ] **Step 2: Implement.**
  - `resolveActions(manifest, protocol)` filters out ids in `protocol.hostOnlyActions`.
  - In `checkStaleDeclarations`, call `staleKeys(ctx, protocol.hostOnlyActions, (k) => ctx.manifest.actions.some((a) => a.id === k), "protocol.hostOnlyActions")` and loop the short-reason check over the merged entries of `hostOnly` and `hostOnlyActions`.
  - Surface `hostOnly`: `{ ...protocol.hostOnly, ...Object.fromEntries(Object.entries(protocol.hostOnlyActions ?? {}).map(([k, r]) => [`actions.${k}`, r])) }`.
  - Add to the G1 message: `"…or declare it in protocol.hostOnlyActions with a reason when an agent cannot act on it."`
  - `describeComponent(manifest, surface)` uses `surface.actions`. Update both callers in `catalog.mjs`.
- [ ] **Step 3:** Run the three test files, then `npm run build:agentui`. Expect PASS and an unchanged catalog.
- [ ] **Step 4:** Commit: `feat(agentui): protocol.hostOnlyActions keeps a manifest action out of the catalog, narrowing G1 (#31)`. Push.

## Task 6: Agent descriptions and the `agent-description` check

**Files:**
- Create: `scripts/agentui/agent-description.mjs` and `scripts/agentui/agent-description.test.ts`
- Modify: `scripts/agentui/generate.mjs` (`runPipeline`)
- Modify: `scripts/agentui/catalog.mjs` (`describeComponent`)
- Modify: the 8 manifests: `components/{chatdock,graphlegend,orientationpicker,ruler,skeletonloader,stickynote,toolcolorpicker,workspaceshell}/*.manifest.ts`
- Modify: `scripts/agentui/fixtures` manifests used by `generate.test.ts`, if any reach the catalog
- Test: `scripts/agentui/catalog.test.ts`, `scripts/agentui/generate.test.ts`

**Interfaces:**
- `checkAgentDescription(manifest, catalogNames: string[]): string[]` returns literate messages, each ending `(components/<name>/<name>.manifest.ts)`.
- `AGENT_SENTENCE_MIN = 30`, `AGENT_SENTENCE_MAX = 240`.

- [ ] **Step 1: Failing tests** in `agent-description.test.ts`, using `names = ["Button", "ChoicePicker", "OrientationPicker"]` and `label: "Orientation Picker"`:
  - A valid pair gives `[]`.
  - `agent` missing gives one message containing `agent.useWhen`.
  - A 10-character `useWhen` gives a message containing `30`.
  - A 241-character one gives a message containing `240`.
  - A sentence without a final `.` is reported.
  - `useWhen: "Orientation picker."` is reported as repeating the label. It is also too short; assert both messages.
  - An `avoidWhen` naming only `OrientationPicker` (itself) is reported with a message containing `another catalog component`.
  - An `avoidWhen` naming `ChoicePicker` passes.
  - `choicepicker` in lower case fails.
- [ ] **Step 2: Implement.**

```js
/*
 * SPDX…
 * ⚓ COMPONENT: AgentDescriptionCheck
 * 📜 PURPOSE: The agent-description rule (ADR-222, readiness spec §4.3): every
 *    catalog component says when to choose it and when to choose something
 *    else, naming that alternative, so a model can pick between overlapping
 *    components. Runs after catalog assembly; the name rule needs the catalog.
 * 🔗 RELATES: [[AgentUiCatalog]], [[AgentUiGenerator]]
 */

export const AGENT_SENTENCE_MIN = 30;
export const AGENT_SENTENCE_MAX = 240;

/** Literate messages for one catalog component's agent description; [] when it passes. */
export function checkAgentDescription(manifest, catalogNames)
{
    const where = `(components/${manifest.name}/${manifest.name}.manifest.ts)`;
    const agent = manifest.agent ?? {};
    const self = catalogNameOf(manifest);
    const out = ["useWhen", "avoidWhen"].flatMap((k) => sentenceProblems(k, agent[k], manifest.label));

    if (typeof agent.avoidWhen === "string" && !catalogNames.some((n) => n !== self && wordIn(agent.avoidWhen, n)))
    {
        out.push("agent.avoidWhen names no other catalog component. Name the one to use instead, exactly as the "
            + "catalog spells it (for example ChoicePicker or TextField).");
    }

    return out.map((m) => `${manifest.name}: ${m} ${where}`);
}
```

  Supporting helpers in the same file:
  - `sentenceProblems(key, text, label)`: missing; `< 30`; `> 240`; not ending with `.`; `fold(text) === fold(label)`, where `fold` lower-cases and strips everything but letters and digits.
  - `wordIn(text, name)`: `new RegExp("\\b" + name + "\\b").test(text)`.
  - `catalogNameOf(manifest)`: `import { catalogName } from "./catalog.mjs"`.

  In `runPipeline`, after `buildCatalog`:

```js
const names = Object.keys(catalog.components);
errors.push(...ready.flatMap((c) => checkAgentDescription(c.manifest, names)));
```

  In `describeComponent(manifest, surface)`, output in this order: `${label}.`, `agent.useWhen`, `agent.avoidWhen` (each only when present), then the `affords` sentences, then the actions sentence.
- [ ] **Step 3: Write the 8 descriptions.** Use these exact texts, and check each against the rules:

  | Manifest | useWhen | avoidWhen |
  |---|---|---|
  | chatdock | `Show a running conversation with a message input, so the user can talk to the agent inside the surface.` | `For a single free-text answer use TextField; for a static transcript use List with Text.` |
  | graphlegend | `Explain the node and edge types of a graph or diagram, with colours, icons and optional counts.` | `For a plain key–value list use List with Text; it is not a chart legend for numeric series.` |
  | orientationpicker | `Let the user choose portrait or landscape page orientation, shown as two page icons.` | `For any other choice between a few options use ChoicePicker.` |
  | ruler | `Show a measuring ruler in px, cm, mm or inches beside a canvas or document area.` | `For choosing a number use Slider or TextField; a ruler only displays a scale.` |
  | skeletonloader | `Hold the place of content that is still loading, shaped like text, a card, an avatar or a table.` | `For progress the user should watch use Text with a status message; never leave it shown after the content arrives.` |
  | stickynote | `Let the user write or read one short free-form note, styled as a coloured sticky note.` | `For a labelled form input use TextField; for read-only prose use Text.` |
  | toolcolorpicker | `Let the user pick a drawing colour for a pen, marker, pencil, highlighter or brush from a small palette.` | `For choosing between named options that are not colours use ChoicePicker.` |
  | workspaceshell | `Show several named canvases as tabs the user can select, pin, close or create, with a history scrubber.` | `For simple tabbed content without canvas actions use Tabs.` |

  Add each as `agent: { useWhen: "…", avoidWhen: "…" },`, after `category`.
- [ ] **Step 4:** Run `npx vitest run scripts/agentui`, then `npm run build`.
  - `dist/a2ui/catalog/v1.json` descriptions now carry both sentences.
  - `node scripts/agentui/catalog-diff.mjs` (or the build's baseline check) reports only description changes.
  - Update the playground prompt test if it pins a description.
- [ ] **Step 5: Mutation check.** Remove `avoidWhen` from `ruler.manifest.ts`. `npm run build:manifest && npm run build:agentui` must fail naming `ruler`. Restore it.
- [ ] **Step 6:** Commit: `feat(agentui): agent.useWhen/avoidWhen describe every catalog component; the build requires them (#37)`. Push.

## Task 7: The testing bar

**Files:**
- Create: `tests/a2ui/adapter-page.ts`, moved from `tests/a2ui-adapter.spec.ts`: `ORIGIN`, `CATALOG`, `V`, `open`, `send`, `surface`, `errors`, `actions`, `dm`, `handleOf`, and the `beforeAll` harness builder exported as `useHarness()`.
- Create: `tests/a2ui/catalog-valid.ts`: `expectCatalogValid(component, prop, value)`.
- Create: `tests/a2ui-components/catalog-v1.spec.ts`: the per-component tests moved from `tests/a2ui-adapter.spec.ts`, each title starting with the component name.
- Create: `tests/a2ui-catalog-render.spec.ts`.
- Create: `scripts/agentui/gesture-coverage.test.ts`.
- Modify: `tests/a2ui-adapter.spec.ts`, which keeps theme, error-code and React tests.
- Modify: `package.json` (`test:e2e:a2ui`).

**Interfaces:**
- `expectCatalogValid(component: string, prop: string, value: unknown): Promise<void>` builds `{ id: "x", component, [prop]: value }`. It validates that object with `messageValidators.components[component]` from `agentdemo/.out/gen/message-validator.mjs`, and throws with the Ajv errors when invalid. It calls `writeMessageValidator(repoRoot)` once per worker if the file is missing.

Steps:

- [ ] **Step 1: Extract the helpers** to `tests/a2ui/adapter-page.ts`, with no behaviour change. Run `npx playwright test tests/a2ui-adapter.spec.ts`; expect 13 passed.
- [ ] **Step 2: Move the per-component tests.**
  - Ruler, OrientationPicker (Lit), StickyNote, and PR #40's five move to `tests/a2ui-components/catalog-v1.spec.ts`.
  - Titles become `"<Component>: <behaviour>"`, for example `"ToolColorPicker: shows the agent's colours, and the user's pick is written back"`.
  - ToolColorPicker additionally asserts `await expectCatalogValid("ToolColorPicker", "value", await dm(page, "s", "/c"))`.
  - OrientationPicker asserts the same for `/o`; StickyNote for `/note`.
  - Run both specs; expect all to pass, with the adapter spec down to its adapter-level tests.
- [ ] **Step 3: The generated render test.**

```ts
// tests/a2ui-catalog-render.spec.ts
import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

import { sampleValue } from "../a2ui/sample-values";
import { errors, open, send, surface, useHarness } from "./a2ui/adapter-page";

const DIST = path.join(__dirname, "..", "dist");
const CATALOG = JSON.parse(fs.readFileSync(path.join(DIST, "a2ui", "catalog", "v1.json"), "utf8"));
const DESCRIPTORS: { name: string; tagName: string; props: Record<string, unknown> }[] =
    JSON.parse(fs.readFileSync(path.join(DIST, "agentui-report.json"), "utf8")).adapter.descriptors;

/** Props a component needs beyond generic samples to render, with the reason. Empty is the goal. */
const OVERRIDES: Record<string, Record<string, unknown>> = {};

useHarness();

for (const d of DESCRIPTORS)
{
    test(`${d.name}: renders from catalog samples in a real browser`, async ({ page }) =>
    {
        const consoleErrors: string[] = [];
        page.on("console", (m) => { if (m.type() === "error") { consoleErrors.push(m.text()); } });
        const props = Object.fromEntries(Object.keys(d.props).map((p) =>
            [p, sampleValue(CATALOG.components[d.name].allOf[2].properties[p].anyOf[0], 0, CATALOG)]));

        await open(page, "lit");
        await send(page, surface("s", { id: "root", component: d.name, ...props, ...OVERRIDES[d.name] }));

        const box = await page.locator(`${d.tagName} .outcrop-host`).first().boundingBox();
        expect(box && box.width * box.height, `${d.name} rendered nothing visible`).toBeGreaterThan(0);
        expect(await errors(page)).toEqual([]);
        expect(consoleErrors).toEqual([]);
    });
}
```

  Run it. A failure means a real rendering problem or a sample gap:
  - fix the component's catalog schema description, or add an `OVERRIDES` entry with a `// reason` comment;
  - **never** skip.
- [ ] **Step 4: The coverage gate.**

```ts
// scripts/agentui/gesture-coverage.test.ts — ⚓ TESTS: readiness spec §6.3
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

const ROOT = path.join(__dirname, "..", "..");
const report = path.join(ROOT, "dist", "agentui-report.json");
const DIR = path.join(ROOT, "tests", "a2ui-components");

describe.skipIf(!fs.existsSync(report))("every interactive catalog component has a gesture test", () =>
{
    const descriptors: { name: string; twoWay: boolean; events: unknown[] }[] =
        JSON.parse(fs.readFileSync(report, "utf8")).adapter.descriptors;
    const titles = fs.readdirSync(DIR).filter((f) => f.endsWith(".spec.ts"))
        .flatMap((f) => [...fs.readFileSync(path.join(DIR, f), "utf8").matchAll(/test\("([A-Za-z]+):/g)].map((m) => m[1]));

    for (const d of descriptors.filter((x) => x.twoWay || x.events.length > 0))
    {
        test(d.name, () => { expect(titles, `${d.name} has no gesture test in tests/a2ui-components/`).toContain(d.name); });
    }
});
```

  Check how other dist-dependent unit tests behave when `dist` is absent (e.g. `a2ui/fleet-adapter.test.ts` throws). Match that: **throw, do not skip**, if the suite's convention is to require a build. Replace `describe.skipIf` accordingly.
- [ ] **Step 5:** `package.json` `test:e2e:a2ui` adds `tests/a2ui-catalog-render.spec.ts tests/a2ui-components`. Run `npm run test:e2e:a2ui` and `npm test`.
- [ ] **Step 6: Mutation check.** Rename `"ChatDock:"` to `"Chat:"` in the gesture spec; the coverage test fails naming ChatDock. Restore it.
- [ ] **Step 7:** Commit: `test(a2ui): generated render test for every catalog component, gesture tests and their coverage gate`. Push.

## Task 8: Docs, ADR, verification and the PR

**Files:**
- Modify: `AGENTS.md` ("Agent-Protocol-Capable Components"), `A2UI.md`, `docs/A2UI_INTEGRATION_GUIDE.md`, `CHANGELOG.md`
- Modify: `agentknowledge/decisions.yaml` (ADR-222), `agentknowledge/concepts.yaml` (`ChangeSpec`, `AgentDescription`, `HostOnlyActions`), and the history file used by previous entries
- Modify: `specs/agentui-readiness.prd.md` (status, amendments)

- [ ] **Step 1: AGENTS.md.** Add the three fields, with one example each, plus the codes `change-mismatch` and `agent-description`. Add the testing bar: the render test is automatic; gesture tests are required for two-way and event components; the coverage gate.
- [ ] **Step 2: A2UI.md.** Add contributor rules, and point to the AGENTS.md section. The integration guide gains: "`null` in a bound value means the user cleared the field (components declaring `cleared: null`)."
- [ ] **Step 3: ADR-222.** Record the context (#39 survey, #37, #31), the decision R2–R5, the rejected alternatives, and the consequences. Add the concepts and a history entry. Add a CHANGELOG entry under Unreleased.
- [ ] **Step 4: Spec amendments.**
  - §4.2: the MCP descriptors carry no component description today, so the shared-function claim applies once #19 adds one.
  - Record the Task 1 result.
  - Set the status to Implemented, with the date.
- [ ] **Step 5: Verification.**
  - `npm test` (all, including structure checks) and `npm run test:e2e:a2ui` are green.
  - `npm run audit:vendor` passes.
  - Build `main` in a worktree and diff `dist/`. Allowed differences: `a2ui/adapter/v1.js`, `a2ui/catalog/v1.json`, `agentui-report.json`, `schemas/`, `mcp/`, `capability-manifest.json`, docs pages, `build.json` and `lib-manifest.json`. Every `components/*/*.js` must be identical; check with `cmp`.
- [ ] **Step 6: Issues.**
  - Comment on #39 and #37: fixed by this PR.
  - Comment on #31 with the re-scope.
  - Comment on #20 with the added checklist items.
  - Use `GH_TOKEN="$(gh auth token --user priyavijaikalyan2007)" gh …`.
- [ ] **Step 7:** Commit the docs: `docs(agentui): ADR-222 and contributor docs for readiness step 1`. Push. Once PR #40 has merged, open the PR against `main` with the body ending `🤖 Generated with [Claude Code](https://claude.com/claude-code)` (no session link).
