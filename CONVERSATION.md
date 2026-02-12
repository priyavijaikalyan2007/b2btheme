<!-- AGENT: Running log of agent interactions and changes for organisational memory. -->

# Conversation Log

## 2026-02-12 — Sidebar Panel Component

**Request:** Implement a dockable, floatable, resizable sidebar panel component that acts as a container for other components. Supports docking to left/right viewport edges, floating with drag-based positioning, collapsing to a 40px icon strip, resizing via drag handles, tab grouping when multiple sidebars share the same dock edge, and drag-to-dock with visual drop zones.

**Approach:**
1. Wrote a detailed PRD at `specs/sidebar.prd.md` covering anatomy, API, behaviour, styling, DOM structure, and accessibility.
2. Implemented the TypeScript component at `components/sidebar/sidebar.ts` with: `Sidebar` class (lifecycle, mode switching, collapse, resize, floating drag, drag-to-dock), `SidebarManager` singleton (tab grouping, drop zones, CSS custom properties), convenience functions, and global exports.
3. Implemented SCSS styles at `components/sidebar/sidebar.scss` with mode modifiers, title bar, resize handles, collapsed strip, tab bar, and dock zone drop indicators.
4. Created README at `components/sidebar/README.md`.
5. Updated `demo/index.html` with sidebar CSS/JS links and demo section (docked left, docked right, floating, tabbed, collapse, resize, destroy controls).
6. Updated `COMPONENTS.md`, `agentknowledge/concepts.yaml`, `agentknowledge/decisions.yaml`, `agentknowledge/history.jsonl`, `scripts/wrap-iife.sh`, `CONVERSATION.md`.

**Files created:**
- `specs/sidebar.prd.md`
- `components/sidebar/sidebar.ts`
- `components/sidebar/sidebar.scss`
- `components/sidebar/README.md`

**Files updated:**
- `demo/index.html`
- `COMPONENTS.md`
- `agentknowledge/concepts.yaml`
- `agentknowledge/decisions.yaml`
- `agentknowledge/history.jsonl`
- `scripts/wrap-iife.sh`
- `CONVERSATION.md`

**Key design decisions:**
- Uses `.sidebar-container` root class to avoid collision with existing `.sidebar` nav styling in `custom.scss`.
- Z-index layering: docked=1035, floating=1036, drop zones=1037 (below StatusBar 1040, below modals 1050+).
- `SidebarManager` singleton manages tab grouping, drop zones, and CSS custom properties (`--sidebar-left-width`, `--sidebar-right-width`).
- Pointer capture pattern for reliable resize and drag across elements.
- CSS `transition: width 300ms ease` for smooth collapse animation.

---

## 2026-02-10 — EditableComboBox Component

**Request:** Create an editable combo box component that merges a text input with a dropdown list. Core requirements: Bootstrap component model compliance, chevron toggle button, substring filtering, Escape closes dropdown only, programmable API, inspired by Windows/GNOME/web patterns.

**Approach:**
1. Wrote a detailed PRD at `specs/editablecombobox.prd.md` covering behaviour, keyboard interactions, ARIA accessibility, API, styling, edge cases, and testing requirements.
2. Implemented the TypeScript component at `components/editablecombobox/editablecombobox.ts` with: `EditableComboBox` class, `createEditableComboBox` convenience function, `ComboBoxItem` and `ComboBoxOptions` interfaces, full keyboard navigation, substring filtering with match highlighting, item grouping, dropdown positioning, and `restrictToItems` validation.
3. Implemented SCSS styles at `components/editablecombobox/editablecombobox.scss` using theme variables exclusively.
4. Added 7 demo scenarios to `demo/index.html`: basic, restricted, grouped, size variants, disabled/readonly, programmatic control, and large list (200 items).
5. Updated `COMPONENTS.md`, `components/editablecombobox/README.md`, `agentknowledge/concepts.yaml`, `agentknowledge/history.jsonl`.
6. Generalised the `build:ts` script in `package.json` to strip `export` keywords from all component JS files (not just ErrorDialog).

