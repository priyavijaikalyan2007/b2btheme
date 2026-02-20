<!-- AGENT: Product Requirements Document for the SplitLayout component — draggable, resizable split pane container with nested layout support. -->

# SplitLayout Component

**Status:** Draft
**Component name:** SplitLayout
**Folder:** `./components/splitlayout/`
**Spec author:** Agent
**Date:** 2026-02-20

---

## 1. Overview

### 1.1 What Is It

A split layout container that divides available space into two or more panes separated by draggable dividers. The component supports horizontal (side-by-side) and vertical (stacked) orientations, configurable per-pane minimum and maximum size constraints, pane collapsing via double-click or programmatic API, and nested splits where any pane can contain another SplitLayout instance. Pane sizes can be specified in pixels, percentages, or fractional units, and layout state is persistable via `getState()` / `setState()` for saving and restoring pane ratios across sessions.

### 1.2 Why Build It

Enterprise SaaS applications frequently need resizable multi-pane layouts for:

- Code editors with side-by-side file comparison (like VS Code split editor)
- Email clients with folder tree, message list, and reading pane
- IDE layouts with explorer, editor, and terminal regions
- Dashboard builders with configurable panel sizes
- Master-detail views where the detail pane adjusts to user preference
- Data tools with query editor, results table, and schema browser

Without a dedicated component, developers build bespoke splitter implementations with inconsistent drag behaviour, accessibility, size persistence, and nested layout support. A reusable, programmable split layout solves all these problems.

### 1.3 Design Inspiration

| Source | Key Pattern Adopted |
|--------|---------------------|
| VS Code Editor Splits | Horizontal and vertical splits, nested layouts, drag-to-resize dividers |
| CodeSandbox | Editor + preview split with draggable divider |
| Chrome DevTools | Resizable panels (Elements + Styles side-by-side) |
| Figma Layers Panel | Resizable sidebar boundary with snap-to-collapse |
| Email clients (Outlook, Thunderbird) | Three-pane folder/messages/reading layout |
| JavaFX SplitPane | Programmatic divider positions, min/max constraints, orientation toggle |
| WPF GridSplitter | Grid-based split with pixel and star-sized columns |
| Qt QSplitter | Collapsible panes, nested splitters, state serialisation |

---

## 2. Anatomy

### 2.1 Horizontal Split (Side-by-Side)

```
┌─────────────┬──┬─────────────────────┬──┬────────────┐
│   Pane A     │▐│     Pane B           │▐│  Pane C     │
│              │▐│                      │▐│             │
│              │▐│                      │▐│             │
│              │▐│                      │▐│             │
└─────────────┴──┴─────────────────────┴──┴────────────┘
               ↔ divider (drag left/right)
```

### 2.2 Vertical Split (Stacked)

```
┌──────────────────────────────────────────────────────┐
│                      Pane A                           │
├══════════════════════════════════════════════════════╡  ← divider (drag up/down)
│                      Pane B                           │
└──────────────────────────────────────────────────────┘
```

### 2.3 Nested Split

```
┌─────────────┬──┬──────────────────────────────────────┐
│              │▐│┌────────────────────────────────────┐│
│   Pane A     │▐││            Pane B1                 ││
│              │▐│├════════════════════════════════════╡│ ← nested vertical divider
│              │▐││            Pane B2                 ││
│              │▐│└────────────────────────────────────┘│
└─────────────┴──┴──────────────────────────────────────┘
```

### 2.4 Element Breakdown

| Element | Required | Description |
|---------|----------|-------------|
| Root container | Yes | Flex container holding all panes and dividers |
| Pane | Yes (2+) | Content region with configurable size constraints |
| Divider | Yes (1+) | Draggable separator between adjacent panes |

---

## 3. API

### 3.1 Interfaces

