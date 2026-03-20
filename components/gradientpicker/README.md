<!-- AGENT: Documentation for the GradientPicker component — gradient colour picker with draggable stops, linear/radial modes, presets, and DiagramEngine integration. -->

# GradientPicker

A gradient colour picker that enables users to create, edit, and preview linear and radial gradients with full alpha support. Features draggable stop handles, live CSS preview, preset swatches, and configurable min/max stops. Composes the existing ColorPicker and AnglePicker components for stop colour and angle editing. Operates in popup or inline mode.

## Assets

| Asset | Path |
|-------|------|
| CSS | `components/gradientpicker/gradientpicker.css` |
| JS | `components/gradientpicker/gradientpicker.js` |
| Types | `components/gradientpicker/gradientpicker.d.ts` |

## Requirements

- **Bootstrap CSS** — for SCSS variables (`$gray-*`, `$primary`, etc.) and form controls
- **Bootstrap Icons** — `bi-arrow-left-right`, `bi-x-lg`, `bi-chevron-down`
- Does **not** require Bootstrap JS.
- **ColorPicker** (optional) — for per-stop colour + alpha editing. Falls back to native `<input type="color">` + alpha slider.
- **AnglePicker** (optional) — for linear gradient angle control. Falls back to `<input type="number">`.

## Quick Start

```html
<link rel="stylesheet" href="components/gradientpicker/gradientpicker.css">
<script src="components/gradientpicker/gradientpicker.js"></script>
<script>
    var gradient = createGradientPicker("my-container", {
        value: {
            type: "linear",
            angle: 90,
            stops: [
                { position: 0, color: "#3B82F6", alpha: 1 },
                { position: 1, color: "#8B5CF6", alpha: 1 }
            ]
        },
        onChange: function(value) {
            console.log("Gradient:", value);
        }
    });
</script>
```

## Options (GradientPickerOptions)

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `value` | `Partial<GradientValue>` | — | Initial gradient value |
| `mode` | `"inline" \| "popup"` | `"popup"` | Display mode |
| `size` | `"mini" \| "sm" \| "default" \| "lg"` | `"default"` | Size variant |
| `popupPosition` | `"bottom-start" \| "bottom-end" \| "top-start" \| "top-end"` | `"bottom-start"` | Popup position relative to trigger |
| `minStops` | `number` | `2` | Minimum number of gradient stops |
| `maxStops` | `number` | `8` | Maximum number of gradient stops |
| `showTypeToggle` | `boolean` | `true` | Show linear/radial type toggle |
| `showAngle` | `boolean` | `true` | Show angle control (linear mode) |
| `showRadialControls` | `boolean` | `true` | Show centre/radius controls (radial mode) |
| `showReverse` | `boolean` | `true` | Show reverse button |
| `showClear` | `boolean` | `true` | Show clear button |
| `presets` | `GradientPreset[]` | (built-in) | Preset gradient swatches |
| `disabled` | `boolean` | `false` | Disable the component |
| `label` | `string` | — | Label text above the picker |
| `onChange` | `function` | — | Fires on any gradient change (stops, angle, type, centre, radius) |
| `onInput` | `function` | — | Fires continuously during drag operations |
| `onClear` | `function` | — | Fires when gradient is cleared |
| `onOpen` | `function` | — | Fires when popup opens |
| `onClose` | `function` | — | Fires when popup closes |

## API

| Method | Returns | Description |
|--------|---------|-------------|
| `getValue()` | `GradientValue` | Get the current gradient value |
| `setValue(value)` | `void` | Set the gradient programmatically |
| `getStops()` | `GradientStop[]` | Get stops only |
| `setStops(stops)` | `void` | Set stops only (preserves type, angle, etc.) |
| `getAngle()` | `number` | Get the angle (linear mode) |
| `setAngle(angle)` | `void` | Set the angle (linear mode) |
| `getType()` | `"linear" \| "radial"` | Get the gradient type |
| `setType(type)` | `void` | Set the gradient type |
| `reverse()` | `void` | Reverse all stop positions (1 - position) |
| `clear()` | `void` | Clear gradient (reset to default two-stop) |
| `toGradientDefinition()` | `GradientDefinition` | Convert current value to DiagramEngine format |
| `fromGradientDefinition(def)` | `void` | Load from a DiagramEngine GradientDefinition |
| `open()` | `void` | Open popup (popup mode only) |
| `close()` | `void` | Close popup (popup mode only) |
| `enable()` | `void` | Enable the component |
| `disable()` | `void` | Disable the component |
| `getElement()` | `HTMLElement \| null` | Get root DOM element |
| `destroy()` | `void` | Tear down and clean up |

