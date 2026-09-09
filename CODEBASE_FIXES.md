# Codebase Audit — Issue Tracker

> **Created:** 2026-03-19
> **Purpose:** Tracks all issues found during the codebase audit. Organized by severity and category. Check off items as they are resolved.
> **Convention:** Each fix should reference the commit hash that resolves it.

---

## CRITICAL — Security

These issues involve potential XSS or script injection vectors and must be addressed before any public-facing deployment.

- [ ] **SEC-1** `components/richtextinput/richtextinput.ts:1407` — `innerHTML` used without explicit sanitization at the call site. User-supplied or external content passed through this path could execute arbitrary scripts. Must sanitize with DOMPurify or equivalent, or replace with safe DOM construction (`textContent`, `createElement`).

- [ ] **SEC-2** `components/spinemap/spinemap.ts:1841` — DOM-based text extraction via `innerHTML` could trigger script execution if the source element contains injected markup. Replace with `textContent` for safe text extraction.

- [ ] **SEC-3** `components/markdownrenderer/markdownrenderer.ts:448` — PlantUML server SVG response is injected via `innerHTML` without sanitization. A compromised or malicious PlantUML server could return SVG containing embedded `<script>` tags or event handler attributes. Sanitize the SVG response before injection (e.g., DOMPurify with SVG profile).

---

## CRITICAL — Standards

These violate mandatory project conventions (`export` keyword requirement per MEMORY.md, TypeScript module pattern) and cause build fragility.

- [ ] **STD-1** `components/diagramengine/diagramengine.ts` (19,198 lines) — Zero `export` keywords on 60+ interfaces, 15+ classes, and the factory function. Per project convention, ALL public types, interfaces, classes, and factory functions MUST have the `export` keyword. Without `export`, tsc treats files as scripts (global scope), leading to duplicate declaration errors across the codebase. This is the single largest standards violation in the repository.

- [ ] **STD-2** Twelve implementation files are missing the `export` keyword on their primary classes/types:
  - `components/notificationcenter/notificationcenter.ts` — `NotificationCenter` class
  - `components/breadcrumb/breadcrumb.ts` — `Breadcrumb` class
  - `components/stepper/stepper.ts` — `Stepper` class
  - `components/propertyinspector/propertyinspector.ts` — `PropertyInspector` class
  - `components/guidedtour/guidedtour.ts` — `GuidedTour` class
  - `components/helptooltip/helptooltip.ts` — `HelpTooltip` class
  - `components/slider/slider.ts` — `SliderImpl` class
  - `components/formdialog/formdialog.ts` — `FormDialogImpl` class
  - `components/helpdrawer/helpdrawer.ts` — `HelpDrawer` class, `MdRendererHandle` type, `MdRendererFactory` type
  - `components/docviewer/docviewer.ts` — `DocViewer` class, `MdRendererHandle` type, `MdRendererFactory` type

---

## HIGH — Window Cast Pattern

Per ADR and MEMORY.md, the required pattern is `(window as unknown as Record<string, unknown>)`. Using `(window as any)` bypasses type safety.

- [ ] **WIN-1** 20 files use `(window as any)` instead of the required double-cast pattern (62 total occurrences). Files requiring update:
  - `components/timeline/timeline.ts`
  - `components/tabbedpanel/tabbedpanel.ts`
  - `components/datepicker/datepicker.ts`
  - `components/progressmodal/progressmodal.ts`
  - `components/logconsole/logconsole.ts`
  - `components/docklayout/docklayout.ts`
  - `components/timepicker/timepicker.ts`
  - `components/cronpicker/cronpicker.ts`
  - `components/statusbar/statusbar.ts`
  - `components/bannerbar/bannerbar.ts`
  - `components/treeview/treeview.ts`
  - `components/gauge/gauge.ts`
  - `components/timezonepicker/timezonepicker.ts`
  - `components/toolbar/toolbar.ts`
  - `components/colorpicker/colorpicker.ts`
  - `components/sidebar/sidebar.ts`
  - `components/durationpicker/durationpicker.ts`
  - `components/toast/toast.ts`
  - `components/skeletonloader/skeletonloader.ts`
  - `components/emptystate/emptystate.ts`

---

## HIGH — Function Length (>30 lines)

Per CODING_STYLE.md, functions must be 25-30 lines maximum. These functions significantly exceed that limit and should be decomposed via Extract Method refactoring.

