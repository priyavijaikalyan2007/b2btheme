# ExpressionBuilder grid, part 1: implementation plan

> **For agentic workers:** execute this plan inline with superpowers:executing-plans. The owner asked for no subagents. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace ExpressionBuilder's nested boxes with the row-by-row grid of `specs/expressionbuilder-grid.prd.md`, part 1: sections 4 to 8, with the rows of section 5.5 read-only.

**Architecture:** The tree of `GroupRow` and its rows stays the one model. A new pure view layer in the same file turns each group into a level of items (spec 4.1) and back (spec 4.2), and every grid edit is a pure function on levels. The class draws the grid from levels after each edit, and finds rows by identity, not by tree path. The drag stays on the shared GestureRecognizer.

**Tech stack:** TypeScript compiled per file and wrapped in an IIFE (no imports between component files at run time), SCSS, Vitest with jsdom, Playwright.

## Global constraints

- One file, `components/expressionbuilder/expressionbuilder.ts`. `scripts/wrap-iife.sh` wraps each compiled file alone, so the view layer cannot live in a second module.
- `ExpressionBuilderOptions`, `ExpressionBuilderHandle`, `getTree()`, `setParsed()` and `onChange` keep their contracts (spec section 8).
- The exported model functions stay exported and unchanged: `rowOf`, `rootOf`, `allRows`, `variableUses`, `buildTree`, `treeOf`, `nodeOf`, `meaning`, `rowAt`, `parsePath`, `moveRow`, `wrapRow`, `unwrapRow`, `removeRow`, `moveRowTo`, `pathOfRow`, `setOp`, `newVariable`, `isComplete`, `facetMap`, `facetOps`, `opName`, `opWord`. An unused public function is not dead code.
- `gesturerecognizer.js` stays required, and the constructor keeps its error that names it.
- No fallback code. A state that cannot happen uses a non-null assertion and breaks.
- Pointer events only, through the recognizer. Hover styles in `@media (hover: hover)`. Targets of 44 CSS pixels in `@media (any-pointer: coarse)`.
- Code lines at most 120 characters. Comments and visible text follow LANGUAGE.md: plain English, short sentences, no semicolons, no contractions, no "e.g.", "i.e." or "etc.", American spelling.
- New key bindings: `group` is `Alt+G` and `ungroup` is `Alt+Shift+G`. `moveUp` and `moveDown` stay `Alt+ArrowUp` and `Alt+ArrowDown`.
- Stage by explicit path. Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. No session links anywhere.
- The PR says "Part 1 of 2 of #N", never a closing keyword.

## Files

| File | Change |
| :--- | :--- |
| `specs/expressionbuilder-grid.prd.md` | Task 1: the amendments the plan found |
| `components/expressionbuilder/expressionbuilder.ts` | Task 2 and 3: the view layer and its edits. Tasks 4 to 7: the class draws and edits the grid. |
| `components/expressionbuilder/expressionbuilder.test.ts` | Each task adds its tests. Task 4 rewrites the DOM tests. |
| `components/expressionbuilder/expressionbuilder.scss` | Task 8 |
| `tests/expressionbuilder.spec.ts` | Task 9 |
| `demo/components/expressionbuilder.html`, `components/expressionbuilder/README.md`, `KEYBOARD.md`, `CHANGELOG.md`, `agentknowledge/history.jsonl`, `docs/COMPONENT_REFERENCE.md` | Task 10 |

---

### Task 0: Branch and issue

- [ ] **Step 1:** Rename the spec branch, so the spec goes in with part 1 and no PR stacks on another.

```bash
git branch -m docs/expressionbuilder-grid-spec feat/expressionbuilder-grid-part1
```

- [ ] **Step 2:** File the issue for the apps' request. Its body points to `specs/bugreports/2026-11-21-expressionbuilder-row-editor.md` and the spec, and lists the two parts. Note its number as `#N` for every commit below.

```bash
GH_TOKEN="$(gh auth token --user priyavijaikalyan2007)" gh issue create \
  --title "ExpressionBuilder as a row-by-row grid" --body-file <scratchpad>/issue.md
```

---

### Task 1: Spec amendments

The plan found eleven gaps in the spec. Each is a small rule, and none changes a decision the owner made.

**Files:** Modify `specs/expressionbuilder-grid.prd.md`.

- [ ] **Step 1:** Make these edits.
  1. **4.3, the mark.** Each edit a person makes gives the mark to each group it changes: a group made, moved, or changed by its join, **Not** or group control, and a group whose level a join, an insert, a remove or a move changes. Without it, a group would vanish from the grid when an edit made it read the same as its parent, such as **Not** turned off on `a or not (b or c)`, or the joins of `(b or c)` set to And inside an And.
  2. **5, the drawing.** The group line has one **Not**, beside its join. The drawing shows two.
  3. **5.5, what part 1 offers.** Part 1 does not offer "has one where", **Link**, "the same item as" or a comparison. So these rows come only from a parse.
  4. **6, the keys.** `↑`, `↓`, `Shift + ↑` and `Shift + ↓` act when the focus is on a check box, because a select uses the arrow keys itself. `Alt + G`, `Alt + Shift + G` and `Alt + ↑` / `Alt + ↓` act on the checked items, or on the item that holds the focus when none is checked. The toolbar buttons act on the checked items only.
  5. **7.1, Escape.** The value suggestions are the browser's own `datalist`, and the browser closes it. The builder stops Escape only for its ⋯ menu and for a drag.
  6. **7.3, row numbers.** Row numbers count every line of the grid, a group's line too.
  7. **8, problems.** A problem goes on the deepest line that the grid shows whose text holds it. A problem inside a search inside goes on that condition's line in part 1.
  8. **7.2, narrow screens.** On a narrow screen the grid scrolls sideways inside the builder.
  9. **5.4, Insert above the first row.** The new row is first, so it shows no join, and the row that was first takes And.
  10. **10, the browser drag test.** It runs on a test page with its own tree, not on the demo page, so the test controls what it drags.
  11. **5.3, Group and the checks.** After **Group**, the new group is checked in place of the rows it took, so the next action acts on the group.

- [ ] **Step 2:** Check the spec for semicolons and contractions: `grep -n ";\|n't" specs/expressionbuilder-grid.prd.md` prints nothing.

- [ ] **Step 3:** Commit: `docs(spec): the ExpressionBuilder grid's open rules (#N)`.

---

### Task 2: Levels, the view of the tree (spec 4.1, 4.2, 4.3)

**Files:** Modify `expressionbuilder.ts`: `GroupRow` at line 306, and a new section `// LEVELS: the grid's view of the tree` after `clearSpans` (line 758). Test: `expressionbuilder.test.ts`, new `describe("levels")`.

**Interfaces, produced:**

```ts
export type Join = "and" | "or";
export interface Item { row: Row; join: Join }
export type ItemPath = number[];
export interface Place { level: ItemPath; index: number }
export interface Run { start: number; end: number }
export function levelOf(group: GroupRow): Item[];
export function setLevel(group: GroupRow, items: Item[]): void;
export function runsOf(items: Item[]): Run[];
export function levelAt(root: GroupRow, level: ItemPath): GroupRow;
export function itemAt(root: GroupRow, path: ItemPath): { level: GroupRow; items: Item[]; index: number; item: Item };
export function itemPathOf(root: GroupRow, row: Row): ItemPath | null;
export function levelDepth(group: GroupRow): number;
export function parseItemPath(text: string): ItemPath;
```

- [ ] **Step 1: Write the failing tests.**

