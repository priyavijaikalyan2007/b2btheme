<!-- AGENT: Product Requirements Document for the SkeletonLoader component — animated placeholder mimicking content layout during loading. -->

# SkeletonLoader Component — Product Requirements

**Status:** Draft
**Component name:** SkeletonLoader
**Folder:** `./components/skeletonloader/`
**Spec author:** Agent
**Date:** 2026-02-20

---

## 1. Overview

### 1.1 What Is It

An animated placeholder component that mimics the visual layout of content while it loads. The SkeletonLoader renders lightweight grey blocks with a CSS shimmer animation, giving users an immediate structural preview of the page before real data arrives. This reduces perceived load time and prevents jarring content shifts.

The component is intentionally **CSS-heavy with minimal JavaScript**. The TypeScript layer provides a declarative API to generate DOM elements; all visual presentation — block shapes, shimmer animation, sizing, and spacing — is handled entirely by SCSS.

**Six presets:**

- **text** — Multiple horizontal lines of varying widths, simulating a text paragraph.
- **avatar** — A single square or circular block, simulating a profile picture or icon.
- **card** — A tall image block followed by text lines, simulating a content card.
- **table** — A grid of cells arranged in rows and columns, simulating tabular data.
- **paragraph** — Similar to text but with tighter spacing and more uniform widths, simulating a dense text block.
- **custom** — A single block with arbitrary width and height, for bespoke layouts.

### 1.2 Why Build It

Enterprise SaaS applications frequently load data asynchronously — API calls, server-rendered panels, lazy-loaded modules. Without skeleton placeholders, users see either:

- Empty white space (confusing — "is it broken?")
- Spinner icons (uninformative — no structural hint of what is coming)
- Content layout shifts (disorienting — elements jump as data arrives)

Skeleton loaders solve all three problems by providing a structural preview that matches the final content layout. This is a well-established pattern used by Facebook, LinkedIn, YouTube, Slack, and every major SaaS application.

No existing open-source skeleton library provides a Bootstrap 5 compatible, vanilla TypeScript component with IIFE wrapping, zero border-radius defaults, and the project's SCSS variable integration. Building custom ensures alignment with the architecture.

### 1.3 Design Inspiration

| Source | Key Pattern Adopted |
|--------|---------------------|
| Facebook loading placeholders | Shimmer animation across grey blocks |
| LinkedIn content loading | Card skeleton with image block + text lines |
| IBM Carbon Skeleton | Configurable presets (text, avatar, table) |
| Material UI Skeleton | Wave animation, variant-based API |
| Ant Design Skeleton | Paragraph preset with varying line widths |
| YouTube loading cards | Card preset with thumbnail + metadata lines |

### 1.4 Open Source Evaluation

| Library | Verdict | Reason |
|---------|---------|--------|
| react-loading-skeleton | Not recommended | React dependency; no vanilla JS |
| vue-loading-skeleton | Not recommended | Vue dependency |
| @mantine/core Skeleton | Not recommended | React dependency; Mantine framework lock-in |
| skeleton-screen-css | Possible foundation | CSS-only, no JS API, no presets, no table support |
| placeholder-loading | Not recommended | CSS-only, no configurable API, no table preset |
| lottie-web skeleton | Not recommended | JSON animation dependency (100KB+), overkill for shimmer |

**Decision:** Build custom. The component is primarily CSS with a thin TypeScript API. Total implementation target is 130-160 lines of TypeScript. Use Bootstrap SCSS variables for theme integration. No external dependencies.

---

## 2. Use Cases

| Use Case | Preset | Example |
|----------|--------|---------|
| Loading a user profile header | avatar | Circle placeholder for profile picture |
| Loading a text article | text | 3-5 lines of varying width |
| Loading a dashboard card | card | Image block + title + subtitle + body line |
| Loading a data table | table | 5 rows x 4 columns of cell blocks |
| Loading a comment or description | paragraph | Dense block of uniform-width lines |
| Loading a custom chart area | custom | Single block at 100% x 200px |
| Loading a sidebar navigation | text | 6 narrow lines simulating nav items |
| Loading a form with fields | custom | Multiple stacked blocks of varying heights |

