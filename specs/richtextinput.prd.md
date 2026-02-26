<!-- AGENT: Product Requirements Document for the RichTextInput component — lightweight contenteditable-based rich text input composing STIE and Pill for per-row editing contexts. -->

# RichTextInput Component

**Status:** Draft
**Component name:** RichTextInput
**Folder:** `./components/richtextinput/`
**Spec author:** Agent
**Date:** 2026-02-26

---

## 1. Overview

### 1.1 What Is It

A lightweight `contenteditable`-based rich text input that composes the Smart Text Input Engine (STIE) and Pill components for per-row editing contexts — todo items, checklist entries, inline detail fields, and similar use cases that need more than a plain `<input>` but less than the full MarkdownEditor (Vditor).

RichTextInput provides:

- **Inline formatting** — bold, italic, strikethrough, inline code, and hyperlinks via keyboard shortcuts and a floating toolbar
- **List support** — ordered lists, unordered lists, and interactive task lists with checkboxes
- **STIE integration** — optional trigger-based entity references (@mentions, #issues, etc.) with Pill-styled tokens
- **Dual serialization** — HTML-primary storage with optional markdown output conversion
- **Paste sanitization** — strips unsafe HTML to a safe allowlist on paste
- **Lightweight** — no heavy editor dependency; suitable for 20–50 instances on a single page
- **Form-control matching** — border, focus ring, padding, and sizing match Bootstrap `<input>` elements

### 1.2 Why Build It

Enterprise SaaS applications frequently need inline rich text in contexts where a full editor is inappropriate:

- **Todo / checklist items** — need bold, links, @mentions within a single row
- **Inline detail fields** — descriptions, notes, or comments within data grids or card layouts
- **Chat-like inputs** — lightweight message composition with formatting and entity references
- **Annotation fields** — brief rich text attached to timeline entries, activity feed items, or audit log notes

The MarkdownEditor (Vditor-based) is unsuitable for these contexts because:

1. **Weight** — Vditor is ~200KB and creates a heavy iframe-based editor; 20 instances would be unacceptable
2. **Chrome** — full toolbar, mode tabs, preview pane are unnecessary for single-line/few-line inputs
3. **Initialization cost** — Vditor's async CDN loading and initialization is too slow for per-row mounting

A plain `<input>` or `<textarea>` cannot do inline formatting or entity references. RichTextInput fills this gap.

### 1.3 Design Inspiration

| Source | Key Pattern Adopted |
|--------|---------------------|
| Notion inline blocks | Contenteditable with `/` commands, @mentions, inline formatting |
| Linear issue descriptions | Lightweight rich text with keyboard shortcuts, no heavy editor |
| GitHub comment textarea | Inline formatting toolbar on selection, @mentions |
| Slack message input | Ctrl+B/I/K shortcuts, inline code formatting, @mentions |
| Google Docs inline suggestions | Floating toolbar on selection, clean paste sanitization |

---

## 2. Dependencies

### 2.1 Internal Dependencies

| Dependency | Type | Purpose |
|------------|------|---------|
| STIE (`SmartTextInputEngine`) | Optional runtime | Trigger detection, token insertion/removal |
| Pill (`createPill`) | Optional runtime | Visual styling for STIE tokens |

Both are checked at runtime via `window.SmartTextInputEngine` / `window.createPill`. If absent, the component works as plain rich text — triggers are silently ignored.

### 2.2 External Dependencies

None. Zero external libraries. All formatting uses `document.execCommand` (deprecated in spec, universally supported) with manual DOM manipulation for code wrapping and task lists.

---

## 3. Architecture

### 3.1 Formatting: `document.execCommand`

`execCommand` is deprecated in the W3C spec but remains the only practical approach for contenteditable formatting:

- Handles complex selection cases (partial words, cross-node, split text nodes)
- Integrates with the browser's native undo/redo stack
- Works identically across Chrome, Firefox, Safari, and Edge

Manual DOM manipulation (Range/Selection API) is used only for features `execCommand` doesn't support: inline code wrapping and task list toggling.

### 3.2 Serialization: HTML Primary

`contenteditable` natively produces HTML — zero conversion overhead. The `getValue()` method returns HTML by default. An optional `outputFormat: "markdown"` converts at read time via a lightweight DOM walker (~80–100 lines). `setValue()` always accepts HTML.

### 3.3 STIE: Optional Composition

At initialization, the component checks `window.SmartTextInputEngine`. If present:

1. Creates a `SmartTextInputEngine` instance
2. Attaches it to the contenteditable element (using the `contenteditable` adapter)
3. Registers any trigger definitions from `options.triggers`
4. Forwards STIE events to the host application

If absent, triggers are silently ignored and the component works as plain rich text.

### 3.4 Inline Toolbar: Custom Lightweight Div

The existing Toolbar component (~2800 lines) is far too heavy for a 5-button floating bar. RichTextInput builds its own lightweight `<div>` toolbar with:

- `position: absolute` relative to the root container
- `mousedown` + `preventDefault` on buttons to avoid deselection
- Active state detection via `document.queryCommandState`
- Visibility toggled by a shared `selectionchange` listener

### 3.5 Selection Listener: Shared Singleton

A single `document.selectionchange` listener is shared across all RichTextInput instances via a static `Set<RichTextInput>`. This avoids 50 duplicate listeners when many instances are on the page.

### 3.6 Paste Sanitization

Intercepts `paste` event, extracts `text/html` from clipboard, and strips to allowlist:

**Allowed tags:** `<strong>`, `<em>`, `<s>`, `<code>`, `<a>` (with `href` attribute only), `<ul>`, `<ol>`, `<li>`, `<br>`, text nodes.

**Everything else stripped.** `<b>` → `<strong>`, `<i>` → `<em>` normalization applied.

### 3.7 Enter Key Normalization

Browsers insert different elements on Enter: Chrome inserts `<div>`, Firefox inserts `<br>`, Safari inserts `<p>`. RichTextInput normalizes to `<br>` consistently. Lists override this for `<li>` creation.

---

## 4. DOM Structure

```html
<div class="richtextinput [richtextinput-sm|richtextinput-lg] [richtextinput-disabled] [richtextinput-readonly] [richtextinput-resizable]">
    <div class="richtextinput-editable"
         contenteditable="true" role="textbox" aria-multiline="true"
         aria-label="...placeholder...">
        <!-- user content -->
    </div>
    <span class="richtextinput-placeholder" aria-hidden="true">Type here...</span>
    <div class="richtextinput-counter">42 / 280</div>
    <div class="richtextinput-toolbar" role="toolbar" aria-label="Text formatting">
        <button class="richtextinput-toolbar-btn" aria-label="Bold" title="Bold (Ctrl+B)">
            <i class="bi bi-type-bold" aria-hidden="true"></i>
        </button>
        <!-- italic, strikethrough, link, code buttons -->
    </div>
</div>
```

- **Root** — `position: relative` positioning context
- **Placeholder** — sibling overlay (not `::before` — cross-browser contenteditable issue)
- **Toolbar** — `position: absolute` child, shown on text selection
- **STIE tokens** — inline `<span contenteditable="false">` with Pill CSS

---

## 5. Options Interface

```typescript
export interface RichTextInputOptions
{
    value?: string;                           // Initial HTML content
    placeholder?: string;                     // Placeholder text when empty
    disabled?: boolean;                       // Default false
    readonly?: boolean;                       // Default false
    size?: "sm" | "default" | "lg";           // Bootstrap size variant
    cssClass?: string;                        // Additional CSS class(es) on root
    maxLength?: number;                       // Plain-text char limit (0 = unlimited)
    showCounter?: boolean;                    // Show character counter
    minHeight?: string;                       // CSS min-height, default "auto"
    maxHeight?: string;                       // CSS max-height, default "none"
    resizable?: boolean;                      // CSS resize: vertical, default true

    // Formatting
    formatting?: boolean;                     // Enable bold/italic/strike/link/code, default true
    lists?: boolean;                          // Enable ordered/unordered/task lists, default false
    showInlineToolbar?: boolean;              // Floating toolbar on selection, default true
    toolbarActions?: FormattingAction[];      // Default: bold, italic, strikethrough, link, code

    // STIE integration (optional — gracefully skipped if STIE not loaded)
    triggers?: StieCompatTriggerDefinition[]; // Trigger definitions passed to STIE
    stieOptions?: Record<string, unknown>;    // Options passed to createSmartTextInput()

    // Serialization
    outputFormat?: "html" | "markdown";       // getValue() format, default "html"

    // Callbacks
    onChange?: (value: string) => void;       // Content changed (debounced)
    onFocus?: () => void;
    onBlur?: () => void;
    onSubmit?: (value: string) => void;       // Ctrl+Enter
    submitOnCtrlEnter?: boolean;              // Enable Ctrl+Enter submit, default false
}
```

---

## 6. Public API

| Method | Returns | Purpose |
|--------|---------|---------|
| `constructor(options)` | — | Build DOM, wire events, optionally attach STIE |
| `show(container)` | `void` | Append root into container (by ID or element) |
| `getElement()` | `HTMLElement` | Return root for manual insertion |
| `getValue()` | `string` | Content in configured format (html or markdown) |
| `getHtml()` | `string` | Always returns HTML |
| `getPlainText()` | `string` | Stripped plain text |
| `setValue(html)` | `void` | Set content from HTML string |
| `setDisabled(flag)` | `void` | Toggle disabled state |
| `setReadonly(flag)` | `void` | Toggle readonly state |
| `focus()` | `void` | Programmatic focus |
| `isEmpty()` | `boolean` | Whether content is empty/whitespace-only |
| `getStieEngine()` | `object\|null` | Returns STIE engine if attached |
| `execFormat(action)` | `void` | Programmatic formatting |
| `destroy()` | `void` | Full cleanup |

---

## 7. Keyboard Shortcuts

| Shortcut | Action | Condition |
|----------|--------|-----------|
| `Ctrl+B` | Bold | Has focus |
| `Ctrl+I` | Italic | Has focus |
| `Ctrl+D` | Strikethrough | Has focus |
| `Ctrl+K` | Insert link | Has focus + text selected |
| `Ctrl+E` | Inline code | Has focus |
| `Ctrl+Shift+8` | Unordered list | `lists: true` |
| `Ctrl+Shift+7` | Ordered list | `lists: true` |
| `Ctrl+Shift+9` | Task list | `lists: true` |
| `Ctrl+Enter` | Submit | `submitOnCtrlEnter: true` |

---

## 8. Styling

CSS custom properties for runtime override:

| Property | Default | Description |
|----------|---------|-------------|
| `--rti-bg` | `$input-bg` | Background colour |
| `--rti-border-color` | `$input-border-color` | Border colour |
| `--rti-focus-border-color` | `$input-focus-border-color` | Focus border colour |
| `--rti-focus-shadow` | `$input-focus-box-shadow` | Focus box shadow |
| `--rti-color` | `$gray-900` | Text colour |
| `--rti-placeholder-color` | `$input-placeholder-color` | Placeholder colour |
| `--rti-toolbar-bg` | `$gray-50` | Toolbar background |
| `--rti-toolbar-border` | `$gray-300` | Toolbar border |

Size variants: `richtextinput-sm`, `richtextinput-lg` — match Bootstrap `input-sm` / `input-lg` padding and font-size.

---

## 9. Accessibility

- `role="textbox"` + `aria-multiline="true"` on editable area
- `aria-label` set to placeholder text (or "Rich text input" default)
- Toolbar buttons have `aria-label` and `title` attributes with shortcut hints
- Task list checkboxes have `role="checkbox"` and `aria-checked`
- `aria-disabled="true"` / `aria-readonly="true"` on editable when appropriate
- Focus visible outlines on all interactive elements
- `prefers-reduced-motion` disables toolbar fade transitions

---

## 10. Performance

- No external library dependency — pure DOM operations
- Shared `selectionchange` listener (singleton pattern) for multi-instance scenarios
- Debounced `onChange` callback (default 150ms) to avoid excessive re-renders
- Paste sanitization uses DOM fragment parsing (not regex)
- No MutationObserver (unnecessary overhead for contenteditable)

---

## 11. Security

- Paste sanitization strips all tags except allowlist
- `<a>` tags preserve only `href` attribute; all other attributes stripped
- Links sanitized: only `http:`, `https:`, `mailto:` protocols allowed
- Never uses `innerHTML` for user-supplied content (sanitized paste uses DOMParser for safe parsing)
- STIE tokens are `contenteditable="false"` — cannot be modified by user typing
