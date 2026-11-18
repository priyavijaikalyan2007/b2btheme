/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * TESTS: FacetSearch
 * Vitest unit tests for the FacetSearch component.
 * Covers: factory, options, DOM structure, ARIA, query parsing,
 * chips, facet API, callbacks, and edge cases.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import
{
    FacetSearch,
    createFacetSearch,
    parseFacetQuery,
} from "./facetsearch";
import type
{
    FacetSearchOptions,
    FacetDefinition,
    FacetSearchQuery,
    QueryValue,
} from "./facetsearch";
// The query syntax suggests zones with the picker's search, which this publishes as window.searchTimezones.
import "../timezonepicker/timezonepicker";
// The query syntax colors its text with window.colorQuery, which this publishes (#205).
import "../querylanguage/querylanguage";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLElement;

function makeFacets(): FacetDefinition[]
{
    return [
        { key: "status", label: "Status", valueType: "enum", values: ["open", "closed"] },
        { key: "author", label: "Author", valueType: "text" },
        { key: "priority", label: "Priority", valueType: "enum", values: ["low", "medium", "high"] },
    ];
}

function makeOptions(
    overrides?: Partial<FacetSearchOptions>
): FacetSearchOptions
{
    return {
        facets: makeFacets(),
        ...overrides,
    };
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "test-facetsearch";
    document.body.appendChild(container);
});

afterEach(() =>
{
    document.body.innerHTML = "";
});

// ============================================================================
// FACTORY — createFacetSearch
// ============================================================================

describe("createFacetSearch", () =>
{
    test("mountsInContainer", () =>
    {
        const fs = createFacetSearch("test-facetsearch", makeOptions());
        expect(container.children.length).toBeGreaterThan(0);
        fs.destroy();
    });

    test("returnsFacetSearchInstance", () =>
    {
        const fs = createFacetSearch("test-facetsearch", makeOptions());
        expect(fs).toBeInstanceOf(FacetSearch);
        fs.destroy();
    });
});

// ============================================================================
// PARSER — parseFacetQuery (pure function)
// ============================================================================

describe("parseFacetQuery", () =>
{
    test("parsesSimpleFacetExpression", () =>
    {
        const result = parseFacetQuery("status:open", makeFacets());
        expect(result.facets.length).toBe(1);
        expect(result.facets[0].key).toBe("status");
        expect(result.facets[0].value).toBe("open");
    });

    test("parsesFreeText", () =>
    {
        const result = parseFacetQuery("hello world", makeFacets());
        expect(result.text).toBe("hello world");
        expect(result.facets.length).toBe(0);
    });

    test("parsesMixedFacetAndFreeText", () =>
    {
        const result = parseFacetQuery("status:open search text", makeFacets());
        expect(result.facets.length).toBe(1);
        expect(result.text).toContain("search");
    });

    test("handlesNegatedFacet", () =>
    {
        const result = parseFacetQuery("-status:open", makeFacets());
        expect(result.facets.length).toBe(1);
        expect(result.facets[0].negated).toBe(true);
    });

    test("handlesEmptyString", () =>
    {
        const result = parseFacetQuery("", makeFacets());
        expect(result.facets.length).toBe(0);
        expect(result.text).toBe("");
    });
});

// ============================================================================
// DOM STRUCTURE
// ============================================================================

describe("DOM structure", () =>
{
    test("rendersSearchInput", () =>
    {
        const fs = createFacetSearch("test-facetsearch", makeOptions());
        const input = container.querySelector("input");
        expect(input).not.toBeNull();
        fs.destroy();
    });

    test("rendersClearButton", () =>
    {
        const fs = createFacetSearch("test-facetsearch", makeOptions({
            value: "status:open",
        }));
        const clear = container.querySelector("[class*='clear']");
        expect(clear).not.toBeNull();
        fs.destroy();
    });
});

// ============================================================================
// ARIA / ACCESSIBILITY
// ============================================================================

describe("accessibility", () =>
{
    test("inputHasComboboxRole", () =>
    {
        const fs = createFacetSearch("test-facetsearch", makeOptions());
        const input = container.querySelector("input");
        expect(input?.getAttribute("role")).toBe("searchbox");
        fs.destroy();
    });

    test("liveRegionExists", () =>
    {
        const fs = createFacetSearch("test-facetsearch", makeOptions());
        const live = container.querySelector("[aria-live]");
        expect(live).not.toBeNull();
        fs.destroy();
    });
});

// ============================================================================
// PUBLIC API
// ============================================================================

describe("public API", () =>
{
    // "ReturnsCurrentValue" names the value. `getValue` rebuilds the
    // raw string from the chips and the input, so a round trip is
    // the claim: what went in comes back out.
    test("getValue_ReturnsCurrentValue", () =>
    {
        const fs = createFacetSearch("test-facetsearch", makeOptions({
            value: "status:open",
        }));

        expect(fs.getValue()).toBe("status:open");
        fs.destroy();
    });

    test("clear_ResetsValueAndChips", () =>
    {
        const fs = createFacetSearch("test-facetsearch", makeOptions({
            value: "status:open",
        }));
        fs.clear();
        expect(fs.getValue()).toBe("");
        fs.destroy();
    });

    // STRUCTURED is the word the title uses and `raw` is the one
    // field that is NOT structure -- it is the string the parse ran
    // against. The free text and the parsed facet are the claim.
    test("getQuery_ReturnsStructuredQuery", () =>
    {
        const fs = createFacetSearch("test-facetsearch", makeOptions({
            value: "status:open hello",
        }));

        const query: FacetSearchQuery = fs.getQuery();

        expect(query.raw).toBe("status:open hello");
        expect(query.text).toBe("hello");
        expect(query.facets).toMatchObject([{ key: "status", value: "open" }]);
        fs.destroy();
    });
});

// ============================================================================
// LIFECYCLE
// ============================================================================

