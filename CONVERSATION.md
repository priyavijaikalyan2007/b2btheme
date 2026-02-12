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
