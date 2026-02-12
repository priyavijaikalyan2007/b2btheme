<!-- AGENT: PRD for the Gauge component — tile, ring, bar visual measures with value/time modes. -->

# Gauge Component — Product Requirements

**Status:** Draft
**Component name:** Gauge
**Folder:** `./components/gauge/`
**Spec author:** Agent
**Date:** 2026-02-12

---

## 1. Overview

### 1.1 What Is It

A visual measure component modeled after the ASN.1 Gauge type. Displays a numeric value on a bounded scale with configurable colour thresholds that change as the value crosses defined percentage boundaries. The component supports three visual shapes and two data modes, providing a versatile building block for dashboards, monitoring panels, and status displays.

**Three shapes:**

- **Tile** — Square card with a coloured background and white text. Best for dashboard KPI tiles.
- **Ring** — Circular SVG arc that fills based on percentage, with the value displayed in the centre. Best for utilisation metrics.
- **Bar** — Horizontal or vertical linear bar with percentage fill. Best for inline progress and quota indicators.

**Two modes:**

- **Value mode** — Numeric value with min/max range and optional unit label (e.g., storage used, licence count, CPU load).
- **Time mode** — Countdown to a target date with automatic tick timer and overdue state detection.

**No animations.** The gauge updates immediately on value change. There are no CSS transitions, no easing curves, no animated arcs. This is intentional: the component is designed for dense dashboards where dozens of gauges may render simultaneously, and animation would be distracting and costly.

### 1.2 Why Build It

Enterprise SaaS dashboards frequently need compact visual indicators for:

- Resource consumption (storage, bandwidth, compute quota)
- Licence utilisation (seats used vs. total)
- Time-based deadlines (sprint end, certificate expiry, SLA countdown)
- Health metrics (CPU, memory, error rates)
- Capacity planning (projected vs. allocated)

No existing open-source library provides a Bootstrap 5 compatible, vanilla TypeScript gauge component with tile/ring/bar shapes, value/time dual-mode, threshold colour evaluation, and ARIA meter/timer accessibility. Building custom ensures alignment with the project's zero-dependency, IIFE-wrapped, Bootstrap-themed architecture.

### 1.3 Design Inspiration

| Source | Key Pattern Adopted |
|--------|---------------------|
| ASN.1 Gauge type | Bounded scalar value with min/max semantics |
| AWS CloudWatch widgets | Tile KPI cards with threshold colouring |
| Grafana single-stat panel | Ring gauge with centre value, colour thresholds |
| Bootstrap progress bar | Linear bar fill pattern |
| macOS Activity Monitor | Compact resource gauges with colour transitions |

### 1.4 Open Source Evaluation

| Library | Verdict | Reason |
|---------|---------|--------|
| Chart.js (doughnut) | Not recommended | Full charting library (200KB+), canvas-based, no ARIA meter support |
| Gauge.js | Not recommended | Canvas-based, animated needles, no tile/bar shapes, abandoned |
| JustGage | Not recommended | Raphael.js dependency (SVG library), animated, no Bootstrap integration |
| Bootstrap progress bar | Foundation | Native linear bar pattern; no ring, no tile, no thresholds, no time mode |

**Decision:** Build custom. Use Bootstrap SCSS variables for theme integration. Use native SVG for the ring shape. Use CSS for the bar and tile shapes. No external dependencies.

---

## 2. Use Cases

| Use Case | Shape | Mode | Example |
|----------|-------|------|---------|
| Dashboard storage tile | Tile | Value | 50 GiB of 100 GiB |
| CPU utilisation ring | Ring | Value | 73% of 100% |
| Sprint countdown | Ring | Time | 5d 12h remaining |
| Licence usage bar | Bar (horizontal) | Value | 80 of 100 seats |
| Upload progress | Bar (horizontal) | Value | 3.2 GiB of 5 GiB |
| Server uptime indicator | Bar (vertical) | Value | 99.7% of 100% |
| Certificate expiry | Tile | Time | 12d until expiry |
| SLA deadline | Ring | Time | 2h 15m remaining |

---

## 3. Anatomy

### 3.1 Tile

```
+---------------------------+
|                           |
|        50 GiB             |  <-- value (large, bold, white)
|       of 100 GiB          |  <-- subtitle (smaller, white, 85% opacity)
|                           |
|  --------- Storage -----  |  <-- title (bottom, border-top, semibold)
+---------------------------+
       (coloured background)
```

