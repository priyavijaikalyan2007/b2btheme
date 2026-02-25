<!-- AGENT: Progress file for MarkdownEditor enhancement request from Apps team. -->

# MarkdownEditor Enhancements — Progress

**Spec:** `specs/markdowneditor.enhancement.txt`
**Requested by:** Apps team (Thinker — hover popovers, categories sidebar)
**Date:** 2026-02-25
**Status:** Complete

## Enhancements Implemented

| # | Enhancement | Status | Notes |
|---|-------------|--------|-------|
| 1 | CSS isolation (`isolated`) | Done | `all: initial` reset boundary via `.mde-display-isolated` class |
| 2 | Compact spacing (`compact`) | Done | `.mde-display-compact` tighter margins on p/h/list/pre/table/blockquote |
| 3 | Dark theme (`theme: "dark"`) | Done | `.mde-display-dark` with `$gray-900` bg, `$gray-100` text, `$blue-300` links |
| 4 | `onReady` in display mode | Done | Fires via Vditor.preview() `after` callback or synchronously on fallback |

## Files Modified

- `components/markdowneditor/markdowneditor.ts` — options, `buildDisplayMode()`, `applyDisplayClasses()`, `renderDisplayPreview()`, `fireDisplayReady()`
- `components/markdowneditor/markdowneditor.scss` — `.mde-display-isolated`, `.mde-display-compact`, `.mde-display-dark`
- `components/markdowneditor/README.md` — documented all 4 enhancements with examples
- `demo/index.html` — 3 new demo sections (compact, dark, isolated+compact+onReady)

## Key Design Decisions

- **Isolation via `all: initial`:** Strongest CSS reset boundary without Shadow DOM complexity. Resets all inherited properties, then re-establishes font-family, font-size, color, and box-sizing. Shadow DOM was considered but adds complexity for event delegation and Vditor's async rendering.
- **Compact headings use relative sizing:** `h1: 1.25em`, `h2: 1.125em`, `h3: 1.0625em` instead of absolute pixel values. This ensures headings scale with the container's font-size.
- **Dark theme Vditor integration:** Passes `mode: "dark"` and `style: "native"` to `Vditor.preview()` for syntax highlighting. Our SCSS handles the surrounding elements (headings, links, blockquotes, tables).
- **onReady fires via Vditor `after` callback:** This is the most reliable point — Vditor has finished async rendering (code highlighting, diagrams). Fallback (no Vditor) fires synchronously after innerHTML.
