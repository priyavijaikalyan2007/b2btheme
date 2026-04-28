# Changelog

All notable changes to the Enterprise Bootstrap Theme project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

This file is maintained by coding agents and updated at the end of each session when
user-visible changes are made. Entries are generated from `agentknowledge/history.jsonl`
and the git log. For the complete machine-readable history, see `agentknowledge/history.jsonl`.

---

## [Unreleased]

## 2026-04-28

### Changed
- **NavRail (ADR-131)** — the collapse/expand chevron is now rendered at the **top** of the rail (was previously at the bottom, after the footer slot). Apps-team integration testing flagged the inconsistency with `Sidebar`, whose collapse button lives in its actions row at the top — same edge of the screen, two different gesture locations. `buildDOM` now inserts `buildToggleButton()` as the first child of the rail; `.navrail-toggle` border flipped from `border-top` to `border-bottom` so the visual divider stays on the correct side. Footer slot is now reserved purely for account/settings content. No public API change — the toggle still resolves by `.navrail-toggle` class (47/47 tests green without modification).

### Added
- **NavRail (ADR-131)** — one-shot **dev-mode overlap warning**. NavRail is `position: fixed` and publishes `--navrail-{left|right}-width` so consuming pages can either consume the variables on a content wrapper or wrap NavRail + content in a `DockLayout` (`contained: true`). When a host page does neither, content slides under the rail. After two `requestAnimationFrame` ticks, the rail probes `elementFromPoint` just past its outer edge; if the topmost non-rail element extends back under the rail's footprint, a `[NavRail]` `logWarn` names the CSS variable to consume and the DockLayout alternative. Skipped when `contained: true`. New `suppressOverlapWarning?: boolean` option (`NavRailOptions`) silences the check for layouts that intentionally trip the heuristic. README §"CSS Custom Properties" gained a paragraph; new `NavRailOverlapCheck` concept registered in `agentknowledge/concepts.yaml`.

### Decisions
- **NavRail resizable rail explicitly *not* added.** ADR-131 records the rationale: NavRail's value is two stable widths (icon rail / labeled drawer); apps that need a draggable edge already have `Sidebar` (resizable, dockable, floatable). Adding resize would blur the README's NavRail-vs-Sidebar boundary and would not fix the overlap issue — the published CSS var would still need to be consumed.

## 2026-04-27 (polish)

### Changed
- **ChartPanel demos** — switched from `cdn.jsdelivr.net` to a locally vendored Chart.js bundle (`dist/vendor/chart.js/chart.umd.min.js`) for the standalone, all-components, and Component Studio demos. Added `chart.js@^4.4.7` to devDeps; the existing `npm run copy:js` step now mirrors `node_modules/chart.js/dist/chart.umd*.js` alongside Bootstrap. Demos work offline / behind strict CSPs / past ad-blockers without depending on jsdelivr availability. README continues to list the CDN URL as an alternative for end consumers who prefer cross-app caching. ADR-130 logic unchanged — `chartpanel.ts` still reads `window.Chart` and renders a literate error if missing.
- **ChartPanel internals** — `buildScales` and `destroy` split below the 30-line CODING_STYLE.md limit (`buildYTicks` and `tearDownObservers` helpers extracted). `tooltip.enabled: !isSpark || true` simplified to `true` (the original expression always evaluated `true` — leftover from a half-applied edit).
- **Theme tokens** — `--theme-metric-positive` / `--theme-metric-negative` added to light-mode `:root` in `src/scss/_dark-mode.scss` (were defined only under `[data-bs-theme="dark"]`). MetricCard's trend colours now resolve through the token in both modes consistently with what its README documents.
- **ADR-130** — amended in place with a paragraph explaining why `FALLBACK_INTENT_HEX` constants are kept (jsdom / pre-CSS-load safety net only; runtime paint always tries `--theme-*` first), so the next reader doesn't flag the hex literals as drift from the spec's "no hex anywhere in JS" rule.

### Removed
- **ChartPanel demo** — the synthetic "Missing dependency (literate error)" card on `demo/components/chartpanel.html` is removed. It deleted `window.Chart`, instantiated a panel to render the literate error block, and restored the global. The card produced an `[ERROR]` console line that was indistinguishable from a real Chart.js load failure, and the `delete window.Chart` snippet was a tempting copy-target for adopters. The literate-error path remains documented in `chartpanel/README.md`.

### Fixed
- **DiagramEngine embed tests** — bumped four pinned shape counts in `diagramengine-embed.test.ts` (152→154, 108→110 ×2, 164→166) and `UI_SHAPE_COUNT` 93→95 in `stencils-ui-components.ts` to match the two new Tier C stencils (`metriccard`, `chartpanel`). CI caught this; my local `tail -15` had truncated the failure summary, so the "green" line I reported in the previous commit came from a partial buffer.

## 2026-04-27

### Added
- **MetricCard (ADR-129)** — new component (`components/metriccard/`) for dashboard "KPI strips". Single-value cards with optional trend (intent-override semantics — e.g. "errors increased" can be `direction: "up", intent: "negative"`), optional inline 24px sparkline, optional secondary stat, and four lifecycle states (`ready` / `loading` / `error` / `empty`). Click semantics are native: `href` → `<a>`, `onClick`-only → `<button>` (no `role="link"` on a `<div>` with manual key handlers). Two sizes (`sm` 11/22px, `md` 12/32px) for dense analytics rows. Card height is reserved across states so `loading → ready` produces no layout jump. Theme tokens via the project's `--theme-*` layer with SCSS-variable fallbacks. Closes the planned-not-built §10.2 entry in `MASTER_COMPONENT_LIST.md`. **52 unit tests, all green.**
- **ChartPanel (ADR-130)** — new component (`components/chartpanel/`) — a theme-aware Chart.js wrapper supporting `bar`, `line`, `area`, and `sparkline`. Reads `window.Chart` (Chart.js >= 4.4, < 5) following the established **ADR-028 external-globals pattern** used by CodeMirror, marked, hljs, KaTeX, mermaid; the consuming app loads Chart.js itself via a `<script>` tag and the wrapper renders a literate error if it's missing. Re-themes automatically on `data-bs-theme` toggle via a `MutationObserver` on `<html>`. ResizeObserver-debounced resize. `setData` with the same series IDs updates in place with no animation (avoids jank on poll-driven dashboards). `ariaLabel` is required by the TS type; a visually-hidden `<table>` fallback (default on) renders the same data for screen readers. Sparkline kind defaults to no axes / no legend / no value labels. `exportPNG()` provided; `exportSVG` deliberately not (Chart.js renders to canvas). Wrapper alone is ≤ 8 KB gzip — Chart.js itself is the consuming app's deployment concern. **23 unit tests, all green.**
- **Stencils** — `metriccard` and `chartpanel` registered in `stencils-ui-components.ts` Tier C (with custom render functions) so both place and preview correctly in the Layout Studio.
- **Component Studio** — entries added under the "Feedback" category for both new components, including a Chart.js CDN tag for `chartpanel` (loaded before `chartpanel.js`).
- **Demo** — new `metriccard-section` and `chartpanel-section` in `demo/all-components.html` covering all four states, intent overrides, and all four chart kinds.
- **Spec** — `specs/2026-04-27-tenant-admin-cdn-components.md` filed by the apps team for the Tenant Admin reorg; reviewed and resolved by the UI team in the same document (theme tokens, slug names, Chart.js loading model, click semantics, sparkline addition, `exportSVG` dropped).

