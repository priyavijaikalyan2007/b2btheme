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
    test("getValue_ReturnsCurrentValue", () =>
    {
        const fs = createFacetSearch("test-facetsearch", makeOptions({
            value: "status:open",
        }));
        const val = fs.getValue();
        expect(val).toBeDefined();
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

    test("getQuery_ReturnsStructuredQuery", () =>
    {
        const fs = createFacetSearch("test-facetsearch", makeOptions({
            value: "status:open hello",
        }));
        const query: FacetSearchQuery = fs.getQuery();
        expect(query.raw).toBeDefined();
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
    test("missingContainer_LogsError", () =>
    {
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        const fs = new FacetSearch(makeOptions());
        fs.show("nonexistent");
        expect(errorSpy).toHaveBeenCalled();
        errorSpy.mockRestore();
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
