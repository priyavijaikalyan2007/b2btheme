<!-- AGENT: PRD for the NavRail component — app-level primary navigation with collapsed icon rail and expanded categorized drawer. -->

# NavRail Component — PRD

**Status:** Ready for implementation (decisions resolved 2026-04-19)
**Component name:** NavRail
**Folder:** `./components/navrail/`
**Spec author:** Agent
**Date:** 2026-04-19

---

## 1. Overview

### 1.1 What Is It

An **app-level primary navigation** component that renders as a vertical strip
on the left or right edge of the viewport with two visual states:

- **Collapsed** — narrow icon-only rail (~48px). Each nav item appears as an
  icon; hovering reveals the label as a tooltip. Category grouping is
  preserved through visual spacing.
- **Expanded** — wider drawer (~240px). Icons are accompanied by labels,
  category headers are visible, optional badges render on items, and an
  optional header (brand/tenant) and footer (account/settings) are shown.

NavRail is **navigation-only**: it emits an event when the user activates an
item; it does **not** render or own page content. The host application
listens and swaps content wherever it wants (typically in a `DockLayout`
center region or a simple container).

### 1.2 Why Build It

Existing components don't fit this role:

| Component | Why it doesn't fit |
|-----------|--------------------|
| `Toolbar` | Flat list of actions; no categories or labels; dockable to any edge; no two-state visual. |
| `Sidebar` | Generic resizable container; doesn't understand nav items, categories, badges, or active-page state. |
| `AppLauncher` | Cross-app switcher, not in-app page navigation. |
| `Breadcrumb` | Hierarchy display, not primary nav. |
| `CommandPalette` | Search-driven, not persistent nav. |

Enterprise SaaS apps (tenant admin, billing, settings, platform consoles)
routinely need a persistent, category-grouped page navigator that collapses
to save space. Building this bespoke leads to inconsistent UX, missing
accessibility, and no badge/tooltip/active-state semantics.

### 1.3 Industry Term

The pattern is commonly called a **Navigation Rail** (Material Design) or
**Primary Nav / Side Nav** (generic). Equivalents: VS Code's Activity Bar +
Side Bar split, Slack's workspace sidebar, Linear/Notion/Azure Portal's
left navigation. We name the component **NavRail** for clarity alongside
`Sidebar` and `Toolbar`.

### 1.4 Design Inspiration

| Source | Pattern Adopted |
|--------|-----------------|
| Material Design Navigation Rail | Two-state rail/drawer; persistent; categorized items. |
| Azure Portal left nav | Category headers, badges, collapsed-to-icons pattern. |
| Linear sidebar | Brand/tenant header, clean category grouping, active highlight. |
| Slack sidebar | Workspace header with plan info, bottom-anchored user area. |
| VS Code Activity Bar | Icon-only collapsed form with tooltip on hover. |

---

## 2. Anatomy

### 2.1 Expanded (reference: `pagebar-expanded.png`)

```
┌──────────────────────────────┐
│ [K] Knobby IO            [⇅] │  ← Header slot (brand/tenant, optional)
│     Pro plan · 12/25 seats   │
├──────────────────────────────┤
│ [🔍] Jump to...          ⌘K  │  ← Search slot (optional)
├──────────────────────────────┤
│ WORKSPACE                    │  ← Category header
│  [⌾] Overview     (active)   │
│  [≡] Settings                │
│  [▤] Billing                 │
│                              │
│ PEOPLE                       │
│  [👤] Users              [1] │  ← Badge
│  [◈] Roles                   │
│                              │
│ ONTOLOGY                     │
│  [◻] Entities                │
│  [⟋] Relationships           │
│                              │
│ PLATFORM                     │
│  [📊] Types                  │
│  [🔌] Integrations           │
│  [≡] Resources               │
├──────────────────────────────┤
│ [A] Account         [⚙]      │  ← Footer slot (optional)
└──────────────────────────────┘
```

### 2.2 Collapsed (reference: `pagebar-collapsed.png`)

```
┌────┐
│ [K]│  ← Header compressed to avatar/brand mark
├────┤
│[🔍]│  ← Search trigger (opens CommandPalette-like overlay)
├────┤
│[⌾] │  (active indicator on left stripe)
│[≡] │
│[▤] │
│    │  ← Gap preserves category separation
│[👤]│ •  ← Badge dot
│[◈] │
│    │
│[◻] │
│[⟋] │
│    │
│[📊]│
│[🔌]│
│[≡] │
├────┤
│ [A]│
└────┘
```

