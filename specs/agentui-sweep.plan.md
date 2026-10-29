<!--
SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
SPDX-FileCopyrightText: 2026 Outcrop Inc
SPDX-License-Identifier: MIT
Repository: enterprise-bootstrap-theme
File GUID: 3e9c2f6a-81d4-4b07-a5e2-c4f19d7b6a30
Created: 2026
-->

<!-- AGENT: Implementation plan for Agent UI readiness step 2. P0: provider support in the A2UI adapter (#31) with TreeView as its pilot. Batches B1-B9 add their own sections later. Spec: specs/agentui-sweep.prd.md. -->

# Agent UI readiness, step 2: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## P0: provider support (#31) and the TreeView pilot

**Goal:** an A2UI agent can answer a component's data requests: TreeView's lazy children and its server-side search. TreeView joins catalog v1.

**Architecture:**
- **Manifest:** `ProviderSpec` gains an optional `concurrency` (`"latest"` | `"queue"`).
- **Generator:**
  - descriptors carry each provider with its concurrency defaulted;
  - the catalog moves each provider's answer schema to `$defs["<Component>__<request>Result"]` and makes the `<request>Result` prop binding-only;
  - validators compile from that def;
  - gate G1 stops failing on providers.
- **Adapter:** a new `a2ui/src/providers.ts` keeps one outstanding request per provider:
  - it deletes the result path, writes the request under `eventData`, dispatches `on<Request>`, and treats the next valid write to the result path as the answer;
  - it applies `latest` or `queue` to requests that arrive while one is outstanding;
  - it times out after `providerTimeoutMs`, reporting `OUTCROP_PROVIDER_TIMEOUT`;
  - teardown drops pending promises.

  The element passes its provider callbacks to the factory and releases them on unmount.
- **TreeView** declares two providers and its host-only members, and leaves `PENDING_CLASSIFICATION`.

**Tech Stack:** Node ESM scripts, Ajv 2020 standalone, vitest (jsdom), Playwright (Chromium), `@a2ui/web_core` and `@a2ui/lit` 0.14.0.

## Global Constraints

- **Non-breaking (user, 2026-10-27).** No existing `create<Name>()` option, callback signature, handle method or return value changes. Every `dist/components/*/*.js` IIFE is byte-identical to `main`'s; P0 changes no component source. TreeView's manifest and conformance glue are not shipped in its IIFE.
- **No fallbacks.** A missing validator, binding or config value is a literate error or a documented "not wired", never a default guess. The one default, `concurrency: "latest"`, is applied by the generator, so the adapter never defaults it.
- **The migration lists only shrink.** No additions to `PENDING_CLASSIFICATION` or `BELOW_REQUIRED`.
- **Check [20] pins** move exactly, ceiling and floor together, each with a dated comment.
- **One outstanding request per provider.** `latest`: one waiting slot; a replaced request's promise resolves with its replacement's answer. `queue`: unbounded FIFO.
- **The provider callback is passed only when all three are set:** the `on<Request>` action, `<request>Result` as a binding, and `eventData` as a binding. They're read at construct time.
- **Order when sending:** delete the result path, write `<eventData>/<request>`, dispatch `on<Request>`, start the timer.
- **An answer** is the next non-`undefined` write to the result path while a request is outstanding.
  - It's validated with `validators["<Name>.<request>Result"]`; a failure is `VALIDATION_FAILED` with the path, and the request stays open.
  - A valid answer resolves the request with `structuredClone(value)`.
- **`providerTimeoutMs`:** a `createOutcropCatalog` option, default `30000`, a positive integer, page-global like `assetBaseUrl`. On expiry: reject with an `Error`, report `OUTCROP_PROVIDER_TIMEOUT` with the result path, and send the next request.
- **Teardown** drops pending promises unsettled, clears the queue, stops timers and unsubscribes.
- **Answer schema location:** `$defs["<Component>__<request>Result"]`. The `<request>Result` prop is `{ description, $ref: DataBinding }`.
- **Agent sentences:** 30–240 characters, ending with `.`, not the label; `avoidWhen` names another catalog component exactly.
- **Host-only reasons:** at least 20 characters (`MIN_REASON_LENGTH`).
- **Repo style:**
  - Allman braces; functions of 30 lines or fewer; lines of 120 columns or fewer;
  - SPDX and ⚓ markers on new files;
  - test assertions use string matchers or `RegExp` built from strings, never regex literals containing quotes (the test-assertion parser misreads them);
  - test titles are string literals or `test.each(...)("%s …")`.
- **Commits** end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never put session links in commits, PRs or issues. Push `feat/agentui-providers` after each task.
- **gh commands** run as `GH_TOKEN="$(gh auth token --user priyavijaikalyan2007)" gh …`; never switch the gh account.

## File map

| File | Change | Task |
|---|---|---|
| `runtime/src/types.ts` | `ProviderSpec.concurrency` | 1 |
| `runtime/src/registry.ts`, `registry.test.ts` | accept and validate `concurrency` | 1 |
| `runtime/runtime.ts` | regenerated bundle (committed) | 1 |
| `scripts/agentui/catalog.mjs`, `catalog.test.ts` | result def in `$defs`, binding-only prop, preamble | 2 |
| `scripts/agentui/adapter-validators.mjs`, `.test.ts` | compile result validators from the def | 2 |
| `scripts/agentui/adapter-descriptors.mjs`, `.test.ts` | `providers` on every descriptor; G1 actions-only | 2 |
| `scripts/agentui/generate.test.ts` | provider pipeline no longer fails G1 | 2 |
| `a2ui/src/types.ts` | `AdapterProvider`, `AdapterDescriptor.providers` | 3 |
| `a2ui/src/errors.ts`, `a2ui/src/public.d.ts` | `OUTCROP_PROVIDER_TIMEOUT` | 3 |
| `a2ui/src/catalog.ts`, `catalog.test.ts` | `providerTimeoutMs` option and env | 3 |
| `a2ui/src/providers.ts` (new), `providers.test.ts` (new) | the request lifecycle | 3 |
| `a2ui/src/element.ts`, `element.test.ts` | pass provider options; release on unmount | 3 |
| `a2ui/testing/context.ts`, `a2ui/src/roundtrip.test.ts` | `providers: []` in the fake descriptor; env literal | 3 |
| `a2ui/fleet-adapter.test.ts` | generic G3 provider test | 4 |
| `components/treeview/treeview.manifest.ts` | providers, hostOnly, agent | 4 |
| `components/treeview/treeview.conformance.ts` | fixture in triggers; `activate`; `request`; `requestProps` | 4 |
| `scripts/agentui/migration.mjs`, `scripts/audit-counts.mjs`, `audit-counts.test.ts` | remove treeview; lower pins | 4 |
| `specs/agentui/published/catalog-v1.json` | baseline rewrite (additive) | 4 |
| `tests/a2ui/harness-shared.ts` | `providerTimeoutMs` query param | 5 |
| `tests/a2ui-components/treeview.spec.ts` (new) | gesture and provider tests | 5 |
| `A2UI.md`, `agentdemo/page/agent/rules.ts`, `docs/A2UI_INTEGRATION_GUIDE.md`, `AGENTS.md` | docs | 6 |
| `agentknowledge/decisions.yaml` (ADR-225), `concepts.yaml`, `history.jsonl`, `CHANGELOG.md` | records | 6 |

---

### Task 1: `ProviderSpec.concurrency` in the runtime

**Files:**
- Modify: `runtime/src/types.ts` (the `ProviderSpec` interface, about line 202)
- Modify: `runtime/src/registry.ts` (`PROVIDER_KEYS`, about line 549; `validateProviderMap`, about line 574)
- Test: `runtime/src/registry.test.ts` (next to "a provider needs a UAX #31 request", about line 413)
- Regenerate: `runtime/runtime.ts`

**Interfaces:**
- Produces: `ProviderSpec { request: string; concurrency?: "latest" | "queue" }`. Task 2 reads `manifest.protocol.providers[option].concurrency`.

- [ ] **Step 1: Write the failing tests** in `runtime/src/registry.test.ts`, after the "a provider needs a UAX #31 request" test:

```ts
    test("a provider's concurrency is latest or queue", () =>
    {
        expect(validateManifest(base({ providers: { onSearch: { request: "search", concurrency: "latest" } } })).ok)
            .toBe(true);
        expect(validateManifest(base({ providers: { onLoad: { request: "load", concurrency: "queue" } } })).ok)
            .toBe(true);

        const res = validateManifest(base({ providers: { onLoad: { request: "load", concurrency: "parallel" } } }));

        expect(res.ok).toBe(false);
        expect(res.issues.map((i) => i.path)).toEqual(["protocol.providers.onLoad.concurrency"]);
    });
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run runtime/src/registry.test.ts -t "concurrency"`
Expected: FAIL. The first `expect` is false, because `concurrency` is an unknown key.

- [ ] **Step 3: Implement**

In `runtime/src/types.ts`, replace the `ProviderSpec` interface body with:

```ts
export interface ProviderSpec
{
    /** Catalog name of the request, e.g. "search". UAX #31. */
    readonly request: string;

    /**
     * What the A2UI adapter does when the component asks again before the
     * agent answers (ADR-225). "latest" (the generator's default): a newer
     * request replaces a waiting one; for searches. "queue": every request is
     * sent, strictly in order; for keyed loads such as a node's children.
     */
    readonly concurrency?: "latest" | "queue";
}
```

In `runtime/src/registry.ts`:

```ts
/** The keys a provider spec may carry; every catalog name derives from `request`. */
const PROVIDER_KEYS: readonly string[] = ["request", "concurrency"];

/** How the A2UI adapter orders a provider's requests (ADR-225). */
const PROVIDER_CONCURRENCY: readonly string[] = ["latest", "queue"];
```

Inside `validateProviderMap`'s `if (isObject(spec))` block, before `unknownKeys(...)`:

```ts
            if (spec.concurrency !== undefined && !PROVIDER_CONCURRENCY.includes(spec.concurrency as string))
            {
                issues.push(enumIssue(`protocol.providers.${option}.concurrency`, spec.concurrency,
                    PROVIDER_CONCURRENCY));
            }
```

`enumIssue` is already imported (line 29) and used as `enumIssue(path, value, allowed)`.

- [ ] **Step 4: Run the tests and see them pass**

Run: `npx vitest run runtime/src/registry.test.ts`
Expected: PASS, including the existing "leftover params or response key" test.

- [ ] **Step 5: Regenerate the runtime bundle and typecheck**

Run: `bash scripts/bundle-runtime.sh && npm run typecheck:runtime`
Expected: `runtime/runtime.ts` changes only in the `ProviderSpec` and registry hunks (`git diff --stat runtime/runtime.ts`); the typecheck passes.

- [ ] **Step 6: Commit and push**

```bash
git add runtime/src/types.ts runtime/src/registry.ts runtime/src/registry.test.ts runtime/runtime.ts
git commit -m "feat(runtime): ProviderSpec.concurrency, latest or queue, for the A2UI adapter's provider requests (ADR-225)" \
  -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

---

### Task 2: the generator: result defs, validators, descriptors, G1

**Files:**
- Modify: `scripts/agentui/catalog.mjs` (`PREAMBLE`, about line 35; `entryFor`, about line 131; `providerProps`, about line 259)
- Modify: `scripts/agentui/adapter-validators.mjs` (`compileValidators`, `checkArm`)
- Modify: `scripts/agentui/adapter-descriptors.mjs` (`ACTIONS_ISSUE`, `unsupported`, `descriptorFor`)
- Test: `scripts/agentui/catalog.test.ts` (about line 164), `scripts/agentui/adapter-validators.test.ts`, `scripts/agentui/adapter-descriptors.test.ts` (about lines 90–118), `scripts/agentui/generate.test.ts` (about line 74)

**Interfaces:**
- Consumes: `ProviderSpec.concurrency` (Task 1). The resolver's provider entries are `{ option, request, actionProp, response }` (`resolve.mjs` `resolveProviders`).
- Produces:
  - every descriptor has `providers: Array<{ option: string; request: string; actionProp: string; resultProp: string; concurrency: "latest" | "queue" }>` (empty when none);
  - the catalog has `$defs["<Name>__<resultProp>"]`, the answer schema;
  - `resultDefPointer(catalogId, name, resultProp)` returns `` `${catalogId}#/$defs/${name}__${resultProp}` ``;
  - validators include `"<Name>.<resultProp>"`.

- [ ] **Step 1: Open the action-bar issue.** The new G1 message names it.

```bash
GH_TOKEN="$(gh auth token --user priyavijaikalyan2007)" gh issue create \
  --title "Agent UI: action bar for agent-usable manifest actions (from #31)" \
  --body "Split from #31 by readiness step 2 (specs/agentui-sweep.prd.md §2.2). #31's provider half lands in P0; this issue keeps the action bar.

The A2UI adapter has no action bar for manifest \`actions[]\`. No catalog component has an action an agent can use: DataGrid's \`export\` is host-only (ADR-222, R4). Gate G1 fails any catalog action that isn't declared in \`protocol.hostOnlyActions\`, naming this issue.

**Design notes carried from #31:**
- destructive actions go through ConfirmDialog;
- \`grants\` drive the disabled state, for display only;
- clicking dispatches \`on<Id>\`.

Build it when the first component has an action an agent can act on. Part of #16."
```

Record the printed issue number as `<N>` for Step 5.

- [ ] **Step 2: Write the failing catalog test.** Replace the body of `test("a provider gets on<Request> and <request>Result", …)` in `scripts/agentui/catalog.test.ts` with:

```ts
    test("a provider gets on<Request> and a binding-only <request>Result whose schema is a $defs entry", () =>
    {
        const built = build().catalog;
        const props = ownProps(built, "Widget");

        expect(props.onSearch.$ref).toBe(`${COMMON_TYPES_ID}#/$defs/Action`);
        expect(props.onSearch.description).toContain("<eventData path>/search");
        expect(props.searchResult.$ref).toBe(`${COMMON_TYPES_ID}#/$defs/DataBinding`);
        expect("anyOf" in props.searchResult).toBe(false);
        expect(props.searchResult.description).toContain("#/$defs/Widget__searchResult");
        expect(built.$defs.Widget__searchResult).toEqual({ type: "array", items: { type: "string" } });
    });
