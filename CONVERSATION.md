<!-- AGENT: Running log of agent interactions and changes for organisational memory. -->

# Conversation Log

## 2026-03-12/13 — Dark Mode Bug Fix Rounds 1-3

**Context:** Resumed from an interrupted session. Dark mode Phases 1-4 (token system, component migration, ThemeToggle widget, demo integration) were already complete.

### Round 1 — Hardcoded Colour Cleanup (commit 7ba9489, ADR-073)

Migrated 20+ components from hardcoded `$gray-*`/hex colours to `var(--theme-*)` tokens:

- DataGrid, Conversation, DocViewer, PropertyInspector, GraphCanvas/GraphCanvasMx, PermissionMatrix, RibbonBuilder, LineWidthPicker, LineEndingPicker, LineShapePicker, LogConsole, Ruler, SkeletonLoader, MaskedEntry, PeoplePicker, UserMenu, PresenceIndicator
- Introduced `resolveThemeColor()` helper for canvas/SVG components that need runtime CSS custom property resolution via `getComputedStyle()`
- LogConsole refactored from parallel `THEME_DARK`/`THEME_LIGHT` constants to design token resolution
- New tokens: `--theme-primary`, `--theme-primary-hover`, `--theme-primary-rgb`, `--theme-success`, `--theme-warning`, `--theme-danger`, `--theme-danger-rgb`, `--theme-input-*`, `--theme-focus-border`
- Bootstrap heading overrides: `--bs-card-title-color`, `--bs-card-subtitle-color`, `--bs-heading-color`

### Round 2 — Bootstrap CSS Custom Property Specificity Fix (commit 3b9ec5c, ADR-074)

Discovered that Bootstrap 5 sets CSS custom properties (e.g. `--bs-card-bg`) on class selectors (`.card`), not on `:root`. Dark-mode overrides on `[data-bs-theme="dark"]` at the `<html>` level lost the specificity battle.

**Fix:** Moved all Bootstrap component dark overrides into class-scoped selectors: `[data-bs-theme="dark"] .card { ... }`. Applied to `.card`, `.list-group`, `.dropdown-menu`, `.pagination`, `.nav-link`, `.nav-pills`, `.nav-tabs`, `.accordion`, `.modal`.

Additional migrations:
- RichTextInput, MultiselectCombo, PeoplePicker — from Bootstrap `$input-bg` to `var(--theme-input-bg)`
- DataGrid, DocViewer, PropertyInspector — explicit dark colours for cells/content/body
- PersonChip — text colour fix for PresenceIndicator context

### Round 3 — Pickers, Rich Content, Utility Overrides (commit bd0c75c, ADR-075)

- **10 picker components** — migrated from Bootstrap `$dropdown-*` compile-time vars to `var(--theme-*)` runtime tokens (EditableComboBox, ColorPicker, DatePicker, TimePicker, TimezonePicker, DurationPicker, CronPicker, FontDropdown, SymbolPicker, LineTypePicker)
- **ErrorDialog** — removed hardcoded Bootstrap utility classes (`text-dark`, `alert-light`) from TypeScript that forced light appearance
- **GraphCanvas** — added `--theme-group-bg-1..5` tokens for namespace group backgrounds with dark mode `rgba()` overrides
- **Rich content styling** — HelpDrawer, DocViewer, MarkdownEditor: explicit dark-mode-aware styles for tables, code blocks, `<pre>`, blockquotes
- **Conversation MCP UI** — overrides for injected HTML using Bootstrap utility classes (`.card`, `.bg-light`, `.text-dark`)
- **DataGrid** — full dark override set covering header, cells, striped rows, footer, pagination
- **Global Bootstrap utility overrides** — `.btn-outline-secondary`, `.btn-close` (filter invert), `.text-muted`, `.bg-light`, `.bg-white`, `.text-dark`, icon colour inheritance

### Files Modified

**TypeScript:**
- `components/errordialog/errordialog.ts` — removed hardcoded utility classes
- `components/graphcanvas/graphcanvas.ts`, `components/graphcanvasmx/graphcanvasmx.ts` — resolveThemeColor
- `components/logconsole/logconsole.ts` — design token resolution
- `components/ruler/ruler.ts` — resolveThemeColor

**SCSS:**
- `src/scss/_dark-mode.scss` — Bootstrap specificity fixes, global utility overrides
- `src/scss/custom.scss` — token additions
- 30+ component SCSS files across all three rounds

**Demo:**
- `demo/index.html`

