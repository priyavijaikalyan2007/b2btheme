# CDN Component Requests — Tenant Admin Reorg

**Date filed:** 2026-04-27
**Filed by:** Backend/Frontend lead (Claude)
**For:** UI team (CDN component library)
**Initiative:** Tenant Admin reorganization onto NavRail + standard archetypes
**Blocks:** Tenant Admin Workspace Overview, Analytics Overview, Adoption, Content, System & Usage pages
**Status:** UI-team review complete 2026-04-27 — resolutions inlined below as `> RESOLVED:` blocks. ADRs filed: ADR-129 (MetricCard), ADR-130 (ChartPanel). Component slugs: `metriccard`, `chartpanel`.

This document specifies two new CDN components that Tenant Admin needs. We have already validated that no equivalent components ship in the current `static.lyfbits.com/docs/COMPONENT_INDEX.md` (NavRail, Breadcrumb, ActivityFeed, PeriodPicker, DataGrid, FormDialog, Toast, ConfirmDialog, etc. all exist; the two below do not).

Both components must follow the conventions already established by the library: factory function returning a handle, opt-in dark-mode via `data-bs-theme` on `<html>`, theme tokens via CSS variables (no hex literals), CSS imported separately from JS, and TypeScript declarations published alongside.

> **RESOLVED — theme tokens.** The library defines a `--theme-*` token layer in `src/scss/_dark-mode.scss` (light defaults on `:root`, dark overrides on `[data-bs-theme="dark"]`). Both components use `var(--theme-*, <SCSS-variable-fallback>)` per the `custom.scss` precedent — not raw `--bs-*`. `--theme-metric-positive` / `--theme-metric-negative` already exist for trend colours.

---

## 1. `MetricCard` (KPI card) — slug `metriccard`

### Purpose

A single-value status card used in dashboard "KPI strips". Shows one prominent metric (the value), a label, an optional trend / delta, optional icon, and optional secondary stat. Designed for dense layouts (4–6 cards in a row) and for being driven by an async data source that resolves after first paint.

### Visual reference

Top of `admin-overview.png`:
```
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│ ACTIVE USERS        │  │ DIAGRAMS TRIGGERED  │  │ STORAGE USED        │
│ 12                  │  │ 9,738               │  │ 3.4 GB              │
│ ↑ +2 this week      │  │ ↑ +452 last week    │  │ of 10 GB cap        │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘
```

### Factory signature

```ts
createMetricCard(options: MetricCardOptions): MetricCardHandle
```

### Options

```ts
interface MetricCardOptions {
  container: HTMLElement;            // mount point (required)

  label: string;                      // small uppercase eyebrow, e.g. "ACTIVE USERS"
  value: string | number;             // big number, formatted; loader handles `null`
  icon?: string;                      // bi-* class, rendered top-right at low contrast

  trend?: {
    direction: 'up' | 'down' | 'flat';
    text: string;                     // e.g. "+2 this week"
    intent?: 'positive' | 'negative' | 'neutral'; // colour mapping (defaults: up=positive, down=negative, flat=neutral)
  };

  secondary?: string;                 // e.g. "of 10 GB cap" (renders below value, no arrow)

  sparkline?: number[];               // optional inline sparkline (24px tall) under value;
                                      // intent-coloured stroke matching trend.intent (default neutral)

  href?: string;                      // when set: card renders as <a href> (semantic link).
  onClick?: (evt: MouseEvent) => void; // when set without href: card renders as <button>.
                                      // Both: full surface is the click target.

  state?: 'ready' | 'loading' | 'error' | 'empty';
  errorText?: string;                 // displayed when state='error', e.g. "Couldn't load"
  size?: 'sm' | 'md';                 // default 'md'; 'sm' for analytics rows that need >6 cards

  ariaLabel?: string;                 // overrides "<label>: <value>"
  cssClass?: string;
  id?: string;
}
```

### Handle

```ts
interface MetricCardHandle {
  setValue(value: string | number): void;
  setTrend(trend: MetricCardOptions['trend'] | null): void;
  setSecondary(text: string | null): void;
  setState(state: 'ready' | 'loading' | 'error' | 'empty', errorText?: string): void;
  getRootElement(): HTMLElement;
  destroy(): void;
}
```

### Behavior requirements

- **Loading state**: skeleton shimmer over the value, label visible, trend hidden. Must NOT collapse/expand the card height when transitioning loading→ready (no layout jump).
- **Error state**: muted text "—" in place of value, optional `errorText` below. Cards must never throw; if data source fails, caller calls `setState('error', msg)`.
- **Empty state**: value displays "—", trend hidden. Distinct from error (no error text).
- **Trend colours**: drive from `--bs-success`, `--bs-danger`, `--bs-secondary` (Bootstrap semantic vars), NEVER hardcoded hex. Honour `data-bs-theme` automatically.
- **Click target**: when `href` is set, the card root IS an `<a href>`. When `onClick` is set without `href`, the root IS a `<button type="button">`. The entire card surface is the click target (cursor pointer, hover background `var(--theme-hover-bg)`, focus outline `var(--theme-focus-ring)`).
- **Keyboard**: native `<a>` and `<button>` semantics handle Enter/Space activation — no manual key handlers.
- **Compact density**: in `size: 'sm'`, label is 11px, value 22px; in `'md'`, label 12px, value 32px (matches `admin-overview.png`).

