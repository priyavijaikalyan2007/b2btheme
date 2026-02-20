# FacetSearch

Facet-aware search bar that combines free-text search with structured `key:value` query facets. Parsed facets appear as removable chips inline, while an autocomplete dropdown assists with facet key discovery and value selection.

## Quick Start

```html
<link rel="stylesheet" href="dist/components/facetsearch/facetsearch.css">
<script src="dist/components/facetsearch/facetsearch.js"></script>
<script>
    var search = createFacetSearch("my-container", {
        facets: [
            { key: "status", label: "Status", valueType: "enum",
              values: ["open", "closed", "pending"], icon: "bi bi-circle" },
            { key: "priority", label: "Priority", valueType: "enum",
              values: ["critical", "high", "medium", "low"] },
            { key: "author", label: "Author", valueType: "text" }
        ],
        onSearch: function(query) {
            console.log("Facets:", query.facets, "Text:", query.text);
        }
    });
</script>
```

## Assets

| Asset | Path |
|-------|------|
| CSS   | `dist/components/facetsearch/facetsearch.css` |
| JS    | `dist/components/facetsearch/facetsearch.js` |
| Types | `dist/components/facetsearch/facetsearch.d.ts` |

**Requires:** Bootstrap CSS, Bootstrap Icons CSS.

## Facet Definition (`FacetDefinition`)

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `key` | `string` | -- | Internal key for query syntax (e.g., `"status"`) |
| `label` | `string` | -- | Human-readable label |
| `valueType` | `FacetValueType` | -- | `"text"`, `"enum"`, `"date"`, `"number"`, `"boolean"` |
| `values` | `string[]` | `undefined` | Static list of valid values (for enum type) |
| `loadValues` | `(query: string) => Promise<string[]>` | `undefined` | Async value loader |
| `icon` | `string` | `undefined` | Bootstrap Icons class |
| `multiple` | `boolean` | `false` | Allow multiple values for the same key |
| `defaultOperator` | `string` | `":"` | Default operator |
| `operators` | `string[]` | `[":", "!:"]` | Allowed operators |
| `color` | `string` | `undefined` | Chip background colour |
| `valuePlaceholder` | `string` | `undefined` | Hint for value input |

## Options (`FacetSearchOptions`)

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `facets` | `FacetDefinition[]` | -- | Available facet definitions (required) |
| `value` | `string` | `""` | Initial search string |
| `placeholder` | `string` | `"Search..."` | Input placeholder |
| `showFacetChips` | `boolean` | `true` | Render facets as inline chips |
| `showHistory` | `boolean` | `false` | Show recent searches in dropdown |
| `maxHistory` | `number` | `10` | Maximum recent searches stored |
| `submitOnEnter` | `boolean` | `true` | Submit on Enter key |
| `clearOnSubmit` | `boolean` | `false` | Clear after submit |
| `size` | `"sm" \| "default" \| "lg"` | `"default"` | Size variant |
| `disabled` | `boolean` | `false` | Disable all interaction |
| `cssClass` | `string` | `undefined` | Additional CSS class |
| `onSearch` | `(query) => void` | `undefined` | Submit callback |
| `onChange` | `(value) => void` | `undefined` | Input change callback |
| `onFacetAdd` | `(key, value) => void` | `undefined` | Facet added callback |
| `onFacetRemove` | `(key) => void` | `undefined` | Facet removed callback |
| `onClear` | `() => void` | `undefined` | Clear callback |

## API Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `show` | `(containerId: string) => void` | Render into container |
| `hide` | `() => void` | Remove from DOM, keep state |
| `destroy` | `() => void` | Full teardown |
| `getValue` | `() => string` | Get raw query string |
| `setValue` | `(value: string) => void` | Set and parse query |
| `getQuery` | `() => FacetSearchQuery` | Get parsed query object |
| `clear` | `() => void` | Clear all chips and input |
| `focus` | `() => void` | Focus the input |
| `addFacet` | `(key, value) => void` | Add a facet chip programmatically |
| `removeFacet` | `(key) => void` | Remove a facet chip by key |
| `getFacets` | `() => ParsedFacet[]` | Get active facets |
| `enable` | `() => void` | Enable the component |
| `disable` | `() => void` | Disable the component |

## Query Syntax

| Syntax | Meaning |
|--------|---------|
| `status:open` | Facet equals |
| `status!:open` | Facet not equals |
| `-status:open` | Negated facet |
| `count>10` | Greater than |
| `count<=100` | Less than or equal |
| `author:"Jane Doe"` | Quoted value with spaces |
| `bug fix` | Free text |

## Keyboard Interaction

| Key | Action |
|-----|--------|
| **ArrowDown/Up** | Navigate dropdown suggestions |
| **Enter** | Select suggestion or submit search |
| **Escape** | Close dropdown |
| **Backspace** (at start) | Remove last chip |
| **Tab** | Accept suggestion, close dropdown |
| **Home/End** | Jump to first/last suggestion |

## Standalone Parser

The query parser is exported as a standalone pure function:

```js
var result = parseFacetQuery("status:open priority:high bug fix", facetDefs);
// result.facets = [{key:"status", op:":", value:"open", negated:false}, ...]
// result.text = "bug fix"
```

See `specs/facetsearch.prd.md` for the full specification.
