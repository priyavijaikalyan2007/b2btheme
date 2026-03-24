# MarginsPicker

A dropdown component showing page margin presets with visual page thumbnails, modelled after Microsoft Word's Margins dropdown. Each option displays a small SVG page illustration with margin boundaries drawn, plus the preset name and exact Top/Bottom/Left/Right values in inches.

## Usage

```html
<link rel="stylesheet" href="components/marginspicker/marginspicker.css">
<script src="components/marginspicker/marginspicker.js"></script>

<div id="my-margins-picker"></div>

<script>
var picker = createMarginsPicker({
    container: "my-margins-picker",
    value: "Normal",
    onChange: function(preset) {
        console.log("Selected:", preset.name,
            "Top:", preset.top, "Bottom:", preset.bottom,
            "Left:", preset.left, "Right:", preset.right);
    }
});
</script>
```

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `container` | `HTMLElement \| string` | (required) | Container element or ID |
| `value` | `string` | `"Normal"` | Initial selected preset name |
| `presets` | `MarginPreset[]` | (6 built-in) | Custom preset definitions |
| `showCustom` | `boolean` | `true` | Show "Custom Margins..." link |
| `onChange` | `(preset) => void` | - | Callback when a preset is selected |
| `onCustom` | `() => void` | - | Callback when "Custom Margins..." is clicked |
| `ribbonMode` | `boolean` | `true` | Render as ribbon-compatible dropdown |

## Default Presets

| Name | Top | Bottom | Left | Right |
|------|-----|--------|------|-------|
| Normal | 1" | 1" | 1" | 1" |
| Narrow | 0.5" | 0.5" | 0.5" | 0.5" |
| Moderate | 1" | 1" | 0.75" | 0.75" |
| Wide | 1" | 1" | 2" | 2" |
| Mirrored | 1" | 1" | Inside: 1.25" | Outside: 1" |
| None | 0" | 0" | 0" | 0" |

## Public API

```typescript
interface MarginsPicker {
    getValue(): MarginPreset;
    setValue(presetName: string): void;
    setPresets(presets: MarginPreset[]): void;
    show(): void;
    hide(): void;
    destroy(): void;
    getElement(): HTMLElement;
}
```

## Custom Presets

```javascript
var picker = createMarginsPicker({
    container: "my-picker",
    presets: [
        { name: "A4 Standard", top: 1.5, bottom: 1.5, left: 1, right: 1 },
        { name: "Legal Tight", top: 0.75, bottom: 0.75, left: 0.5, right: 0.5 },
        { name: "Book Mirror", top: 1, bottom: 1, left: 1, right: 1,
          inside: 1.5, outside: 0.75 },
    ],
    showCustom: true,
    onCustom: function() {
        openCustomMarginsDialog();
    }
});
```

## Keyboard Navigation

| Key | Action |
|-----|--------|
| Enter / Space | Select focused preset or toggle dropdown |
| Escape | Close dropdown |
| Tab | Move focus; closes dropdown |

## Dark Mode

All colours use `var(--theme-*)` CSS custom properties and automatically adapt to dark mode when `data-bs-theme="dark"` is set on the `<html>` element.
