# Codebase Audit — Issue Tracker

> **Created:** 2026-03-19
> **Purpose:** Tracks all issues found during the codebase audit. Organized by severity and category. Check off items as they are resolved.
> **Convention:** Each fix should reference the commit hash that resolves it.

---

## CRITICAL — Security

These issues involve potential XSS or script injection vectors and must be addressed before any public-facing deployment.

**All three are closed as of 12 October 2026.** One was a defect with a fix (SEC-3), one was a defect whose prescription was wrong but whose mechanism was real (SEC-2), and one was never a defect (SEC-1). Two of the three had a test block named after them that tested something else.

- [x] **SEC-1** *(closed 2026-10-11, ADR-164 — never a defect)* — `components/richtextinput/richtextinput.ts:1407` was **inside the component's own sanitizer**, and the flagged statement was a `return temp.innerHTML` on a detached element. Reading `innerHTML` is a getter and executes nothing. The sanitizer has been there since the component's first commit, `0f2d32a`: `git log -S sanitizeHtml` returns that commit and no other. The write path at `:321` is `this.editableEl.innerHTML = this.sanitizeHtml(html)`, and `sanitizeHtml` works from an allowlist (`PASTE_ALLOWED_TAGS`), copies nodes recursively, and restricts link protocols to `http:`, `https:` and `mailto:`. I verified the audit's own view of the file by reading `f3c1666`, the last commit before 20 March 2026: line 1407 was the `sanitizeNodes` declaration. **No fix was needed and none was made.** The entry described a measurement, not the code.

- [x] **SEC-2** *(resolved 2026-10-12, ADR-165)* — `stripHtmlTags` now parses in an **inert `<template>`** instead of a detached `<div>`. A template's content belongs to a document with no browsing context, so a browser starts no request and runs no event handler. The entry's prescription, "replace with `textContent`", could not be followed as written: the function already read `textContent`, and the defect was in the assignment on the line above it.

  **Location re-measured 2026-10-11:** the line moved from 1841 to 1825, and the function is `stripHtmlTags`. The defect reproduced. Severity is lower than the original entry implies, because `innerHTML` runs no `<script>` element — on a detached node or an attached one, so detachment was not the protection it looked like — but a browser still starts an image load and fires `onerror`. A Chromium characterisation test proves exactly that: the old implementation, run byte for byte on `<img src="/does-not-exist-sec2.png" onerror="…">Desc`, extracts the right text **and** makes one request **and** sets the global, with the element detached the whole time.

  **Reached from two places, neither of them the label path.** `stripHtmlTags` is called only from the `renderView` of the `richtextinput` and `markdowneditor` field adapters, so the input is a stored field value shown in the read-only popover. Every other `innerHTML` in the file is `= ""`, which clears. Node labels never touch it — they reach the SVG through `textContent`.

  **The test block named after this defect never reached the function.** `spinemap.test.ts` carried a section header reading `SEC-2: stripHtmlTags — XSS PREVENTION` and a describe block of the same name, with six tests. All six set a node **label** or **description** and then searched the SVG canvas for injected elements. That is a real property of a different code path. **Measured before the fix:** reducing `stripHtmlTags` to `return html` — no extraction at all — left all **50** tests in the file passing. The six are kept, because what they check is true and worth checking, under a name that says what it is. One of them, `nestedXssPayload_StrippedFromDescription`, asserted only that the node was not null and carried a comment claiming descriptions go through `stripHtmlTags`, which they do not. It now asserts the description is stored verbatim and that no element from the payload exists.

  **A dead helper went with it.** `getNodeGroups` queried `[role='button'][data-node-id]` while the component writes `data-id`, so it could only ever return an empty list. It had no callers.

  **Twenty-five new tests drive the real path** — a `richtextinput` field whose metadata value is hostile, a click on the node, and the rendered popover value. Twenty-one inputs are compared against the old implementation's output and all twenty-one match, which is the evidence that the fix moved where parsing happens without changing what consumers see. `return html` kills 23 of the 25. The two survivors are honest: one feeds `plain text`, which is its own output, and one feeds the empty string, where the field is skipped before the adapter runs.

  **The inertness assertion needed a real engine, so it lives in `tests/spinemap-inert-parse.spec.ts`.** jsdom starts no image load and runs no handler, so restoring the detached `<div>` in the source leaves **all 75** unit tests passing. The browser spec counts requests for the payload's image, which needs no timing assumption — the old path makes one, the new path makes none — and carries a positive control in the same page, a second payload parsed through `div.innerHTML`, so a wait that was too short fails the control instead of passing the assertion. Mutating the **built bundle** back to the detached `<div>` fails the fix test on the handler assertion and leaves the characterisation test passing.

  **One behaviour is unchanged on purpose.** `textContent` includes the text of a `<script>` or `<style>` element, so the body of one appears in the extracted value. That was true of the old code. Output parity was the point of the fix, so it is recorded rather than changed.

- [x] **SEC-3** *(resolved 2026-10-11, ADR-164)* — the PlantUML reply is now **loaded as an image and never parsed as markup**. `applyPlantUmlDiagram` puts the SVG into a base64 data URL and sets it as the source of an `img` element, because a browser runs no script in an SVG that it loads as an image. That removes the class of defect rather than a list of vectors, which sanitizing would not: the file's `sanitize()` works from a list of forbidden things and does not cover `<use>`, `<animate>`, `<set>`, `<foreignObject>` or `<style>`.

  **The entry's mechanism was half wrong, and the correct half is the one that mattered.** `innerHTML` does not execute a `<script>` element. It does attach event-handler attributes, so `<image href="/missing" onerror="…">` ran immediately. The line had also moved from 448 to 461.

  **The test block named after this defect never tested it.** `markdownrenderer.test.ts` carried a section header reading `SEC-3: PLANTUML SVG SANITIZATION` and a describe block of the same name. Its three tests checked `sanitize()` against SVG-shaped **markdown**, which is a different input from a server reply. A comment recorded the reason as `CompressionStream + fetch (unavailable in jsdom)`, and both exist in this environment. The one missing web API is `Blob.prototype.stream`, which the new tests supply from Node, so the real asynchronous path was always testable. Five tests now drive it through a stubbed `fetch`, including a hostile reply, and five source mutations confirm they can fail: parsing the reply again, dropping the UTF-8 step before `btoa`, renaming the hidden class, emptying the alt text, and switching to percent-encoding.

  **Two assertions needed a real engine, so they live in `tests/markdown-diagrams.spec.ts`.** jsdom loads no image, so `naturalWidth` is always 0 and a data URL the browser refused would still look correct there. jsdom also runs no handler from an image load, so "the handler did not fire" passes whether or not the markup was parsed. The browser spec stubs the PlantUML route with an SVG carrying both an `onerror` attribute and a `<script>` element, then asserts the diagram decodes, has a visible box, and set no global. A second test characterises the defect in the same engine: the identical reply assigned to `innerHTML` sets the global to **1**, the value from the `onerror` attribute rather than the 2 from the script element, which is the evidence that `innerHTML` runs no script element and does fire a handler. Mutating the built bundle back to `innerHTML = svg` fails the first test and leaves the second passing.

  **Cost to consumers, stated in the README:** text inside a PlantUML diagram is no longer selectable, a link inside one no longer works, and CSS targeting the inner `svg` no longer reaches it. The diagram source stays in `data-source` and in a visually hidden `pre` that `aria-describedby` points at. Mermaid and Graphviz are unaffected, because both render locally from author-written source and neither inserts a markup string.

- [ ] **DEBT-SEC-5** Five third-party browser libraries are read from
  `window` but are not vendored into `dist/lib`, so the host page chooses the
  build and this repository applies no SRI to it: **highlight.js, KaTeX,
  Mermaid, @viz-js/viz and CodeMirror 6**. `scripts/vendor-closure.mjs`
  vendors seven assets with a published hash, and these five sit outside that
  guarantee. `components/markdownrenderer/README.md` names a jsdelivr build
  for each of the first four.

  This surfaced during WIN-2, because these are exactly the globals no
  declaration of ours can own, and CodeMirror 6 is the reason
  `components/codeeditor/codeeditor.ts` keeps one of the six remaining
  assertions. **Vendoring them would not remove that assertion** — codeeditor
  probes about thirty names and asks for alternatives when the first spelling
  is absent — so this is a supply-chain question in the shape of DEBT-SEC-4,
  not a continuation of WIN-2. Decide whether the SRI guarantee should cover
  them, and if so whether the optional renderers stay optional.

---

## CRITICAL — Standards

These violate mandatory project conventions (`export` keyword requirement per MEMORY.md, TypeScript module pattern) and cause build fragility.

