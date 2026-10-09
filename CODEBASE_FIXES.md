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

- [x] **DEBT-WEB-1** *(closed 2026-10-09, ADR-158)* — **the premise expired and the record did not.** The entry opened on 2026-09-01 saying "there is **no automated contrast gate** in this repository" and asking for fleet-wide mechanisation. Three gates were then built, by a different arc that never came back to this entry: check `[12]` (`check-contrast.py` — ladder ordering, on-screen adjacencies, every text token on every surface, every state layer composited over every surface, and now the group fills, both themes, read from the compiled CSS), check `[13]` (`check-component-palettes.py` — 9 component palettes carrying their own text), and check `[15]` (`check-series-palettes.py` — series separability under three colour-vision deficiencies). Between them they do substantially the fleet-wide work this asked for, and they found real bugs doing it: eight shipped AA failures under DEBT-VR-5b, nine unreadable palettes under DEBT-VR-7.

  What the entry asked for **specifically** — that `MarketingHero` and `SiteFooter` use only rated token pairs and never put muted text on a raised surface — is covered, because both components use only `--theme-*` tokens and check `[12]` verifies those pairs arithmetically in both themes. Neither declares a component palette, so check `[13]` does not apply to them.

  Its genuine residuals are already tracked elsewhere and are **not** reopened here: the large-text exemption (declined on purpose, DEBT-VR-5c) and the 73 component-level `rgba()` backgrounds no token names (DEBT-VR-10). What no gate does, and what the original "verified by eye" clause really wanted, is render a component and measure the pixels — every check here is arithmetic over tokens.

  **The lesson is the entry itself, not the gate.** It sat open for five weeks claiming a thing that was false for four of them, and it said so in six places: this file, both component READMEs, two specs, and the generated `docs/COMPONENT_REFERENCE.md`. A debt entry that states a *condition* rather than a *task* goes stale silently when the condition changes, and generated docs multiply the staleness. Same shape as DEBT-VR-5b-ORIG, closed the same day.
- [ ] **DEBT-WEB-2** `SiteFooter` links use muted text when unvisited and the accent colour when visited, which **inverts the common convention**. Chosen deliberately by the user (ADR-146, D5) to make the visited state obvious while keeping the footer quiet. Recorded because it will read as a bug to anyone who meets it without the record. Now stated in four places — the stylesheet comment, the component README, the Component Studio help block, and `specs/sitefooter.md` — because one of them will be the only one someone reads.
- [x] **DEBT-WEB-3** `tests/website-components.spec.ts` — 11 Playwright tests covering breakpoint collapse, stacking order, overflow at 320px, accessible names and focus visibility — **had never executed**. Playwright's Chromium would not install on Node v26. Resolved by ADR-157: `npx playwright install chromium` now succeeds (Chrome Headless Shell 153, chromium-headless-shell v1243) and the suite runs. **It found a real bug on its first execution**: `.sitefooter-orgdesc` needed 539px of the 249px it had, from a German compound the demo fixture carried *on purpose* for an assertion that had never once run — 10 passed, 1 failed. `overflow-wrap` was set on the contact block and the links but not on the one element whose job is prose; it is now declared once at `.sitefooter` and inherited. The hero had no 320px test while the footer did, so the footer's overflow was findable and the hero's was not — both have it now. **12 tests, up from the 11 recorded here**, all passing.

---

## RESOLVED — DiagramEngine e2e suite did not run (2026-08-09, fixed 2026-08-10)

- [x] **DEBT-DE-1** All 67 tests in `tests/diagramengine.spec.ts` failed with `createDiagramEngine not found on window`. The spec navigated to `/docs/demo.html`, the component **gallery index**, which links to every component page and loads none of them; the bundle's `window.createDiagramEngine` assignment was present and correct all along. The suite had therefore been asserting nothing. Repointed at `/demo/components/diagramengine.html`, which loads the engine and builds a canvas, and given a readiness wait on the global rather than a bare selector. All 67 pass with **no engine changes** — nothing was broken behind the broken harness.

  Confirmed the suite has teeth by mutation rather than by trusting green: changing the built default-shape path (`shape: n.shape ?? "rectangle"` → `"ellipse"`) fails `addObject fills defaults` with the expected diff, and the bundle was restored byte-identical afterwards. A first mutation attempt hit two unrelated `shape:"rectangle"` literals and changed nothing — worth knowing that a passing mutation test can mean you mutated the wrong line.

