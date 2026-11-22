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

        expect(row("1").textContent)
            .toContain("A search inside rel.parent_of, which is not a relationship key. Edit this in the search bar.");
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
    const row = (path: string): HTMLElement => container.querySelector(`[data-path="${path}"]`)!;
    const control = (path: string, role: string): HTMLInputElement =>
        Array.from(row(path).querySelectorAll<HTMLInputElement>(`[data-role="${role}"]`))
            .find((e) => e.closest("[data-path]") === row(path))!;
    const choose = (el: HTMLInputElement, value: string): void =>
    {
        el.value = value;
        el.dispatchEvent(new Event("change", { bubbles: true }));
    };
    const optionTexts = (el: HTMLInputElement): string[] =>
        Array.from((el as unknown as HTMLSelectElement).options).map((o) => o.textContent ?? "");

    test("\"the same item as\" makes one variable for both conditions, and removing one makes the other a draft", () =>
    {
        const { eb, onChange } = make();

        control("", "add-filter").click();
        choose(control("0", "key"), "rel.created_by");
        control("", "add-filter").click();
        choose(control("1", "key"), "rel.completed_by");
        expect(optionTexts(control("1", "same"))).toEqual(["a value", "the same item as Created by"]);

        choose(control("1", "same"), "row:0");

        expect(onChange.mock.calls.at(-1)![0]).toEqual({ root: { kind: "and", children: [
            rel("rel.created_by", v("created_by")), rel("rel.completed_by", v("created_by"))] } });
        expect(control("0", "same").value).toBe("var:created_by");
        expect(row("1").querySelector("[data-role='value-0']")).toBeNull();

        control("0", "remove").click();

        expect(row("0").textContent).toContain("Needs a second use of ?created_by");
        expect(eb.getTree()).toEqual({});
    });

    test("\"has one where\" opens a search inside, and a condition there makes a nested search", () =>
    {
        const { onChange } = make({ root: rel("rel.belongs_to_org_unit", v("org")) });

        control("", "add-filter").click();
        choose(control("1", "key"), "rel.signed_off_by");
        choose(control("1", "op"), "where");
        expect(row("1").textContent).toContain("Needs a condition inside");
        expect(row("1.where")).not.toBeNull();

        control("1.where", "add-filter").click();
        choose(control("1.where.0", "key"), "rel.member_of");
        control("1.where.0", "not").click();
        choose(control("1.where.0", "same"), "var:org");

        // A search inside of one condition is that condition, as Print writes it.
        expect(onChange.mock.calls.at(-1)![0]).toEqual({ root: { kind: "and", children: [
            rel("rel.belongs_to_org_unit", v("org")),
            { kind: "nested", key: "rel.signed_off_by",
                where: { kind: "not", child: rel("rel.member_of", v("org")) } }] } });
    });

    test("link conditions use the link's fields, and go with their own button", () =>
    {
        const { eb } = make();

        control("", "add-filter").click();
        choose(control("0", "key"), "rel.signed_off_by");
        control("0", "add-link").click();
        expect(document.activeElement).toBe(control("0.link", "add-filter"));
        expect(control("0.link", "add-text")).toBeUndefined();

        control("0.link", "add-filter").click();
        expect(optionTexts(control("0.link.0", "key"))).toEqual(["Choose a key", "Provenance", "Made"]);
        choose(control("0.link.0", "key"), "provenance");
        choose(control("0.link.0", "value-0"), "manual");
        choose(control("0", "value-0"), "6f1c");

        expect(eb.getTree()).toEqual({ root: { ...rel("rel.signed_off_by", { resource: "6f1c" }),
            link: rel("provenance", { text: "manual" }) } });

        control("0.link", "remove-link").click();
        expect(eb.getTree()).toEqual({ root: rel("rel.signed_off_by", { resource: "6f1c" }) });
    });

    test("a comparison is offered once the query has two variables, and compares them", () =>
    {
        const tree = EXAMPLES[1][1];
        const { eb } = make(EXAMPLES[0][1]);

        // One variable, ?p: nothing to compare it with.
        expect(control("", "add-compare")).toBeUndefined();
        eb.setParsed({ tree: { root: { kind: "and", children: [...tree.root!.children!.slice(0, 2),
            rel("rel.created_by", v("doer")), rel("rel.member_of", v("approver"))] } } });
        control("", "add-compare").click();
        choose(control("4", "left"), "approver");
        choose(control("4", "right"), "doer");

        expect(eb.getTree().root!.children![4])
            .toEqual({ kind: "compare", left: v("approver"), op: "NotEquals", right: v("doer") });
    });

    test("a warning lands on the row inside a where or a link whose text holds it", () =>
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

        expect(row("1.link.0").classList.contains("expressionbuilder-has-warning")).toBe(true);
        expect(row("1.where.0").classList.contains("expressionbuilder-has-warning")).toBe(true);
        expect(row("1").querySelectorAll(".expressionbuilder-problem")).toHaveLength(2);
    });

    test("the same tree back with spans gives them to the rows in text order, a draft's link rows left out", () =>
    {
        const text = "rel.belongs_to_org_unit:?org rel.signed_off_by link ( provenance:manual at after 2026-11-01 ) "
            + "where ( -rel.member_of:?org ) title";
        const span = (s: string) => ({ start: text.indexOf(s), end: text.indexOf(s) + s.length });
        const sent = EXAMPLES[3][1];
        const { eb } = make(sent);
        // A draft with a complete link condition comes first, and none of its rows are in the tree.
        control("", "add-filter").click();
        choose(control("2", "key"), "rel.signed_off_by");
        control("2", "add-link").click();
        control("2.link", "add-filter").click();
        choose(control("2.link.0", "key"), "provenance");
        choose(control("2.link.0", "value-0"), "ai");
        control("2", "up").click();
        control("1", "up").click();
        expect(control("0", "key").value).toBe("rel.signed_off_by");

        const nested = sent.root!.children![1];
        eb.setParsed({ tree: { root: { kind: "and", children: [
            { ...sent.root!.children![0], span: span("rel.belongs_to_org_unit:?org") },
            { ...nested, span: span("rel.signed_off_by"),
                link: { kind: "and", span: span("provenance:manual at after 2026-11-01"), children: [
                    { ...nested.link!.children![0], span: span("provenance:manual") },
                    { ...nested.link!.children![1], span: span("at after 2026-11-01") }] },
                where: { ...nested.where!, span: span("-rel.member_of:?org") } },
        ] } }, warnings: [
            { code: "QL_A", title: "Date", detail: "A.", ...span("2026-11-01") },
            { code: "QL_B", title: "Across the link", detail: "B.", ...span("manual at") },
            { code: "QL_C", title: "Inside", detail: "C.", ...span("member_of") },
        ] });

        // The draft at row 0 took no span, so each warning lands where its text is.
        expect(row("2.link.1").querySelector(".expressionbuilder-problem-text")!.textContent).toBe("Date. A.");
        expect(row("2.link").querySelector(":scope > .expressionbuilder-problem .expressionbuilder-problem-text")!
            .textContent).toBe("Across the link. B.");
        expect(row("2.where.0").querySelector(".expressionbuilder-problem-text")!.textContent).toBe("Inside. C.");
        expect(row("0").querySelector(".expressionbuilder-problem")).toBeNull();
    });

    test("a search inside back from the bar as one bare condition keeps the rows and the focus", () =>
    {
        const { eb } = make(EXAMPLES[2][1]);
        const op = control("1", "op");
        op.focus();

        eb.setParsed({ tree: { root: { kind: "and", children: [rel("rel.belongs_to_org_unit", v("org")),
            { kind: "nested", key: "rel.signed_off_by",
                where: { kind: "and", children: [{ kind: "not", child: rel("rel.member_of", v("org")) }] } }] } } });

        expect(control("1", "op")).toBe(op);
        expect(document.activeElement).toBe(op);
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
