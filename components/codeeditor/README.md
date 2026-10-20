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

### Loading CodeMirror 6

CodeMirror 6 is vendored. Fourteen packages are bundled into one
self-contained file served from this origin, and that file carries a
Subresource Integrity hash. **One tag, and it publishes every global
CodeEditor needs.**

```html
<script src="https://static.knobby.io/lib/codemirror6-6.43.15.js"
        integrity="sha384-At2UiJ40/DCV2QBhVybjjxrQ2G/7hm/BOBWxdMSnxFNpJgNoscYBGDvvQx1bb1vI"
        crossorigin="anonymous"></script>
<script src="components/codeeditor/codeeditor.js"></script>
```

No import block and no `Object.assign(window, ...)` glue. The bundle
publishes the thirty names CodeEditor probes for, including the two
renames described below.

`crossorigin="anonymous"` is not decoration. Without it the browser makes
an opaque request, cannot read the body to hash it, and SKIPS the
integrity check rather than failing it.

### What is inside, and at which versions

The filename carries `@codemirror/view`'s version because fourteen
packages ship on their own release trains and one filename cannot name
them all. `dist/lib-manifest.json` records every member version, so what
is in the file is auditable without unpacking it.

- `@codemirror/autocomplete` 6.20.4
- `@codemirror/commands` 6.11.1
- `@codemirror/lang-css` 6.3.1
- `@codemirror/lang-html` 6.4.12
- `@codemirror/lang-javascript` 6.2.5
- `@codemirror/lang-json` 6.0.2
- `@codemirror/lang-markdown` 6.5.2
- `@codemirror/lang-python` 6.2.1
- `@codemirror/lang-sql` 6.10.0
- `@codemirror/language` 6.13.1
- `@codemirror/lint` 6.9.7
- `@codemirror/search` 6.7.2
- `@codemirror/state` 6.7.6
- `@codemirror/view` 6.43.15

### Two globals are renamed, and the reason is not cosmetic

`history` is published as **`cmHistory`** and `search` as **`cmSearch`**.

`window.history` is the browser's own History object and is a read-only
accessor on `Window`. Assigning CodeMirror's `history` over it **silently
fails**, so a page that publishes the bare name ends up with no undo
history at all and no error to explain it. This README recommended
exactly that until 2026-10-20. If you wrote your own glue from an older
copy of this file, check for it.

### Subresource integrity, and why this changed

Every third-party library this repository recommends carries an
`integrity` hash recorded in `scripts/third-party-sri.json`. CodeMirror 6
used to be the exception, and the reason was structural: an `integrity`
attribute attaches to a `<script src>` tag and cannot attach to an import
specifier inside a module. Fourteen dynamic imports of esm.sh URLs
therefore arrived unverified, and the specifiers floated at major `@6`,
so the version was chosen at request time rather than here.

Bundling the closure into one file and hashing that file is what removed
the exception. The build is `scripts/vendor-closure.mjs`, which asserts
the closure from esbuild's metafile rather than by grepping the output,
and refuses to publish an asset that still resolves anything at runtime.

Recorded as DEBT-SEC-5 and DEBT-SEC-9, both closed by ADR-211.

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

### Methods that need CodeMirror

`undo`, `redo`, `format`, `getSelection`, `replaceSelection`, `focus`,
`blur`, `setDiagnostics`, `toggleWordWrap` and `toggleLineNumbers`
**throw** when CodeMirror did not load, naming the method and the module
to load. The mount already shows a missing-dependency notice in the
container, so a caller reaching one of these has acted on an editor that
is displaying an error.

`toggleWordWrap` joined that list in DEBT-CE-1. It used to flip the
button to `aria-pressed="true"` over an editor that had wrapped nothing.
Word wrap also needs `EditorView.lineWrapping`, and a view bundle that
does not export it now refuses rather than mounting with the button
pressed.

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
