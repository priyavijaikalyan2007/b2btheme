<!-- AGENT: Documentation for the BoxLayout component — single-axis flex layout container. -->

# BoxLayout

A single-axis flex layout container that arranges children sequentially along one axis (horizontal or vertical) with configurable flex factors, alignment, and gap. Inspired by Java Swing BoxLayout, WPF StackPanel, and CSS Flexbox.

## Assets

| Asset | Path |
|-------|------|
| CSS | `components/boxlayout/boxlayout.css` |
| JS | `components/boxlayout/boxlayout.js` |
| Types | `components/boxlayout/boxlayout.d.ts` |

## Requirements

- **Bootstrap CSS** — for SCSS variables (`$gray-*`, `$font-size-*`, etc.)
- Does **not** require Bootstrap JS.

## Quick Start

```html
<link rel="stylesheet" href="components/boxlayout/boxlayout.css">
<script src="components/boxlayout/boxlayout.js"></script>

<script>
    var layout = createBoxLayout({
        direction: "horizontal",
        gap: 8,
        align: "stretch",
        height: "100%",
        children: [
            { child: document.getElementById("sidebar"), flex: 0, minSize: 200 },
            { child: document.getElementById("content"), flex: 1 }
        ]
    });
</script>
```

## How It Works

BoxLayout creates a CSS Flexbox container. Children are arranged sequentially along the main axis (row or column). Each child can be assigned a flex factor to consume proportional remaining space, or it can use its natural size.

```
direction: "horizontal"
┌──────────┬────────────────────────────────┬──────────┐
│ flex: 0  │          flex: 1               │ flex: 0  │
│ (200px)  │    (fills remaining space)     │ (auto)   │
└──────────┴────────────────────────────────┴──────────┘

direction: "vertical"
┌──────────────────────────────────────────────────────┐
│ flex: 0 (auto height)                                │
├──────────────────────────────────────────────────────┤
│                                                      │
│ flex: 1 (fills remaining space)                      │
│                                                      │
├──────────────────────────────────────────────────────┤
│ flex: 0 (auto height)                                │
└──────────────────────────────────────────────────────┘
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | `string` | auto | Custom element ID |
| `direction` | `"horizontal" \| "vertical"` | — | Main axis direction (required) |
| `children` | `BoxLayoutChildConfig[]` | `[]` | Initial children |
| `gap` | `number \| string` | `"0"` | Gap between children (px or CSS value) |
| `align` | `"start" \| "center" \| "end" \| "stretch" \| "baseline"` | `"stretch"` | Cross-axis alignment |
| `justify` | `"start" \| "center" \| "end" \| "space-between" \| "space-around" \| "space-evenly"` | `"start"` | Main-axis distribution |
| `padding` | `string` | — | Container padding (CSS value) |
| `cssClass` | `string` | — | Additional CSS classes |
| `height` | `string` | — | Height CSS value |
| `width` | `string` | — | Width CSS value |
| `onLayoutChange` | `(state) => void` | — | Fired on resize events |

### BoxLayoutChildConfig

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `child` | `HTMLElement \| Component` | — | Child element or component |
| `flex` | `number` | `0` | Flex grow factor. 0 = natural size |
| `minSize` | `number` | — | Minimum size in px along main axis |
| `maxSize` | `number` | — | Maximum size in px along main axis |
| `alignSelf` | `"start" \| "center" \| "end" \| "stretch" \| "baseline"` | — | Cross-axis alignment override |

## Public API

| Method | Returns | Description |
|--------|---------|-------------|
| `show(container?)` | `void` | Append to container and display |
| `hide()` | `void` | Remove from DOM (preserves state) |
| `destroy()` | `void` | Full cleanup, destroy all children |
| `getRootElement()` | `HTMLElement \| null` | The root flex container |
| `isVisible()` | `boolean` | Whether the layout is displayed |
| `addChild(config, index?)` | `void` | Add a child at optional index |
| `removeChild(index)` | `void` | Remove child by index |
| `getChildCount()` | `number` | Number of children |
| `getChildElement(index)` | `HTMLElement \| null` | Wrapper element at index |
| `getState()` | `BoxLayoutState` | Serialisable state snapshot |
| `setState(state)` | `void` | Restore state (direction) |
| `setContained(value)` | `void` | Set contained mode |

## BoxLayoutState

```typescript
interface BoxLayoutState {
    direction: "horizontal" | "vertical";
    childCount: number;
}
```

## Composability

BoxLayout implements the standard layout container contract. Any component with `show(container)` / `hide()` / `destroy()` can be used as a child. Plain HTMLElements are also supported.

```js
// Nest a BoxLayout inside a BorderLayout
var innerBox = new BoxLayout({
    direction: "horizontal",
    gap: 8,
    children: [
        { child: buttonA, flex: 0 },
        { child: spacer, flex: 1 },
        { child: buttonB, flex: 0 }
    ]
});

borderLayout.setNorth(innerBox);
```

## Global Exports

When loaded via `<script>` tag:

- `window.BoxLayout` — BoxLayout class
- `window.createBoxLayout` — Factory function (creates and shows)

## CSS Classes

| Class | Element | Description |
|-------|---------|-------------|
| `.boxlayout` | Root | Flex container |
| `.boxlayout-child` | Wrapper | Per-child flex wrapper |