### 3.2 Ring

```
       ┌──────────┐
      ╱  ████████  ╲
     │  ██      ██  │       <-- SVG arc fill (coloured)
     │      73%     │       <-- centre value text
     │     CPU      │       <-- centre label text
     │  ██      ██  │
      ╲  ████████  ╱
       └──────────┘
    (grey track behind arc)
```

### 3.3 Bar (Horizontal)

```
Storage  [██████████████░░░░░░░░]  50 GiB
  label        track + fill          value
```

### 3.4 Bar (Vertical)

```
     ┌──┐
     │  │
     │  │  <-- empty track
     │██│
     │██│  <-- coloured fill (bottom-up)
     │██│
     └──┘
    50 GiB
     label
```

### 3.5 Element Breakdown

| Element | Shape | Required | Description |
|---------|-------|----------|-------------|
| Root container | All | Yes | `role="meter"` or `role="timer"` |
| Value display | All | Yes | Primary numeric or time text |
| Subtitle | Tile | Auto | "of X unit" or custom subtitle |
| Title | Tile, Bar | Optional | Gauge name/label |
| SVG track circle | Ring | Yes | Grey background circle |
| SVG fill circle | Ring | Yes | Coloured arc showing percentage |
| Centre overlay | Ring | Yes | Text container over SVG |
| Ring label | Ring | Optional | Title text below centre value |
| Bar track | Bar | Yes | Grey background track |
| Bar fill | Bar | Yes | Coloured percentage fill |
| Bar label | Bar | Optional | Title text before track |
| Bar value | Bar | Yes | Value text after track |

---

## 4. API

### 4.1 Types

```typescript
/** Gauge visual shape. */
type GaugeShape = "tile" | "ring" | "bar";

/** Gauge data mode. */
type GaugeMode = "value" | "time";

/** Predefined gauge sizes. */
type GaugeSize = "xs" | "sm" | "md" | "lg" | "xl";

/** Bar orientation (bar shape only). */
type BarOrientation = "horizontal" | "vertical";
```

### 4.2 Interfaces

```typescript
/**
 * A colour threshold that activates when the gauge percentage
 * crosses the given value.
 */
interface GaugeThreshold
{
    /** Percentage (0-100) at which this threshold activates. */
    value: number;

    /** CSS colour string (hex, rgb, hsl, named). */
    color: string;

    /** Optional human-readable label (e.g., "Warning"). */
    label?: string;
}

/**
 * Configuration options for the Gauge component.
 */
interface GaugeOptions
{
    /** Visual shape of the gauge. Required. */
    shape: GaugeShape;

    /** Data mode: "value" for numeric, "time" for countdown. Default: "value". */
    mode?: GaugeMode;

    // -- Value mode fields --

    /** Current value. Default: 0. */
    value?: number;

    /** Minimum value. Default: 0. */
    min?: number;

    /** Maximum value. Default: 100. */
    max?: number;

    /** Unit label (e.g., "GiB", "licenses", "%"). */
    unit?: string;

    // -- Time mode fields --

    /** Target date for countdown. Required when mode is "time". */
    targetDate?: Date | string;

    /** Enable auto-tick timer. Default: true when targetDate is set. */
    autoTick?: boolean;

    // -- Display --

    /** Gauge title/name (shown in tile footer or ring/bar label). */
    title?: string;

    /** Subtitle text (shown below value in tile). Auto-generated if omitted. */
    subtitle?: string;

    /** Predefined size or explicit pixel value. Omit for fluid. */
    size?: GaugeSize | number;

    /** Bar orientation. Default: "horizontal". */
    orientation?: BarOrientation;

    // -- Thresholds --

    /** Colour thresholds sorted ascending by value. */
    thresholds?: GaugeThreshold[];

    /** If true, lower percentage = worse (e.g., remaining). Default: false. */
    invertThresholds?: boolean;

    /** Colour when value exceeds max. Default: "#dc3545". */
    overLimitColor?: string;

    /** Label for over-limit state. Default: "Over Limit". */
    overLimitLabel?: string;

    /** Colour when target date has passed. Default: "#dc3545". */
    overdueColor?: string;

    /** Label for overdue state. Default: "Overdue". */
    overdueLabel?: string;

    // -- Formatting --

    /** Custom value formatter. Overrides default formatting. */
    formatValue?: (value: number, max: number, unit: string) => string;

    // -- Styling --

    /** Additional CSS classes on the root element. */
    cssClass?: string;

    /** Accessible label for screen readers. Auto-generated if omitted. */
    ariaLabel?: string;

    /** Background colour override (tile shape). */
    backgroundColor?: string;

    /** Text colour override. */
    textColor?: string;

    // -- Callbacks --

    /** Fires when value or time changes. */
    onChange?: (gauge: Gauge) => void;

    /** Fires when gauge crosses into over-limit state. */
    onOverLimit?: () => void;

    /** Fires when gauge crosses into overdue state. */
    onOverdue?: () => void;
}
```

