<!-- AGENT: Adoption and compatibility guide for the Dynamic UI layer. The headline is that nothing breaks; this documents the four behavioural deltas and how to opt in. -->

# Dynamic UI — Adoption and Compatibility

## The short version

**Nothing breaks. There is no migration to perform.**

If your application uses this library today and has no interest in the dynamic canvas, you do nothing and observe nothing. Every constructor callback, option name, and method signature you rely on is unchanged and will stay unchanged.

This document exists because "nothing breaks" is a claim, and a claim about 118 components deserves evidence and a list of the exceptions.

---

## 1. What was added

The Dynamic UI layer added a **Surface contract** to components — `setData` / `on` / `getState` / `setState` / `destroy` — so a canvas can mount, feed, rewire, virtualize and restore them (ADR-141).

Crucially it was **added beside** the existing API, not in place of it:

```javascript
// Works today. Works after. Byte-for-byte identical.
createDataGrid({ columns, rows, onRowSelect: fn }, "host");

// New, additive. Nothing had to change to gain it.
const off = grid.on("selection", fn);
```

Internally the constructor callback became **subscriber zero** on a new emitter, so it still fires, and still fires *first*.

### Why this was not a rename

The obvious alternative — normalise every component onto one signature and one event API — was rejected because it would break every consumer. The library's CDN contract is additive-only with no hard pinning (ADR-139), which means a breaking change reaches every consumer within minutes and cannot be opted out of.

---

## 2. The four behavioural deltas

These are the only observable differences. None require action.

| # | Delta | Who it affects |
|---|---|---|
| 1 | `on()` on **DiagramEngine** widens its return from `void` to an unsubscribe function. `off()` remains permanently. | Nobody — every existing caller ignores the return value. |
| 2 | A throwing subscriber is now isolated, so one bad handler cannot starve the others. | Code relying on an exception in `onSelect` propagating a particular way. Strictly more robust. |
| 3 | `destroy()` is hardened to be idempotent everywhere. | Only code relying on a second `destroy()` throwing. |
| 4 | Passing both `onSelect` and `on("selection")` delivers to **both**. | Intended. Documented here so it is not a surprise. |

### The `on()` audit in full

Only three components declared an `on()` at all, and only one needed changing:

| Component | Site | Nature | Action |
|---|---|---|---|
| DiagramEngine | `diagramengine.ts` | Real handle method returning `void` | Widened; `off()` kept |
| SmartTextInput | `smarttextinput.ts` | Already returns an unsubscribe function | None |
| GraphMinimap | `graphminimap.ts:92` | A declaration inside `GraphCanvasHandle` describing a *consumed dependency*, not its own handle | None |

GraphMinimap is worth spelling out because it looks like a third case and is not: it declares the shape it expects of a GraphCanvas handed to it. TypeScript accepts a function returning a value where a `void` return is declared, so a widened implementation still satisfies it.

---

## 3. How the claim is verified

The additive guarantee is not asserted, it is **tested**. The conformance suite runs a *legacy-surface* assertion over every migrated component, checking that constructor callbacks still fire and still fire first. It runs in `npm test`.

Concretely: after DataGrid gained the full Surface contract, its existing 60-plus test suite passed **unchanged**. That is the guarantee holding empirically rather than by argument.

---

## 4. Factory signatures were NOT normalised

ADR-134 declares `create<Name>(containerId, options)` canonical. An audit found the fleet does not follow it:

| Style | Count |
|---|---|
| `create(containerId, options)` — the canonical form | 35 |
| `create(options, containerId)` | 27 |
| `create(options)` with the host element inside `options` | 45 |
| Non-standard or no factory | 11 |

Rather than re-signature 72 public factories, the convention is recorded as **data** in each manifest (`factoryStyle`, `containerOption`) and the runtime honours all three (ADR-144).

**For your existing code this means nothing changes.** For *new* components, the canonical form is still required — see `AGENTS.md`.

---

## 5. Opting in

Adoption is entirely additive and can stop at any step.

### Step 1 — use the new subscription surface (optional)

```javascript
const off = grid.on("selection", (rows) => console.log(rows));
off();   // detach later; a constructor callback could never do this
```

### Step 2 — persist and restore component state (optional)

```javascript
const state = grid.getState();     // JSON-serialisable, declared keys only
grid.setState(state);              // restores the user's place
```

### Step 3 — mount a canvas (the full feature)

```html
<script src="runtime/runtime.js"></script>
<script src="components/dynamiccanvas/dynamiccanvas.js"></script>
```

See [DYNAMIC_UI_GUIDE.md](DYNAMIC_UI_GUIDE.md) and `demo/dynamic-ui-host.js`.

---

## 6. New assets

Additive under ADR-139 — nothing moved.

| Asset | Path |
|---|---|
| Runtime bundle | `runtime/runtime.js` |
| Aggregated manifests | `capability-manifest.json` |
| Canvas | `components/dynamiccanvas/dynamiccanvas.{js,css}` |
| Sticky note | `components/stickynote/stickynote.{js,css}` |
| Annotation | `components/annotation/annotation.{js,css}` |

The runtime bundle must load **before** any component that consumes it. Components that do not use the canvas do not need it at all.

---

## 7. Components that will never be canvas-capable

Some entries in `components/` are not components in the sense the canvas means, and are permanently excluded with a written rationale rather than pending migration:

| Component | Why |
|---|---|
| MarkdownRenderer | A stateless rendering service — no host, no DOM ownership, no lifecycle |
| LogUtility | A logging service |
| TypeBadge | An element builder returning an `HTMLElement` |
| ThemeInit | A pre-paint boot script (ADR-137) |
| Toast, ConfirmDialog, ErrorDialog, ProgressModal | Transient or modal overlay surfaces, not canvas citizens |
| DynamicCanvas | The canvas host itself |

Their public APIs are untouched.

---

## 8. Getting help

- [DYNAMIC_UI_GUIDE.md](DYNAMIC_UI_GUIDE.md) — concepts and the host contract
- [SURFACE_CONTRACT.md](SURFACE_CONTRACT.md) — making a component canvas-capable
- `demo/dynamic-ui-host.js` — a complete working host in one file
- ADR-139 (CDN contract), ADR-141 (Surface contract), ADR-144 (factory styles)
