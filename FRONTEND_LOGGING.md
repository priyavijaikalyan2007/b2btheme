<!--
SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
SPDX-FileCopyrightText: 2026 Outcrop Inc
SPDX-License-Identifier: MIT
Repository: instructions
File GUID: 539e0ee5-b59c-409f-9e11-44779a31c570
Created: 2026
-->

<!-- AGENT: Logging standards for post-mortem debugging and structured log output for frontends and frontend component libraries. -->

# Logging

## 0. Which document governs

LOGGING.md states the general principles: what to log, what not to log, which
severity each situation deserves, and the fact that the host application owns
the pipeline. Those principles still hold.

**This document is the authority for the mechanism in `components/`.** Where
LOGGING.md describes writing to `console` directly, this document supersedes
it. LOGGING.md was written before the LogUtility component existed and still
says not to create a shared logger. Read LOGGING.md for the principles and
this document for the code.

## 1. Scope and Rationale

This is a **reusable theme and component library**. Components from this
library are embedded into larger SaaS applications that may have their own
logging infrastructure (Serilog, Winston, Pino, and so on). To keep things
simple but flexible, this library ships its own logging utility, `LogUtility`.
That is a reusable component like any other. Every other component:

1.  Has its own logging functions for `trace`, `debug`, `info`, `warn`, and `error`.
2.  Independently checks whether `LogUtility` is loaded into the `window` globals.
3.  Logs through `LogUtility` when it is loaded.
4.  Logs straight to the console when it is not.

**Therefore, every component MUST follow the same pattern.** Declare a prefix,
resolve the utility once, and route every level through the result:

```typescript
/** Log prefix for all console messages from this component. */
const LOG_PREFIX = "[COMPONENT_NAME]";

/** Routes through LogUtility when the host page loads it. */
const _lu = (typeof window.createLogUtility === "function")
    ? window.createLogUtility().getLogger(LOG_PREFIX.slice(1, -1))
    : null;

/** Emits a structured info log. */
function logInfo(...args: unknown[]): void
{
    _lu
        ? _lu.info(...args)
        : console.log(new Date().toISOString(), "[INFO]", LOG_PREFIX, ...args);
}
```

Repeat that helper for `logWarn`, `logError`, `logDebug` and `logTrace`,
mapping each to `_lu.warn`, `_lu.error`, `_lu.debug` and `_lu.trace` and to
`console.warn`, `console.error`, `console.debug` and `console.debug`. Declare
the levels the component actually uses. A component with no trace-level
instrumentation does not need a dead `logTrace`.

* **Use only the `_lu` helpers** for logging.
* **Do not install logging dependencies.** Do not introduce ANY other logging framework, wrapper, or abstraction. No Winston, Pino, log4js, or similar.
* **No `window as any` cast.** `components/globals.d.ts` declares
  `window.createLogUtility`, so the lookup is typed. A cast here would both
  lose the type and add to the WIN-1 count in CODEBASE_FIXES.md.

The host application owns the logging pipeline. Our components write to the
console, and the host can intercept or suppress that output as it sees fit.

### 1.1 One variant: a bundle with many namespaces

`DiagramEngine` is a special case. Thirty source modules under
`components/diagramengine/src/` are concatenated into one file by
`scripts/bundle-diagramengine.sh`, and they carry twenty distinct log
prefixes between them. Repeating the preamble above twenty times would add
roughly six hundred lines of near-identical code to the largest file in the
repository, which works against STD-1.

So that bundle resolves LogUtility once per namespace through a factory in
`components/diagramengine/src/logging.ts`, and each module destructures the
levels it uses:

```typescript
const { debug: logPenDebug, info: logPenInfo } = makeLogger(PEN_LOG_PREFIX);
```

**The boundary matters.** `makeLogger` is a local helper inside a single
concatenated file, not a module other components import. A shared logger
module imported across component boundaries is the thing LOGGING.md section 1
forbids, and this is not that. Use the factory form only inside a bundle that
is concatenated from many modules and carries more than one prefix. Everywhere
else, use the pattern in section 1.

### 1.2 Resolution happens once, at load

