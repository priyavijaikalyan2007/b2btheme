<!-- AGENT: Documentation for the LogUtility component -- centralised logging utility. -->

# LogUtility

A non-visual, centralised logging utility that replaces per-component `logInfo`/`logWarn`/`logError`/`logDebug` helper functions with a singleton providing named loggers, level filtering, timestamp control, and optional LogConsole routing.

## Assets

| Asset | Path |
|-------|------|
| JS | `components/logutility/logutility.js` |
| Types | `components/logutility/logutility.d.ts` |

## Requirements

- No external dependencies.
- Does **not** require Bootstrap CSS or JS.
- Optional integration with the LogConsole component for user-visible event routing.

## Quick Start

```html
<script src="components/logutility/logutility.js"></script>
<script>
    // Create the singleton (or retrieve it if already created).
    var logUtil = createLogUtility({ level: "info" });

    // Create a named logger for a component.
    var log = logUtil.getLogger("MyComponent");

    log.info("initialised");
    log.warn("deprecation notice");
    log.error("failed to load", new Error("timeout"));
    log.debug("internal state", { count: 42 });
</script>
```

## API

### Factory Function

| Function | Returns | Description |
|----------|---------|-------------|
| `createLogUtility(options?)` | `LogUtility` | Create or retrieve the singleton |
| `resetLogUtility()` | `void` | Destroy and reset the singleton for a fresh start |

### LogUtilityOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `level` | `"debug" \| "info" \| "warn" \| "error"` | `"debug"` | Minimum log level |
| `timestamps` | `boolean` | `true` | Include ISO timestamps in output |
| `logConsole` | `LogConsoleHandle` | `null` | Route user-visible events to a LogConsole |
| `consoleOutput` | `boolean` | `true` | Enable or disable browser console output |

### LogUtility Methods

| Method | Description |
|--------|-------------|
| `getLogger(componentName)` | Create a named Logger for a component |
| `setLevel(level)` | Change the minimum log level at runtime |
| `setLogConsole(lc)` | Attach or detach a LogConsole for event routing |
| `setConsoleOutput(enabled)` | Toggle browser console output |
| `destroy()` | Release resources |

### Logger Methods

| Method | Description |
|--------|-------------|
| `info(...args)` | Log an informational message |
| `warn(...args)` | Log a warning message |
| `error(...args)` | Log an error (never filtered by level) |
| `debug(...args)` | Log a debug message |
| `event(message, data?)` | Log a user-visible event, routed to LogConsole if configured |

## Output Format

Each log message is formatted as:

```
[ISO-TIMESTAMP] [LEVEL] [ComponentName] message args...
```

Examples:

```
2026-03-29T14:30:00.000Z [INFO] [MyComponent] initialised
2026-03-29T14:30:00.001Z [WARN] [MyComponent] deprecation notice
2026-03-29T14:30:00.002Z [ERROR] [MyComponent] failed to load Error: timeout
2026-03-29T14:30:00.003Z [DEBUG] [MyComponent] internal state { count: 42 }
```

Timestamps can be disabled by passing `timestamps: false`.

## Level Filtering

Log levels have a numeric hierarchy: `debug (0) < info (1) < warn (2) < error (3)`.

Setting the level to `"warn"` suppresses `debug` and `info` messages. Errors are **never** filtered regardless of the configured level.

```javascript
var logUtil = createLogUtility({ level: "warn" });
var log = logUtil.getLogger("Filtered");

log.debug("suppressed");  // Not output
log.info("suppressed");   // Not output
log.warn("visible");      // Output
log.error("always");      // Output (errors are never filtered)
```

## LogConsole Integration

When a `LogConsoleHandle` is attached, calls to `logger.event()` are routed to the LogConsole in addition to the browser console. This is useful for displaying user-visible events in an in-app log panel.

```javascript
var logUtil = createLogUtility();

// Attach a LogConsole later.
logUtil.setLogConsole(myLogConsoleInstance);

var log = logUtil.getLogger("Auth");
log.event("User logged in", { userId: 42 });
// Console: [INFO] [Auth] User logged in { userId: 42 }
// LogConsole: "[Auth] User logged in"
```

## Console Output Toggle

Console output can be disabled entirely for production or testing scenarios.

```javascript
logUtil.setConsoleOutput(false);  // Silence all console output
logUtil.setConsoleOutput(true);   // Re-enable console output
```

## Singleton Behaviour

`createLogUtility()` returns the same instance on every call. The options argument is only used on the first call. To create a fresh instance with different options, call `resetLogUtility()` first.

```javascript
var lu1 = createLogUtility({ level: "info" });
var lu2 = createLogUtility({ level: "error" });  // Same instance as lu1

resetLogUtility();

var lu3 = createLogUtility({ level: "error" });  // Fresh instance
```

## Window Globals

| Global | Type | Description |
|--------|------|-------------|
| `window.createLogUtility` | `function` | Factory for the singleton |
| `window.resetLogUtility` | `function` | Reset the singleton |
| `window.LogUtility` | `class` | The implementation class |
