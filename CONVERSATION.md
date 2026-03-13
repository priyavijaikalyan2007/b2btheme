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
