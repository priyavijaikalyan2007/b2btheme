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
- [x] **DEBT-VR-2** *(resolved 2026-10-08, ADR-155)* — `scripts/check-elevation.py`, structure check `[14]`. Compares GEOMETRY and ALPHAS rather than bytes, since the layers legitimately spell the same colour differently; asserts Bootstrap's scale points at ours; and asserts `--bs-box-shadow*` is redefined in the dark block, which is exactly what ADR-151 found missing. Mutation-tested against both real historical drifts.
- [ ] **DEBT-VR-3** The radius sweep was **suffix-keyed and applied by script** (163 rules across 46 components), reviewed as a dry run and verified by compiling plus browser spot-checks on the reported components. Components not on a demo page were not individually eyeballed. If a stray corner turns up on something that should be flush, it is from this sweep; the exclusion list and the role mapping are recorded in `specs/visual-refresh-2026.prd.md` §9.2.
- [ ] **DEBT-VR-4** Ribbon controls took `$border-radius` (4px) to match the buttons beside them. In the 3-high mini stack this may read soft; `$border-radius-sm` is a one-line change in `components/ribbon/ribbon.scss` if so. Flagged for judgement rather than decided.

## RESOLVED — Agent knowledge base was not machine-readable (2026-02/03, fixed 2026-09-09)

- [x] **DEBT-KB-1** `agentknowledge/history.jsonl` carried **three malformed lines** — 43, 58 and 104, dated 2026-02-20 and 2026-03-07 — that failed `json.loads`, so any agent parsing the file would fail on it. Undetected for roughly six months because **nothing ever parsed it**. Two distinct causes, both from writing JSON with shell text tools rather than a serializer: two entries were appended **without a trailing newline**, so the following append landed on the same line (`…"}{"date":…`), introduced in `9c9be2e`; and one carried `\!`, which is not a valid JSON escape and is the signature of **bash history-expansion escaping** leaking through a double-quoted append, introduced in `3020cd5`. Repaired by splitting the two joined lines and unescaping the one `\!` — 241 lines to 243, byte count +1 (two newlines added, one backslash removed), and a SHA-256 of both files with newlines and the escape normalised away is identical, so only framing changed and no content was lost. `test-local.sh` check [8] now parses `history.jsonl` and the three YAML files on every `npm test`, and was mutation-tested to confirm it fails on a corrupted file rather than merely passing on a good one. `AGENTS.md` now states the append rule explicitly.

## RESOLVED — Dependency vulnerabilities (2026-09-11)

- [x] **DEBT-SEC-1** 18 open advisories (11 high, 5 moderate, 2 low) across the build toolchain — postcss, undici, sharp, svgo, ws, nanoid, vite, wrangler, browserslist, immutable, miniflare, esbuild, yaml, vitest. All resolved; `npm audit` reports 0. No `--force` was needed and no semver-major upgrade was taken: `package.json` changed only `vitest` / `@vitest/coverage-v8` (`^4.1.3` → `^4.1.11`, the patch closing GHSA-82fw-gwwq-j7x9), and every other fix resolved transitively in the lockfile. **Exposure was build-time only** — this package declares no runtime dependencies, and the two libraries published to the CDN (`bootstrap.bundle.min.js`, `chart.umd.js`) are the vendors' own artifacts, not these packages. Build verified byte-reproducible afterwards: two consecutive `build:css` runs produce an identical `custom.css` hash.
- [x] **DEBT-SEC-2** The `undici` override was written `">=7.24.1"` — a floor with **no ceiling**. jsdom@29 requires `undici ^7.24.3`, so once undici 8 shipped the override silently resolved to it, jsdom's dispatcher could not load, and **all 142 test files failed to start while vitest reported "no tests"**. `npm run test:unit` does exit 1 in that state, so CI would catch it, but the console output reads like an empty project rather than a broken one. Pinned to `^7.24.3` with the reasoning written into `package.json` beside the override, because the next person to see a `>=` and a `^` will otherwise "simplify" one into the other.
- [ ] **DEBT-SEC-3** `sass` is held at **1.95.x** rather than current (1.104). The newer compiler changes the **shipped** stylesheet: colours inside SVG data URIs serialise as percentage `rgb()` instead of hex — `stroke='rgb(4.3921568627%, 19.7647058824%, 33.568627451%)'` where it used to be `stroke='%230b3255'` — and a few Bootstrap-derived values shift by one (`#172033` → `#172032`). The output was decoded and is **valid**, resolving to the same colour, and the change is cosmetically invisible in principle. It was still declined here: there is no security benefit (`npm audit` is already 0), it adds ~94 bytes, and it introduces a CSS delta while the ADR-147 visual refresh is still under review. Note that **the caret does not hold it back** — `^1.95.1` admits 1.104, because minor 104 sorts above 95 — so only the committed lockfile pins it, and a fresh `npm install` with a regenerated lock would take 1.104. Upgrade deliberately, with the accordion and form-select icons eyeballed in both themes, rather than as a side-effect of a security pass.

