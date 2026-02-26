<!-- AGENT: Documentation for the RichTextInput component — lightweight contenteditable rich text input with STIE composition. -->

# RichTextInput

A lightweight `contenteditable`-based rich text input that composes STIE and Pill for per-row editing contexts — todo items, checklist entries, inline detail fields. Fills the gap between a plain `<input>` and the full MarkdownEditor. No external dependencies; suitable for 20–50 instances on a single page.

## Assets

| Asset | Path |
|-------|------|
| CSS | `components/richtextinput/richtextinput.css` |
| JS | `components/richtextinput/richtextinput.js` |
| Types | `components/richtextinput/richtextinput.d.ts` |

## Requirements

- **Bootstrap CSS** — for SCSS variables (`$input-bg`, `$gray-900`, etc.)
- **Bootstrap Icons** — for toolbar button icons (`bi bi-type-bold`, etc.)
- Does **not** require Bootstrap JS.
- **STIE** (optional) — for trigger-based entity references (@mentions, #issues)
- **Pill** (optional) — for styled inline tokens

## Quick Start

```html
<link rel="stylesheet" href="components/richtextinput/richtextinput.css">
<script src="components/richtextinput/richtextinput.js"></script>
<script>
    var editor = createRichTextInput({
        placeholder: "Type here...",
        formatting: true,
        onChange: function(html) { console.log("Content:", html); }
    });
    document.getElementById("container").appendChild(editor.getElement());
</script>
```

## API

### Global Functions

| Function | Returns | Description |
|----------|---------|-------------|
| `createRichTextInput(options)` | `RichTextInput` | Create a rich text input instance |

### RichTextInput Class

| Method | Returns | Description |
|--------|---------|-------------|
| `show(container)` | `void` | Append into container (ID string or element) |
| `getElement()` | `HTMLElement` | Get root DOM element |
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

### RichTextInputOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `value` | `string` | `undefined` | Initial HTML content |
| `placeholder` | `string` | `undefined` | Placeholder text |
| `disabled` | `boolean` | `false` | Disable editing |
| `readonly` | `boolean` | `false` | Read-only mode |
| `size` | `"sm"\|"default"\|"lg"` | `"default"` | Bootstrap size variant |
| `cssClass` | `string` | `undefined` | Additional CSS class(es) |
| `maxLength` | `number` | `0` | Plain-text char limit (0 = unlimited) |
| `showCounter` | `boolean` | `false` | Show character counter |
| `minHeight` | `string` | `"auto"` | CSS min-height |
| `maxHeight` | `string` | `"none"` | CSS max-height |
| `resizable` | `boolean` | `true` | CSS resize: vertical |
| `formatting` | `boolean` | `true` | Enable bold/italic/strike/link/code |
| `lists` | `boolean` | `false` | Enable ordered/unordered/task lists |
| `showInlineToolbar` | `boolean` | `true` | Show toolbar on selection |
| `toolbarActions` | `FormattingAction[]` | See below | Toolbar button set |
| `triggers` | `StieCompatTriggerDefinition[]` | `undefined` | STIE trigger definitions |
| `stieOptions` | `Record<string, unknown>` | `undefined` | Options for STIE engine |
| `outputFormat` | `"html"\|"markdown"` | `"html"` | getValue() output format |
| `onChange` | `(value: string) => void` | `undefined` | Content changed (debounced) |
| `onFocus` | `() => void` | `undefined` | Focus callback |
| `onBlur` | `() => void` | `undefined` | Blur callback |
| `onSubmit` | `(value: string) => void` | `undefined` | Ctrl+Enter callback |
| `submitOnCtrlEnter` | `boolean` | `false` | Enable Ctrl+Enter submit |

### FormattingAction Type

```typescript
type FormattingAction =
    | "bold" | "italic" | "strikethrough" | "link" | "code"
    | "orderedList" | "unorderedList" | "taskList";
```

Default toolbar actions: `["bold", "italic", "strikethrough", "link", "code"]`

## Keyboard Shortcuts

| Shortcut | Action | Condition |
|----------|--------|-----------|
| Ctrl+B | Bold | Has focus |
| Ctrl+I | Italic | Has focus |
| Ctrl+D | Strikethrough | Has focus |
| Ctrl+K | Insert link | Has focus + text selected |
| Ctrl+E | Inline code | Has focus |
| Ctrl+Shift+8 | Unordered list | `lists: true` |
| Ctrl+Shift+7 | Ordered list | `lists: true` |
| Ctrl+Shift+9 | Task list | `lists: true` |
| Ctrl+Enter | Submit | `submitOnCtrlEnter: true` |

## CSS Custom Properties

Override these on `.richtextinput` to customize appearance:

| Property | Default | Description |
|----------|---------|-------------|
| `--rti-bg` | `$input-bg` | Background |
| `--rti-border-color` | `$input-border-color` | Border |
| `--rti-focus-border-color` | `$input-focus-border-color` | Focus border |
| `--rti-focus-shadow` | `$input-focus-box-shadow` | Focus shadow |
| `--rti-color` | `$gray-900` | Text colour |
| `--rti-placeholder-color` | `$input-placeholder-color` | Placeholder |
| `--rti-toolbar-bg` | `$gray-100` | Toolbar background |
| `--rti-toolbar-border` | `$gray-300` | Toolbar border |

## STIE Integration

When STIE and Pill are loaded before RichTextInput, pass trigger definitions to enable inline entity references:

```html
<script src="components/smarttextinput/smarttextinput.js"></script>
<script src="components/pill/pill.js"></script>
<script src="components/richtextinput/richtextinput.js"></script>
<script>
    var mentionTrigger = {
        trigger: "@",
        name: "mention",
        activation: { precedingChar: "whitespace", minLength: 1, maxLength: 30 },
        dataSource: {
            query: function(text) {
                return Promise.resolve([
                    { id: "u1", label: "Alice Chen", sublabel: "Engineering" }
                ].filter(function(u) {
                    return u.label.toLowerCase().includes(text.toLowerCase());
                }));
            }
        },
        tokenRenderer: { display: "label", className: "pill pill-blue", icon: "bi bi-person" },
        tokenSerializer: {
            prefix: "@",
            pattern: /^@\[(.+?)\]\(user:(\w+)\)$/,
            serialize: function(t) { return "@[" + t.label + "](user:" + t.id + ")"; },
            deserialize: function(m) { return { id: m[2], label: m[1] }; }
        }
    };

    var editor = createRichTextInput({
        placeholder: "Type @ to mention someone...",
        triggers: [mentionTrigger],
        stieOptions: {
            queryDebounceMs: 100,
            onTriggerQuery: function(ev) { /* show popover */ }
        }
    });
    document.getElementById("container").appendChild(editor.getElement());
</script>
```

If STIE is not loaded, triggers are silently ignored and the component works as plain rich text.
