<!-- AGENT: Documentation for the Slider component — usage, API, and accessibility. -->

# Slider

A range input component with single-value and dual-thumb range modes, optional tick marks, value labels, keyboard navigation, and size variants. Supports both horizontal and vertical orientations.

## Purpose and Use Cases

- Numeric value selection in forms and settings panels
- Range selection (e.g., price range filters, date range bounds)
- Zoom, volume, opacity, and other continuous controls
- Ribbon toolbar controls for line width, font size, etc.

## Quick Start

```html
<!-- Dependencies -->
<link rel="stylesheet" href="css/custom.css">
<link rel="stylesheet" href="components/slider/slider.css">

<!-- Component -->
<div id="my-slider"></div>
<script src="components/slider/slider.js"></script>
<script>
    createSlider("my-slider", {
        min: 0,
        max: 100,
        value: 50,
        onChange: (v) => console.log("Value:", v)
    });
</script>
```

### Range Mode

```html
<div id="range-slider"></div>
<script>
    createSlider("range-slider", {
        mode: "range",
        min: 0,
        max: 1000,
        valueLow: 200,
        valueHigh: 800,
        formatValue: (v) => "$" + v,
        onChange: (r) => console.log("Range:", r.low, "-", r.high)
    });
</script>
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mode` | `"single" \| "range"` | `"single"` | Single thumb or dual-thumb range |
| `min` | `number` | `0` | Minimum value |
| `max` | `number` | `100` | Maximum value |
| `step` | `number` | `1` | Step increment |
| `value` | `number` | `50` | Current value (single mode) |
| `valueLow` | `number` | `25` | Low value (range mode) |
| `valueHigh` | `number` | `75` | High value (range mode) |
| `label` | `string` | `undefined` | Label text above the slider |
| `showValue` | `boolean` | `true` | Show value label below the slider |
| `showTicks` | `boolean` | `false` | Show tick marks along the track |
| `tickInterval` | `number` | Same as `step` | Interval between tick marks |
| `formatValue` | `(v: number) => string` | `String(v)` | Custom value formatter |
| `disabled` | `boolean` | `false` | Disable the slider |
| `orientation` | `"horizontal" \| "vertical"` | `"horizontal"` | Slider orientation |
| `size` | `"sm" \| "default" \| "lg"` | `"default"` | Size variant |
| `onChange` | `function` | `undefined` | Fired on value change |
| `onSlideStart` | `function` | `undefined` | Fired when drag begins |
| `onSlideEnd` | `function` | `undefined` | Fired when drag ends |

## Instance Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getValue()` | `number` | Current value (single mode) |
| `getRange()` | `{ low, high }` | Current range values |
| `setValue(v)` | `void` | Set value (single mode) |
| `setRange(low, high)` | `void` | Set range values |
| `setMin(v)` | `void` | Update minimum bound |
| `setMax(v)` | `void` | Update maximum bound |
| `setStep(v)` | `void` | Update step increment |
| `enable()` | `void` | Enable the slider |
| `disable()` | `void` | Disable the slider |
| `getElement()` | `HTMLElement` | Root DOM element |
| `destroy()` | `void` | Remove from DOM and clean up |

## Keyboard Interactions

| Key | Action |
|-----|--------|
| ArrowRight / ArrowUp | Increase by one step |
| ArrowLeft / ArrowDown | Decrease by one step |
| PageUp | Increase by 10x step |
| PageDown | Decrease by 10x step |
| Home | Jump to minimum |
| End | Jump to maximum |

In vertical orientation, ArrowUp/Down are the primary directional keys.

## Size Variants

```html
<div id="sm-slider"></div>
<div id="lg-slider"></div>
<script>
    createSlider("sm-slider", { size: "sm", value: 30 });
    createSlider("lg-slider", { size: "lg", value: 70 });
</script>
```

## Accessibility

- Each thumb has `role="slider"` with `aria-valuemin`, `aria-valuemax`, and `aria-valuenow`
- `aria-orientation` reflects horizontal or vertical mode
- `aria-label` is set from the `label` option
- Full keyboard navigation with arrow keys, Home, End, PageUp, PageDown
- Focus indicator uses `:focus-visible` ring

## Dependencies

| Dependency | Required | Notes |
|------------|----------|-------|
| Bootstrap 5 CSS | Yes | For base styling variables |
| Bootstrap 5 JS | No | Not used |
| Enterprise Theme CSS | Yes | For theme variable overrides |