describe("lifecycle", () =>
{
    test("hide_RemovesFromDOM", () =>
    {
        const fs = createFacetSearch("test-facetsearch", makeOptions());
        fs.hide();
        expect(container.children.length).toBe(0);
        fs.destroy();
    });

    test("destroy_CleansUp", () =>
    {
        const fs = createFacetSearch("test-facetsearch", makeOptions());
        fs.destroy();
        expect(fs.getElement()).toBeNull();
    });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe("edge cases", () =>
{
    test("missingContainer_Throws", () =>
    {
        // ERR-1. This case asserted the defect: a container that is
        // not there used to be logged and walked past. AGENTS.md
        // calls that returning a null object.
        const fs = new FacetSearch(makeOptions());
        expect(() => fs.show("nonexistent")).toThrow(/was not found/);
        fs.destroy();
    });

    test("emptyFacets_StillRenders", () =>
    {
        const fs = createFacetSearch("test-facetsearch", makeOptions({
            facets: [],
        }));
        expect(fs.getElement()).not.toBeNull();
        fs.destroy();
    });
});

// ============================================================================
// SURFACE CONTRACT (readiness step 2 B6): additive on("search"),
// getState/setState and setData. onSearch keeps firing first, exactly once.
// ============================================================================

describe("surface contract (B6)", () =>
{
    function pressEnter(fs: { getElement(): HTMLElement | null }): void
    {
        const input = fs.getElement()!.querySelector("input") as HTMLInputElement;
        input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    }

    test("on(search)_AfterOnSearch_ExactlyOnce_ThenUnsubscribes", () =>
    {
        const order: string[] = [];
        const fs = createFacetSearch("test-facetsearch", makeOptions({
            value: "status:open hello",
            onSearch: (q) => order.push(`option:${q.raw}`),
        }));
        const off = fs.on("search", (q) => order.push(`channel:${(q as FacetSearchQuery).raw}`));

        pressEnter(fs);
        off();
        pressEnter(fs);

        expect(order).toEqual([
            "option:status:open hello",
            "channel:status:open hello",
            "option:status:open hello",
        ]);
        fs.destroy();
    });

    test("on(search)_WithoutOnSearch_StillEmitsTheQuery", () =>
    {
        const heard = vi.fn();
        const fs = createFacetSearch("test-facetsearch", makeOptions({ value: "status:open hello" }));
        fs.on("search", heard);

        pressEnter(fs);

        expect(heard).toHaveBeenCalledTimes(1);
        expect(heard).toHaveBeenCalledWith({
            text: "hello",
            facets: [{ key: "status", operator: ":", value: "open", negated: false }],
            raw: "status:open hello",
        });
        fs.destroy();
    });

    test("on(search)_PayloadIsAJsonCopy_NotTheOnSearchObject", () =>
    {
        let optionQuery: FacetSearchQuery | undefined;
        let payload: FacetSearchQuery | undefined;
        const fs = createFacetSearch("test-facetsearch", makeOptions({
            value: "status:open hello",
            onSearch: (q) => { optionQuery = q; },
        }));
        fs.on("search", (q) => { payload = q as FacetSearchQuery; });

        pressEnter(fs);

        expect(payload).toEqual(optionQuery);
        expect(payload).not.toBe(optionQuery);
        expect(payload!.facets).not.toBe(optionQuery!.facets);
        expect(JSON.parse(JSON.stringify(payload))).toEqual(payload);
        fs.destroy();
    });

    test("on(search)_ThrowingHandler_DoesNotStopOthers", () =>
    {
        const heard = vi.fn();
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
        const fs = createFacetSearch("test-facetsearch", makeOptions({ value: "hello" }));
        fs.on("search", () => { throw new Error("boom"); });
        fs.on("search", heard);

        pressEnter(fs);

        expect(heard).toHaveBeenCalledTimes(1);
        errorSpy.mockRestore();
        fs.destroy();
    });

    test("on(search)_NoEmit_WhenSubmitOnEnterIsFalse", () =>
    {
        const heard = vi.fn();
        const fs = createFacetSearch("test-facetsearch", makeOptions({ value: "hello", submitOnEnter: false }));
        fs.on("search", heard);

        pressEnter(fs);

        expect(heard).not.toHaveBeenCalled();
        fs.destroy();
    });

    test("destroy_ClearsHandlers", () =>
    {
        const heard = vi.fn();
        const fs = new FacetSearch(makeOptions({ value: "hello" }));
        fs.show("test-facetsearch");
        fs.on("search", heard);
        const el = fs.getElement()!;
        const input = el.querySelector("input") as HTMLInputElement;

        fs.destroy();
        input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

        expect(heard).not.toHaveBeenCalled();
    });

    test("on_UnknownChannel_Throws", () =>
    {
        const fs = createFacetSearch("test-facetsearch", makeOptions());

        expect(() => fs.on("bogus", () => undefined)).toThrow(/"search"/);
        fs.destroy();
    });

    test("setData_Throws", () =>
    {
        const fs = createFacetSearch("test-facetsearch", makeOptions());

        expect(() => fs.setData("value", "x")).toThrow(/FacetSearch.*no data slots.*setValue/);
        fs.destroy();
    });

    test("getState_SetState_RoundTripValue", () =>
    {
        const fs = createFacetSearch("test-facetsearch", makeOptions({ value: "status:open hello" }));
        const captured = fs.getState();

        expect(captured).toEqual({ value: "status:open hello" });
        fs.setValue("author:ann");
        expect(fs.getState()).toEqual({ value: "author:ann" });

        fs.setState(captured);
        expect(fs.getState()).toEqual(captured);
        expect(fs.getValue()).toBe("status:open hello");
        expect(JSON.parse(JSON.stringify(captured))).toEqual(captured);
        fs.destroy();
    });
});

// ============================================================================
// LABELLED VALUES (apps report 2026-11-09)
// ============================================================================

describe("values with labels: the chip shows the label, the query keeps the value", () =>
{
    const TYPES = [{ value: "thinker.session", label: "Brainstorm Session" },
        { value: "diagram.flow", label: "Flow Diagram" }, "plain"];
    const facets = (extra: Partial<FacetDefinition> = {}): FacetDefinition[] =>
        [{ key: "type", label: "Type", valueType: "enum", values: TYPES, ...extra }];

    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); });

    const chipTexts = () => Array.from(container.querySelectorAll(".facetsearch-chip-text"))
        .map((el) => el.textContent);
    const items = () => Array.from(container.querySelectorAll(".facetsearch-dropdown-item")).map((el) => [
        el.querySelector(".facetsearch-dropdown-item-label")?.textContent,
        el.querySelector(".facetsearch-dropdown-item-hint")?.textContent ?? null]);

    async function typeIn(fs: FacetSearch, text: string): Promise<HTMLInputElement>
    {
        const input = fs.getElement()!.querySelector("input")!;
        input.value = text;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        await vi.advanceTimersByTimeAsync(300);
        return input;
    }

    test("the dropdown shows labels, with the value beside a label that differs, and matches either", async () =>
    {
        const fs = createFacetSearch("test-facetsearch", { facets: facets() });

        await typeIn(fs, "type:");
        expect(items()).toEqual([["Brainstorm Session", "thinker.session"], ["Flow Diagram", "diagram.flow"],
            ["plain", null]]);

        await typeIn(fs, "type:brainstorm");
        expect(items()).toEqual([["Brainstorm Session", "thinker.session"]]);
        await typeIn(fs, "type:diagram.");
        expect(items()).toEqual([["Flow Diagram", "diagram.flow"]]);
        fs.destroy();
    });

    test("picking a labelled value makes a chip that shows the label, and the query reports the value", async () =>
    {
        const onSearch = vi.fn();
        const fs = createFacetSearch("test-facetsearch", { facets: facets(), onSearch });
        const input = await typeIn(fs, "type:");

        input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
        input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
        input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

        expect(chipTexts()).toEqual(["type:Brainstorm Session"]);
        expect(fs.getValue()).toBe("type:thinker.session");
        expect(fs.getQuery().facets).toEqual([expect.objectContaining({ value: "thinker.session",
            label: "Brainstorm Session" })]);
        expect(onSearch.mock.calls[0][0].facets[0].value).toBe("thinker.session");
        fs.destroy();
    });

    test("a typed or restored value takes its known label; an unknown or plain one shows the value", () =>
    {
        const fs = createFacetSearch("test-facetsearch", { facets: facets() });

        fs.setValue("type:thinker.session");
        expect(chipTexts()).toEqual(["type:Brainstorm Session"]);
        fs.setValue("type:plain");
        expect(chipTexts()).toEqual(["type:plain"]);
        fs.setValue("type:unknown.kind");
        expect(chipTexts()).toEqual(["type:unknown.kind"]);
        fs.destroy();
    });

    test("labels from loadValues are learned, so a later typed value shows its label", async () =>
    {
        const loadValues = vi.fn().mockResolvedValue([{ value: "u42", label: "Olive Owner" }]);
        const fs = createFacetSearch("test-facetsearch",
            { facets: [{ key: "owner", label: "Owner", valueType: "text", loadValues }] });

        await typeIn(fs, "owner:ol");
        expect(items()).toEqual([["Olive Owner", "u42"]]);

        fs.setValue("owner:u42");
        expect(chipTexts()).toEqual(["owner:Olive Owner"]);
        expect(fs.getValue()).toBe("owner:u42");
        fs.destroy();
    });

    test("addFacet takes an optional label, else the known one", () =>
    {
        const fs = createFacetSearch("test-facetsearch", { facets: facets({ multiple: true }) });

        fs.addFacet("type", "x.custom", "Custom Thing");
        fs.addFacet("type", "diagram.flow");
        fs.addFacet("type", "other");

        expect(chipTexts()).toEqual(["type:Custom Thing", "type:Flow Diagram", "type:other"]);
        expect(fs.getValue()).toBe("type:x.custom type:diagram.flow type:other");
        fs.destroy();
    });

    test("string values behave as before: no label, no hint", async () =>
    {
        const fs = createFacetSearch("test-facetsearch", makeOptions());

        await typeIn(fs, "status:");
        expect(items()).toEqual([["open", null], ["closed", null]]);
        fs.setValue("status:open");
        expect(chipTexts()).toEqual(["status:open"]);
        expect(fs.getFacets()).toEqual([{ key: "status", operator: ":", value: "open", negated: false }]);
        fs.destroy();
    });
});

