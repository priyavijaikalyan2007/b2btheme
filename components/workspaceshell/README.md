<!-- AGENT: Component documentation for WorkspaceShell — chrome for the workspace tier: canvas tabs, pins, and the history scrubber. -->

# WorkspaceShell

Chrome for the **workspace tier** of a dynamic UI: canvas tabs with pinning, a new-canvas control, a content region for the canvas to mount into, and a history scrubber.

> **Not to be confused with [WorkspaceSwitcher](../workspaceswitcher/README.md)**, which switches *tenants*. WorkspaceShell switches *canvases within one workspace*. Genuinely different concepts that collided on the same English word; the two coexist.

## Features

- **Canvas tabs** — pinned entries sort first and are visually marked
- **Three separate controls per tab** — select, pin, close
- **Content region** — a stable element id for the canvas to mount into
- **History scrubber** — appears only once the host reports a revision range
- **Surface contract** — `setData` / `on` / `getState` / `setState` / `destroy`

## Presentation only

WorkspaceShell holds **no storage** and knows nothing about how a canvas is loaded. Every control emits; the host decides. That keeps the workspace tier as substitutable as the canvas tier.

## Assets

| Asset | Path |
|-------|------|
| CSS | `components/workspaceshell/workspaceshell.css` |
| JS | `components/workspaceshell/workspaceshell.js` |
| Manifest | `components/workspaceshell/workspaceshell.manifest.ts` |

No third-party dependencies.

## Quick Start

```html
<link rel="stylesheet" href="components/workspaceshell/workspaceshell.css">
<script src="components/workspaceshell/workspaceshell.js"></script>

<div id="shell-host" style="height: 100vh;"></div>
```

```javascript
const shell = createWorkspaceShell("shell-host", {
    activeCanvasId: "c1",
    onSelectCanvas: (c) => loadCanvas(c.id),
    onNewCanvas:    ()  => createCanvas(),
    onScrub:        (r) => canvas.load(patchesUpTo(r)),
});

shell.setData("canvases", await host.listCanvases());

// The canvas mounts into the shell's content region.
const canvas = createDynamicCanvas(shell.getContentElement().id, { /* … */ });

shell.setRevisionRange(0, canvas.getDocument().revision);
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `canvases` | `WorkspaceCanvas[]` | `[]` | Initial canvases |
| `activeCanvasId` | `string` | — | Canvas to mark active on first render |
| `onSelectCanvas` | `(canvas) => void` | — | A tab was selected |
| `onPinCanvas` | `(canvas) => void` | — | A canvas was pinned or unpinned |
| `onCloseCanvas` | `(canvas) => void` | — | A canvas was closed |
| `onNewCanvas` | `() => void` | — | The new-canvas control was used |
| `onScrub` | `(revision) => void` | — | The history scrubber moved |

## API

| Method | Description |
|--------|-------------|
| `setData("canvases", list)` | Replaces the tab list; pinned entries sort first |
| `on(channel, handler)` | `"selectCanvas"`, `"pinCanvas"`, `"closeCanvas"`, `"newCanvas"`, `"scrub"` |
| `getState()` / `setState(s)` | `{ activeCanvasId, revision }` |
| `getContentElement()` | The element a canvas should mount into |
| `getActiveCanvasId()` | Currently active canvas id, or `null` |
| `setRevisionRange(min, max)` | Shows the history scrubber over a range |
| `getElement()` | Root element, or `null` once destroyed |
| `destroy()` | Tears down. Idempotent. |

## Three controls, not one

Select, pin and close are separate controls on every tab. Folding pin or close into the tab body would make an accidental click destructive — and closing a canvas is exactly the kind of thing a user should never do by mistake while reaching for a tab.

Pinned canvases sort first, and sorting happens when the data is set rather than at render time, so `getState()` and the DOM can never disagree about order.

## The scrubber is conditional

It renders nothing until the host calls `setRevisionRange()` with a real range. A canvas with one revision has no history worth scrubbing, and an inert slider is worse than no slider.

## Security

Canvas titles are user content and are only ever assigned through `textContent`.

## Related

- [DynamicCanvas](../dynamiccanvas/README.md) — mounts into the content region
- [ChatDock](../chatdock/README.md) — the conversation surface
- [WorkspaceSwitcher](../workspaceswitcher/README.md) — tenant switching, a different concept
- `specs/dynamicui.prd.md` §12.1