### Knowledge Base Updated
- `agentknowledge/decisions.yaml` — ADR-073, ADR-074, ADR-075
- `agentknowledge/concepts.yaml` — updated DarkModeTokens, DarkModeComponentMigration
- `agentknowledge/entities.yaml` — added resolveThemeColor
- `agentknowledge/history.jsonl`

**Build:** Zero errors throughout all three rounds. Components: 91 built.

## 2026-03-13 — Line Picker maxGraph Alignment (commit 668b7e9, ADR-076)

Apps team reported that LineShapePicker and LineEndingPicker returned CDN values with no direct maxGraph equivalents, requiring brittle translation layers. Spec: `specs/2026-03-11-line-picker-maxgraph-alignment.md`.

### LineShapePicker
Replaced 5 entries (straight, curved, bezier, spline, orthogonal) with 6 maxGraph-aligned shapes:
- `straight` — no edgeStyle (direct line)
- `orthogonal` — orthogonalEdgeStyle with rounded corners
- `segment` — segmentEdgeStyle with curved waypoints (Bezier)
- `manhattan` — manhattanEdgeStyle (shortest orthogonal path)
- `elbow` — elbowEdgeStyle (single-elbow connector)
- `entity` — entityRelationEdgeStyle (ER-diagram midpoint turn)

Rewrote `buildShapePath()` with 5 new SVG helper functions. Updated README.

### LineEndingPicker
Replaced 9 entries with 12 standard maxGraph types + 6 ER notation types:
- **Standard:** none, block, block-open, classic, classic-open, open, diamond, diamond-open, oval, oval-open, dash, cross
- **ER Notation** (behind `showERNotation` option): er-one, er-mandatory-one, er-many, er-one-to-many, er-zero-to-one, er-zero-to-many

Added group separator rendering, `createStandardMarker()`/`createERMarker()` helpers. Updated SCSS and README.

No backward compatibility shim — apps team removing tolerant converters.

### Files Modified
- `components/lineshapepicker/lineshapepicker.ts`, `README.md`
- `components/lineendingpicker/lineendingpicker.ts`, `.scss`, `README.md`
- `demo/index.html` — updated values, added ER notation demo column

## 2026-03-13 — AnglePicker Component (commits 4a07fb4, c6c58f7, ADR-077)

New circular dial input component for angle selection (0-360°). Primary use case: drop shadow angle in Diagrams app.

### Features
- **Inline + dropdown modes** — inline for property panels, dropdown for toolbars
- **SVG-based dial** — track circle, 24 tick marks (major/semi-major/minor at 15° intervals), needle, draggable knob
- **Pointer drag** — `setPointerCapture` for reliable tracking, Shift+drag snaps to `snapStep` (default 15°)
- **Keyboard navigation** — arrows ±1° (Shift ±15°), Home/End jump to 0°/359°, Escape closes dropdown
- **Editable center input** — shows angle with ° suffix, focus selects text, blur/Enter commits
- **Optional shadow preview** (`showPreview`) — live CSS `box-shadow` at selected angle
- **Optional tick labels** (`tickLabels`) — "degrees" (0°/90°/180°/270°) or "compass" (E/N/W/S)
- **Three sizes** — sm (80px), md (120px), lg (160px)
- **Dark mode** — all colours via `var(--theme-*)` tokens
- **ARIA** — `role="slider"`, `aria-valuenow/min/max`, `aria-label`
- **Standards compliant** — all functions ≤30 lines, Allman braces, semantic markers

### Files Created
- `components/anglepicker/anglepicker.ts` (1005 lines)
- `components/anglepicker/anglepicker.scss`
- `components/anglepicker/README.md`
- `specs/anglepicker.md`

### Bug Fix
- Center input was offset northwest — TS `positionCenterInput()` set explicit px values overriding SCSS `translate(-50%, -50%)` centering. Fixed by removing inline position styles.

### Knowledge Base Updated
- `agentknowledge/decisions.yaml` — ADR-076 (line pickers), ADR-077 (AnglePicker)
- `agentknowledge/history.jsonl`
- `MASTER_COMPONENT_LIST.md` — added §3.9 Angle Picker
- `COMPONENT_INDEX.md`, `COMPONENT_REFERENCE.md` — auto-generated

**Build:** Zero errors. Components: 92 built.

## 2026-03-14 — Dark Mode Round 4 (Final)

**Request:** Fix 12 remaining dark mode issues reported via screenshots, then create DARKMODE.md.

