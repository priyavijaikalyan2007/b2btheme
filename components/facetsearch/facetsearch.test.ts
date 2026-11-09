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
} from "./facetsearch";

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
