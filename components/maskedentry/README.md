<!-- AGENT: Documentation for the MaskedEntry component — masked input for sensitive non-password data. -->

# MaskedEntry

A specialised input field that masks sensitive non-password data — API keys, tokens, SSNs, connection strings, and similar secrets. Provides a show/hide toggle, copy-to-clipboard, and configurable masking strategy.

## Assets

| Asset | Path |
|-------|------|
| CSS | `components/maskedentry/maskedentry.css` |
| JS | `components/maskedentry/maskedentry.js` |
| Types | `components/maskedentry/maskedentry.d.ts` |

## Requirements

- **Bootstrap CSS** — for `input-group`, `form-control`, `btn`, `btn-outline-secondary`
- **Bootstrap Icons CSS** — for `bi-eye`, `bi-eye-slash`, `bi-clipboard`, `bi-check-lg`
- Does **not** require Bootstrap JS.

## Quick Start

```html
<link rel="stylesheet" href="components/maskedentry/maskedentry.css">
<script src="components/maskedentry/maskedentry.js"></script>
<script>
    var entry = createMaskedEntry("my-container", {
        value: "sk-abc123def456ghi789",
        label: "API Key",
        readonly: true
    });
</script>
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `value` | `string` | `""` | The sensitive value to mask |
| `placeholder` | `string` | `""` | Placeholder text when the input is empty |
| `maskMode` | `"native" \| "custom"` | `"native"` | Masking strategy |
| `maskChar` | `string` | `"•"` | Character used for custom mask mode |
| `initiallyRevealed` | `boolean` | `false` | Whether the value is visible on construction |
| `showCopyButton` | `boolean` | `true` | Show the copy-to-clipboard button |
| `showToggleButton` | `boolean` | `true` | Show the reveal/conceal toggle button |
| `copyFeedbackDuration` | `number` | `2000` | Duration in ms to show "Copied!" feedback |
| `disabled` | `boolean` | `false` | Disable the entire control |
| `readonly` | `boolean` | `false` | Make the input read-only (buttons still active) |
| `size` | `"sm" \| "default" \| "lg"` | `"default"` | Bootstrap size variant |
| `maxLength` | `number` | — | Maximum character length |
| `label` | `string` | — | Optional label text above the input |
| `cssClass` | `string` | — | Additional CSS classes |
| `onChange` | `function` | — | Fires when the user changes the value |
| `onCopy` | `function` | — | Fires after a successful clipboard copy |
| `onReveal` | `function` | — | Fires when reveal state changes |

## API

| Method | Returns | Description |
|--------|---------|-------------|
| `show(containerId)` | `void` | Append to a container by ID |
| `hide()` | `void` | Remove from DOM, keep state |
| `destroy()` | `void` | Hide, clean up, null references |
| `getValue()` | `string` | Current plaintext value |
| `setValue(value)` | `void` | Set a new value and re-mask |
| `isRevealed()` | `boolean` | Whether the value is visible |
| `reveal()` | `void` | Show the plaintext value |
| `conceal()` | `void` | Mask the value |
| `toggleReveal()` | `void` | Toggle between revealed and concealed |
| `enable()` | `void` | Enable the input and buttons |
| `disable()` | `void` | Disable the input and buttons |
| `getElement()` | `HTMLElement` | Root DOM element |

### Convenience Function

```typescript
createMaskedEntry(containerId, options)  // Create, show, and return
```

### Global Exports

```
window.MaskedEntry
window.createMaskedEntry
```

## Masking Modes

**Native mode** (`maskMode: "native"`) toggles the input between `type="password"` and `type="text"`. This leverages the browser's built-in masking and is the default.

**Custom mode** (`maskMode: "custom"`) keeps the input as `type="text"` at all times. When concealed, the component replaces the display value with repeated mask characters. The actual value is stored internally.

## Accessibility

- Input linked to label via `for`/`id`, or has `aria-label` when no label
- Toggle button has `aria-pressed` and dynamic `aria-label` ("Show value" / "Hide value")
- Copy button has `aria-label` of "Copy to clipboard"
- Visually hidden `role="status"` live region announces state changes
- Disabled state uses native `disabled` attribute
- Standard tab navigation through input, toggle, and copy buttons

## Examples

### Read-only API key display

```javascript
var entry = createMaskedEntry("api-key-container", {
    value: "sk-abc123def456ghi789jkl012mno345",
    label: "API Key",
    readonly: true,
    onCopy: function() { console.log("Key copied"); }
});
```

### Custom mask character

```javascript
var entry = createMaskedEntry("token-container", {
    value: "ghp_xxxxxxxxxxxxxxxxxxxx",
    maskMode: "custom",
    maskChar: "*",
    label: "GitHub Token"
});
```

### Small size variant

```javascript
var entry = createMaskedEntry("inline-container", {
    value: "bearer_token_value",
    size: "sm",
    showToggleButton: false
});
```

See `specs/maskedentry.prd.md` for the complete specification.
