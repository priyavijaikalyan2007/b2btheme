<!-- AGENT: Documentation for the GridLayout component — uniform CSS Grid layout container. -->

# GridLayout

A uniform CSS Grid layout container where all cells are the same size, arranged via `grid-template-columns: repeat(N, 1fr)`. Supports a fixed column count or responsive auto-fit columns calculated from container width and a minimum cell width. Optional aspect ratio enforcement keeps cells proportional.

## Assets

| Asset | Path |
|-------|------|
| CSS | `dist/components/gridlayout/gridlayout.css` |
| JS | `dist/components/gridlayout/gridlayout.js` |
| Types | `dist/components/gridlayout/gridlayout.d.ts` |

## Requirements

- **Bootstrap CSS** -- for SCSS variables (`$gray-*`, `$font-size-*`, etc.)
- Does **not** require Bootstrap JS.

## Quick Start

```html
<link rel="stylesheet" href="dist/components/gridlayout/gridlayout.css">
<script src="dist/components/gridlayout/gridlayout.js"></script>

<script>
    var cards = [];
    for (var i = 0; i < 6; i++) {
        var card = document.createElement("div");
        card.className = "p-3 border bg-white";
        card.textContent = "Card " + (i + 1);
        cards.push(card);
    }

    var grid = createGridLayout({
        columns: 3,
        gap: 12,
        padding: "16px",
        children: cards
    });
</script>
```

## How It Works

GridLayout creates a CSS Grid container with equal-width columns. When `columns` is a number, the grid uses a fixed column count. When `columns` is `"auto"`, a ResizeObserver monitors the container width and recalculates the column count as `Math.floor(containerWidth / minCellWidth)`, clamped to the child count.

```
columns: 3, gap: 12
+----------+----------+----------+
|  Cell 1  |  Cell 2  |  Cell 3  |
+----------+----------+----------+
|  Cell 4  |  Cell 5  |  Cell 6  |
+----------+----------+----------+

columns: "auto", minCellWidth: 200 (container: 650px -> 3 cols)
+----------+----------+----------+
|  Cell 1  |  Cell 2  |  Cell 3  |
+----------+----------+----------+
|  Cell 4  |  Cell 5  |  Cell 6  |
+----------+----------+----------+

columns: "auto", minCellWidth: 200 (container: 350px -> 1 col)
+------------------------------+
|           Cell 1             |
+------------------------------+
|           Cell 2             |
+------------------------------+
|           Cell 3             |
+------------------------------+
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | `string` | auto | Custom element ID |
| `columns` | `number \| "auto"` | -- | Column count or `"auto"` for responsive (required) |
| `rows` | `number \| "auto"` | `"auto"` | Row count or `"auto"` for natural flow |
| `gap` | `number \| string` | `"0"` | Gap between cells (px or CSS value) |
| `aspectRatio` | `number` | -- | Width/height ratio for cells (e.g. 1.0 = square) |
| `minCellWidth` | `number` | `200` | Minimum cell width in px when columns is `"auto"` |
| `children` | `Array<HTMLElement \| Component>` | `[]` | Initial children |
| `padding` | `string` | -- | Container padding (CSS value) |
| `cssClass` | `string` | -- | Additional CSS classes |
| `height` | `string` | -- | Height CSS value |
| `width` | `string` | -- | Width CSS value |
| `onLayoutChange` | `(state) => void` | -- | Fired on column recalculation or child add/remove |

## Public API

| Method | Returns | Description |
|--------|---------|-------------|
| `show(container?)` | `void` | Append to container and display |
| `hide()` | `void` | Remove from DOM (preserves state) |
| `destroy()` | `void` | Full cleanup, destroy all children |
| `getRootElement()` | `HTMLElement \| null` | The root grid container |
| `isVisible()` | `boolean` | Whether the grid is displayed |
| `addChild(child, index?)` | `void` | Add a child at optional index |
| `removeChild(index)` | `void` | Remove child by index |
| `clear()` | `void` | Remove all children |
| `getChildCount()` | `number` | Number of children |
| `getChildElement(index)` | `HTMLElement \| null` | Cell wrapper element at index |
| `setColumns(n)` | `void` | Update columns dynamically (number or "auto") |
| `getState()` | `GridLayoutState` | Serialisable state snapshot |
| `setState(state)` | `void` | Restore state (columns) |
| `setContained(value)` | `void` | Set contained mode |

## GridLayoutState

```typescript
interface GridLayoutState {
    columns: number;
    rows: number;
    childCount: number;
}
```

## Composability

GridLayout implements the standard layout container contract. Any component with `show(container)` / `hide()` / `destroy()` can be used as a child. Plain HTMLElements are also supported. Duck-typed child mounting checks for `setContained`, `show`, `getRootElement`, and falls back to direct `appendChild`.

```js
// Place gauges in a 2x2 grid
var grid = new GridLayout({
    columns: 2,
    gap: 16,
    aspectRatio: 1,
    children: [gaugeA, gaugeB, gaugeC, gaugeD]
});
grid.show(document.getElementById("dashboard"));
```

## Global Exports

When loaded via `<script>` tag:

- `window.GridLayout` -- GridLayout class
- `window.createGridLayout` -- Factory function (creates and shows)

## CSS Classes

| Class | Element | Description |
|-------|---------|-------------|
| `.gridlayout` | Root | CSS Grid container |
| `.gridlayout-cell` | Wrapper | Per-child grid cell wrapper |