```ts
const t = (phrase: string, nots = 0): TextRow => ({ kind: "text", phrase, nots });
const and = (...children: Row[]): GroupRow => ({ kind: "group", op: "and", nots: 0, children });
const or = (...children: Row[]): GroupRow => ({ kind: "group", op: "or", nots: 0, children });
const not = (g: GroupRow): GroupRow => ({ ...g, nots: 1 });
const marked = (g: GroupRow): GroupRow => ({ ...g, bracket: true });
const NONE = new Map();

/** A level as text: each item's join, `not`, and a group in brackets. */
function show(group: GroupRow): string
{
    return levelOf(group).map((it, i) => (i ? it.join + " " : "") + (it.row.nots % 2 ? "not " : "")
        + (it.row.kind === "group" ? "[" + show(it.row) + "]" : (it.row as TextRow).phrase)).join(" ");
}

describe("levels", () =>
{
    test.each([
        ["and in and joins its parent", and(t("a"), and(t("b"), t("c"))), "a and b and c"],
        ["or in or joins its parent", or(t("a"), or(t("b"), t("c"))), "a or b or c"],
        ["an and inside an or is a run", or(and(t("a"), t("b")), t("c")), "a and b or c"],
        ["the Azure docs, example 1", or(and(t("bug"), t("active")), t("me")), "bug and active or me"],
        ["the Azure docs, example 2", and(t("bug"), or(t("active"), t("me"))), "bug and [active or me]"],
        ["the Azure docs, example 3, after a parse", or(t("bug"), and(t("active"), t("me"))), "bug or active and me"],
        ["a group with the mark stays a group", or(t("bug"), marked(and(t("active"), t("me")))),
            "bug or [active and me]"],
        ["a group with not stays a group", and(t("a"), not(or(t("b"), t("c")))), "a and not [b or c]"],
        ["an and with not inside an or", or(t("a"), not(and(t("b"), t("c")))), "a or not [b and c]"],
        ["an or inside a run stays a group", or(and(t("a"), or(t("b"), t("c"))), t("d")), "a and [b or c] or d"],
        ["two nots on a row show as none", and(t("a", 2), t("b")), "a and b"],
    ])("%s", (_name, group, text) =>
    {
        const before = meaning(nodeOf(group, NONE)!);
        expect(show(group)).toBe(text);

        // 4.2 then 4.1 gives the same level, and the tree means the same.
        setLevel(group, levelOf(group));
        expect(show(group)).toBe(text);
        expect(meaning(nodeOf(group, NONE)!)).toEqual(before);
    });

    test("a root with not shows as one group with Not on", () =>
    {
        const root = rootOf({ root: { kind: "not", child: { kind: "or", children: [
            { kind: "text", phrase: "a" }, { kind: "text", phrase: "b" }] } } }, MAP);

        expect(show(root)).toBe("not [a or b]");
    });

    test("two nots on a row are kept as two", () =>
    {
        const group = and(t("a", 2), t("b"));
        setLevel(group, levelOf(group));

        expect((group.children[0] as TextRow).nots).toBe(2);
    });

    test.each([["the apps' tree", APPS_TREE], ...EXAMPLES])("%s: 4.2 then 4.1 gives the same tree", (_n, tree) =>
    {
        const facets = tree === APPS_TREE ? MAP : RMAP;
        const root = rootOf(tree, facets);
        const before = treeOf(root, facets, tree.return);

        setLevel(root, levelOf(root));
        expect(meaning(treeOf(root, facets, tree.return).root)).toEqual(meaning(before.root));
    });

    test("runsOf splits a level at each or", () =>
    {
        expect(runsOf(levelOf(or(and(t("a"), t("b")), t("c"))))).toEqual([{ start: 0, end: 1 }, { start: 2, end: 2 }]);
        expect(runsOf(levelOf(and(t("a"), t("b"))))).toEqual([{ start: 0, end: 1 }]);
    });

    test("an item path goes through the levels, and back from the row", () =>
    {
        const inner = or(t("b"), t("c"));
        const root = and(t("a"), inner);

        expect(levelAt(root, [1])).toBe(inner);
        expect(itemAt(root, [1, 1]).item.row).toBe(inner.children[1]);
        expect(itemPathOf(root, inner.children[1])).toEqual([1, 1]);
        expect(itemPathOf(root, t("x"))).toBeNull();
        expect(levelDepth(root)).toBe(2);
        expect(parseItemPath("1.0")).toEqual([1, 0]);
        expect(parseItemPath("")).toEqual([]);
    });
});
```

Move `REL`, `RMAP` and `EXAMPLES` above the new `describe`, since it uses them. Import `levelOf`, `setLevel`, `runsOf`, `levelAt`, `itemAt`, `itemPathOf`, `levelDepth`, `parseItemPath`, `nodeOf` and the types `Row`, `TextRow`.

- [ ] **Step 2: Run them and see them fail.** `npx vitest run components/expressionbuilder` fails with "levelOf is not a function" or a type error.

- [ ] **Step 3: Write the code.** Add the mark to `GroupRow`:

```ts
    /**
     * A group a person made, moved or changed. It draws a solid bracket where the precedence already gives the
     * same reading, so a group the person sees does not vanish (spec 4.3). The tree is the same without it.
     */
    bracket?: true;
```

Then the section:

```ts
// ============================================================================
// LEVELS: the grid's view of the tree (spec section 4)
// ============================================================================
//
// A level is a group's items, in order: rows, and groups drawn with a solid
// bracket. Each item joins the one above it with `and` or `or`. The first
// item's join is not shown and does not count. A group that reads the same
// as its parent's level joins that level, so the grid shows only the groups
// the meaning needs, and the ones a person made.

/** How an item joins the item above it. */
export type Join = "and" | "or";

/** A row, or a group with a solid bracket, in a level. */
export interface Item { row: Row; join: Join }

/** An item's index in each level, from the top. A group's level is inside its item. */
export type ItemPath = number[];

/** Where items can go: before the item at `index` of a level, or at its end. */
export interface Place { level: ItemPath; index: number }

/** Items next to each other, by their first and last index. */
export interface Run { start: number; end: number }

/** A group whose items join its parent's level: same op, or an `and` run in an `or`, with no `not` or mark. */
function joinsLevel(child: Row, parent: GroupRow): child is GroupRow
{
    return child.kind === "group" && child.nots === 0 && !child.bracket
        && (child.op === parent.op || (parent.op === "or" && child.op === "and"));
}

/** A group's level, by spec 4.1. */
export function levelOf(group: GroupRow): Item[]
{
    const items: Item[] = [];
    const visit = (g: GroupRow, first: Join): void =>
    {
        g.children.forEach((c, i) =>
        {
            const join = (i === 0) ? first : g.op;
            if (joinsLevel(c, g)) { visit(c, join); }
            else { items.push({ row: c, join: (items.length === 0) ? "and" : join }); }
        });
    };
    visit(group, "and");
    return items;
}

/** Each run of a level: split at each item joined with `or`. */
export function runsOf(items: Item[]): Run[]
{
    const runs: Run[] = [];
    items.forEach((it, i) =>
    {
        if (i === 0 || it.join === "or") { runs.push({ start: i, end: i }); }
        else { runs[runs.length - 1].end = i; }
    });
    return runs;
}

/**
 * Writes a level back into its group, by spec 4.2: one run is an `and` group, more are an `or` of runs, and a
 * run of two or more is an `and` group of its own. The group keeps its `not`s, mark, link key and span.
 */
export function setLevel(group: GroupRow, items: Item[]): void
{
    const runs = runsOf(items).map((r) => items.slice(r.start, r.end + 1).map((it) => it.row));
    if (runs.length <= 1)
    {
        group.op = "and";
        group.children = runs[0] ?? [];
        return;
    }
    group.op = "or";
    group.children = runs.map((rows): Row => (rows.length === 1) ? rows[0] : { kind: "group", op: "and", nots: 0,
        children: rows, ...(group.linkOf ? { linkOf: group.linkOf } : {}) });
}

/** The group of the level at an item path. The root's level is at []. */
export function levelAt(root: GroupRow, level: ItemPath): GroupRow
{
    let group = root;
    for (const i of level) { group = levelOf(group)[i].row as GroupRow; }
    return group;
}

/** The item at a path, with its level, the level's items and its index there. */
export function itemAt(root: GroupRow, path: ItemPath): { level: GroupRow; items: Item[]; index: number; item: Item }
{
    const level = levelAt(root, path.slice(0, -1));
    const items = levelOf(level);
    const index = path[path.length - 1];
    return { level, items, index, item: items[index] };
}

/** The item path of a row or a group, found by the row itself, or null when the grid does not show it. */
export function itemPathOf(root: GroupRow, row: Row, at: ItemPath = []): ItemPath | null
{
    const items = levelOf(root);
    for (let i = 0; i < items.length; i += 1)
    {
        const here = [...at, i];
        if (items[i].row === row) { return here; }
        const inner = items[i].row;
        const found = (inner.kind === "group") ? itemPathOf(inner, row, here) : null;
        if (found) { return found; }
    }
    return null;
}

/** How many bracket columns a group's grid needs: one for its level, and one for each level of groups in it. */
export function levelDepth(group: GroupRow): number
{
    const inner = levelOf(group).map((it) => (it.row.kind === "group" ? levelDepth(it.row) : 0));
    return 1 + Math.max(0, ...inner);
}

/** An item path from its text in the page, such as "2.0". */
export function parseItemPath(text: string): ItemPath
{
    return (text === "") ? [] : text.split(".").map(Number);
}
```

- [ ] **Step 4: Run the tests and see them pass.** `npx vitest run components/expressionbuilder` passes, the old tests too.

- [ ] **Step 5: Commit:** `feat(expressionbuilder): a level view of the tree for the grid (#N)`.

---

### Task 3: Edits on levels (spec 4.5, 5.2, 5.3, 5.4)

**Files:** Modify `expressionbuilder.ts`, after Task 2's section. Test: `describe("level edits")`.

**Interfaces.** Consumes Task 2. Produces:

```ts
export function setJoin(root: GroupRow, path: ItemPath, join: Join): void;
export function setGroupJoins(root: GroupRow, path: ItemPath, join: Join): void;
export function groupItems(root: GroupRow, level: ItemPath, start: number, end: number): ItemPath;
export function ungroupItem(root: GroupRow, path: ItemPath): boolean;
export function insertItem(root: GroupRow, at: Place, row: Row): ItemPath;
export function removeItems(root: GroupRow, rows: Row[]): void;
export function refuses(root: GroupRow, level: ItemPath, start: number, end: number, to: Place): boolean;
export function moveItems(root: GroupRow, level: ItemPath, start: number, end: number, to: Place): ItemPath | null;
export function moveTarget(root: GroupRow, level: ItemPath, start: number, end: number, by: -1 | 1): Place | null;
```

- [ ] **Step 1: Write the failing tests.** They use Task 2's `show`, `t`, `and`, `or`, `not`.