- [ ] **FN-1** `components/toolbar/toolbar.ts` — 10 oversized functions:
  - `applyToolStateToDOM` (107 lines)
  - `buildSplitButton` (79 lines)
  - `buildRoot` (73 lines)
  - `buildGalleryControl` (66 lines)
  - `buildGalleryOptions` (66 lines)
  - `attachGripDrag` (62 lines)
  - `buildItemElement` (60 lines)
  - `attachResizeHandler` (56 lines)
  - `applyModeClasses` (52 lines)
  - `updateDockZones` (46 lines)

- [ ] **FN-2** `components/treeview/treeview.ts` — 3 oversized functions:
  - `buildTreeContentVirtual` (84 lines)
  - `populateVirtualRow` (59 lines)
  - `buildNodeItem` (57 lines)

- [ ] **FN-3** `components/treegrid/treegrid.ts` — 1 oversized function:
  - `constructor` (59 lines)

---

## HIGH — Error Handling

Per LITERATE_ERRORS.md, factory functions must validate their inputs (container element, options object) and produce literate, actionable error messages.

- [ ] **ERR-1** 10 of 15 sampled factory functions have no container or option validation. Missing from:
  - `components/colorpicker/colorpicker.ts`
  - `components/datepicker/datepicker.ts`
  - `components/timeline/timeline.ts`
  - `components/gauge/gauge.ts`
  - `components/toast/toast.ts`
  - `components/tabbedpanel/tabbedpanel.ts`
  - `components/logconsole/logconsole.ts`
  - `components/sidebar/sidebar.ts`
  - `components/skeletonloader/skeletonloader.ts`
  - `components/toolbar/toolbar.ts`

  Each should validate that the container element exists and is a valid DOM node, and that required options are present, using literate error messages that tell the developer exactly what went wrong and how to fix it.

---

## MEDIUM — `!important` in Component SCSS (47 occurrences, 15 files)

Per CODING_STYLE.md, `!important` should only be used when overriding third-party styles or for accessibility-critical rules (e.g., `prefers-reduced-motion`). All other uses indicate specificity problems that should be fixed structurally.

- [ ] **IMP-1** Violations (no third-party justification) — should be refactored:
  - `components/conversation/conversation.scss` (5 occurrences)
  - `components/treeview/treeview.scss` (4 occurrences)
  - `components/treegrid/treegrid.scss` (2 occurrences)
  - `components/splitlayout/splitlayout.scss` (1 occurrence)
  - `components/ribbonbuilder/ribbonbuilder.scss` (1 occurrence)
  - `components/graphcanvas/graphcanvas.scss` (4 occurrences)
  - `components/toast/toast.scss` (2 occurrences)
  - `components/ribbon/ribbon.scss` (1 occurrence)

- [ ] **IMP-2** Justified (third-party overrides) — acceptable, document reason in comments:
  - `components/markdowneditor/markdowneditor.scss` (18 occurrences — Vditor overrides)
  - `components/guidedtour/guidedtour.scss` (1 occurrence — driver.js override)

- [ ] **IMP-3** Justified (accessibility) — acceptable:
  - `components/cardlayout/cardlayout.scss` — `prefers-reduced-motion`
  - `components/skeletonloader/skeletonloader.scss` — `prefers-reduced-motion`
  - `components/gauge/gauge.scss` — `prefers-reduced-motion`
  - `components/graphcanvasmx/graphcanvasmx.scss` — `prefers-reduced-motion`
  - `components/diagramengine/diagramengine.scss` — `prefers-reduced-motion`

---

## MEDIUM — Excessive `console.log` (406 occurrences)

Per LOGGING.md, most log statements should use `console.debug` (development-only, stripped or silent in production) rather than `console.log` (always visible). Only user-facing status messages and critical operational logs should use `console.log`.

- [ ] **LOG-1** Audit and convert `console.log` to `console.debug` where appropriate. Worst offenders:
  - `components/diagramengine/diagramengine.ts` — 72 occurrences
  - `components/treegrid/treegrid.ts` — 27 occurrences
  - `components/timeline/timeline.ts` — 20 occurrences
  - `components/treeview/treeview.ts` — 17 occurrences
  - `components/actionitems/actionitems.ts` — 16 occurrences
  - `components/markdowneditor/markdowneditor.ts` — 13 occurrences
  - `components/prompttemplatemanager/prompttemplatemanager.ts` — 10 occurrences
  - `components/ribbonbuilder/ribbonbuilder.ts` — 9 occurrences

---