---

## ACCEPTED DEBT — Visual Refresh 2026 (2026-09-09, ADR-147)

- [x] **DEBT-VR-1** 26 regions across 23 components painted themselves with `--theme-active-bg` — a tab strip, a kbd chip, a skipped step marker, a progress track — none of which respond to a pointer. ADR-147 D3 made the state layers translucent, so all 26 silently became translucent and began inheriting whatever sat behind them. Resolved by ADR-156: `--theme-fill-strong`, opaque, valued mid-range of what those sites previously composited to, so the visual change is near-invisible by design. **The count fell from the 38 estimated here to 26**: the sweep found 34 candidates and my own heuristic misclassified 8 of them, reading `-highlighted` / `-focused` / `-expanded` suffixes as static fills when a keyboard-highlighted row *is* an interaction state. Those eight were reverted. `--theme-fill-subtle` was created as the pair, ended with zero consumers, measured 1.022 against chrome, and was deleted rather than kept — an unused token that has already failed a visibility check is worse than no token. Fills were added to check [12]'s sweep, which immediately found four dark-mode failures (worst 3.98, a hovered row *on* a filled strip); a fill must leave headroom for a state layer above it. 60 composited pairs now checked per theme.
- [x] **DEBT-VR-2** *(resolved 2026-10-08, ADR-155)* — `scripts/check-elevation.py`, structure check `[14]`. Compares GEOMETRY and ALPHAS rather than bytes, since the layers legitimately spell the same colour differently; asserts Bootstrap's scale points at ours; and asserts `--bs-box-shadow*` is redefined in the dark block, which is exactly what ADR-151 found missing. Mutation-tested against both real historical drifts.
- [x] **DEBT-VR-3** *(closed 2026-10-09 — the unverified set is empty)* — the worry was "components not on a demo page were not individually eyeballed", which was never quantified. Quantified now: **12 of 125 components have no demo page** — `anchorlayout`, `borderlayout`, `boxlayout`, `cardlayout`, `flexgridlayout`, `flowlayout`, `gridlayout`, `helptooltip`, `layerlayout`, `logutility`, `markdownrenderer`, `themeinit`. **Eleven of the twelve declare no `border-radius` at all**, because they are layout managers and utilities with no visual chrome; `themeinit` has no stylesheet. The twelfth, `helptooltip`, has exactly one rule and it is `border-radius: 50%` — a hand-written circle for the "?" badge, not a token the suffix-keyed sweep could have touched. And `helptooltip` is rendered by `datepicker`, `durationpicker` and `diagramengine`, all of which *do* have demo pages, so it was eyeballed anyway. **Nothing the sweep applied went unverified.** The entry was right to exist and wrong about its size — two commands would have closed it at any point in the last month.
- [x] **DEBT-VR-4** *(closed 2026-10-09 — judged, keep 4px)* — put to the user with both states rendered at 3× in light and dark. Decision: **keep `$border-radius` (4px)**. The entry's premise does not survive looking at it: the 3-high mini stack it worried about is `background: transparent` at rest (`ribbon.scss` `.ribbon-qat-btn`), so there is no filled corner to read as soft until the control is hovered. Where the radius is actually visible — the font dropdown, the size spinner, the style buttons — 4px is what makes ribbon controls match the buttons and inputs beside them, which is the whole reason ADR-147 moved them off 0. **A radius on a transparent control is invisible, so "this may read soft" was a claim about a thing that is not drawn.**

## RESOLVED — Agent knowledge base was not machine-readable (2026-02/03, fixed 2026-09-09)

