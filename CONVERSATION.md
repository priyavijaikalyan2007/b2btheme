<!-- AGENT: Running log of agent interactions and changes for organisational memory. -->

# Conversation Log

## 2026-02-12 — Conversation Component

**Request:** Implement a turn-by-turn AI chat UI component for enterprise B2B/B2C SaaS applications incorporating conversational AI agents. Inspired by Google Gemini in Google Docs.

**Open-source evaluation:** Evaluated 9 libraries (Deep Chat, DHTMLX ChatBot, NLUX, OpenAI ChatKit, PatternFly Chatbot, Chatscope, BotUI, BuildShip Widget, MDB Bootstrap Chat). None covered >60% of requirements. Critical gaps: feedback, copy in multiple formats, configurable buffer, inline error display. Deep Chat's Shadow DOM conflicts with Bootstrap theming. Decision: BUILD CUSTOM (ADR-015).

**Approach:**
1. Wrote a detailed PRD at `specs/conversation.prd.md` covering use cases, anatomy, API, behaviour, DOM structure, CSS classes, styling, accessibility, edge cases, and security.
2. Implemented TypeScript at `components/conversation/conversation.ts` (~1,700 lines) with: types/interfaces, Conversation class (lifecycle, message API, streaming API, session API, copy API, feedback), DOM builders for user/assistant/system/error messages, Vditor-rendered assistant content, two-phase streaming (textContent during stream, Vditor.preview on complete), auto-scroll with user-override detection, convenience functions, and global exports.
3. Implemented SCSS at `components/conversation/conversation.scss` (~844 lines) with 17 sections: root container, header, message list, role variants, Vditor overrides, message actions, typing indicator, streaming cursor, input area, error display, feedback modal, copy feedback, size variants, container queries, reduced motion, focus, and touch.
4. Created README at `components/conversation/README.md`.
5. Updated `demo/index.html` with 10 demo scenarios: basic conversation, streaming, rich markdown, feedback, copy, session management, error display, buffer limit, programmatic control, size variants.
6. Updated `COMPONENTS.md`, `agentknowledge/concepts.yaml`, `agentknowledge/decisions.yaml`, `agentknowledge/history.jsonl`, `scripts/wrap-iife.sh`, `CONVERSATION.md`.

**Files created:**
- `specs/conversation.prd.md`
- `components/conversation/conversation.ts`
- `components/conversation/conversation.scss`
- `components/conversation/README.md`

**Files updated:**
- `demo/index.html`
- `COMPONENTS.md`
- `scripts/wrap-iife.sh`
- `agentknowledge/concepts.yaml`
- `agentknowledge/decisions.yaml`
- `agentknowledge/history.jsonl`
- `CONVERSATION.md`

**Key decisions:**
- Single `Conversation` class (matches ProgressModal/Toolbar pattern)
- Callback-driven, no API calls (pure presentation layer)
- Two-phase streaming: plain `textContent` during stream for performance, full `Vditor.preview()` on complete
- `textContent` only for user messages (security — never innerHTML for user content)
- Used `mix(white, $red-600, 95%)` instead of Bootstrap `tint-color()` in SCSS (function not available through variables-only import)

---

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

---

## 2026-02-13 — Timeline Component

**Request:** Implement an Event Timeline component — a horizontal timeline for visualising point events (pins at a moment) and span events (blocks with start→end). Requirements: stacking via row packing, grouping, collapsible groups with presence bands, configurable colours/sizes/pins, clickable items with selection callbacks, viewport visibility callbacks, now marker, scrollable overflow.

**Open-source evaluation:** Evaluated 13 libraries (vis-timeline, DHTMLX Gantt, Frappe Gantt, Bryntum, TimelineJS, React-Calendar-Timeline, PlanBy, jQuery Gantt, Google Charts Timeline, D3-Timeline, Chronoline.js, TimelinePointer, vis-timeline-graph2d). None exceeded 65% of requirements. Decision: BUILD CUSTOM (ADR-016).

**Implementation:**
- **`specs/timeline.prd.md`** — 1,088-line PRD with 20 sections.
- **`components/timeline/timeline.ts`** — ~1,050 lines. Single class, greedy row packing, presence bands, adaptive tick axis, IntersectionObserver, ResizeObserver, now marker timer.
- **`components/timeline/timeline.scss`** — 415 lines, 21 sections.
- **`components/timeline/README.md`** — Component documentation.
- **`demo/index.html`** — 8 demo scenarios.

**Files created:**
- `specs/timeline.prd.md`
- `components/timeline/timeline.ts`
- `components/timeline/timeline.scss`
- `components/timeline/README.md`

