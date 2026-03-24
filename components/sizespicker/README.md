# SizesPicker

A dropdown listing page and frame sizes with proportional page thumbnails and dimensions. Each item shows a small proportional SVG rectangle, the size name, and width by height. Items are grouped by category (Paper, Screen, Mobile, Tablet). An optional "More Paper Sizes..." link at the bottom allows integration with custom size dialogs.

## Usage

```html
<link rel="stylesheet" href="components/sizespicker/sizespicker.css">
<script src="components/sizespicker/sizespicker.js"></script>

<div id="my-sizes-picker"></div>

<script>
var picker = createSizesPicker({
    container: "my-sizes-picker",
    value: "A4",
    onChange: function(size) {
        console.log("Selected:", size.name, size.width, "x", size.height);
    }
});
</script>
```

### With Custom Sizes

```html
<div id="custom-sizes"></div>

<script>
var picker = createSizesPicker({
    container: "custom-sizes",
    sizes: [
        { name: "Poster", width: 2400, height: 3600, category: "Print", displayWidth: '25"', displayHeight: '37.5"' },
        { name: "Banner", width: 4800, height: 1200, category: "Print", displayWidth: '50"', displayHeight: '12.5"' },
    ],
    onCustom: function() {
        alert("Open custom size dialog");
    }
});
</script>
```

### Filtered by Category

```html
<div id="paper-only"></div>

<script>
var picker = createSizesPicker({
    container: "paper-only",
    category: "Paper",
    onChange: function(size) {
        console.log("Paper size:", size.name);
    }
});
</script>
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `container` | `HTMLElement \| string` | required | Container element or ID |
| `value` | `string` | First size | Initial selected preset name |
| `sizes` | `SizePreset[]` | Built-in defaults | Custom size definitions |
| `category` | `string` | — | Filter to one category |
| `showCustom` | `boolean` | `true` | Show "More Paper Sizes..." link |
| `onChange` | `(size: SizePreset) => void` | — | Fires when a size is selected |
| `onCustom` | `() => void` | — | Fires when "More Paper Sizes..." is clicked |
| `ribbonMode` | `boolean` | `true` | Render as ribbon-compatible dropdown |

## API

| Method | Returns | Description |
|--------|---------|-------------|
| `getValue()` | `SizePreset` | Current selected size (returns a copy) |
| `setValue(name)` | `void` | Set selection by size name (case-insensitive) |
| `setSizes(sizes)` | `void` | Replace the size list and re-render |
| `show()` | `void` | Show the picker |
| `hide()` | `void` | Hide the picker |
| `destroy()` | `void` | Tear down and remove from DOM |
| `getElement()` | `HTMLElement` | Root DOM element |

## Default Sizes

| Name | Width | Height | Category |
|------|-------|--------|----------|
| Letter | 816px (8.5") | 1056px (11") | Paper |
| Legal | 816px (8.5") | 1344px (14") | Paper |
| A4 | 794px (8.27") | 1123px (11.69") | Paper |
| A5 | 559px (5.83") | 794px (8.27") | Paper |
| B5 (JIS) | 693px (7.17") | 979px (10.12") | Paper |
| Executive | 696px (7.25") | 1008px (10.5") | Paper |
| Full HD | 1920px | 1080px | Screen |
| iPhone 15 | 393px | 852px | Mobile |
| iPad Air | 820px | 1180px | Tablet |

## SizePreset Interface

```typescript
interface SizePreset {
    name: string;
    width: number;          // pixels at 96 DPI
    height: number;
    category?: string;      // "Paper", "Screen", "Mobile", etc.
    displayWidth?: string;  // human-readable width
    displayHeight?: string; // human-readable height
}
```

## Keyboard

| Key | Action |
|-----|--------|
| `Enter` / `Space` | Select focused item |
| `Tab` | Move focus between items |

## SVG Thumbnails

Each size item renders a proportional page rectangle as an inline SVG. The tallest page in the current list is scaled to 40px; all other widths and heights scale proportionally relative to the tallest entry. The rectangle uses a white fill with a `#dee2e6` border.
