<!-- AGENT: Product Requirements Document for the MaskedEntry component — a non-password masked input for sensitive data like API keys, tokens, and connection strings. -->

# MaskedEntry Component

**Status:** Draft
**Component name:** MaskedEntry
**Folder:** `./components/maskedentry/`
**Spec author:** Agent
**Date:** 2026-02-20

---

## 1. Overview

### 1.1 What Is It

A specialised input field that masks sensitive non-password data — API keys, tokens, SSNs, connection strings, and similar secrets. The component provides a show/hide toggle to reveal or conceal the value, a copy-to-clipboard button that always copies the actual value regardless of mask state, and two masking strategies: native browser masking via `type="password"` or custom JavaScript character replacement using a configurable mask character.

The input and action buttons are composed using Bootstrap's `input-group` layout, producing a compact, familiar control that integrates cleanly with Bootstrap form styling.

### 1.2 Why Build It

Enterprise applications routinely display sensitive values that are not passwords — API keys on settings pages, database connection strings in configuration panels, bearer tokens in integration views. Developers resort to ad-hoc solutions: plain text inputs, hand-rolled toggle logic, or password fields repurposed beyond their intended semantics. A dedicated masked-entry component provides:

- Consistent masking behaviour across the application
- Copy-to-clipboard without revealing the value on screen
- Accessible toggle with proper ARIA semantics
- Custom mask characters for branding or UX differentiation

### 1.3 Design Inspiration

| Source | Key Pattern Adopted |
|--------|---------------------|
| Stripe Dashboard | API key display with masked value and one-click copy |
| GitHub Token Display | Masked token with reveal toggle and clipboard button |
| 1Password | Eye icon toggle for show/hide, custom mask characters |
| AWS Secrets Manager | Read-only secret display with copy action |

---

## 2. Anatomy

```
           label (optional)
┌──────────────────────────────────────┬──────┬──────┐
│ •••••••••••••••••••••                │  👁  │  📋 │
└──────────────────────────────────────┴──────┴──────┘
  input (masked or revealed)            toggle  copy
```

- **Label** — Optional text above the input, linked via `for`/`id`.
- **Input** — A text or password input displaying the masked or clear value.
- **Toggle button** — Eye / eye-slash icon to reveal or conceal the value.
- **Copy button** — Clipboard icon; copies the actual value regardless of mask state.

---

## 3. API

### 3.1 Interfaces

```typescript
interface MaskedEntryOptions
{
    /** The sensitive value to mask. */
    value?: string;

    /** Placeholder text when the input is empty. */
    placeholder?: string;

    /** Masking strategy. "native" uses type=password; "custom" uses JS replacement. Default: "native". */
    maskMode?: "native" | "custom";

    /** Character used for custom mask mode. Default: "•". */
    maskChar?: string;

    /** Whether the value is visible on construction. Default: false. */
    initiallyRevealed?: boolean;

    /** Show the copy-to-clipboard button. Default: true. */
    showCopyButton?: boolean;

    /** Show the reveal/conceal toggle button. Default: true. */
    showToggleButton?: boolean;

    /** Duration in ms to show "Copied!" feedback. Default: 2000. */
    copyFeedbackDuration?: number;

    /** Disable the entire control. Default: false. */
    disabled?: boolean;

    /** Make the input read-only (value not editable, buttons still active). Default: false. */
    readonly?: boolean;

    /** Bootstrap size variant. Default: "default". */
    size?: "sm" | "default" | "lg";

    /** Maximum character length for the input. */
    maxLength?: number;

    /** Optional label text rendered above the input. */
    label?: string;

    /** Fires when the user changes the value. */
    onChange?: (value: string) => void;

    /** Fires after a successful clipboard copy. */
    onCopy?: () => void;

    /** Fires when reveal state changes. */
    onReveal?: (revealed: boolean) => void;
}
```

### 3.2 Class: MaskedEntry

| Method | Description |
|--------|-------------|
| `constructor(options)` | Creates the component DOM but does not attach it. |
| `show(containerId)` | Appends the component into the container identified by `containerId`. |
| `hide()` | Removes the component from the DOM without destroying state. |
| `destroy()` | Hides, removes event listeners, and nulls all references. |
| `getValue()` | Returns the current plaintext value. |
| `setValue(value)` | Sets a new value and re-applies the current mask state. |
| `isRevealed()` | Returns `true` if the value is currently visible. |
| `reveal()` | Shows the plaintext value and updates the toggle icon. |
| `conceal()` | Masks the value and updates the toggle icon. |
| `toggleReveal()` | Toggles between revealed and concealed states. |
| `enable()` | Enables the input and buttons. |
| `disable()` | Disables the input and buttons. |
| `getElement()` | Returns the root `HTMLElement`. |

### 3.3 Globals

```typescript
window.MaskedEntry = MaskedEntry;
window.createMaskedEntry = createMaskedEntry;
```

`createMaskedEntry(containerId, options)` is a convenience function that creates and shows in one call.

---

## 4. Behaviour

