<!-- AGENT: Documentation for the ErrorDialog literate error modal component. -->

# ErrorDialog Component

A Bootstrap 5 modal that displays literate error messages with user-friendly narrative and collapsible technical details.

## Dependencies

- Bootstrap 5 JS (Modal API) — loaded as a global script
- Bootstrap Icons CSS — for header and UI icons
- Enterprise theme CSS — `css/custom.css`
- Component CSS — `components/errordialog/errordialog.css`

## Quick Start

```html
<!-- In your HTML head -->
<link rel="stylesheet" href="css/custom.css">
<link rel="stylesheet" href="icons/bootstrap-icons.css">
<link rel="stylesheet" href="components/errordialog/errordialog.css">

<!-- Container where modals will be injected -->
<div id="error-dialog-container"></div>

<!-- Scripts -->
<script src="js/bootstrap.bundle.min.js"></script>
<script src="components/errordialog/errordialog.js"></script>
<script>
    showErrorDialog("error-dialog-container", {
        title: "Document Could Not Be Saved",
        message: "The server rejected the save request.",
        suggestion: "Please try again in a moment.",
        errorCode: "DOC_SAVE_FAILED",
        correlationId: "a1b2c3d4-e5f6-7890"
    });
</script>
```

## LiterateError Interface

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | `string` | Yes | Short, non-alarming summary |
| `message` | `string` | Yes | Full sentence in plain language |
| `suggestion` | `string` | No | Actionable advice for the user |
| `errorCode` | `string` | No | Unique, searchable error code |
| `correlationId` | `string` | No | UUID linking to backend logs |
| `timestamp` | `string` | No | UTC timestamp of the error |
| `technicalDetail` | `string` | No | Stack trace, API response, etc. |
| `context` | `Record<string, string>` | No | Key-value pairs of system state |
| `onRetry` | `() => void` | No | Callback for the Retry button |

## API

### Class: `ErrorDialog`

```js
const dialog = new ErrorDialog("container-id");
dialog.show({ title: "Error", message: "Something went wrong." });
dialog.hide();
dialog.destroy();
```

- `show(error)` — Builds and displays the modal
- `hide()` — Hides the modal (triggers cleanup)
- `destroy()` — Removes the modal element from the DOM

### Function: `showErrorDialog(containerId, error)`

One-liner convenience function. Creates an `ErrorDialog` instance and immediately shows it.

### Function: `createErrorDialog(containerId, options)` (ADR-246)

Shows the error at once and returns a handle. `options` is the `LiterateError` plus two additive fields:

| Option | Default | Description |
|---|---|---|
| `showRetry` | `false` | Show Retry without `onRetry`, for a `retry` subscriber |
| `contained` | `false` | Show the dialog in place inside the container, with no Bootstrap Modal and no page backdrop. Its Close buttons and Escape close it; Escape and Ctrl+C work only while focus is inside it |

| Member | Description |
|---|---|
| `on("close" \| "retry", handler)` | Subscribes with `{}`. `retry` fires after `onRetry`; `close` fires when the dialog closes. Returns the unsubscribe |
| `getState()` / `setState(state)` | Nothing to restore |
| `setData(slot, value)` | Throws: the dialog has no data slots |
| `getElement()` | The dialog's root while it is open, or `null` |
| `hide()` / `destroy()` | Close the dialog / remove it without a `close` event. `destroy` is idempotent |

### Over A2UI

ErrorDialog is in the A2UI catalog. It is always contained, so it shows no Bootstrap Modal and no page backdrop. Retry sends `onRetry` (set `showRetry: true` to offer it), and closing sends `onClose`. The adapter loads Bootstrap's JS for the technical-details toggle, unless the page already has it.

## Features

- **Danger header** — Red header strip with exclamation icon
- **Suggestion box** — Light alert with lightbulb icon (only when suggestion provided)
- **Technical accordion** — Collapsible section with error code, correlation ID, timestamp, context, and stack trace
- **Copy to clipboard** — Copies all technical details with visual feedback
- **Retry button** — Shown only when `onRetry` callback is provided
- **XSS safe** — All content set via `textContent`, never `innerHTML`
- **Auto-cleanup** — Modal DOM is removed when dismissed

## Accessibility

- Modal uses `aria-labelledby` pointing to the title
- Close button has `aria-label="Close"`
- Suggestion box has `role="alert"`
- Tab navigation works across all focusable elements
- Escape key closes the modal
