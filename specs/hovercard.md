<!--
SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
SPDX-FileCopyrightText: 2026 Outcrop Inc
SPDX-License-Identifier: MIT
-->

# HoverCard — per-component progress log

Resume-friendly session log for the HoverCard component. For the full spec see `hovercard.prd.md`; for the implementation plan see `hovercard.plan.md`.

## Status (as of 2026-04-21)

- **Shipped**: 2026-04-20 (ADR-125).
- **Tests**: 34 HoverCard + 7 GraphCanvas×HoverCard integration + 3,818 baseline = 3,859 green.
- **Build**: `npm run build` clean. Dist artifacts at `dist/components/hovercard/{hovercard.css, .js, .d.ts}`.
- **Adopted by**: GraphCanvas (mandatory — legacy `.gc-tooltip` removed),
  ActionItems (default `"builtin"`, ADR-126), DiagramEngine (opt-in
  `"off"` default, ADR-126).
- **Planned adopters**: Timeline, TreeView, SpineMap, DataGrid (not scheduled).

## Milestones

| Date | Event |
|------|-------|
| 2026-04-20 | Spec received (`specs/2026-04-20-graphcanvas-hover-card.md`). |
| 2026-04-20 | PRD + plan written; 7 open questions resolved with user. |
| 2026-04-20 | Phases 2–6 implemented (scaffold, renderer, positioning, styling, lifecycle/a11y). |
| 2026-04-20 | Phase 7 — GraphCanvas integration; `.gc-tooltip` removed. |
| 2026-04-20 | Phase 8 — stencil, Component Studio tile, demo pages, all-components section. |
| 2026-04-20 | Phase 9 — README, ADR-125, knowledge base, CHANGELOG, indexes. |
| 2026-04-20 | Bug #1 reported: card anchored to bottom-left of GraphCanvas. Root cause: mounted inside a `transform`/`filter` ancestor, which degrades `position: fixed` to "absolute relative to that ancestor". Fix: portal to `document.body` (default). |
| 2026-04-21 | Bug #2 reported: card at bottom-left of viewport. Root cause: `anchor instanceof HTMLElement` fell through for SVG `<g>` nodes (SVGElement and HTMLElement are sibling subclasses of `Element`). Fix: broaden `HoverCardAnchor` to `Element`, dispatch via `instanceof Element` in `resolveAnchorRect`, `scrollAncestors` wiring, and anchor-detach watch. Regression test added. |
| 2026-04-21 | Standards + markers pass: split 6 over-budget functions; added `⚓ createHoverCard` and `⚓ attachHoverCard` anchors. |
| 2026-04-21 | **Adoption (ADR-126)**: ActionItems (default `"builtin"`) and DiagramEngine (opt-in `"off"` default; select-tool only, suppressed during drag/pan/connect). 20 new tests (11 ActionItems + 9 DiagramEngine). Pattern established: central pointermove + hit-test for SVG-heavy components; `attachHoverCard` per row for HTML list components. |

## Key design decisions (reference)

| # | Decision | Why |
|---|----------|-----|
| 1 | Reusable primitive, not GraphCanvas-internal | Scales to Timeline, TreeView, SpineMap, DataGrid — one primitive, many adopters. |
| 2 | Native `contextmenu` DOM event drives yield | Works in apps that don't use our ContextMenu; no coupling. Custom `hovercard:yield` CustomEvent is opt-in for programmatic overlays. |
| 3 | Anchor to element bbox | Stable — no cursor jitter. Same policy regardless of anchor kind (HTMLElement or SVGElement). |
| 4 | Informational only (`role="tooltip"`, `pointer-events: none`) | Simple dismissal, predictable a11y. Interactive hover content belongs in PropertyInspector. |
| 5 | `maxHeight` (320px default) + fade mask, no scrollbar | A tooltip you can't reach with the cursor can't scroll. Hosts needing scroll use PropertyInspector. |
| 6 | 250ms open / 100ms close delays | Tightened from GraphCanvas's 400ms; dense-graph exploration felt slow. |
| 7 | Z-index 1005 | Above legacy `.gc-tooltip` tier (1000), below modals (1050+), Toolbar popups (1060), and ContextMenu (1080). |

## GraphCanvas integration (ADR-125)

```typescript
tooltipMode?: "builtin" | "custom" | "off";     // default "builtin"
renderNodeTooltip?(node: GraphNode): HoverCardContent | HTMLElement | string | null;
renderEdgeTooltip?(edge: GraphEdge): HoverCardContent | HTMLElement | string | null;

// GraphNode.description?: string  ← new optional field
// GraphEdge.description?: string  ← new optional field
```

Default extractor maps: `label → title`, `sublabel ?? type → subtitle`, `icon → icon`, `color → iconColor`, `status → badge` (via `nodeStatusVariant`), `properties + namespace → properties`, `description → description`. For edges: `label ?? type → title`, `type → subtitle`, `sourceId/targetId/provenance/confidence + properties → properties`, `description → description`.

GraphCanvas resolves the factory via `(window as any).createHoverCard` so it stays decoupled at runtime. If the HoverCard bundle isn't loaded, GraphCanvas silently skips the card.

## Tech-debt / follow-ups

- None open as of 2026-04-21.
- Consider adopting HoverCard in Timeline, TreeView, SpineMap, and DataGrid when those components next land UX work (ADR-126 covers ActionItems + DiagramEngine only).
- Consider deprecating raw `title=` attributes in DataGrid cells in favour of HoverCard (batch change, low priority).
- `demo/components/hovercard.html` rebuilds the GraphCanvas on the custom-renderer toggle (via `destroy()` + `createGraphCanvas()`); acceptable for a demo but a `setTooltipMode()` API on GraphCanvas would be cleaner. A similar runtime `setObjectHoverCardMode()` on DiagramEngine is the same shape of tech-debt.

## References

- Spec: `specs/hovercard.prd.md`
- Plan: `specs/hovercard.plan.md`
- ADR: `agentknowledge/decisions.yaml` → ADR-125
- Concepts: `agentknowledge/concepts.yaml` → HoverCard, HoverCardStyles
- Original feature request: `specs/2026-04-20-graphcanvas-hover-card.md`
- README: `components/hovercard/README.md`
