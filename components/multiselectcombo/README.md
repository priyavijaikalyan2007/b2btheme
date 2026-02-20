<!-- AGENT: Documentation for the MultiselectCombo component — multi-select combo box with chips and checkboxes. -->

# MultiselectCombo

A multi-select combo box that allows users to choose multiple items from a filterable dropdown list. Selected items appear as removable chips or a compact count badge. Each dropdown item has a checkbox that toggles selection without closing the dropdown.

## Assets

| Asset | Path |
|-------|------|
| CSS | `dist/components/multiselectcombo/multiselectcombo.css` |
| JS | `dist/components/multiselectcombo/multiselectcombo.js` |
| Types | `dist/components/multiselectcombo/multiselectcombo.d.ts` |

## Requirements

- **Bootstrap CSS** — for SCSS variables
- **Bootstrap Icons** — for `bi-chevron-down`, `bi-search`, `bi-x` icons
- Does **not** require Bootstrap JS.

## Quick Start

```html
<link rel="stylesheet" href="dist/components/multiselectcombo/multiselectcombo.css">
<script src="dist/components/multiselectcombo/multiselectcombo.js"></script>
<script>
    var combo = createMultiselectCombo({
        items: [
            { value: "a", label: "Apple" },
            { value: "b", label: "Banana" },
            { value: "c", label: "Cherry" },
            { value: "d", label: "Date" }
        ],
        placeholder: "Pick fruits...",
        onChange: function(values) { console.log("Selected:", values); }
    }, "my-container");
</script>
```

## API

### Interfaces

#### ComboItem

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `value` | `string` | **required** | Programmatic identifier |
| `label` | `string` | **required** | Display text in dropdown and chips |
| `group` | `string` | — | Grouping label for group headers |
| `icon` | `string` | — | Bootstrap Icons class(es) |
| `disabled` | `boolean` | `false` | Item is shown but not selectable |
| `data` | `object` | — | Arbitrary consumer data (not rendered) |

#### MultiselectComboOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `items` | `ComboItem[]` | **required** | Items to display in the dropdown |
| `selected` | `string[]` | `[]` | Initial selected values |
| `placeholder` | `string` | `"Select..."` | Placeholder when nothing selected |
| `maxSelections` | `number` | `0` | Max selections (0 = unlimited) |
| `showSelectAll` | `boolean` | `true` | Show Select All checkbox |
| `showChips` | `boolean` | `true` | Show chips (false = count badge) |
| `chipRemovable` | `boolean` | `true` | Show remove button on chips |
| `maxChipsVisible` | `number` | `5` | Max chips before "+N more" badge |
| `filterPlaceholder` | `string` | `"Filter items..."` | Filter input placeholder |
| `noResultsText` | `string` | `"No results found"` | Empty filter message |
| `showFilter` | `boolean` | `true` | Show filter input in dropdown |
| `disabled` | `boolean` | `false` | Disable the component |
| `readonly` | `boolean` | `false` | Allow viewing but not changing |
| `size` | `string` | `"default"` | `"sm"`, `"default"`, or `"lg"` |
| `cssClass` | `string` | — | Additional CSS class(es) |
| `onSelect` | `function` | — | Called when item selected |
| `onDeselect` | `function` | — | Called when item deselected |
| `onChange` | `function` | — | Called after any selection change |
| `onFilterChange` | `function` | — | Called when filter text changes |
| `onOpen` | `function` | — | Called when dropdown opens |
| `onClose` | `function` | — | Called when dropdown closes |

### Class: MultiselectCombo

| Method | Returns | Description |
|--------|---------|-------------|
| `new MultiselectCombo(options)` | instance | Creates DOM tree (does not attach) |
| `show(containerId)` | `void` | Appends to container by ID |
| `hide()` | `void` | Removes from DOM, preserves state |
| `destroy()` | `void` | Removes and cleans up everything |
| `getElement()` | `HTMLElement` | Returns root element |
| `getSelectedValues()` | `string[]` | Currently selected values |
| `getSelectedItems()` | `ComboItem[]` | Currently selected items |
| `setSelected(values)` | `void` | Replace selection |
| `selectAll()` | `void` | Select all non-disabled items |
| `deselectAll()` | `void` | Clear all selections |
| `addItem(item)` | `void` | Add item to dropdown |
| `removeItem(value)` | `void` | Remove item by value |
| `setItems(items)` | `void` | Replace all items |
| `open()` | `void` | Open dropdown |
| `close()` | `void` | Close dropdown |
| `enable()` | `void` | Enable component |
| `disable()` | `void` | Disable component |
| `focus()` | `void` | Focus input area |

### Convenience Function

| Function | Description |
|----------|-------------|
| `createMultiselectCombo(options, containerId?)` | Create, optionally show, return instance |

## Features

- Chips or count badge display mode
- Checkboxes in dropdown (selection without closing)
- Select All / Deselect All with indeterminate state
- Substring filtering with debounce for large lists
- Item grouping with group headers
- Maximum selections limit with visual feedback
- "+N more" overflow badge for chip display
- Dropdown positioning (above/below based on viewport)
- Full keyboard navigation
- `prefers-reduced-motion` support

## Keyboard

| Key | Action |
|-----|--------|
| Enter / Space | Open dropdown (when closed); toggle highlighted item (when open) |
| ArrowDown | Open dropdown or highlight next item |
| ArrowUp | Highlight previous item |
| Escape | Close dropdown, return focus to input area |
| Tab | Close dropdown, move focus naturally |
| Backspace | Remove last selected chip (when filter is empty) |
| Home | Highlight first item |
| End | Highlight last item |
| Ctrl+A | Select all / deselect all visible items |

## Accessibility

- Root: `role="combobox"`, `aria-haspopup="listbox"`, `aria-expanded`
- Input area: `tabindex="0"`, `aria-multiselectable="true"`, `aria-activedescendant`
- Chip container: `role="list"`, chips: `role="listitem"`
- Listbox: `role="listbox"`, `aria-multiselectable="true"`
- Items: `role="option"`, `aria-selected`, `aria-checked`
- Select All: `aria-checked` with `"mixed"` indeterminate state
- Filter: `role="searchbox"`, `aria-label="Filter items"`
- Live region: `aria-live="polite"` for selection announcements
- Chip remove: `aria-label="Remove [item label]"`

See `specs/multiselectcombo.prd.md` for the complete specification.