// ============================================================================
// CHIP EDITING (apps report 2026-11-09, knobbyio/apps#375)
// ============================================================================

describe("quotes in a value, removing one chip, and labels learned later", () =>
{
    const chipTexts = () => Array.from(container.querySelectorAll(".facetsearch-chip-text"))
        .map((el) => el.textContent);

    test("a value with a quote is written so it reads back as the same value", () =>
    {
        const fs = createFacetSearch("test-facetsearch", makeOptions());

        fs.addFacet("author", 'say "hi"');
        expect(fs.getValue()).toBe('author:"say \\"hi\\""');
        expect(parseFacetQuery(fs.getValue(), makeFacets()).facets.map((f) => f.value)).toEqual(['say "hi"']);

        fs.setValue(fs.getValue());
        expect(fs.getFacets().map((f) => f.value)).toEqual(['say "hi"']);
        fs.destroy();
    });

    test("a value with a quote and no space is quoted too; a plain value is not", () =>
    {
        const fs = createFacetSearch("test-facetsearch", makeOptions());

        fs.addFacet("author", 'o"neil');
        expect(fs.getValue()).toBe('author:"o\\"neil"');
        fs.removeFacet("author");
        fs.addFacet("author", "ada");
        expect(fs.getValue()).toBe("author:ada");
        fs.destroy();
    });

    test("a backslash in a quoted value is written \\\\, so a value ending in one keeps its closing quote", () =>
    {
        const fs = createFacetSearch("test-facetsearch", makeOptions());

        for (const value of ["a b\\", "C:\\Users\\x y", 'mix \\"quoted\\" end'])
        {
            fs.addFacet("author", value);
            expect(parseFacetQuery(fs.getValue() + " tail", makeFacets()))
                .toEqual(expect.objectContaining({ facets: [expect.objectContaining({ value })], text: "tail" }));
            fs.removeFacet("author");
        }
        fs.destroy();
    });

    test("a single backslash before another character in typed text is itself", () =>
    {
        expect(parseFacetQuery('author:"C:\\Users"', makeFacets()).facets[0].value).toBe("C:\\Users");
    });

    test("removeFacet with a value removes only that chip, and fires onFacetRemove once", () =>
    {
        const onFacetRemove = vi.fn();
        const facets = makeFacets().map((f) => (f.key === "status" ? { ...f, multiple: true } : f));
        const fs = createFacetSearch("test-facetsearch", { facets, onFacetRemove });
        fs.addFacet("status", "open");
        fs.addFacet("status", "closed");

        fs.removeFacet("status", "closed");
        expect(fs.getValue()).toBe("status:open");
        expect(onFacetRemove.mock.calls).toEqual([["status"]]);

        fs.removeFacet("status", "missing");
        expect(onFacetRemove).toHaveBeenCalledTimes(1);

        fs.addFacet("status", "closed");
        fs.removeFacet("status");
        expect(fs.getValue()).toBe("");
        expect(onFacetRemove).toHaveBeenCalledTimes(2);
        fs.destroy();
    });

    test("learnLabels relabels the chips at once, fires nothing, and keeps focus and the typed text", () =>
    {
        const onChange = vi.fn();
        const onFacetAdd = vi.fn();
        const onFacetRemove = vi.fn();
        const fs = createFacetSearch("test-facetsearch", { ...makeOptions(), onChange, onFacetAdd, onFacetRemove });
        fs.setValue("author:u42");
        const input = fs.getElement()!.querySelector("input")!;
        input.value = "draft text";
        input.focus();
        onChange.mockClear();

        fs.learnLabels("author", [{ value: "u42", label: "Olive Owner" }, "plain"]);

        expect(chipTexts()).toEqual(["author:Olive Owner"]);
        expect(fs.getValue()).toBe("author:u42 draft text");
        expect(input.value).toBe("draft text");
        expect(document.activeElement).toBe(input);
        expect(onChange).not.toHaveBeenCalled();
        expect(onFacetAdd).not.toHaveBeenCalled();
        expect(onFacetRemove).not.toHaveBeenCalled();
        fs.destroy();
    });

    test("a learned label also applies to a chip added later, and replaces a label addFacet gave", () =>
    {
        const fs = createFacetSearch("test-facetsearch", makeOptions());
        fs.addFacet("author", "u7", "Old Name");

        fs.learnLabels("author", [{ value: "u7", label: "New Name" }, { value: "u9", label: "Nina" }]);
        expect(chipTexts()).toEqual(["author:New Name"]);

        fs.setValue("author:u9");
        expect(chipTexts()).toEqual(["author:Nina"]);
        fs.destroy();
    });

    test("learnLabels for an unknown key warns and changes nothing", () =>
    {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
        const fs = createFacetSearch("test-facetsearch", makeOptions());
        fs.setValue("status:open");

        expect(() => fs.learnLabels("nope", [{ value: "open", label: "Open" }])).not.toThrow();
        expect(chipTexts()).toEqual(["status:open"]);
        warn.mockRestore();
        fs.destroy();
    });
});