---

## 3. Anatomy

### 3.1 Text Preset

```
┌────────────────────────────────────────────────┐
│ ████████████████████████████████████████ (100%) │  <- shimmer line
│ ████████████████████████████████ (80%)          │
│ ██████████████████████████████████████ (90%)    │
└────────────────────────────────────────────────┘
```

Lines have varying widths to mimic natural text. The last line is typically shorter. Default: 3 lines.

### 3.2 Avatar Preset

```
┌──────────────────┐
│ ████████████████ │  <- square or circle block
│ ████████████████ │
│ ████████████████ │
│ ████████████████ │
└──────────────────┘
```

A single block. When `circle: true`, rendered with `border-radius: 50%`.

### 3.3 Card Preset

```
┌────────────────────────────────────────────────┐
│ ████████████████████████████████████████████████│  <- image block (height: 160px)
│ ████████████████████████████████████████████████│
│────────────────────────────────────────────────│
│ ████████████████████████████████████████ (100%) │  <- title line
│ ████████████████████████████████ (70%)          │  <- subtitle line
│ ██████████████████████████████████████ (85%)    │  <- body line
└────────────────────────────────────────────────┘
```

An image placeholder block followed by three text lines simulating a card title, subtitle, and body text.

### 3.4 Table Preset

```
┌──────────┬──────────┬──────────┬──────────┐
│ ████████ │ ████████ │ ████████ │ ████████ │  <- header row
├──────────┼──────────┼──────────┼──────────┤
│ ██████   │ ████████ │ ██████   │ ████     │
│ ████████ │ ██████   │ ████████ │ ██████   │
│ ██████   │ ████     │ ██████   │ ████████ │
│ ████████ │ ██████   │ ████     │ ██████   │
└──────────┴──────────┴──────────┴──────────┘
```

A grid layout with `rows` x `columns` cells. The first row uses full-width blocks (header). Subsequent rows use randomly varied widths (60%-100%) for visual realism.

### 3.5 Paragraph Preset

```
┌────────────────────────────────────────────────┐
│ ████████████████████████████████████████ (100%) │
│ ████████████████████████████████████████ (100%) │
│ ████████████████████████████████████████ (100%) │
│ ████████████████████████████████████████ (100%) │
│ ██████████████████████████████ (75%)            │  <- last line shorter
└────────────────────────────────────────────────┘
```

Similar to text but with full-width lines except the last, simulating a dense paragraph block.

### 3.6 Custom Preset

```
┌────────────────────────────────────────────────┐
│ ████████████████████████████████████████████████│  <- single block
│ ████████████████████████████████████████████████│
│ ████████████████████████████████████████████████│
└────────────────────────────────────────────────┘
```

A single block with consumer-specified `width` and `height`.

### 3.7 Element Breakdown

| Element | Preset | Required | Description |
|---------|--------|----------|-------------|
| Root container | All | Yes | `role="status"`, `aria-busy="true"`, `aria-label="Loading content"` |
| Shimmer line | text, paragraph, card | Yes | Horizontal block with shimmer animation |
| Image block | card | Yes | Tall rectangular block simulating an image |
| Avatar block | avatar | Yes | Square or circular block |
| Table grid | table | Yes | CSS Grid container for cell blocks |
| Table cell | table | Yes | Individual cell block within the grid |
| Custom block | custom | Yes | Single block with arbitrary dimensions |

---

## 4. API

### 4.1 Interfaces