- [x] **DEBT-KB-1** `agentknowledge/history.jsonl` carried **three malformed lines** — 43, 58 and 104, dated 2026-02-20 and 2026-03-07 — that failed `json.loads`, so any agent parsing the file would fail on it. Undetected for roughly six months because **nothing ever parsed it**. Two distinct causes, both from writing JSON with shell text tools rather than a serializer: two entries were appended **without a trailing newline**, so the following append landed on the same line (`…"}{"date":…`), introduced in `9c9be2e`; and one carried `\!`, which is not a valid JSON escape and is the signature of **bash history-expansion escaping** leaking through a double-quoted append, introduced in `3020cd5`. Repaired by splitting the two joined lines and unescaping the one `\!` — 241 lines to 243, byte count +1 (two newlines added, one backslash removed), and a SHA-256 of both files with newlines and the escape normalised away is identical, so only framing changed and no content was lost. `test-local.sh` check [8] now parses `history.jsonl` and the three YAML files on every `npm test`, and was mutation-tested to confirm it fails on a corrupted file rather than merely passing on a good one. `AGENTS.md` now states the append rule explicitly.

## RESOLVED — Dependency vulnerabilities (2026-09-11)

- [x] **DEBT-SEC-1** 18 open advisories (11 high, 5 moderate, 2 low) across the build toolchain — postcss, undici, sharp, svgo, ws, nanoid, vite, wrangler, browserslist, immutable, miniflare, esbuild, yaml, vitest. All resolved; `npm audit` reports 0. No `--force` was needed and no semver-major upgrade was taken: `package.json` changed only `vitest` / `@vitest/coverage-v8` (`^4.1.3` → `^4.1.11`, the patch closing GHSA-82fw-gwwq-j7x9), and every other fix resolved transitively in the lockfile. **Exposure was build-time only** — this package declares no runtime dependencies, and the two libraries published to the CDN (`bootstrap.bundle.min.js`, `chart.umd.js`) are the vendors' own artifacts, not these packages. Build verified byte-reproducible afterwards: two consecutive `build:css` runs produce an identical `custom.css` hash.
- [x] **DEBT-SEC-2** The `undici` override was written `">=7.24.1"` — a floor with **no ceiling**. jsdom@29 requires `undici ^7.24.3`, so once undici 8 shipped the override silently resolved to it, jsdom's dispatcher could not load, and **all 142 test files failed to start while vitest reported "no tests"**. `npm run test:unit` does exit 1 in that state, so CI would catch it, but the console output reads like an empty project rather than a broken one. Pinned to `^7.24.3` with the reasoning written into `package.json` beside the override, because the next person to see a `>=` and a `^` will otherwise "simplify" one into the other.
- [ ] **DEBT-SEC-3** `sass` is held at **1.95.x** rather than current (1.104). The newer compiler changes the **shipped** stylesheet: colours inside SVG data URIs serialise as percentage `rgb()` instead of hex — `stroke='rgb(4.3921568627%, 19.7647058824%, 33.568627451%)'` where it used to be `stroke='%230b3255'` — and a few Bootstrap-derived values shift by one (`#172033` → `#172032`). The output was decoded and is **valid**, resolving to the same colour, and the change is cosmetically invisible in principle. It was still declined here: there is no security benefit, it adds ~94 bytes, and it introduces a CSS delta while the ADR-147 visual refresh is still under review. **Re-examined 2026-10-09 (ADR-157)**, because the original phrasing rested on "`npm audit` is already 0" and that premise had quietly expired — audit showed 5 advisories, and sass is one of five packages pulling `source-map-js`. It does not force the bump: `source-map-js` 1.2.2 patches the DoS and sass accepts `>=0.6.2 <2.0.0`, so an override clears the advisory with sass untouched at 1.95.1. The deferral stands on the CSS delta alone, which is the ground its own last sentence asked for. **A deferral justified by a measurement needs the measurement re-taken, not the conclusion re-read.** Note that **the caret does not hold it back** — `^1.95.1` admits 1.104, because minor 104 sorts above 95 — so only the committed lockfile pins it, and a fresh `npm install` with a regenerated lock would take 1.104. Upgrade deliberately, with the accordion and form-select icons eyeballed in both themes, rather than as a side-effect of a security pass.

  **Taken and reverted 2026-10-09 (ADR-158), by the user's decision, after measuring it rather than re-reading the entry.** sass 1.105.1 was installed, the CSS rebuilt and the full suite run: 28/28 structure checks and 4848 unit tests pass, and both chevrons render correctly in light and dark. The entry's two predictions held — +94 bytes exactly, and `#172033 → #172032` (plus a second it had not listed, `#a51d1d → #a51c1c`). Two things it got wrong, both found by measuring:

  - **"Resolving to the same colour" is very slightly too strong.** `rgb(4.3921568627%, 19.7647058824%, 33.568627451%)` decodes to (11, 50, **86**) where `%230b3255` is (11, 50, **85**). New sass keeps sub-integer precision that old sass rounded away at the hex step. Off by ≤1 per channel — invisible, but not identical.
  - **A regression the entry did not predict: the bump breaks `postcss-svgo`.** sass 1.105.1 emits `%3csvg` lowercase where 1.95.1 emitted `%3Csvg`, and svgo cannot parse it: `SvgoParserError: Non-whitespace before first tag`, three times, **zero with 1.95.1**. Those three data URIs therefore ship **unminified**. All three are the dark-mode accordion chevron (`[data-bs-theme=dark] .accordion-button::after` and `--bs-accordion-btn-active-icon`), which is exactly the icon this entry said to eyeball. The form-select chevron is untouched — it comes from Bootstrap precompiled and never passes through sass's colour serialiser.

  So the deferral stands, and now for a reason stronger than the original: the bump makes the shipped stylesheet **larger and less optimised**, with no security benefit (audit is 0 through the `source-map-js` override) and no functional gain. Reverted; `dist/css/custom.css` is byte-identical to before at `ede68299`. `package.json` keeps the floor raised to `^1.95.1`, which is where the lockfile already was and what this entry already documented. **Revisit when postcss-svgo handles lowercase percent-encoding**, not on a version number.

