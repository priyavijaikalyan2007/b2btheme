<!--
SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
SPDX-FileCopyrightText: 2026 Outcrop Inc
SPDX-License-Identifier: MIT
Repository: enterprise-bootstrap-theme
File GUID: a744c2b9-3c03-4603-a2aa-b24ceefb7f2a
Created: 2026
-->

<!-- AGENT: PRD for Agent UI sub-project 1 — the A2UI adapter: vanilla custom-element wrappers driven by generated descriptors, createOutcropCatalog for A2UI hosts, the data/event round trip, gates, tests and docs. Epic: GitHub #16, this sub-project: #18. -->

# Agent UI 1: A2UI Adapter

**Status:** Approved 2026-10-26; amended 2026-10-26 (planning, §14)
**Tracking:** epic [#16](https://github.com/priyavijaikalyan2007/b2btheme/issues/16), this sub-project [#18](https://github.com/priyavijaikalyan2007/b2btheme/issues/18)
**Depends on:** #17 (`specs/agentui-schema.prd.md`): the catalog, the classification and the generator.
**Followed by:** #30 (local demo harness, message checker, advertising demos), #31 (actions and providers), #19 (MCP Apps renderer view)
**Spec author:** Agent + User
**Date:** 2026-10-25
**Plan / progress:** `./specs/agentui-a2ui.plan.md` (written after this spec is approved)

---

## 1. Overview

### 1.1 What this sub-project delivers

#17 publishes a catalog that tells an agent which components exist and what props they take. This sub-project makes those components **render and round-trip inside any A2UI v0.9.1 host**. An agent sends `updateComponents` naming `StickyNote`. The host's renderer mounts our real component. Data-model bindings feed it. The user's edits and the component's events flow back to the agent.

### 1.2 Epic decisions this spec relies on

D2 (host neutrality), D3 (full round trip), D5 (one adapter, A2UI as the shared payload language), D6 (v0.9.1 now, v1.0 later), D7/D13 (`static.outcrop.us`), D10 (`A2UI.md` lands here), D11 (additive only, opt-in bundle). See the epic body.

### 1.3 Facts this design rests on (verified 2026-10-25)

These come from reading `@a2ui/web_core@0.14.0`, `@a2ui/lit@0.14.0` and `@a2ui/react@0.14.0` (repo commit `409ded29`), and from a Playwright spike in headless Chromium against both renderers.

- **Hosts accept framework-free custom elements.** A catalog entry is `{...ComponentApi, tagName, element}` (`WebComponentImplementation`). Lit and React mount such entries natively. Angular does when `useUniversalComponents: true` is set. `A2uiWebComponentElement` is a type only: an `HTMLElement` with optional `context` and `node`.
- **A plain `HTMLElement` that uses only the host-provided `context` works** in Lit and React (spike, checks i–viii). The `context` methods are `dataContext.subscribeDynamicValue`, `resolveDynamicValue`, `resolveAction` and `set`, plus `componentModel.properties`, `componentModel.onUpdated` and `dispatchAction`.
- **A second copy of `web_core` breaks reactivity only if the element runs that copy's signals.** Subscribing with a separately bundled `effect()` never updated. Subscribing with `context.dataContext.subscribeDynamicValue` did. So our elements import nothing from `web_core` at runtime.
- **The renderers differ in how they hand over `context`:**
  - Lit sets `context` before connection and re-assigns a **new** `context` object on every parent render.
  - React's root element is connected first and gets `context` afterwards.
  - Angular assigns a fresh `context` on every prop update.

  Data changes never arrive as a new `context`; they come through the subscription. Prop changes arrive through `componentModel.onUpdated` on the same model.
- **Writing and dispatching:**
  - A two-way write is `context.dataContext.set(<bound path>, v)`, which is what `web_core`'s generated setter does.
  - An event is `dataContext.set(<eventData path>/<channel>, payload)` followed by `dispatchAction(dataContext.resolveAction(raw))`. The action's resolved context sees the value written one statement earlier.
- **`eventData` is a raw binding.** `web_core` classifies a bare `{path}` object prop as `OBJECT`, passes `{"path": …}` through, and generates no setter. The element reads the path itself.
- **Loading our catalog.** `Catalog.fromJson(json)` yields schema-only functions. It needs Google's basic catalog as a peer (`withPeerCatalogs`) and `BASIC_FUNCTIONS` implementations, or re-exported containers reject `children` and every `{call}` fails.
- **Bound values are not validated by the host.** `web_core` exposes no JSON-Schema-to-Zod converter. An unresolvable binding produces only a `MISSING_DATA_BINDING` warning.
- **Teardown:**
  - `disconnectedCallback` is the only general teardown signal.
  - After `deleteSurface`, nothing reaches the element until the host removes the surface element.
  - Lit and React re-parent elements.
  - Google's VegaChart sample rebuilds its widget on every update and on disconnect. That is the anti-pattern to avoid for stateful widgets.
- **Errors.** `SurfaceModel.dispatchError(payload)` exists. The host turns it into the v0.9.1 `error` message `{version, error: {code, surfaceId, message, path?}}`.

### 1.4 Starting point

- 8 components are in catalog v1: ChatDock, GraphLegend, OrientationPicker, Ruler, SkeletonLoader, StickyNote, ToolColorPicker and WorkspaceShell. The 93 components on `PENDING_CLASSIFICATION` join as #20 classifies them, with no adapter change, because everything here is derived (§3).
- None of the 8 declares `actions[]` or `providers`, and none has children.
- Options apply only at construction. No generic update path exists, so live updates go through slots (`setData`), `setState`, `setValue` or a slot's declared setter.

---

## 2. Scope

### 2.1 In scope

- The descriptor generator (§3).
- `OutcropComponentElement` and its per-tag subclasses (§4).
- Prop, two-way and event data flow, readiness and runtime validation (§5).
- The asset loader and the shared mount logic (§6).
- `createOutcropCatalog` (§7).
- Errors and logging (§8).
- Gates (§9), tests (§10).
- Public names and docs: `A2UI.md`, `docs/A2UI_INTEGRATION_GUIDE.md`, the README section, the CDN contract entries, an ADR and the CHANGELOG (§12).

### 2.2 Out of scope (decided 2026-10-25)

| Item | Decision | Where it goes |
|---|---|---|
| Manifest `actions[]` (the node-chrome action bar) | Deferred behind gate G1 (§9) | #31; DataGrid's classification forces it |
| `protocol.providers` (request/response) | Deferred behind gate G1 (§9) | #31 |
| `createSurface.theme.primaryColor` | Ignored. Components follow our CSS tokens and the host page's `data-bs-theme`. One colour cannot reproduce the derived `--bs-primary-rgb`, hover and focus shades, and v1.0 drops `theme`. | Documented in the guide |
| Components with children (layouts) | Blocked on their `children[]` hazards | #20 |
| A2UI v1.0 | `web_core` adapters absorb most syntax differences. A v1.0 catalog is a separate artefact. | Later |
| Vendoring `@a2ui/web_core` on our CDN | #18 ships none, because external hosts bring their own (§1.3). The pinned, vendored copy belongs to hosts we own. | #19, #30 |
| Local demo harness, message checker, advertising demos | Builds on this adapter | #30 |
| Angular end-to-end test | Expected to work with `useUniversalComponents: true`; not verified here. The guide says so. | Later |

---

## 3. Descriptors

### 3.1 Generation

`scripts/agentui/adapter-descriptors.mjs` runs inside `build:agentui`. It derives one descriptor per **catalog component** (never per basic re-export) from `resolveSurface` and the manifest. Nothing is hand-written, so a newly classified component gets a descriptor automatically.

```ts
interface AdapterDescriptor {
    name: string;                 // catalog name, e.g. "StickyNote"
    tagName: string;              // "outcrop-sticky-note" (§3.3)
    factory: string;              // "createStickyNote"
    factoryStyle: "container-first" | "options-first" | "options-only";
    containerOption?: string;
    containerAs?: "element" | "id";
    mountMethod: "auto" | "show" | "getElement";
    conformance: "display" | "field" | "surface";
    assets: { js: string; css?: string };       // relative to assetBaseUrl
    props: Record<string, PropRoute>;           // every catalog data prop
    twoWay: boolean;                            // `value` is two-way
    changeOption?: string;                      // the field's legacy onChange option, when twoWay
    events: { channel: string; option?: string; actionProp: string; payloadInValue: boolean }[];
    dates: string[];                            // data props of format date-time
}
type PropRoute =
    | { route: "slot"; slot: string; setter?: string }
    | { route: "state"; key: string }
    | { route: "value" }
    | { route: "create" };
```

### 3.2 Route derivation, one rule and no exceptions

For each data prop, in this order:

1. A name in the manifest's `accepts` maps to `slot`. If the `SlotSpec` declares a `setter`, the update goes through it; otherwise through `setData`.
2. A name in `stateKeys` maps to `state`.
3. `value` on a two-way component maps to `value`, which calls `setValue`.
4. Anything else maps to `create`.

No new manifest field is introduced. A prop that should update live is made live by declaring it as a slot or state key, which the conformance suite already verifies.

### 3.3 Tag names

`outcrop-` plus the kebab-case of the catalog name, splitting before each upper-case letter that follows a lower-case letter or digit, and before the last upper-case letter of an acronym run that precedes a lower-case letter. So `StickyNote` → `outcrop-sticky-note`, `ToolColorPicker` → `outcrop-tool-color-picker`. Two catalog names that map to the same tag fail the build, naming both.

### 3.4 Embedding

The descriptors **and** the catalog file's exact text are embedded in the adapter bundle at build time. The adapter makes no runtime fetch for metadata, so it can never pair with a different catalog revision, and it needs no CORS rule for metadata.

---

## 4. The element

### 4.1 Shape

- `OutcropComponentElement extends HTMLElement` is the single implementation.
- Each catalog component gets a thin subclass, created from its descriptor by `createOutcropCatalog` and defined under its tag. One subclass per tag is required, because `customElements.define` rejects reusing a constructor.
- The element imports nothing from `web_core` and uses no framework.
- It implements `A2uiWebComponentElement` structurally: `context` and `node` are accessor properties.

### 4.2 Binding to `context`

- **Build on the first `context` assignment**, whether it arrives before connection (Lit) or after (React). `connectedCallback` alone never triggers a build.
- **A same-component guard.** A new `context` for the same component is a no-op. The comparison covers `componentModel`, `surfaceComponents`, `theme` and `dataContext.{surface, dataModel, path, explicitIndex, parent}`. This reimplements `web_core`'s module-private `bindsSameComponent`. A `context` for a **different** component tears down and rebinds.
- `node`, when a renderer sets it, is accepted and not required.
- Subscriptions are `dataContext.subscribeDynamicValue` per bound prop and `componentModel.onUpdated` for prop changes. Every unsubscribe is tracked and released on teardown and on rebind.

### 4.3 Teardown

`disconnectedCallback` schedules teardown in a microtask. If the element is reconnected before the microtask runs, which is what happens when Lit or React re-parents it, teardown is cancelled. Teardown releases every subscription and calls `handle.destroy()`. Hosts must remove the surface element after `deleteSurface` (§12.2).

---

## 5. Data flow

### 5.1 Props

| Raw prop | Behaviour |
|---|---|
| Absent | The option is omitted, so the component's own default applies. The agent asked for nothing, so nothing is fabricated. |
| Literal | Passed through. The host validated it against the catalog when the message arrived. |
| `{path}` or `{call}` | Subscribed. The resolved value is validated (§5.4), date-converted (§5.5), then routed (§5.2). |

### 5.2 Routing a changed value

| Route | Call |
|---|---|
| `slot` | `handle[setter](v)` if declared, else `handle.setData(slot, v)` |
| `state` | `handle.setState({ [key]: v })` |
| `value` | `handle.setValue(v)` |
| `create` | Destroy the handle and build again with the full current option set |

A literal changed by `updateComponents` takes the same route as a bound value. A rebuild happens only when a create-time prop changes, never while the user edits a live value.

### 5.3 Readiness

- The component is not mounted until the element is **connected** to the document, its assets have loaded (§6.1), **and** every bound prop resolves to a valid value other than `undefined`. Binding starts on the first `context`; mounting waits for connection because container-first factories resolve their container with `document.getElementById`.
- Until then the element renders an empty container with `aria-busy="true"`. `web_core`'s `MISSING_DATA_BINDING` warning already informs the agent.
- After mount, a bound prop that resolves to `undefined` sends `OUTCROP_BINDING_LOST` with its path, and the component keeps its last good state.

### 5.4 Runtime validation of bound values

- Build time: Ajv standalone compiles one validator per data prop from the prop's **literal** schema (the non-binding, non-call arm), and the validators are embedded in the bundle. Ajv stays a devDependency. The generated code `require`s two Ajv runtime helpers (`ajv/dist/runtime/ucs2length`, `ajv/dist/runtime/equal`, the latter pulling in `fast-deep-equal`), so the bundle **serves** that code. The closure gate (§9, G2) allows exactly the packages `ajv` and `fast-deep-equal`, and they are audited with the `/lib` closure.
- At runtime, a bound value that fails sends `VALIDATION_FAILED` with the prop's path. The component keeps its last good state, and the invalid value is never applied.

### 5.5 Dates

Props listed in `dates` convert ISO 8601 strings to `Date` on the way in, and `Date` back to ISO 8601 strings on two-way writes and event payloads. A string that does not parse fails validation (§5.4).

### 5.6 Two-way `value`

- The user's edit arrives on the injected `changeOption` callback (field components) or the `change` channel (surface components).
- If `value` is bound, the element writes `dataContext.set(path, v)`. It records `v`, so the echo returning through the subscription does not call `setValue` again.
- If `onChange` is present, its action is dispatched next.
- A literal `value` is allowed. It means "set, and don't read back". The catalog description and `A2UI.md` tell agents to bind `value` when they need the user's edit (user decision, 2026-10-25).

### 5.7 Events

For each descriptor event, through `handle.on(channel)` on surface components, or the injected legacy option otherwise:

1. If `eventData` is bound and the event is not `payloadInValue`, write `dataContext.set(<eventData path>/<channel>, payload)`.
2. If the event's `actionProp` is present, dispatch `context.dispatchAction(dataContext.resolveAction(raw))`.

Both steps run synchronously in that order. An agent that binds no `eventData` still receives the action, without the payload.

---

## 6. Assets and mounting

### 6.1 Loader

- `assetBaseUrl` is required; there is no default domain (D2).
- **The base theme is the host's responsibility by default** (user decision, 2026-10-26). The host links `/css/custom.css` and sets `data-bs-theme`, as every CDN consumer does. With `injectBaseTheme: true` (§7), the loader also injects `<link rel="stylesheet" href="<assetBaseUrl>/css/custom.css">` once per page before the first component mounts. A failure is `OUTCROP_ASSET_LOAD_FAILED` for every element waiting on it. The adapter never sets `data-bs-theme`.
- The element must live in the document's light DOM. If `getRootNode() !== document` at mount, it sends `OUTCROP_MOUNT_FAILED`, naming the light-DOM requirement. Verified 2026-10-26: `@a2ui/lit` and `@a2ui/react` 0.14.0 keep custom elements in the light DOM, including inside a basic `Column`.
- On the first use of a component, the loader injects `<script src="<base>/<assets.js>">` and `<link rel="stylesheet" href="<base>/<assets.css>">` once per page, deduplicated by URL across elements and catalogs.
- Mount waits for both `load` events.
- A load error sends `OUTCROP_ASSET_LOAD_FAILED` with the URL. The element stays unmounted and `aria-busy` is cleared.
- After the script loads, the factory global named in the descriptor must exist. If it doesn't, that's `OUTCROP_MOUNT_FAILED`.
- `assets.css` exists only when `dist/components/<dir>/<dir>.css` existed at generation time. Manifest `defaultOptions` are never applied.

### 6.2 Shared mount logic

The factory-style argument order and the attach logic (`mountMethod`) move from `runtime/src/conformance.ts` into a new `runtime/src/mount.ts`. Both `conformance.ts` and the adapter use it; esbuild bundles it into the adapter. DynamicCanvas keeps its private copy, so the published component's behaviour is unchanged. A factory that throws sends `OUTCROP_MOUNT_FAILED` with the error's message. `attachHandle` throws a literate error when the declared `mountMethod` names a method the handle lacks (it used to skip silently). The conformance suite catches factory-time errors as a mount finding, so its verdicts only get stricter.

---

## 7. `createOutcropCatalog`

```ts
export function createOutcropCatalog(
    webCore: OutcropWebCore,   // { Catalog, basicCatalog, BASIC_FUNCTIONS } from the host's own @a2ui/web_core
    options: { assetBaseUrl: string; injectBaseTheme?: boolean }
): Catalog;
```

- `webCore` is a structural object. A host assembles it from `@a2ui/web_core/v0_9` (`Catalog`) and `@a2ui/web_core/v0_9/basic_catalog` (`basicCatalog`, `BASIC_FUNCTIONS`), and may substitute its renderer's own basic catalog.
- `assetBaseUrl` and `injectBaseTheme` are **page-global**. The first call fixes them, and a later call with a different value throws, because the element classes are shared per tag.
- The function builds our catalog from the embedded JSON with `webCore`'s `Catalog.fromJson`.
- It links Google's basic catalog as a peer and adds the `BASIC_FUNCTIONS` implementations, both taken from `webCore`.
- It attaches `{tagName, element}` to each of our entries. Basic re-exports keep the host renderer's own implementations.
- The result is ready for `new MessageProcessor([catalog], …)`.
- `OutcropWebCore` is a structural type naming only the members used. The function checks those members at call time and throws a literate error naming any that are missing. A `web_core` too old or too new fails loudly, never silently.
- Calling it twice with the same `webCore` returns catalogs whose element classes are identical. The tags are defined once, so a second call never throws from `customElements.define`.
- Supported `web_core`: 0.14.x, the version tested in §10. The guide states the tested range.

---

## 8. Errors and logging

| Situation | Code | Fields | Component state |
|---|---|---|---|
| A bound value fails its schema | `VALIDATION_FAILED` | `path` | keeps the last good state |
| A bound path resolves to `undefined` after mount | `OUTCROP_BINDING_LOST` | `path` | keeps the last good state |
| A script or stylesheet fails to load | `OUTCROP_ASSET_LOAD_FAILED` | `message` names the URL | unmounted |
| The factory global is missing, or the factory throws | `OUTCROP_MOUNT_FAILED` | `message` | unmounted |

- Errors go through `context.dataContext.surface.dispatchError({code, surfaceId, message, path?})`.
- Messages are literate: the component, the prop, what was expected and what arrived.
- Every error is also logged. Logging follows `FRONTEND_LOGGING.md` with prefix `[A2UI]`:
  - info: mount, rebuild (with the create-time prop that caused it) and teardown;
  - debug: route calls;
  - error: each row above.
- Nothing is swallowed, and nothing falls back.

---

## 9. Gates

| Gate | Where | Fails when |
|---|---|---|
| G1 Unsupported capability | `build:agentui` | A catalog component declares a non-empty `actions[]` or any `protocol.providers`. The message names the component and #31. Pending components are unaffected until they are classified. |
| G2 Descriptor coverage | `build:agentui`, plus `[29]` | A catalog component has no descriptor, a data prop has no route, two tags collide (§3.3), or the catalog embedded in the bundle (its `catalogJson` export, serialised as the generator writes it) is not byte-identical to `dist/a2ui/catalog/v1.json`. `check-dist.mjs` checks this independently by importing the built bundle. The bundle's `node_modules` closure must come only from the packages `ajv` and `fast-deep-equal`, and must include nothing from `@a2ui/*`. |
| G3 Fleet adapter conformance | vitest | Any catalog component fails the scripted round trip in §10.2. |

---

## 10. Testing

### 10.1 Unit (vitest, jsdom, test-first)

- **Descriptor generator:** route derivation for each rule and its order, tag kebab-casing and collisions, date detection, and G1 and G2 failures.
- **Element:**
  - building on `context` set before and after connection;
  - the guard: same component → no rebuild, different component → rebind;
  - microtask teardown, including cancellation on reconnect;
  - readiness;
  - each route;
  - create-time rebuild;
  - echo suppression;
  - event ordering;
  - every error row in §8.
- **Loader:** dedupe, load and error paths, and a missing factory global.
- **Validators:** generated code accepts the literal arm and rejects wrong types.
- **`createOutcropCatalog`:** a member-check error, idempotent definition, and basic re-exports keeping host implementations.

### 10.2 Fleet adapter conformance (G3)

For every catalog component, with a scripted `context` that implements the §1.3 methods over a real data model:

1. It mounts.
2. Each `slot`, `state` and `value` prop updates without a rebuild (the factory call count stays 1).
3. Each `create` prop change rebuilds (the count rises by 1).
4. Each event writes `<eventData>/<channel>`, then dispatches its action.
5. Teardown calls `destroy`.

A newly classified component is covered automatically.

### 10.3 End-to-end (Playwright, Chromium)

The real renderers are pinned exactly as devDependencies: `@a2ui/web_core` 0.14.0, `@a2ui/lit` 0.14.0 and `@a2ui/react` 0.14.0, plus their pinned peers. Scenarios under Lit:

- **Display:** Ruler.
- **Field:** OrientationPicker with a bound `value`, covering a data update and a user edit written back.
- **Surface:** StickyNote, with an event written to `eventData` and its action captured. A create-time prop change rebuilds.

React gets one smoke scenario covering the field component's round trip.

---

## 11. Security

- The element never evaluates strings. Bound values reach components only as typed options, and they are validated first (§5.4).
- Assets load only from the host-supplied `assetBaseUrl`. Hosts allow that origin in `script-src` and `style-src`.
- Agents cannot inject functions or elements, because the catalog has no such props (#17's classification). Legacy callbacks are adapter-injected.
- The guide reminds hosts that A2UI actions are untrusted input to their agent backend.

---

## 12. Contract impact and deliverables

### 12.1 Contract impact (D11)

Everything is additive. No existing factory, handle, option, legacy callback or published file changes. `runtime/src/mount.ts` is internal; no new name is added to `window.EnterpriseRuntime`. The bundle has no top-level DOM access, because its `HTMLElement` base class is created lazily, so it can be imported in Node (`[29]`, server-rendering hosts).

### 12.2 New public names, documented in the same change

| Name | Kind |
|---|---|
| `/a2ui/adapter/v1.js` | ESM bundle. Updated additively in place; a breaking change ships as `v2.js`, and v1 stays served. |
| `/a2ui/adapter/v1.d.ts` | Types for hosts |
| `createOutcropCatalog` | Named export, options `assetBaseUrl` and optional `injectBaseTheme` |
| `catalogJson` | Named export: the parsed catalog the bundle embeds, for inline advertising and for G2 |
| `outcrop-<kebab>` | Custom element tags, one per catalog component |
| `OUTCROP_BINDING_LOST`, `OUTCROP_ASSET_LOAD_FAILED`, `OUTCROP_MOUNT_FAILED` | A2UI error codes |

The existing `cdn/_headers` rule for `/a2ui/*` (CORS `*`, 5-minute cache) already covers the bundle.

### 12.3 Documentation

- **`A2UI.md`** (root), rules for agents and contributors:
  - derived routes;
  - "make a prop live by declaring a slot or state key";
  - the gates;
  - binding `value` to read edits;
  - `eventData`;
  - the error codes;
  - "never hand-write a wrapper".

  It is referenced from the AGENTS.md CRITICAL section, which gets a new-component checklist line (D10).
- **`docs/A2UI_INTEGRATION_GUIDE.md`**, the host developer guide:
  - recipes for Lit, React and Angular (`useUniversalComponents: true`, untested);
  - `assetBaseUrl` and CSP;
  - handling `dispatchError` and sending A2UI `error` messages;
  - removing surface elements after `deleteSurface`;
  - why theming follows the host page;
  - the tested `web_core` range;
  - a worked StickyNote round trip.
- **`README.md`**: a section announcing A2UI support, linking the guide and the catalog.
- `CDN_CONTRACT.md` and `docs/CDN_INTEGRATION_GUIDE.md`: the §12.2 names.
- `agentknowledge/` ADR, `CHANGELOG.md`, `CONVERSATION.md`.

### 12.4 Files

| File | Change |
|---|---|
| `scripts/agentui/adapter-descriptors.mjs` (+ test) | New: descriptors, routes, tags, G1, G2 |
| `scripts/agentui/generate.mjs` | Call the descriptor step; emit descriptors and validators for the bundle |
| `scripts/agentui/check-dist.mjs` | G2's independent bundle check |
| `runtime/src/mount.ts` (+ test), `runtime/src/conformance.ts` | Extract the shared mount logic |
| `a2ui/src/*.ts` (+ tests), `a2ui/tsconfig.json` | New: element, guard, routes, loader, `createOutcropCatalog` |
| `scripts/build-a2ui-adapter.mjs`, `package.json` | New esbuild ESM step `build:a2ui-adapter` after `build:agentui`; pinned devDependencies |
| `a2ui/fleet-adapter.test.ts` | G3 |
| `tests/a2ui-*.spec.ts`, test pages | End-to-end |
| Docs in §12.3 | New and updated |

---

## 13. Open items

None blocking. Recorded for the plan:

- Confirm during planning that every slot and state key of the 8 catalog components is reachable by the props of the same name. Report any prop that falls to `create` unexpectedly, without changing manifests in this sub-project.
- The `[A2UI]` logger needs `createLogUtility` for its logger. The adapter is not a `components/` file, so the plan confirms how FRONTEND_LOGGING.md applies to it.

---

## 14. Amendment log

| Date | Change | By |
|---|---|---|
| 2026-10-25 | Initial spec from the brainstorm. Decisions: re-create on create-time prop change; actions and providers deferred behind G1; theme follows the host page; wait for bound data, then error on loss; a literal `value` is allowed and documented; lazy asset loading with an explicit `assetBaseUrl`; tag prefix `outcrop-`; architecture A (one generic element plus generated descriptors). | User decisions |
| 2026-10-26 | Planning amendments 1–9: connected before mount (§5.3); strict attach (§6.2); `webCore` shape and page-global options (§7); `catalogJson` export (§12.2); served Ajv helpers and the closure gate (§5.4, §9); css presence and no `defaultOptions` (§6.1); light-DOM requirement (§6.1); no top-level DOM access (§12.1); optional `injectBaseTheme`, the host's responsibility by default (§6.1, §7). Amendment 9 is a user decision; the rest change no user decision. | Agent + User |
