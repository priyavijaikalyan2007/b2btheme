<!-- AGENT: Running log of agent interactions and changes for organisational memory. -->

# Conversation Log

## 2026-04-08 — FormDialog `showFooter` Option (ADR-114)

### FormDialog dual-footer bug fix
**Bug:** When using FormDialog with `customContent` that has its own action buttons (e.g. Stepper in Strukture's "Add Relationship" wizard), the built-in footer (Submit + Cancel) still rendered, creating two rows of buttons.

**Root cause:** FormDialog always rendered the footer in `buildDialog()` — no option existed to suppress it.

**Fix:**
- Added `showFooter?: boolean` to `FormDialogOptions` (default: `true`).
- `formdialog.ts:483` — footer DOM conditionally appended when `showFooter !== false`.
- `formdialog.ts:1782` — Enter-to-submit keyboard shortcut skipped when footer is hidden.
- `formdialog.ts:1669` — wizard footer updates guarded by same check.
- Demo page updated with "Custom Content, No Footer" example.

---

## 2026-04-06 — DataGrid Resize Bug + SymbolPicker Insert-Dismiss Bug Fix

### DataGrid column resize handles triggering column move
**Bug:** Column resize handles moved the column instead of resizing it. Columns could not be resized at all.

**Root cause:** Resize handle `pointerdown` called `stopPropagation()` but not `preventDefault()`. The header cell has `draggable="true"` for column reorder. HTML5 drag-and-drop operates independently of pointer events, so it still detected the gesture and fired `dragstart`, initiating a column move.

**Fix:**
- `datagrid.ts:753` — added `e.preventDefault()` to resize handle `pointerdown` to suppress HTML5 drag initiation.
- `datagrid.ts:1068` — added `dragstart` guard that cancels drag when initiated from `.datagrid-resize-handle` (defense-in-depth).

### DataGrid sizeHint column option (ADR-109)
Added `sizeHint` property to `DataGridColumn`: `xs` (60px), `s` (100px), `m` (160px), `l` (240px), `xl` (360px). Resolves to `width` and `minWidth` during column initialization if not explicitly set. Gives consumers semantic sizing without pixel math.

---

## 2026-04-06 — SymbolPicker / RibbonBuilder Insert-Dismiss Bug Fix

### SymbolPicker dialog not dismissing on Insert (RibbonBuilder)
**Bug:** Clicking the Insert button (or double-clicking a symbol) in the SymbolPicker dialog opened from RibbonBuilder fired the `onInsert` callback but never dismissed the dialog overlay. The ribbon appeared to hang.

**Root cause (two layers):**
1. `RibbonBuilder.handleSymbolInsert()` called `deactivateIconPicker()` which only disables the picker and clears refs but does **not** hide the overlay or host element. Should have called `hideIconPicker()`.
2. `SymbolPicker.insertSymbol()` never called `closePopup()` after firing the `onInsert` callback, so the picker never self-dismissed for any consumer.

**Fix:**
- `ribbonbuilder.ts:2133` — changed `this.deactivateIconPicker()` → `this.hideIconPicker()` so the overlay and host are hidden after insert.
- `symbolpicker.ts:1939` — added `this.closePopup()` after the `onInsert` callback in `insertSymbol()` so non-inline consumers also get clean dismissal (no-op for inline mode due to early return guard).

---

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

---

## 2026-04-03 — Element Chrome: Comprehensive Hover Glow (Phases 1–4)

### Summary
Applied subtle visual chrome across the entire component library to improve depth perception and interactivity affordance. Created `_chrome.scss` mixin library (zero CSS output, opt-in) and added hover glows and directional edge shadows to 49 components.

### Foundation
- **`src/scss/_chrome.scss`** — 5 mixins: `edge-shadow`, `auto-edge-shadow`, `hover-glow`, `focus-glow`, `chrome-transition`
- **`src/scss/_dark-mode.scss`** — Added `--theme-glow-color-hover`, `--theme-edge-shadow-rgb`, `--theme-edge-shadow-opacity` tokens (light + dark)
- **`src/scss/_variables.scss`** — Added `$chrome-edge-blur`, `$chrome-glow-radius` defaults
- **`@media print`** — All shadows suppressed

### Directional Edge Shadows (Docked Panels)
Ribbon (bottom), StatusBar (top), Ruler (bottom/right), InlineToolbar (bottom), HelpDrawer (left), Sidebar (auto via `data-dock`), TabbedPanel tab bar (auto via `data-dock`), TabbedPanel outer container (top for bottom-docked, bottom for top-docked).

### Hover Glow Coverage (49 Components)
Convention: 4px for small cells/items, 6px for triggers/buttons, 8px for larger surfaces.

**Tier 1 (Docked Panels):** Ribbon, StatusBar, Ruler, InlineToolbar, HelpDrawer, Sidebar
**Tier 2 (Panels):** TabbedPanel tabs + titlebar buttons
**Tier 3 (Surfaces):** ActionItems, NotificationCenter, demo-shell cards
**Tier 4 (Buttons/Controls):** Toolbar, Ribbon buttons/tabs/QAT, ColorPicker swatches/trigger, SymbolPicker cells/trigger, InlineToolbar buttons
**Phase 2–3:** FontDropdown items, AnglePicker dial, SplitLayout, CronPicker, ToolColorPicker, CommentOverlay, LatexEditor, DatePicker, TimePicker, TimezonePicker, FileExplorer, TreeView, TreeGrid, DataGrid, VisualTableEditor cells
**Phase 4:** PeriodPicker, SprintPicker, FacetSearch, ReasoningAccordion, PromptTemplateManager, WorkspaceSwitcher, AuditLogViewer, PermissionMatrix, ActivityFeed, UserMenu, AppLauncher, FormDialog, LineWidthPicker, Pill, RichTextInput, PersonChip, PeoplePicker, ShareDialog, ConfirmDialog, Conversation, Timeline, PresenceIndicator, TimezonePicker toggle/help, VisualTableEditor rows

**Skipped:** Gauge (display-only), MaskedEntry (Bootstrap btn classes), ErrorDialog (no custom hover states)

### Knowledge Base Updated
- `agentknowledge/decisions.yaml` — ADR-096 through ADR-103
- `agentknowledge/history.jsonl` — element_chrome entries
- `agentknowledge/concepts.yaml` — ChromeMixins, ElementChrome
- `agentknowledge/entities.yaml` — ChromeMixins entity expanded
- `CONVERSATION.md` — this section

**Build:** 108 components, 16/16 tests pass.

---

## 2026-04-05 — ExplorerPicker Component

**User request:** Implement ExplorerPicker component from `specs/explorerpicker.prd.md`. Start with tests, end with demo entries with mock data. Incorporate chrome effects.

**Summary:** Built ExplorerPicker (#110) — a self-contained resource-selection widget with:
- Tree browsing with lazy-loaded children and multi-root support
- Search with 300ms debounce, breadcrumb paths per result, cursor-based pagination
- Quick-access sections for recent and starred items
- Ontology-driven icon resolution with colour, external badges, and hierarchy matching
- Virtual scrolling for trees with 200+ visible nodes
- Full keyboard navigation (Arrow keys, Home/End, Enter, Space, Escape, /)
- State export/restore for session continuity
- Chrome integration: hover-glow on rows, focus-glow on inputs/buttons, edge-shadow on search bar
- Single-select, multi-select, and container selection modes
- 82 unit tests

### Files Created
- `components/explorerpicker/explorerpicker.ts` — Component source
- `components/explorerpicker/explorerpicker.scss` — Styles with chrome mixins
- `components/explorerpicker/explorerpicker.test.ts` — 82 tests
- `components/explorerpicker/README.md` — Documentation
- `demo/components/explorerpicker.html` — Demo page (4 sections: browse, multi-select, container, search)

### Files Updated
- `COMPONENT_INDEX.md` — Added entry (110 components)
- `MASTER_COMPONENT_LIST.md` — Added as 14.4
- `CHANGELOG.md` — Added 2026-04-05 entry
- `agentknowledge/concepts.yaml` — ExplorerPicker, ExplorerPickerStyles
- `agentknowledge/decisions.yaml` — ADR-104
- `agentknowledge/history.jsonl` — Task entry

**Build:** 110 components, 82/82 tests pass.

---

## 2026-04-05 — Chrome CSS Fallback Values

**User request:** Apps team reports chrome effects (hover glow, edge shadow) not visible on any components in CDN-consuming apps. Browser cache cleared, CDN build is latest, demos work fine.

**Root cause:** Chrome CSS custom properties (`--theme-glow-color-hover`, `--theme-edge-shadow-rgb`, `--theme-edge-shadow-opacity`) were defined only in `custom.css` (via `_dark-mode.scss`). Component CSS files referenced them with bare `var()` calls — no fallback. Apps consuming individual component CSS without `custom.css` (or using older/custom theme token definitions) got empty values, making all chrome effects invisible.

**Fix:** Added CSS `var()` fallback values throughout so chrome is self-contained in each component CSS:
- Hover/focus glow: `var(--theme-glow-color-hover, rgba(37, 99, 235, 0.18))` — 99 references across 44 SCSS files
- Edge shadow: replaced `rgba(var(--rgb), var(--opacity))` pattern with single `var(--theme-edge-shadow-color, rgba(15, 23, 42, 0.07))` token
- Added `--theme-edge-shadow-color` composite token to `_dark-mode.scss` (light + dark)

### Files Changed
- `src/scss/_chrome.scss` — All 4 mixins now use fallback-equipped `var()` calls
- `src/scss/_dark-mode.scss` — Added `--theme-edge-shadow-color` token (light + dark)
- `src/scss/custom.scss` + 42 component SCSS files — Added fallback to `var(--theme-glow-color-hover)` references
- `agentknowledge/decisions.yaml` — ADR-106
- `agentknowledge/history.jsonl` — Task entry

**Build:** Clean. All 48 component CSS files now have self-contained chrome fallbacks.

---

## 2026-04-05 — Chrome Edge Shadow Visibility + Raw Input Glow

**User request:** Apps team still can't see edge shadows on sidebar/ribbon edges despite fallback fix. Also, raw HTML inputs (e.g. `<input type="number">`) don't get hover glow.

**Root cause 1 — Edge shadows imperceptible:** Edge shadow opacity was `0.07` (7%), producing only a 17-pixel contrast delta on white — below perceptual threshold on most monitors. Increased to `0.12` (12%), giving a 29-pixel delta matching `--theme-shadow-sm`.

**Root cause 2 — Raw inputs missing glow:** `custom.scss` only targeted `.form-control` and `.form-select` (Bootstrap classes). Native `<input>`, `<textarea>`, `<select>` elements without Bootstrap classes got no hover glow.

**Fix:**
- `_dark-mode.scss` — Changed light mode edge shadow opacity from `0.07` to `0.12` and `--theme-edge-shadow-color` accordingly
- `_chrome.scss` — Updated fallback values from `0.07` to `0.12`
- `custom.scss` — Added native `input` (excluding hidden/checkbox/radio/submit/button/reset/range/file/image/color), `textarea`, `select` selectors with hover glow + transition

### Files Changed
- `src/scss/_chrome.scss`, `src/scss/_dark-mode.scss`, `src/scss/custom.scss`
- `agentknowledge/decisions.yaml` — ADR-107
- `agentknowledge/history.jsonl` — Task entry

**Build:** Clean.

---

## 2026-04-05 — Edge Shadow Clipping Fix (DockLayout + Contained Mode)

**User request:** Sidebar, TabbedPanel, and Ruler still don't show edge shadows despite fallback values and increased opacity. Same visual as `missing-chrome.png`.

**Root cause:** Two CSS issues blocking edge shadow visibility:

1. **DockLayout `overflow: hidden` clipping** — All DockLayout grid cells (`.dock-layout-toolbar`, `.dock-layout-left`, `.dock-layout-right`, `.dock-layout-bottom`) had `overflow: hidden`, which clips children's `box-shadow`. Contained components (Sidebar, TabbedPanel, Ribbon) are children of these cells, so their edge shadows were clipped by the parent cell.

2. **Contained mode `z-index: auto`** — `.sidebar-contained.sidebar-docked` and `.tabbedpanel-contained.tabbedpanel-docked` set `z-index: auto`, which doesn't create a stacking context. Adjacent grid siblings paint over the shadow. Ruler had the same issue (position: relative, no z-index).

**Fix:**
- `docklayout.scss` — Removed `overflow: hidden` from toolbar, left, right, bottom grid cells. Components manage their own overflow. Center and status cells retain `overflow: hidden`.
- `sidebar.scss` — Changed `.sidebar-contained.sidebar-docked` from `z-index: auto` to `z-index: 1`
- `tabbedpanel.scss` — Changed `.tabbedpanel-contained.tabbedpanel-docked` from `z-index: auto` to `z-index: 1`
- `ruler.scss` — Added `z-index: 1` to `.ruler`

### Files Changed
- `components/docklayout/docklayout.scss`
- `components/sidebar/sidebar.scss`
- `components/tabbedpanel/tabbedpanel.scss`
- `components/ruler/ruler.scss`
- `agentknowledge/decisions.yaml` — ADR-108

**Build:** Clean.

---

## 2026-04-05 — ExplorerPicker Bug Fixes & Standards

**User request:** Fix two issues: (1) missing demo entries on main index and full-demo pages, (2) tree disabled/unclickable in browse mode — users could only pick favorites. Then update knowledge base, ensure code standards compliance, commit and push.

**Summary:** Fixed tree interaction bug caused by `pointer-events: none` on dimmed rows. In `selectionTarget: "resource"` mode all container nodes (ORG_UNIT, FOLDER) were dimmed because they weren't selectable, which blocked expand toggles. Created `shouldDimNode()` to separate visual dimming from selectability — containers in resource mode serve as navigation and must not be dimmed. Added ExplorerPicker card to `demo/index.html` and full demo section with mock data to `demo/full-demo.html`. Refactored 7 over-length methods (>30 lines) to comply with coding standards.

### Fixes
- `explorerpicker.scss` — Removed `pointer-events: none` from `.explorerpicker-node-row-dimmed`
- `explorerpicker.ts` — Added `shouldDimNode()` method; `applyRowState` uses it instead of `!isNodeSelectable()`
- `explorerpicker.ts` — Refactored 7 methods: `onBodyClick`, `loadInitialData`, `fetchOntology`, `executeSearch`, `renderSearchResults`, `renderVirtualWindow`, `restoreState`
- `demo/index.html` — Added ExplorerPicker card
- `demo/full-demo.html` — Added TOC entry, CSS/JS includes, demo section with mock data

### Files Updated
- `CONVERSATION.md`, `agentknowledge/entities.yaml`, `agentknowledge/history.jsonl`, `agentknowledge/decisions.yaml`

**Build:** 110 components, 82/82 tests pass.

---

## 2026-04-08 — RelationshipManager Add Button Not Configurable (ADR-113)

**User request:** The "+Add" button in RelationshipManager is always visible when `readOnly: false`, even when no `onCreateRelationship` callback is provided. Five apps (Strukture, Diagrams, Thinker, Checklists, Explorer) need display+delete+navigate mode without the non-functional add button.

**Root cause:** `buildHeader()` only checked `!this.readOnly` to decide whether to render the add button. No check for callback presence.

**Fix:** Combined inference + explicit override approach:
- Added `showAddButton?: boolean` to `RelationshipManagerOptions`
- Added `canCreate()` private helper: `return this.opts.showAddButton ?? (typeof this.opts.onCreateRelationship === "function")`
- Added `syncAddBtnVisibility()` — toggles `display` based on `!readOnly && canCreate()`
- `buildHeader()` always creates the button (stored in `addBtnEl` ref), calls `syncAddBtnVisibility()`
- `rebuild()` calls `syncAddBtnVisibility()` so `setReadOnly()` toggles correctly
- `openAddPanel()` guarded with `!canCreate()` early return + logWarn
- `destroy()` nulls `addBtnEl`

### Tests
- Modified 2 existing tests to use `.rm-add-btn` selector and include callback
- Added 5 new tests: no-callback hides, `showAddButton: false` overrides, `showAddButton: true` without callback, `setReadOnly(true)` hides, `setReadOnly(false)` shows
- 21 total tests pass

### Demo
- Added second demo section: display+delete+navigate mode (no `onCreateRelationship`, no add button)

### Files Changed
- `components/relationshipmanager/relationshipmanager.ts` — showAddButton option, canCreate(), syncAddBtnVisibility(), addBtnEl ref, guards
- `components/relationshipmanager/relationshipmanager.test.ts` — 2 modified + 5 new tests
- `components/relationshipmanager/README.md` — showAddButton option, Add Button Visibility section
- `demo/components/relationshipmanager.html` — second demo section

### Knowledge Base Updated
- `agentknowledge/decisions.yaml` — ADR-113
- `agentknowledge/concepts.yaml` — RelationshipManager definition updated
- `agentknowledge/history.jsonl` — Task entry
- `CHANGELOG.md` — Fixed entry under 2026-04-08
- `CONVERSATION.md` — This section

**Build:** 110 components, 21/21 RelationshipManager tests pass.
