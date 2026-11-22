# ExpressionBuilder as a row-by-row grid

**Request:** `specs/bugreports/2026-11-21-expressionbuilder-row-editor.md`, from the apps' search team (knobbyio/apps#379, plan 3).
**Design agreed with the owner:** 22 November 2026.
**Component:** `components/expressionbuilder`.
**Delivery:** two pull requests. Part 1 is the grid. Part 2 makes searches inside, link conditions, "the same item as" and comparisons editable in it.

## 1. Summary

ExpressionBuilder shows a query as nested boxes today. The apps' product owner found the boxes hard to use and asked for a row-by-row editor like the query editor in Azure Boards. This change replaces the rendering with a grid. Each condition is one row. A column joins each row to the row above it. A person makes a group by checking rows and choosing **Group**, and a group shows as a bracket beside its rows.

The options, the handle, the tree and the `facets` list keep their contracts. No app shows the builder yet, and it is not in the A2UI catalog, so replacing the boxes breaks no user.

## 2. Decisions

| Decision | Choice | Made |
| :--- | :--- | :--- |
| How the grid shows precedence for mixed And and Or without a group | A light, dashed bracket around each run of And rows inside an Or. One click makes it a real group. | Owner, 22 Nov 2026 |
| Delivery | Two parts, as section 9 says | Owner, 22 Nov 2026 |
| The model | The existing tree of groups and rows stays the one model. The grid is a view of it (section 4). | Owner, 22 Nov 2026 |
| The old nested boxes | Replaced, with no option to keep them, because no app uses the builder | Owner, 22 Nov 2026 |
| Drag to reorder | Kept. A drag moves one row or group to any place in the grid: within its level, into a group, out of one, or from one group to another (section 4.5). Each move a drag makes, **Move up** and **Move down** can also make. | Owner, 22 Nov 2026 |

## 3. The reference: Azure Boards

