<!-- AGENT: Product Requirements Document for the MarkdownEditor component — a Vditor-based Markdown editor wrapper with Bootstrap 5 integration. -->

# Markdown Editor Component

**Status:** Draft
**Component name:** MarkdownEditor
**Folder:** `./components/markdowneditor/`
**Spec author:** Agent
**Date:** 2026-02-11

---

## 1. Overview

### 1.1 What Is It

A Bootstrap 5-themed wrapper around the Vditor markdown editor library that provides:

1. A combined edit + preview component with tab-based and side-by-side layout modes
2. Collapsible panes in side-by-side mode
3. An inline selection popup toolbar for quick formatting
4. GitHub Flavored Markdown with syntax highlighting
5. Inline rendering of MermaidJS, Graphviz, and PlantUML diagrams
6. Export to Markdown, HTML, and PDF
7. Resizable (horizontal and vertical) with sensible defaults
8. Optional Bootstrap modal hosting for popup editing
9. Readonly and readwrite modes

### 1.2 Why Use Vditor

Vditor is an MIT-licensed, framework-agnostic, browser-side Markdown editor (~10.5K GitHub stars) written in TypeScript. It natively supports:

- Three editing modes: WYSIWYG, Instant Rendering (Typora-like), Split View
- GFM, tables, footnotes, task lists, superscript/subscript, mark highlighting
- Built-in Mermaid, Graphviz (viz.js), PlantUML diagram rendering
- Syntax highlighting via highlight.js with 170+ languages
- Full keyboard shortcut support (Ctrl+B, Ctrl+I, etc.)
- Resize, outline panel, character counter
- CDN-based lazy loading of heavy rendering engines
- `getValue()`, `getHTML()`, `setValue()` programmatic API

Our wrapper adds what Vditor alone does not provide: tab-based layout toggling, pane collapse controls, an inline selection toolbar, Bootstrap theme alignment, 70% viewport default sizing, and modal hosting.

### 1.3 Why Not Build From Scratch

Building a production-quality markdown editor with syntax highlighting, diagram rendering, and WYSIWYG from scratch would require thousands of lines of complex code for text editing, parsing, rendering, and undo/redo management. Vditor solves all of this with a mature, well-tested implementation. Our wrapper adds the enterprise UX features specific to this theme.

### 1.4 Design Inspiration

| Source | Key Pattern Adopted |
|--------|---------------------|
| VS Code Markdown Preview | Side-by-side editing with scroll synchronisation |
| Typora | Instant rendering (what you type is what you see) |
| GitHub editor | Tab-based Edit/Preview toggle |
| Medium | Inline floating toolbar on text selection |
| Notion | Clean, minimal editing surface with compact controls |

---

## 2. External Dependency

### 2.1 Vditor Library

| Property | Value |
|----------|-------|
| Package | `vditor` (npm) |
| Version | 3.11.2 (latest stable; **must** be >= 3.8.13 for XSS fixes) |
| License | MIT |
| Size | ~200KB core + lazy-loaded renderers via CDN |
| CDN | `https://unpkg.com/vditor@3.11.2/dist/` |

**Security note:** Versions prior to 3.8.13 have known XSS vulnerabilities (CVE-2022-0341, CVE-2022-0350, CVE-2021-4103, CVE-2021-32855). Always use >= 3.8.13.

### 2.1.1 DOMPurify Sanitisation Layer

Even though Vditor >= 3.8.13 patches known XSS vectors, defence-in-depth requires an additional sanitisation layer. The component uses **DOMPurify** to sanitise all HTML output from Vditor before rendering to the DOM or exporting.

| Property | Value |
|----------|-------|
| Package | `dompurify` (npm) |
| CDN | `https://unpkg.com/dompurify@3.2.4/dist/purify.min.js` |
| License | Apache 2.0 / MPL 2.0 |
| Size | ~20KB minified |

If DOMPurify is not loaded, the component logs a warning and falls back to Vditor's built-in sanitisation, but this is not recommended for production.

### 2.2 Loading Strategy

Vditor is loaded via CDN `<link>` and `<script>` tags by the consumer page. The component checks for `window.Vditor` at initialisation and logs an error if not found. This avoids bundling Vditor into the component JS and keeps file sizes small.

