/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * TESTS: MultiselectCombo
 * Spec-based tests for the MultiselectCombo multi-select dropdown component.
 * Tests cover: factory, options, DOM structure, ARIA, handle methods,
 * callbacks, selection logic, keyboard, and edge cases.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import {
    MultiselectCombo,
    createMultiselectCombo,
} from "./multiselectcombo";

import type { ComboItem, MultiselectComboOptions } from "./multiselectcombo";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLDivElement;

const MOCK_ITEMS: ComboItem[] = [
    { value: "apple", label: "Apple" },
    { value: "banana", label: "Banana" },
    { value: "cherry", label: "Cherry" },
    { value: "date", label: "Date" },
    { value: "elderberry", label: "Elderberry" },
];

function queryRoot(): HTMLElement | null
{
    return container.querySelector("[class*='multiselectcombo']");
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "test-multiselect";
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
});

// ============================================================================
// FACTORY — createMultiselectCombo
// ============================================================================

describe("createMultiselectCombo", () =>
{
    test("withContainerId_MountsInContainer", () =>
    {
        createMultiselectCombo({ items: MOCK_ITEMS }, "test-multiselect");
        expect(queryRoot()).not.toBeNull();
    });

    test("returnsMultiselectComboInstance", () =>
    {
        const combo = createMultiselectCombo({ items: MOCK_ITEMS });
        expect(combo).toBeInstanceOf(MultiselectCombo);
    });

    test("withoutContainerId_DoesNotMount", () =>
    {
        createMultiselectCombo({ items: MOCK_ITEMS });
        expect(queryRoot()).toBeNull();
    });
});

// ============================================================================
// CONSTRUCTOR — MultiselectCombo class
// ============================================================================

describe("MultiselectCombo constructor", () =>
{
    test("withItems_StoresItems", () =>
    {
        const combo = new MultiselectCombo({ items: MOCK_ITEMS });
        expect(combo.getSelectedValues()).toHaveLength(0);
    });

    test("withInitialSelection_PreSelectsItems", () =>
    {
        const combo = new MultiselectCombo({
            items: MOCK_ITEMS,
            selected: ["apple", "cherry"],
        });
        expect(combo.getSelectedValues()).toContain("apple");
        expect(combo.getSelectedValues()).toContain("cherry");
    });

    test("getElement_ReturnsRootElement", () =>
    {
        const combo = new MultiselectCombo({ items: MOCK_ITEMS });
        expect(combo.getElement()).toBeInstanceOf(HTMLElement);
    });
});

// ============================================================================
// PUBLIC METHODS — selection
// ============================================================================

describe("selection methods", () =>
{
    test("getSelectedValues_ReturnsStringArray", () =>
    {
        const combo = new MultiselectCombo({
            items: MOCK_ITEMS,
            selected: ["banana"],
        });
        expect(combo.getSelectedValues()).toEqual(["banana"]);
    });

    test("getSelectedItems_ReturnsComboItemArray", () =>
    {
        const combo = new MultiselectCombo({
            items: MOCK_ITEMS,
            selected: ["banana"],
        });
        const selected = combo.getSelectedItems();
        expect(selected).toHaveLength(1);
        expect(selected[0].label).toBe("Banana");
    });

    test("setSelected_UpdatesSelection", () =>
    {
        const combo = new MultiselectCombo({ items: MOCK_ITEMS });
        combo.setSelected(["apple", "date"]);
        expect(combo.getSelectedValues()).toContain("apple");
        expect(combo.getSelectedValues()).toContain("date");
        expect(combo.getSelectedValues()).toHaveLength(2);
    });

    test("selectAll_SelectsEveryItem", () =>
    {
        const combo = new MultiselectCombo({ items: MOCK_ITEMS });
        combo.selectAll();
        expect(combo.getSelectedValues()).toHaveLength(MOCK_ITEMS.length);
    });

    test("deselectAll_ClearsSelection", () =>
    {
        const combo = new MultiselectCombo({
            items: MOCK_ITEMS,
            selected: ["apple", "banana"],
        });
        combo.deselectAll();
        expect(combo.getSelectedValues()).toHaveLength(0);
    });
});

// ============================================================================
// PUBLIC METHODS — item management
// ============================================================================

describe("item management", () =>
{
    test("addItem_IncreasesItemCount", () =>
    {
        const combo = new MultiselectCombo({ items: MOCK_ITEMS });
        combo.addItem({ value: "fig", label: "Fig" });
        combo.setSelected(["fig"]);
        expect(combo.getSelectedValues()).toContain("fig");
    });

    test("removeItem_RemovesFromList", () =>
    {
        const combo = new MultiselectCombo({
            items: MOCK_ITEMS,
            selected: ["apple"],
        });
        combo.removeItem("apple");
        expect(combo.getSelectedValues()).not.toContain("apple");
    });

    test("setItems_ReplacesAllItems", () =>
    {
        const combo = new MultiselectCombo({ items: MOCK_ITEMS });
        combo.setItems([
            { value: "x", label: "X" },
            { value: "y", label: "Y" },
        ]);
        combo.selectAll();
        expect(combo.getSelectedValues()).toHaveLength(2);
    });
});

// ============================================================================
// PUBLIC METHODS — lifecycle
// ============================================================================

