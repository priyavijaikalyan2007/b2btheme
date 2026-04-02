<!--
SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
SPDX-License-Identifier: MIT
Repository: theme
File GUID: a0feed6f-fe04-4be8-9df9-3674e62344c4
Created: 2026
-->

# LatexEditor

A LaTeX equation editor component with two editing modes: **Visual** (WYSIWYG
via MathLive) and **Source** (raw LaTeX textarea). Includes a live KaTeX-rendered
preview, tabbed symbol palette with 12 categories (including chemistry via
mhchem), and styling controls for colour, bold, size, and highlight.

Designed for embedding in DiagramEngine shapes, FormDialog popups, Sidebar tabs,
and standalone page layouts.

## Files

| File | Purpose |
|------|---------|
| `latexeditor.ts` | Component source |
| `latexeditor.scss` | Styles (`le-` prefix) |
| `latexeditor.test.ts` | Vitest tests |
| `README.md` | This file |

## CDN Dependencies

| Library | Role | Loading |
|---------|------|---------|
| [KaTeX](https://katex.org) | Live preview rendering | Include before component |
| [MathLive](https://mathlive.io) | WYSIWYG visual editor | Optional, loaded on demand |

```html
<!-- KaTeX (required for preview) -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.css">
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.js"></script>

<!-- MathLive (optional, for visual editing mode) -->
<script src="https://cdn.jsdelivr.net/npm/mathlive@0.107.3/dist/mathlive.min.js"></script>

<!-- LatexEditor -->
<link rel="stylesheet" href="components/latexeditor/latexeditor.css">
<script src="components/latexeditor/latexeditor.js"></script>
```

## Quick Start

```javascript
var editor = createLatexEditor({
    container: "#my-editor",
    expression: "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}",
    onChange: function(latex) { console.log("Updated:", latex); },
});
```

## Factory

### `createLatexEditor(options): LatexEditor`

Creates and mounts a LatexEditor instance.

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `container` | `HTMLElement \| string` | **required** | Container element or CSS selector |
| `expression` | `string` | `""` | Initial LaTeX expression |
| `editMode` | `"visual" \| "source"` | `"visual"` | Initial editing mode |
| `displayMode` | `boolean` | `true` | Display mode (block) or inline |
| `showToolbar` | `boolean` | `true` | Show the styling toolbar |
| `showSymbolPalette` | `boolean` | `true` | Show the symbol palette |
| `showPreview` | `boolean` | `true` | Show live preview pane |
| `contained` | `boolean` | `false` | Contained mode (fills parent, no min size) |
| `minWidth` | `number` | `400` | Minimum width in px |
| `minHeight` | `number` | `300` | Minimum height in px |
| `cssClass` | `string` | — | Additional CSS class on root |
| `readOnly` | `boolean` | `false` | Read-only mode |
| `enableChemistry` | `boolean` | `true` | Enable mhchem chemistry extension |
| `enableCancel` | `boolean` | `true` | Enable cancel/strikethrough commands |
| `onChange` | `(latex: string) => void` | — | Called when expression changes |
| `onConfirm` | `(latex: string, mathml: string) => void` | — | Called on Ctrl+Enter |

## Public API

| Method | Returns | Description |
|--------|---------|-------------|
| `getLatex()` | `string` | Current LaTeX expression |
| `getMathML()` | `string` | MathML output (requires MathLive) |
| `getValue()` | `{ latex, mathml }` | Both formats |
| `setExpression(latex)` | `void` | Set expression programmatically |
| `setEditMode(mode)` | `void` | Switch to `"visual"` or `"source"` |
| `getEditMode()` | `string` | Current mode |
| `insertAtCursor(latex)` | `void` | Insert LaTeX at cursor |
| `setReadOnly(bool)` | `void` | Toggle read-only |
| `focus()` | `void` | Focus the editor |
| `destroy()` | `void` | Clean up and remove |
| `getElement()` | `HTMLElement` | Root DOM element |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+Enter | Confirm (fires `onConfirm`) |
| Ctrl+B | Bold selection (Phase 3) |
| Ctrl+Shift+M | Toggle visual/source mode (Phase 3) |
| Ctrl+/ | Insert fraction template (Phase 3) |

## Symbol Palette Categories

| Category | Key Symbols |
|----------|-------------|
| Greek | α β γ δ ε θ λ π σ φ ω Γ Δ Θ Σ Ω |
| Operators | + − × ÷ · ± ∓ ∪ ∩ ⊕ ⊗ |
| Relations | = ≠ ≡ ≈ < > ≤ ≥ ∈ ⊂ ⊆ |
| Arrows | → ← ↔ ⇒ ⇐ ⇔ ↑ ↓ ↦ |
| Brackets | ( ) [ ] { } ⟨ ⟩ ⌊ ⌋ ⌈ ⌉ |
| Calculus | ∫ ∬ ∮ ∑ ∏ lim d∂ ∇ |
| Structures | frac, sqrt, matrix, cases, binom |
| Functions | sin cos tan log ln exp det |
| Accents | hat, bar, vec, dot, tilde |
| Chemistry | \ce{H2O}, →, ⇌, bonds, states |
| Logic | ∀ ∃ ¬ ∧ ∨ ⊢ ℕ ℤ ℝ ℂ |
| Misc | ∞ ∅ ℏ ℓ ∂ spaces dots |

## Styling Controls

| Button | LaTeX Command | Description |
|--------|---------------|-------------|
| Color | `\textcolor{#hex}{...}` | Foreground colour |
| Bold | `\mathbf{...}` | Bold math |
| Size | `\large{...}` etc. | Font size |
| Highlight | `\colorbox{#hex}{...}` | Background colour |
| Boxed | `\boxed{...}` | Box around expression |
| Cancel | `\cancel{...}` | Diagonal strikethrough |

## DiagramEngine Embedding

```javascript
// Register as embeddable component
engine.registerEmbeddableComponent("latexeditor", {
    factory: "createLatexEditor",
    label: "Equation",
    icon: "bi-calculator",
    category: "data",
    defaultWidth: 300,
    defaultHeight: 80,
});
```

In view mode, equations render as lightweight KaTeX HTML (no MathLive loaded).
Double-click enters interactive edit mode with the full editor.