### Factory Function

```typescript
createGradientPicker(containerId, options?)  // Create, show, and return
```

### Global Exports

```
window.GradientPicker
window.createGradientPicker
```

## GradientStop

Each stop defines a colour at a position along the gradient axis.

```typescript
interface GradientStop
{
    /** Position along the gradient axis. 0.0 = start, 1.0 = end. */
    position: number;

    /** Colour in hex (#RRGGBB) or rgba string. */
    color: string;

    /** Opacity for this stop. 0.0 = transparent, 1.0 = opaque. Default: 1.0. */
    alpha: number;
}
```

## GradientValue

The complete gradient state, including type, stops, angle, and radial parameters.

```typescript
interface GradientValue
{
    /** Gradient interpolation type. */
    type: "linear" | "radial";

    /** Ordered colour stops (minimum 2). */
    stops: GradientStop[];

    /** Angle in degrees for linear gradients (0 = right, 90 = down). */
    angle: number;

    /** Centre point for radial gradients (0-1 normalised). */
    center: { x: number; y: number };

    /** Radius for radial gradients (0-1 normalised). */
    radius: number;
}
```

## GradientPreset

A named preset with a full gradient definition.

```typescript
interface GradientPreset
{
    /** Display name for tooltip. */
    name: string;

    /** Gradient definition for this preset. */
    value: GradientValue;
}
```

## Size Variants

| Size | Trigger Height | Preview Bar | Handle Size | Panel Width |
|------|---------------|-------------|-------------|-------------|
| `mini` | 22px | 16px | 8x8px | 260px |
| `sm` | 28px | 18px | 10x10px | 280px |
| `default` | 34px | 24px | 12x12px | 320px |
| `lg` | 42px | 32px | 14x14px | 380px |

Panel width applies to both inline and popup modes. In popup mode, the trigger inherits the size variant height; the popup panel always uses the width above regardless of trigger size.

## Composition Dependencies

GradientPicker composes two sibling components at runtime via `window` factory lookup. Both are optional -- the picker degrades gracefully without them.

| Dependency | Lookup | Available | Behaviour |
|-----------|--------|-----------|-----------|
| ColorPicker | `window.createColorPicker` | Yes | Full colour picker with alpha for each stop |
| ColorPicker | `window.createColorPicker` | No | Simple `<input type="color">` + alpha slider |
| AnglePicker | `window.createAnglePicker` | Yes | Circular dial for angle selection |
| AnglePicker | `window.createAnglePicker` | No | `<input type="number" min="0" max="359">` |

### ColorPicker Composition

- Created once per GradientPicker instance, reused for all stops
- Options: `{ inline: true, showOpacity: true, showFormatTabs: false, size: "sm" }`
- Shown/hidden when a stop is selected/deselected
- `onInput` updates the selected stop's colour and alpha in real time
- `onChange` commits the final colour

### AnglePicker Composition

- Created once, embedded in the angle controls section
- Options: `{ mode: "dropdown", size: "sm", showTicks: true, showInput: true }`
- `onChange` updates the gradient angle and preview bar
- Falls back to `<input type="number">` if not available

## DiagramEngine Integration

`GradientValue` maps to DiagramEngine's `GradientDefinition` format. Use the conversion helpers:

| GradientValue | GradientDefinition |
|---------------|-------------------|
| `type` | `type` |
| `stops[].position` | `stops[].offset` |
| `stops[].color` + `stops[].alpha` | `stops[].color` (as rgba string) |
| `angle` | `angle` |
| `center` | `center` |
| `radius` | `radius` |

```javascript
// Export to DiagramEngine
var gradDef = gradient.toGradientDefinition();
diagramEngine.setShapeFill(shapeId, gradDef);

// Import from DiagramEngine
var def = diagramEngine.getShapeFill(shapeId);
gradient.fromGradientDefinition(def);
```

## Keyboard Accessibility

| Context | Key | Action |
|---------|-----|--------|
| Preview bar | Left / Right | Select prev / next stop handle |
| Selected handle | Left / Right | Move stop position by 1% |
| Selected handle | Shift+Left / Shift+Right | Move stop position by 5% |
| Selected handle | Enter / Space | Open ColorPicker for the stop |
| Selected handle | Delete / Backspace | Remove stop (if above minStops) |
| Popup | Escape | Close ColorPicker or popup |
| All controls | Tab | Move focus between type toggle, preview bar, stop handles, position input, angle/radial controls, presets, action buttons |

