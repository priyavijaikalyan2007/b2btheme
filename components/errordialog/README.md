<!-- AGENT: Documentation for the ErrorDialog literate error modal component. -->

# ErrorDialog Component

A Bootstrap 5 modal that displays literate error messages with user-friendly narrative and collapsible technical details.

## Dependencies

- Bootstrap 5 JS (Modal API) — loaded as a global script
- Bootstrap Icons CSS — for header and UI icons
- Enterprise theme CSS — `dist/css/custom.css`
- Component CSS — `dist/components/errordialog/errordialog.css`

## Quick Start

```html
<!-- In your HTML head -->
<link rel="stylesheet" href="dist/css/custom.css">
<link rel="stylesheet" href="dist/icons/bootstrap-icons.css">
<link rel="stylesheet" href="dist/components/errordialog/errordialog.css">

<!-- Container where modals will be injected -->
<div id="error-dialog-container"></div>

<!-- Scripts -->
<script src="dist/js/bootstrap.bundle.min.js"></script>
<script src="dist/components/errordialog/errordialog.js"></script>
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