```typescript
/**
 * Configuration options for the SkeletonLoader component.
 */
interface SkeletonLoaderOptions
{
    /** Visual preset determining the placeholder layout. Default: "text". */
    preset?: "text" | "avatar" | "card" | "table" | "paragraph" | "custom";

    /** Number of lines for text and paragraph presets. Default: 3. */
    lines?: number;

    /** Number of rows for the table preset. Default: 5. */
    rows?: number;

    /** Number of columns for the table preset. Default: 4. */
    columns?: number;

    /** CSS width value for custom and avatar presets. Default: "100%". */
    width?: string;

    /** CSS height value for custom and avatar presets. Default: "1rem". */
    height?: string;

    /** CSS gap between lines/rows. Default: "0.5rem". */
    gap?: string;

    /** Enable shimmer animation. Default: true. */
    animate?: boolean;

    /** CSS border-radius. Default: "0" (enterprise square theme). */
    borderRadius?: string;

    /** Force circle shape for the avatar preset. Default: false. */
    circle?: boolean;

    /** Additional CSS class(es) on the root element. */
    cssClass?: string;
}
```

### 4.2 Class: SkeletonLoader

| Method | Description |
|--------|-------------|
| `constructor(options?)` | Creates the skeleton DOM tree based on preset and options. Does not attach to the page. |
| `show(containerId)` | Appends the skeleton to the container identified by `containerId`. If the container is not found, falls back to `document.body` with a console warning. |
| `hide()` | Removes the skeleton from the DOM without destroying state. |
| `destroy()` | Calls `hide()`, nulls all DOM references, sets destroyed flag. No further method calls are valid. |
| `getElement()` | Returns the root DOM element. |

### 4.3 Convenience Functions

| Function | Description |
|----------|-------------|
| `createSkeletonLoader(options?, containerId?)` | Create, show, and return a SkeletonLoader instance. |

### 4.4 Global Exports

```
window.SkeletonLoader
window.createSkeletonLoader
```

---

## 5. Behaviour

### 5.1 Lifecycle

1. **Construction** — Builds the DOM tree for the selected preset. Applies default option values. Does not attach to the page.
2. **show(containerId)** — Resolves the container element by ID, appends the skeleton root. Logs a warning and falls back to `document.body` if the container is not found.
3. **hide()** — Removes the skeleton from the DOM. Internal state is preserved for potential re-show.
4. **destroy()** — Calls `hide()`, nulls all DOM references, sets a `destroyed` flag. Subsequent method calls log a warning and are no-ops.

### 5.2 Preset Rendering

Each preset generates a specific DOM structure:

**text** — Creates `lines` number of `div.skeleton-line` elements. Widths vary to simulate natural text: lines cycle through 100%, 80%, 90%, 70%, 95% patterns. The last line is always shorter (60%).

**avatar** — Creates a single `div.skeleton-avatar` element. Width and height are set from options (default: `"3rem"` x `"3rem"` for avatar). When `circle: true`, the element receives the `.skeleton-circle` class which applies `border-radius: 50%`.

**card** — Creates a `div.skeleton-card-image` block (height: 160px) followed by three `div.skeleton-line` elements at 100%, 70%, and 85% widths, simulating a card image, title, subtitle, and body.

**table** — Creates a CSS Grid container (`div.skeleton-table`) with `columns` columns. The first row uses full-width cells. Subsequent rows use pseudo-random varied widths (60%-100%) for visual realism. Total cells: `rows * columns`.

**paragraph** — Creates `lines` number of `div.skeleton-line` elements. All lines are 100% width except the last, which is 75%.

**custom** — Creates a single `div.skeleton-block` element with the specified `width` and `height`.

### 5.3 Shimmer Animation

The shimmer effect is a CSS-only linear gradient that translates horizontally across each skeleton element:

