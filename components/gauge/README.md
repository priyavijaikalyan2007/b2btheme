<!-- AGENT: Documentation for the Gauge component — tile, ring, and bar visual measures with value/time modes. -->

# Gauge

A visual measure component modeled after the ASN.1 Gauge type. Displays a value on a scale with configurable colour thresholds. Supports three shapes (tile, ring, bar) and two modes (value, time countdown).

## Features

- **Three shapes** — square tile, circular ring (SVG), horizontal/vertical bar
- **Value mode** — numeric value with min/max/units (e.g., storage, licenses, CPU)
- **Time mode** — countdown to a target date with auto-tick and overdue state
- **Configurable thresholds** — colour changes at user-defined percentage boundaries
- **Over-limit / Overdue** — distinct colour and label when value exceeds max or time passes
- **Fluid or explicit sizing** — fills parent container or uses preset/pixel sizes
- **Custom formatting** — provide a `formatValue` callback for custom display
- **Full accessibility** — `role="meter"` / `role="timer"`, ARIA value attributes, descriptive labels

## Assets

| Asset | Path |
|-------|------|
| CSS | `dist/components/gauge/gauge.css` |
| JS | `dist/components/gauge/gauge.js` |
| Types | `dist/components/gauge/gauge.d.ts` |

**Requires:** Bootstrap CSS (for SCSS variables). Does **not** require Bootstrap JS or Bootstrap Icons.

## Quick Start

```html
<link rel="stylesheet" href="dist/components/gauge/gauge.css">
<script src="dist/components/gauge/gauge.js"></script>
<script>
    // Value tile
    var storage = createTileGauge({
        mode: "value",
        title: "Storage",
        value: 50,
        max: 100,
        unit: "GiB"
    }, "my-container");

    // Countdown ring
    var deadline = createRingGauge({
        mode: "time",
        title: "Sprint End",
        targetDate: new Date("2026-03-01"),
        max: 30 * 86400000  // 30 days in ms
    }, "timer-container");
</script>
```

## API

### Constructor

```typescript
const gauge = new Gauge(options: GaugeOptions);
```

Creates the gauge DOM but does not attach to the page.

### GaugeOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `shape` | `"tile" \| "ring" \| "bar"` | required | Visual shape |
| `mode` | `"value" \| "time"` | `"value"` | Data mode |
| `value` | `number` | `0` | Current value (value mode) |
| `min` | `number` | `0` | Minimum value |
| `max` | `number` | `100` | Maximum value |
| `unit` | `string` | — | Unit label (e.g., "GiB") |
| `targetDate` | `Date \| string` | — | Countdown target (time mode) |
| `autoTick` | `boolean` | `true` | Enable auto-tick timer (time mode) |
| `title` | `string` | — | Gauge title/name |
| `subtitle` | `string` | — | Subtitle text (auto-generated if omitted) |
| `size` | `GaugeSize \| number` | fluid | Predefined or pixel size |
| `orientation` | `"horizontal" \| "vertical"` | `"horizontal"` | Bar orientation |
| `thresholds` | `GaugeThreshold[]` | 70/30/10/0% | Colour thresholds |
| `invertThresholds` | `boolean` | `false` | Lower % = worse |
| `overLimitColor` | `string` | `"#dc3545"` | Over-limit colour |
| `overLimitLabel` | `string` | `"Over Limit"` | Over-limit text |
| `overdueColor` | `string` | `"#dc3545"` | Overdue colour |
| `overdueLabel` | `string` | `"Overdue"` | Overdue text |
| `formatValue` | `function` | — | Custom value formatter |
| `cssClass` | `string` | — | Additional CSS classes |
| `ariaLabel` | `string` | auto | Screen reader label |
| `onChange` | `function` | — | Fires on value change |
| `onOverLimit` | `function` | — | Fires when over-limit state entered |
| `onOverdue` | `function` | — | Fires when overdue state entered |

### Methods

| Method | Description |
|--------|-------------|
| `show(container?)` | Appends to container (ID string or HTMLElement) |
| `hide()` | Removes from DOM without destroying |
| `destroy()` | Hides, releases all references and timers |
| `setValue(value)` | Updates value and refreshes display |
| `setTargetDate(date)` | Updates target date and restarts auto-tick |
| `setThresholds(thresholds)` | Replaces threshold configuration |
| `getValue()` | Returns current value |
| `getPercentage()` | Returns current percentage |
| `isOverLimit()` | Returns true if value exceeds max |
| `isOverdue()` | Returns true if target date has passed |
| `isVisible()` | Returns visibility state |
| `getElement()` | Returns the root DOM element |

### Convenience Functions

```typescript
createGauge(options, container?)        // Create, show, and return
createTileGauge(options, container?)    // Shorthand for tile shape
createRingGauge(options, container?)    // Shorthand for ring shape
createBarGauge(options, container?)     // Shorthand for bar shape
```

### Global Exports

```
window.Gauge
window.createGauge
window.createTileGauge
window.createRingGauge
window.createBarGauge
```

## Shapes

### Tile

Square card with large value text on a coloured background. Best for dashboard KPI tiles.

### Ring

Circular SVG arc that fills based on percentage. Value displayed in the centre. Best for utilisation metrics.

### Bar

Horizontal or vertical bar with percentage fill. Best for inline progress/quota indicators.

## Threshold Configuration

Thresholds define colour boundaries based on percentage:

```javascript
createTileGauge({
    mode: "value",
    value: 75,
    max: 100,
    thresholds: [
        { value: 70, color: "#2b8a3e", label: "Good" },
        { value: 30, color: "#e67700", label: "Warning" },
        { value: 10, color: "#d9480f", label: "Danger" },
        { value: 0,  color: "#c92a2a", label: "Critical" }
    ]
}, "container");
```

For "remaining" scenarios where lower is worse, use `invertThresholds: true`.

## Size Variants

| Size | Pixels |
|------|--------|
| `"xs"` | 80px |
| `"sm"` | 120px |
| `"md"` | 180px |
| `"lg"` | 260px |
| `"xl"` | 360px |

Omit `size` for fluid mode — the gauge fills its parent container with `aspect-ratio: 1` (tile/ring) and scales typography via CSS container queries.

## Keyboard Accessibility

| Key | Action |
|-----|--------|
| Tab | Focus gauge element |

Gauge elements use `role="meter"` (value mode) or `role="timer"` (time mode) with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, and `aria-label` attributes.

See `specs/gauge.prd.md` for the complete specification.
