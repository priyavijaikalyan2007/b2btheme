<!-- AGENT: Documentation for the SymbolPicker component — usage, API, and accessibility. -->

# SymbolPicker

A grid-based symbol and icon picker for inserting Unicode characters and Bootstrap Icons. Includes categorized tabs, search filtering, recently-used tracking via localStorage, hover preview, and full keyboard navigation. Supports inline and popup display modes.

## Purpose and Use Cases

- Rich text editors that need a special character insertion dialog
- Form fields that require symbol or icon selection
- Document formatting toolbars and Ribbon controls
- Any UI where users browse and insert symbols or icons from a categorized grid

## Quick Start

### Inline Mode

```html
<!-- Dependencies -->
<link rel="stylesheet" href="css/custom.css">
<link rel="stylesheet" href="icons/bootstrap-icons.css">
<link rel="stylesheet" href="components/symbolpicker/symbolpicker.css">

<!-- Component -->
<div id="my-symbols"></div>
<script src="components/symbolpicker/symbolpicker.js"></script>
<script>
    createSymbolPicker("my-symbols", {
        inline: true,
        mode: "both",
        onInsert: (sym) => console.log("Inserted:", sym.char, sym.name)
    });
</script>
```

### Popup Mode

```html
<button id="sym-trigger">Insert Symbol</button>
<div id="sym-host"></div>
<script src="components/symbolpicker/symbolpicker.js"></script>
<script>
    createSymbolPicker("sym-host", {
        inline: false,
        triggerElement: document.getElementById("sym-trigger"),
        onInsert: (sym) => editor.insertText(sym.char)
    });
</script>
```

### ES Module

```js
import { createSymbolPicker } from "./components/symbolpicker/symbolpicker.js";

const picker = createSymbolPicker("my-symbols", {
    mode: "unicode",
    showRecent: true,
    onInsert: (sym) => insertCharacter(sym.char)
});
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mode` | `"unicode" \| "icons" \| "both"` | `"both"` | Which symbol sets to display |
| `categories` | `SymbolCategory[]` | Built-in set | Override default categories |
| `value` | `string` | `undefined` | Initially selected symbol code |
| `showRecent` | `boolean` | `true` | Show recently used section |
| `maxRecent` | `number` | `20` | Maximum recent items to remember |
| `showPreview` | `boolean` | `true` | Show enlarged preview on hover/select |
| `showSearch` | `boolean` | `true` | Show the search input |
| `columns` | `number` | `12` | Number of grid columns |
| `cellSize` | `number` | `32` | Cell size in pixels |
| `inline` | `boolean` | `false` | Render inline (`true`) or as popup (`false`) |
| `popupPosition` | `"bottom-start" \| "bottom-end" \| "top-start" \| "top-end"` | `"bottom-start"` | Popup position relative to trigger |
| `triggerElement` | `HTMLElement` | `undefined` | Custom trigger element for popup mode |
| `size` | `"sm" \| "default" \| "lg"` | `"default"` | Size variant |
| `disabled` | `boolean` | `false` | Disable the component |
| `onSelect` | `function` | `undefined` | Called when a symbol is highlighted |
| `onInsert` | `function` | `undefined` | Called when a symbol is inserted (double-click or button) |
| `onOpen` | `function` | `undefined` | Called when the popup opens |
| `onClose` | `function` | `undefined` | Called when the popup closes |
| `keyBindings` | `Partial<Record<string, string>>` | `undefined` | Override default keyboard bindings |

### SymbolItem

| Property | Type | Description |
|----------|------|-------------|
| `char` | `string` | The character (`"α"`) or icon class (`"bi-house"`) |
| `name` | `string` | Human-readable name (`"Greek Small Letter Alpha"`) |
| `code` | `string` | Unicode point (`"U+03B1"`) or icon class (`"bi-house"`) |
| `category` | `string` | Category id this item belongs to (`"greek"`, `"common"`) |

### SymbolCategory

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Machine id used for filtering |
| `label` | `string` | Human-readable label for the tab |
| `icon` | `string` | Optional Bootstrap Icon class for the tab |
| `items` | `SymbolItem[]` | Items belonging to this category |

## Instance Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `show(containerId?)` | `void` | Mount into a container element |
| `hide()` | `void` | Remove from DOM, keep state |
| `destroy()` | `void` | Remove from DOM and clean up all resources |
| `open()` | `void` | Open the popup panel |
| `close()` | `void` | Close the popup panel |
| `getValue()` | `string` | Selected symbol's code, or `""` if none |
| `getSelectedSymbol()` | `SymbolItem \| null` | Selected symbol object, or null |
| `setMode(mode)` | `void` | Switch to `"unicode"` or `"icons"` mode |
| `isOpen()` | `boolean` | Whether the popup is currently open |
| `enable()` | `void` | Enable the component |
| `disable()` | `void` | Disable the component; closes popup if open |
| `getElement()` | `HTMLElement \| null` | Root DOM element |

## Built-in Categories

### Unicode Categories (~500 symbols)