```ts
describe("level edits", () =>
{
    test("setJoin changes one item's join", () =>
    {
        const root = and(t("a"), t("b"), t("c"));
        setJoin(root, [2], "or");

        expect(show(root)).toBe("a and b or c");
    });

    test("setGroupJoins sets every join inside but the first, and the group stays", () =>
    {
        const root = and(t("a"), or(t("b"), t("c")));
        setGroupJoins(root, [1], "and");
        expect(show(root)).toBe("a and [b and c]");

        // A row's join inside a group keeps the group too.
        const inner = and(t("a"), or(t("b"), t("c")));
        setJoin(inner, [1, 1], "and");
        expect(show(inner)).toBe("a and [b and c]");
    });

    test("groupItems makes a marked group that takes the first item's join, and changes no meaning", () =>
    {
        const root = or(t("a"), t("b"), t("c"));
        const before = meaning(nodeOf(root, NONE)!);

        expect(groupItems(root, [], 1, 2)).toEqual([1]);
        expect(show(root)).toBe("a or [b or c]");
        expect(meaning(nodeOf(root, NONE)!)).toEqual(before);
    });

    test("ungroupItem puts the items back, its join on the first, and refuses a group with not", () =>
    {
        const root = and(t("a"), or(t("b"), t("c")));
        expect(ungroupItem(root, [1])).toBe(true);
        expect(show(root)).toBe("a and b or c");

        const negated = and(t("a"), not(or(t("b"), t("c"))));
        expect(ungroupItem(negated, [1])).toBe(false);
        expect(show(negated)).toBe("a and not [b or c]");
    });

    test("insertItem joins with and, and above the first item gives the old first and", () =>
    {
        const root = or(t("a"), t("b"));
        insertItem(root, { level: [], index: 2 }, t("c"));
        expect(show(root)).toBe("a or b and c");

        insertItem(root, { level: [], index: 0 }, t("z"));
        expect(show(root)).toBe("z and a or b and c");
    });

    test("removeItems takes a group with its rows, and tidies the level it leaves", () =>
    {
        const root = and(t("a"), or(t("b"), t("c")));
        removeItems(root, [(levelAt(root, [1]).children[0])]);
        // A group left with one item and no not is ungrouped.
        expect(show(root)).toBe("a and c");

        const negated = and(t("a"), not(or(t("b"), t("c"))));
        removeItems(negated, [levelAt(negated, [1]).children[0]]);
        expect(show(negated)).toBe("a and not [c]");

        const first = or(t("a"), and(t("b"), t("c")));
        removeItems(first, [first.children[0]]);
        expect(show(first)).toBe("b and c");
    });

    describe("moveItems (spec 4.5)", () =>
    {
        test("within a level each keeps its join, and a new first gives its join to the old first", () =>
        {
            const up = or(t("a"), t("b"));
            expect(moveItems(up, [], 1, 1, { level: [], index: 0 })).toEqual([0]);
            expect(show(up)).toBe("b or a");

            const down = or(t("a"), t("b"));
            moveItems(down, [], 0, 0, { level: [], index: 2 });
            expect(show(down)).toBe("b or a");
        });

        test("into another level, before an item or at its end, it takes that join", () =>
        {
            const end = and(t("a"), or(t("b"), t("c")), t("d"));
            expect(moveItems(end, [], 2, 2, { level: [1], index: 2 })).toEqual([1, 2]);
            expect(show(end)).toBe("a and [b or c or d]");

            const before = and(t("a"), or(t("b"), t("c")), t("d"));
            moveItems(before, [], 2, 2, { level: [1], index: 1 });
            expect(show(before)).toBe("a and [b or d or c]");
        });

        test("first in another level it shows no join, and the old first takes the join after it", () =>
        {
            const root = and(t("a"), or(t("b"), t("c")), t("d"));
            // The group is item 1 as the level stands before the move.
            moveItems(root, [], 0, 0, { level: [1], index: 0 });

            expect(show(root)).toBe("[a or b or c] and d");
        });

        test("out of a group, and the group it leaves with one item is ungrouped", () =>
        {
            const root = and(t("a"), or(t("b"), t("c")));
            moveItems(root, [1], 0, 0, { level: [], index: 1 });

            expect(show(root)).toBe("a and b and c");
        });

        test("a moved group keeps its bracket where it would read the same as its new level", () =>
        {
            const root = and(t("a"), or(t("b"), t("c")), or(t("d"), t("e")));
            moveItems(root, [], 1, 1, { level: [1], index: 2 });

            expect(show(root)).toBe("a and [d or e or [b or c]]");
        });

        test("several items move together, the first by 4.5 and the rest keep their joins", () =>
        {
            const root = and(t("a"), t("b"), t("c"), or(t("x"), t("y")));
            moveItems(root, [], 1, 2, { level: [1], index: 0 });

            expect(show(root)).toBe("a and [b and c or x or y]");
        });

        test("refuses a group into itself, and a place beside the items, and changes nothing", () =>
        {
            const root = and(t("a"), or(t("b"), t("c")));

            expect(refuses(root, [], 1, 1, { level: [1], index: 0 })).toBe(true);
            expect(moveItems(root, [], 1, 1, { level: [1], index: 0 })).toBeNull();
            expect(refuses(root, [], 0, 0, { level: [], index: 1 })).toBe(true);
            expect(show(root)).toBe("a and [b or c]");
        });
    });

    test("moveTarget goes one place, into a group beside it, and out at a group's edge", () =>
    {
        const root = and(t("a"), or(t("b"), t("c")), t("d"));

        expect(moveTarget(root, [], 2, 2, -1)).toEqual({ level: [1], index: 2 });
        expect(moveTarget(root, [], 0, 0, 1)).toEqual({ level: [1], index: 0 });
        expect(moveTarget(root, [1], 0, 0, -1)).toEqual({ level: [], index: 1 });
        expect(moveTarget(root, [1], 1, 1, 1)).toEqual({ level: [], index: 2 });
        expect(moveTarget(root, [], 0, 0, -1)).toBeNull();
        expect(moveTarget(root, [], 2, 2, 1)).toBeNull();
        expect(moveTarget(and(t("a"), t("b")), [], 0, 0, 1)).toEqual({ level: [], index: 2 });
    });
});
```

- [ ] **Step 2: Run them and see them fail.**

- [ ] **Step 3: Write the code.** Every edit writes a level through `edited`, so each group a person changes keeps its bracket (spec 4.3, as Task 1 amends it).

```ts
/** Writes a level a person changed. A group, not the root, takes the mark, so it stays a group (spec 4.3). */
function edited(root: GroupRow, group: GroupRow, items: Item[]): void
{
    if (group !== root) { group.bracket = true; }
    setLevel(group, items);
}

/** Changes one item's join. */
export function setJoin(root: GroupRow, path: ItemPath, join: Join): void
{
    const { level, items, index } = itemAt(root, path);
    items[index].join = join;
    edited(root, level, items);
}

/** Sets the join of every item inside a group but its first. */
export function setGroupJoins(root: GroupRow, path: ItemPath, join: Join): void
{
    const group = itemAt(root, path).item.row as GroupRow;
    const inner = levelOf(group);
    inner.forEach((it, i) => { if (i > 0) { it.join = join; } });
    edited(root, group, inner);
}

/** Puts items next to each other in a marked group, which takes the first one's join. Returns its path. */
export function groupItems(root: GroupRow, level: ItemPath, start: number, end: number): ItemPath
{
    const parent = levelAt(root, level);
    const items = levelOf(parent);
    const inner = items.slice(start, end + 1);
    const group: GroupRow = { kind: "group", op: "and", nots: 0, children: [], bracket: true,
        ...(parent.linkOf ? { linkOf: parent.linkOf } : {}) };
    setLevel(group, inner);
    items.splice(start, inner.length, { row: group, join: inner[0].join });
    edited(root, parent, items);
    return itemPathOf(root, group)!;
}

/** Puts a group's items in its place, its join on the first. A group with `not` keeps it, so this refuses one. */
export function ungroupItem(root: GroupRow, path: ItemPath): boolean
{
    const { level, items, index, item } = itemAt(root, path);
    if (item.row.kind !== "group" || item.row.nots > 0) { return false; }

    const inner = levelOf(item.row);
    if (inner.length > 0) { inner[0].join = item.join; }
    items.splice(index, 1, ...inner);
    edited(root, level, items);
    return true;
}

/** Adds a row at a place, joined with `and`. Above the first item, the old first takes the `and`. */
export function insertItem(root: GroupRow, at: Place, row: Row): ItemPath
{
    const level = levelAt(root, at.level);
    const items = levelOf(level);
    if (at.index === 0 && items.length > 0) { items[0].join = "and"; }
    items.splice(at.index, 0, { row, join: "and" });
    edited(root, level, items);
    return itemPathOf(root, row)!;
}

/**
 * After a move or a remove: a group left with no items goes, and one left with one item and no `not` is
 * ungrouped, because a bracket around one row means nothing. Its parent is then tidied the same way.
 */
function tidy(root: GroupRow, group: GroupRow): void
{
    if (group === root) { return; }
    const path = itemPathOf(root, group)!;
    const { level, items, index } = itemAt(root, path);
    const inner = levelOf(group);

    if (inner.length === 0) { items.splice(index, 1); }
    else if (inner.length === 1 && group.nots === 0) { items[index] = { row: inner[0].row, join: items[index].join }; }
    else { return; }
    edited(root, level, items);
    tidy(root, level);
}

/** Removes rows and groups, a group with its rows, and tidies each level they leave. */
export function removeItems(root: GroupRow, rows: Row[]): void
{
    const left = new Set<GroupRow>();
    for (const row of rows)
    {
        // A row inside a group removed before it went with that group.
        const path = itemPathOf(root, row);
        if (!path) { continue; }
        const { level, items, index } = itemAt(root, path);
        items.splice(index, 1);
        edited(root, level, items);
        left.add(level);
    }
    // A level that a later remove took with its group needs no tidy.
    left.forEach((g) => { if (g === root || itemPathOf(root, g)) { tidy(root, g); } });
}

/** Whether a move cannot go to a place: into itself or a group inside it, across a link's edge, or nowhere. */
export function refuses(root: GroupRow, level: ItemPath, start: number, end: number, to: Place): boolean
{
    const from = levelAt(root, level);
    const into = levelAt(root, to.level);
    const moved = levelOf(from).slice(start, end + 1);
    const inside = moved.some((m) => m.row.kind === "group" && Array.from(allRows(m.row)).some((r) => r.row === into));

    return inside || (from.linkOf ?? "") !== (into.linkOf ?? "")
        || (from === into && to.index >= start && to.index <= end + 1);
}

/**
 * Moves items next to each other in a level to a place, by spec 4.5, and returns the first one's new path, or
 * null when the move is refused. `to.index` is the place in its level as it stands before the move.
 */
export function moveItems(root: GroupRow, level: ItemPath, start: number, end: number, to: Place): ItemPath | null
{
    if (refuses(root, level, start, end, to)) { return null; }

    const from = levelAt(root, level);
    const into = levelAt(root, to.level);
    const items = levelOf(from);
    const moved = items.slice(start, end + 1);
    const rest = items.filter((_it, i) => i < start || i > end);
    // The groups a person sees stay groups, so the indices of `to` hold while the items move (spec 4.3).
    for (const g of [from, into, ...moved.map((m) => m.row)])
    {
        if (g.kind === "group" && g !== root) { g.bracket = true; }
    }

    if (from === into)
    {
        const before = items[to.index];
        rest.splice(before ? rest.indexOf(before) : rest.length, 0, ...moved);
        if (rest[0] !== items[0])
        {
            items[0].join = rest[0].join;
            rest[0].join = "and";
        }
        edited(root, from, rest);
        return itemPathOf(root, moved[0].row);
    }

    edited(root, from, rest);
    const target = levelOf(into);
    if (to.index === 0)
    {
        if (target.length > 0) { target[0].join = target[1]?.join ?? "and"; }
        moved[0].join = "and";
    }
    else { moved[0].join = (target[to.index] ?? target[target.length - 1]).join; }
    target.splice(to.index, 0, ...moved);
    edited(root, into, target);
    tidy(root, from);
    return itemPathOf(root, moved[0].row);
}

/**
 * Where Move up or Move down takes items, one place in the grid (spec 5.3): past the item beside them, into a
 * group beside them, or out at a group's edge. Null at the top or the bottom of the grid.
 */
export function moveTarget(root: GroupRow, level: ItemPath, start: number, end: number, by: -1 | 1): Place | null
{
    const items = levelOf(levelAt(root, level));
    const next = (by < 0) ? start - 1 : end + 1;
    const beside = items[next];
    if (beside && beside.row.kind === "group")
    {
        return { level: [...level, next], index: (by < 0) ? levelOf(beside.row).length : 0 };
    }
    if (beside) { return { level, index: (by < 0) ? next : next + 1 }; }
    if (level.length === 0) { return null; }

    const out = level[level.length - 1];
    return { level: level.slice(0, -1), index: (by < 0) ? out : out + 1 };
}
```