---

## RESOLVED — Fabricated reads after a failed initialise (2026-10-04, ADR-148)

- [x] **DEBT-FAB-1** Twelve sites across seven components answered a read after failing to initialise, returning a plausible value a host would persist over the user's own. Same shape as the apps-repo incident of 2026-10-03. All twelve closed; `npm test` check `[9]` now fails the build on the commonest shape, and the guard is mutation-tested. The two most dangerous were found by audit rather than by the bug reports: `DynamicFormSwitcher` (the aggregation point — fixing the five pickers without it would have accomplished nothing, since a picker's throw was caught there and reconverted into `undefined`), and `prompttemplatemanager`'s save path (a rejected save cleared the dirty marker and logged "Saved", so the user navigated away and lost the work).

## ACCEPTED DEBT — Fail-fast programme (2026-10-04, ADR-148)

- [x] **DEBT-FAB-2** The structure check saw **one shape**: named `create*/build*Null|Fallback|NoOp|Stub|Empty` factories exposing a read. It could not detect an inline failure branch returning an object literal, a `catch` returning a fabricated value, or an aggregation-point default like the deleted `fallbackDefault` — the single worst instance in the audit, found by hand. Resolved by ADR-157 with check `[16]` (`scripts/check-fabricated-reads.mjs`), which walks the **TypeScript AST** rather than matching text, because whether a `return` sits *inside* a catch is a structural question — the regex prototype answered it wrong 21 times out of 25. Mutation-tested by reinstating the real `fallbackDefault` (caught), an inline null-object in a guard (caught), and the same shape throwing instead (correctly passes). **Its first run was 7-for-7 false positives** from one over-broad word: `default` matched `defaultCompare`, a sort comparator returning 1/-1 for a null operand, which is a function doing its job. `default` is now excluded by name — `defaultX` means "the built-in implementation of X", `fallbackX` means "a value used when the real one is unavailable", and only the second is this gate's business. **Two residual boundaries**, neither firing on the current 137 sources: a class-property arrow (`fallbackDefault = () => …`) escapes the name-based branch because `enclosingName` only sees function and method declarations; and a `return` inside a callback arrow nested in a guard is attributed to that guard, because `failureContext` does not stop at arrow boundaries. The object-literal branch is unaffected by both.
- [x] **DEBT-SEC-4** *(first slice done 2026-10-04, ADR-149)* — `dompurify`, `maxgraph`, `signalr` and `cytoscape` now serve from `/lib/<name>-<version>.js`, immutable, with SRI hashes published at `/lib-manifest.json`. Closure is asserted from esbuild's metafile at build time; structure check `[10]` re-pairs every hash with its artifact. **The priority asset was itself vulnerable**: the apps' pinned DOMPurify 3.2.4 carries 19 open advisories including XSS bypasses, found only because vendoring put it under our `npm audit`. Served at 3.4.16. Remaining work is tracked as DEBT-SEC-5 and DEBT-SEC-6 below.
- [x] **DEBT-SEC-5** *(resolved 2026-10-04)* — the decision turned out not to be the apps team's at all. **They never instantiate vditor**; they use this library's `createMarkdownEditor`, which wraps it — so the unpkg fetches were ours to stop, and no consuming app changes. The whole `dist/` tree is served at `/lib/vditor-3.11.2/` (`types/` and `ts/` excluded, never fetched by a browser) and `MarkdownEditor` now sets vditor's `cdn` option to it, derived from the serving script's own origin so a fork or local build works too. Serving only the always-needed subset would have saved ~16 MB and broken silently the first time a user wrote a mermaid block. `lute`, vditor's markdown engine at 3.9 MB, is always needed, so the subset was never small anyway. A regression test asserts the `cdn` option is set and contains neither `unpkg` nor `jsdelivr`; it was mutation-tested by commenting the line out. **Known residual:** the lazily-injected chunks carry no SRI because vditor injects them itself — serving them removes third-party trust, which is most of the value, but vditor cannot reach the assurance the single-file assets have without patching it. Stated in `CDN_CONTRACT.md` and the integration guide rather than hidden.
- [x] **DEBT-SEC-6** *(resolved 2026-10-04)* — settled with measurement rather than opinion, which turned "a decision that is partly theirs" into an answer with evidence. **font-awesome**: 6.5.1 is served, and is a verified strict superset of all 92 `fa-` classes the apps use (it defines 2518), so the 7 pages on 6.4.0 can consolidate losing nothing. It is CSS + webfonts, so it ships as a versioned directory with the stylesheet hashed and the `@font-face` files not — acceptable for a font where it would not be for executable code. The stylesheet is byte-identical to the npm package, so provenance is verifiable by diff. **bootstrap-icons**: not vendored, because this origin already serves 1.13.1, a strict superset of every `bi-` class the apps use — the 30 pages on jsdelivr 1.11.3 should simply point at `/icons/`. **bootstrap**: 1 page on jsdelivr 5.3.3 against 3 already using ours at 5.3.8, a patch-level difference inside one minor. **chart.js**: moved to `/lib/chart.js-4.5.1.js`, with the unversioned `/vendor/chart.js/` path kept for existing consumers. Found on the way: three `bi-` classes used in the apps (`bi-bi-arrow-right`, `bi-folder-open`, `bi-trash-alt`) resolve in **neither** version and render nothing today — pre-existing defects, with the intended names recorded in `CDN_CONTRACT.md`.