1. Each `.skeleton-line`, `.skeleton-avatar`, `.skeleton-block`, `.skeleton-card-image`, and `.skeleton-cell` element receives a grey background colour (`$gray-200`).
2. A `linear-gradient` overlay with a lighter highlight band (`$gray-100`) is applied via `background-image`.
3. The `@keyframes skeleton-shimmer` animation translates the gradient from left to right over 1.5 seconds, repeating infinitely.
4. When `animate: false`, the `.skeleton-no-animate` class is applied to the root, which removes the animation. Elements display as static grey blocks.

### 5.4 Reduced Motion

The `prefers-reduced-motion: reduce` media query disables the shimmer animation entirely, regardless of the `animate` option. Elements display as static grey blocks. This ensures accessibility for users who experience motion sensitivity.

### 5.5 Guard Clauses

- `show()` called while already visible: logs warning, no-op.
- `show()` called after `destroy()`: logs warning, no-op.
- `hide()` called when not visible: no-op (silent).
- `destroy()` called after already destroyed: no-op (silent).
- Container ID not found: falls back to `document.body` with console warning.

---

## 6. DOM Structure

### 6.1 Text Preset

```html
<div class="skeleton-loader skeleton-loader-text"
     role="status"
     aria-busy="true"
     aria-label="Loading content"
     style="gap: 0.5rem;">
    <div class="skeleton-line" style="width: 100%;"></div>
    <div class="skeleton-line" style="width: 80%;"></div>
    <div class="skeleton-line" style="width: 60%;"></div>
</div>
```

### 6.2 Avatar Preset

```html
<div class="skeleton-loader skeleton-loader-avatar"
     role="status"
     aria-busy="true"
     aria-label="Loading content">
    <div class="skeleton-avatar skeleton-circle"
         style="width: 3rem; height: 3rem;"></div>
</div>
```

### 6.3 Card Preset

```html
<div class="skeleton-loader skeleton-loader-card"
     role="status"
     aria-busy="true"
     aria-label="Loading content"
     style="gap: 0.5rem;">
    <div class="skeleton-card-image" style="height: 160px;"></div>
    <div class="skeleton-line" style="width: 100%;"></div>
    <div class="skeleton-line" style="width: 70%;"></div>
    <div class="skeleton-line" style="width: 85%;"></div>
</div>
```

### 6.4 Table Preset

```html
<div class="skeleton-loader skeleton-loader-table"
     role="status"
     aria-busy="true"
     aria-label="Loading content">
    <div class="skeleton-table"
         style="grid-template-columns: repeat(4, 1fr); gap: 0.5rem;">
        <!-- Header row — full width cells -->
        <div class="skeleton-cell" style="width: 100%;"></div>
        <div class="skeleton-cell" style="width: 100%;"></div>
        <div class="skeleton-cell" style="width: 100%;"></div>
        <div class="skeleton-cell" style="width: 100%;"></div>
        <!-- Data rows — varied widths -->
        <div class="skeleton-cell" style="width: 75%;"></div>
        <div class="skeleton-cell" style="width: 90%;"></div>
        <div class="skeleton-cell" style="width: 65%;"></div>
        <div class="skeleton-cell" style="width: 80%;"></div>
        <!-- ... more rows ... -->
    </div>
</div>
```

### 6.5 Paragraph Preset

```html
<div class="skeleton-loader skeleton-loader-paragraph"
     role="status"
     aria-busy="true"
     aria-label="Loading content"
     style="gap: 0.5rem;">
    <div class="skeleton-line" style="width: 100%;"></div>
    <div class="skeleton-line" style="width: 100%;"></div>
    <div class="skeleton-line" style="width: 100%;"></div>
    <div class="skeleton-line" style="width: 75%;"></div>
</div>
```

### 6.6 Custom Preset

```html
<div class="skeleton-loader skeleton-loader-custom"
     role="status"
     aria-busy="true"
     aria-label="Loading content">
    <div class="skeleton-block"
         style="width: 100%; height: 1rem;"></div>
</div>
```

---

## 7. Styling

### 7.1 CSS Classes