// ============================================================================
// THE QUERY LANGUAGE (#204, knobbyio/apps#379)
// ============================================================================

describe("syntax: \"query\", the apps' query language (#204)", () =>
{
    /** The keys of the apps' search page. `type` takes several values, as `multiple: true` does there. */
    function queryFacets(): FacetDefinition[]
    {
        return [
            { key: "type", label: "Type", valueType: "enum", multiple: true,
                values: [{ value: "note", label: "Note" }, "task", "thinker.session"] },
            { key: "created_at", label: "Created", valueType: "date" },
            { key: "within", label: "Folder", valueType: "text" },
            { key: "amount", label: "Amount", valueType: "number" },
        ];
    }

    function make(overrides?: Partial<FacetSearchOptions>): ReturnType<typeof createFacetSearch>
    {
        return createFacetSearch("test-facetsearch", { facets: queryFacets(), syntax: "query", ...overrides });
    }

    function input(): HTMLInputElement
    {
        return container.querySelector("input")!;
    }

    function chipTexts(): string[]
    {
        return Array.from(container.querySelectorAll(".facetsearch-chip-text")).map((c) => c.textContent ?? "");
    }

    /** The answer of the apps' Parse call for `type:note created_at on 2026-11-15`, from their note. */
    const APPS_TEXT = "type:note created_at on 2026-11-15";
    const APPS_TREE = {
        root: {
            kind: "and",
            children: [
                { kind: "filter", key: "type", op: "Equals", value: { text: "note" }, span: { start: 0, end: 9 } },
                { kind: "filter", key: "created_at", op: "On", value: { date: "2026-11-15", zone: "Asia/Kolkata" },
                    span: { start: 10, end: 34 } },
            ],
            span: { start: 0, end: 34 },
        },
        return: [],
    };

    test("theDefault_IsTodaysSyntax_SoNoPageChanges", () =>
    {
        const fs = createFacetSearch("test-facetsearch", { facets: queryFacets(), value: "type:a type:b" });

        expect(fs.getValue()).toBe("type:a type:b");
        expect(() => fs.setParsed({ text: "type:a", tree: { root: { kind: "filter" } } }))
            .toThrow(/syntax: "query"/);
        fs.destroy();
    });

    test("typedText_StaysText_UntilTheHostPassesParsesTree", () =>
    {
        const fs = make({ value: APPS_TEXT });

        expect(input().value).toBe(APPS_TEXT);
        expect(chipTexts()).toEqual([]);
        expect(fs.getValue()).toBe(APPS_TEXT);
        fs.destroy();
    });

    test("parsesTree_DrawsChips_AndTheBarWritesTheAppsStandardSpelling", () =>
    {
        const fs = make({ value: APPS_TEXT });

        expect(fs.setParsed({ text: APPS_TEXT, tree: APPS_TREE })).toBe(true);

        expect(chipTexts()).toEqual(["type:Note", "created_at on 2026-11-15@Asia/Kolkata"]);
        expect(input().value).toBe("");
        // Byte for byte the `text` of the apps' answer.
        expect(fs.getValue()).toBe("type equals \"note\" and created_at on 2026-11-15@Asia/Kolkata");
        expect(fs.getQuery()).toMatchObject({ text: "",
            facets: [{ key: "type", operator: "equals", value: "note", label: "Note" },
                { key: "created_at", operator: "on", value: "2026-11-15@Asia/Kolkata" }] });
        fs.destroy();
    });

    test("whatIsNotAChip_StaysInTheInput_AsTheTextItCameFrom", () =>
    {
        const text = "type:task budget (a or b) -within:x note:urgent";
        const fs = make({ value: text });
        const applied = fs.setParsed({ text, tree: { root: { kind: "and", children: [
            { kind: "filter", key: "type", op: "Equals", value: { text: "task" }, span: { start: 0, end: 9 } },
            { kind: "text", phrase: "budget", span: { start: 10, end: 16 } },
            // A group's span leaves out its brackets, as the apps' parser does.
            { kind: "or", children: [], span: { start: 18, end: 24 } },
            { kind: "not", child: { kind: "filter", key: "within", op: "DescendantOf", value: { text: "x" },
                span: { start: 27, end: 35 } }, span: { start: 26, end: 35 } },
            // A key the bar has no facet for stays text.
            { kind: "filter", key: "note", op: "Equals", value: { text: "urgent" }, span: { start: 36, end: 47 } },
        ] } } });

        expect(applied).toBe(true);
        expect(chipTexts()).toEqual(["type:task", "-within descendant-of x"]);
        expect(input().value).toBe("budget (a or b) note:urgent");
        expect(fs.getValue()).toBe(
            "type equals \"task\" and not within descendant-of \"x\" and budget (a or b) note:urgent");
        fs.destroy();
    });

    test("severalValuesOnAKey_AreOneChipEach_AndWriteIn", () =>
    {
        const fs = make();

        fs.addFacet("type", "note");
        fs.addFacet("type", "task");

        expect(chipTexts()).toEqual(["type:Note", "type:task"]);
        expect(fs.getValue()).toBe("type in (\"note\", \"task\")");

        fs.removeFacet("type", "note");

        expect(fs.getValue()).toBe("type:\"task\"");
        fs.destroy();
    });

    test("parsesIn_DrawsOneChipPerValue_AndRemovingOneKeepsTheOther", () =>
    {
        const text = "type in (note, task)";
        const fs = make({ value: text });

        fs.setParsed({ text, tree: { root: { kind: "filter", key: "type", op: "In",
            values: [{ text: "note" }, { text: "task" }], span: { start: 0, end: 20 } } } });

        expect(chipTexts()).toEqual(["type:Note", "type:task"]);
        expect(fs.getValue()).toBe("type in (\"note\", \"task\")");

        fs.removeFacet("type", "task");

        expect(fs.getValue()).toBe("type in (\"note\")");
        fs.destroy();
    });

    test("theBarsOwnChips_WriteTheKeysDefaultOperator_AndValuesByType", () =>
    {
        const fs = make();

        fs.addFacet("within", "my folder");
        fs.addFacet("created_at", "2026-11-01");
        fs.addFacet("amount", "5");

        // `:` is left for the API, because `within:` means descendant-of. A date or a number is not quoted.
        expect(fs.getValue()).toBe("within:\"my folder\" and created_at:2026-11-01 and amount:5");
        fs.destroy();
    });

    test("typedTextWithOr_NextToChips_IsBracketed_SoItKeepsItsMeaning", () =>
    {
        const fs = make();

        fs.addFacet("type", "note");
        input().value = "budget or \"x or y\" (a or b)";

        expect(fs.getValue()).toBe("type:\"note\" and (budget or \"x or y\" (a or b))");

        // `or` inside quotes, inside brackets or inside a word such as `favor` is not the keyword.
        input().value = "budget \"x or y\" (a or b) favor order";

        expect(fs.getValue()).toBe("type:\"note\" and budget \"x or y\" (a or b) favor order");
        fs.destroy();
    });

    test.each([
        [{ text: "a \"b\" c\\" }, "\"a \\\"b\\\" c\\\\\""],
        [{ number: -2.5 }, "-2.5"],
        [{ boolean: true }, "true"],
        [{ date: "2026-11-15", time: "09:30", zone: "Asia/Kolkata" }, "2026-11-15T09:30@Asia/Kolkata"],
        [{ instant: "2026-11-01T03:30:00Z" }, "2026-11-01T03:30:00Z"],
        [{ relative: { anchor: "now", duration: "-P30D" }, zone: "Asia/Kolkata" }, "-30d@Asia/Kolkata"],
        [{ relative: { anchor: "now", duration: "P2M" } }, "+2mo"],
        [{ relative: { anchor: "now", duration: "PT6H" } }, "+6h"],
        [{ relative: { anchor: "now", duration: "PT0H" } }, "now"],
        [{ relative: { anchor: "today", duration: "P0D" }, zone: "UTC" }, "today@UTC"],
        [{ var: "p" }, "?p"],
        [{ param: "who" }, "$who"],
        [{ resource: "1f0c" }, "\"1f0c\""],
    ] as [QueryValue, string][])("eachValueForm_IsWrittenAsTheAppsPrinterWritesIt %#", (value, written) =>
    {
        const fs = make({ value: "x" });

        fs.setParsed({ text: "x", tree: { root: { kind: "filter", key: "amount", op: "GreaterOrEqual", value,
            span: { start: 0, end: 1 } } } });

        expect(fs.getValue()).toBe("amount greater-or-equal " + written);
        fs.destroy();
    });

    test("setParsed_ChangesNothingTheHostHears", () =>
    {
        const onChange = vi.fn();
        const onFacetAdd = vi.fn();
        const fs = make({ value: APPS_TEXT, onChange, onFacetAdd });

        fs.setParsed({ text: APPS_TEXT, tree: APPS_TREE });

        expect(onChange).not.toHaveBeenCalled();
        expect(onFacetAdd).not.toHaveBeenCalled();
        fs.destroy();
    });

    test("aStaleParse_IsDropped_BecauseTheNewerInputWins", () =>
    {
        const fs = make({ value: APPS_TEXT });

        input().value = APPS_TEXT + " budget";

        expect(fs.setParsed({ text: APPS_TEXT, tree: APPS_TREE })).toBe(false);
        expect(chipTexts()).toEqual([]);
        expect(input().value).toBe(APPS_TEXT + " budget");
        fs.destroy();
    });

    test("aTreeThatCannotBeCarved_LeavesTheTextAlone", () =>
    {
        const withReturn = "type:note return ?p";
        const fs = make({ value: withReturn });

        expect(fs.setParsed({ text: withReturn, tree: { root: APPS_TREE.root.children[0], return: ["p"] } }))
            .toBe(false);
        expect(input().value).toBe(withReturn);

        const noSpan = "budget type:note";

        fs.setValue(noSpan);

        expect(fs.setParsed({ text: noSpan, tree: { root: { kind: "and", children: [
            { kind: "text", phrase: "budget" },
            { kind: "filter", key: "type", op: "Equals", value: { text: "note" }, span: { start: 7, end: 16 } },
        ] } } })).toBe(false);
        expect(input().value).toBe(noSpan);
        expect(chipTexts()).toEqual([]);
        fs.destroy();
    });

    test("aKeyWithOneValue_KeepsASecondFilterOnItAsText", () =>
    {
        const text = "within:a within:b";
        const fs = make({ value: text });

        fs.setParsed({ text, tree: { root: { kind: "and", children: [
            { kind: "filter", key: "within", op: "DescendantOf", value: { text: "a" }, span: { start: 0, end: 8 } },
            { kind: "filter", key: "within", op: "DescendantOf", value: { text: "b" }, span: { start: 9, end: 17 } },
        ] } } });

        expect(chipTexts()).toEqual(["within descendant-of a"]);
        expect(input().value).toBe("within:b");
        fs.destroy();
    });

    test("aLinkAnUnknownValueOrAnUnknownOperator_StaysText_AndNotEqualsIsAChip", () =>
    {
        const text = "a b c type!:x";
        const fs = make({ value: text });

        fs.setParsed({ text, tree: { root: { kind: "and", children: [
            { kind: "filter", key: "type", op: "Equals", value: { text: "a" },
                link: { kind: "text", phrase: "x" }, span: { start: 0, end: 1 } },
            { kind: "filter", key: "type", op: "Equals", value: { shape: "new" } as QueryValue,
                span: { start: 2, end: 3 } },
            { kind: "filter", key: "type", op: "Matches", value: { text: "c" }, span: { start: 4, end: 5 } },
            { kind: "filter", key: "type", op: "NotEquals", value: { text: "x" }, span: { start: 6, end: 13 } },
        ] } } });

        expect(chipTexts()).toEqual(["type not-equals x"]);
        expect(input().value).toBe("a b c");
        expect(fs.getValue()).toBe("type not-equals \"x\" and a b c");
        fs.destroy();
    });

    test("severalValuesWithAnOperatorThatTakesOne_StayText", () =>
    {
        const text = "type:x";
        const fs = make({ value: text });

        expect(fs.setParsed({ text, tree: { root: { kind: "filter", key: "type", op: "Equals",
            values: [{ text: "a" }, { text: "b" }], span: { start: 0, end: 6 } } } })).toBe(true);
        expect(chipTexts()).toEqual([]);
        expect(input().value).toBe("type:x");
        fs.destroy();
    });

    test("enterAndARecentSearch_NeverRunTodaysParser", () =>
    {
        const onSearch = vi.fn();
        const fs = make({ onSearch, showHistory: true });

        input().value = "type:a type:b";
        input().dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

        // Today's parser would make two chips and write `type in (a, b)`, which means "either".
        expect(chipTexts()).toEqual([]);
        expect(onSearch.mock.calls[0][0]).toMatchObject({ raw: "type:a type:b", text: "type:a type:b", facets: [] });
        expect(fs.getQuery()).toMatchObject({ raw: "type:a type:b", facets: [] });
        fs.destroy();
    });
});