---

## RESOLVED — Fabricated reads after a failed initialise (2026-10-04, ADR-148)

- [x] **DEBT-FAB-1** Twelve sites across seven components answered a read after failing to initialise, returning a plausible value a host would persist over the user's own. Same shape as the apps-repo incident of 2026-10-03. All twelve closed; `npm test` check `[9]` now fails the build on the commonest shape, and the guard is mutation-tested. The two most dangerous were found by audit rather than by the bug reports: `DynamicFormSwitcher` (the aggregation point — fixing the five pickers without it would have accomplished nothing, since a picker's throw was caught there and reconverted into `undefined`), and `prompttemplatemanager`'s save path (a rejected save cleared the dirty marker and logged "Saved", so the user navigated away and lost the work).

## ACCEPTED DEBT — Fail-fast programme (2026-10-04, ADR-148)

- [ ] **DEBT-FAB-2** The structure check sees **one shape**: named `create*/build*Null|Fallback|NoOp|Stub|Empty` factories exposing a read. It does not detect an inline failure branch returning an object literal, a `catch` that returns a fabricated value, or an aggregation-point default like the deleted `fallbackDefault` — which was the single worst instance in the audit and was found by hand. A regex pass over `catch` blocks was prototyped and produced 25 hits of which roughly four were real; it was dropped rather than shipped, because a noisy gate trains everyone to ignore it. Closing this properly needs type-level work (a `Result`-shaped return, or an ESLint rule with real scope analysis), not a better regex.
- [x] **DEBT-SEC-4** *(first slice done 2026-10-04, ADR-149)* — `dompurify`, `maxgraph`, `signalr` and `cytoscape` now serve from `/lib/<name>-<version>.js`, immutable, with SRI hashes published at `/lib-manifest.json`. Closure is asserted from esbuild's metafile at build time; structure check `[10]` re-pairs every hash with its artifact. **The priority asset was itself vulnerable**: the apps' pinned DOMPurify 3.2.4 carries 19 open advisories including XSS bypasses, found only because vendoring put it under our `npm audit`. Served at 3.4.16. Remaining work is tracked as DEBT-SEC-5 and DEBT-SEC-6 below.
- [x] **DEBT-SEC-5** *(resolved 2026-10-04)* — the decision turned out not to be the apps team's at all. **They never instantiate vditor**; they use this library's `createMarkdownEditor`, which wraps it — so the unpkg fetches were ours to stop, and no consuming app changes. The whole `dist/` tree is served at `/lib/vditor-3.11.2/` (`types/` and `ts/` excluded, never fetched by a browser) and `MarkdownEditor` now sets vditor's `cdn` option to it, derived from the serving script's own origin so a fork or local build works too. Serving only the always-needed subset would have saved ~16 MB and broken silently the first time a user wrote a mermaid block. `lute`, vditor's markdown engine at 3.9 MB, is always needed, so the subset was never small anyway. A regression test asserts the `cdn` option is set and contains neither `unpkg` nor `jsdelivr`; it was mutation-tested by commenting the line out. **Known residual:** the lazily-injected chunks carry no SRI because vditor injects them itself — serving them removes third-party trust, which is most of the value, but vditor cannot reach the assurance the single-file assets have without patching it. Stated in `CDN_CONTRACT.md` and the integration guide rather than hidden.
- [x] **DEBT-SEC-6** *(resolved 2026-10-04)* — settled with measurement rather than opinion, which turned "a decision that is partly theirs" into an answer with evidence. **font-awesome**: 6.5.1 is served, and is a verified strict superset of all 92 `fa-` classes the apps use (it defines 2518), so the 7 pages on 6.4.0 can consolidate losing nothing. It is CSS + webfonts, so it ships as a versioned directory with the stylesheet hashed and the `@font-face` files not — acceptable for a font where it would not be for executable code. The stylesheet is byte-identical to the npm package, so provenance is verifiable by diff. **bootstrap-icons**: not vendored, because this origin already serves 1.13.1, a strict superset of every `bi-` class the apps use — the 30 pages on jsdelivr 1.11.3 should simply point at `/icons/`. **bootstrap**: 1 page on jsdelivr 5.3.3 against 3 already using ours at 5.3.8, a patch-level difference inside one minor. **chart.js**: moved to `/lib/chart.js-4.5.1.js`, with the unversioned `/vendor/chart.js/` path kept for existing consumers. Found on the way: three `bi-` classes used in the apps (`bi-bi-arrow-right`, `bi-folder-open`, `bi-trash-alt`) resolve in **neither** version and render nothing today — pre-existing defects, with the intended names recorded in `CDN_CONTRACT.md`.