```typescript
interface SplitPaneConfig
{
    /** Unique identifier for this pane. */
    id: string;

    /** Optional content element to place inside the pane. */
    content?: HTMLElement;

    /** Initial size: number (px), string ("30%"), or "1fr". Default: equal split. */
    initialSize?: number | string;

    /** Minimum pane size in pixels. Default: 50. */
    minSize?: number;

    /** Maximum pane size in pixels. Default: Infinity. */
    maxSize?: number;

    /** Whether the pane can be collapsed by double-clicking the divider. Default: false. */
    collapsible?: boolean;

    /** Whether the pane starts in a collapsed state. Default: false. */
    collapsed?: boolean;
}

interface SplitLayoutOptions
{
    /** Split direction: side-by-side or stacked. */
    orientation: "horizontal" | "vertical";

    /** Pane definitions, in order. Minimum two panes required. */
    panes: SplitPaneConfig[];

    /** Divider thickness in pixels. Default: 4. */
    dividerSize?: number;

    /** Visual style of the divider. Default: "line". */
    dividerStyle?: "line" | "dots" | "handle";

    /** CSS colour for the divider. Overrides theme default. */
    gutterColor?: string;

    /** Called during and after resize with current pane sizes. */
    onResize?: (sizes: Record<string, number>) => void;

    /** Called when a pane is collapsed or expanded. */
    onCollapse?: (paneId: string, collapsed: boolean) => void;

    /** Called when a divider is double-clicked. */
    onDividerDblClick?: (paneId: string) => void;

    /** Additional CSS class(es) for the root element. */
    cssClass?: string;

    /** localStorage key for automatic size persistence. */
    persistKey?: string;
}

interface SplitLayoutState
{
    /** Orientation at time of capture. */
    orientation: "horizontal" | "vertical";

    /** Ordered pane sizes in pixels. Keyed by pane ID. */
    sizes: Record<string, number>;

    /** Collapsed state per pane. Keyed by pane ID. */
    collapsed: Record<string, boolean>;
}
```

### 3.2 Class: SplitLayout

| Method | Description |
|--------|-------------|
| `constructor(options)` | Creates the split layout DOM tree but does not attach to the page. |
| `show(containerId?)` | Appends to the element with `containerId`, or `document.body` if omitted. |
| `hide()` | Removes the layout from the DOM without destroying state. |
| `destroy()` | Hides, releases all pointer-capture listeners, and nulls all references. |
| `getElement()` | Returns the root DOM element. |
| `getPaneElement(paneId)` | Returns the content `<div>` for the given pane, for appending children. |
| `setPaneContent(paneId, element)` | Replaces the content of a pane with the given element. |
| `collapsePane(paneId)` | Collapses a pane to zero visible size (respects `collapsible` flag). |
| `expandPane(paneId)` | Expands a previously collapsed pane to its last known size. |
| `togglePane(paneId)` | Toggles a pane between collapsed and expanded. |
| `getSizes()` | Returns current pane sizes as `Record<string, number>` in pixels. |
| `setSizes(sizes)` | Applies pane sizes from a `Record<string, number>`. Clamped to min/max. |
| `setOrientation(dir)` | Switches between `"horizontal"` and `"vertical"` orientation. |
| `addPane(config, index?)` | Inserts a new pane at the given index (end if omitted). Adds a divider. |
| `removePane(paneId)` | Removes a pane and its adjacent divider. Redistributes freed space. |
| `getState()` | Returns a serialisable `SplitLayoutState` snapshot. |
| `setState(state)` | Restores sizes and collapsed states from a `SplitLayoutState` object. |

### 3.3 Globals

```typescript
window.SplitLayout = SplitLayout;
window.createSplitLayout = createSplitLayout;
```

`createSplitLayout(options)` is a convenience function that creates and shows in one call.

---

## 4. Behaviour

### 4.1 Lifecycle

1. **Construction** -- Builds the DOM tree from `options.panes` but does not attach to the page. If `persistKey` is set and a saved state exists in `localStorage`, that state is restored.
2. **show(containerId?)** -- Appends to the target container, calculates initial sizes, and registers event listeners.
3. **hide()** -- Removes from DOM without destroying state. If `persistKey` is set, persists current state.
4. **destroy()** -- Calls `hide()`, removes all pointer-capture event listeners, nulls all references.