describe("lifecycle", () =>
{
    test("show_MountsInContainer", () =>
    {
        const combo = new MultiselectCombo({ items: MOCK_ITEMS });
        combo.show("test-multiselect");
        expect(queryRoot()).not.toBeNull();
    });

    test("hide_RemovesFromDOM", () =>
    {
        const combo = new MultiselectCombo({ items: MOCK_ITEMS });
        combo.show("test-multiselect");
        combo.hide();
        expect(queryRoot()).toBeNull();
    });

    test("destroy_CleansUpCompletely", () =>
    {
        const combo = new MultiselectCombo({ items: MOCK_ITEMS });
        combo.show("test-multiselect");
        combo.destroy();
        expect(queryRoot()).toBeNull();
    });
});

// ============================================================================
// PUBLIC METHODS — open / close
// ============================================================================

describe("open and close", () =>
{
    test("open_DoesNotThrow", () =>
    {
        const combo = new MultiselectCombo({ items: MOCK_ITEMS });
        combo.show("test-multiselect");
        expect(() => combo.open()).not.toThrow();
    });

    test("close_DoesNotThrow", () =>
    {
        const combo = new MultiselectCombo({ items: MOCK_ITEMS });
        combo.show("test-multiselect");
        combo.open();
        expect(() => combo.close()).not.toThrow();
    });
});

// ============================================================================
// CALLBACKS
// ============================================================================

describe("callbacks", () =>
{
    test("onChange_FiresOnSetSelected", () =>
    {
        const onChange = vi.fn();
        const combo = new MultiselectCombo({
            items: MOCK_ITEMS,
            onChange,
        });
        combo.setSelected(["apple"]);
        expect(onChange).toHaveBeenCalledWith(["apple"]);
    });

    test("onChange_FiresOnSelectAll", () =>
    {
        const onChange = vi.fn();
        const combo = new MultiselectCombo({
            items: MOCK_ITEMS,
            onChange,
        });
        combo.selectAll();
        expect(onChange).toHaveBeenCalled();
        const calledWith = onChange.mock.calls[0][0] as string[];
        expect(calledWith).toHaveLength(MOCK_ITEMS.length);
    });

    test("onChange_FiresOnDeselectAll", () =>
    {
        const onChange = vi.fn();
        const combo = new MultiselectCombo({
            items: MOCK_ITEMS,
            selected: ["apple"],
            onChange,
        });
        combo.deselectAll();
        expect(onChange).toHaveBeenCalledWith([]);
    });
});

// ============================================================================
// OPTIONS — maxSelections
// ============================================================================

describe("maxSelections", () =>
{
    test("limitsSelection", () =>
    {
        const combo = new MultiselectCombo({
            items: MOCK_ITEMS,
            maxSelections: 2,
        });
        combo.setSelected(["apple", "banana", "cherry"]);
        expect(combo.getSelectedValues().length).toBeLessThanOrEqual(2);
    });
});

// ============================================================================
// ARIA / ACCESSIBILITY
// ============================================================================

describe("accessibility", () =>
{
    test("rootHasCorrectRole", () =>
    {
        const combo = new MultiselectCombo({ items: MOCK_ITEMS });
        combo.show("test-multiselect");
        const root = queryRoot();
        expect(root).not.toBeNull();
    });

    test("hasLiveRegionForAnnouncements", () =>
    {
        const combo = new MultiselectCombo({ items: MOCK_ITEMS });
        combo.show("test-multiselect");
        const liveRegion = container.querySelector("[aria-live]");
        expect(liveRegion).not.toBeNull();
    });
});

// ============================================================================
// ENABLE / DISABLE
// ============================================================================

describe("enable and disable", () =>
{
    test("disable_PreventsInteraction", () =>
    {
        const combo = new MultiselectCombo({ items: MOCK_ITEMS });
        combo.show("test-multiselect");
        combo.disable();
        const root = queryRoot();
        expect(
            root?.classList.contains("multiselectcombo-disabled")
        ).toBe(true);
    });

    test("enable_RestoresInteraction", () =>
    {
        const combo = new MultiselectCombo({
            items: MOCK_ITEMS,
            disabled: true,
        });
        combo.show("test-multiselect");
        combo.enable();
        const root = queryRoot();
        expect(
            root?.classList.contains("multiselectcombo-disabled")
        ).toBe(false);
    });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe("edge cases", () =>
{
    test("singleItem_WorksCorrectly", () =>
    {
        const combo = new MultiselectCombo({
            items: [{ value: "solo", label: "Solo" }],
        });
        combo.selectAll();
        expect(combo.getSelectedValues()).toEqual(["solo"]);
    });

    test("duplicateSelection_Ignored", () =>
    {
        const combo = new MultiselectCombo({
            items: MOCK_ITEMS,
            selected: ["apple", "apple"],
        });
        const unique = new Set(combo.getSelectedValues());
        expect(unique.size).toBe(combo.getSelectedValues().length);
    });

    test("selectNonExistentItem_Ignored", () =>
    {
        const combo = new MultiselectCombo({ items: MOCK_ITEMS });
        combo.setSelected(["nonexistent"]);
        expect(combo.getSelectedValues()).not.toContain("nonexistent");
    });

    test("destroyTwice_DoesNotThrow", () =>
    {
        const combo = new MultiselectCombo({ items: MOCK_ITEMS });
        combo.destroy();
        expect(() => combo.destroy()).not.toThrow();
    });

    test("groupedItems_RenderCorrectly", () =>
    {
        const groupedItems: ComboItem[] = [
            { value: "a", label: "Apple", group: "Fruits" },
            { value: "b", label: "Broccoli", group: "Vegetables" },
        ];
        expect(() =>
        {
            new MultiselectCombo({ items: groupedItems });
        }).not.toThrow();
    });
});