- [ ] **Step 4: Run the tests and see them pass.**

- [ ] **Step 5: Commit:** `feat(expressionbuilder): grid edits on levels: join, group, ungroup, insert, remove and move (#N)`.

---

### Task 4: Draw the grid (spec 5, 5.1, 5.2, 5.4, 5.5, 7.3, 8)

This task replaces the class's drawing. The toolbar, the keys and the drag come in Tasks 5 to 7, so this task leaves the old drag code out and puts the recognizer's callbacks in Task 7.

**Files:** Modify `expressionbuilder.ts`, the class from `render` (line 1172) to `rowTools` and `// ── Actions ──` (line 1680). Test: rewrite `describe("ExpressionBuilder")` (line 284) and `describe("ExpressionBuilder, part 2")` (line 737).

**What goes.** `renderRow`, `renderGroup`, `sameAs`, `renderCompare`, `rowTools`, `add`, `move`, `wrap`, `unwrap`, the old `remove`, `rowEl`, `dragFrom` and `dropAt`. Part 2 brings back the editors for a search inside, a link, "the same item as" and a comparison, against the grid. Git keeps the old code.

**What stays.** `renderFilter`'s key, operator and value parts, `draftReason`, `valueInput`, `suggestValues`, `renderText`, `select`, `button`, `dragHandle`, `notToggle`, `announce`, `changed`, the problem code, and the public API.

**The DOM.**

```
div.expressionbuilder
  div.expressionbuilder-message
  div.expressionbuilder-body
    div.expressionbuilder-grid  (style --eb-depth: levelDepth(root))
      ol.expressionbuilder-level[data-level=""]
        li.expressionbuilder-item[aria-label="Row 1: Type is Bug"]
          div.expressionbuilder-line.expressionbuilder-line-filter[data-item="0"]
            span.expressionbuilder-drag
            label.expressionbuilder-check > input[type=checkbox][data-role=check]
            span.expressionbuilder-bracket[data-depth=0..depth-1]   (one per column)
            span.expressionbuilder-join > select[data-role=join] + button[data-role=not]
            span.expressionbuilder-key | -op | -value   (or span.expressionbuilder-readonly across the three)
            span.expressionbuilder-actions > button[data-role=remove] + button[data-role=more]
        li.expressionbuilder-item  (a group)
          div.expressionbuilder-line.expressionbuilder-line-group[data-item="2"]
            … drag, check, brackets, join and Not …
            span.expressionbuilder-group-control > select[data-role=group-op] + button[data-role=ungroup]
            span.expressionbuilder-actions
          ol.expressionbuilder-level[data-level="2"][aria-label="Group of 2 rows, joined with or"]
    div.expressionbuilder-footer
      button[data-role=add-filter] button[data-role=add-text]
      span.expressionbuilder-toolbar  (Task 5)
  div[role=status]
```

**Bracket cells.** Column `j` belongs to level depth `j`. For a line at item path `p` of depth `d = p.length - 1`:

- For `1 ≤ j ≤ d`, the line is inside the group whose level is depth `j`, so the cell is `-bracket-solid`. It is also `-bracket-end` when the line is a row, not a group line, and `p[k]` is the last index of its level for every `k ≥ j`.
- A group line adds `-bracket-solid` and `-bracket-start` to column `d + 1`.
- For `j ≤ d`, when the item `p[0..j]` is in a run of two or more in a level with two or more runs, the cell is also `-run`. On the item's own line (`j === d`) and the run's first item, it is `-run-start` and holds the **Make a group** button (`data-role=make-group`). It is `-run-end` on the run's last item's last line.

The class passes a line context down as it draws, so each line knows these facts without a search:

```ts
/** What a line needs to know about the levels it is in, from the top. */
interface LineContext
{
    path: ItemPath;
    /** For each depth, whether the item there is the last of its level. */
    ends: boolean[];
    /** For each depth, the run of two or more the item there is in, or null. */
    runs: Array<Run | null>;
}
```

**Row numbers and labels.** Lines are numbered from 1 in the order drawn, group lines too. A line's `li` has `aria-label` such as `"Row 3: or not, Assigned to is me"`. A row in a run, not its first, adds `", read together with row N"`. A group's `ol` has `aria-label` such as `"Group of 2 rows, joined with or"`, from its inner joins, or `"…, joined with and and or"` when they differ.

**Read-only rows (spec 5.5).** A read-only row keeps the three columns, with text in place of controls:

| Row | Key | Operator | Value |
| :--- | :--- | :--- | :--- |
| "has one where" | the facet's label | has one where | a search inside |
| a link condition | the facet's label | the operator's label | the values, then "with conditions on its link" |
| "the same item as" | the facet's label | is | the same item as ?name |
| a comparison | ?left | the comparison's label | ?right |
| a kept row | its `what` across the three columns | | |

After the value, each adds "Edit this in the search bar." The line's label, and the title of the value cell, say why the row is read-only, from this helper beside the model:

```ts
/** Why the grid shows a row read-only in part 1, or null when it edits it (spec 5.5). */
export function readOnlyWhy(row: Row, facets: Facets): string | null
{
    if (row.kind === "kept") { return row.what; }
    if (row.kind === "compare") { return "A comparison of two items"; }
    if (row.kind !== "filter") { return null; }
    const label = facets.get(row.key.toLowerCase())?.label ?? row.key;
    if (row.op === "where") { return label + " has one where"; }
    if (row.link) { return label + " with conditions on its link"; }
    if (row.variable !== undefined) { return label + " is the same item as another row"; }
    return null;
}
```

The operator select offers `facetOps(facet)` only, without `"where"`, plus the row's own operator when the facet does not list it, as today.

**Identity, not paths.** The class keeps two maps that each render rebuilds, so focus and problems find a row wherever an edit put it:

```ts
    /** Each line drawn, by its row, and back. Rebuilt by each render. */
    private readonly lineOf = new Map<Row, HTMLElement>();
    private readonly rowOfLine = new Map<HTMLElement, Row>();
    /** The checked rows and groups. A tree that means the same keeps them (spec section 8). */
    private readonly checked = new Set<Row>();
```

`render()` deletes from `checked` each row that has no line. `setParsed` with another tree clears `checked`, since `this.root` is replaced.

**Focus.** `edit()` takes a target found by identity:

```ts
/** Where the focus goes after an edit: a toolbar button while it is on, else a control on a row's line. */
type Focus = { row?: Row; role?: string; tool?: string };
```

With no target, it keeps the focus on the same control of the same row, read from `rowOfLine` before the render. A role that is gone or off falls to that row's check box, as `focusRow` does today with its first control. With no row, the focus goes to **Add condition**.

**Problems.** `Placed.path: Step[] | null` becomes `Placed.row: Row | null`. `rowFor` keeps its walk, but takes the last row whose span holds the problem and that `lineOf` has. `renderProblems` puts the line under `lineOf.get(row)`.

**Edits through one door.** Each control calls one method, which logs the edit at debug level with its kind and the item's path, then announces and redraws:

```ts
    /** Makes one edit, logs it, announces it, and redraws with the focus where it says. */
    private act(kind: string, path: ItemPath, change: () => Focus | void, message?: string): void
    {
        logDebug("Edit:", kind, "at", path.join("."));
        const focus = change();
        if (message) { this.announce(message); }
        this.edit(focus ?? undefined);
    }
```

The join select calls `setJoin`. **Not** keeps its rule and adds `if (row.kind === "group") { row.bracket = true; }`. The group control's select calls `setGroupJoins`. It lists **Mixed** as a disabled option only while the joins inside differ. **Ungroup** calls `ungroupItem` and focuses the first item the group held. It is off for a group with `not`, with the title "A group with Not cannot be ungrouped, because that would change what it means". **Make a group** calls `groupItems` on the run and focuses the new group's check box. **✕** calls `removeItems` and focuses the next line's row, or the line before, or **Add condition** (spec 6). **Add condition** and **Add words** call `insertItem` at the end of the top level with a draft, and focus its key select or its words.

**The ⋯ menu.** A button with `aria-haspopup="menu"` and `aria-expanded`. It opens a `div[role=menu]` in the actions cell, with `button[role=menuitem]` items: **Insert condition above** (`insert-filter`), **Insert words above** (`insert-text`), **Move up** (`up`) and **Move down** (`down`). Move up and Move down are off where `moveTarget` gives null. Opening focuses the first item. `↑` and `↓` move between items. Choosing one, Escape, or a `pointerdown` outside the menu closes it. Escape and a choice return the focus to ⋯. The class keeps the open menu in `private menu: { el: HTMLElement; button: HTMLElement; off: () => void } | null`. `off` removes the document's `pointerdown` listener. `render()` and `destroy()` close the menu first.

- [ ] **Step 1: Write the failing tests.** Replace the helpers at the top of `describe("ExpressionBuilder")`:

```ts
    const line = (item: string): HTMLElement => container.querySelector(`[data-item="${item}"]`)!;
    const control = (item: string, role: string): HTMLInputElement =>
        line(item).querySelector<HTMLInputElement>(`[data-role="${role}"]`)!;
    const tool = (role: string): HTMLButtonElement =>
        container.querySelector<HTMLButtonElement>(`.expressionbuilder-footer [data-role="${role}"]`)!;
    const words = (): string[] => Array.from(container.querySelectorAll<HTMLInputElement>("[data-role=phrase]"))
        .map((i) => i.value);
    const textTree = (root: QueryNode): QueryTree => ({ root });
    const tx = (phrase: string): QueryNode => ({ kind: "text", phrase });
```

Keep these tests, with `row(…)` read as `line(…)`, and `control("", "add-filter")` read as `tool("add-filter")`: the GestureRecognizer requirement, the refusals, "draws a row for each node", the draft, the echo from the bar, another tree from the bar, the three problem tests, an edit drops the problems, Not, disable and enable, and destroy. Replace "a group joins its rows", "removing a row" and "a kept part" with these, and add the rest:

```ts
    test("each line has a join but the first, and the dashed run shows what the precedence reads", () =>
    {
        make(textTree({ kind: "or", children: [{ kind: "and", children: [tx("a"), tx("b")] }, tx("c")] }));

        expect(control("0", "join")).toBeNull();
        expect(control("1", "join").value).toBe("and");
        expect(control("2", "join").value).toBe("or");
        expect(line("0").querySelector(".expressionbuilder-run-start [data-role=make-group]")).not.toBeNull();
        expect(line("1").querySelector(".expressionbuilder-run-end")).not.toBeNull();
        expect(line("2").querySelector(".expressionbuilder-run")).toBeNull();
        expect(line("1").closest("li")!.getAttribute("aria-label")).toBe("Row 2: and, has the words b, "
            + "read together with row 1");
    });

    test("a join changes what the query means, and reports it", () =>
    {
        const { onChange } = make(textTree({ kind: "and", children: [tx("a"), tx("b"), tx("c")] }));

        choose(control("2", "join"), "or");

        expect(meaning(onChange.mock.calls[0][0].root)).toEqual(meaning({ kind: "or", children: [
            { kind: "and", children: [tx("a"), tx("b")] }, tx("c")] }));
        expect(document.activeElement).toBe(control("2", "join"));
    });

    test("a group draws a solid bracket and its control, and Mixed shows while its joins differ", () =>
    {
        make(textTree({ kind: "and", children: [tx("a"), { kind: "or", children: [tx("b"), tx("c"), tx("e")] }] }));

        expect(line("1").classList.contains("expressionbuilder-line-group")).toBe(true);
        expect(control("1", "group-op").value).toBe("or");
        expect(line("1.2").querySelector(".expressionbuilder-bracket-end")).not.toBeNull();
        expect(container.querySelector('[data-level="1"]')!.getAttribute("aria-label"))
            .toBe("Group of 3 rows, joined with or");

        choose(control("1.1", "join"), "and");
        expect(control("1", "group-op").value).toBe("mixed");
        expect(control("1", "group-op").querySelector<HTMLOptionElement>('[value="mixed"]')!.disabled).toBe(true);
    });

    test("Ungroup puts the rows back, and is off for a group with Not, saying why", () =>
    {
        const { eb } = make(textTree({ kind: "and", children: [tx("a"), { kind: "or", children: [tx("b"), tx("c")] },
            { kind: "not", child: { kind: "or", children: [tx("d"), tx("e")] } }] }));

        expect(control("2", "ungroup").disabled).toBe(true);
        expect(control("2", "ungroup").title).toMatch(/would change what it means/);

        control("1", "ungroup").click();
        expect(words()).toEqual(["a", "b", "c", "d", "e"]);
        expect(document.activeElement).toBe(control("1", "check"));
        // a and b or c and not (d or e): the precedence reads it as (a and b) or (c and not (d or e)).
        expect(meaning(eb.getTree().root)).toEqual(meaning({ kind: "or", children: [
            { kind: "and", children: [tx("a"), tx("b")] },
            { kind: "and", children: [tx("c"), { kind: "not", child: { kind: "or", children: [tx("d"), tx("e")] } }] },
        ] }));
    });

    test("Make a group turns a dashed run solid, and the query means the same", () =>
    {
        const { onChange } = make(textTree({ kind: "or", children: [tx("a"), { kind: "and", children: [tx("b"),
            tx("c")] }] }));

        line("1").querySelector<HTMLButtonElement>("[data-role=make-group]")!.click();

        expect(line("1").classList.contains("expressionbuilder-line-group")).toBe(true);
        expect(document.activeElement).toBe(control("1", "check"));
        expect(onChange).not.toHaveBeenCalled();
    });

    test("Add condition adds a draft at the end with And, and Insert above adds one at that row", () =>
    {
        make(textTree({ kind: "or", children: [tx("a"), tx("b")] }));

        tool("add-filter").click();
        expect(control("2", "join").value).toBe("and");
        expect(document.activeElement).toBe(control("2", "key"));

        control("1", "more").click();
        container.querySelector<HTMLButtonElement>('[role=menu] [data-role="insert-text"]')!.click();
        expect(words()).toEqual(["a", "", "b"]);
        expect(document.activeElement).toBe(control("1", "phrase"));
    });

    test("the ⋯ menu opens on its first item, closes on Escape back to ⋯, and stops that Escape", () =>
    {
        make(textTree({ kind: "and", children: [tx("a"), tx("b")] }));
        const outside = vi.fn();
        document.addEventListener("keydown", outside);

        control("0", "more").click();
        const menu = container.querySelector<HTMLElement>("[role=menu]")!;
        expect(document.activeElement).toBe(menu.querySelector("[role=menuitem]"));
        expect(menu.querySelector<HTMLButtonElement>('[data-role="up"]')!.disabled).toBe(true);

        document.activeElement!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        expect(container.querySelector("[role=menu]")).toBeNull();
        expect(document.activeElement).toBe(control("0", "more"));
        expect(outside).not.toHaveBeenCalled();

        // With nothing open, Escape reaches the dialog the builder sits in.
        control("0", "more").dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        expect(outside).toHaveBeenCalledTimes(1);
        document.removeEventListener("keydown", outside);
    });

    test("✕ removes the row, and the focus goes to the next line, or Add condition when none is left", () =>
    {
        const { eb } = make(APPS_TREE);

        control("0", "remove").click();
        expect(eb.getTree()).toEqual({ root: f("created_at", "On", { date: "2026-11-15", zone: "Asia/Kolkata" }) });
        expect(document.activeElement).toBe(control("0", "check"));

        control("0", "remove").click();
        expect(document.activeElement).toBe(tool("add-filter"));
    });

    test("a row the grid cannot edit yet is read-only, says why, and still moves, checks and goes", () =>
    {
        const nested: QueryNode = { kind: "nested", key: "rel.parent_of", where: f("type", "Equals", { text: "x" }) };
        make({ root: { kind: "and", children: [f("title", "Contains", { text: "a" }), nested] } });

        expect(line("1").textContent)
            .toContain("A search inside rel.parent_of, which is not a relationship key. Edit this in the search bar.");
        expect(line("1").querySelector("[data-role=key], [data-role=op]")).toBeNull();
        expect(control("1", "check")).not.toBeNull();
    });
```