### 2.3 Sub-pages (flyout / indent)

A nav item MAY have `children`. Rendering:

- **Expanded**: children render indented under parent. Clicking the parent
  toggles a chevron and expands/collapses the children in place. The parent
  itself is also activatable if it has an associated page (`hasOwnPage`
  flag) — otherwise clicking it only toggles children.
- **Collapsed**: hovering (or focusing) the parent icon opens a **flyout
  panel** floating beside the rail listing the children with labels. Click
  selects a child and closes the flyout.

---

## 3. Use Cases

- Tenant admin consoles (Workspace / People / Ontology / Platform sections).
- Billing and settings hubs with many sub-pages grouped by concern.
- Developer/platform consoles (Cloudflare, Supabase, Vercel style).
- Internal tools where a dozen+ pages need consistent, compact navigation.

---

## 4. Functional Requirements

### 4.1 Structure

- Position: `"left"` (default) or `"right"`. Not draggable, not floatable.
- Two states: collapsed (icons only) / expanded (icons + labels + categories).
- Declarative configuration — not imperative DOM children:

  ```ts
  interface NavRailOptions {
      id?: string;
      position?: "left" | "right";        // default "left"
      collapsed?: boolean;                 // default false
      collapsedWidth?: number;             // default 48
      width?: number;                      // expanded; default 240
      minWidth?: number;                   // default 200
      maxWidth?: number;                   // default 320
      resizable?: boolean;                 // expanded only; default false
      header?: NavRailHeader;              // optional brand/tenant block
      search?: NavRailSearch;              // optional search row
      categories: NavRailCategory[];
      footer?: NavRailFooter;              // optional account/settings block
      activeId?: string;                   // initial active item id
      persistStateKey?: string;            // localStorage key for collapsed state
      cssClass?: string;
      onNavigate: (id: string, item: NavRailItem, evt?: Event) => void;
      onCollapseToggle?: (collapsed: boolean) => void;
      onSearchOpen?: () => void;           // when search is activated
  }

  interface NavRailCategory {
      id: string;
      label: string;                        // shown when expanded; hidden when collapsed
      items: NavRailItem[];
  }

  interface NavRailItem {
      id: string;
      icon: string;                         // Bootstrap Icons class — required
      label: string;                        // shown when expanded & in tooltip when collapsed
      tooltip?: string;                     // override label as tooltip text
      badge?: string | number;              // expanded: full pill with text; collapsed: dot (text hidden)
      badgeVariant?: "default" | "danger" | "success" | "warning";
      hasOwnPage?: boolean;                 // default true when no children, false when children exist
      children?: NavRailItem[];             // sub-pages
      disabled?: boolean;
      hidden?: boolean;
      cssClass?: string;
      data?: Record<string, unknown>;
  }

  interface NavRailHeader {
      content?: HTMLElement;                // full custom block (takes precedence)
      brandIcon?: string;                   // Bootstrap Icons class or image URL
      brandInitials?: string;               // e.g. "K" for a tile mark
      title?: string;                       // e.g. "Knobby IO"
      subtitle?: string;                    // e.g. "Pro plan · 12/25 seats"
      onClick?: () => void;                 // e.g. open tenant switcher
  }

  interface NavRailSearch {
      placeholder?: string;                 // default "Jump to..."
      shortcutHint?: string;                // default "⌘K"
      onActivate: () => void;               // host opens CommandPalette
  }

  interface NavRailFooter {
      content?: HTMLElement;                // custom block
      items?: NavRailItem[];                // e.g. account, settings
  }
  ```

### 4.2 Public API

- `collapse()`, `expand()`, `toggleCollapse()`, `isCollapsed()`
- `setActive(id)`, `getActive()`
- `setItems(categories)` — replace all categories
- `setBadge(itemId, badge, variant?)` — update a single badge (no re-render)
- `setDisabled(itemId, disabled)`
- `setVisible(itemId, visible)`
- `getRootElement()`, `destroy()`

### 4.3 Events

- `onNavigate(id, item, evt?)` — fires on item activation (click, Enter, Space).
  Never fires for category headers or disabled items. Parent items with
  children only fire when `hasOwnPage !== false`.