## 2026-04-26 (amendment)

### Changed
- **ActionItems** — alpha sort moved from the InlineToolbar to the existing sort dropdown (ADR-128 amendment). The dropdown gained two new `SortOption` values: `"alpha-asc"` ("Title A-Z") and `"alpha-desc"` ("Title Z-A"). The InlineToolbar (when `showInlineToolbar: true`) now exposes **only** expand-all and collapse-all — sort buttons would have duplicated the dropdown's surface area and split the sort control. Single-source-of-truth via the existing dropdown is cleaner. Removed the parallel `alphaSortMode` state and its public API: `setAlphaSortMode` / `getAlphaSortMode` methods, `initialAlphaSortMode` / `onAlphaSortModeChange` options, the `applyAlphaOverlay` helper, and the exported `ActionItemsAlphaSortMode` type. RelationshipManager, Timeline, and TreeView are unaffected — they retain the canonical four-action shape because none of them ship a comparable multi-mode sort dropdown. Demo, README, concepts.yaml entry, and ADR-128 updated. Full suite: **3,937 / 3,937 green** (net −2 tests vs. previous batch — dropped 6 alpha-via-toolbar tests, added 4 alpha-via-dropdown tests).

## 2026-04-26

### Added
- **CategorizedDataInlineToolbar UX pattern (ADR-128)** — codified in `agentknowledge/concepts.yaml` and applied across four components. Whenever a component renders multiple grouped cards or a tree to convey categorization, it now exposes an *optional* InlineToolbar (or extends its existing toolbar) offering sort group names asc/desc, expand-all, and collapse-all. **Default is OFF — host opts in.** All actions are hookable via `onSortModeChange` / `onCollapseStateChange` callbacks; state round-trips through `initialSortMode` / `initialCollapsed` options + public setters.
- **RelationshipManager** — new options `showInlineToolbar`, `initialSortMode`, `initialCollapsed`, `onSortModeChange`, `onCollapseStateChange`; new methods `setSortMode(mode)` / `getSortMode()`. Sort applies to relationship-type group keys. 14 new tests.
- **Timeline** — same option surface; sort applies to `TimelineGroup[]` ordering by `label`. New optional header strip above the time axis when `showInlineToolbar: true`. 12 new tests.
- **ActionItems** — new options `showInlineToolbar`, `initialAlphaSortMode`, `initialCollapsed`, `onAlphaSortModeChange`, `onCollapseStateChange`; new methods `setAlphaSortMode` / `getAlphaSortMode` / `expandAll` / `collapseAll`. **Coexists with the existing 5-mode sort dropdown** — alpha-asc/desc is a secondary alpha-by-title sort layered on top of the primary sort and applies to items WITHIN sections (section order remains by status enum). 11 new tests.
- **TreeView** — new option `showDefaultGroupActions` (default false). When true, four default actions (sort siblings asc/desc, expand-all, collapse-all) are *prepended* to the existing `.treeview-toolbar` — TreeView already ships a toolbar, so this adoption extends it rather than mounting a second InlineToolbar. New callbacks `onSortModeChange` / `onCollapseStateChange` round-trip through the existing `setSort` / `expandAll` / `collapseAll` paths. 9 new tests.
- **InlineToolbar README** — new "When to adopt" section pointing at ADR-128 with the four-action minimum and adopter list.

### Fixed
- **TreeView** — `buildToolbarButton` now splits `action.icon` on whitespace so callers can pass a multi-class icon string like `"bi bi-x"` (matches Bootstrap Icons convention). Previously `classList.add` rejected the space-containing token with `InvalidCharacterError`. ADR-128 default actions and any host-supplied multi-class icons are now safe.

### Notes
- DataGrid and ExplorerPicker were considered for adoption but dropped: DataGrid is flat tabular with per-column sort UI (no grouping); ExplorerPicker uses sections as a UI layout device for search results, not data categorization (no public sort API). The CategorizedDataInlineToolbar pattern does not apply.
- Full suite: **3,939 / 3,939 green** (46 new tests across 4 components).

## 2026-04-22

### Fixed
- **GraphCanvas** — hub-node edge labels no longer stack illegibly (P2, ADR-127). Root cause: every edge label rendered at Bézier midpoint `t = 0.5`; the existing per-pair perpendicular offset only separates parallel edges between the same node pair, so different edges sharing a hub piled up when layouts clustered neighbors together. See `specs/2026-04-21-graphcanvas-edge-label-stacking-at-hubs.md`.

### Added
- **GraphCanvas** — `edgeLabelDensity: "all" | "hub-compact" | "none"` on `GraphCanvasOptions` (default **`"hub-compact"`**). Hub-incident edges (either endpoint with visible degree ≥ `hubDegreeThreshold`, default `5`) render a 2–3 char abbreviation on canvas; full label is still surfaced via the edge HoverCard on hover. Non-hub edges keep full labels. All label placement now steps along the Bézier parameter `t` to avoid overlap; falls back to midpoint if no step is free (never hides).
- **GraphCanvas** — short-form rule: multi-word labels use word initials (`"Sourced From"` → `"SF"`), single-word labels use first two chars uppercased (`"Mirrors"` → `"MI"`). Deterministic, testable.
- **GraphCanvas** — new CSS hooks `.gc-edge-label` (all edge labels) and `.gc-edge-label-compact` (hub abbreviations; slight weight + letter-spacing bump).
- **GraphCanvas** — `hubDegreeThreshold` option (default `5`) to tune when an endpoint counts as a hub.
- 12 new tests in `components/graphcanvas/graphcanvas-edge-labels.test.ts` covering density modes, short-form rules, sparse-graph non-regression, threshold override, hover-channel integrity on abbreviated edges, and collision stepping producing distinct positions. Full suite: **3,893 / 3,893 green**.

### Behavior change
- The default `edgeLabelDensity` is `"hub-compact"` — apps that previously relied on full labels at every edge's midpoint will see hub labels abbreviated out of the box. Set `edgeLabelDensity: "all"` on the `createGraphCanvas` call to restore the old behavior. The legacy `showEdgeLabels: false` still works and now forces density to `"none"`.

## 2026-04-21

