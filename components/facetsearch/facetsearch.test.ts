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