**Files updated:**
- `demo/index.html`
- `COMPONENTS.md`
- `scripts/wrap-iife.sh`
- `agentknowledge/concepts.yaml`
- `agentknowledge/decisions.yaml`
- `agentknowledge/entities.yaml`
- `agentknowledge/history.jsonl`
- `CONVERSATION.md`

---

## 2026-02-13 — Timeline Refinements (Timezone, Ticks, Pan)

**Request:** Three refinements to the Timeline component: (1) configurable and selectable timezone display, (2) configurable time increments for ticks, (3) drag-to-scroll/pan the timeline horizontally.

**Implementation:**

1. **Timezone support** — New `timezone` option (IANA string, defaults to browser locale). All tick labels use `Intl.DateTimeFormat` with `{ timeZone }` option. Cached formatter instances for performance. Optional `showTimezoneSelector` renders a badge button in the header spacer with a searchable dropdown of all IANA timezones. `setTimezone()`/`getTimezone()` public API. `onTimezoneChange` callback.

2. **Configurable tick intervals** — New `TickIntervalPreset` type (`"1min"` through `"1d"`). New `tickInterval` option accepts a preset, ms number, or `"auto"`. Added 10-minute interval to presets. `resolveTickInterval()` private method delegates to auto-select or returns the forced value. Sub-hour intervals render tick marks without text labels to reduce visual clutter. `setTickInterval()`/`getTickInterval()` API.

3. **Drag-to-pan** — New `pannable` option. PointerEvent-based drag on body and axis: `handlePanStart` captures pointer and records start viewport, `handlePanMove` computes ms/px ratio and shifts viewport via `requestAnimationFrame` throttle, `handlePanEnd` releases capture. Shift+scroll for fine-grained panning via `handleWheelPan`. 5px threshold distinguishes drag from click. `panMoved` flag suppresses click after drag. CSS `.timeline--pannable` class sets `cursor: grab`.

**Standards compliance:**
- Replaced `innerHTML = ""` with safe `removeChild` loop in `populateTimezoneList()`
- Extracted `createTimezoneItem()` to keep all functions ≤25 lines
- Updated semantic markers (📜 PURPOSE) in both `.ts` and `.scss` headers
- All new methods have JSDoc comments

**Files modified:**
- `components/timeline/timeline.ts`
- `components/timeline/timeline.scss`
- `components/timeline/README.md`
- `demo/index.html` (3 new demo scenarios: timezone, tick intervals, drag-to-pan)
- `agentknowledge/concepts.yaml`
- `agentknowledge/history.jsonl`
- `CONVERSATION.md`

---

## 2026-02-13 — Conversation MCP App UI Enhancement

**Request:** Enhance the Conversation component with MCP Apps specification support (mcpui.dev, stable 2026-01-26) for rendering rich interactive interfaces within chat messages, plus an optional canvas side panel for full-size interactive content.

**Research phase:**
- Evaluated the official `@mcp-ui/client` SDK — React-focused, incompatible with vanilla TypeScript architecture (ADR-007). Decision: BUILD CUSTOM McpAppFrame (~200 lines) following the MCP Apps spec's security model (ADR-017).
- Studied Sidebar pointer-capture resize pattern for canvas panel reuse.

**Implementation:**

1. **McpAppConfig type + options** — New `McpAppConfig` interface (html, title, preferredWidth/Height, connectDomains, displayMode, sandboxFlags). New ConversationOptions fields: `enableMcpApps`, `showCanvas`, `canvasWidth`, `canvasMinWidth`, `canvasMaxWidthFraction`, `onMcpAppMessage`, `onCanvasToggle`.

2. **McpAppFrame class** — Private inner class managing sandboxed iframes: `sandbox="allow-scripts allow-forms"` (no `allow-same-origin`), CSP meta tag injection via srcdoc, Bootstrap theme injection via `getComputedStyle()` into `--mcp-*` CSS custom properties, guest-side `window.mcpBridge` with `send()` and `onMessage` for JSON-RPC 2.0, `event.source === iframe.contentWindow` validation, unique appId per frame, full cleanup on destroy.

3. **Inline MCP app rendering** — `renderMcpAppIfPresent()` detects `metadata.mcpApp` on assistant messages, creates `.conversation-mcp-frame` container, instantiates `McpAppFrame`. Optional "Expand to canvas" button when `showCanvas` enabled.

4. **Canvas side panel** — Conditional `.conversation-with-canvas` flex-row wrapper (only when `showCanvas: true`). Pointer-capture resize handle with min/max constraints. `openCanvas()`/`closeCanvas()`/`isCanvasOpen()` API. Keyboard: Esc close, Arrow left/right resize. ARIA `role="complementary"`.

5. **Public API** — `addAppMessage(text, appConfig)` for one-step MCP message creation. Extended `StreamHandle.complete(metadata?)` for stream-to-app transition. Fixed `getSession()`/`getMessages()` deep copy of metadata.