The Azure Boards query editor ([Define a work item query](https://learn.microsoft.com/en-us/azure/devops/boards/queries/using-queries?view=azure-devops&tabs=browser)) works this way:

- Each clause is one row, with a check box, a bracket column for each level of grouping, And/Or, Field, Operator and Value.
- The first clause has no And/Or. Each other clause's And/Or joins it to the clause above it.
- **Add new clause** adds a row at the end. Each row has **Insert new filter line** and **Remove this filter line**.
- A person checks clauses that sit next to each other and chooses **Group selected clauses**. Groups can hold groups. The bracket has an **Ungroup** icon.
- "The And or Or operator for the first clause in the group applies to the whole group."

The grid follows these rules. It differs in four ways. Three come from the apps' request: a **Not** toggle in the join column, a group control with And, Or and Not at the top of each bracket, and the row actions at the end of the row. The fourth comes from the owner: rows and groups can be dragged, and Azure has no drag.

## 4. The model

The tree of `GroupRow`, `FilterRow`, `TextRow`, `CompareRow` and `KeptRow` stays the one model of what the query means. Building the tree, printing, variables, kept rows and the placement of problems keep their code and their tests.

A new view layer turns each group into a **level**: an ordered list of **items**. An item is a row or a group. Each item has a **join**, And or Or, which joins it to the item above it. The first item's join is not shown and does not count.

### 4.1 From the tree to levels

For each group:

1. A child group that has no `not`, has no bracket mark and has the same op as its parent joins its parent's level. Its children become items of that level. This applies to And inside And and to Or inside Or.
2. In an Or group, a child And group with no `not` and no bracket mark becomes a **run**. Its children become items of the Or group's level. The run's first item takes the join Or, unless it is the first item of the level. Its other items take And. The run shows a dashed bracket.
3. Any other child group is one item of the level, shown as a group with a solid bracket and a level of its own. That covers an Or inside an And, a group with `not`, a group with a bracket mark, and a link group.
4. In an And group each item's join is And. In an Or group each item that does not start a run, and each run's first item, has the join Or.

The top level is the root group's. A root with `not`, such as `not (a or b)`, is already wrapped in an And group of one by `rootOf`, so it shows as one group item with **Not** on.

### 4.2 From levels to the tree

For each level:

1. Split the items at each join Or into runs.
2. With one run, the level's group is an And group of the run's items.
3. With more than one run, the level's group is an Or group. A run of one item is that item. A run of two or more items is an And group of them, with no bracket mark.
4. The level's group keeps its own `not` count, bracket mark and link key.

So the tree from 4.2, read back by 4.1, gives the same level. Each edit changes a level, rebuilds the tree by 4.2, and draws the grid again from the tree by 4.1. The grid therefore always shows what the tree means.

### 4.3 The bracket mark

`GroupRow` gains an optional `bracket: true`. It marks an And group that a person made with **Group**, or turned solid with **Make a group**, where the precedence already gives the same reading. Such a group draws a solid bracket. The mark does not change the tree that `getTree()` returns, because the reading is the same without it.

A query that comes back through the bar loses the mark, because Print writes no parentheses that the reading does not need. The group then shows a dashed bracket again, with the same meaning.

### 4.4 Examples

The three examples in the Azure docs, in the query language:

| Grid | Text | Meaning | Bracket |
| :--- | :--- | :--- | :--- |
| `type = bug` / And `state = active` / Or `assigned = me` | `type:bug and state:active or assigned:me` | (type and state) or assigned | Dashed, around rows 1 and 2 |
| `type = bug` / And [`state = active` / Or `assigned = me`] | `type:bug and (state:active or assigned:me)` | type and (state or assigned) | Solid, around the group |
| `type = bug` / Or [`state = active` / And `assigned = me`] | `type:bug or (state:active and assigned:me)` | type or (state and assigned) | Solid when the person made the group. Dashed after a parse. |

### 4.5 Moving an item

A drag, **Move up** and **Move down** each move items by the same rules. A move takes an item out of its level and puts it at a **place**: before an item of a level, or at the end of a level. The tree is then rebuilt by 4.2. A move never changes the item itself, so a group moves with its rows, its `not`s and its bracket mark.

**The join of a moved item.**

- **Within its own level,** each item keeps its join, so a move only changes the order. An item that becomes first gives its join to the item that was first. So `A` / Or `B`, with `B` moved up, reads `B` / Or `A`.
- **Into another level,** the item takes the join of the item it lands before, or of the level's last item when it lands at the end. So a row added at the end with And, and dropped into the group [`state = active` / Or `assigned = me`], joins it with Or.
- **First in another level,** the item shows no join. The item that was first takes the join of the item after it, or And when the level held one item.

**The level it leaves.** When the item was first there, the next item becomes first and no longer shows its join. A group left with no items is removed. A group left with one item and no `not` is ungrouped, because a bracket around one row means nothing. A group with `not` keeps its one item. The same two rules apply after **Remove**.

**What a move refuses.** A group cannot move into itself or into a group inside it. In part 2, an item never moves between a link's grid and the others, because their keys differ. The model's `moveRowTo` and `isWithin` hold both rules today.

A draft moves like any other row. It stays out of the tree until it is complete, as today.

## 5. The grid

```
    ☐ │ │ Join        │ Key         │ Operator │ Value  │ ✕ ⋯
 ⠿  ☐ │┆│             │ Type        │ is       │ Bug    │ ✕ ⋯
 ⠿  ☐ │┆│ And  [Not]  │ State       │ is       │ Active │ ✕ ⋯
 ⠿  ☐ │┌ Or  [Not]  ⟨group: And · Or · Mixed  [Not]  Ungroup⟩
 ⠿  ☐ ││  │ Or [Not] │ Assigned to │ is       │ me     │ ✕ ⋯
 ⠿  ☐ ││  │ And [Not]│ Priority    │ is       │ 1      │ ✕ ⋯
 + Add condition   + Add words      [Group] [Ungroup] [Move up] [Move down] [Remove]
```

### 5.1 Columns

From left to right:

1. **Drag handle** (⠿). It drags the row (section 5.6). The group control has one too, which drags the whole group.
2. **Select.** A check box. It is the row's focus stop (section 6).
3. **Brackets.** One narrow column for each level of grouping. A group draws a solid bracket that spans its rows. A run draws a dashed one.
4. **Join.** A select with **And** and **Or**, and a **Not** toggle beside it. So the column reads **And**, **Or**, **And not** or **Or not**. The first item of a level shows only **Not**. **Not** is on when the item has an odd number of `not`s. Pressing it removes one `not`, or adds one when there are none, as today. So two `not`s from a parse are kept until a person changes them.
5. **Key.** The facet's label, from `facets`.
6. **Operator.** The operators the facet lists.
7. **Value.** The input that fits the operator, as today.
8. **Row actions.** **Remove** (✕), and a menu (⋯) with **Insert condition above**, **Insert words above**, **Move up** and **Move down**.

### 5.2 Groups

- **The group control** sits at the top of each solid bracket, on its own line. It has its own drag handle and check box, the group's join and **Not**, a select with **And**, **Or** and **Mixed**, and an **Ungroup** button. **Mixed** shows while the joins inside differ, and cannot be chosen.
- **And** or **Or** in the group control sets the join of every item inside the group except its first.
- **The group's join** is the join of its first line, the group control. It joins the whole group to the item above the group, as in Azure.
- **Not** on the group control negates the whole group.
- **Ungroup** puts the group's items back into the parent level, in place. The group's join goes to its first item. A group with `not` cannot be ungrouped, because that would change what it means. The button is then off, and its title says why.
- **A dashed bracket** has one control: **Make a group**. It sets the bracket mark (4.3) and changes nothing else.

### 5.3 The toolbar

The toolbar acts on the checked items. A checked group counts as one item, and checking a group does not check its rows.

| Button | Acts when | Does |
| :--- | :--- | :--- |
| **Group** | Two or more checked items, next to each other, in one level | Wraps them in a group with the bracket mark. The group takes the first item's join, and that item's join is no longer shown. |
| **Ungroup** | One checked group with no `not` | As in 5.2 |
| **Move up**, **Move down** | Checked items next to each other in one level, except at the top of the grid for **Move up** and at its bottom for **Move down** | Moves them one place in the grid, by the rules in 4.5. Within a level, they change places with the item beside them. Above them, a group takes them in at its end. At the top of a group, they leave it and go before it. **Move down** is the mirror: a group below takes them in at its start, and at the bottom of a group they leave it and go after it. A dashed bracket is not a group, so they pass through it within their level. |
| **Remove** | One or more checked items | Removes them. A group goes with its rows. |

A button that cannot act is off, and its title says why, such as "Check two or more rows next to each other to group them".

With several checked items, the first of them takes the join that 4.5 gives, and the others keep their joins.

### 5.4 Adding rows

- **Add condition** and **Add words** add a row at the end of the top level, joined with **And**, as Azure's **Add new clause** does.
- **Insert condition above** and **Insert words above** add a row at that place, in that row's level, joined with **And**.
- A new condition is a draft until its key and value are set. A draft stays out of the tree, so the tree always prints, as today.

### 5.5 Other rows

A row of words, a comparison of two variables and a kept row use the same columns. The key, operator and value columns show what each one holds. In part 1, these rows are read-only, each with its reason shown:

- A condition with "has one where", which holds a search inside.
- A condition with conditions on its link.
- A condition whose value is "the same item as" another row.
- A comparison.

Their part of the tree is kept as it came, so `getTree()` returns it unchanged. They can still be moved, checked, grouped and removed like any row. Part 2 makes them editable (section 9).

### 5.6 Drag

- A drag moves the one item whose handle the person pressed, a row or a group, whether it is checked or not. Several checked items move together with **Move up** and **Move down**.
- While the person drags, a line shows where the item will land. Over the top half of a row, the place is before that row, in its level. Over the bottom half, it is after the row. Over the top half of a group control, the place is before the group. Over its bottom half, it is first in the group.
- After the last row of a group, more than one level can end at the same line. There the bracket column under the pointer picks the level, and a point to the right of the brackets picks the innermost one. Below the last row, the place is the end of the top level.
- A place that 4.5 refuses shows no line, and a drop there changes nothing.
- **Escape** or `pointercancel` ends the drag with nothing moved.
- A drop is announced in the live region with the item's new row number, as **Move up** is.

## 6. Keyboard and focus

| Key | Action | `keyBindings` name |
| :--- | :--- | :--- |
| `↑` / `↓` | Move focus to the check box of the item above or below, across levels | |
| `Space` | Check or uncheck the focused item | |
| `Shift + ↑` / `Shift + ↓` | Extend the checked run in the focused level | |
| `Alt + G` | **Group** | `group` |
| `Alt + Shift + G` | **Ungroup** | `ungroup` |
| `Alt + ↑` / `Alt + ↓` | **Move up** / **Move down**, into and out of groups as 5.3 says | `moveUp`, `moveDown` |

- Focus never leaves the builder's container. After **Remove**, it goes to the check box of the next item, or of the item before it, or to **Add condition** when no row is left. After **Group**, it goes to the new group's check box. After **Ungroup**, it goes to the first item that the group held.
- KEYBOARD.md lists the keys under ExpressionBuilder.

## 7. The modal, touch and accessibility

### 7.1 In a modal

The apps show the builder in a modal on the search page, where a person edits a copy and chooses Apply or Cancel.

- **Escape** ends a drag, or closes an open ⋯ menu or a value suggestion list, and the builder stops that Escape there.
- With nothing open, the builder does not handle Escape, so it reaches the dialog.
- The builder does not trap focus.

### 7.2 Touch

- Under a coarse pointer, each of these is at least 44 CSS pixels: the drag handle, the check box's target, the join select, **Not**, **✕**, **⋯**, the group control's parts, **Make a group** and each toolbar button (`TOUCH_EXPERIENCE.md` rule 4).
- No action needs a drag. Each move a drag makes, **Move up** and **Move down** make too, one place at a time.
- Drags go through the shared gesture recognizer, as today (`TOUCH_EXPERIENCE.md` section 9, item 3). The handle has `touch-action: none` and `-webkit-touch-callout: none`. Elsewhere a swipe scrolls the page.
- `pointercancel` restores the grid from before the drag.
- Hover styles are in `@media (hover: hover)`.

### 7.3 Accessibility

- Each level is a list. Each row is a list item whose label reads its meaning, such as "Row 3: or, Assigned to is me".
- A group is a region with a label, such as "Group of 2 rows, joined with or".
- A dashed bracket has a text equivalent for a screen reader, such as "read together with row 1".
- Each edit is announced in the builder's live region, as today.

## 8. Problems, contracts and logging

- An error or a warning from Parse or Print shows on the row whose text it covers, or above the grid, as today.
- `ExpressionBuilderOptions`, `ExpressionBuilderHandle`, `getTree()`, `setParsed()` and `onChange` keep their contracts. A tree that means what the builder holds keeps the rows, their checked state and their bracket marks.
- The builder still requires `gesturerecognizer.js`, for the drag.
- Each edit logs at debug level with its kind and the item's path. A drag logs its start, its place and its drop or cancel.

## 9. Parts

- **Part 1:** sections 4 to 8. The rows in 5.5 are read-only.
- **Part 2:** a condition with "has one where" opens an indented grid under its row, with its own joins and groups. **Link** on a relationship condition opens a second indented grid, labeled "Link", with the keys from the facet's `link` list. A row never moves between those grids and the others. On a relationship condition with **is**, the value column offers "the same item as" each other relationship row, by its row number and key. A comparison row compares two variables. Each uses the grid of part 1.

## 10. Tests

- The model's unit tests stay.
- **Unit, view layer:** 4.1 then 4.2 gives the same tree for each tree in the existing fixtures, the three examples in 4.4, And in And, Or in Or, `not` on a row and on a group, two `not`s, a link group, and the bracket mark.
- **Unit, moves (4.5):** the join within a level and at its first place, into another level before an item, at its end and at its first place, the level it leaves, a group left with one item with and without `not`, a group into itself, and several checked items.
- **Unit, DOM:** each join, Not, Group, Ungroup and its refusal, the group control and Mixed, Make a group, Move up and Move down within a level and into and out of a group, Insert, Remove, the toolbar refusals and their titles, each key, focus after each action, and the three kinds of Escape.
- **Unit, drag:** through the stubbed recognizer, as the tests do today: each place in 5.6, the bracket column at a line where levels end, a refused place, a drop, Escape and `pointercancel`.
- **Browser:** a touch spec that measures the targets in 7.2 and reads the handle's `touch-action`, and a drag of a row into a group on the demo page.
- Each new test fails without the change it covers.

## 11. Answers to the apps' questions

1. **The implied bracket.** The owner chose the dashed bracket, as the apps suggested.
2. **What stays.** The model and its tests stay: parsing the tree into rows, building the tree, variables, kept rows, problem placement, and the rules that stop a bad move. The drag stays on the shared recognizer. The rendering is replaced. The apps can build their modal against part 1. The rows in 5.5 are read-only until part 2.

<!-- monomark:reading-data:start -->
## Monoleaf reading notes

Auto-generated by Monoleaf. Each export replaces this section.

### Notes

> Rows can be reordered by drag and drop. This means that even if a row is added to the end, I can move it to within an existing group or between groups too.
> 

<!-- monomark:reading-data:end -->
