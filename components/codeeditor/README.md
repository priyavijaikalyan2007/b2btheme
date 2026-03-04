# CodeEditor

Bootstrap 5-themed code editor wrapping CodeMirror 6 with syntax highlighting, toolbar, and diagnostics.

## Prerequisites

**CodeMirror 6 is required.** The component checks for `window.EditorView` and `window.EditorState` at `show()` time. If these globals are missing, it displays an error message instead of rendering an editor.

### Required Globals

| Global | Package | Role |
|--------|---------|------|
| `EditorView` | `@codemirror/view` | Core view (required) |
| `EditorState` | `@codemirror/state` | Core state (required) |

### Recommended Globals

These are optional but provide the full editing experience:

| Global | Package | Role |
|--------|---------|------|
| `keymap`, `defaultKeymap` | `@codemirror/view` | Key binding support |
| `history`, `historyKeymap` | `@codemirror/commands` | Undo/redo |
| `undo`, `redo`, `indentSelection` | `@codemirror/commands` | Editing commands |
| `syntaxHighlighting`, `defaultHighlightStyle` | `@codemirror/language` | Syntax colours |
| `lineNumbers`, `drawSelection`, `dropCursor` | `@codemirror/view` | UI features |
| `bracketMatching`, `closeBrackets`, `closeBracketsKeymap` | `@codemirror/autocomplete` | Bracket handling |
| `highlightActiveLine`, `highlightSelectionMatches` | `@codemirror/view` / `@codemirror/search` | Highlighting |
| `search`, `searchKeymap` | `@codemirror/search` | Find/replace |
| `indentOnInput` | `@codemirror/language` | Auto-indent |
| `setDiagnostics` | `@codemirror/lint` | Gutter diagnostics |

### Language Globals

Add language support by exposing factory functions as globals:

| Global | Package |
|--------|---------|
| `javascript` | `@codemirror/lang-javascript` |
| `json` | `@codemirror/lang-json` |
| `yaml` | `@codemirror/lang-yaml` (community) |
| `html` | `@codemirror/lang-html` |
| `css` | `@codemirror/lang-css` |
| `sql` | `@codemirror/lang-sql` |
| `python` | `@codemirror/lang-python` |
| `markdown` | `@codemirror/lang-markdown` |

### Loading via ESM CDN

CodeMirror 6 is ESM-native. Use a `<script type="module">` with an ESM CDN to expose globals:

```html
<script type="module">
    import { EditorView, keymap, lineNumbers, drawSelection, dropCursor,
             highlightActiveLine, highlightSelectionMatches }
        from "https://esm.sh/@codemirror/view@6";
    import { EditorState } from "https://esm.sh/@codemirror/state@6";
    import { history, historyKeymap, defaultKeymap, undo, redo, indentSelection }
        from "https://esm.sh/@codemirror/commands@6";
    import { syntaxHighlighting, defaultHighlightStyle, indentOnInput }
        from "https://esm.sh/@codemirror/language@6";
    import { search, searchKeymap } from "https://esm.sh/@codemirror/search@6";
    import { closeBrackets, closeBracketsKeymap } from "https://esm.sh/@codemirror/autocomplete@6";
    import { bracketMatching } from "https://esm.sh/@codemirror/language@6";
    import { javascript } from "https://esm.sh/@codemirror/lang-javascript@6";
    import { json } from "https://esm.sh/@codemirror/lang-json@6";
    import { html } from "https://esm.sh/@codemirror/lang-html@6";
    import { css } from "https://esm.sh/@codemirror/lang-css@6";
    import { sql } from "https://esm.sh/@codemirror/lang-sql@6";
    import { python } from "https://esm.sh/@codemirror/lang-python@6";
    import { markdown } from "https://esm.sh/@codemirror/lang-markdown@6";

    // Expose as globals for CodeEditor
    Object.assign(window, {
        EditorView, EditorState, keymap, lineNumbers, drawSelection, dropCursor,
        highlightActiveLine, highlightSelectionMatches, history, historyKeymap,
        defaultKeymap, undo, redo, indentSelection, syntaxHighlighting,
        defaultHighlightStyle, indentOnInput, search, searchKeymap,
        closeBrackets, closeBracketsKeymap, bracketMatching,
        javascript, json, html, css, sql, python, markdown
    });
    window.dispatchEvent(new Event("codemirror-ready"));
</script>
```

Alternatively, provide a pre-bundled UMD build that sets these globals.

## Quick Start

