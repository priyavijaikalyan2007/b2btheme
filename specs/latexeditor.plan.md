<!--
SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
SPDX-License-Identifier: MIT
-->

# LatexEditor — Implementation Plan

Tracks per-phase progress. Each phase is self-contained and results in a
buildable, testable increment.

---

## Phase 1 — Core Editor (Source Mode + Preview)

Status: **COMPLETE** (43 tests passing)

### Files

| File | Action |
|------|--------|
| `components/latexeditor/latexeditor.ts` | Create |
| `components/latexeditor/latexeditor.scss` | Create |
| `components/latexeditor/latexeditor.test.ts` | Create |
| `components/latexeditor/README.md` | Create |

### Tasks

1. **Scaffold component** — factory `createLatexEditor(options)`, `InternalState`,
   LOG_PREFIX, `createElement`/`setAttr` helpers, Allman braces, 4-space indent.

2. **Options parsing** — `LatexEditorOptions` interface with all defaults.
   Container resolution (string selector or HTMLElement).

3. **Root DOM structure** — build `le-root` container with:
   - `le-editor` wrapper (holds source textarea)
   - `le-preview` pane (holds KaTeX output)

4. **Source textarea** — `<textarea>` with monospace font, `le-source` class.
   Bind `input` event to update preview.

5. **KaTeX preview** — detect KaTeX via `probe<KatexStatic>("katex")`.
   `renderPreview()` calls `katex.renderToString()` with `displayMode` and
   `throwOnError: false`. Debounce at 150ms. Show parse errors in
   `le-preview-error` block.

6. **Public API** — implement `getLatex()`, `setExpression()`, `getValue()`,
   `getEditMode()`, `setEditMode()`, `insertAtCursor()`, `setReadOnly()`,
   `focus()`, `destroy()`, `getElement()`.

7. **insertAtCursor()** — use `textarea.selectionStart`/`selectionEnd` to
   splice LaTeX at cursor, update preview.

8. **Read-only mode** — `textarea.readOnly`, preview-only display.

9. **Contained mode** — `contained: true` removes min-width/min-height,
   fills parent container.

10. **SCSS** — root layout (flex column), source textarea styling, preview
    pane styling, dark mode via `var(--theme-*)` tokens, `.le-preview-error`
    styling.

11. **Tests** — factory creation, option defaults, getLatex/setExpression
    round-trip, insertAtCursor, read-only mode, destroy cleanup.

### Acceptance Criteria

- `createLatexEditor({ container, expression })` renders a working editor
- Typing in the textarea updates the KaTeX preview
- `getValue()` returns `{ latex, mathml: "" }` (mathml empty until Phase 4)
- Builds with `npm run build`
- 15+ tests passing

---

## Phase 2 — Symbol Palette

Status: **COMPLETE** (24 new tests, 67 total)

### Tasks

1. **Symbol data definitions** — define all 12 categories as arrays of
   `{ char, latex, name }` objects. Factory functions per category:
   `buildGreekSymbols()`, `buildOperatorSymbols()`, etc.

2. **Chemistry symbols** — mhchem `\ce{}` wrapped shortcuts. Include
   reaction arrows, state indicators, bond types, isotope notation.

3. **Structure templates** — fraction, sqrt, matrix, sum, integral, cases,
   binomial, overbrace, cancel — as insertable LaTeX snippets with `▢`
   placeholders.

4. **Palette DOM** — `le-palette` container with:
   - `le-palette-tabs` tab bar (`role="tablist"`)
   - `le-palette-grid` CSS Grid (12 columns, 36px cells)
   - `le-palette-cell` items (`role="button"`, `aria-label`, tooltip)

5. **Tab switching** — click tab → show corresponding grid; active tab styling.

6. **Symbol rendering** — simple Unicode chars rendered as text; complex
   symbols (fractions, integrals) rendered via KaTeX inline.

7. **Click-to-insert** — clicking a symbol cell calls `insertAtCursor(latex)`.

8. **Search** — `le-palette-search` input filters across all categories.
   Debounce at 100ms. Match against `name`, `latex`, `char`.

9. **SCSS** — tab bar styling, grid layout, cell hover/active states,
   search input, responsive collapse below 640px.

10. **Tests** — palette rendering, tab switching, symbol insertion, search
    filtering, chemistry symbols, structure templates.

### Acceptance Criteria

- 12 category tabs render with correct symbols
- Clicking a symbol inserts its LaTeX command at cursor
- Search filters across all categories
- Chemistry tab shows mhchem shortcuts
- 20+ additional tests passing

---

## Phase 3 — Styling Toolbar

Status: **COMPLETE** (20 new tests, 87 total)

### Tasks

1. **Toolbar DOM** — `le-toolbar` container with action buttons using
   `data-action` attributes. Follow toolbar building pattern from CodeEditor.

2. **Colour button** — opens ColorPicker dropdown (reuse `createColorPicker`).
   On colour select: wrap selection in `\textcolor{#hex}{...}`.

3. **Bold button** — wrap selection in `\mathbf{...}`.

4. **Size dropdown** — dropdown with 6 size options. Wrap selection in
   size command (`\tiny{...}`, `\large{...}`, etc.).

5. **Highlight button** — opens ColorPicker. Wrap selection in
   `\colorbox{#hex}{$...$}`.

