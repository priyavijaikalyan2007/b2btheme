<!--
SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
SPDX-License-Identifier: MIT
-->

<!-- AGENT: Specification for the LatexEditor — a WYSIWYG + source LaTeX equation editor with symbol palette, live preview, styling controls, and DiagramEngine embeddability. -->

# LatexEditor

| Field         | Value                                              |
|---------------|----------------------------------------------------|
| Status        | Draft                                              |
| Component     | `LatexEditor`                                      |
| Folder        | `components/latexeditor/`                          |
| Factory       | `createLatexEditor(options)`                       |
| Spec author   | PVK + Claude                                       |
| Date          | 2026-04-02                                         |

---

## 1. Overview

### 1.1 What Is It

A LaTeX equation editor component with two editing modes: a **WYSIWYG visual
editor** (wrapping MathLive's `<math-field>` web component) and a **source editor**
for direct LaTeX markup. Includes a tabbed symbol palette with inline grids for
Greek letters, operators, relations, arrows, brackets, calculus, matrices,
functions, accents, chemistry symbols, and logic/set-theory notation. A live
KaTeX-rendered preview is always visible. Styling controls (colour, bold, size,
highlight) let users apply `\textcolor`, `\mathbf`, `\colorbox`, and size
commands visually.

Designed for embedding in DiagramEngine shapes (via `foreignObject`), FormDialog
popups, Sidebar tabs, and standalone page layouts. Recommended minimum size:
640 × 480 px.

### 1.2 What It Is NOT

- **Not a full LaTeX document editor.** No preamble, `\usepackage`, floats,
  tables, cross-references, or bibliography support. Math mode only.
- **Not a MathML editor.** MathML authoring is a separate future component.
  This component _outputs_ MathML as a secondary format (via MathLive's
  built-in conversion) but the authoring experience targets LaTeX.
- **Not a computer algebra system.** No symbolic computation, equation
  solving, or simplification. It is purely an authoring/rendering tool.

### 1.3 Why Build It

| Problem                                                    | How LatexEditor Solves It                                |
|------------------------------------------------------------|----------------------------------------------------------|
| DiagramEngine needs inline equations in shapes             | Embeddable component; renders inside foreignObject        |
| Raw LaTeX is intimidating for non-technical users          | WYSIWYG visual editor with virtual keyboard + symbol grid |
| No way to insert styled equations in sidebars or modals    | Compact, `contained: true` friendly, responsive           |
| Chemical formulas need structured input                    | Chemistry symbol tab + mhchem support (`\ce{H2O}`)       |
| Equation styling (colour, bold) requires LaTeX expertise   | Toolbar buttons map to `\textcolor`, `\mathbf`, etc.      |

### 1.4 Design Inspiration

| Source                          | Key Pattern Adopted                                 |
|---------------------------------|-----------------------------------------------------|
| Microsoft Word Equation Editor  | Symbol ribbon, WYSIWYG input, structure templates    |
| MathLive (mathlive.io)          | Web component, virtual keyboard, multi-format output |
| Overleaf                        | Source editing with live preview                     |
| Google Docs equation insert     | Modal with symbol grid, inline rendering             |
| Desmos / GeoGebra               | Clean math input, visual keyboard                   |
| KaTeX                           | Fast client-side LaTeX rendering                    |

### 1.5 Core Design Principles

1. **Dual mode** — Visual (WYSIWYG) and Source (raw LaTeX) editing with seamless toggle.
2. **Live preview** — KaTeX-rendered output updates on every keystroke.
3. **Symbol discovery** — Tabbed inline palette with 10+ categories; search across all symbols.
4. **Styling** — Colour, bold, size, and highlight applied via standard LaTeX commands.
5. **Embeddable** — Works in DiagramEngine shapes, modals, sidebars, and standalone.
6. **Lazy loading** — MathLive loaded on demand (CDN); KaTeX already in stack.
7. **Output** — Always produces both `latex` and `mathml` strings via `getValue()`.

---

## 2. Architecture

### 2.1 Component Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  LatexEditor                                        640 × 480  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Styling Toolbar                                         │  │
│  │  [Color ▼][Bold][Size ▼][Highlight ▼] │ [Visual|Source]  │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Editor Area                                              │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  Visual mode: <math-field> (MathLive)               │  │  │
│  │  │  — or —                                             │  │  │
│  │  │  Source mode: <textarea> with LaTeX syntax           │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  Live Preview (KaTeX rendered output)               │  │  │
│  │  │  ┌───────────────────────────────────────────────┐  │  │  │
│  │  │  │  x = \frac{-b ± \sqrt{b²-4ac}}{2a}          │  │  │  │
│  │  │  └───────────────────────────────────────────────┘  │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Symbol Palette (inline tabs)                             │  │
│  │  [Greek][Operators][Relations][Arrows][Brackets][Calc]     │  │
│  │  [Matrices][Functions][Accents][Chemistry][Logic][Sets]    │  │
│  │  ┌───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┐       │  │
│  │  │ α │ β │ γ │ δ │ ε │ ζ │ η │ θ │ ι │ κ │ λ │ μ │       │  │
│  │  ├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤       │  │
│  │  │ ν │ ξ │ π │ ρ │ σ │ τ │ υ │ φ │ χ │ ψ │ ω │   │       │  │
│  │  └───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┘       │  │
│  │  [ 🔍 Search symbols... ]                                │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Module Boundaries

```
latexeditor.ts          — Single-file component (factory + implementation)
latexeditor.scss        — Styles with le- prefixed classes
latexeditor.test.ts     — Vitest test suite
README.md               — Component documentation
```

### 2.3 External Dependencies

| Dependency | Role                    | Loading          | Size      |
|------------|-------------------------|------------------|-----------|
| KaTeX      | Live preview rendering  | Already in stack | ~347 KB   |
| MathLive   | WYSIWYG visual editor   | CDN, on demand   | ~500 KB   |

Both are loaded lazily via `probe<T>(name)` / safe global detection, following
the CodeEditor pattern (line 136 of codeeditor.ts). If MathLive is not loaded,
the component gracefully degrades to source-only mode with a warning.

### 2.4 DiagramEngine Integration

```
Diagram node data:  { expression: "\\frac{a}{b}", displayMode: true }

View mode (non-interactive):
  → KaTeX.renderToString(expression) inside <foreignObject>
  → Lightweight, no MathLive instance, static HTML+CSS

Edit mode (double-click):
  → Full LatexEditor with toolbar, symbol palette, preview
  → pointer-events: auto
  → On blur/exit: getValue() captures updated expression
```

Registration via `registerEmbeddableComponent("latexeditor", { ... })` in the
DiagramEngine embed pack, following the same lifecycle as VisualTableEditor.

---

## 3. Data Model

### 3.1 Options Interface

```typescript
export interface LatexEditorOptions
{
    /** Container element or CSS selector. */
    container: HTMLElement | string;

    /** Initial LaTeX expression. Default: "". */
    expression?: string;

    /** Initial editing mode. Default: "visual". */
    editMode?: "visual" | "source";

    /** Display mode (block) or inline mode. Default: true (display). */
    displayMode?: boolean;

    /** Show the styling toolbar. Default: true. */
    showToolbar?: boolean;

    /** Show the symbol palette. Default: true. */
    showSymbolPalette?: boolean;

    /** Show the live preview pane. Default: true. */
    showPreview?: boolean;

    /** Contained mode (for DiagramEngine embedding). Default: false. */
    contained?: boolean;

    /** Minimum width in px. Default: 400. */
    minWidth?: number;

    /** Minimum height in px. Default: 300. */
    minHeight?: number;

    /** Additional CSS class on root element. */
    cssClass?: string;

    /** Read-only mode. Default: false. */
    readOnly?: boolean;

    /** Enable mhchem chemistry extension. Default: true. */
    enableChemistry?: boolean;

    /** Enable cancel/strikethrough commands. Default: true. */
    enableCancel?: boolean;

    /** Callback when expression changes. */
    onChange?: (latex: string) => void;

    /** Callback when user confirms (e.g. presses Enter in source mode). */
    onConfirm?: (latex: string, mathml: string) => void;
}
```

### 3.2 Public API

```typescript
export interface LatexEditor
{
    /** Get current LaTeX expression. */
    getLatex(): string;

    /** Get MathML output (converted from current LaTeX via MathLive). */
    getMathML(): string;

    /** Get both formats at once. */
    getValue(): { latex: string; mathml: string };

    /** Set LaTeX expression programmatically. */
    setExpression(latex: string): void;

    /** Switch editing mode. */
    setEditMode(mode: "visual" | "source"): void;

    /** Get current editing mode. */
    getEditMode(): "visual" | "source";

    /** Insert LaTeX at cursor position. */
    insertAtCursor(latex: string): void;

    /** Set read-only state. */
    setReadOnly(readOnly: boolean): void;

    /** Focus the editor. */
    focus(): void;

    /** Destroy the component and clean up. */
    destroy(): void;

    /** Get the root DOM element. */
    getElement(): HTMLElement;
}
```

### 3.3 Example Usage

```typescript
// Standalone in a page
const editor = createLatexEditor({
    container: "#equation-editor",
    expression: "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}",
    onChange: (latex) => console.log("Updated:", latex),
});

// In a FormDialog popup
showFormDialog({
    title: "Insert Equation",
    panel: {
        content: (values) =>
        {
            const el = document.createElement("div");
            const ed = createLatexEditor({ container: el, contained: true });
            return el;
        },
        width: 640,
    },
    onSubmit: () => editor.getValue(),
});

// In DiagramEngine (registered as embeddable)
engine.registerEmbeddableComponent("latexeditor", {
    factory: "createLatexEditor",
    label: "Equation",
    icon: "bi-calculator",
    category: "data",
    defaultWidth: 300,
    defaultHeight: 80,
});
```

---

## 4. Editing Modes

### 4.1 Visual Mode (WYSIWYG)

- Wraps MathLive's `<math-field>` web component
- Provides familiar WYSIWYG math input — type `\frac` and it renders a fraction template
- MathLive's built-in virtual keyboard available (configurable)
- Cursor navigation within math structures (numerator/denominator, sub/super)
- On each input event, syncs the LaTeX string to the preview pane

### 4.2 Source Mode

- `<textarea>` with monospace font for direct LaTeX editing
- Line numbers (optional, off by default for single-line equations)
- Tab inserts `\t` (or configured snippet)
- On each input/keyup, syncs the LaTeX string to the preview pane
- Ctrl+Enter fires `onConfirm` callback

### 4.3 Mode Toggle

- Two-segment toggle button (Visual | Source) in the toolbar
- Switching from Visual → Source: extracts LaTeX from MathLive, populates textarea
- Switching from Source → Visual: sets MathLive value from textarea content
- If MathLive is not loaded, Visual mode is disabled; component starts in Source

---

## 5. Symbol Palette

### 5.1 Categories

Twelve inline tabs with symbol grids. Each tab shows a CSS Grid of clickable
symbol cells. Clicking a symbol inserts its LaTeX command at the cursor.

| Category      | Tab Label    | Icon              | Symbol Count | Key Symbols                                        |
|---------------|--------------|-------------------|--------------|----------------------------------------------------|
| Greek         | Greek        | `bi-type-italic`  | ~50          | α β γ δ ε θ λ π σ φ ω Γ Δ Θ Λ Σ Φ Ψ Ω            |
| Operators     | Operators    | `bi-plus-circle`  | ~25          | + − × ÷ · ± ∓ ∪ ∩ ⊕ ⊗ ∘ ∙ ★                      |
| Relations     | Relations    | `bi-arrows-angle-expand` | ~30   | = ≠ ≡ ≈ ≅ ∼ < > ≤ ≥ ≪ ≫ ∈ ∉ ⊂ ⊃ ⊆ ⊇            |
| Arrows        | Arrows       | `bi-arrow-right`  | ~30          | → ← ↔ ⇒ ⇐ ⇔ ↑ ↓ ↦ ↗ ↘ ⟶ ⟹                       |
| Brackets      | Brackets     | `bi-braces`       | ~20          | ( ) [ ] { } ⟨ ⟩ ⌊ ⌋ ⌈ ⌉ | ‖                      |
| Calculus      | Calculus     | `bi-infinity`     | ~20          | ∫ ∬ ∭ ∮ ∑ ∏ lim sup inf d∂ ∇                      |
| Structures    | Structures   | `bi-grid-3x3`     | ~15          | frac, sqrt, binom, matrix, pmatrix, cases, align   |
| Functions     | Functions    | `bi-function`     | ~25          | sin cos tan log ln exp det dim ker gcd arg          |
| Accents       | Accents      | `bi-badge-wc`     | ~20          | hat, bar, vec, dot, ddot, tilde, overline, widehat  |
| Chemistry     | Chemistry    | `bi-droplet-half` | ~25          | \ce{}, →, ⇌, ↑, ↓, (aq), (s), (l), (g), isotopes  |
| Logic         | Logic        | `bi-diagram-3`    | ~20          | ∀ ∃ ∄ ¬ ∧ ∨ ⊢ ⊨ ⊤ ⊥ ℕ ℤ ℚ ℝ ℂ                    |
| Misc          | More         | `bi-three-dots`   | ~20          | ∞ ℵ ∅ ℏ ℓ ∂ ℘ ⊕ spaces (..., ···, ⋮, ⋱)           |

### 5.2 Symbol Grid Layout

- CSS Grid with 12 columns (matching SymbolPicker pattern)
- Cell size: 36 × 36 px (larger than SymbolPicker for math readability)
- Each cell shows the rendered symbol (via KaTeX for complex ones, Unicode for simple)
- Tooltip on hover shows the LaTeX command (e.g. `\alpha`)
- Click inserts the LaTeX command at cursor position via `insertAtCursor()`

### 5.3 Structure Templates

The "Structures" tab provides template buttons for multi-part constructs:

| Template       | LaTeX Inserted                        | Preview           |
|----------------|---------------------------------------|--------------------|
| Fraction       | `\frac{▢}{▢}`                        | a/b fraction       |
| Square root    | `\sqrt{▢}`                           | √▢                |
| nth root       | `\sqrt[▢]{▢}`                        | ⁿ√▢               |
| Superscript    | `^{▢}`                               | x^n                |
| Subscript      | `_{▢}`                               | x_n                |
| Binomial       | `\binom{▢}{▢}`                       | (n choose k)       |
| Sum            | `\sum_{▢}^{▢}`                       | Σ with limits      |
| Integral       | `\int_{▢}^{▢}`                       | ∫ with limits      |
| Matrix 2×2     | `\begin{pmatrix}▢&▢\\▢&▢\end{pmatrix}` | 2×2 matrix      |
| Matrix 3×3     | `\begin{pmatrix}▢&▢&▢\\▢&▢&▢\\▢&▢&▢\end{pmatrix}` | 3×3 |
| Cases          | `\begin{cases}▢&▢\\▢&▢\end{cases}`  | piecewise          |
| Overline       | `\overline{▢}`                       | x̄                  |
| Underline      | `\underline{▢}`                      | x̲                  |
| Overbrace      | `\overbrace{▢}^{▢}`                 | ⏞ with label       |
| Cancel         | `\cancel{▢}`                         | diagonal strike    |

`▢` represents a placeholder that MathLive auto-navigates to (in visual mode)
or that the cursor is positioned at (in source mode).

### 5.4 Chemistry Symbols (mhchem)

The Chemistry tab provides shortcuts for `\ce{}` wrapped expressions:

| Symbol           | LaTeX                        | Description             |
|------------------|------------------------------|-------------------------|
| Chemical formula | `\ce{H2O}`                   | Water                   |
| Reaction arrow   | `\ce{->}`                    | Forward reaction        |
| Equilibrium      | `\ce{<=>}`                   | Reversible reaction     |
| Precipitate      | `\ce{v}`                     | Downward arrow          |
| Gas              | `\ce{^}`                     | Upward arrow            |
| State (aq)       | `\ce{(aq)}`                  | Aqueous                 |
| State (s)        | `\ce{(s)}`                   | Solid                   |
| State (l)        | `\ce{(l)}`                   | Liquid                  |
| State (g)        | `\ce{(g)}`                   | Gas                     |
| Isotope          | `\ce{^{14}_{6}C}`           | Carbon-14               |
| Ion charge       | `\ce{SO4^2-}`               | Sulfate ion             |
| Dot notation     | `\ce{Cl.}`                   | Radical                 |
| Bond             | `\ce{H-H}`                  | Single bond             |
| Double bond      | `\ce{O=O}`                  | Double bond             |
| Triple bond      | `\ce{N#N}`                  | Triple bond             |

### 5.5 Symbol Search

- Search input at the bottom of the palette area
- Filters across all categories simultaneously
- Matches against symbol name, LaTeX command, and Unicode description
- Results displayed in a flat grid (category-agnostic)

---

## 6. Styling Toolbar

### 6.1 Toolbar Actions

| Button     | Icon                | Action                                              |
|------------|---------------------|-----------------------------------------------------|
| Color      | `bi-palette`        | Opens color picker dropdown; wraps selection in `\textcolor{#hex}{...}` |
| Bold       | `bi-type-bold`      | Wraps selection in `\mathbf{...}` (or `\boldsymbol{...}` for Greek) |
| Size ▼     | `bi-fonts`          | Dropdown: Tiny, Script, Small, Normal, Large, Huge  |
| Highlight  | `bi-paint-bucket`   | Opens color picker; wraps selection in `\colorbox{#hex}{$...$}` |
| Boxed      | `bi-bounding-box`   | Wraps selection in `\boxed{...}`                    |
| Cancel     | `bi-x-diamond`      | Wraps selection in `\cancel{...}`                   |
| —          | divider             |                                                     |
| Visual     | `bi-eye`            | Switch to WYSIWYG mode                              |
| Source     | `bi-code-slash`     | Switch to source mode                               |

### 6.2 Size Mapping

| Dropdown Label | LaTeX Command      |
|----------------|--------------------|
| Tiny           | `\tiny`            |
| Script         | `\scriptsize`      |
| Small          | `\small`           |
| Normal         | `\normalsize`      |
| Large          | `\large`           |
| Huge           | `\huge`            |

### 6.3 Colour Picker Integration

Reuses the existing ColorPicker component (`createColorPicker`). Opens as a
dropdown popover anchored to the toolbar button. On colour selection, wraps the
current selection (or inserts at cursor) with the appropriate LaTeX command.

---

## 7. Live Preview

### 7.1 Rendering

- Uses KaTeX's `renderToString()` (or `render()` for DOM) with `displayMode: true`
- Updates on each input event (debounced at 150ms for source mode)
- Error handling: on KaTeX parse error, shows the error message in a
  `le-preview-error` styled block below the last successful render
- `throwOnError: false` for graceful degradation

### 7.2 Preview Pane Layout

- Positioned below the editor area, above the symbol palette
- Light background (`var(--theme-surface-bg)`), subtle border
- Vertically centred content
- Minimum height: 60px
- Scrollable if the rendered output exceeds the pane height

---

## 8. Keyboard Shortcuts

| Shortcut          | Action                        |
|-------------------|-------------------------------|
| Ctrl+B            | Bold selection                |
| Ctrl+Shift+M      | Toggle visual/source mode     |
| Ctrl+Enter        | Confirm / fire onConfirm      |
| Escape            | Blur editor (useful in embed) |
| Ctrl+Z            | Undo                         |
| Ctrl+Shift+Z      | Redo                         |
| Ctrl+/            | Insert `\frac{▢}{▢}`         |
| Ctrl+Shift+S      | Insert `\sqrt{▢}`            |

---

## 9. Accessibility

- Toolbar buttons have `aria-label` and `title` attributes
- Symbol grid cells have `role="button"` and `aria-label` with symbol name
- MathLive provides built-in accessibility (ARIA roles, speech output)
- Source mode textarea has `aria-label="LaTeX equation source"`
- Preview pane has `role="status"` and `aria-live="polite"` for live updates
- Tab navigation: toolbar → editor → preview → symbol tabs → symbol grid
- Symbol palette tabs use `role="tablist"` / `role="tab"` / `role="tabpanel"`

---

## 10. Theming and Styling

### 10.1 CSS Class Prefix

All classes use the `le-` prefix:

```
le-root            — Root container
le-toolbar         — Styling toolbar
le-editor          — Editor area wrapper
le-visual          — MathLive visual editor wrapper
le-source          — Source textarea wrapper
le-preview         — Live preview pane
le-preview-error   — Error display in preview
le-palette         — Symbol palette container
le-palette-tabs    — Tab bar
le-palette-tab     — Individual tab button
le-palette-grid    — Symbol grid
le-palette-cell    — Individual symbol cell
le-palette-search  — Search input
le-mode-toggle     — Visual/Source toggle buttons
```

### 10.2 Dark Mode

- Uses `var(--theme-*)` tokens throughout (no hard-coded colours)
- MathLive supports CSS custom properties for theming
- KaTeX output styled via CSS (text colour inherits from container)
- Symbol grid cells use `var(--theme-surface-bg)` hover state

### 10.3 Responsive Behaviour

- Below 640px width: symbol palette collapses to a scrollable single row of tabs
- Below 480px width: preview pane moves to a collapsible section
- `contained: true` mode: no min-width/min-height constraints; fills container

---

## 11. DiagramEngine Embed Specification

### 11.1 View Mode Rendering

When embedded in a DiagramEngine shape in view mode (non-interactive):

```
┌──────────────────────────────┐
│   rendered equation (KaTeX)  │
│   x = (-b ± √(b²-4ac))/2a   │
└──────────────────────────────┘
```

- Render via `KaTeX.renderToString(expression, { displayMode })` inside the
  `<foreignObject>` container
- No toolbar, no palette, no preview — just the rendered math
- Lightweight: no MathLive loaded
- Text colour and background inherit from shape styles

### 11.2 Edit Mode

On double-click (entering interactive mode):

- Full LatexEditor instantiated inside the foreignObject
- `contained: true` auto-set
- On blur/exit: `getValue()` captures updated expression; shape data updated
- MathLive loaded on demand (first edit interaction)

### 11.3 Shape Data

```typescript
{
    type: "embed",
    embedComponent: "latexeditor",
    embedData: {
        expression: "\\frac{a}{b}",
        displayMode: true
    }
}
```

### 11.4 Export

- SVG export: equation rendered as KaTeX HTML inside `<foreignObject>`
- JSON export: expression string preserved in shape data
- Copy/paste: expression string transferred

---

## 12. Implementation Phases

### Phase 1 — Core Editor (Source Mode + Preview)

- Factory function `createLatexEditor(options)`
- Source mode textarea with monospace styling
- KaTeX live preview with debounced updates
- Basic public API: `getLatex()`, `setExpression()`, `getValue()`, `destroy()`
- Root container with `le-` prefixed classes
- Dark mode support
- Test suite scaffolding

### Phase 2 — Symbol Palette

- Inline tabbed symbol grid (12 categories)
- Symbol data definitions (LaTeX command, rendered preview, name)
- Click-to-insert at cursor position
- Symbol search across all categories
- Structure templates (fraction, sqrt, matrix, etc.)
- Chemistry tab with mhchem shortcuts

### Phase 3 — Styling Toolbar

- Colour picker integration (reuses ColorPicker)
- Bold, size, highlight, boxed, cancel toolbar buttons
- Wrap-selection logic for all styling commands
- Mode toggle (Visual | Source) button group

### Phase 4 — Visual Mode (MathLive)

- MathLive `<math-field>` integration with lazy loading
- Safe global detection (`probe<MathLive>("MathLive")`)
- Bidirectional sync: MathLive ↔ source textarea ↔ KaTeX preview
- Graceful degradation when MathLive not available
- `getMathML()` via MathLive conversion
- Virtual keyboard configuration

### Phase 5 — DiagramEngine Integration

- Register as embeddable component in embed pack
- View mode: KaTeX-only render (no MathLive)
- Edit mode: full editor on double-click
- Shape data serialisation
- Demo page section

### Phase 6 — Demo Page + README

- Standalone demo section in full-demo.html
- Component demo page (demo/components/latexeditor.html)
- README.md with full API documentation
- Update COMPONENT_INDEX.md, COMPONENT_REFERENCE.md, AGENT_QUICK_REF.md

---

## 13. Testing Strategy

| Area                     | Test Type     | Count (est.) |
|--------------------------|---------------|--------------|
| Factory + initialisation | Unit          | 8-10         |
| Source editing + preview  | Unit          | 10-12        |
| Symbol palette rendering | Unit          | 8-10         |
| Symbol insertion          | Unit          | 6-8          |
| Styling commands          | Unit          | 8-10         |
| Mode toggle               | Unit          | 4-6          |
| Public API                | Unit          | 8-10         |
| Keyboard shortcuts        | Unit          | 6-8          |
| Accessibility             | Unit          | 4-6          |
| DiagramEngine embed       | Integration   | 4-6          |
| **Total**                 |               | **~70-90**   |

---

## 14. Performance Targets

| Metric                          | Target            |
|---------------------------------|-------------------|
| Initial render (source mode)    | < 50ms            |
| KaTeX preview update            | < 100ms           |
| MathLive load (first use)       | < 2s (CDN)        |
| Symbol palette tab switch       | < 30ms            |
| Memory (source mode, idle)      | < 5 MB            |
| Memory (visual mode, idle)      | < 15 MB           |