- [x] **STD-1** Opened as a standards violation. **It was not one, and the
  defect underneath it was worse.** Closed 2026-10-15. ADR-177.

  The original entry said that `components/diagramengine/diagramengine.ts`
  has no `export` keywords, and called this "the single largest standards
  violation in the repository". The observation was correct. The diagnosis
  was wrong twice over. The file is **generated**, and
  `scripts/bundle-diagramengine.sh` deleted the keywords on purpose with
  `s/^export //g`. The stated mechanism, that "tsc treats files as
  scripts", was false for this file, because the script re-added one export
  and that alone makes it a module.

  **The real defect was in the published type surface.** The strip ran
  before tsc, so the compiler wrote `.d.ts` from a source with one export.
  `dist/components/diagramengine/diagramengine.d.ts` was 2,169 lines long
  and published one usable name:

  ```ts
  export declare function createDiagramEngine(
      container: string | HTMLElement,
      options?: DiagramEngineOptions): DiagramEngineImpl;
  export {};
  ```

  `DiagramEngineOptions` and `DiagramEngineImpl` were both in that file and
  neither was exported. A consumer could call the factory and could not
  name its argument or its result. This is not academic.
  `docs/APPS_TEAM_USAGE_GUIDE.md` step 3 instructs the apps team to
  type-check against the published `.d.ts`. For scale, breadcrumb published
  5 names, treeview 13, and toolbar 31.

  **This is DEBT-DOC-1 again** (ADR-166, "the published API list for every
  component was fiction"), in the one component large enough to need its
  types most. That pass fixed the generator that invented names. It did not
  ask whether a component could publish too few.

  The fix is six characters of build script. `wrap-iife.sh` already strips
  every export keyword from the emitted JS, and `build:ts` runs it before
  `minify-js.sh`, so the browser never saw them. Dropping the strip costs
  the bundle nothing:

  | | before | after |
  |---|---|---|
  | `diagramengine.ts` exports | 1 | 138 |
  | published `.d.ts` exports | 1 | 138 |
  | names in `AGENT_QUICK_REF.md` | 1,336 | 1,473 |
  | unused locals (TS6133) | 421 | 414 |
  | `.js` bundles changed | — | **0 of 126** |

  **Verified by emit.** All 126 bundles are byte-identical to the versions
  built before the change, which is the proof that a type-only change was
  type-only.

  `DiagramEngineImpl` is exported as well, because the factory returns it.
  The class is already public at run time as `window.DiagramEngine`, so
  this publishes nothing that was private. It stays the implementation type
  rather than a handle interface, and that single case is now recorded
  under PAT-1.

  **Nothing in this repository could see this defect.** Every tracked count
  is a ceiling on something unwanted, and a missing export is an absence.
  `scripts/audit-counts.mjs` gains a **`FLOORS`** table for counts that
  must not fall, holding `diagramengineBundleExports` at 138. It is
  mutation-proven: with the strip restored the count reads 0 and the check
  fails.

- [x] **STD-2** Opened as twelve files missing `export` on their primary
  classes. **Every one of them is correct as written.** Closed 2026-10-15.
  ADR-177.

  Each named class sits behind a factory function. Measured 2026-10-15,
  all ten files that exist export their options type, their handle type and
  their factory. Only the implementation class is private, and a consumer
  never names it. FormDialog looks like an exception in a grep because its
  handle is called `FormDialog` rather than `FormDialogHandle`, and it is
  exported.

  | file | class exported | Options | Handle | factory | published names |
  |---|---|---|---|---|---|
  | notificationcenter | no | yes | yes | yes | 5 |
  | breadcrumb | no | yes | yes | yes | 5 |
  | stepper | no | yes | yes | yes | 5 |
  | propertyinspector | no | yes | yes | yes | 6 |
  | guidedtour | no | yes | yes | yes | 4 |
  | helptooltip | no | yes | yes | yes | 5 |
  | slider | no | yes | yes | yes | 3 |
  | formdialog | no | yes | yes (`FormDialog`) | yes | 8 |
  | helpdrawer | no | yes | yes | yes | 5 |
  | docviewer | no | yes | yes | yes | 4 |

  Exporting these classes would publish an implementation detail, which is
  the opposite of what **PAT-1 asks for in this same document**. The entry
  asked us to undo the pattern another entry asks us to adopt.

  The count was wrong too. The repository has **53** unexported classes,
  not twelve. Exactly one causes a real problem, and it is
  `createDiagramEngine`, which returns the private class
  `DiagramEngineImpl`. That case moved to PAT-1 and is fixed for now by
  exporting the class.

  The convention the entry cites does not say what the entry says. As
  written in `CONVERSATION.md:1251` and `specs/navrail.prd.md:395` the rule
  covers ***public*** types. AGENTS.md states no export rule at all, and
  STD-1 cited `MEMORY.md`, which this repository does not contain.

  The original list follows, for the record:
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

Per the March 2026 audit, the required pattern was
`(window as unknown as Record<string, unknown>)`. **ADR-171 D2 superseded that
on 2026-10-13.** A window global is declared in `components/globals.d.ts` and
reached without any cast. The double-cast form returns `unknown` and so forces
a second cast on the value, which buys no type safety over `any`. A
declaration buys real type safety, and it buys it once for the whole library.

- [x] **WIN-1** `(window as any)` used instead of a declared global. **Closed
  2026-10-14 at 0 occurrences in 0 files**, from 294 on 186 lines in 113 files.
  Verified by `scripts/audit-counts.mjs` and by an identity mutation that
  reintroduces one cast and fails three counts.

  **Phase A, 2026-10-14.** The LogUtility preamble carried 220 of the 294
  occurrences, two per line, on 112 lines in 110 files. Every one of those
  lines was textually identical. The preamble was also 148 characters wide
  against the 120-character limit in AGENTS.md, and dropping the casts alone
  would have left it at 130, so it was reflowed to the three-line shape
  FRONTEND_LOGGING.md section 1 prescribes and 108 lines came inside the limit.
  All 126 compiled bundles were byte-identical before and after.

  **Phase B, 2026-10-14.** The remaining 74: 66 publication sites where a
  component writes its own API to `window`, 7 reads, and 1 comment.
  `components/globals.d.ts` grew from 2 declarations to 70. 125 of 126 bundles
  byte-identical, and the one that differs held `const w = window` as a local
  alias, now gone.

  **Two things phase B found before it broke them.** `extractGlobals` in
  `scripts/generate-docs.js` matched a cast by its parentheses and a bare
  `window` by dot access only, so removing the cast from
  `(window as any)["Toolbar"] = Toolbar` left a line neither rule could see.
  Measured by reverting the fix and regenerating: **14 components report
  `Globals: none` and 38 published names vanish** from
  `docs/AGENT_QUICK_REF.md`, and check `[19]` passes throughout, because it
  verifies that published names exist and cannot see a name that stopped being
  published. Separately, the quick reference advertised `__sidebarManager()`,
  `__tabbedPanelManager()` and `__navRailManager()` as callable API. They are
  singletons written to `window` for debugging. They stay declared, because
  they are there at run time, and they are no longer published as API.

  **Phase A was incomplete and said otherwise.** It migrated every file
  matching `(window as any).createLogUtility`, which is one spelling. Six
  components reached the same global through four other spellings, and
  `components/logutility/logutility.ts` published `createLogUtility` through a
  double cast, so the producer of the typed contract was not using it. All
  seven are converted in phase B and the lookup now has one form library-wide.

  **A correction to this entry's own inventory.** It named `MathfieldElement`
  among the remaining third-party globals. All 3 of its casts are in
  `components/latexeditor/latexeditor.test.ts`, and the counted file set
  excludes tests, so it was never part of the 294.

  **A correction to this entry's own previous figure.** It read "311
  occurrences on 203 lines" on 2026-10-12. The file count of 113 was right and
  both other numbers were not. No file set in this repository yields 311 or
  203, the code containing these casts is byte-identical at every commit from
  `4daccb4` to 2026-10-13, and the counting command was never written down, so
  the error cannot be traced further. That is the whole argument for check
  `[20]`: a count whose file set and pattern are not stated in code is not a
  measurement.

- [x] **WIN-2** The library asserted on `window` in four spellings, and WIN-1
  counted one of them. **Opened at 237 occurrences on 2026-10-14 and closed
  the same day at 6**, gated by `windowCasts`. ADR-174.

  **The count was 237 and the surface was 310.** Scoping the conversion found
  a second blind spot in the gate that had just been built. A file that writes

  ```typescript
  const win = window as unknown as Record<string, unknown>;
  win["createFormDialog"] = createFormDialog;
  const f = win["createPeoplePicker"];
  ```

  spends ONE occurrence of the counted pattern and then reaches `window`
  untyped as often as it likes. Measured: **42 alias declarations carrying 73
  accesses, so the gate saw 42 of 115.** This is insight 6.61 one level
  further out and the second instance in two days. `windowAliasDecls` and
  `windowAliasUses` were added and baselined before any source file moved,
  and `windowCasts` was widened to `globalThis as` in the same commit.

  **253 declarations became 268 in one central `components/globals.d.ts`**,
  covering 187 publication sites across 102 files. The third-party globals
  decided the shape: nothing here publishes `Chart`, `katex` or `dagre`, so a
  `declare global` beside each publisher has nowhere to put them. The file is
  build-time only. It is not emitted to `dist/`, `package.json` declares no
  `types` entry, and no generated component `.d.ts` refers to it, so a
  consumer still loads one `<script>` per component and imports nothing extra.

  **Six assertions remain, and the list is the allowlist.** Each reaches
  `window` by a name known only at run time, so no declaration can replace it.
  ADR-174 D3 names all six by file and line. The compiler states the boundary:
  indexing `window` by a `string` is TS7015, and `Window` is not assignable to
  `Record<string, unknown>` without an assertion, which is TS2322. A baseline
  of 6 gates the total and says nothing about the composition, so a seventh
  assertion fails and a replacement for a listed one does not. Read the list.

  **A correction to the claim this item was opened with.** This entry and
  ADR-173 both said a lookup by a computed key "cannot be expressed by a
  declaration at all". Of the eleven such sites, **five take their key from a
  closed set the module owns and are now typed** — `GLOBAL_FLAGS` marked
  `as const`, `STANDARD_FACTORY_MAP` carrying `keyof Window`, and
  markdownrenderer's five library names as a union. Six take it from host
  data and are not typeable. The original claim was made after reading four
  sites and before reading the seven reached through an alias.

  **A correction to this entry's statement about the gate's file set.** It
  said the one `(globalThis as any)` in `tests/setup.ts` was "outside the
  count twice over". It was inside it. `sourceFiles()` excluded files NAMED
  `*.test.ts` and said nothing about the `tests/` directory, while its own
  comment and the printed header both claimed otherwise. The exclusion is now
  real, and because those two files contribute exactly that one occurrence to
  any count, stating the set correctly moved no baseline. Insight 6.64.

  **Both leftovers this entry listed are fixed, not carried.**
  `components/hovercard/hovercard.ts` cast `_lu` a second time in `logDebug`
  and `logWarn`; `_lu` is typed, so both casts are gone.
  `components/dynamicformswitcher/dynamicformswitcher.ts` kept a local
  `interface LogUtility` shadowing the real one, now `ComponentLogger` with
  the reason written down.

  **The deferred prose is corrected.** `specs/explorerpicker.prd.md`,
  `components/inlinetoolbar/README.md`, its generated copy in
  `docs/COMPONENT_REFERENCE.md`, and `specs/hovercard.md`, which described
  today's lookup using a form that no longer typechecks. Historical planning
  records keep their original text: `specs/marketinghero-sitefooter.plan.md`
  and `specs/hovercard-adoption.prd.md` describe what was built at the time.

  **Verified by emit.** 124 of 127 bundles byte-for-byte identical, and the
  three that differ were each read: codeeditor's two accessors swapped order
  so terser swapped their mangled names, diagramengine extracts the factory
  name to a local, and spinemap emits the old `|| ""` fallback explicitly.

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

- [ ] **DEBT-ERR-2** `components/errordialog/errordialog.ts` has no fallback
  when Bootstrap's JavaScript is absent. `show()` called
  `new bootstrap.Modal(...)` with no guard and no `try`, so a page without
  the bundle got a bare `ReferenceError` out of the dialog whose job is to
  report that something already went wrong. Found by ANY-2, because a
  `@ts-expect-error` on that line had been suppressing the missing
  declaration, and it was the only type suppression in the tracked sources.

  The throw is kept and now names what is missing, because an error dialog
  that silently shows nothing is worse than one that fails loudly. What is
  open is whether it should degrade instead. Every other consumer of the
  global does: Toolbar falls back to the title attribute, MarkdownEditor
  skips its backdrop. A Bootstrap modal is markup plus CSS classes, so
  showing the dialog without the JavaScript is feasible and is a behavior
  decision rather than a typing one.

## MEDIUM — `!important` in Component SCSS (113 occurrences, 20 files, measured 2026-10-13)

Per CODING_STYLE.md, `!important` should only be used when overriding third-party styles or for accessibility-critical rules (e.g., `prefers-reduced-motion`). All other uses indicate specificity problems that should be fixed structurally.

- [ ] **IMP-1** **113 occurrences across 20 SCSS files, not the 47 across 15 recorded in March 2026.** Held at that value by check `[20]`. The per-file list below is the March list and is not the whole set.

  Violations (no third-party justification) — should be refactored:
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

## MEDIUM — Logging (LOG-1 closed as obsolete, LOG-2 and LOG-3 fixed, LOG-4 closed at 96 components and 268 trace calls, 2026-10-15)

- [x] **LOG-1** Convert `console.log` to `console.debug` where appropriate. **Closed as obsolete on 2026-10-13, not fixed.** The item was written against LOGGING.md, which FRONTEND_LOGGING.md superseded, and its count described a tree that no longer exists.

  **The 406 figure is not reproducible, and the per-file figures are wrong by an order of magnitude.** The tree holds **176 lines** containing `console.log` across 284 source files. Run `node scripts/audit-counts.mjs` for the current classification. On 2026-10-13 it was:

  | Kind | Lines | Is it a violation? |
  |---|---|---|
  | Logging shim body | 161 | No. `logInfo` maps to `console.log` by FRONTEND_LOGGING.md:36 |
  | Doc comment example | 10 | No. Sample code in a JSDoc block |
  | String data drawn on a canvas | 2 | No. `diagramengine` renders sample code as pixels |
  | The log utility's own fallthrough | 1 | No. It is the terminus |
  | **Genuine bare call site** | **2** | **Yes**, both in `errordialog.ts` (lines 446 and 513) |

  The named "worst offenders" hold 1 or 2 lines each, not 9 to 27, and every one of them is a shim body. `diagramengine` holds 22, and all 22 are shim bodies covering its 21 log prefixes. **The audit counted call sites that were later replaced by a shim, and nobody re-ran the count.**

  **After LOG-2 landed the same day, the total is 135 lines, not 176.** Shim bodies fell from 161 to 122 because the engine's 21 prefixes now share one factory, and the 2 genuine call sites are gone. The table above is the measurement that closed this item and is left as it was taken.

  **Why it closes rather than narrowing to the two call sites.** The item asks for a level decision — is this message INFO or DEBUG? — which no count can answer. `errordialog.ts` is the example component in LOGGING.md and has no shim at all, so it belongs to LOG-2 below, where the fix is to adopt the mandated pattern rather than to swap one console method for another.

- [x] **LOG-2** Two logging standards contradict each other, and 26 component files follow neither. **Measured and fixed 2026-10-13** (ADR-171).

  **The contradiction is head on.** LOGGING.md:13 says "**Do not create a shared logger module.** A centralised logger in a component library will conflict with or duplicate the host application's logging." FRONTEND_LOGGING.md:20 says this library "ships with its own logging utility `LogUtility`", and FRONTEND_LOGGING.md:27 says "*every component MUST follow the same pattern*". The repository followed the second: `components/logutility/` exists and 117 files carry the mandated preamble.

  **Resolve the documents first.** Either amend LOGGING.md so its prohibition applies to third-party frameworks and not to `LogUtility`, or mark it superseded for this repository. An open item that cites a dead standard is how LOG-1 survived six months.

  **Then migrate the files that follow neither standard.** 24 files carry the shim but never check for `LogUtility`, so they always log to the console even when the host has a logger loaded:

  - `components/diagramengine/` — **19 files** (`diagramengine.ts` plus 18 under `src/`). One component, most of the work.
  - `components/annotation/annotation.ts`, `components/chatdock/chatdock.ts`, `components/dynamiccanvas/dynamiccanvas.ts`, `components/stickynote/stickynote.ts`, `components/workspaceshell/workspaceshell.ts`

  2 files have no shim at all and call `console` directly with a hand written prefix: `components/errordialog/errordialog.ts` and `components/themeinit/themeinit.ts`.

  **How it was resolved.** Both documents now name the authority in their own
  first section: LOGGING.md holds the principles, FRONTEND_LOGGING.md holds the
  mechanism for `components/`, and AGENTS.md points at the second. LOGGING.md
  section 1 was rewritten so its prohibition covers third-party frameworks and
  cross-component imports rather than `LogUtility`, and its section 7
  checklist defers to FRONTEND_LOGGING.md section 9. FRONTEND_LOGGING.md also
  contradicted itself in four places, all copy-paste from the document it
  superseded, and those are fixed: a rule to prefer `console.log`, advice to
  strip `console.debug` before committing, a section 7 opening that said "we
  use `console.*` directly", and a section 9 checklist demanding correlation
  IDs and context propagation that section 8 assigns to the host application.

  All 143 logging components now conform and check `[20]` holds the three
  counts at zero. Two findings changed the shape of the work:

  - **`components/diagramengine/diagramengine.ts` is generated**, concatenated
    from `src/` by `scripts/bundle-diagramengine.sh`. The fix belonged in the
    generator, which was itself emitting a shim with no `LogUtility` check.
  - **The engine holds 20 log prefixes across 18 modules.** Repeating the
    mandated preamble 20 times would have added 291 lines to the largest file
    in the repository, and check `[20]` failed on `diagramengineLines` for
    exactly that reason. The namespaces now take their helpers from one
    factory in `src/logging.ts`, which removed 80 helper declarations and 294
    lines of near-duplicate code, left all 118 call sites standing, and brought
    STD-1 down from
    30,693 to 30,479 lines. FRONTEND_LOGGING.md section 1.1 sanctions that
    variant and states its boundary.

  **The prescribed snippet needed two corrections before it could be used 26
  more times.** It carried two `(window as any)` casts, so migrating would
  have added 52 occurrences to WIN-1 and failed the same check. The window
  globals that components publish to each other are now declared in
  `components/globals.d.ts`, the snippet reads `window.createLogUtility` with
  no cast, and the snippet appears in Allman form inside the 120-character
  limit. The one-line form in the 110 older files runs 148 characters wide.
  Converting those 110 files to the typed form is the mechanical path to
  closing WIN-1 and is not done here. (Written as 117 files at 133 to 150
  characters. Measured the next day: 110 files, uniformly 148. WIN-1 phase A
  and phase B then closed the item on 2026-10-14.)

  **The classifier had to learn the factory form.** After the refactor the 18
  engine modules hold neither `createLogUtility` nor the shim, so
  `classifyLoggingPattern` called 17 files holding 57 log calls "no-logging"
  and the ratchet passed. A count that is right by accident is the failure
  mode those classifier tests exist to catch, so `makeLogger(` now counts as
  conforming and carries two cases. The same pass fixed a real false positive:
  the classifier had no string-literal awareness, so
  `stencils-ui-components.ts` was reported as a violation for one line of
  sample source it draws onto the canvas.

  Check `[20]` holds all three counts at their current values, so this cannot grow while it waits.

---

- [x] **LOG-3** Verbose logging was not opt-in, in two independent ways.
  **Closed 2026-10-14.** ADR-176.

  **The default level was `"debug"`.** The gate reads
  `level > LEVELS.debug`, and with the default at 0 that is `0 > 0`, which
  is false, so debug emitted. It was documented as the default, so it was
  deliberate, but all 125 components call `createLogUtility()` with no
  options, the singleton keeps whatever the FIRST caller passed, and nothing
  in this repository ever calls `setLevel`. In practice the default governed
  every page. Now `"info"`.

  **The fallback had no filter at all.** `_lu ? _lu.debug(…) : console.debug(…)`
  writes straight to the console when `logutility.js` is absent, and nothing
  on that branch read a flag. 6 of 138 demo pages load the utility, so that
  was the usual path. 225 ungated shims across 117 files, plus the
  DiagramEngine factory serving nineteen namespaces, now gated and held at 0
  by `ungatedVerboseShims`.

  **A local development host turns debug on by itself**, and trace stays
  flag-only. The rule is one regex with its exclusions written down, and it
  exists in three places that cannot share code. `driftedHostRule` compares
  the texts and a unit test pins the semantics against a hostname table.

  **`diagramengineLines` rose 30478 to 30482**, the first baseline in the
  table to go up. Four lines in the engine factory, measured at the minimum,
  recorded in the BASELINES comment rather than absorbed.

- [x] **LOG-4** Trace instrumentation was asked for and never written.
  **Closed 2026-10-15.** ADR-178.

  `logTrace` was declared in **108 components and called in 2**, latexeditor
  and visualtableeditor, 10 call sites in all. A dragging or scrolling bug in
  the other 106 produced no trace output, which is the one level that would
  have shown it. The shims were not dead helpers to delete. They were a
  coverage gap: the pattern was followed as far as declaring the helper and
  then never filled in.

  **The entry said 80 and the number is 83.** The figure is not reproducible:
  no single change to the event list yields 80. The likely cause is that the
  earlier scan looked for an inline handler body, and `magnifier`,
  `graphminimap` and `ruler` each attach a bound method reference instead.
  83 minus those three is 80. That is an explanation and not a derivation,
  and the definition now lives in `scripts/trace-scan.mjs` so the next count
  is reproducible.

  **The scope was wider than the entry.** Measured against the rule in the
  scanner, 94 components were newly instrumented:

  | Population | Count | What it is |
  |---|---|---|
  | High-frequency DOM listener | 83 | The entry's population, re-measured |
  | `selectionchange` | 1 | richtextinput, an event the entry's list omitted |
  | `ResizeObserver` | 8 | The layout components, which register no listener at all |
  | `IntersectionObserver` | 1 | activityfeed |
  | Coalescing frame loop | 1 | logconsole, a judgment call recorded in the scanner |

  Two more were deepened. **96 components now carry 268 `logTrace` calls**,
  up from 2 components and 10 calls.

  **12 components lost the shim instead of gaining a call.** bannerbar,
  codeeditor, emptystate, gauge, inlinetoolbar, markdownrenderer,
  marketinghero, sitefooter, skeletonloader, statusbar, themetoggle and
  toolcolorpicker do no high-frequency work. FRONTEND_LOGGING.md already said
  a component with no trace-level instrumentation does not need a dead
  `logTrace`, so the helper and its gate came out.

  **A one-shot `requestAnimationFrame` is not a frame loop.** bannerbar and
  codeeditor schedule a single frame to start a CSS transition, and gauge runs
  a countdown `setInterval`. Treating either as high frequency would have
  demanded trace from three components that never repeat anything.

  **Half the work was choosing where the call goes, not whether.** 99 of 229
  listener sites attach a handler by reference, and the most common remaining
  shape is a thunk, `(e) => this.onInputKeydown(e)`. Inserting at the
  registration site would have missed the first group and instrumented a
  wrapper rather than a handler in the second. The transform resolved each
  listener to the function that actually runs, following `.bind(this)`, name
  aliases and delegating thunks, and it followed a delegation only when the
  event was forwarded or the callee was referenced exactly once. Without that
  second condition it resolved four handlers to a helper whose first parameter
  was a `string` or a `number`, which would have attributed unrelated calls to
  an input event. 222 of 246 sites resolved; the remaining 24 were done by
  hand, and each is a shape the transform refused on purpose.

  **The payload is metadata, never content.** Trace runs inside text fields
  and password fields. `keydown` logs a key name only when `key.length > 1`,
  so a single character reports as `"(char)"`. `input` logs `inputType` and
  never the value or its length. `scroll` and `resize` read nothing from
  layout, because a forced reflow inside a scroll handler is the bug trace
  exists to find. The rule is written into FRONTEND_LOGGING.md section 4.5
  and one test pins the exact key set of a real payload.

  **The ratchet is a floor and three ceilings.** This is the second floor in
  the table and the reason is the same as the first: a missing `logTrace` is
  an absence, and a ceiling cannot see an absence. `tracedComponents` holds at
  96, `untracedHotShims` and `deadTraceShims` at 0, and `hotWithoutTraceShim`
  at 13. All four were mutation-proved. Deleting one trace call from magnifier
  fails two counts and two tests.

  **Cost, stated plainly.** `dist/components` grew **22,651 bytes, 0.60%**,
  measured against the on-disk `e361179` build. Nothing was saved. The entry
  offered removing the shims as the cheaper branch, and instrumenting is the
  branch that was chosen, so the 15,485 bytes of LOG-3 gates stay and now do
  work.

- [ ] **LOG-4a** 13 components do high-frequency work and never declared a
  `logTrace` shim, so they were never part of LOG-4, which was defined over
  the components that had one. They are annotation, chartpanel, chatdock,
  diagramengine, dynamiccanvas, dynamicformswitcher, errordialog,
  explorerpicker, hovercard, layoutpicker, navrail, stickynote and
  workspaceshell. Held at 13 by `hotWithoutTraceShim`, so the set cannot grow
  while it waits. diagramengine is the awkward one: it is the multi-namespace
  bundle of FRONTEND_LOGGING.md section 1.1 and it carries a line ratchet.

- [ ] **LOG-5** **531** logging shim lines exceed the 120-character limit in
  AGENTS.md, which nothing enforces. Was 543, and LOG-4 removed 12 by dropping
  dead shims. LOG-3 lengthened 216 of them. Reflowing all five shims to a
  guarded block shape is roughly 1000 lines across 122 files.

  The entry used to say this was worth doing with LOG-4 because both rewrite
  the same lines. That was only true of the branch that removed the shims.
  Instrumenting added call sites and touched no shim line, so the two are
  independent and LOG-5 is unchanged by LOG-4 apart from the 12.

- [ ] **LOG-6** FRONTEND_LOGGING.md section 6 promises a runtime toggle the
  fallback branch does not deliver. It states that flags are checked on every
  log call, so toggling one in the browser console takes effect immediately,
  and it names customer support as the reason. That is true on the LogUtility
  branch, which re-reads the flag per call. It is false on the fallback
  branch, where `const _trc` and `const _dbg` are evaluated once when the
  script loads. **109 components capture `_trc` that way and 118 capture
  `_dbg`**, and the fallback is the path on 132 of the 138 demo pages.

  ADR-176 decided what the flags mean and never decided when they are read,
  so this is drift rather than a choice. It is filed apart from LOG-4 because
  it affects debug equally and because trace is still reachable: set the flag
  in an inline script ahead of the component, which is what the demo pages
  do. Section 6 now carries a caveat pointing here rather than a sentence
  that is known to be false.

  The fix is to read the flag inside the shim instead of beside it. The cost
  is one property lookup per call on a branch that is about to write to the
  console anyway. The care needed is in `ungatedVerboseShims` and
  `driftedHostRule`, which both match the shim text.

## MEDIUM — `: any` Type Usage (15 remaining, from 157 measured 2026-10-14)

Using `: any` defeats TypeScript's type safety. Each occurrence should be replaced with a proper type, interface, or `unknown` with narrowing.

- [x] **ANY-1** 88 `: any` annotations, **and 69 `as any` casts that nothing
  counted**. Opened at 88 and closed 2026-10-14 at **13 annotations and 2
  casts, 15 in all**, gated by `anyAnnotations` and the new `anyCasts`.
  ADR-175.

  **The count watched the annotation and not the assertion.** `: any` is a
  declaration saying the type is unknown. `as any` says the same about an
  expression and carries no colon, so 69 of the 157 were outside the ratchet.
  That is the third time in this repository that a ratchet proved narrower
  than the behavior it was named for, after WIN-1 and WIN-2. `anyCasts` was
  added and baselined before any source file moved. Insight 6.67.

  **56 of the 69 casts were in `toolbar.ts`, and they were a symptom.** The
  file declares ten item interfaces and most of it named three: the live
  config map, `addTool`, `getTool` and six helpers were typed
  `ToolItem | SplitButtonItem | GalleryItem`, while `ToolbarRegion.items`
  already spelled out all eleven members. Nothing caught it, because
  `addTool` stores `JSON.parse(JSON.stringify(tool))` and `JSON.parse`
  returns `any`, so the one line that fills the map launders the type. The
  proof the gap was real: `setToolState` publicly accepts `checked` and
  `value`, and `getInputOverflowIcon` reads `config.suffix`. Those exist only
  on five of the seven interfaces the short union omitted.

  **`docklayout.ts` and eight layout components described one contract as
  nothing.** DockLayout's five slots and the eight layouts' mounted child
  each call an identical, measured surface. `DockSlotComponent` and the
  shared `MountableComponent` in `components/globals.d.ts` name them, every
  member optional because each caller already guards with
  `typeof x.method === "function"`. All 126 bundles stayed byte-identical
  through the DockLayout change.

  **Verified by emit.** 123 of 126 bundles byte-for-byte identical across the
  three commits, and every difference was read: one hoisted local, a `!!` in
  a filter that already coerced, a `String()` on a value a function declared
  it returned as a string, a `typeof === "function"` replacing a truthy test,
  one new guard, and one method that now returns the instance it made.

- [x] **ANY-2** `components/toolbar/toolbar.ts` — `declare var bootstrap: any`
  should use a proper type declaration or a minimal interface. **Closed
  2026-10-14, and it was not one declaration but four.** `bootstrap` was
  declared as `any` here, cast from `window["bootstrap"]` in
  `markdowneditor.ts`, suppressed with a `@ts-expect-error` in
  `errordialog.ts`, and added as `bootstrap?: Record<string, unknown>` to
  `components/globals.d.ts` by WIN-2 the day before. It is now one
  `declare global { var bootstrap: BootstrapStatic | undefined }`, declared
  as a `var` because three components reach it as a bare identifier and only
  a `var` types both that and `window.bootstrap`.

  That `@ts-expect-error` was the only type suppression in the tracked
  sources, and removing it surfaced a latent crash. See DEBT-ERR-2.

- [ ] **ANY-3** The last 15 uses of `any` are in
  `components/visualtableeditor/visualtableeditor.ts`, and they are a
  different problem from the 142 that closed with ANY-1. Thirteen build
  arrays of **Toolbar items and ContextMenu items**: `buildToolbarItems`,
  `buildContextMenuItems` and their six helpers. Two assign to
  `footerAggregate` and `col.aggregate`.

  The item types are exported from `toolbar.ts` and `contextmenu.ts`, but
  they are **not published as window globals**, so neither route this
  repository allows reaches them. A component cannot import another
  component (AGENTS.md), and `components/globals.d.ts` can only name what is
  on `window`. ANY-1 cannot finish without deciding which: publish the option
  types as globals, relax the import rule for types alone, or let a consumer
  of another component restate the shape it builds. The third is what the
  `any` is standing in for today.

---

## MINOR — Missing Semantic Markers

Per MARKERS.md, all source files must contain semantic navigation markers (e.g., `// COMPONENT:`, `// SECTION:`, etc.) to support agent navigation and codebase understanding.

- [ ] **MRK-1** **3 TypeScript files missing the `COMPONENT` marker, not the 12 recorded in March 2026.** Measured 2026-10-13: `components/diagramengine/src/engine.ts`, `components/diagramengine/src/types.ts` and `components/treegrid/treegrid.ts`. Nine of the twelve were fixed and the entry was never updated.

  March 2026 list, retained as the starting point:
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

- [ ] **MRK-2** **2 of 29 files in `components/diagramengine/src/` are missing the `COMPONENT` marker, not the 22 of 24 recorded in March 2026.** Measured 2026-10-13 and held by check `[20]`: `engine.ts` and `types.ts`. Both are already named in MRK-1, so MRK-2 adds no file that MRK-1 does not cover. The entry was wrong by a factor of eleven and the directory has grown by five files since.

- [ ] **MRK-3** **4 SCSS files are missing the marker, not the 10 recorded in March 2026.** Measured 2026-10-13 and held by check `[20]`.

  March 2026 list, retained as the starting point:
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

  **Measured for the first time on 2026-10-15 by `scripts/pat-scan.mjs`.
  The entry says "some" components. It is 83 of 130 factories, across 125
  components.** This is the majority, not a tail, and the entry has
  understated itself since March 2026. Re-run the scan rather than
  re-deriving the number.

  The scan separates two failures, because they cost different things:

  - **Returns a class the file does not export: 0, was 1.** The severe
    case. The consumer receives a value and cannot name its type at all.
    `createDiagramEngine` was the only one, and STD-1 fixed it on
    2026-10-15 by exporting `DiagramEngineImpl`.
  - **Returns an exported class rather than a handle: 83.** The ordinary
    case. The consumer can name the type, the name is an implementation
    class, and so every method on that class reads as public API.

  **STD-2 was closed into this entry, and its ten files are the pattern
  working.** Each keeps its class private and returns an exported handle
  interface. They are the model the other 83 should follow, which is why
  exporting their classes, as STD-2 asked, would have moved the repository
  in the wrong direction.

  DiagramEngine is the hardest of the 83 and shows what the work costs.
  `DiagramEngineImpl` has **135 public methods**. Writing
  `DiagramEngineHandle` means deciding which of the 135 are API, and
  inventing the interface without that decision only gives the class a
  second name. That is a design question for each component, not a
  mechanical refactor, which is the real reason this entry has sat open.

  **The 138 names STD-1 restored are a union, not an API, and the same
  decision governs them.** The `src/` modules export `svgCreate`,
  `svgSetAttr`, `rectHitTest`, the `HIGHLIGHT_*` constants and the
  `EngineFor*Tool` interfaces so that **sibling modules can import them**.
  Concatenation erases that boundary, because one keyword has to mean both
  "exported for a neighbor" and "exported for a consumer". So
  `docs/AGENT_QUICK_REF.md` now lists `function svgCreate` as DiagramEngine
  API, and check `[19]` cannot tell intended from incidental, because it
  verifies that a published name exists and not that it was meant.

  This is not a reason to undo STD-1. Publishing 1 name was strictly worse
  than publishing 138, and no consumer could type anything at all. It does
  mean two things. **Deciding which of the 138 are consumer API is the same
  decision as which of the 135 methods belong on the handle**, so both
  belong to this entry rather than to a new one. And **the floor at 138
  pins the plumbing along with the API**, so when the surface is trimmed
  the floor in `scripts/audit-counts.mjs` comes down with a recorded
  reason, exactly as raising a ceiling does.

---

## CI — Node version alignment

- [x] **CI-1** `.github/workflows/ci.yml` pinned Node 20 while Cloudflare Workers Builds compiles the deployed bundle on **Node v24.18.0 with npm 11.16.0**, read from the live `/build.json`, and the development machine runs **Node v26.11.1**. Three different majors. **Closed 2026-10-13 (ADR-170): CI now pins 24, matching production.**

  **The gap was not theoretical, and the first CI run of the structure suite proved it.** `scripts/check-fabricated-reads.mjs` imports `globSync` from `node:fs`, [added in Node v22.0.0](https://nodejs.org/docs/latest-v22.x/api/fs.html) and stable in v22.17.0. On Node 20 check `[16]` threw `SyntaxError: The requested module 'node:fs' does not provide an export named 'globSync'`. **That check could never have passed in CI.** It has been green locally since it was written only because this machine runs Node 26.

  This is the precise failure mode the entry predicted: something that works on 24 and breaks on 20 had been invisible, because nothing ever ran it on 20. The entry said the fix "needs a run to find out, not a guess", and the run is what found it.

  **Resolved by aligning on production rather than on the script's floor.** Node 24 is what ships, so a green CI run now exercises the same major as the deployed bundle. GitHub is also deprecating Node 20 on its runners, which the failing run's own annotation reported. `package.json` now declares `engines.node >= 24`, **the lowest version this repository is actually tested on**, so the requirement is explicit rather than discovered through a SyntaxError. A first draft said `>= 22`, which repeated the error this item is about: 22 is where the Node documentation says `globSync` was added, the API was experimental until 22.17.0, and nothing here has ever run on 22 or 23. `globSync` is the only such API in the repository, in two calls in one file.

  **One major still separates CI from development** — 24 against 26 — which is the safe direction, since CI matching production is what the signal is for.

---

## MEASUREMENT — Counts must be re-derivable

- [x] **AUDIT-1** Every count in this file must be reproducible from a stated file set and a stated pattern. **Closed 2026-10-13 (ADR-168).**

  **The problem was not stale numbers, it was unrepeatable ones.** `console.log` was measured three times as 406, then 200, then 176, with no change to the code in between, because neither the file set nor the pattern was ever written down. WIN-1's own re-measurement of "311 occurrences on 203 lines" matches no file set in the repository. A number nobody can re-derive cannot be checked, corrected, or trusted.

  `scripts/audit-counts.mjs` now states the file set in code (tracked `*.ts`, no tests, nothing under `dist/`) and classifies each hit rather than counting raw tokens. Each count carries a baseline and check `[20]` fails when one rises, so the figures ratchet down and never drift up in silence.

  **The classifier is tested, because it was wrong three times.** `scripts/audit-counts.test.ts` holds 21 tests. Three identity mutations were run against them: making every line a shim body fails 7, counting lines instead of occurrences fails 2, and ignoring string literals fails 4. A count is only as good as the classifier behind it.

  **What it cannot do.** It counts tokens, not intent. Whether a call site picked `logDebug` where `logInfo` was right is not a question grep can answer, and that was the real question LOG-1 asked.

  **The ratchet is enforced in CI (ADR-169).** When this item was first closed it was not, which made "can only fall" true on one machine. `.github/workflows/ci.yml` now runs the full build, the runtime typecheck, the unit tests and `npm run test:structure`. Verified by mutation rather than by reading: lowering the `windowAnyCasts` baseline to 200 makes the step exit 1.

---

## Summary

| Severity | Count | Status |
|----------|-------|--------|
Every count below that carries a date was measured on that date. All but one
are measured by `node scripts/audit-counts.mjs` and held by check `[20]`, which
fails when any of them rises. The exception is **UNUSED-1**, which needs a type
check rather than a scan: re-derive it with
`npx tsc --noEmit --noUnusedLocals --noUnusedParameters`, and note that it is
**not** ratcheted. A count with no date is from the March 2026 audit and has not
been re-measured. **Of the ten March counts re-measured so far, nine were
wrong and the tenth was never a count at all**, so treat an undated number as an
unverified claim rather than a figure.

**Check `[20]` runs in CI as of 2026-10-13 (ADR-169).** It did not when this
section was first written. `.github/workflows/ci.yml` ran `npm ci`, two partial
build steps and the unit tests, so all 32 structure checks held only where
`./test-local.sh` was run and a count could rise in a branch CI called green.
CI now runs the full `npm run build`, the runtime typecheck, the unit tests and
`npm run test:structure`. Proven by lowering a baseline below its real value:
the step exits 1 and the workflow fails.

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL — Security | 4 (DEBT-SEC-5 opened 2026-10-14) | **1 open, 3 closed** |
| CRITICAL — Standards | 2 | **0 open, 2 closed 2026-10-15.** Both entries were wrong. STD-1 hid a real defect, STD-2 contradicted PAT-1 |
| HIGH — Window Cast | 2 (WIN-1 at 0, WIN-2 at 6, 2026-10-14) | **0 open, 2 closed.** WIN-2 closed at 6: the rest cannot be declared |
| HIGH — Function Length | 3 (14 functions total) | Open |
| HIGH — Error Handling | 2 (DEBT-ERR-2 opened 2026-10-14) | Open |
| MEDIUM — !important | 3 (113 occurrences in 20 SCSS files, 2026-10-13) | Open |
| MEDIUM — Logging | 7 (LOG-4a and LOG-6 opened 2026-10-15) | **3 open, 4 closed.** LOG-4 closed at 96 components, 268 calls |
| MEDIUM — : any | 3 (ANY-1 at 15, measured 2026-10-14) | **2 closed, ANY-3 open:** the count watched 88 of 157 |
| MINOR — Markers | 3 (7 distinct files: 3 TypeScript, 4 SCSS, 2026-10-13) | Open |
| MINOR — Factory Pattern | 1 (**83 of 130 factories**, measured 2026-10-15; the entry said "some") | Open. Arguably not MINOR |
| MEDIUM — Unused Variables | 1 (**414** errors, re-measured 2026-10-15, not ratcheted) | Open |
| MEASUREMENT — Re-derivable counts | 1 | **Closed** |
| CI — Node version gap | 1 | **Closed** |
| **Total** | **33 items** | **15 resolved** |

### The March 2026 counts re-measured so far

| Item | March figure | Measured | Direction |
|---|---|---|---|
| MRK-1 | 12 | 3 | far smaller |
| MRK-2 | 22 of 24 | 2 of 29 | far smaller |
| MRK-3 | 10 | 4 | far smaller |
| LOG-1 | 406 | 2 real call sites | far smaller |
| IMP-1 | 47 | 113 | far larger |
| ANY-1 | 60 | 88 | larger |
| WIN-1 | 62 | 294, now 0 | far larger, then closed |
| UNUSED-1 | 119 | 421 | far larger |
| STD-1 | 19,198 lines | 30,479 lines | larger |
| ERR-1 | never a count | "10 of 15 sampled" | not comparable |

The errors run in both directions, which is why re-measuring beats guessing
which way a stale number leans.

---

## MEDIUM — Unused Variables (tsconfig strict flags)

- [ ] **UNUSED-1**: **414 unused local/parameter errors, re-measured 2026-10-15** (421 on 2026-10-13, reduced by STD-1, see below), not the 119 recorded in March 2026. The original text follows: 119 unused local/parameter errors detected by `noUnusedLocals` / `noUnusedParameters`. These flags are currently set to `false` in tsconfig.json. Fix all 119 occurrences then enable the flags. Run `npx tsc --noEmit --noUnusedLocals --noUnusedParameters` to see full list.

  **Measured 2026-10-15.** All 414 are `TS6133`, "declared but its value is
  never read". The distribution is lopsided: **110 are in the generated
  `components/diagramengine/diagramengine.ts`** and no other file has more
  than 11.

  A tempting theory is that those 110 were an artifact of STD-1, because a
  symbol looks unused once its `export` is stripped. **That theory was
  tested and it is mostly false.** Only 7 of the 79 distinct names were
  exported in `src/`, and fixing STD-1 cleared exactly those 7. The rest
  are real dead locals such as `bounds`, `defsEl`, `dragStart` and `cw`.
  The two items are separate work.

---

## ACCEPTED DEBT — Keycloak Theme Parity (2026-07-12, ADR-137/-138/-139)

Deliberate trade-offs from the parity workstream. Each is documented in its ADR;
listed here so future audits do not re-litigate them without the context.

- [ ] **DEBT-PAR-1** `theme-init.js` is served at two URLs (`/js/theme-init.js` canonical + `/components/themeinit/themeinit.js` pipeline twin). Accepted to reuse the component build pipeline (ADR-137). Revisit only if the duplication ever confuses consumers — the fix would be excluding the component path from deploy, not adding a second build path.

  **Trigger re-measured 2026-10-09 (ADR-159): it has not fired, and the parking stands.** Every consumer reference across `~/Work/knobby/apps` uses the canonical `/js/theme-init.js` — five pages checked, zero on the twin. Nobody is confused because nobody found it.

  One thing did change, because *we* were the ones advertising it: both `COMPONENTS.md` and the component README listed the twin in a URL table with no warning, the README calling it merely "Build-pipeline twin of the same file". A table of two URLs with no steer is an invitation to pick either. Both now mark it **internal, do not link**, and say why it exists. Cheaper than deleting the path and it removes the only realistic route to the confusion this entry is waiting for.
- [ ] **DEBT-PAR-2** AuthCard publishes generic class names (`.divider`, `.brand-logo`, `.auth-card`, …) on the shared CDN — collision risk for consumers that define the same names. Required verbatim by the parity contract (ADR-138); cannot be namespaced without breaking the FreeMarker mirror. Mitigation: authcard.css is opt-in (own `<link>`), never bundled into custom.css.

  **The collision risk stays open — it is contractual and cannot be fixed here — but the MITIGATION is now enforced (2026-10-09, ADR-159).** Structure check `[17]` derives the ten names AuthCard owns from `authcard.css` itself and fails if any reaches `custom.css`. Derived rather than listed, so the tenth name is covered the day an eleventh is added. It distinguishes names AuthCard *owns* (ones that start a selector) from Bootstrap classes it merely composes with — `.brand-logo.lg`, `.auth-step.active` — because flagging `.active` would have made the check cry wolf on its first run, which it did. Mutation-proven both ways: leaking `.auth-card` into the bundle fails, and an empty `authcard.css` fails rather than passing vacuously on nothing. **A mitigation written only as a sentence is one `@import` away from ending silently, and the symptom would surface in somebody else's application.**
- [x] **DEBT-PAR-3** *(the untested half closed 2026-10-09, ADR-159)* — `test-cdn.sh` check `[7]` now asserts the live response carries `Access-Control-Allow-Origin: *` on `/icons/fonts/bootstrap-icons.woff2`. **Measured, and it is correct**: the font returns `*`. It lives in the CDN suite rather than the structure suite deliberately — a `_headers` file is applied by the edge, so nothing in this repository can confirm it and only a real response can. Proven to discriminate by running the same probe against `/css/custom.css`, which correctly reports no header.

  Why it matters, since it is easy to read as pedantry: a webfont is subject to CORS where a stylesheet is not, so a cross-origin `@font-face` without this header **fails silently** and the page falls back to a system font — a bug that looks like a design decision. *Still out of scope, behind its original trigger:* exercising it in the actual Keycloak parity flow, which does not fetch self-hosted icons today (spec R4.1).
- [ ] **DEBT-PAR-4** The apps repo's `setTheme()` early-returns on unchanged mode, so an externally clobbered `knobby-theme` cookie is only rewritten on the next real change or page load. Cosmetic; owned by the apps team (noted in specs/keycloak-theme-parity.md handoff).

---

## ACCEPTED DEBT — Dynamic UI Layer (2026-08-09, ADR-140 … ADR-145)

- [x] **DEBT-DUI-1** *(resolved 2026-10-11, ADR-161)* Geometric anchors do not survive **reflow**. `spot` is a fraction of a target's scrollable content, so a mark holds its place through scrolling and resizing — but re-wrap a document at a different width and the same fraction covers different text. The fix is content anchoring (a text-quote or offset selector, in the spirit of the W3C annotation model) surfaced through the existing `{ kind: "entity" }` anchor. Affects any reflowing or virtualizing content.

  **Designed 2026-10-10 — `specs/2026-10-10-durable-anchors.prd.md`, awaiting approval, nothing built.** Designing it turned up the reason this entry has been quietly worse than it reads: **the remedy it prescribes does not exist.** `dynamiccanvas.ts` contains no reference to `"entity"`. An entity anchor is validated by `document.ts`, then `anchorTarget()` returns `null` for it because that function tests `kind === "node"`, so no spot refinement runs and the overlay is packed as though unanchored. It renders, reports nothing, and is attached to nothing — **a caller cannot tell it apart from no anchor at all**, which is the ADR-148 shape arrived at through documentation rather than through a return value.

  Worse, `components/dynamiccanvas/README.md` **recommended it as the cure for this very entry**: "Anchoring to content … is what `{ kind: "entity", entityId }` is for, and it is the right anchor for anything that reflows or virtualizes." That paragraph was corrected on 2026-10-10 rather than waiting on the design, since it pointed consumers at a silent no-op. **The one thing more dangerous than a known gap is a documented remedy for it that does nothing.**

  **Built 2026-10-11 (ADR-161), after the user answered the design's three open questions.** A content anchor now carries an optional `selector`, and `DynamicUIHost.onResolveAnchor(anchor, nodeId)` — **required**, taking the interface from six functions to seven — turns it into the element holding that content now. The required member was affordable only because nothing in this repository implements `DynamicUIHost` and the apps team had not started one; `specs/2026-10-11-content-anchors-migration-guide.md` is the one-function migration.

  **Unresolved content orphans the note rather than losing it**, which was the user's decision and their reason: a comment must not disappear because the data it discussed was deleted. The note keeps its position, stays visible, stays in the document, and carries a dashed outline, a warning glyph and a visually hidden sentence. Orphaned and hidden are exclusive states.

  Two things the obvious implementation gets wrong, both recorded because they cost real debugging:

  - **A resolver's `null` does not mean "deleted".** It equally means "the component holding the content is demoted", which happens whenever a user pans away. So the canvas remembers the frame a note resolved into, follows that frame's mounted state, and does not ask while it is unmounted. Without that, every comment on a grid turns orphaned the moment the canvas scrolls.
  - **The scroll path needed the same fix as the mount path, and only a browser could see it.** `refineOverlaysOf` selected overlays by node anchor only, so a content-anchored note did not follow its row on scroll. jsdom reports every rectangle as zero, so the eleven unit tests could not have caught it. Three e2e tests in `tests/dynamic-ui.spec.ts` now measure the geometry, and both the position and the scroll fix are mutation-proven there.
- [x] **DEBT-DUI-2** *(resolved 2026-10-09, ADR-159)* — `attachDrag` is **36 → 27 body lines**. The entry's prescription, extracting the pointer-capture bookkeeping, got it to 32 and no further, so two more came out: `readDragOrigin` snapshots the start of a gesture and `draggedPosition` does the screen-pixels-to-canvas-units arithmetic. `capturePointerDrag` and `releasePointerDrag` are a deliberate mirror pair kept adjacent — a release that misses one of its three steps leaks a listener per drag, and the symptom (a frame that follows the cursor after the button is up) shows up nowhere near the cause. The drag state also moved from four mutable locals to one nullable `DragOrigin`, so there is no longer a window where two of the four are stale. Verified by **33 dynamic-UI e2e tests**, not just the 12 unit tests — pointer capture is invisible to jsdom, so the unit suite would have passed either way. The `@agent:refactor` tag is gone.
- [x] **DEBT-DUI-3** *(resolved 2026-10-09, ADR-159)* — `validatePatchShape` **35 → 11** and `reduceOps` **51 → 16** body lines. The entry's diagnosis was right about `reduceOps` and wrong about `validatePatchShape`: the latter is not dispatch-shaped at all, it is three independent field checks, so it split per *field* (`revisionIssues`, `opsIssues`). `reduceOps` became a genuine fold — a named `DocState` replaces five mutable locals, `applyOp` maps one op to the next state, and `(patch.ops ?? []).reduce(applyOp, start)` is the whole body. **Every arm now returns a fresh object where the original mutated the copied `nodes` record in place**, which is what makes it a fold rather than a loop with extra steps. `applyOp` first came out at 33 lines; `CODING_STYLE.md` grants dispatch no exemption, so the blank lines between arms went (seven facts should not span twice their height) along with two one-expression helpers. Behaviour is unchanged including the unknown-op case: the original switch had no `default`, so unknown ops were silently dropped, and `default: return state` preserves exactly that. **478 runtime tests pass.**
- [ ] **DEBT-DUI-4** **4** components remain `EXEMPT` in the fleet conformance gate, down from 16. Clearing an exemption is per-component work; the gate logs the count on every run rather than letting it drift.

  **Re-measured 2026-10-09 (ADR-159): the count was right and the conformance figures were stale** — "91 of 98 manifested components sit at `display`" was 84 of 91, because seven had been raised and the entry was taking no credit for them.

  **Re-measured again 2026-10-10 (ADR-160), this time the blockers rather than the count, and eleven of the sixteen did not survive.** The list was seeded 2026-08-03. Six entries said "Required option shape not yet determined" and four named a "non-standard factory signature" — sentences about what somebody expected to be hard, not records of an attempt. In between, the runtime grew `factoryStyle`, `containerOption`, `containerAs`, `mountMethod` and the `invoke` glue hook, precisely because only 35 of 118 factories follow the canonical argument order. **The blockers named mechanisms that now exist.**

  - **Six migrated at `display`** — `usermenu`, `timeline`, `stacklayout`, `multiselectcombo`, `permissionmatrix`, `fileexplorer`. **Not one needed a change to its own source**: a manifest declaring the argument order the runtime already honours, plus fixture options in conformance glue for five of them. `usermenu` was already canonical `(containerId, options)`; the four "non-standard" unions `(containerOrId: string | HTMLElement, options)` are container-first, because the union accepts the host id string the gate passes.
  - **Five moved to `NOT_MOUNTABLE`**, which is where they belonged — `statusbar` (its factory calls `show()` with no argument, appending to `document.body`: mechanically the same exclusion as `toolbar`), `graphtoolbar` (builds a preconfigured Toolbar through `window.createToolbar` and throws without it, so it wraps an already-excluded component), `commandpalette` (a `getInstance()` singleton appending its backdrop to `document.body`, opened by a shortcut), `guidedtour` (a full-viewport walkthrough stepping a popover across other components' elements — and the seed's "returns null under jsdom" was it refusing to run without third-party Driver.js), `helptooltip` (takes the element it decorates as its first argument and throws without one; `hovercard`'s rationale verbatim).
  - **Four still exempt, with blockers rewritten to say what was tried** — `graphminimap` (needs a live GraphCanvas and a 2D context jsdom does not implement: the blocker holds), `diagramengine` (phase 10, unchanged), `dynamicformswitcher` (its signature resolves; what its manifest should *declare* is consumer-visible design), `markdowneditor` (exports a class and no factory, so migrating it means adding one to the public surface). **`authcard` was the fifth, and it left the list on 2026-10-11 by being answered rather than migrated (ADR-163)** — see below.

  **The AuthCard question was closed on 2026-10-11 (ADR-163), and the answer was that there was nothing to do.** Dynamic UI composes a canvas in reaction to a model response, so a citizen of that canvas is something a model can ask for. AuthCard renders Keycloak's login step, which runs before any session exists, so there is no model and no response to react to — there is no moment at which a canvas could mount it. It moved to `NOT_MOUNTABLE`, which brings the gate to **97 of 101 in-scope migrated, 4 exempt, 24 permanently excluded**. The exclusion is about **sequence**, not shape, and that category did not exist in the gate before: every other entry is a service, an element builder, a boot script, or a viewport-docked or transient overlay. An exclusion the lists have no words for reads as a backlog item until somebody writes the words.

  `display`, not `surface`, is the bar: `EXEMPT` means "no manifest", and clearing it needs mount, render and destroy. The entry's original prose said "raising a component to `surface`", which conflated clearing an exemption with extending a component's public API. Promotion to `field` or `surface` belongs with the component's own arc.
- [x] **DEBT-DUI-5** *(resolved 2026-10-11, ADR-162)* The scrolling-region index (`within`) is **positional** — the Nth scrollable element inside a frame body, in DOM order. If it bites, record a stable descriptor (a data attribute the component owns) instead of an index.

  **Re-measured 2026-10-09 (ADR-159), and both halves of the original justification are wrong.** The entry rested on "acceptable while regions are one-per-component in practice" — **21 components style more than one**, up to five in `ribbonbuilder`, with `tabbedpanel`, `ribbon`, `prompttemplatemanager`, `markdowneditor`, `docviewer` and `applauncher` each at three. **Corrected 2026-10-10: 21 is low on both counts.** It matched `overflow` and `overflow-y` declarations only. `isScrollable` returns true when either `overflowX` or `overflowY` is `auto` or `scroll`, so a horizontally scrolling region takes an index too, and the unit has to be the **selector** rather than the declaration because `isScrollable` tests one element. Re-measured per selector across both axes: **25 components** declare more than one scrolling region, `ribbonbuilder` still leads at five, then `applauncher`, `conversation`, `docviewer`, `formdialog`, `markdowneditor`, `ribbon` and `tabbedpanel` at four each, and **68 components declare at least one**. A measurement is only as good as its predicate, and this one matched neither the axes nor the unit of the code it measured.

  Worse, the entry says the index is "stable for a given component version", and it is not. `isScrollable` in `dynamiccanvas.ts` requires an element to **currently overflow** (`scrollHeight > clientHeight`) *as well as* carry a scrolling overflow style, so a styled region whose content happens to fit is **absent from the list**. The index therefore shifts when *content* changes — same version, same component, same session. A mark recorded against region 2 silently re-anchors to a different region the moment an earlier sibling's content shrinks below its box.

  **Still open rather than fixed**, because the remedy the entry already names — a component-owned data attribute — is per-component design work across the 68 components that declare a scrolling region, not a sweep item. But it is now recorded as a live defect with a known mechanism instead of a hypothetical one, and the acceptance condition it was parked behind no longer exists.

  **Approach A shipped 2026-10-11 (ADR-161) and did not close this entry.** Content anchoring fixed DEBT-DUI-1 and left `within` untouched.

  **Approach B shipped 2026-10-11 (ADR-162) and closes it.** Every scrolling region a component creates now carries `data-dui-region="<component>:<region>"`, lists the name in its manifest's `regions`, and an anchor records `region` beside the deprecated `within`. **104 of 111 regions across 68 components are named**; the name wins on resolve, the index remains the fallback, and an integer-only anchor behaves exactly as before. Structure check **`[18]`** holds the line for every component added from here.

  **The residue is seven regions and it is deliberate.** Five are a bare `pre` inside rendered content, which the CONTENT creates — naming those would mean numbering them, and a number is the thing being replaced. One is `authcard:auth-main`, page-level scaffolding a consuming application provides. One was dead CSS: `symbolpicker-categories` styled a tab strip that a `<select>` replaced. Each reason lives in `UNNAMEABLE` in `scripts/check-region-names.mjs`, the check fails if a new unnameable region appears without an entry, and it fails if an entry stops matching any region.

  Two limits worth knowing before trusting the gate. It is **static** — SCSS for regions, TypeScript for names — because jsdom has no layout and never loads a component stylesheet, so a mounted-DOM check finds no scrolling region at all. It therefore matches a region to an attribute **in the same file, not on the same element**: a component labelling the wrong element passes. Two regions are checked properly in a browser, by collapsing an earlier region's content and asserting the mark stays put, plus a second test asserting that the same mark in an unnamed region **moves**. Without that second test the first proves nothing. **Designed 2026-10-10 together with DEBT-DUI-1** — `specs/2026-10-10-durable-anchors.prd.md`, both approaches now built. The two were filed separately and read as unrelated; they are one defect seen from two sides. `spot` names a fraction and `within` names an ordinal, and **neither names content**, so a mark records where it was and then the thing it marked moves. Fixing one without the other leaves the anchor durable along one axis and fragile along the other, which is worse than today because it reads as solved. The design also carries the constraint that is easiest to forget: `within` is a **persisted integer**, so it stays and is deprecated rather than retyped.
- [x] **DEBT-DUI-6** *(resolved 2026-10-12, ADR-167)* — a second check, **`data-changes-render`**, now mounts the component a second time with its fixture options stripped and compares the two hosts. `renders-content` is kept as it was, because what it asserts is true and it was never wrong, only incomplete. It exists because the gate once passed a TreeView whose auto-detected `containerOption` was wrong — it constructed cleanly, rendered nothing, and satisfied every check including `destroy-clears-dom`. **A human noticed that, not the gate**; `renders-content` was written in response and then found 17 components in the same state (plan, 4 August 2026). DEBT-DUI-6 is that story one level down.

  **The original finding, re-measured on the real gate before anything was written.** `renders-content` asserts that mounting put something in the host, and a component whose shell is chrome satisfies it with no data at all. Emptying the fixture for `usermenu`, `stacklayout` or `fileexplorer` in turn left **all 203** tests passing, which confirms the 2026-10-10 measurement (ADR-160). Swept across all seventeen glue files: **seven of the thirteen that carry mount data could be replaced with an inert key and no test turned red** — `chartpanel`, `fileexplorer`, `permissionmatrix`, `personchip`, `stacklayout`, `treeview` and `usermenu`.

  **Two numbers in the original entry were wrong, and both were too kind to the gate.** It said only `timeline` and `multiselectcombo` had fixtures the gate needed; the real figure is six — `datagrid`, `docviewer`, `multiselectcombo`, `splitlayout`, `stepper` and `timeline` — because emptying any of those six breaks a mount outright. And `permissionmatrix` was listed as passing on its `emptyMessage`, which is true but is not the reason it was invisible: its fixture data does reach the DOM, and the inert-key mutation proves it.

  **All thirteen mount fixtures are now load-bearing, and the thirteen partition exactly.** Nine pass by comparison. Four — `docviewer`, `multiselectcombo`, `stepper`, `timeline` — pass because the factory will not construct without the data, which is the strongest proof available that the data reaches the DOM. The seven the inert-key mutation catches and the six the empty-fixture mutation catches are disjoint and sum to thirteen.

  **There is deliberately no exclusion list.** No component needs one, and an empty allowlist invites an entry where a better fixture is the right answer. If a component's data genuinely cannot show until it is opened, the diagnostic says to say so in a comment and move the assertion to a Playwright spec, where the interaction is possible.

  **The check is scoped, and the scope is asserted.** It runs only for a target carrying fixture options, so it would go silent if the glue ever stopped reaching the target — and a check that quietly stops running looks exactly like a check that passes. A new gate test asserts that every `.conformance.ts` declaring mount options produces a target that still has them, with a floor of thirteen. Mutating `buildTarget` to drop the glue options fails that test by name, along with six others.

  **Still open, and recorded here rather than fixed:** of the **97** migrated components, **80** have no glue file at all and four more (`annotation`, `chatdock`, `stickynote`, `workspaceshell`) carry channel triggers without mount data, so **84 have nothing to compare**. For those, `renders-content` still only proves the host is not empty. That is a fixture-writing programme, not a gate defect, and it is the remaining part of this entry's spirit.

  So a fixture can rot — wrong field names, a shape the component stopped accepting — and nothing says so. The cheap remedy is to compare the host's content with and without the glue options and warn when they match, which would tell an author their fixture is decorative. Not built here because it touches the check all **97** migrated components run, and the honest interim is written where it will be read: each affected `<name>.conformance.ts` header now states that deleting its fixture would not turn the gate red.

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
- [x] **DEBT-VR-10** *(resolved 2026-10-09, ADR-159)* — all 73 audited, **nine real AA failures found and fixed**, worst 1.10.

  **The failures share one shape, and it is not the one the entry guessed.** Alpha, not hue, is what decides: a *pale tint at high alpha* dominates the composite, so the painted colour stays light no matter what surface is beneath it — and in dark mode that leaves near-white sitting under near-white text. Every one of the nine was `rgba($blue-100, 0.5)` or `rgba($yellow-100, 0.7)`. **Every other theme-blind literal in the fleet passes**, nineteen of them measured individually, because they sit at alpha ≤ 0.3 and let the surface through, so they track the theme by accident. `rgba($danger, 0.06)` is fine forever; `rgba($blue-100, 0.5)` never was.

  | site | light | dark |
  |---|---|---|
  | `applauncher-tile-name` on `.applauncher-tile-active` | **3.78** | **1.10** |
  | `fileexplorer` ×4 selected rows (text `$blue-700`) | 5.48 | **1.60** |
  | `applauncher-sidebar-active` (text `$blue-700`) | 5.48 | **1.60** |
  | `permissionmatrix-cell-changed` (`$yellow-100` @ .7) | 16.55 | **1.92** |
  | `facetsearch`, `prompttemplatemanager`, `tenantswitcher` | 16.08 | **3.47** |

  **One of them failed in light as well**, which is worth noting because the audit was motivated entirely by dark mode: `applauncher`'s tile label put `$blue-600` on a `$blue-100` tint for 3.78, and nobody had looked.

  Fixed by replacing the frozen literals with `--theme-selected-bg` and `--theme-text-primary` — these are all *selected / active* states that predate the token system and should have been using the selection token from the start. The warning fill moved to `rgba(var(--theme-warning-rgb), 0.18)`; **`--theme-warning-rgb` did not exist** and was added to both themes, because the alternative was freezing the hue as a literal, which is the habit this entry existed to close. All verified in the browser afterwards, not merely recomputed: the painted values match the arithmetic exactly in both themes.

  `visualtableeditor` was the one component already doing this correctly — it carries a `[data-bs-theme="dark"]` override at `rgba($blue-400, 0.2)`, measuring 9.33 — and is the precedent the rest now follow.

  Two deliberate non-changes: the **six scrims and backdrops** are excluded, since the dialog that sits on them is opaque and no text touches them; and `fileexplorer`'s opaque `.fileexplorer-toolbar-btn-active` moved **despite passing at 4.93 in both themes**, purely so one frozen pastel does not sit among four token-driven siblings in the same component.

  *No gate.* A permanent check needs per-site knowledge of which background has text above it, and establishing that took reading every rule — the hard part is not the arithmetic. **What a gate could cheaply catch is the shape rather than the ratio: a sass-literal tint at alpha > 0.3.** Recorded here as the design for one, not built.
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

## RESOLVED — The documentation generator read prose as an API (2026-10-11, fixed 2026-10-12, ADR-166)

- [x] **DEBT-DOC-1** *(resolved 2026-10-12, ADR-166)* — the generator now reads each component's **TypeScript**, and the published line is two: `Globals:` for the `window` registrations a CDN consumer can call, and `Exports:` for the declarations a TypeScript consumer can import. **1076 names across 125 components**, every one of them checked against the built artifacts.

  **The original description, kept because it was accurate:** `scripts/generate-docs.js:470` built each component's "Exports" line by running `/(?:class|function)\s+\w+/g` over its **README prose**, so any sentence containing the words "class" or "function" became a published API name. `docs/AGENT_QUICK_REF.md` listed `class on` 17 times, `class for` 6 times, `class names` 4 times, `class override` 3 times, and `function that` twice, among others. MarkdownRenderer's entry read `function greet`, which is not a function this repository has.

  **Re-measured against the built `d.ts`, which is what check `[19]` uses and the only oracle independent of both the old code and the new: 53 of the 54 published names were wrong.** The single correct one was `function createVisualTableEditor`. Of the other 53, **37 name nothing the component's published types declare at all**, and 17 match a declared name — 15 with the same keyword, 2 with a different one — which is the same 37-and-17 split the check's mutation produces, because it is the same oracle. Fourteen of those 17 are prose words colliding with a real declaration: `class on` seven times, `class names` and `class for` twice each, plus `class override`, `class or` and `function returning`. All 32 components that published a line published at least one wrong name, and **31 published nothing but wrong names**.

  **Two superseded counts, recorded because both were stated before the better oracle existed.** The first, 38 of 54, asked only whether the component's source declared the name at all rather than whether the name was public. The second, 53 of 54, was right but was computed with the new extractors, which cannot grade themselves.

  **`extractFactory` had the same defect and is fixed in the same pass.** It read the README for `create*` and `show*` followed by a bracket, and **26 of the 179** names it published across 21 components were not functions. That number is measured against the component's **source**, because the shipped bundle cannot answer the question: a boolean option named `showError` appears in the bundle as a property name, so the bundle oracle that check `[19]` uses for globals reports only the 14 names, across 11 components, that do not exist in the component in any form at all. Most were boolean **options** whose name begins with "show" — `showError`, `showColumn`, `showLoading`. Some were another component's factory mentioned in passing, such as `createGraphCanvas` in HoverCard's README. One was the English word "created" in a sentence followed by a bracket. It is now filtered from the globals list.

  **Four registration syntaxes, and the fourth was found by measuring.** A first version of `extractGlobals` reported eleven components as having no public surface. Eight were the layout components, which hold the cast in a local first — `const w = window as …` then `w["createAnchorLayout"] = …` — a form the regex did not cover. Of the remaining three, two were the same shape; `themeinit` really does register nothing, because it is a boot script, so `Globals: none` is correct and worth printing there. An empty list is now printed rather than omitted, because omission is what hid this: a component with no `export` keyword at all shows `Exports: none` instead of showing nothing (STD-1, STD-2).

  **There were no tests for this file.** `scripts/generate-docs.test.ts` adds 16, and `scripts/**/*.test.ts` is now in the vitest include. Structure check **`[19]`** holds the line against the generator drifting back, and it deliberately does not reuse the extractors: it reads the built `d.ts`, which tsc writes from real export keywords, and the shipped bundle, which is what a consumer loads. Mutation-proven — reverting the Exports line to the prose regex and regenerating fails 37 of the 54 names. The other 17 are the prose-collision cases, which the check records that it cannot see.

  Found while rewriting the MarkdownRenderer README for SEC-3: the sentence "removes the whole class of script injection" published an export called `class of`. The sentence was reworded so this commit adds no new noise, which is a workaround and not a fix — the next person to use the word "class" in a README will publish another one.

  The repair is to read the signatures from the component's TypeScript rather than its README, which is where the real exports are. `AGENT_QUICK_REF.md` is written for coding agents, so a wrong API name there is read as fact by the next agent and then copied into code.