## ACCEPTED DEBT — Surface tint (2026-10-06, ADR-150)

- [x] **DEBT-VR-5** *(resolved 2026-10-07)* — `scripts/check-contrast.py` runs as structure check `[12]`. It reads the **compiled** `dist/css/custom.css` rather than the Sass, asserts ladder ordering in both themes, the three on-screen adjacencies against a 1.07 floor, and every text-token-on-surface pair against the 4.5 AA floor. Mutation-tested on all four failure modes (broken ordering, collapsed adjacency, failed text AA, missing stylesheet). It prints measured values on success as well as failure, so a pair sitting a hundredth above the floor is visible *before* it fails. **It found a real gap on its first run**: `--theme-primary-text` on `sunken` measures 4.65, the tightest light pair — a combination never checked during ADR-150, which only measured that token against chrome and content. Left at 4.65 rather than darkened, because the token's single consumer (the TabbedPanel active label) sits on chrome at 5.49, and pushing it to `$blue-800` would read as navy rather than an accent; the gate now holds the line if that ever changes. *Residual (as of 2026-10-09, after DEBT-VR-5b and DEBT-VR-5c):* composited state layers and the group-bg pastels are now covered; what remains out of scope is the large-text exemption, which is declined on purpose, and the 73 component-level `rgba()` backgrounds of DEBT-VR-10. Treat a pass as "the named pairs are sound", not as an accessibility audit.
- [x] **DEBT-VR-5b** *(resolved 2026-10-07, ADR-151)* — the gate now composites every state layer over every surface and checks all text tokens against the result, 96 pairs per run, **strictly** rather than against a usage map (a map permits kinder values but goes stale silently when a component moves surfaces, and a stale map makes the gate confidently wrong). Closing it found **eight real AA failures in shipped CSS**, worst 3.69 — a toolbar button's own label on hover in dark mode, confirmed at `toolbar.scss:581`/`:586` where the muted colour and the state layer are set on the same element. 21 sites across the fleet pair a state layer with muted text. Fixed by moving three text tokens; the state layers are untouched. A layer that cannot be parsed now fails the gate rather than being skipped, because a skipped layer is a false pass.
- [x] **DEBT-VR-5c** *(resolved 2026-10-09, ADR-158)* — all three sub-items answered, two of them by **declining to build what the entry asked for**, with the measurement that justifies each.

  **The group-bg pastels are now checked, and this was the real gap.** Five tokens, one consumer, and the gate had never seen them. It is **curated, not strict** — the label is the only string drawn on them and it is always `--theme-text-secondary`. Sweeping all four text tokens instead fails today on `muted` at 3.86, a pair nothing renders and nothing can render, and the only way to clear it would be to lighten pastels that are already correct — the AGENT_INSIGHTS 6.19 trade exactly. **The `fill-opacity: 0.3` on the rect is load-bearing:** the token value is not the colour on screen, and in dark the token is itself `rgba(…,.18)`, so the two multiply to an effective 0.054. Modelling the token as painted reports 8.40 where the browser renders 9.74. Both pass, which is the kind of wrong that stays invisible until a pastel moves. Mutation-proven on the shape that actually shipped twice — lightening `--theme-text-secondary` to `#94a3b8` fails all five at 2.4 — and an unparseable token fails rather than skips. Honest limit, also established by mutation: raising a dark fill's alpha from `.18` to `.95` only moves 10.06 to 7.83 and does **not** fail, because `fill-opacity: 0.3` washes every fill toward its backdrop. It guards the label colour and the fill-opacity, not the pastels.

  **The two-layer case is not modelled, because the shape the entry imagined is not reachable.** `background-color` **replaces**; it does not stack. So `.datagrid-row-selected:hover` paints one colour, not hover-over-selected — the entry's own named example. Real stacking needs two *nested* elements both painting on one pointer event, which is possible because `:hover` matches ancestors too. A scan of the compiled component CSS turned up 17 candidate ancestor/descendant pairs; 16 were **the same element matched twice at different specificity**. The one genuine instance is `.tabbedpanel-tab-close` inside `.tabbedpanel-tab`, measuring **10.92 light / 8.08 dark**. Modelling it strictly was tried and rejected: layer over layer over every base fails **24 pairs in dark, worst 3.61**, for combinations nothing renders. Recorded with the margin, not as immunity — ignoring the nesting overstates by up to 1.59.

  **The large-text exemption is deliberately not modelled, and should stay that way.** It can only ever *relax* the gate, and no token here is heading-only, so there is nothing for it to rescue — adding it opens a false-pass channel with no true positive to justify it. The trigger is explicit: add it when a token becomes heading-only, not before. This stops being carried as debt.

  *Residual, as a new finding rather than this entry's:* DEBT-VR-10.
