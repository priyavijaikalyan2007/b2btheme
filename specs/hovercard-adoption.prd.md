<!--
SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
SPDX-FileCopyrightText: 2026 Outcrop Inc
SPDX-License-Identifier: MIT
-->

# PRD — HoverCard adoption (ActionItems, DiagramEngine)

**ADR:** ADR-126 • **Date:** 2026-04-21 • **Status:** In progress

## 1. Motivation

HoverCard (ADR-125) shipped as a reusable hover-preview primitive and was
adopted by GraphCanvas. The apps team asked whether other "strong fit"
components should adopt it. The two that clearly benefit:

- **ActionItems** — rows carry rich metadata (assignee, due date, status,
  priority, tags, comments, content) that doesn't all fit in a single row.
  A hover card surfaces the full context without opening an editor.
- **DiagramEngine** — shapes/connectors carry `semantic.data`,
  `semantic.type`, labels, and tags. Hovering during `select` mode is a
  natural way to preview a shape's meaning without selecting it.

Components like Ribbon tooltips and single-line labels are **not** in
scope — they already have lighter-weight affordances (title, HelpTooltip)
that suit their density.

## 2. Non-goals

- No new hover primitives. Reuse `createHoverCard` / `attachHoverCard`.
- No interactive content inside the card (matches ADR-125 §4).
- No changes to HoverCard itself.
- No adoption in Ribbon, Timeline, TreeView, DataGrid, SpineMap — future
  work, tracked separately.

## 3. Design decisions

| # | Decision | Why |
|---|----------|-----|
| 1 | ActionItems default `"builtin"`; DiagramEngine default `"off"` | ActionItems is a read-heavy list; hover context is pure win. DiagramEngine is an editor where hover popups can disrupt drawing/dragging; host apps opt in when they want it. |
| 2 | Mode union mirrors GraphCanvas: `"builtin" \| "custom" \| "off"` | Consistent across adopters; custom renderer signature returns `HoverCardContent \| HTMLElement \| string \| null`. |
| 3 | DiagramEngine suppresses hover when `active tool !== "select"` or during drag/pan/connect interactions | Hover cards during draw/pen/brush would fight the editing flow. Select mode is the "read the diagram" mode. |
| 4 | ActionItems card's default content shows **extra** info, not the visible row | Title = full content (untruncated), subtitle = assignee, badge = status/priority, properties = {Due, Created, Updated, Comments}, tags as footer. Avoids redundancy. |
| 5 | DiagramEngine card's default content extracts from `semantic` + `presentation.textContent` | Title = label (first non-empty text run) \|\| `semantic.type`; subtitle = shape name; properties = flattened `semantic.data`; badge = first `semantic.tags` entry; description = `semantic.data.description` if string. |
| 6 | Both reuse the shared card via `(window as any).createHoverCard` lazy lookup | Matches GraphCanvas; keeps the components decoupled at IIFE boundary. |
| 7 | DiagramEngine uses **pointermove + hit-test**, not per-object listeners | Object `<g>` elements are re-created by `rerenderObject`; rebinding per-render is fragile. Central pointermove is cheap, already exists, and the guard for tool/drag state lives there. |
| 8 | ActionItems wires via `attachHoverCard` per row (shared card) | Rows are explicit DOM elements, static across re-renders within one render cycle; per-row wiring is idiomatic. |

## 4. API — ActionItems

### 4.1 New `ActionItemsOptions` fields

```typescript
itemHoverCardMode?: "builtin" | "custom" | "off";  // default "builtin"
renderItemHoverCard?: (item: ActionItem) =>
    HoverCardContent | HTMLElement | string | null;
```

### 4.2 Default extractor (`buildItemHoverContent`)

- `title` — `item.content` (full text, never truncated in the card)
- `subtitle` — `item.assignee?.name ?? "Unassigned"`
- `badge` — `{ text: STATUS_LABELS[item.status], variant }` where variant maps
  `not-started→muted`, `in-progress→primary`, `done→success`, `archived→muted`
- `properties` — `{Status, Priority?, Due?, Assignee, Created, Updated, Comments}`
  (skip empty fields; dates formatted as `YYYY-MM-DD` plus relative hint)
- `description` — omitted (title already carries full content)
- `footer` — tag labels joined by `·` if `item.tags.length > 0`

### 4.3 Wiring

Each item row, after rendering, calls `attachHoverCard(row, getContent, { shared })`
where `shared` is a single card instance cached on the ActionItems instance.
The disposer returned by `attachHoverCard` is tracked and called on `destroy()`
and on every re-render (to avoid leaking listeners).

## 5. API — DiagramEngine

### 5.1 New `DiagramEngineOptions` fields

```typescript
objectHoverCardMode?: "builtin" | "custom" | "off";  // default "off"
renderObjectHoverCard?: (obj: DiagramObject) =>
    HoverCardContent | HTMLElement | string | null;
renderConnectorHoverCard?: (conn: DiagramConnector) =>
    HoverCardContent | HTMLElement | string | null;
```

One mode option governs **both** objects and connectors. Host apps that want
a card for objects but not connectors can return `null` from the connector
renderer in `"custom"` mode.