In `describe("ExpressionBuilder, part 2")` (line 737 on), change `row` and `control` to read `data-item` as above. Delete the four tests that edit a search inside, a link, "the same item as" or a comparison (lines 768, 791, 813 and 836), and the span test at line 878, which builds a draft with a link. Part 2 brings them back. Change the other two, and add one:

```ts
    test("in part 1, a search inside, a link, the same item as, and a comparison are read-only", () =>
    {
        make(EXAMPLES[3][1]);

        expect(line("1").querySelector(".expressionbuilder-op")!.textContent).toBe("has one where");
        expect(line("1").querySelector(".expressionbuilder-value")!.textContent)
            .toBe("a search inside. Edit this in the search bar.");
        expect(line("0").querySelector(".expressionbuilder-value")!.textContent)
            .toBe("the same item as ?org. Edit this in the search bar.");
        expect(line("0").closest("li")!.getAttribute("aria-label")).toContain("is the same item as another row");
        expect(container.querySelector('[data-role=op] option[value="where"]')).toBeNull();
        expect(container.querySelector("[data-role=add-link], [data-role=same], [data-role=add-compare]")).toBeNull();
    });

    // The test at line 853 keeps its tree and its two warnings. Its three expects become these two, because the
    // grid shows no line inside the search inside or the link in part 1.
        expect(line("1").classList.contains("expressionbuilder-has-warning")).toBe(true);
        expect(line("1").querySelectorAll(".expressionbuilder-problem")).toHaveLength(2);

    // The test at line 918 focuses the read-only row's check box, since the row has no operator select.
        const box = control("1", "check");
        box.focus();
        …its setParsed call, unchanged…
        expect(control("1", "check")).toBe(box);
        expect(document.activeElement).toBe(box);
```

- [ ] **Step 2: Run them and see them fail.**

- [ ] **Step 3: Write the code** as the sections above describe. The draw methods are `render`, `renderLevel(group, ctx)`, `renderLine(item, ctx, first)`, `brackets(ctx, isGroup)`, `joinCell`, `groupControl`, `cells`, `actions`, `openMenu` and `closeMenu`, and `renderFooter`.

- [ ] **Step 4: Run the tests and see them pass.** Then `npx tsc --noEmit -p tsconfig.json` shows no error.

- [ ] **Step 5: Commit:** `feat(expressionbuilder): draw the query as a grid of rows (#N)`.

---

### Task 5: The toolbar and the checked items (spec 5.3)

**Files:** Modify `expressionbuilder.ts`. Test: `describe("ExpressionBuilder, the toolbar")`.

**Interfaces.** Consumes Task 3's `groupItems`, `ungroupItem`, `moveItems`, `moveTarget` and `removeItems`. Produces, for Tasks 6 and 7:

```ts
    /** The checked items, in the order drawn, and the run they make when they sit next to each other in a level. */
    private selection(): { rows: Row[]; run: { level: ItemPath; start: number; end: number } | null }
    /** Moves a run of items one place by Move up or Move down, and announces the row number they land on. */
    private moveRun(run: { level: ItemPath; start: number; end: number }, by: -1 | 1, focus: Focus): void
    private groupRun(run: { level: ItemPath; start: number; end: number }): void
    private ungroup(path: ItemPath): void
    private updateToolbar(): void
```

**Rules.** `updateToolbar()` runs after each render and after each check box change, without a redraw.

| Button | `data-role` | On when | Title when off |
| :--- | :--- | :--- | :--- |
| Group | `tool-group` | `run` has two or more items | "Check two or more rows next to each other to group them" |
| Ungroup | `tool-ungroup` | one checked item, a group with no `not` | "Check one group to ungroup it", or the `not` title of Task 4 |
| Move up | `tool-up` | `run` is set and `moveTarget(…, -1)` is not null | "Check rows next to each other to move them", or "The rows are at the top" |
| Move down | `tool-down` | the same with `+1` | the same, or "The rows are at the bottom" |
| Remove | `tool-remove` | one or more checked | "Check the rows to remove" |

A button that is on has the title of its action and key, such as "Group (Alt+G)", from the bindings in force. After **Group**, the rows it took leave `checked` and the new group joins it. A moved item is announced as "Moved to row N", from the line number of its first item after the redraw. After a toolbar Move, the focus stays on the button while it is on, else it goes to the first moved item's check box. After Group, it goes to the new group's check box. Remove focuses as ✕ does.

- [ ] **Step 1: Write the failing tests.**

```ts
describe("ExpressionBuilder, the toolbar", () =>
{
    let container: HTMLElement;
    beforeEach(() =>
    {
        vi.useFakeTimers();
        container = document.createElement("div");
        container.id = "eb";
        document.body.appendChild(container);
    });
    afterEach(() => { container.remove(); vi.useRealTimers(); });

    const tx = (phrase: string): QueryNode => ({ kind: "text", phrase });
    const make = (root: QueryNode) => createExpressionBuilder("eb", { facets: FACETS, tree: { root } });
    const check = (item: string): void =>
        container.querySelector<HTMLInputElement>(`[data-item="${item}"] [data-role=check]`)!.click();
    const tool = (role: string): HTMLButtonElement =>
        container.querySelector<HTMLButtonElement>(`.expressionbuilder-footer [data-role="${role}"]`)!;
    const words = (): string[] => Array.from(container.querySelectorAll<HTMLInputElement>("[data-role=phrase]"))
        .map((i) => i.value);

    test("every button is off with nothing checked, and its title says why", () =>
    {
        make({ kind: "and", children: [tx("a"), tx("b")] });

        expect(["tool-group", "tool-ungroup", "tool-up", "tool-down", "tool-remove"].map((r) => tool(r).disabled))
            .toEqual([true, true, true, true, true]);
        expect(tool("tool-group").title).toBe("Check two or more rows next to each other to group them");
    });

    test("Group wraps rows next to each other, and is off for rows apart", () =>
    {
        const eb = make({ kind: "or", children: [tx("a"), tx("b"), tx("c")] });
        check("0");
        check("2");
        expect(tool("tool-group").disabled).toBe(true);

        check("2");
        check("1");
        expect(tool("tool-group").title).toBe("Group (Alt+G)");
        tool("tool-group").click();

        expect(container.querySelector('[data-item="0"]')!.classList.contains("expressionbuilder-line-group"))
            .toBe(true);
        expect(document.activeElement).toBe(container.querySelector('[data-item="0"] [data-role=check]'));
        // The group is checked in place of its rows, so Ungroup acts on it.
        expect(container.querySelector<HTMLInputElement>('[data-item="0"] [data-role=check]')!.checked).toBe(true);
        expect(container.querySelector<HTMLInputElement>('[data-item="0.0"] [data-role=check]')!.checked).toBe(false);
        expect(tool("tool-ungroup").disabled).toBe(false);
        expect(meaning(eb.getTree().root)).toEqual(meaning({ kind: "or", children: [tx("a"), tx("b"), tx("c")] }));
    });

    test("Move up goes past a row, into a group above, and out at a group's top", () =>
    {
        make({ kind: "and", children: [tx("a"), { kind: "or", children: [tx("b"), tx("c")] }, tx("d")] });

        check("2");
        tool("tool-up").click();
        expect(words()).toEqual(["a", "b", "c", "d"]);
        expect(container.querySelector('[data-item="1.2"] [data-role=check]')).not.toBeNull();
        vi.advanceTimersByTime(20);
        expect(container.querySelector("[role=status]")!.textContent).toBe("Moved to row 5");
    });

    test("the checked state stays when the same query comes back from the bar", () =>
    {
        const eb = make({ kind: "and", children: [tx("a"), tx("b")] });
        check("1");

        eb.setParsed({ tree: { root: { kind: "and", children: [tx("a"), tx("b")] } } });
        expect(container.querySelector<HTMLInputElement>('[data-item="1"] [data-role=check]')!.checked).toBe(true);
    });

    test("Remove takes every checked item, a group with its rows", () =>
    {
        const eb = make({ kind: "and", children: [tx("a"), { kind: "or", children: [tx("b"), tx("c")] }, tx("d")] });
        check("1");
        check("1.0");
        check("2");

        tool("tool-remove").click();
        expect(eb.getTree()).toEqual({ root: tx("a") });
    });
});
```

- [ ] **Step 2: Run them and see them fail.**

- [ ] **Step 3: Write the code.** `selection()` walks `rowOfLine` in the order drawn and reads each checked line's `data-item`. The run is set when every path has the same level and their indices follow one another. The check box's `change` handler adds the row to `checked` or deletes it, then calls `updateToolbar()`.

- [ ] **Step 4: Run the tests and see them pass.**

- [ ] **Step 5: Commit:** `feat(expressionbuilder): check rows, and group, ungroup, move and remove them from a toolbar (#N)`.

---

### Task 6: The keyboard (spec 6)

**Files:** Modify `expressionbuilder.ts`: `DEFAULT_KEY_BINDINGS` (line 77), `onKeydown` and `matches`. Test: `describe("ExpressionBuilder, the keyboard")`.

**Rules.**

