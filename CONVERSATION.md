<!-- AGENT: Running log of agent interactions and changes for organisational memory. -->

# Conversation Log

## 2026-03-18 — Bug Fixes, MarkdownRenderer, ThemeToggle Demo

### Popup Offset Bug Fix (6 components)
Fixed first-open popup offset in timepicker, datepicker, lineshapepicker, durationpicker, timezonepicker, multiselectcombo. Root cause: `getBoundingClientRect()` called before `position: fixed`, so dropdown inflated wrapper height. Fix: set `position: fixed` before measuring.

### DatePicker Width Fix
Added `max-width: 340px` to `.datepicker-calendar` to prevent calendar from stretching full-width.

### SymbolPicker Scroll Arrows
Added left/right scroll arrow buttons to category bar. Arrows appear only when overflow exists.

### MarkdownRenderer Component (ADR-085)
Replaced Vditor with shared MarkdownRenderer for preview rendering in HelpDrawer and DocViewer. Vditor injected CSS fonts that could not be overridden. New approach uses marked + auto-detected extensions: highlight.js (code), KaTeX (math), Mermaid (diagrams), @viz-js/viz (Graphviz/dot, client-side WASM), PlantUML (configurable server URL). HTML sanitised. Vditor retained only for MarkdownEditor (full editing).

### ThemeToggle Demo Page
Created `demo/components/themetoggle.html` with 5 sections. Enabled card in demo index.

---

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

## 2026-03-16 — DiagramEngine Modular Rebuild & Knowledge Base Update

### A) Knowledge Base Updates for DiagramEngine Rebuild

Updated all knowledge base files to reflect the modular multi-file architecture:

- **`agentknowledge/concepts.yaml`** — Updated DiagramEngine entry: 25 modules, 20,125 lines, 37 shapes, 35 page frame sizes, concatenation-based build. Updated DiagramEngineStyles to mention page frame overlays.
- **`agentknowledge/decisions.yaml`** — Added ADR-083: modular rebuild architecture (concatenation-based multi-file build, 15-point architecture description covering all module responsibilities).
- **`agentknowledge/history.jsonl`** — Appended 5 entries: modular rebuild, page frames module, connectors module, knowledge base update, standards check.
- **`COMPONENT_INDEX.md`** — Updated DiagramEngine description with current stats (25 modules, 20K+ lines, 37 shapes, 8 tools, 35 page frame presets).

### B) Standards Check

Reviewed three key source files for Allman brace style and JSDoc coverage:

1. **`engine.ts`** (4,130 lines) — Found one issue: orphaned JSDoc comment for `panCanvas()` was displaced above `getShapeDef()` at line 576. Fixed by removing the stray JSDoc and attaching it to the actual `panCanvas()` method at line 605. All other public methods have correct JSDoc.

2. **`connectors.ts`** (909 lines) — Fully compliant. Allman braces throughout. JSDoc on all 18 exported and private functions with `@param`/`@returns` tags. Semantic markers and section separators present.

3. **`page-frames.ts`** (562 lines) — Fully compliant. Allman braces throughout. JSDoc on all 15 exported and private functions. Semantic markers present. Constants documented.

### DiagramEngine Stats Summary
- **25 source modules** in `components/diagramengine/src/`
- **20,125 total lines** TypeScript
- **37 registered shapes** across 5 stencil packs (basic 5, extended 11, flowchart 7, UML 5, network/BPMN/ER 9)
- **8 interactive tools** (select, pan, draw, text, connect, pen, measure, brush)
- **35 page frame presets** across 7 categories (Paper, Cards, Photo, Presentation, Social, Mobile, Screen)
- **4 margin presets** (normal, narrow, wide, none)
- **4 routing algorithms** (straight, orthogonal, curved, manhattan)
- **7 arrow marker types** (block, classic, open, diamond, oval, dash, cross)

**Build:** Components: 93 built.

## 2026-03-22 — DiagramEngine Embed System

Completed Phases 1-6 of the Embeddable Components & Mockup System for DiagramEngine:
- Embed infrastructure enabling any component to be rendered as a DiagramEngine shape
- Enterprise Theme Embed Pack (93 components registered as embeddable shapes)
- Device Frame Stencils: 12 shapes for mobile, tablet, desktop, and dialog frames
- Spatial Containment system for nesting embedded components within frames
- UI Component Stencils: 93 shapes representing all built components
- Additional page frame presets for mockup design