**Files changed:**
- `specs/editablecombobox.prd.md` (new)
- `components/editablecombobox/editablecombobox.ts` (new)
- `components/editablecombobox/editablecombobox.scss` (new)
- `components/editablecombobox/README.md` (new)
- `COMPONENTS.md` (updated)
- `CONVERSATION.md` (new)
- `package.json` (updated build:ts)
- `demo/index.html` (updated)
- `agentknowledge/concepts.yaml` (updated)
- `agentknowledge/history.jsonl` (updated)

## 2026-02-10 — DatePicker, TimePicker, DurationPicker, ProgressModal Components

**Request:** Create four new components: (1) DatePicker with calendar views, manual input, configurable format/locale/week numbers; (2) TimePicker with spinner columns, 12/24-hour modes, optional timezone; (3) DurationPicker with 17 unit patterns, ISO 8601 support, 1-year max; (4) ProgressModal with indeterminate/determinate modes, scrollable detail log, Cancel/Retry/Close lifecycle.

**Approach:**
1. Wrote detailed PRDs at `specs/datepicker.prd.md`, `specs/timepicker.prd.md`, `specs/durationpicker.prd.md`, `specs/progressmodal.prd.md`.
2. Implemented DatePicker TypeScript and SCSS directly. Launched parallel agents for TimePicker, DurationPicker, and ProgressModal.
3. All four components compile clean with `npx tsc --noEmit`.
4. Created README.md for each component.
5. Added demo sections to `demo/index.html` with interactive examples for all four.
6. Updated `COMPONENTS.md`, `agentknowledge/concepts.yaml`, `CONVERSATION.md`.

**Files changed:**
- `specs/datepicker.prd.md` (new)
- `specs/timepicker.prd.md` (new)
- `specs/durationpicker.prd.md` (new)
- `specs/progressmodal.prd.md` (new)
- `components/datepicker/datepicker.ts` (new)
- `components/datepicker/datepicker.scss` (new)
- `components/datepicker/README.md` (new)
- `components/timepicker/timepicker.ts` (new)
- `components/timepicker/timepicker.scss` (new)
- `components/timepicker/README.md` (new)
- `components/durationpicker/durationpicker.ts` (new)
- `components/durationpicker/durationpicker.scss` (new)
- `components/durationpicker/README.md` (new)
- `components/progressmodal/progressmodal.ts` (new)
- `components/progressmodal/progressmodal.scss` (new)
- `components/progressmodal/README.md` (new)
- `COMPONENTS.md` (updated)
- `CONVERSATION.md` (updated)
- `demo/index.html` (updated)
- `agentknowledge/concepts.yaml` (updated)

## 2026-02-11 — TimezonePicker and CronPicker Components

**Request:** Create two new components: (1) TimezonePicker — a standalone searchable timezone dropdown extracted from TimePicker's embedded selector, enhanced with live current-time preview, grouped by region, UTC offset display; (2) CronPicker — a visual CRON schedule builder with 6-field support (second, minute, hour, day-of-month, month, day-of-week), presets, mode-based field editors, human-readable descriptions, and bidirectional raw expression editing.

**Approach:**
1. Wrote PRDs at `specs/timezonepicker.prd.md` and `specs/cronpicker.prd.md`.
2. Implemented TimezonePicker TypeScript and SCSS with searchable dropdown, grouped timezone list, live time preview via `setInterval`, keyboard navigation, and format hint.
3. Implemented CronPicker TypeScript and SCSS with preset dropdown, 6 field rows with 4 modes each (Every, Specific, Range, Step), chip grid for multi-select, range/step number inputs, human-readable description generator, bidirectional raw expression sync, and CRON parsing/serialisation.
4. Created README.md for both components.
5. Added demo sections to `demo/index.html` with interactive examples.
6. Updated `COMPONENTS.md`, `agentknowledge/concepts.yaml`, `CONVERSATION.md`.

