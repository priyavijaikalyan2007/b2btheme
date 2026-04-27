<!-- AGENT: Documentation for the ChartPanel component. ADR-130. -->

# ChartPanel

Theme-aware Chart.js wrapper for bar, line, area, and sparkline charts. Reads `window.Chart` (Chart.js >= 4.4, < 5) — the consuming application loads Chart.js itself via a `<script>` tag, mirroring the established external-globals pattern (CodeMirror, marked, hljs, KaTeX, mermaid). See [ADR-028](../../agentknowledge/decisions.yaml) (the precedent) and [ADR-130](../../agentknowledge/decisions.yaml) (this component).

## Assets

| Asset | Path |
|-------|------|
| CSS | `components/chartpanel/chartpanel.css` |
| JS  | `components/chartpanel/chartpanel.js`  |

## External dependency

Chart.js must be loaded **before** `chartpanel.js`:

```html
<!-- Chart.js (UMD), required by chartpanel.js -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"></script>

<link rel="stylesheet" href="components/chartpanel/chartpanel.css">
<script src="components/chartpanel/chartpanel.js"></script>
```

If Chart.js is missing at instantiation time, the panel renders a literate error block instead of throwing — the same shape as `CodeEditor` does for missing CodeMirror.

## Quick start

```html
<div id="visits-chart" style="height:240px;"></div>

<script>
    var visits = createChartPanel({
        container: document.getElementById("visits-chart"),
        kind:      "bar",
        ariaLabel: "Visits per weekday",
        categories: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],
        series: [
            { id: "v", label: "Visits",
              data: [120, 190, 140, 220, 180, 250, 90],
              intent: "primary" }
        ]
    });

    // Live refresh — same series IDs, no animation jank.
    setInterval(function() {
        visits.setData(
            ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],
            [{ id: "v", label: "Visits", data: nextSnapshot(), intent: "primary" }]
        );
    }, 30000);
</script>
```

## API

### `createChartPanel(options)` → `ChartPanelHandle`

Factory: constructs a panel and mounts it into `options.container`.

### `ChartPanelOptions`

| Option              | Type                                                      | Default        | Description |
|---------------------|-----------------------------------------------------------|----------------|-------------|
| `container`         | `HTMLElement`                                             | required       | Mount point. |
| `kind`              | `"bar" \| "line" \| "area" \| "sparkline"`                | required       | Chart kind. `area` is `line` with fill. `sparkline` is `line` with no axes/legend. |
| `categories`        | `string[]`                                                | required       | x-axis labels. |
| `series`            | `ChartPanelSeries[]`                                      | required       | One or more series. |
| `yAxis`             | `{min?, max?, integer?, label?, format?, grid?}`          | —              | y-axis options. |
| `xAxis`             | `{label?, grid?, rotate?}`                                | —              | x-axis options. |
| `showLegend`        | `boolean`                                                 | `series.length > 1` | Show legend. |
| `showValueLabels`   | `boolean`                                                 | `false`        | Draw values atop bars/points. |
| `smoothing`         | `"none" \| "monotone"`                                    | `"monotone"`   | Line/area only. |
| `state`             | `"ready" \| "loading" \| "error" \| "empty"`              | `"ready"`      | Lifecycle state. |
| `errorText`         | `string`                                                  | —              | Shown when `state === "error"`. |
| `emptyText`         | `string`                                                  | `"No data"`    | Shown when `state === "empty"`. |
| `ariaLabel`         | `string`                                                  | **required**   | TS-enforced. The chart is not decorative. |
| `fallbackTable`     | `boolean`                                                 | `true`         | Renders a visually-hidden `<table>` with the same data, for screen readers. |
| `cssClass`          | `string`                                                  | —              | Extra CSS class(es). |
| `id`                | `string`                                                  | —              | DOM id on the root. |

#### `ChartPanelSeries`

| Field    | Type                                                                  | Notes |
|----------|-----------------------------------------------------------------------|-------|
| `id`     | `string`                                                              | Stable ID. Same ID across `setData` calls => no animation, just data swap. |
| `label`  | `string`                                                              | Shown in legend and screen-reader table. |
| `data`   | `number[]`                                                            | One value per category. |
| `intent` | `"primary"\|"success"\|"warning"\|"danger"\|"info"\|"neutral"`        | Maps to a `--theme-*` colour. If omitted, the wrapper cycles a stable palette across series index. |

### `ChartPanelHandle`

| Method                                | Description |
|---------------------------------------|-------------|
| `setData(categories, series)`         | Update data. If series IDs match the previous shape, the chart updates in place with no animation; otherwise it rebuilds. |
| `setState(state, errorText?)`         | Switch lifecycle state. Drops the chart instance for non-`ready` states; re-creates it on the way back to `ready`. |
| `resize()`                            | Force a Chart.js resize (already handled automatically via `ResizeObserver` debounced 100 ms). |
| `exportPNG()`                         | `Promise<Blob>` — canvas PNG. |
| `getRootElement()`                    | Returns the root `HTMLElement` (or `null` after `destroy`). |
| `destroy()`                           | Tear down: disconnect observers, destroy the Chart.js instance, detach the root. Idempotent. |

`exportSVG` is intentionally not provided — Chart.js renders to canvas. If you need SVG, render server-side from the same data.

## Theme awareness

- All paint colours are resolved from `--theme-*` CSS variables via `getComputedStyle(document.documentElement)` at render time.
- A `MutationObserver` watches `<html>[data-bs-theme]` and re-renders without animation when the user toggles theme. (`themetoggle.ts:219` is the canonical writer of that attribute.)
- `data-bs-theme` is the same attribute Bootstrap's dark-mode mechanism uses.

## States

| State     | Visual                                                              | Chart.js instance |
|-----------|---------------------------------------------------------------------|-------------------|
| `ready`   | Canvas + axes + tooltip. Standard.                                  | Created           |
| `loading` | Skeleton shimmer fills the panel. `aria-busy="true"`.               | Destroyed         |
| `empty`   | `emptyText` centred. No axes.                                       | Destroyed         |
| `error`   | Literate error block with `errorText`.                              | Destroyed         |

Transitioning back to `ready` recreates the Chart.js instance from the current `categories` / `series`.

## Performance

- ResizeObserver on the container, debounced at 100 ms.
- `setData` with the same series IDs reuses the Chart.js instance and calls `update("none")` — single-frame swap, no animation.
- Initial render < 50 ms for 30 datapoints (target).
- Wrapper is ≤ 8 KB gzip; Chart.js itself is the consumer's load (caches across apps).

## Accessibility

- `ariaLabel` is **required** by the TS type — the chart announces itself.
- `role="img"` on the root.
- A visually-hidden `<table>` (`fallbackTable: true`, default) renders the same data for screen-reader users. Disable only if the data is also presented elsewhere on the page.
- Tooltips are themed (`--theme-surface-raised-bg` / `--theme-border-color` / `--theme-text-primary`).

## Limitations

- Pie / donut / radar / stacked / grouped variants are out of scope for v1 (per spec).
- `exportSVG` not provided.
- Drill-down / linked charts not provided.

## See also

- [`gauge`](../gauge/) — single-value radial/linear/tile gauge for a single metric (use this when a chart would be overkill).
- [`metriccard`](../metriccard/) — KPI strip cards (often paired with ChartPanel on dashboards; ADR-129).