```html
<!-- Vditor CSS -->
<link rel="stylesheet" href="https://unpkg.com/vditor@3.11.2/dist/index.css" />
<!-- Vditor JS -->
<script src="https://unpkg.com/vditor@3.11.2/dist/index.min.js"></script>
```

### 2.3 Diagram Renderers

Vditor lazy-loads diagram rendering engines from its CDN:

| Engine | Diagrams | Loaded When |
|--------|----------|-------------|
| Mermaid | Flowchart, sequence, Gantt, state, class, ER, pie, journey | First mermaid code block rendered |
| viz.js | Graphviz DOT language graphs | First graphviz code block rendered |
| PlantUML | UML diagrams via public PlantUML server | First plantuml code block rendered |

No additional configuration is needed; Vditor handles this automatically.

---

## 3. Functional Requirements

### 3.1 Layout Modes

The editor supports two layout modes, switchable via a mode toggle in the header bar:

#### 3.1.1 Tab Mode (default)

- Two tabs: **Edit** and **Preview**
- Only one pane visible at a time
- Edit tab shows the Vditor editor in `ir` (instant rendering) mode
- Preview tab shows the fully rendered HTML output
- Switching to Preview calls `vditor.getHTML()` and renders with diagram support

#### 3.1.2 Side-by-Side Mode

- Editor and preview panes displayed side by side (50/50 split)
- Vditor runs in `sv` (split view) mode with its built-in synchronised scrolling
- Each pane has a collapse button (chevron) in its header
- Collapsing one pane expands the other to 100% width
- Collapsed pane shows a thin vertical strip with an expand button

### 3.2 Header Bar

A horizontal bar at the top of the component containing:

| Element | Position | Description |
|---------|----------|-------------|
| Title | Left | Optional title text (e.g. "Document Editor") |
| Mode toggle | Centre | Button group: "Tabs" / "Side by Side" |
| Actions | Right | Export dropdown, fullscreen toggle, optional custom actions |

### 3.3 Inline Selection Toolbar

When the user selects text in the editor (readwrite mode):

1. Detect selection via Vditor's `select` callback
2. Position a floating toolbar above the selection using `getCursorPosition()`
3. Show buttons for: **Bold**, **Italic**, **Underline**, **Strikethrough**, **Superscript**, **Subscript**, **Code**
4. Each button inserts the corresponding markdown syntax around the selection via `insertValue()`
5. The toolbar disappears on click outside, Escape, or deselection (`unSelect` callback)

### 3.4 Readonly / Readwrite Modes

| Mode | Behaviour |
|------|-----------|
| `readwrite` (default) | Full editing, toolbar, inline toolbar, keyboard shortcuts |
| `readonly` | Vditor disabled, no toolbar, content rendered as preview only |

Switching between modes is supported at runtime via `setReadonly(bool)`.

### 3.5 Export

An export dropdown in the header bar with these options:

| Format | Method |
|--------|--------|
| Markdown (.md) | `vditor.getValue()` → download as text file |
| HTML (.html) | `vditor.getHTML()` → wrap in HTML document template → download |
| PDF (.pdf) | `vditor.getHTML()` → open print dialog via `window.print()` on a hidden iframe |

Export triggers a browser download for MD and HTML. PDF uses the browser's print-to-PDF functionality.

### 3.6 Sizing and Resize

| Property | Default | Configurable |
|----------|---------|--------------|
| Width | 100% of container | Yes, via `width` option |
| Height | 70vh (70% viewport height) | Yes, via `height` option |
| Min height | 300px | Yes |
| Min width | 400px | Yes |
| Resize | Vertical via drag handle at bottom | Enabled by default |

The component renders at the size of its container but uses `70vh` as its default height to fulfil the "about 70% of the viewport" requirement.

### 3.7 Modal Hosting

A static helper function `showMarkdownEditorModal()` opens the editor in a Bootstrap modal:

- Modal is `modal-xl` size (covers ~80% viewport width)
- Modal body contains the MarkdownEditor component
- Header shows the title and a close button
- Footer has Save and Cancel buttons
- Save triggers the `onSave` callback with the markdown content
- The modal is created/destroyed dynamically (no persistent DOM)

### 3.8 Content Features (via Vditor)

All of these are provided by Vditor with no wrapper code needed:

