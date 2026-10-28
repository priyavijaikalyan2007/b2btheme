<!--
SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
SPDX-FileCopyrightText: 2026 Outcrop Inc
SPDX-License-Identifier: MIT
Repository: enterprise-bootstrap-theme
File GUID: f86bfba2-1069-43b5-8046-cae21f5e71c8
Created: 2026
-->

<!-- AGENT: PRD for Agent UI readiness step 2: provider support in the A2UI adapter (#31), then the #20 sweep that brings 76 pending components into catalog v1 in ten PRs. Epic: GitHub #16. -->

# Agent UI readiness, step 2: providers and the #20 sweep

**Status:** Approved 2026-10-28; amended the same day before planning (S2, S6, S7; §1.3, §1.4, §3.2, §3.8, §5.2, §5.3, §6.1, §8)
**Tracking:** epic [#16](https://github.com/priyavijaikalyan2007/b2btheme/issues/16). Closes [#31](https://github.com/priyavijaikalyan2007/b2btheme/issues/31) (except the action bar, which moves to a new issue) and [#20](https://github.com/priyavijaikalyan2007/b2btheme/issues/20) (for the 76 components in §5).
**Depends on:** readiness step 1 (`specs/agentui-readiness.prd.md`, ADR-222), #41 (ADR-224) and browser tests in CI (ADR-223), all merged.
**Spec author:** Agent + User
**Date:** 2026-10-28
**Plan / progress:** `./specs/agentui-sweep.plan.md` for P0; each batch adds a short section to it.

---

## 1. Overview

### 1.1 Where this sits

Step 2 of the five-step readiness programme (`specs/agentui-readiness.prd.md` §1.1). On 2026-10-28, 93 manifested components are on `PENDING_CLASSIFICATION`:

| Group | Count | Where it goes |
|---|---|---|
| Layouts (anchor, border, box, card, dock, flexgrid, flow, grid, layer, split, stack layouts, tabbedpanel) | 12 | Step 4: layouts with A2UI children |
| Below their required conformance level (fileexplorer, multiselectcombo, permissionmatrix, timeline, usermenu) | 5 | Step 3: #21–#26 |
| **Everything else** | **76** | **This step** |

Measured from `dist/agentui-report.json` on 2026-10-28, the 76 are blocked by:
- function-typed options that aren't classified yet, nearly all of them plain `on*` events;
- data props without JSDoc;
- the 18 `change-mismatch` components.

A small number need real decisions: callbacks that load data on demand, render hooks, and options that take DOM elements.

### 1.2 Decisions (user, 2026-10-28)

| # | Decision |
|---|---|
| S1 | **All 76 join catalog v1.** Agents should be able to render a whole interactive application. The catalog grows additively; if its size becomes a measured problem, a host can offer a smaller catalog. Rejected: agent-facing components only; deciding membership per batch. |
| S2 | **Build provider support (#31) first,** as PR P0, with **TreeView** as its pilot (amended: PeoplePicker was chosen first; see S6 and §3.8). Components with data-loading callbacks then join with live loading. Rejected: host-only loaders now with providers later; deferring all provider components. |
| S3 | **Provider correlation:** one outstanding request per provider. `concurrency: "latest"` (default) or `"queue"` is declared per provider (§3). |
| S4 | **Ten PRs:** P0, then B1–B9 by family (§5). One spec (this), a detailed plan for P0, and a short plan section per batch. |
| S5 | **Options that make a component fetch a URL are host-only** (§4). |
| S6 | **Only meaningful callbacks become events** (amendment, user). Any event or provider raises a component's required level to `surface` (fact 9), which needs additive `on()`, `getState()` and `setState()` on its handle. So lifecycle callbacks (`onOpen`, `onClose`, `onFocus`, `onBlur`, `onHover`) and callbacks whose information `value` already carries (`onSelect`/`onDeselect` on a two-way picker) are host-only. An event is promoted, with additive handle methods, only where it tells the agent something `value` doesn't: row and node clicks, submits, creates and deletes. Rejected: every callback an event (about 70 components promoted); relaxing the surface rule (a separate design). |
| S7 | **A provider's answer schema lives at `$defs["<Component>__<request>Result"]`** (amendment). The `<request>Result` prop is a binding whose description names that def, so a literal is rejected by schema while the agent can still read what to write. |

### 1.3 Constraints

- **Non-breaking** (user, 2026-10-27): existing component users see no change. Batch changes are manifests, JSDoc, tests and, where a component's level rises to `surface` (S6), **additive** handle methods (`on()`, `getState()`, `setState()`, `setData()`). No existing option, callback, method or return value changes. A gesture test that finds a real component bug gets a separate, labelled commit that changes behaviour only where the component was broken (the #39 precedent), called out in the PR.
- **No fallbacks** (AGENTS.md). Anything the adapter can't serve is a loud error.
- **Every list and count may only shrink.** Each component that leaves `PENDING_CLASSIFICATION` lowers every pin it affects, in both ceiling and floor, in the same commit.

### 1.4 Facts this design rests on (verified 2026-10-28)

1. **The catalog half of providers already exists** (`specs/agentui-schema.prd.md` §5.5, `scripts/agentui/catalog.mjs` `providerProps`). `protocol.providers: { <option>: { request } }` becomes:
   - an `on<Request>` Action prop;
   - a `<request>Result` prop;
   - the request, written under `<eventData path>/<request>`.

   No catalog component declares one yet, so nothing published depends on its current shape.
2. **G1 fails on any `protocol.providers`** (`scripts/agentui/adapter-descriptors.mjs`), and on manifest actions not declared in `protocol.hostOnlyActions`.
3. **Events already write their payload to `<eventData>/<channel>`, then dispatch the action prop** (`a2ui/src/roundtrip.ts` `onEvent`). Providers reuse that path.
4. **web_core drops a write equal to the current value.** Its data model is signal-backed, so writing an identical primitive notifies nobody. A provider answer equal to the previous one would go unseen unless the path is cleared first.
5. **`DataModel.set(path, null)` deletes the key** (readiness spec §3.4). Clearing a path is deleting it.
6. **PeoplePicker:**
   - `onSearch?: (query: string) => Promise<PersonData[]>` takes one parameter and returns a promise, so it is a valid provider;
   - its `executeSearch` already drops stale answers with a generation counter;
   - without `onSearch` it uses `searchUrl`, and otherwise returns no results.
7. **PeoplePicker's `searchUrl`** is passed to `fetch()` from the user's browser. That sends the host's cookies on same-origin requests (§4).
8. **No manifest has an agent-usable action** after step 1: DataGrid's `export` is host-only by R4. The action bar has no consumer yet.
9. **Any `emits`, `accepts` or `protocol.providers` makes the required level `surface`** (`runtime/src/conformance.ts` `requiredLevel`; schema spec §7). A `surface` manifest must declare `stateKeys` (`runtime/src/registry.ts`), and the adapter's `wireRoundTrip` throws for a handle with channels but no `on()`. Of the 76, only five handles have an `on(channel)` method (datagrid, treeview, diagramengine, graphminimap, annotation).
10. **TreeView** is already `surface`, with `on()`, `getState()`/`setState()`, `stateKeys: ["expanded", "selection"]` and emits `selection` and `activate`. Its `onLoadChildren?: (node: TreeNode) => Promise<TreeNode[]>` and `onSearchAsync?: (query: string) => Promise<string[]>` are both one-parameter promise callbacks. `onSearchAsync` is used only when the tree has at least `searchAsyncThreshold` nodes (default 5000; `0` is falsy and falls back to the default).
11. **Catalog component defs are relocated under `<Component>__<def>`** at the catalog root (`relocateDefs`), and `defCollisions` checks every relocated key. A new `$defs` key is additive to `catalog-diff`.

---

## 2. Scope

### 2.1 In scope

- Provider support in the A2UI adapter, its build checks, and its error code (§3).
- The URL-fetch rule (§4).
- The 76 components in §5, in ten PRs.
- Docs, ADR, CHANGELOG and issue updates for each PR (§7).

### 2.2 Out of scope

- **The action bar for agent-usable manifest actions.** No component has such an action. It moves from #31 to a new issue, and G1 keeps guarding it.
- Layouts and A2UI children (step 4), the five below-required components (step 3), and components with no manifest (step 5).
- MCP Apps (#19).
- Splitting the catalog for size (S1).

---

## 3. Provider support (#31), PR P0

### 3.1 Manifest

`ProviderSpec` gains one optional key; the change is additive:

```ts
export interface ProviderSpec
{
    /** Catalog name of the request, e.g. "search". UAX #31. */
    readonly request: string;

    /**
     * What happens when the component asks again before the agent answers.
     * "latest" (default): a newer request replaces a waiting one; for searches.
     * "queue": every request is sent, strictly in order; for keyed loads.
     */
    readonly concurrency?: "latest" | "queue";
}
```

- **Registry:** `concurrency` must be `"latest"` or `"queue"`; any other value is an enum issue, as for `presentation`. `ProviderSpec` still rejects unknown keys.
- **Descriptor:** each provider gets `{ option, request, actionProp, resultProp, concurrency }`, with `concurrency` defaulted to `"latest"` by the generator, so the adapter never defaults it.

### 3.2 Catalog

- **`<request>Result` becomes binding-only** (S7). Today it accepts a literal, binding or function call. A literal can't answer a request, so the prop becomes the `DataBinding` ref alone, and the answer's schema moves to `$defs["<Component>__<request>Result"]` (fact 11's naming, so `defCollisions` covers it). The prop's description says: bind it to the path you will answer `on<Request>` at, and write a value matching `#/$defs/<Component>__<request>Result` there. No published component has a provider, so nothing that shipped changes.
- **Tools that find data props by their literal arm** (`check-dist.mjs` route problems, G3's `literalArms`, the render test's samples) skip the result prop without exceptions, because it has no `anyOf`.
- **The adapter's validator** for `<Name>.<request>Result` compiles from that def (`compileValidators` gains a second pointer form).
- **The catalog preamble** stops saying `<request>Result` accepts a literal. That's a description change, not a contract change.

### 3.3 The adapter: one request's life

The adapter passes a provider callback to the factory only when the agent has set all three of:
- the `on<Request>` action;
- `<request>Result` as a binding;
- `eventData` as a binding.

Without them the agent could neither see the request nor answer it. The component then behaves as it does for a host that passes no callback: TreeView leaves a lazy node unexpandable and searches client-side.

When the component calls the callback with a request:

1. **If a request for this provider is already outstanding,** the new one waits (§3.4).
2. **Otherwise it's sent:**
   1. delete the result path (fact 5), so any answer is a change (fact 4);
   2. write the request to `<eventData>/<request>`;
   3. dispatch `on<Request>`;
   4. start the timeout.
3. **The next write to the result path is the answer.**
   - It's validated with the `<Name>.<request>Result` validator.
   - **Valid:** stop the timer, resolve the request's promise (and any superseded ones, §3.4), then send the next waiting request.
   - **Invalid:** report `VALIDATION_FAILED` with the path; the request stays outstanding and its timer keeps running.
4. **A write to the result path with nothing outstanding** is ignored and logged at debug level. That includes the binding's initial value at mount and the adapter's own delete in step 2.1.

### 3.4 Concurrency

Each provider has at most **one outstanding request** (sent, awaiting an answer). That's what correlates answers without request ids: the agent's answer always belongs to the one outstanding request.

- **`latest`:** one waiting slot. A new request replaces the waiting one, and the replaced request's promise is resolved later with the answer to its replacement. So a typed "a", "ab", "abc" sends "a" and then "abc"; "ab" receives the "abc" answer, which the component's own staleness check discards (fact 6).
- **`queue`:** an unbounded FIFO. Each request is sent only after the one before it is answered or times out. Expanding tree nodes A then B sends B only after A's children arrive.

### 3.5 Failure

- **Timeout:** `createOutcropCatalog(webCore, { …, providerTimeoutMs })`, default 30 000.
  - It must be a positive integer; anything else throws at catalog creation, like a bad `assetBaseUrl`.
  - When it expires: reject that request's promise with an `Error` naming the provider and the timeout, report `OUTCROP_PROVIDER_TIMEOUT` to the agent with the result path, and send the next request.
  - A later answer to the timed-out request then arrives with nothing outstanding and is ignored (§3.3 step 4), unless a newer request is already outstanding, in which case it answers that one. This is the accepted cost of having no request ids, and it's documented for agents: answer each request once, and promptly.
- **Teardown (unmount, rebuild, surface deleted):** clear the queue and stop the timers. Pending promises are **dropped, never settled.** Settling them would run the component's success or error path against a torn-down DOM. A dropped promise is collected with the component.
  - *Changed from the approved section 3, which said "rejects": found while writing this spec, and flagged for review.*
- **The component's own error handling is untouched.** A rejected provider promise reaches the component's existing `catch`: TreeView logs the failure and clears the node's loading state.

### 3.6 Errors

`OUTCROP_PROVIDER_TIMEOUT` joins `ERROR_CODES` (`a2ui/src/errors.ts`) and the public `OutcropErrorCode` union (`a2ui/src/public.d.ts`), which is additive.

### 3.7 Gate G1

G1 stops failing on `protocol.providers` and fails only on manifest actions not declared in `protocol.hostOnlyActions`. Its message names the new action-bar issue instead of #31.

### 3.8 Pilot: TreeView (amended from PeoplePicker)

PeoplePicker was the first choice. It's `field` level with no `on()` and no obvious view state, and its provider alone would make it `surface` (fact 9), so it would need handle work in P0. TreeView needs none (fact 10) and pilots both concurrency modes. PeoplePicker moves to B3, where its handle work is planned with the batch.

TreeView completes the whole #20 checklist (§5.2) in P0:
- **Providers:** `onLoadChildren: { request: "loadChildren", concurrency: "queue" }` and `onSearchAsync: { request: "search" }` (`latest`).
- **Events kept:** `selection` and `activate`, which it already emits.
- **Host-only, with reasons:**
  - decisions (`onDragValidate`, `onRename`);
  - hooks (`sortComparator`, `nodeRenderer`, `filterPredicate`);
  - lifecycle and view callbacks (`onToggle`, `onRefreshComplete`, `onSortModeChange`, `onCollapseStateChange`);
  - callbacks the `selection` channel already covers (`onSelect`);
  - drag and drop (`onDrop`, `onExternalDrop`);
  - `onStarToggle` and `onContextMenuAction`, which take two parameters and would need new channels (S6: deferred until an agent needs them);
  - `roots[].data` (too broad) and `toolbarActions` (click handlers).
- **`agent` sentences.**
- **Conformance glue:** an `activate` trigger (G3 requires every channel to trigger) and a `request` trigger for each provider.
- **A gesture test.**

It leaves `PENDING_CLASSIFICATION`, and every pin it affects drops.

---

## 4. The URL-fetch rule

**An option whose value the component passes to `fetch`, `XMLHttpRequest`, `import()` or `EventSource` is declared in `protocol.hostOnly`** with the reason:

> "The component fetches this URL from the user's browser with the host's credentials; an agent must not choose it."

**Why:** an agent that could set such an option could point the component at the host's own endpoints, which receive the user's cookies on same-origin requests. The component would show what came back, and the agent would receive whatever the user picked. A provider gives the agent the same reach without that: the agent answers with data, and the browser fetches nothing on its behalf.

**Not covered:** image URLs (`avatarUrl`, `iconUrl`, `logoUrl`). A cross-origin image can't be read by the page, and an agent can already show any image through the basic `Image` component.

**How it's applied:** each batch reads the source of each of its components for these calls and lists, in its PR, every option the rule covered, or "none". Known so far: PeoplePicker `searchUrl` (B3). TreeView has none (P0). The rule joins #20's checklist and AGENTS.md.

---

## 5. The sweep

### 5.1 Batches

| PR | Batch | Components | n |
|---|---|---|---|
| P0 | Providers (#31) and pilot | treeview | 1 |
| B1 | Pickers with an item payload (`valueFrom`) | fontdropdown, lineendingpicker, lineshapepicker, linetypepicker, linewidthpicker, marginspicker, sizespicker, spacingpicker, columnspicker, layoutpicker | 10 |
| B2 | Date and time (`cleared`) | datepicker, periodpicker, sprintpicker, timepicker, durationpicker, cronpicker, timezonepicker | 7 |
| B3 | Other value inputs | anglepicker, colorpicker, gradientpicker, symbolpicker, slider, maskedentry, editablecombobox, searchbox, fileupload, tagger, peoplepicker | 11 |
| B4 | Display | statusbadge, metriccard, pill, gauge, emptystate, breadcrumb, personchip, presenceindicator, themetoggle, docviewer, reasoningaccordion | 11 |
| B5 | Editors and forms | richtextinput, markdowneditor, latexeditor, codeeditor, propertyinspector, stepper, dynamicformswitcher, inlinetoolbar | 8 |
| B6 | Data views | datagrid, treegrid, chartpanel, activityfeed, auditlogviewer, logconsole, notificationcenter, facetsearch, visualtableeditor | 9 |
| B7 | Collaboration and AI | conversation, commentoverlay, actionitems, prompttemplatemanager, relationshipmanager, explorerpicker | 6 |
| B8 | App shell | applauncher, ribbon, ribbonbuilder, tenantswitcher, navrail, helpdrawer, sitefooter, marketinghero | 8 |
| B9 | Canvas | diagramengine, graphcanvas, graphminimap, spinemap, annotation | 5 |

The batches add up to 76. They merge in order, because each batch lowers pins the next one reads.

### 5.2 Definition of done, per component

1. **Classification:** every function-typed option is
   - an event (`emits[].legacyOption`),
   - a provider (§3), or
   - host-only with a reason.

   Every nested hazard and too-broad type is declared, or given a `protocol.schemas` entry.
2. **JSDoc** on its own line above every data prop. These are comment-only changes to the options interface.
3. **`agent: { useWhen, avoidWhen }`** passes `agent-description`.
4. **`protocol.change`** where the build reports `change-mismatch`, which lowers `changeMismatches`.
5. **`protocol.hostOnlyActions`** for a manifest action an agent can't use (DataGrid `export`, B6).
6. **The URL-fetch rule** (§4).
7. **Rendering:** it passes the generated render test, with an `OVERRIDES` entry and a reason if it needs specific props.
8. **Additive handle methods where the level rises** (S6): `on()`, `getState()`, `setState()` and `stateKeys` for a component that gains an event or provider. What a component with no natural view state declares as `stateKeys` is the step-3 design question (#21–#26); the first batch that meets one brings that question to the user before it's implemented.
9. **A gesture test** in `tests/a2ui-components/<batch>.spec.ts` if it has a two-way `value`, events or providers. It drives the component like a user and checks the written value or action context against the catalog.
10. **G3:** a glue trigger for every channel and provider (`<name>.conformance.ts`).
11. **Bookkeeping:**
    - remove it from `PENDING_CLASSIFICATION`;
    - lower `componentsPendingClassification`, `unclassifiedOptions`, `protocolPropsMissingJsdoc` and `changeMismatches` exactly, in ceiling and floor, with a dated comment;
    - rewrite the catalog baseline (`npm run build:agentui -- --write-baseline`), which may only add.

### 5.3 Rules across batches

- **Only meaningful callbacks become events** (S6). Lifecycle callbacks and callbacks `value` already carries are host-only, with a reason naming what the agent sees instead.
- **Data-loading callbacks become providers** (`onLoadChildren`, `onLoadMore`, `onLoadPage`, `onSearch`, `onSearchAsync`, `onMentionSearch`, `onSearchResources`, `onLoadTemplates`, `onLoadSession`, `fetchFn`, `ontologyFetchFn`):
  - `queue` for keyed loads (children of a node, a page number);
  - `latest` for searches.

  A callback with more than one parameter gets an additive single-object variant or is host-only, per `provider-arity`.
- **Callbacks that return a decision** (`onDragValidate`, `onConfirmRemove`, `validator`, `filterFn`, `sortComparator`, `isDateDisabled`) are host-only: an agent round trip can't sit inside a synchronous check. The reason says the component's default behaviour applies.
- **Render hooks and formatters** (`render*`, `*Renderer`, `formatValue`, `displayFormat`, `iconResolver`) are host-only; the component's default rendering applies.
- **Options that take DOM elements** (tab contents, header and footer content) are host-only until step 4.
- **A component that can't work at all over A2UI yet stays pending,** with the reason written in its batch PR and in #20. Known cases:
  - GraphMinimap needs a live GraphCanvas instance;
  - CommentOverlay needs a page region to overlay.

  Each batch confirms or clears these by reading the code. A component that would render but not work is not shipped.

---

## 6. Testing

### 6.1 P0

- **Unit, `a2ui/src/providers.test.ts`** (new):
  - the three bindings gate whether the callback is passed;
  - sending deletes the result path, then writes the request, then dispatches;
  - a valid answer resolves; an invalid one reports `VALIDATION_FAILED` and stays open;
  - an answer equal to the previous one still resolves;
  - `latest` supersedes, and the superseded promise gets the newer answer;
  - `queue` sends strictly in order;
  - timeout rejects, reports `OUTCROP_PROVIDER_TIMEOUT` and sends the next;
  - teardown drops pending promises unsettled, and a late answer is ignored;
  - a write with nothing outstanding is ignored.
- **Unit, generator:**
  - `concurrency` validation in the registry;
  - the descriptor's provider entries, with the default applied;
  - `<request>Result` binding-only;
  - G1 passes a provider and still fails an undeclared action.
- **Unit, catalog creation:** `providerTimeoutMs` validation.
- **G3** (`a2ui/fleet-adapter.test.ts`): a generic test for every catalog provider. The glue's `request(request, handle)` makes the component ask, and the test checks the write order and the dispatch, then answers and checks that the request settled. It runs for TreeView's two providers.
- **Browser** (`tests/a2ui-components/treeview.spec.ts`), with the harness playing the agent:
  - clicking a row sends `onSelection`, with the selected node in context;
  - expanding a lazy node sends `onLoadChildren` with that node; the agent writes `loadChildrenResult`, and the children render;
  - expanding two lazy nodes sends the second request only after the first is answered (`queue`);
  - typing in the search box sends `onSearch`; the answer highlights the matching node;
  - an unanswered request times out with a short `providerTimeoutMs`, giving `OUTCROP_PROVIDER_TIMEOUT`.

  All run in CI.

### 6.2 Batches

Each batch adds its gesture tests and G3 triggers (§5.2). The render test and the coverage gate pick up its components automatically.

---

## 7. Docs, verification and issues

### 7.1 Docs (P0)

- **A2UI.md:** the provider lifecycle for agents (bind all three, answer once and promptly, what a timeout means), and G1 narrowed. `agentdemo/page/agent/rules.ts` mirrors it verbatim (drift test).
- **`docs/A2UI_INTEGRATION_GUIDE.md`:** `providerTimeoutMs` and `OUTCROP_PROVIDER_TIMEOUT`.
- **AGENTS.md:** when to declare a provider and which `concurrency`, the §5.3 rules, and the URL-fetch rule.
- **Records:**
  - ADR-225;
  - `concepts.yaml` (`ProviderConcurrency`, `UrlFetchRule`);
  - `history.jsonl`;
  - CHANGELOG (Added: provider support; TreeView in the catalog).

Each batch adds a CHANGELOG line, a `history.jsonl` line, its #20 checkboxes, and an ADR only if it makes a new decision.

### 7.2 Verification before each PR

- `npm test` green, and `npm run test:e2e:a2ui` green locally (CI repeats it).
- A mutation check for each new rule: break it and see its test fail.
- `npm run audit:vendor` green.
- A fresh build, diffed against `main`'s:
  - every `components/*/*.js` byte-identical, except where a labelled bug-fix commit says otherwise;
  - the catalog diff additive only.

### 7.3 Issues

- **P0:**
  - closes #31 after opening a new issue for the action bar;
  - updates #20's checklist with the S6 and URL-fetch rules and ticks TreeView.
- **Each batch:** ticks its components on #20, or comments why one stays pending.
- **#20 closes** when B9 merges, with any pending leftovers moved to their own issue.

---

## 8. Risks

| Risk | Mitigation |
|---|---|
| A late answer to a timed-out request answers a newer one (no request ids). | Documented for agents; 30 s default; the component's own staleness checks (the search generation counters in TreeView and PeoplePicker) discard a mismatched answer. Request ids would need a breaking change to the published provider shape, which isn't worth it before a real failure. |
| Promoting components to `surface` (S6) is component code across data views, collaboration and canvas. | Additive methods only; each batch lists them in its PR; the stateless-state question goes to the user at the first batch that needs it (§5.2 item 8). |
| A slow agent makes every search wait. | `latest` sends at most two requests per burst of typing; `providerTimeoutMs` is the host's to tune. |
| A batch finds a component that needs code changes to work over A2UI. | It stays pending, with its reason (§5.3), or gets a separate labelled fix commit that changes behaviour only where it was broken (§1.3). |
| Catalog size grows from 8 to about 84 entries. | Accepted (S1). Measure the catalog's token size per batch in the PR; a smaller catalog per host is the remedy if it's needed. |
| `PENDING_CLASSIFICATION` pins drift between parallel batch branches. | Batches merge in order (§5.1); each branch starts from the previous merge. |

---

## 9. Change log

| Date | Change | Reason |
|---|---|---|
| 2026-10-28 | Initial spec. Decisions S1–S5. Teardown drops pending provider promises instead of rejecting them (§3.5). | User decisions; settling into a torn-down component is unsafe |
| 2026-10-28 | Before planning: S6 (only meaningful events), S7 (answer schema in `$defs`), pilot TreeView instead of PeoplePicker (PeoplePicker to B3). §1.3 allows additive handle methods. | Found while planning: any event or provider forces `surface` (fact 9); a binding-only result would have hidden the answer's schema. User decisions on S6 and the pilot. |
