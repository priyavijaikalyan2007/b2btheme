<!--
SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
SPDX-FileCopyrightText: 2026 Outcrop Inc
SPDX-License-Identifier: MIT
Repository: enterprise-bootstrap-theme
File GUID: 9d41c7e2-6b3a-4f58-a0d2-8e5f1b7c3a94
Created: 2026
-->

<!-- AGENT: Plan and progress for readiness step 4 (specs/agentui-layouts.prd.md): one section per PR. -->

# Agent UI readiness, step 4: plan and progress

## L0: the children mechanism and StackLayout (ADR-238), done 2026-10-31

- [x] **T1 runtime:** `ProtocolSpec.children` and its registry validation; runtime bundle regenerated.
- [x] **T2 classify and resolve:** host-code paths recorded; a member whose required elements are all child slots is data; slots classified, stale and double-classified checks.
- [x] **T3 generate, catalog, lean catalog, descriptors:** `ComponentId` at each slot (top level, or inside the option's closed override); no binding arms; the lean catalog knows `ComponentId`; `children` in the descriptor; the options-schema validators register A2UI's common types.
- [x] **T4 adapter:** `ChildElements` (resolve, keep by id, late arrival, removal, duplicates, missing element, cycles through each child's ancestors); rebuilds in one task with state carried across; `fill` height for layouts.
- [x] **T5 StackLayout:** additive `on()` for `resize` and `collapse`, `getState`/`setState`; manifest with `protocol.children` and a closed `panels` override; glue (divider drag with jsdom stand-ins).
- [x] **T6 tests and records:** generator fixture and tests; adapter unit tests; fleet gates; browser tests under Lit and React; ADR-238, AGENTS.md, A2UI.md, CAPABILITY_MANIFEST.md, the integration guide, CHANGELOG, history, the ChildSlot concept.

Found while building it, and recorded in the spec: a layout over A2UI rendered with no height (§2.6), and web_core's topology check did not catch two layouts holding each other (§2.7).

## L1: BorderLayout, SplitLayout, TabbedPanel (ADR-239), done 2026-10-31

Child paths, checked against each options type: BorderLayout `north`, `south`, `east`, `west`, `center` (each `HTMLElement | any`, so "one"); SplitLayout `panes[].content` ("one"); TabbedPanel `tabs[].content` ("one").

Decisions:

- **An existing `setState` keeps firing its callbacks** (BorderLayout, SplitLayout). The adapter never passes them, so only channels could leak a restore to the agent: the `restoring` flag silences channels only. StackLayout's `setState` was new, so it silences both.
- **BorderLayout stays `display`.** No gesture collapses a region (only `collapseRegion()` does), so it has no channel and nothing an agent changes is state. `collapsible` and `onLayoutChange` are host-only. Rebuilds still carry its collapsed regions through its own `getState`/`setState`.
- **SplitLayout `orientation` is a state key** (user, 2026-10-31). Its `getState()` already returns it, so `setState()` now applies it through `setOrientation()` when it differs, and takes any part of a state (both are labelled fixes: it ignored the orientation it reported, and it threw on a partial state). `persistKey` is host-only (it names a localStorage entry); `onDividerDblClick` is host-only (the double-click collapses, which `collapse` reports).
- **TabbedPanel over A2UI is contained** (`protocol.fixed: { contained: true, mode: "docked", showTitleBar: false }`): no float or close button, no viewport pinning, and the tab bar keeps its collapse button. The floating and docking options are host-only.
- **A tab switch is view state, as in Ribbon (ADR-235):** `onTabSelect` and `onTabDeselect` are host-only and `activeTabId` restores it; closing a tab, collapsing and resizing are TabbedPanel's channels, as collapse and resize are StackLayout's and SplitLayout's.
- **TabbedPanel `tabs[].content` is a component id only, over A2UI.** This supersedes spec §4's note: a string could be text or an id, so a literal string would show the "pending child" placeholder. Hosts keep the string arm; an agent gives text as a Text child.

Found while building it: a top-level child slot has no literal arm, so the adapter's validator compiler now compiles it from the slot itself (BorderLayout was the first).

Tasks:

- [x] **T1 BorderLayout:** manifest (children, host-only, agent sentences); tests.
- [x] **T2 SplitLayout:** additive `on()` (`resize`, `collapse`), `setData`, silent-channel `setState` with orientation and partial state; manifest with a closed `panes` override; glue triggers; tests.
- [x] **T3 TabbedPanel:** additive `on()` (`tabClose`, `collapse`, `resize`), `getState`/`setState` (`activeTabId`, `collapsed`, `height`), `setData`; manifest with `fixed`, host-only and a closed `tabs` override; glue; tests.
- [x] **T4 browser tests** (Lit and React) and **records**: ADR-239, A2UI.md, the integration guide, AGENTS.md if a rule changes, CHANGELOG, history, migration and audit pins, #64.

## L2: AnchorLayout, BoxLayout, CardLayout, FlexGridLayout, LayerLayout (ADR-240), done 2026-10-31

Child paths, checked against each options type: `children[].child` (AnchorLayout, BoxLayout), `cards[].child`, `cells[].child`, `layers[].child`, each "one", each beside its placement fields as ordinary data.

Decisions:

- **A rebuild carries only declared state** (a fix to ADR-238, found here). BoxLayout's, CardLayout's, FlexGridLayout's and LayerLayout's `getState()` report option values and their `setState()` applies them, so carrying the whole state undid an agent's change to `direction`, `activeKey`, `columns`, `rows` or `sizing`. The descriptor lists the manifest's `stateKeys`, and the adapter carries only those.
- **AnchorLayout, BoxLayout, FlexGridLayout and LayerLayout are `display`**: no gesture changes them. `onLayoutChange` is host-only.
- **CardLayout is `surface`, with `activeKey` (and `cardCount`, reported) as state**: its arrow keys switch cards. An agent's `activeKey` switches in place; a card switch is view state, as TabbedPanel's, so it emits no channel.
- **No escape through offsets:** AnchorLayout and LayerLayout clip their positioned children (`overflow: hidden` on the root).

Tasks:

- [x] **T1 adapter:** descriptor `stateKeys`; `#captureState` keeps only those; tests.
- [x] **T2 manifests:** the five, each with a closed override; CardLayout's additive `on()`, `setData()`, partial `setState()`; tests.
- [x] **T3 browser tests and records.**

## L3

Not started: DockLayout, FlowLayout, GridLayout (spec §4).