### 4.3 Class: Gauge

| Method | Description |
|--------|-------------|
| `constructor(options)` | Creates the gauge DOM but does not attach to the page. |
| `show(container?)` | Appends to container (ID string or HTMLElement). Defaults to `document.body`. Starts auto-tick if time mode. |
| `hide()` | Removes from DOM without destroying state. Stops auto-tick. |
| `destroy()` | Hides, releases all references and timers, nulls DOM references. |
| `setValue(value)` | Updates the gauge value and refreshes the display. Fires `onChange`. |
| `setTargetDate(date)` | Updates the target date and restarts auto-tick if enabled. |
| `setThresholds(thresholds)` | Replaces threshold configuration and refreshes display. |
| `getValue()` | Returns the current value. |
| `getPercentage()` | Returns the current percentage (0-100, may exceed 100 if over-limit). |
| `isOverLimit()` | Returns `true` if value exceeds max (value mode only). |
| `isOverdue()` | Returns `true` if target date has passed (time mode only). |
| `isVisible()` | Returns whether the gauge is in the DOM. |
| `getElement()` | Returns the root DOM element. |

### 4.4 Convenience Functions

| Function | Description |
|----------|-------------|
| `createGauge(options, container?)` | Create, show, and return a Gauge instance. |
| `createTileGauge(options, container?)` | Shorthand — defaults shape to `"tile"`. |
| `createRingGauge(options, container?)` | Shorthand — defaults shape to `"ring"`. |
| `createBarGauge(options, container?)` | Shorthand — defaults shape to `"bar"`. |

### 4.5 Global Exports

```
window.Gauge
window.createGauge
window.createTileGauge
window.createRingGauge
window.createBarGauge
```

---

## 5. Behaviour

### 5.1 Lifecycle

1. **Construction** — Builds the DOM tree for the selected shape. Sets defaults, normalises `targetDate` strings to `Date` objects, computes initial value and percentage. Does not attach to the page.
2. **show(container?)** — Appends to the resolved container element, calls `updateDisplay()`, and starts auto-tick if time mode with `autoTick` enabled.
3. **hide()** — Stops auto-tick, removes from DOM. State is preserved.
4. **destroy()** — Calls hide, nulls all DOM references, sets destroyed flag. No further method calls are valid.

### 5.2 Value Mode

In value mode the gauge represents a numeric value within a `[min, max]` range:

- **Percentage** is computed as `((value - min) / (max - min)) * 100`.
- **Display value** is formatted as `"{value} {unit}"` unless a custom `formatValue` callback is provided.
- **Subtitle** auto-generates as `"of {max} {unit}"` unless a custom `subtitle` is provided.
- **Over-limit** occurs when `value > max`. The gauge displays the `overLimitLabel` ("Over Limit" by default) and applies the `overLimitColor` ("#dc3545" by default). The `onOverLimit` callback fires once on transition into this state.

### 5.3 Time Mode

In time mode the gauge counts down to a `targetDate`:

- **Current value** is computed as `targetDate.getTime() - Date.now()` (remaining milliseconds).
- **Percentage** is computed as `((remaining) / max) * 100`, where `max` represents the total duration in milliseconds.
- **Display value** is formatted as human-readable time: `"10d"`, `"2d 5h"`, `"1h 23m"`, `"5m 12s"`, `"45s"`.
- **Subtitle** auto-generates as the target date in locale format.
- **Overdue** occurs when `Date.now() > targetDate`. The gauge displays `"{overdueLabel}: {elapsed}"` and applies the `overdueColor`. The `onOverdue` callback fires once on transition into this state.

### 5.4 Auto-Tick (Time Mode)

When `autoTick` is enabled (default for time mode), the gauge uses `setInterval` to update automatically. The tick interval adapts based on the remaining time to balance accuracy against CPU cost:

| Remaining Time | Tick Interval | Rationale |
|----------------|---------------|-----------|
| < 5 minutes | 1 second | Countdown precision matters at close range |
| < 2 hours | 1 minute | Minute-level accuracy is sufficient |
| < 1 day | 5 minutes | Coarse updates for day-scale countdowns |
| >= 1 day | 1 hour | Very coarse for long countdowns |

**Interval adaptation:** On each tick, the component recalculates the appropriate interval. If the interval has changed (e.g., crossing from 2h to under 5m), the timer is stopped and restarted with the new interval. This ensures smooth transitions from coarse to fine ticking as the deadline approaches.

Auto-tick is started on `show()` and stopped on `hide()` or `destroy()`. If the gauge becomes destroyed or hidden between ticks, the next tick stops the timer.

### 5.5 Threshold Evaluation

Thresholds define colour boundaries based on percentage. They are evaluated dynamically on every display update.

**Normal mode** (`invertThresholds: false`):

Thresholds are sorted descending by value. The first threshold where `percentage >= threshold.value` is applied. This means higher percentage is "better" — the gauge starts green and transitions through warning/danger/critical as the percentage drops.

**Inverted mode** (`invertThresholds: true`):

Thresholds are sorted ascending by value. The first threshold where `percentage <= threshold.value` is applied. This means lower percentage is "worse" — useful for "remaining" scenarios where low remaining percentage is dangerous.

**Default thresholds** (4-level):

| Threshold | Percentage | Colour | Label |
|-----------|-----------|--------|-------|
| Good | >= 70% | `#2b8a3e` (green) | Good |
| Warning | >= 30% | `#e67700` (orange) | Warning |
| Danger | >= 10% | `#d9480f` (dark orange) | Danger |
| Critical | >= 0% | `#c92a2a` (red) | Critical |

**Over-limit / Overdue** states override threshold evaluation entirely. When the value exceeds max (value mode) or the target date has passed (time mode), the configured `overLimitColor` / `overdueColor` is used instead of any threshold colour.

### 5.6 Sizing

**Fluid mode** (default when `size` is omitted):

The gauge fills its parent container. Tile and ring shapes apply `aspect-ratio: 1` to maintain a square. Typography scales via CSS container queries (`cqi` units) so text remains proportional at any size.

**Preset sizes:**

| Size | Pixels |
|------|--------|
| `"xs"` | 80px |
| `"sm"` | 120px |
| `"md"` | 180px |
| `"lg"` | 260px |
| `"xl"` | 360px |

For tile and ring shapes, both width and height are set to the preset value. For bar shape, only the orientation axis dimension is set (width for horizontal, height for vertical).

**Explicit pixel sizes:**

A numeric `size` value sets the dimension directly in pixels, following the same width/height logic as presets.

### 5.7 Custom Formatting

The `formatValue` callback receives `(value, max, unit)` and returns a string. When provided, it overrides the default formatting for the primary value display. This allows consumers to display percentages, formatted numbers, currency, or any custom representation.

---

## 6. DOM Structure

### 6.1 Tile

```html
<div class="gauge gauge-tile gauge-md"
     id="gauge-1"
     role="meter"
     aria-valuenow="50"
     aria-valuemin="0"
     aria-valuemax="100"
     aria-label="Storage: 50 GiB of 100 GiB"
     style="background-color: #2b8a3e;">

    <div class="gauge-tile-content">
        <span class="gauge-tile-value">50 GiB</span>
        <span class="gauge-tile-subtitle">of 100 GiB</span>
    </div>

    <div class="gauge-tile-title">Storage</div>
</div>
```

### 6.2 Ring

```html
<div class="gauge gauge-ring gauge-md"
     id="gauge-2"
     role="meter"
     aria-valuenow="73"
     aria-valuemin="0"
     aria-valuemax="100"
     aria-label="CPU: 73  of 100 ">

    <svg viewBox="0 0 100 100">
        <circle class="gauge-ring-track"
                cx="50" cy="50" r="45" />
        <circle class="gauge-ring-fill"
                cx="50" cy="50" r="45"
                stroke-dasharray="282.74"
                stroke-dashoffset="76.34"
                stroke="#2b8a3e" />
    </svg>

    <div class="gauge-ring-center">
        <span class="gauge-ring-value" style="color: #2b8a3e;">73%</span>
        <span class="gauge-ring-label">CPU</span>
    </div>
</div>
```

### 6.3 Bar (Horizontal)