```

- [ ] **Step 3: Write the failing validator test.** In `scripts/agentui/adapter-validators.test.ts`, add after the `literalArmPointer` describe block:

```ts
describe("resultDefPointer", () =>
{
    test("points at the provider's answer def at the catalog root", () =>
    {
        expect(resultDefPointer("https://x/c.json", "TreeView", "loadChildrenResult"))
            .toBe("https://x/c.json#/$defs/TreeView__loadChildrenResult");
    });
});

describe("compileValidators — provider results", () =>
{
    test("a descriptor provider gets a validator compiled from its $defs entry", async () =>
    {
        const withDef = { ...catalog, $defs: { ...catalog.$defs,
            StickyNote__lookupResult: { type: "array", items: { type: "string" } } } };
        const desc = { ...STICKY, providers: [{ option: "onLookup", request: "lookup", actionProp: "onLookup",
            resultProp: "lookupResult", concurrency: "latest" }] };
        const v = await load(compileValidators({ catalog: withDef, basic, commonTypes, descriptors: [desc] }));

        expect(v["StickyNote.lookupResult"](["a"])).toBe(true);
        expect(v["StickyNote.lookupResult"]([1])).toBe(false);
    }, 60_000);

    test("a provider with no $defs entry is a literate build error", () =>
    {
        const desc = { ...STICKY, providers: [{ option: "onLookup", request: "lookup", actionProp: "onLookup",
            resultProp: "lookupResult", concurrency: "latest" }] };

        expect(() => compileValidators({ catalog, basic, commonTypes, descriptors: [desc] }))
            .toThrow("StickyNote.lookupResult");
    });
});
```

Add `resultDefPointer` to the import from `./adapter-validators.mjs`.

- [ ] **Step 4: Write the failing descriptor tests.** In `scripts/agentui/adapter-descriptors.test.ts`, replace `test("a catalog component with providers is a problem naming #31", …)` with:

```ts
    test("providers pass G1; only undeclared actions fail it (ADR-225)", () =>
    {
        const ready = [{ manifest: manifest(), surface: surface({
            providers: [{ option: "onSearch", request: "search", actionProp: "onSearch", response: "searchResult" }] }) }];

        expect(buildDescriptors(ready, catalog([["Widget", {}]]), () => true).problems).toEqual([]);
    });
```

In the two action tests in the same describe block, replace `.*#31` with `.*#<N>` (the issue from Step 1) and the titles' "naming #31" with "naming the action-bar issue". Then add to the "fields" describe block, after the overlay test:

```ts
    test("a provider is carried with its concurrency; latest when undeclared (ADR-225)", () =>
    {
        const lazy = { manifest: { ...picker.manifest, protocol: { providers: {
            onLoad: { request: "load", concurrency: "queue" }, onFind: { request: "find" } } } },
        surface: { ...picker.surface, providers: [
            { option: "onLoad", request: "load", actionProp: "onLoad", response: "loadResult" },
            { option: "onFind", request: "find", actionProp: "onFind", response: "findResult" }] } };
        const [d] = buildDescriptors([lazy], cat, css).descriptors;

        expect(d.providers).toEqual([
            { option: "onLoad", request: "load", actionProp: "onLoad", resultProp: "loadResult", concurrency: "queue" },
            { option: "onFind", request: "find", actionProp: "onFind", resultProp: "findResult", concurrency: "latest" },
        ]);
        expect(p.providers).toEqual([]);
    });
```

Add `providers: []` to the expected object in the "a surface component: defaults, …" test.

- [ ] **Step 5: Update the pipeline test.** In `scripts/agentui/generate.test.ts`, test "its catalog entry follows the naming rule…" (about line 74), replace:

```ts
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toMatch(/Widget declares providers \[search\].*#31/);
```

with:

```ts
        expect(result.errors).toEqual([]);
```

and replace its last line with:

```ts
        expect(props.searchResult.$ref).toContain("#/$defs/DataBinding");
        expect((result.catalog as any).$defs.Widget__searchResult).toMatchObject({ type: "array", items: { type: "string" } });
```

- [ ] **Step 6: Run them and see them fail**

Run: `npx vitest run scripts/agentui/catalog.test.ts scripts/agentui/adapter-validators.test.ts scripts/agentui/adapter-descriptors.test.ts scripts/agentui/generate.test.ts`
Expected: the new and changed tests FAIL. For example, `searchResult.$ref` is undefined, `resultDefPointer` is not exported, and `d.providers` is undefined.

- [ ] **Step 7: Implement `catalog.mjs`**

Replace `providerProps` with two functions:

```js
/**
 * Each provider: an on<Request> Action (request under eventData) and a
 * binding-only <request>Result. A literal cannot answer a request, so the
 * answer's schema lives at $defs["<Component>__<request>Result"] and the
 * description names it (ADR-225, spec S7).
 */
function providerProps(surface, name)
{
    return surface.providers.flatMap((p) => [
        [p.actionProp, { description: `Sent when the component needs "${p.request}" answered. Its request is `
            + `at <eventData path>/${p.request}. Answer with updateDataModel at the path bound to ${p.response}.`,
        $ref: ACTION_REF }],
        [p.response, { description: `Bind to the path you will answer ${p.actionProp} at with updateDataModel, and `
            + `write a value matching #/$defs/${name}__${p.response} there. A literal cannot answer a request.`,
        ...BINDING }],
    ]);
}

/** Each provider's answer schema, relocated to the catalog root as <Component>__<request>Result. */
function providerDefs(surface, root, component, name)
{
    return Object.fromEntries(surface.providers.map((p) =>
    {
        const { description, ...answer } = requireProperty(root, component, "provider response", p.response);
        void description;

        return [`${name}__${p.response}`, answer];
    }));
}
```

In `entryFor`, change the providers entry to `...providerProps(surface, name)`, and the returned `defs` to:

```js
        name, defs: { ...defs, ...providerDefs(surface, root, manifest.name, name) },
```

`defCollisions` already checks every key in `o.defs`, so a clash with a relocated options def is reported.

In `PREAMBLE`, replace the sentence `"Every data property, <request>Result included, accepts a literal, a {\"path\": …} binding or a {\"call\": …} function call to one of this catalog's functions. "` with:

```js
    + "Every data property accepts a literal, a {\"path\": …} binding or a {\"call\": …} function call to one of "
    + "this catalog's functions; a <request>Result property accepts only a binding. "
```

and the phrase `"answer with updateDataModel at the path bound to its <request>Result property. "` with:

```js
    + "answer with updateDataModel at the path bound to its <request>Result property, with a value matching the "
    + "$defs entry its description names, once per request. "
```

Keep the string concatenation style of the constant.

- [ ] **Step 8: Implement `adapter-validators.mjs`**

Add, after `literalArmPointer`:

```js
/**
 * The JSON pointer of a provider's answer schema: catalog.mjs relocates it to
 * $defs["<Name>__<resultProp>"] (ADR-225).
 *
 * @param catalogId  - The catalog's $id.
 * @param name       - Catalog component name.
 * @param resultProp - The provider's <request>Result prop.
 * @returns The absolute schema reference.
 */
export function resultDefPointer(catalogId, name, resultProp)
{
    return `${catalogId}#/$defs/${name}__${resultProp}`;
}
```

Change `compileValidators` so each key carries its pointer and its own check:

```js
    const propKeys = descriptors.flatMap((d) => Object.keys(d.props).map((prop) => ({ key: `${d.name}.${prop}`,
        pointer: literalArmPointer(catalog.$id, d.name, prop), check: () => checkArm(catalog, `${d.name}.${prop}`, d.name, prop) })));
    const resultKeys = descriptors.flatMap((d) => (d.providers ?? []).map((p) => ({ key: `${d.name}.${p.resultProp}`,
        pointer: resultDefPointer(catalog.$id, d.name, p.resultProp),
        check: () => checkDef(catalog, `${d.name}.${p.resultProp}`, `${d.name}__${p.resultProp}`) })));
    const keys = [...propKeys, ...resultKeys];
```

Then:
- use `for (const k of keys) { k.check(); }` in place of the `checkArm` loop;
- build `refs` from `k.pointer`;
- leave `exportNames` and `table` keyed by `k.key`.

Split `propKeys` and `resultKeys` across lines so each is 120 columns or fewer. Add:

```js
function checkDef(catalog, key, def)
{
    if (catalog.$defs?.[def] === undefined)
    {
        throw new Error(`Cannot compile the adapter validator for ${key}: the catalog has no $defs entry "${def}". `
            + "The descriptor and the catalog disagree; rebuild both with `npm run build:agentui`.");
    }
}
```

`descriptors[].providers` is optional (`?? []`) only because the existing `STICKY` test fixture predates it. Every generated descriptor carries the array (Step 9).

- [ ] **Step 9: Implement `adapter-descriptors.mjs`**

- Set `const ACTIONS_ISSUE = "#<N>";` (the Step 1 issue).
- `unsupported` keeps only the actions entry:

```js
/** Gate G1: catalog action props the adapter could never fire. Providers are served since ADR-225. */
function unsupported(name, surface)
{
    const ids = surface.actions.map((a) => a.id);

    return ids.length === 0 ? [] : [`${name} declares actions [${ids.join(", ")}], which the A2UI adapter does not `
        + `support yet, so its catalog action props would never fire. Support lands with ${ACTIONS_ISSUE}; until then `
        + "keep the component on PENDING_CLASSIFICATION or remove the declaration, or, for an action an agent cannot "
        + "act on, declare it in protocol.hostOnlyActions with a reason."];
}
```

- In `descriptorFor`, after `events: …`, add:

```js
        providers: surface.providers.map(({ option, request, actionProp, response }) => ({ option, request, actionProp,
            resultProp: response, concurrency: manifest.protocol?.providers?.[option]?.concurrency ?? "latest" })),
```

Update the file header comment's "G1 (actions and providers the adapter cannot serve yet)" to "G1 (manifest actions the adapter cannot serve yet)".

- [ ] **Step 10: Run the tests and see them pass**

Run: `npx vitest run scripts/agentui`
Expected: PASS.

- [ ] **Step 11: Rebuild and check nothing published changed**

Run: `npm run build:agentui && git status --short specs/agentui/published dist/a2ui 2>/dev/null; node -e 'const c=require("./dist/a2ui/catalog/v1.json"); const b=require("./specs/agentui/published/catalog-v1.json"); console.log(JSON.stringify(c.components)===JSON.stringify(b.components))'`

Expected:
- the build exits 0;
- the baseline file is unchanged;
- the components comparison prints `true`. No catalog component has a provider yet; only the top-level description differs.

- [ ] **Step 12: Commit and push**

```bash
git add scripts/agentui/catalog.mjs scripts/agentui/catalog.test.ts scripts/agentui/adapter-validators.mjs \
  scripts/agentui/adapter-validators.test.ts scripts/agentui/adapter-descriptors.mjs \
  scripts/agentui/adapter-descriptors.test.ts scripts/agentui/generate.test.ts
git commit -m "feat(agentui): provider answers are binding-only with a \$defs schema; descriptors carry providers; G1 fails only on actions (ADR-225)" \
  -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

---

### Task 3: the adapter's provider lifecycle

**Files:**
- Modify: `a2ui/src/types.ts`, `a2ui/src/errors.ts`, `a2ui/src/public.d.ts`, `a2ui/src/catalog.ts`, `a2ui/src/element.ts`
- Modify: `a2ui/testing/context.ts` (`fakeDescriptor`), `a2ui/src/element.test.ts` (env literal, line 34), `a2ui/src/roundtrip.test.ts` (env literal, line 40)
- Create: `a2ui/src/providers.ts`, `a2ui/src/providers.test.ts`
- Test: `a2ui/src/catalog.test.ts`, `a2ui/src/element.test.ts`

**Interfaces:**
- Consumes: descriptor `providers` (Task 2).
- Produces:
  - `export interface AdapterProvider { option: string; request: string; actionProp: string; resultProp: string; concurrency: "latest" | "queue" }`;
  - `AdapterDescriptor.providers: AdapterProvider[]`;
  - `ERROR_CODES.PROVIDER_TIMEOUT === "OUTCROP_PROVIDER_TIMEOUT"`;
  - `ElementEnv.providerTimeoutMs: () => number`;
  - `wireProviders(ctx: ComponentContextLike, descriptor: AdapterDescriptor, validators: Validators, timeoutMs: number): WiredProviders`, where `interface WiredProviders { readonly options: Record<string, (request: unknown) => Promise<unknown>>; release(): void }`.

- [ ] **Step 1: Types, the error code and the fake descriptor**

In `a2ui/src/types.ts`, add before `AdapterDescriptor`:

```ts
/** One provider: a callback that asks the agent for data (ADR-225, spec §3). */
export interface AdapterProvider
{
    /** The factory option the callback is passed as, e.g. "onLoadChildren". */
    option: string;
    /** The catalog request name; the request is written to <eventData>/<request>. */
    request: string;
    /** The on<Request> action prop the adapter dispatches. */
    actionProp: string;
    /** The <request>Result prop whose bound path the agent answers at. */
    resultProp: string;
    /** "latest": a newer request replaces a waiting one. "queue": every request, in order. */
    concurrency: "latest" | "queue";
}
```