**Files changed:**
- `specs/timezonepicker.prd.md` (new)
- `specs/cronpicker.prd.md` (new)
- `components/timezonepicker/timezonepicker.ts` (new)
- `components/timezonepicker/timezonepicker.scss` (new)
- `components/timezonepicker/README.md` (new)
- `components/cronpicker/cronpicker.ts` (new)
- `components/cronpicker/cronpicker.scss` (new)
- `components/cronpicker/README.md` (new)
- `COMPONENTS.md` (updated)
- `CONVERSATION.md` (updated)
- `demo/index.html` (updated)
- `agentknowledge/concepts.yaml` (updated)

## 2026-02-11 — MarkdownEditor Component

**Request:** Create a Markdown SxS Edit + Viewer component with: GFM support, syntax highlighting, MermaidJS/Graphviz/PlantUML diagram rendering, readonly/readwrite modes, tab and side-by-side layout modes, collapsible panes, 70% viewport default sizing, resizability, keyboard shortcuts, inline selection popup toolbar, export to MD/HTML/PDF, and modal hosting capability. User requested open-source alternatives be evaluated first.

**Approach:**
1. Researched 10 open-source markdown editors. Selected **Vditor** (MIT, vanilla JS, 10.5K stars) as the engine — covers 9.5/11 requirements natively including all 3 diagram types. Added **DOMPurify** for defence-in-depth HTML sanitisation.
2. Wrote PRD at `specs/markdowneditor.prd.md` with security section covering CVE-2022-0341, CVE-2022-0350, DOMPurify integration, and consumer security guidance.
3. Implemented thin Bootstrap 5 wrapper in TypeScript: tab/side-by-side layout modes, pane collapse in SxS, inline selection toolbar (Bold/Italic/Underline/Strikethrough/Superscript/Subscript/Code), export to MD/HTML/PDF, vertical resize handle, fullscreen toggle, modal hosting via `showMarkdownEditorModal()`, and Vditor theme overrides.
4. All HTML output sanitised via DOMPurify before DOM insertion or export. Falls back to Vditor built-in sanitisation with console warning if DOMPurify not loaded.
5. Created SCSS with `mde-` prefixed classes, Vditor CSS variable overrides for theme alignment.
6. Created README.md with security guidance section.
7. Added demo sections to `demo/index.html` with 4 demos: tab mode, side-by-side, readonly, modal.
8. Updated `COMPONENTS.md`, `agentknowledge/concepts.yaml`, `CONVERSATION.md`.

**Files changed:**
- `specs/markdowneditor.prd.md` (new)
- `components/markdowneditor/markdowneditor.ts` (new)
- `components/markdowneditor/markdowneditor.scss` (new)
- `components/markdowneditor/README.md` (new)
- `COMPONENTS.md` (updated)
- `CONVERSATION.md` (updated)
- `demo/index.html` (updated)
- `agentknowledge/concepts.yaml` (updated)
- `agentknowledge/history.jsonl` (updated)

## 2026-02-12 — StatusBar Component

**Request:** Create a fixed-to-bottom viewport status bar with configurable label/value regions separated by pipe dividers. Text must be natively selectable for Ctrl+C copying. Lighter component — no modals, no complex state machines.

**Approach:**
1. Wrote PRD at `specs/statusbar.prd.md` covering anatomy, behaviour, API, styling, and accessibility.
2. Implemented TypeScript component at `components/statusbar/statusbar.ts` with: `StatusBar` class, `createStatusBar` convenience function, `StatusBarRegion` and `StatusBarOptions` interfaces, `Map<string, HTMLElement>` for O(1) region lookups, dynamic `addRegion`/`removeRegion`, `--statusbar-height` CSS custom property on `<html>`, and `role="status"` with `aria-live="polite"`.
3. Implemented SCSS styles at `components/statusbar/statusbar.scss` with sm/md/lg size variants (24/28/34px), dark background, theme variable integration.
4. Created README at `components/statusbar/README.md`.
5. Added demo section to `demo/index.html` with interactive buttons for value updates, icon changes, region add/remove, getAllText, and visibility toggle.
6. Updated `COMPONENTS.md`, `agentknowledge/concepts.yaml`, `agentknowledge/history.jsonl`, `scripts/wrap-iife.sh`, `CONVERSATION.md`.