### 5.2 Default extractor — objects (`buildObjectHoverContent`)

- `title` — first non-empty `presentation.textContent.runs[*].text` joined by space;
  fallback to `semantic.type`; fallback to shape name
- `subtitle` — `presentation.shape` (e.g. `"rounded-rect"`, `"uml-class"`)
- `badge` — `semantic.tags?.[0]` as `{ text, variant: "primary" }` if present
- `properties` — flattened `semantic.data` entries (key/value, value stringified,
  capped at 5 rows by the default HoverCard property limit)
- `description` — `semantic.data.description` if it's a string

### 5.3 Default extractor — connectors (`buildConnectorHoverContent`)

- `title` — first connector label text, else `semantic.type`, else `"Connector"`
- `subtitle` — routing style (e.g. `"orthogonal"`)
- `badge` — `semantic.tags?.[0]`
- `properties` — `{source, target}` + flattened `semantic.data`

### 5.4 Wiring

Inside `onMouseMove` (before tool dispatch), a new
`updateHoverCard(e, canvasPos)` is called. It:

1. Returns early if mode is `"off"`, active tool is not `"select"`, or a
   drag/pan/connect interaction is in progress (detected via existing
   tool-manager state — tools that implement `isInteracting(): boolean`
   are queried; a conservative default of `false` applies if absent).
2. Hit-tests for object, then connector. If nothing under the cursor, hides
   the card and clears the anchor.
3. If the hit target changed, resolves content (`custom` renderer or default
   extractor) and calls `handle.show(anchorEl, content)`.
4. The anchor element is the object's `<g data-id="...">` or the connector's
   `<g data-connector-id="...">` — these are already in the DOM after
   `renderObject` / `rerenderConnector`.

### 5.5 Tool-state guards

The engine tracks no formal "interaction" flag today. Minimal addition:

- `ToolManager` exposes `isInteracting(): boolean` which forwards to the
  active tool's optional `isInteracting()` method (default `false`).
- Tools that need suppression (select tool during drag, connect tool while
  drawing a connector, pan tool while panning) implement it.
- On mouseup, the card is hidden once (clears any stale card that was shown
  before a drag started).

## 6. Accessibility, perf, dark mode

- HoverCard already provides `role="tooltip"` + `aria-describedby`; no changes.
- Touch devices continue to be skipped (handled inside HoverCard via
  `matchMedia("(hover: hover)")`).
- `prefers-reduced-motion` handling inherited from HoverCard's CSS.
- Pointermove hit-testing in DiagramEngine runs only when mode is not
  `"off"`; hit-test is O(n) over visible objects but already used for
  tool dispatch, so no new cost when mode is off.

## 7. Testing

- ActionItems — unit tests for the default extractor, option-default
  behaviour, custom renderer returning `null` / string / element, XSS
  check (content containing `<script>` stays text), cleanup on destroy.
- DiagramEngine — unit tests for the object/connector default extractors,
  mode `"off"` suppression, tool-state suppression, custom renderer path,
  resilience when HoverCard factory is absent.
- Integration — both adopters' demo pages render the cards end-to-end in
  jsdom's best approximation (positioning math is already covered by
  HoverCard's test suite; we only verify wiring).

## 8. Open questions (resolved)

1. *Combined ADR or two?* **One** — ADR-126. Same decision (opt-in vs builtin)
   in two places; splitting adds ADR noise without signal.
2. *Should DiagramEngine expose a runtime `setHoverCardMode()`?* Not now.
   Host reconstructs the engine on config change today. Tech-debt note.
3. *Should ActionItems re-use `commentCount` as a badge?* No — status is
   the more scannable badge; comment count lives in properties.
4. *Should DiagramEngine highlight the hovered object visually?* Not in
   this change. The card itself is the affordance; adding a highlight ring
   is a separate UX decision.

## 9. Files to change (summary)

New:
- `specs/hovercard-adoption.prd.md` (this doc)
- `specs/hovercard-adoption.plan.md`
- `components/actionitems/actionitems-hovercard.test.ts`
- `components/diagramengine/diagramengine-hovercard.test.ts`

Edit:
- `components/actionitems/actionitems.ts` — options, wiring, extractor
- `components/diagramengine/src/types.ts` — option fields
- `components/diagramengine/src/engine.ts` — wiring, hit-test, guards
- `components/diagramengine/src/tool-manager.ts` — `isInteracting()`
- `components/diagramengine/src/tool-select.ts` — implement `isInteracting`
- `components/diagramengine/src/tool-connect.ts` — implement `isInteracting`
- `components/diagramengine/src/tool-pan.ts` — implement `isInteracting`
- `components/diagramengine/diagramengine.ts` — regenerated via bundle script
- `demo/components/actionitems.html` — showcase section
- `demo/components/diagramengine.html` — showcase section (if feasible)
- `agentknowledge/decisions.yaml` — ADR-126
- `agentknowledge/concepts.yaml` — adopters list on HoverCard
- `agentknowledge/history.jsonl` — append
- `CHANGELOG.md` — 2026-04-21 section
- `CONVERSATION.md` — append session
- `specs/hovercard.md` — cross-link this adoption work