## 2026-03-23 — Studio Apps + Rich Pickers

### Studio Applications
- **Ribbon Studio** — visual ribbon toolbar designer with file management and inline help
- **Layout Studio** — Balsamiq-quality wireframe stencils for all 93+ components
- **Shape Studio** — custom vector shapes with 14 tools, shape library
- **Component Studio** — live component playground with device frames and trigger buttons

### Rich Visual Picker Components (#98-#103)
- OrientationPicker, SizesPicker, MarginsPicker, ToolColorPicker, ColumnsPicker, SpacingPicker
- All pickers use position:fixed dropdown appended to document.body for ribbon overflow escape

### Other Enhancements
- CronPicker dropdown mode (`mode: "dropdown"`) with compact trigger button + popup panel
- SymbolPicker categories as dropdown with "All" option and cross-category search
- Ribbon layout fixes: size, row-break, gallery API, empty label collapse, custom control width

## 2026-03-24 — Graph Components

- **GraphLegend** (#96) — collapsible legend panel showing color/icon/shape key for graph node types and edge types (67 tests)
- **GraphMinimap** (#97) — SVG minimap with viewport rectangle and click-to-pan (36 tests)
- 15 Bootstrap 5 base component stencils for Layout Studio (Card, Button, Accordion, Modal, Nav, Alert, Badge, ListGroup, Table, Form, Pagination, Dropdown, Progress, Spinner, Toggle)

## 2026-03-25-27 — Component Studio + Pickers

- Component Studio rewrite: 117 components, device frames, trigger buttons, CodeEditor modal, multi-select, README help tab
- All picker dropdown fixes: position:fixed, display:block, body-append for reliable positioning
- Help documentation across all 4 studios (F1 toggle, context-sensitive)
- 398 new tests in coverage pass (Ribbon 20 to 238, CronPicker 25 to 72, SymbolPicker 30 to 64, 6 pickers enhanced)

## 2026-03-28 — New Components

- **ContextMenu** (#104) — theme-aware right-click menu with icons, shortcuts, sub-menus, keyboard navigation, accessibility (43 tests)
- **InlineToolbar** (#105) — compact toolbar that renders inside containers with icon buttons and toggles, 3 sizes (33 tests)
- **StackLayout** (#106) — vertically/horizontally stacked collapsible panels with drag dividers, collapsed vertical strips (47 tests)
- StackLayout horizontal orientation with collapsed vertical strips for sidebar-like layouts

## 2026-03-29 — Quality Audit

### Phase 1-2 (earlier session)
- Copyright headers on 120+ demo files, 7 scripts
- Copyright banners on all compiled JS and CSS outputs
- Security review (33 innerHTML usages verified safe)
- Structured logging format
- CHANGELOG.md update

### Phase 3-5 (this session)
- Updated CONVERSATION.md with summaries for 2026-03-22 through 2026-03-29
- Code style compliance scan on 12 recent components:
  - No tab characters found (all spaces)
  - No Allman brace violations found
  - Refactored `bindSingleDivider()` in StackLayout from 39 lines to 29 lines (extracted `beginDividerDrag()`)
- Documentation accuracy fixes in README.md:
  - Test count badge: 2957 to 3355
  - Component count in description: 95 to 106
  - Component count in project structure: 94 to 106
- Verified COMPONENT_INDEX.md: 106 entries matching 106 component directories
- Verified COMPONENT_REFERENCE.md: 106 component sections with all new components present
- CDN URL verified correct: `https://theme.priyavijai-kalyan2007.workers.dev/`

**Build:** Components: 106 built. Tests: 3,355.

## 2026-03-30 — Structured Logging, Studio Fixes, Layout Studio Tabbed Help

### A) Structured Logging Migration (ADR-093)

Migrated all 4 studio apps and demo infrastructure from raw `console.log(LOG, ...)` to structured logging via LogUtility helpers (`logInfo`, `logWarn`, `logError`, `logDebug`, `logTrace`):

- **Component Studio** (`demo/studio/component-studio.html`)
- **Ribbon Studio** (`demo/studio/ribbon-studio.html`)
- **Shape Studio** (`demo/studio/shape-studio.html`)
- **Layout Studio** (`demo/studio/layout-studio.html`)
- **studio-storage.js** (`demo/studio/studio-storage.js`)
- **demo-shell.js** (`demo/shared/demo-shell.js`)

Each file now has `LOG_PREFIX`, `_lu` LogUtility integration, and local helper functions delegating to LogUtility. ADR-004 (direct console.* for library components) remains valid; ADR-093 extends structured logging to demo/studio code.

### B) Shape Studio Bug Fix

Moved `TOOL_HELP` object definition before its first usage. The object was defined after code that referenced it, and JavaScript `var` hoisting made the variable available but `undefined`, causing `Cannot read properties of undefined` crash.

### C) Component Studio Bug Fixes

- Fixed `findComponentEntry` to `findEntry` reference bug in README loading — the function was renamed but one call site was not updated.
- Verified frame z-index layering: frames render at z-index 0, components at z-index 10.

### D) Layout Studio Tabbed Help

Replaced the old collapsible help section with a tabbed model (Properties / Help tabs) matching Component Studio's pattern:

- Properties tab shows the existing property inspector panel
- Help tab fetches and renders `README.md` inline using `marked`/`createMarkdownRenderer`
- Added `marked` CDN script dependency

### Knowledge Base Updated
- `agentknowledge/history.jsonl` — 4 entries for structured logging, Shape Studio fix, Component Studio fixes, Layout Studio tabbed help
- `agentknowledge/decisions.yaml` — ADR-093 (structured logging in studios)
- `CONVERSATION.md` — this section

## 2026-04-01 — VisualTableEditor Component

### VisualTableEditor (#107) (ADR-094)

New visual-first embeddable table component for editing and viewing cell-styled tabular data. Distinct from DataGrid (which targets data management with sorting/filtering/pagination) — VisualTableEditor is analogous to table widgets in PowerPoint, Figma, draw.io, or Notion.

### Features
- **Per-cell styling** — background, colour, font, bold/italic/underline, alignment (horizontal + vertical), wrapping, padding
- **Inline rich content** — mixed formatting within cells via VisualTableCellContent segments (text, links, images)
- **Cell merging** — colspan/rowspan with merge/unmerge via API and context menu
- **6 presets** — blue-header, dark-header, green-accent, warm, minimal, striped; applied via `applyPreset()` without overwriting per-cell overrides
- **Unit-aware aggregates** — Sum, Average, Count, Count Numbers, Min, Max, Median, Mode, Std Dev, Range; only computed when all cells share the same unit signature (e.g., all `$`-prefixed). Summary bar display with auto-recompute
- **Non-contiguous selection** — Ctrl+Click toggle, Shift+Arrow range extension, tracked as CellRange[] array
- **Column/row resize and reorder** — drag handles for width/height, drag-to-reorder
- **Edit/view modes** — `setMode("edit"/"view")`, edit-by-default when embedded (contained mode)
- **Undo/redo** — Ctrl+Z / Ctrl+Y
- **Clipboard** — Copy/paste in TSV format (Ctrl+C / Ctrl+V)
- **Keyboard navigation** — Arrow keys, Tab/Shift+Tab, Enter/F2 to edit, Escape to cancel
- **Accessibility** — ARIA grid role, aria-colindex/rowindex, aria-selected, roving tabindex
- **Dark mode** — minimal and striped presets use CSS variables, auto-adapt

### Files Created
- `components/visualtableeditor/visualtableeditor.ts`
- `components/visualtableeditor/visualtableeditor.scss`
- `components/visualtableeditor/visualtableeditor.test.ts`
- `components/visualtableeditor/README.md`

### Dependencies
- Reuses InlineToolbar (formatting toolbar), ContextMenu (right-click menu), ColorPicker (text/background colour)

### Knowledge Base Updated
- `agentknowledge/history.jsonl` — VisualTableEditor entry
- `agentknowledge/decisions.yaml` — ADR-094
- `agentknowledge/entities.yaml` — VisualTableEditor entities
- `CONVERSATION.md` — this section

**Build:** Components: 107+ built.
