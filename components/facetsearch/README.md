# FacetSearch

Facet-aware search bar that combines free-text search with structured `key:value` query facets. Parsed facets appear as removable chips inline, while an autocomplete dropdown assists with facet key discovery and value selection.

## Quick Start

```html
<link rel="stylesheet" href="components/facetsearch/facetsearch.css">
<script src="components/facetsearch/facetsearch.js"></script>
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
| CSS   | `components/facetsearch/facetsearch.css` |
| JS    | `components/facetsearch/facetsearch.js` |
| Types | `components/facetsearch/facetsearch.d.ts` |

**Requires:** Bootstrap CSS, Bootstrap Icons CSS.

## Facet Definition (`FacetDefinition`)

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `key` | `string` | -- | Internal key for query syntax (e.g., `"status"`) |
| `label` | `string` | -- | Human-readable label |
| `valueType` | `FacetValueType` | -- | `"text"`, `"enum"`, `"date"`, `"number"`, `"boolean"` |
| `values` | `FacetValue[]` | `undefined` | Static list of valid values (for enum type). Each is a string, or `{ value, label }` |
| `loadValues` | `(query: string) => Promise<FacetValue[]>` | `undefined` | Async value loader. Each value is a string, or `{ value, label }` |
| `icon` | `string` | `undefined` | Bootstrap Icons class |
| `multiple` | `boolean` | `false` | Allow multiple values for the same key |
| `defaultOperator` | `string` | `":"` | Default operator |
| `operators` | `string[]` | `[":", "!:"]` | Allowed operators |
| `color` | `string` | `undefined` | Chip background colour |
| `valuePlaceholder` | `string` | `undefined` | Hint for value input |

### Values With Labels

A stored value is often an id or a key, while a person should read a name. Give such a value as `{ value, label }`:

```javascript
createFacetSearch("search", {
    facets: [
        { key: "type", label: "Type", valueType: "enum",
          values: [{ value: "thinker.session", label: "Brainstorm Session" }, "diagram"] },
        { key: "owner", label: "Owner", valueType: "text",
          loadValues: (q) => api.people(q).then((ps) => ps.map((p) => ({ value: p.id, label: p.name }))) },
    ],
});
```

- **The chip shows the label, and the query keeps the value.** `getValue()`, `getQuery()` and `onSearch` report `type:thinker.session`. The chip reads "type:Brainstorm Session", and its tooltip names the value.
- **The dropdown shows labels.** It shows the value beside a label that differs from it, and matches what is typed against either.
- **Typed and restored values find their label.** A chip typed as `type:thinker.session`, or restored with `setValue()`, shows the label when the value is in `values` or came from `loadValues` earlier. Otherwise it shows the value.
- **`getFacets()` and `getQuery().facets`** give each facet a `label` when one is known. The `value` is unchanged.
- **A string value behaves as before:** no label and no hint.

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
| `syntax` | `"facet" \| "query"` | `"facet"` | The language the bar reads and writes. `"query"` is the apps' query language. See [The query language](#the-query-language) |
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
| `addFacet` | `(key, value, label?) => void` | Add a facet chip programmatically. Without `label`, it shows the value's known label, else the value |
| `removeFacet` | `(key, value?) => void` | Remove the chips on a key. With `value`, remove only the chips on that key with that value, such as one of several `type:` chips. `onFacetRemove` fires once per call |
| `learnLabels` | `(key, values: FacetValue[]) => void` | Record labels learned after the bar was made, such as from a search answer. The chips that hold those values show the new labels at once. No `onFacetAdd`, `onFacetRemove` or `onChange` fires, and focus and the typed text stay |
| `getFacets` | `() => ParsedFacet[]` | Get active facets |
| `setParsed` | `({ text, tree }) => boolean` | With `syntax: "query"`, draws chips from the API's parse of `text`. See [The query language](#the-query-language). Throws with the default syntax |
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
| `title:"say \"hi\""` | Inside quotes, `\"` is a quote and `\\` is a backslash. A backslash before any other character is itself. `getValue()` quotes a value that holds a space or a quote, and writes it with these escapes |
| `bug fix` | Free text |

## The query language

`syntax: "query"` switches the bar to the apps' query language (knobbyio/apps#379). The language's spec is `specs/search/query-language.spec.md` in knobbyio/apps. **The API decides what a query means.** The bar never parses typed text in this mode. The host calls the API's Parse, and passes the answer to the bar.

```javascript
const bar = createFacetSearch("search", {
    facets, syntax: "query",
    onChange: (text) => debounceParse(text),
    onSearch: (query) => runSearch(query.raw),
});

async function parse(text)
{
    const answer = await api.post("/api/v1/search/query/parse", { text, zone, mode: "search" });

    // Errors have no tree. The bar keeps the text as typed.
    if (answer.tree) { bar.setParsed({ text, tree: answer.tree }); }
}
```

**Chips from the tree.** `setParsed` turns each top-level filter on a known facet into a chip: one chip for each value, so `type in ("a", "b")` shows two chips. A negated filter becomes a negated chip. Everything else stays in the input as the exact text it came from, such as free text, an `or` group, a nested search, a filter with `link`, `exists`, and a filter on a key with no facet. A key without `multiple` keeps a second filter on it as text.

**When it changes nothing.** `setParsed` returns `false` and changes nothing in two cases:

- **The text has changed.** If `text` is no longer the bar's value, the person typed after the parse began, and the newer input wins (`UI_EXPERIENCE.md` section 2.8).
- **The tree cannot be split.** This is a tree with `return`, or a node outside the chips that has no `span`.

It fires no `onChange` or `onFacetAdd`, because the query means the same.

**What the bar writes.** `getValue()` writes the chips, joined by `and`, then the typed text:

| Chips | `getValue()` |
|---|---|
| From the tree: `type equals "note"`, `created_at on 2026-11-15@Asia/Kolkata` | `type equals "note" and created_at on 2026-11-15@Asia/Kolkata`, the API's standard spelling |
| Two chips on `type`, from `addFacet` or the dropdown | `type in ("note", "task")`, which means "either". Two filters on one key mean "both" (spec section 6) |
| One chip from `addFacet` | `type:"task"`. The bar keeps `:`, because only the API knows a key's default operator, such as `descendant-of` for `within` |
| A chip, and typed text with `or` | `type:"note" and (budget or forecast)`. The text is bracketed, so `or` does not take the chip into it |

A value is quoted unless its facet's `valueType` is `number`, `date` or `boolean`.

**After a search,** show the API's text for the query it ran. Call `setValue(apiText)` to put the text in the bar, then parse it and call `setParsed`. **Buttons outside the bar** call `addFacet(key, value)` and `removeFacet(key, value)`, as before. Two chips on one key then write `in`.

`getQuery()` reports the chips as `facets`, the typed text as `text`, and `getValue()` as `raw`. The operator of a chip from the tree is its word form, such as `on-or-after`.

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