// ============================================================================
// THE QUERY LANGUAGE: PROBLEMS FROM PARSE, AND SUGGESTIONS (#206)
// ============================================================================

describe("syntax: \"query\", Parse's problems and the suggestions (#206)", () =>
{
    const FACETS: FacetDefinition[] = [
        { key: "type", label: "Type", valueType: "enum", multiple: true,
            values: [{ value: "note", label: "Note" }, "task"] },
        { key: "created_at", label: "Created", valueType: "date" },
        { key: "amount", label: "Amount", valueType: "number", values: ["5", "10"] },
    ];

    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); });

    function make(overrides?: Partial<FacetSearchOptions>): ReturnType<typeof createFacetSearch>
    {
        return createFacetSearch("test-facetsearch", { facets: FACETS, syntax: "query", ...overrides });
    }

    const input = (): HTMLInputElement => container.querySelector("input")!;
    const message = (): HTMLElement => container.querySelector(".facetsearch-message")!;
    const said = (): string => message().querySelector(".facetsearch-message-text")?.textContent ?? "";
    const live = (): HTMLElement => container.querySelector("[role=status][aria-live]")!;
    /**
     * Each mark behind the input: its severity and the text it underlines. A mark over text of two colors is
     * drawn in two pieces, so pieces next to each other for one problem are read as one.
     */
    const marks = (): string[][] =>
    {
        const rows: string[][] = [];
        let last: Element | null = null;
        for (const m of Array.from(container.querySelectorAll(".facetsearch-mark")))
        {
            const joins = last !== null && m.previousSibling === last && !!m.textContent && !!last.textContent
                && m.getAttribute("data-problem") === last.getAttribute("data-problem");
            if (joins) { rows[rows.length - 1][1] += m.textContent; }
            else
            {
                rows.push([m.classList.contains("facetsearch-mark-error") ? "error" : "warning", m.textContent ?? ""]);
            }
            last = m;
        }
        return rows;
    };
    const chipMarks = (): string[] => Array.from(container.querySelectorAll(".facetsearch-chip")).map((c) =>
        c.classList.contains("facetsearch-chip-error") ? "error"
            : c.classList.contains("facetsearch-chip-warning") ? "warning" : "");

    /** A problem on the bar's value at the first `find`, after `from`. */
    function at(code: string, text: string, find: string, from = 0): { code: string; title: string; detail: string;
        start: number; end: number }
    {
        const start = text.indexOf(find, from);
        return { code, title: code + " title", detail: code + " detail.", start, end: start + find.length };
    }

    async function typeIn(text: string, caret = text.length): Promise<void>
    {
        input().value = text;
        input().setSelectionRange(caret, caret);
        input().dispatchEvent(new Event("input", { bubbles: true }));
        await vi.advanceTimersByTimeAsync(300);
    }

    const items = (): string[][] => Array.from(container.querySelectorAll(".facetsearch-dropdown-item")).map((el) =>
        [el.querySelector(".facetsearch-dropdown-item-label")?.textContent ?? "",
            el.querySelector(".facetsearch-dropdown-item-hint")?.textContent ?? ""]);

    async function pick(label: string): Promise<void>
    {
        const item = Array.from(container.querySelectorAll(".facetsearch-dropdown-item")).find((el) =>
            el.querySelector(".facetsearch-dropdown-item-label")?.textContent === label)!;
        item.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
        await vi.advanceTimersByTimeAsync(300);
    }

    test("needsTheTimezonePicker_ForItsZones_AndSaysSo", () =>
    {
        const search = window.searchTimezones;
        delete window.searchTimezones;
        try
        {
            expect(() => make()).toThrow(/timezonepicker\.js/);
            // Today's syntax suggests no zones, so it needs no picker.
            expect(() => createFacetSearch("test-facetsearch", { facets: FACETS }).destroy()).not.toThrow();
        }
        finally
        {
            window.searchTimezones = search;
        }
    });

    test("anErrorInTheText_IsUnderlined_SaidUnderTheBar_AndAnnounced", async () =>
    {
        const text = "budget (type:";
        const fs = make({ value: text });

        expect(fs.setParsed({ text, errors: [{ code: "QL_UNCLOSED_BRACKET", title: "A bracket is not closed",
            detail: "The `(` at column 8 is never closed.", suggestion: "Add a `)` to close it.",
            start: 7, end: 8 }], warnings: [] })).toBe(false);
        await vi.advanceTimersByTimeAsync(20);

        expect(marks()).toEqual([["error", "("]]);
        expect(container.querySelector(".facetsearch-marks")!.textContent).toBe(text);
        expect(message().hidden).toBe(false);
        expect(message().textContent).toContain("Error: ");
        expect(said()).toBe("A bracket is not closed. The `(` at column 8 is never closed. Add a `)` to close it.");
        expect(input().getAttribute("aria-invalid")).toBe("true");
        expect(input().getAttribute("aria-describedby")).toBe(message().id);
        expect(live().textContent).toBe("1 error in the query. " + said());
        // The text stays as typed.
        expect(input().value).toBe(text);
        fs.destroy();
    });

    test("aRangeInAChip_MarksTheChip_AndARangeAfterTheChips_MapsIntoTheInput", () =>
    {
        const fs = make();
        fs.addFacet("type", "note");
        input().value = "  budget x";
        const text = fs.getValue();

        expect(text).toBe("type:\"note\" and budget x");
        fs.setParsed({ text, errors: [at("QL_A", text, "type")], warnings: [at("QL_B", text, "x")] });

        expect(chipMarks()).toEqual(["error"]);
        expect(container.querySelector(".facetsearch-chip")!.textContent).toContain("(has an error)");
        // The input's two leading spaces are not in the bar's value, and the mark allows for them.
        expect(marks()).toEqual([["warning", "x"]]);
        fs.destroy();
    });

    test("typedTextWithOr_IsBracketedBesideChips_AndAMarkStillLandsOnItsCharacters", () =>
    {
        const fs = make();
        fs.addFacet("type", "note");
        input().value = "a or bee";
        const text = fs.getValue();

        expect(text).toBe("type:\"note\" and (a or bee)");
        fs.setParsed({ text, errors: [at("QL_A", text, "bee"), at("QL_B", text, "(a")] });

        // A range on the `(` the bar added marks from the start of the typed text.
        expect(marks()).toEqual([["error", "a"], ["error", "bee"]]);
        fs.destroy();
    });

    test("inAList_ARangeOnOneValue_MarksItsChip_AndOneOnTheKey_MarksThemAll", () =>
    {
        const fs = make();
        fs.addFacet("type", "note");
        fs.addFacet("type", "task");
        const text = fs.getValue();

        expect(text).toBe("type in (\"note\", \"task\")");
        fs.setParsed({ text, errors: [at("QL_A", text, "\"task\"")] });
        expect(chipMarks()).toEqual(["", "error"]);

        fs.setParsed({ text, warnings: [at("QL_B", text, "type")] });
        expect(chipMarks()).toEqual(["warning", "warning"]);
        fs.destroy();
    });

    test("withATree_EachProblemFollowsItsTextToTheChipOrToWhereTheTextNowIs", () =>
    {
        const text = "type:note typ:x (a or b)";
        const fs = make({ value: text });

        expect(fs.setParsed({ text, tree: { root: { kind: "and", children: [
            { kind: "filter", key: "type", op: "Equals", value: { text: "note" }, span: { start: 0, end: 9 } },
            { kind: "text", phrase: "typ:x", span: { start: 10, end: 15 } },
            { kind: "or", children: [], span: { start: 17, end: 23 } },
        ] } }, warnings: [at("QL_SEARCHED_AS_TEXT", text, "typ:"), at("QL_A", text, "b"),
            at("QL_B", text, "note")] })).toBe(true);

        expect(input().value).toBe("typ:x (a or b)");
        expect(fs.getValue()).toBe("type equals \"note\" and typ:x (a or b)");
        expect(marks()).toEqual([["warning", "typ:"], ["warning", "b"]]);
        expect(chipMarks()).toEqual(["warning"]);
        fs.destroy();
    });

    test("aRangeOverTwoPartsOfText_CoversBoth_AndARangeOnAGroupsBracket_MarksTheGroup", () =>
    {
        const text = "type:note alpha beta (c or d)";
        const fs = make({ value: text });

        fs.setParsed({ text, tree: { root: { kind: "and", children: [
            { kind: "filter", key: "type", op: "Equals", value: { text: "note" }, span: { start: 0, end: 9 } },
            { kind: "text", phrase: "alpha", span: { start: 10, end: 15 } },
            { kind: "text", phrase: "beta", span: { start: 16, end: 20 } },
            { kind: "or", children: [], span: { start: 22, end: 28 } },
        ] } }, warnings: [{ code: "QL_A", title: "A", detail: "A.", start: 12, end: 18 },
            { code: "QL_B", title: "B", detail: "B.", start: 21, end: 22 }] });

        expect(input().value).toBe("alpha beta (c or d)");
        expect(marks()).toEqual([["warning", "pha be"], ["warning", "("]]);
        fs.destroy();
    });

    test("anEmptyRange_IsAMarkOfNoWidth_AndNoPlace_IsSaidOnly", () =>
    {
        const text = "type:";
        const fs = make({ value: text });

        fs.setParsed({ text, errors: [{ code: "QL_A", title: "A value is missing", detail: "Add one.",
            start: 5, end: 5 }, { code: "QL_B", title: "B", detail: "B." }] });

        const empty = container.querySelector(".facetsearch-mark-empty")!;
        expect(empty.textContent).toBe("");
        // The text before it is drawn in its colors, a piece for each.
        let before = "";
        for (let n = empty.previousSibling; n; n = n.previousSibling) { before = n.textContent + before; }
        expect(before).toBe("type:");
        expect(marks()).toEqual([["error", ""]]);
        expect(said()).toBe("A value is missing. Add one.");
        fs.destroy();
    });

    test("anErrorOutranksAWarning_TheCaretAndThePointerChooseTheLine_AndItCounts", () =>
    {
        const text = "budget (type:";
        const fs = make({ value: text });

        fs.setParsed({ text, warnings: [at("QL_W", text, "budget (")], errors: [at("QL_E", text, "(")] });

        // The overlap takes the error, and the line starts on the error.
        expect(marks()).toEqual([["warning", "budget "], ["error", "("]]);
        expect(said()).toBe("QL_E title. QL_E detail.");
        expect(message().querySelector(".facetsearch-message-count")!.textContent).toBe("1 of 2");

        // The caret chooses only while the person is in the input.
        input().setSelectionRange(2, 2);
        input().dispatchEvent(new KeyboardEvent("keyup", { key: "ArrowLeft" }));
        expect(said()).toBe("QL_E title. QL_E detail.");
        input().focus();
        input().dispatchEvent(new KeyboardEvent("keyup", { key: "ArrowLeft" }));
        expect(said()).toBe("QL_W title. QL_W detail.");
        expect(message().classList.contains("facetsearch-message-warning")).toBe(true);
        expect(message().textContent).toContain("Warning: ");
        expect(message().querySelector(".facetsearch-message-count")!.textContent).toBe("2 of 2");

        input().setSelectionRange(8, 8);
        input().dispatchEvent(new KeyboardEvent("keyup", { key: "End" }));
        expect(said()).toBe("QL_E title. QL_E detail.");

        // jsdom gives each mark an empty box at 0, 0, so the pointer there is on the first mark, the warning.
        // The pointer comes before the caret, and while it rests, a caret move does not take the line.
        input().dispatchEvent(new MouseEvent("pointermove", { clientX: 0, clientY: 0 }));
        expect(said()).toBe("QL_W title. QL_W detail.");
        input().dispatchEvent(new KeyboardEvent("keyup", { key: "End" }));
        expect(said()).toBe("QL_W title. QL_W detail.");
        input().dispatchEvent(new MouseEvent("pointerleave"));
        expect(said()).toBe("QL_E title. QL_E detail.");
        fs.destroy();
    });

    test("typingDropsTheMarks_AndTheSameProblemsAreAnnouncedOnce", async () =>
    {
        const text = "budget (";
        const fs = make({ value: text });
        const parse = { text, errors: [at("QL_E", text, "(")] };

        fs.setParsed(parse);
        await vi.advanceTimersByTimeAsync(20);
        expect(live().textContent).toContain("1 error in the query.");

        input().dispatchEvent(new Event("input", { bubbles: true }));
        expect(marks()).toEqual([]);
        expect(message().hidden).toBe(true);
        expect(input().hasAttribute("aria-invalid")).toBe(false);
        expect(input().hasAttribute("aria-describedby")).toBe(false);

        live().textContent = "";
        fs.setParsed(parse);
        await vi.advanceTimersByTimeAsync(20);
        expect(marks()).toEqual([["error", "("]]);
        expect(live().textContent).toBe("");

        fs.setParsed({ text, warnings: [at("QL_W", text, "budget")] });
        await vi.advanceTimersByTimeAsync(20);
        expect(live().textContent).toBe("1 warning in the query. QL_W title. QL_W detail.");
        expect(input().hasAttribute("aria-invalid")).toBe(false);
        fs.destroy();
    });

    test.each([
        ["setValue", (fs: FacetSearch) => fs.setValue("x")],
        ["clear", (fs: FacetSearch) => fs.clear()],
        ["addFacet", (fs: FacetSearch) => fs.addFacet("type", "task")],
        ["removeFacet", (fs: FacetSearch) => fs.removeFacet("type")],
    ])("%s drops the problems, whose places no longer hold", (_name, change) =>
    {
        const fs = make() as FacetSearch;
        fs.addFacet("type", "note");
        const text = fs.getValue();
        fs.setParsed({ text, errors: [at("QL_E", text, "type")] });

        change(fs);

        expect(chipMarks().filter(Boolean)).toEqual([]);
        expect(message().hidden).toBe(true);
        fs.destroy();
    });

    test("aParseOfOlderText_ShowsNoProblems", () =>
    {
        const fs = make({ value: "budget" });

        expect(fs.setParsed({ text: "budge", errors: [at("QL_E", "budge", "b")] })).toBe(false);
        expect(marks()).toEqual([]);
        expect(message().hidden).toBe(true);
        fs.destroy();
    });

    test("todaysSyntax_HasNoMarkLayerAndNoMessageLine", () =>
    {
        const fs = createFacetSearch("test-facetsearch", { facets: FACETS });

        expect(container.querySelector(".facetsearch-marks")).toBeNull();
        expect(container.querySelector(".facetsearch-message")).toBeNull();
        expect(input().parentElement!.classList.contains("facetsearch-bar")).toBe(true);
        fs.destroy();
    });

    test.each([
        ["a key", "typ", "keys"],
        ["a value after `key:`", "-type:t", "values"],
        ["a value after a joined `>=`, read whole", "amount>=1", "values"],
        ["a value after a word operator", "budget type equals ", "values"],
        ["a value after a short form", "amount gte ", "values"],
        ["a value after a symbol written apart", "amount >= ", "values"],
        ["a value in a list", "type in (note, t", "values"],
        ["a key after a value", "type equals note ty", "keys"],
        ["a key after `exists`, which takes no value", "type exists ", "keys"],
        ["a zone after a date", "created_at on 2026-11-15@kol", "zones"],
        ["a zone after a relative date", "created_at after -7d@kol", "zones"],
        ["a zone after `zone:`", "zone:kol", "zones"],
        ["nothing inside quotes", "type:\"no", "none"],
    ])("the caret in %s (%s) suggests %s", async (_name, text, expected) =>
    {
        const fs = make();
        await typeIn(text);

        const header = container.querySelector(".facetsearch-dropdown-header")?.textContent ?? "";
        const shown = (container.querySelector(".facetsearch-dropdown") as HTMLElement).style.display !== "none";
        const kind = !shown ? "none" : header === "Facets" ? "keys" : header === "Time zones" ? "zones"
            : header.endsWith(" values") ? "values" : "other: " + header;
        expect(kind).toBe(expected);
        fs.destroy();
    });

    test("zones_ComeFromThePickersSearch_ByCity_AndAPickWritesTheIanaName", async () =>
    {
        const onChange = vi.fn();
        make({ onChange });
        await typeIn("created_at on 2026-11-15@kol and x", "created_at on 2026-11-15@kol".length);

        expect(items()[0][0]).toBe("Asia/Kolkata");
        expect(items()[0][1]).toBe(window.searchTimezones!("Asia/Kolkata")[0].offset);
        await pick("Asia/Kolkata");

        // The text after the caret is kept.
        expect(input().value).toBe("created_at on 2026-11-15@Asia/Kolkata  and x");
        expect(input().selectionStart).toBe("created_at on 2026-11-15@Asia/Kolkata ".length);
        expect(onChange).toHaveBeenLastCalledWith("created_at on 2026-11-15@Asia/Kolkata  and x");
    });

    test.each([
        ["after `key:`", "type:no", "Note", "type:\"note\" "],
        ["after a word operator", "type equals ", "task", "type equals \"task\" "],
        ["in a list", "type in (\"task\", n", "Note", "type in (\"task\", \"note\""],
        ["after `in`, which opens a list for it", "type in ", "Note", "type in (\"note\") "],
        ["for a number, unquoted", "amount gte 1", "10", "amount gte 10 "],
        ["for a key", "-ty", "Type", "-type:"],
    ])("a pick %s is written as text, and the host's parse makes the chip", async (_name, typed, label, written) =>
    {
        const onChange = vi.fn();
        const fs = make({ onChange });
        await typeIn(typed);
        await pick(label);

        expect(input().value).toBe(written);
        expect(container.querySelectorAll(".facetsearch-chip")).toHaveLength(0);
        expect(onChange).toHaveBeenLastCalledWith(written.trim());
        fs.destroy();
    });
});