and add `providers: AdapterProvider[];` after `events: AdapterEvent[];` in `AdapterDescriptor`.

In `a2ui/src/errors.ts`, add `PROVIDER_TIMEOUT: "OUTCROP_PROVIDER_TIMEOUT",` to `ERROR_CODES`. In `a2ui/src/public.d.ts`, add `| "OUTCROP_PROVIDER_TIMEOUT"` to `OutcropErrorCode`.

In `a2ui/testing/context.ts` `fakeDescriptor`, add `providers: [],` before `...over`. In the env literals in `element.test.ts:34` and `roundtrip.test.ts:40`, add `providerTimeoutMs: () => 30_000,`.

- [ ] **Step 2: Write the failing catalog-option tests** in `a2ui/src/catalog.test.ts`, inside the describe block that tests `injectBaseTheme` validation. Follow that file's existing helper for calling `createOutcropCatalogFrom`; it resets state with `resetCatalogStateForTests`.

```ts
    test.each([[0], [-1], [1.5], ["30000"]])("providerTimeoutMs %s is rejected", (bad) =>
    {
        expect(() => make({ assetBaseUrl: BASE, providerTimeoutMs: bad as number }))
            .toThrow("providerTimeoutMs must be a positive integer");
    });

    test("providerTimeoutMs is page-global like assetBaseUrl", () =>
    {
        make({ assetBaseUrl: BASE, providerTimeoutMs: 5000 });

        expect(() => make({ assetBaseUrl: BASE, providerTimeoutMs: 6000 })).toThrow("providerTimeoutMs is page-global");
    });
```

`make` and `BASE` stand for that file's existing helper and base-URL constant. Use their real names.

- [ ] **Step 3: Implement the option.** In `a2ui/src/catalog.ts`:
- `OutcropCatalogOptions` gains `readonly providerTimeoutMs?: number;`, with a JSDoc comment: "How long a provider request waits for the agent's answer, in milliseconds. Default 30000 (ADR-225)."
- In `fixConfig`, before `checkBase`:

```ts
    if (options.providerTimeoutMs !== undefined
        && !(Number.isInteger(options.providerTimeoutMs) && options.providerTimeoutMs > 0))
    {
        throw new Error("createOutcropCatalog: providerTimeoutMs must be a positive integer (milliseconds), got "
            + `${JSON.stringify(options.providerTimeoutMs)}.`);
    }
```

- `next` gains `providerTimeoutMs: options.providerTimeoutMs ?? DEFAULT_PROVIDER_TIMEOUT_MS`, with `const DEFAULT_PROVIDER_TIMEOUT_MS = 30_000;` at module level.
- The page-global loop iterates `["assetBaseUrl", "injectBaseTheme", "providerTimeoutMs"] as const`.
- `current()`'s return type and the `config` declaration gain `providerTimeoutMs: number`.
- In `elementClassFor`'s env, add `providerTimeoutMs: () => current().providerTimeoutMs`.
- In `a2ui/src/element.ts` `ElementEnv`, add `readonly providerTimeoutMs: () => number;`.

Run: `npx vitest run a2ui/src/catalog.test.ts`. Expected: PASS.

- [ ] **Step 4: Write the failing lifecycle tests** in `a2ui/src/providers.test.ts`:

```ts
/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: the A2UI adapter's provider lifecycle (ADR-225, spec §3) against a
 *    real web_core surface: one outstanding request per provider, latest and
 *    queue, validation, timeout, and teardown.
 */

import { afterEach, describe, expect, test, vi } from "vitest";

import { wireProviders } from "./providers";
import type { AdapterProvider, Validators } from "./types";
import { fakeDescriptor, flush, realContext } from "../testing/context";

const LOAD: AdapterProvider = { option: "onLoad", request: "load", actionProp: "onLoad", resultProp: "loadResult",
    concurrency: "queue" };
const FIND: AdapterProvider = { option: "onFind", request: "find", actionProp: "onFind", resultProp: "findResult",
    concurrency: "latest" };
const VALIDATORS: Validators = {
    "Fake.loadResult": (v) => Array.isArray(v) && v.every((x) => typeof x === "string"),
    "Fake.findResult": (v) => Array.isArray(v) && v.every((x) => typeof x === "string"),
};
const BOUND = { onLoad: { event: { name: "load", context: { node: { path: "/ev/load" } } } },
    loadResult: { path: "/a/load" }, onFind: { event: { name: "find", context: { q: { path: "/ev/find" } } } },
    findResult: { path: "/a/find" }, eventData: { path: "/ev" } };

function wired(props: Record<string, unknown> = BOUND, timeoutMs = 30_000)
{
    const rc = realContext(props);
    const w = wireProviders(rc.ctx, fakeDescriptor({ providers: [LOAD, FIND] }), VALIDATORS, timeoutMs);

    return { rc, w };
}

/** Records whether a promise has settled, without awaiting it. */
function track(p: Promise<unknown>): { settled: boolean; value?: unknown; error?: unknown }
{
    const t: { settled: boolean; value?: unknown; error?: unknown } = { settled: false };

    p.then((v) => { t.settled = true; t.value = v; }, (e) => { t.settled = true; t.error = e; });

    return t;
}

afterEach(() => { vi.useRealTimers(); });

describe("wiring", () =>
{
    test("a provider is passed only when its action, its result binding and eventData are all set", () =>
    {
        expect(Object.keys(wired().w.options).sort()).toEqual(["onFind", "onLoad"]);

        const { onFind: _a, ...noAction } = BOUND;
        expect(Object.keys(wired(noAction).w.options)).toEqual(["onLoad"]);

        expect(Object.keys(wired({ ...BOUND, loadResult: ["literal"] }).w.options)).toEqual(["onFind"]);

        const { eventData: _e, ...noEventData } = BOUND;
        expect(wired(noEventData).w.options).toEqual({});
    });
});

describe("one request", () =>
{
    test("sending deletes the result path, then writes the request, then dispatches", () =>
    {
        const { rc, w } = wired(BOUND);
        rc.setData("/a/load", ["stale"]);
        const order: string[] = [];
        const set = rc.ctx.dataContext.set.bind(rc.ctx.dataContext);
        vi.spyOn(rc.ctx.dataContext, "set").mockImplementation((p, v) => { order.push(p); set(p, v); });

        void w.options.onLoad({ id: "n1" });

        expect(order).toEqual(["/a/load", "/ev/load"]);
        expect(rc.getData("/a/load")).toBeUndefined();
        expect(rc.actions.map((a) => a.name)).toEqual(["load"]);
        expect((rc.actions[0].context as Record<string, unknown>).node).toEqual({ id: "n1" });
    });

    test("a valid answer resolves with a copy", async () =>
    {
        const { rc, w } = wired();
        const p = w.options.onLoad({ id: "n1" });

        rc.setData("/a/load", ["c1", "c2"]);

        await expect(p).resolves.toEqual(["c1", "c2"]);
    });

    test("an answer equal to the previous one still resolves", async () =>
    {
        const { rc, w } = wired();
        const first = w.options.onFind("a");
        rc.setData("/a/find", ["x"]);
        await first;

        const second = w.options.onFind("a");
        rc.setData("/a/find", ["x"]);

        await expect(second).resolves.toEqual(["x"]);
    });

    test("an invalid answer is VALIDATION_FAILED at the result path, and the request stays open", async () =>
    {
        const { rc, w } = wired();
        const t = track(w.options.onLoad({ id: "n1" }));

        rc.setData("/a/load", [1, 2]);
        await flush();

        expect(t.settled).toBe(false);
        expect(rc.errors).toEqual([expect.objectContaining({ code: "VALIDATION_FAILED", path: "/a/load" })]);

        rc.setData("/a/load", ["ok"]);
        await flush();
        expect(t.value).toEqual(["ok"]);
    });

    test("a write with nothing outstanding is ignored", async () =>
    {
        const { rc, w } = wired();

        rc.setData("/a/load", ["unasked"]);
        const t = track(w.options.onLoad({ id: "n1" }));
        await flush();

        expect(t.settled).toBe(false);
        expect(rc.errors).toEqual([]);
    });
});

describe("concurrency", () =>
{
    test("latest: a newer request replaces the waiting one, and the replaced one gets its answer", async () =>
    {
        const { rc, w } = wired();
        const a = track(w.options.onFind("a"));
        const ab = track(w.options.onFind("ab"));
        const abc = track(w.options.onFind("abc"));

        expect(rc.actions.map((x) => x.context)).toEqual([{ q: "a" }]);

        rc.setData("/a/find", ["for-a"]);
        await flush();
        expect(a.value).toEqual(["for-a"]);
        expect(rc.actions.map((x) => x.context)).toEqual([{ q: "a" }, { q: "abc" }]);

        rc.setData("/a/find", ["for-abc"]);
        await flush();
        expect(ab.value).toEqual(["for-abc"]);
        expect(abc.value).toEqual(["for-abc"]);
    });

    test("queue: every request is sent, strictly in order", async () =>
    {
        const { rc, w } = wired();
        const one = track(w.options.onLoad({ id: "1" }));
        const two = track(w.options.onLoad({ id: "2" }));

        expect(rc.actions).toHaveLength(1);

        rc.setData("/a/load", ["kids-of-1"]);
        await flush();
        expect(one.value).toEqual(["kids-of-1"]);
        expect(two.settled).toBe(false);
        expect((rc.actions[1].context as Record<string, unknown>).node).toEqual({ id: "2" });

        rc.setData("/a/load", ["kids-of-2"]);
        await flush();
        expect(two.value).toEqual(["kids-of-2"]);
    });
});

describe("failure", () =>
{
    test("timeout rejects, reports OUTCROP_PROVIDER_TIMEOUT at the result path, and sends the next", async () =>
    {
        vi.useFakeTimers();
        const { rc, w } = wired(BOUND, 1000);
        const one = track(w.options.onLoad({ id: "1" }));
        void w.options.onLoad({ id: "2" });

        await vi.advanceTimersByTimeAsync(1000);

        expect(String(one.error)).toContain("1000");
        expect(rc.errors).toEqual([expect.objectContaining({ code: "OUTCROP_PROVIDER_TIMEOUT", path: "/a/load" })]);
        expect(rc.actions).toHaveLength(2);
    });

    test("teardown drops pending requests unsettled, and a late answer is ignored", async () =>
    {
        const { rc, w } = wired();
        const one = track(w.options.onLoad({ id: "1" }));
        const two = track(w.options.onLoad({ id: "2" }));

        w.release();
        rc.setData("/a/load", ["late"]);
        await flush();

        expect(one.settled).toBe(false);
        expect(two.settled).toBe(false);
        expect(rc.actions).toHaveLength(1);
        expect(rc.errors).toEqual([]);
    });
});
```

If `realContext` rejects a literal array for `loadResult`, nothing breaks: the Fake schema is open.

- [ ] **Step 5: Run them and see them fail**

Run: `npx vitest run a2ui/src/providers.test.ts`
Expected: FAIL with "Failed to resolve import ./providers".

- [ ] **Step 6: Implement `a2ui/src/providers.ts`**

