<!--
SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
SPDX-FileCopyrightText: 2026 Outcrop Inc
SPDX-License-Identifier: MIT
-->

<!-- AGENT: PRD specification for the HoverCard component. Drives GraphCanvas hover-card upgrade (ADR-125) and is reusable by any component that needs a richer-than-tooltip hover affordance. -->

# HoverCard — PRD

## 1. Overview

A lightweight, reusable floating card that surfaces dense detail information on pointer hover or keyboard focus, styled as a Bootstrap-compatible card (title, icon, badge, properties, description, footer). Replaces ad-hoc per-component tooltip implementations (`.gc-tooltip` in GraphCanvas, native `title=` attributes elsewhere) with a single, themable primitive.

HoverCard is the **informational** sibling of ContextMenu (which owns pointer-initiated command surfaces). It is *not* interactive — the card does not capture pointer events, does not host links/buttons, and does not participate in the tab order of its anchor.

**MASTER_COMPONENT_LIST** — new entry §18.9 (Overlays) | **ADR-125**

Trigger spec: `specs/2026-04-20-graphcanvas-hover-card.md` (Ontology Visualizer team, 2026-04-20).

## 2. Use Cases

- **GraphCanvas** — hover over a node or edge to see label, type key, status badge, up to 5 properties, description.
- **Timeline / ActivityFeed** — hover over a compact event marker to see full timestamp, actor, payload preview.
- **TreeView / DataGrid** — hover over a truncated cell to show the full record metadata, not just the clipped string.
- **SpineMap** — hover over a node to show sprint summary, without committing to a click.
- **PropertyInspector** — hover over a property key to show its origin/provenance in a compact card (deferred; parity with the hover experience the host app already ships).

## 3. References

- draw.io node hover cards (icon + title + metadata block).
- Mermaid Live Editor hover tooltips.
- Linear issue hover previews.
- Existing `components/propertyinspector/` card styling — HoverCard's default layout borrows the same header/body/footer rhythm so the two surfaces feel like parts of one system.
- Existing `components/contextmenu/` viewport-clamping math — HoverCard reuses the same `getBoundingClientRect()` + flip algorithm.

## 4. Functional Requirements

### 4.1 Anchor & Positioning

- Anchor is an `HTMLElement` or `{ x, y, width, height }` DOMRect-like object supplied at `show()` time. Caller owns the anchor resolution — graph components pass the SVG node's bounding rect, not the cursor position.
- `placement` option: `"auto"` (default) | `"top"` | `"bottom"` | `"left"` | `"right"`. Auto prefers bottom, falls back to top, then right/left, based on remaining viewport space.
- `offset` option (default `8`): pixels between anchor edge and card edge.
- Viewport-edge clamping: the card must never render outside the visible viewport; its inline style is adjusted to fit.
- `align` option: `"start"` | `"center"` (default) | `"end"` — controls cross-axis alignment relative to the anchor.

### 4.2 Content Contract

HoverCard accepts a declarative `HoverCardContent` object (the preferred path) **or** a raw `HTMLElement` / `string` escape hatch.

```typescript
interface HoverCardContent
{
    title?: string;                       // header line, truncated with ellipsis
    subtitle?: string;                    // dimmer secondary line (e.g. type key)
    icon?: string;                        // Bootstrap Icons class (bi-*)
    iconColor?: string;                   // CSS color for the colored dot/icon
    badge?: { text: string; variant?: "success" | "warning" | "danger" | "info" | "secondary" };
    properties?: Array<{ key: string; value: string }>;  // first 5 rendered, overflow summarized as "+N more"
    description?: string;                 // multi-line paragraph, clamped at 3 lines
    footer?: string | HTMLElement;        // optional footer row (e.g. "Last updated 2h ago")
}

type HoverCardInput = HoverCardContent | HTMLElement | string;
```

Rules:
- If `content` is an `HTMLElement` or `string`, it replaces the entire body — title/badge/etc. are ignored.
- If `HoverCardContent.title` is absent, the header row is omitted entirely (not rendered empty).
- `properties` is truncated to 5 rows; a 6th row reads `+N more` (muted). Long values are ellipsized at 160 characters, not wrapped.
- `description` is plain text only — rendered via `textContent`, never `innerHTML` (XSS hygiene, per `SECURITY_GUIDELINES.md`).

