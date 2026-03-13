# Dark Mode Phase 1: Light-First Normalization

**Date:** 2026-03-11
**ADR:** ADR-069
**Status:** Complete

## Summary

Normalized 27 components from "dark island" patterns to light-first styling in preparation
for Bootstrap `[data-bs-theme="dark"]` integration. This ensures a uniform theme switch in
Phase 2 won't create inverted contrast conflicts.

## Strategy

Five-phase rollout using Bootstrap built-in dark mode with OS `prefers-color-scheme` auto-detect:

1. **Light-first normalization** (Phase 1) — complete (ADR-069)
2. **Dark palette + Bootstrap dark mode wiring** (Phase 2) — complete (ADR-070)
3. **Component CSS variable migration** (Phase 3) — complete (ADR-071, 60 components; bug fixes ADR-073, ADR-074, ADR-075 expanded to 90+ files)
4. **Theme toggle utility + OS auto-detect** (Phase 4) — complete (ADR-072)
5. **Dark mode bug fix rounds** (Phase 5) — complete 2026-03-12/13, three rounds (ADR-073, ADR-074, ADR-075)

## Phase 5: Bug Fixes (2026-03-12/13)

Three rounds of dark mode bug fixes to resolve issues surfaced during integration testing.

### Round 1 — Component token migration (ADR-073)

Hardcoded colour cleanup across 20+ component SCSS files. Key changes:
- Migrated remaining hardcoded colour values to CSS custom properties / semantic tokens
- Refactored LogConsole to use theme-aware variables
- Added `resolveThemeColor` to canvas-based components (GraphCanvas, GraphCanvasMx) so
  programmatic drawing respects the active theme

### Round 2 — Bootstrap CSS specificity fix (ADR-074)

Bootstrap's own dark-mode styles were overriding component tokens due to specificity:
- Introduced class-scoped overrides (`[data-bs-theme="dark"] .component-class`) to win
  the specificity battle against Bootstrap's blanket `[data-bs-theme="dark"]` selectors
- Migrated input-family components (EditableComboBox, SearchBox, FacetSearch, etc.) to
  the class-scoped pattern

### Round 3 — Pickers, rich content, MCP UI, global utilities (ADR-075)

Final sweep covering remaining components:
- All picker components (ColorPicker, SymbolPicker, FontDropdown, LineTypePicker, CronPicker)
- Rich content components (MarkdownEditor, DocViewer, RichTextInput)
- MCP UI surfaces (Conversation, PromptTemplateManager)
- Global utilities in `custom.scss` (sidebar, tables, metric cards, status badges)
- ErrorDialog TypeScript fixes (type errors surfaced by stricter checking)

### Phase 5 Status

Dark mode is largely working across all 90+ components. Minor visual polish items remain
for follow-up but do not block day-to-day use.

## Changes

### Part A: NORMALIZE (dark bg -> light bg)

| File | Element | Before | After |
|------|---------|--------|-------|
| `custom.scss` | `.table-enterprise thead th` | `$gray-800` bg, `white` text | `$gray-200` bg, `$gray-900` text |
| `custom.scss` | `.sidebar` | `$gray-900` bg, `$gray-300` text | `$gray-100` bg, `$gray-800` text |
| `custom.scss` | `.sidebar .nav-link:hover` | `rgba(white, 0.1)`, `white` | `$gray-200`, `$gray-900` |
| `custom.scss` | `.sidebar .nav-link.active` | `white` | `$gray-50` |
| `custom.scss` | `.status-active/inactive/error` | `white` | `$gray-50` |
| `custom.scss` | `.metric-card` | `white` bg | `$gray-50` bg |
| `custom.scss` | `.skip-link` | `white` text | `$gray-50` text |
| `helptooltip.scss` | `.helptooltip-popup` | `$gray-900` bg | `$gray-100` bg + `$gray-300` border |
| `datepicker.scss` | `.datepicker-help-tooltip` | `$gray-900` bg | `$gray-100` bg + `$gray-300` border |
| `timepicker.scss` | `.timepicker-help-tooltip` | `$gray-900` bg | `$gray-100` bg + `$gray-300` border |
| `durationpicker.scss` | `.durationpicker-help-tooltip` | `$gray-900` bg | `$gray-100` bg + `$gray-300` border |
| `timezonepicker.scss` | `.timezonepicker-help-tooltip` | `$gray-900` bg | `$gray-100` bg + `$gray-300` border |
| `graphcanvas.scss` | `.gc-tooltip` | `$gray-900` bg | `$gray-100` bg + `$gray-300` border |
| `graphcanvasmx.scss` | `.mxTooltip` | `$gray-900` bg | `$gray-100` bg + `$gray-300` border |
| `toolbar.scss` | `.toolbar-split-menu` | `white` bg | `$gray-50` bg |
| `toolbar.scss` | `.toolbar-gallery-popup` | `white` bg | `$gray-50` bg |
| `toolbar.scss` | `.toolbar-overflow-menu` | `white` bg | `$gray-50` bg |

### Part B: PARAMETERIZE (intentional dark overlays -> CSS vars)

| File | Element | CSS Variables |
|------|---------|---------------|
| `ribbon.scss` | `.ribbon-keytip` | `--ribbon-keytip-bg`, `--ribbon-keytip-color` |
| `toolbar.scss` | `.toolbar-keytip` | `--toolbar-keytip-bg`, `--toolbar-keytip-color` |
| `conversation.scss` | `.conversation-mcp-expand-btn` | `--conversation-overlay-btn-bg`, `--conversation-overlay-btn-color`, `--conversation-overlay-btn-hover-bg` |
| `ribbon.scss` | `.ribbon-backstage-back` | `--ribbon-backstage-back-bg`, `--ribbon-backstage-back-color` |
| `markdowneditor.scss` | `.mde-display-dark` | 12 `--mde-dark-*` properties on `.markdowneditor` root |

### Part C: NO CHANGE (documented)

- White-on-`$primary` patterns (Bootstrap convention): datepicker, timepicker, durationpicker, timezonepicker, cronpicker, errordialog, timeline
- Modal backdrops `rgba($gray-900, 0.5)`: confirmdialog, formdialog, sharedialog, workspaceswitcher, applauncher, progressmodal, commandpalette
- Subtle hover overlays `rgba($gray-900, 0.08-0.15)`: tagger, pill, facetsearch, tabbedpanel, bannerbar, propertyinspector, magnifier
- CodeEditor dark variant: already parameterized with CSS custom properties

## Verification

- `npm run build` passes with zero errors
- No `white` literal remaining in modified files (replaced with `$gray-50`)
- All modified SCSS follows project conventions (3-level nesting max, no `!important`)
- CSS variable defaults preserve exact same visual appearance as before