### Component SCSS Fixes
1. **GuidedTour** — Replaced hardcoded `$gray-*` with `var(--theme-*)` tokens for popover, header, body, footer.
2. **UserMenu** — Converted all 10+ hardcoded gray references to theme tokens (trigger, dropdown items, dividers, header, status dot, chevron).
3. **ProgressModal** — Replaced `$card-bg`, `$card-border-color`, `$progress-bg`, `$modal-header-border-color` with theme tokens.
4. **AuditLogViewer** — Severity badges: `$gray-100` bg → `var(--theme-surface-raised-bg)`, colors → `var(--theme-*)` status tokens.
5. **DocViewer** — TOC title and outline title: `--theme-text-muted` → `--theme-text-secondary` for better dark-mode contrast.
6. **PropertyInspector** — Control buttons (close, collapse, popout): `--theme-text-muted` → `--theme-text-secondary`.

### Central Overrides (`_dark-mode.scss`)
7. **Ribbon** — `--ribbon-control-active-bg` → `rgba($blue-400, 0.2)` (was light `$blue-100`).
8. **GraphCanvas/GraphCanvasMx** — SVG text fill overrides for `.gc-node text` and `.gcmx-container svg text`.
9. **DataTable** — `.table-enterprise` explicit tbody striping with theme tokens.
10. **LogConsole** — Override inline styles with `!important` for dark backgrounds.
11. **Vditor/Markdown tables** — Force transparent `td` backgrounds and themed text.
12. **Universal controls** — `.propertyinspector-action-btn`, `.docklayout-close` etc. → `--theme-text-secondary`.

### New Files
- **DARKMODE.md** — Comprehensive dark mode guidelines: token reference, Bootstrap specificity rules, SVG/canvas colour resolution, testing checklist, common mistakes.
- **AGENTS.md** — Added `(CRITICAL)` reference to DARKMODE.md.

### Knowledge Base Updated
- `agentknowledge/decisions.yaml` — ADR-078
- `agentknowledge/history.jsonl`
- `agentknowledge/concepts.yaml` — DarkModeGuidelines concept

**Build:** Zero errors. Components: 92 built.

## 2026-03-14 — NPM Audit Fix, Lighthouse Fixes, Dark Mode Round 5, FontDropdown Google Fonts

### A) NPM Audit Fix (ADR-079)

Fixed 3 high-severity npm audit vulnerabilities in wrangler's transitive dependency `undici`. Added `"overrides": { "undici": ">=7.24.1" }` to package.json instead of running `npm audit fix --force` (which would upgrade wrangler to an incompatible major version). Removed `npm audit fix --force` from build.sh.

### B) Lighthouse Performance & Accessibility Fixes

**Performance/Build Pipeline:**
- Added cssnano for CSS minification (postcss.config.js + component CSS minification script)
- Added terser for JS minification (scripts/minify-js.sh)
- Added `font-display: swap` to bootstrap-icons font
- Demo page: meta description, preconnect hints, defer on scripts, touch targets 48px, heading hierarchy (h5 to h3.h5), link underlines

**Accessibility (17 components fixed):**
- DatePicker: `role="combobox"` + `aria-label`
- AuditLogViewer: `role="rowgroup"` wrappers
- Ruler: `role="img"`
- HelpDrawer: `role="separator"` with value attributes on resize handle
- SpineMap: `aria-value*` attributes on separator
- TreeGrid: `role="rowgroup"` + `role="columnheader"`
- TabbedPanel: `role="presentation"` on actions wrapper
- Tagger: removed invalid `role="listitem"`
- PermissionMatrix: `aria-label` on icon-only buttons
- NotificationCenter: fixed `aria-label` to match visible text
- ColorPicker: dynamic `aria-label`
- EditableComboBox: `aria-label` from placeholder
- TimePicker: `aria-label="Time"`
- Contrast: improved dark mode `--theme-text-muted` to `$gray-400`
- Link underlines: `$link-decoration` to underline, ActivityFeed
- DocViewer: changed nav from `<a>` to `<button>`

### C) Dark Mode Round 5 — Comprehensive Fixes (ADR-080)

