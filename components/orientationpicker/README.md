# OrientationPicker

A simple dropdown picker for selecting page orientation (Portrait or Landscape). Each option displays a small SVG page icon in the corresponding orientation. Clicking an option selects it and fires the onChange callback. The trigger button shows the current selection with a chevron indicator.

## Usage

```html
<link rel="stylesheet" href="components/orientationpicker/orientationpicker.css">
<script src="components/orientationpicker/orientationpicker.js"></script>

<div id="my-orientation"></div>

<script>
var picker = createOrientationPicker({
    container: "my-orientation",
    value: "portrait",
    onChange: function(orientation) {
        console.log("Orientation:", orientation);
    }
});
</script>
```

### Using an HTMLElement Container

```html
<div id="toolbar-orient"></div>

<script>
var el = document.getElementById("toolbar-orient");
var picker = createOrientationPicker({
    container: el,
    value: "landscape",
    onChange: function(orientation) {
        console.log("Changed to:", orientation);
    }
});
</script>
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `container` | `HTMLElement \| string` | *required* | Container element or ID |
| `value` | `"portrait" \| "landscape"` | `"portrait"` | Initial orientation |
| `onChange` | `(orientation) => void` | -- | Fires when selection changes |
| `ribbonMode` | `boolean` | `false` | Ribbon-compatible mode |

## API

| Method | Returns | Description |
|--------|---------|-------------|
| `getValue()` | `"portrait" \| "landscape"` | Current orientation |
| `setValue(orientation)` | `void` | Set orientation programmatically |
| `show()` | `void` | Open the dropdown panel |
| `hide()` | `void` | Close the dropdown panel |
| `destroy()` | `void` | Tear down and remove from DOM |
| `getElement()` | `HTMLElement` | Root DOM element |

## Keyboard

| Key | Context | Action |
|-----|---------|--------|
| `ArrowDown` / `Enter` / `Space` | Trigger button | Open dropdown |
| `Enter` / `Space` | Dropdown item | Select item |
| `Escape` | Dropdown item | Close dropdown |

## Visual

Each orientation displays a small SVG page icon:

- **Portrait**: 24x32 white rectangle with 1px `#dee2e6` border and a small triangle fold in the top-right corner.
- **Landscape**: 32x24 white rectangle with the same border and fold styling.

The selected item shows a checkmark indicator.
