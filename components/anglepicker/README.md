# AnglePicker

A circular dial input for selecting angles from 0 to 360 degrees. Supports both inline (always-visible dial for property panels) and dropdown (compact trigger button for toolbars) modes. Includes optional live shadow preview, tick mark labels, and snap-to-increment dragging.

## Usage

### Inline Mode

```html
<link rel="stylesheet" href="components/anglepicker/anglepicker.css">
<script src="components/anglepicker/anglepicker.js"></script>

<div id="my-angle-picker"></div>

<script>
var picker = createAnglePicker("my-angle-picker", {
    value: 225,
    mode: "inline",
    showPreview: true,
    onChange: function(angle) {
        console.log("Angle:", angle + "°");
    }
});
</script>
```

### Dropdown Mode

```html
<div id="toolbar-angle"></div>

<script>
var picker = createAnglePicker("toolbar-angle", {
    value: 45,
    mode: "dropdown",
    size: "sm",
    onChange: function(angle) {
        console.log("Shadow angle:", angle);
    }
});
</script>
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `value` | `number` | `0` | Initial angle in degrees (0–359) |
| `mode` | `"inline" \| "dropdown"` | `"inline"` | Display mode |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Size variant |
| `step` | `number` | `1` | Arrow key increment in degrees |
| `snapStep` | `number` | `15` | Shift+drag / Shift+arrow snap increment |
| `showTicks` | `boolean` | `true` | Show tick marks on dial |
| `tickLabels` | `"none" \| "degrees" \| "compass"` | `"none"` | Tick label display mode |
| `showInput` | `boolean` | `true` | Show editable center input |
| `showPreview` | `boolean` | `false` | Show live shadow preview square |
| `previewDistance` | `number` | `6` | Shadow offset distance in px |
| `previewBlur` | `number` | `8` | Shadow blur radius in px |
| `previewColor` | `string` | `"rgba(0,0,0,0.4)"` | Shadow color |
| `disabled` | `boolean` | `false` | Disable the picker |
| `onChange` | `(angle: number) => void` | — | Fires on angle change |
| `onOpen` | `() => void` | — | Fires when dropdown opens |
| `onClose` | `() => void` | — | Fires when dropdown closes |

## API

| Method | Returns | Description |
|--------|---------|-------------|
| `getValue()` | `number` | Current angle (0–359) |
| `setValue(angle)` | `void` | Set angle programmatically |
| `open()` | `void` | Open dropdown (dropdown mode) |
| `close()` | `void` | Close dropdown (dropdown mode) |
| `enable()` | `void` | Enable the picker |
| `disable()` | `void` | Disable the picker |
| `getElement()` | `HTMLElement \| null` | Root DOM element |
| `destroy()` | `void` | Tear down and remove from DOM |

## Keyboard

### Dial Focused

| Key | Action |
|-----|--------|
| `Right` / `Up` | Increase by `step` (default 1°) |
| `Left` / `Down` | Decrease by `step` (default 1°) |
| `Shift + arrow` | Change by `snapStep` (default 15°) |
| `Home` | Jump to 0° |
| `End` | Jump to 359° |

### Dropdown Mode

| Key | Action |
|-----|--------|
| `ArrowDown` / `Enter` | Open dropdown |
| `Escape` | Close dropdown |

## Tick Labels

- `"none"` — no labels (default)
- `"degrees"` — shows 0°, 90°, 180°, 270° at cardinal positions
- `"compass"` — shows E, N, W, S at cardinal positions

## Shadow Preview

When `showPreview: true`, a small square appears beside the dial showing a live CSS `box-shadow` at the currently selected angle. The shadow distance, blur, and color are configurable.

## Sizes

| Size | Dial diameter |
|------|--------------|
| `sm` | 80px |
| `md` | 120px |
| `lg` | 160px |