### Theme tokens

> **RESOLVED — token layer.** Use `--theme-*` tokens (defined in `src/scss/_dark-mode.scss`). Match `custom.scss` precedent of `var(--theme-*, $scss-fallback)` for compile-time safety.

| Surface              | Token                                                            |
|----------------------|------------------------------------------------------------------|
| Card background      | `var(--theme-surface-raised-bg)`                                 |
| Card border          | `var(--theme-border-subtle)`                                     |
| Label                | `var(--theme-text-secondary)`                                    |
| Value                | `var(--theme-text-primary)`                                      |
| Secondary text       | `var(--theme-text-muted)`                                        |
| Trend up (positive)  | `var(--theme-metric-positive, $green-700)`                       |
| Trend down (negative)| `var(--theme-metric-negative, $red-700)`                         |
| Trend flat / neutral | `var(--theme-text-muted)`                                        |
| Hover bg (clickable) | `var(--theme-hover-bg)`                                          |
| Focus ring           | `var(--theme-focus-ring)`                                        |

No new theme variables required. Do **not** introduce `--metric-card-*` tokens.

### Accessibility

- `aria-busy="true"` while in `loading` state.
- Cards in a strip: parent should be `role="list"` and each card `role="listitem"`. Component must accept this without breaking.
- Trend arrow icon must have `aria-hidden="true"` — text already announces direction.

### Test surface (UI team owns)

- All four states (ready / loading / error / empty) render correctly in light + dark mode.
- Transition loading→ready does not change height by more than 1px.
- Trend colour respects `intent` override (e.g. `direction: 'up', intent: 'negative'` for "errors increased").
- Clickable card is fully keyboard-operable.

---

## 2. `ChartPanel` (Chart.js wrapper) — slug `chartpanel`

> **RESOLVED — name.** Renamed from `Chart` to `ChartPanel` to avoid shadowing the global `Chart` constructor that Chart.js installs on `window`. Factory `createChartPanel`; types `ChartPanelOptions`, `ChartPanelKind`, `ChartPanelSeries`, `ChartPanelHandle`.

### Purpose

A theme-aware, dark-mode-aware wrapper around Chart.js, suitable for the bar / line / area charts seen in `admin-analytics-content.png`. Tenant Admin will not call Chart.js directly — only this component — so theme drift cannot leak through, and we have a single dependency-management point.

### Visual reference

`admin-analytics-content.png`:
- Top-right tile: vertical bar chart, 6 categories, axis labels, value labels above bars
- Bottom: time-series line chart with green fill area, 30 daily points, integer Y axis with grid

### Factory signature

```ts
createChartPanel(options: ChartPanelOptions): ChartPanelHandle
```

### Options

```ts
type ChartPanelKind = 'bar' | 'line' | 'area' | 'sparkline';

interface ChartPanelSeries {
  id: string;
  label: string;
  data: number[];                      // y-values (one per category in `categories`)
  intent?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  // intent maps to --theme-primary etc.; if omitted, library cycles a stable palette
}

interface ChartPanelOptions {
  container: HTMLElement;
  kind: ChartPanelKind;

  categories: string[];                // x-axis labels (or x-values for time-series)
  series: ChartSeries[];

  // axes
  yAxis?: {
    min?: number;
    max?: number;
    integer?: boolean;                  // force integer ticks
    label?: string;
    format?: (v: number) => string;     // formatter for tick labels and tooltips
    grid?: boolean;                     // default true
  };
  xAxis?: {
    label?: string;
    grid?: boolean;                     // default false
    rotate?: 0 | 45 | 90;               // tick label rotation
  };

  // misc visual
  showLegend?: boolean;                 // default: true if series.length > 1, else false
  showValueLabels?: boolean;            // default: false; if true, draw values atop bars / points
  smoothing?: 'none' | 'monotone';      // line/area only; default 'monotone'

  // states
  state?: 'ready' | 'loading' | 'error' | 'empty';
  errorText?: string;
  emptyText?: string;                   // default "No data"

  // accessibility
  ariaLabel: string;                    // REQUIRED — chart is not decorative
  fallbackTable?: boolean;              // default true; render visually-hidden <table> for SR

  cssClass?: string;
  id?: string;
}
```

### Handle

```ts
interface ChartPanelHandle {
  setData(categories: string[], series: ChartPanelSeries[]): void;
  setState(state: 'ready' | 'loading' | 'error' | 'empty', errorText?: string): void;
  resize(): void;                      // force re-render (already handled on ResizeObserver)
  exportPNG(): Promise<Blob>;
  getRootElement(): HTMLElement;
  destroy(): void;
}
```

> **RESOLVED — `exportSVG` dropped.** Chart.js renders to `<canvas>`; SVG export is not natively available. Caller can use a server-side path if SVG is required.