### Added
- HoverCard adopted in ActionItems and DiagramEngine (ADR-126) — same primitive, same `(window as any).createHoverCard` runtime lookup pattern.
- ActionItems — new options `itemHoverCardMode` (`"builtin"` | `"custom"` | `"off"`, default `"builtin"`) and `renderItemHoverCard(item)`. Default extractor shows *extra* context rather than repeating the visible row: full content as title, assignee (or "Unassigned") as subtitle, status badge, properties {Priority?, Due?, Created, Updated, Comments?}, tag labels in the footer.
- DiagramEngine — new options `objectHoverCardMode` (default `"off"` — canvas editor opt-in), `renderObjectHoverCard(obj)`, `renderConnectorHoverCard(conn)`. When enabled, the card only shows while the active tool is `"select"` and no drag / pan / connect interaction is in progress. Object default extractor: title ← first text run · `semantic.type` · shape; subtitle ← shape; badge ← first `semantic.tags`; properties ← flattened `semantic.data`; description ← `semantic.data.description` if string. Connector extractor adds `{source, target}` and pulls the title from the first connector label.
- Tool interface gained optional `isInteracting(): boolean`; ToolManager forwards it; SelectTool / ConnectorTool / PanTool implement it (used by the DiagramEngine hover-card guard).
- `specs/hovercard-adoption.prd.md` + `specs/hovercard-adoption.plan.md` (ADR-126).
- 21 new tests — 11 in `actionitems-hovercard.test.ts`, 10 in `diagramengine-hovercard.test.ts` (including explicit drag-suppression coverage for the `isInteracting()` path). Full suite: **3,881 / 3,881 green** (up from 3,860).
- `demo/components/actionitems.html` and `demo/components/diagramengine.html` now include `hovercard.css` + `hovercard.js` and a note pointing at the new affordance. DiagramEngine demo sets `objectHoverCardMode: "builtin"`.
- ADR-126 in `agentknowledge/decisions.yaml`; HoverCard concept entry lists ActionItems + DiagramEngine as adopters; `history.jsonl` updated.

### Fixed
- HoverCard anchored to the viewport edge instead of the hovered graph node — `resolveAnchorRect` tested `instanceof HTMLElement`, which silently fell through for SVG `<g>` nodes (SVGElement is a sibling of HTMLElement under Element, not a subclass). Broadened `HoverCardAnchor` to `Element` and switched all three `instanceof HTMLElement` checks to `instanceof Element` (`resolveAnchorRect`, scroll-ancestor wiring, anchor-detach watch). Regression test added.
- HoverCard anchored to the bottom-left of the GraphCanvas container — portal was `this.root` (a `transform`/`filter` ancestor degrades `position: fixed` to "absolute relative to that ancestor"). Let HoverCard default-portal to `document.body`.

### Changed
- Split six over-budget HoverCard functions into ≤30-line helpers (CODING_STYLE.md): `appendHeader` → `buildHeaderIcon` + `buildTitleBlock`; `attachHoverCard` → `openOnAnchor` + `closeOnAnchor` + `detachAnchorListeners`; `tryPlace` → `rawPlacement` + `verticalPlacement` + `horizontalPlacement` + `primaryFits`; `ensureRoot` → `buildRootElement`; `appendProperties` → `renderPropertyRow` + `renderPropertyOverflow`; `buildState` → `resolveOptions`
- Added `⚓ createHoverCard` and `⚓ attachHoverCard` context anchors per MARKERS.md

## 2026-04-20

