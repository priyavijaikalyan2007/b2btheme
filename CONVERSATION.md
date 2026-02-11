<!-- AGENT: Running log of agent interactions and changes for organisational memory. -->

# Conversation Log

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
