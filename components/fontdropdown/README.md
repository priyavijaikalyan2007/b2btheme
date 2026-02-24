<!-- AGENT: Documentation for the FontDropdown component — usage, API, and accessibility. -->

# FontDropdown

A dropdown where each font name renders in its own typeface, similar to the font picker in Google Docs. Includes a search input for filtering, recently-used tracking via localStorage, and full keyboard navigation.

## Purpose and Use Cases

- Rich text editors that need a font family picker
- Document formatting toolbars and Ribbon controls
- Theme or typography configuration panels
- Any UI where users select from a list of fonts with live preview

## Quick Start

### Script Tag

```html
<!-- Dependencies -->
<link rel="stylesheet" href="css/custom.css">
<link rel="stylesheet" href="icons/bootstrap-icons.css">
<link rel="stylesheet" href="components/fontdropdown/fontdropdown.css">

<!-- Component -->
<div id="my-fonts"></div>
<script src="components/fontdropdown/fontdropdown.js"></script>
<script>
    createFontDropdown("my-fonts", {
        value: "Georgia, serif",
        showRecent: true,
        onChange: (font) => console.log("Selected:", font.label)
    });
</script>
```

### ES Module

```js
import { createFontDropdown } from "./components/fontdropdown/fontdropdown.js";

const picker = createFontDropdown("my-fonts", {
    placeholder: "Choose a font...",
    previewText: "The quick brown fox",
    onChange: (font) => applyFont(font.value)
});
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `fonts` | `FontItem[]` | 17 web-safe fonts | Custom font list; see Default Fonts below |
| `value` | `string` | `undefined` | Initially selected font value |
| `placeholder` | `string` | `"Select font..."` | Placeholder text when no font is selected |
| `showRecent` | `boolean` | `false` | Show recently-used fonts section |
| `maxRecent` | `number` | `5` | Maximum number of recent fonts to remember |
| `previewText` | `string` | `undefined` | Optional preview text shown beside each font name |
| `size` | `"sm" \| "default" \| "lg"` | `"default"` | Size variant |
| `disabled` | `boolean` | `false` | Disables the dropdown |
| `maxVisibleItems` | `number` | `8` | Max visible items before scrolling |
| `onChange` | `function` | `undefined` | Called when the selected font changes |
| `onOpen` | `function` | `undefined` | Called when the dropdown opens |
| `onClose` | `function` | `undefined` | Called when the dropdown closes |
| `keyBindings` | `Partial<Record<string, string>>` | `undefined` | Override default keyboard bindings |

### FontItem

| Property | Type | Description |
|----------|------|-------------|
| `label` | `string` | Display name shown in the dropdown (e.g. `"Arial"`) |
| `value` | `string` | CSS font-family value (e.g. `"Arial, sans-serif"`) |

## Instance Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getValue()` | `string` | Current font-family value, or `""` if none |
| `getSelectedFont()` | `FontItem \| null` | Selected font object, or null |
| `setValue(value)` | `void` | Select a font by value or label |
| `setFonts(fonts)` | `void` | Replace the entire font list |
| `open()` | `void` | Open the dropdown |
| `close()` | `void` | Close the dropdown |
| `enable()` | `void` | Enable the component |
| `disable()` | `void` | Disable the component |
| `getElement()` | `HTMLElement \| null` | Root DOM element |
| `destroy()` | `void` | Remove from DOM and clean up |

## Default Fonts

The component ships with 17 web-safe fonts when no custom `fonts` array is provided:

Arial, Calibri, Cambria, Comic Sans MS, Consolas, Courier New, Georgia, Helvetica, Impact, JetBrains Mono, Lucida Console, Open Sans, Palatino, Tahoma, Times New Roman, Trebuchet MS, Verdana.

## Keyboard Interactions

| Key | Closed | Open |
|-----|--------|------|
| ArrowDown | Opens dropdown | Highlights next item |
| ArrowUp | Opens dropdown | Highlights previous item |
| Space | Opens dropdown | Types in search |
| Enter | No effect | Selects highlighted item |
| Escape | No effect | Closes dropdown |
| Home | No effect | First item |
| End | No effect | Last item |
| PageUp/Down | No effect | Scroll by page |

Key bindings can be overridden via the `keyBindings` option using action names: `openOrMoveDown`, `openOrMoveUp`, `confirmSelection`, `closeDropdown`, `jumpToFirst`, `jumpToLast`, `pageDown`, `pageUp`.

## Recently Used Fonts

When `showRecent: true`, the dropdown displays a "Recently Used" section above the full font list. Selections are persisted to `localStorage` under the key `fontdropdown-recent`. Configure the maximum count with `maxRecent` (default 5).

## Size Variants

```html
<script>createFontDropdown("sm-picker", { size: "sm" });</script>
<script>createFontDropdown("default-picker", {});</script>
<script>createFontDropdown("lg-picker", { size: "lg" });</script>
```

Size classes applied: `fontdropdown-sm`, `fontdropdown-lg`.

## Ribbon Integration

Register FontDropdown as a custom control in the Ribbon component:

```js
const ribbon = createRibbon("ribbon-host", {
    tabs: [{
        label: "Home",
        groups: [{
            label: "Font",
            controls: [{
                type: "custom",
                render: (container) => {
                    createFontDropdown(container.id, {
                        size: "sm",
                        showRecent: true,
                        onChange: (font) => applyFont(font.value)
                    });
                }
            }]
        }]
    }]
});
```

## Accessibility

- `role="combobox"` on the trigger with `aria-expanded`, `aria-haspopup="listbox"`
- `role="listbox"` on the font list, `role="option"` on each item
- `aria-selected="true"` on the currently selected item
- `aria-activedescendant` tracks the highlighted item during keyboard navigation
- `aria-label` on both trigger (`"Font selector"`) and search input (`"Filter fonts"`)
- Search match highlighting via `<mark>` elements
- "No matching fonts" message uses `role="presentation"`

## Dependencies

| Dependency | Required | Notes |
|------------|----------|-------|
| Bootstrap 5 CSS | Yes | For base styling variables |
| Bootstrap 5 JS | No | Not used by this component |
| Bootstrap Icons | Yes | For `bi-chevron-down` caret icon |
| Enterprise Theme CSS | Yes | For theme variable overrides |
