<!-- AGENT: Documentation for the ConfirmDialog general-purpose confirmation modal component. -->

# ConfirmDialog

A general-purpose confirmation modal with customizable title, message, icon, buttons, and a promise-based API. Use this for "Are you sure?" / "Do you want to proceed?" flows. Distinct from ErrorDialog, which is designed for literate error messages with technical details and correlation IDs.

## Assets

| Asset | Path |
|-------|------|
| CSS | `dist/components/confirmdialog/confirmdialog.css` |
| JS | `dist/components/confirmdialog/confirmdialog.js` |
| Types | `dist/components/confirmdialog/confirmdialog.d.ts` |

## Requirements

- **Bootstrap CSS** -- for SCSS variables and `.btn-*` classes
- **Bootstrap Icons** -- variant icons (`bi-question-circle`, `bi-exclamation-triangle`, etc.)
- **Enterprise theme CSS** -- `dist/css/custom.css`
- Does **not** require Bootstrap JS.

## Quick Start

```html
<link rel="stylesheet" href="dist/css/custom.css">
<link rel="stylesheet" href="dist/icons/bootstrap-icons.css">
<link rel="stylesheet" href="dist/components/confirmdialog/confirmdialog.css">

<script src="dist/components/confirmdialog/confirmdialog.js"></script>
<script>
    async function handleDelete() {
        const confirmed = await showConfirmDialog({
            title: "Delete Item",
            message: "Are you sure you want to delete this item? This action cannot be undone.",
            variant: "danger",
            confirmLabel: "Delete",
        });

        if (confirmed) {
            deleteItem();
        }
    }

    // Danger shortcut
    async function handleQuickDelete() {
        const confirmed = await showDangerConfirmDialog(
            "This will permanently delete the project and all its data."
        );
        if (confirmed) { deleteProject(); }
    }
</script>
```

## API

### Global Functions

| Function | Returns | Description |
|----------|---------|-------------|
| `showConfirmDialog(options)` | `Promise<boolean>` | Show confirmation dialog; resolves `true` on confirm, `false` on cancel |
| `showDangerConfirmDialog(message, title?)` | `Promise<boolean>` | Danger variant shortcut with "Delete" label |

### Class: `ConfirmDialog`

```js
const dialog = new ConfirmDialog({ message: "Proceed with this action?" });
const confirmed = await dialog.show();
```

- `show()` -- Builds, mounts, and displays the dialog. Returns `Promise<boolean>`.

## ConfirmDialogOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `title` | `string` | `"Confirm"` | Dialog title text |
| `message` | `string` | **required** | Main message body |
| `icon` | `string` | Per variant | Bootstrap Icons class (e.g. `"bi-exclamation-triangle"`) |
| `variant` | `string` | `"default"` | `"default"`, `"danger"`, `"warning"`, `"info"` |
| `confirmLabel` | `string` | `"Confirm"` | Confirm button text |
| `cancelLabel` | `string` | `"Cancel"` | Cancel button text |
| `showCancel` | `boolean` | `true` | Whether to show the cancel button |
| `onConfirm` | `() => void` | -- | Callback fired on confirm (in addition to promise) |
| `onCancel` | `() => void` | -- | Callback fired on cancel (in addition to promise) |
| `closeOnBackdrop` | `boolean` | `true` | Close the dialog when the backdrop is clicked |
| `cssClass` | `string` | -- | Additional CSS class on the dialog root |
| `keyBindings` | `Partial<Record<string, string>>` | -- | Override default key combos |

## Variants

| Variant | Icon | Button Class | Use Case |
|---------|------|-------------|----------|
| `default` | `bi-question-circle` | `btn-primary` | General confirmation |
| `danger` | `bi-exclamation-triangle` | `btn-danger` | Destructive actions (delete, remove) |
| `warning` | `bi-exclamation-circle` | `btn-warning` | Potentially risky actions |
| `info` | `bi-info-circle` | `btn-info` | Informational confirmation |

## Keyboard

| Key | Action |
|-----|--------|
| `Escape` | Cancel (resolve `false`) |
| `Enter` | Confirm -- only when the confirm button is focused |
| `Tab` | Cycle focus between cancel and confirm buttons (focus trap) |

Key bindings can be overridden via the `keyBindings` option:

```js
showConfirmDialog({
    message: "Proceed?",
    keyBindings: { confirm: "Ctrl+Enter" },
});
```

## Accessibility

- Dialog uses `role="alertdialog"` and `aria-modal="true"`
- Title linked via `aria-labelledby`
- Message linked via `aria-describedby`
- Focus is trapped within the dialog buttons (Tab cycles between them)
- On open, focus moves to the confirm button
- On close, focus returns to the previously focused element
- Close button has `aria-label="Close"`
- Animations respect `prefers-reduced-motion: reduce`

## DOM Structure

```
div.confirmdialog-backdrop
  div.confirmdialog.confirmdialog-{variant} [role="alertdialog" aria-modal="true"]
    div.confirmdialog-header
      i.bi.{icon}.confirmdialog-icon.confirmdialog-icon-{variant}
      h5.confirmdialog-title "Confirm Action"
      button.confirmdialog-close [aria-label="Close"]
    div.confirmdialog-body
      p.confirmdialog-message "Are you sure?"
    div.confirmdialog-footer
      button.confirmdialog-cancel.btn.btn-secondary "Cancel"
      button.confirmdialog-confirm.btn.btn-{variant} "Confirm"
```

## Features

- **Promise-based** -- `await showConfirmDialog(...)` returns `true`/`false`
- **Four variants** -- default, danger, warning, info with matching icon and button colours
- **Focus trap** -- Tab cycles within the dialog; no focus escape
- **Focus restore** -- Returns focus to the previously active element on close
- **Backdrop dismiss** -- Click outside to cancel (configurable)
- **XSS safe** -- All content set via `textContent`, never `innerHTML`
- **Auto-cleanup** -- DOM is removed when the dialog resolves
- **No Bootstrap JS dependency** -- Fully standalone modal implementation
