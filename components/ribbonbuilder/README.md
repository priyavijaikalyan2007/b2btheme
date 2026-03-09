<!-- AGENT: Documentation for the RibbonBuilder visual WYSIWYG Ribbon layout editor component. -->

# RibbonBuilder

Visual WYSIWYG editor for composing Ribbon toolbar layouts via drag-and-drop. Exports Markdown specs consumable by coding agents and JSON configs for direct use with `createRibbon()`.

## Usage

### HTML

```html
<link rel="stylesheet" href="components/ribbonbuilder/ribbonbuilder.css">
<script src="components/ribbon/ribbon.js"></script>
<script src="components/ribbonbuilder/ribbonbuilder.js"></script>

<div id="my-ribbon-builder"></div>
```

### Enhanced Icon Picker

When the SymbolPicker component is loaded, the icon picker auto-discovers all Bootstrap Icons and Font Awesome icons from loaded stylesheets (hundreds of icons). Falls back to a built-in curated set of 62 icons if SymbolPicker is not loaded.

```html
<!-- Optional: load for enhanced icon picker -->
<link rel="stylesheet" href="components/symbolpicker/symbolpicker.css">
<script src="components/symbolpicker/symbolpicker.js"></script>
```

### JavaScript

```javascript
var builder = createRibbonBuilder({
    onChange: function(config) {
        console.log("Config updated:", config);
    },
    onExport: function(markdown) {
        console.log("Markdown exported:", markdown);
    }
}, "my-ribbon-builder");
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `initialConfig` | `Partial<RibbonOptions>` | starter layout | Pre-loaded config to edit |
| `container` | `HTMLElement \| string` | — | Container element or ID |
| `previewHeight` | `number` | `96` | Live preview min-height (px) |
| `treeWidth` | `number` | `240` | Structure tree panel width (px) |
| `onChange` | `(config) => void` | — | Fires on every config change |
| `onExport` | `(markdown) => void` | — | Fires on Markdown export |
| `cssClass` | `string` | — | Extra CSS class on root |

## Handle API

| Method | Returns | Description |
|--------|---------|-------------|
| `show(containerId?)` | `void` | Mount into a container |
| `destroy()` | `void` | Tear down component |
| `getConfig()` | `RibbonOptions` | Deep copy of current config |
| `setConfig(config)` | `void` | Replace the current config |
| `exportMarkdown()` | `string` | Export as structured Markdown |
| `exportJSON()` | `string` | Export as formatted JSON |
| `importJSON(json)` | `void` | Import from JSON string |
| `getElement()` | `HTMLElement` | Root DOM element |

## Layout

The editor has three panels:

1. **Toolbar** (top) — Add Tab, Add Group, Add Control dropdown, Delete, Export MD, Export JSON, Import JSON
2. **Live Preview** (middle) — Real-time Ribbon preview rebuilt on every change (250ms debounce)
3. **Bottom Split** — Structure tree (left, resizable) and Property panel with Icon picker (right)

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Delete` / `Backspace` | Remove selected node |
| `F2` | Focus the first property field (rename) |
| `ArrowUp` / `ArrowDown` | Move selection in tree |

## Drag-and-Drop

- Controls can be dragged between groups
- Groups can be dragged between tabs
- Tabs can be reordered
- Drop position: top 25% = before, middle 50% = inside, bottom 25% = after

## Export Formats

### Markdown

Structured tables per group with columns: #, Type, ID, Label, Icon, Size, Extra. Full JSON appended at end.

### JSON

Standard `RibbonOptions` object — paste directly into `createRibbon()` calls.

## Dependencies

- **Ribbon** (`ribbon.js` + `ribbon.css`) — required for live preview
- **Bootstrap Icons** — icon picker uses Bootstrap Icon classes
