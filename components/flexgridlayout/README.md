<!-- AGENT: Documentation for the FlexGridLayout component -- advanced CSS Grid layout with variable tracks and cell spanning. -->

# FlexGridLayout

An advanced CSS Grid layout container with mixed track sizes and cell spanning. Supports variable column and row definitions (`px`, `fr`, `auto`), named grid areas, per-cell alignment overrides, and multi-column/multi-row spanning. Designed for complex enterprise form layouts, dashboard grids, and any arrangement requiring non-uniform track sizing.

## Assets

| Asset | Path |
|-------|------|
| CSS | `components/flexgridlayout/flexgridlayout.css` |
| JS | `components/flexgridlayout/flexgridlayout.js` |
| Types | `components/flexgridlayout/flexgridlayout.d.ts` |

## Requirements

- **Bootstrap CSS** -- for SCSS variables (`$gray-*`, `$font-size-*`, etc.)
- Does **not** require Bootstrap JS.

## Quick Start

```html
<link rel="stylesheet" href="components/flexgridlayout/flexgridlayout.css">
<script src="components/flexgridlayout/flexgridlayout.js"></script>

<script>
    // A two-column form layout: fixed label column, flexible field column
    var layout = createFlexGridLayout({
        columns: ["160px", "1fr"],
        rows: ["auto", "auto", "auto"],
        gap: 8,
        padding: "16px",
        cells: [
            { child: document.getElementById("label-name"),  column: 0, row: 0 },
            { child: document.getElementById("field-name"),  column: 1, row: 0 },
            { child: document.getElementById("label-email"), column: 0, row: 1 },
            { child: document.getElementById("field-email"), column: 1, row: 1 },
            { child: document.getElementById("label-notes"), column: 0, row: 2, alignSelf: "start" },
            { child: document.getElementById("field-notes"), column: 1, row: 2 }
        ]
    });
</script>
```

## How It Works

FlexGridLayout creates a CSS Grid container. Columns and rows are defined as arrays of track size strings. Each cell is placed at a specific column/row position and can optionally span multiple tracks.

```
columns: ["160px", "1fr", "1fr"]
rows:    ["auto", "1fr", "auto"]

     160px        1fr           1fr
   +----------+-------------+-------------+
   |  Header (columnSpan: 3)              |  auto
   +----------+-------------+-------------+
   |  Nav     |  Main content             |  1fr
   |  (fixed) |  (columnSpan: 2)          |
   +----------+-------------+-------------+
   |  Footer (columnSpan: 3)              |  auto
   +----------+-------------+-------------+
```

Track sizes can be mixed freely:
- **`px`** -- fixed pixel widths (labels, icons, gutters)
- **`fr`** -- fractional units that share remaining space
- **`auto`** -- sizes to content
- **`minmax()`** -- responsive ranges

## Options

### FlexGridLayoutOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | `string` | auto | Custom element ID |
| `columns` | `string[]` | -- | Column track definitions (required) |
| `rows` | `string[]` | -- | Row track definitions |
| `gap` | `number \| string` | `"0"` | Uniform gap between cells |
| `rowGap` | `number \| string` | -- | Override gap for rows |
| `columnGap` | `number \| string` | -- | Override gap for columns |
| `areas` | `string[]` | -- | CSS grid-template-areas row strings |
| `cells` | `FlexGridCellConfig[]` | `[]` | Initial cells to place |
| `padding` | `string` | -- | Container padding (CSS value) |
| `cssClass` | `string` | -- | Additional CSS classes |
| `height` | `string` | -- | Height CSS value |
| `width` | `string` | -- | Width CSS value |
| `onLayoutChange` | `(state) => void` | -- | Fired on resize or structural changes |

### FlexGridCellConfig

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `child` | `HTMLElement \| Component` | -- | Child element or component |
| `column` | `number` | -- | 0-based column index (required) |
| `row` | `number` | -- | 0-based row index (required) |
| `columnSpan` | `number` | `1` | Number of columns to span |
| `rowSpan` | `number` | `1` | Number of rows to span |
| `alignSelf` | `"start" \| "center" \| "end" \| "stretch"` | -- | Block-axis alignment override |
| `justifySelf` | `"start" \| "center" \| "end" \| "stretch"` | -- | Inline-axis alignment override |

## Public API

| Method | Returns | Description |
|--------|---------|-------------|
| `show(container?)` | `void` | Append to container and display |
| `hide()` | `void` | Remove from DOM (preserves state) |
| `destroy()` | `void` | Full cleanup, destroy all cells |
| `getRootElement()` | `HTMLElement \| null` | The root grid container |
| `isVisible()` | `boolean` | Whether the layout is displayed |
| `addCell(config)` | `void` | Place a child at a grid position |
| `removeCell(column, row)` | `void` | Remove child at position |
| `getCellElement(column, row)` | `HTMLElement \| null` | Wrapper element at position |
| `setColumns(columns)` | `void` | Update column track definitions |
| `setRows(rows)` | `void` | Update row track definitions |
| `getState()` | `FlexGridLayoutState` | Serialisable state snapshot |
| `setState(state)` | `void` | Restore column/row definitions |
| `setContained(value)` | `void` | Set contained mode |

## FlexGridLayoutState

```typescript
interface FlexGridLayoutState {
    columns: string[];
    rows: string[];
    cellCount: number;
}
```

## Composability

FlexGridLayout implements the standard layout container contract. Any component with `show(container)` / `hide()` / `destroy()` can be used as a child. Plain HTMLElements are also supported. Components with a `setContained(true)` method are automatically put into contained mode.

```js
// A dashboard layout with mixed track sizes
var dashboard = new FlexGridLayout({
    columns: ["240px", "1fr", "1fr"],
    rows: ["48px", "1fr", "32px"],
    gap: 4,
    height: "100vh",
    cells: [
        { child: toolbar,    column: 0, row: 0, columnSpan: 3 },
        { child: sidebar,    column: 0, row: 1 },
        { child: mainPanel,  column: 1, row: 1, columnSpan: 2 },
        { child: statusBar,  column: 0, row: 2, columnSpan: 3 }
    ]
});
```

## Global Exports

When loaded via `<script>` tag:

- `window.FlexGridLayout` -- FlexGridLayout class
- `window.createFlexGridLayout` -- Factory function (creates and shows)

## CSS Classes

| Class | Element | Description |
|-------|---------|-------------|
| `.flexgridlayout` | Root | CSS Grid container |
| `.flexgridlayout-cell` | Wrapper | Per-cell grid wrapper with placement |