| Class | Description |
|-------|-------------|
| `.skeleton-loader` | Root container — `display: flex`, `flex-direction: column`, configurable `gap` |
| `.skeleton-loader-text` | Text preset modifier |
| `.skeleton-loader-avatar` | Avatar preset modifier |
| `.skeleton-loader-card` | Card preset modifier |
| `.skeleton-loader-table` | Table preset modifier |
| `.skeleton-loader-paragraph` | Paragraph preset modifier |
| `.skeleton-loader-custom` | Custom preset modifier |
| `.skeleton-no-animate` | Disables shimmer animation (static grey blocks) |
| `.skeleton-line` | Horizontal shimmer line — `height: 1rem`, variable `width`, shimmer background |
| `.skeleton-avatar` | Avatar block — configurable `width` and `height`, shimmer background |
| `.skeleton-circle` | Circle modifier — `border-radius: 50%` |
| `.skeleton-card-image` | Card image block — `width: 100%`, configurable `height`, shimmer background |
| `.skeleton-table` | CSS Grid container — `display: grid`, configurable columns |
| `.skeleton-cell` | Table cell block — `height: 1rem`, variable `width`, shimmer background |
| `.skeleton-block` | Custom block — configurable `width` and `height`, shimmer background |

### 7.2 Theme Integration

| Property | Value | Source |
|----------|-------|--------|
| Block background | `$gray-200` | Theme variable |
| Shimmer highlight | `$gray-100` | Theme variable (lighter band in gradient) |
| Shimmer gradient | `linear-gradient(90deg, transparent 0%, $gray-100 50%, transparent 100%)` | CSS |
| Default border-radius | `0` | Enterprise square theme |
| Default line height | `1rem` | `$font-size-base` alignment |
| Default gap | `0.5rem` | `$spacer * 0.5` alignment |
| Card image height | `160px` | Fixed value |
| Font family | N/A | No text is rendered |

### 7.3 Shimmer Animation

```scss
@keyframes skeleton-shimmer
{
    0%
    {
        background-position: -200% 0;
    }

    100%
    {
        background-position: 200% 0;
    }
}
```

The animation is applied to all skeleton block elements via a shared shimmer mixin:

```scss
@mixin skeleton-shimmer-base
{
    background-color: $gray-200;
    background-image: linear-gradient(
        90deg,
        transparent 0%,
        $gray-100 50%,
        transparent 100%
    );
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.5s ease-in-out infinite;
}
```

### 7.4 Reduced Motion

```scss
@media (prefers-reduced-motion: reduce)
{
    .skeleton-loader,
    .skeleton-loader *
    {
        animation: none !important;
    }
}
```

When `prefers-reduced-motion: reduce` is active, all shimmer animations are disabled. Elements display as static `$gray-200` blocks. The `!important` declaration is intentional here — it is an accessibility override that must take precedence over all component styles.

### 7.5 No-Animate Class

When `animate: false` is set in options, the `.skeleton-no-animate` class is applied to the root:

```scss
.skeleton-no-animate,
.skeleton-no-animate *
{
    animation: none;
}
```

---

## 8. Keyboard Interaction

None. The SkeletonLoader is a non-interactive, purely visual placeholder element. It does not receive focus, does not respond to keyboard input, and does not participate in the tab order. The component has no `tabindex` attribute.

---

## 9. Accessibility

### 9.1 ARIA Attributes

| Element | Attribute | Value |
|---------|-----------|-------|
| Root | `role` | `"status"` |
| Root | `aria-busy` | `"true"` |
| Root | `aria-label` | `"Loading content"` |

### 9.2 Consumer Responsibility

When the real content loads and the skeleton is replaced, the consumer should set `aria-busy="false"` on the parent container to signal to assistive technologies that loading is complete. The skeleton component itself handles only its own lifecycle.

### 9.3 Reduced Motion

The `prefers-reduced-motion: reduce` media query disables the shimmer animation. This is handled at the CSS level and requires no JavaScript detection.