| Category | Id | Description |
|----------|----|-------------|
| Latin Extended | `latin` | Extended Latin characters and diacritics |
| Greek Letters | `greek` | Greek alphabet characters |
| Math Symbols | `math` | Mathematical operators and notation |
| Arrows | `arrows` | Directional arrow characters |
| Currency | `currency` | Currency signs from around the world |
| Punctuation | `punctuation` | Special punctuation marks |
| Box & Geometric | `box` | Box-drawing and geometric shapes |
| Emoji & Dingbats | `emoji` | Common emoji and dingbat characters |

### Bootstrap Icons Categories (~200 icons)

| Category | Id | Description |
|----------|----|-------------|
| Common Actions | `ico-common` | Frequently used action icons |
| Arrows & Navigation | `ico-arrows` | Directional and navigation icons |
| Files & Folders | `ico-files` | File and folder management icons |
| Communication | `ico-comm` | Chat, mail, and messaging icons |
| Media | `ico-media` | Audio, video, and playback icons |
| People & Social | `ico-people` | User and social interaction icons |
| Charts & Data | `ico-charts` | Data visualization icons |
| Alerts & Status | `ico-alerts` | Warning, info, and status icons |
| Technology | `ico-tech` | Hardware and technology icons |
| Miscellaneous | `ico-misc` | Other general-purpose icons |

## Icon Auto-Discovery

The SymbolPicker automatically scans all loaded CSS stylesheets at initialization to discover available icons. This works for both **Bootstrap Icons** and **Font Awesome** icons.

### How It Works

1. On first instantiation, the picker scans `document.styleSheets` for CSS rules matching `.bi-*::before` and `.fa-*::before` selectors.
2. Discovered icons are automatically categorized into heuristic groups (Arrows, Files, Communication, Media, People, Charts, Alerts, Technology, Commerce, Places, General).
3. Results are cached at the module level — subsequent picker instances reuse the cache.
4. If no icon stylesheets are detected (e.g., Bootstrap Icons CSS is not loaded), the picker falls back to the built-in curated set of ~178 icons.

### Font Awesome Support

When Font Awesome CSS is loaded, the picker detects the available style class (`fa-solid`, `fa-regular`, `fa-brands`, `fa-light`, or `fa-thin`) by probing the DOM. Icons render with the correct style prefix automatically.

```html
<!-- Load Font Awesome alongside Bootstrap Icons -->
<link rel="stylesheet" href="icons/bootstrap-icons.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">

<script>
    // SymbolPicker will auto-discover both BI and FA icons
    createSymbolPicker("my-picker", { mode: "icons" });
</script>
```

### Discovery Limitations

- Cross-origin stylesheets (e.g., CDN fonts without CORS headers) may not be scannable due to browser security restrictions. The picker handles this gracefully and skips inaccessible sheets.
- Discovery runs synchronously at construction time. Stylesheets loaded after the picker is created will not be included unless the cache is cleared.

## Keyboard Interactions

| Key | Action |
|-----|--------|
| ArrowLeft | Move to previous cell |
| ArrowRight | Move to next cell |
| ArrowUp | Move up one row |
| ArrowDown | Move down one row |
| Enter | Insert the highlighted symbol |
| Escape | Close the popup |
| Home | Jump to first cell |
| End | Jump to last cell |
| Ctrl+F | Focus the search input |

Key bindings can be overridden via the `keyBindings` option using action names: `moveLeft`, `moveRight`, `moveUp`, `moveDown`, `confirmInsert`, `closePopup`, `jumpToFirst`, `jumpToLast`, `focusSearch`.

## Recently Used

When `showRecent: true` (the default), the picker displays a "Recently Used" row above the category grid. Selections are persisted to `localStorage` under the key `symbolpicker-recent`. Configure the maximum count with `maxRecent` (default 20).

## Size Variants

```html
<script>createSymbolPicker("sm-picker", { inline: true, size: "sm" });</script>
<script>createSymbolPicker("default-picker", { inline: true });</script>
<script>createSymbolPicker("lg-picker", { inline: true, size: "lg" });</script>
```

Size classes applied: `symbolpicker-sm`, `symbolpicker-lg`.

## Accessibility

- Trigger button has `aria-haspopup="true"`, `aria-expanded`, and `aria-label="Insert symbol"`
- Mode tabs use `role="tablist"` with `aria-label="Symbol mode"` and `aria-selected` on each tab
- Category bar uses `role="tablist"` with `aria-label="Symbol categories"` and `aria-selected` per tab
- Symbol grid has `aria-label="Symbol grid"` for screen reader context
- Preview area uses `aria-live="polite"` to announce the selected symbol
- Search input has `aria-label="Search symbols"`
- Full keyboard navigation with arrow keys, Home, End, and Ctrl+F for search focus

## Dependencies

| Dependency | Required | Notes |
|------------|----------|-------|
| Bootstrap 5 CSS | Yes | For base styling variables |
| Bootstrap 5 JS | No | Not used by this component |
| Bootstrap Icons | Yes | For tab icons and the icons mode categories |
| Enterprise Theme CSS | Yes | For theme variable overrides |
