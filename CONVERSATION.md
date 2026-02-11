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
