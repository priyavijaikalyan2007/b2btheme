<!-- AGENT: Documentation for the LogConsole component — in-app logging console with level filtering, export, and theming. -->

# LogConsole

A reusable in-app logging console for displaying high-level user actions and system events. Renders a scrollable, level-filterable log feed with dark/light theming, per-level colour customisation, Clear/Export actions, rAF-batched DOM updates, and FIFO eviction.

## Features

- **5 log levels** — DEBUG, INFO, WARN, ERROR, SUCCESS with configurable colours
- **Level filtering** — Toggleable header chips; CSS show/hide (entries stay in memory)
- **Dark / light themes** — Full colour token override support
- **Clear & Export** — Clear all entries or download as `.txt`
- **rAF batching** — Multiple entries per frame batched into a single DOM update
- **FIFO eviction** — Oldest entries removed from memory and DOM when cap exceeded
- **Contained mode** — Relative positioning for embedding within parent containers
- **Full customisation** — Font family, font size, all theme colours, level colours, height

## Assets

| Asset | Path |
|-------|------|
| CSS | `dist/components/logconsole/logconsole.css` |
| JS | `dist/components/logconsole/logconsole.js` |
| Types | `dist/components/logconsole/logconsole.d.ts` |

**Requires:** Bootstrap Icons CSS (optional, for action button icons). Does **not** require Bootstrap JS.

## Quick Start

```html
<link rel="stylesheet" href="dist/components/logconsole/logconsole.css">
<script src="dist/components/logconsole/logconsole.js"></script>
<script>
    var log = createLogConsole({ theme: "dark", maxEntries: 500 });
    document.getElementById("my-container").appendChild(log.getElement());

    log.info("Application started");
    log.warn("Retry attempt 2/3");
    log.error("Request failed (status 500)");
    log.success("Session saved");
</script>
```

## API

### Constructor

```typescript
const log = new LogConsole(options?: LogConsoleOptions);
```

Creates the log console DOM element. Attach with `getElement()`.

### LogConsoleOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxEntries` | `number` | `500` | FIFO eviction threshold |
| `theme` | `"dark" \| "light"` | `"dark"` | Colour scheme |
| `showHeader` | `boolean` | `true` | Show header bar with filters and actions |
| `autoScroll` | `boolean` | `true` | Auto-scroll to newest entry |
| `exportFilenamePrefix` | `string` | `"logs"` | Download filename prefix |
| `levelColors` | `LogConsoleLevelColors` | — | Per-level badge colour overrides |
| `fontFamily` | `string` | monospace stack | Font family for all text |
| `fontSize` | `string` | `"12px"` | Font size |
| `backgroundColor` | `string` | theme default | Root background colour |
| `textColor` | `string` | theme default | Primary text colour |
| `headerBackgroundColor` | `string` | theme default | Header bar background |
| `entryBorderColor` | `string` | theme default | Entry row border colour |
| `mutedTextColor` | `string` | theme default | Timestamp / muted text colour |
| `height` | `string` | `"100%"` | Root element CSS height |
| `cssClass` | `string` | — | Additional CSS class(es) |
| `contained` | `boolean` | `false` | Relative positioning for embedding |
| `onClear` | `function` | — | Called after clear() |
| `onExport` | `function` | — | Called after export with text content |
| `onEntry` | `function` | — | Called after each entry is added |

### Default Level Colours

| Level | Colour | Hex |
|-------|--------|-----|
| DEBUG | Gray | `#94a3b8` |
| INFO | Blue | `#3b82f6` |
| WARN | Amber | `#f59e0b` |
| ERROR | Red | `#ef4444` |
| SUCCESS | Green | `#22c55e` |

### Shorthand Methods

```typescript
log.debug("Initialising...");
log.info("Session loaded");
log.warn("Retry attempt 2/3");
log.error("Request failed");
log.success("Diagram saved");
```

Each generates a timestamp automatically and calls `log()`.

### Structured Logging

```typescript
log.log({
    timestamp: "10:53:04.123",
    level: "INFO",
    message: "Custom timestamp entry"
});
```

### Methods

| Method | Description |
|--------|-------------|
| `debug(msg)` | Log a DEBUG message |
| `info(msg)` | Log an INFO message |
| `warn(msg)` | Log a WARN message |
| `error(msg)` | Log an ERROR message |
| `success(msg)` | Log a SUCCESS message |
| `log(entry)` | Log a structured entry with custom timestamp |
| `clear()` | Clear all entries from memory and DOM |
| `exportAsText()` | Returns all entries (unfiltered) as formatted text |
| `downloadAsText()` | Triggers a `.txt` download of all entries |
| `setFilter(levels)` | Set which log levels are visible |
| `getFilter()` | Get currently visible log levels |
| `getElement()` | Returns the root DOM element for embedding |
| `destroy()` | Remove from DOM and release all references |

### Convenience Functions

```typescript
createLogConsole(options?)  // Create and return
```

### Global Exports

```
window.LogConsole
window.createLogConsole
```

## Theme Tokens

| Token | Dark | Light |
|-------|------|-------|
| Background | `#1e293b` | `#f8fafc` |
| Text | `#e2e8f0` | `#1e293b` |
| Entry border | `#334155` | `#e2e8f0` |
| Header bg | `#334155` | `#f1f5f9` |
| Muted text | `#94a3b8` | `#64748b` |

All tokens can be overridden individually via options.

## Integration with TabbedPanel

```typescript
var logConsole = createLogConsole({ theme: "dark" });
var panel = createDockedTabbedPanel({
    tabs: [
        { id: "log", title: "Log Console", icon: "bi-terminal",
          content: logConsole.getElement() }
    ]
});

logConsole.info("Application started");
```

## Export Format

```
[10:53:04.123] [INFO   ] Saving session data to backend...
[10:53:04.198] [INFO   ] Session data saved successfully
[10:53:06.829] [WARN   ] Retry attempt 2/3
[10:53:14.200] [ERROR  ] Request failed (status 500)
```

Filename: `{prefix}-YYYY-MM-DDTHH-MM-SS.txt`

## Accessibility

- All text is natively selectable (no `user-select: none` on entries)
- Filter chips and action buttons are keyboard-focusable
- `role="log"` with `aria-live="polite"` for screen reader announcements

See `specs/2026-02-17-shared-log-console-requirements.md` for the full specification.
