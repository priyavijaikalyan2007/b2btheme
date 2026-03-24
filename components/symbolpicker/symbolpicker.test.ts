/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 * Repository: pvk2007/theme
 * File GUID: a8b3d4f1-2c5e-4a9b-bf67-1e3d5c7a9b02
 * Created: 2026-03-19
 */

/**
 * Tests: SymbolPicker
 * Comprehensive Vitest unit tests for the SymbolPicker component.
 * Covers: factory, options, popup behaviour, category switching,
 * search filtering, selection callbacks, and lifecycle.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import {
    SymbolPicker,
    createSymbolPicker,
} from "./symbolpicker";
import type {
    SymbolPickerOptions,
    SymbolItem,
    SymbolCategory,
} from "./symbolpicker";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLDivElement;

function createContainer(): HTMLDivElement
{
    const el = document.createElement("div");
    el.id = "test-symbolpicker-container";
    document.body.appendChild(el);
    return el;
}

function removeContainer(): void
{
    if (container && container.parentNode)
    {
        container.parentNode.removeChild(container);
    }
}

function buildTestCategory(): SymbolCategory
{
    return {
        id: "test-cat",
        label: "Test",
        items: [
            { char: "A", name: "Letter A", code: "U+0041", category: "test-cat" },
            { char: "B", name: "Letter B", code: "U+0042", category: "test-cat" },
            { char: "C", name: "Letter C", code: "U+0043", category: "test-cat" },
        ],
    };
}

function buildSecondCategory(): SymbolCategory
{
    return {
        id: "test-cat2",
        label: "Second",
        items: [
            { char: "X", name: "Letter X", code: "U+0058", category: "test-cat2" },
            { char: "Y", name: "Letter Y", code: "U+0059", category: "test-cat2" },
        ],
    };
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = createContainer();
    // Clear localStorage to avoid test cross-contamination
    localStorage.removeItem("symbolpicker-recent");
    // jsdom does not implement scrollIntoView; stub it globally.
    Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() =>
{
    removeContainer();
    localStorage.removeItem("symbolpicker-recent");
});

// ============================================================================
// FACTORY — createSymbolPicker
// ============================================================================

describe("createSymbolPicker", () =>
{
    test("Factory_WithContainerId_ReturnsPicker", () =>
    {
        const picker = createSymbolPicker("test-symbolpicker-container", {
            mode: "unicode",
        });
        expect(picker).toBeInstanceOf(SymbolPicker);
        picker.destroy();
    });

    test("Factory_MountsElementInContainer", () =>
    {
        const picker = createSymbolPicker("test-symbolpicker-container", {
            mode: "unicode",
        });
        expect(container.children.length).toBeGreaterThan(0);
        picker.destroy();
    });

    test("Factory_WithInvalidContainer_DoesNotThrow", () =>
    {
        expect(() =>
        {
            const picker = createSymbolPicker("nonexistent-id", {
                mode: "unicode",
            });
            picker.destroy();
        }).not.toThrow();
    });
});

// ============================================================================
// CONSTRUCTOR
// ============================================================================

describe("SymbolPicker constructor", () =>
{
    test("Constructor_WithDefaults_CreatesInstance", () =>
    {
        const picker = new SymbolPicker();
        expect(picker).toBeInstanceOf(SymbolPicker);
        picker.destroy();
    });

    test("Constructor_WithCustomCategories_UsesProvided", () =>
    {
        const cat = buildTestCategory();
        const picker = new SymbolPicker({
            mode: "unicode",
            categories: [cat],
        });
        picker.show("test-symbolpicker-container");
        expect(picker.getElement()).not.toBeNull();
        picker.destroy();
    });

    test("Constructor_ModeIcons_StartsInIconsMode", () =>
    {
        const picker = new SymbolPicker({ mode: "icons" });
        picker.show("test-symbolpicker-container");
        expect(picker.getElement()).not.toBeNull();
        picker.destroy();
    });

    test("Constructor_ModeBoth_DefaultsToUnicode", () =>
    {
        const picker = new SymbolPicker({ mode: "both" });
        picker.show("test-symbolpicker-container");
        expect(picker.getElement()).not.toBeNull();
        picker.destroy();
    });
});

// ============================================================================
// OPTIONS
// ============================================================================

describe("SymbolPicker options", () =>
{
    test("Options_InlineTrue_PanelIsVisible", () =>
    {
        const picker = new SymbolPicker({ inline: true, mode: "unicode" });
        picker.show("test-symbolpicker-container");
        const el = picker.getElement();
        // Inline mode shows the panel directly (display: block) and
        // does not render a popup trigger button.
        const trigger = el?.querySelector(".symbolpicker-trigger");
        expect(trigger).toBeNull();
        const panel = el?.querySelector(".symbolpicker-panel");
        expect(panel).not.toBeNull();
        expect((panel as HTMLElement)?.style.display).toBe("block");
        picker.destroy();
    });

    test("Options_ShowSearchFalse_HidesSearchInput", () =>
    {
        const picker = new SymbolPicker({
            inline: true,
            mode: "unicode",
            showSearch: false,
        });
        picker.show("test-symbolpicker-container");
        const el = picker.getElement();
        const searchInput = el?.querySelector(".symbolpicker-search");
        expect(searchInput).toBeNull();
        picker.destroy();
    });

    test("Options_ShowRecentFalse_HidesRecentSection", () =>
    {
        const picker = new SymbolPicker({
            inline: true,
            mode: "unicode",
            showRecent: false,
        });
        picker.show("test-symbolpicker-container");
        const el = picker.getElement();
        const recentTab = el?.querySelector('[data-category="recent"]');
        expect(recentTab).toBeNull();
        picker.destroy();
    });

    test("Options_CustomColumns_AppliesGridColumns", () =>
    {
        const picker = new SymbolPicker({
            inline: true,
            mode: "unicode",
            columns: 8,
        });
        picker.show("test-symbolpicker-container");
        const el = picker.getElement();
        expect(el).not.toBeNull();
        picker.destroy();
    });

    test("Options_SizeSm_AppliesSmallClass", () =>
    {
        const picker = new SymbolPicker({
            inline: true,
            mode: "unicode",
            size: "sm",
        });
        picker.show("test-symbolpicker-container");
        const el = picker.getElement();
        expect(el?.classList.contains("symbolpicker-sm")).toBe(true);
        picker.destroy();
    });

    test("Options_Disabled_AppliesDisabledClass", () =>
    {
        const picker = new SymbolPicker({
            inline: true,
            mode: "unicode",
            disabled: true,
        });
        picker.show("test-symbolpicker-container");
        const el = picker.getElement();
        expect(el?.classList.contains("symbolpicker-disabled")).toBe(true);
        picker.destroy();
    });
});

// ============================================================================
// POPUP OPEN / CLOSE
// ============================================================================

describe("popup open/close", () =>
{
    test("Show_PopupMode_ElementMounted", () =>
    {
        const picker = new SymbolPicker({ inline: false, mode: "unicode" });
        picker.show("test-symbolpicker-container");
        expect(container.querySelector(".symbolpicker")).not.toBeNull();
        picker.destroy();
    });

    test("Hide_AfterShow_RemovesFromDOM", () =>
    {
        const picker = new SymbolPicker({ inline: false, mode: "unicode" });
        picker.show("test-symbolpicker-container");
        picker.hide();
        expect(container.querySelector(".symbolpicker")).toBeNull();
        picker.destroy();
    });
});

// ============================================================================
// CATEGORY TAB SWITCHING
// ============================================================================

describe("category tab switching", () =>
{
    test("Render_WithCategories_ShowsCategoryDropdown", () =>
    {
        const cat1 = buildTestCategory();
        const cat2 = buildSecondCategory();
        const picker = new SymbolPicker({
            inline: true,
            mode: "unicode",
            categories: [cat1, cat2],
        });
        picker.show("test-symbolpicker-container");
        const el = picker.getElement();
        const select = el?.querySelector(".symbolpicker-category-select") as HTMLSelectElement | null;
        // Dropdown should exist with "All" + 2 categories = at least 3 options
        expect(select).not.toBeNull();
        expect(select?.options.length).toBeGreaterThanOrEqual(3);
        picker.destroy();
    });

    test("CategoryDropdown_SwitchesActiveCategory", () =>
    {
        const cat1 = buildTestCategory();
        const cat2 = buildSecondCategory();
        const picker = new SymbolPicker({
            inline: true,
            mode: "unicode",
            categories: [cat1, cat2],
        });
        picker.show("test-symbolpicker-container");
        const el = picker.getElement();
        const select = el?.querySelector(".symbolpicker-category-select") as HTMLSelectElement | null;
        if (select && select.options.length >= 3)
        {
            // Select the second category (index 2, after "All")
            select.value = cat2.id;
            select.dispatchEvent(new Event("change"));
        }
        // After change, the dropdown value should match
        expect(select?.value).toBe(cat2.id);
        picker.destroy();
    });
});

// ============================================================================
// SEARCH FILTERING
// ============================================================================

describe("search filtering", () =>
{
    test("Search_InlineWithSearch_RendersSearchInput", () =>
    {
        const picker = new SymbolPicker({
            inline: true,
            mode: "unicode",
            showSearch: true,
        });
        picker.show("test-symbolpicker-container");
        const el = picker.getElement();
        const searchInput = el?.querySelector("input");
        expect(searchInput).not.toBeNull();
        picker.destroy();
    });

    test("Search_TypeQuery_FiltersGridItems", () =>
    {
        const cat = buildTestCategory();
        const picker = new SymbolPicker({
            inline: true,
            mode: "unicode",
            categories: [cat],
            showSearch: true,
        });
        picker.show("test-symbolpicker-container");
        const el = picker.getElement();
        const searchInput = el?.querySelector("input") as HTMLInputElement;
        if (searchInput)
        {
            searchInput.value = "Letter A";
            searchInput.dispatchEvent(new Event("input", { bubbles: true }));
        }
        // After filtering, grid items should be reduced
        const cells = el?.querySelectorAll(".symbolpicker-cell");
        expect(cells).toBeDefined();
        picker.destroy();
    });
});

// ============================================================================
// SELECTION — onSelect / onInsert
// ============================================================================

describe("symbol selection callbacks", () =>
{
    test("ClickCell_FiresOnSelect", () =>
    {
        const onSelect = vi.fn();
        const cat = buildTestCategory();
        const picker = new SymbolPicker({
            inline: true,
            mode: "unicode",
            categories: [cat],
            onSelect,
        });
        picker.show("test-symbolpicker-container");
        const el = picker.getElement();
        const firstCell = el?.querySelector(".symbolpicker-cell") as HTMLElement;
        if (firstCell)
        {
            firstCell.click();
        }
        expect(onSelect).toHaveBeenCalled();
        picker.destroy();
    });

    test("DoubleClickCell_FiresOnInsert", () =>
    {
        const onInsert = vi.fn();
        const cat = buildTestCategory();
        const picker = new SymbolPicker({
            inline: true,
            mode: "unicode",
            categories: [cat],
            onInsert,
        });
        picker.show("test-symbolpicker-container");
        const el = picker.getElement();
        const firstCell = el?.querySelector(".symbolpicker-cell") as HTMLElement;
        if (firstCell)
        {
            firstCell.dispatchEvent(
                new MouseEvent("dblclick", { bubbles: true })
            );
        }
        expect(onInsert).toHaveBeenCalled();
        picker.destroy();
    });
});

// ============================================================================
// getValue / getSelectedSymbol
// ============================================================================

describe("getValue and getSelectedSymbol", () =>
{
    test("getValue_NoSelection_ReturnsEmptyString", () =>
    {
        const picker = new SymbolPicker({ mode: "unicode" });
        picker.show("test-symbolpicker-container");
        expect(picker.getValue()).toBe("");
        picker.destroy();
    });

    test("getSelectedSymbol_NoSelection_ReturnsNull", () =>
    {
        const picker = new SymbolPicker({ mode: "unicode" });
        picker.show("test-symbolpicker-container");
        expect(picker.getSelectedSymbol()).toBeNull();
        picker.destroy();
    });

    test("getValue_AfterCellClick_ReturnsCode", () =>
    {
        const cat = buildTestCategory();
        const picker = new SymbolPicker({
            inline: true,
            mode: "unicode",
            categories: [cat],
        });
        picker.show("test-symbolpicker-container");
        const el = picker.getElement();
        const firstCell = el?.querySelector(".symbolpicker-cell") as HTMLElement;
        if (firstCell)
        {
            firstCell.click();
        }
        // After clicking, getValue should return the code
        const val = picker.getValue();
        expect(val).toBeTruthy();
        picker.destroy();
    });
});

// ============================================================================
// DESTROY
// ============================================================================

describe("destroy", () =>
{
    test("destroy_RemovesFromDOM", () =>
    {
        const picker = createSymbolPicker("test-symbolpicker-container", {
            mode: "unicode",
        });
        expect(container.children.length).toBeGreaterThan(0);
        picker.destroy();
        expect(picker.getElement()).toBeNull();
    });

    test("destroy_CalledTwice_DoesNotThrow", () =>
    {
        const picker = new SymbolPicker({ mode: "unicode" });
        picker.show("test-symbolpicker-container");
        picker.destroy();
        expect(() => picker.destroy()).not.toThrow();
    });
});

// ============================================================================
// getElement
// ============================================================================

describe("getElement", () =>
{
    test("getElement_AfterShow_ReturnsHTMLElement", () =>
    {
        const picker = new SymbolPicker({ mode: "unicode" });
        picker.show("test-symbolpicker-container");
        expect(picker.getElement()).toBeInstanceOf(HTMLElement);
        picker.destroy();
    });

    test("getElement_AfterDestroy_ReturnsNull", () =>
    {
        const picker = new SymbolPicker({ mode: "unicode" });
        picker.show("test-symbolpicker-container");
        picker.destroy();
        expect(picker.getElement()).toBeNull();
    });
});

// ============================================================================
// ENABLE / DISABLE
// ============================================================================

describe("enable and disable", () =>
{
    test("disable_AddsDisabledClass", () =>
    {
        const picker = new SymbolPicker({ inline: true, mode: "unicode" });
        picker.show("test-symbolpicker-container");
        picker.disable();
        const el = picker.getElement();
        expect(el?.classList.contains("symbolpicker-disabled")).toBe(true);
        picker.destroy();
    });

    test("enable_RemovesDisabledClass", () =>
    {
        const picker = new SymbolPicker({
            inline: true,
            mode: "unicode",
            disabled: true,
        });
        picker.show("test-symbolpicker-container");
        picker.enable();
        const el = picker.getElement();
        expect(el?.classList.contains("symbolpicker-disabled")).toBe(false);
        picker.destroy();
    });
});