6. **Boxed button** — wrap selection in `\boxed{...}`.

7. **Cancel button** — wrap selection in `\cancel{...}`.

8. **Wrap-selection helper** — generic `wrapSelection(state, before, after)`
   that handles textarea selection range, wraps content, updates preview.

9. **Mode toggle** — Visual | Source segment toggle. Disabled visual button
   when MathLive not loaded (Phase 4 enables it).

10. **Keyboard shortcuts** — Ctrl+B (bold), Ctrl+Shift+M (mode toggle),
    Ctrl+Enter (confirm), Ctrl+/ (fraction), Ctrl+Shift+S (sqrt).

11. **SCSS** — toolbar layout, button styling, dropdown positioning,
    colour picker popover, mode toggle segment control.

12. **Tests** — each toolbar action, wrap-selection logic, keyboard shortcuts.

### Acceptance Criteria

- Toolbar renders with all buttons
- Colour, bold, size, highlight, boxed, cancel commands wrap selected text
- Keyboard shortcuts work
- 15+ additional tests passing

---

## Phase 4 — Visual Mode (MathLive)

Status: **COMPLETE** (8 new tests, 95 total)

### Tasks

1. **MathLive detection** — `probe<MathLiveGlobal>("MathLive")` or detect
   `<math-field>` custom element registration. Show warning + degrade to
   source-only if not available.

2. **MathLive wrapper** — create `<math-field>` element, set initial value,
   configure virtual keyboard, apply theme CSS custom properties.

3. **Bidirectional sync** — MathLive `input` event → update `state.expression`
   → update KaTeX preview. `setExpression()` → update MathLive value.

4. **Mode toggle sync** — Visual→Source: extract LaTeX from MathLive.
   Source→Visual: set MathLive value from textarea.

5. **getMathML()** — use MathLive's `getValue("math-ml")` to extract MathML.

6. **insertAtCursor() for visual mode** — use MathLive's `executeCommand()`
   API to insert LaTeX at the current position.

7. **Styling in visual mode** — toolbar commands use MathLive's API to wrap
   selection.

8. **Virtual keyboard config** — configure MathLive's keyboard layers to
   match our symbol categories where possible.

9. **Graceful degradation** — if MathLive fails to load, Visual tab disabled,
   source mode remains functional, `getMathML()` returns empty string.

10. **SCSS** — MathLive container styling, theme integration, visual mode
    indicator.

11. **Tests** — MathLive integration (mocked), mode toggle sync, getMathML,
    graceful degradation.

### Acceptance Criteria

- Visual mode renders MathLive `<math-field>` when available
- Mode toggle syncs LaTeX between Visual and Source
- `getMathML()` returns valid MathML string
- Degrades gracefully when MathLive not loaded
- 10+ additional tests passing

---

## Phase 5 — DiagramEngine Integration

Status: **NOT STARTED**

### Tasks

1. **Register in embed pack** — add `latexeditor` to the `DATA_ENTRIES`
   array in `diagramengine.ts` embed registration. Update embed test counts.

2. **View mode renderer** — when embedded non-interactively, render only
   KaTeX output (no editor UI). Use `katex.renderToString()` in the
   foreignObject container.

3. **Edit mode lifecycle** — on double-click entering interactive mode,
   instantiate full LatexEditor with `contained: true`. On exit, capture
   `getLatex()` into shape data.

4. **Shape data serialisation** — `embedData: { expression, displayMode }`.

5. **Studio registration** — add to Component Studio, Shape Studio.

6. **Tests** — embed registration, view/edit mode lifecycle, shape data
   round-trip.

### Acceptance Criteria

- LatexEditor appears in DiagramEngine embed registry
- Equations render in diagram shapes (view mode)
- Double-click opens editor (edit mode)
- Expression survives JSON export/import
- 6+ additional tests passing

---

## Phase 6 — Demo Page + Documentation

Status: **NOT STARTED**

### Tasks

1. **Demo section** — add LatexEditor section to `demo/full-demo.html` with:
   - Standalone editor (default expression)
   - Chemistry example
   - Source-only mode example
   - Event log panel

2. **Component demo page** — `demo/components/latexeditor.html` with
   comprehensive examples.

3. **README.md** — full API documentation, usage examples, CDN setup
   instructions for KaTeX and MathLive, accessibility notes.

4. **Update indexes** — COMPONENT_INDEX.md, COMPONENT_REFERENCE.md,
   AGENT_QUICK_REF.md, MASTER_COMPONENT_LIST.md.

5. **Knowledge base** — ADR entry, concepts.yaml, entities.yaml,
   history.jsonl.

### Acceptance Criteria

- Demo page shows working editor with multiple examples
- README.md covers full API
- All indexes updated
- Knowledge base current

---

## Summary

| Phase | Description                  | Est. Tests | Cumulative |
|-------|------------------------------|------------|------------|
| 1     | Core (source + preview)      | 15-20      | 15-20      |
| 2     | Symbol palette               | 20-25      | 35-45      |
| 3     | Styling toolbar              | 15-20      | 50-65      |
| 4     | Visual mode (MathLive)       | 10-15      | 60-80      |
| 5     | DiagramEngine integration    | 6-10       | 66-90      |
| 6     | Demo + docs                  | 0          | 66-90      |