// ============================================================================
// THE QUERY LANGUAGE: SYNTAX COLORS (#205)
// ============================================================================

describe("syntax: \"query\", the syntax colors (#205)", () =>
{
    const FACETS: FacetDefinition[] = [{ key: "type", label: "Type", valueType: "enum", multiple: true }];

    const make = (overrides?: Partial<FacetSearchOptions>): ReturnType<typeof createFacetSearch> =>
        createFacetSearch("test-facetsearch", { facets: FACETS, syntax: "query", ...overrides });
    const input = (): HTMLInputElement => container.querySelector("input")!;
    /** Each colored piece of the layer: its color and its text. */
    const colored = (): string[] => Array.from(container.querySelectorAll(".facetsearch-marks span"))
        .map((el) => Array.from(el.classList).find((c) => c.startsWith("facetsearch-tok-"))?.slice(16) + ":"
            + el.textContent)
        .filter((c) => !c.startsWith("undefined:"));

    test("needsQueryLanguage_ForItsColors_AndSaysSo", () =>
    {
        const color = window.colorQuery;
        delete window.colorQuery;
        try
        {
            expect(() => make()).toThrow(/querylanguage\.js/);
            expect(() => make()).toThrow(/\/lib\/antlr4-4\.13\.1\.js/);
            expect(() => createFacetSearch("test-facetsearch", { facets: FACETS }).destroy()).not.toThrow();
        }
        finally
        {
            window.colorQuery = color;
        }
    });

    test("theLayer_DrawsTheTypedText_InTheColorsTheGrammarGives", () =>
    {
        const fs = make({ value: "type in (note) meeting in march" });

        expect(colored()).toEqual(["key:type", "operator:in", "value:note"]);
        expect(container.querySelector(".facetsearch-marks")!.textContent).toBe("type in (note) meeting in march");
        fs.destroy();
    });

    test.each([
        ["typing", (fs: FacetSearch) =>
        {
            input().value = "not type:x";
            input().dispatchEvent(new Event("input", { bubbles: true }));
            return fs;
        }],
        ["setValue", (fs: FacetSearch) => { fs.setValue("not type:x"); return fs; }],
    ])("%s redraws the colors", (_name, change) =>
    {
        const fs = make() as FacetSearch;

        change(fs);

        expect(colored()).toEqual(["keyword:not", "key:type", "operator::", "value:x"]);
        fs.destroy();
    });

    test("clear_EmptiesTheLayer_AndSetParsed_ColorsTheTextLeftInTheInput", () =>
    {
        const text = "type:note a or b";
        const fs = make({ value: text });

        fs.setParsed({ text, tree: { root: { kind: "and", children: [
            { kind: "filter", key: "type", op: "Equals", value: { text: "note" }, span: { start: 0, end: 9 } },
            { kind: "or", children: [], span: { start: 10, end: 16 } },
        ] } } });
        expect(input().value).toBe("(a or b)");
        expect(colored()).toEqual(["keyword:or"]);

        fs.clear();
        expect(container.querySelector(".facetsearch-marks")!.textContent).toBe("");
        fs.destroy();
    });

    test("aMarkOnColoredText_KeepsTheColor", () =>
    {
        const text = "type:x";
        const fs = make({ value: text });

        fs.setParsed({ text, errors: [{ code: "QL_A", title: "A", detail: "A.", start: 0, end: 4 }] });

        const key = container.querySelector(".facetsearch-marks .facetsearch-tok-key")!;
        expect(key.classList.contains("facetsearch-mark-error")).toBe(true);
        expect(key.textContent).toBe("type");
        fs.destroy();
    });
});
