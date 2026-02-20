<!-- AGENT: Documentation for the SplitLayout component — draggable, resizable split pane container. -->

# SplitLayout

A split layout container that divides available space into two or more panes separated by draggable dividers. Supports horizontal/vertical orientation, pane collapsing, nested layouts, and state persistence via localStorage.

## Assets

| Asset | Path |
|-------|------|
| CSS | `dist/components/splitlayout/splitlayout.css` |
| JS | `dist/components/splitlayout/splitlayout.js` |
| Types | `dist/components/splitlayout/splitlayout.d.ts` |

## Requirements

- **Bootstrap CSS** — for SCSS variables (`$gray-*`, `$primary`, etc.)
- Does **not** require Bootstrap JS or Bootstrap Icons.

## Quick Start

```html
<link rel="stylesheet" href="dist/components/splitlayout/splitlayout.css">
<script src="dist/components/splitlayout/splitlayout.js"></script>
<script>
    var layout = createSplitLayout({
        orientation: "horizontal",
        panes: [
            { id: "left", initialSize: "30%", minSize: 200, collapsible: true },
            { id: "center", initialSize: "1fr" },
            { id: "right", initialSize: 300, collapsible: true }
        ]
    }, "my-container");

    // Add content to panes
    layout.getPaneElement("left").textContent = "Left pane";
    layout.getPaneElement("center").textContent = "Center pane";
    layout.getPaneElement("right").textContent = "Right pane";
</script>
```

## Options (SplitLayoutOptions)

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `orientation` | `"horizontal" \| "vertical"` | **required** | Split direction |
| `panes` | `SplitPaneConfig[]` | **required** | Pane definitions (minimum 2) |
| `dividerSize` | `number` | `4` | Divider thickness in pixels |
| `dividerStyle` | `"line" \| "dots" \| "handle"` | `"line"` | Visual style of dividers |
| `gutterColor` | `string` | — | CSS colour override for dividers |
| `cssClass` | `string` | — | Additional CSS classes |
| `persistKey` | `string` | — | localStorage key for automatic state persistence |
| `onResize` | `function` | — | Called with current sizes after resize |
| `onCollapse` | `function` | — | Called when a pane is collapsed/expanded |
| `onDividerDblClick` | `function` | — | Called on divider double-click |

## Pane Config (SplitPaneConfig)

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | `string` | **required** | Unique pane identifier |
| `content` | `HTMLElement` | — | Initial content element |
| `initialSize` | `number \| string` | equal split | Pixels, `"30%"`, or `"1fr"` |
| `minSize` | `number` | `50` | Minimum pane size in pixels |
| `maxSize` | `number` | `Infinity` | Maximum pane size in pixels |
| `collapsible` | `boolean` | `false` | Allow collapse via double-click or API |
| `collapsed` | `boolean` | `false` | Start collapsed |

## API

| Method | Returns | Description |
|--------|---------|-------------|
| `show(containerId?)` | `void` | Append to container (or body) |
| `hide()` | `void` | Remove from DOM, keep state |
| `destroy()` | `void` | Hide, clean up, null references |
| `getElement()` | `HTMLElement` | Root DOM element |
| `getPaneElement(paneId)` | `HTMLElement` | Content div for a pane |
| `setPaneContent(paneId, el)` | `void` | Replace pane content |
| `collapsePane(paneId)` | `void` | Collapse a pane |
| `expandPane(paneId)` | `void` | Expand a collapsed pane |
| `togglePane(paneId)` | `void` | Toggle collapse state |
| `getSizes()` | `Record<string, number>` | Current sizes in pixels |
| `setSizes(sizes)` | `void` | Apply sizes (clamped to min/max) |
| `setOrientation(dir)` | `void` | Switch horizontal/vertical |
| `addPane(config, index?)` | `void` | Insert a new pane |
| `removePane(paneId)` | `void` | Remove a pane (min 2 required) |
| `getState()` | `SplitLayoutState` | Serialisable snapshot |
| `setState(state)` | `void` | Restore from snapshot |

### Convenience Function

```typescript
createSplitLayout(options, containerId?)  // Create, show, and return
```

### Global Exports

```
window.SplitLayout
window.createSplitLayout
```

## Size Calculation

Initial sizes are resolved in priority order:
1. Persisted state from `persistKey` (if available)
2. Explicit `initialSize` values from pane config
3. Equal distribution of remaining space

Supports pixels (`200`), percentages (`"30%"`), and fractional units (`"1fr"`).

## Keyboard Accessibility

| Key | Action |
|-----|--------|
| Left/Right Arrow | Move divider 10px (horizontal) |
| Up/Down Arrow | Move divider 10px (vertical) |
| Home | Collapse the left/top adjacent pane |
| End | Collapse the right/bottom adjacent pane |
| Enter | Toggle collapse on the smaller adjacent pane |

## Accessibility

- Dividers have `role="separator"` with `aria-orientation`, `aria-valuenow/min/max`
- Panes have `role="region"` with `aria-label`
- Dividers are focusable via `tabindex="0"`
- No focus trapping — persistent layout container, not modal

## Examples

### Two-pane editor layout

```javascript
var layout = createSplitLayout({
    orientation: "horizontal",
    panes: [
        { id: "explorer", initialSize: 250, minSize: 180, collapsible: true },
        { id: "editor", initialSize: "1fr", minSize: 300 }
    ],
    persistKey: "editor-layout"
}, "app-container");
```

### Nested three-pane IDE layout

```javascript
var outer = createSplitLayout({
    orientation: "horizontal",
    panes: [
        { id: "sidebar", initialSize: "20%", collapsible: true },
        { id: "main", initialSize: "1fr" }
    ]
}, "ide-container");

var inner = new SplitLayout({
    orientation: "vertical",
    panes: [
        { id: "editor", initialSize: "70%", minSize: 200 },
        { id: "terminal", initialSize: "30%", minSize: 100, collapsible: true }
    ]
});

outer.setPaneContent("main", inner.getElement());
inner.show();
```

See `specs/splitlayout.prd.md` for the complete specification.