- [x] **DEBT-VR-5b-ORIG** *(closed 2026-10-09 as superseded, not fixed)* — stale. It asked for compositing coverage — "either a headless browser computing real backgrounds, or modelling the compositing in the checker against a declared list" — and **DEBT-VR-5b built the second, two days later and more strictly than this asked**, sweeping every layer over every surface rather than a declared list, precisely because a declared list goes stale silently. The entry then sat open describing a gap that no longer existed. Same failure as DEBT-WEB-1: the work closed the gap and nobody closed the record.
- [ ] **DEBT-VR-10** **73 component-level translucent backgrounds** that no theme token names, found while closing DEBT-VR-5c. `grep -n "background-color:\s*rgba(" components/*/*.scss` — `rgba($blue-100, 0.5)`, `rgba(var(--theme-primary-rgb), 0.12)`, `rgba($yellow-500, 0.12)` and so on. Each composites over whatever is beneath it, so each is a background colour **no check can see**: check `[12]` knows theme tokens, check `[13]` knows component palettes that carry text, and these are neither. Not all 73 are risks — many are modal backdrops and drop-zone scrims with no text on them — but some demonstrably sit under body text (`smarttextinput` highlights, `datagrid` selected rows, `actionitems`, `auditlogviewer`, `permissionmatrix`). **Not audited here, and deliberately not absorbed into DEBT-VR-5c**, whose scope was the three named sub-items. A permanent gate needs per-site knowledge of what text sits on what — the hard part is not the arithmetic, it is knowing which of the 73 have text above them, which is why this is its own item and not a one-line extension.
- [ ] **DEBT-VR-6** `sunken|ground` measures **1.040** in dark — below the 1.08 the other adjacencies clear. Deliberate (ADR-150 D3): wells sit inside content and never abut the page ground, so the pair does not occur on screen and tightening it would cost contrast on pairs that do. Recorded so it is not "fixed" by someone reading a contrast matrix without checking what touches what. If a layout ever does place a sunken surface directly on the page ground, this becomes real.