- `onCollapseToggle(collapsed)` — fires after state change.
- `onSearchOpen()` — fires when search row or collapsed search icon is
  activated. The host is expected to open CommandPalette or equivalent.

### 4.4 Interaction

- Clicking an item calls `onNavigate` and sets active state (visual only;
  host decides whether to actually navigate).
- Clicking a parent with children toggles expand/collapse of its children.
  If `hasOwnPage`, it also fires `onNavigate`.
- Clicking the collapse/expand toggle (chevron at the top or a docked
  button) toggles collapsed state. Persisted per `persistStateKey`.
- Hovering a collapsed item shows label as a tooltip after 300ms (reuse
  project tooltip pattern).
- Hovering a collapsed parent with children shows a flyout panel with
  children, positioned beside the rail. Closes on outside click or Escape.

### 4.5 Keyboard

Per `KEYBOARD.md §2`. NavRail follows APG's **tree pattern** (not menubar,
because items persist rather than dismiss):

| Shortcut | Action |
|----------|--------|
| `Tab` | Focus the rail (single tab stop; roving focus inside). |
| `↑` / `↓` | Move focus to previous / next item, skipping category headers and hidden items. |
| `→` | On collapsed parent: open flyout. On expanded parent: expand children. On leaf: no-op. |
| `←` | On collapsed: close flyout. On expanded child: move focus to parent. On expanded parent: collapse children. |
| `Enter` / `Space` | Activate focused item (fires `onNavigate`). |
| `Home` / `End` | Focus first / last item. |
| `Esc` | Close open flyout (collapsed mode). |
| `Ctrl + \`` | Toggle left NavRail collapsed state (when `position="left"`). |
| `Ctrl + B` | Toggle right NavRail (when `position="right"`) — matches `KEYBOARD.md §2` Sidebar right toggle. |

**Binding coexistence with Sidebar**: `KEYBOARD.md §2` assigns the same two
combos to `Sidebar`. Both components claim them **by default** — the 95%
case is that an app uses one or the other per edge and no collision occurs.
When an app mounts **both** NavRail and Sidebar on the same edge, the app
resolves the collision explicitly via the `keyBindings` option on either
component, e.g.:

```ts
createNavRail({ keyBindings: { toggleCollapse: "Ctrl+Shift+`" }, ... });
```

Both components MUST expose a `keyBindings` partial-record option with at
minimum a `toggleCollapse` action name so overrides are symmetric.

### 4.6 Persistence

- When `persistStateKey` is set, collapsed state is read from and written
  to `localStorage` under that key. Default: **no persistence** (caller
  opts in).
- `activeId` is **not** persisted here — navigation state belongs to the
  router / host app.

### 4.7 Size Variants

- `sm` (collapsed 40 / expanded 220), `md` (default: 48 / 240), `lg` (56 / 280).

### 4.8 Coexistence with `Sidebar` and `DockLayout`

- NavRail occupies the outermost edge; `Sidebar` (if present at the same
  edge) renders inside NavRail's offset. NavRail publishes CSS custom
  properties `--navrail-left-width` / `--navrail-right-width` updated on
  every state change so other components (including `Sidebar` and app
  content) can offset correctly.
- `DockLayout` integration: NavRail can be placed as a fixed edge region
  outside of DockLayout, or registered as a `contained: true` panel inside
  it. Default is viewport-edge fixed.

---

## 5. Non-Functional Requirements

### 5.1 Accessibility

- Root: `<nav aria-label="Primary">` (or configurable label).
- Categories: `role="group"` with `aria-labelledby` referencing the
  category header.
- Items: `<button role="link">` with `aria-current="page"` on the active
  one, `aria-expanded` on parents with children, `aria-controls` when the
  flyout is present.
- Tooltip in collapsed mode uses `aria-describedby` on the focused button,
  not `title` (which doesn't work for keyboard users).
- Badge uses `aria-label="{count} new"` or similar for screen readers.
- Focus-visible ring per `UI_UX_CONSISTENCY.md`.
- All colour pairs MUST meet WCAG AA; NavRail is often on a darker surface,
  so verify muted-text-on-dark contrast explicitly.

### 5.2 Dark Mode (DARKMODE.md — mandatory)

- All colours via `var(--theme-*)` tokens. No raw `$gray-*` or `$blue-*`.
- New tokens (define in `_dark-mode.scss` if missing):
  - `--theme-navrail-bg`
  - `--theme-navrail-surface` (for header/footer slots)
  - `--theme-navrail-item-fg`
  - `--theme-navrail-item-hover-bg`
  - `--theme-navrail-item-active-bg`
  - `--theme-navrail-item-active-fg`
  - `--theme-navrail-category-fg` (muted, uppercased)
  - `--theme-navrail-divider`
  - `--theme-navrail-badge-bg` / `--theme-navrail-badge-fg`

### 5.3 Performance

- DOM built once; state changes mutate classes and text, never full re-render.
- Collapse animation ≤ 180ms, respects `prefers-reduced-motion: reduce`
  (instant swap under that media query).
- Flyout lazily created on first open and reused.
- No layout thrash: use `transform` and CSS custom properties for width
  transitions where possible.

### 5.4 Security

- `textContent` only for user-supplied strings (labels, tooltips, badge,
  subtitle). Never `innerHTML`.
- Icon class names are passed through a validated allowlist pattern
  (`/^(bi|fa|fas|far|fab)-[a-z0-9-]+$/`) before being applied, to guard
  against CSS-class injection.

### 5.5 Observability

- `LOG_PREFIX = "[NavRail]"`. Log at `info` on init/destroy, `debug` on
  state changes, `warn` on invalid config (duplicate ids, unknown icon
  class), `error` on DOM errors.
- Emit analytics hooks (optional `onNavigate` already covers this — app
  forwards to its analytics pipeline). No internal analytics SDK coupling.

---

## 6. Technical Design

### 6.1 File Layout

```
components/navrail/
├── navrail.ts          // main implementation (class NavRail, factory createNavRail)
├── navrail.scss        // styles, uses var(--theme-*) tokens exclusively
├── navrail.test.ts     // Arrange-Act-Assert tests per TESTING.md
└── README.md           // usage, API, examples
```

### 6.2 Patterns (GOF_PATTERNS.md)

- **Composite** — category → item → children forms a tree; a single render
  routine walks it. Justification: sub-page hierarchy is unbounded in
  practice; polymorphic render beats per-depth branching.
- **Observer** — `onNavigate`, `onCollapseToggle`, `onSearchOpen` are
  callback-based observers. Justification: host app is a separate concern
  from nav rendering; we don't couple to a router.
- **No pattern required** for state persistence — a ~15-line `localStorage`
  wrapper suffices.

### 6.3 TypeScript Pattern

- Class `NavRail` with factory `createNavRail(options): NavRail`.
- All public types, interfaces, classes, and factory functions exported
  (`MEMORY.md` — IIFE build strips exports but tsc needs them for module
  scoping).
- Window globals on load: `window.NavRail`, `window.createNavRail`.
- DOM helpers `createElement`, `setAttr` component-local (per convention).
- Functions ≤ 30 lines each (CODING_STYLE.md).

### 6.4 CSS Strategy

- Root class `.navrail-container` (avoids collision with `.sidebar` /
  `.navbar`).
- BEM-adjacent naming: `.navrail-header`, `.navrail-search`,
  `.navrail-category`, `.navrail-category-label`, `.navrail-item`,
  `.navrail-item-icon`, `.navrail-item-label`, `.navrail-item-badge`,
  `.navrail-item-active`, `.navrail-item-disabled`, `.navrail-flyout`,
  `.navrail-footer`, `.navrail-toggle`.
- State classes: `.navrail-collapsed`, `.navrail-expanded`,
  `.navrail-left`, `.navrail-right`.
- Positioning: `position: fixed` for viewport mode (default);
  `.navrail-contained` for DockLayout usage (parent controls sizing).
- Publishes `--navrail-left-width` / `--navrail-right-width` on
  `document.documentElement` so page content can offset via
  `padding-left: var(--navrail-left-width, 0)`.

### 6.5 Manager (singleton)

`NavRailManager` — parallels `SidebarManager`. Responsibilities:

- Track all mounted NavRail instances.
- Update `--navrail-*-width` CSS custom properties on the `<html>` root.
- Ensure at most one NavRail per edge (warn if two registered on same edge;
  second is hidden).
- Coordinate with `SidebarManager` so a sidebar on the same edge offsets
  by `--navrail-*-width`.

---

## 7. Demo Sections

On a new `demo/components/navrail.html` page:

1. **Left NavRail, expanded** — mirrors `pagebar-expanded.png` content
   (Knobby IO header, search, 4 categories, footer).
2. **Left NavRail, collapsed** — same data, collapsed state, with hover
   tooltips and a badge on Users.
3. **Right NavRail** — same data on the opposite edge, for apps that
   want properties on the left and primary nav on the right.
4. **With sub-pages** — "Billing" has children (Invoices, Subscriptions,
   Payment methods); expanded shows indentation; collapsed shows flyout.
5. **Resizable expanded** — `resizable: true` with drag handle.
6. **Paired with Sidebar + DockLayout** — NavRail outside, Sidebar
   inside, main content in DockLayout; demonstrates the CSS offset
   coordination.
7. **Dark mode toggle** — visual parity check against ThemeToggle.

Also register a NavRail stencil in `stencils-ui-components.ts` with a
detailed SVG wireframe (Tier A per `layout-studio-stencils.prd.md`) and
add an entry in Component Studio (`AGENTS.md` requirement).

---

## 8. Out of Scope

- Routing — NavRail emits events only.
- Rendering page content — the host owns content and uses
  `DockLayout` / `SplitLayout` / a plain container as appropriate.
- Dragging to a different edge — NavRail is fixed to `left` or `right`
  by config; unlike `Toolbar`, no drag-to-dock.
- Cross-app switching — that's `AppLauncher`'s job.
- Full-text search — NavRail delegates to `CommandPalette` via
  `onSearchOpen`.
- Collapsible categories when expanded — kept simple; categories are
  always visible when expanded. May be revisited if users ask for it.

---

## 9. Resolved Decisions

All open questions have been resolved by the spec author and reviewer
(2026-04-19):

1. **Keyboard bindings shared with Sidebar**: NavRail claims `Ctrl + \``
   (left) and `Ctrl + B` (right) **by default**, identical to Sidebar.
   When an app mounts both on the same edge, the app resolves the
   collision via the `keyBindings` option on either component. Both
   components MUST expose a symmetric `keyBindings.toggleCollapse`
   override. See §4.5.