### 4.2 Size Calculation

Initial sizes are resolved in the following priority order:

1. Restored state from `persistKey` (if available).
2. Explicit `initialSize` values from `SplitPaneConfig`.
3. Equal distribution of remaining space.

Pixel values are used directly. Percentage values are resolved against the container dimension. Fractional (`"1fr"`) values share remaining space proportionally after fixed and percentage panes are allocated.

### 4.3 Divider Drag

- Uses `setPointerCapture` on `pointerdown`, tracks position on `pointermove`, releases on `pointerup` (ADR-031 pointer-capture drag pattern).
- `touch-action: none` on dividers to prevent scroll interference on touch devices.
- During drag, the two adjacent panes resize inversely: one grows by the same amount the other shrinks.
- Sizes are clamped to each pane's `minSize` and `maxSize` constraints.
- `requestAnimationFrame` throttles visual updates to prevent layout thrashing.
- Fires `onResize` callback with all current pane sizes after each frame update.

### 4.4 Pane Collapse

- **Double-click divider** -- Collapses the smaller of the two adjacent panes (if it has `collapsible: true`). Fires `onDividerDblClick` then `onCollapse`.
- **Programmatic** -- `collapsePane(paneId)` / `expandPane(paneId)` / `togglePane(paneId)`.
- Collapsed panes animate to 0px width or height via `transition: flex-basis 200ms ease`.
- The freed space is distributed to the adjacent pane.
- A collapsed pane retains its pre-collapse size internally so `expandPane()` can restore it.
- Collapsed panes keep their DOM content intact; they are hidden via `overflow: hidden` and zero dimension.

### 4.5 Nested Splits

Any pane's content can be another `SplitLayout` instance. The consumer creates a child `SplitLayout` and calls `setPaneContent(paneId, childLayout.getElement())`. The child layout participates in its parent pane's sizing naturally via CSS flex.

### 4.6 Orientation Toggle

`setOrientation(dir)` switches the flex direction of the root container. All pane sizes are recalculated proportionally to the new axis dimension. Divider cursors update (`col-resize` for horizontal, `row-resize` for vertical).

### 4.7 State Persistence

- `getState()` returns a plain object with orientation, pane sizes (keyed by ID), and collapsed states.
- `setState(state)` applies sizes and collapsed states, clamped to current min/max constraints.
- If `persistKey` is set, state is automatically saved to `localStorage` on every resize completion, collapse, and `hide()`.
- On construction, if `persistKey` is set and a matching key exists, the stored state is restored (overriding `initialSize` values).

### 4.8 Dynamic Panes

- `addPane(config, index?)` inserts a new pane and divider at the specified position. Existing panes shrink proportionally to accommodate the new pane.
- `removePane(paneId)` removes the pane and its adjacent divider. Freed space is distributed to the neighbouring pane.
- Minimum of two panes is enforced. `removePane()` logs a warning and returns without action if only two panes remain.

---

## 5. Styling

### 5.1 CSS Classes

| Class | Element |
|-------|---------|
| `.splitlayout` | Root container -- flex row or column |
| `.splitlayout-horizontal` | Orientation modifier -- `flex-direction: row` |
| `.splitlayout-vertical` | Orientation modifier -- `flex-direction: column` |
| `.splitlayout-pane` | Individual pane -- flex item with `overflow: auto` |
| `.splitlayout-pane-collapsed` | Collapsed pane -- zero dimension, `overflow: hidden` |
| `.splitlayout-divider` | Divider base -- drag strip between panes |
| `.splitlayout-divider-horizontal` | Horizontal divider -- `cursor: col-resize` |
| `.splitlayout-divider-vertical` | Vertical divider -- `cursor: row-resize` |
| `.splitlayout-divider-line` | Divider style: thin line (default) |
| `.splitlayout-divider-dots` | Divider style: three centered dots |
| `.splitlayout-divider-handle` | Divider style: raised handle grip |
| `.splitlayout-divider-active` | Applied during drag for visual feedback |

