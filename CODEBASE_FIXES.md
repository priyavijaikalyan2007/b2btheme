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
