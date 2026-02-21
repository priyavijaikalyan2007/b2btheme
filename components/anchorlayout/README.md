<!-- AGENT: Documentation for the AnchorLayout component — constraint-based absolute positioning layout container. -->

# AnchorLayout

A constraint-based layout container that positions children by declaring anchor relationships between child edges and container edges. Children stretch or float based on which edges are anchored. Uses CSS `position: relative` on the container and `position: absolute` on children. Inspired by Android ConstraintLayout, Qt AnchorLayout, and WPF Canvas with anchoring.

## Assets

| Asset | Path |
|-------|------|
| CSS | `components/anchorlayout/anchorlayout.css` |
| JS | `components/anchorlayout/anchorlayout.js` |
| Types | `components/anchorlayout/anchorlayout.d.ts` |

## Requirements

- **Bootstrap CSS** — for SCSS variables (`$gray-*`, `$font-size-*`, etc.)
- Does **not** require Bootstrap JS.

## Quick Start

```html
<link rel="stylesheet" href="components/anchorlayout/anchorlayout.css">
<script src="components/anchorlayout/anchorlayout.js"></script>

<script>
    // Pin a button to the bottom-right corner
    var saveBtn = document.createElement("button");
    saveBtn.textContent = "Save";
    saveBtn.className = "btn btn-primary";

    var layout = createAnchorLayout({
        height: "400px",
        width: "100%",
        children: [
            {
                child: saveBtn,
                anchorBottom: 16,
                anchorRight: 16
            }
        ]
    });
</script>
```

## How It Works

AnchorLayout creates a `position: relative` container. Each child is wrapped in a `position: absolute` div whose `top`, `bottom`, `left`, `right`, and `transform` properties are set based on anchor declarations.

```
Container (position: relative)
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  anchorTop: 10 ──────────────────── anchorTop: 10        │
│  anchorLeft: 10                     anchorRight: 10      │
│  ┌──────────┐                       ┌──────────┐        │
│  │ Child A  │                       │ Child B  │        │
│  │ (floats  │                       │ (floats  │        │
│  │  top-left│                       │ top-right│        │
│  └──────────┘                       └──────────┘        │
│                                                          │
│                  ┌──────────┐                            │
│                  │ Child C  │ anchorCenterH: 0           │
│                  │ (centered│ anchorCenterV: 0           │
│                  │  both)   │                            │
│                  └──────────┘                            │
│                                                          │
│  anchorTop: 0    ┌────────────────────────────┐          │
│  anchorBottom: 0 │ Child D (stretches         │          │
│  anchorLeft: 0   │  to fill — all 4 edges     │          │
│                  │  anchored)                  │          │
│                  └────────────────────────────┘          │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

## Options

### AnchorLayoutOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | `string` | auto | Custom element ID |
| `children` | `AnchorChildConfig[]` | `[]` | Initial children with anchor constraints |
| `padding` | `string` | — | Container padding (CSS value) |
| `cssClass` | `string` | — | Additional CSS classes |
| `height` | `string` | — | Height CSS value |
| `width` | `string` | — | Width CSS value |
| `onLayoutChange` | `(state) => void` | — | Fired on resize events |

### AnchorChildConfig

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `child` | `HTMLElement \| Component` | — | Child element or component |
| `anchorTop` | `number \| string` | — | Offset from top edge (px or CSS value) |
| `anchorBottom` | `number \| string` | — | Offset from bottom edge |
| `anchorLeft` | `number \| string` | — | Offset from left edge |
| `anchorRight` | `number \| string` | — | Offset from right edge |
| `anchorCenterH` | `number \| string` | — | Center horizontally with optional offset |
| `anchorCenterV` | `number \| string` | — | Center vertically with optional offset |
| `minWidth` | `number \| string` | — | Minimum width constraint |
| `maxWidth` | `number \| string` | — | Maximum width constraint |
| `minHeight` | `number \| string` | — | Minimum height constraint |
| `maxHeight` | `number \| string` | — | Maximum height constraint |

## Anchor Rules

### Dual-Edge Stretching

When both opposing edges are anchored, the child stretches to fill the space between them.

```js
// Stretches horizontally between 10px from left and 10px from right
{ child: panel, anchorLeft: 10, anchorRight: 10 }

// Stretches both directions — fills the entire container with 20px margin
{ child: overlay, anchorTop: 20, anchorBottom: 20, anchorLeft: 20, anchorRight: 20 }
```

### Single-Edge Floating

When only one edge is anchored, the child floats at that offset and uses its natural size.

```js
// Floats at top-left corner
{ child: logo, anchorTop: 0, anchorLeft: 0 }

// Floats at bottom-right with 16px inset
{ child: fab, anchorBottom: 16, anchorRight: 16 }
```

### Center Anchoring

Use `anchorCenterH` and `anchorCenterV` to center a child along one or both axes. The value is an optional offset from center.

```js
// Centered both horizontally and vertically
{ child: spinner, anchorCenterH: 0, anchorCenterV: 0 }

// Centered horizontally, 30px from top
{ child: title, anchorCenterH: 0, anchorTop: 30 }

// Centered vertically with 20px rightward offset
{ child: sidebar, anchorCenterV: 0, anchorCenterH: 20 }
```

**Note:** Center anchoring uses CSS `transform: translate()`. When both `anchorCenterH` and `anchorCenterV` are set, they combine into a single `translate(-50%, -50%)`. Non-zero offsets are applied via `margin-left` or `margin-top`.

## Public API

| Method | Returns | Description |
|--------|---------|-------------|
| `show(container?)` | `void` | Append to container and display |
| `hide()` | `void` | Remove from DOM (preserves state) |
| `destroy()` | `void` | Full cleanup, destroy all children |
| `getRootElement()` | `HTMLElement \| null` | The root container |
| `isVisible()` | `boolean` | Whether the layout is displayed |
| `setContained(value)` | `void` | Set contained mode |
| `addChild(config)` | `void` | Add a child with anchor constraints |
| `removeChild(index)` | `void` | Remove child by index |
| `updateAnchors(index, anchors)` | `void` | Update anchor constraints for a child |
| `getChildCount()` | `number` | Number of children |
| `getState()` | `AnchorLayoutState` | Serialisable state snapshot |
| `setState(state)` | `void` | No-op (anchors are config-driven) |

## AnchorLayoutState

```typescript
interface AnchorLayoutState {
    childCount: number;
}
```

## Composability

AnchorLayout implements the standard layout container contract. Any component with `show(container)` / `hide()` / `destroy()` can be used as a child. Plain HTMLElements are also supported.

```js
// Pin a toolbar at the top, a status bar at the bottom,
// and fill the center with a content panel
var layout = new AnchorLayout({
    height: "100vh",
    width: "100%",
    children: [
        { child: toolbar, anchorTop: 0, anchorLeft: 0, anchorRight: 0 },
        { child: content, anchorTop: 48, anchorBottom: 32, anchorLeft: 0, anchorRight: 0 },
        { child: statusBar, anchorBottom: 0, anchorLeft: 0, anchorRight: 0 }
    ]
});
```

## Global Exports

When loaded via `<script>` tag:

- `window.AnchorLayout` — AnchorLayout class
- `window.createAnchorLayout` — Factory function (creates and shows)

## CSS Classes

| Class | Element | Description |
|-------|---------|-------------|
| `.anchorlayout` | Root | Relative-positioned container |
| `.anchorlayout-child` | Wrapper | Absolute-positioned child wrapper |
