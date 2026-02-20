<!-- AGENT: Product Requirements Document for the CodeEditor component — a Bootstrap 5-themed wrapper around CodeMirror 6 for syntax-highlighted code editing with toolbar, diagnostics, and graceful fallback. -->

# CodeEditor Component

**Status:** Draft
**Component name:** CodeEditor
**Folder:** `./components/codeeditor/`
**Spec author:** Agent
**Date:** 2026-02-20

---

## 1. Overview

### 1.1 What Is It

A Bootstrap 5-themed code editor component that wraps CodeMirror 6 to provide syntax-highlighted, language-aware editing within enterprise SaaS applications. The component delivers:

1. Syntax highlighting for JavaScript, TypeScript, JSON, YAML, HTML, CSS, SQL, Python, and Markdown
2. An optional toolbar with common editor actions (copy, format, undo/redo, word wrap toggle, language selector)
3. Line numbers (toggleable)
4. Read-only mode for displaying code without editing
5. Word wrap toggle
6. Find/Replace via CodeMirror's built-in search
7. Light and dark theme modes that integrate with Bootstrap CSS variables
8. Fixed-height or auto-grow sizing
9. Gutter markers for consumer-provided diagnostics (errors, warnings, info)
10. Graceful fallback to a styled `<textarea>` with monospace font when CodeMirror is not loaded

### 1.2 Why Build It

Enterprise SaaS applications frequently need embedded code editors for:

- Configuration editing (JSON, YAML, TOML)
- Script authoring (JavaScript, Python, SQL)
- Template editing (HTML, CSS, Markdown)
- API request/response inspection (JSON payloads)
- Log and error message display (read-only code blocks)
- Schema and query editors (SQL, GraphQL)

A lightweight, CDN-loadable wrapper with Bootstrap 5 theme integration, a fallback mode, and a simple API fills a gap that no existing open-source component addresses for the project's vanilla TypeScript architecture.

### 1.3 Design Inspiration

| Source | Key Pattern Adopted |
|--------|---------------------|
| VS Code | Gutter diagnostics, Ctrl+S save, multi-language support, minimap concept |
| Monaco Editor | Rich IntelliSense-style editing (aspirational reference; we use lighter CodeMirror) |
| CodeMirror.net demos | Extension-based architecture, CDN loading, modular language support |
| Vercel dashboard config editor | Clean toolbar, language selector dropdown, dark/light toggle |
| GitHub code blocks | Line numbers, copy button, syntax highlighting, read-only presentation |
| Replit editor | Auto-grow height, embedded diagnostics panel |

### 1.4 Open Source Evaluation

| Library | Score | Verdict | Reason |
|---------|-------|---------|--------|
| Monaco Editor | 85% | Not selected | 2MB bundle, requires web workers, complex build configuration, overkill for embedded editing |
| CodeMirror 6 | 95% | **Selected** | Modular architecture, CDN-loadable, ~150KB core, excellent extension system, active development, MIT licence |
| Ace Editor | 70% | Not selected | Aging API, less active development, no tree-shaking, limited extension ecosystem |
| CodeFlask | 50% | Not selected | Minimal feature set, no language switching, no diagnostics, limited maintenance |
| Prism.js (highlight only) | 40% | Not selected | Read-only syntax highlighting only, no editing capability |