## ACCEPTED DEBT — Surface tint (2026-10-06, ADR-150)

- [x] **DEBT-VR-5** *(resolved 2026-10-07)* — `scripts/check-contrast.py` runs as structure check `[12]`. It reads the **compiled** `dist/css/custom.css` rather than the Sass, asserts ladder ordering in both themes, the three on-screen adjacencies against a 1.07 floor, and every text-token-on-surface pair against the 4.5 AA floor. Mutation-tested on all four failure modes (broken ordering, collapsed adjacency, failed text AA, missing stylesheet). It prints measured values on success as well as failure, so a pair sitting a hundredth above the floor is visible *before* it fails. **It found a real gap on its first run**: `--theme-primary-text` on `sunken` measures 4.65, the tightest light pair — a combination never checked during ADR-150, which only measured that token against chrome and content. Left at 4.65 rather than darkened, because the token's single consumer (the TabbedPanel active label) sits on chrome at 5.49, and pushing it to `$blue-800` would read as navy rather than an accent; the gate now holds the line if that ever changes. *Residual:* the check cannot see composited colours — a translucent state layer over a tinted surface resolves to a colour no token names — nor WCAG's large-text exemption. Treat a pass as "the named pairs are sound", not as an accessibility audit.
- [x] **DEBT-VR-5b** *(resolved 2026-10-07, ADR-151)* — the gate now composites every state layer over every surface and checks all text tokens against the result, 96 pairs per run, **strictly** rather than against a usage map (a map permits kinder values but goes stale silently when a component moves surfaces, and a stale map makes the gate confidently wrong). Closing it found **eight real AA failures in shipped CSS**, worst 3.69 — a toolbar button's own label on hover in dark mode, confirmed at `toolbar.scss:581`/`:586` where the muted colour and the state layer are set on the same element. 21 sites across the fleet pair a state layer with muted text. Fixed by moving three text tokens; the state layers are untouched. A layer that cannot be parsed now fails the gate rather than being skipped, because a skipped layer is a false pass.
- [ ] **DEBT-VR-5c** The gate models **one** layer over **one** surface. It does not model a layer over a *selected* row (two layers composited), nor WCAG's large-text exemption (3.0 at ≥24px), nor text over the `--theme-group-bg-*` pastels used by graph namespaces. The two-layer case is the one most likely to be real: a hovered row inside a selected group would composite `hover` over `selected` over a surface. Nothing currently does it, which is why it is debt rather than a bug.
- [ ] **DEBT-VR-5b-ORIG** The contrast gate does not cover **composited** pairs. `--theme-hover-bg` and `--theme-active-bg` are translucent (ADR-147 D3), so text over a hovered row resolves against a colour that exists in no token and cannot be read from the stylesheet. Covering it needs either a headless browser computing real backgrounds, or modelling the compositing in the checker against a declared list of "this layer is used over these surfaces". The second is tractable and is the better next step.
- [ ] **DEBT-VR-6** `sunken|ground` measures **1.040** in dark — below the 1.08 the other adjacencies clear. Deliberate (ADR-150 D3): wells sit inside content and never abut the page ground, so the pair does not occur on screen and tightening it would cost contrast on pairs that do. Recorded so it is not "fixed" by someone reading a contrast matrix without checking what touches what. If a layout ever does place a sunken surface directly on the page ground, this becomes real.