```html
<div class="gauge gauge-bar gauge-bar-horizontal"
     id="gauge-3"
     role="meter"
     aria-valuenow="50"
     aria-valuemin="0"
     aria-valuemax="100"
     aria-label="Storage: 50 GiB of 100 GiB">

    <span class="gauge-bar-label">Storage</span>

    <div class="gauge-bar-track">
        <div class="gauge-bar-fill"
             style="width: 50%; background-color: #2b8a3e;"></div>
    </div>

    <span class="gauge-bar-value">50 GiB</span>
</div>
```

### 6.4 Bar (Vertical)

```html
<div class="gauge gauge-bar gauge-bar-vertical"
     id="gauge-4"
     role="meter"
     aria-valuenow="75"
     aria-valuemin="0"
     aria-valuemax="100"
     aria-label="Uptime: 75  of 100 ">

    <span class="gauge-bar-label">Uptime</span>

    <div class="gauge-bar-track">
        <div class="gauge-bar-fill"
             style="height: 75%; background-color: #2b8a3e;"></div>
    </div>

    <span class="gauge-bar-value">75%</span>
</div>
```

### 6.5 Time Mode (Ring Example)

```html
<div class="gauge gauge-ring gauge-md"
     id="gauge-5"
     role="timer"
     aria-valuenow="432000000"
     aria-valuemin="0"
     aria-valuemax="2592000000"
     aria-label="Sprint End: 5d remaining">

    <svg viewBox="0 0 100 100">
        <circle class="gauge-ring-track"
                cx="50" cy="50" r="45" />
        <circle class="gauge-ring-fill"
                cx="50" cy="50" r="45"
                stroke-dasharray="282.74"
                stroke-dashoffset="235.62"
                stroke="#e67700" />
    </svg>

    <div class="gauge-ring-center">
        <span class="gauge-ring-value" style="color: #e67700;">5d</span>
        <span class="gauge-ring-label">Sprint End</span>
    </div>
</div>
```

### 6.6 Over-Limit State (Tile Example)

```html
<div class="gauge gauge-tile gauge-md gauge-overlimit"
     id="gauge-6"
     role="meter"
     aria-valuenow="120"
     aria-valuemin="0"
     aria-valuemax="100"
     aria-label="Storage: Over Limit"
     style="background-color: #dc3545; border-color: currentColor; border-width: 2px;">

    <div class="gauge-tile-content">
        <span class="gauge-tile-value">Over Limit</span>
        <span class="gauge-tile-subtitle">20 GiB over</span>
    </div>

    <div class="gauge-tile-title">Storage</div>
</div>
```

### 6.7 Overdue State (Ring Example)

```html
<div class="gauge gauge-ring gauge-md gauge-overdue"
     id="gauge-7"
     role="timer"
     aria-valuenow="-86400000"
     aria-valuemin="0"
     aria-valuemax="2592000000"
     aria-label="Sprint End: Overdue">

    <svg viewBox="0 0 100 100">
        <circle class="gauge-ring-track"
                cx="50" cy="50" r="45" />
        <circle class="gauge-ring-fill"
                cx="50" cy="50" r="45"
                stroke-dasharray="282.74"
                stroke-dashoffset="282.74"
                stroke="#dc3545" />
    </svg>

    <div class="gauge-ring-center">
        <span class="gauge-ring-value" style="color: #dc3545;">Overdue: 1d</span>
        <span class="gauge-ring-label">Sprint End</span>
    </div>
</div>
```

---

## 7. CSS Classes

