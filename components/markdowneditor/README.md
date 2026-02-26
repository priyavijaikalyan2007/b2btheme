<!-- AGENT: Documentation for the MarkdownEditor component. -->

# MarkdownEditor

A Bootstrap 5-themed Markdown editor wrapper around [Vditor](https://github.com/Vanessa219/vditor) with tab/side-by-side layout modes, collapsible panes, inline selection toolbar, export, and optional modal hosting.

## Dependencies

This component requires external libraries loaded before the component script:

```html
<!-- Vditor (>= 3.8.13 required for security fixes; 3.11.2 recommended) -->
<link rel="stylesheet" href="https://unpkg.com/vditor@3.11.2/dist/index.css" />
<script src="https://unpkg.com/vditor@3.11.2/dist/index.min.js"></script>

<!-- DOMPurify (strongly recommended for XSS protection) -->
<script src="https://unpkg.com/dompurify@3.2.4/dist/purify.min.js"></script>

<!-- Component CSS + JS -->
<link rel="stylesheet" href="components/markdowneditor/markdowneditor.css">
<script src="components/markdowneditor/markdowneditor.js"></script>
```

## Quick Start

```html
<div id="my-editor"></div>
<script>
    var editor = createMarkdownEditor("my-editor", {
        title: "My Document",
        value: "# Hello World\n\nStart writing...",
        onChange: function(value) { console.log("Content changed"); }
    });
</script>
```

## Modal Usage

```html
<script>
    showMarkdownEditorModal({
        modalTitle: "Edit Description",
        value: existingMarkdown,
        onSave: function(value) {
            console.log("Saved:", value);
        },
        onClose: function(value) {
            // value is null if cancelled
            if (value !== null) {
                console.log("Closed with content");
            }
        }
    });
</script>
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `value` | `string` | `""` | Initial markdown content |
| `mode` | `"tabs" \| "sidebyside" \| "display" \| "naked"` | `"tabs"` | Layout mode. `"display"` renders read-only markdown with no chrome — ideal for hovers and inline content. `"naked"` renders an editable Vditor surface with no chrome — feels like a textarea that understands markdown |
| `editable` | `boolean` | `true` | Readwrite (true) or readonly (false). When false, the toolbar is hidden and the Preview tab is shown by default |
| `title` | `string` | — | Header bar title |
| `height` | `string` | `"70vh"` | Component height (CSS value) |
| `width` | `string` | `"100%"` | Component width (CSS value) |
| `minHeight` | `number` | `300` | Minimum height in pixels |
| `minWidth` | `number` | `400` | Minimum width in pixels |
| `showExport` | `boolean` | `true` | Show export dropdown |
| `showFullscreen` | `boolean` | `true` | Show fullscreen toggle |
| `showInlineToolbar` | `boolean` | `true` | Show inline formatting toolbar on selection |
| `showCounter` | `boolean` | `false` | Show character counter |
| `placeholder` | `string` | — | Placeholder text |
| `vditorMode` | `"ir" \| "wysiwyg" \| "sv"` | `"ir"` | Vditor editing mode |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Size variant |
| `disabled` | `boolean` | `false` | Disabled state |
| `isolated` | `boolean` | `false` | Scope display-mode styles to prevent CSS bleed into parent |
| `compact` | `boolean` | `false` | Tighter vertical spacing for sidebar/embedded contexts |
| `theme` | `"light" \| "dark"` | `"light"` | Color theme for display mode |
| `toolbar` | `string[]` | Default set | Custom Vditor toolbar items |
| `vditorOptions` | `object` | — | Custom Vditor options (merged) |
| `onChange` | `(value: string) => void` | — | Content changed |
| `onReady` | `() => void` | — | Editor ready (fires in all modes including display) |
| `onSave` | `(value: string) => void` | — | Save triggered (Ctrl+Enter) |
| `onModeChange` | `(mode: string) => void` | — | Layout mode switched |

## Display Mode

The `"display"` mode renders markdown as read-only HTML with no UI chrome — no header bar, toolbar, tabs, resize handle, or border. This is ideal for embedding rendered markdown in tooltips, popovers, hover cards, or any read-only container.

```javascript
createMarkdownEditor("tooltip-content", {
    mode: "display",
    value: "**Status:** Approved\n\nSee [JIRA-1234](#) for details."
});
```

In display mode:
- No Vditor editor instance is created (lightweight)
- Full rendering of Mermaid diagrams, PlantUML, code highlighting, and KaTeX math via `Vditor.preview()`
- Resizable from the bottom-right corner (CSS `resize: both`)
- `setValue(md)` re-renders the preview
- `getValue()` returns the stored markdown string
- `setMode("tabs")` or `setMode("sidebyside")` transitions to a full editor
- `onReady` fires after markdown is rendered and inserted into the DOM

### CSS Isolation (`isolated: true`)

When multiple display-mode instances are embedded in a sidebar or panel, Vditor's CSS (margins, heading sizes, code block styles) can bleed into the parent container. Setting `isolated: true` applies a CSS reset boundary:

```javascript
createMarkdownEditor("sidebar-idea", {
    mode: "display",
    value: ideaMarkdown,
    isolated: true
});
```

### Compact Spacing (`compact: true`)

Reduces vertical spacing for dense embedded contexts: tighter paragraph margins (0.25em), smaller headings (relative to container), reduced code block padding, collapsed list item spacing.

```javascript
createMarkdownEditor("category-idea", {
    mode: "display",
    value: ideaMarkdown,
    compact: true
});
```

### Dark Theme (`theme: "dark"`)

Renders with light text on a dark background — suitable for dark tooltips, popovers, and panels. Code blocks use native syntax highlighting, and link colors contrast against dark backgrounds.

```javascript
createMarkdownEditor("hover-popover", {
    mode: "display",
    value: nodeMarkdown,
    theme: "dark"
});
```

### onReady in Display Mode

The `onReady` callback fires after the markdown has been rendered to HTML and inserted into the DOM. This allows consumers to measure content height, attach event listeners, or adjust layout:

```javascript
createMarkdownEditor("idea-container", {
    mode: "display",
    value: ideaMarkdown,
    onReady: function() {
        var el = document.getElementById("idea-container");
        if (el.scrollHeight > el.clientHeight) {
            showOverflowIndicator(el);
        }
    }
});
```

## Naked Mode

The `"naked"` mode renders a fully editable Vditor surface with no UI chrome — no header bar, toolbar, tabs, or mode toggle. It feels like a `<textarea>` that understands markdown. The editor has a `form-control`-style border and is resizable via CSS `resize: both`.

```javascript
createMarkdownEditor("notes-field", {
    mode: "naked",
    value: "- [ ] Review PR\n- [x] Update docs",
    placeholder: "Type markdown here...",
    height: "200px",
    onChange: function(md) { console.log("Changed:", md.length); }
});
```

In naked mode:
- Full Vditor editor instance (all markdown shortcuts, GFM task lists, formatting)
- No header, toolbar, tabs, mode toggle, or export buttons
- Resizable from the bottom-right corner (CSS `resize: both`)
- Border matches Bootstrap `form-control` style
- `getValue()` / `setValue()` work as in tabs/sidebyside mode
- `onSave` fires on Ctrl+Enter
- `setMode("tabs")` transitions to the full chrome editor
- Supports `size`, `placeholder`, `disabled`, `vditorMode`, and all callback options

Use naked mode for expanded detail panels, wiki-style paragraph editing, or any context where you want markdown editing power without the editor chrome. For per-row lightweight editing (todo items, checklist entries), use the RichTextInput component instead.

## Modal Options

Extends all options above plus:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `modalTitle` | `string` | `"Edit Markdown"` | Modal title |
| `showSave` | `boolean` | `true` | Show Save button |
| `saveLabel` | `string` | `"Save"` | Save button text |
| `cancelLabel` | `string` | `"Cancel"` | Cancel button text |
| `onClose` | `(value: string \| null) => void` | — | Modal closed (null if cancelled) |

The modal dialog is horizontally resizable — drag the right edge to adjust width (min 480 px, max 95 vw).

## Public API

| Method | Returns | Description |
|--------|---------|-------------|
| `getValue()` | `string` | Get current markdown |
| `setValue(md)` | `void` | Set markdown content |
| `getHTML()` | `string` | Get sanitised rendered HTML |
| `setMode(mode)` | `void` | Switch layout mode |
| `setEditable(bool)` | `void` | Switch readonly/readwrite |
| `setTitle(title)` | `void` | Update header title |
| `exportMarkdown()` | `void` | Download as .md file |
| `exportHTML()` | `void` | Download as .html file |
| `exportPDF()` | `void` | Open print dialog (Save as PDF) |
| `focus()` | `void` | Focus the editor |
| `enable()` | `void` | Enable the editor |
| `disable()` | `void` | Disable the editor |
| `destroy()` | `void` | Remove component and clean up |

## Supported Markdown Features

Via Vditor, the editor supports:

- **GFM**: Headings, bold, italic, strikethrough, lists, task lists, tables, blockquotes, code blocks, inline code, horizontal rules, images, links
- **Extended**: Footnotes, superscript (`^text^`), subscript (`~text~`), mark (`==text==`), table of contents
- **Diagrams**: MermaidJS, Graphviz (DOT), PlantUML (rendered inline)
- **Syntax highlighting**: 170+ languages in fenced code blocks
- **Math**: LaTeX formulas via KaTeX

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl/Cmd + B | Bold |
| Ctrl/Cmd + I | Italic |
| Ctrl/Cmd + U | Underline |
| Ctrl/Cmd + D | Strikethrough |
| Ctrl/Cmd + Z | Undo |
| Ctrl/Cmd + Shift + Z | Redo |
| Ctrl/Cmd + K | Insert link |
| Ctrl/Cmd + Enter | Save (triggers onSave) |
| Escape | Close inline toolbar / Exit fullscreen |

## Security

**Important:** This component requires security-conscious deployment.

1. **Vditor version**: Always use >= 3.8.13 (fixes CVE-2022-0341, CVE-2022-0350, CVE-2021-4103, CVE-2021-32855). Pin the version in production.
2. **DOMPurify**: Always load DOMPurify alongside this component. All HTML output is sanitised through DOMPurify before DOM insertion or export.
3. **Content-Security-Policy**: Configure CSP headers to restrict `script-src` to trusted CDN domains only.
4. **SRI hashes**: Use Subresource Integrity attributes on CDN `<script>` and `<link>` tags in production.
5. **`getHTML()` is safe**: The public `getHTML()` method returns sanitised HTML. If you bypass the component and call Vditor's `getHTML()` directly, you must sanitise the output yourself.

## Window Globals

| Global | Type |
|--------|------|
| `window.MarkdownEditor` | `class` |
| `window.createMarkdownEditor` | `function(containerId, options): MarkdownEditor` |
| `window.showMarkdownEditorModal` | `function(options): MarkdownEditor` |
