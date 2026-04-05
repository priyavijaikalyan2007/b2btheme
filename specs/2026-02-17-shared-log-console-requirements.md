# Shared Log Console Component — Requirements

## Problem

Three sub-apps (Thinker, Strukture, Diagrams) each have their own log console implementation with duplicated logic and divergent details. Checklists has no log console at all. The implementations share ~80% of the same code but differ in container IDs, themes, entry structure, timestamp formats, storage strategy, and capabilities.

| Aspect | Thinker | Strukture | Diagrams |
|--------|---------|-----------|----------|
| Storage | In-memory array (cap 1000) | In-memory array (cap 1000) | DOM-only (cap 100) |
| Container ID | `#log-container` | `#log-console-content` | `#log-panel-content` |
| Entry HTML | `span.log-level.log-level-{level}` | Same as Thinker | Level as class on div |
| Timestamp | ISO `HH:MM:SS.mmm` | Same as Thinker | `toLocaleTimeString()` |
| Data field | `span.log-data` (JSON) | Same as Thinker | Not rendered |
| Clear | Yes | Yes | No |
| Export | Yes (`.txt`) | Yes (`.txt`) | No |
| Filter | None | None | None |
| Theme | Dark | Light | Light |
| Levels | INFO, DEBUG, WARN, ERROR | Same | info, success, error, warning |

## Scope

This is a **high-level application & user action log**, not a debug log. The browser's JavaScript console (`createLogger`) remains the verbose debug channel. The UI LogConsole shows aggregate, human-readable events: "Session saved", "Sync failed", "Mode changed to pan", etc.

**Explicitly out of scope:**
- `createLogger` (browser console) stays completely separate — no auto-routing to UI
- No persistence across page refreshes — logs are transient, in-memory only
- No structured/expandable JSON data viewer — display is always flat text
- No text search — filtering is by log level only

## Goal

A single shared `LogConsole` component in `typescript/shared/components/` that:
1. Replaces all three implementations with zero behavioral regression
2. Accepts structured log lines (JSON for column parsing, flat text display)
3. Renders entries in a consistent, level-filterable UI
4. Can be themed per-app (dark or light)
5. Integrates as a TabbedPanel tab content element or standalone

## Functional Requirements

### FR-1: Log Entry Format

Each log entry is a flat object used to distinguish display columns:

```typescript
interface LogEntry {
    timestamp: string;   // "HH:MM:SS.mmm" (ISO substring)
    level: LogLevel;     // Display column + filter key
    message: string;     // Primary display text
}

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
```

**Level mapping from current apps:**
- Thinker/Strukture `INFO|DEBUG|WARN|ERROR` → same
- Diagrams `success` → `SUCCESS`, `warning` → `WARN`, `info` → `INFO`, `error` → `ERROR`

### FR-2: API

```typescript
interface LogConsoleOptions {
    maxEntries?: number;            // Eviction threshold (default: 500)
    theme?: 'dark' | 'light';      // Color scheme (default: 'dark')
    showHeader?: boolean;           // Show Clear/Export/Filter bar (default: true)
    autoScroll?: boolean;           // Scroll to newest entry (default: true)
    exportFilenamePrefix?: string;  // Download filename prefix (default: 'logs')
}

interface LogConsole {
    // --- Shorthand methods (generate timestamp automatically) ---
    debug(message: string): void;
    info(message: string): void;
    warn(message: string): void;
    error(message: string): void;
    success(message: string): void;

    // --- Structured (caller provides full entry) ---
    log(entry: LogEntry): void;

    // --- Actions ---
    clear(): void;
    exportAsText(): string;
    downloadAsText(): void;

    // --- Level filter (UI state) ---
    setFilter(levels: LogLevel[]): void;
    getFilter(): LogLevel[];

    // --- Lifecycle ---
    getElement(): HTMLElement;
    destroy(): void;
}

function createLogConsole(options?: LogConsoleOptions): LogConsole;
```

### FR-3: UI Layout

```
┌───────────────────────────────────────────────────────────────┐
│ [DEBUG] [INFO] [WARN] [ERROR] [SUCCESS]       [Clear] [Export]│  ← Header bar
├───────────────────────────────────────────────────────────────┤
│ 10:53:04.123  INFO   Saving session data to backend...        │  ← Scrollable entries
│ 10:53:04.198  INFO   Session data saved successfully          │
│ 10:53:06.829  WARN   Retry attempt 2/3                        │
│ 10:53:14.157  INFO   Mode: pan                                │
│ 10:53:14.200  ERROR  Request failed (status 500)              │
└───────────────────────────────────────────────────────────────┘
```

#### Header Bar
- **Level filter chips**: Toggleable buttons for each level. Filled = shown, outlined = hidden. All shown by default. Click to toggle.
- **Clear button**: Clears all entries from memory and DOM.
- **Export button**: Downloads all entries (unfiltered) as a `.txt` file.

