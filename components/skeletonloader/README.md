<!-- AGENT: Documentation for the SkeletonLoader component — animated placeholder for loading states. -->

# SkeletonLoader

Animated placeholder component that mimics content layout during loading. CSS shimmer animation with six presets: text, avatar, card, table, paragraph, and custom.

## Assets

| Asset | Path |
|-------|------|
| CSS | `components/skeletonloader/skeletonloader.css` |
| JS | `components/skeletonloader/skeletonloader.js` |
| Types | `components/skeletonloader/skeletonloader.d.ts` |

## Requirements

- **Bootstrap CSS** — for SCSS variables (`$gray-100`, `$gray-200`)
- Does **not** require Bootstrap JS or Bootstrap Icons.

## Quick Start

```html
<link rel="stylesheet" href="components/skeletonloader/skeletonloader.css">
<script src="components/skeletonloader/skeletonloader.js"></script>
<script>
    var skeleton = createSkeletonLoader(
        { preset: "card" },
        "my-container"
    );
    // Later when data loads:
    skeleton.destroy();
</script>
```

## Options (SkeletonLoaderOptions)

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `preset` | `string` | `"text"` | `text`, `avatar`, `card`, `table`, `paragraph`, `custom` |
| `lines` | `number` | `3` | Number of lines (text/paragraph) |
| `rows` | `number` | `5` | Number of rows (table) |
| `columns` | `number` | `4` | Number of columns (table) |
| `width` | `string` | `"100%"` | CSS width (custom/avatar) |
| `height` | `string` | `"1rem"` | CSS height (custom/avatar) |
| `gap` | `string` | `"0.5rem"` | Gap between elements |
| `animate` | `boolean` | `true` | Enable shimmer animation |
| `borderRadius` | `string` | `"0"` | CSS border-radius |
| `circle` | `boolean` | `false` | Circle shape (avatar only) |
| `cssClass` | `string` | — | Additional CSS class(es) |

## API

| Method | Returns | Description |
|--------|---------|-------------|
| `show(containerId?)` | `void` | Append to container (or body) |
| `hide()` | `void` | Remove from DOM, keep state |
| `destroy()` | `void` | Hide, clean up, null references |
| `getElement()` | `HTMLElement` | Root DOM element |

### Global Exports

```
window.SkeletonLoader
window.createSkeletonLoader
```

## Accessibility

- Root has `role="status"`, `aria-busy="true"`, `aria-label="Loading content"`
- `prefers-reduced-motion: reduce` disables shimmer animation
- Consumer should set `aria-busy="false"` on parent when content loads

See `specs/skeletonloader.prd.md` for the complete specification.