**Files changed:**
- `specs/statusbar.prd.md` (new)
- `components/statusbar/statusbar.ts` (new)
- `components/statusbar/statusbar.scss` (new)
- `components/statusbar/README.md` (new)
- `COMPONENTS.md` (updated)
- `CONVERSATION.md` (updated)
- `demo/index.html` (updated)
- `agentknowledge/concepts.yaml` (updated)
- `agentknowledge/history.jsonl` (updated)
- `scripts/wrap-iife.sh` (updated)

---

## 2026-02-12 — BannerBar Component

**Request:** Implement a fixed-to-top viewport banner bar for announcing significant events — service status updates, critical issues, maintenance windows, success confirmations. Single-instance model (new replaces old), closeable, optional auto-dismiss, with sidebar top offset integration.

**Approach:**
1. Wrote PRD at `specs/bannerbar.prd.md` covering anatomy, variants, API, behaviour, z-index, and accessibility.
2. Implemented TypeScript component at `components/bannerbar/bannerbar.ts` with: `BannerBar` class (show/hide/destroy/setMessage/setTitle/setVariant/isVisible), module-level `activeBanner` tracking, convenience functions `createBannerBar`/`showBanner`, global exports.
3. Implemented SCSS styles at `components/bannerbar/bannerbar.scss` with four severity variant presets (info/warning/critical/success), slide-in animation via `transform: translateY`, max-height scroll, and close button.
4. Created README at `components/bannerbar/README.md`.
5. Updated `components/sidebar/sidebar.scss` to offset `.sidebar-docked` and `.sidebar-dock-zone` by `var(--bannerbar-height, 0px)`.
6. Added demo section to `demo/index.html` with 9 interactive buttons: 4 variants, action, title, long message, auto-dismiss, custom colours, and close.
7. Updated `COMPONENTS.md`, `agentknowledge/concepts.yaml`, `agentknowledge/decisions.yaml` (ADR-012), `agentknowledge/history.jsonl`, `scripts/wrap-iife.sh`, `CONVERSATION.md`.

**Files created:**
- `specs/bannerbar.prd.md`
- `components/bannerbar/bannerbar.ts`
- `components/bannerbar/bannerbar.scss`
- `components/bannerbar/README.md`

**Files updated:**
- `components/sidebar/sidebar.scss`
- `demo/index.html`
- `COMPONENTS.md`
- `agentknowledge/concepts.yaml`
- `agentknowledge/decisions.yaml`
- `agentknowledge/history.jsonl`
- `scripts/wrap-iife.sh`
- `CONVERSATION.md`

**Key design decisions:**
- Z-index 1045: above StatusBar (1040) and Sidebar (1035-1037), below modals (1050+). Recorded as ADR-012.
- Single-instance via module-level `activeBanner` variable — no separate manager class needed.
- `--bannerbar-height` CSS custom property on `<html>` for layout integration.
- `aria-live="assertive"` for critical/warning, `aria-live="polite"` for info/success.

---

## 2026-02-12 — Toolbar Component (Research + Specification)

**Request:** Research toolbar/action bar components inspired by Microsoft Office Ribbon. Produce a detailed specification at `specs/toolbar.prd.md`. If Bootstrap 5+ compatible open source components exist, research and suggest the best one for integration.

**Approach:**
1. Researched 10+ open-source libraries: Metro UI CSS (ribbon), Office-Ribbon-2010, Nitro Ribbon, PriorityNav.js, jsPanel4, dock-spawn-ts, bootstrap.native, Syncfusion EJ2, dhtmlxRibbon, and Bootstrap 5 native `.btn-toolbar`.
2. Studied Microsoft Office Ribbon UX patterns: region/group design, 4-mode sizing system (Large/Medium/Small/Popup), scaling policies, Simplified Ribbon, keyboard accessibility (KeyTips).
3. Studied WAI-ARIA Toolbar Pattern: roving tabindex, `aria-orientation`, keyboard navigation.
4. Studied implementations in VS Code, Figma, Google Docs, PatternFly, SAP Fiori.
5. Concluded no existing open-source library meets all requirements (Bootstrap 5, vanilla JS, regions, overflow, docking, floating, vertical/horizontal). Recommended building custom.
6. Wrote comprehensive PRD at `specs/toolbar.prd.md` covering: anatomy, full TypeScript API (types, interfaces, class methods), behaviour (overflow Priority+ pattern, docked/floating modes, resize, orientation change, tool toggle), DOM structure, CSS classes, theme integration, z-index layering, CSS custom properties, keyboard accessibility (WAI-ARIA), tooltip behaviour, integration with BannerBar/StatusBar/Sidebar, edge cases, implementation notes, and future considerations.

