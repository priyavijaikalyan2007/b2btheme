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
