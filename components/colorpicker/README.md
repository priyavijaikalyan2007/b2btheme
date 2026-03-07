<!-- AGENT: Documentation for the ColorPicker component — canvas-based colour selection with hex/RGB/HSL formats, opacity, and swatches. -->

# ColorPicker

A canvas-based colour selection control with saturation/brightness gradient, vertical hue strip, optional opacity slider, hex/RGB/HSL format tabs, text inputs, and configurable preset swatches. Operates in popup or inline mode.

## Assets

| Asset | Path |
|-------|------|
| CSS | `components/colorpicker/colorpicker.css` |
| JS | `components/colorpicker/colorpicker.js` |
| Types | `components/colorpicker/colorpicker.d.ts` |

## Requirements

- **Bootstrap CSS** — for SCSS variables (`$gray-*`, `$primary`, etc.)
- **Bootstrap Icons** — `bi-clipboard`, `bi-check2`
- Does **not** require Bootstrap JS.
- No external colour libraries — all conversions are internal.

## Quick Start

```html
<link rel="stylesheet" href="components/colorpicker/colorpicker.css">
<script src="components/colorpicker/colorpicker.js"></script>
<script>
    var picker = createColorPicker("my-container", {
        value: "#FF5733",
        showOpacity: true,
        swatches: ["#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6"],
        onChange: function(color, alpha) {
            console.log("Selected:", color, "Alpha:", alpha);
        }
    });
</script>
```

## Options (ColorPickerOptions)

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `value` | `string` | `"#3B82F6"` | Initial colour (hex string) |
| `format` | `"hex" \| "rgb" \| "hsl"` | `"hex"` | Output format for `getValue()` |
| `showOpacity` | `boolean` | `false` | Show alpha/opacity slider |
| `showFormatTabs` | `boolean` | `true` | Show hex/RGB/HSL format tabs |
| `showInputs` | `boolean` | `true` | Show text input fields |
| `swatches` | `string[]` | — | Preset swatch colours (hex strings) |
| `inline` | `boolean` | `false` | Render inline (true) or popup (false) |
| `popupPosition` | `string` | `"bottom-start"` | Popup position: `bottom-start`, `bottom-end`, `top-start`, `top-end` |
| `triggerElement` | `HTMLElement` | — | Custom trigger element (popup only) |
| `label` | `string` | — | Optional label displayed above the picker |
| `disabled` | `boolean` | `false` | Disable the component |
| `size` | `"mini" \| "sm" \| "default" \| "lg"` | `"default"` | Size variant |
| `onChange` | `function` | — | Called on commit (swatch click, Enter, popup close, drag end) |
| `onInput` | `function` | — | Called continuously during drag and on every colour adjustment |
| `onOpen` | `function` | — | Called when popup opens |
| `onClose` | `function` | — | Called when popup closes |

## API

| Method | Returns | Description |
|--------|---------|-------------|
| `show(containerId?)` | `void` | Append to container (or body) |
| `hide()` | `void` | Remove from DOM, keep state |
| `destroy()` | `void` | Hide, clean up, null references |
| `getValue()` | `string` | Colour in configured format |
| `getValueWithAlpha()` | `string` | Colour as `rgba()` string |
| `setValue(color)` | `void` | Set colour (hex, rgb(), or hsl()) |
| `getAlpha()` | `number` | Current alpha (0-1) |
| `setAlpha(a)` | `void` | Set alpha (clamped 0-1) |
| `open()` | `void` | Open popup (no-op inline) |
| `close()` | `void` | Close popup (no-op inline) |
| `getElement()` | `HTMLElement` | Root DOM element |
| `getPopupElement()` | `HTMLElement \| null` | Popup panel element (null if inline or closed) |
| `setLabel(label)` | `void` | Update or create the label text |
| `enable()` | `void` | Enable the component |
| `disable()` | `void` | Disable; closes popup if open |

### Convenience Function

```typescript
createColorPicker(containerId, options?)  // Create, show, and return
```

### Global Exports

```
window.ColorPicker
window.createColorPicker
```

## Keyboard Accessibility

| Context | Key | Action |
|---------|-----|--------|
| Palette | Arrow keys | Move saturation/brightness by 1% |
| Palette | Shift+Arrow | Move by 10% |
| Hue strip | ArrowUp/Down | Change hue by 1 degree |
| Hue strip | Shift+Arrow | Change hue by 10 degrees |
| Opacity | ArrowLeft/Right | Change alpha by 1% |
| Opacity | Shift+Arrow | Change alpha by 10% |
| Swatch | Enter/Space | Select swatch colour |
| Text input | Enter | Apply typed value |
| Popup | Escape | Close popup, return focus to trigger |

## Accessibility

- Palette, hue strip, and opacity have `role="slider"` with `aria-valuenow/min/max`
- Swatch grid has `role="listbox"` with `role="option"` items
- Format tabs use `role="tablist"` and `role="tab"` with `aria-selected`
- Trigger button has `aria-haspopup="dialog"` and `aria-expanded`
- `aria-live="polite"` region announces colour changes

## onInput vs onChange

| Callback | When it fires | Use case |
|----------|---------------|----------|
| `onInput` | Every pointer move during drag, every keyboard step, every commit | Live preview (e.g. update canvas fill in real time) |
| `onChange` | Swatch click, Enter in hex input, drag end (pointer up), keyboard steps | Persist to backend, commit undo history |

Both callbacks receive `(color: string, alpha?: number)`. During a drag, `onInput` fires continuously and `onChange` fires once on pointer release. On discrete actions (keyboard, swatch, Enter), both fire together.

## Disabled State

When disabled (`disabled: true` or `disable()` method):

- **Inline mode**: entire picker has `opacity: 0.5`, all interactions disabled, swatches show `cursor: not-allowed` with no hover scale.
- **Popup mode**: trigger shows `cursor: not-allowed`, hover border suppressed, click does not open popup. Trigger has `aria-disabled="true"`.

## Examples

### Live preview with onInput

```javascript
var picker = createColorPicker("canvas-tools", {
    value: "#3B82F6",
    label: "Fill",
    onInput: function(color) {
        // Real-time preview while dragging
        selectedShape.style.fill = color;
    },
    onChange: function(color) {
        // Commit: save to backend
        api.updateShapeFill(shapeId, color);
    }
});
```

### Accessing the popup element

```javascript
var picker = createColorPicker("dock-panel", {
    value: "#10B981",
    onOpen: function() {
        var popup = picker.getPopupElement();
        if (popup) { popup.style.zIndex = "2000"; }
    }
});
```

### Label option

```javascript
var fill = createColorPicker("fill-container", {
    label: "Fill",
    inline: true,
    value: "#3B82F6"
});

var stroke = createColorPicker("stroke-container", {
    label: "Stroke",
    inline: true,
    value: "#1F2937"
});
```

### Inline picker with opacity

```javascript
var picker = createColorPicker("theme-editor", {
    value: "#6366F1",
    inline: true,
    showOpacity: true,
    format: "rgb",
    onChange: function(color, alpha) {
        document.getElementById("preview").style.backgroundColor = color;
    }
});
```

### Popup with preset swatches

```javascript
var picker = createColorPicker("brand-color", {
    value: "#10B981",
    swatches: [
        "#EF4444", "#F59E0B", "#10B981", "#3B82F6",
        "#8B5CF6", "#EC4899", "#6B7280", "#1F2937"
    ],
    onChange: function(color) {
        console.log("Brand colour:", color);
    }
});
```

See `specs/colorpicker.prd.md` for the complete specification.