```ts
/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: A2uiAdapter / Providers
 * 📜 PURPOSE: A component's data requests answered by the agent (ADR-225,
 *    spec §3). One outstanding request per provider correlates answers with
 *    no request ids: the next valid write to the result path answers it.
 * 🔗 RELATES: [[A2uiAdapter]], [[ProviderConcurrency]]
 * ⚡ FLOW: [component calls option] -> [delete result, write request,
 *          dispatch on<Request>] -> [agent writes result] -> [validate]
 *          -> [resolve] -> [next waiting request]
 * 🔒 SECURITY: An answer reaches the component only after its compiled
 *    validator accepts it, and as a copy.
 * ----------------------------------------------------------------------------
 */

// @semantic-marker a2ui-adapter-providers

import { ERROR_CODES, reportError } from "./errors";
import { logDebug } from "./log";
import { dispatchActionProp } from "./roundtrip";
import { bindingPath, toWire } from "./values";
import type { AdapterDescriptor, AdapterProvider, ComponentContextLike, Sub, Validators } from "./types";

/** The provider callbacks to pass to the factory, and how to let them go. */
export interface WiredProviders
{
    readonly options: Record<string, (request: unknown) => Promise<unknown>>;
    release(): void;
}

interface Settle { resolve(value: unknown): void; reject(error: Error): void }
interface Pending { readonly request: unknown; readonly settles: Settle[] }

/**
 * Wires every provider whose action, result binding and eventData binding
 * are all set. Read once, at construct time.
 */
export function wireProviders(ctx: ComponentContextLike, descriptor: AdapterDescriptor, validators: Validators,
    timeoutMs: number): WiredProviders
{
    const props = ctx.componentModel.properties;
    const eventPath = bindingPath(props.eventData);
    const channels = descriptor.providers
        .filter((p) => props[p.actionProp] !== undefined && bindingPath(props[p.resultProp]) !== undefined
            && eventPath !== undefined)
        .map((p) => new ProviderChannel(ctx, descriptor.name, p, validators, timeoutMs, eventPath as string));

    return {
        options: Object.fromEntries(channels.map((c) => [c.option, (r: unknown) => c.ask(r)])),
        release: () => channels.forEach((c) => c.release()),
    };
}

/** One provider's requests: at most one outstanding, the rest waiting by its concurrency. */
class ProviderChannel
{
    readonly option: string;
    readonly #ctx: ComponentContextLike;
    readonly #p: AdapterProvider;
    readonly #validate: Validators[string] | undefined;
    readonly #key: string;
    readonly #timeoutMs: number;
    readonly #requestPath: string;
    readonly #resultPath: string;
    readonly #sub: Sub;
    #outstanding: Pending | undefined;
    #waiting: Pending[] = [];
    #timer: ReturnType<typeof setTimeout> | undefined;
    #released = false;

    constructor(ctx: ComponentContextLike, name: string, p: AdapterProvider, validators: Validators,
        timeoutMs: number, eventPath: string)
    {
        this.option = p.option;
        this.#ctx = ctx;
        this.#p = p;
        this.#key = `${name}.${p.resultProp}`;
        this.#validate = validators[this.#key];
        this.#timeoutMs = timeoutMs;
        this.#requestPath = `${eventPath}/${p.request}`;
        this.#resultPath = bindingPath(ctx.componentModel.properties[p.resultProp]) as string;
        this.#sub = ctx.dataContext.subscribeDynamicValue({ path: this.#resultPath }, (v) => this.#onResult(v));
    }

    ask(request: unknown): Promise<unknown>
    {
        return new Promise((resolve, reject) =>
        {
            const own: Settle = { resolve, reject };

            if (!this.#outstanding) { this.#send({ request, settles: [own] }); return; }

            if (this.#p.concurrency === "queue") { this.#waiting.push({ request, settles: [own] }); return; }

            const replaced = this.#waiting[0]?.settles ?? [];
            this.#waiting = [{ request, settles: [...replaced, own] }];
        });
    }

    release(): void
    {
        this.#released = true;
        clearTimeout(this.#timer);
        this.#sub.unsubscribe();
        this.#outstanding = undefined;
        this.#waiting = [];
    }

    #send(pending: Pending): void
    {
        this.#outstanding = pending;
        this.#ctx.dataContext.set(this.#resultPath, undefined);
        this.#ctx.dataContext.set(this.#requestPath, toWire(pending.request));
        dispatchActionProp(this.#ctx, this.#p.actionProp);
        this.#timer = setTimeout(() => this.#onTimeout(), this.#timeoutMs);
    }

    #onResult(value: unknown): void
    {
        if (this.#released || !this.#outstanding || value === undefined)
        {
            logDebug("provider", this.#key, "ignored a write that is not an answer");
            return;
        }

        const problem = this.#problem(value);

        if (problem !== undefined)
        {
            reportError(this.#ctx, ERROR_CODES.VALIDATION_FAILED, problem, this.#resultPath);
            return;
        }

        const done = this.#finish();
        const copy = structuredClone(value);
        done.settles.forEach((s) => s.resolve(copy));
        this.#next();
    }

    #problem(value: unknown): string | undefined
    {
        if (!this.#validate)
        {
            return `${this.#key} has no compiled validator; the adapter bundle is out of date. Rebuild it.`;
        }

        return this.#validate(value) ? undefined
            : `${this.#key} received ${JSON.stringify(value)}, which does not match #/$defs/`
                + `${this.#key.replace(".", "__")} in the catalog.`;
    }

    #onTimeout(): void
    {
        const done = this.#finish();
        const message = `${this.#key}: the agent did not answer ${this.#p.actionProp} within ${this.#timeoutMs} ms. `
            + `Answer each request once, with updateDataModel at ${this.#resultPath}.`;

        reportError(this.#ctx, ERROR_CODES.PROVIDER_TIMEOUT, message, this.#resultPath);
        done.settles.forEach((s) => s.reject(new Error(message)));
        this.#next();
    }

    #finish(): Pending
    {
        const done = this.#outstanding as Pending;

        clearTimeout(this.#timer);
        this.#outstanding = undefined;

        return done;
    }

    #next(): void
    {
        const next = this.#waiting.shift();

        if (next && !this.#released) { this.#send(next); }
    }
}
```

Keep every method at 30 lines or fewer and every line at 120 columns or fewer. If the `logDebug` signature differs from `logDebug(...parts)`, match `a2ui/src/log.ts`.

- [ ] **Step 7: Run the lifecycle tests and see them pass**

Run: `npx vitest run a2ui/src/providers.test.ts`
Expected: PASS. If the "deletes, then writes" test sees only one `set` call, `ctx.dataContext.set` is being bypassed; check that `#send` calls `this.#ctx.dataContext.set` for both writes.

- [ ] **Step 8: Write the failing element tests** in `a2ui/src/element.test.ts`, after the overlay tests:

```ts
    test("a bound provider reaches the factory as its option, and unmount releases it (ADR-225)", async () =>
    {
        const provider = { option: "onLoad", request: "load", actionProp: "onLoad", resultProp: "loadResult",
            concurrency: "queue" as const };
        const rc = realContext({ title: "t", onLoad: { event: { name: "load" } }, loadResult: { path: "/a" },
            eventData: { path: "/ev" } });
        const el = create(tagFor(fakeDescriptor({ providers: [provider] })), rc);
        await loaded();

        const onLoad = record.builds[0].options.onLoad as (r: unknown) => Promise<unknown>;
        expect(onLoad).toBeTypeOf("function");

        void onLoad({ id: "n" });
        expect(rc.actions.map((a) => a.name)).toEqual(["load"]);

        el.remove();
        await flush();
        rc.setData("/a", ["late"]);
        expect(rc.errors).toEqual([]);
    });

    test("an unbound provider is not passed to the factory", async () =>
    {
        const provider = { option: "onLoad", request: "load", actionProp: "onLoad", resultProp: "loadResult",
            concurrency: "queue" as const };
        create(tagFor(fakeDescriptor({ providers: [provider] })), realContext({ title: "t" }));
        await loaded();

        expect("onLoad" in record.builds[0].options).toBe(false);
    });
```

Use the file's existing `record`, `create`, `tagFor`, `loaded` and `flush` helpers. Add `fakeDescriptor` and `flush` to its import from `../testing/context` if they're missing.

Run: `npx vitest run a2ui/src/element.test.ts -t "provider"`. Expected: FAIL, because `onLoad` is undefined.

- [ ] **Step 9: Implement the element integration.** In `a2ui/src/element.ts`:
- import `{ wireProviders, type WiredProviders } from "./providers"`;
- add the field `#providers: WiredProviders | undefined;` to `Binding`;
- in `#construct`, replace the `options` line with:

```ts
        const providers = wireProviders(this.#ctx, d, this.#env.validators, this.#env.providerTimeoutMs());
        const options = { ...Object.fromEntries(this.#values), ...changeOptions(d, (v) => this.#onUserValue(v)),
            ...providers.options };
```

- after the factory call, set `this.#providers = providers;`;
- in the existing `catch (err)` of `#construct`, call `providers.release();` before destroying the handle;
- if the factory throws before the handle exists, `#mount`'s catch runs instead. So wrap the invoker call so that a throw also calls `providers.release()`: assign `this.#providers` only after the handle check passes, and release in a `catch` that rethrows.
- In `#unmount`, after `this.#roundTrip = undefined;`, add:

```ts
        this.#providers?.release();
        this.#providers = undefined;
```

- [ ] **Step 10: Run the adapter tests and the typecheck**

Run: `npx vitest run a2ui && npm run typecheck:a2ui`
Expected: PASS. `a2ui/fleet-adapter.test.ts` needs a built bundle; if it fails only because `dist` is stale, run `npm run build:agentui` and re-run.

- [ ] **Step 11: Commit and push**

```bash
git add a2ui/src/types.ts a2ui/src/errors.ts a2ui/src/public.d.ts a2ui/src/catalog.ts a2ui/src/catalog.test.ts \
  a2ui/src/providers.ts a2ui/src/providers.test.ts a2ui/src/element.ts a2ui/src/element.test.ts \
  a2ui/src/roundtrip.test.ts a2ui/testing/context.ts
git commit -m "feat(a2ui): providers: one outstanding request per provider, latest or queue, timeout, teardown (#31, ADR-225)" \
  -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

---

### Task 4: TreeView joins the catalog; G3 covers providers

**Files:**
- Modify: `components/treeview/treeview.manifest.ts`, `components/treeview/treeview.conformance.ts`
- Modify: `a2ui/fleet-adapter.test.ts`
- Modify: `scripts/agentui/migration.mjs` (remove `"treeview"`), `scripts/audit-counts.mjs` (ceilings about line 894, floors about line 999), `scripts/audit-counts.test.ts` if it pins the same numbers
- Regenerate: `specs/agentui/published/catalog-v1.json`

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces:
  - TreeView's descriptor with `providers` `loadChildren` (queue) and `search` (latest);
  - the conformance glue's `request(request: string, handle): boolean` and `requestProps: Record<string, unknown>`.

- [ ] **Step 1: Write the failing G3 provider test.** In `a2ui/fleet-adapter.test.ts`, extend the `Descriptor` type with:

```ts
    providers: { request: string; actionProp: string; resultProp: string; concurrency: string }[];
```

Add after the events test:

```ts
    test.skipIf(d.providers.length === 0)("each provider deletes its answer, writes its request, dispatches, and accepts the answer", async () =>
    {
        const dir = d.assets.js.split("/")[1];
        const glue = (await GLUE[`../components/${dir}/${dir}.conformance.ts`]?.())?.CONFORMANCE_GLUE;
        const { props, data } = initial();
        const bindings = Object.fromEntries(d.providers.flatMap((p) => [[p.actionProp, { event: { name: p.actionProp } }],
            [p.resultProp, { path: `/answers/${p.request}` }]]));
        const s = await stage(d, { ...props, ...glue?.requestProps, ...bindings, eventData: { path: "/ev" } }, data);
        const writes = vi.spyOn(s.surface.dataModel, "set");

        for (const p of d.providers)
        {
            expect(glue?.request, `add a request trigger for "${p.request}" to the ${name} conformance glue`)
                .toBeTypeOf("function");
            s.actions.length = 0;
            writes.mockClear();
            expect(glue.request(p.request, s.el.handle), `${name} glue cannot request "${p.request}"`).toBe(true);
            await vi.waitFor(() => expect(s.actions.map((a: Any) => a.name)).toContain(p.actionProp), { timeout: 2000 });

            const paths = writes.mock.calls.map((c) => c[0]);
            expect(paths.indexOf(`/answers/${p.request}`), `${name}.${p.request} order`)
                .toBeLessThan(paths.indexOf(`/ev/${p.request}`));
            s.setData(`/answers/${p.request}`, sampleValue(CATALOG.$defs[`${name}__${p.resultProp}`], 1, CATALOG));
            await flush();
        }

        expect(s.errors).toEqual([]);
    });
```

Add `providers: []`-tolerant typing only; every generated descriptor has the array (Task 2). The test is skipped until TreeView is in the catalog, which is why it lands with this task.

- [ ] **Step 2: Declare TreeView's protocol.** In `components/treeview/treeview.manifest.ts`:
- update the stale header comment (it says "Declared at `display` conformance") to: "Declared at `surface` conformance: it emits selection and activate, accepts roots, and restores expanded and selection. Its lazy loader and server-side search are providers an A2UI agent answers (ADR-225)."
- add after `category: "data",`:

```ts
    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Show a hierarchy the user browses, expands and selects from, such as folders or categories.",
        avoidWhen: "For a flat list without nesting use List; to pick one or more options use ChoicePicker.",
    },
```

- add before `regions`:

```ts
    protocol: {
        providers: {
            onLoadChildren: { request: "loadChildren", concurrency: "queue" },
            onSearchAsync: { request: "search" },
        },
        hostOnly: {
            onSelect: "Per-node selection changes; the selection channel already reports the selected nodes.",
            onToggle: "Expand and collapse are view state, restored through the expanded state key.",
            onRename: "Returns an accept-or-reject decision synchronously with the edit; an agent round trip cannot.",
            onStarToggle: "Takes two parameters and has no channel; starring stays a host feature for now.",
            onDragValidate: "Returns a drop decision while the pointer moves; an agent round trip cannot sit there.",
            onDrop: "Drag-and-drop restructuring takes three parameters and is a host editing feature.",
            onExternalDrop: "Receives a browser DataTransfer, which JSON cannot carry.",
            onContextMenuAction: "Takes two parameters and has no channel; context menus stay a host feature for now.",
            onRefreshComplete: "Fires after the host's own programmatic refresh; it tells an agent nothing.",
            onSortModeChange: "Sort mode is view state the user sets in the toolbar.",
            onCollapseStateChange: "Aggregate expand and collapse is view state, not information for an agent.",
            sortComparator: "A comparison function; the default label sort applies over A2UI.",
            nodeRenderer: "Returns a DOM element; the default row rendering applies over A2UI.",
            filterPredicate: "A matching function; the default label match applies over A2UI.",
            "roots[].data": "Arbitrary consumer data for host callbacks; it has no schema an agent could fill.",
            toolbarActions: "Toolbar buttons run host click handlers, which an agent cannot supply.",
        },
    },
```

- [ ] **Step 3: Build and read TreeView's report entry**

Run: `npm run build:agentui 2>&1 | tail -20`

Expected: the build fails with a stale-entry message telling you to remove treeview from `PENDING_CLASSIFICATION`.
- If it instead reports a violation for treeview, fix the declaration it names. For example, if `toolbarActions` must be named by path, use `"toolbarActions[].onClick"` with the same reason.
- If `agent-description` rejects a sentence, rewrite it within 30–240 characters.

- [ ] **Step 4: Remove treeview from the list and lower the pins**

- Delete `"treeview",` from `PENDING_CLASSIFICATION` in `scripts/agentui/migration.mjs`, and add a dated line to the list's comment: `// 92 on 2026-10-28: treeview classified with two providers (readiness step 2 P0, ADR-225).`
- Run: `node scripts/agentui/generate.mjs --measure`
- In `scripts/audit-counts.mjs`, set `componentsPendingClassification`, `unclassifiedOptions` and `protocolPropsMissingJsdoc` to the measured values in both the ceiling and floor tables, each with `// ADR-225 (2026-10-28): treeview classified (P0).` Expected: 92, 528 (546 − 18), 373.
- Update the same numbers in `scripts/audit-counts.test.ts` wherever it pins them (`grep -n "93\|546" scripts/audit-counts.test.ts`).

- [ ] **Step 5: Glue triggers.** Replace the `TreeLike` interface and `CONFORMANCE_GLUE` in `components/treeview/treeview.conformance.ts`:

```ts
/** Minimal view of the handle, limited to what the triggers need. */
interface TreeLike
{
    setData(slot: string, value: unknown): void;
    selectNode(nodeId: string): void;
    expandNode(nodeId: string): void;
    getElement(): HTMLElement | null;
}

const FIXTURE_ROOTS = [
    { id: "fixture-root", label: "Root", kind: "folder", children: [{ id: "fixture-child", label: "Child", kind: "item" }] },
];

const LAZY_ROOTS = [{ id: "fixture-lazy", label: "Lazy", kind: "folder", children: null, lazy: true }];

/** Loads the fixture, so a trigger works whatever roots the mounting suite supplied. */
function withFixture(handle: Record<string, unknown>, roots: unknown): TreeLike
{
    const tree = handle as unknown as TreeLike;

    tree.setData("roots", roots);

    return tree;
}

/** Types into the search box; the component's debounce then runs its search. */
function typeSearch(tree: TreeLike, text: string): boolean
{
    const input = tree.getElement()?.querySelector<HTMLInputElement>(".treeview-search-input");

    if (!input) { return false; }

    input.value = text;
    input.dispatchEvent(new Event("input", { bubbles: true }));

    return true;
}

export const CONFORMANCE_GLUE =
{
    options: { roots: FIXTURE_ROOTS },

    /** Create-time props a provider request needs: a search box, and async search from the first node. */
    requestProps: { showSearch: true, searchAsyncThreshold: 1 },

    trigger: (channel: string, handle: Record<string, unknown>): boolean =>
    {
        const tree = withFixture(handle, FIXTURE_ROOTS);

        if (channel === "selection") { tree.selectNode("fixture-child"); return true; }

        if (channel === "activate")
        {
            const row = tree.getElement()?.querySelector(`[data-node-id="fixture-child"]`);
            row?.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
            return row !== null && row !== undefined;
        }

        return false;
    },

    request: (request: string, handle: Record<string, unknown>): boolean =>
    {
        if (request === "loadChildren") { withFixture(handle, LAZY_ROOTS).expandNode("fixture-lazy"); return true; }

        if (request === "search") { return typeSearch(withFixture(handle, FIXTURE_ROOTS), "Child"); }

        return false;
    },
};
```

Check before running:
- **`activate`:** `data-node-id` is set on both the row (`treeview.ts:2078`) and its `li` (`:2556`), and the `dblclick` listener is on the row (`:2875`). If `querySelector` returns the `li`, select the row's class instead; read `:2070–2080` for it.
- **`selectNode`:** confirm it fires the `selection` channel. The runtime fleet-conformance suite already relies on it.

- [ ] **Step 6: Rebuild, rewrite the baseline, and run the suites**

Run:

```bash
npm run build:agentui -- --write-baseline && npm run build:agentui
npx vitest run a2ui/fleet-adapter.test.ts runtime/fleet-conformance.test.ts scripts/agentui
```

Expected:
- both builds exit 0;
- `git diff --stat specs/agentui/published/catalog-v1.json` shows additions only: TreeView, its `$defs` (`TreeView__loadChildrenResult`, `TreeView__searchResult` and relocated `TreeView__*` defs), and the description text;
- G3 runs TreeView's mount, live, rebuild, events, provider and teardown tests, all passing.

If G3's "each event…" test fails for `activate`, fix the glue selector (Step 5).

- [ ] **Step 7: Commit and push**

```bash
git add components/treeview/treeview.manifest.ts components/treeview/treeview.conformance.ts a2ui/fleet-adapter.test.ts \
  scripts/agentui/migration.mjs scripts/audit-counts.mjs scripts/audit-counts.test.ts specs/agentui/published/catalog-v1.json
git commit -m "feat(agentui): TreeView joins catalog v1 with lazy children and server-side search as agent-answered providers (ADR-225)" \
  -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

---

### Task 5: browser tests for TreeView

**Files:**
- Modify: `tests/a2ui/harness-shared.ts` (`startHost`), `tests/a2ui/adapter-page.ts` (doc comment for the new query key)
- Create: `tests/a2ui-components/treeview.spec.ts`

**Interfaces:**
- Consumes: the harness helpers `useHarness`, `open(page, "lit", query)`, `send`, `surface`, `errors`, `actions`, `V` from `tests/a2ui/adapter-page.ts`.
- Produces: the `providerTimeoutMs` query parameter on the harness.

- [ ] **Step 1: The harness option.** In `tests/a2ui/harness-shared.ts`:
- replace the `createOutcropCatalog` call with:

```ts
    const timeout = params.get("providerTimeoutMs");
    const catalog = createOutcropCatalog({ Catalog, basicCatalog, BASIC_FUNCTIONS },
        { assetBaseUrl: base, injectBaseTheme: params.get("inject") === "1",
            ...(timeout === null ? {} : { providerTimeoutMs: Number(timeout) }) });
```

- add `providerTimeoutMs` to the header comment's list of query parameters.

- [ ] **Step 2: Write the spec** `tests/a2ui-components/treeview.spec.ts`:

```ts
/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * E2E: TreeView under @a2ui/lit with the test playing the agent: a selection
 * event, lazy children answered through a queue provider, server-side search
 * through a latest provider, and a provider timeout (ADR-225).
 */

import { expect, test, type Page } from "@playwright/test";

import { actions, errors, open, send, surface, useHarness, V } from "../a2ui/adapter-page";

useHarness();

const LOAD = { onLoadChildren: { event: { name: "load", context: { node: { path: "/ev/loadChildren" } } } },
    loadChildrenResult: { path: "/answers/children" }, eventData: { path: "/ev" } };

function folder(id: string, label: string): Record<string, unknown>
{
    return { id, label, kind: "folder", children: null, lazy: true };
}

async function answer(page: Page, path: string, value: unknown): Promise<void>
{
    await send(page, [{ version: V, updateDataModel: { surfaceId: "s", path, value } }]);
}

/** Clicks the expand toggle of the row labelled `label`. */
async function expand(page: Page, label: string): Promise<void>
{
    await page.locator("outcrop-tree-view [role=treeitem]", { hasText: label }).first()
        .locator(".treeview-toggle").click();
}

test.describe("TreeView under @a2ui/lit", () =>
{
    test("TreeView: clicking a row sends onSelection with the selected node", async ({ page }) =>
    {
        await open(page, "lit");
        await send(page, surface("s", { id: "root", component: "TreeView", eventData: { path: "/ev" },
            roots: [{ id: "a", label: "Alpha", kind: "item" }, { id: "b", label: "Beta", kind: "item" }],
            onSelection: { event: { name: "select", context: { nodes: { path: "/ev/selection" } } } } }));

        await page.locator("outcrop-tree-view", { hasText: "Beta" }).getByText("Beta").click();

        await expect.poll(() => actions(page)).toEqual([expect.objectContaining({ name: "select",
            context: { nodes: [expect.objectContaining({ id: "b" })] } })]);
        expect(await errors(page)).toEqual([]);
    });

    test("TreeView: expanding a lazy node asks the agent, and its answer renders as children", async ({ page }) =>
    {
        await open(page, "lit");
        await send(page, surface("s", { id: "root", component: "TreeView", roots: [folder("f", "Folder")], ...LOAD }));

        await expand(page, "Folder");
        await expect.poll(() => actions(page)).toEqual([expect.objectContaining({ name: "load",
            context: { node: expect.objectContaining({ id: "f" }) } })]);

        await answer(page, "/answers/children", [{ id: "c1", label: "Child one", kind: "item" }]);

        await expect(page.locator("outcrop-tree-view").getByText("Child one")).toBeVisible();
        expect(await errors(page)).toEqual([]);
    });

    test("TreeView: a second lazy node is asked for only after the first is answered (queue)", async ({ page }) =>
    {
        await open(page, "lit");
        await send(page, surface("s", { id: "root", component: "TreeView",
            roots: [folder("f1", "First"), folder("f2", "Second")], ...LOAD }));

        await expand(page, "First");
        await expand(page, "Second");
        await expect.poll(async () => (await actions(page)).length).toBe(1);

        await answer(page, "/answers/children", [{ id: "k1", label: "Kid of first", kind: "item" }]);
        await expect.poll(() => actions(page)).toEqual([expect.anything(), expect.objectContaining({ name: "load",
            context: { node: expect.objectContaining({ id: "f2" }) } })]);

        await answer(page, "/answers/children", [{ id: "k2", label: "Kid of second", kind: "item" }]);
        await expect(page.locator("outcrop-tree-view").getByText("Kid of first")).toBeVisible();
        await expect(page.locator("outcrop-tree-view").getByText("Kid of second")).toBeVisible();
    });

    test("TreeView: typing in search asks the agent, and its answer marks the match", async ({ page }) =>
    {
        await open(page, "lit");
        await send(page, surface("s", { id: "root", component: "TreeView", showSearch: true, searchAsyncThreshold: 1,
            eventData: { path: "/ev" }, roots: [{ id: "a", label: "Alpha", kind: "item" }, { id: "b", label: "Beta", kind: "item" }],
            onSearch: { event: { name: "search", context: { q: { path: "/ev/search" } } } },
            searchResult: { path: "/answers/search" } }));

        await page.locator("outcrop-tree-view .treeview-search-input").fill("Bet");
        await expect.poll(() => actions(page)).toEqual([expect.objectContaining({ name: "search", context: { q: "Bet" } })]);

        await answer(page, "/answers/search", ["b"]);

        await expect(page.locator(`outcrop-tree-view [data-node-id="b"].treeview-search-match`).first()).toBeVisible();
        expect(await errors(page)).toEqual([]);
    });

    test("TreeView: an unanswered request times out with OUTCROP_PROVIDER_TIMEOUT", async ({ page }) =>
    {
        await open(page, "lit", { providerTimeoutMs: "300" });
        await send(page, surface("s", { id: "root", component: "TreeView", roots: [folder("f", "Folder")], ...LOAD }));

        await expand(page, "Folder");

        await expect.poll(() => errors(page)).toEqual([expect.objectContaining({ code: "OUTCROP_PROVIDER_TIMEOUT",
            path: "/answers/children" })]);
    });
});
```

Before running, read `treeview.ts` for three class names: the row toggle (`.treeview-toggle`), the row role (`role=treeitem`), and the search-match class (`.treeview-search-match`). Correct them in the spec to what the component renders: `grep -n "toggle\|treeitem\|search-match\|searchMatch" components/treeview/treeview.ts`.

- [ ] **Step 3: Build and run**

Run: `npm run build && npm run test:e2e:a2ui`
Expected:
- all pass, including the five new TreeView tests and TreeView's generated render test;
- `scripts/agentui/gesture-coverage.test.ts` passes, because TreeView has a `"TreeView: "` title.

- [ ] **Step 4: Commit and push**

```bash
git add tests/a2ui/harness-shared.ts tests/a2ui/adapter-page.ts tests/a2ui-components/treeview.spec.ts
git commit -m "test(a2ui): TreeView in a real browser: selection, lazy children (queue), search (latest), provider timeout" \
  -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

---

### Task 6: docs and records

**Files:** `A2UI.md`, `agentdemo/page/agent/rules.ts`, `docs/A2UI_INTEGRATION_GUIDE.md`, `AGENTS.md`, `agentknowledge/decisions.yaml`, `agentknowledge/concepts.yaml`, `agentknowledge/history.jsonl`, `CHANGELOG.md`, `specs/agentui-sweep.prd.md` (status)

- [ ] **Step 1: A2UI.md.**
- In the G1 row of the gates table, replace "a catalog component declares a manifest action that isn't in `protocol.hostOnlyActions`, or any `protocol.providers`. The adapter cannot serve them yet (#31), …" with "a catalog component declares a manifest action that isn't in `protocol.hostOnlyActions`. The adapter has no action bar yet (#<N>), …".
- Replace the bullet "Manifest actions an agent could use, and providers, are #31." with "Manifest actions an agent could use are #<N>."
- Add a bullet to the agent-facing rules:

> **Providers (ADR-225).** A component that needs data asks for it through `on<Request>`: the request is at `<eventData path>/<request>`. Bind `on<Request>`, `<request>Result` (to a path) and `eventData`, or the component won't ask. Answer each request once, with `updateDataModel` at the path bound to `<request>Result`, with a value matching the `$defs` entry its description names. A component asks again only after you answer; an unanswered request fails after the host's timeout with `OUTCROP_PROVIDER_TIMEOUT`.

- Copy that bullet verbatim into the matching array in `agentdemo/page/agent/rules.ts`. Run `npx vitest run agentdemo` and expect the drift test to pass.

- [ ] **Step 2: Integration guide.** In `docs/A2UI_INTEGRATION_GUIDE.md`:
- add `providerTimeoutMs?: number` to the `createOutcropCatalog` options table: "How long a component's data request waits for the agent's answer, in ms. Default 30000. Page-global.";
- add `OUTCROP_PROVIDER_TIMEOUT` to the error-code table: "A provider request got no answer within `providerTimeoutMs`. `path` is the `<request>Result` path."

- [ ] **Step 3: AGENTS.md.** In the "Three more declarations" list, after the `presentation: "overlay"` bullet, add:

```markdown
- **`protocol.providers: { <option>: { request, concurrency? } }`: a callback
  that loads data on demand** (`onLoadChildren`, `onSearch`, `fetchFn`). The
  agent answers it (ADR-225). `concurrency: "queue"` for keyed loads (a node's
  children, a page); the default `"latest"` for searches. A provider makes the
  component `surface`.
- **Only meaningful callbacks become events** (readiness step 2, S6). Lifecycle
  callbacks (`onOpen`, `onClose`, `onFocus`, `onBlur`, `onHover`), callbacks
  `value` already carries, decisions (`onDragValidate`, `filterFn`), render hooks
  and formatters are `protocol.hostOnly` with a reason. An event makes the
  component `surface`, which needs additive `on()`/`getState()`/`setState()`.
- **Options the component passes to `fetch`, `XMLHttpRequest`, `import()` or
  `EventSource` are `protocol.hostOnly`** with: "The component fetches this URL
  from the user's browser with the host's credentials; an agent must not choose
  it." Image URLs are not covered.
```

- [ ] **Step 4: ADR-225** appended to `agentknowledge/decisions.yaml` in the ADR-224 format, with `id`, `title`, `date: "2026-10-28"`, `status: Accepted`, `context` and `files`.
- **Title:** "Providers over A2UI: one outstanding request per provider, latest or queue, with the answer schema in $defs; TreeView pilots"
- **`context`:**
  - the problem: G1 blocked every provider, so a component that loads data on demand couldn't join the catalog (#31);
  - the decisions S2, S3, S6 and S7;
  - the send order and the answer rule, the timeout, and teardown dropping promises (and why);
  - the pilot switch from PeoplePicker, with the reason;
  - G1 narrowed and the action-bar issue #<N>;
  - non-breaking: no component source changed, and the IIFEs are byte-identical.

Validate with `npx js-yaml agentknowledge/decisions.yaml > /dev/null`.

- [ ] **Step 5: concepts, history, CHANGELOG, spec status.**
- `concepts.yaml`: add `ProviderConcurrency` (anchor `a2ui/src/providers.ts`) and `UrlFetchRule` (anchor `AGENTS.md`), in the existing entry format, related to `A2uiAdapter` and `AgentProtocolSchema`.
- `history.jsonl`: one line, `{"date": "2026-10-28", "task": "Agent UI readiness step 2 P0: providers (#31) and TreeView", "type": "feature", "adrs": ["ADR-225"], "files": [...], "summary": "..."}`. Validate every line with `python3 -c "import json;[json.loads(l) for l in open('agentknowledge/history.jsonl')]"`.
- `CHANGELOG.md` under `[Unreleased]`, Added:

> **A2UI providers and TreeView** (ADR-225). A catalog component can now ask the agent for data: TreeView's lazy children and server-side search are answered by the agent through `on<Request>` and a bound `<request>Result`. `createOutcropCatalog` takes `providerTimeoutMs` (default 30 s); an unanswered request reports `OUTCROP_PROVIDER_TIMEOUT`. TreeView is in catalog v1. No component's options, callbacks or methods changed.

- `specs/agentui-sweep.prd.md`: set Status to "P0 implemented 2026-10-28", and record any amendment found during implementation in §9.

- [ ] **Step 6: Commit and push**

```bash
git add A2UI.md agentdemo/page/agent/rules.ts docs/A2UI_INTEGRATION_GUIDE.md AGENTS.md agentknowledge/decisions.yaml \
  agentknowledge/concepts.yaml agentknowledge/history.jsonl CHANGELOG.md specs/agentui-sweep.prd.md
git commit -m "docs(agentui): ADR-225 and contributor docs for providers over A2UI" \
  -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

---

### Task 7: verification and the PR

- [ ] **Step 1: The full suites.** Run: `npm run build && npm test && npm run test:e2e:a2ui && npm run audit:vendor`. Expected: all green.

- [ ] **Step 2: Mutation checks.** Break each rule, see its test fail, then restore it with `git checkout -- <file>`:

| Break | Expected failure |
|---|---|
| In `providers.ts` `#send`, remove the delete of the result path | "an answer equal to the previous one still resolves" |
| Make `ask` send immediately when a request is outstanding | "queue: every request is sent, strictly in order" and the browser queue test |
| Skip `#problem` (resolve every write) | "an invalid answer is VALIDATION_FAILED…" |
| Remove `release()`'s `this.#outstanding = undefined` | "teardown drops pending requests…" |
| Remove the `eventPath !== undefined` condition in `wireProviders` | "a provider is passed only when…" |
| Remove `"concurrency"` from `PROVIDER_KEYS` | "a provider's concurrency is latest or queue" |

Record each pair, and the result, in the PR description.

- [ ] **Step 3: The dist diff against `main`.**

```bash
git stash -u && git checkout -q main && npm run build >/dev/null && cp -R dist /tmp/claude-501/dist-main \
  && git checkout -q feat/agentui-providers && git stash pop && npm run build >/dev/null
diff -rq /tmp/claude-501/dist-main/components dist/components | grep "\.js " || echo "component JS identical"
```

Expected: `component JS identical`. Other diffs are expected and listed in the PR:
- the adapter bundle;
- the catalog, which adds TreeView;
- the runtime bundle (`ProviderSpec.concurrency` validation);
- `capability-manifest.json` (TreeView's protocol);
- the report.

- [ ] **Step 4: Measure the catalog's token growth.** The spec's §8 asks for it per batch.

```bash
node -e 'const a=require("/tmp/claude-501/dist-main/a2ui/catalog/v1.json"), b=require("./dist/a2ui/catalog/v1.json"); const n=(x)=>JSON.stringify(x).length; console.log(n(a), n(b), Math.round((n(b)-n(a))/4), "≈ tokens added")'
```

- [ ] **Step 5: Issues and the PR.**
- Comment on #20: the S6 and URL-fetch rules as new checklist items (spec §5.2 items 6 and 8; §5.3); TreeView done; PeoplePicker moved to B3.
- Create the PR against `main`:
  - **title:** "feat(agentui): providers over A2UI (#31) and TreeView in catalog v1"
  - **body:** what changed; the non-breaking evidence (Step 3); the mutation table (Step 2); the token growth (Step 4); the spec amendments (S6, S7, pilot); `Closes #31`, with a line naming #<N> as the action bar's new home.
  - End the body with "🤖 Generated with [Claude Code](https://claude.com/claude-code)", and no session link.

---

## B1: pickers with an item payload

**Goal:** the 10 B1 pickers join catalog v1, with two-way `value` mapped through `protocol.change`.

**Decisions (user, 2026-10-28):**
- **B1-1:** the "Custom…" link of MarginsPicker, SizesPicker, SpacingPicker and ColumnsPicker becomes a `custom` event; it is not host-only. Per S6 those four pickers become `surface`, with additive handle methods.
- **B1-2:** a surface component with no other view state declares its selection as its state: `stateKeys: ["value"]`. `getState()` returns `{ value }` and `setState({ value })` selects it. This is the precedent for later batches (spec §5.2 item 8).

**Per component:**

| Component | `protocol.change` | Host-only | Events | Level |
|---|---|---|---|---|
| FontDropdown | `{ valueFrom: "value" }` | `onOpen`, `onClose` | — | field |
| LineEndingPicker, LineShapePicker, LineTypePicker, LineWidthPicker | `{ valueFrom: "value" }` | `onOpen`, `onClose` | — | field |
| MarginsPicker, SizesPicker, SpacingPicker, ColumnsPicker | `{ valueFrom: "name" }` | — | `custom` (scalar, the current preset name; `legacyOption: "onCustom"`) | surface, `stateKeys: ["value"]` |
| LayoutPicker | `{ valueFrom: "id" }` | `customAlgorithms[].thumbnail` | — | field |

The mapped property is the one each component's own `setValue` matches: `find(x => x.value === v)`, `find(p => p.name === v)` and `find(a => a.id === v)` respectively.

**URL-fetch rule (§4):** none of the ten calls `fetch`, `XMLHttpRequest`, `import()` or `EventSource`.

### Task B1.1: additive surface methods on the four preset pickers

For each of MarginsPicker and SizesPicker (classes) and SpacingPicker and ColumnsPicker (closure factories):
- **The API interface gains:**
  - `setData(slot: string, value: unknown): void` (throws: the picker has no data slots);
  - `on(channel: string, handler: (payload: unknown) => void): () => void` (accepts only `"custom"`, throws otherwise);
  - `getState(): Record<string, unknown>` (returns `{ value: <selected preset name> }`);
  - `setState(state: Record<string, unknown>): void` (calls `setValue(state.value)` when `"value"` is present).
- **The "Custom…" click** goes through one `emitCustom()` that calls the existing `onCustom` handler exactly as before (same error handling) and then each `custom` subscriber with the selected preset name.
- **`destroy()`** clears the subscribers.
- **TDD:** each component's `*.test.ts` gains tests:
  - `on("custom")` hears a click on the "Custom…" link, after `onCustom`;
  - `getState()`/`setState()` round-trip the selection;
  - `on()` of an unknown channel and `setData()` throw.
- **Commit:** `feat(<name>): additive on("custom"), getState/setState and setData for the surface contract (B1-1)`.

### Task B1.2: manifests, glue, bookkeeping

- **Manifests:** each gains `agent`, `protocol` (change, and hostOnly where listed) and, for the four, `emits`, `stateKeys: ["value"]` and `conformance: "surface"`.
- **Conformance glue** (new `<name>.conformance.ts` for the four): `trigger("custom")` clicks the "Custom…" link.
- **Build:** `npm run build:manifest && npm run build:agentui` must report no B1 violations.
- **Bookkeeping:**
  - remove the ten from `PENDING_CLASSIFICATION`;
  - lower `componentsPendingClassification`, `unclassifiedOptions` and `changeMismatches` (ceiling and floor) to the measured values;
  - rewrite the baseline;
  - G3 and runtime fleet conformance pass.

### Task B1.3: gesture tests

`tests/a2ui-components/b1-pickers.spec.ts`:
- one `"<Name>: …"` test per picker: open it, pick an item, assert the bound value with `expectCatalogValid`;
- for the four preset pickers, also click "Custom…" and assert the `onCustom` action with the preset name at `eventData/custom`.

### Task B1.4: docs, verification, PR

- **Docs and records:** CHANGELOG, `history.jsonl`, an ADR (ADR-226: B1-1 and B1-2), AGENTS.md (the B1-2 rule), and #20 checkboxes.
- **Verification** as in P0 Task 7:
  - full suites;
  - mutation checks: a picker's `valueFrom`, the `custom` emit, `getState`;
  - the dist diff (exactly the four surface pickers' JS differ);
  - catalog token growth.
- **PR.**

---

## B2: date and time

**Goal:** the seven B2 pickers join catalog v1. The four whose `onChange` sends `T | null` declare `{ cleared: null }`: clearing deletes the bound path, and deleting the path clears the picker (readiness spec §3.4).

**Per component:**

| Component | `protocol.change` | Host-only | Events | Level |
|---|---|---|---|---|
| DatePicker | `{ cleared: null }` | `onSelect` (value carries it), `onOpen`, `onClose`, `isDateDisabled` (a decision) | — | field |
| PeriodPicker | `{ cleared: null }` | `onSelect`, `onOpen`, `onClose` | — | field |
| SprintPicker | `{ cleared: null }` | `onSelect`, `onOpen`, `onClose`, `sprintNaming` (its function arm) | — | field |
| TimePicker | `{ cleared: null }` | `onSelect`, `onOpen`, `onClose` | `timezone` (scalar IANA name, `legacyOption: "onTimezoneChange"`) | **surface**, `stateKeys: ["timezone"]` |
| DurationPicker | — (`onChange` passes the value) | `displayFormat` (a formatter), `onOpen`, `onClose` | — | field |
| CronPicker | — | `onPresetSelect` (value carries the expression) | — | field |
| TimezonePicker | — | `onSelect`, `onOpen`, `onClose` | — | field |

**TimePicker's timezone (S6).** `TimeValue` is `{ hours, minutes, seconds? }`; the timezone lives outside it. When `showTimezone` is on, a user can change the zone, which changes what the time means, and the agent would not hear it. So it's an event. Because the timezone is real view state, B1-2's `"value"` rule doesn't apply. As a state key, `timezone` updates live through `setState` instead of rebuilding.

**URL-fetch rule (§4):** checked per component in Task B2.2.

### Task B2.1: TimePicker's additive surface methods
- **Handle additions:**
  - `setData` throws (no slots);
  - `on("timezone")`, with any other channel throwing;
  - `getState()` returns `{ timezone }`;
  - `setState({ timezone })` calls `setTimezone`.
- **Both timezone paths** (`setTimezone` and the selector) go through one emit: `onTimezoneChange` first, exactly once, then the subscribers.
- **TDD in `timepicker.test.ts`;** commit `feat(timepicker): …`.

### Task B2.2: manifests, glue, bookkeeping
- **Manifests** gain `agent`, `protocol` and TimePicker's `emits`, `stateKeys` and `surface`.
- **Glue:** `timepicker.conformance.ts` triggers `timezone` by calling `setTimezone`. It's a real user path, but the runtime suite accepts a programmatic trigger, as TreeView's `selectNode` does.
- **The build** must report no B2 violations, including the `{ cleared: null }` check that `setValue` accepts `null`.
- **Bookkeeping:** remove the seven from the pending list; lower the pins (ceiling and floor); rewrite the baseline; G3 and runtime conformance pass.

### Task B2.3: gesture tests
`tests/a2ui-components/b2-datetime.spec.ts`, one literal `"<Name>: …"` test each:
- picking writes a value that passes `expectCatalogValid`;
- for the four `cleared` pickers, clearing deletes the bound path;
- deleting the path clears the picker;
- TimePicker's timezone change sends `onTimezone`.

### Task B2.4: docs, verification, PR
As in B1:
- docs and records: ADR-227 if a new decision is recorded (the TimePicker timezone event), CHANGELOG, `history.jsonl`, #20;
- full suites, mutation checks, the dist diff (only `timepicker.js`), token growth;
- the PR.

---

## B3: other value inputs, and PeoplePicker

**Goal:** ten of the eleven B3 components join catalog v1. FileUpload stays pending (below).

**Per component:**

| Component | Value | Host-only | Events | Level, `stateKeys` |
|---|---|---|---|---|
| AnglePicker | two-way | `onOpen`, `onClose` | — | field |
| ColorPicker | two-way (`onChange(color, alpha)`; the colour is the value) | `onInput` (continuous; value carries the commit), `onOpen`, `onClose`, `triggerElement` | — | field |
| GradientPicker | two-way | `onInput`, `onOpen`, `onClose`, `onClear` (onChange carries the reset; see the fix below) | — | field |
| MaskedEntry | two-way | `onCopy`, `onReveal` (local actions on a secret; not for an agent) | — | field |
| EditableComboBox | two-way | `onSelect` (value carries it), `onOpen`, `onClose`, `filterFn` (a decision) | — | field |
| SymbolPicker | two-way | `onSelect` (a highlight), `onOpen`, `onClose`, `triggerElement` | `insert` (record: the symbol) | surface, `["value"]` (B1-2) |
| Slider | **one-way** (`protocol.change: "event"`: `onChange` passes `number \| { low, high }`) | `formatValue`, `onSlideStart`, `onSlideEnd` | `change` (scalar or record) | surface, `["value", "range"]` |
| SearchBox | none (`getValue()` is the query) | `suggestions`' function arm | `search` (scalar, debounced), `submit` (scalar) | surface, `["value"]` (B1-2) |
| Tagger | `tags` (data, now a state key, so updates live) | `onAdd`/`onRemove` (change carries them), `validator`, `onValidationError`, `tags[].data` | `change` (collection) | surface, `["tags"]` |
| PeoplePicker | two-way | `searchUrl` (URL-fetch rule), `onSelect`/`onDeselect` (value carries them), `onOpen`, `onClose`, `onSearchError` (a provider failure already reaches the agent as `OUTCROP_PROVIDER_TIMEOUT`) | — ; provider `onSearch` (`latest`) | surface (the provider), `["value"]` (B1-2) |

- **FileUpload stays pending (§5.3).** `onUpload` receives browser `File` objects for the host to upload, and JSON can't carry them. Over A2UI files would queue and never upload, so it would render but not work. The reason goes to #20.
- **URL-fetch rule:** PeoplePicker `searchUrl`. Task B3.2 checks the other nine.
- **~~Component fix~~ (withdrawn during implementation):** GradientPicker's `clear()` already calls `emitChange()` right after `onClear`. A truncated grep had hidden that line, so there is nothing to fix.

### Task B3.1: additive surface methods
For SymbolPicker, Slider, SearchBox, Tagger and PeoplePicker:
- **`setData`** throws (no slots).
- **`on(channel)`** accepts the declared channels only; PeoplePicker declares none, so every channel throws.
- **`getState`/`setState`** cover the `stateKeys` above.
- **Each new channel** emits after the existing callback, which still fires first and exactly once.
- **TDD per component;** one commit each.

### Task B3.2: manifests, glue, bookkeeping
- **Manifests:** agent sentences, `protocol` and `emits` per the table; PeoplePicker's 15 JSDoc comments and Tagger's 15 (comment-only).
- **Conformance glue** for the five surface components: a trigger per channel, and PeoplePicker's `request("search")`.
- **Bookkeeping:**
  - remove ten from the pending list (FileUpload stays);
  - lower the pins;
  - rewrite the baseline;
  - G3 and runtime conformance pass.

### Task B3.3: gesture tests
`tests/a2ui-components/b3-inputs.spec.ts`, one literal `"<Name>: …"` test per component (PeoplePicker's provider round trip included).

### Task B3.4: docs, verification, PR
- **Records:** ADR-228, CHANGELOG, `history.jsonl`, #20.
- **Verification:** full suites, mutation checks, the dist diff (the five surface components' JS), token growth.
- **The PR,** stacked on #48.

---

## B4: display

**Goal:** ten of the eleven B4 components join catalog v1. DocViewer stays pending (below).

**User decisions (2026-10-29):**
- **B4-1, empty `stateKeys`:** a surface component with nothing to restore declares `stateKeys: []`, and its `getState()` returns `{}`. The runtime rule that rejected this is removed (ADR-229). Clicks that express intent become events; hover stays host-only. Expansion is view state, so PresenceIndicator and ReasoningAccordion declare it.
- **B4-2, ThemeToggle joins:** `onChange(theme, mode)` becomes a `change` event carrying `{ theme, mode }`, and `mode` is its state key. Its agent sentence says it restyles the whole page.

**The link rule (new, ADR-229):** an option whose value becomes an `<a href>` is host-only, with the reason
> "A link the user follows from the host's page; an agent must not choose it. Over A2UI, listen for the click event and answer with openUrl."

An agent-chosen `javascript:` URL would run in the host's origin when the user clicked it. B4 covers MetricCard `href`, PersonChip `href` and Pill `href`. Image URLs stay data (§4).

Breadcrumb `items[].href` is a nested plain string, and `hostOnly` can't name one. Instead, a `protocol.schemas` override for `items` leaves it out, and the closed schema rejects an agent's link (amended during implementation).

**Per component:**

| Component | Value | Host-only | Events (payload) | Level, `stateKeys` |
|---|---|---|---|---|
| StatusBadge | — | — | `click` (scalar: the label) | surface, `[]` |
| MetricCard | — | `href` (link rule) | `click` (scalar: the label); additive `clickable` option | surface, `[]` |
| Pill | — | `href` (link rule), `onHover`, `onHoverOut` | `click`, `dismiss` (scalar: the label) | surface, `[]` |
| Gauge | **one-way** (`protocol.change: "event"`) | `onChange` (fires inside `setValue`, so it echoes the writer), `onOverLimit`, `onOverdue` (follow from the value, limit and deadline the agent set), `formatValue` | — | field (unchanged) |
| EmptyState | — | `illustration` (an element; step 4) | `action`, `secondary` (scalar: the button label); the buttons emit without `onAction`/`onSecondary` | surface, `[]` |
| Breadcrumb | — | `items[].href` (link rule, through a `protocol.schemas` override for `items`), `items[].data` (too broad) | `itemClick` (record: `{ item, index }`), `actionClick` (record: `{ actionId, item }`) | surface, `[]` |
| PersonChip | — | `href` (link rule), `metadata` (data-* attributes), `onHover`, `onHoverOut` | `click` (record: `{ name, email }`) | surface, `[]` |
| PresenceIndicator | — | `onClick` (per-person clicks render through PersonChip, which the adapter does not load), `onExpand`, `onCollapse` (view state), `people[].metadata` (data-* attributes) | — | display (unchanged) |
| ThemeToggle | — | — | `change` (record: `{ theme, mode }`) | surface, `["mode"]` |
| ReasoningAccordion | — | `steps[].metadata` (too broad), `onStepClick` and `onExpandChange` (a step click toggles its expansion: view state, not intent) | — | display (unchanged) |

- **DocViewer stays pending.**
  - It throws without MarkdownRenderer, and the adapter loads only a component's own script and CSS.
  - `pages[].url` goes to `fetch()`, so the URL-fetch rule makes it host-only, leaving `pages[].markdown` as the agent's way in.

  Joining needs manifest-declared script dependencies loaded by the adapter, which a follow-up issue tracks. The reason goes to #20.
- **URL-fetch rule:** none of the ten calls `fetch`, `XMLHttpRequest`, `import()` or `EventSource`. DocViewer is the only B4 component that does.
- **Clickable without a callback:** MetricCard is clickable only when `onClick` is passed, and the adapter subscribes through `on()` instead. It gains an additive `clickable` option, the name StatusBadge, Pill and PersonChip already use. MetricCard's existing lifecycle `setState("ready" | "loading" | "error")` gains an overload that takes the contract's record and does nothing. EmptyState binds its buttons only when `onAction`/`onSecondary` is passed. Its buttons now always listen, and the callbacks still fire first. Every existing combination behaves as before.
- **PresenceIndicator changed during implementation:** its clickable avatars are built by `window.createPersonChip`. Without it, the fallback avatars aren't clickable, even with `onClick`, and the adapter loads only PresenceIndicator's own script. Over A2UI a `click` channel could never fire, so `onClick` is host-only and PresenceIndicator joins at display until the script-dependency issue lands. The handle change was discarded.
- **`metadata` is host-only** (PersonChip `metadata`, PresenceIndicator `people[].metadata`). It becomes `data-*` attributes on the root element, which host scripts read: Bootstrap's `data-bs-toggle` and `data-bs-target`, for example, act on click.
- **ReasoningAccordion changed during implementation:** its step click is the expansion toggle (`handleStepClick`), so it is view state under S6, not an event. It joins at display with no handle changes.
- **Payloads are JSON:** Pill, PersonChip and Gauge pass their own instance to the legacy callbacks. The new channels send the label or a record instead, never `this`.

### Task B4.1: the runtime accepts empty `stateKeys` (ADR-229)
- **Code:** remove the `surface && stateKeys.length === 0` issue from `runtime/src/registry.ts`.
- **Tests:** turn `registry.test.ts`'s "requires a surface-level manifest to declare state keys" into "allows a surface manifest with no view state".
- **Bundle:** regenerate `runtime/runtime.ts`.
- **Docs:** one sentence in `docs/SURFACE_CONTRACT.md` §2.

### Task B4.2: additive surface methods
For the seven surface components above:
- **`setData`** throws (no slots).
- **`on(channel)`** accepts the declared channels only.
- **`getState`/`setState`** cover the `stateKeys`: `{}` and a no-op for the six with none.
- **Each new channel** emits after the existing callback, which still fires first and exactly once.
- **TDD per component;** one commit each.

### Task B4.3: manifests, glue, bookkeeping
- **Manifests:**
  - agent sentences, `protocol` and `emits` per the table;
  - JSDoc for PersonChip (12), PresenceIndicator (7) and ReasoningAccordion (13), comment-only.
- **Conformance glue:** a trigger per channel for the seven.
- **Bookkeeping:**
  - remove ten from the pending list (DocViewer stays);
  - lower the pins;
  - rewrite the baseline;
  - G3 and runtime conformance pass.

### Task B4.4: gesture tests
`tests/a2ui-components/b4-display.spec.ts`, one literal `"<Name>: …"` test per surface component, plus Gauge's one-way value and ReasoningAccordion rendering its steps.

### Task B4.5: docs, verification, PR
- **Records:**
  - ADR-229 (empty `stateKeys`, the link rule);
  - AGENTS.md rules;
  - A2UI.md and its `rules.ts` mirror if agent-facing text changes;
  - CHANGELOG, `history.jsonl`;
  - #20, plus a note on #26 that the `stateKeys` blocker is gone;
  - the script-dependency issue.
- **Verification:**
  - full suites and mutation checks;
  - the dist diff (the seven components' JS, and the runtime);
  - token growth.
- **The PR,** stacked on #50.

---

## P1: component dependencies (#51), before B5

**User decisions (2026-10-29):** build #51 before B5, and serve marked and KaTeX from `/lib/`.

**Goal:** a catalog component can need a vendored library or another component, and the adapter loads it first. DocViewer joins, and PresenceIndicator gains its click. B5 and B6 can then include CodeEditor (CodeMirror 6), MarkdownEditor (Vditor), LatexEditor (KaTeX) and ChartPanel (Chart.js).

**As built:**
- **Vendor:**
  - `marked` 18.0.12, pinned exactly; it was `^18.0.12`, so nothing moved;
  - `katex` 0.19.0, a single file;
  - `katex-css` 0.19.0, the stylesheet plus fonts;
  - `build:vendor` now runs before `build:agentui`.
- **`protocol.dependencies: { libraries?, components? }`:**
  - the registry validates its shape;
  - the generator resolves it into descriptor `deps`: libraries with URL and integrity, then component script and CSS. Problems for unknown names; dependencies aren't followed transitively.
- **Adapter loader:** `deps` are injected before the component's script, libraries with `integrity` and `crossorigin`; once per URL.
- **Generator:**
  - nested `hostOnly` paths to plain fields are removed from the schema;
  - the `readOnly` keyword is dropped.

  Breadcrumb and PresenceIndicator keep their B4 overrides, so a published B4 schema never changes.
- **Tests:**
  - G3 and the fleet gate install dependencies;
  - G3 honours glue `heldProps`;
  - `p1-dependencies.spec.ts`: DocViewer renders through marked with SRI, its page URL is rejected, and a PresenceIndicator click reaches the agent.
- **Bookkeeping:** pending 55 → 54; `unclassifiedOptions` 427 → 425.

---

## B5: editors and forms (as built)

**Seven of eight join:** RichTextInput, MarkdownEditor, LatexEditor, CodeEditor, Stepper, DynamicFormSwitcher and InlineToolbar. PropertyInspector stays pending: its content arrives through `open()` as DOM elements (step 4).

| Component | Events (payload) | `stateKeys` | Notes |
|---|---|---|---|
| RichTextInput | `submit` (the value) | `["value"]` | `outputFormat` host-only (markdown out, HTML in) |
| MarkdownEditor | `save` (markdown) | `["value"]` | deps `vditor`, `vditor-css` (new SRI asset), `dompurify` |
| LatexEditor | `confirm` (`{ latex, mathml }`) | `["value"]` | deps `katex`, `katex-css` |
| CodeEditor | `save` (code) | `["value"]` | dep `codemirror6`; a subscriber enables Save |
| Stepper | `stepChange` (`{ from, to }`), `finish`, `saveDraft` (active step) | `["activeStep"]` | `steps` schema override; content and validate host-only |
| DynamicFormSwitcher | `change` (`{ variantId, values }`), also on a variant switch | `["variant", "values"]` | `change: "event"`; built-in field types only; additive `getElement()` |
| InlineToolbar | `itemClick` (`{ id, active }`) | `[]` | no `legacyOption` (`onClick` is per item) |

**Also built:**
- **Generator:**
  - a prop with a `protocol.schemas` entry isn't given to typia; it takes its JSDoc as description and stays required;
  - unions of consts and bare primitive types are sorted and compared as sets.
- **Harness:**
  - async triggers;
  - jsdom stand-ins (`tests/jsdom/standins.ts`: Vditor);
  - `heldProps` in every G3 test.
- **Pins:**
  - pending 54 → 47;
  - `unclassifiedOptions` 425 → 392;
  - `protocolPropsMissingJsdoc` 312 → 286;
  - `changeMismatches` 2 → 1.

---

## B6: data views (as built)

**All nine join catalog v1, for 63 in all.**

| Component | Over A2UI |
|---|---|
| DataGrid | adds `cellEdit`; export is a host-only action; `on()` unchanged (accepts any name) |
| TreeGrid | surface: `selection`, `activate`, `editCommit`, `contextMenuAction`, `drop`; `["expanded", "selection"]`, restored silently; provider `loadChildren` (queue) |
| ActivityFeed | `eventClick`, `actorClick`, `targetClick`; `onLoadMore` host-only (no parameter) |
| AuditLogViewer | `rowClick`; `onLoadPage` (two parameters), `serverSide` and `autoRefresh` host-only |
| NotificationCenter | `notificationClick`, `dismiss`, `markAllRead` |
| FacetSearch | `search`; `["value"]` |
| ChartPanel | display; dep `chart.js` |
| LogConsole | display; additive `entries` option; `theme` host-only (deprecated) |
| VisualTableEditor | field; its fine-grained callbacks host-only |

**Pins:**
- pending 47 → 38;
- `unclassifiedOptions` 392 → 326;
- `protocolPropsMissingJsdoc` 286 → 202.

---

## B7: collaboration and AI

**Goal:** five of six join catalog v1: PromptTemplateManager, ActionItems, RelationshipManager, Conversation and ExplorerPicker. CommentOverlay stays pending.

**User decisions (2026-10-29):**
- **B7-1, an agent rewrites a list in place:** a data collection an agent rewrites mid-conversation is an `accepts` slot written through `setData`, not a create prop, so the user keeps their draft, scroll, selection, collapse and sort. This covers Conversation `session`, ActionItems `items`, RelationshipManager `relationships` and PromptTemplateManager `templates`. A slot whose rows need fields the generic `{ id, name }` sample lacks gets a glue `slotSamples` entry; this harness extension landed first (`8700a68c`).
- **B7-2, Conversation's Vditor CDN:** `Vditor.preview()` in Conversation sets no `cdn`, so for every existing user Vditor loads lute and KaTeX from unpkg. A labelled `fix(conversation)` commit points it at the library's own mirror, as MarkdownEditor's `VDITOR_CDN` does (ADR-149).
- **B7-3, ExplorerPicker gains its seams in B7:** it joins with new additive providers, not as pending.

**Rules derived from earlier batches (no user question):**
- **Callbacks the component never calls** are host-only with the reason "The component never calls this option." Don't make them fire, because an unused public member is not dead API. They are ActionItems `onPriorityChange`, `onDueDateChange`, `onTagChange` and `onExport`, RelationshipManager `onEditProperties`, and Conversation `onLoadSession` and `onError`. Options nothing reads (RelationshipManager `showConfidence`, ExplorerPicker `hideSystemFolders`) are host-only with "Nothing reads this option."
- **A loader with no parameter** is host-only (B6 ActivityFeed `onLoadMore`): PromptTemplateManager `onLoadTemplates`, although §5.3 names it a provider.
- **A loader with two parameters** gets an additive single-object variant when the component can't work over A2UI without it, and is host-only otherwise (B6 AuditLogViewer `onLoadPage`). RelationshipManager's Add flow needs its search, so `onSearchResources(query, typeKeys)` gains `onSearchTargets({ query, typeKeys })`.
- **Selection** is both an event and a state key (TreeGrid).
- **Script dependencies** a component throws without are declared (P1): `inlinetoolbar`, `hovercard`, `confirmdialog`, `typebadge`, `vditor`, as each component uses them.
- **DOM slots** wait for step 4: ActionItems' comment slot means `onRenderCommentSlot` and `onCommentToggle` are host-only.
- **New features are follow-ups:** PromptTemplateManager's "Use template" button and an ExplorerPicker static-tree expansion fix are not built in B7.

**Per component:**

| Component | Slot | Events (payload) | Providers | `stateKeys` | Additive API besides the surface methods |
|---|---|---|---|---|---|
| PromptTemplateManager | `templates`, keeping the selection | `select` (id), `save` (record), `delete` (id), `duplicate` (record) | — | `["selected", "variables", "preview"]` | — |
| ActionItems | `items` (silent; prunes stale selection and editing ids) | `itemCreate`, `itemUpdate`, `statusChange`, `itemReorder`, `assignmentRequest` (records); `itemDelete` (id); `bulkDelete`, `bulkAssign`, `selection` (collections) | — | `["selection", "collapsed", "sort", "filter", "showArchived"]` | — |
| RelationshipManager | `relationships` | `createRelationship` (record); `deleteRelationship`, `navigate`, `confirmInferred`, `dismissInferred` (ids) | `onSearchTargets` → `search` (latest) | `["sortMode", "collapsed"]` | `onSearchTargets`; with no `onCreateRelationship` but a `createRelationship` subscriber, Add emits and closes the panel; `getElement()`. The conformance gate's spies, which return no Promise, are wrapped in the glue's `invoke`, not widened in the component |
| Conversation | `session` (`loadSession`, silent) | `sendMessage` (text), `feedback` (record), plus `newSession`/`clearSession` if the component clears locally | — | `[]` | — |
| ExplorerPicker | — | `selection`, `confirm`, `cancel` (collections of node records; `cancel` carries the selection abandoned) | `onLoadChildren({ nodeId })` → `loadChildren` (queue); `onSearch({ query, cursor })` → `search` (latest) | `["expanded", "selection"]` | the two providers; `cancellable` (shows Cancel without `onCancel`); `showSearch` (default true); `onConfirm` becomes optional at the call site |

- **Host-only, with reasons in each manifest:**
  - The URL-fetch rule covers ExplorerPicker `apiBase`, `ontologyApiBase`, `fetchFn` and `ontologyFetchFn` (the `fetch` replacements also return a Response, which an agent can't supply), and its recent and starred sections, which load from the host's endpoints.
  - Too-broad records: `session.metadata` and `session.messages[].metadata` (they also carry `mcpApp` HTML), `templates[].metadata`, `relationshipDefinitions[].propertiesSchema` and `relationships[].properties`.
  - The link rule covers none of them; avatars and icons are image URLs.
- **CommentOverlay stays pending.** Pins are placed only from `pins[].anchorElement` (a live DOM element) and over the host page region `container`. Over A2UI the adapter's box is empty, no element can be sent, and no user gesture starts placement. It can join once A2UI children (step 4), coordinate-only pins and a user-reachable placement trigger exist. The reason goes to #20.
- **Payloads are JSON copies,** never live objects or the instance; Dates become ISO strings.
- **Every new channel emits after the legacy callback,** which still fires first and exactly once. `setData` and `setState` restore silently: no legacy callback and no channel. They never reuse a method that fires (`addItem`, `setSelection`, `setSortMode`, `selectTemplate`).

### Task B7.1: one component at a time
In this order: PromptTemplateManager, ActionItems, RelationshipManager, Conversation (the `fix` commit first), then ExplorerPicker. Each component:
- **Handle work:** additive handle and options work, TDD, one `feat(<name>)` commit;
- **JSDoc:** for every data prop it lacks, comment-only;
- **Manifest:** `agent`, `emits`, `accepts`, `stateKeys`, `protocol` (`hostOnly`, `providers`, `dependencies`, `schemas` where needed) and `conformance: "surface"`;
- **Conformance glue:** `options`, `eventProps`, `slotSamples`, a trigger per channel and a `request` per provider;
- **Bookkeeping:** out of `PENDING_CLASSIFICATION`, the pins lowered exactly, and the baseline rewritten (adds only);
- **Gesture tests:** literal `"<Name>: …"` tests in `tests/a2ui-components/b7-collab.spec.ts`, which must include one proving that an agent's slot write keeps the user's in-progress state.

### Task B7.2: docs, verification, PR
- **Records:**
  - ADR-234 (B7-1 slots, the derived rules);
  - AGENTS.md (`slotSamples`, done with the harness);
  - CHANGELOG, `history.jsonl`;
  - #20, including CommentOverlay's reason;
  - follow-up issues for the PromptTemplateManager Use button and ExplorerPicker's static-tree expansion.
- **Verification:**
  - full suites and mutation checks;
  - the dist diff: the five components' JS, plus Conversation's labelled fix;
  - the prompt-size line.
- **The PR,** targeting `main` once #57 merges.

---

## B8: app shell

**Goal:** six of eight join catalog v1: MarketingHero, SiteFooter, TenantSwitcher, AppLauncher, Ribbon and RibbonBuilder. HelpDrawer and NavRail stay pending.

**User decisions (2026-10-29):**
- **B8-1, SiteFooter joins with link events.** A link with no `href` renders as a button and emits `linkClick` `{ text, group }`; the agent answers with openUrl. `SiteFooterLink.href` becomes optional (a widening). The link rule's schema override leaves every `href` out. Hosts that pass hrefs see no change.
- **B8-2, HelpDrawer and NavRail stay pending.** Their reasons go to #20:
  - HelpDrawer appends itself to `document.body` as a page-level drawer, and its content arrives only through `open(topic)`, a method; `topic.url` is fetched (URL-fetch rule). Over A2UI it would escape its surface, and nothing an agent sends could open it.
  - NavRail pins itself to the viewport unless `contained`. Every rail, contained or not, registers with a page-wide manager that writes `--navrail-<edge>-width` on `<html>` and hides a second rail at the same edge. Over A2UI it would change the host's layout or hide the host's own rail.
- **B8-3, Ribbon joins with its keys confined.**
  - An additive `keyScope?: "document" | "ribbon"` option: `"document"` (the default) is today's behaviour; `"ribbon"` handles keys only while focus is inside the ribbon.
  - A new manifest field, `protocol.fixed: { <option>: <JSON value> }`: the adapter always passes these values, and the catalog leaves the options out. Ribbon declares `fixed: { keyScope: "ribbon" }`.
  - RibbonBuilder joins with Ribbon, as a component emitting `change` and `export`.

**Per component:**

| Component | Events (payload) | Providers | `stateKeys` | Host-only and schemas |
|---|---|---|---|---|
| MarketingHero | `primary`, `secondary` (scalar: the button text); the buttons always listen, callback first (EmptyState precedent) | — | `[]` | `aside` (element); a closed override for `primaryAction`/`secondaryAction` leaves `href` (link rule) and `onClick` out |
| SiteFooter | `linkClick` (`{ text, group }`, `group` the group title, or `null` for the legal row) | — | `[]` | `organization.logo` (element); closed overrides for `groups` and `legal` leave `href` out |
| TenantSwitcher | `switch` (the tenant without `data`), `create` (scalar: the search text) | `onSearch` → `search` (latest) | `["activeTenantId"]` | `onOpen`/`onClose` (lifecycle); `tenants[].data` |
| AppLauncher | `select` (the app without `data`), `favoriteToggle` (`{ appId, isFavorite }`) | `onSearch` → `search` (latest) | `[]` | `onOpen`/`onClose`; `favoritesKey`/`recentKey` (localStorage keys on the host's origin: an agent could make the component read and overwrite any stored entry); `apps[].url` ("Nothing reads this option."); `apps[].data` |
| Ribbon | `controlClick` (`{ controlId, value }`, the value from `getControlValue`) | — | `["activeTabId", "collapsed", "contextualTabs", "controlValues", "autoCollapseDelay"]` (the existing `getState()`; additive `setState` restores silently) | `onTabChange`, `onCollapse` (view state); `onQATCustomize` ("The component never calls this option."); `statusBar` (element); closed overrides for `tabs`, `menuBar` and `qat` leave out nested callbacks, `custom` controls and backstage content; colours take the hex pattern; `fixed: { keyScope: "ribbon" }` |
| RibbonBuilder | `change` (the config), `export` (scalar: the markdown) | — | `[]` | `container` (element arm); `initialConfig` reuses Ribbon's closed schemas; dependencies `ribbon` and `symbolpicker` |

- **Rules carried from B7:**
  - nested open records are closed by overrides;
  - icon classes and colours follow the cross-component rule;
  - payloads are JSON copies;
  - every new channel emits after its legacy callback;
  - setState restores silently;
  - existing bugs are reported, not fixed.
- **URL-fetch rule:** none of the six fetches. HelpDrawer's `topic.url` is one of the reasons it stays pending.

### Task B8.1: per component
In this order: MarketingHero, SiteFooter, TenantSwitcher, AppLauncher, then `protocol.fixed` (runtime type, registry validation, generator, adapter descriptor and element; tests), Ribbon, RibbonBuilder. Each component gets:
- the component commit (additive surface, TDD);
- the agentui commit (manifest, glue, bookkeeping, baseline, A2UI.md);
- gesture tests in `tests/a2ui-components/b8-shell.spec.ts`.

### Task B8.2: docs, verification, PR
- **Records:** ADR-235 (B8-1 to B8-3, `protocol.fixed`), AGENTS.md, CHANGELOG, `history.jsonl`, concepts, and #20 with the two pending reasons.
- **Verification:** full suites and mutation checks; the dist diff; the prompt-size line.
- **The PR,** to main.
