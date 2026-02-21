<!-- AGENT: Documentation for the CardLayout component — indexed-stack layout with transitions. -->

# CardLayout

An indexed-stack layout container that stacks all children in the same space but displays only one at a time. Supports animated transitions (fade, slide) between cards, lazy loading, and keyboard navigation via `next()`/`previous()`.

## Assets

| Asset | Path |
|-------|------|
| CSS | `components/cardlayout/cardlayout.css` |
| JS | `components/cardlayout/cardlayout.js` |
| Types | `components/cardlayout/cardlayout.d.ts` |

## Requirements

- **Bootstrap CSS** — for SCSS variables (`$gray-*`, `$font-size-*`, etc.)
- Does **not** require Bootstrap JS.

## Quick Start

```html
<link rel="stylesheet" href="components/cardlayout/cardlayout.css">
<script src="components/cardlayout/cardlayout.js"></script>

<script>
    var step1 = document.createElement("div");
    step1.innerHTML = "<h2>Step 1</h2><p>Enter your details</p>";

    var step2 = document.createElement("div");
    step2.innerHTML = "<h2>Step 2</h2><p>Choose your plan</p>";

    var step3 = document.createElement("div");
    step3.innerHTML = "<h2>Step 3</h2><p>Confirm and submit</p>";

    var wizard = createCardLayout({
        activeKey: "step1",
        transition: "slide-left",
        transitionDuration: 200,
        height: "400px",
        cards: [
            { key: "step1", child: step1 },
            { key: "step2", child: step2 },
            { key: "step3", child: step3 }
        ]
    });

    // Navigate programmatically
    document.getElementById("nextBtn").onclick = function() {
        wizard.next();
    };
</script>
```

## How It Works

CardLayout creates a container where all card wrappers are stacked. Only the active card has `display: block`; all others have `display: none`. When switching cards, CSS animation classes are applied for the transition duration, then cleaned up.

```
┌──────────────────────────────────┐
│                                  │
│         Active Card              │   ← visible (display: block)
│       (e.g. "step2")            │
│                                  │
├──────────────────────────────────┤
│  Card "step1" (display: none)   │   ← hidden
│  Card "step3" (display: none)   │   ← hidden
└──────────────────────────────────┘
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | `string` | auto | Custom element ID |
| `activeKey` | `string` | first card | Key of initially active card |
| `cards` | `CardConfig[]` | `[]` | Initial cards |
| `sizing` | `"largest" \| "active" \| "fixed"` | `"active"` | Container sizing strategy |
| `transition` | `"none" \| "fade" \| "slide-left" \| "slide-up"` | `"none"` | Transition animation |
| `transitionDuration` | `number` | `200` | Animation duration in ms |
| `preserveState` | `boolean` | `true` | Retain inactive card state |
| `padding` | `string` | — | Container padding |
| `cssClass` | `string` | — | Additional CSS classes |
| `height` | `string` | — | Height CSS value |
| `width` | `string` | — | Width CSS value |
| `onLayoutChange` | `(state) => void` | — | Fired on card switch/resize |

### CardConfig

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `key` | `string` | — | Unique card identifier (required) |
| `child` | `HTMLElement \| Component` | — | Card content (required) |
| `lazyLoad` | `boolean` | `false` | Defer mounting until first activation |

## Public API

| Method | Returns | Description |
|--------|---------|-------------|
| `show(container?)` | `void` | Append to container and display |
| `hide()` | `void` | Remove from DOM (preserves state) |
| `destroy()` | `void` | Full cleanup, destroy all cards |
| `getRootElement()` | `HTMLElement \| null` | The root container |
| `isVisible()` | `boolean` | Whether the layout is displayed |
| `addCard(config)` | `void` | Add a new card |
| `removeCard(key)` | `void` | Remove card by key |
| `setActiveCard(key)` | `void` | Switch to card by key |
| `getActiveCard()` | `string \| null` | Key of the active card |
| `next()` | `void` | Activate next card (wraps) |
| `previous()` | `void` | Activate previous card (wraps) |
| `getCardCount()` | `number` | Number of cards |
| `getState()` | `CardLayoutState` | Serialisable state snapshot |
| `setState(state)` | `void` | Restore active card |
| `setContained(value)` | `void` | Set contained mode |

## CardLayoutState

```typescript
interface CardLayoutState {
    activeKey: string | null;
    cardCount: number;
}
```

## Transitions

All transitions respect `prefers-reduced-motion: reduce` — when enabled, transitions are disabled and cards switch immediately.

| Transition | Description |
|-----------|-------------|
| `"none"` | Instant switch, no animation |
| `"fade"` | Outgoing card fades out, incoming fades in |
| `"slide-left"` | Outgoing slides left, incoming slides in from right |
| `"slide-up"` | Outgoing slides up, incoming slides in from bottom |

## Global Exports

When loaded via `<script>` tag:

- `window.CardLayout` — CardLayout class
- `window.createCardLayout` — Factory function (creates and shows)

## CSS Classes

| Class | Element | Description |
|-------|---------|-------------|
| `.cardlayout` | Root | Stack container |
| `.cardlayout-card` | Wrapper | Per-card wrapper |
| `.cardlayout-enter-fade` | Card | Fade-in animation |
| `.cardlayout-exit-fade` | Card | Fade-out animation |
| `.cardlayout-enter-slide-left` | Card | Slide-in from right |
| `.cardlayout-exit-slide-left` | Card | Slide-out to left |
| `.cardlayout-enter-slide-up` | Card | Slide-in from bottom |
| `.cardlayout-exit-slide-up` | Card | Slide-out upward |
