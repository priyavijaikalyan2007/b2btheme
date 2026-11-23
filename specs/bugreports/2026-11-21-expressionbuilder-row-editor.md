# ExpressionBuilder as a row-by-row editor

**From:** knobby.io apps, search (knobbyio/apps#379, plan 3)
**Date:** 21 November 2026
**Component:** `components/expressionbuilder`
**Severity:** A request to change how the builder looks and works. Its options, its handle and the tree it edits stay the same. The apps' search page waits for this change before it shows the builder.
**Status:** Open

## Summary

The apps' product owner reviewed the builder on 21 November 2026 and found its nested boxes hard to use. The owner asks for a row-by-row editor, like the query editor in Azure DevOps. Each condition is one row in a grid. A column at the start of each row joins it to the row above. A person groups rows by selecting them, and a group shows as a bracket beside its rows. This note describes how that editor reads and writes the same tree that Parse returns and Print takes.

The apps will host the builder in a modal on the search page. A person opens it with "Edit visually", edits a copy of the query, and chooses Apply or Cancel. So the builder no longer needs to stay in step with the bar while a person edits.

## The grid

Each row is one condition, with these columns, from left to right:

1. **Select.** A check box. Selected rows can be grouped, ungrouped, moved or removed together.
2. **Brackets.** One narrow column for each level of grouping. A group draws a bracket that spans its rows.
3. **Join.** **And** or **Or**, which joins this row to the row above it. The first row of the query has no join. A **Not** toggle in the same column negates the row, so the column reads **And**, **Or**, **And not** or **Or not**. **Not** is a toggle beside **And** and **Or**, so that a negated row can still join with either. The owner confirmed this reading on 21 November 2026.
4. **Key.** The facet's label, from the same `facets` list as today.
5. **Operator.** The operators the facet lists, as today.
6. **Value.** The value input that fits the operator, as today.
7. **Row actions.** Remove, and a menu with the rest.

A row for words, a comparison of variables, and a kept read-only row are rows in the same grid. Their key, operator and value columns show what they hold.

## Groups

- **Make a group.** A person selects two or more rows that sit next to each other, and chooses **Group**. A bracket appears beside them.
- **Set a group.** A group has its own control, at the top of its bracket, with **And**, **Or** and **Not**. **And** and **Or** set the join of every row inside the group except its first row. **Not** negates the whole group.
- **Join a group to the rows around it.** The join of a group's first row joins the whole group to the row above the group. This is how Azure DevOps reads it too.
- **Nest groups.** A group can hold groups. Each level adds a bracket column.
- **Ungroup.** A person selects a group and chooses **Ungroup**. A group with **Not** cannot be ungrouped, because that would change what it means. This matches today's rule.

## How rows without a group read

The query language reads `not` first, then `and`, then `or` (spec section 5, "Precedence"). So the rows `A`, **And** `B`, **Or** `C` mean `(A and B) or C`. A person who mixes **And** and **Or** without a group may not know this. We suggest that the builder shows the reading: a light, dashed bracket around each run of **And** rows that sits inside an **Or**. The bracket shows only what the query means, and the person can make it a real group with one click. This is a suggestion. Please tell us if you prefer another way to show it.

## Searches inside, link conditions and variables

These features from part 2 stay, and move into the grid:

- **Has one where.** A relationship row with the operator "has one where" opens a grid of its own, indented under the row. That grid has its own joins and groups, and its conditions apply to the item at the other end.
- **Link conditions.** **Link** on a relationship row opens a second indented grid, labeled "Link", with the keys from the facet's `link` list. A row never moves between that grid and the others, because their keys differ.
- **The same item as.** On a relationship row with **is**, the value column offers "the same item as" each other relationship row, by its row number and key. The builder names the variable as it does today.
- **Comparisons.** A comparison row compares two variables, as today.

## Reading a tree into rows

Parse's tree becomes rows by these rules, so each tree has one grid:

1. A chain of `and` or `or` becomes rows with that join.
2. An `or` inside an `and`, or an `and` inside an `or`, becomes a group, unless the precedence above already gives the same reading. For example, `(a and b) or c` needs no group, and `a and (b or c)` needs one.
3. `not` on one condition becomes **Not** on its row. `not` on a group becomes a group set to **Not**.
4. A tree that means what the builder holds keeps the rows, as today.

## Keyboard, touch and the modal

- **Keyboard.** Space selects a row. Shift with an arrow key extends the selection. **Group**, **Ungroup**, **Move up** and **Move down** are buttons, and each has a key binding in `keyBindings`.
- **Touch.** The check box, the join control and each action are at least 44 px under a coarse pointer, as `TOUCH_EXPERIENCE.md` rule 4 says. No action needs a drag.
- **In a modal.** The apps host the builder in a modal dialog. Escape closes an open dropdown in the builder first. A second Escape belongs to the dialog, so the builder must not stop it. The builder must also not move focus out of its container.

## What stays the same

- `ExpressionBuilderOptions`, `ExpressionBuilderHandle`, `getTree()`, `setParsed()` and `onChange` keep their contracts.
- The `facets` list keeps its shape, with `relationship` and `link`.
- Drafts stay out of the tree, so the tree always prints.

## Questions for you

1. Do you agree with the implied, dashed bracket for precedence, or do you prefer that the builder always makes a real group when a person mixes **And** and **Or**?
2. How much of today's code for groups and rows can the grid keep? This tells the apps when to plan the search page's builder task.

The apps' plan for the search page is `plans/2026-11-16-query-language-switch-over-plan.md` in knobbyio/apps, Task 12.