#### Entry Rows
- **Timestamp**: Monospace, muted color, fixed-width
- **Level badge**: Color-coded, fixed-width, uppercase. Colors:
  - DEBUG: `#94a3b8` (gray)
  - INFO: `#3b82f6` (blue)
  - WARN: `#f59e0b` (amber)
  - ERROR: `#ef4444` (red)
  - SUCCESS: `#22c55e` (green)
- **Message**: Primary text, flex-grow, word-wrap

Display is always flat — one line per entry, no expandable sections.

#### Theming

| Token | Dark | Light |
|-------|------|-------|
| Background | `#1e293b` | `#f8fafc` |
| Text | `#e2e8f0` | `#1e293b` |
| Entry border | `#334155` | `#e2e8f0` |
| Header bg | `#334155` | `#f1f5f9` |
| Muted text | `#94a3b8` | `#64748b` |

### FR-4: Level Filtering

- Toggle individual levels on/off via header chips
- Multiple levels active simultaneously
- Default: all levels shown
- Filtering hides DOM entries via CSS (`display: none`) — does not remove from memory
- Export always includes ALL entries regardless of current filter
- Empty state: "No matching log entries" when all visible entries are filtered out

### FR-5: Integration with TabbedPanel

Works standalone or as a TabbedPanel tab:

```typescript
// As a TabbedPanel tab
const logConsole = createLogConsole({ theme: 'dark' });
const panel = window.createDockedTabbedPanel({
    tabs: [
        { id: 'log', title: 'Log Console', icon: 'bi-terminal', content: logConsole.getElement() },
    ],
});

// Standalone
someContainer.appendChild(logConsole.getElement());
```

### FR-6: Export Format

One entry per line, flat text:

```
[10:53:04.123] [INFO]  Saving session data to backend...
[10:53:04.198] [INFO]  Session data saved successfully
[10:53:06.829] [WARN]  Retry attempt 2/3
[10:53:14.200] [ERROR] Request failed (status 500)
```

Filename: `{exportFilenamePrefix}-YYYY-MM-DDTHH-MM-SS.txt`

### FR-7: Performance

- DOM updates batched via `requestAnimationFrame` when multiple entries arrive per frame
- Oldest entries evicted from both memory and DOM when `maxEntries` exceeded
- No virtual scrolling needed (500 entries is manageable)

## Non-Functional Requirements

### NFR-1: File Location

- Component: `typescript/shared/components/log-console.ts`
- Tests: `typescript/shared/components/log-console.test.ts`

### NFR-2: CSS

Self-contained styles via inline styles or a dynamically injected `<style>` block with `.app-log-*` prefix. No external CSS file.

### NFR-3: Zero Dependencies

DOM APIs only. Uses `createLogger` internally for its own debug output to browser console.

### NFR-4: Testing

- All 5 log levels render correctly
- Level filtering shows/hides entries
- `maxEntries` eviction removes oldest
- `clear()` empties entries and DOM
- `exportAsText()` returns correct format
- `downloadAsText()` triggers browser download
- Dark and light themes apply correct colors
- `getElement()` returns embeddable HTMLElement
- `destroy()` cleans up DOM

## Migration Path

### Phase 1: Build shared component
Create `createLogConsole()` with tests, both themes.

### Phase 2: Migrate Thinker
Replace `logEntries[]` + `addLogEntry()` + `appendLogEntryToUI()` + `clearLogs()` + `exportLogs()` in `thinker-state.ts`. Keep `logInfo()` etc. as thin wrappers → `logConsole.info()`.

### Phase 3: Migrate Strukture
Same pattern. Replace `strukture-state.ts` log functions.

### Phase 4: Migrate Diagrams
Replace `log()` in `diagrams-app-state.ts` and `buildLogTabContent()` in `diagrams-bottom-panel.ts`. Map `'success'` → `SUCCESS`.

### Phase 5: Add to Checklists (optional)
Wire into Checklists if/when a bottom panel is added.

## Use Cases by App

The LogConsole is used identically across sub-apps: a passive, scrolling feed of high-level user actions and system events. No app uses clickable entries, inline actions, progress bars, or incremental progress tracking. All entries are static text.

### Thinker (~80 distinct log call sites)

**Theme:** Dark | **Levels used:** DEBUG, INFO, WARN, ERROR