`_lu` is assigned when the component bundle is evaluated, so the host page
must load `logutility.js` **before** any component bundle for routing to
happen. A page that loads it afterwards gets the console fallback for the
whole session, with no error.

Two consequences:

* A page that does not load `logutility.js` is fully supported. The fallback
  prints the same text to the console. Of the 138 demo pages in this
  repository, 6 load it.
* `ThemeInit` runs in `<head>` before every other script by design, so its
  `_lu` is effectively always null. The guarded `typeof` check costs nothing
  and keeps the pattern uniform, and the console fallback is the expected
  path there rather than a degraded one.

---

## 2. Logging Methods (Level Mapping)

Use the `_lu` methods. Each maps to a severity level:

| Method | Use For | Browser DevTools |
| --------------- | ------------------------------------------- | ---------------- |
| `logTrace` | High volume operations such as handler tracking | Verbose (hidden by default) |
| `logDebug` | Entry/exit, internal state, parameter values | Verbose (hidden by default) |
| `logInfo` | Lifecycle events, initialisation, disposal | Info |
| `logWarn` | Recoverable anomalies, fallback behaviour | Warning |
| `logError` | Failed operations, caught exceptions | Error |

**Rules:**

* Use `logTrace` for anything that would be high frequency or super noisy in normal use such as event handler tracing. 
  Browser DevTools hides debug output by default, so this is safe to leave in production builds.
* Use `logDebug` for anything that would be noisy in normal use. Browser DevTools hides debug output by default, 
  so this is safe to leave in production builds.
* Use `logInfo` sparingly for meaningful lifecycle events (component mounted, configuration applied).
* Use `logWarn` when the component recovers but the situation is unusual (missing optional parameter, deprecated usage).
* Use `logError` for genuine failures (DOM element not found, required parameter missing, API call failed).

* **Never call `console.*` directly.** The helpers are the only entry point. The
  fallback inside a helper is the single exception, and `console.info` is not
  used even there: it is identical to `console.log` and adds nothing.

---

## 3. Message Format

All messages are automatically prefixed with timestamp, level, and component name by the logging helpers.

**Output format:** `[ISO-TIMESTAMP] [LEVEL] [ComponentName] Message`

```
2026-03-30T10:15:00.000Z [INFO] [ErrorDialog] Initialised with 3 action buttons
2026-03-30T10:15:00.001Z [WARN] [ErrorDialog] No suggestion text provided; section will be hidden
2026-03-30T10:15:00.002Z [ERROR] [ErrorDialog] Target container element not found: my-container
2026-03-30T10:15:00.003Z [DEBUG] [ErrorDialog] Rendering technical details section
2026-03-30T10:15:00.004Z [TRACE] [ErrorDialog] DOM mutation: childList on .error-body
```

**In code**, use the logging helpers — never raw `console.*`:

```typescript
logInfo("Initialised with", actions.length, "action buttons");
logWarn("No suggestion text provided; section will be hidden");
logError("Target container element not found:", containerId);
logDebug("Rendering technical details section");
logTrace("DOM mutation:", { target: el, type: "childList" });
```

For messages with structured data, pass the data as a separate argument so the browser can render it as an expandable object:

```typescript
logDebug("Configuration:", { mode, actions, showTechnical });
logError("Failed to render:", error);
```

---

## 4. What to Log

### 4.1 Component Lifecycle

* Log when a component is initialised or disposed.
* Log the effective configuration after defaults are applied.

```typescript
logInfo("Initialised");
logDebug("Effective config:", resolvedOptions);
logInfo("Destroyed", instanceId);
```

### 4.2 Errors and Exceptions

* Every caught exception must be logged with `logError`.
* Include the original error object so the browser preserves the stack trace.

```typescript
try
{
    renderContent(container);
}
catch (error)
{
    logError("Failed to render content:", error);
}
```

### 4.3 Fallback Behaviour

* When a component falls back to a default because of missing or invalid input, log a warning.

```typescript
if (!options.title)
{
    logWarn("No title provided; using default 'Error'");
}
```

### 4.4 DOM Interaction Failures

* Log when an expected DOM element is not found.

```typescript
const container = document.getElementById(targetId);
if (!container)
{
    logError("Container element not found:", targetId);
    return;
}
```