### 4.1 Lifecycle

1. **Construction** — Builds the full DOM tree (label, input-group, input, buttons) but does not attach to the page.
2. **show(containerId)** — Appends to the target container.
3. **hide()** — Removes from DOM; internal state is preserved.
4. **destroy()** — Calls `hide()`, removes all event listeners, nulls references.

### 4.2 Masking Modes

**Native mode** (`maskMode: "native"`) toggles the input element between `type="password"` and `type="text"`. This leverages the browser's built-in masking and is the default.

**Custom mode** (`maskMode: "custom"`) keeps the input as `type="text"` at all times. When concealed, the component replaces `input.value` with repeated `maskChar` characters matching the real value length. The actual value is stored internally and restored on reveal.

### 4.3 Copy to Clipboard

The copy button calls `navigator.clipboard.writeText()` with the real value (never the masked display). On success, the button icon briefly changes to a checkmark (`bi-check-lg`) for `copyFeedbackDuration` milliseconds, then reverts to the clipboard icon. A live region announces "Copied to clipboard".

If the Clipboard API is unavailable, the component falls back to a hidden textarea with `document.execCommand("copy")`.

### 4.4 Toggle Reveal

Clicking the toggle button or calling `toggleReveal()` switches between revealed and concealed states. The button icon changes between `bi-eye` (concealed state — click to reveal) and `bi-eye-slash` (revealed state — click to conceal). The `onReveal` callback fires with the new state. A live region announces "Value revealed" or "Value hidden".

### 4.5 Read-Only and Disabled

**Read-only** — The input has `readonly` attribute; the user cannot type, but toggle and copy buttons remain active.

**Disabled** — The input has `disabled` attribute; both buttons are also disabled. The entire control appears muted.

---

## 5. Styling

### 5.1 CSS Classes

| Class | Element |
|-------|---------|
| `.maskedentry` | Root wrapper — contains optional label and the input-group |
| `.maskedentry-label` | Optional `<label>` element above the input group |
| `.maskedentry-group` | The Bootstrap `input-group` container |
| `.maskedentry-input` | The `<input>` element |
| `.maskedentry-toggle` | Toggle reveal/conceal button |
| `.maskedentry-copy` | Copy-to-clipboard button |
| `.maskedentry-sm` | Small size variant — applies Bootstrap `input-group-sm` |
| `.maskedentry-lg` | Large size variant — applies Bootstrap `input-group-lg` |
| `.maskedentry-feedback` | Visually hidden live region for screen reader announcements |

### 5.2 Theme Integration

- Input background: `$gray-50` (light theme default)
- Input text: `$gray-900`
- Button background: Bootstrap `btn-outline-secondary` defaults
- Disabled opacity: `$gray-400` text with reduced opacity
- Label text: `$gray-700`
- Focus ring: Bootstrap default focus styling
- Font: inherits `$font-family-base`
- SCSS import: `@import '../../src/scss/variables';`

### 5.3 Z-Index

No z-index management required. The component renders inline within its container.

---

## 6. Keyboard Interaction

| Key | Context | Action |
|-----|---------|--------|
| `Tab` | Any | Moves focus through input, toggle button, copy button in order |
| `Shift+Tab` | Any | Moves focus in reverse order |
| `Enter` | Toggle button focused | Toggles reveal/conceal |
| `Space` | Toggle button focused | Toggles reveal/conceal |
| `Enter` | Copy button focused | Copies value to clipboard |
| `Space` | Copy button focused | Copies value to clipboard |

No additional keyboard shortcuts beyond standard tab navigation and button activation.

---

## 7. Accessibility

- Input has `aria-label` matching the `label` option, or is linked to the rendered `<label>` element via `for`/`id`.
- Toggle button has `aria-pressed` reflecting the current reveal state, and `aria-label` of "Show value" (when concealed) or "Hide value" (when revealed).
- Copy button has `aria-label` of "Copy to clipboard".
- A visually hidden `<div>` with `role="status"` and `aria-live="polite"` announces state changes: "Value revealed", "Value hidden", "Copied to clipboard".
- Disabled state uses the native `disabled` attribute on inputs and buttons, which screen readers recognise automatically.
- Colour contrast meets WCAG AA for all text and icon elements.

---

## 8. Dependencies

- **Bootstrap 5 CSS** — `input-group`, `form-control`, `btn`, `btn-outline-secondary`, and size utility classes.
- **Bootstrap Icons** — `bi-eye`, `bi-eye-slash`, `bi-clipboard`, `bi-check-lg`.
- **Clipboard API** — `navigator.clipboard.writeText()` with `document.execCommand("copy")` fallback.
- No JavaScript framework dependencies.

---

## 9. Open Questions

1. Should the component support a "partial reveal" mode (e.g., show last 4 characters of an API key while masking the rest)?
2. Should the copy button support a configurable tooltip via Bootstrap's tooltip plugin, or is the live-region announcement sufficient?
3. Should there be an `onValidate` callback for custom input validation before accepting typed values?