### 9.4 Screen Reader Behaviour

Screen readers will announce "Loading content" (or the custom `aria-label`) when the skeleton appears, courtesy of the `role="status"` live region. When the skeleton is removed from the DOM via `hide()` or `destroy()`, the live region is removed and no further announcements occur.

---

## 10. Dependencies

- **Bootstrap 5 SCSS** — for `$gray-*` variables (`$gray-100`, `$gray-200`) and `$spacer`.
- No JavaScript framework dependencies.
- No external animation libraries.
- No Bootstrap Icons (no icons are rendered).

---

## 11. Edge Cases

| Scenario | Behaviour |
|----------|-----------|
| `lines: 0` for text/paragraph preset | Renders empty container (no lines). Logs info. |
| `lines: 1` for text preset | Renders a single line at 100% width. |
| `rows: 0` or `columns: 0` for table preset | Renders empty table grid. Logs info. |
| `width` or `height` not valid CSS | Browser ignores the style; block renders at default size. |
| `animate: false` | Static grey blocks, no shimmer. |
| `prefers-reduced-motion: reduce` | Overrides `animate: true`; no shimmer regardless. |
| `circle: true` on non-avatar preset | Ignored; `.skeleton-circle` only applied to `.skeleton-avatar`. |
| `borderRadius` provided | Applied as inline `border-radius` to all skeleton block elements. |
| Container ID not found | Falls back to `document.body` with console warning. |
| `show()` called while visible | Logs warning, no-op. |
| `show()` after `destroy()` | Logs warning, no-op. |
| `destroy()` after already destroyed | Silent no-op. |
| Multiple SkeletonLoaders on same page | Each operates independently; no shared state. |
| Skeleton inside a flex or grid parent | Root container respects parent layout; sizing is controlled by consumer CSS. |

---

## 12. Files

| File | Purpose |
|------|---------|
| `specs/skeletonloader.prd.md` | This specification |
| `components/skeletonloader/skeletonloader.ts` | TypeScript source (~130-160 lines) |
| `components/skeletonloader/skeletonloader.scss` | Styles (shimmer animation, presets, theme integration) |
| `components/skeletonloader/README.md` | Documentation |

---

## 13. Implementation Notes

### 13.1 DOM Construction

All DOM elements are created using the project's `createElement` and `setAttr` helper functions. No `innerHTML` is used anywhere. All text (aria-label values) is set via `textContent` or attribute setters.

### 13.2 Shimmer Gradient Technique

The shimmer effect uses a single `linear-gradient` as `background-image` with `background-size: 200% 100%`. The `@keyframes skeleton-shimmer` animation translates the gradient from `-200% 0` to `200% 0`, creating the illusion of a light band sweeping across the element. This technique:

- Uses only CSS properties (`background-position`) that can be hardware-accelerated.
- Requires no JavaScript `requestAnimationFrame` or timer loops.
- Works identically on all skeleton block types (lines, cells, images, avatars).
- Is trivially disabled by removing the `animation` property.

### 13.3 Table Cell Width Variation

Table body cells use a deterministic pseudo-random width pattern to avoid visual monotony without requiring actual randomness. The pattern uses the cell index modulo a small set of width values:

```typescript
const TABLE_CELL_WIDTHS = ["75%", "90%", "65%", "80%", "70%", "95%", "60%", "85%"];
```

For cell at index `i`, the width is `TABLE_CELL_WIDTHS[i % TABLE_CELL_WIDTHS.length]`. This produces consistent output across renders (no random jitter) while visually simulating varied data lengths.

### 13.4 Text Line Width Pattern

Text preset lines use a fixed width pattern to simulate natural text layout:

```typescript
const TEXT_LINE_WIDTHS = ["100%", "80%", "90%", "70%", "95%"];
```

The last line always uses `"60%"` width, overriding the pattern. This matches the visual convention where the last line of a text block is shorter.

