/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * TESTS: SearchBox
 * Spec-based tests for the SearchBox debounced search input component.
 * Tests cover: factory, options, DOM structure, ARIA, handle methods,
 * callbacks, keyboard navigation, suggestions, and edge cases.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { SearchBox, createSearchBox } from "./searchbox";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLDivElement;

function queryRoot(): HTMLElement | null
{
    return container.querySelector(".searchbox");
}

function queryInput(): HTMLInputElement | null
{
    return container.querySelector(".searchbox-input") as HTMLInputElement | null;
}

function queryClearBtn(): HTMLElement | null
{
    return container.querySelector(".searchbox-clear") as HTMLElement | null;
}

function querySuggestions(): HTMLElement | null
{
    return container.querySelector(".searchbox-suggestions") as HTMLElement | null;
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    vi.useFakeTimers();
    container = document.createElement("div");
    container.id = "test-searchbox";
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
    vi.useRealTimers();
});

// ============================================================================
// FACTORY — createSearchBox
// ============================================================================

describe("createSearchBox", () =>
{
    test("withContainerId_MountsInContainer", () =>
    {
        createSearchBox("test-searchbox", {});
        expect(queryRoot()).not.toBeNull();
    });

    test("returnsSearchBoxInstance", () =>
    {
        const sb = createSearchBox("test-searchbox", {});
        expect(sb).toBeInstanceOf(SearchBox);
    });

    test("withPlaceholder_SetsPlaceholderOnInput", () =>
    {
        createSearchBox("test-searchbox", { placeholder: "Find items..." });
        const input = queryInput();
        expect(input?.placeholder).toBe("Find items...");
    });
});

// ============================================================================
// CONSTRUCTOR — SearchBox class
// ============================================================================

describe("SearchBox constructor", () =>
{
    test("defaultPlaceholder_IsSearch", () =>
    {
        const sb = new SearchBox({});
        sb.show("test-searchbox");
        const input = queryInput();
        expect(input?.placeholder).toBe("Search...");
    });

    test("getElement_ReturnsRootElement", () =>
    {
        const sb = new SearchBox({});
        expect(sb.getElement()).toBeInstanceOf(HTMLElement);
    });

    test("getValue_InitiallyEmpty", () =>
    {
        const sb = new SearchBox({});
        expect(sb.getValue()).toBe("");
    });
});

// ============================================================================
// OPTIONS — placeholder / size / disabled
// ============================================================================

describe("options", () =>
{
    test("customPlaceholder_Applied", () =>
    {
        const sb = new SearchBox({ placeholder: "Type to search..." });
        sb.show("test-searchbox");
        expect(queryInput()?.placeholder).toBe("Type to search...");
    });

    test("disabled_DisablesInput", () =>
    {
        const sb = new SearchBox({ disabled: true });
        sb.show("test-searchbox");
        expect(queryInput()?.disabled).toBe(true);
    });

    test("sizeSm_AppliesSizeClass", () =>
    {
        const sb = new SearchBox({ size: "sm" });
        sb.show("test-searchbox");
        const root = queryRoot();
        expect(root?.classList.contains("searchbox-sm")).toBe(true);
    });

    test("sizeLg_AppliesSizeClass", () =>
    {
        const sb = new SearchBox({ size: "lg" });
        sb.show("test-searchbox");
        const root = queryRoot();
        expect(root?.classList.contains("searchbox-lg")).toBe(true);
    });
});

// ============================================================================
// PUBLIC METHODS — getValue / setValue
// ============================================================================

describe("getValue and setValue", () =>
{
    test("setValue_UpdatesInputValue", () =>
    {
        const sb = new SearchBox({});
        sb.show("test-searchbox");
        sb.setValue("test query");
        expect(sb.getValue()).toBe("test query");
    });

    test("clearValue_ClearsInput", () =>
    {
        const sb = new SearchBox({});
        sb.show("test-searchbox");
        sb.setValue("something");
        sb.clearValue();
        expect(sb.getValue()).toBe("");
    });
});

// ============================================================================
// PUBLIC METHODS — show / hide / destroy
// ============================================================================

describe("lifecycle", () =>
{
    test("show_AppendsToContainer", () =>
    {
        const sb = new SearchBox({});
        sb.show("test-searchbox");
        expect(queryRoot()).not.toBeNull();
    });

    test("hide_RemovesFromDOM", () =>
    {
        const sb = new SearchBox({});
        sb.show("test-searchbox");
        sb.hide();
        expect(queryRoot()).toBeNull();
    });

    test("destroy_NullsReferences", () =>
    {
        const sb = new SearchBox({});
        sb.show("test-searchbox");
        sb.destroy();
        expect(sb.getElement()).toBeNull();
    });
});

// ============================================================================
// CALLBACKS — onSearch / onSubmit
// ============================================================================

