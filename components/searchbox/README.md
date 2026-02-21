<!-- AGENT: Documentation for the SearchBox component -- debounced search input with suggestions dropdown. -->

# SearchBox

A debounced search input with search icon, clear button, loading spinner, and optional suggestions dropdown. Designed for embedding in app shells, sidebars, and toolbars. Supports static and async suggestion sources, full keyboard navigation, and screen reader announcements.

## Assets

| Asset | Path |
|-------|------|
| CSS | `dist/components/searchbox/searchbox.css` |
| JS | `dist/components/searchbox/searchbox.js` |
| Types | `dist/components/searchbox/searchbox.d.ts` |

## Requirements

- **Bootstrap CSS** -- for SCSS variables (`$gray-*`, `$blue-*`, etc.)
- **Bootstrap Icons CSS** -- for search and clear icons (`bi-search`, `bi-x-lg`)
- Does **not** require Bootstrap JS.

## Quick Start (Script Tag)

```html
<link rel="stylesheet" href="dist/components/searchbox/searchbox.css">
<script src="dist/components/searchbox/searchbox.js"></script>

<div id="search-container"></div>

<script>
    // Basic search box
    var sb = createSearchBox("search-container", {
        placeholder: "Search items...",
        onSearch: function(query) {
            console.log("Search:", query);
        },
        onSubmit: function(query) {
            console.log("Submit:", query);
        }
    });
</script>
```

## Quick Start with Suggestions

```html
<div id="search-suggestions"></div>

<script>
    // Static suggestions
    var sb = createSearchBox("search-suggestions", {
        placeholder: "Search fruits...",
        suggestions: ["Apple", "Apricot", "Banana", "Blueberry", "Cherry", "Date"],
        onSearch: function(query) {
            console.log("Search:", query);
        }
    });

    // Async suggestions
    var sbAsync = createSearchBox("search-async", {
        placeholder: "Search users...",
        suggestions: function(query) {
            return fetch("/api/users?q=" + encodeURIComponent(query))
                .then(function(r) { return r.json(); })
                .then(function(data) { return data.map(function(u) { return u.name; }); });
        },
        minChars: 3,
        debounceMs: 500
    });
</script>
```

## Quick Start (ES Module)

```js
import { createSearchBox, SearchBox } from "./dist/components/searchbox/searchbox.js";

const sb = createSearchBox("my-container", {
    placeholder: "Search...",
    onSearch: (query) => console.log("Search:", query),
    suggestions: ["Alpha", "Beta", "Gamma"]
});

// Programmatic control
sb.setValue("Beta");
sb.focus();
sb.clearValue();
```

## API

### `createSearchBox(containerId, options)`

Creates a SearchBox and appends it to the specified container. Returns the SearchBox instance.

### SearchBox Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `show(containerId)` | `void` | Append to container, attach listeners |
| `hide()` | `void` | Remove from DOM (preserves state) |
| `destroy()` | `void` | Full cleanup, release all references |
| `getElement()` | `HTMLElement` | Returns the root element |
| `getValue()` | `string` | Returns the current input value |
| `setValue(value)` | `void` | Sets the input value and triggers search |
| `focus()` | `void` | Focuses the input element |
| `clearValue()` | `void` | Clears the input, hides clear button, fires `onSearch("")` |
| `setDisabled(disabled)` | `void` | Toggles the disabled state |

### SearchBoxOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `placeholder` | `string` | `"Search..."` | Input placeholder text |
| `debounceMs` | `number` | `300` | Debounce delay in milliseconds |
| `onSearch` | `function` | -- | Called after debounce with query string |
| `onSubmit` | `function` | -- | Called when Enter is pressed |
| `suggestions` | `string[] \| function` | -- | Static list or async function returning suggestions |
| `minChars` | `number` | `2` | Minimum characters before showing suggestions |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Size variant |
| `disabled` | `boolean` | `false` | Initial disabled state |
| `cssClass` | `string` | -- | Additional CSS class(es) for the root element |
| `keyBindings` | `object` | -- | Override default key combos |

## Features

- **Debounced search** -- configurable delay prevents excessive callbacks during rapid typing
- **Static suggestions** -- client-side case-insensitive filtering of a string array
- **Async suggestions** -- call an async function with loading spinner feedback
- **Clear button** -- appears when input has a value; clears and refocuses
- **Size variants** -- `sm`, `md`, and `lg` for different contexts
- **Disabled state** -- greys out the component and prevents interaction
- **Zero border-radius** -- consistent with the enterprise theme rectangular style
- **Reduced motion** -- spinner and transitions respect `prefers-reduced-motion`

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Escape` | Close suggestions if open; clear input if suggestions closed |
| `Enter` | Select highlighted suggestion; or fire `onSubmit` |
| `ArrowDown` | Open suggestions if closed (with enough chars); or move highlight down |
| `ArrowUp` | Move highlight up in suggestions |

All key bindings can be overridden via the `keyBindings` option:

```js
var sb = createSearchBox("container", {
    keyBindings: {
        clear: "Escape",
        submit: "Enter",
        nextSuggestion: "ArrowDown",
        prevSuggestion: "ArrowUp"
    }
});
```

## Accessibility

- Root element: `role="search"`
- Input element: `role="searchbox"` with `aria-label="Search"`
- Input: `aria-autocomplete="list"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`
- Suggestions panel: `role="listbox"` with unique ID
- Suggestion items: `role="option"` with unique IDs and `aria-selected`
- Live region: `role="status"` with `aria-live="polite"` announces result count
- Clear button: `aria-label="Clear search"`
- Search icon: `aria-hidden="true"`
- Full keyboard navigation without requiring a mouse