```html
<link rel="stylesheet" href="components/codeeditor/codeeditor.css">
<script src="components/codeeditor/codeeditor.js"></script>
<script>
    var editor = createCodeEditor("my-container", {
        value: "function greet() {\n    console.log('Hello!');\n}",
        language: "javascript",
        onSave: function(value) { console.log("Saved:", value); }
    });
</script>
```

## API

### `CodeEditorOptions`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `value` | `string` | `""` | Initial text content |
| `language` | `CodeEditorLanguage` | `"javascript"` | Syntax highlighting language |
| `readOnly` | `boolean` | `false` | Read-only mode |
| `lineNumbers` | `boolean` | `true` | Show line numbers (CM mode only) |
| `wordWrap` | `boolean` | `false` | Enable word wrap |
| `tabSize` | `number` | `4` | Spaces per tab |
| `placeholder` | `string` | — | Placeholder text |
| `height` | `string` | `"300px"` | Editor height |
| `maxHeight` | `string` | — | Max height for auto-grow |
| `autoGrow` | `boolean` | `false` | Grow height with content |
| `theme` | `"light" \| "dark"` | `"light"` | Theme mode |
| `showToolbar` | `boolean` | `true` | Show toolbar |
| `toolbarActions` | `CodeEditorToolbarAction[]` | All actions | Which toolbar actions to show |
| `diagnostics` | `CodeEditorDiagnostic[]` | `[]` | Initial diagnostics (CM mode only) |
| `disabled` | `boolean` | `false` | Disabled state |
| `cssClass` | `string` | — | Additional CSS class |

### Callbacks

| Callback | Signature | Description |
|----------|-----------|-------------|
| `onChange` | `(value: string) => void` | Content changed (100ms debounce) |
| `onSave` | `(value: string) => void` | Ctrl+S pressed |
| `onLanguageChange` | `(lang) => void` | Language changed via toolbar |
| `onFocus` | `() => void` | Editor focused |
| `onBlur` | `() => void` | Editor blurred |

### Methods

| Method | Description |
|--------|-------------|
| `show(containerId)` | Render into container, detect CodeMirror |
| `hide()` | Remove from DOM, preserve state |
| `destroy()` | Clean up all resources |
| `getElement()` | Get root DOM element |
| `getValue()` | Get editor content |
| `setValue(value)` | Set editor content |
| `getLanguage()` | Get current language |
| `setLanguage(lang)` | Change language |
| `setReadOnly(readOnly)` | Toggle read-only |
| `setTheme(theme)` | Switch light/dark |
| `setDiagnostics(diags)` | Set gutter diagnostics (CM mode only) |
| `clearDiagnostics()` | Clear all diagnostics |
| `focus()` / `blur()` | Focus management |
| `getSelection()` | Get selected text |
| `replaceSelection(text)` | Replace selection |
| `undo()` / `redo()` | Undo/redo |
| `format()` | Auto-indent (CM mode only) |
| `toggleWordWrap()` | Toggle word wrap |
| `toggleLineNumbers()` | Toggle line numbers |
| `getEditorInstance()` | Get raw CodeMirror EditorView |

## Features

- **Syntax highlighting** — JavaScript, TypeScript, JSON, YAML, HTML, CSS, SQL, Python, Markdown
- **Toolbar** — Language selector, undo/redo, word wrap, copy, format, save
- **Light & dark themes** — CSS custom properties integrating with Bootstrap variables
- **Diagnostics** — Gutter markers for errors, warnings, info (CodeMirror mode)
- **Copy to clipboard** — With visual checkmark feedback
- **Auto-grow** — Height adjusts with content up to maxHeight
- **Read-only mode** — Editing blocked, copy/save still available
- **Tab handling** — Tab inserts spaces (respects tabSize)
- **Ctrl+S** — Fires onSave callback

## Keyboard

| Key | Action |
|-----|--------|
| Ctrl/Cmd + S | Save |
| Ctrl/Cmd + Z | Undo |
| Ctrl/Cmd + Shift + Z | Redo |
| Ctrl/Cmd + F | Find (CM mode) |
| Tab | Indent / insert spaces |
| Shift + Tab | Outdent |

## Accessibility

- `role="group"` with `aria-label="Code editor"` on root
- `role="toolbar"` with `aria-label="Editor actions"` on toolbar
- `aria-label` on all buttons and the language selector
- `aria-pressed` on word wrap toggle
- `aria-readonly` and `aria-disabled` states
- Live region for language change and diagnostic announcements
