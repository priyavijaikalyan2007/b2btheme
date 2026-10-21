<!-- AGENT: Documentation for the FlowLayout component — wrapping flex layout container. -->

# FlowLayout

A wrapping flex layout container that arranges children sequentially and wraps to the next line when the boundary is reached. Supports configurable gap, alignment, content distribution, and separate row/column gaps.

## Assets

| Asset | Path |
|-------|------|
| CSS | `components/flowlayout/flowlayout.css` |
| JS | `components/flowlayout/flowlayout.js` |
| Types | `components/flowlayout/flowlayout.d.ts` |

## Requirements

- **Bootstrap CSS** — for SCSS variables (`$gray-*`, `$font-size-*`, etc.)
- Does **not** require Bootstrap JS.

## Quick Start

```html
<link rel="stylesheet" href="components/flowlayout/flowlayout.css">
<script src="components/flowlayout/flowlayout.js"></script>

<script>
    var tags = ["JavaScript", "TypeScript", "CSS", "HTML", "React", "Vue"];
    var children = tags.map(function(tag) {
        var el = document.createElement("span");
        el.className = "badge bg-primary";
        el.textContent = tag;
        return el;
    });

    var layout = createFlowLayout({
        direction: "horizontal",
        gap: 8,
        align: "center",
        children: children
    });
</script>
```

## How It Works

FlowLayout creates a CSS Flexbox container with `flex-wrap: wrap`. Children are placed sequentially along the primary axis and wrap to new lines when they exceed the container boundary.

```
direction: "horizontal", gap: 8
┌─────────────────────────────────────────────┐
│ [Tag 1] [Tag 2] [Tag 3] [Tag 4] [Tag 5]   │
│ [Tag 6] [Tag 7] [Tag 8]                    │
└─────────────────────────────────────────────┘
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | `string` | auto | Custom element ID |
| `direction` | `"horizontal" \| "vertical"` | `"horizontal"` | Primary flow direction |
| `children` | `Array<HTMLElement \| Component>` | `[]` | Initial children |
| `gap` | `number \| string` | `"0"` | Gap between children |
| `rowGap` | `number \| string` | — | Override gap for rows |
| `columnGap` | `number \| string` | — | Override gap for columns |
| `align` | `"start" \| "center" \| "end" \| "stretch" \| "baseline"` | `"stretch"` | Per-line cross-axis alignment |
| `justify` | `"start" \| "center" \| "end" \| "space-between" \| "space-around" \| "space-evenly"` | `"start"` | Main-axis distribution |
| `alignContent` | `"start" \| "center" \| "end" \| "stretch" \| "space-between" \| "space-around"` | `"start"` | Distribution of lines |
| `padding` | `string` | — | Container padding |
| `cssClass` | `string` | — | Additional CSS classes |
| `height` | `string` | — | Height CSS value |
| `width` | `string` | — | Width CSS value |
| `onLayoutChange` | `(state) => void` | — | Fired on resize events |

## Public API

| Method | Returns | Description |
|--------|---------|-------------|
| `show(container?)` | `void` | Append to container and display |
| `hide()` | `void` | Remove from DOM (preserves state) |
| `destroy()` | `void` | Full cleanup, destroy all children |
| `getRootElement()` | `HTMLElement \| null` | The root flex container |
| `isVisible()` | `boolean` | Whether the layout is displayed |
| `addChild(child, index?)` | `void` | Add a child at optional index |
| `removeChild(index)` | `void` | Remove child by index |
| `clear()` | `void` | Remove all children |
| `getChildCount()` | `number` | Number of children |
| `getChildElement(index)` | `HTMLElement \| null` | Wrapper element at index |
| `getState()` | `FlowLayoutState` | Serialisable state snapshot |
| `setState(state)` | `void` | Restore state (direction) |

## Global Exports

When loaded via `<script>` tag:

- `window.createFlowLayout` — Factory function (creates and shows)

## CSS Classes

| Class | Element | Description |
|-------|---------|-------------|
| `.flowlayout` | Root | Flex-wrap container |
| `.flowlayout-child` | Wrapper | Per-child wrapper |

### `contained` is not implemented, deliberately

`setContained(value)` was removed on 2026-10-21 (DEBT-LAY-1, ADR-212).
`contained` means "fill the parent instead of `document.body`", and this
layout has no body-append path — it always fills the element it was
given — so the field existed, the setter assigned it, and nothing ever
read it. The method was documented here as "Set contained mode" and set
nothing.

The slot protocol is duck-typed (`if (typeof child.setContained ===
"function")`), so not implementing the method is how a component
correctly answers "I do not have that capability". Implementing it as a
no-op answered the opposite. Pinned by
`components/docklayout/contained-protocol.test.ts`.