| Class | Description |
|-------|-------------|
| `.gauge` | Root container — `position: relative`, `display: inline-flex`, `container-type: inline-size` |
| `.gauge-fluid` | Fluid sizing — `width: 100%`, `height: auto` |
| `.gauge-xs` | 80px preset size |
| `.gauge-sm` | 120px preset size |
| `.gauge-md` | 180px preset size |
| `.gauge-lg` | 260px preset size |
| `.gauge-xl` | 360px preset size |
| `.gauge-tile` | Tile shape — `aspect-ratio: 1`, coloured background, white text |
| `.gauge-tile-content` | Flex column for value and subtitle |
| `.gauge-tile-value` | Large bold value text with `clamp()` sizing |
| `.gauge-tile-subtitle` | Smaller subtitle text at 85% opacity |
| `.gauge-tile-title` | Bottom title bar with top border |
| `.gauge-ring` | Ring shape — `aspect-ratio: 1` |
| `.gauge-ring-track` | SVG circle — grey background track (`$gray-200`) |
| `.gauge-ring-fill` | SVG circle — coloured arc with `stroke-dasharray` / `stroke-dashoffset` |
| `.gauge-ring-center` | Positioned overlay for centre text |
| `.gauge-ring-value` | Bold centre value text with `clamp()` sizing |
| `.gauge-ring-label` | Smaller label text below centre value (`$gray-600`) |
| `.gauge-bar` | Bar shape — `flex-direction: row`, full width |
| `.gauge-bar-horizontal` | Horizontal bar orientation |
| `.gauge-bar-vertical` | Vertical bar orientation — column layout, bottom-up fill |
| `.gauge-bar-track` | Grey background track (`$gray-200`) |
| `.gauge-bar-fill` | Coloured percentage fill — absolute positioned |
| `.gauge-bar-value` | Value text — `$font-size-sm`, `$font-weight-semibold` |
| `.gauge-bar-label` | Title text — `$font-size-sm`, `$gray-600` |
| `.gauge-overlimit` | Over-limit state — tile border emphasis |
| `.gauge-overdue` | Overdue state — tile border emphasis |

---

## 8. Styling

### 8.1 Theme Integration

| Property | Value | Source |
|----------|-------|--------|
| Base font | `inherit` | Container font family |
| Base font size | `$font-size-base` | Theme variable |
| Tile background | Threshold colour (set via JS inline style) | Dynamic |
| Tile text | `#fff` (white) | Fixed |
| Tile border | `1px solid $gray-300` | Theme variable |
| Tile border (over-limit/overdue) | `2px solid currentColor` | Dynamic |
| Ring track | `$gray-200` stroke | Theme variable |
| Ring fill stroke-width | 8 (SVG units) | Constant |
| Ring fill stroke-linecap | `butt` | Zero border-radius theme alignment |
| Ring value text | `$gray-900` (overridden by threshold colour via JS) | Theme variable |
| Ring label text | `$gray-600` | Theme variable |
| Bar track | `$gray-200` background | Theme variable |
| Bar track height | 8px | `$gauge-bar-height` |
| Bar fill colour | Threshold colour (set via JS inline style) | Dynamic |
| Bar value text | `$gray-900`, `$font-size-sm`, `$font-weight-semibold` | Theme variables |
| Bar label text | `$gray-600`, `$font-size-sm` | Theme variables |
| All text numbers | `font-variant-numeric: tabular-nums` | Prevents layout shift |

### 8.2 SVG Ring Details

The ring uses an SVG `viewBox="0 0 100 100"` with two `<circle>` elements:

- **Track circle:** `r="45"`, grey stroke, no fill.
- **Fill circle:** `r="45"`, coloured stroke, `stroke-dasharray` set to the full circumference (`2 * PI * 45 = ~282.74`), `stroke-dashoffset` computed as `circumference * (1 - percentage / 100)`.
- The SVG is rotated `-90deg` via CSS `transform: rotate(-90deg)` so the arc starts from 12 o'clock.
- Stroke-linecap is `butt` (not `round`) to align with the project's zero border-radius design language.

### 8.3 Container Queries

Tile and ring shapes use CSS container queries (`cqi` units) for responsive typography:

| Element | Font Size | Rule |
|---------|-----------|------|
| `.gauge-tile-value` | `clamp(1.5rem, 8cqi, 3.5rem)` | Scales with container width |
| `.gauge-tile-subtitle` | `clamp(0.625rem, 3cqi, 0.875rem)` | Proportional to value |
| `.gauge-tile-title` | `clamp(0.625rem, 3cqi, $font-size-sm)` | Caps at small font size |
| `.gauge-ring-value` | `clamp(1rem, 6cqi, 2.5rem)` | Scales with ring diameter |
| `.gauge-ring-label` | `clamp(0.5rem, 2.5cqi, $font-size-sm)` | Caps at small font size |

### 8.4 Reduced Motion

A `prefers-reduced-motion: reduce` media query disables all animations and transitions on `.gauge` and its descendants. Since the gauge intentionally has no animations in v1, this is a defensive guard for any future additions.

---

## 9. Keyboard Accessibility

### 9.1 Roles and ARIA

| Element | Attribute | Value |
|---------|-----------|-------|
| Root (value mode) | `role` | `"meter"` |
| Root (time mode) | `role` | `"timer"` |
| Root | `aria-valuenow` | Current value (rounded integer) |
| Root | `aria-valuemin` | Minimum value from options |
| Root | `aria-valuemax` | Maximum value from options |
| Root | `aria-label` | Descriptive label (custom or auto-generated) |

