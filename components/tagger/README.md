# Tagger

Combined freeform and controlled-vocabulary tag input with autocomplete, colored chips, taxonomy categories, and validation.

## Quick Start

```html
<link rel="stylesheet" href="dist/components/tagger/tagger.css">
<script src="dist/components/tagger/tagger.js"></script>
<script>
    var tagger = createTagger("my-container", {
        taxonomy: [
            { id: "priority", label: "Priority", color: "#c92a2a", values: ["High", "Medium", "Low"] },
            { id: "status", label: "Status", color: "#2b8a3e", values: ["Open", "Closed", "Pending"] }
        ],
        allowFreeform: true,
        onAdd: function(tag) { console.log("Added:", tag); },
        onRemove: function(tag) { console.log("Removed:", tag); }
    });
</script>
```

## Assets

| Asset | Path |
|-------|------|
| CSS   | `dist/components/tagger/tagger.css` |
| JS    | `dist/components/tagger/tagger.js` |
| Types | `dist/components/tagger/tagger.d.ts` |

**Requires:** Bootstrap CSS, Bootstrap Icons CSS.

## Options (`TaggerOptions`)

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `tags` | `TagItem[]` | `[]` | Initial tags to display |
| `taxonomy` | `TagCategory[]` | `[]` | Taxonomy categories with allowed values |
| `allowFreeform` | `boolean` | `true` | Allow creating tags not in taxonomy |
| `maxTags` | `number` | `undefined` | Global maximum number of tags |
| `placeholder` | `string` | `"Add tag..."` | Input placeholder text |
| `colorMode` | `"category" \| "hash" \| "none"` | `"category"` | Chip colouring strategy |
| `validator` | `(value: string) => boolean \| string` | `undefined` | Custom validation function |
| `duplicateMode` | `"reject" \| "ignore"` | `"reject"` | How to handle duplicate tags |
| `showCategoryBadge` | `boolean` | `true` | Show category badge on chips |
| `size` | `"sm" \| "default" \| "lg"` | `"default"` | Size variant |
| `disabled` | `boolean` | `false` | Disable all interaction |
| `readonly` | `boolean` | `false` | Read-only mode (shows chips, no editing) |
| `cssClass` | `string` | `undefined` | Additional CSS class for root element |
| `maxDropdownItems` | `number` | `50` | Max items shown in dropdown |
| `minFilterLength` | `number` | `0` | Min chars before dropdown opens |
| `filterDebounceMs` | `number` | `150` | Debounce delay for filter input (ms) |
| `onAdd` | `(tag: TagItem) => void` | `undefined` | Callback when a tag is added |
| `onRemove` | `(tag: TagItem) => void` | `undefined` | Callback when a tag is removed |
| `onChange` | `(tags: TagItem[]) => void` | `undefined` | Callback when tags change |
| `onValidationError` | `(value: string, error: string) => void` | `undefined` | Callback on validation error |

## Interfaces

### `TagCategory`

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique category identifier |
| `label` | `string` | Display label |
| `color` | `string` | Optional colour for badge and border |
| `values` | `string[]` | Allowed tag values in this category |
| `allowFreeform` | `boolean` | Override freeform permission per-category |
| `icon` | `string` | Optional Bootstrap Icon class |
| `maxTags` | `number` | Optional per-category tag limit |

### `TagItem`

| Property | Type | Description |
|----------|------|-------------|
| `value` | `string` | Tag value text |
| `category` | `string` | Optional category ID |
| `color` | `string` | Resolved display colour |
| `data` | `Record<string, unknown>` | Optional custom data |

## API Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `show` | `(containerId: string) => void` | Render into a container element |
| `hide` | `() => void` | Remove from DOM, keep state |
| `destroy` | `() => void` | Full teardown, remove listeners |
| `addTag` | `(value: string, category?: string) => boolean` | Programmatically add a tag |
| `removeTag` | `(value: string, category?: string) => boolean` | Programmatically remove a tag |
| `getTags` | `() => TagItem[]` | Get current tags array |
| `setTags` | `(tags: TagItem[]) => void` | Replace all tags |
| `clearTags` | `() => void` | Remove all tags |
| `hasTag` | `(value: string, category?: string) => boolean` | Check if a tag exists |
| `getTagsByCategory` | `(categoryId: string) => TagItem[]` | Get tags in a category |
| `enable` | `() => void` | Enable the component |
| `disable` | `() => void` | Disable the component |
| `focus` | `() => void` | Focus the input |

## Color Modes

- **`category`** (default): Chips show a 3px left border using the category's colour. Freeform chips have no colour accent.
- **`hash`**: All chips get a deterministic colour based on a DJB2 hash of the tag value, mapped to a 12-colour palette.
- **`none`**: All chips use neutral grey styling with no colour accent.

## Keyboard Interaction

| Key | Action |
|-----|--------|
| **ArrowDown** | Open dropdown / highlight next item |
| **ArrowUp** | Open dropdown / highlight previous item |
| **Enter** | Select highlighted item or create freeform tag |
| **Escape** | Close dropdown |
| **Backspace** (input empty) | Remove last tag |
| **Home** | Highlight first item (dropdown open) |
| **End** | Highlight last item (dropdown open) |
| **Tab** | Close dropdown and move focus |

## Accessibility

- Container uses `role="group"` with `aria-label`
- Input uses `role="combobox"` with `aria-expanded`, `aria-controls`, `aria-activedescendant`
- Dropdown uses `role="listbox"` with `role="option"` items
- `aria-live="polite"` region announces tag add/remove/validation events
- Chip remove buttons have descriptive `aria-label` attributes

## Size Variants

| Size | Container Padding | Chip Font | Input Font |
|------|-------------------|-----------|------------|
| `sm` | `3px 4px` | 0.75rem | `$font-size-sm` |
| default | `4px 6px` | `$font-size-sm` | `$font-size-base` |
| `lg` | `6px 8px` | `$font-size-base` | `$font-size-lg` |

## Paste Handling

Pasting comma-separated values (e.g., `"tag1, tag2, tag3"`) automatically splits and adds each value through the validation pipeline.

## Example: Full-Featured

```html
<div id="full-tagger"></div>
<script>
    var tagger = createTagger("full-tagger", {
        tags: [
            { value: "High", category: "priority" },
            { value: "custom-label" }
        ],
        taxonomy: [
            { id: "priority", label: "Priority", color: "#c92a2a",
              values: ["Critical", "High", "Medium", "Low"], maxTags: 1 },
            { id: "type", label: "Type", color: "#1c7ed6",
              values: ["Bug", "Feature", "Enhancement", "Docs"] }
        ],
        maxTags: 10,
        allowFreeform: true,
        colorMode: "category",
        duplicateMode: "reject",
        size: "default",
        validator: function(v) {
            return v.length >= 2 || "Tag must be at least 2 characters";
        },
        onChange: function(tags) {
            console.log("Tags:", tags);
        }
    });
</script>
```

See `specs/tagger.prd.md` for the full specification.
