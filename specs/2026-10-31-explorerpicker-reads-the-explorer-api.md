# Component Request: ExplorerPicker Reads the Explorer API as It Is, and Can Be Hosted

> **Date:** 2026-10-31
> **Severity:** High (the component cannot be used in a dialog against the live API; it is used nowhere today)
> **Component:** CDN ExplorerPicker (`static.knobby.io/components/explorerpicker/`)
> **Affected Apps:** every app with the Explorer pane (Diagrams, Checklists, Thinker, Strukture, Explorer). The knobby.io Move dialog waits on this (knobbyio/apps #349).

---

## Summary

Hosted in a FormDialog `custom` field with `selectionTarget: 'container'`, the picker shows no tree. It calls an endpoint that does not exist, expects bare arrays where the Explorer API returns objects, and always renders a footer with its own Confirm button, which duplicates the host dialog's buttons.

Console, 30 October 2026, against `/api/v1/explorer`:

```
Failed to load resource: the server responded with a status of 404 (Not Found)      ← GET /recent
[ExplorerPicker] loadInitialData Unable to load resources.
handleMove: Move picker failed: loadInitialData | Error: e.forEach is not a function  ← GET /tree
```

---

## Problem 1: response shapes

The picker treats each response as a bare array. Every Explorer list response is an object, and has been since the API was written:

| Endpoint | The API returns | The picker expects |
|---|---|---|
| `GET /tree` | `{ "nodes": [Node, …] }` | `[Node, …]` |
| `GET /nodes/{id}/children` | `{ "nodes": [Node, …] }` | `[Node, …]` |
| `GET /search` | `{ "hits": [{ "node": Node, "breadcrumbs": [Node, …] }], "totalCount": n, "nextPageToken": string \| null }` | `[{ …Node, "breadcrumb": "A > B" }]` |
| `GET /starred` | `{ "items": [{ "nodeId", "starredAt", "sortOrder", "node": Node \| null }] }` | `[Node, …]` |

`Node` is camelCase: `id`, `name`, `nodeType`, `parentId`, `path`, `isSystem`, `systemType`, `resourceType`, `sourceId`, `childCount`, and so on.

**Requested:** read these shapes.
- **Search:** build the breadcrumb from `breadcrumbs` (root first, joined with " > "), and page with `nextPageToken`, sent back as `pageToken`.
- **Starred:** skip an item whose `node` is null. It names something the caller can no longer see.

## Problem 2: `GET /recent` does not exist

The PRD (§4.5) lists `GET {apiBase}/recent`. The Explorer API has no such endpoint, and the picker calls it even with `showRecentItems: false`.

**Requested:**
- Do not call it when `showRecentItems` is false.
- When it is true and the endpoint answers 404, hide the section instead of failing the whole load. One optional section must not stop the tree from rendering.

## Problem 3: a footer that cannot be hidden

`buildFooter()` always renders a Confirm button (and a Cancel button when `onCancel` is set). Inside a host dialog, which has its own Move/Cancel buttons, that gives two rows of buttons. Hiding `.explorerpicker-footer` from outside works, but it reaches into the component's DOM.

**Requested:** `showFooter?: boolean` (default `true`), as FormDialog gained (2026-04-08-formdialog-hide-footer-option.md). With `false`, the host reads the choice through `getSelection()` / `onSelectionChange`.

---

## Reproduction

```typescript
const host = document.createElement('div');
const picker = window.createExplorerPicker({
    container: host,
    mode: 'single',
    selectionTarget: 'container',
    excludeNodeIds: [nodeId],
    initialExpandedNodeId: parentId,
    showRecentItems: false,
    showStarredItems: false,
    height: '320px',
    onSelectionChange: s => { target = s[0]?.nodeId ?? null; },
});
window.createFormDialog({
    title: 'Move "Plan"',
    submitLabel: 'Move',
    fields: [{ name: 'destination', label: 'Move to', type: 'custom', customElement: host }],
    onSubmit: async () => { /* move to target */ },
}).show();
// Result: no tree; 404 on /recent; "e.forEach is not a function"; a second Confirm button.
```

## Acceptance

1. Against the live `/api/v1/explorer`, the picker renders the roots, expands children, searches with breadcrumbs, and pages.
2. With `showRecentItems: false`, no request goes to `/recent`; with `true` and a 404, the tree still renders.
3. With `showFooter: false`, the picker renders no footer, and `getSelection()` returns the highlighted container.
4. Errors still surface through `onError` with their context, as today.
