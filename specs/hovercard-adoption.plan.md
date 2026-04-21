<!--
SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
SPDX-FileCopyrightText: 2026 Outcrop Inc
SPDX-License-Identifier: MIT
-->

# Plan — HoverCard adoption (ActionItems, DiagramEngine)

Companion to `specs/hovercard-adoption.prd.md` (ADR-126).

## Phase order

ActionItems first (simpler — HTML rows, existing `attachHoverCard`), then
DiagramEngine (SVG pointermove hit-test + tool-state guards).

## Phase 1 — Specs ✅

- PRD + this plan authored.

## Phase 2 — ActionItems (TDD)

1. Red: add `components/actionitems/actionitems-hovercard.test.ts` covering:
   - Default mode is `"builtin"` and a hover card handle is acquired lazily.
   - Default extractor produces expected `title`, `subtitle`, `badge`,
     `properties`, `footer` for a representative item.
   - `itemHoverCardMode: "off"` wires no listeners (no shared card created).
   - `itemHoverCardMode: "custom"` calls `renderItemHoverCard` and uses its
     return value verbatim (incl. `null` short-circuit).
   - XSS smoke: content of `"<script>alert(1)</script>"` appears as text.
   - `destroy()` disposes the shared card + per-row `attachHoverCard`
     disposers (no lingering listeners).
2. Green: implement in `components/actionitems/actionitems.ts`:
   - Extend `ActionItemsOptions` with new fields.
   - Cache a shared card handle on the instance: `private hoverCard: any`.
   - Add `ensureHoverCard()` (copy shape from GraphCanvas).
   - Inside `renderFullItem`, after the row DOM is assembled, call
     `attachHoverCard(row, () => this.resolveItemHoverContent(item), { shared: card })`
     and track the disposer.
   - Track disposers in a per-render Set; flush on re-render and on destroy.
   - Implement `resolveItemHoverContent`, `buildItemHoverContent`,
     helpers for status-to-badge-variant + date formatting.
3. Refactor: split any helpers > 30 lines. Add `⚓` anchors for the new
   methods.

## Phase 3 — DiagramEngine (TDD)

1. Red: add `components/diagramengine/diagramengine-hovercard.test.ts`:
   - Default mode is `"off"` — pointermove does not call `createHoverCard`.
   - Mode `"builtin"` + hit on object → `show(anchor, content)` called
     with expected anchor (the object's `<g data-id>`) and default content.
   - Default connector extractor on `"builtin"` mode.
   - Suppression when active tool is `"draw"`.
   - Suppression when tool manager reports `isInteracting() === true`.
   - Custom renderer returning `null` → card not shown.
   - Resilience when `window.createHoverCard` is absent — no throws.
2. Green: implement:
   - Add option fields to `DiagramEngineOptions` in `src/types.ts`.
   - In `src/tool-manager.ts`, add `isInteracting(): boolean` that queries
     the active tool's optional method.
   - In select/connect/pan tools, implement `isInteracting()` returning the
     relevant local "drag/pan/connect in progress" flag.
   - In `src/engine.ts`:
     - Private `hoverCard: any = null`, `currentHoverAnchorId: string | null`.
     - `ensureHoverCard()` copy of the GraphCanvas shape.
     - `updateHoverCard(e, canvasPos)` called from `onMouseMove` **after**
       the guard checks. Guards: mode !== "off", tool === "select", tool
       manager not interacting.
     - Hit-test: object first, then connector (mirrors hit order already
       used for context menu and selection).
     - Anchor resolution: `this.renderer.getSvgElement().querySelector(
       \`[data-id="${id}"]\`)` for objects;
       `querySelector(\`[data-connector-id="${id}"]\`)` for connectors.
     - Hide the card on `onMouseUp` and on mode-check fail.
     - `destroy()` disposes the handle.
   - Regenerate `components/diagramengine/diagramengine.ts` via
     `scripts/bundle-diagramengine.sh`.
3. Refactor: extract builders, keep all functions ≤30 lines. Add `⚓` anchors.

## Phase 4 — Demos

- Touch `demo/components/actionitems.html` — add a note + sample items with
  rich metadata so hovering is satisfying.
- Touch `demo/components/diagramengine.html` — add a toggle to enable
  `objectHoverCardMode: "builtin"`, demo with a few annotated shapes.
- `demo/all-components.html` — no new section; ActionItems and DiagramEngine
  sections already exist and will pick up the new behaviour naturally.

## Phase 5 — Knowledge base + status

- `agentknowledge/decisions.yaml` — ADR-126 with context, files.
- `agentknowledge/concepts.yaml` — HoverCard concept: add ActionItems +
  DiagramEngine to adopters list.
- `agentknowledge/history.jsonl` — append entry.
- `specs/hovercard.md` — progress log: add adoption milestone + tech-debt
  carry-overs resolved.

## Phase 6 — Finalize

- `CHANGELOG.md` — 2026-04-21 section (Added).
- `CONVERSATION.md` — append session.
- Full test run: `npm test`.
- Full build: `npm run build`.
- Standards pass — any new/edited function > 30 lines gets split.
- Commit + push.