- GFM: headings, bold, italic, strikethrough, lists, task lists, tables, blockquotes, code blocks, inline code, horizontal rules, images, links
- Extended: footnotes, superscript (`^text^`), subscript (`~text~`), mark highlighting (`==text==`), table of contents
- Diagrams: MermaidJS, Graphviz, PlantUML (inline rendered in preview)
- Syntax highlighting: 170+ languages in fenced code blocks
- Math: LaTeX formulas via KaTeX
- Images: inline rendered, lazy loading

### 3.9 Keyboard Shortcuts

Vditor provides these by default; the wrapper does not override them:

| Shortcut | Action |
|----------|--------|
| Ctrl/Cmd + B | Bold |
| Ctrl/Cmd + I | Italic |
| Ctrl/Cmd + U | Underline |
| Ctrl/Cmd + D | Strikethrough |
| Ctrl/Cmd + Z | Undo |
| Ctrl/Cmd + Shift + Z | Redo |
| Ctrl/Cmd + K | Insert link |
| Ctrl/Cmd + Shift + I | Insert image |
| Tab | Indent |
| Shift + Tab | Outdent |
| Ctrl/Cmd + Enter | Custom action (mapped to Save if in modal) |
| Escape | Close inline toolbar / Close modal |

---

## 4. Component API

### 4.1 Interfaces

```typescript
interface MarkdownEditorOptions
{
    /** Initial markdown content */
    value?: string;
    /** Layout mode: "tabs" or "sidebyside" */
    mode?: "tabs" | "sidebyside";
    /** Editing mode: true = readwrite, false = readonly */
    editable?: boolean;
    /** Editor title shown in header bar */
    title?: string;
    /** Default height (CSS value) */
    height?: string;
    /** Default width (CSS value) */
    width?: string;
    /** Minimum height in pixels */
    minHeight?: number;
    /** Minimum width in pixels */
    minWidth?: number;
    /** Show export button */
    showExport?: boolean;
    /** Show fullscreen toggle */
    showFullscreen?: boolean;
    /** Show inline selection toolbar */
    showInlineToolbar?: boolean;
    /** Show character counter */
    showCounter?: boolean;
    /** Placeholder text for empty editor */
    placeholder?: string;
    /** Vditor editing mode: "ir" (instant render), "wysiwyg", "sv" (split) */
    vditorMode?: "ir" | "wysiwyg" | "sv";
    /** Bootstrap size variant */
    size?: "sm" | "md" | "lg";
    /** Disabled state */
    disabled?: boolean;
    /** Custom Vditor toolbar items (overrides default) */
    toolbar?: string[];
    /** Custom Vditor options (merged with defaults) */
    vditorOptions?: Record<string, unknown>;
    /** Callback: content changed */
    onChange?: (value: string) => void;
    /** Callback: editor ready */
    onReady?: () => void;
    /** Callback: save triggered (Ctrl+Enter or Save button) */
    onSave?: (value: string) => void;
    /** Callback: mode switched */
    onModeChange?: (mode: "tabs" | "sidebyside") => void;
}

interface MarkdownEditorModalOptions extends MarkdownEditorOptions
{
    /** Modal title (defaults to options.title or "Edit Markdown") */
    modalTitle?: string;
    /** Show Save button in modal footer */
    showSave?: boolean;
    /** Save button label */
    saveLabel?: string;
    /** Cancel button label */
    cancelLabel?: string;
    /** Callback: modal closed (returns final content or null if cancelled) */
    onClose?: (value: string | null) => void;
}
```

### 4.2 Public Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `getValue()` | `(): string` | Get current markdown content |
| `setValue(md)` | `(md: string): void` | Set markdown content |
| `getHTML()` | `(): string` | Get rendered HTML |
| `setMode(mode)` | `(mode: "tabs" \| "sidebyside"): void` | Switch layout mode |
| `setEditable(editable)` | `(editable: boolean): void` | Switch readonly/readwrite |
| `setTitle(title)` | `(title: string): void` | Update header title |
| `exportMarkdown()` | `(): void` | Trigger .md download |
| `exportHTML()` | `(): void` | Trigger .html download |
| `exportPDF()` | `(): void` | Open print dialog for PDF |
| `focus()` | `(): void` | Focus the editor |
| `enable()` | `(): void` | Enable the editor |
| `disable()` | `(): void` | Disable the editor |
| `destroy()` | `(): void` | Remove component and clean up |

### 4.3 Factory Functions

