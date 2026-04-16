# Feature Request: GraphCanvas Node Icon Rendering from Class Names

**Date**: 2026-04-16
**Component**: CDN GraphCanvas + GraphLegend
**Severity**: UX improvement
**Reporter**: Ontology Visualizer team

## Problem

The `GraphCanvasNode.icon` property accepts a string, but the current implementation sets it as `textContent` on an SVG `<text>` element with `font-family: 'bootstrap-icons'`. This means:

1. **CSS class names don't work** — Passing `"lightbulb"` (a Bootstrap Icons name) renders the literal text "lightbulb" instead of the icon glyph.
2. **Consumers must do Unicode lookup** — To render correctly, each consumer would need to resolve the icon name to its Unicode codepoint character (e.g., `"lightbulb"` → `"\uF59B"`), which requires DOM manipulation (`getComputedStyle` on a temp `<i class="bi bi-lightbulb">` element).
3. **Feather/Lucide name mismatch** — The ontology YAML uses Feather Icons naming conventions for ~26 of 57 icon names (e.g., `user` → BI's `person`, `home` → BI's `house`). This name translation shouldn't be the consumer's responsibility.

## Expected Behavior

The `icon` property should accept any of these formats and render correctly:

1. **Bootstrap Icons class name** (without prefix): `"lightbulb"`, `"folder"`, `"building"` — the component resolves the Unicode character internally via the loaded CSS.
2. **Full BI class name**: `"bi-lightbulb"` — stripped and resolved as above.
3. **Unicode character** (already resolved): `"\uF59B"` — used directly as today.
4. **Empty string / undefined** — no icon rendered (current behaviour, correct).

### Resolution logic (suggested):

```
if icon is a single character → use directly (already Unicode)
else if icon starts with "bi-" → strip prefix, lookup CSS ::before content for .bi-{name}
else → lookup CSS ::before content for .bi-{icon}
if lookup fails → no icon rendered (graceful fallback)
```

### Caching

Icon name → Unicode character mappings should be cached after first resolution. The set of icons used in a graph is typically small (10–30 unique names).

## Current Workaround

The Ontology Visualizer currently omits the `icon` property entirely, losing the visual icon affordance on graph nodes.

## Affected Components

- **GraphCanvas** — `buildNodeIcon()` function in node rendering
- **GraphLegend** — `LegendNodeType.icon` (same issue — legend likely uses similar SVG text rendering)

## Icon Name Mapping (Feather → Bootstrap Icons)

26 icon names from the ontology YAML use Feather Icons conventions. If the component wants to support these natively, here is the mapping:

| Feather Name | Bootstrap Icons Name |
|---|---|
| `external-link` | `box-arrow-up-right` |
| `share-2` | `share` |
| `user` | `person` |
| `users` | `people` |
| `user-plus` | `person-plus` |
| `git-branch` | `diagram-2` |
| `badge` | `award` |
| `clipboard-list` | `clipboard-data` |
| `file-presentation` | `file-earmark-slides` |
| `pen-tool` | `vector-pen` |
| `notebook` | `journal` |
| `hard-drive` | `hdd` |
| `zap` | `lightning-charge` |
| `package` | `box-seam` |
| `layout` | `layout-text-window` |
| `home` | `house` |
| `message-square` | `chat-square` |
| `alert-circle` | `exclamation-circle` |
| `alert-triangle` | `exclamation-triangle` |
| `bar-chart-2` | `bar-chart` |
| `dollar-sign` | `currency-dollar` |
| `target` | `bullseye` |
| `tool` | `tools` |
| `refresh-cw` | `arrow-clockwise` |
| `shopping-cart` | `cart` |
| `book-open` | `book` |

**Alternative**: The component could skip the Feather→BI mapping and only support BI names. Consumers would then be responsible for using correct BI names in their data (e.g., updating the ontology YAML to use BI-native names).

## Impact

The Ontology Visualizer has ~57 type definitions with icons. Without working icon rendering, the schema graph relies solely on colour swatches for visual differentiation, which is insufficient when multiple types share the same namespace colour.
