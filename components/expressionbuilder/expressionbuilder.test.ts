/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * TESTS: ExpressionBuilder (#207, and the grid of #237)
 * The rows and the tree, the levels the grid draws and their edits, what is kept as it came, drafts, the echo
 * of a change back from the bar, errors placed on lines, and the grid's toolbar, keys and drag.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import
{
    allRows, createExpressionBuilder, facetMap, facetOps, groupItems, insertItem, itemAt, itemPathOf, levelAt,
    levelDepth, levelOf, meaning, moveItems, moveRow, moveRowTo, moveTarget, newVariable, nodeOf, opName, opWord,
    parseItemPath, parsePath, refuses, removeItems, removeRow, rootOf, rowAt, runsOf, setGroupJoins, setJoin,
    setLevel, setOp, treeOf, ungroupItem, unwrapRow, variableUses, wrapRow,
} from "./expressionbuilder";
import type
{
    ExpressionBuilderFacet, FilterRow, GroupRow, QueryNode, QueryTree, Row, TextRow,
} from "./expressionbuilder";
// The builder drags rows through the shared recognizer, which this publishes.
import "../gesturerecognizer/gesturerecognizer";

const FACETS: ExpressionBuilderFacet[] = [
    { key: "type", label: "Type", valueType: "enum", values: [{ value: "note", label: "Note" }, "task"] },
    { key: "created_at", label: "Created", valueType: "date" },
    { key: "amount", label: "Amount", valueType: "number" },
    { key: "title", label: "Title", valueType: "text" },
    { key: "starred", label: "Starred", valueType: "boolean" },
];
const MAP = new Map(FACETS.map((f) => [f.key, f]));

const f = (key: string, op: string, value: Record<string, unknown>, span?: [number, number]): QueryNode =>
    ({ kind: "filter", key, op, value, ...(span ? { span: { start: span[0], end: span[1] } } : {}) });

/** The apps' answer to Parse for `type:note created_at on 2026-11-15`, from their note. */
const APPS_TREE: QueryTree = { root: { kind: "and", children: [
    f("type", "Equals", { text: "note" }, [0, 9]),
    f("created_at", "On", { date: "2026-11-15", zone: "Asia/Kolkata" }, [10, 34]),
], span: { start: 0, end: 34 } }, return: [] };

const strip = (tree: QueryTree): QueryTree =>
    JSON.parse(JSON.stringify(tree, (k, v) => (k === "span" ? undefined : v)));

// ============================================================================
// OPERATORS
// ============================================================================

describe("operators", () =>
{
    test.each([
        ["equals", "Equals"], ["not-equals", "NotEquals"], ["on-or-after", "OnOrAfter"], ["in", "In"],
        ["descendant-of", "DescendantOf"], ["is-not", "IsNot"],
    ])("%s is the tree's %s, and back", (word, name) =>
    {
        expect(opName(word)).toBe(name);
        expect(opWord(name)).toBe(word);
    });

    test("a name that is no operator has no word", () =>
    {
        expect(opWord("Matches")).toBeNull();
    });

    test("a facet's operators: those of its type, else its own list, with the bar's symbols read as words", () =>
    {
        expect(facetOps(MAP.get("starred")!)).toEqual(["is", "is-not", "exists", "missing"]);
        expect(facetOps({ ...MAP.get("type")!, operators: [":", "!:", "in", ">=", ":"] }))
            .toEqual(["equals", "not-equals", "in", "greater-or-equal"]);
        expect(() => facetOps({ ...MAP.get("type")!, operators: ["~"] })).toThrow(/"~"/);
    });
});

// ============================================================================
// ROWS AND TREES
// ============================================================================

describe("rows and trees", () =>
{
    test("the apps' tree makes rows, and the rows make the same tree, without spans", () =>
    {
        expect(treeOf(rootOf(APPS_TREE, MAP), MAP)).toEqual(strip({ root: APPS_TREE.root }));
    });

    test("one filter at the root stays one filter, and no tree makes no root", () =>
    {
        const one: QueryTree = { root: f("amount", "GreaterOrEqual", { number: 5 }) };

        expect(treeOf(rootOf(one, MAP), MAP)).toEqual(one);
        expect(treeOf(rootOf({}, MAP), MAP)).toEqual({});

        // A negated group at the root sits inside the root, so a row added later goes beside it, not into it.
        const negated: QueryTree = { root: { kind: "not", child: { kind: "and", children: [
            f("amount", "GreaterThan", { number: 1 }), f("amount", "LessThan", { number: 9 })] } } };
        const root = rootOf(negated, MAP);
        expect(root.nots).toBe(0);
        expect(root.children[0]).toMatchObject({ kind: "group", nots: 1 });
        expect(treeOf(root, MAP)).toEqual(negated);
    });

    test("everything the builder cannot edit is kept exactly as it came (UI_EXPERIENCE.md 5.7)", () =>
    {
        const kept: QueryTree = { root: { kind: "or", children: [
            { kind: "nested", key: "rel.parent_of", where: f("type", "Equals", { text: "x" }) },
            { kind: "compare", left: { var: "a" }, op: "Equals", right: { var: "b" } },
            { kind: "filter", key: "rel.owner", op: "Equals", value: { var: "p" },
                link: f("role", "Equals", { text: "lead" }) },
            f("created_at", "After", { relative: { anchor: "now", duration: "-P30D" }, zone: "Asia/Kolkata" }),
            f("created_at", "After", { date: "2026-11-15", time: "09:30" }),
            f("amount", "Equals", { param: "max" }),
            f("note", "Equals", { text: "urgent" }),
            f("type", "Matches", { text: "x" }),
            { kind: "not", child: { kind: "not", child: f("title", "Contains", { text: "draft" }) } },
            { kind: "filter", key: "type", op: "In", values: [{ text: "note" }, { text: "task" }] },
            { kind: "text", phrase: "budget" },
            f("starred", "Is", { boolean: true }),
            { ...f("title", "Contains", { text: "x" }), link: f("role", "Equals", { text: "lead" }) },
        ] }, return: ["p"] };

        const root = rootOf(kept, MAP);

        expect(treeOf(root, MAP, kept.return)).toEqual(kept);
        expect(root.op).toBe("or");
        expect(root.children.map((r) => r.kind)).toEqual([
            "kept", "compare", "kept", "kept", "kept", "kept", "kept", "kept", "filter", "filter", "text", "filter",
            "kept"]);
        expect(root.children.map((r) => (r.kind === "kept" ? r.what : null))).toEqual([
            "A search inside rel.parent_of, which is not a relationship key", null,
            "A filter on rel.owner, which has no facet",
            "A filter with a value this builder has no editor for",
            "A filter with a value this builder has no editor for", "A filter on a parameter",
            "A filter on note, which has no facet", "A filter with the operator Matches", null, null, null, null,
            "A filter with a link condition on a key that takes none"]);
    });

    test("a draft and an empty group are left out, so the tree always prints", () =>
    {
        const root = rootOf(APPS_TREE, MAP);
        const draft = (op: string, values: string[]): FilterRow =>
            ({ kind: "filter", key: "amount", op, values, original: values.map(() => undefined), nots: 0 });

        root.children.push(
            draft("", []), draft("greater-than", [""]), draft("greater-than", ["x"]), draft("in", ["", ""]),
            draft("in", ["1", "x"]),
            { kind: "text", phrase: "  ", nots: 0 }, { kind: "group", op: "or", nots: 1, children: [] },
            { kind: "filter", key: "", op: "", values: [], original: [], nots: 0 });

        expect(treeOf(root, MAP)).toEqual(strip({ root: APPS_TREE.root }));

        root.children.push(draft("exists", []), draft("in", ["1", "", "2"]));

        expect(treeOf(root, MAP).root!.children!.slice(2)).toEqual([
            { kind: "filter", key: "amount", op: "Exists" },
            { kind: "filter", key: "amount", op: "In", values: [{ number: 1 }, { number: 2 }] },
        ]);
    });

    test("an edited value is written for its type, and an unedited one, such as a zoned date, as it came", () =>
    {
        const root = rootOf(APPS_TREE, MAP);
        const date = root.children[1] as FilterRow;

        date.values = ["2026-11-16"];
        expect(treeOf(root, MAP).root!.children![1].value).toEqual({ date: "2026-11-16", zone: "Asia/Kolkata" });

        root.children.push({ kind: "filter", key: "starred", op: "is", values: ["false"], original: [undefined],
            nots: 1 });
        expect(treeOf(root, MAP).root!.children![2])
            .toEqual({ kind: "not", child: { kind: "filter", key: "starred", op: "Is", value: { boolean: false } } });
    });

    test("meaning: spans, a group of one, and a group inside one of its own kind make no difference", () =>
    {
        const a = f("title", "Contains", { text: "a" }, [0, 5]);
        const b = f("title", "Contains", { text: "b" });
        const c = f("title", "Contains", { text: "c" });

        expect(meaning({ kind: "and", children: [{ kind: "and", children: [a, b] }, { kind: "or", children: [c] }] }))
            .toEqual(meaning({ kind: "and", children: [a, b, c] }));
        expect(meaning({ kind: "not", child: { kind: "and", children: [a] } }))
            .toEqual(meaning({ kind: "not", child: a }));
        expect(meaning({ kind: "or", children: [a, b] })).not.toEqual(meaning({ kind: "and", children: [a, b] }));
    });
});

// ============================================================================
// EDITS
// ============================================================================

describe("edits", () =>
{
    /** A root with rows a, b and a group g of c and d. */
    function sample(): GroupRow
    {
        const t = (phrase: string) => ({ kind: "text" as const, phrase, nots: 0 });
        return { kind: "group", op: "and", nots: 0, children: [t("a"), t("b"),
            { kind: "group", op: "or", nots: 0, children: [t("c"), t("d")] }] };
    }
    const names = (row: GroupRow): unknown => row.children.map((r) =>
        r.kind === "text" ? r.phrase : r.kind === "group" ? names(r) : r.kind);

    test("moveRow moves one place in its group, and not past either end", () =>
    {
        const root = sample();

        expect(moveRow(root, [0], 1)).toEqual([1]);
        expect(names(root)).toEqual(["b", "a", ["c", "d"]]);
        expect(moveRow(root, [0], -1)).toBeNull();
        expect(moveRow(root, [2, 1], 1)).toBeNull();
    });

    test("wrapRow puts a row in an `and` group of its own, and unwrapRow takes a group's rows out", () =>
    {
        const root = sample();

        wrapRow(root, [1]);
        expect(names(root)).toEqual(["a", ["b"], ["c", "d"]]);
        expect(rowAt(root, [1]).row).toMatchObject({ kind: "group", op: "and" });

        expect(unwrapRow(root, [2])).toBe(true);
        expect(names(root)).toEqual(["a", ["b"], "c", "d"]);
        expect(unwrapRow(root, [0])).toBe(false);
    });

    test("unwrapRow refuses a group with `not`, which would change what it means", () =>
    {
        const root = sample();
        (root.children[2] as GroupRow).nots = 1;

        expect(unwrapRow(root, [2])).toBe(false);
        expect(names(root)).toEqual(["a", "b", ["c", "d"]]);
    });

    test("removeRow removes a row", () =>
    {
        const root = sample();
        removeRow(root, [2, 0]);

        expect(names(root)).toEqual(["a", "b", ["d"]]);
    });

    test.each([
        ["down in its own group", [0], [], 2, ["b", "a", ["c", "d"]], [1]],
        ["up in its own group", [1], [], 0, ["b", "a", ["c", "d"]], [0]],
        ["to the end of its own group", [0], [], 3, ["b", ["c", "d"], "a"], [2]],
        ["onto its own place", [1], [], 1, ["a", "b", ["c", "d"]], [1]],
        ["onto its own place, as the first row", [0], [], 0, ["a", "b", ["c", "d"]], [0]],
        ["into another group", [0], [2], 1, ["b", ["c", "a", "d"]], [1, 1]],
        ["out of a group, before it", [2, 1], [], 2, ["a", "b", "d", ["c"]], [2]],
        ["out of a group, after it", [2, 0], [], 3, ["a", "b", ["d"], "c"], [3]],
    ])("moveRowTo moves a row %s", (_name, from, group, index, expected, path) =>
    {
        const root = sample();

        expect(moveRowTo(root, from, group, index)).toEqual(path);
        expect(names(root)).toEqual(expected);
    });

    test("moveRowTo refuses to put a group inside itself", () =>
    {
        const root = sample();

        expect(moveRowTo(root, [2], [2], 0)).toBeNull();
        expect(names(root)).toEqual(["a", "b", ["c", "d"]]);
    });

    test("setOp fits the values: none, one, or a list", () =>
    {
        const row: FilterRow = { kind: "filter", key: "amount", op: "in", values: ["1", "2"],
            original: [{ number: 1 }, { number: 2 }], nots: 0 };

        setOp(row, "greater-than");
        expect(row).toMatchObject({ values: ["1"], original: [{ number: 1 }] });
        setOp(row, "in");
        expect(row.values).toEqual(["1"]);
        setOp(row, "exists");
        expect(row).toMatchObject({ values: [], original: [] });
        setOp(row, "in");
        expect(row.values).toEqual([""]);
    });
});

// ============================================================================
// THE COMPONENT
// ============================================================================

describe("ExpressionBuilder", () =>
{
    let container: HTMLElement;

    beforeEach(() =>
    {
        vi.useFakeTimers();
        container = document.createElement("div");
        container.id = "eb";
        document.body.appendChild(container);
    });
    afterEach(() =>
    {
        container.remove();
        vi.useRealTimers();
    });

    const make = (tree?: QueryTree, onChange = vi.fn()) =>
        ({ eb: createExpressionBuilder("eb", { facets: FACETS, tree, onChange }), onChange });
    /** A line of the grid by its item path, and a control on it. */
    const row = (item: string): HTMLElement => container.querySelector(`[data-item="${item}"]`)!;
    const control = (item: string, role: string): HTMLInputElement =>
        row(item).querySelector<HTMLInputElement>(`[data-role="${role}"]`)!;
    const tool = (role: string): HTMLButtonElement =>
        container.querySelector<HTMLButtonElement>(`.expressionbuilder-footer [data-role="${role}"]`)!;
    const choose = (el: HTMLInputElement, value: string): void =>
    {
        el.value = value;
        el.dispatchEvent(new Event("change", { bubbles: true }));
    };
    const live = (): string => container.querySelector("[role=status]")!.textContent ?? "";

    test("needs the GestureRecognizer for its drags, and says so", () =>
    {
        const recognizer = window.createGestureRecognizer;
        delete window.createGestureRecognizer;
        try
        {
            expect(() => make()).toThrow(/gesturerecognizer\.js/);
        }
        finally
        {
            window.createGestureRecognizer = recognizer;
        }
    });

    test("refuses a container that is not there, and an operator the language does not have, naming each", () =>
    {
        expect(() => createExpressionBuilder("eb-missing", { facets: FACETS })).toThrow(/"eb-missing"/);
        expect(() => createExpressionBuilder("eb", {} as never)).toThrow(/options\.facets is required/);
        expect(() => createExpressionBuilder("eb", { facets: [{ ...FACETS[0], operators: ["~"] }] }))
            .toThrow(/"type" lists the operator "~"/);
    });

    test("draws a row for each node, with its key, operator and value", () =>
    {
        make(APPS_TREE);

        expect(control("0", "key").value).toBe("type");
        expect(control("0", "op").value).toBe("equals");
        expect(control("0", "value-0").value).toBe("note");
        expect(control("1", "op").value).toBe("on");
        expect(control("1", "value-0").value).toBe("2026-11-15");
    });

    test("a new condition is a draft, reported once it is complete, and the focus follows each step", () =>
    {
        const { eb, onChange } = make(APPS_TREE);

        tool("add-filter").click();
        expect(document.activeElement).toBe(control("2", "key"));
        expect(row("2").classList.contains("expressionbuilder-row-draft")).toBe(true);
        expect(live()).toBe("");
        vi.advanceTimersByTime(20);
        expect(live()).toBe("Condition added");

        choose(control("2", "key"), "amount");
        expect(document.activeElement).toBe(control("2", "key"));
        choose(control("2", "op"), "greater-or-equal");
        expect(onChange).not.toHaveBeenCalled();

        choose(control("2", "value-0"), "5");
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange.mock.calls[0][0].root.children[2])
            .toEqual({ kind: "filter", key: "amount", op: "GreaterOrEqual", value: { number: 5 } });
        expect(eb.getTree()).toEqual(onChange.mock.calls[0][0]);
        expect(row("2").classList.contains("expressionbuilder-row-draft")).toBe(false);
    });

    test("the same query back from the bar keeps the rows, so a person typing in a value loses nothing", () =>
    {
        const sent: QueryTree = { root: { kind: "and", children: [
            f("type", "Equals", { text: "note" }), f("title", "Contains", { text: "budget" })] } };
        const { eb } = make(sent);
        const input = control("1", "value-0");
        input.focus();
        input.value = "budget pl";
        input.dispatchEvent(new Event("input", { bubbles: true }));

        // The bar printed the tree with a group of one around it, and the parse has its own spans.
        eb.setParsed({ tree: { root: { kind: "and", children: [{ kind: "and", children: [
            f("type", "Equals", { text: "note" }, [0, 18]),
            f("title", "Contains", { text: "budget" }, [23, 47])] }] } } });

        expect(control("1", "value-0")).toBe(input);
        expect(document.activeElement).toBe(input);
        expect(input.value).toBe("budget pl");
    });

    test("another tree from the bar replaces the rows", () =>
    {
        const { eb, onChange } = make(APPS_TREE);

        eb.setParsed({ tree: { root: f("title", "Contains", { text: "budget" }) } });

        expect(control("0", "key").value).toBe("title");
        expect(row("1")).toBeNull();
        expect(onChange).not.toHaveBeenCalled();
    });

    test("an error goes on the row whose text holds it, and one with no place above the rows", () =>
    {
        const { eb } = make();

        eb.setParsed({ tree: APPS_TREE, warnings: [
            { code: "QL_A", title: "On the date", detail: "A.", start: 20, end: 30 },
            { code: "QL_B", title: "Nowhere", detail: "B." },
            { code: "QL_C", title: "Across both", detail: "C.", start: 5, end: 15 },
        ] });

        expect(row("1").classList.contains("expressionbuilder-has-warning")).toBe(true);
        expect(row("1").querySelector(".expressionbuilder-problem-text")!.textContent).toBe("On the date. A.");
        const above = container.querySelector<HTMLElement>(".expressionbuilder-message")!;
        expect(above.hidden).toBe(false);
        // A range across two rows belongs to the group that holds both, which is the root, shown above.
        expect(Array.from(above.querySelectorAll(".expressionbuilder-problem-text")).map((e) => e.textContent))
            .toEqual(["Nowhere. B.", "Across both. C."]);
        vi.advanceTimersByTime(20);
        expect(live()).toBe("3 problems in the query. On the date. A.");
    });

    test("the same problems again are not announced again", () =>
    {
        const { eb } = make();
        const parsed = { tree: APPS_TREE, warnings: [{ code: "QL_A", title: "A", detail: "A.", start: 0, end: 4 }] };

        eb.setParsed(parsed);
        vi.advanceTimersByTime(20);
        expect(live()).toBe("1 problem in the query. A. A.");
        container.querySelector("[role=status]")!.textContent = "";
        eb.setParsed(parsed);
        vi.advanceTimersByTime(20);
        expect(live()).toBe("");
    });

    test("with no tree, the errors show above the rows, and the rows stay", () =>
    {
        const { eb } = make(APPS_TREE);

        eb.setParsed({ errors: [{ code: "QL_E", title: "A bracket is not closed", detail: "D.", start: 0, end: 1 }] });

        expect(row("0").classList.contains("expressionbuilder-has-error")).toBe(false);
        expect(container.querySelector(".expressionbuilder-message")!.textContent).toContain("A bracket is not closed");
        expect(control("0", "key").value).toBe("type");
    });

    test("an edit drops the problems, whose places no longer hold", () =>
    {
        const { eb } = make();
        eb.setParsed({ tree: APPS_TREE, errors: [{ code: "QL_A", title: "A", detail: "A.", start: 0, end: 4 }] });

        choose(control("0", "value-0"), "task");

        expect(container.querySelector(".expressionbuilder-problem")).toBeNull();
        expect(container.querySelector<HTMLElement>(".expressionbuilder-message")!.hidden).toBe(true);
    });

    test("Not toggles a `not` around the row", () =>
    {
        const { onChange } = make(APPS_TREE);

        control("0", "not").click();

        expect(control("0", "not").getAttribute("aria-pressed")).toBe("true");
        expect(onChange.mock.calls[0][0].root.children[0]).toEqual(
            { kind: "not", child: { kind: "filter", key: "type", op: "Equals", value: { text: "note" } } });

        control("0", "not").click();
        expect(control("0", "not").getAttribute("aria-pressed")).toBe("false");
        expect(onChange.mock.calls[1][0].root.children[0]).toMatchObject({ kind: "filter", key: "type" });
    });

    const tx = (phrase: string): QueryNode => ({ kind: "text", phrase });
    const textTree = (root: QueryNode): QueryTree => ({ root });
    const words = (): string[] => Array.from(container.querySelectorAll<HTMLInputElement>("[data-role=phrase]"))
        .map((i) => i.value);

    test("each line has a join but the first, and the dashed run shows what the precedence reads", () =>
    {
        make(textTree({ kind: "or", children: [{ kind: "and", children: [tx("a"), tx("b")] }, tx("c")] }));

        expect(control("0", "join")).toBeNull();
        expect(control("1", "join").value).toBe("and");
        expect(control("2", "join").value).toBe("or");
        expect(row("0").querySelector(".expressionbuilder-run-start [data-role=make-group]")).not.toBeNull();
        expect(row("1").querySelector(".expressionbuilder-run-end")).not.toBeNull();
        expect(row("2").querySelector(".expressionbuilder-run")).toBeNull();
        expect(row("1").closest("li")!.getAttribute("aria-label"))
            .toBe("Row 2: and, has the words b, read together with row 1");
    });

    test("a join changes what the query means, and reports it", () =>
    {
        const { onChange } = make(textTree({ kind: "and", children: [tx("a"), tx("b"), tx("c")] }));
        control("2", "join").focus();

        choose(control("2", "join"), "or");

        expect(meaning(onChange.mock.calls[0][0].root)).toEqual(meaning({ kind: "or", children: [
            { kind: "and", children: [tx("a"), tx("b")] }, tx("c")] }));
        expect(document.activeElement).toBe(control("2", "join"));
    });

    test("a group draws a solid bracket and its control, and Mixed shows while its joins differ", () =>
    {
        make(textTree({ kind: "and", children: [tx("a"), { kind: "or", children: [tx("b"), tx("c"), tx("e")] }] }));

        expect(row("1").classList.contains("expressionbuilder-line-group")).toBe(true);
        expect(control("1", "group-op").value).toBe("or");
        expect(row("1.2").querySelector(".expressionbuilder-bracket-end")).not.toBeNull();
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

        row("1").querySelector<HTMLButtonElement>("[data-role=make-group]")!.click();

        expect(row("1").classList.contains("expressionbuilder-line-group")).toBe(true);
        expect(document.activeElement).toBe(control("1", "check"));
        expect(onChange).not.toHaveBeenCalled();
    });

    test("Not turned off on a group keeps the group, where it would read the same as its level", () =>
    {
        const { onChange } = make(textTree({ kind: "or", children: [tx("a"),
            { kind: "not", child: { kind: "or", children: [tx("b"), tx("c")] } }] }));

        control("1", "not").click();

        expect(row("1").classList.contains("expressionbuilder-line-group")).toBe(true);
        expect(meaning(onChange.mock.calls[0][0].root)).toEqual(meaning({ kind: "or", children: [tx("a"),
            tx("b"), tx("c")] }));
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
        expect(control("0", "more").getAttribute("aria-expanded")).toBe("true");
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

    test("a press outside the ⋯ menu closes it, and Move down there moves the row", () =>
    {
        make(textTree({ kind: "and", children: [tx("a"), tx("b")] }));

        control("0", "more").click();
        document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
        expect(container.querySelector("[role=menu]")).toBeNull();

        control("0", "more").click();
        container.querySelector<HTMLButtonElement>('[role=menu] [data-role="down"]')!.click();
        expect(words()).toEqual(["b", "a"]);
        expect(document.activeElement).toBe(control("1", "more"));
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

    test("a row the grid cannot edit yet is read-only, says why, and still checks and goes", () =>
    {
        const nested: QueryNode = { kind: "nested", key: "rel.parent_of", where: f("type", "Equals", { text: "x" }) };
        const { eb } = make({ root: { kind: "and", children: [f("title", "Contains", { text: "a" }), nested] } });

        expect(row("1").textContent)
            .toContain("A search inside rel.parent_of, which is not a relationship key. Edit this in the search bar.");
        expect(row("1").querySelector("[data-role=key], [data-role=op]")).toBeNull();
        control("1", "check").click();
        tool("tool-remove").click();
        expect(eb.getTree()).toEqual({ root: f("title", "Contains", { text: "a" }) });
    });

    test("disable turns off every control, and enable turns them on", () =>
    {
        const { eb } = make(APPS_TREE);

        eb.disable();
        expect(Array.from(container.querySelectorAll("input, select, button")).every((e) =>
            (e as HTMLButtonElement).disabled)).toBe(true);
        eb.enable();
        expect(control("0", "key").disabled).toBe(false);
    });

    test("destroy removes the builder, and a second destroy does nothing", () =>
    {
        const { eb } = make(APPS_TREE);

        eb.destroy();
        eb.destroy();
        expect(container.children).toHaveLength(0);
        expect(eb.getElement()).toBeNull();
    });
});

// ============================================================================
// PART 2: SEARCHES INSIDE, LINK CONDITIONS AND VARIABLES (spec section 9)
// ============================================================================

const REL: ExpressionBuilderFacet[] = [
    { key: "type", label: "Type", valueType: "enum", values: ["checklists.instance"] },
    { key: "rel.created_by", label: "Created by", valueType: "text", relationship: true },
    { key: "rel.completed_by", label: "Completed by", valueType: "text", relationship: true },
    { key: "rel.belongs_to_org_unit", label: "Org unit", valueType: "text", relationship: true },
    { key: "rel.member_of", label: "Member of", valueType: "text", relationship: true },
    { key: "rel.signed_off_by", label: "Signed off by", valueType: "text", relationship: true, link: [
        { key: "provenance", label: "Provenance", valueType: "enum", values: ["manual", "ai"] },
        { key: "at", label: "Made", valueType: "date" },
    ] },
];
const RMAP = facetMap(REL);
const v = (name: string) => ({ var: name });
const rel = (key: string, value: Record<string, unknown>, op = "Equals"): QueryNode =>
    ({ kind: "filter", key, op, value });

/** The three examples from #376 in spec section 9, and its `link` example, as trees. */
const EXAMPLES: Array<[string, QueryTree]> = [
    ["the same person created and completed it", { root: { kind: "and", children: [
        rel("type", { text: "checklists.instance" }), rel("rel.created_by", v("p")), rel("rel.completed_by", v("p")),
    ] } }],
    ["the approver is not the doer", { root: { kind: "and", children: [
        rel("rel.completed_by", v("doer")), rel("rel.signed_off_by", v("approver")),
        { kind: "compare", left: v("approver"), op: "NotEquals", right: v("doer") },
    ] } }],
    ["signed off by someone outside the org", { root: { kind: "and", children: [
        rel("rel.belongs_to_org_unit", v("org")),
        { kind: "nested", key: "rel.signed_off_by", where: { kind: "not", child: rel("rel.member_of", v("org")) } },
    ] } }],
    ["a manual sign-off after a date, by someone outside the org", { root: { kind: "and", children: [
        rel("rel.belongs_to_org_unit", v("org")),
        { kind: "nested", key: "rel.signed_off_by",
            link: { kind: "and", children: [rel("provenance", { text: "manual" }),
                rel("at", { date: "2026-11-01", zone: "Asia/Kolkata" }, "After")] },
            where: { kind: "not", child: rel("rel.member_of", v("org")) } },
    ] } }],
];

describe("searches inside, link conditions and variables", () =>
{
    test.each(EXAMPLES)("%s: the rows make the same tree, with nothing kept", (_name, tree) =>
    {
        const root = rootOf(tree, RMAP);

        expect(treeOf(root, RMAP)).toEqual(tree);
        expect(Array.from(allRows(root)).filter(({ row }) => row.kind === "kept")).toEqual([]);
    });

    test("a search inside is a condition with `where`, and its link conditions use the link's fields", () =>
    {
        const root = rootOf(EXAMPLES[3][1], RMAP);
        const signed = root.children[1] as FilterRow;

        expect(signed).toMatchObject({ key: "rel.signed_off_by", op: "where" });
        expect(signed.link).toMatchObject({ kind: "group", linkOf: "rel.signed_off_by" });
        expect((signed.link!.children[1] as FilterRow))
            .toMatchObject({ key: "at", op: "after", values: ["2026-11-01"] });
        expect(signed.where!.children[0])
            .toMatchObject({ kind: "filter", key: "rel.member_of", nots: 1, variable: "org" });
    });

    test("a value on a relationship key is an item's id, read and written as `resource`", () =>
    {
        const id = "6f1c0d6e-27a4-4b9d-9e3e-6b0f5d0b9a11";
        const tree: QueryTree = { root: rel("rel.created_by", { resource: id }) };
        const root = rootOf(tree, RMAP);

        expect(treeOf(root, RMAP)).toEqual(tree);
        (root.children[0] as FilterRow).values = ["7"];
        expect(treeOf(root, RMAP).root!.value).toEqual({ resource: "7" });
    });

    test("a variable used once is a draft, left out, as the binder's rule 1 asks; `return` counts as a use", () =>
    {
        const root = rootOf(EXAMPLES[0][1], RMAP);
        removeRow(root, [2]);

        expect(treeOf(root, RMAP).root).toEqual(rel("type", { text: "checklists.instance" }));
        expect(treeOf(root, RMAP, ["p"]).root!.children![1]).toEqual(rel("rel.created_by", v("p")));
    });

    test("variableUses counts conditions, comparisons, kept parts and `return`", () =>
    {
        const root = rootOf(EXAMPLES[1][1], RMAP);
        root.children.push({ kind: "kept", node: { kind: "filter", key: "x", op: "Equals", value: v("doer") },
            what: "kept", nots: 0 });

        expect(Object.fromEntries(variableUses(root, ["approver"]))).toEqual({ doer: 3, approver: 3 });
    });

    test("newVariable names a variable from its key, and never one already used", () =>
    {
        expect(newVariable("rel.created_by", new Set())).toBe("created_by");
        expect(newVariable("rel.created_by", new Set(["created_by", "created_by2"]))).toBe("created_by3");
        expect(newVariable("rel.1st-owner", new Set())).toBe("_1st_owner");
    });

    test("setOp keeps the search inside when the operator changes, and drops a variable off `equals`", () =>
    {
        const root = rootOf(EXAMPLES[2][1], RMAP);
        const signed = root.children[1] as FilterRow;
        const where = signed.where;

        // Off "where", the search inside is not in the tree, so ?org is used once, and its condition is a draft.
        setOp(signed, "equals");
        expect(treeOf(root, RMAP)).toEqual({});
        setOp(signed, "where");
        expect(signed.where).toBe(where);
        expect(treeOf(root, RMAP)).toEqual(EXAMPLES[2][1]);

        const org = root.children[0] as FilterRow;
        setOp(org, "not-equals");
        expect(org.variable).toBeUndefined();
    });

    test("a where or link group sits in a condition: it does not move or go on its own", () =>
    {
        const root = rootOf(EXAMPLES[3][1], RMAP);

        expect(rowAt(root, [1, "where"])).toMatchObject({ parent: null, index: -1 });
        expect(moveRow(root, [1, "link"], 1)).toBeNull();
        removeRow(root, [1, "where"]);
        expect(treeOf(root, RMAP)).toEqual(EXAMPLES[3][1]);
        expect(parsePath("1.link.0")).toEqual([1, "link", 0]);
    });

    test("a group made in a link uses the link's fields, and a row never moves between a link and the rest", () =>
    {
        const root = rootOf(EXAMPLES[3][1], RMAP);

        wrapRow(root, [1, "link", 0]);
        expect(rowAt(root, [1, "link", 0]).row).toMatchObject({ kind: "group", linkOf: "rel.signed_off_by" });
        expect(meaning(treeOf(root, RMAP).root)).toEqual(meaning(EXAMPLES[3][1].root));

        expect(moveRowTo(root, [1, "link", 1], [], 0)).toBeNull();
        expect(moveRowTo(root, [0], [1, "link"], 0)).toBeNull();
        expect(moveRowTo(root, [0], [1, "where"], 0)).toEqual([0, "where", 0]);
    });

    test("meaning reaches into where and link, and ignores the order of a node's fields", () =>
    {
        const one = rel("rel.member_of", v("org"));
        const sent: QueryNode = { kind: "nested", key: "rel.signed_off_by", where: { kind: "and", children: [one] } };
        const back = { where: one, key: "rel.signed_off_by", kind: "nested" } as QueryNode;

        // The builder compares the two as text, so the order of the fields must not matter.
        expect(JSON.stringify(meaning(back))).toBe(JSON.stringify(meaning(sent)));
    });

    test.each([
        ["a variable on a key that is not a relationship", rel("type", v("p"))],
        ["a variable after an operator other than equals", rel("rel.created_by", v("p"), "NotEquals")],
        ["a variable in a list", { kind: "filter", key: "rel.created_by", op: "In", values: [v("p"), v("q")] }],
        ["a comparison with a value on one side",
            { kind: "compare", left: v("a"), op: "Equals", right: { text: "x" } }],
        ["a comparison with an operator the language does not have",
            { kind: "compare", left: v("a"), op: "Matches", right: v("b") }],
    ])("keeps %s as it came", (_name, node) =>
    {
        expect(rootOf({ root: node as QueryNode }, RMAP).children[0].kind).toBe("kept");
    });

    test("a link holds no variables or comparisons: they are kept there", () =>
    {
        const root = rootOf({ root: { kind: "nested", key: "rel.signed_off_by", where: rel("rel.member_of", v("o")),
            link: { kind: "and", children: [rel("provenance", v("o")),
                { kind: "compare", left: v("o"), op: "Equals", right: v("o") }] } } }, RMAP);

        expect((root.children[0] as FilterRow).link!.children.map((r) => r.kind)).toEqual(["kept", "kept"]);
    });

    test("a comparison of a variable with itself is a draft", () =>
    {
        const root = rootOf(EXAMPLES[1][1], RMAP);
        root.children[2] = { kind: "compare", left: "doer", op: "not-equals", right: "doer", nots: 0 };

        expect(JSON.stringify(treeOf(root, RMAP))).not.toContain("compare");
    });
});

describe("ExpressionBuilder, part 2", () =>
{
    let container: HTMLElement;

    beforeEach(() =>
    {
        vi.useFakeTimers();
        container = document.createElement("div");
        container.id = "eb";
        document.body.appendChild(container);
    });
    afterEach(() =>
    {
        container.remove();
        vi.useRealTimers();
    });

    const make = (tree?: QueryTree, onChange = vi.fn()) =>
        ({ eb: createExpressionBuilder("eb", { facets: REL, tree, onChange }), onChange });
    /** A line of the grid by its item path, and a control on it. */
    const row = (item: string): HTMLElement => container.querySelector(`[data-item="${item}"]`)!;
    const control = (item: string, role: string): HTMLInputElement =>
        row(item).querySelector<HTMLInputElement>(`[data-role="${role}"]`)!;

    test("in part 1, a search inside, a link, the same item as, and a comparison are read-only", () =>
    {
        make(EXAMPLES[2][1]);

        expect(row("1").querySelector(".expressionbuilder-cell-op")!.textContent).toBe("has one where");
        expect(row("1").querySelector(".expressionbuilder-cell-value")!.textContent)
            .toBe("a search inside. Edit this in the search bar.");
        expect(row("0").querySelector(".expressionbuilder-cell-value")!.textContent)
            .toBe("the same item as ?org. Edit this in the search bar.");
        expect(row("0").closest("li")!.getAttribute("aria-label")).toContain("is the same item as another row");
        expect(container.querySelector('[data-role=op] option[value="where"]')).toBeNull();
        expect(container.querySelector("[data-role=add-link], [data-role=same], [data-role=add-compare]")).toBeNull();
    });

    test("a link condition and a comparison show what they hold, read-only", () =>
    {
        make(EXAMPLES[3][1]);
        expect(row("1").querySelector(".expressionbuilder-cell-value")!.textContent)
            .toBe("a search inside, with conditions on its link. Edit this in the search bar.");

        container.textContent = "";
        make(EXAMPLES[1][1]);
        expect(row("2").querySelector(".expressionbuilder-cell-key")!.textContent).toBe("?approver");
        expect(row("2").querySelector(".expressionbuilder-cell-op")!.textContent).toBe("is not the same item as");
        expect(row("2").querySelector(".expressionbuilder-cell-value")!.textContent)
            .toBe("?doer. Edit this in the search bar.");
    });

    test("a warning inside a where or a link lands on its condition's line in part 1", () =>
    {
        const { eb } = make();
        const text = "rel.belongs_to_org_unit:?org rel.signed_off_by link ( provenance:manual ) "
            + "where ( -rel.member_of:?org )";
        const at = (s: string): [number, number] => [text.indexOf(s), text.indexOf(s) + s.length];
        const span = (s: string) => ({ start: at(s)[0], end: at(s)[1] });

        eb.setParsed({ tree: { root: { kind: "and", children: [
            { ...rel("rel.belongs_to_org_unit", v("org")), span: span("rel.belongs_to_org_unit:?org") },
            { kind: "nested", key: "rel.signed_off_by", span: span("rel.signed_off_by link ( provenance:manual ) "
                + "where ( -rel.member_of:?org )"),
                link: { ...rel("provenance", { text: "manual" }), span: span("provenance:manual") },
                where: { kind: "not", span: span("-rel.member_of:?org"),
                    child: { ...rel("rel.member_of", v("org")), span: span("rel.member_of:?org") } } },
        ] } }, warnings: [
            { code: "QL_A", title: "On the link", detail: "A.", start: at("manual")[0], end: at("manual")[1] },
            { code: "QL_B", title: "Inside", detail: "B.", start: at("member_of")[0], end: at("member_of")[1] },
        ] });

        // Part 1 shows no line inside the search inside or the link, so both go on the condition's line.
        expect(row("1").classList.contains("expressionbuilder-has-warning")).toBe(true);
        expect(row("1").querySelectorAll(".expressionbuilder-problem")).toHaveLength(2);
    });

    test("a search inside back from the bar as one bare condition keeps the rows and the focus", () =>
    {
        const { eb } = make(EXAMPLES[2][1]);
        const box = control("1", "check");
        box.focus();

        eb.setParsed({ tree: { root: { kind: "and", children: [rel("rel.belongs_to_org_unit", v("org")),
            { kind: "nested", key: "rel.signed_off_by",
                where: { kind: "and", children: [{ kind: "not", child: rel("rel.member_of", v("org")) }] } }] } } });

        expect(control("1", "check")).toBe(box);
        expect(document.activeElement).toBe(box);
    });
});

// ============================================================================
// LEVELS: THE GRID'S VIEW OF THE TREE (#237, spec section 4)
// ============================================================================

const t = (phrase: string, nots = 0): TextRow => ({ kind: "text", phrase, nots });
const and = (...children: Row[]): GroupRow => ({ kind: "group", op: "and", nots: 0, children });
const or = (...children: Row[]): GroupRow => ({ kind: "group", op: "or", nots: 0, children });
const not = (g: GroupRow): GroupRow => ({ ...g, nots: 1 });
const marked = (g: GroupRow): GroupRow => ({ ...g, bracket: true });
const NONE = new Map<string, ExpressionBuilderFacet>();

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
        const facets = (tree === APPS_TREE) ? MAP : RMAP;
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
        removeItems(root, [levelAt(root, [1]).children[0]]);
        // A group left with one item and no not is ungrouped.
        expect(show(root)).toBe("a and c");

        const negated = and(t("a"), not(or(t("b"), t("c"))));
        removeItems(negated, [levelAt(negated, [1]).children[0]]);
        expect(show(negated)).toBe("a and not [c]");

        const first = or(t("a"), and(t("b"), t("c")));
        removeItems(first, [first.children[0]]);
        expect(show(first)).toBe("b and c");

        const group = and(t("a"), or(t("b"), t("c")));
        const inner = levelAt(group, [1]);
        removeItems(group, [inner, inner.children[0]]);
        expect(show(group)).toBe("a");
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
            moveItems(root, [], 1, 1, { level: [2], index: 2 });

            expect(show(root)).toBe("a and [d or e or [b or c]]");
        });

        test("several items move together, the first by 4.5 and the rest keep their joins", () =>
        {
            const root = and(t("a"), t("b"), t("c"), or(t("x"), t("y")));
            moveItems(root, [], 1, 2, { level: [3], index: 0 });

            expect(show(root)).toBe("a and [b and c or x or y]");
        });

        test("refuses a group into itself, and a place beside the items, and changes nothing", () =>
        {
            const root = and(t("a"), or(t("b"), t("c")));

            expect(refuses(root, [], 1, 1, { level: [1], index: 0 })).toBe(true);
            expect(moveItems(root, [], 1, 1, { level: [1], index: 0 })).toBeNull();
            expect(refuses(root, [], 0, 0, { level: [], index: 1 })).toBe(true);
            expect(show(root)).toBe("a and [b or c]");
            expect(levelAt(root, [1]).bracket).toBeUndefined();
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

// ============================================================================
// THE GRID: TOOLBAR, KEYBOARD AND DRAG (#237, spec sections 5.3, 5.6 and 6)
// ============================================================================

describe("ExpressionBuilder, the grid's toolbar, keys and drag", () =>
{
    let container: HTMLElement;
    beforeEach(() =>
    {
        vi.useFakeTimers();
        container = document.createElement("div");
        container.id = "eb";
        document.body.appendChild(container);
    });
    afterEach(() =>
    {
        container.remove();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    const tx = (phrase: string): QueryNode => ({ kind: "text", phrase });
    const make = (root: QueryNode, extra: Partial<Parameters<typeof createExpressionBuilder>[1]> = {}) =>
        createExpressionBuilder("eb", { facets: FACETS, tree: { root }, ...extra });
    const line = (item: string): HTMLElement => container.querySelector(`[data-item="${item}"]`)!;
    const box = (item: string): HTMLInputElement => line(item).querySelector<HTMLInputElement>("[data-role=check]")!;
    const isGroup = (item: string): boolean => line(item).classList.contains("expressionbuilder-line-group");
    const tool = (role: string): HTMLButtonElement =>
        container.querySelector<HTMLButtonElement>(`.expressionbuilder-footer [data-role="${role}"]`)!;
    const words = (): string[] => Array.from(container.querySelectorAll<HTMLInputElement>("[data-role=phrase]"))
        .map((i) => i.value);
    const key = (el: HTMLElement, init: KeyboardEventInit): void =>
    {
        el.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init }));
    };
    const live = (): string => container.querySelector("[role=status]")!.textContent ?? "";

    describe("the toolbar (spec 5.3)", () =>
    {
        test("every button is off with nothing checked, and its title says why", () =>
        {
            make({ kind: "and", children: [tx("a"), tx("b")] });

            expect(["tool-group", "tool-ungroup", "tool-up", "tool-down", "tool-remove"].map((r) => tool(r).disabled))
                .toEqual([true, true, true, true, true]);
            expect(tool("tool-group").title).toBe("Check two or more rows next to each other to group them");
            expect(tool("tool-up").title).toBe("Check rows next to each other to move them");
        });

        test("Group wraps rows next to each other, and is off for rows apart", () =>
        {
            const eb = make({ kind: "or", children: [tx("a"), tx("b"), tx("c")] });
            box("0").click();
            box("2").click();
            expect(tool("tool-group").disabled).toBe(true);

            box("2").click();
            box("1").click();
            expect(tool("tool-group").title).toBe("Group (Alt+G)");
            tool("tool-group").click();

            expect(isGroup("0")).toBe(true);
            expect(document.activeElement).toBe(box("0"));
            // The group is checked in place of its rows, so Ungroup acts on it.
            expect(box("0").checked).toBe(true);
            expect(box("0.0").checked).toBe(false);
            expect(tool("tool-ungroup").disabled).toBe(false);
            expect(meaning(eb.getTree().root)).toEqual(meaning({ kind: "or", children: [tx("a"), tx("b"), tx("c")] }));
        });

        test("Move up goes into a group above, and says the row it lands on", () =>
        {
            make({ kind: "and", children: [tx("a"), { kind: "or", children: [tx("b"), tx("c")] }, tx("d")] });

            box("2").click();
            tool("tool-up").click();

            expect(words()).toEqual(["a", "b", "c", "d"]);
            expect(box("1.2").checked).toBe(true);
            expect(document.activeElement).toBe(tool("tool-up"));
            vi.advanceTimersByTime(20);
            expect(live()).toBe("Moved to row 5");
        });

        test("Move up at the top of a group takes the row out, and is off at the top of the grid", () =>
        {
            make({ kind: "and", children: [tx("a"), { kind: "or", children: [tx("b"), tx("c"), tx("e")] }] });

            box("1.0").click();
            tool("tool-up").click();
            expect(words()).toEqual(["a", "b", "c", "e"]);
            expect(line("1").querySelector("[data-role=phrase]")).not.toBeNull();

            tool("tool-up").click();
            expect(words()).toEqual(["b", "a", "c", "e"]);
            expect(tool("tool-up").disabled).toBe(true);
            expect(tool("tool-up").title).toBe("The rows are at the top");
            // The button went off, so the focus is on the row it moved.
            expect(document.activeElement).toBe(box("0"));
        });

        test("the checked state stays when the same query comes back from the bar, and goes with another", () =>
        {
            const eb = make({ kind: "and", children: [tx("a"), tx("b")] });
            box("1").click();

            eb.setParsed({ tree: { root: { kind: "and", children: [tx("a"), tx("b")] } } });
            expect(box("1").checked).toBe(true);

            eb.setParsed({ tree: { root: { kind: "and", children: [tx("x"), tx("y")] } } });
            expect(box("1").checked).toBe(false);
            expect(tool("tool-remove").disabled).toBe(true);
        });

        test("Remove takes every checked item, a group with its rows", () =>
        {
            const eb = make({ kind: "and", children: [tx("a"), { kind: "or", children: [tx("b"), tx("c")] },
                tx("d")] });
            box("1").click();
            box("1.0").click();
            box("2").click();

            tool("tool-remove").click();
            expect(eb.getTree()).toEqual({ root: tx("a") });
            expect(document.activeElement).toBe(box("0"));
        });
    });

    describe("the keys (spec 6)", () =>
    {
        test("↑ and ↓ on a check box go to the line above or below, across a group's edge", () =>
        {
            make({ kind: "and", children: [tx("a"), { kind: "or", children: [tx("b"), tx("c")] }] });
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
            make({ kind: "or", children: [tx("a"), tx("b"), tx("c")] });
            box("0").focus();

            key(box("0"), { key: "ArrowDown", shiftKey: true });
            expect([box("0").checked, box("1").checked]).toEqual([true, true]);
            expect(document.activeElement).toBe(box("1"));

            key(box("1"), { key: "©", code: "KeyG", altKey: true });
            expect(isGroup("0")).toBe(true);
        });

        test("Alt+↓ moves the focused row when none is checked, and keeps the focus on its control", () =>
        {
            const onChange = vi.fn();
            make({ kind: "and", children: [tx("a"), tx("b")] }, { onChange });
            const phrase = line("0").querySelector<HTMLInputElement>("[data-role=phrase]")!;
            phrase.focus();

            key(phrase, { key: "ArrowDown", altKey: true });
            expect(words()).toEqual(["b", "a"]);
            expect(document.activeElement).toBe(line("1").querySelector("[data-role=phrase]"));
            expect(onChange).toHaveBeenCalledTimes(1);
        });

        test("Alt+Shift+G ungroups the focused group, and a binding can change it", () =>
        {
            make({ kind: "and", children: [tx("a"), { kind: "or", children: [tx("b"), tx("c")] }] },
                { keyBindings: { ungroup: "Ctrl+U" } });
            box("1").focus();

            key(box("1"), { key: "G", code: "KeyG", altKey: true, shiftKey: true });
            expect(isGroup("1")).toBe(true);
            key(box("1"), { key: "u", code: "KeyU", ctrlKey: true });
            expect(isGroup("1")).toBe(false);
            expect(tool("tool-ungroup").title).toBe("Check one group to ungroup it");
        });

        test("Alt+Shift+G does nothing to a group with Not", () =>
        {
            make({ kind: "and", children: [tx("a"), { kind: "not", child: { kind: "or", children: [tx("b"),
                tx("c")] } }] });
            box("1").focus();

            key(box("1"), { key: "G", code: "KeyG", altKey: true, shiftKey: true });
            expect(isGroup("1")).toBe(true);
        });
    });

    describe("the drag (spec 5.6)", () =>
    {
        beforeEach(() =>
        {
            vi.useRealTimers();
            HTMLElement.prototype.setPointerCapture = vi.fn();
        });

        /** Lays the lines out 40px apart, each bracket column 24px wide from x = 60, and answers elementFromPoint. */
        function layout(): void
        {
            const lines = Array.from(container.querySelectorAll<HTMLElement>(".expressionbuilder-line"));
            const rect = (left: number, top: number, w: number, h: number) =>
                ({ left, top, right: left + w, bottom: top + h, width: w, height: h, x: left, y: top }) as DOMRect;
            vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement)
            {
                const owner = this.closest<HTMLElement>(".expressionbuilder-line");
                const top = owner ? lines.indexOf(owner) * 40 : lines.length * 40;
                const depth = this.getAttribute("data-depth");
                return (depth !== null) ? rect(60 + Number(depth) * 24, top, 24, 40) : rect(0, top, 800, 40);
            });
            document.elementFromPoint = (x: number, y: number): Element | null =>
            {
                const at = lines[Math.floor(y / 40)];
                if (!at) { return container.querySelector(".expressionbuilder-footer"); }
                const cell = Array.from(at.querySelectorAll<HTMLElement>(".expressionbuilder-bracket")).find((c) =>
                {
                    const left = 60 + Number(c.getAttribute("data-depth")) * 24;
                    return x >= left && x < left + 24;
                });
                return cell ?? at;
            };
        }

        /** Presses an item's handle, moves the pointer to a point, and lifts it or cancels. */
        function drag(item: string, x: number, y: number, end: "pointerup" | "pointercancel" = "pointerup"): void
        {
            const handle = line(item).querySelector<HTMLElement>(".expressionbuilder-drag")!;
            const fire = (type: string, cx: number, cy: number): boolean => handle.dispatchEvent(new PointerEvent(type,
                { bubbles: true, cancelable: true, pointerId: 1, pointerType: "mouse", isPrimary: true,
                    button: (type === "pointermove") ? -1 : 0, clientX: cx, clientY: cy }));
            fire("pointerdown", 400, 5);
            fire("pointermove", x, y);
            fire(end, x, y);
        }

        test("a row added at the end and dropped into a group joins it with the group's join", () =>
        {
            const eb = make({ kind: "and", children: [tx("a"), { kind: "or", children: [tx("b"), tx("c")] },
                tx("d")] });
            layout();

            // Lines: a 0-40, the group 40-80, b 80-120, c 120-160, d 160-200. The bottom half of c, right of the
            // brackets, is the end of the group.
            drag("2", 400, 150);

            expect(meaning(eb.getTree().root)).toEqual(meaning({ kind: "and", children: [tx("a"),
                { kind: "or", children: [tx("b"), tx("c"), tx("d")] }] }));
            expect(document.activeElement).toBe(box("1.2"));
        });

        test("at a line where a group ends, the bracket column under the pointer picks the level", () =>
        {
            const eb = make({ kind: "and", children: [tx("a"), { kind: "or", children: [tx("b"), tx("c")] }] });
            layout();

            // The bottom half of c, over column 0: after the group, in the top level.
            drag("0", 65, 150);

            expect(words()).toEqual(["b", "c", "a"]);
            expect(meaning(eb.getTree().root)).toEqual(meaning({ kind: "and", children: [
                { kind: "or", children: [tx("b"), tx("c")] }, tx("a")] }));
        });

        test("the bottom half of a group's line is first in the group, and the top half is before it", () =>
        {
            const eb = make({ kind: "and", children: [tx("a"), { kind: "or", children: [tx("b"), tx("c")] },
                tx("d")] });
            layout();

            drag("2", 400, 70);
            expect(meaning(eb.getTree().root)).toEqual(meaning({ kind: "and", children: [tx("a"),
                { kind: "or", children: [tx("d"), tx("b"), tx("c")] }] }));
        });

        test("a group cannot drop into itself, and a cancel or Escape moves nothing", () =>
        {
            const onChange = vi.fn();
            make({ kind: "and", children: [tx("a"), { kind: "or", children: [tx("b"), tx("c")] }] }, { onChange });
            layout();

            drag("1", 400, 90);
            drag("0", 400, 150, "pointercancel");
            expect(container.querySelector(".expressionbuilder-dragging, .expressionbuilder-drop-after")).toBeNull();

            // Escape during a drag ends it, wherever the focus is, and the dialog does not see it.
            const outside = vi.fn();
            window.addEventListener("keydown", outside);
            const handle = line("0").querySelector<HTMLElement>(".expressionbuilder-drag")!;
            const init = { bubbles: true, pointerId: 1, pointerType: "mouse", isPrimary: true };
            handle.dispatchEvent(new PointerEvent("pointerdown", { ...init, button: 0, clientX: 400, clientY: 5 }));
            handle.dispatchEvent(new PointerEvent("pointermove", { ...init, button: -1, clientX: 400, clientY: 150 }));
            expect(container.querySelector(".expressionbuilder-drop-after")).not.toBeNull();
            document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
            handle.dispatchEvent(new PointerEvent("pointerup", { ...init, button: 0, clientX: 400, clientY: 150 }));
            window.removeEventListener("keydown", outside);

            expect(outside).not.toHaveBeenCalled();
            expect(container.querySelector(".expressionbuilder-dragging, .expressionbuilder-drop-after")).toBeNull();
            expect(onChange).not.toHaveBeenCalled();
        });
    });
});