## ACCEPTED DEBT — Component-level colour literals (2026-10-07, ADR-152)

- [x] **DEBT-VR-7** *(resolved 2026-10-08, ADR-153)* — check `[13]` now covers component palettes. Closing it found **nine palettes across nine components** that could not carry their own text, worst 1.92 (white initials on `#eab308`), plus three components that set a background and let the foreground be inherited so it inverted in dark mode. Caller-supplied colours, which no build-time check can vet, now use a runtime `readableOn()`. Still open as DEBT-VR-9: chart and diagram palettes, where the requirement is series distinctness rather than text contrast.
- [x] **DEBT-VR-8** *(resolved 2026-10-08, ADR-153)* — `scripts/derive-colour.py` derives both shapes: `fit` darkens a palette entry hue-preserving until a fixed foreground clears the floor, `twin` produces a dark-mode counterpart of a light tint. Validated rather than assumed: `fit` reproduces all four hand-derived palette values exactly, and the four preset twins already shipped meet `twin`'s threshold, so nothing was churned. A developer tool — the gates verify the results, nothing imports it.
- [x] **DEBT-VR-9** *(resolved 2026-10-08, ADR-155)* — `scripts/check-series-palettes.py`, structure check `[15]`. Simulates protanopia, deuteranopia and tritanopia (Viénot-Brettel-Mollon) and compares every pair as a CIE76 ΔE in Lab. **Measured, nothing was broken**: all five palettes clear ΔE 10 under every deficiency, tightest `activityfeed` at 11.2 — the gate keeps that true rather than fixing something, which is the cheapest moment to add one. Proven by mutation with `#8a843c`, ΔE 72.3 from `#dc3545` normally and **0.3** under deuteranopia, i.e. invisible to anyone with typical vision. Does not discharge WCAG 1.4.1: colour must still not be the only channel.

## ACCEPTED DEBT — TenantSwitcher rename (2026-10-08, ADR-154)

- [ ] **DEBT-TS-1** Two CDN paths serve the same component. `/components/workspaceswitcher/` is a byte-identical copy of `/components/tenantswitcher/`, produced by the `copy:compat` build step, and the deprecated API surface (`createWorkspaceSwitcher`, `WorkspaceSwitcherOptions`, `setWorkspaces` / `setActiveWorkspace` / `getActiveWorkspace` / `addWorkspace` / `removeWorkspace`) forwards to the current one. **All of it comes out one release after 2026-10-08.** Removal is three things: delete `copy:compat` from `package.json`, delete the "DEPRECATED ALIASES" block and the legacy methods from `tenantswitcher.ts`, and delete the `deprecatedWorkspaceNames` test block. `createWorkspaceSwitcher` warns on every call, so the consuming app's console shows whether anyone is still on it before the removal lands.