**Decision (ADR-028):** Use CodeMirror 6 loaded from CDN. The modular extension system allows loading only needed language packages. At ~150KB core (vs Monaco's ~2MB), it avoids web worker complexity and integrates cleanly with the project's CDN-loading pattern established by Vditor in the MarkdownEditor component.

---

## 2. External Dependency

### 2.1 CodeMirror 6

| Property | Value |
|----------|-------|
| Packages | `@codemirror/view`, `@codemirror/state`, `@codemirror/commands`, `@codemirror/language`, `@codemirror/search`, `@codemirror/lint` |
| Version | Latest stable (6.x) |
| Licence | MIT |
| Size | ~150KB core (minified + gzipped) |
| CDN | `https://unpkg.com/@codemirror/` or bundled UMD |

### 2.2 Language Packages

| Language | CDN Package |
|----------|-------------|
| JavaScript | `@codemirror/lang-javascript` |
| TypeScript | `@codemirror/lang-javascript` (with `typescript: true` option) |
| JSON | `@codemirror/lang-json` |
| YAML | `@codemirror/lang-yaml` |
| HTML | `@codemirror/lang-html` |
| CSS | `@codemirror/lang-css` |
| SQL | `@codemirror/lang-sql` |
| Python | `@codemirror/lang-python` |
| Markdown | `@codemirror/lang-markdown` |

Language packages are loaded from CDN by the consumer page. The component detects available language support at runtime and falls back to plain text if a requested language package is not loaded.

### 2.3 Loading Strategy

CodeMirror 6 is loaded via CDN `<script>` tags by the consumer page, following the same pattern as Vditor in the MarkdownEditor component. The component checks for the global `EditorView` (or a configured namespace) at initialisation.

```html
<!-- CodeMirror core -->
<script src="https://unpkg.com/@codemirror/view/dist/index.cjs"></script>
<script src="https://unpkg.com/@codemirror/state/dist/index.cjs"></script>
<script src="https://unpkg.com/@codemirror/commands/dist/index.cjs"></script>
<script src="https://unpkg.com/@codemirror/language/dist/index.cjs"></script>
<script src="https://unpkg.com/@codemirror/search/dist/index.cjs"></script>
<script src="https://unpkg.com/@codemirror/lint/dist/index.cjs"></script>

<!-- Language packages (load as needed) -->
<script src="https://unpkg.com/@codemirror/lang-javascript/dist/index.cjs"></script>
<script src="https://unpkg.com/@codemirror/lang-json/dist/index.cjs"></script>
```

**Note:** The exact CDN URLs and UMD bundle strategy will be finalised during implementation. CodeMirror 6 is ESM-native; a UMD wrapper or pre-bundled distribution may be needed for script-tag loading. The component's detection logic checks for the presence of `EditorView` on `window` or a configured global namespace.

---

## 3. Anatomy

### 3.1 Full Editor with Toolbar

```
+-----------------------------------------------------------------+
| [JavaScript v] | [Undo] [Redo] | [Wrap] | [Copy] [Format] [Save] | <-- toolbar
+-----------------------------------------------------------------+
|  1 | function greet(name)                                        |
|  2 | {                                                           |
|  3 |     console.log(`Hello, ${name}!`);                         |
|  4 | }                                                           |
|  5 |                                                             |
| *6 | greet(42); // type error                                    | <-- gutter diagnostic marker
|  7 |                                                             |
+-----------------------------------------------------------------+
```

### 3.2 Fallback Mode (No CodeMirror)

```
+-----------------------------------------------------------------+
| Code Editor (CodeMirror not loaded)          [Copy]       [Save] |
+-----------------------------------------------------------------+
| function greet(name)                                             |
| {                                                                |
|     console.log(`Hello, ${name}!`);                              |
| }                                                                |
+-----------------------------------------------------------------+
```

### 3.3 Element Breakdown

| Element | Required | Description |
|---------|----------|-------------|
| Root container | Yes | `div.codeeditor` wrapping the entire component |
| Toolbar | Optional | `div.codeeditor-toolbar` with action buttons and language selector |
| Language selector | Optional | `select.codeeditor-lang-select` dropdown in the toolbar |
| Undo button | Optional | Toolbar button for undo action |
| Redo button | Optional | Toolbar button for redo action |
| Word wrap toggle | Optional | Toolbar toggle button for word wrap |
| Copy button | Optional | Toolbar button to copy editor content to clipboard |
| Format button | Optional | Toolbar button to auto-format/indent code |
| Save button | Optional | Toolbar button that fires `onSave` callback |
| Editor area | Yes | `div.codeeditor-editor` — CodeMirror mount point or fallback `<textarea>` |
| Gutter | Conditional | CodeMirror gutter with line numbers and diagnostic markers |
| Diagnostic marker | Conditional | Gutter dot/icon indicating error, warning, or info on a line |
| Fallback textarea | Conditional | `textarea.codeeditor-fallback` — monospace styled textarea when CodeMirror is unavailable |
| Fallback header | Conditional | `div.codeeditor-fallback-header` — simplified toolbar in fallback mode |

---

## 4. API

### 4.1 Interfaces

```typescript
/** Severity level for a diagnostic annotation. */
type CodeEditorSeverity = "error" | "warning" | "info";

/** A single diagnostic annotation displayed in the gutter. */
interface CodeEditorDiagnostic
{
    /** 1-based line number where the diagnostic applies. */
    line: number;

    /** 1-based column number (optional; for tooltip positioning). */
    column?: number;

    /** Human-readable diagnostic message. */
    message: string;

    /** Severity level. Determines gutter marker colour. */
    severity: CodeEditorSeverity;
}

/** Supported language identifiers. */
type CodeEditorLanguage =
    | "javascript"
    | "typescript"
    | "json"
    | "yaml"
    | "html"
    | "css"
    | "sql"
    | "python"
    | "markdown"
    | "plaintext";

/** Toolbar action identifiers for the toolbarActions option. */
type CodeEditorToolbarAction =
    | "language"
    | "undo"
    | "redo"
    | "wordwrap"
    | "copy"
    | "format"
    | "save";

/** Configuration options for the CodeEditor component. */
interface CodeEditorOptions
{
    /** Initial text content. Default: "". */
    value?: string;

    /** Initial language mode. Default: "javascript". */
    language?: CodeEditorLanguage;

    /** Read-only mode. Default: false. */
    readOnly?: boolean;

    /** Show line numbers in the gutter. Default: true. */
    lineNumbers?: boolean;

    /** Enable word wrap. Default: false. */
    wordWrap?: boolean;

    /** Number of spaces per tab. Default: 4. */
    tabSize?: number;

    /** Placeholder text shown when editor is empty. Default: none. */
    placeholder?: string;

    /** CSS height value. Default: "300px". */
    height?: string;

    /** CSS max-height for auto-grow mode. Default: none. */
    maxHeight?: string;

    /** Grow editor height with content. Default: false. */
    autoGrow?: boolean;

    /** Theme mode. Default: "light". */
    theme?: "light" | "dark";

    /** Show the toolbar above the editor. Default: true. */
    showToolbar?: boolean;

    /**
     * Which toolbar actions to display.
     * Default: ["language", "undo", "redo", "wordwrap", "copy", "format", "save"].
     */
    toolbarActions?: CodeEditorToolbarAction[];

    /** Initial diagnostics to display in the gutter. Default: []. */
    diagnostics?: CodeEditorDiagnostic[];

    /** Disabled state. Prevents all interaction. Default: false. */
    disabled?: boolean;

    /** Additional CSS class(es) on the root element. */
    cssClass?: string;

    /** Called when the editor content changes. */
    onChange?: (value: string) => void;

    /** Called when Ctrl+S / Cmd+S is pressed. */
    onSave?: (value: string) => void;

    /** Called when the language is changed via the toolbar selector. */
    onLanguageChange?: (language: CodeEditorLanguage) => void;

    /** Called when the editor receives focus. */
    onFocus?: () => void;

    /** Called when the editor loses focus. */
    onBlur?: () => void;
}
```

### 4.2 Class: CodeEditor

| Method | Signature | Description |
|--------|-----------|-------------|
| `constructor` | `(options: CodeEditorOptions)` | Creates the editor DOM tree. Does not attach to the page. |
| `show` | `(containerId: string)` | Appends the editor to the container element identified by ID. Initialises CodeMirror if available. |
| `hide` | `()` | Removes from DOM without destroying state. |
| `destroy` | `()` | Hides, removes all event listeners, destroys CodeMirror instance, nulls references. |
| `getElement` | `(): HTMLElement` | Returns the root `div.codeeditor` DOM element. |
| `getValue` | `(): string` | Returns the current editor content as a string. |
| `setValue` | `(value: string): void` | Replaces all editor content. Fires `onChange` if content differs. |
| `getLanguage` | `(): CodeEditorLanguage` | Returns the current language mode. |
| `setLanguage` | `(lang: CodeEditorLanguage): void` | Changes the syntax highlighting language. Updates toolbar selector. Fires `onLanguageChange`. |
| `setReadOnly` | `(readOnly: boolean): void` | Toggles read-only mode. Updates `aria-readonly`. |
| `setTheme` | `(theme: "light" \| "dark"): void` | Switches between light and dark theme. |
| `setDiagnostics` | `(diagnostics: CodeEditorDiagnostic[]): void` | Sets gutter diagnostic markers. Replaces any existing diagnostics. |
| `clearDiagnostics` | `(): void` | Removes all diagnostic markers from the gutter. |
| `focus` | `(): void` | Moves keyboard focus into the editor. |
| `blur` | `(): void` | Removes keyboard focus from the editor. |
| `getSelection` | `(): string` | Returns the currently selected text, or empty string if no selection. |
| `replaceSelection` | `(text: string): void` | Replaces the current selection with the given text. No-op in read-only mode. |
| `undo` | `(): void` | Undoes the last edit. No-op in read-only mode. |
| `redo` | `(): void` | Redoes the last undone edit. No-op in read-only mode. |
| `format` | `(): void` | Auto-indents the entire document using CodeMirror's indentation commands. No-op in fallback mode. |
| `toggleWordWrap` | `(): void` | Toggles word wrap on/off. Updates toolbar toggle state. |
| `toggleLineNumbers` | `(): void` | Toggles line number gutter visibility. |
| `getEditorInstance` | `(): unknown \| null` | Returns the raw CodeMirror `EditorView` instance for advanced consumer use, or `null` in fallback mode. |

### 4.3 Convenience Functions

| Function | Description |
|----------|-------------|
| `createCodeEditor(containerId, options?)` | Creates a CodeEditor, calls `show(containerId)`, and returns the instance. |

### 4.4 Global Exports

```typescript
window.CodeEditor = CodeEditor;
window.createCodeEditor = createCodeEditor;
```

---

## 5. Behaviour

### 5.1 Lifecycle

1. **Construction** -- Builds the full DOM tree (toolbar, editor area). Does not attach to the page. Does not initialise CodeMirror.
2. **show(containerId)** -- Resolves the container element by ID. Appends the root element. Checks for CodeMirror availability. If available, creates an `EditorView` instance within `.codeeditor-editor`. If not available, creates a fallback `<textarea>`. Logs the initialisation mode.
3. **hide()** -- Removes from DOM. Preserves content and state. CodeMirror instance remains alive.
4. **destroy()** -- Calls `hide()`. Destroys the CodeMirror `EditorView` (calls `.destroy()`). Removes all event listeners. Sets `destroyed` flag. Nulls internal references. Subsequent method calls log a warning and no-op.

### 5.2 CodeMirror Detection

At `show()` time, the component checks for CodeMirror availability:

```typescript
const cmAvailable = typeof EditorView !== "undefined";
```

If CodeMirror is available, the editor initialises with the full feature set. If not, it falls back to a styled `<textarea>`. The detection is logged:

- Available: `console.log(LOG_PREFIX, "CodeMirror 6 detected, initialising rich editor")`
- Not available: `console.warn(LOG_PREFIX, "CodeMirror 6 not loaded, using textarea fallback")`

### 5.3 Language Switching

When `setLanguage()` is called:

1. Check if the requested language package is available (e.g., `javascript()` function exists on the global scope or language registry).
2. If available, reconfigure the CodeMirror state with the new language extension.
3. If not available, log a warning and fall back to plain text mode: `console.warn(LOG_PREFIX, "Language package not loaded:", lang)`.
4. Update the toolbar language selector dropdown to reflect the current language.
5. Fire `onLanguageChange` callback.

### 5.4 Toolbar

When `showToolbar` is true (default), a toolbar bar renders above the editor area. The toolbar contains only the actions specified in `toolbarActions`.

| Action | Element | Behaviour |
|--------|---------|-----------|
| `language` | `<select>` dropdown | Switches language mode. Only lists languages whose packages are loaded. |
| `undo` | Button (`bi-arrow-counterclockwise`) | Calls `undo()`. Disabled when undo stack is empty or read-only. |
| `redo` | Button (`bi-arrow-clockwise`) | Calls `redo()`. Disabled when redo stack is empty or read-only. |
| `wordwrap` | Toggle button (`bi-text-wrap`) | Calls `toggleWordWrap()`. Active state reflects current wrap mode. |
| `copy` | Button (`bi-clipboard`) | Copies full editor content to clipboard via `navigator.clipboard.writeText()`. |
| `format` | Button (`bi-indent`) | Calls `format()`. Disabled in read-only or fallback mode. |
| `save` | Button (`bi-floppy`) | Fires `onSave(getValue())`. Disabled when `onSave` is not configured. |

Toolbar buttons use Bootstrap icon classes and are compact (28px height) to minimise visual footprint.

### 5.5 Diagnostics

Consumer-provided `CodeEditorDiagnostic` objects are rendered as gutter markers in the CodeMirror gutter:

| Severity | Gutter Marker | Tooltip |
|----------|---------------|---------|
| `error` | Red circle (`$danger`) | Diagnostic message text |
| `warning` | Orange triangle (`$warning`) | Diagnostic message text |
| `info` | Blue circle (`$info`) | Diagnostic message text |

Diagnostics are rendered using CodeMirror's `@codemirror/lint` extension. Each marker is a clickable gutter decoration. Clicking a marker selects the line and shows the diagnostic message in a tooltip.

In fallback mode, diagnostics are not rendered (the textarea has no gutter). A console warning is logged if diagnostics are set in fallback mode.

### 5.6 Read-Only Mode

When `readOnly` is true:

- CodeMirror is configured with `EditorView.editable.of(false)` and `EditorState.readOnly.of(true)`.
- Toolbar editing actions (undo, redo, format) are disabled.
- Copy and save actions remain enabled.
- The editor root receives `.codeeditor-readonly` class.
- `aria-readonly="true"` is set on the editor root.
- In fallback mode, the `<textarea>` receives the `readonly` attribute.

### 5.7 Word Wrap

Word wrap is controlled via CodeMirror's `EditorView.lineWrapping` extension:

- When enabled, lines wrap at the editor boundary. No horizontal scrollbar appears.
- When disabled, lines extend beyond the editor boundary with a horizontal scrollbar.
- The toolbar word wrap button reflects the current state (active/inactive toggle).

### 5.8 Auto-Grow Mode

When `autoGrow` is true:

- The editor height adjusts dynamically based on content line count.
- Minimum height is the value of `height` (default: "300px").
- Maximum height is the value of `maxHeight` (if set). Beyond this, the editor scrolls.
- Height is recalculated on every content change via CodeMirror's update listener.

### 5.9 Theme Modes

The component supports two theme modes that integrate with Bootstrap CSS variables:

**Light theme** (default):
- Editor background: `$gray-50`
- Text colour: `$gray-900`
- Gutter background: `$gray-100`
- Line number colour: `$gray-400`
- Selection: `$blue-100`
- Cursor: `$gray-900`

**Dark theme:**
- Editor background: `$gray-900`
- Text colour: `$gray-100`
- Gutter background: `$gray-800`
- Line number colour: `$gray-500`
- Selection: `$blue-900`
- Cursor: `$gray-100`

Theme colours are injected into CodeMirror's theme extension using the project's Bootstrap SCSS variables, ensuring visual consistency with the rest of the application. The theme class (`.codeeditor-light` or `.codeeditor-dark`) is applied to the root container.

### 5.10 Disabled State

When `disabled` is true:

- The entire component is visually dimmed (opacity 0.5).
- All interactions are suppressed (pointer-events: none on the editor area).
- Toolbar buttons are all disabled.
- The root receives `.codeeditor-disabled` class.
- `aria-disabled="true"` is set on the root.

### 5.11 Fallback Mode

When CodeMirror is not loaded, the component renders a functional but simplified editor:

1. A `<textarea>` with monospace font (`$font-family-monospace`) replaces the CodeMirror editor.
2. A simplified toolbar header shows "Code Editor (CodeMirror not loaded)" text with only Copy and Save buttons.
3. The textarea supports all text operations natively (undo/redo via browser, select all, etc.).
4. `getValue()` and `setValue()` operate on the textarea's `value` property.
5. `onChange` fires on the textarea's `input` event.
6. Line numbers, diagnostics, format, and language-specific highlighting are not available.
7. Word wrap is controlled via the textarea's CSS `white-space` property.
8. Auto-grow adjusts the textarea's `rows` attribute based on content line count.

### 5.12 Copy to Clipboard

The copy action uses the Clipboard API:

```typescript
navigator.clipboard.writeText(this.getValue())
    .then(() =>
    {
        console.debug(LOG_PREFIX, "Content copied to clipboard");
    })
    .catch((err) =>
    {
        console.warn(LOG_PREFIX, "Clipboard write failed:", err);
    });
```

On successful copy, the copy button icon briefly changes to a checkmark (`bi-check`) for 1500ms as visual feedback, then reverts to the clipboard icon.

---

## 6. DOM Structure

### 6.1 Full Editor (CodeMirror Mode)

```html
<div class="codeeditor codeeditor-light"
     role="group" aria-label="Code editor">

    <!-- Toolbar -->
    <div class="codeeditor-toolbar" role="toolbar" aria-label="Editor actions">
        <select class="codeeditor-lang-select form-select form-select-sm"
                aria-label="Programming language"
                role="combobox">
            <option value="javascript" selected>JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="json">JSON</option>
            <option value="yaml">YAML</option>
            <option value="html">HTML</option>
            <option value="css">CSS</option>
            <option value="sql">SQL</option>
            <option value="python">Python</option>
            <option value="markdown">Markdown</option>
        </select>

        <div class="codeeditor-toolbar-divider" role="separator"></div>

        <button class="codeeditor-toolbar-btn" type="button"
                data-action="undo" aria-label="Undo" tabindex="-1">
            <i class="bi bi-arrow-counterclockwise"></i>
        </button>
        <button class="codeeditor-toolbar-btn" type="button"
                data-action="redo" aria-label="Redo" tabindex="-1">
            <i class="bi bi-arrow-clockwise"></i>
        </button>

        <div class="codeeditor-toolbar-divider" role="separator"></div>

        <button class="codeeditor-toolbar-btn codeeditor-toolbar-btn-active" type="button"
                data-action="wordwrap" aria-label="Toggle word wrap"
                aria-pressed="false" tabindex="-1">
            <i class="bi bi-text-wrap"></i>
        </button>

        <div class="codeeditor-toolbar-divider" role="separator"></div>

        <button class="codeeditor-toolbar-btn" type="button"
                data-action="copy" aria-label="Copy to clipboard" tabindex="-1">
            <i class="bi bi-clipboard"></i>
        </button>
        <button class="codeeditor-toolbar-btn" type="button"
                data-action="format" aria-label="Format code" tabindex="-1">
            <i class="bi bi-indent"></i>
        </button>
        <button class="codeeditor-toolbar-btn" type="button"
                data-action="save" aria-label="Save" tabindex="-1">
            <i class="bi bi-floppy"></i>
        </button>
    </div>

    <!-- Editor area (CodeMirror mounts here) -->
    <div class="codeeditor-editor"
         role="textbox" aria-multiline="true"
         aria-label="Code input">
        <!-- CodeMirror EditorView DOM inserted here -->
    </div>
</div>
```

### 6.2 Fallback Mode (No CodeMirror)

```html
<div class="codeeditor codeeditor-light codeeditor-fallback-mode"
     role="group" aria-label="Code editor">

    <!-- Simplified toolbar -->
    <div class="codeeditor-fallback-header">
        <span class="codeeditor-fallback-label">Code Editor (CodeMirror not loaded)</span>
        <button class="codeeditor-toolbar-btn" type="button"
                data-action="copy" aria-label="Copy to clipboard">
            <i class="bi bi-clipboard"></i>
        </button>
        <button class="codeeditor-toolbar-btn" type="button"
                data-action="save" aria-label="Save">
            <i class="bi bi-floppy"></i>
        </button>
    </div>

    <!-- Fallback textarea -->
    <div class="codeeditor-editor">
        <textarea class="codeeditor-fallback"
                  aria-multiline="true"
                  aria-label="Code input"
                  spellcheck="false"></textarea>
    </div>
</div>
```

### 6.3 Read-Only State

```html
<div class="codeeditor codeeditor-light codeeditor-readonly"
     role="group" aria-label="Code editor" aria-readonly="true">
    <!-- toolbar with editing actions disabled -->
    <!-- editor area with readOnly extensions -->
</div>
```

### 6.4 Diagnostic Gutter Marker

```html
<!-- Rendered within CodeMirror's gutter via the lint extension -->
<div class="codeeditor-diagnostic codeeditor-diagnostic-error"
     title="Expected string but got number"
     aria-label="Error on line 5: Expected string but got number">
</div>
```

---

## 7. Styling

### 7.1 CSS Class Prefix

All custom classes use the `codeeditor-` prefix.

### 7.2 CSS Classes

| Class | Element |
|-------|---------|
| `.codeeditor` | Root container |
| `.codeeditor-light` | Light theme modifier |
| `.codeeditor-dark` | Dark theme modifier |
| `.codeeditor-readonly` | Read-only state modifier |
| `.codeeditor-disabled` | Disabled state modifier |
| `.codeeditor-fallback-mode` | Fallback (no CodeMirror) state modifier |
| `.codeeditor-toolbar` | Toolbar container |
| `.codeeditor-toolbar-btn` | Toolbar action button |
| `.codeeditor-toolbar-btn-active` | Active toggle state on toolbar button |
| `.codeeditor-toolbar-btn-disabled` | Disabled toolbar button |
| `.codeeditor-toolbar-divider` | Vertical divider between toolbar button groups |
| `.codeeditor-lang-select` | Language selector `<select>` dropdown |
| `.codeeditor-editor` | Editor area container (CodeMirror mount point) |
| `.codeeditor-fallback` | Fallback `<textarea>` element |
| `.codeeditor-fallback-header` | Simplified toolbar in fallback mode |
| `.codeeditor-fallback-label` | "CodeMirror not loaded" label text |
| `.codeeditor-diagnostic` | Gutter diagnostic marker base class |
| `.codeeditor-diagnostic-error` | Error severity gutter marker |
| `.codeeditor-diagnostic-warning` | Warning severity gutter marker |
| `.codeeditor-diagnostic-info` | Info severity gutter marker |

### 7.3 Theme Integration

| Property | Light Value | Dark Value | Source / Rationale |
|----------|-------------|------------|---------------------|
| Editor background | `$gray-50` | `$gray-900` | Clean code surface |
| Editor text | `$gray-900` | `$gray-100` | High contrast for readability |
| Gutter background | `$gray-100` | `$gray-800` | Subtle distinction from editor area |
| Line number colour | `$gray-400` | `$gray-500` | Subdued but visible |
| Toolbar background | `$gray-100` | `$gray-800` | Consistent with gutter |
| Toolbar border | `1px solid $gray-300` | `1px solid $gray-600` | Subtle separation |
| Toolbar button hover | `$gray-200` | `$gray-700` | Standard hover pattern |
| Toolbar button active | `$blue-100` bg, `$blue-700` icon | `$blue-900` bg, `$blue-300` icon | Toggle indicator |
| Selection background | `$blue-100` | `$blue-900` | Visible selection highlight |
| Cursor colour | `$gray-900` | `$gray-100` | Matches text colour |
| Diagnostic error marker | `$danger` (#dc3545) | `$danger` | Standard error red |
| Diagnostic warning marker | `$warning` (#ffc107) | `$warning` | Standard warning amber |
| Diagnostic info marker | `$info` (#0dcaf0) | `$info` | Standard info blue |
| Fallback textarea | Inherits editor background/text | Inherits editor background/text | Consistent fallback appearance |
| Border radius | 0 | 0 | Per ADR-003 |
| Font family | `$font-family-monospace` (JetBrains Mono) | Same | Per ADR-009 |
| Font size | 14px | 14px | Per ADR-006 |

### 7.4 Dimensions

| Property | Value |
|----------|-------|
| Default height | 300px |
| Minimum height | 100px |
| Toolbar height | 32px |
| Toolbar button size | 28px x 28px |
| Toolbar icon size | 14px |
| Language select width | 120px |
| Toolbar divider width | 1px |
| Toolbar padding | 2px 4px |
| Gutter width (line numbers) | Auto (CodeMirror managed) |
| Diagnostic marker size | 8px diameter circle |
| Editor padding | 4px 8px |

### 7.5 SCSS Import

```scss
@import '../../src/scss/variables';
```

### 7.6 CodeMirror Theme Override

Bootstrap CSS variables are injected into CodeMirror's theme extension to ensure visual consistency:

```typescript
const bootstrapTheme = EditorView.theme({
    "&":
    {
        backgroundColor: "var(--codeeditor-bg)",
        color: "var(--codeeditor-text)"
    },
    ".cm-gutters":
    {
        backgroundColor: "var(--codeeditor-gutter-bg)",
        borderRight: "1px solid var(--codeeditor-border)"
    },
    ".cm-lineNumbers .cm-gutterElement":
    {
        color: "var(--codeeditor-line-number)"
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground":
    {
        backgroundColor: "var(--codeeditor-selection)"
    },
    ".cm-cursor":
    {
        borderLeftColor: "var(--codeeditor-cursor)"
    }
});
```

CSS custom properties (`--codeeditor-*`) are set on the root `.codeeditor` element and toggled between light/dark values via the theme class.

---

## 8. Keyboard Interaction

### 8.1 Editor Keyboard (CodeMirror Defaults)

All standard CodeMirror keyboard bindings are preserved. The component does not override them.

| Key | Action |
|-----|--------|
| Ctrl/Cmd + Z | Undo |
| Ctrl/Cmd + Shift + Z | Redo |
| Ctrl/Cmd + F | Open Find dialog (CodeMirror built-in) |
| Ctrl/Cmd + H | Open Find and Replace dialog (CodeMirror built-in) |
| Ctrl/Cmd + S | Fire `onSave` callback (custom binding added by the component) |
| Ctrl/Cmd + A | Select all |
| Tab | Indent current line or selection (respects `tabSize`) |
| Shift + Tab | Outdent current line or selection |
| Ctrl/Cmd + ] | Indent line |
| Ctrl/Cmd + [ | Outdent line |
| Ctrl/Cmd + D | Select next occurrence (CodeMirror default) |
| Escape | Close Find/Replace dialog |

### 8.2 Toolbar Keyboard

| Key | Action |
|-----|--------|
| Tab | Move focus into the toolbar (first enabled element) |
| Arrow Left / Arrow Right | Navigate between toolbar buttons |
| Enter / Space | Activate focused toolbar button |
| Shift + Tab | Move focus out of the toolbar into the editor |

### 8.3 Fallback Textarea Keyboard

Standard browser textarea keyboard behaviour applies. Additionally:

| Key | Action |
|-----|--------|
| Ctrl/Cmd + S | Fire `onSave` callback (custom `keydown` listener on textarea) |
| Tab | Insert tab characters (4 spaces, per `tabSize`; prevented from leaving the textarea) |

---

## 9. Accessibility

| Feature | Implementation |
|---------|----------------|
| Editor root | `role="group"` with `aria-label="Code editor"` on the outermost container |
| Editor area | `role="textbox"`, `aria-multiline="true"`, `aria-label="Code input"` |
| Toolbar | `role="toolbar"` with `aria-label="Editor actions"` |
| Language selector | Native `<select>` element with `aria-label="Programming language"` |
| Toolbar buttons | Native `<button>` elements with `aria-label` for each action |
| Word wrap toggle | `aria-pressed="true"` or `"false"` reflecting current state |
| Read-only state | `aria-readonly="true"` on the editor root |
| Disabled state | `aria-disabled="true"` on the editor root |
| Diagnostics | `aria-describedby` on the editor area referencing a visually hidden diagnostics summary, or `aria-errormessage` when errors are present |
| Diagnostic markers | Each marker has `aria-label` with "Error on line N: message" (or Warning/Info) |
| Fallback textarea | Same `aria-multiline="true"`, `aria-label`, and `aria-readonly` attributes as the CodeMirror editor |
| Colour contrast | All text and icon combinations meet WCAG 2.1 AA (4.5:1 minimum) in both light and dark themes |
| Screen reader | A visually hidden live region (`aria-live="polite"`) announces language changes and diagnostic count updates |
| Focus management | After toolbar action, focus returns to the editor. Language selector change returns focus to the editor. |

---

## 10. Error Handling

| Scenario | Response |
|----------|----------|
| CodeMirror not loaded | `console.warn(LOG_PREFIX, "CodeMirror 6 not loaded, using textarea fallback")`. Render fallback textarea. |
| Language package not loaded | `console.warn(LOG_PREFIX, "Language package not loaded:", lang)`. Fall back to plain text. |
| Container not found | `console.error(LOG_PREFIX, "Container element not found:", containerId)`. Return without rendering. |
| Clipboard API unavailable | `console.warn(LOG_PREFIX, "Clipboard API not available")`. Copy button disabled or uses `document.execCommand("copy")` fallback. |
| Invalid language identifier | `console.warn(LOG_PREFIX, "Unknown language:", lang)`. Default to "plaintext". |
| Diagnostics on invalid line | `console.warn(LOG_PREFIX, "Diagnostic line out of range:", line)`. Skip that diagnostic. |
| setValue() after destroy | `console.warn(LOG_PREFIX, "Cannot set value: component destroyed")`. No-op. |
| Clipboard write fails | `console.warn(LOG_PREFIX, "Clipboard write failed:", error)`. No user-visible error. |
| Empty content format | No-op. Format on empty content is harmless. |

---

## 11. Edge Cases

| Scenario | Handling |
|----------|----------|
| Very large files (>10K lines) | CodeMirror handles natively with viewport-based rendering. Auto-grow capped at `maxHeight`. |
| Concurrent setValue during user editing | Latest `setValue` wins. No merge conflict handling. User edits before the call are lost. |
| Language change with unsaved content | Content is preserved. Only syntax highlighting changes. |
| Copy in read-only mode | Copy works normally. Read-only prevents editing, not reading. |
| Auto-grow with maxHeight | Editor grows until maxHeight, then scrolls. |
| Tab key in editor | Inserts spaces (per tabSize). Tab does not move focus out of the editor. |
| CodeMirror loaded after component show() | Fallback mode. Consumer must destroy and recreate the component, or call a future `reinitialise()` method. |
| Multiple instances on same page | Each instance operates independently with separate CodeMirror EditorView instances. |
| Destroy while Find/Replace is open | CodeMirror cleanup handles dialog removal. |
| Browser without Clipboard API | Fallback to `document.execCommand("copy")` with textarea selection trick. |
| Empty diagnostics array | No gutter markers rendered. Clears any existing markers. |
| Diagnostic with line 0 or negative line | Skipped with console warning. Lines are 1-based. |
| Theme switch while focused | Theme updates without losing cursor position or selection. |
| Disabled while user is typing | Typing stops immediately. Pending input events are suppressed. |

---

## 12. Logging

All log statements use the pattern:

```typescript
const LOG_PREFIX = "[CodeEditor]";
```

| Level | When | Example |
|-------|------|---------|
| `console.log` | Component lifecycle | `[CodeEditor] Initialised in container #editor-1 (CodeMirror mode)` |
| `console.log` | Language change | `[CodeEditor] Language changed to "typescript"` |
| `console.debug` | Content change | `[CodeEditor] Content changed, 42 lines` |
| `console.debug` | Theme switch | `[CodeEditor] Theme switched to "dark"` |
| `console.warn` | CodeMirror not loaded | `[CodeEditor] CodeMirror 6 not loaded, using textarea fallback` |
| `console.warn` | Language package missing | `[CodeEditor] Language package not loaded: python` |
| `console.warn` | Clipboard failure | `[CodeEditor] Clipboard write failed: DOMException` |
| `console.warn` | Post-destroy call | `[CodeEditor] Cannot set value: component destroyed` |
| `console.error` | Container not found | `[CodeEditor] Container element not found: #missing-div` |

---

## 13. Dependencies

| Dependency | Type | Required | Notes |
|------------|------|----------|-------|
| Bootstrap 5 CSS | Peer | Yes | `$gray-*` variables, `.form-select-sm`, spacing utilities |
| Bootstrap Icons | Peer | Yes | Toolbar button icons (`bi-clipboard`, `bi-floppy`, etc.) |
| CodeMirror 6 core | CDN | No (fallback available) | `@codemirror/view`, `@codemirror/state`, `@codemirror/commands`, `@codemirror/language`, `@codemirror/search` |
| CodeMirror lint extension | CDN | No | `@codemirror/lint` — needed only for diagnostics feature |
| CodeMirror language packages | CDN | No | Per-language packages — only needed for syntax highlighting |
| No JavaScript framework | -- | -- | Vanilla TypeScript, consistent with ADR-007 |

---

## 14. Integration with Existing Components

### 14.1 Toolbar Component

The CodeEditor has its own lightweight built-in toolbar. For complex configurations, the consumer may hide the built-in toolbar (`showToolbar: false`) and use the standalone Toolbar component above the CodeEditor container.

### 14.2 TabbedPanel

The CodeEditor is designed to be embedded within TabbedPanel tab content areas. Set `height: "100%"` and the editor fills the panel content. Auto-grow mode should be disabled when embedded in a fixed-height container.

### 14.3 Sidebar

When embedded in a Sidebar content area, set `height: "100%"` and `width: "100%"`. The editor reflows naturally on sidebar resize.

### 14.4 MarkdownEditor

The CodeEditor complements the MarkdownEditor. Where MarkdownEditor provides rich text editing with preview, CodeEditor provides raw code editing with syntax highlighting. They do not share runtime dependencies (Vditor vs CodeMirror).

### 14.5 Conversation Component

Code blocks within the Conversation component may use CodeEditor in read-only mode for syntax-highlighted code display, as an alternative to static `<pre><code>` blocks.

---

## 15. Testing Considerations

### 15.1 Unit Tests

| Area | Test Cases |
|------|------------|
| Initialisation | Default options, custom options, CodeMirror mode, fallback mode |
| getValue / setValue | Get initial value, set new value, empty value, large content |
| Language | Default language, switch language, unavailable language falls back to plaintext |
| Read-only | Toggle read-only, editing blocked, copy still works, API methods respect read-only |
| Word wrap | Toggle on/off, toolbar button state reflects wrap state |
| Line numbers | Toggle on/off, gutter visibility changes |
| Theme | Light default, switch to dark, switch back, CSS variables applied |
| Diagnostics | Set diagnostics, clear diagnostics, invalid line numbers, mixed severities |
| Toolbar | All actions fire correctly, disabled states, language selector |
| Copy | Clipboard API success, clipboard API failure fallback |
| Format | Auto-indent, no-op in read-only, no-op in fallback mode |
| Undo / Redo | Undo reverses edit, redo restores, no-op in read-only |
| Auto-grow | Height increases with content, respects maxHeight, shrinks when content removed |
| Disabled | All interactions blocked, visual dimming, aria-disabled |
| Destroy | DOM removed, CodeMirror destroyed, subsequent calls warn and no-op |
| Fallback mode | Textarea renders, getValue/setValue work, onChange fires, copy works |

### 15.2 Accessibility Tests

| Test | Expectation |
|------|-------------|
| `role="toolbar"` present | Toolbar element has correct role |
| `aria-label` on all interactive elements | Buttons, select, editor area all have labels |
| `aria-pressed` on word wrap toggle | Reflects current wrap state |
| `aria-readonly` when read-only | Set on editor root |
| `aria-disabled` when disabled | Set on editor root |
| Keyboard navigation in toolbar | Tab enters, arrows navigate, Enter/Space activate |
| Ctrl+S fires onSave | In both CodeMirror and fallback modes |
| Screen reader announcement | Language change and diagnostic count announced via live region |

### 15.3 Visual Regression Tests

| Scenario | What to Capture |
|----------|-----------------|
| Default editor (light theme) | Full editor with toolbar and line numbers |
| Dark theme | Full editor in dark mode |
| Read-only mode | Toolbar with disabled editing actions |
| Diagnostics | Gutter markers with error, warning, and info |
| Fallback mode | Textarea with simplified header |
| Word wrap on | Long lines wrapping within editor |
| Auto-grow | Editor growing with content |
| Disabled state | Dimmed editor with no interactivity |

---

## 16. Files

| File | Purpose |
|------|---------|
| `specs/codeeditor.prd.md` | This specification |
| `components/codeeditor/codeeditor.ts` | TypeScript source |
| `components/codeeditor/codeeditor.scss` | Styles |
| `components/codeeditor/README.md` | Consumer documentation |

---

## 17. Implementation Notes

### 17.1 CodeMirror Initialisation

```typescript
function initCodeMirror(
    parent: HTMLElement,
    options: CodeEditorOptions
): EditorView
{
    const extensions = [
        history(),
        drawSelection(),
        dropCursor(),
        indentOnInput(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        bracketMatching(),
        closeBrackets(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        search(),
        keymap.of([
            ...defaultKeymap,
            ...historyKeymap,
            ...searchKeymap,
            ...closeBracketsKeymap,
            { key: "Mod-s", run: () => { options.onSave?.(view.state.doc.toString()); return true; } }
        ])
    ];

    if (options.lineNumbers !== false)
    {
        extensions.push(lineNumbers());
    }

    if (options.wordWrap)
    {
        extensions.push(EditorView.lineWrapping);
    }

    // Language extension (if available)
    const langExt = getLanguageExtension(options.language || "javascript");
    if (langExt)
    {
        extensions.push(langExt);
    }

    // Theme
    extensions.push(bootstrapTheme);

    const view = new EditorView({
        state: EditorState.create({
            doc: options.value || "",
            extensions
        }),
        parent
    });

    return view;
}
```

### 17.2 Language Extension Registry

```typescript
function getLanguageExtension(lang: CodeEditorLanguage): Extension | null
{
    const registry: Record<string, () => Extension | null> =
    {
        javascript: () => typeof javascript === "function" ? javascript() : null,
        typescript: () => typeof javascript === "function" ? javascript({ typescript: true }) : null,
        json: () => typeof json === "function" ? json() : null,
        yaml: () => typeof yaml === "function" ? yaml() : null,
        html: () => typeof html === "function" ? html() : null,
        css: () => typeof css === "function" ? css() : null,
        sql: () => typeof sql === "function" ? sql() : null,
        python: () => typeof python === "function" ? python() : null,
        markdown: () => typeof markdown === "function" ? markdown() : null,
        plaintext: () => null
    };

    const factory = registry[lang];
    if (!factory)
    {
        console.warn(LOG_PREFIX, "Unknown language:", lang);
        return null;
    }

    return factory();
}
```

### 17.3 Diagnostics via Lint Extension

```typescript
function setDiagnosticsOnView(
    view: EditorView,
    diagnostics: CodeEditorDiagnostic[]
): void
{
    const cmDiagnostics = diagnostics
        .filter(d => d.line >= 1 && d.line <= view.state.doc.lines)
        .map(d =>
        {
            const line = view.state.doc.line(d.line);
            const from = line.from + (d.column ? Math.min(d.column - 1, line.length) : 0);
            return {
                from,
                to: from,
                severity: d.severity,
                message: d.message
            };
        });

    // Use CodeMirror's setDiagnostics from @codemirror/lint
    view.dispatch(setDiagnostics(view.state, cmDiagnostics));
}
```

### 17.4 Fallback Tab Key Handler

```typescript
function handleFallbackTab(event: KeyboardEvent, textarea: HTMLTextAreaElement, tabSize: number): void
{
    if (event.key !== "Tab")
    {
        return;
    }

    event.preventDefault();
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const spaces = " ".repeat(tabSize);

    textarea.value = textarea.value.substring(0, start)
        + spaces
        + textarea.value.substring(end);
    textarea.selectionStart = textarea.selectionEnd = start + tabSize;
}
```

### 17.5 Auto-Grow Height Calculation

```typescript
function recalculateHeight(
    editorEl: HTMLElement,
    view: EditorView | null,
    textarea: HTMLTextAreaElement | null,
    minHeight: number,
    maxHeight: number | null
): void
{
    const lineCount = view
        ? view.state.doc.lines
        : (textarea?.value.split("\n").length || 1);

    const lineHeight = 20; // px, matches CodeMirror default
    const toolbarHeight = 32;
    const padding = 16;
    let targetHeight = (lineCount * lineHeight) + toolbarHeight + padding;

    targetHeight = Math.max(targetHeight, minHeight);
    if (maxHeight)
    {
        targetHeight = Math.min(targetHeight, maxHeight);
    }

    editorEl.style.height = targetHeight + "px";
}
```

### 17.6 Performance

- Use CodeMirror's built-in viewport-based rendering for large files (only renders visible lines).
- Debounce `onChange` callbacks by 100ms to avoid excessive consumer-side processing during rapid typing.
- Cache toolbar button element references in a `Map<string, HTMLElement>` for O(1) state updates.
- Use `requestAnimationFrame` for auto-grow height recalculation to avoid layout thrashing.

### 17.7 Defensive Destroy

The `destroy()` method must:

1. Set an internal `destroyed` flag.
2. Destroy the CodeMirror `EditorView` instance (calls `view.destroy()`).
3. Remove all custom event listeners (toolbar click, textarea input, keydown).
4. Remove the root element from the DOM.
5. Null internal references (`view`, `textarea`, `rootEl`, `toolbarEl`).
6. Subsequent method calls check the `destroyed` flag and log a warning.

---

## 18. Future Considerations (Out of Scope for v1)

These features are explicitly deferred:

- **Diff mode** -- Side-by-side comparison of two values using CodeMirror's `@codemirror/merge` extension.
- **Minimap** -- A zoomed-out overview sidebar of the document (similar to VS Code).
- **IntelliSense / autocomplete** -- Language-aware autocompletion suggestions.
- **Collaborative editing** -- Real-time multi-user editing via OT or CRDT.
- **Custom key bindings** -- Consumer-configurable keyboard shortcut overrides.
- **Bracket highlighting themes** -- Rainbow bracket colouring.
- **Folding** -- Code block folding/collapsing.
- **Multiple cursors** -- Multi-cursor editing (partially supported by CodeMirror defaults).
- **Git diff gutter** -- Inline change indicators (added/modified/deleted lines).

---

## 19. Open Questions

1. **CDN bundle format** -- CodeMirror 6 is ESM-native. The exact CDN loading strategy (pre-bundled UMD, importmap, or a project-specific bundle) needs to be validated during implementation. This may require a lightweight build step to produce a single `codemirror-bundle.min.js` that the consumer loads via `<script>` tag.
2. **Syntax highlighting theme tokens** -- The default CodeMirror highlight styles may not match the project's colour palette. A custom highlight style that uses Bootstrap colour variables may be needed for a fully integrated appearance.
3. **Format action scope** -- Should the format action use CodeMirror's built-in indent commands, or should it support Prettier-like formatting via a consumer-provided formatter callback?