### 4.3 Trigger Modes

HoverCard is a **controlled** component. Callers drive `show()` / `hide()` themselves. The component does **not** bind pointer listeners to arbitrary anchors — consumers (like GraphCanvas) already own hit-testing and must map pointer/focus events to the right anchor + content.

For the common case, a thin `attachHoverCard(anchorEl, getContent)` helper is exported to wire up `mouseenter` / `mouseleave` / `focusin` / `focusout` with the proper debounced timers. This is pure convenience — the underlying HoverCard is unchanged.

### 4.4 Timing

- `openDelay` (default `250ms`): time between hover-in and card appearing.
- `closeDelay` (default `100ms`): time between hover-out and card disappearing. Short enough that moving between two adjacent anchors feels instant, long enough that minor cursor jitter doesn't flicker.
- If a new `show(anchor, content)` fires while the card is already open for a different anchor, the card **updates in place** (no close/reopen flash) and resets position.

### 4.5 Dismissal

The card hides on:

- `hide()` called explicitly.
- `Escape` keypress while the anchor has focus or the card is showing.
- `scroll` event on any scroll ancestor of the anchor.
- `resize` event on window.
- **Native `contextmenu` DOM event on `document`** (capture phase) — covers native browser right-click menus, right-click-triggered opens of our ContextMenu, and the keyboard context key. Apps that don't use our ContextMenu component still get correct yield behavior, because the browser's own event fires regardless.
- **Custom `hovercard:yield` event on `document`** — an opt-in broadcast channel for programmatic overlays that do *not* flow through the native `contextmenu` event (long-press menus, button-triggered menus, future Popover or menu primitives). HoverCard listens; any overlay can dispatch. No direct import between components. Our ContextMenu dispatches this event *only* on its non-right-click code paths (right-click is already covered by the native event).
- The anchor element being removed from the DOM (observed via the anchor's ownerDocument connected check during the next `requestAnimationFrame`).

### 4.6 Accessibility

- Root element: `role="tooltip"`, `aria-live="polite"`.
- On `show()`, the helper `attachHoverCard` sets `aria-describedby` on the anchor pointing at the card's generated id. On `hide()`, that attribute is removed.
- Keyboard focus on the anchor surfaces the card with the same delay + content as pointer hover.
- `prefers-reduced-motion: reduce` disables the fade-in transition (instant show/hide).
- Card itself is not focusable — `tabindex` is never set, and `pointer-events: none` keeps it out of the interaction layer.

### 4.7 Touch Behavior

- Pointer-hover is not emulated on touch. On a primary-pointer-coarse device (`matchMedia('(hover: none)')`), HoverCard does not open via `attachHoverCard`.
- Long-press is **not** hijacked for HoverCard — it belongs to ContextMenu per the existing `attachLongPress` helper in `components/contextmenu/`.
- Touch users get the richer alternative the host ships (PropertyInspector drawer, modal, etc.). Hosts must decide — HoverCard does not paper over it.

### 4.8 Styling & Theming

- Default width: `280px`. Min width: `200px`. Max width: `360px`.
- **Height**: content-driven up to a hard `maxHeight` ceiling (default `320px`, configurable via `HoverCardOptions.maxHeight`). Overflow is clipped (`overflow: hidden`) with a CSS `::after` fade mask (24px linear-gradient from transparent to `var(--theme-surface-raised-bg)`) when content exceeds the cap; the mask is toggleable via `overflowHint: "fade" | "none"`. **No scrollbar** — HoverCard is `pointer-events: none` and `role="tooltip"`; content that needs scrolling or interaction belongs in PropertyInspector or a future Popover primitive, not here. Declarative `HoverCardContent` already degrades predictably via `maxProperties` and the 3-line description clamp, so the ceiling primarily guards the escape-hatch (HTMLElement/string) path.
- Default padding: `$sp-8 $sp-10` (matches PropertyInspector header rhythm).
- Border: `1px solid var(--theme-border-subtle)`. Background: `var(--theme-surface-raised-bg)`. Shadow: `0 4px 12px rgba(0,0,0,0.08)` (light), `0 4px 12px rgba(0,0,0,0.4)` (dark).
- Border-radius follows project convention (0-2px; use `$border-radius`).
- All colors via `var(--theme-*)` tokens per `DARKMODE.md`. No hardcoded colors in SCSS.
- Typography: title `$font-size-sm` `$font-weight-medium`; subtitle `$font-size-xs` `var(--theme-text-muted)`; properties key `$font-size-2xs` muted, value `$font-size-xs`; description `$font-size-xs` `$line-height-relaxed`.
- Z-index: **1005** — above the removed GraphCanvas inline tooltip tier (1000), below modals (1050+), floating Toolbar popups (1060), and the ContextMenu component (1080) so higher surfaces paint on top if they ever overlap momentarily during a yield handoff. Documented in ADR-125.

### 4.9 Public API

```typescript
interface HoverCardOptions
{
    container?: HTMLElement;     // defaults to document.body
    placement?: "auto" | "top" | "bottom" | "left" | "right";
    align?: "start" | "center" | "end";
    offset?: number;
    openDelay?: number;          // ms, default 250
    closeDelay?: number;         // ms, default 100
    maxProperties?: number;      // default 5
    maxHeight?: number | string; // default 320 (px); accepts "20rem", "50vh"
    overflowHint?: "fade" | "none"; // default "fade"
    className?: string;          // extra class on root
    onShow?: (anchor: HoverCardAnchor) => void;
    onHide?: () => void;
}

type HoverCardAnchor = HTMLElement | DOMRect | { x: number; y: number; width: number; height: number };

interface HoverCardHandle
{
    show(anchor: HoverCardAnchor, content: HoverCardInput): void;
    hide(): void;
    update(content: HoverCardInput): void;   // re-render without moving
    reposition(): void;                      // recompute position against current anchor
    isOpen(): boolean;
    getElement(): HTMLElement;               // escape hatch for tests
    destroy(): void;
}

export function createHoverCard(options?: HoverCardOptions): HoverCardHandle;

export function attachHoverCard(
    anchor: HTMLElement,
    getContent: () => HoverCardInput | null,
    options?: HoverCardOptions & { shared?: HoverCardHandle }
): () => void;                               // returns detach()
```

`attachHoverCard`'s `shared` option allows consumers (like GraphCanvas) to instantiate one HoverCard and wire many anchors to it — critical for graphs with hundreds of nodes (one DOM node for the card, not hundreds).

### 4.10 Logging & Metrics

- `LOG_PREFIX = "[HoverCard]"` on all `console.debug` calls.
- Lifecycle logs: `show(anchorId, contentKind)`, `hide(reason)`, `destroy()`.
- No analytics beacons from HoverCard itself — analytics of *what* was hovered belong to the host component (e.g., GraphCanvas emits `onNodeHover`, and the host decides whether to track).

### 4.11 Performance

- Single DOM node per HoverCard instance — the card element is created lazily on first `show()` and reused across anchors. Hosts are expected to pass `shared` into `attachHoverCard` rather than creating a card per anchor.
- No reflow on mousemove — position is computed once per `show()` and once per `reposition()`.
- Open/close debouncing via `setTimeout`; no `requestAnimationFrame` loops.
- Passive scroll/resize listeners; removed when card is hidden and destroyed.

## 5. GraphCanvas Integration (Separate but Tracked Here)

Motivated by `specs/2026-04-20-graphcanvas-hover-card.md`. GraphCanvas changes are tracked in `specs/hovercard.plan.md` Phase 7, and are the reason this component exists.

### 5.1 New GraphCanvasOptions Fields

```typescript
interface GraphCanvasOptions
{
    // ... existing fields ...

    tooltipMode?: "builtin" | "custom" | "off";   // default "builtin"

    renderNodeTooltip?: (node: GraphNode) =>
        HoverCardContent | HTMLElement | string | null;

    renderEdgeTooltip?: (edge: GraphEdge) =>
        HoverCardContent | HTMLElement | string | null;
}
```

- `"builtin"` — GraphCanvas renders the default card (title from `label`, icon from `icon`, iconColor from `color`, subtitle from `type`, badge from `status`, properties from `properties`, description from new `GraphNode.description`).
- `"custom"` — GraphCanvas calls `renderNodeTooltip` / `renderEdgeTooltip`. If the callback returns `null`, no card is shown for that element. If it returns a `HoverCardContent`, the default card renderer is used with host-provided fields. If it returns an `HTMLElement` or `string`, it replaces the body entirely.
- `"off"` — no tooltip. Host listens to `onNodeHover` / `onEdgeHover` to drive its own surface.

### 5.2 New GraphNode Fields

```typescript
interface GraphNode
{
    // ... existing fields ...
    description?: string;    // multi-line, rendered in hover card body
}
```

Non-breaking addition. Existing consumers of GraphCanvas need no code changes to get the upgraded look — just the CSS + default-content extraction on node fields already present (`label`, `color`, `icon`, `type`, `status`, `properties`).

### 5.3 Migration

- The private `.gc-tooltip` element and its positioning code are removed.
- `TOOLTIP_DELAY = 400` constant is removed; HoverCard's 250ms default applies.
- GraphCanvas instantiates **one** `HoverCardHandle` in its constructor and reuses it for all nodes and edges.
- `onNodeHover(null)` still fires on hover-out (no behavioral change for hosts using that callback).

### 5.4 Out of Scope for This PRD

- Strukture graph / Cytoscape integration. That app lives outside this repo. The Strukture team can adopt `createHoverCard` from the CDN bundle once shipped; that is their follow-up, not ours.

## 6. Non-Goals

- Interactive content inside the card (links, buttons, form fields). If a host needs interactivity on hover, use ContextMenu or PropertyInspector instead.
- Scrollable card bodies. The `maxHeight` ceiling clips overflow; hosts that need scrollable hover content must use a different primitive.
- Auto-wiring of arbitrary DOM via `data-*` attributes. HoverCard is programmatic; declarative auto-binding is a future enhancement if demand appears.
- Replacing Bootstrap's own text-only `title=` tooltip. That behavior is fine where it already works; HoverCard is for card-shaped content.
- A Tooltip primitive. Deferred until a concrete second consumer beyond "it would be nice" appears. (See §7 Q4.)

## 7. Open Questions Resolved

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| Q1 | Reusable component or GraphCanvas-internal upgrade? | **Reusable** (`components/hovercard/`) | Scales to Timeline, TreeView, SpineMap, DataGrid. One primitive, many consumers. |
| Q2 | Touch behavior — long-press? | **No** — ContextMenu owns long-press; touch users get the host's alternative surface. | Avoids fighting ContextMenu for the same gesture. |
| Q3 | Anchor to node bbox or cursor? | **Node bbox** | Stable, doesn't jitter on cursor motion. |
| Q4 | Interactive content? | **Informational only** (`role="tooltip"`, `pointer-events: none`) | Keeps dismissal logic simple; matches spec's "primary way users get information without committing to clicking". |
| Q5 | Default delays? | **250ms open / 100ms close** | Tightened from GraphCanvas's 400ms; dense-graph exploration felt slow. |
| Q6 | Stencil + Component Studio entry? | **Yes, both** | AGENTS.md mandates it for every new component. |
| Q7 | Priority vs DiagramEngine Phase 7? | **HoverCard first; DiagramEngine Phase 7 resumes after.** | Trigger spec is Medium-priority but requested by an external team; deferring Phase 7 is low cost. |

## 8. Status

| Phase | Status |
|-------|--------|
| PRD | Complete |
| Plan | Complete |
| TypeScript | Complete |
| SCSS | Complete |
| Tests | Complete (34 HoverCard + 7 GraphCanvas×HoverCard, full suite 3859 green) |
| README | Complete |
| GraphCanvas integration | Complete |
| Stencil | Complete |
| Component Studio entry | Complete |
| Demo | Complete (standalone + all-components + Component Studio tile) |
| Build | Complete (tsc + sass both green) |
| ADR-125 recorded | Complete |

Detailed per-phase progress: `specs/hovercard.plan.md`.