### 9.2 Auto-Generated ARIA Labels

When `ariaLabel` is not provided, the component generates descriptive labels:

| State | Label Format |
|-------|--------------|
| Value mode, normal | `"{title}: {value} {unit} of {max} {unit}"` |
| Value mode, over-limit | `"{title}: Over Limit"` |
| Time mode, normal | `"{title}: {timeRemaining} remaining"` |
| Time mode, overdue | `"{title}: Overdue"` |

### 9.3 Keyboard Navigation

| Key | Action |
|-----|--------|
| Tab | Focus gauge element |

The gauge is a read-only display element. It does not accept user input and therefore requires only basic focus support. Screen readers announce the role, value, range, and label.

---

## 10. Threshold System

### 10.1 Default 4-Level Thresholds

The default thresholds provide a traffic-light progression suitable for most "resource used" scenarios:

```javascript
[
    { value: 70, color: "#2b8a3e", label: "Good" },       // >= 70% remaining
    { value: 30, color: "#e67700", label: "Warning" },     // >= 30%
    { value: 10, color: "#d9480f", label: "Danger" },      // >= 10%
    { value: 0,  color: "#c92a2a", label: "Critical" }     // >= 0%
]
```

### 10.2 Normal Evaluation (`invertThresholds: false`)

Thresholds are sorted descending. The first threshold where `percentage >= threshold.value` is selected. This means:

- 70-100% = Good (green)
- 30-69% = Warning (orange)
- 10-29% = Danger (dark orange)
- 0-9% = Critical (red)

Use case: "How much resource have I used?" — higher percentage means more used, lower threshold colours become more alarming.

### 10.3 Inverted Evaluation (`invertThresholds: true`)

Thresholds are sorted ascending. The first threshold where `percentage <= threshold.value` is selected. This reverses the meaning: lower percentage is worse.

Use case: "How much resource remains?" — a low remaining percentage is dangerous and should show red, while a high remaining percentage is safe and should show green.

### 10.4 Custom Thresholds

Consumers can provide any number of thresholds with custom colours and labels:

```javascript
createTileGauge({
    shape: "tile",
    value: 95,
    max: 100,
    thresholds: [
        { value: 90, color: "#2b8a3e", label: "Healthy" },
        { value: 50, color: "#e67700", label: "Degraded" },
        { value: 0,  color: "#c92a2a", label: "Down" }
    ]
}, "container");
```

### 10.5 Over-Limit and Overdue Override

When `isOverLimit()` or `isOverdue()` returns true, threshold evaluation is skipped entirely. The configured `overLimitColor` / `overdueColor` (both default to `"#dc3545"`) is used. This ensures a consistent, unambiguous visual signal for out-of-range states.

---

## 11. Auto-Tick Adaptive Intervals

The auto-tick system balances display accuracy against CPU cost by adapting the `setInterval` delay based on remaining time:

| Remaining | Interval | Updates per Period |
|-----------|----------|--------------------|
| < 5 minutes | 1 second | 300 updates in 5 min |
| < 2 hours | 1 minute | 120 updates in 2 h |
| < 1 day | 5 minutes | 288 updates in 1 d |
| >= 1 day | 1 hour | 24 updates per day |

**Boundary adaptation:** On each tick, the component calls `computeTickInterval()` and compares with the current interval. If different (e.g., remaining time crossed the 5-minute boundary), the timer is stopped and restarted with the new interval. This avoids the wasteful approach of always ticking at 1-second resolution.

**Timer lifecycle:**

- `startAutoTick()` — Stops any existing timer, computes the interval from current remaining time, starts a new `setInterval`.
- `stopAutoTick()` — Clears the interval, resets the interval tracking variable.
- `onTick()` — Recalculates remaining time, updates value/percentage/display, checks for overdue transition, adapts interval if needed, fires `onChange` callback.

---

## 12. Edge Cases

