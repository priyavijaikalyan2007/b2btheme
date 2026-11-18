/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * TESTS: ExpressionBuilder (#207)
 * The rows and the tree, the edits, what is kept as it came, drafts, the echo of a change back from the bar,
 * and errors placed on rows.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import
{
    createExpressionBuilder, facetOps, meaning, moveRow, moveRowTo, opName, opWord, removeRow, rootOf, rowAt,
    setOp, treeOf, unwrapRow, wrapRow,
} from "./expressionbuilder";
import type { ExpressionBuilderFacet, FilterRow, GroupRow, QueryNode, QueryTree } from "./expressionbuilder";
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

    test("everything this version cannot edit is kept exactly as it came (UI_EXPERIENCE.md 5.7)", () =>
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
            "kept", "kept", "kept", "kept", "kept", "kept", "kept", "kept", "filter", "filter", "text", "filter",
            "kept"]);
        expect(root.children.map((r) => (r.kind === "kept" ? r.what : null))).toEqual([
            "A search inside rel.parent_of", "A comparison of two variables", "A filter with a link condition",
            "A filter with a value this builder has no editor for",
            "A filter with a value this builder has no editor for", "A filter on a variable",
            "A filter on note, which has no facet", "A filter with the operator Matches", null, null, null, null,
            "A filter with a link condition"]);
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
    const row = (path: string): HTMLElement => container.querySelector(`[data-path="${path}"]`)!;
    const control = (path: string, role: string): HTMLInputElement =>
        Array.from(row(path).querySelectorAll<HTMLInputElement>(`[data-role="${role}"]`))
            .find((e) => e.closest("[data-path]") === row(path))!;
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

        control("", "add-filter").click();
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

    test("Alt+ArrowDown moves the row and keeps the focus on the same control, and the buttons do the same", () =>
    {
        const { onChange } = make(APPS_TREE);
        control("0", "op").focus();

        control("0", "op")
            .dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", altKey: true, bubbles: true }));

        expect(control("1", "key").value).toBe("type");
        expect(document.activeElement).toBe(control("1", "op"));
        expect(onChange).toHaveBeenCalledTimes(1);

        control("1", "up").click();
        expect(control("0", "key").value).toBe("type");
        // Move up is off at the top, so the focus stays in the row, on its first control.
        expect(control("0", "up").disabled).toBe(true);
        expect(document.activeElement!.closest("[data-path]")).toBe(row("0"));
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

    test("a group joins its rows by any or all, and can be taken apart", () =>
    {
        const { eb, onChange } = make(APPS_TREE);

        control("0", "wrap").click();
        expect(row("0").classList.contains("expressionbuilder-group")).toBe(true);
        choose(control("0", "op"), "or");
        expect(eb.getTree().root!.children![0])
            .toMatchObject({ kind: "or", children: [{ kind: "filter", key: "type" }] });
        // A group of one means what its row means, so the query did not change.
        expect(onChange).not.toHaveBeenCalled();

        control("0", "unwrap").click();
        expect(row("0").classList.contains("expressionbuilder-row-filter")).toBe(true);
    });

    test("removing a row moves the focus to the row that took its place", () =>
    {
        const { eb } = make(APPS_TREE);

        control("0", "remove").click();

        expect(eb.getTree()).toEqual({ root: f("created_at", "On", { date: "2026-11-15", zone: "Asia/Kolkata" }) });
        expect(document.activeElement!.closest("[data-path]")).toBe(row("0"));
    });

    test("a kept part is read-only, says what it is, and still moves and goes", () =>
    {
        const nested: QueryNode = { kind: "nested", key: "rel.parent_of", where: f("type", "Equals", { text: "x" }) };
        const { eb } = make({ root: { kind: "and", children: [f("title", "Contains", { text: "a" }), nested] } });

        expect(row("1").textContent).toContain("A search inside rel.parent_of. Edit this in the search bar.");
        expect(row("1").querySelector("input, select")).toBeNull();
        control("1", "up").click();
        expect(eb.getTree().root!.children![0]).toEqual(nested);
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