**Files created:**
- `specs/toolbar.prd.md`

**Files updated:**
- `CONVERSATION.md`

**Key design decisions:**
- Z-index: docked=1032, floating=1033, overflow=1034 (below Sidebar 1035, below StatusBar 1040, below BannerBar 1045, below modals 1050+).
- Priority+ overflow pattern inspired by PriorityNav.js and PatternFly: tools have `overflowPriority` of "never"/"high"/"low"/"always".
- Single strip design (no ribbon tabs) — adapted ribbon region/group concept without the tab switching.
- `ResizeObserver` for overflow detection, `setPointerCapture` for drag/resize.
- `--toolbar-<position>-size` CSS custom properties on `<html>` for layout integration.
- Orientation/dock position auto-correction when incompatible (e.g., horizontal toolbar cannot dock left).
- Bootstrap 5 tooltip integration with fallback to native `title` attribute.

---

## 2026-02-12 — Toolbar Component (Implementation)

**Request:** Implement the Toolbar component following the approved plan. Create toolbar.ts (~2200 lines), toolbar.scss (~530 lines), README.md, update demo page with 9 interactive scenarios, and update all support files.

**Approach:**
1. Implemented TypeScript component at `components/toolbar/toolbar.ts` with 8 build stages: S1 (types/interfaces/constants), S2 (DOM helpers), S3 (class shell + lifecycle), S4 (region + tool management), S5 (split/gallery/keytips/persist API), S6 (DOM building), S7 (event handling), S8 (CSS helpers, overflow, positioning, convenience functions, global exports).
2. Implemented SCSS styles at `components/toolbar/toolbar.scss` (562 lines) with 17 sections covering all modes, tool types, dropdowns, galleries, overflow, KeyTips, dock zones, resize handle, responsive touch, and reduced motion.
3. Created README at `components/toolbar/README.md` with quick start, API reference, tool types, CSS custom properties, keyboard accessibility.
4. Added 9 demo scenarios to `demo/index.html`: Editor Toolbar (docked top, 3 regions), Diagram Palette (docked left, vertical), Split Button, Colour Gallery (4-column grid), Overflow, Drag-to-Dock, Toggle Orientation, Save/Restore Layout, Destroy All.
5. Updated `scripts/wrap-iife.sh`, `COMPONENTS.md`, `agentknowledge/concepts.yaml`, `agentknowledge/decisions.yaml` (ADR-013), `agentknowledge/history.jsonl`, `CONVERSATION.md`.

**Files created:**
- `components/toolbar/toolbar.ts`
- `components/toolbar/toolbar.scss`
- `components/toolbar/README.md`

**Files updated:**
- `demo/index.html`
- `scripts/wrap-iife.sh`
- `COMPONENTS.md`
- `agentknowledge/concepts.yaml`
- `agentknowledge/decisions.yaml`
- `agentknowledge/history.jsonl`
- `CONVERSATION.md`

**Key design decisions:**
- Single `Toolbar` class (no separate manager) — multiple toolbars coexist independently, each setting its own CSS custom property.
- `Map<string, HTMLElement>` for O(1) tool and region lookups.
- Deep-copy regions via `JSON.parse(JSON.stringify())` then restore callback references from original options.
- Priority+ overflow algorithm: measures all tools, removes from end based on priority (always > low > high > never).
- `ResizeObserver` with debounced callback for automatic overflow recalculation.
- Gallery preview content uses DOMPurify when available, falls back to textContent stripping.
- Z-index: docked=1032, floating=1033, dropdowns/keytips/dock-zones=1034. Recorded as ADR-013.