```typescript
/** Create an inline editor */
function createMarkdownEditor(
    containerId: string,
    options?: MarkdownEditorOptions
): MarkdownEditor;

/** Open editor in a modal */
function showMarkdownEditorModal(
    options?: MarkdownEditorModalOptions
): MarkdownEditor;
```

### 4.4 Window Globals

```typescript
window.MarkdownEditor = MarkdownEditor;
window.createMarkdownEditor = createMarkdownEditor;
window.showMarkdownEditorModal = showMarkdownEditorModal;
```

---

## 5. Visual Layout

### 5.1 Tab Mode

```
┌─────────────────────────────────────────────┐
│ Header: [Title]  [Tabs|SxS]  [Export ▾] [⛶] │
├─────────────────────────────────────────────┤
│ ┌─────────┬──────────┐                      │
│ │ ✏ Edit  │ 👁 Preview│  (tabs)             │
│ └─────────┴──────────┘                      │
│ ┌─────────────────────────────────────────┐ │
│ │                                         │ │
│ │  Editor area (Vditor ir/wysiwyg mode)   │ │
│ │  or rendered preview (when Preview tab) │ │
│ │                                         │ │
│ └─────────────────────────────────────────┘ │
│ ═══════ resize handle ═══════               │
└─────────────────────────────────────────────┘
```

### 5.2 Side-by-Side Mode

```
┌─────────────────────────────────────────────┐
│ Header: [Title]  [Tabs|SxS]  [Export ▾] [⛶] │
├──────────────────────┬──────────────────────┤
│ ✏ Editor         [◂] │ [▸] 👁 Preview       │
├──────────────────────┼──────────────────────┤
│                      │                      │
│  Markdown source     │  Rendered output     │
│  with syntax         │  with diagrams       │
│  highlighting        │  rendered inline     │
│                      │                      │
├──────────────────────┴──────────────────────┤
│ ═══════ resize handle ═══════               │
└─────────────────────────────────────────────┘
```

### 5.3 Inline Selection Toolbar

```
                    ┌────────────────────────────────────┐
                    │ B  I  U  S  X²  X₂  </>           │
                    └────────────────────────────────────┘
                              ▼ (arrow pointing down)
               ──────[selected text in editor]──────
```

### 5.4 Modal

```
┌─────────────────────────────────────────────────┐
│ Edit Markdown                              [✕]  │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │ (Full MarkdownEditor component)         │    │
│  │                                         │    │
│  │                                         │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
├─────────────────────────────────────────────────┤
│                           [Cancel]    [Save]    │
└─────────────────────────────────────────────────┘
```

---

## 6. Styling

### 6.1 CSS Class Prefix

All custom classes use the `mde-` prefix (short for MarkDown Editor).

### 6.2 Class Reference

| Class | Element |
|-------|---------|
| `mde-wrapper` | Outermost container |
| `mde-header` | Header bar |
| `mde-title` | Title text |
| `mde-mode-toggle` | Tab/SxS button group |
| `mde-actions` | Export and fullscreen buttons |
| `mde-body` | Main content area |
| `mde-tabs` | Tab container (tab mode) |
| `mde-tab` | Individual tab button |
| `mde-tab-active` | Active tab state |
| `mde-panes` | Side-by-side pane container |
| `mde-pane-editor` | Editor pane |
| `mde-pane-preview` | Preview pane |
| `mde-pane-collapsed` | Collapsed pane state |
| `mde-collapse-btn` | Pane collapse/expand button |
| `mde-editor-area` | Vditor mount point |
| `mde-preview-area` | Preview render target |
| `mde-inline-toolbar` | Floating selection toolbar |
| `mde-inline-btn` | Inline toolbar button |
| `mde-resize-handle` | Vertical resize drag handle |
| `mde-fullscreen` | Fullscreen state |
| `mde-disabled` | Disabled state |
| `mde-sm` / `mde-lg` | Size variants |

### 6.3 Theme Integration

- Import Bootstrap variables from `../../src/scss/variables`
- Use `$border-color`, `$body-bg`, `$body-color`, `$primary`, `$font-family-monospace` etc.
- Override Vditor's CSS custom properties where needed to match the Bootstrap theme
- Zero border-radius per theme conventions
- 14px base font size from theme

---

## 7. Accessibility

