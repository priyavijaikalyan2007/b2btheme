<!--
SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
SPDX-FileCopyrightText: 2026 Outcrop Inc
SPDX-License-Identifier: MIT
-->

# HoverCard — Implementation Plan

Tracks per-phase progress. Each phase is self-contained, follows the V-V-P-T-I-R-V-C loop from AGENTS.md (Test-First, minimum-viable Green, then Refactor), and results in a buildable, testable increment. Do not advance to the next phase until the current phase's tests pass and the build is green.

PRD: `specs/hovercard.prd.md` · Trigger: `specs/2026-04-20-graphcanvas-hover-card.md` · ADR to record on completion: **ADR-125**.

---

## Phase 1 — PRD + Plan

Status: **COMPLETE**

Artifacts:
- `specs/hovercard.prd.md`
- `specs/hovercard.plan.md` (this file)
- Open questions resolved with the user (see PRD §7).

Exit criteria: both files checked in, user signs off on scope.

---

## Phase 2 — Scaffold + Public API Surface (Red)

Status: **COMPLETE**

Goal: create the component skeleton, declare the public API, write failing tests that pin the contract. No real behavior yet.

### Files

| File | Action |
|------|--------|
| `components/hovercard/hovercard.ts` | Create |
| `components/hovercard/hovercard.scss` | Create (empty shell + imports) |
| `components/hovercard/hovercard.test.ts` | Create |
| `components/hovercard/README.md` | Create (stub with API table) |

### Tasks

1. **Factory scaffold** — `createHoverCard(options?)` returning a `HoverCardHandle` with stub methods that throw `Error("not implemented")`. `LOG_PREFIX = "[HoverCard]"`. Export all public types.
2. **Type declarations** — `HoverCardOptions`, `HoverCardContent`, `HoverCardAnchor`, `HoverCardInput`, `HoverCardHandle`. Every public type/function has `export` (memory: TypeScript Module Pattern).
3. **attachHoverCard stub** — signature only; body returns a no-op detach function.
4. **Failing tests** (test-first, Red):
   - Factory returns a handle with all documented methods.
   - `isOpen()` returns `false` before first `show()`.
   - `getElement()` returns an `HTMLElement` with `role="tooltip"`.
   - `destroy()` removes the card from the DOM and subsequent calls to `show()` throw a guarded error.
   - `show()` with `HoverCardContent` produces a DOM tree with the right classes (`.hovercard`, `.hovercard-header`, etc.) — just the shape, not positioning yet.
   - Content escape hatch: `show(anchor, "plain text")` renders the string via `textContent`, never `innerHTML`.
5. **SCSS shell** — class definitions only (`.hovercard`, `.hovercard-header`, `.hovercard-title`, `.hovercard-subtitle`, `.hovercard-icon`, `.hovercard-badge`, `.hovercard-properties`, `.hovercard-property`, `.hovercard-property-key`, `.hovercard-property-value`, `.hovercard-description`, `.hovercard-footer`), no real values yet — just marker comments. Dark-mode variables stubbed.

### Exit Criteria

- `npm run build` green.
- Tests compile, red.
- No TypeScript errors; file passes `tsc --noEmit`.

---

## Phase 3 — Default Card Renderer (Green)

Status: **COMPLETE**

Goal: render the default card body from a `HoverCardContent` object. Make Phase 2 tests pass where they assert DOM shape.

### Tasks

1. **renderCardContent(content: HoverCardContent): HTMLElement** — builds the DOM tree using `createElement` / `setAttr` helpers. `textContent` only, never `innerHTML`.
2. **Header row** — icon (colored dot or `bi-*` class), title (ellipsized), close-area. Header omitted entirely when no title.
3. **Subtitle** — rendered below title if present.
4. **Badge** — maps `variant` to `bg-success|bg-warning|bg-danger|bg-info|bg-secondary` Bootstrap classes.
5. **Properties block** — first `maxProperties` (default 5) entries rendered as key/value rows. Overflow summarized as `+N more`. Long values ellipsized at 160 chars via `String.prototype.slice` + `"..."`.
6. **Description paragraph** — 3-line CSS clamp (`-webkit-line-clamp: 3`).
7. **Footer** — string or HTMLElement; HTMLElement is appended as-is (trust boundary: caller owns it).
8. **Escape hatch** — if `content` is `HTMLElement` it replaces the body; if `string`, wrapped in a `.hovercard-body-plain` div via `textContent`.
9. **`update(content)`** — re-renders body without moving the card. Replaces children on the existing root so `aria-describedby` relationships survive.
10. **Tests** (Red → Green):
    - Each `HoverCardContent` field produces or omits the correct DOM.
    - `maxProperties = 3` renders 3 rows + `+2 more` for 5 input rows.
    - Long value truncation cuts at 160 chars.
    - String content is placed via `textContent` (assert via `innerHTML` check for `<script>` string — must remain literal).
    - `update()` does not recreate the root element (assert same `HTMLElement` reference).

