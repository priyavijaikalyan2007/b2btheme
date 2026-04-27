<!-- AGENT: Documentation for the MetricCard component. ADR-129. -->

# MetricCard

Single-value KPI card for dashboard "KPI strips". Shows one prominent metric (the value), a label, an optional trend delta, an optional inline sparkline, an optional secondary stat, and four lifecycle states (`ready` / `loading` / `error` / `empty`). Designed for dense dashboard layouts (4–6 cards per row) and async data sources that resolve after first paint.

See [ADR-129](../../agentknowledge/decisions.yaml) for design rationale (states, click semantics, theme tokens).

## Assets

| Asset | Path |
|-------|------|
| CSS | `components/metriccard/metriccard.css` |
| JS  | `components/metriccard/metriccard.js`  |

## Quick start

```html
<link rel="stylesheet" href="components/metriccard/metriccard.css">
<script src="components/metriccard/metriccard.js"></script>

<div id="kpi-strip" role="list" style="display:flex; gap:12px;"></div>

<script>
    var strip = document.getElementById("kpi-strip");

    var users = createMetricCard({
        container: strip,
        label:     "Active Users",
        value:     12,
        trend:     { direction: "up", text: "+2 this week" },
        href:      "/admin/users"
    });

    var diagrams = createMetricCard({
        container: strip,
        label:     "Diagrams Triggered",
        value:     "9,738",
        trend:     { direction: "up", text: "+452 last week" },
        sparkline: [120, 140, 130, 180, 200, 240, 260, 280, 300]
    });

    var storage = createMetricCard({
        container: strip,
        label:     "Storage Used",
        value:     "3.4 GB",
        secondary: "of 10 GB cap",
        icon:      "bi-hdd"
    });

    // Async load — start in loading state, then resolve.
    var revenue = createMetricCard({
        container: strip,
        label:     "MRR",
        value:     0,
        state:     "loading"
    });
    fetch("/api/mrr").then(function(r) { return r.json(); })
        .then(function(d) { revenue.setValue(d.mrr); revenue.setState("ready"); })
        .catch(function() { revenue.setState("error", "Couldn't load"); });
</script>
```

## API

### `createMetricCard(options)` → `MetricCardHandle`

Factory: constructs a card and mounts it into `options.container`.

### `MetricCardOptions`

| Option       | Type                                           | Default   | Description |
|--------------|------------------------------------------------|-----------|-------------|
| `container`  | `HTMLElement`                                  | required  | Mount point. |
| `label`      | `string`                                       | required  | Small uppercase eyebrow, e.g. `"ACTIVE USERS"`. |
| `value`      | `string \| number`                             | required  | Big number. Pass a placeholder when state is `loading`. |
| `icon`       | `string`                                       | —         | Bootstrap-icons class (e.g. `"bi-people"`), low-contrast top-right. |
| `trend`      | `MetricCardTrend`                              | —         | `{ direction, text, intent? }`. |
| `secondary`  | `string`                                       | —         | Smaller line below the value (e.g. `"of 10 GB cap"`). |
| `sparkline`  | `number[]`                                     | —         | Inline 24px sparkline. Empty array omits it. |
| `href`       | `string`                                       | —         | When set, the root is an `<a href>`. |
| `onClick`    | `(evt: MouseEvent) => void`                    | —         | When set without `href`, the root is a `<button>`. |
| `state`      | `"ready"\|"loading"\|"error"\|"empty"`         | `"ready"` | Lifecycle state. |
| `errorText`  | `string`                                       | —         | Shown under the em-dash when `state === "error"`. |
| `size`       | `"sm" \| "md"`                                 | `"md"`    | `sm` for analytics rows that need >6 cards per row. |
| `ariaLabel`  | `string`                                       | auto      | Overrides the generated `"<label>: <value>"`. |
| `cssClass`   | `string`                                       | —         | Extra CSS class(es) on the root. |
| `id`         | `string`                                       | —         | DOM id on the root. |

#### `MetricCardTrend`

| Field       | Type                                       | Default                | Description |
|-------------|--------------------------------------------|------------------------|-------------|
| `direction` | `"up" \| "down" \| "flat"`                 | required               | Arrow direction. |
| `text`      | `string`                                   | required               | Already-formatted delta (e.g. `"+2 this week"`). |
| `intent`    | `"positive" \| "negative" \| "neutral"`    | derived from direction | Override colour mapping (e.g. `up + negative` for `"+50 errors"`). |

### `MetricCardHandle`

| Method                              | Description |
|-------------------------------------|-------------|
| `setValue(v)`                       | Update the displayed value. |
| `setTrend(trend \| null)`           | Add / replace / remove the trend annotation. |
| `setSecondary(text \| null)`        | Add / replace / remove the secondary line. |
| `setState(state, errorText?)`       | Switch lifecycle state. `errorText` only respected for `state === "error"`. |
| `getRootElement()`                  | Returns the root `HTMLElement` (or `null` after `destroy`). |
| `destroy()`                         | Detach from DOM, release event listeners. Idempotent. |

## Click semantics (ADR-129)

| Configuration                       | Root element        | Keyboard activation |
|-------------------------------------|---------------------|---------------------|
| `href` set                          | `<a href="...">`    | Native (Enter)      |
| `onClick` only                      | `<button type="button">` | Native (Enter / Space) |
| Neither                             | `<div>`             | Not focusable       |

This avoids the common anti-pattern of `role="link"` on a `<div>` with manual key handlers; native semantics handle activation, focus, and screen-reader announcements.

## States

| State     | Visual                                                          | `aria-busy` |
|-----------|-----------------------------------------------------------------|-------------|
| `ready`   | Value paints; trend / sparkline / secondary visible.            | —           |
| `loading` | Skeleton shimmer overlays the value cell. Trend hidden. Label still visible. Card height reserved (no layout jump on resolve). | `true` |
| `error`   | Value displays an em-dash. `errorText` shown below if provided. | —           |
| `empty`   | Value displays an em-dash. No error text.                       | —           |

`loading → ready` does not change card geometry: `min-height` reserves the space and the value cell is always present (just visibility-hidden during loading).

## Theme tokens

Uses the project's `--theme-*` token layer (`src/scss/_dark-mode.scss`) with SCSS-variable fallbacks. Honours `data-bs-theme` automatically through CSS cascade — no JS theme listener required.

| Surface              | Token                                               |
|----------------------|-----------------------------------------------------|
| Card background      | `--theme-surface-raised-bg`                         |
| Card border          | `--theme-border-subtle`                             |
| Label                | `--theme-text-secondary`                            |
| Value                | `--theme-text-primary`                              |
| Secondary text       | `--theme-text-muted`                                |
| Trend up (positive)  | `--theme-metric-positive` (fallback `$green-700`)   |
| Trend down (negative)| `--theme-metric-negative` (fallback `$red-700`)    |
| Trend flat / neutral | `--theme-text-muted`                                |
| Hover bg             | `--theme-hover-bg`                                  |
| Focus border         | `--theme-focus-border`                              |

## Accessibility

- `aria-busy="true"` while `state === "loading"`.
- Default `aria-label` is `"<label>: <value>"`; override with `ariaLabel`.
- Trend arrow and sparkline have `aria-hidden="true"` (the trend text already announces direction).
- Cards in a strip should be marked `role="list"` on the parent and `role="listitem"` on each child (caller-applied; component preserves caller-set roles).
- Clickable cards inherit native `<a>` / `<button>` keyboard behaviour.

## Reduced motion

Skeleton shimmer respects `prefers-reduced-motion: reduce` (animation is disabled).