| Category | Example messages | Typical level |
|----------|-----------------|---------------|
| Startup sequence | `Application started`, `Initializing Cytoscape`, `App initialized successfully` | INFO/DEBUG |
| Session lifecycle | `Loading sessions from backend...`, `Loaded sessions from backend`, `Session access level: edit` | INFO/DEBUG |
| Session CRUD | `Creating session via backend...`, `Deleted session`, `Exported session: <title>`, `Imported session: <title>` | INFO/ERROR |
| Node/graph editing | `Created node: <id>`, `Created link`, `Deleted 3 element(s)`, `View-only mode - cannot create nodes` | INFO/WARN |
| Clipboard | `Copied 2 node(s) to clipboard`, `Pasted text as new node`, `Failed to paste: <message>` | INFO/ERROR |
| Layout/view | `Applied auto-layout`, `Grid: ON`, `Snap to Grid: OFF`, `Mode: pan` | INFO |
| AI generation | `Calling AI: anthropic / claude-sonnet-4-5-20250929`, `AI generation successful`, `AI generation timed out after 120 seconds` | INFO/WARN/ERROR |
| Settings sync | `Settings loaded from backend: provider=anthropic, model=...`, `Failed to sync settings to backend` | INFO/WARN |
| Log self-management | `Logs cleared`, `Logs exported` | INFO/DEBUG |

**Data payloads:** Thinker passes structured `data` objects (e.g. `{count: 5}`, `{sessionId}`, `{oldCount, newCount}`) that are currently serialized as inline JSON text. The shared component only needs the message string — callers can inline data into the message.

### Strukture (~60 distinct log call sites)

**Theme:** Dark | **Levels used:** DEBUG, INFO, WARN, ERROR

| Category | Example messages | Typical level |
|----------|-----------------|---------------|
| Startup sequence | `Application started`, `Loading data from backend`, `Application ready` | INFO/DEBUG |
| Data loading | `Data loaded successfully`, `Failed to load data`, `Using localStorage cache as fallback` | INFO/WARN/ERROR |
| User initialization | `Initializing current user`, `Current user initialized`, `Creating Person record for current user` | INFO |
| Graph engine | `Cytoscape initialized successfully`, `Graph rendered successfully`, `Selected org unit: <name>` | INFO/DEBUG |
| Tree view | `Tree view rendered successfully`, `Unit selected in tree view`, `Showing details page` | INFO/DEBUG |
| CRUD operations | 14 catch-all error handlers: `saveUnit failed`, `moveCurrentUnit failed`, `deleteCurrentUnit failed`, etc. | ERROR |
| Settings sync | Same pattern as Thinker | INFO/WARN/DEBUG |
| View toggles | `Switched to graph view`, `Switched to tree view` | INFO |

**Data payloads:** Same pattern as Thinker — structured objects like `{orgUnits, persons, memberships, relationships, resources, source}` and `{unitId, type}`.

### Diagrams (~40 distinct log call sites)

**Theme:** Dark | **Levels used:** info, success, error, warning → mapped to INFO, SUCCESS, ERROR, WARN

| Category | Example messages | Typical level |
|----------|-----------------|---------------|
| Diagram CRUD | `Loading diagrams...`, `Loaded 5 diagrams`, `Saving diagram...`, `Diagram saved` | INFO/SUCCESS |
| Folder management | `Created folder: <name>`, `Folder moved to Trash` | SUCCESS/ERROR |
| Trash operations | `Restoring diagram: <name>`, `Diagram restored`, `Trash emptied: 3 diagrams, 1 folders deleted` | INFO/SUCCESS |
| Collaboration | `Real-time collaboration connected`, `<userName> joined the diagram`, `Disconnected from collaboration server` | SUCCESS/INFO/WARN |
| NL Console events | `NL Console initialized with conversational mode`, `NL Console mode switched to: command` | INFO |

**No data payloads** — Diagrams uses plain message strings only. The `SUCCESS` level is unique to Diagrams (maps from the current `success` CSS class).

**Note:** The Diagrams NL Console tab (`#nl-output`) is a separate interactive chat/command UI — it is NOT part of the LogConsole and should remain separate.

### Checklists

**No log console currently exists.** All logging is browser-console only via `createLogger()`. A log console may be added in a future phase when a bottom panel is introduced.

### Cross-Cutting Patterns

1. **All entries are static text** — no clickable entries, hyperlinks, inline buttons, or expandable sections anywhere
2. **No incremental progress tracking** — no `"Processing 3/10..."` patterns; counts appear in post-completion messages
3. **Entity IDs appear in messages** but are never interactive (e.g. `{sessionId}`, `{unitId, type}` in inline JSON)
4. **Startup sequences** are the densest logging — typically 8-12 entries during app initialization
5. **Error patterns** are consistent: operation-level messages like `Failed to load data` or `saveUnit failed` + error detail
6. **Level distribution** (approximate): INFO 50%, DEBUG 25%, ERROR 15%, WARN 8%, SUCCESS 2% (Diagrams-only)

## Design Decisions (Resolved)

| Decision | Resolution | Rationale |
|----------|------------|-----------|
| `createLogger` ↔ `LogConsole` relationship | Completely separate | UI log is high-level user actions; JS console is verbose debug. Different audiences. |
| Persistence across refreshes | No | Logs are transient. Browser DevTools has its own persistence. |
| Data display format | Flat text only | JSON structure is for column parsing (level, timestamp, message), not for UI expansion. |
| Filtering capability | Level filter only | Level chips in header bar. No text search needed for aggregate action logs. |
