# ColumnsPicker

A dropdown showing column layout presets with visual SVG page thumbnails. Each option displays a small page icon with vertical column dividers and horizontal placeholder lines illustrating the layout. Designed for use in Ribbon toolbars, standalone toolbars, and property panels.

## Usage

```html
<link rel="stylesheet" href="components/columnspicker/columnspicker.css">
<script src="components/columnspicker/columnspicker.js"></script>

<div id="my-columns"></div>

<script>
var picker = createColumnsPicker({
    container: "my-columns",
    value: "Two",
    onChange: function(preset) {
        console.log("Columns:", preset.columns, "Widths:", preset.widths);
    }
});
</script>
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `container` | `HTMLElement \| string` | *required* | Container element or ID |
| `value` | `string` | `"One"` | Initial selected preset name |
| `presets` | `ColumnPreset[]` | built-in 5 | Custom preset definitions |
| `showCustom` | `boolean` | `true` | Show "Custom Columns..." link |
| `onChange` | `(preset) => void` | | Callback on selection |
| `onCustom` | `() => void` | | Callback for custom link |
| `ribbonMode` | `boolean` | `true` | Ribbon-compatible rendering |

## Default Presets

| Name | Columns | Widths |
|------|---------|--------|
| One | 1 | [1] |
| Two | 2 | [1, 1] |
| Three | 3 | [1, 1, 1] |
| Left | 2 | [1, 2] (narrow-wide) |
| Right | 2 | [2, 1] (wide-narrow) |

## API

| Method | Description |
|--------|-------------|
| `getValue()` | Returns the currently selected `ColumnPreset` |
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
| `.columnspicker` | Root container |
| `.columnspicker-trigger` | Dropdown button |
| `.columnspicker-panel` | Dropdown panel |
| `.columnspicker-item` | Preset item |
| `.columnspicker-item--selected` | Selected state |
| `.columnspicker-thumb` | SVG thumbnail |
| `.columnspicker-custom` | Custom columns link |
