<!-- AGENT: ExpressionBuilder is a visual editor for a query in the apps' query language. It edits the tree the API's Parse call returns, beside FacetSearch, which edits the same query as text. The host keeps the two in step with Parse and Print. -->

# ExpressionBuilder

A visual editor for a query in the apps' query language, for people who would rather not type one (#207). It shows the query as a grid of rows, like the query editor in Azure Boards (#237). Each condition is one row, each row joins the row above it with **And** or **Or**, and a group is a bracket beside its rows. It edits the tree that the API's Parse call returns: groups joined by **all** (`and`) or **any** (`or`), **not**, conditions on a key, words, searches inside a relationship (`where`), conditions on a link (`link`), variables ("the same item as"), and comparisons of variables. [FacetSearch](../facetsearch/README.md) edits the same query as text, and the host keeps the two in step with the API's Parse and Print calls.

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

**Relationship keys** (spec section 9). A facet with `relationship: true` is a key that links to an item or a person, such as `rel.created_by`, or a column key that holds the same fact, such as `created_by`. A condition on it can hold three more things, each edited in the grid (see **Grids inside a row** below):

- **"the same item as"** another condition, which writes a variable;
- **"has one where"**, a search inside the item at the other end, with its own rows;
- **Link conditions**, when the facet lists the link's own fields in `link`, such as `provenance`, `confidence` and `at`. They write `link ( … )`.

Its values are item ids. The tree writes them as `resource` values, as the API's binder does.

```js
{ key: "rel.signed_off_by", label: "Signed off by", valueType: "text", relationship: true,
  link: [
      { key: "provenance", label: "Provenance", valueType: "enum", values: ["manual", "ai"] },
      { key: "at", label: "Made", valueType: "date" },
  ] }
```

FacetSearch takes the same list. `relationship` and `link` are in its `FacetDefinition` for this, and the bar ignores them.

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

## The grid

Each line of the grid has these columns, from left to right (`specs/expressionbuilder-grid.prd.md` section 5):

| Column | What it holds |
|--------|---------------|
| Handle | Drags the row, or on a group's line the whole group |
| Check box | Checks the row for the toolbar |
| Brackets | One narrow column for each level of groups. A group draws a solid bracket. A run of **And** rows inside an **Or** draws a dashed one |
| Join | **And** or **Or**, which joins the row to the row above it, and **Not**. The first row of a level has only **Not** |
| Key, operator, value | The condition, as before. Words show "Has the words" and their input |
| Actions | **✕** removes the row. **⋯** opens **Insert condition above**, **Insert words above**, **Insert comparison above**, **Move up** and **Move down**, and **Add link conditions** on a relationship condition whose facet lists `link` fields |

**How rows without a group read.** The language reads `not` first, then `and`, then `or`. So the rows `a`, **And** `b`, **Or** `c` mean `(a and b) or c`. The grid shows that reading with a dashed bracket around `a` and `b`. **Make a group**, at the top of a dashed bracket, turns it into a group, which changes nothing it means.

**Groups.** A group's line has its own check box, join and **Not**, a list with **And** and **Or** that sets every join inside it but the first, and **Ungroup**. The list shows **Mixed** while the joins inside differ. **Ungroup** puts the rows back in place, and is off for a group with **Not**, because that would change what it means. A group a person makes or changes stays a group, even where the precedence would read it the same without one. A query back from the bar shows it dashed again, with the same meaning.

**The footer.** **Add condition**, **Add words** and **Add comparison** add a row at the end, joined with **And**. **Add comparison** is off until the query names two items with "the same item as". The toolbar acts on the checked rows:

| Button | On when |
|--------|---------|
| **Group** | Two or more checked rows next to each other in one level. The new group is checked in place of its rows |
| **Ungroup** | One checked group with no **Not** |
| **Move up**, **Move down** | Checked rows next to each other in one level, and not at the top or the bottom of the grid |
| **Remove** | One or more checked rows, in any grid. A group goes with its rows, and a condition with its search inside and its link conditions |

A button that is off says why in its title.

**Moves.** **Move up** and **Move down** move one place in the grid. Past a group, they move the rows into it: at its end going up, at its start going down. At a group's edge, they move the rows out of it. Within a level each row keeps its join. Into another level, a row takes the join of the row it lands before, so a row added at the end and moved into an **Or** group joins it with **Or**. A group left with one row and no **Not** is ungrouped. A group cannot move into itself. A search inside takes rows in and lets them out as a group does, and a condition cannot move into its own. Nothing moves into or out of a link's grid, because its keys differ.

