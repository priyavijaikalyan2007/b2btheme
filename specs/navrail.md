<!-- AGENT: Per-component progress log for NavRail. Shorter than CONVERSATION.md; resume-friendly for future sessions. -->

# NavRail — Progress Log

**Component:** NavRail
**Folder:** `components/navrail/`
**Spec (PRD):** `specs/navrail.prd.md`
**ADR:** ADR-124
**Status:** Complete (initial implementation)

---

## Session 1 — 2026-04-19 (Implementation)

### Outcome

Shipped the initial implementation in one session. All four user-reviewed
spec decisions were locked before coding:

1. **Keyboard bindings** shared with Sidebar (`Ctrl+\``, `Ctrl+B`) by default;
   collision resolved by `keyBindings.toggleCollapseLeft` / `...Right` overrides.
2. **Header behaviour** — NavRail exposes `onClick` only. Host plugs in
   WorkspaceSwitcher etc.
3. **Active indicator** — left stripe + tinted row (matches mockup),
   themable via `--theme-navrail-item-active-bg` / `...-stripe`.
4. **Badge rendering** — pill when expanded, dot when collapsed.

### Files created / modified

- `components/navrail/navrail.ts` (~1050 lines, 2 classes, 1 factory)
- `components/navrail/navrail.scss` — all colours via `var(--theme-navrail-*)`
- `components/navrail/navrail.test.ts` — 47 tests (TDD)
- `components/navrail/README.md` — full API + dark-mode token table
- `src/scss/_dark-mode.scss` — 22 new `--theme-navrail-*` tokens
  (light + dark)
- `demo/components/navrail.html` — standalone 6-section demo
- `demo/all-components.html` — inline demo + TOC entry
- `demo/index.html` — card in Panels & Navigation
- `demo/studio/component-studio.html` — Component Studio entry + help
- `components/diagramengine/src/stencils-ui-components.ts` — Layout Studio
  stencil (Tier A) with detailed SVG wireframe
- `components/diagramengine/diagramengine-embed.test.ts` — bumped UI
  component counts (106 → 107, `before + 133` → `+ 134`)
- `specs/navrail.prd.md` — spec (decisions locked)
- `agentknowledge/{decisions,concepts,entities,history}.yaml|jsonl`
- `MASTER_COMPONENT_LIST.md §8.3`, `COMPONENTS.md`, `CHANGELOG.md`
- `COMPONENT_INDEX.md`, `MASTER_COMPONENT_INDEX.md`,
  `docs/COMPONENT_REFERENCE.md`, `docs/AGENT_QUICK_REF.md` — auto-regenerated
  by `npm run build`

### Test coverage

47 unit tests across 10 describe blocks:

- `createNavRail` (5) — factory, mount, nav role/aria-label, position class
- `rendering` (8) — categories, items, icons/labels, category label text,
  badge pill, header text, search row, XSS guard (textContent only)
- `active state` (4) — initial, `aria-current="page"`, `setActive`,
  unknown id
- `navigate event` (4) — click, disabled, Enter, category header
- `collapse toggle` (5) — default, initial collapsed, callback, labels
  hidden, toggle button
- `badge updates` (2) — setBadge + setBadge(null)
- `disabled / visibility` (2)
- `children and flyout` (3) — expanded toggle, collapsed hover, Escape closes
- `keyboard navigation` (5) — Arrow Up/Down/Home/End, Ctrl+backtick toggle
- `persistence` (3) — round-trip, restore on init, no-key no-write
- `CSS custom properties` (4) — left/right width, collapsed width,
  destroy removes vars
- `destroy` (2) — DOM removal, listener detach

Full suite: **3,818 tests pass across 115 files** (bumped
`diagramengine-embed.test.ts` hardcoded counts by +1 for the new ui-component).

### Standards pass

- Functions audited against CODING_STYLE.md 30-line budget:
  split `buildItemEl` (62 → ≤ 28 each) into `buildItemButtonShell`,
  `attachParentChrome`, `attachItemListeners`, `applyInitialActiveState`;
  `onItemClick` (34) into `handleParentClick`; `onItemKeyDown` (44) into
  `onArrowRight`; `setBadge` (38) into `clearItemBadge` +
  `applyItemBadge`. All public and private methods now ≤ 30 lines.
- Allman brace style, 4-space indent, guard clauses, no mutation in
  conditions.
- `textContent` only for user-supplied strings (XSS guard test proves
  it).
- Icon class names validated against `/^(bi|fa|fas|far|fab)-[a-z0-9-]+$/i`
  before CSS-class application.
- `createElement` / `setAttr` helpers (no `innerHTML` for untrusted
  input).
- `LOG_PREFIX = "[NavRail]"`; info/warn/debug routed through the shared
  log utility when present.
- Semantic markers: `⚓ COMPONENT: NavRail` header; `⚓ NavRail`,
  `⚓ NavRailManager`, `⚓ createNavRail` anchors; `@entrypoint` on class
  and factory.

### Known follow-ups / tech-debt notes

None critical for v1. Potential future work:

- **Resizable expanded width** — `resizable` option is declared but not
  wired; drag handle on the trailing edge can be added when a consumer
  asks. Cost: ~40 lines + one test.
- **Roving tabindex formalisation** — currently every item is tabbable
  (tabindex=0). APG tree pattern recommends roving (single tabindex=0,
  others −1) for a single tab stop. Works today but would be crisper.
- **Flyout keyboard entry** — Escape closes; `Tab` / arrow keys don't
  yet move focus *into* the flyout from the parent. Acceptable for v1
  (flyout items remain clickable); worth revisiting if users complain.
- **High-contrast stripe width** already bumped to 4px under
  `prefers-contrast: more`; check against any customer high-contrast
  review feedback later.

---

## Session 2 — 2026-04-19 (Standards + markers polish)

- Added `⚓ NavRail`, `⚓ NavRailManager`, `⚓ createNavRail` context
  anchors per MARKERS.md.
- `@entrypoint` added on `class NavRail` and `createNavRail` factory.
- Refactored four functions over the 30-line budget (listed above).
- Created this progress file (`specs/navrail.md`) per AGENTS.md
  "per-component progress in `./specs/`".
- CONVERSATION.md appended with this session's transcript.

---

## How to resume

- Current behaviour is specified in `specs/navrail.prd.md` (§9 Resolved
  Decisions lists every baked-in choice).
- Regressions: run `npx vitest run components/navrail/navrail.test.ts`.
- Visual check: `demo/components/navrail.html` (six sections); toggle
  light/dark via the theme switch in the header.
- Layout Studio stencil: open `demo/studio/layout-studio.html`, drop
  "NavRail" from the UI Components stencil palette.
- Component Studio demo: open `demo/studio/component-studio.html`,
  select NavRail under Navigation.
