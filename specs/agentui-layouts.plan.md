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

## L1–L3

Not started. Each batch adds its section here, with the child paths confirmed against each layout's options type (spec §4).