| Feature | Implementation |
|---------|----------------|
| Keyboard navigation | Vditor handles editor keyboard; wrapper handles Tab/Escape for layout |
| ARIA roles | `role="tablist"` for tabs, `role="tabpanel"` for panes, `role="toolbar"` for inline toolbar |
| Focus management | Focus moves to editor when tab selected; inline toolbar traps focus briefly |
| Screen reader | Tab labels include `aria-selected`; collapse buttons have `aria-expanded` |
| Colour contrast | All custom UI meets WCAG 2.1 AA (4.5:1 minimum) |

---

## 8. Security

### 8.1 HTML Sanitisation

All HTML produced by Vditor is sanitised before being:
- Rendered in the preview pane (tab mode Preview tab or side-by-side preview)
- Returned from `getHTML()`
- Written to an export file (HTML export)

Sanitisation uses DOMPurify with a whitelist that permits safe formatting tags, images, links, tables, and diagram SVGs, but strips `<script>`, `<iframe>`, `<object>`, `<embed>`, `onclick`/`onerror` attributes, `javascript:` URLs, and `data:` URIs (except `data:image/*`).

### 8.2 Content Security

| Vector | Mitigation |
|--------|------------|
| XSS via markdown injection | DOMPurify sanitises all rendered HTML |
| XSS via link `href` | DOMPurify strips `javascript:` URLs |
| XSS via image `onerror` | DOMPurify strips event handler attributes |
| Stored XSS via setValue() | Content sanitised on render, not on storage |
| PlantUML server SSRF | PlantUML uses public render server; no internal network access |
| CDN integrity | Specify `integrity` attributes on CDN script/link tags in documentation |

### 8.3 Security Guidance for Consumers

The README and component documentation will include:

1. **Always use Vditor >= 3.8.13** (specify pinned version in production)
2. **Always load DOMPurify** alongside the component
3. **Never trust `getHTML()` without sanitisation** if bypassing the component's built-in rendering
4. **Use Content-Security-Policy headers** that restrict `script-src` to trusted CDN domains
5. **Pin CDN versions** and use Subresource Integrity (SRI) hashes in production

---

## 9. Error Handling

| Scenario | Response |
|----------|----------|
| Vditor not loaded | Log `[MarkdownEditor] Vditor library not found` and render a fallback `<textarea>` |
| DOMPurify not loaded | Log `[MarkdownEditor] DOMPurify not found — using Vditor built-in sanitisation` (warning) |
| Container not found | Log `[MarkdownEditor] Container element not found: {id}` and return null |
| Export fails | Log error, show user-facing toast via `vditor.tip()` |
| Invalid mode | Log warning, default to "tabs" |
| Empty content export | Warn but allow (empty file download) |

---

## 10. Edge Cases

| Case | Handling |
|------|----------|
| Very large documents (>10K lines) | Vditor handles natively; resize handle remains responsive |
| Concurrent setValue during editing | Latest setValue wins; no merge conflict handling |
| Modal opened while another modal is open | Stack modals using Bootstrap's built-in z-index management |
| Browser without print-to-PDF | PDF export opens print dialog; user selects "Save as PDF" manually |
| No network (CDN diagrams) | Diagram blocks show as code; no rendering. Vditor handles gracefully |
| Container resized externally | Vditor auto-adjusts on window resize |

---

## 11. Testing Checklist

### 11.1 Unit Verification

- [ ] Component initialises with default options
- [ ] `getValue()` returns current content
- [ ] `setValue()` updates editor and preview
- [ ] `getHTML()` returns rendered HTML
- [ ] Mode toggle switches between tab and side-by-side
- [ ] Readonly mode disables editing
- [ ] Export functions trigger downloads
- [ ] Destroy cleans up all DOM and listeners

### 11.2 Integration Verification

- [ ] Tab mode: Edit tab shows editor, Preview tab shows rendered output
- [ ] Side-by-side: Both panes visible, scroll synchronised
- [ ] Pane collapse: Clicking chevron collapses one pane, expands the other
- [ ] Inline toolbar: Appears on text selection, applies formatting
- [ ] Mermaid diagram renders in preview
- [ ] Graphviz diagram renders in preview
- [ ] PlantUML diagram renders in preview
- [ ] Modal opens, editing works, Save returns content
- [ ] Resize handle changes component height
- [ ] Fullscreen toggle works

### 11.3 Browser Verification

- [ ] Chrome latest: all features
- [ ] Firefox latest: all features
- [ ] Safari latest: all features
- [ ] Edge latest: all features