### Exit Criteria

- All content-rendering tests green.
- Manual DOM inspection in a throwaway HTML page looks right at light + dark modes (eyeball check; real SCSS comes in Phase 5).

---

## Phase 4 — Positioning Engine

Status: **COMPLETE**

Goal: place the card correctly for any anchor, clamp to viewport, handle all four placements.

### Tasks

1. **resolveAnchorRect(anchor: HoverCardAnchor): DOMRect** — normalizes `HTMLElement` via `getBoundingClientRect()` or passes through a `DOMRect`-like.
2. **computePosition(anchorRect, cardSize, placement, align, offset): { x, y, actualPlacement }** — pure function returning viewport-space coordinates. No DOM reads.
3. **Placement fallback chain** — auto tries bottom → top → right → left; each candidate is accepted only if the card fits in the viewport with `offset` margin.
4. **Cross-axis alignment** — `start` / `center` / `end` relative to the anchor's cross-axis.
5. **Viewport clamp** — final `x`/`y` is clamped into `[8, viewport - cardSize - 8]`, matching ContextMenu's edge-safe margin.
6. **applyPosition(cardEl, { x, y })** — sets `left` / `top` inline styles, position `fixed`.
7. **reposition()** — re-runs measure + compute + apply against the current anchor. Public method.
8. **Tests** — pure `computePosition` tests cover all 4 placements × 3 alignments × corner cases (anchor at top of viewport forces bottom, anchor at bottom forces top). No DOM needed for these.
9. **Integration test** — real `HTMLElement` anchor in a jsdom-ish environment; assert final `left`/`top` are within viewport and relate to anchor rect as expected.

### Exit Criteria

- 100% of position-math branches covered.
- No card can be positioned outside the viewport regardless of anchor or content size.

---

## Phase 5 — Styling, Theming, Motion

Status: **COMPLETE**

Goal: make it look like a first-class citizen of this library in light and dark modes.

### Tasks

1. **SCSS** per PRD §4.8 — width/padding/border/shadow/typography. Reuse `$sp-*` tokens, `$font-size-*`, `$font-weight-medium`, `$line-height-relaxed`. No hardcoded colors.
2. **Dark mode** — all surface/border/text via `var(--theme-*)` tokens. Update `src/scss/_dark-mode.scss` only if a *new* token is needed (avoid duplicating existing ones).
3. **Motion** — fade-in 120ms ease-out on show; no motion on hide. `@media (prefers-reduced-motion: reduce)` → 0ms.
4. **Z-index** — `1015`. Document next to ContextMenu/Toolbar popup notes in the SCSS header comment.
5. **Truncation CSS** — title ellipsis, description 3-line clamp, property-value ellipsis at the row level.
6. **Visual parity check** — open two HTML pages side by side: PropertyInspector header + HoverCard header. Typography rhythm must match.

### Exit Criteria

- Dark mode toggle in demo page flips HoverCard cleanly (no flash of unstyled content, no hardcoded colors).
- Reduced-motion honored.
- No SCSS compilation warnings.

---

## Phase 6 — Lifecycle, Dismissal, Timers, A11y

Status: **COMPLETE**

Goal: the hard part — debounced open/close, ESC, scroll, resize, ContextMenu-wins, focus parity, `aria-describedby`.

### Tasks

1. **show(anchor, content)** — schedules open after `openDelay`. If already open for a different anchor, cancels any pending close and runs `update()` + `reposition()` immediately (no flash).
2. **hide()** — schedules close after `closeDelay`. External/ESC/scroll triggers bypass the delay.
3. **Timer bookkeeping** — one `openTimer` + one `closeTimer`. Both cleared on `destroy()`.
4. **Dismissal listeners** (installed on show, removed on hide):
   - `keydown` on document for `Escape`.
   - `scroll` on all scroll ancestors of the anchor (walk up `overflow: auto|scroll` parents). Passive listeners.
   - `resize` on window. Passive.
   - **Native `contextmenu` on document, capture phase** — fires for browser right-click menus, right-click-triggered opens of our ContextMenu, and the keyboard context key. Works in apps that don't use our ContextMenu component. Listener hides the card immediately; it does not call `preventDefault()` so the menu still opens.
   - **Custom `hovercard:yield` on document** — opt-in channel for programmatic overlays that don't flow through the native `contextmenu` event (long-press menus, button-triggered menus). HoverCard listens; any overlay can dispatch.
