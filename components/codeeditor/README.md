# CodeEditor

Bootstrap 5-themed code editor wrapping CodeMirror 6 with syntax highlighting, toolbar, diagnostics, and graceful textarea fallback when CodeMirror is not loaded.

## Quick Start

```html
<link rel="stylesheet" href="dist/components/codeeditor/codeeditor.css">
<script src="dist/components/codeeditor/codeeditor.js"></script>
<script>
    var editor = createCodeEditor("my-container", {
        value: "function greet() {\n    console.log('Hello!');\n}",
        language: "javascript",
        onSave: function(value) { console.log("Saved:", value); }
    });
</script>
```

## CodeMirror 6 Integration

When CodeMirror 6 is loaded on the page (exposing `EditorView` and `EditorState` as globals), the component uses the full rich editor with syntax highlighting, line numbers, and gutter diagnostics. Without CodeMirror, a styled monospace `<textarea>` fallback provides basic editing.

### Loading CodeMirror

CodeMirror 6 is ESM-native. To use the rich editor, provide a pre-bundled UMD version or use importmaps to expose the required globals. The component checks for `window.EditorView` and `window.EditorState` at `show()` time.

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
| `undo()` / `redo()` | Undo/redo (both modes) |
| `format()` | Auto-indent (CM mode only) |
| `toggleWordWrap()` | Toggle word wrap |
| `toggleLineNumbers()` | Toggle line numbers |
| `getEditorInstance()` | Get raw CodeMirror EditorView |

## Features

- **Syntax highlighting** — JavaScript, TypeScript, JSON, YAML, HTML, CSS, SQL, Python, Markdown
- **Toolbar** — Language selector, undo/redo, word wrap, copy, format, save
- **Light & dark themes** — CSS custom properties integrating with Bootstrap variables
- **Diagnostics** — Gutter markers for errors, warnings, info (CodeMirror mode)
- **Fallback textarea** — Monospace styled textarea when CodeMirror is not available
- **Copy to clipboard** — With visual checkmark feedback
- **Auto-grow** — Height adjusts with content up to maxHeight
- **Read-only mode** — Editing blocked, copy/save still available
- **Tab handling** — Tab inserts spaces (respects tabSize) in both modes
- **Ctrl+S** — Fires onSave callback in both modes

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