## ACCEPTED DEBT — Component-level colour literals (2026-10-07, ADR-152)

- [x] **DEBT-VR-7** *(resolved 2026-10-08, ADR-153)* — check `[13]` now covers component palettes. Closing it found **nine palettes across nine components** that could not carry their own text, worst 1.92 (white initials on `#eab308`), plus three components that set a background and let the foreground be inherited so it inverted in dark mode. Caller-supplied colours, which no build-time check can vet, now use a runtime `readableOn()`. Still open as DEBT-VR-9: chart and diagram palettes, where the requirement is series distinctness rather than text contrast.
- [x] **DEBT-VR-8** *(resolved 2026-10-08, ADR-153)* — `scripts/derive-colour.py` derives both shapes: `fit` darkens a palette entry hue-preserving until a fixed foreground clears the floor, `twin` produces a dark-mode counterpart of a light tint. Validated rather than assumed: `fit` reproduces all four hand-derived palette values exactly, and the four preset twins already shipped meet `twin`'s threshold, so nothing was churned. A developer tool — the gates verify the results, nothing imports it.
- [x] **DEBT-VR-9** *(resolved 2026-10-08, ADR-155)* — `scripts/check-series-palettes.py`, structure check `[15]`. Simulates protanopia, deuteranopia and tritanopia (Viénot-Brettel-Mollon) and compares every pair as a CIE76 ΔE in Lab. **Measured, nothing was broken**: all five palettes clear ΔE 10 under every deficiency, tightest `activityfeed` at 11.2 — the gate keeps that true rather than fixing something, which is the cheapest moment to add one. Proven by mutation with `#8a843c`, ΔE 72.3 from `#dc3545` normally and **0.3** under deuteranopia, i.e. invisible to anyone with typical vision. Does not discharge WCAG 1.4.1: colour must still not be the only channel.

## ACCEPTED DEBT — TenantSwitcher rename (2026-10-08, ADR-154)