describe("callbacks", () =>
{
    test("onSearch_FiresAfterDebounce", () =>
    {
        const onSearch = vi.fn();
        const sb = new SearchBox({ onSearch, debounceMs: 100 });
        sb.show("test-searchbox");
        sb.setValue("query");
        vi.advanceTimersByTime(200);
        expect(onSearch).toHaveBeenCalledWith("query");
    });

    test("onSearch_NotCalledBeforeDebounce", () =>
    {
        const onSearch = vi.fn();
        const sb = new SearchBox({ onSearch, debounceMs: 300 });
        sb.show("test-searchbox");
        sb.setValue("query");
        vi.advanceTimersByTime(100);
        expect(onSearch).not.toHaveBeenCalled();
    });
});

// ============================================================================
// SUGGESTIONS
// ============================================================================

describe("suggestions", () =>
{
    test("withStaticSuggestions_HasDropdownElement", () =>
    {
        const sb = new SearchBox({
            suggestions: ["Apple", "Banana", "Cherry"],
        });
        sb.show("test-searchbox");
        expect(sb.getElement()).not.toBeNull();
    });
});

// ============================================================================
// ARIA / ACCESSIBILITY
// ============================================================================

describe("accessibility", () =>
{
    test("inputHasSearchboxRole", () =>
    {
        const sb = new SearchBox({});
        sb.show("test-searchbox");
        const input = queryInput();
        expect(input?.getAttribute("role")).toBe("searchbox");
    });

    test("rootHasSearchRole", () =>
    {
        const sb = new SearchBox({});
        sb.show("test-searchbox");
        const root = queryRoot();
        expect(root?.getAttribute("role")).toBe("search");
    });
});

// ============================================================================
// FOCUS
// ============================================================================

describe("focus", () =>
{
    test("focus_SetsInputFocus", () =>
    {
        const sb = new SearchBox({});
        sb.show("test-searchbox");
        sb.focus();
        expect(document.activeElement).toBe(queryInput());
    });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe("edge cases", () =>
{
    test("cssClass_AddedToRoot", () =>
    {
        const sb = new SearchBox({ cssClass: "my-search" });
        sb.show("test-searchbox");
        const root = queryRoot();
        expect(root?.classList.contains("my-search")).toBe(true);
    });

    test("setDisabled_True_DisablesInput", () =>
    {
        const sb = new SearchBox({});
        sb.show("test-searchbox");
        sb.setDisabled(true);
        expect(queryInput()?.disabled).toBe(true);
    });

    test("setDisabled_False_EnablesInput", () =>
    {
        const sb = new SearchBox({ disabled: true });
        sb.show("test-searchbox");
        sb.setDisabled(false);
        expect(queryInput()?.disabled).toBe(false);
    });

    test("showInMissingContainer_Throws", () =>
    {
        // ERR-1. This case asserted the defect: a container that is
        // not there used to be logged and walked past. AGENTS.md
        // calls that returning a null object.
        const sb = new SearchBox({});
        expect(() => sb.show("nonexistent-id")).toThrow(/was not found/);
    });
});

// ============================================================================
// SURFACE CONTRACT (readiness step 2 B3): additive on("search") and
// on("submit"), getState/setState and setData. The options callbacks keep
// firing first, exactly once; subscribers fire even when no callback is given.
// ============================================================================

describe("surface contract", () =>
{
    test("on(search)_FiresAfterTheDebounce_AfterOnSearch", () =>
    {
        vi.useFakeTimers();
        const order: string[] = [];
        const sb = new SearchBox({ onSearch: (q) => order.push(`option:${q}`), debounceMs: 100 });
        sb.show("test-searchbox");
        sb.on("search", (q) => order.push(`channel:${String(q)}`));
        const input = queryInput()!;

        input.value = "query";
        input.dispatchEvent(new Event("input"));
        vi.advanceTimersByTime(100);

        expect(order).toEqual(["option:query", "channel:query"]);
        sb.destroy();
        vi.useRealTimers();
    });

    test("on(submit)_FiresOnEnter_EvenWithoutAnOnSubmitOption", () =>
    {
        const heard = vi.fn();
        const sb = new SearchBox({});
        sb.show("test-searchbox");
        const off = sb.on("submit", heard);
        const input = queryInput()!;

        input.value = "go";
        input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
        off();
        input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

        expect(heard.mock.calls).toEqual([["go"]]);
        sb.destroy();
    });

    test("getState_SetState_RoundTripTheQuery", () =>
    {
        const sb = new SearchBox({});
        sb.show("test-searchbox");
        sb.setValue("first");
        const captured = sb.getState();

        sb.setValue("second");
        expect(sb.getState()).toEqual({ value: "second" });

        sb.setState(captured);
        expect(sb.getState()).toEqual({ value: "first" });
        sb.destroy();
    });

    test("on_UnknownChannel_AndSetData_Throw", () =>
    {
        const sb = new SearchBox({});

        expect(() => sb.on("change", () => undefined)).toThrow("search");
        expect(() => sb.setData("suggestions", [])).toThrow("no data slots");
        sb.destroy();
    });
});