### Behavior requirements

- **Theme awareness (CRITICAL)**: all colours sourced from `getComputedStyle(document.documentElement)` resolving `--theme-*` vars (`--theme-primary`, `--theme-success`, `--theme-danger`, `--theme-warning`, `--theme-text-primary`, `--theme-text-secondary`, `--theme-text-muted`, `--theme-surface-raised-bg`, `--theme-border-color`, `--theme-border-subtle`). On `data-bs-theme` change, the wrapper MUST re-compute and re-render — listen via `MutationObserver` on `<html>`'s `data-bs-theme` attribute.
- **No hex literals** anywhere in the JS. Palette mapping for `intent` lives in the wrapper, not inside callers.
- **Responsive**: ResizeObserver on the container; debounce at 100ms.
- **Empty state**: render an axis frame with the `emptyText` centred, not a blank `<canvas>`.
- **Error state**: similar — centred error icon + `errorText`.
- **Loading state**: skeleton shimmer over the chart area; axes hidden until ready.
- **Tooltips**: use Chart.js tooltips, but theme via wrapper (background `--theme-surface-raised-bg`, border `--theme-border-color`, text `--theme-text-primary`).
- **No animation by default for live data refresh**: when `setData` is called with the same series IDs, do not animate (avoids janky loops on poll-driven dashboards). Initial render may animate.

### Performance

> **RESOLVED — Chart.js loading.** Wrapper follows the ADR-028 external-globals pattern (CodeMirror, marked, hljs, katex, mermaid, Viz). The consuming application loads Chart.js itself via a `<script>` tag (CDN or local); wrapper reads `window.Chart`. We do NOT bundle Chart.js inside `chartpanel.js`. Wrapper alone targets **≤ 8 KB gzip**. The 90 KB budget for a bundled Chart.js becomes a deployment concern for the consuming app, not the wrapper.

- Wrapper detects missing `window.Chart` and renders a literate error per `LITERATE_ERRORS.md`, mirroring `codeeditor.ts` behaviour when CodeMirror is missing.
- Required Chart.js version: `>=4.4.0 <5.0.0`.
- Required Chart.js controllers/elements/scales (auto-registered by the UMD build): `BarController`, `LineController`, `Filler`, `LinearScale`, `CategoryScale`, `Tooltip`, `Legend`. Tree-shaken builds must include these.
- First render under 50ms for 30 datapoints.
- `setData` for same shape under 16ms (single frame).

### Accessibility

- `ariaLabel` is required (enforced by TS type).
- Visually-hidden `<table>` (the `fallbackTable`) renders the same data as the chart for screen-reader users by default. Caller can disable.
- Keyboard: focusable container; arrow keys move tooltip across data points (Chart.js plugin or wrapper-implemented).

### Test surface (UI team owns)

- All four kinds (`bar`, `line`, `area`, `sparkline`) render in light + dark mode and re-theme correctly on `data-bs-theme` toggle without remounting.
- Empty / loading / error states render at the correct container size (no collapse).
- `setData` does not leak Chart.js instances (memory profile after 100 swaps).
- Fallback `<table>` is keyboard-reachable and announces correct data.

### Distribution

Match existing CDN component packaging:
- `components/chartpanel/chartpanel.css`
- `components/chartpanel/chartpanel.js` (IIFE-wrapped, ≤ 8 KB gzip; reads `window.Chart`)
- `components/chartpanel/chartpanel.d.ts`

Tenant Admin (and other apps) load Chart.js separately via `<script>`, then load `chartpanel.js`. Documented in `components/chartpanel/README.md` mirroring the codeeditor / markdownrenderer pattern.

---

## Out of scope (explicitly NOT requested in this round)

- Pie / donut / radar charts. We only need bar, line, area, sparkline. Add later.
- Stacked / grouped bar variants. Future request.
- Drill-down / linked charts. Tenant Admin does not need this in v1.
- A standalone Tabs component. Bootstrap nav-tabs styled in admin's CSS will suffice for the Analytics in-page sub-nav.

## Adoption plan once available

| Component  | First adopter                     | Subsequent adopters                                  |
|------------|-----------------------------------|------------------------------------------------------|
| MetricCard | `frontend/admin/overview.html`    | All Analytics pages; later: per-app dashboards       |
| ChartPanel | `frontend/admin/analytics-*.html` | Later: Strukture analytics, Diagrams metrics overlay |

We will not block the Tenant Admin reorg foundation work on these. Foundation (NavRail mount, routing, breadcrumb, shell) ships first; pages that need MetricCard / Chart will land after the components are published to CDN.

## Open question for the UI team

> **RESOLVED — slug.** New component slug `metriccard` (not extending the `.metric-card` utility class). Lifecycle states + handle make it a real component, not a CSS utility. Update `typescript/shared/types/component-library.d.ts` to:
> ```ts
> declare global {
>   interface Window {
>     createMetricCard?: (opts: MetricCardOptions) => MetricCardHandle;
>     createChartPanel?: (opts: ChartPanelOptions) => ChartPanelHandle;
>   }
> }
> ```