- `DEFAULT_KEY_BINDINGS` gains `group: "Alt+G"` and `ungroup: "Alt+Shift+G"`.
- `matches` reads a binding's last part as a letter when it is one letter, and then compares `e.code` with `"Key" + letter.toUpperCase()`. On macOS, `Alt` changes `e.key`, so `Alt+G` sends `"©"`. Every other key still compares `e.key`.
- On a check box, `↑` and `↓` with no modifier move the focus to the check box of the line above or below, in the order drawn. `Shift + ↑` and `Shift + ↓` check the focused item and the item above or below it in its level, and move the focus there. `Space` is the check box's own.
- `Alt + G`, `Alt + Shift + G`, `Alt + ↑` and `Alt + ↓` act on the checked items, or on the item whose line holds the focus when none is checked. Moves by key keep the focus on the same control of the first moved item. Each is the toolbar's action, and does nothing where the toolbar button would be off.
- Escape is Task 4's for the menu and Task 7's for a drag. Nothing else in `onKeydown` reads it.

- [ ] **Step 1: Write the failing tests.**

```ts
describe("ExpressionBuilder, the keyboard", () =>
{
    let container: HTMLElement;
    beforeEach(() =>
    {
        vi.useFakeTimers();
        container = document.createElement("div");
        container.id = "eb";
        document.body.appendChild(container);
    });
    afterEach(() => { container.remove(); vi.useRealTimers(); });

    const tx = (phrase: string): QueryNode => ({ kind: "text", phrase });
    const box = (item: string): HTMLInputElement =>
        container.querySelector<HTMLInputElement>(`[data-item="${item}"] [data-role=check]`)!;
    const key = (el: HTMLElement, init: KeyboardEventInit): void =>
    {
        el.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init }));
    };
    const words = (): string[] => Array.from(container.querySelectorAll<HTMLInputElement>("[data-role=phrase]"))
        .map((i) => i.value);

    test("↑ and ↓ on a check box go to the line above or below, across a group's edge", () =>
    {
        createExpressionBuilder("eb", { facets: FACETS, tree: { root: { kind: "and", children: [tx("a"),
            { kind: "or", children: [tx("b"), tx("c")] }] } } });
        box("0").focus();

        key(box("0"), { key: "ArrowDown" });
        expect(document.activeElement).toBe(box("1"));
        key(box("1"), { key: "ArrowDown" });
        expect(document.activeElement).toBe(box("1.0"));
        key(box("1.0"), { key: "ArrowUp" });
        expect(document.activeElement).toBe(box("1"));
    });

    test("Shift with ↓ checks the next item in the level, and Alt+G groups them, on macOS too", () =>
    {
        createExpressionBuilder("eb", { facets: FACETS, tree: { root: { kind: "or", children: [tx("a"), tx("b"),
            tx("c")] } } });
        box("0").focus();

        key(box("0"), { key: "ArrowDown", shiftKey: true });
        expect([box("0").checked, box("1").checked]).toEqual([true, true]);
        expect(document.activeElement).toBe(box("1"));

        key(box("1"), { key: "©", code: "KeyG", altKey: true });
        expect(container.querySelector('[data-item="0"]')!.classList.contains("expressionbuilder-line-group"))
            .toBe(true);
    });

    test("Alt+↓ moves the focused row when none is checked, and keeps the focus on its control", () =>
    {
        createExpressionBuilder("eb", { facets: FACETS, tree: { root: { kind: "and", children: [tx("a"),
            tx("b")] } } });
        const phrase = container.querySelector<HTMLInputElement>('[data-item="0"] [data-role=phrase]')!;
        phrase.focus();

        key(phrase, { key: "ArrowDown", altKey: true });
        expect(words()).toEqual(["b", "a"]);
        expect(document.activeElement).toBe(container.querySelector('[data-item="1"] [data-role=phrase]'));
    });

    test("Alt+Shift+G ungroups the focused group, and a binding can change it", () =>
    {
        createExpressionBuilder("eb", { facets: FACETS, keyBindings: { ungroup: "Ctrl+U" },
            tree: { root: { kind: "and", children: [tx("a"), { kind: "or", children: [tx("b"), tx("c")] }] } } });
        box("1").focus();

        key(box("1"), { key: "G", code: "KeyG", altKey: true, shiftKey: true });
        expect(container.querySelector('[data-item="1"]')!.classList.contains("expressionbuilder-line-group"))
            .toBe(true);
        key(box("1"), { key: "u", code: "KeyU", ctrlKey: true });
        expect(container.querySelector('[data-item="1"]')!.classList.contains("expressionbuilder-line-group"))
            .toBe(false);
    });
});
```

Delete the old test "Alt+ArrowDown moves the row and keeps the focus" (line 459), which these replace.

- [ ] **Step 2: Run them and see them fail.**

- [ ] **Step 3: Write the code.**

```ts
    private matches(e: KeyboardEvent, action: string): boolean
    {
        const combo = this.opts.keyBindings?.[action] ?? DEFAULT_KEY_BINDINGS[action];
        const parts = combo.split("+");
        const key = parts[parts.length - 1];
        // Alt changes the letter a key sends on macOS, so a letter is read by the key's place.
        const hit = /^[a-z]$/i.test(key) ? e.code === "Key" + key.toUpperCase() : e.key === key;
        return hit && e.altKey === parts.includes("Alt") && e.ctrlKey === parts.includes("Ctrl")
            && e.shiftKey === parts.includes("Shift") && e.metaKey === parts.includes("Meta");
    }
```

- [ ] **Step 4: Run the tests and see them pass.**

- [ ] **Step 5: Commit:** `feat(expressionbuilder): keys to step, check, group, ungroup and move rows (#N)`.

---

### Task 7: The drag (spec 5.6)

**Files:** Modify `expressionbuilder.ts`: `build()` and a new `// ── Drag ──` section. Test: `describe("ExpressionBuilder, the drag")`.

**Interfaces.** Consumes `moveItems`, `refuses`, `itemPathOf` and `Focus`. Produces:

```ts
    private gestures: { cancel(): void; destroy(): void } | null = null;
    /** The row or group being dragged, and where it would land. */
    private dragging: Row | null = null;
    private dropAt: Place | null = null;
    /** The place under a point, by spec 5.6, before any refusal. */
    private placeAt(x: number, y: number): Place | null
```

**Rules.** The recognizer accepts a press on `.expressionbuilder-drag` while the builder is on. `placeAt`:

- Under the footer, the place is the end of the top level.
- Over a line, the top half is before its item, in its level. The bottom half of a group line is first in the group.
- The bottom half of a row line: `m` is the smallest depth whose level ends on this line (the row is last in every level deeper than `m`). The bracket cell under `x` picks depth `j`, clamped to `m` and `d`. Right of the last cell is `d`, left of the first is `m`. The place is `{ level: p.slice(0, j), index: p[j] + 1 }`.
- A place that `refuses` turns down shows no line. Else the line gets `-drop-before` or `-drop-after`, with `--eb-drop-depth` set to the place's depth, so the mark starts at that bracket column. The footer place marks the top level with `-drop-end`.

`dragStart` logs the item path, marks its line `-dragging`, and sets `dragging`. `dragMove` logs the place at trace level. `dragEnd` calls `moveItems`, announces "Moved to row N" and focuses the moved item's check box. `onDragCancel` and Escape call `dragClear`, which removes every mark and moves nothing. Escape during a drag calls `this.gestures!.cancel()`, then stops the event.

The recognizer listens for `pointerdown`, `pointermove`, `pointerup` and `pointercancel` on the builder's element (`gesturerecognizer.ts` line 623), so events fired on a handle reach it by bubbling.

- [ ] **Step 1: Write the failing tests.**