### Added
- HoverCard component — informational floating card for rich-on-hover detail previews; declarative `HoverCardContent` (title/subtitle/icon/iconColor/badge/properties/description/footer) plus `HTMLElement`/`string` escape hatches; `textContent` only; `role="tooltip"` + `aria-describedby`; `pointer-events: none`; `maxHeight` ceiling with CSS `::after` fade mask; 250ms open / 100ms close default delays; z-index 1005 (ADR-125) (`components/hovercard/`)
- `createHoverCard(options?)` factory and `attachHoverCard(anchor, getContent, { shared })` helper — the `shared` option lets a single DOM node back hundreds of anchors (critical for graphs); touch-primary devices no-op
- HoverCard dismisses on `Escape`, scroll-ancestor scroll, window resize, browser-native `contextmenu` DOM event (covers apps that don't use our ContextMenu), custom `hovercard:yield` CustomEvent (opt-in), and anchor detachment
- Pure `computePosition()` with 4-way placement fallback (auto → bottom/top/right/left) and cross-axis viewport clamping
- GraphCanvas adopts HoverCard — new `tooltipMode` (`"builtin"` | `"custom"` | `"off"`), `renderNodeTooltip`, `renderEdgeTooltip` options; new `GraphNode.description` and `GraphEdge.description` fields (non-breaking); legacy private `.gc-tooltip` DOM and `TOOLTIP_DELAY` removed
- HoverCard demo — standalone page at `demo/components/hovercard.html` (6 hover tiles + GraphCanvas integration + custom-renderer toggle)
- HoverCard section in `demo/all-components.html` and card in `demo/index.html`
- HoverCard tile in Component Studio (`demo/studio/component-studio.html`) with `COMPONENT_HELP` entry under Interactive
- HoverCard stencil in Layout Studio via `stencils-ui-components.ts` (dashed anchor rect + floating card with header, badge, 3 properties, description hint)
- `specs/hovercard.prd.md` — full product spec with all 7 design decisions captured in §7
- `specs/hovercard.plan.md` — 9-phase implementation plan tracking progress
- ADR-125 in `agentknowledge/decisions.yaml`; HoverCard and HoverCardStyles entries in `concepts.yaml`; history entry

### Changed
- GraphCanvas private `tooltipEl`, `tooltipTimer`, `showTooltip`, `hideTooltip`, `updateTooltipPosition`, `buildNodeTooltipContent`, `buildEdgeTooltipContent` replaced by HoverCard-backed `showNodeHoverCard` / `showEdgeHoverCard` / `hideHoverCard` and declarative `buildNodeHoverContent` / `buildEdgeHoverContent`
- GraphCanvas `.gc-tooltip` SCSS block removed; comment left pointing at `components/hovercard/`

## 2026-04-19

### Added
- NavRail component — app-level primary navigation with collapsed icon rail and expanded categorized drawer; brand header, delegating search row, categories with badges and sub-pages (indented or flyout), footer, active-page highlight (`components/navrail/`)
- `--theme-navrail-*` CSS tokens in `src/scss/_dark-mode.scss` for light and dark mode parity
- NavRail demo — standalone page at `demo/components/navrail.html` with six sections (expanded, collapsed, right edge, sub-pages, size variants, dark-mode)
- NavRail section + TOC entry in `demo/all-components.html`
- NavRail entry in Component Studio (`demo/studio/component-studio.html`) under Navigation
- NavRail stencil in Layout Studio (`components/diagramengine/src/stencils-ui-components.ts`) with detailed SVG wireframe
- `specs/navrail.prd.md` — full product spec
- `specs/navrail.md` — per-component progress log (resume-friendly for future sessions)
- ADR-124 in `agentknowledge/decisions.yaml`; concepts and entities entries for NavRail, NavRailStyles, NavRailOptions, NavRailItem, NavRailCategory, NavRailHeader, NavRailSearch, NavRailFooter, NavRailHandle, NavRailManager
- CONVERSATION.md entry for the NavRail session

### Changed
- NavRail `buildItemEl` split into `buildItemButtonShell` + `attachParentChrome` + `attachItemListeners` + `applyInitialActiveState` to respect the ≤30-line function budget (CODING_STYLE.md)
- NavRail `onItemClick` split into `handleParentClick`; `onItemKeyDown` split out `onArrowRight`; `setBadge` split into `clearItemBadge` + `applyItemBadge`
- NavRail `⚓` context anchors added for `NavRail`, `NavRailManager`, `createNavRail` and `@entrypoint` markers on class + factory (MARKERS.md)

## 2026-04-17

### Added
- LayoutPicker semantic anchors — `⚓ COMPONENT`, `⚓ AlgorithmRegistry`, `⚓ ThumbnailBuilder`, `⚓ createLayoutPicker` markers for navigation
- LayoutPicker knowledge-base coverage — 6 entity entries (`LayoutAlgorithm`, `LayoutCategory`, `LayoutPickerOptions`, `CustomAlgorithmDefinition`, `LayoutPickerAPI`, `createLayoutPicker`) in `agentknowledge/entities.yaml`

### Changed
- LayoutPicker `positionPanel()` split into `positionPanel` + `clampHorizontal` + `applyVerticalPlacement` to respect the ≤30-line function budget (CODING_STYLE.md)
- LayoutPicker `onDocumentKey()` switch replaced with a `KEY_HANDLERS` dispatch table — same behaviour, shorter, single-responsibility per key

### Removed
- LayoutPicker unused `SPECIAL_THUMB_IDS` constant (was flagged by `noUnusedLocals`)

## 2026-04-16

### Added
- GraphCanvas multi-edge routing — parallel edges between the same node pair fan out via perpendicular Bezier offsets with staggered labels (ADR-122)
- GraphCanvas icon name resolution — `resolveIconChar()` maps CSS class names, Feather icon names (26-entry mapping), and `bi-` prefixed names to Unicode glyphs via CSS `::before` content lookup with caching (ADR-123)
- GraphCanvas demo sections for multi-edge routing and icon name resolution

### Fixed
- GraphCanvas `buildNodeIcon()` rendered literal icon name strings instead of Bootstrap Icons glyphs (ADR-123)
- GraphCanvas overlapping edge paths and unreadable labels when multiple edges connected the same node pair (ADR-122)

## 2026-04-14

### Fixed
- DockLayout `mountComponent()` silently dropped plain `HTMLElement` args — toolbar/sidebar/statusbar stayed on `document.body`, pushing the 100vh grid past the viewport; added `instanceof HTMLElement` fallback branch (ADR-118)
- Ribbon `show()` and `createRibbon()` only accepted string container IDs unlike every other component — updated to accept `string | HTMLElement` via `resolveContainer()` helper (ADR-118)
- RelationshipManager SCSS used hardcoded `$gray-500`/`$gray-600`/`#6f42c1` for text colours that didn't adapt to `data-bs-theme="dark"` — replaced 8 values with `var(--theme-text-muted)`, `var(--theme-text-secondary)`, and component-scoped `--rm-confidence-*` tokens (ADR-119)
- 17 components with mouse-only events broken on touch devices — migrated to Pointer Events with `setPointerCapture` for reliable drag/resize on touch (TreeGrid, GraphMinimap, HelpDrawer, PropertyInspector, MarkdownEditor, ActionItems, VisualTableEditor, TimePicker, DatePicker, ContextMenu, Ruler, ColorPicker, GradientPicker, AnglePicker, FacetSearch, HelpTooltip) (ADR-120)
- Touch targets below 44px WCAG 2.5.8 minimum — added `@media (pointer: coarse)` rules to 15 SCSS files enlarging buttons to 44px and resize handles to 16px (ADR-120)
- Hover-hidden UI elements invisible on touch devices — tab close buttons (TabbedPanel), help tooltips (HelpTooltip, DatePicker) now visible via `@media (hover: none)` (ADR-120)
- ColorPicker and DatePicker popups overflowing 320px viewports — added `@media (max-width: 320px)` responsive breakpoints (ADR-120)

### Added
- DockLayout plain `HTMLElement` support in all slot setters (`setToolbar`, `setLeftSidebar`, `setRightSidebar`, `setBottomPanel`, `setStatusBar`)
- Ribbon `resolveContainer()` private helper for consistent `string | HTMLElement` resolution
- RelationshipManager dark mode confidence badge tokens (`--rm-confidence-color`, `--rm-confidence-bg`) with `[data-bs-theme="dark"]` override
- `_touch.scss` mixin library — `touch-target`, `hover-visible`, `touch-drag`, `touch-resize-handle` mixins + global tap-highlight removal for all interactive elements (ADR-120)
- ContextMenu `attachLongPress()` utility function — 500ms long-press to open context menu on touch devices with 10px move cancellation threshold (ADR-120)
- HelpTooltip tap-to-toggle pattern — first tap shows tooltip, second tap opens help drawer on touch devices (ADR-120)

## 2026-04-13

### Fixed
- DockLayout did not observe toolbar cell height changes — when Ribbon collapsed/expanded, `grid-template-rows` stayed stale, causing status bar and bottom panels to disappear; added `ResizeObserver` on `.dock-layout-toolbar` cell (ADR-116)
- Ribbon used hardcoded inline color overrides that prevented automatic dark mode adaptation via `data-bs-theme`; added `resetColors()` method to clear all inline overrides and revert to CSS custom property defaults (ADR-117)

### Added
- Ribbon `resetColors()` method — clears all inline `--ribbon-*` CSS custom property overrides, letting the SCSS-defined `var(--theme-*)` defaults drive dark mode adaptation automatically

## 2026-04-12

### Fixed
- Sidebar rendered Close (x) and Float/Undock buttons unconditionally even when configuration disabled them — Float button now conditionally rendered only when `draggable: true`; Close button now conditionally rendered only when `closable: true` (ADR-115)

### Added
- Sidebar `closable` option (`SidebarOptions.closable?: boolean`, default `true`) to control whether the Close button appears in the header
- Migration guide for apps team: `specs/2026-04-12-sidebar-button-migration-guide.md` — step-by-step checklist for removing CSS workarounds in Explorer, Diagrams, Thinker, Checklists, and Strukture

## 2026-04-08

### Fixed
- FormDialog dual-footer when `customContent` manages its own buttons — new `showFooter: false` option hides the built-in Submit/Cancel footer; also disables Enter-to-submit keyboard shortcut when footer is hidden (ADR-114)
- RelationshipManager "+Add" button always visible when `readOnly: false` even without `onCreateRelationship` callback — button now inferred from callback presence, overridable via new `showAddButton` option; five apps (Strukture, Diagrams, Thinker, Checklists, Explorer) can use display+delete+navigate mode without a non-functional add button

### Changed
- Renamed `explorer-picker` component to `explorerpicker` for naming consistency — all 112 components now use concatenated lowercase directory/file names with no hyphens

## 2026-04-07

### Fixed
- Component Studio and Layout Studio losing JSON property edits on selection change — `propOpts`/`propCompOpts` textarea used `change` event (fires on blur) but selection handler ran first, overwriting textarea before the event could fire; added `flushPendingOptions()`/`flushPendingComponentOptions()` to capture and apply dirty edits before selection changes

### Added
- HTML primitives category in Component Studio and Layout Studio — 12 building-block elements (Heading, Text, Bold, Small, Icon, Panel, Divider, Link, Badge, Image, List, Blockquote) with HTML render functions, COMPONENT_HELP entries, SVG wireframe stencils, and palette integration; generalized `addBootstrapShapes()` → `addShapePaletteEntries()` for extensible shape categories

## 2026-04-06

### Fixed
- DataGrid column resize handles triggering column move instead of resize — `pointerdown` on resize handle called `stopPropagation()` but not `preventDefault()`, so HTML5 drag-and-drop on the parent `draggable="true"` cell still fired; added `preventDefault()` and a `dragstart` guard
- SymbolPicker dialog not dismissing when Insert button clicked in RibbonBuilder — `handleSymbolInsert()` called `deactivateIconPicker()` (disable-only) instead of `hideIconPicker()` (disable + hide overlay); also added `closePopup()` in SymbolPicker's `insertSymbol()` for non-inline consumers
- SymbolPicker stale search state on reopen — filter query and search input were not cleared when popup reopened or picker was re-enabled; added `resetFilterState()` helper called from `openPopup()` and `enable()`, refactored `switchMode()` to reuse it

### Added
- FileExplorer flat content panel mode — host-driven `setItems()`/`setBreadcrumb()` API for flat item arrays without tree sidebar; custom `FileExplorerColumn` definitions for detail view; `groupBy` option (`type-first`, `none`, or custom function); `showLoading()`/`showEmpty()` states; selection API (`selectItem`, `selectItems`, `deselectAll`, `getSelectedIds`); drag-and-drop with `onDragStart`/`onDrop`/`onExternalDrop` callbacks; dynamic context menu via function; `readOnly`/`isSystem` guards on rename/delete; `iconColor`, `typeLabel`, `owner` node fields; 15 CSS custom properties (`--file-explorer-*`) for host theming; Apps Team integration guide (`docs/fileexplorer-flat-mode-guide.md`); 38 tests
- DataGrid `sizeHint` column option (`xs`/`s`/`m`/`l`/`xl`) for semantic initial column sizing — resolves to `width` and `minWidth` (60/100/160/240/360px)

## 2026-04-05

### Added
- ExplorerPicker component (#110) — resource-selection widget with tree browsing, search, quick-access sections (recent/starred), ontology-driven icon resolution, virtual scrolling, keyboard navigation, state export/restore, chrome integration (82 tests)

### Fixed
- Chrome effects invisible in CDN-consuming apps — added CSS `var()` fallback values to all 99 chrome token references across 44 SCSS files; chrome now self-contained in each component CSS without requiring `custom.css`
- Edge shadow imperceptible at 7% opacity (17px contrast delta) — increased to 12% (29px delta, matching `--theme-shadow-sm`)
- Raw HTML inputs (`<input>`, `<textarea>`, `<select>`) without Bootstrap `.form-control` class now get hover glow via native element selectors
- Edge shadows invisible on Sidebar, TabbedPanel, Ruler in DockLayout — parent grid cells (`overflow: hidden`) clipped children's box-shadows; removed overflow from toolbar/left/right/bottom grid cells (components manage their own overflow). Also elevated contained-mode docked panels to `z-index: 1` and added `z-index: 1` to Ruler
- ExplorerPicker tree disabled in resource mode — container nodes were dimmed with pointer-events:none, blocking expand toggles; separated dimming from selectability
- ExplorerPicker missing from main demo index and full-demo pages

## 2026-03-29

### Added
- ContextMenu component (#104) — theme-aware right-click menu with icons, shortcuts, sub-menus, keyboard navigation, accessibility (43 tests)
- InlineToolbar component (#105) — compact toolbar that renders inside containers with icon buttons and toggles, 3 sizes (33 tests)
- StackLayout component (#106) — vertically/horizontally stacked collapsible panels with drag dividers, collapsed vertical strips (47 tests)
- GraphLegend component (#96) — collapsible legend panel for graph node/edge types (67 tests)
- GraphMinimap component (#97) — SVG minimap with viewport rectangle and click-to-pan (36 tests)
- 6 rich visual picker components (#98-#103): OrientationPicker, SizesPicker, MarginsPicker, ToolColorPicker, ColumnsPicker, SpacingPicker
- 15 Bootstrap 5 base component stencils for Layout Studio (Card, Button, Accordion, Modal, Nav, Alert, Badge, ListGroup, Table, Form, Pagination, Dropdown, Progress, Spinner, Toggle)
- Component Studio — live component playground with 117 components, device frames, trigger buttons, CodeEditor modal, multi-select, README help tab
- Layout Studio — Balsamiq-quality wireframe stencils for all 93+ components, clean/sketch render mode toggle
- Shape Studio — custom vector shapes with 14 tools, shape library
- Ribbon Studio — visual ribbon toolbar designer with file management and inline help
- Studio Apps section in README with localStorage warning
- CronPicker dropdown mode (`mode: "dropdown"`) — compact trigger button + popup panel
- SymbolPicker categories as dropdown with "All" option and cross-category search
- RibbonBuilder SymbolPicker rendered as modal dialog
- Help panels in all 4 studios (F1 toggle, context-sensitive documentation)
- 398 new tests in coverage pass (Ribbon 20→238, CronPicker 25→72, SymbolPicker 30→64, 6 pickers enhanced)

### Fixed
- Ribbon row-break now flushes stack for proper 2-column layout
- Ribbon custom control size property respected (ribbon-size-small/mini classes)
- Ribbon gallery control API convenience aliases (galleryItems, galleryColumns, onGallerySelect)
- Ribbon groups with empty labels collapse label area
- Ribbon custom control uses width (not minWidth) for consistent sizing
- All 5 dropdown pickers use position:fixed and append to document.body for ribbon overflow escape
- Dropdown panels use display:block (not empty string) for body-appended panels
- Picker triggers 22px height for ribbon mini mode
- wrap-iife.sh strips ALL export keywords (was missing export const/type/enum)
- DiagramEngine embed factory name lookup from registry (was generating wrong case)
- DiagramEngine embed container div gets unique ID for getElementById
- DiagramEngine setRenderStyle() for global clean/sketch mode switching
- Device frame shape names corrected (mobile-iphone, tablet-ipad, desktop-macos, dialog-modal)
- Studio app links work on CDN (copy-docs.sh rewrites studio/ paths)
- Component Studio CDN help path (README.md not index.html)
- DataGrid embed row format (id + data object, not flat)

### Changed
- Component count: 95 → 106
- Test count: 2476 → 3355
- Demo index updated to 106 components with Studio Apps section

## 2026-03-18

### Added
- MarkdownRenderer component — shared markdown rendering using marked with auto-detected extensions (highlight.js, KaTeX, Mermaid, Graphviz via @viz-js/viz WASM, PlantUML). HTML sanitised. Replaces Vditor for preview rendering in HelpDrawer and DocViewer. ADR-085
- ThemeToggle demo page with 5 sections: default/auto, dark, light, programmatic API, onChange callback

### Fixed
- First-open popup offset bug across 6 picker components (TimePicker, DatePicker, LineShapePicker, DurationPicker, TimezonePicker, MultiselectCombo) — set position:fixed before measuring in positionDropdown()
- DatePicker calendar max-width:340px to prevent stretching to full parent width
- SymbolPicker category bar scroll arrows — left/right buttons appear only when overflow exists

## 2026-03-17

### Added
- Extracted all 100 component demos into individual pages

### Fixed
- Demo extraction — isolated init scripts per component, eliminated cross-contamination
- Restored full 94-component demo page, kept card index as secondary nav
- Demo cards — disabled non-demo cards with 'coming soon' label, prevented 404s
- Demo shell — removed font-family:inherit that overrode Bootstrap's Inter font
- Demo cards — made non-demo cards clickable (was pointer-events: none)
- SymbolPicker — added max-height and overflow-y to panel for scrolling

### Changed
- Demo page refactored into multi-page structure

## 2026-03-16

### Added
- ActionItems component Phases 1-4 — core rendering, rich features, drag-drop, nesting, multi-select, filtering, sorting, clipboard (2,880 lines)
- ActionItems demo page, README, and knowledge base updates
- ActionItems PRD spec (720 lines, 13 sections)
- DiagramEngine Phase 1 rebuild — modular architecture, production quality
- DiagramEngine Phase 2 — extended shapes, draw/text tools, groups, clipboard, alignment
- DiagramEngine Phase 3 — connectors, routing, arrow markers, ConnectorTool
- DiagramEngine Phase 4 — pen/brush/measure tools, alignment and spacing guides
- DiagramEngine Phase 5 — flowchart, UML, BPMN, ER, network stencil packs
- DiagramEngine Phase 6 — templates, layouts, export, find/replace, graph analysis, comments
- DiagramEngine Phase 7 — comprehensive demo page
- DiagramEngine Phase 9 — Playwright test infrastructure + 45 test cases
- DiagramEngine page frames module — 35 predefined sizes across 7 categories, SVG rendering
- DiagramEngine connectors module — arrow markers, edge-to-edge routing, 4 path algorithms, labels
- Page Frames section added to DiagramEngine spec

### Fixed
- DiagramEngine tests — fixed SVG element selectors, all 67 tests pass
- DiagramEngine — 9 connection ports, edge-aware routing, pen tool UX
- ActionItems demo — passed container as first arg to createActionItems()

### Changed
- DiagramEngine Phase 8 — eliminated all as-any casts, proper class methods
- Deleted redundant engine-phase2.ts, updated knowledge base, standards check
- Updated knowledge base for DiagramEngine rebuild (concepts, decisions, history)

## 2026-03-15

### Added
- DiagramEngine component — universal vector canvas engine (~6600 lines TS), SVG-based rendering with 6 stencil packs, 8 interactive tools, alignment guides, undo/redo, layers, templates, graph analysis, comments, export. ADR-082
- DiagramEngine PRD spec (3,685 lines, 21 sections)
- DiagramEngine Phases 1-11 — document model, SVG renderer, tools, shapes, groups, clipboard, connectors, alignment guides, template engine, layout engine, rotation, inline text editing, pen/measure/brush tools, flowchart and UML stencil packs, demo page, BPMN/ER/network packs, control points, graph analysis, comments

### Fixed
- DiagramEngine — 17 bug fixes from quality audit
- DiagramEngine — fixed 8 demo bugs, added path shape, fixed hit testing

### Changed
- DiagramEngine — added JSDoc to 60+ public methods, updated knowledge base
- Deleted DiagramEngine prototype, prepared for production rebuild

## 2026-03-14

### Added
- FontDropdown Google Fonts integration — 48 curated Google Fonts + 15 system fonts (63 total) across 4 categories, lazy two-stage loading, category grouping. ADR-081
- DARKMODE.md with comprehensive dark mode component guidelines

### Fixed
- Dark mode round 4 — fixed 12 remaining component issues (GuidedTour, UserMenu, ProgressModal, AuditLogViewer, DocViewer, PropertyInspector)
- Dark mode round 5 — comprehensive fixes for GraphCanvasMx, DataTable, TreeView/TreeGrid, TabbedPanel, SpineMap, Sidebar, HelpDrawer, CommentOverlay, MarkdownEditor, DocViewer
- Bootstrap component specificity — moved card/list-group/dropdown/nav-tabs/accordion/modal/pagination dark overrides into class-scoped selectors. ADR-074
- npm audit — added undici >=7.24.1 override to fix 3 high-severity vulnerabilities. ADR-079
- Lighthouse performance — CSS/JS minification (cssnano, terser), font-display:swap, preconnect hints, defer scripts
- Lighthouse accessibility — fixed 17 components (DatePicker, AuditLogViewer, Ruler, HelpDrawer, SpineMap, TreeGrid, TabbedPanel, Tagger, PermissionMatrix, NotificationCenter, ColorPicker, EditableComboBox, TimePicker, ActivityFeed, DocViewer)

## 2026-03-13

### Added
- AnglePicker component — circular dial input with inline/dropdown modes, pointer drag, keyboard nav, tick marks, shadow preview, cardinal labels
- Mini size to AnglePicker and integrated with RibbonBuilder

### Fixed
- Centered AnglePicker input by removing conflicting inline position styles

### Changed
- Reworked LineShapePicker: 5 to 6 maxGraph-aligned shapes (straight, orthogonal, segment, manhattan, elbow, entity), rewrote SVG paths
- Reworked LineEndingPicker: 9 to 12 standard + 6 ER notation endings, showERNotation option, rewritten SVG markers
- Updated demo page for new line picker values

## 2026-03-12

### Fixed
- Dark mode bug fixes — migrated 20+ remaining component files to var(--theme-*) tokens. Canvas/SVG components use resolveThemeColor(). LogConsole refactored to design token resolution. ADR-073
- Dark mode comprehensive round 3 — ErrorDialog, EditableComboBox, 10 picker components, GraphCanvas/GraphCanvasMx, HelpDrawer, DocViewer, MarkdownEditor, Conversation MCP UI, DataGrid, global Bootstrap utility overrides. ADR-075

## 2026-03-11

### Added
- Dark mode Phase 2 — created _dark-mode.scss with 30+ semantic --theme-* CSS custom properties on :root and [data-bs-theme=dark] overrides. ADR-070
- ThemeToggle component — compact 3-state switcher (Light/Auto/Dark) with OS prefers-color-scheme auto-detection. ADR-072

### Changed
- Dark mode Phase 1 — light-first normalization: normalized 10 dark-bg elements, replaced white literals, parameterized intentional dark overlays. ADR-069
- Dark mode Phase 3 — migrated 60 component SCSS files from hardcoded colors to var(--theme-*) semantic tokens. ADR-071

## 2026-03-10

### Added
- Demo page TOC sidebar — searchable alphabetical Table of Contents with 95 implemented + 83 planned items, search/filter, scroll-spy. ADR-066, ADR-067
- Ribbon deferred state — pendingState queue so control state APIs work on lazily-rendered tabs, getControlState() API. ADR-065

### Fixed
- LineTypePicker — changed to return semantic names instead of SVG dash-array strings. ADR-068

## 2026-03-09

### Added
- RibbonBuilder SymbolPicker integration — persistent full-width icon picker, enabled/disabled via API, fallback to curated 62-icon picker. ADR-064

## 2026-03-08

### Added
- Mini size variant added to all 14 Ribbon-compatible components (22px height, $control-height-xs). ADR-059
- Ribbon custom control width property and size-based label positioning. ADR-062
- Slider component — range input with single/dual-thumb, pointer capture, keyboard nav, tick marks, vertical orientation (~600 lines TS). ADR-058
- SymbolPicker CSS auto-discovery — scans stylesheets for .bi-*/.fa-* selectors, discovers ~2000 Bootstrap Icons + Font Awesome support
- RibbonBuilder expanded from 6 to 14 component picker types

### Fixed
- Font-family: inherit enforced on all component roots for consistent Inter font theming. ADR-060
- Ribbon buildCustomControl() now renders label property. ADR-061
- Ribbon stack layout replaced with CSS grid + subgrid for cross-row alignment. ADR-063

## 2026-03-07

### Added
- RibbonBuilder component — visual WYSIWYG editor for Ribbon layouts via drag-and-drop, structure tree, property inspector, icon picker, exports Markdown/JSON (~2900 lines TS)
- LineWidthPicker component — visual dropdown for stroke width selection with CSS border previews (~610 lines TS). ADR-057
- LineTypePicker component — visual dropdown for dash pattern selection with inline SVG previews (~665 lines TS). ADR-057
- Ribbon statusBar slot — accepts HTMLElement or factory, right-aligned in tab bar

### Changed
- Visual consistency polish — switched Open Sans to Inter, added font weight/size tokens, standardized dialog padding, shadow elevation hierarchy, unified close button/menu item sizing. ADR-055, ADR-056

## 2026-03-06

### Added
- Ribbon statusBar slot — optional right-aligned HTMLElement or factory in tab bar with setStatusBar()/getStatusBarElement() methods

## 2026-03-05

### Added
- HelpDrawer, HelpTooltip, DocViewer, GuidedTour — 4 documentation and onboarding components. ADR-053, ADR-054

### Fixed
- GraphCanvasMx feature parity — mouse wheel zoom, left-button panning, tooltips, onNodeHover/onEdgeHover, zoom-to-fit, real group-by-namespace with swimlane vertices

## 2026-03-04

### Added
- TypeBadge component — inline chip/badge with icon, color, label, 3 sizes, 3 variants (~250 lines TS). ADR-049
- GraphCanvas component — interactive SVG graph with 5 layout algorithms, schema/instance modes, zoom/pan/selection/edge creation (~1800 lines TS). ADR-050
- RelationshipManager component — typed relationship CRUD panel with grouped list, AI suggestions (~900 lines TS). ADR-051
- GraphCanvasMx component — maxGraph-powered graph visualization with identical API to GraphCanvas (~400 lines TS). ADR-052

## 2026-03-03

### Fixed
- SpineMap code standards compliance — refactored 15 long functions into 30-line-max helpers, fixed Allman brace violations, fixed border-radius for pill shape

## 2026-03-01

### Added
- PeriodPicker component — coarse time-period selector with month/quarter/half/year granularities, grid layout, year navigation (~600 lines TS). ADR-046
- SprintPicker component — agile sprint selector with list and calendar views, 4 naming modes, 8-color cycling bands (~900 lines TS). ADR-047
- SpineMap configurable popover fields — field adapter pattern supporting 30+ field types with runtime fallback. ADR-048

## 2026-02-28

### Added
- SpineMap component — interactive SVG capability/feature map with 4 layout algorithms, cross-branch connections, 3 editing modes, export (~1700 lines TS). ADR-041
- Breadcrumb Navigation component — interactive path display with overflow truncation, per-item icons, terminal dropdown (~500 lines TS). ADR-042
- NotificationCenter component — bell trigger, slide-out panel, category filters, date grouping, dismiss, keyboard nav (~530 lines TS). ADR-043
- Stepper (Wizard) component — multi-stage progression with horizontal/vertical, async validation, completion bar (~430 lines TS). ADR-044
- PropertyInspector (Drawer) component — slide-out drawer with drag-to-resize, tabbed sections, optional backdrop (~490 lines TS). ADR-045
- ShareDialog onRemoveConfirm callback — optional async confirmation gate before removing access

### Fixed
- SpineMap bugs — popover clipping, sidebar resize, sidebar sync, add-child from sidebar, refactored long methods
- PeoplePicker dropdown not opening — added ensureDropdownVisible(), fixed FormDialog CSS containing-block trap
- PeoplePicker dropdown moved to document.body — fixes first-render mispositioning and CSS containing-block traps
- PeoplePicker dropdown z-index raised to 2050 for portal pattern in FormDialog/ShareDialog overlays
- Code standards cleanup — refactored long methods in PropertyInspector and Stepper

## 2026-02-27

### Added
- PersonChip component — compact inline person-identity chip with avatar, name, status dot, email/role detail, 3 sizes (~300 lines TS)
- PeoplePicker component — searchable person selector with PersonChip integration, async search, single/multi-select (~800 lines TS). ADR-037
- PresenceIndicator component — overlapping avatar stack with collapsed/expanded views, PersonChip bridge (~480 lines TS)
- ShareDialog component — modal share dialog composing PeoplePicker and PersonChip with access levels, diff computation, promise-based API. ADR-039

### Fixed
- Dropdown overflow fix — migrated 8 components from position:absolute to position:fixed to prevent clipping inside overflow:hidden containers. ADR-040

## 2026-02-26

### Added
- Pill component — reusable inline pill element for mentions, issues, tags with 6 color presets, 3 sizes, dismissible (~300 lines TS). ADR-034
- MarkdownEditor naked mode — chrome-free editable Vditor surface with CSS resize, form-control border
- RichTextInput component — lightweight contenteditable rich text with inline formatting, lists, paste sanitization, floating toolbar, STIE composition (~900 lines TS). ADR-035

## 2026-02-25

### Added
- SmartTextInput (STIE) component — behavioral middleware with trigger registry, state machine detector, token model, popover coordination (~2200 lines TS)
- MarkdownEditor display mode — chrome-free read-only rendering with no header/toolbar/tabs
- ColorPicker enhancements — onInput real-time callback, label option, getPopupElement(), enhanced disabled state
- MarkdownEditor display-mode enhancements — isolated, compact, theme dark, onReady callback
- Ribbon FontDropdown integration — custom control in Ribbon Font group demonstrating third-party picker hosting

### Fixed
- FontDropdown fixed positioning — position:fixed instead of position:absolute to escape overflow:hidden containers

## 2026-02-24

### Added
- Ribbon component — Microsoft Office-style tabbed toolbar with adaptive groups, QAT, menu bar, backstage, KeyTips, 13 control types
- FontDropdown component — dropdown picker rendering each font name in its own typeface, 17 web-safe defaults, search filtering, recently-used
- SymbolPicker component — grid-based picker for Unicode characters (~500) and Bootstrap Icons (~200), category tabs, search, preview panel

## 2026-02-23

### Added
- FormDialog component — modal dialog for form workflows with single-page and wizard modes, 12 field types, collapsible sections, resizable, validation, focus trapping (~1500 lines TS)

## 2026-02-21

### Added
- 8 layout container components — BoxLayout, FlowLayout, GridLayout, BorderLayout, FlexGridLayout, CardLayout, LayerLayout, AnchorLayout
- 5 new components — StatusBadge, ConfirmDialog, SearchBox, UserMenu, FileUpload
- AppLauncher component — grid-based launcher with dropdown/modal/fullpage views, favourites, recent apps, search (~950 lines TS)
- Toolbar checkbox, toggle switch, number spinner, and color picker input types
- Keyboard bindings audit — added overridable keyBindings to all 31 interactive components

### Fixed
- TabbedPanel and Sidebar not respecting collapsed:true at init
- DataGrid pagination footer rendering unstyled — moved flexbox to nav element, added three-zone layout

## 2026-02-20

### Added
- MaskedEntry component — masked input for sensitive data with show/hide toggle, clipboard copy (~500 lines TS)
- Toast notification system — transient notifications with stacking, auto-dismiss, severity variants, action buttons (~550 lines TS)
- SkeletonLoader component — animated placeholder with CSS shimmer, 6 presets (~300 lines TS)
- EmptyState component — centered placeholder for empty views with CTA (~350 lines TS)
- ColorPicker component — canvas-based colour selection with hue/opacity, hex/RGB/HSL, swatches (~900 lines TS)
- SplitLayout component — draggable resizable split pane container with nested layouts, persistence (~800 lines TS)
- MultiselectCombo component — multi-select combo box with chips, checkboxes, filtering, grouping (~900 lines TS)
- DataGrid component — high-performance flat data table with sorting, filtering, pagination, virtual scrolling (~2400 lines TS)
- CodeEditor component — Bootstrap 5-themed CodeMirror 6 wrapper with toolbar, themes, fallback (~1100 lines TS)
- Tagger component — combined freeform and taxonomy tag input with colored chips, autocomplete (~750 lines TS)
- FacetSearch component — facet-aware search bar with structured key:value parsing, facet chips (~750 lines TS)
- FileExplorer component — two-pane file navigation with folder tree, breadcrumbs, 3 view modes (~1100 lines TS)
- CommentOverlay component — transparent annotation overlay with pins, threaded comments, @mentions (~1500 lines TS)
- ReasoningAccordion component — collapsible accordion for AI chain-of-thought with status states, shimmer, timing (~650 lines TS)
- CommandPalette component — singleton Ctrl+K/Cmd+K omnibar with fuzzy search, categories, recents (~600 lines TS)
- PromptTemplateManager component — two-pane CRUD interface for prompt templates with variable extraction, preview, import/export
- WorkspaceSwitcher component — multi-tenant workspace switcher with trigger button, searchable dropdown/modal
- ActivityFeed component — social-style activity feed with date grouping, infinite scroll, 7 event types
- AuditLogViewer component — read-only filterable audit log with severity badges, expandable detail rows, CSV/JSON export
- PermissionMatrix component — RBAC permission matrix with tri-state checkboxes, inheritance resolution, change tracking
- GraphToolbar extension — factory function wrapping Toolbar for graph editing (undo/redo/delete, layout, zoom, export)
- 21 component PRD specs across 5 tiers + GraphToolbar extension. ADR-028 through ADR-032

### Changed
- KEYBOARD.md created — comprehensive keyboard shortcut registry for all components

## 2026-02-19

### Changed
- Sidebar maxWidth changed from fixed 600px to viewport-relative cap (50% of window width)
- TabbedPanel title resolution via resolveTitle() helper — returns explicit title, active tab title, or default

## 2026-02-18

### Fixed
- 6 toolbar demo bugs — portaled gallery popups and split menus to escape overflow:hidden, bumped popup z-index to 1060, fixed orientation toggle with closeAllPopups()/rebuildRegionsDOM()

## 2026-02-17

### Added
- LogConsole component — in-app logging console with 5 log levels, dark/light themes, rAF-batched rendering, FIFO eviction
- Toolbar enhancements — title width, left/right alignment, rightContent slot, 3 new item types (Input, Dropdown, Label). ADR-026

### Fixed
- DockLayout mountComponent — hide() before show(cell) for already-visible components
- Toolbar overflow algorithm — replaced tool-width-only measurement with full child-size summation, added dual per-group overflow buttons

## 2026-02-16

### Added
- DockLayout component — CSS Grid layout coordinator with 6 named areas, auto-contained child mounting. ADR-024, ADR-025
- Contained mode added to Sidebar, Toolbar, StatusBar, TabbedPanel, BannerBar, and MarkdownEditor

### Fixed
- TreeGrid critical bugs — deepCopyOptions, column resize, column picker, cell editor sizing, sort preserving widths, type-aware sort, per-column comparator, externalSort, updateColumn() API. ADR-022, ADR-023

## 2026-02-15

### Added
- TabbedPanel component — dockable, collapsible tabbed panel with dynamic tabs, drag-to-dock, pointer-capture resize. ADR-018
- TreeView component — highly configurable tree view with lazy loading, multi-select, DnD, context menu, inline rename, search, starred, sort, WAI-ARIA. ADR-019
- TreeView performance optimization — O(1) node index maps, virtual scrolling with element recycling, incremental DOM updates, three-tier search. ADR-020

## 2026-02-13

### Added
- Timeline component — horizontal event timeline with point/span events, row packing, grouping, IntersectionObserver, adaptive ticks. ADR-016
- Timeline refinements — configurable IANA timezone, configurable tick intervals, drag-to-pan
- Conversation MCP Apps specification — sandboxed iframe rendering with JSON-RPC bridge, canvas side panel, 4 demo scenarios. ADR-017

## 2026-02-12

### Added
- StatusBar component — fixed-bottom viewport status bar with configurable regions, pipe dividers, O(1) updates
- Sidebar component — dockable, floatable, resizable panel with tab grouping, collapse-to-icon-strip, SidebarManager singleton
- BannerBar component — fixed-to-top viewport banner with severity presets, auto-dismiss, CSS custom property
- Toolbar component — programmable action bar with regions, split buttons, docked/floating modes, KeyTips, Priority+ overflow. ADR-013
- Gauge component — visual measure with tile/ring/bar shapes, value/time modes, colour thresholds, ARIA. ADR-014
- Conversation component — turn-by-turn AI chat UI with Vditor rendering, streaming, session management, feedback. ADR-015
- TreeGrid component — tree-table hybrid with inline editing, column resize/reorder/sort, 2D keyboard nav, virtual scrolling. ADR-021

## 2026-02-11

### Added
- TimezonePicker component — searchable IANA timezone dropdown with live time preview
- CronPicker component — visual 6-field CRON expression builder with presets and description generator
- MarkdownEditor component — Vditor-based Bootstrap 5 Markdown editor with tab/side-by-side modes, GFM/Mermaid/Graphviz/PlantUML support

## 2026-02-10

### Added
- EditableComboBox component — combined text input and dropdown with filtering, keyboard navigation, WAI-ARIA combobox pattern, grouping, size variants

## 2026-02-09

### Added
- ErrorDialog component — vanilla TypeScript modal for literate errors with suggestion box, technical accordion, clipboard copy, retry
- Documentation system — auto-generation script, DESIGN_TOKENS, COMPONENT_REFERENCE, AGENT_QUICK_REF, Getting Started, Font Guide, Custom Classes

### Changed
- Rewrote 10 instruction files to align with Bootstrap theme scope; removed C#/.NET, Python, React, database content
- Added semantic markers to all source files, created knowledge base
- Changed body font from Rubik/Atkinson Hyperlegible to Open Sans, monospace to JetBrains Mono

## 2025-01-15

### Changed
- Changed primary font to Atkinson Hyperlegible from Google Fonts for accessibility
- Reduced base font to 14px, base spacer to 0.75rem, removed all border radius

## 2025-01-01

### Added
- Created Bootstrap 5 theme with compact spacing, enterprise colour palette, and zero border radius