5. **ContextMenu yield wiring (optional polish, not required)** — our ContextMenu's right-click path is already covered by the native event listener above. For its non-right-click opens (long-press, programmatic), add a one-line emit in `components/contextmenu/contextmenu.ts`'s show path: `document.dispatchEvent(new CustomEvent("hovercard:yield"))`. Gate with a test. This patch is skippable — if not applied, HoverCard simply remains visible during a programmatic ContextMenu open; not a regression since that case doesn't exist in the wild today.
6. **Anchor removal detection** — on `requestAnimationFrame` while shown, if the anchor element is no longer `document.contains(anchor)`, hide.
7. **attachHoverCard(anchor, getContent, { shared })** — wires `mouseenter` / `mouseleave` / `focusin` / `focusout`. Uses `shared` handle if provided; otherwise creates one. Returns a detach function that removes listeners and, if it owned the handle, destroys it.
8. **Touch guard** — `attachHoverCard` no-ops on `matchMedia('(hover: none)').matches`.
9. **aria-describedby** — card has a generated `id` (`hovercard-<nanoid>`). `attachHoverCard` sets `aria-describedby` on the anchor on open, removes on close.
10. **Tests**:
    - Timer assertions using `jest.useFakeTimers()` (or the project's fake-timer helper).
    - ESC while shown → hidden.
    - Scroll on ancestor → hidden.
    - Native `contextmenu` event on document → hidden (default not prevented).
    - Synthetic `hovercard:yield` event → hidden.
    - Anchor removal → hidden on next rAF.
    - Focus-in surfaces the card with identical content to pointer hover.
    - `(hover: none)` media query → `attachHoverCard` does not open on mouseenter.
    - `aria-describedby` set on show, removed on hide.

### Exit Criteria

- All lifecycle tests green.
- No listener leaks (tracked via a destroy-then-dispatch test).

---

## Phase 7 — GraphCanvas Integration

Status: **COMPLETE**

Goal: replace `.gc-tooltip` with HoverCard. Add `tooltipMode`, `renderNodeTooltip`, `renderEdgeTooltip`, `GraphNode.description`.

### Files

| File | Action |
|------|--------|
| `components/graphcanvas/graphcanvas.ts` | Modify |
| `components/graphcanvas/graphcanvas.scss` | Modify (remove `.gc-tooltip` block) |
| `components/graphcanvas/graphcanvas.test.ts` | Modify (update tooltip tests) |
| `components/graphcanvas/README.md` | Modify (document new options) |

### Tasks

1. **Extend GraphCanvasOptions** — add `tooltipMode`, `renderNodeTooltip`, `renderEdgeTooltip` (non-breaking; all optional).
2. **Extend GraphNode** — add `description?: string`.
3. **Instantiate HoverCard** — one `HoverCardHandle` per GraphCanvas instance, created in the constructor with `placement: "auto"`, `openDelay: 250`, `closeDelay: 100`, container = the canvas root.
4. **Default content extractor** — `defaultNodeContent(node: GraphNode): HoverCardContent` maps fields as documented in PRD §5.1. Same for `defaultEdgeContent(edge)`.
5. **Tooltip mode switch**:
   - `"builtin"` (default): use the default extractors.
   - `"custom"`: call `renderNodeTooltip(node)`. `null` → no card. `HoverCardContent` → default renderer. `HTMLElement`/`string` → body override.
   - `"off"`: never call `show()`. `onNodeHover` / `onEdgeHover` still fire so hosts can drive their own surface.
6. **Remove `.gc-tooltip`** — delete the private DOM element, its creation code, `TOOLTIP_DELAY`, the `tooltipTimer` state, and the positioning math. Replace with `hoverCard.show(...)` / `hoverCard.hide()`.
7. **Anchor resolution** — pass the hovered node's SVG group `getBoundingClientRect()` as the anchor, not the cursor position.
8. **onNodeHover(null) preservation** — continue firing on hover-out for backward compatibility.
9. **destroy()** — call `hoverCard.destroy()` from GraphCanvas's destroy.
10. **Tests**:
    - `tooltipMode: "off"` never opens the card but still fires `onNodeHover`.
    - `tooltipMode: "custom"` with a callback returning `null` suppresses the card.
    - `tooltipMode: "custom"` returning `HoverCardContent` renders the default layout with host fields.
    - Default builtin mode extracts label/icon/color/type/status/properties/description correctly.
    - Switching `tooltipMode` at runtime (if we support it — TBD; if not, lock to construction time) behaves predictably.

### Exit Criteria

- `.gc-tooltip` fully removed; CSS grep returns zero matches.
- All existing GraphCanvas tests pass.
- New tooltip tests green.
- Demo page's graph section renders the new cards visibly improved over baseline.

---

## Phase 8 — Stencil + Component Studio Entry

Status: **COMPLETE**

Goal: satisfy the AGENTS.md contract that every component has a stencil and a Component Studio entry.

### Tasks

1. **Stencil** — register a HoverCard stencil in `stencils-ui-components.ts`. Because HoverCard is a floating primitive with no meaningful static design surface, the stencil renders a **static preview** of the default card (title + icon + badge + 3 property rows + description) anchored to an imaginary target, with the anchor shown as a dashed rectangle. Tier B complexity per `specs/layout-studio-stencils.prd.md`.
2. **Component Studio entry** — add a "HoverCard" tile to the Component Studio app (`demo/studio/` — exact path found during this phase). Live demo: a small canvas with three hover targets (node/edge/generic) wired via `attachHoverCard` to `createHoverCard`. Controls: placement dropdown, delay sliders, toggle for dark mode.
3. **Demo page** — `demo/hovercard.html` (or extend the existing components demo index) showing:
   - Basic hover card
   - With icon + badge
   - With properties
   - With description
   - Keyboard-focus activation
   - Dark-mode toggle
   - GraphCanvas integration preview

### Exit Criteria

- Stencil renders in Layout Studio at default size.
- Component Studio tile interactive; keyboard focus works.
- Demo page linked from `demo/index.html`.

---

## Phase 9 — Documentation, ADR, Knowledge Base Update

Status: **COMPLETE**

Goal: close the loop per AGENTS.md's "Session End — Update" contract.

### Tasks

1. **README** — `components/hovercard/README.md` completed with: overview, quickstart, full API table, theming notes, accessibility notes, a11y checklist, examples, GraphCanvas integration example.
2. **COMPONENT_INDEX.md** — add HoverCard entry (path, category: Overlays).
3. **MASTER_COMPONENT_LIST.md** — add §18.9 entry with description and "built" marker.
4. **agentknowledge/concepts.yaml** — new HoverCard concept with anchor_file, related (ContextMenu, PropertyInspector, GraphCanvas).
5. **agentknowledge/decisions.yaml** — new ADR-125: "HoverCard as reusable hover surface; GraphCanvas adopts it; z-index 1015; informational-only; touch yields to ContextMenu." Include context, decision, consequences, files.
6. **agentknowledge/history.jsonl** — append task log entries for each phase.
7. **CHANGELOG.md** — `Added: HoverCard component and GraphCanvas hover-card integration (spec 2026-04-20-graphcanvas-hover-card).`
8. **Component memory in CLAUDE.md** — add HoverCard to the built-components count (111) and the recent-additions list.

### Exit Criteria

- `./build.sh` green.
- `./test.sh` green.
- Knowledge base reflects the new component.
- One clean commit per phase (or per reviewer preference) with conventional messages (`feat(hovercard): ...`, `feat(graphcanvas): adopt HoverCard`, `docs(hovercard): ADR-125 + knowledge base`).

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| ContextMenu yield event adds cross-component coupling. | Primary yield trigger is the browser-native `contextmenu` DOM event — zero coupling, works even in apps that don't use our ContextMenu. The custom `hovercard:yield` event is a decoupled opt-in channel (CustomEvent on `document`, no direct imports) for programmatic overlays. Documented in ADR-125. |
| Listener leaks if hosts forget to call `destroy()`. | Log a `[HoverCard] destroy() not called` warning on page unload when a handle still has live listeners (dev mode only). |
| Position math drift across browsers. | Pure-function `computePosition` with exhaustive unit tests; no browser-specific APIs beyond `getBoundingClientRect`. |
| GraphCanvas tooltip regression for existing hosts. | `tooltipMode` defaults to `"builtin"` and the default content extractor maps 1:1 to fields GraphCanvas already exposed; existing hosts see a visual upgrade, no API break. |
| Performance on graphs with 1000+ nodes. | One shared `HoverCardHandle` across all anchors; no per-anchor DOM; `attachHoverCard(anchor, fn, { shared })` wires listeners, not renderers. |

---

## Out of Scope

- Strukture/Cytoscape integration — separate app, not in this repo.
- A text-only Tooltip primitive — deferred until there's a second concrete consumer.
- Data-attribute auto-wiring — programmatic API only.
- Interactive content inside the card — would require a different primitive (closer to Popover); out of scope here.
