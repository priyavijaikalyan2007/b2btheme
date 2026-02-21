<!-- AGENT: Documentation for the BorderLayout component — five-region CSS Grid layout container. -->

# BorderLayout

A five-region CSS Grid layout container that divides its area into North, South, East, West, and Center regions. North and South span the full width; East and West fill the remaining height; Center takes all remaining space. Supports region collapsing and dynamic slot assignment.

## Assets

| Asset | Path |
|-------|------|
| CSS | `components/borderlayout/borderlayout.css` |
| JS | `components/borderlayout/borderlayout.js` |
| Types | `components/borderlayout/borderlayout.d.ts` |

## Requirements

- **Bootstrap CSS** — for SCSS variables (`$gray-*`, `$font-size-*`, etc.)
- Does **not** require Bootstrap JS.

## Quick Start

```html
<link rel="stylesheet" href="components/borderlayout/borderlayout.css">
<script src="components/borderlayout/borderlayout.js"></script>

<script>
    var header = document.createElement("header");
    header.textContent = "Application Header";
    header.style.padding = "12px";
    header.style.background = "#f0f0f0";

    var nav = document.createElement("nav");
    nav.textContent = "Navigation";
    nav.style.padding = "12px";

    var content = document.createElement("main");
    content.textContent = "Main Content Area";

    var layout = createBorderLayout({
        north: header,
        west: nav,
        center: content,
        westWidth: "200px",
        northHeight: "auto",
        gap: 1,
        height: "100vh",
        width: "100%",
        collapsible: ["west", "east"]
    });
</script>
```

## How It Works

BorderLayout creates a CSS Grid with 5 named areas:

```
┌─────────────────────────────────────┐
│              north                  │  auto / fixed height
├──────┬──────────────────┬───────────┤
│      │                  │           │
│ west │     center       │   east    │  1fr (fills remaining)
│      │                  │           │
├──────┴──────────────────┴───────────┤
│              south                  │  auto / fixed height
└─────────────────────────────────────┘
```

When a component is passed to a region:
1. Calls `component.setContained(true)` if available
2. Calls `component.show(cell)` — mounts inside the grid cell
3. Grid template updates dynamically when regions change

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | `string` | auto | Custom element ID |
| `north` | `HTMLElement \| Component` | — | North (top) region child |
| `south` | `HTMLElement \| Component` | — | South (bottom) region child |
| `east` | `HTMLElement \| Component` | — | East (right) region child |
| `west` | `HTMLElement \| Component` | — | West (left) region child |
| `center` | `HTMLElement \| Component` | — | Center region child |
| `gap` | `number \| string` | `"0"` | Gap between regions |
| `northHeight` | `string` | `"auto"` | North region height |
| `southHeight` | `string` | `"auto"` | South region height |
| `eastWidth` | `string` | `"auto"` | East region width |
| `westWidth` | `string` | `"auto"` | West region width |
| `collapsible` | `BorderRegion[]` | — | Regions that can be collapsed |
| `padding` | `string` | — | Container padding |
| `cssClass` | `string` | — | Additional CSS classes |
| `height` | `string` | — | Height CSS value |
| `width` | `string` | — | Width CSS value |
| `onLayoutChange` | `(state) => void` | — | Fired on resize/collapse events |

## Public API

| Method | Returns | Description |
|--------|---------|-------------|
| `show(container?)` | `void` | Append to container and display |
| `hide()` | `void` | Remove from DOM (preserves state) |
| `destroy()` | `void` | Full cleanup, destroy all children |
| `getRootElement()` | `HTMLElement \| null` | The root grid container |
| `isVisible()` | `boolean` | Whether the layout is displayed |
| `setNorth(child \| null)` | `void` | Set or clear north region |
| `setSouth(child \| null)` | `void` | Set or clear south region |
| `setEast(child \| null)` | `void` | Set or clear east region |
| `setWest(child \| null)` | `void` | Set or clear west region |
| `setCenter(child \| null)` | `void` | Set or clear center region |
| `collapseRegion(region)` | `void` | Collapse a collapsible region |
| `expandRegion(region)` | `void` | Expand a collapsed region |
| `getRegionElement(region)` | `HTMLElement \| null` | Grid cell for a region |
| `getState()` | `BorderLayoutState` | Serialisable state snapshot |
| `setState(state)` | `void` | Restore collapsed regions |
| `setContained(value)` | `void` | Set contained mode |

## BorderLayoutState

```typescript
interface BorderLayoutState {
    regions: Record<BorderRegion, boolean>;
    collapsed: BorderRegion[];
}
```

## Nesting Example

```js
// BorderLayout as an application shell
var appShell = createBorderLayout({
    north: toolbar,
    west: new BorderLayout({
        north: searchBox,
        center: treeView,
        south: userProfile,
        height: "100%"
    }),
    center: tabPanel,
    east: propertyInspector,
    south: statusBar,
    collapsible: ["west", "east"],
    height: "100vh"
});
```

## Global Exports

When loaded via `<script>` tag:

- `window.BorderLayout` — BorderLayout class
- `window.createBorderLayout` — Factory function (creates and shows)

## CSS Classes

| Class | Element | Description |
|-------|---------|-------------|
| `.borderlayout` | Root | CSS Grid container |
| `.borderlayout-north` | Cell | North (top) region |
| `.borderlayout-south` | Cell | South (bottom) region |
| `.borderlayout-east` | Cell | East (right) region |
| `.borderlayout-west` | Cell | West (left) region |
| `.borderlayout-center` | Cell | Center region |
| `.borderlayout-collapsed` | Cell | Collapsed region modifier |