## MEDIUM — `: any` Type Usage (60 occurrences, 12 files)

Using `: any` defeats TypeScript's type safety. Each occurrence should be replaced with a proper type, interface, or `unknown` with narrowing.

- [ ] **ANY-1** Files with highest `: any` usage:
  - `components/graphcanvasmx/graphcanvasmx.ts` — 23 occurrences
  - `components/docklayout/docklayout.ts` — 17 occurrences
  - `components/toolbar/toolbar.ts` — 4 occurrences
  - `components/markdowneditor/markdowneditor.ts` — 2 occurrences
  - Layout components — 1-3 each

- [ ] **ANY-2** `components/toolbar/toolbar.ts` — `declare var bootstrap: any` should use a proper type declaration file (`bootstrap.d.ts`) or a minimal interface declaration.

---

## MINOR — Missing Semantic Markers

Per MARKERS.md, all source files must contain semantic navigation markers (e.g., `// COMPONENT:`, `// SECTION:`, etc.) to support agent navigation and codebase understanding.

- [ ] **MRK-1** 12 TypeScript files missing the `COMPONENT` marker:
  - `components/markdowneditor/markdowneditor.ts`
  - `components/treegrid/treegrid.ts`
  - `components/searchbox/searchbox.ts`
  - `components/smarttextinput/smarttextinput.ts`
  - `components/magnifier/magnifier.ts`
  - `components/confirmdialog/confirmdialog.ts`
  - `components/fileupload/fileupload.ts`
  - `components/statusbadge/statusbadge.ts`
  - `components/cronpicker/cronpicker.ts`
  - `components/durationpicker/durationpicker.ts`
  - `components/timezonepicker/timezonepicker.ts`
  - `components/timepicker/timepicker.ts`

- [ ] **MRK-2** 22 of 24 files in `components/diagramengine/src/` are missing the `COMPONENT` marker.

- [ ] **MRK-3** 10 SCSS files missing the marker:
  - `components/smarttextinput/smarttextinput.scss`
  - `components/markdowneditor/markdowneditor.scss`
  - `components/durationpicker/durationpicker.scss`
  - `components/timezonepicker/timezonepicker.scss`
  - `components/timepicker/timepicker.scss`
  - `components/cronpicker/cronpicker.scss`
  - `components/fileupload/fileupload.scss`
  - `components/searchbox/searchbox.scss`
  - `components/statusbadge/statusbadge.scss`
  - `components/confirmdialog/confirmdialog.scss`

---

## MINOR — Inconsistent Factory Return Pattern

- [ ] **PAT-1** Some components return Handle interfaces (preferred pattern — encapsulates implementation, exposes only public API), while others return class instances directly (leaks implementation details). Standardize all components on the Handle pattern for consistency and encapsulation. Audit each component's factory function return type and refactor as needed.

---

## Summary

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL — Security | 3 | Open |
| CRITICAL — Standards | 2 | Open |
| HIGH — Window Cast | 1 (20 files, 62 occurrences) | Open |
| HIGH — Function Length | 3 (14 functions total) | Open |
| HIGH — Error Handling | 1 (10 factories) | Open |
| MEDIUM — !important | 3 | Open |
| MEDIUM — console.log | 1 (406 occurrences) | Open |
| MEDIUM — : any | 2 (60 occurrences) | Open |
| MINOR — Markers | 3 (44 files) | Open |
| MINOR — Factory Pattern | 1 | Open |
| MEDIUM — Unused Variables | 1 (119 errors) | Open |
| **Total** | **21 items** | **0 resolved** |

---

## MEDIUM — Unused Variables (tsconfig strict flags)

- [ ] **UNUSED-1**: 119 unused local/parameter errors detected by `noUnusedLocals` / `noUnusedParameters`. These flags are currently set to `false` in tsconfig.json. Fix all 119 occurrences then enable the flags. Run `npx tsc --noEmit --noUnusedLocals --noUnusedParameters` to see full list.

---

## ACCEPTED DEBT — Keycloak Theme Parity (2026-07-12, ADR-137/-138/-139)

Deliberate trade-offs from the parity workstream. Each is documented in its ADR;
listed here so future audits do not re-litigate them without the context.

