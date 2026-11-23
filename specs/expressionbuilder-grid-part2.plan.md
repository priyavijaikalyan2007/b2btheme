# ExpressionBuilder grid, part 2: implementation plan

> **For agentic workers:** execute this plan inline with superpowers:executing-plans. The owner asked for no subagents. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Part 2 of `specs/expressionbuilder-grid.prd.md` (section 9). A search inside, link conditions, "the same item as" and a comparison become editable in the grid. Part 1 shows them read-only.

**Architecture:** A search inside (`FilterRow.where`) is its condition's own level, as a group's level is the group's. The level functions of part 1 reach it by the condition's item path, so a move, a group and a drag cross into and out of it by the rules of spec 4.5, unchanged. Link conditions (`FilterRow.link`) are a grid of their own, whose root is the link's `GroupRow`, because their keys differ: the level functions take that root, and nothing moves in or out. Both are drawn as indented grids under their condition's line. The class keeps a map from each drawn row to the root of its move space.

**Tech stack:** TypeScript compiled per file and wrapped in an IIFE, SCSS, Vitest with jsdom, Playwright.

## Global constraints

- All of part 1's constraints hold (`specs/expressionbuilder-grid.plan.md`, "Global constraints").
- No new key bindings.
- The exported functions stay exported. `readOnlyWhy` stays, and now names only a kept row's reason, because part 2 edits the other three kinds.
- A nested grid does not scroll by itself. The outer grid scrolls, so no new region name is needed.
- The PR says "Part 2 of 2 of #237", never a closing keyword. The owner closes #237.

## Spec amendments

Part 2 is one paragraph in section 9. The plan found these gaps. Each is a small rule.

1. **Moves and the search inside (owner, 23 Nov 2026).** A row or a group moves into and out of a search inside, as into and out of a group. **Move down** onto a condition with a search inside takes the items in at its start, and **Move up** from below it takes them in at its end. At the top or the bottom of a search inside, they leave it and go before or after its condition. A condition cannot move into its own search inside. A link's grid stays closed, because its keys differ (spec 4.5).
2. **Grids inside a row (new 5.7).**
   - A condition with "has one where" shows an indented grid under its line, labeled "Has one where", with the builder's keys.
   - A condition with link conditions shows an indented grid labeled "Link", with the link's keys, and a button that removes the link conditions.
   - The link's grid comes first, as the bar reads it: `key link ( … ) where ( … )`.
   - Each nested grid has its own columns, brackets, joins and groups. It also has its own **Add condition** and **Add words** buttons. A link's grid has only **Add condition**, because a link's fields take no words. An empty grid says "No conditions yet".
   - **Group**, **Move up** and **Move down** need the checked items to be next to each other in one level. **Remove** takes checked items from any grid.
   - In a link's grid, **Move up** at its top is off, and so is **Move down** at its bottom. A drag shows no line across a link's edge.
   - Over the bottom half of a condition with a search inside, a drag's place is first in the search inside, as for a group's line.
   - A "has one where" condition's value column is empty. While its grid has no complete row, the condition is a draft: "Needs a condition inside".
   - Row numbers count the lines of nested grids, in the order drawn.
   - A nested grid is a region labeled "The search inside Signed off by" or "The link conditions of Signed off by".
3. **The ⋯ menu.** On a relationship condition whose facet lists `link` fields and that has no link conditions yet, the menu adds **Add link conditions**. The menu's inserts fit the grid: a link's grid offers only **Insert condition above**.
4. **"The same item as."** On a relationship condition with **is**, outside a link, the value column has a select before the value. It offers "a value" and "the same item as row N, Key" for each other such condition that has no value of its own or that already names an item. Choosing one names the item for both rows. The name is the key's last part, such as `?created_by`, and it shows in the bar. A row whose item only a comparison or `return` uses offers "the same item as ?name".
5. **A comparison.** The key column picks the first item, the operator column has "is the same item as" and "is not the same item as", and the value column picks the second item. Each item reads as its name and the rows that name it, such as "?created_by (rows 2 and 5)". A comparison of an item with itself, or with a side unset, is a draft: "Needs two different items".
6. **Adding a comparison.** The footer and each search inside get **Add comparison**, and the ⋯ menu gets **Insert comparison above**, outside a link. They are on when the query names two or more items, and off otherwise, with the title "Name two items with "the same item as" to compare them".
7. **What stays read-only.** Only a kept row (5.5), and "Returns", which the bar edits.
8. **Problems (section 8).** A problem inside a search inside or a link goes on the deepest line that holds it, which is now a line of the nested grid. The sentence about part 1 goes.

## Files

| File | Change |
| :--- | :--- |
| `specs/expressionbuilder-grid.prd.md` | Task 1 |
| `components/expressionbuilder/expressionbuilder.ts` | Tasks 2 to 4 |
| `components/expressionbuilder/expressionbuilder.test.ts` | Tasks 2 to 4. The four "part 2" tests are rewritten. |
| `components/expressionbuilder/expressionbuilder.scss` | Task 5 |
| `tests/expressionbuilder.spec.ts` | Task 6 |
| `demo/components/expressionbuilder.html`, `tests/demo-query-pages.spec.ts`, `components/expressionbuilder/README.md`, `CHANGELOG.md`, `agentknowledge/history.jsonl`, `docs/COMPONENT_REFERENCE.md`, `docs/AGENT_QUICK_REF.md` | Task 7 |

---

### Task 1: Spec amendments

- [ ] Apply amendments 1 to 8 to the spec, in sections 4.5, 5.1, 5.4, 5.5, a new 5.7, 7.3 and 8. Commit `docs(expressionbuilder): part 2 of the grid, the rules the plan found (#237)`.

