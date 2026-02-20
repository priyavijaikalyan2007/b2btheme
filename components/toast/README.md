<!-- AGENT: Documentation for the Toast component — transient notification system. -->

# Toast

A transient, non-blocking notification system with stacking, auto-dismiss, progress bar, and action support. Toasts appear at configurable viewport corners and stack newest-on-top.

## Assets

| Asset | Path |
|-------|------|
| CSS | `dist/components/toast/toast.css` |
| JS | `dist/components/toast/toast.js` |
| Types | `dist/components/toast/toast.d.ts` |

## Requirements

- **Bootstrap CSS** — for SCSS variables and `.btn-*` classes
- **Bootstrap Icons** — variant icons (`bi-info-circle-fill`, etc.)
- Does **not** require Bootstrap JS.

## Quick Start

```html
<link rel="stylesheet" href="dist/components/toast/toast.css">
<script src="dist/components/toast/toast.js"></script>
<script>
    showSuccessToast("Changes saved successfully", "Saved");
    showErrorToast("Failed to save changes", "Error");

    showToast({
        message: "Item deleted",
        variant: "warning",
        actionLabel: "Undo",
        onAction: function() { console.log("Undo clicked"); }
    });
</script>
```

## API

### Global Functions

| Function | Returns | Description |
|----------|---------|-------------|
| `showToast(options)` | `ToastHandle` | Show toast with full options |
| `showInfoToast(msg, title?)` | `ToastHandle` | Info variant shortcut |
| `showSuccessToast(msg, title?)` | `ToastHandle` | Success variant shortcut |
| `showWarningToast(msg, title?)` | `ToastHandle` | Warning variant shortcut |
| `showErrorToast(msg, title?)` | `ToastHandle` | Error variant shortcut |
| `clearAllToasts()` | `void` | Dismiss all and clear queue |
| `configureToasts(options)` | `void` | Set position, max visible, etc. |

### ToastOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `message` | `string` | **required** | Main notification text |
| `title` | `string` | — | Bold heading text |
| `variant` | `string` | `"info"` | `info`, `success`, `warning`, `error` |
| `icon` | `string` | — | Bootstrap Icons class (auto per variant) |
| `duration` | `number` | `5000` | Auto-dismiss ms (0 = persistent) |
| `dismissible` | `boolean` | `true` | Show close button |
| `showProgress` | `boolean` | `true` | Show countdown bar |
| `actionLabel` | `string` | — | Action button label |
| `onAction` | `function` | — | Action button callback |
| `onDismiss` | `function` | — | Called when dismissed |

### ToastContainerOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `position` | `string` | `"top-right"` | Viewport corner |
| `maxVisible` | `number` | `5` | Max simultaneous toasts |
| `gap` | `number` | `8` | Gap between toasts (px) |
| `zIndex` | `number` | `1070` | CSS z-index |

## Features

- Auto-dismiss with countdown progress bar
- Pause on hover (timer and animation pause)
- Queue management (excess toasts queued, promoted on dismiss)
- Four severity variants with auto-icons
- Action button support
- Keyboard: Escape dismisses focused toast
- `prefers-reduced-motion` support

## Accessibility

- Container: `role="region"`, `aria-label="Notifications"`, `aria-live="polite"`
- Error toasts: `role="alert"` (assertive announcement)
- Other toasts: `role="status"` (polite announcement)
- Close button: `aria-label="Dismiss notification"`
- Progress bar: `role="progressbar"` with `aria-valuenow/min/max`

See `specs/toast.prd.md` for the complete specification.
