<!-- AGENT: Component documentation for ChatDock — the bottom-docked conversation surface for a dynamic UI. -->

# ChatDock

The conversation surface for a dynamic UI. Docks to the **bottom** and hovers over the canvas, which slides behind it.

That placement is deliberate and is the main thing distinguishing ChatDock from a chat sidebar: the canvas is the work, and chat is how you steer it. A pinned side panel permanently costs a third of the working area to a control surface that is idle most of the time.

## Features

- **Bottom dock** — the canvas scrolls behind, not beside
- **Turn transcript** — compact, scrollable, a live region for assistive tech
- **Scrub and branch** — selecting a turn emits so the host can rewind the canvas; branching emits separately
- **Busy state** — input disables while a turn is in flight
- **Draft preservation** — a half-written thought survives `getState()`/`setState()`
- **Surface contract** — `setData` / `on` / `getState` / `setState` / `destroy`

## Presentation only

ChatDock contains **no model integration**. It renders turns and emits submissions; the host decides what an utterance means. Selecting a turn merely emits — the host scrubs the canvas to that revision.

For rich Markdown rendering of assistant turns, compose the existing [Conversation](../conversation/README.md) component rather than duplicating it here.

## Assets

| Asset | Path |
|-------|------|
| CSS | `components/chatdock/chatdock.css` |
| JS | `components/chatdock/chatdock.js` |
| Manifest | `components/chatdock/chatdock.manifest.ts` |

No third-party dependencies.

## Quick Start

```html
<link rel="stylesheet" href="components/chatdock/chatdock.css">
<script src="components/chatdock/chatdock.js"></script>

<div id="dock-host"></div>
```

```javascript
const dock = createChatDock("dock-host", {
    placeholder: "Ask the canvas…",
    onSubmit: async (utterance) =>
    {
        dock.setBusy(true);
        const patch = await host.onResolve({ utterance, document: canvas.getDocument() });
        canvas.apply(patch);
        dock.setBusy(false);
    },
    onSelectTurn: (turn) => canvas.load(patchesUpTo(turn.revision)),
    onBranch:     (turn) => forkCanvasAt(turn.revision),
});
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `turns` | `ChatTurn[]` | `[]` | Initial turns |
| `placeholder` | `string` | `"Ask the canvas…"` | Input placeholder |
| `ariaLabel` | `string` | `"Ask the canvas"` | Accessible name for the input |
| `busy` | `boolean` | `false` | Start with input disabled |
| `onSubmit` | `(utterance) => void` | — | User submitted an utterance |
| `onSelectTurn` | `(turn) => void` | — | A turn was selected |
| `onBranch` | `(turn) => void` | — | The user branched from a turn |

## API

| Method | Description |
|--------|-------------|
| `setData("turns", turns)` | Replaces the transcript |
| `on(channel, handler)` | `"submit"`, `"selectTurn"`, `"branch"`. Returns an unsubscribe function. |
| `getState()` / `setState(s)` | `{ draft, historyOpen }` — preserves a half-written message |
| `submit()` | Submits the current draft programmatically |
| `setBusy(busy)` | Disables input while a turn is in flight |
| `getElement()` | Root element, or `null` once destroyed |
| `destroy()` | Tears down. Idempotent. |

## Select vs. branch

They are separate controls because they are very different acts. Selecting a turn **navigates** — it rewinds the canvas to how it looked then. Branching **creates** — it forks a new canvas from that point. Folding both into one click would make an exploratory glance destructive.

The branch control is revealed on hover to keep the transcript quiet at rest, and is always visible on coarse pointers where hover does not exist.

## Accessibility

The transcript is `role="log"` with `aria-live="polite"`, so new turns are announced without stealing focus. Turns are keyboard-reachable and respond to Enter. Every control is a real `<button type="button">`.

## Security

Turn text may be model output and is therefore untrusted. It is only ever assigned through `textContent`.

## Related

- [DynamicCanvas](../dynamiccanvas/README.md) — the surface being steered
- [WorkspaceShell](../workspaceshell/README.md) — the workspace tier
- [Conversation](../conversation/README.md) — richer turn rendering
- `specs/dynamicui.prd.md` §12.2