## Stop Handle Interactions

| Action | Behaviour |
|--------|-----------|
| Click on bar (empty area) | Add new stop at click position with interpolated colour |
| Click on handle | Select the stop for editing |
| Drag handle | Reposition stop (clamped 0-1, cannot pass adjacent stops) |
| Right-click handle | Remove stop (if above minStops) |
| Double-click handle | Open ColorPicker for that stop |
| Delete/Backspace on selected | Remove selected stop (if above minStops) |

## Default Presets

When `presets` is not provided, these built-in presets are available:

| Name | Type | Angle | Stops |
|------|------|-------|-------|
| Sunset | linear | 90 | `#FF512F` 0% -> `#F09819` 50% -> `#DD2476` 100% |
| Ocean | linear | 135 | `#2193B0` 0% -> `#6DD5ED` 100% |
| Grayscale | linear | 90 | `#000000` 0% -> `#FFFFFF` 100% |
| Forest | linear | 135 | `#134E5E` 0% -> `#71B280` 100% |
| Berry | linear | 135 | `#8E2DE2` 0% -> `#4A00E0` 100% |
| Fire | linear | 0 | `#F83600` 0% -> `#F9D423` 100% |

## onInput vs onChange

| Callback | When it fires | Use case |
|----------|---------------|----------|
| `onInput` | Every pointer move during stop drag, every keyboard step | Live preview (e.g. update shape fill in real time) |
| `onChange` | Stop drag end (pointer up), keyboard steps, type change, preset applied, angle change | Persist to backend, commit undo history |

Both callbacks receive `(value: GradientValue)`. During a drag, `onInput` fires continuously and `onChange` fires once on pointer release.

## Examples

### Inline gradient editor

```javascript
var gradient = createGradientPicker("fill-editor", {
    mode: "inline",
    value: {
        type: "linear",
        angle: 135,
        stops: [
            { position: 0, color: "#6366F1", alpha: 1 },
            { position: 0.5, color: "#EC4899", alpha: 0.8 },
            { position: 1, color: "#F59E0B", alpha: 1 }
        ]
    },
    onChange: function(value) {
        document.getElementById("preview").style.background = toCssGradient(value);
    }
});
```

### Popup with custom presets

```javascript
var gradient = createGradientPicker("toolbar-fill", {
    size: "sm",
    presets: [
        {
            name: "Brand",
            value: {
                type: "linear", angle: 90,
                stops: [
                    { position: 0, color: "#1E40AF", alpha: 1 },
                    { position: 1, color: "#7C3AED", alpha: 1 }
                ],
                center: { x: 0.5, y: 0.5 }, radius: 0.5
            }
        }
    ],
    onChange: function(value) {
        console.log("Gradient:", value);
    }
});
```

### DiagramEngine integration

```javascript
var gradient = createGradientPicker("shape-fill", {
    mode: "popup",
    size: "mini",
    onOpen: function() {
        // Load current shape gradient when picker opens
        var def = diagramEngine.getSelectedShapeFill();
        if (def) { gradient.fromGradientDefinition(def); }
    },
    onChange: function(value) {
        diagramEngine.setSelectedShapeFill(gradient.toGradientDefinition());
    }
});
```

## CDN Usage

```html
<!-- Bootstrap CSS and Icons -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css">

<!-- Optional: ColorPicker (for full colour editing) -->
<link rel="stylesheet" href="components/colorpicker/colorpicker.css">
<script src="components/colorpicker/colorpicker.js"></script>

<!-- Optional: AnglePicker (for angle dial) -->
<link rel="stylesheet" href="components/anglepicker/anglepicker.css">
<script src="components/anglepicker/anglepicker.js"></script>

<!-- GradientPicker -->
<link rel="stylesheet" href="components/gradientpicker/gradientpicker.css">
<script src="components/gradientpicker/gradientpicker.js"></script>

<div id="gradient-container"></div>
<script>
    var gradient = createGradientPicker("gradient-container", {
        mode: "inline",
        showTypeToggle: true,
        onChange: function(value) {
            console.log("Type:", value.type, "Stops:", value.stops.length);
        }
    });
</script>
```

See `specs/gradientpicker.prd.md` for the complete specification.