| Scenario | Behaviour |
|----------|-----------|
| `max <= min` | Percentage returns 0; gauge shows empty |
| `value < min` | Percentage can be negative; display clamped to 0% fill |
| `value > max` (value mode) | Over-limit state; fills to 100%, shows `overLimitLabel` |
| Target date in the past (time mode) | Overdue state; ring/bar fill at 0%, shows `"{overdueLabel}: {elapsed}"` |
| `targetDate` as ISO string | Parsed to `Date` object in constructor |
| No `targetDate` in time mode | Value defaults to 0; no auto-tick |
| `autoTick: false` in time mode | No timer; consumer must call `setTargetDate()` or `setValue()` manually |
| `formatValue` throws | Default formatting is not used as fallback; error propagates |
| Unknown `shape` value | Falls back to tile with console error |
| `show()` called while already visible | Logs warning, no-op |
| `show()` called after `destroy()` | Logs warning, no-op |
| `setValue()` called after `destroy()` | Logs warning, no-op |
| Container ID not found | Falls back to `document.body` with console warning |
| Fluid tile/ring in narrow parent | Typography scales down via `clamp()` and container queries |
| Multiple gauges on same page | Each gets a unique instance ID (`gauge-1`, `gauge-2`, ...) |
| `onChange` callback throws | Caught and logged; does not break internal state |
| `onOverLimit` / `onOverdue` callback throws | Caught and logged; does not break internal state |
| Over-limit/overdue callback fires | Fires exactly once on transition; does not re-fire on subsequent ticks while still in that state |

---

## 13. Files

| File | Purpose |
|------|---------|
| `specs/gauge.prd.md` | This specification |
| `components/gauge/gauge.ts` | TypeScript source |
| `components/gauge/gauge.scss` | Styles |
| `components/gauge/README.md` | Documentation |

---

## 14. Implementation Notes

### 14.1 SVG Arc Rendering

The ring uses `stroke-dasharray` and `stroke-dashoffset` on a `<circle>` element rather than an `<arc>` path. This simplifies percentage-to-visual mapping:

```
circumference = 2 * PI * radius = 2 * PI * 45 = ~282.74
dashoffset = circumference * (1 - percentage / 100)
```

At 0%, `dashoffset = circumference` (no visible arc). At 100%, `dashoffset = 0` (full circle).

The SVG is rotated `-90deg` so the arc starts from 12 o'clock (top centre) and progresses clockwise, matching the conventional clock/gauge reading direction.

### 14.2 Container Queries for Typography

The `.gauge` root sets `container-type: inline-size`, enabling `cqi` units in child element `font-size` rules. This allows text to scale proportionally with the gauge size without JavaScript measurement or `ResizeObserver`.

### 14.3 Timer Management

All `setInterval` calls are wrapped with proper cleanup:

- `stopAutoTick()` is called before every `startAutoTick()` to avoid leaked timers.
- `hide()` stops the timer.
- `destroy()` calls `hide()` which stops the timer.
- `onTick()` checks `destroyed` and `visible` flags and self-stops if either is false.

### 14.4 Callback Safety

All consumer callbacks (`onChange`, `onOverLimit`, `onOverdue`) are wrapped in try/catch blocks. Errors are logged with `LOG_PREFIX` but do not break internal gauge state or timer operation.

### 14.5 State Transition Tracking

The `wasOverLimit` and `wasOverdue` boolean flags track whether the gauge was previously in an over-state. This ensures the `onOverLimit` / `onOverdue` callbacks fire exactly once when transitioning into the over-state, and do not re-fire on subsequent ticks or value updates while still in that state.

### 14.6 Performance

- No `ResizeObserver` — sizing is handled entirely by CSS (`aspect-ratio`, `clamp()`, container queries).
- No `requestAnimationFrame` — no animations to schedule.
- Timer intervals are adaptive — long countdowns tick infrequently (1h), avoiding CPU waste.
- DOM updates are minimal — only the changed text nodes and inline styles are touched on each tick.
- `tabular-nums` font variant prevents layout reflow when numeric text changes width.

---

## 15. Future Considerations (Out of Scope for v1)

These features are explicitly deferred:

- **Animations** — No CSS transitions, no animated arc fills, no easing curves. The gauge updates instantly.
- **Drag and resize** — The gauge is a static display element. It does not support drag-to-reposition or resize handles.
- **Interactive user input** — The gauge is read-only. No click-to-edit, no slider interaction, no direct value manipulation.
- **Gauge groups / grids** — No built-in layout manager for arranging multiple gauges in a dashboard grid. Consumers use CSS grid or flexbox externally.
- **Server-side rendering** — The component requires a DOM environment. No SSR support.
- **Sparkline overlay** — No historical trend line overlay on the gauge face.
- **Gauge needle** — No rotating needle/pointer variant. The component uses fill-based visualisation only.