- [ ] **DEBT-TS-1** Two CDN paths serve the same component. `/components/workspaceswitcher/` is a byte-identical copy of `/components/tenantswitcher/`, produced by the `copy:compat` build step, and the deprecated API surface (`createWorkspaceSwitcher`, `WorkspaceSwitcherOptions`, `setWorkspaces` / `setActiveWorkspace` / `getActiveWorkspace` / `addWorkspace` / `removeWorkspace`) forwards to the current one. The original note said **all of it comes out one release after 2026-10-08**, and `createWorkspaceSwitcher` warns on every call so the consuming app's console would show whether anyone was still on it.

  **The deadline is withdrawn and replaced by a condition (2026-10-09).** The user reports the apps team is heads-down on unrelated work and will not get to this soon. So: **the aliases come out one release after the consuming app stops calling them, and not before.** No date. A date here was always the wrong instrument — it measured our patience rather than their readiness, and this one expired with nobody watching. The trigger is checkable in one command, which is the point:

  ```
  grep -rn "createWorkspaceSwitcher\|setWorkspaces\|setActiveWorkspace" \
       ~/Work/knobby/apps/typescript/ --include="*.ts"
  ```

  When that returns nothing, the removal is safe and the recipe below applies. `createWorkspaceSwitcher` warns on every call, so their console says the same thing independently.

  **Checked on the original due date, 2026-10-09, and the removal did not happen. The consumer is still on the deprecated API.** `~/Work/knobby/apps/typescript/apps/shell/shell-tenants.ts` calls `window.createWorkspaceSwitcher` (lines 197, 203), `setWorkspaces` (224) and `setActiveWorkspace` (227, 338, 363) — live source, not a stale build — and `typescript/shared/types/component-library.d.ts` still declares the whole `WorkspaceSwitcher` surface. Deleting the aliases today reproduces the 2026-10-08 incident exactly. **The deadline needs renegotiating with the apps team, not enforcing.**

  The item also **splits in two, with different answers**, which the original phrasing hid by treating it as one deadline:

  - **The deprecated API surface is load-bearing.** It stays until the consumer migrates. This is the half that matters.
  - **The duplicate CDN path is already dead to the consumer.** `apps/frontend/index.html` loads `tenantswitcher.css` (195) and `tenantswitcher.js` (794); nothing under `~/Work` fetches the `workspaceswitcher` path any more. Note that the alias path and the alias *functions* are independent: the consumer gets `createWorkspaceSwitcher` out of `tenantswitcher.js`, so dropping the duplicate path does not touch the API.

  **And the recipe above is incomplete.** "Delete `copy:compat` from `package.json`" is one of four edits — the theme's own pages still reference the duplicate path: `demo/full-demo.html` (83, 4176), `demo/components/diagramengine.html` (405, 406), and three mapping tables in `scripts/extract-demos.py` (225, 336, 590). Check `[5]` would catch the demos; nothing would catch `extract-demos.py`. Left as a single item rather than split, because retiring the path before the API is churn for no gain.

  Closing out this check found collateral from the rename that nothing was looking for: `demo/components/workspaceshell.html` linked to `workspaceswitcher.html`, a page the rename had renamed away. Fixed, and check `[4]` now validates demo-to-demo links, not only the ones the index lists.

## RESOLVED — Three structure checks passed vacuously on macOS (2026-10-09, ADR-158)

- [x] **DEBT-GATE-1** *(resolved 2026-10-09)* — Checks `[4]`, `[5]` and `[6]` of `test-local.sh` **could not fail on the development machine.** Four loops drove their `for` lists from `grep -oP`, and BSD grep on macOS has no `-P`: grep aborted, the list came out empty, the body never ran, the error counter stayed at zero, and each check reported PASS. On CI's GNU grep they worked, so the suite was green in both places for opposite reasons. Two of the four carried `2>/dev/null`, which is why nobody ever saw the `invalid option -- P` that was being printed twice per run. Every pattern was plain enough for POSIX ERE, so the `-P` bought nothing; all four are now `-oE`, the stderr mask is gone, and **each of the three checks was mutation-proven to fail** — a missing demo page, a missing stylesheet reference, a missing component README — and to pass again once restored. Found by writing a *new* sibling-link check in the same block and mutation-testing it: the mutation failed as intended, and the grep error printed beside it. **The same family as the DiagramEngine suite that spent months green while pointed at a page that loaded nothing.**
