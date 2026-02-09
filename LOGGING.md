<!-- AGENT: Logging standards for the reusable theme and component library. -->

# Logging

## 1. Scope and Rationale

This is a **reusable theme and component library**. Components from this library are embedded into larger SaaS applications that have their own logging infrastructure (Serilog, Winston, Pino, etc.).

**Therefore:**

* **Use the browser `console` API directly.** Do not introduce logging frameworks, wrappers, or abstractions.
* **Do not install logging dependencies.** No Winston, Pino, log4js, or similar libraries.
* **Do not create a shared logger module.** A centralised logger in a component library will conflict with or duplicate the host application's logging.

The host application owns the logging pipeline. Our components simply write to the console, and the host can intercept or suppress console output as it sees fit.

---

## 2. Console Methods (Level Mapping)

Use the native `console` methods. Each maps to a severity level:

| Method | Use For | Browser DevTools |
| --------------- | ------------------------------------------- | ---------------- |
| `console.debug` | Entry/exit, internal state, parameter values | Verbose (hidden by default) |
| `console.log` | Lifecycle events, initialisation, disposal | Info |
| `console.warn` | Recoverable anomalies, fallback behaviour | Warning |
| `console.error` | Failed operations, caught exceptions | Error |

**Rules:**

* Use `console.debug` for anything that would be noisy in normal use. Browser DevTools hides debug output by default, so this is safe to leave in production builds.
* Use `console.log` sparingly for meaningful lifecycle events (component mounted, configuration applied).
* Use `console.warn` when the component recovers but the situation is unusual (missing optional parameter, deprecated usage).
* Use `console.error` for genuine failures (DOM element not found, required parameter missing, API call failed).
* **Never use `console.info`.** It is functionally identical to `console.log` and adds no value. Prefer `console.log` for consistency.

---

## 3. Message Format

Prefix all messages with the component name in square brackets for easy filtering in DevTools.

**Format:** `[ComponentName] Message`

```typescript
console.log("[ErrorDialog] Initialised with 3 action buttons");
console.warn("[ErrorDialog] No suggestion text provided; section will be hidden");
console.error("[ErrorDialog] Target container element not found:", containerId);
console.debug("[ErrorDialog] Rendering technical details section");
```

For messages with structured data, pass the data as a separate argument so the browser can render it as an expandable object:

```typescript
console.debug("[ErrorDialog] Configuration:", { mode, actions, showTechnical });
console.error("[ErrorDialog] Failed to render:", error);
```

---

## 4. What to Log

### 4.1 Component Lifecycle

* Log when a component is initialised or disposed.
* Log the effective configuration after defaults are applied.

```typescript
console.log("[ErrorDialog] Initialised");
console.debug("[ErrorDialog] Effective config:", resolvedOptions);
```

### 4.2 Errors and Exceptions

* Every caught exception must be logged with `console.error`.
* Include the original error object so the browser preserves the stack trace.

```typescript
try
{
    renderContent(container);
}
catch (error)
{
    console.error("[ErrorDialog] Failed to render content:", error);
}
```

### 4.3 Fallback Behaviour

* When a component falls back to a default because of missing or invalid input, log a warning.

```typescript
if (!options.title)
{
    console.warn("[ErrorDialog] No title provided; using default 'Error'");
}
```

### 4.4 DOM Interaction Failures

* Log when an expected DOM element is not found.

```typescript
const container = document.getElementById(targetId);
if (!container)
{
    console.error("[ErrorDialog] Container element not found:", targetId);
    return;
}
```

---

## 5. What NOT to Log

* **Sensitive data.** Never log tokens, passwords, API keys, or personally identifiable information (PII).
* **High-frequency events.** Do not log on every keystroke, mouse move, or scroll event. If such logging is needed during development, use `console.debug` and remove it before committing.
* **Redundant state.** Do not log values that are obvious from context (e.g., logging `true` inside an `if (isValid)` block).

---

## 6. Production Considerations

Because we use `console.*` directly:

* **No build-time stripping is required.** `console.debug` is hidden by default in browser DevTools. `console.log` and `console.warn` provide useful runtime diagnostics for operators.
* **Host applications can suppress output** by overriding `console` methods or using DevTools filters. This is their responsibility, not ours.
* If a future need arises for build-time removal of debug statements, a simple Terser or ESBuild configuration in the consuming application can drop `console.debug` calls. The component library itself should not perform this stripping.

---

## 7. Enforcement Checklist for Agents

Before delivering component code, verify:

* [ ] All log calls use `console.debug`, `console.log`, `console.warn`, or `console.error` directly
* [ ] No logging libraries or abstractions are imported or created
* [ ] All messages are prefixed with `[ComponentName]`
* [ ] Errors include the original error object for stack trace preservation
* [ ] No sensitive data (tokens, passwords, PII) is logged
* [ ] High-frequency events are not logged (or use `console.debug` only during development)
* [ ] `console.info` is not used

---

## 8. Reference: Full Application Logging

The guidelines above apply to **this component library only**. When building full SaaS applications that consume this library, the application itself should implement comprehensive structured logging with correlation IDs, context propagation, and log aggregation. Those concerns belong to the application, not to reusable UI components.