- [ ] **DEBT-PAR-1** `theme-init.js` is served at two URLs (`/js/theme-init.js` canonical + `/components/themeinit/themeinit.js` pipeline twin). Accepted to reuse the component build pipeline (ADR-137). Revisit only if the duplication ever confuses consumers — the fix would be excluding the component path from deploy, not adding a second build path.
- [ ] **DEBT-PAR-2** AuthCard publishes generic class names (`.divider`, `.brand-logo`, `.auth-card`, …) on the shared CDN — collision risk for consumers that define the same names. Required verbatim by the parity contract (ADR-138); cannot be namespaced without breaking the FreeMarker mirror. Mitigation: authcard.css is opt-in (own `<link>`), never bundled into custom.css.
- [ ] **DEBT-PAR-3** `Access-Control-Allow-Origin: *` on `/icons/fonts/*` is shipped but untested in the parity flow (Keycloak sources icons from public CDNs per spec R4.1). If self-hosted icons are ever adopted for auth.knobby.io, add an e2e check before relying on it.
- [ ] **DEBT-PAR-4** The apps repo's `setTheme()` early-returns on unchanged mode, so an externally clobbered `knobby-theme` cookie is only rewritten on the next real change or page load. Cosmetic; owned by the apps team (noted in specs/keycloak-theme-parity.md handoff).

---

## ACCEPTED DEBT — Dynamic UI Layer (2026-08-09, ADR-140 … ADR-145)

- [ ] **DEBT-DUI-1** Geometric anchors do not survive **reflow**. `spot` is a fraction of a target's scrollable content, so a mark holds its place through scrolling and resizing — but re-wrap a document at a different width and the same fraction covers different text. The fix is content anchoring (a text-quote or offset selector, in the spirit of the W3C annotation model) surfaced through the existing `{ kind: "entity" }` anchor. Not started. Affects any reflowing or virtualizing content; recorded in `components/dynamiccanvas/README.md` so consumers are not surprised.
- [ ] **DEBT-DUI-2** `attachDrag` in `components/dynamiccanvas/dynamiccanvas.ts` is 36 lines, over the 30-line guidance in `CODING_STYLE.md`. Pre-dates the placement work; tagged `@agent:refactor` in place. Extract the pointer-capture bookkeeping.
- [ ] **DEBT-DUI-3** `validatePatchShape` (35 lines) and `reduceOps` (51 lines) in `runtime/src/document.ts` exceed the length guidance. Both are dispatch-shaped — a switch over op kinds — so the extraction is per-op helpers rather than a mechanical split.
- [ ] **DEBT-DUI-4** 16 components remain `EXEMPT` in the fleet conformance gate with recorded blockers, and 91 of 98 manifested components sit at `display` conformance. Raising a component to `surface` is per-component work; the gate keeps the count honest rather than letting it drift.
- [ ] **DEBT-DUI-5** The scrolling-region index (`within`) is **positional** — the Nth scrollable element inside a frame body, in DOM order. Stable for a given component version; a component that gains or loses a scrolling region between sessions would shift previously recorded indices. Acceptable while regions are one-per-component in practice; if it bites, record a stable descriptor (a data attribute the component owns) instead of an index.

---

## ACCEPTED DEBT — Public-Surface Components (2026-09-01, ADR-146)

Recorded at design time. Neither component is implemented yet; these are the
limits the design knowingly accepts, not defects in shipped code.

- [ ] **DEBT-WEB-1** There is **no automated contrast gate** in this repository. `MarketingHero` and `SiteFooter` both carry WCAG AA acceptance criteria, and both will be verified by eye on their demo pages in light and dark. The mitigation in the design is to use only the rated token pairs in `DARKMODE.md` and never place muted text on a raised surface. Mechanising this is worthwhile and deliberately out of scope for the two components — it is fleet-wide work, since every one of the 123 components carries the same unverified claim today.
- [ ] **DEBT-WEB-2** `SiteFooter` links use muted text when unvisited and the accent colour when visited, which **inverts the common convention**. Chosen deliberately by the user (ADR-146, D5) to make the visited state obvious while keeping the footer quiet. Recorded because it will read as a bug to anyone who meets it without the record. Now stated in four places — the stylesheet comment, the component README, the Component Studio help block, and `specs/sitefooter.md` — because one of them will be the only one someone reads.
- [ ] **DEBT-WEB-3** `tests/website-components.spec.ts` — 11 Playwright tests covering breakpoint collapse, stacking order, overflow at 320px, accessible names and focus visibility — **have never executed**. Playwright's Chromium will not install on the development machine: the download hangs, and the failure is specific to Node v26 (see also the Web Storage shadowing that Node 26 caused, fixed in `tests/setup.ts`). The tests typecheck and Playwright discovers all 11; they fail at `browserType.launch`. Everything they assert is layout that jsdom cannot compute, so **no automated check covers it today**. Resolve by installing a browser on a Node version Playwright supports, or by running the suite in CI. Until then the two components' layout is verified only by eye.

