<!--
SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
SPDX-FileCopyrightText: 2026 Outcrop Inc
SPDX-License-Identifier: MIT
Repository: enterprise-bootstrap-theme
File GUID: 3b8e6a1c-5f2d-4c7e-9a14-2d6b8f0c7e31
Created: 2026
-->

<!-- AGENT: PRD for Agent UI readiness step 4: layouts that host A2UI children. A shared children mechanism proven on StackLayout (L0), then the other eleven layouts in batches. Epic: GitHub #16. -->

# Agent UI readiness, step 4: layouts with A2UI children

**Status:** Approved 2026-10-31 (design in conversation); L0 not yet planned.
**Tracking:** epic [#16](https://github.com/priyavijaikalyan2007/b2btheme/issues/16). L0 closes [#24](https://github.com/priyavijaikalyan2007/b2btheme/issues/24); the batches close the layout line of [#64](https://github.com/priyavijaikalyan2007/b2btheme/issues/64).
**Depends on:** readiness steps 1–3 (ADR-222 to ADR-237), all merged.
**Spec author:** Agent + User
**Date:** 2026-10-31
**Plan / progress:** `./specs/agentui-layouts.plan.md`, one section per PR.

---

## 1. Overview

### 1.1 Where this sits

After step 3, 83 components are in catalog v1 and 18 are pending (#64). Twelve of the pending are layouts: AnchorLayout, BorderLayout, BoxLayout, CardLayout, DockLayout, FlexGridLayout, FlowLayout, GridLayout, LayerLayout, SplitLayout, StackLayout and TabbedPanel. Each takes its content as DOM elements (or other components' handles), which JSON cannot carry, so none can join the catalog as it stands.

A2UI already has a model for this. A component refers to its children by id: `child` (one `ComponentId`), `children` (a `ChildList`), or structured entries such as the basic `Tabs`'s `tabs[].child`. The parent renders each referenced child; the host renderer renders only the root.

### 1.2 Goal

Let a layout host other A2UI components, ours or the basic catalog's, as its content, so all twelve can join catalog v1, with **no change to how existing pages use the layouts** (D11: additive only).

### 1.3 Decisions (user, 2026-10-31)

| # | Decision | Choice |
|---|---|---|
| L-1 | How to split the work | A shared mechanism proven on one pilot layout (L0), then the other eleven in batches (L1–L3), like P0 then B1–B9 in step 2. |
| L-2 | Pilot | StackLayout: panels each holding one child (`panels[].content`), the item-list shape eight of the twelve share; small; closes #24. |
| L-3 | Changes to a layout's children | The layout rebuilds, and the adapter keeps each child's element, keyed by its A2UI id, and moves it into the new layout, so children keep their own state. The layout's state is carried across the rebuild with `getState`/`setState`. No layout gains new API for this. |
| L-4 | Mechanism | Declarative and generated (§2): a manifest declaration, a generated `ComponentId` schema, adapter mounting. Not per-layout glue (AGENTS.md forbids hand-written wrappers), and not A2UI awareness inside the layouts (D11). |

### 1.4 Out of scope

- **Data-bound child templates** (`ChildList`'s `{ componentId, path }` form). This round accepts static ids only; templates can be added later without breaking anything.
- **New layout API** for adding or removing panels in place (L-3 chose rebuilds).
- **Non-layout pending components.** PropertyInspector and CommentOverlay may reuse the mechanism later, but each has its own blockers (#64).

---

## 2. The mechanism

### 2.1 Declaring children (manifest)

A new manifest field, `protocol.children`, maps an option path to `"one"` or `"many"`:

```ts
protocol: {
    children: { "panels[].content": "one" },   // StackLayout
    // BorderLayout: { north: "one", south: "one", east: "one", west: "one", center: "one" }
    // FlowLayout:   { "children[]": "many" }   (each element of the array is one child)
},
```

- Path syntax is `protocol.hostOnly`'s: `.prop` and `[]` for array items.
- `"one"`: the value at the path is a single child id. `"many"`: an array of child ids.
- A declared path must name a member whose type admits an element (`HTMLElement`, a component handle, or `any`); otherwise the build fails (`stale-declaration`). A path also declared `hostOnly`, or that is an event, provider or fixed option, fails as double-classified.
- `runtime/src/registry.ts` validates the field's shape (`PROTOCOL_KEYS`), as it does for `fixed`.

### 2.2 Classification and schema (generator)

- **Classifier and resolver:** a declared path counts as classified. Its element and `any` arms are no longer `unclassified`, `undeclared-hazard` or `too-broad` violations.
- **Schema:** the generator publishes a declared path as A2UI's `ComponentId` (`common_types.json#/$defs/ComponentId`), or `{ type: "array", items: ComponentId }` for `"many"`. The description says, as the basic `Card`'s does, that it is the id of a component rendered in place. Any other member of the same option is described as usual.
- **Adapter descriptor:** gains `children: [{ path, cardinality }]`.
- **Catalog:** additive; the baseline only grows.

### 2.3 Mounting children (adapter)

1. **Resolve.** At mount, for each declared path, the element reads the id(s) from the resolved props. For each id it looks up the component in the surface's component model (`surface.componentsModel.get(id)`), takes the tag name and element class from that component's catalog implementation (ours or the basic catalog's), and creates the element.
2. **Context.** The child element gets a `context` built with the host's own `ComponentContext` class, taken from the layout's context (`new (this.context.constructor)(surface, id, path)`), so the adapter bundle imports no second copy of `@a2ui/web_core`.
3. **Substitute.** The element is put into the factory options at the path, where the layout already accepts an `HTMLElement`. The layout places it like any other content.
4. **Keep.** The element keeps a map from child id to child element.

Both our element (`disconnectedCallback` waits a microtask) and the Lit basic elements (no teardown on disconnect) survive a re-parent within one task, which §2.4 relies on.

### 2.4 Rebuilds that keep children (L-3)

When a create-time prop changes (for a layout, typically a children-bearing prop such as `panels`):

1. Read the component's state with `getState()`, if it declares `stateKeys`.
2. Destroy the old instance.
3. Build the new one **in the same task**, reusing the cached element of every id still referenced.
4. Restore the state with `setState()`.
5. Drop the cached elements no longer referenced; their own disconnect handling tears them down.

Steps 1 and 4 apply to **every** component, not only layouts: a create-time prop change used to lose view state, and carrying it across is additive. If `setState` throws on the carried state, that is reported to the agent (§2.6) and the component keeps its fresh state.

### 2.5 Streaming

A2UI may send a layout before the children it names. A referenced id that is not yet in the surface leaves its slot empty, which is not an error. The element subscribes to the surface's `componentsModel.onCreated` and rebuilds (§2.4) when a referenced id arrives, and to `onDeleted` to empty a slot whose component is removed.

### 2.6 Errors

Each is reported to the agent as an A2UI error (`a2ui/src/errors.ts`), never swallowed:

| Case | Code | Result |
|---|---|---|
| A referenced component's catalog implementation has no element (no tag name) | `OUTCROP_MOUNT_FAILED` | The slot stays empty. The message names the id and its type. |
| The same id is referenced by two slots of one layout | `VALIDATION_FAILED` | The second slot stays empty: one element cannot be in two places. |
| A layout that contains itself, directly or through another | (web_core) | Caught by web_core's own topology validation; a test confirms it. |
| `setState` rejects the state carried across a rebuild | `OUTCROP_MOUNT_FAILED` | The component keeps its fresh state. |

---

## 3. L0: StackLayout (pilot)

- **Children:** `protocol.children: { "panels[].content": "one" }`. A panel is `{ id, title, icon?, collapsed?, collapsible?, minHeight?, content }`, with `content` the child's id over A2UI.
- **Surface** (additive, as in steps 2 and 3):
  - `on("resize")` hears the panel sizes after `onResize`; `on("collapse")` hears `{ panelId, collapsed }` after `onCollapse`.
  - `getState()` is `{ sizes, collapsed }` (the collapsed panel ids); `setState` restores them without firing `onResize`, `onCollapse` or a channel.
  - No `setData` slots: a change to `panels` rebuilds and keeps the children (§2.4).
- **Manifest:** `conformance: "surface"`, `stateKeys: ["sizes", "collapsed"]`, agent sentences, JSDoc on every option; StackLayout leaves `BELOW_REQUIRED` and `PENDING_CLASSIFICATION`, and #24 closes.

---

## 4. Batches after L0

Each batch adds a section to the plan, with its own decisions where a layout raises one.

| Batch | Layouts | Child paths (expected) |
|---|---|---|
| L1 | BorderLayout, SplitLayout, TabbedPanel | `north`…`center`; `panes[].content`; `tabs[].content` |
| L2 | AnchorLayout, BoxLayout, CardLayout, FlexGridLayout, LayerLayout | `children[].child`, with each layout's placement fields as ordinary data |
| L3 | DockLayout, FlowLayout, GridLayout | named slots (`leftSidebar` … `bottomPanel`, `statusBar`) and `content`; `children[]` (many); `children[]` (many) |

The paths are confirmed per batch against each layout's options type. Known questions for the batches:

- **TabbedPanel:** `tabs[].content` also accepts a string, set with `textContent`, so that arm stays ordinary data (checked 2026-10-31).
- **DockLayout:** its slots take a `DockSlotComponent` (a component handle), not an element, so L3 decides how a child element is presented to a slot. Its `content` string is a **CSS selector** into the host page, which an agent must not choose: host-only.

---

## 5. Testing

- **Generator** (`scripts/agentui/*.test.ts`): `protocol.children` publishes `ComponentId` (one) and an array of it (many); a stale path, a non-element path and a double-classified path each fail the build; the baseline only adds.
- **Adapter unit** (`a2ui/src/*.test.ts`): a child resolves and mounts; children are reused across a rebuild (same element instance); a late-arriving id fills its slot; a deleted id empties it; a duplicate id is reported; state is carried across a rebuild, and a rejecting `setState` is reported.
- **Fleet gates:** StackLayout passes surface conformance; the adapter fleet test samples child ids (an id absent from the surface leaves its slot empty without error).
- **Browser** (`tests/a2ui-components/`, Lit and React hosts): StackLayout with a Text panel and a TextField panel; type into the field, then the agent adds a third panel: the typed text survives and a collapsed panel stays collapsed; collapsing and resizing send `onCollapse` and `onResize`.

## 6. Records

ADR-238 (L0) and one ADR per batch; `AGENTS.md` (the classes table and the CRITICAL section), `A2UI.md`, `docs/CAPABILITY_MANIFEST.md` (`protocol.children`), `docs/A2UI_INTEGRATION_GUIDE.md` (children render inside our layouts), the CHANGELOG, history, and #64's checklist.
