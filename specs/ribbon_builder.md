<!-- AGENT: Component spec and progress tracking for RibbonBuilder. -->

# RibbonBuilder — Component Spec

## Status: Complete (v1.0)

## Summary
Visual WYSIWYG editor for composing Ribbon toolbar layouts via drag-and-drop. Exports Markdown specs and JSON configs.

## Files
- `components/ribbonbuilder/ribbonbuilder.ts` — 2974 lines
- `components/ribbonbuilder/ribbonbuilder.scss` — 625 lines
- `components/ribbonbuilder/README.md` — 93 lines
- `demo/index.html` — demo section + script added

## Implementation History

### 2026-03-07 — Initial implementation
- Built full component with 17 sections
- Toolbar, live preview, structure tree, drag-and-drop, property panel, icon picker
- Markdown and JSON export/import with modal dialogs
- Keyboard navigation (Delete, F2, ArrowUp/Down)
- Resizable tree panel via pointer events
- Refactored 16 methods exceeding 30-line limit per CODING_STYLE.md
- Build verified: zero TypeScript and SCSS errors

## Architecture
- Single mutable `RibbonOptions` as source of truth
- `mutateConfig()` central mutation handler: rebuilds tree, properties, schedules preview
- Debounced (250ms) live preview via `createRibbon()` from window globals
- HTML5 DnD API for tree reordering with position detection (top 25% / middle / bottom 25%)
- ~200 curated Bootstrap Icons in 8 categories for icon picker