### 4.5 Trace-Level Instrumentation

* Use `logTrace` for very high-frequency or low-level operations.
* Safe to leave in production — trace output is hidden by default.

```typescript
logTrace("mousedown handler fired:", { x: e.clientX, y: e.clientY });
logTrace("render cycle:", { objectCount: objects.length, frameId });
logTrace("DOM mutation:", { target: el.tagName, type: "childList" });
```

---

## 5. What NOT to Log

* **Sensitive data.** Never log tokens, passwords, API keys, or personally identifiable information (PII).
* **High-frequency events.** Do not log on every keystroke, mouse move, or scroll event with `logInfo` or above. Use `logTrace`, which browsers hide by default, and leave it in place.
* **Redundant state.** Do not log values that are obvious from context (e.g., logging `true` inside an `if (isValid)` block).

---

## 6. Runtime Debug Flags

Global variables on `window` allow customer support or developers to enable verbose logging
at runtime without reloading the page:

| Flag | Effect |
|------|--------|
| `window.__ebt_debug_logging = true` | Enable DEBUG level output |
| `window.__ebt_info_logging = true` | Enable INFO level output |
| `window.__ebt_trace_logging = true` | Enable TRACE level output |

**WARN and ERROR are always enabled** — they cannot be suppressed.

Flags are checked on every log call, so toggling them in the browser console takes effect
immediately. This is useful for customer support scenarios where a customer reports a problem
and the support engineer needs to see verbose component output.

```javascript
// In the browser console:
window.__ebt_debug_logging = true;   // verbose debug output starts
window.__ebt_info_logging = true;    // informational messages appear
window.__ebt_trace_logging = true;   // ultra-verbose trace output

// Turn off when done:
window.__ebt_debug_logging = false;
```

**The full demo and the four studio pages** enable all three flags for
development convenience. That is 5 of the 138 demo pages, not all of them, so
do not assume verbose output is on when reading a demo page.

---

## 7. Production Considerations

Because the fallback path writes to `console.*` and LogUtility writes to
`console.*` too:

* **No build-time stripping is required.** `console.debug` is hidden by default in browser DevTools. `console.log` and `console.warn` provide useful runtime diagnostics for operators.
* **Host applications can suppress output** by overriding `console` methods or using DevTools filters. This is their responsibility, not ours.
* **LogUtility** is optional. If not loaded, components fall back to direct `console.*` calls with the same format. There is zero runtime overhead when LogUtility is absent.
* **Global flags** (`__ebt_*_logging`) provide runtime control without rebuilds or configuration changes — ideal for production troubleshooting.
* If a future need arises for build-time removal of debug statements, a simple Terser or ESBuild configuration in the consuming application can drop `console.debug` calls. The component library itself should not perform this stripping.

---

## 8. Reference: Full Application Logging

The guidelines above apply to **this component library only**. When building full SaaS applications that consume this library, the application itself should implement comprehensive structured logging with correlation IDs, context propagation, and log aggregation. Those concerns belong to the application, not to reusable UI components.

## 9. Enforcement Checklist for Agents

Before delivering code, the agent **must verify**:

  * [ ] Every log call goes through a `log*` helper. No raw `console.*` outside a helper fallback.
  * [ ] The helpers resolve LogUtility through `window.createLogUtility`, with no `window as any` cast.
  * [ ] `_lu` is resolved once, at module scope, not per call.
  * [ ] The prefix is declared as `LOG_PREFIX` (or a namespaced equivalent inside the DiagramEngine bundle).
  * [ ] Errors include the original error object, so the browser keeps the stack trace.
  * [ ] No sensitive data (tokens, passwords, PII) is logged.
  * [ ] High-frequency events use `logTrace`, never `logInfo` or above.
  * [ ] Entry, exit and branch decisions are logged at `logDebug` or `logTrace`.
  * [ ] Every caught exception is logged.
  * [ ] No logging library or abstraction is imported or created, except the `logutility` component.

Correlation IDs, request context propagation and log aggregation are the host
application's concern, as section 8 says. A component includes a correlation
ID only when the caller hands it one.
