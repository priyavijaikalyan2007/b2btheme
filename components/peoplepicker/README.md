# PeoplePicker

Searchable person selector for share dialogs, assignment fields, and permission lists. Provides a dropdown with frequent contacts, async API lookup, and PersonChip integration. Supports single-select and multi-select modes.

## Usage

### HTML

```html
<link rel="stylesheet" href="components/personchip/personchip.css">
<link rel="stylesheet" href="components/peoplepicker/peoplepicker.css">

<div id="my-picker"></div>

<script src="components/personchip/personchip.js"></script>
<script src="components/peoplepicker/peoplepicker.js"></script>
```

### JavaScript — Multi-Select with Frequent Contacts

```js
var picker = createPeoplePicker("my-picker", {
    frequentContacts: [
        { id: "u1", name: "Alice Chen", email: "alice@acme.com", status: "online" },
        { id: "u2", name: "Bob Smith", email: "bob@acme.com" },
        { id: "u3", name: "Carol Davis", avatarUrl: "https://i.pravatar.cc/56?u=carol" }
    ],
    onSearch: function(query) {
        return fetch("/api/people?q=" + encodeURIComponent(query))
            .then(function(r) { return r.json(); });
    },
    onChange: function(selected) {
        console.log("Selected:", selected);
    }
});
```

### JavaScript — Single-Select (Assign To)

```js
var assignPicker = createPeoplePicker("assign-to", {
    multiple: false,
    frequentContacts: contacts,
    onSelect: function(person) {
        console.log("Assigned to:", person.name);
    }
});
```

### JavaScript — URL-Based Search

```js
var urlPicker = createPeoplePicker("url-picker", {
    searchUrl: "https://api.example.com/people",
    debounceMs: 500
});
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `multiple` | `boolean` | `true` | Multi-select or single-select mode |
| `maxSelections` | `number` | `0` | Max selections (0 = unlimited) |
| `selected` | `PersonData[]` | `[]` | Pre-selected people |
| `frequentContacts` | `PersonData[]` | `[]` | Shown on focus before typing |
| `onSearch` | `(q) => Promise<PersonData[]>` | — | Async search callback |
| `searchUrl` | `string` | — | URL-based search (appends `?q=`) |
| `debounceMs` | `number` | `300` | Search debounce delay |
| `minSearchChars` | `number` | `2` | Min chars before searching |
| `placeholder` | `string` | `"Search people..."` | Input placeholder |
| `maxChipsVisible` | `number` | `5` | Visible chips before overflow |
| `noResultsText` | `string` | `"No results found"` | Empty state text |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Size variant |
| `cssClass` | `string` | — | Extra CSS class |
| `disabled` | `boolean` | `false` | Disabled state |
| `readonly` | `boolean` | `false` | Readonly state |
| `onSelect` | `(person) => void` | — | Called on selection |
| `onDeselect` | `(person) => void` | — | Called on removal |
| `onChange` | `(selected) => void` | — | Called on any change |
| `onOpen` | `() => void` | — | Dropdown opened |
| `onClose` | `() => void` | — | Dropdown closed |
| `onSearchError` | `(error) => void` | — | Search error handler |
| `keyBindings` | `Record<string, string>` | — | Key binding overrides |

## PersonData

```ts
interface PersonData {
    id: string;
    name: string;
    email?: string;
    avatarUrl?: string;
    role?: string;
    status?: "online" | "offline" | "busy" | "away";
    metadata?: Record<string, string>;
}
```

## Public API

| Method | Returns | Description |
|--------|---------|-------------|
| `show(containerId)` | `void` | Mount into container |
| `getElement()` | `HTMLElement` | Root DOM element |
| `getSelected()` | `PersonData[]` | Current selections |
| `setSelected(people)` | `void` | Replace all selections |
| `addPerson(person)` | `void` | Add one person |
| `removePerson(id)` | `void` | Remove by ID |
| `clearSelection()` | `void` | Clear all |
| `hasSelection(id)` | `boolean` | Check if selected |
| `enable()` | `void` | Enable the component |
| `disable()` | `void` | Disable the component |
| `setReadonly(flag)` | `void` | Toggle readonly |
| `setFrequentContacts(contacts)` | `void` | Update frequent list |
| `focus()` | `void` | Focus the input |
| `destroy()` | `void` | Cleanup |

## Keyboard Navigation

| Key | Dropdown Closed | Dropdown Open |
|-----|----------------|---------------|
| ArrowDown | Open + highlight first | Move down |
| ArrowUp | — | Move up |
| Enter | — | Select highlighted |
| Escape | Clear input | Close dropdown |
| Backspace | Remove last chip | Remove last chip |
| Tab | Normal focus | Close + tab |
| Home | — | Jump to first |
| End | — | Jump to last |

## Accessibility

- `role="combobox"` on root with `aria-haspopup="listbox"`
- `aria-activedescendant` tracks highlighted row
- `aria-live="polite"` announces selection changes
- Remove buttons include `aria-label="Remove <name>"`

## PersonChip Integration

PeoplePicker uses PersonChip for rich person display in dropdown rows (md size) and selected chips (sm size). Load `personchip.js` before `peoplepicker.js`. If PersonChip is not loaded, falls back to simple span elements with initials.
