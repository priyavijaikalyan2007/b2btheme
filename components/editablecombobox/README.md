<!-- AGENT: Documentation for the EditableComboBox component — usage, API, and accessibility. -->

# EditableComboBox

A combined text input and dropdown list component built on Bootstrap 5. Users can type free text or select a value from a filterable dropdown.

## Purpose and Use Cases

- Searchable selectors with large option lists
- Fields where users may type a custom value or pick from suggestions
- Tag entry with auto-complete suggestions
- Country, region, or status selectors

## Quick Start

### Script Tag

```html
<!-- Dependencies -->
<link rel="stylesheet" href="css/custom.css">
<link rel="stylesheet" href="icons/bootstrap-icons.css">
<link rel="stylesheet" href="components/editablecombobox/editablecombobox.css">

<!-- Component -->
<div id="my-combo"></div>
<script src="components/editablecombobox/editablecombobox.js"></script>
<script>
    createEditableComboBox("my-combo", {
        items: [
            { label: "Apple" },
            { label: "Banana" },
            { label: "Cherry" }
        ],
        placeholder: "Pick a fruit..."
    });
</script>
```

### ES Module

```js
import { createEditableComboBox } from "./components/editablecombobox/editablecombobox.js";

const combo = createEditableComboBox("my-combo", {
    items: [{ label: "Red" }, { label: "Green" }, { label: "Blue" }],
    onSelect: (item) => console.log("Selected:", item.label)
});
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `items` | `ComboBoxItem[]` | Required | The items to display in the dropdown |
| `placeholder` | `string` | `undefined` | Placeholder text for the input |
| `value` | `string` | `undefined` | Initial input value |
| `restrictToItems` | `boolean` | `false` | When true, only list values are accepted |
| `maxVisibleItems` | `number` | `8` | Max visible items before scrolling |
| `minFilterLength` | `number` | `0` | Min characters before filtering starts |
| `disabled` | `boolean` | `false` | Disables the component |
| `readonly` | `boolean` | `false` | Makes input non-editable; dropdown still works |
| `size` | `"sm" \| "default" \| "lg"` | `"default"` | Size variant |
| `filterFn` | `function` | Substring match | Custom filter function |
| `onSelect` | `function` | `undefined` | Called when an item is selected |
| `onChange` | `function` | `undefined` | Called when input value changes |
| `onOpen` | `function` | `undefined` | Called when dropdown opens |
| `onClose` | `function` | `undefined` | Called when dropdown closes |

### ComboBoxItem

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `label` | `string` | Required | Display text |
| `value` | `string` | `undefined` | Programmatic value (distinct from label) |
| `disabled` | `boolean` | `false` | Item is visible but not selectable |
| `group` | `string` | `undefined` | Group header under which the item appears |

## Instance Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getValue()` | `string` | Current input text |
| `getSelectedItem()` | `ComboBoxItem \| null` | Selected item, or null for free text |
| `setValue(value)` | `void` | Set input value programmatically |
| `setItems(items)` | `void` | Replace the dropdown items |
| `open()` | `void` | Open the dropdown |
| `close()` | `void` | Close the dropdown |
| `enable()` | `void` | Enable the component |
| `disable()` | `void` | Disable the component |
| `destroy()` | `void` | Remove from DOM and clean up |

## Keyboard Interactions

| Key | Closed | Open |
|-----|--------|------|
| ArrowDown | Opens, highlights first | Highlights next |
| ArrowUp | Opens, highlights last | Highlights previous |
| Enter | No effect | Selects highlighted item |
| Escape | No effect | Closes dropdown |
| Tab | Normal tab | Commits highlight, moves focus |
| Home/End | Cursor in input | First/last item |
| PageUp/Down | No effect | Scroll by 10 items |

## Accessibility

- Implements the WAI-ARIA Combobox pattern
- `role="combobox"` on the input with `aria-expanded`, `aria-controls`, `aria-activedescendant`
- `role="listbox"` on the dropdown, `role="option"` on each item
- Focus stays on the input; items are highlighted via `aria-activedescendant`
- "No matches" message uses `role="status"` for screen reader announcement

## Dependencies

| Dependency | Required | Notes |
|------------|----------|-------|
| Bootstrap 5 CSS | Yes | For `input-group`, `form-control`, `btn` |
| Bootstrap 5 JS | No | Not used by this component |
| Bootstrap Icons | Yes | For `bi-chevron-down` |
| Enterprise Theme CSS | Yes | For theme variable overrides |
