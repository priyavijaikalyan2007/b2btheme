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

**Requires:** Bootstrap CSS, Bootstrap Icons CSS. With `syntax: "query"`, also these three scripts, loaded before the bar is made. Without them, the bar throws and names what is missing.

| Script | Why |
|--------|-----|
| `/lib/antlr4-4.13.1.js` | The ANTLR runtime that QueryLanguage's parser runs on |
| `components/querylanguage/querylanguage.js` | The syntax colors, from the apps' own grammar (#205) |
| `components/timezonepicker/timezonepicker.js` | The time-zone search, so the bar and the picker find a zone the same way |

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
| `setParsed` | `({ text, tree?, errors?, warnings? }) => boolean` | With `syntax: "query"`, applies the API's answer to Parse for `text`: chips from the tree, and marks for the errors and warnings. See [The query language](#the-query-language). Throws with the default syntax |
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

    // The whole answer: the tree, when there is one, and the errors and warnings.
    bar.setParsed({ text, ...answer });
}
```

Pass `text` as the bar's value you sent to Parse, not the `text` of the answer, which is the standard spelling. The bar uses it to tell an old answer from a new one.

**Chips from the tree.** `setParsed` turns each top-level filter on a known facet into a chip: one chip for each value, so `type in ("a", "b")` shows two chips. A negated filter becomes a negated chip. Everything else stays in the input as the exact text it came from, such as free text, an `or` group, a nested search, a filter with `link`, `exists`, and a filter on a key with no facet. A key without `multiple` keeps a second filter on it as text.

**What it returns.** `setParsed` returns `true` when it drew chips from the tree. It returns `false` in three cases, and each is normal while a person types:

- **The text has changed.** If `text` is no longer the bar's value, the person typed after the parse began, and the newer input wins (`UI_EXPERIENCE.md` section 2.8). The bar changes nothing.
- **There is no tree,** because the text has errors. The bar keeps the text as typed, and shows the errors.
- **The tree cannot be split.** This is a tree with `return`, or a node outside the chips that has no `span`. The bar keeps the text as typed, and shows the warnings.

It fires no `onChange` or `onFacetAdd`, because the query means the same.

**Errors and warnings.** Each error and warning from Parse marks where it is. Its `start` and `end` count in the text you sent, and the bar places them on what it now shows:

- **A range in a chip** outlines the chip, solid for an error and dashed for a warning. In `type in ("a", "b")`, a range on one value outlines that value's chip, and a range on `type` outlines both.
- **A range in the typed text** is underlined, wavy for an error and dotted for a warning. A range of no width, such as the end of the text, gets a short line at its place.
- **The line under the bar** says one problem: its title, what is wrong and what to do. It says the problem under the pointer, else the one at the caret, else the first error, else the first warning. With more than one, it shows a count, such as "1 of 3". The input names the line with `aria-describedby`, and has `aria-invalid="true"` while there is an error. A screen reader hears a new set of problems once, not after each pause in typing.
- **Typing removes the marks,** because their places no longer hold. So does any change to the bar's value: `setValue`, `clear`, `addFacet` and `removeFacet`. Your next parse brings new ones.

An error with no `start` shows in the line under the bar only.

**Suggestions.** The dropdown offers what fits where the caret is. This only chooses what to suggest. What the text means is still the API's to say.

| The caret is after | The dropdown offers |
|---|---|
| A word, or nothing | Keys, from `facets` |
| `type:` or `-type:`, or a key and an operator in any form, such as `type equals `, `amount gte ` or `amount >= ` | That key's values, from `values` or `loadValues` |
| `type in (note, ` | More values of `type` |
| A date, a time or a relative date and `@`, such as `2026-11-15@kol`, or `zone:` | Time zones by their IANA names. A zone matches by its city, so `kol` offers `Asia/Kolkata`, and `los angeles` offers `America/Los_Angeles` |
| An open quote | Nothing |

**A pick is written as text,** at the caret, and the host's next parse makes a chip of it. So the API decides what it is. A value is quoted unless its facet's `valueType` is `number`, `date` or `boolean`. A value after `in` is written in brackets, such as `type in ("note")`. Each pick fires `onChange`.

**What the bar writes.** `getValue()` writes the chips, joined by `and`, then the typed text:

| Chips | `getValue()` |
|---|---|
| From the tree: `type equals "note"`, `created_at on 2026-11-15@Asia/Kolkata` | `type equals "note" and created_at on 2026-11-15@Asia/Kolkata`, the API's standard spelling |
| Two chips on `type`, from `addFacet` | `type in ("note", "task")`, which means "either". Two filters on one key mean "both" (spec section 6) |
| One chip from `addFacet` | `type:"task"`. The bar keeps `:`, because only the API knows a key's default operator, such as `descendant-of` for `within` |
| A chip, and typed text with `or` | `type:"note" and (budget or forecast)`. The text is bracketed, so `or` does not take the chip into it |

A value is quoted unless its facet's `valueType` is `number`, `date` or `boolean`.

**After a search,** show the API's text for the query it ran. Call `setValue(apiText)` to put the text in the bar, then parse it and call `setParsed`. **Buttons outside the bar** call `addFacet(key, value)` and `removeFacet(key, value)`, as before. Two chips on one key then write `in`.

`getQuery()` reports the chips as `facets`, the typed text as `text`, and `getValue()` as `raw`. The operator of a chip from the tree is its word form, such as `on-or-after`.

**The time zone.** A date in a query depends on the zone, so a page sends a zone with each search. Put a compact [TimezonePicker](../timezonepicker/README.md#compact-form) beside the bar, with `compact: true`, and send its `getValue()` with each Parse and each search (#208).

**Syntax colors.** The typed text takes the colors of the apps' grammar, which [QueryLanguage](../querylanguage/README.md) reads it with (#205). So a word is colored as the API reads it: `in` after a key is an operator, and the `in` of `meeting in march` is plain text. The colors never say a query is wrong. That is the job of Parse's errors, above.

| Part | Token |
|------|-------|
| `and`, `or`, `not`, `-` before a term, `where`, `link`, `return` | `--theme-query-keyword` |
| A filter's key | `--theme-query-key` |
| `:`, `>=`, `on-or-after`, and `in`, `is` or `exists` after a key | `--theme-query-operator` |
| A filter's value | `--theme-query-value` |
| `?variable` and `$parameter` | `--theme-query-variable` |
| An error's and a warning's marks | `--theme-query-error`, `--theme-query-warning` |

Each token has a light and a dark value, and passes 4.5 to 1 on the bar and on a chip. The colored text is drawn by the layer behind the input, which also draws the marks. The input itself draws only the caret, the placeholder and the selection.

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
