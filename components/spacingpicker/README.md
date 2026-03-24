# SpacingPicker

A dropdown showing line/paragraph spacing presets with visual SVG thumbnails. Each option displays a small box with horizontal lines at different vertical spacings to illustrate the visual difference. Designed for use in Ribbon toolbars, standalone toolbars, and property panels.

## Usage

```html
<link rel="stylesheet" href="components/spacingpicker/spacingpicker.css">
<script src="components/spacingpicker/spacingpicker.js"></script>

<div id="my-spacing"></div>

<script>
var picker = createSpacingPicker({
    container: "my-spacing",
    value: "1.5",
    onChange: function(preset) {
        console.log("Line height:", preset.lineHeight);
        console.log("After paragraph:", preset.afterParagraph, "px");
    }
});
</script>
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `container` | `HTMLElement \| string` | *required* | Container element or ID |
| `value` | `string` | `"1.15"` | Initial selected preset name |
| `presets` | `SpacingPreset[]` | built-in 6 | Custom preset definitions |
| `showCustom` | `boolean` | `true` | Show "Custom Spacing..." link |
| `onChange` | `(preset) => void` | | Callback on selection |
| `onCustom` | `() => void` | | Callback for custom link |
| `ribbonMode` | `boolean` | `true` | Ribbon-compatible rendering |

## Default Presets

| Name | Line Height | Before | After |
|------|-------------|--------|-------|
| Single | 1.0 | 0 | 0 |
| 1.15 | 1.15 | 0 | 8 |
| 1.5 | 1.5 | 0 | 8 |
| Double | 2.0 | 0 | 8 |
| Compact | 1.0 | 0 | 4 |
| Relaxed | 1.6 | 8 | 12 |

## API

| Method | Description |
|--------|-------------|
| `getValue()` | Returns the currently selected `SpacingPreset` |
| `setValue(name)` | Select a preset by name |
| `setPresets(presets)` | Replace all presets |
| `show()` | Open the dropdown |
| `hide()` | Close the dropdown |
| `destroy()` | Remove from DOM and clean up |
| `getElement()` | Get the root DOM element |

## Keyboard

| Key | Action |
|-----|--------|
| `Arrow Down` / `Arrow Up` | Navigate items |
| `Enter` / `Space` | Select focused item |
| `Escape` | Close dropdown |

## CSS Classes

| Class | Purpose |
|-------|---------|
| `.spacingpicker` | Root container |
| `.spacingpicker-trigger` | Dropdown button |
| `.spacingpicker-panel` | Dropdown panel |
| `.spacingpicker-item` | Preset item |
| `.spacingpicker-item--selected` | Selected state |
| `.spacingpicker-thumb` | SVG thumbnail |
| `.spacingpicker-custom` | Custom spacing link |