6. **SCSS** — Sections 18-22: MCP app inline frame (`.conversation-mcp-frame`, `.conversation-mcp-iframe`, `.conversation-mcp-expand-btn`), canvas side panel (`.conversation-with-canvas`, `.conversation-canvas`), resize handle (`.conversation-canvas-handle`), container query updates, reduced motion additions.

7. **Demos** — 4 scenarios: inline data table with sortable columns, canvas SVG bar chart with expand, bidirectional form with JSON-RPC round-trip, error handling with intentional crash. Each with JSON-RPC message log.

**Files created:**
- `specs/conversation-mcpui.prd.md`

**Files modified:**
- `components/conversation/conversation.ts`
- `components/conversation/conversation.scss`
- `components/conversation/README.md`
- `demo/index.html`
- `agentknowledge/concepts.yaml`
- `agentknowledge/decisions.yaml`
- `agentknowledge/history.jsonl`
- `CONVERSATION.md`

**Key design decisions:**
- Metadata-based detection (`msg.metadata.mcpApp`) rather than a new role — backward compatible
- Conditional DOM wrapper preserves all existing `.conversation` CSS and container queries
- `event.source` validation (not origin) because sandboxed iframe origin is `"null"`
- Expand-to-canvas hides inline frame (preserves state) rather than destroying
- ADR-017: Custom MCP App iframe renderer instead of @mcp-ui/client SDK

---

## 2026-02-15 — TabbedPanel Component

**Request:** Build a tabbed collapsible panel component — complementary to Sidebar — that can be docked (top/bottom) or floating, collapsed with one click, resized, with dynamic tabs, configurable tab bar position, and event callbacks.

**Approach:**
1. Explored existing Sidebar, MarkdownEditor (tabs), and Toolbar patterns.
2. Wrote plan in plan mode; approved by user.
3. Wrote PRD at `specs/tabbedpanel.prd.md` (~1,207 lines).
4. Implemented TypeScript at `components/tabbedpanel/tabbedpanel.ts` (~1,500 lines) with: TabbedPanel class (lifecycle, mode switching, collapse/expand, tab management with roving tabindex, pointer-capture resize, floating drag with dock zone detection), TabbedPanelManager singleton (CSS custom properties, drop zones, panel registration), and convenience functions.
5. Implemented SCSS at `components/tabbedpanel/tabbedpanel.scss` (~480 lines) with 15 sections: root, mode modifiers, title bar, tab bar, tab bar position variants, tab title modes, content area, resize handles, collapsed strip, drop zones, custom overrides, reduced motion, focus styles.
6. Created README at `components/tabbedpanel/README.md`.
7. Added 6 demo scenarios to `demo/index.html`: docked bottom terminal, docked top inspector (tab bar bottom), floating properties, collapse/expand, dynamic tab management, tab bar position variants.
8. Updated `COMPONENTS.md`, `scripts/wrap-iife.sh`, `agentknowledge/concepts.yaml`, `agentknowledge/decisions.yaml` (ADR-018), `agentknowledge/history.jsonl`, `CONVERSATION.md`.

**Files created:**
- `specs/tabbedpanel.prd.md`
- `components/tabbedpanel/tabbedpanel.ts`
- `components/tabbedpanel/tabbedpanel.scss`
- `components/tabbedpanel/README.md`

**Files updated:**
- `demo/index.html`
- `COMPONENTS.md`
- `scripts/wrap-iife.sh`
- `agentknowledge/concepts.yaml`
- `agentknowledge/decisions.yaml`
- `agentknowledge/history.jsonl`
- `CONVERSATION.md`