### 5.2 Theme Integration

| Property | Value | Source |
|----------|-------|--------|
| Root background | `transparent` | Inherits from parent container |
| Pane background | `$gray-50` | Light, neutral content background |
| Pane overflow | `auto` | Scrollable content within panes |
| Divider background | `$gray-300` | Subtle separator |
| Divider hover | `$gray-400` | Visible drag affordance on hover |
| Divider active (dragging) | `$primary` | Clear feedback during drag |
| Divider dots colour | `$gray-500` | Visible but unobtrusive grip dots |
| Collapsed pane border | `1px solid $gray-300` | Indicates collapsed boundary |

### 5.3 SCSS Import

```scss
@import '../../src/scss/variables';
```

### 5.4 Dimensions

| Element | Size | Notes |
|---------|------|-------|
| Divider thickness | `dividerSize` option (default 4px) | Consistent with Sidebar and TabbedPanel resize handles |
| Divider hover hit area | 8px | Larger hit area via transparent padding for easier targeting |
| Default pane `minSize` | 50px | Prevents panes from becoming unusably small |
| Collapse transition | 200ms ease | Smooth but fast collapse animation |

---

## 6. Keyboard Interaction

When a divider element has focus (via Tab or click):

| Key | Action |
|-----|--------|
| **Left Arrow** | Move divider left by 10px (horizontal orientation) |
| **Right Arrow** | Move divider right by 10px (horizontal orientation) |
| **Up Arrow** | Move divider up by 10px (vertical orientation) |
| **Down Arrow** | Move divider down by 10px (vertical orientation) |
| **Home** | Collapse the left (horizontal) or top (vertical) adjacent pane |
| **End** | Collapse the right (horizontal) or bottom (vertical) adjacent pane |
| **Enter** | Toggle collapse on the smaller of the two adjacent panes |

Arrow key resizing is clamped to the `minSize` and `maxSize` constraints of both adjacent panes. Home and End only take effect if the target pane has `collapsible: true`.

---

## 7. Accessibility

### 7.1 ARIA Roles and Attributes

| Element | Attribute | Value |
|---------|-----------|-------|
| Divider | `role="separator"` | Identifies the element as a movable divider |
| Divider | `aria-orientation` | `"vertical"` (horizontal layout) or `"horizontal"` (vertical layout) |
| Divider | `aria-valuenow` | Current position in pixels from the start of the container |
| Divider | `aria-valuemin` | Minimum position (derived from left/top pane `minSize`) |
| Divider | `aria-valuemax` | Maximum position (derived from right/bottom pane `minSize`) |
| Divider | `tabindex="0"` | Focusable for keyboard interaction |
| Divider | `aria-label` | Descriptive label (e.g., "Resize between Pane A and Pane B") |
| Pane | `role="region"` | Landmark region for screen readers |
| Pane | `aria-label` | Pane identifier (e.g., "Pane A") |

### 7.2 Focus Management

- Dividers are focusable via `tabindex="0"` and participate in the natural tab order.
- No focus trapping -- the split layout is a persistent layout container, not a modal.
- `touch-action: none` on dividers prevents scroll interference on touch devices.
- `focus-visible` outlines on dividers for keyboard users.
- Sufficient colour contrast on dividers meets WCAG AA.

---

## 8. Dependencies

- **Bootstrap 5 CSS** -- for `$gray-*` variables in SCSS.
- No JavaScript framework dependencies.
- No external splitter libraries.

---

## 9. Open Questions

| # | Question | Impact |
|---|----------|--------|
| 1 | Should `persistKey` use `sessionStorage` as an alternative to `localStorage`? | Could add a `persistStorage` option if needed. |
| 2 | Should proportional resize (all panes resize on window resize) be opt-in or default? | Currently proportional is the default; a `fixedPanes` option could lock specific panes. |
| 3 | Should the component emit custom DOM events in addition to callback functions? | Would improve integration with vanilla JS consumers who prefer `addEventListener`. |