2. **Header behaviour**: NavRail does **not** own a tenant switcher or
   any header popover logic. The header block exposes `onClick` only;
   apps plug in `WorkspaceSwitcher`, a dropdown, or nothing. See §4.1
   (`NavRailHeader.onClick`).
3. **Active indicator**: left stripe + tinted row background (matches
   mockup). Implemented via `--theme-navrail-item-active-bg` and a
   `::before` pseudo-element for the stripe, both themable.
4. **Badge rendering**:
   - **Expanded** — full pill with the badge text ("1", "12", "NEW").
   - **Collapsed** — **dot only** (text is hidden). 6–8px filled circle
     anchored to the icon's top-right corner. Coloured by `badgeVariant`.
   A missing/falsy `badge` shows nothing in either state.

---

## 10. Acceptance Criteria

- [ ] Renders both states from a single declarative config.
- [ ] Emits `onNavigate`, `onCollapseToggle`, `onSearchOpen` at correct times.
- [ ] Collapsed state preserves category grouping via spacing.
- [ ] Sub-pages work in both states (indent / flyout).
- [ ] Keyboard navigation matches §4.5.
- [ ] Dark mode verified with only `var(--theme-*)` tokens.
- [ ] Publishes `--navrail-*-width` and plays nicely with `Sidebar`.
- [ ] Stencil registered in Layout Studio + entry in Component Studio.
- [ ] Demo page covers all seven sections in §7.
- [ ] Tests (written **first**, per AGENTS.md TDD) cover: rendering, active
      state, collapse toggle, navigate event, flyout open/close, badge
      updates, keyboard arrows, persistence round-trip.
- [ ] Functions ≤ 30 lines, nesting ≤ 3, Allman braces.
- [ ] Concept, entity, ADR entries added to `agentknowledge/`.
- [ ] Entry added to `COMPONENT_INDEX.md`, `MASTER_COMPONENT_LIST.md`,
      `CHANGELOG.md`.

---

## 11. Status

| Phase | Status |
|-------|--------|
| PRD | **Approved — decisions locked 2026-04-19** |
| TypeScript | Not started |
| SCSS | Not started |
| Tests | Not started |
| README | Not started |
| Demo | Not started |
| Stencil + Studio entry | Not started |
| Build | Not started |