```ts
describe("ExpressionBuilder, the drag", () =>
{
    let container: HTMLElement;
    beforeEach(() =>
    {
        container = document.createElement("div");
        container.id = "eb";
        document.body.appendChild(container);
        HTMLElement.prototype.setPointerCapture = vi.fn();
    });
    afterEach(() => { container.remove(); vi.restoreAllMocks(); });

    const tx = (phrase: string): QueryNode => ({ kind: "text", phrase });
    const words = (): string[] => Array.from(container.querySelectorAll<HTMLInputElement>("[data-role=phrase]"))
        .map((i) => i.value);

    /** Lays the lines out 40px apart, each bracket column 24px wide from x = 60, and answers elementFromPoint. */
    function layout(): void
    {
        const lines = Array.from(container.querySelectorAll<HTMLElement>(".expressionbuilder-line"));
        const box = (left: number, top: number, w: number, h: number) =>
            ({ left, top, right: left + w, bottom: top + h, width: w, height: h, x: left, y: top }) as DOMRect;
        vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement)
        {
            const line = this.closest(".expressionbuilder-line") as HTMLElement | null;
            const top = line ? lines.indexOf(line) * 40 : lines.length * 40;
            const depth = this.getAttribute("data-depth");
            return depth !== null ? box(60 + Number(depth) * 24, top, 24, 40) : box(0, top, 800, 40);
        });
        document.elementFromPoint = (x: number, y: number) =>
        {
            const line = lines[Math.floor(y / 40)];
            if (!line) { return container.querySelector(".expressionbuilder-footer"); }
            const cell = Array.from(line.querySelectorAll<HTMLElement>(".expressionbuilder-bracket"))
                .find((c) => x >= 60 + Number(c.getAttribute("data-depth")) * 24
                    && x < 84 + Number(c.getAttribute("data-depth")) * 24);
            return cell ?? line;
        };
    }

    function drag(item: string, x: number, y: number, end: "pointerup" | "pointercancel" = "pointerup"): void
    {
        const handle = container.querySelector<HTMLElement>(`[data-item="${item}"] .expressionbuilder-drag`)!;
        const fire = (type: string, cx: number, cy: number) => handle.dispatchEvent(new PointerEvent(type, {
            bubbles: true, cancelable: true, pointerId: 1, pointerType: "mouse", isPrimary: true,
            button: type === "pointermove" ? -1 : 0, clientX: cx, clientY: cy }));
        fire("pointerdown", 400, 5);
        fire("pointermove", x, y);
        fire(end, x, y);
    }

    test("a row added at the end and dropped into a group joins it with the group's join", () =>
    {
        const eb = createExpressionBuilder("eb", { facets: FACETS, tree: { root: { kind: "and", children: [tx("a"),
            { kind: "or", children: [tx("b"), tx("c")] }, tx("d")] } } });
        layout();

        // Lines: a 0-40, group 40-80, b 80-120, c 120-160, d 160-200. The bottom half of c, right of the brackets.
        drag("2", 400, 150);

        expect(meaning(eb.getTree().root)).toEqual(meaning({ kind: "and", children: [tx("a"),
            { kind: "or", children: [tx("b"), tx("c"), tx("d")] }] }));
    });

    test("at a line where a group ends, the bracket column under the pointer picks the level", () =>
    {
        const eb = createExpressionBuilder("eb", { facets: FACETS, tree: { root: { kind: "and", children: [tx("a"),
            { kind: "or", children: [tx("b"), tx("c")] }] } } });
        layout();

        // The bottom half of c, over column 0: after the group, in the top level.
        drag("0", 65, 150);

        expect(words()).toEqual(["b", "c", "a"]);
        expect(meaning(eb.getTree().root)).toEqual(meaning({ kind: "and", children: [
            { kind: "or", children: [tx("b"), tx("c")] }, tx("a")] }));
    });

    test("a group cannot drop into itself, and a cancel or Escape moves nothing", () =>
    {
        const onChange = vi.fn();
        createExpressionBuilder("eb", { facets: FACETS, onChange, tree: { root: { kind: "and", children: [tx("a"),
            { kind: "or", children: [tx("b"), tx("c")] }] } } });
        layout();

        drag("1", 400, 90);
        drag("0", 400, 150, "pointercancel");
        expect(container.querySelector(".expressionbuilder-dragging, .expressionbuilder-drop-after")).toBeNull();
        expect(onChange).not.toHaveBeenCalled();
    });
});
```

- [ ] **Step 2: Run them and see them fail.**

- [ ] **Step 3: Write the code** by the rules above, with the recognizer's callbacks in `build()`, as they are today.

- [ ] **Step 4: Run the tests and see them pass.**

- [ ] **Step 5: Commit:** `feat(expressionbuilder): drag a row or a group into, out of and between groups (#N)`.

---

### Task 8: Styles (spec 5, 7.2)

**Files:** Modify `components/expressionbuilder/expressionbuilder.scss`. Replace the GROUPS section and the row styles, and keep the drafts, problems and drag sections, with the marks of Task 7.

**Rules.**

- `.expressionbuilder-grid` is a CSS grid with the columns `auto auto repeat(var(--eb-depth), 24px) auto minmax(8rem, auto) auto minmax(8rem, 1fr) auto`, for handle, check, brackets, join, key, operator, value and actions. Each `ol`, `li` and line takes `display: grid`, `grid-template-columns: subgrid` and `grid-column: 1 / -1`, so the columns line up at every depth. Each `ol` also has `list-style: none`, `margin: 0` and `padding: 0`, or its indent breaks the columns. A problem line spans `1 / -1`.
- The grid has `overflow-x: auto` and `overscroll-behavior: contain` (`TOUCH_EXPERIENCE.md` section 9, item 16), so a narrow screen scrolls it inside the builder.
- The read-only text spans the key, operator and value columns. So does the group control.
- `-bracket-solid` draws a 2px line on the cell's left in `--theme-input-border`. `-bracket-start` and `-bracket-end` turn it toward the line's content at the top or the bottom. `-run` draws a 1px dashed line in `--theme-border-color` on the cell's right, with the same turns for `-run-start` and `-run-end`. The run's **Make a group** button sits in the `-run-start` cell.
- `-drop-before` and `-drop-after` draw their 3px line from the bracket column at `--eb-drop-depth` to the end of the line.
- The handle keeps `touch-action: none`, and gains `-webkit-touch-callout: none` and `user-select: none` (`TOUCH_EXPERIENCE.md` section 9, item 15).
- Under `@media (any-pointer: coarse)`, each of these is at least 44px: the handle, the check box's label, the join select, **Not**, ✕, ⋯, the menu items, the group control's select and **Ungroup**, **Make a group**, and each footer button. The bracket columns are 44px there.
- Hover rules only in `@media (hover: hover)`.

- [ ] **Step 1:** Write the styles.

- [ ] **Step 2:** `npm run build:components:css` builds with no error, and `npm run test:structure` shows no touch ratchet above its baseline.

- [ ] **Step 3: Commit:** `style(expressionbuilder): the grid, its brackets and its touch targets (#N)`.

---

### Task 9: Browser tests (spec 10)

**Files:** Rewrite `tests/expressionbuilder.spec.ts`. It keeps its own page through `page.route`, so it starts no server of its own.

- [ ] **Step 1: Write the tests.**
  - The `drag` helper takes item paths, and finds the handle by `[data-item="…"] .expressionbuilder-drag`.
  - "a drag by the handle moves the row, and the builder reports the new order": three words rows, row 0 to the bottom half of row 2.
  - "a row added at the end and dropped into a group joins it with Or": the tree `a and (b or c)`. Add words `d` through **Add words**, then drag it to the bottom half of `c`. The reported tree's group holds `b`, `c` and `d`.
  - "a group cannot be dropped inside itself": as today, with item paths.
  - "the same query back from the bar keeps the focus and what the person is typing": as today, with `[data-item="0"] [data-role="value-0"]`.
  - In a `test.describe` with `test.use({ hasTouch: true })`: "each target is 44px under a coarse pointer, and the handle takes the touch". It opens a tree with a group and a dashed run, opens one ⋯ menu, then reads `getBoundingClientRect()` of each target that Task 8 lists. Each width and height is at least 44, and the handle's `touchAction` is `none`.
  - Delete "a drag moves a row into a search inside, and never between a link and the rest". Part 2 brings it back.

- [ ] **Step 2:** `npm run build` then `npx playwright test tests/expressionbuilder.spec.ts` passes.

- [ ] **Step 3:** Check that each new test fails without its change: set the handle's `touch-action` to `auto`, and the coarse target to 24px, run, see the touch test fail, and put them back.

- [ ] **Step 4: Commit:** `test(expressionbuilder): the grid in a browser: drags and touch targets (#N)`.

---

### Task 10: Documents

**Files and changes.**

- `demo/components/expressionbuilder.html`: the page's text describes the grid: check, group, the join column, **Make a group**, the ⋯ menu, the toolbar, the drag and the keys. The tree is the three Azure examples joined with And, with one condition with "has one where" to show a read-only row. The facets are `type`, `state`, `assigned` and `priority`, plus the relationship key that row needs.
- `components/expressionbuilder/README.md`: a section on the grid, the joins, groups and dashed runs, the toolbar, moves, the drag, the keys, read-only rows in part 1, Escape in a modal, and touch. The requirement on `gesturerecognizer.js` stays.
- `KEYBOARD.md` under "Query Expression Builder": `↑` / `↓`, `Space`, `Shift + ↑` / `Shift + ↓`, `Alt + G` (`group`), `Alt + Shift + G` (`ungroup`), and `Alt + ↑` / `Alt + ↓` (`moveUp`, `moveDown`) as 5.3 says.
- `CHANGELOG.md`: under the unreleased version's existing "### Changed", one entry: "ExpressionBuilder is a row-by-row grid (#N, part 1 of 2)".
- `agentknowledge/history.jsonl`: one line, in the form of the lines before it.
- `docs/COMPONENT_REFERENCE.md`: `npm run generate:docs`, then stage the file.

- [ ] **Step 1:** Make the changes.
- [ ] **Step 2:** `python3 scripts/check-history.py` and `node scripts/check-knowledge-yaml.mjs` pass.
- [ ] **Step 3: Commit:** `docs(expressionbuilder): the grid in the demo, the README and the keyboard reference (#N)`.

---

### Task 11: Verify and open the PR

- [ ] **Step 1:** `npm test` passes. Then `npm run test:e2e` passes, run alone. Then `npm run test:structure` passes.
- [ ] **Step 2:** Push `feat/expressionbuilder-grid-part1`, and check that `origin` matches `HEAD`.
- [ ] **Step 3:** Open the PR. Its title is "ExpressionBuilder as a row-by-row grid, part 1 of 2". Its body says "Part 1 of 2 of #N", lists what part 1 does and what part 2 does, and ends with "🤖 Generated with [Claude Code](https://claude.com/claude-code)". Check the body for semicolons.
- [ ] **Step 4:** Wait for the PR's CI to pass, then report it ready. The owner merges.
- [ ] **Step 5:** After the deploy is live, write the apps note in `~/Work/knobby/apps/specs/bugreports/`. It answers the apps' two questions, and says the drag has buttons and keys for every move it makes. The owner commits it.
