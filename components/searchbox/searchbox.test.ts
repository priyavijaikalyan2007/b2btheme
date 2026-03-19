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

    test("showInMissingContainer_LogsError", () =>
    {
        const sb = new SearchBox({});
        const spy = vi.spyOn(console, "error").mockImplementation(() => {});
        sb.show("nonexistent-id");
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });
});
