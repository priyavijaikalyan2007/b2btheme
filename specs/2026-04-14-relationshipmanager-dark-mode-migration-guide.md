# Migration Guide: RelationshipManager Dark Mode (ADR-119)

**Date:** 2026-04-14
**Priority:** Medium
**Breaking:** No — visual-only change

## What Changed

Replaced 8 hardcoded SCSS colour values with CSS custom properties:

| Selector | Before | After |
|----------|--------|-------|
| `.rm-empty` | `$gray-500` | `var(--theme-text-muted)` |
| `.rm-confidence` | `#6f42c1` | `var(--rm-confidence-color)` |
| `.rm-confidence` bg | `rgba(111, 66, 193, 0.1)` | `var(--rm-confidence-bg)` |
| `.rm-item-meta` | `$gray-500` | `var(--theme-text-muted)` |
| `.rm-type-fallback` | `$gray-600` | `var(--theme-text-secondary)` |
| `.rm-provenance` | `$gray-600` | `var(--theme-text-secondary)` |
| `.rm-def-arrow` | `$gray-500` | `var(--theme-text-muted)` |
| `.rm-def-targets` | `$gray-500` | `var(--theme-text-muted)` |
| `.rm-no-results` | `$gray-500` | `var(--theme-text-muted)` |

Added component-scoped tokens on `.rm-root`:
- `--rm-confidence-color: #6f42c1` (light)
- `--rm-confidence-bg: rgba(111, 66, 193, 0.1)` (light)

Dark mode override:
- `--rm-confidence-color: #c4b5fd` (lighter purple)
- `--rm-confidence-bg: rgba(196, 181, 253, 0.12)`

## Migration Steps

No code changes required. The component automatically adapts to `data-bs-theme="dark"`.

### Custom theming

If your app overrides confidence badge colours, target the component-scoped tokens:

```css
.rm-root {
    --rm-confidence-color: #your-color;
    --rm-confidence-bg: rgba(your-color, 0.1);
}
```
