<!-- AGENT: ExpressionBuilder is a visual editor for a query in the apps' query language. It edits the tree the API's Parse call returns, beside FacetSearch, which edits the same query as text. The host keeps the two in step with Parse and Print. -->

# ExpressionBuilder

A visual editor for a query in the apps' query language, for people who would rather not type one (#207). It edits the tree that the API's Parse call returns: groups joined by **all** (`and`) or **any** (`or`), **not**, conditions on a key, and words. [FacetSearch](../facetsearch/README.md) edits the same query as text, and the host keeps the two in step with the API's Parse and Print calls.

**The API decides what a query means.** The builder never reads text. It reports a tree that Print accepts.

## Quick Start

```html
<link rel="stylesheet" href="components/expressionbuilder/expressionbuilder.css">
<script src="components/gesturerecognizer/gesturerecognizer.js"></script>
<script src="components/expressionbuilder/expressionbuilder.js"></script>

<div id="builder"></div>
```

```js
const builder = createExpressionBuilder("builder", {
    facets,                     // the same list the search bar takes
    onChange: async (tree) =>
    {
        // The builder changed the query: print it, and put the text in the bar.
        const printed = await api.post("/api/v1/search/query/print", { tree, zone, mode: "search" });
        bar.setValue(printed.text);
    },
});

// The person typed in the bar: parse it, and give both the answer.
async function parse(text)
{
    const answer = await api.post("/api/v1/search/query/parse", { text, zone, mode: "search" });
    bar.setParsed({ text, ...answer });
    builder.setParsed(answer);
}
```

`createExpressionBuilder` throws when `gesturerecognizer.js` is not loaded, and names it. The builder drags rows through it.

## Assets

| Asset | Path |
|-------|------|
| CSS   | `components/expressionbuilder/expressionbuilder.css` |
| JS    | `components/expressionbuilder/expressionbuilder.js` |
| Types | `components/expressionbuilder/expressionbuilder.d.ts` |

**Requires:** Bootstrap CSS, Bootstrap Icons CSS, `components/gesturerecognizer/gesturerecognizer.js`.

## Options (`ExpressionBuilderOptions`)

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `facets` | `ExpressionBuilderFacet[]` | (required) | The keys a condition can use. The same shape as FacetSearch's `FacetDefinition`, so pass the bar's list |
| `tree` | `QueryTree` | none | The query to start with, as Parse returns it |
| `onChange` | `(tree: QueryTree) => void` | none | Fired with the new tree when the person changes what the query means. The tree always prints |
| `disabled` | `boolean` | `false` | Turns off every control |
| `cssClass` | `string` | none | A class for the root element |
| `keyBindings` | `Partial<Record<string, string>>` | none | Overrides the shortcuts below |

## Facets

Each facet is a key a condition can use: `key`, `label`, `valueType` (`text`, `enum`, `date`, `number` or `boolean`), and `values` or `loadValues` to suggest values.

**Operators.** A condition offers the operators that fit its `valueType`:

| `valueType` | Operators |
|---|---|
| `text` | is, is not, contains, starts with, ends with, is one of, has a value, has no value |
| `enum` | is, is not, is one of, has a value, has no value |
| `number` | is, is not, is more than, is at least, is less than, is at most, is one of, has a value, has no value |
| `date` | is on, is after, is before, is on or after, is on or before, has a value, has no value |
| `boolean` | is, is not, has a value, has no value |

A facet that lists `operators` offers those instead. List the language's words, such as `on-or-after` and `descendant-of`. The bar's symbols are read as words too, such as `!:` as `not-equals` and `>=` as `greater-or-equal`. `:` is read as `equals`: it means the key's default, which only the API knows. **So a key whose default is `descendant-of`, such as `within`, lists `descendant-of`.** An unknown operator throws.

## API (`ExpressionBuilderHandle`)

| Method | Description |
|--------|-------------|
| `getTree()` | The query as a tree that Print accepts. It has no drafts and no spans |
| `setParsed(parsed)` | Applies the answer to Parse or Print: `{ tree?, errors?, warnings? }`. See below |
| `focus()` | Focuses the first control |
| `enable()` / `disable()` | Turns the controls on or off |
| `getElement()` | The root element |
| `destroy()` | Removes the builder. Safe to call twice |

### Parse's answer, and the echo of a change

When the builder changes the query, the host prints it and puts the text in the bar. The bar then parses that text, and the host gives the builder the answer. **A tree that means what the builder holds keeps the rows.** So a person typing in a value, or a group of one row, loses nothing. The comparison ignores spans, a group of one row, and a group inside a group of its own kind, which Print writes the same way. Another tree, from typing in the bar, replaces the rows. The host still debounces Parse, and drops an answer older than the bar's text, as it does for the bar.

**Errors and warnings.** Each one with a place shows on the deepest row whose text holds it, and the others show above the rows. A problem with no place, such as one from Print, shows above the rows. With no tree, the bar's text has errors, so they show above the rows, and the rows stay as they were. Any edit in the builder removes them. A screen reader hears a new set once.

## Rows

| Row | Controls |
|-----|----------|
| A group | **Not**, **All of these** or **Any of these**, and buttons to add a condition, words or a group |
| A condition | **Not**, a key, an operator, and its value, or values for **is one of** |
| Words | **Not**, and the words to search for |

Each row and each group but the outermost also has **Move up**, **Move down**, **Put in a group** and **Remove**. A group has **Take the rows out of this group**, which a group with **Not** cannot do, because that would change what it means.

**Drafts.** A new condition is a draft until it has a key, an operator and the value its operator needs. A draft is shown with a dashed line and "Needs a value", and left out of `getTree()` and `onChange`. So the tree always prints. So are empty words and an empty group.

**When `onChange` fires.** A choice from a list, a toggle and a move report at once. A typed value reports when the input commits, on `Enter` or when the focus leaves it. A change that means nothing new, such as a draft, a group around one row, or switching a group of one between all and any, reports nothing.

**What this version cannot edit, it keeps** (`UI_EXPERIENCE.md` section 5.7). These show as read-only rows, which say what they are and "Edit this in the search bar":

- a nested search;
- a `link` condition;
- a comparison of two variables;
- a variable, a parameter, a relative date, a date with a time, an instant or a resource as a value;
- a key with no facet, or an operator the language does not have;
- `return`.

A kept row moves and goes like any other, and `getTree()` reports it exactly as it came. Two `not`s stay two.

## Keyboard

Every control is a native button, list or input, so `Tab` reaches each one in order. The **Not** buttons are toggles with `aria-pressed`.

| Shortcut | Action | Name |
|----------|--------|------|
| `Alt + ↑` | Moves the row that holds the focus up | `moveUp` |
| `Alt + ↓` | Moves it down | `moveDown` |

After an action, the focus stays on the same control of the same row. After an add, it goes to the new row's first choice. After a remove, it goes to the row that took its place.

## Pointer and touch

A row's grip on its left drags it to another place, in its group or in another one. A line shows where it will go. The grip is a pointer accelerator. Every move is also a button, so no move needs a drag (`TOUCH_EXPERIENCE.md` rule 4). Under a coarse pointer, the grip and the buttons are 44 px.

## Dependencies

- GestureRecognizer, for the drags.
- Bootstrap CSS and Bootstrap Icons CSS.
