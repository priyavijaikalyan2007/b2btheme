<!-- AGENT: Documentation for the ProgressModal component. -->

# ProgressModal

A modal dialog for displaying progress of long-running operations.

## Quick Start

```html
<link rel="stylesheet" href="https://static.knobby.io/components/progressmodal/progressmodal.css">
<script src="https://static.knobby.io/components/progressmodal/progressmodal.js"></script>

<script>
    // Indeterminate spinner
    var modal = showProgressModal({ title: "Processing..." });
    modal.logInfo("Starting operation...");
    modal.setStatus("Connecting...");
    // ... later
    modal.logSuccess("Done!");
    modal.complete("Operation finished.");

    // Stepped progress
    var stepped = showSteppedProgressModal("Uploading", 5);
    stepped.setStep(1);
    stepped.logInfo("Uploading file 1...");
    // ... later
    stepped.setStep(5);
    stepped.complete();
</script>
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `title` | `string` | Required | Modal title |
| `mode` | `"indeterminate" \| "determinate"` | `"indeterminate"` | Progress mode |
| `statusText` | `string` | — | Initial status message |
| `totalSteps` | `number` | — | Total steps (enables step counter) |
| `showTimestamps` | `boolean` | `true` | Timestamps in log |
| `showDetailLog` | `boolean` | `true` | Show scrollable log |
| `showCopyLog` | `boolean` | `true` | Copy log button |
| `autoClose` | `number` | `0` | Auto-close delay (ms) on success |
| `allowBackdropClose` | `boolean` | `false` | Backdrop dismissible when done |
| `wide` | `boolean` | `false` | Wide layout |
| `onCancel` | `() => void` | — | Cancel callback (shows button) |
| `onRetry` | `() => void` | — | Retry callback (shows on error) |
| `onClose` | `() => void` | — | Close callback |

## Instance Methods

| Method | Description |
|--------|-------------|
| `show()` | Show the modal |
| `setStatus(text)` | Update status text |
| `setProgress(0.0–1.0)` | Set progress (switches to determinate) |
| `setStep(n)` | Set current step (calculates %) |
| `setIndeterminate()` | Switch to spinner mode |
| `log(entry)` | Add log entry |
| `logInfo(msg)` | Add info entry |
| `logSuccess(msg)` | Add success entry |
| `logError(msg)` | Add error entry |
| `logWarning(msg)` | Add warning entry |
| `complete(msg?)` | Mark as complete |
| `fail(msg?)` | Mark as failed |
| `close()` | Close (after complete/fail) |
| `getLog()` | Get all entries |
| `getLogText()` | Get log as text |
| `getState()` | "running" / "completed" / "failed" / "closed" |
| `isVisible()` | Check visibility |
| `destroy()` | Remove from DOM |

## Log Entry Levels

| Level | Icon | Colour |
|-------|------|--------|
| `info` | `bi-info-circle` | Default |
| `success` | `bi-check-circle-fill` | Green |
| `error` | `bi-x-circle-fill` | Red |
| `warning` | `bi-exclamation-triangle-fill` | Yellow |
| `progress` | Mini spinner | Primary |

## Dependencies

- Bootstrap 5 CSS, Bootstrap Icons, Enterprise Theme CSS
- Does NOT require Bootstrap JS