**Component-level fixes:**
- GraphCanvasMx: `fillOpacity:15` instead of broken `hexWithAlpha`, added theme observer
- DataTable: Bootstrap `.table-striped` CSS var overrides with matching specificity
- TreeView/TreeGrid: icons changed from `$gray-600` to `var(--theme-text-secondary)`
- TabbedPanel: tab titles and controls use `--theme-text-secondary`
- SpineMap: `resolveThemeColor()` + MutationObserver, SCSS dark overrides
- Sidebar, HelpDrawer, CommentOverlay, MarkdownEditor: control buttons upgraded from `--theme-text-muted` to `--theme-text-secondary`
- DocViewer: prev/next button styling with theme-aware background/hover

**Vditor table fix (root cause found after 8+ attempts):**
- Root cause: Vditor CSS sets `background-color` on `<tr>` elements, not `<td>`. All previous fixes targeted td/th/thead but never tr.
- Fix: Added `tr`/`tr:nth-child(2n)` overrides in `_dark-mode.scss` + `fixRenderedTableStyles()` JS post-render function targeting tr elements
- Conversation: `mode:"light"` hardcoded replaced with data-bs-theme detection + re-render on theme change
- HelpDrawer: `mode:"light"` hardcoded replaced with same fix
- MarkdownEditor: `theme:"classic"` hardcoded + `mode:"light"` in side-by-side preview replaced with theme detection
- MCP iframe: Enhanced `buildThemeStyleBlock()` with table-aware CSS injection

### D) FontDropdown Google Fonts Integration (ADR-081)

Extended FontDropdown with curated Google Fonts support:
- Extended `FontItem` interface with `category` and `googleFont` fields
- 48 curated Google Fonts + 15 system fonts = 63 total
- Categories: Sans Serif (24), Serif (16), Monospace (11), Display (12)
- Lazy two-stage loading: preview subset on dropdown open, full weights on selection
- Category grouping with headers via `groupByCategory` option
- Backward compatible -- custom fonts array still works

### Files Modified

**TypeScript:** fontdropdown, graphcanvasmx, spinemap, helpdrawer, markdowneditor, conversation, datepicker, auditlogviewer, ruler, treegrid, tabbedpanel, tagger, permissionmatrix, notificationcenter, colorpicker, editablecombobox, timepicker, docviewer

**SCSS:** _dark-mode.scss, _variables.scss, treeview, treegrid, tabbedpanel, spinemap, sidebar, helpdrawer, commentoverlay, markdowneditor, docviewer, activityfeed, fontdropdown

**Build/Config:** package.json, build.sh, postcss.config.js, scripts/minify-js.sh

**Demo:** demo/index.html

### Knowledge Base Updated
- `agentknowledge/decisions.yaml` — ADR-079, ADR-080, ADR-081
- `agentknowledge/concepts.yaml` — FontDropdown updated, GoogleFontsIntegration added
- `agentknowledge/history.jsonl`

**Build:** Zero errors. Components: 92 built.

## 2026-03-15 — DiagramEngine Knowledge Base & Markers

### A) Knowledge Base Updates

Updated knowledge base for DiagramEngine component:
- `agentknowledge/concepts.yaml` — Added DiagramEngine and DiagramEngineStyles concept entries
- `agentknowledge/decisions.yaml` — Added ADR-082 documenting architecture decisions (semantic/presentation split, SVG rendering, ShapeRegistry, 8 tools, 6 stencil packs, template engine, graph analysis, dark mode)
- `agentknowledge/history.jsonl` — Appended entries for DiagramEngine implementation and markers pass
- `COMPONENT_INDEX.md` — Already contains DiagramEngine entry (verified)

### B) DiagramEngine Semantic Markers & JSDoc

Added to `components/diagramengine/diagramengine.ts`:
- Section separators already present for all 19 sections (S1-S19) with descriptive titles
- Added JSDoc comments on all public methods of DiagramEngineImpl (60+ methods across Document, Objects, Connectors, Selection, Viewport, Z-ordering, Grouping, Flip, Rotation, Clipboard, Alignment, Layers, History, Tools, Stencils, Persistence, Layout, Export, Find/Replace, Format Painter, Spatial Queries, Control Points, Boolean Operations, Comments, Deep Linking, Events, Lifecycle categories)
- Verified LOG_PREFIX = "[DiagramEngine]" used consistently in console.log, console.warn, console.error, Error messages, and safeCallback error handler

### Files Modified
- `components/diagramengine/diagramengine.ts` — JSDoc comments on public API
- `agentknowledge/concepts.yaml` — DiagramEngine, DiagramEngineStyles
- `agentknowledge/decisions.yaml` — ADR-082
- `agentknowledge/history.jsonl` — 2 entries
- `CONVERSATION.md` — this section