### 13.5 Performance

- No JavaScript timers or `requestAnimationFrame` — all animation is CSS-only.
- No `ResizeObserver` — sizing is handled entirely by CSS.
- No `MutationObserver` — the component does not watch for external DOM changes.
- DOM creation is a single synchronous pass; no async operations.
- Total DOM node count is minimal: text preset with 3 lines = 4 elements (root + 3 lines).

### 13.6 LOG_PREFIX Pattern

```typescript
const LOG_PREFIX = "[SkeletonLoader]";
```

All `console.log`, `console.warn`, and `console.error` calls include this prefix for filtering in browser developer tools.

---

## 14. Demo Scenarios

### 14.1 Text Loading

Three-line text skeleton demonstrating the default shimmer animation and varying line widths.

```typescript
const skeleton = createSkeletonLoader(
    { preset: "text", lines: 3 },
    "demo-text-container"
);
```

### 14.2 Avatar Loading

Circle avatar skeleton and square avatar skeleton side by side.

```typescript
const circleAvatar = createSkeletonLoader(
    { preset: "avatar", width: "4rem", height: "4rem", circle: true },
    "demo-avatar-circle"
);

const squareAvatar = createSkeletonLoader(
    { preset: "avatar", width: "4rem", height: "4rem" },
    "demo-avatar-square"
);
```

### 14.3 Card Loading

Card skeleton with image block and text lines.

```typescript
const cardSkeleton = createSkeletonLoader(
    { preset: "card" },
    "demo-card-container"
);
```

### 14.4 Table Loading

Table skeleton with 5 rows and 4 columns.

```typescript
const tableSkeleton = createSkeletonLoader(
    { preset: "table", rows: 5, columns: 4 },
    "demo-table-container"
);
```

### 14.5 Paragraph Loading

Dense paragraph skeleton with 6 lines.

```typescript
const paragraphSkeleton = createSkeletonLoader(
    { preset: "paragraph", lines: 6 },
    "demo-paragraph-container"
);
```

### 14.6 Custom Block Loading

Custom-sized block simulating a chart placeholder.

```typescript
const chartSkeleton = createSkeletonLoader(
    { preset: "custom", width: "100%", height: "200px" },
    "demo-custom-container"
);
```

### 14.7 Static (No Animation)

Text skeleton with shimmer disabled, showing static grey blocks.

```typescript
const staticSkeleton = createSkeletonLoader(
    { preset: "text", lines: 4, animate: false },
    "demo-static-container"
);
```

### 14.8 Load-and-Replace

Demonstrates the full lifecycle: show skeleton, fetch data, hide skeleton, show real content. A button triggers a simulated 2-second load with `setTimeout`.

```typescript
const skeleton = createSkeletonLoader(
    { preset: "card" },
    "demo-replace-container"
);

setTimeout(() =>
{
    skeleton.destroy();
    document.getElementById("demo-replace-container")!.setAttribute("aria-busy", "false");
    // Insert real content here
}, 2000);
```

---

## 15. Future Considerations (Out of Scope for v1)

These features are explicitly deferred:

- **Pulse animation variant** — An alternative animation that fades opacity in and out rather than shimmer. Not needed for v1; shimmer is the standard.
- **Dark mode support** — Inverted colour scheme for dark backgrounds. Can be added via SCSS variable overrides when a dark theme is introduced.
- **Responsive presets** — Presets that adapt line count or layout based on container width. Consumers can create multiple skeletons for different breakpoints.
- **Content-aware replacement** — Automatic detection of when content loads and self-removal of the skeleton. The consumer must manage the lifecycle explicitly.
- **Nested presets** — Composing multiple presets within a single skeleton (e.g., avatar + text side by side). Consumers can place multiple SkeletonLoader instances in a flex container.
- **Server-side rendering** — The component requires a DOM environment. No SSR support.