**Key design decisions:**
- Z-index shares Sidebar tier (docked=1035, floating=1036, drop zones=1037) since they occupy different viewport edges (top/bottom vs left/right). Recorded as ADR-018.
- TabbedPanelManager singleton manages CSS custom properties (`--tabbedpanel-top-height`, `--tabbedpanel-bottom-height`) independently from SidebarManager.
- Tab bar position left/right uses horizontal flex wrapper (`tabbedpanel-body-wrapper`) around tab bar and content.
- Collapsed state shows a 32px horizontal strip (not vertical like Sidebar's icon strip).
- Roving tabindex for tab navigation matching WAI-ARIA tabs pattern.
- Pointer-capture resize pattern reused from Sidebar with direction-aware height adjustment.

## 2026-02-15 — TreeView Component + TreeGrid PRD

Built the TreeView component and wrote the TreeGrid PRD spec.

**Files created:**
- `specs/treeview.prd.md` (1563 lines)
- `specs/treegrid.prd.md` (230 lines, spec only — no implementation)
- `components/treeview/treeview.ts` (3585 lines)
- `components/treeview/treeview.scss` (491 lines)
- `components/treeview/README.md`

**Files updated:**
- `demo/index.html` (8 demo scenarios added)
- `COMPONENTS.md`
- `scripts/wrap-iife.sh`
- `agentknowledge/concepts.yaml`
- `agentknowledge/decisions.yaml`
- `agentknowledge/history.jsonl`
- `CONVERSATION.md`

**Key design decisions:**
- Build custom — no open-source Bootstrap 5 tree meets all requirements. Recorded as ADR-019.
- HTML5 Drag and Drop API (not pointer events) — provides dataTransfer for MIME-typed cross-instance and external source interop.
- Nested `<ul>`/`<li>` DOM for WAI-ARIA tree pattern compliance.
- Single TreeView class, no Manager — instances are independent with no shared viewport edges.
- CSS prefix `treeview-` avoids collision with Bootstrap utilities.
- Context menu z-index 1050 (above all fixed layout, below modals).
- Callbacks only — TreeView never mutates consumer data; consumer owns CRUD.
- Bootstrap `spinner-border-sm` for inline node loading; ProgressModal for bulk operations.
- TreeGrid specified as PRD only until a strong use case emerges.

## 2026-02-16 — TreeGrid Refinements (Bug Fixes, Sorting, Programmability)

**Request:** Fix critical bugs in the TreeGrid component (column resize, cell editing, column picker not working) and add programmable sorting.

**Root cause:** `deepCopyOptions()` used `JSON.parse(JSON.stringify())` which silently stripped all 16 callback functions from options. This broke editing, DnD, lazy loading, and all interactive features.

**Bug fixes applied:**

1. **deepCopyOptions** — Replaced `JSON.parse(JSON.stringify(options))` with `{ ...options }` to preserve callback functions.

2. **Column resize not working** — Two issues: (a) Browser native drag (`draggable="true"` for column reorder) hijacked mousemove events during resize. Fixed by temporarily setting `draggable="false"` on the parent header cell during resize, restoring in `onResizeEnd`. (b) CSS `<style>` element with `nth-child` selectors did not produce visual effect. Replaced entire approach with direct inline styles (`cell.style.width/minWidth/maxWidth`) on every header and body cell via `updateColumnStyles()`. Recorded as ADR-022.

3. **Column picker not working** — Dropdown was appended to `headerEl` which has `overflow: hidden`, clipping the dropdown. Fixed by appending to `rootEl` with position relative to rootRect. Also clear `columnPickerEl` in `rebuildHeaderAndBody()` and reopen picker after rebuild in `onColumnPickerChange()`.

4. **Cell editor too small** — Changed `.treegrid-editor` to overlap cell by 1px (`top: -1px; left: -1px; min-width: calc(100% + 2px); height: calc(100% + 2px)`), white background, and `select.treegrid-editor { min-width: 160px }`.

5. **Sort resets column widths** — After sorting, `buildBodyContent()` created new row elements without inline width styles. Fixed by adding `updateColumnStyles()` at end of `renderTree()`.

6. **Numbers sorted as strings** — `sortNodes` converted everything to strings. Added type-aware `defaultCompare()` function: numbers compared numerically, strings case-insensitively, nulls sort to end.

**New features:**

7. **Per-column comparator** — `comparator?: (a: unknown, b: unknown) => number` on `TreeGridColumn` interface for custom sort logic.

8. **External sort mode** — `externalSort?: boolean` on `TreeGridOptions`. When true, grid only updates visual sort indicators and fires `onColumnSort` callback; application sorts data externally and calls `refresh()`. Recorded as ADR-023.

9. **`enableColumnReorder` guard** — `attachHeaderDragListeners()` now early-returns if `!this.options.enableColumnReorder`.

10. **`updateColumn()` public API** — Update a single column's properties at runtime.

**Files modified:**
- `components/treegrid/treegrid.ts`
- `components/treegrid/treegrid.scss`
- `components/treegrid/README.md`
- `agentknowledge/decisions.yaml` (ADR-022, ADR-023)
- `agentknowledge/history.jsonl`
- `CONVERSATION.md`

**Key design decisions:**
- ADR-022: Inline styles for column widths instead of CSS stylesheet injection.
- ADR-023: Programmable sorting with per-column comparator and external sort mode.

---

## 2026-02-16 — DockLayout Component + Contained Mode

**Request:** Build a CSS Grid-based `DockLayout` component and add `contained` mode to all viewport-level components so they can participate in parent layout flow instead of pinning to the viewport. Inspired by Java Swing's BorderLayout — nestable layout containers that automatically resize children.

**Scope expansion:** User clarified that ALL existing components need to work well in layout containers, not just the 4 mentioned in the requirements. This added BannerBar (position: fixed) and MarkdownEditor (70vh default height) to the modification list.

**Part 1 — Contained mode (6 components):**

Added `contained?: boolean` option (default `false`) to each viewport-level component. When `true`: `position` switches from `fixed` to `relative`, viewport offsets clear, `z-index` becomes `auto`, drag-to-dock is disabled, and `show(container?)` appends to a provided parent instead of `document.body`.

1. **Sidebar** — `setContained()`, `isContained()`, `addResizeListener()`, `addCollapseListener()`. Contained mode sets explicit width (current or collapsed), height: 100%. Drag guard in `handleDragStart()`. Skips SidebarManager registration.
2. **TabbedPanel** — Same listener pattern. Contained mode sets explicit height (current or collapsed), width: 100%. Skips TabbedPanelManager registration.
3. **Toolbar** — `setContained()`, `isContained()`. Contained mode sets width: 100%, clears position. Drag guard in `attachGripDrag()`.
4. **StatusBar** — `setContained()`, `isContained()`. Contained mode: position: relative, bottom/left: auto.
5. **BannerBar** — `setContained()`, `isContained()`. Skips slideIn translateY animation when contained (element is in document flow).
6. **MarkdownEditor** — `contained?: boolean` resolves default height to `"100%"` instead of `"70vh"`.

Each component also received a `.{component}-contained` SCSS class overriding position, offsets, and z-index.

**Part 2 — DockLayout component (new):**

CSS Grid layout coordinator with 6 named areas (toolbar, left, center, right, bottom, status). `grid-template-columns: auto 1fr auto`, `grid-template-rows: auto 1fr auto auto`.

- **Auto-contained**: Calls `component.setContained(true)` before mounting children into grid cells.
- **Dynamic grid template**: Updates `grid-template-columns`/`grid-template-rows` inline styles when sidebars resize/collapse or bottom panel resizes/collapses. Empty slots collapse to 0.
- **Resize/collapse hooks**: Uses `addResizeListener()` and `addCollapseListener()` on Sidebar and TabbedPanel.
- **Dynamic slot management**: `setToolbar()`, `setLeftSidebar()`, `setRightSidebar()`, `setBottomPanel()`, `setStatusBar()`, `setContent()`.
- **`onLayoutChange`**: Fires on every resize, collapse, or slot change with full `LayoutState`.
- **Container support**: Accepts `container`, `height`, `width` options for nesting within other layouts.

**Files created:**
- `components/docklayout/docklayout.ts` (~500 lines)
- `components/docklayout/docklayout.scss` (~120 lines)
- `components/docklayout/README.md`

**Files modified:**
- `components/sidebar/sidebar.ts` + `.scss` (contained mode)
- `components/tabbedpanel/tabbedpanel.ts` + `.scss` (contained mode)
- `components/toolbar/toolbar.ts` + `.scss` (contained mode)
- `components/statusbar/statusbar.ts` + `.scss` (contained mode)
- `components/bannerbar/bannerbar.ts` + `.scss` (contained mode)
- `components/markdowneditor/markdowneditor.ts` (contained height option)
- `demo/index.html` (3 DockLayout demo scenarios)
- `COMPONENTS.md`
- `agentknowledge/concepts.yaml`
- `agentknowledge/decisions.yaml` (ADR-024, ADR-025)
- `agentknowledge/history.jsonl`
- `CONVERSATION.md`

**Key design decisions:**
- ADR-024: Contained mode pattern — `contained: boolean` on 5 viewport-level components + MarkdownEditor. Fully backward compatible.
- ADR-025: CSS Grid DockLayout with 6 named areas, dynamic grid template updates, inspired by Java Swing BorderLayout.
- Array-based listener pattern (`addResizeListener`/`addCollapseListener`) allows DockLayout to hook into component events without replacing application callbacks.
- Content components (TreeGrid, TreeView, Conversation, Timeline, Gauge) are already container-friendly and required no changes.

---

## 2026-02-17 — Toolbar Enhancements, DockLayout Fix, Library Enhancement Items

**Request:** Multiple enhancements to the Toolbar component (title width, left/right regions, right content slot, input/dropdown/label item types), a DockLayout factory auto-show fix, and a StatusBar `getElement()` addition.

**Changes:**

1. **DockLayout mountComponent fix** — Fixed factory auto-show re-parenting bug in `mountComponent()`. When a component produced by a factory was already visible (e.g., auto-shown by its constructor), calling `show(cell)` would fail to re-parent it into the grid cell. Fix: `mountComponent()` now calls `hide()` on already-visible components before `show(cell)`, using duck-typed `isVisible()` / `hide()` checks. Single-point fix, no new interfaces.

2. **Toolbar: Title Width** — Added `width?: string` to `ToolbarTitle` interface for fixed-width title/branding areas. New `applyTitleDimensions()` helper applies the width. `setTitle()` now triggers `recalculateOverflow()` after update to account for title width changes.

3. **Toolbar: Left/Right Regions** — New `ToolbarRegionAlign` type (`"left" | "right"`). Added `align?: ToolbarRegionAlign` on `ToolbarRegion` (default: `"left"`). `buildAllRegions()` partitions regions into left/right groups with a flex spacer element between them. New `buildRegionGroup()` helper and `spacerEl` field on the Toolbar class. `rebuildOverflowMenu()` orders left regions before right. SCSS: `.toolbar-regions-spacer { flex: 1 0 0; }`.

4. **Toolbar: Right Content Slot** — Added `rightContent?: HTMLElement` on `ToolbarOptions` for embedding custom HTML (e.g., search bars, user menus) in the toolbar's right edge outside the region system. `setRightContent()` / `getRightContent()` public API. SCSS: `.toolbar-right-content`.

5. **Toolbar: Input, Dropdown, Label Item Types** — Three new first-class tool item types that integrate into the existing overflow and tool tracking system:
   - `ToolInputItem` — Embedded text input with optional icon, `onInput`/`onSubmit` callbacks.
   - `ToolDropdownItem` — Embedded select dropdown with `onChange` callback.
   - `ToolLabelItem` — Static non-interactive label with optional icon and colour.
   - Builder methods: `buildInputItem()`, `buildDropdownItem()`, `buildLabelItem()`.
   - SCSS for `.toolbar-input-wrap`, `.toolbar-dropdown`, `.toolbar-label`.

6. **StatusBar: getElement()** — Added `getElement(): HTMLElement | null` public method to expose the root DOM element for external layout integration.

7. **Demo and README updates** — Updated `components/toolbar/README.md` with all new features. Updated `components/statusbar/README.md` with `getElement()`. Added 5 new demo scenarios in `demo/index.html`.

**Files modified:**
- `components/docklayout/docklayout.ts`
- `components/toolbar/toolbar.ts`
- `components/toolbar/toolbar.scss`
- `components/toolbar/README.md`
- `components/statusbar/statusbar.ts`
- `components/statusbar/README.md`
- `demo/index.html`

**Key design decisions:**
- ADR-026: Toolbar extensible item types — input, dropdown, label added as first-class interfaces with builder methods, integrating into the existing overflow and tool tracking system rather than forcing content into buttons or rightContent.
- DockLayout fix uses duck-typed `isVisible()` / `hide()` checks to avoid tight coupling to specific component classes.
- Left/right region alignment uses a flex spacer to push right-aligned regions to the end, maintaining the existing region/tool DOM structure.

---

## 2026-02-17 — LogConsole Component

**Request:** Build a reusable in-app logging console component for displaying high-level user actions and system events. Requirements: 5 log levels (debug, info, warn, error, fatal), level filtering, dark/light themes, full colour and font customisation, rAF-batched rendering for high-throughput logging, FIFO eviction to bound memory, and Clear/Export actions.

**Approach:**
1. Implemented TypeScript component at `components/logconsole/logconsole.ts` with: LogConsole class, 5 log levels with per-level colour configuration, level filter dropdown, dark and light theme support, full colour/font customisation via options, `requestAnimationFrame`-batched DOM rendering for high-throughput log streams, FIFO eviction with configurable max entries to bound memory usage, Clear action to flush all entries, and Export action to download log contents.
2. Implemented SCSS styles at `components/logconsole/logconsole.scss` with theme-aware styling for dark/light modes, per-level colour classes, and font customisation support.
3. Created README at `components/logconsole/README.md`.
4. Updated `demo/index.html` with interactive demo scenarios.

**Files created:**
- `components/logconsole/logconsole.ts`
- `components/logconsole/logconsole.scss`
- `components/logconsole/README.md`

**Files updated:**
- `demo/index.html`

**Key design decisions:**
- rAF-batched rendering: log entries queued and flushed once per animation frame to avoid layout thrashing during high-throughput logging.
- FIFO eviction: oldest entries removed when max buffer size reached, bounding DOM node count and memory.
- Dark/light theme toggle with full colour and font customisation via options — no hard-coded colours.
- 5 log levels (debug, info, warn, error, fatal) with independent colour configuration and level-based filtering.

---

## 2026-02-17 — Toolbar Overflow Fix + Dual Overflow Buttons

**Request:** Fix toolbar overflow/resize bugs — tools get clipped instead of collapsing into "..." overflow menu when toolbar is resized. Overflow button should appear inline after the last visible tool, not at the far-right edge. Two independent overflow buttons when both left and right region groups exist.

**Root cause:** `calculateOverflow()` only summed tool element `offsetWidth` values and compared against container `offsetWidth`, missing dividers (9px each), flex gaps, spacer, and region structure widths. Also, `buildRoot()` called `buildAllRegions()` before creating overflow buttons, so they were never inserted into the DOM.

**Fix:**
1. **Measurement** — Replaced tool-width-only summation with direct child-size measurement: iterates `el.children`, sums `offsetWidth` + CSS margins via `getComputedStyle()`. More accurate than `scrollWidth` which is unreliable on flex containers with `overflow: hidden`.
2. **Dual overflow buttons** — Replaced single overflow button/menu with per-group (left/right) buttons. Buttons are inline inside the regions container, positioned right after the last visible tool in each group.
3. **Portaled menus** — Overflow dropdown menus are portaled to `rootEl` (outside the `overflow: hidden` container) with `position: fixed`, positioned via `getBoundingClientRect()` on the button.
4. **Initialization ordering** — Moved overflow button creation in `buildRoot()` before `buildAllRegions()` call so buttons exist when regions are built.
5. **Method extraction** — Extracted helpers (`resetOverflowState`, `hideOverflowButtons`, `measureOverflowExcess`, `measureChildOuterSize`, `buildToolMeasurements`, `hideExcessTools`, `buildGroupIdSet`, `showOverflowButtons`, `positionOverflowMenu`, `openOverflowGroup`) to keep all methods under 25 lines.

**Files modified:**
- `components/toolbar/toolbar.ts` (overflow algorithm, dual buttons, portaled menus)
- `components/toolbar/toolbar.scss` (removed wrapper, fixed-position menus)
- `components/toolbar/README.md` (overflow section updated)
- `demo/index.html` (Left+Right overflow demo added)

**Key design decisions:**
- ADR-027: Dual per-group overflow buttons with portaled fixed-position menus.
- Direct child-size summation (`offsetWidth` + `getComputedStyle` margins) over `scrollWidth` for measurement accuracy on flex containers.
- `position: fixed` menus escape `overflow: hidden` clipping because containing block is viewport (no `transform`/`perspective` on ancestors).

---

## 2026-02-18 — Toolbar Popup Portaling, Z-Index, and Orientation Fixes

**Request:** Fix 6 toolbar demo bugs: (1) gallery dropdown doesn't open, (2) style toolbar overflow broken + icons disappear on re-expand, (3) orientation toggle makes all icons disappear, (4) split button dropdown doesn't open, (5) overflow demos work fine (no fix needed), (6) toolbar dropdowns go behind other components.

**Root causes identified:**
1. **RC-1:** `overflow: hidden` on `.toolbar-regions-container` clips `position: absolute` popups (gallery/split) — same issue previously fixed for overflow menus.
2. **RC-2:** Z-index 1034 too low — below Sidebar (1035), StatusBar (1040), BannerBar (1045).
3. **RC-3:** `setOrientation()` didn't close popups, rebuild DOM, or reset `currentSize`.
4. **RC-4:** `resetOverflowState()` didn't reset region display — once all regions were hidden during measurement with 0-width container, they stayed hidden permanently.
5. **RC-5:** `flex: 1 1 0` + `min-height: 0` + `overflow: hidden` on `.toolbar-regions-container` causes 0-height collapse in vertical column flex layout with auto-height parent.

**Fixes applied:**

1. **Portal gallery popups and split menus** — Same pattern as overflow menus: created `splitMenuEls` and `galleryPopupEls` Maps, portaled all popups to `rootEl` outside the `overflow: hidden` container, positioned with `position: fixed` via `getBoundingClientRect()`. New `appendPortaledPopups()` helper. Rewrote `positionPopup()` for fixed positioning with `flipPopupIfOffscreen()` viewport bounds helper.

2. **Z-index bump** — Changed `$toolbar-z-dropdown` / `Z_DROPDOWN` from 1034 to 1060 (above Sidebar 1035-1037, StatusBar 1040, BannerBar 1045, modals 1050).

3. **Orientation toggle fix** — Added `closeAllPopups()`, `rebuildRegionsDOM()`, and `currentSize = 0` reset to `setOrientation()`. Ensures DOM is fully rebuilt with new orientation layout.

4. **Region visibility reset** — Added region display reset loop in `resetOverflowState()` that preserves explicitly hidden regions (`region.hidden`). Also fixed `updateRegionVisibility()` to skip explicitly hidden regions.

5. **Vertical flex-basis fix** — Added `flex-basis: auto` to `.toolbar-vertical .toolbar-regions-container` to prevent 0-height collapse in column flex layout.

**Files modified:**
- `components/toolbar/toolbar.ts` (popup portaling, z-index, orientation fix, region visibility fix)
- `components/toolbar/toolbar.scss` (position:fixed popups, z-index 1060, flex-basis:auto for vertical)

**Key design decisions:**
- Extended ADR-027 portal pattern to all popup types (split menus, gallery popups, overflow menus) — consistent fixed-position rendering outside `overflow: hidden` containers.
- Z-index 1060 ensures toolbar popups appear above all layout components including modals (1050). Updated from ADR-013's original 1034.

---

## Session: 2026-02-25 — ColorPicker Enhancements (Apps Team Request)

**Request:** Implement 4 backward-compatible enhancements from the Apps team spec (`specs/colorpicker.enhancement.txt`).

**Changes:**

1. **`onInput` real-time callback** — Added `onInput` option to `ColorPickerOptions`. During pointer drags, `onColorDragged()` fires `onInput` only (continuous). On pointer up (commit), `onColorChanged()` fires both `onInput` and `onChange`. Keyboard and swatch actions fire both.

2. **`label` option** — Added `label` string option and `setLabel()` method. Renders a `<label class="colorpicker-label">` above the picker with `font-weight: 600`, `$gray-700`, `$font-size-sm`.

3. **`getPopupElement()` method** — Returns `panelEl` when popup is open, `null` when closed or inline. Enables consumers to adjust z-index for DockLayout integration.

4. **Disabled visual state consistency** — Enhanced `.colorpicker-disabled` SCSS: trigger gets `pointer-events: auto` + `cursor: not-allowed`, hover border suppressed, swatches get `cursor: not-allowed` with no scale on hover. Added `aria-disabled="true"` to trigger in `disable()`/constructor.

**Files modified:** `components/colorpicker/colorpicker.ts`, `components/colorpicker/colorpicker.scss`, `components/colorpicker/README.md`, `demo/index.html`

**Build:** Zero errors.

---

## Session: 2026-02-25 — MarkdownEditor Enhancements (Apps Team Request)

**Request:** Implement 4 backward-compatible display-mode enhancements from the Apps team spec (`specs/markdowneditor.enhancement.txt`).

**Changes:**

1. **`isolated` option** — Added `isolated: true` option. Applies `all: initial` CSS reset boundary via `.mde-display-isolated` class to prevent Vditor CSS from bleeding into parent containers. Re-establishes font-family, font-size, color, and box-sizing.

2. **`compact` option** — Added `compact: true` option. Applies `.mde-display-compact` class with tighter margins: paragraph (0.25em), headings (relative sizing: h1=1.25em, h2=1.125em, h3=1.0625em), lists (0.125em per item), code blocks (0.5rem padding), tables (0.25rem padding).

3. **`theme: "dark"` option** — Added `theme` option with `"light"` (default) and `"dark"` values. Dark theme uses `$gray-900` background, `$gray-100` text, `$blue-300` links, `$orange-100` inline code, and passes `mode: "dark"` + `style: "native"` to Vditor.preview() for syntax highlighting.

4. **`onReady` in display mode** — Guaranteed to fire after markdown rendering completes. Uses Vditor.preview()'s `after` callback when available, or fires synchronously on fallback. Consumers can safely measure content height and adjust layout.

**Files modified:** `components/markdowneditor/markdowneditor.ts`, `components/markdowneditor/markdowneditor.scss`, `components/markdowneditor/README.md`, `demo/index.html`

**Build:** Zero errors.

---

## Session: 2026-02-26 — Pill Component

**Request:** Build a standalone Pill component — reusable inline element for mentions, issues, documents, tags. Extract the concept from STIE's existing pill styling into a proper, configurable component.

**Changes:**

1. **`components/pill/pill.ts`** (~300 lines) — `Pill` class with `PillOptions` interface, `PillColor` type, `PillStyleOverrides` interface, `createPill()` factory. Public API: `getElement()`, `setLabel()`, `setColor()`, `setStyle()`, `destroy()`. Supports 6 colour presets, 3 sizes, dismissible, clickable, anchor mode, hover callbacks, data-* metadata, CSS custom properties.

2. **`components/pill/pill.scss`** (~180 lines) — CSS custom properties (`--pill-bg`, `--pill-fg`, `--pill-border-color`, `--pill-border-radius`, `--pill-padding`, `--pill-font-size`, `--pill-max-width`). 6 colour presets (blue, gray, green, red, purple, orange). 3 sizes (sm, md, lg). Dismiss button, clickable state, entrance animation, reduced-motion support.

3. **`components/pill/README.md`** — Full API documentation.

4. **`components/smarttextinput/smarttextinput.scss`** — Fixed `.stie-token-pill` `border-radius` from `$border-radius` (0) to `9999px` for rounded pill appearance.

5. **`demo/index.html`** — Added 7 Pill demo sections: colour presets, sizes, with icons, dismissible, clickable with hover, custom styled, inline in paragraph.

6. **Knowledge base** — ADR-034 (pill border-radius exception), history.jsonl entry, concepts.yaml (Pill, PillStyles), COMPONENTS.md, MASTER_COMPONENT_LIST.md (section 20.4).

**Build:** Zero errors.