---

## RESOLVED — DiagramEngine e2e suite did not run (2026-08-09, fixed 2026-08-10)

- [x] **DEBT-DE-1** All 67 tests in `tests/diagramengine.spec.ts` failed with `createDiagramEngine not found on window`. The spec navigated to `/docs/demo.html`, the component **gallery index**, which links to every component page and loads none of them; the bundle's `window.createDiagramEngine` assignment was present and correct all along. The suite had therefore been asserting nothing. Repointed at `/demo/components/diagramengine.html`, which loads the engine and builds a canvas, and given a readiness wait on the global rather than a bare selector. All 67 pass with **no engine changes** — nothing was broken behind the broken harness.

  Confirmed the suite has teeth by mutation rather than by trusting green: changing the built default-shape path (`shape: n.shape ?? "rectangle"` → `"ellipse"`) fails `addObject fills defaults` with the expected diff, and the bundle was restored byte-identical afterwards. A first mutation attempt hit two unrelated `shape:"rectangle"` literals and changed nothing — worth knowing that a passing mutation test can mean you mutated the wrong line.

---

## ACCEPTED DEBT — Visual Refresh 2026 (2026-09-09, ADR-147)

- [ ] **DEBT-VR-1** 38 sites use `--theme-hover-bg` / `--theme-active-bg` as a **static background** (avatar circles, chips, progress tracks, the TabbedPanel tab strip) rather than as an interaction state. ADR-147 D3 made those tokens translucent, so they now composite rather than fill. Nothing looks broken — `rgba(15,23,42,.085)` over the content surface resolves to roughly `#e8e9ec` against the previous `$gray-200` `#e2e8f0`, and dark composites slightly darker than before — but it is the wrong token for the job: a filled neutral chip is not an interaction state. The fix is a `--theme-fill-subtle` token plus 38 reassignments, deliberately left as its own change with its own review rather than folded into a styling pass.
- [ ] **DEBT-VR-2** No automated check asserts that the **three elevation layers agree** — Sass `$shadow-*`, CSS `--theme-shadow-*`, and Bootstrap's `$box-shadow`. All three were found out of step during ADR-147, twice. The comments in both files now say the others exist, but a comment is not a gate. A unit test comparing the compiled values would make the invariant executable.
- [ ] **DEBT-VR-3** The radius sweep was **suffix-keyed and applied by script** (163 rules across 46 components), reviewed as a dry run and verified by compiling plus browser spot-checks on the reported components. Components not on a demo page were not individually eyeballed. If a stray corner turns up on something that should be flush, it is from this sweep; the exclusion list and the role mapping are recorded in `specs/visual-refresh-2026.prd.md` §9.2.
- [ ] **DEBT-VR-4** Ribbon controls took `$border-radius` (4px) to match the buttons beside them. In the 3-high mini stack this may read soft; `$border-radius-sm` is a one-line change in `components/ribbon/ribbon.scss` if so. Flagged for judgement rather than decided.

## RESOLVED — Agent knowledge base was not machine-readable (2026-02/03, fixed 2026-09-09)

- [x] **DEBT-KB-1** `agentknowledge/history.jsonl` carried **three malformed lines** — 43, 58 and 104, dated 2026-02-20 and 2026-03-07 — that failed `json.loads`, so any agent parsing the file would fail on it. Undetected for roughly six months because **nothing ever parsed it**. Two distinct causes, both from writing JSON with shell text tools rather than a serializer: two entries were appended **without a trailing newline**, so the following append landed on the same line (`…"}{"date":…`), introduced in `9c9be2e`; and one carried `\!`, which is not a valid JSON escape and is the signature of **bash history-expansion escaping** leaking through a double-quoted append, introduced in `3020cd5`. Repaired by splitting the two joined lines and unescaping the one `\!` — 241 lines to 243, byte count +1 (two newlines added, one backslash removed), and a SHA-256 of both files with newlines and the escape normalised away is identical, so only framing changed and no content was lost. `test-local.sh` check [8] now parses `history.jsonl` and the three YAML files on every `npm test`, and was mutation-tested to confirm it fails on a corrupted file rather than merely passing on a good one. `AGENTS.md` now states the append rule explicitly.
