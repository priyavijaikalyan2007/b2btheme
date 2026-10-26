<!--
SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
SPDX-FileCopyrightText: 2026 Outcrop Inc
SPDX-License-Identifier: MIT
Repository: enterprise-bootstrap-theme
File GUID: 6f0d2a8e-3b1c-4f57-9a64-2c8e5d71b903
Created: 2026
-->

<!-- AGENT: Implementation plan for Agent UI sub-project 1 (#18) — the A2UI adapter. Executed task by task with superpowers:subagent-driven-development. -->

# A2UI Adapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let any A2UI v0.9.1 host (Google's Lit and React renderers first) render the components in catalog v1 and round-trip data and events with them. A component classified later must gain the same support with no adapter change.

**Architecture:**
- One generic vanilla custom element (`OutcropComponentElement`), with one thin subclass per tag. Each subclass is configured by a descriptor that the existing `scripts/agentui/` generator derives from the manifest and `resolveSurface`.
- The element uses only the `context` object the host renderer assigns, and imports nothing from `@a2ui/web_core`.
- The generator bundles the element, the descriptors, Ajv-standalone validators and the catalog text into `dist/a2ui/adapter/v1.js` with esbuild, inside the same atomic `writeOutputs` swap as the catalog, so the two can never disagree.
- Hosts call `createOutcropCatalog(webCore, { assetBaseUrl })`.

**Tech stack:**
- TypeScript (ES2020, DOM)
- esbuild 0.28.2: ESM bundle, run in-process by the generator
- Ajv 8.20.0 standalone
- vitest + jsdom
- Playwright (Chromium)
- devDependencies, pinned exactly:
  - `@a2ui/web_core` 0.14.0
  - `@a2ui/lit` 0.14.0
  - `@a2ui/react` 0.14.0
  - `@a2ui/markdown-it` 0.2.2 (the Lit renderer's peer)
  - `react` 19.3.1
  - `react-dom` 19.3.1

## Global Constraints

- **Spec:** `specs/agentui-a2ui.prd.md` (approved 2026-10-26; §14 amendments dated 2026-10-26 apply). Where this plan and the spec disagree, stop and ask.
- **Depends on #17's code**, which is on this branch (`feat/agentui-18` is based on `feat/agentui-17`). `specs/agentui-schema.prd.md` stays authoritative for the catalog.
- **AGENTS.md applies in full:**
  - TDD: the test is seen failing before the implementation.
  - **No fallback code.** When something is broken, throw a literate error, or send the A2UI error the spec names.
  - **No fabricated reads**, and never `defaultOptions`. Agents' absent props are omitted (spec §5.1).
  - Allman braces; methods ≤ 30 lines; nesting ≤ 3.
  - LITERATE_ERRORS.md message shape: what happened, where, how to fix.
- **Every new file starts with the SPDX header** used by `scripts/factory-census.mjs`, with a `⚓ COMPONENT` / `📜 PURPOSE` / `🔗 RELATES` / `⚡ FLOW` block (MARKERS.md). Test files use the `factory-census.test.ts` header style (`⚓ TESTS:`).
- **Dependencies are exact pins** with no range. Add only those listed under Tech stack. Do not upgrade `ajv`, `esbuild` or `typia`.
- **Constants:**
  - catalog ID: `https://static.outcrop.us/a2ui/catalog/v1.json`
  - basic catalog ID: `https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json`
  - common types ID: `https://a2ui.org/specification/v0_9/common_types.json`
  - tag prefix: `outcrop-`
  - adapter path: `dist/a2ui/adapter/v1.js` + `v1.d.ts`
  - error codes: `VALIDATION_FAILED`, `OUTCROP_BINDING_LOST`, `OUTCROP_ASSET_LOAD_FAILED`, `OUTCROP_MOUNT_FAILED`
  - log prefix: `[A2UI]`
- **Host neutrality (D2/D13):** no emitted file may contain `knobby`. There is no default `assetBaseUrl`.
- **Additive only (D11):** do not change any factory, handle, options interface, legacy callback or published file. Nothing new on `window`, including `window.EnterpriseRuntime`.
- **The element imports nothing from `@a2ui/*` at runtime.** Only `import type` is allowed, and only in `a2ui/src/types.ts`, if anywhere.
- **GitHub:** every `gh` call is prefixed with `GH_TOKEN="$(gh auth token --user priyavijaikalyan2007)"` against `-R priyavijaikalyan2007/b2btheme`. Never run `gh auth switch`.
- **Commits** end with the attribution lines from the session's system reminder. Feature-branch pushes are allowed after each task (`git push`). Never push `main`.
- **Dates** written as `2026-10-2x` mean today's actual date (run `date +%F`).
- **Logging** (spec §8): info for mount, rebuild (naming the create-time prop) and teardown; debug for each route call; error for every A2UI error sent. Messages name the component tag and surface ID.

---

## File structure

| File | Responsibility |
|---|---|
| `runtime/src/mount.ts` | Factory argument order and attach (moved from `conformance.ts`). Shared by the conformance suite and the adapter. |
| `scripts/agentui/adapter-descriptors.mjs` | `tagFor`, `routesFor`, `buildDescriptors`, gate G1, tag collisions |
| `scripts/agentui/adapter-validators.mjs` | `literalArmPointer`, `compileValidators` (Ajv standalone ESM source) |
| `scripts/agentui/adapter-bundle.mjs` | `bundleAdapter`: esbuild in-process with virtual modules, the closure gate, and the `.d.ts` text |
| `a2ui/src/types.ts` | Structural types for the host `context`, and the descriptor types |
| `a2ui/src/log.ts` | FRONTEND_LOGGING.md logger, prefix `[A2UI]` |
| `a2ui/src/values.ts` | Pure helpers: `bindingPath`, `isDynamic`, `sameComponent`, `toWire`, `fromWire`, `sameValue` |
| `a2ui/src/errors.ts` | Error codes and `reportError` |
| `a2ui/src/loader.ts` | `loadAssets`: inject script and stylesheet once per URL |
| `a2ui/src/props.ts` | `PropTracker`: raw-prop snapshots, subscriptions, readiness |
| `a2ui/src/element.ts` | `OutcropComponentElement`: lifecycle, mount, routes, rebuild, teardown |
| `a2ui/src/roundtrip.ts` | Two-way write-back and event dispatch, wired against a live handle |
| `a2ui/src/catalog.ts` | `createOutcropCatalogFrom(embedded, webCore, options)`, `elementClassFor` |
| `a2ui/src/index.ts` | Public entry: binds the virtual modules, exports `createOutcropCatalog` and `catalogJson` |
| `a2ui/src/public.d.ts` | Hand-written public types, copied to `dist/a2ui/adapter/v1.d.ts` |
| `a2ui/tsconfig.json` | Typecheck for `a2ui/src` |
| `a2ui/fleet-adapter.test.ts` | Gate G3 |
| `tests/a2ui-adapter.spec.ts`, `tests/a2ui/harness-*.ts` | End-to-end tests |
| `A2UI.md`, `docs/A2UI_INTEGRATION_GUIDE.md` | Agent/contributor rules; host guide |

---

### Task 0: Record the planning amendments in the spec

**Files:** Modify `specs/agentui-a2ui.prd.md`.

Reading the code while planning turned up six refinements. None changes a user decision. Record them before any implementation.

- [ ] **Step 1:** Apply these edits to the spec text, keeping the section structure:
  1. **§6.1, §5.3:** mount also requires the element to be **connected**. Container-first factories resolve their container through `document.getElementById`. Building and binding still start on the first `context`; mounting waits until the element is connected. Add "connected" to §5.3's readiness list.
  2. **§6.2:** `attachHandle` now **throws a literate error** when the declared `mountMethod` names a method the handle lacks. Today it silently skips attaching, which is a fallback. The conformance suite already catches factory-time errors and records them as a mount finding, so its verdicts only get stricter.
  3. **§7:** `webCore` is a structural object `{ Catalog, basicCatalog, BASIC_FUNCTIONS }`. A host assembles it from `@a2ui/web_core/v0_9` (`Catalog`) and `@a2ui/web_core/v0_9/basic_catalog` (`basicCatalog`, `BASIC_FUNCTIONS`), and may substitute its renderer's own basic catalog. `assetBaseUrl` is **page-global**:
     - the first call fixes it;
     - a later call with a different value throws, because the element classes are shared per tag.
  4. **§12.2:** a new named export, `catalogJson`, is the parsed catalog the bundle embeds. Hosts can send it inline, and `[29]` uses it to prove the bundle matches the published catalog (G2).
  5. **§5.4, §9:** Ajv standalone code `require`s two Ajv runtime helpers (`ajv/dist/runtime/ucs2length`, `ajv/dist/runtime/equal`, which pulls in `fast-deep-equal`). The bundle therefore **serves** that code. G2 gains a closure check: the bundle's `node_modules` inputs must come from exactly the packages `ajv` and `fast-deep-equal`, and nothing from `@a2ui/*`. Those packages are recorded in `dist/agentui-report.json` under `adapter.packages`, and `scripts/vendor-audit.mjs` audits them with the `/lib` closure.
  6. **§3.1:** `assets.css` is present only when `dist/components/<dir>/<dir>.css` exists at generation time. `defaultOptions` are never applied.
  7. **§4.1, §6.2:** the element must live in the document's light DOM, because container-first factories resolve their container by id and component CSS is injected into `document.head`. Verified 2026-10-26: under `@a2ui/lit` and `@a2ui/react` 0.14.0, a custom element inside a basic `Column` has `getRootNode() === document`. If `getRootNode() !== document` at mount, the element sends `OUTCROP_MOUNT_FAILED`: "<tag> is inside a shadow root; outcrop components mount in the light DOM. Render this surface without shadow DOM."
  9. **§6.1, §7, §12.3 (user decision, 2026-10-26):** the base theme (`/css/custom.css` plus `data-bs-theme`) is the **host's** responsibility by default; the guide makes linking it a required step. `createOutcropCatalog` accepts an optional `injectBaseTheme: boolean` (default `false`). When `true`, the loader injects `<link rel="stylesheet" href="<assetBaseUrl>/css/custom.css">` once per page before the first component mounts. A load failure is `OUTCROP_ASSET_LOAD_FAILED` for every element waiting on it. `injectBaseTheme` is page-global like `assetBaseUrl`, and a later call with a different value throws. `data-bs-theme` is never set by the adapter. The guide warns that injecting restyles the whole host page, because the stylesheet is Bootstrap.
  8. **§12.1:** the module has no top-level DOM access. The `HTMLElement` base class is created lazily on first use (`outcropElementBase()`), so importing the bundle in Node (`[29]`, server-side rendering hosts) does not throw.
- [ ] **Step 2:** Add one §14 row dated 2026-10-26: "Planning amendments 1–9 (connected-before-mount, strict attach, webCore shape and page-global assetBaseUrl, `catalogJson` export, served Ajv helpers and closure gate, css presence, light-DOM requirement, no top-level DOM access, optional `injectBaseTheme`). Amendment 9 is a user decision; the rest change no user decision." Set **Status** to "Approved 2026-10-26; amended 2026-10-26 (planning, §14)".
- [ ] **Step 3:** Commit: `docs(agentui): record planning amendments to the A2UI adapter spec`, then `git push`.

---

### Task 1: Shared mount logic (`runtime/src/mount.ts`)

**Files:**
- Create: `runtime/src/mount.ts`, `runtime/src/mount.test.ts`
- Modify: `runtime/src/conformance.ts` (remove `defaultInvoke` and `attachHandle`; import them from `./mount`), `scripts/bundle-runtime.sh` (add `"mount.ts"` to `FILES` immediately before `"conformance.ts"`), `runtime/runtime.ts` (regenerated)

**Interfaces:**
- Produces:

```ts
export type MountSpec = Pick<CapabilityManifest, "factoryStyle" | "containerOption" | "containerAs" | "mountMethod">;
export type Invoker = (factory: unknown, hostId: string, options: Record<string, unknown>) => unknown;
export function invokerFor(spec: MountSpec): Invoker;
export function attachHandle(handle: Record<string, unknown>, spec: MountSpec, host: HTMLElement): void;
```

- [ ] **Step 1: Write the failing tests** in `runtime/src/mount.test.ts`:

```ts
import { describe, expect, test, vi } from "vitest";
import { attachHandle, invokerFor } from "./mount";

describe("invokerFor", () =>
{
    test("container-first (the default) calls f(id, options)", () =>
    {
        const f = vi.fn(() => ({}));
        invokerFor({})(f, "h1", { a: 1 });
        expect(f).toHaveBeenCalledWith("h1", { a: 1 });
    });

    test("options-first calls f(options, id)", () =>
    {
        const f = vi.fn(() => ({}));
        invokerFor({ factoryStyle: "options-first" })(f, "h1", { a: 1 });
        expect(f).toHaveBeenCalledWith({ a: 1 }, "h1");
    });

    test("options-only passes the host element under containerOption", () =>
    {
        document.body.innerHTML = `<div id="h1"></div>`;
        const f = vi.fn(() => ({}));
        invokerFor({ factoryStyle: "options-only", containerOption: "parent" })(f, "h1", { a: 1 });
        expect(f).toHaveBeenCalledWith({ a: 1, parent: document.getElementById("h1") });
    });

    test("options-only with containerAs id passes the id string", () =>
    {
        const f = vi.fn(() => ({}));
        invokerFor({ factoryStyle: "options-only", containerAs: "id" })(f, "h1", {});
        expect(f).toHaveBeenCalledWith({ container: "h1" });
    });
});

describe("attachHandle", () =>
{
    test("auto and absent attach nothing", () =>
    {
        const host = document.createElement("div");
        attachHandle({}, {}, host);
        attachHandle({}, { mountMethod: "auto" }, host);
        expect(host.childElementCount).toBe(0);
    });

    test("show calls handle.show(host)", () =>
    {
        const host = document.createElement("div");
        const show = vi.fn();
        attachHandle({ show }, { mountMethod: "show" }, host);
        expect(show).toHaveBeenCalledWith(host);
    });

    test("getElement appends the returned element", () =>
    {
        const host = document.createElement("div");
        const el = document.createElement("span");
        attachHandle({ getElement: () => el }, { mountMethod: "getElement" }, host);
        expect(host.firstChild).toBe(el);
    });

    test("a declared method the handle lacks throws a literate error", () =>
    {
        const host = document.createElement("div");
        expect(() => attachHandle({}, { mountMethod: "show" }, host)).toThrow(/mountMethod "show".*no show\(\) method/);
        expect(() => attachHandle({ getElement: () => "x" }, { mountMethod: "getElement" }, host))
            .toThrow(/getElement\(\) returned string, not an Element/);
    });
});
```

- [ ] **Step 2:** Run `npx vitest run runtime/src/mount.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement** `runtime/src/mount.ts`. Move `defaultInvoke` (renamed `invokerFor`) and `attachHandle` from `conformance.ts` verbatim, with these changes:
  - `host` is required.
  - The two silent skips become throws: "`<component>` declares mountMethod "show" but its handle has no show() method. Add the method to the handle, or correct mountMethod in the manifest." Similarly for `getElement`, naming the returned type.
  - Add the SPDX + MARKERS header (`⚓ COMPONENT: RuntimeMount`).

  In `conformance.ts`, import `{ attachHandle, invokerFor }` from `"./mount"`. In `mount()`:
  - replace `defaultInvoke(target.manifest)` with `invokerFor(target.manifest)`;
  - guard the host: `const host = document.getElementById(hostId); if (!host) { throw new Error(...) }`;
  - keep the call inside the existing `try`, so a throw becomes `mountError`.
- [ ] **Step 4:** Add `"mount.ts"` to `FILES` in `scripts/bundle-runtime.sh` before `"conformance.ts"`, run `bash scripts/bundle-runtime.sh`, and confirm `runtime/runtime.ts` changed. Run `npx vitest run runtime/` and `npm run typecheck:runtime`. Expected: all PASS. `runtime/bundle.test.ts` pins the public names, so the unchanged `EnterpriseRuntime` surface still passes.
- [ ] **Step 5:** Run `npx vitest run runtime/fleet-conformance.test.ts`. Expected: PASS. If a component now fails with the new attach error, that component's manifest declared a `mountMethod` its handle lacks, which is a real defect: STOP and report it rather than relaxing the throw.
- [ ] **Step 6:** Commit `refactor(runtime): share factory invocation and attach logic in mount.ts`, then `git push`.

---

### Task 2: Descriptor generator and gate G1

**Files:**
- Create: `scripts/agentui/adapter-descriptors.mjs`, `scripts/agentui/adapter-descriptors.test.ts`
- Modify: `scripts/agentui/generate.mjs` (call it in `runPipeline`, push problems to `errors`, return `descriptors`)

**Interfaces:**
- Consumes: `resolveSurface` output `{ name, dataProps[], twoWayValue, events[{channel, option, actionProp, payload, multi, payloadInValue}], providers[], actions[] }`; `catalogName(manifest)` from `catalog.mjs`; the built catalog object.
- Produces:

```js
export const TAG_PREFIX = "outcrop-";
export function tagFor(catalogName)            // "StickyNote" -> "outcrop-sticky-note"
export function routesFor(manifest, surface)   // { [prop]: PropRoute }
export function buildDescriptors(ready, catalog, assetExists)
    // ready: [{ manifest, surface }]; assetExists(rel) -> boolean
    // returns { descriptors: AdapterDescriptor[], problems: string[] }
```

`AdapterDescriptor` and `PropRoute` are exactly as in spec §3.1. `assets.js` is `components/<dir>/<dir>.js`; `assets.css` is the same with `.css`, present only when `assetExists` says so. Defaults: `factoryStyle` is `"container-first"` when the manifest leaves it unset, `mountMethod` is `"auto"`. `dates` lists data props whose catalog literal arm (`allOf[2].properties[p].anyOf[0]`) has `format: "date-time"`. `changeOption` is `"onChange"` when `surface.twoWayValue` is true and no event has `payloadInValue`; otherwise it is absent.

- [ ] **Step 1: Write the failing tests.** Use the `manifest()`/`surface()` builders in the style of `resolve.test.ts`. Required cases:

```ts
test("tagFor kebab-cases the catalog name, including acronym runs", () =>
{
    expect(tagFor("StickyNote")).toBe("outcrop-sticky-note");
    expect(tagFor("ToolColorPicker")).toBe("outcrop-tool-color-picker");
    expect(tagFor("HTMLViewer")).toBe("outcrop-html-viewer");
    expect(tagFor("Chart3D")).toBe("outcrop-chart3-d");
});

test("routesFor applies accepts, then stateKeys, then value, then create, in that order", () =>
{
    const m = manifest({ accepts: [{ name: "text" }, { name: "rows", setter: "setRows" }], stateKeys: ["text", "color"] });
    const s = surface({ dataProps: ["text", "rows", "color", "value", "readOnly"], twoWayValue: true });
    expect(routesFor(m, s)).toEqual({
        text: { route: "slot", slot: "text" },
        rows: { route: "slot", slot: "rows", setter: "setRows" },
        color: { route: "state", key: "color" },
        value: { route: "value" },
        readOnly: { route: "create" },
    });
});

test("value on a one-way component is create-time", () =>
{
    expect(routesFor(manifest(), surface({ dataProps: ["value"], twoWayValue: false })).value).toEqual({ route: "create" });
});

test("G1: a catalog component with actions or providers is a problem naming #31", () =>
{
    const r = buildDescriptors([{ manifest: manifest({ actions: [{ id: "export", label: "Export" }] }), surface: surface({ actions: [{ id: "export", label: "Export", actionProp: "onExport" }] }) }], catalog(), () => true);
    expect(r.problems[0]).toMatch(/Widget declares actions \[export\].*#31/);
    const p = buildDescriptors([{ manifest: manifest(), surface: surface({ providers: [{ option: "search", request: "search", actionProp: "onSearch", response: "searchResult" }] }) }], catalog(), () => true);
    expect(p.problems[0]).toMatch(/declares providers \[search\].*#31/);
});

test("two catalog names mapping to one tag are a problem naming both", () =>
{
    const r = buildDescriptors([entry("AB", "ab"), entry("Ab", "ab2")], catalog(), () => true);
    expect(r.problems.join("\n")).toMatch(/outcrop-ab.*AB.*Ab|outcrop-ab.*Ab.*AB/);
});

test("descriptor fields: factory style default, assets, css presence, events, changeOption, dates", () =>
{
    // StickyNote-shaped: surface, change channel payloadInValue -> no changeOption
    // OrientationPicker-shaped: field, twoWay, no events -> changeOption "onChange"
    // a date-time literal arm -> listed in dates
    // assetExists(css) false -> no assets.css
});
```

Fill the last test with concrete fixtures and assertions for each bullet.
- [ ] **Step 2:** Run `npx vitest run scripts/agentui/adapter-descriptors.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement** `adapter-descriptors.mjs`. Keep each function ≤ 30 lines.
  - `tagFor` uses two regex passes: `/([a-z0-9])([A-Z])/g → "$1-$2"` and `/([A-Z]+)([A-Z][a-z])/g → "$1-$2"`, then lower-cases and prefixes.
  - `routesFor` iterates `surface.dataProps` by name.
  - `buildDescriptors` collects the G1 problems. The message shape: `"<Name> declares actions [<ids>] (or providers [<requests>]), which the A2UI adapter does not support yet, so its catalog action props would never fire. Support lands with #31; until then keep the component on PENDING_CLASSIFICATION or remove the declaration."` It then builds each descriptor and checks tag collisions.
- [ ] **Step 4:** In `generate.mjs` `runPipeline`, after `buildCatalog`:

```js
const adapter = buildDescriptors(ready, catalog, input.assetExists);
errors.push(...adapter.problems);
```

  Return `descriptors: adapter.descriptors`. Add `assetExists: (rel) => fs.existsSync(path.join(repoRoot, "dist", rel))` to `repoInputs`. Update `generate.test.ts` fixtures to pass `assetExists: () => true`. Add one test: a ready component with `actions` makes `runPipeline` return a G1 error.
- [ ] **Step 5:** Run `npx vitest run scripts/agentui/` and then `npm run build:agentui`. Expected: PASS, the same summary line as before, and no G1 error, because none of the 8 declares actions or providers.
- [ ] **Step 6:** Commit `feat(agentui): derive adapter descriptors and gate unsupported actions and providers (G1)`, then `git push`.

---

### Task 3: Validator compiler

**Files:**
- Create: `scripts/agentui/adapter-validators.mjs`, `scripts/agentui/adapter-validators.test.ts`

**Interfaces:**
- Produces:

```js
export function literalArmPointer(catalogId, name, prop) // `${catalogId}#/components/${name}/allOf/2/properties/${prop}/anyOf/0`
export function compileValidators({ catalog, basic, commonTypes, descriptors })
    // returns ESM source text; the module exports
    //   `validators`: { "<Name>.<prop>": (v) => boolean } for every key in each descriptor's props.
```

Ajv settings: `new Ajv2020({ code: { source: true, esm: true }, strict: false, validateFormats: false })`.
- `strict: false` because catalog documents carry non-schema keys (`components`, `catalogId`).
- `validateFormats: false` because date strings are checked by the element's `fromWire` (Task 4).

Add `commonTypes`, `basic` and `catalog` with `addSchema`. Export names are `v_<Name>_<prop>` with non-identifier characters replaced by `_`. Append:

```js
export const validators = { "StickyNote.text": v_StickyNote_text, … };
```

- [ ] **Step 1: Write the failing test.** Compile against the committed `specs/agentui/published/catalog-v1.json`, the vendored basic catalog and `common_types.json`, with one hand-made descriptor `{ name: "StickyNote", props: { text: {route:"slot",slot:"text"}, collapsed: {route:"state",key:"collapsed"}, anchor: {route:"create"} } }`. Write the source to a temp `.mjs` file under `os.tmpdir()`. Because the code `require`s Ajv helpers, bundle it first with `esbuild.buildSync({ stdin: { contents, resolveDir: repoRoot }, bundle: true, format: "esm", write: false })`, then `import()` the output written to a temp file. Assert:
  - `validators["StickyNote.text"]("hi") === true`; `(42) === false`;
  - `validators["StickyNote.collapsed"](true) === true`; `("yes") === false`;
  - `validators["StickyNote.anchor"]({kind:"canvas"}) === true`; `({kind:"nope"}) === false` (this exercises `$defs`/`oneOf` resolution inside the catalog).
  - `literalArmPointer(...)` returns the documented string.
- [ ] **Step 2:** Run it. Expected: FAIL, module not found.
- [ ] **Step 3: Implement.** `compileValidators` throws a literate error naming the pointer if Ajv cannot resolve a literal arm.
- [ ] **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5:** Commit `feat(agentui): compile per-prop validators for bound values (Ajv standalone)`, then `git push`.

---

### Task 4: Adapter foundations: types, logging, value helpers, errors, loader

**Files:**
- Create: `a2ui/tsconfig.json`, and in `a2ui/src/`: `types.ts`, `log.ts`, `values.ts`, `errors.ts`, `loader.ts`, `values.test.ts`, `errors.test.ts`, `loader.test.ts`
- Modify:
  - `vitest.config.ts`: add `"a2ui/**/*.test.ts"` to `include`, and `"a2ui/**/*.ts"` to `coverage.include`.
  - `package.json`: add the script `"typecheck:a2ui": "tsc -p a2ui/tsconfig.json --noEmit"`, and insert `npm run typecheck:a2ui &&` after `typecheck:runtime` in `"test"`.
  - `.github/workflows/ci.yml`: add a step "Typecheck the A2UI adapter" running `npm run typecheck:a2ui` after the runtime typecheck.

**Interfaces (produced):**

```ts
// types.ts
export interface Sub { readonly value?: unknown; unsubscribe(): void }
export interface SurfaceLike { readonly id: string; dispatchError(e: { code: string; message: string; path?: string }): Promise<void> }
export interface DataContextLike
{
    readonly surface?: SurfaceLike; readonly dataModel: unknown; readonly path: string;
    readonly explicitIndex?: number; readonly parent?: unknown;
    subscribeDynamicValue(v: unknown, cb: (v: unknown) => void): Sub;
    resolveAction(a: unknown): unknown;
    set(path: string, v: unknown): void;
}
export interface ComponentContextLike
{
    readonly componentModel: { readonly id: string; readonly type: string; readonly properties: Record<string, unknown>;
        readonly onUpdated: { subscribe(cb: () => void): Sub } };
    readonly surfaceComponents: unknown; readonly theme: unknown;
    readonly dataContext: DataContextLike;
    dispatchAction(a: unknown): Promise<void>;
}
export type PropRoute = { route: "slot"; slot: string; setter?: string } | { route: "state"; key: string } | { route: "value" } | { route: "create" };
export interface AdapterEvent { channel: string; option?: string | null; actionProp: string; payloadInValue: boolean }
export interface AdapterDescriptor { /* exactly spec §3.1 */ }
export type Validator = (v: unknown) => boolean;
export type Validators = Readonly<Record<string, Validator>>;

// values.ts
export function bindingPath(raw: unknown): string | undefined;       // {path:string} -> path
export function isDynamic(raw: unknown): boolean;                    // {path} or {call}
export function sameComponent(a: ComponentContextLike, b: ComponentContextLike): boolean;
export function fromWire(v: unknown, isDate: boolean): { ok: true; value: unknown } | { ok: false; reason: string };
export function toWire(v: unknown): unknown;                         // Date -> ISO, recursively through arrays and plain objects
export function sameValue(a: unknown, b: unknown): boolean;          // JSON.stringify(toWire(a)) === JSON.stringify(toWire(b))

// errors.ts
export const ERROR_CODES = Object.freeze({ VALIDATION_FAILED: "VALIDATION_FAILED", BINDING_LOST: "OUTCROP_BINDING_LOST",
    ASSET_LOAD_FAILED: "OUTCROP_ASSET_LOAD_FAILED", MOUNT_FAILED: "OUTCROP_MOUNT_FAILED" });
export function reportError(ctx: ComponentContextLike, code: string, message: string, path?: string): void;

// loader.ts
export function loadAssets(baseUrl: string, assets: { js: string; css?: string }, injectBaseTheme: boolean): Promise<void>;
    // when injectBaseTheme, also awaits `<baseUrl>/css/custom.css` (deduped like every URL)
export function resetLoaderForTests(): void;
```

Behaviour:
- **`sameComponent`** is the spike-verified guard: `a === b ||` equality of `componentModel`, `surfaceComponents`, `theme` and `dataContext.{surface, dataModel, path, explicitIndex, parent}`.
- **`fromWire`:**
  - With `isDate`, a string that `Date.parse` reads as a valid date returns `ok` with a `Date`.
  - Any other value fails with the reason `expected an ISO 8601 date-time string, got <json>`.
  - Without `isDate`, the value passes unchanged.
- **`reportError`:**
  - logs at error level;
  - then calls `ctx.dataContext.surface.dispatchError({ code, message, ...(path ? { path } : {}) })`;
  - when `surface` is undefined, throws a literate error: "the host's DataContext has no surface, so A2UI errors cannot reach the agent; the host renderer must create contexts from a SurfaceModel".
- **`loadAssets`:**
  - Joins `baseUrl` (no trailing slash allowed; throw if present, or if it is not an absolute `http(s):` or `file:` URL) with each asset path.
  - Keeps one `Promise` per URL in a module `Map`.
  - Injects `<script src>` (no `async`, no `type=module`, because the components are classic IIFE scripts) and `<link rel="stylesheet">` into `document.head`.
  - Resolves when both fire `load`.
  - Rejects with `Error("Could not load <url> …")` on `error`. A failed URL stays rejected for the page.
- **`log.ts`:** copy the FRONTEND_LOGGING.md component pattern exactly: `LOG_PREFIX = "[A2UI]"`, `window.createLogUtility` when loaded, timestamped `console.*` otherwise. Export `logInfo`, `logDebug`, `logError`. Resolve the logger **inside** each call (or memoise on first call), never at module top level, so the module has no top-level `window` access (spec amendment 8).

- [ ] **Step 1: Write the failing tests:**
  - `values.test.ts`: every branch of each helper. For `sameComponent`, include a case where only `dataContext.path` differs, which must return false.
  - `errors.test.ts`: dispatch with and without `path`; the throw when there is no surface.
  - `loader.test.ts`:
    - Dedupe: two calls give one script element.
    - `load` resolves: dispatch `new Event("load")` on the injected elements.
    - `error` rejects with the URL in the message.
    - A trailing slash or relative base throws.
    - css absent means only a script is injected.
    - `injectBaseTheme: true` injects `<base>/css/custom.css` once across many components; `false` never does.
    - Call `resetLoaderForTests()` in `beforeEach`.
- [ ] **Step 2:** Run `npx vitest run a2ui/`. Expected: FAIL.
- [ ] **Step 3: Implement** the five modules. `a2ui/tsconfig.json`:

```json
{
  "compilerOptions": { "target": "ES2020", "module": "ES2020", "moduleResolution": "bundler", "lib": ["ES2020", "DOM"],
    "strict": true, "noEmit": true, "isolatedModules": true, "skipLibCheck": true, "types": [] },
  "include": ["src/**/*.ts", "../runtime/src/mount.ts", "../runtime/src/types.ts"],
  "exclude": ["src/**/*.test.ts"]
}
```

- [ ] **Step 4:** Run `npx vitest run a2ui/` and `npm run typecheck:a2ui`. Expected: PASS.
- [ ] **Step 5:** Commit `feat(a2ui): adapter foundations — context types, logging, value helpers, errors, asset loader`, then `git push`.

---

### Task 5: The element: binding, readiness, mount, routes, rebuild, teardown

**Files:**
- Create: `a2ui/src/props.ts`, `a2ui/src/element.ts`, `a2ui/src/element.test.ts`, `a2ui/src/test-context.ts` (test helper, imported only by tests)
- Modify: `package.json` (devDependency `"@a2ui/web_core": "0.14.0"`, exact); run `npm install`

**Interfaces:**
- Consumes: Task 1 `invokerFor` and `attachHandle` (import from `"../../runtime/src/mount"`); everything from Task 4.
- Produces:

```ts
// props.ts
export class PropTracker
{
    constructor(ctx: ComponentContextLike, descriptor: AdapterDescriptor, onValue: (name: string, value: unknown) => void);
    refresh(): void;                       // re-read componentModel.properties; resubscribe props whose raw JSON changed
    current(): Record<string, unknown>;    // last delivered value per prop present (absent props omitted)
    isBound(name: string): boolean;
    allBoundResolved(): boolean;           // every bound prop has delivered a value other than undefined
    dispose(): void;
}

// element.ts
export interface ElementEnv { readonly descriptor: AdapterDescriptor; readonly validators: Validators; readonly assetBaseUrl: () => string; readonly injectBaseTheme: () => boolean }
/**
 * The base class is created on first call and memoised, so this module has no
 * top-level DOM access and can be imported in Node (spec amendment 8). The
 * class body below is what the factory returns.
 */
export function outcropElementBase(): new () => OutcropComponentElement;
export interface OutcropComponentElement extends HTMLElement
{
    protected readonly env: ElementEnv;     // set by the per-tag subclass (Task 7)
    get context(): ComponentContextLike | undefined; set context(c: ComponentContextLike | undefined);
    get node(): unknown; set node(n: unknown);
    connectedCallback(): void; disconnectedCallback(): void;
    /** Test seam: the live handle, or undefined when unmounted. */
    get handle(): Record<string, unknown> | undefined;
}
export function defineTestElement(tag: string, env: ElementEnv): CustomElementConstructor; // `class extends outcropElementBase()` with `env`; used by tests
```

**`PropTracker` behaviour:**
- For each `descriptor.props` key present in `properties`:
  - a **literal** delivers immediately, with no validation, because the host already validated it;
  - a **dynamic** value subscribes via `dataContext.subscribeDynamicValue(raw, cb)`. It delivers `sub.value` immediately and every callback after that.
- A prop whose raw JSON is unchanged keeps its subscription.
- A prop removed from `properties` is unsubscribed and dropped from `current()`. Its route then applies the removal: create-time props rebuild, live props receive `undefined`. This is not a binding loss, because the agent removed it.

**Element lifecycle** (each method ≤ 30 lines; split into private helpers):
1. **`set context(c)`:**
   - same component (`sameComponent`) → keep `c`, do nothing else;
   - otherwise → `#teardown()`, store `c`, subscribe `componentModel.onUpdated` → `#tracker.refresh()`, create the `PropTracker`, set `aria-busy="true"`, start `#ensureAssets()`, then `#tryMount()`.
2. **`#ensureAssets()`:** `loadAssets(env.assetBaseUrl(), descriptor.assets, env.injectBaseTheme())`. On reject: `reportError(ASSET_LOAD_FAILED, …)`, remove `aria-busy`, and stay unmounted. On resolve, `#tryMount()`.
3. **`#tryMount()`:** proceeds only when all of these hold:
   - a context exists;
   - `isConnected`;
   - the assets have loaded;
   - no handle exists;
   - `#tracker.allBoundResolved()`;
   - every bound value is currently valid.

   Then:
   - if `this.getRootNode() !== document` → `MOUNT_FAILED` (spec amendment 7) and stop;
   - create a child `<div class="outcrop-host" id="outcrop-<counter>">`;
   - build options from `current()`, applying `fromWire` for `dates`;
   - look up `window[descriptor.factory]`. If it is missing, report `MOUNT_FAILED`: "createX is not defined after loading <url>; the asset is not this component's script".
   - `invokerFor(descriptor)(factory, id, options)`, then `attachHandle(handle, descriptor, host)`. A throw reports `MOUNT_FAILED` with the error message.
   - Remove `aria-busy` and log the mount at info level.
4. **`onValue(name, v)`**, the tracker callback:
   - **Bound:**
     - `undefined` while unmounted → wait.
     - `undefined` while mounted → `BINDING_LOST` with the path; keep the last state.
     - Otherwise validate with `validators["<Name>.<name>"]` and then `fromWire`. A failure reports `VALIDATION_FAILED` with the path and stops; nothing is applied.
   - **Literal:** skip validation.
   - Then, when mounted → `#route(name, value)`; when unmounted → `#tryMount()`.
5. **`#route(name, v)`:**
   - `slot` → `handle[setter](v)` when a setter is named, else `handle.setData(slot, v)`.
   - `state` → `handle.setState({[key]: v})`.
   - `value` → `handle.setValue(v)`.
   - `create` → `#rebuild(name)`.

   A declared route whose handle method is missing reports `MOUNT_FAILED`: "`<Name>`'s handle has no `<method>`; the manifest declares `<route>` for `<prop>`".
6. **`#rebuild(prop)`:** log at info level with the prop; destroy the handle (call `handle.destroy()`, and release any round-trip subscriptions, which Task 6 adds); clear the handle; `#tryMount()`.
7. **`connectedCallback`:** cancel any pending teardown; `#tryMount()`.
8. **`disconnectedCallback`:** `queueMicrotask(() => { if (!this.isConnected) { this.#teardown(); this.#context = undefined; } })`.
9. **`#teardown()`:** dispose the tracker and the `onUpdated` subscription; destroy the handle; log the teardown at info level. It is idempotent.

**`test-context.ts`** builds a **real** `@a2ui/web_core` context, so tests exercise the genuine `subscribeDynamicValue`:

```ts
import { DataModel, DataContext, ComponentContext } from "@a2ui/web_core/v0_9"; // verify exact export paths against the installed package
export function realContext(props: Record<string, unknown>, data: Record<string, unknown> = {}): {
    ctx: ComponentContextLike; setData(path: string, v: unknown): void; setProps(p: Record<string, unknown>): void;
    errors: unknown[]; actions: unknown[] };
```

Build a `SurfaceModel` with one component of type `T`, using a minimal schema-only catalog, through `MessageProcessor.processMessages([createSurface, updateComponents, updateDataModel])`. Return `new ComponentContext(surface, "c1", "/")`, and capture `surface.onError` and `onAction`. **Verify every import path against `node_modules/@a2ui/web_core/package.json` exports before use.** If `ComponentContext` cannot be constructed this way in 0.14.0, use the recipe from the spike (`scratchpad/spike/a2ui-wc/src/catalog.ts`): a `Catalog` with one `{name, schema}` entry plus `MessageProcessor`, then read `processor.getSurface(id)`.

A fake widget factory `window.createFake` is registered in tests. It records its calls and returns a handle with `setData`, `setState`, `setValue`, `destroy`, `on`, and `emit(channel, payload)`.

- [ ] **Step 1: Write the failing tests** (`element.test.ts`). Define a descriptor `Fake` with props `title` (create), `items` (slot), `mode` (state) and `value` (value), plus `twoWay: true`. Add an `items` validator that accepts arrays only. Required cases:
  1. A `context` set **before** connection mounts on connect. A `context` set **after** connection mounts immediately once assets resolve. Stub `loadAssets` resolution by pre-defining `window.createFake` and resolving the injected elements' `load` (a helper in the test).
  2. A second `context` for the same component (`sameComponent` true) does not rebuild: the factory call count stays 1.
  3. A `context` for a different component tears down and rebuilds.
  4. A bound `items` with no data → not mounted, `aria-busy="true"`. After `setData("/items", [1])` it mounts with `items: [1]`.
  5. A bound `items` update after mount → `setData("items", [2])`, with no rebuild.
  6. A `mode` update → `setState({mode})`. A `value` update → `setValue`.
  7. Changing the literal `title` (`setProps`) → rebuild, with the call count rising to 2.
  8. Data `/items` set to `"bad"` → `VALIDATION_FAILED` with path `/items`; `setData` is not called.
  9. Data `/items` deleted after mount → `OUTCROP_BINDING_LOST`.
  10. Asset load error → `OUTCROP_ASSET_LOAD_FAILED`; not mounted; `aria-busy` removed.
  11. `window.createFake` undefined after load → `OUTCROP_MOUNT_FAILED`.
  12. Factory throws → `OUTCROP_MOUNT_FAILED` with the thrown message.
  13. Disconnect then reconnect within the same task → no destroy. Disconnect and await a microtask → `destroy` called, and subscriptions released (a later data set does nothing).
  14. An absent optional prop is omitted from the factory options, and `defaultOptions` are never read.
  15. An element attached inside a shadow root → `OUTCROP_MOUNT_FAILED` naming the light-DOM requirement.
  16. Importing `element.ts` touches no DOM: a test deletes `globalThis.HTMLElement` temporarily, imports the module afresh (`vi.resetModules()`), expects no throw, then restores it.
- [ ] **Step 2:** Run `npx vitest run a2ui/src/element.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `props.ts` and `element.ts` (round-trip hooks are left for Task 6).
- [ ] **Step 4:** Run `npx vitest run a2ui/` and `npm run typecheck:a2ui`. Expected: PASS.
- [ ] **Step 5:** Commit `feat(a2ui): OutcropComponentElement — bind from context, wait for data, route updates, rebuild, teardown`, then `git push`.

---

### Task 6: Round trip: two-way write-back and events

**Files:**
- Create: `a2ui/src/roundtrip.ts`, `a2ui/src/roundtrip.test.ts`
- Modify: `a2ui/src/element.ts` (wire after mount; inject `changeOption`; release on rebuild and teardown; the inbound guard)

**Interfaces:**
- Produces:

```ts
export interface RoundTrip { release(): void }
export function changeOptions(descriptor: AdapterDescriptor, onUserValue: (v: unknown) => void): Record<string, unknown>;
    // { [changeOption]: (v) => onUserValue(v) } when descriptor.changeOption is set; else {}
export function wireRoundTrip(ctx: ComponentContextLike, descriptor: AdapterDescriptor,
    handle: Record<string, unknown>, hooks: { onUserValue(v: unknown): void; isApplying(): boolean }): RoundTrip;
```

**Behaviour** (spec §5.6, §5.7):
- **`wireRoundTrip`:** for each `descriptor.events`, if `handle.on` is a function, subscribe `handle.on(channel, payload => …)`.
  - A surface component without `on` while `events` is non-empty is `MOUNT_FAILED`: "manifest declares channels but the handle has no on()".
  - A `payloadInValue` event's handler calls `hooks.onUserValue(payload)`.
  - Any other event's handler:
    1. writes `ctx.dataContext.set(`${eventDataPath}/${channel}`, toWire(payload))` when `bindingPath(properties.eventData)` exists;
    2. then, if `properties[actionProp]` exists, calls `ctx.dispatchAction(ctx.dataContext.resolveAction(properties[actionProp]))`.
  - Every handler returns immediately when `hooks.isApplying()` is true, because a change the agent caused is not a user event.
- **Element `#onUserValue(v)`:**
  - Ignored while applying.
  - When `value` is bound: `#lastWritten = toWire(v)`, then `ctx.dataContext.set(path, #lastWritten)`.
  - Then, if a `payloadInValue` event exists and its `actionProp` is present, dispatch it.
- **Element inbound guard:**
  - `#route` sets `#applying = true` around the handle call, with `try/finally`.
  - `onValue("value", v)` skips routing when `sameValue(v, #lastWritten)`, which is the echo of the element's own write. It then clears `#lastWritten`.

- [ ] **Step 1: Write the failing tests.** Use `realContext` from Task 5 and the fake widget, whose `emit(channel, payload)` triggers its `on` handlers. Required cases:
  1. Field shape (`changeOption: "onChange"`, `value` bound to `/v`): the fake calls `options.onChange("x")` → the data model `/v === "x"`. The echo does not call `setValue`, and no action fires (field components have no `onChange` action prop).
  2. Surface shape: a `change` event with `payloadInValue`, `value` bound and `onChange` present. `emit("change", "y")` → `/v === "y"`, then one action dispatched.
  3. Event with `eventData` bound to `/ev` and `onSubmit` present: `emit("submit", {text:"hi"})` → `/ev/submit` equals `{text:"hi"}`. The action is dispatched **after** the write: assert the action's resolved context sees the value by giving the action context `{ path: "/ev/submit" }`.
  4. Event with no `eventData` binding → the action still fires, and nothing is written.
  5. Event whose action prop is absent → the data is written, and no action is sent.
  6. A `Date` payload is written as an ISO string.
  7. While the agent's own update is applied (`setData` triggering a `setValue` that makes the fake emit `change` synchronously), nothing is written back and no action fires.
  8. Rebuild and teardown release the `on` subscriptions: a later `emit` writes nothing.
  9. Surface descriptor with events whose handle lacks `on` → `MOUNT_FAILED`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3: Implement** `roundtrip.ts` and wire it into `element.ts`.
- [ ] **Step 4:** Run `npx vitest run a2ui/` and `npm run typecheck:a2ui`. Expected: PASS.
- [ ] **Step 5:** Commit `feat(a2ui): two-way write-back and event round trip (eventData, then action)`, then `git push`.

---

### Task 7: `createOutcropCatalog` and the public entry

**Files:**
- Create: `a2ui/src/catalog.ts`, `a2ui/src/catalog.test.ts`, `a2ui/src/index.ts`, `a2ui/src/public.d.ts`, `a2ui/src/virtual.d.ts`

**Interfaces:**
- Produces:

```ts
// catalog.ts
export interface Embedded { readonly catalogText: string; readonly descriptors: readonly AdapterDescriptor[]; readonly validators: Validators }
export interface OutcropWebCore { readonly Catalog: CatalogCtor; readonly basicCatalog: BasicCatalogLike; readonly BASIC_FUNCTIONS: readonly unknown[] }
export interface OutcropCatalogOptions { readonly assetBaseUrl: string; readonly injectBaseTheme?: boolean }
export function createOutcropCatalogFrom(embedded: Embedded, webCore: OutcropWebCore, options: OutcropCatalogOptions): unknown;
export function elementClassFor(descriptor: AdapterDescriptor, validators: Validators): CustomElementConstructor; // cached per tag
export function resetCatalogStateForTests(): void;

// index.ts (the bundle entry)
import catalogText from "virtual:outcrop/catalog";
import descriptors from "virtual:outcrop/descriptors";
import { validators } from "virtual:outcrop/validators";
export const catalogJson: unknown = JSON.parse(catalogText);
export function createOutcropCatalog(webCore: OutcropWebCore, options: OutcropCatalogOptions): unknown;
```

**Behaviour** (spec §7 plus amendment 3):
1. **Member check:** `Catalog` must be a function with a static `fromJson`; `basicCatalog.components` must be a `Map`; `BASIC_FUNCTIONS` must be an array. Each missing member throws: "createOutcropCatalog: webCore.<member> is missing or not a <kind>. Pass { Catalog } from '@a2ui/web_core/v0_9' and { basicCatalog, BASIC_FUNCTIONS } from '@a2ui/web_core/v0_9/basic_catalog' (tested with 0.14.0)."
2. **`assetBaseUrl` and `injectBaseTheme`:** validate `assetBaseUrl` as in the loader; `injectBaseTheme`, when given, must be a boolean (absent means `false`). The first call stores both module-wide; a later call with a different value for either throws, naming both values.
3. **Building the catalog:**
   - `schemas = webCore.Catalog.fromJson(JSON.parse(catalogText)).withPeerCatalogs([webCore.basicCatalog])`.
   - For each `api` of `schemas.components.values()`:
     - if `webCore.basicCatalog.components.has(api.name)` → `{ ...basicCatalog.components.get(api.name), schema: api.schema }`;
     - else find its descriptor (none → throw, naming the component; G2 prevents this at build time) → `{ ...api, tagName: d.tagName, element: elementClassFor(d, validators) }`.
   - Return `new webCore.Catalog(schemas.id, "0.9", entries, webCore.BASIC_FUNCTIONS)`.
   - No entry may carry a `render` key, because React treats such an entry as a React component.
4. **`elementClassFor`:** caches one subclass per tag in a module `Map`:

```ts
class extends outcropElementBase() { protected readonly env = { descriptor, validators, assetBaseUrl: () => currentBase(), injectBaseTheme: () => currentInjectBaseTheme() } }
```

   The same tag always returns the same constructor, so `registerUniversalElement` never throws. Calling `customElements.define` is left to the renderer, which defines lazily.
5. **`public.d.ts`:** declares `createOutcropCatalog`, `catalogJson`, `OutcropWebCore` (the structural members only, typed loosely as `unknown`-returning so no `@a2ui` types are required) and the error-code string union.
6. **`virtual.d.ts`:** declares the three `virtual:outcrop/*` modules for the typechecker.

- [ ] **Step 1: Write the failing tests.** They use real `@a2ui/web_core` 0.14.0 plus the committed catalog text, descriptors built by hand for StickyNote and Ruler, and trivial validators. Cases:
  1. Each missing member throws its literate message.
  2. The returned catalog's `components` contains `StickyNote` with `tagName === "outcrop-sticky-note"`, and `Text` keeps the basic implementation's `tagName`.
  3. Two calls return entries whose `element` is identical (`===`).
  4. A second call with a different `assetBaseUrl`, or a different `injectBaseTheme`, throws, naming both values. A non-boolean `injectBaseTheme` throws.
  5. A real `MessageProcessor([catalog])` processes `createSurface` (our catalog ID) plus `updateComponents` with `{ id: "root", component: "StickyNote", text: { path: "/t" } }` without throwing. A message with an unknown prop throws, which proves the schema is enforced.
  6. No entry has a `render` key.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3: Implement** `catalog.ts`, `index.ts`, `public.d.ts` and `virtual.d.ts`. `index.ts` is the only file that imports `virtual:` modules; tests import `catalog.ts` directly.
- [ ] **Step 4:** Run `npx vitest run a2ui/` and `npm run typecheck:a2ui`. Expected: PASS.
- [ ] **Step 5:** Commit `feat(a2ui): createOutcropCatalog — link the basic catalog, attach outcrop-* elements`, then `git push`.

---

### Task 8: Bundle inside the generator; closure gate; `[29]` (G2)

**Files:**
- Create: `scripts/agentui/adapter-bundle.mjs`, `scripts/agentui/adapter-bundle.test.ts`
- Modify:
  - `scripts/agentui/generate.mjs`: outputs `a2ui/adapter/v1.js` and `v1.d.ts`; `writeOutputs` writes string values verbatim; the report gains `adapter`.
  - `scripts/agentui/generate.test.ts`
  - `scripts/agentui/check-dist.mjs`: G2; skip the JSON parse for non-JSON files, keeping the `knobby` scan.
  - `scripts/agentui/check-dist.test.ts`
  - `scripts/vendor-audit.mjs`: also audit `adapter.packages` from `dist/agentui-report.json`.
  - `test-local.sh`: update the `[29]` description to "The A2UI catalog and adapter match the baseline, resolve, cover the fleet and name no host".

**Interfaces:**
- Consumes: `buildDescriptors` (Task 2), `compileValidators` (Task 3), `a2ui/src/index.ts` (Task 7).
- Produces:

```js
// adapter-bundle.mjs
export const ALLOWED_PACKAGES = Object.freeze(["ajv", "fast-deep-equal"]);
export function bundleAdapter({ catalogText, descriptors, validatorsSource, repoRoot })
    // -> { js: string, dts: string, packages: string[] }   throws literate errors on a closure violation
```

**Implementation notes:**
- `esbuild.buildSync({ entryPoints: [a2ui/src/index.ts], bundle: true, format: "esm", platform: "browser", target: "es2020", minify: true, write: false, metafile: true, legalComments: "eof", plugins: [virtualPlugin] })`.
- `virtualPlugin` resolves the three modules:
  - `virtual:outcrop/catalog` → `export default <JSON.stringify(catalogText)>`;
  - `virtual:outcrop/descriptors` → `export default <JSON.stringify(descriptors)>`;
  - `virtual:outcrop/validators` → `validatorsSource`, with `resolveDir: repoRoot` so its `require("ajv/dist/runtime/…")` resolves.
- `buildSync` does not support plugins, so use `esbuild.build` and make `bundleAdapter` async. `runPipeline` becomes async, which cascades to: `main()` and `measure()` in `generate.mjs`; every `runPipeline` call in `generate.test.ts`; `measureClassification` only if it starts calling `runPipeline` (it does not today; leave it synchronous). `checkDist` also becomes async (for the dynamic `import()`), which cascades to its `main` and every call in `check-dist.test.ts`.
- **Closure gate:**
  - From `metafile.inputs`, collect the package names of every path containing `node_modules/`.
  - Any package not in `ALLOWED_PACKAGES`, or any `@a2ui/` path, throws: "The A2UI adapter bundle would serve <pkg> (<input path>). Only ajv runtime helpers are allowed; the element must not import @a2ui/* (spec §4.1, amendment 5)."
  - Return the packages found.
- `dts` is the text of `a2ui/src/public.d.ts`.
- **`runPipeline`** gets `input.bundleAdapter` (injectable; tests pass a stub returning `{ js: "export{}", dts: "", packages: [] }`). It builds `catalogText = JSON.stringify(catalog, null, 2) + "\n"`, which is exactly what `writeOutputs` will write for the catalog. It then adds these outputs:
  - `a2ui/adapter/v1.js` (string)
  - `a2ui/adapter/v1.d.ts` (string)
  - `agentui-report.json` with `adapter: { descriptors, packages }`

  `writeOutputs`: `const text = typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n``.
- **check-dist G2** (still importing nothing from the generator):
  - `await import(pathToFileURL("dist/a2ui/adapter/v1.js"))` in Node. This works because no top-level code touches the DOM: `HTMLElement` is referenced only inside `elementClassFor`.
  - Require `JSON.stringify(mod.catalogJson, null, 2) + "\n"` to equal the text of `dist/a2ui/catalog/v1.json`.
  - Require `typeof mod.createOutcropCatalog === "function"`.
  - Require `dist/a2ui/adapter/v1.d.ts` to exist.
  - Require every non-basic catalog component to appear in `report.adapter.descriptors` with a `route` for every data prop in its catalog entry. A data prop is any property of `allOf[2].properties` except `component`, `eventData` (a bare `$ref` to common_types `DataBinding`), action props (a `$ref` to common_types `Action`) and provider results (name ending in `Result` **and** listed by no descriptor route). Detect by schema, never by an `on` prefix, so a data prop named `online` is still checked.
  - `checkDist` becomes async; update `main` and the tests.
  - `fixtureProblems` applies only to `.json` files.

- [ ] **Step 1: Write the failing tests:**
  - `adapter-bundle.test.ts`: bundle the real `a2ui/src/index.ts` with a two-component fixture. Assert:
    - `packages` ⊆ `ALLOWED_PACKAGES`;
    - the output `import()`ed from a temp file exposes `catalogJson` and `createOutcropCatalog`;
    - a validators source that `require`s `"zod"` throws the closure error.
  - `generate.test.ts`: string outputs are written verbatim; the report has `adapter.descriptors`.
  - `check-dist.test.ts`: a fixture repo with a bundle whose `catalogJson` differs from the catalog file → a problem; a missing descriptor route → a problem; a `.js` file under `dist/a2ui` no longer throws "Cannot parse".
- [ ] **Step 2:** Run `npx vitest run scripts/agentui/`. Expected: FAIL.
- [ ] **Step 3: Implement.** In `vendor-audit.mjs`, read `dist/agentui-report.json`. A missing file or a missing `adapter.packages` throws a literate error telling the user to run `npm run build`. Union those packages into the audited set.
- [ ] **Step 4:** Run `npm run build` and then `npm test`. Expected: green.
  - `dist/a2ui/adapter/v1.js` and `v1.d.ts` exist.
  - `[29]` passes.
  - `npm run audit:vendor` includes `ajv` and `fast-deep-equal`.
  - Record the bundle size in the task report (`wc -c dist/a2ui/adapter/v1.js`).
- [ ] **Step 5:** Mutation checks. Do each, see it fail, then revert:
  1. Add `import "@a2ui/web_core"` to `a2ui/src/values.ts` → `npm run build:agentui` fails with the closure error.
  2. Hand-edit `dist/a2ui/catalog/v1.json` → `node scripts/agentui/check-dist.mjs` reports the G2 mismatch.
- [ ] **Step 6:** Commit `feat(agentui): bundle the A2UI adapter with the catalog; closure gate and [29] G2`, then `git push`.

---

### Task 9: Fleet adapter conformance (G3)

**Files:**
- Create: `a2ui/fleet-adapter.test.ts`, `a2ui/sample-values.ts`, `a2ui/sample-values.test.ts`

**Interfaces:**
- Consumes: the **built** `dist/a2ui/adapter/v1.js` (`createOutcropCatalog`), `dist/agentui-report.json` (`adapter.descriptors`), `dist/a2ui/catalog/v1.json`, the built component scripts under `dist/components/`, real `@a2ui/web_core` 0.14.0, and each component's `<name>.conformance.ts` glue (`CONFORMANCE_GLUE.trigger(channel, handle)`), loaded with `import.meta.glob` as `runtime/fleet-conformance.test.ts` does.
- Produces: `sampleValue(schema: object, variant: 0 | 1, root: object): unknown`. It gives two distinct valid values for a literal-arm schema, covering `type` boolean/string/number/integer/array/object, `enum`, `const`, `format: date-time`, `minimum`/`maximum`, `minItems`, `required`, `oneOf`/`anyOf` (first arm for variant 0, second arm or variant 1 of the first arm otherwise) and `$ref` into `root.$defs`. Any other keyword throws "sampleValue: unsupported keyword <k> at <pointer>; extend sample-values.ts". Fail rather than guess.

**Setup:**
- Components are loaded exactly as `runtime/fleet-conformance.test.ts` loads them: `import.meta.glob("../components/*/*.ts")`, so `window.createX` exists from the TypeScript source and `tests/setup.ts` polyfills apply. Do **not** have jsdom execute the dist IIFEs: scripts jsdom runs live in a separate vm context without vitest's globals. Task 10 covers the dist IIFEs in a real browser.
- The real adapter loader still runs. A `MutationObserver` on `document.head`, installed in `beforeAll`, dispatches `new Event("load")` on every `<script>` and `<link>` the loader injects, after asserting each URL equals `<assetBaseUrl>/<descriptor.assets.*>`. So G3 also checks the asset paths.
- `assetBaseUrl` is `"https://assets.test"`.
- The adapter comes from the built bundle (`dist/a2ui/adapter/v1.js`), the descriptors from `dist/agentui-report.json`. A missing `dist` build throws: "run npm run build first".

**Per component** (`describe.each` over the descriptors), with a real `MessageProcessor` and surface, and the element created directly by assigning `context`:
1. **Mount:** send `updateComponents` with every required data prop set to `sampleValue(…, 0)`. Await the element's `handle`. Expect the factory to have been called once (spy by wrapping `window[descriptor.factory]` after the script loads).
2. **Live props:** for each `slot`/`state`/`value` prop, bind it to `/p/<name>`, set data to variant 1, and expect the factory call count to stay 1 and no error to be dispatched.
3. **Create props:** for each `create` prop, re-send the component with variant 1, and expect the count to rise by exactly 1.
4. **Events:** with `eventData: {path:"/ev"}` and every action prop set to `{ event: { name: "<actionProp>" } }`, call `CONFORMANCE_GLUE.trigger(channel, handle)` for each event. Expect `/ev/<channel>` to be written, unless the event is `payloadInValue`, in which case the bound `value` path is written, and one action to be captured.
   - A component whose event has no glue trigger fails with "add a trigger for <channel> to components/<dir>/<dir>.conformance.ts". This is the same rule the runtime fleet test applies.
5. **Teardown:** remove the element, await a microtask, and expect `handle.destroy` to have been called (spy it).

Also add a coverage test: the descriptor list is non-empty, and its names equal the non-basic components of `dist/a2ui/catalog/v1.json`.

- [ ] **Step 1: Write the failing tests** (`sample-values.test.ts` first: each keyword, both variants distinct, the unsupported-keyword throw), then `fleet-adapter.test.ts`.
- [ ] **Step 2:** Run `npm run build && npx vitest run a2ui/`. Expected: FAIL first (missing module), then real findings.
- [ ] **Step 3: Implement** `sample-values.ts`, and make the fleet test pass for all 8 components. A component that genuinely fails, such as a declared slot whose handle method is missing, is a real defect. STOP and report it with the failing step; do not change manifests or components in this task.
- [ ] **Step 4:** Mutation check: change `routesFor` so that `stateKeys` map to `create` → G3 fails on StickyNote step 2 (the count rises). Revert.
- [ ] **Step 5:** Commit `test(a2ui): fleet adapter conformance for every catalog component (G3)`, then `git push`.

---

### Task 10: End-to-end tests against Google's renderers

**Files:**
- Create: `tests/a2ui-adapter.spec.ts`, `tests/a2ui/harness-lit.ts`, `tests/a2ui/harness-react.ts`, `tests/a2ui/build-harness.mjs`
- Modify: `package.json` (devDependencies, exact: `"@a2ui/lit": "0.14.0"`, `"@a2ui/react": "0.14.0"`, `"@a2ui/markdown-it": "0.2.2"`, `"react": "19.3.1"`, `"react-dom": "19.3.1"`; script `"test:e2e:a2ui": "npx playwright test tests/a2ui-adapter.spec.ts"`)

**Harness:**
- `build-harness.mjs` bundles each harness with esbuild into `test-results/a2ui-harness/<name>.js` (IIFE, `--define:process.env.NODE_ENV='"development"'`), marking the URL `http://localhost:8000/a2ui/adapter/v1.js` **external**.
- Each harness:
  - `await import("http://localhost:8000/a2ui/adapter/v1.js")`;
  - builds `createOutcropCatalog({ Catalog, basicCatalog, BASIC_FUNCTIONS }, { assetBaseUrl: "http://localhost:8000" })`;
  - creates `MessageProcessor([catalog], a => window.__actions.push(a))`;
  - mounts surfaces, with `<a2ui-surface .surface>` for Lit and `createRoot(...).render(<A2uiSurface surface>)` for React;
  - removes the surface element on `onSurfaceDeleted`, as the integration guide will tell hosts to;
  - captures `onError` into `window.__errors`;
  - exposes `window.send(msgs)` and `window.dm(surfaceId, path)`.
- The spec serves the harness with `page.route("http://localhost:8000/__a2ui/*", …)`, fulfilling from `test-results/a2ui-harness/`, plus a minimal HTML page loading `/css/custom.css` from dist and the harness script.

**Scenarios (Lit):**
1. **Display:** `Ruler` renders. The `outcrop-ruler` element contains the component's root, and `__errors` is empty.
2. **Field:**
   - `OrientationPicker` with `value: {path:"/o"}` and data `/o` set.
   - The rendered state reflects it.
   - `updateDataModel` changes it live: assert the component's selected state changes, reading the DOM through a selector from its README.
   - A user click on the other option sets `dm("s","/o")` to the new value.
3. **Surface:**
   - `StickyNote` with `value: {path:"/note"}`, `eventData: {path:"/ev"}`, `onChange: {event:{name:"noteChanged", context:{text:{path:"/note"}}}}`.
   - Typing into the note updates `/note`, and one `noteChanged` action is captured whose context holds the typed text.
   - Changing a create-time prop, `readOnly: true`, re-creates it: the element's `handle` identity changes. Expose `window.__handleOf(id)` in the harness by reading the element's `handle` getter.
4. **Base theme:** a second page created with `injectBaseTheme: true` and **no** hand-linked `custom.css` → after the first component mounts, exactly one `link[href$="/css/custom.css"]` is in `<head>`. The default page (false) gets none injected by the adapter.
5. **Errors:**
   - Binding `StickyNote.collapsed` to a string → one `VALIDATION_FAILED` with path `/c`.
   - `assetBaseUrl` pointing at a 404 path, in a second page → `OUTCROP_ASSET_LOAD_FAILED`.

**Scenario (React):** the field scenario 2 under `@a2ui/react`.

- [ ] **Step 1:** Install the devDependencies with `npm install --save-dev --save-exact <list>`. Confirm `package.json` has no `^` on them and that `npm ls zod` shows one copy.
- [ ] **Step 2: Write the spec and harnesses.** Run `npm run build && npm run test:e2e:a2ui`. Expected: FAIL first. Fix only test code, unless a scenario exposes a real adapter defect; in that case, fix it with a vitest unit test added first, test-first.
- [ ] **Step 3:** Run until green. Record the run output in the task report.
- [ ] **Step 4:** Commit `test(a2ui): end-to-end round trip under @a2ui/lit and @a2ui/react`, then `git push`.

---

### Task 11: Documentation, the decision record and the issues

**Files:**
- Create: `A2UI.md`, `docs/A2UI_INTEGRATION_GUIDE.md`
- Modify:
  - `AGENTS.md`: the "(CRITICAL) Agent-Protocol-Capable Components" section links `A2UI.md`, and the new-component checklist gains the line "A catalog component works through the A2UI adapter: G1–G3 pass; never hand-write a wrapper."
  - `README.md`: an "A2UI support" section.
  - `CDN_CONTRACT.md`, `docs/CDN_INTEGRATION_GUIDE.md`: the §12.2 names.
  - `scripts/generate-docs.js`: register `A2UI_INTEGRATION_GUIDE.md` (check `[11]`).
  - `agentknowledge/decisions.yaml` (a new ADR after ADR-219), `agentknowledge/concepts.yaml` (concept `A2uiAdapter`), `agentknowledge/history.jsonl`, `CHANGELOG.md`, `CONVERSATION.md`.
  - `specs/agentui-a2ui.prd.md`: Status "Implemented 2026-10-2x".

**Content requirements:**
- **`A2UI.md`** (agents and contributors). It states rules, each checkable against the code:
  - descriptors are derived;
  - the route rule (§3.2), with "to make a prop live, declare it as an `accepts` slot or a `stateKeys` entry";
  - G1, G2 and G3, and what each failure means;
  - bind `value` to read user edits;
  - `eventData` semantics;
  - the four error codes;
  - "never hand-write a wrapper, never edit `dist/a2ui/adapter`";
  - the closure rule (no `@a2ui/*` imports in `a2ui/src`).
- **`docs/A2UI_INTEGRATION_GUIDE.md`** (host developers):
  - a 60-second overview;
  - a Lit recipe and a React recipe, the code taken from the e2e harnesses;
  - an Angular note (`useUniversalComponents: true`, untested);
  - the `webCore` object;
  - **base theme, a required step:** link `/css/custom.css` and set `data-bs-theme`. Explain `injectBaseTheme: true` for demo, prototype or agent-only pages, with the warning that it restyles the whole page because it is Bootstrap;
  - `assetBaseUrl` and CSP (`script-src` and `style-src` for that origin; module `import` of `/a2ui/adapter/v1.js` needs CORS, already served);
  - advertising the catalog (`getRendererCapabilities` / `catalogJson`);
  - handling `onError` and sending v0.9.1 `error` messages;
  - removing surface elements after `deleteSurface`;
  - theming follows the host page (why);
  - the tested `web_core` 0.14.x;
  - a worked StickyNote round trip (messages in, actions out);
  - a troubleshooting table, one row per error code.
- **`README.md`:** a short "A2UI support" section with the one-paragraph value proposition, the catalog URL, the adapter URL and a link to the guide. Mention MCP Apps support as coming with #19, with no claim beyond that.
- `[19]` (`check-published-api.mjs`) must pass: every API name the docs publish exists. If it flags `createOutcropCatalog` or `catalogJson` because it only knows `window` globals, extend its known-name source to read `a2ui/src/public.d.ts`, with a test, rather than suppressing it.

- [ ] **Step 1:** Write the docs. Run `npm run build && npm test`. Expected: green, including `[11]`, `[19]` and `[29]`.
- [ ] **Step 2:** Add the ADR (next free number after 219): context, decision, consequences. It cites spec §1.3's verified facts and this plan's amendments. Append to `history.jsonl`, and add the CHANGELOG entry under Unreleased.
- [ ] **Step 3:** Commit `docs(a2ui): A2UI.md, host integration guide, README, CDN contract, ADR`, then `git push`.
- [ ] **Step 4:** Comment on #18 with a summary: the commits, the bundle size, the G1–G3 status, the e2e results and links to the docs. Tick the "Developer and agent documentation" and "README" items in #16's Definition of done **only for the A2UI half**, in the comment text, leaving the boxes unticked until MCP Apps lands (#19).