## Grids inside a row

A search inside and link conditions are each a grid of their own, indented under their condition's line, with their own columns, brackets, joins and groups (spec section 5.7). The link's grid comes first, as the bar reads them: `key link ( … ) where ( … )`. Row numbers count their lines.

- **Has one where.** Choose **has one where** as a relationship condition's operator. A grid labeled "Has one where" opens under the row, with a new condition to fill in, and the builder's keys. It has its own **Add condition**, **Add words** and **Add comparison**. The condition is a draft, "Needs a condition inside", until a row inside is complete.
- **Link conditions.** Choose **Add link conditions** in the ⋯ menu. A grid labeled "Link" opens under the row, with a new condition to fill in, and the keys of the facet's `link` list. It has only **Add condition**, because a link's fields take no words, and a button that removes the link conditions.
- **The same item as.** A relationship condition with **is**, outside a link, has a list before its value: "a value", or "the same item as row 3, Created by" for each other such condition that has no value of its own or already names an item. Choosing one names one item for both, from the key, such as `?created_by`. An item that only a comparison or `return` names is offered by its name.
- **Comparisons.** A comparison picks the first item, "is the same item as" or "is not the same item as", and the second item. Each item reads as its name and the rows that name it, such as "?created_by (rows 2 and 5)". It is a draft, "Needs two different items", until both sides name different items.

**Drafts.** A new condition is a draft until it has a key, an operator and the value its operator needs. A draft is shown with a dashed line and "Needs a value", and left out of `getTree()` and `onChange`. So the tree always prints. So are empty words.

**When `onChange` fires.** A choice from a list, a toggle and a move report at once. A typed value reports when the input commits, on `Enter` or when the focus leaves it. A change that means nothing new, such as a draft or a new group, reports nothing.

**What it cannot edit, it keeps** (`UI_EXPERIENCE.md` section 5.7). These show as read-only rows, which say what they hold and "Edit this in the search bar":

- a parameter, a relative date, a date with a time, or an instant as a value
- a variable, a search inside or a link condition on a key that is not a relationship, and a variable or a comparison inside a link
- a key with no facet, or an operator the language does not have
- `return`

A read-only row checks, moves and goes like any other, and `getTree()` reports it exactly as it came. Two `not`s stay two.

## Keyboard

Every control is a native button, list, check box or input, so `Tab` reaches each one in order. The **Not** buttons are toggles with `aria-pressed`.

| Shortcut | Action | Name |
|----------|--------|------|
| `↑` / `↓` | On a check box, to the check box of the line above or below | |
| `Space` | Checks or unchecks the focused row | |
| `Shift + ↑` / `Shift + ↓` | On a check box, checks the row above or below in the same level too | |
| `Alt + G` | **Group** | `group` |
| `Alt + Shift + G` | **Ungroup** | `ungroup` |
| `Alt + ↑` / `Alt + ↓` | **Move up** / **Move down**, into and out of groups | `moveUp`, `moveDown` |

The keys with a name act on the checked rows, or on the row that holds the focus when none is checked. A letter is read by the key's place, so `Alt + G` works on macOS too. After an edit, the focus stays on the same control of the same row. After an add, it goes to the new row's first choice. After **Group**, to the group's check box. After **Ungroup**, to the first row it held. After a remove, to the next line, or the line before, or **Add condition**.

**In a dialog.** `Escape` closes the ⋯ menu, or ends a drag, and stops there. With nothing open, the builder leaves `Escape` alone, so it reaches the dialog. The value suggestions are the browser's own list, which the browser closes. The builder does not trap the focus.

## Pointer and touch

A row's handle drags it, and a group's handle drags the group, to any place in the grid: within its level, into a group, out of one, between groups, and into or out of a search inside. A line shows where it will land, and none shows across a link's edge. Over the top half of a line, the place is before it. Over the bottom half of a row, it is after it, and where groups end on that line, the bracket column under the pointer picks the level. Over the bottom half of a group's line, or of a condition with a search inside, it is first in the group or the search inside. `Escape` or a canceled touch moves nothing. The joins follow the rules of **Moves** above.

The handle is a pointer accelerator. **Move up** and **Move down** make every move a drag makes, so no move needs a drag (`TOUCH_EXPERIENCE.md` rule 4). Under a coarse pointer, the handle, the check boxes, the lists, the buttons and the menu items are 44 px. On a narrow screen, the grid scrolls sideways inside the builder.

## Dependencies

- GestureRecognizer, for the drags.
- Bootstrap CSS and Bootstrap Icons CSS.