### Task 2: The model for nested grids

**Interfaces produced:**

- `levelAt`, `itemAt` and `itemPathOf` reach a search inside: the level at a condition's path, while its operator is `where`, is its `where` group.
- `moveTarget` enters a search inside beside the items, as it enters a group.
- `tidy` leaves a search inside alone, even empty, because it is its condition's level and not an item.
- `export function* gridLines(root: GroupRow, inLink = false): Generator<{ row: Row; inLink: boolean }>`: each line the grid draws, in order. A level's items, a group's level after its line, and after a condition's line its link's grid, then its search inside while its operator is `where`.
- `readOnlyWhy(row)` returns a kept row's `what`, else null.

- [ ] **Tests first:**
  - `levelAt` and `itemPathOf` reach the rows of a search inside, and not while the operator is not `where`.
  - `moveItems` takes a row from the top level into a search inside, and back out. The tree means what 4.5 says. The condition stays when its search inside is left empty.
  - `refuses` a condition into its own search inside.
  - `moveTarget` enters a search inside from above and below, and leaves it at its top and its bottom.
  - `groupItems`, `moveItems`, `removeItems` and `ungroupItem` with a link's group as the root: the new group has the link's `linkOf`, the tree means the same, the root takes no mark, and `moveTarget` at the link root's top is null.
  - `gridLines` for example 4 of #376: the org row, the sign-off row, the link's two rows, then the row inside.
  - `readOnlyWhy` is null for a search inside, a link, a variable and a comparison.
- [ ] Implement. Commit `feat(expressionbuilder): a search inside is its condition's level, and link conditions a grid of their own (#237)`.

### Task 3: Nested grids in the class

- `interface Grid { root: GroupRow; scope: Facets; inLink: boolean; prefix: string }`: the top grid with its searches inside, or one link's grid.
- `gridOf: Map<Row, Grid>`, `numbers: Map<Row, number>`, `localDepth: Map<GroupRow, number>` and `listOf: Map<GroupRow, HTMLElement>` are rebuilt by each render. `numbers` comes from `gridLines` before any line is drawn, so a select can name a row below it.
- `data-item` is the item path in its grid, after the link's prefix: `1.0` in a search inside, `1.link.0` in a link. The class never parses it. It finds rows by the maps.
- `LineContext` gains `at`, the path inside the drawn grid, and `depth`, the drawn grid's bracket columns, so the brackets start again in each nested grid.
- Every call that passed `this.root` to a level function passes the row's grid root. `ItemRun` and the drag's place carry their grid.
- `markPlace` marks the end of a level on the `li` of its last item, so the line falls after a nested grid. An empty level marks its own list.

- [ ] **Tests first (DOM):**
  - Example 4 draws the link's grid and the search inside, each with its label, its lines and its adds. `data-item` reads `1.link.0`, `1.link.1` and `1.0`.
  - Row numbers in the labels count the nested lines.
  - Move down from the row above takes it into the search inside, and Move up at its top takes it out.
  - Group inside a search inside, and inside a link.
  - In a link, Move up is off at its top. Checking a row in the top grid and one in a link turns Group and Move off, and Remove removes both.
  - A drag from the top grid into a search inside moves the row. One toward a link's grid shows no line and changes nothing.
  - The warning test from part 1 now lands on `1.link.0` and `1.0`.
  - Echo from the bar keeps the rows and the focus inside a nested grid.
- [ ] Implement. Commit `feat(expressionbuilder): a search inside and link conditions as grids under their row (#237)`.

### Task 4: The editors

- [ ] **Tests first (DOM):**
  - A relationship key offers "has one where" outside a link and not inside one. Choosing it opens an empty search inside, with focus on its **Add condition**, and the row is a draft until a row inside is complete.
  - **Add link conditions** in the ⋯ menu opens the link's grid. Its remove button takes it away. A link's grid offers no words and no comparison.
  - "The same item as row 1, Created by" names `?created_by` on both rows, and `getTree()` holds it. "a value" takes it off.
  - A comparison: **Add comparison** is off with its title while fewer than two items are named. With two, it adds a draft that picks both sides and reports `compare` in the tree.
  - Each new control keeps the focus after its edit.
- [ ] Implement, from the editors of `b421f5ca` (`sameAs`, `renderCompare`, the `where` operator, the link add and remove), fitted to the grid's columns. Commit `feat(expressionbuilder): edit a search inside, link conditions, the same item as, and comparisons (#237)`.

### Task 5: Styles

- [ ] A nested grid spans its item's columns, indented, with its own template and `--eb-depth`, and no overflow of its own. Its label line, its adds, and "No conditions yet". The new buttons and selects reach 44 px under a coarse pointer. Commit `style(expressionbuilder): grids inside a row (#237)`.

### Task 6: Browser tests

- [ ] On the test's own page: a row dragged inside a search inside moves there, and one dragged toward the top grid is refused. The touch test adds the nested adds, the link's remove button and the "same item as" select to its list. Each test fails without its change. Commit `test(expressionbuilder): grids inside a row in a browser (#237)`.

### Task 7: Documents

- [ ] The demo shows a search inside with link conditions and a comparison, editable. `tests/demo-query-pages.spec.ts` checks the nested lines. README, CHANGELOG (under the existing heading), one history line, and `npm run docs` for the references. Commit `docs(expressionbuilder): part 2 in the demo and the README (#237)`.

### Task 8: Verify and open the PR

- [ ] `npm run build`, `npm test`, `npm run test:structure`, then `npm run test:e2e` alone.
- [ ] Push, check origin equals HEAD, open the PR with "Part 2 of 2 of #237", and wait for CI.