---

## 2026-02-12 — Toolbar Bug Fixes (Overflow, Undock, Right Dock)

**Request:** Fix three bugs found during manual testing of the Toolbar component.

**Bug 1 — Overflow not working:**
- `.toolbar-regions-container` had no CSS rules. As a flex child without `flex: 1 1 0`, `min-width: 0`, or `overflow: hidden`, it expanded to natural content width. `regionsContainerEl.offsetWidth` always equalled total tool width, so `totalSize <= containerSize` was always true — no tools ever overflowed.
- **Fix:** Added CSS rules for `.toolbar-regions-container`: `flex: 1 1 0`, `min-width: 0`, `min-height: 0`, `overflow: hidden`, plus orientation-aware `flex-direction` rules.

**Bug 2 — Can't undock a docked toolbar:**
- Grip was hidden when docked (`display: none` when not floating). Drag handler early-returned for `currentMode !== "floating"`. No way to transition from docked back to floating.
- **Fix:** Grip now visible in all modes (hidden only when `draggable: false`). Drag handler supports starting from docked mode — undocks to floating at pointer position, then begins normal drag. Like tearing off a docked toolbar in Office.

**Bug 3 — Right dock CSS:**
- `.toolbar-docked-right` lacked explicit `left: auto` and `height: auto`, allowing previously-set inline values from floating mode to interfere.
- **Fix:** Added `left: auto; height: auto` to `.toolbar-docked-right` and `right: auto; height: auto` to `.toolbar-docked-left`.

**Files updated:**
- `components/toolbar/toolbar.ts`
- `components/toolbar/toolbar.scss`
- `CONVERSATION.md`

## 2026-02-12 — Gauge Component

**Request:** Build a visual measure component modeled after the ASN.1 Gauge type with two primary use cases: Remaining Time (countdown to target date) and Remaining Value (quota/usage tracking). User specified three shapes, no animations, both fluid and explicit sizing, auto-tick with manual override.

**Research phase:**
- Searched for BS5 gauge libraries. Found gauge.js, svg-gauge, JustGage, ApexCharts — all circular/semi-circular, none support square tiles or countdown timers. Recommended building custom.

**Design decisions:**
- Three shapes: tile (square card), ring (circular SVG arc), bar (horizontal/vertical linear)
- Value mode (`role="meter"`) and time mode (`role="timer"`)
- No CSS transitions or animations — all value changes instant
- Single `Gauge` class with shape option (not 3 separate classes) — threshold/value/timer logic >60% shared
- Ring uses SVG `stroke-dasharray`/`stroke-dashoffset` technique
- Auto-tick with adaptive intervals (1s/1m/5m/1h based on remaining time)
- Fluid sizing via CSS container queries (`container-type: inline-size`, `cqi` units) + explicit size presets (xs=80, sm=120, md=180, lg=260, xl=360)
- ADR-014: Single-class design, no animations

**Implementation:**
- `components/gauge/gauge.ts` (~1000 lines) — 5 sections: types/interfaces/constants, DOM helpers, formatting helpers, Gauge class, convenience functions + global exports
- `components/gauge/gauge.scss` (~290 lines) — 10 sections: constants, base container, size variants, tile shape, ring shape, bar shape (horizontal + vertical), state classes, reduced motion, touch support
- `components/gauge/README.md` — component documentation with full API reference
- `demo/index.html` — 10 demo scenarios: value tiles, ring gauges, horizontal bars, vertical bars, countdown tile, overdue ring, size variants, interactive controls, inverted thresholds, custom formatter

**Files created:**
- `components/gauge/gauge.ts`
- `components/gauge/gauge.scss`
- `components/gauge/README.md`

**Files updated:**
- `demo/index.html`
- `COMPONENTS.md`
- `scripts/wrap-iife.sh`
- `agentknowledge/concepts.yaml`
- `agentknowledge/decisions.yaml`
- `agentknowledge/history.jsonl`
- `CONVERSATION.md`
